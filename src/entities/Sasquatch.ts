import Phaser from 'phaser';
import { Health } from '../combat/Health';
import { HealthBar } from '../combat/HealthBar';
import { TILE_SIZE } from '../render/tileAtlas';
import {
  SASQUATCH_MAX_HP,
  SASQUATCH_MOVE_TILES_PER_SEC,
  SASQUATCH_AGGRO_RANGE,
  SASQUATCH_ATTACK_RANGE,
  SASQUATCH_ATTACK_COOLDOWN_MS,
  SASQUATCH_WINDUP_MS,
  SASQUATCH_LEASH_RANGE,
  SASQUATCH_XP_REWARD,
} from '../game/settings';

const TEXTURE_KEY = 'sasquatch';
type State = 'idle' | 'chase' | 'attack' | 'leash' | 'dead';

/**
 * The first fightable enemy. A simple state machine — IDLE → CHASE → ATTACK
 * (with a dodgeable wind-up telegraph) → cooldown, plus LEASH back to its home
 * when the player flees. Respects terrain collision (caller adds the collider).
 * A floating world-space health bar appears once it is aggroed or hurt.
 */
export class Sasquatch {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  readonly health: Health;
  /** XP granted to the player on defeat (data — each enemy carries its own). */
  readonly xpReward = SASQUATCH_XP_REWARD;
  /** Called the moment a strike lands while the player is in range. */
  onStrike?: () => void;

  private readonly bar: HealthBar;
  private readonly speed = SASQUATCH_MOVE_TILES_PER_SEC * TILE_SIZE;
  private readonly homeX: number;
  private readonly homeY: number;

  private state: State = 'idle';
  private windUpUntil = 0;
  private cooldownUntil = 0;
  private barShown = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.homeX = x;
    this.homeY = y;
    Sasquatch.ensureTexture(scene);

    this.sprite = scene.physics.add.sprite(x, y, TEXTURE_KEY).setDepth(9);
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setSize(40, 36);
    body.setOffset((this.sprite.width - 40) / 2, this.sprite.height - 40);
    this.sprite.setCollideWorldBounds(true);

    this.health = new Health(SASQUATCH_MAX_HP);
    this.bar = new HealthBar(scene, 56, 7, 9);
    this.bar.setVisible(false);
  }

  get x(): number {
    return this.sprite.x;
  }
  get y(): number {
    return this.sprite.y;
  }
  get isAlive(): boolean {
    return this.state !== 'dead';
  }
  /** True while engaged with the player (used for the player's combat/regen state). */
  get isAggro(): boolean {
    return this.state === 'chase' || this.state === 'attack';
  }

  distanceTo(x: number, y: number): number {
    return Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, x, y);
  }

  /** Apply damage from a player hit; reveal the bar, flash, and die at 0 HP. */
  takeHit(amount: number): number {
    if (this.state === 'dead') return 0;
    const dealt = this.health.damage(amount);
    this.revealBar();
    this.bar.setRatio(this.health.ratio);
    this.sprite.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.sprite.scene.time.delayedCall(80, () => {
      if (this.state !== 'dead') this.sprite.clearTint();
    });
    if (this.health.isDead) this.die();
    return dealt;
  }

  update(playerX: number, playerY: number, time: number): void {
    if (this.state === 'dead') return;
    const dist = this.distanceTo(playerX, playerY);
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;

    switch (this.state) {
      case 'idle':
        body.setVelocity(0, 0);
        if (dist <= SASQUATCH_AGGRO_RANGE) this.state = 'chase';
        break;

      case 'chase':
        this.revealBar();
        if (dist > SASQUATCH_LEASH_RANGE) {
          this.state = 'leash';
        } else if (dist <= SASQUATCH_ATTACK_RANGE && time >= this.cooldownUntil) {
          this.enterAttack(time);
        } else {
          this.moveToward(playerX, playerY);
        }
        break;

      case 'attack':
        body.setVelocity(0, 0);
        if (time < this.windUpUntil) {
          // Telegraph: grow + flush red so the player can react and dodge.
          const p = 1 - (this.windUpUntil - time) / SASQUATCH_WINDUP_MS;
          this.sprite.setScale(1 + 0.22 * p);
          this.sprite.setTint(0xff5555).setTintMode(Phaser.TintModes.FILL);
        } else {
          this.strike(playerX, playerY, time);
        }
        break;

      case 'leash':
        this.bar.setVisible(false);
        this.barShown = false;
        if (this.distanceTo(this.homeX, this.homeY) < TILE_SIZE) {
          this.sprite.body!.velocity.set(0, 0);
          this.state = 'idle';
        } else if (dist <= SASQUATCH_AGGRO_RANGE * 0.8) {
          this.state = 'chase';
        } else {
          this.moveToward(this.homeX, this.homeY);
        }
        break;
    }

    // Float the bar above the head.
    this.bar.setPosition(this.sprite.x - 28, this.sprite.y - this.sprite.height / 2 - 8);
  }

  /** Stop moving (used while the player is frozen in dialogue/death). */
  halt(): void {
    if (this.state === 'dead') return;
    (this.sprite.body as Phaser.Physics.Arcade.Body).velocity.set(0, 0);
  }

  reset(): void {
    this.health.full();
    this.state = 'idle';
    this.cooldownUntil = 0;
    this.windUpUntil = 0;
    this.barShown = false;
    this.sprite.clearTint();
    this.sprite.setScale(1);
    this.sprite.setAlpha(1);
    this.sprite.setActive(true).setVisible(true);
    (this.sprite.body as Phaser.Physics.Arcade.Body).enable = true;
    this.sprite.setPosition(this.homeX, this.homeY);
    (this.sprite.body as Phaser.Physics.Arcade.Body).velocity.set(0, 0);
    this.bar.setRatio(1);
    this.bar.setVisible(false);
  }

  // --- internals ------------------------------------------------------------

  private moveToward(tx: number, ty: number): void {
    const a = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, tx, ty);
    (this.sprite.body as Phaser.Physics.Arcade.Body).velocity.set(
      Math.cos(a) * this.speed,
      Math.sin(a) * this.speed,
    );
    this.sprite.setFlipX(tx < this.sprite.x);
  }

  private enterAttack(time: number): void {
    this.state = 'attack';
    this.windUpUntil = time + SASQUATCH_WINDUP_MS;
  }

  private strike(playerX: number, playerY: number, time: number): void {
    this.sprite.clearTint();
    this.sprite.setScale(1);
    if (this.distanceTo(playerX, playerY) <= SASQUATCH_ATTACK_RANGE + 8) {
      this.onStrike?.();
    }
    this.cooldownUntil = time + SASQUATCH_ATTACK_COOLDOWN_MS;
    this.state = 'chase';
  }

  private revealBar(): void {
    if (this.barShown) return;
    this.barShown = true;
    this.bar.setRatio(this.health.ratio);
    this.bar.setVisible(true);
  }

  private die(): void {
    this.state = 'dead';
    this.bar.setVisible(false);
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.velocity.set(0, 0);
    body.enable = false;
    this.sprite.clearTint();
    this.sprite.scene.tweens.add({
      targets: this.sprite,
      alpha: 0,
      scale: 1.3,
      duration: 450,
      ease: 'Quad.out',
      onComplete: () => this.sprite.setActive(false).setVisible(false),
    });
  }

  private static ensureTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists(TEXTURE_KEY)) return;
    const w = 60; // ~2 tiles wide
    const h = 72; // ~2.25 tiles tall
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    // Big hulking brown figure, clearly larger than the player.
    g.fillStyle(0x120d08, 1);
    g.fillRoundedRect(6, 16, w - 12, h - 18, 12); // dark outline body
    g.fillStyle(0x5a3d22, 1);
    g.fillRoundedRect(9, 19, w - 18, h - 24, 10); // brown fur body
    g.fillStyle(0x6b4a2a, 1);
    g.fillCircle(w / 2, 16, 15); // head
    g.fillStyle(0x120d08, 1);
    g.fillCircle(w / 2, 16, 16);
    g.fillStyle(0x4a3018, 1);
    g.fillCircle(w / 2, 17, 14);
    g.fillStyle(0xffd24a, 1);
    g.fillCircle(w / 2 - 6, 14, 2.6); // glowing eyes
    g.fillCircle(w / 2 + 6, 14, 2.6);
    g.fillStyle(0x3a2614, 1);
    g.fillRoundedRect(2, 30, 10, 26, 4); // arms
    g.fillRoundedRect(w - 12, 30, 10, 26, 4);
    g.generateTexture(TEXTURE_KEY, w, h);
    g.destroy();
  }
}

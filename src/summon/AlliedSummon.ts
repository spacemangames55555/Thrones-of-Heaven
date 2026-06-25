import Phaser from 'phaser';
import { Health } from '../combat/Health';
import { HealthBar } from '../combat/HealthBar';
import { TILE_SIZE } from '../render/tileAtlas';
import type { AlliedSummonConfig } from './summonData';

/**
 * A PLAYER-ALLIED SUMMON — the mirror of an enemy/boss add, allegiance flipped.
 *
 * Generic across summon types via its {@link AlliedSummonConfig}: it has a stable id,
 * its own HP pool + floating bar, a lifespan (expires after a duration OR at 0 HP), and
 * a data-driven behavior. The only behavior implemented now is 'tank' (follow the player
 * + draw aggro + soak; no attack — the Ice Golem). The 'attacker' branch is left open so
 * a future Necromancer minion is a pure data addition (give it attackDamage/cadence and
 * fill the marked branch in {@link update}).
 *
 * Drawn by the world camera; the scene routes {@link objects} past the UI camera and adds
 * the terrain collider, exactly like the enemy entities.
 */
export class AlliedSummon {
  readonly id: string;
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  readonly health: Health;
  readonly config: AlliedSummonConfig;

  private readonly bar: HealthBar;
  private readonly speed: number;
  private readonly expireAt: number;
  private dead = false;

  constructor(scene: Phaser.Scene, x: number, y: number, config: AlliedSummonConfig, id: string) {
    this.id = id;
    this.config = config;
    AlliedSummon.ensureTexture(scene, config);

    this.sprite = scene.physics.add.sprite(x, y, AlliedSummon.textureKey(config)).setDepth(9);
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setCircle(config.bodyRadius, this.sprite.width / 2 - config.bodyRadius, this.sprite.height / 2 - config.bodyRadius);
    this.sprite.setCollideWorldBounds(true);

    this.speed = config.moveTilesPerSec * TILE_SIZE;
    this.health = new Health(config.maxHP);
    this.bar = new HealthBar(scene, 56, 7, 9, 0x6fd0ff); // fixed icy-blue fill (it's an ally)
    this.bar.setRatio(1);
    this.bar.setVisible(true);
    this.expireAt = scene.time.now + config.durationMs;
    this.floatBar();
  }

  get x(): number {
    return this.sprite.x;
  }
  get y(): number {
    return this.sprite.y;
  }
  get isAlive(): boolean {
    return !this.dead;
  }
  get aggroRadius(): number {
    return this.config.aggroRadius;
  }
  get drawsAggro(): boolean {
    return this.config.drawsAggro && !this.dead;
  }
  get bodyRadius(): number {
    return this.config.bodyRadius;
  }

  distanceTo(x: number, y: number): number {
    return Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, x, y);
  }

  /** Every game object, so the scene can route them past the UI camera. */
  objects(): Phaser.GameObjects.GameObject[] {
    return [this.sprite, ...this.bar.objects()];
  }

  /** Has the summon outlived its duration? (HP-death is handled in takeHit.) */
  isExpired(time: number): boolean {
    return time >= this.expireAt;
  }

  /** Apply enemy damage to the summon; returns damage dealt. Dies/shatters at 0 HP. */
  takeHit(amount: number): number {
    if (this.dead) return 0;
    const dealt = this.health.damage(amount);
    this.bar.setRatio(this.health.ratio);
    this.sprite.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.sprite.scene.time.delayedCall(70, () => {
      if (!this.dead) this.sprite.setTint(this.config.tint).setTintMode(Phaser.TintModes.MULTIPLY);
    });
    if (this.health.isDead) this.die();
    return dealt;
  }

  /** Per-frame behavior. Tank: re-approach the player when too far, else hold + soak. */
  update(playerX: number, playerY: number, _time: number): void {
    if (this.dead) return;
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    if (this.config.behavior === 'tank') {
      const dist = this.distanceTo(playerX, playerY);
      if (dist > this.config.followRange) {
        const a = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, playerX, playerY);
        body.velocity.set(Math.cos(a) * this.speed, Math.sin(a) * this.speed);
        this.sprite.setFlipX(playerX < this.sprite.x);
      } else {
        body.velocity.set(0, 0); // hold ground as a meat-shield
      }
    } else {
      // 'attacker' (RESERVED): a future minion moves to the nearest enemy + attacks on
      // cadence using config.attackDamage / attackCooldownMs. Not built this batch.
      body.velocity.set(0, 0);
    }
    this.floatBar();
  }

  /** Stop moving (player frozen in dialogue / death). */
  halt(): void {
    if (this.dead) return;
    (this.sprite.body as Phaser.Physics.Arcade.Body).velocity.set(0, 0);
  }

  /** Remove entirely (expiry / dev clear / teardown). */
  destroy(): void {
    this.dead = true;
    for (const o of this.objects()) o.destroy();
  }

  private floatBar(): void {
    this.bar.setPosition(this.sprite.x - 28, this.sprite.y - this.sprite.height / 2 - 8);
  }

  /** Death: shatter, then clean up the sprite + bar. */
  private die(): void {
    this.dead = true;
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.velocity.set(0, 0);
    body.enable = false;
    this.bar.setVisible(false);
    for (const o of this.bar.objects()) o.destroy();
    this.sprite.scene.tweens.add({
      targets: this.sprite,
      alpha: 0,
      scale: 1.3,
      duration: 320,
      ease: 'Quad.out',
      onComplete: () => this.sprite.destroy(),
    });
  }

  private static textureKey(config: AlliedSummonConfig): string {
    return `summon-${config.key}`;
  }

  /** Build the summon's placeholder texture once (per type). Ice Golem = a chunky icy figure. */
  private static ensureTexture(scene: Phaser.Scene, config: AlliedSummonConfig): void {
    const key = AlliedSummon.textureKey(config);
    if (scene.textures.exists(key)) return;
    const w = 46;
    const h = 56;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    if (config.key === 'ice_golem') {
      // A blocky ice golem: dark outline, pale-blue crystalline body, frost facets, glowing eyes.
      g.fillStyle(0x123040, 1);
      g.fillRoundedRect(4, 10, w - 8, h - 12, 7); // outline
      g.fillStyle(0x7fc9ef, 1);
      g.fillRoundedRect(7, 13, w - 14, h - 18, 6); // icy body
      g.fillStyle(0xbfeaff, 1);
      g.fillRect(w / 2 - 10, 18, 7, h - 28); // frost facet
      g.fillRect(w / 2 + 3, 22, 6, h - 34);
      g.fillStyle(0xe8f8ff, 0.9);
      g.fillCircle(w / 2, 16, 8); // head
      g.fillStyle(0x123040, 1);
      g.fillCircle(w / 2, 16, 9);
      g.fillStyle(0x9fe0ff, 1);
      g.fillCircle(w / 2, 16, 7);
      g.fillStyle(0x2bd6ff, 1); // glowing eyes
      g.fillCircle(w / 2 - 3, 15, 1.8);
      g.fillCircle(w / 2 + 3, 15, 1.8);
      // Blocky arms.
      g.fillStyle(0x6bbfe6, 1);
      g.fillRoundedRect(2, 22, 8, 20, 3);
      g.fillRoundedRect(w - 10, 22, 8, 20, 3);
    } else {
      // Generic fallback summon: a simple pale capsule (future types add their own art).
      g.fillStyle(0x101418, 1);
      g.fillRoundedRect(6, 10, w - 12, h - 14, 8);
      g.fillStyle(0xcfe6ff, 1);
      g.fillRoundedRect(9, 13, w - 18, h - 20, 6);
    }
    g.generateTexture(key, w, h);
    g.destroy();
  }
}

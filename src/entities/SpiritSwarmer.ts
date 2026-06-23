import Phaser from 'phaser';
import { Health } from '../combat/Health';
import { TILE_SIZE } from '../render/tileAtlas';
import {
  SWARMER_MAX_HP,
  SWARMER_MOVE_TILES_PER_SEC,
  SWARMER_ATTACK_COOLDOWN_MS,
  SWARMER_AGGRO_RANGE,
  SWARMER_XP_REWARD,
} from '../game/settings';

const TEXTURE_KEY = 'spirit-swarmer';
const CONTACT_RANGE = 26; // px — "touching" the player

/**
 * A fast, weak spirit swarmer — the second enemy TYPE, defined by data the same
 * way the Sasquatch is. It lives on the SPIRITUAL layer: only visible, tangible,
 * and dangerous while Spirit Vision is revealed. Its AI is deliberately UNLIKE
 * the Sasquatch's telegraphed bruiser pattern — it simply rushes the player and
 * bites on contact (short cooldown), no wind-up. Lethal in numbers, trivial alone.
 *
 * Drawn by the main world camera (a world-space sprite). The caller adds the
 * terrain collider and routes it past the UI camera.
 */
export class SpiritSwarmer {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  readonly health: Health;
  readonly xpReward = SWARMER_XP_REWARD;
  /** Fired when a bite lands on the player. */
  onContact?: () => void;

  private readonly speed = SWARMER_MOVE_TILES_PER_SEC * TILE_SIZE;
  private revealed = false;
  private nextBiteAt = 0;
  private dead = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    SpiritSwarmer.ensureTexture(scene);
    this.sprite = scene.physics.add.sprite(x, y, TEXTURE_KEY).setDepth(8);
    this.sprite.setTint(0x9a6cff); // eerie violet, consistent with the spirit layer
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setSize(18, 18);
    this.sprite.setCollideWorldBounds(true);
    this.health = new Health(SWARMER_MAX_HP);
    this.setRevealed(false);
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
  /** True while actively chasing the player (drives the player's combat/regen state). */
  get isAggro(): boolean {
    return this.revealed && !this.dead && this.aggroing;
  }
  private aggroing = false;

  distanceTo(x: number, y: number): number {
    return Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, x, y);
  }

  /**
   * Spirit-Vision gate. When hidden the swarmer is fully imperceptible: invisible,
   * its physics body disabled (so it can't be hit and can't touch the player), and
   * it neither moves nor aggros.
   */
  setRevealed(revealed: boolean): void {
    this.revealed = revealed;
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    this.sprite.setVisible(revealed && !this.dead);
    body.enable = revealed && !this.dead;
    if (!revealed) {
      body.velocity.set(0, 0);
      this.aggroing = false;
    }
  }

  /** Apply a player hit. Returns damage dealt; dies at 0 HP. */
  takeHit(amount: number): number {
    if (this.dead || !this.revealed) return 0;
    const dealt = this.health.damage(amount);
    this.sprite.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.sprite.scene.time.delayedCall(70, () => {
      if (!this.dead) this.sprite.setTint(0x9a6cff).setTintMode(Phaser.TintModes.MULTIPLY);
    });
    if (this.health.isDead) this.die();
    return dealt;
  }

  update(playerX: number, playerY: number, time: number): void {
    if (this.dead || !this.revealed) return;
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    const dist = this.distanceTo(playerX, playerY);

    this.aggroing = dist <= SWARMER_AGGRO_RANGE;
    if (this.aggroing) {
      const a = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, playerX, playerY);
      body.velocity.set(Math.cos(a) * this.speed, Math.sin(a) * this.speed);
      this.sprite.setFlipX(playerX < this.sprite.x);
      if (dist <= CONTACT_RANGE && time >= this.nextBiteAt) {
        this.nextBiteAt = time + SWARMER_ATTACK_COOLDOWN_MS;
        this.onContact?.();
      }
    } else {
      body.velocity.set(0, 0);
    }
  }

  /** Stop moving (used while the player is frozen in dialogue/death). */
  halt(): void {
    if (this.dead) return;
    (this.sprite.body as Phaser.Physics.Arcade.Body).velocity.set(0, 0);
  }

  /** Remove this swarmer entirely (death, dev reset). */
  destroy(): void {
    this.dead = true;
    this.sprite.destroy();
  }

  private die(): void {
    this.dead = true;
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.velocity.set(0, 0);
    body.enable = false;
    this.sprite.scene.tweens.add({
      targets: this.sprite,
      alpha: 0,
      scale: 1.4,
      duration: 280,
      ease: 'Quad.out',
      onComplete: () => this.sprite.destroy(),
    });
  }

  private static ensureTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists(TEXTURE_KEY)) return;
    const w = 22;
    const h = 26;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    // Small wispy white sprite (tinted violet at runtime): round head, tapering
    // tail, hollow eyes — clearly smaller and eerier than the player/Sasquatch.
    g.fillStyle(0xffffff, 1);
    g.fillCircle(w / 2, 9, 8);
    g.fillTriangle(w / 2 - 8, 9, w / 2 + 8, 9, w / 2, h - 1);
    g.fillStyle(0x241038, 1);
    g.fillCircle(w / 2 - 3, 8, 1.8);
    g.fillCircle(w / 2 + 3, 8, 1.8);
    g.generateTexture(TEXTURE_KEY, w, h);
    g.destroy();
  }
}

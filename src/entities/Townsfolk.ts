import Phaser from 'phaser';
import { Health } from '../combat/Health';
import { TILE_SIZE } from '../render/tileAtlas';
import {
  TOWNSFOLK_MAX_HP,
  TOWNSFOLK_MOVE_TILES_PER_SEC,
  TOWNSFOLK_ATTACK_COOLDOWN_MS,
  TOWNSFOLK_CONTACT_RANGE,
  TOWNSFOLK_AGGRO_RANGE,
  TOWNSFOLK_VARIANTS,
  type TownsfolkVariant,
  PORTAL_ATTACK_RANGE,
} from '../game/settings';

const TEXTURE_KEY = 'townsfolk';
let NEXT_ID = 1;

/**
 * A melee townsfolk enemy. It targets a POINT (set via {@link setTarget}) — the
 * Dark Portal in the portal-defense encounter, or the PLAYER (null target) for
 * the descent arc's guardsmen/farmers — pathing toward it and striking in range,
 * and also striking the PLAYER if adjacent so the player can intercept. A plain
 * human (clearly not a spirit or angel), reskinned per VARIANT (tint + XP); a
 * NORMAL-layer enemy (always visible). Pathing is deliberately simple (move-
 * toward + terrain colliders); spawn points sit in open ground.
 */
export class Townsfolk {
  readonly id: string;
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  readonly health: Health;
  readonly xpReward: number;
  readonly variant: TownsfolkVariant;

  /** Fired when a strike lands on the target point / the player. */
  onHitPortal?: () => void;
  onHitPlayer?: () => void;

  private readonly speed: number;
  private readonly cooldownMs: number;
  /** Max turn rate (rad/sec); Infinity = the classic instant snap toward the target. */
  private readonly turnRadPerSec: number;
  private readonly tint: number;
  private nextAttackAt = 0;
  private dead = false;
  /** Fixed target point; null means target the player directly. */
  private targetPoint: { x: number; y: number } | null = null;
  /** While time < holdUntil the body is planted (still hittable) — the brute's
   *  telegraphed-windup freeze, set by the scene. 0 = never held. */
  holdUntil = 0;
  /** Current heading (rad) for turn-rate-limited variants. */
  private heading: number | null = null;
  private lastUpdateTime = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, variant: TownsfolkVariant = 'townsperson') {
    this.id = `townsfolk-${NEXT_ID++}`;
    this.variant = variant;
    const cfg = TOWNSFOLK_VARIANTS[variant];
    this.xpReward = cfg.xpReward;
    this.tint = cfg.color;
    this.speed = (cfg.moveTilesPerSec ?? TOWNSFOLK_MOVE_TILES_PER_SEC) * TILE_SIZE;
    this.cooldownMs = cfg.attackCooldownMs ?? TOWNSFOLK_ATTACK_COOLDOWN_MS;
    this.turnRadPerSec = cfg.turnRadPerSec ?? Infinity;
    Townsfolk.ensureTexture(scene);
    this.sprite = scene.physics.add.sprite(x, y, TEXTURE_KEY).setDepth(9);
    if (this.tint !== 0xffffff) this.sprite.setTint(this.tint);
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setSize(18, 22);
    this.sprite.setCollideWorldBounds(true);
    // Per-variant HP (Act I wolves/sea lion/raiders tune their own pools); the
    // shared TOWNSFOLK_MAX_HP is the default for variants that omit it.
    this.health = new Health(cfg.maxHP ?? TOWNSFOLK_MAX_HP);
  }

  /** Set a fixed target point (e.g. the portal), or null to target the player. */
  setTarget(point: { x: number; y: number } | null): void {
    this.targetPoint = point;
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

  distanceTo(x: number, y: number): number {
    return Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, x, y);
  }

  takeHit(amount: number): number {
    if (this.dead) return 0;
    const dealt = this.health.damage(amount);
    this.sprite.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.sprite.scene.time.delayedCall(70, () => {
      if (this.dead) return;
      if (this.tint !== 0xffffff) this.sprite.setTint(this.tint).setTintMode(Phaser.TintModes.MULTIPLY);
      else this.sprite.clearTint();
    });
    if (this.health.isDead) this.die();
    return dealt;
  }

  /**
   * Advance on the target point (or the player if none); strike the player if
   * adjacent, else strike the target point if in range, else keep marching.
   */
  update(playerX: number, playerY: number, time: number): void {
    if (this.dead) return;
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    const dt = this.lastUpdateTime > 0 ? Math.min(0.1, (time - this.lastUpdateTime) / 1000) : 0.016;
    this.lastUpdateTime = time;
    // Windup hold (the brute's telegraph): planted in place, still hittable.
    if (time < this.holdUntil) {
      body.velocity.set(0, 0);
      this.sprite.setFlipX(playerX < this.sprite.x);
      return;
    }
    const tx = this.targetPoint ? this.targetPoint.x : playerX;
    const ty = this.targetPoint ? this.targetPoint.y : playerY;
    const dPlayer = this.distanceTo(playerX, playerY);

    // Player-hunting (arc) townsfolk hold their post until the player draws near.
    if (this.targetPoint === null && dPlayer > TOWNSFOLK_AGGRO_RANGE) {
      body.velocity.set(0, 0);
      return;
    }

    if (dPlayer <= TOWNSFOLK_CONTACT_RANGE) {
      body.velocity.set(0, 0);
      this.sprite.setFlipX(playerX < this.sprite.x);
      if (time >= this.nextAttackAt) {
        this.nextAttackAt = time + this.cooldownMs;
        this.onHitPlayer?.();
      }
    } else if (this.targetPoint && this.distanceTo(tx, ty) <= PORTAL_ATTACK_RANGE) {
      body.velocity.set(0, 0);
      this.sprite.setFlipX(tx < this.sprite.x);
      if (time >= this.nextAttackAt) {
        this.nextAttackAt = time + this.cooldownMs;
        this.onHitPortal?.();
      }
    } else {
      const desired = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, tx, ty);
      // Turn-rate-limited variants (the brute) rotate their heading toward the
      // target; everyone else keeps the classic instant snap.
      const a = Number.isFinite(this.turnRadPerSec)
        ? (this.heading = Phaser.Math.Angle.RotateTo(this.heading ?? desired, desired, this.turnRadPerSec * dt))
        : desired;
      body.velocity.set(Math.cos(a) * this.speed, Math.sin(a) * this.speed);
      this.sprite.setFlipX(Math.cos(a) < 0);
    }
  }

  halt(): void {
    if (this.dead) return;
    (this.sprite.body as Phaser.Physics.Arcade.Body).velocity.set(0, 0);
  }

  /** Remove entirely (encounter stop / reset). */
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
      scale: 1.25,
      duration: 260,
      ease: 'Quad.out',
      onComplete: () => this.sprite.destroy(),
    });
  }

  private static ensureTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists(TEXTURE_KEY)) return;
    const w = 24;
    const h = 34;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    // A plain villager: dark outline, brown tunic, fair head, a belt — clearly an
    // ordinary human, not a spirit or an angel.
    g.fillStyle(0x14100c, 1);
    g.fillRoundedRect(3, 9, w - 6, h - 11, 4);
    g.fillStyle(0x8a5a32, 1); // brown tunic
    g.fillRoundedRect(5, 11, w - 10, h - 15, 3);
    g.fillStyle(0x5a3a20, 1); // belt
    g.fillRect(5, h - 16, w - 10, 3);
    g.fillStyle(0x14100c, 1); // head outline
    g.fillCircle(w / 2, 9, 7);
    g.fillStyle(0xe8b98a, 1); // head
    g.fillCircle(w / 2, 9, 5.5);
    g.generateTexture(TEXTURE_KEY, w, h);
    g.destroy();
  }
}

import Phaser from 'phaser';
import { Health } from '../combat/Health';
import { TILE_SIZE } from '../render/tileAtlas';
import {
  TOWNSFOLK_MAX_HP,
  TOWNSFOLK_MOVE_TILES_PER_SEC,
  TOWNSFOLK_ATTACK_COOLDOWN_MS,
  TOWNSFOLK_CONTACT_RANGE,
  TOWNSFOLK_XP_REWARD,
  PORTAL_ATTACK_RANGE,
} from '../game/settings';

const TEXTURE_KEY = 'townsfolk';
let NEXT_ID = 1;

/**
 * A melee townsfolk enemy for the portal-defense encounter. Unlike every prior
 * enemy it targets a POINT — the Dark Portal — not the player: it paths toward
 * the portal and strikes it in range. But if the PLAYER blocks its way (adjacent)
 * it strikes the player instead, so the player can intercept the advance. A plain
 * villager (clearly not a spirit or angel); a NORMAL-layer enemy (always visible).
 *
 * Pathing is deliberately simple (move-toward + terrain colliders); the portal
 * and spawn points sit in open ground so straight advance works.
 */
export class Townsfolk {
  readonly id: string;
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  readonly health: Health;
  readonly xpReward = TOWNSFOLK_XP_REWARD;

  /** Fired when a strike lands on the portal / the player. */
  onHitPortal?: () => void;
  onHitPlayer?: () => void;

  private readonly speed = TOWNSFOLK_MOVE_TILES_PER_SEC * TILE_SIZE;
  private nextAttackAt = 0;
  private dead = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.id = `townsfolk-${NEXT_ID++}`;
    Townsfolk.ensureTexture(scene);
    this.sprite = scene.physics.add.sprite(x, y, TEXTURE_KEY).setDepth(9);
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setSize(18, 22);
    this.sprite.setCollideWorldBounds(true);
    this.health = new Health(TOWNSFOLK_MAX_HP);
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
      if (!this.dead) this.sprite.clearTint();
    });
    if (this.health.isDead) this.die();
    return dealt;
  }

  /**
   * Advance on the portal; strike the player if adjacent, else the portal if in
   * range, else keep marching toward the portal.
   */
  update(portalX: number, portalY: number, playerX: number, playerY: number, time: number): void {
    if (this.dead) return;
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    const dPlayer = this.distanceTo(playerX, playerY);
    const dPortal = this.distanceTo(portalX, portalY);

    if (dPlayer <= TOWNSFOLK_CONTACT_RANGE) {
      body.velocity.set(0, 0);
      this.sprite.setFlipX(playerX < this.sprite.x);
      if (time >= this.nextAttackAt) {
        this.nextAttackAt = time + TOWNSFOLK_ATTACK_COOLDOWN_MS;
        this.onHitPlayer?.();
      }
    } else if (dPortal <= PORTAL_ATTACK_RANGE) {
      body.velocity.set(0, 0);
      this.sprite.setFlipX(portalX < this.sprite.x);
      if (time >= this.nextAttackAt) {
        this.nextAttackAt = time + TOWNSFOLK_ATTACK_COOLDOWN_MS;
        this.onHitPortal?.();
      }
    } else {
      const a = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, portalX, portalY);
      body.velocity.set(Math.cos(a) * this.speed, Math.sin(a) * this.speed);
      this.sprite.setFlipX(portalX < this.sprite.x);
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

import Phaser from 'phaser';
import { Health } from '../combat/Health';
import { HealthBar } from '../combat/HealthBar';
import { TILE_SIZE } from '../render/tileAtlas';
import { FLAMING_SWORD_VARIANTS, type GuardianConfig, type GuardianRole } from '../game/settings';

const TEXTURE_KEY = 'flaming-sword';
let NEXT_ID = 1;

type State = 'dormant' | 'engage' | 'dead';

/**
 * A flaming-sword guardian of the Heaven Portal — the descent climax mini-boss.
 * ONE data-driven definition (FLAMING_SWORD_VARIANTS), VISUALLY identical for
 * both, assigned one of two ROLES:
 *   - 'melee'  (Sword A): flies in and slashes — the chase/contact pattern shared
 *     with the Sasquatch/Townsfolk, hitting the player in contact range.
 *   - 'ranged' (Sword B): keeps its distance and flings fire bolts — the kiting
 *     pattern shared with AngelEnemy (the scene spawns the bolts via {@link onFire}).
 *
 * Starts DORMANT (not attacking, no bar) until {@link activate} — the encounter
 * wakes both when the player nears the outpost. Respects terrain collision (the
 * caller adds the collider). A NORMAL-layer enemy (always visible). Stable id +
 * serializable state for the future save system.
 */
export class FlamingSword {
  readonly id: string;
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  readonly health: Health;
  readonly role: GuardianRole;
  readonly cfg: GuardianConfig;

  /** Fired when a MELEE slash lands on the player. */
  onHitPlayer?: () => void;
  /** Fired when a RANGED volley looses; the scene turns each dir into a fire bolt. */
  onFire?: (origin: { x: number; y: number }, dirs: { x: number; y: number }[]) => void;

  private readonly scene: Phaser.Scene;
  private readonly bar: HealthBar;
  private readonly speed: number;
  private readonly homeX: number;
  private readonly homeY: number;
  private state: State = 'dormant';
  private nextAttackAt = 0;
  private barShown = false;

  constructor(scene: Phaser.Scene, x: number, y: number, role: GuardianRole) {
    this.id = `flaming-sword-${NEXT_ID++}`;
    this.scene = scene;
    this.role = role;
    this.cfg = FLAMING_SWORD_VARIANTS[role];
    this.homeX = x;
    this.homeY = y;
    FlamingSword.ensureTexture(scene);

    this.sprite = scene.physics.add.sprite(x, y, TEXTURE_KEY).setDepth(9);
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setSize(20, 30);
    this.sprite.setCollideWorldBounds(true);

    this.speed = this.cfg.moveTilesPerSec * TILE_SIZE;
    this.health = new Health(this.cfg.maxHP);
    this.bar = new HealthBar(scene, 64, 8, 9);
    this.bar.setVisible(false);

    // A slow flame-flicker so the dormant blade still reads as alive.
    scene.tweens.add({
      targets: this.sprite,
      alpha: { from: 0.86, to: 1 },
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
  }

  get xpReward(): number {
    return this.cfg.xpReward;
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
  /** True once activated and not dead — drives the player's combat/regen state. */
  get isAggro(): boolean {
    return this.state === 'engage';
  }
  get isDormant(): boolean {
    return this.state === 'dormant';
  }

  /** Wake the guardian so it begins fighting (the encounter activates both). */
  activate(): void {
    if (this.state === 'dormant') {
      this.state = 'engage';
      this.revealBar();
    }
  }

  distanceTo(x: number, y: number): number {
    return Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, x, y);
  }

  /** Every game object, so the scene can route them past the UI camera. */
  objects(): Phaser.GameObjects.GameObject[] {
    return [this.sprite, ...this.bar.objects()];
  }

  takeHit(amount: number): number {
    if (this.state === 'dead') return 0;
    this.activate(); // a hit also wakes a still-dormant guardian (no cheesing)
    const dealt = this.health.damage(amount);
    this.bar.setRatio(this.health.ratio);
    this.sprite.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.scene.time.delayedCall(70, () => {
      if (this.state !== 'dead') this.sprite.clearTint();
    });
    if (this.health.isDead) this.die();
    return dealt;
  }

  /**
   * @param hasLineOfSight whether the ranged sword can see the player (no blocking
   *   terrain between them) — computed by the scene; ignored by the melee role.
   */
  update(playerX: number, playerY: number, time: number, hasLineOfSight: boolean): void {
    if (this.state !== 'engage') {
      if (this.state === 'dormant') (this.sprite.body as Phaser.Physics.Arcade.Body).velocity.set(0, 0);
      return;
    }
    this.sprite.setFlipX(playerX < this.sprite.x);
    if (this.role === 'melee') this.updateMelee(playerX, playerY, time);
    else this.updateRanged(playerX, playerY, time, hasLineOfSight);
    this.floatBar();
  }

  halt(): void {
    if (this.state === 'dead') return;
    (this.sprite.body as Phaser.Physics.Arcade.Body).velocity.set(0, 0);
  }

  /** Restore to dormant + full HP at the home post (encounter reset). */
  reset(): void {
    this.state = 'dormant';
    this.health.full();
    this.nextAttackAt = 0;
    this.barShown = false;
    this.sprite.clearTint();
    this.sprite.setActive(true).setVisible(true).setAlpha(1).setScale(1).setAngle(0).setFlipX(false);
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    body.velocity.set(0, 0);
    this.sprite.setPosition(this.homeX, this.homeY);
    this.bar.setRatio(1);
    this.bar.setVisible(false);
  }

  /** Remove entirely (dev reset / encounter teardown). */
  destroy(): void {
    this.state = 'dead';
    for (const o of this.objects()) o.destroy();
  }

  // --- Serialization (encounter state for the future save system) -----------

  toJSON(): { role: GuardianRole; state: State; hp: number } {
    return { role: this.role, state: this.state, hp: this.health.current };
  }

  // --- internals ------------------------------------------------------------

  private updateMelee(playerX: number, playerY: number, time: number): void {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    const dist = this.distanceTo(playerX, playerY);
    if (dist <= this.cfg.contactRange) {
      body.velocity.set(0, 0);
      if (time >= this.nextAttackAt) {
        this.nextAttackAt = time + this.cfg.attackCooldownMs;
        this.onHitPlayer?.();
      }
    } else {
      const a = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, playerX, playerY);
      body.velocity.set(Math.cos(a) * this.speed, Math.sin(a) * this.speed);
    }
  }

  private updateRanged(playerX: number, playerY: number, time: number, hasLineOfSight: boolean): void {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    const dist = this.distanceTo(playerX, playerY);
    const pref = this.cfg.preferredRange;

    if (!hasLineOfSight) {
      // Sight broken (player behind terrain): advance to regain it; hold fire.
      this.moveToward(playerX, playerY);
      return;
    }
    if (dist < pref * 0.85) this.moveAway(playerX, playerY);
    else if (dist > pref * 1.15) this.moveToward(playerX, playerY);
    else body.velocity.set(0, 0);

    if (dist <= this.cfg.projectileRange && time >= this.nextAttackAt) {
      this.nextAttackAt = time + this.cfg.fireCooldownMs;
      const base = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, playerX, playerY);
      const origin = { x: this.sprite.x + Math.cos(base) * 16, y: this.sprite.y + Math.sin(base) * 16 };
      this.onFire?.(origin, [{ x: Math.cos(base), y: Math.sin(base) }]);
      // A brief swell so the cast reads as incoming.
      this.scene.tweens.add({ targets: this.sprite, scaleX: 1.14, scaleY: 1.14, duration: 90, yoyo: true });
    }
  }

  private moveToward(tx: number, ty: number): void {
    const a = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, tx, ty);
    (this.sprite.body as Phaser.Physics.Arcade.Body).velocity.set(Math.cos(a) * this.speed, Math.sin(a) * this.speed);
  }
  private moveAway(tx: number, ty: number): void {
    const a = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, tx, ty);
    (this.sprite.body as Phaser.Physics.Arcade.Body).velocity.set(-Math.cos(a) * this.speed, -Math.sin(a) * this.speed);
  }

  private revealBar(): void {
    if (this.barShown) return;
    this.barShown = true;
    this.bar.setRatio(this.health.ratio);
    this.bar.setVisible(true);
  }
  private floatBar(): void {
    this.bar.setPosition(this.sprite.x - 32, this.sprite.y - this.sprite.height / 2 - 10);
  }

  private die(): void {
    this.state = 'dead';
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.velocity.set(0, 0);
    body.enable = false;
    this.bar.setVisible(false);
    this.sprite.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0,
      scale: 1.5,
      angle: this.sprite.angle + 120,
      duration: 360,
      ease: 'Quad.out',
      onComplete: () => this.sprite.setActive(false).setVisible(false),
    });
  }

  private static ensureTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists(TEXTURE_KEY)) return;
    const w = 30;
    const h = 46;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    // A hovering flaming sword: orange flame halo, a bright blade pointing up, a
    // crossguard + hilt. Placeholder art — clearly a burning blade.
    g.fillStyle(0xff6a1f, 0.35); // outer flame halo
    g.fillEllipse(w / 2, h / 2 - 4, w, h);
    g.fillStyle(0xffb43a, 0.55); // inner flame
    g.fillEllipse(w / 2, h / 2 - 4, w - 10, h - 14);
    g.fillStyle(0x2a1606, 1); // blade outline
    g.fillTriangle(w / 2 - 4, 4, w / 2 + 4, 4, w / 2, 2);
    g.fillRect(w / 2 - 4, 4, 8, h - 22);
    g.fillStyle(0xfff3c4, 1); // bright blade
    g.fillRect(w / 2 - 2.5, 5, 5, h - 23);
    g.fillStyle(0x8a5a22, 1); // crossguard
    g.fillRect(w / 2 - 9, h - 18, 18, 4);
    g.fillStyle(0x5a3a18, 1); // hilt
    g.fillRect(w / 2 - 2, h - 14, 4, 9);
    g.fillStyle(0xffd24a, 1); // pommel
    g.fillCircle(w / 2, h - 4, 3);
    g.generateTexture(TEXTURE_KEY, w, h);
    g.destroy();
  }
}

import Phaser from 'phaser';
import { Health } from '../combat/Health';
import { HealthBar } from '../combat/HealthBar';
import { TILE_SIZE } from '../render/tileAtlas';
import { CHERUB_VARIANTS, type CherubVariantConfig, type CherubVariantKey } from '../game/settings';

const TEXTURE_KEY = 'cherub-enemy';
let NEXT_ID = 1;

type State = 'idle' | 'engage' | 'dead';

/**
 * The Cherub — Heaven's divine defender and the first HYBRID enemy: dangerous at
 * ALL ranges. Two data-driven variants from one definition (CHERUB_VARIANTS):
 * CHERUB (elite) and CHERUBIM (boss), sharing this exact behavior and differing
 * only by config (src/game/settings.ts).
 *
 * Behavior (IDLE → ENGAGE): wakes when the player enters aggro range, then —
 *  - FIRES holy bolts at range (the scene spawns them via {@link onFire}, reusing
 *    the angel projectile system) on the fire cooldown while it has line of sight;
 *  - STRIKES hard in melee ({@link onMelee}) when the player is close.
 * Unlike the Earth angel it does NOT flee to keep distance: it advances to its
 * preferred range and holds ground, so the player can neither trivially kite it
 * nor trivially rush it. A NORMAL-layer enemy; respects terrain collision (the
 * caller adds the collider). Stable id + serializable state.
 */
export class Cherub {
  readonly id: string;
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  readonly health: Health;
  readonly variant: CherubVariantConfig;
  readonly variantKey: CherubVariantKey;

  /** Fired when a volley looses; the scene turns each direction into a holy bolt. */
  onFire?: (origin: { x: number; y: number }, dirs: { x: number; y: number }[]) => void;
  /** Fired when a melee strike lands on the player. */
  onMelee?: (damage: number) => void;

  private readonly scene: Phaser.Scene;
  private readonly bar: HealthBar;
  private readonly speed: number;
  private state: State = 'idle';
  private nextFireAt = 0;
  private nextMeleeAt = 0;
  private barShown = false;

  constructor(scene: Phaser.Scene, x: number, y: number, variantKey: CherubVariantKey) {
    this.id = `cherub-${NEXT_ID++}`;
    this.scene = scene;
    this.variantKey = variantKey;
    this.variant = CHERUB_VARIANTS[variantKey];
    Cherub.ensureTexture(scene);

    this.sprite = scene.physics.add.sprite(x, y, TEXTURE_KEY).setDepth(9);
    this.sprite.setScale(this.variant.scale).setTint(this.variant.color);
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setCircle(16, this.sprite.width / 2 - 16, this.sprite.height / 2 - 16);
    // NOTE: deliberately NOT setCollideWorldBounds — Cherubs live in the Heaven
    // world region (a coordinate offset). Binding to world bounds would yank them
    // when the active world (and thus the bounds) is Earth. The terrain collider
    // (the void border) contains them instead.

    this.speed = this.variant.moveTilesPerSec * TILE_SIZE;
    this.health = new Health(this.variant.maxHP);
    this.bar = new HealthBar(scene, 70 * this.variant.scale, 8, 9);
    this.bar.setVisible(false);
  }

  get xpReward(): number {
    return this.variant.xpReward;
  }
  get holyPowerDrop(): number {
    return this.variant.holyPowerDrop;
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
  /** True while engaged — drives the player's combat / HP-regen state. */
  get isAggro(): boolean {
    return this.state === 'engage';
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
    const dealt = this.health.damage(amount);
    if (this.state === 'idle') this.state = 'engage'; // a hit wakes it
    this.revealBar();
    this.bar.setRatio(this.health.ratio);
    this.sprite.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.scene.time.delayedCall(70, () => {
      if (this.state !== 'dead') this.sprite.setTint(this.variant.color).setTintMode(Phaser.TintModes.MULTIPLY);
    });
    if (this.health.isDead) this.die();
    return dealt;
  }

  /**
   * @param hasLineOfSight whether it can see the player (no blocking terrain
   *   between) — computed by the scene; gates ranged fire.
   */
  update(playerX: number, playerY: number, time: number, hasLineOfSight: boolean): void {
    if (this.state === 'dead') return;
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    const v = this.variant;
    const dist = this.distanceTo(playerX, playerY);

    if (this.state === 'idle') {
      if (dist <= v.aggroRange) this.state = 'engage';
      else {
        body.velocity.set(0, 0);
        this.floatBar();
        return;
      }
    }

    this.revealBar();
    this.sprite.setFlipX(playerX < this.sprite.x);

    if (dist <= v.meleeRange) {
      // Up close: hold and strike hard.
      body.velocity.set(0, 0);
      if (time >= this.nextMeleeAt) {
        this.nextMeleeAt = time + v.meleeCooldownMs;
        this.onMelee?.(v.meleeDamage);
        this.sprite.scene.tweens.add({ targets: this.sprite, scaleX: v.scale * 1.18, scaleY: v.scale * 1.18, duration: 80, yoyo: true });
      }
    } else {
      // At range: advance to the preferred standoff (never back off), and fire.
      if (dist > v.preferredRange) this.moveToward(playerX, playerY);
      else body.velocity.set(0, 0);
      if (dist <= v.projectileRange && hasLineOfSight && time >= this.nextFireAt) {
        this.nextFireAt = time + v.fireCooldownMs;
        this.fire(playerX, playerY);
      }
    }
    this.floatBar();
  }

  halt(): void {
    if (this.state === 'dead') return;
    (this.sprite.body as Phaser.Physics.Arcade.Body).velocity.set(0, 0);
  }

  /** Remove entirely (dev reset / teardown). */
  destroy(): void {
    this.state = 'dead';
    for (const o of this.objects()) o.destroy();
  }

  // --- Serialization (enemy state for the future save system) ---------------

  toJSON(): { variant: CherubVariantKey; state: State; hp: number; x: number; y: number } {
    return { variant: this.variantKey, state: this.state, hp: this.health.current, x: this.sprite.x, y: this.sprite.y };
  }

  // --- internals ------------------------------------------------------------

  private fire(px: number, py: number): void {
    const base = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, px, py);
    const n = Math.max(1, this.variant.boltsPerVolley);
    const spread = 0.18; // rad between bolts in a volley
    const dirs: { x: number; y: number }[] = [];
    for (let i = 0; i < n; i++) {
      const off = (i - (n - 1) / 2) * spread;
      dirs.push({ x: Math.cos(base + off), y: Math.sin(base + off) });
    }
    const origin = { x: this.sprite.x + Math.cos(base) * 18, y: this.sprite.y + Math.sin(base) * 18 };
    this.onFire?.(origin, dirs);
    const s = this.variant.scale;
    this.sprite.scene.tweens.add({ targets: this.sprite, scaleX: s * 1.1, scaleY: s * 1.1, duration: 90, yoyo: true });
  }

  private moveToward(tx: number, ty: number): void {
    const a = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, tx, ty);
    (this.sprite.body as Phaser.Physics.Arcade.Body).velocity.set(Math.cos(a) * this.speed, Math.sin(a) * this.speed);
  }

  private revealBar(): void {
    if (this.barShown) return;
    this.barShown = true;
    this.bar.setRatio(this.health.ratio);
    this.bar.setVisible(true);
  }
  private floatBar(): void {
    this.bar.setPosition(this.sprite.x - 35 * this.variant.scale, this.sprite.y - (this.sprite.height / 2) * this.variant.scale - 8);
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
      scale: this.variant.scale * 1.6,
      angle: this.sprite.angle + 90,
      duration: 420,
      ease: 'Quad.out',
      onComplete: () => {
        for (const o of this.bar.objects()) o.destroy();
        this.sprite.destroy();
      },
    });
  }

  private static ensureTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists(TEXTURE_KEY)) return;
    const w = 54;
    const h = 58;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    // A biblically-accurate cherub (drawn WHITE so the per-variant tint colors it):
    // overlapping wings ringed around a radiant core, dotted with eyes, plus a halo.
    const cx = w / 2;
    const cy = h / 2;
    // Outer ring of wings (six), as soft feathered ovals around the core.
    g.fillStyle(0xffffff, 0.4);
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI * 2 * i) / 6 - Math.PI / 2;
      const wx = cx + Math.cos(a) * 17;
      const wy = cy + Math.sin(a) * 17;
      g.fillEllipse(wx, wy, 16, 26);
    }
    // Eyes scattered on the wing-ring (the "full of eyes" motif).
    g.fillStyle(0xffffff, 1);
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI * 2 * i) / 6 - Math.PI / 2;
      g.fillCircle(cx + Math.cos(a) * 20, cy + Math.sin(a) * 20, 2.4);
    }
    // Radiant core body.
    g.fillStyle(0xffffff, 0.55);
    g.fillCircle(cx, cy, 13);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(cx, cy, 8);
    // A few core eyes + a crowning halo.
    g.fillStyle(0xffffff, 0.85);
    g.fillCircle(cx - 3, cy - 1, 1.6);
    g.fillCircle(cx + 3, cy - 1, 1.6);
    g.fillCircle(cx, cy + 3, 1.6);
    g.lineStyle(2, 0xffffff, 0.95);
    g.strokeCircle(cx, cy, 16);
    g.generateTexture(TEXTURE_KEY, w, h);
    g.destroy();
  }
}

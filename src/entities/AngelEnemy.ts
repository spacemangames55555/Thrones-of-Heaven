import Phaser from 'phaser';
import { Health } from '../combat/Health';
import { HealthBar } from '../combat/HealthBar';
import { TILE_SIZE } from '../render/tileAtlas';
import { ANGEL_VARIANTS, type AngelVariantConfig, type AngelVariantKey } from '../game/settings';
import { FEEL } from '../ui/feel-config';

const TEXTURE_KEY = 'angel-enemy';
let NEXT_ID = 1;

type State = 'idle' | 'engage' | 'dead';

/**
 * The first RANGED enemy: a winged angel that holds its distance and fires holy
 * bolts. Two data-driven variants from one definition — ANGEL (elite) and
 * ARCHANGEL (boss) — sharing this exact behavior, differing only by config
 * (src/game/settings.ts ANGEL_VARIANTS). It is a NORMAL-layer enemy: always
 * visible/fightable regardless of Spirit Vision.
 *
 * Kiting state machine: IDLE until the player enters aggro range, then ENGAGE —
 * hold a preferred range (back off if too close, advance if too far) and fire
 * volleys on cooldown whenever the player is in range AND in line of sight. The
 * scene supplies line-of-sight and spawns the bolts via the {@link onFire} hook.
 */
export class AngelEnemy {
  readonly id: string;
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  readonly health: Health;
  readonly variant: AngelVariantConfig;
  readonly variantKey: AngelVariantKey;

  /** Fired when a volley looses; the scene turns each direction into a projectile. */
  onFire?: (origin: { x: number; y: number }, dirs: { x: number; y: number }[]) => void;

  private readonly speed: number;
  private readonly bar: HealthBar;
  private state: State = 'idle';
  private nextFireAt = 0;
  private barShown = false;

  constructor(scene: Phaser.Scene, x: number, y: number, variantKey: AngelVariantKey) {
    this.id = `angel-${NEXT_ID++}`;
    this.variantKey = variantKey;
    this.variant = ANGEL_VARIANTS[variantKey];
    AngelEnemy.ensureTexture(scene);

    this.sprite = scene.physics.add.sprite(x, y, TEXTURE_KEY).setDepth(9);
    this.sprite.setScale(this.variant.scale).setTint(this.variant.color);
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setCircle(15, this.sprite.width / 2 - 15, this.sprite.height / 2 - 15);
    this.sprite.setCollideWorldBounds(true);

    this.speed = this.variant.moveTilesPerSec * TILE_SIZE;
    this.health = new Health(this.variant.maxHP);
    this.bar = new HealthBar(scene, 60 * this.variant.scale, 7, 9);
    this.bar.setVisible(false);
  }

  get xpReward(): number {
    return this.variant.xpReward;
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
  /** True while engaged (drives the player's combat / HP-regen state). */
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

  /** The tint the hit-flash RESTORES to when set (region domain tints). */
  private baseTint: number | null = null;

  /** PASS 10: does this enemy wear baked rim art (so the flash should be the
   *  shorter art-backed pulse and the restore a no-op multiply)? Set by the
   *  ONE dressing funnel in MainScene; false for every placeholder enemy. */
  private artBacked = false;

  /** Gate seam (tools/verify-runtime.mjs): read-only view of the art-backed
   *  flag, so funnel checks can prove the flag really travelled with the
   *  dressing rather than assuming it did. No behaviour. */
  get artBackedForGate(): boolean {
    return this.artBacked;
  }

  setArtBacked(on: boolean): void {
    this.artBacked = on;
  }

  setBaseTint(tint: number): void {
    this.baseTint = tint;
    this.sprite.setTint(tint).setTintMode(Phaser.TintModes.MULTIPLY);
  }

  takeHit(amount: number): number {
    if (this.state === 'dead') return 0;
    const dealt = this.health.damage(amount);
    this.revealBar();
    this.bar.setRatio(this.health.ratio);
    this.sprite.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.sprite.scene.time.delayedCall((this.artBacked ? FEEL.flash.artFlashMs : FEEL.flash.flashMs), () => {
      if (this.state !== 'dead') this.sprite.setTint(this.baseTint ?? this.variant.color).setTintMode(Phaser.TintModes.MULTIPLY);
    });
    if (this.health.isDead) this.die();
    return dealt;
  }

  /**
   * @param hasLineOfSight whether the angel can see the player (no blocking
   *   terrain between them) — computed by the scene.
   */
  update(playerX: number, playerY: number, time: number, hasLineOfSight: boolean): void {
    if (this.state === 'dead') return;
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    const dist = this.distanceTo(playerX, playerY);
    const v = this.variant;

    if (dist > v.aggroRange) {
      this.state = 'idle';
      body.velocity.set(0, 0);
      this.floatBar();
      return;
    }

    this.state = 'engage';
    this.revealBar();
    this.sprite.setFlipX(playerX < this.sprite.x);

    if (!hasLineOfSight) {
      // Sight is broken (player behind terrain): advance to regain it; hold fire.
      this.moveToward(playerX, playerY);
    } else {
      // Maintain the preferred standoff range.
      if (dist < v.preferredRange * 0.85) this.moveAway(playerX, playerY);
      else if (dist > v.preferredRange * 1.15) this.moveToward(playerX, playerY);
      else body.velocity.set(0, 0);

      if (dist <= v.projectileRange && time >= this.nextFireAt) {
        this.fire(playerX, playerY);
        this.nextFireAt = time + v.fireCooldownMs;
      }
    }
    this.floatBar();
  }

  /** Stop moving (player frozen in dialogue / death). */
  /** LEASH RELEASE (combat hotfix): the engagement funnel drops any
   *  entity beyond FEEL.combat.leashRadiusPx — the flag resets WITH it,
   *  so a frozen/paused aggro state can never outlive its engagement. */
  deaggro(): void {
    if (this.state === 'dead') return;
    this.state = 'idle';
    (this.sprite.body as Phaser.Physics.Arcade.Body).velocity.set(0, 0);
  }

  halt(): void {
    if (this.state === 'dead') return;
    (this.sprite.body as Phaser.Physics.Arcade.Body).velocity.set(0, 0);
  }

  /** Remove entirely (dev reset). */
  destroy(): void {
    this.state = 'dead';
    for (const o of this.objects()) o.destroy();
  }

  // --- internals ------------------------------------------------------------

  private fire(px: number, py: number): void {
    const base = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, px, py);
    const n = Math.max(1, this.variant.boltsPerVolley);
    const spread = 0.16; // rad between bolts in a volley
    const dirs: { x: number; y: number }[] = [];
    for (let i = 0; i < n; i++) {
      const off = (i - (n - 1) / 2) * spread;
      dirs.push({ x: Math.cos(base + off), y: Math.sin(base + off) });
    }
    const origin = { x: this.sprite.x + Math.cos(base) * 16, y: this.sprite.y + Math.sin(base) * 16 };
    this.onFire?.(origin, dirs);

    // A brief swell so the cast reads as incoming.
    const s = this.variant.scale;
    this.sprite.scene.tweens.add({
      targets: this.sprite,
      scaleX: s * 1.12,
      scaleY: s * 1.12,
      duration: 90,
      yoyo: true,
    });
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
    this.bar.setPosition(this.sprite.x - 30 * this.variant.scale, this.sprite.y - (this.sprite.height / 2) * this.variant.scale - 8);
  }

  private die(): void {
    this.state = 'dead';
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.velocity.set(0, 0);
    body.enable = false;
    this.bar.setVisible(false);
    this.sprite.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.sprite.scene.tweens.add({
      targets: this.sprite,
      alpha: 0,
      scale: this.variant.scale * 1.5,
      duration: 360,
      ease: 'Quad.out',
      onComplete: () => {
        for (const o of this.bar.objects()) o.destroy();
        this.sprite.destroy();
      },
    });
  }

  private static ensureTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists(TEXTURE_KEY)) return;
    const w = 48;
    const h = 56;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    // A bright winged figure (drawn white so per-variant tint colors it): broad
    // wings, a robed body, a halo. Larger than the player; the Archangel scales up.
    g.fillStyle(0xffffff, 0.5); // wings
    g.fillTriangle(w / 2 - 4, 18, 2, 8, 6, 40);
    g.fillTriangle(w / 2 + 4, 18, w - 2, 8, w - 6, 40);
    g.fillStyle(0xffffff, 1); // body
    g.fillRoundedRect(w / 2 - 8, 16, 16, h - 20, 6);
    g.fillCircle(w / 2, 13, 7); // head
    g.lineStyle(2, 0xffffff, 0.95); // halo
    g.strokeCircle(w / 2, 8, 6);
    g.generateTexture(TEXTURE_KEY, w, h);
    g.destroy();
  }
}

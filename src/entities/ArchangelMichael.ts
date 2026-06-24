import Phaser from 'phaser';
import { Health } from '../combat/Health';
import { TILE_SIZE } from '../render/tileAtlas';
import { MICHAEL, type MichaelPhaseConfig } from '../game/settings';

const TEXTURE_KEY = 'archangel-michael';

type State = 'dormant' | 'active' | 'dead';

/**
 * ARCHANGEL MICHAEL — Heaven's climactic, UNIQUE boss (one-off, not a type).
 *
 * The ONE new system is his PHASE STATE MACHINE: 3 HP-gated phases that escalate
 * attack frequency/volume and summon cadence. Everything else REUSES existing
 * systems — he is a hybrid like the Cherub (holy bolts at range via the projectile
 * system + hard flaming-sword melee up close, holding ground so he punishes both
 * kiting and rushing), and his summons/drops reuse the Cherub + pickup systems
 * (the scene fulfills {@link onSummon}, capped). DORMANT until {@link activate}.
 *
 * Phase/boss state is centralized here + serializable ({@link toJSON}). The scene
 * wires the event hooks (fire/melee/summon/phase-change/defeat) to existing systems.
 */
export class ArchangelMichael {
  readonly id = 'archangel-michael';
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  readonly health: Health;

  /** Ranged volley — the scene turns each dir into a holy bolt (projectile system). */
  onFire?: (origin: { x: number; y: number }, dirs: { x: number; y: number }[]) => void;
  /** Melee strike landed on the player. */
  onMelee?: (damage: number) => void;
  /** Summon request for `count` reinforcements (the scene caps + spawns them). */
  onSummon?: (count: number) => void;
  /** Entered a new phase (1-based) — the scene plays the telegraph. */
  onPhaseChange?: (phase: number) => void;
  /** Reached 0 HP — the scene plays the death beat + rewards + hook. */
  onDefeat?: () => void;

  private readonly scene: Phaser.Scene;
  private readonly speed: number;
  private readonly homeX: number;
  private readonly homeY: number;
  private state: State = 'dormant';
  private phase = 1; // 1..3, derived from HP at thresholds
  private nextFireAt = 0;
  private nextMeleeAt = 0;
  private nextSummonAt = Number.POSITIVE_INFINITY;
  /** True only while the player is actually within reach (drives regen + leash). */
  private playerNear = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.homeX = x;
    this.homeY = y;
    ArchangelMichael.ensureTexture(scene);

    this.sprite = scene.physics.add.sprite(x, y, TEXTURE_KEY).setDepth(10);
    this.sprite.setScale(MICHAEL.scale).setTint(MICHAEL.color);
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setCircle(18, this.sprite.width / 2 - 18, this.sprite.height / 2 - 18);
    // No collideWorldBounds — he lives in the Heaven world (a coordinate offset);
    // the terrain collider (void border) contains him. (Same as the Cherubs.)

    this.speed = MICHAEL.moveTilesPerSec * TILE_SIZE;
    this.health = new Health(MICHAEL.maxHP);
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
  get isActive(): boolean {
    return this.state === 'active';
  }
  get isAggro(): boolean {
    return this.state === 'active' && this.playerNear;
  }
  get currentPhase(): number {
    return this.phase;
  }
  get hpRatio(): number {
    return this.health.ratio;
  }

  distanceTo(x: number, y: number): number {
    return Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, x, y);
  }

  /** All game objects, so the scene can route them past the UI camera. */
  objects(): Phaser.GameObjects.GameObject[] {
    return [this.sprite];
  }

  /** TRIGGER: begin the fight (proximity or dev button). Enters Phase 1. */
  activate(): void {
    if (this.state !== 'dormant') return;
    this.state = 'active';
    this.enterPhase(1);
  }

  takeHit(amount: number): number {
    if (this.state === 'dead') return 0;
    if (this.state === 'dormant') this.activate(); // a hit wakes him
    const dealt = this.health.damage(amount);
    this.sprite.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.scene.time.delayedCall(60, () => {
      if (this.state !== 'dead') this.sprite.setTint(MICHAEL.color).setTintMode(Phaser.TintModes.MULTIPLY);
    });
    if (this.health.isDead) this.die();
    return dealt;
  }

  /**
   * @param hasLineOfSight whether he can see the player (gates ranged fire).
   */
  update(playerX: number, playerY: number, time: number, hasLineOfSight: boolean): void {
    if (this.state !== 'active') return;
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    const dist = this.distanceTo(playerX, playerY);

    // Leash: if the player is far (fled, or is in another world in the offset
    // coordinate space), hold at the sanctum — don't chase across worlds, don't
    // attack/summon, and don't keep the player out of HP regen. He stays mid-fight
    // (phase + HP preserved) and resumes when the player returns within reach.
    this.playerNear = dist <= MICHAEL.projectileRange + 80;
    if (!this.playerNear) {
      body.velocity.set(0, 0);
      return;
    }

    // PHASE STATE MACHINE: advance (never regress) as HP crosses thresholds.
    const [t1, t2] = MICHAEL.phaseThresholds;
    const ratio = this.health.ratio;
    const target = ratio > t1 ? 1 : ratio > t2 ? 2 : 3;
    if (target > this.phase) this.enterPhase(target);

    const cfg = MICHAEL.phases[this.phase - 1];
    this.sprite.setFlipX(playerX < this.sprite.x);

    if (dist <= MICHAEL.meleeRange) {
      // Up close: hold and strike hard with the flaming sword.
      body.velocity.set(0, 0);
      if (time >= this.nextMeleeAt) {
        this.nextMeleeAt = time + cfg.meleeCooldownMs;
        this.onMelee?.(cfg.meleeDamage);
        this.scene.tweens.add({ targets: this.sprite, scaleX: MICHAEL.scale * 1.15, scaleY: MICHAEL.scale * 1.15, duration: 80, yoyo: true });
      }
    } else {
      // At range: advance to the preferred standoff (never flee), and fire volleys.
      if (dist > MICHAEL.preferredRange) this.moveToward(playerX, playerY);
      else body.velocity.set(0, 0);
      if (dist <= MICHAEL.projectileRange && hasLineOfSight && time >= this.nextFireAt) {
        this.nextFireAt = time + cfg.fireCooldownMs;
        this.fire(playerX, playerY, cfg);
      }
    }

    // Ongoing summons within a phase (Phase 2/3) on the cadence timer.
    if (cfg.summonCadenceMs > 0 && time >= this.nextSummonAt) {
      this.nextSummonAt = time + cfg.summonCadenceMs;
      this.onSummon?.(cfg.summonCount);
    }
  }

  halt(): void {
    if (this.state === 'dead') return;
    (this.sprite.body as Phaser.Physics.Arcade.Body).velocity.set(0, 0);
  }

  /** RESET: back to dormant, full HP, Phase 1, at the sanctum (encounter reset). */
  reset(): void {
    this.state = 'dormant';
    this.phase = 1;
    this.health.full();
    this.nextFireAt = 0;
    this.nextMeleeAt = 0;
    this.nextSummonAt = Number.POSITIVE_INFINITY;
    this.sprite.clearTint().setTint(MICHAEL.color);
    this.sprite.setActive(true).setVisible(true).setAlpha(1).setScale(MICHAEL.scale).setAngle(0).setFlipX(false);
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    body.velocity.set(0, 0);
    this.sprite.setPosition(this.homeX, this.homeY);
  }

  destroy(): void {
    this.state = 'dead';
    this.sprite.destroy();
  }

  // --- Serialization (boss/phase state for the future save system) ----------

  toJSON(): { state: State; phase: number; hp: number } {
    return { state: this.state, phase: this.phase, hp: this.health.current };
  }

  // --- internals ------------------------------------------------------------

  private enterPhase(p: number): void {
    this.phase = p;
    const cfg = MICHAEL.phases[p - 1];
    this.onPhaseChange?.(p); // telegraph
    this.onSummon?.(cfg.summonCount); // a reinforcement wave on entry
    this.nextSummonAt = cfg.summonCadenceMs > 0 ? this.scene.time.now + cfg.summonCadenceMs : Number.POSITIVE_INFINITY;
  }

  private fire(px: number, py: number, cfg: MichaelPhaseConfig): void {
    const base = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, px, py);
    const n = Math.max(1, cfg.boltsPerVolley);
    const spread = 0.16;
    const dirs: { x: number; y: number }[] = [];
    for (let i = 0; i < n; i++) {
      const off = (i - (n - 1) / 2) * spread;
      dirs.push({ x: Math.cos(base + off), y: Math.sin(base + off) });
    }
    const origin = { x: this.sprite.x + Math.cos(base) * 22, y: this.sprite.y + Math.sin(base) * 22 };
    this.onFire?.(origin, dirs);
    this.scene.tweens.add({ targets: this.sprite, scaleX: MICHAEL.scale * 1.08, scaleY: MICHAEL.scale * 1.08, duration: 90, yoyo: true });
  }

  private moveToward(tx: number, ty: number): void {
    const a = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, tx, ty);
    (this.sprite.body as Phaser.Physics.Arcade.Body).velocity.set(Math.cos(a) * this.speed, Math.sin(a) * this.speed);
  }

  private die(): void {
    this.state = 'dead';
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.velocity.set(0, 0);
    body.enable = false;
    this.sprite.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0,
      scale: MICHAEL.scale * 1.8,
      duration: 700,
      ease: 'Quad.out',
      onComplete: () => this.sprite.setActive(false).setVisible(false),
    });
    this.onDefeat?.();
  }

  private static ensureTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists(TEXTURE_KEY)) return;
    const w = 64;
    const h = 76;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    const cx = w / 2;
    // A radiant warrior angel (drawn WHITE so the tint colors it): broad sweeping
    // wings, a robed body, a halo, and a raised FLAMING SWORD — clearly THE boss.
    g.fillStyle(0xffffff, 0.45); // great wings
    g.fillTriangle(cx - 6, 26, 2, 6, 8, 56);
    g.fillTriangle(cx + 6, 26, w - 2, 6, w - 8, 56);
    g.fillStyle(0xffffff, 0.7); // inner wings
    g.fillTriangle(cx - 5, 26, 12, 14, 14, 48);
    g.fillTriangle(cx + 5, 26, w - 12, 14, w - 14, 48);
    g.fillStyle(0xffffff, 1); // robed body
    g.fillRoundedRect(cx - 9, 22, 18, h - 28, 6);
    g.fillCircle(cx, 18, 8); // head
    g.lineStyle(2, 0xffffff, 0.95); // halo
    g.strokeCircle(cx, 11, 7);
    // Raised flaming sword (right side): blade up, a flame glow at the tip.
    g.fillStyle(0xffffff, 0.9);
    g.fillRect(w - 16, 4, 4, 30); // blade
    g.fillStyle(0xffffff, 0.5);
    g.fillCircle(w - 14, 4, 6); // flame at the tip
    g.fillStyle(0xffffff, 1);
    g.fillRect(w - 20, 32, 12, 3); // crossguard
    g.generateTexture(TEXTURE_KEY, w, h);
    g.destroy();
  }
}

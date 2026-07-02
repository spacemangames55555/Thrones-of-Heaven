import Phaser from 'phaser';
import { Health } from '../combat/Health';
import { TILE_SIZE } from '../render/tileAtlas';
import { ensureBossTexture } from './bossSprites';
import type { BossAttack, BossDef, BossHooks } from './bossTypes';

let NEXT = 1;
type State = 'dormant' | 'active' | 'dead';

/** How recent a player action must be for the 'mirror' pattern to "answer" it (ms). */
const MIRROR_WINDOW_MS = 1400;
/** Mimic-dash travel time for the 'mirror' reaction (ms). */
const MIRROR_DASH_MS = 260;
/** Minimum gap between "blocked" feedback sparks while shielded (ms). */
const BLOCK_FX_GAP_MS = 220;

/**
 * The GENERIC, data-driven boss controller. ONE class drives EVERY boss from its
 * {@link BossDef}: the phase state machine (HP-gated, 1..N phases), the
 * hold-ground movement (advance to preferred range, never flee, leash when far),
 * and the attack loadout — each attack a parameterized pattern from the library
 * ('melee' / 'volley' / special 'barrage' / 'slam' / 'charge', reactive 'mirror',
 * defensive 'shield', zone-control 'hazard', finale 'hellfire'). Effects run
 * through scene-provided {@link BossHooks} (reusing the existing projectile/melee/
 * summon systems). Adding a boss = a new BossDef, not new code.
 *
 * Behavior matches the bespoke Archangel Michael it replaces: IDLE → ENGAGE on
 * activate; per phase, melee up close XOR ranged volley at distance; summon wave
 * on phase entry + on a cadence timer. Boss/phase state is serializable.
 */
export class Boss {
  readonly id: string;
  readonly def: BossDef;
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  readonly health: Health;

  onPhaseChange?: (phase: number) => void;
  onDefeat?: () => void;

  private readonly scene: Phaser.Scene;
  private readonly hooks: BossHooks;
  /** Current move speed (px/sec) — a phase may override the def's base (e.g. Wrath P2). */
  private speed: number;
  private readonly homeX: number;
  private readonly homeY: number;
  private state: State = 'dormant';
  private phaseIndex = 0;
  /** Per-attack-slot cooldown timers (carry across phases, like Michael's). */
  private nextReadyAt: number[] = [];
  private nextSummonAt = Number.POSITIVE_INFINITY;
  private playerNear = false;
  /** A special move winding up: fires its effect at `at`. `safe` carries hellfire's safe zones. */
  private pending?: { attack: BossAttack; at: number; tx: number; ty: number; safe?: { x: number; y: number }[] };
  /** An in-progress charge dash. `speed` is the dash velocity (px/sec). */
  private charge?: { dx: number; dy: number; speed: number; until: number; damage: number; hit: boolean };
  /** SHIELD pattern: invulnerable + rooted until this time (0 = not shielded). */
  private shieldedUntil = 0;
  /** Whether the scene's shield bubble is currently shown (so we drop it once). */
  private shieldVisualOn = false;
  /** MIRROR pattern: the player's most recent reactable action, awaiting an answer. */
  private lastAction?: { type: 'ranged' | 'dash'; at: number; used: boolean };
  /** Throttle for repeated "blocked" sparks while shielded. */
  private nextBlockFxAt = 0;

  constructor(scene: Phaser.Scene, def: BossDef, worldX: number, worldY: number, hooks: BossHooks) {
    this.id = `${def.id}-${NEXT++}`;
    this.scene = scene;
    this.def = def;
    this.hooks = hooks;
    this.homeX = worldX;
    this.homeY = worldY;
    const texKey = ensureBossTexture(scene, def.sprite.key);

    this.sprite = scene.physics.add.sprite(worldX, worldY, texKey).setDepth(10);
    this.sprite.setScale(def.sprite.scale).setTint(def.sprite.tint);
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setCircle(16, this.sprite.width / 2 - 16, this.sprite.height / 2 - 16);
    // No collideWorldBounds — bosses live in offset worlds; terrain contains them.

    this.speed = def.moveTilesPerSec * TILE_SIZE;
    this.health = new Health(def.maxHP);
  }

  get x(): number {
    return this.sprite.x;
  }
  get y(): number {
    return this.sprite.y;
  }
  get name(): string {
    return this.def.name;
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
    return this.phaseIndex + 1;
  }
  get hpRatio(): number {
    return this.health.ratio;
  }
  /** True while a SHIELD window is up (damage blocked, boss rooted). */
  get isShielded(): boolean {
    return this.scene.time.now < this.shieldedUntil;
  }

  /**
   * Tell this boss the player just acted (so a 'mirror' attack can "answer" it).
   * Recorded only while active; the controller consumes at most one per cooldown.
   */
  notePlayerAction(type: 'ranged' | 'dash'): void {
    if (this.state !== 'active') return;
    this.lastAction = { type, at: this.scene.time.now, used: false };
  }

  distanceTo(x: number, y: number): number {
    return Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, x, y);
  }

  objects(): Phaser.GameObjects.GameObject[] {
    return [this.sprite];
  }

  activate(): void {
    if (this.state !== 'dormant') return;
    this.state = 'active';
    this.enterPhase(0);
  }

  takeHit(amount: number): number {
    if (this.state === 'dead') return 0;
    // SHIELD: nullify all damage during the invuln window, with clear "blocked" FX.
    if (this.isShielded) {
      const now = this.scene.time.now;
      if (now >= this.nextBlockFxAt) {
        this.nextBlockFxAt = now + BLOCK_FX_GAP_MS;
        this.hooks.blocked(this.x, this.y);
      }
      return 0;
    }
    if (this.state === 'dormant') this.activate();
    const dealt = this.health.damage(amount);
    this.sprite.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.scene.time.delayedCall(60, () => {
      if (this.state !== 'dead') this.sprite.setTint(this.def.sprite.tint).setTintMode(Phaser.TintModes.MULTIPLY);
    });
    if (this.health.isDead) this.die();
    return dealt;
  }

  update(playerX: number, playerY: number, time: number): void {
    if (this.state !== 'active') return;
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    const dist = this.distanceTo(playerX, playerY);

    // Leash — hold (and don't keep the player in combat) when far / in another world.
    this.playerNear = dist <= this.def.leashRange;
    if (!this.playerNear) {
      body.velocity.set(0, 0);
      return;
    }
    this.sprite.setFlipX(playerX < this.sprite.x);

    // In-progress charge dash overrides movement + attacks.
    if (this.charge) {
      body.velocity.set(this.charge.dx * this.charge.speed, this.charge.dy * this.charge.speed);
      if (!this.charge.hit && dist <= this.def.meleeRange + 8) {
        this.charge.hit = true;
        this.hooks.meleeHit(this.charge.damage);
      }
      if (time >= this.charge.until) {
        this.charge = undefined;
        body.velocity.set(0, 0);
      }
      return;
    }

    // SHIELD window just ended → drop the bubble (vulnerable again).
    if (this.shieldVisualOn && !this.isShielded) {
      this.shieldVisualOn = false;
      this.hooks.shield(this, false);
    }
    // SHIELD up → rooted + invulnerable (handled in takeHit); do nothing else.
    if (this.isShielded) {
      body.velocity.set(0, 0);
      return;
    }

    // Resolve a special whose telegraph has finished (rooted during wind-up).
    if (this.pending) {
      body.velocity.set(0, 0);
      if (time >= this.pending.at) {
        this.execSpecial(this.pending, time);
        this.pending = undefined;
      }
      return;
    }

    // PHASE STATE MACHINE: advance (never regress) as HP crosses thresholds.
    this.advancePhase();
    const phase = this.def.phases[this.phaseIndex];

    // Movement: hold & strike up close; advance to preferred range; never flee.
    if (dist <= this.def.meleeRange) body.velocity.set(0, 0);
    else if (dist > this.def.preferredRange) this.moveToward(playerX, playerY);
    else body.velocity.set(0, 0);

    // Attacks — each slot fires independently on its own cooldown + distance gate.
    for (let i = 0; i < phase.attacks.length; i++) {
      const atk = phase.attacks[i];
      if (time < (this.nextReadyAt[i] ?? 0)) continue;
      if (!this.canUse(atk, dist, playerX, playerY)) continue;
      this.nextReadyAt[i] = time + atk.cooldownMs;
      this.trigger(atk, playerX, playerY, time);
      if (this.pending || this.charge || this.isShielded) break; // a special/shield takes over this frame
    }

    // Summon cadence (the wave on phase entry happens in enterPhase).
    const s = phase.summon;
    if (s && s.cadenceMs > 0 && time >= this.nextSummonAt) {
      this.nextSummonAt = time + s.cadenceMs;
      this.hooks.summon(this, s.enemy, s.count, s.cap);
    }
  }

  halt(): void {
    if (this.state === 'dead') return;
    (this.sprite.body as Phaser.Physics.Arcade.Body).velocity.set(0, 0);
  }

  reset(): void {
    this.state = 'dormant';
    this.phaseIndex = 0;
    this.health.full();
    this.nextReadyAt = [];
    this.nextSummonAt = Number.POSITIVE_INFINITY;
    this.pending = undefined;
    this.charge = undefined;
    this.shieldedUntil = 0;
    this.lastAction = undefined;
    if (this.shieldVisualOn) {
      this.shieldVisualOn = false;
      this.hooks.shield(this, false);
    }
    this.playerNear = false;
    this.sprite.clearTint().setTint(this.def.sprite.tint);
    this.sprite.setActive(true).setVisible(true).setAlpha(1).setScale(this.def.sprite.scale).setAngle(0).setFlipX(false);
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    body.velocity.set(0, 0);
    this.sprite.setPosition(this.homeX, this.homeY);
  }

  destroy(): void {
    this.state = 'dead';
    if (this.shieldVisualOn) {
      this.shieldVisualOn = false;
      this.hooks.shield(this, false);
    }
    this.sprite.destroy();
  }

  toJSON(): { id: string; state: State; phase: number; hp: number } {
    return { id: this.def.id, state: this.state, phase: this.phaseIndex + 1, hp: this.health.current };
  }

  // --- internals ------------------------------------------------------------

  private advancePhase(): void {
    const ratio = this.health.ratio;
    let target = 0;
    for (let i = 0; i < this.def.phases.length; i++) {
      if (ratio <= this.def.phases[i].fromRatio) target = i;
    }
    if (target > this.phaseIndex) this.enterPhase(target);
  }

  private enterPhase(i: number): void {
    this.phaseIndex = i;
    const phase = this.def.phases[i];
    // A phase may speed the boss up/down (e.g. Wrath accelerates in Phase 2).
    this.speed = (phase.moveTilesPerSec ?? this.def.moveTilesPerSec) * TILE_SIZE;
    this.onPhaseChange?.(i + 1); // telegraph (scene)
    if (phase.summon) this.hooks.summon(this, phase.summon.enemy, phase.summon.count, phase.summon.cap); // wave on entry
    this.nextSummonAt = phase.summon && phase.summon.cadenceMs > 0 ? this.scene.time.now + phase.summon.cadenceMs : Number.POSITIVE_INFINITY;
  }

  /** Distance/LOS gate per attack kind (melee XOR ranged, like Michael). */
  private canUse(atk: BossAttack, dist: number, px: number, py: number): boolean {
    switch (atk.kind) {
      case 'melee':
        return dist <= atk.range;
      case 'volley':
        return dist > this.def.meleeRange && dist <= atk.range && this.hooks.lineOfSight(this.x, this.y, px, py);
      case 'barrage':
        return dist <= atk.range && this.hooks.lineOfSight(this.x, this.y, px, py);
      case 'slam':
        return dist <= atk.range;
      case 'charge':
        return dist > this.def.meleeRange && dist <= atk.range;
      case 'mirror': {
        // REACTIVE: only when the player recently acted, within reach. A ranged
        // answer needs line of sight; a dash-mimic just needs the player nearby.
        const a = this.lastAction;
        if (!a || a.used || this.scene.time.now - a.at > MIRROR_WINDOW_MS || dist > atk.range) return false;
        return a.type === 'ranged' ? this.hooks.lineOfSight(this.x, this.y, px, py) : true;
      }
      case 'shield':
        return !this.isShielded; // cadence-gated by the slot cooldown; never stack
      case 'hazard':
        return dist <= atk.range; // drop a lingering zone at the player when in reach
      case 'hellfire':
        return dist <= atk.range; // erupt the whole arena while the player is inside it
      case 'beam':
        return dist <= atk.range && this.hooks.lineOfSight(this.x, this.y, px, py);
    }
  }

  private trigger(atk: BossAttack, px: number, py: number, time: number): void {
    switch (atk.kind) {
      case 'melee':
        this.hooks.meleeHit(atk.damage);
        this.pop(1.15);
        break;
      case 'volley':
        this.fireVolley(atk, px, py);
        this.pop(1.08);
        break;
      case 'mirror': {
        // ANSWER the player's last action, then consume it.
        const a = this.lastAction;
        if (a) a.used = true;
        if (a?.type === 'dash') {
          // Mimic the dash: a quick reposition toward the player (modest contact dmg).
          const ang = Phaser.Math.Angle.Between(this.x, this.y, px, py);
          const speed = atk.dashSpeed ?? 700;
          this.charge = { dx: Math.cos(ang), dy: Math.sin(ang), speed, until: time + MIRROR_DASH_MS, damage: atk.damage, hit: false };
        } else {
          // Answer ranged with a return volley of bolts.
          this.fireVolley(atk, px, py);
          this.pop(1.08);
        }
        break;
      }
      case 'shield': {
        // Raise a telegraphed invulnerability window: rooted + damage blocked.
        this.shieldedUntil = time + (atk.durationMs ?? 1800);
        this.shieldVisualOn = true;
        this.hooks.shield(this, true);
        this.pop(1.12);
        break;
      }
      case 'hazard':
        // ZONE-CONTROL: drop a lingering hazard at the player (non-rooting, fire-and-forget).
        this.hooks.hazard(this, px, py, atk.radius ?? 70, atk.damage, atk.durationMs ?? 0, atk.telegraphMs ?? 600, atk.cap ?? 6);
        this.pop(1.05);
        break;
      case 'hellfire': {
        // FINALE: telegraph a full-arena eruption with a few SAFE ZONES, then detonate
        // in execSpecial(). The boss is rooted during the wind-up (a fair "go there" window).
        const tele = atk.telegraphMs ?? 1300;
        const arena = atk.range;
        const n = Math.max(1, atk.bolts ?? 3);
        const safe: { x: number; y: number }[] = [];
        for (let i = 0; i < n; i++) {
          const a = (Math.PI * 2 * i) / n + Math.random() * 0.7;
          // Off the boss but REACHABLE within the telegraph (well inside the arena).
          const r = arena * (0.2 + Math.random() * 0.4);
          safe.push({ x: this.x + Math.cos(a) * r, y: this.y + Math.sin(a) * r });
        }
        this.pending = { attack: atk, at: time + tele, tx: this.x, ty: this.y, safe };
        this.hooks.hellfireWarn(this.x, this.y, arena, safe, atk.radius ?? 60, tele);
        break;
      }
      case 'barrage':
      case 'slam':
      case 'charge':
      case 'beam': {
        // SPECIAL: telegraph first, then resolve in update(). A beam telegraphs at
        // the BOSS (the wind-up is the tell; the direction locks when it fires).
        const tele = atk.telegraphMs ?? 600;
        this.pending = { attack: atk, at: time + tele, tx: px, ty: py };
        const tr = atk.kind === 'slam' ? atk.radius ?? 120 : 40;
        const tx = atk.kind === 'charge' ? px : this.x;
        const ty = atk.kind === 'charge' ? py : this.y;
        this.hooks.telegraph(tx, ty, tr, tele);
        break;
      }
    }
  }

  private execSpecial(pending: { attack: BossAttack; tx: number; ty: number; safe?: { x: number; y: number }[] }, time: number): void {
    const atk = pending.attack;
    if (atk.kind === 'hellfire') {
      this.hooks.hellfireBurst(pending.tx, pending.ty, atk.range, pending.safe ?? [], atk.radius ?? 60, atk.damage);
      this.pop(1.25);
    } else if (atk.kind === 'barrage') {
      const n = Math.max(3, atk.bolts ?? 12);
      const dirs: { x: number; y: number }[] = [];
      for (let i = 0; i < n; i++) {
        const a = (Math.PI * 2 * i) / n; // even RING / nova
        dirs.push({ x: Math.cos(a), y: Math.sin(a) });
      }
      this.hooks.fireBolts({ x: this.x, y: this.y }, dirs, atk.damage, atk.speed ?? 280, atk.range);
      this.pop(1.2);
    } else if (atk.kind === 'slam') {
      this.hooks.slam(this.x, this.y, atk.radius ?? 120, atk.damage);
    } else if (atk.kind === 'beam') {
      // Direction locked at the wind-up's aim point; the scene runs the beam window.
      this.hooks.beam(this, pending.tx, pending.ty, atk.damage, atk.durationMs ?? 1600, 250, atk.range);
      this.pop(1.12);
    } else if (atk.kind === 'charge') {
      const a = Phaser.Math.Angle.Between(this.x, this.y, pending.tx, pending.ty);
      // Dash velocity: a per-attack speed if given, else the legacy moveSpeed × 2.4.
      const speed = atk.speed ?? this.speed * 2.4;
      const dur = Math.min(700, ((atk.range ?? 300) / speed) * 1000);
      this.charge = { dx: Math.cos(a), dy: Math.sin(a), speed, until: time + dur, damage: atk.damage, hit: false };
    }
  }

  private fireVolley(atk: BossAttack, px: number, py: number): void {
    const base = Phaser.Math.Angle.Between(this.x, this.y, px, py);
    const n = Math.max(1, atk.bolts ?? 1);
    const spread = atk.spread ?? 0.16;
    const dirs: { x: number; y: number }[] = [];
    for (let i = 0; i < n; i++) {
      const off = (i - (n - 1) / 2) * spread;
      dirs.push({ x: Math.cos(base + off), y: Math.sin(base + off) });
    }
    const origin = { x: this.x + Math.cos(base) * 22, y: this.y + Math.sin(base) * 22 };
    this.hooks.fireBolts(origin, dirs, atk.damage, atk.speed ?? 320, atk.range);
  }

  private moveToward(tx: number, ty: number): void {
    const a = Phaser.Math.Angle.Between(this.x, this.y, tx, ty);
    (this.sprite.body as Phaser.Physics.Arcade.Body).velocity.set(Math.cos(a) * this.speed, Math.sin(a) * this.speed);
  }

  private pop(mult: number): void {
    const s = this.def.sprite.scale;
    this.scene.tweens.add({ targets: this.sprite, scaleX: s * mult, scaleY: s * mult, duration: 85, yoyo: true });
  }

  private die(): void {
    this.state = 'dead';
    this.shieldedUntil = 0;
    if (this.shieldVisualOn) {
      this.shieldVisualOn = false;
      this.hooks.shield(this, false);
    }
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.velocity.set(0, 0);
    body.enable = false;
    this.sprite.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0,
      scale: this.def.sprite.scale * 1.8,
      duration: 700,
      ease: 'Quad.out',
      onComplete: () => this.sprite.setActive(false).setVisible(false),
    });
    this.onDefeat?.();
  }
}

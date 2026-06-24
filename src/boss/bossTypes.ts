/**
 * BOSS FRAMEWORK — the data-driven boss DEFINITION schema.
 *
 * A boss is mostly DATA: a {@link BossDef} read by the generic controller
 * (src/boss/Boss.ts), which drives the phase state machine and executes attacks
 * from the parameterized ATTACK PATTERN LIBRARY (the {@link BossAttack} kinds the
 * controller knows how to run). Adding a new boss = a new BossDef in
 * src/boss/bossData.ts (+ a placeholder sprite in src/boss/bossSprites.ts) — NOT
 * a new class. See bossData.ts for a documented template.
 */

/** The reusable attack patterns a boss phase can pick from + configure. */
export type BossAttackKind =
  | 'melee' // contact strike up close (reuses the melee/contact pattern)
  | 'volley' // single/fan of projectiles (reuses the projectile system)
  | 'barrage' // SPECIAL: a telegraphed ring/nova burst of projectiles
  | 'slam' // SPECIAL: a telegraphed AoE around the boss the player can dodge
  | 'charge'; // SPECIAL: a telegraphed dash at the player dealing contact damage

export interface BossAttack {
  readonly kind: BossAttackKind;
  readonly damage: number;
  /** Cooldown between uses (ms). */
  readonly cooldownMs: number;
  /** Reach: melee/ranged/charge use-distance; for 'slam' this is the trigger distance. */
  readonly range: number;
  /** volley fan count / barrage ring count. */
  readonly bolts?: number;
  /** radians between bolts in a volley fan. */
  readonly spread?: number;
  /** projectile speed (volley/barrage) or dash speed (charge). */
  readonly speed?: number;
  /** slam AoE radius (px). */
  readonly radius?: number;
  /** SPECIAL wind-up before the effect lands (ms) — the readable telegraph. */
  readonly telegraphMs?: number;
}

/** Reinforcements a phase summons (reuses existing enemies as adds). */
export interface BossSummon {
  /** Existing enemy type to summon: 'cherub' | 'cherubim' | 'demon'. */
  readonly enemy: string;
  /** Spawned per wave (on phase entry + each cadence tick). */
  readonly count: number;
  /** Concurrent cap for THIS boss's adds. */
  readonly cap: number;
  /** Ongoing summon timer within the phase (ms); 0 = only on phase entry. */
  readonly cadenceMs: number;
}

/** One phase: a HP-ratio gate + its attack loadout + optional summons. */
export interface BossPhase {
  /** This phase becomes active when hpRatio drops to <= this (descending; phase 0 = 1.0). */
  readonly fromRatio: number;
  readonly attacks: readonly BossAttack[];
  readonly summon?: BossSummon;
}

/** Which placeholder sprite (bossSprites.ts) + how it's scaled/tinted. */
export interface BossSpriteSpec {
  readonly key: string;
  readonly scale: number;
  readonly tint: number;
}

/** THE boss definition — a boss expressed (mostly) as data. */
export interface BossDef {
  readonly id: string;
  /** Boss HP-bar label / display name. */
  readonly name: string;
  /** Which world it lives in: 'earth' | 'heaven' | 'hell'. */
  readonly world: string;
  /** LOCAL world-coords placement (the scene adds the world offset). */
  readonly placement: { x: number; y: number };
  readonly sprite: BossSpriteSpec;
  readonly maxHP: number;
  readonly moveTilesPerSec: number;
  /** Holds ground + strikes within this; advances to `preferredRange`, never flees. */
  readonly meleeRange: number;
  readonly preferredRange: number;
  /** De-aggro distance: beyond this it idles (and won't chase across worlds). */
  readonly leashRange: number;
  /** Proximity that activates the boss. */
  readonly activationRange: number;
  /** 1..N phases, ordered high→low fromRatio. */
  readonly phases: readonly BossPhase[];
  readonly xpReward: number;
  readonly holyPowerDrop: number;
  /** Optional id the scene maps to an on-death hook (e.g. 'god-judgment'). */
  readonly onDefeatHook?: string;
}

/** Scene-provided effect hooks the generic controller calls (reusing existing systems). */
export interface BossHooks {
  /** Spawn projectiles (reuses the projectile system). */
  fireBolts(origin: { x: number; y: number }, dirs: { x: number; y: number }[], damage: number, speed: number, range: number): void;
  /** Deal melee/contact damage to the player. */
  meleeHit(damage: number): void;
  /** Resolve a slam: damage the player if within `radius` of (x,y) + impact FX. */
  slam(x: number, y: number, radius: number, damage: number): void;
  /** Show a readable wind-up ring (telegraph) at (x,y). */
  telegraph(x: number, y: number, radius: number, durationMs: number): void;
  /** Summon `count` of `enemy` for this boss (the scene caps at `cap` + tracks the adds). */
  summon(boss: { id: string; x: number; y: number; name: string }, enemy: string, count: number, cap: number): void;
  /** Line of sight between two world points (gates ranged fire). */
  lineOfSight(ax: number, ay: number, bx: number, by: number): boolean;
}

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
  | 'charge' // SPECIAL: a telegraphed dash at the player dealing contact damage
  | 'mirror' // REACTIVE: "answers" the player — return volley to ranged, mimic-dash to a dash
  | 'shield' // DEFENSIVE: a telegraphed invulnerability window (damage blocked), then vulnerable
  | 'hazard' // ZONE-CONTROL: drops a lingering ground hazard at the player that accumulates
  | 'hellfire' // FINALE: a telegraphed FULL-ARENA eruption — survive only inside the marked SAFE ZONES
  | 'beam'; // CHANNEL: a telegraphed enemy-cast beam (the player channel system, reversed) —
//            locks a direction at the player on wind-up end, then ticks damage along the line

export interface BossAttack {
  readonly kind: BossAttackKind;
  readonly damage: number;
  /** Cooldown between uses (ms). For 'shield' this is the cadence between windows;
   *  for 'mirror' the minimum gap between reactions (so it answers, not clones). */
  readonly cooldownMs: number;
  /** Reach: melee/ranged/charge use-distance; for 'slam' the trigger distance;
   *  for 'mirror' the max distance it will react within; for 'hellfire' the ARENA
   *  radius the eruption covers; ignored by 'shield'. */
  readonly range: number;
  /** volley fan count / barrage ring count / mirror return-volley count / hellfire SAFE-ZONE count. */
  readonly bolts?: number;
  /** radians between bolts in a volley fan. */
  readonly spread?: number;
  /** projectile speed (volley/barrage/mirror) or dash speed (charge). */
  readonly speed?: number;
  /** slam AoE radius (px) / hellfire SAFE-ZONE radius (px). */
  readonly radius?: number;
  /** SPECIAL wind-up before the effect lands (ms) — the readable telegraph. */
  readonly telegraphMs?: number;
  /** 'mirror' dash-mimic velocity (px/sec) when it answers a player dash. */
  readonly dashSpeed?: number;
  /** 'shield' invuln-window length, 'hazard' zone lifetime (ms; 0 = whole fight),
   *  or 'beam' channel length (how long the beam stays up and ticking). */
  readonly durationMs?: number;
  /** 'hazard' max concurrent zones for this boss (oldest recycled past the cap). */
  readonly cap?: number;
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
  /** Optional per-phase move-speed override (tiles/sec); falls back to the def's. */
  readonly moveTilesPerSec?: number;
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
  /** Raise/drop the boss's SHIELD bubble visual (the invuln-window telegraph). */
  shield(boss: { id: string; x: number; y: number }, active: boolean): void;
  /** Feedback that a hit was BLOCKED by an active shield (a spark at the boss). */
  blocked(x: number, y: number): void;
  /** Drop a persistent GROUND HAZARD zone at (x,y): telegraphs, then damages the
   *  player who stands in it for `lifetimeMs` (0 = whole fight). Capped per boss. */
  hazard(boss: { id: string }, x: number, y: number, radius: number, damage: number, lifetimeMs: number, telegraphMs: number, cap: number): void;
  /** HELLFIRE wind-up: mark the impending full-arena eruption + the SAFE ZONES the
   *  player must reach (clear telegraph) for `durationMs`. */
  hellfireWarn(centerX: number, centerY: number, arenaRadius: number, safe: { x: number; y: number }[], safeRadius: number, durationMs: number): void;
  /** HELLFIRE detonation: the arena erupts — damage the player UNLESS they're inside
   *  a safe zone. Clears the warning visuals. */
  hellfireBurst(centerX: number, centerY: number, arenaRadius: number, safe: { x: number; y: number }[], safeRadius: number, damage: number): void;
  /** ENEMY-CAST BEAM (the channel system, reversed): fire a beam from the boss toward
   *  (tx,ty), direction LOCKED at cast, `range` long, ticking `damage` every `tickMs`
   *  on the player while they stand in the line, for `durationMs`. The scene draws it
   *  with the channel-beam visual language and ends it early if the boss dies. */
  beam(boss: { id: string; x: number; y: number }, tx: number, ty: number, damage: number, durationMs: number, tickMs: number, range: number): void;
}

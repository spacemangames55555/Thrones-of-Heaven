/**
 * ALLIED-SUMMON DATA — the content layer for player-side summons.
 *
 * Mirror of the enemy/boss-summon system, allegiance flipped: these entities fight on
 * the PLAYER'S side and enemies treat them as targets. The behavior is data-driven so
 * future summons (e.g. attacking Necromancer undead) are added as DATA on the same
 * {@link AlliedSummon} entity + manager — see {@link SummonBehavior}.
 *
 * Build target this batch: the ICE GOLEM (a tank/blocker that draws aggro + soaks but
 * does NOT attack). Every tunable lives in {@link ICE_GOLEM_TUNING}.
 */

/**
 * How an allied summon behaves each frame:
 *  - 'tank'     — follow the player + DRAW ENEMY AGGRO + soak hits; does NOT attack. (Ice Golem)
 *  - 'attacker' — move toward the nearest enemy and deal damage on a cooldown (melee /
 *                 short-range), retargeting as enemies die or leave; leashes back to the
 *                 player when no enemy is near. Skeletons (pure attacker) and the Dark
 *                 Matter Monster (attacker that ALSO draws aggro) use this.
 *  - 'ranged'   — a BACKLINE attacker: it holds position near the player (never charges into
 *                 melee) and, when an enemy wanders inside its fire range, FIRES a pooled
 *                 PLAYER-faction projectile at it on a cooldown for LOW damage. It has
 *                 drawsAggro=false and sits OUTSIDE the aggro hierarchy, so enemies never
 *                 target it (see AlliedSummonManager.aggroSummonNear / summonAt) — it reads as
 *                 "standing behind you, flinging ranged attacks." This is the base the Act IV
 *                 "demons fighting at your back" (Quest 4.9) allies are authored on later.
 */
export type SummonBehavior = 'tank' | 'attacker' | 'ranged';

/**
 * THE 3-TIER AGGRO HIERARCHY (Monster > skeletons > player).
 *
 * Every aggro-drawing allied target carries an `aggroPriority` WEIGHT. When an enemy looks
 * for who to attack among the player's side, it picks the highest-priority drawing summon
 * whose aggro radius it is inside; if none is in range it falls through to the PLAYER. The
 * player is the implicit floor ({@link PLAYER_AGGRO_PRIORITY}). This makes the rule exact —
 * "a skeleton's aggro is never higher than the Monster's, never lower than the player's":
 *   MAGNET (Monster / Ice Golem tank) > MINION (skeleton) > PLAYER.
 * The real Summons-tree units slot on by choosing one of these tiers (or a new weight).
 */
export const AGGRO_TIER = {
  /** Front-line tank / aggro magnet: the Dark Matter Monster and the Ice Golem. */
  MAGNET: 3,
  /** Attacking minion: skeletons — above the player, below the magnet. */
  MINION: 2,
} as const;
/** The player's implicit aggro weight — any drawing summon in range outranks the player. */
export const PLAYER_AGGRO_PRIORITY = 1;

/**
 * AGGRO RE-EVALUATION CADENCE. Enemies re-pick their target on this interval (ms) rather
 * than once at spawn, so summoning a Monster/skeleton near foes already chasing the player
 * REDIRECTS them within one interval, and they fall back down the tiers when a higher ally
 * dies/leaves. Cheap: a per-enemy timer, not a per-frame scan. Lower = snappier but more work.
 */
export const AGGRO_REEVAL_INTERVAL_MS = 400;
/**
 * STICKINESS margin (px) added to a target's aggro radius when deciding whether to KEEP it.
 * An enemy only abandons its current ally-target for one of STRICTLY HIGHER priority (or when
 * the current leaves range + margin / dies) — it never flips between equal-priority targets
 * just because another crept marginally nearer. Prevents per-interval thrashing.
 */
export const AGGRO_STICKY_MARGIN = 48;

/** One allied-summon TYPE, as data. New summons = a new config (+ a texture in AlliedSummon). */
export interface AlliedSummonConfig {
  /** Stable type key (also the texture key + the save/debug label). */
  readonly key: string;
  readonly name: string;
  readonly behavior: SummonBehavior;
  /** Health pool; the summon dies at 0 HP. */
  readonly maxHP: number;
  /** Lifespan in ms — it also expires after this long (whichever comes first: HP→0 or time). */
  readonly durationMs: number;
  /** How far (px) it pulls enemy aggro: enemies within this of the summon target IT. */
  readonly aggroRadius: number;
  /** Re-approach the player when farther than this (px); holds position otherwise. */
  readonly followRange: number;
  readonly moveTilesPerSec: number;
  /** Body radius (px) for enemy-bolt collision + a sensible footprint. */
  readonly bodyRadius: number;
  readonly tint: number;
  /** True if enemies should be drawn to attack it (tanks + the Monster: yes; skeletons: yes). */
  readonly drawsAggro: boolean;
  /** Aggro priority WEIGHT (see {@link AGGRO_TIER}). Higher = enemies prefer it. Tanks/Monster
   *  use MAGNET, skeletons use MINION. Ignored when drawsAggro is false. */
  readonly aggroPriority: number;
  /** ATTACKER / RANGED: damage per hit + cadence. For 'attacker' this is a melee swing within
   *  `attackRange`; for 'ranged' it is the projectile's damage and `attackRange` is the FIRE
   *  range (how near an enemy must be before the ally shoots). Unused for pure tanks. */
  readonly attackDamage?: number;
  readonly attackCooldownMs?: number;
  readonly attackRange?: number;
  /** How far (px) an attacker will look for / chase an enemy from its current position. */
  readonly seekRange?: number;
  /** Max distance (px) from the player before an attacker abandons the hunt and returns. */
  readonly leashRange?: number;
  /** RANGED-only: the fired projectile's speed (px/sec) + collision radius (px). Reuses the
   *  existing pooled PLAYER-faction projectile pipeline; no new projectile system. */
  readonly projectileSpeed?: number;
  readonly projectileRadius?: number;
  /** RANGED-only: bolt tint. */
  readonly projectileColor?: number;
}

// ─── ICE GOLEM (the proof: a tank/blocker) — EDIT THESE TO TUNE ───────────────
export const ICE_GOLEM_TUNING = {
  /** Big HP pool so it soaks a lot before shattering. */
  maxHP: 240,
  /** Lifespan: shatters after this long if not killed first. */
  durationMs: 20000,
  /** Aggro pull radius — enemies within this of the golem target IT instead of the player. */
  aggroRadius: 220,
  /** Re-approaches the player when farther than this; otherwise holds its ground. */
  followRange: 170,
  /** Move speed (tiles/sec) — slow, lumbering. */
  moveTilesPerSec: 4.5,
  /** Collision footprint radius (enemy bolts within this of it hit it). */
  bodyRadius: 22,
  /** Skill cost: cooldown + energy when cast as the Ice Golem skill. */
  summonCooldownMs: 16000,
  summonEnergyCost: 30,
  /** Max concurrent Ice Golems (re-casting at the cap recycles the oldest). */
  maxConcurrent: 1,
  /** Icy blue tint. */
  tint: 0x8fd8ff,
} as const;

export const ICE_GOLEM_CONFIG: AlliedSummonConfig = {
  key: 'ice_golem',
  name: 'Ice Golem',
  behavior: 'tank',
  maxHP: ICE_GOLEM_TUNING.maxHP,
  durationMs: ICE_GOLEM_TUNING.durationMs,
  aggroRadius: ICE_GOLEM_TUNING.aggroRadius,
  followRange: ICE_GOLEM_TUNING.followRange,
  moveTilesPerSec: ICE_GOLEM_TUNING.moveTilesPerSec,
  bodyRadius: ICE_GOLEM_TUNING.bodyRadius,
  tint: ICE_GOLEM_TUNING.tint,
  drawsAggro: true,
  aggroPriority: AGGRO_TIER.MAGNET, // a dedicated tank/blocker → magnet tier (like the Monster)
};

/** The Ice Golem ACTIVE skill id. Lives standalone now; the Ice/Poison tree will
 *  reference this exact id when it is authored (next build) — a clean move. */
export const ICE_GOLEM_SKILL_ID = 'wiz_ice_golem';

// ─── SKELETON (the proof: an ATTACKING minion) — EDIT THESE TO TUNE ────────────
//
// A summoned skeleton that hunts the nearest enemy and hits it on a cadence; several can
// exist at once. Draws aggro at the MINION tier (above the player, below the Monster).
export const SKELETON_TUNING = {
  maxHP: 60,
  attackDamage: 14,
  attackCooldownMs: 900,
  attackRange: 48, // melee reach
  seekRange: 360, // how far it will spot/chase an enemy
  leashRange: 540, // returns to the player if it strays farther than this
  durationMs: 18000,
  aggroRadius: 120, // enemies within this of a skeleton prefer it over the player
  followRange: 150, // idle-follow distance to the player when no enemy is near
  moveTilesPerSec: 6,
  bodyRadius: 13,
  maxConcurrent: 4,
  summonCooldownMs: 3500,
  summonEnergyCost: 12,
  tint: 0xd8dde0, // bone-white
} as const;

export const SKELETON_CONFIG: AlliedSummonConfig = {
  key: 'skeleton',
  name: 'Skeleton',
  behavior: 'attacker',
  maxHP: SKELETON_TUNING.maxHP,
  durationMs: SKELETON_TUNING.durationMs,
  aggroRadius: SKELETON_TUNING.aggroRadius,
  followRange: SKELETON_TUNING.followRange,
  moveTilesPerSec: SKELETON_TUNING.moveTilesPerSec,
  bodyRadius: SKELETON_TUNING.bodyRadius,
  tint: SKELETON_TUNING.tint,
  drawsAggro: true,
  aggroPriority: AGGRO_TIER.MINION,
  attackDamage: SKELETON_TUNING.attackDamage,
  attackCooldownMs: SKELETON_TUNING.attackCooldownMs,
  attackRange: SKELETON_TUNING.attackRange,
  seekRange: SKELETON_TUNING.seekRange,
  leashRange: SKELETON_TUNING.leashRange,
};

// ─── DARK MATTER MONSTER (tanky ATTACKER + aggro magnet) — EDIT THESE TO TUNE ──
//
// A large front-line pet with a HUGE HP pool that BOTH draws enemy aggro (MAGNET tier,
// highest) AND attacks. Usually single (tunable max count).
export const DARK_MATTER_TUNING = {
  maxHP: 600,
  attackDamage: 26,
  attackCooldownMs: 1100,
  attackRange: 62,
  seekRange: 440,
  leashRange: 680,
  durationMs: 30000,
  aggroRadius: 300, // big magnet: enemies within this prefer the Monster over all else
  followRange: 190,
  moveTilesPerSec: 4.5,
  bodyRadius: 27,
  maxConcurrent: 1,
  summonCooldownMs: 22000,
  summonEnergyCost: 35,
  tint: 0x9a6cff, // dark-matter violet
} as const;

export const DARK_MATTER_CONFIG: AlliedSummonConfig = {
  key: 'dark_matter_monster',
  name: 'Dark Matter Monster',
  behavior: 'attacker',
  maxHP: DARK_MATTER_TUNING.maxHP,
  durationMs: DARK_MATTER_TUNING.durationMs,
  aggroRadius: DARK_MATTER_TUNING.aggroRadius,
  followRange: DARK_MATTER_TUNING.followRange,
  moveTilesPerSec: DARK_MATTER_TUNING.moveTilesPerSec,
  bodyRadius: DARK_MATTER_TUNING.bodyRadius,
  tint: DARK_MATTER_TUNING.tint,
  drawsAggro: true,
  aggroPriority: AGGRO_TIER.MAGNET, // highest priority: enemies prefer the Monster first
  attackDamage: DARK_MATTER_TUNING.attackDamage,
  attackCooldownMs: DARK_MATTER_TUNING.attackCooldownMs,
  attackRange: DARK_MATTER_TUNING.attackRange,
  seekRange: DARK_MATTER_TUNING.seekRange,
  leashRange: DARK_MATTER_TUNING.leashRange,
};

// ─── RANGED ALLY (the proof: a backline projectile attacker that NEVER pulls aggro) ──
//
// A player-faction ally that HOLDS position near the player (never charges into melee) and
// FIRES a pooled PLAYER-faction projectile at any enemy inside its fire range, for LOW damage,
// on a cadence. drawsAggro=false → it sits OUTSIDE the aggro hierarchy, so enemies IGNORE it as
// a target (they keep hitting per Monster>skeletons>player) and their bolts pass through it.
// This is a TEST unit; the Act IV "demons fighting at your back" (4.9) allies are authored later
// as another config of behavior:'ranged' (demon tint, several at once). Every value is tunable.
export const RANGED_ALLY_TUNING = {
  /** HP pool. It is effectively non-targetable (enemies ignore it), so this rarely matters —
   *  kept for the lifespan/bar plumbing shared with every summon. */
  maxHP: 40,
  /** Lifespan (ms) — despawns after this if not cleared first. */
  durationMs: 20000,
  /** LOW projectile damage per shot. */
  attackDamage: 8,
  /** Fire cadence (ms between shots). */
  attackCooldownMs: 900,
  /** FIRE RANGE (px): an enemy nearer than this gets shot; the ally plants + fires. */
  fireRange: 360,
  /** Fired-bolt speed (px/sec) + collision radius (px) + tint. */
  projectileSpeed: 460,
  projectileRadius: 7,
  projectileColor: 0xff6a4a, // demon-ember bolt
  /** Idle-follow distance to the player when no enemy is in range (keeps it behind you). */
  followRange: 150,
  /** Move speed (tiles/sec) — modest; it repositions to stay near the player, never charges. */
  moveTilesPerSec: 5,
  /** Collision footprint (px) — small; only used for the shared body, not for enemy targeting. */
  bodyRadius: 13,
  /** Max concurrent ranged allies (re-casting at the cap recycles the oldest). */
  maxConcurrent: 4,
  /** Demon-styled tint. */
  tint: 0xff7a5c,
} as const;

export const RANGED_ALLY_CONFIG: AlliedSummonConfig = {
  key: 'ranged_ally',
  name: 'Ranged Ally',
  behavior: 'ranged',
  maxHP: RANGED_ALLY_TUNING.maxHP,
  durationMs: RANGED_ALLY_TUNING.durationMs,
  aggroRadius: 0, // NEVER pulls aggro (drawsAggro=false makes this moot)
  followRange: RANGED_ALLY_TUNING.followRange,
  moveTilesPerSec: RANGED_ALLY_TUNING.moveTilesPerSec,
  bodyRadius: RANGED_ALLY_TUNING.bodyRadius,
  tint: RANGED_ALLY_TUNING.tint,
  drawsAggro: false, // KEY: outside the aggro hierarchy → enemies ignore it as a target
  aggroPriority: PLAYER_AGGRO_PRIORITY, // unused (drawsAggro=false); the player-floor weight
  attackDamage: RANGED_ALLY_TUNING.attackDamage,
  attackCooldownMs: RANGED_ALLY_TUNING.attackCooldownMs,
  attackRange: RANGED_ALLY_TUNING.fireRange, // for 'ranged' this is the FIRE range
  projectileSpeed: RANGED_ALLY_TUNING.projectileSpeed,
  projectileRadius: RANGED_ALLY_TUNING.projectileRadius,
  projectileColor: RANGED_ALLY_TUNING.projectileColor,
};

// ─── PET-TARGETED BUFFS (new buff target = your summons) ───────────────────────
//
// A buff that boosts the player's SUMMONS rather than the player. The manager keeps a list
// of active summon buffs and exposes the AGGREGATE multipliers; each summon reads them live
// every frame, so a buff affects CURRENTLY-summoned AND newly-summoned units for its window:
//   - damageBonus → +fraction of summon attack damage (read at swing time).
//   - drBonus     → flat damage reduction added to summons (read when they take a hit).
//   - hpBonus     → +fraction of summon MAX HP (applied/scaled when the aggregate changes and
//                   at spawn; reverted, current clamped, when the buff lapses).
// The real Summons-tree buffs (Unyielding Beast, Necrotic Presence, etc.) are authored later
// as more entries of this exact shape.
export interface SummonBuff {
  readonly id: string;
  readonly damageBonus?: number;
  readonly hpBonus?: number;
  readonly drBonus?: number;
  readonly durationMs: number;
}

export const SUMMON_BUFF_TUNING = {
  /** Example DAMAGE buff: summons hit markedly harder for a window. */
  power: { id: 'summon_power', damageBonus: 0.6, durationMs: 12000 } as SummonBuff,
  /** Example HP/DEFENSE buff: summons gain max HP + take less damage for a window. */
  bulwark: { id: 'summon_bulwark', hpBonus: 0.5, drBonus: 0.3, durationMs: 12000 } as SummonBuff,
} as const;

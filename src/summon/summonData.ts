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
  /** ATTACKER-only: a DoT the summon's hits apply to struck enemies (the Druid's Viper
   *  poison / Wolverine bleed). Routed through the scene's shared DoT system via the
   *  combat ctx, so ticks/death/XP all flow through the one path. */
  readonly attackDot?: { dmgPerTick: number; tickMs: number; durationMs: number; color: number };
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

// ─── DEMON ALLY (Act IV 4.9 "The Door Home": the demons at the player's back) ──
//
// The crusade escort: a squad of demon-styled RANGED allies spawned when 4.9 begins.
// Exactly the ranged-attacker behavior proven by RANGED_ALLY_CONFIG — they follow
// behind the player, fling low-damage pooled friendly bolts, and NEVER pull aggro
// (enemies keep targeting per Monster > skeletons > player; the player absorbs all
// aggro, which is the point of the crusade). They persist through the assault (long
// lifespan) and despawn on entering Heaven (world swaps clear all summons).
export const DEMON_ALLY_TUNING = {
  maxHP: 40, // moot (enemies ignore them) — shared summon plumbing
  /** Long lifespan so the squad lasts the whole assault; the Heaven transition
   *  (applyWorldSwap clears summons) is the real despawn. */
  durationMs: 20 * 60 * 1000,
  attackDamage: 8, // LOW per-bolt damage — they help, they don't carry
  attackCooldownMs: 1000,
  fireRange: 360,
  projectileSpeed: 460,
  projectileRadius: 7,
  projectileColor: 0xff5a3a, // demon-ember bolt
  followRange: 170, // trails BEHIND the player between fights
  moveTilesPerSec: 6.5, // keeps up with the march
  bodyRadius: 13,
  maxConcurrent: 8, // >= DEMON_ALLY_COUNT (settings) so the whole squad stands
  tint: 0xc9553a, // deep demon red
} as const;

export const DEMON_ALLY_CONFIG: AlliedSummonConfig = {
  key: 'demon_ally',
  name: 'Demon',
  behavior: 'ranged',
  maxHP: DEMON_ALLY_TUNING.maxHP,
  durationMs: DEMON_ALLY_TUNING.durationMs,
  aggroRadius: 0,
  followRange: DEMON_ALLY_TUNING.followRange,
  moveTilesPerSec: DEMON_ALLY_TUNING.moveTilesPerSec,
  bodyRadius: DEMON_ALLY_TUNING.bodyRadius,
  tint: DEMON_ALLY_TUNING.tint,
  drawsAggro: false, // KEY: enemies fully IGNORE the escort — the player holds all aggro
  aggroPriority: PLAYER_AGGRO_PRIORITY, // unused (drawsAggro=false)
  attackDamage: DEMON_ALLY_TUNING.attackDamage,
  attackCooldownMs: DEMON_ALLY_TUNING.attackCooldownMs,
  attackRange: DEMON_ALLY_TUNING.fireRange,
  projectileSpeed: DEMON_ALLY_TUNING.projectileSpeed,
  projectileRadius: DEMON_ALLY_TUNING.projectileRadius,
  projectileColor: DEMON_ALLY_TUNING.projectileColor,
};

// ─── DRUID SUMMONS (Wild Kin tree; calibrated against the Necromancer roster) ──
//
// Five wild-kin units on the SAME foundation: two DoT-applying attackers (Viper =
// poison, Wolverine = bleed — the new `attackDot` rider), the Chimpanzee PAIR
// (two tougher melee units from one cast), the SCAVENGERS (untargetable timed
// chip units on the drawsAggro=false seam), and the Polar Bear (a high-HP
// attacking aggro magnet — the Druid's "taunt" tank, Dark-Matter-Monster tier).

/** 1) VIPER — tier-1 attacker whose bites POISON (calibrated vs the Skeleton: 60HP/14dmg). */
export const VIPER_TUNING = {
  maxHP: 45,
  attackDamage: 8,
  attackDot: { dmgPerTick: 4, tickMs: 600, durationMs: 3000, color: 0x74c86a }, // poison
  attackCooldownMs: 900,
  attackRange: 44,
  seekRange: 340,
  leashRange: 540,
  durationMs: 18000,
  aggroRadius: 110,
  followRange: 150,
  moveTilesPerSec: 6.5,
  bodyRadius: 11,
  maxConcurrent: 2,
  summonCooldownMs: 6000,
  summonEnergyCost: 14,
  tint: 0x74c86a,
} as const;

export const VIPER_CONFIG: AlliedSummonConfig = {
  key: 'druid_viper',
  name: 'Viper',
  behavior: 'attacker',
  maxHP: VIPER_TUNING.maxHP,
  durationMs: VIPER_TUNING.durationMs,
  aggroRadius: VIPER_TUNING.aggroRadius,
  followRange: VIPER_TUNING.followRange,
  moveTilesPerSec: VIPER_TUNING.moveTilesPerSec,
  bodyRadius: VIPER_TUNING.bodyRadius,
  tint: VIPER_TUNING.tint,
  drawsAggro: true,
  aggroPriority: AGGRO_TIER.MINION,
  attackDamage: VIPER_TUNING.attackDamage,
  attackCooldownMs: VIPER_TUNING.attackCooldownMs,
  attackRange: VIPER_TUNING.attackRange,
  seekRange: VIPER_TUNING.seekRange,
  leashRange: VIPER_TUNING.leashRange,
  attackDot: VIPER_TUNING.attackDot,
};

/** 2) WOLVERINE — tier-2 attacker whose swipes BLEED (between Skeleton and Monster). */
export const WOLVERINE_TUNING = {
  maxHP: 90,
  attackDamage: 12,
  attackDot: { dmgPerTick: 5, tickMs: 500, durationMs: 2500, color: 0xd04a3a }, // bleed
  attackCooldownMs: 800,
  attackRange: 48,
  seekRange: 360,
  leashRange: 560,
  durationMs: 20000,
  aggroRadius: 120,
  followRange: 150,
  moveTilesPerSec: 7,
  bodyRadius: 13,
  maxConcurrent: 2,
  summonCooldownMs: 9000,
  summonEnergyCost: 18,
  tint: 0x9a7a52,
} as const;

export const WOLVERINE_CONFIG: AlliedSummonConfig = {
  key: 'druid_wolverine',
  name: 'Wolverine',
  behavior: 'attacker',
  maxHP: WOLVERINE_TUNING.maxHP,
  durationMs: WOLVERINE_TUNING.durationMs,
  aggroRadius: WOLVERINE_TUNING.aggroRadius,
  followRange: WOLVERINE_TUNING.followRange,
  moveTilesPerSec: WOLVERINE_TUNING.moveTilesPerSec,
  bodyRadius: WOLVERINE_TUNING.bodyRadius,
  tint: WOLVERINE_TUNING.tint,
  drawsAggro: true,
  aggroPriority: AGGRO_TIER.MINION,
  attackDamage: WOLVERINE_TUNING.attackDamage,
  attackCooldownMs: WOLVERINE_TUNING.attackCooldownMs,
  attackRange: WOLVERINE_TUNING.attackRange,
  seekRange: WOLVERINE_TUNING.seekRange,
  leashRange: WOLVERINE_TUNING.leashRange,
  attackDot: WOLVERINE_TUNING.attackDot,
};

/** 3) CHIMPANZEE PAIR — one cast spawns TWO tougher single-target melee units. */
export const CHIMPANZEE_TUNING = {
  maxHP: 110,
  attackDamage: 16,
  attackCooldownMs: 700,
  attackRange: 46,
  seekRange: 340,
  leashRange: 560,
  durationMs: 20000,
  aggroRadius: 120,
  followRange: 150,
  moveTilesPerSec: 6.5,
  bodyRadius: 14,
  /** The PAIR: one cast spawns this many; maxConcurrent covers both. */
  pairCount: 2,
  maxConcurrent: 2,
  summonCooldownMs: 14000,
  summonEnergyCost: 24,
  tint: 0xb08a5a,
} as const;

export const CHIMPANZEE_CONFIG: AlliedSummonConfig = {
  key: 'druid_chimpanzee',
  name: 'Chimpanzee',
  behavior: 'attacker',
  maxHP: CHIMPANZEE_TUNING.maxHP,
  durationMs: CHIMPANZEE_TUNING.durationMs,
  aggroRadius: CHIMPANZEE_TUNING.aggroRadius,
  followRange: CHIMPANZEE_TUNING.followRange,
  moveTilesPerSec: CHIMPANZEE_TUNING.moveTilesPerSec,
  bodyRadius: CHIMPANZEE_TUNING.bodyRadius,
  tint: CHIMPANZEE_TUNING.tint,
  drawsAggro: true,
  aggroPriority: AGGRO_TIER.MINION,
  attackDamage: CHIMPANZEE_TUNING.attackDamage,
  attackCooldownMs: CHIMPANZEE_TUNING.attackCooldownMs,
  attackRange: CHIMPANZEE_TUNING.attackRange,
  seekRange: CHIMPANZEE_TUNING.seekRange,
  leashRange: CHIMPANZEE_TUNING.leashRange,
};

/** 4) SCAVENGERS — UNTARGETABLE timed chip units (drawsAggro=false seam, like the
 *  ranged allies but melee): enemies fully ignore them; they expire after 30s. */
export const SCAVENGER_TUNING = {
  maxHP: 30, // moot (enemies ignore them) — shared summon plumbing
  attackDamage: 5, // small chip damage
  attackCooldownMs: 700,
  attackRange: 52,
  seekRange: 320,
  leashRange: 560,
  /** The 30s auto-expiry from the spec (passed as the duration override). */
  durationMs: 30000,
  /** One cast releases this many scavengers. */
  count: 3,
  maxConcurrent: 3,
  aggroRadius: 0, // never pulls aggro (drawsAggro=false makes this moot)
  followRange: 150,
  moveTilesPerSec: 7,
  bodyRadius: 11,
  summonCooldownMs: 18000,
  summonEnergyCost: 22,
  tint: 0x9a8a6a,
} as const;

export const SCAVENGER_CONFIG: AlliedSummonConfig = {
  key: 'druid_scavenger',
  name: 'Scavenger',
  behavior: 'attacker',
  maxHP: SCAVENGER_TUNING.maxHP,
  durationMs: SCAVENGER_TUNING.durationMs,
  aggroRadius: SCAVENGER_TUNING.aggroRadius,
  followRange: SCAVENGER_TUNING.followRange,
  moveTilesPerSec: SCAVENGER_TUNING.moveTilesPerSec,
  bodyRadius: SCAVENGER_TUNING.bodyRadius,
  tint: SCAVENGER_TUNING.tint,
  drawsAggro: false, // KEY: outside the aggro hierarchy → enemies ignore them entirely
  aggroPriority: PLAYER_AGGRO_PRIORITY, // unused (drawsAggro=false)
  attackDamage: SCAVENGER_TUNING.attackDamage,
  attackCooldownMs: SCAVENGER_TUNING.attackCooldownMs,
  attackRange: SCAVENGER_TUNING.attackRange,
  seekRange: SCAVENGER_TUNING.seekRange,
  leashRange: SCAVENGER_TUNING.leashRange,
};

/** 5) POLAR BEAR — the Druid's taunt-tank: a high-HP attacking AGGRO MAGNET
 *  (Dark Matter Monster tier, calibrated slightly below its 600 HP). */
export const POLAR_BEAR_TUNING = {
  maxHP: 450,
  attackDamage: 18,
  attackCooldownMs: 1200,
  attackRange: 60,
  seekRange: 420,
  leashRange: 660,
  durationMs: 25000,
  aggroRadius: 280, // the "taunt": a big magnet pull, like the Monster's 300
  followRange: 180,
  moveTilesPerSec: 5,
  bodyRadius: 24,
  maxConcurrent: 1,
  summonCooldownMs: 20000,
  summonEnergyCost: 30,
  tint: 0xe8f0f6,
} as const;

export const POLAR_BEAR_CONFIG: AlliedSummonConfig = {
  key: 'druid_polar_bear',
  name: 'Polar Bear',
  behavior: 'attacker',
  maxHP: POLAR_BEAR_TUNING.maxHP,
  durationMs: POLAR_BEAR_TUNING.durationMs,
  aggroRadius: POLAR_BEAR_TUNING.aggroRadius,
  followRange: POLAR_BEAR_TUNING.followRange,
  moveTilesPerSec: POLAR_BEAR_TUNING.moveTilesPerSec,
  bodyRadius: POLAR_BEAR_TUNING.bodyRadius,
  tint: POLAR_BEAR_TUNING.tint,
  drawsAggro: true,
  aggroPriority: AGGRO_TIER.MAGNET, // enemies prefer the bear — the Druid's taunt
  attackDamage: POLAR_BEAR_TUNING.attackDamage,
  attackCooldownMs: POLAR_BEAR_TUNING.attackCooldownMs,
  attackRange: POLAR_BEAR_TUNING.attackRange,
  seekRange: POLAR_BEAR_TUNING.seekRange,
  leashRange: POLAR_BEAR_TUNING.leashRange,
};

// ─── WITCH DOCTOR FRAMEWORK UNITS (the doll + the decoy; class-agnostic data) ──
//
// VOODOO DOLL — the bind's physical anchor, on the summon foundation: a small
// stationary-ish "tank" that trails the player, DRAWS light aggro (MINION tier —
// enemies near it will strike it, which is what arms the REFLECT upgrade), and
// lives exactly as long as the bind. It attacks nothing; the player's own melee
// strikes landing on it are what MIRROR to the bound target (MainScene wiring).
export const VOODOO_DOLL_TUNING = {
  /** The doll's HP: killable — the bind ends early if the doll is destroyed. */
  maxHP: 90,
  /** Bind duration (also the doll's lifespan; re-cast re-binds fresh). */
  bindDurationMs: 12000,
  /** How far the bind can reach when cast (nearest enemy within this). */
  castRange: 340,
  /** The cast's INITIAL spirit damage to the newly bound target. */
  castDamage: 18,
  /** MIRROR: fraction of a doll-striking melee hit sent to the bound target. */
  mirrorPct: 0.6,
  /** REFLECT upgrade (armed only while Soulbound Hex is owned): damage returned
   *  to an enemy whose contact hit lands on the doll. */
  reflectDamage: 12,
  /** STITCH upgrade (Shadow Stitch): mirrored damage also splashes to enemies
   *  within this radius of the bound target, at this fraction of the mirror. */
  stitchRadius: 130,
  stitchPct: 0.5,
  /** SPIRIT ASSAULT upgrade: periodic ticking damage to the bound target that
   *  BYPASSES defenses (direct health hit), while bound. */
  assault: { damage: 6, tickMs: 1000 },
  aggroRadius: 130, // light pull: nearby enemies will strike the doll (REFLECT's food)
  followRange: 170,
  moveTilesPerSec: 4.5,
  bodyRadius: 14,
  summonCooldownMs: 10000,
  summonEnergyCost: 18,
  tint: 0xc9a05a, // burlap-and-thread
} as const;

export const VOODOO_DOLL_CONFIG: AlliedSummonConfig = {
  key: 'wd_doll',
  name: 'Voodoo Doll',
  behavior: 'tank',
  maxHP: VOODOO_DOLL_TUNING.maxHP,
  durationMs: VOODOO_DOLL_TUNING.bindDurationMs,
  aggroRadius: VOODOO_DOLL_TUNING.aggroRadius,
  followRange: VOODOO_DOLL_TUNING.followRange,
  moveTilesPerSec: VOODOO_DOLL_TUNING.moveTilesPerSec,
  bodyRadius: VOODOO_DOLL_TUNING.bodyRadius,
  tint: VOODOO_DOLL_TUNING.tint,
  drawsAggro: true,
  aggroPriority: AGGRO_TIER.MINION, // light pull — below any true tank/decoy
};

// SPIRIT DECOY — a spectral duplicate of the player: MAGNET-tier aggro (the Polar
// Bear/Monster tier), attacks NOTHING (pure 'tank' behavior), has HP, expires.
export const SPIRIT_DECOY_TUNING = {
  maxHP: 160,
  durationMs: 10000,
  aggroRadius: 260, // the magnet: enemies within this prefer the decoy
  followRange: 180,
  moveTilesPerSec: 5.5,
  bodyRadius: 16,
  maxConcurrent: 1,
  summonCooldownMs: 14000,
  summonEnergyCost: 20,
  tint: 0x8fe8d0, // pale spirit-teal
} as const;

export const SPIRIT_DECOY_CONFIG: AlliedSummonConfig = {
  key: 'wd_decoy',
  name: 'Spirit Decoy',
  behavior: 'tank', // follows + soaks; never attacks
  maxHP: SPIRIT_DECOY_TUNING.maxHP,
  durationMs: SPIRIT_DECOY_TUNING.durationMs,
  aggroRadius: SPIRIT_DECOY_TUNING.aggroRadius,
  followRange: SPIRIT_DECOY_TUNING.followRange,
  moveTilesPerSec: SPIRIT_DECOY_TUNING.moveTilesPerSec,
  bodyRadius: SPIRIT_DECOY_TUNING.bodyRadius,
  tint: SPIRIT_DECOY_TUNING.tint,
  drawsAggro: true,
  aggroPriority: AGGRO_TIER.MAGNET, // the Polar Bear's magnet tier — enemies prefer it
};

// MINI-DECOY (Spectral Echoes): tiny short-lived illusions on the decoy seam —
// they pull light aggro (MINION tier, below any true tank) and simply stand there.
export const MINI_DECOY_TUNING = {
  maxHP: 30,
  durationMs: 4000,
  aggroRadius: 140,
  followRange: 150,
  moveTilesPerSec: 5,
  bodyRadius: 11,
  count: 3,
  tint: 0x8fe8d0,
} as const;

export const MINI_DECOY_CONFIG: AlliedSummonConfig = {
  key: 'wd_mini_decoy',
  name: 'Spirit Echo',
  behavior: 'tank',
  maxHP: MINI_DECOY_TUNING.maxHP,
  durationMs: MINI_DECOY_TUNING.durationMs,
  aggroRadius: MINI_DECOY_TUNING.aggroRadius,
  followRange: MINI_DECOY_TUNING.followRange,
  moveTilesPerSec: MINI_DECOY_TUNING.moveTilesPerSec,
  bodyRadius: MINI_DECOY_TUNING.bodyRadius,
  tint: MINI_DECOY_TUNING.tint,
  drawsAggro: true,
  aggroPriority: AGGRO_TIER.MINION,
};

// CURSED EFFIGY (Witch Doctor): a PLANTED magnet — the decoy machinery rooted in
// place (moveTilesPerSec 0): it never walks, it just soaks what was meant for others.
export const EFFIGY_TUNING = {
  maxHP: 200,
  durationMs: 12000,
  aggroRadius: 240,
  bodyRadius: 16,
  maxConcurrent: 1,
  tint: 0xb08a5a,
} as const;

export const EFFIGY_CONFIG: AlliedSummonConfig = {
  key: 'wd_effigy',
  name: 'Cursed Effigy',
  behavior: 'tank',
  maxHP: EFFIGY_TUNING.maxHP,
  durationMs: EFFIGY_TUNING.durationMs,
  aggroRadius: EFFIGY_TUNING.aggroRadius,
  followRange: 1e9, // never re-approaches: planted where cast
  moveTilesPerSec: 0, // rooted — the "planted" half of the decoy seam
  bodyRadius: EFFIGY_TUNING.bodyRadius,
  tint: EFFIGY_TUNING.tint,
  drawsAggro: true,
  aggroPriority: AGGRO_TIER.MAGNET,
};

// SOUL REVENANT (Witch Doctor ultimate): a mighty attacking guard — calibrated
// between the Polar Bear (450 HP / 18 dmg) and the Dark Matter Monster (600 / 26).
export const REVENANT_TUNING = {
  maxHP: 520,
  attackDamage: 22,
  attackCooldownMs: 1100,
  attackRange: 60,
  seekRange: 430,
  leashRange: 660,
  durationMs: 25000,
  aggroRadius: 290, // the guard: a Monster-class magnet pull
  followRange: 180,
  moveTilesPerSec: 5,
  bodyRadius: 25,
  maxConcurrent: 1,
  tint: 0x6ad0b8,
} as const;

export const REVENANT_CONFIG: AlliedSummonConfig = {
  key: 'wd_revenant',
  name: 'Soul Revenant',
  behavior: 'attacker',
  maxHP: REVENANT_TUNING.maxHP,
  durationMs: REVENANT_TUNING.durationMs,
  aggroRadius: REVENANT_TUNING.aggroRadius,
  followRange: REVENANT_TUNING.followRange,
  moveTilesPerSec: REVENANT_TUNING.moveTilesPerSec,
  bodyRadius: REVENANT_TUNING.bodyRadius,
  tint: REVENANT_TUNING.tint,
  drawsAggro: true,
  aggroPriority: AGGRO_TIER.MAGNET, // it guards: enemies prefer the revenant
  attackDamage: REVENANT_TUNING.attackDamage,
  attackCooldownMs: REVENANT_TUNING.attackCooldownMs,
  attackRange: REVENANT_TUNING.attackRange,
  seekRange: REVENANT_TUNING.seekRange,
  leashRange: REVENANT_TUNING.leashRange,
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

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
 *  - 'attacker' — RESERVED for a later batch (Necromancer minions): move to enemies + deal
 *                 damage. Not implemented yet; the field exists so an attacker summon is
 *                 purely a data addition (config below carries the attack numbers).
 */
export type SummonBehavior = 'tank' | 'attacker';

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
  /** Re-approach the player when farther than this (px); holds position otherwise (tank). */
  readonly followRange: number;
  readonly moveTilesPerSec: number;
  /** Body radius (px) for enemy-bolt collision + a sensible footprint. */
  readonly bodyRadius: number;
  readonly tint: number;
  /** True if enemies should be drawn to attack it (tanks: yes). */
  readonly drawsAggro: boolean;
  /** ATTACKER-only (reserved, unused for tanks): contact damage + cadence. */
  readonly attackDamage?: number;
  readonly attackCooldownMs?: number;
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
};

/** The Ice Golem ACTIVE skill id. Lives standalone now; the Ice/Poison tree will
 *  reference this exact id when it is authored (next build) — a clean move. */
export const ICE_GOLEM_SKILL_ID = 'wiz_ice_golem';

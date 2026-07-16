import type { SkillDef } from './skillData';

/**
 * SUNDIAN — TIDECALLER TREE (10 skills, linear; RANGED WATER).
 *
 * The tide half: WATER LASH (the drenching opener), the dragging UNDERTOW,
 * RIPTIDE on THE TIDE primitive (framework #1 — pull, hold, reverse, blast),
 * the DRENCH deepener (framework #2's ledger), DEPTH CRUSH (the drench
 * detonation), the churning WHIRLPOOL, EBB AND FLOW (consumed drench returns
 * Tide), and the TSUNAMI. "Tide" is prose over standard energy. Conventions
 * as always: EVERY tunable in {@link SUN_TIDE_TUNING} with calibration
 * anchors; placeholder prose. Tree id 'sun_tide'. Tier-0 is a DAMAGING
 * ACTIVE (no-kit rule).
 */

export const SUN_TIDE_TREE = 'sun_tide';

// Ids the scene keys behavior off (imported there — keep in sync): DRENCH
// deepens every drench application at recompute; EBB AND FLOW arms the
// Tide-refund on consumed stacks.
export const DEEPER_DRENCH_ID = 'sun_tc_drench';
export const EBB_FLOW_ID = 'sun_tc_ebb';

// ─── TUNING (all starting values; tune freely in playtest) ────────────────────
export const SUN_TIDE_TUNING = {
  /** 1) WATER LASH — ENTRY whipping jet: auto-targets the nearest foe in range
   *  (vs First Cut-class opener damage) and leaves ONE drench stack. */
  lash: { range: 260, damage: 19, drenchStacks: 1, cooldownMs: 2200, energyCost: 8 },
  /** DRENCH LEDGER defaults (every Sundian drench application): cap + the slow
   *  each stack applies (vs the wolf-pack slows; floor-clamped in the scene). */
  drench: { maxStacks: 6, slowPerStack: 0.08, slowMs: 5000 },
  /** 2) UNDERTOW — the dragging zone: one inward drag on cast, then a slowing
   *  zone that ticks (the hazard machinery; vs Black Ice-class fields). */
  undertow: { placeAhead: 140, radius: 120, pullDistance: 90, minGap: 30, tickDamage: 4, tickMs: 500, durationMs: 4000, slowFactor: 0.6, cooldownMs: 11000, energyCost: 18 },
  /** 3) RIPTIDE — framework #1 direct: the two-phase tide at a point ahead. */
  riptide: { placeAhead: 150, pullRadius: 240, pullDistance: 140, minGap: 36, pullDamage: 12, phaseGapMs: 600, blastRadius: 200, blastDamage: 16, blastKnockback: 150, cooldownMs: 13000, energyCost: 22 },
  /** 4) DRENCH (the passive deepener): +1 stack per application and each stack
   *  slows harder. */
  deeper: { stacksBonus: 1, slowPerStackBonus: 0.03 },
  /** 5) TIDAL SPOUT — a geyser at range: burst + knockback (vs Gust-class). */
  spout: { placeAhead: 280, radius: 95, damage: 22, knockback: 130, cooldownMs: 7000, energyCost: 14 },
  /** 6) MIST VEIL — sea-mist evasion (block-mapped, the Flowing Movement
   *  precedent), timed. */
  mist: { blockChance: 0.3, blockReduction: 0.7, durationMs: 6000, cooldownMs: 16000, energyCost: 16 },
  /** 7) DEPTH CRUSH — framework #2's detonation: consume EVERY drench stack
   *  around the target for damage per stack (vs Shatter's 8/stack). */
  crush: { range: 320, radius: 150, damagePerStack: 9, cooldownMs: 9000, energyCost: 16 },
  /** 8) WHIRLPOOL — the churning pit: one inward drag, then a damaging zone
   *  (heavier ticks than Undertow, lighter slow). */
  whirlpool: { placeAhead: 160, radius: 130, pullDistance: 110, minGap: 30, tickDamage: 8, tickMs: 500, durationMs: 4500, slowFactor: 0.75, cooldownMs: 14000, energyCost: 24 },
  /** 9) EBB AND FLOW — consumed drench returns Tide (energy per stack). */
  ebb: { energyPerStack: 3 },
  /** 10) TSUNAMI — ultimate: the great wave — a WIDE crushing push ahead that
   *  DRENCHES everything it touches (cone + knockback + stacks). */
  tsunami: { range: 320, coneHalfAngleDeg: 55, damage: 40, knockback: 170, drenchStacks: 2, cooldownMs: 60000, energyCost: 45 },
} as const;

const T = SUN_TIDE_TUNING;

// ─── THE 10 TIDECALLER SKILLS (linear; tree 'sun_tide') ───────────────────────
// >>> EDIT NAMES / DESCRIPTIONS HERE (placeholder prose). <<<
export const SUN_TIDE_SKILLS: SkillDef[] = [
  {
    id: 'sun_tc_lash',
    tree: SUN_TIDE_TREE,
    name: 'Water Lash',
    description: 'Activate: a whipping jet of seawater — it cuts, and it DRENCHES. Your reliable opener; everything in this tree feeds on the wet it leaves.',
    cost: 1,
    tier: 0,
    effect: { kind: 'active', action: 'sun_lash', cooldownMs: T.lash.cooldownMs, energyCost: T.lash.energyCost },
  },
  {
    id: 'sun_tc_undertow',
    tree: SUN_TIDE_TREE,
    name: 'Undertow',
    description: `Activate: the water underfoot turns and DRAGS — enemies are pulled toward the churn and wade at ${Math.round(T.undertow.slowFactor * 100)}% speed inside it.`,
    cost: 1,
    prereq: 'sun_tc_lash',
    tier: 1,
    effect: { kind: 'active', action: 'sun_undertow', cooldownMs: T.undertow.cooldownMs, energyCost: T.undertow.energyCost },
  },
  {
    id: 'sun_tc_riptide',
    tree: SUN_TIDE_TREE,
    name: 'Riptide',
    description: 'Activate: THE TIDE itself — first it gathers them, dragging the pack into one struggling knot; then it turns, and throws them all apart. Both turns of the water wound.',
    cost: 1,
    prereq: 'sun_tc_undertow',
    tier: 2,
    effect: { kind: 'active', action: 'sun_riptide', cooldownMs: T.riptide.cooldownMs, energyCost: T.riptide.energyCost },
  },
  {
    id: DEEPER_DRENCH_ID,
    tree: SUN_TIDE_TREE,
    name: 'Drench',
    description: `Passive: your water soaks DEEPER — every drenching applies one more stack, and each stack slows ${Math.round(T.deeper.slowPerStackBonus * 100)}% harder.`,
    cost: 1,
    prereq: 'sun_tc_riptide',
    tier: 3,
    effect: { kind: 'passive', stats: {} },
  },
  {
    id: 'sun_tc_spout',
    tree: SUN_TIDE_TREE,
    name: 'Tidal Spout',
    description: 'Activate: the ground opens and the sea SPEAKS — a geyser erupts at range, bursting and hurling whatever stood over it.',
    cost: 1,
    prereq: DEEPER_DRENCH_ID,
    tier: 4,
    effect: {
      kind: 'active',
      action: 'sun_spout',
      cooldownMs: T.spout.cooldownMs,
      energyCost: T.spout.energyCost,
      compose: [{ p: 'strike', at: 'ahead', range: T.spout.placeAhead, radius: T.spout.radius, damage: T.spout.damage, knockback: T.spout.knockback, tint: 0x4ab8e8 }],
    },
  },
  {
    id: 'sun_tc_mist',
    tree: SUN_TIDE_TREE,
    name: 'Mist Veil',
    description: `Activate: wrap yourself in sea-mist for ${(T.mist.durationMs / 1000).toFixed(0)}s — blows slide off what they cannot quite find.`,
    cost: 1,
    prereq: 'sun_tc_spout',
    tier: 5,
    effect: { kind: 'buff', cooldownMs: T.mist.cooldownMs, durationMs: T.mist.durationMs, energyCost: T.mist.energyCost, tint: 0xa8d8e8, stats: { blockChance: T.mist.blockChance, blockReduction: T.mist.blockReduction } },
  },
  {
    id: 'sun_tc_crush',
    tree: SUN_TIDE_TREE,
    name: 'Depth Crush',
    description: `Activate: the pressure of the deep, all at once — every DRENCH stack around the target detonates for ${T.crush.damagePerStack} apiece. The wetter they are, the worse it ends.`,
    cost: 1,
    prereq: 'sun_tc_mist',
    tier: 6,
    effect: { kind: 'active', action: 'sun_crush', cooldownMs: T.crush.cooldownMs, energyCost: T.crush.energyCost },
  },
  {
    id: 'sun_tc_whirlpool',
    tree: SUN_TIDE_TREE,
    name: 'Whirlpool',
    description: `Activate: a churning pit ahead — it drags them in and grinds for ${(T.whirlpool.durationMs / 1000).toFixed(1)}s.`,
    cost: 1,
    prereq: 'sun_tc_crush',
    tier: 7,
    effect: { kind: 'active', action: 'sun_whirlpool', cooldownMs: T.whirlpool.cooldownMs, energyCost: T.whirlpool.energyCost },
  },
  {
    id: EBB_FLOW_ID,
    tree: SUN_TIDE_TREE,
    name: 'Ebb and Flow',
    description: `Passive: what the sea takes, the sea returns — every drench stack you consume gives ${T.ebb.energyPerStack} Tide back.`,
    cost: 1,
    prereq: 'sun_tc_whirlpool',
    tier: 8,
    effect: { kind: 'passive', stats: {} },
  },
  {
    id: 'sun_tc_tsunami',
    tree: SUN_TIDE_TREE,
    name: 'Tsunami',
    description: 'Ultimate — Activate: the great wave. A wall of sea crushes everything ahead, throws it back, and leaves it all DRENCHED for whatever you do next. Long cooldown.',
    cost: 1,
    prereq: EBB_FLOW_ID,
    tier: 9,
    effect: { kind: 'active', action: 'sun_tsunami', cooldownMs: T.tsunami.cooldownMs, energyCost: T.tsunami.energyCost },
  },
];

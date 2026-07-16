import type { SkillDef } from './skillData';

/**
 * SUNDIAN — DROWNED BLADE TREE (10 skills, linear; MELEE WATER).
 *
 * The trident half: the drenching TRIDENT STRIKE, WATERLOGGED EDGE (the
 * strike-drench hook — every melee hit soaks), CRASHING BLOW (conditional
 * damage against the drenched), the slick-leaving TIDE STEP (the wormhole
 * compose pattern), the CORAL GUARD shell, control cuts, and WRATH OF THE
 * DEEP (the timed form: faster strikes that drench deeper and SPLASH).
 * "Tide" is prose over standard energy. Conventions as always: EVERY tunable
 * in {@link SUN_BLADE_TUNING} with calibration anchors; placeholder prose.
 * Tree id 'sun_blade'. Tier-0 is a DAMAGING ACTIVE (no-kit rule).
 */

export const SUN_BLADE_TREE = 'sun_blade';

// Ids the scene keys behavior off (imported there — keep in sync):
// WATERLOGGED EDGE arms the strike-drench hook at recompute; WRATH OF THE
// DEEP (the form) deepens it and arms the per-hit splash while it holds.
export const WATERLOGGED_ID = 'sun_db_edge';
export const WRATH_DEEP_ID = 'sun_db_wrath';

// ─── TUNING (all starting values; tune freely in playtest) ────────────────────
export const SUN_BLADE_TUNING = {
  /** 1) TRIDENT STRIKE — ENTRY thrust + one drench stack (vs First Cut 20/2s). */
  trident: { range: 78, damage: 19, drenchStacks: 1, cooldownMs: 2000, energyCost: 8 },
  /** 2) WATERLOGGED EDGE — the strike-drench hook: EVERY melee strike leaves
   *  a stack (the Razor's Edge seam, water for blood). */
  edge: { stacks: 1 },
  /** 3) CRASHING BLOW — conditional: the DRENCHED take ×mult (vs Headtaker's
   *  gated ×2; here the gate is your own soak). */
  crashing: { range: 82, damage: 16, drenchedMult: 1.6, cooldownMs: 6000, energyCost: 13 },
  /** 4) TIDE STEP — dash-through leaving a slowing SLICK at the origin (the
   *  Wormhole compose pattern: hazard at self, then the teleport). */
  tidestep: { distance: 200, slickRadius: 90, slickTickDamage: 2, slickTickMs: 500, slickDurationMs: 3500, slickSlowFactor: 0.6, cooldownMs: 8000, energyCost: 14 },
  /** 5) CORAL GUARD — a quick absorbing shell (vs Mana Shield-class pools). */
  coral: { amount: 40, durationMs: 6000, cooldownMs: 14000, energyCost: 16 },
  /** 6) BREAKER SWEEP — the wide throwing arc (vs Crescent Sweep 100/70°). */
  breaker: { range: 100, coneHalfAngleDeg: 60, damage: 20, knockback: 150, cooldownMs: 7000, energyCost: 15 },
  /** 7) ABYSSAL WEIGHT — damage + a HEAVY slow (the deep pressing down). */
  weight: { range: 80, damage: 18, slowFactor: 0.35, slowMs: 3000, cooldownMs: 8000, energyCost: 15 },
  /** 8) TWIN CURRENTS — two flowing cuts (the multi-pulse strike). */
  twin: { range: 74, damageEach: 11, pulses: 2, pulseMs: 150, cooldownMs: 4800, energyCost: 12 },
  /** 9) DROWNING GRASP — root + life drain (the drain machinery + the root). */
  grasp: { range: 200, damage: 16, healPct: 0.5, rootMs: 1600, cooldownMs: 10000, energyCost: 18 },
  /** 10) WRATH OF THE DEEP — ultimate: the timed form — faster, harder, every
   *  strike drenches DEEPER and SPLASHES spray around each hit. */
  wrath: { attackSpeedMult: 0.25, damageMult: 0.1, durationMs: 10000, formDrenchStacks: 2, splashRadius: 70, splashDamage: 6, cooldownMs: 60000, energyCost: 45, tint: 0x35e0c8 },
} as const;

const T = SUN_BLADE_TUNING;

// ─── THE 10 DROWNED BLADE SKILLS (linear; tree 'sun_blade') ───────────────────
// >>> EDIT NAMES / DESCRIPTIONS HERE (placeholder prose). <<<
export const SUN_BLADE_SKILLS: SkillDef[] = [
  {
    id: 'sun_db_trident',
    tree: SUN_BLADE_TREE,
    name: 'Trident Strike',
    description: 'Activate: the old fisher-king thrust — it wounds, and it DRENCHES. Your reliable opener; the whole blade drips from here.',
    cost: 1,
    tier: 0,
    effect: { kind: 'active', action: 'sun_trident', cooldownMs: T.trident.cooldownMs, energyCost: T.trident.energyCost },
  },
  {
    id: WATERLOGGED_ID,
    tree: SUN_BLADE_TREE,
    name: 'Waterlogged Edge',
    description: 'Passive: the blade never dries — EVERY melee strike you land leaves a drench stack behind it.',
    cost: 1,
    prereq: 'sun_db_trident',
    tier: 1,
    effect: { kind: 'passive', stats: {} },
  },
  {
    id: 'sun_db_crashing',
    tree: SUN_BLADE_TREE,
    name: 'Crashing Blow',
    description: `Activate: bring it down where the water already sits — DRENCHED enemies take ×${T.crashing.drenchedMult}. The dry take the ordinary blow.`,
    cost: 1,
    prereq: WATERLOGGED_ID,
    tier: 2,
    effect: { kind: 'active', action: 'sun_crashing', cooldownMs: T.crashing.cooldownMs, energyCost: T.crashing.energyCost },
  },
  {
    id: 'sun_db_tidestep',
    tree: SUN_BLADE_TREE,
    name: 'Tide Step',
    description: 'Activate: move the way water moves — a flowing dash through, leaving a slowing SLICK where you stood.',
    cost: 1,
    prereq: 'sun_db_crashing',
    tier: 3,
    effect: {
      kind: 'active',
      action: 'sun_tidestep',
      cooldownMs: T.tidestep.cooldownMs,
      energyCost: T.tidestep.energyCost,
      compose: [
        { p: 'hazard', at: 'self', radius: T.tidestep.slickRadius, tickDamage: T.tidestep.slickTickDamage, tickMs: T.tidestep.slickTickMs, durationMs: T.tidestep.slickDurationMs, slowFactor: T.tidestep.slickSlowFactor, fill: 0x1a4a6a, stroke: 0x4ab8e8 },
        { p: 'teleport', distance: T.tidestep.distance },
      ],
    },
  },
  {
    id: 'sun_db_coral',
    tree: SUN_BLADE_TREE,
    name: 'Coral Guard',
    description: `Activate: a quick shell of living coral — absorb the next ${T.coral.amount} damage for ${(T.coral.durationMs / 1000).toFixed(0)}s.`,
    cost: 1,
    prereq: 'sun_db_tidestep',
    tier: 4,
    effect: {
      kind: 'active',
      action: 'sun_coralguard',
      cooldownMs: T.coral.cooldownMs,
      energyCost: T.coral.energyCost,
      compose: [{ p: 'shield', amount: T.coral.amount, durationMs: T.coral.durationMs, banner: 'The coral closes over you' }],
    },
  },
  {
    id: 'sun_db_breaker',
    tree: SUN_BLADE_TREE,
    name: 'Breaker Sweep',
    description: 'Activate: swing like the surf hits — a wide arc that THROWS everything in front of you back.',
    cost: 1,
    prereq: 'sun_db_coral',
    tier: 5,
    effect: {
      kind: 'active',
      action: 'sun_breaker',
      cooldownMs: T.breaker.cooldownMs,
      energyCost: T.breaker.energyCost,
      compose: [{ p: 'cone', range: T.breaker.range, halfAngleDeg: T.breaker.coneHalfAngleDeg, damage: T.breaker.damage, knockback: T.breaker.knockback, tint: 0x4ab8e8 }],
    },
  },
  {
    id: 'sun_db_weight',
    tree: SUN_BLADE_TREE,
    name: 'Abyssal Weight',
    description: `Activate: the pressure of the trench rides the blow — the struck crawl at ${Math.round(T.weight.slowFactor * 100)}% speed for ${(T.weight.slowMs / 1000).toFixed(0)}s.`,
    cost: 1,
    prereq: 'sun_db_breaker',
    tier: 6,
    effect: {
      kind: 'active',
      action: 'sun_weight',
      cooldownMs: T.weight.cooldownMs,
      energyCost: T.weight.energyCost,
      compose: [{ p: 'strike', at: 'front', range: T.weight.range, damage: T.weight.damage, slowFactor: T.weight.slowFactor, slowMs: T.weight.slowMs, tint: 0x2a6a9a }],
    },
  },
  {
    id: 'sun_db_twin',
    tree: SUN_BLADE_TREE,
    name: 'Twin Currents',
    description: 'Activate: two cuts in one motion, the way two currents cross — the second arrives before the first is understood.',
    cost: 1,
    prereq: 'sun_db_weight',
    tier: 7,
    effect: {
      kind: 'active',
      action: 'sun_twin',
      cooldownMs: T.twin.cooldownMs,
      energyCost: T.twin.energyCost,
      compose: [{ p: 'strike', at: 'front', range: T.twin.range, damage: T.twin.damageEach, pulses: T.twin.pulses, pulseMs: T.twin.pulseMs, tint: 0x4ab8e8 }],
    },
  },
  {
    id: 'sun_db_grasp',
    tree: SUN_BLADE_TREE,
    name: 'Drowning Grasp',
    description: `Activate: the sea takes hold — the nearest enemy is ROOTED for ${(T.grasp.rootMs / 1000).toFixed(1)}s while its strength drains into you.`,
    cost: 1,
    prereq: 'sun_db_twin',
    tier: 8,
    effect: { kind: 'active', action: 'sun_grasp', cooldownMs: T.grasp.cooldownMs, energyCost: T.grasp.energyCost },
  },
  {
    id: WRATH_DEEP_ID,
    tree: SUN_BLADE_TREE,
    name: 'Wrath of the Deep',
    description: `Ultimate — Activate: for ${(T.wrath.durationMs / 1000).toFixed(0)}s the deep fights through you — faster, harder, and every strike drenches DEEPER and bursts in spray around what it hits. Long cooldown.`,
    cost: 1,
    prereq: 'sun_db_grasp',
    tier: 9,
    effect: {
      kind: 'transformation',
      cooldownMs: T.wrath.cooldownMs,
      durationMs: T.wrath.durationMs,
      energyCost: T.wrath.energyCost,
      tint: T.wrath.tint,
      stats: { attackSpeedMult: T.wrath.attackSpeedMult, damageMult: T.wrath.damageMult },
    },
  },
];

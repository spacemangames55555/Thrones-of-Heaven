import type { SkillDef } from './skillData';

/**
 * SAVAGE — OBSIDIAN EDGE TREE (10 skills, linear; MELEE FURY).
 *
 * The macuahuitl half: fast obsidian strikes and bleeds, WARRIOR'S MOMENTUM
 * (framework extension #1 — the frenzy stacks every damage path scales with),
 * the LEAP-SLAM (extension #2), HEADTAKER on the HP-threshold execute
 * (extension #4), and the combo ultimate. Conventions as always: EVERY tunable
 * in {@link SAV_EDGE_TUNING} with calibration anchors; placeholder prose. Tree
 * id 'sav_edge'. Tier-0 is a DAMAGING ACTIVE (no-kit rule).
 */

export const SAV_EDGE_TREE = 'sav_edge';

// Id the scene keys the FRENZY hook off (armed at recompute while owned).
export const WARRIORS_MOMENTUM_ID = 'sav_ob_momentum';

/** THE CASCADE (Casey's original concept: repeat the pattern cleanly and it
 *  accelerates). Obsidian Slash (1) → Jagged Wound (2) → Brutal Cleave (3) —
 *  the rotation-natural loop: open, tear, sweep. Landing them IN ORDER, each
 *  cast within windowMs of the last, builds one RANK per completed trio (cap
 *  maxRank); every rank cuts the three casts' cooldowns by cooldownCutPerRank
 *  and raises their damage by damagePerRank. Wrong order or a lapsed window
 *  drops every rank at once. */
export const SAV_CASCADE_TUNING = {
  windowMs: 4000,
  maxRank: 5,
  damagePerRank: 0.08,
  cooldownCutPerRank: 0.08,
} as const;

// ─── TUNING (all starting values; tune freely in playtest) ────────────────────
export const SAV_EDGE_TUNING = {
  /** 1) OBSIDIAN SLASH — ENTRY glass-edged swing (vs First Cut's 20/2s; the
   *  Savage's higher base damage carries it). */
  slash: { range: 74, damage: 19, cooldownMs: 2000, energyCost: 8 },
  /** 2) JAGGED WOUND — a tearing strike whose wound BLEEDS (bleed vs Razor's
   *  Edge's 4/500/2500 rider, cast-applied). */
  jagged: { range: 72, damage: 14, dot: { dmgPerTick: 5, tickMs: 500, durationMs: 3000 }, cooldownMs: 5000, energyCost: 12 },
  /** 3) WARRIOR'S MOMENTUM — extension #1: blood drawn builds stacks, each
   *  +perStack damage, all of it gone after decayMs without a hit. */
  momentum: { perStackMult: 0.06, maxStacks: 5, decayMs: 4000 },
  /** 4) SAVAGE LEAP — extension #2: the aimed jump + slam + knockdown (vs
   *  Dragonfly's 190 dash; the stun vs Charge's knockdown). */
  leap: { distance: 220, radius: 100, damage: 22, stunMs: 700, cooldownMs: 9000, energyCost: 16 },
  /** 5) BRUTAL CLEAVE — a wide obsidian arc (vs Crescent Sweep's 100/70°). */
  cleave: { range: 100, coneHalfAngleDeg: 65, damage: 22, cooldownMs: 6000, energyCost: 14 },
  /** 6) SKULL SPLITTER — a narrow crushing arc that STUNS (vs Skullcrack-class
   *  0.8s stuns). */
  skull: { range: 84, coneHalfAngleDeg: 30, damage: 18, stunMs: 900, cooldownMs: 8000, energyCost: 16 },
  /** 7) TERRIFYING ROAR — no wound, all fear: everything near you SLOWS and
   *  strikes SOFTER (vs Word of Power's control split). */
  roar: { radius: 170, slowFactor: 0.6, slowMs: 2500, weaken: 0.25, weakenMs: 4000, cooldownMs: 10000, energyCost: 16 },
  /** 8) HEADTAKER — extension #4: the low-health execute (threshold vs the
   *  Blacksmith Execute lineage; ×2 under the line). */
  headtaker: { reach: 60, radius: 84, damage: 20, threshold: 0.35, mult: 2, cooldownMs: 8000, energyCost: 16 },
  /** 9) SCENT OF BLOOD — lifesteal (vs Bloodlust-class 8%). */
  scent: { lifestealPct: 0.08 },
  /** 10) ENDLESS SLAUGHTER — ultimate: the combo-ultimate machinery, heavy and
   *  a hair slower than Thousand Cuts (300ms beat, harder per hit). */
  slaughter: { durationMs: 5000, intervalMs: 300, range: 110, damage: 14, jumps: 1, jumpRange: 130, falloff: 0.6, damageMult: 0.15, cooldownMs: 55000, energyCost: 40, tint: 0xff8a5a },
} as const;

const T = SAV_EDGE_TUNING;

// ─── THE 10 OBSIDIAN SKILLS (linear; tree 'sav_edge') ─────────────────────────
// >>> EDIT NAMES / DESCRIPTIONS HERE (placeholder prose). <<<
export const SAV_EDGE_SKILLS: SkillDef[] = [
  {
    id: 'sav_ob_slash',
    tree: SAV_EDGE_TREE,
    name: 'Obsidian Slash',
    description: 'Activate: one swing of volcanic glass — ragged, fast, final. Your reliable opener, and the CASCADE begins here.',
    cost: 1,
    tier: 0,
    effect: {
      kind: 'active',
      action: 'sav_slash',
      cooldownMs: T.slash.cooldownMs,
      energyCost: T.slash.energyCost,
      cascadeStep: 1,
      compose: [{ p: 'strike', at: 'front', range: T.slash.range, damage: T.slash.damage, tint: 0xff8a5a }],
    },
  },
  {
    id: 'sav_ob_jagged',
    tree: SAV_EDGE_TREE,
    name: 'Jagged Wound',
    description: 'Activate: a tearing cut that will not close — the wound BLEEDS long after the blade has passed. The CASCADE runs through it, second.',
    cost: 1,
    prereq: 'sav_ob_slash',
    tier: 1,
    effect: { kind: 'active', action: 'sav_jagged', cooldownMs: T.jagged.cooldownMs, energyCost: T.jagged.energyCost, cascadeStep: 2 },
  },
  {
    id: WARRIORS_MOMENTUM_ID,
    tree: SAV_EDGE_TREE,
    name: "Warrior's Momentum",
    description: `Passive: blood feeds fury — every hit you land builds momentum (+${Math.round(T.momentum.perStackMult * 100)}% damage a stack, up to ${T.momentum.maxStacks}); go quiet and it all drains away.`,
    cost: 1,
    prereq: 'sav_ob_jagged',
    tier: 2,
    effect: { kind: 'passive', stats: {} },
  },
  {
    id: 'sav_ob_leap',
    tree: SAV_EDGE_TREE,
    name: 'Savage Leap',
    description: 'Activate: leave the ground — land where you aimed, and everything around the landing is struck flat.',
    cost: 1,
    prereq: WARRIORS_MOMENTUM_ID,
    tier: 3,
    effect: { kind: 'active', action: 'sav_leap', cooldownMs: T.leap.cooldownMs, energyCost: T.leap.energyCost },
  },
  {
    id: 'sav_ob_cleave',
    tree: SAV_EDGE_TREE,
    name: 'Brutal Cleave',
    description: 'Activate: a wide obsidian arc — everything in front of you learns what glass can do. The CASCADE completes here: slash, tear, sweep, again, FASTER.',
    cost: 1,
    prereq: 'sav_ob_leap',
    tier: 4,
    effect: {
      kind: 'active',
      action: 'sav_cleave',
      cooldownMs: T.cleave.cooldownMs,
      energyCost: T.cleave.energyCost,
      cascadeStep: 3,
      compose: [{ p: 'cone', range: T.cleave.range, halfAngleDeg: T.cleave.coneHalfAngleDeg, damage: T.cleave.damage, tint: 0xff8a5a }],
    },
  },
  {
    id: 'sav_ob_skull',
    tree: SAV_EDGE_TREE,
    name: 'Skull Splitter',
    description: `Activate: bring the club down where the thinking happens — the struck reel STUNNED for ${(T.skull.stunMs / 1000).toFixed(1)}s.`,
    cost: 1,
    prereq: 'sav_ob_cleave',
    tier: 5,
    effect: {
      kind: 'active',
      action: 'sav_skull',
      cooldownMs: T.skull.cooldownMs,
      energyCost: T.skull.energyCost,
      compose: [{ p: 'cone', range: T.skull.range, halfAngleDeg: T.skull.coneHalfAngleDeg, damage: T.skull.damage, tint: 0xff8a5a, stunMs: T.skull.stunMs }],
    },
  },
  {
    id: 'sav_ob_roar',
    tree: SAV_EDGE_TREE,
    name: 'Terrifying Roar',
    description: `Activate: no blade, all animal — everything near you moves at ${Math.round(T.roar.slowFactor * 100)}% speed and strikes ${Math.round(T.roar.weaken * 100)}% softer.`,
    cost: 1,
    prereq: 'sav_ob_skull',
    tier: 6,
    effect: { kind: 'active', action: 'sav_roar', cooldownMs: T.roar.cooldownMs, energyCost: T.roar.energyCost },
  },
  {
    id: 'sav_ob_headtaker',
    tree: SAV_EDGE_TREE,
    name: 'Headtaker',
    description: `Activate: finish it — enemies below ${Math.round(T.headtaker.threshold * 100)}% health take ×${T.headtaker.mult}. The rest take the ordinary edge.`,
    cost: 1,
    prereq: 'sav_ob_roar',
    tier: 7,
    effect: { kind: 'active', action: 'sav_headtaker', cooldownMs: T.headtaker.cooldownMs, energyCost: T.headtaker.energyCost },
  },
  {
    id: 'sav_ob_scent',
    tree: SAV_EDGE_TREE,
    name: 'Scent of Blood',
    description: `Passive: the kill feeds the killer — heal ${Math.round(T.scent.lifestealPct * 100)}% of the damage you deal.`,
    cost: 1,
    prereq: 'sav_ob_headtaker',
    tier: 8,
    effect: { kind: 'passive', stats: { lifestealPct: T.scent.lifestealPct } },
  },
  {
    id: 'sav_ob_slaughter',
    tree: SAV_EDGE_TREE,
    name: 'Endless Slaughter',
    description: `Ultimate — Activate: the arm stops asking permission. For ${(T.slaughter.durationMs / 1000).toFixed(0)}s heavy blows chain themselves through everything in reach. Long cooldown.`,
    cost: 1,
    prereq: 'sav_ob_scent',
    tier: 9,
    effect: { kind: 'active', action: 'sav_slaughter', cooldownMs: T.slaughter.cooldownMs, energyCost: T.slaughter.energyCost },
  },
];

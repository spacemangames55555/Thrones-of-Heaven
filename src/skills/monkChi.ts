import type { SkillDef } from './skillData';

/**
 * MONK — CHI MASTERY TREE (10 skills, linear; SUSTAIN/DUALS).
 *
 * The breath between blows: the DUAL casts (damage enemies + heal friendlies in
 * one motion — framework extension #2; the Astral decoy counts as a friendly),
 * mends, the HP-cost Life Infusion (the ALLY RULE: no ally = a graceful,
 * refunded whiff), and the CHI EXPLOSION dual-nova ultimate. "Chi" is prose
 * over standard energy. Conventions as always: EVERY tunable in
 * {@link MONK_CHI_TUNING} with calibration anchors; placeholder prose. Tree id
 * 'monk_chi'. Tier-0 is a DAMAGING ACTIVE (no-kit rule).
 */

export const MONK_CHI_TREE = 'monk_chi';

// Id the scene keys nothing off — Restorative Touch maps to the shipped
// lifesteal stat (exported for the tree-file convention).
export const RESTORATIVE_TOUCH_ID = 'monk_ch_touch';

// ─── TUNING (all starting values; tune freely in playtest) ────────────────────
export const MONK_CHI_TUNING = {
  /** 1) CHI WAVE — ENTRY dual cone: damages enemies in its path AND mends
   *  friendlies around you (damage vs Sonic Blast's 24 cone, softer; the heal
   *  half vs Dissonant's 10 mend). */
  chiWave: { range: 210, coneHalfAngleDeg: 30, damage: 18, heal: 10, healRadius: 210, cooldownMs: 2800, energyCost: 10 },
  /** 2) INNER FOCUS — +damage (vs Steady Hand's 15%, softer: the Monk splits
   *  its power with its sustain). */
  focus: { damageMult: 0.12 },
  /** 3) SOOTHING PALM — a mending touch (vs Mend's 35 / Soothe patterns). */
  soothe: { heal: 30, cooldownMs: 10000, energyCost: 18 },
  /** 4) TRANQUIL STATE — burst-restore Chi (vs Disciplined Breath's 35). */
  tranquil: { energy: 40, cooldownMs: 14000, energyCost: 0 },
  /** 5) RESTORATIVE TOUCH — strikes restore health (the shipped lifesteal stat;
   *  vs Bloodlust-class lifesteal). */
  touch: { lifestealPct: 0.08 },
  /** 6) REVITALIZING AURA — a FOLLOWING heal aura (vs Hum of the Ancients'
   *  3/1000ms/20s follow zone). */
  aura: { radius: 120, healPerTick: 4, tickMs: 1000, durationMs: 15000, cooldownMs: 24000, energyCost: 22 },
  /** 7) ACUPUNCTURE — a mending touch that also strips ONE harmful effect
   *  (the needle finds the poison; heal vs Soothing Palm, lighter). */
  acupuncture: { heal: 20, cooldownMs: 12000, energyCost: 18 },
  /** 8) LIFE INFUSION — transfer your health to a friendly (the ALLY RULE:
   *  the decoy counts; no ally = a graceful refunded whiff). */
  infusion: { range: 400, cost: 15, heal: 30, cooldownMs: 10000, energyCost: 8 },
  /** 9) CHI BARRIER — a brief absorbing shell (vs Frequency Shield's 50/5s). */
  barrier: { amount: 50, durationMs: 5000, cooldownMs: 14000, energyCost: 20 },
  /** 10) CHI EXPLOSION — ultimate DUAL NOVA: damages every enemy AND heals every
   *  friendly around you in one release (extension #2; damage vs Forge Strike-
   *  class novas, the heal vs Rally's 30). */
  explosion: { radius: 170, damage: 36, heal: 26, cooldownMs: 50000, energyCost: 40 },
} as const;

const T = MONK_CHI_TUNING;

// ─── THE 10 CHI SKILLS (linear; tree 'monk_chi') ──────────────────────────────
// >>> EDIT NAMES / DESCRIPTIONS HERE (placeholder prose). <<<
export const MONK_CHI_SKILLS: SkillDef[] = [
  {
    id: 'monk_ch_wave',
    tree: MONK_CHI_TREE,
    name: 'Chi Wave',
    description: 'Activate: a rolling wave of chi — it WOUNDS every enemy in its path and MENDS you and yours as it passes. Your reliable opener.',
    cost: 1,
    tier: 0,
    effect: {
      kind: 'active',
      action: 'monk_chi_wave',
      cooldownMs: T.chiWave.cooldownMs,
      energyCost: T.chiWave.energyCost,
      compose: [
        { p: 'cone', range: T.chiWave.range, halfAngleDeg: T.chiWave.coneHalfAngleDeg, damage: T.chiWave.damage, tint: 0xa8ffd0 },
        { p: 'heal', amount: T.chiWave.heal, radius: T.chiWave.healRadius },
      ],
    },
  },
  {
    id: 'monk_ch_focus',
    tree: MONK_CHI_TREE,
    name: 'Inner Focus',
    description: `Passive: the mind holds one point — +${Math.round(T.focus.damageMult * 100)}% damage.`,
    cost: 1,
    prereq: 'monk_ch_wave',
    tier: 1,
    effect: { kind: 'passive', stats: { damageMult: T.focus.damageMult } },
  },
  {
    id: 'monk_ch_soothe',
    tree: MONK_CHI_TREE,
    name: 'Soothing Palm',
    description: `Activate: lay the palm where it hurts — restore ${T.soothe.heal} health.`,
    cost: 1,
    prereq: 'monk_ch_focus',
    tier: 2,
    effect: {
      kind: 'active',
      action: 'monk_soothe',
      cooldownMs: T.soothe.cooldownMs,
      energyCost: T.soothe.energyCost,
      compose: [{ p: 'heal', amount: T.soothe.heal }],
    },
  },
  {
    id: 'monk_ch_tranquil',
    tree: MONK_CHI_TREE,
    name: 'Tranquil State',
    description: `Activate: one perfect stillness — restore ${T.tranquil.energy} Chi at once.`,
    cost: 1,
    prereq: 'monk_ch_soothe',
    tier: 3,
    effect: { kind: 'active', action: 'monk_tranquil', cooldownMs: T.tranquil.cooldownMs, energyCost: T.tranquil.energyCost },
  },
  {
    id: RESTORATIVE_TOUCH_ID,
    tree: MONK_CHI_TREE,
    name: 'Restorative Touch',
    description: `Passive: every strike returns a little life — heal ${Math.round(T.touch.lifestealPct * 100)}% of the damage you deal.`,
    cost: 1,
    prereq: 'monk_ch_tranquil',
    tier: 4,
    effect: { kind: 'passive', stats: { lifestealPct: T.touch.lifestealPct } },
  },
  {
    id: 'monk_ch_aura',
    tree: MONK_CHI_TREE,
    name: 'Revitalizing Aura',
    description: `Activate: a soft radiance walks with you for ${(T.aura.durationMs / 1000).toFixed(0)}s, mending you and your companions inside it.`,
    cost: 1,
    prereq: RESTORATIVE_TOUCH_ID,
    tier: 5,
    effect: {
      kind: 'active',
      action: 'monk_aura',
      cooldownMs: T.aura.cooldownMs,
      energyCost: T.aura.energyCost,
      compose: [{ p: 'friendzone', follow: true, radius: T.aura.radius, healPerTick: T.aura.healPerTick, tickMs: T.aura.tickMs, durationMs: T.aura.durationMs, tint: 0xa8ffd0, banner: 'The chi flows outward' }],
    },
  },
  {
    id: 'monk_ch_acupuncture',
    tree: MONK_CHI_TREE,
    name: 'Acupuncture',
    description: `Activate: the needle finds the knot — restore ${T.acupuncture.heal} health and STRIP one harmful effect clinging to you.`,
    cost: 1,
    prereq: 'monk_ch_aura',
    tier: 6,
    effect: { kind: 'active', action: 'monk_acupuncture', cooldownMs: T.acupuncture.cooldownMs, energyCost: T.acupuncture.energyCost },
  },
  {
    id: 'monk_ch_infusion',
    tree: MONK_CHI_TREE,
    name: 'Life Infusion',
    description: `Activate: pour your own life down the bond — pay ${T.infusion.cost} health; the most wounded friendly near you mends ${T.infusion.heal}. With no ally present the chi returns unspent.`,
    cost: 1,
    prereq: 'monk_ch_acupuncture',
    tier: 7,
    effect: { kind: 'active', action: 'monk_infusion', cooldownMs: T.infusion.cooldownMs, energyCost: T.infusion.energyCost },
  },
  {
    id: 'monk_ch_barrier',
    tree: MONK_CHI_TREE,
    name: 'Chi Barrier',
    description: `Activate: a shell of held breath — ABSORBS the next ${T.barrier.amount} damage (up to ${(T.barrier.durationMs / 1000).toFixed(0)}s).`,
    cost: 1,
    prereq: 'monk_ch_infusion',
    tier: 8,
    effect: {
      kind: 'active',
      action: 'monk_barrier',
      cooldownMs: T.barrier.cooldownMs,
      energyCost: T.barrier.energyCost,
      compose: [{ p: 'shield', amount: T.barrier.amount, durationMs: T.barrier.durationMs, banner: 'Chi Barrier holds' }],
    },
  },
  {
    id: 'monk_ch_explosion',
    tree: MONK_CHI_TREE,
    name: 'Chi Explosion',
    description: 'Ultimate — Activate: release everything at once — a nova that WOUNDS every enemy around you and MENDS every friendly in the same breath. Long cooldown.',
    cost: 1,
    prereq: 'monk_ch_barrier',
    tier: 9,
    effect: {
      kind: 'active',
      action: 'monk_explosion',
      cooldownMs: T.explosion.cooldownMs,
      energyCost: T.explosion.energyCost,
      compose: [
        { p: 'strike', at: 'self', radius: T.explosion.radius, damage: T.explosion.damage, tint: 0xa8ffd0 },
        { p: 'heal', amount: T.explosion.heal, radius: T.explosion.radius },
      ],
    },
  },
];

import type { SkillDef } from './skillData';

/**
 * SAMURAI — WAY OF THE STANCES TREE (10 skills, linear).
 *
 * RULING (Casey): pure DPS — defense through TIMING, not armor. The three
 * STANCES are toggled transformations sharing one stanceGroup (framework
 * extension #2: entering one exits any other); PARRY (extension #1a) and its
 * two upgrade hooks — COUNTERSTRIKE and PERFECT FORM (#1b) — live here.
 * "Resolve" is prose over standard energy. Conventions as always: EVERY
 * tunable in {@link SAM_STANCE_TUNING} with calibration anchors; placeholder
 * prose. Tree id 'sam_stance'. Tier-0 is a DAMAGING ACTIVE.
 */

export const SAM_STANCE_TREE = 'sam_stance';

/** The mutual-exclusion group all three stances share (one stance at a time). */
export const SAMURAI_STANCE_GROUP = 'samurai_stance';

// Ids the scene keys the parry upgrades + CC resistance off of.
export const COUNTERSTRIKE_ID = 'sam_st_counter';
export const IMMOVABLE_MIND_ID = 'sam_st_immovable';

// ─── TUNING (all starting values; tune freely in playtest) ────────────────────
export const SAM_STANCE_TUNING = {
  /** 1) GUARD BREAK — ENTRY staggering blow + defense-down (weaken vs Corrosive
   *  Eruption's 0.35, briefer; damage vs Bash's 26). */
  guardBreak: { range: 74, damage: 22, weaken: 0.3, weakenMs: 4000, cooldownMs: 3000, energyCost: 10 },
  /** 2/3/4) THE STANCES — toggles, mutually exclusive. Modest numbers per the
   *  pure-DPS ruling (defense through timing, never armor):
   *  WATER +speed/+evasion −defense · STONE +resist −speed · FIRE +damage ±taken. */
  water: { moveSpeedMult: 0.15, blockChance: 0.2, blockReduction: 0.6, damageReduction: -0.1, tint: 0x6ab8e0 },
  stone: { damageReduction: 0.2, moveSpeedMult: -0.1, tint: 0x9a9a8a },
  fire: { damageMult: 0.25, damageReduction: -0.15, tint: 0xff8a3a },
  stanceCooldownMs: 2500,
  stanceEnergyCost: 8,
  /** 5) PARRY — the timed negate-and-riposte window (extension #1a; riposte vs
   *  First Cut's 20). */
  parry: { windowMs: 650, riposteDamage: 22, cooldownMs: 6000, energyCost: 10 },
  /** 6) DISCIPLINED BREATH — Resolve + a little health back (vs Mana Surge /
   *  Disciplined-recovery patterns). */
  breath: { energy: 35, heal: 12, cooldownMs: 14000, energyCost: 0 },
  /** 7) COUNTERSTRIKE — keyed parry upgrade: riposte bonus + Resolve refund per
   *  successful parry (extension #1b). */
  counter: { riposteBonus: 14, energyRefund: 10 },
  /** 8) IMMOVABLE MIND — CC resistance (joins the Iron Will immunity rule). */
  /** 9) KIAI — a short melee-range cone SHOUT that stuns (vs Piercing Whistle's
   *  110/40°/12/0.9s — the sanctioned short-cone shape). */
  kiai: { range: 110, coneHalfAngleDeg: 45, damage: 10, stunMs: 900, cooldownMs: 9000, energyCost: 18 },
  /** 10) PERFECT FORM — ultimate: auto-parry EVERYTHING for a window while acting
   *  freely (extension #1b; riposte vs the Parry's 22, harder). */
  perfectForm: { durationMs: 5000, riposteDamage: 26, cooldownMs: 60000, energyCost: 40, tint: 0xffe9a8 },
} as const;

const T = SAM_STANCE_TUNING;

// ─── THE 10 STANCE SKILLS (linear; tree 'sam_stance') ─────────────────────────
// >>> EDIT NAMES / DESCRIPTIONS HERE (placeholder prose). <<<
export const SAM_STANCE_SKILLS: SkillDef[] = [
  {
    id: 'sam_st_guard_break',
    tree: SAM_STANCE_TREE,
    name: 'Guard Break',
    description: `Activate: a staggering blow that OPENS the enemy's defense — it swings ${Math.round(T.guardBreak.weaken * 100)}% weaker for ${(T.guardBreak.weakenMs / 1000).toFixed(0)}s. Your reliable opener.`,
    cost: 1,
    tier: 0,
    effect: {
      kind: 'active',
      action: 'sam_guard_break',
      cooldownMs: T.guardBreak.cooldownMs,
      energyCost: T.guardBreak.energyCost,
      compose: [{ p: 'strike', at: 'front', range: T.guardBreak.range, damage: T.guardBreak.damage, tint: 0xd8e8ff, weaken: T.guardBreak.weaken, weakenMs: T.guardBreak.weakenMs, weakenOnlyIfHit: true }],
    },
  },
  {
    id: 'sam_st_water',
    tree: SAM_STANCE_TREE,
    name: 'Water Stance',
    description: `Toggle: flow like water — +${Math.round(T.water.moveSpeedMult * 100)}% speed and slipping evasion, at the cost of standing lighter. One stance at a time; cast again to release.`,
    cost: 1,
    prereq: 'sam_st_guard_break',
    tier: 1,
    effect: {
      kind: 'transformation',
      cooldownMs: T.stanceCooldownMs,
      durationMs: 0,
      energyCost: T.stanceEnergyCost,
      tint: T.water.tint,
      toggle: true,
      stanceGroup: SAMURAI_STANCE_GROUP,
      stats: { moveSpeedMult: T.water.moveSpeedMult, blockChance: T.water.blockChance, blockReduction: T.water.blockReduction, damageReduction: T.water.damageReduction },
    },
  },
  {
    id: 'sam_st_stone',
    tree: SAM_STANCE_TREE,
    name: 'Stone Stance',
    description: `Toggle: stand like stone — take ${Math.round(T.stone.damageReduction * 100)}% less, move a little slower. Modest, as the Way demands: your true defense is timing. One stance at a time.`,
    cost: 1,
    prereq: 'sam_st_water',
    tier: 2,
    effect: {
      kind: 'transformation',
      cooldownMs: T.stanceCooldownMs,
      durationMs: 0,
      energyCost: T.stanceEnergyCost,
      tint: T.stone.tint,
      toggle: true,
      stanceGroup: SAMURAI_STANCE_GROUP,
      stats: { damageReduction: T.stone.damageReduction, moveSpeedMult: T.stone.moveSpeedMult },
    },
  },
  {
    id: 'sam_st_fire',
    tree: SAM_STANCE_TREE,
    name: 'Fire Stance',
    description: `Toggle: burn like fire — +${Math.round(T.fire.damageMult * 100)}% damage DEALT and more damage TAKEN. The duelist's wager. One stance at a time.`,
    cost: 1,
    prereq: 'sam_st_stone',
    tier: 3,
    effect: {
      kind: 'transformation',
      cooldownMs: T.stanceCooldownMs,
      durationMs: 0,
      energyCost: T.stanceEnergyCost,
      tint: T.fire.tint,
      toggle: true,
      stanceGroup: SAMURAI_STANCE_GROUP,
      stats: { damageMult: T.fire.damageMult, damageReduction: T.fire.damageReduction },
    },
  },
  {
    id: 'sam_st_parry',
    tree: SAM_STANCE_TREE,
    name: 'Parry',
    description: `Activate: read the blow before it lands — for ${T.parry.windowMs}ms the next MELEE hit is turned aside entirely and answered with a riposte. Ranged attacks cannot be parried.`,
    cost: 1,
    prereq: 'sam_st_fire',
    tier: 4,
    effect: { kind: 'active', action: 'sam_parry', cooldownMs: T.parry.cooldownMs, energyCost: T.parry.energyCost },
  },
  {
    id: 'sam_st_breath',
    tree: SAM_STANCE_TREE,
    name: 'Disciplined Breath',
    description: `Activate: one long breath — restore ${T.breath.energy} Resolve and ${T.breath.heal} health.`,
    cost: 1,
    prereq: 'sam_st_parry',
    tier: 5,
    effect: { kind: 'active', action: 'sam_breath', cooldownMs: T.breath.cooldownMs, energyCost: T.breath.energyCost },
  },
  {
    id: COUNTERSTRIKE_ID,
    tree: SAM_STANCE_TREE,
    name: 'Counterstrike',
    description: `Passive: the answer sharpens — ripostes hit ${T.counter.riposteBonus} harder and every successful parry returns ${T.counter.energyRefund} Resolve.`,
    cost: 1,
    prereq: 'sam_st_breath',
    tier: 6,
    effect: { kind: 'passive', stats: {} }, // keyed — the scene arms the parry upgrade while owned
  },
  {
    id: IMMOVABLE_MIND_ID,
    tree: SAM_STANCE_TREE,
    name: 'Immovable Mind',
    description: 'Passive: the mind cannot be staggered — immune to stun, knockback and knockdown.',
    cost: 1,
    prereq: COUNTERSTRIKE_ID,
    tier: 7,
    effect: { kind: 'passive', stats: {} }, // keyed — joins the CC-immunity rule while owned
  },
  {
    id: 'sam_st_kiai',
    tree: SAM_STANCE_TREE,
    name: 'Kiai',
    description: `Activate: the shout that empties the mind — a short cone of pure force that STUNS everything caught in it for ${(T.kiai.stunMs / 1000).toFixed(1)}s.`,
    cost: 1,
    prereq: IMMOVABLE_MIND_ID,
    tier: 8,
    effect: {
      kind: 'active',
      action: 'sam_kiai',
      cooldownMs: T.kiai.cooldownMs,
      energyCost: T.kiai.energyCost,
      compose: [{ p: 'cone', range: T.kiai.range, halfAngleDeg: T.kiai.coneHalfAngleDeg, damage: T.kiai.damage, tint: 0xffe9a8, stunMs: T.kiai.stunMs }],
    },
  },
  {
    id: 'sam_st_perfect',
    tree: SAM_STANCE_TREE,
    name: 'Perfect Form',
    description: `Ultimate — Activate: for ${(T.perfectForm.durationMs / 1000).toFixed(0)}s every blow aimed at you is READ and turned aside — auto-parried with a riposte — while your own hands stay free. Long cooldown.`,
    cost: 1,
    prereq: 'sam_st_kiai',
    tier: 9,
    effect: { kind: 'active', action: 'sam_perfect_form', cooldownMs: T.perfectForm.cooldownMs, energyCost: T.perfectForm.energyCost },
  },
];

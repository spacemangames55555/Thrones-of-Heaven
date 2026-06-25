import type { SkillDef } from './skillData';

/**
 * BLACKSMITH — CONTROL TREE (10 skills, linear → Iron Pyrite capstone).
 *
 * Debuff/reactive-heavy. EVERY tunable lives in {@link CONTROL_TUNING}; the scene's
 * effect handlers read action constants by key, and the REACTIVE/AURA passives
 * (Counter Attack, Iron Will, Dominance) are applied by the scene keyed off the
 * exported ids below (their behaviour can't be a plain stat mod). Names/descriptions
 * are placeholder prose — edit them in CONTROL_TREE_SKILLS. Tree id 'control'.
 */

// Ids the scene keys special passive/transform behaviour off of.
export const COUNTER_ID = 'bs_ctrl_counter';
export const IRON_WILL_ID = 'bs_ctrl_iron_will';
export const DOMINANCE_ID = 'bs_ctrl_dominance';
export const IRON_PYRITE_ID = 'bs_ctrl_pyrite';

// ─── TUNING (all starting values; tune freely) ────────────────────────────────
export const CONTROL_TUNING = {
  /** 1) CHARGE — forward rush; first enemies hit take damage + KNOCKDOWN (stun). */
  charge: { distance: 300, damage: 22, knockdownMs: 1200, cooldownMs: 9000, energyCost: 18 },
  /** 2) TOUGHNESS — passive max-HP %. */
  toughness: { maxHPMult: 0.15 },
  /** 3) DISARM — strike that locks a target down (can't act) for a while. */
  disarm: { damage: 18, disarmMs: 3000, range: 70, cooldownMs: 8000, energyCost: 15 },
  /** 4) INTIMIDATE — AoE shout: SLOW + WEAKEN nearby enemies for a duration. */
  intimidate: { radius: 180, slowFactor: 0.5, weaken: 0.3, durationMs: 5000, cooldownMs: 12000, energyCost: 20 },
  /** 5) COUNTER ATTACK — reactive: auto-strike when hit (internal cooldown). */
  counter: { damage: 20, internalCdMs: 1200, range: 90 },
  /** 6) CRIPPLE — heavy blow that sharply SLOWS a target's movement. */
  cripple: { damage: 28, slowFactor: 0.35, slowMs: 4000, range: 72, cooldownMs: 9000, energyCost: 18 },
  /** 7) IRON WILL — passive: immune to stun/knockback/knockdown + shorter debuffs, and
   *  an unshakable resolve that reduces all incoming damage by `damageReduction`. */
  ironWill: { ccImmune: true, debuffDurationReduction: 0.5, damageReduction: 0.1 },
  /** 8) EXECUTE — finisher: massive bonus damage to enemies below a HP threshold. */
  execute: { damage: 30, thresholdPct: 0.3, executeMult: 4, range: 72, cooldownMs: 8000, energyCost: 20 },
  /** 9) DOMINANCE — passive AURA: nearby enemies deal less damage + move slower. */
  dominance: { radius: 170, enemyDamageReduction: 0.25, slowFactor: 0.7 },
  /** 10) CRYSTAL OF IRON PYRITE — transformation capstone. */
  pyrite: { durationMs: 12000, maxHPMult: 0.4, damageMult: 0.4, staggerMs: 600, auraRadius: 170, auraSlowFactor: 0.6, auraWeaken: 0.3, cooldownMs: 60000, tint: 0xffd24a },
} as const;

// ─── THE 10 CONTROL SKILLS (linear; tree 'control') ───────────────────────────
// >>> EDIT NAMES / DESCRIPTIONS HERE (placeholder prose). <<<
export const CONTROL_TREE_SKILLS: SkillDef[] = [
  {
    id: 'bs_ctrl_charge',
    tree: 'control',
    name: 'Charge',
    description: 'Activate: rush forward; the first enemies you hit are damaged and KNOCKED DOWN.',
    cost: 1,
    tier: 0,
    effect: { kind: 'active', action: 'control_charge', cooldownMs: CONTROL_TUNING.charge.cooldownMs, energyCost: CONTROL_TUNING.charge.energyCost },
  },
  {
    id: 'bs_ctrl_toughness',
    tree: 'control',
    name: 'Toughness',
    description: `Passive: +${Math.round(CONTROL_TUNING.toughness.maxHPMult * 100)}% maximum HP.`,
    cost: 1,
    prereq: 'bs_ctrl_charge',
    tier: 1,
    effect: { kind: 'passive', stats: { maxHPMult: CONTROL_TUNING.toughness.maxHPMult } },
  },
  {
    id: 'bs_ctrl_disarm',
    tree: 'control',
    name: 'Disarm',
    description: `Activate: a precise strike that DISARMS the target — it can't act for ${(CONTROL_TUNING.disarm.disarmMs / 1000).toFixed(0)}s.`,
    cost: 1,
    prereq: 'bs_ctrl_toughness',
    tier: 2,
    effect: { kind: 'active', action: 'disarm', cooldownMs: CONTROL_TUNING.disarm.cooldownMs, energyCost: CONTROL_TUNING.disarm.energyCost },
  },
  {
    id: 'bs_ctrl_intimidate',
    tree: 'control',
    name: 'Intimidate',
    description: `Activate: a shout that SLOWS and WEAKENS (−${Math.round(CONTROL_TUNING.intimidate.weaken * 100)}% enemy damage) all foes nearby for ${(CONTROL_TUNING.intimidate.durationMs / 1000).toFixed(0)}s.`,
    cost: 1,
    prereq: 'bs_ctrl_disarm',
    tier: 3,
    effect: { kind: 'active', action: 'intimidate', cooldownMs: CONTROL_TUNING.intimidate.cooldownMs, energyCost: CONTROL_TUNING.intimidate.energyCost },
  },
  {
    id: COUNTER_ID,
    tree: 'control',
    name: 'Counter Attack',
    description: `Passive: when you are struck, automatically strike back for ${CONTROL_TUNING.counter.damage} damage (every ${(CONTROL_TUNING.counter.internalCdMs / 1000).toFixed(1)}s at most).`,
    cost: 1,
    prereq: 'bs_ctrl_intimidate',
    tier: 4,
    effect: { kind: 'passive', stats: {} }, // reactive — applied by the scene (keyed by id)
  },
  {
    id: 'bs_ctrl_cripple',
    tree: 'control',
    name: 'Cripple',
    description: 'Activate: a heavy blow that sharply SLOWS the target for several seconds.',
    cost: 1,
    prereq: COUNTER_ID,
    tier: 5,
    effect: { kind: 'active', action: 'cripple', cooldownMs: CONTROL_TUNING.cripple.cooldownMs, energyCost: CONTROL_TUNING.cripple.energyCost },
  },
  {
    id: IRON_WILL_ID,
    tree: 'control',
    name: 'Iron Will',
    description: `Passive: immune to stun, knockback and knockdown; debuffs on you last half as long; and you take −${Math.round(CONTROL_TUNING.ironWill.damageReduction * 100)}% damage.`,
    cost: 1,
    prereq: 'bs_ctrl_cripple',
    tier: 6,
    effect: { kind: 'passive', stats: {} }, // CC-immunity flag — applied by the scene (keyed by id)
  },
  {
    id: 'bs_ctrl_execute',
    tree: 'control',
    name: 'Execute',
    description: `Activate: a finisher dealing MASSIVE bonus damage to enemies below ${Math.round(CONTROL_TUNING.execute.thresholdPct * 100)}% HP.`,
    cost: 1,
    prereq: IRON_WILL_ID,
    tier: 7,
    effect: { kind: 'active', action: 'execute', cooldownMs: CONTROL_TUNING.execute.cooldownMs, energyCost: CONTROL_TUNING.execute.energyCost },
  },
  {
    id: DOMINANCE_ID,
    tree: 'control',
    name: 'Dominance',
    description: `Passive aura: enemies near you deal −${Math.round(CONTROL_TUNING.dominance.enemyDamageReduction * 100)}% damage and move slower.`,
    cost: 1,
    prereq: 'bs_ctrl_execute',
    tier: 8,
    effect: { kind: 'passive', stats: {} }, // aura — applied by the scene (keyed by id)
  },
  {
    id: IRON_PYRITE_ID,
    tree: 'control',
    name: 'Crystal of Iron Pyrite',
    description: `Capstone — Activate: become living iron pyrite for ${(CONTROL_TUNING.pyrite.durationMs / 1000).toFixed(0)}s. Immune to all crowd control, your attacks STAGGER enemies, an aura slows + weakens nearby foes, and +${Math.round(CONTROL_TUNING.pyrite.maxHPMult * 100)}% HP / +${Math.round(CONTROL_TUNING.pyrite.damageMult * 100)}% damage. You become a glowing metallic-gold crystal, then revert.`,
    cost: 1,
    prereq: DOMINANCE_ID,
    tier: 9,
    effect: {
      kind: 'transformation',
      cooldownMs: CONTROL_TUNING.pyrite.cooldownMs,
      durationMs: CONTROL_TUNING.pyrite.durationMs,
      tint: CONTROL_TUNING.pyrite.tint,
      stats: { maxHPMult: CONTROL_TUNING.pyrite.maxHPMult, damageMult: CONTROL_TUNING.pyrite.damageMult },
    },
  },
];

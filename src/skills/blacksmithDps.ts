import type { SkillDef } from './skillData';

/**
 * BLACKSMITH — DPS / OFFENSE TREE (10 skills, linear → Prism Quartz capstone).
 *
 * Same pattern as the Tank tree: EVERY tunable number lives in {@link DPS_TUNING};
 * the skill defs reference it and the scene's effect handlers read the action
 * constants by key. Names/descriptions are PLACEHOLDER prose — edit the `name`/
 * `description` fields in DPS_TREE_SKILLS. Tree id is 'offense'; linear prereqs.
 */

// ─── TUNING (all starting values; tune freely) ────────────────────────────────
export const DPS_TUNING = {
  /** 1) BASH — quick hard active strike (low cooldown, no energy). */
  bash: { damage: 26, range: 64, cooldownMs: 2500, energyCost: 0 },
  /** 2) BERSERKER'S EDGE — passive attack-damage %. */
  berserker: { damageMult: 0.2 },
  /** 3) OVERSWING — slow telegraphed heavy strike. */
  overswing: { damage: 70, range: 84, windUpMs: 600, cooldownMs: 8000, energyCost: 20 },
  /** 4) DOUBLE SWING — basic attacks hit twice (multi-hit). */
  doubleSwing: { basicHitCount: 2 },
  /** 5) CRAZED — timed berserk buff: faster + harder hits, but take more damage. */
  crazed: { durationMs: 8000, attackSpeedMult: 0.6, damageMult: 0.4, damageTakenPenalty: 0.3, cooldownMs: 18000, energyCost: 25, tint: 0xff4530 },
  /** 6) WINDMILL — spin AoE around the player. */
  windmill: { damage: 24, radius: 135, cooldownMs: 6000, energyCost: 18 },
  /** 7) HAMMER THROW — ranged thrown-hammer projectile (player faction). */
  hammerThrow: { damage: 38, speed: 520, range: 380, radius: 16, cooldownMs: 7000, energyCost: 20 },
  /** 8) TRIPLE SWING — basic attacks hit three times (requires Double Swing). */
  tripleSwing: { basicHitCount: 3 },
  /** 9) BLOODLUST — passive lifesteal (heal a % of damage dealt). */
  bloodlust: { lifestealPct: 0.12 },
  /** 10) CRYSTAL OF PRISM QUARTZ — transformation capstone. */
  prism: { durationMs: 12000, damageMult: 0.6, attackSpeedMult: 0.6, refractHits: 4, cooldownMs: 60000, tint: 0x9af0ff },
} as const;

// ─── THE 10 DPS SKILLS (linear; tree 'offense') ───────────────────────────────
// >>> EDIT NAMES / DESCRIPTIONS HERE (placeholder prose). <<<
export const DPS_TREE_SKILLS: SkillDef[] = [
  {
    id: 'bs_dps_bash',
    tree: 'offense',
    name: 'Bash',
    description: 'Activate: a quick hard strike in front of you. Low cooldown.',
    cost: 1,
    tier: 0,
    effect: {
      kind: 'active',
      action: 'bash',
      cooldownMs: DPS_TUNING.bash.cooldownMs,
      energyCost: DPS_TUNING.bash.energyCost,
      compose: [{ p: 'strike', at: 'front', range: DPS_TUNING.bash.range, damage: DPS_TUNING.bash.damage, tint: 0xff7a3a }],
    },
  },
  {
    id: 'bs_dps_berserker',
    tree: 'offense',
    name: "Berserker's Edge",
    description: `Honed fury. +${Math.round(DPS_TUNING.berserker.damageMult * 100)}% attack damage.`,
    cost: 1,
    prereq: 'bs_dps_bash',
    tier: 1,
    effect: { kind: 'passive', stats: { damageMult: DPS_TUNING.berserker.damageMult } },
  },
  {
    id: 'bs_dps_overswing',
    tree: 'offense',
    name: 'Overswing',
    description: 'Activate: a slow, heavy wind-up swing — huge single-target damage after a brief telegraph.',
    cost: 1,
    prereq: 'bs_dps_berserker',
    tier: 2,
    effect: {
      kind: 'active',
      action: 'overswing',
      cooldownMs: DPS_TUNING.overswing.cooldownMs,
      energyCost: DPS_TUNING.overswing.energyCost,
      compose: [{ p: 'strike', at: 'front', range: DPS_TUNING.overswing.range, damage: DPS_TUNING.overswing.damage, tint: 0xffb04a, windUpMs: DPS_TUNING.overswing.windUpMs }],
    },
  },
  {
    id: 'bs_dps_double_swing',
    tree: 'offense',
    name: 'Double Swing',
    description: 'Passive: your basic attacks strike TWICE.',
    cost: 1,
    prereq: 'bs_dps_overswing',
    tier: 3,
    effect: { kind: 'passive', stats: { basicHitCount: DPS_TUNING.doubleSwing.basicHitCount } },
  },
  {
    id: 'bs_dps_crazed',
    tree: 'offense',
    name: 'Crazed',
    description: `Activate: for ${(DPS_TUNING.crazed.durationMs / 1000).toFixed(0)}s, +${Math.round(DPS_TUNING.crazed.attackSpeedMult * 100)}% attack speed and +${Math.round(DPS_TUNING.crazed.damageMult * 100)}% damage — but you take +${Math.round(DPS_TUNING.crazed.damageTakenPenalty * 100)}% damage.`,
    cost: 1,
    prereq: 'bs_dps_double_swing',
    tier: 4,
    effect: {
      kind: 'buff',
      cooldownMs: DPS_TUNING.crazed.cooldownMs,
      durationMs: DPS_TUNING.crazed.durationMs,
      energyCost: DPS_TUNING.crazed.energyCost,
      tint: DPS_TUNING.crazed.tint,
      stats: { attackSpeedMult: DPS_TUNING.crazed.attackSpeedMult, damageMult: DPS_TUNING.crazed.damageMult, damageReduction: -DPS_TUNING.crazed.damageTakenPenalty },
    },
  },
  {
    id: 'bs_dps_windmill',
    tree: 'offense',
    name: 'Windmill',
    description: 'Activate: a spinning attack that strikes ALL enemies around you.',
    cost: 1,
    prereq: 'bs_dps_crazed',
    tier: 5,
    effect: {
      kind: 'active',
      action: 'windmill',
      cooldownMs: DPS_TUNING.windmill.cooldownMs,
      energyCost: DPS_TUNING.windmill.energyCost,
      compose: [{ p: 'strike', at: 'self', radius: DPS_TUNING.windmill.radius, damage: DPS_TUNING.windmill.damage, tint: 0xff9a5a }],
    },
  },
  {
    id: 'bs_dps_hammer_throw',
    tree: 'offense',
    name: 'Hammer Throw',
    description: 'Activate: hurl your hammer, damaging enemies along its path.',
    cost: 1,
    prereq: 'bs_dps_windmill',
    tier: 6,
    effect: {
      kind: 'active',
      action: 'hammer_throw',
      cooldownMs: DPS_TUNING.hammerThrow.cooldownMs,
      energyCost: DPS_TUNING.hammerThrow.energyCost,
      compose: [{ p: 'bolt', damage: DPS_TUNING.hammerThrow.damage, speed: DPS_TUNING.hammerThrow.speed, range: DPS_TUNING.hammerThrow.range, radius: DPS_TUNING.hammerThrow.radius, tint: 0xd9c08a }],
    },
  },
  {
    id: 'bs_dps_triple_swing',
    tree: 'offense',
    name: 'Triple Swing',
    description: 'Passive: your basic attacks strike THREE times.',
    cost: 1,
    prereq: 'bs_dps_hammer_throw',
    tier: 7,
    effect: { kind: 'passive', stats: { basicHitCount: DPS_TUNING.tripleSwing.basicHitCount } },
  },
  {
    id: 'bs_dps_bloodlust',
    tree: 'offense',
    name: 'Bloodlust',
    description: `Passive: lifesteal — heal for ${Math.round(DPS_TUNING.bloodlust.lifestealPct * 100)}% of the damage you deal.`,
    cost: 1,
    prereq: 'bs_dps_triple_swing',
    tier: 8,
    effect: { kind: 'passive', stats: { lifestealPct: DPS_TUNING.bloodlust.lifestealPct } },
  },
  {
    id: 'bs_dps_prism',
    tree: 'offense',
    name: 'Crystal of Prism Quartz',
    description: `Capstone — Activate: become living prism quartz for ${(DPS_TUNING.prism.durationMs / 1000).toFixed(0)}s. +${Math.round(DPS_TUNING.prism.damageMult * 100)}% damage, +${Math.round(DPS_TUNING.prism.attackSpeedMult * 100)}% attack speed, and your basic attacks REFRACT to strike ${DPS_TUNING.prism.refractHits} times. You become a glowing translucent crystal, then revert.`,
    cost: 1,
    prereq: 'bs_dps_bloodlust',
    tier: 9,
    effect: {
      kind: 'transformation',
      cooldownMs: DPS_TUNING.prism.cooldownMs,
      durationMs: DPS_TUNING.prism.durationMs,
      tint: DPS_TUNING.prism.tint,
      stats: { damageMult: DPS_TUNING.prism.damageMult, attackSpeedMult: DPS_TUNING.prism.attackSpeedMult, basicHitCount: DPS_TUNING.prism.refractHits },
    },
  },
];

import type { SkillDef } from './skillData';

/**
 * DRUID — NATURE'S RESTORATION TREE (10 skills, linear).
 *
 * The Druid's healer tree: remedies, salves and living zones. "Ally" today means
 * SELF + SUMMONS (the friendly zones and the Lye bolt already heal both; the two
 * Essential Oils buff both). Same conventions as every tree file: EVERY tunable
 * lives in {@link RESTORATION_TUNING} with per-skill calibration anchors;
 * names/descriptions are PLACEHOLDER prose. Linear prereqs; tree id
 * 'druid_restoration'. Tier-0 (Lye) is a DAMAGING active (the dual-use bolt
 * burns an enemy when one is in range), satisfying the no-kit opener rule.
 *
 * Composed where the primitives cover it; Clay (heal + timed buff) and the two
 * Essential Oils (self buff + summon buff for 5 minutes) dispatch by action id.
 */

export const DRUID_RESTORATION_TREE = 'druid_restoration';

// Ids the scene keys the timed halves of the combo actives off of.
export const CLAY_ID = 'dru_res_clay';
export const OIL_IMMUNITY_ID = 'dru_res_oil_immunity';
export const OIL_VITALITY_ID = 'dru_res_oil_vitality';

// ─── TUNING (all starting values; tune freely in playtest) ────────────────────
export const RESTORATION_TUNING = {
  /** 1) LYE — ENTRY dual-use bolt: burns an enemy in range, else MENDS the most-injured
   *  ally (summon in heal range, else self). Damage vs Ethereal Bolt (26/1.3s/9);
   *  heal below Mend's 35 since it's spammable. */
  lye: { range: 340, damage: 24, speed: 500, radius: 11, heal: 24, healRange: 220, cooldownMs: 1500, energyCost: 10 },
  /** 2) MUSHROOM PASTE — instant self-heal (vs Mend: 35 HP / 9s / 22). */
  mushroomPaste: { heal: 30, cooldownMs: 8000, energyCost: 20 },
  /** 3) ALOE — the cheaper/faster heal tier (smaller, half the cooldown). */
  aloe: { heal: 18, cooldownMs: 4000, energyCost: 10 },
  /** 4) CLAY — heal + a short defense buff (heal vs Mend; buff vs War Chant's 0.2 DR). */
  clay: { heal: 22, damageReduction: 0.15, buffMs: 6000, cooldownMs: 10000, energyCost: 22, tint: 0xb09a7a },
  /** 5) HONEY SPREAD — heal-over-time on self (= Regeneration's 8 HP/s / 8s / 16s). */
  honey: { regenPerSec: 8, durationMs: 8000, cooldownMs: 14000, energyCost: 18, tint: 0xe8c05a },
  /** 6) BARK ARMOR — self buff: +defense +max health (DR vs Ethereal Form 0.6/6s,
   *  here milder + longer; HP vs Grit's +20%). */
  barkArmor: { damageReduction: 0.25, maxHPMult: 0.2, durationMs: 10000, cooldownMs: 18000, energyCost: 24, tint: 0x8a6a42 },
  /** 7) SAGE BURN — small MOBILE healing zone that follows the Druid, 30s (the
   *  friendly-zone extension; heal rate ≈ the baseline out-of-combat regen). */
  sageBurn: { radius: 110, healPerTick: 4, tickMs: 1000, durationMs: 30000, cooldownMs: 45000, energyCost: 30 },
  /** 8) HEALING SPORES — large STATIC healing zone, 30s. */
  spores: { radius: 200, healPerTick: 5, tickMs: 1000, durationMs: 30000, cooldownMs: 45000, energyCost: 32 },
  /** 9) ESSENTIAL OIL OF IMMUNITY — ally buff (self + summons), 5 MINUTES: +resistances.
   *  Self DR mild (it's near-permanent); summon DR via the pet-buff system. */
  oilImmunity: { durationMs: 300000, selfDamageReduction: 0.15, summonDrBonus: 0.3, cooldownMs: 60000, energyCost: 35, tint: 0xbfe0d0 },
  /** 10) ESSENTIAL OIL OF VITALITY — ally buff (self + summons), 5 MINUTES: health boost. */
  oilVitality: { durationMs: 300000, selfMaxHPMult: 0.25, summonHpBonus: 0.3, cooldownMs: 60000, energyCost: 35, tint: 0xa8e0a0 },
} as const;

const T = RESTORATION_TUNING;

// ─── THE 10 RESTORATION SKILLS (linear; tree 'druid_restoration') ─────────────
// >>> EDIT NAMES / DESCRIPTIONS HERE (placeholder prose). <<<
export const DRUID_RESTORATION_SKILLS: SkillDef[] = [
  {
    id: 'dru_res_lye',
    tree: DRUID_RESTORATION_TREE,
    name: 'Lye',
    description: 'Activate: a caustic draught — BURNS the nearest enemy in range, or with no enemy near, MENDS your most-injured companion (or yourself).',
    cost: 1,
    tier: 0,
    effect: {
      kind: 'active',
      action: 'dru_lye',
      cooldownMs: T.lye.cooldownMs,
      energyCost: T.lye.energyCost,
      compose: [{ p: 'dualbolt', range: T.lye.range, damage: T.lye.damage, speed: T.lye.speed, radius: T.lye.radius, heal: T.lye.heal, healRange: T.lye.healRange, tint: 0xc8e07a, healTint: 0xa8ffd0 }],
    },
  },
  {
    id: 'dru_res_mushroom',
    tree: DRUID_RESTORATION_TREE,
    name: 'Mushroom Paste',
    description: `Activate: smear a potent fungal paste on your wounds — instantly restore ${T.mushroomPaste.heal} HP.`,
    cost: 1,
    prereq: 'dru_res_lye',
    tier: 1,
    effect: {
      kind: 'active',
      action: 'dru_mushroom',
      cooldownMs: T.mushroomPaste.cooldownMs,
      energyCost: T.mushroomPaste.energyCost,
      compose: [{ p: 'heal', amount: T.mushroomPaste.heal }],
    },
  },
  {
    id: 'dru_res_aloe',
    tree: DRUID_RESTORATION_TREE,
    name: 'Aloe',
    description: `Activate: a quick aloe salve — restore ${T.aloe.heal} HP. Cheap and fast.`,
    cost: 1,
    prereq: 'dru_res_mushroom',
    tier: 2,
    effect: {
      kind: 'active',
      action: 'dru_aloe',
      cooldownMs: T.aloe.cooldownMs,
      energyCost: T.aloe.energyCost,
      compose: [{ p: 'heal', amount: T.aloe.heal }],
    },
  },
  {
    id: CLAY_ID,
    tree: DRUID_RESTORATION_TREE,
    name: 'Clay',
    description: `Activate: pack healing clay over your wounds — restore ${T.clay.heal} HP and harden (−${Math.round(T.clay.damageReduction * 100)}% damage taken) for ${(T.clay.buffMs / 1000).toFixed(0)}s.`,
    cost: 1,
    prereq: 'dru_res_aloe',
    tier: 3,
    effect: { kind: 'active', action: 'dru_clay', cooldownMs: T.clay.cooldownMs, energyCost: T.clay.energyCost },
  },
  {
    id: 'dru_res_honey',
    tree: DRUID_RESTORATION_TREE,
    name: 'Honey Spread',
    description: `Activate: slow-mending honey — regenerate ${T.honey.regenPerSec} HP/sec for ${(T.honey.durationMs / 1000).toFixed(0)}s.`,
    cost: 1,
    prereq: CLAY_ID,
    tier: 4,
    effect: { kind: 'buff', cooldownMs: T.honey.cooldownMs, durationMs: T.honey.durationMs, energyCost: T.honey.energyCost, tint: T.honey.tint, stats: { regenPerSec: T.honey.regenPerSec } },
  },
  {
    id: 'dru_res_bark',
    tree: DRUID_RESTORATION_TREE,
    name: 'Bark Armor',
    description: `Activate: living bark sheathes you for ${(T.barkArmor.durationMs / 1000).toFixed(0)}s — −${Math.round(T.barkArmor.damageReduction * 100)}% damage taken and +${Math.round(T.barkArmor.maxHPMult * 100)}% maximum HP.`,
    cost: 1,
    prereq: 'dru_res_honey',
    tier: 5,
    effect: { kind: 'buff', cooldownMs: T.barkArmor.cooldownMs, durationMs: T.barkArmor.durationMs, energyCost: T.barkArmor.energyCost, tint: T.barkArmor.tint, stats: { damageReduction: T.barkArmor.damageReduction, maxHPMult: T.barkArmor.maxHPMult } },
  },
  {
    id: 'dru_res_sage',
    tree: DRUID_RESTORATION_TREE,
    name: 'Sage Burn',
    description: `Activate: trailing sage smoke follows you for ${(T.sageBurn.durationMs / 1000).toFixed(0)}s, slowly healing you and your companions inside it.`,
    cost: 1,
    prereq: 'dru_res_bark',
    tier: 6,
    effect: {
      kind: 'active',
      action: 'dru_sage_burn',
      cooldownMs: T.sageBurn.cooldownMs,
      energyCost: T.sageBurn.energyCost,
      compose: [{ p: 'friendzone', follow: true, radius: T.sageBurn.radius, healPerTick: T.sageBurn.healPerTick, tickMs: T.sageBurn.tickMs, durationMs: T.sageBurn.durationMs, tint: 0xa8c8a0, banner: 'Sage smoke rises' }],
    },
  },
  {
    id: 'dru_res_spores',
    tree: DRUID_RESTORATION_TREE,
    name: 'Healing Spores',
    description: `Activate: seed a wide bed of healing spores here for ${(T.spores.durationMs / 1000).toFixed(0)}s — you and your companions mend while standing in it.`,
    cost: 1,
    prereq: 'dru_res_sage',
    tier: 7,
    effect: {
      kind: 'active',
      action: 'dru_spores',
      cooldownMs: T.spores.cooldownMs,
      energyCost: T.spores.energyCost,
      compose: [{ p: 'friendzone', radius: T.spores.radius, healPerTick: T.spores.healPerTick, tickMs: T.spores.tickMs, durationMs: T.spores.durationMs, tint: 0x9ad8b0, banner: 'Healing spores bloom' }],
    },
  },
  {
    id: OIL_IMMUNITY_ID,
    tree: DRUID_RESTORATION_TREE,
    name: 'Essential Oil of Immunity',
    description: `Activate: anoint yourself and your companions — +resistances (−${Math.round(T.oilImmunity.selfDamageReduction * 100)}% damage taken; summons −${Math.round(T.oilImmunity.summonDrBonus * 100)}%) for ${Math.round(T.oilImmunity.durationMs / 60000)} minutes.`,
    cost: 1,
    prereq: 'dru_res_spores',
    tier: 8,
    effect: { kind: 'active', action: 'dru_oil_immunity', cooldownMs: T.oilImmunity.cooldownMs, energyCost: T.oilImmunity.energyCost },
  },
  {
    id: OIL_VITALITY_ID,
    tree: DRUID_RESTORATION_TREE,
    name: 'Essential Oil of Vitality',
    description: `Activate: anoint yourself and your companions with vitality — +${Math.round(T.oilVitality.selfMaxHPMult * 100)}% maximum HP (summons +${Math.round(T.oilVitality.summonHpBonus * 100)}%) for ${Math.round(T.oilVitality.durationMs / 60000)} minutes.`,
    cost: 1,
    prereq: OIL_IMMUNITY_ID,
    tier: 9,
    effect: { kind: 'active', action: 'dru_oil_vitality', cooldownMs: T.oilVitality.cooldownMs, energyCost: T.oilVitality.energyCost },
  },
];

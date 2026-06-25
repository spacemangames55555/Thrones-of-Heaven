import type { SkillDef } from './skillData';

/**
 * BLACKSMITH — TANK TREE (10 skills, linear chain → Celestial Calcite capstone).
 *
 * EVERY tunable number lives in {@link TANK_TUNING} below — edit there to balance.
 * The skill definitions reference those constants, and the scene's effect handlers
 * (MainScene.runActiveSkill / recomputeSkillEffects) read the action constants by
 * skill key. Names/descriptions are PLACEHOLDER prose — edit the `name`/`description`
 * fields in TANK_TREE_SKILLS.
 *
 * Linear gating: each node lists the previous as its `prereq`, so points unlock the
 * tree top-to-bottom; the capstone needs all 9 priors. Tree id is 'defense' (shown
 * as "Tank" in the UI). Cost defaults to 1 point/node.
 */

// ─── TUNING (all starting values; tune freely) ────────────────────────────────
export const TANK_TUNING = {
  /** 1) GRIT — passive max-HP %. */
  grit: { maxHPMult: 0.2 },
  /** 2) SHIELD BASH — active melee + stun. */
  shieldBash: { damage: 24, range: 70, stunMs: 1000, cooldownMs: 7000, energyCost: 15 },
  /** 3) IRON HIDE — passive damage reduction. */
  ironHide: { damageReduction: 0.15 },
  /** 4) SHOVE — active knockback (low damage). */
  shove: { knockback: 130, radius: 130, damage: 6, stunMs: 250, cooldownMs: 9000, energyCost: 10 },
  /** 5) DOUBLE BLOCK — passive block proc. */
  doubleBlock: { blockChance: 0.25, blockReduction: 0.8 },
  /** 6) SHIELD SWING — active wide frontal arc AoE. */
  shieldSwing: { damage: 30, range: 150, arcReach: 0.6, cooldownMs: 6000, energyCost: 15 },
  /** 7) WAR CHANT — timed buff: +DR + HP regen/sec. */
  warChant: { durationMs: 8000, damageReduction: 0.2, regenPerSec: 6, cooldownMs: 16000, energyCost: 20, tint: 0xff8a3a },
  /** 8) PLOW — active charge: distance + shove + damage along the path. */
  plow: { distance: 320, damage: 26, knockback: 110, cooldownMs: 10000, energyCost: 20 },
  /** 9) DUAL SHIELD — passive: extra DR + added block chance (stacks with Double Block). */
  dualShield: { damageReduction: 0.12, blockChance: 0.15 },
  /** 10) CELESTIAL CALCITE — transformation capstone. */
  calcite: { durationMs: 12000, damageReduction: 0.85, maxHPMult: 0.5, auraDamage: 8, auraRadius: 150, cooldownMs: 60000, tint: 0xfff3c4 },
} as const;

// ─── THE 10 TANK SKILLS (linear; tree 'defense' = "Tank") ─────────────────────
// >>> EDIT NAMES / DESCRIPTIONS HERE (placeholder prose). <<<
export const TANK_TREE_SKILLS: SkillDef[] = [
  {
    id: 'bs_tank_grit',
    tree: 'defense',
    name: 'Grit',
    description: `Toughened flesh. +${Math.round(TANK_TUNING.grit.maxHPMult * 100)}% maximum HP.`,
    cost: 1,
    tier: 0,
    effect: { kind: 'passive', stats: { maxHPMult: TANK_TUNING.grit.maxHPMult } },
  },
  {
    id: 'bs_tank_shield_bash',
    tree: 'defense',
    name: 'Shield Bash',
    description: `Activate: a short shield strike — moderate damage and STUNS hit enemies for ${(TANK_TUNING.shieldBash.stunMs / 1000).toFixed(1)}s.`,
    cost: 1,
    prereq: 'bs_tank_grit',
    tier: 1,
    effect: { kind: 'active', action: 'shield_bash', cooldownMs: TANK_TUNING.shieldBash.cooldownMs, energyCost: TANK_TUNING.shieldBash.energyCost },
  },
  {
    id: 'bs_tank_iron_hide',
    tree: 'defense',
    name: 'Iron Hide',
    description: `Hardened skin. −${Math.round(TANK_TUNING.ironHide.damageReduction * 100)}% incoming damage.`,
    cost: 1,
    prereq: 'bs_tank_shield_bash',
    tier: 2,
    effect: { kind: 'passive', stats: { damageReduction: TANK_TUNING.ironHide.damageReduction } },
  },
  {
    id: 'bs_tank_shove',
    tree: 'defense',
    name: 'Shove',
    description: 'Activate: knock back all nearby enemies, creating space.',
    cost: 1,
    prereq: 'bs_tank_iron_hide',
    tier: 3,
    effect: { kind: 'active', action: 'shove', cooldownMs: TANK_TUNING.shove.cooldownMs, energyCost: TANK_TUNING.shove.energyCost },
  },
  {
    id: 'bs_tank_double_block',
    tree: 'defense',
    name: 'Double Block',
    description: `Passive: ${Math.round(TANK_TUNING.doubleBlock.blockChance * 100)}% chance to BLOCK an incoming hit (−${Math.round(TANK_TUNING.doubleBlock.blockReduction * 100)}% of its damage).`,
    cost: 1,
    prereq: 'bs_tank_shove',
    tier: 4,
    effect: { kind: 'passive', stats: { blockChance: TANK_TUNING.doubleBlock.blockChance, blockReduction: TANK_TUNING.doubleBlock.blockReduction } },
  },
  {
    id: 'bs_tank_shield_swing',
    tree: 'defense',
    name: 'Shield Swing',
    description: 'Activate: a wide shield arc strikes all enemies in front of you.',
    cost: 1,
    prereq: 'bs_tank_double_block',
    tier: 5,
    effect: { kind: 'active', action: 'shield_swing', cooldownMs: TANK_TUNING.shieldSwing.cooldownMs, energyCost: TANK_TUNING.shieldSwing.energyCost },
  },
  {
    id: 'bs_tank_war_chant',
    tree: 'defense',
    name: 'War Chant',
    description: `Activate: for ${(TANK_TUNING.warChant.durationMs / 1000).toFixed(0)}s gain +${Math.round(TANK_TUNING.warChant.damageReduction * 100)}% damage reduction and ${TANK_TUNING.warChant.regenPerSec} HP/sec regen.`,
    cost: 1,
    prereq: 'bs_tank_shield_swing',
    tier: 6,
    effect: {
      kind: 'buff',
      cooldownMs: TANK_TUNING.warChant.cooldownMs,
      durationMs: TANK_TUNING.warChant.durationMs,
      energyCost: TANK_TUNING.warChant.energyCost,
      tint: TANK_TUNING.warChant.tint,
      stats: { damageReduction: TANK_TUNING.warChant.damageReduction, regenPerSec: TANK_TUNING.warChant.regenPerSec },
    },
  },
  {
    id: 'bs_tank_plow',
    tree: 'defense',
    name: 'Plow',
    description: 'Activate: charge forward, shoving aside and damaging enemies in your path.',
    cost: 1,
    prereq: 'bs_tank_war_chant',
    tier: 7,
    effect: { kind: 'active', action: 'plow', cooldownMs: TANK_TUNING.plow.cooldownMs, energyCost: TANK_TUNING.plow.energyCost },
  },
  {
    id: 'bs_tank_dual_shield',
    tree: 'defense',
    name: 'Dual Shield',
    description: `Passive: wield a second shield — −${Math.round(TANK_TUNING.dualShield.damageReduction * 100)}% more incoming damage and +${Math.round(TANK_TUNING.dualShield.blockChance * 100)}% block chance.`,
    cost: 1,
    prereq: 'bs_tank_plow',
    tier: 8,
    effect: { kind: 'passive', stats: { damageReduction: TANK_TUNING.dualShield.damageReduction, blockChance: TANK_TUNING.dualShield.blockChance } },
  },
  {
    id: 'bs_tank_calcite',
    tree: 'defense',
    name: 'Crystal of Celestial Calcite',
    description: `Capstone — Activate: become living celestial calcite for ${(TANK_TUNING.calcite.durationMs / 1000).toFixed(0)}s. Near-invulnerable (−${Math.round(TANK_TUNING.calcite.damageReduction * 100)}% damage), +${Math.round(TANK_TUNING.calcite.maxHPMult * 100)}% max HP, and a radiant aura burns nearby foes. You become a glowing white-gold crystal, then revert.`,
    cost: 1,
    prereq: 'bs_tank_dual_shield',
    tier: 9,
    effect: {
      kind: 'transformation',
      cooldownMs: TANK_TUNING.calcite.cooldownMs,
      durationMs: TANK_TUNING.calcite.durationMs,
      tint: TANK_TUNING.calcite.tint,
      auraDamage: TANK_TUNING.calcite.auraDamage,
      auraRadius: TANK_TUNING.calcite.auraRadius,
      stats: { damageReduction: TANK_TUNING.calcite.damageReduction, maxHPMult: TANK_TUNING.calcite.maxHPMult },
    },
  },
];

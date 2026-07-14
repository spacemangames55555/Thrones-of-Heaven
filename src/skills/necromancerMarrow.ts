import type { SkillDef } from './skillData';

/**
 * NECROMANCER — MARROW TREE (10 skills, linear → Grasp of Death capstone).
 *
 * The Necromancer's TANK/SOLO tree: bone strikes, taunts, a root, a defensive
 * transformation (Marrownaut, node 5), an enemy-defense aura, damage reflect, a
 * charge, and a lifesteal capstone. EVERY tunable lives in {@link MARROW_TUNING};
 * the scene's effect handlers read these by key. The AURA passive (Osteo Aura) and
 * the transformation's bone-suit SCALE are applied by the scene keyed off the
 * exported ids below (they can't be plain stat mods). Reflect (Bone Spur) + the
 * defensive stats (Calcify) ARE plain passive stat mods. Names/descriptions are
 * placeholder prose — edit them in MARROW_TREE_SKILLS. Tree id 'marrow'.
 *
 * His other two trees (Summons; Dark Matter) + their summon foundation are LATER
 * builds — this file is the first Necromancer tree only.
 */

/** Tree id for the Marrow tree (the Necromancer's first/tank tree). */
export const MARROW_TREE = 'marrow';

// Ids the scene keys special passive/transform behaviour off of.
export const MARROWNAUT_ID = 'necro_marrow_marrownaut'; // transform → big bone-suit scale
export const OSTEO_AURA_ID = 'necro_marrow_osteo'; // enemy-defense-reduction aura
export const BONE_SPUR_ID = 'necro_marrow_bone_spur'; // passive reflect

// ─── TUNING (all STARTING values; tune freely in playtest) ────────────────────
export const MARROW_TUNING = {
  /** 1) BONE DART — entry ranged single-target projectile (must defeat the Sasquatch). */
  boneDart: { damage: 26, speed: 520, range: 460, radius: 7, cooldownMs: 600, energyCost: 6 },
  /** 2) SPIKED PUNCH — melee strike that TAUNTS (draws the struck foe's aggro onto you). */
  spikedPunch: { damage: 30, tauntMs: 4000, range: 72, cooldownMs: 1500, energyCost: 8 },
  /** 3) BONE NOVA — shockwave: AoE damage + KNOCKBACK + brief TAUNT around you. */
  boneNova: { damage: 24, radius: 165, knockback: 90, tauntMs: 3000, cooldownMs: 7000, energyCost: 16 },
  /** 4) CALCIFY — passive: +armor (damage reduction) and +max HP. */
  calcify: { damageReduction: 0.12, maxHPMult: 0.15 },
  /** 5) MARROWNAUT — transformation: encase in a bone-suit (big DR + HP + larger form).
   *  Timing: 30s form duration + 30s cooldown. The cooldown is measured from ACTIVATION
   *  (see MainScene.activateSkill), so it clears exactly as the 30s form ends → ~0s
   *  downtime (re-castable right when the bone-suit wears off). */
  marrownaut: { durationMs: 30000, damageReduction: 0.45, maxHPMult: 0.5, scale: 1.5, cooldownMs: 30000, energyCost: 25, tint: 0xe8e2d0 },
  /** 6) STAKE — root one enemy in place (movement-immobilize; it can still act). */
  stake: { damage: 14, rootMs: 7000, range: 84, cooldownMs: 10000, energyCost: 12 },
  /** 7) OSTEO AURA — passive aura: nearby enemies have LOWERED DEFENSE (take more damage). */
  osteoAura: { radius: 170, defenseReduction: 0.25 },
  /** 8) BONE SPUR — passive: attackers take a fraction of the damage they deal you (reflect). */
  boneSpur: { reflectPct: 0.4 },
  /** 9) WRECKING BALL — charge into a group: damage + KNOCKDOWN along the path. */
  wreckingBall: { distance: 320, damage: 28, knockdownMs: 1500, cooldownMs: 11000, energyCost: 20 },
  /** 10) GRASP OF DEATH — capstone: drain a foe's life — damage + HEAL a portion (lifesteal). */
  graspOfDeath: { damage: 40, healPct: 0.6, range: 120, cooldownMs: 9000, energyCost: 18 },
} as const;

// ─── THE 10 MARROW SKILLS (linear; tree 'marrow') ─────────────────────────────
// >>> EDIT NAMES / DESCRIPTIONS HERE (placeholder prose). <<<
export const MARROW_TREE_SKILLS: SkillDef[] = [
  {
    id: 'necro_marrow_bone_dart',
    tree: MARROW_TREE,
    name: 'Bone Dart',
    description: 'Activate: hurl a shard of bone — a fast single-target ranged shot. Your first ability.',
    cost: 1,
    tier: 0,
    effect: {
      kind: 'active',
      action: 'necro_bone_dart',
      cooldownMs: MARROW_TUNING.boneDart.cooldownMs,
      energyCost: MARROW_TUNING.boneDart.energyCost,
      compose: [{ p: 'bolt', damage: MARROW_TUNING.boneDart.damage, speed: MARROW_TUNING.boneDart.speed, range: MARROW_TUNING.boneDart.range, radius: MARROW_TUNING.boneDart.radius, tint: 0xe9e4d6 }],
    },
  },
  {
    id: 'necro_marrow_spiked_punch',
    tree: MARROW_TREE,
    name: 'Spiked Punch',
    description: `Activate: a bone-fist strike that damages and TAUNTS the foe (draws its aggro onto you) for ${(MARROW_TUNING.spikedPunch.tauntMs / 1000).toFixed(0)}s.`,
    cost: 1,
    prereq: 'necro_marrow_bone_dart',
    tier: 1,
    effect: {
      kind: 'active',
      action: 'necro_spiked_punch',
      cooldownMs: MARROW_TUNING.spikedPunch.cooldownMs,
      energyCost: MARROW_TUNING.spikedPunch.energyCost,
      compose: [{ p: 'strike', at: 'front', range: MARROW_TUNING.spikedPunch.range, damage: MARROW_TUNING.spikedPunch.damage, tint: 0xd9d2c2, tauntMs: MARROW_TUNING.spikedPunch.tauntMs }],
    },
  },
  {
    id: 'necro_marrow_bone_nova',
    tree: MARROW_TREE,
    name: 'Bone Nova',
    description: 'Activate: a shockwave of bone — damages, KNOCKS BACK, and briefly TAUNTS nearby enemies.',
    cost: 1,
    prereq: 'necro_marrow_spiked_punch',
    tier: 2,
    effect: {
      kind: 'active',
      action: 'necro_bone_nova',
      cooldownMs: MARROW_TUNING.boneNova.cooldownMs,
      energyCost: MARROW_TUNING.boneNova.energyCost,
      compose: [{ p: 'strike', at: 'self', radius: MARROW_TUNING.boneNova.radius, damage: MARROW_TUNING.boneNova.damage, tint: 0xe9e4d6, knockback: MARROW_TUNING.boneNova.knockback, knockbackStunMs: 160, tauntMs: MARROW_TUNING.boneNova.tauntMs }],
    },
  },
  {
    id: 'necro_marrow_calcify',
    tree: MARROW_TREE,
    name: 'Calcify',
    description: `Passive: bone hardens your flesh — −${Math.round(MARROW_TUNING.calcify.damageReduction * 100)}% damage taken and +${Math.round(MARROW_TUNING.calcify.maxHPMult * 100)}% maximum HP.`,
    cost: 1,
    prereq: 'necro_marrow_bone_nova',
    tier: 3,
    effect: { kind: 'passive', stats: { damageReduction: MARROW_TUNING.calcify.damageReduction, maxHPMult: MARROW_TUNING.calcify.maxHPMult } },
  },
  {
    id: MARROWNAUT_ID,
    tree: MARROW_TREE,
    name: 'Marrownaut',
    description: `Activate: encase yourself in a towering bone-suit for ${(MARROW_TUNING.marrownaut.durationMs / 1000).toFixed(0)}s — a far larger, bone-armored form with −${Math.round(MARROW_TUNING.marrownaut.damageReduction * 100)}% damage taken and +${Math.round(MARROW_TUNING.marrownaut.maxHPMult * 100)}% HP, then revert.`,
    cost: 1,
    prereq: 'necro_marrow_calcify',
    tier: 4,
    effect: {
      kind: 'transformation',
      cooldownMs: MARROW_TUNING.marrownaut.cooldownMs,
      durationMs: MARROW_TUNING.marrownaut.durationMs,
      tint: MARROW_TUNING.marrownaut.tint,
      energyCost: MARROW_TUNING.marrownaut.energyCost,
      stats: { maxHPMult: MARROW_TUNING.marrownaut.maxHPMult, damageReduction: MARROW_TUNING.marrownaut.damageReduction },
    },
  },
  {
    id: 'necro_marrow_stake',
    tree: MARROW_TREE,
    name: 'Stake',
    description: `Activate: drive a bone stake through a foe — ROOTED in place (can't move) for ${(MARROW_TUNING.stake.rootMs / 1000).toFixed(0)}s.`,
    cost: 1,
    prereq: MARROWNAUT_ID,
    tier: 5,
    effect: {
      kind: 'active',
      action: 'necro_stake',
      cooldownMs: MARROW_TUNING.stake.cooldownMs,
      energyCost: MARROW_TUNING.stake.energyCost,
      compose: [{ p: 'strike', at: 'front', range: MARROW_TUNING.stake.range, damage: MARROW_TUNING.stake.damage, noRing: true, rootMs: MARROW_TUNING.stake.rootMs }],
    },
  },
  {
    id: OSTEO_AURA_ID,
    tree: MARROW_TREE,
    name: 'Osteo Aura',
    description: `Passive aura: enemies near you have LOWERED DEFENSE — they take +${Math.round(MARROW_TUNING.osteoAura.defenseReduction * 100)}% damage from you.`,
    cost: 1,
    prereq: 'necro_marrow_stake',
    tier: 6,
    effect: { kind: 'passive', stats: {} }, // aura — applied by the scene (keyed by id)
  },
  {
    id: BONE_SPUR_ID,
    tree: MARROW_TREE,
    name: 'Bone Spur',
    description: `Passive: jagged bone bristles your body — attackers take ${Math.round(MARROW_TUNING.boneSpur.reflectPct * 100)}% of the damage they deal you, reflected back.`,
    cost: 1,
    prereq: OSTEO_AURA_ID,
    tier: 7,
    effect: { kind: 'passive', stats: { reflectPct: MARROW_TUNING.boneSpur.reflectPct } },
  },
  {
    id: 'necro_marrow_wrecking_ball',
    tree: MARROW_TREE,
    name: 'Wrecking Ball',
    description: 'Activate: charge into a crowd — damaging and KNOCKING DOWN every enemy in your path.',
    cost: 1,
    prereq: BONE_SPUR_ID,
    tier: 8,
    effect: { kind: 'active', action: 'necro_wrecking_ball', cooldownMs: MARROW_TUNING.wreckingBall.cooldownMs, energyCost: MARROW_TUNING.wreckingBall.energyCost },
  },
  {
    id: 'necro_marrow_grasp',
    tree: MARROW_TREE,
    name: 'Grasp of Death',
    description: `Capstone — Activate: spectral hands seize a foe, dealing damage and HEALING you for ${Math.round(MARROW_TUNING.graspOfDeath.healPct * 100)}% of it.`,
    cost: 1,
    prereq: 'necro_marrow_wrecking_ball',
    tier: 9,
    effect: {
      kind: 'active',
      action: 'necro_grasp',
      cooldownMs: MARROW_TUNING.graspOfDeath.cooldownMs,
      energyCost: MARROW_TUNING.graspOfDeath.energyCost,
      compose: [{ p: 'drain', range: MARROW_TUNING.graspOfDeath.range, damage: MARROW_TUNING.graspOfDeath.damage, healPct: MARROW_TUNING.graspOfDeath.healPct, tint: 0x9a6cff }],
    },
  },
];

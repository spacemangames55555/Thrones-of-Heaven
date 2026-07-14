import type { SkillDef } from './skillData';

/**
 * NECROMANCER — DARK MATTER TREE (10 skills; LINEAR → Singularity capstone).
 *
 * His THIRD and final tree: ranged DPS + debuffs, authored purely as DATA on systems that
 * already exist + are tested (projectiles, projectile+splash, the cone pattern, ranged AoE,
 * slow/weaken debuffs, the Osteo-style defense-down amplifier, the passive damaging/slowing
 * aura pattern, the stacking-DoT primitive, the channel primitive, and knockback — reversed
 * into a PULL for the capstone). NO new tech.
 *
 * Node 1 (Dark Energy Blip) is the entry damaging active (a fast, spammable bolt) — it
 * defeats the opening Sasquatch. EVERY tunable lives in {@link DM_TUNING}. Blight is a
 * PASSIVE aura applied by the scene keyed off {@link BLIGHT_ID}; the rest wire to actions /
 * the channel + stacking-DoT effect kinds.
 *
 * >>> EDIT NAMES / DESCRIPTIONS (placeholder prose) + NUMBERS HERE. <<<
 */

export const DARK_MATTER_TREE = 'dark_matter';

/** Id the scene keys the BLIGHT passive aura off of (node 7). */
export const BLIGHT_ID = 'necro_dm_blight';

// ─── TUNING (all STARTING values; tune freely in playtest) ────────────────────
export const DM_TUNING = {
  /** 1) DARK ENERGY BLIP — fast cheap bolt (the spammable basic; defeats the Sasquatch). */
  blip: { damage: 18, speed: 620, range: 480, radius: 6, cooldownMs: 350, energyCost: 4 },
  /** 2) DARK MATTER BOMB — lobbed bolt: big single hit + splash AoE on impact. */
  bomb: { directDamage: 30, splashDamage: 22, splashRadius: 90, speed: 460, range: 420, radius: 9, cooldownMs: 4000, energyCost: 16 },
  /** 3) TAINTED DARK MATTER — bolt that damages AND lowers DEFENSE (foes take more damage) for a window. */
  tainted: { damage: 22, defenseReduction: 0.3, debuffMs: 5000, speed: 540, range: 460, radius: 8, cooldownMs: 6000, energyCost: 14 },
  /** 4) HEX OF ENTROPY — debuff: SLOW + WEAKEN the target briefly; tiny damage. */
  hex: { slowFactor: 0.5, weaken: 0.4, durationMs: 2000, range: 360, radius: 70, damage: 4, cooldownMs: 7000, energyCost: 10 },
  /** 5) ABYSSAL BLAST — cone of dark energy in front of the player. */
  abyssal: { damage: 34, range: 200, coneHalfAngleDeg: 35, cooldownMs: 6000, energyCost: 18 },
  /** 6) DARK ENERGY RIFT — ranged AoE: a rift at a spot ahead hits everything around it. */
  rift: { damage: 30, radius: 130, range: 300, cooldownMs: 7000, energyCost: 18 },
  /** 7) BLIGHT — PASSIVE aura: chilling field that DAMAGES + SLOWS nearby enemies while unlocked. */
  blight: { dmgPerTick: 6, tickMs: 700, slowFactor: 0.6, radius: 150 },
  /** 8) INTERNAL COLLAPSE — stacking DoT (reuses the stacking-DoT primitive). */
  internalCollapse: { dmgPerTick: 10, tickMs: 600, durationMs: 3000, maxStacks: 5, range: 360, cooldownMs: 900, energyCost: 7, color: 0x6a3fb0 },
  /** 9) DARK ENERGY BEAM — channeled beam (reuses the channel primitive; resource gain off). */
  beam: { range: 360, durationMs: 10000, damagePerTick: 16, tickMs: 500, cooldownMs: 9000, energyCost: 12, resourcePerSec: 0, interruptCooldownFraction: 1 },
  /** 10) SINGULARITY — capstone: a black-hole at a spot ahead that PULLS foes in + heavy AoE over its life. */
  singularity: { placeAhead: 200, radius: 200, pullStrength: 14, damagePerTick: 22, durationMs: 4000, pulses: 8, cooldownMs: 45000, energyCost: 40 },
} as const;

// ─── THE 10 DARK MATTER SKILLS (tree 'dark_matter'; linear; capstone last) ────
export const DARK_MATTER_TREE_SKILLS: SkillDef[] = [
  {
    id: 'necro_dm_blip',
    tree: DARK_MATTER_TREE,
    name: 'Dark Energy Blip',
    description: 'Activate: a fast, cheap dark-energy bolt on a short cooldown — your spammable ranged attack. Your starting offense.',
    cost: 1,
    tier: 0,
    effect: {
      kind: 'active',
      action: 'necro_dm_blip',
      cooldownMs: DM_TUNING.blip.cooldownMs,
      energyCost: DM_TUNING.blip.energyCost,
      compose: [{ p: 'bolt', damage: DM_TUNING.blip.damage, speed: DM_TUNING.blip.speed, range: DM_TUNING.blip.range, radius: DM_TUNING.blip.radius, tint: 0xb98bff }],
    },
  },
  {
    id: 'necro_dm_bomb',
    tree: DARK_MATTER_TREE,
    name: 'Dark Matter Bomb',
    description: 'Activate: lob a dense dark-matter bolt — big single-target damage plus a splash blast on impact.',
    cost: 1,
    prereq: 'necro_dm_blip',
    tier: 1,
    effect: {
      kind: 'active',
      action: 'necro_dm_bomb',
      cooldownMs: DM_TUNING.bomb.cooldownMs,
      energyCost: DM_TUNING.bomb.energyCost,
      compose: [{ p: 'bolt', damage: DM_TUNING.bomb.directDamage, speed: DM_TUNING.bomb.speed, range: DM_TUNING.bomb.range, radius: DM_TUNING.bomb.radius, tint: 0x7a3fb0, splash: { radius: DM_TUNING.bomb.splashRadius, damage: DM_TUNING.bomb.splashDamage } }],
    },
  },
  {
    id: 'necro_dm_tainted',
    tree: DARK_MATTER_TREE,
    name: 'Tainted Dark Matter',
    description: `Activate: a corrupting bolt — damages and LOWERS DEFENSE (foes take +${Math.round(DM_TUNING.tainted.defenseReduction * 100)}% damage) for ${(DM_TUNING.tainted.debuffMs / 1000).toFixed(0)}s.`,
    cost: 1,
    prereq: 'necro_dm_bomb',
    tier: 2,
    effect: {
      kind: 'active',
      action: 'necro_dm_tainted',
      cooldownMs: DM_TUNING.tainted.cooldownMs,
      energyCost: DM_TUNING.tainted.energyCost,
      compose: [{ p: 'bolt', damage: DM_TUNING.tainted.damage, speed: DM_TUNING.tainted.speed, range: DM_TUNING.tainted.range, radius: DM_TUNING.tainted.radius, tint: 0x9a5cff, vuln: { mult: DM_TUNING.tainted.defenseReduction, durationMs: DM_TUNING.tainted.debuffMs, banner: 'Defenses tainted' } }],
    },
  },
  {
    id: 'necro_dm_hex',
    tree: DARK_MATTER_TREE,
    name: 'Hex of Entropy',
    description: `Activate: a withering hex — SLOWS movement and WEAKENS damage dealt for ${(DM_TUNING.hex.durationMs / 1000).toFixed(0)}s. Little direct damage.`,
    cost: 1,
    prereq: 'necro_dm_tainted',
    tier: 3,
    effect: {
      kind: 'active',
      action: 'necro_dm_hex',
      cooldownMs: DM_TUNING.hex.cooldownMs,
      energyCost: DM_TUNING.hex.energyCost,
      compose: [{
        p: 'strike', at: 'nearest', range: DM_TUNING.hex.range, radius: DM_TUNING.hex.radius, damage: DM_TUNING.hex.damage, tint: 0x6a3fb0,
        slowFactor: DM_TUNING.hex.slowFactor, slowMs: DM_TUNING.hex.durationMs, weaken: DM_TUNING.hex.weaken, weakenMs: DM_TUNING.hex.durationMs,
        missBanner: 'No target in range',
      }],
    },
  },
  {
    id: 'necro_dm_abyssal',
    tree: DARK_MATTER_TREE,
    name: 'Abyssal Blast',
    description: 'Activate: a powerful blast of dark energy in a cone in front of you.',
    cost: 1,
    prereq: 'necro_dm_hex',
    tier: 4,
    effect: {
      kind: 'active',
      action: 'necro_dm_abyssal',
      cooldownMs: DM_TUNING.abyssal.cooldownMs,
      energyCost: DM_TUNING.abyssal.energyCost,
      compose: [{ p: 'cone', range: DM_TUNING.abyssal.range, halfAngleDeg: DM_TUNING.abyssal.coneHalfAngleDeg, damage: DM_TUNING.abyssal.damage, tint: 0x9a5cff }],
    },
  },
  {
    id: 'necro_dm_rift',
    tree: DARK_MATTER_TREE,
    name: 'Dark Energy Rift',
    description: 'Activate: tear a rift of dark energy at a spot ahead — it damages the target area and everything around it.',
    cost: 1,
    prereq: 'necro_dm_abyssal',
    tier: 5,
    effect: {
      kind: 'active',
      action: 'necro_dm_rift',
      cooldownMs: DM_TUNING.rift.cooldownMs,
      energyCost: DM_TUNING.rift.energyCost,
      compose: [{ p: 'strike', at: 'ahead', range: DM_TUNING.rift.range, radius: DM_TUNING.rift.radius, damage: DM_TUNING.rift.damage, tint: 0x7a3fb0 }],
    },
  },
  {
    id: BLIGHT_ID,
    tree: DARK_MATTER_TREE,
    name: 'Blight',
    description: 'Passive aura: a chilling field of dark matter surrounds you — it DAMAGES and SLOWS nearby enemies while unlocked.',
    cost: 1,
    prereq: 'necro_dm_rift',
    tier: 6,
    effect: { kind: 'passive', stats: {} }, // applied by the scene (damaging + slowing aura)
  },
  {
    id: 'necro_dm_internal_collapse',
    tree: DARK_MATTER_TREE,
    name: 'Internal Collapse',
    description: `Activate: seed dark energy inside a foe — it damages from within over ${(DM_TUNING.internalCollapse.durationMs / 1000).toFixed(0)}s and STACKS on repeat casts (up to ${DM_TUNING.internalCollapse.maxStacks}).`,
    cost: 1,
    prereq: BLIGHT_ID,
    tier: 7,
    effect: {
      kind: 'stacking_dot',
      cooldownMs: DM_TUNING.internalCollapse.cooldownMs,
      range: DM_TUNING.internalCollapse.range,
      dmgPerTick: DM_TUNING.internalCollapse.dmgPerTick,
      tickMs: DM_TUNING.internalCollapse.tickMs,
      durationMs: DM_TUNING.internalCollapse.durationMs,
      maxStacks: DM_TUNING.internalCollapse.maxStacks,
      energyCost: DM_TUNING.internalCollapse.energyCost,
      color: DM_TUNING.internalCollapse.color,
    },
  },
  {
    id: 'necro_dm_beam',
    tree: DARK_MATTER_TREE,
    name: 'Dark Energy Beam',
    description: 'Activate channel: tap to lock the nearest enemy and drain it with a dark-energy stream for up to 10s (or until it dies). MOVING or any other skill cancels it.',
    cost: 1,
    prereq: 'necro_dm_internal_collapse',
    tier: 8,
    effect: {
      kind: 'channel',
      cooldownMs: DM_TUNING.beam.cooldownMs,
      range: DM_TUNING.beam.range,
      durationMs: DM_TUNING.beam.durationMs,
      damagePerTick: DM_TUNING.beam.damagePerTick,
      tickMs: DM_TUNING.beam.tickMs,
      energyCost: DM_TUNING.beam.energyCost,
      resourcePerSec: DM_TUNING.beam.resourcePerSec,
      interruptCooldownFraction: DM_TUNING.beam.interruptCooldownFraction,
    },
  },
  {
    id: 'necro_dm_singularity',
    tree: DARK_MATTER_TREE,
    name: 'Singularity',
    description: `Capstone — Activate: collapse dark matter into a singularity ahead for ${(DM_TUNING.singularity.durationMs / 1000).toFixed(0)}s — it PULLS nearby enemies toward its center and deals heavy AoE damage over its life.`,
    cost: 1,
    prereq: 'necro_dm_beam',
    tier: 9,
    effect: { kind: 'active', action: 'necro_dm_singularity', cooldownMs: DM_TUNING.singularity.cooldownMs, energyCost: DM_TUNING.singularity.energyCost },
  },
];

import type { SkillDef } from './skillData';

/**
 * MAGE — ARCANE SPECIALIZATION TREE (10 skills, linear).
 *
 * The Mage's second tree: raw arcana + essence economy. CANON: Mage ≠ Wizard —
 * nothing here aliases Wizard content. The resource IS the standard energy pool
 * (resource naming is not per-class in this build; "Quantum Essence" flavor lives
 * in prose only). Conventions as always: EVERY tunable in {@link ARCANE_TUNING}
 * with calibration anchors; placeholder prose. Linear prereqs; tree id
 * 'mage_arcane'. Tier-0 is a DAMAGING ACTIVE (no-kit rule).
 *
 * Composed where the primitives cover it; the fan burst, the leech shot, essence
 * restore, the Black Hole pull and the Entangled Chains ultimate dispatch by id.
 * Arcane Absorption is a KEYED passive (scene adds its energy regen while unlocked).
 */

export const MAGE_ARCANE_TREE = 'mage_arcane';

/** Id the scene keys the Arcane Absorption energy-regen passive off of. */
export const MAGE_ABSORPTION_ID = 'mage_ar_absorption';

// ─── TUNING (all starting values; tune freely in playtest) ────────────────────
export const ARCANE_TUNING = {
  /** 1) ARCANE ORB — ENTRY lobbed concentrated bolt (vs Ethereal Bolt 26/1.3s/9;
   *  slower + fatter). */
  arcaneOrb: { damage: 26, speed: 420, range: 340, radius: 14, cooldownMs: 1500, energyCost: 9 },
  /** 2) ARCANE BLAST — rapid multi-bolt burst (vs Flicker's 4×12 over 36°). */
  arcaneBlast: { boltCount: 3, damageEach: 12, spreadDeg: 24, speed: 520, range: 300, radius: 8, cooldownMs: 3500, energyCost: 14 },
  /** 3) ARCANE INFUSION — spell-damage self buff (vs Crazed's +40% with a downside;
   *  here a clean +25%). */
  arcaneInfusion: { damageMult: 0.25, durationMs: 8000, cooldownMs: 16000, energyCost: 20, tint: 0xc09aff },
  /** 4) QUANTUM SHIELDING — absorb shield (= Mana Shield's 60 / 8s / 14s). */
  quantumShielding: { amount: 60, durationMs: 8000, cooldownMs: 14000, energyCost: 22 },
  /** 5) ARCANE MISSILES — barrage of SEEKING bolts (total ≈ Flicker's burst). */
  arcaneMissiles: { boltCount: 4, damageEach: 9, speed: 460, range: 420, radius: 8, cooldownMs: 6000, energyCost: 18 },
  /** 6) ARCANE LEECH SHOT — drain essence from nearby foes, release one empowered
   *  bolt (+damage per foe drained). */
  leechShot: { radius: 160, energyPerEnemy: 6, maxEnemies: 4, boltDamage: 20, bonusPerEnemy: 6, speed: 480, range: 360, boltRadius: 10, cooldownMs: 9000, energyCost: 8 },
  /** 7) ARCANE ABSORPTION — KEYED passive: +essence regeneration while unlocked
   *  (on top of the baseline out-of-combat energy regen). */
  absorption: { regenPerSec: 4 },
  /** 8) MANA SURGE — burst-restore essence. */
  manaSurge: { restore: 40, cooldownMs: 18000, energyCost: 0 },
  /** 9) BLACK HOLE — strong localized pull + damage field (the shared Singularity
   *  machinery at a smaller scale). */
  blackHole: { placeAhead: 180, radius: 150, pullStrength: 10, damagePerTick: 10, durationMs: 3000, pulses: 6, cooldownMs: 16000, energyCost: 24, banner: 'Black Hole', tint: 0x4a2a8f },
  /** 10) ENTANGLED CHAINS — ultimate: bind enemies together; damage + control are
   *  SHARED between them (the entangle extension). All tunables here. */
  entangledChains: { radius: 300, count: 4, sharePct: 0.5, durationMs: 6000, cooldownMs: 30000, energyCost: 35 },
} as const;

const T = ARCANE_TUNING;

// ─── THE 10 ARCANE SKILLS (linear; tree 'mage_arcane') ────────────────────────
// >>> EDIT NAMES / DESCRIPTIONS HERE (placeholder prose). <<<
export const MAGE_ARCANE_SKILLS: SkillDef[] = [
  {
    id: 'mage_ar_orb',
    tree: MAGE_ARCANE_TREE,
    name: 'Arcane Orb',
    description: 'Activate: lob a dense orb of concentrated arcana at the first enemy it meets. Your reliable opener.',
    cost: 1,
    tier: 0,
    effect: {
      kind: 'active',
      action: 'mage_arcane_orb',
      cooldownMs: T.arcaneOrb.cooldownMs,
      energyCost: T.arcaneOrb.energyCost,
      compose: [{ p: 'bolt', damage: T.arcaneOrb.damage, speed: T.arcaneOrb.speed, range: T.arcaneOrb.range, radius: T.arcaneOrb.radius, tint: 0xc09aff }],
    },
  },
  {
    id: 'mage_ar_blast',
    tree: MAGE_ARCANE_TREE,
    name: 'Arcane Blast',
    description: `Activate: a rapid-fire burst of ${T.arcaneBlast.boltCount} arcane bolts fanned in front of you.`,
    cost: 1,
    prereq: 'mage_ar_orb',
    tier: 1,
    effect: { kind: 'active', action: 'mage_arcane_blast', cooldownMs: T.arcaneBlast.cooldownMs, energyCost: T.arcaneBlast.energyCost },
  },
  {
    id: 'mage_ar_infusion',
    tree: MAGE_ARCANE_TREE,
    name: 'Arcane Infusion',
    description: `Activate: infuse yourself with raw arcana for ${(T.arcaneInfusion.durationMs / 1000).toFixed(0)}s — +${Math.round(T.arcaneInfusion.damageMult * 100)}% damage.`,
    cost: 1,
    prereq: 'mage_ar_blast',
    tier: 2,
    effect: { kind: 'buff', cooldownMs: T.arcaneInfusion.cooldownMs, durationMs: T.arcaneInfusion.durationMs, energyCost: T.arcaneInfusion.energyCost, tint: T.arcaneInfusion.tint, stats: { damageMult: T.arcaneInfusion.damageMult } },
  },
  {
    id: 'mage_ar_quantum_shield',
    tree: MAGE_ARCANE_TREE,
    name: 'Quantum Shielding',
    description: `Activate: weave a quantum barrier that ABSORBS the next ${T.quantumShielding.amount} damage (lasts up to ${(T.quantumShielding.durationMs / 1000).toFixed(0)}s).`,
    cost: 1,
    prereq: 'mage_ar_infusion',
    tier: 3,
    effect: {
      kind: 'active',
      action: 'mage_quantum_shield',
      cooldownMs: T.quantumShielding.cooldownMs,
      energyCost: T.quantumShielding.energyCost,
      compose: [{ p: 'shield', amount: T.quantumShielding.amount, durationMs: T.quantumShielding.durationMs, banner: 'Quantum Shielding up' }],
    },
  },
  {
    id: 'mage_ar_missiles',
    tree: MAGE_ARCANE_TREE,
    name: 'Arcane Missiles',
    description: `Activate: loose ${T.arcaneMissiles.boltCount} arcane missiles that HOME toward your foe, curving in flight.`,
    cost: 1,
    prereq: 'mage_ar_quantum_shield',
    tier: 4,
    effect: {
      kind: 'active',
      action: 'mage_missiles',
      cooldownMs: T.arcaneMissiles.cooldownMs,
      energyCost: T.arcaneMissiles.energyCost,
      compose: [
        { p: 'bolt', damage: T.arcaneMissiles.damageEach, speed: T.arcaneMissiles.speed, range: T.arcaneMissiles.range, radius: T.arcaneMissiles.radius, tint: 0xd0b0ff, seek: true },
        { p: 'bolt', damage: T.arcaneMissiles.damageEach, speed: T.arcaneMissiles.speed, range: T.arcaneMissiles.range, radius: T.arcaneMissiles.radius, tint: 0xd0b0ff, seek: true },
        { p: 'bolt', damage: T.arcaneMissiles.damageEach, speed: T.arcaneMissiles.speed, range: T.arcaneMissiles.range, radius: T.arcaneMissiles.radius, tint: 0xd0b0ff, seek: true },
        { p: 'bolt', damage: T.arcaneMissiles.damageEach, speed: T.arcaneMissiles.speed, range: T.arcaneMissiles.range, radius: T.arcaneMissiles.radius, tint: 0xd0b0ff, seek: true },
      ],
    },
  },
  {
    id: 'mage_ar_leech',
    tree: MAGE_ARCANE_TREE,
    name: 'Arcane Leech Shot',
    description: `Activate: siphon essence from nearby enemies (restores energy per foe drained), then release ONE empowered bolt — harder for every foe it fed on.`,
    cost: 1,
    prereq: 'mage_ar_missiles',
    tier: 5,
    effect: { kind: 'active', action: 'mage_leech', cooldownMs: T.leechShot.cooldownMs, energyCost: T.leechShot.energyCost },
  },
  {
    id: MAGE_ABSORPTION_ID,
    tree: MAGE_ARCANE_TREE,
    name: 'Arcane Absorption',
    description: `Passive: ambient arcana seeps back into you — +${T.absorption.regenPerSec} energy/sec regeneration.`,
    cost: 1,
    prereq: 'mage_ar_leech',
    tier: 6,
    effect: { kind: 'passive', stats: {} }, // keyed — the scene adds the energy regen while unlocked
  },
  {
    id: 'mage_ar_mana_surge',
    tree: MAGE_ARCANE_TREE,
    name: 'Mana Surge',
    description: `Activate: rip a surge of raw essence out of the air — instantly restore ${T.manaSurge.restore} energy.`,
    cost: 1,
    prereq: MAGE_ABSORPTION_ID,
    tier: 7,
    effect: { kind: 'active', action: 'mage_mana_surge', cooldownMs: T.manaSurge.cooldownMs, energyCost: T.manaSurge.energyCost },
  },
  {
    id: 'mage_ar_black_hole',
    tree: MAGE_ARCANE_TREE,
    name: 'Black Hole',
    description: `Activate: open a hungry black hole ahead for ${(T.blackHole.durationMs / 1000).toFixed(0)}s — it drags enemies in and grinds them down.`,
    cost: 1,
    prereq: 'mage_ar_mana_surge',
    tier: 8,
    effect: { kind: 'active', action: 'mage_black_hole', cooldownMs: T.blackHole.cooldownMs, energyCost: T.blackHole.energyCost },
  },
  {
    id: 'mage_ar_entangled_chains',
    tree: MAGE_ARCANE_TREE,
    name: 'Entangled Chains',
    description: `Ultimate — Activate: quantum-entangle up to ${T.entangledChains.count} nearby enemies for ${(T.entangledChains.durationMs / 1000).toFixed(0)}s: ${Math.round(T.entangledChains.sharePct * 100)}% of any damage one takes strikes them ALL, and stunning or slowing one afflicts them all.`,
    cost: 1,
    prereq: 'mage_ar_black_hole',
    tier: 9,
    effect: { kind: 'active', action: 'mage_entangle', cooldownMs: T.entangledChains.cooldownMs, energyCost: T.entangledChains.energyCost },
  },
];

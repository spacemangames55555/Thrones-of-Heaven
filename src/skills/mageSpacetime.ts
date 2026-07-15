import type { SkillDef } from './skillData';

/**
 * MAGE — SPACETIME MANIPULATIONS TREE (10 skills, linear).
 *
 * The Mage's first tree: bending space and time. CANON: the Mage (Moscow) and the
 * Wizard (Egypt) are DIFFERENT classes — nothing here aliases or references Wizard
 * content. Same conventions as every tree file: EVERY tunable lives in
 * {@link SPACETIME_TUNING} with per-skill calibration anchors; names/descriptions
 * are PLACEHOLDER prose. Linear prereqs; tree id 'mage_spacetime'. Tier-0 is a
 * DAMAGING ACTIVE (no-kit rule).
 *
 * Composed where the primitives cover it; the pulls (Contraction / Graviton Surge /
 * Singularity Collapse — the shared pull + Singularity machinery) dispatch by action id.
 */

export const MAGE_SPACETIME_TREE = 'mage_spacetime';

// ─── TUNING (all starting values; tune freely in playtest) ────────────────────
export const SPACETIME_TUNING = {
  /** 1) QUANTUM BLAST — ENTRY high-damage single-target bolt (vs Fireball 26/1.2s/8). */
  quantumBlast: { damage: 30, speed: 520, range: 360, radius: 11, cooldownMs: 1800, energyCost: 10 },
  /** 2) CONTRACTION — condense space: pull enemies inward + damage (pull vs Shove's
   *  130px knockback, inverted; damage low like Shove's 6). */
  contraction: { radius: 140, pull: 120, damage: 10, cooldownMs: 9000, energyCost: 16 },
  /** 3) TIME DILATION — self-centered slow field (vs Black Ice 0.45/r95/5s). */
  timeDilation: { radius: 150, slowFactor: 0.5, durationMs: 5000, tickMs: 250, cooldownMs: 10000, energyCost: 18 },
  /** 4) PHOTON BEAM — continuous laser (= the channel primitive; vs Death Channel
   *  360/14 per 500ms/10s — here faster ticks, shorter). */
  photonBeam: { range: 340, durationMs: 8000, damagePerTick: 12, tickMs: 400, cooldownMs: 8000, energyCost: 10, interruptCooldownFraction: 1 },
  /** 5) TEMPORAL ACCELERATION — self haste (vs Crazed's +60% attack speed / 8s). */
  temporalAcceleration: { attackSpeedMult: 0.4, moveSpeedMult: 0.2, durationMs: 8000, cooldownMs: 16000, energyCost: 20, tint: 0x9ad8ff },
  /** 6) GRAVITON SURGE — mini gravity well ahead: pull + STUN + minor damage
   *  (stun vs Shield Bash's 1s). */
  gravitonSurge: { placeAhead: 180, radius: 130, pull: 90, stunMs: 900, damage: 8, cooldownMs: 12000, energyCost: 20 },
  /** 7) ANTIMATTER BURST — placed AoE explosion (vs Immolation 34/r120). */
  antimatterBurst: { placeAhead: 200, radius: 130, damage: 34, cooldownMs: 8000, energyCost: 20 },
  /** 8) SPATIAL DISTORTION — evasion + damage reduction self buff (DR vs War Chant's
   *  0.2; evasion = block chance vs Double Block's 0.25). */
  spatialDistortion: { damageReduction: 0.25, blockChance: 0.25, blockReduction: 1, durationMs: 8000, cooldownMs: 16000, energyCost: 20, tint: 0xbfa8ff },
  /** 9) WORMHOLE RIFT — the wormhole composite: a damaging portal at the origin +
   *  a short teleport out (portal vs Lava 12/r82/3s; hop vs Blink's 240px). */
  wormholeRift: { portalRadius: 90, portalTickDamage: 10, portalTickMs: 400, portalDurationMs: 3000, distance: 240, cooldownMs: 10000, energyCost: 20 },
  /** 10) SINGULARITY COLLAPSE — ultimate: miniature black hole (the shared Singularity
   *  machinery; vs Dark Matter's 22/pulse ×8 / r200 / 45s cd — slightly gentler). */
  singularityCollapse: { placeAhead: 200, radius: 190, pullStrength: 12, damagePerTick: 20, durationMs: 4000, pulses: 8, cooldownMs: 50000, energyCost: 40, banner: 'SINGULARITY COLLAPSE', tint: 0x8a5cff },
} as const;

const T = SPACETIME_TUNING;
const pct = (mult: number): number => Math.round((1 - mult) * 100); // slow factor → "−N% speed"

// ─── THE 10 SPACETIME SKILLS (linear; tree 'mage_spacetime') ──────────────────
// >>> EDIT NAMES / DESCRIPTIONS HERE (placeholder prose). <<<
export const MAGE_SPACETIME_SKILLS: SkillDef[] = [
  {
    id: 'mage_st_quantum_blast',
    tree: MAGE_SPACETIME_TREE,
    name: 'Quantum Blast',
    description: 'Activate: collapse a probability wave into a single devastating bolt. Your reliable opener.',
    cost: 1,
    tier: 0,
    effect: {
      kind: 'active',
      action: 'mage_quantum_blast',
      cooldownMs: T.quantumBlast.cooldownMs,
      energyCost: T.quantumBlast.energyCost,
      compose: [{ p: 'bolt', via: 'aimed', damage: T.quantumBlast.damage, speed: T.quantumBlast.speed, range: T.quantumBlast.range, radius: T.quantumBlast.radius, tint: 0x9ad0ff }],
    },
  },
  {
    id: 'mage_st_contraction',
    tree: MAGE_SPACETIME_TREE,
    name: 'Contraction',
    description: 'Activate: condense the space around you — nearby enemies are dragged inward and crushed.',
    cost: 1,
    prereq: 'mage_st_quantum_blast',
    tier: 1,
    effect: { kind: 'active', action: 'mage_contraction', cooldownMs: T.contraction.cooldownMs, energyCost: T.contraction.energyCost },
  },
  {
    id: 'mage_st_time_dilation',
    tree: MAGE_SPACETIME_TREE,
    name: 'Time Dilation',
    description: `Activate: dilate time in a field around you for ${(T.timeDilation.durationMs / 1000).toFixed(0)}s — enemies inside move −${pct(T.timeDilation.slowFactor)}% slower.`,
    cost: 1,
    prereq: 'mage_st_contraction',
    tier: 2,
    effect: {
      kind: 'active',
      action: 'mage_time_dilation',
      cooldownMs: T.timeDilation.cooldownMs,
      energyCost: T.timeDilation.energyCost,
      compose: [{ p: 'hazard', at: 'self', radius: T.timeDilation.radius, tickDamage: 0, tickMs: T.timeDilation.tickMs, durationMs: T.timeDilation.durationMs, slowFactor: T.timeDilation.slowFactor, fill: 0x3a5a8f, stroke: 0x9ad8ff }],
    },
  },
  {
    id: 'mage_st_photon_beam',
    tree: MAGE_SPACETIME_TREE,
    name: 'Photon Beam',
    description: 'Activate channel: tap to lock the nearest enemy and burn it with a continuous laser. MOVING or any other skill cancels it.',
    cost: 1,
    prereq: 'mage_st_time_dilation',
    tier: 3,
    effect: {
      kind: 'channel',
      cooldownMs: T.photonBeam.cooldownMs,
      range: T.photonBeam.range,
      durationMs: T.photonBeam.durationMs,
      damagePerTick: T.photonBeam.damagePerTick,
      tickMs: T.photonBeam.tickMs,
      energyCost: T.photonBeam.energyCost,
      interruptCooldownFraction: T.photonBeam.interruptCooldownFraction,
    },
  },
  {
    id: 'mage_st_temporal_acceleration',
    tree: MAGE_SPACETIME_TREE,
    name: 'Temporal Acceleration',
    description: `Activate: accelerate your personal timeline for ${(T.temporalAcceleration.durationMs / 1000).toFixed(0)}s — +${Math.round(T.temporalAcceleration.attackSpeedMult * 100)}% attack speed and +${Math.round(T.temporalAcceleration.moveSpeedMult * 100)}% move speed.`,
    cost: 1,
    prereq: 'mage_st_photon_beam',
    tier: 4,
    effect: { kind: 'buff', cooldownMs: T.temporalAcceleration.cooldownMs, durationMs: T.temporalAcceleration.durationMs, energyCost: T.temporalAcceleration.energyCost, tint: T.temporalAcceleration.tint, stats: { attackSpeedMult: T.temporalAcceleration.attackSpeedMult, moveSpeedMult: T.temporalAcceleration.moveSpeedMult } },
  },
  {
    id: 'mage_st_graviton_surge',
    tree: MAGE_SPACETIME_TREE,
    name: 'Graviton Surge',
    description: `Activate: spike gravity ahead — enemies are wrenched toward the well and STUNNED for ${(T.gravitonSurge.stunMs / 1000).toFixed(1)}s.`,
    cost: 1,
    prereq: 'mage_st_temporal_acceleration',
    tier: 5,
    effect: { kind: 'active', action: 'mage_graviton', cooldownMs: T.gravitonSurge.cooldownMs, energyCost: T.gravitonSurge.energyCost },
  },
  {
    id: 'mage_st_antimatter_burst',
    tree: MAGE_SPACETIME_TREE,
    name: 'Antimatter Burst',
    description: 'Activate: annihilate a pocket of space ahead — a violent explosion that scours everything caught in it.',
    cost: 1,
    prereq: 'mage_st_graviton_surge',
    tier: 6,
    effect: {
      kind: 'active',
      action: 'mage_antimatter',
      cooldownMs: T.antimatterBurst.cooldownMs,
      energyCost: T.antimatterBurst.energyCost,
      compose: [{ p: 'strike', at: 'ahead', range: T.antimatterBurst.placeAhead, radius: T.antimatterBurst.radius, damage: T.antimatterBurst.damage, tint: 0xd0b0ff }],
    },
  },
  {
    id: 'mage_st_spatial_distortion',
    tree: MAGE_SPACETIME_TREE,
    name: 'Spatial Distortion',
    description: `Activate: blur your position in space for ${(T.spatialDistortion.durationMs / 1000).toFixed(0)}s — ${Math.round(T.spatialDistortion.blockChance * 100)}% of hits MISS you entirely and the rest land −${Math.round(T.spatialDistortion.damageReduction * 100)}% weaker.`,
    cost: 1,
    prereq: 'mage_st_antimatter_burst',
    tier: 7,
    effect: { kind: 'buff', cooldownMs: T.spatialDistortion.cooldownMs, durationMs: T.spatialDistortion.durationMs, energyCost: T.spatialDistortion.energyCost, tint: T.spatialDistortion.tint, stats: { damageReduction: T.spatialDistortion.damageReduction, blockChance: T.spatialDistortion.blockChance, blockReduction: T.spatialDistortion.blockReduction } },
  },
  {
    id: 'mage_st_wormhole_rift',
    tree: MAGE_SPACETIME_TREE,
    name: 'Wormhole Rift',
    description: 'Activate: tear a wormhole and step through it — you exit a short way ahead while the raw portal left behind burns everything near it.',
    cost: 1,
    prereq: 'mage_st_spatial_distortion',
    tier: 8,
    effect: {
      kind: 'active',
      action: 'mage_wormhole',
      cooldownMs: T.wormholeRift.cooldownMs,
      energyCost: T.wormholeRift.energyCost,
      compose: [
        { p: 'hazard', at: 'self', radius: T.wormholeRift.portalRadius, tickDamage: T.wormholeRift.portalTickDamage, tickMs: T.wormholeRift.portalTickMs, durationMs: T.wormholeRift.portalDurationMs, fill: 0x5a2a9f, stroke: 0xc09aff },
        { p: 'teleport', distance: T.wormholeRift.distance },
      ],
    },
  },
  {
    id: 'mage_st_singularity_collapse',
    tree: MAGE_SPACETIME_TREE,
    name: 'Singularity Collapse',
    description: `Ultimate — Activate: collapse a miniature black hole ahead for ${(T.singularityCollapse.durationMs / 1000).toFixed(0)}s: it drags everything toward its center and crushes it, pulse after pulse. Long cooldown.`,
    cost: 1,
    prereq: 'mage_st_wormhole_rift',
    tier: 9,
    effect: { kind: 'active', action: 'mage_singularity', cooldownMs: T.singularityCollapse.cooldownMs, energyCost: T.singularityCollapse.energyCost },
  },
];

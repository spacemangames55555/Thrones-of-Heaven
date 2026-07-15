import type { SkillDef } from './skillData';

/**
 * BARD — SONIC CHAOS TREE (10 skills, linear; RANGED).
 *
 * RANGE DOCTRINE (Casey's ruling): this tree's offense is RANGED — long cones,
 * bolts, placed hazards, long chains. The one sanctioned exception is Resonance
 * Pulse: a self-centered omnidirectional peel burst. Every skill carries a
 * DORMANT `ensemble` block for the party era. Conventions as always: EVERY
 * tunable in {@link BARD_SONIC_TUNING} with calibration anchors; placeholder
 * prose. Tree id 'bard_sonic'. Tier-0 is a DAMAGING ACTIVE (no-kit rule).
 *
 * Composed where the primitives cover it; Sonic Surge (dash + trail), Sonic
 * Distortion (the CONFUSION extension) and Wall of Sound (the hazard wall)
 * dispatch by action id. Sonic Echoes is a KEYED passive (the ECHO extension,
 * armed while unlocked).
 */

export const BARD_SONIC_TREE = 'bard_sonic';

/** Id the scene keys the Sonic Echoes ECHO passive off of (armed on recompute). */
export const SONIC_ECHOES_ID = 'bard_sc_echoes';

// ─── TUNING (all starting values; tune freely in playtest) ────────────────────
export const BARD_SONIC_TUNING = {
  /** 1) SONIC BLAST — ENTRY LONG projected cone + knockback (vs Dust Devil's 30/135
   *  stretched long + Sludge's 150 push, softened). */
  sonicBlast: { range: 260, coneHalfAngleDeg: 26, damage: 24, knockback: 120, cooldownMs: 2600, energyCost: 10 },
  /** 2) RESONANCE PULSE — the sanctioned self-centered peel (vs Shove's push +
   *  Windmill's ring damage). */
  pulse: { radius: 120, damage: 20, knockback: 140, cooldownMs: 8000, energyCost: 16 },
  /** 3) SONIC ECHOES — KEYED passive: the ECHO extension — attacks re-resolve once,
   *  delayed, at this fraction while unlocked. */
  echoes: { pct: 0.35, delayMs: 380 },
  /** 4) PERFECT PITCH — +sonic skill damage (mapped to the global damage multiplier
   *  until per-school damage exists; vs Berserker's +20%). */
  perfectPitch: { damageMult: 0.15 },
  /** 5) SONIC SURGE — dash leaving a vibrating trail (dash vs Gust's 260; trail =
   *  three Lava-lite patches along the path). */
  surge: { distance: 260, damage: 18, knockdownMs: 200, trailRadius: 70, trailTickDamage: 8, trailTickMs: 400, trailDurationMs: 2500, cooldownMs: 11000, energyCost: 22 },
  /** 6) POWER CHORD — one massive ranged bolt (vs Immolation's 34 as a single shot). */
  powerChord: { damage: 34, speed: 540, range: 380, radius: 12, cooldownMs: 5000, energyCost: 16 },
  /** 7) SONIC DISTORTION — the CONFUSION extension: an enemy turns on its own. */
  distortion: { range: 320, chance: 0.8, durationMs: 4000, chipDamage: 8, chipMs: 600, cooldownMs: 12000, energyCost: 20 },
  /** 8) WALL OF SOUND — a placed hazard WALL (three cells across the facing line;
   *  Freezing-Rain-class ticks + slow on crossers). */
  wall: { placeAhead: 180, cellRadius: 70, cellSpacing: 110, tickDamage: 8, tickMs: 400, durationMs: 4000, slowFactor: 0.6, cooldownMs: 12000, energyCost: 24 },
  /** 9) PENTATONIC OVERLOAD — five rapid bolts, EACH with a different rider
   *  (slow / weaken / knockback / stun / DoT — the ROTATING RIDERS extension). */
  pentatonic: { damageEach: 8, speed: 520, range: 340, radius: 8, stunMs: 800, slowFactor: 0.55, slowMs: 2500, weaken: 0.2, weakenMs: 3000, knockback: 110, dot: { dmgPerTick: 5, tickMs: 500, durationMs: 2500, radius: 36 }, cooldownMs: 10000, energyCost: 26 },
  /** 10) CHAOTIC RIFF — ultimate: the chain-bounce at scale (vs the Druid Lightning's
   *  24×0.6, bigger and wider on an ultimate cooldown). */
  riff: { range: 340, jumps: 4, jumpRange: 240, damage: 26, falloff: 0.7, cooldownMs: 45000, energyCost: 40 },
} as const;

const T = BARD_SONIC_TUNING;

// ─── THE 10 SONIC SKILLS (linear; tree 'bard_sonic') ──────────────────────────
// >>> EDIT NAMES / DESCRIPTIONS HERE (placeholder prose). <<<
export const BARD_SONIC_SKILLS: SkillDef[] = [
  {
    id: 'bard_sc_blast',
    tree: BARD_SONIC_TREE,
    name: 'Sonic Blast',
    description: 'Activate: project a long cone of crushing sound — everything in the wedge is damaged and SHOVED back. Your reliable opener.',
    cost: 1,
    tier: 0,
    ensemble: { damagePerAllyPct: 0.05 },
    effect: {
      kind: 'active',
      action: 'bard_sonic_blast',
      cooldownMs: T.sonicBlast.cooldownMs,
      energyCost: T.sonicBlast.energyCost,
      compose: [{ p: 'cone', range: T.sonicBlast.range, halfAngleDeg: T.sonicBlast.coneHalfAngleDeg, damage: T.sonicBlast.damage, tint: 0xb8d8ff, knockback: T.sonicBlast.knockback, knockbackStunMs: 200 }],
    },
  },
  {
    id: 'bard_sc_pulse',
    tree: BARD_SONIC_TREE,
    name: 'Resonance Pulse',
    description: 'Activate: an omnidirectional burst from your chest — damages and SHOVES everything around you. (The sanctioned peel.)',
    cost: 1,
    prereq: 'bard_sc_blast',
    tier: 1,
    ensemble: { radiusPerAllyPct: 0.05 },
    effect: {
      kind: 'active',
      action: 'bard_pulse',
      cooldownMs: T.pulse.cooldownMs,
      energyCost: T.pulse.energyCost,
      compose: [{ p: 'strike', at: 'self', radius: T.pulse.radius, damage: T.pulse.damage, tint: 0xb8d8ff, knockback: T.pulse.knockback, knockbackStunMs: 200 }],
    },
  },
  {
    id: SONIC_ECHOES_ID,
    tree: BARD_SONIC_TREE,
    name: 'Sonic Echoes',
    description: `Passive: your attacks leave an ECHO — a delayed second hit at ${Math.round(T.echoes.pct * 100)}% strength.`,
    cost: 1,
    prereq: 'bard_sc_pulse',
    tier: 2,
    ensemble: { echoPerAllyPct: 0.05 },
    effect: { kind: 'passive', stats: {} }, // keyed — the scene arms the echo while unlocked
  },
  {
    id: 'bard_sc_pitch',
    tree: BARD_SONIC_TREE,
    name: 'Perfect Pitch',
    description: `Passive: every note lands true — +${Math.round(T.perfectPitch.damageMult * 100)}% damage.`,
    cost: 1,
    prereq: SONIC_ECHOES_ID,
    tier: 3,
    ensemble: { damagePerAllyPct: 0.03 },
    effect: { kind: 'passive', stats: { damageMult: T.perfectPitch.damageMult } },
  },
  {
    id: 'bard_sc_surge',
    tree: BARD_SONIC_TREE,
    name: 'Sonic Surge',
    description: 'Activate: ride a soundwave forward — enemies in your path are struck, and the road behind you keeps VIBRATING, burning those who cross it.',
    cost: 1,
    prereq: 'bard_sc_pitch',
    tier: 4,
    ensemble: { trailPerAllyPct: 0.05 },
    effect: { kind: 'active', action: 'bard_surge', cooldownMs: T.surge.cooldownMs, energyCost: T.surge.energyCost },
  },
  {
    id: 'bard_sc_chord',
    tree: BARD_SONIC_TREE,
    name: 'Power Chord',
    description: 'Activate: one massive chord, focused to a point — a heavy ranged bolt into the first enemy it meets.',
    cost: 1,
    prereq: 'bard_sc_surge',
    tier: 5,
    ensemble: { damagePerAllyPct: 0.05 },
    effect: {
      kind: 'active',
      action: 'bard_power_chord',
      cooldownMs: T.powerChord.cooldownMs,
      energyCost: T.powerChord.energyCost,
      compose: [{ p: 'bolt', via: 'aimed', damage: T.powerChord.damage, speed: T.powerChord.speed, range: T.powerChord.range, radius: T.powerChord.radius, tint: 0xb8d8ff }],
    },
  },
  {
    id: 'bard_sc_distortion',
    tree: BARD_SONIC_TREE,
    name: 'Sonic Distortion',
    description: `Activate: warp what an enemy hears — it turns on its NEAREST FELLOW for ${(T.distortion.durationMs / 1000).toFixed(0)}s.`,
    cost: 1,
    prereq: 'bard_sc_chord',
    tier: 6,
    ensemble: { durationPerAllyMs: 0 },
    effect: { kind: 'active', action: 'bard_distortion', cooldownMs: T.distortion.cooldownMs, energyCost: T.distortion.energyCost },
  },
  {
    id: 'bard_sc_wall',
    tree: BARD_SONIC_TREE,
    name: 'Wall of Sound',
    description: `Activate: raise a standing wall of sound across the ground ahead for ${(T.wall.durationMs / 1000).toFixed(0)}s — it damages and SLOWS whatever crosses it.`,
    cost: 1,
    prereq: 'bard_sc_distortion',
    tier: 7,
    ensemble: { widthPerAllyPct: 0.05 },
    effect: { kind: 'active', action: 'bard_wall', cooldownMs: T.wall.cooldownMs, energyCost: T.wall.energyCost },
  },
  {
    id: 'bard_sc_pentatonic',
    tree: BARD_SONIC_TREE,
    name: 'Pentatonic Overload',
    description: 'Activate: five rapid notes, each a different cruelty — one SLOWS, one WEAKENS, one SHOVES, one STUNS, one festers as a DoT.',
    cost: 1,
    prereq: 'bard_sc_wall',
    tier: 8,
    ensemble: { notesPerAlly: 0 },
    effect: {
      kind: 'active',
      action: 'bard_pentatonic',
      cooldownMs: T.pentatonic.cooldownMs,
      energyCost: T.pentatonic.energyCost,
      compose: [
        { p: 'bolt', damage: T.pentatonic.damageEach, speed: T.pentatonic.speed, range: T.pentatonic.range, radius: T.pentatonic.radius, tint: 0xb8d8ff, onHit: { slowFactor: T.pentatonic.slowFactor, slowMs: T.pentatonic.slowMs } },
        { p: 'bolt', damage: T.pentatonic.damageEach, speed: T.pentatonic.speed, range: T.pentatonic.range, radius: T.pentatonic.radius, tint: 0xc8c8ff, onHit: { weaken: T.pentatonic.weaken, weakenMs: T.pentatonic.weakenMs } },
        { p: 'bolt', damage: T.pentatonic.damageEach, speed: T.pentatonic.speed, range: T.pentatonic.range, radius: T.pentatonic.radius, tint: 0xd8b8ff, onHit: { knockback: T.pentatonic.knockback } },
        { p: 'bolt', damage: T.pentatonic.damageEach, speed: T.pentatonic.speed, range: T.pentatonic.range, radius: T.pentatonic.radius, tint: 0xe8a8ff, onHit: { stunMs: T.pentatonic.stunMs } },
        { p: 'bolt', damage: T.pentatonic.damageEach, speed: T.pentatonic.speed, range: T.pentatonic.range, radius: T.pentatonic.radius, tint: 0xf898ff, dot: { dmgPerTick: T.pentatonic.dot.dmgPerTick, tickMs: T.pentatonic.dot.tickMs, durationMs: T.pentatonic.dot.durationMs, radius: T.pentatonic.dot.radius, color: 0xf898ff } },
      ],
    },
  },
  {
    id: 'bard_sc_riff',
    tree: BARD_SONIC_TREE,
    name: 'Chaotic Riff',
    description: `Ultimate — Activate: one screaming riff DETONATES across the battlefield, chaining through up to ${T.riff.jumps + 1} enemies. Long cooldown.`,
    cost: 1,
    prereq: 'bard_sc_pentatonic',
    tier: 9,
    ensemble: { jumpsPerAlly: 0 },
    effect: {
      kind: 'active',
      action: 'bard_riff',
      cooldownMs: T.riff.cooldownMs,
      energyCost: T.riff.energyCost,
      compose: [{ p: 'chain', range: T.riff.range, jumps: T.riff.jumps, jumpRange: T.riff.jumpRange, damage: T.riff.damage, falloff: T.riff.falloff, tint: 0xb8d8ff }],
    },
  },
];

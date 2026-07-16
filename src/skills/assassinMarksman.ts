import type { SkillDef } from './skillData';

/**
 * ASSASSIN — MARKSMAN'S PRECISION TREE (10 skills, linear; THROWN).
 *
 * Entirely on shipped machinery: plain bolts with the full rider set (root /
 * pierce+vuln / DoT / slow), the chain-bounce Trick Shot, a cone fan, and the
 * placed-volley ultimate (the Rain of Arrows shape). Conventions as always:
 * EVERY tunable in {@link ASN_MARKS_TUNING} with calibration anchors;
 * placeholder prose. Tree id 'asn_marks'. Tier-0 is a DAMAGING ACTIVE
 * (no-kit rule).
 */

export const ASN_MARKS_TREE = 'asn_marks';

// ─── TUNING (all starting values; tune freely in playtest) ────────────────────
export const ASN_MARKS_TUNING = {
  /** 1) THROWING STAR — ENTRY clean star (vs Yumi Shot's 16/560/380, shorter +
   *  a touch lighter — knives, not a warbow). */
  star: { damage: 15, speed: 560, range: 340, radius: 8, cooldownMs: 2000, energyCost: 8 },
  /** 2) THROWING MASTERY — +thrown damage, EV-mapped to the global damage
   *  multiplier until per-school damage exists (the Steady Hand precedent). */
  mastery: { damageMult: 0.12 },
  /** 3) RAPID SHOT — a flurry of three stars in one motion (the Pentatonic
   *  multi-bolt shape; 3×7 vs one 15). */
  rapid: { count: 3, damageEach: 7, speed: 560, range: 320, radius: 7, cooldownMs: 4500, energyCost: 14 },
  /** 4) ENSNARING SHOT — tangles and ROOTS (vs Pinning Shot's 12 + 2200ms). */
  ensnare: { damage: 11, speed: 540, range: 340, radius: 8, rootMs: 2200, cooldownMs: 8000, energyCost: 16 },
  /** 5) PIERCING STRIKES — armor-piercing: passes through ranks AND leaves the
   *  struck taking MORE (pierce vs Piercing Arrow's 3; vuln vs Dark Hex's 1.2). */
  piercing: { damage: 13, speed: 580, range: 380, radius: 8, pierce: 3, vulnMult: 1.2, vulnMs: 4000, cooldownMs: 8000, energyCost: 16 },
  /** 6) POISONED STARS — coated steel: hits fester (vs Flaming Arrow's
   *  5/500/2500 impact-DoT). */
  poisoned: { damage: 12, speed: 560, range: 340, radius: 8, dot: { dmgPerTick: 5, tickMs: 500, durationMs: 3000, radius: 40 }, cooldownMs: 7000, energyCost: 16 },
  /** 7) TRICK SHOT — the ricochet: one throw bounces target to target (the
   *  chain-bounce; vs Chain Lightning's 24 × 0.6 falloff). */
  trick: { range: 300, jumps: 3, jumpRange: 160, damage: 18, falloff: 0.7, cooldownMs: 9000, energyCost: 18 },
  /** 8) FAN OF BLADES — a spreading fan of stars (the cone shape; vs Crescent
   *  Sweep's 100/70°, longer + narrower). */
  fan: { range: 170, coneHalfAngleDeg: 45, damage: 20, cooldownMs: 8000, energyCost: 18 },
  /** 9) CRIPPLING SHOT — a star to the knee: heavy slow (vs Hamstring's
   *  0.55/2500, deeper). */
  crippling: { damage: 12, speed: 560, range: 340, radius: 8, slowFactor: 0.45, slowMs: 3000, cooldownMs: 9000, energyCost: 18 },
  /** 10) RAIN OF STEEL — ultimate: a storm of blades over an area (the placed-
   *  volley shape; vs Rain of Arrows' 8/350/3000, heavier on an ultimate clock). */
  rain: { placeAhead: 240, radius: 140, tickDamage: 11, tickMs: 300, durationMs: 3500, cooldownMs: 45000, energyCost: 40 },
} as const;

const T = ASN_MARKS_TUNING;

// ─── THE 10 MARKSMAN SKILLS (linear; tree 'asn_marks') ────────────────────────
// >>> EDIT NAMES / DESCRIPTIONS HERE (placeholder prose). <<<
export const ASN_MARKS_SKILLS: SkillDef[] = [
  {
    id: 'asn_mk_star',
    tree: ASN_MARKS_TREE,
    name: 'Throwing Star',
    description: 'Activate: one clean star, thrown flat and fast. Your reliable opener.',
    cost: 1,
    tier: 0,
    effect: {
      kind: 'active',
      action: 'asn_star',
      cooldownMs: T.star.cooldownMs,
      energyCost: T.star.energyCost,
      compose: [{ p: 'bolt', damage: T.star.damage, speed: T.star.speed, range: T.star.range, radius: T.star.radius, tint: 0xc8d0e0 }],
    },
  },
  {
    id: 'asn_mk_mastery',
    tree: ASN_MARKS_TREE,
    name: 'Throwing Mastery',
    description: `Passive: ten thousand repetitions — +${Math.round(T.mastery.damageMult * 100)}% damage.`,
    cost: 1,
    prereq: 'asn_mk_star',
    tier: 1,
    effect: { kind: 'passive', stats: { damageMult: T.mastery.damageMult } },
  },
  {
    id: 'asn_mk_rapid',
    tree: ASN_MARKS_TREE,
    name: 'Rapid Shot',
    description: `Activate: ${T.rapid.count} stars leave the hand as one motion.`,
    cost: 1,
    prereq: 'asn_mk_mastery',
    tier: 2,
    effect: {
      kind: 'active',
      action: 'asn_rapid',
      cooldownMs: T.rapid.cooldownMs,
      energyCost: T.rapid.energyCost,
      compose: [
        { p: 'bolt', damage: T.rapid.damageEach, speed: T.rapid.speed, range: T.rapid.range, radius: T.rapid.radius, tint: 0xc8d0e0 },
        { p: 'bolt', damage: T.rapid.damageEach, speed: T.rapid.speed, range: T.rapid.range, radius: T.rapid.radius, tint: 0xd8e0f0 },
        { p: 'bolt', damage: T.rapid.damageEach, speed: T.rapid.speed, range: T.rapid.range, radius: T.rapid.radius, tint: 0xb8c0d0 },
      ],
    },
  },
  {
    id: 'asn_mk_ensnare',
    tree: ASN_MARKS_TREE,
    name: 'Ensnaring Shot',
    description: `Activate: a weighted cord behind the point — the struck enemy is ROOTED for ${(T.ensnare.rootMs / 1000).toFixed(1)}s.`,
    cost: 1,
    prereq: 'asn_mk_rapid',
    tier: 3,
    effect: {
      kind: 'active',
      action: 'asn_ensnare',
      cooldownMs: T.ensnare.cooldownMs,
      energyCost: T.ensnare.energyCost,
      compose: [{ p: 'bolt', damage: T.ensnare.damage, speed: T.ensnare.speed, range: T.ensnare.range, radius: T.ensnare.radius, tint: 0xc8d0e0, onHit: { rootMs: T.ensnare.rootMs } }],
    },
  },
  {
    id: 'asn_mk_piercing',
    tree: ASN_MARKS_TREE,
    name: 'Piercing Strikes',
    description: `Activate: a hardened point thrown THROUGH the ranks — everything struck takes ${Math.round((T.piercing.vulnMult - 1) * 100)}% more damage for ${(T.piercing.vulnMs / 1000).toFixed(0)}s.`,
    cost: 1,
    prereq: 'asn_mk_ensnare',
    tier: 4,
    effect: {
      kind: 'active',
      action: 'asn_piercing',
      cooldownMs: T.piercing.cooldownMs,
      energyCost: T.piercing.energyCost,
      compose: [{ p: 'bolt', damage: T.piercing.damage, speed: T.piercing.speed, range: T.piercing.range, radius: T.piercing.radius, tint: 0xe0e8f8, pierce: T.piercing.pierce, vuln: { mult: T.piercing.vulnMult, durationMs: T.piercing.vulnMs } }],
    },
  },
  {
    id: 'asn_mk_poisoned',
    tree: ASN_MARKS_TREE,
    name: 'Poisoned Stars',
    description: 'Activate: coated steel — the wound festers long after the star has fallen.',
    cost: 1,
    prereq: 'asn_mk_piercing',
    tier: 5,
    effect: {
      kind: 'active',
      action: 'asn_poison_stars',
      cooldownMs: T.poisoned.cooldownMs,
      energyCost: T.poisoned.energyCost,
      compose: [{ p: 'bolt', damage: T.poisoned.damage, speed: T.poisoned.speed, range: T.poisoned.range, radius: T.poisoned.radius, tint: 0x9ad07a, dot: { dmgPerTick: T.poisoned.dot.dmgPerTick, tickMs: T.poisoned.dot.tickMs, durationMs: T.poisoned.dot.durationMs, radius: T.poisoned.dot.radius, color: 0x9ad07a } }],
    },
  },
  {
    id: 'asn_mk_trick',
    tree: ASN_MARKS_TREE,
    name: 'Trick Shot',
    description: `Activate: the ricochet — one star bounces through up to ${T.trick.jumps + 1} enemies, losing a little edge per bounce.`,
    cost: 1,
    prereq: 'asn_mk_poisoned',
    tier: 6,
    effect: {
      kind: 'active',
      action: 'asn_trick',
      cooldownMs: T.trick.cooldownMs,
      energyCost: T.trick.energyCost,
      compose: [{ p: 'chain', range: T.trick.range, jumps: T.trick.jumps, jumpRange: T.trick.jumpRange, damage: T.trick.damage, falloff: T.trick.falloff, tint: 0xc8d0e0 }],
    },
  },
  {
    id: 'asn_mk_fan',
    tree: ASN_MARKS_TREE,
    name: 'Fan of Blades',
    description: 'Activate: a whole spread of stars leaves both hands at once — everything in the fan is cut.',
    cost: 1,
    prereq: 'asn_mk_trick',
    tier: 7,
    effect: {
      kind: 'active',
      action: 'asn_fan',
      cooldownMs: T.fan.cooldownMs,
      energyCost: T.fan.energyCost,
      compose: [{ p: 'cone', range: T.fan.range, halfAngleDeg: T.fan.coneHalfAngleDeg, damage: T.fan.damage, tint: 0xc8d0e0 }],
    },
  },
  {
    id: 'asn_mk_crippling',
    tree: ASN_MARKS_TREE,
    name: 'Crippling Shot',
    description: `Activate: a star to the knee — the struck enemy limps at ${Math.round(T.crippling.slowFactor * 100)}% speed for ${(T.crippling.slowMs / 1000).toFixed(0)}s.`,
    cost: 1,
    prereq: 'asn_mk_fan',
    tier: 8,
    effect: {
      kind: 'active',
      action: 'asn_cripple',
      cooldownMs: T.crippling.cooldownMs,
      energyCost: T.crippling.energyCost,
      compose: [{ p: 'bolt', damage: T.crippling.damage, speed: T.crippling.speed, range: T.crippling.range, radius: T.crippling.radius, tint: 0xb8c8e0, onHit: { slowFactor: T.crippling.slowFactor, slowMs: T.crippling.slowMs } }],
    },
  },
  {
    id: 'asn_mk_rain',
    tree: ASN_MARKS_TREE,
    name: 'Rain of Steel',
    description: `Ultimate — Activate: the sky fills with thrown steel — for ${(T.rain.durationMs / 1000).toFixed(1)}s blades fall across the target ground. Long cooldown.`,
    cost: 1,
    prereq: 'asn_mk_crippling',
    tier: 9,
    effect: {
      kind: 'active',
      action: 'asn_rain_steel',
      cooldownMs: T.rain.cooldownMs,
      energyCost: T.rain.energyCost,
      compose: [{ p: 'hazard', at: 'ahead', placeAhead: T.rain.placeAhead, radius: T.rain.radius, tickDamage: T.rain.tickDamage, tickMs: T.rain.tickMs, durationMs: T.rain.durationMs, fill: 0x3a4050, stroke: 0xc8d0e0 }],
    },
  },
];

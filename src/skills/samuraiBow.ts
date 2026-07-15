import type { SkillDef } from './skillData';

/**
 * SAMURAI — WAY OF THE BOW TREE (10 skills, linear; RANGED).
 *
 * The yumi: clean arrows on the shipped bolt riders (pierce / slow / weaken /
 * DoT / root / splash), RUNNING DRAW on the dash-and-fire composite (framework
 * extension #4), and the HEAVEN'S ARC ultimate. "Resolve" is prose over
 * standard energy. Conventions as always: EVERY tunable in
 * {@link SAM_BOW_TUNING} with calibration anchors; placeholder prose. Tree id
 * 'sam_bow'. Tier-0 is a DAMAGING ACTIVE.
 */

export const SAM_BOW_TREE = 'sam_bow';

// ─── TUNING (all starting values; tune freely in playtest) ────────────────────
export const SAM_BOW_TUNING = {
  /** 1) YUMI SHOT — ENTRY clean arrow (vs Blow Dart's 14/520/340, straighter + harder). */
  yumi: { damage: 16, speed: 560, range: 380, radius: 8, cooldownMs: 2200, energyCost: 8 },
  /** 2) PIERCING ARROW — passes through ranks (pierce vs the shipped pierce rider). */
  piercing: { damage: 14, speed: 580, range: 400, radius: 8, pierce: 3, cooldownMs: 5000, energyCost: 14 },
  /** 3) HAMSTRING SHOT — slows what it strikes (vs Pentatonic's slow bolt: 0.55/2.5s). */
  hamstring: { damage: 12, speed: 560, range: 380, radius: 8, slowFactor: 0.55, slowMs: 2500, cooldownMs: 6000, energyCost: 14 },
  /** 4) STEADY HAND — +ranged damage, EV-mapped to the global damage multiplier
   *  until per-school damage exists (the Perfect Pitch precedent). */
  steady: { damageMult: 0.15 },
  /** 5) WHISTLING ARROW — the kabura-ya: its impact WEAKENS + SLOWS enemies around
   *  it (the impact rider resolves in a radius; weaken vs Plague Cloud's 0.2). */
  whistling: { damage: 12, speed: 540, range: 380, radius: 9, weaken: 0.25, weakenMs: 4000, slowFactor: 0.6, slowMs: 2500, cooldownMs: 9000, energyCost: 18 },
  /** 6) RUNNING DRAW — dash that FIRES mid-movement (extension #4; dash vs Gust's
   *  260, the arrow a lighter Yumi). */
  runningDraw: { distance: 220, boltDamage: 14, boltSpeed: 560, boltRange: 400, boltRadius: 8, fireDelayMs: 130, cooldownMs: 9000, energyCost: 18 },
  /** 7) FLAMING ARROW — impact-DoT (vs Toxic Bolt / Blow Dart's rot: a burn). */
  flaming: { damage: 14, speed: 560, range: 380, radius: 8, dot: { dmgPerTick: 5, tickMs: 500, durationMs: 2500, radius: 40 }, cooldownMs: 8000, energyCost: 18 },
  /** 8) RAIN OF ARROWS — a volley over an area (the placed-hazard volley shape;
   *  vs Freezing Rain's placed zone, faster ticks, no slow). */
  rain: { placeAhead: 240, radius: 130, tickDamage: 8, tickMs: 350, durationMs: 3000, cooldownMs: 14000, energyCost: 26 },
  /** 9) PINNING SHOT — the arrow that nails a foot to the earth (root vs Bone
   *  Grasp / Spirit Shackles' 2.2s hold). */
  pinning: { damage: 12, speed: 560, range: 380, radius: 8, rootMs: 2200, cooldownMs: 10000, energyCost: 18 },
  /** 10) HEAVEN'S ARC — ultimate: one massive sky-arcing shot — heavy damage +
   *  splash (vs Immolation's 34 single + Combust's splash, scaled to an ultimate). */
  heavensArc: { damage: 55, speed: 620, range: 460, radius: 12, splash: { radius: 130, damage: 30 }, cooldownMs: 45000, energyCost: 40 },
} as const;

const T = SAM_BOW_TUNING;

// ─── THE 10 BOW SKILLS (linear; tree 'sam_bow') ───────────────────────────────
// >>> EDIT NAMES / DESCRIPTIONS HERE (placeholder prose). <<<
export const SAM_BOW_SKILLS: SkillDef[] = [
  {
    id: 'sam_bw_yumi',
    tree: SAM_BOW_TREE,
    name: 'Yumi Shot',
    description: 'Activate: one clean arrow, loosed without hurry. Your reliable opener.',
    cost: 1,
    tier: 0,
    effect: {
      kind: 'active',
      action: 'sam_yumi',
      cooldownMs: T.yumi.cooldownMs,
      energyCost: T.yumi.energyCost,
      compose: [{ p: 'bolt', damage: T.yumi.damage, speed: T.yumi.speed, range: T.yumi.range, radius: T.yumi.radius, tint: 0xd8e8ff }],
    },
  },
  {
    id: 'sam_bw_piercing',
    tree: SAM_BOW_TREE,
    name: 'Piercing Arrow',
    description: `Activate: an arrow that does not stop at the first body — it passes through up to ${T.piercing.pierce + 1} enemies in a line.`,
    cost: 1,
    prereq: 'sam_bw_yumi',
    tier: 1,
    effect: {
      kind: 'active',
      action: 'sam_piercing',
      cooldownMs: T.piercing.cooldownMs,
      energyCost: T.piercing.energyCost,
      compose: [{ p: 'bolt', damage: T.piercing.damage, speed: T.piercing.speed, range: T.piercing.range, radius: T.piercing.radius, tint: 0xd8e8ff, pierce: T.piercing.pierce }],
    },
  },
  {
    id: 'sam_bw_hamstring',
    tree: SAM_BOW_TREE,
    name: 'Hamstring Shot',
    description: `Activate: aim low — the struck enemy limps at ${Math.round(T.hamstring.slowFactor * 100)}% speed for ${(T.hamstring.slowMs / 1000).toFixed(1)}s.`,
    cost: 1,
    prereq: 'sam_bw_piercing',
    tier: 2,
    effect: {
      kind: 'active',
      action: 'sam_hamstring',
      cooldownMs: T.hamstring.cooldownMs,
      energyCost: T.hamstring.energyCost,
      compose: [{ p: 'bolt', damage: T.hamstring.damage, speed: T.hamstring.speed, range: T.hamstring.range, radius: T.hamstring.radius, tint: 0xd8e8ff, onHit: { slowFactor: T.hamstring.slowFactor, slowMs: T.hamstring.slowMs } }],
    },
  },
  {
    id: 'sam_bw_steady',
    tree: SAM_BOW_TREE,
    name: 'Steady Hand',
    description: `Passive: the draw never wavers — +${Math.round(T.steady.damageMult * 100)}% damage.`,
    cost: 1,
    prereq: 'sam_bw_hamstring',
    tier: 3,
    effect: { kind: 'passive', stats: { damageMult: T.steady.damageMult } },
  },
  {
    id: 'sam_bw_whistling',
    tree: SAM_BOW_TREE,
    name: 'Whistling Arrow',
    description: `Activate: the kabura-ya — its shriek lands with the arrow, WEAKENING and SLOWING every enemy around the impact.`,
    cost: 1,
    prereq: 'sam_bw_steady',
    tier: 4,
    effect: {
      kind: 'active',
      action: 'sam_whistling',
      cooldownMs: T.whistling.cooldownMs,
      energyCost: T.whistling.energyCost,
      compose: [
        { p: 'bolt', damage: T.whistling.damage, speed: T.whistling.speed, range: T.whistling.range, radius: T.whistling.radius, tint: 0xd8e8ff, onHit: { weaken: T.whistling.weaken, weakenMs: T.whistling.weakenMs, slowFactor: T.whistling.slowFactor, slowMs: T.whistling.slowMs } },
      ],
    },
  },
  {
    id: 'sam_bw_running',
    tree: SAM_BOW_TREE,
    name: 'Running Draw',
    description: 'Activate: never stop moving — a dash that LOOSES an arrow mid-stride.',
    cost: 1,
    prereq: 'sam_bw_whistling',
    tier: 5,
    effect: { kind: 'active', action: 'sam_running_draw', cooldownMs: T.runningDraw.cooldownMs, energyCost: T.runningDraw.energyCost },
  },
  {
    id: 'sam_bw_flaming',
    tree: SAM_BOW_TREE,
    name: 'Flaming Arrow',
    description: 'Activate: an arrow wrapped in burning pitch — what it strikes keeps BURNING.',
    cost: 1,
    prereq: 'sam_bw_running',
    tier: 6,
    effect: {
      kind: 'active',
      action: 'sam_flaming',
      cooldownMs: T.flaming.cooldownMs,
      energyCost: T.flaming.energyCost,
      compose: [{ p: 'bolt', damage: T.flaming.damage, speed: T.flaming.speed, range: T.flaming.range, radius: T.flaming.radius, tint: 0xff8a3a, dot: { ...T.flaming.dot, color: 0xff8a3a } }],
    },
  },
  {
    id: 'sam_bw_rain',
    tree: SAM_BOW_TREE,
    name: 'Rain of Arrows',
    description: `Activate: loose the whole quiver skyward — for ${(T.rain.durationMs / 1000).toFixed(0)}s arrows fall across the target ground.`,
    cost: 1,
    prereq: 'sam_bw_flaming',
    tier: 7,
    effect: {
      kind: 'active',
      action: 'sam_rain',
      cooldownMs: T.rain.cooldownMs,
      energyCost: T.rain.energyCost,
      compose: [{ p: 'hazard', at: 'ahead', placeAhead: T.rain.placeAhead, radius: T.rain.radius, tickDamage: T.rain.tickDamage, tickMs: T.rain.tickMs, durationMs: T.rain.durationMs, fill: 0x2a3550, stroke: 0xd8e8ff }],
    },
  },
  {
    id: 'sam_bw_pinning',
    tree: SAM_BOW_TREE,
    name: 'Pinning Shot',
    description: `Activate: nail a foot to the earth — the struck enemy is ROOTED in place for ${(T.pinning.rootMs / 1000).toFixed(1)}s.`,
    cost: 1,
    prereq: 'sam_bw_rain',
    tier: 8,
    effect: {
      kind: 'active',
      action: 'sam_pinning',
      cooldownMs: T.pinning.cooldownMs,
      energyCost: T.pinning.energyCost,
      compose: [{ p: 'bolt', damage: T.pinning.damage, speed: T.pinning.speed, range: T.pinning.range, radius: T.pinning.radius, tint: 0xd8e8ff, onHit: { rootMs: T.pinning.rootMs } }],
    },
  },
  {
    id: 'sam_bw_arc',
    tree: SAM_BOW_TREE,
    name: "Heaven's Arc",
    description: 'Ultimate — Activate: one arrow, drawn until the bow sings, arcing out of the sky — massive damage where it lands, and the impact tears everything around it. Long cooldown.',
    cost: 1,
    prereq: 'sam_bw_pinning',
    tier: 9,
    effect: {
      kind: 'active',
      action: 'sam_heavens_arc',
      cooldownMs: T.heavensArc.cooldownMs,
      energyCost: T.heavensArc.energyCost,
      compose: [{ p: 'bolt', via: 'aimed', damage: T.heavensArc.damage, speed: T.heavensArc.speed, range: T.heavensArc.range, radius: T.heavensArc.radius, tint: 0xffe9a8, splash: { radius: T.heavensArc.splash.radius, damage: T.heavensArc.splash.damage } }],
    },
  },
];

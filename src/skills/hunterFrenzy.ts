import type { SkillDef } from './skillData';

/**
 * HUNTER — WILD FRENZY TREE (10 skills, linear; FULLY STANDALONE).
 *
 * The knife half — THE STANDALONE PROMISE: a Hunter with zero Beast Control
 * points wins real fights through this tree alone. Fast raking melee on the
 * strike primitive, VENOM BLADES on the shipped strike-DoT hook, the quill
 * reflect, a TEMPORARY pack that answers the call (no bond required), the
 * dash-and-lunge composite, the deep bleed, and the alpha form. Pack Leader
 * pays you for keeping beasts close but the tree never requires one.
 * "Focus" is prose over standard energy. Conventions as always: EVERY
 * tunable in {@link HUN_WILD_TUNING} with calibration anchors; placeholder
 * prose. Tree id 'hun_wild'. Tier-0 is a DAMAGING ACTIVE (no-kit rule).
 */

export const HUN_WILD_TREE = 'hun_wild';

// Ids the scene keys behavior off (imported there — keep in sync): VENOM
// BLADES arms the strike-DoT hook; PACK LEADER arms the both-ways proximity
// damage; ALPHA'S FURY's cast also empowers every beast for its window.
export const VENOM_BLADES_ID = 'hun_wf_venom';
export const PACK_LEADER_ID = 'hun_wf_leader';
export const ALPHAS_FURY_ID = 'hun_wf_alpha';

// ─── TUNING (all starting values; tune freely in playtest) ────────────────────
export const HUN_WILD_TUNING = {
  /** 1) FERAL SWIPE — ENTRY raking strike (vs First Cut's 20/2s; the Hunter's
   *  slightly lower base damage carries a hair more reach). */
  swipe: { range: 76, damage: 18, cooldownMs: 2000, energyCost: 8 },
  /** 2) TWIN DAGGERS — two blades, two cuts (the multi-pulse strike; vs Twin
   *  Fangs' double hit). */
  twin: { range: 70, damageEach: 10, pulses: 2, pulseMs: 140, cooldownMs: 4500, energyCost: 11 },
  /** 3) VENOM BLADES — the strike-DoT hook (vs Razor's Edge 4/500/2500). */
  venom: { dmgPerTick: 4, tickMs: 500, durationMs: 2500 },
  /** 4) PACK LEADER — proximity, both ways: you harder near them, them harder
   *  near you (bigger than Pack Tactics — it asks you to stay close). */
  leader: { bonus: 0.12, radius: 220 },
  /** 5) QUILL GUARD — bristle: reflect a share of melee harm (vs Reflect-class
   *  buffs). */
  quill: { reflectPct: 0.3, durationMs: 6000, cooldownMs: 14000, energyCost: 14 },
  /** 6) HAMSTRING SLASH — strike + slow (vs Crippling Arrow's leg-taker). */
  hamstring: { range: 74, damage: 14, slowFactor: 0.5, slowMs: 2500, cooldownMs: 6000, energyCost: 12 },
  /** 7) CALL OF THE WILD — a TEMPORARY pack answers (timed burst summons on
   *  the swarm-lifespan seam; no bond needed — they are not the bond). */
  call: { count: 2, durationMs: 10000, cooldownMs: 22000, energyCost: 22 },
  /** 8) HUNT AS ONE — the dash composite: leap the prey as your beasts lunge
   *  WITH you (dash + strike + a brief focus; alone, the dash still lands). */
  hunt: { range: 260, radius: 90, damage: 20, focusMs: 3000, cooldownMs: 9000, energyCost: 16 },
  /** 9) BLOODLETTER — one heavy wind-up cut, a DEEP bleed (vs Jagged Wound's
   *  5/500/3000 — slower, deeper). */
  bloodlet: { range: 80, damage: 22, windUpMs: 450, dot: { dmgPerTick: 7, tickMs: 500, durationMs: 4000 }, cooldownMs: 10000, energyCost: 18 },
  /** 10) ALPHA'S FURY — ultimate: the timed alpha form — strength and speed,
   *  and every beast in the field empowered for the window. */
  alpha: { damageMult: 0.2, attackSpeedMult: 0.2, moveSpeedMult: 0.1, petDamageBonus: 0.2, petAttackSpeedBonus: 0.2, durationMs: 10000, cooldownMs: 60000, energyCost: 45, tint: 0xa0c86a },
} as const;

const T = HUN_WILD_TUNING;

// ─── THE 10 WILD FRENZY SKILLS (linear; tree 'hun_wild') ──────────────────────
// >>> EDIT NAMES / DESCRIPTIONS HERE (placeholder prose). <<<
export const HUN_WILD_SKILLS: SkillDef[] = [
  {
    id: 'hun_wf_swipe',
    tree: HUN_WILD_TREE,
    name: 'Feral Swipe',
    description: 'Activate: a raking strike, more claw than knife. Your reliable opener; the whole tree stands on it.',
    cost: 1,
    tier: 0,
    effect: {
      kind: 'active',
      action: 'hun_swipe',
      cooldownMs: T.swipe.cooldownMs,
      energyCost: T.swipe.energyCost,
      compose: [{ p: 'strike', at: 'front', range: T.swipe.range, damage: T.swipe.damage, tint: 0xa0c86a }],
    },
  },
  {
    id: 'hun_wf_twin',
    tree: HUN_WILD_TREE,
    name: 'Twin Daggers',
    description: 'Activate: two blades, two cuts — one motion. The second lands before the first is felt.',
    cost: 1,
    prereq: 'hun_wf_swipe',
    tier: 1,
    effect: {
      kind: 'active',
      action: 'hun_twin',
      cooldownMs: T.twin.cooldownMs,
      energyCost: T.twin.energyCost,
      compose: [{ p: 'strike', at: 'front', range: T.twin.range, damage: T.twin.damageEach, pulses: T.twin.pulses, pulseMs: T.twin.pulseMs, tint: 0xa0c86a }],
    },
  },
  {
    id: VENOM_BLADES_ID,
    tree: HUN_WILD_TREE,
    name: 'Venom Blades',
    description: 'Passive: the edges fester — every strike you land leaves a venom that keeps working after the blade is gone.',
    cost: 1,
    prereq: 'hun_wf_twin',
    tier: 2,
    effect: { kind: 'passive', stats: {} },
  },
  {
    id: PACK_LEADER_ID,
    tree: HUN_WILD_TREE,
    name: 'Pack Leader',
    description: `Passive: the pack makes you braver — with a beast close, YOU strike ${Math.round(T.leader.bonus * 100)}% harder, and beasts fighting at your side strike ${Math.round(T.leader.bonus * 100)}% harder too.`,
    cost: 1,
    prereq: VENOM_BLADES_ID,
    tier: 3,
    effect: { kind: 'passive', stats: {} },
  },
  {
    id: 'hun_wf_quill',
    tree: HUN_WILD_TREE,
    name: 'Quill Guard',
    description: `Activate: bristle — for ${(T.quill.durationMs / 1000).toFixed(0)}s a share of the harm done to you is driven straight back into whoever dealt it.`,
    cost: 1,
    prereq: PACK_LEADER_ID,
    tier: 4,
    effect: { kind: 'buff', cooldownMs: T.quill.cooldownMs, durationMs: T.quill.durationMs, energyCost: T.quill.energyCost, tint: 0xd8d2a0, stats: { reflectPct: T.quill.reflectPct } },
  },
  {
    id: 'hun_wf_hamstring',
    tree: HUN_WILD_TREE,
    name: 'Hamstring Slash',
    description: `Activate: cut where the running lives — the struck limp at ${Math.round(T.hamstring.slowFactor * 100)}% speed for ${(T.hamstring.slowMs / 1000).toFixed(1)}s.`,
    cost: 1,
    prereq: 'hun_wf_quill',
    tier: 5,
    effect: {
      kind: 'active',
      action: 'hun_hamstring',
      cooldownMs: T.hamstring.cooldownMs,
      energyCost: T.hamstring.energyCost,
      compose: [{ p: 'strike', at: 'front', range: T.hamstring.range, damage: T.hamstring.damage, slowFactor: T.hamstring.slowFactor, slowMs: T.hamstring.slowMs, tint: 0xa0c86a }],
    },
  },
  {
    id: 'hun_wf_call',
    tree: HUN_WILD_TREE,
    name: 'Call of the Wild',
    description: `Activate: the old cry — a wild pack answers and fights beside you for ${(T.call.durationMs / 1000).toFixed(0)}s, then melts back into the land. No bond asked, none given.`,
    cost: 1,
    prereq: 'hun_wf_hamstring',
    tier: 6,
    effect: { kind: 'active', action: 'hun_call', cooldownMs: T.call.cooldownMs, energyCost: T.call.energyCost },
  },
  {
    id: 'hun_wf_hunt',
    tree: HUN_WILD_TREE,
    name: 'Hunt as One',
    description: 'Activate: pick the prey and GO — you leap it as every beast you have lunges with you. Alone, the leap still lands; with the pack, it buries them.',
    cost: 1,
    prereq: 'hun_wf_call',
    tier: 7,
    effect: { kind: 'active', action: 'hun_hunt', cooldownMs: T.hunt.cooldownMs, energyCost: T.hunt.energyCost },
  },
  {
    id: 'hun_wf_bloodlet',
    tree: HUN_WILD_TREE,
    name: 'Bloodletter',
    description: 'Activate: one heavy, deliberate cut — wound-deep. What it opens does not close soon.',
    cost: 1,
    prereq: 'hun_wf_hunt',
    tier: 8,
    effect: { kind: 'active', action: 'hun_bloodlet', cooldownMs: T.bloodlet.cooldownMs, energyCost: T.bloodlet.energyCost },
  },
  {
    id: ALPHAS_FURY_ID,
    tree: HUN_WILD_TREE,
    name: "Alpha's Fury",
    description: `Ultimate — Activate: for ${(T.alpha.durationMs / 1000).toFixed(0)}s you are the alpha the wild remembers — harder, faster — and every beast in the field rises with you. Long cooldown.`,
    cost: 1,
    prereq: 'hun_wf_bloodlet',
    tier: 9,
    effect: {
      kind: 'transformation',
      cooldownMs: T.alpha.cooldownMs,
      durationMs: T.alpha.durationMs,
      energyCost: T.alpha.energyCost,
      tint: T.alpha.tint,
      stats: { damageMult: T.alpha.damageMult, attackSpeedMult: T.alpha.attackSpeedMult, moveSpeedMult: T.alpha.moveSpeedMult },
    },
  },
];

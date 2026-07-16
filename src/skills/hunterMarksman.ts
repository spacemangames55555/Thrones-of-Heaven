import type { SkillDef } from './skillData';

/**
 * HUNTER — MARKSMANSHIP TREE (10 skills, linear; FULLY STANDALONE).
 *
 * The bow half — THE STANDALONE PROMISE: a Hunter with zero Beast Control
 * points wins real fights through this tree alone. Clean shots on the bolt
 * primitive and its riders, the BOOMERANG (framework #4 — the returning
 * bolt that strikes out AND back), the stillness state, and the one
 * impossible shot. Trueshot Aura is the tree's one nod to the pack (you AND
 * your beasts speed up) but needs no beast to be worth casting. "Focus" is
 * prose over standard energy. Conventions as always: EVERY tunable in
 * {@link HUN_MARKS_TUNING} with calibration anchors; placeholder prose.
 * Tree id 'hun_marks'. Tier-0 is a DAMAGING ACTIVE (no-kit rule).
 */

export const HUN_MARKS_TREE = 'hun_marks';

// Id the scene keys behavior off (imported there — keep in sync): TRUESHOT
// AURA's buff cast also pushes the pet attack-speed buff for its window.
export const TRUESHOT_AURA_ID = 'hun_mk_trueshot';

// ─── TUNING (all starting values; tune freely in playtest) ────────────────────
export const HUN_MARKS_TUNING = {
  /** 1) STEADY SHOT — ENTRY clean heavy arrow (vs Yumi Shot / Throwing Star
   *  openers; the aimed-bolt path with storm-splash scaling). */
  steady: { damage: 18, speed: 520, range: 420, radius: 8, cooldownMs: 2200, energyCost: 8 },
  /** 2) PRECISE AIM — +ranged damage (crit EV-mapped, the shipped convention). */
  aim: { damageMult: 0.08 },
  /** 3) MULTISHOT — a spread of three arrows (vs Fan of Blades' 5×8/20°). */
  multi: { boltCount: 3, damageEach: 12, spreadDeg: 24, speed: 500, range: 360, radius: 7, cooldownMs: 6000, energyCost: 14 },
  /** 4) CRIPPLING ARROW — bolt + heavy slow (vs Pinning Shot-class riders). */
  cripple: { damage: 14, speed: 500, range: 400, radius: 8, slowFactor: 0.45, slowMs: 3000, cooldownMs: 7000, energyCost: 12 },
  /** 5) HAWK'S EYE — the eye sharpens: shots strike harder. */
  hawk: { damageMult: 0.08 },
  /** 6) NET SHOT — the thrown net: light hit + a ROOT where it lands. */
  net: { damage: 8, speed: 460, range: 340, radius: 9, rootMs: 1800, cooldownMs: 9000, energyCost: 14 },
  /** 7) TRUESHOT AURA — you AND your beasts attack faster for the window. */
  trueshot: { attackSpeedMult: 0.2, petAttackSpeedBonus: 0.2, durationMs: 8000, cooldownMs: 18000, energyCost: 18 },
  /** 8) BOOMERANG — framework #4: the returning throw strikes out AND back
   *  (each leg hits each foe once; it lands back in the hand). */
  boomerang: { damage: 16, speed: 520, range: 260, radius: 9, cooldownMs: 6500, energyCost: 14 },
  /** 9) SNIPER'S FOCUS — the stillness state: damage surges briefly. */
  sniper: { damageMult: 0.35, durationMs: 5000, cooldownMs: 20000, energyCost: 20 },
  /** 10) EAGLE'S GAZE — ultimate: one devastating shot from impossible range;
   *  the impact bursts and DISORIENTS (stun + weaken) what stands around it. */
  eagle: { damage: 55, speed: 700, range: 700, radius: 10, splashRadius: 120, splashDamage: 18, stunMs: 900, weaken: 0.25, weakenMs: 4000, cooldownMs: 60000, energyCost: 40 },
} as const;

const T = HUN_MARKS_TUNING;

// ─── THE 10 MARKSMANSHIP SKILLS (linear; tree 'hun_marks') ────────────────────
// >>> EDIT NAMES / DESCRIPTIONS HERE (placeholder prose). <<<
export const HUN_MARKS_SKILLS: SkillDef[] = [
  {
    id: 'hun_mk_steady',
    tree: HUN_MARKS_TREE,
    name: 'Steady Shot',
    description: 'Activate: breathe out, loose — one clean heavy arrow. Your reliable opener; the whole tree stands on it.',
    cost: 1,
    tier: 0,
    effect: {
      kind: 'active',
      action: 'hun_steady',
      cooldownMs: T.steady.cooldownMs,
      energyCost: T.steady.energyCost,
      compose: [{ p: 'bolt', via: 'aimed', damage: T.steady.damage, speed: T.steady.speed, range: T.steady.range, radius: T.steady.radius, tint: 0xa0c86a }],
    },
  },
  {
    id: 'hun_mk_aim',
    tree: HUN_MARKS_TREE,
    name: 'Precise Aim',
    description: `Passive: the shot placed, not thrown — deal ${Math.round(T.aim.damageMult * 100)}% more damage.`,
    cost: 1,
    prereq: 'hun_mk_steady',
    tier: 1,
    effect: { kind: 'passive', stats: { damageMult: T.aim.damageMult } },
  },
  {
    id: 'hun_mk_multi',
    tree: HUN_MARKS_TREE,
    name: 'Multishot',
    description: `Activate: three arrows on one breath — a ${T.multi.spreadDeg}° fan across whatever stands in front of you.`,
    cost: 1,
    prereq: 'hun_mk_aim',
    tier: 2,
    effect: { kind: 'active', action: 'hun_multi', cooldownMs: T.multi.cooldownMs, energyCost: T.multi.energyCost },
  },
  {
    id: 'hun_mk_cripple',
    tree: HUN_MARKS_TREE,
    name: 'Crippling Arrow',
    description: `Activate: take the leg — the struck limp at ${Math.round(T.cripple.slowFactor * 100)}% speed for ${(T.cripple.slowMs / 1000).toFixed(0)}s.`,
    cost: 1,
    prereq: 'hun_mk_multi',
    tier: 3,
    effect: {
      kind: 'active',
      action: 'hun_cripple',
      cooldownMs: T.cripple.cooldownMs,
      energyCost: T.cripple.energyCost,
      compose: [{ p: 'bolt', damage: T.cripple.damage, speed: T.cripple.speed, range: T.cripple.range, radius: T.cripple.radius, tint: 0xa0c86a, onHit: { slowFactor: T.cripple.slowFactor, slowMs: T.cripple.slowMs } }],
    },
  },
  {
    id: 'hun_mk_hawk',
    tree: HUN_MARKS_TREE,
    name: "Hawk's Eye",
    description: `Passive: nothing moves unseen — your strikes land ${Math.round(T.hawk.damageMult * 100)}% harder.`,
    cost: 1,
    prereq: 'hun_mk_cripple',
    tier: 4,
    effect: { kind: 'passive', stats: { damageMult: T.hawk.damageMult } },
  },
  {
    id: 'hun_mk_net',
    tree: HUN_MARKS_TREE,
    name: 'Net Shot',
    description: `Activate: the thrown net — whatever it lands on is PINNED in place for ${(T.net.rootMs / 1000).toFixed(1)}s.`,
    cost: 1,
    prereq: 'hun_mk_hawk',
    tier: 5,
    effect: {
      kind: 'active',
      action: 'hun_net',
      cooldownMs: T.net.cooldownMs,
      energyCost: T.net.energyCost,
      compose: [{ p: 'bolt', damage: T.net.damage, speed: T.net.speed, range: T.net.range, radius: T.net.radius, tint: 0xd8d2a0, onHit: { rootMs: T.net.rootMs } }],
    },
  },
  {
    id: TRUESHOT_AURA_ID,
    tree: HUN_MARKS_TREE,
    name: 'Trueshot Aura',
    description: `Activate: the hunt quickens — for ${(T.trueshot.durationMs / 1000).toFixed(0)}s YOU attack ${Math.round(T.trueshot.attackSpeedMult * 100)}% faster, and any beast walking with you speeds up too.`,
    cost: 1,
    prereq: 'hun_mk_net',
    tier: 6,
    effect: { kind: 'buff', cooldownMs: T.trueshot.cooldownMs, durationMs: T.trueshot.durationMs, energyCost: T.trueshot.energyCost, tint: 0xa0c86a, stats: { attackSpeedMult: T.trueshot.attackSpeedMult } },
  },
  {
    id: 'hun_mk_boomerang',
    tree: HUN_MARKS_TREE,
    name: 'Boomerang',
    description: 'Activate: the returning throw — it cuts everything on the way OUT, turns at the end of its arc, and cuts everything again on the way BACK to your hand.',
    cost: 1,
    prereq: TRUESHOT_AURA_ID,
    tier: 7,
    effect: {
      kind: 'active',
      action: 'hun_boomerang',
      cooldownMs: T.boomerang.cooldownMs,
      energyCost: T.boomerang.energyCost,
      compose: [{ p: 'bolt', damage: T.boomerang.damage, speed: T.boomerang.speed, range: T.boomerang.range, radius: T.boomerang.radius, tint: 0xd8b86a, returning: true }],
    },
  },
  {
    id: 'hun_mk_sniper',
    tree: HUN_MARKS_TREE,
    name: "Sniper's Focus",
    description: `Activate: the world narrows to one line — for ${(T.sniper.durationMs / 1000).toFixed(0)}s your damage rises ${Math.round(T.sniper.damageMult * 100)}%.`,
    cost: 1,
    prereq: 'hun_mk_boomerang',
    tier: 8,
    effect: { kind: 'buff', cooldownMs: T.sniper.cooldownMs, durationMs: T.sniper.durationMs, energyCost: T.sniper.energyCost, tint: 0xffe9a8, stats: { damageMult: T.sniper.damageMult } },
  },
  {
    id: 'hun_mk_eagle',
    tree: HUN_MARKS_TREE,
    name: "Eagle's Gaze",
    description: 'Ultimate — Activate: one shot from a distance nothing should shoot from. The impact BURSTS, and everything standing near it reels, disoriented and weakened. Long cooldown.',
    cost: 1,
    prereq: 'hun_mk_sniper',
    tier: 9,
    effect: {
      kind: 'active',
      action: 'hun_eagle',
      cooldownMs: T.eagle.cooldownMs,
      energyCost: T.eagle.energyCost,
      compose: [
        {
          p: 'bolt',
          damage: T.eagle.damage,
          speed: T.eagle.speed,
          range: T.eagle.range,
          radius: T.eagle.radius,
          tint: 0xffe9a8,
          splash: { radius: T.eagle.splashRadius, damage: T.eagle.splashDamage },
          onHit: { stunMs: T.eagle.stunMs, weaken: T.eagle.weaken, weakenMs: T.eagle.weakenMs },
        },
      ],
    },
  },
];

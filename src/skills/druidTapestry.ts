import type { SkillDef } from './skillData';

/**
 * DRUID — TAPESTRY OF BEASTS TREE (10 skills, linear).
 *
 * The Druid's first tree: shapeshift-flavored melee where every node channels one
 * ANIMAL. EVERY skill carries a data-only `trait` tag (its animal) for the future
 * visual-trait system — nothing renders it today. Same conventions as every tree
 * file: EVERY tunable lives in {@link TAPESTRY_TUNING} (per-skill calibration
 * anchors noted); names/descriptions are PLACEHOLDER prose — edit below. Linear
 * prereqs; tree id 'druid_tapestry'. Tier-0 is a DAMAGING ACTIVE (no-kit rule).
 *
 * Composed where the primitives cover it; the Falcon dash (bespoke per the shipped
 * dash pattern) and the strike+buff combos (Bear/Elephant) dispatch by action id.
 */

export const DRUID_TAPESTRY_TREE = 'druid_tapestry';

// Ids the scene keys the strike+buff combo actives off of (their timed halves).
export const BEAR_MIGHT_ID = 'dru_tap_bear';
export const ELEPHANT_RAGE_ID = 'dru_tap_elephant';

// ─── TUNING (all starting values; tune freely in playtest) ────────────────────
export const TAPESTRY_TUNING = {
  /** 1) PRAYING MANTIS PRECISION — ENTRY damaging active: 3 rapid strikes
   *  (calibrated vs Bash: 26 dmg / 64 range / 2.5s — here 3×10 over ~0.3s / 3s). */
  mantis: { hits: 3, damageEach: 10, hitMs: 130, range: 64, cooldownMs: 3000, energyCost: 8 },
  /** 2) CHAMELEON'S TACT — passive +defense (vs Iron Hide's 0.15). */
  chameleon: { damageReduction: 0.12 },
  /** 3) SCORPION'S VENOM — stacking poison DoT (= Entropy Cascade's numbers, melee range). */
  scorpion: { range: 90, dmgPerTick: 8, tickMs: 600, durationMs: 5000, maxStacks: 6, cooldownMs: 800, energyCost: 6, color: 0x74c86a },
  /** 4) BEAR'S MIGHT — AoE swipe + self damage buff (swipe vs Windmill 24/135;
   *  buff vs Crazed's +40%/8s, here a calmer +20%/10s). */
  bearMight: { damage: 24, radius: 120, buffDamageMult: 0.2, buffMs: 10000, cooldownMs: 12000, energyCost: 20, tint: 0xb0743a },
  /** 5) FIERCE PEREGRINE FALCON — dash lunge that damages + STUNS
   *  (= Control Charge's 300 px / 22 dmg / 1.2s knockdown, same costs). */
  falcon: { distance: 300, damage: 22, knockdownMs: 1000, cooldownMs: 9000, energyCost: 18 },
  /** 6) SNOW LEOPARD'S STEALTH — invisible 3s, cancels all aggro (the stealth extension). */
  snowLeopard: { durationMs: 3000, cooldownMs: 16000, energyCost: 20 },
  /** 7) QUEEN BEE'S SWARM — 10s DoT aura around the Druid (vs Freezing Rain 9/tick r160/5s). */
  beeSwarm: { tickDamage: 8, radius: 140, tickMs: 500, durationMs: 10000, cooldownMs: 16000, energyCost: 24 },
  /** 8) ELK ANTLERS — melee AoE + absorb the next hit (swipe vs Windmill; the
   *  block = a small Mana-Shield pool, vs Ethereal's 60/8s). */
  elk: { damage: 22, radius: 110, shieldAmount: 30, shieldMs: 3000, cooldownMs: 10000, energyCost: 18 },
  /** 9) LION'S MANE — timed +defense self buff (vs War Chant's 0.2 DR / 8s / 16s). */
  lion: { damageReduction: 0.25, durationMs: 8000, cooldownMs: 16000, energyCost: 20, tint: 0xd8a83a },
  /** 10) ELEPHANT'S RAGE — WIDE AoE swipe + 5s defense buff (swipe vs Tornado r180/26;
   *  buff vs War Chant's DR, bigger but shorter). */
  elephant: { damage: 30, radius: 170, buffDamageReduction: 0.3, buffMs: 5000, cooldownMs: 20000, energyCost: 30, tint: 0x8a8a9a },
} as const;

const T = TAPESTRY_TUNING;

// ─── THE 10 TAPESTRY SKILLS (linear; tree 'druid_tapestry') ───────────────────
// >>> EDIT NAMES / DESCRIPTIONS HERE (placeholder prose). <<<
export const DRUID_TAPESTRY_SKILLS: SkillDef[] = [
  {
    id: 'dru_tap_mantis',
    tree: DRUID_TAPESTRY_TREE,
    name: 'Praying Mantis Precision',
    description: `Activate: ${T.mantis.hits} lightning-fast strikes in front of you — shreds one foe or several. Your reliable opener.`,
    cost: 1,
    tier: 0,
    trait: 'mantis',
    effect: {
      kind: 'active',
      action: 'dru_mantis',
      cooldownMs: T.mantis.cooldownMs,
      energyCost: T.mantis.energyCost,
      compose: [{ p: 'strike', at: 'front', range: T.mantis.range, damage: T.mantis.damageEach, tint: 0x9ae08a, pulses: T.mantis.hits, pulseMs: T.mantis.hitMs }],
    },
  },
  {
    id: 'dru_tap_chameleon',
    tree: DRUID_TAPESTRY_TREE,
    name: "Chameleon's Tact",
    description: `Passive: skin that shifts with the world — −${Math.round(T.chameleon.damageReduction * 100)}% incoming damage.`,
    cost: 1,
    prereq: 'dru_tap_mantis',
    tier: 1,
    trait: 'chameleon',
    effect: { kind: 'passive', stats: { damageReduction: T.chameleon.damageReduction } },
  },
  {
    id: 'dru_tap_scorpion',
    tree: DRUID_TAPESTRY_TREE,
    name: "Scorpion's Venom",
    description: `Activate: sting the nearest foe with stacking venom. Re-cast to STACK it (up to ${T.scorpion.maxStacks}); stacks sum, each with its own timer.`,
    cost: 1,
    prereq: 'dru_tap_chameleon',
    tier: 2,
    trait: 'scorpion',
    effect: {
      kind: 'stacking_dot',
      cooldownMs: T.scorpion.cooldownMs,
      range: T.scorpion.range,
      dmgPerTick: T.scorpion.dmgPerTick,
      tickMs: T.scorpion.tickMs,
      durationMs: T.scorpion.durationMs,
      maxStacks: T.scorpion.maxStacks,
      energyCost: T.scorpion.energyCost,
      color: T.scorpion.color,
    },
  },
  {
    id: BEAR_MIGHT_ID,
    tree: DRUID_TAPESTRY_TREE,
    name: "Bear's Might",
    description: `Activate: a crushing swipe around you, and the bear's strength lingers — +${Math.round(T.bearMight.buffDamageMult * 100)}% damage for ${(T.bearMight.buffMs / 1000).toFixed(0)}s.`,
    cost: 1,
    prereq: 'dru_tap_scorpion',
    tier: 3,
    trait: 'bear',
    effect: { kind: 'active', action: 'dru_bear_might', cooldownMs: T.bearMight.cooldownMs, energyCost: T.bearMight.energyCost },
  },
  {
    id: 'dru_tap_falcon',
    tree: DRUID_TAPESTRY_TREE,
    name: 'Fierce Peregrine Falcon',
    description: 'Activate: dive forward in a killing stoop — enemies in your path are damaged and STUNNED.',
    cost: 1,
    prereq: BEAR_MIGHT_ID,
    tier: 4,
    trait: 'falcon',
    effect: { kind: 'active', action: 'dru_falcon', cooldownMs: T.falcon.cooldownMs, energyCost: T.falcon.energyCost },
  },
  {
    id: 'dru_tap_snow_leopard',
    tree: DRUID_TAPESTRY_TREE,
    name: "Snow Leopard's Stealth",
    description: `Activate: vanish for ${(T.snowLeopard.durationMs / 1000).toFixed(0)}s — all enemies lose you completely. Attacking breaks it.`,
    cost: 1,
    prereq: 'dru_tap_falcon',
    tier: 5,
    trait: 'snow-leopard',
    effect: {
      kind: 'active',
      action: 'dru_stealth',
      cooldownMs: T.snowLeopard.cooldownMs,
      energyCost: T.snowLeopard.energyCost,
      compose: [{ p: 'stealth', durationMs: T.snowLeopard.durationMs, banner: 'Hidden' }],
    },
  },
  {
    id: 'dru_tap_bee',
    tree: DRUID_TAPESTRY_TREE,
    name: "Queen Bee's Swarm",
    description: `Activate: a furious swarm boils around you for ${(T.beeSwarm.durationMs / 1000).toFixed(0)}s, stinging every enemy nearby.`,
    cost: 1,
    prereq: 'dru_tap_snow_leopard',
    tier: 6,
    trait: 'bee',
    effect: {
      kind: 'active',
      action: 'dru_bee_swarm',
      cooldownMs: T.beeSwarm.cooldownMs,
      energyCost: T.beeSwarm.energyCost,
      compose: [{ p: 'hazard', at: 'self', radius: T.beeSwarm.radius, tickDamage: T.beeSwarm.tickDamage, tickMs: T.beeSwarm.tickMs, durationMs: T.beeSwarm.durationMs, fill: 0xc8a02a, stroke: 0xf0d05a }],
    },
  },
  {
    id: 'dru_tap_elk',
    tree: DRUID_TAPESTRY_TREE,
    name: 'Elk Antlers',
    description: `Activate: sweep your antlers through everything around you, then brace — ABSORB the next ${T.elk.shieldAmount} damage.`,
    cost: 1,
    prereq: 'dru_tap_bee',
    tier: 7,
    trait: 'elk',
    effect: {
      kind: 'active',
      action: 'dru_elk',
      cooldownMs: T.elk.cooldownMs,
      energyCost: T.elk.energyCost,
      compose: [
        { p: 'strike', at: 'self', radius: T.elk.radius, damage: T.elk.damage, tint: 0xc8b08a },
        { p: 'shield', amount: T.elk.shieldAmount, durationMs: T.elk.shieldMs, banner: 'Antlers braced' },
      ],
    },
  },
  {
    id: 'dru_tap_lion',
    tree: DRUID_TAPESTRY_TREE,
    name: "Lion's Mane",
    description: `Activate: the lion's regal guard — take −${Math.round(T.lion.damageReduction * 100)}% damage for ${(T.lion.durationMs / 1000).toFixed(0)}s.`,
    cost: 1,
    prereq: 'dru_tap_elk',
    tier: 8,
    trait: 'lion',
    effect: { kind: 'buff', cooldownMs: T.lion.cooldownMs, durationMs: T.lion.durationMs, energyCost: T.lion.energyCost, tint: T.lion.tint, stats: { damageReduction: T.lion.damageReduction } },
  },
  {
    id: ELEPHANT_RAGE_ID,
    tree: DRUID_TAPESTRY_TREE,
    name: "Elephant's Rage",
    description: `Activate: a thunderous sweep striking ALL enemies around you, and thick hide holds — −${Math.round(T.elephant.buffDamageReduction * 100)}% damage taken for ${(T.elephant.buffMs / 1000).toFixed(0)}s.`,
    cost: 1,
    prereq: 'dru_tap_lion',
    tier: 9,
    trait: 'elephant',
    effect: { kind: 'active', action: 'dru_elephant', cooldownMs: T.elephant.cooldownMs, energyCost: T.elephant.energyCost },
  },
];

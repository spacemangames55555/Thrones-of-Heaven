import type { SkillDef } from './skillData';

/**
 * MAGE — CRYSTALBLADE MASTERY TREE (10 skills, linear).
 *
 * The Mage's third tree: the forged crystal blade — melee arcana built on the
 * CRYSTALLIZE/SHATTER extension (strike riders bank stacks; Shatter detonates
 * them). CANON: Mage ≠ Wizard. Conventions as always: EVERY tunable lives in
 * {@link CRYSTALBLADE_TUNING} with calibration anchors; placeholder prose.
 * Linear prereqs; tree id 'mage_crystal'. Tier-0 is a DAMAGING ACTIVE.
 *
 * NOTE: there is no crit system in this build — Crystal Empowerment's "crit
 * chance + crit damage" is modeled as its EXPECTED VALUE (a flat +damage
 * passive); a real crit system can replace it later without data churn.
 */

export const MAGE_CRYSTAL_TREE = 'mage_crystal';

// ─── TUNING (all starting values; tune freely in playtest) ────────────────────
export const CRYSTALBLADE_TUNING = {
  /** 1) CRYSTAL SHARD — ENTRY ranged spikes that SLOW (damage vs Icicle's 24;
   *  slow vs Frostbite's 0.5/4s). Strikes the nearest foe in range. */
  crystalShard: { range: 300, radius: 40, damage: 22, slowFactor: 0.6, slowMs: 2500, cooldownMs: 2000, energyCost: 9 },
  /** 2) ENCAPSULATION — TOGGLE transformation: forge the crystal blade (melee mode;
   *  no timer — cast to enter, cast again to exit; durationMs unused while toggled).
   *  Damage vs Prism Quartz's +60%, here a sustained +35%. */
  encapsulation: { damageMult: 0.35, durationMs: 12000, cooldownMs: 30000, tint: 0x9ae0e8 },
  /** 3) CRYSTAL STRIKE — the core melee hit, banks 1 crystallize stack (vs Bash 26/64/2.5s). */
  crystalStrike: { damage: 24, range: 70, stacks: 1, maxStacks: 6, cooldownMs: 2500, energyCost: 8 },
  /** 4) CRYSTAL EMPOWERMENT — passive "crit" as expected value (vs Berserker's +20%). */
  crystalEmpowerment: { damageMult: 0.15 },
  /** 5) CRYSTAL FLURRY — three rapid slashes, each banks a stack (vs Mantis 3×10). */
  crystalFlurry: { hits: 3, damageEach: 9, hitMs: 130, range: 66, stacksPerHit: 1, maxStacks: 6, cooldownMs: 5000, energyCost: 14 },
  /** 6) FACET CLEAVE — wide arc: every enemy hit gains a stack + a minor weaken
   *  (arc vs Shield Swing 30/150; weaken vs Intimidate's 0.3, here 0.15). */
  facetCleave: { damage: 26, range: 150, arcReach: 0.6, stacks: 1, maxStacks: 6, weaken: 0.15, weakenMs: 4000, cooldownMs: 7000, energyCost: 16 },
  /** 7) CRYSTAL PULSE — shockwave: damage + knockback (vs Shove's 130px push + Windmill's 24). */
  crystalPulse: { damage: 24, radius: 130, knockback: 130, knockbackStunMs: 200, cooldownMs: 8000, energyCost: 18 },
  /** 8) CRYSTAL SHATTER — detonate ALL banked stacks on nearby enemies
   *  (the shatter extension; damage per stack vs Bash-sized hits). */
  crystalShatter: { radius: 200, damagePerStack: 12, cooldownMs: 10000, energyCost: 20 },
  /** 9) CRYSTAL NOVA — wide explosive shard burst (vs Tornado's r180, single pulse). */
  crystalNova: { damage: 30, radius: 180, cooldownMs: 10000, energyCost: 22 },
  /** 10) PERFECT EDGE — capstone form: attack speed + cleaving strikes + lifesteal
   *  (vs Prism Quartz's kit). */
  perfectEdge: { attackSpeedMult: 0.5, cleaveHits: 2, lifestealPct: 0.15, durationMs: 12000, cooldownMs: 60000, tint: 0xd8f4ff },
} as const;

const T = CRYSTALBLADE_TUNING;

// ─── THE 10 CRYSTALBLADE SKILLS (linear; tree 'mage_crystal') ─────────────────
// >>> EDIT NAMES / DESCRIPTIONS HERE (placeholder prose). <<<
export const MAGE_CRYSTAL_SKILLS: SkillDef[] = [
  {
    id: 'mage_cb_shard',
    tree: MAGE_CRYSTAL_TREE,
    name: 'Crystal Shard',
    description: `Activate: launch crystal spikes at the nearest foe — damage plus a SLOW as the shards weigh it down. Your reliable opener.`,
    cost: 1,
    tier: 0,
    effect: {
      kind: 'active',
      action: 'mage_crystal_shard',
      cooldownMs: T.crystalShard.cooldownMs,
      energyCost: T.crystalShard.energyCost,
      compose: [{ p: 'strike', at: 'nearest', range: T.crystalShard.range, radius: T.crystalShard.radius, damage: T.crystalShard.damage, tint: 0xbfe0ff, slowFactor: T.crystalShard.slowFactor, slowMs: T.crystalShard.slowMs, missBanner: 'No target in range' }],
    },
  },
  {
    id: 'mage_cb_encapsulation',
    tree: MAGE_CRYSTAL_TREE,
    name: 'Encapsulation',
    description: `Activate: forge arcana into a living crystal blade — +${Math.round(T.encapsulation.damageMult * 100)}% damage while it is drawn. No timer: cast again to sheathe it.`,
    cost: 1,
    prereq: 'mage_cb_shard',
    tier: 1,
    effect: { kind: 'transformation', toggle: true, cooldownMs: T.encapsulation.cooldownMs, durationMs: T.encapsulation.durationMs, tint: T.encapsulation.tint, stats: { damageMult: T.encapsulation.damageMult } },
  },
  {
    id: 'mage_cb_strike',
    tree: MAGE_CRYSTAL_TREE,
    name: 'Crystal Strike',
    description: 'Activate: a precise blade strike that leaves a CRYSTALLIZE seed in the wound (Shatter detonates the seeds).',
    cost: 1,
    prereq: 'mage_cb_encapsulation',
    tier: 2,
    effect: {
      kind: 'active',
      action: 'mage_crystal_strike',
      cooldownMs: T.crystalStrike.cooldownMs,
      energyCost: T.crystalStrike.energyCost,
      compose: [{ p: 'strike', at: 'front', range: T.crystalStrike.range, damage: T.crystalStrike.damage, tint: 0xbfe0ff, crystallize: T.crystalStrike.stacks, crystallizeMax: T.crystalStrike.maxStacks }],
    },
  },
  {
    id: 'mage_cb_empowerment',
    tree: MAGE_CRYSTAL_TREE,
    name: 'Crystal Empowerment',
    description: `Passive: faceted edges find every weakness — +${Math.round(T.crystalEmpowerment.damageMult * 100)}% damage.`,
    cost: 1,
    prereq: 'mage_cb_strike',
    tier: 3,
    effect: { kind: 'passive', stats: { damageMult: T.crystalEmpowerment.damageMult } },
  },
  {
    id: 'mage_cb_flurry',
    tree: MAGE_CRYSTAL_TREE,
    name: 'Crystal Flurry',
    description: `Activate: ${T.crystalFlurry.hits} lightning-fast slashes — each banks a CRYSTALLIZE seed in what it hits.`,
    cost: 1,
    prereq: 'mage_cb_empowerment',
    tier: 4,
    effect: {
      kind: 'active',
      action: 'mage_crystal_flurry',
      cooldownMs: T.crystalFlurry.cooldownMs,
      energyCost: T.crystalFlurry.energyCost,
      compose: [{ p: 'strike', at: 'front', range: T.crystalFlurry.range, damage: T.crystalFlurry.damageEach, tint: 0xbfe0ff, pulses: T.crystalFlurry.hits, pulseMs: T.crystalFlurry.hitMs, crystallize: T.crystalFlurry.stacksPerHit, crystallizeMax: T.crystalFlurry.maxStacks }],
    },
  },
  {
    id: 'mage_cb_facet_cleave',
    tree: MAGE_CRYSTAL_TREE,
    name: 'Facet Cleave',
    description: `Activate: a wide sweeping arc — every enemy hit gains a CRYSTALLIZE seed and is WEAKENED (−${Math.round(T.facetCleave.weaken * 100)}% damage) for ${(T.facetCleave.weakenMs / 1000).toFixed(0)}s.`,
    cost: 1,
    prereq: 'mage_cb_flurry',
    tier: 5,
    effect: {
      kind: 'active',
      action: 'mage_facet_cleave',
      cooldownMs: T.facetCleave.cooldownMs,
      energyCost: T.facetCleave.energyCost,
      compose: [{
        p: 'strike', at: 'front', range: T.facetCleave.range, reach: T.facetCleave.arcReach, damage: T.facetCleave.damage, tint: 0xbfe0ff,
        crystallize: T.facetCleave.stacks, crystallizeMax: T.facetCleave.maxStacks,
        weaken: T.facetCleave.weaken, weakenMs: T.facetCleave.weakenMs, weakenOnlyIfHit: true,
      }],
    },
  },
  {
    id: 'mage_cb_pulse',
    tree: MAGE_CRYSTAL_TREE,
    name: 'Crystal Pulse',
    description: 'Activate: slam the blade down — a shockwave that damages and KNOCKS BACK everything around you.',
    cost: 1,
    prereq: 'mage_cb_facet_cleave',
    tier: 6,
    effect: {
      kind: 'active',
      action: 'mage_crystal_pulse',
      cooldownMs: T.crystalPulse.cooldownMs,
      energyCost: T.crystalPulse.energyCost,
      compose: [{ p: 'strike', at: 'self', radius: T.crystalPulse.radius, damage: T.crystalPulse.damage, tint: 0xbfe0ff, knockback: T.crystalPulse.knockback, knockbackStunMs: T.crystalPulse.knockbackStunMs }],
    },
  },
  {
    id: 'mage_cb_shatter',
    tree: MAGE_CRYSTAL_TREE,
    name: 'Crystal Shatter',
    description: `Activate: detonate EVERY crystallize seed on enemies near you — ${T.crystalShatter.damagePerStack} damage per seed, all at once.`,
    cost: 1,
    prereq: 'mage_cb_pulse',
    tier: 7,
    effect: { kind: 'active', action: 'mage_shatter', cooldownMs: T.crystalShatter.cooldownMs, energyCost: T.crystalShatter.energyCost },
  },
  {
    id: 'mage_cb_nova',
    tree: MAGE_CRYSTAL_TREE,
    name: 'Crystal Nova',
    description: 'Activate: a wide explosive burst of shards, striking ALL enemies around you.',
    cost: 1,
    prereq: 'mage_cb_shatter',
    tier: 8,
    effect: {
      kind: 'active',
      action: 'mage_crystal_nova',
      cooldownMs: T.crystalNova.cooldownMs,
      energyCost: T.crystalNova.energyCost,
      compose: [{ p: 'strike', at: 'self', radius: T.crystalNova.radius, damage: T.crystalNova.damage, tint: 0xd8f4ff }],
    },
  },
  {
    id: 'mage_cb_perfect_edge',
    tree: MAGE_CRYSTAL_TREE,
    name: 'Perfect Edge',
    description: `Capstone — Activate: the blade reaches its perfect form for ${(T.perfectEdge.durationMs / 1000).toFixed(0)}s: +${Math.round(T.perfectEdge.attackSpeedMult * 100)}% attack speed, your strikes CLEAVE (${T.perfectEdge.cleaveHits} hits), and you heal for ${Math.round(T.perfectEdge.lifestealPct * 100)}% of the damage you deal.`,
    cost: 1,
    prereq: 'mage_cb_nova',
    tier: 9,
    effect: {
      kind: 'transformation',
      cooldownMs: T.perfectEdge.cooldownMs,
      durationMs: T.perfectEdge.durationMs,
      tint: T.perfectEdge.tint,
      stats: { attackSpeedMult: T.perfectEdge.attackSpeedMult, basicHitCount: T.perfectEdge.cleaveHits, lifestealPct: T.perfectEdge.lifestealPct },
    },
  },
];

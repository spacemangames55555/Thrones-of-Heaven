import type { SkillDef } from './skillData';
import {
  VIPER_TUNING,
  WOLVERINE_TUNING,
  CHIMPANZEE_TUNING,
  SCAVENGER_TUNING,
  POLAR_BEAR_TUNING,
} from '../summon/summonData';

/**
 * DRUID — WILD KIN & EARTH'S WRATH TREE (10 skills, linear).
 *
 * The Druid's third tree: elemental wrath interleaved with wild-kin summons. The
 * five summons live as configs in summonData.ts (Viper poison / Wolverine bleed
 * via the attackDot rider; the Chimpanzee PAIR and the untargetable timed
 * SCAVENGERS via the Commit-1 summon variants; the Polar Bear = a magnet-tier
 * taunt tank). Damage skills compose onto the shared primitives (cone+slow,
 * chain, placed strikes, splash bolt). EVERY tunable lives in
 * {@link WILDKIN_TUNING} with per-skill calibration anchors; names/descriptions
 * are PLACEHOLDER prose. Linear prereqs; tree id 'druid_wildkin'. Tier-0 is a
 * DAMAGING active (no-kit rule).
 */

export const DRUID_WILDKIN_TREE = 'druid_wildkin';

// ─── TUNING (all starting values; tune freely in playtest) ────────────────────
export const WILDKIN_TUNING = {
  /** 1) FREEZING WIND CHILL — ENTRY cone: damage + slow (cone vs Dust Devil 30/135/35°,
   *  slow vs Frostbite's 0.5; entry cadence like Fireball/Icicle). */
  chill: { damage: 26, range: 135, coneHalfAngleDeg: 35, slowFactor: 0.55, slowMs: 3000, cooldownMs: 2500, energyCost: 10 },
  /** 2) VIPER SUMMON — tier-1 poison attacker (unit stats live in VIPER_TUNING). */
  viper: { cooldownMs: VIPER_TUNING.summonCooldownMs, energyCost: VIPER_TUNING.summonEnergyCost },
  /** 3) LIGHTNING STRIKE — the CHAIN extension: arcs across up to 1+jumps enemies
   *  (vs Fireball's 26 single-target; falloff halves the total-per-target). */
  lightning: { damage: 24, range: 340, jumps: 3, jumpRange: 220, falloff: 0.6, cooldownMs: 5000, energyCost: 16 },
  /** 4) WOLVERINE SUMMON — tier-2 bleed attacker (unit stats in WOLVERINE_TUNING). */
  wolverine: { cooldownMs: WOLVERINE_TUNING.summonCooldownMs, energyCost: WOLVERINE_TUNING.summonEnergyCost },
  /** 5) EARTHQUAKE — placed ground AoE: damage + slow (placement vs Biohazard's 220
   *  throw; slow vs Freezing Rain's 0.55). */
  earthquake: { damage: 26, placeAhead: 200, radius: 130, slowFactor: 0.5, slowMs: 3000, cooldownMs: 9000, energyCost: 20 },
  /** 6) CHIMPANZEE PAIR — the PAIR extension: two tougher melee units from one cast. */
  chimpPair: { cooldownMs: CHIMPANZEE_TUNING.summonCooldownMs, energyCost: CHIMPANZEE_TUNING.summonEnergyCost },
  /** 7) LAVA POCKET — explosion bolt with splash (= Combust's 24 direct / 18 splash r90). */
  lavaPocket: { directDamage: 24, splashDamage: 18, splashRadius: 90, speed: 440, range: 340, radius: 12, cooldownMs: 6000, energyCost: 18 },
  /** 8) SCAVENGER SUMMON — the UNTARGETABLE TIMED extension: 3 chip units for 30s. */
  scavengers: { cooldownMs: SCAVENGER_TUNING.summonCooldownMs, energyCost: SCAVENGER_TUNING.summonEnergyCost },
  /** 9) POLAR BEAR SUMMON — high-HP taunt tank (unit stats in POLAR_BEAR_TUNING). */
  polarBear: { cooldownMs: POLAR_BEAR_TUNING.summonCooldownMs, energyCost: POLAR_BEAR_TUNING.summonEnergyCost },
  /** 10) HAIL STONES — placed AoE: damage + STUN (stun vs Shield Bash's 1s;
   *  damage between Windmill and Overswing on a long cooldown). */
  hail: { damage: 30, placeAhead: 220, radius: 140, stunMs: 900, cooldownMs: 14000, energyCost: 26 },
} as const;

const T = WILDKIN_TUNING;
const pct = (mult: number): number => Math.round((1 - mult) * 100); // slow factor → "−N% speed"

// ─── THE 10 WILD KIN SKILLS (linear; tree 'druid_wildkin') ────────────────────
// >>> EDIT NAMES / DESCRIPTIONS HERE (placeholder prose). <<<
export const DRUID_WILDKIN_SKILLS: SkillDef[] = [
  {
    id: 'dru_wk_chill',
    tree: DRUID_WILDKIN_TREE,
    name: 'Freezing Wind Chill',
    description: `Activate: a cone of freezing wind — damages and SLOWS (−${pct(T.chill.slowFactor)}% speed) everything in the wedge. Your reliable opener.`,
    cost: 1,
    tier: 0,
    effect: {
      kind: 'active',
      action: 'dru_chill',
      cooldownMs: T.chill.cooldownMs,
      energyCost: T.chill.energyCost,
      compose: [{ p: 'cone', range: T.chill.range, halfAngleDeg: T.chill.coneHalfAngleDeg, damage: T.chill.damage, tint: 0xbfe6ff, slowFactor: T.chill.slowFactor, slowMs: T.chill.slowMs }],
    },
  },
  {
    id: 'dru_wk_viper',
    tree: DRUID_WILDKIN_TREE,
    name: 'Viper Summon',
    description: 'Activate: call a viper to fight beside you — its bites POISON what they strike.',
    cost: 1,
    prereq: 'dru_wk_chill',
    tier: 1,
    effect: { kind: 'active', action: 'dru_viper', cooldownMs: T.viper.cooldownMs, energyCost: T.viper.energyCost },
  },
  {
    id: 'dru_wk_lightning',
    tree: DRUID_WILDKIN_TREE,
    name: 'Lightning Strike',
    description: `Activate: lightning strikes the nearest enemy and ARCS to up to ${T.lightning.jumps} more, weakening with each jump.`,
    cost: 1,
    prereq: 'dru_wk_viper',
    tier: 2,
    effect: {
      kind: 'active',
      action: 'dru_lightning',
      cooldownMs: T.lightning.cooldownMs,
      energyCost: T.lightning.energyCost,
      compose: [{ p: 'chain', range: T.lightning.range, jumps: T.lightning.jumps, jumpRange: T.lightning.jumpRange, damage: T.lightning.damage, falloff: T.lightning.falloff, tint: 0xaee6ff }],
    },
  },
  {
    id: 'dru_wk_wolverine',
    tree: DRUID_WILDKIN_TREE,
    name: 'Wolverine Summon',
    description: 'Activate: call a wolverine to fight beside you — its savage swipes leave BLEEDING wounds.',
    cost: 1,
    prereq: 'dru_wk_lightning',
    tier: 3,
    effect: { kind: 'active', action: 'dru_wolverine', cooldownMs: T.wolverine.cooldownMs, energyCost: T.wolverine.energyCost },
  },
  {
    id: 'dru_wk_earthquake',
    tree: DRUID_WILDKIN_TREE,
    name: 'Earthquake',
    description: `Activate: split the ground ahead — enemies caught in the shudder are damaged and SLOWED (−${pct(T.earthquake.slowFactor)}% speed).`,
    cost: 1,
    prereq: 'dru_wk_wolverine',
    tier: 4,
    effect: {
      kind: 'active',
      action: 'dru_earthquake',
      cooldownMs: T.earthquake.cooldownMs,
      energyCost: T.earthquake.energyCost,
      compose: [{ p: 'strike', at: 'ahead', range: T.earthquake.placeAhead, radius: T.earthquake.radius, damage: T.earthquake.damage, tint: 0xb09060, slowFactor: T.earthquake.slowFactor, slowMs: T.earthquake.slowMs }],
    },
  },
  {
    id: 'dru_wk_chimp_pair',
    tree: DRUID_WILDKIN_TREE,
    name: 'Chimpanzee Pair',
    description: 'Activate: call a BONDED PAIR of chimpanzees — two tough single-target bruisers from one cast.',
    cost: 1,
    prereq: 'dru_wk_earthquake',
    tier: 5,
    effect: { kind: 'active', action: 'dru_chimp_pair', cooldownMs: T.chimpPair.cooldownMs, energyCost: T.chimpPair.energyCost },
  },
  {
    id: 'dru_wk_lava_pocket',
    tree: DRUID_WILDKIN_TREE,
    name: 'Lava Pocket',
    description: 'Activate: hurl a molten globule that EXPLODES on impact, splashing fire onto everything nearby.',
    cost: 1,
    prereq: 'dru_wk_chimp_pair',
    tier: 6,
    effect: {
      kind: 'active',
      action: 'dru_lava_pocket',
      cooldownMs: T.lavaPocket.cooldownMs,
      energyCost: T.lavaPocket.energyCost,
      compose: [{ p: 'bolt', via: 'wizard', damage: T.lavaPocket.directDamage, speed: T.lavaPocket.speed, range: T.lavaPocket.range, radius: T.lavaPocket.radius, tint: 0xff6a2a, splash: { radius: T.lavaPocket.splashRadius, damage: T.lavaPocket.splashDamage } }],
    },
  },
  {
    id: 'dru_wk_scavengers',
    tree: DRUID_WILDKIN_TREE,
    name: 'Scavenger Summon',
    description: `Activate: release ${SCAVENGER_TUNING.count} scavengers for ${(SCAVENGER_TUNING.durationMs / 1000).toFixed(0)}s — too quick for enemies to target, nipping steadily at your foes.`,
    cost: 1,
    prereq: 'dru_wk_lava_pocket',
    tier: 7,
    effect: { kind: 'active', action: 'dru_scavengers', cooldownMs: T.scavengers.cooldownMs, energyCost: T.scavengers.energyCost },
  },
  {
    id: 'dru_wk_polar_bear',
    tree: DRUID_WILDKIN_TREE,
    name: 'Polar Bear Summon',
    description: `Activate: call a polar bear (${POLAR_BEAR_TUNING.maxHP} HP) — a towering tank that TAUNTS enemies onto itself and mauls them.`,
    cost: 1,
    prereq: 'dru_wk_scavengers',
    tier: 8,
    effect: { kind: 'active', action: 'dru_polar_bear', cooldownMs: T.polarBear.cooldownMs, energyCost: T.polarBear.energyCost },
  },
  {
    id: 'dru_wk_hail',
    tree: DRUID_WILDKIN_TREE,
    name: 'Hail Stones',
    description: `Activate: hammer the ground ahead with hail — enemies caught beneath are damaged and STUNNED for ${(T.hail.stunMs / 1000).toFixed(1)}s.`,
    cost: 1,
    prereq: 'dru_wk_polar_bear',
    tier: 9,
    effect: {
      kind: 'active',
      action: 'dru_hail',
      cooldownMs: T.hail.cooldownMs,
      energyCost: T.hail.energyCost,
      compose: [{ p: 'strike', at: 'ahead', range: T.hail.placeAhead, radius: T.hail.radius, damage: T.hail.damage, tint: 0xdfefff, stunMs: T.hail.stunMs }],
    },
  },
];

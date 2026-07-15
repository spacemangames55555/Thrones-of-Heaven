import type { SkillDef } from './skillData';

/**
 * BARD — BATTLE RESONANCE TREE (10 skills, linear; MELEE ONLY).
 *
 * RANGE DOCTRINE (Casey's ruling): this tree's OFFENSE IS MELEE ONLY — no
 * projectiles, no long placements. The one sanctioned reach concession is
 * Piercing Whistle: a SHORT melee-range cone utility. Every skill carries a
 * DORMANT `ensemble` block for the party era. Conventions as always: EVERY
 * tunable in {@link BARD_BATTLE_TUNING} with calibration anchors; placeholder
 * prose. Tree id 'bard_battle'. Tier-0 is a DAMAGING ACTIVE (no-kit rule).
 *
 * Composed where the primitives cover it; Stage Dive (dash), Harmonic
 * Amplification (counted splash charges), Coda (the conditional finisher) and
 * War Song (the combo-ultimate state) dispatch by action id.
 */

export const BARD_BATTLE_TREE = 'bard_battle';

// ─── TUNING (all starting values; tune freely in playtest) ────────────────────
export const BARD_BATTLE_TUNING = {
  /** 1) MOSH — ENTRY rapid multi-swing combo (= the Mantis/Flurry pattern: 3×9 vs Bash's 26). */
  mosh: { hits: 3, damageEach: 9, hitMs: 130, range: 66, cooldownMs: 2800, energyCost: 8 },
  /** 2) THROAT CHANT — attack speed + strength (Crazed-lite, no downside). */
  throatChant: { attackSpeedMult: 0.3, damageMult: 0.15, durationMs: 8000, cooldownMs: 16000, energyCost: 18, tint: 0xd8a86a },
  /** 3) RESONANCE CASCADE — the melee STRIKE-CHAIN (vs the Druid's chain numbers at
   *  melee reach; one crescent per hop). */
  cascade: { range: 90, jumps: 2, jumpRange: 140, damage: 24, falloff: 0.6, cooldownMs: 6000, energyCost: 16 },
  /** 4) PIERCING WHISTLE — the sanctioned SHORT melee-range cone stun (stun vs
   *  Shield Bash's 1s; low Disarm-class damage). */
  whistle: { range: 110, coneHalfAngleDeg: 40, damage: 12, stunMs: 900, cooldownMs: 9000, energyCost: 18 },
  /** 5) HEAVY SWING — one huge telegraphed blow (= Overswing's 70/84/600ms). */
  heavySwing: { damage: 70, range: 84, windUpMs: 600, cooldownMs: 8000, energyCost: 20 },
  /** 6) STAGE DIVE — leaping dash-strike into the crowd (= the Charge/Falcon dash). */
  stageDive: { distance: 280, damage: 24, knockdownMs: 900, cooldownMs: 10000, energyCost: 20 },
  /** 7) HARMONIC AMPLIFICATION — the next 3 attacks splash (splash vs Combust's 18/r90). */
  amplify: { charges: 3, splashRadius: 90, splashDamage: 12, cooldownMs: 12000, energyCost: 18 },
  /** 8) FREQUENCY SHIELD — a brief absorb field (Mana-Shield-lite: 50 for 5s). */
  freqShield: { amount: 50, durationMs: 5000, cooldownMs: 14000, energyCost: 20 },
  /** 9) CODA — the CONDITIONAL FINISHER: ×bonus vs stunned/weakened targets
   *  (the Execute pattern, per-target). */
  coda: { radius: 120, damage: 24, bonusMult: 2.5, cooldownMs: 9000, energyCost: 20 },
  /** 10) WAR SONG — ultimate: the COMBO state — rapid auto-chained strikes + momentum
   *  (duration/cd vs the other ultimates' 45–60s cycle). */
  warSong: { durationMs: 6000, intervalMs: 450, range: 130, damage: 14, jumps: 2, jumpRange: 140, falloff: 0.6, damageReduction: 0.2, moveSpeedMult: 0.15, cooldownMs: 60000, energyCost: 40, tint: 0xffd0a0 },
} as const;

const T = BARD_BATTLE_TUNING;

// ─── THE 10 BATTLE SKILLS (linear; tree 'bard_battle') ────────────────────────
// >>> EDIT NAMES / DESCRIPTIONS HERE (placeholder prose). <<<
export const BARD_BATTLE_SKILLS: SkillDef[] = [
  {
    id: 'bard_bt_mosh',
    tree: BARD_BATTLE_TREE,
    name: 'Mosh',
    description: `Activate: ${T.mosh.hits} wild rapid swings in front of you. Your reliable opener.`,
    cost: 1,
    tier: 0,
    ensemble: { damagePerAllyPct: 0.05 },
    effect: {
      kind: 'active',
      action: 'bard_mosh',
      cooldownMs: T.mosh.cooldownMs,
      energyCost: T.mosh.energyCost,
      compose: [{ p: 'strike', at: 'front', range: T.mosh.range, damage: T.mosh.damageEach, tint: 0xffb8d0, pulses: T.mosh.hits, pulseMs: T.mosh.hitMs }],
    },
  },
  {
    id: 'bard_bt_throat',
    tree: BARD_BATTLE_TREE,
    name: 'Throat Chant',
    description: `Activate: a guttural drone — +${Math.round(T.throatChant.attackSpeedMult * 100)}% attack speed and +${Math.round(T.throatChant.damageMult * 100)}% damage for ${(T.throatChant.durationMs / 1000).toFixed(0)}s.`,
    cost: 1,
    prereq: 'bard_bt_mosh',
    tier: 1,
    ensemble: { attackSpeedPerAllyPct: 0.05 },
    effect: { kind: 'buff', cooldownMs: T.throatChant.cooldownMs, durationMs: T.throatChant.durationMs, energyCost: T.throatChant.energyCost, tint: T.throatChant.tint, stats: { attackSpeedMult: T.throatChant.attackSpeedMult, damageMult: T.throatChant.damageMult } },
  },
  {
    id: 'bard_bt_cascade',
    tree: BARD_BATTLE_TREE,
    name: 'Resonance Cascade',
    description: `Activate: one struck note LEAPS through up to ${T.cascade.jumps + 1} enemies in sequence, fading with each jump.`,
    cost: 1,
    prereq: 'bard_bt_throat',
    tier: 2,
    ensemble: { jumpsPerAlly: 0 },
    effect: {
      kind: 'active',
      action: 'bard_cascade',
      cooldownMs: T.cascade.cooldownMs,
      energyCost: T.cascade.energyCost,
      compose: [{ p: 'chain', range: T.cascade.range, jumps: T.cascade.jumps, jumpRange: T.cascade.jumpRange, damage: T.cascade.damage, falloff: T.cascade.falloff, tint: 0xffb8d0, swingFx: true }],
    },
  },
  {
    id: 'bard_bt_whistle',
    tree: BARD_BATTLE_TREE,
    name: 'Piercing Whistle',
    description: `Activate: a short shrieking cone that STUNS everything caught in it for ${(T.whistle.stunMs / 1000).toFixed(1)}s. (The sanctioned melee-range exception.)`,
    cost: 1,
    prereq: 'bard_bt_cascade',
    tier: 3,
    ensemble: { stunPerAllyMs: 0 },
    effect: {
      kind: 'active',
      action: 'bard_whistle',
      cooldownMs: T.whistle.cooldownMs,
      energyCost: T.whistle.energyCost,
      compose: [{ p: 'cone', range: T.whistle.range, halfAngleDeg: T.whistle.coneHalfAngleDeg, damage: T.whistle.damage, tint: 0xffe0b0, stunMs: T.whistle.stunMs }],
    },
  },
  {
    id: 'bard_bt_heavy',
    tree: BARD_BATTLE_TREE,
    name: 'Heavy Swing',
    description: 'Activate: wind up and land ONE colossal blow after a brief telegraph.',
    cost: 1,
    prereq: 'bard_bt_whistle',
    tier: 4,
    ensemble: { damagePerAllyPct: 0.05 },
    effect: {
      kind: 'active',
      action: 'bard_heavy_swing',
      cooldownMs: T.heavySwing.cooldownMs,
      energyCost: T.heavySwing.energyCost,
      compose: [{ p: 'strike', at: 'front', range: T.heavySwing.range, damage: T.heavySwing.damage, tint: 0xffb8d0, windUpMs: T.heavySwing.windUpMs }],
    },
  },
  {
    id: 'bard_bt_dive',
    tree: BARD_BATTLE_TREE,
    name: 'Stage Dive',
    description: 'Activate: hurl yourself into the crowd — enemies along your leap are damaged and KNOCKED DOWN.',
    cost: 1,
    prereq: 'bard_bt_heavy',
    tier: 5,
    ensemble: { damagePerAllyPct: 0.05 },
    effect: { kind: 'active', action: 'bard_stage_dive', cooldownMs: T.stageDive.cooldownMs, energyCost: T.stageDive.energyCost },
  },
  {
    id: 'bard_bt_amplify',
    tree: BARD_BATTLE_TREE,
    name: 'Harmonic Amplification',
    description: `Activate: your next ${T.amplify.charges} attacks RESONATE — each detonates a splash of sound around what it hits.`,
    cost: 1,
    prereq: 'bard_bt_dive',
    tier: 6,
    ensemble: { chargesPerAlly: 0 },
    effect: { kind: 'active', action: 'bard_amplify', cooldownMs: T.amplify.cooldownMs, energyCost: T.amplify.energyCost },
  },
  {
    id: 'bard_bt_freq_shield',
    tree: BARD_BATTLE_TREE,
    name: 'Frequency Shield',
    description: `Activate: a standing-wave barrier that ABSORBS the next ${T.freqShield.amount} damage (up to ${(T.freqShield.durationMs / 1000).toFixed(0)}s).`,
    cost: 1,
    prereq: 'bard_bt_amplify',
    tier: 7,
    ensemble: { absorbPerAllyPct: 0.1 },
    effect: {
      kind: 'active',
      action: 'bard_freq_shield',
      cooldownMs: T.freqShield.cooldownMs,
      energyCost: T.freqShield.energyCost,
      compose: [{ p: 'shield', amount: T.freqShield.amount, durationMs: T.freqShield.durationMs, banner: 'Frequency Shield up' }],
    },
  },
  {
    id: 'bard_bt_coda',
    tree: BARD_BATTLE_TREE,
    name: 'Coda',
    description: `Activate: the closing phrase — enemies around you take heavy damage, and STUNNED or SLOWED targets take ×${T.coda.bonusMult} of it.`,
    cost: 1,
    prereq: 'bard_bt_freq_shield',
    tier: 8,
    ensemble: { bonusPerAllyPct: 0.05 },
    effect: { kind: 'active', action: 'bard_coda', cooldownMs: T.coda.cooldownMs, energyCost: T.coda.energyCost },
  },
  {
    id: 'bard_bt_war_song',
    tree: BARD_BATTLE_TREE,
    name: 'War Song',
    description: `Ultimate — Activate: the song takes over. For ${(T.warSong.durationMs / 1000).toFixed(0)}s your strikes CHAIN themselves through the crowd on the beat while momentum hardens you (−${Math.round(T.warSong.damageReduction * 100)}% damage taken, +${Math.round(T.warSong.moveSpeedMult * 100)}% speed). Long cooldown.`,
    cost: 1,
    prereq: 'bard_bt_coda',
    tier: 9,
    ensemble: { beatPerAllyMs: 0 },
    effect: { kind: 'active', action: 'bard_war_song', cooldownMs: T.warSong.cooldownMs, energyCost: T.warSong.energyCost },
  },
];

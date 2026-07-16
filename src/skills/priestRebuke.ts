import type { SkillDef } from './skillData';

/**
 * PRIEST — REBUKE TREE (10 skills, linear; JUDGMENT).
 *
 * The Light with its patience gone: holy force on shipped machinery — the
 * weakening smite, the condemning DoT bolt, the spoken AoE control, the
 * CHANNEL-BEAM Judgment Ray, the consecrated DUAL ZONE, the conditional
 * finisher, the drain, and the verdict ultimate. "Faith" is prose over
 * standard energy. Conventions as always: EVERY tunable in
 * {@link PRS_REBUKE_TUNING} with calibration anchors; placeholder prose. Tree
 * id 'prs_rebuke'. Tier-0 is a DAMAGING ACTIVE (no-kit rule).
 */

export const PRS_REBUKE_TREE = 'prs_rebuke';

// ─── TUNING (all starting values; tune freely in playtest) ────────────────────
export const PRS_REBUKE_TUNING = {
  /** 1) SMITE — ENTRY hammer of holy force: damage + a weaken that lands only
   *  if the blow does (vs Guard Break's 0.3/4s pattern). */
  smite: { range: 72, damage: 20, weaken: 0.25, weakenMs: 4000, cooldownMs: 2200, energyCost: 9 },
  /** 2) REBUKE OF THE HERETIC — condemnation: a bolt whose wound FESTERS and
   *  whose sentence WEAKENS (vs Flaming Arrow's 5/500/2500 DoT). */
  rebuke: { damage: 12, speed: 540, range: 360, radius: 8, dot: { dmgPerTick: 5, tickMs: 500, durationMs: 3000, radius: 40 }, weaken: 0.2, weakenMs: 4000, cooldownMs: 6000, energyCost: 14 },
  /** 3) DIVINE WRATH — the damage surge (crit EV-mapped to the global damage
   *  multiplier until the crit system ships; vs Bear Might's 0.3/8s). */
  wrath: { damageMult: 0.25, durationMs: 8000, cooldownMs: 18000, energyCost: 20, tint: 0xffd07a },
  /** 4) WORD OF POWER — one spoken sentence: everything near you SLOWS and
   *  WEAKENS (slow vs Black Ice's 0.55; weaken vs Pestilence's 0.2). */
  word: { radius: 180, slowFactor: 0.55, slowMs: 2500, weaken: 0.25, weakenMs: 4000, cooldownMs: 10000, energyCost: 18 },
  /** 5) JUDGMENT RAY — the channel-beam (vs Dark Energy Beam's clock: locked
   *  gaze, ticking sentence; interrupted by moving/acting). */
  judgmentRay: { range: 320, durationMs: 4000, damagePerTick: 9, tickMs: 400, interruptCooldownFraction: 0.5, cooldownMs: 12000, energyCost: 20 },
  /** 6) SANCTIFIED GROUND — the consecrated DUAL ZONE at your feet: enemies
   *  inside WITHER (hazard) while allies inside MEND (friend zone). */
  ground: { radius: 140, tickDamage: 5, tickMs: 600, healPerTick: 4, healTickMs: 1000, durationMs: 5000, cooldownMs: 14000, energyCost: 24 },
  /** 7) VANQUISHER'S ZEAL — the conditional finisher: the WEAKENED (stunned/
   *  slowed) take ×bonus (vs Coup de Grâce-class ×2). */
  zeal: { reach: 60, radius: 80, damage: 22, bonusMult: 2, cooldownMs: 8000, energyCost: 16 },
  /** 8) VANQUISHING LIGHT — the drain: their strength becomes yours (vs Life
   *  Drain's damage→heal split). */
  vanquish: { range: 320, damage: 18, healPct: 0.6, cooldownMs: 9000, energyCost: 18 },
  /** 9) RIGHTEOUS FURY — the battle-state: attack speed + damage (vs Frenzied
   *  Rhythm-class tempo buffs). */
  fury: { attackSpeedMult: 0.25, damageMult: 0.15, durationMs: 8000, cooldownMs: 20000, energyCost: 24, tint: 0xffb060 },
  /** 10) DIVINE JUDGMENT — ultimate: the final verdict on the nearest — a
   *  devastating blow + a crushing weaken (vs Heaven's Arc's 55, melee-close). */
  judgment: { range: 300, radius: 90, damage: 50, weaken: 0.3, weakenMs: 6000, cooldownMs: 45000, energyCost: 40 },
} as const;

const T = PRS_REBUKE_TUNING;

// ─── THE 10 REBUKE SKILLS (linear; tree 'prs_rebuke') ─────────────────────────
// >>> EDIT NAMES / DESCRIPTIONS HERE (placeholder prose). <<<
export const PRS_REBUKE_SKILLS: SkillDef[] = [
  {
    id: 'prs_rb_smite',
    tree: PRS_REBUKE_TREE,
    name: 'Smite',
    description: `Activate: a hammer of holy force — the struck enemy swings ${Math.round(T.smite.weaken * 100)}% weaker for ${(T.smite.weakenMs / 1000).toFixed(0)}s. Your reliable opener.`,
    cost: 1,
    tier: 0,
    effect: {
      kind: 'active',
      action: 'prs_smite',
      cooldownMs: T.smite.cooldownMs,
      energyCost: T.smite.energyCost,
      compose: [{ p: 'strike', at: 'front', range: T.smite.range, damage: T.smite.damage, tint: 0xffe9a8, weaken: T.smite.weaken, weakenMs: T.smite.weakenMs, weakenOnlyIfHit: true }],
    },
  },
  {
    id: 'prs_rb_rebuke',
    tree: PRS_REBUKE_TREE,
    name: 'Rebuke of the Heretic',
    description: 'Activate: a spoken condemnation made light — the wound festers, and the condemned strikes softer.',
    cost: 1,
    prereq: 'prs_rb_smite',
    tier: 1,
    effect: {
      kind: 'active',
      action: 'prs_rebuke',
      cooldownMs: T.rebuke.cooldownMs,
      energyCost: T.rebuke.energyCost,
      compose: [{ p: 'bolt', damage: T.rebuke.damage, speed: T.rebuke.speed, range: T.rebuke.range, radius: T.rebuke.radius, tint: 0xffd07a, dot: { dmgPerTick: T.rebuke.dot.dmgPerTick, tickMs: T.rebuke.dot.tickMs, durationMs: T.rebuke.dot.durationMs, radius: T.rebuke.dot.radius, color: 0xffd07a }, onHit: { weaken: T.rebuke.weaken, weakenMs: T.rebuke.weakenMs } }],
    },
  },
  {
    id: 'prs_rb_wrath',
    tree: PRS_REBUKE_TREE,
    name: 'Divine Wrath',
    description: `Activate: the Light stops holding back — +${Math.round(T.wrath.damageMult * 100)}% damage for ${(T.wrath.durationMs / 1000).toFixed(0)}s.`,
    cost: 1,
    prereq: 'prs_rb_rebuke',
    tier: 2,
    effect: { kind: 'buff', cooldownMs: T.wrath.cooldownMs, durationMs: T.wrath.durationMs, energyCost: T.wrath.energyCost, tint: T.wrath.tint, stats: { damageMult: T.wrath.damageMult } },
  },
  {
    id: 'prs_rb_word',
    tree: PRS_REBUKE_TREE,
    name: 'Word of Power',
    description: `Activate: one spoken sentence — every enemy near you moves at ${Math.round(T.word.slowFactor * 100)}% speed and strikes ${Math.round(T.word.weaken * 100)}% softer.`,
    cost: 1,
    prereq: 'prs_rb_wrath',
    tier: 3,
    effect: { kind: 'active', action: 'prs_word', cooldownMs: T.word.cooldownMs, energyCost: T.word.energyCost },
  },
  {
    id: 'prs_rb_ray',
    tree: PRS_REBUKE_TREE,
    name: 'Judgment Ray',
    description: `Activate: fix the nearest enemy in a sustained beam of judgment — ${T.judgmentRay.damagePerTick} damage every beat for up to ${(T.judgmentRay.durationMs / 1000).toFixed(0)}s. Moving or acting breaks the gaze.`,
    cost: 1,
    prereq: 'prs_rb_word',
    tier: 4,
    effect: {
      kind: 'channel',
      cooldownMs: T.judgmentRay.cooldownMs,
      range: T.judgmentRay.range,
      durationMs: T.judgmentRay.durationMs,
      damagePerTick: T.judgmentRay.damagePerTick,
      tickMs: T.judgmentRay.tickMs,
      energyCost: T.judgmentRay.energyCost,
      interruptCooldownFraction: T.judgmentRay.interruptCooldownFraction,
    },
  },
  {
    id: 'prs_rb_ground',
    tree: PRS_REBUKE_TREE,
    name: 'Sanctified Ground',
    description: `Activate: consecrate where you stand for ${(T.ground.durationMs / 1000).toFixed(0)}s — enemies inside WITHER while your companions inside MEND.`,
    cost: 1,
    prereq: 'prs_rb_ray',
    tier: 5,
    effect: {
      kind: 'active',
      action: 'prs_ground',
      cooldownMs: T.ground.cooldownMs,
      energyCost: T.ground.energyCost,
      compose: [
        { p: 'hazard', at: 'self', radius: T.ground.radius, tickDamage: T.ground.tickDamage, tickMs: T.ground.tickMs, durationMs: T.ground.durationMs, fill: 0x5a4a2a, stroke: 0xffe9a8 },
        { p: 'friendzone', radius: T.ground.radius, healPerTick: T.ground.healPerTick, tickMs: T.ground.healTickMs, durationMs: T.ground.durationMs, tint: 0xffe9a8 },
      ],
    },
  },
  {
    id: 'prs_rb_zeal',
    tree: PRS_REBUKE_TREE,
    name: "Vanquisher's Zeal",
    description: `Activate: full wrath for the faltering — STUNNED or SLOWED enemies take ×${T.zeal.bonusMult}. The rest take the ordinary hammer.`,
    cost: 1,
    prereq: 'prs_rb_ground',
    tier: 6,
    effect: { kind: 'active', action: 'prs_zeal', cooldownMs: T.zeal.cooldownMs, energyCost: T.zeal.energyCost },
  },
  {
    id: 'prs_rb_vanquish',
    tree: PRS_REBUKE_TREE,
    name: 'Vanquishing Light',
    description: `Activate: a draining lance — what it takes from them (${Math.round(T.vanquish.healPct * 100)}% of the harm) returns to you as life.`,
    cost: 1,
    prereq: 'prs_rb_zeal',
    tier: 7,
    effect: {
      kind: 'active',
      action: 'prs_vanquish',
      cooldownMs: T.vanquish.cooldownMs,
      energyCost: T.vanquish.energyCost,
      compose: [{ p: 'drain', range: T.vanquish.range, damage: T.vanquish.damage, healPct: T.vanquish.healPct, tint: 0xffe9a8 }],
    },
  },
  {
    id: 'prs_rb_fury',
    tree: PRS_REBUKE_TREE,
    name: 'Righteous Fury',
    description: `Activate: the battle-hymn rises — +${Math.round(T.fury.attackSpeedMult * 100)}% attack speed and +${Math.round(T.fury.damageMult * 100)}% damage for ${(T.fury.durationMs / 1000).toFixed(0)}s.`,
    cost: 1,
    prereq: 'prs_rb_vanquish',
    tier: 8,
    effect: { kind: 'buff', cooldownMs: T.fury.cooldownMs, durationMs: T.fury.durationMs, energyCost: T.fury.energyCost, tint: T.fury.tint, stats: { attackSpeedMult: T.fury.attackSpeedMult, damageMult: T.fury.damageMult } },
  },
  {
    id: 'prs_rb_judgment',
    tree: PRS_REBUKE_TREE,
    name: 'Divine Judgment',
    description: `Ultimate — Activate: the final verdict falls on the nearest enemy — a devastating blow, and the condemned swings ${Math.round(T.judgment.weaken * 100)}% weaker for ${(T.judgment.weakenMs / 1000).toFixed(0)}s after. Long cooldown.`,
    cost: 1,
    prereq: 'prs_rb_fury',
    tier: 9,
    effect: {
      kind: 'active',
      action: 'prs_judgment',
      cooldownMs: T.judgment.cooldownMs,
      energyCost: T.judgment.energyCost,
      compose: [{ p: 'strike', at: 'nearest', range: T.judgment.range, radius: T.judgment.radius, damage: T.judgment.damage, tint: 0xffe9a8, weaken: T.judgment.weaken, weakenMs: T.judgment.weakenMs, missBanner: 'No one stands for judgment' }],
    },
  },
];

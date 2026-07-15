import type { SkillDef } from './skillData';

/**
 * MONK — SPIRITUAL HARMONY TREE (10 skills, linear; SPIRIT/CONTROL).
 *
 * The mind beyond the body: the confusion + decoy + ally-bond reuses (the
 * Astral decoy IS the friendly the ALLY RULE points at), the reflect buff, the
 * MOBILE PRAYER WHEEL (pulse ring — framework extension #3), and the timed-buff
 * finishers (Meditation breaks when struck; Enlightenment is the everything
 * buff). "Chi" is prose over standard energy. Conventions as always: EVERY
 * tunable in {@link MONK_SPIRIT_TUNING} with calibration anchors; placeholder
 * prose. Tree id 'monk_spirit'. Tier-0 is a DAMAGING ACTIVE (no-kit rule).
 */

export const MONK_SPIRIT_TREE = 'monk_spirit';

// Ids the scene keys behavior off (imported there — keep in sync):
// Enlightened Mind joins the CC-immunity chain; Meditation BREAKS when hurt.
export const ENLIGHTENED_MIND_ID = 'monk_sp_enlightened';
export const MEDITATION_ID = 'monk_sp_meditate';

// ─── TUNING (all starting values; tune freely in playtest) ────────────────────
export const MONK_SPIRIT_TUNING = {
  /** 1) FORCE PALM — ENTRY short chi bolt that SHOVES (vs Power Chord's 34/380,
   *  much shorter + softer; knockback vs Pentatonic's 110). */
  forcePalm: { damage: 18, speed: 520, range: 220, radius: 12, knockback: 120, cooldownMs: 2600, energyCost: 9 },
  /** 2) ENIGMATIC PRESENCE — the CONFUSION reuse (vs Sonic Distortion's
   *  320/0.8/4000). */
  enigma: { range: 300, chance: 0.8, durationMs: 3500, chipDamage: 8, chipMs: 600, cooldownMs: 12000, energyCost: 18 },
  /** 3) DIVINE CONNECTION — the ALLY-BOND reuse: your companions carry part of
   *  what strikes you (vs Soul Bind's 0.35/8s; the ALLY RULE: no companion =
   *  a graceful refunded whiff). */
  divine: { sharePct: 0.3, durationMs: 10000, cooldownMs: 20000, energyCost: 20 },
  /** 4) ENLIGHTENED MIND — evasion + the CC-immunity key (evasion mapped to
   *  block, the Flowing Movement precedent; the immunity is the Iron Will
   *  chain). */
  enlightened: { blockChance: 0.15, blockReduction: 0.5 },
  /** 5) ASTRAL PROJECTION — the DECOY reuse: a self that walks apart (config in
   *  summonData ASTRAL_DECOY_CONFIG; vs the Spirit Decoy's 160HP/10s). */
  astral: { cooldownMs: 22000, energyCost: 24 },
  /** 6) KARMA'S EMBRACE — the REFLECT buff (vs Mirror Barrier's 0.5/6s,
   *  lighter + longer). */
  karma: { reflectPct: 0.3, durationMs: 8000, cooldownMs: 16000, energyCost: 20, tint: 0xa8ffd0 },
  /** 7) PRAYER WHEEL — the MOBILE PULSE RING (extension #3): a damage ring that
   *  turns WITH you (per-pulse vs Hum of the Ancients' 3-heal cadence,
   *  damage-flavored). */
  wheel: { durationMs: 6000, intervalMs: 500, radius: 130, damage: 8, cooldownMs: 20000, energyCost: 24, tint: 0xffd8a0 },
  /** 8) MANTRA OF STILLNESS — a NO-DAMAGE field of quiet: everything inside
   *  slows and softens (slow vs Black Ice's 0.55; weaken vs Pestilence's 0.2). */
  mantra: { radius: 150, slowFactor: 0.6, weaken: 0.2, tickMs: 700, durationMs: 5000, cooldownMs: 16000, energyCost: 20 },
  /** 9) MEDITATION — rapid mending that BREAKS when struck (regen vs Sanctuary's
   *  12/8s, much faster but fragile — the scene keys the break off
   *  MEDITATION_ID). */
  meditation: { regenPerSec: 20, durationMs: 6000, cooldownMs: 18000, energyCost: 16, tint: 0xa8ffd0 },
  /** 10) ENLIGHTENMENT — ultimate: briefly EVERYTHING (each half vs the softer
   *  single-stat buffs it echoes: Bear Might 0.3, Rally-class reductions). */
  enlighten: { damageMult: 0.25, attackSpeedMult: 0.2, moveSpeedMult: 0.15, damageReduction: 0.2, durationMs: 10000, cooldownMs: 60000, energyCost: 45, tint: 0xffe8a0 },
} as const;

const T = MONK_SPIRIT_TUNING;

// ─── THE 10 SPIRITUAL HARMONY SKILLS (linear; tree 'monk_spirit') ─────────────
// >>> EDIT NAMES / DESCRIPTIONS HERE (placeholder prose). <<<
export const MONK_SPIRIT_SKILLS: SkillDef[] = [
  {
    id: 'monk_sp_force',
    tree: MONK_SPIRIT_TREE,
    name: 'Force Palm',
    description: 'Activate: a palm of compressed chi — a short bolt that SHOVES the struck enemy back. Your reliable opener.',
    cost: 1,
    tier: 0,
    effect: {
      kind: 'active',
      action: 'monk_force_palm',
      cooldownMs: T.forcePalm.cooldownMs,
      energyCost: T.forcePalm.energyCost,
      compose: [{ p: 'bolt', damage: T.forcePalm.damage, speed: T.forcePalm.speed, range: T.forcePalm.range, radius: T.forcePalm.radius, tint: 0xa8ffd0, onHit: { knockback: T.forcePalm.knockback } }],
    },
  },
  {
    id: 'monk_sp_enigma',
    tree: MONK_SPIRIT_TREE,
    name: 'Enigmatic Presence',
    description: `Activate: an enemy looks at you and no longer knows what it sees — it turns on its own for ${(T.enigma.durationMs / 1000).toFixed(1)}s.`,
    cost: 1,
    prereq: 'monk_sp_force',
    tier: 1,
    effect: { kind: 'active', action: 'monk_enigma', cooldownMs: T.enigma.cooldownMs, energyCost: T.enigma.energyCost },
  },
  {
    id: 'monk_sp_divine',
    tree: MONK_SPIRIT_TREE,
    name: 'Divine Connection',
    description: `Activate: a thread of spirit between you and yours — for ${(T.divine.durationMs / 1000).toFixed(0)}s your companions carry ${Math.round(T.divine.sharePct * 100)}% of what strikes you. With no companion the chi returns unspent.`,
    cost: 1,
    prereq: 'monk_sp_enigma',
    tier: 2,
    effect: { kind: 'active', action: 'monk_divine', cooldownMs: T.divine.cooldownMs, energyCost: T.divine.energyCost },
  },
  {
    id: ENLIGHTENED_MIND_ID,
    tree: MONK_SPIRIT_TREE,
    name: 'Enlightened Mind',
    description: 'Passive: the mind cannot be gripped — slipping evasion, and stuns, roots and slows no longer hold you.',
    cost: 1,
    prereq: 'monk_sp_divine',
    tier: 3,
    effect: { kind: 'passive', stats: { blockChance: T.enlightened.blockChance, blockReduction: T.enlightened.blockReduction } },
  },
  {
    id: 'monk_sp_astral',
    tree: MONK_SPIRIT_TREE,
    name: 'Astral Projection',
    description: 'Activate: step outside yourself — a spirit-self walks apart from you and the enemy cannot tell which one bleeds.',
    cost: 1,
    prereq: ENLIGHTENED_MIND_ID,
    tier: 4,
    effect: { kind: 'active', action: 'monk_astral', cooldownMs: T.astral.cooldownMs, energyCost: T.astral.energyCost },
  },
  {
    id: 'monk_sp_karma',
    tree: MONK_SPIRIT_TREE,
    name: "Karma's Embrace",
    description: `Activate: for ${(T.karma.durationMs / 1000).toFixed(0)}s what is done to you returns to the doer — REFLECT ${Math.round(T.karma.reflectPct * 100)}% of incoming damage.`,
    cost: 1,
    prereq: 'monk_sp_astral',
    tier: 5,
    effect: { kind: 'buff', cooldownMs: T.karma.cooldownMs, durationMs: T.karma.durationMs, energyCost: T.karma.energyCost, tint: T.karma.tint, stats: { reflectPct: T.karma.reflectPct } },
  },
  {
    id: 'monk_sp_wheel',
    tree: MONK_SPIRIT_TREE,
    name: 'Prayer Wheel',
    description: `Activate: the wheel turns WITH you — for ${(T.wheel.durationMs / 1000).toFixed(0)}s a ring of prayer pulses outward from wherever you stand, striking everything it touches.`,
    cost: 1,
    prereq: 'monk_sp_karma',
    tier: 6,
    effect: { kind: 'active', action: 'monk_wheel', cooldownMs: T.wheel.cooldownMs, energyCost: T.wheel.energyCost },
  },
  {
    id: 'monk_sp_mantra',
    tree: MONK_SPIRIT_TREE,
    name: 'Mantra of Stillness',
    description: `Activate: a field of perfect quiet for ${(T.mantra.durationMs / 1000).toFixed(0)}s — enemies inside it move at ${Math.round(T.mantra.slowFactor * 100)}% speed and strike ${Math.round(T.mantra.weaken * 100)}% softer. It harms nothing.`,
    cost: 1,
    prereq: 'monk_sp_wheel',
    tier: 7,
    effect: {
      kind: 'active',
      action: 'monk_mantra',
      cooldownMs: T.mantra.cooldownMs,
      energyCost: T.mantra.energyCost,
      compose: [{ p: 'hazard', at: 'self', radius: T.mantra.radius, tickDamage: 0, tickMs: T.mantra.tickMs, durationMs: T.mantra.durationMs, slowFactor: T.mantra.slowFactor, weaken: T.mantra.weaken, fill: 0x2a4a44, stroke: 0xa8ffd0, banner: 'Stillness settles' }],
    },
  },
  {
    id: MEDITATION_ID,
    tree: MONK_SPIRIT_TREE,
    name: 'Meditation',
    description: `Activate: sit within the breath — regenerate ${T.meditation.regenPerSec} HP/sec for up to ${(T.meditation.durationMs / 1000).toFixed(0)}s. Any blow that lands BREAKS it.`,
    cost: 1,
    prereq: 'monk_sp_mantra',
    tier: 8,
    effect: { kind: 'buff', cooldownMs: T.meditation.cooldownMs, durationMs: T.meditation.durationMs, energyCost: T.meditation.energyCost, tint: T.meditation.tint, stats: { regenPerSec: T.meditation.regenPerSec } },
  },
  {
    id: 'monk_sp_enlighten',
    tree: MONK_SPIRIT_TREE,
    name: 'Enlightenment',
    description: `Ultimate — Activate: for ${(T.enlighten.durationMs / 1000).toFixed(0)}s you are briefly what the masters describe — harder, faster, lighter, calmer, all at once. Long cooldown.`,
    cost: 1,
    prereq: MEDITATION_ID,
    tier: 9,
    effect: {
      kind: 'buff',
      cooldownMs: T.enlighten.cooldownMs,
      durationMs: T.enlighten.durationMs,
      energyCost: T.enlighten.energyCost,
      tint: T.enlighten.tint,
      stats: { damageMult: T.enlighten.damageMult, attackSpeedMult: T.enlighten.attackSpeedMult, moveSpeedMult: T.enlighten.moveSpeedMult, damageReduction: T.enlighten.damageReduction },
    },
  },
];

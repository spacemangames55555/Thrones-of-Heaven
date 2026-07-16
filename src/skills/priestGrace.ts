import type { SkillDef } from './skillData';

/**
 * PRIEST — WORDS OF GRACE TREE (10 skills, linear; MENDING).
 *
 * The healer's half: the dual-ring opener, the HoT, the cleanse-ALL, the DUAL
 * CHANNEL Beacon of Light (framework extension #2 — mends friendlies in the
 * beam while burning enemies it crosses), the HP-cost great heal on the ally
 * rule, the walking hymn, ASCENDANCE (the untargetable breath), and the wide
 * dual-field ultimate. PROPHETIC VISION is the keyed CC-immunity passive.
 * "Faith" is prose over standard energy. Conventions as always: EVERY tunable
 * in {@link PRS_GRACE_TUNING} with calibration anchors; placeholder prose.
 * Tree id 'prs_grace'. Tier-0 is a DAMAGING ACTIVE (no-kit rule).
 */

export const PRS_GRACE_TREE = 'prs_grace';

// Id the scene keys the CC-immunity passive off (joins the Iron Will chain).
export const PROPHETIC_VISION_ID = 'prs_gr_vision';

// ─── TUNING (all starting values; tune freely in playtest) ────────────────────
export const PRS_GRACE_TUNING = {
  /** 1) SANCTIFIED BURST — ENTRY dual ring: one radiant word that BURNS enemies
   *  around you and MENDS you and yours (vs Chi Explosion's dual nova, opener-
   *  scale like Chi Wave's 18 + 10). */
  burst: { radius: 130, damage: 16, heal: 12, cooldownMs: 3000, energyCost: 10 },
  /** 2) WORDS OF GRACE — the HoT (vs Honeycomb Mend's 8/8s regen). */
  wordsOfGrace: { regenPerSec: 8, durationMs: 8000, cooldownMs: 14000, energyCost: 16, tint: 0xa8ffd0 },
  /** 3) FORGIVENESS'S EMBRACE — the cleanse-ALL: every affliction clinging to
   *  you is absolved (Acupuncture strips ONE; this strips everything). */
  forgiveness: { cooldownMs: 10000, energyCost: 14 },
  /** 4) DIVINE BENEDICTION — the blessing: attributes + regeneration (vs Echo
   *  of Passion's 6 HP/s, plus a soft damage rise). */
  benediction: { damageMult: 0.1, regenPerSec: 6, durationMs: 10000, cooldownMs: 20000, energyCost: 22, tint: 0xffe9a8 },
  /** 5) BEACON OF LIGHT — extension #2: the DUAL CHANNEL (heal vs Hum's cadence,
   *  burn vs Judgment Ray's tick, both halves in one beam). */
  beacon: { durationMs: 4000, tickMs: 400, healPerTick: 5, dmgPerTick: 6, length: 260, width: 60, cooldownMs: 14000, energyCost: 24 },
  /** 6) DIVINE RENEWAL — the great heal at the price of your own health (the
   *  ALLY RULE: no companion = a refunded whiff; vs Life Infusion's 15→30,
   *  scaled up). */
  renewal: { range: 400, cost: 25, heal: 60, cooldownMs: 16000, energyCost: 12 },
  /** 7) PROPHETIC VISION — foresight: evasion (block-mapped) + the CC-immunity
   *  key (the Iron Will chain). */
  vision: { blockChance: 0.12, blockReduction: 0.5 },
  /** 8) HYMN OF MENDING — the sung blessing that WALKS with you (vs Hum of the
   *  Ancients' 3/1000/20s follow zone). */
  hymn: { radius: 120, healPerTick: 4, tickMs: 1000, durationMs: 12000, cooldownMs: 20000, energyCost: 22 },
  /** 9) ASCENDANCE — step briefly beyond flesh: UNTARGETABLE (the vanish
   *  breath) while mending fast (regen vs Sanctuary's 12/8s, brief). */
  ascendance: { durationMs: 3000, regenPerSec: 15, cooldownMs: 24000, energyCost: 26, tint: 0xffe9a8 },
  /** 10) GRACE INCARNATE — ultimate: the wide DUAL FIELD — every ally inside
   *  mends while every enemy inside sears (vs Sanctified Ground, ultimate-wide). */
  graceField: { radius: 200, tickDamage: 8, tickMs: 500, healPerTick: 6, healTickMs: 700, durationMs: 6000, cooldownMs: 55000, energyCost: 45 },
} as const;

const T = PRS_GRACE_TUNING;

// ─── THE 10 GRACE SKILLS (linear; tree 'prs_grace') ───────────────────────────
// >>> EDIT NAMES / DESCRIPTIONS HERE (placeholder prose). <<<
export const PRS_GRACE_SKILLS: SkillDef[] = [
  {
    id: 'prs_gr_burst',
    tree: PRS_GRACE_TREE,
    name: 'Sanctified Burst',
    description: 'Activate: one radiant word — enemies near you BURN and you and yours MEND in the same breath. Your reliable opener.',
    cost: 1,
    tier: 0,
    effect: {
      kind: 'active',
      action: 'prs_burst',
      cooldownMs: T.burst.cooldownMs,
      energyCost: T.burst.energyCost,
      compose: [
        { p: 'strike', at: 'self', radius: T.burst.radius, damage: T.burst.damage, tint: 0xffe9a8 },
        { p: 'heal', amount: T.burst.heal, radius: T.burst.radius },
      ],
    },
  },
  {
    id: 'prs_gr_words',
    tree: PRS_GRACE_TREE,
    name: 'Words of Grace',
    description: `Activate: gentle words knit the wound — regenerate ${T.wordsOfGrace.regenPerSec} HP/sec for ${(T.wordsOfGrace.durationMs / 1000).toFixed(0)}s.`,
    cost: 1,
    prereq: 'prs_gr_burst',
    tier: 1,
    effect: { kind: 'buff', cooldownMs: T.wordsOfGrace.cooldownMs, durationMs: T.wordsOfGrace.durationMs, energyCost: T.wordsOfGrace.energyCost, tint: T.wordsOfGrace.tint, stats: { regenPerSec: T.wordsOfGrace.regenPerSec } },
  },
  {
    id: 'prs_gr_forgive',
    tree: PRS_GRACE_TREE,
    name: "Forgiveness's Embrace",
    description: 'Activate: absolution — EVERY affliction clinging to you is stripped away at once.',
    cost: 1,
    prereq: 'prs_gr_words',
    tier: 2,
    effect: { kind: 'active', action: 'prs_forgive', cooldownMs: T.forgiveness.cooldownMs, energyCost: T.forgiveness.energyCost },
  },
  {
    id: 'prs_gr_benediction',
    tree: PRS_GRACE_TREE,
    name: 'Divine Benediction',
    description: `Activate: a blessing over the whole self — +${Math.round(T.benediction.damageMult * 100)}% damage and ${T.benediction.regenPerSec} HP/sec for ${(T.benediction.durationMs / 1000).toFixed(0)}s.`,
    cost: 1,
    prereq: 'prs_gr_forgive',
    tier: 3,
    effect: { kind: 'buff', cooldownMs: T.benediction.cooldownMs, durationMs: T.benediction.durationMs, energyCost: T.benediction.energyCost, tint: T.benediction.tint, stats: { damageMult: T.benediction.damageMult, regenPerSec: T.benediction.regenPerSec } },
  },
  {
    id: 'prs_gr_beacon',
    tree: PRS_GRACE_TREE,
    name: 'Beacon of Light',
    description: `Activate: a standing beam of grace for ${(T.beacon.durationMs / 1000).toFixed(0)}s — friendlies inside it MEND while enemies it crosses BURN, every beat.`,
    cost: 1,
    prereq: 'prs_gr_benediction',
    tier: 4,
    effect: { kind: 'active', action: 'prs_beacon', cooldownMs: T.beacon.cooldownMs, energyCost: T.beacon.energyCost },
  },
  {
    id: 'prs_gr_renewal',
    tree: PRS_GRACE_TREE,
    name: 'Divine Renewal',
    description: `Activate: the great mending, paid for in your own blood — give ${T.renewal.cost} health; the most wounded companion near you mends ${T.renewal.heal}. Alone, the grace returns unspent.`,
    cost: 1,
    prereq: 'prs_gr_beacon',
    tier: 5,
    effect: { kind: 'active', action: 'prs_renewal', cooldownMs: T.renewal.cooldownMs, energyCost: T.renewal.energyCost },
  },
  {
    id: PROPHETIC_VISION_ID,
    tree: PRS_GRACE_TREE,
    name: 'Prophetic Vision',
    description: 'Passive: you see the blow before it is thrown — slipping evasion, and stuns, roots and slows no longer hold you.',
    cost: 1,
    prereq: 'prs_gr_renewal',
    tier: 6,
    effect: { kind: 'passive', stats: { blockChance: T.vision.blockChance, blockReduction: T.vision.blockReduction } },
  },
  {
    id: 'prs_gr_hymn',
    tree: PRS_GRACE_TREE,
    name: 'Hymn of Mending',
    description: `Activate: a sung blessing that walks with you for ${(T.hymn.durationMs / 1000).toFixed(0)}s, mending you and your companions inside it.`,
    cost: 1,
    prereq: PROPHETIC_VISION_ID,
    tier: 7,
    effect: {
      kind: 'active',
      action: 'prs_hymn',
      cooldownMs: T.hymn.cooldownMs,
      energyCost: T.hymn.energyCost,
      compose: [{ p: 'friendzone', follow: true, radius: T.hymn.radius, healPerTick: T.hymn.healPerTick, tickMs: T.hymn.tickMs, durationMs: T.hymn.durationMs, tint: 0xffe9a8, banner: 'The hymn rises' }],
    },
  },
  {
    id: 'prs_gr_ascend',
    tree: PRS_GRACE_TREE,
    name: 'Ascendance',
    description: `Activate: step briefly beyond flesh — for ${(T.ascendance.durationMs / 1000).toFixed(0)}s nothing can touch you, and the body left behind knits itself fast.`,
    cost: 1,
    prereq: 'prs_gr_hymn',
    tier: 8,
    effect: { kind: 'active', action: 'prs_ascend', cooldownMs: T.ascendance.cooldownMs, energyCost: T.ascendance.energyCost },
  },
  {
    id: 'prs_gr_incarnate',
    tree: PRS_GRACE_TREE,
    name: 'Grace Incarnate',
    description: `Ultimate — Activate: for ${(T.graceField.durationMs / 1000).toFixed(0)}s the ground itself is grace — every ally within it MENDS and every enemy within it SEARS. Long cooldown.`,
    cost: 1,
    prereq: 'prs_gr_ascend',
    tier: 9,
    effect: {
      kind: 'active',
      action: 'prs_grace_field',
      cooldownMs: T.graceField.cooldownMs,
      energyCost: T.graceField.energyCost,
      compose: [
        { p: 'hazard', at: 'self', radius: T.graceField.radius, tickDamage: T.graceField.tickDamage, tickMs: T.graceField.tickMs, durationMs: T.graceField.durationMs, fill: 0x6a5a2a, stroke: 0xffe9a8 },
        { p: 'friendzone', radius: T.graceField.radius, healPerTick: T.graceField.healPerTick, tickMs: T.graceField.healTickMs, durationMs: T.graceField.durationMs, tint: 0xffe9a8 },
      ],
    },
  },
];

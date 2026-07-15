import type { SkillDef } from './skillData';

/**
 * BARD — SONGS OF THE ANCESTORS TREE (10 skills, linear; RANGED/SUPPORT).
 *
 * RANGE DOCTRINE (Casey's ruling): this tree's offense is RANGED (placed zones);
 * its buffs/auras are rangeless. "Allies" today = SELF + summons where zones
 * apply; EVERY skill carries a DORMANT `ensemble` data block for the party era
 * (solo values below are live). "Rhythm" is prose over standard energy. Same
 * conventions as every tree file: EVERY tunable in {@link BARD_SONGS_TUNING}
 * with calibration anchors; placeholder prose. Tree id 'bard_songs'. Tier-0 is
 * a DAMAGING ACTIVE (no-kit rule).
 */

export const BARD_SONGS_TREE = 'bard_songs';

// Ids the scene keys timed KEYED behaviors off of (energy regen / XP gain / CC immunity).
export const ECHO_OF_PASSION_ID = 'bard_sg_passion';
export const SONG_OF_LORE_ID = 'bard_sg_lore';
export const CHANT_OF_ANCESTORS_ID = 'bard_sg_chant';

// ─── TUNING (all starting values; tune freely in playtest) ────────────────────
export const BARD_SONGS_TUNING = {
  /** 1) DISSONANT SYMPHONY — ENTRY ranged placed AoE (placement vs Biohazard's 220
   *  throw; damage vs Immolation-lite) + a minor self/ally mend (vs Aloe's 18). */
  dissonant: { placeAhead: 220, radius: 120, damage: 22, heal: 10, cooldownMs: 2500, energyCost: 10 },
  /** 2) HUM OF THE ANCIENTS — a low steady healing aura following the Bard
   *  (vs Sage Burn's 4 HP/s follow zone — humbler, cheaper). */
  hum: { radius: 110, healPerTick: 3, tickMs: 1000, durationMs: 20000, cooldownMs: 30000, energyCost: 24 },
  /** 3) SHARPEN — weapon-damage buff (vs Berserker's +20%). */
  sharpen: { damageMult: 0.2, durationMs: 10000, cooldownMs: 16000, energyCost: 20, tint: 0xd8c8a0 },
  /** 4) ECHO OF PASSION — stamina + essence regen (HP vs War Chant's 6/s; the
   *  energy half is KEYED by id while the buff runs). */
  echoOfPassion: { regenPerSec: 6, energyPerSec: 5, durationMs: 8000, cooldownMs: 16000, energyCost: 0, tint: 0xffc8a0 },
  /** 5) SONG OF LORE — boosted XP gain for a time (KEYED in gainXP; reputation
   *  joins when that system ships). */
  songOfLore: { xpMult: 1.5, durationMs: 60000, cooldownMs: 90000, energyCost: 20, tint: 0xc8d8ff },
  /** 6) CHANT OF THE ANCESTORS — allies resist fear/CC (KEYED: timed CC immunity,
   *  the Iron Will rule for a window). */
  chant: { durationMs: 8000, cooldownMs: 20000, energyCost: 20, tint: 0xe8d8b0 },
  /** 7) DISRUPTIVE HARMONICS — ranged placed zone: weaken + slow (Pestilence-lite,
   *  no damage). */
  harmonics: { placeAhead: 200, radius: 140, slowFactor: 0.55, weaken: 0.25, durationMs: 5000, tickMs: 400, cooldownMs: 12000, energyCost: 22 },
  /** 8) SONG OF BLOOD — allied damage + speed (crit is EV-mapped into damageMult
   *  until the crit system ships; vs Crazed without the downside). */
  songOfBlood: { damageMult: 0.2, attackSpeedMult: 0.2, moveSpeedMult: 0.15, durationMs: 8000, cooldownMs: 18000, energyCost: 24, tint: 0xd85a5a },
  /** 9) FOOT STAMP RALLY — AoE heal burst (vs Mend's 35 + a short spore-bed for
   *  summons). reviveDormant is the party-era revive rider — data only. */
  rally: { heal: 30, zoneRadius: 140, zoneHealPerTick: 8, zoneTickMs: 300, zoneDurationMs: 900, reviveDormant: true, cooldownMs: 14000, energyCost: 24 },
  /** 10) CHOIR OF DIVINITY — ultimate battlefield buff (vs Army's empower + the
   *  Oils, compressed into one loud window). */
  choir: { damageMult: 0.3, attackSpeedMult: 0.3, moveSpeedMult: 0.2, damageReduction: 0.25, durationMs: 10000, cooldownMs: 60000, energyCost: 40, tint: 0xfff0c0 },
} as const;

const T = BARD_SONGS_TUNING;

// ─── THE 10 SONGS SKILLS (linear; tree 'bard_songs') ──────────────────────────
// >>> EDIT NAMES / DESCRIPTIONS HERE (placeholder prose). <<<
export const BARD_SONGS_SKILLS: SkillDef[] = [
  {
    id: 'bard_sg_dissonant',
    tree: BARD_SONGS_TREE,
    name: 'Dissonant Symphony',
    description: 'Activate: hurl a clashing chord at the target ground — dissonance wounds every enemy there while the harmony line mends you. Your reliable opener.',
    cost: 1,
    tier: 0,
    ensemble: { healPerAllyPct: 0.1, resistPerAllyPct: 0.05 },
    effect: {
      kind: 'active',
      action: 'bard_dissonant',
      cooldownMs: T.dissonant.cooldownMs,
      energyCost: T.dissonant.energyCost,
      compose: [
        { p: 'strike', at: 'ahead', range: T.dissonant.placeAhead, radius: T.dissonant.radius, damage: T.dissonant.damage, tint: 0xd8b8ff },
        { p: 'heal', amount: T.dissonant.heal },
      ],
    },
  },
  {
    id: 'bard_sg_hum',
    tree: BARD_SONGS_TREE,
    name: 'Hum of the Ancients',
    description: `Activate: a low ancestral hum follows you for ${(T.hum.durationMs / 1000).toFixed(0)}s, slowly mending you and your companions inside it.`,
    cost: 1,
    prereq: 'bard_sg_dissonant',
    tier: 1,
    ensemble: { healPerAllyPct: 0.1 },
    effect: {
      kind: 'active',
      action: 'bard_hum',
      cooldownMs: T.hum.cooldownMs,
      energyCost: T.hum.energyCost,
      compose: [{ p: 'friendzone', follow: true, radius: T.hum.radius, healPerTick: T.hum.healPerTick, tickMs: T.hum.tickMs, durationMs: T.hum.durationMs, tint: 0xd8c8a0, banner: 'The old hum rises' }],
    },
  },
  {
    id: 'bard_sg_sharpen',
    tree: BARD_SONGS_TREE,
    name: 'Sharpen',
    description: `Activate: a whetstone cadence — +${Math.round(T.sharpen.damageMult * 100)}% weapon damage for ${(T.sharpen.durationMs / 1000).toFixed(0)}s.`,
    cost: 1,
    prereq: 'bard_sg_hum',
    tier: 2,
    ensemble: { damagePerAllyPct: 0.05 },
    effect: { kind: 'buff', cooldownMs: T.sharpen.cooldownMs, durationMs: T.sharpen.durationMs, energyCost: T.sharpen.energyCost, tint: T.sharpen.tint, stats: { damageMult: T.sharpen.damageMult } },
  },
  {
    id: ECHO_OF_PASSION_ID,
    tree: BARD_SONGS_TREE,
    name: 'Echo of Passion',
    description: `Activate: a driving pulse — ${T.echoOfPassion.regenPerSec} HP/sec and +${T.echoOfPassion.energyPerSec} energy/sec for ${(T.echoOfPassion.durationMs / 1000).toFixed(0)}s.`,
    cost: 1,
    prereq: 'bard_sg_sharpen',
    tier: 3,
    ensemble: { regenPerAllyPct: 0.1 },
    effect: { kind: 'buff', cooldownMs: T.echoOfPassion.cooldownMs, durationMs: T.echoOfPassion.durationMs, energyCost: T.echoOfPassion.energyCost, tint: T.echoOfPassion.tint, stats: { regenPerSec: T.echoOfPassion.regenPerSec } },
  },
  {
    id: SONG_OF_LORE_ID,
    tree: BARD_SONGS_TREE,
    name: 'Song of Lore',
    description: `Activate: sing the old names — +${Math.round((T.songOfLore.xpMult - 1) * 100)}% experience gained for ${(T.songOfLore.durationMs / 1000).toFixed(0)}s. (Reputation joins when that ledger opens.)`,
    cost: 1,
    prereq: ECHO_OF_PASSION_ID,
    tier: 4,
    ensemble: { xpPerAllyPct: 0.05 },
    effect: { kind: 'buff', cooldownMs: T.songOfLore.cooldownMs, durationMs: T.songOfLore.durationMs, energyCost: T.songOfLore.energyCost, tint: T.songOfLore.tint, stats: {} }, // keyed: gainXP multiplies while active
  },
  {
    id: CHANT_OF_ANCESTORS_ID,
    tree: BARD_SONGS_TREE,
    name: 'Chant of the Ancestors',
    description: `Activate: the ancestors answer — immune to stun, knockback and knockdown for ${(T.chant.durationMs / 1000).toFixed(0)}s.`,
    cost: 1,
    prereq: SONG_OF_LORE_ID,
    tier: 5,
    ensemble: { ccResistPerAllyPct: 0.1 },
    effect: { kind: 'buff', cooldownMs: T.chant.cooldownMs, durationMs: T.chant.durationMs, energyCost: T.chant.energyCost, tint: T.chant.tint, stats: {} }, // keyed: timed CC immunity
  },
  {
    id: 'bard_sg_harmonics',
    tree: BARD_SONGS_TREE,
    name: 'Disruptive Harmonics',
    description: `Activate: project a warping chord onto the target ground — enemies inside are SLOWED and WEAKENED (−${Math.round(T.harmonics.weaken * 100)}% damage) for ${(T.harmonics.durationMs / 1000).toFixed(0)}s.`,
    cost: 1,
    prereq: CHANT_OF_ANCESTORS_ID,
    tier: 6,
    ensemble: { radiusPerAllyPct: 0.05 },
    effect: {
      kind: 'active',
      action: 'bard_harmonics',
      cooldownMs: T.harmonics.cooldownMs,
      energyCost: T.harmonics.energyCost,
      compose: [{ p: 'hazard', at: 'ahead', placeAhead: T.harmonics.placeAhead, radius: T.harmonics.radius, tickDamage: 0, tickMs: T.harmonics.tickMs, durationMs: T.harmonics.durationMs, slowFactor: T.harmonics.slowFactor, weaken: T.harmonics.weaken, fill: 0x6a5a9f, stroke: 0xd8b8ff }],
    },
  },
  {
    id: 'bard_sg_blood',
    tree: BARD_SONGS_TREE,
    name: 'Song of Blood',
    description: `Activate: the war-drum in the veins — +${Math.round(T.songOfBlood.damageMult * 100)}% damage, +${Math.round(T.songOfBlood.attackSpeedMult * 100)}% attack speed and +${Math.round(T.songOfBlood.moveSpeedMult * 100)}% speed for ${(T.songOfBlood.durationMs / 1000).toFixed(0)}s.`,
    cost: 1,
    prereq: 'bard_sg_harmonics',
    tier: 7,
    ensemble: { damagePerAllyPct: 0.05, speedPerAllyPct: 0.03 },
    effect: { kind: 'buff', cooldownMs: T.songOfBlood.cooldownMs, durationMs: T.songOfBlood.durationMs, energyCost: T.songOfBlood.energyCost, tint: T.songOfBlood.tint, stats: { damageMult: T.songOfBlood.damageMult, attackSpeedMult: T.songOfBlood.attackSpeedMult, moveSpeedMult: T.songOfBlood.moveSpeedMult } },
  },
  {
    id: 'bard_sg_rally',
    tree: BARD_SONGS_TREE,
    name: 'Foot Stamp Rally',
    description: `Activate: stamp the beat back into them — instantly restore ${T.rally.heal} HP and raise a brief mending ring for your companions.`,
    cost: 1,
    prereq: 'bard_sg_blood',
    tier: 8,
    ensemble: { healPerAllyPct: 0.1, revivePerAlly: 0 }, // the revive rider stays dormant (party era)
    effect: {
      kind: 'active',
      action: 'bard_rally',
      cooldownMs: T.rally.cooldownMs,
      energyCost: T.rally.energyCost,
      compose: [
        { p: 'heal', amount: T.rally.heal },
        { p: 'friendzone', radius: T.rally.zoneRadius, healPerTick: T.rally.zoneHealPerTick, tickMs: T.rally.zoneTickMs, durationMs: T.rally.zoneDurationMs, tint: 0xffe0a0 },
      ],
    },
  },
  {
    id: 'bard_sg_choir',
    tree: BARD_SONGS_TREE,
    name: 'Choir of Divinity',
    description: `Ultimate — Activate: every voice at once. For ${(T.choir.durationMs / 1000).toFixed(0)}s: +${Math.round(T.choir.damageMult * 100)}% damage, +${Math.round(T.choir.attackSpeedMult * 100)}% attack speed, +${Math.round(T.choir.moveSpeedMult * 100)}% speed and −${Math.round(T.choir.damageReduction * 100)}% damage taken. Long cooldown.`,
    cost: 1,
    prereq: 'bard_sg_rally',
    tier: 9,
    ensemble: { allStatsPerAllyPct: 0.05 },
    effect: {
      kind: 'buff',
      cooldownMs: T.choir.cooldownMs,
      durationMs: T.choir.durationMs,
      energyCost: T.choir.energyCost,
      tint: T.choir.tint,
      stats: { damageMult: T.choir.damageMult, attackSpeedMult: T.choir.attackSpeedMult, moveSpeedMult: T.choir.moveSpeedMult, damageReduction: T.choir.damageReduction },
    },
  },
];

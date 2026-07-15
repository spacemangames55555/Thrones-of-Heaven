import type { SkillDef } from './skillData';

/**
 * WITCH DOCTOR — SPIRIT WHISPERER TREE (10 skills, linear; SUPPORT/SUMMONS).
 *
 * The ancestor-speaker half: totems (static friendly zones), ally buffs, the
 * ALLY-BOND damage share (framework extension #3), the stealth-reuse Spirit
 * Walk, and the Soul Revenant summon ultimate. "Allies" today = SELF + summons.
 * Conventions as always: EVERY tunable in {@link WD_SPIRIT_TUNING} with
 * calibration anchors; placeholder prose. Tree id 'wd_spirit'. Tier-0 is a
 * DAMAGING ACTIVE (no-kit rule).
 */

export const WD_SPIRIT_TREE = 'wd_spirit';

// ─── TUNING (all starting values; tune freely in playtest) ────────────────────
export const WD_SPIRIT_TUNING = {
  /** 1) SPIRIT SWARM — ENTRY placed DoT + slow zone (vs Freezing Rain's placed
   *  slow-zone + Sage Burn's ticks). */
  swarm: { placeAhead: 200, radius: 130, tickDamage: 7, tickMs: 500, durationMs: 4500, slowFactor: 0.65, cooldownMs: 2800, energyCost: 10 },
  /** 2) ANCESTRAL GUIDANCE — attribute buff (vs Song of Blood without the speed). */
  guidance: { damageMult: 0.15, attackSpeedMult: 0.15, durationMs: 9000, cooldownMs: 16000, energyCost: 18, tint: 0xd8c8a0 },
  /** 3) HEALING TOTEM — a STATIC friendly zone (vs the Hum/Sage-Burn heal rates,
   *  planted instead of following). */
  totem: { radius: 130, healPerTick: 4, tickMs: 800, durationMs: 12000, cooldownMs: 20000, energyCost: 22 },
  /** 4) HEXING RITUAL — broad debuff zone: weaken + slow, no damage (Pestilence-
   *  lite control, bigger radius). */
  hexRitual: { placeAhead: 200, radius: 160, slowFactor: 0.6, weaken: 0.25, durationMs: 5000, tickMs: 400, cooldownMs: 14000, energyCost: 22 },
  /** 5) BLOOD PACT — sacrifice HP → heal summons + empower them (cost vs the
   *  heal: pay 15, allies gain 30 + a damage window; the pet-buff machinery). */
  bloodPact: { selfCost: 15, healAllies: 30, damageBonus: 0.3, buffDurationMs: 8000, cooldownMs: 14000, energyCost: 10 },
  /** 6) SPIRIT WALK — the stealth reuse (vs the Druid's stealth window). */
  spiritWalk: { durationMs: 5000, cooldownMs: 18000, energyCost: 20 },
  /** 7) SOUL BIND — the ALLY-BOND extension: share of player damage redirected
   *  onto summons (vs Entangled Chains' sharePct, friendly-flavored). */
  soulBind: { sharePct: 0.35, durationMs: 10000, cooldownMs: 22000, energyCost: 22 },
  /** 8) CURSED EFFIGY — a PLANTED magnet that soaks the blows meant for you and
   *  yours (the decoy machinery, rooted: moveTilesPerSec 0). */
  effigy: { cooldownMs: 16000, energyCost: 22 },
  /** 9) TRIBAL RITUAL — the dual-zone rite: allies in the circle mend while
   *  enemies inside wither + weaken (friendzone + hazard, one circle). */
  ritual: { radius: 150, healPerTick: 5, enemyTickDamage: 5, tickMs: 500, durationMs: 6000, weaken: 0.2, cooldownMs: 20000, energyCost: 28 },
  /** 10) SOUL REVENANT — ultimate summon (numbers in summonData's REVENANT
   *  config: calibrated between the Polar Bear 450/18 and the Monster 600/26). */
  revenant: { cooldownMs: 55000, energyCost: 45 },
} as const;

const T = WD_SPIRIT_TUNING;

// ─── THE 10 SPIRIT SKILLS (linear; tree 'wd_spirit') ──────────────────────────
// >>> EDIT NAMES / DESCRIPTIONS HERE (placeholder prose). <<<
export const WD_SPIRIT_SKILLS: SkillDef[] = [
  {
    id: 'wd_sp_swarm',
    tree: WD_SPIRIT_TREE,
    name: 'Spirit Swarm',
    description: 'Activate: call the restless dead onto the target ground — ethereal spirits engulf everything there, gnawing and DRAGGING at their limbs. Your reliable opener.',
    cost: 1,
    tier: 0,
    ensemble: { radiusPerAllyPct: 0.05 },
    effect: {
      kind: 'active',
      action: 'wd_swarm',
      cooldownMs: T.swarm.cooldownMs,
      energyCost: T.swarm.energyCost,
      compose: [{ p: 'hazard', at: 'ahead', placeAhead: T.swarm.placeAhead, radius: T.swarm.radius, tickDamage: T.swarm.tickDamage, tickMs: T.swarm.tickMs, durationMs: T.swarm.durationMs, slowFactor: T.swarm.slowFactor, fill: 0x2a4a44, stroke: 0x8fe8d0 }],
    },
  },
  {
    id: 'wd_sp_guidance',
    tree: WD_SPIRIT_TREE,
    name: 'Ancestral Guidance',
    description: `Activate: the ancestors lean close and whisper — +${Math.round(T.guidance.damageMult * 100)}% damage and +${Math.round(T.guidance.attackSpeedMult * 100)}% attack speed for ${(T.guidance.durationMs / 1000).toFixed(0)}s.`,
    cost: 1,
    prereq: 'wd_sp_swarm',
    tier: 1,
    ensemble: { statsPerAllyPct: 0.05 },
    effect: { kind: 'buff', cooldownMs: T.guidance.cooldownMs, durationMs: T.guidance.durationMs, energyCost: T.guidance.energyCost, tint: T.guidance.tint, stats: { damageMult: T.guidance.damageMult, attackSpeedMult: T.guidance.attackSpeedMult } },
  },
  {
    id: 'wd_sp_totem',
    tree: WD_SPIRIT_TREE,
    name: 'Healing Totem',
    description: `Activate: plant a carved totem where you stand — for ${(T.totem.durationMs / 1000).toFixed(0)}s it radiates mending to you and your companions inside its ring.`,
    cost: 1,
    prereq: 'wd_sp_guidance',
    tier: 2,
    ensemble: { healPerAllyPct: 0.1 },
    effect: {
      kind: 'active',
      action: 'wd_totem',
      cooldownMs: T.totem.cooldownMs,
      energyCost: T.totem.energyCost,
      compose: [{ p: 'friendzone', radius: T.totem.radius, healPerTick: T.totem.healPerTick, tickMs: T.totem.tickMs, durationMs: T.totem.durationMs, tint: 0xffe0a0, banner: 'The totem hums' }],
    },
  },
  {
    id: 'wd_sp_hex',
    tree: WD_SPIRIT_TREE,
    name: 'Hexing Ritual',
    description: `Activate: mark the target ground with a spoken hex — enemies inside are SLOWED and swing ${Math.round(T.hexRitual.weaken * 100)}% weaker for ${(T.hexRitual.durationMs / 1000).toFixed(0)}s.`,
    cost: 1,
    prereq: 'wd_sp_totem',
    tier: 3,
    ensemble: { radiusPerAllyPct: 0.05 },
    effect: {
      kind: 'active',
      action: 'wd_hex_ritual',
      cooldownMs: T.hexRitual.cooldownMs,
      energyCost: T.hexRitual.energyCost,
      compose: [{ p: 'hazard', at: 'ahead', placeAhead: T.hexRitual.placeAhead, radius: T.hexRitual.radius, tickDamage: 0, tickMs: T.hexRitual.tickMs, durationMs: T.hexRitual.durationMs, slowFactor: T.hexRitual.slowFactor, weaken: T.hexRitual.weaken, fill: 0x3a2a4a, stroke: 0xb08aff }],
    },
  },
  {
    id: 'wd_sp_pact',
    tree: WD_SPIRIT_TREE,
    name: 'Blood Pact',
    description: `Activate: open your own vein for the pact — pay ${T.bloodPact.selfCost} HP; your summons mend ${T.bloodPact.healAllies} and strike +${Math.round(T.bloodPact.damageBonus * 100)}% harder for ${(T.bloodPact.buffDurationMs / 1000).toFixed(0)}s.`,
    cost: 1,
    prereq: 'wd_sp_hex',
    tier: 4,
    ensemble: { healPerAllyPct: 0.1 },
    effect: { kind: 'active', action: 'wd_blood_pact', cooldownMs: T.bloodPact.cooldownMs, energyCost: T.bloodPact.energyCost },
  },
  {
    id: 'wd_sp_walk',
    tree: WD_SPIRIT_TREE,
    name: 'Spirit Walk',
    description: `Activate: step halfway into the spirit world for ${(T.spiritWalk.durationMs / 1000).toFixed(0)}s — no enemy can find you until you strike.`,
    cost: 1,
    prereq: 'wd_sp_pact',
    tier: 5,
    ensemble: { durationPerAllyMs: 0 },
    effect: {
      kind: 'active',
      action: 'wd_spirit_walk',
      cooldownMs: T.spiritWalk.cooldownMs,
      energyCost: T.spiritWalk.energyCost,
      compose: [{ p: 'stealth', durationMs: T.spiritWalk.durationMs, banner: 'You walk between worlds' }],
    },
  },
  {
    id: 'wd_sp_bind',
    tree: WD_SPIRIT_TREE,
    name: 'Soul Bind',
    description: `Activate: lash your soul to your summons for ${(T.soulBind.durationMs / 1000).toFixed(0)}s — ${Math.round(T.soulBind.sharePct * 100)}% of the harm meant for you lands on them instead.`,
    cost: 1,
    prereq: 'wd_sp_walk',
    tier: 6,
    ensemble: { sharePerAllyPct: 0.05 },
    effect: { kind: 'active', action: 'wd_soul_bind', cooldownMs: T.soulBind.cooldownMs, energyCost: T.soulBind.energyCost },
  },
  {
    id: 'wd_sp_effigy',
    tree: WD_SPIRIT_TREE,
    name: 'Cursed Effigy',
    description: 'Activate: plant a woven effigy in the earth — enemies cannot look away from it, and every blow it soaks is one that never reaches you and yours.',
    cost: 1,
    prereq: 'wd_sp_bind',
    tier: 7,
    ensemble: { hpPerAllyPct: 0.1 },
    effect: { kind: 'active', action: 'wd_effigy', cooldownMs: T.effigy.cooldownMs, energyCost: T.effigy.energyCost },
  },
  {
    id: 'wd_sp_ritual',
    tree: WD_SPIRIT_TREE,
    name: 'Tribal Ritual',
    description: `Activate: hold the rite — one circle, two fates. For ${(T.ritual.durationMs / 1000).toFixed(0)}s allies inside STRENGTHEN and mend while enemies inside WITHER and weaken.`,
    cost: 1,
    prereq: 'wd_sp_effigy',
    tier: 8,
    ensemble: { radiusPerAllyPct: 0.05 },
    effect: {
      kind: 'active',
      action: 'wd_ritual',
      cooldownMs: T.ritual.cooldownMs,
      energyCost: T.ritual.energyCost,
      compose: [
        { p: 'friendzone', radius: T.ritual.radius, healPerTick: T.ritual.healPerTick, tickMs: T.ritual.tickMs, durationMs: T.ritual.durationMs, tint: 0xffe0a0 },
        { p: 'hazard', at: 'self', radius: T.ritual.radius, tickDamage: T.ritual.enemyTickDamage, tickMs: T.ritual.tickMs, durationMs: T.ritual.durationMs, weaken: T.ritual.weaken, fill: 0x3a2a4a, stroke: 0x8fe8d0 },
      ],
    },
  },
  {
    id: 'wd_sp_revenant',
    tree: WD_SPIRIT_TREE,
    name: 'Soul Revenant',
    description: 'Ultimate — Activate: call a mighty revenant up from the river of the dead. It FIGHTS, it GUARDS, and while it stands the enemy has bigger problems than you. Long cooldown.',
    cost: 1,
    prereq: 'wd_sp_ritual',
    tier: 9,
    ensemble: { hpPerAllyPct: 0.1 },
    effect: { kind: 'active', action: 'wd_revenant', cooldownMs: T.revenant.cooldownMs, energyCost: T.revenant.energyCost },
  },
];

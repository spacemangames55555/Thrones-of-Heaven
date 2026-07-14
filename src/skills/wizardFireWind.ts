import type { SkillDef } from './skillData';

/**
 * WIZARD — FIRE/WIND DPS TREE (10 damage skills, linear → Elemental Storm capstone).
 *
 * The Wizard's first of three trees (Ice/Poison Control + Ethereal Survival come in
 * later batches). All ten nodes are DAMAGE actives that reuse the existing systems:
 * the projectile pool (Fireball/Flicker/Combust), the dash mechanic (Gust), the
 * persistent ground-hazard pattern (Lava), circle AoE (Immolation/Tornado), and the
 * new reusable cone (Dust Devil) + line/wall (Jet Stream) hitbox primitives. The
 * capstone is a TRANSFORMATION (Elemental Storm form). EVERY tunable lives in
 * {@link WIZARD_FIREWIND_TUNING}; names/descriptions are PLACEHOLDER prose — edit the
 * `name`/`description` fields in WIZARD_FIREWIND_SKILLS. Tree id 'wiz_firewind'.
 */

/** Tree + capstone-form ids the scene/UI key off. */
export const WIZ_FIREWIND_TREE = 'wiz_firewind';
export const WIZ_STORM_ID = 'wiz_fw_storm';

// ─── TUNING (all starting values; tune freely in playtest) ────────────────────
export const WIZARD_FIREWIND_TUNING = {
  /** 1) FIREBALL — ENTRY single-target bolt. Must be able to defeat the Sasquatch. */
  fireball: { damage: 26, speed: 480, range: 360, radius: 12, cooldownMs: 1200, energyCost: 8 },
  /** 2) FLICKER — multi-projectile spread (several fast bolts). */
  flicker: { boltCount: 4, damageEach: 12, spreadDeg: 36, speed: 540, range: 320, radius: 9, cooldownMs: 4000, energyCost: 16 },
  /** 3) COMBUST — single bolt that EXPLODES for splash AoE on impact. */
  combust: { directDamage: 24, splashDamage: 18, splashRadius: 90, speed: 440, range: 340, radius: 12, cooldownMs: 6000, energyCost: 18 },
  /** 4) DUST DEVIL — short cone of wind damage in front of the player. */
  dustDevil: { damage: 30, range: 135, coneHalfAngleDeg: 35, cooldownMs: 5000, energyCost: 14 },
  /** 5) GUST — wind-dash: moves the player forward + damages enemies in the path. */
  gust: { distance: 260, damage: 26, cooldownMs: 7000, energyCost: 14 },
  /** 6) LAVA — persistent burning ground patch in front; ticks damage over its life. */
  lava: { tickDamage: 12, radius: 82, durationMs: 3000, tickMs: 480, placeAhead: 70, cooldownMs: 9000, energyCost: 18 },
  /** 7) IMMOLATION — fiery burst around the player (self-centered circle AoE). */
  immolation: { damage: 34, radius: 120, cooldownMs: 7000, energyCost: 18 },
  /** 8) JET STREAM — a line/wall of wind damage projected ahead of the player. */
  jetStream: { damage: 40, length: 320, width: 72, cooldownMs: 9000, energyCost: 22 },
  /** 9) TORNADO — large swirling vortex around the player (multi-pulse, bigger than Immolation). */
  tornado: { damage: 26, radius: 180, pulses: 3, pulseMs: 320, cooldownMs: 12000, energyCost: 24 },
  /** 10) ELEMENTAL STORM FORM — transformation capstone. While active, fire/wind damage
   *  and cast speed are boosted, the player's projectiles gain splash, and a fiery aura
   *  burns nearby foes; the avatar becomes a storm-elemental, then reverts. */
  storm: {
    durationMs: 12000,
    damageMult: 0.5, // +50% ability damage
    attackSpeedMult: 0.5, // +50% cast speed (active cooldowns ÷ 1.5)
    splashRadius: 92, // projectiles explode for splash...
    splashFraction: 0.5, // ...dealing this fraction of the bolt's damage as AoE
    auraDamage: 7,
    auraRadius: 150,
    cooldownMs: 60000,
    tint: 0xff7a2a, // fiery storm-elemental tint
  },
} as const;

const T = WIZARD_FIREWIND_TUNING;

// ─── THE 10 FIRE/WIND SKILLS (linear; tree 'wiz_firewind') ────────────────────
// >>> EDIT NAMES / DESCRIPTIONS HERE (placeholder prose). <<<
export const WIZARD_FIREWIND_SKILLS: SkillDef[] = [
  {
    id: 'wiz_fw_fireball',
    tree: WIZ_FIREWIND_TREE,
    name: 'Fireball',
    description: 'Activate: hurl a fiery bolt that strikes the first enemy it hits. Your reliable ranged attack.',
    cost: 1,
    tier: 0,
    effect: {
      kind: 'active',
      action: 'wiz_fireball',
      cooldownMs: T.fireball.cooldownMs,
      energyCost: T.fireball.energyCost,
      compose: [{ p: 'bolt', via: 'aimed', damage: T.fireball.damage, speed: T.fireball.speed, range: T.fireball.range, radius: T.fireball.radius, tint: 0xff7a2a }],
    },
  },
  {
    id: 'wiz_fw_flicker',
    tree: WIZ_FIREWIND_TREE,
    name: 'Flicker',
    description: `Activate: loose ${T.flicker.boltCount} fast bolts in a spread, peppering multiple foes in front of you.`,
    cost: 1,
    prereq: 'wiz_fw_fireball',
    tier: 1,
    effect: { kind: 'active', action: 'wiz_flicker', cooldownMs: T.flicker.cooldownMs, energyCost: T.flicker.energyCost },
  },
  {
    id: 'wiz_fw_combust',
    tree: WIZ_FIREWIND_TREE,
    name: 'Combust',
    description: 'Activate: a bolt that EXPLODES on impact, dealing splash damage to everything near where it lands.',
    cost: 1,
    prereq: 'wiz_fw_flicker',
    tier: 2,
    effect: {
      kind: 'active',
      action: 'wiz_combust',
      cooldownMs: T.combust.cooldownMs,
      energyCost: T.combust.energyCost,
      compose: [{ p: 'bolt', via: 'wizard', damage: T.combust.directDamage, speed: T.combust.speed, range: T.combust.range, radius: T.combust.radius, tint: 0xff5a2a, splash: { radius: T.combust.splashRadius, damage: T.combust.splashDamage } }],
    },
  },
  {
    id: 'wiz_fw_dust_devil',
    tree: WIZ_FIREWIND_TREE,
    name: 'Dust Devil',
    description: 'Activate: a cone of cutting wind in front of you, hitting all foes within the wedge.',
    cost: 1,
    prereq: 'wiz_fw_combust',
    tier: 3,
    effect: {
      kind: 'active',
      action: 'wiz_dust_devil',
      cooldownMs: T.dustDevil.cooldownMs,
      energyCost: T.dustDevil.energyCost,
      compose: [{ p: 'cone', range: T.dustDevil.range, halfAngleDeg: T.dustDevil.coneHalfAngleDeg, damage: T.dustDevil.damage, tint: 0x9ad8ff }],
    },
  },
  {
    id: 'wiz_fw_gust',
    tree: WIZ_FIREWIND_TREE,
    name: 'Gust',
    description: 'Activate: ride the wind forward in a quick dash, damaging every enemy in your path. Your mobility.',
    cost: 1,
    prereq: 'wiz_fw_dust_devil',
    tier: 4,
    effect: { kind: 'active', action: 'wiz_gust', cooldownMs: T.gust.cooldownMs, energyCost: T.gust.energyCost },
  },
  {
    id: 'wiz_fw_lava',
    tree: WIZ_FIREWIND_TREE,
    name: 'Lava',
    description: `Activate: melt the ground ahead into a burning patch that scorches enemies in it for ${(T.lava.durationMs / 1000).toFixed(0)}s.`,
    cost: 1,
    prereq: 'wiz_fw_gust',
    tier: 5,
    effect: {
      kind: 'active',
      action: 'wiz_lava',
      cooldownMs: T.lava.cooldownMs,
      energyCost: T.lava.energyCost,
      compose: [{ p: 'hazard', at: 'ahead', placeAhead: T.lava.placeAhead, radius: T.lava.radius, tickDamage: T.lava.tickDamage, tickMs: T.lava.tickMs, durationMs: T.lava.durationMs }],
    },
  },
  {
    id: 'wiz_fw_immolation',
    tree: WIZ_FIREWIND_TREE,
    name: 'Immolation',
    description: 'Activate: erupt in flame, burning all enemies around you.',
    cost: 1,
    prereq: 'wiz_fw_lava',
    tier: 6,
    effect: {
      kind: 'active',
      action: 'wiz_immolation',
      cooldownMs: T.immolation.cooldownMs,
      energyCost: T.immolation.energyCost,
      compose: [{ p: 'strike', at: 'self', radius: T.immolation.radius, damage: T.immolation.damage, tint: 0xff7a2a }],
    },
  },
  {
    id: 'wiz_fw_jet_stream',
    tree: WIZ_FIREWIND_TREE,
    name: 'Jet Stream',
    description: 'Activate: blast a long wall of howling wind straight ahead, shredding everything along the line.',
    cost: 1,
    prereq: 'wiz_fw_immolation',
    tier: 7,
    effect: {
      kind: 'active',
      action: 'wiz_jet_stream',
      cooldownMs: T.jetStream.cooldownMs,
      energyCost: T.jetStream.energyCost,
      compose: [{ p: 'line', length: T.jetStream.length, width: T.jetStream.width, damage: T.jetStream.damage, tint: 0xbfe6ff }],
    },
  },
  {
    id: 'wiz_fw_tornado',
    tree: WIZ_FIREWIND_TREE,
    name: 'Tornado',
    description: 'Activate: a roaring vortex swirls around you, striking all nearby enemies several times.',
    cost: 1,
    prereq: 'wiz_fw_jet_stream',
    tier: 8,
    effect: {
      kind: 'active',
      action: 'wiz_tornado',
      cooldownMs: T.tornado.cooldownMs,
      energyCost: T.tornado.energyCost,
      compose: [{ p: 'strike', at: 'self', radius: T.tornado.radius, damage: T.tornado.damage, tint: 0xbfe6ff, pulses: T.tornado.pulses, pulseMs: T.tornado.pulseMs }],
    },
  },
  {
    id: WIZ_STORM_ID,
    tree: WIZ_FIREWIND_TREE,
    name: 'Elemental Storm',
    description: `Capstone — Activate: become a living fire/wind elemental for ${(T.storm.durationMs / 1000).toFixed(0)}s. +${Math.round(
      T.storm.damageMult * 100,
    )}% ability damage, +${Math.round(
      T.storm.attackSpeedMult * 100,
    )}% cast speed, your bolts gain SPLASH, and a burning aura scorches nearby foes. You become a raging storm-elemental, then revert.`,
    cost: 1,
    prereq: 'wiz_fw_tornado',
    tier: 9,
    effect: {
      kind: 'transformation',
      cooldownMs: T.storm.cooldownMs,
      durationMs: T.storm.durationMs,
      tint: T.storm.tint,
      auraDamage: T.storm.auraDamage,
      auraRadius: T.storm.auraRadius,
      stats: { damageMult: T.storm.damageMult, attackSpeedMult: T.storm.attackSpeedMult },
    },
  },
];

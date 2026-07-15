import type { SkillDef } from './skillData';

/**
 * MONK — IRON PALM TREE (10 skills, linear; MELEE).
 *
 * Empty hands, full spirit: fast open-hand strikes, DEFLECT (the parry window's
 * projectile config — framework extension #1), the chi-charged consume-buff,
 * the stealth reuse, and the HUNDRED HANDS combo ultimate. "Chi" is prose over
 * standard energy. Conventions as always: EVERY tunable in
 * {@link MONK_PALM_TUNING} with calibration anchors; placeholder prose. Tree id
 * 'monk_palm'. Tier-0 is a DAMAGING ACTIVE (no-kit rule).
 */

export const MONK_PALM_TREE = 'monk_palm';

// Id the scene keys the Flowing Movement passive off of (plain stats — listed
// here for symmetry with the other trees' keyed exports).
export const FLOWING_MOVEMENT_ID = 'monk_ip_flowing';

// ─── TUNING (all starting values; tune freely in playtest) ────────────────────
export const MONK_PALM_TUNING = {
  /** 1) PALM STRIKE — ENTRY fast open-hand blow (vs First Cut's 20/2s). */
  palm: { range: 68, damage: 19, cooldownMs: 2000, energyCost: 8 },
  /** 2) FLURRY OF BLOWS — three rapid strikes (the Mantis/Mosh pattern: 3×9). */
  flurry: { hits: 3, damageEach: 9, hitMs: 130, range: 66, cooldownMs: 3400, energyCost: 12 },
  /** 3) SWEEPING KICK — a low arc: damage + slow (arc vs Crescent's 100/70°;
   *  slow vs Hamstring's 0.55/2.5s, briefer). */
  sweep: { range: 90, coneHalfAngleDeg: 60, damage: 18, slowFactor: 0.6, slowMs: 2000, cooldownMs: 6000, energyCost: 14 },
  /** 4) FLOWING MOVEMENT — evasion + speed (evasion mapped to block, the Water
   *  Stance precedent). */
  flowing: { moveSpeedMult: 0.1, blockChance: 0.12, blockReduction: 0.6 },
  /** 5) DEFLECT — the parry window's MONK config: melee AND projectiles, with a
   *  LIGHTER projectile riposte (extension #1; window vs the Samurai Parry's
   *  650ms/22). */
  deflect: { windowMs: 650, riposteDamage: 18, projectileRiposteMult: 0.5, cooldownMs: 6000, energyCost: 10 },
  /** 6) PRESSURE POINTS — nerve strikes: weaken + defense-down (vs Guard
   *  Break's 0.3/4s, longer + lighter damage). */
  pressure: { range: 70, damage: 14, weaken: 0.3, weakenMs: 5000, cooldownMs: 8000, energyCost: 16 },
  /** 7) RISING DRAGON — the dash-through rising strike (vs Dragonfly's 190/26). */
  rising: { distance: 180, damage: 24, knockdownMs: 400, cooldownMs: 8000, energyCost: 18 },
  /** 8) EMPOWERED STRIKES — the consume-buff: the next N strikes hit ×mult
   *  (count vs Amplification's 3 charges; the mult is the payload). */
  empower: { charges: 3, mult: 1.8, cooldownMs: 14000, energyCost: 20 },
  /** 9) SILENT STEP — the stealth reuse (vs Spirit Walk's 5s window). */
  silent: { durationMs: 4500, cooldownMs: 18000, energyCost: 18 },
  /** 10) HUNDRED HANDS — ultimate: the combo-ultimate machinery, barely slower
   *  than Thousand Cuts (300→280ms beat, lighter per hit). */
  hundred: { durationMs: 5000, intervalMs: 280, range: 110, damage: 11, jumps: 1, jumpRange: 120, falloff: 0.6, attackSpeedMult: 0.15, cooldownMs: 55000, energyCost: 40, tint: 0xa8ffd0 },
} as const;

const T = MONK_PALM_TUNING;

// ─── THE 10 IRON PALM SKILLS (linear; tree 'monk_palm') ───────────────────────
// >>> EDIT NAMES / DESCRIPTIONS HERE (placeholder prose). <<<
export const MONK_PALM_SKILLS: SkillDef[] = [
  {
    id: 'monk_ip_palm',
    tree: MONK_PALM_TREE,
    name: 'Palm Strike',
    description: 'Activate: one fast open-hand blow, no wasted motion. Your reliable opener.',
    cost: 1,
    tier: 0,
    effect: {
      kind: 'active',
      action: 'monk_palm',
      cooldownMs: T.palm.cooldownMs,
      energyCost: T.palm.energyCost,
      compose: [{ p: 'strike', at: 'front', range: T.palm.range, damage: T.palm.damage, tint: 0xa8ffd0 }],
    },
  },
  {
    id: 'monk_ip_flurry',
    tree: MONK_PALM_TREE,
    name: 'Flurry of Blows',
    description: `Activate: ${T.flurry.hits} strikes faster than thought — the hands empty, the rhythm full.`,
    cost: 1,
    prereq: 'monk_ip_palm',
    tier: 1,
    effect: {
      kind: 'active',
      action: 'monk_flurry',
      cooldownMs: T.flurry.cooldownMs,
      energyCost: T.flurry.energyCost,
      compose: [{ p: 'strike', at: 'front', range: T.flurry.range, damage: T.flurry.damageEach, tint: 0xa8ffd0, pulses: T.flurry.hits, pulseMs: T.flurry.hitMs }],
    },
  },
  {
    id: 'monk_ip_sweep',
    tree: MONK_PALM_TREE,
    name: 'Sweeping Kick',
    description: `Activate: a low arcing kick — everything in the sweep is cut down to ${Math.round(T.sweep.slowFactor * 100)}% speed for ${(T.sweep.slowMs / 1000).toFixed(0)}s.`,
    cost: 1,
    prereq: 'monk_ip_flurry',
    tier: 2,
    effect: {
      kind: 'active',
      action: 'monk_sweep',
      cooldownMs: T.sweep.cooldownMs,
      energyCost: T.sweep.energyCost,
      compose: [{ p: 'cone', range: T.sweep.range, halfAngleDeg: T.sweep.coneHalfAngleDeg, damage: T.sweep.damage, tint: 0xa8ffd0, slowFactor: T.sweep.slowFactor, slowMs: T.sweep.slowMs }],
    },
  },
  {
    id: FLOWING_MOVEMENT_ID,
    tree: MONK_PALM_TREE,
    name: 'Flowing Movement',
    description: `Passive: the body moves like water — +${Math.round(T.flowing.moveSpeedMult * 100)}% speed and slipping evasion.`,
    cost: 1,
    prereq: 'monk_ip_sweep',
    tier: 3,
    effect: { kind: 'passive', stats: { moveSpeedMult: T.flowing.moveSpeedMult, blockChance: T.flowing.blockChance, blockReduction: T.flowing.blockReduction } },
  },
  {
    id: 'monk_ip_deflect',
    tree: MONK_PALM_TREE,
    name: 'Deflect',
    description: `Activate: read the attack before it lands — for ${T.deflect.windowMs}ms the next blow OR arrow is turned aside entirely, answered in kind (arrows more gently).`,
    cost: 1,
    prereq: FLOWING_MOVEMENT_ID,
    tier: 4,
    effect: { kind: 'active', action: 'monk_deflect', cooldownMs: T.deflect.cooldownMs, energyCost: T.deflect.energyCost },
  },
  {
    id: 'monk_ip_pressure',
    tree: MONK_PALM_TREE,
    name: 'Pressure Points',
    description: `Activate: two fingers find the nerve — the struck enemy swings ${Math.round(T.pressure.weaken * 100)}% weaker for ${(T.pressure.weakenMs / 1000).toFixed(0)}s.`,
    cost: 1,
    prereq: 'monk_ip_deflect',
    tier: 5,
    effect: {
      kind: 'active',
      action: 'monk_pressure',
      cooldownMs: T.pressure.cooldownMs,
      energyCost: T.pressure.energyCost,
      compose: [{ p: 'strike', at: 'front', range: T.pressure.range, damage: T.pressure.damage, tint: 0xa8ffd0, weaken: T.pressure.weaken, weakenMs: T.pressure.weakenMs, weakenOnlyIfHit: true }],
    },
  },
  {
    id: 'monk_ip_rising',
    tree: MONK_PALM_TREE,
    name: 'Rising Dragon',
    description: 'Activate: dash THROUGH the enemy on a rising strike — you end behind it, it ends on the ground.',
    cost: 1,
    prereq: 'monk_ip_pressure',
    tier: 6,
    effect: { kind: 'active', action: 'monk_rising', cooldownMs: T.rising.cooldownMs, energyCost: T.rising.energyCost },
  },
  {
    id: 'monk_ip_empower',
    tree: MONK_PALM_TREE,
    name: 'Empowered Strikes',
    description: `Activate: draw chi into the fists — your next ${T.empower.charges} strikes hit ×${T.empower.mult} harder, then the charge is spent.`,
    cost: 1,
    prereq: 'monk_ip_rising',
    tier: 7,
    effect: { kind: 'active', action: 'monk_empower', cooldownMs: T.empower.cooldownMs, energyCost: T.empower.energyCost },
  },
  {
    id: 'monk_ip_silent',
    tree: MONK_PALM_TREE,
    name: 'Silent Step',
    description: `Activate: step out of every eye for ${(T.silent.durationMs / 1000).toFixed(1)}s — aggro dropped, unseen until you strike.`,
    cost: 1,
    prereq: 'monk_ip_empower',
    tier: 8,
    effect: {
      kind: 'active',
      action: 'monk_silent',
      cooldownMs: T.silent.cooldownMs,
      energyCost: T.silent.energyCost,
      compose: [{ p: 'stealth', durationMs: T.silent.durationMs, banner: 'You are not here' }],
    },
  },
  {
    id: 'monk_ip_hundred',
    tree: MONK_PALM_TREE,
    name: 'Hundred Hands',
    description: `Ultimate — Activate: the hands disappear. For ${(T.hundred.durationMs / 1000).toFixed(0)}s a storm of strikes chains itself through everything in reach on a breathless beat. Long cooldown.`,
    cost: 1,
    prereq: 'monk_ip_silent',
    tier: 9,
    effect: { kind: 'active', action: 'monk_hundred', cooldownMs: T.hundred.cooldownMs, energyCost: T.hundred.energyCost },
  },
];

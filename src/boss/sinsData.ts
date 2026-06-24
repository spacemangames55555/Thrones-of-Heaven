import { WRATH, SLOTH, GLUTTONY, ENVY, PRIDE } from '../game/settings';
import type { BossDef } from './bossTypes';

/**
 * THE 7 DEADLY SINS — Batch 1 (Wrath / Sloth / Gluttony) as DATA on the boss
 * framework. Each Sin is a {@link BossDef} built from its tuning constants in
 * settings.ts — there are NO bespoke per-boss classes; the generic controller
 * (src/boss/Boss.ts) runs them from the shared attack-pattern library
 * ('melee' / 'volley' / 'barrage' / 'slam' / 'charge'). The gauntlet order +
 * unlock state lives in src/boss/SinGauntlet.ts.
 *
 * Three deliberately DISTINCT archetypes:
 *   WRATH    — relentless rusher: fast (accelerates in P2), hard melee + CHARGE.
 *   SLOTH    — slow huge-HP wall: telegraphed SLAM AoEs + lazy ranged volleys.
 *   GLUTTONY — summoner: Demon add-waves + a telegraphed projectile NOVA.
 *   ENVY     — reactive MIRROR duel: answers ranged with a return volley, answers a
 *              dash with a mimic-dash; modest baseline melee + ranged. (Batch 2)
 *   PRIDE    — SHIELD timing fight: telegraphed invuln windows between melee+ranged
 *              combos; commit damage in the shrinking vulnerable window. (Batch 2)
 *
 * To MOVE a Sin: edit its `placement` (LOCAL Hell pixels) in settings.ts.
 */

/** SIN 1 — WRATH: 2 phases; Phase 2 (≤50%) is even faster with a shorter melee CD. */
export const WRATH_DEF: BossDef = {
  id: 'sin-wrath',
  name: WRATH.name,
  world: 'hell',
  placement: WRATH.placement,
  sprite: { key: 'wrath', scale: WRATH.scale, tint: WRATH.color },
  maxHP: WRATH.maxHP,
  moveTilesPerSec: WRATH.moveTilesPerSec,
  meleeRange: WRATH.meleeRange,
  preferredRange: WRATH.meleeRange, // = meleeRange: never backs off, always in your face
  leashRange: WRATH.leashRange,
  activationRange: WRATH.activationRange,
  phases: [
    {
      fromRatio: 1,
      attacks: [
        { kind: 'melee', damage: WRATH.meleeDamage, cooldownMs: WRATH.meleeCooldownMsP1, range: WRATH.meleeRange },
        { kind: 'charge', damage: WRATH.chargeDamage, cooldownMs: WRATH.chargeCooldownMs, range: WRATH.chargeRange, speed: WRATH.chargeSpeed, telegraphMs: WRATH.chargeTelegraphMs },
      ],
    },
    {
      fromRatio: WRATH.phase2Threshold,
      moveTilesPerSec: WRATH.moveTilesPerSecP2, // even faster
      attacks: [
        { kind: 'melee', damage: WRATH.meleeDamage, cooldownMs: WRATH.meleeCooldownMsP2, range: WRATH.meleeRange },
        { kind: 'charge', damage: WRATH.chargeDamage, cooldownMs: WRATH.chargeCooldownMs, range: WRATH.chargeRange, speed: WRATH.chargeSpeed, telegraphMs: WRATH.chargeTelegraphMs },
      ],
    },
  ],
  xpReward: WRATH.xpReward,
  holyPowerDrop: WRATH.holyPowerDrop,
};

/** SIN 2 — SLOTH: 3 phases; the slam widens + quickens each phase (slow attrition). */
export const SLOTH_DEF: BossDef = {
  id: 'sin-sloth',
  name: SLOTH.name,
  world: 'hell',
  placement: SLOTH.placement,
  sprite: { key: 'sloth', scale: SLOTH.scale, tint: SLOTH.color },
  maxHP: SLOTH.maxHP,
  moveTilesPerSec: SLOTH.moveTilesPerSec,
  meleeRange: SLOTH.meleeRange,
  preferredRange: SLOTH.preferredRange,
  leashRange: SLOTH.leashRange,
  activationRange: SLOTH.activationRange,
  phases: [
    {
      fromRatio: 1,
      attacks: [
        { kind: 'slam', damage: SLOTH.slamDamage, cooldownMs: SLOTH.slamCooldownMsP1, range: SLOTH.slamRange, radius: SLOTH.slamRadiusP1, telegraphMs: SLOTH.slamTelegraphMs },
        { kind: 'volley', damage: SLOTH.volleyDamage, cooldownMs: SLOTH.volleyCooldownMs, range: SLOTH.volleyRange, bolts: SLOTH.volleyCount, spread: 0.16, speed: SLOTH.volleySpeed },
      ],
    },
    {
      fromRatio: SLOTH.phase2Threshold,
      attacks: [
        { kind: 'slam', damage: SLOTH.slamDamage, cooldownMs: SLOTH.slamCooldownMsP2, range: SLOTH.slamRange, radius: SLOTH.slamRadiusP2, telegraphMs: SLOTH.slamTelegraphMs },
        { kind: 'volley', damage: SLOTH.volleyDamage, cooldownMs: SLOTH.volleyCooldownMs, range: SLOTH.volleyRange, bolts: SLOTH.volleyCount, spread: 0.16, speed: SLOTH.volleySpeed },
      ],
    },
    {
      fromRatio: SLOTH.phase3Threshold,
      attacks: [
        { kind: 'slam', damage: SLOTH.slamDamage, cooldownMs: SLOTH.slamCooldownMsP3, range: SLOTH.slamRange, radius: SLOTH.slamRadiusP3, telegraphMs: SLOTH.slamTelegraphMs },
        { kind: 'volley', damage: SLOTH.volleyDamage, cooldownMs: SLOTH.volleyCooldownMs, range: SLOTH.volleyRange, bolts: SLOTH.volleyCount, spread: 0.16, speed: SLOTH.volleySpeed },
      ],
    },
  ],
  xpReward: SLOTH.xpReward,
  holyPowerDrop: SLOTH.holyPowerDrop,
};

/** SIN 3 — GLUTTONY: 3 phases; summon count/cadence + nova bolt-count escalate. */
export const GLUTTONY_DEF: BossDef = {
  id: 'sin-gluttony',
  name: GLUTTONY.name,
  world: 'hell',
  placement: GLUTTONY.placement,
  sprite: { key: 'gluttony', scale: GLUTTONY.scale, tint: GLUTTONY.color },
  maxHP: GLUTTONY.maxHP,
  moveTilesPerSec: GLUTTONY.moveTilesPerSec,
  meleeRange: GLUTTONY.meleeRange,
  preferredRange: GLUTTONY.preferredRange,
  leashRange: GLUTTONY.leashRange,
  activationRange: GLUTTONY.activationRange,
  phases: [
    {
      fromRatio: 1,
      attacks: [
        { kind: 'melee', damage: GLUTTONY.meleeDamage, cooldownMs: GLUTTONY.meleeCooldownMs, range: GLUTTONY.meleeRange },
        { kind: 'barrage', damage: GLUTTONY.novaDamage, cooldownMs: GLUTTONY.novaCooldownMs, range: GLUTTONY.novaRange, bolts: GLUTTONY.novaCountP1, speed: GLUTTONY.novaSpeed, telegraphMs: GLUTTONY.novaTelegraphMs },
      ],
      summon: { enemy: GLUTTONY.summonEnemy, count: GLUTTONY.summonCountP1, cap: GLUTTONY.summonCap, cadenceMs: GLUTTONY.summonCadenceMsP1 },
    },
    {
      fromRatio: GLUTTONY.phase2Threshold,
      attacks: [
        { kind: 'melee', damage: GLUTTONY.meleeDamage, cooldownMs: GLUTTONY.meleeCooldownMs, range: GLUTTONY.meleeRange },
        { kind: 'barrage', damage: GLUTTONY.novaDamage, cooldownMs: GLUTTONY.novaCooldownMs, range: GLUTTONY.novaRange, bolts: GLUTTONY.novaCountP2, speed: GLUTTONY.novaSpeed, telegraphMs: GLUTTONY.novaTelegraphMs },
      ],
      summon: { enemy: GLUTTONY.summonEnemy, count: GLUTTONY.summonCountP2, cap: GLUTTONY.summonCap, cadenceMs: GLUTTONY.summonCadenceMsP2 },
    },
    {
      fromRatio: GLUTTONY.phase3Threshold,
      attacks: [
        { kind: 'melee', damage: GLUTTONY.meleeDamage, cooldownMs: GLUTTONY.meleeCooldownMs, range: GLUTTONY.meleeRange },
        { kind: 'barrage', damage: GLUTTONY.novaDamage, cooldownMs: GLUTTONY.novaCooldownMs, range: GLUTTONY.novaRange, bolts: GLUTTONY.novaCountP3, speed: GLUTTONY.novaSpeed, telegraphMs: GLUTTONY.novaTelegraphMs },
      ],
      summon: { enemy: GLUTTONY.summonEnemy, count: GLUTTONY.summonCountP3, cap: GLUTTONY.summonCap, cadenceMs: GLUTTONY.summonCadenceMsP3 },
    },
  ],
  xpReward: GLUTTONY.xpReward,
  holyPowerDrop: GLUTTONY.holyPowerDrop,
};

/** SIN 4 — ENVY: 2 phases; the MIRROR pattern answers the player, escalating in P2. */
export const ENVY_DEF: BossDef = {
  id: 'sin-envy',
  name: ENVY.name,
  world: 'hell',
  placement: ENVY.placement,
  sprite: { key: 'envy', scale: ENVY.scale, tint: ENVY.color },
  maxHP: ENVY.maxHP,
  moveTilesPerSec: ENVY.moveTilesPerSec,
  meleeRange: ENVY.meleeRange,
  preferredRange: ENVY.preferredRange,
  leashRange: ENVY.leashRange,
  activationRange: ENVY.activationRange,
  phases: [
    {
      fromRatio: 1,
      attacks: [
        { kind: 'melee', damage: ENVY.meleeDamage, cooldownMs: ENVY.meleeCooldownMs, range: ENVY.meleeRange },
        { kind: 'volley', damage: ENVY.volleyDamage, cooldownMs: ENVY.volleyCooldownMsP1, range: ENVY.volleyRange, bolts: ENVY.volleyCount, spread: 0.18, speed: ENVY.volleySpeed },
        { kind: 'mirror', damage: ENVY.mirrorDamage, cooldownMs: ENVY.mirrorCooldownMsP1, range: ENVY.mirrorRange, bolts: ENVY.mirrorBolts, spread: ENVY.mirrorSpread, speed: ENVY.mirrorSpeed, dashSpeed: ENVY.mirrorDashSpeed },
      ],
    },
    {
      fromRatio: ENVY.phase2Threshold,
      moveTilesPerSec: ENVY.moveTilesPerSecP2,
      attacks: [
        { kind: 'melee', damage: ENVY.meleeDamage, cooldownMs: ENVY.meleeCooldownMs, range: ENVY.meleeRange },
        { kind: 'volley', damage: ENVY.volleyDamage, cooldownMs: ENVY.volleyCooldownMsP2, range: ENVY.volleyRange, bolts: ENVY.volleyCount, spread: 0.18, speed: ENVY.volleySpeed },
        { kind: 'mirror', damage: ENVY.mirrorDamage, cooldownMs: ENVY.mirrorCooldownMsP2, range: ENVY.mirrorRange, bolts: ENVY.mirrorBolts, spread: ENVY.mirrorSpread, speed: ENVY.mirrorSpeed, dashSpeed: ENVY.mirrorDashSpeed },
      ],
    },
  ],
  xpReward: ENVY.xpReward,
  holyPowerDrop: ENVY.holyPowerDrop,
};

/** SIN 5 — PRIDE: 3 phases; the SHIELD window lengthens + recurs faster each phase. */
export const PRIDE_DEF: BossDef = {
  id: 'sin-pride',
  name: PRIDE.name,
  world: 'hell',
  placement: PRIDE.placement,
  sprite: { key: 'pride', scale: PRIDE.scale, tint: PRIDE.color },
  maxHP: PRIDE.maxHP,
  moveTilesPerSec: PRIDE.moveTilesPerSec,
  meleeRange: PRIDE.meleeRange,
  preferredRange: PRIDE.preferredRange,
  leashRange: PRIDE.leashRange,
  activationRange: PRIDE.activationRange,
  phases: [
    {
      fromRatio: 1,
      attacks: [
        { kind: 'melee', damage: PRIDE.meleeDamage, cooldownMs: PRIDE.meleeCooldownMs, range: PRIDE.meleeRange },
        { kind: 'volley', damage: PRIDE.volleyDamage, cooldownMs: PRIDE.volleyCooldownMs, range: PRIDE.volleyRange, bolts: PRIDE.volleyCount, spread: 0.16, speed: PRIDE.volleySpeed },
        { kind: 'shield', damage: 0, cooldownMs: PRIDE.shieldCadenceMsP1, range: 0, durationMs: PRIDE.shieldDurationMsP1 },
      ],
    },
    {
      fromRatio: PRIDE.phase2Threshold,
      attacks: [
        { kind: 'melee', damage: PRIDE.meleeDamage, cooldownMs: PRIDE.meleeCooldownMs, range: PRIDE.meleeRange },
        { kind: 'volley', damage: PRIDE.volleyDamage, cooldownMs: PRIDE.volleyCooldownMs, range: PRIDE.volleyRange, bolts: PRIDE.volleyCount, spread: 0.16, speed: PRIDE.volleySpeed },
        { kind: 'shield', damage: 0, cooldownMs: PRIDE.shieldCadenceMsP2, range: 0, durationMs: PRIDE.shieldDurationMsP2 },
      ],
    },
    {
      fromRatio: PRIDE.phase3Threshold,
      attacks: [
        { kind: 'melee', damage: PRIDE.meleeDamage, cooldownMs: PRIDE.meleeCooldownMs, range: PRIDE.meleeRange },
        { kind: 'volley', damage: PRIDE.volleyDamage, cooldownMs: PRIDE.volleyCooldownMs, range: PRIDE.volleyRange, bolts: PRIDE.volleyCount, spread: 0.16, speed: PRIDE.volleySpeed },
        { kind: 'shield', damage: 0, cooldownMs: PRIDE.shieldCadenceMsP3, range: 0, durationMs: PRIDE.shieldDurationMsP3 },
      ],
    },
  ],
  xpReward: PRIDE.xpReward,
  holyPowerDrop: PRIDE.holyPowerDrop,
};

/** The Sin bosses in GAUNTLET ORDER (index 0 = Sin 1 = Wrath, fought first). */
export const SIN_DEFS: readonly BossDef[] = [WRATH_DEF, SLOTH_DEF, GLUTTONY_DEF, ENVY_DEF, PRIDE_DEF];

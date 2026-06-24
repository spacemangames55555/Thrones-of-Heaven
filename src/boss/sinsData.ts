import { WRATH, SLOTH, GLUTTONY } from '../game/settings';
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

/** The Sin bosses in GAUNTLET ORDER (index 0 = Sin 1 = Wrath, fought first). */
export const SIN_DEFS: readonly BossDef[] = [WRATH_DEF, SLOTH_DEF, GLUTTONY_DEF];

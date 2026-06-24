import { DRAGON, BEAST, SATAN, TRINITY_ARENA } from '../game/settings';
import type { BossDef } from './bossTypes';

/**
 * THE UNHOLY TRINITY — Part 1 boss DEFINITIONS (Dragon + Beast) as DATA on the
 * boss framework. Each is a {@link BossDef} built from its tuning constants in
 * settings.ts — there are NO bespoke per-boss classes; the generic controller
 * (src/boss/Boss.ts) runs them from the shared attack-pattern library
 * ('melee' / 'volley' / 'barrage' / 'slam' / 'charge' / 'mirror' / 'shield' /
 * 'hazard'). The staged sequence (lair entry, breathers, stage order) lives in
 * MainScene + src/boss/TrinitySequence.ts.
 *
 * Two distinct, finale-tier archetypes (both HARDER than the seven Sins):
 *   DRAGON — frantic aerial EVASION: fast dives (charge) + fire-breath novas
 *            (barrage) + lingering flames (hazard). Constant movement.
 *   BEAST  — multi-axis ATTRITION (the hardest): demon summons + heavy slams +
 *            armored shield windows + spreading corruption (hazard) + heavy melee.
 *   SATAN  — STAGE 3, the FINAL boss + hardest fight: 4 phases through the WHOLE
 *            library (charge/nova/summon/slam/shield/hazard) + the new HELLFIRE
 *            full-arena eruption, with a final ENRAGE. His defeat fires the ending.
 *
 * All three spawn at the lair ARENA (TRINITY_ARENA, LOCAL Hell px) — edit it to move.
 */

/** STAGE 1 — THE DRAGON: 3 phases; dives quicken, fire thickens, flames spread. */
export const DRAGON_DEF: BossDef = {
  id: 'trinity-dragon',
  name: DRAGON.name,
  world: 'hell',
  placement: TRINITY_ARENA,
  sprite: { key: 'dragon', scale: DRAGON.scale, tint: DRAGON.color },
  maxHP: DRAGON.maxHP,
  moveTilesPerSec: DRAGON.moveTilesPerSec,
  meleeRange: DRAGON.meleeRange,
  preferredRange: DRAGON.preferredRange,
  leashRange: DRAGON.leashRange,
  activationRange: DRAGON.activationRange,
  phases: [
    {
      fromRatio: 1,
      attacks: [
        { kind: 'melee', damage: DRAGON.meleeDamage, cooldownMs: DRAGON.meleeCooldownMs, range: DRAGON.meleeRange },
        { kind: 'charge', damage: DRAGON.chargeDamage, cooldownMs: DRAGON.chargeCooldownMsP1, range: DRAGON.chargeRange, speed: DRAGON.chargeSpeed, telegraphMs: DRAGON.chargeTelegraphMs },
        { kind: 'barrage', damage: DRAGON.fireDamage, cooldownMs: DRAGON.fireCooldownMs, range: DRAGON.fireRange, bolts: DRAGON.fireCountP1, speed: DRAGON.fireSpeed, telegraphMs: DRAGON.fireTelegraphMs },
        { kind: 'hazard', damage: DRAGON.flameDamage, cooldownMs: DRAGON.flameCadenceMsP1, range: DRAGON.flameRange, radius: DRAGON.flameRadiusP1, durationMs: DRAGON.flameLifetimeMs, telegraphMs: DRAGON.flameTelegraphMs, cap: DRAGON.flameCapP1 },
      ],
    },
    {
      fromRatio: DRAGON.phase2Threshold,
      moveTilesPerSec: DRAGON.moveTilesPerSecP2,
      attacks: [
        { kind: 'melee', damage: DRAGON.meleeDamage, cooldownMs: DRAGON.meleeCooldownMs, range: DRAGON.meleeRange },
        { kind: 'charge', damage: DRAGON.chargeDamage, cooldownMs: DRAGON.chargeCooldownMsP2, range: DRAGON.chargeRange, speed: DRAGON.chargeSpeed, telegraphMs: DRAGON.chargeTelegraphMs },
        { kind: 'barrage', damage: DRAGON.fireDamage, cooldownMs: DRAGON.fireCooldownMs, range: DRAGON.fireRange, bolts: DRAGON.fireCountP2, speed: DRAGON.fireSpeed, telegraphMs: DRAGON.fireTelegraphMs },
        { kind: 'hazard', damage: DRAGON.flameDamage, cooldownMs: DRAGON.flameCadenceMsP2, range: DRAGON.flameRange, radius: DRAGON.flameRadiusP2, durationMs: DRAGON.flameLifetimeMs, telegraphMs: DRAGON.flameTelegraphMs, cap: DRAGON.flameCapP2 },
      ],
    },
    {
      fromRatio: DRAGON.phase3Threshold,
      moveTilesPerSec: DRAGON.moveTilesPerSecP3,
      attacks: [
        { kind: 'melee', damage: DRAGON.meleeDamage, cooldownMs: DRAGON.meleeCooldownMs, range: DRAGON.meleeRange },
        { kind: 'charge', damage: DRAGON.chargeDamage, cooldownMs: DRAGON.chargeCooldownMsP3, range: DRAGON.chargeRange, speed: DRAGON.chargeSpeed, telegraphMs: DRAGON.chargeTelegraphMs },
        { kind: 'barrage', damage: DRAGON.fireDamage, cooldownMs: DRAGON.fireCooldownMs, range: DRAGON.fireRange, bolts: DRAGON.fireCountP3, speed: DRAGON.fireSpeed, telegraphMs: DRAGON.fireTelegraphMs },
        { kind: 'hazard', damage: DRAGON.flameDamage, cooldownMs: DRAGON.flameCadenceMsP3, range: DRAGON.flameRange, radius: DRAGON.flameRadiusP3, durationMs: DRAGON.flameLifetimeMs, telegraphMs: DRAGON.flameTelegraphMs, cap: DRAGON.flameCapP3 },
      ],
    },
  ],
  xpReward: DRAGON.xpReward,
  holyPowerDrop: DRAGON.holyPowerDrop,
};

/** STAGE 2 — THE BEAST: 4 phases of multi-axis attrition (summons + slam + shield
 *  + spreading corruption from P2). The hardest fight; armored — bait the shield. */
export const BEAST_DEF: BossDef = {
  id: 'trinity-beast',
  name: BEAST.name,
  world: 'hell',
  placement: TRINITY_ARENA,
  sprite: { key: 'beast', scale: BEAST.scale, tint: BEAST.color },
  maxHP: BEAST.maxHP,
  moveTilesPerSec: BEAST.moveTilesPerSec,
  meleeRange: BEAST.meleeRange,
  preferredRange: BEAST.preferredRange,
  leashRange: BEAST.leashRange,
  activationRange: BEAST.activationRange,
  phases: [
    {
      // P1 — bruiser baseline: heavy melee + slam + armored shield + summons.
      fromRatio: 1,
      attacks: [
        { kind: 'melee', damage: BEAST.meleeDamage, cooldownMs: BEAST.meleeCooldownMs, range: BEAST.meleeRange },
        { kind: 'slam', damage: BEAST.slamDamage, cooldownMs: BEAST.slamCooldownMsP1, range: BEAST.slamRange, radius: BEAST.slamRadius, telegraphMs: BEAST.slamTelegraphMs },
        { kind: 'shield', damage: 0, cooldownMs: BEAST.shieldCadenceMsP1, range: 0, durationMs: BEAST.shieldDurationMsP1 },
      ],
      summon: { enemy: BEAST.summonEnemy, count: BEAST.summonCountP1, cap: BEAST.summonCap, cadenceMs: BEAST.summonCadenceMsP1 },
    },
    {
      // P2 — corruption begins spreading (hazard added).
      fromRatio: BEAST.phase2Threshold,
      attacks: [
        { kind: 'melee', damage: BEAST.meleeDamage, cooldownMs: BEAST.meleeCooldownMs, range: BEAST.meleeRange },
        { kind: 'slam', damage: BEAST.slamDamage, cooldownMs: BEAST.slamCooldownMsP2, range: BEAST.slamRange, radius: BEAST.slamRadius, telegraphMs: BEAST.slamTelegraphMs },
        { kind: 'shield', damage: 0, cooldownMs: BEAST.shieldCadenceMsP2, range: 0, durationMs: BEAST.shieldDurationMsP2 },
        { kind: 'hazard', damage: BEAST.corruptDamage, cooldownMs: BEAST.corruptCadenceMsP2, range: BEAST.corruptRange, radius: BEAST.corruptRadius, durationMs: BEAST.corruptLifetimeMs, telegraphMs: BEAST.corruptTelegraphMs, cap: BEAST.corruptCapP2 },
      ],
      summon: { enemy: BEAST.summonEnemy, count: BEAST.summonCountP2, cap: BEAST.summonCap, cadenceMs: BEAST.summonCadenceMsP2 },
    },
    {
      // P3 — everything tightens.
      fromRatio: BEAST.phase3Threshold,
      attacks: [
        { kind: 'melee', damage: BEAST.meleeDamage, cooldownMs: BEAST.meleeCooldownMs, range: BEAST.meleeRange },
        { kind: 'slam', damage: BEAST.slamDamage, cooldownMs: BEAST.slamCooldownMsP3, range: BEAST.slamRange, radius: BEAST.slamRadius, telegraphMs: BEAST.slamTelegraphMs },
        { kind: 'shield', damage: 0, cooldownMs: BEAST.shieldCadenceMsP3, range: 0, durationMs: BEAST.shieldDurationMsP3 },
        { kind: 'hazard', damage: BEAST.corruptDamage, cooldownMs: BEAST.corruptCadenceMsP3, range: BEAST.corruptRange, radius: BEAST.corruptRadius, durationMs: BEAST.corruptLifetimeMs, telegraphMs: BEAST.corruptTelegraphMs, cap: BEAST.corruptCapP3 },
      ],
      summon: { enemy: BEAST.summonEnemy, count: BEAST.summonCountP3, cap: BEAST.summonCap, cadenceMs: BEAST.summonCadenceMsP3 },
    },
    {
      // P4 — overwhelming: max adds, fastest slams, densest corruption.
      fromRatio: BEAST.phase4Threshold,
      attacks: [
        { kind: 'melee', damage: BEAST.meleeDamage, cooldownMs: BEAST.meleeCooldownMs, range: BEAST.meleeRange },
        { kind: 'slam', damage: BEAST.slamDamage, cooldownMs: BEAST.slamCooldownMsP4, range: BEAST.slamRange, radius: BEAST.slamRadius, telegraphMs: BEAST.slamTelegraphMs },
        { kind: 'shield', damage: 0, cooldownMs: BEAST.shieldCadenceMsP4, range: 0, durationMs: BEAST.shieldDurationMsP4 },
        { kind: 'hazard', damage: BEAST.corruptDamage, cooldownMs: BEAST.corruptCadenceMsP4, range: BEAST.corruptRange, radius: BEAST.corruptRadius, durationMs: BEAST.corruptLifetimeMs, telegraphMs: BEAST.corruptTelegraphMs, cap: BEAST.corruptCapP4 },
      ],
      summon: { enemy: BEAST.summonEnemy, count: BEAST.summonCountP4, cap: BEAST.summonCap, cadenceMs: BEAST.summonCadenceMsP4 },
    },
  ],
  xpReward: BEAST.xpReward,
  holyPowerDrop: BEAST.holyPowerDrop,
};

/** STAGE 3 — SATAN: the FINAL boss. 4 phases combine MORE of the library each step,
 *  P3+ add the HELLFIRE full-arena eruption, and P4 ENRAGES (faster move, shorter
 *  cooldowns, fewer hellfire safe zones). Composed entirely from library patterns. */
export const SATAN_DEF: BossDef = {
  id: 'trinity-satan',
  name: SATAN.name,
  world: 'hell',
  placement: TRINITY_ARENA,
  sprite: { key: 'satan', scale: SATAN.scale, tint: SATAN.color },
  maxHP: SATAN.maxHP,
  moveTilesPerSec: SATAN.moveTilesPerSec,
  meleeRange: SATAN.meleeRange,
  preferredRange: SATAN.preferredRange,
  leashRange: SATAN.leashRange,
  activationRange: SATAN.activationRange,
  phases: [
    {
      // P1 — aggressive opener: melee + dives + ranged pokes.
      fromRatio: 1,
      attacks: [
        { kind: 'melee', damage: SATAN.meleeDamage, cooldownMs: SATAN.meleeCooldownMs, range: SATAN.meleeRange },
        { kind: 'charge', damage: SATAN.chargeDamage, cooldownMs: SATAN.chargeCooldownMsP1, range: SATAN.chargeRange, speed: SATAN.chargeSpeed, telegraphMs: SATAN.chargeTelegraphMs },
        { kind: 'volley', damage: SATAN.volleyDamage, cooldownMs: SATAN.volleyCooldownMs, range: SATAN.volleyRange, bolts: SATAN.volleyCount, spread: 0.16, speed: SATAN.volleySpeed },
      ],
    },
    {
      // P2 — adds novas, slams and demon summons.
      fromRatio: SATAN.phase2Threshold,
      attacks: [
        { kind: 'melee', damage: SATAN.meleeDamage, cooldownMs: SATAN.meleeCooldownMs, range: SATAN.meleeRange },
        { kind: 'charge', damage: SATAN.chargeDamage, cooldownMs: SATAN.chargeCooldownMsP1, range: SATAN.chargeRange, speed: SATAN.chargeSpeed, telegraphMs: SATAN.chargeTelegraphMs },
        { kind: 'barrage', damage: SATAN.novaDamage, cooldownMs: SATAN.novaCooldownMs, range: SATAN.volleyRange, bolts: SATAN.novaCountP2, speed: SATAN.novaSpeed, telegraphMs: SATAN.novaTelegraphMs },
        { kind: 'slam', damage: SATAN.slamDamage, cooldownMs: SATAN.slamCooldownMsP2, range: SATAN.slamRange, radius: SATAN.slamRadius, telegraphMs: SATAN.slamTelegraphMs },
      ],
      summon: { enemy: SATAN.summonEnemy, count: SATAN.summonCountP2, cap: SATAN.summonCap, cadenceMs: SATAN.summonCadenceMsP2 },
    },
    {
      // P3 — the full toolkit: shields, lingering hellground, and HELLFIRE eruptions.
      fromRatio: SATAN.phase3Threshold,
      attacks: [
        { kind: 'melee', damage: SATAN.meleeDamage, cooldownMs: SATAN.meleeCooldownMs, range: SATAN.meleeRange },
        { kind: 'barrage', damage: SATAN.novaDamage, cooldownMs: SATAN.novaCooldownMs, range: SATAN.volleyRange, bolts: SATAN.novaCountP3, speed: SATAN.novaSpeed, telegraphMs: SATAN.novaTelegraphMs },
        { kind: 'slam', damage: SATAN.slamDamage, cooldownMs: SATAN.slamCooldownMsP3, range: SATAN.slamRange, radius: SATAN.slamRadius, telegraphMs: SATAN.slamTelegraphMs },
        { kind: 'shield', damage: 0, cooldownMs: SATAN.shieldCadenceMsP3, range: 0, durationMs: SATAN.shieldDurationMs },
        { kind: 'hazard', damage: SATAN.hazardDamage, cooldownMs: SATAN.hazardCadenceMsP3, range: SATAN.hazardRange, radius: SATAN.hazardRadius, durationMs: SATAN.hazardLifetimeMs, telegraphMs: SATAN.hazardTelegraphMs, cap: SATAN.hazardCapP3 },
        { kind: 'hellfire', damage: SATAN.hellfireDamage, cooldownMs: SATAN.hellfireCooldownMsP3, range: SATAN.hellfireArenaRadius, bolts: SATAN.hellfireSafeZonesP3, radius: SATAN.hellfireSafeRadius, telegraphMs: SATAN.hellfireTelegraphMsP3 },
      ],
      summon: { enemy: SATAN.summonEnemy, count: SATAN.summonCountP2, cap: SATAN.summonCap, cadenceMs: SATAN.summonCadenceMsP2 },
    },
    {
      // P4 — ENRAGE: faster move, shorter cooldowns, fewer/quicker hellfire safe zones.
      fromRatio: SATAN.phase4Threshold,
      moveTilesPerSec: SATAN.moveTilesPerSecP4,
      attacks: [
        { kind: 'melee', damage: SATAN.meleeDamage, cooldownMs: SATAN.meleeCooldownMsP4, range: SATAN.meleeRange },
        { kind: 'charge', damage: SATAN.chargeDamage, cooldownMs: SATAN.chargeCooldownMsP4, range: SATAN.chargeRange, speed: SATAN.chargeSpeed, telegraphMs: SATAN.chargeTelegraphMs },
        { kind: 'barrage', damage: SATAN.novaDamage, cooldownMs: SATAN.novaCooldownMsP4, range: SATAN.volleyRange, bolts: SATAN.novaCountP4, speed: SATAN.novaSpeed, telegraphMs: SATAN.novaTelegraphMs },
        { kind: 'slam', damage: SATAN.slamDamage, cooldownMs: SATAN.slamCooldownMsP4, range: SATAN.slamRange, radius: SATAN.slamRadius, telegraphMs: SATAN.slamTelegraphMs },
        { kind: 'hazard', damage: SATAN.hazardDamage, cooldownMs: SATAN.hazardCadenceMsP4, range: SATAN.hazardRange, radius: SATAN.hazardRadius, durationMs: SATAN.hazardLifetimeMs, telegraphMs: SATAN.hazardTelegraphMs, cap: SATAN.hazardCapP4 },
        { kind: 'hellfire', damage: SATAN.hellfireDamage, cooldownMs: SATAN.hellfireCooldownMsP4, range: SATAN.hellfireArenaRadius, bolts: SATAN.hellfireSafeZonesP4, radius: SATAN.hellfireSafeRadius, telegraphMs: SATAN.hellfireTelegraphMsP4 },
      ],
      summon: { enemy: SATAN.summonEnemy, count: SATAN.summonCountP4, cap: SATAN.summonCap, cadenceMs: SATAN.summonCadenceMsP4 },
    },
  ],
  xpReward: SATAN.xpReward,
  holyPowerDrop: SATAN.holyPowerDrop,
};

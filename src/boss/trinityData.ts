import { DRAGON, BEAST, TRINITY_ARENA } from '../game/settings';
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
 *
 * Both spawn at the lair ARENA (TRINITY_ARENA, LOCAL Hell px) — edit it to move.
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

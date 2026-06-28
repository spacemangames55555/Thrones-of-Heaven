import { MICHAEL, SEMYAZA, OREGON_RIFT_POSITION } from '../game/settings';
import { MICHAEL_SANCTUM } from '../map/heavenWorld';
import type { BossDef } from './bossTypes';

/**
 * BOSS DEFINITIONS — a boss is (mostly) a data entry here. The generic controller
 * (src/boss/Boss.ts) reads these; the attack `kind`s are the pattern library.
 *
 * ─── HOW TO ADD A NEW BOSS (data only) ───────────────────────────────────────
 *  1. Add a placeholder sprite case in src/boss/bossSprites.ts (a `key`).
 *  2. Add a BossDef below (copy the TEMPLATE shape of TEST_BOSS_DEF):
 *       - identity: id, name (HP-bar label), world, placement (LOCAL coords), sprite.
 *       - stats: maxHP, moveTilesPerSec, meleeRange, preferredRange, leashRange,
 *         activationRange.
 *       - phases[]: ordered high→low `fromRatio` (1.0, .66, .33, …; any count). Each:
 *           attacks[]: pick from the library — 'melee' / 'volley' / 'barrage' /
 *             'slam' / 'charge' / 'mirror' (reactive) / 'shield' (invuln window) /
 *             'hazard' (persistent ground zone), each with its params (damage,
 *             cooldownMs, range, bolts/spread/speed, radius, telegraphMs, dashSpeed,
 *             durationMs, cap).
 *           summon?: { enemy, count, cap, cadenceMs } (reuses existing enemies).
 *       - rewards: xpReward, holyPowerDrop, optional onDefeatHook.
 *  3. Spawn/seed it (or add a dev button). NO new code needed.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Archangel Michael — ported onto the framework; values mirror MICHAEL (settings.ts)
 *  so he plays IDENTICALLY to his old bespoke implementation. */
export const MICHAEL_DEF: BossDef = {
  id: 'archangel-michael',
  name: 'Archangel Michael',
  world: 'heaven',
  placement: MICHAEL_SANCTUM,
  sprite: { key: 'michael', scale: MICHAEL.scale, tint: MICHAEL.color },
  maxHP: MICHAEL.maxHP,
  moveTilesPerSec: MICHAEL.moveTilesPerSec,
  meleeRange: MICHAEL.meleeRange,
  preferredRange: MICHAEL.preferredRange,
  leashRange: MICHAEL.projectileRange + 80, // matches the old leash exactly
  activationRange: MICHAEL.activationRange,
  phases: MICHAEL.phases.map((p, i) => ({
    fromRatio: i === 0 ? 1 : MICHAEL.phaseThresholds[i - 1],
    attacks: [
      { kind: 'melee', damage: p.meleeDamage, cooldownMs: p.meleeCooldownMs, range: MICHAEL.meleeRange },
      { kind: 'volley', damage: p.projectileDamage, cooldownMs: p.fireCooldownMs, range: MICHAEL.projectileRange, bolts: p.boltsPerVolley, spread: 0.16, speed: MICHAEL.projectileSpeed },
    ],
    summon: { enemy: MICHAEL.summonType, count: p.summonCount, cap: MICHAEL.summonCap, cadenceMs: p.summonCadenceMs },
  })),
  xpReward: MICHAEL.xpReward,
  holyPowerDrop: MICHAEL.holyPowerDrop,
  onDefeatHook: 'god-judgment',
};

/**
 * TEST DUMMY — a DATA-ONLY proof that a brand-new boss needs NO new code: two
 * phases, ranged + special moves (a telegraphed SLAM, a projectile BARRAGE/nova,
 * and a CHARGE), plus demon summons. Dev-spawnable only (clearly a test stand-in).
 */
export const TEST_BOSS_DEF: BossDef = {
  id: 'test-dummy',
  name: 'Test Dummy (DEV)',
  world: 'hell',
  placement: { x: 11520, y: 12200 },
  sprite: { key: 'test-boss', scale: 2.4, tint: 0xb060ff },
  maxHP: 1000,
  moveTilesPerSec: 4.4,
  meleeRange: 60,
  preferredRange: 240,
  leashRange: 720,
  activationRange: 280,
  phases: [
    {
      fromRatio: 1,
      attacks: [
        { kind: 'volley', damage: 14, cooldownMs: 1400, range: 520, bolts: 2, spread: 0.2, speed: 300 },
        { kind: 'slam', damage: 26, cooldownMs: 4500, range: 170, radius: 130, telegraphMs: 750 },
      ],
      summon: { enemy: 'demon', count: 2, cap: 3, cadenceMs: 0 },
    },
    {
      fromRatio: 0.5,
      attacks: [
        { kind: 'volley', damage: 16, cooldownMs: 1000, range: 520, bolts: 3, spread: 0.2, speed: 320 },
        { kind: 'barrage', damage: 18, cooldownMs: 5500, range: 600, bolts: 12, speed: 280, telegraphMs: 850 },
        { kind: 'charge', damage: 22, cooldownMs: 6000, range: 420, telegraphMs: 650 },
      ],
      summon: { enemy: 'demon', count: 2, cap: 3, cadenceMs: 9000 },
    },
  ],
  xpReward: 250,
  holyPowerDrop: 0,
};

/**
 * SEMYAZA — the rift-scene boss (Batch 4 finale). A deliberately SIMPLE, single-
 * phase Earth boss (melee + a small volley) reusing the framework; the SCENE around
 * it carries the weight. The scene HALTS him near death (SEMYAZA_LIE_THRESHOLD) for
 * the lie/choice and despawns him when the player takes the Light — he is never
 * killed by normal damage (MainScene clamps his HP at the threshold). Placeholder
 * art: the 'test-boss' sprite, tinted ashen violet.
 */
export const SEMYAZA_DEF: BossDef = {
  id: 'semyaza',
  name: 'Semyaza',
  world: 'earth',
  placement: OREGON_RIFT_POSITION,
  sprite: { key: 'test-boss', scale: SEMYAZA.scale, tint: SEMYAZA.color },
  maxHP: SEMYAZA.maxHP,
  moveTilesPerSec: SEMYAZA.moveTilesPerSec,
  meleeRange: SEMYAZA.meleeRange,
  preferredRange: SEMYAZA.preferredRange,
  leashRange: SEMYAZA.leashRange,
  activationRange: SEMYAZA.activationRange,
  phases: [
    {
      fromRatio: 1,
      attacks: [
        { kind: 'melee', damage: SEMYAZA.meleeDamage, cooldownMs: SEMYAZA.meleeCooldownMs, range: SEMYAZA.meleeRange },
        { kind: 'volley', damage: SEMYAZA.projectileDamage, cooldownMs: SEMYAZA.fireCooldownMs, range: SEMYAZA.projectileRange, bolts: SEMYAZA.boltsPerVolley, spread: 0.18, speed: SEMYAZA.projectileSpeed },
      ],
    },
  ],
  xpReward: SEMYAZA.xpReward,
  holyPowerDrop: 0,
};

export const ALL_BOSS_DEFS: readonly BossDef[] = [MICHAEL_DEF, TEST_BOSS_DEF, SEMYAZA_DEF];

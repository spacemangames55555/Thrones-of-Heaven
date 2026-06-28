import type { SkillDef } from './skillData';

/**
 * NECROMANCER — PRIMITIVE TEST SKILLS (temporary scaffolding).
 *
 * Throwaway, always-unlocked (`freeUnlock`) test actives that prove the two NEW combat
 * primitives so the real tree skills can reuse them as DATA:
 *   - TEST BEAM   → the CHANNEL primitive (effect.kind === 'channel').
 *   - TEST DECAY  → the STACKING-DoT primitive (effect.kind === 'stacking_dot').
 * The real Necromancer skills (Death Channel / Dark Energy Beam; Entropy Cascade / Internal
 * Collapse) are authored LATER as more entries of these exact shapes — delete this file +
 * its tree from the class then. Marked `test: true`. Neither is a damaging *active* kind, so
 * neither becomes a New-Game first-skill opener (the forced first pick stays Bone Dart).
 *
 * >>> TUNE THE PRIMITIVES HERE: every value below is a constant on the effect object. <<<
 */

export const PRIMITIVE_TEST_TREE = 'primitive_test';

/** TEST BEAM — channel tuning (the data template for a CHANNEL skill). */
export const TEST_BEAM_TUNING = {
  range: 360, // lock onto the nearest enemy within this many px
  durationMs: 10000, // channel up to 10s (ends early if the locked enemy dies / interrupted)
  damagePerTick: 10, // damage per tick to the locked enemy
  tickMs: 500, // a tick twice a second
  cooldownMs: 8000, // cooldown after the channel ENDS
  energyCost: 10, // spent to begin channeling
  resourcePerSec: 6, // optional: energy trickled back per second while channeling
  interruptCooldownFraction: 1, // 1 = full cooldown even on interrupt (tunable; 0 = none)
} as const;

/** TEST DECAY — stacking-DoT tuning (the data template for a STACKING_DOT skill). */
export const TEST_DECAY_TUNING = {
  range: 320, // applies to the nearest enemy within this many px
  dmgPerTick: 6, // per-stack damage per tick
  tickMs: 600, // each stack ticks at this rate
  durationMs: 5000, // each stack lasts this long (its own timer)
  maxStacks: 5, // cap; at the cap the oldest stack's duration refreshes
  cooldownMs: 700, // short cooldown so you can stack quickly
  energyCost: 5,
  color: 0x9a6cff,
} as const;

export const PRIMITIVE_TEST_SKILLS: SkillDef[] = [
  {
    id: 'necro_test_beam',
    tree: PRIMITIVE_TEST_TREE,
    name: 'Test Beam (TEST)',
    description: 'TEST channel: tap to lock the nearest enemy and beam it for up to 10s (ticks damage, trickles energy). MOVING or any other skill cancels it.',
    cost: 0,
    tier: 0,
    test: true,
    freeUnlock: true,
    effect: {
      kind: 'channel',
      cooldownMs: TEST_BEAM_TUNING.cooldownMs,
      range: TEST_BEAM_TUNING.range,
      durationMs: TEST_BEAM_TUNING.durationMs,
      damagePerTick: TEST_BEAM_TUNING.damagePerTick,
      tickMs: TEST_BEAM_TUNING.tickMs,
      energyCost: TEST_BEAM_TUNING.energyCost,
      resourcePerSec: TEST_BEAM_TUNING.resourcePerSec,
      interruptCooldownFraction: TEST_BEAM_TUNING.interruptCooldownFraction,
    },
  },
  {
    id: 'necro_test_decay',
    tree: PRIMITIVE_TEST_TREE,
    name: 'Test Decay (TEST)',
    description: 'TEST stacking DoT: tap to add a decay stack to the nearest enemy; recast to stack (up to 5). Stacks sum, each with its own timer.',
    cost: 0,
    tier: 1,
    test: true,
    freeUnlock: true,
    effect: {
      kind: 'stacking_dot',
      cooldownMs: TEST_DECAY_TUNING.cooldownMs,
      range: TEST_DECAY_TUNING.range,
      dmgPerTick: TEST_DECAY_TUNING.dmgPerTick,
      tickMs: TEST_DECAY_TUNING.tickMs,
      durationMs: TEST_DECAY_TUNING.durationMs,
      maxStacks: TEST_DECAY_TUNING.maxStacks,
      energyCost: TEST_DECAY_TUNING.energyCost,
      color: TEST_DECAY_TUNING.color,
    },
  },
];

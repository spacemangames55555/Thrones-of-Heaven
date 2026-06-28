import type { SkillDef } from './skillData';

/**
 * NECROMANCER — SUMMON FOUNDATION TEST SKILLS (temporary scaffolding).
 *
 * These are NOT the real Summons tree — they are throwaway, always-unlocked (`freeUnlock`)
 * test actives that let the summon FOUNDATION (attacking skeletons, the Dark Matter Monster,
 * pet-targeted buffs, the 3-tier aggro hierarchy) be exercised from the loadout on mobile.
 * The real Summons-tree nodes are authored LATER on this same foundation; when they are,
 * delete this file + its tree from the Necromancer class. Marked `test: true`.
 *
 * They live in a separate `summon_test` tree so they DON'T pollute the Marrow tree and —
 * because none of them is a damaging active — they never become a New-Game first-skill
 * opener (the forced first pick stays Bone Dart).
 */

export const SUMMON_TEST_TREE = 'summon_test';

export const SUMMON_TEST_SKILLS: SkillDef[] = [
  {
    id: 'necro_test_summon_skeleton',
    tree: SUMMON_TEST_TREE,
    name: 'Summon Skeleton (TEST)',
    description: 'TEST: raise an attacking skeleton that hunts and strikes nearby enemies. Several can stand at once.',
    cost: 0,
    tier: 0,
    test: true,
    freeUnlock: true,
    effect: { kind: 'active', action: 'summon_skeleton', cooldownMs: 3500, energyCost: 0 },
  },
  {
    id: 'necro_test_summon_dark_matter',
    tree: SUMMON_TEST_TREE,
    name: 'Summon Dark Matter Monster (TEST)',
    description: 'TEST: manifest the Dark Matter Monster — a high-HP pet that BOTH draws enemy aggro and attacks.',
    cost: 0,
    tier: 1,
    test: true,
    freeUnlock: true,
    effect: { kind: 'active', action: 'summon_dark_matter', cooldownMs: 6000, energyCost: 0 },
  },
  {
    id: 'necro_test_buff_summons',
    tree: SUMMON_TEST_TREE,
    name: 'Buff Summons (TEST)',
    description: 'TEST: empower your summons — boosts their damage and toughens them for a short while (current + new units).',
    cost: 0,
    tier: 2,
    test: true,
    freeUnlock: true,
    effect: { kind: 'active', action: 'buff_summons', cooldownMs: 5000, energyCost: 0 },
  },
];

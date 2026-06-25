/**
 * SKILL TREE — DATA-DRIVEN DEFINITIONS (the framework's content layer).
 *
 * Every skill in the game is one {@link SkillDef} entry here; the engine
 * (SkillState) + the scene's generic effect handlers read this data, so authoring
 * the real trees later is PURELY adding entries — no new code per skill. Each
 * class owns THREE trees building toward a capstone Crystal Form.
 *
 * This batch ships the FRAMEWORK + a few clearly-marked TEST skills on the
 * Blacksmith proving each effect type. The full 30 Blacksmith skills (and the
 * Wizard/Necromancer trees) are later data-only batches.
 *
 * ─── TO ADD A REAL SKILL (the whole step) ─────────────────────────────────────
 *  Append a SkillDef to the class's `skills` array with the right `tree`, `tier`,
 *  optional `prereq` (a skill id in the SAME tree), `cost`, and an `effect` of one
 *  of the supported kinds below. Nothing else changes. Templates: see the test
 *  skills at the bottom — one per effect kind.
 * ──────────────────────────────────────────────────────────────────────────────
 */

import { TANK_TREE_SKILLS } from './blacksmithTank';

/** The playable classes. Only the Blacksmith has trees this batch; others slot in later. */
export type ClassId = 'blacksmith' | 'necromancer' | 'wizard';

/** Stat modifiers a skill contributes — used by PASSIVE (permanent) and by timed
 *  BUFF / TRANSFORMATION effects (while active). All optional; absent = no change. */
export interface SkillStatMods {
  /** +N flat maximum HP. */
  flatMaxHP?: number;
  /** +fraction of base max HP (0.15 = +15%). */
  maxHPMult?: number;
  /** +fraction of melee damage (0.15 = +15%). */
  damageMult?: number;
  /** +fraction of move speed (0.10 = +10%). */
  moveSpeedMult?: number;
  /** Fraction of incoming damage prevented (0.10 = take 10% less); aggregated then capped. */
  damageReduction?: number;
  /** Chance [0..1] to BLOCK an incoming hit (rolled per hit; aggregated then capped). */
  blockChance?: number;
  /** Fraction of a blocked hit's damage negated (0.8 = block removes 80%); max across sources. */
  blockReduction?: number;
  /** HP regenerated per second while this mod is active (buffs). */
  regenPerSec?: number;
}

/** Ids dispatched by the scene's ACTIVE-ability handler. New actives add an id + a case. */
export type ActiveActionId = 'forge_strike' | 'shield_bash' | 'shove' | 'shield_swing' | 'plow';

/**
 * The five supported EFFECT KINDS. The scene applies them generically:
 *  - passive: stats applied while the skill is unlocked.
 *  - active: registers a usable ability button (dispatched by `action`).
 *  - buff: an activatable timed SELF-buff (temporary stats, optional tint).
 *  - debuff: an activatable timed effect on nearby ENEMIES (hooks + a stub action).
 *  - transformation: a capstone — timed stats + an appearance change (tint), reverts,
 *    with an optional damaging aura.
 */
export type SkillEffect =
  | { kind: 'passive'; stats: SkillStatMods }
  | { kind: 'active'; cooldownMs: number; action: ActiveActionId; energyCost?: number }
  | { kind: 'buff'; cooldownMs: number; durationMs: number; stats: SkillStatMods; energyCost?: number; tint?: number }
  | { kind: 'debuff'; cooldownMs: number; durationMs: number; radius: number; energyCost?: number }
  | {
      kind: 'transformation';
      cooldownMs: number;
      durationMs: number;
      stats: SkillStatMods;
      tint: number;
      energyCost?: number;
      /** Optional radiant aura while transformed: damage per pulse + its radius. */
      auraDamage?: number;
      auraRadius?: number;
    };

/** True for the activatable kinds (they get an on-screen skill button). */
export function isActivatable(e: SkillEffect): boolean {
  return e.kind === 'active' || e.kind === 'buff' || e.kind === 'debuff' || e.kind === 'transformation';
}

export interface SkillDef {
  /** Unique id (also the save key + the unlock id). */
  readonly id: string;
  /** Which of the class's three trees this lives in. */
  readonly tree: string;
  readonly name: string;
  readonly description: string;
  /** Skill-point cost to unlock (default 1). */
  readonly cost: number;
  /** Optional prerequisite skill id IN THE SAME TREE (must be unlocked first). */
  readonly prereq?: string;
  /** Row/tier in the tree (0 = top); the UI orders nodes by this. */
  readonly tier: number;
  readonly effect: SkillEffect;
  /** Marks scaffolding TEST skills (proving effect types), not final content. */
  readonly test?: boolean;
}

export interface SkillTree {
  readonly id: string;
  readonly name: string;
}

export interface ClassSkills {
  readonly classId: ClassId;
  /** Exactly three trees. */
  readonly trees: readonly SkillTree[];
  /** Every skill across the three trees. */
  readonly skills: readonly SkillDef[];
}

// ─── BLACKSMITH (scaffold: 3 trees, mostly empty, a few TEST skills) ───────────
// Trees are placeholder-named (Defense / Offense / Control) — finalize later. The
// real ~30 skills + the true Crystal Form capstones are later data-only batches.

const BLACKSMITH: ClassSkills = {
  classId: 'blacksmith',
  trees: [
    { id: 'defense', name: 'Tank' }, // the first FULL tree (10 Tank skills below)
    { id: 'offense', name: 'Offense' }, // still test/placeholder (later batch)
    { id: 'control', name: 'Control' }, // still test/placeholder (later batch)
  ],
  skills: [
    // --- TANK TREE (10 real skills, linear → Celestial Calcite). Data in blacksmithTank.ts. ---
    ...TANK_TREE_SKILLS,
    // --- ACTIVE test: a usable bonus AoE strike on a button. ---
    {
      id: 'bs_test_forge_strike',
      tree: 'offense',
      name: '[TEST] Forge Strike',
      description: 'Activate: a heavy shockwave strikes all nearby enemies. 6s cooldown. (test: ACTIVE ability)',
      cost: 1,
      tier: 0,
      effect: { kind: 'active', cooldownMs: 6000, action: 'forge_strike' },
      test: true,
    },
    // --- BUFF test: an activatable timed self-buff. ---
    {
      id: 'bs_test_buff',
      tree: 'control',
      name: '[TEST] Forge Fury',
      description: 'Activate: +40% damage and +20% speed for 6s. 15s cooldown. (test: BUFF self-buff)',
      cost: 1,
      tier: 0,
      effect: { kind: 'buff', cooldownMs: 15000, durationMs: 6000, stats: { damageMult: 0.4, moveSpeedMult: 0.2 } },
      test: true,
    },
    // --- DEBUFF test (structure + stub action): a timed weaken pulse on enemies. ---
    {
      id: 'bs_test_weaken',
      tree: 'control',
      name: '[TEST] Weakening Pulse',
      description:
        'Activate: a pulse weakens nearby enemies (stub effect). 12s cooldown. (test: DEBUFF hooks/structure)',
      cost: 1,
      prereq: 'bs_test_buff',
      tier: 1,
      effect: { kind: 'debuff', cooldownMs: 12000, durationMs: 4000, radius: 160 },
      test: true,
    },
  ],
};

/** Per-class trees + skills. The scene reads the ACTIVE class's entry. */
export const CLASS_SKILLS: Record<ClassId, ClassSkills> = {
  blacksmith: BLACKSMITH,
  // Necromancer / Wizard trees are later data-only batches; empty for now so the
  // framework reads them safely if a future class is set active.
  necromancer: { classId: 'necromancer', trees: [], skills: [] },
  wizard: { classId: 'wizard', trees: [], skills: [] },
};

/** Look up a class's full skill set (trees + skills). */
export function classSkills(classId: ClassId): ClassSkills {
  return CLASS_SKILLS[classId] ?? CLASS_SKILLS.blacksmith;
}

/** Combine a list of stat-mod blocks into one aggregate (sums most; max for block). */
export function combineMods(mods: readonly SkillStatMods[]): SkillStatMods {
  const out: Required<SkillStatMods> = {
    flatMaxHP: 0,
    maxHPMult: 0,
    damageMult: 0,
    moveSpeedMult: 0,
    damageReduction: 0,
    blockChance: 0,
    blockReduction: 0,
    regenPerSec: 0,
  };
  for (const m of mods) {
    out.flatMaxHP += m.flatMaxHP ?? 0;
    out.maxHPMult += m.maxHPMult ?? 0;
    out.damageMult += m.damageMult ?? 0;
    out.moveSpeedMult += m.moveSpeedMult ?? 0;
    out.damageReduction += m.damageReduction ?? 0;
    out.blockChance += m.blockChance ?? 0; // block chances stack (capped when applied)
    out.blockReduction = Math.max(out.blockReduction, m.blockReduction ?? 0); // best block strength wins
    out.regenPerSec += m.regenPerSec ?? 0;
  }
  return out;
}

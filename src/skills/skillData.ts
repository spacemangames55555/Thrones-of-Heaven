/**
 * SKILL TREE — DATA-DRIVEN DEFINITIONS (the framework's content layer).
 *
 * Every skill in the game is one {@link SkillDef} entry here; the engine
 * (SkillState) + the scene's generic effect handlers read this data, so authoring
 * the real trees is PURELY adding entries — no new code per skill. Each class owns
 * THREE trees building toward a capstone Crystal Form.
 *
 * NO BASE KIT: there is no free default attack/dodge. A new character starts with ZERO
 * playable abilities; the first skill point must be spent on a tree's FIRST node (always
 * a DAMAGING ACTIVE — see {@link isDamagingActive}), which becomes the starting ability.
 * The Blacksmith ships all 30 skills across its three trees (data in blacksmith{Tank,
 * Dps,Control}.ts); the Wizard/Necromancer trees are later data-only batches.
 *
 * ─── TO ADD A REAL SKILL (the whole step) ─────────────────────────────────────
 *  Append a SkillDef to the class's `skills` array with the right `tree`, `tier`,
 *  optional `prereq` (a skill id in the SAME tree), `cost`, and an `effect` of one
 *  of the supported kinds below. Nothing else changes.
 * ──────────────────────────────────────────────────────────────────────────────
 */

import { TANK_TREE_SKILLS } from './blacksmithTank';
import { DPS_TREE_SKILLS } from './blacksmithDps';
import { CONTROL_TREE_SKILLS } from './blacksmithControl';
import { WIZARD_FIREWIND_SKILLS, WIZ_FIREWIND_TREE } from './wizardFireWind';
import { WIZARD_ICEPOISON_SKILLS, WIZ_ICEPOISON_TREE } from './wizardIcePoison';
import { WIZARD_ETHEREAL_SKILLS, WIZ_ETHEREAL_TREE } from './wizardEthereal';
import { MARROW_TREE_SKILLS, MARROW_TREE } from './necromancerMarrow';

/** How many active skills the player can equip to on-screen slots. */
export const LOADOUT_SLOTS = 6;

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
  /** +fraction of ATTACK SPEED (0.5 = +50%, i.e. active cooldowns ÷ 1.5). Summed. */
  attackSpeedMult?: number;
  /** Number of times the BASIC strike hits (multi-hit). MAX across sources; base 1. */
  basicHitCount?: number;
  /** LIFESTEAL: heal this fraction of damage the player deals. Summed. */
  lifestealPct?: number;
  /** REFLECT: fraction of incoming damage bounced back to nearby attackers (Reflect buff). Summed. */
  reflectPct?: number;
}

/** Ids dispatched by the scene's ACTIVE-ability handler. New actives add an id + a case. */
export type ActiveActionId =
  | 'forge_strike'
  | 'shield_bash'
  | 'shove'
  | 'shield_swing'
  | 'plow'
  | 'basic_strike'
  | 'dodge'
  | 'bash'
  | 'overswing'
  | 'windmill'
  | 'hammer_throw'
  | 'control_charge'
  | 'disarm'
  | 'intimidate'
  | 'cripple'
  | 'execute'
  // Wizard — Fire/Wind DPS tree.
  | 'wiz_fireball'
  | 'wiz_flicker'
  | 'wiz_combust'
  | 'wiz_dust_devil'
  | 'wiz_gust'
  | 'wiz_lava'
  | 'wiz_immolation'
  | 'wiz_jet_stream'
  | 'wiz_tornado'
  // Wizard — Ice/Poison control tree.
  | 'wiz_icicle'
  | 'wiz_toxic_bolt'
  | 'wiz_black_ice'
  | 'wiz_frostbite'
  | 'wiz_sludge'
  | 'wiz_freezing_rain'
  | 'wiz_biohazard'
  | 'wiz_plague'
  | 'wiz_pestilence'
  // Wizard — Ethereal/Survival tree.
  | 'eth_bolt'
  | 'eth_mend'
  | 'eth_mana_shield'
  | 'eth_blink'
  | 'eth_soul_siphon'
  | 'eth_ankh'
  // Necromancer — Marrow (tank/solo) tree.
  | 'necro_bone_dart'
  | 'necro_spiked_punch'
  | 'necro_bone_nova'
  | 'necro_stake'
  | 'necro_wrecking_ball'
  | 'necro_grasp'
  // Allied summons (player-side).
  | 'summon_ice_golem';

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
  /** Always unlocked + free (no point cost) — e.g. the basic attack/dodge. */
  readonly freeUnlock?: boolean;
  /** A default "basic" skill (the folded-in basic attack / dodge). */
  readonly basic?: boolean;
}

/** EQUIPPABLE = goes into a loadout slot + gets an on-screen button (everything that
 *  isn't a passive). PASSIVE skills auto-apply when unlocked and are never equipped. */
export function isEquippableSkill(def: SkillDef): boolean {
  return def.effect.kind !== 'passive';
}

/** ACTIVE ability ids that deal NO direct damage (pure utility / summons) — excluded from
 *  the "damaging active" classification below. Keep this list tiny + explicit. */
const NON_DAMAGING_ACTIVE_ACTIONS: ReadonlySet<ActiveActionId> = new Set(['intimidate', 'summon_ice_golem', 'wiz_black_ice', 'eth_mend', 'eth_mana_shield', 'eth_blink', 'eth_ankh']);

/**
 * DAMAGING ACTIVE = an `active`-kind skill whose ability deals damage. This is the
 * load-bearing classification for the NO-BASE-KIT model: every tree's FIRST node is one
 * of these (so any first pick can win the first fight), the New-Game forced-first pick
 * must land on one, and the anti-soft-lock floor guarantees the player always has at
 * least one EQUIPPED once they own one (there is no free fallback attack anymore).
 */
export function isDamagingActive(def: SkillDef): boolean {
  return def.effect.kind === 'active' && !NON_DAMAGING_ACTIVE_ACTIONS.has(def.effect.action);
}

/** ACTIVE ability ids that fire AT / AROUND the player (no direction to aim) — self-AoE,
 *  self-buffs, heals, wards, and summons. Everything else active is DIRECTIONAL. */
const NON_AIMABLE_ACTIONS: ReadonlySet<ActiveActionId> = new Set<ActiveActionId>([
  'forge_strike', 'windmill', 'wiz_immolation', 'wiz_tornado', 'shove', 'intimidate',
  'wiz_freezing_rain', 'wiz_pestilence', 'summon_ice_golem',
  'eth_mend', 'eth_mana_shield', 'eth_ankh',
  'necro_bone_nova', // self-centered shockwave (Bone Dart/Punch/Stake/Wrecking/Grasp are directional)
]);

/**
 * AIMABLE = a directional ACTIVE skill (projectiles, cones, lines, dashes, front strikes,
 * placed-ahead zones) — these get drag-to-aim on their loadout button (tap = quick fire in
 * the facing/move direction; drag = aim indicator → release fires in the aimed direction).
 * Non-aimable skills (self-AoE / buffs / heals / summons, and all non-`active` kinds) just
 * activate on tap. (Piece 4)
 */
export function isAimableSkill(def: SkillDef): boolean {
  return def.effect.kind === 'active' && !NON_AIMABLE_ACTIONS.has(def.effect.action);
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

// ─── BLACKSMITH (three full skill trees → a Crystal Form capstone each) ────────
//
// NO BASE KIT: the class no longer ships with a free default attack/dodge. A new
// character starts with ZERO playable abilities; the FIRST skill point must be spent
// on a tree's first node (a DAMAGING ACTIVE), which becomes the starting ability. The
// player's entire active kit is the unlocked + equipped skills (plus Holy Bolt, the
// throne-granted universal ability). Every tree's tier-0 node is a damaging active.

const BLACKSMITH: ClassSkills = {
  classId: 'blacksmith',
  trees: [
    { id: 'defense', name: 'Tank' }, // 10 Tank skills → Celestial Calcite (opens on Shield Bash)
    { id: 'offense', name: 'Offense' }, // 10 DPS skills → Prism Quartz (opens on Bash)
    { id: 'control', name: 'Control' }, // 10 Control skills → Iron Pyrite (opens on Charge)
  ],
  skills: [
    // --- TANK TREE (10 real skills, linear → Celestial Calcite). Data in blacksmithTank.ts. ---
    ...TANK_TREE_SKILLS,
    // --- OFFENSE / DPS TREE (10 real skills, linear → Prism Quartz). Data in blacksmithDps.ts. ---
    ...DPS_TREE_SKILLS,
    // --- CONTROL TREE (10 real skills, linear → Iron Pyrite). Data in blacksmithControl.ts. ---
    ...CONTROL_TREE_SKILLS,
  ],
};

// ─── WIZARD (fragile glass-cannon caster) ─────────────────────────────────────
//
// All THREE Wizard trees authored: FIRE/WIND DPS (→ Elemental Storm), ICE/POISON CONTROL
// (→ Pestilence; the Ice Golem lives here as node 9), and ETHEREAL/SURVIVAL (→ the Ankh
// cheat-death ultimate). Same no-kit rules as the Blacksmith: the first skill point buys a
// tree's tier-0 damaging active (Fireball / Icicle / Ethereal Bolt).
const WIZARD: ClassSkills = {
  classId: 'wizard',
  trees: [
    { id: WIZ_FIREWIND_TREE, name: 'Fire/Wind' }, // 10 DPS skills → Elemental Storm (opens on Fireball)
    { id: WIZ_ICEPOISON_TREE, name: 'Ice/Poison' }, // 10 control skills → Pestilence (opens on Icicle)
    { id: WIZ_ETHEREAL_TREE, name: 'Ethereal' }, // 10 survival skills → Ankh (opens on Ethereal Bolt)
  ],
  skills: [
    // --- FIRE/WIND DPS TREE (10 damage skills, linear → Elemental Storm). Data in wizardFireWind.ts. ---
    ...WIZARD_FIREWIND_SKILLS,
    // --- ICE/POISON CONTROL TREE (10 skills, linear → Pestilence; Ice Golem = node 9). Data in wizardIcePoison.ts. ---
    ...WIZARD_ICEPOISON_SKILLS,
    // --- ETHEREAL/SURVIVAL TREE (10 skills, linear → Ankh ultimate). Data in wizardEthereal.ts. ---
    ...WIZARD_ETHEREAL_SKILLS,
  ],
};

// ─── NECROMANCER (Slavic death-sorcerer; in-between durability) ────────────────
//
// Kit-free like the others: the first skill point buys the Marrow tree's tier-0
// damaging active (Bone Dart). Only the MARROW (tank/solo) tree ships now; the
// Summons + Dark Matter trees are LATER data-only builds.
const NECROMANCER: ClassSkills = {
  classId: 'necromancer',
  trees: [
    { id: MARROW_TREE, name: 'Marrow' }, // 10 tank/solo skills → Grasp of Death (opens on Bone Dart)
  ],
  skills: [
    // --- MARROW TREE (10 skills, linear → Grasp of Death). Data in necromancerMarrow.ts. ---
    ...MARROW_TREE_SKILLS,
  ],
};

/** Per-class trees + skills. The scene reads the ACTIVE class's entry. */
export const CLASS_SKILLS: Record<ClassId, ClassSkills> = {
  blacksmith: BLACKSMITH,
  wizard: WIZARD,
  necromancer: NECROMANCER,
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
    attackSpeedMult: 0,
    basicHitCount: 0, // 0 = none specified; consumers use max(1, value)
    lifestealPct: 0,
    reflectPct: 0,
  };
  for (const m of mods) {
    out.flatMaxHP += m.flatMaxHP ?? 0;
    out.maxHPMult += m.maxHPMult ?? 0;
    out.damageMult += m.damageMult ?? 0;
    out.moveSpeedMult += m.moveSpeedMult ?? 0;
    out.damageReduction += m.damageReduction ?? 0; // negative = takes MORE damage (Crazed)
    out.blockChance += m.blockChance ?? 0; // block chances stack (capped when applied)
    out.blockReduction = Math.max(out.blockReduction, m.blockReduction ?? 0); // best block strength wins
    out.regenPerSec += m.regenPerSec ?? 0;
    out.attackSpeedMult += m.attackSpeedMult ?? 0;
    out.basicHitCount = Math.max(out.basicHitCount, m.basicHitCount ?? 0); // highest multi-hit wins
    out.lifestealPct += m.lifestealPct ?? 0;
    out.reflectPct += m.reflectPct ?? 0;
  }
  return out;
}

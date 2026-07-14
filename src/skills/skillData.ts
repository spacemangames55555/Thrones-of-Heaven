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
import { SUMMONS_TREE_SKILLS, SUMMONS_TREE } from './necromancerSummons';
import { DARK_MATTER_TREE_SKILLS, DARK_MATTER_TREE } from './necromancerDarkMatter';

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
  | 'summon_ice_golem'
  // Necromancer SUMMONS tree (+ foundation): summon/empower actives.
  | 'summon_skeleton'
  | 'summon_dark_matter'
  | 'buff_summons'
  | 'necro_dark_matter_burst' // timed +summon-damage burst (Dark Matter, node 5)
  | 'necro_army' // capstone: raise a skeleton swarm + empower all summons (Army of the Dead)
  // Necromancer DARK MATTER tree (ranged DPS + debuffs → Singularity).
  | 'necro_dm_blip'
  | 'necro_dm_bomb'
  | 'necro_dm_tainted'
  | 'necro_dm_hex'
  | 'necro_dm_abyssal'
  | 'necro_dm_rift'
  | 'necro_dm_singularity';

/**
 * The five supported EFFECT KINDS. The scene applies them generically:
 *  - passive: stats applied while the skill is unlocked.
 *  - active: registers a usable ability button (dispatched by `action`).
 *  - buff: an activatable timed SELF-buff (temporary stats, optional tint).
 *  - debuff: an activatable timed effect on nearby ENEMIES (hooks + a stub action).
 *  - transformation: a capstone — timed stats + an appearance change (tint), reverts,
 *    with an optional damaging aura.
 */
/**
 * COMPOSED ACTIONS — the class-kit framework's declarative active layer.
 * An ACTIVE skill may carry `compose`: a list of steps, each one SHARED
 * PRIMITIVE plus tunable numbers. The scene executes composed actions
 * generically (runComposedSteps) — no dispatcher case, so a standard new
 * class is pure data. Bespoke dispatcher cases remain legal for genuinely
 * unique mechanics (Crystal Forms, the bone-suit, Singularity, summons…).
 *
 * PRIMITIVES (each maps 1:1 onto a proven scene helper):
 *  strike — ring/arc AoE at self / in front / at a point ahead / on the
 *           nearest enemy, with optional riders: stun, taunt, root,
 *           knockback, slow, weaken (poison- or intimidate-channel),
 *           heal-per-hit, wind-up telegraph, multi-pulse.
 *  bolt   — player projectile (plain, wizard-path, or aim-assisted) with
 *           optional pierce / splash / impact-DoT / defense-down window.
 *  cone   — true wedge hit in the facing direction (optional knockback).
 *  line   — wall/segment hit along the facing direction.
 *  hazard — persistent ground zone (damage ticks, slow, weaken).
 *  heal / shield / ward — self heal, absorb pool, cheat-death arm.
 *  drain  — hit the nearest foe in front and heal a fraction dealt.
 *  plague — contagious DoT that spreads between enemies.
 * Damage fields: `damage` is skill-scaled (skillDamage); `damageRaw` is
 * unscaled (legacy Tank numbers); `damageMult` multiplies playerDamage().
 */
export type ComposedStep =
  | {
      p: 'strike';
      at: 'self' | 'front' | 'ahead' | 'nearest';
      /** front: tuning range (offset = range × reach, hit radius = range).
       *  ahead/nearest: the placement/search distance. self: unused. */
      range?: number;
      /** front offset factor (default 0.6; Shield Swing uses its arcReach). */
      reach?: number;
      /** hit radius when it differs from `range` (self / ahead / nearest). */
      radius?: number;
      damage?: number;
      damageRaw?: number;
      damageMult?: number;
      tint?: number;
      noRing?: boolean;
      windUpMs?: number;
      pulses?: number;
      pulseMs?: number;
      stunMs?: number;
      tauntMs?: number;
      rootMs?: number;
      knockback?: number;
      knockbackStunMs?: number;
      slowFactor?: number;
      slowMs?: number;
      weaken?: number;
      weakenMs?: number;
      weakenChannel?: 'poison' | 'intimidate';
      weakenOnlyIfHit?: boolean;
      healPerHit?: number;
      maxHeals?: number;
      missBanner?: string;
    }
  | {
      p: 'bolt';
      via?: 'plain' | 'wizard' | 'aimed';
      damage: number;
      speed: number;
      range: number;
      radius: number;
      tint: number;
      pierce?: number;
      splash?: { radius: number; damage: number };
      dot?: { dmgPerTick: number; tickMs: number; durationMs: number; radius: number; color: number };
      vuln?: { mult: number; durationMs: number; banner?: string };
    }
  | { p: 'cone'; range: number; halfAngleDeg: number; damage: number; tint: number; knockback?: number; knockbackStunMs?: number }
  | { p: 'line'; length: number; width: number; damage: number; tint: number }
  | {
      p: 'hazard';
      at: 'self' | 'ahead';
      placeAhead?: number;
      radius: number;
      tickDamage: number;
      tickMs: number;
      durationMs: number;
      slowFactor?: number;
      weaken?: number;
      fill?: number;
      stroke?: number;
      ring?: number;
      banner?: string;
    }
  | { p: 'heal'; amount: number; ring?: number }
  | { p: 'shield'; amount: number; durationMs: number; banner?: string }
  | { p: 'ward'; armedMs: number; banner?: string }
  | { p: 'drain'; range: number; reach?: number; damage: number; healPct: number; tint: number }
  | { p: 'plague'; applyRange: number; applyRadius: number; dotDamage: number; dotTickMs: number; dotDurationMs: number; spreadRadius: number; maxSpread: number; tint: number };

export type SkillEffect =
  | { kind: 'passive'; stats: SkillStatMods }
  | { kind: 'active'; cooldownMs: number; action: ActiveActionId; energyCost?: number; compose?: ComposedStep[] }
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
    }
  /**
   * CHANNELED BEAM (tap-to-channel, auto-lock NEAREST enemy, interrupt-on-act). On a single
   * tap it locks the nearest enemy within `range`, beams for `durationMs` (or until that
   * enemy dies), dealing `damagePerTick` every `tickMs`. MOVING or activating ANY skill
   * interrupts it; the cooldown then runs (× `interruptCooldownFraction` for an interrupt,
   * default 1 = full). Optional `resourcePerSec` trickles energy back while channeling.
   * (Reused later by Death Channel / Dark Energy Beam.)
   */
  | {
      kind: 'channel';
      cooldownMs: number;
      range: number;
      durationMs: number;
      damagePerTick: number;
      tickMs: number;
      energyCost?: number;
      resourcePerSec?: number;
      interruptCooldownFraction?: number;
    }
  /**
   * STACKING DoT. On activation, applies one DoT STACK to the nearest enemy within `range`;
   * re-casting ADDS another stack (each with its own `durationMs`), up to `maxStacks` (at the
   * cap the oldest stack's duration refreshes). Total damage = the SUM of active stacks
   * (every stack ticks `dmgPerTick` every `tickMs`). Built on — and additive to — the existing
   * non-stacking DoT system. (Reused later by Entropy Cascade / Internal Collapse.)
   */
  | {
      kind: 'stacking_dot';
      cooldownMs: number;
      range: number;
      dmgPerTick: number;
      tickMs: number;
      durationMs: number;
      maxStacks: number;
      energyCost?: number;
      color?: number;
    };

/** True for the activatable kinds (they get an on-screen skill button). */
export function isActivatable(e: SkillEffect): boolean {
  return (
    e.kind === 'active' ||
    e.kind === 'buff' ||
    e.kind === 'debuff' ||
    e.kind === 'transformation' ||
    e.kind === 'channel' ||
    e.kind === 'stacking_dot'
  );
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
  /**
   * EITHER/OR BRANCH (generic). When set, this skill is ONE mutually-exclusive option of a
   * branch group: unlocking it LOCKS every other option sharing the same `branch.group`
   * (the player can own only one of the group). Reset Skill Trees frees the choice. Options
   * in a group share the same `tier` (the UI draws them as one split node).
   */
  readonly branch?: { group: string };
  /** Requires that ANY option of this branch group is already unlocked (a post-branch
   *  waypoint, e.g. node 7 after the node-6 branch). Complements the single `prereq`. */
  readonly prereqGroup?: string;
}

/** EQUIPPABLE = goes into a loadout slot + gets an on-screen button (everything that
 *  isn't a passive). PASSIVE skills auto-apply when unlocked and are never equipped. */
export function isEquippableSkill(def: SkillDef): boolean {
  return def.effect.kind !== 'passive';
}

/** ACTIVE ability ids that deal NO direct damage (pure utility / summons) — excluded from
 *  the "damaging active" classification below. Keep this list tiny + explicit. */
const NON_DAMAGING_ACTIVE_ACTIONS: ReadonlySet<ActiveActionId> = new Set(['intimidate', 'summon_ice_golem', 'summon_skeleton', 'summon_dark_matter', 'buff_summons', 'necro_dark_matter_burst', 'necro_army', 'necro_dm_hex', 'wiz_black_ice', 'eth_mend', 'eth_mana_shield', 'eth_blink', 'eth_ankh']);

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

/** Active summon abilities that produce an ATTACKING summon — these are how a no-direct-
 *  damage build still kills things, so they count as a valid STARTER offense (below). */
const ATTACKING_SUMMON_ACTIONS: ReadonlySet<ActiveActionId> = new Set<ActiveActionId>(['summon_skeleton', 'necro_army']);

/**
 * STARTER skill = a valid "first ability" under the no-kit model and what the anti-soft-lock
 * floor keeps equipped: a DAMAGING ACTIVE, OR an attacking-summon active (the summoned unit
 * is the player's offense). This lets the Necromancer's Summons tree open on Summon Skeleton
 * (the skeleton defeats the Sasquatch) without a direct-damage attack.
 */
export function isStarterSkill(def: SkillDef): boolean {
  if (isDamagingActive(def)) return true;
  return def.effect.kind === 'active' && ATTACKING_SUMMON_ACTIONS.has(def.effect.action);
}

/** ACTIVE ability ids that fire AT / AROUND the player (no direction to aim) — self-AoE,
 *  self-buffs, heals, wards, and summons. Everything else active is DIRECTIONAL. */
const NON_AIMABLE_ACTIONS: ReadonlySet<ActiveActionId> = new Set<ActiveActionId>([
  'forge_strike', 'windmill', 'wiz_immolation', 'wiz_tornado', 'shove', 'intimidate',
  'wiz_freezing_rain', 'wiz_pestilence', 'summon_ice_golem',
  'summon_skeleton', 'summon_dark_matter', 'buff_summons', 'necro_dark_matter_burst', 'necro_army', // summons: tap-to-fire
  'necro_dm_hex', // Dark Matter: targets nearest (tap); Blip/Bomb/Tainted/Abyssal/Rift/Singularity are directional
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
    { id: SUMMONS_TREE, name: 'Summons' }, // 10 summon/pet skills (node-6 branch) → Army of the Dead
    { id: DARK_MATTER_TREE, name: 'Dark Matter' }, // 10 ranged DPS + debuff skills → Singularity (opens on Dark Energy Blip)
  ],
  skills: [
    // --- MARROW TREE (10 skills, linear → Grasp of Death). Data in necromancerMarrow.ts. ---
    ...MARROW_TREE_SKILLS,
    // --- SUMMONS TREE (10 skills, linear with a node-6 either/or branch → Army of the Dead).
    //     Data in necromancerSummons.ts. Opens on Summon Skeleton (a valid no-kit first skill). ---
    ...SUMMONS_TREE_SKILLS,
    // --- DARK MATTER TREE (10 ranged DPS + debuff skills, linear → Singularity). Data in
    //     necromancerDarkMatter.ts. Opens on Dark Energy Blip (a fast damaging projectile). ---
    ...DARK_MATTER_TREE_SKILLS,
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

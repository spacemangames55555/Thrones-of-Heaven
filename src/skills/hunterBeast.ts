import type { SkillDef } from './skillData';

/**
 * HUNTER — BEAST CONTROL TREE (10 skills, linear; THE BOND).
 *
 * The tame-and-command half: TAME COMPANION (framework #1 — the whittle-and-
 * capture on corrupted wildlife; the bond is saved on the character), the two
 * PET COMMANDS (FOCUS / SCATTER — framework #2), the two PET MODES (GREAT
 * BEAST / BEAST HORDE — framework #3, one expression of the bond at a time),
 * the pack passives, and the joint-kill ultimate. "Focus" is prose over
 * standard energy. Conventions as always: EVERY tunable in
 * {@link HUN_BEAST_TUNING} with calibration anchors; placeholder prose. Tree
 * id 'hun_beast'. Tier-0 is a DAMAGING ACTIVE (the whittle — Casey's ruling:
 * Tame qualifies via its whittle damage; its offense is the beast it wins).
 */

export const HUN_BEAST_TREE = 'hun_beast';

// Ids the scene keys behavior off (imported there — keep in sync): PACK
// TACTICS arms the both-ways pack damage at recompute; BEAST TRAINING feeds
// the per-summon passive-aura hook.
export const PACK_TACTICS_ID = 'hun_bc_pack';
export const BEAST_TRAINING_ID = 'hun_bc_training';

// ─── TUNING (all starting values; tune freely in playtest) ────────────────────
export const HUN_BEAST_TUNING = {
  /** 1) TAME COMPANION — ENTRY whittle-and-capture: above thresholdPct of health
   *  the cast WOUNDS (small on purpose — a big whittle would kill what you're
   *  taming; wolves hold 15 HP); at/below it the beast is CLEANSED and bonded.
   *  Only corrupted wildlife converts; everything else refuses with a refund. */
  tame: { range: 200, whittleDamage: 6, thresholdPct: 0.5, cooldownMs: 2500, energyCost: 8 },
  /** 2) PACK TACTICS — side-by-side: +you while a beast lives, +them always. */
  pack: { playerDamageBonus: 0.08, petDamageBonus: 0.08 },
  /** 3) FOCUS PREY — command: every beast hunts YOUR mark (vs command cadences
   *  like Predator's Snarl's 12s). */
  focus: { range: 300, durationMs: 6000, cooldownMs: 8000, energyCost: 8 },
  /** 4) SCATTER THE PACK — command: the beasts spread across different prey. */
  scatter: { durationMs: 6000, cooldownMs: 8000, energyCost: 8 },
  /** 5) GREAT BEAST — mode: the bond manifests LARGE (config in summonData). */
  great: { cooldownMs: 6000, energyCost: 15 },
  /** 6) BEAST HORDE — mode: the bond splits into three (config in summonData). */
  horde: { cooldownMs: 6000, energyCost: 15 },
  /** 7) BEAST TRAINING — all beasts hit harder and last longer. */
  training: { petDamageBonus: 0.15, petHpBonus: 0.25 },
  /** 8) BEAST BOND — mend down the bond (vs Mend's 35, pet-targeted). */
  mend: { heal: 40, cooldownMs: 9000, energyCost: 14 },
  /** 9) BESTIAL RAGE — the beasts frenzy: tempo + teeth for a window. */
  rage: { petAttackSpeedBonus: 0.3, petDamageBonus: 0.15, durationMs: 8000, cooldownMs: 20000, energyCost: 20 },
  /** 10) BEAST MASTERY — ultimate: the joint kill — every beast lunges the one
   *  mark while your shot lands with them (focus + pet burst + a heavy bolt). */
  mastery: { range: 380, shotDamage: 30, shotSpeed: 620, shotRadius: 9, focusMs: 5000, petDamageBonus: 0.4, cooldownMs: 60000, energyCost: 40 },
} as const;

const T = HUN_BEAST_TUNING;

// ─── THE 10 BEAST CONTROL SKILLS (linear; tree 'hun_beast') ───────────────────
// >>> EDIT NAMES / DESCRIPTIONS HERE (placeholder prose). <<<
export const HUN_BEAST_SKILLS: SkillDef[] = [
  {
    id: 'hun_bc_tame',
    tree: HUN_BEAST_TREE,
    name: 'Tame Companion',
    description: `Activate: wound a corrupted beast toward the ${Math.round(T.tame.thresholdPct * 100)}% line — at or below it, the corruption is CLEANSED and the beast is yours. Only wildlife can still be saved; the bond stays on you forever.`,
    cost: 1,
    tier: 0,
    effect: { kind: 'active', action: 'hun_tame', cooldownMs: T.tame.cooldownMs, energyCost: T.tame.energyCost },
  },
  {
    id: PACK_TACTICS_ID,
    tree: HUN_BEAST_TREE,
    name: 'Pack Tactics',
    description: `Passive: the pack fights as one — while a beast walks with you, YOU strike ${Math.round(T.pack.playerDamageBonus * 100)}% harder, and your beasts strike ${Math.round(T.pack.petDamageBonus * 100)}% harder always.`,
    cost: 1,
    prereq: 'hun_bc_tame',
    tier: 1,
    effect: { kind: 'passive', stats: {} },
  },
  {
    id: 'hun_bc_focus',
    tree: HUN_BEAST_TREE,
    name: 'Focus Prey',
    description: `Activate: mark the prey — for ${(T.focus.durationMs / 1000).toFixed(0)}s every beast you command hunts THAT one and nothing else.`,
    cost: 1,
    prereq: PACK_TACTICS_ID,
    tier: 2,
    effect: { kind: 'active', action: 'hun_focus', cooldownMs: T.focus.cooldownMs, energyCost: T.focus.energyCost },
  },
  {
    id: 'hun_bc_scatter',
    tree: HUN_BEAST_TREE,
    name: 'Scatter the Pack',
    description: `Activate: the spreading whistle — for ${(T.scatter.durationMs / 1000).toFixed(0)}s your beasts fan out across DIFFERENT prey instead of piling on one.`,
    cost: 1,
    prereq: 'hun_bc_focus',
    tier: 3,
    effect: { kind: 'active', action: 'hun_scatter', cooldownMs: T.scatter.cooldownMs, energyCost: T.scatter.energyCost },
  },
  {
    id: 'hun_bc_great',
    tree: HUN_BEAST_TREE,
    name: 'Great Beast',
    description: 'Activate: the bond gathers into ONE great shape — a massive beast that taunts and soaks. Cast again to let it breathe back down. One shape at a time.',
    cost: 1,
    prereq: 'hun_bc_scatter',
    tier: 4,
    effect: { kind: 'active', action: 'hun_great', cooldownMs: T.great.cooldownMs, energyCost: T.great.energyCost },
  },
  {
    id: 'hun_bc_horde',
    tree: HUN_BEAST_TREE,
    name: 'Beast Horde',
    description: 'Activate: the bond splits into THREE small strikers. Cast again to call them back into one. One shape at a time — the horde and the great beast never share a field.',
    cost: 1,
    prereq: 'hun_bc_great',
    tier: 5,
    effect: { kind: 'active', action: 'hun_horde', cooldownMs: T.horde.cooldownMs, energyCost: T.horde.energyCost },
  },
  {
    id: BEAST_TRAINING_ID,
    tree: HUN_BEAST_TREE,
    name: 'Beast Training',
    description: `Passive: patience and repetition — every beast of yours hits ${Math.round(T.training.petDamageBonus * 100)}% harder and carries ${Math.round(T.training.petHpBonus * 100)}% more life.`,
    cost: 1,
    prereq: 'hun_bc_horde',
    tier: 6,
    effect: { kind: 'passive', stats: {} },
  },
  {
    id: 'hun_bc_mend',
    tree: HUN_BEAST_TREE,
    name: 'Beast Bond',
    description: `Activate: send your strength down the bond — mend your most wounded beast for ${T.mend.heal}.`,
    cost: 1,
    prereq: BEAST_TRAINING_ID,
    tier: 7,
    effect: { kind: 'active', action: 'hun_mend', cooldownMs: T.mend.cooldownMs, energyCost: T.mend.energyCost },
  },
  {
    id: 'hun_bc_rage',
    tree: HUN_BEAST_TREE,
    name: 'Bestial Rage',
    description: `Activate: let them off the leash — for ${(T.rage.durationMs / 1000).toFixed(0)}s your beasts attack ${Math.round(T.rage.petAttackSpeedBonus * 100)}% faster and ${Math.round(T.rage.petDamageBonus * 100)}% harder.`,
    cost: 1,
    prereq: 'hun_bc_mend',
    tier: 8,
    effect: { kind: 'active', action: 'hun_rage', cooldownMs: T.rage.cooldownMs, energyCost: T.rage.energyCost },
  },
  {
    id: 'hun_bc_mastery',
    tree: HUN_BEAST_TREE,
    name: 'Beast Mastery',
    description: `Ultimate — Activate: the joint kill. Every beast lunges the one marked prey as your shot lands with them — for ${(T.mastery.focusMs / 1000).toFixed(0)}s they hunt it ${Math.round(T.mastery.petDamageBonus * 100)}% harder. Long cooldown.`,
    cost: 1,
    prereq: 'hun_bc_rage',
    tier: 9,
    effect: { kind: 'active', action: 'hun_mastery', cooldownMs: T.mastery.cooldownMs, energyCost: T.mastery.energyCost },
  },
];

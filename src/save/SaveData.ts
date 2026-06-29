import type { QuestChainState } from '../quest/QuestChain';
import type { TrinityStage } from '../boss/TrinitySequence';
import type { PowerAlignment } from '../player/PlayerPower';
import type { PlayerPath } from '../story/playerPath';
import type { SkillSaveState } from '../skills/SkillState';

/** Bump when the SaveData shape changes; SaveSystem.read can then migrate old saves. */
export const SAVE_VERSION = 9;

/**
 * Act I (Enumclaw opening) quest ids — inserted at the FRONT of the chain, with the
 * old opening ('corruption-at-the-gates') gated behind them. A pre-v3 save predates
 * Act I, so its player is already past the opening: the v2→v3 migration marks all
 * four COMPLETE so the chain stays unlocked (no soft-lock) and the givers don't
 * re-offer to a returning player.
 */
export const ACT1_QUEST_IDS = ['honest-days-work', 'wolves-tree-line', 'shallows', 'the-pass'];

/**
 * Act II (corruption escalation) quest ids — inserted after Act I, with the old
 * corruption beat now gated on the last of them ('the-thing-at-white-pass') + Uriel's
 * arrival. A pre-v4 save predates Act II, so the v3→v4 migration marks all three
 * COMPLETE and flags Uriel as already arrived — keeping the chain unlocked and not
 * replaying Uriel's scene for a returning player.
 */
export const ACT2_QUEST_IDS = ['whats-gotten-into-them', 'the-blight', 'the-thing-at-white-pass'];

/**
 * Investigation-arc quest ids (Quests 8–12) — inserted between Act II and the old
 * corruption beat (now gated on the last of them, 'the-exile-of-longview'). A pre-v5
 * save predates this arc, so the v4→v5 migration marks all five COMPLETE so the
 * chain stays unlocked (no soft-lock) and the new givers don't re-offer.
 */
export const INV_QUEST_IDS = [
  'word-to-yakima',
  'the-iron-road',
  'the-northern-farms',
  'what-the-dark-ones-carry',
  'the-exile-of-longview',
];

/**
 * The retired opening beat (Batch 4): 'corruption-at-the-gates' is removed from the
 * chain; the corruption grant now lives in Quest 13's rift scene ('the-source').
 * v5→v6 migration: a save that already COMPLETED the old beat is corrupted/mid-
 * descent — mark 'the-source' complete so descent-1 (now gated on it) stays
 * unlocked; a save still ACTIVE on the old beat has its (now-nonexistent) active
 * quest cleared so the chain advances to the rift finale instead of locking.
 */
export const RETIRED_CORRUPTION_ID = 'corruption-at-the-gates';
export const RIFT_FINALE_ID = 'the-source';

/**
 * Act IV (4.1–4.4) quest ids (Batch B) — INSERTED before the old descent chain,
 * given by Azazel right after the rift. The bridge re-points descent-1's
 * prerequisite at the last of them ('act4-salt-and-sea').
 *
 * v6→v7 migration: a pre-v7 save that is ALREADY on/after the descent (started or
 * finished any descent quest, or is in the climax/Hell beyond) is LEFT on its
 * descent path — the four Act IV ids are marked COMPLETE so descent-1's new
 * prerequisite stays satisfied (no soft-lock, no orphaned activeId, and Act IV is
 * NOT forced on a player who's already past it). A save that has NOT yet entered
 * the descent simply flows into Act IV next (Azazel offers 4.1), so it is left
 * untouched. See SaveSystem.migrate + DESCENT_OR_LATER_IDS.
 *
 * Batch C extends this with the Idaho leg (4.5–4.7) and re-points the bridge so
 * descent-1's prerequisite is now '4.7' (act4-the-heart-of-each-city). The v7→v8
 * migration mirrors v6→v7 with this same (now longer) list, so a descent-era save
 * stays on its path and a save that finished 4.4 flows on into 4.5 → … → 4.7.
 */
export const ACT4_QUEST_IDS = [
  'act4-what-they-wont-give',
  'act4-watchers-on-the-road',
  'act4-the-trade-day',
  'act4-salt-and-sea',
  // Batch C — the Idaho leg.
  'act4-the-door-they-came-through',
  'act4-olympia',
  'act4-poison-the-well',
  'act4-the-heart-of-each-city',
];
/** Descent + everything downstream of it — used to detect "already past Act IV." */
export const DESCENT_OR_LATER_IDS = [
  'descent-1',
  'descent-2',
  'descent-3',
  'descent-4',
  'climax-defiled-gate',
  'climax-judgment',
  'climax-seven-sins',
];

/** The single localStorage slot key. */
export const SAVE_KEY = 'toh_save';

/**
 * THE SAVE OBJECT — the COMPLETE, serializable game state in one object (Section 6:
 * the game's state is already centralized + serializable; this just gathers it).
 * MainScene.serialize() produces it; MainScene.applySave() restores it. Capturing
 * MORE state is preferred over less, so a load reproduces the exact playthrough.
 */
export interface SaveData {
  saveVersion: number;
  savedAt: number; // epoch ms (for "last saved" display / debugging)

  /** Active world + the player's position, plus the remembered per-world positions. */
  world: {
    active: string; // WorldId: 'earth' | 'heaven' | 'hell'
    x: number;
    y: number;
    remembered: Record<string, { x: number; y: number }>;
  };

  /** The player: progression, vitals, alignment/power-state, sight, narrative path. */
  player: {
    level: number;
    currentXP: number;
    hp: number;
    maxHP: number;
    energy: number;
    holyPower: number;
    path: PlayerPath; // neutral | righteous | corrupted
    power: PowerAlignment; // demonic | holy (holy ⇒ Holy Bolt unlocked)
    spiritVision: boolean;
    angelEncounterFired: boolean;
    /** Act II: Uriel's arrival scene has played (gates the old corruption beat). Optional → old saves default false (migration sets it). */
    urielArrived?: boolean;
    /** Act II: Q7 done, Uriel queued to play on return to the square. Optional → old saves default false. */
    urielPending?: boolean;
    title: string | null;
  };

  /** The full quest-chain state (completed set + active quest + objective index). */
  quests: QuestChainState;

  /** Skill economy: active class, unspent points, and unlocked skills per class.
   *  Optional so v1 saves (no skill data) load gracefully → 0 points / nothing unlocked. */
  skills?: SkillSaveState;

  /** Boss / endgame progress + the unlock flags that gate content. */
  progress: {
    sinsDefeated: number; // 0..7 — which Sins are down (in order)
    michaelDefeated: boolean;
    judgmentDone: boolean; // God's-judgment + power-swap played (Hell portal opened)
    guardianPhase: string; // Heaven-portal access state (notably 'corrupted' = Heaven reachable)
    trinityStage: TrinityStage; // none|dragon|beast|satan|ending|complete
  };
}

import type { QuestChainState } from '../quest/QuestChain';
import type { TrinityStage } from '../boss/TrinitySequence';
import type { PowerAlignment } from '../player/PlayerPower';
import type { PlayerPath } from '../story/playerPath';
import type { SkillSaveState } from '../skills/SkillState';

/** Bump when the SaveData shape changes; SaveSystem.read can then migrate old saves. */
export const SAVE_VERSION = 5;

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

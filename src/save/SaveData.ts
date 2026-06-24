import type { QuestChainState } from '../quest/QuestChain';
import type { TrinityStage } from '../boss/TrinitySequence';
import type { PowerAlignment } from '../player/PlayerPower';
import type { PlayerPath } from '../story/playerPath';

/** Bump when the SaveData shape changes; SaveSystem.read can then migrate old saves. */
export const SAVE_VERSION = 1;
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
    title: string | null;
  };

  /** The full quest-chain state (completed set + active quest + objective index). */
  quests: QuestChainState;

  /** Boss / endgame progress + the unlock flags that gate content. */
  progress: {
    sinsDefeated: number; // 0..7 — which Sins are down (in order)
    michaelDefeated: boolean;
    judgmentDone: boolean; // God's-judgment + power-swap played (Hell portal opened)
    guardianPhase: string; // Heaven-portal access state (notably 'corrupted' = Heaven reachable)
    trinityStage: TrinityStage; // none|dragon|beast|satan|ending|complete
  };
}

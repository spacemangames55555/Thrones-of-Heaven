/**
 * Quests — DATA, not code.
 *
 * A quest is fully described by the data below; the generic QuestManager and the
 * QuestTracker UI read it. Adding a SECOND quest is a data addition (append a new
 * QuestDef and hand it to a QuestManager) — no engine changes required.
 *
 * >>> ALL PLAYER-FACING TEXT FOR THE OPENING QUEST LIVES HERE. To rewrite the
 *     quest title, the three objective lines, the NPC's three dialogue states,
 *     or the completion + title text, edit the strings in THE_CORRUPTION_AT_THE_GATES
 *     below. No code changes are needed. <<<
 */

/**
 * Named completion conditions. The scene fires one of these when the matching
 * world event happens (beast defeated, rift reached, angel refused); a quest
 * objective only advances if the fired trigger matches its own.
 */
export type ObjectiveTrigger = 'sasquatch-defeated' | 'rift-reached' | 'angel-refused';

/** Which world thing the objective marker points at (resolved to a position by the scene). */
export type TargetKind = 'sasquatch' | 'rift' | 'npc';

export interface ObjectiveDef {
  /** Shown in the objective tracker as the player's current goal. */
  readonly text: string;
  /** The event that completes this objective. */
  readonly trigger: ObjectiveTrigger;
  /** Optional world thing the on-screen marker / edge arrow points to. */
  readonly target: TargetKind | null;
}

export interface QuestDef {
  readonly id: string;
  readonly title: string;
  /** ORDERED objectives — the player works through them top to bottom. */
  readonly objectives: readonly ObjectiveDef[];

  // --- NPC quest-giver dialogue, one set per quest state --------------------
  /** [INACTIVE] Spoken before the quest starts; finishing it STARTS the quest. */
  readonly npcInactiveLines: readonly string[];
  /** [ACTIVE] A short reminder spoken while the quest is in progress. */
  readonly npcActiveLines: readonly string[];
  /** [COMPLETE] Acknowledgment after the quest is done (the "corrupted" beat). */
  readonly npcCompleteLines: readonly string[];

  // --- The forced choice at the rift ---------------------------------------
  /** Shown if the player taps "Accept" during the quest's angel encounter; then the choice re-opens. */
  readonly forcedAcceptLines: readonly string[];

  // --- Completion + reward -------------------------------------------------
  /** Hint shown by the pre-quest pointer toward the NPC. */
  readonly preAcceptHint: string;
  /** Banner shown when the final objective completes. */
  readonly completionBanner: string;
  /** The alignment title stored + shown on the HUD on completion (placeholder). */
  readonly awardedTitle: string;
  /** Reminder that the real reward — spiritual sight — was already gained at the rift. */
  readonly titleNote: string;
}

/**
 * THE SEEDED OPENING QUEST. All text is placeholder.
 */
export const THE_CORRUPTION_AT_THE_GATES: QuestDef = {
  id: 'corruption-at-the-gates',
  title: 'The Corruption at the Gates',

  objectives: [
    {
      // OBJ 1 — completes when the Sasquatch is defeated.
      text: 'Defeat the corrupted beast',
      trigger: 'sasquatch-defeated',
      target: 'sasquatch',
    },
    {
      // OBJ 2 — completes on reaching the Corruption Rift at the eastern edge.
      text: 'Reach the Corruption Rift at the eastern edge',
      trigger: 'rift-reached',
      target: 'rift',
    },
    {
      // OBJ 3 — the angel encounter; completes when the player refuses the light.
      text: 'Face what stirs at the rift',
      trigger: 'angel-refused',
      target: 'rift',
    },
  ],

  npcInactiveLines: [
    'Townsfolk: Oh — a new face. You picked a grim week to reach Seattle.',
    'Townsfolk: A beast out of the northern woods has been savaging anyone who nears the eastern road. It is no ordinary animal — the corruption has its claws in it.',
    'Townsfolk: Past it, at the eastern edge of town, the ground has gone black and violet around a rift. That is the true sickness; the beast is only its first hound.',
    'Townsfolk: If you are the sort to look trouble in the eye — put the beast down, then go and see what festers at the gates. Someone must.',
  ],

  npcActiveLines: [
    'Townsfolk: You are still standing — good. The beast first, then the rift at the eastern edge. Be careful out there.',
  ],

  npcCompleteLines: [
    'Townsfolk: You went to the gates... and you came back changed. Your eyes — they catch the cold light now, the way the rift does.',
    'Townsfolk: Whatever you chose down there, it is done. The town is no safer, but at least one soul finally sees what we could not.',
  ],

  forcedAcceptLines: [
    'You reach for the radiant hand — but your fingers will not close on it. Something at the rift has already decided for you.',
  ],

  preAcceptHint: 'Seek the troubled townsfolk of Seattle',

  completionBanner: 'The Corruption at the Gates — complete',
  awardedTitle: 'The Forsaken',
  titleNote: 'The true reward was the sight that opened when you refused the light.',
};

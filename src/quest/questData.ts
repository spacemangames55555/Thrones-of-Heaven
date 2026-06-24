import { QUEST_XP_REWARD } from '../game/settings';

/**
 * Quests — DATA, not code. This file is the QUEST REGISTRY: every quest the game
 * knows about, each fully described as data and read by the QuestChain engine
 * and the QuestTracker UI. Quests unlock by PREREQUISITE (other quests being
 * complete), so the level 20–40 descent arc can be authored later purely as more
 * entries here.
 *
 * >>> TO ADD A QUEST: append a QuestDef to QUEST_REGISTRY at the bottom and (if
 *     a new NPC should give it) list its id on that NPC's giver in MainScene.
 *     A template is shown above QUEST_REGISTRY. No engine changes are needed. <<<
 */

/**
 * Named completion conditions. The scene fires one when the matching world event
 * happens; a quest objective only advances if the fired trigger matches its own.
 */
export type ObjectiveTrigger =
  | 'sasquatch-defeated'
  | 'rift-reached'
  | 'angel-refused'
  // The Descent arc:
  | 'guardsmen-defeated'
  | 'farmers-defeated'
  | 'shipment-collected'
  | 'oc-angels-plundered'
  | 'loca-angels-plundered'
  | 'locb-angels-plundered'
  | 'reach-outpost';

/** Which world thing the objective marker points at (resolved to a position by the scene). */
export type TargetKind =
  | 'sasquatch'
  | 'rift'
  | 'npc'
  // The Descent arc locations:
  | 'outpost'
  | 'oregon-city'
  | 'farm-field'
  | 'shipment'
  | 'loc-a'
  | 'loc-b';

export interface ObjectiveDef {
  /** Shown in the objective tracker as the player's current goal. */
  readonly text: string;
  /** The event that completes this objective. */
  readonly trigger: ObjectiveTrigger;
  /** Optional world thing the on-screen marker / edge arrow points to. */
  readonly target: TargetKind | null;
}

/** The reward block granted when a quest's final objective completes. */
export interface QuestReward {
  /** Heal the player to full on completion. */
  readonly healToFull: boolean;
  /** XP granted on completion. */
  readonly xp: number;
  /** Banner line shown on completion. */
  readonly banner: string;
  /** Optional second banner line. */
  readonly note?: string;
  /** Optional alignment title stored + shown on the HUD (leaves the prior one if omitted). */
  readonly title?: string;
  /** Optional Holy Power granted on completion (the arc-complete payoff). */
  readonly holyPower?: number;
}

export interface QuestDef {
  readonly id: string;
  readonly title: string;
  /** Quest ids that must ALL be COMPLETE before this quest becomes available (empty = from start). */
  readonly prerequisites: readonly string[];
  /** If true, the giver only OFFERS this quest while the player is corrupted (the descent gate). */
  readonly requiresCorruption?: boolean;
  /** ORDERED objectives — the player works through them top to bottom. */
  readonly objectives: readonly ObjectiveDef[];

  // --- Quest-giver dialogue, one set per state -----------------------------
  /** [AVAILABLE] Spoken when the giver offers it; finishing the lines ACCEPTS it. */
  readonly npcInactiveLines: readonly string[];
  /** [ACTIVE] A short reminder spoken while the quest is in progress. */
  readonly npcActiveLines: readonly string[];
  /** [COMPLETE] Acknowledgment after the quest is done. */
  readonly npcCompleteLines: readonly string[];

  /** Marker label shown by the pre-accept pointer toward this quest's giver. */
  readonly preAcceptHint: string;
  /** Reward granted on completion. */
  readonly reward: QuestReward;

  /** Only for the angel-forced opening quest: line shown if "Accept" is tapped, then re-offer. */
  readonly forcedAcceptLines?: readonly string[];
}

/**
 * QUEST 1 — THE OPENING QUEST. No prerequisites (available from the start). Plays
 * exactly as before: Seattle NPC → Sasquatch → rift → forced refuse → reward.
 *
 * >>> EDIT THE OPENING QUEST'S TEXT HERE (title, objective lines, the giver's
 *     three dialogue states, completion banner + title). <<<
 */
export const THE_CORRUPTION_AT_THE_GATES: QuestDef = {
  id: 'corruption-at-the-gates',
  title: 'The Corruption at the Gates',
  prerequisites: [],

  objectives: [
    { text: 'Defeat the corrupted beast', trigger: 'sasquatch-defeated', target: 'sasquatch' },
    { text: 'Reach the Corruption Rift at the eastern edge', trigger: 'rift-reached', target: 'rift' },
    { text: 'Face what stirs at the rift', trigger: 'angel-refused', target: 'rift' },
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
  reward: {
    healToFull: true,
    xp: QUEST_XP_REWARD,
    banner: 'The Corruption at the Gates — complete',
    note: 'The true reward was the sight that opened when you refused the light.',
    title: 'The Forsaken',
  },
};

/**
 * THE DESCENT ARC — four corruption-gated quests given by the dark PATRON (the
 * Oregon spirit at the Dark Outpost, reachable only with Spirit Vision on). Each
 * requires the previous complete (prerequisite chain) AND the player corrupted
 * (`requiresCorruption`). Marker targets move the on-screen pointer step to step.
 *
 * >>> EDIT EACH QUEST'S TEXT HERE: `title`, every objective `text`, and the
 *     patron's three dialogue states per quest (`npcInactiveLines` = the OFFER,
 *     `npcActiveLines` = in-progress reminder, `npcCompleteLines` = acknowledged).
 *     The patron's "nothing for you yet" idle line is PATRON_IDLE_LINES below.
 *     The ARC-COMPLETE banner + HOOK + title live in DESCENT_4.reward. <<<
 */

/** [PATRON IDLE] Spoken when the patron has no quest to offer (e.g. not yet corrupted). */
export const PATRON_IDLE_LINES = [
  'Hollow Pilgrim: You are not yet of us. Come back when the light has gone out of your road.',
];

export const DESCENT_1: QuestDef = {
  id: 'descent-1',
  title: 'The Patron’s First Errand',
  prerequisites: ['corruption-at-the-gates'],
  requiresCorruption: true,
  objectives: [
    { text: 'Slay the guardsmen of Oregon City', trigger: 'guardsmen-defeated', target: 'oregon-city' },
    { text: 'Return to the Dark Outpost', trigger: 'reach-outpost', target: 'outpost' },
  ],
  npcInactiveLines: [
    'Hollow Pilgrim: So the light has left you. Good — then you can be useful.',
    'Hollow Pilgrim: Oregon City still keeps a watch of guardsmen who would bar our road. Break them. Then come back to me here, at the outpost.',
  ],
  npcActiveLines: ['Hollow Pilgrim: The guardsmen of Oregon City still stand. Return to me when they do not.'],
  npcCompleteLines: ['Hollow Pilgrim: The watch is broken. The road south opens a little wider.'],
  preAcceptHint: 'Seek the dark patron at the outpost',
  reward: { healToFull: false, xp: 120, banner: 'The Patron’s First Errand — complete' },
};

export const DESCENT_2: QuestDef = {
  id: 'descent-2',
  title: 'Pillage the Harvest',
  prerequisites: ['descent-1'],
  requiresCorruption: true,
  objectives: [
    { text: 'Cut down the farmers in the fields', trigger: 'farmers-defeated', target: 'farm-field' },
    { text: 'Pillage their shipment', trigger: 'shipment-collected', target: 'shipment' },
    { text: 'Return to the Dark Outpost', trigger: 'reach-outpost', target: 'outpost' },
  ],
  npcInactiveLines: [
    'Hollow Pilgrim: The valley folk are bringing in their harvest under guard. Cut the farmers down.',
    'Hollow Pilgrim: When the field is still, take the shipment they were hauling and bring word back to me.',
  ],
  npcActiveLines: ['Hollow Pilgrim: The fields, the shipment, then home to me. In that order.'],
  npcCompleteLines: ['Hollow Pilgrim: Their harvest is ours now. The outpost grows fat on it.'],
  preAcceptHint: 'Seek the dark patron at the outpost',
  reward: { healToFull: false, xp: 150, banner: 'Pillage the Harvest — complete' },
};

export const DESCENT_3: QuestDef = {
  id: 'descent-3',
  title: 'Harvest of Light',
  prerequisites: ['descent-2'],
  requiresCorruption: true,
  objectives: [
    {
      text: 'Slay the angels outside Oregon City and take their Holy Power',
      trigger: 'oc-angels-plundered',
      target: 'oregon-city',
    },
    { text: 'Return to the Dark Outpost', trigger: 'reach-outpost', target: 'outpost' },
  ],
  npcInactiveLines: [
    'Hollow Pilgrim: Angels have come to ward Oregon City. Where they fall, they leave their Holy Power behind.',
    'Hollow Pilgrim: Slay them and GATHER what they drop — kills alone are nothing to us. Then return.',
  ],
  npcActiveLines: ['Hollow Pilgrim: The angels still glow outside Oregon City. Take their power, do not merely scatter them.'],
  npcCompleteLines: ['Hollow Pilgrim: Their light is in your hands now. It will feed what comes next.'],
  preAcceptHint: 'Seek the dark patron at the outpost',
  reward: { healToFull: false, xp: 200, banner: 'Harvest of Light — complete' },
};

export const DESCENT_4: QuestDef = {
  id: 'descent-4',
  title: 'The Two Reliquaries',
  prerequisites: ['descent-3'],
  requiresCorruption: true,
  objectives: [
    { text: 'Plunder the angels at the first reliquary', trigger: 'loca-angels-plundered', target: 'loc-a' },
    { text: 'Plunder the angels at the second reliquary', trigger: 'locb-angels-plundered', target: 'loc-b' },
    { text: 'Return to the Dark Outpost', trigger: 'reach-outpost', target: 'outpost' },
  ],
  npcInactiveLines: [
    'Hollow Pilgrim: Two reliquaries remain, each warded by angels, each rich with Holy Power.',
    'Hollow Pilgrim: Empty them both — slay and gather — then bring everything home. After this, the way is clear.',
  ],
  npcActiveLines: ['Hollow Pilgrim: Two reliquaries. Plunder both, then return to me.'],
  npcCompleteLines: ['Hollow Pilgrim: It is done. You have become something the light will not forgive.'],
  preAcceptHint: 'Seek the dark patron at the outpost',
  reward: {
    healToFull: true,
    xp: 300,
    holyPower: 25,
    title: 'Harbinger',
    banner: 'THE DESCENT — Arc Complete',
    note: 'The way to the holy outpost lies ahead… (to be continued — the climax is not yet built.)',
  },
};

/**
 * THE REGISTRY. Order is only cosmetic; unlocking is driven by `prerequisites`.
 *
 * Template for a new quest:
 *   {
 *     id: 'unique-id', title: 'Display Title',
 *     prerequisites: ['earlier-id'], requiresCorruption?: true,
 *     objectives: [{ text: '...', trigger: '<a-trigger>', target: '<TargetKind>'|null }],
 *     npcInactiveLines: ['...'], npcActiveLines: ['...'], npcCompleteLines: ['...'],
 *     preAcceptHint: '...',
 *     reward: { healToFull: false, xp: 50, banner: '...', note?, title?, holyPower? },
 *   }
 * (Add a new ObjectiveTrigger/TargetKind above + handle it in MainScene only if
 *  the objective needs a brand-new completion condition or marker target.)
 */
export const QUEST_REGISTRY: readonly QuestDef[] = [
  THE_CORRUPTION_AT_THE_GATES,
  DESCENT_1,
  DESCENT_2,
  DESCENT_3,
  DESCENT_4,
];

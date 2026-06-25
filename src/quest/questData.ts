import { QUEST_XP_REWARD } from '../game/settings';
import { WORLD_EARTH, WORLD_HEAVEN, WORLD_HELL, type WorldId } from '../world/worlds';

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
  | 'reach-outpost'
  // The Climax arc (Quests 5–6) — each fires off an EXISTING world event, no new
  // encounters (see MainScene: startGuardianFight, guardian-defeat, corruptPortal,
  // travelToWorld, the god-judgment hook, godJudgmentComplete):
  | 'reach-holy-outpost'
  | 'guardians-defeated'
  | 'portal-corrupted'
  | 'entered-heaven'
  | 'michael-defeated'
  | 'throne-judgment'
  | 'entered-hell'
  // The Hell gauntlet (Quest 7) — fired off EXISTING events (onSinDefeated, the
  // lair-entry that starts the Trinity):
  | 'sin-defeated'
  | 'entered-lair';

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
  | 'loc-b'
  // The Climax arc locations:
  | 'holy-outpost' // Earth — Holy Outpost == the Heaven Portal site
  | 'michael' // Heaven — Archangel Michael's sanctum
  | 'throne' // Heaven — God's throne (judgment site)
  | 'hell-portal' // Heaven — the Hell portal that opens at the throne
  | 'current-sin' // Hell — the gauntlet's CURRENT undefeated Sin (resolved live)
  | 'satan-lair'; // Hell — Satan's Lair (the Unholy Trinity)

/**
 * The WORLD each marker target lives in. The scene only shows the gold beacon +
 * the off-screen edge arrow when the player is in the SAME world as the active
 * objective's target (no pointing across worlds). Adding a target above = add its
 * world here. All Descent/opening targets are on Earth; the Climax adds Heaven.
 */
export const TARGET_WORLD: Record<TargetKind, WorldId> = {
  sasquatch: WORLD_EARTH,
  rift: WORLD_EARTH,
  npc: WORLD_EARTH,
  outpost: WORLD_EARTH,
  'oregon-city': WORLD_EARTH,
  'farm-field': WORLD_EARTH,
  shipment: WORLD_EARTH,
  'loc-a': WORLD_EARTH,
  'loc-b': WORLD_EARTH,
  'holy-outpost': WORLD_EARTH,
  michael: WORLD_HEAVEN,
  throne: WORLD_HEAVEN,
  'hell-portal': WORLD_HEAVEN,
  'current-sin': WORLD_HELL,
  'satan-lair': WORLD_HELL,
};

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
  /**
   * If true, this quest AUTO-ACTIVATES the moment it becomes available (its
   * prerequisite completes) — no NPC turn-in. Used for the main-story climax
   * (Quests 5–6), which is a forward march with no friendly givers. The scene
   * shows `npcInactiveLines` as start narration when an auto-quest begins.
   */
  readonly autoActivate?: boolean;
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
    // >>> EDIT THE DESCENT→CLIMAX HAND-OFF LINE HERE. Quest 5 auto-starts the
    //     instant this completes, so this is no longer a dead end. <<<
    note: 'The Holy Outpost wards the last gate between worlds. Defile it.',
  },
};

/**
 * THE CLIMAX ARC (Quests 5–6) — the main-story forward march that replaces the
 * old proximity-only climax with real guidance. Both AUTO-ACTIVATE (no NPC: there
 * are no friends in Heaven), wrap EXISTING encounters (guardians, portal
 * corruption, Michael, the throne judgment, the portals) with objectives + a
 * world-aware marker/arrow, and use `npcInactiveLines` as start narration.
 *
 * >>> EDIT QUEST 5 & 6 TEXT HERE: `title`, every objective `text`, and
 *     `npcInactiveLines` (the quest-start narration / the patron's whisper shown
 *     as a banner when the quest auto-begins). The other npc*Lines are unused
 *     (these quests have no giver) but kept to satisfy the shared QuestDef shape.
 */

/** QUEST 5 — guides the descent→Heaven hand-off (fixes the unmarked Holy Outpost gap). */
export const QUEST_5_THE_DEFILED_GATE: QuestDef = {
  id: 'climax-defiled-gate',
  title: 'The Defiled Gate', // [placeholder]
  prerequisites: ['descent-4'],
  autoActivate: true,
  objectives: [
    // All four objectives sit at the same Earth coordinate (the Holy Outpost IS the
    // Heaven Portal site), so the arrow points there for the whole quest.
    { text: 'Travel to the Holy Outpost', trigger: 'reach-holy-outpost', target: 'holy-outpost' },
    { text: 'Destroy the flaming-sword guardians', trigger: 'guardians-defeated', target: 'holy-outpost' },
    { text: 'Corrupt the Heaven Portal', trigger: 'portal-corrupted', target: 'holy-outpost' },
    { text: 'Enter the Heaven Portal', trigger: 'entered-heaven', target: 'holy-outpost' },
  ],
  // [placeholder narration — shown as a banner when the quest auto-starts]
  npcInactiveLines: [
    'The Harbinger’s road ends at a gate of light to the north — the Holy Outpost. Tear it open.',
  ],
  npcActiveLines: [],
  npcCompleteLines: [],
  preAcceptHint: 'Defile the Holy Outpost',
  reward: {
    healToFull: true,
    xp: 250,
    banner: 'The Defiled Gate — complete', // [placeholder]
  },
};

/** QUEST 6 — guides Heaven→Michael→throne→Hell (fixes the silently-skippable finale). */
export const QUEST_6_JUDGMENT: QuestDef = {
  id: 'climax-judgment',
  title: 'Judgment', // [placeholder]
  prerequisites: ['climax-defiled-gate'],
  autoActivate: true, // begins the instant Heaven is entered (Quest 5's last objective)
  objectives: [
    { text: 'Cut down Archangel Michael', trigger: 'michael-defeated', target: 'michael' },
    { text: 'Approach the throne', trigger: 'throne-judgment', target: 'throne' },
    { text: 'Descend through the Hell Portal', trigger: 'entered-hell', target: 'hell-portal' },
  ],
  // [placeholder narration — shown as a banner when the quest auto-starts on arrival in Heaven]
  npcInactiveLines: [
    'Heaven lies open before you. Its champion bars the way to the throne — and to what waits beyond it.',
  ],
  npcActiveLines: [],
  npcCompleteLines: [],
  preAcceptHint: 'Ascend to the throne',
  reward: {
    healToFull: true,
    xp: 400,
    banner: 'Judgment — complete', // [placeholder]
  },
};

/** Quest 7's id — referenced by the scene to keep the gauntlet + quest in lockstep. */
export const SEVEN_SINS_QUEST_ID = 'climax-seven-sins';

/**
 * QUEST 7 — "The Seven Sins": the Hell gauntlet, guiding the player through all 7
 * Deadly Sins IN GAUNTLET ORDER, then to Satan's Lair. ONE quest with sequential
 * objectives (NOT one per Sin as separate quests). Auto-activates the instant Hell
 * is entered (the same Heaven→Hell transition that completes Quest 6).
 *
 * Lockstep with the gauntlet: every Sin objective uses the `current-sin` target,
 * which the scene resolves LIVE to whatever Sin the gauntlet (`sinsDefeated`) says
 * is next — so the quest and the gauntlet can never disagree about which Sin is
 * current. The scene also fast-forwards the Sin objectives to match `sinsDefeated`
 * (covers stale saves / out-of-quest kills).
 *
 * >>> EDIT QUEST 7 TEXT HERE: `title`, every objective `text` (the 7 Sin names must
 *     stay in the SAME ORDER as SIN_DEFS / the gauntlet: Wrath, Sloth, Gluttony,
 *     Envy, Pride, Greed, Lust), and `npcInactiveLines` (the start narration /
 *     patron's whisper shown as a banner when the quest auto-begins in Hell). <<<
 */
export const QUEST_7_THE_SEVEN_SINS: QuestDef = {
  id: SEVEN_SINS_QUEST_ID,
  title: 'The Seven Sins', // [placeholder]
  prerequisites: ['climax-judgment'],
  autoActivate: true, // begins the instant Hell is entered (Quest 6's last objective)
  objectives: [
    // Objectives 1–7: one per Sin, IN GAUNTLET ORDER. Same trigger/target — the
    // scene advances them in lockstep with `sinsDefeated`, and `current-sin`
    // resolves to the live current Sin, so the arrow always points at the right one.
    { text: 'Defeat Wrath', trigger: 'sin-defeated', target: 'current-sin' }, // [placeholder]
    { text: 'Defeat Sloth', trigger: 'sin-defeated', target: 'current-sin' }, // [placeholder]
    { text: 'Defeat Gluttony', trigger: 'sin-defeated', target: 'current-sin' }, // [placeholder]
    { text: 'Defeat Envy', trigger: 'sin-defeated', target: 'current-sin' }, // [placeholder]
    { text: 'Defeat Pride', trigger: 'sin-defeated', target: 'current-sin' }, // [placeholder]
    { text: 'Defeat Greed', trigger: 'sin-defeated', target: 'current-sin' }, // [placeholder]
    { text: 'Defeat Lust', trigger: 'sin-defeated', target: 'current-sin' }, // [placeholder]
    // Objective 8: the lair (completes when entering it starts the Trinity).
    { text: 'Enter the Unholy Trinity’s lair', trigger: 'entered-lair', target: 'satan-lair' },
  ],
  // [placeholder narration — shown as a banner when the quest auto-starts in Hell]
  npcInactiveLines: [
    'Hell receives you. Seven Sins stand between you and the Adversary’s lair — cut down each in turn.',
  ],
  npcActiveLines: [],
  npcCompleteLines: [],
  preAcceptHint: 'Descend through the Seven Sins',
  reward: {
    healToFull: true,
    xp: 600,
    banner: 'The Seven Sins — complete', // [placeholder]
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
  QUEST_5_THE_DEFILED_GATE,
  QUEST_6_JUDGMENT,
  QUEST_7_THE_SEVEN_SINS,
];

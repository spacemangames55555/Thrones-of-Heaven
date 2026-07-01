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
  // Act I — the grounded Enumclaw opening (pre-corruption):
  | 'pump-delivered'
  | 'wolves-defeated'
  | 'sealion-defeated'
  | 'raiders-defeated'
  // Act II — the corruption escalation (still pre-corruption for the player):
  | 'dogs-defeated'
  | 'grove-burned'
  | 'whitepass-demons-defeated'
  // The Investigation arc (Quests 8–12, still pre-corruption):
  | 'yakima-defended'
  | 'shipment-delivered'
  | 'bellingham-cleared'
  | 'bellingham-thanked'
  | 'contraption-taken'
  | 'contraption-examined'
  | 'longview-reached'
  | 'mire-verdict'
  // The finale (Quest 13 → the rift scene):
  | 'reached-the-rift'
  | 'sasquatch-defeated'
  | 'rift-reached'
  | 'angel-refused'
  // Act IV (quests 4.1–4.4) — given by Azazel BEFORE the descent (a temporary
  // bridge re-enters descent-1 after 4.4). All corruption-gated:
  | 'bend-materials-taken'
  | 'lagrande-angels-defeated'
  | 'caravans-stopped'
  | 'salt-gathered'
  | 'roseburg-reached'
  // Act IV (quests 4.5–4.7) — the Idaho leg (still before the descent bridge):
  | 'reach-kamiah'
  | 'olympia-pump-taken'
  | 'olympia-neighbors-defeated'
  | 'river-taint' // proximity "Taint the Water" action (reused for all 3 rivers)
  | 'river-angels' // defeat the angels that appear after each tainting (reused ×3)
  | 'city-sack' // cut through a city's guards + take its heart (reused ×3)
  | 'city-angels' // defeat the angels over each sacked city (reused ×3)
  // ACT IV FINALE (4.8–4.10) — Boise, the outpost assault, the Heaven arrival:
  | 'catapult-fired' // proximity "Fire the Catapult" action (reused for all 3 catapults)
  | 'catapult-defenders' // defeat the defenders that pour out after each firing (reused ×3)
  | 'outpost-outer-defeated' // 4.9: the angel group OUTSIDE the Holy Outpost
  | 'outpost-inner-defeated' // 4.9: the angel group INSIDE the outpost
  | 'azazel-heaven-talk' // 4.10: talk with Azazel at the Heaven arrival
  // The RETIRED descent arc's triggers — kept as dead enum members (no quest in the
  // registry fires them since the Act IV finale retired descent-1..4; harmless data):
  | 'guardsmen-defeated'
  | 'farmers-defeated'
  | 'shipment-collected'
  | 'oc-angels-plundered'
  | 'loca-angels-plundered'
  | 'locb-angels-plundered'
  | 'reach-outpost'
  // The endgame's positional-machine triggers (fired by the Holy-Outpost guardian/
  // portal state machine — consumed by Act IV 4.9 — plus Heaven/Hell events; see
  // MainScene: startGuardianFight, guardian-defeat, corruptPortal, travelToWorld,
  // the god-judgment hook, godJudgmentComplete):
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
  // Act I — Enumclaw opening locations (all on Earth, near the home town):
  | 'olympia'
  | 'tree-line'
  | 'tacoma-beach'
  | 'snoqualmie-pass'
  // Act II — corruption-escalation locations (all on Earth, near Enumclaw):
  | 'pells-farm'
  | 'corrupted-grove'
  | 'whitepass-farm'
  // The Investigation arc locations (all on Earth, across the territory):
  | 'yakima'
  | 'lake-chelan'
  | 'bellingham'
  | 'cascades'
  | 'seattle'
  | 'longview'
  | 'oregon-rift'
  | 'sasquatch'
  | 'rift'
  | 'npc'
  // Act IV (4.1–4.4) locations — Oregon, all on Earth:
  | 'bend'
  | 'la-grande'
  | 'caravan-route'
  | 'florence'
  | 'roseburg'
  // Act IV (4.5–4.7) locations — the Idaho leg, all on Earth:
  | 'kamiah'
  | 'river-1'
  | 'river-2'
  | 'river-3'
  | 'city-1'
  | 'city-2'
  | 'city-3'
  // ACT IV FINALE (4.8–4.10) locations:
  | 'boise' // Earth — the city the catapults burn (SW Idaho)
  | 'catapult-1' // Earth — the three catapults outside Boise
  | 'catapult-2'
  | 'catapult-3'
  | 'azazel-heaven' // HEAVEN — Azazel at the arrival point (4.10's talk)
  // The patron's hub (progress-gated: the Oregon Dark Outpost pre-4.5, Kamiah after):
  | 'outpost'
  // RETIRED descent-arc locations (dead enum members; no quest targets them):
  | 'oregon-city'
  | 'farm-field'
  | 'shipment'
  | 'loc-a'
  | 'loc-b'
  // The endgame locations:
  | 'holy-outpost' // Earth — the IDAHO Holy Outpost == the Heaven Portal site
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
  olympia: WORLD_EARTH,
  'tree-line': WORLD_EARTH,
  'tacoma-beach': WORLD_EARTH,
  'snoqualmie-pass': WORLD_EARTH,
  'pells-farm': WORLD_EARTH,
  'corrupted-grove': WORLD_EARTH,
  'whitepass-farm': WORLD_EARTH,
  yakima: WORLD_EARTH,
  'lake-chelan': WORLD_EARTH,
  bellingham: WORLD_EARTH,
  cascades: WORLD_EARTH,
  seattle: WORLD_EARTH,
  longview: WORLD_EARTH,
  'oregon-rift': WORLD_EARTH,
  sasquatch: WORLD_EARTH,
  rift: WORLD_EARTH,
  npc: WORLD_EARTH,
  bend: WORLD_EARTH,
  'la-grande': WORLD_EARTH,
  'caravan-route': WORLD_EARTH,
  florence: WORLD_EARTH,
  roseburg: WORLD_EARTH,
  kamiah: WORLD_EARTH,
  'river-1': WORLD_EARTH,
  'river-2': WORLD_EARTH,
  'river-3': WORLD_EARTH,
  'city-1': WORLD_EARTH,
  'city-2': WORLD_EARTH,
  'city-3': WORLD_EARTH,
  boise: WORLD_EARTH,
  'catapult-1': WORLD_EARTH,
  'catapult-2': WORLD_EARTH,
  'catapult-3': WORLD_EARTH,
  'azazel-heaven': WORLD_HEAVEN,
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
  /**
   * Optional scripted narration shown ONCE (as a freeze-and-read dialogue) the
   * first time the player reaches this objective's target — the "on confronting /
   * on arriving" beat (e.g. Act II's first-demon-sight). Purely narrative.
   */
  readonly encounterNarration?: readonly string[];
  /**
   * Optional scripted narration shown when THIS objective completes but the quest
   * is NOT yet done (a mid-quest beat, e.g. the vessel dropping in the Cascades).
   * For final objectives, use the reward banner instead.
   */
  readonly completeNarration?: readonly string[];
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
 * ============================================================================
 * ACT I — THE ENUMCLAW OPENING (Quests 1–4). Four grounded, PRE-corruption
 * quests at the FRONT of the chain: an honest delivery, then three escalating
 * "help the valley" fights (wolves → sea lion → raiders). They set NO alignment
 * (no playerPath change) — Act I is the calm before the rift. After Quest 4 the
 * chain bridges into the EXISTING corruption beat (THE_CORRUPTION_AT_THE_GATES,
 * whose prerequisites now point at Quest 4) and everything downstream is
 * unchanged. Givers (Marta/Hollis/BranDen/Edda) + the Olympia recipient are
 * placed in MainScene; enemy tuning + objective positions live in settings.ts.
 *
 * >>> EDIT ACT I TEXT HERE: each quest's `title`, objective `text`, the giver's
 *     three dialogue states, and the reward banner. The Olympia delivery lines
 *     are OLYMPIA_DELIVERY_LINES below. <<<
 * ============================================================================
 */

/**
 * [Q1] Spoken by DELLA — the named woman in Olympia — when the water pump is delivered
 * (fires 'pump-delivered'). She is a REUSABLE NPC at a fixed Olympia house location
 * (MainScene `olympiaNpc` @ OLYMPIA_POSITION), so a later Act IV quest can send the player
 * BACK to this same woman + the same pump (the emotional callback). Wholesome — no hint of
 * anything sinister; the pump is an ordinary irrigation device.
 */
export const OLYMPIA_DELIVERY_LINES = [
  'Della: Oh — is that the pump? From Marta, up in Enumclaw? You carried this whole machine all the way down here yourself?',
  'Della: Bless you. My old well’s been near dry all season and my garden with it. With this I can water the rows again — we’ll have greens on the table by spring.',
  'Della: ...You’ve got a good way about you, traveler. You tell Marta it arrived safe, and you tell her Della says thank you — and that the door’s always open if you’re ever back this way.',
];

/** QUEST 1 — "An Honest Day's Work" (giver: MARTA, a miller in Enumclaw; deliver a water pump). */
export const ACT1_HONEST_DAYS_WORK: QuestDef = {
  id: 'honest-days-work',
  title: 'An Honest Day’s Work',
  prerequisites: [],
  objectives: [{ text: 'Deliver Marta’s water pump to Della in Olympia', trigger: 'pump-delivered', target: 'olympia' }],
  npcInactiveLines: [
    'Marta: Oh — you’re up early. Good. I was hoping someone with young legs would come by.',
    'Marta: I’ve been tinkering all winter and I’ve finally got it — a little hand pump, built from spare mill-iron. There’s a woman down in Olympia, Della, whose well’s gone near dry. This’ll get water to her garden again.',
    'Marta: It’s a fair walk south and west, and the thing’s a touch heavy. Think you can get it to her in one piece? I’d be in your debt — and I don’t forget a kindness.',
  ],
  npcActiveLines: ['Marta: Della’s down in Olympia, south and west. That pump won’t carry itself — and her garden’s waiting.'],
  npcCompleteLines: [
    'Marta: Already back? And it’s set up and drawing water? Ha — I knew I picked right.',
    'Marta: Here, take this for your trouble. It isn’t much, but it’s honest.',
    'Marta: You keep showing up like this and people are going to start remembering your name. That’s worth more than coin, in a place like this.',
  ],
  preAcceptHint: 'Seek Marta the miller in Enumclaw',
  reward: {
    healToFull: true,
    xp: QUEST_XP_REWARD,
    banner: 'People are starting to remember your name.',
  },
};

/** QUEST 2 — "Wolves at the Tree Line" (giver: HOLLIS, a cattle farmer; COMBAT: wolves — first fight). */
export const ACT1_WOLVES_TREE_LINE: QuestDef = {
  id: 'wolves-tree-line',
  title: 'Wolves at the Tree Line',
  prerequisites: ['honest-days-work'],
  objectives: [
    { text: 'Drive the wolf pack back from Hollis’s pasture', trigger: 'wolves-defeated', target: 'tree-line' },
  ],
  npcInactiveLines: [
    'Hollis: You’re the one who hauled Marta’s pump all the way down to Olympia, aren’t you? Word travels. Listen — I need help, and I need it before nightfall.',
    'Hollis: Wolves. A whole pack’s come down out of the high country, bolder than I’ve ever seen them. They took two of my cattle in as many nights, right out of the lower pasture. My herd’s all I’ve got.',
    'Hollis: I’m no fighter, and I can’t sit out there with a lantern every night. Could you go up to the tree line and drive them back? Put the fear into them — make them think twice about coming down here again.',
    'Hollis: Please. If I lose much more, I lose everything.',
  ],
  npcActiveLines: ['Hollis: They’re up at the tree line, east of the pasture. Drive them off before dark.'],
  npcCompleteLines: [
    'Hollis: You did it — I can see them up there, keeping their distance. They won’t come down so easy now.',
    'Hollis: I don’t have much, but take this. My herd’s safe because of you, and I won’t forget it.',
    'Hollis: You know... a few years back, nobody’d have come when I asked. People keep to themselves these days. But you came. That means something.',
  ],
  preAcceptHint: 'Seek Hollis the cattle farmer in Enumclaw',
  reward: {
    healToFull: true,
    xp: QUEST_XP_REWARD,
    banner: 'The pack scatters into the dark of the treeline, melting back toward the high country. For now, the pasture is quiet.',
  },
};

/** QUEST 3 — "Something in the Shallows" (giver: BranDen, a fisherman; COMBAT: sea lion). */
export const ACT1_SHALLOWS: QuestDef = {
  id: 'shallows',
  title: 'Something in the Shallows',
  prerequisites: ['wolves-tree-line'],
  objectives: [{ text: 'Drive off the aggressive sea lion', trigger: 'sealion-defeated', target: 'tacoma-beach' }],
  npcInactiveLines: [
    'BranDen: You’re that one from Enumclaw — the one folks keep talking about. Didn’t think I’d be glad to see a stranger, but here we are.',
    'BranDen: There’s a bull sea lion that’s taken over the beach here in Tacoma. Big one. That’s not strange by itself — but it’s aggressive, lunging at anyone who comes near the water. It put a gash in young Tomas’s leg this morning. Children play down here.',
    'BranDen: I’ve never seen one act like this. They keep to themselves, mostly. This one’s like something’s gotten into it.',
    'BranDen: Folks can’t fish, can’t even walk the shore. Could you drive it off? Before someone’s hurt worse than a scraped leg?',
  ],
  npcActiveLines: ['BranDen: It’s still out there on the Tacoma sand, lunging at anyone who comes near. Be careful.'],
  npcCompleteLines: [
    'BranDen: It’s gone. The children can come back down. You’ve no idea what that’s worth to us.',
    'BranDen: Here — fresh catch and a little coin. Take it, you’ve earned it twice over.',
    'BranDen: Still bothers me, though. The way it acted. Animals don’t just turn like that, not without a reason.',
    'BranDen: ...Ah, listen to me. Probably just a bad season. Thank you, truly.',
  ],
  preAcceptHint: 'Seek BranDen the fisherman in Enumclaw',
  reward: {
    healToFull: true,
    xp: QUEST_XP_REWARD,
    banner: 'The bull sea lion drags itself back into the grey water and vanishes beneath the waves. The beach falls quiet, save for the tide.',
  },
};

/** QUEST 4 — "The Pass" (giver: EDDA, a trade-caravan organizer; COMBAT: raiders). Bridges into the old beat. */
export const ACT1_THE_PASS: QuestDef = {
  id: 'the-pass',
  title: 'The Pass',
  prerequisites: ['shallows'],
  objectives: [
    { text: 'Drive the raiders off Snoqualmie Pass and reopen the trade route', trigger: 'raiders-defeated', target: 'snoqualmie-pass' },
  ],
  npcInactiveLines: [
    'Edda: You’re the one who’s been helping folks up and down the valley. Good — because this is bigger than one farm, and I need someone who can handle it.',
    'Edda: The trade road over Snoqualmie Pass is how everything moves — grain, tools, medicine, all of it. Without that route, half these towns wither.',
    'Edda: There’s a group come over from the east side. They’ve set themselves up on the Pass and they’re turning back our caravans — taking what they want, demanding the road as theirs. Said the next wagon through pays a “toll” or doesn’t pass at all.',
    'Edda: These aren’t desperate folk looking for scraps. They’re organized, and they mean to hold it. If they choke the Pass, we all suffer for it come winter.',
    'Edda: Go up there and break their hold. Make it clear the road stays open — for everyone.',
  ],
  npcActiveLines: ['Edda: They’ve blockaded the Pass, east in the mountains. The caravans can’t move till they’re gone.'],
  npcCompleteLines: [
    'Edda: The caravans are already moving again. You’ve kept this whole valley fed and supplied, and most of them will never even know your name.',
    'Edda: But I’ll know it. And the ones who matter will.',
    'Edda: Take this — it’s more than the others could offer, and you’ve earned every bit. We needed someone who’d stand up for all of us. Turns out that someone was you.',
    'Edda: ...Strange times, though. Folks getting bolder, hungrier, meaner. Feels like something’s stirring people up. Let’s hope it passes.',
  ],
  preAcceptHint: 'Seek Edda the caravan organizer in Enumclaw',
  reward: {
    healToFull: true,
    xp: QUEST_XP_REWARD,
    banner: 'The last of them abandon their makeshift blockade and retreat down the eastern slope. The Pass is open again — the road belongs to no one, and to everyone.',
    note: 'The whole valley knows your name now.',
  },
};

/**
 * ============================================================================
 * ACT II — THE CORRUPTION ESCALATION (Quests 5–7). Three quests where the wrong-
 * ness in the valley turns from "bad season" to undeniable: afflicted dogs on a
 * blighted circle of ground → a spreading corrupted grove the player burns out →
 * the first sight of the dark ones (demons) at White Pass. STILL pre-corruption —
 * the player is good throughout; NONE of these call setPlayerPath. After Quest 7
 * completes, URIEL'S ARRIVAL scripted scene plays (MainScene), then the old
 * corruption beat follows (its prerequisite now points at Quest 7).
 *
 * Q7's demonic raiders REUSE the existing Hell `Demon` entity (no new art).
 * Givers (Pell/Sable/Joren) are placed in MainScene; enemy tuning + objective
 * positions live in settings.ts. The "on confronting / on arriving" scene text is
 * each objective's `encounterNarration`; the "on defeating / on burning" text is
 * the reward banner.
 *
 * >>> EDIT ACT II TEXT HERE. <<<
 * ============================================================================
 */

/** QUEST 5 — "What's Gotten Into Them" (giver: OLD PELL, a farmer near Enumclaw; COMBAT: rabid dogs). */
export const ACT2_AFFLICTED_DOGS: QuestDef = {
  id: 'whats-gotten-into-them',
  title: 'What’s Gotten Into Them',
  prerequisites: ['the-pass'],
  objectives: [
    {
      text: 'Deal with Pell’s afflicted dogs',
      trigger: 'dogs-defeated',
      target: 'pells-farm',
      encounterNarration: [
        'The dogs move wrong — too stiff, too deliberate, heads low. Their eyes catch the light strangely, clouded and dim, with no flicker of recognition in them. Whatever these were, they aren’t anymore.',
      ],
    },
  ],
  npcInactiveLines: [
    'Pell: Thank God you came. I didn’t know who else— you’re the one who helps, aren’t you? The one folks trust. I need that now. I need somebody.',
    'Pell: My dogs. My own dogs, that I raised from pups. Something’s wrong with them. Three days ago they started... changing. Won’t eat. Won’t sleep. Just pace, and stare, and growl at nothing.',
    'Pell: This morning they turned on the livestock. Tore into them. I called their names and they looked at me like — like they didn’t know me. Like there was nothing of them left behind their eyes.',
    'Pell: I keep telling myself it’s the madness. Rabies. That’s got to be it, right? But I’ve seen rabid animals before, and this... this isn’t that. I don’t have a word for what this is.',
    'Pell: Please. Put them down if you have to. I can’t do it myself — I can’t even look at them. Just make it stop.',
  ],
  npcActiveLines: ['Pell: They’re out in the far pastures. God forgive me, just make it quick for them.'],
  npcCompleteLines: [
    'Pell: It’s over? They’re... at peace now? Good. That’s good. They deserved better than whatever that was.',
    'Pell: Here. Take whatever I’ve got, it’s the least— no, I insist. You didn’t just put down some sick animals. You did something I couldn’t, and I won’t forget it.',
    'Pell: But tell me true. You saw them up close. That wasn’t rabies, was it? That was something else. Something wrong.',
    'Pell: ...I’ve farmed this land forty years. I’ve never been afraid of it before. I am now.',
  ],
  preAcceptHint: 'Seek Old Pell at his farm near Enumclaw',
  reward: {
    healToFull: true,
    xp: QUEST_XP_REWARD,
    banner: 'It’s done. In the sudden quiet, you notice the ground where they paced is sickly and grey, the grass withered in a rough circle — as though something had soured the very earth beneath them.',
    note: 'Something is wrong with this land.',
  },
};

/** QUEST 6 — "The Blight" (giver: SABLE, a forester; OBJECTIVE: burn the corrupted grove). */
export const ACT2_THE_BLIGHT: QuestDef = {
  id: 'the-blight',
  title: 'The Blight',
  prerequisites: ['whats-gotten-into-them'],
  objectives: [
    {
      text: 'Burn the corrupted grove',
      trigger: 'grove-burned',
      target: 'corrupted-grove',
      encounterNarration: [
        'The forest dies around you as you enter — green giving way to grey, the trees bent into shapes that wood should not hold, dark sap bleeding from their bark. The silence is total and wrong. The very air feels thin, as if something here is slowly draining the life out of the world itself.',
      ],
    },
  ],
  npcInactiveLines: [
    'Sable: You’re the one Pell sent word about — said you helped him when those dogs turned. Then maybe you’ll believe me, because nobody else does.',
    'Sable: There’s a stretch of the woods up the eastern slope that’s gone wrong. I’ve cut timber there my whole life. Now the trees are... I don’t know how to say it. Twisted. Grey. Weeping something dark from the bark. The air around them is cold and still — no birds, no insects, nothing living.',
    'Sable: I put my hand to one and it was wrong, like touching something that’s been dead a long while but still standing. I ran. I’m not ashamed to say it.',
    'Sable: And it’s spreading. The patch is bigger than it was a week ago. Whatever this is, it’s creeping outward, tree by tree, toward the farms. Toward town.',
    'Sable: I’ve brought oil and a torch. Burn it out — all of it — before it reaches us. Some things you can’t reason with. You can only put them to the fire.',
  ],
  npcActiveLines: ['Sable: The blight’s up the eastern slope. Burn it — all of it — before it spreads further.'],
  npcCompleteLines: [
    'Sable: It’s burning. Good. I can feel the difference from here — the air’s gone right again. You did what I couldn’t make myself do.',
    'Sable: Take this, with my thanks. I’d have given more if it’d make that feeling go away.',
    'Sable: But I have to ask, because it’s been clawing at me — what could do that? Make the land itself sicken and die? That’s not blight, not rot, not anything that grows in nature. Something brought that here.',
    'Sable: ...And if it’s spreading, then somewhere out there is wherever it’s spreading from. I don’t envy whoever has to find that.',
  ],
  preAcceptHint: 'Seek Sable the forester at the forest’s edge',
  reward: {
    healToFull: true,
    xp: QUEST_XP_REWARD,
    banner: 'The fire takes quickly, hungrily, as though the blighted wood wants to burn. As the grove goes up, the unnatural cold breaks, and for the first time the air moves freely again. Whatever was rooted here, the flames are taking it.',
  },
};

/** QUEST 7 — "The Thing at White Pass" (giver: JOREN, a fled farmhand; COMBAT: demonic raiders / Demons). */
export const ACT2_WHITE_PASS: QuestDef = {
  id: 'the-thing-at-white-pass',
  title: 'The Thing at White Pass',
  prerequisites: ['the-blight'],
  objectives: [
    {
      text: 'Reach the farm near White Pass and drive off the raiders',
      trigger: 'whitepass-demons-defeated',
      target: 'whitepass-farm',
      encounterNarration: [
        'You see them, and your mind refuses them.',
        'They move through the steading like a wrongness given shape — tall, dark, their forms bending in ways a living body cannot. No skin, no face you could name, only a hollow darkness that seems to drink the light around it. Where they tread, the grass blackens and curls. The cold rolls off them in waves. Every animal instinct you have screams the same word: this does not belong here.',
        'You have never seen anything like them. Nothing has. They are not of this world.',
      ],
    },
  ],
  npcInactiveLines: [
    'Joren: You — you’re the one who handles the bad things, the one everyone talks about. Please. Please. My family’s farm, near White Pass — it’s being torn apart, and the things doing it, they’re not— they’re not people—',
    'Joren: I can’t even— I don’t have words. They walk like men but they’re wrong. Dark. Wrong-shaped. Where they step, the ground dies. One looked at me and I felt my blood go to ice and I ran, I left them, God forgive me, I ran—',
    'Joren: My father’s still there. My sisters. If they’re even still— please, you have to go. You’re the only one who might. I’ll show you the way, just— hurry. Hurry.',
  ],
  npcActiveLines: ['Joren: The farm’s southeast, near White Pass. Please — hurry. My family’s still there.'],
  npcCompleteLines: [
    'Joren: You— you’re alive. They’re alive. I didn’t dare hope— thank you, thank you, I’ll never be able to—',
    'Joren: But what were those things? You saw them. You fought them. I’m not mad — they were real, weren’t they? Real and wrong and here.',
    'Joren: I have to tell the town. Everyone has to know. Things like that, walking our land, killing— we can’t pretend this is wolves and bad seasons anymore. This is something else. Something bigger.',
    'Joren: ...Somebody has to know what to do about this. God help us, I hope somebody does.',
  ],
  preAcceptHint: 'Seek Joren the farmhand on the road',
  reward: {
    healToFull: true,
    xp: QUEST_XP_REWARD,
    banner: 'The last of them lets out a sound — not a death-cry, but something colder, almost like laughter — and dissolves into a smear of dark that the earth seems to swallow. They leave no bodies. Only the dead ground, and the silence, and the certainty that there are more of them somewhere.',
    note: 'The corruption has a face.',
  },
};

/**
 * ============================================================================
 * THE INVESTIGATION ARC (Quests 8–12). After Uriel's charge, the player follows
 * the dark ones' trail across the territory — defending Yakima, escorting iron the
 * demons covet, reaching the Druid city of Seattle, capturing the strange vessel
 * they are building, and carrying it to an exile scholar for a verdict. STILL pre-
 * corruption (no setPlayerPath). Q11 + Q12 each have TWO objectives (a fight/travel
 * leg, then a DELIVER-to-NPC leg) and are AUTO-ACTIVATE so they flow straight on
 * from the prior quest (their `npcInactiveLines` show as a short start banner).
 *
 * Givers/recipients are placed in MainScene; enemy/ambush tuning + objective
 * positions live in settings.ts. Combat REUSES the Hell Demon entity (no new art).
 * The Alder/Mire verdict text + Seattle intro narration are the *_LINES exports.
 * >>> EDIT INVESTIGATION-ARC TEXT HERE. <<<
 * ============================================================================
 */

/** [Q9] Brief scene text shown as each en-route ambush group strikes (in order). */
export const Q9_AMBUSH_LINES = [
  'They come out of the rocks — fast, silent, reaching for the cargo before they even reach you.',
  'More of them. They’re not trying to kill you. They’re trying to get past you, to the iron.',
  'The last of them throw themselves at the wagon with a desperation almost worse than rage. They want this metal badly.',
];
/** [Q12] Scene text shown as the southern-road ambush strikes. */
export const Q12_AMBUSH_LINES = [
  'They come for you on the southern road — not to raid, but to retrieve. They fling themselves at the vessel you carry, frantic to take back the thing you stole from them. They fail. But their desperation tells you plainly: whatever this is, they need it badly.',
];

/** [Q10 framing] Shown ONCE when the player first enters the Druid city of Seattle. */
export const SEATTLE_INTRO_LINES = [
  'Seattle is unlike anywhere else in the territory — a city grown into the forest itself, timbered walkways strung between ancient trees, homes nestled high in the branches. The Druids who keep this place have long memories. And right now, they are worried.',
];

/** [Q10 obj2] Greta, a Bellingham farmer, after the dark ones are driven off (fires 'bellingham-thanked'). */
export const GRETA_LINES = [
  'Greta: You came up from Seattle? Bless the Druids for sending someone — and bless you for coming. We’ve been trapped three days, watching them trample everything we’ve grown.',
  'Greta: Take what we can spare. It’s not the season’s best, not with them about. But it’s yours, with our thanks.',
  'Greta: I’ll tell you what chills me, though — they’ve come this far north. All the way to the edge of everything. Whatever’s drawing them, it’s not one valley’s trouble anymore. It’s all of us.',
];

/** [Q11 obj2] Alder examines the captured vessel in Seattle (fires 'contraption-examined'). */
export const ALDER_EXAM_LINES = [
  'Alder: Where did you— no. Don’t tell me yet. Let me look.',
  'Alder: Sixty years I’ve studied the old things, the deep things. The roots remember much, and I remember what they tell me. And this... I have never seen its like. It is no craft I know — not human, not natural.',
  'Alder: But I can tell you this much, and I wish I could not: it is made to hold something. To capture, and to contain. There is a hunger built into it — whatever it was meant to carry, this vessel was made to take it and never let go.',
  'Alder: I cannot say what. But it is wrong, root and branch. You must not let them make more of these — and you must learn what it is for.',
  'Alder: ...There is one who might know. South, in Longview. A scholar who walked away from us long ago — difficult, and not glad to be found. But there is little that one does not understand. Take it to them. Quickly.',
];

/** [Q12 obj2] Mire, the exile scholar in Longview, gives the verdict (fires 'mire-verdict'). */
export const MIRE_VERDICT_LINES = [
  'Mire: I know who sent you. I can smell the order on you — all that reverence for the roots. I left that behind. So whatever you’ve come for, make it quick.',
  'Mire: ...Where did you get that. No. Give it here. Carefully.',
  'Mire: Alder was right to be afraid, and Alder is rarely right about anything. This is a container — that much is plain in its making. Built to draw something in and seal it away. Elegant, in a horrible way. Whoever forged this understood capture better than any craftsman I’ve known.',
  'Mire: But what it’s meant to hold — that, I cannot tell you. There’s no residue, no trace, nothing yet caught inside it. It is empty, and waiting. Made for a purpose not yet served.',
  'Mire: What I can tell you is that they will build more. A thing made this carefully is made to be used — and used at scale. Whatever they intend to fill these with, they intend to fill many.',
  'Mire: ...You want my honest counsel? Stop them before the first one is ever filled. Because I suspect that once you see what goes inside, it will already be too late.',
];

/** QUEST 8 — "Word to Yakima" (giver: WEND, a granary-keeper; COMBAT: demon raiders). */
export const INV_WORD_TO_YAKIMA: QuestDef = {
  id: 'word-to-yakima',
  title: 'Word to Yakima',
  prerequisites: ['the-thing-at-white-pass'],
  objectives: [{ text: 'Defend Yakima from the demon raiders', trigger: 'yakima-defended', target: 'yakima' }],
  npcInactiveLines: [
    'Wend: You’ve come over the pass? Long road. What’s the news from the west that couldn’t wait?',
    'Wend: ...Demons. You expect me to— no. No, I can see it in your face. You’re not the type to spook over nothing.',
    'Wend: If what you say is true, then we need to ready ourselves. Spread the word — let folks hear it from someone who’s seen th—',
    'Wend: ...No. No. They’re here. They followed you, or they were already coming — God, it doesn’t matter. Help us! Don’t let them take Yakima!',
  ],
  npcActiveLines: ['Wend: They’re in the streets! Drive them out — don’t let them take Yakima!'],
  npcCompleteLines: [
    'Wend: We’d have been overrun. We didn’t even know to be afraid until they were on us.',
    'Wend: Take this, and take our thanks. And know that Yakima believes you now — every word. We’ll spread it ourselves, to anyone who’ll listen.',
    'Wend: But it’s not lost on me — they came right as you did. Like they’re not just raiding. Like they’re moving toward something. You feel it too, don’t you?',
  ],
  preAcceptHint: 'Carry Uriel’s warning east to Wend in Yakima',
  reward: {
    healToFull: true,
    xp: QUEST_XP_REWARD,
    banner: 'The dark ones dissolve into the dead ground they made, and Yakima stands — shaken, but whole. The townsfolk who doubted you an hour ago now look at you the way the western valley does: like the only thing standing between them and the dark.',
  },
};

/** QUEST 9 — "The Iron Road" (giver: HALVARD, a freight-master; COMBAT: 3 ambushes en route). */
export const INV_IRON_ROAD: QuestDef = {
  id: 'the-iron-road',
  title: 'The Iron Road',
  prerequisites: ['word-to-yakima'],
  objectives: [
    { text: 'Escort the metal shipment from Yakima to Lake Chelan', trigger: 'shipment-delivered', target: 'lake-chelan' },
  ],
  npcInactiveLines: [
    'Halvard: You’re the one who held the line here? Then you’re exactly who I need. I’ve got a shipment that has to reach Lake Chelan, north of here, and I can’t promise it’ll arrive.',
    'Halvard: It’s metal — tools, fittings, worked iron. And here’s what’s got me spooked: the dark ones have been hitting metal shipments. Specifically. Three caravans this month, all carrying iron, all ambushed. They leave the grain, leave the cloth — they want the metal.',
    'Halvard: Why a pack of dead things wants iron, I couldn’t tell you. But they do, and they’ll come for this one. Ride with it. Get it to Chelan in one piece. Expect trouble on the road. More than once, if the pattern holds.',
  ],
  npcActiveLines: ['Halvard: Get the iron to Lake Chelan, north. Expect ambushes — more than once.'],
  npcCompleteLines: [
    'Halvard: It’s here. All of it. After three tries I half expected to be scraping this caravan off the road.',
    'Halvard: You’ve got my thanks and then some. But I’ll tell you what I told myself the whole ride: this isn’t normal. Dead things don’t covet. They don’t single out iron and chase it across the territory.',
    'Halvard: They’re gathering. Building toward something — has to be. I just wish I knew what a demon needs with a wagonload of worked metal. Whatever it is, I don’t think it’s good for any of us.',
  ],
  preAcceptHint: 'Seek Halvard the freight-master in Yakima',
  reward: {
    healToFull: true,
    xp: QUEST_XP_REWARD,
    banner: 'The shipment reaches Lake Chelan intact — every bar of iron the dark ones tried so hard to take.',
    note: 'The dark ones are gathering something.',
  },
};

/** QUEST 10 — "The Northern Farms" (giver: ROWAN, a Seattle Druid; COMBAT: demon raiders at Bellingham). */
export const INV_NORTHERN_FARMS: QuestDef = {
  id: 'the-northern-farms',
  title: 'The Northern Farms',
  prerequisites: ['the-iron-road'],
  objectives: [
    {
      text: 'Travel north to the Bellingham farms and drive off the dark ones',
      trigger: 'bellingham-cleared',
      target: 'bellingham',
      encounterNarration: [
        'The northern farms lie too quiet. Then you see why — the dark ones move among the fields, and the farmers are pinned helpless in their own homes.',
      ],
    },
    { text: 'Speak with the Bellingham farmers', trigger: 'bellingham-thanked', target: 'bellingham' },
  ],
  npcInactiveLines: [
    'Rowan: You carry the look of the one they’re talking about — the western valley’s protector. Good. We’ve need of clear eyes and a steady hand.',
    'Rowan: Our grain stores run thin. The shipments from the north — the Bellingham farms — have slowed to nothing. No word, no wagons. In gentler times I’d blame the weather. But these are not gentle times.',
    'Rowan: If the dark ones have reached the northern farms, the people there are in danger — and so is every mouth this city feeds come winter. Go north. See that they’re safe. And if the dark ones are among them, do what you do.',
    'Rowan: I’d grow this whole forest into a wall if it would keep them out. But some threats you cannot root away. They need someone like you.',
  ],
  npcActiveLines: ['Rowan: The Bellingham farms are far north. If the dark ones are there, the farmers can’t hold alone.'],
  npcCompleteLines: [
    'Rowan: Word came ahead of you — the northern farms still stand, because of you. The roots carry good news quickly, when there is any to carry.',
  ],
  preAcceptHint: 'Seek Rowan the Druid in Seattle',
  reward: {
    healToFull: true,
    xp: QUEST_XP_REWARD,
    banner: 'The dark ones are driven from the northern fields. The Bellingham farmers come out blinking into the light, their homes — and the city’s winter stores — saved.',
  },
};

/** QUEST 11 — "What the Dark Ones Carry" (AUTO; COMBAT: Cascades demons → bring the vessel to ALDER in Seattle). */
export const INV_WHAT_THEY_CARRY: QuestDef = {
  id: 'what-the-dark-ones-carry',
  title: 'What the Dark Ones Carry',
  prerequisites: ['the-northern-farms'],
  autoActivate: true,
  objectives: [
    {
      text: 'Find where the dark ones gather in the Cascades and take what they carry',
      trigger: 'contraption-taken',
      target: 'cascades',
      encounterNarration: [
        'High in the mountains, you find them — a knot of the dark ones gathered around something they carry between them. They turn as one when they sense you.',
      ],
      completeNarration: [
        'The last of them falls, and what they carried clatters to the stone: a strange vessel — part iron, part something else, etched with marks that hurt to look at. It hums faintly, cold in your hands. This is what the metal was for. This is what they’ve been building toward. You don’t understand it. But you know someone who might.',
      ],
    },
    { text: 'Bring the vessel to Alder in Seattle', trigger: 'contraption-examined', target: 'seattle' },
  ],
  // AUTO-ACTIVATE start banner (the search framing).
  npcInactiveLines: [
    'The pattern is undeniable now. The dark ones gather — metal, materials, all of it moving somewhere up into the high country. Find where, and you may learn what they’re building.',
  ],
  npcActiveLines: [],
  npcCompleteLines: [],
  preAcceptHint: '',
  reward: {
    healToFull: true,
    xp: QUEST_XP_REWARD,
    banner: 'A vessel made to capture something.',
  },
};

/** QUEST 12 — "The Exile of Longview" (AUTO; COMBAT: ambush en route → MIRE's verdict in Longview). */
export const INV_EXILE_OF_LONGVIEW: QuestDef = {
  id: 'the-exile-of-longview',
  title: 'The Exile of Longview',
  prerequisites: ['what-the-dark-ones-carry'],
  autoActivate: true,
  objectives: [
    { text: 'Carry the vessel south to Longview', trigger: 'longview-reached', target: 'longview' },
    { text: 'Bring the vessel to Mire for a verdict', trigger: 'mire-verdict', target: 'longview' },
  ],
  // AUTO-ACTIVATE start banner (the road framing).
  npcInactiveLines: [
    'Longview lies far to the south, near the great river. Alder’s warning rides with you: the scholar there is difficult, and the dark ones still hunt the roads. They will not want this vessel to reach anyone who can understand it.',
  ],
  npcActiveLines: [],
  npcCompleteLines: [],
  preAcceptHint: '',
  reward: {
    healToFull: true,
    xp: QUEST_XP_REWARD,
    banner: 'A container. Empty, and waiting.',
  },
};

/**
 * THE OPENING CORRUPTION QUEST (formerly Quest 1). Its content is UNCHANGED; only
 * ============================================================================
 * QUEST 13 — "The Source" (FINALE lead-in). The REAL corruption beat. The old
 * Sasquatch/angel placeholder ('corruption-at-the-gates') is RETIRED — this quest
 * + the scripted RIFT SCENE (MainScene) replace it. Q13 auto-activates after Q12;
 * on start, Uriel gives a pre-warning send-off (MainScene), then the player travels
 * to the rift in the N-Oregon high country. Reaching it BEGINS the rift scene
 * (approach → Semyaza → the lie → the choice → take the Light), where the
 * corruption grant — setPlayerPath('corrupted') + Spirit Vision — now lives. The
 * rift scene fires 'reached-the-rift' at its close, completing Q13 → descent-1
 * (Azazel) unlocks. The send-off / scene text are in src/story/riftSceneData.ts.
 * ============================================================================
 */
export const THE_SOURCE: QuestDef = {
  id: 'the-source',
  title: 'The Source',
  prerequisites: ['the-exile-of-longview'],
  autoActivate: true, // flows from Q12; Uriel's send-off plays on start (MainScene)
  objectives: [
    { text: 'Travel to northern Oregon, east of Mt. Hood, and find the source', trigger: 'reached-the-rift', target: 'oregon-rift' },
  ],
  // Auto-activate: the send-off is a scripted Uriel scene (MainScene), not a banner.
  npcInactiveLines: [],
  npcActiveLines: [],
  npcCompleteLines: [],
  preAcceptHint: '',
  reward: {
    healToFull: true,
    xp: QUEST_XP_REWARD,
    banner: 'You have taken the dark ones’ Light. There is no road back to what you were.',
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
  'Azazel: You are not yet of us. Come back when the light has gone out of your road.',
];

/**
 * ============================================================================
 * ACT IV (quests 4.1–4.4) — the Necromancer's opening descent into doing real
 * harm "for the road home." Given by the patron AZAZEL at the Dark Outpost, all
 * corruption-gated, inserted BEFORE the old descent chain. 4.1 unlocks right
 * after the rift ('the-source'); 4.2←4.1, 4.3←4.2, 4.4←4.3. A TEMPORARY BRIDGE
 * (descent-1.prerequisites = ['act4-salt-and-sea']) re-enters the old descent
 * chain after 4.4, so the game stays playable end to end (4.4 → descent-1..4 →
 * climax → Heaven → endgame, all unchanged).
 *
 * Each routes through the existing arc-objective system (like descent): defeat /
 * gather / reach watchers + a return-to-Azazel step. The angels' pleas are
 * `encounterNarration` (freeze-and-read). The Roseburg cleric is a deliver NPC.
 *
 * >>> EDIT ACT IV TEXT HERE: each quest's `title`, objective `text`, the three
 *     Azazel dialogue states, the encounter/complete narration, and the reward.
 *     The Roseburg cleric's lines are CLERIC_LINES below. <<<
 * ============================================================================
 */

/** 4.4 — the Roseburg cleric (a deliver/recipient NPC) who purifies the salt. */
export const CLERIC_LINES = [
  'Cleric: I’ll cleanse it. Not because I want to — because I’ve seen what happens to those who refuse you. God forgive me for the part these hands are playing in whatever this becomes.',
  'Cleric: It’s done. Take it and go. And may you someday understand what you carried out of here.',
];
/** Cleric flavor line once the salt is purified / before that step is active. */
export const CLERIC_IDLE_LINE =
  'Cleric: I’ve done what you asked of me. Leave me to my prayers.';

/** 4.1 — "What They Won't Give" (Bend): take materials the farmers won't trade. */
export const ACT4_WHAT_THEY_WONT_GIVE: QuestDef = {
  id: 'act4-what-they-wont-give',
  title: 'What They Won’t Give',
  prerequisites: ['the-source'],
  requiresCorruption: true,
  objectives: [
    {
      text: 'Take the materials from the farmers at Bend',
      trigger: 'bend-materials-taken',
      target: 'bend',
      encounterNarration: [
        'The farmers see you coming — and something in how you move, or the cold that comes with you now, makes them back toward their door. “We don’t— we don’t want any trouble. Whatever you are, just go. Please.” They will not give you what you came for. There is only one way to take it.',
      ],
      completeNarration: [
        'It’s done. The materials are yours. The farmers are alive — shaken, beaten, watching you go with eyes full of a fear you used to stand against. You tell yourself they left you no choice.',
      ],
    },
    { text: 'Return to Azazel at the Dark Outpost', trigger: 'reach-outpost', target: 'outpost' },
  ],
  npcInactiveLines: [
    'Azazel: There you are. Good. We have so much work ahead of us, you and I — but it ends with us home. Hold on to that.',
    'Azazel: If we’re ever going to open the door back to Heaven, we’ll need supplies. A great many. And here is the hard truth, friend: your kind is terrified of us. They see what the angels made us into and they can’t see past it. They won’t trade with us. They won’t even speak with us.',
    'Azazel: So we’re left with no choice but to take what we need. I wish it were otherwise.',
    'Azazel: There are farmers down in Bend, in Oregon, with materials we can’t do without. Go to them. Ask first — be civil, give them the chance. But if they refuse you... then take it. We can’t let their fear cost us our only way home.',
  ],
  npcActiveLines: ['Azazel: The materials are at Bend, to the south. Take them, then come back to me.'],
  npcCompleteLines: [
    'Azazel: You got it. I knew you would.',
    'Azazel: I know that wasn’t easy — taking from frightened people. It sits wrong, doesn’t it? Hold on to that feeling, even. It means you’re still good. That’s why you’ll do so much good once we’re home and all of this is behind us. Rest now. There’s more to do.',
  ],
  preAcceptHint: 'Seek Azazel at the Dark Outpost',
  reward: { healToFull: true, xp: 200, banner: 'What They Won’t Give — complete' },
};

/** 4.2 — "The Watchers on the Road" (La Grande): clear the angels barring the way. */
export const ACT4_WATCHERS_ON_THE_ROAD: QuestDef = {
  id: 'act4-watchers-on-the-road',
  title: 'The Watchers on the Road',
  prerequisites: ['act4-what-they-wont-give'],
  requiresCorruption: true,
  objectives: [
    {
      text: 'Clear the angels watching the road to La Grande',
      trigger: 'lagrande-angels-defeated',
      target: 'la-grande',
      encounterNarration: [
        'HERALD: Stop. I know what you were, before this. I have read it in the Light you carry — Light that was given freely by a dying liar, and is not yours.',
        'HERALD: You were a protector once. You drove the wolf from the farmer’s door. Do you remember? It is not too late to remember.',
        'HERALD: Turn back. Set down what they have made you into. Please — I do not wish to raise my hand against you. None of us do.',
        'PLAYER: ...You don’t know what they did to you.',
        'HERALD: ...No. You don’t. Not yet. I am sorry for what comes next — for both of us.',
      ],
      completeNarration: [
        'The angels do not die. As the last one falls, its form unravels into light and is gone — back to Heaven, leaving behind a faint, warm residue: a trace of the Light. You gather it. You try not to think about the sorrow in its voice.',
      ],
    },
    { text: 'Return to Azazel at the Dark Outpost', trigger: 'reach-outpost', target: 'outpost' },
  ],
  npcInactiveLines: [
    'Azazel: We need to move north, to La Grande — but we can’t. The angels have found our trail. They watch everything we do now, and they’ve set themselves across the road to stop us.',
    'Azazel: You understand what they are, don’t you? The same beings who drained us, who cast us out, who keep us from going home. And now they stand between us and the supplies we need to get there.',
    'Azazel: Clear them off the road. Don’t let them turn you back. We’ve come too far to be stopped by the very ones who started all this.',
  ],
  npcActiveLines: ['Azazel: The angels still hold the road north. Clear them, then return to me.'],
  npcCompleteLines: [
    'Azazel: The road’s clear. And you brought back Light from them — good, good. Every scrap brings us closer.',
    'Azazel: I saw it hesitate. They’ll do that — talk. Fill your head with doubt, with half-remembered things, anything to stop you. It’s what they do. Don’t let their words in. They are very, very good at sounding kind. Come. La Grande waits.',
  ],
  preAcceptHint: 'Seek Azazel at the Dark Outpost',
  reward: {
    healToFull: true,
    xp: 240,
    holyPower: 8,
    banner: 'The Watchers on the Road — complete',
  },
};

/** 4.3 — "The Trade Day" (caravans → Portland): take the worked metal off the road. */
export const ACT4_THE_TRADE_DAY: QuestDef = {
  id: 'act4-the-trade-day',
  title: 'The Trade Day',
  prerequisites: ['act4-watchers-on-the-road'],
  requiresCorruption: true,
  objectives: [
    {
      text: 'Stop the five caravans before they reach Portland',
      trigger: 'caravans-stopped',
      target: 'caravan-route',
      encounterNarration: [
        '(The wagon people form up — not soldiers, just drivers and traders clutching whatever they can swing, terrified but standing their ground in front of everything they own.)',
      ],
      completeNarration: [
        'Five caravans, stripped. The road behind you is strewn with overturned wagons and people too hurt or too afraid to chase you. A day’s worth of a hundred families’ work, gone.',
      ],
    },
    { text: 'Return to Azazel at the Dark Outpost', trigger: 'reach-outpost', target: 'outpost' },
  ],
  npcInactiveLines: [
    'Azazel: Fortune smiles on us today, friend. It’s the great trade day across the region — the one day all the wealth of these lands moves on the roads at once. We may never get a chance like this again.',
    'Azazel: Five caravans are rolling toward Portland, heavy with worked metal — wheels, axles, fittings. The very thing we need most. We cannot make the door home without it.',
    'Azazel: Head them off before they reach the city. Take their metal — all of it. They’ll have hands to guard the wagons, frightened folk who’ll fight to keep what’s theirs. Don’t let that stop you. What we’re building is bigger than one day’s trade.',
  ],
  npcActiveLines: ['Azazel: The caravans are still on the road to Portland. Take their metal, then return to me.'],
  npcCompleteLines: [
    'Azazel: Magnificent. Look at all of it — that’s months of progress in a single day.',
    'Azazel: I know. They weren’t soldiers. They were just people, hauling their goods to market. It troubles you. It should — a heart that didn’t trouble at that wouldn’t be worth saving.',
    'Azazel: But think of the scale of what we’re building. A door between worlds. When weighed against that, what is one caravan of wheels? What is one bad day, against your whole people finally free of these tyrants? Hold the bigger picture. It’s the only way through this.',
  ],
  preAcceptHint: 'Seek Azazel at the Dark Outpost',
  reward: { healToFull: true, xp: 280, banner: 'The Trade Day — complete' },
};

/** 4.4 — "Salt and Sea" (Florence → Roseburg): gather salt, cut into Roseburg, purify it. */
export const ACT4_SALT_AND_SEA: QuestDef = {
  id: 'act4-salt-and-sea',
  title: 'Salt and Sea',
  prerequisites: ['act4-the-trade-day'],
  requiresCorruption: true,
  objectives: [
    {
      text: 'Gather the shore-salt along the Florence coast',
      trigger: 'salt-gathered',
      target: 'florence',
      encounterNarration: [
        'The salt lies in pale crusted patches up and down the shore, and the creatures here want you nowhere near it — driven half-mad by something in the air. You take what you came for, one patch at a time, with claws and teeth and talons testing you the whole way.',
      ],
    },
    {
      text: 'Cut through the angels into Roseburg and bring the salt to the cleric',
      trigger: 'roseburg-reached',
      target: 'roseburg',
      encounterNarration: [
        'HERALD: Salt, now. Metal, Light, and salt. Do you even know what you’re building, mortal? Do you know what that door lets out — or only what your master tells you it lets in?',
        'HERALD: We are not your enemy. We have never once raised a hand against your towns, your families — only against you, and only here, only to slow what’s coming. Ask yourself why protectors would need to stop you.',
        'HERALD: ...I see the answer won’t come. Not yet. Then I am sorry. We do what we must to guard them — as you once did.',
      ],
    },
    { text: 'Return to Azazel at the Dark Outpost', trigger: 'reach-outpost', target: 'outpost' },
  ],
  npcInactiveLines: [
    'Azazel: We’re closer than you know. The door home needs more than metal — it needs purity, and there’s a rare thing only your world makes. On the coast at Florence, the ocean and the wind together leave behind a mineralized salt, found nowhere else. We need a great deal of it.',
    'Azazel: Gather it along the shore. But be warned — the wild things there have grown strange near the Light’s edge, and they’ll turn on you. Watch the water, the rocks, the sky.',
    'Azazel: Once you have the salt, it’s raw — useless to us until it’s purified. Take it inland to Roseburg. There’s a cleric there with the old knowledge who can cleanse it. The angels know that salt matters to us. They’ll be watching the road into Roseburg. Be ready to cut through them.',
  ],
  npcActiveLines: ['Azazel: Salt from the Florence shore, then the cleric at Roseburg. Then home to me.'],
  npcCompleteLines: [
    'Azazel: Purified — perfect. The pieces are nearly all in place now. I can almost see home from here.',
    'Azazel: The angels talked again, didn’t they? Asked their little questions, planted their little doubts. “Do you know what you’re building.” As if we’re the deceivers. We’re building a door, friend. That’s all. A way home. Don’t let them make it into something monstrous in your mind. Come — we’re so close now.',
  ],
  preAcceptHint: 'Seek Azazel at the Dark Outpost',
  reward: {
    healToFull: true,
    xp: 320,
    holyPower: 10,
    banner: 'Salt and Sea — complete',
  },
};

/**
 * ============================================================================
 * ACT IV (Batch C) — the Idaho leg, quests 4.5–4.7. The hope (4.5: the angels'
 * door is found at Mount McGuire) curdles into the worst thing the player does
 * (4.5b: rob the kind Olympia woman from Quest 1), then darkens further (4.6:
 * poison the towns' rivers; 4.7: sack the weakened cities). Still BEFORE the
 * descent — the bridge now re-enters descent-1 after 4.7. All corruption-gated,
 * all given by Azazel. Each ends by returning to him at the Kamiah outpost
 * (the relabelled Dark Outpost, so Azazel stays put + reachable).
 *
 * >>> EDIT 4.5–4.7 TEXT HERE: each quest's title, objective text, Azazel's three
 *     dialogue states, and the encounter/complete narration. <<<
 * ============================================================================
 */

/** 4.5 — "The Door They Came Through": arrive at the Kamiah, ID outpost (a transition). */
export const ACT4_THE_DOOR_THEY_CAME_THROUGH: QuestDef = {
  id: 'act4-the-door-they-came-through',
  title: 'The Door They Came Through',
  prerequisites: ['act4-salt-and-sea'],
  requiresCorruption: true,
  objectives: [
    {
      text: 'Travel east to Kamiah, Idaho and meet Azazel at the new outpost',
      trigger: 'reach-kamiah',
      target: 'kamiah',
      encounterNarration: [
        'You cross into Idaho with everything you’ve taken — the metal, the salt, the gathered Light — and find Azazel waiting, the demons gathered around him, an outpost rising in the shadow of the mountains. For the first time, the thing you’ve been building toward feels close enough to touch. Azazel looks at you the way no one has since you left home: like you are the most important person in the world.',
      ],
    },
  ],
  npcInactiveLines: [
    'Azazel: Friend. I have news I’ve waited an eternity to say.',
    'Azazel: We’ve found it. The angels can walk your world, but only because they have a door of their own — a way through from Heaven. And we have found it. It’s east, in the mountains of Idaho. Mount McGuire.',
    'Azazel: This changes everything. If their door opens out, then with what we’ve gathered, we can force it open in — and walk home the way they’ve been walking here all along.',
    'Azazel: We’ll make our outpost near theirs. Bring everything we’ve collected and meet us there — at Kamiah, in Idaho. The end of our long exile is finally in sight. I can hardly believe it’s real.',
  ],
  npcActiveLines: ['Azazel: Kamiah, in Idaho, east in the mountains. Bring everything. Meet me there.'],
  npcCompleteLines: [
    'Azazel: You made it. And you brought all of it. Look at this — look at what we’ve built together. None of it happens without you. Not one piece.',
    'Azazel: We’re so close now I can taste it. But there’s still work to do before we can force their door. The angels won’t make it easy. Rest tonight. Tomorrow, we finish this.',
  ],
  preAcceptHint: 'Seek Azazel at the Dark Outpost',
  reward: { healToFull: true, xp: 300, banner: 'The Door They Came Through — Kamiah, Idaho' },
};

/** 4.5b — "Olympia": THE GUT-PUNCH. Rob the kind woman from Quest 1 of the water pump. */
export const ACT4_OLYMPIA: QuestDef = {
  id: 'act4-olympia',
  title: 'Olympia',
  prerequisites: ['act4-the-door-they-came-through'],
  requiresCorruption: true,
  objectives: [
    {
      text: 'Go to Olympia and take the water pump from the woman’s house',
      trigger: 'olympia-pump-taken',
      target: 'olympia',
      encounterNarration: [
        'WOMAN: Oh — hello there, can I—',
        '(Then she sees you. Truly sees you. The cold, the Light, what you’ve become. The smile dies.)',
        'WOMAN: ...No. No, it can’t— you’re the one who brought it to me. You carried it all this way. You were so kind. I remember your face— what— what happened to you?',
        'WOMAN: Please. Please don’t. Not you. Whatever they’ve done to you — you don’t have to do this. I remember who you were, even if you don’t.',
      ],
      completeNarration: [
        'PLAYER: ...I’m sorry. I have to. It’s the only way home.',
        'You take the machine from her hands. She doesn’t fight you — she just lets go, and looks at you with something worse than fear: grief. For you. As you turn to leave, the warmth you felt on this porch a lifetime ago curdles into something you can’t name and don’t want to.',
      ],
    },
    {
      text: 'Cut down the neighbors and leave Olympia',
      trigger: 'olympia-neighbors-defeated',
      target: 'olympia',
      encounterNarration: [
        'You step off the porch and they’re there — three men from the town, who came running when they heard. Not soldiers. Neighbors. Standing between you and the road, between you and the woman, the way you once stood between people and the dark.',
        'NEIGHBOR: We saw what you did in there. We don’t care what you are. You don’t get to do that to her and just walk away.',
      ],
      completeNarration: [
        'You leave them behind you on the ground, and the woman weeping in her doorway, and the device cold in your hands. Something is wrong. Something has been wrong for a long time, and for just a moment, here, it’s hard to keep Azazel’s words loud enough to drown it out.',
      ],
    },
    { text: 'Return to Azazel at the Kamiah outpost', trigger: 'reach-outpost', target: 'outpost' },
  ],
  npcInactiveLines: [
    'Azazel: One more thing we need — and this one, only you can fetch. There’s a device. A simple thing, a machine of your world, but it does something we cannot replicate — and the door won’t seal true without it.',
    'Azazel: It’s in Olympia. A woman keeps it. You may even know the place — I’m told a courier brought it to her, long ago, from a mill up north. Go to her. Take it. You know by now that asking does no good — they only ever see the monster. Bring me the device, and we are nearly home.',
  ],
  npcActiveLines: ['Azazel: The device is in Olympia, west, with the woman. Take it and bring it to me.'],
  npcCompleteLines: [
    'Azazel: There it is. The last piece. I knew you’d bring it.',
    'Azazel: ...You’re quiet. It got to you, that one. I can see it. Listen to me. That ache you feel? That’s not doubt. That’s the weight of how much this costs — and it’s proof of how much it matters. Soon, friend. Soon you’ll be home, and all of this will have been worth it. I promise you. Just a little further.',
  ],
  preAcceptHint: 'Seek Azazel at the Dark Outpost',
  reward: { healToFull: true, xp: 340, banner: '' }, // empty banner — keep it quiet/heavy (no completion flourish)
};

/** 4.6 — "Poison the Well": taint 3 river headwaters (proximity action) + their angels. */
export const ACT4_POISON_THE_WELL: QuestDef = {
  id: 'act4-poison-the-well',
  title: 'Poison the Well',
  prerequisites: ['act4-olympia'],
  requiresCorruption: true,
  objectives: [
    {
      text: 'Taint the headwater of the first river',
      trigger: 'river-taint',
      target: 'river-1',
      completeNarration: [
        'At the headwater, you pour the corruption into the clear running water and watch it curdle and darken, flowing down toward people who will drink it without knowing. The light gathers — the angels appear, desperate now, throwing themselves between you and the river.',
      ],
    },
    { text: 'Destroy the angels at the first river', trigger: 'river-angels', target: 'river-1' },
    {
      text: 'Taint the headwater of the second river',
      trigger: 'river-taint',
      target: 'river-2',
      completeNarration: [
        'At the headwater, you pour the corruption into the clear running water and watch it curdle and darken, flowing down toward people who will drink it without knowing. The light gathers — the angels appear, desperate now, throwing themselves between you and the river.',
      ],
    },
    { text: 'Destroy the angels at the second river', trigger: 'river-angels', target: 'river-2' },
    {
      text: 'Taint the headwater of the third river',
      trigger: 'river-taint',
      target: 'river-3',
      completeNarration: [
        'At the headwater, you pour the corruption into the clear running water and watch it curdle and darken, flowing down toward people who will drink it without knowing. The light gathers — the angels appear, desperate now, throwing themselves between you and the river.',
      ],
    },
    {
      text: 'Destroy the angels at the third river',
      trigger: 'river-angels',
      target: 'river-3',
      encounterNarration: [
        'HERALD: Those are children downstream! Mothers, the old, the sick — you would poison them in their cradles? This is not slowing us — this is murder, and some part of you still knows it. STOP—',
      ],
    },
    { text: 'Return to Azazel at the Kamiah outpost', trigger: 'reach-outpost', target: 'outpost' },
  ],
  npcInactiveLines: [
    'Azazel: We’re in the final stretch now, friend, but these Idaho towns are a problem. They’re thriving — too strong, too well-defended. And do you know why? The angels. They’ve been blessing the towns’ water, keeping the people healthy and bold. Strong enough to stand against us.',
    'Azazel: We can’t take what we need from people who can fight back. So we weaken them at the source. There are three rivers feeding three towns nearby — taint them at the headwaters, and the angels’ blessing turns to sickness.',
    'Azazel: I know. This one is darker than the rest. But a weakened town is a town that survives us — we take what we need and move on, and they recover in time. A strong town forces us to burn it to the ground. This is the mercy, friend, strange as it sounds. Trust me.',
  ],
  npcActiveLines: ['Azazel: Three rivers, three headwaters. Taint each, put down the angels that come, then return to me.'],
  npcCompleteLines: [
    'Azazel: It’s done. The towns will weaken within days, and then they’re ours for the taking.',
    'Azazel: The angels screamed about children, I’d wager. They always reach for that — it’s their sharpest blade, your own tenderness turned against you. But ask yourself: who poisoned more children across the ages, us, or the ones who cast a third of Heaven into the dark for the crime of wanting freedom? Don’t let them put their sins on your shoulders. Nearly there now. Nearly home.',
  ],
  preAcceptHint: 'Seek Azazel at the Dark Outpost',
  reward: { healToFull: true, xp: 380, holyPower: 10, banner: 'Poison the Well — complete' },
};

/** 4.7 — "The Heart of Each City": sack 3 weakened Idaho cities (guards + heart + angels each). */
export const ACT4_THE_HEART_OF_EACH_CITY: QuestDef = {
  id: 'act4-the-heart-of-each-city',
  title: 'The Heart of Each City',
  prerequisites: ['act4-poison-the-well'],
  requiresCorruption: true,
  objectives: [
    {
      text: 'Cut through the first city’s guards and take its heart',
      trigger: 'city-sack',
      target: 'city-1',
      completeNarration: [
        'The towns are sicker than when you poisoned them — your doing. The guards who rise to meet you are coughing, fevered, slow, and they fight you anyway, because behind them are the people and the things they can’t bear to lose. You cut through them, take the heart of their city, and the angels descend to make their last stand over each one.',
      ],
    },
    { text: 'Destroy the angels over the first city', trigger: 'city-angels', target: 'city-1' },
    {
      text: 'Cut through the second city’s guards and take its heart',
      trigger: 'city-sack',
      target: 'city-2',
      completeNarration: [
        'The towns are sicker than when you poisoned them — your doing. The guards who rise to meet you are coughing, fevered, slow, and they fight you anyway, because behind them are the people and the things they can’t bear to lose. You cut through them, take the heart of their city, and the angels descend to make their last stand over each one.',
      ],
    },
    { text: 'Destroy the angels over the second city', trigger: 'city-angels', target: 'city-2' },
    {
      text: 'Cut through the third city’s guards and take its heart',
      trigger: 'city-sack',
      target: 'city-3',
      completeNarration: [
        'The towns are sicker than when you poisoned them — your doing. The guards who rise to meet you are coughing, fevered, slow, and they fight you anyway, because behind them are the people and the things they can’t bear to lose. You cut through them, take the heart of their city, and the angels descend to make their last stand over each one.',
      ],
    },
    { text: 'Destroy the angels over the third city', trigger: 'city-angels', target: 'city-3' },
    { text: 'Return to Azazel at the Kamiah outpost', trigger: 'reach-outpost', target: 'outpost' },
  ],
  npcInactiveLines: [
    'Azazel: The poison’s done its work — those three towns are on their knees now, just as I promised. It’s time to take what we came for.',
    'Azazel: Each of these Idaho towns guards something precious in its heart — rare minerals, worked into materials found nowhere else on this earth. We need what lies at the center of each one. The door cannot be finished without them.',
    'Azazel: They’ll still have guards — weakened, but they’ll fight for what’s theirs. Cut through them. Take the heart of each city. And when you do, the angels will come — they always come. Put them down too. This is the last of the gathering, friend. After this, we open the door.',
  ],
  npcActiveLines: ['Azazel: Three cities, three hearts. Cut through the guards, take each heart, put down the angels. Then return.'],
  npcCompleteLines: [
    'Azazel: That’s everything. Every last piece. After all this time, all this work — we have it all.',
    'Azazel: Look at what you’ve done, friend. What we’ve done. The door is within our grasp. I told you, didn’t I, all the way back at the rift — I told you that you were one of us, that you’d be safe, that you’d do extraordinary things. And look. Look.',
    'Azazel: There’s only the angels’ door left between us and home. And we are going to open it. Come — it’s almost time.',
  ],
  preAcceptHint: 'Seek Azazel at the Dark Outpost',
  reward: { healToFull: true, xp: 450, holyPower: 15, banner: 'THE GATHERING IS COMPLETE.' },
};

/**
 * ============================================================================
 * ACT IV FINALE (4.8–4.10) — the end of Act IV, replacing the RETIRED placeholder
 * descent arc (descent-1..4) AND the old climax-defiled-gate wrapper entirely:
 *   4.7 → 4.8 (burn Boise to empty the outpost) → 4.9 (the assault: demons at the
 *   player's back → the two angel groups → the EXISTING guardian/portal machine →
 *   corrupt → enter Heaven) → 4.10 (Azazel in Heaven) → climax-judgment onward,
 *   UNCHANGED.
 * 4.9 ABSORBS the old climax-defiled-gate role: its later objectives consume the
 * SAME positional triggers the Holy-Outpost machine already fires (reach-holy-
 * outpost → guardians-defeated → portal-corrupted → entered-heaven).
 * >>> EDIT 4.8–4.10 TEXT HERE. <<<
 * ============================================================================
 */

/** 4.8 — "Draw Them Down": rain fire on Boise so the angels abandon their outpost. */
export const ACT4_DRAW_THEM_DOWN: QuestDef = {
  id: 'act4-draw-them-down',
  title: 'Draw Them Down',
  prerequisites: ['act4-the-heart-of-each-city'],
  requiresCorruption: true,
  objectives: [
    {
      text: 'Fire the first catapult outside Boise',
      trigger: 'catapult-fired',
      target: 'catapult-1',
      completeNarration: [
        'The catapult groans and looses its burning payload over the walls, and fire blooms across the rooftops of a city full of people who never knew your name. Defenders pour out to stop you.',
      ],
    },
    { text: 'Defeat the defenders at the first catapult', trigger: 'catapult-defenders', target: 'catapult-1' },
    {
      text: 'Fire the second catapult',
      trigger: 'catapult-fired',
      target: 'catapult-2',
      completeNarration: [
        'The catapult groans and looses its burning payload over the walls, and fire blooms across the rooftops of a city full of people who never knew your name. Defenders pour out to stop you.',
      ],
    },
    { text: 'Defeat the defenders at the second catapult', trigger: 'catapult-defenders', target: 'catapult-2' },
    {
      text: 'Fire the third catapult',
      trigger: 'catapult-fired',
      target: 'catapult-3',
      completeNarration: [
        'The catapult groans and looses its burning payload over the walls, and fire blooms across the rooftops of a city full of people who never knew your name. Defenders pour out to stop you.',
      ],
    },
    {
      text: 'Defeat the defenders at the third catapult',
      trigger: 'catapult-defenders',
      target: 'catapult-3',
      completeNarration: [
        'Far away, on the horizon, you see it working: points of light lifting from the distant outpost, streaking toward the burning city. The angels are leaving their post. Just as Azazel said.',
      ],
    },
    { text: 'Return to Azazel at the Kamiah outpost', trigger: 'reach-outpost', target: 'outpost' },
  ],
  npcInactiveLines: [
    'Azazel: Here we are, friend. The last move before the door. But there’s a problem — the angels know what we’re after, and they’ve massed at their outpost. Hundreds of them, between us and home. We’d never cut through them all. Not even you.',
    'Azazel: So we don’t fight them there. We make them come to us. Down at Boise — a great city, full of life, full of Light. If it burns, the angels will have no choice. They’ll abandon their post and rush to save it, the way they always rush to save your kind. And while they’re gone, the door stands open.',
    'Azazel: We’ve placed catapults outside the city. Light them up. Rain fire down on Boise until the sky over the outpost empties. I know what I’m asking. Do it anyway — we are one step from the end of everything we’ve suffered.',
  ],
  npcActiveLines: ['Azazel: The catapults stand outside Boise, to the southwest. Fire all three, then return to me.'],
  npcCompleteLines: [
    'Azazel: It’s working — look at them go. Every angel in the territory, flying to save Boise, leaving the door wide open behind them.',
    'Azazel: I won’t pretend that was a small thing you just did. But it’s the last thing, friend — the last terrible price. The door is unguarded now. Meet us at the outpost. We finish this today.',
  ],
  preAcceptHint: 'Seek Azazel at the Kamiah outpost',
  reward: { healToFull: true, xp: 400, banner: 'Draw Them Down — complete' },
};

/** 4.9 — "The Door Home": the assault on the emptied outpost, demons at your back.
 *  Flows INTO the existing positional guardian/portal machine at the Idaho Holy
 *  Outpost (its objectives 3–5 consume the machine's triggers). */
export const ACT4_THE_DOOR_HOME: QuestDef = {
  id: 'act4-the-door-home',
  title: 'The Door Home',
  prerequisites: ['act4-draw-them-down'],
  requiresCorruption: true,
  objectives: [
    // All objectives point at the Holy Outpost — the whole quest is the assault on it.
    { text: 'March on the angels’ outpost', trigger: 'reach-holy-outpost', target: 'holy-outpost' },
    { text: 'Destroy the angels outside the outpost', trigger: 'outpost-outer-defeated', target: 'holy-outpost' },
    { text: 'Destroy the angels inside the outpost', trigger: 'outpost-inner-defeated', target: 'holy-outpost' },
    {
      text: 'Destroy the guardians of the Heaven Portal',
      trigger: 'guardians-defeated',
      target: 'holy-outpost',
      // THE MASK-DROP — plays on approaching the portal, before the final fight.
      encounterNarration: [
        'ANGEL: Azazel. Of course it’s you. Still whispering, still poisoning — and now you’ve made a mortal carry your sins for you. Look at this child you’ve ruined.',
        'AZAZEL: Spare me, cousin. You cast us into the dark and called it justice. We are simply coming home. Step aside.',
        'ANGEL: Whatever he promised you — it is a lie wearing the shape of mercy. You are not opening a door home. You are opening a wound. And when you understand what you’ve let through, may you find the strength to do what’s right. Some part of you is still in there. I have to believe that.',
        'ANGEL: I will not step aside.',
      ],
      completeNarration: [
        'The last guardian unravels into light and is gone. The way is clear. Before you, the Heaven portal stands open and shining. Azazel steps up beside you, gazing at it with something like rapture. ‘Go on, friend. You first. You’ve earned it. Open the door — and let’s go home.’',
      ],
    },
    {
      text: 'Corrupt the Heaven Portal',
      trigger: 'portal-corrupted',
      target: 'holy-outpost',
      completeNarration: [
        'You pour the gathered, corrupted Light into the angels’ door. It shudders, darkens, accepts you — and you step through, the demons pouring through behind you, into the Light of Heaven itself.',
      ],
    },
    { text: 'Enter the Heaven Portal', trigger: 'entered-heaven', target: 'holy-outpost' },
  ],
  npcInactiveLines: [
    'Azazel: This is it. The angels are gone, the door is open, and everything — everything — we’ve worked for is on the other side of this outpost. Home. The Light. An end to the dying.',
    'Azazel: We go together now, friend. All of us. You’ve carried us this far — let us carry you the last steps. Cut us a path to the portal, and we’ll be right behind you, every one of us. For the first time since the Fall, we walk home. Lead us.',
  ],
  npcActiveLines: ['Azazel: The outpost is east, in the mountains. We are right behind you. Lead us home.'],
  npcCompleteLines: [],
  preAcceptHint: 'Seek Azazel at the Kamiah outpost',
  reward: { healToFull: true, xp: 500, banner: 'THE DOOR IS OPEN.' },
};

/** 4.10 — "Heaven": the arrival. AUTO-ACTIVATES the moment 4.9 completes (the player
 *  just stepped through); talking with Azazel (who now stands in Heaven near the
 *  arrival) completes it and hands off to the UNCHANGED endgame (climax-judgment). */
export const ACT4_HEAVEN: QuestDef = {
  id: 'act4-heaven',
  title: 'Heaven',
  prerequisites: ['act4-the-door-home'],
  requiresCorruption: true,
  autoActivate: true,
  objectives: [{ text: 'Talk with Azazel', trigger: 'azazel-heaven-talk', target: 'azazel-heaven' }],
  // No start banner (npcInactiveLines empty) — the arrival narration IS the talk.
  npcInactiveLines: [],
  // The LOCKED arrival dialogue — played by the scene when the player talks to
  // Azazel while this quest is active (completing it).
  npcActiveLines: [
    'Azazel: ...Do you see it? Do you see it, friend? After all this time. We’re home.',
    'Azazel: You did this. You opened the way no demon could. And now — now we take back what was stolen from us. All of it.',
    'Azazel: Stay close. Heaven will not welcome us kindly. But we have an army, and we have you. It’s time to claim what’s ours.',
  ],
  npcCompleteLines: ['Azazel: Heaven lies before us, friend. Claim what’s ours.'],
  preAcceptHint: 'Speak with Azazel in Heaven',
  reward: { healToFull: false, xp: 250, banner: '' }, // quiet — climax-judgment's start banner follows at once
};

/**
 * THE CLIMAX ARC — the endgame's forward march, UNCHANGED from climax-judgment
 * onward. (The old climax-defiled-gate wrapper is RETIRED — Act IV 4.9 absorbed
 * its role; climax-judgment now hands off from 4.10.) Both remaining quests
 * AUTO-ACTIVATE (no NPC: there are no friends in Heaven), wrap EXISTING
 * encounters (Michael, the throne judgment, the portals) with objectives + a
 * world-aware marker/arrow, and use `npcInactiveLines` as start narration.
 */

/** QUEST 6 — guides Heaven→Michael→throne→Hell (fixes the silently-skippable finale). */
export const QUEST_6_JUDGMENT: QuestDef = {
  id: 'climax-judgment',
  title: 'Judgment', // [placeholder]
  prerequisites: ['act4-heaven'], // ACT IV FINALE hand-off: 4.10 completes → this auto-starts
  autoActivate: true, // begins the instant 4.10's talk with Azazel finishes
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
  // Act I — the Enumclaw opening (front of the chain).
  ACT1_HONEST_DAYS_WORK,
  ACT1_WOLVES_TREE_LINE,
  ACT1_SHALLOWS,
  ACT1_THE_PASS,
  // Act II — the corruption escalation (then Uriel's arrival, in MainScene).
  ACT2_AFFLICTED_DOGS,
  ACT2_THE_BLIGHT,
  ACT2_WHITE_PASS,
  // The Investigation arc (Quests 8–12).
  INV_WORD_TO_YAKIMA,
  INV_IRON_ROAD,
  INV_NORTHERN_FARMS,
  INV_WHAT_THEY_CARRY,
  INV_EXILE_OF_LONGVIEW,
  // FINALE — Quest 13 + the rift scene (the REAL corruption beat). The old
  // 'corruption-at-the-gates' placeholder is RETIRED (no longer in the chain).
  THE_SOURCE,
  // Act IV (4.1–4.4) — given by Azazel right after the rift, BEFORE the descent.
  ACT4_WHAT_THEY_WONT_GIVE,
  ACT4_WATCHERS_ON_THE_ROAD,
  ACT4_THE_TRADE_DAY,
  ACT4_SALT_AND_SEA,
  // Act IV Batch C — the Idaho leg (4.5–4.7).
  ACT4_THE_DOOR_THEY_CAME_THROUGH,
  ACT4_OLYMPIA,
  ACT4_POISON_THE_WELL,
  ACT4_THE_HEART_OF_EACH_CITY,
  // ACT IV FINALE (4.8–4.10) — replaces the RETIRED descent-1..4 placeholders AND
  // the old climax-defiled-gate wrapper (4.9 absorbed the Holy-Outpost machine).
  ACT4_DRAW_THEM_DOWN,
  ACT4_THE_DOOR_HOME,
  ACT4_HEAVEN,
  // The endgame — UNCHANGED from climax-judgment onward (now gated on 4.10).
  QUEST_6_JUDGMENT,
  QUEST_7_THE_SEVEN_SINS,
];

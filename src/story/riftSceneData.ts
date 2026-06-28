/**
 * THE RIFT SCENE (Batch 4 finale) — the REAL corruption beat that replaces the old
 * Sasquatch/angel placeholder. It plays once, on arrival at the N-Oregon rift
 * (Quest 13), and reuses the scripted-dialogue/cutscene pattern (DialogueBox /
 * ChoicePrompt) + the boss framework (Semyaza). The corruption grant —
 * setPlayerPath('corrupted') + Spirit Vision — now lives ONLY here (step (f)).
 *
 * Sequence: approach → Semyaza fight (halts near death) → the lie → Uriel's
 * counter → Semyaza's offer → THE CHOICE (the player's first spoken line) → take
 * the Light (corruption grant) → Uriel's judgment + vanish → Azazel's arrival →
 * close. See MainScene.startRiftScene() and onward.
 *
 * >>> EDIT THE RIFT SCENE'S TEXT HERE. The patron's name is "Azazel" (renamed from
 *     "Hollow Pilgrim"); his descent-quest dialogue lives in questData.ts. <<<
 */

/** Q13 — Uriel's send-off, PRE-WARNING the player about the coming deception. */
export const URIEL_SENDOFF_LINES = [
  'Uriel: You have done well. You have traced their hunger to its edge. Now you must follow it to its heart.',
  'Uriel: I have felt where the corruption runs deepest — south and east, beyond the mountains, in the high country of northern Oregon. That is where the dark ones fester. That is where they came through.',
  'Uriel: Go there, and you will find the root of all of it. Burn it out, and this affliction ends. I will be with you — closer now than ever. The end of this is near.',
  'Uriel: ...Whatever you find there, remember what you have seen with your own eyes. Remember what they are. The dark ones are not what they may claim to be.',
];

export const RIFT_SCENE = {
  /** (a) Arrival narration. */
  approach: [
    'The forest is gone. Only a waste of grey ash and black stone remains — and at its heart, a wound in the world: a rift, tall as a tree, bleeding cold light into the air. Around it the dark ones labor, and among their works stand the containers — dozens of them, the vessel you carried to Longview, all waiting to be filled. This is the source. This is the heart of it.',
  ],
  /** Banner shown as the fight begins. */
  fightBanner: 'Semyaza, lord of the dark ones, turns to face you.',
  /** (c) The lie — Semyaza, broken but unafraid. */
  lie: [
    'Semyaza: Wait. Wait. Before you strike — look at me. Truly look. And ask why a thing you’ve been told is a monster would beg you to listen instead of fight.',
    'Semyaza: You’ve seen us take the Light. Your angel told you we feed on it, like animals. He did not tell you why. He did not tell you the Light was ours — that we were radiant once, bright as he is now. We stood in Heaven. We were home.',
    'Semyaza: They took it from us. Drained the Light from our bodies and cast us out — not for any crime, but because we asked for too much. For freedom. This — this is not what evil looks like. This is what anything looks like once everything is stripped away. We are not dark by nature. We are dark because we are empty.',
    'Semyaza: We don’t want your world. We never did. We only want to go home — to stand in the Light again, to drink from the fountain that was ours before it was ever theirs. That is all. That is everything.',
  ],
  /** (d) Uriel's counter — flat, certain. */
  urielCounter: [
    'Uriel: These are lies. Every word. Do not listen. Finish them now, or forever seal your fate.',
  ],
  /** (e) Semyaza's offer. */
  offer: [
    'Semyaza: Of course he says that. The thief always calls the robbed a liar.',
    'Semyaza: I am dying — you’ve seen to that. But a little Light remains in me, the last of what they couldn’t take. Let me give it to you. Freely. No chains, no price.',
    'Semyaza: Think what you could do with it. You’ve spent your whole life protecting them — your town, your people, every child who ever called your name. Imagine how many more you could save with real power. Imagine the good. Look at all the good you could do.',
  ],
  /** (f) THE CHOICE — story-forced (no refuse). The button + the player's first line. */
  choicePrompt: 'Semyaza holds out the last of its Light.',
  choiceTake: 'Take the Light',
  playerLine: ['You: ...Are you sure?'],
  /** (f cont.) The corruption grant text (shown as Spirit Vision turns ON). */
  takeLight: [
    'You take the Light from Semyaza’s outstretched hand. It is given freely. It floods into you — cold, vast, and terribly alive — and the world changes. You can see through it now: spirits at the edges of sight, the hidden layer beneath the seen. Spirit Vision is yours. You have never felt so powerful.',
    'Semyaza smiles, and fades — spent, its last Light now burning in you.',
  ],
  /** (g) Uriel's judgment, then he vanishes. */
  urielJudgment: [
    'Uriel: ...So. This was your choice.',
    'Uriel: I warned you what they were. You heard them, believed them, and took their power into yourself of your own will. There is nothing more I can do for you now.',
    'Uriel: You now face judgment.',
  ],
  /** (h) Azazel arrives — warm, the patron (renamed from Hollow Pilgrim). */
  azazel: [
    'Azazel: Well, well. Well.',
    'Azazel: You felt that — one of theirs, gone and joined us. Do you know how rare that is? Easy, now. You’re one of us — that means you’re safe, maybe for the first time in your life. No more taking orders from things that look down on you.',
    'Azazel: But not here. Mortals can’t cross the rift — not yet. We’ve work to do first, you and I. Go south, outside the big city, near the mountain. I’ll be waiting. And friend— welcome home.',
  ],
  /** (i) Close. */
  close: [
    'The rift’s cold light washes over you, alone in the ruin, changed. Whatever you were walking into these woods, you are something else walking out.',
  ],
} as const;

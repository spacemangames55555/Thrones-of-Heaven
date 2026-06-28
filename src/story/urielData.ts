/**
 * URIEL'S ARRIVAL — the scripted scene that plays once, in the Enumclaw square,
 * after Act II's final quest ("The Thing at White Pass") completes. It is purely
 * NARRATIVE: it grants no power, sets no alignment, and does NOT turn on Spirit
 * Vision (the player is still good here). The scene reuses the existing
 * scripted-dialogue/cutscene pattern (DialogueBox), exactly like the throne /
 * God's-judgment beat — see MainScene.playUrielScene().
 *
 * >>> TO REWRITE URIEL'S SCENE: edit the strings below. The intro/outro are scene
 *     narration; `lines` are Uriel speaking. No code changes needed. <<<
 */
export const URIEL_SCENE = {
  /** Trigger radius (px) from the town square within which the queued scene fires. */
  triggerRange: 150,

  /** Scene narration as the light gathers (shown before Uriel speaks). */
  intro: [
    'A light gathers in the square, and the air goes still. The townsfolk fall quiet. And then it is simply there, standing among you — a figure of quiet brightness, taller than a man. Where the dark ones drank the light, this being carries it. Every soul in the square knows at once that they are small before it.',
  ],

  /** Uriel's lines — commanding, not unkind. */
  lines: [
    'Uriel: Do not be afraid. I am Uriel. I am sent to you.',
    'Uriel: The dark ones you have seen are no sickness, no madness of nature. They are the dead. They feed on the Light — the life of all things — and what they take does not return. Left unchecked, they will hollow this valley until nothing living remains.',
    'Uriel: But you stood against them when others fled. I have watched you — since you bore a neighbor’s burden down a long road, since you turned back the wolf and the raider. And I have chosen you.',
    'Uriel: Find where the dark ones fester, and burn it out at the root. I will guide your hand. Heed me, and your home may yet be saved. Turn away, and Enumclaw will be the first of many to fall. The choice is yours.',
    'Uriel: Go. You are not alone in this. You never were.',
  ],

  /** Closing narration as Uriel departs. */
  outro: [
    'The light folds in upon itself, and Uriel is gone — as though the brightness had only ever been borrowed from the air. The square is quiet. But the cold at the edge of the valley has not lifted, and everyone here knows it.',
  ],
} as const;

/**
 * Spirit entities — DATA, not code.
 *
 * Each entry is one spiritual being that exists at a real world position on the
 * same map as everything else, but is only perceptible when Spirit Vision is on.
 *
 * >>> TO ADD MORE SPIRITS: append objects to SPIRIT_ENTITIES below. No engine
 *     code changes are needed — SpiritVision reads this list and spawns each. <<<
 *
 * Coordinates are world pixels (tile * 16 + 8 for a tile centre). The seeded
 * one sits on the corrupted ground beside the eastern Corruption Rift in Seattle.
 */
export interface SpiritEntityData {
  id: string;
  /** World pixel position. */
  x: number;
  y: number;
  /** Tint for the ghostly placeholder sprite. */
  color: number;
  /** Display name (shown above the spirit when revealed, and in dialogue). */
  name: string;
  /** Default dialogue lines (placeholder — hints at the corruption/evil arc). */
  lines: string[];
  /** Dialogue shown once the player has taken the corrupted (dark) path. */
  corruptedLines?: string[];
}

/** Id of the seeded Oregon spirit — the stub quest "A Path Opens" points at it. */
export const OREGON_SPIRIT_ID = 'oregon-shade';

/** Azazel's HOME (stage-1) position — must match the 'oregon-shade' entry below.
 *  His later stations (Kamiah from 4.5, Heaven after 4.9) are applied by
 *  MainScene.updatePatronLocation via SpiritEntity.moveTo. */
export const PATRON_HOME_POSITION = { x: 12048, y: 13456 };

export const SPIRIT_ENTITIES: SpiritEntityData[] = [
  {
    id: 'rift-wraith',
    // World pixels at 32px tiles: tile (316,165) on the corrupted ground at the
    // eastern gate of Seattle, by the rift (tile*32 + 16 for the tile centre).
    x: 10128,
    y: 5296,
    color: 0xb38cff,
    name: 'Pale Wraith',
    lines: [
      'Pale Wraith: So... one who can see. Most walk past and never feel the cold.',
      'Pale Wraith: The rift was no accident. Something on the far side pried it open.',
      'Pale Wraith: It drinks a little more of this town each night, and no living eye marks it.',
      'Pale Wraith: You perceive me now — so you are already part of this. Choose your side with care.',
    ],
    corruptedLines: [
      'Pale Wraith: Ahh. You refused the bright one. I felt the light go out of your road.',
      'Pale Wraith: Good. Now your eyes are open for as long as you draw breath — there is no closing them.',
      'Pale Wraith: The dark has need of hands that can see it work. Come. Let me show you what feeds here.',
    ],
  },
  {
    // OREGON SEED — proves the spirit-layer corridor extends south. Sits in the
    // Willamette Valley just SOUTH of Portland (city tile 376,409 → world
    // 12048,13104; this spirit is ~11 tiles south at tile 376,420). Visible and
    // talkable ONLY with Spirit Vision on. >>> EDIT ITS DIALOGUE HERE. <<<
    id: 'oregon-shade',
    x: 12048,
    y: 13456,
    color: 0x8cd0ff,
    name: 'Azazel',
    lines: [
      'Azazel: You followed it south. Few do. Fewer still can see me to know they have.',
      'Azazel: The rift at Seattle was only the wound. This — Oregon — is the long throat beneath it.',
      'Azazel: Keep descending and the world thins to spirit. This is the road the marked are meant to walk.',
      'Azazel: I am only the first marker on it. What waits further down has been waiting a very long time.',
    ],
    corruptedLines: [
      'Azazel: Marked already — good. Then you feel it too, the pull downward.',
      'Azazel: Walk on when you are ready. The descent does not open for the living, only for the claimed.',
    ],
  },
];


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
  /** Dialogue lines (placeholder — hints at the corruption/evil arc). */
  lines: string[];
}

export const SPIRIT_ENTITIES: SpiritEntityData[] = [
  {
    id: 'rift-wraith',
    x: 5064, // corrupted ground at the eastern gate of Seattle, by the rift
    y: 2648,
    color: 0xb38cff,
    name: 'Pale Wraith',
    lines: [
      'Pale Wraith: So... one who can see. Most walk past and never feel the cold.',
      'Pale Wraith: The rift was no accident. Something on the far side pried it open.',
      'Pale Wraith: It drinks a little more of this town each night, and no living eye marks it.',
      'Pale Wraith: You perceive me now — so you are already part of this. Choose your side with care.',
    ],
  },
];

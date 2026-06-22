/**
 * Anything the player can walk up to and talk with via the shared dialogue
 * flow: the real NPC and (when Spirit Vision is on) spirit entities both
 * implement this, so MainScene drives them with one proximity/talk path.
 */
export interface Interactable {
  /** Distance in world pixels from the given world point. */
  distanceTo(x: number, y: number): number;
  /** Dialogue lines shown when talked to. */
  readonly lines: string[];
}

import { SIN_DEFS } from './sinsData';

/**
 * THE SIN GAUNTLET — the central, serializable order-state for the Deadly-Sin
 * bosses (Section 6: state centralized + serializable).
 *
 * `sinsDefeated` (0..SINS_TOTAL) is the only stored value: Sin N (1-based) is
 * locked until `sinsDefeated >= N-1`, so they're fought in order and each unlocks
 * the next. This batch authors the first {@link SIN_DEFS}.length Sins; defeating
 * the last built one just advances the count (no further content yet).
 */
export class SinGauntlet {
  /** How many Sins have been defeated so far (the serializable gauntlet cursor). */
  private defeated = 0;

  /** Number of Sins actually BUILT this batch (Wrath/Sloth/Gluttony = 3). */
  get builtCount(): number {
    return SIN_DEFS.length;
  }

  /** Defeated-so-far count (0..). */
  get count(): number {
    return this.defeated;
  }

  /** 0-based index of the Sin currently available to fight, or -1 if none remain. */
  get nextIndex(): number {
    return this.defeated < SIN_DEFS.length ? this.defeated : -1;
  }

  /** Has Sin `i` (0-based) been unlocked (its predecessor defeated)? */
  isUnlocked(i: number): boolean {
    return i <= this.defeated;
  }

  /** Has Sin `i` (0-based) already been defeated? */
  isDefeated(i: number): boolean {
    return i < this.defeated;
  }

  /**
   * Record a defeat of Sin `i`. Only advances when `i` is the next-expected Sin,
   * so dev-testing a later Sin out of order never corrupts the cursor.
   */
  recordDefeat(i: number): void {
    if (i === this.defeated) this.defeated = Math.min(this.defeated + 1, SIN_DEFS.length);
  }

  /** Reset the gauntlet to the start (dev "Reset Sins" + dev reset). */
  reset(): void {
    this.defeated = 0;
  }

  /** Serializable snapshot. */
  toJSON(): { sinsDefeated: number } {
    return { sinsDefeated: this.defeated };
  }

  /** Restore from a snapshot. */
  load(data: { sinsDefeated: number }): void {
    this.defeated = data.sinsDefeated;
  }
}

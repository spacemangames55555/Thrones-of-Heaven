/**
 * A reusable health pool. Generic across the player and any enemy.
 */
export class Health {
  max: number;
  current: number;
  /** Multiplier applied to incoming damage (1 = none). Skill damage-reduction sets
   *  this below 1 so every damage source is reduced centrally (no combat-site edits). */
  incomingMultiplier = 1;

  constructor(max: number) {
    this.max = max;
    this.current = max;
  }

  /**
   * Change the maximum pool (e.g. when the player levels up). Current HP is kept
   * but clamped to the new max; callers that want a heal call full() after.
   */
  setMax(max: number): void {
    this.max = max;
    this.current = Math.min(this.current, max);
  }

  get ratio(): number {
    return this.max > 0 ? this.current / this.max : 0;
  }

  get isDead(): boolean {
    return this.current <= 0;
  }

  /** Apply damage (scaled by incomingMultiplier); returns the amount actually removed. */
  damage(amount: number): number {
    const before = this.current;
    this.current = Math.max(0, this.current - amount * this.incomingMultiplier);
    return before - this.current;
  }

  heal(amount: number): void {
    this.current = Math.min(this.max, this.current + amount);
  }

  full(): void {
    this.current = this.max;
  }
}

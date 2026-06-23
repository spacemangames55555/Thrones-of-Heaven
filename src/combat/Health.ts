/**
 * A reusable health pool. Generic across the player and any enemy.
 */
export class Health {
  max: number;
  current: number;

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

  /** Apply damage; returns the amount actually removed (clamped at 0). */
  damage(amount: number): number {
    const before = this.current;
    this.current = Math.max(0, this.current - amount);
    return before - this.current;
  }

  heal(amount: number): void {
    this.current = Math.min(this.max, this.current + amount);
  }

  full(): void {
    this.current = this.max;
  }
}

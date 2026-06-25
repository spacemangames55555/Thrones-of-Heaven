/**
 * A reusable health pool. Generic across the player and any enemy.
 */
export class Health {
  max: number;
  current: number;
  /** Multiplier applied to incoming damage (1 = none). Skill damage-reduction sets
   *  this below 1 so every damage source is reduced centrally (no combat-site edits). */
  incomingMultiplier = 1;
  /** Chance [0..1] to BLOCK an incoming hit (skill-driven; default 0 = never). */
  blockChance = 0;
  /** Fraction of a blocked hit negated (0.8 = a block removes 80% of the damage). */
  blockReduction = 0;
  /** Optional hook fired when a hit is blocked (for a visual flash). */
  onBlock?: () => void;

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

  /** Apply damage (scaled by incomingMultiplier, then a chance to block); returns removed. */
  damage(amount: number): number {
    let amt = amount * this.incomingMultiplier;
    if (this.blockChance > 0 && Math.random() < Math.min(0.9, this.blockChance)) {
      amt *= 1 - this.blockReduction;
      this.onBlock?.();
    }
    const before = this.current;
    this.current = Math.max(0, this.current - amt);
    return before - this.current;
  }

  heal(amount: number): void {
    this.current = Math.min(this.max, this.current + amount);
  }

  full(): void {
    this.current = this.max;
  }
}

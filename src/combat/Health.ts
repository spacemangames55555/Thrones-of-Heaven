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
  /** Optional hook fired when damage is actually taken (amount removed > 0). */
  onDamaged?: (amount: number) => void;
  /** Optional REDIRECT hook (Witch Doctor ally-bond): siphons part of the
   *  post-multiplier damage to another pool BEFORE block/shield/HP; returns the
   *  amount redirected (subtracted from what this pool then takes). Unset = none. */
  redirect?: (amount: number) => number;
  /** Absorb pool (Mana Shield): post-multiplier/block damage drains this BEFORE current
   *  HP. Default 0 = no shield. The scene tops it up on cast and clears it on expiry. */
  shield = 0;

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
    // ALLY-BOND redirect: part of the hit lands elsewhere before block/shield/HP.
    if (this.redirect && amt > 0) amt = Math.max(0, amt - this.redirect(amt));
    if (this.blockChance > 0 && Math.random() < Math.min(0.9, this.blockChance)) {
      amt *= 1 - this.blockReduction;
      this.onBlock?.();
    }
    // Mana Shield absorbs first (a separate pool in front of HP).
    if (this.shield > 0) {
      const absorbed = Math.min(this.shield, amt);
      this.shield -= absorbed;
      amt -= absorbed;
    }
    const before = this.current;
    this.current = Math.max(0, this.current - amt);
    const removed = before - this.current;
    if (removed > 0) this.onDamaged?.(removed);
    return removed;
  }

  heal(amount: number): void {
    this.current = Math.min(this.max, this.current + amount);
  }

  full(): void {
    this.current = this.max;
  }
}

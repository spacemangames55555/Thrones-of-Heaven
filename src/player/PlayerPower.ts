/**
 * THE POWER STATE — the player's alignment, centralized + serializable.
 *
 * The player plays the whole game as "demonic". At God's judgment (the throne
 * beat) a SWAP flips this to "holy": existing abilities re-skin golden and the
 * Holy Bolt unlocks. The swap does NOT change power level (level/HP/damage/
 * energy/holy-power are untouched) — only this alignment flag, the kit's
 * appearance, and the presence of the Holy Bolt. Once holy, the player stays
 * holy (this state persists across world transitions); a dev reset reverts it.
 */
export type PowerAlignment = 'demonic' | 'holy';

export class PlayerPower {
  private alignment: PowerAlignment = 'demonic';

  get state(): PowerAlignment {
    return this.alignment;
  }

  /** True once the throne swap (or the dev grant) has made the player holy. */
  get isHoly(): boolean {
    return this.alignment === 'holy';
  }

  /** Perform the swap to holy. Returns true if it actually changed (idempotent). */
  swapToHoly(): boolean {
    if (this.alignment === 'holy') return false;
    this.alignment = 'holy';
    return true;
  }

  /** Revert to the demonic default (dev "Reset to Demonic" + dev reset). */
  reset(): void {
    this.alignment = 'demonic';
  }

  /** Serializable snapshot (Section 6: state centralized + serializable). */
  toJSON(): { alignment: PowerAlignment } {
    return { alignment: this.alignment };
  }

  /** Restore from a snapshot. */
  load(data: { alignment: PowerAlignment }): void {
    this.alignment = data.alignment;
  }
}

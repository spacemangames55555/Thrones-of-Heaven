/**
 * Holy Power — a single centralized, SERIALIZABLE counted quest item. It is the
 * seed of a future inventory, but deliberately kept to ONE tracked count for now
 * (no item bag, no multiple item types). State lives here, separate from
 * rendering; the HUD reads {@link count} and refreshes on {@link onChange}.
 *
 * A later inventory would either add more of these counters or generalize this
 * into a Map<itemType, number> — the serialization shape is ready for it.
 */
export class HolyPower {
  private value = 0;

  /** Fired whenever the count changes (HUD refresh hook). */
  onChange?: () => void;

  get count(): number {
    return this.value;
  }

  /** Add (or, with a negative amount, subtract — clamped at 0) to the count. */
  add(amount: number): void {
    this.value = Math.max(0, this.value + amount);
    this.onChange?.();
  }

  /** Reset to zero (dev reset). */
  reset(): void {
    this.value = 0;
    this.onChange?.();
  }

  // --- Serialization (for the future save system) ---------------------------

  toJSON(): { holyPower: number } {
    return { holyPower: this.value };
  }

  load(state: { holyPower?: number }): void {
    this.value = Math.max(0, Math.floor(state.holyPower ?? 0));
    this.onChange?.();
  }
}

/**
 * THE UNHOLY TRINITY — the finale gauntlet's sequence state (Part 1: Dragon +
 * Beast). Central + serializable (Section 6). The lair becomes enterable once all
 * seven Sins are beaten; entering runs a STAGED gauntlet with recovery breathers:
 *
 *   none → (enter lair) → dragon → (Dragon dies + breather) → beast →
 *   (Beast dies + breather) → awaiting_satan   [Satan + the ending are the NEXT build]
 *
 * Only `stage` is stored; the boss instances are runtime (re-spawned from data).
 */
export type TrinityStage = 'none' | 'dragon' | 'beast' | 'awaiting_satan';

export class TrinitySequence {
  private stage: TrinityStage = 'none';

  /** The current stage of the finale. */
  get current(): TrinityStage {
    return this.stage;
  }

  /** True while a boss stage is being fought (Dragon or Beast). */
  get inFight(): boolean {
    return this.stage === 'dragon' || this.stage === 'beast';
  }

  /** True once the sequence has begun (lair entered) and not reset. */
  get started(): boolean {
    return this.stage !== 'none';
  }

  /** True once both bosses are down and Satan is the (not-yet-built) next beat. */
  get awaitingSatan(): boolean {
    return this.stage === 'awaiting_satan';
  }

  toDragon(): void {
    this.stage = 'dragon';
  }
  toBeast(): void {
    this.stage = 'beast';
  }
  toAwaitingSatan(): void {
    this.stage = 'awaiting_satan';
  }

  /** Reset to the un-entered state (dev "Reset Trinity" + dev reset). */
  reset(): void {
    this.stage = 'none';
  }

  /** Serializable snapshot. */
  toJSON(): { stage: TrinityStage } {
    return { stage: this.stage };
  }

  /** Restore from a snapshot. */
  load(data: { stage: TrinityStage }): void {
    this.stage = data.stage;
  }
}

/**
 * THE UNHOLY TRINITY — the finale gauntlet's sequence state. Central +
 * serializable (Section 6). The lair becomes enterable once all seven Sins are
 * beaten; entering runs a STAGED gauntlet with recovery breathers, ending in
 * Satan and the redemption return to Earth:
 *
 *   none → (enter lair) → dragon → (breather) → beast → (breather) →
 *   satan → (Satan dies) → ending (redemption cutscene) → complete (back on Earth)
 *
 * Only `stage` is stored; boss instances are runtime (re-spawned from data).
 */
export type TrinityStage = 'none' | 'dragon' | 'beast' | 'satan' | 'ending' | 'complete';

export class TrinitySequence {
  private stage: TrinityStage = 'none';

  /** The current stage of the finale. */
  get current(): TrinityStage {
    return this.stage;
  }

  /** True while a boss stage is being fought (Dragon, Beast, or Satan). */
  get inFight(): boolean {
    return this.stage === 'dragon' || this.stage === 'beast' || this.stage === 'satan';
  }

  /** True once the sequence has begun (lair entered) and not reset. */
  get started(): boolean {
    return this.stage !== 'none';
  }

  /** True while the redemption ending is playing (Satan down, not yet home). */
  get ending(): boolean {
    return this.stage === 'ending';
  }

  /** True once the player has returned to Earth — the core arc is complete. */
  get complete(): boolean {
    return this.stage === 'complete';
  }

  toDragon(): void {
    this.stage = 'dragon';
  }
  toBeast(): void {
    this.stage = 'beast';
  }
  toSatan(): void {
    this.stage = 'satan';
  }
  toEnding(): void {
    this.stage = 'ending';
  }
  toComplete(): void {
    this.stage = 'complete';
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

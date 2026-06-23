import type { ObjectiveDef, ObjectiveTrigger, QuestDef } from './questData';

export type QuestStatus = 'inactive' | 'active' | 'complete';

/** Result of feeding a trigger to the quest. */
export interface NotifyResult {
  /** True if the current objective was completed by this trigger. */
  advanced: boolean;
  /** True if completing it finished the whole quest. */
  questCompleted: boolean;
}

/**
 * A generic, data-driven quest runner. It owns ONE quest's live state — status,
 * the current objective index — and advances strictly through the ordered
 * objectives as matching triggers arrive. It knows nothing about the game world:
 * the scene watches for events (beast defeated, rift reached, angel refused) and
 * calls {@link notify}; the manager only decides whether that advances the quest.
 *
 * A second quest needs no new code here — construct another QuestManager with a
 * different QuestDef.
 */
export class QuestManager {
  readonly def: QuestDef;
  status: QuestStatus = 'inactive';
  currentObjective = 0;

  /** Fired whenever status or the current objective changes (UI refresh hook). */
  onChange?: () => void;

  constructor(def: QuestDef) {
    this.def = def;
  }

  /** Convenience for the data behind this quest. */
  get quest(): QuestDef {
    return this.def;
  }
  get title(): string {
    return this.def.title;
  }
  get isActive(): boolean {
    return this.status === 'active';
  }
  get isComplete(): boolean {
    return this.status === 'complete';
  }

  /** The objective the player is currently working on, or null if not active. */
  get objective(): ObjectiveDef | null {
    return this.status === 'active' ? this.def.objectives[this.currentObjective] ?? null : null;
  }

  /** The trigger that would advance the current objective (null if not active). */
  get currentTrigger(): ObjectiveTrigger | null {
    return this.objective?.trigger ?? null;
  }

  /** Begin the quest at its first objective (no-op if already started). */
  start(): void {
    if (this.status !== 'inactive') return;
    this.status = 'active';
    this.currentObjective = 0;
    this.onChange?.();
  }

  /**
   * Report that a world event happened. Advances only if the fired trigger
   * matches the CURRENT objective's trigger, so events for future (or already
   * completed) objectives are harmlessly ignored.
   */
  notify(trigger: ObjectiveTrigger): NotifyResult {
    if (this.status !== 'active') return { advanced: false, questCompleted: false };
    const obj = this.def.objectives[this.currentObjective];
    if (!obj || obj.trigger !== trigger) return { advanced: false, questCompleted: false };

    this.currentObjective += 1;
    if (this.currentObjective >= this.def.objectives.length) {
      this.status = 'complete';
      this.onChange?.();
      return { advanced: true, questCompleted: true };
    }
    this.onChange?.();
    return { advanced: true, questCompleted: false };
  }

  /** Return the quest to its untouched, replayable state. */
  reset(): void {
    this.status = 'inactive';
    this.currentObjective = 0;
    this.onChange?.();
  }
}

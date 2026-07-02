import type { ObjectiveDef, ObjectiveTrigger, QuestDef } from './questData';

/** Per-quest lifecycle status (derived, never stored directly). */
export type QuestChainStatus = 'locked' | 'available' | 'active' | 'complete';

/** Discrete quest events, surfaced as actions (not buried in frame logic) so
 *  they could be networked later. */
export type QuestEvent =
  | { type: 'started'; questId: string }
  | { type: 'objective-complete'; questId: string; index: number }
  | { type: 'quest-complete'; questId: string }
  | { type: 'unlocked'; questId: string };

/** The complete, SERIALIZABLE quest state (feeds the future save system). */
export interface QuestChainState {
  /** Ids of every COMPLETED quest — the source of truth for prerequisite checks. */
  completed: string[];
  /** The single active quest id (one active at a time for now), or null. */
  activeId: string | null;
  /** The active quest's current objective index. */
  activeObjective: number;
}

export interface NotifyResult {
  advanced: boolean;
  questCompleted: boolean;
}

/**
 * The central quest manager for the whole chain. It owns the serializable state
 * — the completed-quests record, the single active quest, and that quest's
 * objective index — and DERIVES each quest's status (locked / available / active
 * / complete) from prerequisites against the completed set. It knows nothing
 * about rendering: the scene drives it (accept / notify) and reacts to its
 * discrete {@link QuestEvent}s.
 */
export class QuestChain {
  private readonly quests = new Map<string, QuestDef>();
  private readonly order: string[];

  private completed = new Set<string>();
  private activeId: string | null = null;
  private activeObjective = 0;
  /** Quests already announced as unlocked, to keep 'unlocked' events one-shot. */
  private announced = new Set<string>();

  /** The player's class, for classRequirement-gated quests (null = none set:
   *  class-gated quests stay locked — the conservative default). */
  private playerClass: string | null = null;

  /** UI refresh hook (status / objective changed). */
  onChange?: () => void;
  /** Discrete lifecycle events. */
  onEvent?: (e: QuestEvent) => void;

  constructor(registry: readonly QuestDef[]) {
    this.order = registry.map((q) => q.id);
    for (const q of registry) this.quests.set(q.id, q);
  }

  get(id: string): QuestDef | undefined {
    return this.quests.get(id);
  }

  /** Set the player's class so classRequirement-gated quests can unlock. */
  setPlayerClass(className: string | null): void {
    this.playerClass = className ? className.toLowerCase() : null;
    this.onChange?.();
  }

  /** Derived status for one quest. */
  status(id: string): QuestChainStatus {
    if (this.completed.has(id)) return 'complete';
    if (this.activeId === id) return 'active';
    const def = this.quests.get(id);
    if (!def) return 'locked';
    // Class gate: a quest reserved for one class stays locked for every other.
    if (def.classRequirement && def.classRequirement.toLowerCase() !== this.playerClass) return 'locked';
    // Each prerequisite slot: a plain quest id, or an anyOf group where ANY ONE
    // completed id satisfies the slot. Ids of quests that aren't registered are
    // simply never in the completed set → the slot reads as UNMET (never a crash).
    const met = def.prerequisites.every((p) =>
      typeof p === 'string' ? this.completed.has(p) : p.anyOf.some((a) => this.completed.has(a)),
    );
    return met ? 'available' : 'locked';
  }

  get activeQuest(): QuestDef | null {
    return this.activeId ? this.quests.get(this.activeId) ?? null : null;
  }
  get activeObjectiveDef(): ObjectiveDef | null {
    const q = this.activeQuest;
    return q ? q.objectives[this.activeObjective] ?? null : null;
  }
  get activeObjectiveIndex(): number {
    return this.activeObjective;
  }
  get activeTrigger(): ObjectiveTrigger | null {
    return this.activeObjectiveDef?.trigger ?? null;
  }

  /** The first of `ids` that is currently AVAILABLE to offer, or null. */
  firstAvailable(ids: readonly string[]): QuestDef | null {
    for (const id of ids) if (this.status(id) === 'available') return this.quests.get(id) ?? null;
    return null;
  }

  /** The first quest in registry order that is autoActivate and AVAILABLE now
   *  (the climax-activation scan — covers composed/generated quests too). */
  firstAvailableAuto(): QuestDef | null {
    for (const id of this.order) {
      const d = this.quests.get(id);
      if (d?.autoActivate && this.status(id) === 'available') return d;
    }
    return null;
  }

  /**
   * Accept an available quest → active (one active at a time). Returns false if a
   * quest is already active or this one isn't available.
   */
  accept(id: string): boolean {
    if (this.activeId) return false;
    if (this.status(id) !== 'available') return false;
    this.activeId = id;
    this.activeObjective = 0;
    this.emit({ type: 'started', questId: id });
    this.onChange?.();
    return true;
  }

  /**
   * Report a world event. Advances the active quest only if the fired trigger
   * matches its current objective; completing the last objective finishes the
   * quest (reward + unlock re-evaluation are signalled via events).
   */
  notify(trigger: ObjectiveTrigger): NotifyResult {
    const q = this.activeQuest;
    if (!q) return { advanced: false, questCompleted: false };
    const obj = q.objectives[this.activeObjective];
    if (!obj || obj.trigger !== trigger) return { advanced: false, questCompleted: false };

    const index = this.activeObjective;
    this.activeObjective += 1;
    this.emit({ type: 'objective-complete', questId: q.id, index });

    if (this.activeObjective >= q.objectives.length) {
      this.finishActive();
      return { advanced: true, questCompleted: true };
    }
    this.onChange?.();
    return { advanced: true, questCompleted: false };
  }

  /** DEV: instantly finish the remaining objectives of the active quest. */
  completeActive(): boolean {
    if (!this.activeId) return false;
    this.finishActive();
    return true;
  }

  private finishActive(): void {
    const id = this.activeId!;
    this.completed.add(id);
    this.activeId = null;
    this.activeObjective = 0;
    this.emit({ type: 'quest-complete', questId: id });
    this.evaluateUnlocks(); // a completion may unlock the next quest
    this.onChange?.();
  }

  /**
   * Re-evaluate every quest's gate and emit a one-shot 'unlocked' event for any
   * that is now available. Status is derived, so this only surfaces events;
   * called on load and after each completion.
   */
  evaluateUnlocks(): void {
    for (const id of this.order) {
      if (this.status(id) === 'available' && !this.announced.has(id)) {
        this.announced.add(id);
        this.emit({ type: 'unlocked', questId: id });
      }
    }
  }

  /** Reset the whole chain to its initial state (replay from scratch). */
  reset(): void {
    this.completed.clear();
    this.activeId = null;
    this.activeObjective = 0;
    this.announced.clear();
    this.onChange?.();
  }

  // --- Serialization (for the future save system) ---------------------------

  toJSON(): QuestChainState {
    return {
      completed: [...this.completed],
      activeId: this.activeId,
      activeObjective: this.activeObjective,
    };
  }

  load(state: QuestChainState): void {
    this.completed = new Set(state.completed);
    this.activeId = state.activeId;
    this.activeObjective = state.activeObjective;
    this.announced.clear();
    this.evaluateUnlocks();
    this.onChange?.();
  }

  private emit(e: QuestEvent): void {
    this.onEvent?.(e);
  }
}

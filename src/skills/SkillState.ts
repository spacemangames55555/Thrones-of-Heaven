import {
  classSkills,
  combineMods,
  type ClassId,
  type SkillDef,
  type SkillStatMods,
} from './skillData';

/** The serializable skill state (points + per-class unlocks + active class). */
export interface SkillSaveState {
  activeClass: ClassId;
  unspentPoints: number;
  /** Unlocked skill ids, keyed by class id (so each class keeps its own build). */
  unlockedByClass: Record<string, string[]>;
}

export type UnlockResult = { ok: true } | { ok: false; reason: string };

/**
 * THE SKILL ECONOMY + UNLOCK STATE — centralized + serializable (Section 6).
 *
 * Holds the player's unspent skill points and which skills are unlocked per class.
 * It is pure logic (no Phaser): the scene awards points on level-up, calls
 * {@link unlock} when the player spends in the UI, and reads {@link passiveMods}
 * to apply permanent passive stat boosts. Timed buffs/forms are runtime-only and
 * live in the scene; only points + unlocks persist (passive effects are derived
 * from unlocks, so a load re-applies them deterministically).
 */
export class SkillState {
  activeClass: ClassId = 'blacksmith';
  unspentPoints = 0;
  private unlocked: Record<string, Set<string>> = {};

  /** Fired on any change (point award/spend, unlock, reset) for UI refresh. */
  onChange?: () => void;

  private setFor(classId: string): Set<string> {
    return (this.unlocked[classId] ??= new Set<string>());
  }

  /** Award skill points (e.g. 1 per level gained). */
  awardPoints(n: number): void {
    if (n <= 0) return;
    this.unspentPoints += n;
    this.onChange?.();
  }

  isUnlocked(id: string, classId: ClassId = this.activeClass): boolean {
    return this.setFor(classId).has(id);
  }

  /** Ids unlocked for the active class. */
  unlockedIds(classId: ClassId = this.activeClass): string[] {
    return [...this.setFor(classId)];
  }

  /** Can the active class unlock this skill right now? (points + prereq + not already owned) */
  canUnlock(def: SkillDef): UnlockResult {
    if (this.isUnlocked(def.id)) return { ok: false, reason: 'Already unlocked' };
    if (this.unspentPoints < def.cost) return { ok: false, reason: `Needs ${def.cost} point${def.cost > 1 ? 's' : ''}` };
    if (def.prereq && !this.isUnlocked(def.prereq)) return { ok: false, reason: 'Requires the previous skill' };
    return { ok: true };
  }

  /** Spend points to unlock a skill if allowed; returns success. */
  unlock(def: SkillDef): boolean {
    const can = this.canUnlock(def);
    if (!can.ok) return false;
    this.unspentPoints -= def.cost;
    this.setFor(this.activeClass).add(def.id);
    this.onChange?.();
    return true;
  }

  /** The aggregate PASSIVE stat mods from all unlocked passive skills of the active class. */
  passiveMods(): SkillStatMods {
    const defs = classSkills(this.activeClass).skills;
    const owned = this.setFor(this.activeClass);
    const mods: SkillStatMods[] = [];
    for (const d of defs) if (owned.has(d.id) && d.effect.kind === 'passive') mods.push(d.effect.stats);
    return combineMods(mods);
  }

  /** The unlocked, ACTIVATABLE skills (active/buff/debuff/transformation) of the active class. */
  activatableUnlocked(): SkillDef[] {
    const owned = this.setFor(this.activeClass);
    return classSkills(this.activeClass).skills.filter(
      (d) => owned.has(d.id) && d.effect.kind !== 'passive',
    );
  }

  /**
   * RESET (dev): refund every unlocked skill's cost back into the point pool and
   * clear all unlocks for the active class (a full respec). Keeps total points.
   */
  reset(): void {
    const owned = this.setFor(this.activeClass);
    const defs = classSkills(this.activeClass).skills;
    let refund = 0;
    for (const d of defs) if (owned.has(d.id)) refund += d.cost;
    this.unspentPoints += refund;
    owned.clear();
    this.onChange?.();
  }

  /** HARD reset to zero points / no unlocks (used by the full Dev Reset / new game). */
  hardReset(): void {
    this.unspentPoints = 0;
    this.unlocked = {};
    this.onChange?.();
  }

  toJSON(): SkillSaveState {
    const unlockedByClass: Record<string, string[]> = {};
    for (const k of Object.keys(this.unlocked)) unlockedByClass[k] = [...this.unlocked[k]];
    return { activeClass: this.activeClass, unspentPoints: this.unspentPoints, unlockedByClass };
  }

  /** Restore from a save; tolerant of missing/old data (defaults to 0 points / nothing unlocked). */
  load(state: Partial<SkillSaveState> | undefined): void {
    this.activeClass = (state?.activeClass as ClassId) ?? 'blacksmith';
    this.unspentPoints = Math.max(0, Math.floor(state?.unspentPoints ?? 0));
    this.unlocked = {};
    const byClass = state?.unlockedByClass ?? {};
    for (const k of Object.keys(byClass)) this.unlocked[k] = new Set(byClass[k] ?? []);
    this.onChange?.();
  }
}

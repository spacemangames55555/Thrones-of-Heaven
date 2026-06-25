import {
  classSkills,
  combineMods,
  isEquippableSkill,
  isDamagingActive,
  LOADOUT_SLOTS,
  type ClassId,
  type SkillDef,
  type SkillStatMods,
} from './skillData';

/** The serializable skill state (points + per-class unlocks + loadout + active class). */
export interface SkillSaveState {
  activeClass: ClassId;
  unspentPoints: number;
  /** Unlocked skill ids, keyed by class id (so each class keeps its own build). */
  unlockedByClass: Record<string, string[]>;
  /** Equipped skill ids per slot (null = empty), keyed by class id. */
  loadoutByClass?: Record<string, (string | null)[]>;
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
  private loadoutByClass: Record<string, (string | null)[]> = {};

  /** Fired on any change (point award/spend, unlock, equip, reset) for UI refresh. */
  onChange?: () => void;

  private setFor(classId: string): Set<string> {
    return (this.unlocked[classId] ??= new Set<string>());
  }

  private def(id: string, classId: ClassId = this.activeClass): SkillDef | undefined {
    return classSkills(classId).skills.find((s) => s.id === id);
  }

  /** Award skill points (e.g. 1 per level gained). */
  awardPoints(n: number): void {
    if (n <= 0) return;
    this.unspentPoints += n;
    this.onChange?.();
  }

  isUnlocked(id: string, classId: ClassId = this.activeClass): boolean {
    if (this.def(id, classId)?.freeUnlock) return true; // basics are always unlocked
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
    return classSkills(this.activeClass).skills.filter((d) => this.isUnlocked(d.id) && isEquippableSkill(d));
  }

  /** Unlocked DAMAGING-ACTIVE skills (in tree/tier order) — the player's real offense. */
  unlockedDamagingActives(classId: ClassId = this.activeClass): SkillDef[] {
    return classSkills(classId).skills.filter((d) => this.isUnlocked(d.id, classId) && isDamagingActive(d));
  }

  /**
   * True when the player owns NO damaging active (a brand-new character, or an old save
   * that only had the now-removed free kit). The New-Game forced-first-skill flow must
   * run before play so the player is never left unable to attack.
   */
  needsFirstSkill(classId: ClassId = this.activeClass): boolean {
    return this.unlockedDamagingActives(classId).length === 0;
  }

  /** Is this equipped id a DAMAGING ACTIVE (counts toward the anti-soft-lock floor)? */
  private isDamagingActiveId(id: string): boolean {
    const d = this.def(id);
    return !!d && isDamagingActive(d);
  }

  // --- LOADOUT (the 6 equip slots; the player's entire active kit) --------------

  /** The active class's loadout (always length LOADOUT_SLOTS; null = empty slot). */
  loadout(classId: ClassId = this.activeClass): (string | null)[] {
    let arr = this.loadoutByClass[classId];
    if (!arr) arr = this.loadoutByClass[classId] = new Array<string | null>(LOADOUT_SLOTS).fill(null);
    if (arr.length !== LOADOUT_SLOTS) {
      arr = arr.slice(0, LOADOUT_SLOTS);
      while (arr.length < LOADOUT_SLOTS) arr.push(null);
      this.loadoutByClass[classId] = arr;
    }
    return arr;
  }

  equippedIds(classId: ClassId = this.activeClass): string[] {
    return this.loadout(classId).filter((x): x is string => !!x);
  }
  slotIndexOf(id: string): number {
    return this.loadout().indexOf(id);
  }
  isEquipped(id: string): boolean {
    return this.slotIndexOf(id) >= 0;
  }

  /** Equip an unlocked, equippable skill into a slot (a skill occupies ONE slot). */
  equip(slot: number, id: string): boolean {
    if (slot < 0 || slot >= LOADOUT_SLOTS) return false;
    const def = this.def(id);
    if (!def || !isEquippableSkill(def) || !this.isUnlocked(id)) return false;
    const arr = this.loadout();
    const existing = arr.indexOf(id);
    if (existing >= 0) arr[existing] = null; // move (no duplicates)
    arr[slot] = id;
    this.onChange?.();
    return true;
  }

  /** Clear a slot; the floor re-fills slot 0 with the basic attack if the loadout empties. */
  unequip(slot: number): void {
    const arr = this.loadout();
    if (slot < 0 || slot >= arr.length) return;
    arr[slot] = null;
    this.ensureLoadoutFloor();
    this.onChange?.();
  }

  /**
   * ANTI-SOFT-LOCK FLOOR (load-bearing under the no-base-kit model): the player must
   * never be left with ZERO damaging actives equipped ONCE THEY OWN ONE. If the loadout
   * holds no damaging active but the player owns at least one, auto-equip the lowest one.
   * Before they own any (a brand-new character), the loadout stays empty — the New-Game
   * forced-first-skill flow gives them their first ability. There is no free fallback
   * attack to fall back on anymore, so this is the only thing preventing a can't-attack
   * soft-lock; callers re-run the forced pick when {@link needsFirstSkill} is true.
   */
  ensureLoadoutFloor(): void {
    const arr = this.loadout();
    if (arr.some((id) => id != null && this.isDamagingActiveId(id))) return; // already covered
    const owned = this.unlockedDamagingActives();
    if (owned.length === 0) return; // no offense to enforce yet (pre-first-pick)
    let slot = arr.indexOf(null);
    if (slot < 0) slot = 0; // every slot full of non-damaging skills → reclaim slot 0
    arr[slot] = owned[0].id;
  }

  /** Drop any equipped skills no longer unlocked (after a respec), then re-floor. */
  private pruneLoadout(): void {
    const arr = this.loadout();
    for (let i = 0; i < arr.length; i++) if (arr[i] && !this.isUnlocked(arr[i]!)) arr[i] = null;
    this.ensureLoadoutFloor();
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
    this.pruneLoadout(); // unequip skills that are now locked again, keep the floor
    this.onChange?.();
  }

  /** HARD reset to zero points / no unlocks / empty loadout (Dev Reset / new game). The
   *  caller then runs the forced-first-skill flow (needsFirstSkill is now true). */
  hardReset(): void {
    this.unspentPoints = 0;
    this.unlocked = {};
    this.loadoutByClass = {};
    this.ensureLoadoutFloor(); // no owned actives yet → loadout stays empty
    this.onChange?.();
  }

  toJSON(): SkillSaveState {
    const unlockedByClass: Record<string, string[]> = {};
    for (const k of Object.keys(this.unlocked)) unlockedByClass[k] = [...this.unlocked[k]];
    const loadoutByClass: Record<string, (string | null)[]> = {};
    for (const k of Object.keys(this.loadoutByClass)) loadoutByClass[k] = [...this.loadoutByClass[k]];
    return { activeClass: this.activeClass, unspentPoints: this.unspentPoints, unlockedByClass, loadoutByClass };
  }

  /** Restore from a save; tolerant of missing/old data (defaults to 0 pts / nothing / floor loadout). */
  load(state: Partial<SkillSaveState> | undefined): void {
    this.activeClass = (state?.activeClass as ClassId) ?? 'blacksmith';
    this.unspentPoints = Math.max(0, Math.floor(state?.unspentPoints ?? 0));
    this.unlocked = {};
    const byClass = state?.unlockedByClass ?? {};
    for (const k of Object.keys(byClass)) this.unlocked[k] = new Set(byClass[k] ?? []);
    this.loadoutByClass = {};
    const lo = state?.loadoutByClass ?? {};
    for (const k of Object.keys(lo)) this.loadoutByClass[k] = [...(lo[k] ?? [])];
    this.pruneLoadout(); // drop unknown/locked ids (e.g. the old free kit) + re-floor
    this.onChange?.();
  }
}

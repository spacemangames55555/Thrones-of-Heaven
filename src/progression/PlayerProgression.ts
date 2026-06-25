import { BASE_XP, GROWTH_FACTOR, MAX_LEVEL, classBaseStats, type ClassBaseStats } from '../game/settings';

/**
 * The player's leveling state — DATA + a generic XP curve. Deliberately knows
 * nothing about the game world: the scene calls {@link addXP} when XP is earned
 * (a kill, a quest) and reads the derived stats below to drive combat + UI.
 *
 * The curve and the per-level stat growth are entirely tunable from
 * src/game/settings.ts; future stats plug in here as more derived getters, and
 * future XP sources just call addXP — no rewrites.
 */
export class PlayerProgression {
  level = 1;
  currentXP = 0;

  /** The active class's base-stat profile (HP/damage slopes + move speed). Defaults to
   *  the Blacksmith baseline; the scene sets it from the chosen/loaded class. */
  profile: ClassBaseStats = classBaseStats('blacksmith');

  /** Fired whenever level or XP changes (UI refresh hook). */
  onChange?: () => void;

  /** Point the progression at a class's base-stat profile (HP/damage/move per class). */
  setClass(classId: string): void {
    this.profile = classBaseStats(classId);
    this.onChange?.();
  }

  /** True once the level cap is reached. */
  get isMaxLevel(): boolean {
    return this.level >= MAX_LEVEL;
  }

  /**
   * XP needed to advance FROM the given level (defaults to the current level):
   * round(BASE_XP * GROWTH_FACTOR^(level-1)). Infinity at cap so the level-up
   * loop terminates and the bar reads full.
   */
  xpToNext(level: number = this.level): number {
    if (level >= MAX_LEVEL) return Infinity;
    return Math.round(BASE_XP * Math.pow(GROWTH_FACTOR, level - 1));
  }

  /** Fill ratio for the XP bar, 0..1 (always 1 at cap). */
  get xpRatio(): number {
    if (this.isMaxLevel) return 1;
    const need = this.xpToNext();
    return Math.max(0, Math.min(1, this.currentXP / need));
  }

  /** Level-derived maximum HP (per the active class's profile). */
  get effectiveMaxHP(): number {
    return this.profile.baseMaxHP + (this.level - 1) * this.profile.hpPerLevel;
  }

  /** Level-derived base/melee damage (per the active class's profile). */
  get effectiveDamage(): number {
    return this.profile.baseDamage + (this.level - 1) * this.profile.dmgPerLevel;
  }

  /**
   * Add XP and resolve any level-ups. Subtracts each threshold and climbs while
   * enough XP remains, so a single large award can grant multiple levels. At cap
   * XP is ignored and currentXP pinned to 0. Returns the number of levels gained.
   */
  addXP(amount: number): number {
    if (this.isMaxLevel) {
      this.currentXP = 0;
      this.onChange?.();
      return 0;
    }
    if (amount <= 0) return 0;

    this.currentXP += amount;
    let levelsGained = 0;
    while (!this.isMaxLevel && this.currentXP >= this.xpToNext()) {
      this.currentXP -= this.xpToNext();
      this.level += 1;
      levelsGained += 1;
    }
    if (this.isMaxLevel) this.currentXP = 0;
    this.onChange?.();
    return levelsGained;
  }

  /** Exactly enough XP to reach the next level (for the dev instant-level key). */
  xpRemainingToLevel(): number {
    if (this.isMaxLevel) return 0;
    return Math.max(0, this.xpToNext() - this.currentXP);
  }

  /** Back to a fresh level 1 / 0 XP. */
  reset(): void {
    this.level = 1;
    this.currentXP = 0;
    this.onChange?.();
  }
}

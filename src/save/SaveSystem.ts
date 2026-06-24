import { SAVE_KEY, type SaveData } from './SaveData';

/**
 * The single-slot localStorage SAVE/LOAD core. Every call is wrapped in try/catch
 * so a disabled/quota-exceeded/corrupt localStorage NEVER crashes the game — a
 * failed save just returns false; a failed load returns null (→ no save). On the
 * deployed Vercel site localStorage works normally.
 */
export const SaveSystem = {
  /** Is there a save in the slot? (false if localStorage is unavailable.) */
  hasSave(): boolean {
    try {
      return localStorage.getItem(SAVE_KEY) !== null;
    } catch {
      return false;
    }
  },

  /** Read + parse the save, or null if none / unreadable / wrong shape. */
  read(): SaveData | null {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw) as SaveData;
      if (!data || typeof data.saveVersion !== 'number' || !data.player || !data.world) return null;
      // (Future: migrate older data.saveVersion here before returning.)
      return data;
    } catch {
      return null;
    }
  },

  /** Write the save object. Returns false on any error (quota, serialization, …). */
  write(data: SaveData): boolean {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  },

  /** Delete the slot. */
  clear(): void {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      /* ignore */
    }
  },
};

import { SAVE_KEY, SAVE_VERSION, ACT1_QUEST_IDS, type SaveData } from './SaveData';

/**
 * Migrate an older save in place to the current SAVE_VERSION. Each step is
 * forward-only and idempotent. v2→v3 added the Act I (Enumclaw) opening in front
 * of the chain: a pre-v3 player is already past the opening, so mark the four Act
 * I quests COMPLETE (keeping prerequisites satisfied and the chain unlocked).
 */
function migrate(data: SaveData): SaveData {
  if (data.saveVersion < 3) {
    const completed = new Set(data.quests?.completed ?? []);
    for (const id of ACT1_QUEST_IDS) completed.add(id);
    if (data.quests) data.quests.completed = [...completed];
  }
  data.saveVersion = SAVE_VERSION;
  return data;
}

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
      return data.saveVersion < SAVE_VERSION ? migrate(data) : data;
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

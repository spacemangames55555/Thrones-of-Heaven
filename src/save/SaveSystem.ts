import {
  SAVE_KEY,
  SAVE_VERSION,
  ACT1_QUEST_IDS,
  ACT2_QUEST_IDS,
  INV_QUEST_IDS,
  RETIRED_CORRUPTION_ID,
  RIFT_FINALE_ID,
  ACT4_QUEST_IDS,
  DESCENT_OR_LATER_IDS,
  type SaveData,
} from './SaveData';

/**
 * Migrate an older save in place to the current SAVE_VERSION. Each step is
 * forward-only, cumulative, and idempotent.
 *  • v2→v3 added the Act I (Enumclaw) opening in front of the chain.
 *  • v3→v4 added the Act II (corruption escalation) quests + Uriel's arrival.
 *  • v4→v5 added the Investigation arc (Quests 8–12) before the old corruption beat.
 *  • v5→v6 RETIRED the old corruption beat: the grant moved to Quest 13's rift scene.
 *  • v6→v7 added Act IV (4.1–4.4) BEFORE the descent (descent-1 now bridges off 4.4).
 *  • v7→v8 extended Act IV with the Idaho leg (4.5–4.7); the bridge now points at 4.7.
 * In every additive case a pre-migration player is already past that content, so the
 * new quests are marked COMPLETE (prerequisites stay satisfied → no soft-lock), and
 * Uriel is flagged as already arrived so his scene never replays. v6 also keeps the
 * critical path intact across the removed quest id (see RETIRED_CORRUPTION_ID). v7
 * only marks Act IV complete for saves ALREADY on/after the descent — a save not yet
 * into the descent is left to play Act IV next (see DESCENT_OR_LATER_IDS).
 */
function migrate(data: SaveData): SaveData {
  const completed = new Set(data.quests?.completed ?? []);
  if (data.saveVersion < 3) for (const id of ACT1_QUEST_IDS) completed.add(id);
  if (data.saveVersion < 4) {
    for (const id of ACT2_QUEST_IDS) completed.add(id);
    if (data.player) {
      data.player.urielArrived = true;
      data.player.urielPending = false;
    }
  }
  if (data.saveVersion < 5) for (const id of INV_QUEST_IDS) completed.add(id);
  if (data.saveVersion < 6) {
    // (a) Already past the old beat (corrupted / mid-descent): mark the rift-finale
    //     quest complete so descent-1 (now gated on 'the-source') stays unlocked.
    if (completed.has(RETIRED_CORRUPTION_ID)) completed.add(RIFT_FINALE_ID);
    // (b) Still ON the old beat: its quest no longer exists — clear the stale active
    //     id so the chain advances to the rift finale instead of pointing at nothing.
    if (data.quests && data.quests.activeId === RETIRED_CORRUPTION_ID) {
      data.quests.activeId = null;
      data.quests.activeObjective = 0;
    }
  }
  if (data.saveVersion < 7) {
    // Act IV (4.1–4.4) was inserted BEFORE the descent. Only a save ALREADY on or
    // past the descent should skip Act IV: mark the four ids COMPLETE so descent-1's
    // new prerequisite ('act4-salt-and-sea') stays satisfied and the player keeps
    // their descent path (no soft-lock, no orphaned activeId). A save not yet into
    // the descent is left untouched → Azazel offers 4.1 next.
    const activeId = data.quests?.activeId ?? null;
    const onDescentOrLater =
      DESCENT_OR_LATER_IDS.some((id) => completed.has(id)) ||
      (activeId !== null && DESCENT_OR_LATER_IDS.includes(activeId));
    if (onDescentOrLater) for (const id of ACT4_QUEST_IDS) completed.add(id);
  }
  if (data.saveVersion < 8) {
    // Act IV's Idaho leg (4.5–4.7) was inserted before the descent; the bridge now
    // points descent-1 at 4.7. Same rule as v6→v7 (ACT4_QUEST_IDS now includes 4.5–4.7):
    // a save ALREADY on/after the descent is marked through 4.7 so descent-1's new
    // prerequisite stays satisfied and Act IV isn't re-offered; a save that just finished
    // 4.4 is left untouched → Azazel offers 4.5 and it plays on into 4.7 → descent.
    const activeId = data.quests?.activeId ?? null;
    const onDescentOrLater =
      DESCENT_OR_LATER_IDS.some((id) => completed.has(id)) ||
      (activeId !== null && DESCENT_OR_LATER_IDS.includes(activeId));
    if (onDescentOrLater) for (const id of ACT4_QUEST_IDS) completed.add(id);
  }
  if (data.quests) data.quests.completed = [...completed];
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

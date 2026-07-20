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
  RETIRED_FINALE_IDS,
  ACT4_FINALE_IDS,
  PAST_DESCENT_IDS,
  ENDGAME_ACTIVE_IDS,
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
 *  • v8→v9 widened Earth east (added the Idaho region), which shifts the Heaven/Hell
 *    worlds east. Saved ABSOLUTE Heaven/Hell positions are now off those relocated
 *    maps, so their `remembered` entries are dropped → re-entering falls back to each
 *    world's defaultArrival (the portals pass explicit arrival points, so this is safe).
 *    EARTH positions are kept (WA/OR pixels are unchanged). A save whose CURRENT world
 *    is Heaven/Hell is additionally re-anchored on load (applyWorldSwap bounds-snap).
 *  • v9→v10 (the ACT IV FINALE) RETIRED descent-1..4 + climax-defiled-gate; 4.8–4.10
 *    replace them and climax-judgment now requires 4.10. Stale active pointers at
 *    retired ids are cleared; saves past the old descent/gate are marked through
 *    4.8 / 4.10 respectively so the endgame stays unlocked; retired ids are dropped
 *    from the completed set.
 *  • v11→v12 (GLOBE CONSOLIDATION) removed the 'europe'/'africa' worlds in favor
 *    of the one whole-planet 'globe' world: saves in/remembering those worlds are
 *    re-pointed/dropped (see the step) — the player lands at the globe arrival.
 *  • v12→v13 (CLASS HOME STARTS) changed where a brand-NEW character spawns (their
 *    class's home city). NO data transform: a save's world/position is already
 *    authoritative on load, so pre-ruling characters keep playing exactly where
 *    they were — the bump only marks the behavior epoch.
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
  if (data.saveVersion < 9) {
    // The Idaho widening shifted Heaven/Hell east. Drop the now-off-map remembered
    // positions for the non-Earth worlds so re-entering uses their defaultArrival;
    // KEEP Earth (its WA/OR pixels are unchanged). Idempotent (delete-if-present).
    if (data.world?.remembered) {
      delete data.world.remembered.heaven;
      delete data.world.remembered.hell;
    }
    // (If the save's CURRENT world is Heaven/Hell, its now-invalid x/y is re-anchored
    //  to defaultArrival on load by MainScene.applyWorldSwap's bounds-snap.)
  }
  if (data.saveVersion < 10) {
    // v9→v10 — THE ACT IV FINALE: descent-1..4 + climax-defiled-gate are RETIRED;
    // 4.8–4.10 replace them, and climax-judgment's prerequisite is now 'act4-heaven'.
    // (a) A save ACTIVE on a retired quest → clear the stale pointer. Corruption +
    //     its completed set stand, so on load the patron offers the first available
    //     Act IV quest (a mid-descent save flows into 4.8; a mid-defiled-gate save
    //     into 4.9's assault — the same Holy-Outpost content it was on).
    if (data.quests && data.quests.activeId && RETIRED_FINALE_IDS.includes(data.quests.activeId)) {
      data.quests.activeId = null;
      data.quests.activeObjective = 0;
    }
    const activeId = data.quests?.activeId ?? null;
    // (b) PAST THE GATE (climax-defiled-gate complete, or a later endgame quest
    //     complete/ACTIVE — i.e. the player is in Heaven/Hell or finished): mark
    //     4.1–4.10 ALL complete so the repointed climax-judgment (and everything
    //     after) stays unlocked — no soft-lock, no replaying Act IV mid-endgame.
    const pastGate =
      completed.has('climax-defiled-gate') ||
      completed.has('climax-judgment') ||
      completed.has('climax-seven-sins') ||
      (activeId !== null && ENDGAME_ACTIVE_IDS.includes(activeId));
    // (c) PAST THE DESCENT but not the gate (descent-4 complete; was on/around the
    //     old defiled-gate beat): mark 4.1–4.8 complete — the patron then offers
    //     4.9, so they play the new assault instead of the retired wrapper.
    const pastDescent = pastGate || PAST_DESCENT_IDS.some((id) => completed.has(id));
    if (pastDescent) {
      for (const id of ACT4_QUEST_IDS) completed.add(id);
      completed.add(ACT4_FINALE_IDS[0]); // 4.8 'act4-draw-them-down'
    }
    if (pastGate) {
      completed.add(ACT4_FINALE_IDS[1]); // 4.9 'act4-the-door-home'
      completed.add(ACT4_FINALE_IDS[2]); // 4.10 'act4-heaven'
    }
    // (d) Hygiene: drop the retired ids from the completed set (nothing references
    //     them anymore). Idempotent (delete-if-present).
    for (const id of RETIRED_FINALE_IDS) completed.delete(id);
  }
  if (data.saveVersion < 11) {
    // v10→v11 — EGYPT (the fourth world) registered. No data changes: the world
    // registry + remembered positions are already open Records (a v10 save simply
    // has no 'egypt' entry until the player travels there), and no quest ids
    // changed. The bump just marks saves as from a build that knows Egypt.
  }
  if (data.saveVersion < 12) {
    // v11→v12 — GLOBE CONSOLIDATION: the 'europe' and 'africa' region worlds
    // were REMOVED, replaced by the whole-planet 'globe' world with every
    // generated zone at its TRUE Earth position — so any saved europe/africa
    // coordinate is meaningless there (and loading an unregistered world id
    // would crash). A save IN one of those worlds re-points to 'globe' with an
    // off-map position: applyWorldSwap's bounds-snap then lands it at the
    // globe's default arrival (Rome). Remembered europe/africa entries are
    // dropped. Quests are untouched (no ids changed). Idempotent.
    if (data.world && (data.world.active === 'europe' || data.world.active === 'africa')) {
      data.world.active = 'globe';
      data.world.x = -1e9;
      data.world.y = -1e9;
    }
    if (data.world?.remembered) {
      delete data.world.remembered.europe;
      delete data.world.remembered.africa;
    }
  }
  // v13→v14 — WORLD UNIFICATION (Egypt): the 'egypt' world merged into the
  // globe at its true planet position. The version bump records the change;
  // the coordinate translation itself happens in MainScene.applySave (it needs
  // the LIVE map origins), keyed off world.active === 'egypt' — idempotent,
  // because the first post-load autosave writes back as 'globe'.
  // v14→v15 — WORLD UNIFICATION (the PNW): the 'earth' world merged the same
  // way (its old origin was 0,0 — the translation is the map's new origin).
  // v15→v16 — ONE EARTH: the unified world is NAMED 'earth' now. A pre-v15
  // save whose active world was the OLD PNW-only 'earth' is re-marked
  // 'earth-legacy' FIRST (so it cannot be mistaken for the new planet key);
  // MainScene.applySave translates 'earth-legacy' and 'egypt' positions with
  // the live map origins. A 'globe' save simply renames — same coordinates.
  if (data.saveVersion < 15 && data.world?.active === 'earth') {
    data.world.active = 'earth-legacy';
    if (data.world.remembered?.earth) {
      data.world.remembered['earth-legacy'] = data.world.remembered.earth;
      delete data.world.remembered.earth;
    }
  }
  if (data.saveVersion < 16 && data.world?.active === 'globe') data.world.active = 'earth';
  if (data.saveVersion < 16 && data.world?.remembered?.globe) {
    if (!data.world.remembered.earth) data.world.remembered.earth = data.world.remembered.globe;
    delete data.world.remembered.globe;
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

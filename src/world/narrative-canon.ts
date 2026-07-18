/**
 * NARRATIVE CANON — Casey-approved text, inserted VERBATIM. This module is the
 * single home for the game's written voice outside the hand-authored NA chain:
 * nothing in here is generated, paraphrased, or "improved" — the strings are
 * the writing. Renderers (MainScene banners, the tracker) consult these maps
 * FIRST; any slot with no entry falls back to its HAND_AUTHORED_TODO
 * placeholder, exactly as before.
 */

/** THE WATCHER's single line — spoken once per character, at the player's
 *  first lesser-evil kill, then never again. */
export const WATCHER_LINE = 'Well done, little one. Heaven sees you.';

/** AZAZEL'S CAMPFIRES — the rotating outpost flavor lines (order fixed,
 *  loops). Placeholders until the campfire canon lands (the insertion run's
 *  Commit 2 replaces these verbatim). */
export const AZAZEL_CAMPFIRE_LINES: readonly string[] = [
  'HAND_AUTHORED_TODO: azazel-campfire-1 — designer prose goes here.',
  'HAND_AUTHORED_TODO: azazel-campfire-2 — designer prose goes here.',
  'HAND_AUTHORED_TODO: azazel-campfire-3 — designer prose goes here.',
];

/**
 * Tunable gameplay constants. Edit these to change how the world feels.
 *
 * The map is large (see src/map/washington.map.json — currently 800 x 500
 * tiles, 16px each = 12,800 x 8,000 px), so these two values set how long a
 * journey across Washington takes and how much of the world you can see.
 */

/**
 * Player walking speed, in pixels per second.
 *
 * At 130, crossing the full state west↔east (~12,800px) takes roughly 1.5–2
 * minutes of straight walking, more once you detour around water and mountains —
 * a real trek without being tedious. Raise it to travel faster, lower it for a
 * longer journey.
 */
export const PLAYER_SPEED = 130;

/**
 * Main camera zoom. Higher = more zoomed in (bigger player, less world on
 * screen); lower = pulled back (smaller player, more world visible, the player
 * feels smaller relative to the state). Pulled back from the earlier prototype
 * so the larger map reads as vast.
 */
export const CAMERA_ZOOM = 1.6;

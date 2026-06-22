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
 * Main camera zoom at startup / the default gameplay framing. Higher = more
 * zoomed in (bigger player, less world on screen); lower = pulled back. This is
 * the level the camera opens at; the zoom buttons move out from here.
 */
export const CAMERA_ZOOM = 1.6;

// --- Two-button zoom (full map ↔ character) --------------------------------

/**
 * How much a single tap of the +/− buttons multiplies the zoom. 1.5 = each tap
 * shows 1.5× more (out) or less (in). Larger = bigger jumps per tap.
 */
export const ZOOM_STEP = 1.5;

/**
 * Settle time for the smooth zoom tween after a tap, in milliseconds (~0.2s).
 * Smaller = snappier, larger = more gradual.
 */
export const ZOOM_TWEEN_MS = 200;

/**
 * Continuous zoom rate while a button (or +/− key) is held: the zoom is
 * multiplied by this factor per second. 3 = roughly triples the view each
 * second of holding.
 */
export const ZOOM_HOLD_RATE = 3.0;

/**
 * The most zoomed-IN (tightest on the character) the camera may go. Equal to or
 * a little closer than {@link CAMERA_ZOOM}. The player cannot zoom past this.
 */
export const ZOOM_IN_LIMIT = 2.2;

/**
 * Extra breathing room at full zoom-OUT: 1.0 fits the map exactly to the screen,
 * 1.08 leaves an ~8% margin so the whole state is comfortably framed. The OUT
 * limit itself is computed from the live map + screen size (never hardcoded).
 */
export const ZOOM_OUT_MARGIN = 1.08;


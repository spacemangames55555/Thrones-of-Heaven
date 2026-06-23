/**
 * Tunable gameplay constants. Edit these to change how the world feels.
 *
 * The map is 800 x 500 tiles at 32px each = 25,600 x 16,000 px.
 */

/**
 * Player walking speed, expressed in TILES PER SECOND (stable across tile-size
 * changes; the actual px/s = this × tile size). At 8 tiles/s, crossing the full
 * 800-tile state west↔east takes ~1.7 minutes of straight walking, more with
 * detours around water and mountains — a real trek without being tedious.
 */
export const PLAYER_SPEED_TILES_PER_SEC = 8;

/**
 * Main camera zoom at startup / the default gameplay framing. At 1.1 the 32px
 * tiles render ~35px on screen and a 428px-wide phone shows ~12 tiles across,
 * with the ~32x48 player spanning ~1.5 tiles. Higher = more zoomed in; lower =
 * pulled back. The zoom buttons move out from here.
 */
export const CAMERA_ZOOM = 1.1;

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
 * The most zoomed-IN (tightest on the character) the camera may go. At 1.7 the
 * 32px tiles render ~54px and ~8 tiles show across. The player cannot zoom past
 * this. The zoom-OUT limit is computed live from the map + screen size.
 */
export const ZOOM_IN_LIMIT = 1.7;

/**
 * Extra breathing room at full zoom-OUT: 1.0 fits the map exactly to the screen,
 * 1.08 leaves an ~8% margin so the whole state is comfortably framed. The OUT
 * limit itself is computed from the live map + screen size (never hardcoded).
 */
export const ZOOM_OUT_MARGIN = 1.08;


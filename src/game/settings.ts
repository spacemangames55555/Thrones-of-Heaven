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


// --- Dev tools -------------------------------------------------------------
//
// Master switch for ALL developer/test tooling: the on-screen dev panel AND the
// keyboard dev shortcuts (grant XP, instant level, full heal, respawn Sasquatch,
// dev reset). Flip this to false for a shipping build to remove every dev tool in
// one place. Gameplay is unaffected either way.
export const DEV_MODE: boolean = true;

// --- Progression / Leveling v1 ---------------------------------------------
//
// XP curve: xpToNext(level) = round(BASE_XP * GROWTH_FACTOR^(level-1)). This is
// a smooth geometric climb — edit the two constants to reshape the whole curve.
// At BASE_XP=50, GROWTH_FACTOR=1.18: Lv1→2 needs 50, Lv10→11 ~234, Lv20→21
// ~1218, Lv40→41 ~33k — a sensible, accelerating curve well past level 50.

/** XP required for the very first level (Lv1 → Lv2). */
export const BASE_XP = 50;
/** Per-level multiplier on the XP requirement (>1 = each level costs more). */
export const GROWTH_FACTOR = 1.18;
/** Level cap. At cap the XP bar shows full and no further leveling occurs. */
export const MAX_LEVEL = 50;

/** XP granted for completing the opening quest (on top of its heal + title). */
export const QUEST_XP_REWARD = 120;
/** XP a single press of the dev "grant XP" key awards. */
export const DEV_GRANT_XP_CHUNK = 40;

// --- Combat v1 (melee vs. the Sasquatch) -----------------------------------
//
// The player's effective maxHP and melee damage are DERIVED from level:
//   effectiveMaxHP  = BASE_MAX_HP + (level - 1) * HP_PER_LEVEL
//   effectiveDamage = BASE_DAMAGE + (level - 1) * DMG_PER_LEVEL
// so leveling is felt directly in the existing combat. Edit the four constants
// to tune how strong each level makes you.

/** Player health pool at level 1. */
export const BASE_MAX_HP = 100;
/** Extra max HP gained per level. */
export const HP_PER_LEVEL = 20;
/** Melee swing damage at level 1. */
export const BASE_DAMAGE = 25;
/** Extra melee damage gained per level. */
export const DMG_PER_LEVEL = 5;

/** XP awarded for defeating the Sasquatch (each enemy carries its own xpReward). */
export const SASQUATCH_XP_REWARD = 35;

/** Player melee reach in px (~1.75 tiles at 32px). */
export const PLAYER_ATTACK_RANGE = 58;
/** Minimum time between player swings, in ms. */
export const PLAYER_ATTACK_COOLDOWN_MS = 500;
/** Out-of-combat HP regenerated per second. */
export const PLAYER_HP_REGEN_PER_SEC = 7;
/** How long after combat before regen starts, in ms. */
export const PLAYER_HP_REGEN_DELAY_MS = 4000;

/** Sasquatch health pool. */
export const SASQUATCH_MAX_HP = 120;
/** Damage one Sasquatch strike deals to the player. */
export const SASQUATCH_DAMAGE = 14;
/** Sasquatch move speed in tiles/sec (slightly slower than the player, kiteable). */
export const SASQUATCH_MOVE_TILES_PER_SEC = 6;
/** Distance (px) at which the Sasquatch notices the player and gives chase. */
export const SASQUATCH_AGGRO_RANGE = 224;
/** Distance (px) within which the Sasquatch can strike. */
export const SASQUATCH_ATTACK_RANGE = 64;
/** Cooldown after a Sasquatch strike before it can attack again, in ms. */
export const SASQUATCH_ATTACK_COOLDOWN_MS = 1500;
/** Telegraph (wind-up) duration before a strike lands, in ms — long enough to dodge. */
export const SASQUATCH_WINDUP_MS = 750;
/** Distance (px) at which the Sasquatch gives up the chase and returns home. */
export const SASQUATCH_LEASH_RANGE = 440;

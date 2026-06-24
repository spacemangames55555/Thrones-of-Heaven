/**
 * Tunable gameplay constants. Edit these to change how the world feels.
 *
 * The map is 800 x 800 tiles at 32px each = 25,600 x 25,600 px (Washington in
 * the north 500 rows, Oregon appended below as one continuous landmass).
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


// --- Combat Depth v1: Energy resource --------------------------------------
//
// Energy gates the dash only — the basic swing stays free. Energy regenerates
// over time, pausing briefly right after a spend so dashes can't be chain-cast.

/** Player energy pool (full = this many points). */
export const MAX_ENERGY = 100;
/** Energy regenerated per second once regen resumes. */
export const ENERGY_REGEN_PER_SEC = 18;
/** Pause after spending energy before regen resumes, in ms. */
export const ENERGY_REGEN_DELAY_MS = 600;


// --- Combat Depth v1: Dash / lunge -----------------------------------------
//
// A fast directional lunge: a gap-closer AND a light attack. Costs energy + has
// its own cooldown. DASH_DAMAGE is the level-1 base; it grows with the player's
// level at the same rate as the melee swing (DMG_PER_LEVEL), so it stays useful.

/** Dash damage at level 1 (then + DMG_PER_LEVEL per level, like the melee swing). */
export const DASH_DAMAGE = 35;
/** Energy spent per dash. */
export const DASH_ENERGY_COST = 35;
/** Minimum time between dashes, in ms (prevents spam even at full energy). */
export const DASH_COOLDOWN_MS = 900;
/** How far a dash travels, in px (~5 tiles at 32px). */
export const DASH_DISTANCE = 170;
/** How fast the dash moves, in px/sec (much faster than walking). */
export const DASH_SPEED = 760;
/** Radius (px) around the player that the dash damages enemies it passes through. */
export const DASH_HIT_RADIUS = 46;


// --- Combat Depth v1: Spirit Swarmer enemy (Spirit-Vision-gated) ------------
//
// A fast, weak swarmer that exists on the SPIRITUAL layer — only visible and
// fightable while Spirit Vision is ON. Dangerous in numbers, not individually:
// rushes the player and bites on contact (short per-swarmer cooldown), no
// wind-up. Spawns as a pack near the Corruption Rift.

/** Swarmer health pool (dies in ~1–2 player hits). */
export const SWARMER_MAX_HP = 30;
/** Swarmer move speed in tiles/sec (faster than the player's 8 — it closes fast). */
export const SWARMER_MOVE_TILES_PER_SEC = 10;
/** Contact damage one swarmer bite deals to the player. */
export const SWARMER_CONTACT_DAMAGE = 6;
/** Cooldown between a swarmer's bites, in ms (stops instant melt by the pack). */
export const SWARMER_ATTACK_COOLDOWN_MS = 800;
/** Distance (px) at which a swarmer notices the player and rushes in. */
export const SWARMER_AGGRO_RANGE = 320;
/** XP awarded for killing one swarmer. */
export const SWARMER_XP_REWARD = 10;
/** How many swarmers spawn together in a pack. */
export const SWARM_PACK_SIZE = 4;


// --- Angel enemy + projectiles (the first RANGED enemy + projectile system) --
//
// A ranged, kiting angel on the NORMAL world layer (NOT Spirit-Vision-gated),
// with two data-driven variants from one definition: ANGEL (elite) and ARCHANGEL
// (boss). It maintains a preferred range and fires travelling holy bolts the
// player can DODGE; bolts are stopped by blocking terrain and despawn at range.

/** Collision radius (px) of a holy bolt. */
export const HOLY_BOLT_RADIUS = 7;
/** Radius (px) around the player a bolt must reach to hit (small → dodgeable). */
export const PROJECTILE_PLAYER_HIT_RADIUS = 12;

export interface AngelVariantConfig {
  /** Health pool. */
  readonly maxHP: number;
  /** Damage one holy bolt deals to the player. */
  readonly projectileDamage: number;
  /** Bolt travel speed in px/sec. */
  readonly projectileSpeed: number;
  /** Bolt max travel distance in px before it despawns. */
  readonly projectileRange: number;
  /** Time between volleys, in ms. */
  readonly fireCooldownMs: number;
  /** Bolts loosed per volley (1 = single shot; >1 = a spread). */
  readonly boltsPerVolley: number;
  /** Distance (px) at which it notices the player and engages. */
  readonly aggroRange: number;
  /** The standoff distance (px) it tries to hold: backs off if closer, advances if farther. */
  readonly preferredRange: number;
  /** Move speed in tiles/sec (slower than the player so it can be cornered + meleed). */
  readonly moveTilesPerSec: number;
  /** XP awarded on death. */
  readonly xpReward: number;
  /** Holy Power pickups dropped on death (Angel 1, Archangel more). */
  readonly holyPowerDrop: number;
  /** Sprite scale (the Archangel is visibly larger). */
  readonly scale: number;
  /** Sprite tint. */
  readonly color: number;
}

export type AngelVariantKey = 'angel' | 'archangel';

/**
 * The two angel variants — pure DATA. Edit a field to retune that variant; both
 * run the SAME behavior/code (AngelEnemy). The Archangel is the boss config.
 */
export const ANGEL_VARIANTS: Record<AngelVariantKey, AngelVariantConfig> = {
  angel: {
    maxHP: 150,
    projectileDamage: 12,
    projectileSpeed: 260,
    projectileRange: 520,
    fireCooldownMs: 1500,
    boltsPerVolley: 1,
    aggroRange: 460,
    preferredRange: 300,
    moveTilesPerSec: 5,
    xpReward: 45,
    holyPowerDrop: 1,
    scale: 1.0,
    color: 0xffe6a0,
  },
  archangel: {
    maxHP: 520,
    projectileDamage: 22,
    projectileSpeed: 330,
    projectileRange: 620,
    fireCooldownMs: 950,
    boltsPerVolley: 3,
    aggroRange: 560,
    preferredRange: 340,
    moveTilesPerSec: 5.5,
    xpReward: 160,
    holyPowerDrop: 3,
    scale: 1.5,
    color: 0xfff4d0,
  },
};


// --- Holy Power (collectible quest item dropped by angels) ------------------
// (The pickup mote's collect radius + color are data in src/world/pickupData.ts;
//  per-variant drop amounts are `holyPowerDrop` on ANGEL_VARIANTS above.)

/** How much one press of the dev "Grant Holy Power" button adds. */
export const DEV_GRANT_HOLY_POWER = 5;


// --- The Descent arc (quests 1–4) ------------------------------------------
//
// Authored, corruption-gated quest chain in Oregon. Locations are placeholder
// world positions near the spirit corridor (all verified walkable). The Dark
// Outpost is the hub the player returns to; the patron (the Oregon spirit) gives
// every quest. Edit positions / group sizes here; quest TEXT lives in questData.ts.

/** The arc hub: where the dark patron dwells; "return to the outpost" centers here. */
export const DARK_OUTPOST_POSITION = { x: 12048, y: 13456 };
/** Oregon City — Quest 1 guardsmen + Quest 3 angels spawn here. */
export const OREGON_CITY_POSITION = { x: 12800, y: 13300 };
/** The farm field — Quest 2 farmers + the shipment pickup. */
export const FARM_FIELD_POSITION = { x: 11650, y: 13650 };
/** Quest 4's two marked spots. */
export const DESCENT_LOC_A = { x: 12700, y: 14100 };
export const DESCENT_LOC_B = { x: 11800, y: 14150 };

/** Proximity (px) that completes a "reach the outpost" / "travel to" objective. */
export const REACH_OUTPOST_RANGE = 90;

/** Group sizes per arc objective. */
export const DESCENT_GUARDSMEN_COUNT = 4;
export const DESCENT_FARMERS_COUNT = 4;
export const DESCENT_OC_ANGELS = 3; // Quest 3
export const DESCENT_LOC_ANGELS = 2; // Quest 4, per location


// --- Portal Defense (wave-defense encounter) -------------------------------
//
// Protect a destructible Dark Portal from waves of townsfolk. Win by surviving
// all waves; lose if the portal's HP reaches 0. A self-contained, triggerable
// encounter (PortalDefense + Townsfolk + DarkPortal) — not wired to a quest.

// --- The portal objective ---
/** Portal health pool — the player loses if it hits 0. */
export const PORTAL_MAX_HP = 300;
/** Portal world position (Oregon, near the spirit corridor — placeholder spot). */
export const PORTAL_POSITION = { x: 12432, y: 13776 };
/** Distance (px) within which a townsfolk can strike the portal. */
export const PORTAL_ATTACK_RANGE = 56;

// --- The townsfolk enemy (melee; targets the PORTAL, hits the player if in the way) ---
/** Townsfolk health pool (a couple of player hits). */
export const TOWNSFOLK_MAX_HP = 40;
/** Townsfolk move speed in tiles/sec (slower than the player → interceptable). */
export const TOWNSFOLK_MOVE_TILES_PER_SEC = 4.5;
/** Damage one townsfolk strike deals to the PORTAL. */
export const TOWNSFOLK_PORTAL_DAMAGE = 8;
/** Damage one townsfolk strike deals to the PLAYER (when blocked / adjacent). */
export const TOWNSFOLK_PLAYER_DAMAGE = 7;
/** Cooldown between a townsfolk's strikes, in ms. */
export const TOWNSFOLK_ATTACK_COOLDOWN_MS = 1000;
/** Distance (px) within which a townsfolk hits the player instead of advancing. */
export const TOWNSFOLK_CONTACT_RANGE = 28;
/** Player-hunting townsfolk (the descent arc) idle at their post until the player is this close. */
export const TOWNSFOLK_AGGRO_RANGE = 340;
/** XP awarded for killing one townsfolk. */
export const TOWNSFOLK_XP_REWARD = 12;

/**
 * Townsfolk VARIANTS — a reskin layer over the one Townsfolk class (same melee
 * behavior, different tint + XP). The descent arc uses 'guardsman' and 'farmer';
 * 'townsperson' is the portal-defense default. Edit a tint/XP to retune a look.
 */
export type TownsfolkVariant = 'townsperson' | 'guardsman' | 'farmer';
export const TOWNSFOLK_VARIANTS: Record<TownsfolkVariant, { color: number; xpReward: number }> = {
  townsperson: { color: 0xffffff, xpReward: TOWNSFOLK_XP_REWARD }, // no tint (default brown)
  guardsman: { color: 0x9fb6e6, xpReward: 16 }, // steel-blue
  farmer: { color: 0xbfe089, xpReward: 13 }, // straw-green
};

// --- The wave sequence ---
/** Enemies per wave (escalating); the array LENGTH is the number of waves. */
export const PORTAL_DEFENSE_WAVES = [3, 5, 7];
/** Pause (ms) between a cleared wave and the next. */
export const PORTAL_DEFENSE_BREATHER_MS = 4000;
/** Short pause (ms) after Start before wave 1 spawns. */
export const PORTAL_DEFENSE_INTRO_MS = 1500;
/** Safety: force-advance a non-final wave after this long if it stalls (ms). */
export const PORTAL_DEFENSE_WAVE_TIMEOUT_MS = 30000;
/** Townsfolk spawn points, as offsets (px) from the portal; cycled per wave. */
export const PORTAL_SPAWN_OFFSETS: { dx: number; dy: number }[] = [
  { dx: 0, dy: -200 },
  { dx: 190, dy: -70 },
  { dx: 190, dy: 70 },
  { dx: 0, dy: 200 },
  { dx: -190, dy: 70 },
  { dx: -190, dy: -70 },
];

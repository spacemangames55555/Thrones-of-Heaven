/**
 * Tunable gameplay constants. Edit these to change how the world feels.
 *
 * The map is 1100 x 800 tiles at 32px each = 35,200 x 25,600 px (Washington in
 * the north 500 rows, Oregon below as one continuous landmass, and IDAHO appended
 * to the east as the new columns 800–1099 — WA/OR pixels are unchanged).
 */

/**
 * Player run speed, expressed in TILES PER SECOND (stable across tile-size changes;
 * the actual px/s = this × tile size). At 8 tiles/s, crossing the full 1100-tile world
 * (WA/OR + Idaho) west↔east takes ~2.3 minutes of straight running.
 */
export const PLAYER_SPEED_TILES_PER_SEC = 8;
/** Tile size in px (mirrors render/tileAtlas TILE_SIZE; inlined to keep settings free of
 *  Phaser-importing modules). */
const TILE_PX = 32;

// ─── COMBAT FEEL PASS — four independent, individually-tunable knobs ────────────
//
// 1) RUN_SPEED            — the single run speed (px/sec). Movement is run-only with
//    instant direction changes (no walk, no momentum). Class/skill move multipliers
//    still apply RELATIVE to this. (Piece 1)
// 2) AIM-ASSIST           — light cone snap toward the nearest enemy when firing a
//    player projectile (NOT lock-on). Set the cone to 0 (or the dev toggle) to disable.
// 3) PROJECTILE_SIZE_SCALE— a small visual+hitbox bump for PLAYER projectiles. 1 = off.
// 4) DRAG_AIM_THRESHOLD   — px of drag from a skill button that turns a tap (quick fire)
//    into an aim (drag → indicator → release fires aimed). Huge value = drag-aim off.

/** PIECE 1 — the one player run speed, in px/sec (run-only; instant turns). */
export const RUN_SPEED = PLAYER_SPEED_TILES_PER_SEC * TILE_PX;

/** PIECE 2 — half-angle (radians) of the aim-assist forgiveness cone around the aim
 *  direction. Small = skillful, larger = forgiving. ~18° default. */
export const AIM_ASSIST_CONE_ANGLE = (18 * Math.PI) / 180;
/** PIECE 2 — only assist toward enemies within this distance (px) of the player. */
export const AIM_ASSIST_MAX_RANGE = 460;

/** PIECE 3 — modest size bump for PLAYER projectiles (visual + hitbox). 1 = unchanged. */
export const PROJECTILE_SIZE_SCALE = 1.25;

/** PIECE 4 — drag distance (px) from a skill button that distinguishes a TAP (quick
 *  fire) from a DRAG (aim mode). */
export const DRAG_AIM_THRESHOLD = 18;

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

// --- Transient combat FX pools (perf) --------------------------------------
//
// Floating damage numbers + impact circles were the measured cause of the
// under-load stutter: allocating/destroying a `Text` costs ~0.7 ms each, so a
// crowd taking AoE/DoT damage spawned dozens per frame and blew the frame budget.
// They are now POOLED (src/combat/FxPools.ts) and reused. These caps are the
// MAX concurrent items: a burst recycles the oldest instead of allocating, so the
// frame cost is bounded no matter how much happens at once. Tune up if you ever
// see labels/flashes disappear too early under extreme load.
export const MAX_FLOATING_TEXTS = 48; // concurrent damage numbers / combat labels
export const MAX_CIRCLE_FX = 48; // concurrent impact/pulse circles

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

/**
 * PER-CLASS BASE STATS. The four constants above are the BLACKSMITH baseline; each
 * playable class scales HP/damage/move-speed off its own profile so classes feel
 * distinct (the Blacksmith is a tanky bruiser; the Wizard is a fragile glass-cannon
 * caster). PlayerProgression reads the active class's profile for effectiveMaxHP /
 * effectiveDamage; the scene applies `moveSpeedMult` on top of skill move bonuses.
 * Keyed by ClassId string to avoid a settings→skills import cycle. EDIT TO TUNE.
 */
export interface ClassBaseStats {
  /** HP pool at level 1. */
  baseMaxHP: number;
  /** Extra max HP per level. */
  hpPerLevel: number;
  /** Ability/melee base damage at level 1 (skill damage scales off this via the level slope). */
  baseDamage: number;
  /** Extra base damage per level. */
  dmgPerLevel: number;
  /** Class move-speed multiplier (1 = the Blacksmith baseline). */
  moveSpeedMult: number;
}

export const CLASS_BASE_STATS: Record<string, ClassBaseStats> = {
  // Blacksmith — the existing tanky baseline (unchanged numbers).
  blacksmith: { baseMaxHP: BASE_MAX_HP, hpPerLevel: HP_PER_LEVEL, baseDamage: BASE_DAMAGE, dmgPerLevel: DMG_PER_LEVEL, moveSpeedMult: 1 },
  // Wizard — fragile glass cannon: low HP, slightly faster, high spell damage.
  wizard: { baseMaxHP: 60, hpPerLevel: 11, baseDamage: 34, dmgPerLevel: 8, moveSpeedMult: 1.1 },
  // Necromancer — Slavic death-sorcerer. IN-BETWEEN durability: hardier than the
  // fragile Wizard, squishier than the Blacksmith; normal move speed. (Tune here.)
  necromancer: { baseMaxHP: 80, hpPerLevel: 16, baseDamage: 28, dmgPerLevel: 6, moveSpeedMult: 1 },
};

/** The base-stat profile for a class id (defaults to the Blacksmith baseline). */
export function classBaseStats(classId: string): ClassBaseStats {
  return CLASS_BASE_STATS[classId] ?? CLASS_BASE_STATS.blacksmith;
}

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

/**
 * Sasquatch health pool — the FIRST fight, and (under the no-base-kit model) it must be
 * defeatable by ANY tree's starting damaging active, used solo. The weakest opener is
 * Control's Charge at 22 dmg/cast on a long cooldown, so this is tuned low enough that
 * ~2 casts of any first skill (Shield Bash 24, Bash 26, Charge 22) finish it. Raise it
 * once the player has more than one ability; this value is intentionally forgiving.
 */
export const SASQUATCH_MAX_HP = 44;
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


// --- The Power Swap: demonic → holy ----------------------------------------
//
// At God's judgment the player's power flips from "demonic" (how the game has
// been played) to "holy". The swap is mechanically a RE-SKIN of the existing
// kit (same damage/cooldown/energy/distance — power level UNCHANGED) PLUS one
// new ability, the Holy Bolt. These constants tune ONLY the holy reflavor's
// look and the new Holy Bolt; nothing here changes the demonic kit's mechanics.

/** Golden tint applied to holy-reflavored ability visuals + the player aura. */
export const HOLY_TINT = 0xffd24a;
/** Melee swing arc color while HOLY (demonic stays the original pale gold). */
export const HOLY_SLASH_COLOR = 0xffe066;
/** Dash after-image color while HOLY (demonic stays the original cyan). */
export const HOLY_DASH_COLOR = 0xffe066;
/** Holy Bolt projectile color (radiant gold). */
export const HOLY_BOLT_COLOR = 0xffd24a;

// Holy Bolt — the NEW third player ability (a ranged holy projectile gained on
// becoming holy). Reuses the projectile system with the PLAYER faction so it
// damages enemies. Tune these five constants to retune the ability.
/** Holy Bolt base damage (then + DMG_PER_LEVEL per level, like the melee swing). */
export const PLAYER_HOLY_BOLT_DAMAGE = 30;
/** Energy spent per Holy Bolt (reuses the dash's energy bar). */
export const PLAYER_HOLY_BOLT_ENERGY_COST = 25;
/** Minimum time between Holy Bolts, in ms (prevents spam). */
export const PLAYER_HOLY_BOLT_COOLDOWN_MS = 650;
/** Holy Bolt travel speed in px/sec. */
export const PLAYER_HOLY_BOLT_SPEED = 560;
/** Holy Bolt max travel distance in px before it despawns. */
export const PLAYER_HOLY_BOLT_RANGE = 580;
/** Holy Bolt collision radius (px) for striking enemies. */
export const PLAYER_HOLY_BOLT_RADIUS = 9;


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

export type AngelVariantKey = 'angel' | 'archangel' | 'lesser' | 'warden' | 'herald';

/**
 * The angel variants — pure DATA. Edit a field to retune that variant; all run the
 * SAME behavior/code (AngelEnemy). 'angel'/'archangel' are the originals (Archangel =
 * the boss config). ACT IV adds three:
 *   • 'lesser' — weaker/faster fodder (the common Act IV angel, lots of them).
 *   • 'warden' — tankier/harder-hitting (guarded sites: rivers, the outpost).
 *   • 'herald' — distinct rose-white look for the NAMED/SPEAKING angels (pleaders/
 *     warners); moderate stats, its color + scale mark it as "someone."
 * Spawn any of them with this.spawnAngel('<key>', x, y).
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
  // --- ACT IV angel variants (data rows; reuse the AngelEnemy behavior) ---
  /** LESSER ANGEL — Act IV fodder: low HP, fast, soft bolts. The common many-angel fight. */
  lesser: {
    maxHP: 90,
    projectileDamage: 9,
    projectileSpeed: 280,
    projectileRange: 480,
    fireCooldownMs: 1700,
    boltsPerVolley: 1,
    aggroRange: 440,
    preferredRange: 280,
    moveTilesPerSec: 6,
    xpReward: 30,
    holyPowerDrop: 1,
    scale: 0.85,
    color: 0xfff0c0, // pale gold
  },
  /** WARDEN ANGEL — guards rivers/the outpost: high HP + damage, multi-bolt, slow + far-ranged. */
  warden: {
    maxHP: 300,
    projectileDamage: 18,
    projectileSpeed: 300,
    projectileRange: 560,
    fireCooldownMs: 1100,
    boltsPerVolley: 2,
    aggroRange: 520,
    preferredRange: 320,
    moveTilesPerSec: 4.5,
    xpReward: 90,
    holyPowerDrop: 2,
    scale: 1.25,
    color: 0xcfe0ff, // steel white-blue
  },
  /** HERALD ANGEL — the named/speaking angels (pleaders/warners): moderate stats, distinct look. */
  herald: {
    maxHP: 180,
    projectileDamage: 12,
    projectileSpeed: 270,
    projectileRange: 520,
    fireCooldownMs: 1400,
    boltsPerVolley: 1,
    aggroRange: 480,
    preferredRange: 300,
    moveTilesPerSec: 5,
    xpReward: 60,
    holyPowerDrop: 2,
    scale: 1.15,
    color: 0xffd0e8, // rose-white — marks "someone"
  },
};


// --- Holy Power (collectible quest item dropped by angels) ------------------
// (The pickup mote's collect radius + color are data in src/world/pickupData.ts;
//  per-variant drop amounts are `holyPowerDrop` on ANGEL_VARIANTS above.)

/** How much one press of the dev "Grant Holy Power" button adds. */
export const DEV_GRANT_HOLY_POWER = 5;


// --- Heaven's Defenders: the Cherub (elite) + Cherubim (boss) ----------------
//
// The first HYBRID enemy: dangerous at ALL ranges — fires holy bolts (reusing the
// angel projectile system) AND strikes hard in melee, holding ground instead of
// fleeing like the Earth angel. Two variants from ONE definition (see Cherub.ts):
// CHERUB (elite, tougher than the Earth Archangel) and CHERUBIM (boss tuning,
// multi-bolt volleys). Edit a field to retune that variant.

export type CherubVariantKey = 'cherub' | 'cherubim';

export interface CherubVariantConfig {
  /** Health pool — far tougher than any Earth enemy (Archangel is 520). */
  readonly maxHP: number;
  /** Move speed in tiles/sec (advances to engage; never flees). */
  readonly moveTilesPerSec: number;
  /** XP awarded on death (large). */
  readonly xpReward: number;
  /** Holy Power motes dropped on death (more than Earth angels: Angel 1 / Archangel 3). */
  readonly holyPowerDrop: number;
  /** Sprite scale (larger than the player; the Cherubim is largest). */
  readonly scale: number;
  /** Sprite tint (radiant gold-white). */
  readonly color: number;
  // --- melee ---
  /** Damage one melee strike deals to the player. */
  readonly meleeDamage: number;
  /** Distance (px) within which it strikes in melee instead of firing. */
  readonly meleeRange: number;
  /** Cooldown between melee strikes (ms). */
  readonly meleeCooldownMs: number;
  // --- ranged (reuses the projectile system) ---
  /** Damage one holy bolt deals to the player. */
  readonly projectileDamage: number;
  /** Bolt speed (px/sec). */
  readonly projectileSpeed: number;
  /** Bolt range before it despawns (px). */
  readonly projectileRange: number;
  /** Cooldown between volleys (ms). */
  readonly fireCooldownMs: number;
  /** Bolts per volley (the Cherubim fans multiple). */
  readonly boltsPerVolley: number;
  // --- engagement ---
  /** Distance (px) at which it wakes and engages. */
  readonly aggroRange: number;
  /** Preferred standoff (px): it advances to here but does NOT back off when rushed. */
  readonly preferredRange: number;
}

export const CHERUB_VARIANTS: Record<CherubVariantKey, CherubVariantConfig> = {
  cherub: {
    maxHP: 720,
    moveTilesPerSec: 4.6,
    xpReward: 300,
    holyPowerDrop: 6,
    scale: 1.7,
    color: 0xfff3cf,
    meleeDamage: 26,
    meleeRange: 48,
    meleeCooldownMs: 850,
    projectileDamage: 18,
    projectileSpeed: 300,
    projectileRange: 560,
    fireCooldownMs: 1400,
    boltsPerVolley: 1,
    aggroRange: 520,
    preferredRange: 250,
  },
  cherubim: {
    maxHP: 1700,
    moveTilesPerSec: 4.9,
    xpReward: 750,
    holyPowerDrop: 16,
    scale: 2.4,
    color: 0xffffff,
    meleeDamage: 40,
    meleeRange: 56,
    meleeCooldownMs: 700,
    projectileDamage: 24,
    projectileSpeed: 340,
    projectileRange: 640,
    fireCooldownMs: 950,
    boltsPerVolley: 3,
    aggroRange: 620,
    preferredRange: 300,
  },
};

/** Holy-bolt collision radius for cherub fire (reuses the projectile system). */
export const CHERUB_BOLT_RADIUS = 8;


// --- Archangel Michael: the multi-phase, summoning Heaven boss --------------
//
// THE climactic fight. A single unique boss (not a spawnable type) — a hybrid
// (holy bolts + flaming-sword melee) who ESCALATES across 3 HP-gated PHASES and
// SUMMONS Cherub reinforcements. He now runs on the generic boss framework as a
// data-driven BossDef (MICHAEL_DEF in src/boss/bossData.ts, built from these
// values); the generic controller (src/boss/Boss.ts) drives the phase state
// machine. Edit any field here to retune the hardest fight in the game.

/** One phase's escalating attack profile (Phase 3 is the most intense). */
export interface MichaelPhaseConfig {
  readonly meleeDamage: number;
  readonly meleeCooldownMs: number;
  readonly projectileDamage: number;
  readonly fireCooldownMs: number;
  readonly boltsPerVolley: number;
  /** Reinforcements summoned at phase entry (capped by summonCap). */
  readonly summonCount: number;
  /** Ongoing summon timer within this phase (ms); 0 = only summon on phase entry. */
  readonly summonCadenceMs: number;
}

export const MICHAEL = {
  /** Total HP — far beyond the Cherubim (1700); the hardest fight. */
  maxHP: 6000,
  moveTilesPerSec: 4.6,
  /** Sprite scale (larger/more imposing than the Cherubim's 2.4). */
  scale: 3.2,
  color: 0xffffff,
  /** Distance (px) within which he strikes in melee instead of firing. */
  meleeRange: 66,
  projectileSpeed: 360,
  projectileRange: 660,
  /** Preferred standoff (px): advances to here, never backs off when rushed. */
  preferredRange: 280,
  /** Player within this range of the sanctum activates the boss. */
  activationRange: 300,
  /** Holy-bolt collision radius. */
  boltRadius: 9,

  /** Phase HP thresholds (ratios): Phase 1 above [0], Phase 2 between, Phase 3 below [1]. */
  phaseThresholds: [0.66, 0.33] as [number, number],
  /** Per-phase attack + summon escalation (index 0 = Phase 1). */
  phases: [
    { meleeDamage: 34, meleeCooldownMs: 850, projectileDamage: 20, fireCooldownMs: 1500, boltsPerVolley: 2, summonCount: 2, summonCadenceMs: 0 },
    { meleeDamage: 40, meleeCooldownMs: 750, projectileDamage: 24, fireCooldownMs: 1100, boltsPerVolley: 3, summonCount: 2, summonCadenceMs: 9000 },
    { meleeDamage: 48, meleeCooldownMs: 600, projectileDamage: 28, fireCooldownMs: 800, boltsPerVolley: 4, summonCount: 3, summonCadenceMs: 6000 },
  ] as [MichaelPhaseConfig, MichaelPhaseConfig, MichaelPhaseConfig],

  /** Which enemy he summons (reuses the Cherub), and the concurrent cap. */
  summonType: 'cherub' as CherubVariantKey,
  summonCap: 4,

  /** Defeat rewards (large). */
  xpReward: 3000,
  holyPowerDrop: 40,
} as const;


// --- Demon: Hell's basic melee grunt ---------------------------------------
//
// The first Hell enemy — a simple infernal melee grunt (chase + contact strike),
// reusing the enemy pattern (see Demon.ts). A grunt, NOT a boss/Satan. Edit a
// field to retune. (Player damage already scales with level.)
export const DEMON = {
  /** Health pool — modest (a basic grunt). */
  maxHP: 130,
  /** Move speed in tiles/sec. */
  moveTilesPerSec: 4.8,
  /** Damage one contact strike deals to the player. */
  meleeDamage: 14,
  /** Distance (px) within which it strikes the player. */
  meleeRange: 36,
  /** Cooldown between strikes (ms). */
  meleeCooldownMs: 800,
  /** Distance (px) at which it wakes and chases. */
  aggroRange: 420,
  /** XP awarded on death (no special loot). */
  xpReward: 40,
  /** Sprite scale + tint. */
  scale: 1.2,
  color: 0xff5a3a,
} as const;


// --- The 7 Deadly Sins — Batch 1: Hell bosses (Wrath / Sloth / Gluttony) ----
//
// The first THREE Deadly-Sin bosses, fought IN ORDER in Hell (each unlocks the
// next; see src/boss/SinGauntlet.ts + src/boss/sinsData.ts, which map these
// constants onto the boss FRAMEWORK — there are NO bespoke per-boss classes).
// Three deliberately DISTINCT archetypes:
//   WRATH    = relentless rusher / glass cannon (fast, charges, low-ish HP)
//   SLOTH    = slow huge-HP wall (telegraphed slams + lazy ranged volleys)
//   GLUTTONY = summoner / swarm (Demon adds + telegraphed projectile novas)
// The player arrives holy-powered (~Lv35+); difficulty escalates Sin 1 → 3.
// `placement` is LOCAL Hell pixels (the scene adds the Hell world offset) — edit
// it to move a Sin on the map. EVERY value below is a free tuning knob.

/** SIN 1 — WRATH (the Rusher / glass cannon): fast, aggressive, hits hard, dies fast. */
export const WRATH = {
  name: 'Wrath, the Ireful',
  placement: { x: 14080, y: 11520 }, // east of the Hell gate — the FIRST Sin
  scale: 2.3,
  color: 0xe23b2a,
  maxHP: 3600, // LOW-ish for a boss: a glass cannon
  moveTilesPerSec: 9.2, // faster than the player (8): always closing
  moveTilesPerSecP2: 10.6, // Phase 2 (≤ threshold): even faster
  meleeRange: 72,
  leashRange: 1000,
  activationRange: 320,
  meleeDamage: 95, // HIGH melee
  meleeCooldownMsP1: 850,
  meleeCooldownMsP2: 520, // Phase 2: shorter melee cooldown
  chargeDamage: 150, // heavy telegraphed dash
  chargeSpeed: 900, // dash velocity (px/sec)
  chargeRange: 540, // dash trigger distance + travel
  chargeTelegraphMs: 600,
  chargeCooldownMs: 4200,
  phase2Threshold: 0.5, // Phase 2 at ≤ 50% HP
  xpReward: 1200,
  holyPowerDrop: 12,
} as const;

/** SIN 2 — SLOTH (the Wall / tank-zoner): enormous HP, crawls, big telegraphed hits. */
export const SLOTH = {
  name: 'Sloth, the Leaden',
  placement: { x: 8200, y: 17800 }, // far south-west — a trek from the gate
  scale: 2.9,
  color: 0x5f8a4a,
  maxHP: 14000, // VERY HIGH: an endurance wall
  moveTilesPerSec: 2.0, // VERY SLOW: barely chases
  meleeRange: 96, // a big body
  preferredRange: 320, // mostly holds ground / zones
  leashRange: 520, // short pull: won't follow far
  activationRange: 300,
  // GROUND SLAM (big telegraphed AoE) — widens + quickens by phase
  slamDamage: 130,
  slamRadiusP1: 180,
  slamRadiusP2: 210,
  slamRadiusP3: 240,
  slamCooldownMsP1: 5000,
  slamCooldownMsP2: 4000,
  slamCooldownMsP3: 3000,
  slamTelegraphMs: 850,
  slamRange: 360, // trigger distance
  // slow RANGED volleys to discourage free poking
  volleyDamage: 42,
  volleyCount: 3,
  volleyCooldownMs: 2600,
  volleySpeed: 240,
  volleyRange: 560,
  phase2Threshold: 0.66,
  phase3Threshold: 0.33,
  xpReward: 1800,
  holyPowerDrop: 16,
} as const;

/** SIN 3 — GLUTTONY (the Summoner / swarm): moderate HP, demon adds + projectile novas. */
export const GLUTTONY = {
  name: 'Gluttony, the Devourer',
  placement: { x: 16000, y: 6600 }, // far north-east (near, not at, the lair)
  scale: 2.7,
  color: 0x9b4fbf,
  maxHP: 6800, // MODERATE
  moveTilesPerSec: 5.0, // moderate
  meleeRange: 78,
  preferredRange: 300,
  leashRange: 760,
  activationRange: 300,
  // SUMMONS — reuse the existing Demon enemy as adds; escalate by phase
  summonEnemy: 'demon',
  summonCap: 6, // concurrent adds cap
  summonCountP1: 2,
  summonCountP2: 3,
  summonCountP3: 4,
  summonCadenceMsP1: 8000,
  summonCadenceMsP2: 6000,
  summonCadenceMsP3: 4500,
  // projectile NOVA / barrage (telegraphed ring) — more bolts by phase
  novaDamage: 46,
  novaCountP1: 10,
  novaCountP2: 14,
  novaCountP3: 18,
  novaSpeed: 260,
  novaRange: 640,
  novaTelegraphMs: 800,
  novaCooldownMs: 5200,
  // modest melee when the player is adjacent
  meleeDamage: 70,
  meleeCooldownMs: 1100,
  phase2Threshold: 0.66,
  phase3Threshold: 0.33,
  xpReward: 2600,
  holyPowerDrop: 22,
} as const;

// --- The 7 Deadly Sins — Batch 2: Envy + Pride (Sins 4 & 5) ------------------
//
// Two more DISTINCT Hell bosses on the framework (src/boss/sinsData.ts maps these
// onto BossDefs — no bespoke classes), order-gated AFTER Sin 3. They showcase the
// TWO new reusable attack patterns:
//   ENVY  = the MIRROR / reactive duelist — "answers" the player (return volley to
//           ranged, mimic-dash to a dash) on top of modest baseline melee + ranged.
//   PRIDE = the SHIELD / invuln-window timing fight — periodically invulnerable for
//           a telegraphed window between melee+ranged combos; commit during the
//           vulnerable window. Phases shrink that window.
// Same difficulty TIER as batch 1. `placement` is LOCAL Hell pixels — edit to move.

/** SIN 4 — ENVY (the Mirror / reactive duelist). */
export const ENVY = {
  name: 'Envy, the Covetous',
  placement: { x: 6800, y: 9800 }, // west-central Hell
  scale: 2.4,
  color: 0x2fbf7a, // envious emerald (distinct from Sloth's olive)
  maxHP: 5600, // moderate
  moveTilesPerSec: 5.6, // moderate
  moveTilesPerSecP2: 6.4, // Phase 2: a touch quicker
  meleeRange: 74,
  preferredRange: 260,
  leashRange: 820,
  activationRange: 300,
  // modest baseline melee + ranged
  meleeDamage: 80,
  meleeCooldownMs: 1000,
  volleyDamage: 40,
  volleyCount: 2,
  volleyCooldownMsP1: 2200,
  volleyCooldownMsP2: 1600, // Phase 2: pokes more
  volleySpeed: 320,
  volleyRange: 560,
  // MIRROR / reactive — the core mechanic (answers the player's last action)
  mirrorDamage: 52, // return-volley bolt damage AND mimic-dash contact damage
  mirrorBolts: 3, // return-volley count
  mirrorSpread: 0.18,
  mirrorSpeed: 360,
  mirrorRange: 600, // max distance it will react within
  mirrorDashSpeed: 720, // mimic-dash velocity (px/sec)
  mirrorCooldownMsP1: 2600, // min gap between reactions (answers, doesn't clone)
  mirrorCooldownMsP2: 1800, // Phase 2: reacts more often
  phase2Threshold: 0.5,
  xpReward: 2000,
  holyPowerDrop: 16,
} as const;

/** SIN 5 — PRIDE (the Shielded duelist / read-the-window timing fight). */
export const PRIDE = {
  name: 'Pride, the Exalted',
  placement: { x: 18800, y: 19500 }, // deep south-east Hell
  scale: 2.8,
  color: 0xe8c24a, // regal gold
  maxHP: 7800, // moderate-high
  moveTilesPerSec: 5.0, // disciplined, measured
  meleeRange: 80,
  preferredRange: 280,
  leashRange: 820,
  activationRange: 300,
  // hybrid melee + ranged combos
  meleeDamage: 92,
  meleeCooldownMs: 900,
  volleyDamage: 44,
  volleyCount: 3,
  volleyCooldownMs: 1700,
  volleySpeed: 330,
  volleyRange: 580,
  // SHIELD / invulnerability window — the vulnerable window SHRINKS by phase
  // (longer shield + shorter cadence). Damage is fully blocked while up.
  shieldDurationMsP1: 1800,
  shieldDurationMsP2: 2200,
  shieldDurationMsP3: 2600,
  shieldCadenceMsP1: 7000, // time between shield windows
  shieldCadenceMsP2: 6000,
  shieldCadenceMsP3: 5000,
  phase2Threshold: 0.66,
  phase3Threshold: 0.33,
  xpReward: 2400,
  holyPowerDrop: 20,
} as const;

// --- The 7 Deadly Sins — Batch 3 (FINAL): Greed + Lust (Sins 6 & 7) ----------
//
// The last two Sins complete the gauntlet (order-gated AFTER Sin 5). Greed adds
// the new PERSISTENT GROUND HAZARD pattern; Lust is the CAPSTONE — composed
// ENTIRELY from EXISTING library patterns (charge/slam/summon/shield/nova/hazard)
// cycled across phases, and tuned as the HARDEST of the seven. `placement` is
// LOCAL Hell pixels — edit to move. Every value below is a free tuning knob.

/** SIN 6 — GREED (the Hoarder / zone-control): accumulating ground hazards + ranged. */
export const GREED = {
  name: 'Greed, the Insatiable',
  placement: { x: 6200, y: 6400 }, // far north-west Hell
  scale: 2.6,
  color: 0xf2c233, // hoarder gold
  maxHP: 9000, // moderate-high (upper-batch tier)
  moveTilesPerSec: 3.4, // low-moderate: prefers to hold back and zone
  meleeRange: 78,
  preferredRange: 340, // stays at range, denying the floor
  leashRange: 900,
  activationRange: 320,
  // PERSISTENT GROUND HAZARD — the core mechanic (accumulating gold-fire zones)
  hazardDamage: 22, // damage per tick to a player standing in a zone
  hazardRadiusP1: 66,
  hazardRadiusP2: 74,
  hazardRadiusP3: 82,
  hazardCadenceMsP1: 3400, // time between drops (quickens by phase)
  hazardCadenceMsP2: 2600,
  hazardCadenceMsP3: 2000,
  hazardCapP1: 4, // max concurrent zones (grows by phase → more denial)
  hazardCapP2: 6,
  hazardCapP3: 8,
  hazardLifetimeMs: 9000, // each zone lingers this long (0 would be whole-fight)
  hazardTelegraphMs: 650,
  hazardRange: 620, // max distance it will drop a zone at the player
  // ranged volleys from range + modest melee if cornered
  volleyDamage: 44,
  volleyCount: 3,
  volleyCooldownMs: 2000,
  volleySpeed: 320,
  volleyRange: 600,
  meleeDamage: 78,
  meleeCooldownMs: 1000,
  phase2Threshold: 0.66,
  phase3Threshold: 0.33,
  xpReward: 3000,
  holyPowerDrop: 24,
} as const;

/** SIN 7 — LUST (the Chaos Finale / capstone): the HARDEST Sin — cycles EXISTING
 *  patterns by phase (Wrath→Sloth→Pride→all). Composed purely from library kinds. */
export const LUST = {
  name: 'Lust, the Devouring',
  placement: { x: 12000, y: 20800 }, // deep south Hell — the finale site
  scale: 3.0,
  color: 0xd6336c, // feverish crimson-magenta
  maxHP: 15000, // HIGH — the hardest, a final wall before the Trinity
  moveTilesPerSec: 5.6,
  moveTilesPerSecP1: 8.6, // Phase 1 is Wrath-like: faster than the player
  meleeRange: 84,
  preferredRange: 300,
  leashRange: 1000,
  activationRange: 340,
  meleeDamage: 96,
  meleeCooldownMs: 850,
  // P1 — Wrath-like: charge
  chargeDamage: 150,
  chargeSpeed: 900,
  chargeRange: 560,
  chargeTelegraphMs: 560,
  chargeCooldownMs: 4200,
  // P2 — Sloth-like: slam AoE + ranged + Gluttony-like summons
  slamDamage: 130,
  slamRadius: 220,
  slamTelegraphMs: 800,
  slamCooldownMs: 4000,
  slamRange: 360,
  volleyDamage: 48,
  volleyCount: 3,
  volleyCooldownMs: 1600,
  volleySpeed: 330,
  volleyRange: 600,
  summonEnemy: 'demon',
  summonCount: 3,
  summonCap: 5,
  summonCadenceMs: 7000,
  // P3 — Pride-like: shield windows + Gluttony-like nova barrage
  shieldDurationMs: 2200,
  shieldCadenceMs: 6000,
  novaDamage: 50,
  novaCount: 16,
  novaSpeed: 280,
  novaTelegraphMs: 800,
  novaCooldownMs: 5000,
  // P4 — chaos: mirror + a denser nova + a ground hazard
  mirrorDamage: 56,
  mirrorBolts: 3,
  mirrorSpeed: 360,
  mirrorRange: 620,
  mirrorDashSpeed: 760,
  mirrorCooldownMs: 1800,
  hazardDamage: 24,
  hazardRadius: 80,
  hazardCadenceMs: 3000,
  hazardCap: 5,
  hazardLifetimeMs: 8000,
  hazardTelegraphMs: 600,
  hazardRange: 640,
  novaCountP4: 20,
  // phase thresholds (4 phases)
  phase2Threshold: 0.75,
  phase3Threshold: 0.5,
  phase4Threshold: 0.25,
  xpReward: 4200,
  holyPowerDrop: 32,
} as const;

/** The full Deadly-Sin gauntlet size — now COMPLETE (all seven authored). */
export const SINS_TOTAL = 7;


// --- The Unholy Trinity, Part 1: Dragon + Beast (the finale gauntlet) --------
//
// A STAGED gauntlet at Satan's Lair (enterable once all 7 Sins are beaten):
// Dragon → breather → Beast → "Satan awaits" placeholder. Both are DATA on the
// boss framework (src/boss/trinityData.ts maps these onto BossDefs — no bespoke
// classes), composed ENTIRELY from existing library patterns. Tuned HARDER than
// the seven Sins (Beast harder than Dragon). Satan + the ending are the NEXT
// build. Every value below is a free tuning knob.

/** The lair ARENA (LOCAL Hell px) — where the Dragon/Beast spawn + are fought (just
 *  south of Satan's Lair at SATAN_LAIR ≈ (11520, 8600) in hellWorld.ts). */
export const TRINITY_ARENA = { x: 11520, y: 9000 };
/** Proximity (px) to the lair that OPENS + enters the Trinity (once 7 Sins beaten). */
export const TRINITY_ENTER_RANGE = 230;
/** Recovery pause between stages, in ms (HP + energy restored, a beat, then the next boss). */
export const TRINITY_BREATHER_MS = 3200;

/** STAGE 1 — THE DRAGON (aerial devastator / evasion fight): fast, dives, fire + flames. */
export const DRAGON = {
  name: 'The Dragon',
  scale: 3.4, // large + imposing
  color: 0xb01a1a, // deep draconic red
  maxHP: 16000, // high (harder than every Sin) — but evasive, so it plays bigger
  moveTilesPerSec: 8.8, // FAST + mobile (faster than the player)
  moveTilesPerSecP2: 9.6,
  moveTilesPerSecP3: 10.6, // faster dives in later phases
  meleeRange: 84,
  preferredRange: 300,
  leashRange: 1100,
  activationRange: 360,
  meleeDamage: 92, // a snap if you're right under it
  meleeCooldownMs: 950,
  // CHARGE — the swooping DIVE (quickens by phase)
  chargeDamage: 170,
  chargeSpeed: 1000,
  chargeRange: 600,
  chargeTelegraphMs: 520,
  chargeCooldownMsP1: 3600,
  chargeCooldownMsP2: 2800,
  chargeCooldownMsP3: 2200,
  // BARRAGE — "fire breath" nova (more bolts by phase)
  fireDamage: 52,
  fireCountP1: 12,
  fireCountP2: 16,
  fireCountP3: 20,
  fireSpeed: 300,
  fireTelegraphMs: 680,
  fireCooldownMs: 3800,
  fireRange: 640,
  // HAZARD — "lingering flames" that deny space (more/bigger/faster by phase)
  flameDamage: 24,
  flameRadiusP1: 70,
  flameRadiusP2: 78,
  flameRadiusP3: 86,
  flameCadenceMsP1: 4200,
  flameCadenceMsP2: 3200,
  flameCadenceMsP3: 2400,
  flameCapP1: 3,
  flameCapP2: 5,
  flameCapP3: 7,
  flameLifetimeMs: 7000,
  flameTelegraphMs: 600,
  flameRange: 620,
  phase2Threshold: 0.66,
  phase3Threshold: 0.33,
  xpReward: 5000,
  holyPowerDrop: 36,
} as const;

/** STAGE 2 — THE BEAST (armored summoner-bruiser / multi-axis attrition): the HARDEST. */
export const BEAST = {
  name: 'The Beast',
  scale: 4.0, // the biggest, most imposing silhouette
  color: 0x6a3aa0, // bruised corruption-purple
  maxHP: 24000, // VERY HIGH — the hardest fight in the game so far
  moveTilesPerSec: 3.4, // moderate-slow, overwhelming
  meleeRange: 94,
  preferredRange: 240,
  leashRange: 760,
  activationRange: 360,
  meleeDamage: 110, // heavy melee up close
  meleeCooldownMs: 900,
  // SUMMON — demon adds (count + cadence escalate; shared cap)
  summonEnemy: 'demon',
  summonCap: 8,
  summonCountP1: 2,
  summonCountP2: 3,
  summonCountP3: 4,
  summonCountP4: 5,
  summonCadenceMsP1: 9000,
  summonCadenceMsP2: 7000,
  summonCadenceMsP3: 5500,
  summonCadenceMsP4: 4500,
  // SLAM — heavy ground AoE (quickens by phase)
  slamDamage: 150,
  slamRadius: 240,
  slamTelegraphMs: 850,
  slamRange: 380,
  slamCooldownMsP1: 5000,
  slamCooldownMsP2: 4200,
  slamCooldownMsP3: 3600,
  slamCooldownMsP4: 3000,
  // SHIELD — armored invuln windows (cadence shortens, window grows)
  shieldDurationMsP1: 2000,
  shieldDurationMsP2: 2200,
  shieldDurationMsP3: 2400,
  shieldDurationMsP4: 2600,
  shieldCadenceMsP1: 7500,
  shieldCadenceMsP2: 6500,
  shieldCadenceMsP3: 5500,
  shieldCadenceMsP4: 5000,
  // HAZARD — spreading "corruption" (introduced P2, thickens after)
  corruptDamage: 22,
  corruptRadius: 82,
  corruptLifetimeMs: 9000,
  corruptTelegraphMs: 650,
  corruptRange: 600,
  corruptCadenceMsP2: 5000,
  corruptCadenceMsP3: 4000,
  corruptCadenceMsP4: 3200,
  corruptCapP2: 4,
  corruptCapP3: 5,
  corruptCapP4: 6,
  phase2Threshold: 0.75,
  phase3Threshold: 0.5,
  phase4Threshold: 0.25,
  xpReward: 7000,
  holyPowerDrop: 50,
} as const;

/** STAGE 3 — SATAN (the FINAL boss): the hardest fight, 4 phases escalating through
 *  the FULL pattern library + the new HELLFIRE eruption + a final ENRAGE (≤25%).
 *  Defeating him triggers the redemption ENDING (no loot). Composed from existing
 *  patterns + 'hellfire' — a DATA boss, no bespoke code. Tune freely. */
export const SATAN = {
  name: 'SATAN, the Adversary',
  scale: 4.6, // the grandest, most imposing silhouette in the game
  color: 0xa01818, // deep infernal crimson
  maxHP: 32000, // the highest HP in the game — the ultimate fight
  moveTilesPerSec: 5.0,
  moveTilesPerSecP4: 6.2, // ENRAGE: faster in the final phase
  meleeRange: 96,
  preferredRange: 280,
  leashRange: 1100,
  activationRange: 380,
  meleeDamage: 120,
  meleeCooldownMs: 850,
  meleeCooldownMsP4: 600, // enrage
  // ranged volley (P1 poke)
  volleyDamage: 50,
  volleyCount: 3,
  volleySpeed: 330,
  volleyCooldownMs: 1700,
  volleyRange: 620,
  // CHARGE (dive) — quickens in the enrage
  chargeDamage: 180,
  chargeSpeed: 1000,
  chargeRange: 600,
  chargeTelegraphMs: 520,
  chargeCooldownMsP1: 3800,
  chargeCooldownMsP4: 2400,
  // BARRAGE nova — more bolts + faster by phase
  novaDamage: 56,
  novaCountP2: 16,
  novaCountP3: 20,
  novaCountP4: 26,
  novaSpeed: 300,
  novaTelegraphMs: 700,
  novaCooldownMs: 3600,
  novaCooldownMsP4: 2400,
  // SUMMON demon adds (escalate; shared cap)
  summonEnemy: 'demon',
  summonCap: 8,
  summonCountP2: 3,
  summonCountP4: 5,
  summonCadenceMsP2: 7000,
  summonCadenceMsP4: 4000,
  // SLAM heavy AoE — quickens by phase
  slamDamage: 150,
  slamRadius: 240,
  slamTelegraphMs: 800,
  slamRange: 380,
  slamCooldownMsP2: 4200,
  slamCooldownMsP3: 3600,
  slamCooldownMsP4: 2800,
  // SHIELD invuln windows (P3+)
  shieldDurationMs: 2000,
  shieldCadenceMsP3: 6500,
  shieldCadenceMsP4: 5000,
  // HAZARD lingering hellground (P3+)
  hazardDamage: 24,
  hazardRadius: 84,
  hazardLifetimeMs: 9000,
  hazardTelegraphMs: 650,
  hazardRange: 620,
  hazardCadenceMsP3: 4000,
  hazardCadenceMsP4: 3000,
  hazardCapP3: 5,
  hazardCapP4: 7,
  // HELLFIRE full-arena eruption (P3+): fewer safe zones + less wind-up when enraged
  hellfireDamage: 200,
  hellfireArenaRadius: 520, // covers the whole lair arena (incl. typical kiting range)
  hellfireSafeRadius: 64,
  hellfireSafeZonesP3: 3,
  hellfireSafeZonesP4: 2, // ENRAGE: harder — fewer safe spots
  hellfireTelegraphMsP3: 1400,
  hellfireTelegraphMsP4: 1100, // ENRAGE: less time to reach safety
  hellfireCooldownMsP3: 9000,
  hellfireCooldownMsP4: 6500,
  phase2Threshold: 0.75,
  phase3Threshold: 0.5,
  phase4Threshold: 0.25, // ENRAGE phase
  xpReward: 8000,
  holyPowerDrop: 0, // the ending is the reward, not loot
} as const;


// --- The Descent arc (quests 1–4) ------------------------------------------
//
// Authored, corruption-gated quest chain in Oregon. Locations are placeholder
// world positions near the spirit corridor (all verified walkable). The Dark
// Outpost is the hub the player returns to; the patron (the Oregon spirit) gives
// every quest. Edit positions / group sizes here; quest TEXT lives in questData.ts.

/** The arc hub: where the dark patron dwells; "return to the outpost" centers here. */
export const DARK_OUTPOST_POSITION = { x: 15600, y: 13100 }; // N-central OR frontier, by the rift (east of Mt. Hood)
/** Oregon City — Quest 1 guardsmen + Quest 3 angels spawn here. */
export const OREGON_CITY_POSITION = { x: 15000, y: 13700 };
/** The farm field — Quest 2 farmers + the shipment pickup. */
export const FARM_FIELD_POSITION = { x: 14700, y: 13900 };
/** Quest 4's two marked spots. */
export const DESCENT_LOC_A = { x: 15900, y: 13900 };
export const DESCENT_LOC_B = { x: 14800, y: 14150 };

/** Proximity (px) that completes a "reach the outpost" / "travel to" objective. */
export const REACH_OUTPOST_RANGE = 90;

/** Group sizes per arc objective. */
export const DESCENT_GUARDSMEN_COUNT = 4;
export const DESCENT_FARMERS_COUNT = 4;
export const DESCENT_OC_ANGELS = 3; // Quest 3
export const DESCENT_LOC_ANGELS = 2; // Quest 4, per location


// --- ACT IV (Batch B) — quests 4.1–4.4 locations + group sizes ---------------
//
// Five new marker targets for the Necromancer's Act IV opening (given by Azazel,
// BEFORE the old descent chain — a temporary bridge keeps the game playable end
// to end). All on WORLD_EARTH, placed inside the SAME verified-walkable Oregon
// corridor as the descent positions above (the descent spots are explicit
// placeholders; these mirror that, spread out so each marker points somewhere
// distinct). Edit positions / group sizes here; quest TEXT lives in questData.ts.

/** 4.1 — Bend OR (SE of Oregon City): the farmers with the materials Azazel needs. */
export const BEND_POSITION = { x: 15600, y: 15300 }; // central OR, east of the Cascades (real Bend)
/** 4.2 — La Grande OR (N, the watchers' road): angels barring the way north. */
export const LA_GRANDE_POSITION = { x: 20000, y: 13600 }; // NE Oregon (Blue Mountains / Grande Ronde)
/** 4.3 — the caravan-intercept route toward Portland (W of the corridor). */
export const CARAVAN_ROUTE_POSITION = { x: 12500, y: 13800 }; // Willamette corridor between the OR towns and Portland
/** 4.4a — Florence OR (coast, far W): the salt patches along the shore. */
export const FLORENCE_POSITION = { x: 2300, y: 15500 }; // the Oregon COAST (far west), mid-OR latitude
/** 4.4b — Roseburg OR (S-central): the cleric who purifies the salt. */
export const ROSEBURG_POSITION = { x: 11400, y: 16700 }; // SW interior OR (Umpqua valley, S of Eugene)

/** 4.1 — Bend farmers (reuse the 'farmer' Townsfolk variant). */
export const BEND_FARMERS_COUNT = 4;
/** 4.2 — La Grande road-watch angels: a mix (the herald is the named speaker). */
export const LAGRANDE_LESSER = 2;
export const LAGRANDE_WARDEN = 1;
export const LAGRANDE_HERALDS = 1;
/** 4.3 — five caravans, each with a small guard knot (reuse 'caravanguard'). */
export const CARAVANS_COUNT = 5;
export const CARAVAN_GUARDS_PER = 2;
/** 4.4a — salt patches to gather along the Florence shore (count-of-N objective). */
export const SALT_PATCHES = 6;
/** 4.4a — Florence wildlife that harasses while gathering (reuse bear/eagle/crab/wolf). */
export const FLORENCE_BEARS = 1;
export const FLORENCE_EAGLES = 3;
export const FLORENCE_CRABS = 2;
/** 4.4b — angels barring the road into Roseburg (mix + a herald warner). */
export const ROSEBURG_LESSER = 3;
export const ROSEBURG_WARDEN = 1;
export const ROSEBURG_HERALDS = 1;


// --- ACT IV (Batch C) — quests 4.5–4.7 locations + group sizes ---------------
//
// The Idaho leg: arrive at the Kamiah outpost (4.5; reuses the patron's existing
// Dark Outpost so Azazel stays reachable — relabelled "Kamiah" in the fiction),
// the OLYMPIA gut-punch (4.5b reuses OLYMPIA_POSITION + the Della NPC from Q1),
// three poisoned rivers (4.6) and three sacked cities (4.7). New marker spots are
// placed in the SAME verified-walkable corridor as the Batch B descent/Act-IV
// positions (placeholders, spread out so each marker points somewhere distinct).
// Edit positions / group sizes here; quest TEXT lives in questData.ts.

/** 4.5 — "Kamiah, ID": the patron's new outpost. Reuses the Dark Outpost coordinate so
 *  Azazel (who stands there) is reachable; it is simply called Kamiah from 4.5 on. */
export const KAMIAH_POSITION = { x: 28000, y: 3900 }; // north-central IDAHO (Clearwater valley, the Mt. McGuire leg)

/** 4.6 — three river headwaters to taint (proximity "Taint the Water" action). */
export const RIVER_1_POSITION = { x: 29600, y: 5600 }; // north-central Idaho uplands
export const RIVER_2_POSITION = { x: 28000, y: 8400 }; // central-west Idaho
export const RIVER_3_POSITION = { x: 30000, y: 9600 }; // central Idaho
/** 4.7 — three weakened Idaho cities to sack. */
export const CITY_1_POSITION = { x: 27000, y: 14600 }; // SW Idaho Snake River plain (Boise-ish)
export const CITY_2_POSITION = { x: 31300, y: 15600 }; // S-central Idaho Snake plain (Twin Falls-ish)
export const CITY_3_POSITION = { x: 32800, y: 13600 }; // SE Idaho (Idaho Falls-ish)

/** 4.5b — the three neighbour men who ambush as you leave the woman's house. */
export const OLYMPIA_NEIGHBORS_COUNT = 3;
/** 4.6 — angels that appear after EACH river is tainted (the herald speaks at river 3). */
export const RIVER_LESSER = 2;
export const RIVER_WARDEN = 1;
export const RIVER_HERALDS = 1; // only added at the THIRD river
/** 4.7 — per city: the (weakened, sick) guards, then the angels that descend over the heart. */
export const CITY_GUARDS = 5;
export const CITY_ANGELS_LESSER = 2;
export const CITY_ANGELS_WARDEN = 1;

// --- ACT IV FINALE (4.8–4.10): Boise + the catapults + the outpost assault ---
//
// 4.8 "Draw Them Down": burn Boise with three catapults (proximity "Fire the
// Catapult" actions; each firing spawns a city-guard defender group). Boise sits
// on the SW Idaho Snake plain, SOUTH-WEST of the 4.5–4.7 quest cluster.
export const BOISE_POSITION = { x: 26200, y: 15000 };
export const CATAPULT_1_POSITION = { x: 25500, y: 14350 }; // NW of the city walls
export const CATAPULT_2_POSITION = { x: 26300, y: 14150 }; // due north
export const CATAPULT_3_POSITION = { x: 27100, y: 14400 }; // NE of the walls
/** Defenders that pour out after EACH catapult fires (city-guard variant). */
export const CATAPULT_DEFENDERS_COUNT = 4;

// 4.9 "The Door Home": the assault on the (emptied) angels' outpost.
// The march objective completes — and the OUTER angel group spawns — when the
// player gets within this radius of the outpost, from ANY approach direction
// (a generous ring, so following the quest arrow always arms the assault layers).
export const ASSAULT_OUTER_TRIGGER_RADIUS = 700;
// Spawn anchors as offsets from HOLY_OUTPOST_POSITION (Kamiah lies to the west).
export const ASSAULT_OUTER_OFFSET = { dx: -340, dy: 80 }; // the OUTER angel group
export const ASSAULT_INNER_OFFSET = { dx: -40, dy: 50 }; // the INNER angel group
export const ASSAULT_OUTER_LESSER = 4;
export const ASSAULT_OUTER_WARDEN = 2;
export const ASSAULT_INNER_LESSER = 3;
export const ASSAULT_INNER_WARDEN = 2;
export const ASSAULT_INNER_HERALD = 1;
// The FINAL layer at the portal: a small angel group that descends ALONGSIDE the
// two flaming-sword guardians (flavor — the guardians' defeat advances the quest).
// Set both to 0 if the guardians alone should carry the final fight.
export const ASSAULT_PORTAL_LESSER = 2;
export const ASSAULT_PORTAL_WARDEN = 1;
/** The demon escort that fights at the player's back through the assault (4.9). */
export const DEMON_ALLY_COUNT = 5;


// --- Portal Defense (wave-defense encounter) -------------------------------
//
// Protect a destructible Dark Portal from waves of townsfolk. Win by surviving
// all waves; lose if the portal's HP reaches 0. A self-contained, triggerable
// encounter (PortalDefense + Townsfolk + DarkPortal) — not wired to a quest.

// --- The portal objective ---
/** Portal health pool — the player loses if it hits 0. */
export const PORTAL_MAX_HP = 300;
/** Portal world position (Oregon, near the spirit corridor — placeholder spot). */
export const PORTAL_POSITION = { x: 15400, y: 13550 };
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

// --- Act I (Enumclaw opening) enemy tuning + locations ---------------------
//
// The four grounded opening quests' enemies + objective-marker positions. All
// reuse the Townsfolk melee AI via the variants below. Positions are world px on
// verified-WALKABLE tiles around Enumclaw (Olympia/Tacoma sit on the Sound, so
// their encounters use the nearest walkable shore/urban tile). Quest TEXT lives
// in questData.ts; group sizes + tuning live here.
//
// >>> ACT I COMBAT TUNING. The WOLVES are the first fight under the no-kit model,
//     so a 3-wolf pack (~15 HP each ≈ the old Sasquatch's 44 total) must fall to
//     ANY single starting damaging skill at level 1 — keep them forgiving,
//     exactly as SASQUATCH_MAX_HP was tuned. <<<

/** WOLVES (Quest 2) — the new FIRST combat. Low HP so one starting skill clears the pack. */
export const WOLF_MAX_HP = 15;
export const WOLF_PLAYER_DAMAGE = 5;
export const WOLVES_COUNT = 3;
/** SEA LION (Quest 3) — a single tougher brute. */
export const SEALION_MAX_HP = 40;
export const SEALION_PLAYER_DAMAGE = 10;
/** RAIDERS (Quest 4) — a few organized humans (the player has more skills by now). */
export const RAIDER_MAX_HP = 28;
export const RAIDER_PLAYER_DAMAGE = 8;
export const RAIDERS_COUNT = 3;

// --- ACT IV reskinned human + wildlife variant tuning (DATA-only; reuse Townsfolk AI) ---
//
// The new Act IV cast as Townsfolk variants (tint + HP + contact damage + XP). Act IV
// reuses existing 'farmer'/'guardsman'/'raider' where they fit; these cover the rest.
// NOTE: move speed is a SHARED Townsfolk constant (TOWNSFOLK_MOVE_TILES_PER_SEC), not
// per-variant in the current schema — tune HP/damage/XP/tint here; speed is global.
//
// Humans:
/** CITY GUARD — Idaho city/town defenders: tankier, trained. */
export const CITYGUARD_MAX_HP = 50;
export const CITYGUARD_PLAYER_DAMAGE = 11;
/** CARAVAN GUARD — trade-day wagon defenders: solid mid-tier. */
export const CARAVANGUARD_MAX_HP = 38;
export const CARAVANGUARD_PLAYER_DAMAGE = 9;
/** TOWNSFOLK DEFENDER — civilian neighbors who take up arms (the 3 Olympia neighbors / Bend folk). */
export const DEFENDER_MAX_HP = 24;
export const DEFENDER_PLAYER_DAMAGE = 6;
// Wildlife (Florence coast hazards):
/** BEAR — a heavy coastal brute (high HP + hard hits). */
export const BEAR_MAX_HP = 70;
export const BEAR_PLAYER_DAMAGE = 16;
/** EAGLE — a fragile harasser (low HP, quick pecks). */
export const EAGLE_MAX_HP = 14;
export const EAGLE_PLAYER_DAMAGE = 7;
/** CRAB — slow + armored (high HP, modest damage). */
export const CRAB_MAX_HP = 46;
export const CRAB_PLAYER_DAMAGE = 8;

/** Olympia delivery point (Q1) — nearest walkable urban tile to the Sound-bound city. */
export const OLYMPIA_POSITION = { x: 8240, y: 9008 };
/** The foothills tree line E of Enumclaw (Q2 wolves). */
export const TREE_LINE_POSITION = { x: 11216, y: 6288 };
/** The Tacoma shore (Q3 sea lion) — walkable urban edge beside the Sound. */
export const TACOMA_BEACH_POSITION = { x: 9008, y: 6928 };
/** Snoqualmie Pass, E/NE in the foothills (Q4 raiders). */
export const SNOQUALMIE_PASS_POSITION = { x: 12816, y: 5616 };
/** Proximity (px) that completes the water-pump delivery when talking to Della in Olympia. */
export const ACT1_DELIVERY_RANGE = 90;

// --- Act II (corruption escalation) enemy tuning + locations ---------------
//
// Q5 rabid dogs reuse the Townsfolk melee AI ('dog' variant); Q7's demonic
// raiders reuse the existing Hell DEMON entity (no new art) — DEMON tuning lives
// in its own block. Positions are world px on verified-walkable tiles near
// Enumclaw. Quest TEXT lives in questData.ts.

/** RABID DOGS (Quest 5) — a small afflicted pack; beatable at the player's level. */
export const DOG_MAX_HP = 26;
export const DOG_PLAYER_DAMAGE = 7;
export const DOGS_COUNT = 3;
/** WHITE PASS DEMONS (Quest 7) — how many Hell Demons spawn at the farm. */
export const WHITEPASS_DEMONS_COUNT = 3;

/** Old Pell's farm, SW of Enumclaw (Q5 dogs). */
export const PELLS_FARM_POSITION = { x: 9872, y: 6480 };
/** The corrupted grove on the eastern forest slope (Q6 burn). */
export const CORRUPTED_GROVE_POSITION = { x: 11088, y: 6576 };
/** The White Pass farm, SE toward the pass (Q7 demons). */
export const WHITEPASS_FARM_POSITION = { x: 12816, y: 8336 };
/** Proximity (px) at which the "Burn the Grove" action button shows / the burn fires. */
export const GROVE_BURN_RANGE = 110;
/** Proximity (px) at which an objective's "on arriving" encounter narration plays. */
export const ENCOUNTER_NARRATION_RANGE = 200;

// --- Investigation arc (Quests 8–12) demon encounters + locations ----------
//
// All combat REUSES the Hell Demon entity (no new art); counts are starting
// points (tune in playtest). Positions are world px on verified-walkable tiles
// across the territory. Ambush waypoints sit along each escort route; the player
// triggers them by passing within AMBUSH_TRIGGER_RANGE. Quest TEXT lives in
// questData.ts; the Seattle Druid look is a TownDef (townData.ts).

/** Demon group sizes per objective. */
export const YAKIMA_DEMONS_COUNT = 4; // Q8 defend Yakima
export const BELLINGHAM_DEMONS_COUNT = 3; // Q10 northern farms
export const CASCADES_DEMONS_COUNT = 4; // Q11 the gathering in the high country
export const AMBUSH_DEMONS_COUNT = 2; // each en-route ambush group (Q9 ×3, Q12 ×1)

/** Investigation-arc objective-marker positions (world px). */
export const YAKIMA_POSITION = { x: 15344, y: 9904 };
export const LAKE_CHELAN_POSITION = { x: 16592, y: 5680 };
export const BELLINGHAM_FARMS_POSITION = { x: 9680, y: 1648 };
export const CASCADES_POSITION = { x: 13776, y: 6736 };
export const SEATTLE_POSITION = { x: 9488, y: 5296 }; // fallback; the 'seattle' target resolves to Alder live
export const LONGVIEW_POSITION = { x: 10256, y: 11536 };

/** Q9 escort ambush waypoints (Yakima → Lake Chelan), in route order. */
export const Q9_AMBUSHES = [
  { x: 15718, y: 8636 },
  { x: 16030, y: 7580 },
  { x: 16342, y: 6524 },
];
/** Q12 escort ambush waypoint (toward Longview). */
export const Q12_AMBUSHES = [{ x: 9872, y: 8416 }];
/** Proximity (px) at which an en-route ambush group spawns. */
export const AMBUSH_TRIGGER_RANGE = 300;

// --- Batch 4 finale: Quest 13 + the RIFT SCENE (Semyaza) -------------------
//
// Q13 sends the player to the source — a rift in the N-Oregon high country, east
// of Mt. Hood (distinct from the descent's Dark Outpost). Reaching it begins the
// scripted rift scene: a SIMPLE Semyaza boss (reuses the boss framework) that
// HALTS near death (it is never killed by the player) to trigger the lie/choice,
// where the corruption grant now lives. Tune in playtest.

/** The N-Oregon rift (Q13 target + rift-scene site), world px on a walkable foothill. */
export const OREGON_RIFT_POSITION = { x: 15200, y: 13350 }; // northern Oregon, just east of Mt. Hood (the source)
/** Proximity (px) at which reaching the rift BEGINS the rift scene. */
export const RIFT_SCENE_RANGE = 120;
/** Semyaza is HALTED (the lie cutscene fires) when his HP first drops to this ratio. */
export const SEMYAZA_LIE_THRESHOLD = 0.2;
/** Semyaza boss tuning (single phase; the SCENE matters more than the fight). */
export const SEMYAZA = {
  maxHP: 360,
  moveTilesPerSec: 4.2,
  meleeRange: 60,
  meleeDamage: 12,
  preferredRange: 240,
  projectileRange: 460,
  projectileDamage: 10,
  projectileSpeed: 300,
  boltsPerVolley: 2,
  meleeCooldownMs: 1100,
  fireCooldownMs: 1500,
  leashRange: 900,
  activationRange: 240,
  scale: 2.2,
  color: 0x6a5a8a, // ashen violet — a ruined, lightless thing (placeholder tint)
  xpReward: 220,
};

/**
 * Townsfolk VARIANTS — a reskin layer over the one Townsfolk class (same melee
 * behavior, different tint + per-variant HP / contact damage / XP). The descent
 * arc uses 'guardsman' and 'farmer'; 'townsperson' is the portal-defense default;
 * the Act I opening adds 'wolf' (a low-HP pack — the new FIRST combat), 'sealion'
 * (a single brute), and 'raider'; Act II adds 'dog' (afflicted pack). `maxHP`/
 * `playerDamage` default to the shared TOWNSFOLK_* values when omitted.
 */
export type TownsfolkVariant =
  | 'townsperson'
  | 'guardsman'
  | 'farmer'
  | 'wolf'
  | 'sealion'
  | 'raider'
  | 'dog'
  // --- Act IV humans ---
  | 'cityguard'
  | 'caravanguard'
  | 'defender'
  // --- Act IV wildlife (Florence coast) ---
  | 'bear'
  | 'eagle'
  | 'crab';
export const TOWNSFOLK_VARIANTS: Record<
  TownsfolkVariant,
  { color: number; xpReward: number; maxHP?: number; playerDamage?: number }
> = {
  townsperson: { color: 0xffffff, xpReward: TOWNSFOLK_XP_REWARD }, // no tint (default brown)
  guardsman: { color: 0x9fb6e6, xpReward: 16 }, // steel-blue
  farmer: { color: 0xbfe089, xpReward: 13 }, // straw-green
  dog: { color: 0x6a6f78, xpReward: 14, maxHP: DOG_MAX_HP, playerDamage: DOG_PLAYER_DAMAGE }, // afflicted grey
  // --- Act I (Enumclaw opening) ---
  wolf: { color: 0x8a8f99, xpReward: 12, maxHP: WOLF_MAX_HP, playerDamage: WOLF_PLAYER_DAMAGE }, // grey pack
  sealion: { color: 0x6b5a44, xpReward: 28, maxHP: SEALION_MAX_HP, playerDamage: SEALION_PLAYER_DAMAGE }, // dark brown brute
  raider: { color: 0xc06a5a, xpReward: 20, maxHP: RAIDER_MAX_HP, playerDamage: RAIDER_PLAYER_DAMAGE }, // rust-red brigand
  // --- Act IV humans (reskins of the Townsfolk melee AI) ---
  cityguard: { color: 0x6e86c8, xpReward: 26, maxHP: CITYGUARD_MAX_HP, playerDamage: CITYGUARD_PLAYER_DAMAGE }, // deep steel-blue, Idaho city defenders
  caravanguard: { color: 0xc8a86a, xpReward: 22, maxHP: CARAVANGUARD_MAX_HP, playerDamage: CARAVANGUARD_PLAYER_DAMAGE }, // tan/leather, wagon escorts
  defender: { color: 0xd9c28a, xpReward: 14, maxHP: DEFENDER_MAX_HP, playerDamage: DEFENDER_PLAYER_DAMAGE }, // homespun straw, civilian neighbors
  // --- Act IV wildlife (Florence coast) ---
  bear: { color: 0x5a3f2a, xpReward: 40, maxHP: BEAR_MAX_HP, playerDamage: BEAR_PLAYER_DAMAGE }, // dark brown brute
  eagle: { color: 0xe8e0d0, xpReward: 16, maxHP: EAGLE_MAX_HP, playerDamage: EAGLE_PLAYER_DAMAGE }, // pale feathered harasser
  crab: { color: 0xd86a4a, xpReward: 20, maxHP: CRAB_MAX_HP, playerDamage: CRAB_PLAYER_DAMAGE }, // red-shell armored
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


// --- The Descent climax: Holy Outpost + Heaven Portal + flaming-sword guardians ---
//
// The encounter BEFORE Heaven: a holy outpost with an uncorrupted Heaven Portal
// guarded by TWO flaming-sword guardians (a melee + a ranged pair). Defeat both,
// then corrupt the portal (gold/white → black/purple). A self-contained,
// triggerable unit (FlamingSword ×2 + HeavenPortal, orchestrated by MainScene) —
// NOT wired to the quest chain yet. Positions are placeholder, verified walkable.

/** The HOLY OUTPOST — the angels' door, in the Mount McGuire mountains of IDAHO,
 *  east of Azazel's Kamiah outpost (where Act IV 4.5 located it; the Act IV finale
 *  4.9 assaults it, then the endgame proceeds through its portal). */
export const HOLY_OUTPOST_POSITION = { x: 30000, y: 3200 }; // Mt. McGuire leg, NE of Kamiah (verified walkable + all assault points)
/** The Heaven Portal sits at the outpost centre. */
export const HEAVEN_PORTAL_POSITION = { x: 30000, y: 3200 }; // == Holy Outpost (the portal sits at the outpost)
/** Guardian spawn points, as offsets (px) from the portal (one melee, one ranged). */
export const GUARDIAN_MELEE_OFFSET = { dx: 78, dy: 34 };
export const GUARDIAN_RANGED_OFFSET = { dx: -78, dy: 34 };

/** Player within this range of the outpost wakes the two dormant guardians. */
export const GUARDIAN_ACTIVATION_RANGE = 240;
/** Player within this range of the portal can corrupt it (only once both swords die). */
export const PORTAL_CORRUPT_RANGE = 96;
/** Player within this range of a CORRUPTED portal triggers the placeholder "enter" beat. */
export const PORTAL_ENTER_RANGE = 60;
/** How long the gold/white → black/purple corruption transition plays (ms). */
export const PORTAL_CORRUPT_DURATION_MS = 1000;

export type GuardianRole = 'melee' | 'ranged';

/**
 * The two flaming-sword guardians — ONE data definition, two ROLES, VISUALLY
 * identical (same placeholder sprite). They differ only in behavior + tuning:
 * SWORD A (melee) flies in and slashes; SWORD B (ranged) keeps its distance and
 * flings fire. Tuned as a MINI-BOSS pair — tougher than normal enemies so
 * fighting melee pressure + ranged zoning at once is a real challenge. Edit a
 * field to retune that role. (Player damage already scales with level.)
 */
export interface GuardianConfig {
  /** Health pool (tougher than an Angel's 150; the pair is the challenge). */
  readonly maxHP: number;
  /** Move speed in tiles/sec. */
  readonly moveTilesPerSec: number;
  /** XP awarded on death (via the existing leveling system). */
  readonly xpReward: number;
  // --- Sword A (melee) ---
  /** Damage one slash deals to the player. */
  readonly meleeDamage: number;
  /** Cooldown between slashes (ms). */
  readonly attackCooldownMs: number;
  /** Distance (px) within which the melee sword can slash the player. */
  readonly contactRange: number;
  // --- Sword B (ranged) ---
  /** Damage one fire bolt deals to the player. */
  readonly projectileDamage: number;
  /** Fire bolt speed (px/sec). */
  readonly projectileSpeed: number;
  /** Fire bolt range before it despawns (px). */
  readonly projectileRange: number;
  /** Cooldown between volleys (ms). */
  readonly fireCooldownMs: number;
  /** Standoff range the ranged sword tries to hold (px). */
  readonly preferredRange: number;
}

export const FLAMING_SWORD_VARIANTS: Record<GuardianRole, GuardianConfig> = {
  melee: {
    maxHP: 280,
    moveTilesPerSec: 5.6,
    xpReward: 130,
    meleeDamage: 16,
    attackCooldownMs: 850,
    contactRange: 36,
    projectileDamage: 0,
    projectileSpeed: 0,
    projectileRange: 0,
    fireCooldownMs: 0,
    preferredRange: 0,
  },
  ranged: {
    maxHP: 230,
    moveTilesPerSec: 4.6,
    xpReward: 130,
    meleeDamage: 0,
    attackCooldownMs: 0,
    contactRange: 0,
    projectileDamage: 13,
    projectileSpeed: 300,
    projectileRange: 560,
    fireCooldownMs: 1250,
    preferredRange: 280,
  },
};

/** Fire-bolt collision radius for the ranged guardian (reuses the projectile system). */
export const GUARDIAN_BOLT_RADIUS = 8;


// --- Multi-world + portal transition (Earth <-> Heaven) --------------------
//
// Heaven is a SECOND, separate map built at a large coordinate offset so the two
// worlds never overlap (only one is in the camera's bounds at a time). The same
// player carries across; the transition swaps camera/physics bounds, the player's
// terrain collider, and the zoom's map size. Heaven's terrain/region data lives in
// src/map/heavenWorld.ts; its arrival/return points are derived in
// MainScene.setupHeaven from these offsets.

/** Empty gap (px) between the Earth region and the Heaven region (so neither bleeds). */
export const HEAVEN_WORLD_GAP = 4096;
/** Heaven arrival drops the player this far SOUTH of the return portal (so they don't instantly re-enter). */
export const HEAVEN_ARRIVAL_OFFSET = { dx: 0, dy: 140 };
/** Returning to Earth drops the player this far SOUTH of the Earth Heaven-Portal. */
export const EARTH_RETURN_OFFSET = { dx: 0, dy: 140 };
/** Total portal-transition fade time (ms): half fades out, half fades back in. */
export const WORLD_TRANSITION_MS = 540;
/** Grace period (ms) after a transition during which portal triggers are ignored (prevents bounce-back). */
export const WORLD_TRANSITION_COOLDOWN_MS = 1200;

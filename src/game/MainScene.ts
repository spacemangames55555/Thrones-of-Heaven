import Phaser from 'phaser';
import { GameMap } from '../map/GameMap';
import { preloadTerrainTiles, drawIntoAtlasCell } from '../render/tileAtlas';
import { preloadSpriteOverrides, applySpriteOverrides, applySpriteOverride } from '../render/spriteOverrides';
import { Player } from '../entities/Player';
import { Npc } from '../entities/Npc';
import { Controls } from '../input/Controls';
import { CityMarkers } from '../ui/CityMarkers';
import { DebugReadout } from '../ui/DebugReadout';
import { PerfReadout } from '../ui/PerfReadout';
import { DialogueBox } from '../ui/DialogueBox';
import { TouchButton } from '../ui/TouchButton';
import { ZoomControls } from '../ui/ZoomControls';
import { ChoicePrompt } from '../ui/ChoicePrompt';
import { SpiritVision } from '../spirit/SpiritVision';
import { Angel } from '../entities/Angel';
import { Sasquatch } from '../entities/Sasquatch';
import { SpiritSwarmer } from '../entities/SpiritSwarmer';
import { AngelEnemy } from '../entities/AngelEnemy';
import { Townsfolk } from '../entities/Townsfolk';
import { DarkPortal } from '../entities/DarkPortal';
import { HeavenPortal } from '../entities/HeavenPortal';
import { FlamingSword } from '../entities/FlamingSword';
import { Cherub } from '../entities/Cherub';
import { HellPortal } from '../entities/HellPortal';
import { Demon } from '../entities/Demon';
import { Boss } from '../boss/Boss';
import type { BossAttack, BossDef, BossHooks } from '../boss/bossTypes';
import { MICHAEL_DEF, TEST_BOSS_DEF, SEMYAZA_DEF } from '../boss/bossData';
import { SIN_DEFS } from '../boss/sinsData';
import { SinGauntlet } from '../boss/SinGauntlet';
import { DRAGON_DEF, BEAST_DEF, SATAN_DEF } from '../boss/trinityData';
import { TrinitySequence } from '../boss/TrinitySequence';
import { EarthPortal } from '../entities/EarthPortal';
import { SaveSystem } from '../save/SaveSystem';
import { SAVE_VERSION, SAVE_KEY, type SaveData } from '../save/SaveData';
import { encodeSaveCode, decodeSaveCode } from './saveCode';
import { PortalDefense } from '../encounter/PortalDefense';
import { buildHeavenMapData, HEAVEN_WIDTH, HEAVEN_HEIGHT, HEAVEN_CHERUB_SPAWNS, THRONE_POSITION } from '../map/heavenWorld';
import { buildHellMapData, HELL_WIDTH, HELL_HEIGHT, HELL_DEMON_SPAWNS, SATAN_LAIR } from '../map/hellWorld';
import { WORLD_EARTH, WORLD_HEAVEN, WORLD_HELL, WORLD_EGYPT, WORLD_GLOBE, type WorldId, type WorldRuntime, type WorldMapLike } from '../world/worlds';
import { AFRICA_BUILT_ZONES, buildAfricaQuestDefs, PREBUILT_ZONE_WORLD } from '../world/africa-built';
import { ASIA_BUILT_ZONES, buildAsiaQuestDefs } from '../world/asia-built';
import { FINAL_REGIONS_BUILT_ZONES, buildFinalRegionsQuestDefs } from '../world/final-regions-built';
import { GroundLayer } from '../map/GroundLayer';
import { CITY_DEFS, CITY_FAIYUM, type CityDef } from '../world/cities';
import { MANIFEST_CLASS_FOR, KNOWN_CLASS_NAMES, homeZoneForClass } from '../world/class-canon';
import { SparseWorldMap } from '../map/SparseWorldMap';
import { WORLD_CALIBRATION, WORLD_SPAN_DEGREES } from '../world/world-calibration';
import { createSparseWorld, stampZone, buildChunkMapData, CONTINENT_WORLD, type BuiltChunk } from '../world/world-builder';
import { getZone, WORLD } from '../world/world-manifest';
import { EUROPE_BUILT_ZONES, buildEuropeQuestDefs } from '../world/europe-built';
import { appendToRegistry } from '../world/quest-factory';
import { ENEMY_ROSTER, DOMAIN_TINT, EXISTING_FAMILY_DOMAIN, EXISTING_FAMILY_PACK, makeRegionChampion } from '../world/enemy-roster';
import type { CombatDomain } from '../world/enemy-roster';
import { CHAMPION_SPECS } from '../world/champion-specs';
import { triggerForBeat } from '../world/quest-factory';
import type { Zone as ManifestZone, QuestBeat } from '../world/world-manifest';
import { ProjectileSystem } from '../combat/ProjectileSystem';
import { FloatingTextPool, CircleFxPool, SwingFxPool } from '../combat/FxPools';
import { HazardField } from '../combat/HazardField';
import { PickupSystem, type PickupCollected } from '../world/PickupSystem';
import { HolyPower } from '../progression/HolyPower';
import { Health } from '../combat/Health';
import { HealthBar } from '../combat/HealthBar';
import { HolyBoltButton } from '../ui/HolyBoltButton';
import { LoadoutBar } from '../ui/LoadoutBar';
import { SkillState } from '../skills/SkillState';
import { classSkills, combineMods, isStarterSkill, isAimableSkill, isEquippableSkill, CLASS_SKILLS, type ComposedStep, type SkillDef, type SkillStatMods, type SkillEffect, type ActiveActionId, type ClassId } from '../skills/skillData';
import { TANK_TUNING } from '../skills/blacksmithTank';
import { CONTROL_TUNING, COUNTER_ID, IRON_WILL_ID, DOMINANCE_ID, IRON_PYRITE_ID } from '../skills/blacksmithControl';
import { MARROW_TUNING, MARROWNAUT_ID, OSTEO_AURA_ID } from '../skills/necromancerMarrow';
import {
  SUMMONS_TREE,
  SUMMONS_TUNING,
  UNYIELDING_BEAST_ID,
  NECROTIC_PRESENCE_ID,
  BLOOD_SKELETON_ID,
  MARROW_SKELETON_ID,
  TENTACLES_ID,
} from '../skills/necromancerSummons';
import { DM_TUNING, BLIGHT_ID } from '../skills/necromancerDarkMatter';
import { WIZARD_FIREWIND_TUNING, WIZ_STORM_ID } from '../skills/wizardFireWind';
import { ETHEREAL_TUNING } from '../skills/wizardEthereal';
import { AlliedSummonManager } from '../summon/AlliedSummonManager';
import type { SummonCombatCtx, AlliedSummon } from '../summon/AlliedSummon';
import {
  ICE_GOLEM_CONFIG,
  ICE_GOLEM_TUNING,
  SKELETON_CONFIG,
  SKELETON_TUNING,
  DARK_MATTER_CONFIG,
  DARK_MATTER_TUNING,
  RANGED_ALLY_CONFIG,
  RANGED_ALLY_TUNING,
  DEMON_ALLY_CONFIG,
  DEMON_ALLY_TUNING,
  SUMMON_BUFF_TUNING,
  AGGRO_REEVAL_INTERVAL_MS,
  AGGRO_STICKY_MARGIN,
  type AlliedSummonConfig,
  VIPER_CONFIG,
  VIPER_TUNING,
  WOLVERINE_CONFIG,
  WOLVERINE_TUNING,
  CHIMPANZEE_CONFIG,
  CHIMPANZEE_TUNING,
  SCAVENGER_CONFIG,
  SCAVENGER_TUNING,
  POLAR_BEAR_CONFIG,
  POLAR_BEAR_TUNING,
  VOODOO_DOLL_CONFIG,
  VOODOO_DOLL_TUNING,
  SPIRIT_DECOY_CONFIG,
  SPIRIT_DECOY_TUNING,
  MINI_DECOY_CONFIG,
  EFFIGY_CONFIG,
  EFFIGY_TUNING,
  REVENANT_CONFIG,
  REVENANT_TUNING,
  ASTRAL_DECOY_CONFIG,
  ASTRAL_DECOY_TUNING,
} from '../summon/summonData';
import { TAPESTRY_TUNING, BEAR_MIGHT_ID, ELEPHANT_RAGE_ID } from '../skills/druidTapestry';
import { RESTORATION_TUNING, CLAY_ID, OIL_IMMUNITY_ID, OIL_VITALITY_ID } from '../skills/druidRestoration';
import { SPACETIME_TUNING } from '../skills/mageSpacetime';
import { ARCANE_TUNING, MAGE_ABSORPTION_ID } from '../skills/mageArcane';
import { CRYSTALBLADE_TUNING } from '../skills/mageCrystalblade';
import { BARD_SONGS_TUNING, ECHO_OF_PASSION_ID, SONG_OF_LORE_ID, CHANT_OF_ANCESTORS_ID } from '../skills/bardSongs';
import { BARD_BATTLE_TUNING } from '../skills/bardBattle';
import { BARD_SONIC_TUNING, SONIC_ECHOES_ID } from '../skills/bardSonic';
import { WD_VOODOO_TUNING, SOULBOUND_HEX_ID, SHADOW_STITCH_ID, SPIRIT_ASSAULT_ID, SOUL_HARVEST_ID } from '../skills/witchdoctorVoodoo';
import { WD_DECAY_TUNING } from '../skills/witchdoctorDecay';
import { WD_SPIRIT_TUNING } from '../skills/witchdoctorSpirit';
import { SAM_BLADE_TUNING, RAZORS_EDGE_ID } from '../skills/samuraiBlade';
import { SAM_STANCE_TUNING, COUNTERSTRIKE_ID, IMMOVABLE_MIND_ID } from '../skills/samuraiStances';
import { SAM_BOW_TUNING } from '../skills/samuraiBow';
import { MONK_PALM_TUNING } from '../skills/monkIronPalm';
import { MONK_CHI_TUNING } from '../skills/monkChi';
import { MONK_SPIRIT_TUNING, ENLIGHTENED_MIND_ID, MEDITATION_ID } from '../skills/monkSpiritual';
import { ASN_TRAP_TUNING, TRAP_MASTERY_ID } from '../skills/assassinTraps';
import { ASN_SHADOW_TUNING, POISONED_EDGE_ID } from '../skills/assassinShadow';
import { PRS_LIGHT_TUNING, PRS_FORTRESS_ID } from '../skills/priestLight';
import { PRS_REBUKE_TUNING } from '../skills/priestRebuke';
import { PRS_GRACE_TUNING, PROPHETIC_VISION_ID } from '../skills/priestGrace';
import { SAV_EDGE_TUNING, WARRIORS_MOMENTUM_ID } from '../skills/savageObsidian';
import { SAV_BLOOD_TUNING } from '../skills/savageBlood';
import { SAV_JAGUAR_TUNING, JAGUAR_FORM_ID, BLOOD_SCENT_ID } from '../skills/savageJaguar';
import { PlayerPower } from '../player/PlayerPower';
import { URIEL_SCENE } from '../story/urielData';
import { URIEL_SENDOFF_LINES, RIFT_SCENE } from '../story/riftSceneData';
import { QuestChain, type QuestEvent } from '../quest/QuestChain';
import {
  QUEST_REGISTRY,
  ACT1_HONEST_DAYS_WORK,
  ACT1_WOLVES_TREE_LINE,
  ACT1_SHALLOWS,
  ACT1_THE_PASS,
  ACT2_AFFLICTED_DOGS,
  ACT2_THE_BLIGHT,
  ACT2_WHITE_PASS,
  INV_WORD_TO_YAKIMA,
  INV_IRON_ROAD,
  INV_NORTHERN_FARMS,
  GRETA_LINES,
  ALDER_EXAM_LINES,
  MIRE_VERDICT_LINES,
  SEATTLE_INTRO_LINES,
  Q9_AMBUSH_LINES,
  Q12_AMBUSH_LINES,
  OLYMPIA_DELIVERY_LINES,
  PATRON_IDLE_LINES,
  CLERIC_LINES,
  CLERIC_IDLE_LINE,
  TARGET_WORLD,
  SEVEN_SINS_QUEST_ID,
  type ObjectiveTrigger,
  type TargetKind,
  type QuestDef,
} from '../quest/questData';
import { ObjectiveMarker } from '../quest/ObjectiveMarker';
import { QuestTracker } from '../ui/QuestTracker';
import { DevPanel } from '../ui/DevPanel';
import type { QuestTabRow } from '../ui/QuestTabScene';
import { PlayerProgression } from '../progression/PlayerProgression';
import { OREGON_SPIRIT_ID, PATRON_HOME_POSITION } from '../spirit/spiritData';
import type { SpiritEntity } from '../spirit/SpiritEntity';
import type { Interactable } from '../entities/Interactable';
import type { PlayerPath } from '../story/playerPath';
import { getInsets, UI_MARGIN, DEPTH_HUD_BUTTONS, DEPTH_HUD_TEXTBOX } from '../ui/uiLayout';
import {
  CAMERA_ZOOM,
  PLAYER_ATTACK_RANGE,
  PLAYER_HP_REGEN_PER_SEC,
  PLAYER_HP_REGEN_DELAY_MS,
  SASQUATCH_DAMAGE,
  DEV_GRANT_XP_CHUNK,
  DEV_MODE,
  DEV_ZONE_LABEL_MAX_ZOOM,
  MAX_FLOATING_TEXTS,
  MAX_CIRCLE_FX,
  MAX_SWING_FX,
  DMG_PER_LEVEL,
  MAX_ENERGY,
  ENERGY_REGEN_PER_SEC,
  ENERGY_REGEN_DELAY_MS,
  DASH_DAMAGE,
  DASH_DISTANCE,
  DASH_SPEED,
  DASH_HIT_RADIUS,
  SWARMER_CONTACT_DAMAGE,
  SWARM_PACK_SIZE,
  ANGEL_VARIANTS,
  type AngelVariantKey,
  HOLY_BOLT_RADIUS,
  PROJECTILE_PLAYER_HIT_RADIUS,
  DEV_GRANT_HOLY_POWER,
  PORTAL_POSITION,
  TOWNSFOLK_PORTAL_DAMAGE,
  TOWNSFOLK_PLAYER_DAMAGE,
  TOWNSFOLK_VARIANTS,
  type TownsfolkVariant,
  WOLVES_COUNT,
  RAIDERS_COUNT,
  OLYMPIA_POSITION,
  TREE_LINE_POSITION,
  TACOMA_BEACH_POSITION,
  SNOQUALMIE_PASS_POSITION,
  DOGS_COUNT,
  WHITEPASS_DEMONS_COUNT,
  PELLS_FARM_POSITION,
  CORRUPTED_GROVE_POSITION,
  WHITEPASS_FARM_POSITION,
  GROVE_BURN_RANGE,
  ENCOUNTER_NARRATION_RANGE,
  YAKIMA_DEMONS_COUNT,
  BELLINGHAM_DEMONS_COUNT,
  CASCADES_DEMONS_COUNT,
  AMBUSH_DEMONS_COUNT,
  YAKIMA_POSITION,
  LAKE_CHELAN_POSITION,
  BELLINGHAM_FARMS_POSITION,
  CASCADES_POSITION,
  LONGVIEW_POSITION,
  Q9_AMBUSHES,
  Q12_AMBUSHES,
  AMBUSH_TRIGGER_RANGE,
  OREGON_RIFT_POSITION,
  RIFT_SCENE_RANGE,
  SEMYAZA_LIE_THRESHOLD,
  DARK_OUTPOST_POSITION,
  OREGON_CITY_POSITION,
  FARM_FIELD_POSITION,
  DESCENT_LOC_A,
  DESCENT_LOC_B,
  REACH_OUTPOST_RANGE,
  DESCENT_GUARDSMEN_COUNT,
  DESCENT_FARMERS_COUNT,
  DESCENT_OC_ANGELS,
  DESCENT_LOC_ANGELS,
  // Act IV (Batch B) — 4.1–4.4 locations + group sizes:
  BEND_POSITION,
  LA_GRANDE_POSITION,
  CARAVAN_ROUTE_POSITION,
  FLORENCE_POSITION,
  ROSEBURG_POSITION,
  BEND_FARMERS_COUNT,
  LAGRANDE_LESSER,
  LAGRANDE_WARDEN,
  LAGRANDE_HERALDS,
  CARAVANS_COUNT,
  CARAVAN_GUARDS_PER,
  SALT_PATCHES,
  FLORENCE_BEARS,
  FLORENCE_EAGLES,
  FLORENCE_CRABS,
  ROSEBURG_LESSER,
  ROSEBURG_WARDEN,
  ROSEBURG_HERALDS,
  // Act IV (Batch C) — 4.5–4.7 locations + group sizes:
  KAMIAH_POSITION,
  RIVER_1_POSITION,
  RIVER_2_POSITION,
  RIVER_3_POSITION,
  CITY_1_POSITION,
  CITY_2_POSITION,
  CITY_3_POSITION,
  OLYMPIA_NEIGHBORS_COUNT,
  RIVER_LESSER,
  RIVER_WARDEN,
  RIVER_HERALDS,
  CITY_GUARDS,
  CITY_ANGELS_LESSER,
  CITY_ANGELS_WARDEN,
  // ACT IV FINALE (4.8–4.10) — Boise, the catapults, the outpost assault:
  BOISE_POSITION,
  CATAPULT_1_POSITION,
  CATAPULT_2_POSITION,
  CATAPULT_3_POSITION,
  CATAPULT_DEFENDERS_COUNT,
  ASSAULT_OUTER_TRIGGER_RADIUS,
  ASSAULT_OUTER_OFFSET,
  ASSAULT_INNER_OFFSET,
  ASSAULT_OUTER_LESSER,
  ASSAULT_OUTER_WARDEN,
  ASSAULT_INNER_LESSER,
  ASSAULT_INNER_WARDEN,
  ASSAULT_INNER_HERALD,
  ASSAULT_PORTAL_LESSER,
  ASSAULT_PORTAL_WARDEN,
  DEMON_ALLY_COUNT,
  HOLY_OUTPOST_POSITION,
  HEAVEN_PORTAL_POSITION,
  GUARDIAN_MELEE_OFFSET,
  GUARDIAN_RANGED_OFFSET,
  GUARDIAN_ACTIVATION_RANGE,
  PORTAL_CORRUPT_RANGE,
  PORTAL_ENTER_RANGE,
  PORTAL_CORRUPT_DURATION_MS,
  GUARDIAN_BOLT_RADIUS,
  CHERUB_BOLT_RADIUS,
  type CherubVariantKey,
  HEAVEN_WORLD_GAP,
  HEAVEN_ARRIVAL_OFFSET,
  EARTH_RETURN_OFFSET,
  WORLD_TRANSITION_MS,
  WORLD_TRANSITION_COOLDOWN_MS,
  CITY_TRANSITION_MS,
  CITY_GATE_RANGE,
  EUROPE_SPAWN_ACTIVATE_MARGIN,
  EUROPE_SPAWN_DEACTIVATE_MARGIN,
  EUROPE_ENEMY_CAP,
  EUROPE_CLEAR_KILLS,
  EUROPE_HARVEST_KILLS,
  CASTER_SLOW_MS,
  CASTER_SLOW_FACTOR,
  CASTER_WEAKEN_MS,
  CASTER_WEAKEN_INCOMING,
  CASTER_DOT_TICK_DAMAGE,
  CASTER_DOT_TICK_MS,
  CASTER_DOT_STACK_MS,
  CASTER_DOT_MAX_STACKS,
  AMBUSHER_TRIGGER_RADIUS,
  AMBUSHER_BURST_MS,
  BRUTE_TELEGRAPH_MS,
  BRUTE_STRIKE_RADIUS,
  BRUTE_STRIKE_DAMAGE,
  BRUTE_HP_PER_TIER,
  BRUTE_PACK_CAP,
  ESCORT_NPC_HP,
  ESCORT_NPC_TILES_PER_SEC,
  ESCORT_WAVE_SIZE,
  ESCORT_WAVE_HIT_DAMAGE,
  ESCORT_RETRY_MS,
  ESCORT_ARRIVE_RADIUS,
  CAIRO_WOLF_PACK,
  CAIRO_BOSS_HP,
  CAIRO_INTERACT_RANGE,
  CAIRO_DISCOVERY_RADIUS,
  CAIRO_REPLENISH_MS,
  MENTOR_INTERACT_RANGE,
  BEAT_MARKER_RADIUS,
  BEAT_PICKUP_RADIUS,
  BEAT_PICKUP_COUNT,
  BEAT_ELITE_HP_PER_TIER,
  HOLY_TINT,
  HOLY_SLASH_COLOR,
  HOLY_DASH_COLOR,
  HOLY_BOLT_COLOR,
  PLAYER_HOLY_BOLT_DAMAGE,
  PLAYER_HOLY_BOLT_ENERGY_COST,
  PLAYER_HOLY_BOLT_COOLDOWN_MS,
  PLAYER_HOLY_BOLT_SPEED,
  PLAYER_HOLY_BOLT_RANGE,
  PLAYER_HOLY_BOLT_RADIUS,
  TRINITY_ARENA,
  TRINITY_ENTER_RANGE,
  TRINITY_BREATHER_MS,
  classBaseStats,
  AIM_ASSIST_CONE_ANGLE,
  AIM_ASSIST_MAX_RANGE,
} from './settings';
import { TOWN_TILES, TownTileId } from '../town/townTiles';
import { buildTown, type TownFeatures, type DoorFeature } from '../town/TownBuilder';
import { PORTLAND_TOWN, PORTLAND_NPC_LINES, SEATTLE_DRUID_TOWN } from '../town/townData';
import type { WashingtonMap } from '../map/mapTypes';
import washingtonMap from '../map/washington.map.json';
import egyptMapJson from '../map/egypt.map.json';

// Proximity ranges in px, tuned for 32px tiles.
const DOOR_TRIGGER = 20; // < one tile (32) so returning one tile out doesn't re-enter
const NPC_AUTO_RANGE = 44; // ~1.4 tiles — auto-open dialogue on contact
const NPC_TALK_RANGE = 80; // ~2.5 tiles — show the Talk button

// ACT IV FINALE quest ids (4.8–4.10) — referenced by the assault sequencing, the
// demon-escort spawn, Azazel's relocation, and the 4.10 talk-completion.
const ACT4_DRAW_ID = 'act4-draw-them-down';
const ACT4_DOOR_HOME_ID = 'act4-the-door-home';
const ACT4_HEAVEN_ID = 'act4-heaven';
/** 4.5's id — completing it moves Azazel (and the 'outpost' return hub) to Kamiah. */
const ACT4_KAMIAH_ID = 'act4-the-door-they-came-through';
/** 4.9's objective index for 'guardians-defeated' (the portal fight) — the dormant
 *  guardians hold until the quest reaches this objective + the mask-drop has played. */
const DOOR_HOME_GUARDIANS_OBJ = 3;

// The lone Sasquatch sits in dense forest, 26 tiles north of the HOME-town spawn.
// Derived from the town spawn at create() time so it tracks wherever home is
// (now Enumclaw), instead of a hard-coded Seattle-relative pixel.
const SASQUATCH_SPAWN_TILES_NORTH = 26;

// Oregon spirit-swarm seed: a pack in the Willamette Valley just south of
// Portland (city tile 376,409). World px of tile (382,425). Fightable only with
// Spirit Vision on — see the Oregon spirit entity in src/spirit/spiritData.ts.
const OREGON_SWARM_SPAWN = { x: 12240, y: 13616 };

// >>> PLACEHOLDER TEXT — edit to change the descent-climax beat shown when the
// player corrupts the Heaven Portal (gold→purple). Walking into the corrupted
// portal now transports the player to Heaven (see enterHeavenPortal).
const CORRUPT_PORTAL_LINE = 'The gate is defiled. The way to Heaven opens…';
// >>> PLACEHOLDER TEXT — shown after defeating Archangel Michael (the God beat is a
// LATER build; this is just the climactic win + a hook). Edit here.
const MICHAEL_VICTORY_LINE = 'Archangel Michael is vanquished!';
const GOD_JUDGMENT_HOOK = 'The heavens themselves answer your defiance… (to be continued)';

// >>> PLACEHOLDER TEXT — God's judgment beat. God is NEVER shown; only this voice
// speaks. Edit these arrays/strings to rewrite the scene. The three line groups
// play in order (God speaks → power-strip → banishment), each tap-advanced like
// normal dialogue.
const GOD_JUDGMENT_LINES = [
  'A Voice from the Clouds: So — the thief climbs even to My throne.',
  'A Voice from the Clouds: You wear stolen light and name it your own.',
  'A Voice from the Clouds: For your defiance, child of dust, I pass judgment.',
];
const POWER_STRIP_LINES = [
  'A Voice from the Clouds: The light you stole was never yours to keep.',
  'Your stolen light is ripped from you…',
];
const BANISHMENT_LINES = [
  'A Voice from the Clouds: Fall, then — out of My sight, into the dark below.',
  'The ground tears open beneath you. A way down has been made.',
];

// >>> PLACEHOLDER TEXT — THE REDEMPTION ENDING. Spoken by the friendly radiant
// angel after Satan is defeated (the first non-hostile angel). Edit these lines to
// rewrite the ending speech; each entry is one tap-advanced dialogue line.
const REDEMPTION_LINES = [
  'A radiant figure descends — an angel robed in pure light, gentle and unafraid.',
  'The Angel: You have redeemed yourself, hero. You proved, by trial, that you are not evil.',
  'The Angel: Now that you have braved the depths of Hell and conquered Satan, you may return to the world of Earth.',
  'The Angel: But be wary — the territories of Earth have been claimed by gods.',
  'The Angel: To conquer all of Earth, whether in the name of good or in the name of evil, is yours to choose.',
];
// >>> PLACEHOLDER TEXT — the closing beat shown after arriving back in Seattle.
const ENDING_CLOSING_LINE = 'Your trial is ended. The conquest of Earth begins…';
// How close the player must get to the redemption angel for its speech to begin
// (the ending is player-driven: walk up to the angel, like approaching an NPC).
const ENDING_ANGEL_APPROACH_RANGE = 90;

/**
 * The overworld scene: renders Washington, stamps the Seattle town onto it,
 * spawns the player in the town, and wires camera, controls, the town NPC +
 * dialogue, building-door portals, and the debug readout. Building interiors
 * run in the separate, reusable InteriorScene.
 */

/**
 * The shared shape of every COMBAT enemy (Sasquatch, Swarmer, AngelEnemy, Cherub,
 * Demon, FlamingSword guardian, Townsfolk, Boss). Lets skill primitives (AoE,
 * stun, knockback) operate generically across all enemy types without a base class.
 */
interface CombatEnemy {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  readonly health: Health; // for HP-threshold effects (Execute) + aura targeting
  get x(): number;
  get y(): number;
  get isAlive(): boolean;
  takeHit(amount: number): number;
  halt(): void;
}

/** Composed primitives that count as an ATTACK (they end player stealth). The
 *  self-only primitives (heal/shield/ward/friendzone/stealth) don't; dualbolt
 *  decides inside its branch (only its enemy-hit path is an attack). */
const OFFENSIVE_PRIMITIVES = new Set<string>(['strike', 'bolt', 'cone', 'line', 'hazard', 'drain', 'plague', 'chain']);

/** A TRAP DEVICE'S PAYLOAD, declared as DATA — each half composes a shipped
 *  effect (AoE hit, root, confusion, ground zone), so new trap flavors are new
 *  payload literals, never new code. Damage numbers are skill-scale (scaled by
 *  skillDamage at trigger time, × the device's damageMult). */
export interface TrapPayload {
  /** Burst AoE damage at the device on trigger. */
  burstDamage?: number;
  /** Burst/effect radius — defaults to the trigger radius. */
  burstRadius?: number;
  /** Root whoever sprang it (the nearest enemy) in place. */
  rootMs?: number;
  /** A blinding/confusing burst — the sprung enemy turns on its own. */
  confuse?: { chance: number; durationMs: number; chipDamage?: number; chipMs?: number };
  /** A lingering ground zone at the device (poison cloud / frost field / …) —
   *  the shipped spell-hazard machinery (damage and/or slow and/or weaken). */
  zone?: { radius: number; tickDamage: number; tickMs: number; durationMs: number; slowFactor?: number; weaken?: number; fill?: number; stroke?: number };
}

/** One trap placement, as data (every tunable an author touches). */
export interface TrapConfig {
  /** The device is inert while arming (placing under an enemy's feet is never free). */
  armDelayMs: number;
  /** Untriggered devices expire after this long. */
  lifetimeMs: number;
  /** An enemy inside this radius springs the armed device. */
  triggerRadius: number;
  payload: TrapPayload;
  tint?: number;
  /** Payload damage multiplier (Trap Mastery folds in here; default 1). */
  damageMult?: number;
  /** Default true — capped placements recycle the oldest at trapCap. Minefield
   *  passes false (an ultimate seeds past the cap by design). */
  countsTowardCap?: boolean;
}

export class MainScene extends Phaser.Scene {
  private map!: GameMap;
  private player!: Player;
  private controls!: Controls;
  private readout!: DebugReadout;
  private perfReadout?: PerfReadout; // DEV_MODE-only FPS / frame-time + entity/pool counts
  private town!: TownFeatures;
  private npc!: Npc;
  // Act I (Enumclaw opening) quest-givers + the Olympia water-pump recipient (Della). Givers
  // plug into the same data-driven questGivers pipeline as the corruption NPC.
  private act1Givers: Npc[] = [];
  private act2Givers: Npc[] = [];
  private olympiaNpc!: Npc; // DELLA — the Olympia woman who receives Marta's water pump (Q1); reusable for the Act IV callback
  private clericNpc!: Npc; // Act IV 4.4 — the Roseburg cleric who purifies the salt (a deliver/recipient NPC)
  // Investigation arc (Quests 8–12) NPCs: Yakima givers (Wend/Halvard), the Seattle
  // Druids (Rowan giver + Alder the vessel-examiner), Bellingham's Greta, Longview's
  // Mire. `deliverNpcs` are recipient NPCs that COMPLETE an objective when talked to
  // while its trigger is active (Della's water pump, Alder's exam, Mire's verdict).
  private invGivers: Npc[] = [];
  private deliverNpcs: { npc: Npc; trigger: ObjectiveTrigger; lines: string[]; idle: string }[] = [];
  // Seattle — the Druid tree-house city (Quests 10–11). Its forest/tree-house tiles
  // are stamped from a TownDef; Rowan + Alder stand by its plaza.
  private seattle!: TownFeatures;
  private seattleIntroShown = false;
  private alderNpc!: Npc; // Seattle Druid — the 'seattle' marker target (Q11 obj2)
  private mireNpc!: Npc; // Longview exile — the 'longview' marker target (Q12)
  // Portland (Oregon) — a second town reusing the same systems, flavor only.
  private portland!: TownFeatures;
  private portlandNpc!: Npc;
  private dialogue!: DialogueBox;
  private talkButton!: TouchButton;
  private zoomControls!: ZoomControls;
  private uiCamera!: Phaser.Cameras.Scene2D.Camera;
  private spirit!: SpiritVision;
  private choice!: ChoicePrompt;
  private angel!: Angel;

  // Combat.
  private sasquatch!: Sasquatch;
  private playerHealth!: Health;
  private playerBar!: HealthBar;
  private playerHpText!: Phaser.GameObjects.Text;
  private banner!: Phaser.GameObjects.Text;
  private worldFx!: Phaser.GameObjects.Layer;
  // Pooled transient FX (perf: damage numbers + impact circles were the measured
  // under-load churn — see src/combat/FxPools.ts). Reused, not re-allocated.
  private floatingText!: FloatingTextPool;
  private circleFx!: CircleFxPool;
  /** Melee swing crescents (the strike primitive's generic FX). Public-readable
   *  so the runtime gate can watch spawnedTotal / the pool cap. */
  swingFx!: SwingFxPool;
  // Per-frame cache of the live combat-enemy list (perf): the concat+filter used to
  // allocate a fresh array on every AoE/DoT/contagion/aim/scan call — many per frame.
  private combatEnemyCache: CombatEnemy[] = [];
  private combatEnemyCacheTime = -1;
  private lastCombatTime = -1e9;
  private playerDead = false;
  /** Player-allied summons (Ice Golem, skeletons, the Dark Matter Monster) — transient, not serialized. */
  private summons!: AlliedSummonManager;
  /** What ATTACKER summons use to find + damage enemies (reuses the scene's targeting + AoE). */
  private summonCombat!: SummonCombatCtx;
  /**
   * CONTINUOUS AGGRO STATE — per-enemy cached target + next-re-eval time. Keyed by the enemy
   * object (auto-GC'd when the enemy is pruned, no manual cleanup). Every enemy that pursues
   * a target (incl. BOSS-SPAWNED ADDS) resolves its move target through {@link enemyAggroTarget},
   * which re-picks per the 3-tier hierarchy every AGGRO_REEVAL_INTERVAL_MS with stickiness.
   */
  private aggroState = new WeakMap<object, { targetSummon: AlliedSummon | null; nextEval: number }>();

  // The Power Swap: demonic (default) → holy (at God's judgment). Centralized +
  // serializable; drives the golden ability reflavor + the Holy Bolt's gating.
  private readonly power = new PlayerPower();
  private holyBoltButton!: HolyBoltButton;
  private holyBoltCooldownUntil = 0;
  private holyAura?: Phaser.GameObjects.Arc; // subtle golden aura while holy

  // --- SKILL TREE (framework): points economy + per-class unlocks (serializable),
  //     plus the runtime layer that applies effects (passives + timed buffs/forms).
  private readonly skills = new SkillState();
  private skillBar!: LoadoutBar;
  /** True while the New-Game / post-reset forced first-skill picker must run (game frozen
   *  until the player chooses a starting damaging active — there is no base kit). */
  private pendingFirstSkill = false;
  /** Cached melee-damage multiplier (passives + active buffs/forms), recomputed on change. */
  private skillDamageMult = 1;
  /** Cooldown end-times for activatable skills, keyed by skill id. */
  private skillCooldownUntil: Record<string, number> = {};
  /** Effective cooldown DURATION used at activation (attack-speed shortens it),
   *  keyed by skill id — drives the on-screen button shade ratio. */
  private skillCooldownDur: Record<string, number> = {};
  /** Damage the player has dealt since the last lifesteal flush (Bloodlust). */
  private dmgDealtAccum = 0;
  /** Live timed effects (buffs / transformations): each contributes stats until endsAt. */
  private skillTimed: { id: string; endsAt: number; stats: SkillStatMods; tint?: number; auraDamage?: number; auraRadius?: number; auraNextAt?: number }[] = [];
  /** Stun registry: enemy → time the stun ends. Stunned bodies are frozen (moves=false). */
  private stunnedEnemies = new Map<CombatEnemy, number>();
  /** Slow registry: enemy → { until, factor } (velocity scaled each frame). */
  private slowedEnemies = new Map<CombatEnemy, { until: number; factor: number }>();
  /** Counter Attack (Control passive) internal-cooldown end time. */
  private counterReadyAt = 0;
  /** Base incoming-damage multiplier from skill DR (recompute); weaken stacks on top per-frame. */
  private baseIncomingMult = 1;
  /** Timed Intimidate WEAKEN: while active, the player takes (1 - factor) damage. */
  private intimidateWeakenUntil = 0;
  private intimidateWeakenFactor = 0;
  /** True while a Charge rush is in progress (reuses the dash movement, like Plow). */
  private chargeActive = false;
  private chargeHits = new Set<CombatEnemy>();
  /** Charge tuning for the current rush (Blacksmith Charge by default; Necro Wrecking Ball
   *  overrides it). {distance, damage, knockdownMs}. */
  private chargeCfg: { distance: number; damage: number; knockdownMs: number } = CONTROL_TUNING.charge;
  // --- Necromancer (Marrow) primitives ---
  /** TAUNT: while now < tauntUntil, every enemy targets the PLAYER (overrides summon aggro). */
  private tauntUntil = 0;
  /** OSTEO AURA: player-damage multiplier vs enemies whose defense the aura has lowered (1 = off). */
  private osteoDamageMult = 1;
  // --- Necromancer (Dark Matter) transient state ---
  /** TAINTED DARK MATTER defence-down: a timed damage-amplification window (reuses the Osteo
   *  damage-mult mechanic). While now < darkVulnUntil, the player's damage ×= darkVulnMult. */
  private darkVulnUntil = 0;
  private darkVulnMult = 1;
  /** BLIGHT passive aura: next damage-tick time (the aura slows every frame, ticks on cadence). */
  private blightNextTickAt = 0;

  // Progression / leveling. Level-derived maxHP + damage feed the combat above.
  private progression!: PlayerProgression;
  private xpBar!: HealthBar;
  private levelBadge!: Phaser.GameObjects.Text;
  private levelBanner!: Phaser.GameObjects.Text;

  // Combat Depth v1: energy resource + dash ability.
  private energy!: Health;
  private energyBar!: HealthBar;
  private lastEnergySpendTime = -1e9;
  /** True while a Tank "Plow" charge is in progress (reuses the dash movement). */
  private plowActive = false;
  /** Enemies already damaged by the current Plow (so each is hit once per charge). */
  private plowHits = new Set<CombatEnemy>();
  /** True while a Wizard "Gust" wind-dash is in progress (reuses the dash movement). */
  private gustActive = false;
  /** Enemies already damaged by the current Gust (so each is hit once per dash). */
  private gustHits = new Set<CombatEnemy>();
  /** Active Wizard "Lava" ground patches: reusable persistent-hazard pattern that damages
   *  ENEMIES standing in them over time (mirrors the boss HazardField, enemy-facing). */
  private spellHazards: { x: number; y: number; radius: number; tickDamage: number; tickMs: number; nextTickAt: number; expireAt: number; slowFactor: number; weaken: number; fx: Phaser.GameObjects.Arc }[] = [];
  /** Active per-target DoTs (Toxic Bolt / Plague). Plague carries a shared spread budget so
   *  the contagion jumps to nearby enemies up to a cap. Reusable damage-over-time primitive. */
  private dots: { target: CombatEnemy; dmgPerTick: number; tickMs: number; nextTickAt: number; expireAt: number; color: number; spread?: { radius: number; budget: { remaining: number } }; stackKey?: string }[] = [];
  // --- Druid framework primitives (composable; class-agnostic) ---
  /** FRIENDLY ZONES: the ally-facing twin of spellHazards — ground areas that HEAL the
   *  player + allied summons inside them each tick. `follow` zones track the caster.
   *  Public-readable so the runtime gate can observe placement/expiry. */
  friendlyZones: { x: number; y: number; radius: number; healPerTick: number; tickMs: number; nextTickAt: number; expireAt: number; follow: boolean; fx: Phaser.GameObjects.Arc }[] = [];
  /** PLAYER STEALTH: while now < playerStealthUntil, the player is OUT of all enemy
   *  targeting (enemyAggroTarget holds enemies in place unless a summon draws them).
   *  0 = off. Entering wipes current aggro; ANY attack breaks it early. */
  playerStealthUntil = 0;
  // --- Mage framework primitives (composable/bespoke; class-agnostic) ---
  /** ENTANGLED CHAINS: while now < until, a PORTION (sharePct) of damage applied to
   *  any bound member is SHARED to all members, and control (stun/slow) applied to
   *  one is applied to all. One active binding at a time (re-cast rebinds). Public-
   *  readable for the runtime gate. */
  entangled: { members: CombatEnemy[]; sharePct: number; until: number; prevHooks: (((amt: number) => void) | undefined)[] } | null = null;
  /** Re-entrancy guard: SHARED damage never cascades back through the hook. */
  private entangleSharing = false;
  /** CRYSTALLIZE stacks per enemy (applied by strike riders; consumed by Shatter).
   *  Public-readable for the runtime gate. Pruned on shatter/death/reset. */
  crystallize = new Map<CombatEnemy, number>();
  // --- Bard framework primitives (composable/bespoke; class-agnostic) ---
  /** CONFUSION: while now < until, this enemy's aggro is redirected onto its nearest
   *  FELLOW enemy (it moves to and chips at it). Wears off cleanly (pruned per frame).
   *  Public-readable for the runtime gate. */
  confused = new Map<CombatEnemy, { target: CombatEnemy; until: number; chipDamage: number; chipMs: number; nextChipAt: number }>();
  /** ECHO (Sonic Echoes): while echoPct > 0, player attack resolutions repeat once
   *  after echoDelayMs at echoPct of the damage. The echo itself never re-echoes. */
  echoPct = 0;
  echoDelayMs = 380;
  private echoing = false;
  /** COMBO ULTIMATE (War Song): while set, auto-chained melee strikes fire on a
   *  cadence with no input (the timed buff half runs through skillTimed). */
  comboUltimate: { until: number; nextAt: number; intervalMs: number; range: number; damage: number; jumps: number; jumpRange: number; falloff: number; tint: number } | null = null;
  /** HARMONIC AMPLIFICATION (Bard): while charges remain, each strike detonates an
   *  extra splash around its hit point, consuming one charge. Public for the gate. */
  harmonicCharges = 0;
  // --- Witch Doctor framework primitives (composable/bespoke; class-agnostic) ---
  /** VOODOO DOLL bind: while set, melee strikes that land on the doll MIRROR
   *  mirrorPct of their damage to the bound target at any range. One bind at a
   *  time; ends on doll death / target death / expiry; re-cast re-binds.
   *  Public-readable for the runtime gate. */
  voodoo: { target: CombatEnemy; doll: AlliedSummon; mirrorPct: number; until: number } | null = null;
  /** DOLL UPGRADE — REFLECT (armed only while its skill is owned): an enemy whose
   *  contact hit lands on the doll takes this much back. 0 = disarmed. */
  voodooReflectDamage = 0;
  /** DOLL UPGRADE — STITCH SPLASH: mirrored damage also hits enemies within
   *  radius of the bound target at pct of the mirror. Null = disarmed. */
  voodooStitch: { radius: number; pct: number } | null = null;
  /** DOLL UPGRADE — SPIRIT ASSAULT: periodic defense-bypassing ticks to the bound
   *  target while bound. Null = disarmed. */
  voodooAssault: { damage: number; tickMs: number; nextAt: number } | null = null;
  /** ALLY-BOND (friendly Entangled Chains): while active, sharePct of damage the
   *  player would take is redirected to live summons (split evenly) instead. */
  allyBond: { sharePct: number; until: number } | null = null;
  /** SPIRIT SPLIT: while set, the doll AUTO-MIRRORS a pulse on a cadence with no
   *  player strike (the decoy half is a normal summon walking alongside). */
  spiritSplit: { until: number; nextAt: number; intervalMs: number; pulseDamage: number } | null = null;
  // --- Samurai framework primitives (composable/bespoke; class-agnostic) ---
  /** PARRY window: while now < until, the next incoming MELEE hit is fully
   *  NEGATED and the attacker takes the riposte (one hit per window; an unused
   *  window lapses silently). Ranged hits always pass through. Public for the gate. */
  parry: { until: number; riposteDamage: number; deflectProjectiles: boolean; projectileRiposteMult: number } | null = null;
  /** COUNTERSTRIKE upgrade (armed only while owned): extra riposte damage +
   *  a Resolve/energy refund on each successful parry. */
  parryRiposteBonus = 0;
  parryRefundEnergy = 0;
  /** PERFECT FORM: while now < until, EVERY incoming melee hit is auto-parried
   *  (riposting for perfectFormRiposte) while the player keeps acting freely. */
  perfectFormUntil = 0;
  perfectFormRiposte = 0;
  /** Lifetime successful parries (runtime-gate observability). */
  parryCount = 0;
  /** IAIJUTSU (count-1 consume-buff): the NEXT strike inside the window deals
   *  damage × mult and briefly stuns what it hits, then the buff consumes. */
  iaijutsu: { until: number; mult: number; stunMs: number } | null = null;
  /** RAZOR'S EDGE (keyed passive, armed while owned): strikes apply this bleed. */
  strikeBleed: { dmgPerTick: number; tickMs: number; durationMs: number } | null = null;
  // --- Monk framework primitives (composable/bespoke; class-agnostic) ---
  /** MOBILE DAMAGE PULSE ZONE (Prayer Wheel): while set, a ring FOLLOWS the
   *  caster and pulses damage around them on a cadence. Public for the gate. */
  pulseRing: { until: number; nextAt: number; intervalMs: number; radius: number; damage: number; tint: number } | null = null;
  /** ALLY RULE: set by a bespoke action that WHIFFED for lack of a valid target
   *  ("no ally") — activateSkill refunds the cooldown + energy so a graceful
   *  miss never wastes anything. */
  actionWhiffed = false;
  /** EMPOWERED STRIKES (count-N consume-buff): the next `remaining` strikes deal
   *  damage × mult, each hit spending one charge (the Iaijutsu shape, N deep). */
  empoweredStrikes: { remaining: number; mult: number } | null = null;
  /** How many sprite drop-in overrides applied at create() (gate-observable). */
  spriteOverridesApplied = 0;
  // --- Assassin framework primitives (composable/bespoke; class-agnostic) ---
  /** ARMED DEVICES (the trap system): place → arm after a delay → the first enemy
   *  inside the radius triggers the PAYLOAD → the device is consumed. Untriggered
   *  devices expire. Plain world objects (never combat targets — the untargetable
   *  precedent). Public-readable so the runtime gate can observe the lifecycle. */
  traps: { x: number; y: number; armedAt: number; expireAt: number; triggerRadius: number; payload: TrapPayload; damageMult: number; capped: boolean; tint: number; fx: Phaser.GameObjects.Arc }[] = [];
  /** Concurrent armed-device cap for CAPPED placements (the oldest is recycled at
   *  the cap). Trap Mastery's +1 lands here via its recompute; Minefield devices
   *  are placed uncapped. Public for the gate + the mastery hook. */
  trapCap = 3;
  /** True while the current composed cast was made FROM stealth — captured BEFORE
   *  the attack breaks it, so strike steps with a `stealthBonus` rider still read it. */
  private castFromStealth = false;
  /** SHADOW DANCE: while now < until, attacking does NOT break stealth (and the
   *  stealth-bonus rider applies to every strike that carries one). */
  shadowDanceUntil = 0;
  /** VANISH: a breath of UNTARGETABILITY after the instant re-stealth — melee
   *  (parryGate) and bolts (onProjectileHitPlayer) pass through until this. */
  vanishGraceUntil = 0;
  // --- Priest framework primitives (composable/bespoke; class-agnostic) ---
  /** TARGETED ALLY-SHIELDS: absorb pools granted to allied SUMMONS with an
   *  expiry (the player's own pool rides playerHealth.shield/shieldUntil — the
   *  Mana Shield machinery). Expired pools are zeroed, never banked. */
  private allyShields: { health: Health; until: number }[] = [];
  /** HARM IMMUNITY (ally-shield rider): while now < this, hostile on-hit
   *  afflictions (the dark-caster slow/weaken/DoT stacks) never land. */
  harmImmuneUntil = 0;
  /** DUAL CHANNEL (Beacon of Light): a beam from the caster along the facing
   *  that HEALS friendlies inside it (caster included) and DAMAGES enemies it
   *  crosses, both ticking until it ends. Public-readable for the gate. */
  dualChannel: { until: number; nextAt: number; tickMs: number; healPerTick: number; dmgPerTick: number; length: number; width: number; fx: Phaser.GameObjects.Graphics } | null = null;
  // --- Savage framework primitives (composable/bespoke; class-agnostic) ---
  /** FRENZY (momentum stacks): armed by a keyed passive. Every frame the player
   *  DEALS damage adds one stack (capped at maxStacks); each stack multiplies
   *  ALL damage by (1 + perStackMult); stacks fall to zero after decayMs
   *  without blood. Public-readable so the runtime gate can observe it. */
  frenzy: { perStackMult: number; maxStacks: number; decayMs: number; stacks: number; until: number } | null = null;
  /** BLOOD SCENT (Savage keyed passive): while > 0, BLEEDING targets take
   *  ×(1+this) from the player's AoE funnel. 0 for every other class. */
  bloodScentBonus = 0;
  /**
   * CHANNELED-BEAM state (the channel primitive). Transient: a single active channel locks
   * one enemy, ticks damage, optionally trickles energy, and is cancelled by movement / any
   * other skill / target death / duration. Not serialized (cleared on reset/load/death).
   */
  private channel: { skillId: string; target: CombatEnemy; endsAt: number; nextTickAt: number; tickMs: number; dmgPerTick: number; resourcePerSec: number; cooldownMs: number; interruptFraction: number; resourceAccum: number; beam: Phaser.GameObjects.Graphics } | null = null;
  /** Timed player-incoming WEAKEN from Ice/Poison effects (Frostbite / Freezing Rain /
   *  Pestilence) — folded into updateControlEffects, same model as the Blacksmith weaken. */
  private poisonWeakenUntil = 0;
  private poisonWeakenFactor = 0;
  /** Ethereal/Survival: Mana Shield expiry, and the Ankh cheat-death armed window. */
  private shieldUntil = 0;
  private ankhArmedUntil = 0;
  /** PIECE 2 — light aim-assist (dev-toggleable; cone adjustable at runtime for tuning). */
  private aimAssistEnabled = true;
  private aimAssistCone = AIM_ASSIST_CONE_ANGLE;
  /** PIECE 4 — drag-aim: the current aim direction (while a skill button is being dragged)
   *  and the world-space indicator arrow drawn from the player toward it. */
  private aimingDir: { dx: number; dy: number } | null = null;
  private aimIndicator?: Phaser.GameObjects.Graphics;
  private dashEndsAt = 0;
  private dashDir = { x: 0, y: 1 };
  private dashHits = new Set<object>();

  // Combat Depth v1: the Spirit-Vision-gated swarmer pack.
  private swarmers: SpiritSwarmer[] = [];
  private swarmersRevealed = false;

  // Ranged combat: the angel enemies (normal-layer) + the reusable projectiles.
  private angels: AngelEnemy[] = [];
  private projectiles!: ProjectileSystem;
  /** Persistent ground-hazard zones (Greed's zone-control pattern; reusable). */
  private hazards!: HazardField;

  // Collectibles: the reusable world-pickup system + the Holy Power count + HUD.
  private pickups!: PickupSystem;
  private holyPower = new HolyPower();
  private holyPowerText!: Phaser.GameObjects.Text;

  // Portal Defense: the destructible objective, the townsfolk, and the wave brain.
  private portal!: DarkPortal;
  private townsfolk: Townsfolk[] = [];
  private portalDefense!: PortalDefense;

  // The Descent climax: the Heaven Portal + its two flaming-sword guardians, a
  // triggerable unit (a future quest can drive startGuardianFight/reset). The
  // phase is the centralized, serializable encounter state.
  private heavenPortal!: HeavenPortal;
  private guardians: FlamingSword[] = [];
  private guardianPhase: 'dormant' | 'fighting' | 'defeated' | 'corrupting' | 'corrupted' = 'dormant';
  private corruptButton!: TouchButton;
  /** The corrupted Holy-Outpost portal crosses by BUTTON (no walk-in), both directions. */
  private enterHeavenButton!: TouchButton;
  private returnEarthButton!: TouchButton;
  /** Act II Q6: the proximity "Burn the Grove" action button (reuses the corrupt-button pattern). */
  private burnButton!: TouchButton;

  // Multi-world (Earth <-> Heaven). The active world is centralized, serializable
  // state; each world's map lives in its own coordinate region (one rendered at a
  // time). The same player carries across. See setupHeaven + travelToWorld.
  private activeWorld: WorldId = WORLD_EARTH;
  private worlds: Record<WorldId, WorldRuntime> = {};
  private worldPos: Record<WorldId, { x: number; y: number }> = {}; // remembered per-world player position
  // Heaven's Defenders: the hybrid Cherub / Cherubim enemies (placed in Heaven +
  // dev-spawnable). They live in whichever world they were spawned in.
  private cherubs: Cherub[] = [];

  // BOSS FRAMEWORK: every boss is a generic data-driven Boss controller (see
  // src/boss). `michael` is the ported Archangel Michael (a Boss); `bosses` holds
  // all live framework bosses; `bossAdds` tracks each boss's summoned reinforcements
  // (keyed by boss id) for the cap + clearing. One shared boss HP bar (UI camera).
  private michael!: Boss;
  private bosses: Boss[] = [];
  private bossAdds = new Map<string, (Cherub | Demon)[]>();
  // The 7 Deadly Sins (Batch 1): the central serializable order-state + the live
  // Sin boss instances (index 0..2 = Wrath/Sloth/Gluttony), lazily spawned in Hell
  // so a LOCKED Sin simply doesn't exist yet (can't be woken/hit). A reused world
  // beacon marks the currently-available Sin.
  private readonly sins = new SinGauntlet();
  private sinBosses: (Boss | undefined)[] = SIN_DEFS.map(() => undefined);
  private sinMarker!: ObjectiveMarker;
  // The Unholy Trinity (Part 1): a staged finale gauntlet at Satan's Lair (enterable
  // once all 7 Sins are beaten). Central serializable stage + the live Dragon/Beast.
  private readonly trinity = new TrinitySequence();
  private dragonBoss?: Boss;
  private beastBoss?: Boss;
  private satanBoss?: Boss;
  /** Bumped on every reset so a pending breather callback from an old run is voided. */
  private trinityRun = 0;
  // The redemption ENDING (on Satan's defeat): the friendly angel, the Earth portal
  // home, and the transient hellfire-eruption visuals.
  private earthPortal?: EarthPortal;
  /** Time before the ending Earth portal accepts a walk-through (a grace so it can't
   *  trigger on the spawn frame — the player must actually walk into it). */
  private earthPortalArmedAt = 0;
  private endingFx: Phaser.GameObjects.GameObject[] = [];
  // The redemption ending is PLAYER-DRIVEN: after Satan falls the angel appears, but
  // the player must WALK UP to it to begin the speech. These track that approach.
  private endingAngel?: Phaser.GameObjects.GameObject;
  private endingAngelPos?: { x: number; y: number };
  private endingSpeechStarted = false;
  private endingApproachArmedAt = 0; // small grace so the speech can't pop on the spawn frame
  private hellfireFx: Phaser.GameObjects.GameObject[] = [];
  private bossBar!: HealthBar;
  private bossBarBg!: Phaser.GameObjects.Rectangle;
  private bossNameText!: Phaser.GameObjects.Text;
  /** The scene-side effect hooks every Boss uses — reusing existing systems. */
  private readonly bossHooks: BossHooks = {
    fireBolts: (origin, dirs, damage, speed, range) => {
      for (const d of dirs) {
        this.projectiles.spawn({ x: origin.x, y: origin.y, dirX: d.x, dirY: d.y, speed, damage, maxRange: range, faction: 'enemy', color: 0xfff1b8, radius: 9 });
      }
    },
    meleeHit: (damage) => this.onCherubMelee(damage), // reuse: damage the player
    slam: (x, y, radius, damage) => this.bossSlam(x, y, radius, damage),
    telegraph: (x, y, radius, durationMs) => this.bossTelegraph(x, y, radius, durationMs),
    summon: (boss, enemy, count, cap) => this.summonForBoss(boss.id, boss.x, boss.y, boss.name, enemy, count, cap),
    lineOfSight: (ax, ay, bx, by) => this.hasLineOfSight(ax, ay, bx, by),
    shield: (boss, active) => this.setBossShield(boss.id, boss.x, boss.y, active),
    blocked: (x, y) => this.spawnBlockedFx(x, y),
    hazard: (boss, x, y, radius, damage, lifetimeMs, telegraphMs, cap) => this.hazards.spawn(boss.id, x, y, radius, damage, lifetimeMs, telegraphMs, cap),
    hellfireWarn: (cx, cy, arenaR, safe, safeR, durationMs) => this.hellfireWarn(cx, cy, arenaR, safe, safeR, durationMs),
    hellfireBurst: (cx, cy, arenaR, safe, safeR, damage) => this.hellfireBurst(cx, cy, arenaR, safe, safeR, damage),
    beam: (boss, tx, ty, damage, durationMs, tickMs, range) => this.bossBeamStart(boss, tx, ty, damage, durationMs, tickMs, range),
  };
  /** Live SHIELD bubbles, keyed by boss id (Pride's invuln-window visual). */
  private readonly bossShields = new Map<string, Phaser.GameObjects.Arc>();

  // God's Judgment beat: the throne set piece, the Michael-gated scripted
  // sequence, and the Hell portal it spawns. State is centralized + serializable.
  private michaelDefeated = false; // the gate: judgment is locked until this is true
  private judgmentFired = false; // the sequence has played (plays once)
  private judgmentActive = false; // mid-sequence guard
  private thronePos = { x: 0, y: 0 };
  private hellPortal?: HellPortal;
  /** Becomes true once the player has stepped CLEAR of the freshly-opened Hell
   *  portal at the throne, so entering it is always a deliberate walk-in (never an
   *  instant pull-in when it spawns near where the player approached the throne). */
  private hellPortalArmed = false;

  // Hell: the third world + its return gate + seeded demons. Built via the same
  // multi-world system as Heaven (a GameMap at a further coordinate offset).
  private hellMap!: GameMap;
  private hellReturnPortal!: HeavenPortal; // reused (corrupted gate) — the way back up
  private hellArrivalPos = { x: 0, y: 0 };
  private hellReturnPortalPos = { x: 0, y: 0 };
  private heavenReturnFromHellPos = { x: 0, y: 0 }; // where Hell→Heaven drops the player
  private demons: Demon[] = [];

  // Egypt: the fourth world — a TERRESTRIAL map (runs the Earth-style per-frame
  // path), built via the same multi-world system at a further coordinate offset.
  private egyptMap!: GameMap;
  private egyptArrivalPos = { x: 0, y: 0 }; // just outside the Faiyum village gate

  // NESTED CITIES: each CityDef becomes a small registered world; the runtime
  // resolves its gate/arrival world positions once at setup. See world/cities.ts.
  private cityRuntimes: Record<
    WorldId,
    {
      def: CityDef;
      map: GameMap;
      entrancePos: { x: number; y: number }; // the gate ON the parent map
      outsideArrival: { x: number; y: number }; // where "Leave" drops the player
      insideArrival: { x: number; y: number }; // where "Enter" drops the player
      gatePos: { x: number; y: number }; // the exit gate INSIDE the city
    }
  > = {};
  private cityGateButton!: TouchButton; // shared "Enter <City>" / "Leave <City>" contextual button
  private cityGateAction: (() => void) | null = null;
  /** DEV: overrides the class announced to the quest chain (null = real class). */
  private devClassOverride: string | null = null;
  /** The drop-in art seams, exposed for the runtime gate (mechanism checks). */
  readonly artOverrides = { drawIntoAtlasCell, applySpriteOverride };
  /** Every class's skill trees, exposed for the runtime gate's skill sweep. */
  readonly classSkillsAll = CLASS_SKILLS;

  // REGION WORLDS — the sparse chunked worlds (Europe today, Africa next; see
  // SparseWorldMap). Chunks are small standalone GameMaps; the void between
  // them is walkable background. All the region machinery below (live registry,
  // spawn activation, gates, champions, escorts) is WORLD-KEYED and shared.
  private globeMap?: SparseWorldMap;
  /** Which registered worlds run the region pipeline (spawn zones, gates…). */
  private regionWorldIds = new Set<WorldId>();
  /** GROUND LAYER per sparse region world (real continents under the chunks).
   *  Dense hand-built worlds (Earth/Heaven/Hell/Egypt/cities) never get one. */
  private groundLayers = new Map<WorldId, GroundLayer>();
  // CAIRO ACT I LIVE BINDING — additive ambient content in the EGYPT world so
  // the Wizard's home chain (cai-01..04) plays by hand. Nothing existing moves.
  private cairoLive: { family: string; entity: Townsfolk | Demon; post: { x: number; y: number }; bossBeatId?: string; counted: boolean }[] = [];
  private cairoMentorPos = { x: 0, y: 0 };
  private cairoDiscoveryPos = { x: 0, y: 0 };
  private cairoMentorButton!: TouchButton;
  private cairoReplenishAt = 0;
  // GENERIC BEAT COMPLETION — one implementation per archetype pattern, bound
  // to EVERY generated zone (Cairo's proven mentor/marker/elite patterns,
  // generalized). Mentors are persistent NPCs in their home-city chunks;
  // story markers / fetch pickups / elite bosses exist only while their beat
  // is the ACTIVE quest and clean up on any change (retry-friendly).
  private regionMentors: { beatId: string; zoneId: string; pos: { x: number; y: number } }[] = [];
  private mentorButton!: TouchButton;
  private mentorNear?: { beatId: string; zoneId: string; pos: { x: number; y: number } };
  private beatMarker?: { beatId: string; pos: { x: number; y: number }; objs: Phaser.GameObjects.GameObject[] };
  private beatPickups?: { beatId: string; taken: number; items: { obj: Phaser.GameObjects.Arc; taken: boolean; x: number; y: number }[] };
  private beatElite?: { beatId: string; zoneId: string; kind: 'demon' | 'angel'; entity: Demon | AngelEnemy; label: Phaser.GameObjects.Text };
  /** Per-chunk terrain colliders, each bound to its OWN region world. */
  private regionColliders: { c: Phaser.Physics.Arcade.Collider; worldId: WorldId }[] = [];
  /** Proximity travel gates. destWorld makes a gate CROSS-WORLD (Egypt↔Africa). */
  private regionGates: { x: number; y: number; label: string; dest: { x: number; y: number }; destWorld: WorldId }[] = [];
  /** Per-zone arrival points (the spot south of each chunk's settlement). */
  private regionZoneArrivals: Record<string, { x: number; y: number }> = {};
  // PER-CHUNK SPAWN ACTIVATION (mapped families only): enemies materialize when
  // the player nears a zone's chunk and despawn (with hysteresis) on exit, so 25
  // zones of markers never become 25 zones of live entities. See updateRegionSpawns.
  private regionSpawnZones: {
    zoneId: string;
    center: { x: number; y: number };
    radiusPx: number; // half the chunk size (activation margins add to this)
    points: { family: string; x: number; y: number }[];
    active: boolean;
  }[] = [];
  private regionLive: {
    zoneId: string;
    family: string;
    kind: 'townsfolk' | 'demon' | 'angel';
    entity: { readonly isAlive: boolean; destroy(): void; takeHit(amount: number): number };
    counted: boolean;
  }[] = [];
  /** Kill progress per ACTIVE europe beat id (clear + eu-10 harvest counters). */
  private regionKillCounts: Record<string, number> = {};
  // VEIL-AMBUSHERS: the hidden/reveal/burst/re-hide state machine. HIDDEN ambushers
  // are invisible, physics-disabled and NOT in this.townsfolk — so the aggro
  // hierarchy, taunts, pulls and every player hit path can't touch them pre-reveal.
  private regionAmbushers: {
    zoneId: string;
    t: Townsfolk;
    home: { x: number; y: number };
    state: 'hidden' | 'burst';
    burstEndsAt: number;
  }[] = [];
  /** Escort-proximity hook (ARMED by the escort runs in ambusher zones): while
   *  set, hidden ambushers ALSO reveal when the escort target nears their marker.
   *  Null between escorts — the hook idles dormant exactly as it shipped. */
  private ambusherEscortTarget: { x: number; y: number } | null = null;
  // EUROPE ESCORTS: ONE implementation serving every 'escort'-archetype beat.
  // A convoy NPC spawns near the player when the beat is active + its chunk is
  // active, walks a straight gray-box route east across the chunk, and is hit
  // by 1–2 ambush waves of the zone's own families. Arrival completes the beat;
  // convoy death resets the encounter for a clean retry (no permanent failure).
  private escort?: {
    beatId: string;
    zoneId: string;
    npcSprite: Phaser.Physics.Arcade.Sprite;
    npcHealth: Health;
    npcBar: HealthBar;
    start: { x: number; y: number };
    end: { x: number; y: number };
    wavesFired: number;
    /** Wave attackers steered at the moving convoy (townsfolk 'portal' pattern). */
    waveAttackers: Townsfolk[];
    /** Zone families include veil-ambushers → the escort-proximity hook is armed. */
    hasAmbushers: boolean;
  };
  /** Earliest time a fresh convoy may spawn after a death (the retry breather). */
  private escortRetryAt = 0;
  /** DEV overlay: big zone-name labels over Europe chunks, shown only at low zoom
   *  (the zoomed-out continent view is unreadable without them). DEV_MODE-only. */
  private regionZoneLabels: Phaser.GameObjects.Text[] = [];
  // REGION CHAMPIONS: one boss-engine instance per boss beat (champion-specs.ts).
  // At most ONE champion is live at a time — the active boss beat's, spawned at
  // its zone's boss anchor while that chunk is active, despawned/reset on leave/
  // death/beat change. Defeat completes the beat.
  private championBoss?: Boss;
  private championBeatId: string | null = null;
  private championZoneId: string | null = null;
  /** The live champion's summoned adds (zone-family enemies via spawnRegionEnemy),
   *  tracked so each summon wave respects the add cap. */
  private championAdds: { isAlive: boolean }[] = [];
  /** Per-zone champion spawn anchors (north of the settlement, mirroring arrival). */
  private regionBossAnchors: Record<string, { x: number; y: number }> = {};
  /** Live enemy-cast beams (the 'beam' boss pattern; drawn in the channel style). */
  private bossBeams: { g: Phaser.GameObjects.Graphics; boss: Boss; dirX: number; dirY: number; range: number; until: number; nextTickAt: number; tickMs: number; damage: number }[] = [];
  // DARK-CASTER on-hit debuffs on the PLAYER (reusing the existing slow/weaken
  // models + the stacking-DoT shape; resolved per-frame in updateControlEffects).
  private casterSlowUntil = 0;
  private casterWeakenUntil = 0;
  private casterDotStacks: number[] = []; // per-stack expiry times
  private casterDotNextTickAt = 0;
  /** quest id → its manifest zone + beat (built once, lazily). */
  private regionBeatIndex?: Map<string, { zone: ManifestZone; beat: QuestBeat }>;
  /** Where the NEXT world east goes (advanced by setupCities/setupEurope). */
  private nextWorldOriginX = 0;
  // DEV "Test City Arrow": a fake objective target exercising the hierarchical
  // gate-waypoint chaining (0 off, 1 the mill inside, 2 a spot outside).
  private devArrowState = 0;
  private devArrowTarget: { world: WorldId; x: number; y: number; label: string } | null = null;

  private heavenMap!: GameMap;
  private heavenReturnPortal!: HeavenPortal;
  private heavenArrivalPos = { x: 0, y: 0 };
  private heavenReturnPortalPos = { x: 0, y: 0 };
  private earthReturnPos = { x: 0, y: 0 }; // Earth Heaven-Portal arrival when coming back
  private transitioning = false;
  private worldCooldownUntil = 0;
  private pausedBodies: Phaser.Physics.Arcade.Body[] = [];
  private fadeOverlay!: Phaser.GameObjects.Rectangle;

  // Story / alignment state.
  private playerPath: PlayerPath = 'neutral';
  private angelEncounterFired = false;

  // Quest CHAIN: the central, serializable manager driving the whole registry,
  // its tracker UI, and its world marker. Quest-givers map an NPC to the quest
  // ids it can offer (+ idle flavor lines when it has nothing to give).
  private chain!: QuestChain;
  private tracker!: QuestTracker;
  private marker!: ObjectiveMarker;
  // A quest-giver maps an interactable (NPC or the spirit patron) to the quest ids
  // it can offer (+ idle lines + an optional corruption gate). `pos` locates it for
  // the pre-accept marker.
  private questGivers: {
    entity: Interactable;
    pos: () => { x: number; y: number };
    questIds: string[];
    idleLines: string[];
    requiresCorruption?: boolean;
  }[] = [];
  private oregonSpirit?: SpiritEntity; // the dark patron (the descent-arc quest-giver)
  // The single stored+displayed alignment title (its text() IS the stored value).
  private titleText!: Phaser.GameObjects.Text;

  // The arc quests (Act I opening / Act II / Investigation / Act IV) all reuse the
  // same per-objective world setup + completion watcher. arcEnemies are the live
  // spawns for the current objective; arcMode picks the completion test. (The old
  // placeholder DESCENT arc was RETIRED by the Act IV finale — 4.8–4.10 replace it.)
  private readonly ACT1_IDS = new Set(['honest-days-work', 'wolves-tree-line', 'shallows', 'the-pass']);
  private readonly ACT2_IDS = new Set(['whats-gotten-into-them', 'the-blight', 'the-thing-at-white-pass']);
  private readonly INV_IDS = new Set(['word-to-yakima', 'the-iron-road', 'the-northern-farms', 'what-the-dark-ones-carry', 'the-exile-of-longview']);
  // Act IV: the Necromancer's corrupted arc, given by Azazel (4.1 → 4.10).
  private readonly ACTIV_IDS = new Set([
    'act4-what-they-wont-give',
    'act4-watchers-on-the-road',
    'act4-the-trade-day',
    'act4-salt-and-sea',
    // Batch C — the Idaho leg (4.5–4.7).
    'act4-the-door-they-came-through',
    'act4-olympia',
    'act4-poison-the-well',
    'act4-the-heart-of-each-city',
    // The FINALE (4.8–4.9): Boise catapults + the outpost assault. (4.10 has no
    // world spawns — its talk-completion is handled in openQuestGiverDialogue.)
    ACT4_DRAW_ID,
    ACT4_DOOR_HOME_ID,
  ]);
  // En-route ambush groups (Q9/Q12): each spawns a demon pack on first approach.
  private arcAmbushes: { x: number; y: number; lines: string[]; spawned: boolean }[] = [];
  private arcEnemies: (Townsfolk | AngelEnemy | Demon)[] = [];
  // 'burn' is the generic PROXIMITY-ACTION mode: a captioned button appears near
  // arcReach and, on tap, fires the active objective's trigger. Used for Act II's
  // "Burn the Grove", Act IV 4.5b "Take the Pump", and 4.6 "Taint the Water".
  private arcMode: 'defeat' | 'plunder' | 'reach' | 'pickup' | 'burn' | 'gather' | 'none' = 'none';
  private arcActionLabel = 'Burn the Grove'; // caption for the proximity-action button
  private arcReach: { x: number; y: number } | null = null;
  /** Completion radius for the CURRENT 'reach' objective. Defaults to the tight
   *  REACH_OUTPOST_RANGE; 4.9's march uses a generous ring around the outpost so
   *  approaching from ANY direction arms the assault layers. */
  private arcReachRadius = REACH_OUTPOST_RANGE;
  private arcShipmentPos: { x: number; y: number } | null = null;
  private arcHolyBaseline = 0;
  private arcHolyRequired = 0;
  // Act IV 4.4: count-of-N salt-patch gather (arcMode 'gather'). The pickups fire
  // 'salt' collects into arcGatherCount; the objective completes at the required count.
  private arcGatherCount = 0;
  private arcGatherRequired = 0;
  // The active objective's "on arriving" scripted narration (Act II): the lines +
  // the target position + a one-shot guard so it plays once on first approach.
  private arcEncounterNarration: readonly string[] | null = null;
  private arcEncounterPos: { x: number; y: number } | null = null;
  private arcEncounterShown = false;

  // Uriel's arrival (Act II finale, scripted in MainScene). `urielPending` is armed
  // when Q7 completes; the scene fires when the player next returns to the Enumclaw
  // square. `urielArrived` is the one-shot (serialized) guard, and ALSO gates the old
  // corruption beat's offer so it can't begin before Uriel. NEITHER grants power.
  private urielPending = false;
  private urielArrived = false;

  // The RIFT SCENE (Batch 4 finale): the real corruption beat. `semyaza` is the
  // scene boss (clamped at SEMYAZA_LIE_THRESHOLD so the player never kills him);
  // `riftSceneStarted` guards the one-shot start; `riftLieFired` halts his combat
  // once the lie cutscene begins. The corruption grant fires in the scene (take
  // the Light). These are session/scene flags; completion is the chain quest state.
  private semyaza?: Boss;
  private riftSceneStarted = false;
  private riftLieFired = false;

  // Interaction targets (the real NPC and, when Spirit Vision is on, spirits).
  private talkTarget: Interactable | null = null; // in range now (drives Talk button)
  private guardTarget: Interactable | null = null; // already auto-talked; wait to leave range
  private reenableControls = false;
  private portalCooldownUntil = 0;
  private earthCollider!: Phaser.Physics.Arcade.Collider; // player vs Earth terrain

  // --- Save system ---
  /** How this run was launched from the TitleScene: 'new' or 'continue'. */
  private launchMode: 'new' | 'continue' = 'new';
  /** The active class for this run (chosen at character-select for a new game, or read
   *  from the save on continue). Drives the avatar, base stats, and the active skill tree. */
  /** The LIVE character's class — the single source of truth for "who am I".
   *  Public: the forced first-skill picker derives its class from THIS, never
   *  from a cached/module-level id (the wizard-on-witchdoctor regression). */
  classId: ClassId = 'blacksmith';
  /** True once create() has finished building + (optionally) loading — gates autosave. */
  private gameReady = false;
  /** True while applySave() is restoring — suppresses autosave so it can't write partial state. */
  private restoring = false;
  /** The player's current awarded title (mirrors the HUD text; serialized). */
  private currentTitle: string | null = null;
  // A quest just completed whose giver's "complete" reaction hasn't been shown yet.
  // With a MULTI-quest giver (Azazel) the next quest becomes available the instant the
  // last one completes, so the offer would otherwise skip npcCompleteLines. We show
  // them ONCE, on the next talk, before offering the next quest. Session-only (null on
  // load → at worst one acknowledgement is skipped; never a soft-lock).
  private pendingAckQuestId: string | null = null;
  private savedFlash?: Phaser.GameObjects.Text;
  /** Throttle: time (scene ms) of the last autosave write. */
  private lastAutosaveAt = -1e9;

  constructor() {
    super('MainScene');
  }

  /** Receive the launch mode + chosen class from the Title/character-select (before create()). */
  init(data?: { mode?: 'new' | 'continue'; classId?: ClassId }): void {
    this.launchMode = data?.mode === 'continue' ? 'continue' : 'new';
    // New game: the class comes from character-select. Continue: read it from the save
    // now (before the player avatar is built) so the right sprite + stats are used.
    if (this.launchMode === 'continue') {
      this.classId = SaveSystem.read()?.skills?.activeClass ?? 'blacksmith';
    } else {
      this.classId = data?.classId ?? 'blacksmith';
    }
  }

  /** Load real terrain tile art before create() builds the atlas (drop-in PNG path). */
  preload(): void {
    preloadTerrainTiles(this);
    preloadSpriteOverrides(this);
  }

  create(): void {
    // SPRITE DROP-INS first: any loaded override mints its canonical texture
    // key BEFORE entities ensure theirs (their guards then skip the gray-box).
    // The applied count is public so the runtime gate can assert shipped art landed.
    this.spriteOverridesApplied = applySpriteOverrides(this);

    const data = washingtonMap as unknown as WashingtonMap;

    // Overworld map, now including the extra town tiles in its tileset.
    this.map = new GameMap(this, data, TOWN_TILES);

    this.physics.world.setBounds(0, 0, this.map.pixelWidth, this.map.pixelHeight);
    this.cameras.main.setBounds(0, 0, this.map.pixelWidth, this.map.pixelHeight);
    this.cameras.main.setBackgroundColor('#0b1a2b');

    // City labels for everywhere except the real walkable towns. Exclude the cities
    // that have a real stamped town (Enumclaw = home, Portland, and now Seattle =
    // the Druid tree-house city); everywhere else gets a generic labeled marker.
    new CityMarkers(this, this.map, ['Enumclaw', 'Portland', 'Seattle']);

    // Stamp the town onto the overworld and read back its feature positions.
    this.town = buildTown(this.map);
    this.addTownDecor();

    // Portland (Oregon) — a second town from the same system, just a nameplate
    // (no rift). Built before the world snapshot so its tiles + NPC are world.
    this.portland = buildTown(this.map, PORTLAND_TOWN);
    this.addTownLabel(this.portland.label);

    // Seattle — the DRUID TREE-HOUSE CITY (Quests 10–11): forest + tree-house tiles
    // stamped at the existing Seattle marker. Rowan + Alder are placed by its plaza.
    this.seattle = buildTown(this.map, SEATTLE_DRUID_TOWN);
    this.addTownLabel(this.seattle.label);

    // Spawn the player in the town square.
    this.player = new Player(this, this.town.spawn.x, this.town.spawn.y, this.classId);
    this.earthCollider = this.physics.add.collider(this.player.sprite, this.map.layer);

    // A plain Enumclaw townsperson in the plaza (flavor only). The old opening
    // quest ('corruption-at-the-gates') is RETIRED — the corruption beat now lives
    // in the rift scene — so this NPC no longer gives a quest; it just speaks.
    this.npc = new Npc(this, this.town.npc.x, this.town.npc.y, [
      'Townsperson: You’re the one who keeps the valley standing. Folk sleep easier knowing you’re about.',
      'Townsperson: Strange times, though. Cold in the air that shouldn’t be there. Be careful out east.',
    ]);
    this.physics.add.collider(this.player.sprite, this.npc.sprite);

    // Act I (Enumclaw opening) quest-givers — Marta, Hollis, BranDen, Edda — set
    // around the home plaza, each a plain Npc whose per-state dialogue comes from
    // its QuestDef via the questGivers pipeline. Placed at small tile offsets from
    // spawn so they sit on walkable town ground. The Olympia recipient — DELLA, the
    // named woman who receives Marta's WATER PUMP (Q1) — lives far SW at OLYMPIA_POSITION
    // as a reusable NPC (this.olympiaNpc) so a later Act IV quest can send the player BACK
    // to her + the same pump (the callback). Handled specially on talk (deliverNpcs).
    const sp = this.town.spawn;
    const ts = this.map.tileSize;
    this.act1Givers = [
      new Npc(this, sp.x - ts * 3, sp.y - ts * 2, [...ACT1_HONEST_DAYS_WORK.npcInactiveLines]), // Marta
      new Npc(this, sp.x + ts * 3, sp.y - ts * 2, [...ACT1_WOLVES_TREE_LINE.npcInactiveLines]), // Hollis
      new Npc(this, sp.x - ts * 3, sp.y + ts * 2, [...ACT1_SHALLOWS.npcInactiveLines]), // BranDen
      new Npc(this, sp.x + ts * 3, sp.y + ts * 2, [...ACT1_THE_PASS.npcInactiveLines]), // Edda
    ];
    for (const g of this.act1Givers) this.physics.add.collider(this.player.sprite, g.sprite);
    this.olympiaNpc = new Npc(this, OLYMPIA_POSITION.x, OLYMPIA_POSITION.y, [...OLYMPIA_DELIVERY_LINES]);
    this.physics.add.collider(this.player.sprite, this.olympiaNpc.sprite);

    // Act II (corruption escalation) quest-givers — Pell, Sable, Joren — folk who
    // come to the square seeking help. Same data-driven questGivers pipeline; set a
    // little further out around the plaza so they don't overlap the Act I givers.
    this.act2Givers = [
      new Npc(this, sp.x - ts * 5, sp.y, [...ACT2_AFFLICTED_DOGS.npcInactiveLines]), // Old Pell
      new Npc(this, sp.x + ts * 5, sp.y, [...ACT2_THE_BLIGHT.npcInactiveLines]), // Sable
      new Npc(this, sp.x, sp.y - ts * 4, [...ACT2_WHITE_PASS.npcInactiveLines]), // Joren
    ];
    for (const g of this.act2Givers) this.physics.add.collider(this.player.sprite, g.sprite);

    // Investigation arc (Quests 8–12) NPCs, placed across the territory at their
    // locations. Wend + Halvard are Yakima givers (Q8/Q9); Rowan is the Seattle Druid
    // giver (Q10); Greta (Bellingham), Alder (Seattle), Mire (Longview) are DELIVER
    // recipients that complete an objective on talk. Q11/Q12 auto-activate (no giver).
    const wend = new Npc(this, YAKIMA_POSITION.x - ts * 2, YAKIMA_POSITION.y, [...INV_WORD_TO_YAKIMA.npcInactiveLines]);
    const halvard = new Npc(this, YAKIMA_POSITION.x + ts * 2, YAKIMA_POSITION.y, [...INV_IRON_ROAD.npcInactiveLines]);
    const sea = this.seattle.spawn;
    const rowan = new Npc(this, sea.x - ts * 2, sea.y, [...INV_NORTHERN_FARMS.npcInactiveLines]);
    this.alderNpc = new Npc(this, sea.x + ts * 2, sea.y, [...ALDER_EXAM_LINES]);
    this.mireNpc = new Npc(this, LONGVIEW_POSITION.x, LONGVIEW_POSITION.y, [...MIRE_VERDICT_LINES]);
    const greta = new Npc(this, BELLINGHAM_FARMS_POSITION.x, BELLINGHAM_FARMS_POSITION.y, [...GRETA_LINES]);
    // Act IV 4.4 — the Roseburg cleric who purifies the salt (a deliver/recipient NPC).
    this.clericNpc = new Npc(this, ROSEBURG_POSITION.x, ROSEBURG_POSITION.y, [...CLERIC_LINES]);
    this.invGivers = [wend, halvard, rowan];
    for (const g of [...this.invGivers, this.alderNpc, this.mireNpc, greta, this.clericNpc]) this.physics.add.collider(this.player.sprite, g.sprite);
    // Recipient NPCs (talk while the trigger is active → completes the objective).
    this.deliverNpcs = [
      { npc: this.olympiaNpc, trigger: 'pump-delivered', lines: [...OLYMPIA_DELIVERY_LINES], idle: 'Della: The garden’s drinking deep again, thanks to you. Safe travels, friend — and don’t be a stranger.' },
      { npc: greta, trigger: 'bellingham-thanked', lines: [...GRETA_LINES], idle: 'Greta: The fields are ours again, thanks to you. Safe travels.' },
      { npc: this.alderNpc, trigger: 'contraption-examined', lines: [...ALDER_EXAM_LINES], idle: 'Alder: The roots are uneasy of late. Walk carefully, friend.' },
      { npc: this.mireNpc, trigger: 'mire-verdict', lines: [...MIRE_VERDICT_LINES], idle: 'Mire: I’ve said my piece. Leave an old exile to the quiet.' },
      // Act IV 4.4: bring the gathered salt to the cleric (completes 'roseburg-reached').
      { npc: this.clericNpc, trigger: 'roseburg-reached', lines: [...CLERIC_LINES], idle: CLERIC_IDLE_LINE },
    ];

    // Portland's quest-giver-style NPC — flavor dialogue only (no quest wired).
    this.portlandNpc = new Npc(this, this.portland.npc.x, this.portland.npc.y, [...PORTLAND_NPC_LINES]);
    this.physics.add.collider(this.player.sprite, this.portlandNpc.sprite);

    // Spirit entities live in the world (drawn by the main camera), hidden until
    // Spirit Vision is revealed. Created here so they fall in the WORLD snapshot.
    this.spirit = new SpiritVision(this);

    // The angel manifests above the rift (world-space, created hidden).
    this.angel = new Angel(this, this.town.rift.x, this.town.rift.y - this.map.tileSize);

    // Combat: a world-space FX layer (damage numbers, swings) + the Sasquatch.
    // Created here so they fall in the WORLD snapshot (drawn by the main camera).
    this.worldFx = this.add.layer().setDepth(12);
    // Pooled transient FX (perf): reuse damage-number Texts + impact circles instead
    // of allocating/freeing them per hit — the measured cause of the under-load stutter.
    this.floatingText = new FloatingTextPool(this, this.worldFx, MAX_FLOATING_TEXTS);
    this.circleFx = new CircleFxPool(this, this.worldFx, MAX_CIRCLE_FX);
    this.swingFx = new SwingFxPool(this, this.worldFx, MAX_SWING_FX); // melee swing crescents (strike primitive)
    // The reusable projectile system draws bolts into the world-FX layer (so the
    // UI camera ignores them). Enemy bolts damage the player; impacts spawn a poof.
    this.projectiles = new ProjectileSystem(this, this.map, this.worldFx);
    this.projectiles.onPlayerHit = (dmg, tag) => this.onProjectileHitPlayer(dmg, tag);
    this.projectiles.onEnemyHit = (x, y, radius, dmg, hitSet, rider) => {
      const landed = this.resolveHolyBoltHit(x, y, radius, dmg, hitSet);
      if (landed) {
        // IMPACT RIDER (Bard framework): control applied where the bolt lands.
        if (rider) this.applyImpactRider(x, y, radius + 26, rider as { stunMs?: number; slowFactor?: number; slowMs?: number; weaken?: number; weakenMs?: number; knockback?: number });
        // ECHO: a delayed re-resolution at the impact point at echoPct strength.
        this.maybeEcho(() => this.resolveHolyBoltHit(x, y, radius + 10, dmg * this.echoPct));
      }
      return landed;
    };
    this.projectiles.onImpact = (x, y, color) => this.spawnBoltImpact(x, y, color);
    // Splash bolts (Wizard's Combust + storm-empowered bolts) burst into an AoE on impact.
    this.projectiles.onSplash = (x, y, radius, dmg) => {
      this.spawnSkillRing(x, y, radius, 0xff8a3a);
      this.aoeHitAll(x, y, radius, dmg);
    };
    // Allied summons (Ice Golem) — player-side tanks. Enemy bolts aimed at a summon hit
    // it (intercept). New summons are routed past the UI camera + given a terrain collider.
    this.summons = new AlliedSummonManager(this);
    this.summons.onSpawn = (s) => {
      // Collide with the world the summon is cast IN (summons never travel worlds —
      // they're cleared on every world swap), so Egypt casts hit Egypt terrain.
      this.physics.add.collider(s.sprite, this.activeMap().layer);
      this.uiCamera?.ignore(s.objects());
    };
    // ATTACKER summons (skeletons, the Dark Matter Monster) find + hit enemies through the
    // scene's shared targeting + AoE path, so their kills fire XP/quests/boss logic normally.
    this.summonCombat = {
      nearestEnemy: (x, y, maxRange) => {
        const e = this.nearestEnemy(x, y, maxRange);
        return e ? { x: e.x, y: e.y, dist: Phaser.Math.Distance.Between(x, y, e.x, e.y) } : null;
      },
      attack: (x, y, range, damage) => this.aoeHitAll(x, y, range, damage),
      // attackDot rider (Viper poison / Wolverine bleed): summon hits route their DoT
      // through the SAME shared DoT system player skills use.
      applyDot: (x, y, radius, dmgPerTick, tickMs, durationMs, color) => this.applyDotInRange(x, y, radius, dmgPerTick, tickMs, durationMs, color),
      // RANGED allies fire through the EXISTING pooled PLAYER-faction projectile path — the
      // same system player skills use, so no new pipeline + no per-shot allocation churn.
      fireProjectile: (fx, fy, tx, ty, damage, speed, range, radius, color) => {
        const a = Phaser.Math.Angle.Between(fx, fy, tx, ty);
        const dx = Math.cos(a);
        const dy = Math.sin(a);
        this.projectiles.spawn({
          x: fx + dx * 18,
          y: fy + dy * 18,
          dirX: dx,
          dirY: dy,
          speed,
          damage,
          maxRange: range,
          faction: 'player',
          color,
          radius,
        });
      },
    };
    // PASSIVE summon auras from the Necromancer's Summons tree (Necrotic Presence, Unyielding
    // Beast, the chosen branch passive, Tentacles) — per-summon-type, applied every frame.
    this.summons.passiveModsFor = (s) => this.summonPassiveMods(s);
    this.projectiles.onSummonHit = (x, y, radius, dmg) => this.resolveEnemyBoltVsSummon(x, y, radius, dmg);
    // Toxic Bolt: a poison field blooms where the bolt lands (per-target DoT in radius).
    this.projectiles.onImpactDot = (x, y, dot) => this.applyDotInRange(x, y, dot.radius, dot.dmgPerTick, dot.tickMs, dot.durationMs, dot.color);
    // PIECE 2: light aim-assist — nudge player bolts toward a nearby enemy in the aim cone.
    this.projectiles.onAimAssist = (x, y, dx, dy) => this.aimAssist(x, y, dx, dy);
    // SEEKING bolts (Mage framework): homing target = the nearest live enemy.
    this.projectiles.onSeekTarget = (x, y, range) => {
      const e = this.nearestEnemy(x, y, range);
      return e ? { x: e.x, y: e.y } : null;
    };
    // Persistent ground hazards (Greed): zones draw into the world-FX layer; a tick
    // applies player damage through the existing contact-damage path.
    this.hazards = new HazardField(this, this.worldFx);
    this.hazards.onTick = (dmg) => this.onCherubMelee(dmg);
    // Collectibles: motes draw into the world-FX layer (main camera only).
    this.pickups = new PickupSystem(this, this.worldFx);
    this.pickups.onCollect = (e) => this.onPickupCollected(e);
    this.holyPower.onChange = () => this.refreshHolyPowerUi();
    // Progression first: the player's HP pool is the level-derived max (Lv1 → BASE_MAX_HP).
    this.progression = new PlayerProgression();
    this.progression.profile = classBaseStats(this.classId); // per-class HP/damage/speed
    this.skills.activeClass = this.classId; // select this class's trees/unlocks/loadout
    this.progression.onChange = () => this.refreshXpUi();
    this.playerHealth = new Health(this.progression.effectiveMaxHP);
    this.playerHealth.onDamaged = (amt) => this.onPlayerHurt(amt); // Counter Attack + Reflect
    this.playerHealth.redirect = (amt) => this.allyBondRedirect(amt); // Witch Doctor ally-bond
    this.energy = new Health(MAX_ENERGY); // energy is a generic clamped pool
    // Derive the Sasquatch's lair from the home-town spawn (26 tiles north), so it
    // tracks Enumclaw rather than the old hard-coded Seattle-relative pixel.
    this.sasquatch = new Sasquatch(
      this,
      this.town.spawn.x,
      this.town.spawn.y - SASQUATCH_SPAWN_TILES_NORTH * this.map.tileSize,
    );
    this.sasquatch.onStrike = () => this.onSasquatchStrike();
    this.physics.add.collider(this.sasquatch.sprite, this.map.layer);
    this.physics.add.collider(this.player.sprite, this.sasquatch.sprite);

    // Portal Defense objective (world landmark; created here so its sprite + HP
    // bar fall in the WORLD snapshot) + the wave manager that drives the encounter.
    this.portal = new DarkPortal(this, PORTAL_POSITION.x, PORTAL_POSITION.y);
    this.portalDefense = new PortalDefense();
    this.portalDefense.aliveCount = () => this.townsfolk.length;
    this.portalDefense.onSpawn = (offset) =>
      this.spawnTownsfolk(this.portal.x + offset.dx, this.portal.y + offset.dy);
    this.portalDefense.onWaveStart = (wave, total) => {
      this.showBanner(`Wave ${wave} of ${total}`, 1600);
      this.portal.setWaveLabel(`  —  Wave ${wave}/${total}`);
    };
    this.portalDefense.onWin = () => {
      this.showBanner('The portal holds — Victory!', 3200);
      this.portal.setWaveLabel('');
    };
    this.portalDefense.onLose = () => {
      this.showBanner('The portal has fallen', 3200);
      this.clearTownsfolk();
      this.portal.setWaveLabel('');
    };

    // The quest CHAIN (data-driven registry). The world objective marker lives
    // in the worldFx layer, so the main camera draws it and the UI camera ignores
    // it. Quest-givers: which NPC offers which quest ids (it offers the available
    // one); idleLines play when it has nothing to give.
    // The LIVE registry = the hand-authored chain (untouched) + the generated
    // quests of every BUILT Europe zone appended after it (pure composition;
    // ids are collision-guarded, unbuilt prerequisites read as UNMET).
    this.chain = new QuestChain(appendToRegistry(QUEST_REGISTRY, [...buildEuropeQuestDefs(), ...buildAfricaQuestDefs(), ...buildAsiaQuestDefs(), ...buildFinalRegionsQuestDefs()]));
    // Announce the class BEFORE hooking onChange: the quest UI (tracker) doesn't
    // exist yet, and setPlayerClass fires onChange (this crashed create() when
    // announced after the hookup — refreshQuestUi touched the not-yet-built HUD).
    this.announcePlayerClass(); // classRequirement-gated quests unlock for this class
    this.chain.onChange = () => this.refreshQuestUi();
    this.chain.onEvent = (e) => this.handleQuestEvent(e);
    this.oregonSpirit = this.spirit.entities.find((e) => e.id === OREGON_SPIRIT_ID);
    // Quest-givers: the four Act I NPCs give the Enumclaw opening (one quest each,
    // unlocked in order by prerequisite); the home NPC gives the corruption beat
    // (now gated on Act I's 'the-pass'); the Oregon spirit is the dark PATRON who
    // gives the whole descent arc — reachable only with Spirit Vision on AND only
    // offered while corrupted (requiresCorruption). The pre-accept arrow points at
    // whichever giver's quest is currently available (one at a time).
    // (The Portland NPC is no longer a giver; talking to it shows its flavor lines.)
    const act1QuestIds = ['honest-days-work', 'wolves-tree-line', 'shallows', 'the-pass'];
    this.questGivers = this.act1Givers.map((giver, i) => ({
      entity: giver,
      pos: () => ({ x: giver.sprite.x, y: giver.sprite.y }),
      questIds: [act1QuestIds[i]],
      idleLines: [],
    }));
    const act2QuestIds = ['whats-gotten-into-them', 'the-blight', 'the-thing-at-white-pass'];
    for (let i = 0; i < this.act2Givers.length; i++) {
      const giver = this.act2Givers[i];
      this.questGivers.push({
        entity: giver,
        pos: () => ({ x: giver.sprite.x, y: giver.sprite.y }),
        questIds: [act2QuestIds[i]],
        idleLines: [],
      });
    }
    // Investigation arc givers: Wend→Q8, Halvard→Q9, Rowan→Q10 (Q11/Q12 auto-activate).
    const invQuestIds = ['word-to-yakima', 'the-iron-road', 'the-northern-farms'];
    for (let i = 0; i < this.invGivers.length; i++) {
      const giver = this.invGivers[i];
      this.questGivers.push({
        entity: giver,
        pos: () => ({ x: giver.sprite.x, y: giver.sprite.y }),
        questIds: [invQuestIds[i]],
        idleLines: [],
      });
    }
    // (The home townsperson is no longer a quest-giver — the old corruption beat is
    //  retired; the corruption grant now happens in the rift scene.)
    if (this.oregonSpirit) {
      const patron = this.oregonSpirit;
      this.questGivers.push({
        entity: patron,
        pos: () => ({ x: patron.x, y: patron.y }),
        // The FULL Act IV chain, in order (firstAvailable walks this list). The old
        // placeholder descent ids are RETIRED — the finale (4.8–4.10) replaces them.
        // 4.10 is autoActivate (never offered) but listed so the giver's active /
        // complete dialogue states resolve for it.
        questIds: [
          'act4-what-they-wont-give',
          'act4-watchers-on-the-road',
          'act4-the-trade-day',
          'act4-salt-and-sea',
          'act4-the-door-they-came-through',
          'act4-olympia',
          'act4-poison-the-well',
          'act4-the-heart-of-each-city',
          ACT4_DRAW_ID,
          ACT4_DOOR_HOME_ID,
          ACT4_HEAVEN_ID,
        ],
        idleLines: [...PATRON_IDLE_LINES],
        requiresCorruption: true,
      });
    }
    this.chain.evaluateUnlocks(); // opening quest → available from the start
    this.marker = new ObjectiveMarker(this, this.worldFx);
    this.sinMarker = new ObjectiveMarker(this, this.worldFx); // the Hell "next Sin" beacon (reused system)

    // The Dark Outpost — the arc's hub landmark (ominous violet marker) where the
    // patron dwells. A world object (in the snapshot below → main camera only).
    this.addOutpostMarker();

    // The Descent climax: the Holy Outpost marker + the Heaven Portal + the two
    // dormant flaming-sword guardians (all world objects, in the snapshot below).
    this.setupGuardianEncounter();

    // The SECOND world — Heaven — built at a coordinate offset (its objects fall in
    // the world snapshot below → main camera only). Earth stays active.
    this.setupHeaven();

    // Azazel's progress-gated station (fresh chain = his Oregon home; a Continue
    // load re-derives it in applySave; heavenArrivalPos exists now for stage 3).
    this.updatePatronLocation();

    const cam = this.cameras.main;
    cam.startFollow(this.player.sprite, true, 0.12, 0.12);
    cam.setZoom(CAMERA_ZOOM); // tune in src/game/settings.ts
    cam.setRoundPixels(true);

    // Everything created so far is WORLD. Snapshot it so the UI camera can
    // ignore it (and the main camera can ignore the UI created next).
    const worldObjects = this.children.list.slice();

    this.controls = new Controls(this);
    this.dialogue = new DialogueBox(this);
    this.talkButton = new TouchButton(this, 'Talk', () => this.tryTalk());
    // The defeat-gated portal-corruption button (bottom-centre, like Talk; the
    // outpost has no NPC so the two never contend). Hidden until both swords die.
    this.corruptButton = new TouchButton(this, 'Corrupt the Portal', () => this.tryCorruptPortal());
    // The CORRUPTED Holy-Outpost portal crosses by BUTTON, not walk-in (both ways) —
    // no accidental world change from walking near it. Other portals (Heaven→Hell,
    // the ending's one-way home) keep their established walk-in behavior.
    this.enterHeavenButton = new TouchButton(this, 'Enter Heaven', () => this.enterHeavenPortal());
    this.returnEarthButton = new TouchButton(this, 'Return to Earth', () => this.returnToEarthPortal());
    // NESTED CITIES: the shared Enter/Leave gate button (same contextual slot;
    // proximity-gated in updateCityGates, so it never contends with Talk).
    this.cityGateButton = new TouchButton(this, 'Enter Village', () => this.cityGateAction?.());
    // Act II Q6: the proximity "Burn the Grove" action (same bottom-centre slot as
    // Talk/Corrupt; they never contend — the grove has no NPC). Hidden until in range.
    this.burnButton = new TouchButton(this, 'Burn the Grove', () => this.tryArcAction());
    // CAIRO binding: the Keeper's proximity talk button (Egypt world only).
    this.cairoMentorButton = new TouchButton(this, 'Speak with the Keeper', () => this.cairoMentorTalk());
    this.mentorButton = new TouchButton(this, 'Speak with the Mentor', () => this.regionMentorTalk());
    this.zoomControls = new ZoomControls(this, cam, this.map.pixelWidth, this.map.pixelHeight);
    this.readout = new DebugReadout(this, () => this.activeMap(), this.player);
    // DEV-only live perf readout (FPS / frame-time + entity, effect + pool counts) so
    // the under-load behaviour is observable on a phone. Gated by DEV_MODE.
    if (DEV_MODE) this.perfReadout = new PerfReadout(this, () => this.perfLines());
    // Spirit Vision tint is UI (created after the world snapshot so it lands in
    // the UI camera partition below). The reusable choice prompt creates its
    // objects on demand and tells the main camera to ignore them.
    this.spirit.createTint();
    this.choice = new ChoicePrompt(this, cam);
    this.createCombatHud();
    this.createHolyPowerHud();
    this.tracker = new QuestTracker(this);
    this.createQuestHud();
    this.createBossHud(); // the boss HP bar (UI partition)
    this.createSaveUi(); // the manual "Save" button + "Saved" indicator (UI partition)
    this.createSkillUi(); // skill open-button + activatable-skill bar (UI partition)
    this.createDevTools(); // dev panel + dev keys (gated by DEV_MODE)
    this.createFadeOverlay(); // full-screen fade for portal transitions (UI partition)

    // Dedicated UI camera, fixed at zoom 1 and never scrolling, so the on-screen
    // UI is NOT scaled or moved by the main camera's zoom/follow (the bug:
    // scrollFactor(0) stops scrolling but NOT scaling with zoom). Partition
    // rendering: the main camera draws only the world; the UI camera only the UI.
    const uiObjects = this.children.list.filter((o) => !worldObjects.includes(o));
    this.uiCamera = this.cameras.add(0, 0, this.scale.width, this.scale.height);
    this.uiCamera.setName('UICamera');
    cam.ignore(uiObjects);
    this.uiCamera.ignore(worldObjects);
    // ORIENTATION: keep the UI camera's viewport matched to the canvas on every
    // rotation/resize (added cameras don't auto-resize like the main one; the main
    // camera keeps its zoom — landscape simply sees wider).
    const uiCamResize = (): void => {
      this.uiCamera.setSize(this.scale.width, this.scale.height);
    };
    this.scale.on(Phaser.Scale.Events.RESIZE, uiCamResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, uiCamResize));

    // Initial quest UI state: tracker hidden (inactive), no title, marker points
    // the player toward the quest-giver.
    this.refreshQuestUi();
    this.refreshHolyPowerUi();

    // A dormant pack of spirit swarmers waits near the Corruption Rift — unseen
    // and intangible until Spirit Vision is earned. Spawned after the UI camera
    // exists so each is routed past it (world camera draws them).
    this.spawnSwarmPack(this.town.rift.x, this.town.rift.y);
    // The Oregon seed: a second dormant pack south of Portland, proving the
    // spirit corridor extends into Oregon (only fightable with Spirit Vision on).
    this.spawnSwarmPack(OREGON_SWARM_SPAWN.x, OREGON_SWARM_SPAWN.y);

    // SAVE SYSTEM: if launched via "Continue", restore the full saved state now
    // (everything above is built to defaults first, then overridden). Then arm
    // autosave (event-driven hooks call autosave() directly; here: a periodic
    // timer + a page-hide save so closing the tab persists progress).
    if (this.launchMode === 'continue') {
      const save = SaveSystem.read();
      if (save) this.applySave(save);
    } else {
      // CLASS-START (Casey's ruling): a brand-NEW character spawns in their class's
      // home city. Continue-saves above restore their exact saved world/position.
      this.applyClassHomeStart();
    }
    // No base kit: decide the starting loadout now that any save is restored — a new
    // character (or an old save with no damaging active) must pick a first skill before
    // play; otherwise just enforce the anti-soft-lock floor.
    this.requireStartingSkill();
    this.gameReady = true;
    this.time.addEvent({ delay: 45000, loop: true, callback: () => this.autosave() });
    const onVisibility = (): void => {
      // Page hidden (tab closing/backgrounding) → save the EXACT latest state now,
      // bypassing the throttle so nothing is lost on close.
      if (document.hidden && this.gameReady && !this.restoring) this.writeSave();
    };
    document.addEventListener('visibilitychange', onVisibility);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => document.removeEventListener('visibilitychange', onVisibility));
  }

  override update(_time: number, delta: number): void {
    // FORCED FIRST SKILL (no base kit): freeze everything and open the picker until the
    // player chooses a starting damaging active. Launched here (not in create) so the
    // scene is fully running before we pause it; the pick clears the flag + resumes.
    if (this.pendingFirstSkill) {
      if (!this.scene.isActive('FirstSkillScene')) {
        this.scene.launch('FirstSkillScene');
        this.scene.pause();
      }
      return;
    }
    // Zoom keeps smoothing every frame, even during dialogue.
    this.zoomControls.update(delta);
    // Pooled transient FX animate every frame (even during dialogue/death freezes, so
    // in-flight labels/flashes finish fading instead of sticking).
    this.floatingText.tick(this.time.now);
    this.circleFx.tick(this.time.now);
    this.swingFx.tick(this.time.now);
    this.perfReadout?.sample(delta); // DEV-only FPS / frame-time + counts (runs every frame)
    this.updateCombatHud();
    this.updateClimaxQuestActivation(); // self-healing climax start + world catch-up (all worlds)
    this.updateObjectiveMarker();
    this.updateSinMarker();
    this.updateLairEntry();
    this.updateRedemptionApproach();
    this.updateSkills(delta); // expire timed buffs/forms, regen/aura, stun release, cooldowns
    this.updateEarthPortal();

    if (this.playerDead) {
      this.cancelDash();
      this.player.setDirection(0, 0);
      this.sasquatch.halt();
      this.haltSwarmers();
      this.haltAngels();
      this.haltTownsfolk();
      this.haltGuardians();
      this.haltCherubs();
      this.haltBosses();
      this.haltDemons();
      this.summons.halt();
      this.aimingDir = null;
      this.hideAimIndicator();
      this.corruptButton.setVisible(false);
      this.enterHeavenButton.setVisible(false);
      this.returnEarthButton.setVisible(false);
      this.cityGateButton.setVisible(false);
      this.readout.update();
      return;
    }

    if (this.reenableControls && !this.dialogue.isOpen() && !this.choice.isOpen()) {
      this.controls.setEnabled(true);
      this.reenableControls = false;
    }

    // Frozen while a conversation or a choice is open.
    if (this.dialogue.isOpen() || this.choice.isOpen()) {
      this.cancelDash();
      this.player.setDirection(0, 0);
      this.talkButton.setVisible(false);
      this.corruptButton.setVisible(false);
      this.enterHeavenButton.setVisible(false);
      this.returnEarthButton.setVisible(false);
      this.cityGateButton.setVisible(false);
      this.sasquatch.halt();
      this.haltSwarmers();
      this.haltAngels();
      this.haltTownsfolk();
      this.haltGuardians();
      this.haltCherubs();
      this.haltBosses();
      this.haltDemons();
      this.summons.halt();
      this.aimingDir = null;
      this.hideAimIndicator();
      this.readout.update();
      return;
    }

    // Dashing overrides normal movement: hold the dash velocity (terrain colliders
    // still stop the player), damage enemies passed through, then resume control.
    if (this.isDashing()) {
      this.player.sprite.setVelocity(this.dashDir.x * DASH_SPEED, this.dashDir.y * DASH_SPEED);
      this.spawnDashTrail();
      if (this.plowActive) this.plowTick();
      else if (this.chargeActive) this.chargeTick();
      else if (this.gustActive) this.gustTick();
      else this.dashDamageTick();
      if (this.time.now >= this.dashEndsAt) this.endDash();
    } else {
      const dir = this.controls.getDirection();
      // CHANNEL INTERRUPT-ON-MOVE: any joystick input cancels an active channel (then the
      // player moves normally). The channel keeps you stationary only because moving ends it.
      if (this.channel && (dir.x !== 0 || dir.y !== 0)) this.endChannel(true);
      this.player.setDirection(dir.x, dir.y);
    }

    // World-gated systems: TERRESTRIAL worlds (Earth, Egypt) run the full ground-
    // world path — doors, interactions, arcs, angels, townsfolk — while the
    // Earth-anchored one-shots (Uriel, Seattle, the rift, the Sasquatch, portal
    // defense, the Holy-Outpost guardian machine) stay Earth-only. Heaven is
    // empty — its only per-frame logic is the return-gate proximity. Movement,
    // dash, zoom, the HUD, regen and projectiles are world-agnostic.
    if (this.isTerrestrial(this.activeWorld)) {
      this.checkDoors();
      this.updateArc(); // descent-arc completion watcher (before interactions so a
      // "return to the outpost" completes before the patron auto-offers the next quest)
      if (this.isDashing()) this.talkButton.setVisible(false);
      else this.checkInteractions();
      this.updateCityGates(); // AFTER interactions: Talk keeps the shared slot
      if (this.regionWorldIds.has(this.activeWorld)) {
        this.updateRegionSpawns(); // per-chunk packs (any region world)
        this.groundLayers.get(this.activeWorld)?.update(this.cameras.main); // continents under the camera
        this.blockVoidWater(); // water is impassable ground; gates are the travel
      }
      this.updateAngels();
      this.updateTownsfolk(); // prune dead first so the wave manager sees the live count
      if (this.activeWorld === WORLD_EGYPT) this.updateCairoBinding(); // Wizard Act I ambient content
      if (this.activeWorld === WORLD_EARTH) {
        this.checkUrielArrival(); // Act II finale: scripted Uriel scene back in the square
        this.checkSeattleIntro(); // first time in the Druid city: a one-shot intro narration
        this.checkRiftSceneStart(); // FINALE: reaching the N-Oregon rift begins the rift scene
        const sqTarget = this.enemyAggroTarget(this.sasquatch, this.sasquatch.x, this.sasquatch.y); // hierarchy/golem aggro
        this.sasquatch.update(sqTarget.x, sqTarget.y, this.time.now);
        this.updateSwarmers();
        this.portalDefense.update(this.time.now);
        this.updateGuardianEncounter();
      }
    } else if (this.activeWorld === WORLD_HEAVEN) {
      // Interactions run in Heaven too — Azazel stands at the arrival for Act IV
      // 4.10's talk (Earth interactables are all out of range here).
      if (this.isDashing()) this.talkButton.setVisible(false);
      else this.checkInteractions();
      this.updateHeaven();
    } else {
      this.talkButton.setVisible(false);
      this.updateHell(); // WORLD_HELL: the return-gate proximity
    }
    // World-agnostic: Cherubs/Michael (Heaven), Demons (Hell), the God-judgment
    // gate, projectiles + pickups all run for every world — distant enemies idle
    // (leashed), and the pickup/projectile systems carry items in any world.
    // Each enemy loop applies the WORLD-RESIDENT TICK GATE internally: only
    // residents of the ACTIVE world tick; everyone else is fully paused.
    this.updateCherubs();
    this.updateBosses();
    this.updateBossBeams(); // enemy-cast channel beams (the champion's signature)
    this.updateDemons();
    this.updateGodJudgment();
    this.summons.update(this.player.x, this.player.y, this.time.now, this.summonCombat); // tanks follow, attackers hunt + prune
    this.updateAimIndicator(); // PIECE 4: world-space aim arrow while a skill button is dragged
    // Control tree: register the always-on auras (Dominance / Iron Pyrite) + the
    // player-incoming WEAKEN, then scale slowed enemies' velocity. These run AFTER
    // every enemy update so the slow overrides the chase velocity just set.
    this.updateControlEffects();
    this.applyEnemySlows();
    this.updateSpellHazards(); // ground zones (Lava / Black Ice / Freezing Rain / Biohazard / Pestilence)
    this.updateFriendlyZones(); // heal-over-time zones for the player + summons (static + mobile)
    this.updateConfusion(); // Bard confusion: expiry + a confused enemy chips at its fellow
    this.updateVoodoo(); // Witch Doctor: bind expiry + spirit assault + spirit split pulses
    this.updatePulseRing(); // Monk: the following damage pulse ring
    this.updateTraps(); // Assassin: device arming/trigger/expiry
    this.updateAllyShields(); // Priest: summon absorb-pool expiry
    this.updateDualChannel(); // Priest: the heal-and-harm beam
    this.updateComboUltimate(); // Bard War Song: the auto-chain cadence
    this.updateDots(); // poison DoTs + Plague contagion spread + stacking DoTs
    this.updateChannel(delta); // channeled beam: tick damage + energy trickle + redraw
    this.projectiles.update(delta, this.player.x, this.player.y, PROJECTILE_PLAYER_HIT_RADIUS);
    this.hazards.update(this.time.now, this.player.x, this.player.y, this.playerDead);
    this.pickups.update(this.player.x, this.player.y);
    this.regenTick(delta);
    this.readout.update();
  }

  // --- Combat ---------------------------------------------------------------

  private createCombatHud(): void {
    // BUTTONS band (back): the HP/XP/Energy bars are player HUD chrome, so they sit
    // BEHIND the data readout and the story text boxes (see uiLayout z-order).
    const depth = DEPTH_HUD_BUTTONS;
    // Bottom-left corner cluster: a level badge + HP numbers, HP bar, thin XP + Energy.
    this.playerBar = new HealthBar(this, 150, 10, depth);
    this.playerBar.setScrollFactor(0);
    this.xpBar = new HealthBar(this, 150, 5, depth, 0x49b6ff); // fixed blue XP fill
    this.xpBar.setScrollFactor(0);
    this.energyBar = new HealthBar(this, 150, 5, depth, 0xb45cff); // fixed violet energy fill
    this.energyBar.setScrollFactor(0);
    this.playerHpText = this.add
      .text(0, 0, '', { fontFamily: 'ui-monospace, monospace', fontSize: '11px', color: '#eafff0' })
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(depth + 2);
    this.levelBadge = this.add
      .text(0, 0, 'Lv 1', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        color: '#9fd0ff',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(depth + 2);
    // Third ability — hidden until the player becomes holy at the throne swap.
    this.holyBoltButton = new HolyBoltButton(this, () => this.tryHolyBolt());
    this.holyBoltButton.setVisible(this.power.isHoly);
    this.banner = this.add
      .text(0, 0, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '26px',
        color: '#ffe9a8',
        fontStyle: 'bold',
        align: 'center',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH_HUD_TEXTBOX + 100) // story text box: in front of buttons + readout
      .setStroke('#1a1008', 6)
      .setVisible(false);
    // Dedicated level-up banner (sits above the combat banner so the two never
    // clobber each other when a kill both completes a quest and levels you).
    this.levelBanner = this.add
      .text(0, 0, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '28px',
        color: '#9fd0ff',
        fontStyle: 'bold',
        align: 'center',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH_HUD_TEXTBOX + 101)
      .setStroke('#08131f', 6)
      .setVisible(false);

    const layout = (): void => {
      const ins = getInsets(this);
      const h = this.scale.height;
      const x = ins.left + UI_MARGIN;
      // VERY BOTTOM-LEFT CORNER: Energy at the floor, XP above it, HP (thick) on top,
      // with HP numbers + the level badge in the right column. The joystick sits in
      // the band directly above this stack (see Controls.layout).
      const bottomY = h - ins.bottom - UI_MARGIN;
      this.energyBar.setPosition(x, bottomY - 4);
      this.xpBar.setPosition(x, bottomY - 13);
      this.playerBar.setPosition(x, bottomY - 24);
      this.playerHpText.setPosition(x + 158, bottomY - 24);
      this.levelBadge.setPosition(x + 158, bottomY - 4);
    };
    layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, layout);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, layout)); // never leak across scene restarts

    // Gameplay keys (never gated by DEV_MODE): Attack (also the on-screen button)
    // and a desktop-convenience Dash key alongside the on-screen Dash button.
    const kb = this.input.keyboard;
    // Desktop convenience: trigger the first two equipped loadout skills.
    kb?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE).on('down', () => this.activateLoadoutSlot(0));
    kb?.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT).on('down', () => this.activateLoadoutSlot(1));
    // Desktop convenience for the Holy Bolt (self-gates: holy-only + cost/cooldown).
    kb?.addKey(Phaser.Input.Keyboard.KeyCodes.F).on('down', () => this.tryHolyBolt());
    // Desktop convenience for the on-screen "Corrupt the Portal" button (self-gates).
    kb?.addKey(Phaser.Input.Keyboard.KeyCodes.C).on('down', () => this.tryCorruptPortal());

    this.refreshXpUi();
  }

  private updateCombatHud(): void {
    // The default attack/dash buttons are gone — the player's active kit is the
    // equipped-skill loadout (its buttons update their own cooldown/energy state in
    // updateSkills). Here we only refresh the vitals + the Holy Bolt grant button.
    this.playerBar.setRatio(this.playerHealth.ratio);
    this.playerHpText.setText(`${Math.ceil(this.playerHealth.current)} / ${this.playerHealth.max}`);
    this.energyBar.setRatio(this.energy.ratio);
    // Holy Bolt button (only visible/active while holy) + the trailing aura.
    if (this.power.isHoly) {
      const hbCdRatio = (this.holyBoltCooldownUntil - this.time.now) / PLAYER_HOLY_BOLT_COOLDOWN_MS;
      this.holyBoltButton.setState(hbCdRatio, this.energy.current < PLAYER_HOLY_BOLT_ENERGY_COST);
      this.holyAura?.setPosition(this.player.x, this.player.y);
    }
  }

  /** Refresh the XP bar fill + level badge (called on every XP/level change). */
  private refreshXpUi(): void {
    this.xpBar.setRatio(this.progression.xpRatio);
    this.levelBadge.setText(`Lv ${this.progression.level}`);
  }

  // --- Progression / leveling -----------------------------------------------

  /** Single XP entry point for every source (kills, quest, dev keys). */
  private gainXP(amount: number): void {
    // SONG OF LORE (Bard keyed buff): boosted XP gain while the song runs.
    if (this.skillTimed.some((t) => t.id === SONG_OF_LORE_ID)) amount *= BARD_SONGS_TUNING.songOfLore.xpMult;
    // SOUL HARVEST (Witch Doctor keyed passive): fallen enemies' essence restores
    // HP + energy on every credited kill's XP award.
    if (amount > 0 && this.skills.isUnlocked(SOUL_HARVEST_ID)) {
      this.playerHealth.heal(WD_VOODOO_TUNING.harvest.healPerKill);
      this.energy.heal(WD_VOODOO_TUNING.harvest.energyPerKill);
    }
    const levelsGained = this.progression.addXP(amount);
    if (levelsGained > 0) {
      this.skills.awardPoints(levelsGained); // 1 skill point per level gained
      this.onLevelUp();
    }
  }

  /** Apply level-derived stats, heal to full, and play the level-up moment. */
  private onLevelUp(): void {
    this.playerHealth.setMax(this.skillAdjustedMaxHP());
    this.playerHealth.full();
    this.levelBanner
      .setText(`LEVEL UP — Lv ${this.progression.level}`)
      .setPosition(this.scale.width / 2, this.scale.height * 0.3)
      .setVisible(true);
    this.time.delayedCall(1100, () => this.levelBanner.setVisible(false));
    this.player.levelUpFlash();
    this.spawnLevelUpBurst();
    this.autosave(); // meaningful moment: a level gained
  }

  /** A quick gold ring bursting from the player (world FX, main camera). */
  private spawnLevelUpBurst(): void {
    const ring = this.add
      .circle(this.player.x, this.player.y, 18, 0xffe9a8, 0)
      .setStrokeStyle(3, 0xffe9a8, 0.9)
      .setDepth(13);
    this.worldFx.add(ring);
    this.tweens.add({
      targets: ring,
      scale: 3,
      alpha: 0,
      duration: 520,
      ease: 'Quad.out',
      onComplete: () => ring.destroy(),
    });
  }

  // --- SKILL TREE: economy + generic effect handlers (framework) --------------
  //
  // SkillState holds the serializable points + unlocks; this layer turns unlocked
  // skills into live effects: PASSIVE stats apply while owned, ACTIVE/BUFF/DEBUFF/
  // TRANSFORMATION skills get on-screen buttons that dispatch by effect kind. New
  // skills are pure data (skillData.ts) — no new code per skill.

  /** Build the skill UI (open button + activatable-skill bar) + wire the change hook. */
  private createSkillUi(): void {
    // The loadout bar (6 equipped-skill buttons) IS the player's active kit; it
    // replaces the old fixed Attack/Dash buttons in the bottom-right.
    this.skillBar = new LoadoutBar(this, {
      onOpen: () => this.openSkillTree(),
      onActivate: (slot) => this.activateLoadoutSlot(slot), // tap = quick fire (facing + aim-assist)
      isAimable: (slot) => this.isSlotAimable(slot),
      onAimMove: (_slot, dx, dy) => { this.aimingDir = { dx, dy }; }, // drag → show the indicator (drawn each frame)
      onAimRelease: (slot, dx, dy) => this.fireAimedSlot(slot, dx, dy),
    });
    // Re-apply effects + refresh the bar whenever points/unlocks/loadout change. The
    // starting loadout (forced first-skill pick vs. floor) is decided in
    // requireStartingSkill(), called after any "Continue" save has been restored.
    this.skills.onChange = () => this.recomputeSkillEffects();
    this.recomputeSkillEffects();
  }

  /**
   * NO-BASE-KIT START. The player's first ability comes ONLY from a tree skill. If the
   * player owns no damaging active (a new game, or an old save / dev reset that left
   * none), open the forced first-skill picker — the game stays frozen until they choose.
   * Otherwise enforce the anti-soft-lock floor (auto-equip an owned damaging active if
   * an old save somehow had none equipped). Idempotent; safe to call repeatedly.
   */
  private requireStartingSkill(): void {
    if (this.skills.needsFirstSkill()) {
      if (this.skills.unspentPoints < 1) this.skills.awardPoints(1); // afford the first node
      this.pendingFirstSkill = true; // update() launches the picker + pauses the game
    } else {
      this.skills.ensureLoadoutFloor(); // migrate old saves: keep an owned damaging active equipped
      this.recomputeSkillEffects();
    }
  }

  /** SkillHost (FirstSkillScene): unlock the chosen first skill, auto-equip it to slot 1,
   *  and unfreeze the game. Rejects anything that isn't a valid damaging-active opener. */
  completeFirstSkill(id: string): boolean {
    const def = classSkills(this.skills.activeClass).skills.find((s) => s.id === id);
    if (!def || !isStarterSkill(def)) return false;
    if (!this.skills.isUnlocked(id) && !this.skills.unlock(def)) return false; // spend the point
    this.skills.equip(0, id); // the chosen skill lands on loadout slot 1 (index 0)
    this.pendingFirstSkill = false;
    this.recomputeSkillEffects();
    this.autosave();
    return true;
  }

  /** DEV: spawn one Townsfolk-variant enemy (Act IV reskins) next to the player to eyeball it. */
  private devSpawnTownsfolkVariant(variant: TownsfolkVariant): void {
    this.spawnTownsfolk(this.player.x + 80, this.player.y, null, variant); // null target → hunts the player
    this.showBanner(`Spawned: ${variant}`, 1000);
  }

  /** DEV: spawn one Angel-variant enemy (Act IV variants) near the player to eyeball it. */
  private devSpawnAngelVariant(key: AngelVariantKey): void {
    this.spawnAngel(key, this.player.x + 110, this.player.y);
    this.showBanner(`Spawned: ${key} angel`, 1000);
  }

  /** Activate the skill equipped in loadout `slot` (no-op for an empty slot). */
  private activateLoadoutSlot(slot: number): void {
    const id = this.skills.loadout()[slot];
    if (id) this.activateSkill(id);
  }

  /** A short button caption for an activatable skill (first word of its name, minus the [TEST] tag). */
  private skillButtonLabel(d: SkillDef): string {
    // FULL name (the loadout bar auto-fits the font + wraps so it never truncates).
    return d.name.replace(/^\[TEST\]\s*/, '');
  }

  /** Open the skill-tree screen (pauses the game underneath, like the pause menu). */
  private openSkillTree(): void {
    if (this.scene.isActive('SkillTreeScene')) return;
    this.scene.launch('SkillTreeScene');
    this.scene.pause();
  }

  // --- SkillHost interface (used by SkillTreeScene) ---
  getSkillState(): SkillState {
    return this.skills;
  }
  tryUnlockSkill(id: string): boolean {
    const def = classSkills(this.skills.activeClass).skills.find((s) => s.id === id);
    if (!def) return false;
    const ok = this.skills.unlock(def);
    if (ok) this.autosave(); // persist the spend immediately
    return ok; // recomputeSkillEffects runs via skills.onChange
  }

  /** Equip an unlocked equippable skill into a loadout slot (SkillHost; from the tree UI). */
  equipSkill(slot: number, id: string): boolean {
    const ok = this.skills.equip(slot, id);
    if (ok) this.autosave();
    return ok;
  }
  /** Clear a loadout slot (SkillHost). */
  unequipSlot(slot: number): void {
    this.skills.unequip(slot);
    this.autosave();
  }

  /** DEV: respec — refund every unlocked skill, clear live buffs/forms + cooldowns. With
   *  no base kit this can leave zero damaging actives, so re-run the forced first pick. */
  private devResetSkills(): void {
    this.skillTimed = [];
    this.skillCooldownUntil = {};
    this.skillCooldownDur = {};
    this.releaseAllStuns();
    this.skills.reset(); // refunds spent points, clears unlocks (onChange → recompute)
    this.requireStartingSkill(); // floor respects: never leaves the player unable to attack
  }

  /** DEV: unlock the Necromancer's whole SUMMONS tree (picking Blood Skeleton at the node-6
   *  branch) + equip its 6 actives, for quick mobile testing. */
  private devUnlockSummons(): void {
    if (this.skills.activeClass !== 'necromancer') {
      this.showBanner('Set Class: Necromancer first', 1200);
      return;
    }
    this.skills.awardPoints(20);
    const nodes = classSkills('necromancer')
      .skills.filter((s) => s.tree === SUMMONS_TREE)
      .sort((a, b) => a.tier - b.tier);
    for (const def of nodes) {
      if (def.id === MARROW_SKELETON_ID) continue; // pick Blood Skeleton at the branch
      this.skills.unlock(def);
    }
    // Equip the actives (skip passives) into the 6 slots for instant testing.
    const actives = nodes.filter((d) => isEquippableSkill(d));
    actives.forEach((d, i) => {
      if (i < 6) this.skills.equip(i, d.id);
    });
    this.refreshLoadoutBar();
    this.recomputeSkillEffects();
    this.showBanner('Summons tree unlocked (Blood)', 1400);
  }

  /** PLAYER-FACING RESET (Skill Tree screen): refund all spent points + clear every unlock for
   *  the CURRENT character (all trees) — frees any branch choice — then keep the anti-soft-lock
   *  floor (re-prompt the forced first skill if the loadout is now empty) and persist. */
  resetSkillTrees(): void {
    this.skillTimed = [];
    this.skillCooldownUntil = {};
    this.skillCooldownDur = {};
    this.releaseAllStuns();
    this.cancelChannelSilent();
    this.skills.reset(); // refunds points, clears unlocks (frees branch), prunes loadout
    this.requireStartingSkill(); // re-open the forced first pick if no starter remains
    this.writeSave(); // persist the reset state
  }

  /** DEV: switch the active class (avatar + base stats + that class's trees/loadout). If
   *  the new class owns no damaging active yet, the forced first-skill pick re-opens. */
  private devSetClass(classId: ClassId): void {
    this.classId = classId;
    this.skills.activeClass = classId;
    this.progression.profile = classBaseStats(classId);
    this.player.setClassSkin(classId);
    this.skillTimed = [];
    this.skillCooldownUntil = {};
    this.skillCooldownDur = {};
    this.releaseAllStuns();
    this.clearSpellHazards();
    this.clearFriendlyZones();
    this.clearEntangle();
    this.crystallize.clear();
    this.confused.clear();
    this.comboUltimate = null;
    this.voodoo = null; // WD bind state never survives a reset (summons are cleared too)
    this.allyBond = null;
    this.spiritSplit = null;
    this.parry = null; // Samurai timing state never survives a reset
    this.perfectFormUntil = 0;
    this.iaijutsu = null;
    this.pulseRing = null; // Monk state never survives a reset either
    this.actionWhiffed = false;
    this.empoweredStrikes = null;
    this.clearTraps(); // Assassin state never survives a reset either
    this.clearPriestState(); // nor the Priest's
    this.breakPlayerStealth();
    this.clearDots();
    this.summons.clear();
    this.requireStartingSkill(); // pick a first skill if this class has none yet
    this.recomputeSkillEffects();
    this.playerHealth.setMax(this.skillAdjustedMaxHP());
    this.playerHealth.full();
    this.refreshLoadoutBar();
    this.announcePlayerClass(); // re-announce so class-gated quests re-evaluate
    this.showBanner(`Class: ${classId}`, 1400);
  }

  /**
   * Tell the quest chain which class the player is, for classRequirement-gated
   * quests (home-city chains). The DEV override (below) wins when set, so gated
   * chains like Rome's can be playtested before their classes exist. The
   * internal id → manifest name mapping lives in world/class-canon.ts (canon:
   * Mage and Wizard are permanently distinct classes).
   */
  private announcePlayerClass(): void {
    this.chain.setPlayerClass(this.devClassOverride ?? MANIFEST_CLASS_FOR[this.classId] ?? this.classId);
  }

  /** DEV: cycle the announced-class override — none → each known class → none. */
  private devCycleClassOverride(): void {
    const names = KNOWN_CLASS_NAMES;
    const i = this.devClassOverride === null ? -1 : names.indexOf(this.devClassOverride);
    this.devClassOverride = i + 1 >= names.length ? null : names[i + 1];
    this.announcePlayerClass();
    this.showBanner(`DEV class override: ${this.devClassOverride ?? 'none (real class)'}`, 1600);
  }

  /** DEV: toggle the light aim-assist on/off (Piece 2) for isolating the feel. */
  private devToggleAimAssist(): void {
    this.aimAssistEnabled = !this.aimAssistEnabled;
    this.showBanner(`Aim-Assist: ${this.aimAssistEnabled ? 'ON' : 'OFF'}`, 1200);
  }

  /** DEV: cycle the aim-assist cone width (Piece 2 forgiveness dial) for tuning. */
  private devCycleAimCone(): void {
    const presets = [8, 18, 30, 45]; // degrees
    const cur = Math.round((this.aimAssistCone * 180) / Math.PI);
    const idx = presets.findIndex((p) => p >= cur);
    const next = presets[(idx + 1) % presets.length];
    this.aimAssistCone = (next * Math.PI) / 180;
    this.aimAssistEnabled = true;
    this.showBanner(`Aim Cone: ${next}°`, 1200);
  }

  /** The live melee damage (level-derived × skill multiplier from passives + buffs/forms
   *  × the Savage frenzy momentum while armed). */
  private playerDamage(): number {
    return Math.round(this.progression.effectiveDamage * this.skillDamageMult * this.osteoDamageMult * this.frenzyMult());
  }

  /** Level-derived max HP adjusted by skill passive/timed maxHP mods. */
  private skillAdjustedMaxHP(): number {
    const m = this.combinedSkillMods();
    const base = this.progression.effectiveMaxHP;
    return Math.round(base * (1 + (m.maxHPMult ?? 0)) + (m.flatMaxHP ?? 0));
  }

  /** Aggregate of passive mods (from unlocks) + every live timed buff/form. */
  private combinedSkillMods(): SkillStatMods {
    return combineMods([this.skills.passiveMods(), ...this.skillTimed.map((t) => t.stats)]);
  }

  /**
   * Recompute + APPLY all skill effects to the live player: max HP, damage mult,
   * move speed, damage reduction, and the transformation tint. Called on unlock,
   * on a timed buff/form starting or ending, on load, and on dev grant/reset.
   */
  private recomputeSkillEffects(): void {
    const m = this.combinedSkillMods();
    // Max HP (keep current HP, clamped) — the bar's max visibly rises with +HP skills.
    const newMax = this.skillAdjustedMaxHP();
    if (this.playerHealth && this.playerHealth.max !== newMax) this.playerHealth.setMax(newMax);
    // Damage multiplier (read by playerDamage()).
    this.skillDamageMult = 1 + (m.damageMult ?? 0);
    // Move speed: the class base multiplier (Wizard is slightly faster) × skill bonuses.
    if (this.player) this.player.speedMultiplier = this.progression.profile.moveSpeedMult * (1 + (m.moveSpeedMult ?? 0));
    // Damage reduction (capped so the player can always be hurt a little). A NEGATIVE
    // damageReduction (Crazed's berserk tradeoff) raises it above 1 → takes MORE damage.
    // This is the BASE; per-frame enemy-WEAKEN (Intimidate/Dominance/Pyrite) stacks on
    // top in updateControlEffects → playerHealth.incomingMultiplier.
    // Iron Will / Iron Pyrite (CC-immune) also add a flat damage-reduction here.
    let dr = m.damageReduction ?? 0;
    if (this.isPlayerCcImmune()) dr += CONTROL_TUNING.ironWill.damageReduction;
    this.baseIncomingMult = Phaser.Math.Clamp(1 - dr, 0.1, 2);
    if (this.playerHealth) this.playerHealth.incomingMultiplier = this.baseIncomingMult;
    // SONIC ECHOES (Bard keyed passive): the ECHO extension is armed while unlocked.
    this.setEcho(this.skills.isUnlocked(SONIC_ECHOES_ID) ? BARD_SONIC_TUNING.echoes.pct : 0, BARD_SONIC_TUNING.echoes.delayMs);
    // WITCH DOCTOR doll upgrades (keyed passives): each hook is armed only while owned.
    this.voodooReflectDamage = this.skills.isUnlocked(SOULBOUND_HEX_ID) ? VOODOO_DOLL_TUNING.reflectDamage : 0;
    this.voodooStitch = this.skills.isUnlocked(SHADOW_STITCH_ID) ? { radius: VOODOO_DOLL_TUNING.stitchRadius, pct: VOODOO_DOLL_TUNING.stitchPct } : null;
    this.voodooAssault = this.skills.isUnlocked(SPIRIT_ASSAULT_ID)
      ? { damage: VOODOO_DOLL_TUNING.assault.damage, tickMs: VOODOO_DOLL_TUNING.assault.tickMs, nextAt: this.voodooAssault?.nextAt ?? 0 }
      : null;
    // SAMURAI keyed passives: the strike bleed + the parry upgrade, armed while owned.
    // POISONED EDGE (Assassin) rides the same strike-DoT hook (one class per save —
    // whichever venom/bleed is owned arms it; neither owned = null).
    this.strikeBleed = this.skills.isUnlocked(RAZORS_EDGE_ID)
      ? { ...SAM_BLADE_TUNING.razor }
      : this.skills.isUnlocked(POISONED_EDGE_ID)
        ? { ...ASN_SHADOW_TUNING.poisoned }
        : null;
    this.parryRiposteBonus = this.skills.isUnlocked(COUNTERSTRIKE_ID) ? SAM_STANCE_TUNING.counter.riposteBonus : 0;
    this.parryRefundEnergy = this.skills.isUnlocked(COUNTERSTRIKE_ID) ? SAM_STANCE_TUNING.counter.energyRefund : 0;
    // ASSASSIN keyed passive: Trap Mastery's +1 armed-device cap (its faster
    // arming + stronger payloads fold in where a device is placed).
    this.trapCap = ASN_TRAP_TUNING.baseCap + (this.skills.isUnlocked(TRAP_MASTERY_ID) ? ASN_TRAP_TUNING.mastery.capBonus : 0);
    // SAVAGE keyed passive: Warrior's Momentum arms the frenzy stacks (already-
    // armed frenzy keeps its live stacks through a recompute).
    if (this.skills.isUnlocked(WARRIORS_MOMENTUM_ID)) {
      if (!this.frenzy) this.armFrenzy(SAV_EDGE_TUNING.momentum.perStackMult, SAV_EDGE_TUNING.momentum.maxStacks, SAV_EDGE_TUNING.momentum.decayMs);
    } else if (this.frenzy) {
      this.disarmFrenzy();
    }
    // SAVAGE keyed passive: Blood Scent — bleeding targets take ×(1+bonus).
    this.bloodScentBonus = this.skills.isUnlocked(BLOOD_SCENT_ID) ? SAV_JAGUAR_TUNING.scent.bonusVsBleeding : 0;
    // Block chance + strength (Double Block / Dual Shield) — rolled per hit in Health.
    if (this.playerHealth) {
      this.playerHealth.blockChance = Phaser.Math.Clamp(m.blockChance ?? 0, 0, 0.9);
      this.playerHealth.blockReduction = Phaser.Math.Clamp(m.blockReduction ?? 0, 0, 1);
      this.playerHealth.onBlock = () => this.spawnBlockFlash();
    }
    // Transformation tint: the last active form wins; else clear (unless mid red hit-flash).
    const form = this.skillTimed.find((t) => t.tint !== undefined);
    if (this.player) {
      if (form) this.player.sprite.setTint(form.tint!).setTintMode(Phaser.TintModes.MULTIPLY);
      else this.player.sprite.clearTint();
      // MARROWNAUT (Necromancer): the bone-suit is a far LARGER form — scale the avatar
      // up while it's active, revert otherwise (the only form with a size change).
      const marrownaut = this.skillTimed.some((t) => t.id === MARROWNAUT_ID);
      this.player.sprite.setScale(marrownaut ? MARROW_TUNING.marrownaut.scale : 1);
    }
    // Refresh the loadout bar: the 6 equipped skills + their labels.
    this.refreshLoadoutBar();
    // (The HP bar reflects the new max next frame via updateCombatHud.)
  }

  /** Push the current loadout (equipped ids + labels) onto the on-screen bar. */
  private refreshLoadoutBar(): void {
    if (!this.skillBar) return;
    const ids = this.skills.loadout();
    const labels = ids.map((id) => {
      if (!id) return null;
      const def = classSkills(this.skills.activeClass).skills.find((s) => s.id === id);
      return def ? this.skillButtonLabel(def) : null;
    });
    this.skillBar.setLoadout(ids, labels);
  }

  /** Activate an unlocked skill button: dispatch by its effect kind (respecting cooldown + energy). */
  private activateSkill(id: string): void {
    if (this.playerDead || this.dialogue.isOpen() || this.choice.isOpen()) return;
    const def = classSkills(this.skills.activeClass).skills.find((s) => s.id === id);
    if (!def || !this.skills.isUnlocked(id)) return;
    const e = def.effect;
    if (e.kind === 'passive') return;
    // CHANNEL INTERRUPT: pressing ANY skill cancels an active channel first (→ its cooldown).
    // Tapping the channel's OWN button again just stops it (a clean toggle), no restart.
    if (this.channel) {
      const wasSame = this.channel.skillId === id;
      this.endChannel(true);
      if (wasSame) return;
    }
    // TOGGLE transformation (Encapsulation): casting again while the form is ACTIVE
    // always EXITS — never cooldown-gated and free — while the ENTRY cooldown keeps
    // running, so exit-and-instantly-re-enter flicker stays impossible.
    if (e.kind === 'transformation' && e.toggle && this.skillTimed.some((t) => t.id === id)) {
      this.skillTimed = this.skillTimed.filter((t) => t.id !== id);
      this.recomputeSkillEffects();
      this.showBanner(`${this.skillButtonLabel(def)} released`, 1100);
      return;
    }
    if (this.time.now < (this.skillCooldownUntil[id] ?? 0)) return; // on cooldown
    const energyCost = 'energyCost' in e ? e.energyCost ?? 0 : 0;
    if (energyCost > 0 && this.energy.current < energyCost) return; // not enough energy
    // CHANNEL: defer the cooldown to channel END, and only start if a target is in range
    // (so a whiffed tap costs nothing). Handles its own energy spend.
    if (e.kind === 'channel') {
      this.tryStartChannel(id, e);
      return;
    }
    // Commit: spend energy + start the cooldown, then fire the effect.
    if (energyCost > 0) {
      this.energy.damage(energyCost);
      this.lastEnergySpendTime = this.time.now;
    }
    // Attack-speed (Crazed / Prism) shortens cooldowns: effCd = baseCd / (1 + atkSpeed).
    const atkSpeed = this.combinedSkillMods().attackSpeedMult ?? 0;
    const effCd = e.cooldownMs / (1 + Math.max(0, atkSpeed));
    this.skillCooldownUntil[id] = this.time.now + effCd;
    this.skillCooldownDur[id] = effCd;

    if (e.kind === 'active') {
      // ALLY RULE (Monk framework): a bespoke action that whiffed for lack of a
      // valid target flags actionWhiffed — refund the cooldown + energy so a
      // graceful "no ally" costs nothing.
      this.actionWhiffed = false;
      this.runActiveSkill(e.action);
      if (this.actionWhiffed) {
        this.actionWhiffed = false;
        this.skillCooldownUntil[id] = 0;
        if (energyCost > 0) this.energy.heal(energyCost);
      }
    } else if (e.kind === 'buff' || e.kind === 'transformation') {
      const aura = e.kind === 'transformation' ? { auraDamage: e.auraDamage, auraRadius: e.auraRadius } : {};
      // STANCE EXCLUSIVITY (Samurai framework): entering a toggled form EXITS any
      // other active toggle sharing its stanceGroup — one stance at a time.
      if (e.kind === 'transformation' && e.toggle && e.stanceGroup) {
        const defs = classSkills(this.skills.activeClass).skills;
        this.skillTimed = this.skillTimed.filter((t) => {
          if (t.id === id) return true;
          const other = defs.find((d) => d.id === t.id)?.effect;
          return !(other && other.kind === 'transformation' && other.toggle && other.stanceGroup === e.stanceGroup);
        });
      }
      // TOGGLE forms run WITHOUT a timer (Infinity never expires; the exit cast above ends them).
      const duration = e.kind === 'transformation' && e.toggle ? Number.POSITIVE_INFINITY : e.durationMs;
      this.startTimedSkill(id, duration, e.stats, e.tint, aura);
      this.showBanner(`${this.skillButtonLabel(def)} active!`, 1400);
    } else if (e.kind === 'debuff') {
      this.runDebuffSkill(e.radius);
    } else if (e.kind === 'stacking_dot') {
      // STACKING DoT: add one stack to the nearest enemy in range (re-cast to stack).
      const target = this.nearestEnemy(this.player.x, this.player.y, e.range);
      if (target) {
        this.addStackingDot(target, id, this.skillDamage(e.dmgPerTick), e.tickMs, e.durationMs, e.maxStacks, e.color ?? 0x9a6cff);
      } else {
        this.showBanner('No target in range', 800);
      }
    }
  }

  /** ACTIVE handler — dispatched by action id. New actives add a case (data picks the id). */
  /** action id → its composed steps, across every class (built once; collisions
   *  are a data bug and fail loudly). */
  private composedByAction?: Map<ActiveActionId, ComposedStep[]>;
  /** The primitives the LAST composed run executed (runtime-gate observable). */
  lastComposedPrimitives: string[] = [];

  private composedFor(action: ActiveActionId): ComposedStep[] | undefined {
    if (!this.composedByAction) {
      this.composedByAction = new Map();
      for (const cls of Object.keys(CLASS_SKILLS) as ClassId[]) {
        for (const def of classSkills(cls).skills) {
          const e = def.effect;
          if (e.kind !== 'active' || !e.compose) continue;
          const prev = this.composedByAction.get(e.action);
          if (prev && prev !== e.compose) throw new Error(`Composed action '${e.action}' defined twice with different steps`);
          this.composedByAction.set(e.action, e.compose);
        }
      }
    }
    return this.composedByAction.get(action);
  }

  private runActiveSkill(action: ActiveActionId): void {
    // COMPOSED ACTIONS first: skills declared as data run through the generic
    // executor; only bespoke mechanics remain as cases below.
    const steps = this.composedFor(action);
    if (steps) {
      this.runComposedSteps(steps);
      return;
    }
    const px = this.player.x;
    const py = this.player.y;
    this.lastCombatTime = this.time.now;
    if (action === 'forge_strike') {
      // A heavy shockwave: a ring FX + a strong AoE hit around the player.
      const r = 150;
      this.spawnSkillRing(px, py, r, 0xff8a3a);
      this.aoeHitAll(px, py, r, this.playerDamage() * 2);
    } else if (action === 'plow') {
      this.startPlow(); // tanky forward charge that shoves + damages the path (Tank #8)
    } else if (action === 'basic_strike') {
      this.doBasicStrike(); // the folded-in default attack (equippable basic)
    } else if (action === 'dodge') {
      this.doDodge(); // the folded-in default dodge/lunge (equippable basic)
    } else if (action === 'control_charge') {
      this.startCharge(); // Control #1 — forward rush + knockdown along the path
    } else if (action === 'execute') {
      // Control #8 — finisher: enemies below the HP threshold take massive bonus damage.
      const c = CONTROL_TUNING.execute;
      const fx = px + this.player.facingX * c.range * 0.6;
      const fy = py + this.player.facingY * c.range * 0.6;
      this.spawnSkillRing(fx, fy, c.range, 0xff5050);
      const low = this.combatEnemiesInRange(fx, fy, c.range).some((e) => e.health.ratio < c.thresholdPct);
      this.aoeHitAll(fx, fy, c.range, this.skillDamage(low ? c.damage * c.executeMult : c.damage));
    } else if (action === 'wiz_flicker') {
      // Wizard #2 — multi-projectile spread of fast bolts.
      const c = WIZARD_FIREWIND_TUNING.flicker;
      const { dx, dy } = this.facingUnit();
      const baseAng = Math.atan2(dy, dx);
      const spread = (c.spreadDeg * Math.PI) / 180;
      const dmg = this.skillDamage(c.damageEach);
      for (let i = 0; i < c.boltCount; i++) {
        const t = c.boltCount > 1 ? i / (c.boltCount - 1) - 0.5 : 0; // -0.5..0.5 across the fan
        const ang = baseAng + t * spread;
        this.spawnWizardBolt(Math.cos(ang), Math.sin(ang), dmg, c.speed, c.range, c.radius, 0xffb24a, this.stormSplash(dmg));
      }
      this.notifyBossesPlayerAction('ranged');
    } else if (action === 'wiz_gust') {
      this.startGust(); // Wizard #5 — wind-dash + path damage (reuses the dash movement)
    } else if (action === 'summon_ice_golem') {
      this.summonIceGolem(); // allied tank/blocker summon (draws aggro, no attack)
    } else if (action === 'summon_skeleton') {
      this.summonSkeleton(); // Summons #1 — attacking skeleton (entry/starter)
    } else if (action === 'summon_dark_matter') {
      this.summonDarkMatterMonster(); // Summons #2 — Dark Matter Monster (tank + attacker)
    } else if (action === 'buff_summons') {
      this.buffSummons(); // dev-only pet buff (damage + toughness)
    } else if (action === 'necro_dark_matter_burst') {
      this.summonDarkMatterBurst(); // Summons #5 — timed +summon-damage
    } else if (action === 'necro_army') {
      this.summonArmyOfTheDead(); // Summons #10 capstone — swarm + empower
    } else if (action === 'necro_dm_singularity') {
      this.castSingularity(); // Dark Matter #10 capstone — pull + heavy AoE over time
    } else if (action === 'eth_blink') {
      this.doBlink(); // Ethereal #5 — instant teleport forward (the escape)
    } else if (action === 'necro_wrecking_ball') {
      // Marrow #9 — charge into a crowd: damage + KNOCKDOWN along the path (reuses Charge).
      this.startCharge(MARROW_TUNING.wreckingBall);
    } else if (action === 'dru_bear_might') {
      // Druid Tapestry #4 — a crushing swipe + the bear's lingering strength (timed +damage).
      const c = TAPESTRY_TUNING.bearMight;
      this.runComposedSteps([{ p: 'strike', at: 'self', radius: c.radius, damage: c.damage, tint: c.tint }]);
      this.startTimedSkill(BEAR_MIGHT_ID, c.buffMs, { damageMult: c.buffDamageMult }, c.tint);
    } else if (action === 'dru_elephant') {
      // Druid Tapestry #10 — a thunderous wide sweep + thick hide (timed +defense).
      const c = TAPESTRY_TUNING.elephant;
      this.runComposedSteps([{ p: 'strike', at: 'self', radius: c.radius, damage: c.damage, tint: 0xc8c8d8 }]);
      this.startTimedSkill(ELEPHANT_RAGE_ID, c.buffMs, { damageReduction: c.buffDamageReduction }, c.tint);
    } else if (action === 'dru_falcon') {
      // Druid Tapestry #5 — falcon dive: damage + KNOCKDOWN along the path (reuses Charge).
      this.breakPlayerStealth(); // it's an attack
      this.startCharge(TAPESTRY_TUNING.falcon);
    } else if (action === 'dru_clay') {
      // Druid Restoration #4 — a heal + a short hardening (timed +defense).
      const c = RESTORATION_TUNING.clay;
      this.runComposedSteps([{ p: 'heal', amount: c.heal }]);
      this.startTimedSkill(CLAY_ID, c.buffMs, { damageReduction: c.damageReduction }, c.tint);
    } else if (action === 'dru_oil_immunity') {
      // Druid Restoration #9 — 5-minute ally resistance: self (timed DR) + summons (pet buff).
      const c = RESTORATION_TUNING.oilImmunity;
      this.startTimedSkill(OIL_IMMUNITY_ID, c.durationMs, { damageReduction: c.selfDamageReduction }, c.tint);
      this.summons.addBuff({ id: 'dru_oil_immunity', drBonus: c.summonDrBonus, durationMs: c.durationMs }, this.time.now);
      this.showBanner('Oil of Immunity', 1200);
    } else if (action === 'dru_oil_vitality') {
      // Druid Restoration #10 — 5-minute ally vitality: self (timed +maxHP) + summons (pet buff).
      const c = RESTORATION_TUNING.oilVitality;
      this.startTimedSkill(OIL_VITALITY_ID, c.durationMs, { maxHPMult: c.selfMaxHPMult }, c.tint);
      this.summons.addBuff({ id: 'dru_oil_vitality', hpBonus: c.summonHpBonus, durationMs: c.durationMs }, this.time.now);
      this.showBanner('Oil of Vitality', 1200);
    } else if (action === 'dru_viper') {
      this.summonAlliedUnits(VIPER_CONFIG, 1, VIPER_TUNING.maxConcurrent); // Wild Kin #2 — poison attacker
      this.showBanner('Viper summoned', 1000);
    } else if (action === 'dru_wolverine') {
      this.summonAlliedUnits(WOLVERINE_CONFIG, 1, WOLVERINE_TUNING.maxConcurrent); // Wild Kin #4 — bleed attacker
      this.showBanner('Wolverine summoned', 1000);
    } else if (action === 'dru_chimp_pair') {
      // Wild Kin #6 — the PAIR summon: two bonded melee units from one cast.
      this.summonAlliedUnits(CHIMPANZEE_CONFIG, CHIMPANZEE_TUNING.pairCount, CHIMPANZEE_TUNING.maxConcurrent);
      this.showBanner('Chimpanzee pair summoned', 1200);
    } else if (action === 'dru_scavengers') {
      // Wild Kin #8 — UNTARGETABLE timed chip units (drawsAggro=false + 30s override).
      this.summonAlliedUnits(SCAVENGER_CONFIG, SCAVENGER_TUNING.count, SCAVENGER_TUNING.maxConcurrent, SCAVENGER_TUNING.durationMs);
      this.showBanner('Scavengers released', 1200);
    } else if (action === 'dru_polar_bear') {
      this.summonAlliedUnits(POLAR_BEAR_CONFIG, 1, POLAR_BEAR_TUNING.maxConcurrent); // Wild Kin #9 — the taunt tank
      this.showBanner('Polar Bear summoned', 1200);
    } else if (action === 'mage_contraction') {
      // Mage Spacetime #2 — condense space: drag enemies inward, then crush them.
      const c = SPACETIME_TUNING.contraction;
      this.spawnSkillRing(px, py, c.radius, 0x9ad0ff);
      this.pullEnemiesInRange(px, py, c.radius, c.pull);
      this.aoeHitAll(px, py, c.radius, this.skillDamage(c.damage));
    } else if (action === 'mage_graviton') {
      // Mage Spacetime #6 — a gravity well ahead: pull + STUN + minor damage.
      const c = SPACETIME_TUNING.gravitonSurge;
      const { dx, dy } = this.facingUnit();
      const gx = px + dx * c.placeAhead;
      const gy = py + dy * c.placeAhead;
      this.spawnSkillRing(gx, gy, c.radius, 0x8a5cff);
      this.pullEnemiesInRange(gx, gy, c.radius, c.pull);
      this.stunEnemiesInRange(gx, gy, c.radius, c.stunMs);
      this.aoeHitAll(gx, gy, c.radius, this.skillDamage(c.damage));
    } else if (action === 'mage_singularity') {
      this.castSingularity(SPACETIME_TUNING.singularityCollapse); // Spacetime #10 ultimate — the shared machinery
    } else if (action === 'mage_arcane_blast') {
      // Mage Arcane #2 — a fanned burst of arcane bolts (the Flicker pattern, own numbers).
      const c = ARCANE_TUNING.arcaneBlast;
      const { dx, dy } = this.facingUnit();
      const baseAng = Math.atan2(dy, dx);
      const spread = (c.spreadDeg * Math.PI) / 180;
      const dmg = this.skillDamage(c.damageEach);
      for (let i = 0; i < c.boltCount; i++) {
        const t = c.boltCount > 1 ? i / (c.boltCount - 1) - 0.5 : 0;
        const ang = baseAng + t * spread;
        this.projectiles.spawn({ x: px + Math.cos(ang) * 18, y: py + Math.sin(ang) * 18, dirX: Math.cos(ang), dirY: Math.sin(ang), speed: c.speed, damage: dmg, maxRange: c.range, faction: 'player', color: 0xc09aff, radius: c.radius });
      }
      this.notifyBossesPlayerAction('ranged');
    } else if (action === 'mage_leech') {
      // Mage Arcane #6 — siphon essence from nearby foes, release ONE empowered bolt.
      const c = ARCANE_TUNING.leechShot;
      const drained = Math.min(c.maxEnemies, this.combatEnemiesInRange(px, py, c.radius).length);
      if (drained > 0) {
        this.energy.heal(drained * c.energyPerEnemy);
        this.spawnSkillRing(px, py, c.radius, 0xc09aff);
        this.spawnDamageNumber(px, py - 30, drained * c.energyPerEnemy, '#9ad8ff');
      }
      const { dx, dy } = this.facingUnit();
      this.projectiles.spawn({ x: px + dx * 18, y: py + dy * 18, dirX: dx, dirY: dy, speed: c.speed, damage: this.skillDamage(c.boltDamage + drained * c.bonusPerEnemy), maxRange: c.range, faction: 'player', color: 0xd0b0ff, radius: c.boltRadius });
      this.notifyBossesPlayerAction('ranged');
    } else if (action === 'mage_mana_surge') {
      // Mage Arcane #8 — burst-restore essence.
      this.energy.heal(ARCANE_TUNING.manaSurge.restore);
      this.spawnSkillRing(px, py, 70, 0x9ad8ff);
      this.showBanner('Mana Surge', 1000);
    } else if (action === 'mage_black_hole') {
      this.castSingularity(ARCANE_TUNING.blackHole); // Arcane #9 — the shared pull machinery, smaller scale
    } else if (action === 'mage_entangle') {
      // Mage Arcane #10 ultimate — the entangled-chains extension.
      const c = ARCANE_TUNING.entangledChains;
      const bound = this.entangleNearby(px, py, c.radius, c.count, c.sharePct, c.durationMs);
      this.showBanner(bound >= 2 ? `Entangled ${bound} foes` : 'No group to entangle', 1200);
    } else if (action === 'mage_shatter') {
      // Mage Crystalblade #8 — detonate ALL banked crystallize stacks nearby.
      const c = CRYSTALBLADE_TUNING.crystalShatter;
      const res = this.shatterCrystallize(px, py, c.radius, this.skillDamage(c.damagePerStack));
      if (res.stacks === 0) this.showBanner('No crystal to shatter', 900);
    } else if (action === 'bard_stage_dive') {
      // Bard Battle #6 — leap into the crowd: damage + KNOCKDOWN along the path (Charge).
      this.startCharge(BARD_BATTLE_TUNING.stageDive);
    } else if (action === 'bard_amplify') {
      // Bard Battle #7 — arm the next N strikes with a resonant splash.
      this.harmonicCharges = BARD_BATTLE_TUNING.amplify.charges;
      this.spawnSkillRing(px, py, 70, 0xffd0b0);
      this.showBanner('Harmonics amplified', 1100);
    } else if (action === 'bard_coda') {
      // Bard Battle #9 — the conditional finisher: ×bonus vs stunned/slowed targets.
      const c = BARD_BATTLE_TUNING.coda;
      this.finisherHitAll(px, py, c.radius, this.skillDamage(c.damage), c.bonusMult);
    } else if (action === 'bard_war_song') {
      // Bard Battle #10 ultimate — the combo state: auto-chained strikes + momentum.
      const c = BARD_BATTLE_TUNING.warSong;
      this.startComboUltimate('bard_bt_war_song', {
        durationMs: c.durationMs, intervalMs: c.intervalMs, range: c.range, damage: c.damage,
        jumps: c.jumps, jumpRange: c.jumpRange, falloff: c.falloff, tint: c.tint,
        stats: { damageReduction: c.damageReduction, moveSpeedMult: c.moveSpeedMult },
      });
      this.showBanner('WAR SONG', 1400);
    } else if (action === 'bard_surge') {
      // Bard Sonic #5 — dash forward leaving a vibrating trail (charge + Lava-lite patches).
      const c = BARD_SONIC_TUNING.surge;
      const { dx, dy } = this.facingUnit();
      this.startCharge({ distance: c.distance, damage: c.damage, knockdownMs: c.knockdownMs });
      for (const d of [c.distance * 0.25, c.distance * 0.55, c.distance * 0.85]) {
        this.spawnSpellHazard(px + dx * d, py + dy * d, c.trailRadius, this.skillDamage(c.trailTickDamage), c.trailDurationMs, c.trailTickMs, { fill: 0x4a5a9f, stroke: 0xb8d8ff });
      }
    } else if (action === 'bard_distortion') {
      // Bard Sonic #7 — the CONFUSION extension: an enemy turns on its own.
      const c = BARD_SONIC_TUNING.distortion;
      const turned = this.confuseNearestEnemy(px, py, c.range, c.chance, c.durationMs, c.chipDamage, c.chipMs);
      this.showBanner(turned ? 'The song turns them' : 'The note slips past', 1100);
    } else if (action === 'bard_wall') {
      // Bard Sonic #8 — a WALL of three hazard cells laid ACROSS the facing line.
      const c = BARD_SONIC_TUNING.wall;
      const { dx, dy } = this.facingUnit();
      const cxx = px + dx * c.placeAhead;
      const cyy = py + dy * c.placeAhead;
      for (const side of [-1, 0, 1]) {
        this.spawnSpellHazard(cxx - dy * side * c.cellSpacing, cyy + dx * side * c.cellSpacing, c.cellRadius, this.skillDamage(c.tickDamage), c.durationMs, c.tickMs, { slowFactor: c.slowFactor, fill: 0x4a5a9f, stroke: 0xb8d8ff });
      }
    } else if (action === 'wd_doll') {
      // Witch Doctor Voodoo #1 — the bind + doll (the framework centerpiece).
      const c = VOODOO_DOLL_TUNING;
      this.castVoodooDoll(c.castRange, this.skillDamage(c.castDamage), c.bindDurationMs, c.mirrorPct);
    } else if (action === 'wd_decoy') {
      // Witch Doctor Voodoo #2 — the spectral duplicate (magnet decoy).
      this.spawnSpiritDecoy();
    } else if (action === 'wd_cursed_vision') {
      // Witch Doctor Voodoo #3 — the confusion reuse: distorted visions.
      const c = WD_VOODOO_TUNING.vision;
      const turned = this.confuseNearestEnemy(px, py, c.range, c.chance, c.durationMs, c.chipDamage, c.chipMs);
      this.showBanner(turned ? 'The visions take hold' : 'The vision slips away', 1100);
    } else if (action === 'wd_echoes') {
      // Witch Doctor Voodoo #7 — brief mini-decoy illusions.
      const c = WD_VOODOO_TUNING.echoes;
      this.summonAlliedUnits(MINI_DECOY_CONFIG, c.count, c.count, c.durationMs);
      this.showBanner('Echoes scatter', 1100);
    } else if (action === 'wd_spirit_split') {
      // Witch Doctor Voodoo #10 ultimate — decoy walks + the doll auto-mirrors.
      const c = WD_VOODOO_TUNING.split;
      this.startSpiritSplit(c.durationMs, c.intervalMs, this.skillDamage(c.pulseDamage));
    } else if (action === 'wd_brew') {
      // Witch Doctor Decay #6 — the confusion reuse: the mind decays first.
      // (decayDomain 'mental': the cast ring carries the shipped MENTAL blue.)
      const c = WD_DECAY_TUNING.brew;
      this.spawnSkillRing(px, py, 60, DOMAIN_TINT.mental);
      const turned = this.confuseNearestEnemy(px, py, c.range, c.chance, c.durationMs, c.chipDamage, c.chipMs);
      this.showBanner(turned ? 'The brew takes hold' : 'It shakes off the fumes', 1100);
    } else if (action === 'wd_nova') {
      // Witch Doctor Decay #10 ultimate — contagious total decay, TRI-TINTED
      // (decayDomain 'all': the three shipped domain colors, red/blue/violet).
      const c = WD_DECAY_TUNING.nova;
      WD_DECAY_TUNING.novaTints.forEach((tint, i) => this.spawnSkillRing(px, py, c.applyRadius - i * 34, tint));
      this.applyPlagueInRange(px, py, c.applyRadius, this.skillDamage(c.dotDamage), c.dotTickMs, c.dotDurationMs, c.spreadRadius, c.maxSpread);
    } else if (action === 'wd_blood_pact') {
      // Witch Doctor Spirits #5 — pay HP; summons mend + strike harder.
      const c = WD_SPIRIT_TUNING.bloodPact;
      if (this.playerHealth.current <= c.selfCost) {
        this.showBanner('Not enough blood to give', 1000);
        return;
      }
      this.playerHealth.current -= c.selfCost; // the sacrifice bypasses shields — it is willing
      this.spawnDamageNumber(px, py - 26, c.selfCost, '#ff7a7a');
      for (const s of this.summons.list) if (s.isAlive) s.health.heal(c.healAllies);
      this.summons.addBuff({ id: 'wd_blood_pact', damageBonus: c.damageBonus, durationMs: c.buffDurationMs }, this.time.now);
      this.spawnSkillRing(px, py, 90, 0xd85a5a);
      this.showBanner('The pact is sealed', 1200);
    } else if (action === 'wd_soul_bind') {
      // Witch Doctor Spirits #7 — the ALLY-BOND extension.
      const c = WD_SPIRIT_TUNING.soulBind;
      this.startAllyBond(c.sharePct, c.durationMs);
    } else if (action === 'wd_effigy') {
      // Witch Doctor Spirits #8 — a PLANTED magnet (the rooted decoy config).
      const { dx, dy } = this.facingUnit();
      const e = this.summons.summon(EFFIGY_CONFIG, px + dx * 60, py + dy * 60, EFFIGY_TUNING.maxConcurrent);
      this.spawnSkillRing(e.x, e.y, EFFIGY_TUNING.bodyRadius + 14, EFFIGY_CONFIG.tint);
      this.showBanner('The effigy stands', 1100);
      this.lastCombatTime = this.time.now;
    } else if (action === 'wd_revenant') {
      // Witch Doctor Spirits #10 ultimate — the mighty attacking guard.
      this.summonAlliedUnits(REVENANT_CONFIG, 1, REVENANT_TUNING.maxConcurrent);
      this.showBanner('THE REVENANT RISES', 1400);
    } else if (action === 'sam_iaijutsu') {
      // Samurai Blade #4 — the sheathe: arm the count-1 consume-buff.
      const c = SAM_BLADE_TUNING.iaijutsu;
      this.armIaijutsu(c.windowMs, c.mult, c.stunMs);
    } else if (action === 'sam_dragonfly') {
      // Samurai Blade #6 — dash THROUGH the target, cutting as you pass.
      const c = SAM_BLADE_TUNING.dragonfly;
      this.startCharge({ distance: c.distance, damage: c.damage, knockdownMs: c.knockdownMs });
    } else if (action === 'sam_challenge') {
      // Samurai Blade #8 — mark one foe: TAUNT focus + a damage window against it
      // (the mark's bonus rides the shipped Tainted damage-up window).
      const c = SAM_BLADE_TUNING.challenge;
      const mark = this.nearestEnemy(px, py, c.range);
      if (!mark) {
        this.showBanner('No one worth the duel', 900);
        return;
      }
      this.tauntEnemiesInRange(mark.x, mark.y, 40, c.tauntMs);
      this.darkVulnUntil = this.time.now + c.windowMs;
      this.darkVulnMult = 1 + c.damageMult;
      this.floatingText.show(mark.x, mark.y - 34, 'CHALLENGED', '#ffe9a8', { fontSize: 13, riseBy: 16, durationMs: 900, depth: 14 });
    } else if (action === 'sam_petal') {
      // Samurai Blade #9 — heavy overhead after a telegraph: the conditional
      // finisher (stunned/slowed targets take ×bonus) at the blade's fall.
      const c = SAM_BLADE_TUNING.petal;
      const { dx, dy } = this.facingUnit();
      const fx = px + dx * 60;
      const fy = py + dy * 60;
      this.bossTelegraph(fx, fy, c.radius, c.windUpMs);
      this.time.delayedCall(c.windUpMs, () => {
        if (this.playerDead) return;
        this.finisherHitAll(fx, fy, c.radius, this.skillDamage(c.damage), c.bonusMult, 0xffe9a8);
      });
    } else if (action === 'sam_thousand_cuts') {
      // Samurai Blade #10 ultimate — the combo-ultimate machinery on a faster beat.
      const c = SAM_BLADE_TUNING.thousand;
      this.startComboUltimate('sam_bl_thousand', {
        durationMs: c.durationMs, intervalMs: c.intervalMs, range: c.range, damage: c.damage,
        jumps: c.jumps, jumpRange: c.jumpRange, falloff: c.falloff, tint: c.tint,
        stats: { damageMult: c.damageMult },
      });
      this.showBanner('THOUSAND CUTS', 1400);
    } else if (action === 'sam_parry') {
      // Samurai Stances #5 — the timed negate-and-riposte window (extension #1a);
      // Counterstrike's bonus/refund are added inside the gate while owned.
      const c = SAM_STANCE_TUNING.parry;
      this.openParryWindow(c.windowMs, this.skillDamage(c.riposteDamage));
    } else if (action === 'sam_breath') {
      // Samurai Stances #6 — one long breath: Resolve + a little health.
      const c = SAM_STANCE_TUNING.breath;
      this.energy.heal(c.energy);
      this.playerHealth.heal(c.heal);
      this.spawnSkillRing(px, py, 60, 0xd8e8ff);
      this.showBanner('Breathe', 900);
    } else if (action === 'sam_perfect_form') {
      // Samurai Stances #10 ultimate — auto-parry everything while acting freely.
      const c = SAM_STANCE_TUNING.perfectForm;
      this.startPerfectForm(c.durationMs, this.skillDamage(c.riposteDamage));
      this.startTimedSkill('sam_st_perfect', c.durationMs, {}, c.tint);
    } else if (action === 'sam_running_draw') {
      // Samurai Bow #6 — the dash-and-fire composite (extension #4).
      const c = SAM_BOW_TUNING.runningDraw;
      this.dashAndFire(
        { distance: c.distance, damage: 0, knockdownMs: 0 },
        { p: 'bolt', damage: c.boltDamage, speed: c.boltSpeed, range: c.boltRange, radius: c.boltRadius, tint: 0xd8e8ff },
        c.fireDelayMs,
      );
    } else if (action === 'monk_deflect') {
      // Monk Iron Palm #5 — the parry window's MONK config (extension #1): melee
      // AND projectiles turned aside, projectiles riposted at the lighter mult.
      const c = MONK_PALM_TUNING.deflect;
      this.openParryWindow(c.windowMs, this.skillDamage(c.riposteDamage), { deflectProjectiles: true, projectileRiposteMult: c.projectileRiposteMult });
    } else if (action === 'monk_rising') {
      // Monk Iron Palm #7 — the dash-through rising strike (the charge machinery).
      const c = MONK_PALM_TUNING.rising;
      this.startCharge({ distance: c.distance, damage: this.skillDamage(c.damage), knockdownMs: c.knockdownMs });
    } else if (action === 'monk_empower') {
      // Monk Iron Palm #8 — the count-N consume-buff: next N strikes hit ×mult.
      const c = MONK_PALM_TUNING.empower;
      this.empoweredStrikes = { remaining: c.charges, mult: c.mult };
      this.spawnSkillRing(px, py, 50, 0xa8ffd0);
      this.showBanner('The fists fill with chi', 1100);
    } else if (action === 'monk_hundred') {
      // Monk Iron Palm #10 ultimate — the combo-ultimate machinery on a 280ms beat.
      const c = MONK_PALM_TUNING.hundred;
      this.startComboUltimate('monk_ip_hundred', {
        durationMs: c.durationMs, intervalMs: c.intervalMs, range: c.range, damage: c.damage,
        jumps: c.jumps, jumpRange: c.jumpRange, falloff: c.falloff, tint: c.tint,
        stats: { attackSpeedMult: c.attackSpeedMult },
      });
      this.showBanner('HUNDRED HANDS', 1400);
    } else if (action === 'monk_tranquil') {
      // Monk Chi #4 — one perfect stillness: a burst of Chi (energy) back.
      const c = MONK_CHI_TUNING.tranquil;
      this.energy.heal(c.energy);
      this.spawnSkillRing(px, py, 60, 0xa8ffd0);
      this.showBanner('The breath returns', 900);
    } else if (action === 'monk_acupuncture') {
      // Monk Chi #7 — mend + STRIP ONE harmful effect clinging to the player
      // (a hostile DoT stack first, then the slow, then either weaken).
      const c = MONK_CHI_TUNING.acupuncture;
      this.playerHealth.heal(c.heal);
      this.spawnSkillRing(px, py, 60, 0xa8ffd0);
      this.spawnDamageNumber(px, py - 30, c.heal, '#a8ffd0');
      const now = this.time.now;
      if (this.casterDotStacks.length > 0) this.casterDotStacks.pop();
      else if (now < this.casterSlowUntil) this.casterSlowUntil = 0;
      else if (now < this.casterWeakenUntil) this.casterWeakenUntil = 0;
      else if (now < this.poisonWeakenUntil) { this.poisonWeakenUntil = 0; this.poisonWeakenFactor = 0; }
      else { this.showBanner('Nothing to strip', 900); return; }
      this.showBanner('The needle finds the poison', 1100);
    } else if (action === 'monk_infusion') {
      // Monk Chi #8 — the HP-cost heal to a friendly (the ALLY RULE: a whiff
      // refunds the cooldown + energy via actionWhiffed).
      const c = MONK_CHI_TUNING.infusion;
      if (!this.transferHealToAlly(c.range, c.cost, c.heal)) this.actionWhiffed = true;
    } else if (action === 'monk_enigma') {
      // Monk Spirit #2 — the confusion reuse: it no longer knows what it sees.
      const c = MONK_SPIRIT_TUNING.enigma;
      const turned = this.confuseNearestEnemy(px, py, c.range, c.chance, c.durationMs, c.chipDamage, c.chipMs);
      this.showBanner(turned ? 'It turns on its own' : 'The presence slips past', 1100);
    } else if (action === 'monk_divine') {
      // Monk Spirit #3 — the ally-bond reuse, behind the ALLY RULE: with no live
      // companion the bond has nowhere to land — a graceful refunded whiff.
      const c = MONK_SPIRIT_TUNING.divine;
      if (this.summons.list.some((sm) => sm.isAlive)) {
        this.startAllyBond(c.sharePct, c.durationMs);
      } else {
        this.showBanner('No companion to bond with', 1000);
        this.actionWhiffed = true;
      }
    } else if (action === 'monk_astral') {
      // Monk Spirit #5 — the decoy reuse in the Monk's colors (magnet tank).
      this.summonAlliedUnits(ASTRAL_DECOY_CONFIG, 1, ASTRAL_DECOY_TUNING.maxConcurrent, ASTRAL_DECOY_TUNING.durationMs);
      this.showBanner('The spirit-self walks', 1100);
    } else if (action === 'monk_wheel') {
      // Monk Spirit #7 — the MOBILE pulse ring (extension #3): it turns WITH you.
      const c = MONK_SPIRIT_TUNING.wheel;
      this.startPulseRing(c.durationMs, c.intervalMs, c.radius, this.skillDamage(c.damage), c.tint);
      this.showBanner('The wheel turns', 1100);
    } else if (action === 'asn_blade_trap') {
      // Assassin Traps #1 — the spring-blade device: quick arm, a heavy snap.
      const c = ASN_TRAP_TUNING.blade;
      this.assassinPlaceTrap(c.placeAhead, { armDelayMs: c.armDelayMs, lifetimeMs: c.lifetimeMs, triggerRadius: c.triggerRadius, payload: { burstDamage: c.burstDamage, burstRadius: c.burstRadius }, tint: 0xffb060 });
    } else if (action === 'asn_snare_trap') {
      // Assassin Traps #2 — pure control: roots whoever springs it.
      const c = ASN_TRAP_TUNING.snare;
      this.assassinPlaceTrap(c.placeAhead, { armDelayMs: c.armDelayMs, lifetimeMs: c.lifetimeMs, triggerRadius: c.triggerRadius, payload: { rootMs: c.rootMs }, tint: 0xc8b060 });
    } else if (action === 'asn_toxic_trap') {
      // Assassin Traps #4 — bursts into a lingering poison cloud.
      const c = ASN_TRAP_TUNING.toxic;
      this.assassinPlaceTrap(c.placeAhead, { armDelayMs: c.armDelayMs, lifetimeMs: c.lifetimeMs, triggerRadius: c.triggerRadius, payload: { zone: { ...c.zone, fill: 0x3a5a2a, stroke: 0x9ad07a } }, tint: 0x9ad07a });
    } else if (action === 'asn_flash_trap') {
      // Assassin Traps #5 — the blinding burst: the sprung enemy turns confused.
      const c = ASN_TRAP_TUNING.flash;
      this.assassinPlaceTrap(c.placeAhead, { armDelayMs: c.armDelayMs, lifetimeMs: c.lifetimeMs, triggerRadius: c.triggerRadius, payload: { confuse: { chance: c.confuse.chance, durationMs: c.confuse.durationMs } }, tint: 0xffe9a8 });
    } else if (action === 'asn_explosive_trap') {
      // Assassin Traps #6 — the heavy charge: area damage on trigger.
      const c = ASN_TRAP_TUNING.explosive;
      this.assassinPlaceTrap(c.placeAhead, { armDelayMs: c.armDelayMs, lifetimeMs: c.lifetimeMs, triggerRadius: c.triggerRadius, payload: { burstDamage: c.burstDamage, burstRadius: c.burstRadius }, tint: 0xff8a3a });
    } else if (action === 'asn_frost_trap') {
      // Assassin Traps #7 — erupts into a slowing frost field.
      const c = ASN_TRAP_TUNING.frost;
      this.assassinPlaceTrap(c.placeAhead, { armDelayMs: c.armDelayMs, lifetimeMs: c.lifetimeMs, triggerRadius: c.triggerRadius, payload: { zone: { ...c.zone } }, tint: 0xb8d8ff });
    } else if (action === 'asn_remote_det') {
      // Assassin Traps #8 — the trigger-now hook; nothing armed = a refunded whiff.
      const fired = this.detonateArmedTraps();
      if (fired === 0) {
        this.showBanner('Nothing armed to fire', 1000);
        this.actionWhiffed = true;
      } else {
        this.showBanner(fired === 1 ? 'The device fires' : `${fired} devices fire`, 1100);
      }
    } else if (action === 'asn_minefield') {
      // Assassin Traps #10 ultimate — seed the area ahead with explosive devices.
      const c = ASN_TRAP_TUNING.minefield;
      const m = this.skills.isUnlocked(TRAP_MASTERY_ID);
      const t = ASN_TRAP_TUNING.mastery;
      const { dx, dy } = this.facingUnit();
      this.placeMinefield(px + dx * c.placeAhead, py + dy * c.placeAhead, c.count, c.spreadRadius, {
        armDelayMs: m ? c.armDelayMs * t.armFactor : c.armDelayMs,
        lifetimeMs: c.lifetimeMs,
        triggerRadius: c.triggerRadius,
        payload: { burstDamage: c.burstDamage, burstRadius: c.burstRadius },
        tint: 0xff8a3a,
        damageMult: m ? t.damageMult : 1,
      });
      this.showBanner('MINEFIELD', 1400);
    } else if (action === 'asn_ambush') {
      // Assassin Shadow #3 — the payoff strike that REQUIRES stealth (unhidden
      // it whiffs and the ally-rule machinery refunds the cast).
      const c = ASN_SHADOW_TUNING.ambush;
      if (this.playerStealthActive || this.time.now < this.shadowDanceUntil) {
        this.runComposedSteps([{ p: 'strike', at: 'front', range: c.range, damage: c.damage, tint: 0x9a9ab8 }]);
      } else {
        this.showBanner('Ambush needs the shadows', 1000);
        this.actionWhiffed = true;
      }
    } else if (action === 'asn_shadow_step') {
      // Assassin Shadow #5 — the Blink reuse aimed AT a target: reappear behind
      // it, blade first (no target = a refunded whiff).
      const c = ASN_SHADOW_TUNING.step;
      const target = this.nearestEnemy(px, py, c.seekRange);
      if (!target) {
        this.showBanner('No one to step to', 1000);
        this.actionWhiffed = true;
      } else {
        const ang = Math.atan2(target.y - py, target.x - px);
        const bx = target.x + Math.cos(ang) * c.behindGap;
        const by = target.y + Math.sin(ang) * c.behindGap;
        const w = this.activeMap().nearestWalkableWorld(bx, by) ?? { x: bx, y: by };
        (this.player.sprite.body as Phaser.Physics.Arcade.Body).reset(w.x, w.y);
        this.player.facingX = -Math.cos(ang); // land facing BACK at the target
        this.player.facingY = -Math.sin(ang);
        this.spawnSkillRing(w.x, w.y, 40, 0x9a9ab8);
        this.runComposedSteps([{ p: 'strike', at: 'front', range: c.strikeRange, damage: c.damage, tint: 0x9a9ab8 }]);
      }
    } else if (action === 'asn_smoke_bomb') {
      // Assassin Shadow #6 — the confusion + aggro-drop reuse: they lose you.
      const c = ASN_SHADOW_TUNING.smoke;
      this.spawnSkillRing(px, py, c.range * 0.6, 0x9a9ab8);
      const turned = this.confuseNearestEnemy(px, py, c.range, c.chance, c.confuseMs, c.chipDamage, c.chipMs);
      this.startPlayerStealth(c.dropMs); // the "lose you" breath — any attack ends it
      this.showBanner(turned ? 'Smoke — and they turn on each other' : 'Smoke fills the street', 1100);
    } else if (action === 'asn_takedown') {
      // Assassin Shadow #7 — the conditional finisher: execute the weakened.
      const c = ASN_SHADOW_TUNING.takedown;
      const { dx, dy } = this.facingUnit();
      this.finisherHitAll(px + dx * c.reach, py + dy * c.reach, c.radius, this.skillDamage(c.damage), c.bonusMult, 0x9a9ab8);
    } else if (action === 'asn_vanish') {
      // Assassin Shadow #8 — extension #4: the instant re-stealth + the breath.
      const c = ASN_SHADOW_TUNING.vanish;
      this.vanish(c.stealthMs, c.graceMs);
      this.showBanner('Gone', 900);
    } else if (action === 'asn_shadow_dance') {
      // Assassin Shadow #10 ultimate — extension #3: striking stays hidden.
      const c = ASN_SHADOW_TUNING.dance;
      this.startShadowDance(c.durationMs);
      this.showBanner('SHADOW DANCE', 1400);
    } else if (action === 'prs_shield_faith') {
      // Priest Light #2 — extension #1: the targeted ally-shield (self valid).
      const c = PRS_LIGHT_TUNING.shieldFaith;
      const f = this.priestShieldBoost();
      const who = this.allyShield(c.range, Math.round(c.amount * f.amount), c.durationMs * f.duration, c.immunityMs);
      this.showBanner(who === 'self' ? 'The light wraps you' : 'The light wraps your companion', 1100);
    } else if (action === 'prs_embrace') {
      // Priest Light #4 — the HP-COST AoE mend (the ALLY RULE: none near or
      // nothing to give = a refunded whiff).
      const c = PRS_LIGHT_TUNING.embrace;
      const near = this.summons.list.filter((sm) => sm.isAlive && Phaser.Math.Distance.Between(sm.x, sm.y, px, py) <= c.radius);
      if (near.length === 0) {
        this.showBanner('No companion near to mend', 1000);
        this.actionWhiffed = true;
      } else if (this.playerHealth.current <= c.cost) {
        this.showBanner('Not enough life to give', 1000);
        this.actionWhiffed = true;
      } else {
        this.playerHealth.current -= c.cost; // the gift is willing — it bypasses shields
        this.spawnDamageNumber(px, py - 26, c.cost, '#ff7a7a');
        this.spawnSkillRing(px, py, c.radius, 0xffe9a8);
        for (const sm of near) {
          sm.health.heal(c.heal);
          this.spawnDamageNumber(sm.x, sm.y - 22, c.heal, '#a8ffd0');
        }
        this.lastCombatTime = this.time.now;
      }
    } else if (action === 'prs_radiant') {
      // Priest Light #5 — the following mend + a little armor while it walks.
      const c = PRS_LIGHT_TUNING.radiant;
      this.runComposedSteps([{ p: 'friendzone', follow: true, radius: c.radius, healPerTick: c.healPerTick, tickMs: c.tickMs, durationMs: c.durationMs, tint: 0xffe9a8, banner: 'The radiance walks with you' }]);
      this.startTimedSkill('prs_li_radiant', c.durationMs, { damageReduction: c.damageReduction }, 0xffe9a8);
    } else if (action === 'prs_barrier') {
      // Priest Light #6 — the AoE shield: every friendly inside is wrapped.
      const c = PRS_LIGHT_TUNING.barrier;
      const f = this.priestShieldBoost();
      const amount = Math.round(c.amount * f.amount);
      const dur = c.durationMs * f.duration;
      this.playerHealth.shield = Math.max(this.playerHealth.shield, amount);
      this.shieldUntil = this.time.now + dur;
      for (const sm of this.summons.list) {
        if (sm.isAlive && Phaser.Math.Distance.Between(sm.x, sm.y, px, py) <= c.radius) this.shieldSummon(sm, amount, dur);
      }
      this.spawnSkillRing(px, py, c.radius, 0xffe9a8);
      this.showBanner('Celestial Barrier holds', 1200);
    } else if (action === 'prs_blessing') {
      // Priest Light #8 — the AoE ward: armor + an affliction-proof breath for
      // you; toughness for your companions (the summon-buff machinery).
      const c = PRS_LIGHT_TUNING.blessing;
      this.startTimedSkill('prs_li_blessing', c.durationMs, { damageReduction: c.damageReduction }, c.tint);
      this.harmImmuneUntil = this.time.now + c.immunityMs;
      this.summons.addBuff({ id: 'prs_blessing_ward', drBonus: c.summonDrBonus, durationMs: c.durationMs }, this.time.now);
      this.spawnSkillRing(px, py, 90, 0xffe9a8);
      this.showBanner("Guardian's Blessing", 1200);
    } else if (action === 'prs_intervene') {
      // Priest Light #9 — extension #3: the revive on the PARTY-DORMANT hook.
      // The price is only paid when someone is actually raised — today never.
      const c = PRS_LIGHT_TUNING.intervention;
      if (!this.reviveFallenAlly()) {
        this.showBanner('No fallen ally to raise', 1000);
        this.actionWhiffed = true;
      } else {
        this.playerHealth.current = Math.max(1, this.playerHealth.current - c.hpCost);
        this.spawnDamageNumber(px, py - 26, c.hpCost, '#ff7a7a');
      }
    } else if (action === 'prs_aegis') {
      // Priest Light #10 ultimate — shields over EVERYONE + reflecting light.
      const c = PRS_LIGHT_TUNING.aegis;
      const f = this.priestShieldBoost();
      const amount = Math.round(c.amount * f.amount);
      const dur = c.durationMs * f.duration;
      this.playerHealth.shield = Math.max(this.playerHealth.shield, amount);
      this.shieldUntil = this.time.now + dur;
      for (const sm of this.summons.list) if (sm.isAlive) this.shieldSummon(sm, amount, dur);
      this.startTimedSkill('prs_li_aegis', c.durationMs, { reflectPct: c.reflectPct }, c.tint);
      this.spawnSkillRing(px, py, 110, 0xffe9a8);
      this.showBanner('AEGIS OF DAWN', 1400);
    } else if (action === 'prs_word') {
      // Priest Rebuke #4 — one spoken sentence: AoE slow + weaken, no wound.
      const c = PRS_REBUKE_TUNING.word;
      this.spawnSkillRing(px, py, c.radius, 0xffd07a);
      this.slowEnemiesInRange(px, py, c.radius, c.slowMs, c.slowFactor);
      if (this.combatEnemiesInRange(px, py, c.radius).length > 0) this.setPoisonWeaken(c.weaken, c.weakenMs);
      this.showBanner('The Word is spoken', 1100);
      this.lastCombatTime = this.time.now;
    } else if (action === 'prs_zeal') {
      // Priest Rebuke #7 — the conditional finisher: full wrath for the faltering.
      const c = PRS_REBUKE_TUNING.zeal;
      const { dx, dy } = this.facingUnit();
      this.finisherHitAll(px + dx * c.reach, py + dy * c.reach, c.radius, this.skillDamage(c.damage), c.bonusMult, 0xffe9a8);
    } else if (action === 'prs_forgive') {
      // Priest Grace #3 — the cleanse-ALL: every affliction absolved at once.
      this.casterDotStacks = [];
      this.casterSlowUntil = 0;
      this.casterWeakenUntil = 0;
      this.player.slowFactor = 1;
      this.spawnSkillRing(px, py, 60, 0xffe9a8);
      this.showBanner('Absolved', 1000);
    } else if (action === 'prs_beacon') {
      // Priest Grace #5 — extension #2: the DUAL CHANNEL (mend + burn beam).
      const c = PRS_GRACE_TUNING.beacon;
      this.startDualChannel(c.durationMs, c.tickMs, c.healPerTick, this.skillDamage(c.dmgPerTick), c.length, c.width);
      this.showBanner('Beacon of Light', 1100);
    } else if (action === 'prs_renewal') {
      // Priest Grace #6 — the great HP-cost heal (the ALLY RULE refund on a whiff).
      const c = PRS_GRACE_TUNING.renewal;
      if (!this.transferHealToAlly(c.range, c.cost, c.heal)) this.actionWhiffed = true;
    } else if (action === 'prs_ascend') {
      // Priest Grace #9 — step beyond flesh: the untargetable breath + fast mending.
      const c = PRS_GRACE_TUNING.ascendance;
      this.vanish(c.durationMs, c.durationMs);
      this.startTimedSkill('prs_gr_ascend', c.durationMs, { regenPerSec: c.regenPerSec }, c.tint);
      this.showBanner('Ascendance', 1100);
    } else if (action === 'sav_jagged') {
      // Savage Obsidian #2 — the tearing strike whose wound keeps bleeding.
      const c = SAV_EDGE_TUNING.jagged;
      const { dx, dy } = this.facingUnit();
      this.runComposedSteps([{ p: 'strike', at: 'front', range: c.range, damage: c.damage, tint: 0xd04a3a }]);
      this.applyDotInRange(px + dx * c.range * 0.6, py + dy * c.range * 0.6, c.range, c.dot.dmgPerTick, c.dot.tickMs, c.dot.durationMs, 0xd04a3a);
    } else if (action === 'sav_leap') {
      // Savage Obsidian #4 — extension #2: the aimed jump + slam + knockdown.
      const c = SAV_EDGE_TUNING.leap;
      this.leapSlam(c.distance, c.radius, this.skillDamage(c.damage), c.stunMs);
    } else if (action === 'sav_roar') {
      // Savage Obsidian #7 — pure fear: everything near slows + strikes softer.
      const c = SAV_EDGE_TUNING.roar;
      this.spawnSkillRing(px, py, c.radius, 0xff8a5a);
      this.slowEnemiesInRange(px, py, c.radius, c.slowMs, c.slowFactor);
      if (this.combatEnemiesInRange(px, py, c.radius).length > 0) this.setPoisonWeaken(c.weaken, c.weakenMs);
      this.showBanner('The roar carries', 1100);
      this.lastCombatTime = this.time.now;
    } else if (action === 'sav_headtaker') {
      // Savage Obsidian #8 — extension #4: the low-health execute.
      const c = SAV_EDGE_TUNING.headtaker;
      const { dx, dy } = this.facingUnit();
      this.breakPlayerStealth();
      this.executeHitAll(px + dx * c.reach, py + dy * c.reach, c.radius, this.skillDamage(c.damage), c.threshold, c.mult);
    } else if (action === 'sav_slaughter') {
      // Savage Obsidian #10 ultimate — the combo-ultimate machinery, heavy beat.
      const c = SAV_EDGE_TUNING.slaughter;
      this.startComboUltimate('sav_ob_slaughter', {
        durationMs: c.durationMs, intervalMs: c.intervalMs, range: c.range, damage: c.damage,
        jumps: c.jumps, jumpRange: c.jumpRange, falloff: c.falloff, tint: c.tint,
        stats: { damageMult: c.damageMult },
      });
      this.showBanner('ENDLESS SLAUGHTER', 1400);
    } else if (action === 'sav_crimson') {
      // Savage Blood #3 — extension #3: the nova paid in blood (refusal whiffs).
      const c = SAV_BLOOD_TUNING.crimson;
      if (!this.payBloodPrice(c.bloodCost)) this.actionWhiffed = true;
      else this.runComposedSteps([{ p: 'strike', at: 'self', radius: c.radius, damage: c.damage, tint: 0xd04a3a }]);
    } else if (action === 'sav_sacrifice') {
      // Savage Blood #7 — extension #3: the great fury paid in blood.
      const c = SAV_BLOOD_TUNING.sacrifice;
      if (!this.payBloodPrice(c.bloodCost)) {
        this.actionWhiffed = true;
      } else {
        this.startTimedSkill('sav_br_sacrifice', c.durationMs, { damageMult: c.damageMult }, c.tint);
        this.showBanner('The altar accepts', 1200);
      }
    } else if (action === 'sav_hunger') {
      // Savage Blood #10 ultimate — the devouring nova: blood out, life back per bite.
      const c = SAV_BLOOD_TUNING.hunger;
      if (!this.payBloodPrice(c.bloodCost)) {
        this.actionWhiffed = true;
      } else {
        this.runComposedSteps([{ p: 'strike', at: 'self', radius: c.radius, damage: c.damage, tint: 0xd04a3a, healPerHit: c.healPerHit, maxHeals: c.maxHeals }]);
        this.showBanner("BLOOD GOD'S HUNGER", 1400);
      }
    } else if (action === 'sav_lunge') {
      // Savage Jaguar #1 — the pounce: damage + knockdown along the path.
      const c = SAV_JAGUAR_TUNING.lunge;
      this.breakPlayerStealth(); // it's an attack
      this.startCharge({ distance: c.distance, damage: this.skillDamage(c.damage), knockdownMs: c.knockdownMs });
    } else if (action === 'sav_snarl') {
      // Savage Jaguar #2 — the confusion reuse: prey turns on its own kind.
      const c = SAV_JAGUAR_TUNING.snarl;
      const turned = this.confuseNearestEnemy(px, py, c.range, c.chance, c.durationMs, c.chipDamage, c.chipMs);
      this.showBanner(turned ? 'It flees into its own' : 'The snarl goes unheard', 1100);
    }
  }

  /** DIVINE FORTRESS (Priest keyed passive): every Priest-granted shield holds
   *  ×strength and lasts ×duration while owned. */
  private priestShieldBoost(): { amount: number; duration: number } {
    const owned = this.skills.isUnlocked(PRS_FORTRESS_ID);
    return owned ? { amount: PRS_LIGHT_TUNING.fortress.strengthMult, duration: PRS_LIGHT_TUNING.fortress.durationMult } : { amount: 1, duration: 1 };
  }

  /** Place one Assassin device AHEAD of the player, folding TRAP MASTERY in
   *  while owned (faster arming + stronger payloads; the +1 cap lands at
   *  recompute). Every trap skill routes through here. */
  private assassinPlaceTrap(placeAhead: number, cfg: TrapConfig): void {
    const { dx, dy } = this.facingUnit();
    const m = this.skills.isUnlocked(TRAP_MASTERY_ID);
    const t = ASN_TRAP_TUNING.mastery;
    this.placeTrap(this.player.x + dx * placeAhead, this.player.y + dy * placeAhead, {
      ...cfg,
      armDelayMs: m ? cfg.armDelayMs * t.armFactor : cfg.armDelayMs,
      damageMult: m ? t.damageMult : 1,
    });
    this.lastCombatTime = this.time.now;
  }

  /** THE COMPOSED-ACTION EXECUTOR: runs a skill declared as data (steps of
   *  shared primitives + numbers) — behaviorally identical to the bespoke
   *  branches it replaced; every call maps 1:1 onto a proven helper. */
  runComposedSteps(steps: ComposedStep[]): void {
    this.lastCombatTime = this.time.now;
    this.lastComposedPrimitives = steps.map((s) => s.p);
    // ATTACKING BREAKS STEALTH: any offensive primitive ends it before running —
    // UNLESS Shadow Dance holds (the Assassin state where striking stays hidden).
    // The from-stealth flag is captured FIRST so stealth-bonus riders still read it.
    this.castFromStealth = this.playerStealthActive;
    if (steps.some((s) => OFFENSIVE_PRIMITIVES.has(s.p)) && this.time.now >= this.shadowDanceUntil) this.breakPlayerStealth();
    for (const s of steps) this.runComposedStep(s);
  }

  /** One composed step's damage number under the three scaling modes. */
  private composedDamage(s: { damage?: number; damageRaw?: number; damageMult?: number }): number {
    if (s.damageMult !== undefined) return this.playerDamage() * s.damageMult;
    if (s.damageRaw !== undefined) return s.damageRaw;
    if (s.damage !== undefined && s.damage > 0) return this.skillDamage(s.damage);
    return 0;
  }

  private runComposedStep(s: ComposedStep): void {
    const px = this.player.x;
    const py = this.player.y;
    if (s.p === 'strike') {
      const fire = (): void => {
        if (this.playerDead) return;
        const { dx, dy } = this.facingUnit();
        const cx = this.player.x;
        const cy = this.player.y;
        // Placement + hit radius per mode (front strikes hit within `range`).
        let x = cx;
        let y = cy;
        let radius = s.radius ?? s.range ?? 0;
        if (s.at === 'front') {
          const reach = s.reach ?? 0.6;
          x = cx + this.player.facingX * (s.range ?? 0) * reach;
          y = cy + this.player.facingY * (s.range ?? 0) * reach;
          radius = s.range ?? 0;
        } else if (s.at === 'ahead') {
          x = cx + dx * (s.range ?? 0);
          y = cy + dy * (s.range ?? 0);
        } else if (s.at === 'nearest') {
          const target = this.nearestEnemy(cx, cy, s.range ?? 0);
          if (!target) {
            if (s.missBanner) this.showBanner(s.missBanner, 800);
            return;
          }
          x = target.x;
          y = target.y;
        }
        // MELEE SWING FX (generic): a pooled crescent pivots at the caster toward the
        // strike direction — every strike-based skill inherits it, one arc PER PULSE.
        const swingAng = x === cx && y === cy ? Math.atan2(this.player.facingY, this.player.facingX) : Math.atan2(y - cy, x - cx);
        this.swingFx.show(cx, cy, Math.min(radius, 110), s.tint ?? 0xffe9a8, swingAng);
        if (!s.noRing && s.tint !== undefined) this.spawnSkillRing(x, y, radius, s.tint);
        // Soul-Siphon heals count enemies BEFORE the hit (the strike may kill).
        const preHits = s.healPerHit !== undefined ? Math.min(s.maxHeals ?? Infinity, this.combatEnemiesInRange(x, y, radius).length) : 0;
        let dmg = this.composedDamage(s);
        // IAIJUTSU (Samurai): the sheathed count-1 buff — the NEXT strike inside
        // its window is multiplied + briefly stuns, then the buff consumes
        // (a lapsed buff clears without effect on the next attempt).
        if (dmg > 0 && this.iaijutsu) {
          if (this.time.now < this.iaijutsu.until) {
            dmg *= this.iaijutsu.mult;
            this.stunEnemiesInRange(x, y, radius, this.iaijutsu.stunMs);
          }
          this.iaijutsu = null;
        }
        // EMPOWERED STRIKES (Monk): the count-N consume-buff — each striking
        // pulse spends ONE ×mult charge; the buff clears when the last is spent.
        if (dmg > 0 && this.empoweredStrikes) {
          dmg *= this.empoweredStrikes.mult;
          if (--this.empoweredStrikes.remaining <= 0) this.empoweredStrikes = null;
        }
        // STEALTH-BONUS rider (Assassin): a strike cast FROM stealth — or thrown
        // during Shadow Dance — lands ×stealthBonus (the cast then breaks stealth
        // per the normal rule, captured before the break).
        if (dmg > 0 && s.stealthBonus !== undefined && (this.castFromStealth || this.time.now < this.shadowDanceUntil)) dmg *= s.stealthBonus;
        if (dmg > 0) this.aoeHitAll(x, y, radius, dmg);
        // RAZOR'S EDGE (Samurai keyed passive): strikes leave a bleed DoT.
        if (dmg > 0 && this.strikeBleed) this.applyDotInRange(x, y, radius, this.strikeBleed.dmgPerTick, this.strikeBleed.tickMs, this.strikeBleed.durationMs, 0xd04a3a);
        // JAGUAR SPIRIT (Savage form): while the form holds, EVERY strike rakes
        // the jaguar's bleed (read live off the timed state — no recompute needed).
        if (dmg > 0 && this.skillTimed.some((t) => t.id === JAGUAR_FORM_ID && this.time.now < t.endsAt)) {
          const jb = SAV_JAGUAR_TUNING.jaguar.bleed;
          this.applyDotInRange(x, y, radius, jb.dmgPerTick, jb.tickMs, jb.durationMs, 0xe8a03a);
        }
        // VOODOO DOLL (Witch Doctor): a melee strike landing on the doll mirrors
        // a fraction of its damage to the bound target at any range.
        if (dmg > 0) this.maybeVoodooMirror(x, y, radius, dmg);
        // HARMONIC AMPLIFICATION (Bard): a charged strike detonates a splash too.
        if (dmg > 0 && this.harmonicCharges > 0) {
          this.harmonicCharges--;
          const c = BARD_BATTLE_TUNING.amplify;
          this.spawnSkillRing(x, y, c.splashRadius, 0xffd0b0);
          this.aoeHitAll(x, y, c.splashRadius, this.skillDamage(c.splashDamage));
        }
        if (s.stunMs) this.stunEnemiesInRange(x, y, radius, s.stunMs);
        if (s.knockback) this.knockbackEnemiesInRange(x, y, radius, s.knockback, s.knockbackStunMs ?? 200);
        if (s.slowFactor !== undefined && s.slowMs) this.slowEnemiesInRange(x, y, radius, s.slowMs, s.slowFactor);
        if (s.weaken !== undefined && s.weakenMs) {
          const apply = !s.weakenOnlyIfHit || this.combatEnemiesInRange(x, y, radius).length > 0;
          if (apply) {
            if (s.weakenChannel === 'intimidate') {
              this.intimidateWeakenUntil = this.time.now + s.weakenMs;
              this.intimidateWeakenFactor = s.weaken;
            } else {
              this.setPoisonWeaken(s.weaken, s.weakenMs);
            }
          }
        }
        if (s.tauntMs) this.tauntEnemiesInRange(x, y, radius, s.tauntMs);
        if (s.rootMs) this.rootNearestEnemy(x, y, radius, s.rootMs);
        if (s.crystallize) for (const e of this.combatEnemiesInRange(x, y, radius)) this.addCrystallize(e, s.crystallize, s.crystallizeMax ?? 6);
        if (s.healPerHit !== undefined && preHits > 0) {
          this.playerHealth.heal(s.healPerHit * preHits);
          this.spawnDamageNumber(cx, cy - 30, s.healPerHit * preHits, '#cf7aff');
        }
      };
      if (s.windUpMs) {
        // The Overswing telegraph: an expanding ring, then the strike from the
        // player's FRESH position.
        const tele = this.add.circle(px, py, 10, 0xffd27a, 0).setStrokeStyle(3, 0xffb04a, 0.9).setDepth(13);
        this.worldFx.add(tele);
        this.tweens.add({ targets: tele, scale: (s.range ?? 100) / 10, alpha: { from: 0.7, to: 0 }, duration: s.windUpMs, ease: 'Quad.in', onComplete: () => tele.destroy() });
        this.time.delayedCall(s.windUpMs, fire);
      } else if (s.pulses && s.pulses > 1) {
        for (let i = 0; i < s.pulses; i++) this.time.delayedCall(i * (s.pulseMs ?? 300), fire);
      } else {
        fire();
      }
    } else if (s.p === 'bolt') {
      if (s.via === 'aimed') {
        this.castFireBolt(s.damage, s.speed, s.range, s.radius, s.tint); // scales + storm splash + notify
        return;
      }
      const { dx, dy } = this.facingUnit();
      const dmg = this.skillDamage(s.damage);
      if (s.via === 'wizard') {
        this.spawnWizardBolt(dx, dy, dmg, s.speed, s.range, s.radius, s.tint, s.splash ? { splashRadius: s.splash.radius, splashDamage: this.skillDamage(s.splash.damage) } : undefined);
      } else {
        this.projectiles.spawn({
          x: px + dx * 18,
          y: py + dy * 18,
          dirX: dx,
          dirY: dy,
          speed: s.speed,
          damage: dmg,
          maxRange: s.range,
          faction: 'player',
          color: s.tint,
          radius: s.radius,
          ...(s.pierce !== undefined ? { pierce: s.pierce } : {}),
          ...(s.splash ? { splashRadius: s.splash.radius, splashDamage: this.skillDamage(s.splash.damage) } : {}),
          ...(s.dot ? { dotOnImpact: { dmgPerTick: this.skillDamage(s.dot.dmgPerTick), tickMs: s.dot.tickMs, durationMs: s.dot.durationMs, radius: s.dot.radius, color: s.dot.color } } : {}),
          ...(s.seek ? { seek: true, ...(s.seekTurnRate !== undefined ? { seekTurnRate: s.seekTurnRate } : {}) } : {}),
          ...(s.onHit ? { impactRider: s.onHit } : {}),
        });
      }
      if (s.vuln) {
        this.darkVulnUntil = this.time.now + s.vuln.durationMs;
        this.darkVulnMult = 1 + s.vuln.mult;
        if (s.vuln.banner) this.showBanner(s.vuln.banner, 900);
      }
      this.notifyBossesPlayerAction('ranged');
    } else if (s.p === 'cone') {
      const { dx, dy } = this.facingUnit();
      const half = (s.halfAngleDeg * Math.PI) / 180;
      this.spawnConeFx(px, py, dx, dy, s.range, half, s.tint);
      const inWedge = (ex: number, ey: number): boolean => this.inCone(px, py, dx, dy, ex, ey, s.range, half);
      this.aoeHitAll(px, py, s.range, this.skillDamage(s.damage), inWedge);
      if (s.knockback) this.knockbackEnemiesInRange(px, py, s.range, s.knockback, s.knockbackStunMs ?? 200, inWedge);
      if (s.slowFactor !== undefined && s.slowMs) this.slowEnemiesInRange(px, py, s.range, s.slowMs, s.slowFactor, inWedge);
      if (s.stunMs) this.stunEnemiesInRange(px, py, s.range, s.stunMs, inWedge);
    } else if (s.p === 'line') {
      const { dx, dy } = this.facingUnit();
      const x2 = px + dx * s.length;
      const y2 = py + dy * s.length;
      this.spawnLineFx(px, py, x2, y2, s.width, s.tint);
      this.aoeHitAll((px + x2) / 2, (py + y2) / 2, s.length / 2 + s.width, this.skillDamage(s.damage), (ex, ey) => this.inLine(px, py, x2, y2, ex, ey, s.width / 2));
    } else if (s.p === 'hazard') {
      const { dx, dy } = this.facingUnit();
      const x = s.at === 'ahead' ? px + dx * (s.placeAhead ?? 0) : px;
      const y = s.at === 'ahead' ? py + dy * (s.placeAhead ?? 0) : py;
      if (s.ring !== undefined) this.spawnSkillRing(x, y, s.radius, s.ring);
      const opts: { slowFactor?: number; weaken?: number; fill?: number; stroke?: number } = {};
      if (s.slowFactor !== undefined) opts.slowFactor = s.slowFactor;
      if (s.weaken !== undefined) opts.weaken = s.weaken;
      if (s.fill !== undefined) opts.fill = s.fill;
      if (s.stroke !== undefined) opts.stroke = s.stroke;
      this.spawnSpellHazard(x, y, s.radius, s.tickDamage > 0 ? this.skillDamage(s.tickDamage) : 0, s.durationMs, s.tickMs, Object.keys(opts).length ? opts : undefined);
      if (s.banner) this.showBanner(s.banner, 1400);
    } else if (s.p === 'heal') {
      this.playerHealth.heal(s.amount);
      this.spawnSkillRing(px, py, s.radius ?? 60, s.ring ?? 0xa8ffd0);
      this.spawnDamageNumber(px, py - 30, s.amount, '#a8ffd0');
      // MONK dual extension: with a radius, the mend reaches every allied summon
      // (the Astral decoy counts as a friendly) inside it.
      if (s.radius) {
        for (const sm of this.summons.list) {
          if (sm.isAlive && Phaser.Math.Distance.Between(sm.x, sm.y, px, py) <= s.radius) {
            sm.health.heal(s.amount);
            this.spawnDamageNumber(sm.x, sm.y - 26, s.amount, '#a8ffd0');
          }
        }
      }
    } else if (s.p === 'shield') {
      this.playerHealth.shield = s.amount;
      this.shieldUntil = this.time.now + s.durationMs;
      this.spawnSkillRing(px, py, 70, 0x8fd8ff);
      if (s.banner) this.showBanner(s.banner, 1100);
    } else if (s.p === 'ward') {
      this.ankhArmedUntil = this.time.now + s.armedMs;
      this.spawnSkillRing(px, py, 90, 0xffe9a8);
      if (s.banner) this.showBanner(s.banner, 1400);
    } else if (s.p === 'drain') {
      const reach = s.reach ?? 0.6;
      const fx = px + this.player.facingX * s.range * reach;
      const fy = py + this.player.facingY * s.range * reach;
      this.spawnSkillRing(fx, fy, s.range, s.tint);
      const target = this.nearestEnemy(fx, fy, s.range);
      if (target) {
        const dealt = target.takeHit(this.skillDamage(s.damage));
        if (dealt > 0) {
          this.dmgDealtAccum += dealt;
          this.spawnDamageNumber(target.x, target.y - 24, dealt, '#c8a8ff');
          const heal = Math.round(dealt * s.healPct);
          if (heal > 0 && this.playerHealth.current < this.playerHealth.max) {
            this.playerHealth.heal(heal);
            this.spawnDamageNumber(px, py - 30, heal, '#a8ffd0');
          }
        }
      }
    } else if (s.p === 'plague') {
      const fx = px + this.player.facingX * s.applyRange * 0.6;
      const fy = py + this.player.facingY * s.applyRange * 0.6;
      this.spawnSkillRing(fx, fy, s.applyRadius, s.tint);
      this.applyPlagueInRange(fx, fy, s.applyRadius, this.skillDamage(s.dotDamage), s.dotTickMs, s.dotDurationMs, s.spreadRadius, s.maxSpread);
    } else if (s.p === 'chain') {
      // CHAIN-BOUNCE: hit the nearest enemy, then arc to up to `jumps` more —
      // each within jumpRange of the LAST one hit, never the same enemy twice —
      // with damage × falloff per jump. Kills mid-chain are fine: the next-hop
      // search only considers live enemies.
      let target = this.nearestEnemy(px, py, s.range);
      if (!target) {
        this.showBanner('No target in range', 800);
        return;
      }
      let dmg = this.skillDamage(s.damage);
      let fromX = px;
      let fromY = py;
      const hit = new Set<CombatEnemy>();
      for (let arc = 0; arc <= s.jumps && target; arc++) {
        hit.add(target);
        this.spawnLineFx(fromX, fromY, target.x, target.y, 6, s.tint);
        // STRIKE-CHAIN (Bard framework): melee chains sweep a crescent per hop.
        if (s.swingFx) this.swingFx.show(fromX, fromY, 60, s.tint, Math.atan2(target.y - fromY, target.x - fromX));
        this.spawnSkillRing(target.x, target.y, 26, s.tint);
        const dealt = target.takeHit(dmg);
        if (dealt > 0) {
          this.dmgDealtAccum += dealt;
          this.spawnDamageNumber(target.x, target.y - 24, dealt, '#b8ffc8');
        }
        fromX = target.x;
        fromY = target.y;
        dmg = Math.max(1, Math.round(dmg * s.falloff));
        let next: CombatEnemy | null = null;
        let nextD = Infinity;
        for (const e of this.combatEnemiesInRange(fromX, fromY, s.jumpRange)) {
          if (hit.has(e)) continue;
          const d = Phaser.Math.Distance.Between(fromX, fromY, e.x, e.y);
          if (d < nextD) {
            next = e;
            nextD = d;
          }
        }
        target = next;
      }
      this.notifyBossesPlayerAction('ranged');
    } else if (s.p === 'dualbolt') {
      // DUAL-USE bolt (smart-target): an enemy in range → a damaging bolt at it
      // (an attack — breaks stealth); no enemy → a MENDING bolt instead: the
      // most-injured allied summon within healRange, else the caster.
      const target = this.nearestEnemy(px, py, s.range);
      if (target) {
        this.breakPlayerStealth();
        const ang = Math.atan2(target.y - py, target.x - px);
        const dx = Math.cos(ang);
        const dy = Math.sin(ang);
        this.projectiles.spawn({
          x: px + dx * 18,
          y: py + dy * 18,
          dirX: dx,
          dirY: dy,
          speed: s.speed,
          damage: this.skillDamage(s.damage),
          maxRange: s.range + 60,
          faction: 'player',
          color: s.tint,
          radius: s.radius,
        });
        this.notifyBossesPlayerAction('ranged');
        return;
      }
      const healTint = s.healTint ?? 0xa8ffd0;
      let ally: AlliedSummon | null = null;
      for (const sm of this.summons.list) {
        if (!sm.isAlive || sm.health.current >= sm.health.max) continue;
        if (Phaser.Math.Distance.Between(px, py, sm.x, sm.y) > s.healRange) continue;
        if (!ally || sm.health.ratio < ally.health.ratio) ally = sm;
      }
      if (ally) {
        ally.heal(s.heal);
        this.spawnSkillRing(ally.x, ally.y, ally.bodyRadius + 14, healTint);
        this.spawnDamageNumber(ally.x, ally.y - 30, s.heal, '#a8ffd0');
      } else {
        this.playerHealth.heal(s.heal);
        this.spawnSkillRing(px, py, 60, healTint);
        this.spawnDamageNumber(px, py - 30, s.heal, '#a8ffd0');
      }
    } else if (s.p === 'friendzone') {
      this.spawnFriendlyZone(px, py, s.radius, s.healPerTick, s.tickMs, s.durationMs, s.follow ?? false, s.tint);
      if (s.banner) this.showBanner(s.banner, 1200);
    } else if (s.p === 'stealth') {
      this.startPlayerStealth(s.durationMs);
      if (s.banner) this.showBanner(s.banner, 1200);
    } else if (s.p === 'teleport') {
      // TELEPORT (Mage framework): the Blink machinery with a tunable distance.
      // Composed AFTER a self-hazard step it forms the Wormhole (portal stays behind).
      this.doBlink(s.distance);
    }
  }

  /** TAUNT (reusable): draw nearby enemies' aggro onto the PLAYER for `ms` (overrides
   *  summon aggro via enemyMoveTarget) + a brief marker over each taunted foe. The
   *  taunt is global-while-active (most impactful once allied summons exist). */
  private tauntEnemiesInRange(x: number, y: number, range: number, ms: number): void {
    const hit = this.combatEnemiesInRange(x, y, range);
    if (hit.length === 0) return;
    this.tauntUntil = Math.max(this.tauntUntil, this.time.now + ms);
    for (const e of hit) {
      const mark = this.add.text(e.x, e.y - 30, '!', { fontFamily: 'system-ui, sans-serif', fontSize: '16px', color: '#ff6a6a', fontStyle: 'bold' }).setOrigin(0.5).setDepth(14);
      this.worldFx.add(mark);
      this.tweens.add({ targets: mark, y: e.y - 44, alpha: 0, duration: 700, onComplete: () => mark.destroy() });
    }
  }

  /** The nearest live enemy within `range` of (x,y), or null. */
  private nearestEnemy(x: number, y: number, range: number): CombatEnemy | null {
    let best: CombatEnemy | null = null;
    let bestD = range;
    for (const e of this.combatEnemiesInRange(x, y, range)) {
      const d = Phaser.Math.Distance.Between(x, y, e.x, e.y);
      if (d <= bestD) { bestD = d; best = e; }
    }
    return best;
  }

  /** ROOT (reusable; extends the stun freeze): immobilize the single nearest enemy in
   *  range for `ms` — it can't move but may still act. A bone-stake spike marks it. */
  private rootNearestEnemy(x: number, y: number, range: number, ms: number): void {
    const e = this.nearestEnemy(x, y, range);
    if (!e) return;
    this.stunnedEnemies.set(e, this.time.now + ms);
    this.freezeEnemyBody(e, true);
    const spike = this.add.text(e.x, e.y - 28, '⊤', { fontFamily: 'system-ui, sans-serif', fontSize: '18px', color: '#d9d2c2', fontStyle: 'bold' }).setOrigin(0.5).setDepth(14);
    this.worldFx.add(spike);
    this.tweens.add({ targets: spike, alpha: 0, duration: ms, onComplete: () => spike.destroy() });
  }

  /** BLINK (Ethereal #5; also the composed `teleport` primitive): instantly teleport
   *  forward, stopping short of blocking terrain. `distance` defaults to the Ethereal
   *  tuning so eth_blink is unchanged; the Mage Wormhole passes its own. */
  private doBlink(distance: number = ETHEREAL_TUNING.blink.distance): void {
    const { dx, dy } = this.facingUnit();
    const c = { distance };
    const fromX = this.player.x;
    const fromY = this.player.y;
    // Step out along the facing direction, halting just before any blocking tile.
    let dist: number = c.distance;
    const step = 12;
    for (let d = step; d <= c.distance; d += step) {
      const tx = fromX + dx * d;
      const ty = fromY + dy * d;
      if (this.activeMap().terrainAtWorld(tx, ty)?.blocks) {
        dist = Math.max(0, d - step);
        break;
      }
    }
    const b = this.physics.world.bounds;
    const nx = Phaser.Math.Clamp(fromX + dx * dist, b.x + 10, b.x + b.width - 10);
    const ny = Phaser.Math.Clamp(fromY + dy * dist, b.y + 10, b.y + b.height - 10);
    // A fading ghost at the origin + a flash at the destination read as the teleport.
    const ghost = this.add.image(fromX, fromY, this.player.sprite.texture.key).setDepth(9).setAlpha(0.5).setTint(0xbfa8ff);
    this.worldFx.add(ghost);
    this.tweens.add({ targets: ghost, alpha: 0, duration: 280, onComplete: () => ghost.destroy() });
    this.player.sprite.setPosition(nx, ny);
    this.spawnSkillRing(nx, ny, 50, 0xbfa8ff);
  }

  // --- Wizard helpers (Fire/Wind tree): bolts, storm splash, cone/line geometry ---

  /** Normalized facing direction (defaults to "down" when idle). */
  private facingUnit(): { dx: number; dy: number } {
    const len = Math.hypot(this.player.facingX, this.player.facingY) || 1;
    return { dx: this.player.facingX / len, dy: this.player.facingY / len };
  }

  /**
   * PIECE 2 — LIGHT AIM-ASSIST (not lock-on). Given a player bolt's origin + intended
   * direction, snap it toward the NEAREST live enemy whose bearing is within the
   * forgiveness cone (and within range); otherwise fire straight (aim at nothing → miss).
   * Allied summons aren't in combatEnemies(), so the golem is never targeted.
   */
  private aimAssist(x: number, y: number, dirX: number, dirY: number): { dirX: number; dirY: number } {
    if (!this.aimAssistEnabled) return { dirX, dirY };
    const baseAng = Math.atan2(dirY, dirX);
    let best: CombatEnemy | null = null;
    let bestDist = Infinity;
    for (const e of this.combatEnemies()) {
      if (!e.isAlive) continue; // per-frame cache may include a mid-frame death
      const ex = e.x - x;
      const ey = e.y - y;
      const dist = Math.hypot(ex, ey);
      if (dist < 1 || dist > AIM_ASSIST_MAX_RANGE) continue;
      const diff = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(ey, ex) - baseAng));
      if (diff <= this.aimAssistCone && dist < bestDist) {
        best = e;
        bestDist = dist;
      }
    }
    if (!best) return { dirX, dirY }; // nothing in the cone → no nudge (you can miss)
    const a = Math.atan2(best.y - y, best.x - x);
    return { dirX: Math.cos(a), dirY: Math.sin(a) };
  }

  // --- PIECE 4: drag-from-skill-button aiming -----------------------------------

  /** Is the skill in loadout `slot` directional (gets drag-to-aim)? */
  private isSlotAimable(slot: number): boolean {
    const id = this.skills.loadout()[slot];
    if (!id) return false;
    const def = classSkills(this.skills.activeClass).skills.find((s) => s.id === id);
    return !!def && isAimableSkill(def);
  }

  /** Fire a drag-aimed slot: point the player in the aimed direction, then activate (the
   *  handlers read facing; projectiles additionally pass through aim-assist). */
  private fireAimedSlot(slot: number, dx: number, dy: number): void {
    this.player.facingX = dx;
    this.player.facingY = dy;
    this.aimingDir = null;
    this.hideAimIndicator();
    this.activateLoadoutSlot(slot);
  }

  /** Per-frame: draw the world-space aim arrow from the player while a skill is being
   *  dragged (so it tracks the player as they move with the joystick), else hide it. */
  private updateAimIndicator(): void {
    if (!this.aimingDir) {
      this.hideAimIndicator();
      return;
    }
    if (!this.aimIndicator) {
      this.aimIndicator = this.add.graphics().setDepth(14);
      this.worldFx.add(this.aimIndicator);
      this.uiCamera?.ignore(this.aimIndicator); // world-space only (main camera)
    }
    const g = this.aimIndicator;
    g.clear();
    g.setVisible(true);
    const px = this.player.x;
    const py = this.player.y;
    const { dx, dy } = this.aimingDir;
    const len = 130;
    const ex = px + dx * len;
    const ey = py + dy * len;
    g.lineStyle(4, 0x66e0ff, 0.85);
    g.lineBetween(px, py, ex, ey);
    const a = Math.atan2(dy, dx);
    const ah = 16;
    g.lineBetween(ex, ey, ex - Math.cos(a - 0.42) * ah, ey - Math.sin(a - 0.42) * ah);
    g.lineBetween(ex, ey, ex - Math.cos(a + 0.42) * ah, ey - Math.sin(a + 0.42) * ah);
  }

  private hideAimIndicator(): void {
    if (this.aimIndicator?.visible) this.aimIndicator.setVisible(false);
  }

  /** True while the Elemental Storm transformation is active (bolts gain splash). */
  private isElementalStormActive(): boolean {
    return this.skillTimed.some((t) => t.id === WIZ_STORM_ID);
  }

  /** Storm-form splash fields for a player bolt dealing `boltDmg`, or none if not stormed. */
  private stormSplash(boltDmg: number): { splashRadius: number; splashDamage: number } {
    if (!this.isElementalStormActive()) return { splashRadius: 0, splashDamage: 0 };
    const s = WIZARD_FIREWIND_TUNING.storm;
    return { splashRadius: s.splashRadius, splashDamage: Math.round(boltDmg * s.splashFraction) };
  }

  /** Fire one Wizard fire bolt (already-scaled `dmg`) in (dx,dy), with optional splash. */
  private spawnWizardBolt(dx: number, dy: number, dmg: number, speed: number, range: number, radius: number, color: number, splash?: { splashRadius: number; splashDamage: number }): void {
    this.projectiles.spawn({
      x: this.player.x + dx * 18,
      y: this.player.y + dy * 18,
      dirX: dx,
      dirY: dy,
      speed,
      damage: dmg,
      maxRange: range,
      faction: 'player',
      color,
      radius,
      splashRadius: splash?.splashRadius ?? 0,
      splashDamage: splash?.splashDamage ?? 0,
    });
  }

  /** Fireball-style single bolt in the facing direction (scales `base` + adds storm splash). */
  private castFireBolt(base: number, speed: number, range: number, radius: number, color: number): void {
    const { dx, dy } = this.facingUnit();
    const dmg = this.skillDamage(base);
    this.spawnWizardBolt(dx, dy, dmg, speed, range, radius, color, this.stormSplash(dmg));
    this.notifyBossesPlayerAction('ranged');
  }

  /** True if (ex,ey) lies within the forward CONE from (px,py) along (dx,dy). */
  private inCone(px: number, py: number, dx: number, dy: number, ex: number, ey: number, range: number, halfAngle: number): boolean {
    const vx = ex - px;
    const vy = ey - py;
    const dist = Math.hypot(vx, vy);
    if (dist > range) return false;
    if (dist < 1) return true; // point-blank
    const cos = (vx * dx + vy * dy) / dist; // cosine of the angle to the facing
    return cos >= Math.cos(halfAngle);
  }

  /** True if (ex,ey) lies within `halfWidth` of the segment (x1,y1)→(x2,y2) (line/wall hit). */
  private inLine(x1: number, y1: number, x2: number, y2: number, ex: number, ey: number, halfWidth: number): boolean {
    const dxL = x2 - x1;
    const dyL = y2 - y1;
    const l2 = dxL * dxL + dyL * dyL || 1;
    let t = ((ex - x1) * dxL + (ey - y1) * dyL) / l2;
    t = Math.max(0, Math.min(1, t));
    const cxp = x1 + t * dxL;
    const cyp = y1 + t * dyL;
    return Math.hypot(ex - cxp, ey - cyp) <= halfWidth;
  }

  /** GUST (Wizard #5): a forward wind-dash reusing the dash movement; enemies in the
   *  path are damaged once. Independent of the dodge cooldown (the skill gates it). */
  private startGust(): void {
    const c = WIZARD_FIREWIND_TUNING.gust;
    const { dx, dy } = this.facingUnit();
    this.dashDir = { x: dx, y: dy };
    this.dashEndsAt = this.time.now + (c.distance / DASH_SPEED) * 1000;
    this.gustHits.clear();
    this.gustActive = true;
  }

  /** GUST per-frame: damage each enemy in the path once. */
  private gustTick(): void {
    const c = WIZARD_FIREWIND_TUNING.gust;
    const r = DASH_HIT_RADIUS + 16;
    for (const e of this.combatEnemiesInRange(this.player.x, this.player.y, r)) {
      if (this.gustHits.has(e)) continue;
      this.gustHits.add(e);
      const dealt = e.takeHit(this.skillDamage(c.damage));
      if (dealt > 0) this.dmgDealtAccum += dealt;
      this.spawnDamageNumber(e.x, e.y - 24, dealt, '#bfe6ff');
    }
    this.lastCombatTime = this.time.now;
  }

  /**
   * Drop a persistent ground zone (the enemy-facing twin of the boss HazardField). Each
   * tick it can DAMAGE (tickDamage), SLOW (opts.slowFactor < 1) and/or WEAKEN (opts.weaken)
   * enemies inside. Reused by Lava (fire) + the Ice/Poison zones (Black Ice = slow only,
   * Freezing Rain = slow+damage, Biohazard = poison damage, Pestilence = damage+slow+weaken).
   */
  private spawnSpellHazard(
    x: number,
    y: number,
    radius: number,
    tickDamage: number,
    durationMs: number,
    tickMs: number,
    opts?: { slowFactor?: number; weaken?: number; fill?: number; stroke?: number },
  ): void {
    const now = this.time.now;
    const fill = opts?.fill ?? 0xff6a1a;
    const stroke = opts?.stroke ?? 0xffb020;
    const fx = this.add.circle(x, y, radius, fill, 0.26).setStrokeStyle(2, stroke, 0.9).setDepth(6);
    this.worldFx.add(fx);
    this.tweens.add({ targets: fx, alpha: { from: 0.38, to: 0.16 }, duration: 380, yoyo: true, repeat: -1 });
    this.spellHazards.push({
      x, y, radius, tickDamage, tickMs,
      slowFactor: opts?.slowFactor ?? 1,
      weaken: opts?.weaken ?? 0,
      nextTickAt: now + tickMs,
      expireAt: now + durationMs,
      fx,
    });
  }

  /** Per-frame: tick (damage/slow/weaken) + expire the ground hazards. Runs after enemy updates. */
  private updateSpellHazards(): void {
    if (this.spellHazards.length === 0) return;
    const now = this.time.now;
    for (const h of this.spellHazards) {
      if (now >= h.nextTickAt) {
        h.nextTickAt = now + h.tickMs;
        if (h.tickDamage > 0) this.aoeHitAll(h.x, h.y, h.radius, h.tickDamage);
        if (h.slowFactor < 1) this.slowEnemiesInRange(h.x, h.y, h.radius, h.tickMs * 1.5, h.slowFactor);
        if (h.weaken > 0 && this.combatEnemiesInRange(h.x, h.y, h.radius).length > 0) this.setPoisonWeaken(h.weaken, h.tickMs * 1.5);
      }
    }
    if (this.spellHazards.some((h) => now >= h.expireAt)) {
      for (const h of this.spellHazards) {
        if (now >= h.expireAt) {
          this.tweens.killTweensOf(h.fx);
          this.tweens.add({ targets: h.fx, alpha: 0, duration: 200, onComplete: () => h.fx.destroy() });
        }
      }
      this.spellHazards = this.spellHazards.filter((h) => now < h.expireAt);
    }
  }

  /** Remove every ground hazard immediately (dev reset / save load). */
  private clearSpellHazards(): void {
    for (const h of this.spellHazards) {
      this.tweens.killTweensOf(h.fx);
      h.fx.destroy();
    }
    this.spellHazards = [];
  }

  // --- Druid framework: friendly zones + player stealth + multi-unit summons ----

  /**
   * FRIENDLY ZONE (the ally-facing twin of spawnSpellHazard): a ground area that HEALS
   * the player + allied summons inside it every `tickMs`. STATIC by default; `follow`
   * makes it MOBILE — it tracks the caster each frame. Public so composed skills and
   * the runtime gate share one entry point.
   */
  spawnFriendlyZone(x: number, y: number, radius: number, healPerTick: number, tickMs: number, durationMs: number, follow: boolean, tint?: number): void {
    const now = this.time.now;
    const color = tint ?? 0x7de0a0;
    const fx = this.add.circle(x, y, radius, color, 0.15).setStrokeStyle(2, color, 0.7).setDepth(5);
    this.worldFx.add(fx);
    this.tweens.add({ targets: fx, alpha: { from: 0.3, to: 0.14 }, duration: 520, yoyo: true, repeat: -1 });
    this.friendlyZones.push({ x, y, radius, healPerTick, tickMs, nextTickAt: now + tickMs, expireAt: now + durationMs, follow, fx });
  }

  /** Per-frame: move `follow` zones with the caster, tick heals for the player +
   *  allied summons inside each zone, expire lapsed zones. Mirrors updateSpellHazards. */
  private updateFriendlyZones(): void {
    if (this.friendlyZones.length === 0) return;
    const now = this.time.now;
    for (const z of this.friendlyZones) {
      if (z.follow) {
        z.x = this.player.x;
        z.y = this.player.y;
        z.fx.setPosition(z.x, z.y);
      }
      if (now >= z.nextTickAt) {
        z.nextTickAt = now + z.tickMs;
        if (!this.playerDead && this.playerHealth.current < this.playerHealth.max && Phaser.Math.Distance.Between(z.x, z.y, this.player.x, this.player.y) <= z.radius) {
          this.playerHealth.heal(z.healPerTick);
          this.spawnDamageNumber(this.player.x, this.player.y - 30, z.healPerTick, '#a8ffd0');
        }
        for (const sm of this.summons.list) {
          if (sm.isAlive && sm.health.current < sm.health.max && sm.distanceTo(z.x, z.y) <= z.radius) sm.heal(z.healPerTick);
        }
      }
    }
    if (this.friendlyZones.some((z) => now >= z.expireAt)) {
      for (const z of this.friendlyZones) {
        if (now >= z.expireAt) {
          this.tweens.killTweensOf(z.fx);
          this.tweens.add({ targets: z.fx, alpha: 0, duration: 200, onComplete: () => z.fx.destroy() });
        }
      }
      this.friendlyZones = this.friendlyZones.filter((z) => now < z.expireAt);
    }
  }

  /** Remove every friendly zone immediately (dev reset / save load / world swap). */
  private clearFriendlyZones(): void {
    for (const z of this.friendlyZones) {
      this.tweens.killTweensOf(z.fx);
      z.fx.destroy();
    }
    this.friendlyZones = [];
  }

  /** Is player stealth live right now? (Runtime-gate observable.) */
  get playerStealthActive(): boolean {
    return this.time.now < this.playerStealthUntil;
  }

  /** Enter PLAYER STEALTH for `durationMs`: wipe all current enemy aggro (every enemy
   *  re-evaluates and finds no player to chase — see enemyAggroTarget) and fade the
   *  avatar. Any attack — an offensive composed step or the basic strike — breaks it. */
  startPlayerStealth(durationMs: number): void {
    this.playerStealthUntil = this.time.now + durationMs;
    this.aggroState = new WeakMap(); // aggro wipe: forces an immediate re-evaluation
    this.player.sprite.setAlpha(0.45);
  }

  /** End stealth NOW (an attack broke it / the window lapsed / a reset). Restores the avatar. */
  breakPlayerStealth(): void {
    if (this.playerStealthUntil === 0) return;
    this.playerStealthUntil = 0;
    this.player.sprite.setAlpha(1);
  }

  // --- Mage framework: entangled chains + crystallize/shatter ------------------

  /**
   * ENTANGLED CHAINS: bind up to `count` live enemies nearest (x,y) within `radius`
   * together for `durationMs`. While bound, `sharePct` of any damage one takes is
   * dealt to every other member (via the Health.onDamaged seam — EVERY damage path
   * funnels through it), and control (stun/slow) applied to one applies to all.
   * Returns how many were bound. Enemies without a health pool are skipped.
   */
  entangleNearby(x: number, y: number, radius: number, count: number, sharePct: number, durationMs: number, tint = 0xc09aff): number {
    this.clearEntangle(); // one binding at a time — re-cast rebinds
    const withHealth = (e: CombatEnemy): e is CombatEnemy & { health: Health } => {
      const h = (e as unknown as { health?: Health }).health;
      return !!h && typeof h.damage === 'function';
    };
    const members = this.combatEnemiesInRange(x, y, radius)
      .filter(withHealth)
      .sort((a, b) => Phaser.Math.Distance.Between(x, y, a.x, a.y) - Phaser.Math.Distance.Between(x, y, b.x, b.y))
      .slice(0, count);
    if (members.length < 2) return members.length; // nothing to share with
    const prevHooks = members.map((m) => (m as unknown as { health: Health }).health.onDamaged);
    this.entangled = { members, sharePct, until: this.time.now + durationMs, prevHooks };
    for (const m of members) {
      const h = (m as unknown as { health: Health }).health;
      const prev = h.onDamaged;
      h.onDamaged = (amt: number): void => {
        prev?.(amt);
        this.onEntangledDamaged(m, amt);
      };
      this.floatingText.show(m.x, m.y - 34, '⛓', '#c09aff', { fontSize: 15, riseBy: 12, durationMs: 900, depth: 14 });
    }
    // Chain FX between consecutive members (a one-shot visual of the binding).
    for (let i = 1; i < members.length; i++) this.spawnLineFx(members[i - 1].x, members[i - 1].y, members[i].x, members[i].y, 4, tint);
    return members.length;
  }

  /** The entangle DAMAGE share: `sharePct` of what one member took hits the others.
   *  Guarded so shared damage never re-shares (no cascade). */
  private onEntangledDamaged(source: CombatEnemy, amount: number): void {
    const ent = this.entangled;
    if (!ent || this.entangleSharing || this.time.now >= ent.until || !ent.members.includes(source)) return;
    this.entangleSharing = true;
    const share = amount * ent.sharePct;
    for (const m of ent.members) {
      if (m === source || !m.isAlive) continue;
      const dealt = m.takeHit(share);
      if (dealt > 0) {
        this.dmgDealtAccum += dealt;
        this.spawnDamageNumber(m.x, m.y - 24, dealt, '#c09aff');
      }
    }
    this.entangleSharing = false;
  }

  /** The entangle CONTROL share: the OTHER live members bound with `e` (empty when
   *  no live binding contains it). stun/slow apply their effect to these too. */
  private entangleControlPeers(e: CombatEnemy): CombatEnemy[] {
    const ent = this.entangled;
    if (!ent || this.time.now >= ent.until || !ent.members.includes(e)) return [];
    return ent.members.filter((m) => m !== e && m.isAlive);
  }

  /** Unbind NOW (expiry / re-cast / reset), restoring each member's previous hook. */
  clearEntangle(): void {
    const ent = this.entangled;
    if (!ent) return;
    this.entangled = null;
    for (let i = 0; i < ent.members.length; i++) {
      const h = (ent.members[i] as unknown as { health?: Health }).health;
      if (h) h.onDamaged = ent.prevHooks[i];
    }
  }

  /** CRYSTALLIZE: add `stacks` to an enemy (capped at `maxStacks`). Applied by the
   *  strike rider; Shatter consumes them. */
  addCrystallize(e: CombatEnemy, stacks: number, maxStacks: number): void {
    if (!e.isAlive || stacks <= 0) return;
    const next = Math.min(maxStacks, (this.crystallize.get(e) ?? 0) + stacks);
    this.crystallize.set(e, next);
    this.floatingText.show(e.x, e.y - 34, `❖${next}`, '#bfe0ff', { fontSize: 14, riseBy: 12, durationMs: 700, depth: 14 });
  }

  /** SHATTER: detonate ALL crystallize stacks on enemies within `radius` of (x,y) —
   *  `damagePerStack` (already scaled by the caller) × that enemy's stacks, consuming
   *  EXACTLY those stacks (out-of-radius stacks stay). Returns what it consumed. */
  shatterCrystallize(x: number, y: number, radius: number, damagePerStack: number, tint = 0xbfe0ff): { hit: number; stacks: number } {
    let hit = 0;
    let stacks = 0;
    this.spawnSkillRing(x, y, radius, tint);
    for (const [e, n] of [...this.crystallize]) {
      if (!e.isAlive) {
        this.crystallize.delete(e); // prune the dead
        continue;
      }
      if (Phaser.Math.Distance.Between(x, y, e.x, e.y) > radius) continue;
      this.crystallize.delete(e); // consume exactly the detonated stacks
      const dealt = e.takeHit(damagePerStack * n);
      if (dealt > 0) {
        this.dmgDealtAccum += dealt;
        this.spawnDamageNumber(e.x, e.y - 24, dealt, '#bfe0ff');
      }
      this.spawnSkillRing(e.x, e.y, 26, tint);
      hit++;
      stacks += n;
    }
    this.lastCombatTime = this.time.now;
    return { hit, stacks };
  }

  // --- Bard framework: confusion + echo + finisher + combo ultimate -------------

  /**
   * CONFUSION: try to confuse the nearest enemy within `range` of (x,y) — on a
   * successful `chance` roll its aggro is redirected onto its nearest FELLOW enemy
   * for `durationMs` (it walks to it and chips at it on a cadence), then wears off
   * cleanly. Returns true when an enemy was confused.
   */
  confuseNearestEnemy(x: number, y: number, range: number, chance: number, durationMs: number, chipDamage = 8, chipMs = 700): boolean {
    const e = this.nearestEnemy(x, y, range);
    if (!e) return false;
    if (Math.random() > chance) {
      this.floatingText.show(e.x, e.y - 30, 'resisted', '#c8b8e8', { fontSize: 12, riseBy: 12, durationMs: 700, depth: 14 });
      return false;
    }
    // Its nearest FELLOW enemy — no fellow in earshot, no one to turn on.
    let target: CombatEnemy | null = null;
    let bestD = 480;
    for (const o of this.combatEnemiesInRange(e.x, e.y, 480)) {
      if (o === e) continue;
      const d = Phaser.Math.Distance.Between(e.x, e.y, o.x, o.y);
      if (d < bestD) {
        bestD = d;
        target = o;
      }
    }
    if (!target) return false;
    this.confused.set(e, { target, until: this.time.now + durationMs, chipDamage, chipMs, nextChipAt: this.time.now + chipMs });
    this.floatingText.show(e.x, e.y - 34, '?', '#ffb0e0', { fontSize: 18, riseBy: 14, durationMs: 1000, depth: 14 });
    return true;
  }

  /** Per-frame: prune lapsed/dead confusions; a confused enemy adjacent to its
   *  turned-on fellow CHIPS at it on its cadence (it "attacks its own"). */
  private updateConfusion(): void {
    if (this.confused.size === 0) return;
    const now = this.time.now;
    for (const [e, cf] of this.confused) {
      if (now >= cf.until || !e.isAlive || !cf.target.isAlive) {
        this.confused.delete(e); // wears off cleanly — normal aggro resumes
        continue;
      }
      if (now >= cf.nextChipAt && Phaser.Math.Distance.Between(e.x, e.y, cf.target.x, cf.target.y) <= 52) {
        cf.nextChipAt = now + cf.chipMs;
        const dealt = cf.target.takeHit(cf.chipDamage);
        if (dealt > 0) this.spawnDamageNumber(cf.target.x, cf.target.y - 24, dealt, '#ffb0e0');
      }
    }
  }

  /** ECHO: while armed (echoPct > 0), repeat a player attack resolution once after
   *  echoDelayMs at echoPct strength. The echo itself never re-echoes (guard). */
  setEcho(pct: number, delayMs = 380): void {
    this.echoPct = pct;
    this.echoDelayMs = delayMs;
  }

  private maybeEcho(repeat: () => void): void {
    if (this.echoPct <= 0 || this.echoing) return;
    this.time.delayedCall(this.echoDelayMs, () => {
      if (this.playerDead) return;
      this.echoing = true;
      repeat();
      this.echoing = false;
    });
  }

  /** CONDITIONAL FINISHER (the Execute pattern, per-enemy): hit everything within
   *  `radius` of (x,y); targets that are STUNNED or SLOWED/weakened take
   *  damage × bonusMult. Returns how many were hit / how many qualified. */
  finisherHitAll(x: number, y: number, radius: number, damage: number, bonusMult: number, tint = 0xffd0a0): { hit: number; bonus: number } {
    let hit = 0;
    let bonus = 0;
    this.spawnSkillRing(x, y, radius, tint);
    for (const e of this.combatEnemiesInRange(x, y, radius)) {
      const qualifies = this.stunnedEnemies.has(e) || this.slowedEnemies.has(e);
      const dealt = e.takeHit(qualifies ? damage * bonusMult : damage);
      if (dealt > 0) {
        this.dmgDealtAccum += dealt;
        this.spawnDamageNumber(e.x, e.y - 24, dealt, qualifies ? '#ffd0a0' : '#ffffff');
      }
      hit++;
      if (qualifies) bonus++;
    }
    this.lastCombatTime = this.time.now;
    return { hit, bonus };
  }

  /** COMBO ULTIMATE (War Song): enter a short timed state of rapid AUTO-CHAINED
   *  melee strikes (the chain machinery on a cadence, no input) plus a stat buff
   *  (via the timed-skill system). Tunables all come from `cfg`. */
  startComboUltimate(id: string, cfg: { durationMs: number; intervalMs: number; range: number; damage: number; jumps: number; jumpRange: number; falloff: number; tint: number; stats: SkillStatMods }): void {
    this.comboUltimate = {
      until: this.time.now + cfg.durationMs,
      nextAt: this.time.now,
      intervalMs: cfg.intervalMs,
      range: cfg.range,
      damage: cfg.damage,
      jumps: cfg.jumps,
      jumpRange: cfg.jumpRange,
      falloff: cfg.falloff,
      tint: cfg.tint,
    };
    this.startTimedSkill(id, cfg.durationMs, cfg.stats, cfg.tint);
  }

  /** Per-frame: the combo ultimate's auto-strike cadence (ends with its window). */
  private updateComboUltimate(): void {
    const cu = this.comboUltimate;
    if (!cu) return;
    if (this.time.now >= cu.until || this.playerDead) {
      this.comboUltimate = null;
      return;
    }
    if (this.time.now < cu.nextAt) return;
    cu.nextAt = this.time.now + cu.intervalMs;
    if (!this.nearestEnemy(this.player.x, this.player.y, cu.range)) return; // no one in reach this beat
    // One auto STRIKE-CHAIN through whatever stands near (the shared chain machinery).
    this.runComposedSteps([{ p: 'chain', range: cu.range, jumps: cu.jumps, jumpRange: cu.jumpRange, damage: cu.damage, falloff: cu.falloff, tint: cu.tint, swingFx: true }]);
  }

  /**
   * GENERIC MULTI-UNIT SUMMON (Druid framework): spawn `count` units of `config`
   * ahead of the player in ONE cast — count 2 lands a linked PAIR side-by-side
   * (perpendicular offsets across the facing). `maxConcurrent` caps the TYPE (a
   * pair skill passes ≥ 2 so its own second unit isn't recycled). The UNTARGETABLE
   * TIMED variant is pure config on the existing seam: drawsAggro=false keeps the
   * unit out of all enemy targeting/interception, `durationMsOverride` shortens its
   * life, and a small attackDamage gives the chip damage. Returns the spawned units.
   */
  summonAlliedUnits(config: AlliedSummonConfig, count: number, maxConcurrent: number, durationMsOverride?: number): AlliedSummon[] {
    const { dx, dy } = this.facingUnit();
    const out: AlliedSummon[] = [];
    for (let i = 0; i < count; i++) {
      const side = count > 1 ? (i - (count - 1) / 2) * 44 : 0; // pair: flank the facing line
      const jx = count > 1 ? 0 : Phaser.Math.Between(-20, 20); // single: light scatter
      const x = this.player.x + dx * 40 - dy * side + jx;
      const y = this.player.y + dy * 40 + dx * side;
      const s = this.summons.summon(config, x, y, maxConcurrent, durationMsOverride);
      this.spawnSkillRing(s.x, s.y, config.bodyRadius + 12, config.tint);
      out.push(s);
    }
    this.lastCombatTime = this.time.now;
    return out;
  }

  // --- Witch Doctor framework: voodoo doll + decoy + ally-bond + spirit split ---

  /**
   * VOODOO DOLL (the kit's centerpiece): bind the nearest enemy within `range`
   * (dealing the cast's initial spirit damage) and place the doll — a small
   * summon-foundation unit beside the player — for `bindDurationMs`. While bound,
   * melee strikes that land ON THE DOLL mirror `mirrorPct` of their damage to the
   * bound target AT ANY RANGE (maybeVoodooMirror). One doll at a time; a re-cast
   * re-binds fresh; the bind ends on doll death / target death / expiry.
   * `damage` arrives pre-scaled by the caller. Returns true when a bind landed.
   */
  castVoodooDoll(range: number, damage: number, bindDurationMs: number, mirrorPct: number): boolean {
    const target = this.nearestEnemy(this.player.x, this.player.y, range);
    if (!target) {
      this.showBanner('No spirit to bind', 900);
      return false;
    }
    const dealt = target.takeHit(damage);
    if (dealt > 0) {
      this.dmgDealtAccum += dealt;
      this.spawnDamageNumber(target.x, target.y - 24, dealt, '#c9a0ff');
    }
    this.summons.clearKey(VOODOO_DOLL_CONFIG.key); // one doll — a re-cast re-binds
    const doll = this.summonAlliedUnits(VOODOO_DOLL_CONFIG, 1, 1, bindDurationMs)[0];
    this.voodoo = { target, doll, mirrorPct, until: this.time.now + bindDurationMs };
    this.floatingText.show(target.x, target.y - 36, 'bound', '#c9a0ff', { fontSize: 12, riseBy: 14, durationMs: 900, depth: 14 });
    this.lastCombatTime = this.time.now;
    return true;
  }

  /** MELEE-STRIKE HOOK: a player strike whose hit area covers the doll mirrors
   *  mirrorPct of the strike's damage to the bound target (any range). */
  private maybeVoodooMirror(x: number, y: number, radius: number, dmg: number): void {
    const v = this.voodoo;
    if (!v || !v.doll.isAlive || !v.target.isAlive) return;
    if (Phaser.Math.Distance.Between(v.doll.x, v.doll.y, x, y) > radius + v.doll.config.bodyRadius) return;
    this.mirrorToBound(dmg * v.mirrorPct);
  }

  /** Land mirrored damage on the bound target (+ the STITCH splash around it when
   *  that upgrade is armed). The stitch never re-hits the bound target itself. */
  private mirrorToBound(amount: number): void {
    const v = this.voodoo;
    if (!v || !v.target.isAlive) return;
    const dealt = v.target.takeHit(amount);
    if (dealt > 0) {
      this.dmgDealtAccum += dealt;
      this.spawnDamageNumber(v.target.x, v.target.y - 24, dealt, '#c9a0ff');
      this.spawnSkillRing(v.target.x, v.target.y, 34, 0xc9a05a);
    }
    if (this.voodooStitch) {
      const st = this.voodooStitch;
      for (const e of this.combatEnemiesInRange(v.target.x, v.target.y, st.radius)) {
        if (e === v.target) continue;
        const d = e.takeHit(amount * st.pct);
        if (d > 0) {
          this.dmgDealtAccum += d;
          this.spawnDamageNumber(e.x, e.y - 24, d, '#a98aff');
        }
      }
    }
    this.lastCombatTime = this.time.now;
  }

  /** DOLL REFLECT (contact hits only): the enemy at (ex,ey) whose hit just landed
   *  on the doll takes the armed reflect damage back. */
  private maybeVoodooReflect(summon: AlliedSummon, ex: number, ey: number): void {
    if (summon.config.key !== VOODOO_DOLL_CONFIG.key || this.voodooReflectDamage <= 0) return;
    const striker = this.nearestEnemy(ex, ey, 60);
    if (!striker) return;
    const dealt = striker.takeHit(this.voodooReflectDamage);
    if (dealt > 0) {
      this.dmgDealtAccum += dealt;
      this.spawnDamageNumber(striker.x, striker.y - 24, dealt, '#ffd0a0');
    }
  }

  /** Per-frame: prune a lapsed/broken bind (the doll despawns when its target
   *  dies), run the SPIRIT ASSAULT ticks, and drive the SPIRIT SPLIT pulses. */
  private updateVoodoo(): void {
    const now = this.time.now;
    const v = this.voodoo;
    if (v) {
      if (now >= v.until || !v.doll.isAlive || !v.target.isAlive) {
        if (!v.target.isAlive) this.summons.clearKey(VOODOO_DOLL_CONFIG.key); // despawns with its target
        this.voodoo = null;
      } else if (this.voodooAssault) {
        // SPIRIT ASSAULT (armed only while owned): defense-bypassing direct ticks.
        if (now >= this.voodooAssault.nextAt) {
          this.voodooAssault.nextAt = now + this.voodooAssault.tickMs;
          const dealt = v.target.takeHit(this.voodooAssault.damage);
          if (dealt > 0) {
            this.dmgDealtAccum += dealt;
            this.spawnDamageNumber(v.target.x, v.target.y - 24, dealt, '#9a6cff');
          }
        }
      }
    }
    const sp = this.spiritSplit;
    if (sp) {
      if (now >= sp.until || this.playerDead) {
        this.spiritSplit = null;
      } else if (now >= sp.nextAt) {
        sp.nextAt = now + sp.intervalMs;
        this.mirrorToBound(sp.pulseDamage); // the doll strikes itself — no input
      }
    }
    if (this.allyBond && now >= this.allyBond.until) this.allyBond = null;
  }

  /** SPIRIT DECOY: a spectral duplicate on the summon foundation — MAGNET-tier
   *  aggro (the Polar Bear's tier), attacks nothing, has HP, expires. */
  spawnSpiritDecoy(durationMsOverride?: number): AlliedSummon {
    const d = this.summonAlliedUnits(SPIRIT_DECOY_CONFIG, 1, SPIRIT_DECOY_TUNING.maxConcurrent, durationMsOverride)[0];
    this.showBanner('The spirit steps out', 1100);
    return d;
  }

  /** ALLY-BOND (friendly Entangled Chains): for `durationMs`, sharePct of damage
   *  the player would take is redirected to live summons (split evenly) BEFORE
   *  block/shield/HP — the player takes only the remainder. */
  startAllyBond(sharePct: number, durationMs: number): void {
    this.allyBond = { sharePct, until: this.time.now + durationMs };
    this.spawnSkillRing(this.player.x, this.player.y, 90, 0x8fe8d0);
    this.showBanner('Souls bound together', 1200);
  }

  /** The playerHealth.redirect hook: siphon the ally-bond share onto live summons.
   *  Returns the amount redirected (Health subtracts it before shield/HP). */
  private allyBondRedirect(amount: number): number {
    const b = this.allyBond;
    if (!b || this.time.now >= b.until) return 0;
    const live = this.summons.list.filter((s) => s.isAlive);
    if (live.length === 0) return 0;
    const share = amount * b.sharePct;
    const per = share / live.length;
    for (const s of live) {
      const dealt = s.takeHit(per);
      if (dealt > 0) this.spawnDamageNumber(s.x, s.y - 30, dealt, '#bfefff');
    }
    return share;
  }

  /** SPIRIT SPLIT (composite of the doll + the decoy): for `durationMs` the decoy
   *  walks (a normal magnet summon) while the doll AUTO-MIRRORS `pulseDamage` to
   *  the bound target on a cadence with no player strike. */
  startSpiritSplit(durationMs: number, intervalMs: number, pulseDamage: number): void {
    this.spawnSpiritDecoy(durationMs);
    this.spiritSplit = { until: this.time.now + durationMs, nextAt: this.time.now + intervalMs, intervalMs, pulseDamage };
    this.showBanner('SPIRIT AND BODY DIVIDE', 1400);
  }

  // --- Samurai framework: parry/riposte + iaijutsu + dash-and-fire --------------

  /** PARRY (the kit's centerpiece; reusable): open a brief window — the next
   *  incoming MELEE hit is fully negated and the attacker eats `riposteDamage`
   *  (plus the Counterstrike bonus while owned). One hit per window; unused
   *  windows lapse silently; ranged hits never enter the gate. */
  openParryWindow(windowMs: number, riposteDamage: number, opts?: { deflectProjectiles?: boolean; projectileRiposteMult?: number }): void {
    // DEFLECT (Monk config of the same window): opts.deflectProjectiles turns
    // aside PROJECTILE hits too, riposting at the (lighter) projectile multiplier.
    // The Samurai's parry passes no opts — melee-only, untouched.
    this.parry = { until: this.time.now + windowMs, riposteDamage, deflectProjectiles: opts?.deflectProjectiles ?? false, projectileRiposteMult: opts?.projectileRiposteMult ?? 1 };
    this.spawnSkillRing(this.player.x, this.player.y, 40, 0xd8e8ff);
  }

  /** THE PROJECTILE DEFLECT GATE: the ranged damage path calls this first; only
   *  a window opened WITH deflectProjectiles intercepts (the Samurai parry never
   *  does). The riposte snaps back at the nearest enemy, scaled by the lighter
   *  projectile multiplier. One hit per window, same as the melee gate. */
  private deflectProjectileGate(): boolean {
    const now = this.time.now;
    if (!this.parry || now >= this.parry.until || !this.parry.deflectProjectiles) return false;
    const riposte = this.parry.riposteDamage * this.parry.projectileRiposteMult + this.parryRiposteBonus;
    this.parry = null; // one hit per window
    if (this.parryRefundEnergy > 0) this.energy.heal(this.parryRefundEnergy);
    const striker = this.nearestEnemy(this.player.x, this.player.y, 520);
    if (striker) {
      const dealt = striker.takeHit(riposte);
      if (dealt > 0) {
        this.dmgDealtAccum += dealt;
        this.spawnDamageNumber(striker.x, striker.y - 24, dealt, '#a8ffd0');
      }
    }
    this.spawnSkillRing(this.player.x, this.player.y, 46, 0xa8ffd0);
    this.floatingText.show(this.player.x, this.player.y - 34, 'DEFLECT', '#a8ffd0', { fontSize: 14, riseBy: 16, durationMs: 700, depth: 14 });
    this.parryCount++;
    this.lastCombatTime = now;
    return true;
  }

  /** PERFECT FORM (ultimate upgrade): for `durationMs` EVERY incoming melee hit
   *  is auto-parried (riposting for `riposteDamage`) while the player keeps
   *  acting freely — defense through timing, never armor. */
  startPerfectForm(durationMs: number, riposteDamage: number): void {
    this.perfectFormUntil = this.time.now + durationMs;
    this.perfectFormRiposte = riposteDamage;
    this.showBanner('PERFECT FORM', 1400);
  }

  /** THE MELEE PARRY GATE: every enemy MELEE damage path calls this FIRST and
   *  skips its hit when it returns true (negated + riposte landed). Ranged
   *  paths (bolts, beams, DoT ticks) never call it. */
  private parryGate(ex: number, ey: number): boolean {
    const now = this.time.now;
    if (now < this.vanishGraceUntil) return true; // VANISH: the breath of untargetability — the swing meets nothing

    const perfect = now < this.perfectFormUntil;
    const windowOpen = this.parry !== null && now < this.parry.until;
    if (!perfect && !windowOpen) {
      if (this.parry) this.parry = null; // an expired window lapses silently
      return false;
    }
    const riposte = (perfect ? this.perfectFormRiposte : this.parry!.riposteDamage) + this.parryRiposteBonus;
    if (!perfect) this.parry = null; // one hit per window
    if (this.parryRefundEnergy > 0) this.energy.heal(this.parryRefundEnergy); // COUNTERSTRIKE refund
    const striker = this.nearestEnemy(ex, ey, 100);
    if (striker) {
      const dealt = striker.takeHit(riposte);
      if (dealt > 0) {
        this.dmgDealtAccum += dealt;
        this.spawnDamageNumber(striker.x, striker.y - 24, dealt, '#ffe9a8');
      }
    }
    this.spawnSkillRing(this.player.x, this.player.y, 46, 0xffe9a8);
    this.floatingText.show(this.player.x, this.player.y - 34, 'PARRY', '#ffe9a8', { fontSize: 14, riseBy: 16, durationMs: 700, depth: 14 });
    this.parryCount++;
    this.lastCombatTime = now;
    return true;
  }

  /** IAIJUTSU (count-1 consume-buff on the Amplification pattern): arm the sheathe —
   *  the NEXT strike inside the window is multiplied + briefly stuns, then consumes. */
  armIaijutsu(windowMs: number, mult: number, stunMs: number): void {
    this.iaijutsu = { until: this.time.now + windowMs, mult, stunMs };
    this.spawnSkillRing(this.player.x, this.player.y, 44, 0xffe9a8);
    this.showBanner('Sheathed \u2014 one breath', 1000);
  }

  /** DASH-AND-FIRE: a charge that releases a composed BOLT mid-movement (fired
   *  `fireDelayMs` into the dash, in the facing direction) — the Sonic Surge
   *  dash-composite pattern with a projectile instead of a trail. */
  dashAndFire(dash: { distance: number; damage: number; knockdownMs: number }, bolt: ComposedStep, fireDelayMs = 140): void {
    this.startCharge(dash);
    this.time.delayedCall(fireDelayMs, () => {
      if (this.playerDead) return;
      this.runComposedSteps([bolt]);
    });
  }

  // --- Monk framework: pulse ring + the ally rule -------------------------------

  /** MOBILE DAMAGE PULSE ZONE: a ring that FOLLOWS the caster, pulsing damage
   *  around them every `intervalMs` (the mobile friendly zone's follow idea,
   *  damage-flavored). One at a time; re-cast restarts it. */
  startPulseRing(durationMs: number, intervalMs: number, radius: number, damage: number, tint = 0xffd8a0): void {
    this.pulseRing = { until: this.time.now + durationMs, nextAt: this.time.now, intervalMs, radius, damage, tint };
  }

  /** Per-frame: the pulse ring ticks AT THE CASTER'S CURRENT POSITION. */
  private updatePulseRing(): void {
    const pr = this.pulseRing;
    if (!pr) return;
    if (this.time.now >= pr.until || this.playerDead) {
      this.pulseRing = null;
      return;
    }
    if (this.time.now < pr.nextAt) return;
    pr.nextAt = this.time.now + pr.intervalMs;
    this.spawnSkillRing(this.player.x, this.player.y, pr.radius, pr.tint);
    if (this.combatEnemiesInRange(this.player.x, this.player.y, pr.radius).length > 0) {
      this.aoeHitAll(this.player.x, this.player.y, pr.radius, pr.damage);
    }
  }

  /** ALLY RULE: the most-injured LIVE friendly unit (allied summon — the Astral
   *  decoy counts) within `range` of the caster, or null when none stands. */
  mostInjuredAlly(range: number): AlliedSummon | null {
    let best: AlliedSummon | null = null;
    let bestRatio = Number.POSITIVE_INFINITY;
    for (const sm of this.summons.list) {
      if (!sm.isAlive) continue;
      if (Phaser.Math.Distance.Between(sm.x, sm.y, this.player.x, this.player.y) > range) continue;
      const ratio = sm.health.current / sm.health.max;
      if (ratio < bestRatio) {
        bestRatio = ratio;
        best = sm;
      }
    }
    return best;
  }

  /** HP-COST HEAL TO A FRIENDLY (Life Infusion): pay `cost` of your own health
   *  to mend the most-injured ally by `heal`. Returns false (a graceful whiff —
   *  the caller's cooldown/energy are refunded) when no ally stands or the
   *  caster can't afford the cost. */
  transferHealToAlly(range: number, cost: number, heal: number): boolean {
    const ally = this.mostInjuredAlly(range);
    if (!ally) {
      this.showBanner('No ally to receive it', 1000);
      return false;
    }
    if (this.playerHealth.current <= cost) {
      this.showBanner('Not enough life to give', 1000);
      return false;
    }
    this.playerHealth.current -= cost; // the gift is willing — it bypasses shields
    this.spawnDamageNumber(this.player.x, this.player.y - 26, cost, '#ff7a7a');
    ally.health.heal(heal);
    this.spawnDamageNumber(ally.x, ally.y - 26, heal, '#a8ffd0');
    this.spawnSkillRing(ally.x, ally.y, 50, 0xa8ffd0);
    this.lastCombatTime = this.time.now;
    return true;
  }

  // --- Assassin framework: the trap system + stealth riders ---------------------

  /** Place a TRAP DEVICE at (x,y). Capped placements recycle the OLDEST capped
   *  device once trapCap are out (never a refused cast); Minefield's devices are
   *  uncapped. The device arms after armDelayMs (dim while arming), triggers on
   *  the first enemy inside triggerRadius, executes its payload, and is consumed. */
  placeTrap(x: number, y: number, cfg: TrapConfig): void {
    const capped = cfg.countsTowardCap !== false;
    if (capped) {
      while (this.traps.filter((t) => t.capped).length >= this.trapCap) {
        const oldest = this.traps.find((t) => t.capped);
        if (!oldest) break;
        this.removeTrap(oldest);
      }
    }
    const now = this.time.now;
    const tint = cfg.tint ?? 0xffb060;
    const fx = this.add.circle(x, y, 7, tint, 0.5).setStrokeStyle(2, tint, 0.9).setDepth(6);
    fx.setAlpha(0.3); // dim while arming; updateTraps brightens it once armed
    this.worldFx.add(fx);
    this.traps.push({
      x, y,
      armedAt: now + cfg.armDelayMs,
      expireAt: now + cfg.lifetimeMs,
      triggerRadius: cfg.triggerRadius,
      payload: cfg.payload,
      damageMult: cfg.damageMult ?? 1,
      capped,
      tint,
      fx,
    });
  }

  /** MINEFIELD (the multi-place hook): seed `count` devices in a ring across the
   *  target area — each a normal device (same lifecycle), placed UNCAPPED. */
  placeMinefield(cx: number, cy: number, count: number, spreadRadius: number, cfg: Omit<TrapConfig, 'countsTowardCap'>): void {
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2;
      const dist = i === 0 ? 0 : spreadRadius * 0.75; // one center + a ring
      this.placeTrap(cx + Math.cos(ang) * dist, cy + Math.sin(ang) * dist, { ...cfg, countsTowardCap: false });
    }
  }

  /** REMOTE DETONATION (the trigger-now hook): every ARMED device fires its
   *  payload where it stands, enemy or no enemy. Returns how many fired. */
  detonateArmedTraps(): number {
    const now = this.time.now;
    const armed = this.traps.filter((t) => now >= t.armedAt);
    for (const t of armed) this.triggerTrap(t);
    return armed.length;
  }

  /** Per-frame trap lifecycle: expire the stale, brighten the newly armed, and
   *  spring any armed device with an enemy inside its radius. */
  private updateTraps(): void {
    if (this.traps.length === 0) return;
    const now = this.time.now;
    for (const t of [...this.traps]) {
      if (now >= t.expireAt) {
        this.removeTrap(t);
        continue;
      }
      if (now < t.armedAt) continue;
      t.fx.setAlpha(0.85);
      if (this.combatEnemiesInRange(t.x, t.y, t.triggerRadius).length > 0) this.triggerTrap(t);
    }
  }

  /** Execute a device's PAYLOAD (each half a shipped effect) and consume it. */
  private triggerTrap(t: (typeof this.traps)[number]): void {
    const p = t.payload;
    const r = p.burstRadius ?? t.triggerRadius;
    this.spawnSkillRing(t.x, t.y, r, t.tint);
    if (p.burstDamage) this.aoeHitAll(t.x, t.y, r, this.skillDamage(p.burstDamage) * t.damageMult);
    if (p.rootMs) this.rootNearestEnemy(t.x, t.y, r, p.rootMs);
    if (p.confuse) this.confuseNearestEnemy(t.x, t.y, r, p.confuse.chance, p.confuse.durationMs, p.confuse.chipDamage ?? 8, p.confuse.chipMs ?? 700);
    if (p.zone) {
      const z = p.zone;
      const opts: { slowFactor?: number; weaken?: number; fill?: number; stroke?: number } = {};
      if (z.slowFactor !== undefined) opts.slowFactor = z.slowFactor;
      if (z.weaken !== undefined) opts.weaken = z.weaken;
      if (z.fill !== undefined) opts.fill = z.fill;
      if (z.stroke !== undefined) opts.stroke = z.stroke;
      this.spawnSpellHazard(t.x, t.y, z.radius, z.tickDamage > 0 ? this.skillDamage(z.tickDamage) * t.damageMult : 0, z.durationMs, z.tickMs, Object.keys(opts).length ? opts : undefined);
    }
    this.lastCombatTime = this.time.now;
    this.removeTrap(t);
  }

  /** Remove a device (triggered / expired / recycled / reset) + its marker. */
  private removeTrap(t: (typeof this.traps)[number]): void {
    this.tweens.killTweensOf(t.fx);
    t.fx.destroy();
    const i = this.traps.indexOf(t);
    if (i >= 0) this.traps.splice(i, 1);
  }

  /** Clear every device (reset/load/death/world swap — traps never survive). */
  private clearTraps(): void {
    for (const t of [...this.traps]) this.removeTrap(t);
    this.shadowDanceUntil = 0;
    this.vanishGraceUntil = 0;
  }

  /** SHADOW DANCE: for durationMs, attacking does NOT break stealth and every
   *  stealth-bonus strike keeps its bonus. Enters stealth if not already in it. */
  startShadowDance(durationMs: number): void {
    this.shadowDanceUntil = this.time.now + durationMs;
    if (!this.playerStealthActive) this.startPlayerStealth(durationMs);
    else this.playerStealthUntil = Math.max(this.playerStealthUntil, this.shadowDanceUntil);
  }

  /** VANISH: the instant in-combat re-stealth + a breath of untargetability
   *  (melee and bolts pass through until the grace ends). */
  vanish(stealthMs: number, graceMs: number): void {
    this.startPlayerStealth(stealthMs);
    this.vanishGraceUntil = this.time.now + graceMs;
    this.spawnSkillRing(this.player.x, this.player.y, 44, 0x9a9ab8);
  }

  // --- Priest framework: ally-shield + dual channel + the dormant revive --------

  /** TARGETED ALLY-SHIELD: wrap the nearest allied summon within `range` in an
   *  absorb pool; with none the CASTER takes it (self is always valid — a solo
   *  cast never whiffs). Player pools ride the Mana Shield machinery + grant
   *  brief HARM IMMUNITY; summon pools use the same Health.shield absorb math
   *  and are zeroed on expiry. Returns who received it (gate-observable). */
  allyShield(range: number, amount: number, durationMs: number, immunityMs = 0): 'self' | 'summon' {
    const now = this.time.now;
    let best: AlliedSummon | null = null;
    let bestD = range;
    for (const sm of this.summons.list) {
      if (!sm.isAlive) continue;
      const d = Phaser.Math.Distance.Between(sm.x, sm.y, this.player.x, this.player.y);
      if (d <= bestD) {
        bestD = d;
        best = sm;
      }
    }
    if (best) {
      this.shieldSummon(best, amount, durationMs);
      return 'summon';
    }
    this.playerHealth.shield = Math.max(this.playerHealth.shield, amount);
    this.shieldUntil = now + durationMs;
    if (immunityMs > 0) this.harmImmuneUntil = now + immunityMs;
    this.spawnSkillRing(this.player.x, this.player.y, 56, 0xffe9a8);
    return 'self';
  }

  /** Grant ONE allied summon an expiring absorb pool (the AoE shields loop this). */
  shieldSummon(sm: AlliedSummon, amount: number, durationMs: number): void {
    sm.health.shield = Math.max(sm.health.shield, amount);
    this.allyShields.push({ health: sm.health, until: this.time.now + durationMs });
    this.spawnSkillRing(sm.x, sm.y, 46, 0xffe9a8);
  }

  /** Expire summon ally-shield pools (the player's rides shieldUntil already). */
  private updateAllyShields(): void {
    if (this.allyShields.length === 0) return;
    const now = this.time.now;
    for (const s of this.allyShields) if (now >= s.until) s.health.shield = 0;
    this.allyShields = this.allyShields.filter((s) => now < s.until);
  }

  /** DUAL CHANNEL: start the heal-and-harm beam (extension #2). One at a time;
   *  a re-cast restarts it. Numbers arrive pre-scaled by the caller. */
  startDualChannel(durationMs: number, tickMs: number, healPerTick: number, dmgPerTick: number, length: number, width: number): void {
    this.cancelDualChannel();
    const fx = this.add.graphics().setDepth(7);
    this.worldFx.add(fx);
    this.dualChannel = { until: this.time.now + durationMs, nextAt: this.time.now, tickMs, healPerTick, dmgPerTick, length, width, fx };
  }

  /** End the dual channel now (expiry / reset / death). */
  private cancelDualChannel(): void {
    if (!this.dualChannel) return;
    this.dualChannel.fx.destroy();
    this.dualChannel = null;
  }

  /** Per-frame: the beam tracks the caster's position + facing; each tick it
   *  HEALS the caster and every allied summon inside the corridor and DAMAGES
   *  every enemy it crosses. */
  private updateDualChannel(): void {
    const dc = this.dualChannel;
    if (!dc) return;
    if (this.time.now >= dc.until || this.playerDead) {
      this.cancelDualChannel();
      return;
    }
    const px = this.player.x;
    const py = this.player.y;
    const { dx, dy } = this.facingUnit();
    dc.fx.clear();
    dc.fx.lineStyle(dc.width, 0xffe9a8, 0.3);
    dc.fx.lineBetween(px, py, px + dx * dc.length, py + dy * dc.length);
    if (this.time.now < dc.nextAt) return;
    dc.nextAt = this.time.now + dc.tickMs;
    // Corridor test: projected along the beam axis + perpendicular distance.
    const inBeam = (x: number, y: number, pad: number): boolean => {
      const rx = x - px;
      const ry = y - py;
      const t = rx * dx + ry * dy;
      if (t < 0 || t > dc.length) return false;
      return Math.abs(rx * dy - ry * dx) <= dc.width / 2 + pad;
    };
    this.playerHealth.heal(dc.healPerTick); // the caster stands at the beam's root
    for (const sm of this.summons.list) {
      if (sm.isAlive && inBeam(sm.x, sm.y, 10)) {
        sm.health.heal(dc.healPerTick);
        this.spawnDamageNumber(sm.x, sm.y - 22, dc.healPerTick, '#a8ffd0');
      }
    }
    for (const e of this.combatEnemiesInRange(px + dx * (dc.length / 2), py + dy * (dc.length / 2), dc.length / 2 + 60)) {
      if (inBeam(e.x, e.y, 12)) this.damageOneEnemy(e, dc.dmgPerTick);
    }
    this.lastCombatTime = this.time.now;
  }

  /** THE REVIVE PRIMITIVE (Divine Intervention) — PARTY-DORMANT: parties don't
   *  exist yet, and fallen summons dissolve rather than leave a body, so there
   *  is never a fallen friendly to raise TODAY. This hook is the seam a future
   *  party system fills in; until then every cast is a graceful, fully refunded
   *  whiff (the ally rule). Returns true only once it actually raises someone. */
  reviveFallenAlly(): boolean {
    return false; // no party roster yet — nothing fallen can be found
  }

  /** Clear every Priest transient (reset/load/death/world swap). */
  private clearPriestState(): void {
    this.cancelDualChannel();
    for (const s of this.allyShields) s.health.shield = 0;
    this.allyShields = [];
    this.harmImmuneUntil = 0;
    // Savage transients ride the same reset: momentum never survives it.
    if (this.frenzy) {
      this.frenzy.stacks = 0;
      this.frenzy.until = 0;
    }
  }

  // --- Savage framework: frenzy + leap-slam + blood price + the execute --------

  /** Arm the FRENZY momentum state (a keyed passive owns this; the gate calls
   *  it directly). Disarm with {@link disarmFrenzy}. */
  armFrenzy(perStackMult: number, maxStacks: number, decayMs: number): void {
    this.frenzy = { perStackMult, maxStacks, decayMs, stacks: 0, until: 0 };
  }

  disarmFrenzy(): void {
    this.frenzy = null;
  }

  /** The frenzy damage multiplier (1 while disarmed/at zero stacks) — folded
   *  into playerDamage() and skillDamage(), so EVERY damage path scales. */
  private frenzyMult(): number {
    const f = this.frenzy;
    return f && f.stacks > 0 ? 1 + f.stacks * f.perStackMult : 1;
  }

  /** Per-frame frenzy bookkeeping, fed the frame's dealt-damage accumulator
   *  (called at the lifesteal flush, before the accumulator resets): blood
   *  drawn this frame = +1 stack + a fresh decay window; silence past the
   *  window drops every stack at once. */
  private updateFrenzy(dealtThisFrame: number): void {
    const f = this.frenzy;
    if (!f) return;
    if (dealtThisFrame > 0) {
      f.stacks = Math.min(f.maxStacks, f.stacks + 1);
      f.until = this.time.now + f.decayMs;
    } else if (f.stacks > 0 && this.time.now >= f.until) {
      f.stacks = 0;
    }
  }

  /** LEAP-SLAM: an aimed jump along the facing — land `distance` out (halted
   *  at unwalkable ground), slam an AoE, and KNOCK DOWN (stun) what it hits.
   *  Damage arrives pre-scaled by the caller. */
  leapSlam(distance: number, radius: number, damage: number, stunMs: number): void {
    this.breakPlayerStealth(); // it's an attack
    const { dx, dy } = this.facingUnit();
    const w = this.activeMap().nearestWalkableWorld(this.player.x + dx * distance, this.player.y + dy * distance) ?? { x: this.player.x + dx * distance, y: this.player.y + dy * distance };
    (this.player.sprite.body as Phaser.Physics.Arcade.Body).reset(w.x, w.y);
    this.spawnSkillRing(w.x, w.y, radius, 0xff8a5a);
    this.aoeHitAll(w.x, w.y, radius, damage);
    this.stunEnemiesInRange(w.x, w.y, radius, stunMs);
    this.lastCombatTime = this.time.now;
  }

  /** Pay a cast's BLOOD PRICE: health, not Faith/energy — the willing cut
   *  bypasses shields. Returns false (a graceful refusal; the caller flags
   *  actionWhiffed so cooldown + energy refund) when it would bleed you out. */
  payBloodPrice(cost: number): boolean {
    if (this.playerHealth.current <= cost) {
      this.showBanner('Your blood runs too thin', 1000);
      return false;
    }
    this.playerHealth.current -= cost;
    this.spawnDamageNumber(this.player.x, this.player.y - 26, cost, '#ff7a7a');
    return true;
  }

  /** HP-THRESHOLD EXECUTE: the finisher variant keyed off LOW HEALTH — enemies
   *  at/below `threshold` (fraction of max HP) take damage × mult; the rest
   *  take the ordinary blow. Returns counts (gate-observable). */
  executeHitAll(x: number, y: number, radius: number, damage: number, threshold: number, mult: number, tint = 0xff8a5a): { hit: number; executed: number } {
    let hit = 0;
    let executed = 0;
    this.spawnSkillRing(x, y, radius, tint);
    for (const e of this.combatEnemiesInRange(x, y, radius)) {
      const qualifies = e.health.current / e.health.max <= threshold;
      const dealt = e.takeHit(qualifies ? damage * mult : damage);
      if (dealt > 0) {
        this.dmgDealtAccum += dealt;
        this.spawnDamageNumber(e.x, e.y - 24, dealt, qualifies ? '#ff8a5a' : '#ffffff');
      }
      hit++;
      if (qualifies) executed++;
    }
    this.lastCombatTime = this.time.now;
    return { hit, executed };
  }

  // --- DoT (damage-over-time) + contagion primitive (Toxic Bolt / Plague) -------

  /** Apply a poison DoT to every live enemy within (x,y,radius) — used by Toxic Bolt's
   *  impact field. Each gets independent ticks for `durationMs`. */
  private applyDotInRange(x: number, y: number, radius: number, dmgPerTick: number, tickMs: number, durationMs: number, color: number): void {
    for (const e of this.combatEnemiesInRange(x, y, radius)) this.addDot(e, dmgPerTick, tickMs, durationMs, color);
  }

  /** PLAGUE: apply a CONTAGIOUS DoT to enemies near (x,y) — it spreads to nearby enemies
   *  (sharing one budget so total infections are capped at `maxSpread`). */
  private applyPlagueInRange(x: number, y: number, radius: number, dmgPerTick: number, tickMs: number, durationMs: number, spreadRadius: number, maxSpread: number): void {
    const budget = { remaining: maxSpread };
    for (const e of this.combatEnemiesInRange(x, y, radius)) {
      this.addDot(e, dmgPerTick, tickMs, durationMs, 0x9acd32, { radius: spreadRadius, budget });
    }
  }

  /** Add a DoT to an enemy (skips a duplicate from the same contagion budget). */
  private addDot(target: CombatEnemy, dmgPerTick: number, tickMs: number, durationMs: number, color: number, spread?: { radius: number; budget: { remaining: number } }): void {
    if (!target.isAlive) return;
    if (spread && this.dots.some((d) => d.target === target && d.spread?.budget === spread.budget)) return; // already infected this cast
    const now = this.time.now;
    this.dots.push({ target, dmgPerTick, tickMs, nextTickAt: now + tickMs, expireAt: now + durationMs, color, spread });
  }

  /**
   * STACKING-DoT PRIMITIVE (generic; reusable by any stacking-DoT skill). Adds ONE stack of a
   * DoT keyed by `stackKey` to `target`. Model: each application pushes an INDEPENDENT stack
   * with its OWN duration, and EVERY stack ticks — so total damage = the sum of active stacks.
   * Capped at `maxStacks` per (target, stackKey): at the cap, the OLDEST stack's duration
   * refreshes instead of adding a new one. Built on the same `dots` array as the existing
   * non-stacking DoTs (which carry no stackKey and are untouched).
   */
  private addStackingDot(target: CombatEnemy, stackKey: string, dmgPerTick: number, tickMs: number, durationMs: number, maxStacks: number, color: number): void {
    if (!target.isAlive) return;
    const now = this.time.now;
    const stacks = this.dots.filter((d) => d.target === target && d.stackKey === stackKey);
    if (stacks.length >= Math.max(1, maxStacks)) {
      // At the cap: refresh the soonest-to-expire stack (keeps the cloud alive, no growth).
      let oldest = stacks[0];
      for (const d of stacks) if (d.expireAt < oldest.expireAt) oldest = d;
      oldest.expireAt = now + durationMs;
    } else {
      this.dots.push({ target, dmgPerTick, tickMs, nextTickAt: now + tickMs, expireAt: now + durationMs, color, stackKey });
    }
    const count = this.dots.filter((d) => d.target === target && d.stackKey === stackKey).length;
    this.spawnStackIndicator(target, count, color);
  }

  /** A small floating "xN" stack indicator over an enemy each time a stacking DoT is applied. */
  private spawnStackIndicator(target: CombatEnemy, count: number, color: number): void {
    const hex = '#' + (color & 0xffffff).toString(16).padStart(6, '0');
    const t = this.add
      .text(target.x, target.y - 38, `☠×${count}`, { fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: hex, fontStyle: 'bold' })
      .setOrigin(0.5)
      .setDepth(15);
    this.worldFx.add(t);
    this.tweens.add({ targets: t, y: target.y - 56, alpha: 0, duration: 800, onComplete: () => t.destroy() });
  }

  /** Per-frame: tick every DoT (+ spread contagion), then prune finished/dead ones. */
  private updateDots(): void {
    if (this.dots.length === 0) return;
    const now = this.time.now;
    for (const d of this.dots) {
      if (!d.target.isAlive || now >= d.expireAt) continue;
      if (now >= d.nextTickAt) {
        d.nextTickAt = now + d.tickMs;
        this.damageOneEnemy(d.target, d.dmgPerTick);
        // Contagion: an infected enemy spreads the plague to nearby uninfected enemies.
        if (d.spread && d.spread.budget.remaining > 0 && d.target.isAlive) {
          for (const e of this.combatEnemiesInRange(d.target.x, d.target.y, d.spread.radius)) {
            if (d.spread.budget.remaining <= 0) break;
            if (e === d.target) continue;
            if (this.dots.some((o) => o.target === e && o.spread?.budget === d.spread!.budget)) continue;
            d.spread.budget.remaining -= 1;
            this.addDot(e, d.dmgPerTick, d.tickMs, d.expireAt - now, d.color, d.spread);
          }
        }
      }
    }
    if (this.dots.some((d) => !d.target.isAlive || now >= d.expireAt)) {
      this.dots = this.dots.filter((d) => d.target.isAlive && now < d.expireAt);
    }
  }

  /** Damage EXACTLY one enemy with full per-type rewards (reuses aoeHitAll with a predicate
   *  that matches only this enemy's live position). The reward-correct single-target hit
   *  behind the DoT ticks — no per-enemy-type plumbing needed. */
  private damageOneEnemy(e: CombatEnemy, dmg: number): void {
    this.aoeHitAll(e.x, e.y, 1, dmg, (ex, ey) => ex === e.x && ey === e.y);
  }

  /** Remove every active DoT + the timed poison weaken + the Ethereal survival state (Mana
   *  Shield / Ankh ward) — the transient Wizard combat effects. Called on reset/load/death. */
  private clearDots(): void {
    this.dots = [];
    this.poisonWeakenUntil = 0;
    this.poisonWeakenFactor = 0;
    // Hostile (dark-caster) debuffs on the player never survive a reset/load/death.
    this.casterSlowUntil = 0;
    this.casterWeakenUntil = 0;
    this.casterDotStacks = [];
    this.casterDotNextTickAt = 0;
    if (this.player) this.player.slowFactor = 1;
    this.shieldUntil = 0;
    this.ankhArmedUntil = 0;
    if (this.playerHealth) this.playerHealth.shield = 0;
    this.cancelChannelSilent(); // a transient channel never survives a reset/load/death/world swap
  }

  // --- CHANNELED-BEAM PRIMITIVE -------------------------------------------------
  //
  // tap → lock the NEAREST enemy in range → beam for durationMs (or until it dies) → tick
  // damage + optional energy/sec → cooldown on end. Interrupted by MOVING (any joystick
  // input) or activating ANY skill (both handled at their source: the move read + activateSkill).

  /** Begin a channel on the nearest enemy in range. Whiffs free (no cost) if nothing is in
   *  range; else spends the energy and locks on. Cooldown is deferred until the channel ENDS. */
  private tryStartChannel(id: string, e: Extract<SkillEffect, { kind: 'channel' }>): void {
    const target = this.nearestEnemy(this.player.x, this.player.y, e.range);
    if (!target) {
      this.showBanner('No target in range', 800);
      return;
    }
    if (e.energyCost && e.energyCost > 0) {
      this.energy.damage(e.energyCost);
      this.lastEnergySpendTime = this.time.now;
    }
    const now = this.time.now;
    const beam = this.add.graphics().setDepth(11);
    this.worldFx.add(beam);
    this.channel = {
      skillId: id,
      target,
      endsAt: now + e.durationMs,
      nextTickAt: now + e.tickMs,
      tickMs: e.tickMs,
      dmgPerTick: e.damagePerTick,
      resourcePerSec: e.resourcePerSec ?? 0,
      cooldownMs: e.cooldownMs,
      interruptFraction: e.interruptCooldownFraction ?? 1,
      resourceAccum: 0,
      beam,
    };
    this.drawChannelBeam();
    this.showBanner('Channeling…', 700);
    this.lastCombatTime = now;
  }

  /** Per-frame: tick the channel's damage + energy trickle + redraw the beam; end on target
   *  death or duration. (Movement / other-skill interrupts are handled at their call sites.) */
  private updateChannel(delta: number): void {
    const c = this.channel;
    if (!c) return;
    const now = this.time.now;
    // A dialogue/choice opening or the player dying interrupts the channel (clean end).
    if (this.playerDead || this.dialogue.isOpen() || this.choice.isOpen()) {
      this.endChannel(true);
      return;
    }
    if (!c.target.isAlive || now >= c.endsAt) {
      this.endChannel(false); // natural completion (target died or duration elapsed)
      return;
    }
    if (now >= c.nextTickAt) {
      c.nextTickAt = now + c.tickMs;
      this.damageOneEnemy(c.target, this.skillDamage(c.dmgPerTick));
      if (!c.target.isAlive) {
        this.endChannel(false);
        return;
      }
    }
    // Optional resource gain (energy/sec) — accrue fractionally, deposit whole points.
    if (c.resourcePerSec > 0 && this.energy.current < this.energy.max) {
      c.resourceAccum += (c.resourcePerSec * delta) / 1000;
      const whole = Math.floor(c.resourceAccum);
      if (whole > 0) {
        this.energy.heal(whole);
        c.resourceAccum -= whole;
      }
    }
    this.drawChannelBeam();
  }

  /** Draw the beam from the player to the locked target (a glowing violet stream + a node). */
  private drawChannelBeam(): void {
    const c = this.channel;
    if (!c) return;
    const g = c.beam;
    const px = this.player.x;
    const py = this.player.y - 18;
    const tx = c.target.x;
    const ty = c.target.y;
    const pulse = 0.6 + 0.4 * Math.sin(this.time.now / 60);
    g.clear();
    g.lineStyle(7, 0x4a2a7a, 0.5); // outer glow
    g.lineBetween(px, py, tx, ty);
    g.lineStyle(3, 0x9a6cff, 0.95); // bright core
    g.lineBetween(px, py, tx, ty);
    g.fillStyle(0xd9c7ff, pulse);
    g.fillCircle(tx, ty, 6); // impact node on the target
    g.fillStyle(0x9a6cff, 0.9);
    g.fillCircle(px, py, 4); // origin node at the caster
  }

  /** End the channel and start its cooldown. `interrupted` (move / other-skill / early stop)
   *  applies the interrupt cooldown fraction (default 1 = full); natural end uses full. */
  private endChannel(interrupted: boolean): void {
    const c = this.channel;
    if (!c) return;
    c.beam.destroy();
    this.channel = null;
    const cd = c.cooldownMs * (interrupted ? c.interruptFraction : 1);
    this.skillCooldownUntil[c.skillId] = this.time.now + cd;
    this.skillCooldownDur[c.skillId] = cd;
    if (interrupted) this.showBanner('Channel interrupted', 800);
  }

  /** Drop a channel with NO cooldown (reset / load / death / world change). */
  private cancelChannelSilent(): void {
    if (!this.channel) return;
    this.channel.beam.destroy();
    this.channel = null;
  }

  /** Set the timed player-incoming WEAKEN from Ice/Poison effects (latest/strongest wins). */
  private setPoisonWeaken(factor: number, durationMs: number): void {
    this.poisonWeakenUntil = Math.max(this.poisonWeakenUntil, this.time.now + durationMs);
    this.poisonWeakenFactor = Math.max(this.poisonWeakenFactor, factor);
  }

  /** A translucent cone wedge FX (Dust Devil), fading out (world FX, main camera). */
  private spawnConeFx(px: number, py: number, dx: number, dy: number, range: number, halfAngle: number, color: number): void {
    const ang = Math.atan2(dy, dx);
    const x1 = px + Math.cos(ang - halfAngle) * range;
    const y1 = py + Math.sin(ang - halfAngle) * range;
    const x2 = px + Math.cos(ang + halfAngle) * range;
    const y2 = py + Math.sin(ang + halfAngle) * range;
    const g = this.add.graphics().setDepth(13);
    g.fillStyle(color, 0.25);
    g.beginPath();
    g.moveTo(px, py);
    g.lineTo(x1, y1);
    g.lineTo(x2, y2);
    g.closePath();
    g.fillPath();
    this.worldFx.add(g);
    this.tweens.add({ targets: g, alpha: 0, duration: 320, ease: 'Quad.out', onComplete: () => g.destroy() });
  }

  /** A thick line/wall wind FX (Jet Stream), fading out (world FX, main camera). */
  private spawnLineFx(x1: number, y1: number, x2: number, y2: number, width: number, color: number): void {
    const g = this.add.graphics().setDepth(13);
    g.lineStyle(width, color, 0.3);
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.strokePath();
    this.worldFx.add(g);
    this.tweens.add({ targets: g, alpha: 0, duration: 340, ease: 'Quad.out', onComplete: () => g.destroy() });
  }

  /** CHARGE (Control #1): a forward rush reusing the dash movement; enemies in the
   *  path are damaged + KNOCKED DOWN (a brief stun). Independent of the dodge cooldown. */
  private startCharge(cfg: { distance: number; damage: number; knockdownMs: number } = CONTROL_TUNING.charge): void {
    this.chargeCfg = cfg;
    const len = Math.hypot(this.player.facingX, this.player.facingY) || 1;
    this.dashDir = { x: this.player.facingX / len, y: this.player.facingY / len };
    this.dashEndsAt = this.time.now + (cfg.distance / DASH_SPEED) * 1000;
    this.chargeHits.clear();
    this.chargeActive = true;
  }

  /** CHARGE per-frame: damage + knock down each enemy in the path once. */
  private chargeTick(): void {
    const c = this.chargeCfg;
    const px = this.player.x;
    const py = this.player.y;
    const r = DASH_HIT_RADIUS + 16;
    for (const e of this.combatEnemiesInRange(px, py, r)) {
      if (this.chargeHits.has(e)) continue;
      this.chargeHits.add(e);
      const dealt = e.takeHit(this.skillDamage(c.damage));
      if (dealt > 0) this.dmgDealtAccum += dealt;
      this.spawnDamageNumber(e.x, e.y - 24, dealt, '#ffe9a8');
      this.stunEnemiesInRange(e.x, e.y, 12, c.knockdownMs); // knockdown = brief stun
    }
    this.lastCombatTime = this.time.now;
  }

  /** A skill's base damage scaled by the player's damage multiplier (Berserker's Edge,
   *  Crazed, Prism Quartz) so active abilities scale with offensive passives + buffs —
   *  × the Savage frenzy momentum while armed. */
  private skillDamage(base: number): number {
    return Math.round(base * this.skillDamageMult * this.osteoDamageMult * this.frenzyMult());
  }

  /** A quick expanding ring FX for a skill activation (world FX, main camera). */
  private spawnSkillRing(x: number, y: number, r: number, color: number): void {
    const ring = this.add.circle(x, y, 18, color, 0).setStrokeStyle(4, color, 0.95).setDepth(13);
    this.worldFx.add(ring);
    this.tweens.add({ targets: ring, scale: r / 18, alpha: 0, duration: 360, ease: 'Quad.out', onComplete: () => ring.destroy() });
  }

  /** A brief "BLOCK" flash over the player when a hit is blocked. */
  private spawnBlockFlash(): void {
    const t = this.add.text(this.player.x, this.player.y - 30, 'BLOCK', { fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: '#9fd0ff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(14).setStroke('#06121f', 4);
    this.worldFx.add(t);
    this.tweens.add({ targets: t, y: t.y - 26, alpha: 0, duration: 600, ease: 'Quad.out', onComplete: () => t.destroy() });
  }

  /** PLOW (Tank #8): a forward charge reusing the dash movement, shoving + damaging
   *  enemies in the path. Independent of the dodge-dash cooldown (the skill gates it). */
  private startPlow(): void {
    const c = TANK_TUNING.plow;
    const len = Math.hypot(this.player.facingX, this.player.facingY) || 1;
    this.dashDir = { x: this.player.facingX / len, y: this.player.facingY / len };
    this.dashEndsAt = this.time.now + (c.distance / DASH_SPEED) * 1000;
    this.plowHits.clear();
    this.plowActive = true;
  }

  /** PLOW per-frame: damage each enemy in the path once + continuously shove them aside. */
  private plowTick(): void {
    const c = TANK_TUNING.plow;
    const px = this.player.x;
    const py = this.player.y;
    const r = DASH_HIT_RADIUS + 16;
    for (const e of this.combatEnemiesInRange(px, py, r)) {
      if (!this.plowHits.has(e)) {
        this.plowHits.add(e);
        const dealt = e.takeHit(c.damage);
        if (dealt > 0) this.dmgDealtAccum += dealt; // lifesteal accounting
        if (dealt > 0) this.spawnDamageNumber(e.x, e.y - 24, dealt, '#ffe9a8');
      }
    }
    // Shove anything in the path aside (no extra freeze so the charge keeps clearing it).
    this.knockbackEnemiesInRange(px, py, r, c.knockback, 100);
    this.lastCombatTime = this.time.now;
  }

  /** DEBUFF handler (stub): a weakening pulse — visible ring + light AoE damage near
   *  the player. The enemy STATUS layer (slow/weaken stacks) is a later system; this
   *  proves the data→activate→effect path for the debuff kind. */
  private runDebuffSkill(radius: number): void {
    const ring = this.add.circle(this.player.x, this.player.y, 20, 0x9a6bff, 0).setStrokeStyle(3, 0xb98aff, 0.9).setDepth(13);
    this.worldFx.add(ring);
    this.tweens.add({ targets: ring, scale: radius / 20, alpha: 0, duration: 420, ease: 'Quad.out', onComplete: () => ring.destroy() });
    this.aoeHitAll(this.player.x, this.player.y, radius, Math.max(4, this.playerDamage() * 0.5));
  }

  /** Apply damage to every enemy type within `range` of (x,y), reusing the per-type
   *  reward helpers. An optional SHAPE predicate `where(ex,ey)` further filters which
   *  enemies are hit — this is what lets the CONE (Dust Devil) and LINE/WALL (Jet Stream)
   *  AoE reuse the exact same full-reward path with a real, non-circular hitbox. */
  private aoeHitAll(x: number, y: number, range: number, dmg: number, where?: (ex: number, ey: number) => boolean): void {
    // BLOOD SCENT (Savage keyed passive): BLEEDING targets take ×(1+bonus).
    // Resolved as TWO position-filtered passes (the damageOneEnemy filter
    // precedent) so no per-family helper changes; at zero bonus — every other
    // class — the single original path below runs untouched.
    if (this.bloodScentBonus > 0 && dmg > 0) {
      const bleeding = (ex: number, ey: number): boolean => this.dots.some((d) => d.target.isAlive && d.target.x === ex && d.target.y === ey);
      this.aoeHitAllRaw(x, y, range, dmg * (1 + this.bloodScentBonus), (ex, ey) => bleeding(ex, ey) && (!where || where(ex, ey)));
      this.aoeHitAllRaw(x, y, range, dmg, (ex, ey) => !bleeding(ex, ey) && (!where || where(ex, ey)));
      return;
    }
    this.aoeHitAllRaw(x, y, range, dmg, where);
  }

  private aoeHitAllRaw(x: number, y: number, range: number, dmg: number, where?: (ex: number, ey: number) => boolean): void {
    // ECHO (Bard framework): while armed, the resolution repeats once, delayed,
    // at echoPct strength (the guard inside maybeEcho stops echoes of echoes).
    this.maybeEcho(() => this.aoeHitAllRaw(x, y, range, dmg * this.echoPct, where));
    if (this.sasquatch.isAlive && this.sasquatch.distanceTo(x, y) <= range && (!where || where(this.sasquatch.x, this.sasquatch.y))) {
      const dealt = this.sasquatch.takeHit(dmg);
      if (dealt > 0) this.dmgDealtAccum += dealt; // lifesteal accounting
      this.spawnDamageNumber(this.sasquatch.x, this.sasquatch.y - 24, dealt, '#ffcaa0');
      if (!this.sasquatch.isAlive) this.onSasquatchDefeated();
    }
    this.hitSwarmersInRange(x, y, range, dmg, where);
    this.hitAngelsInRange(x, y, range, dmg, where);
    this.hitTownsfolkInRange(x, y, range, dmg, where);
    this.hitGuardiansInRange(x, y, range, dmg, where);
    this.hitCherubsInRange(x, y, range, dmg, where);
    this.hitDemonsInRange(x, y, range, dmg, where);
    this.hitBossesInRange(x, y, range, dmg, where);
    this.applyStaggerIfActive(x, y, range);
  }

  /** Sasquatch defeat: the banner + quest beat + XP, from ANY kill path (melee, AoE,
   *  projectile, dash) so the opening quest always advances no matter the class/skill. */
  private onSasquatchDefeated(): void {
    this.showBanner('Sasquatch defeated', 1600);
    this.notifyQuest('sasquatch-defeated');
    this.gainXP(this.sasquatch.xpReward);
  }

  // --- Allied summons: enemy retargeting (CONTINUOUS aggro) + damage redirection -
  //
  // EVERY enemy that pursues a target — normal enemies AND boss-spawned adds (demons/
  // cherubs) — resolves its move target through enemyAggroTarget(), which RE-EVALUATES the
  // 3-tier hierarchy (Monster > skeletons > player) every AGGRO_REEVAL_INTERVAL_MS rather
  // than once at spawn. So a summon raised next to foes already chasing the player pulls
  // them within one interval, and they fall back down the tiers when a higher ally dies/
  // leaves. With no summon up, every enemy targets the player exactly as before. Contact/
  // bolt damage is additionally redirected to a summon by proximity (it soaks).

  /**
   * The point an enemy should pursue, re-evaluated on a cadence with light stickiness so it
   * can't thrash between equal-priority targets. `enemy` is the entity object (a stable key);
   * (ex,ey) is its current position. Returns the live position of its chosen target (a
   * higher-priority summon, else the player).
   */
  private enemyAggroTarget(enemy: object, ex: number, ey: number): { x: number; y: number } {
    const now = this.time.now;
    // CONFUSION (Bard framework) overrides everything for THIS enemy: it pursues
    // its turned-on fellow until the effect wears off (pruned in updateConfusion).
    const cf = this.confused.get(enemy as CombatEnemy);
    if (cf && now < cf.until && cf.target.isAlive) return { x: cf.target.x, y: cf.target.y };
    const stealthed = now < this.playerStealthUntil; // a hidden player can't be focused
    // Necromancer TAUNT is a LIVE override (don't wait for the next re-eval): focus the player.
    if (now < this.tauntUntil && !stealthed) return { x: this.player.x, y: this.player.y };
    let st = this.aggroState.get(enemy);
    const lostTarget = !!st && st.targetSummon != null && !st.targetSummon.isAlive;
    if (!st || now >= st.nextEval || lostTarget) st = this.reevalEnemyAggro(enemy, ex, ey, st, now);
    const t = st.targetSummon;
    if (t && t.isAlive) return { x: t.x, y: t.y };
    // PLAYER STEALTH: with no summon to chase, a hidden player is NOT a target —
    // the enemy holds its position (the fall-through floor is removed).
    if (stealthed) return { x: ex, y: ey };
    return { x: this.player.x, y: this.player.y };
  }

  /** Re-pick an enemy's target per the priority hierarchy (+ stickiness), cache it, schedule
   *  the next re-eval (jittered so enemies don't all re-evaluate on the same frame). */
  private reevalEnemyAggro(
    enemy: object,
    ex: number,
    ey: number,
    prev: { targetSummon: AlliedSummon | null; nextEval: number } | undefined,
    now: number,
  ): { targetSummon: AlliedSummon | null; nextEval: number } {
    // Necromancer TAUNT overrides the hierarchy: focus the player while it's active
    // (unless the player is STEALTHED — a hidden player can't be focused, so summons
    // keep drawing normally).
    const taunted = now < this.tauntUntil && now >= this.playerStealthUntil;
    const best = taunted ? null : this.summons?.aggroSummonNear(ex, ey) ?? null;
    let chosen = best;
    // STICKINESS: keep the current ally-target if it's still alive + in range (+ margin) and
    // `best` isn't STRICTLY higher priority — never flip between equal-priority targets.
    const cur = prev?.targetSummon ?? null;
    if (!taunted && cur && cur.isAlive) {
      const inRange = cur.distanceTo(ex, ey) <= cur.aggroRadius + AGGRO_STICKY_MARGIN;
      if (inRange && (!best || best.aggroPriority <= cur.aggroPriority)) chosen = cur;
    }
    // Jitter the next re-eval ±25% so a crowd of adds spreads its work across frames.
    const next = now + Math.round(AGGRO_REEVAL_INTERVAL_MS * (0.75 + Math.random() * 0.5));
    const st = { targetSummon: chosen, nextEval: next };
    this.aggroState.set(enemy, st);
    return st;
  }

  /** If an aggro-drawing summon is near the attacking enemy at (ex,ey), the hit lands on
   *  the SUMMON (it soaks) and this returns true; otherwise false (caller damages the player). */
  private redirectContactToSummon(ex: number, ey: number, amount: number): boolean {
    const g = this.summons?.aggroSummonNear(ex, ey);
    if (!g) return false;
    const dealt = g.takeHit(amount);
    if (dealt > 0) {
      this.spawnDamageNumber(g.x, g.y - 30, dealt, '#bfefff');
      this.lastCombatTime = this.time.now;
    }
    // DOLL REFLECT (Witch Doctor upgrade): a contact hit landing on the doll bites back.
    this.maybeVoodooReflect(g, ex, ey);
    return true;
  }

  /** Enemy-bolt vs allied-summon (ProjectileSystem.onSummonHit): a summon the bolt reached
   *  intercepts it (soaks the damage). Returns true if a summon was hit (bolt despawns). */
  private resolveEnemyBoltVsSummon(x: number, y: number, radius: number, damage: number): boolean {
    const g = this.summons?.summonAt(x, y, radius);
    if (!g) return false;
    const dealt = g.takeHit(damage);
    if (dealt > 0) this.spawnDamageNumber(g.x, g.y - 30, dealt, '#bfefff');
    return true;
  }

  /** Summon an Ice Golem near the player (the skill action + the dev button both call this). */
  private summonIceGolem(): void {
    const { dx, dy } = this.facingUnit();
    const g = this.summons.summon(ICE_GOLEM_CONFIG, this.player.x + dx * 40, this.player.y + dy * 40, ICE_GOLEM_TUNING.maxConcurrent);
    this.spawnSkillRing(g.x, g.y, ICE_GOLEM_TUNING.bodyRadius + 14, 0x8fd8ff);
    this.showBanner('Ice Golem summoned', 1200);
    this.lastCombatTime = this.time.now;
  }

  /** Summon an attacking SKELETON near the player (test skill + dev button). */
  private summonSkeleton(): void {
    const { dx, dy } = this.facingUnit();
    // Slight scatter so multiple skeletons don't stack on one pixel.
    const jx = Phaser.Math.Between(-26, 26);
    const jy = Phaser.Math.Between(-26, 26);
    const s = this.summons.summon(SKELETON_CONFIG, this.player.x + dx * 36 + jx, this.player.y + dy * 36 + jy, SKELETON_TUNING.maxConcurrent);
    this.spawnSkillRing(s.x, s.y, SKELETON_TUNING.bodyRadius + 12, 0xd8dde0);
    this.showBanner('Skeleton raised', 1000);
    this.lastCombatTime = this.time.now;
  }

  /** Summon the DARK MATTER MONSTER near the player (test skill + dev button). */
  private summonDarkMatterMonster(): void {
    const { dx, dy } = this.facingUnit();
    const m = this.summons.summon(DARK_MATTER_CONFIG, this.player.x + dx * 48, this.player.y + dy * 48, DARK_MATTER_TUNING.maxConcurrent);
    this.spawnSkillRing(m.x, m.y, DARK_MATTER_TUNING.bodyRadius + 16, 0x9a6cff);
    this.showBanner('Dark Matter Monster manifested', 1400);
    this.lastCombatTime = this.time.now;
  }

  /**
   * Summon a TEST RANGED ALLY behind the player (dev button; base for the Act IV "demons at
   * your back"). It holds position + fires low-damage pooled player-faction bolts at nearby
   * enemies and NEVER draws aggro (enemies ignore it), so the crusade allies help while the
   * player still absorbs all aggro.
   */
  private summonRangedAlly(): void {
    const { dx, dy } = this.facingUnit();
    // Place it slightly BEHIND the player (opposite the facing) with a little scatter, so it
    // reads as a backline unit rather than out front.
    const jx = Phaser.Math.Between(-24, 24);
    const jy = Phaser.Math.Between(-24, 24);
    const a = this.summons.summon(RANGED_ALLY_CONFIG, this.player.x - dx * 40 + jx, this.player.y - dy * 40 + jy, RANGED_ALLY_TUNING.maxConcurrent);
    this.spawnSkillRing(a.x, a.y, RANGED_ALLY_TUNING.bodyRadius + 12, RANGED_ALLY_TUNING.projectileColor);
    this.showBanner('Ranged ally summoned', 1000);
    this.lastCombatTime = this.time.now;
  }

  /** PET-TARGETED BUFF: empower the player's summons (damage + toughness) for a window.
   *  Applies to currently-summoned AND newly-summoned units while active. */
  private buffSummons(): void {
    // Apply both example buffs (a damage buff + an HP/defense buff) so one tap proves both hooks.
    this.summons.addBuff(SUMMON_BUFF_TUNING.power, this.time.now);
    this.summons.addBuff(SUMMON_BUFF_TUNING.bulwark, this.time.now);
    this.spawnSkillRing(this.player.x, this.player.y, 80, 0xb78bff);
    this.showBanner('Summons empowered', 1200);
  }

  /**
   * PASSIVE summon auras from the unlocked Summons-tree passives, computed PER SUMMON TYPE
   * (the manager calls this each frame and combines it with the timed pet buffs). Necrotic
   * Presence hits all summons; Unyielding Beast + Tentacles hit the Monster; the chosen
   * branch passive (Blood / Marrow Skeleton) hits skeletons.
   */
  private summonPassiveMods(s: AlliedSummon): { damageBonus: number; hpBonus: number; drBonus: number; aggroRadiusMult: number; attackRangeMult: number } {
    let damageBonus = 0;
    let hpBonus = 0;
    let drBonus = 0;
    let aggroRadiusMult = 1;
    let attackRangeMult = 1;
    if (this.classId !== 'necromancer') return { damageBonus, hpBonus, drBonus, aggroRadiusMult, attackRangeMult };
    const has = (id: string) => this.skills.isUnlocked(id);
    const key = s.config.key;
    // Necrotic Presence — ALL summons: +damage +HP.
    if (has(NECROTIC_PRESENCE_ID)) {
      damageBonus += SUMMONS_TUNING.necroticPresence.damageBonus;
      hpBonus += SUMMONS_TUNING.necroticPresence.hpBonus;
    }
    if (key === 'dark_matter_monster') {
      // Unyielding Beast — the Monster (pet): +life +defense.
      if (has(UNYIELDING_BEAST_ID)) {
        hpBonus += SUMMONS_TUNING.unyieldingBeast.hpBonus;
        drBonus += SUMMONS_TUNING.unyieldingBeast.drBonus;
      }
      // Tentacles — the Monster: bigger swing (cleave more).
      if (has(TENTACLES_ID)) attackRangeMult *= SUMMONS_TUNING.tentacles.attackRangeMult;
    }
    if (key === 'skeleton') {
      // Branch A — Blood Skeleton: +skeleton damage.
      if (has(BLOOD_SKELETON_ID)) damageBonus += SUMMONS_TUNING.bloodSkeleton.damageBonus;
      // Branch B — Marrow Skeleton: wider aggro pull + tankier (stays below the Monster's tier).
      if (has(MARROW_SKELETON_ID)) {
        aggroRadiusMult *= SUMMONS_TUNING.marrowSkeleton.aggroRadiusMult;
        drBonus += SUMMONS_TUNING.marrowSkeleton.drBonus;
        hpBonus += SUMMONS_TUNING.marrowSkeleton.hpBonus;
      }
    }
    return { damageBonus, hpBonus, drBonus, aggroRadiusMult, attackRangeMult };
  }

  /** DARK MATTER (Summons #5): a timed +summon-damage burst (reuses pet buffs). */
  private summonDarkMatterBurst(): void {
    const c = SUMMONS_TUNING.darkMatter;
    this.summons.addBuff({ id: 'necro_dark_matter_burst', damageBonus: c.damageBonus, durationMs: c.durationMs }, this.time.now);
    this.spawnSkillRing(this.player.x, this.player.y, 90, 0x9a6cff);
    this.showBanner('Dark Matter surges through your summons', 1300);
  }

  /** ARMY OF THE DEAD (Summons #10 capstone): raise a temporary skeleton swarm AND empower
   *  every active summon (+damage/+HP) for a window. Reuses the foundation + pet buffs. */
  private summonArmyOfTheDead(): void {
    const c = SUMMONS_TUNING.army;
    const cap = SKELETON_TUNING.maxConcurrent + c.skeletons; // allow the burst beyond the normal cap
    for (let i = 0; i < c.skeletons; i++) {
      const a = (i / c.skeletons) * Math.PI * 2;
      const r = 40 + Math.random() * 40;
      this.summons.summon(SKELETON_CONFIG, this.player.x + Math.cos(a) * r, this.player.y + Math.sin(a) * r, cap, c.swarmLifespanMs);
    }
    this.summons.addBuff({ id: 'necro_army_empower', damageBonus: c.empowerDamage, hpBonus: c.empowerHP, durationMs: c.empowerDurationMs }, this.time.now);
    this.spawnSkillRing(this.player.x, this.player.y, 130, 0x9a6cff);
    this.showBanner('ARMY OF THE DEAD rises!', 1600);
    this.lastCombatTime = this.time.now;
  }

  /** SINGULARITY (Dark Matter #10 capstone): a black-hole at a spot ahead that, over its
   *  life, PULLS nearby enemies toward its center AND deals heavy AoE damage each pulse.
   *  Reuses the placed-AoE pattern + a PULL (reverse of knockbackEnemiesInRange). */
  private castSingularity(c: { placeAhead: number; radius: number; durationMs: number; pulses: number; pullStrength: number; damagePerTick: number; banner?: string; tint?: number } = DM_TUNING.singularity): void {
    const { dx, dy } = this.facingUnit();
    const cx = this.player.x + dx * c.placeAhead;
    const cy = this.player.y + dy * c.placeAhead;
    const step = c.durationMs / c.pulses;
    for (let i = 0; i < c.pulses; i++) {
      this.time.delayedCall(i * step, () => {
        if (this.playerDead) return;
        this.spawnSkillRing(cx, cy, c.radius * (1 - (i / c.pulses) * 0.35), c.tint ?? 0x6a3fb0); // collapsing rings
        this.pullEnemiesInRange(cx, cy, c.radius, c.pullStrength);
        this.aoeHitAll(cx, cy, c.radius, this.skillDamage(c.damagePerTick));
      });
    }
    this.showBanner(c.banner ?? 'SINGULARITY', 1400);
    this.lastCombatTime = this.time.now;
  }

  /** PULL (reverse-knockback): drag enemies in range TOWARD (x,y) by up to `strength` px
   *  (capped so they never overshoot the center). The mirror of knockbackEnemiesInRange. */
  private pullEnemiesInRange(x: number, y: number, range: number, strength: number): void {
    for (const e of this.combatEnemiesInRange(x, y, range)) {
      const dx = x - e.x;
      const dy = y - e.y;
      const len = Math.hypot(dx, dy);
      if (len < 2) continue;
      const stepLen = Math.min(len - 1, strength);
      e.sprite.setPosition(e.x + (dx / len) * stepLen, e.y + (dy / len) * stepLen);
    }
  }

  /** Iron Pyrite (capstone form): the player's attacks STAGGER (briefly stun) enemies hit. */
  private applyStaggerIfActive(x: number, y: number, range: number): void {
    if (this.skillTimed.some((t) => t.id === IRON_PYRITE_ID)) {
      this.stunEnemiesInRange(x, y, range, CONTROL_TUNING.pyrite.staggerMs);
    }
  }

  // --- Generic enemy-effect primitives (reusable across all CombatEnemy types) -

  /** Every LIVE combat enemy across all type lists, as the shared CombatEnemy shape. */
  private combatEnemies(): CombatEnemy[] {
    // Per-frame cache (perf): rebuild the concat+filter at most ONCE per frame (keyed
    // by the scene clock). Callers that act on the result re-check `isAlive`, so a
    // mid-frame death between rebuilds is handled correctly.
    const now = this.time.now;
    if (now !== this.combatEnemyCacheTime) {
      this.combatEnemyCacheTime = now;
      const all: CombatEnemy[] = [
        this.sasquatch,
        ...this.swarmers,
        ...this.angels,
        ...this.townsfolk,
        ...this.guardians,
        ...this.cherubs,
        ...this.demons,
        ...this.bosses,
      ];
      this.combatEnemyCache = all.filter((e) => e && e.isAlive);
    }
    return this.combatEnemyCache;
  }

  /** Live enemies within `range` of (x,y). Re-checks isAlive so a mid-frame death
   *  (since the per-frame cache was built) is never treated as a live target. */
  private combatEnemiesInRange(x: number, y: number, range: number): CombatEnemy[] {
    return this.combatEnemies().filter((e) => e.isAlive && Phaser.Math.Distance.Between(x, y, e.x, e.y) <= range);
  }

  /** DEV perf readout content: live entity, effect + pool counts (see PerfReadout).
   *  Pool lines show active/size — `size` stays at/under the cap, never growing
   *  unbounded, which is the at-a-glance proof the FX churn is gone. */
  private perfLines(): string[] {
    return [
      `enemies ${this.combatEnemies().length}  summons ${this.summons.count}  ranged ${this.summons.list.filter((s) => s.config.behavior === 'ranged').length}`,
      `dem ${this.demons.length} ang ${this.angels.length} twn ${this.townsfolk.length} swm ${this.swarmers.length} bos ${this.bosses.length}`,
      `bolts ${this.projectiles.count}  dots ${this.dots.length}`,
      `dmg# ${this.floatingText.activeCount}/${this.floatingText.size}  circ ${this.circleFx.activeCount}/${this.circleFx.size}`,
      // live = actually visible FX; pooled = hidden recycled pool members (the
      // old single number over-read as "active" — see the Rome diagnostic).
      `worldFx live ${this.worldFx.list.filter((o) => (o as Phaser.GameObjects.Sprite).visible !== false).length} + pooled ${this.worldFx.list.filter((o) => (o as Phaser.GameObjects.Sprite).visible === false).length}`,
    ];
  }

  /** Freeze/unfreeze an enemy's physics body (the stun primitive's "can't move"). */
  private freezeEnemyBody(e: CombatEnemy, frozen: boolean): void {
    const body = e.sprite?.body as Phaser.Physics.Arcade.Body | undefined;
    if (!body) return;
    body.moves = !frozen;
    if (frozen) e.halt();
  }

  /** STUN: freeze every enemy within range in place for `ms` (generic primitive).
   *  ENTANGLED CHAINS: stunning a bound enemy stuns every member of its binding.
   *  APPLY-IMPACT-RIDER helper (Bard bolts): control at a bolt's landing point. */
  private applyImpactRider(x: number, y: number, radius: number, r: { stunMs?: number; slowFactor?: number; slowMs?: number; weaken?: number; weakenMs?: number; knockback?: number; rootMs?: number }): void {
    if (r.stunMs) this.stunEnemiesInRange(x, y, radius, r.stunMs);
    if (r.rootMs) this.rootNearestEnemy(x, y, radius, r.rootMs); // Pinning Shot (Samurai)
    if (r.slowFactor !== undefined && r.slowMs) this.slowEnemiesInRange(x, y, radius, r.slowMs, r.slowFactor);
    if (r.weaken !== undefined && r.weakenMs) this.setPoisonWeaken(r.weaken, r.weakenMs);
    if (r.knockback) this.knockbackEnemiesInRange(x, y, radius, r.knockback, 200);
  }

  private stunEnemiesInRange(x: number, y: number, range: number, ms: number, where?: (ex: number, ey: number) => boolean): void {
    const until = this.time.now + ms;
    for (const e of this.combatEnemiesInRange(x, y, range)) {
      if (where && !where(e.x, e.y)) continue; // shape filter (the Whistle cone)
      for (const t of [e, ...this.entangleControlPeers(e)]) {
        this.stunnedEnemies.set(t, until);
        this.freezeEnemyBody(t, true);
        // A brief star spark over the stunned enemy (world FX) — pooled (fires per
        // stunned enemy, so an AoE stun into a crowd would otherwise churn many Texts).
        this.floatingText.show(t.x, t.y - 30, '✦', '#ffe9a8', { fontSize: 16, riseBy: 14, durationMs: ms, depth: 14 });
      }
    }
  }

  /** KNOCKBACK: shove enemies within range away from (x,y) by `distance`, with a brief freeze. */
  private knockbackEnemiesInRange(x: number, y: number, range: number, distance: number, freezeMs = 200, where?: (ex: number, ey: number) => boolean): void {
    const b = this.physics.world.bounds;
    for (const e of this.combatEnemiesInRange(x, y, range)) {
      if (where && !where(e.x, e.y)) continue; // shape filter (Sludge cone)
      const dx = e.x - x;
      const dy = e.y - y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = Phaser.Math.Clamp(e.x + (dx / len) * distance, b.x + 8, b.x + b.width - 8);
      const ny = Phaser.Math.Clamp(e.y + (dy / len) * distance, b.y + 8, b.y + b.height - 8);
      e.sprite.setPosition(nx, ny);
      // Briefly freeze so they don't instantly walk back into the player.
      this.stunnedEnemies.set(e, this.time.now + freezeMs);
      this.freezeEnemyBody(e, true);
    }
  }

  /** Release every stunned enemy immediately (reset / load / teardown). */
  private releaseAllStuns(): void {
    for (const [e] of this.stunnedEnemies) if (e.isAlive) this.freezeEnemyBody(e, false);
    this.stunnedEnemies.clear();
    // Also clear transient Control state (slows / timed weaken / counter / charge) so a
    // respawn, save-load or dev reset starts clean.
    this.slowedEnemies.clear();
    this.intimidateWeakenUntil = 0;
    this.counterReadyAt = 0;
    this.chargeActive = false;
    this.chargeHits.clear();
    this.darkVulnUntil = 0; // Dark Matter: drop the Tainted defence-down window
    this.darkVulnMult = 1;
    if (this.playerHealth) this.playerHealth.incomingMultiplier = this.baseIncomingMult;
  }

  /** Per-frame: release enemies whose stun/knockback-freeze has expired (or that died). */
  private updateEnemyStun(): void {
    if (this.stunnedEnemies.size === 0) return;
    for (const [e, until] of this.stunnedEnemies) {
      if (!e.isAlive) {
        this.stunnedEnemies.delete(e);
      } else if (this.time.now >= until) {
        this.freezeEnemyBody(e, false);
        this.stunnedEnemies.delete(e);
      }
    }
  }

  // --- Control primitives: SLOW (per-enemy velocity scale) + WEAKEN + reactive ---

  /** SLOW: scale the movement speed of enemies in range to `factor` (0.5 = half) for `ms`. */
  private slowEnemiesInRange(x: number, y: number, range: number, ms: number, factor: number, where?: (ex: number, ey: number) => boolean): void {
    const until = this.time.now + ms;
    for (const e of this.combatEnemiesInRange(x, y, range)) {
      if (where && !where(e.x, e.y)) continue; // shape filter (the Chill cone)
      // ENTANGLED CHAINS: slowing a bound enemy slows every member of its binding.
      for (const t of [e, ...this.entangleControlPeers(e)]) {
        const cur = this.slowedEnemies.get(t);
        // Keep the strongest slow + the latest expiry while refreshed (auras refresh each frame).
        this.slowedEnemies.set(t, { until: Math.max(cur?.until ?? 0, until), factor: Math.min(cur?.factor ?? 1, factor) });
      }
    }
  }

  /** Per-frame: scale slowed enemies' velocity (and prune the expired). Runs AFTER the
   *  enemy updates so it overrides the chase velocity they just set. */
  private applyEnemySlows(): void {
    if (this.slowedEnemies.size === 0) return;
    for (const [e, s] of this.slowedEnemies) {
      if (!e.isAlive || this.time.now >= s.until) {
        this.slowedEnemies.delete(e);
        continue;
      }
      const body = e.sprite?.body as Phaser.Physics.Arcade.Body | undefined;
      if (body && body.moves) body.velocity.scale(s.factor);
    }
  }

  /** Reactive: the player took damage → Counter Attack (Control passive) + Reflect (Ethereal
   *  buff). Both bounce damage to nearby attackers; `amount` is the HP just lost. */
  private onPlayerHurt(amount: number): void {
    if (this.playerDead) return;
    // MEDITATION (Monk): the rapid mend BREAKS the moment any blow lands.
    if (amount > 0 && this.skillTimed.some((t) => t.id === MEDITATION_ID)) {
      this.skillTimed = this.skillTimed.filter((t) => t.id !== MEDITATION_ID);
      this.recomputeSkillEffects();
      this.showBanner('Meditation broken', 1000);
    }
    // REFLECT (Ethereal buff): bounce a fraction of the damage taken back at nearby foes.
    const reflectPct = this.combinedSkillMods().reflectPct ?? 0;
    if (reflectPct > 0 && amount > 0) {
      const r = ETHEREAL_TUNING.reflect.radius;
      this.spawnSkillRing(this.player.x, this.player.y, r, 0xff9ad0);
      this.aoeHitAll(this.player.x, this.player.y, r, Math.max(1, Math.round(amount * reflectPct)));
    }
    // COUNTER ATTACK (Control passive): an auto-strike on a short internal cooldown.
    if (this.skills.isUnlocked(COUNTER_ID) && this.time.now >= this.counterReadyAt) {
      const c = CONTROL_TUNING.counter;
      this.counterReadyAt = this.time.now + c.internalCdMs;
      this.spawnSkillRing(this.player.x, this.player.y, c.range, 0xffcaa0);
      this.aoeHitAll(this.player.x, this.player.y, c.range, this.skillDamage(c.damage));
    }
  }

  /** True while the player ignores crowd control (Iron Will passive or Iron Pyrite form). */
  private isPlayerCcImmune(): boolean {
    // Iron Will (passive) / Iron Pyrite (form) / Chant of the Ancestors (Bard timed buff).
    // IMMOVABLE MIND (Samurai), ENLIGHTENED MIND (Monk) and PROPHETIC VISION
    // (Priest) join the permanent half.
    return this.skills.isUnlocked(IRON_WILL_ID) || this.skills.isUnlocked(IMMOVABLE_MIND_ID) || this.skills.isUnlocked(ENLIGHTENED_MIND_ID) || this.skills.isUnlocked(PROPHETIC_VISION_ID) || this.skillTimed.some((t) => t.id === IRON_PYRITE_ID || t.id === CHANT_OF_ANCESTORS_ID);
  }

  /**
   * Per-frame Control effects: the Dominance aura (continuous slow+weaken near the
   * player), the Iron Pyrite aura, and the combined enemy-WEAKEN applied to the
   * player's incoming damage (on top of the recompute base). Slows themselves are
   * applied by applyEnemySlows().
   */
  private updateControlEffects(): void {
    let weaken = 0; // strongest enemy-weaken in effect → player takes (1-weaken) damage
    // Dominance: always-on aura while unlocked.
    if (this.skills.isUnlocked(DOMINANCE_ID)) {
      const d = CONTROL_TUNING.dominance;
      if (this.combatEnemiesInRange(this.player.x, this.player.y, d.radius).length > 0) {
        this.slowEnemiesInRange(this.player.x, this.player.y, d.radius, 250, d.slowFactor);
        weaken = Math.max(weaken, d.enemyDamageReduction);
      }
    }
    // Iron Pyrite form: aura slow+weaken + stagger flag handled where attacks land.
    if (this.skillTimed.some((t) => t.id === IRON_PYRITE_ID)) {
      const p = CONTROL_TUNING.pyrite;
      this.slowEnemiesInRange(this.player.x, this.player.y, p.auraRadius, 250, p.auraSlowFactor);
      weaken = Math.max(weaken, p.auraWeaken);
    }
    // Timed Intimidate weaken (set on cast).
    if (this.time.now < this.intimidateWeakenUntil) weaken = Math.max(weaken, this.intimidateWeakenFactor);
    // Timed Ice/Poison weaken (Frostbite / Freezing Rain / Pestilence).
    if (this.time.now < this.poisonWeakenUntil) weaken = Math.max(weaken, this.poisonWeakenFactor);
    // HOSTILE debuffs on the PLAYER (dark-caster bolts): a move slow, a weaken
    // that RAISES incoming damage, and the stacking DoT ticking per live stack.
    const now = this.time.now;
    this.player.slowFactor = now < this.casterSlowUntil ? CASTER_SLOW_FACTOR : 1;
    const hostileIncoming = now < this.casterWeakenUntil ? CASTER_WEAKEN_INCOMING : 1;
    if (this.casterDotStacks.length > 0) {
      this.casterDotStacks = this.casterDotStacks.filter((until) => now < until);
      if (this.casterDotStacks.length === 0) {
        this.casterDotNextTickAt = 0;
      } else if (now >= this.casterDotNextTickAt) {
        this.casterDotNextTickAt = now + CASTER_DOT_TICK_MS;
        if (!this.playerDead) {
          const dealt = this.playerHealth.damage(CASTER_DOT_TICK_DAMAGE * this.casterDotStacks.length);
          this.spawnDamageNumber(this.player.x, this.player.y - 26, dealt, '#8fa8ff');
          if (this.playerHealth.isDead) this.onPlayerDeath();
        }
      }
    }
    // Apply: incoming = base × (1 - weaken) × hostile weaken (enemy-applied, ≥ 1).
    if (this.playerHealth) this.playerHealth.incomingMultiplier = this.baseIncomingMult * (1 - weaken) * hostileIncoming;
    // OSTEO AURA (Necromancer): while unlocked and foes crowd you, their lowered defense
    // makes your strikes bite deeper — a player-damage amplifier (read by skillDamage/playerDamage).
    let osteo = 1;
    if (this.skills.isUnlocked(OSTEO_AURA_ID)) {
      const o = MARROW_TUNING.osteoAura;
      if (this.combatEnemiesInRange(this.player.x, this.player.y, o.radius).length > 0) osteo = 1 + o.defenseReduction;
    }
    // TAINTED DARK MATTER defence-down: a timed damage-amp window stacks onto Osteo.
    if (this.time.now < this.darkVulnUntil) osteo *= this.darkVulnMult;
    this.osteoDamageMult = osteo;
    // BLIGHT (Dark Matter passive aura): while unlocked, SLOW + (on cadence) DAMAGE nearby foes.
    if (this.skills.isUnlocked(BLIGHT_ID)) {
      const b = DM_TUNING.blight;
      this.slowEnemiesInRange(this.player.x, this.player.y, b.radius, 250, b.slowFactor);
      if (this.time.now >= this.blightNextTickAt) {
        this.blightNextTickAt = this.time.now + b.tickMs;
        if (this.combatEnemiesInRange(this.player.x, this.player.y, b.radius).length > 0) {
          this.spawnSkillRing(this.player.x, this.player.y, b.radius, 0x6a3fb0);
          this.aoeHitAll(this.player.x, this.player.y, b.radius, this.skillDamage(b.dmgPerTick));
        }
      }
    }
  }

  /** Start a timed BUFF / TRANSFORMATION: add its stats (+ optional tint / aura) until it expires. */
  private startTimedSkill(id: string, durationMs: number, stats: SkillStatMods, tint?: number, aura?: { auraDamage?: number; auraRadius?: number }): void {
    this.skillTimed = this.skillTimed.filter((t) => t.id !== id); // refresh if re-activated
    this.skillTimed.push({ id, endsAt: this.time.now + durationMs, stats, tint, auraDamage: aura?.auraDamage, auraRadius: aura?.auraRadius, auraNextAt: this.time.now + 400 });
    this.recomputeSkillEffects();
  }

  /** Per-frame: expire timed buffs/forms, apply regen + transformation auras, release
   *  expired enemy stuns, and update the skill buttons' cooldown shades. */
  private updateSkills(delta: number): void {
    // Expire timed buffs/forms.
    if (this.skillTimed.length) {
      const before = this.skillTimed.length;
      this.skillTimed = this.skillTimed.filter((t) => this.time.now < t.endsAt);
      if (this.skillTimed.length !== before) this.recomputeSkillEffects(); // a buff/form ended
    }
    // Mana Shield (Ethereal): drop the absorb pool when its window lapses.
    if (this.shieldUntil > 0 && this.time.now >= this.shieldUntil) {
      this.playerHealth.shield = 0;
      this.shieldUntil = 0;
    }
    // PLAYER STEALTH: restore the avatar when the window lapses (attacks end it earlier).
    if (this.playerStealthUntil > 0 && this.time.now >= this.playerStealthUntil) this.breakPlayerStealth();
    // ENTANGLED CHAINS: unbind (restore the damage hooks) when the window lapses.
    if (this.entangled && this.time.now >= this.entangled.until) this.clearEntangle();
    // LIFESTEAL (Bloodlust): heal a fraction of the damage dealt since last frame.
    const lifesteal = this.combinedSkillMods().lifestealPct ?? 0;
    if (!this.playerDead && lifesteal > 0 && this.dmgDealtAccum > 0 && this.playerHealth.current < this.playerHealth.max) {
      this.playerHealth.heal(this.dmgDealtAccum * lifesteal);
    }
    this.updateFrenzy(this.dmgDealtAccum); // Savage momentum: blood this frame = a stack
    this.dmgDealtAccum = 0; // reset the accumulator every frame
    if (!this.playerDead) {
      // HP regen (War Chant) — heal per second from any active regen mod.
      const regen = this.combinedSkillMods().regenPerSec ?? 0;
      if (regen > 0 && this.playerHealth.current < this.playerHealth.max) this.playerHealth.heal((regen * delta) / 1000);
      // Transformation aura (Calcite) — periodic radiant pulse damaging nearby foes.
      for (const t of this.skillTimed) {
        if (t.auraDamage && t.auraRadius && this.time.now >= (t.auraNextAt ?? 0)) {
          t.auraNextAt = this.time.now + 500;
          this.spawnSkillRing(this.player.x, this.player.y, t.auraRadius, t.tint ?? 0xfff3c4);
          this.aoeHitAll(this.player.x, this.player.y, t.auraRadius, t.auraDamage);
        }
      }
    }
    // Release enemies whose stun/knockback-freeze has expired.
    this.updateEnemyStun();
    // Cooldown / low-energy shades on the 6 loadout-slot buttons.
    const loadout = this.skills.loadout();
    for (let i = 0; i < loadout.length; i++) {
      const id = loadout[i];
      if (!id) continue;
      const def = classSkills(this.skills.activeClass).skills.find((s) => s.id === id);
      if (!def || def.effect.kind === 'passive') continue;
      const cd = this.skillCooldownDur[id] ?? def.effect.cooldownMs; // effective (attack-speed) cd
      const until = this.skillCooldownUntil[id] ?? 0;
      const cdRatio = until > this.time.now ? (until - this.time.now) / cd : 0;
      const energyCost = 'energyCost' in def.effect ? def.effect.energyCost ?? 0 : 0;
      const lowEnergy = energyCost > 0 && this.energy.current < energyCost;
      this.skillBar?.setSlotState(i, cdRatio > 0 ? cdRatio : lowEnergy ? 1 : 0, cdRatio > 0 || lowEnergy);
    }
  }

  /** The BASIC STRIKE effect (the former default melee swing) — now an equippable
   *  skill action. Cooldown/energy/dead-guards are handled by the skill system. */
  private doBasicStrike(): void {
    this.breakPlayerStealth(); // attacking ends stealth
    // Swing in the facing direction; forgiving radius (the enemy is large).
    const sx = this.player.x + this.player.facingX * (PLAYER_ATTACK_RANGE * 0.5);
    const sy = this.player.y + this.player.facingY * (PLAYER_ATTACK_RANGE * 0.5);
    const angle = Math.atan2(this.player.facingY, this.player.facingX);
    // MULTI-HIT (Double/Triple Swing, Prism refract): the swing lands `hits` times.
    const hits = Math.max(1, this.combinedSkillMods().basicHitCount ?? 0);
    for (let i = 0; i < hits; i++) this.spawnSlash(sx, sy, angle);
    const dmg = this.playerDamage() * hits;
    if (this.sasquatch.isAlive && this.sasquatch.distanceTo(sx, sy) <= PLAYER_ATTACK_RANGE + 24) {
      const dealt = this.sasquatch.takeHit(dmg);
      if (dealt > 0) this.dmgDealtAccum += dealt; // lifesteal accounting
      this.spawnDamageNumber(this.sasquatch.x, this.sasquatch.y - 24, dealt, '#ffffff');
      this.lastCombatTime = this.time.now;
      if (!this.sasquatch.isAlive) {
        this.showBanner('Sasquatch defeated', 1600);
        this.notifyQuest('sasquatch-defeated');
        this.gainXP(this.sasquatch.xpReward); // enemy data drives the award
      }
    }

    // The same free swing also cleaves any swarmers / angels / townsfolk in the arc.
    this.hitSwarmersInRange(sx, sy, PLAYER_ATTACK_RANGE, dmg);
    this.hitAngelsInRange(sx, sy, PLAYER_ATTACK_RANGE, dmg);
    this.hitTownsfolkInRange(sx, sy, PLAYER_ATTACK_RANGE, dmg);
    this.hitGuardiansInRange(sx, sy, PLAYER_ATTACK_RANGE, dmg);
    this.hitCherubsInRange(sx, sy, PLAYER_ATTACK_RANGE, dmg);
    this.hitDemonsInRange(sx, sy, PLAYER_ATTACK_RANGE, dmg);
    this.hitBossesInRange(sx, sy, PLAYER_ATTACK_RANGE, dmg);
  }

  /** Apply damage to every flaming-sword guardian within `range` of (x,y); award XP on kills. */
  private hitGuardiansInRange(x: number, y: number, range: number, damage: number, where?: (ex: number, ey: number) => boolean): void {
    for (const g of this.guardians) {
      if (!g.isAlive) continue;
      if (g.distanceTo(x, y) <= range + 10 && (!where || where(g.x, g.y))) {
        const dealt = g.takeHit(damage);
        if (dealt > 0) this.dmgDealtAccum += dealt; // lifesteal accounting
        if (dealt > 0) {
          this.spawnDamageNumber(g.x, g.y - 26, dealt, '#ffd27a');
          this.lastCombatTime = this.time.now;
          if (!g.isAlive) this.onGuardianKilled(g);
        }
      }
    }
  }

  /** Apply damage to every townsfolk within `range` of (x,y); award XP on kills. */
  private hitTownsfolkInRange(x: number, y: number, range: number, damage: number, where?: (ex: number, ey: number) => boolean): void {
    for (const t of this.townsfolk) {
      if (!t.isAlive) continue;
      if (t.distanceTo(x, y) <= range && (!where || where(t.x, t.y))) {
        const dealt = t.takeHit(damage);
        if (dealt > 0) this.dmgDealtAccum += dealt; // lifesteal accounting
        if (dealt > 0) {
          this.spawnDamageNumber(t.x, t.y - 20, dealt, '#ffffff');
          this.lastCombatTime = this.time.now;
          if (!t.isAlive) this.onTownsfolkKilled(t);
        }
      }
    }
  }

  /** Apply damage to every angel within `range` of (x,y); award XP on kills. */
  private hitAngelsInRange(x: number, y: number, range: number, damage: number, where?: (ex: number, ey: number) => boolean): void {
    for (const a of this.angels) {
      if (!a.isAlive) continue;
      if (a.distanceTo(x, y) <= range + 8 && (!where || where(a.x, a.y))) {
        const dealt = a.takeHit(damage);
        if (dealt > 0) this.dmgDealtAccum += dealt; // lifesteal accounting
        if (dealt > 0) {
          this.spawnDamageNumber(a.x, a.y - 28 * a.variant.scale, dealt, '#ffffff');
          this.lastCombatTime = this.time.now;
          if (!a.isAlive) this.onAngelKilled(a);
        }
      }
    }
  }

  /** Apply damage to every revealed swarmer within `range` of (x,y); award XP on kills. */
  private hitSwarmersInRange(x: number, y: number, range: number, damage: number, where?: (ex: number, ey: number) => boolean): void {
    if (!this.swarmersRevealed) return;
    for (const s of this.swarmers) {
      if (!s.isAlive) continue;
      if (s.distanceTo(x, y) <= range && (!where || where(s.x, s.y))) {
        const dealt = s.takeHit(damage);
        if (dealt > 0) this.dmgDealtAccum += dealt; // lifesteal accounting
        if (dealt > 0) {
          this.spawnDamageNumber(s.x, s.y - 16, dealt, '#d6b4ff');
          this.lastCombatTime = this.time.now;
          if (!s.isAlive) this.onSwarmerKilled(s);
        }
      }
    }
  }

  private onSasquatchStrike(): void {
    if (this.playerDead) return;
    if (this.parryGate(this.sasquatch.x, this.sasquatch.y)) return; // Samurai parry: melee negated + riposte
    if (this.redirectContactToSummon(this.sasquatch.x, this.sasquatch.y, SASQUATCH_DAMAGE)) return; // golem soaks it
    const dealt = this.playerHealth.damage(SASQUATCH_DAMAGE);
    this.player.flash();
    this.spawnDamageNumber(this.player.x, this.player.y - 26, dealt, '#ff6060');
    this.lastCombatTime = this.time.now;
    if (this.playerHealth.isDead) this.onPlayerDeath();
  }

  private onPlayerDeath(): void {
    // ANKH (Ethereal ultimate): a lethal blow while the ward holds CHEATS DEATH — revive in
    // place at a fraction of max HP instead of dying (consumes the ward). Reuses this funnel.
    if (this.time.now < this.ankhArmedUntil && !this.playerDead) {
      this.ankhArmedUntil = 0;
      this.playerHealth.shield = 0;
      this.playerHealth.current = Math.max(1, Math.round(this.playerHealth.max * ETHEREAL_TUNING.ankh.reviveHpPct));
      this.player.flash();
      this.spawnSkillRing(this.player.x, this.player.y, 80, 0xffe9a8);
      this.showBanner('The Ankh revives you!', 1600);
      this.lastCombatTime = this.time.now;
      return;
    }
    this.playerDead = true;
    this.controls.setEnabled(false);
    this.player.setDirection(0, 0);
    this.talkButton.setVisible(false);
    if (this.trinity.inFight) this.onTrinityPlayerDeath(); // restart the current Trinity stage
    this.showBanner('You have fallen', 1500);
    this.time.delayedCall(1500, () => this.respawnPlayer());
  }

  /**
   * DEATH RESPAWN — the NEAREST SAFE POINT in the CURRENT world (the old rule
   * blindly used Earth's town-spawn coordinates, stranding deaths in other
   * worlds mid-void):
   *   • SPARSE worlds (the globe): the nearest zone settlement arrival —
   *     manifest-derived, so every future zone inherits it automatically;
   *   • DENSE hand-built worlds: the nearest existing spawn/entry point
   *     (Earth: the town spawn or the world entry, whichever is closer);
   *   • fallback: the world's entry.
   */
  private deathRespawnPoint(): { x: number; y: number } {
    const px = this.player.x;
    const py = this.player.y;
    const candidates: { x: number; y: number }[] = [];
    if (this.groundLayers.has(this.activeWorld)) {
      // Sparse world: every settlement arrival is a safe point.
      for (const id of Object.keys(this.regionZoneArrivals)) candidates.push(this.regionZoneArrivals[id]);
    } else {
      const w = this.worlds[this.activeWorld];
      if (w?.defaultArrival) candidates.push(w.defaultArrival);
      if (this.activeWorld === 'earth') candidates.push(this.town.spawn);
    }
    if (candidates.length === 0) return this.worlds[this.activeWorld]?.defaultArrival ?? this.town.spawn;
    let best = candidates[0];
    let bestD = Number.POSITIVE_INFINITY;
    for (const c of candidates) {
      const d = Phaser.Math.Distance.Between(px, py, c.x, c.y);
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    }
    return best;
  }

  private respawnPlayer(): void {
    this.playerHealth.full();
    // During a portal-defense encounter, respawn at the portal so the player can
    // keep defending (the encounter CONTINUES on death); otherwise the NEAREST
    // SAFE POINT in the current world (everything else about death unchanged).
    if (this.portalDefense.isActive) {
      this.player.sprite.setPosition(this.portal.x, this.portal.y + 90);
    } else {
      const p = this.deathRespawnPoint();
      this.player.sprite.setPosition(p.x, p.y);
      this.sasquatch.reset(); // clean, repeatable fight (unchanged from the old rule)
    }
    this.player.setDirection(0, 0);
    this.projectiles.clear(); // drop any bolts still in flight
    this.summons.clear(); // allied summons don't survive the player's death
    this.clearSpellHazards();
    this.clearFriendlyZones();
    this.clearEntangle();
    this.crystallize.clear();
    this.confused.clear();
    this.comboUltimate = null;
    this.voodoo = null; // WD bind state never survives a reset (summons are cleared too)
    this.allyBond = null;
    this.spiritSplit = null;
    this.parry = null; // Samurai timing state never survives a reset
    this.perfectFormUntil = 0;
    this.iaijutsu = null;
    this.pulseRing = null; // Monk state never survives a reset either
    this.actionWhiffed = false;
    this.empoweredStrikes = null;
    this.clearTraps(); // Assassin state never survives a reset either
    this.clearPriestState(); // nor the Priest's
    this.breakPlayerStealth();
    this.clearDots();
    this.despawnRegionChampion(); // death resets a champion encounter cleanly
    this.lastCombatTime = -1e9;
    this.playerDead = false;
    this.controls.setEnabled(true);
  }

  private regenTick(delta: number): void {
    // Aggro flags of PAUSED foreign residents are frozen (their update no longer
    // runs), so only same-world residents may hold the player in combat — a
    // Hell demon left mid-fight must not suppress regen in Europe.
    const local = (x: number): boolean => this.isActiveWorldResident(x);
    const enemiesEngaged =
      (this.sasquatch.isAggro && local(this.sasquatch.x)) ||
      this.swarmers.some((s) => s.isAggro && local(s.x)) ||
      this.angels.some((a) => a.isAggro && local(a.x)) ||
      this.townsfolk.some((t) => t.isAlive && local(t.x)) ||
      this.guardians.some((g) => g.isAggro && local(g.x)) ||
      this.cherubs.some((c) => c.isAggro && local(c.x)) ||
      this.demons.some((d) => d.isAggro && local(d.x)) ||
      this.bosses.some((b) => b.isAggro && local(b.x));
    if (enemiesEngaged) this.lastCombatTime = this.time.now;
    const outOfCombat = !enemiesEngaged && this.time.now - this.lastCombatTime > PLAYER_HP_REGEN_DELAY_MS;
    if (outOfCombat && this.playerHealth.current < this.playerHealth.max) {
      this.playerHealth.heal((PLAYER_HP_REGEN_PER_SEC * delta) / 1000);
    }

    // Energy regenerates continuously, pausing briefly after each spend.
    if (this.time.now - this.lastEnergySpendTime > ENERGY_REGEN_DELAY_MS && this.energy.current < this.energy.max) {
      // ARCANE ABSORPTION (Mage keyed passive): extra essence regen while unlocked.
      const absorb = this.skills.isUnlocked(MAGE_ABSORPTION_ID) ? ARCANE_TUNING.absorption.regenPerSec : 0;
      // ECHO OF PASSION (Bard keyed buff): extra essence regen while the pulse runs.
      const passion = this.skillTimed.some((t) => t.id === ECHO_OF_PASSION_ID) ? BARD_SONGS_TUNING.echoOfPassion.energyPerSec : 0;
      this.energy.heal(((ENERGY_REGEN_PER_SEC + absorb + passion) * delta) / 1000);
    }
  }

  // --- Combat Depth v1: Dash ------------------------------------------------

  private isDashing(): boolean {
    return this.time.now < this.dashEndsAt;
  }

  /** Energy-gated lunge: spend energy, start the dash burst in the facing direction. */
  /** The DODGE effect (the former default dash lunge) — now an equippable skill
   *  action. Energy/cooldown/dead-guards are handled by the skill system. */
  private doDodge(): void {
    if (this.isDashing()) return; // already mid-lunge
    // Facing = last movement direction (or last-faced if idle); already unit-length.
    const len = Math.hypot(this.player.facingX, this.player.facingY) || 1;
    this.dashDir = { x: this.player.facingX / len, y: this.player.facingY / len };
    this.dashEndsAt = this.time.now + (DASH_DISTANCE / DASH_SPEED) * 1000;
    this.dashHits.clear();
    this.notifyBossesPlayerAction('dash'); // Envy's MIRROR may answer with a mimic-dash
  }

  private endDash(): void {
    this.dashEndsAt = 0;
    this.plowActive = false;
    this.chargeActive = false;
    this.gustActive = false;
    this.player.sprite.setVelocity(0, 0);
  }

  /** Abort an in-progress dash (used when control is frozen mid-lunge). */
  private cancelDash(): void {
    this.dashEndsAt = 0;
    this.plowActive = false;
    this.chargeActive = false;
    this.gustActive = false;
  }

  /** Dash damage reuses the level-derived growth: base + the melee per-level slope. */
  private dashDamage(): number {
    return DASH_DAMAGE + (this.progression.level - 1) * DMG_PER_LEVEL;
  }

  /** Damage each enemy the dash passes through, once per dash. */
  private dashDamageTick(): void {
    const px = this.player.x;
    const py = this.player.y;
    const dmg = this.dashDamage();

    if (
      this.sasquatch.isAlive &&
      !this.dashHits.has(this.sasquatch) &&
      this.sasquatch.distanceTo(px, py) <= DASH_HIT_RADIUS + 20
    ) {
      this.dashHits.add(this.sasquatch);
      const dealt = this.sasquatch.takeHit(dmg);
      if (dealt > 0) this.dmgDealtAccum += dealt; // lifesteal accounting
      this.spawnDamageNumber(this.sasquatch.x, this.sasquatch.y - 24, dealt, '#ffe9a8');
      this.lastCombatTime = this.time.now;
      if (!this.sasquatch.isAlive) {
        this.showBanner('Sasquatch defeated', 1600);
        this.notifyQuest('sasquatch-defeated');
        this.gainXP(this.sasquatch.xpReward);
      }
    }

    if (this.swarmersRevealed) {
      for (const s of this.swarmers) {
        if (!s.isAlive || this.dashHits.has(s)) continue;
        if (s.distanceTo(px, py) <= DASH_HIT_RADIUS) {
          this.dashHits.add(s);
          const dealt = s.takeHit(dmg);
          if (dealt > 0) this.dmgDealtAccum += dealt; // lifesteal accounting
          if (dealt > 0) {
            this.spawnDamageNumber(s.x, s.y - 16, dealt, '#ffe9a8');
            this.lastCombatTime = this.time.now;
            if (!s.isAlive) this.onSwarmerKilled(s);
          }
        }
      }
    }

    for (const a of this.angels) {
      if (!a.isAlive || this.dashHits.has(a)) continue;
      if (a.distanceTo(px, py) <= DASH_HIT_RADIUS + 12) {
        this.dashHits.add(a);
        const dealt = a.takeHit(dmg);
        if (dealt > 0) this.dmgDealtAccum += dealt; // lifesteal accounting
        if (dealt > 0) {
          this.spawnDamageNumber(a.x, a.y - 28 * a.variant.scale, dealt, '#ffe9a8');
          this.lastCombatTime = this.time.now;
          if (!a.isAlive) this.onAngelKilled(a);
        }
      }
    }

    for (const t of this.townsfolk) {
      if (!t.isAlive || this.dashHits.has(t)) continue;
      if (t.distanceTo(px, py) <= DASH_HIT_RADIUS) {
        this.dashHits.add(t);
        const dealt = t.takeHit(dmg);
        if (dealt > 0) this.dmgDealtAccum += dealt; // lifesteal accounting
        if (dealt > 0) {
          this.spawnDamageNumber(t.x, t.y - 20, dealt, '#ffe9a8');
          this.lastCombatTime = this.time.now;
          if (!t.isAlive) this.onTownsfolkKilled(t);
        }
      }
    }

    for (const g of this.guardians) {
      if (!g.isAlive || this.dashHits.has(g)) continue;
      if (g.distanceTo(px, py) <= DASH_HIT_RADIUS + 10) {
        this.dashHits.add(g);
        const dealt = g.takeHit(dmg);
        if (dealt > 0) this.dmgDealtAccum += dealt; // lifesteal accounting
        if (dealt > 0) {
          this.spawnDamageNumber(g.x, g.y - 26, dealt, '#ffe9a8');
          this.lastCombatTime = this.time.now;
          if (!g.isAlive) this.onGuardianKilled(g);
        }
      }
    }

    for (const c of this.cherubs) {
      if (!c.isAlive || this.dashHits.has(c)) continue;
      if (c.distanceTo(px, py) <= DASH_HIT_RADIUS + 16) {
        this.dashHits.add(c);
        const dealt = c.takeHit(dmg);
        if (dealt > 0) this.dmgDealtAccum += dealt; // lifesteal accounting
        if (dealt > 0) {
          this.spawnDamageNumber(c.x, c.y - 30 * c.variant.scale, dealt, '#ffe9a8');
          this.lastCombatTime = this.time.now;
          if (!c.isAlive) this.onCherubKilled(c);
        }
      }
    }

    for (const d of this.demons) {
      if (!d.isAlive || this.dashHits.has(d)) continue;
      if (d.distanceTo(px, py) <= DASH_HIT_RADIUS + 10) {
        this.dashHits.add(d);
        const dealt = d.takeHit(dmg);
        if (dealt > 0) this.dmgDealtAccum += dealt; // lifesteal accounting
        if (dealt > 0) {
          this.spawnDamageNumber(d.x, d.y - 24, dealt, '#ffd0a0');
          this.lastCombatTime = this.time.now;
          if (!d.isAlive) this.onDemonKilled(d);
        }
      }
    }

    for (const b of this.bosses) {
      if (!b.isAlive || this.dashHits.has(b)) continue;
      if (b.distanceTo(px, py) <= DASH_HIT_RADIUS + 24) {
        this.dashHits.add(b);
        const dealt = b.takeHit(dmg);
        if (dealt > 0) this.dmgDealtAccum += dealt; // lifesteal accounting
        if (dealt > 0) {
          this.spawnDamageNumber(b.x, b.y - 40, dealt, '#ffe9a8');
          this.lastCombatTime = this.time.now;
        }
      }
    }
  }

  /** A fading after-image streak so the lunge reads clearly. */
  private spawnDashTrail(): void {
    // COSMETIC reflavor: golden after-image while holy, the original cyan while demonic.
    const color = this.power.isHoly ? HOLY_DASH_COLOR : 0x9fe0ff;
    const ghost = this.add
      .rectangle(this.player.x, this.player.y, 18, 34, color, 0.35)
      .setDepth(11);
    this.worldFx.add(ghost);
    this.tweens.add({
      targets: ghost,
      alpha: 0,
      duration: 220,
      ease: 'Quad.out',
      onComplete: () => ghost.destroy(),
    });
  }

  // --- Combat Depth v1: Spirit swarmers -------------------------------------

  /** Spawn a fresh pack of swarmers spread around a world point. */
  private spawnSwarmPack(cx: number, cy: number): void {
    for (let i = 0; i < SWARM_PACK_SIZE; i++) {
      const a = (Math.PI * 2 * i) / SWARM_PACK_SIZE + Math.random() * 0.5;
      const r = 36 + Math.random() * 34;
      const s = new SpiritSwarmer(this, cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      s.onContact = () => this.onSwarmerContact(s);
      this.physics.add.collider(s.sprite, this.activeMap().layer);
      s.setRevealed(this.spirit.isActive());
      this.uiCamera?.ignore(s.sprite); // runtime world object: keep it off the UI camera
      this.swarmers.push(s);
    }
    this.swarmersRevealed = this.spirit.isActive();
  }

  /** Sync swarmer visibility/tangibility to Spirit Vision, then advance + prune them. */
  private updateSwarmers(): void {
    const sv = this.spirit.isActive();
    if (sv !== this.swarmersRevealed) {
      this.swarmersRevealed = sv;
      for (const s of this.swarmers) s.setRevealed(sv);
    }
    for (const s of this.swarmers) {
      const t = this.enemyAggroTarget(s, s.x, s.y); // continuous hierarchy aggro (summons > player)
      s.update(t.x, t.y, this.time.now);
    }
    if (this.swarmers.some((s) => !s.isAlive)) this.swarmers = this.swarmers.filter((s) => s.isAlive);
  }

  private haltSwarmers(): void {
    for (const s of this.swarmers) s.halt();
  }

  private onSwarmerContact(s: SpiritSwarmer): void {
    if (this.playerDead) return;
    if (this.parryGate(s.x, s.y)) return; // Samurai parry: melee negated + riposte
    if (this.redirectContactToSummon(s.x, s.y, SWARMER_CONTACT_DAMAGE)) return; // golem soaks it
    const dealt = this.playerHealth.damage(SWARMER_CONTACT_DAMAGE);
    this.player.flash();
    this.spawnDamageNumber(this.player.x, this.player.y - 26, dealt, '#c89bff');
    this.lastCombatTime = this.time.now;
    if (this.playerHealth.isDead) this.onPlayerDeath();
  }

  private onSwarmerKilled(s: SpiritSwarmer): void {
    this.gainXP(s.xpReward); // enemy data drives the award, same as the Sasquatch
  }

  /** Remove all swarmers from the world (dev reset). */
  private clearSwarmers(): void {
    for (const s of this.swarmers) s.destroy();
    this.swarmers = [];
    this.swarmersRevealed = false;
  }

  // --- Ranged: angels + projectiles -----------------------------------------

  /** Spawn an angel of the given variant; wire its volleys to the projectile system. */
  private spawnAngel(variantKey: AngelVariantKey, x: number, y: number): AngelEnemy {
    const a = new AngelEnemy(this, x, y, variantKey);
    const v = a.variant;
    a.onFire = (origin, dirs) => {
      for (const d of dirs) {
        this.projectiles.spawn({
          x: origin.x,
          y: origin.y,
          dirX: d.x,
          dirY: d.y,
          speed: v.projectileSpeed,
          damage: v.projectileDamage,
          maxRange: v.projectileRange,
          faction: 'enemy',
          // Dark-caster bolts are BLUE and tagged so onProjectileHitPlayer applies
          // that family's slow/weaken + stacking DoT; every other angel unchanged.
          color: variantKey === 'darkcaster' ? 0x7a9bff : 0xffe9a8,
          radius: HOLY_BOLT_RADIUS,
          tag: variantKey === 'darkcaster' ? 'caster-bolt' : undefined,
        });
      }
    };
    this.physics.add.collider(a.sprite, this.activeMap().layer); // the world it spawns IN
    this.uiCamera?.ignore(a.objects()); // runtime world objects: keep off the UI camera
    this.angels.push(a);
    return a;
  }

  /** Drive each angel with line-of-sight from the scene, then prune the dead. */
  private updateAngels(): void {
    for (const a of this.angels) {
      if (!this.isActiveWorldResident(a.x)) continue; // world-resident pause: foreign residents don't tick
      const t = this.enemyAggroTarget(a, a.x, a.y); // continuous hierarchy aggro (summons > player)
      const los = this.hasLineOfSight(a.x, a.y, t.x, t.y);
      a.update(t.x, t.y, this.time.now, los);
    }
    if (this.angels.some((a) => !a.isAlive)) this.angels = this.angels.filter((a) => a.isAlive);
  }

  private haltAngels(): void {
    for (const a of this.angels) a.halt();
  }

  private onAngelKilled(a: AngelEnemy): void {
    this.showBanner(a.variantKey === 'archangel' ? 'Archangel vanquished' : 'Angel vanquished', 1600);
    this.gainXP(a.xpReward); // enemy data drives the award, same as every enemy
    // Angels (and only angels) drop Holy Power at the death spot — a per-variant
    // amount of motes the player walks over to collect.
    this.dropHolyPower(a.x, a.y, a.variant.holyPowerDrop);
  }

  /**
   * Drop `n` Holy Power motes spread slightly around a world point. Every mote
   * is snapped to the nearest WALKABLE tile so a kill on/against blocking terrain
   * (water/mountain) never leaves an unreachable pickup — critical for the
   * descent's "collect their Holy Power" objectives, where each angel drops one.
   */
  private dropHolyPower(x: number, y: number, n: number): void {
    const map = this.activeMap(); // clamp on the world the kill happened in (Earth or Heaven)
    for (let i = 0; i < n; i++) {
      const ang = (Math.PI * 2 * i) / Math.max(1, n) + Math.random() * 0.6;
      const r = n > 1 ? 18 + Math.random() * 14 : 0;
      const spot = map.nearestWalkableWorld(x + Math.cos(ang) * r, y + Math.sin(ang) * r);
      this.pickups.spawn({
        x: spot.x,
        y: spot.y,
        type: 'holy-power',
        amount: 1,
      });
    }
  }

  /** Apply a collected pickup's effect (keyed by type) + brief feedback. */
  private onPickupCollected(e: PickupCollected): void {
    if (e.type === 'holy-power') this.holyPower.add(e.amount); // HUD ticks via onChange
    else if (e.type === 'plunder') this.notifyQuest('shipment-collected'); // descent Quest 2
    else if (e.type === 'salt') {
      // Act IV 4.4a: count salt patches toward the gather objective; the watcher
      // (updateArc) fires 'salt-gathered' once the required count is collected.
      if (this.arcMode === 'gather') this.arcGatherCount++;
    }
    this.spawnPickupPop(e.x, e.y, e.color);
    if (e.type === 'holy-power') this.autosave(); // meaningful moment: holy power collected
  }

  /** A quick rising sparkle + ring when a mote is collected. */
  private spawnPickupPop(x: number, y: number, color: number): void {
    const ring = this.add.circle(x, y, 8, color, 0).setStrokeStyle(3, color, 0.9).setDepth(13);
    this.worldFx.add(ring);
    this.tweens.add({
      targets: ring,
      scale: 2.4,
      alpha: 0,
      duration: 320,
      ease: 'Quad.out',
      onComplete: () => ring.destroy(),
    });
    const spark = this.add
      .text(x, y, '✦', { fontFamily: 'system-ui, sans-serif', fontSize: '16px', color: '#fff1b8' })
      .setOrigin(0.5)
      .setDepth(13);
    this.worldFx.add(spark);
    this.tweens.add({
      targets: spark,
      y: y - 26,
      alpha: 0,
      duration: 520,
      ease: 'Quad.out',
      onComplete: () => spark.destroy(),
    });
  }

  /** Damage the player when an enemy bolt connects; tagged bolts route their
   *  family's on-hit debuffs (the dark-caster's slow/weaken + stacking DoT). */
  private onProjectileHitPlayer(damage: number, tag?: string): void {
    if (this.playerDead) return;
    if (this.time.now < this.vanishGraceUntil) return; // VANISH: the bolt finds empty shadow
    if (this.deflectProjectileGate()) return; // Monk DEFLECT: the bolt is turned aside
    const dealt = this.playerHealth.damage(damage);
    this.player.flash();
    this.spawnDamageNumber(this.player.x, this.player.y - 26, dealt, '#ffd27a');
    this.lastCombatTime = this.time.now;
    if (tag === 'caster-bolt' && !this.playerHealth.isDead) this.applyCasterDebuffs();
    if (this.playerHealth.isDead) this.onPlayerDeath();
  }

  /** DARK-CASTER on-hit: refresh the slow + weaken windows and add a DoT stack
   *  (capped) — all resolved per-frame by updateControlEffects. */
  private applyCasterDebuffs(): void {
    const now = this.time.now;
    if (now < this.harmImmuneUntil) return; // Priest HARM IMMUNITY: afflictions never land

    this.casterSlowUntil = now + CASTER_SLOW_MS;
    this.casterWeakenUntil = now + CASTER_WEAKEN_MS;
    this.casterDotStacks = this.casterDotStacks.filter((until) => now < until);
    if (this.casterDotStacks.length < CASTER_DOT_MAX_STACKS) this.casterDotStacks.push(now + CASTER_DOT_STACK_MS);
    if (this.casterDotNextTickAt === 0) this.casterDotNextTickAt = now + CASTER_DOT_TICK_MS;
  }

  /**
   * True if no BLOCKING terrain lies between two world points — sampled along the
   * segment (deliberately simple, no pathfinding). Lets the player break the
   * angel's line of sight behind a mountain so it stops firing and repositions.
   */
  private hasLineOfSight(ax: number, ay: number, bx: number, by: number): boolean {
    const dist = Phaser.Math.Distance.Between(ax, ay, bx, by);
    const steps = Math.max(1, Math.ceil(dist / (this.map.tileSize * 0.5)));
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const terr = this.map.terrainAtWorld(ax + (bx - ax) * t, ay + (by - ay) * t);
      if (terr?.blocks) return false;
    }
    return true;
  }

  /** A small fading flash where a bolt impacts — pooled (fires per bolt impact). */
  private spawnBoltImpact(x: number, y: number, color: number): void {
    this.circleFx.show(x, y, 6, color, { alpha: 0.85, toScale: 2.2, durationMs: 180 });
  }

  /** Remove all angels and any bolts in flight (dev reset). */
  private clearAngels(): void {
    for (const a of this.angels) a.destroy();
    this.angels = [];
    this.projectiles.clear();
  }

  /** DEV: spawn an angel variant out at its preferred range so it engages at once. */
  private devSpawnAngel(variantKey: AngelVariantKey): void {
    const v = ANGEL_VARIANTS[variantKey];
    const len = Math.hypot(this.player.facingX, this.player.facingY) || 1;
    this.spawnAngel(
      variantKey,
      this.player.x + (this.player.facingX / len) * v.preferredRange,
      this.player.y + (this.player.facingY / len) * v.preferredRange,
    );
  }

  // --- Heaven's Defenders: the Cherub / Cherubim ----------------------------

  /** The active world's map (Earth or Heaven) — for terrain-aware drops/queries. */
  private activeMap(): WorldMapLike {
    return this.worlds[this.activeWorld]?.map ?? this.map;
  }

  /**
   * Spawn a Cherub of the given variant; wire its volleys (reusing the projectile
   * system) and its melee strike. It collides with the given terrain layer (the
   * world it belongs to). A hybrid, dangerous-at-all-ranges divine guardian.
   */
  private spawnCherub(variantKey: CherubVariantKey, x: number, y: number, mapLayer: Phaser.Tilemaps.TilemapLayerBase): Cherub {
    const c = new Cherub(this, x, y, variantKey);
    const v = c.variant;
    c.onFire = (origin, dirs) => {
      for (const d of dirs) {
        this.projectiles.spawn({
          x: origin.x,
          y: origin.y,
          dirX: d.x,
          dirY: d.y,
          speed: v.projectileSpeed,
          damage: v.projectileDamage,
          maxRange: v.projectileRange,
          faction: 'enemy',
          color: 0xfff1b8, // radiant gold-white
          radius: CHERUB_BOLT_RADIUS,
        });
      }
    };
    c.onMelee = (dmg) => this.enemyMeleeDamage(c.x, c.y, dmg); // a summon it's chasing soaks the blow
    this.physics.add.collider(c.sprite, mapLayer);
    this.uiCamera?.ignore(c.objects()); // runtime world objects: keep off the UI camera
    this.cherubs.push(c);
    return c;
  }

  /** Drive every Cherub (line of sight from the scene), then prune the dead. Cherubs are a
   *  BOSS-ADD type — they obey the summon aggro hierarchy via enemyAggroTarget (LoS still to
   *  the chosen target so they aim/kite a summon they're pulled onto, not just the player). */
  private updateCherubs(): void {
    for (const c of this.cherubs) {
      if (!this.isActiveWorldResident(c.x)) continue; // world-resident pause: foreign residents don't tick
      const t = this.enemyAggroTarget(c, c.x, c.y);
      const los = this.hasLineOfSight(c.x, c.y, t.x, t.y);
      c.update(t.x, t.y, this.time.now, los);
    }
    if (this.cherubs.some((c) => !c.isAlive)) this.cherubs = this.cherubs.filter((c) => c.isAlive);
  }

  private haltCherubs(): void {
    for (const c of this.cherubs) c.halt();
  }

  /** A Cherub's melee strike landed on the player. */
  private onCherubMelee(damage: number): void {
    if (this.playerDead) return;
    if (this.parryGate(this.player.x, this.player.y)) return; // Samurai parry: melee negated + riposte
    const dealt = this.playerHealth.damage(damage);
    this.player.flash();
    this.spawnDamageNumber(this.player.x, this.player.y - 26, dealt, '#fff1b8');
    this.lastCombatTime = this.time.now;
    if (this.playerHealth.isDead) this.onPlayerDeath();
  }

  /** A melee swing from an enemy/boss-add at (ex,ey): if an aggro-drawing summon is adjacent
   *  it SOAKS the blow (the add is attacking the summon it was pulled onto); else the player
   *  takes it. Used by demons + cherubs so boss adds actually damage the summon they chase. */
  private enemyMeleeDamage(ex: number, ey: number, damage: number): void {
    if (this.playerDead) return;
    if (this.redirectContactToSummon(ex, ey, damage)) return; // a summon intercepts the blow
    this.onCherubMelee(damage);
  }

  private onCherubKilled(c: Cherub): void {
    this.showBanner(c.variantKey === 'cherubim' ? 'The Cherubim falls!' : 'Cherub vanquished', 1800);
    this.gainXP(c.xpReward); // enemy data drives the award
    this.dropHolyPower(c.x, c.y, c.holyPowerDrop); // larger drops than Earth angels
  }

  /** Apply damage to every Cherub within `range` of (x,y); award XP + drops on kills. */
  private hitCherubsInRange(x: number, y: number, range: number, damage: number, where?: (ex: number, ey: number) => boolean): void {
    for (const c of this.cherubs) {
      if (!c.isAlive) continue;
      if (c.distanceTo(x, y) <= range + 14 && (!where || where(c.x, c.y))) {
        const dealt = c.takeHit(damage);
        if (dealt > 0) this.dmgDealtAccum += dealt; // lifesteal accounting
        if (dealt > 0) {
          this.spawnDamageNumber(c.x, c.y - 30 * c.variant.scale, dealt, '#ffffff');
          this.lastCombatTime = this.time.now;
          if (!c.isAlive) this.onCherubKilled(c);
        }
      }
    }
  }

  /** Remove all Cherubs (and their bolts) — dev reset / teardown. */
  private clearCherubs(): void {
    for (const c of this.cherubs) c.destroy();
    this.cherubs = [];
    this.projectiles.clear();
  }

  /** Seed the placed Heaven defenders (their fixed positions live in heavenWorld.ts). */
  private seedHeavenCherubs(): void {
    const o = this.heavenMap.bounds;
    for (const s of HEAVEN_CHERUB_SPAWNS) {
      this.spawnCherub(s.variant, o.x + s.x, o.y + s.y, this.heavenMap.layer);
    }
  }

  /** DEV: spawn a Cherub variant just ahead of the player, in the ACTIVE world. */
  private devSpawnCherub(variantKey: CherubVariantKey): void {
    const len = Math.hypot(this.player.facingX, this.player.facingY) || 1;
    const ahead = 200;
    this.spawnCherub(
      variantKey,
      this.player.x + (this.player.facingX / len) * ahead,
      this.player.y + (this.player.facingY / len) * ahead,
      this.activeMap().layer,
    );
  }

  /**
   * DEV-ONLY NUKE (gated by DEV_MODE with the rest of the dev panel; NOT a player
   * ability). Deals massive damage to every active enemy via their EXISTING
   * hit/death paths, so XP + Holy Power drops still happen normally. `includeBoss`
   * = true nukes Archangel Michael too (skip the fight); false leaves the boss
   * alive (clear trash / his summoned adds while testing him solo).
   */
  private devSmite(includeBoss: boolean): void {
    const HUGE = 1_000_000; // enough to one-shot anything (damage is clamped to HP)
    const R = 1e9; // unbounded range — hits every enemy regardless of distance
    const px = this.player.x;
    const py = this.player.y;

    // Sasquatch (killed inline elsewhere; replicate its on-death rewards here).
    if (this.sasquatch.isAlive) {
      const dealt = this.sasquatch.takeHit(HUGE);
      if (dealt > 0) this.dmgDealtAccum += dealt; // lifesteal accounting
      if (dealt > 0 && !this.sasquatch.isAlive) {
        this.showBanner('Sasquatch defeated', 1600);
        this.notifyQuest('sasquatch-defeated');
        this.gainXP(this.sasquatch.xpReward);
      }
    }
    // Every range-killable enemy routes through its normal kill handler (XP/drops).
    this.hitSwarmersInRange(px, py, R, HUGE); // (revealed swarmers only, as in normal play)
    this.hitAngelsInRange(px, py, R, HUGE);
    this.hitTownsfolkInRange(px, py, R, HUGE);
    this.hitGuardiansInRange(px, py, R, HUGE);
    this.hitCherubsInRange(px, py, R, HUGE); // includes Michael's summoned adds
    this.hitDemonsInRange(px, py, R, HUGE); // Hell's demons
    if (includeBoss) this.hitBossesInRange(px, py, R, HUGE); // → die → onDefeat (rewards + hook)
  }

  // --- BOSS FRAMEWORK: generic, data-driven bosses --------------------------
  //
  // Every boss is a generic Boss controller (src/boss/Boss.ts) read from a BossDef
  // (src/boss/bossData.ts). The scene owns the shared boss HP bar, summon/cap
  // tracking, and the effect hooks (this.bossHooks → existing projectile/melee/
  // pickup/XP systems). Archangel Michael is just MICHAEL_DEF on this framework
  // (identical play). A future quest can drive a boss via activate()/reset().

  /** Create a boss from its definition at a world position; wire it. Returns it. */
  private spawnBoss(def: BossDef, worldX: number, worldY: number, mapLayer: Phaser.Tilemaps.TilemapLayerBase): Boss {
    const boss = new Boss(this, def, worldX, worldY, this.bossHooks);
    boss.onPhaseChange = (phase) => this.onBossPhaseChange(boss, phase);
    boss.onDefeat = () => this.onBossDefeated(boss);
    this.physics.add.collider(boss.sprite, mapLayer);
    this.uiCamera?.ignore(boss.objects());
    this.bosses.push(boss);
    return boss;
  }

  /** Build Archangel Michael (MICHAEL_DEF) at his sanctum + the sanctum marker. */
  private setupMichael(): void {
    const o = this.heavenMap.bounds;
    const sx = o.x + MICHAEL_DEF.placement.x;
    const sy = o.y + MICHAEL_DEF.placement.y;
    this.addHeavenLabel(sx, sy - 60, '⚔ Michael’s Sanctum ⚔', '#fff3c4');
    const ring = this.add.circle(sx, sy, 30, 0xfff1b8, 0.22).setDepth(6);
    this.tweens.add({ targets: ring, scale: 2, alpha: 0.05, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.michael = this.spawnBoss(MICHAEL_DEF, sx, sy, this.heavenMap.layer);
  }

  /** TRIGGER: begin the Michael fight (proximity or dev button). */
  private startMichaelFight(): void {
    this.michael.activate();
  }

  /** RESET: Michael dormant, full HP, Phase 1, adds cleared. */
  private resetMichael(): void {
    this.clearBossAdds(this.michael.id);
    this.michael.reset();
  }

  /** Remove transient dev-spawned framework bosses (the test boss) + their adds —
   *  preserving the persistent Michael and the Sin bosses (those have own resets). */
  private removeDevBosses(): void {
    for (const b of this.bosses) {
      if (b === this.michael || this.sinBosses.includes(b)) continue;
      this.clearBossAdds(b.id);
      b.destroy();
    }
    this.bosses = this.bosses.filter((b) => b === this.michael || this.sinBosses.includes(b));
  }

  /** Drive every framework boss: proximity activation, behavior, then the boss bar. */
  private updateBosses(): void {
    for (const b of this.bosses) {
      // Rift scene: once the lie cutscene starts, Semyaza is frozen (no AI/attacks)
      // until he fades — the scene drives him, not the combat loop.
      if (this.riftLieFired && b === this.semyaza) {
        b.halt();
        continue;
      }
      if (!this.isActiveWorldResident(b.x)) continue; // world-resident pause: foreign residents don't tick
      if (!b.isActive && b.isAlive && b.distanceTo(this.player.x, this.player.y) <= b.def.activationRange) b.activate();
      b.update(this.player.x, this.player.y, this.time.now);
    }
    // Prune defeated bosses (keep Michael — he resets rather than vanishes).
    if (this.bosses.some((b) => !b.isAlive && b !== this.michael)) {
      for (const b of this.bosses) if (!b.isAlive && b !== this.michael) this.clearBossAdds(b.id);
      this.bosses = this.bosses.filter((b) => b.isAlive || b === this.michael);
    }
    this.refreshBossBar();
  }

  private haltBosses(): void {
    for (const b of this.bosses) b.halt();
  }

  /** Apply a player hit to every framework boss in range. */
  private hitBossesInRange(x: number, y: number, range: number, damage: number, where?: (ex: number, ey: number) => boolean): void {
    for (const b of this.bosses) {
      if (!b.isAlive) continue;
      if (b.distanceTo(x, y) <= range + 24 && (!where || where(b.x, b.y))) {
        // SEMYAZA (rift scene): the player must NEVER kill him — his HP is clamped at
        // SEMYAZA_LIE_THRESHOLD, and reaching it HALTS the fight into the lie cutscene.
        let dmg = damage;
        if (b === this.semyaza && !this.riftLieFired) {
          const floor = b.health.max * SEMYAZA_LIE_THRESHOLD;
          dmg = Math.max(0, Math.min(damage, b.health.current - floor));
        }
        const dealt = dmg > 0 ? b.takeHit(dmg) : 0;
        if (dealt > 0) this.dmgDealtAccum += dealt; // lifesteal accounting
        if (dealt > 0) {
          this.spawnDamageNumber(b.x, b.y - 40, dealt, '#ffffff');
          this.lastCombatTime = this.time.now;
        }
        if (b === this.semyaza && !this.riftLieFired && b.health.current <= b.health.max * SEMYAZA_LIE_THRESHOLD + 0.5) {
          this.startRiftLie();
        }
      }
    }
  }

  /** Boss summon hook: spawn up to the cap, tracked per boss, near the boss (on walkable tiles). */
  private summonForBoss(bossId: string, bx: number, by: number, bossName: string, enemy: string, count: number, cap: number): void {
    // REGION CHAMPIONS ('region-zone:<zoneId>'): adds are the ZONE's own families,
    // spawned through the pooled Europe spawner — they join regionLive (despawned
    // with the chunk, counted by kill objectives) and respect EUROPE_ENEMY_CAP.
    if (enemy.startsWith('region-zone:')) {
      const zoneId = enemy.slice('region-zone:'.length);
      const fams = (getZone(zoneId)?.enemyFamilies ?? []).filter((f) => f in EXISTING_FAMILY_DOMAIN);
      this.championAdds = this.championAdds.filter((a) => a.isAlive);
      const room = Math.max(0, EUROPE_ENEMY_CAP - this.regionLiveCount());
      const n = Math.min(count, cap - this.championAdds.length, room, fams.length === 0 ? 0 : count);
      const map = this.activeMap();
      for (let i = 0; i < n; i++) {
        const fam = fams[i % fams.length];
        const a = Math.random() * Math.PI * 2;
        const r = 90 + Math.random() * 50;
        const spot = map.nearestWalkableWorld(bx + Math.cos(a) * r, by + Math.sin(a) * r);
        this.spawnRegionEnemy(zoneId, fam, spot.x, spot.y, DOMAIN_TINT[EXISTING_FAMILY_DOMAIN[fam]]);
        const rec = this.regionLive[this.regionLive.length - 1];
        if (rec && rec.zoneId === zoneId) this.championAdds.push(rec.entity);
      }
      if (n > 0) this.showBanner(`${bossName} summons reinforcements!`, 1400);
      return;
    }
    let adds = (this.bossAdds.get(bossId) ?? []).filter((a) => a.isAlive);
    const n = Math.min(count, cap - adds.length);
    if (n > 0) {
      const map = this.activeMap();
      const layer = map.layer;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = 90 + Math.random() * 50;
        const spot = map.nearestWalkableWorld(bx + Math.cos(a) * r, by + Math.sin(a) * r);
        const add = enemy === 'demon' ? this.spawnDemon(spot.x, spot.y, layer) : this.spawnCherub(enemy as CherubVariantKey, spot.x, spot.y, layer);
        adds.push(add);
      }
      this.showBanner(`${bossName} summons reinforcements!`, 1400);
    }
    this.bossAdds.set(bossId, adds);
  }

  /** Remove a boss's summoned adds — also from the live cherub/demon lists. */
  private clearBossAdds(bossId: string): void {
    const adds = this.bossAdds.get(bossId);
    if (!adds) return;
    const set = new Set(adds);
    for (const a of adds) if (a.isAlive) a.destroy();
    this.cherubs = this.cherubs.filter((c) => !set.has(c));
    this.demons = this.demons.filter((d) => !set.has(d));
    this.bossAdds.delete(bossId);
  }

  /** Phase-transition telegraph: flash + burst + banner so escalation is felt. */
  private onBossPhaseChange(boss: Boss, phase: number): void {
    if (phase <= 1) return; // Phase 1 is activation, not an escalation beat
    this.showBanner(`${boss.name} — Phase ${phase}!`, 1800);
    const ring = this.add.circle(boss.x, boss.y, 30, 0xffffff, 0).setStrokeStyle(5, 0xfff1b8, 0.9).setDepth(13);
    this.worldFx.add(ring);
    this.tweens.add({ targets: ring, scale: 4, alpha: 0, duration: 520, ease: 'Quad.out', onComplete: () => ring.destroy() });
    boss.sprite.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.time.delayedCall(140, () => { if (boss.isAlive) boss.sprite.setTint(boss.def.sprite.tint).setTintMode(Phaser.TintModes.MULTIPLY); });
  }

  /** Defeat (generic): clear adds, climactic burst, XP + Holy Power, then the boss's hook. */
  private onBossDefeated(boss: Boss): void {
    this.clearBossAdds(boss.id);
    this.hazards.clearBoss(boss.id); // sweep away any lingering ground hazards it left
    this.spawnLevelUpBurst(); // a quick radiant burst (reuse)
    const burst = this.add.circle(boss.x, boss.y, 40, 0xfff1b8, 0.5).setDepth(13);
    this.worldFx.add(burst);
    this.tweens.add({ targets: burst, scale: 6, alpha: 0, duration: 900, ease: 'Quad.out', onComplete: () => burst.destroy() });
    if (boss.def.xpReward > 0) this.gainXP(boss.def.xpReward);
    if (boss.def.holyPowerDrop > 0) this.dropHolyPower(boss.x, boss.y, boss.def.holyPowerDrop);

    const sinIndex = this.sinBosses.indexOf(boss);
    if (boss.def.onDefeatHook === 'god-judgment') {
      this.michaelDefeated = true; // GATE: unlocks the God's-judgment beat at the throne
      this.showBanner(MICHAEL_VICTORY_LINE, 3000);
      this.time.delayedCall(3200, () => this.showBanner(GOD_JUDGMENT_HOOK, 4200));
      this.notifyQuest('michael-defeated'); // Quest 6 obj 1 → arrow now points to the throne
    } else if (sinIndex >= 0) {
      this.onSinDefeated(sinIndex); // advance the gauntlet + unlock/mark the next Sin
    } else if (boss === this.dragonBoss || boss === this.beastBoss || boss === this.satanBoss) {
      this.onTrinityBossDefeated(boss); // advance the staged Trinity (Dragon → Beast → Satan → ending)
    } else if (boss.def.onDefeatHook?.startsWith('region-champion:')) {
      // REGION CHAMPION: defeat completes its boss beat (the factory trigger).
      const beatId = boss.def.onDefeatHook.slice('region-champion:'.length);
      this.showBanner(`${boss.name} defeated!`, 2400);
      const hit = this.regionBeatForQuest(beatId);
      if (hit && this.chain.activeQuest?.id === beatId) this.notifyQuest(triggerForBeat(hit.beat) as ObjectiveTrigger);
      if (this.championBoss === boss) {
        this.championBoss = undefined;
        this.championBeatId = null;
        this.championZoneId = null;
        this.championAdds = [];
      }
    } else {
      this.showBanner(`${boss.name} defeated!`, 2400);
    }
    this.autosave(); // meaningful moment: a boss fell
  }

  /** The shared boss HP bar (UI camera, fixed): name + phase + HP, top-centre. */
  private createBossHud(): void {
    const depth = 2050;
    this.bossBarBg = this.add
      .rectangle(0, 0, 320, 22, 0x10060a, 0.85)
      .setStrokeStyle(2, 0xfff1b8, 0.95)
      .setScrollFactor(0)
      .setDepth(depth)
      .setVisible(false);
    this.bossBar = new HealthBar(this, 312, 16, depth + 1, 0xffe06a);
    this.bossBar.setScrollFactor(0);
    this.bossBar.setVisible(false);
    this.bossNameText = this.add
      .text(0, 0, '', { fontFamily: 'system-ui, sans-serif', fontSize: '13px', color: '#fff3c4', fontStyle: 'bold' })
      .setOrigin(0.5, 1)
      .setScrollFactor(0)
      .setStroke('#1a0d04', 4)
      .setDepth(depth + 2)
      .setVisible(false);

    const layout = (): void => {
      const insets = getInsets(this);
      const cx = this.scale.width / 2;
      const top = insets.top + UI_MARGIN + 40; // below the top-centre quest tracker
      this.bossBarBg.setPosition(cx, top + 11);
      this.bossBar.setPosition(cx - 156, top + 11);
      this.bossNameText.setPosition(cx, top - 2);
    };
    layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, layout);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, layout)); // never leak across scene restarts
  }

  /** Show the bar for the boss the player is currently engaged with (active + near).
   *  Residency-gated: a paused foreign boss's frozen isAggro must never show here. */
  private refreshBossBar(): void {
    const boss = this.bosses.find((b) => b.isAggro && this.isActiveWorldResident(b.x));
    const show = boss !== undefined;
    this.bossBarBg.setVisible(show);
    this.bossBar.setVisible(show);
    this.bossNameText.setVisible(show);
    if (boss) {
      this.bossBar.setRatio(boss.hpRatio);
      this.bossNameText.setText(`${boss.name} — Phase ${boss.currentPhase}`);
    }
  }

  /** Slam SPECIAL effect: damage the player if within the AoE + an impact ring. */
  private bossSlam(x: number, y: number, radius: number, damage: number): void {
    const ring = this.add.circle(x, y, radius, 0xff5a2a, 0.22).setStrokeStyle(4, 0xffd24a, 0.95).setDepth(13);
    this.worldFx.add(ring);
    this.tweens.add({ targets: ring, alpha: 0, scale: 1.1, duration: 300, ease: 'Quad.out', onComplete: () => ring.destroy() });
    if (!this.playerDead && Phaser.Math.Distance.Between(this.player.x, this.player.y, x, y) <= radius) {
      this.onCherubMelee(damage); // reuse: damage the player
    }
  }

  /** A readable wind-up ring (telegraph) for a special move — the player can dodge. */
  private bossTelegraph(x: number, y: number, radius: number, durationMs: number): void {
    const ring = this.add.circle(x, y, radius, 0xff3b1f, 0.1).setStrokeStyle(3, 0xff6a3a, 0.85).setDepth(12);
    this.worldFx.add(ring);
    this.tweens.add({ targets: ring, alpha: { from: 0.08, to: 0.42 }, scale: { from: 0.5, to: 1 }, duration: durationMs, onComplete: () => ring.destroy() });
  }

  /** SHIELD pattern visual: raise/drop a glowing bubble around a boss (clear invuln tell). */
  private setBossShield(bossId: string, x: number, y: number, active: boolean): void {
    const existing = this.bossShields.get(bossId);
    if (active) {
      if (existing) return;
      const bubble = this.add.circle(x, y, 46, 0x8fdfff, 0.18).setStrokeStyle(3, 0xbff0ff, 0.95).setDepth(12);
      this.worldFx.add(bubble);
      this.uiCamera?.ignore(bubble); // world object: keep it off the UI camera
      this.tweens.add({ targets: bubble, scale: 1.12, alpha: 0.32, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.bossShields.set(bossId, bubble);
    } else if (existing) {
      this.tweens.killTweensOf(existing);
      existing.destroy();
      this.bossShields.delete(bossId);
    }
  }

  /** Clear-feedback spark when a hit is BLOCKED by an active shield. */
  private spawnBlockedFx(x: number, y: number): void {
    const spark = this.add.text(x, y - 46, 'BLOCKED', { fontFamily: 'system-ui, sans-serif', fontSize: '13px', color: '#bff0ff', fontStyle: 'bold' }).setOrigin(0.5).setStroke('#0a2030', 4).setDepth(14);
    this.worldFx.add(spark);
    this.uiCamera?.ignore(spark);
    this.tweens.add({ targets: spark, y: y - 70, alpha: 0, duration: 480, ease: 'Quad.out', onComplete: () => spark.destroy() });
  }

  /** Tell every active boss the player just acted (drives the 'mirror' reactive pattern). */
  private notifyBossesPlayerAction(type: 'ranged' | 'dash'): void {
    for (const b of this.bosses) if (b.isActive) b.notePlayerAction(type);
  }

  /** DEV: spawn the data-only TEST BOSS just ahead of the player, in the active world. */
  private devSpawnTestBoss(): void {
    const len = Math.hypot(this.player.facingX, this.player.facingY) || 1;
    const ahead = 300;
    const b = this.spawnBoss(
      TEST_BOSS_DEF,
      this.player.x + (this.player.facingX / len) * ahead,
      this.player.y + (this.player.facingY / len) * ahead,
      this.activeMap().layer,
    );
    b.activate();
  }

  // --- The 7 Deadly Sins (Batch 1): gauntlet order + the three Hell bosses ----
  //
  // Three DISTINCT Sin bosses (Wrath/Sloth/Gluttony) authored as DATA (SIN_DEFS),
  // fought IN ORDER in Hell. Only the currently-available Sin is spawned, so a
  // LOCKED Sin literally doesn't exist yet (it can't be woken or hit); defeating
  // one advances the serializable gauntlet cursor and spawns the next. A reused
  // world beacon marks where to go. State: `this.sins` (SinGauntlet) + sinBosses.

  /** Spawn Sin `i` (0-based) at its Hell placement if not already live; return it. */
  private ensureSinSpawned(i: number): Boss {
    const existing = this.sinBosses[i];
    if (existing && existing.isAlive) return existing;
    const def = SIN_DEFS[i];
    const o = this.hellMap.bounds;
    const spot = this.hellMap.nearestWalkableWorld(o.x + def.placement.x, o.y + def.placement.y);
    const boss = this.spawnBoss(def, spot.x, spot.y, this.hellMap.layer);
    this.sinBosses[i] = boss;
    return boss;
  }

  /** Spawn the currently-available (next undefeated, unlocked) Sin, dormant. */
  private spawnAvailableSin(): void {
    const i = this.sins.nextIndex;
    if (i >= 0) this.ensureSinSpawned(i);
  }

  /** A defeated boss that is a Sin → advance the gauntlet, announce, unlock the next. */
  private onSinDefeated(i: number): void {
    this.sinBosses[i] = undefined; // the dead instance gets pruned by updateBosses
    this.sins.recordDefeat(i);
    this.notifyQuest('sin-defeated'); // Quest 7: advance to the next Sin objective (lockstep)
    this.showBanner(`${SIN_DEFS[i].name} — Sin ${i + 1} — vanquished!`, 2600);
    if (this.sins.nextIndex >= 0) {
      this.spawnAvailableSin(); // place the next Sin deeper in Hell
      this.time.delayedCall(2700, () => this.showBanner('Another Sin stirs deeper in Hell…', 2400));
    } else {
      // ALL SEVEN fallen — Satan's Lair is now OPEN. Direct the player there; the
      // beacon (updateSinMarker) points at the lair, and approaching it starts the
      // Trinity (see updateLairEntry).
      this.time.delayedCall(2700, () => this.showBanner('The seven are fallen. Satan’s Lair stands open — face the Unholy Trinity.', 5000));
    }
  }

  /** The reused world beacon: mark the available, not-yet-engaged Sin while in Hell;
   *  once all seven are fallen, point it at Satan's Lair (the Trinity's future site). */
  private updateSinMarker(): void {
    if (this.activeWorld !== WORLD_HELL) {
      this.sinMarker.hide();
      return;
    }
    // ENDING CUE: after Satan falls, reuse this beacon to point the player at the
    // redemption angel until they walk up to it (the speech is player-driven). This
    // takes priority over the Sin/lair beacons (the gauntlet is long over by now).
    if (this.trinity.ending && this.endingAngel && !this.endingSpeechStarted && this.endingAngelPos) {
      this.sinMarker.show(this.endingAngelPos.x, this.endingAngelPos.y, 'Approach the angel');
      return;
    }
    // Quest 7 owns Hell guidance: its quest marker (gold beacon + off-screen edge
    // arrow) is the single indicator on the current Sin / lair. Suppress this older
    // beacon while that quest is active so the two never double up. It remains as a
    // fallback for non-quest states (e.g. a dev-reset gauntlet with no active quest).
    if (this.chain.activeQuest?.id === SEVEN_SINS_QUEST_ID) {
      this.sinMarker.hide();
      return;
    }
    const i = this.sins.nextIndex;
    if (i >= 0) {
      const boss = this.sinBosses[i];
      if (boss && boss.isAlive && !boss.isActive) this.sinMarker.show(boss.x, boss.y, `Sin ${i + 1}: ${SIN_DEFS[i].name}`);
      else this.sinMarker.hide();
      return;
    }
    // All seven beaten → the lair is OPEN. Mark it (text reflects Trinity progress);
    // hide the beacon while actually fighting in the lair.
    if (this.sins.count >= this.sins.builtCount) {
      // Hide the beacon while fighting in the lair, during the ending, or once done.
      if (this.trinity.inFight || this.trinity.ending || this.trinity.complete) {
        this.sinMarker.hide();
        return;
      }
      const o = this.hellMap.bounds;
      this.sinMarker.show(o.x + SATAN_LAIR.x, o.y + SATAN_LAIR.y, "Satan's Lair — face the Unholy Trinity");
    } else {
      this.sinMarker.hide();
    }
  }

  /** RESET: gauntlet back to 0, all Sin bosses gone (+ adds/projectiles/shields
   *  cleared via destroy), Sin 1 re-placed. */
  private resetSins(): void {
    for (let i = 0; i < this.sinBosses.length; i++) {
      const b = this.sinBosses[i];
      if (b) {
        this.clearBossAdds(b.id);
        b.destroy(); // also drops any active SHIELD bubble (via the shield hook)
      }
      this.sinBosses[i] = undefined;
    }
    this.bosses = this.bosses.filter((b) => b.isAlive); // drop the destroyed Sin instances
    this.projectiles.clear(); // drop any Sin bolts still in flight
    this.hazards.clearAll(); // sweep every ground hazard (Greed's zones)
    this.sins.reset(); // also clears the Sin-7 "Trinity coming soon" beat (it's derived from this count)
    this.spawnAvailableSin();
    this.sinMarker.hide();
  }

  /** Teleport the player to a boss (travelling to Hell if needed); optionally start it. */
  private teleportToBoss(boss: Boss, activate: boolean): void {
    this.cancelDash();
    const off = boss.def.activationRange + 80;
    const dest = { x: boss.x, y: boss.y + off };
    if (this.activeWorld !== WORLD_HELL) this.travelToWorld(WORLD_HELL, dest);
    else {
      this.player.sprite.setPosition(dest.x, dest.y);
      this.player.setDirection(0, 0);
      this.cameras.main.centerOn(boss.x, boss.y);
    }
    if (activate) boss.activate();
  }

  /** DEV: spawn + start a specific Sin (ignoring gating) and teleport to it. */
  private devStartSin(i: number): void {
    this.teleportToBoss(this.ensureSinSpawned(i), true);
  }

  // --- The Unholy Trinity: the staged Dragon → Beast → Satan finale + the ending ---
  //
  // Enterable once all 7 Sins are beaten. Approaching Satan's Lair STARTS a staged
  // sequence with recovery breathers: Dragon → (restore) → Beast → (restore) →
  // SATAN (the final boss) → his defeat fires the REDEMPTION ENDING (a friendly
  // angel, a speech, an Earth portal home to Seattle — the player carries over
  // intact). Dragon/Beast/Satan are DATA bosses (DRAGON_DEF/BEAST_DEF/SATAN_DEF). If
  // the player dies mid-stage, that stage RESTARTS (its boss resets to full HP +
  // dormant, re-activating on re-approach); completed stages are kept. State
  // (this.trinity) is serializable.

  /** Spawn a Trinity boss at the lair arena (on walkable ground). */
  private spawnTrinityBoss(def: BossDef): Boss {
    const o = this.hellMap.bounds;
    const spot = this.hellMap.nearestWalkableWorld(o.x + TRINITY_ARENA.x, o.y + TRINITY_ARENA.y);
    return this.spawnBoss(def, spot.x, spot.y, this.hellMap.layer);
  }

  /** Lair entry: in Hell, with all 7 Sins beaten, approaching the lair starts Stage 1. */
  private updateLairEntry(): void {
    if (this.activeWorld !== WORLD_HELL) return;
    if (this.trinity.started) return; // already running (or at the placeholder)
    if (this.sins.count < this.sins.builtCount) return; // lair stays CLOSED until the 7 Sins fall
    const o = this.hellMap.bounds;
    const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, o.x + SATAN_LAIR.x, o.y + SATAN_LAIR.y);
    if (d <= TRINITY_ENTER_RANGE) this.startTrinity();
  }

  /** STAGE 1: open the lair + summon the Dragon. */
  private startTrinity(): void {
    if (this.trinity.started) return;
    this.notifyQuest('entered-lair'); // Quest 7 obj 8: lair entered → Quest 7 completes
    this.trinity.toDragon();
    this.dragonBoss = this.spawnTrinityBoss(DRAGON_DEF);
    this.dragonBoss.activate();
    this.showBanner('The lair yawns open — THE DRAGON descends!', 2800);
    this.autosave(); // meaningful moment: entered the lair (Trinity begins)
  }

  /** A Trinity boss died → run the breather / advance the stage (Satan → the ending). */
  private onTrinityBossDefeated(boss: Boss): void {
    if (boss === this.dragonBoss) {
      this.dragonBoss = undefined;
      this.trinityBreather('The Dragon falls… something worse stirs.', () => this.startBeastStage());
    } else if (boss === this.beastBoss) {
      this.beastBoss = undefined;
      this.trinityBreather('The Beast is slain… and the Adversary himself awakens.', () => this.startSatanStage());
    } else if (boss === this.satanBoss) {
      this.satanBoss = undefined;
      this.onSatanDefeated(boss.x, boss.y); // the climactic death beat → the redemption ending
    }
  }

  /** BREATHER: restore the player to full, a beat, then continue the sequence
   *  (unless a reset voided this run in the meantime). */
  private trinityBreather(message: string, next: () => void): void {
    this.playerHealth.full();
    this.energy.full();
    this.showBanner(message, TRINITY_BREATHER_MS - 300);
    const run = this.trinityRun;
    this.time.delayedCall(TRINITY_BREATHER_MS, () => {
      if (this.trinityRun === run) next();
    });
  }

  /** STAGE 2: the Beast emerges. */
  private startBeastStage(): void {
    if (this.trinity.current !== 'dragon') return; // a reset interrupted the breather
    this.trinity.toBeast();
    this.beastBoss = this.spawnTrinityBoss(BEAST_DEF);
    this.beastBoss.activate();
    this.showBanner('THE BEAST rises — the lair shakes!', 2400);
  }

  /** STAGE 3: SATAN — the final boss. */
  private startSatanStage(): void {
    if (this.trinity.current !== 'beast') return; // a reset interrupted the breather
    this.trinity.toSatan();
    this.satanBoss = this.spawnTrinityBoss(SATAN_DEF);
    this.satanBoss.activate();
    this.showBanner('SATAN AWAKENS — the final reckoning.', 2800);
  }

  /** Satan reaches 0 HP → the dramatic death beat, then the redemption ending. */
  private onSatanDefeated(x: number, y: number): void {
    this.trinity.toEnding();
    this.controls.setEnabled(false); // the cutscene takes over
    this.player.setDirection(0, 0);
    this.cancelDash();
    this.hazards.clearAll(); // clear any hellground left over
    this.projectiles.clear();
    // A big climactic eruption + a clear "Satan is defeated" moment.
    const flash = this.add.circle(x, y, 60, 0xfff1b8, 0.85).setDepth(14);
    this.worldFx.add(flash);
    this.endingFx.push(flash);
    this.tweens.add({ targets: flash, scale: 14, alpha: 0, duration: 1400, ease: 'Quad.out', onComplete: () => flash.destroy() });
    this.showBanner('SATAN IS DEFEATED', 3200);
    this.time.delayedCall(3400, () => this.playRedemptionEnding(x, y));
  }

  /** THE REDEMPTION ENDING: a friendly radiant angel descends + speaks, then the
   *  Earth portal home opens. (Speech: REDEMPTION_LINES near the top of this file.) */
  private playRedemptionEnding(x: number, y: number): void {
    if (this.trinity.current !== 'ending') return; // voided by a reset
    this.player.setDirection(0, 0);
    this.playerHealth.full();
    this.energy.full();
    // The FIRST friendly angel: pure white-gold, peaceful — light piercing the lair.
    const angel = this.spawnRedemptionAngel(x, y - 30);
    // PLAYER-DRIVEN: the angel descends, then the player is freed to WALK UP to it.
    // updateRedemptionApproach() starts the speech on approach (no auto-talk). The
    // sinMarker beacon + this banner cue the player so they never stand confused.
    this.endingAngel = angel;
    this.endingAngelPos = { x, y: y - 30 };
    this.endingSpeechStarted = false;
    this.endingApproachArmedAt = this.time.now + 700; // let the angel descend + the cue read first
    this.time.delayedCall(1300, () => {
      if (this.trinity.current !== 'ending' || this.endingSpeechStarted) return;
      if (!this.playerDead) this.controls.setEnabled(true); // free to approach
      this.showBanner('A radiant angel descends. Approach it.', 4000);
    });
  }

  /** Per-frame (Hell, ending): walking up to the redemption angel BEGINS its speech. */
  private updateRedemptionApproach(): void {
    if (this.endingSpeechStarted || !this.endingAngel || !this.endingAngelPos) return;
    if (this.trinity.current !== 'ending') return;
    if (this.activeWorld !== WORLD_HELL || this.transitioning) return;
    if (this.time.now < this.endingApproachArmedAt) return; // spawn-frame grace
    if (this.dialogue.isOpen() || this.choice.isOpen()) return;
    const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.endingAngelPos.x, this.endingAngelPos.y);
    if (d <= ENDING_ANGEL_APPROACH_RANGE) this.startRedemptionSpeech();
  }

  /** Begin the redemption speech (reached the angel); on its end the Earth portal opens. */
  private startRedemptionSpeech(): void {
    if (this.endingSpeechStarted || this.trinity.current !== 'ending') return;
    this.endingSpeechStarted = true;
    this.sinMarker.hide(); // drop the "approach the angel" cue
    this.controls.setEnabled(false); // hold still for the speech (re-enabled at the portal)
    this.player.setDirection(0, 0);
    this.cancelDash();
    const pos = this.endingAngelPos!;
    this.dialogue.open([...REDEMPTION_LINES], () => {
      if (this.trinity.current === 'ending' && this.endingAngel) this.openEarthPortal(pos.x, pos.y, this.endingAngel);
    });
  }

  /** A radiant, benevolent angel sprite descending into the lair (ending visual). */
  private spawnRedemptionAngel(x: number, y: number): Phaser.GameObjects.GameObject {
    MainScene.ensureRedemptionAngelTexture(this);
    const glow = this.add.circle(x, y, 70, 0xfff3c4, 0.18).setDepth(12);
    const angel = this.add.image(x, y - 260, 'redemption-angel').setDepth(13).setScale(1.6).setAlpha(0);
    this.worldFx.add(glow);
    this.worldFx.add(angel);
    this.endingFx.push(glow, angel);
    // Descend gently from above with a radiant fade-in + a soft halo pulse.
    this.tweens.add({ targets: angel, y, alpha: 1, duration: 1200, ease: 'Quad.out' });
    this.tweens.add({ targets: glow, scale: 1.5, alpha: 0.32, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    return angel;
  }

  /** Open the Earth portal home after the angel's speech. */
  private openEarthPortal(_x: number, y: number, angel: Phaser.GameObjects.GameObject): void {
    this.endingAngel = undefined; // speech done; stop the approach/cue tracking
    this.endingAngelPos = undefined;
    // The angel ascends back into the light as the way home opens.
    this.tweens.add({ targets: angel, y: y - 280, alpha: 0, duration: 1200, ease: 'Quad.in' });
    // Open the portal a clear WALKING distance from the player (never on top of
    // them — that would feel like a teleport). It's a real one-way walk-through.
    this.spawnEarthPortal(this.player.x, this.player.y + 210);
    this.showBanner('A way home opens. Step through to return to Earth.', 3600);
    this.controls.setEnabled(true); // let the player walk into the portal
  }

  /** Create/arm the one-way ending Earth portal at the nearest walkable spot to (x,y). */
  private spawnEarthPortal(x: number, y: number): void {
    this.earthPortal?.destroy();
    const spot = this.activeMap().nearestWalkableWorld(x, y);
    this.earthPortal = new EarthPortal(this, spot.x, spot.y);
    this.uiCamera?.ignore(this.earthPortal.objects());
    this.earthPortalArmedAt = this.time.now + 500; // grace: don't trigger on the spawn frame
  }

  /** Per-frame: stepping into the Earth portal returns the player to Seattle (intact). */
  private updateEarthPortal(): void {
    if (!this.earthPortal || this.transitioning || this.time.now < this.worldCooldownUntil) return;
    if (this.time.now < this.earthPortalArmedAt) return; // arming grace (so it's a real walk-through)
    if (this.activeWorld !== WORLD_HELL) return; // ONE-WAY: only ever lair (Hell) → Seattle
    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, this.earthPortal.x, this.earthPortal.y) <= PORTAL_ENTER_RANGE) {
      this.returnToEarth();
    }
  }

  /** Step through the Earth portal → back to the SEATTLE start spawn, character intact. */
  private returnToEarth(): void {
    this.trinity.toComplete();
    this.earthPortal?.destroy();
    this.earthPortal = undefined;
    for (const o of this.endingFx) o.destroy();
    this.endingFx = [];
    // Reuse the world-transition system; the SAME character carries across (level,
    // HP, energy, holy power, Holy Bolt + holy reflavor are untouched by travel).
    this.travelToWorld(WORLD_EARTH, { x: this.town.spawn.x, y: this.town.spawn.y });
    this.time.delayedCall(WORLD_TRANSITION_MS + 200, () => this.showBanner(ENDING_CLOSING_LINE, 4200));

    // ===================================================================
    // >>> FUTURE CONQUEST ENDGAME HOOK <<<
    // The core arc is COMPLETE here (trinity === 'complete'). The angel's mandate
    // foreshadows the next phase — gods having claimed Earth's territories and a
    // good/evil conquest. That phase (gods/Demigods on Earth, the good/evil system,
    // conquest mechanics) is NOT built yet; begin it here when it is. For now the
    // player simply roams Earth freely (Heaven/Hell remain reachable via portals).
    // ===================================================================
  }

  /** Death during a stage RESTARTS that stage (reset its boss; keep the sequence). */
  private onTrinityPlayerDeath(): void {
    const b =
      this.trinity.current === 'dragon' ? this.dragonBoss : this.trinity.current === 'beast' ? this.beastBoss : this.trinity.current === 'satan' ? this.satanBoss : undefined;
    if (!b) return;
    this.clearBossAdds(b.id);
    this.hazards.clearBoss(b.id);
    this.clearHellfireFx();
    this.projectiles.clear();
    b.reset(); // dormant + full HP at the arena; updateBosses re-activates on approach
  }

  /** RESET: Trinity back to un-entered — all bosses + the ending state cleared. */
  private resetTrinity(): void {
    this.trinityRun++; // void any pending breather/ending callback from the previous run
    for (const b of [this.dragonBoss, this.beastBoss, this.satanBoss]) {
      if (b) {
        this.clearBossAdds(b.id);
        this.hazards.clearBoss(b.id);
        b.destroy();
      }
    }
    this.dragonBoss = undefined;
    this.beastBoss = undefined;
    this.satanBoss = undefined;
    this.bosses = this.bosses.filter((b) => b.isAlive);
    this.projectiles.clear();
    this.hazards.clearAll();
    this.clearHellfireFx();
    // Tear down any ending visuals (angel, Earth portal) so it can be replayed.
    this.earthPortal?.destroy();
    this.earthPortal = undefined;
    for (const o of this.endingFx) o.destroy();
    this.endingFx = [];
    this.endingAngel = undefined; // clear the player-driven angel-approach state
    this.endingAngelPos = undefined;
    this.endingSpeechStarted = false;
    this.trinity.reset();
  }

  /** DEV: force-start the Trinity (ignoring the 7-Sin gate) + teleport into the arena. */
  private devEnterLair(): void {
    this.resetTrinity();
    this.cancelDash();
    const o = this.hellMap.bounds;
    const ax = o.x + TRINITY_ARENA.x;
    const ay = o.y + TRINITY_ARENA.y;
    const dest = { x: ax, y: ay + 240 };
    if (this.activeWorld !== WORLD_HELL) this.travelToWorld(WORLD_HELL, dest);
    else {
      this.player.sprite.setPosition(dest.x, dest.y);
      this.player.setDirection(0, 0);
      this.cameras.main.centerOn(ax, ay);
    }
    this.startTrinity();
  }

  /** DEV: jump straight to a specific Trinity stage's boss (for testing any fight). */
  private devStartTrinityBoss(which: 'dragon' | 'beast' | 'satan'): void {
    this.resetTrinity();
    if (which === 'dragon') {
      this.trinity.toDragon();
      this.dragonBoss = this.spawnTrinityBoss(DRAGON_DEF);
      this.teleportToBoss(this.dragonBoss, true);
    } else if (which === 'beast') {
      this.trinity.toBeast();
      this.beastBoss = this.spawnTrinityBoss(BEAST_DEF);
      this.teleportToBoss(this.beastBoss, true);
    } else {
      this.trinity.toSatan();
      this.satanBoss = this.spawnTrinityBoss(SATAN_DEF);
      this.teleportToBoss(this.satanBoss, true);
    }
  }

  /** DEV: play the redemption ending directly (no Satan fight) for testing. */
  private devTriggerEnding(): void {
    this.resetTrinity();
    this.cancelDash();
    const o = this.hellMap.bounds;
    const ax = o.x + TRINITY_ARENA.x;
    const ay = o.y + TRINITY_ARENA.y;
    if (this.activeWorld !== WORLD_HELL) this.travelToWorld(WORLD_HELL, { x: ax, y: ay + 120 });
    else {
      this.player.sprite.setPosition(ax, ay + 120);
      this.player.setDirection(0, 0);
      this.cameras.main.centerOn(ax, ay);
    }
    this.trinity.toEnding();
    this.time.delayedCall(this.activeWorld === WORLD_HELL ? 100 : WORLD_TRANSITION_MS + 200, () => this.playRedemptionEnding(ax, ay));
  }

  /** DEV: spawn the one-way walk-through ENDING Earth portal directly (skips the
   *  Satan fight + angel speech), to test the lair → Seattle walk-through. */
  private devSpawnEndingPortal(): void {
    this.cancelDash();
    const o = this.hellMap.bounds;
    const ax = o.x + TRINITY_ARENA.x;
    const ay = o.y + TRINITY_ARENA.y;
    // Place the player well clear of the portal so the walk-through is real, not instant.
    const spawnPortal = (): void => {
      this.spawnEarthPortal(ax, ay - 60);
      this.showBanner('A way home opens. Walk into it to return to Earth.', 2800);
    };
    if (this.activeWorld !== WORLD_HELL) {
      this.travelToWorld(WORLD_HELL, { x: ax, y: ay + 220 });
      this.time.delayedCall(WORLD_TRANSITION_MS + 150, spawnPortal);
    } else {
      this.player.sprite.setPosition(ax, ay + 220);
      this.player.setDirection(0, 0);
      this.cameras.main.centerOn(ax, ay);
      spawnPortal();
    }
  }

  // --- HELLFIRE eruption (Satan's signature pattern): scene-side visuals + damage --

  /** Wind-up: full-arena warning + the SAFE ZONES the player must reach (clear telegraph). */
  private hellfireWarn(cx: number, cy: number, arenaR: number, safe: { x: number; y: number }[], safeR: number, durationMs: number): void {
    this.clearHellfireFx();
    // The whole arena reddens (the impending eruption).
    const field = this.add.circle(cx, cy, arenaR, 0xff3b1f, 0.12).setStrokeStyle(3, 0xff6a3a, 0.7).setDepth(11);
    this.worldFx.add(field);
    this.hellfireFx.push(field);
    this.tweens.add({ targets: field, alpha: { from: 0.1, to: 0.34 }, duration: durationMs, ease: 'Sine.in' });
    // The SAFE ZONES, clearly marked (cool blue-white) so they read as "stand here".
    for (const s of safe) {
      const safeFill = this.add.circle(s.x, s.y, safeR, 0x9fe0ff, 0.3).setStrokeStyle(3, 0xdff3ff, 0.95).setDepth(12);
      this.worldFx.add(safeFill);
      this.hellfireFx.push(safeFill);
      this.tweens.add({ targets: safeFill, scale: { from: 1.15, to: 1 }, alpha: { from: 0.5, to: 0.3 }, duration: 360, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
  }

  /** Detonation: the arena erupts in fire; damage the player UNLESS they're in a safe zone. */
  private hellfireBurst(cx: number, cy: number, arenaR: number, safe: { x: number; y: number }[], safeR: number, damage: number): void {
    this.clearHellfireFx();
    const fire = this.add.circle(cx, cy, arenaR, 0xff5a2a, 0.45).setDepth(13);
    this.worldFx.add(fire);
    this.tweens.add({ targets: fire, alpha: 0, scale: 1.08, duration: 520, ease: 'Quad.out', onComplete: () => fire.destroy() });
    if (this.playerDead) return;
    const inArena = Phaser.Math.Distance.Between(this.player.x, this.player.y, cx, cy) <= arenaR;
    const inSafe = safe.some((s) => Phaser.Math.Distance.Between(this.player.x, this.player.y, s.x, s.y) <= safeR);
    if (inArena && !inSafe) {
      this.onCherubMelee(damage); // heavy damage for being caught outside a safe zone
    }
  }

  /** Drop any active hellfire warning/eruption visuals (telegraph cancel / reset). */
  private clearHellfireFx(): void {
    for (const o of this.hellfireFx) {
      this.tweens.killTweensOf(o);
      o.destroy();
    }
    this.hellfireFx = [];
  }

  // --- SAVE SYSTEM: serialize the whole game, restore it, autosave -----------

  /** Gather the COMPLETE game state into one serializable {@link SaveData} object. */
  private serialize(): SaveData {
    const remembered: Record<string, { x: number; y: number }> = { ...this.worldPos };
    remembered[this.activeWorld] = { x: this.player.x, y: this.player.y };
    return {
      saveVersion: SAVE_VERSION,
      savedAt: Date.now(),
      world: { active: this.activeWorld, x: this.player.x, y: this.player.y, remembered },
      player: {
        level: this.progression.level,
        currentXP: this.progression.currentXP,
        hp: Math.round(this.playerHealth.current),
        maxHP: this.playerHealth.max,
        energy: Math.round(this.energy.current),
        holyPower: this.holyPower.count,
        path: this.playerPath,
        power: this.power.state,
        spiritVision: this.spirit.isActive(),
        angelEncounterFired: this.angelEncounterFired,
        urielArrived: this.urielArrived,
        urielPending: this.urielPending,
        title: this.currentTitle,
      },
      quests: this.chain.toJSON(),
      skills: this.skills.toJSON(),
      progress: {
        sinsDefeated: this.sins.count,
        michaelDefeated: this.michaelDefeated,
        judgmentDone: this.judgmentFired,
        guardianPhase: this.guardianPhase,
        trinityStage: this.trinity.current,
      },
    };
  }

  /** RESTORE the full saved state onto the freshly-built (default) scene. */
  private applySave(s: SaveData): void {
    this.restoring = true;
    try {
      // Progression first (drives derived maxHP/damage), then skills (adjust maxHP/
      // damage/speed via passives), then vitals against the skill-adjusted max.
      this.progression.level = Math.max(1, Math.floor(s.player.level));
      this.progression.currentXP = Math.max(0, Math.floor(s.player.currentXP));
      this.skills.load(s.skills); // old saves lack this → defaults to 0 pts / nothing unlocked
      // Apply the saved class: avatar skin + base-stat profile (drives derived HP/damage).
      this.classId = this.skills.activeClass;
      this.progression.profile = classBaseStats(this.classId);
      this.player.setClassSkin(this.classId);
      this.skillTimed = []; // timed buffs/forms are runtime-only (not persisted)
      this.releaseAllStuns();
      this.clearSpellHazards(); // drop any Wizard Lava patches
      this.clearFriendlyZones(); // heal zones are runtime-only too
      this.clearEntangle();
      this.crystallize.clear();
      this.confused.clear();
      this.comboUltimate = null;
      this.voodoo = null;
      this.allyBond = null;
      this.spiritSplit = null;
      this.parry = null;
      this.perfectFormUntil = 0;
      this.iaijutsu = null;
      this.pulseRing = null;
      this.actionWhiffed = false;
      this.empoweredStrikes = null;
      this.clearTraps(); // Assassin state never survives a load either
      this.clearPriestState(); // nor the Priest's
      this.breakPlayerStealth();
      this.clearDots(); // drop any poison DoTs
      this.summons.clear(); // summons are transient — never carried across a load
      this.recomputeSkillEffects(); // apply passive maxHP/damage/speed/reduction now
      this.playerHealth.setMax(this.skillAdjustedMaxHP());
      this.playerHealth.current = Phaser.Math.Clamp(s.player.hp, 1, this.playerHealth.max);
      this.energy.current = Phaser.Math.Clamp(s.player.energy, 0, this.energy.max);
      this.holyPower.load({ holyPower: s.player.holyPower });

      // Narrative path + Spirit Vision + the angel-choice flag + Uriel's arrival.
      this.angelEncounterFired = !!s.player.angelEncounterFired;
      if (this.angelEncounterFired) this.angel.dismiss();
      this.urielArrived = !!s.player.urielArrived;
      this.urielPending = !!s.player.urielPending && !this.urielArrived;
      this.setPlayerPath(s.player.path); // 'corrupted' turns Spirit Vision on
      this.spirit.setSpiritVision(s.player.spiritVision); // then honor the exact saved flag
      this.awardTitle(s.player.title);

      // Power-state (demonic/holy) + its kit visuals (Holy Bolt button + aura).
      this.power.load({ alignment: s.player.power });
      this.holyBoltButton.setVisible(this.power.isHoly);
      if (this.power.isHoly) this.ensureHolyAura();
      else {
        this.holyAura?.destroy();
        this.holyAura = undefined;
      }

      // Quests.
      this.chain.load(s.quests);

      // Endgame flags + world reconstruction.
      this.michaelDefeated = !!s.progress.michaelDefeated;
      this.judgmentFired = !!s.progress.judgmentDone;
      this.judgmentActive = false;
      if (this.judgmentFired) this.spawnHellPortal(); // Hell reachable from the throne
      this.restoreGuardianAccess(s.progress.guardianPhase); // Heaven reachable if corrupted
      this.restoreSins(s.progress.sinsDefeated);
      this.restoreTrinity(s.progress.trinityStage);

      // Finally place the player in the saved world + position.
      this.worldPos = { ...s.world.remembered };
      this.applyWorldSwap(s.world.active as WorldId, { x: s.world.x, y: s.world.y });
      this.worldPos = { ...s.world.remembered }; // applyWorldSwap rewrote the leave-world entry

      // Azazel's progress-gated station (Oregon → Kamiah → Heaven) from the loaded chain.
      this.updatePatronLocation();

      // Re-establish the ACTIVE arc objective's world state (spawned enemies / the
      // proximity action button) — a mid-arc load otherwise resumes with nothing to
      // fight or press. Arc quests are Earth-only, so guard on the loaded world.
      if (this.activeWorld === WORLD_EARTH && this.isArcActive()) this.beginArcObjective();
      // 4.9 mid-assault: the demon escort is transient (never serialized) — remuster it.
      if (this.activeWorld === WORLD_EARTH && this.chain.activeQuest?.id === ACT4_DOOR_HOME_ID) {
        this.spawnDemonAllies(false);
      }

      // Refresh every HUD readout.
      this.refreshXpUi();
      this.refreshHolyPowerUi();
      this.refreshQuestUi();
      this.updateCombatHud();
    } catch (e) {
      console.warn('ToH: failed to apply save —', e);
    }
    this.restoring = false;
  }

  /** Restore Heaven-portal access: only the stable 'corrupted' endpoint is re-applied. */
  private restoreGuardianAccess(phase: string): void {
    if (phase === 'corrupted') {
      this.guardianPhase = 'corrupted';
      this.heavenPortal.load({ state: 'corrupted' });
    }
    // Other (transient mid-encounter) phases restore as the default 'dormant'.
  }

  /** Restore the Sin gauntlet: clear the default-spawned Sin, set the count, re-place the current one. */
  private restoreSins(count: number): void {
    for (const b of this.sinBosses) {
      if (b) {
        this.clearBossAdds(b.id);
        b.destroy();
      }
    }
    this.sinBosses = this.sinBosses.map(() => undefined);
    this.bosses = this.bosses.filter((b) => b.isAlive);
    this.sins.load({ sinsDefeated: Phaser.Math.Clamp(Math.floor(count), 0, this.sins.builtCount) });
    this.spawnAvailableSin();
  }

  /** Restore the Trinity stage: re-spawn the current stage's boss (dormant), or the ending portal. */
  private restoreTrinity(stage: SaveData['progress']['trinityStage']): void {
    this.resetTrinity(); // clean slate (no Dragon/Beast/Satan exist on a fresh build)
    this.trinity.load({ stage });
    if (stage === 'dragon') this.dragonBoss = this.spawnTrinityBoss(DRAGON_DEF);
    else if (stage === 'beast') this.beastBoss = this.spawnTrinityBoss(BEAST_DEF);
    else if (stage === 'satan') this.satanBoss = this.spawnTrinityBoss(SATAN_DEF);
    else if (stage === 'ending') {
      // Saved mid-cutscene → just re-open the way home (walk-through) so it can't soft-lock.
      const o = this.hellMap.bounds;
      this.spawnEarthPortal(o.x + TRINITY_ARENA.x, o.y + TRINITY_ARENA.y + 210);
    }
    // 'none' / 'complete' → nothing to spawn.
  }

  /** Write the save (serialize → localStorage) + a subtle "Saved" flash. Never throws. */
  private writeSave(): boolean {
    const ok = SaveSystem.write(this.serialize());
    if (ok) this.flashSaved();
    return ok;
  }

  /** Event/timer/page-hide autosave — suppressed before the game is ready or mid-restore,
   *  and lightly throttled so bursts (e.g. collecting many holy-power motes) don't spam writes. */
  private autosave(): void {
    if (!this.gameReady || this.restoring) return;
    if (this.time.now - this.lastAutosaveAt < 1500) return;
    this.lastAutosaveAt = this.time.now;
    this.writeSave();
  }

  /** Explicit player/dev save — always writes (still requires the game to be ready). */
  private manualSave(): void {
    if (!this.gameReady) return;
    this.writeSave();
  }

  /** PUBLIC hook for the PauseScene to trigger a manual save. Writes WITHOUT the
   *  on-screen flash (MainScene is paused under the menu, so its tween wouldn't run;
   *  the PauseScene shows its own toast). Returns whether the write succeeded. */
  requestSave(): boolean {
    if (!this.gameReady) return false;
    return SaveSystem.write(this.serialize());
  }

  /** SAVE PORTABILITY (pause menu "Export Save"): write the current save, then
   *  return the slot's EXACT JSON as a portable code — and try the clipboard
   *  (fire-and-forget; the pause menu falls back to showing the code). */
  exportSaveCode(): string | null {
    if (!this.requestSave()) return null;
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const code = encodeSaveCode(raw);
    void navigator.clipboard?.writeText(code).catch(() => undefined);
    return code;
  }

  /** SAVE PORTABILITY (pause menu "Import Save"): validate a save code and write
   *  the EXACT original JSON into the slot (byte-identical to what was exported).
   *  Returns true when the slot was written; the caller reloads to play it. */
  importSaveCode(code: string): boolean {
    const raw = decodeSaveCode(code);
    if (raw === null) return false;
    localStorage.setItem(SAVE_KEY, raw);
    return true;
  }

  /** Open the in-game pause menu: launch the overlay scene + freeze this scene. */
  private openPauseMenu(): void {
    if (this.transitioning) return; // not mid-fade
    this.scene.launch('PauseScene');
    this.scene.pause();
  }

  /** DEV: load the slot into the running game (no relaunch needed). */
  private devLoadSave(): void {
    const save = SaveSystem.read();
    if (!save) {
      this.showBanner('No save to load.', 1600);
      return;
    }
    this.applySave(save);
    this.showBanner('Save loaded.', 1600);
  }

  /** DEV: delete the save slot (separate from Dev Reset, which only clears memory). */
  private devDeleteSave(): void {
    SaveSystem.clear();
    this.showBanner('Save deleted.', 1600);
  }

  /** The always-visible PAUSE / MENU button (top-right, UI camera) + a subtle
   *  "Saved" indicator (flashed by autosave). Tapping opens the pause menu overlay
   *  (Resume / Save Game / Return to Title). */
  private createSaveUi(): void {
    const depth = 1360;
    const s = 38;
    const bg = this.add
      .rectangle(0, 0, s, s, 0x1d2b40, 0.92)
      .setStrokeStyle(2, 0x9fd0ff, 0.95)
      .setScrollFactor(0)
      .setDepth(depth)
      .setInteractive({ useHandCursor: true });
    const icon = this.add
      .text(0, 0, '☰', { fontFamily: 'system-ui, sans-serif', fontSize: '22px', color: '#dff0ff', fontStyle: 'bold' }) // ☰ menu glyph
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(depth + 1);
    this.savedFlash = this.add
      .text(0, 0, 'Saved ✓', { fontFamily: 'system-ui, sans-serif', fontSize: '13px', color: '#a8ffb0', fontStyle: 'bold' })
      .setOrigin(1, 0.5)
      .setScrollFactor(0)
      .setStroke('#0a1a0a', 4)
      .setDepth(depth + 1)
      .setVisible(false);
    bg.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => this.openPauseMenu());

    const layout = (): void => {
      const insets = getInsets(this);
      const cx = this.scale.width - insets.right - UI_MARGIN - s / 2;
      const cy = insets.top + UI_MARGIN + s / 2;
      bg.setPosition(cx, cy);
      icon.setPosition(cx, cy);
      this.savedFlash?.setPosition(cx - s / 2 - 8, cy);
    };
    layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, layout);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, layout)); // never leak across scene restarts
  }

  /** A brief, non-intrusive "Saved ✓" flash next to the menu button (autosave feedback). */
  private flashSaved(): void {
    if (!this.savedFlash) return;
    this.tweens.killTweensOf(this.savedFlash);
    this.savedFlash.setVisible(true).setAlpha(1);
    this.tweens.add({ targets: this.savedFlash, alpha: 0, delay: 700, duration: 600, onComplete: () => this.savedFlash?.setVisible(false) });
  }

  // --- Portal Defense: townsfolk + the wave encounter -----------------------

  /**
   * Spawn one townsfolk. A fixed `target` point (the portal) makes it a portal-
   * defender; null target makes it hunt the PLAYER (the descent-arc guardsmen /
   * farmers). `variant` is the reskin (tint + XP).
   */
  private spawnTownsfolk(
    x: number,
    y: number,
    target: { x: number; y: number } | null = { x: this.portal.x, y: this.portal.y },
    variant: TownsfolkVariant = 'townsperson',
  ): Townsfolk {
    const t = new Townsfolk(this, x, y, variant);
    t.setTarget(target);
    if (target) t.onHitPortal = () => this.damagePortal(TOWNSFOLK_PORTAL_DAMAGE);
    t.onHitPlayer = () => this.onTownsfolkHitPlayer(t);
    this.physics.add.collider(t.sprite, this.activeMap().layer); // the world it spawns IN
    this.uiCamera?.ignore(t.sprite); // runtime world object: keep off the UI camera
    this.townsfolk.push(t);
    return t;
  }

  /** Advance every townsfolk toward its target, then prune the dead. Hostile townsfolk obey
   *  the summon aggro hierarchy via enemyAggroTarget (summons pull them off the player too). */
  private updateTownsfolk(): void {
    for (const t of this.townsfolk) {
      if (!this.isActiveWorldResident(t.x)) continue; // world-resident pause: foreign residents don't tick
      const tgt = this.enemyAggroTarget(t, t.x, t.y);
      t.update(tgt.x, tgt.y, this.time.now);
    }
    if (this.townsfolk.some((t) => !t.isAlive)) this.townsfolk = this.townsfolk.filter((t) => t.isAlive);
  }

  private haltTownsfolk(): void {
    for (const t of this.townsfolk) t.halt();
  }

  private onTownsfolkKilled(t: Townsfolk): void {
    this.gainXP(t.xpReward); // enemy data drives the award, same as every enemy
  }

  /** A townsfolk struck the portal: drop its HP and check for the loss condition. */
  private damagePortal(amount: number): void {
    if (!this.portalDefense.isActive) return;
    this.portal.takeDamage(amount);
    this.spawnDamageNumber(this.portal.x + (Math.random() * 30 - 15), this.portal.y - 10, amount, '#ff8a8a');
    if (this.portal.isDestroyed) this.portalDefense.notifyPortalDestroyed();
  }

  /** A townsfolk struck the player (intercepted / adjacent). Per-variant damage so
   *  Act I wolves/sea lion/raiders hit for their own tuned amount. */
  private onTownsfolkHitPlayer(t?: Townsfolk): void {
    if (this.playerDead) return;
    if (this.parryGate(t?.x ?? this.player.x, t?.y ?? this.player.y)) return; // Samurai parry: melee negated + riposte
    const dmg = (t && TOWNSFOLK_VARIANTS[t.variant].playerDamage) || TOWNSFOLK_PLAYER_DAMAGE;
    const dealt = this.playerHealth.damage(dmg);
    this.player.flash();
    this.spawnDamageNumber(this.player.x, this.player.y - 26, dealt, '#ff9a6a');
    this.lastCombatTime = this.time.now;
    if (this.playerHealth.isDead) this.onPlayerDeath();
  }

  private clearTownsfolk(): void {
    for (const t of this.townsfolk) t.destroy();
    this.townsfolk = [];
  }

  /** End + reset the encounter: stop waves, clear townsfolk, restore the portal. */
  private resetPortalDefense(): void {
    this.portalDefense.stop();
    this.clearTownsfolk();
    this.portal.reset();
    this.portal.setWaveLabel('');
  }

  /** DEV: teleport next to the portal and begin the wave encounter. */
  private devStartPortalDefense(): void {
    this.cancelDash();
    this.player.sprite.setPosition(this.portal.x, this.portal.y + 90); // just south of the portal
    this.player.setDirection(0, 0);
    this.cameras.main.centerOn(this.portal.x, this.portal.y);
    this.resetPortalDefense(); // clean slate
    this.portalDefense.start(this.time.now);
  }

  // --- The Descent climax: Heaven Portal + flaming-sword guardians ----------
  //
  // A self-contained, TRIGGERABLE unit: the two guardians wake on proximity (or
  // via startGuardianFight); defeating BOTH unlocks the portal-corruption
  // interaction; corrupting flips the portal holy → corrupted; entering the
  // corrupted portal is a placeholder beat (the Heaven map is a LATER build).
  // A future quest objective can drive startGuardianFight()/resetGuardianEncounter()
  // exactly like the descent arc drives its spawns — it is NOT wired to the chain.

  /** Build the climax world: the Holy Outpost marker, the Heaven Portal, the two dormant swords. */
  private setupGuardianEncounter(): void {
    this.addHolyOutpostMarker();
    this.heavenPortal = new HeavenPortal(this, HEAVEN_PORTAL_POSITION.x, HEAVEN_PORTAL_POSITION.y);
    this.guardians = [];
    this.spawnGuardian('melee', HEAVEN_PORTAL_POSITION.x + GUARDIAN_MELEE_OFFSET.dx, HEAVEN_PORTAL_POSITION.y + GUARDIAN_MELEE_OFFSET.dy);
    this.spawnGuardian('ranged', HEAVEN_PORTAL_POSITION.x + GUARDIAN_RANGED_OFFSET.dx, HEAVEN_PORTAL_POSITION.y + GUARDIAN_RANGED_OFFSET.dy);
    this.guardianPhase = 'dormant';
  }

  /** A radiant gold/white pulsing landmark + label for the Holy Outpost. */
  private addHolyOutpostMarker(): void {
    const { x, y } = HOLY_OUTPOST_POSITION;
    const ring = this.add.circle(x, y, 18, 0xffe9a8, 0.3).setDepth(6);
    this.tweens.add({ targets: ring, scale: 2, alpha: 0.05, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.add
      .text(x, y - 70, 'Holy Outpost', { fontFamily: 'system-ui, sans-serif', fontSize: '11px', color: '#fff3c4' })
      .setOrigin(0.5, 1)
      .setStroke('#2a2410', 4)
      .setDepth(7);
  }

  /** Spawn one guardian of the given role; wire its melee strike / fire volley. */
  private spawnGuardian(role: 'melee' | 'ranged', x: number, y: number): FlamingSword {
    const g = new FlamingSword(this, x, y, role);
    g.onHitPlayer = () => this.onGuardianHitPlayer(g.cfg.meleeDamage);
    g.onFire = (origin, dirs) => {
      for (const d of dirs) {
        this.projectiles.spawn({
          x: origin.x,
          y: origin.y,
          dirX: d.x,
          dirY: d.y,
          speed: g.cfg.projectileSpeed,
          damage: g.cfg.projectileDamage,
          maxRange: g.cfg.projectileRange,
          faction: 'enemy',
          color: 0xff7a1f, // fiery orange (distinct from the angels' holy gold)
          radius: GUARDIAN_BOLT_RADIUS,
        });
      }
    };
    this.physics.add.collider(g.sprite, this.map.layer);
    this.uiCamera?.ignore(g.objects()); // runtime world objects: keep off the UI camera
    this.guardians.push(g);
    return g;
  }

  /** TRIGGER: wake both guardians and begin the fight (proximity or dev button). */
  private startGuardianFight(): void {
    if (this.guardianPhase !== 'dormant') return;
    for (const g of this.guardians) g.activate();
    this.guardianPhase = 'fighting';
    this.showBanner('The flaming swords awaken!', 1800);
    this.notifyQuest('reach-holy-outpost'); // Quest 5 obj 1: reached the Holy Outpost
  }

  /** RESET: swords back to dormant + full HP, the portal back to holy/uncorrupted. */
  private resetGuardianEncounter(): void {
    for (const g of this.guardians) g.reset();
    this.heavenPortal.reset();
    this.guardianPhase = 'dormant';
    this.corruptButton.setVisible(false);
  }

  /** Drive the guardians + the encounter's phase transitions each frame. */
  private updateGuardianEncounter(): void {
    // Proximity activation: nearing the outpost wakes the dormant pair. During Act IV
    // 4.9's assault they HOLD until the quest reaches the portal objective and the
    // mask-drop narration has played (see assaultHoldsGuardians).
    if (this.guardianPhase === 'dormant' && !this.assaultHoldsGuardians()) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, HOLY_OUTPOST_POSITION.x, HOLY_OUTPOST_POSITION.y);
      if (d <= GUARDIAN_ACTIVATION_RANGE) this.startGuardianFight();
    }

    // Advance each guardian (the ranged one needs line of sight from the scene). Guardians
    // obey the summon aggro hierarchy via enemyAggroTarget (LoS to the chosen target).
    for (const g of this.guardians) {
      const t = this.enemyAggroTarget(g, g.x, g.y);
      const los = g.role === 'ranged' ? this.hasLineOfSight(g.x, g.y, t.x, t.y) : true;
      g.update(t.x, t.y, this.time.now, los);
    }

    // Defeat gate: both swords down → unlock the corruption interaction.
    if (this.guardianPhase === 'fighting' && this.guardians.every((g) => !g.isAlive)) {
      this.guardianPhase = 'defeated';
      this.showBanner('The guardians fall — the gate lies unguarded.', 2600);
      this.notifyQuest('guardians-defeated'); // Quest 5 obj 2
    }

    // The "Corrupt the Portal" button shows only once defeated and near the portal.
    const nearPortal = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.heavenPortal.x, this.heavenPortal.y) <= PORTAL_CORRUPT_RANGE;
    this.corruptButton.setVisible(this.guardianPhase === 'defeated' && nearPortal);

    // Crossing the CORRUPTED portal is an explicit BUTTON (the same contextual slot
    // as Talk/Corrupt) — no accidental transport from walking near it. Tapping it
    // runs the same Heaven transition as before ('entered-heaven' fires on arrival).
    this.enterHeavenButton.setVisible(
      this.guardianPhase === 'corrupted' && nearPortal && !this.transitioning && !this.dialogue.isOpen(),
    );
  }

  private haltGuardians(): void {
    for (const g of this.guardians) g.halt();
  }

  /** A guardian's melee slash / fire bolt landed on the player. */
  private onGuardianHitPlayer(damage: number): void {
    if (this.playerDead) return;
    const dealt = this.playerHealth.damage(damage);
    this.player.flash();
    this.spawnDamageNumber(this.player.x, this.player.y - 26, dealt, '#ff8a3a');
    this.lastCombatTime = this.time.now;
    if (this.playerHealth.isDead) this.onPlayerDeath();
  }

  private onGuardianKilled(g: FlamingSword): void {
    this.showBanner(g.role === 'melee' ? 'A flaming sword is broken' : 'A flaming sword is quenched', 1500);
    this.gainXP(g.xpReward); // enemy data drives the award, same as every enemy
  }

  /** Button/key entry: corrupt the portal if currently allowed (defeated + near). */
  private tryCorruptPortal(): void {
    if (this.guardianPhase !== 'defeated') return;
    const near = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.heavenPortal.x, this.heavenPortal.y) <= PORTAL_CORRUPT_RANGE;
    if (!near) return;
    this.corruptPortal();
  }

  /** Play the gold→purple corruption transition, then mark the portal active. */
  private corruptPortal(): void {
    if (this.guardianPhase !== 'defeated') return;
    this.guardianPhase = 'corrupting';
    this.corruptButton.setVisible(false);
    this.heavenPortal.corrupt(PORTAL_CORRUPT_DURATION_MS, () => {
      this.guardianPhase = 'corrupted';
      this.showBanner(CORRUPT_PORTAL_LINE, 3200);
      this.notifyQuest('portal-corrupted'); // Quest 5 obj 3
    });
  }

  // --- Multi-world: Heaven + the two-way portal transition ------------------
  //
  // Heaven is a SECOND GameMap built at a large coordinate offset so it never
  // overlaps Earth (only one world is in the camera's bounds at a time). The same
  // player carries across — nothing is reset. travelToWorld(worldId, arrival) is
  // the reusable, event-expressible transition future portals/maps reuse.

  /** Build the Heaven world (map + props + return portal) and register both worlds. */
  private setupHeaven(): void {
    const ts = this.map.tileSize;
    const origin = { x: this.map.pixelWidth + HEAVEN_WORLD_GAP, y: 0 };
    // forceCpuLayer: Heaven is built at a world offset; the GPU tilemap layer
    // mis-renders at an offset (Phaser 4.2 double-applies the layer position), so
    // Heaven uses the CPU TilemapLayer, which positions correctly. See GameMap.
    this.heavenMap = new GameMap(this, buildHeavenMapData(), [], origin, { forceCpuLayer: true });

    // Heaven's walkable centre — where the (corrupted) return portal + arrival sit.
    const cx = origin.x + (HEAVEN_WIDTH * ts) / 2;
    const cy = origin.y + (HEAVEN_HEIGHT * ts) / 2;
    this.heavenReturnPortalPos = { x: cx, y: cy };
    this.heavenArrivalPos = { x: cx + HEAVEN_ARRIVAL_OFFSET.dx, y: cy + HEAVEN_ARRIVAL_OFFSET.dy };
    this.earthReturnPos = { x: HEAVEN_PORTAL_POSITION.x + EARTH_RETURN_OFFSET.dx, y: HEAVEN_PORTAL_POSITION.y + EARTH_RETURN_OFFSET.dy };

    // The return portal: a corrupted/purple gate (reuses HeavenPortal in its
    // corrupted state). Entering it transitions back to Earth.
    this.heavenReturnPortal = new HeavenPortal(this, cx, cy);
    this.heavenReturnPortal.load({ state: 'corrupted' });
    this.addHeavenLabel(cx, cy - 84, 'Return Gate (to Earth)', '#d6a8ff');
    this.addHeavenLabel(cx, cy - 230, '✦ Heaven ✦', '#fff3c4');

    // Prop landmarks (Roman-style pillars + a small shrine) — purely visual +
    // collision; the player walks around them.
    this.buildHeavenProps(cx, cy);

    // Player-vs-Heaven-terrain collider (inactive until Heaven is the active world).
    const heavenCollider = this.physics.add.collider(this.player.sprite, this.heavenMap.layer);
    heavenCollider.active = false;

    // The world REGISTRY — adding another map later = build a GameMap at a fresh
    // origin and register a WorldRuntime here (not hardcoded to two).
    this.worlds = {
      [WORLD_EARTH]: {
        id: WORLD_EARTH,
        map: this.map,
        collider: this.earthCollider,
        defaultArrival: { x: this.town.spawn.x, y: this.town.spawn.y },
      },
      [WORLD_HEAVEN]: {
        id: WORLD_HEAVEN,
        map: this.heavenMap,
        collider: heavenCollider,
        defaultArrival: this.heavenArrivalPos,
      },
    };
    this.worldPos[WORLD_EARTH] = { x: this.town.spawn.x, y: this.town.spawn.y };
    this.worldPos[WORLD_HEAVEN] = { ...this.heavenArrivalPos };

    // Populate Heaven with its defenders (positions in heavenWorld.ts).
    this.seedHeavenCherubs();
    // The climactic boss at his sanctum (dormant until approached).
    this.setupMichael();
    // God's throne set piece (the judgment beat is gated on Michael's defeat).
    this.buildThrone();
    // HELL — the third world (built at a further offset; needs heavenMap + thronePos).
    this.setupHell();
  }

  // --- Hell: the third world + the Heaven<->Hell portal + seeded demons -------
  //
  // Built with the SAME multi-world system as Heaven — Hell is just another
  // GameMap registered at a further coordinate offset. (This is the "add another
  // map" case the system was designed for; Earth + Heaven are untouched.)

  private setupHell(): void {
    const ts = this.map.tileSize;
    const hb = this.heavenMap.bounds;
    const origin = { x: hb.x + this.heavenMap.pixelWidth + HEAVEN_WORLD_GAP, y: 0 };
    this.hellMap = new GameMap(this, buildHellMapData(), [], origin, { forceCpuLayer: true });

    const cx = origin.x + (HELL_WIDTH * ts) / 2;
    const cy = origin.y + (HELL_HEIGHT * ts) / 2;
    this.hellReturnPortalPos = { x: cx, y: cy };
    this.hellArrivalPos = { x: cx + 0, y: cy + 140 };
    // Hell→Heaven lands the player just south of the Heaven Hell-portal (the throne).
    this.heavenReturnFromHellPos = { x: this.thronePos.x, y: this.thronePos.y + 260 };

    // Return gate (back UP to Heaven) — reuses the corrupted HeavenPortal visual.
    this.hellReturnPortal = new HeavenPortal(this, cx, cy);
    this.hellReturnPortal.load({ state: 'corrupted' });
    this.addHeavenLabel(cx, cy - 84, 'Return Gate (to Heaven)', '#d6a8ff');
    this.addHeavenLabel(cx, cy - 230, '— H E L L —', '#ff7a4a');

    // Infernal prop landmarks (spires + a distant Satan's Lair placeholder).
    this.buildHellProps(cx, cy);

    const hellCollider = this.physics.add.collider(this.player.sprite, this.hellMap.layer);
    hellCollider.active = false;

    // Register Hell in the multi-world registry (Earth + Heaven set in setupHeaven).
    this.worlds[WORLD_HELL] = {
      id: WORLD_HELL,
      map: this.hellMap,
      collider: hellCollider,
      defaultArrival: this.hellArrivalPos,
    };
    this.worldPos[WORLD_HELL] = { ...this.hellArrivalPos };

    this.seedHellDemons();
    this.spawnAvailableSin(); // place the first unlocked Sin (Wrath) — dormant until approached
    // EGYPT — the fourth world (built at a further offset; needs hellMap's bounds).
    this.setupEgypt();
  }

  // --- Egypt: the fourth world — a second TERRESTRIAL map ---------------------
  //
  // Registered with the same multi-world system as Heaven/Hell (a GameMap at a
  // further coordinate offset), but unlike those it runs the Earth-style
  // per-frame path (doors, interactions, arcs, angels, townsfolk) — see the
  // isTerrestrial branch in update(). Content (quests, NPCs, class start) comes
  // later; for now it is a fully traversable world reachable via dev travel.

  private setupEgypt(): void {
    const hb = this.hellMap.bounds;
    const origin = { x: hb.x + this.hellMap.pixelWidth + HEAVEN_WORLD_GAP, y: 0 };
    // forceCpuLayer: like Heaven/Hell, a map at a non-zero world origin must use
    // the CPU TilemapLayer (the GPU layer double-applies the offset — see GameMap).
    // TOWN_TILES ride along as extra tiles so city-entrance stamps (walls/gates)
    // can be painted onto this map at runtime, exactly like Earth's towns.
    this.egyptMap = new GameMap(this, egyptMapJson as unknown as WashingtonMap, TOWN_TILES, origin, { forceCpuLayer: true });

    // Arrival: the Faiyum village site (re-pointed to just OUTSIDE the village
    // gate once setupCities has stamped the walled settlement, below).
    this.egyptArrivalPos = { ...this.egyptMap.spawnWorld };

    // City nameplates (Alexandria, Cairo, Suez, the Sinai towns, …) — same
    // world-space markers Earth uses; they also feed the nearest-city readout.
    new CityMarkers(this, this.egyptMap);

    const egyptCollider = this.physics.add.collider(this.player.sprite, this.egyptMap.layer);
    egyptCollider.active = false;

    this.worlds[WORLD_EGYPT] = {
      id: WORLD_EGYPT,
      map: this.egyptMap,
      collider: egyptCollider,
      defaultArrival: this.egyptArrivalPos,
    };
    this.worldPos[WORLD_EGYPT] = { ...this.egyptArrivalPos };

    // The Mount Sinai approach label sits in the map data; nothing else to place
    // here — the stone-ring marker site is baked into the generated tiles.

    // NESTED CITIES (needs the Egypt world registered — cities chain east of it).
    this.setupCities();
    // Egypt's arrival now lands just OUTSIDE the Faiyum village gate (the village
    // interior is its own sub-map; mutate in place — the registry + worldPos
    // reference this object).
    const faiyum = this.cityRuntimes[CITY_FAIYUM];
    if (faiyum) {
      this.egyptArrivalPos.x = faiyum.outsideArrival.x;
      this.egyptArrivalPos.y = faiyum.outsideArrival.y;
      this.worldPos[WORLD_EGYPT] = { ...faiyum.outsideArrival };
    }

    // GLOBE — the one whole-planet sparse region world (Europe + Africa
    // consolidated at true Earth positions; chains further east).
    this.setupGlobe();

    // CAIRO ACT I LIVE BINDING — additive Wizard-chain content in Egypt.
    this.setupCairoBinding();
  }

  // --- GLOBE: the ONE whole-planet SPARSE region world -------------------------
  //
  // Europe + Africa CONSOLIDATED: every generated zone (EUROPE_BUILT_ZONES +
  // AFRICA_BUILT_ZONES) materializes as its own small chunk GameMap at its
  // TRUE manifest lat/lng through the one shared calibration, inside a single
  // planet-wide coordinate space; the span between chunks is cheap walkable
  // void over the real ground raster (water blocks). The continents therefore
  // share walkable ground — no Europe↔Africa gate. NA seeds + Cairo stay
  // pre-existing in their hand-built worlds (never stamped; empty ground at
  // the globe's NA position is expected). Future continents just append.

  private setupGlobe(): void {
    const zoneIds = [...EUROPE_BUILT_ZONES, ...AFRICA_BUILT_ZONES, ...ASIA_BUILT_ZONES, ...FINAL_REGIONS_BUILT_ZONES].filter((id) => !PREBUILT_ZONE_WORLD[id]);
    if (zoneIds.length === 0) return;
    const cal = WORLD_CALIBRATION[WORLD_GLOBE];
    const span = WORLD_SPAN_DEGREES[WORLD_GLOBE];
    const origin = { x: this.nextWorldOriginX, y: 0 };
    const rw = createSparseWorld(WORLD_GLOBE, cal, span);

    // GROUND LAYER: the real planet (the whole-Earth Natural-Earth raster
    // through this world's calibration) drawn beneath every chunk.
    const ground = new GroundLayer(this, origin, cal, rw.sparse!.boundsPx);
    this.groundLayers.set(WORLD_GLOBE, ground);

    // Stamp every built zone; gates rebuild from the manifest in ONE shared
    // pass (all endpoints live in the same `built` map now).
    const chunkMaps: GameMap[] = [];
    const built = new Map<string, { chunk: BuiltChunk; map: GameMap }>();
    for (const id of zoneIds) this.stampRegionZoneChunk(WORLD_GLOBE, rw, origin, id, chunkMaps, built);
    this.buildRegionGates(WORLD_GLOBE, origin, built);

    // Register the world: arrival at the FIRST built zone's settlement (Rome).
    const first = built.get(EUROPE_BUILT_ZONES[0])!;
    const arrival = first.map.nearestWalkableWorld(origin.x + first.chunk.arrivalLocalPx.x, origin.y + first.chunk.arrivalLocalPx.y);
    this.globeMap = new SparseWorldMap(origin, rw.sparse!.boundsPx, chunkMaps, () => ({ x: this.player.x, y: this.player.y }), (x, y) => ground.isWaterAtWorld(x, y));
    this.worlds[WORLD_GLOBE] = {
      id: WORLD_GLOBE,
      map: this.globeMap,
      collider: this.regionColliders.find((rc) => rc.worldId === WORLD_GLOBE)?.c,
      defaultArrival: arrival,
    };
    this.worldPos[WORLD_GLOBE] = { ...arrival };
    this.regionWorldIds.add(WORLD_GLOBE); // the globe runs the shared region pipeline
    this.nextWorldOriginX = origin.x + rw.sparse!.boundsPx.w + HEAVEN_WORLD_GAP;

    // CROSS-WORLD GATE PAIR (Egypt ↔ Luxor) — the same manifest-driven pair as
    // before the consolidation: the Egypt-side pad is ADDED additively at the
    // SOUTH edge of the Egypt map, mid-width (the Nile's southern exit,
    // upriver toward Luxor); no Egypt tiles change. The globe side now lands
    // at Luxor's TRUE planet position.
    const eb = this.egyptMap.bounds;
    const egyptPad = this.egyptMap.nearestWalkableWorld(eb.x + eb.width * 0.5, eb.y + eb.height - 96, 60);
    const egyptReturn = this.egyptMap.nearestWalkableWorld(egyptPad.x, egyptPad.y - 80, 60);
    const luxorArrival = this.regionZoneArrivals['luxor-valley-of-kings'];
    if (!luxorArrival) throw new Error("setupGlobe: 'luxor-valley-of-kings' must be stamped — the Egypt gate lands there");
    const globeGate = this.globeMap.nearestWalkableWorld(luxorArrival.x + 120, luxorArrival.y + 40);
    this.regionGates.push({
      x: egyptPad.x,
      y: egyptPad.y,
      label: 'Cross to Luxor (Valley of the Kings)',
      dest: this.globeMap.nearestWalkableWorld(globeGate.x, globeGate.y + 50),
      destWorld: WORLD_GLOBE,
    });
    this.addHeavenLabel(egyptPad.x, egyptPad.y - 24, '→ Luxor (Valley of the Kings)', '#ffe9a8');
    this.regionGates.push({
      x: globeGate.x,
      y: globeGate.y,
      label: 'Cross to Egypt (The Nile Crown)',
      dest: egyptReturn,
      destWorld: WORLD_EGYPT,
    });
    this.addHeavenLabel(globeGate.x, globeGate.y - 24, '→ Egypt (The Nile Crown)', '#ffe9a8');
  }

  /**
   * Stamp ONE built zone into a sparse region world: chunk map + collider,
   * nameplate, arrival, boss anchor (+ champion marker), dev zone label, and
   * live spawn points. Shared verbatim by every region (Europe, Africa, …).
   */
  private stampRegionZoneChunk(
    worldId: WorldId,
    rw: ReturnType<typeof createSparseWorld>,
    origin: { x: number; y: number },
    id: string,
    chunkMaps: GameMap[],
    built: Map<string, { chunk: BuiltChunk; map: GameMap }>,
  ): void {
    const zone = getZone(id);
    if (!zone) throw new Error(`Region '${worldId}' built list names unknown zone '${id}'`);
    const cal = rw.calibration;
    const plan = stampZone(rw, zone); // validates bounds + records the chunk
    const chunk = buildChunkMapData(zone, plan, cal);
    const map = new GameMap(this, chunk.data, [], { x: origin.x + chunk.originLocalPx.x, y: origin.y + chunk.originLocalPx.y }, { forceCpuLayer: true });
    new CityMarkers(this, map); // the zone nameplate at its center
    const collider = this.physics.add.collider(this.player.sprite, map.layer);
    collider.active = false;
    this.regionColliders.push({ c: collider, worldId });
    chunkMaps.push(map);
    built.set(id, { chunk, map });
    this.regionZoneArrivals[id] = map.nearestWalkableWorld(
      origin.x + chunk.arrivalLocalPx.x,
      origin.y + chunk.arrivalLocalPx.y,
    );

    // MENTOR (generic beat completion): a home-city chain's opening story beat
    // gets a persistent placeholder elder beside the arrival — Cairo's Keeper
    // pattern, generalized. Nameplate = the beat title; talking accepts +
    // completes the manual-start opener (class gating decides availability).
    const opener = zone.questChain[0];
    if (zone.homeClass && opener?.archetype === 'story') {
      MainScene.ensureKeeperTexture(this);
      const mpos = map.nearestWalkableWorld(origin.x + chunk.arrivalLocalPx.x + 96, origin.y + chunk.arrivalLocalPx.y + 40);
      this.add.image(mpos.x, mpos.y, 'cairo-keeper').setDepth(9);
      this.addHeavenLabel(mpos.x, mpos.y - 34, opener.title, '#ffe9a8');
      this.regionMentors.push({ beatId: opener.id, zoneId: id, pos: mpos });
    }

    // BOSS ANCHOR: mirror the (south) arrival to the settlement's NORTH side —
    // where a boss beat's region champion spawns. Marked when the zone has one.
    const bossAnchor = map.nearestWalkableWorld(
      origin.x + chunk.centerLocalPx.x,
      origin.y + chunk.centerLocalPx.y - (chunk.arrivalLocalPx.y - chunk.centerLocalPx.y),
    );
    this.regionBossAnchors[id] = bossAnchor;
    const bossBeat = zone.questChain.find((b) => b.id in CHAMPION_SPECS);
    if (bossBeat) {
      const spec = CHAMPION_SPECS[bossBeat.id];
      const tint = DOMAIN_TINT[spec.domain.toLowerCase() as CombatDomain];
      this.add.circle(bossAnchor.x, bossAnchor.y, 14, tint, 0.5).setStrokeStyle(2, tint, 0.95).setDepth(6);
      this.addHeavenLabel(bossAnchor.x, bossAnchor.y - 22, `☠ ${spec.name}`, '#e6d6ff');
    }

    // DEV overlay: a big zone-name label over the chunk, shown only at LOW zoom
    // (see updateRegionSpawns) — the zoomed-out continent view needs names.
    if (DEV_MODE) {
      const label = this.add
        .text(origin.x + chunk.centerLocalPx.x, origin.y + chunk.centerLocalPx.y, zone.displayName, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '26px',
          color: '#fff3c4',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setStroke('#101830', 8)
        .setDepth(45)
        .setVisible(false);
      this.regionZoneLabels.push(label);
    }

    // Spawn markers: families with live spawners become LIVE spawn points,
    // materialized per-chunk by updateRegionSpawns; anything unmapped stays a
    // visual marker (loud, tinted, labeled).
    const zoneSpawnPoints: { family: string; x: number; y: number }[] = [];
    for (const m of plan.spawnMarkers) {
      const mx = origin.x + m.x;
      const my = origin.y + m.y;
      if (m.enemyFamily in EXISTING_FAMILY_DOMAIN) {
        zoneSpawnPoints.push({ family: m.enemyFamily, x: mx, y: my });
        continue;
      }
      const domain = ENEMY_ROSTER[m.enemyFamily]?.domain;
      const tint = domain ? DOMAIN_TINT[domain] : 0x9aa0a8;
      this.add.circle(mx, my, 10, tint, 0.85).setDepth(6);
      this.addHeavenLabel(mx, my - 16, m.enemyFamily, '#cfd6e0');
    }
    this.regionSpawnZones.push({
      zoneId: id,
      center: { x: origin.x + chunk.centerLocalPx.x, y: origin.y + chunk.centerLocalPx.y },
      radiusPx: chunk.data.width * 16, // half the chunk (tiles * 32 / 2)
      points: zoneSpawnPoints,
      active: false,
    });
  }

  /** Gates second pass (both endpoints must be BUILT): the pad on A's edge
   *  toward B travels to B's pad toward A, nudged toward B's center. Shared by
   *  every region world. */
  private buildRegionGates(worldId: WorldId, origin: { x: number; y: number }, built: Map<string, { chunk: BuiltChunk; map: GameMap }>): void {
    for (const [id, { chunk }] of built) {
      for (const g of chunk.gates) {
        const other = built.get(g.toZoneId);
        if (!other) continue; // neighbor not built yet — its gate arrives with its zone
        const back = other.chunk.gates.find((og) => og.toZoneId === id);
        const landing = back ?? { localPx: other.chunk.arrivalLocalPx };
        const toC = other.chunk.centerLocalPx;
        const dx = toC.x - landing.localPx.x;
        const dy = toC.y - landing.localPx.y;
        const len = Math.hypot(dx, dy) || 1;
        const dest = {
          x: origin.x + landing.localPx.x + (dx / len) * 64,
          y: origin.y + landing.localPx.y + (dy / len) * 64,
        };
        const name = getZone(g.toZoneId)?.displayName ?? g.toZoneId;
        const label = g.kind === 'sea-dock' ? `Sail to ${name}` : `Cross to ${name}`;
        const gx = origin.x + g.localPx.x;
        const gy = origin.y + g.localPx.y;
        this.regionGates.push({ x: gx, y: gy, label, dest, destWorld: worldId });
        this.addHeavenLabel(gx, gy - 24, g.kind === 'sea-dock' ? `⚓ ${name}` : `→ ${name}`, '#ffe9a8');
      }
    }
  }

  // --- CAIRO ACT I LIVE BINDING (the Egypt world hosts the Wizard's chain) -----
  //
  // Strictly ADDITIVE: new sprites and triggers placed relative to EXISTING
  // anchors (the Egypt arrival, Faiyum's entrance) — no Egypt/Faiyum tile,
  // NPC, or quest is touched. Cairo (manifest zone) ↔ Egypt (hand-built world)
  // per the PREBUILT rule; all prose stays HAND_AUTHORED_TODO placeholders.

  private setupCairoBinding(): void {
    const map = this.egyptMap;
    const gate = this.cityRuntimes['city-faiyum']?.entrancePos ?? this.egyptArrivalPos;

    // 1) THE MENTOR — "The Keeper of the Old Kingdom", a gray-box elder on the
    // gate road, far enough from Faiyum's entrance that the two proximity
    // buttons never contend (CITY_GATE_RANGE is 120).
    MainScene.ensureKeeperTexture(this);
    this.cairoMentorPos = map.nearestWalkableWorld(gate.x + 330, gate.y + 270);
    this.add.image(this.cairoMentorPos.x, this.cairoMentorPos.y, 'cairo-keeper').setDepth(9);
    this.addHeavenLabel(this.cairoMentorPos.x, this.cairoMentorPos.y - 34, 'The Keeper of the Old Kingdom', '#ffe9a8');

    // 2) DELTA-ROAD WOLVES (cai-02): red corrupted wildlife on posts fanning
    // north-west of the arrival — the roads out of the crown city.
    for (let i = 0; i < CAIRO_WOLF_PACK; i++) {
      const post = map.nearestWalkableWorld(gate.x - 380 - (i % 4) * 230, gate.y + 420 + Math.floor(i / 4) * 280);
      this.spawnCairoWolf(post);
    }

    // 3) THE DISCOVERY (cai-03): a marked rot site on the river road beyond
    // the wolf posts. Walking in while the beat is active completes it.
    this.cairoDiscoveryPos = map.nearestWalkableWorld(gate.x - 1350, gate.y + 720);
    const ring = this.add.circle(this.cairoDiscoveryPos.x, this.cairoDiscoveryPos.y, 16, 0x6a4a2a, 0.5).setStrokeStyle(2, 0x9a6a3a, 0.9).setDepth(6);
    this.tweens.add({ targets: ring, scale: 1.5, alpha: 0.2, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.addHeavenLabel(this.cairoDiscoveryPos.x, this.cairoDiscoveryPos.y - 24, 'Rot in the River (investigate)', '#cfd6e0');

    // 4) THE FIRST EVIL (cai-04): a boosted lesser-evil scout at the city gates.
    const bossPost = map.nearestWalkableWorld(gate.x + 180, gate.y + 140);
    this.spawnCairoBoss(bossPost);
  }

  /** One red delta wolf at its post (canon: corrupted-wildlife = Physical). */
  private spawnCairoWolf(post: { x: number; y: number }): void {
    const t = this.spawnTownsfolk(post.x, post.y, null, 'wolf');
    t.sprite.setTint(DOMAIN_TINT.physical);
    this.cairoLive.push({ family: 'corrupted-wildlife', entity: t, post: { ...post }, counted: false });
  }

  /** The cai-04 gate boss: one boosted lesser-evil scout (a demon, canon red). */
  private spawnCairoBoss(post: { x: number; y: number }): void {
    const d = this.spawnDemon(post.x, post.y, this.egyptMap.layer);
    d.sprite.setTint(DOMAIN_TINT.physical).setScale(d.sprite.scale * 1.4);
    d.health.setMax(CAIRO_BOSS_HP);
    d.health.full();
    this.addHeavenLabel(post.x, post.y - 46, '☠ Evil at the Crown', '#e6d6ff');
    this.cairoLive.push({ family: 'lesser-evil-scouts', entity: d, post: { ...post }, bossBeatId: 'cai-04-first-evil', counted: false });
  }

  /** The Keeper's talk action: ACCEPTS the manual-start opener (Wizard only —
   *  class gating decides) and completes it. All prose is a TODO placeholder. */
  private cairoMentorTalk(): void {
    const id = 'cai-01-mentor';
    const st = this.chain.status(id);
    if (st === 'available' || st === 'active') {
      if (st === 'available') this.chain.accept(id);
      this.showBanner('HAND_AUTHORED_TODO: cai-01-mentor — designer prose goes here.', 2800);
      this.notifyQuest('cai-01-mentor-story-complete' as ObjectiveTrigger);
    } else {
      this.showBanner('HAND_AUTHORED_TODO: cai-01-mentor (idle line) — designer prose goes here.', 2200);
    }
  }

  /** Per-frame while EGYPT is active: mentor button, discovery walk-in, kill
   *  sweep (clear counting via the shared region path + the cai-04 boss beat),
   *  and the throttled ambient replenish so the chain is always completable. */
  private updateCairoBinding(): void {
    const now = this.time.now;
    // Mentor proximity button (never contends with Talk / gate buttons).
    const near = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.cairoMentorPos.x, this.cairoMentorPos.y) <= CAIRO_INTERACT_RANGE;
    const free = !this.transitioning && !this.dialogue.isOpen() && !this.talkButton.isVisible && !this.cityGateButton.isVisible && !this.playerDead;
    this.cairoMentorButton.setVisible(near && free);

    // cai-03 discovery: stepping onto the rot completes the active beat.
    if (this.chain.activeQuest?.id === 'cai-03-discovery') {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.cairoDiscoveryPos.x, this.cairoDiscoveryPos.y);
      if (d <= CAIRO_DISCOVERY_RADIUS) {
        this.showBanner('HAND_AUTHORED_TODO: cai-03-discovery — designer prose goes here.', 2800);
        this.notifyQuest('cai-03-discovery-story-complete' as ObjectiveTrigger);
      }
    }

    // Kill sweep: clears count through the SHARED region objective path (the
    // cairo zone id); the boss beat completes on its scout's death.
    for (const rec of this.cairoLive) {
      if (rec.counted || rec.entity.isAlive) continue;
      rec.counted = true;
      if (rec.bossBeatId) {
        if (this.chain.activeQuest?.id === rec.bossBeatId) {
          const hit = this.regionBeatForQuest(rec.bossBeatId);
          if (hit) this.notifyQuest(triggerForBeat(hit.beat) as ObjectiveTrigger);
        }
      } else {
        this.onRegionEnemyKilled(rec.family, 'cairo-nile-crown');
      }
    }

    // Ambient replenish (throttled): a counted-dead post refills once the
    // player is well away from it — no pop-in, and the chain never strands.
    // The gate boss stays down for good once cai-04 is complete.
    if (now >= this.cairoReplenishAt) {
      this.cairoReplenishAt = now + CAIRO_REPLENISH_MS;
      for (const rec of [...this.cairoLive]) {
        if (rec.entity.isAlive || !rec.counted) continue;
        const bossDone = rec.bossBeatId !== undefined && this.chain.status(rec.bossBeatId) === 'complete';
        const far = Phaser.Math.Distance.Between(this.player.x, this.player.y, rec.post.x, rec.post.y) > 700;
        if (!bossDone && !far) continue;
        this.cairoLive = this.cairoLive.filter((x) => x !== rec);
        if (!bossDone) {
          if (rec.bossBeatId) this.spawnCairoBoss(rec.post);
          else this.spawnCairoWolf(rec.post);
        }
      }
    }
  }

  /** Gray-box keeper body: an aged robed figure with a staff — placeholder art. */
  private static ensureKeeperTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists('cairo-keeper')) return;
    const w = 26;
    const h = 38;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x14100c, 1); // outline
    g.fillRoundedRect(4, 9, w - 8, h - 11, 5);
    g.fillStyle(0xd9c28a, 1); // pale gold robe
    g.fillRoundedRect(6, 11, w - 12, h - 15, 4);
    g.fillStyle(0x14100c, 1); // head outline
    g.fillCircle(w / 2, 9, 7);
    g.fillStyle(0xe8d5b0, 1); // aged face
    g.fillCircle(w / 2, 9, 5.5);
    g.lineStyle(3, 0x8a6a3a, 1); // the staff
    g.lineBetween(w - 4, 6, w - 4, h - 2);
    g.generateTexture('cairo-keeper', w, h);
    g.destroy();
  }

  // --- GENERIC BEAT COMPLETION: every generated chain hand-playable ------------
  //
  // ONE implementation per archetype pattern — nothing per-beat. Cairo's four
  // proven mechanics, generalized to every stamped zone: mentor talk (opening
  // story beat of a home-city chain), story-marker walk-in (all other story
  // beats), fetch pickups, and an elite fallback for boss beats WITHOUT a
  // champion spec. Already-completable beats (clears, harvests, escorts,
  // champions, Cairo's own binding) are untouched. ALL prose stays a
  // HAND_AUTHORED_TODO placeholder for hand-authored beats.

  /** Placeholder prose for a beat's banner — never invented content. */
  private beatProse(zone: ManifestZone, beat: QuestBeat): string {
    return beat.handAuthored === true || zone.handAuthored === true
      ? `HAND_AUTHORED_TODO: ${beat.id} — designer prose goes here.`
      : `${beat.title} — ${beat.summary}`;
  }

  /** The mentor's talk action (generic Cairo Keeper): ACCEPT the manual-start
   *  class-gated opener if available, then complete it. Idle line otherwise. */
  private regionMentorTalk(): void {
    const m = this.mentorNear;
    if (!m) return;
    const hit = this.regionBeatForQuest(m.beatId);
    if (!hit) return;
    const st = this.chain.status(m.beatId);
    if (st === 'available' || st === 'active') {
      if (st === 'available') this.chain.accept(m.beatId);
      // Trigger FIRST, prose banner AFTER — the placeholder line outlives the
      // completion's reward banner (which fires synchronously in between).
      this.notifyQuest(triggerForBeat(hit.beat) as ObjectiveTrigger);
      this.showBanner(this.beatProse(hit.zone, hit.beat), 2800);
    } else {
      this.showBanner(`HAND_AUTHORED_TODO: ${m.beatId} (idle line) — designer prose goes here.`, 2200);
    }
  }

  /** Per-frame (region worlds): mentors' proximity button + the ACTIVE beat's
   *  marker / pickups / elite, spawned and cleaned by archetype. */
  private updateRegionBeatObjectives(): void {
    // MENTORS: persistent NPCs; the nearest within range owns the shared button.
    let near: (typeof this.regionMentors)[number] | undefined;
    for (const m of this.regionMentors) {
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, m.pos.x, m.pos.y) <= MENTOR_INTERACT_RANGE) {
        near = m;
        break;
      }
    }
    this.mentorNear = near;
    const free = !this.transitioning && !this.dialogue.isOpen() && !this.talkButton.isVisible && !this.cityGateButton.isVisible && !this.playerDead;
    this.mentorButton.setVisible(!!near && free);

    const q = this.chain.activeQuest;
    const hit = this.regionBeatForQuest(q?.id);
    const zone = hit ? this.regionSpawnZones.find((z) => z.zoneId === hit.zone.id) : undefined;
    const isMentorBeat = !!q && this.regionMentors.some((m) => m.beatId === q.id);

    // STORY MARKER (every non-mentor story beat): a pulsing site in the beat's
    // zone; walking in completes it (Cairo's discovery pattern).
    const wantMarker = !!q && !!hit && !!zone && hit.beat.archetype === 'story' && !isMentorBeat;
    if (this.beatMarker && (!wantMarker || this.beatMarker.beatId !== q?.id)) this.clearBeatMarker();
    if (wantMarker && !this.beatMarker) this.spawnBeatMarker(q.id, zone);
    if (this.beatMarker && q && hit && this.beatMarker.beatId === q.id && !this.playerDead) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.beatMarker.pos.x, this.beatMarker.pos.y);
      if (d <= BEAT_MARKER_RADIUS) {
        this.clearBeatMarker();
        this.notifyQuest(triggerForBeat(hit.beat) as ObjectiveTrigger);
        this.showBanner(this.beatProse(hit.zone, hit.beat), 2800); // prose outlives the reward banner
      }
    }

    // FETCH PICKUPS: three glowing objects around the settlement; collecting
    // all of them completes the beat.
    const wantPickups = !!q && !!hit && !!zone && hit.beat.archetype === 'fetch';
    if (this.beatPickups && (!wantPickups || this.beatPickups.beatId !== q?.id)) this.clearBeatPickups();
    if (wantPickups && !this.beatPickups) this.spawnBeatPickups(q.id, zone);
    if (this.beatPickups && q && hit && this.beatPickups.beatId === q.id && !this.playerDead) {
      for (const it of this.beatPickups.items) {
        if (it.taken) continue;
        if (Phaser.Math.Distance.Between(this.player.x, this.player.y, it.x, it.y) <= BEAT_PICKUP_RADIUS) {
          it.taken = true;
          this.tweens.killTweensOf(it.obj);
          it.obj.destroy();
          this.beatPickups.taken++;
          this.showBanner(`${hit.beat.title} — ${this.beatPickups.taken}/${BEAT_PICKUP_COUNT} recovered.`, 1600);
        }
      }
      if (this.beatPickups.taken >= BEAT_PICKUP_COUNT) {
        this.clearBeatPickups();
        this.notifyQuest(triggerForBeat(hit.beat) as ObjectiveTrigger);
        this.showBanner(this.beatProse(hit.zone, hit.beat), 2800); // prose outlives the reward banner
      }
    }

    // ELITE BOSS FALLBACK (boss beats with NO champion spec): one boosted
    // enemy of the beat's family at the zone's boss anchor — Cairo's gate
    // scout, tier-scaled. Champion life-cycle rules: exists only while the
    // beat is active + the chunk is active; leaving/dying resets for a retry;
    // completion means it never respawns (the beat is no longer active).
    const wantElite = !!q && !!hit && !!zone && hit.beat.archetype === 'boss' && !CHAMPION_SPECS[q.id];
    if (this.beatElite) {
      if (!this.beatElite.entity.isAlive) {
        // A REAL defeat (despawns go through despawnBeatElite, never here).
        if (q && hit && this.beatElite.beatId === q.id) {
          this.notifyQuest(triggerForBeat(hit.beat) as ObjectiveTrigger);
          this.showBanner(this.beatProse(hit.zone, hit.beat), 2800); // prose outlives the reward banner
        }
        this.beatElite.label.destroy();
        this.beatElite = undefined;
      } else if (!wantElite || this.beatElite.beatId !== q?.id || this.playerDead || !zone?.active) {
        this.despawnBeatElite();
      } else {
        this.beatElite.label.setPosition(this.beatElite.entity.sprite.x, this.beatElite.entity.sprite.y - 46);
      }
    }
    if (wantElite && !this.beatElite && zone.active && !this.playerDead && hit) {
      this.spawnBeatElite(q.id, hit.zone.id, hit.beat.enemyFamily ?? 'lesser-evil-scouts', hit.zone.tier, hit.beat.title);
    }
  }

  /** Deterministic story-marker site: west of the settlement, off the arrival. */
  private spawnBeatMarker(beatId: string, zone: (typeof this.regionSpawnZones)[number]): void {
    const pos = this.activeMap().nearestWalkableWorld(zone.center.x - zone.radiusPx * 0.55, zone.center.y + zone.radiusPx * 0.25);
    const hit = this.regionBeatForQuest(beatId);
    const ring = this.add.circle(pos.x, pos.y, 16, 0x6a4a2a, 0.5).setStrokeStyle(2, 0x9a6a3a, 0.9).setDepth(6);
    this.tweens.add({ targets: ring, scale: 1.5, alpha: 0.2, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    const label = this.add
      .text(pos.x, pos.y - 24, `${hit?.beat.title ?? beatId} (approach)`, { fontFamily: 'system-ui, sans-serif', fontSize: '13px', color: '#cfd6e0' })
      .setOrigin(0.5)
      .setStroke('#101830', 4)
      .setDepth(6);
    this.beatMarker = { beatId, pos, objs: [ring, label] };
  }

  private clearBeatMarker(): void {
    if (!this.beatMarker) return;
    for (const o of this.beatMarker.objs) {
      this.tweens.killTweensOf(o);
      o.destroy();
    }
    this.beatMarker = undefined;
  }

  /** Three pickups on a ring outside the settlement walls, walkable-snapped. */
  private spawnBeatPickups(beatId: string, zone: (typeof this.regionSpawnZones)[number]): void {
    const items: NonNullable<typeof this.beatPickups>['items'] = [];
    for (let i = 0; i < BEAT_PICKUP_COUNT; i++) {
      const ang = -Math.PI / 2 + (Math.PI * 2 * i) / BEAT_PICKUP_COUNT;
      const p = this.activeMap().nearestWalkableWorld(zone.center.x + Math.cos(ang) * zone.radiusPx * 0.4, zone.center.y + Math.sin(ang) * zone.radiusPx * 0.4);
      const obj = this.add.circle(p.x, p.y, 10, 0xffe27a, 0.95).setStrokeStyle(2, 0xfff4c0, 1).setDepth(7);
      this.tweens.add({ targets: obj, alpha: 0.45, scale: 1.3, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      items.push({ obj, taken: false, x: p.x, y: p.y });
    }
    this.beatPickups = { beatId, taken: 0, items };
  }

  private clearBeatPickups(): void {
    if (!this.beatPickups) return;
    for (const it of this.beatPickups.items) {
      if (!it.taken) {
        this.tweens.killTweensOf(it.obj);
        it.obj.destroy();
      }
    }
    this.beatPickups = undefined;
  }

  /** One boosted family enemy at the boss anchor (Cairo's 320 HP scout × tier). */
  private spawnBeatElite(beatId: string, zoneId: string, family: string, tier: number, title: string): void {
    const anchor = this.regionBossAnchors[zoneId];
    if (!anchor) return;
    let entity: Demon | AngelEnemy;
    let kind: 'demon' | 'angel';
    if (family === 'lesser-angels' || family === 'radiant-guardians' || family === 'herald-angels') {
      const v = family === 'herald-angels' ? 'herald' : family === 'radiant-guardians' ? 'warden' : 'lesser';
      entity = this.spawnAngel(v, anchor.x, anchor.y); // angelic look, no domain tint (canon)
      kind = 'angel';
    } else {
      const d = this.spawnDemon(anchor.x, anchor.y, this.activeMap().layer);
      d.sprite.setTint(DOMAIN_TINT[EXISTING_FAMILY_DOMAIN[family] ?? 'physical']);
      entity = d;
      kind = 'demon';
    }
    entity.sprite.setScale(entity.sprite.scale * 1.4);
    entity.health.setMax(BEAT_ELITE_HP_PER_TIER * tier);
    entity.health.full();
    const label = this.add
      .text(anchor.x, anchor.y - 46, `☠ ${title}`, { fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: '#e6d6ff', fontStyle: 'bold' })
      .setOrigin(0.5)
      .setStroke('#101830', 4)
      .setDepth(40);
    this.beatElite = { beatId, zoneId, kind, entity, label };
  }

  /** Silent removal (retry semantics) — never counts as a defeat. */
  private despawnBeatElite(): void {
    if (!this.beatElite) return;
    const e = this.beatElite.entity;
    if (e.isAlive) {
      e.destroy();
      if (this.beatElite.kind === 'angel') this.angels = this.angels.filter((a) => (a as unknown) !== e);
      else this.demons = this.demons.filter((d) => (d as unknown) !== e);
    }
    this.beatElite.label.destroy();
    this.beatElite = undefined;
  }

  // --- NESTED CITIES: the generic city sub-map system --------------------------
  //
  // Every CityDef in world/cities.ts becomes a small registered WORLD (CPU layer,
  // chained east past the last world) plus a compact walled-settlement stamp on
  // its parent map. Enter/Leave both run travelToWorld with FIXED arrivals and a
  // quick fade. Adding a city = adding a CityDef; no code here changes.

  private setupCities(): void {
    let originX = this.egyptMap.bounds.x + this.egyptMap.pixelWidth + HEAVEN_WORLD_GAP;
    for (const def of CITY_DEFS) {
      const parent = this.worlds[def.parentWorld]?.map;
      if (!parent) throw new Error(`City '${def.id}' registered before its parent world '${def.parentWorld}'`);
      // Entrance stamps paint tiles — only DENSE (GameMap) parents support that.
      if (!(parent instanceof GameMap)) throw new Error(`City '${def.id}': parent world '${def.parentWorld}' is not a dense map`);

      const cityMap = new GameMap(this, def.buildMap(), [], { x: originX, y: 0 }, { forceCpuLayer: true });
      originX += cityMap.pixelWidth + HEAVEN_WORLD_GAP;
      new CityMarkers(this, cityMap); // interior nameplates (The Mill / The Well / the gate)

      const collider = this.physics.add.collider(this.player.sprite, cityMap.layer);
      collider.active = false;

      const entrancePos = this.stampCityEntrance(parent, def);
      const insideArrival = cityMap.tileToWorldCenter(def.insideArrivalTile.x, def.insideArrivalTile.y);
      const gatePos = cityMap.tileToWorldCenter(def.gateTile.x, def.gateTile.y);
      const outsideArrival = {
        x: entrancePos.x,
        y: entrancePos.y + parent.tileSize * def.outsideArrivalOffsetTiles,
      };

      this.worlds[def.id] = { id: def.id, map: cityMap, collider, defaultArrival: insideArrival };
      this.worldPos[def.id] = { ...insideArrival };
      this.cityRuntimes[def.id] = { def, map: cityMap, entrancePos, outsideArrival, insideArrival, gatePos };
    }
    this.nextWorldOriginX = originX; // the next world east (Europe) starts here
  }

  /** Paint a city's walled-settlement stamp onto its parent map; returns the
   *  gate's world position (the "Enter" proximity anchor). */
  private stampCityEntrance(parent: GameMap, def: CityDef): { x: number; y: number } {
    const legend: Record<string, number> = {
      W: TownTileId.building, // wall mass (blocks)
      G: TownTileId.ground,
      P: TownTileId.road,
      D: TownTileId.door, // the gate (walkable; exactly one per stamp)
    };
    let gate: { x: number; y: number } | null = null;
    def.entranceStamp.forEach((line, row) => {
      for (let col = 0; col < line.length; col++) {
        const ch = line[col];
        if (ch === '.') continue;
        const id = legend[ch];
        if (id === undefined) throw new Error(`Unknown city-entrance cell '${ch}' in '${def.id}'`);
        const tx = def.entranceAnchorTile.x + col;
        const ty = def.entranceAnchorTile.y + row;
        parent.setTileId(tx, ty, id);
        if (ch === 'D') gate = parent.tileToWorldCenter(tx, ty);
      }
    });
    parent.commitEdits();
    if (!gate) throw new Error(`City '${def.id}' entrance stamp has no gate 'D'`);
    return gate;
  }

  /** Per-frame (terrestrial worlds): show Enter/Leave at city gates. Runs AFTER
   *  checkInteractions so the Talk prompt keeps priority in the shared slot. */
  private updateCityGates(): void {
    let show: { label: string; action: () => void } | null = null;
    const free =
      !this.transitioning &&
      this.time.now >= this.worldCooldownUntil &&
      !this.dialogue.isOpen() &&
      !this.isDashing() &&
      !this.talkButton.isVisible;
    if (free) {
      const here = this.cityRuntimes[this.activeWorld];
      if (here) {
        // Inside a city: the exit gate.
        const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, here.gatePos.x, here.gatePos.y);
        if (d <= CITY_GATE_RANGE) show = { label: `Leave ${here.def.displayName}`, action: () => this.leaveCity(here.def.id) };
      } else {
        // On a parent world: any city entrance in range.
        for (const id of Object.keys(this.cityRuntimes)) {
          const c = this.cityRuntimes[id];
          if (c.def.parentWorld !== this.activeWorld) continue;
          const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, c.entrancePos.x, c.entrancePos.y);
          if (d <= CITY_GATE_RANGE) {
            show = { label: `Enter ${c.def.displayName}`, action: () => this.enterCity(id) };
            break;
          }
        }
        // Region zone-transition gates (Cross to… / Sail to…) share the slot.
        // Scanned in EVERY terrestrial world — a gate can be cross-world
        // (Egypt↔Africa), so its pad may sit on a dense hand-built map too.
        if (!show) {
          for (const g of this.regionGates) {
            const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, g.x, g.y);
            if (d <= CITY_GATE_RANGE) {
              show = { label: g.label, action: () => this.travelToWorld(g.destWorld, g.dest, CITY_TRANSITION_MS) };
              break;
            }
          }
        }
      }
    }
    if (show) {
      this.cityGateButton.setLabel(show.label);
      this.cityGateAction = show.action;
      this.cityGateButton.setVisible(true);
    } else {
      this.cityGateButton.setVisible(false);
      this.cityGateAction = null;
    }
  }

  private enterCity(cityId: WorldId): void {
    const c = this.cityRuntimes[cityId];
    if (!c || this.transitioning || this.time.now < this.worldCooldownUntil) return;
    this.cityGateButton.setVisible(false);
    this.travelToWorld(cityId, c.insideArrival, CITY_TRANSITION_MS);
  }

  private leaveCity(cityId: WorldId): void {
    const c = this.cityRuntimes[cityId];
    if (!c || this.transitioning || this.time.now < this.worldCooldownUntil) return;
    this.cityGateButton.setVisible(false);
    this.travelToWorld(c.def.parentWorld, c.outsideArrival, CITY_TRANSITION_MS);
  }

  // --- EUROPE per-chunk spawn activation + kill objectives ---------------------

  /** Materialize/despawn Europe packs by player proximity (hysteresis), sweep
   *  deaths into the kill counters, and enforce the live-enemy cap. Runs every
   *  frame ONLY while Europe is the active world (25 distance checks — trivial). */
  private updateRegionSpawns(): void {
    for (const z of this.regionSpawnZones) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, z.center.x, z.center.y);
      if (!z.active && d < z.radiusPx + EUROPE_SPAWN_ACTIVATE_MARGIN) this.activateRegionZone(z);
      else if (z.active && d > z.radiusPx + EUROPE_SPAWN_DEACTIVATE_MARGIN) this.deactivateRegionZone(z.zoneId);
    }
    this.updateRegionAmbushers(); // the veil-ambusher hidden/burst/re-hide machine
    this.updateRegionChampion(); // the active boss beat's region champion
    this.updateRegionEscort(); // the active escort beat's convoy run
    this.updateRegionBeatObjectives(); // mentors / story markers / pickups / elites
    // DEV overlay: at low zoom the chunks are unreadable — show big zone-name
    // labels at constant SCREEN size so the zoomed-out view reads as a map.
    if (this.regionZoneLabels.length > 0) {
      const zoom = this.cameras.main.zoom;
      const show = zoom <= DEV_ZONE_LABEL_MAX_ZOOM;
      for (const l of this.regionZoneLabels) {
        if (l.visible !== show) l.setVisible(show);
        if (show) l.setScale(0.55 / zoom);
      }
    }
    // Death sweep: count each kill once (clear/harvest objectives), then drop
    // the record — the entity arrays prune their own dead.
    for (const rec of this.regionLive) {
      if (!rec.counted && !rec.entity.isAlive) {
        rec.counted = true;
        this.onRegionEnemyKilled(rec.family, rec.zoneId);
      }
    }
    this.regionLive = this.regionLive.filter((r) => r.entity.isAlive || !r.counted);
  }

  private regionLiveCount(): number {
    return this.regionLive.filter((r) => r.entity.isAlive).length;
  }

  /** Spawn every mapped-family pack for one zone (cap-guarded: a pack that would
   *  break EUROPE_ENEMY_CAP is skipped whole, never split). */
  private activateRegionZone(z: (typeof this.regionSpawnZones)[number]): void {
    z.active = true;
    for (const p of z.points) {
      // HOLLOWED-BRUTES: a hard 1–2-per-pack ceiling, enforced here in spawn
      // logic (not just in the pack-size data).
      const pack = Math.min(EXISTING_FAMILY_PACK[p.family] ?? 3, p.family === 'hollowed-brutes' ? BRUTE_PACK_CAP : Infinity);
      if (this.regionLiveCount() + pack > EUROPE_ENEMY_CAP) continue; // cap holds
      const tint = DOMAIN_TINT[EXISTING_FAMILY_DOMAIN[p.family]];
      for (let i = 0; i < pack; i++) {
        const ang = (Math.PI * 2 * i) / pack;
        const r = 60 + (i % 2) * 40;
        const spot = this.activeMap().nearestWalkableWorld(p.x + Math.cos(ang) * r, p.y + Math.sin(ang) * r);
        this.spawnRegionEnemy(z.zoneId, p.family, spot.x, spot.y, tint);
      }
    }
  }

  /** Despawn (pool away) every live entity a zone spawned. */
  private deactivateRegionZone(zoneId: string): void {
    const z = this.regionSpawnZones.find((s) => s.zoneId === zoneId);
    if (z) z.active = false;
    for (const rec of this.regionLive) {
      if (rec.zoneId !== zoneId) continue;
      if (rec.entity.isAlive) {
        rec.entity.destroy();
        // Remove from the per-kind update arrays so nothing ticks a destroyed body.
        if (rec.kind === 'angel') this.angels = this.angels.filter((a) => (a as unknown) !== rec.entity);
        else if (rec.kind === 'townsfolk') this.townsfolk = this.townsfolk.filter((t) => (t as unknown) !== rec.entity);
        else this.demons = this.demons.filter((dm) => (dm as unknown) !== rec.entity);
      }
    }
    this.regionLive = this.regionLive.filter((r) => r.zoneId !== zoneId);
    // Drop the zone's ambusher records too (their townsfolk were just destroyed).
    this.regionAmbushers = this.regionAmbushers.filter((a) => a.t.isAlive);
  }

  private deactivateAllRegionZones(): void {
    for (const z of this.regionSpawnZones) if (z.active) this.deactivateRegionZone(z.zoneId);
    this.despawnRegionChampion(); // the champion never outlives its chunk / the world
    this.despawnRegionEscort(); // nor does a convoy run
  }

  /** One mapped-family enemy via its EXISTING spawner (see EXISTING_FAMILY_SPAWNERS).
   *  The three new families are behavior VARIANTS over those same spawners:
   *  dark-caster = a kiting AngelEnemy variant, veil-ambusher / hollowed-brute =
   *  Townsfolk variants with scene-driven extras. */
  private spawnRegionEnemy(zoneId: string, family: string, x: number, y: number, tint: number): void {
    if (family === 'lesser-evil-scouts') {
      const d = this.spawnDemon(x, y, this.activeMap().layer);
      d.sprite.setTint(tint);
      this.regionLive.push({ zoneId, family, kind: 'demon', entity: d, counted: false });
    } else if (family === 'corrupted-wildlife' || family === 'evil-raiders') {
      const t = this.spawnTownsfolk(x, y, null, family === 'corrupted-wildlife' ? 'wolf' : 'raider');
      t.sprite.setTint(tint);
      this.regionLive.push({ zoneId, family, kind: 'townsfolk', entity: t, counted: false });
    } else if (family === 'dark-casters') {
      // Low HP + ranged + native kiting (backs off inside preferred range); its
      // tagged bolts apply the slow/weaken + stacking DoT in onProjectileHitPlayer.
      const a = this.spawnAngel('darkcaster', x, y);
      a.sprite.setTint(tint);
      this.regionLive.push({ zoneId, family, kind: 'angel', entity: a, counted: false });
    } else if (family === 'veil-ambushers') {
      this.spawnRegionAmbusher(zoneId, x, y);
    } else if (family === 'hollowed-brutes') {
      this.spawnEuropeBrute(zoneId, x, y);
    } else {
      // ANGELIC families keep their existing angel look — canon says no domain
      // tint on them (their EXISTING_FAMILY_DOMAIN entry gates spawning only).
      const variant = family === 'herald-angels' ? 'herald' : family === 'radiant-guardians' ? 'warden' : 'lesser';
      const a = this.spawnAngel(variant, x, y);
      this.regionLive.push({ zoneId, family, kind: 'angel', entity: a, counted: false });
    }
  }

  /** VEIL-AMBUSHER: spawned already HIDDEN at its marker (invisible, physics off,
   *  outside this.townsfolk → outside the aggro hierarchy; taunts/pulls can't
   *  touch it). updateRegionAmbushers runs the reveal/burst/re-hide machine. */
  private spawnRegionAmbusher(zoneId: string, x: number, y: number): void {
    const t = this.spawnTownsfolk(x, y, null, 'ambusher');
    this.hideAmbusher(t);
    this.regionLive.push({ zoneId, family: 'veil-ambushers', kind: 'townsfolk', entity: t, counted: false });
    this.regionAmbushers.push({ zoneId, t, home: { x, y }, state: 'hidden', burstEndsAt: 0 });
  }

  /** Pull an ambusher OUT of the world's combat fabric: invisible, untargetable,
   *  removed from this.townsfolk (no AI tick, no aggro, no hits). */
  private hideAmbusher(t: Townsfolk): void {
    this.townsfolk = this.townsfolk.filter((tf) => tf !== t);
    t.sprite.setVisible(false);
    (t.sprite.body as Phaser.Physics.Arcade.Body).enable = false;
    t.halt();
  }

  /** HOLLOWED-BRUTE: slow move + turn (variant data), tier-scaled HP, and a
   *  telegraphed heavy strike replacing the plain contact hit. Never flees —
   *  the townsfolk chase AI has no flee state. */
  private spawnEuropeBrute(zoneId: string, x: number, y: number): void {
    const t = this.spawnTownsfolk(x, y, null, 'brute');
    const tier = getZone(zoneId)?.tier ?? 1;
    t.health.setMax(BRUTE_HP_PER_TIER * tier);
    t.health.full();
    t.sprite.setScale(1.35); // reads as the big slow threat even in gray-box
    t.onHitPlayer = () => this.bruteBeginStrike(t);
    this.regionLive.push({ zoneId, family: 'hollowed-brutes', kind: 'townsfolk', entity: t, counted: false });
  }

  /** The brute's heavy attack: plant in place, show the boss-style windup ring,
   *  then the strike lands on everything… well, on the PLAYER if still inside. */
  private bruteBeginStrike(t: Townsfolk): void {
    if (!t.isAlive || this.playerDead) return;
    const now = this.time.now;
    t.holdUntil = now + BRUTE_TELEGRAPH_MS; // planted for the whole windup (still hittable)
    const cx = t.x;
    const cy = t.y;
    this.bossTelegraph(cx, cy, BRUTE_STRIKE_RADIUS, BRUTE_TELEGRAPH_MS);
    this.time.delayedCall(BRUTE_TELEGRAPH_MS, () => {
      if (!t.isAlive || this.playerDead) return;
      this.spawnSkillRing(cx, cy, BRUTE_STRIKE_RADIUS, 0x9a4ae0);
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, cx, cy) <= BRUTE_STRIKE_RADIUS + 12) {
        if (this.parryGate(cx, cy)) return; // Samurai parry: melee negated + riposte
        const dealt = this.playerHealth.damage(BRUTE_STRIKE_DAMAGE);
        this.player.flash();
        this.spawnDamageNumber(this.player.x, this.player.y - 26, dealt, '#c08aff');
        this.lastCombatTime = this.time.now;
        if (this.playerHealth.isDead) this.onPlayerDeath();
      }
    });
  }

  /** Per-frame (Europe only): the veil-ambusher hidden→burst→re-hide machine.
   *  Hidden: reveal when the PLAYER (or, once Prompt D arms ambusherEscortTarget,
   *  the escort) enters the trigger radius. Burst: full townsfolk chase AI for
   *  AMBUSHER_BURST_MS. Then disengage back to the marker and re-hide. */
  private updateRegionAmbushers(): void {
    if (this.regionAmbushers.some((a) => !a.t.isAlive)) {
      this.regionAmbushers = this.regionAmbushers.filter((a) => a.t.isAlive);
    }
    const now = this.time.now;
    for (const a of this.regionAmbushers) {
      if (a.state === 'hidden') {
        const playerNear = Phaser.Math.Distance.Between(this.player.x, this.player.y, a.home.x, a.home.y) <= AMBUSHER_TRIGGER_RADIUS;
        // DORMANT escort hook: null until the escort run (Prompt D) sets a target.
        const escortNear =
          this.ambusherEscortTarget !== null &&
          Phaser.Math.Distance.Between(this.ambusherEscortTarget.x, this.ambusherEscortTarget.y, a.home.x, a.home.y) <= AMBUSHER_TRIGGER_RADIUS;
        if (playerNear || escortNear) this.revealAmbusher(a, now);
      } else if (now >= a.burstEndsAt) {
        // Burst window over: disengage — snap back to the marker and re-hide.
        a.state = 'hidden';
        a.t.sprite.setPosition(a.home.x, a.home.y);
        (a.t.sprite.body as Phaser.Physics.Arcade.Body).reset(a.home.x, a.home.y);
        this.hideAmbusher(a.t);
      }
    }
  }

  /** Reveal + burst: rejoin this.townsfolk (AI + targetable again) with a flash. */
  private revealAmbusher(a: (typeof this.regionAmbushers)[number], now: number): void {
    a.state = 'burst';
    a.burstEndsAt = now + AMBUSHER_BURST_MS;
    (a.t.sprite.body as Phaser.Physics.Arcade.Body).enable = true;
    a.t.sprite.setVisible(true);
    if (!this.townsfolk.includes(a.t)) this.townsfolk.push(a.t);
    this.circleFx.show(a.t.x, a.t.y, 18, 0x3a6de0, { alpha: 0.8, toScale: 2.4, durationMs: 260 });
    this.lastCombatTime = now;
  }

  // --- REGION CHAMPIONS: the boss engine's Europe instances --------------------
  //
  // ONE template (the generic Boss controller + makeRegionChampion stats), N data
  // rows (champion-specs.ts). A champion exists only while its boss beat is the
  // ACTIVE quest and its zone chunk is active; leaving the chunk, dying, or the
  // beat changing despawns it and the encounter resets cleanly (fresh instance,
  // full HP, next approach). Defeat completes the beat.

  /** Per-frame (Europe only): keep the live champion in sync with the active beat. */
  private updateRegionChampion(): void {
    const q = this.chain.activeQuest;
    const spec = q ? CHAMPION_SPECS[q.id] : undefined;
    if (spec && q && !this.playerDead) {
      const hit = this.regionBeatForQuest(q.id);
      const zone = hit ? this.regionSpawnZones.find((z) => z.zoneId === hit.zone.id) : undefined;
      if (zone?.active && this.championBeatId !== q.id) {
        this.despawnRegionChampion();
        this.spawnRegionChampion(q.id, spec);
        return;
      }
    }
    if (this.championBoss) {
      const zone = this.regionSpawnZones.find((z) => z.zoneId === this.championZoneId);
      const beatStillActive = !!spec && q?.id === this.championBeatId;
      if (!beatStillActive || this.playerDead || !zone?.active) this.despawnRegionChampion();
    }
  }

  /** Instantiate the boss beat's champion at its zone's boss anchor. */
  private spawnRegionChampion(beatId: string, spec: (typeof CHAMPION_SPECS)[string]): void {
    const hit = this.regionBeatForQuest(beatId);
    if (!hit) return;
    const zoneId = hit.zone.id;
    const anchor = this.regionBossAnchors[zoneId];
    if (!anchor) return;
    // The shipped template: elite stats scaled by the ZONE's tier, tinted by domain.
    const domain = spec.domain.toLowerCase() as CombatDomain;
    const signature = spec.move === 'aoe-slam' ? 'ground-slam' : spec.move;
    const champ = makeRegionChampion(spec.name, domain, hit.zone.tier, signature);
    const def = this.championDef(beatId, zoneId, champ.name, champ.tint, champ.stats, champ.tier, signature);
    const boss = this.spawnBoss(def, anchor.x, anchor.y, this.activeMap().layer);
    this.championBoss = boss;
    this.championBeatId = beatId;
    this.championZoneId = zoneId;
    this.championAdds = [];
  }

  /** Build the champion's BossDef: melee up close + its ONE signature move on a cycle. */
  private championDef(
    beatId: string,
    zoneId: string,
    name: string,
    tint: number,
    stats: { hp: number; damage: number; speed: number },
    tier: number,
    signature: 'charge' | 'summon-adds' | 'channel-beam' | 'ground-slam',
  ): BossDef {
    const attacks: BossAttack[] = [{ kind: 'melee', damage: Math.round(stats.damage * 0.5), cooldownMs: 1300, range: 48 }];
    if (signature === 'charge') {
      attacks.push({ kind: 'charge', damage: stats.damage, cooldownMs: 4600, range: 420, speed: 620, telegraphMs: 700 });
    } else if (signature === 'ground-slam') {
      attacks.push({ kind: 'slam', damage: stats.damage, cooldownMs: 4600, range: 210, radius: 130, telegraphMs: 950 });
    } else if (signature === 'channel-beam') {
      attacks.push({ kind: 'beam', damage: Math.max(4, Math.round(stats.damage * 0.25)), cooldownMs: 5200, range: 460, telegraphMs: 900, durationMs: 1800 });
    }
    return {
      id: `champion-${beatId}`,
      name,
      world: this.activeWorld, // champions spawn in their beat's region world
      placement: { x: 0, y: 0 }, // spawned at the zone's boss anchor, not a fixed placement
      sprite: { key: 'champion', scale: 1.6, tint }, // gray-box body (test-boss drawer), domain tint
      maxHP: stats.hp,
      moveTilesPerSec: stats.speed / 32, // championStats speed is px/sec; defs take tiles/sec
      meleeRange: 48,
      preferredRange: signature === 'channel-beam' ? 260 : 60,
      leashRange: 1000,
      activationRange: 520,
      phases: [
        {
          fromRatio: 1,
          attacks,
          // 'summon-adds' champions call in 2–3 of the ZONE's own families per wave.
          summon: signature === 'summon-adds' ? { enemy: `region-zone:${zoneId}`, count: 3, cap: 3, cadenceMs: 9000 } : undefined,
        },
      ],
      xpReward: 60 * tier,
      holyPowerDrop: 0,
      onDefeatHook: `region-champion:${beatId}`,
    };
  }

  /** Remove the live champion (leave/death/beat change): fresh encounter next time. */
  private despawnRegionChampion(): void {
    const b = this.championBoss;
    this.championBoss = undefined;
    this.championBeatId = null;
    this.championZoneId = null;
    this.championAdds = [];
    if (!b) return;
    if (b.isAlive) {
      this.clearBossAdds(b.id);
      this.hazards.clearBoss(b.id);
      b.destroy(); // beams it cast die on the next updateBossBeams sweep
      this.bosses = this.bosses.filter((x) => x !== b);
    }
  }

  // --- ENEMY-CAST BEAM (the 'beam' boss pattern; the channel system, reversed) --

  /** Start a beam: direction locked at cast toward (tx,ty), drawn + ticked per frame. */
  private bossBeamStart(bossRef: { id: string }, tx: number, ty: number, damage: number, durationMs: number, tickMs: number, range: number): void {
    const boss = this.bosses.find((b) => b.id === bossRef.id);
    if (!boss || !boss.isAlive) return;
    const ang = Math.atan2(ty - boss.y, tx - boss.x);
    const g = this.add.graphics().setDepth(12);
    this.worldFx.add(g);
    const now = this.time.now;
    this.bossBeams.push({ g, boss, dirX: Math.cos(ang), dirY: Math.sin(ang), range, until: now + durationMs, nextTickAt: now, tickMs, damage });
  }

  /** Per-frame: redraw live beams from their boss along the locked direction and
   *  tick damage while the player stands in the line. Ends on duration/boss death. */
  private updateBossBeams(): void {
    if (this.bossBeams.length === 0) return;
    const now = this.time.now;
    for (const beam of this.bossBeams) {
      if (now >= beam.until || !beam.boss.isAlive) {
        beam.g.destroy();
        continue;
      }
      const x1 = beam.boss.x;
      const y1 = beam.boss.y;
      const x2 = x1 + beam.dirX * beam.range;
      const y2 = y1 + beam.dirY * beam.range;
      // The channel-beam visual language (outer glow + bright core + nodes).
      const pulse = 0.6 + 0.4 * Math.sin(now / 60);
      beam.g.clear();
      beam.g.lineStyle(8, 0x2a3a7a, 0.45);
      beam.g.lineBetween(x1, y1, x2, y2);
      beam.g.lineStyle(3, 0x6c9aff, 0.95);
      beam.g.lineBetween(x1, y1, x2, y2);
      beam.g.fillStyle(0xc7d9ff, pulse);
      beam.g.fillCircle(x1, y1, 5);
      if (!this.playerDead && now >= beam.nextTickAt) {
        beam.nextTickAt = now + beam.tickMs;
        // Point-to-segment distance: is the player standing in the beam corridor?
        const px = this.player.x - x1;
        const py = this.player.y - y1;
        const t = Phaser.Math.Clamp((px * beam.dirX + py * beam.dirY) / beam.range, 0, 1);
        const d = Math.hypot(px - beam.dirX * beam.range * t, py - beam.dirY * beam.range * t);
        if (d <= 26) {
          const dealt = this.playerHealth.damage(beam.damage);
          this.player.flash();
          this.spawnDamageNumber(this.player.x, this.player.y - 26, dealt, '#8fa8ff');
          this.lastCombatTime = now;
          if (this.playerHealth.isDead) this.onPlayerDeath();
        }
      }
    }
    this.bossBeams = this.bossBeams.filter((b) => now < b.until && b.boss.isAlive);
  }

  // --- EUROPE ESCORTS: one convoy implementation for every escort beat ---------

  /** Per-frame (Europe only): keep the convoy run in sync with the active beat. */
  private updateRegionEscort(): void {
    const q = this.chain.activeQuest;
    const hit = this.regionBeatForQuest(q?.id);
    const isEscort = !!q && !!hit && hit.beat.archetype === 'escort';
    const zone = hit ? this.regionSpawnZones.find((z) => z.zoneId === hit.zone.id) : undefined;

    if (this.escort) {
      // Beat changed / chunk left / player died → clean reset (a retry on return).
      if (!isEscort || q?.id !== this.escort.beatId || this.playerDead || !zone?.active) {
        this.despawnRegionEscort();
        return;
      }
      this.driveEscort(this.escort);
      return;
    }
    if (isEscort && zone?.active && !this.playerDead && this.time.now >= this.escortRetryAt) {
      this.spawnRegionEscort(q.id, hit.zone.id, zone);
    }
  }

  /** Spawn the convoy NPC near the player; route = straight east across the chunk. */
  private spawnRegionEscort(beatId: string, zoneId: string, zone: (typeof this.regionSpawnZones)[number]): void {
    MainScene.ensureConvoyTexture(this);
    const map = this.activeMap();
    const spot = map.nearestWalkableWorld(this.player.x + 48, this.player.y - 8);
    const sprite = this.physics.add.sprite(spot.x, spot.y, 'convoy-npc').setDepth(9);
    (sprite.body as Phaser.Physics.Arcade.Body).setSize(22, 18);
    this.physics.add.collider(sprite, map.layer);
    const bar = new HealthBar(this, 44, 6, 9);
    bar.setRatio(1);
    bar.setVisible(true);
    this.uiCamera?.ignore([sprite, ...bar.objects()]);
    // Endpoint: the same southern latitude as the zone arrival, out at the chunk's
    // eastern side — a straight-ish path that never crosses the settlement walls.
    const arrivalY = this.regionZoneArrivals[zoneId]?.y ?? spot.y;
    const end = map.nearestWalkableWorld(zone.center.x + zone.radiusPx * 0.7, arrivalY);
    const fams = getZone(zoneId)?.enemyFamilies ?? [];
    this.escort = {
      beatId,
      zoneId,
      npcSprite: sprite,
      npcHealth: new Health(ESCORT_NPC_HP),
      npcBar: bar,
      start: { x: spot.x, y: spot.y },
      end,
      wavesFired: 0,
      waveAttackers: [],
      hasAmbushers: fams.includes('veil-ambushers'),
    };
    this.showBanner('Escort the convoy east!', 2000);
  }

  /** Per-frame convoy drive: death → retry reset; arrival → beat completes; else
   *  march east, arm the ambusher hook, steer attackers, and fire ambush waves. */
  private driveEscort(e: NonNullable<typeof this.escort>): void {
    // Convoy death: reset the encounter for a clean retry — never a fail state.
    if (e.npcHealth.isDead) {
      this.showBanner('The convoy has fallen — regroup and try again!', 2400);
      this.escortRetryAt = this.time.now + ESCORT_RETRY_MS;
      this.despawnRegionEscort();
      return;
    }
    // Arrival: the beat completes (its factory trigger), the run cleans up.
    const dEnd = Phaser.Math.Distance.Between(e.npcSprite.x, e.npcSprite.y, e.end.x, e.end.y);
    if (dEnd <= ESCORT_ARRIVE_RADIUS) {
      this.showBanner('The convoy arrives!', 2200);
      if (this.chain.activeQuest?.id === e.beatId) {
        const hit = this.regionBeatForQuest(e.beatId);
        if (hit) this.notifyQuest(triggerForBeat(hit.beat) as ObjectiveTrigger);
      }
      this.despawnRegionEscort();
      return;
    }
    // March toward the endpoint (a straight gray-box route).
    const a = Phaser.Math.Angle.Between(e.npcSprite.x, e.npcSprite.y, e.end.x, e.end.y);
    const speed = ESCORT_NPC_TILES_PER_SEC * 32;
    (e.npcSprite.body as Phaser.Physics.Arcade.Body).velocity.set(Math.cos(a) * speed, Math.sin(a) * speed);
    e.npcSprite.setFlipX(Math.cos(a) < 0);
    e.npcBar.setPosition(e.npcSprite.x - 22, e.npcSprite.y - 26);
    e.npcBar.setRatio(e.npcHealth.ratio);

    const convoyPos = { x: e.npcSprite.x, y: e.npcSprite.y };
    // Ambusher zones: ARM the escort-proximity hook (Prompt B's dormant seam) —
    // hidden ambushers along the route reveal as the convoy passes them.
    if (e.hasAmbushers) {
      this.ambusherEscortTarget = convoyPos;
      // Revealed ambushers during an escort hunt the CONVOY, not the player.
      for (const rec of this.regionAmbushers) {
        if (rec.state !== 'burst' || !rec.t.isAlive) continue;
        rec.t.setTarget(convoyPos);
        if (!rec.t.onHitPortal) rec.t.onHitPortal = () => this.convoyHit(ESCORT_WAVE_HIT_DAMAGE);
      }
    }
    // Steer wave attackers at the moving convoy (the portal-defense pattern with
    // a walking "portal": strike it in range, strike the player if intercepted).
    for (const t of e.waveAttackers) if (t.isAlive) t.setTarget(convoyPos);

    // 1–2 ambush waves at route-progress thresholds.
    const total = Phaser.Math.Distance.Between(e.start.x, e.start.y, e.end.x, e.end.y) || 1;
    const progress = Phaser.Math.Clamp(1 - dEnd / total, 0, 1);
    const thresholds = [0.3, 0.65];
    if (e.wavesFired < thresholds.length && progress >= thresholds[e.wavesFired]) {
      e.wavesFired++;
      this.spawnEscortWave(e);
    }
  }

  /** One ambush wave from the ZONE's own families. Melee (townsfolk-kind) families
   *  spawn steered at the convoy; angel-only zones fall back to the pooled spawner
   *  (harassers around the run). Cap-respecting and pooled via regionLive. */
  private spawnEscortWave(e: NonNullable<typeof this.escort>): void {
    const fams = (getZone(e.zoneId)?.enemyFamilies ?? []).filter((f) => f in EXISTING_FAMILY_DOMAIN);
    if (fams.length === 0) return;
    const melee = fams.filter((f) => f === 'corrupted-wildlife' || f === 'evil-raiders' || f === 'hollowed-brutes');
    const fam = melee[(e.wavesFired - 1) % Math.max(1, melee.length)] ?? fams[0];
    let n = fam === 'hollowed-brutes' ? Math.min(ESCORT_WAVE_SIZE, BRUTE_PACK_CAP) : ESCORT_WAVE_SIZE;
    n = Math.min(n, Math.max(0, EUROPE_ENEMY_CAP - this.regionLiveCount()));
    if (n <= 0) return;
    this.showBanner('Ambush!', 1400);
    const map = this.activeMap();
    const tint = DOMAIN_TINT[EXISTING_FAMILY_DOMAIN[fam]];
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spot = map.nearestWalkableWorld(e.npcSprite.x + Math.cos(ang) * 150, e.npcSprite.y + Math.sin(ang) * 150);
      if (melee.includes(fam)) {
        // Direct convoy attackers: townsfolk with the convoy as their (moving) target.
        const variant = fam === 'corrupted-wildlife' ? 'wolf' : fam === 'hollowed-brutes' ? 'brute' : 'raider';
        const t = this.spawnTownsfolk(spot.x, spot.y, { x: e.npcSprite.x, y: e.npcSprite.y }, variant);
        t.sprite.setTint(tint);
        t.onHitPortal = () => this.convoyHit(ESCORT_WAVE_HIT_DAMAGE);
        this.regionLive.push({ zoneId: e.zoneId, family: fam, kind: 'townsfolk', entity: t, counted: false });
        e.waveAttackers.push(t);
      } else {
        // Non-melee families (angel-only zones): pooled harassers around the run.
        this.spawnRegionEnemy(e.zoneId, fam, spot.x, spot.y, tint);
      }
    }
  }

  /** A wave attacker's strike lands on the convoy. */
  private convoyHit(damage: number): void {
    const e = this.escort;
    if (!e || e.npcHealth.isDead) return;
    e.npcHealth.damage(damage);
    this.spawnDamageNumber(e.npcSprite.x, e.npcSprite.y - 24, damage, '#ffb0a0');
    e.npcSprite.setTint(0xff6a5a);
    this.time.delayedCall(90, () => {
      if (this.escort === e) e.npcSprite.clearTint();
    });
    this.lastCombatTime = this.time.now;
  }

  /** WATER BLOCKS (region worlds): cancel movement INTO void water — stepping
   *  off dry ground (or a chunk) toward a water cell stops at the shoreline.
   *  Deliberately one-way: something already OVER water (dev teleports, the
   *  verify void-hops) may walk out. Gates remain the practical travel. */
  private blockVoidWater(): void {
    const ground = this.groundLayers.get(this.activeWorld);
    if (!ground || this.playerDead) return;
    const body = this.player.sprite.body as Phaser.Physics.Arcade.Body;
    if (body.velocity.x === 0 && body.velocity.y === 0) return;
    const map = this.activeMap();
    const overWaterNow = map.terrainAtWorld(this.player.x, this.player.y) === null && ground.isWaterAtWorld(this.player.x, this.player.y);
    if (overWaterNow) return; // walking out is allowed
    const len = Math.hypot(body.velocity.x, body.velocity.y) || 1;
    const nx = this.player.x + (body.velocity.x / len) * 18;
    const ny = this.player.y + (body.velocity.y / len) * 18;
    if (map.terrainAtWorld(nx, ny) === null && ground.isWaterAtWorld(nx, ny)) body.velocity.set(0, 0);
  }

  /** Tear the escort run down (death/arrival/leave/beat change) — clean state. */
  private despawnRegionEscort(): void {
    const e = this.escort;
    if (!e) return;
    this.escort = undefined;
    this.ambusherEscortTarget = null; // the hook returns to dormant between runs
    // Surviving attackers revert to ordinary player-hunting zone enemies.
    for (const t of e.waveAttackers) {
      if (t.isAlive) {
        t.setTarget(null);
        t.onHitPortal = undefined;
      }
    }
    for (const rec of this.regionAmbushers) {
      if (rec.t.isAlive) {
        rec.t.setTarget(null);
        rec.t.onHitPortal = undefined;
      }
    }
    for (const o of e.npcBar.objects()) o.destroy();
    e.npcSprite.destroy();
  }

  /** Gray-box convoy body: a covered wagon (dark outline, tan tarp, two wheels). */
  private static ensureConvoyTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists('convoy-npc')) return;
    const w = 34;
    const h = 28;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x14100c, 1); // outline
    g.fillRoundedRect(2, 6, w - 4, h - 12, 5);
    g.fillStyle(0xd9c28a, 1); // tan tarp
    g.fillRoundedRect(4, 8, w - 8, h - 16, 4);
    g.fillStyle(0x5a3a20, 1); // cart bed
    g.fillRect(4, h - 10, w - 8, 4);
    g.fillStyle(0x14100c, 1); // wheels
    g.fillCircle(9, h - 5, 4.5);
    g.fillCircle(w - 9, h - 5, 4.5);
    g.fillStyle(0x8a6a3a, 1);
    g.fillCircle(9, h - 5, 2);
    g.fillCircle(w - 9, h - 5, 2);
    g.generateTexture('convoy-npc', w, h);
    g.destroy();
  }

  /** quest id → its manifest zone+beat (lazy one-time index over WORLD). */
  private regionBeatForQuest(questId: string | undefined | null): { zone: ManifestZone; beat: QuestBeat } | null {
    if (!questId) return null;
    if (!this.regionBeatIndex) {
      this.regionBeatIndex = new Map();
      for (const z of WORLD) for (const b of z.questChain) this.regionBeatIndex.set(b.id, { zone: z, beat: b });
    }
    return this.regionBeatIndex.get(questId) ?? null;
  }

  /** Kill credit → the ACTIVE europe beat, mirroring the NA arc pattern (count
   *  toward a threshold, live tracker suffix, trigger fires at the goal):
   *  'clear' beats count kills of their enemyFamily (or any zone family when
   *  unset) INSIDE their zone; the eu-10 portal_approach harvest counts
   *  radiant-guardian / lesser-angel kills. */
  private onRegionEnemyKilled(family: string, zoneId: string): void {
    const q = this.chain.activeQuest;
    const hit = this.regionBeatForQuest(q?.id);
    if (!q || !hit || hit.zone.id !== zoneId) return;
    const { beat } = hit;
    let need = 0;
    if (beat.archetype === 'clear') {
      if (beat.enemyFamily && beat.enemyFamily !== family) return;
      need = EUROPE_CLEAR_KILLS;
    } else if (beat.archetype === 'portal_approach' && (family === 'radiant-guardians' || family === 'lesser-angels')) {
      need = EUROPE_HARVEST_KILLS;
    } else {
      return;
    }
    const n = (this.regionKillCounts[beat.id] ?? 0) + 1;
    this.regionKillCounts[beat.id] = n;
    this.refreshQuestUi(); // live "(kills x/y)" suffix, like the NA arc counters
    if (n >= need) this.notifyQuest(triggerForBeat(beat) as ObjectiveTrigger);
  }

  /**
   * HIERARCHICAL ARROW WAYPOINT toward a target in another world, or null when
   * the city hierarchy can't route there (existing cross-world behavior: no
   * arrow). Player inside a city + target elsewhere → the city's EXIT gate; the
   * target inside a city whose parent is the active world → that city's
   * ENTRANCE gate on this map.
   */
  private cityWaypointToward(targetWorld: WorldId): { x: number; y: number; label: string } | null {
    if (targetWorld === this.activeWorld) return null;
    const here = this.cityRuntimes[this.activeWorld];
    if (here) return { x: here.gatePos.x, y: here.gatePos.y, label: `Leave ${here.def.displayName}` };
    const target = this.cityRuntimes[targetWorld];
    if (target && target.def.parentWorld === this.activeWorld) {
      return { x: target.entrancePos.x, y: target.entrancePos.y, label: target.def.displayName };
    }
    return null;
  }

  /** Infernal props: jagged spires (collision) + the distant Satan's Lair marker. */
  private buildHellProps(cx: number, cy: number): void {
    MainScene.ensureHellPropTextures(this);
    const spires: { dx: number; dy: number }[] = [
      { dx: -190, dy: -70 },
      { dx: 200, dy: -50 },
      { dx: -150, dy: 150 },
      { dx: 180, dy: 160 },
      { dx: -60, dy: -200 },
    ];
    for (const s of spires) {
      const img = this.add.image(cx + s.dx, cy + s.dy, 'hell-spire').setDepth(7);
      this.physics.add.existing(img, true);
      this.physics.add.collider(this.player.sprite, img);
    }
    // Satan's Lair — placeholder for the future final-boss site (visual + collision).
    const o = this.hellMap.bounds;
    const lx = o.x + SATAN_LAIR.x;
    const ly = o.y + SATAN_LAIR.y;
    const lair = this.add.image(lx, ly, 'satan-lair').setDepth(7);
    this.physics.add.existing(lair, true);
    this.physics.add.collider(this.player.sprite, lair);
    const glow = this.add.circle(lx, ly + 10, 70, 0xff3b1f, 0.14).setDepth(5);
    this.tweens.add({ targets: glow, scale: 1.3, alpha: 0.05, duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.addHeavenLabel(lx, ly - lair.height / 2 - 6, "☠ Satan's Lair ☠", '#ff6a4a');
  }

  /** Spawn one Demon; wire its melee strike + terrain collider for the given world. */
  private spawnDemon(x: number, y: number, mapLayer: Phaser.Tilemaps.TilemapLayerBase): Demon {
    const d = new Demon(this, x, y);
    d.onMelee = (dmg) => this.enemyMeleeDamage(d.x, d.y, dmg); // a summon it's chasing soaks the blow
    this.physics.add.collider(d.sprite, mapLayer);
    this.uiCamera?.ignore(d.objects());
    this.demons.push(d);
    return d;
  }

  /** Seed the placed Hell demons (positions in hellWorld.ts). */
  private seedHellDemons(): void {
    const o = this.hellMap.bounds;
    for (const s of HELL_DEMON_SPAWNS) this.spawnDemon(o.x + s.x, o.y + s.y, this.hellMap.layer);
  }

  /** Drive every Demon (idle when the player is far/elsewhere), then prune the dead. Demons
   *  are the other BOSS-ADD type — they obey the summon aggro hierarchy via enemyAggroTarget. */
  private updateDemons(): void {
    for (const d of this.demons) {
      if (!this.isActiveWorldResident(d.x)) continue; // world-resident pause: foreign residents don't tick
      const t = this.enemyAggroTarget(d, d.x, d.y);
      d.update(t.x, t.y, this.time.now);
    }
    if (this.demons.some((d) => !d.isAlive)) this.demons = this.demons.filter((d) => d.isAlive);
  }

  private haltDemons(): void {
    for (const d of this.demons) d.halt();
  }

  private onDemonKilled(d: Demon): void {
    this.gainXP(d.xpReward); // enemy data drives the award (no special loot)
  }

  /** Apply damage to every Demon within `range` of (x,y); award XP on kills. */
  private hitDemonsInRange(x: number, y: number, range: number, damage: number, where?: (ex: number, ey: number) => boolean): void {
    for (const d of this.demons) {
      if (!d.isAlive) continue;
      if (d.distanceTo(x, y) <= range + 10 && (!where || where(d.x, d.y))) {
        const dealt = d.takeHit(damage);
        if (dealt > 0) this.dmgDealtAccum += dealt; // lifesteal accounting
        if (dealt > 0) {
          this.spawnDamageNumber(d.x, d.y - 24, dealt, '#ffd0a0');
          this.lastCombatTime = this.time.now;
          if (!d.isAlive) this.onDemonKilled(d);
        }
      }
    }
  }

  /** Remove all Demons (dev reset / teardown). */
  private clearDemons(): void {
    for (const d of this.demons) d.destroy();
    this.demons = [];
  }

  /** Hell-side per-frame logic: entering the return gate transitions back to Heaven. */
  private updateHell(): void {
    if (this.transitioning || this.time.now < this.worldCooldownUntil) return;
    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, this.hellReturnPortalPos.x, this.hellReturnPortalPos.y) <= PORTAL_ENTER_RANGE) {
      this.travelToWorld(WORLD_HEAVEN, this.heavenReturnFromHellPos);
    }
  }

  /** DEV: travel to Hell directly (for testing without the throne sequence). */
  private devGoToHell(): void {
    this.travelToWorld(WORLD_HELL, this.hellArrivalPos);
  }

  /** DEV: spawn a Demon just ahead of the player, in the ACTIVE world. */
  private devSpawnDemon(): void {
    const len = Math.hypot(this.player.facingX, this.player.facingY) || 1;
    const ahead = 160;
    this.spawnDemon(
      this.player.x + (this.player.facingX / len) * ahead,
      this.player.y + (this.player.facingY / len) * ahead,
      this.activeMap().layer,
    );
  }

  /** The benevolent redemption angel (ending): pure white/gold, serene — drawn WHITE
   *  so it reads as radiant light, deliberately unlike the hostile angels. */
  private static ensureRedemptionAngelTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists('redemption-angel')) return;
    const w = 60;
    const h = 84;
    const cx = w / 2;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xffffff, 0.55); // broad serene wings, raised gently
    g.fillTriangle(cx - 6, 34, 2, 10, 10, 54);
    g.fillTriangle(cx + 6, 34, w - 2, 10, w - 10, 54);
    g.fillStyle(0xffffff, 0.85); // inner wings
    g.fillTriangle(cx - 5, 34, 14, 20, 16, 50);
    g.fillTriangle(cx + 5, 34, w - 14, 20, w - 16, 50);
    g.fillStyle(0xffffff, 1); // flowing robe
    g.fillRoundedRect(cx - 9, 28, 18, h - 34, 8);
    g.fillTriangle(cx - 11, h - 4, cx + 11, h - 4, cx, h - 22); // robe hem
    g.fillCircle(cx, 22, 8); // head
    g.lineStyle(3, 0xffffff, 1); // bright halo
    g.strokeCircle(cx, 13, 9);
    g.fillStyle(0xffffff, 0.5); // a soft aura behind
    g.fillCircle(cx, 30, 16);
    g.generateTexture('redemption-angel', w, h);
    g.destroy();
  }

  private static ensureHellPropTextures(scene: Phaser.Scene): void {
    if (!scene.textures.exists('hell-spire')) {
      const g = scene.make.graphics({ x: 0, y: 0 }, false);
      const w = 34;
      const h = 78;
      g.fillStyle(0x140a06, 1); // jagged dark spire
      g.fillTriangle(2, h, w - 2, h, w / 2, 2);
      g.fillStyle(0x2a1810, 1);
      g.fillTriangle(7, h, w - 7, h, w / 2, 12);
      g.fillStyle(0xff5a2a, 0.6); // ember cracks
      g.fillRect(w / 2 - 1, h - 30, 2, 22);
      g.fillRect(w / 2 - 6, h - 14, 2, 10);
      g.fillRect(w / 2 + 4, h - 18, 2, 12);
      g.generateTexture('hell-spire', w, h);
      g.destroy();
    }
    if (!scene.textures.exists('satan-lair')) {
      const g = scene.make.graphics({ x: 0, y: 0 }, false);
      const w = 130;
      const h = 110;
      // A dark, jagged fortress silhouette with a fiery gate — ominous placeholder.
      g.fillStyle(0x0d0705, 1);
      g.fillRect(10, 40, w - 20, h - 40);
      g.fillTriangle(10, 40, 38, 40, 24, 8); // towers
      g.fillTriangle(w - 38, 40, w - 10, 40, w - 24, 8);
      g.fillTriangle(w / 2 - 16, 40, w / 2 + 16, 40, w / 2, 0);
      g.fillStyle(0x1a0f0a, 1);
      g.fillRect(18, 48, w - 36, h - 48);
      g.fillStyle(0xff4a1f, 0.9); // fiery gate
      g.fillRoundedRect(w / 2 - 14, h - 40, 28, 40, 4);
      g.fillStyle(0xffb04a, 0.9);
      g.fillRoundedRect(w / 2 - 7, h - 30, 14, 30, 3);
      g.generateTexture('satan-lair', w, h);
      g.destroy();
    }
  }

  /** A small Heaven world-space label. */

  /**
   * The THRONE set piece (placement, not an enemy): a towering golden throne
   * crowned with a cloud bank — God is NEVER shown. A landmark with collision
   * (walk up to it, not through it). The God's-judgment beat is gated on Michael's
   * defeat (see updateGodJudgment). Edit THRONE_POSITION in heavenWorld.ts to move it.
   */
  private buildThrone(): void {
    const o = this.heavenMap.bounds;
    this.thronePos = { x: o.x + THRONE_POSITION.x, y: o.y + THRONE_POSITION.y };
    const { x, y } = this.thronePos;
    MainScene.ensureThroneTexture(this);
    // Radiant glow behind the throne.
    const glow = this.add.circle(x, y - 10, 70, 0xfff3c4, 0.12).setDepth(5);
    this.tweens.add({ targets: glow, scale: 1.3, alpha: 0.04, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    const throne = this.add.image(x, y, 'heaven-throne').setDepth(7);
    // Collision: a static body so the player walks UP to the throne, not through it.
    this.physics.add.existing(throne, true);
    this.physics.add.collider(this.player.sprite, throne);
    this.addHeavenLabel(x, y - throne.height / 2 - 6, '☁ The Throne ☁', '#fff3c4');
  }

  /** TRIGGER: force the God's-judgment sequence (proximity, after Michael, or dev). */
  private startGodJudgment(): void {
    if (this.judgmentFired || this.judgmentActive) return;
    this.judgmentActive = true;
    this.controls.setEnabled(false);
    this.player.setDirection(0, 0);
    // 1) God speaks from the clouds (never shown). Tap-advance like normal dialogue.
    this.dialogue.open([...GOD_JUDGMENT_LINES], () => this.godJudgmentPowerStrip());
  }

  /** 2) Power-strip beat — God strips the demonic power and grants the holy. */
  private godJudgmentPowerStrip(): void {
    this.spawnPowerStripEffect();
    // === THE POWER SWAP (demonic → holy) ====================================
    // The mechanically-REAL swap: flip the power-state to holy, re-skin the kit
    // golden, and unlock the Holy Bolt. Power LEVEL is intentionally UNCHANGED —
    // we do NOT touch level/XP, maxHP, damage, energy, or the Holy-Power count;
    // only the kit's appearance changes and the Holy Bolt is added. From here the
    // beat proceeds to banishment + the Hell portal exactly as before.
    this.swapToHoly();
    // ========================================================================
    this.dialogue.open([...POWER_STRIP_LINES], () => this.godJudgmentBanish());
  }

  /** 3) Banishment — God casts the player down; the Hell portal opens. */
  private godJudgmentBanish(): void {
    this.dialogue.open([...BANISHMENT_LINES], () => this.godJudgmentComplete());
  }

  private godJudgmentComplete(): void {
    this.spawnHellPortal();
    this.judgmentFired = true;
    this.judgmentActive = false;
    this.reenableControls = true; // resume play; the Hell portal now stands at the throne
    this.notifyQuest('throne-judgment'); // Quest 6 obj 2 → arrow now points to the Hell portal
    // Player-driven: the player walks INTO the portal themselves (no auto-teleport).
    this.showBanner('A portal to Hell tears open at the throne. Step through to descend.', 3600);
    this.autosave(); // meaningful moment: judgment + power-swap done, Hell opened
  }

  /** A draining-light effect rising off the player (narrative power-strip visual). */
  private spawnPowerStripEffect(): void {
    for (let i = 0; i < 10; i++) {
      this.time.delayedCall(i * 70, () => {
        const a = Math.random() * Math.PI * 2;
        const r = 22;
        const mote = this.add
          .circle(this.player.x + Math.cos(a) * r, this.player.y + Math.sin(a) * r, 4, 0xffe9a8, 0.95)
          .setDepth(13);
        this.worldFx.add(mote);
        this.tweens.add({
          targets: mote,
          x: this.thronePos.x,
          y: this.thronePos.y - 30,
          alpha: 0,
          scale: 0.2,
          duration: 700,
          ease: 'Quad.in',
          onComplete: () => mote.destroy(),
        });
      });
    }
    this.player.flash();
  }

  // --- THE POWER SWAP: demonic → holy ---------------------------------------

  /**
   * Perform the swap to HOLY: flip the (serializable) power-state, re-skin the
   * kit golden (a player aura + a radiant flash), and unlock the Holy Bolt. This
   * is the mechanically-real half of God's judgment. POWER LEVEL IS UNCHANGED —
   * nothing here touches level/XP, maxHP, damage, energy, or the Holy-Power count.
   * Idempotent: calling it while already holy just re-asserts the holy visuals.
   */
  private swapToHoly(): void {
    this.power.swapToHoly();
    this.holyBoltButton.setVisible(true); // the new ability appears
    this.refreshHolyPowerUi(); // the Holy Power counter now reveals (holy endgame)
    this.ensureHolyAura();
    // A radiant burst + golden flash so the transformation reads clearly.
    this.player.levelUpFlash();
    const ring = this.add.circle(this.player.x, this.player.y, 24, HOLY_TINT, 0).setStrokeStyle(5, HOLY_TINT, 0.95).setDepth(13);
    this.worldFx.add(ring);
    this.tweens.add({ targets: ring, scale: 4, alpha: 0, duration: 700, ease: 'Quad.out', onComplete: () => ring.destroy() });
  }

  /** Revert to the DEMONIC default (dev tool + dev reset): hide the Holy Bolt,
   *  drop the aura, restore the pre-swap appearance. */
  private revertToDemonic(): void {
    this.power.reset();
    this.holyBoltButton.setVisible(false);
    this.refreshHolyPowerUi(); // hide the Holy Power counter (back to demonic)
    this.holyAura?.destroy();
    this.holyAura = undefined;
  }

  /** Create the subtle golden aura that trails the holy player (once). */
  private ensureHolyAura(): void {
    if (this.holyAura) return;
    this.holyAura = this.add.circle(this.player.x, this.player.y, 22, HOLY_TINT, 0.16).setDepth(9);
    this.worldFx.add(this.holyAura);
    this.uiCamera?.ignore(this.holyAura); // world object: keep it off the UI camera
    this.tweens.add({ targets: this.holyAura, alpha: 0.28, scale: 1.18, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  }

  /** Holy Bolt damage reuses the level-derived growth (base + the per-level slope). */
  private holyBoltDamage(): number {
    return PLAYER_HOLY_BOLT_DAMAGE + (this.progression.level - 1) * DMG_PER_LEVEL;
  }

  /**
   * Fire a HOLY BOLT in the facing direction (holy-only). Gated by a small energy
   * cost + a short cooldown; reuses the projectile system as the PLAYER faction so
   * it damages enemies, is stopped by terrain, and despawns at max range.
   */
  private tryHolyBolt(): void {
    if (!this.power.isHoly) return; // the player has no Holy Bolt as a demon
    if (this.playerDead || this.dialogue.isOpen() || this.choice.isOpen()) return;
    if (this.time.now < this.holyBoltCooldownUntil) return;
    if (this.energy.current < PLAYER_HOLY_BOLT_ENERGY_COST) return; // button shows disabled

    this.energy.damage(PLAYER_HOLY_BOLT_ENERGY_COST);
    this.lastEnergySpendTime = this.time.now;
    this.holyBoltCooldownUntil = this.time.now + PLAYER_HOLY_BOLT_COOLDOWN_MS;

    const len = Math.hypot(this.player.facingX, this.player.facingY) || 1;
    const dx = this.player.facingX / len;
    const dy = this.player.facingY / len;
    this.projectiles.spawn({
      x: this.player.x + dx * 18,
      y: this.player.y + dy * 18,
      dirX: dx,
      dirY: dy,
      speed: PLAYER_HOLY_BOLT_SPEED,
      damage: this.holyBoltDamage(),
      maxRange: PLAYER_HOLY_BOLT_RANGE,
      faction: 'player',
      color: HOLY_BOLT_COLOR,
      radius: PLAYER_HOLY_BOLT_RADIUS,
    });
    this.lastCombatTime = this.time.now;
    this.notifyBossesPlayerAction('ranged'); // Envy's MIRROR may answer with a return volley
  }

  /**
   * Resolve a player Holy Bolt against the enemies (called by the projectile
   * system each step). Damages the FIRST enemy within (x,y,radius), reusing the
   * existing per-enemy kill handlers; returns true so the bolt impacts/despawns.
   */
  private resolveHolyBoltHit(x: number, y: number, radius: number, damage: number, hitSet?: Set<object>): boolean {
    // `hit` also enforces pierce dedup: an enemy already in hitSet is skipped so a
    // piercing bolt (Icicle) passes THROUGH it and on to the next enemy.
    const hit = (e: object & { x: number; y: number }, bodyR: number): boolean =>
      !hitSet?.has(e) && Phaser.Math.Distance.Between(x, y, e.x, e.y) <= radius + bodyR;

    if (this.sasquatch.isAlive && hit(this.sasquatch, 18)) {
      hitSet?.add(this.sasquatch);
      const dealt = this.sasquatch.takeHit(damage);
      if (dealt > 0) this.dmgDealtAccum += dealt; // lifesteal accounting
      this.spawnDamageNumber(this.sasquatch.x, this.sasquatch.y - 24, dealt, '#fff0b0');
      this.lastCombatTime = this.time.now;
      if (!this.sasquatch.isAlive) {
        this.showBanner('Sasquatch defeated', 1600);
        this.notifyQuest('sasquatch-defeated');
        this.gainXP(this.sasquatch.xpReward);
      }
      return true;
    }
    if (this.swarmersRevealed) {
      for (const s of this.swarmers) {
        if (s.isAlive && hit(s, 8)) {
          hitSet?.add(s);
          const dealt = s.takeHit(damage);
          if (dealt > 0) this.dmgDealtAccum += dealt; // lifesteal accounting
          if (dealt > 0) {
            this.spawnDamageNumber(s.x, s.y - 16, dealt, '#fff0b0');
            this.lastCombatTime = this.time.now;
            if (!s.isAlive) this.onSwarmerKilled(s);
          }
          return true;
        }
      }
    }
    for (const a of this.angels) {
      if (a.isAlive && hit(a, 12)) {
        hitSet?.add(a);
        const dealt = a.takeHit(damage);
        if (dealt > 0) this.dmgDealtAccum += dealt; // lifesteal accounting
        if (dealt > 0) {
          this.spawnDamageNumber(a.x, a.y - 28 * a.variant.scale, dealt, '#fff0b0');
          this.lastCombatTime = this.time.now;
          if (!a.isAlive) this.onAngelKilled(a);
        }
        return true;
      }
    }
    for (const t of this.townsfolk) {
      if (t.isAlive && hit(t, 10)) {
        hitSet?.add(t);
        const dealt = t.takeHit(damage);
        if (dealt > 0) this.dmgDealtAccum += dealt; // lifesteal accounting
        if (dealt > 0) {
          this.spawnDamageNumber(t.x, t.y - 20, dealt, '#fff0b0');
          this.lastCombatTime = this.time.now;
          if (!t.isAlive) this.onTownsfolkKilled(t);
        }
        return true;
      }
    }
    for (const g of this.guardians) {
      if (g.isAlive && hit(g, 12)) {
        hitSet?.add(g);
        const dealt = g.takeHit(damage);
        if (dealt > 0) this.dmgDealtAccum += dealt; // lifesteal accounting
        if (dealt > 0) {
          this.spawnDamageNumber(g.x, g.y - 26, dealt, '#fff0b0');
          this.lastCombatTime = this.time.now;
          if (!g.isAlive) this.onGuardianKilled(g);
        }
        return true;
      }
    }
    for (const c of this.cherubs) {
      if (c.isAlive && hit(c, 16)) {
        hitSet?.add(c);
        const dealt = c.takeHit(damage);
        if (dealt > 0) this.dmgDealtAccum += dealt; // lifesteal accounting
        if (dealt > 0) {
          this.spawnDamageNumber(c.x, c.y - 30 * c.variant.scale, dealt, '#fff0b0');
          this.lastCombatTime = this.time.now;
          if (!c.isAlive) this.onCherubKilled(c);
        }
        return true;
      }
    }
    for (const d of this.demons) {
      if (d.isAlive && hit(d, 12)) {
        hitSet?.add(d);
        const dealt = d.takeHit(damage);
        if (dealt > 0) this.dmgDealtAccum += dealt; // lifesteal accounting
        if (dealt > 0) {
          this.spawnDamageNumber(d.x, d.y - 24, dealt, '#fff0b0');
          this.lastCombatTime = this.time.now;
          if (!d.isAlive) this.onDemonKilled(d);
        }
        return true;
      }
    }
    for (const b of this.bosses) {
      if (b.isAlive && hit(b, 24)) {
        hitSet?.add(b);
        const dealt = b.takeHit(damage);
        if (dealt > 0) this.dmgDealtAccum += dealt; // lifesteal accounting
        if (dealt > 0) {
          this.spawnDamageNumber(b.x, b.y - 40, dealt, '#fff0b0');
          this.lastCombatTime = this.time.now;
        }
        return true;
      }
    }
    return false;
  }

  /** Spawn the Hell portal just south of the throne (where the player approached). */
  private spawnHellPortal(): void {
    if (this.hellPortal) return;
    this.hellPortal = new HellPortal(this, this.thronePos.x, this.thronePos.y + 160);
    this.uiCamera?.ignore(this.hellPortal.objects());
    this.hellPortalArmed = false; // require a deliberate walk-in (step clear, then enter)
  }

  /** Gate + drive the God's-judgment beat each frame (Heaven only). */
  private updateGodJudgment(): void {
    if (this.activeWorld !== WORLD_HEAVEN) return;
    // Proximity trigger: after Michael falls, approaching the throne fires it once.
    if (this.michaelDefeated && !this.judgmentFired && !this.judgmentActive) {
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, this.thronePos.x, this.thronePos.y) <= 220) {
        this.startGodJudgment();
      }
    }
    // Entering the Hell portal → REAL transition down to the Hell world. The portal
    // is a deliberate WALK-IN: it only accepts the player once they've stepped clear
    // of it after it opens (so it never auto-pulls them in on the frame it spawns,
    // which would feel like a teleport when they approached the throne from the south).
    if (this.hellPortal && !this.transitioning && this.time.now >= this.worldCooldownUntil) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.hellPortal.x, this.hellPortal.y);
      if (!this.hellPortalArmed) {
        if (d > PORTAL_ENTER_RANGE + 40) this.hellPortalArmed = true; // stepped clear → now armed
      } else if (d <= PORTAL_ENTER_RANGE) {
        this.travelToWorld(WORLD_HELL, this.hellArrivalPos);
      }
    }
  }

  /** RESET: judgment un-fired, Hell portal removed, gate re-locked (replay the beat). */
  private resetGodJudgment(): void {
    this.michaelDefeated = false;
    this.judgmentFired = false;
    this.judgmentActive = false;
    this.hellPortal?.destroy();
    this.hellPortal = undefined;
    this.hellPortalArmed = false;
  }

  /** DEV: force the judgment sequence regardless of whether Michael is dead. */
  private devTriggerGodJudgment(): void {
    this.cancelDash();
    this.michaelDefeated = true; // satisfy the gate for testing
    this.judgmentFired = false;
    this.judgmentActive = false;
    const near = { x: this.thronePos.x, y: this.thronePos.y + 180 }; // within the 220px trigger
    if (this.activeWorld !== WORLD_HEAVEN) {
      // Travel to Heaven; arriving within range, the proximity trigger fires it.
      this.travelToWorld(WORLD_HEAVEN, near);
    } else {
      this.player.sprite.setPosition(near.x, near.y);
      this.player.setDirection(0, 0);
      this.startGodJudgment();
    }
  }

  private static ensureThroneTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists('heaven-throne')) return;
    const w = 104;
    const h = 184;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    const cx = w / 2;
    // Stepped base.
    g.fillStyle(0xc9a23a, 1);
    g.fillRect(8, h - 18, w - 16, 18);
    g.fillRect(18, h - 34, w - 36, 16);
    // Throne body: seat + tall back + armrests, gold with a darker outline.
    g.fillStyle(0x6e561c, 1);
    g.fillRoundedRect(24, 52, w - 48, h - 78, 6); // back outline
    g.fillStyle(0xe7c558, 1);
    g.fillRoundedRect(28, 56, w - 56, h - 86, 5); // back
    g.fillStyle(0xc9a23a, 1);
    g.fillRect(20, h - 70, w - 40, 22); // seat
    g.fillRect(16, h - 86, 12, 38); // left armrest
    g.fillRect(w - 28, h - 86, 12, 38); // right armrest
    // Jewel.
    g.fillStyle(0xfff3c4, 1);
    g.fillCircle(cx, h - 96, 5);
    // CLOUD BANK crowning the top (God is implied, never shown).
    g.fillStyle(0xffffff, 0.5);
    for (let i = 0; i < 7; i++) g.fillCircle(14 + i * 13, 34, 18);
    g.fillStyle(0xffffff, 0.85);
    for (let i = 0; i < 6; i++) g.fillCircle(20 + i * 13, 26, 15);
    g.fillStyle(0xffffff, 1);
    for (let i = 0; i < 5; i++) g.fillCircle(26 + i * 13, 20, 12);
    g.generateTexture('heaven-throne', w, h);
    g.destroy();
  }

  /** A small Heaven world-space label. */
  private addHeavenLabel(x: number, y: number, text: string, color: string): void {
    this.add
      .text(x, y, text, { fontFamily: 'system-ui, sans-serif', fontSize: '12px', color, fontStyle: 'bold' })
      .setOrigin(0.5, 1)
      .setStroke('#101830', 4)
      .setDepth(8);
  }

  /** Pillars + a shrine around the Heaven arrival, with static collision. */
  private buildHeavenProps(cx: number, cy: number): void {
    MainScene.ensureHeavenPropTextures(this);
    const props: { dx: number; dy: number; key: string }[] = [
      { dx: -170, dy: -60, key: 'heaven-pillar' },
      { dx: 170, dy: -60, key: 'heaven-pillar' },
      { dx: -210, dy: 130, key: 'heaven-pillar' },
      { dx: 210, dy: 130, key: 'heaven-pillar' },
      { dx: -90, dy: -150, key: 'heaven-pillar' },
      { dx: 90, dy: -150, key: 'heaven-pillar' },
      { dx: 0, dy: -210, key: 'heaven-shrine' }, // a small structure to walk around
    ];
    for (const p of props) {
      const img = this.add.image(cx + p.dx, cy + p.dy, p.key).setDepth(7);
      this.physics.add.existing(img, true); // static body matching the sprite
      this.physics.add.collider(this.player.sprite, img);
    }
  }

  /** The "Enter Heaven" button's action: cross the CORRUPTED Holy-Outpost portal.
   *  Self-gates (phase / proximity / transition / dialogue) so a stale tap is safe. */
  private enterHeavenPortal(): void {
    if (this.transitioning || this.time.now < this.worldCooldownUntil) return;
    if (this.guardianPhase !== 'corrupted') return; // only the corrupted portal transports
    if (this.dialogue.isOpen()) return; // let a narration (4.9's pour-the-Light beat) finish first
    const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.heavenPortal.x, this.heavenPortal.y);
    if (d > PORTAL_CORRUPT_RANGE) return; // must still be standing at the portal
    this.enterHeavenButton.setVisible(false);
    this.travelToWorld(WORLD_HEAVEN, this.heavenArrivalPos);
  }

  /** The "Return to Earth" button's action: cross back through the Heaven-side gate. */
  private returnToEarthPortal(): void {
    if (this.transitioning || this.time.now < this.worldCooldownUntil) return;
    if (this.activeWorld !== WORLD_HEAVEN) return;
    const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.heavenReturnPortalPos.x, this.heavenReturnPortalPos.y);
    if (d > PORTAL_CORRUPT_RANGE) return;
    this.returnEarthButton.setVisible(false);
    this.travelToWorld(WORLD_EARTH, this.earthReturnPos);
  }

  /** Heaven-side per-frame logic: the return gate crosses by BUTTON (same slot as
   *  Talk — the Talk prompt wins if Azazel is nearer, so the two never stack). */
  private updateHeaven(): void {
    if (this.transitioning || this.time.now < this.worldCooldownUntil) {
      this.returnEarthButton.setVisible(false);
      return;
    }
    const d = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      this.heavenReturnPortalPos.x,
      this.heavenReturnPortalPos.y,
    );
    this.returnEarthButton.setVisible(
      d <= PORTAL_CORRUPT_RANGE && !this.dialogue.isOpen() && !this.talkButton.isVisible,
    );
  }

  /**
   * THE reusable world-travel function: fade out, swap the active world (bounds,
   * collider, zoom, player placement), then fade back in. `arrival` overrides the
   * world's remembered position (the portals pass explicit arrival points).
   */
  private travelToWorld(worldId: WorldId, arrival?: { x: number; y: number }, durationMs = WORLD_TRANSITION_MS): void {
    if (this.transitioning) return;
    const target = this.worlds[worldId];
    if (!target) return;
    const dest = arrival ?? this.worldPos[worldId] ?? target.defaultArrival;

    this.transitioning = true;
    this.cancelDash();
    this.controls.setEnabled(false);
    this.player.setDirection(0, 0);

    const half = durationMs / 2;
    this.fadeOverlay.setVisible(true).setAlpha(0);
    this.tweens.add({
      targets: this.fadeOverlay,
      alpha: 1,
      duration: half,
      ease: 'Quad.in',
      onComplete: () => {
        this.applyWorldSwap(worldId, dest);
        this.tweens.add({
          targets: this.fadeOverlay,
          alpha: 0,
          duration: half,
          ease: 'Quad.out',
          onComplete: () => {
            this.fadeOverlay.setVisible(false);
            this.transitioning = false;
            this.worldCooldownUntil = this.time.now + WORLD_TRANSITION_COOLDOWN_MS;
            if (!this.playerDead) this.controls.setEnabled(true);
            // Quest hooks off the EXISTING transition: arriving in Heaven completes
            // Quest 5's last objective (and auto-starts Quest 6); arriving in Hell
            // completes Quest 6's last objective. No-ops if not the active objective.
            if (worldId === WORLD_HEAVEN) this.notifyQuest('entered-heaven');
            else if (worldId === WORLD_HELL) this.notifyQuest('entered-hell');
            this.autosave(); // meaningful moment: a world transition completed
          },
        });
      },
    });
  }

  /** Core, instant world swap (used by travelToWorld at the fade midpoint + dev reset). */
  private applyWorldSwap(worldId: WorldId, dest: { x: number; y: number }): void {
    // Remember where we're leaving so a later return lands there by default.
    this.worldPos[this.activeWorld] = { x: this.player.x, y: this.player.y };

    // Allied summons + ground effects don't travel between worlds — clear on every change.
    this.summons.clear();
    this.clearSpellHazards();
    this.clearFriendlyZones();
    this.clearEntangle();
    this.crystallize.clear();
    this.confused.clear();
    this.comboUltimate = null;
    this.voodoo = null; // WD bind state never survives a reset (summons are cleared too)
    this.allyBond = null;
    this.spiritSplit = null;
    this.parry = null; // Samurai timing state never survives a reset
    this.perfectFormUntil = 0;
    this.iaijutsu = null;
    this.pulseRing = null; // Monk state never survives a reset either
    this.actionWhiffed = false;
    this.empoweredStrikes = null;
    this.clearTraps(); // Assassin state never survives a reset either
    this.clearPriestState(); // nor the Priest's
    this.breakPlayerStealth();
    this.clearDots();

    // WORLD-RESIDENT PAUSE: resume the destination's residents, pause everyone
    // else (bodies here; update ticks via isActiveWorldResident in each loop).
    // One rule on every swap — dev travel and city enter/leave included.
    this.applyResidentPause(worldId);

    // A region world's chunk packs never travel: leaving it despawns them all.
    if (this.regionWorldIds.has(this.activeWorld) && worldId !== this.activeWorld) this.deactivateAllRegionZones();

    this.activeWorld = worldId;
    const w = this.worlds[worldId];

    // Only the active world's terrain collider is live. Sparse region worlds
    // have one collider PER CHUNK — each follows its OWN world's active state.
    for (const id of Object.keys(this.worlds)) {
      const c = this.worlds[id].collider;
      if (c) c.active = id === worldId;
    }
    for (const rc of this.regionColliders) rc.c.active = worldId === rc.worldId;

    // Bounds, camera, zoom all re-pointed at the active world.
    const b = w.map.bounds;
    this.physics.world.setBounds(b.x, b.y, b.width, b.height);
    this.cameras.main.setBounds(b.x, b.y, b.width, b.height);
    // Re-anchor a destination that falls OUTSIDE this world (e.g. a save's remembered
    // Heaven/Hell position from before the map widened, which shifted those worlds
    // east) to the world's default arrival, so the player never lands off-map.
    const inBounds = dest.x >= b.x && dest.x <= b.x + b.width && dest.y >= b.y && dest.y <= b.y + b.height;
    if (!inBounds) dest = { ...w.defaultArrival };
    this.player.sprite.setPosition(dest.x, dest.y);
    this.player.setDirection(0, 0);
    this.cameras.main.centerOn(dest.x, dest.y);
    this.zoomControls.setMapSize(b.width, b.height); // re-derive zoom-out from THIS map

    // Drop any in-flight Earth bolts; clear the contextual portal/talk prompts.
    this.projectiles.clear();
    this.talkButton.setVisible(false);
    this.corruptButton.setVisible(false);
    this.enterHeavenButton.setVisible(false);
    this.returnEarthButton.setVisible(false);
    this.cityGateButton.setVisible(false);
  }

  /**
   * CLASS-START (Casey's ruling): every NEW character spawns in their class's home
   * city, resolved from DATA so all 14 classes inherit it automatically as they ship:
   *   classId → canon manifest name → the manifest zone whose homeClass matches →
   *   that zone's world (PREBUILT_ZONE_WORLD ?? its continent's region world) →
   *   a walkable spot BESIDE that zone's mentor (Cairo: the Keeper).
   * Earth-homed classes (the Druid: Seattle → North America → 'earth') keep the
   * SHIPPED WA start untouched, and the home openers stay MANUAL — the spawn just
   * puts you next to the mentor. Runs through applyWorldSwap so residency pausing,
   * the ground layer and chunk activation behave exactly like normal travel. NEW
   * characters only — 'continue' restores the save's world/position instead.
   */
  private applyClassHomeStart(): void {
    const zone = homeZoneForClass(this.classId);
    if (!zone) return; // no canon home in the manifest → the default start
    const worldId = (PREBUILT_ZONE_WORLD[zone.id] ?? CONTINENT_WORLD[zone.continent]) as WorldId;
    if (!worldId || worldId === WORLD_EARTH || !this.worlds[worldId]) return; // Earth homes = the shipped WA start, unchanged
    const mentor = worldId === WORLD_EGYPT ? this.cairoMentorPos : this.regionMentors.find((m) => m.zoneId === zone.id)?.pos;
    const base = mentor ?? this.regionZoneArrivals[zone.id] ?? this.worlds[worldId].defaultArrival;
    const dest = this.worlds[worldId].map.nearestWalkableWorld(base.x, base.y + 70); // beside the mentor, not on top
    this.applyWorldSwap(worldId, dest);
  }

  /** Disable every currently-live Earth enemy body; remember them for resume. */
  // --- WORLD-RESIDENT PAUSE ----------------------------------------------------
  //
  // ONE rule, applied on every applyWorldSwap path (dev travel included): an
  // enemy RESIDES in the world whose X-band contains it (worlds chain east in
  // one shared coordinate space, so X alone identifies residency). Residents of
  // any world other than the active one are fully paused — physics body off
  // (here) and no update tick (each update loop gates per entity through
  // isActiveWorldResident) — and resume when the player enters their world.
  // This REPLACES the old Earth-only pause bolt-on, and covers the latent case
  // of the angel/townsfolk arrays ticking in any terrestrial world.

  /** X-band per registered world. Built lazily; rebuilt if a world registers late. */
  private worldBandsCache: { id: WorldId; x0: number; x1: number }[] = [];
  private worldBands(): { id: WorldId; x0: number; x1: number }[] {
    const ids = Object.keys(this.worlds);
    if (this.worldBandsCache.length !== ids.length) {
      this.worldBandsCache = ids.map((id) => {
        const b = this.worlds[id].map.bounds;
        return { id, x0: b.x, x1: b.x + b.width };
      });
    }
    return this.worldBandsCache;
  }

  /** The world whose X-band contains x, or null in a gap between worlds. */
  private worldAtX(x: number): WorldId | null {
    for (const b of this.worldBands()) if (x >= b.x0 && x <= b.x1) return b.id;
    return null;
  }

  /** THE TICK GATE: true when x lies in the ACTIVE world's band. Unattributable
   *  positions (the void gaps) count as local — never strand an entity. */
  private isActiveWorldResident(x: number): boolean {
    const home = this.worldAtX(x);
    return home === null || home === this.activeWorld;
  }

  /** Body half of the pause: disable every live foreign resident's body; resume
   *  exactly what THIS rule disabled before (never a body another system owns —
   *  a hidden ambusher, a stun freeze, a corpse — those stay untouched). */
  private applyResidentPause(active: WorldId): void {
    for (const b of this.pausedBodies) {
      const go = b.gameObject as Phaser.GameObjects.GameObject | undefined;
      if (go && go.active) b.enable = true;
    }
    this.pausedBodies = [];
    const residents = [
      this.sasquatch,
      ...this.swarmers,
      ...this.angels,
      ...this.townsfolk,
      ...this.guardians,
      ...this.cherubs,
      ...this.demons,
      ...this.bosses,
    ];
    for (const e of residents) {
      if (!e || !e.isAlive) continue;
      const body = e.sprite.body as Phaser.Physics.Arcade.Body | undefined;
      if (!body || !body.enable) continue; // already disabled — not ours to manage
      const home = this.worldAtX(e.sprite.x);
      if (home !== null && home !== active) {
        body.enable = false;
        this.pausedBodies.push(body);
      }
    }
  }

  /** Full-screen fade rectangle for transitions (UI partition → covers HUD too). */
  private createFadeOverlay(): void {
    this.fadeOverlay = this.add
      .rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height, 0x05070d, 1)
      .setScrollFactor(0)
      .setDepth(6000)
      .setAlpha(0)
      .setVisible(false);
    const layout = (): void => {
      this.fadeOverlay.setPosition(this.scale.width / 2, this.scale.height / 2).setSize(this.scale.width, this.scale.height);
    };
    this.scale.on(Phaser.Scale.Events.RESIZE, layout);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, layout)); // never leak across scene restarts
  }

  // --- DEV: world travel ---
  private devGoToHeaven(): void {
    this.travelToWorld(WORLD_HEAVEN, this.heavenArrivalPos);
  }
  private devReturnToEarth(): void {
    this.travelToWorld(WORLD_EARTH, this.earthReturnPos);
  }
  private devToggleWorld(): void {
    this.travelToWorld(this.activeWorld === WORLD_EARTH ? WORLD_HEAVEN : WORLD_EARTH);
  }
  /** DEV: travel to Egypt's Faiyum arrival (works from anywhere — including
   *  elsewhere IN Egypt; the same fade just repositions the player). */
  private devTravelEgypt(): void {
    this.travelToWorld(WORLD_EGYPT, this.egyptArrivalPos);
  }
  /** DEV: travel to Earth, landing at Enumclaw (Earth's default arrival — distinct
   *  from devReturnToEarth, which lands at the Idaho Heaven-portal return spot). */
  private devTravelEarth(): void {
    if (this.activeWorld !== WORLD_EARTH) this.travelToWorld(WORLD_EARTH, this.worlds[WORLD_EARTH].defaultArrival);
  }
  /** DEV: travel to Rome — the globe world's default arrival (same entry as
   *  before the consolidation; Rome now sits at its true planet position). */
  private devTravelEurope(): void {
    const w = this.worlds[WORLD_GLOBE];
    if (w) this.travelToWorld(WORLD_GLOBE, w.defaultArrival);
  }

  /** DEV: travel to the Mount Sinai approach valley (Egypt's south-east Sinai). */
  private devTravelMtSinai(): void {
    const city = this.egyptMap.cities.find((c) => c.name.startsWith('Mount Sinai'));
    if (!city) return;
    // Land a little up the approach valley (north-west of the site) so the walk
    // IN passes the stone ring; snap to walkable in case of rock.
    const p = this.egyptMap.tileToWorldCenter(city.tx - 6, city.ty - 6);
    const dest = this.egyptMap.nearestWalkableWorld(p.x, p.y, 14);
    this.travelToWorld(WORLD_EGYPT, dest);
  }
  /** DEV "Test City Arrow": cycle the fake objective — OFF → the MILL inside the
   *  Faiyum village → a desert spot OUTSIDE it → OFF. Exercises the hierarchical
   *  gate waypoints without a real Egypt quest. */
  private devCycleCityArrowTest(): void {
    const fai = this.cityRuntimes[CITY_FAIYUM];
    if (!fai) return;
    this.devArrowState = (this.devArrowState + 1) % 3;
    if (this.devArrowState === 1) {
      const mill = fai.map.cities.find((c) => c.name === 'The Mill');
      const p = mill ? fai.map.tileToWorldCenter(mill.tx, mill.ty + 4) : fai.insideArrival;
      this.devArrowTarget = { world: fai.def.id, x: p.x, y: p.y, label: 'DEV: The Mill' };
      this.showBanner('City-arrow test 1/2: target = THE MILL (inside the village)', 2200);
    } else if (this.devArrowState === 2) {
      // A spot out in the desert, well outside the village walls.
      const p = { x: fai.entrancePos.x + 900, y: fai.entrancePos.y - 500 };
      this.devArrowTarget = { world: fai.def.parentWorld, x: p.x, y: p.y, label: 'DEV: Desert spot' };
      this.showBanner('City-arrow test 2/2: target = a spot OUTSIDE the village', 2200);
    } else {
      this.devArrowTarget = null;
      this.showBanner('City-arrow test OFF', 1400);
    }
  }

  private static ensureHeavenPropTextures(scene: Phaser.Scene): void {
    if (!scene.textures.exists('heaven-pillar')) {
      const g = scene.make.graphics({ x: 0, y: 0 }, false);
      const w = 26;
      const h = 72;
      g.fillStyle(0xd9cfa8, 1); // base
      g.fillRect(2, h - 10, w - 4, 10);
      g.fillStyle(0xefe8cf, 1); // shaft
      g.fillRect(6, 8, w - 12, h - 18);
      g.fillStyle(0xffffff, 0.5); // flutes
      for (let fx = 8; fx < w - 8; fx += 4) g.fillRect(fx, 10, 1, h - 22);
      g.fillStyle(0xe6dcbe, 1); // capital
      g.fillRect(2, 2, w - 4, 10);
      g.generateTexture('heaven-pillar', w, h);
      g.destroy();
    }
    if (!scene.textures.exists('heaven-shrine')) {
      const g = scene.make.graphics({ x: 0, y: 0 }, false);
      const w = 110;
      const h = 70;
      g.fillStyle(0xe9e1c6, 1); // stepped platform
      g.fillRect(0, h - 16, w, 16);
      g.fillRect(8, h - 28, w - 16, 12);
      g.fillStyle(0xf3eed8, 1); // back wall
      g.fillRect(16, 8, w - 32, h - 30);
      g.fillStyle(0xd9cfa8, 1); // corner pillars
      g.fillRect(14, 6, 10, h - 22);
      g.fillRect(w - 24, 6, 10, h - 22);
      g.fillStyle(0xc9bd95, 1); // pediment
      g.fillTriangle(8, 10, w - 8, 10, w / 2, -8);
      g.generateTexture('heaven-shrine', w, h);
      g.destroy();
    }
  }

  // --- The Descent arc (quests 1–4) -----------------------------------------

  /** A pulsing violet landmark + label for the Dark Outpost hub. */
  private addOutpostMarker(): void {
    const { x, y } = DARK_OUTPOST_POSITION;
    const ring = this.add.circle(x, y, 16, 0x8a2be2, 0.35).setDepth(6);
    this.tweens.add({ targets: ring, scale: 1.9, alpha: 0.05, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    const diamond = this.add.rectangle(x, y, 16, 16, 0x6a1fb0, 0.95).setStrokeStyle(2, 0xc06cff, 1).setAngle(45).setDepth(7);
    this.add
      .text(x, y - 22, 'Dark Outpost', { fontFamily: 'system-ui, sans-serif', fontSize: '11px', color: '#d6a8ff' })
      .setOrigin(0.5, 1)
      .setStroke('#160b22', 4)
      .setDepth(7);
    void diamond;
  }

  /** True if `id` is an arc quest (Act I/II, Investigation, or descent) using the per-objective watcher. */
  private isArcQuest(id?: string): boolean {
    return (
      id !== undefined &&
      (this.ACT1_IDS.has(id) || this.ACT2_IDS.has(id) || this.INV_IDS.has(id) || this.ACTIV_IDS.has(id))
    );
  }

  /** True while an arc quest (Act I or descent) is the active quest. */
  private isArcActive(): boolean {
    return this.isArcQuest(this.chain.activeQuest?.id);
  }

  /** Set up the world for the active arc objective (spawn enemies / pickup, pick the watcher). */
  private beginArcObjective(): void {
    this.clearArcObjective(); // clear any leftover arc spawns first
    const trig = this.chain.activeTrigger;
    switch (trig) {
      // --- Act I (Enumclaw opening) ---
      case 'pump-delivered':
        // Delivery is handled by Della (the Olympia recipient NPC) on talk; nothing to spawn.
        this.arcMode = 'none';
        break;
      case 'wolves-defeated':
        this.spawnArcTownsfolk('wolf', TREE_LINE_POSITION, WOLVES_COUNT);
        this.arcMode = 'defeat';
        break;
      case 'sealion-defeated':
        this.spawnArcTownsfolk('sealion', TACOMA_BEACH_POSITION, 1);
        this.arcMode = 'defeat';
        break;
      case 'raiders-defeated':
        this.spawnArcTownsfolk('raider', SNOQUALMIE_PASS_POSITION, RAIDERS_COUNT);
        this.arcMode = 'defeat';
        break;
      // --- Act II (corruption escalation) ---
      case 'dogs-defeated':
        this.spawnArcTownsfolk('dog', PELLS_FARM_POSITION, DOGS_COUNT);
        this.arcMode = 'defeat';
        break;
      case 'grove-burned':
        // No enemies — a "Burn the Grove" proximity-action button appears near the grove.
        this.beginArcAction({ ...CORRUPTED_GROVE_POSITION }, 'Burn the Grove');
        break;
      case 'whitepass-demons-defeated':
        this.spawnArcDemons(WHITEPASS_FARM_POSITION, WHITEPASS_DEMONS_COUNT);
        this.arcMode = 'defeat';
        break;
      // --- The Investigation arc (Quests 8–12) ---
      case 'yakima-defended':
        this.spawnArcDemons(YAKIMA_POSITION, YAKIMA_DEMONS_COUNT);
        this.arcMode = 'defeat';
        break;
      case 'shipment-delivered':
        // Escort to Lake Chelan with three en-route ambushes (reach to complete).
        this.arcMode = 'reach';
        this.arcReach = { ...LAKE_CHELAN_POSITION };
        this.arcAmbushes = Q9_AMBUSHES.map((p, i) => ({ x: p.x, y: p.y, lines: [Q9_AMBUSH_LINES[i] ?? Q9_AMBUSH_LINES[0]], spawned: false }));
        break;
      case 'bellingham-cleared':
        this.spawnArcDemons(BELLINGHAM_FARMS_POSITION, BELLINGHAM_DEMONS_COUNT);
        this.arcMode = 'defeat';
        break;
      case 'bellingham-thanked':
        this.arcMode = 'none'; // deliver: talk to Greta at Bellingham
        break;
      case 'contraption-taken':
        this.spawnArcDemons(CASCADES_POSITION, CASCADES_DEMONS_COUNT);
        this.arcMode = 'defeat';
        break;
      case 'contraption-examined':
        this.arcMode = 'none'; // deliver: bring the vessel to Alder in Seattle
        break;
      case 'longview-reached':
        this.arcMode = 'reach';
        this.arcReach = { ...LONGVIEW_POSITION };
        this.arcAmbushes = Q12_AMBUSHES.map((p, i) => ({ x: p.x, y: p.y, lines: [Q12_AMBUSH_LINES[i] ?? Q12_AMBUSH_LINES[0]], spawned: false }));
        break;
      case 'mire-verdict':
        this.arcMode = 'none'; // deliver: Mire's verdict in Longview
        break;
      // --- The Descent arc ---
      case 'guardsmen-defeated':
        this.spawnArcTownsfolk('guardsman', OREGON_CITY_POSITION, DESCENT_GUARDSMEN_COUNT);
        this.arcMode = 'defeat';
        break;
      case 'farmers-defeated':
        this.spawnArcTownsfolk('farmer', FARM_FIELD_POSITION, DESCENT_FARMERS_COUNT);
        this.arcMode = 'defeat';
        break;
      case 'shipment-collected':
        this.arcShipmentPos = { ...FARM_FIELD_POSITION };
        this.pickups.spawn({ x: FARM_FIELD_POSITION.x, y: FARM_FIELD_POSITION.y, type: 'plunder', amount: 1 });
        this.arcMode = 'pickup';
        break;
      case 'oc-angels-plundered':
        this.spawnArcAngels(OREGON_CITY_POSITION, DESCENT_OC_ANGELS);
        this.beginPlunder(DESCENT_OC_ANGELS);
        break;
      case 'loca-angels-plundered':
        this.spawnArcAngels(DESCENT_LOC_A, DESCENT_LOC_ANGELS);
        this.beginPlunder(DESCENT_LOC_ANGELS);
        break;
      case 'locb-angels-plundered':
        this.spawnArcAngels(DESCENT_LOC_B, DESCENT_LOC_ANGELS);
        this.beginPlunder(DESCENT_LOC_ANGELS);
        break;
      case 'reach-outpost':
        // "Return to Azazel": the hub is PROGRESS-GATED — the Oregon Dark Outpost
        // through 4.4, the Kamiah (Idaho) outpost from 4.5 on (it moves with Azazel).
        this.arcMode = 'reach';
        this.arcReach = { ...this.patronHubPos() };
        break;
      // --- Act IV (4.1–4.4), given by Azazel before the descent ---
      case 'bend-materials-taken':
        // 4.1 — beat the Bend farmers; "taking the materials" is the completeNarration.
        this.spawnArcTownsfolk('farmer', BEND_POSITION, BEND_FARMERS_COUNT);
        this.arcMode = 'defeat';
        break;
      case 'lagrande-angels-defeated':
        // 4.2 — clear the road-watch: a herald (the speaker) + lesser/warden angels.
        this.spawnArcAngelsMixed(LA_GRANDE_POSITION, { lesser: LAGRANDE_LESSER, warden: LAGRANDE_WARDEN, herald: LAGRANDE_HERALDS });
        this.arcMode = 'defeat';
        break;
      case 'caravans-stopped':
        // 4.3 — five caravans, each a small guard knot, strung along the route.
        for (let c = 0; c < CARAVANS_COUNT; c++) {
          const a = (Math.PI * 2 * c) / CARAVANS_COUNT;
          const spot = { x: CARAVAN_ROUTE_POSITION.x + Math.cos(a) * 150, y: CARAVAN_ROUTE_POSITION.y + Math.sin(a) * 150 };
          this.spawnArcTownsfolk('caravanguard', spot, CARAVAN_GUARDS_PER);
        }
        this.arcMode = 'defeat';
        break;
      case 'salt-gathered':
        // 4.4a — gather N salt patches along the Florence shore while wildlife harasses.
        this.beginGather(FLORENCE_POSITION, SALT_PATCHES);
        this.spawnArcTownsfolk('bear', FLORENCE_POSITION, FLORENCE_BEARS);
        this.spawnArcTownsfolk('eagle', FLORENCE_POSITION, FLORENCE_EAGLES);
        this.spawnArcTownsfolk('crab', FLORENCE_POSITION, FLORENCE_CRABS);
        break;
      case 'roseburg-reached':
        // 4.4b — angels bar the road into Roseburg; the CLERIC (deliver NPC) completes it.
        this.spawnArcAngelsMixed(ROSEBURG_POSITION, { lesser: ROSEBURG_LESSER, warden: ROSEBURG_WARDEN, herald: ROSEBURG_HERALDS });
        this.arcMode = 'none';
        break;
      // --- Act IV Batch C (the Idaho leg, 4.5–4.7) ---
      case 'reach-kamiah':
        // 4.5 — travel to the Kamiah outpost (the relabelled Dark Outpost; Azazel waits).
        this.arcMode = 'reach';
        this.arcReach = { ...KAMIAH_POSITION };
        break;
      case 'olympia-pump-taken':
        // 4.5b — proximity "Take the Pump" action at the Olympia woman's house (Q1 callback).
        this.beginArcAction({ ...OLYMPIA_POSITION }, 'Take the Pump');
        break;
      case 'olympia-neighbors-defeated':
        // 4.5b — the three neighbour men ambush as you leave the porch.
        this.spawnArcTownsfolk('defender', OLYMPIA_POSITION, OLYMPIA_NEIGHBORS_COUNT);
        this.arcMode = 'defeat';
        break;
      case 'river-taint': {
        // 4.6 — proximity "Taint the Water" action at the CURRENT objective's river headwater.
        const pos = this.activeObjectivePos() ?? { ...DARK_OUTPOST_POSITION };
        this.beginArcAction(pos, 'Taint the Water');
        break;
      }
      case 'river-angels': {
        // 4.6 — angels appear after each tainting; the herald speaks at the third river.
        const pos = this.activeObjectivePos() ?? { ...DARK_OUTPOST_POSITION };
        const isThird = this.chain.activeObjectiveDef?.target === 'river-3';
        this.spawnArcAngelsMixed(pos, { lesser: RIVER_LESSER, warden: RIVER_WARDEN, herald: isThird ? RIVER_HERALDS : 0 });
        this.arcMode = 'defeat';
        break;
      }
      case 'city-sack': {
        // 4.7 — cut through the (weakened) city guards; "taking the heart" is the completeNarration.
        const pos = this.activeObjectivePos() ?? { ...DARK_OUTPOST_POSITION };
        this.spawnArcTownsfolk('cityguard', pos, CITY_GUARDS);
        this.arcMode = 'defeat';
        break;
      }
      case 'city-angels': {
        // 4.7 — the angels descend over each sacked city.
        const pos = this.activeObjectivePos() ?? { ...DARK_OUTPOST_POSITION };
        this.spawnArcAngelsMixed(pos, { lesser: CITY_ANGELS_LESSER, warden: CITY_ANGELS_WARDEN });
        this.arcMode = 'defeat';
        break;
      }
      // --- ACT IV FINALE (4.8–4.9) ---
      case 'catapult-fired': {
        // 4.8 — proximity "Fire the Catapult" action at the CURRENT objective's catapult.
        const pos = this.activeObjectivePos() ?? { ...BOISE_POSITION };
        this.beginArcAction(pos, 'Fire the Catapult');
        break;
      }
      case 'catapult-defenders': {
        // 4.8 — Boise defenders pour out to stop you after each firing.
        const pos = this.activeObjectivePos() ?? { ...BOISE_POSITION };
        this.spawnArcTownsfolk('cityguard', pos, CATAPULT_DEFENDERS_COUNT);
        this.arcMode = 'defeat';
        break;
      }
      case 'reach-holy-outpost':
        // 4.9 obj 0 — march on the outpost: completes within a GENEROUS ring of the
        // outpost itself (any approach direction — the quest arrow points here), which
        // is what arms the assault layers. The ring is wider than the guardians'
        // activation range, and they're held dormant through the layers regardless.
        this.arcMode = 'reach';
        this.arcReach = { ...HOLY_OUTPOST_POSITION };
        this.arcReachRadius = ASSAULT_OUTER_TRIGGER_RADIUS;
        break;
      case 'outpost-outer-defeated':
        // 4.9 obj 1 — the angel group OUTSIDE the outpost. Spawns the moment the
        // march ring completes; angels actively hunt the player from their anchor.
        this.spawnArcAngelsMixed(
          { x: HOLY_OUTPOST_POSITION.x + ASSAULT_OUTER_OFFSET.dx, y: HOLY_OUTPOST_POSITION.y + ASSAULT_OUTER_OFFSET.dy },
          { lesser: ASSAULT_OUTER_LESSER, warden: ASSAULT_OUTER_WARDEN },
        );
        this.arcMode = 'defeat';
        break;
      case 'outpost-inner-defeated':
        // 4.9 obj 2 — the angel group INSIDE the outpost.
        this.spawnArcAngelsMixed(
          { x: HOLY_OUTPOST_POSITION.x + ASSAULT_INNER_OFFSET.dx, y: HOLY_OUTPOST_POSITION.y + ASSAULT_INNER_OFFSET.dy },
          { lesser: ASSAULT_INNER_LESSER, warden: ASSAULT_INNER_WARDEN, herald: ASSAULT_INNER_HERALD },
        );
        this.arcMode = 'defeat';
        break;
      case 'guardians-defeated':
        // 4.9 obj 3 — the FINAL layer at the portal: a small angel group descends
        // alongside the two flaming-sword guardians (tunable; 0/0 = guardians only).
        // The MACHINE's 'guardians-defeated' advances the quest; these are the
        // "final group" flavor and are cleared when the layer ends. arcMode 'none'
        // (the machine owns the completion), mask-drop narration armed below.
        if (this.chain.activeQuest?.id === ACT4_DOOR_HOME_ID && (ASSAULT_PORTAL_LESSER > 0 || ASSAULT_PORTAL_WARDEN > 0)) {
          this.spawnArcAngelsMixed(
            { x: HOLY_OUTPOST_POSITION.x, y: HOLY_OUTPOST_POSITION.y + 40 },
            { lesser: ASSAULT_PORTAL_LESSER, warden: ASSAULT_PORTAL_WARDEN },
          );
        }
        this.arcMode = 'none';
        break;
      // 4.9 objs 4–5 ('portal-corrupted' / 'entered-heaven') fall through to the
      // default: the EXISTING Holy-Outpost portal machine drives those actions and
      // fires the triggers — the quest only CONSUMES them.
      default:
        this.arcMode = 'none';
    }
    // Arm the active objective's one-shot "on arriving" scripted narration (Act II),
    // if any — it plays once when the player first nears the objective's target.
    const obj = this.chain.activeObjectiveDef;
    this.arcEncounterNarration = obj?.encounterNarration ?? null;
    this.arcEncounterPos = obj?.target ? this.resolveTarget(obj.target) : null;
    this.arcEncounterShown = false;
    this.refreshQuestUi();
  }

  private beginPlunder(required: number): void {
    this.arcMode = 'plunder';
    this.arcHolyBaseline = this.holyPower.count;
    this.arcHolyRequired = required;
  }

  /** Set up a generic PROXIMITY-ACTION objective: a captioned button appears near
   *  `pos` and, on tap, fires the active objective's trigger (Burn / Taint / Take). */
  private beginArcAction(pos: { x: number; y: number }, label: string): void {
    this.arcMode = 'burn';
    this.arcReach = pos;
    this.arcActionLabel = label;
  }

  /** World position of the ACTIVE objective's target (for triggers reused across
   *  multiple objectives, e.g. river-1/2/3 or city-1/2/3), or null if none. */
  private activeObjectivePos(): { x: number; y: number } | null {
    const t = this.chain.activeObjectiveDef?.target;
    if (!t) return null;
    const r = this.resolveTarget(t);
    return r ? { x: r.x, y: r.y } : null;
  }

  /** Act IV 4.4: scatter `n` salt-patch pickups around `center` for a count-of-N gather. */
  private beginGather(center: { x: number; y: number }, n: number): void {
    this.arcMode = 'gather';
    this.arcGatherCount = 0;
    this.arcGatherRequired = n;
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + Math.random() * 0.4;
      const r = 70 + Math.random() * 90;
      this.pickups.spawn({ x: center.x + Math.cos(a) * r, y: center.y + Math.sin(a) * r, type: 'salt', amount: 1 });
    }
  }

  /** Watch for the active arc objective's completion each frame (Act I / Act II / descent). */
  private updateArc(): void {
    // The Q6 burn button only ever shows from the burn branch below; default it off
    // each frame (also covers leaving burn mode / the early return).
    if (this.arcMode !== 'burn') this.burnButton.setVisible(false);
    if (!this.isArcActive()) return;
    const trig = this.chain.activeTrigger;
    if (!trig) return;
    // Act II: play the one-shot "on arriving" scripted narration on first approach.
    this.maybeShowEncounterNarration();
    // Investigation arc: spawn en-route ambush groups as the player passes each waypoint.
    this.maybeSpawnAmbush();
    if (this.arcMode === 'defeat') {
      if (this.arcEnemies.length > 0 && this.arcEnemies.every((e) => !e.isAlive)) this.notifyQuest(trig);
    } else if (this.arcMode === 'plunder') {
      const collected = this.holyPower.count - this.arcHolyBaseline;
      const allDead = this.arcEnemies.length > 0 && this.arcEnemies.every((e) => !e.isAlive);
      if (allDead && collected >= this.arcHolyRequired) this.notifyQuest(trig);
    } else if (this.arcMode === 'gather') {
      // Act IV 4.4a: complete once the required number of salt patches are collected.
      if (this.arcGatherCount >= this.arcGatherRequired) this.notifyQuest(trig);
    } else if (this.arcMode === 'reach' && this.arcReach) {
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, this.arcReach.x, this.arcReach.y) <= this.arcReachRadius) {
        this.notifyQuest(trig);
      }
    } else if (this.arcMode === 'burn' && this.arcReach) {
      // Generic proximity action: show the captioned button while in range (the player taps it).
      const near = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.arcReach.x, this.arcReach.y) <= GROVE_BURN_RANGE;
      this.burnButton.setLabel(this.arcActionLabel);
      this.burnButton.setVisible(near && !this.dialogue.isOpen());
    }
    // Keep the tracker's live "(N left)" / "(Holy Power x/y)" / "(salt x/y)" suffix current.
    if (this.arcMode === 'defeat' || this.arcMode === 'plunder' || this.arcMode === 'gather') this.refreshQuestUi();
  }

  /** Show the active objective's scripted "on arriving" narration once, on first approach. */
  private maybeShowEncounterNarration(): void {
    if (this.arcEncounterShown || !this.arcEncounterNarration || !this.arcEncounterPos) return;
    if (this.dialogue.isOpen() || this.choice.isOpen()) return;
    const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.arcEncounterPos.x, this.arcEncounterPos.y);
    if (d > ENCOUNTER_NARRATION_RANGE) return;
    this.arcEncounterShown = true;
    // A freeze-and-read cutscene beat (let the first-demon sight breathe).
    this.controls.setEnabled(false);
    this.player.setDirection(0, 0);
    this.dialogue.open([...this.arcEncounterNarration], () => {
      this.reenableControls = true;
    });
  }

  /** Investigation escorts (Q9/Q12): spawn each en-route ambush group as the player nears it.
   *  The demons are added to arcEnemies, but reaching the destination still completes the
   *  objective (the player may fight or run past), per the escort spec. */
  private maybeSpawnAmbush(): void {
    if (this.arcAmbushes.length === 0) return;
    for (const amb of this.arcAmbushes) {
      if (amb.spawned) continue;
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, amb.x, amb.y) > AMBUSH_TRIGGER_RANGE) continue;
      amb.spawned = true;
      this.spawnArcDemons({ x: amb.x, y: amb.y }, AMBUSH_DEMONS_COUNT);
      this.showBanner(amb.lines[0], 3200);
    }
  }

  /** Generic proximity-action tap (Burn the Grove / Taint the Water / Take the Pump):
   *  if a 'burn'-mode objective is active and the player is in range, fire its trigger. */
  private tryArcAction(): void {
    if (this.arcMode !== 'burn' || !this.arcReach) return;
    const trig = this.chain.activeTrigger;
    if (!trig) return;
    const near = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.arcReach.x, this.arcReach.y) <= GROVE_BURN_RANGE;
    if (!near) return;
    this.burnButton.setVisible(false);
    this.notifyQuest(trig); // completes the current action objective (grove / river / pump)
  }

  /** Spawn `n` Hell Demons at a point on the ACTIVE (Earth) map for an arc objective. */
  private spawnArcDemons(center: { x: number; y: number }, n: number): void {
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + Math.random() * 0.5;
      const r = 50 + Math.random() * 40;
      const d = this.spawnDemon(center.x + Math.cos(a) * r, center.y + Math.sin(a) * r, this.activeMap().layer);
      this.arcEnemies.push(d);
    }
  }

  private spawnArcTownsfolk(variant: TownsfolkVariant, center: { x: number; y: number }, n: number): void {
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + Math.random() * 0.5;
      const r = 50 + Math.random() * 40;
      const t = this.spawnTownsfolk(center.x + Math.cos(a) * r, center.y + Math.sin(a) * r, null, variant);
      this.arcEnemies.push(t);
    }
  }

  private spawnArcAngels(center: { x: number; y: number }, n: number): void {
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + Math.random() * 0.5;
      const r = 80 + Math.random() * 50;
      const angel = this.spawnAngel('angel', center.x + Math.cos(a) * r, center.y + Math.sin(a) * r);
      this.arcEnemies.push(angel);
    }
  }

  /** Act IV: spawn a MIX of angel variants in a ring (the herald is the speaking one). */
  private spawnArcAngelsMixed(center: { x: number; y: number }, mix: Partial<Record<AngelVariantKey, number>>): void {
    const keys: AngelVariantKey[] = [];
    (Object.entries(mix) as [AngelVariantKey, number][]).forEach(([k, count]) => {
      for (let i = 0; i < count; i++) keys.push(k);
    });
    const n = Math.max(keys.length, 1);
    keys.forEach((key, i) => {
      const a = (Math.PI * 2 * i) / n + Math.random() * 0.5;
      const r = 80 + Math.random() * 50;
      const angel = this.spawnAngel(key, center.x + Math.cos(a) * r, center.y + Math.sin(a) * r);
      this.arcEnemies.push(angel);
    });
  }

  /** Clear the current objective's arc enemies + watcher state (not the holy-power motes). */
  private clearArcObjective(): void {
    const set = new Set<Townsfolk | AngelEnemy | Demon>(this.arcEnemies);
    for (const e of this.arcEnemies) if (e.isAlive) e.destroy();
    this.townsfolk = this.townsfolk.filter((t) => !set.has(t));
    this.angels = this.angels.filter((x) => !set.has(x));
    this.demons = this.demons.filter((d) => !set.has(d)); // Act II Q7 reuses Hell Demons on Earth
    this.arcEnemies = [];
    this.arcMode = 'none';
    this.arcReach = null;
    this.arcReachRadius = REACH_OUTPOST_RANGE; // per-objective override (4.9's march ring) resets
    this.arcShipmentPos = null;
    this.arcGatherCount = 0;
    this.arcGatherRequired = 0;
    this.pickups.clearByType('salt'); // prune any leftover Act IV 4.4 salt patches
    this.arcEncounterNarration = null;
    this.arcEncounterPos = null;
    this.arcEncounterShown = false;
    this.arcAmbushes = [];
    this.burnButton?.setVisible(false);
  }

  /** DEV: force the corrupted path (Spirit Vision on) so the descent arc is testable. */
  private devForceCorrupt(): void {
    this.setPlayerPath('corrupted');
  }

  // --- AZAZEL'S PROGRESS-GATED LOCATION + the 4.9 demon escort ---------------

  /**
   * The patron's EARTH hub — where "Return to Azazel" (reach-outpost) completes and
   * where the 'outpost' marker points: the Oregon Dark Outpost through 4.4, the
   * Kamiah (Idaho) outpost once 4.5 ("The Door They Came Through") is complete.
   */
  private patronHubPos(): { x: number; y: number } {
    return this.chain.status(ACT4_KAMIAH_ID) === 'complete' ? KAMIAH_POSITION : DARK_OUTPOST_POSITION;
  }

  /**
   * Move Azazel to his progress-gated station (three stages, world-aware):
   *   Oregon (his spirit-data seed) → the KAMIAH outpost once 4.5 completes →
   *   HEAVEN (near the arrival point) once 4.9 completes (he walked through with you).
   * Called at create, on every quest completion, after loads, and on quest-tab jumps.
   * Idempotent (SpiritEntity.moveTo no-ops when already there).
   */
  private updatePatronLocation(): void {
    const patron = this.oregonSpirit;
    if (!patron) return;
    if (this.chain.status(ACT4_DOOR_HOME_ID) === 'complete') {
      patron.moveTo(this.heavenArrivalPos.x + 90, this.heavenArrivalPos.y - 10);
    } else if (this.chain.status(ACT4_KAMIAH_ID) === 'complete') {
      patron.moveTo(KAMIAH_POSITION.x + 10, KAMIAH_POSITION.y + 46);
    } else {
      patron.moveTo(PATRON_HOME_POSITION.x, PATRON_HOME_POSITION.y);
    }
  }

  /**
   * ACT IV 4.9 "The Door Home" — spawn the DEMON ESCORT: a squad of ranged demon
   * allies (low-damage pooled friendly bolts, NEVER pull aggro) that follows behind
   * the player through the assault. They despawn on entering Heaven (world swaps
   * clear all summons) with clearDemonAllies as the belt-and-suspenders.
   */
  private spawnDemonAllies(withBark = true): void {
    this.summons.clearKey(DEMON_ALLY_CONFIG.key); // never stack squads (re-accept / reload)
    const { dx, dy } = this.facingUnit();
    for (let i = 0; i < DEMON_ALLY_COUNT; i++) {
      // Fan out BEHIND the player (opposite the facing) with scatter.
      const jx = Phaser.Math.Between(-46, 46);
      const jy = Phaser.Math.Between(-46, 46);
      const a = this.summons.summon(
        DEMON_ALLY_CONFIG,
        this.player.x - dx * 52 + jx,
        this.player.y - dy * 52 + jy,
        DEMON_ALLY_TUNING.maxConcurrent,
      );
      this.spawnSkillRing(a.x, a.y, DEMON_ALLY_TUNING.bodyRadius + 10, DEMON_ALLY_TUNING.projectileColor);
    }
    if (withBark) {
      // Azazel's battle-bark as the crusade sets out.
      this.time.delayedCall(400, () =>
        this.showBanner('Azazel: Almost there! Stay with him! HOME is on the other side of that door!', 3200),
      );
    }
  }

  /** Remove the 4.9 demon escort (quest complete / fail-safe). Other summons stand. */
  private clearDemonAllies(): void {
    this.summons.clearKey(DEMON_ALLY_CONFIG.key);
  }

  /**
   * ACT IV 4.9 sequencing for the Holy-Outpost machine: while the assault quest is
   * on its EARLIER objectives (the outer/inner fights), the dormant guardians HOLD
   * (don't proximity-wake); on the portal objective they still hold until the
   * MASK-DROP encounterNarration has played. Outside 4.9 (dev tools, stale saves)
   * the machine behaves exactly as before.
   */
  private assaultHoldsGuardians(): boolean {
    if (this.chain.activeQuest?.id !== ACT4_DOOR_HOME_ID) return false;
    const i = this.chain.activeObjectiveIndex;
    if (i < DOOR_HOME_GUARDIANS_OBJ) return true; // still fighting toward the portal
    if (i === DOOR_HOME_GUARDIANS_OBJ) {
      // Hold until the mask-drop has played AND its dialogue is fully closed —
      // the guardians must not swing while the player is frozen reading it.
      return (!!this.arcEncounterNarration && !this.arcEncounterShown) || this.dialogue.isOpen();
    }
    return false;
  }

  /**
   * DEV: spawn a pack just ahead of the player and force Spirit Vision on, so the
   * encounter is immediately testable on demand regardless of story state.
   */
  private devSpawnSwarm(): void {
    this.spirit.setSpiritVision(true);
    const len = Math.hypot(this.player.facingX, this.player.facingY) || 1;
    const ahead = 150;
    this.spawnSwarmPack(
      this.player.x + (this.player.facingX / len) * ahead,
      this.player.y + (this.player.facingY / len) * ahead,
    );
  }

  /** DEV: fast-forward the chain to Quest 13 (active) and teleport to the rift, so the
   *  finale rift scene can be tested on mobile without a full playthrough. */
  private devJumpToRift(): void {
    const upTo = [
      'honest-days-work', 'wolves-tree-line', 'shallows', 'the-pass',
      'whats-gotten-into-them', 'the-blight', 'the-thing-at-white-pass',
      'word-to-yakima', 'the-iron-road', 'the-northern-farms',
      'what-the-dark-ones-carry', 'the-exile-of-longview',
    ];
    this.urielArrived = true;
    this.riftSceneStarted = false;
    this.riftLieFired = false;
    if (this.semyaza) { this.semyaza.destroy(); this.semyaza = undefined; }
    this.chain.load({ completed: upTo, activeId: 'the-source', activeObjective: 0 });
    this.refreshQuestUi();
    this.devTeleportTo(OREGON_RIFT_POSITION);
  }

  /** DEV: jump to a world position on the active (Earth) map — testing the investigation arc. */
  private devTeleportTo(p: { x: number; y: number }): void {
    if (this.activeWorld !== WORLD_EARTH) return;
    this.cancelDash();
    this.player.sprite.setPosition(p.x, p.y);
    this.player.setDirection(0, 0);
    this.cameras.main.centerOn(p.x, p.y);
  }

  private spawnDamageNumber(x: number, y: number, amount: number, color: string): void {
    // Pooled (perf): reuse a Text from the pool instead of allocating one per hit.
    this.floatingText.show(x, y, `-${Math.round(amount)}`, color);
  }

  private spawnSlash(x: number, y: number, angle: number): void {
    // COSMETIC reflavor: golden while holy, the original pale gold while demonic.
    const color = this.power.isHoly ? HOLY_SLASH_COLOR : 0xffe9a8;
    const arc = this.add
      .arc(x, y, PLAYER_ATTACK_RANGE * 0.7, -45, 45, false, color, 0.45)
      .setDepth(13)
      .setRotation(angle);
    this.worldFx.add(arc);
    this.tweens.add({
      targets: arc,
      scale: 1.5,
      alpha: 0,
      duration: 170,
      ease: 'Quad.out',
      onComplete: () => arc.destroy(),
    });
  }

  private showBanner(text: string, durationMs: number): void {
    this.banner
      .setWordWrapWidth(Math.min(this.scale.width - 48, 380))
      .setText(text)
      .setPosition(this.scale.width / 2, this.scale.height * 0.38)
      .setVisible(true);
    this.time.delayedCall(durationMs, () => this.banner.setVisible(false));
  }

  // --- Interactions ---------------------------------------------------------

  private checkDoors(): void {
    if (this.time.now < this.portalCooldownUntil) return;
    for (const door of [...this.town.doors, ...this.portland.doors]) {
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, door.x, door.y) < DOOR_TRIGGER) {
        this.enterInterior(door);
        return;
      }
    }
  }

  /**
   * Proximity + talk handling for ALL interactables: the real NPC always, plus
   * spirit entities only while Spirit Vision is active (so when it's off they're
   * imperceptible — no Talk prompt, no auto-dialogue).
   */
  private checkInteractions(): void {
    const candidates: Interactable[] = [
      this.npc,
      this.portlandNpc,
      ...this.act1Givers,
      ...this.act2Givers,
      ...this.invGivers,
      ...this.deliverNpcs.map((d) => d.npc), // Olympia / Greta / Alder / Mire recipients
    ];
    if (this.spirit.isActive()) candidates.push(...this.spirit.entities);

    let nearest: Interactable | null = null;
    let nearestDist = Infinity;
    for (const c of candidates) {
      const d = c.distanceTo(this.player.x, this.player.y);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = c;
      }
    }

    if (nearest && nearestDist <= NPC_TALK_RANGE) {
      this.talkTarget = nearest;
      this.talkButton.setVisible(true);
      if (nearestDist <= NPC_AUTO_RANGE && this.guardTarget !== nearest) {
        this.openDialogueWith(nearest);
      }
    } else {
      this.talkTarget = null;
      this.talkButton.setVisible(false);
      this.guardTarget = null; // left range — allow auto-talk again next approach
    }
  }

  private tryTalk(): void {
    if (this.dialogue.isOpen()) return;
    if (this.talkTarget) this.openDialogueWith(this.talkTarget);
  }

  private openDialogueWith(target: Interactable): void {
    this.guardTarget = target;
    this.talkButton.setVisible(false);
    this.controls.setEnabled(false);
    this.player.setDirection(0, 0);

    // A DELIVER/RECIPIENT NPC (Della's water pump, Alder's vessel exam, Mire's verdict):
    // if its objective trigger is active, play the lines and complete it; otherwise a
    // short flavor line. Reusable registry (built in create()).
    const deliver = this.deliverNpcs.find((d) => d.npc === target);
    if (deliver) {
      if (this.chain.activeTrigger === deliver.trigger) {
        this.dialogue.open([...deliver.lines], () => {
          this.notifyQuest(deliver.trigger);
          this.reenableControls = true;
        });
      } else {
        // Act IV 4.5b ("Olympia"): while the gut-punch quest is active, the woman must
        // NOT greet you with her warm Q1 idle line — show a quiet, grieving line instead.
        const somber =
          deliver.npc === this.olympiaNpc && this.chain.status('act4-olympia') === 'active'
            ? 'Della: (She backs away from you, her eyes wet, and says nothing.)'
            : deliver.idle;
        this.dialogue.open([somber], () => {
          this.reenableControls = true;
        });
      }
      return;
    }

    // A quest-giver (NPC or the spirit patron) speaks per the chain's state.
    const giver = this.questGivers.find((g) => g.entity === target);
    if (giver) {
      this.openQuestGiverDialogue(giver);
      return;
    }

    // Generic interactable (e.g. the Pale Wraith) — just its lines.
    this.dialogue.open(target.lines, () => {
      this.reenableControls = true;
    });
  }

  /** The quest this giver may OFFER right now (available + corruption gate met), or null. */
  private offerableQuest(giver: { questIds: string[]; requiresCorruption?: boolean }): QuestDef | null {
    if (giver.requiresCorruption && this.playerPath !== 'corrupted') return null;
    return this.chain.firstAvailable(giver.questIds);
  }

  /**
   * Data-driven quest-giver dialogue from the chain: a reminder if this giver has
   * an ACTIVE quest; an OFFER (accepted when the lines finish) if it has an
   * AVAILABLE one; an acknowledgment if its quest is COMPLETE; else idle flavor.
   */
  private openQuestGiverDialogue(giver: {
    questIds: string[];
    idleLines: string[];
    requiresCorruption?: boolean;
  }): void {
    // ACT IV 4.10 "Heaven": the ONE talk-completes giver quest — talking to Azazel
    // in Heaven plays the locked arrival dialogue, then COMPLETES the quest (which
    // auto-starts the repointed climax-judgment endgame).
    if (giver.questIds.includes(ACT4_HEAVEN_ID) && this.chain.activeQuest?.id === ACT4_HEAVEN_ID) {
      this.dialogue.open([...this.chain.get(ACT4_HEAVEN_ID)!.npcActiveLines], () => {
        this.notifyQuest('azazel-heaven-talk');
        this.reenableControls = true;
      });
      return;
    }
    const activeId = giver.questIds.find((id) => this.chain.status(id) === 'active');
    if (activeId) {
      this.dialogue.open([...this.chain.get(activeId)!.npcActiveLines], () => {
        this.reenableControls = true;
      });
      return;
    }
    // A just-completed quest from THIS giver whose "complete" reaction hasn't played:
    // show it once before offering the next (otherwise a multi-quest giver skips it).
    if (this.pendingAckQuestId && giver.questIds.includes(this.pendingAckQuestId) && this.chain.status(this.pendingAckQuestId) === 'complete') {
      const ackId = this.pendingAckQuestId;
      this.pendingAckQuestId = null;
      this.dialogue.open([...this.chain.get(ackId)!.npcCompleteLines], () => {
        this.reenableControls = true;
      });
      return;
    }
    const offer = this.offerableQuest(giver);
    if (offer) {
      this.dialogue.open([...offer.npcInactiveLines], () => {
        this.acceptQuest(offer.id);
        this.reenableControls = true;
      });
      return;
    }
    const doneId = giver.questIds.find((id) => this.chain.status(id) === 'complete');
    if (doneId) {
      this.dialogue.open([...this.chain.get(doneId)!.npcCompleteLines], () => {
        this.reenableControls = true;
      });
      return;
    }
    this.dialogue.open(giver.idleLines.length ? giver.idleLines : ['...'], () => {
      this.reenableControls = true;
    });
  }

  /** Accept an available quest from its giver (the chain emits 'started'). */
  private acceptQuest(id: string): void {
    this.chain.accept(id);
  }

  /** React to discrete quest lifecycle events (kept out of frame logic). */
  private handleQuestEvent(e: QuestEvent): void {
    switch (e.type) {
      case 'started': {
        if (this.isArcQuest(e.questId)) this.beginArcObjective(); // set up objective 0 (Act I + Act IV arcs)
        // Quest 13 (finale): Uriel's scripted send-off plays on start (pre-warning).
        if (e.questId === 'the-source') this.playUrielSendoff();
        // ACT IV 4.9 "The Door Home": the demon escort marches out at the player's back.
        if (e.questId === ACT4_DOOR_HOME_ID) this.spawnDemonAllies();
        // Auto-activating climax quests have no NPC: show their start narration as a
        // banner (a beat after any preceding completion banner reads).
        const startDef = this.chain.get(e.questId);
        if (startDef?.autoActivate && startDef.npcInactiveLines.length) {
          const narration = startDef.npcInactiveLines.join('  ');
          this.time.delayedCall(1300, () => this.showBanner(`${startDef.title}\n\n${narration}`, 4200));
        }
        this.refreshQuestUi();
        break;
      }
      case 'objective-complete': {
        // For arc quests, set up the NEXT objective's world state (the chain has
        // already advanced; if that was the last objective, activeObjectiveDef is
        // undefined and quest-complete follows).
        if (this.isArcQuest(e.questId) && this.chain.activeObjectiveDef) this.beginArcObjective();
        // Mid-quest scripted beat: the just-COMPLETED objective's completeNarration
        // (e.g. the vessel dropping in the Cascades), shown as a freeze-read dialogue.
        const done = this.chain.get(e.questId)?.objectives[e.index];
        if (done?.completeNarration && this.chain.activeObjectiveDef) {
          this.controls.setEnabled(false);
          this.player.setDirection(0, 0);
          this.dialogue.open([...done.completeNarration], () => {
            this.reenableControls = true;
          });
        }
        this.refreshQuestUi();
        break;
      }
      case 'quest-complete':
        if (this.isArcQuest(e.questId)) this.clearArcObjective();
        // Remember the just-completed quest so its giver's "complete" reaction is shown
        // on the next talk, before the next quest is offered (see openQuestGiverDialogue).
        if ((this.chain.get(e.questId)?.npcCompleteLines.length ?? 0) > 0) this.pendingAckQuestId = e.questId;
        // ACT IV 4.9 done (the player just stepped into Heaven — the world swap already
        // cleared all summons; this is the belt-and-suspenders for any edge path).
        if (e.questId === ACT4_DOOR_HOME_ID) this.clearDemonAllies();
        // Azazel's station is progress-gated (Oregon → Kamiah → Heaven) — re-derive it
        // on every completion (idempotent; only 4.5 / 4.9 actually move him).
        this.updatePatronLocation();
        this.grantQuestReward(e.questId);
        // Act II finale: completing Q7 arms URIEL'S ARRIVAL, which fires when the
        // player returns to the Enumclaw square (and gates the old corruption beat).
        if (e.questId === 'the-thing-at-white-pass' && !this.urielArrived) {
          this.urielPending = true;
          this.time.delayedCall(1500, () => this.showBanner('Return to Enumclaw — something is calling you home.', 3600));
        }
        this.refreshQuestUi();
        break;
      case 'unlocked': {
        // Auto-activating quests (the climax) START the moment they unlock — no NPC
        // turn-in. Guard on no active quest (one active at a time). This is what
        // makes Quest 5 begin on descent-4 completion and Quest 6 begin on the
        // entered-Heaven transition that completes Quest 5.
        const def = this.chain.get(e.questId);
        if (def?.autoActivate && !this.chain.activeQuest && this.chain.status(e.questId) === 'available') {
          this.acceptQuest(e.questId);
        }
        break;
      }
    }
    // Autosave on real quest progress (not the informational 'unlocked' event).
    if (e.type !== 'unlocked') this.autosave();
  }

  /** Grant a completed quest's data-driven reward block (heal / title / XP / Holy Power + banner). */
  private grantQuestReward(questId: string): void {
    const def = this.chain.get(questId);
    if (!def) return;
    const r = def.reward;
    if (r.healToFull) this.playerHealth.full();
    if (r.title) this.awardTitle(r.title);
    if (r.holyPower) this.holyPower.add(r.holyPower);
    // An empty banner + no note = a deliberately quiet completion (e.g. Act IV 4.5b
    // "Olympia"): skip the flourish entirely rather than flashing an empty banner.
    const bannerText = r.note ? `${r.banner}\n\n${r.note}`.trim() : r.banner;
    if (bannerText) this.showBanner(bannerText, 3600);
    if (r.xp > 0) this.gainXP(r.xp);
  }

  // --- The Angel's Choice ---------------------------------------------------

  /**
   * THE single control point for alignment. Setting "corrupted" permanently
   * opens Spirit Vision; all alignment-conditional content keys off the path.
   *
   * === FUTURE EVIL-PATH HOOK ===
   * The corrupted questline branches on this.playerPath === 'corrupted'. New
   * dark-path content should read it here (or via a getter) rather than adding
   * a parallel flag.
   */
  private setPlayerPath(path: PlayerPath): void {
    this.playerPath = path;
    if (path === 'corrupted') this.spirit.setSpiritVision(true);
    // Conditional content: spirits serve their corrupted dialogue once dark.
    for (const e of this.spirit.entities) e.setPath(path);
  }

  // --- URIEL'S ARRIVAL (Act II finale) --------------------------------------
  //
  // Armed when Q7 completes (handleQuestEvent). The scene fires when the player
  // returns to the Enumclaw square, reusing the scripted-dialogue/cutscene pattern
  // (like startGodJudgment). It is NARRATIVE ONLY — it grants no power and never
  // touches playerPath / Spirit Vision. `urielArrived` also gates the old corruption
  // beat's offer (offerableQuest), so the rift beat can't begin before Uriel.

  /** When Q7 is done and the player is back in the Enumclaw square, play Uriel's scene. */
  private checkUrielArrival(): void {
    if (!this.urielPending || this.urielArrived) return;
    if (this.dialogue.isOpen() || this.choice.isOpen() || !this.controls.isEnabled()) return;
    const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.town.spawn.x, this.town.spawn.y);
    if (d <= URIEL_SCENE.triggerRange) this.playUrielScene();
  }

  /** One-shot scene-setting narration the first time the player reaches the Druid city. */
  private checkSeattleIntro(): void {
    if (this.seattleIntroShown) return;
    if (this.dialogue.isOpen() || this.choice.isOpen() || !this.controls.isEnabled()) return;
    const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.seattle.spawn.x, this.seattle.spawn.y);
    if (d > URIEL_SCENE.triggerRange) return;
    this.seattleIntroShown = true;
    this.controls.setEnabled(false);
    this.player.setDirection(0, 0);
    this.dialogue.open([...SEATTLE_INTRO_LINES], () => {
      this.reenableControls = true;
    });
  }

  /** The scripted Uriel cutscene: intro narration → Uriel's lines → outro, then resume. */
  private playUrielScene(): void {
    this.urielPending = false;
    this.urielArrived = true;
    this.talkButton.setVisible(false);
    this.controls.setEnabled(false);
    this.player.setDirection(0, 0);
    // A placeholder radiant figure in the square (reuses the existing 'angel-divine'
    // art — created by the Angel entity at boot — so no new art; understated).
    const fx = this.spawnUrielFigure(this.town.spawn.x, this.town.spawn.y - this.map.tileSize * 1.5);
    // intro narration → Uriel speaks → outro → dismiss + resume.
    this.dialogue.open([...URIEL_SCENE.intro], () =>
      this.dialogue.open([...URIEL_SCENE.lines], () =>
        this.dialogue.open([...URIEL_SCENE.outro], () => {
          fx.dismiss();
          this.reenableControls = true;
          this.autosave(); // a meaningful beat: Uriel has come, the old beat now opens
        }),
      ),
    );
  }

  /** A soft radiant figure + halo at (x,y); returns a dismiss handle. Reused by the
   *  Uriel arrival, the Q13 send-off, and the rift scene (no new art). */
  private spawnUrielFigure(x: number, y: number): { dismiss: () => void } {
    const glow = this.add.circle(x, y, 40, 0xfff3c0, 0).setDepth(7);
    const figure = this.add.sprite(x, y, 'angel-divine').setDepth(9).setAlpha(0);
    this.worldFx.add(glow);
    this.worldFx.add(figure);
    this.tweens.add({ targets: glow, alpha: 0.55, scale: 1.5, duration: 700, ease: 'Quad.out' });
    this.tweens.add({ targets: figure, alpha: 1, y: y - 6, duration: 700, ease: 'Quad.out' });
    this.tweens.add({ targets: glow, scale: { from: 1.5, to: 1.9 }, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    return {
      dismiss: () => {
        this.tweens.add({ targets: [glow, figure], alpha: 0, scale: 0.6, duration: 600, ease: 'Quad.in', onComplete: () => { glow.destroy(); figure.destroy(); } });
      },
    };
  }

  // --- QUEST 13 + THE RIFT SCENE (Batch 4 finale) ---------------------------
  //
  // The REAL corruption beat (replaces the retired Sasquatch/angel placeholder).
  // Q13 'the-source' auto-activates after Q12; on start, Uriel gives a pre-warning
  // send-off (below). The objective arrow points at the N-Oregon rift; reaching it
  // begins the scripted scene: approach → Semyaza (clamped near death) → the lie →
  // Uriel's counter → Semyaza's offer → THE CHOICE (the player's first line) → take
  // the Light (setPlayerPath('corrupted') + Spirit Vision) → Uriel's judgment +
  // vanish → Azazel's arrival → close → completes Q13 (descent-1 then unlocks).

  /** Q13 start: Uriel's scripted send-off, pre-warning the player about the deception. */
  private playUrielSendoff(): void {
    this.talkButton.setVisible(false);
    this.controls.setEnabled(false);
    this.player.setDirection(0, 0);
    const fx = this.spawnUrielFigure(this.player.x, this.player.y - this.map.tileSize * 1.5);
    this.dialogue.open([...URIEL_SENDOFF_LINES], () => {
      fx.dismiss();
      this.reenableControls = true;
      this.autosave();
    });
  }

  /** FINALE: reaching the N-Oregon rift while on Q13 BEGINS the rift scene (one-shot). */
  private checkRiftSceneStart(): void {
    if (this.riftSceneStarted) return;
    if (this.chain.activeQuest?.id !== 'the-source' || this.chain.activeTrigger !== 'reached-the-rift') return;
    if (this.dialogue.isOpen() || this.choice.isOpen() || !this.controls.isEnabled()) return;
    const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, OREGON_RIFT_POSITION.x, OREGON_RIFT_POSITION.y);
    if (d <= RIFT_SCENE_RANGE) this.startRiftScene();
  }

  /** (a) Approach narration, then spawn Semyaza and hand the player the fight. */
  private startRiftScene(): void {
    this.riftSceneStarted = true;
    this.talkButton.setVisible(false);
    this.controls.setEnabled(false);
    this.player.setDirection(0, 0);
    this.dialogue.open([...RIFT_SCENE.approach], () => this.riftSpawnSemyaza());
  }

  /** (b) Spawn + activate Semyaza on Earth; release controls so the player fights. */
  private riftSpawnSemyaza(): void {
    this.semyaza = this.spawnBoss(SEMYAZA_DEF, OREGON_RIFT_POSITION.x, OREGON_RIFT_POSITION.y - 40, this.map.layer);
    this.semyaza.activate();
    this.showBanner(RIFT_SCENE.fightBanner, 2200);
    this.reenableControls = true;
  }

  /** (c–f) Semyaza is HALTED near death → the lie → counter → offer → THE CHOICE →
   *  the player's first line → take the Light (corruption grant) → judgment → Azazel. */
  private startRiftLie(): void {
    if (this.riftLieFired) return;
    this.riftLieFired = true;
    this.controls.setEnabled(false);
    this.player.setDirection(0, 0);
    this.semyaza?.halt();
    // Uriel manifests at the rift for the counter + judgment (dismissed when he vanishes).
    const uriel = this.spawnUrielFigure(this.player.x + 90, this.player.y - this.map.tileSize * 1.5);

    const close = (): void => {
      this.dialogue.open([...RIFT_SCENE.close], () => {
        this.reenableControls = true;
        this.notifyQuest('reached-the-rift'); // completes Quest 13 → descent-1 (Azazel) unlocks
        this.autosave(); // CRITICAL beat: the player is now corrupted; persist it
      });
    };
    const azazel = (): void => this.dialogue.open([...RIFT_SCENE.azazel], close);
    const judgment = (): void =>
      this.dialogue.open([...RIFT_SCENE.urielJudgment], () => {
        uriel.dismiss(); // Uriel vanishes — simply gone
        azazel();
      });
    const takeLight = (): void => {
      // === THE CORRUPTION GRANT (now lives ONLY here) =========================
      this.setPlayerPath('corrupted'); // playerPath = 'corrupted' + Spirit Vision ON
      this.spirit.fadeTintIn(1200); // the "sight opens" moment
      this.awardTitle('The Forsaken');
      // =======================================================================
      this.fadeOutSemyaza(); // Semyaza smiles and fades, spent
      this.dialogue.open([...RIFT_SCENE.takeLight], judgment);
    };
    const playerLine = (): void => this.dialogue.open([...RIFT_SCENE.playerLine], takeLight);
    const presentChoice = (): void =>
      this.choice.open(RIFT_SCENE.choicePrompt, [{ label: RIFT_SCENE.choiceTake, onSelect: playerLine }]);

    // lie → Uriel's counter → Semyaza's offer → the choice.
    this.dialogue.open([...RIFT_SCENE.lie], () =>
      this.dialogue.open([...RIFT_SCENE.urielCounter], () =>
        this.dialogue.open([...RIFT_SCENE.offer], presentChoice),
      ),
    );
  }

  /** Semyaza fades out (spent) and is removed; updateBosses prunes the dead boss. */
  private fadeOutSemyaza(): void {
    const b = this.semyaza;
    if (!b) return;
    const body = b.sprite.body as Phaser.Physics.Arcade.Body;
    body.enable = false;
    this.tweens.add({
      targets: b.sprite,
      alpha: 0,
      scale: b.def.sprite.scale * 1.4,
      duration: 900,
      ease: 'Quad.out',
      onComplete: () => b.destroy(),
    });
    this.semyaza = undefined;
  }

  /**
   * Reset the WHOLE quest chain to its initial state: clear the completed record
   * and active quest, clear the awarded title, and re-arm the opening quest's
   * world prerequisites (angel, player path / Spirit Vision, the beast) so the
   * chain replays from scratch. Shared by "Reset All Quests" and the dev reset.
   */
  private resetQuestChain(): void {
    this.chain.reset();
    this.chain.evaluateUnlocks(); // opening quest available again
    this.awardTitle(null);
    this.angelEncounterFired = false;
    this.angel.dismiss();
    this.urielArrived = false;
    this.urielPending = false;
    this.setPlayerPath('neutral');
    this.spirit.setSpiritVision(false); // 'neutral' alone doesn't turn it off
    this.sasquatch.reset();
    this.clearArcObjective(); // clear any descent-arc spawns + watcher state
    // Rift scene (finale): clear its one-shots + despawn Semyaza so it can replay.
    this.riftSceneStarted = false;
    this.riftLieFired = false;
    if (this.semyaza) { this.semyaza.destroy(); this.semyaza = undefined; }
    this.guardTarget = null;
    this.clearDemonAllies(); // the 4.9 escort doesn't survive a chain reset
    this.updatePatronLocation(); // fresh chain → Azazel back at his Oregon home
    this.refreshQuestUi();
  }

  /** DEV: reset only the quest chain (closes any open dialogue/choice first). */
  private devResetQuests(): void {
    this.choice.close();
    if (this.dialogue.isOpen()) this.dialogue.forceClose();
    this.controls.setEnabled(true);
    this.player.setDirection(0, 0);
    this.resetQuestChain();
  }

  /** DEV-ONLY: full reset — the quest chain PLUS combat, progression, energy, swarms. */
  private devReset(): void {
    this.devResetQuests();

    // Skills: clear all points + unlocks + live timed effects, then progression
    // back to Lv1 / 0 XP, and the HP pool back to the (skill-adjusted) level-1 max.
    this.skillTimed = [];
    this.skillCooldownUntil = {};
    this.skillCooldownDur = {};
    this.releaseAllStuns();
    this.clearSpellHazards();
    this.clearFriendlyZones();
    this.clearEntangle();
    this.crystallize.clear();
    this.confused.clear();
    this.comboUltimate = null;
    this.voodoo = null; // WD bind state never survives a reset (summons are cleared too)
    this.allyBond = null;
    this.spiritSplit = null;
    this.parry = null; // Samurai timing state never survives a reset
    this.perfectFormUntil = 0;
    this.iaijutsu = null;
    this.pulseRing = null; // Monk state never survives a reset either
    this.actionWhiffed = false;
    this.empoweredStrikes = null;
    this.clearTraps(); // Assassin state never survives a reset either
    this.clearPriestState(); // nor the Priest's
    this.breakPlayerStealth();
    this.clearDots();
    this.summons.clear();
    this.skills.hardReset();
    this.progression.reset();
    this.requireStartingSkill(); // no base kit → re-open the forced first-skill pick
    this.recomputeSkillEffects();
    this.playerHealth.setMax(this.skillAdjustedMaxHP());
    this.playerHealth.full();

    // Combat Depth: refill energy, end any dash, and reset the swarms to their
    // dormant starting packs (Seattle rift + Oregon seed).
    this.energy.full();
    this.lastEnergySpendTime = -1e9;
    this.dashEndsAt = 0;
    this.clearSwarmers();
    this.spawnSwarmPack(this.town.rift.x, this.town.rift.y);
    this.spawnSwarmPack(OREGON_SWARM_SPAWN.x, OREGON_SWARM_SPAWN.y);

    // Clear any spawned angels and their bolts.
    this.clearAngels();

    // Clear uncollected pickups and zero the Holy Power count.
    this.pickups.clear();
    this.holyPower.reset();

    // Stop + reset any active portal-defense encounter (restores portal HP).
    this.resetPortalDefense();

    // Reset the descent climax: guardians dormant + full HP, Heaven Portal holy.
    this.resetGuardianEncounter();

    // Clear all Cherubs/Cherubim (+ their bolts), then re-seed Heaven's defenders.
    this.clearCherubs();
    this.seedHeavenCherubs();

    // Reset the Michael encounter: dormant, full HP, Phase 1, adds cleared, and
    // remove any dev-spawned framework bosses (e.g. the test boss) + their adds.
    this.resetMichael();
    this.resetSins(); // gauntlet → 0, all Sin bosses dormant/full HP, adds cleared, Sin 1 re-placed
    this.resetTrinity(); // Trinity → un-entered (Dragon/Beast gone, adds/hazards/bolts cleared)
    this.removeDevBosses();

    // Reset God's-judgment beat: gate re-locked, judgment un-fired, Hell portal gone.
    this.resetGodJudgment();

    // Revert the power swap: back to demonic (Holy Bolt hidden, aura gone).
    this.revertToDemonic();

    // Clear any active Demons, then re-seed Hell's placed grunts. (Returns to Earth below.)
    this.clearDemons();
    this.seedHellDemons();

    // Return to Earth if currently in Heaven (instant — no fade), and forget the
    // remembered Heaven position so a fresh visit starts at the arrival point.
    this.tweens.killTweensOf(this.fadeOverlay);
    this.fadeOverlay.setVisible(false).setAlpha(0);
    this.transitioning = false;
    this.worldCooldownUntil = 0;
    // Each enemy's own reset/respawn above already restored its body; discard the
    // stale paused-body list so the world swap doesn't touch destroyed bodies.
    this.pausedBodies = [];
    if (this.activeWorld !== WORLD_EARTH) this.applyWorldSwap(WORLD_EARTH, this.earthReturnPos);
    this.worldPos[WORLD_HEAVEN] = { ...this.heavenArrivalPos };
  }

  /**
   * All developer/testing tools — the on-screen collapsible DevPanel AND the
   * keyboard shortcuts (desktop convenience). Both are gated by the single
   * DEV_MODE flag in src/game/settings.ts; off → no panel, no dev keys. Each
   * panel button mirrors exactly one keyboard shortcut.
   */
  private createDevTools(): void {
    if (!DEV_MODE) return;

    const KC = Phaser.Input.Keyboard.KeyCodes;
    // Buttons carry an optional key (keyboard convenience for desktop). The two
    // panel-only actions (no key) spawn a swarm and refill energy for testing.
    const actions: { label: string; key?: number; onPress: () => void }[] = [
      // ── SUMMON TEST CLUSTER — pinned to the TOP of the panel so they're the first
      //    buttons visible on mobile (no scrolling needed to reach "Spawn Ranged Ally"). ──
      { label: 'Summon Ice Golem', onPress: () => this.summonIceGolem() },
      { label: 'Summon Skeleton', onPress: () => this.summonSkeleton() },
      { label: 'Summon Dark Matter Monster', onPress: () => this.summonDarkMatterMonster() },
      { label: 'Spawn Ranged Ally', onPress: () => this.summonRangedAlly() },
      { label: 'Buff Summons', onPress: () => this.buffSummons() },
      { label: 'Clear Summons', onPress: () => this.summons.clear() },
      // ── everything else ──
      { label: 'Grant XP', key: KC.X, onPress: () => this.gainXP(DEV_GRANT_XP_CHUNK) },
      { label: 'Instant Level-Up', key: KC.L, onPress: () => this.gainXP(this.progression.xpRemainingToLevel()) },
      { label: 'Full Heal', key: KC.H, onPress: () => this.playerHealth.full() },
      { label: 'Respawn Sasquatch', key: KC.K, onPress: () => this.sasquatch.reset() },
      { label: 'Spawn Spirit Swarm', onPress: () => this.devSpawnSwarm() },
      { label: 'Spawn Angel', onPress: () => this.devSpawnAngel('angel') },
      { label: 'Spawn Archangel', onPress: () => this.devSpawnAngel('archangel') },
      { label: 'Grant Holy Power', onPress: () => this.holyPower.add(DEV_GRANT_HOLY_POWER) },
      { label: 'Reset Holy Power', onPress: () => this.holyPower.reset() },
      { label: 'Grant Skill Points (+5)', onPress: () => this.skills.awardPoints(5) },
      { label: 'Reset Skills', onPress: () => this.devResetSkills() },
      { label: 'Set Class: Wizard', onPress: () => this.devSetClass('wizard') },
      { label: 'Set Class: Blacksmith', onPress: () => this.devSetClass('blacksmith') },
      { label: 'Set Class: Necromancer', onPress: () => this.devSetClass('necromancer') },
      { label: 'Class Override (cycle)', onPress: () => this.devCycleClassOverride() },
      { label: 'Unlock Summons Tree', onPress: () => this.devUnlockSummons() },
      { label: 'Reset Skill Trees', onPress: () => this.resetSkillTrees() },
      // Act IV enemy variants — spawn one next to the player to eyeball look/stats.
      { label: 'Spawn Lesser Angel', onPress: () => this.devSpawnAngelVariant('lesser') },
      { label: 'Spawn Warden Angel', onPress: () => this.devSpawnAngelVariant('warden') },
      { label: 'Spawn Herald Angel', onPress: () => this.devSpawnAngelVariant('herald') },
      { label: 'Spawn City Guard', onPress: () => this.devSpawnTownsfolkVariant('cityguard') },
      { label: 'Spawn Caravan Guard', onPress: () => this.devSpawnTownsfolkVariant('caravanguard') },
      { label: 'Spawn Defender', onPress: () => this.devSpawnTownsfolkVariant('defender') },
      { label: 'Spawn Bear', onPress: () => this.devSpawnTownsfolkVariant('bear') },
      { label: 'Spawn Eagle', onPress: () => this.devSpawnTownsfolkVariant('eagle') },
      { label: 'Spawn Crab', onPress: () => this.devSpawnTownsfolkVariant('crab') },
      { label: 'Toggle Aim-Assist', onPress: () => this.devToggleAimAssist() },
      { label: 'Cycle Aim Cone', onPress: () => this.devCycleAimCone() },
      { label: 'Start Portal Defense', onPress: () => this.devStartPortalDefense() },
      { label: 'Stop Portal Defense', onPress: () => this.resetPortalDefense() },
      { label: 'Refill Energy', onPress: () => this.energy.full() },
      // NOTE: the targeted "Teleport to <place>" buttons were REMOVED — the DEV QUEST
      // TAB (the QUESTS tab under DEV) now state-warps to any quest's start, which
      // covers every location these teleports reached (and sets up corruption/world/
      // power too). The remaining buttons below are the non-teleport dev tools, kept
      // as-is (many are reused by the quest jump).
      { label: 'Force Corrupt', onPress: () => this.devForceCorrupt() },
      { label: 'Jump to Rift Scene (Q13)', onPress: () => this.devJumpToRift() },
      { label: 'Start Guardian Fight', onPress: () => this.startGuardianFight() },
      { label: 'Reset Portal', onPress: () => this.resetGuardianEncounter() },
      { label: 'Spawn Cherub', onPress: () => this.devSpawnCherub('cherub') },
      { label: 'Spawn Cherubim', onPress: () => this.devSpawnCherub('cherubim') },
      { label: 'Smite All (Dev)', onPress: () => this.devSmite(true) },
      { label: 'Smite Adds (Dev)', onPress: () => this.devSmite(false) },
      { label: 'Start Michael Fight', onPress: () => this.startMichaelFight() },
      { label: 'Reset Michael', onPress: () => this.resetMichael() },
      { label: 'Spawn Test Boss', onPress: () => this.devSpawnTestBoss() },
      { label: "Trigger God's Judgment", onPress: () => this.devTriggerGodJudgment() },
      { label: 'Reset Judgment', onPress: () => this.resetGodJudgment() },
      { label: 'Grant Holy Power (swap to holy)', onPress: () => this.swapToHoly() },
      { label: 'Reset to Demonic', onPress: () => this.revertToDemonic() },
      { label: 'Go to Hell', onPress: () => this.devGoToHell() },
      { label: 'Spawn Demon', onPress: () => this.devSpawnDemon() },
      { label: 'Start Wrath', onPress: () => this.devStartSin(0) },
      { label: 'Start Sloth', onPress: () => this.devStartSin(1) },
      { label: 'Start Gluttony', onPress: () => this.devStartSin(2) },
      { label: 'Start Envy', onPress: () => this.devStartSin(3) },
      { label: 'Start Pride', onPress: () => this.devStartSin(4) },
      { label: 'Start Greed', onPress: () => this.devStartSin(5) },
      { label: 'Start Lust', onPress: () => this.devStartSin(6) },
      { label: 'Reset Sins', onPress: () => this.resetSins() },
      { label: 'Enter Lair / Start Trinity', onPress: () => this.devEnterLair() },
      { label: 'Start Dragon', onPress: () => this.devStartTrinityBoss('dragon') },
      { label: 'Start Beast', onPress: () => this.devStartTrinityBoss('beast') },
      { label: 'Start Satan', onPress: () => this.devStartTrinityBoss('satan') },
      { label: 'Trigger Ending', onPress: () => this.devTriggerEnding() },
      { label: 'Spawn Ending Earth Portal', onPress: () => this.devSpawnEndingPortal() },
      { label: 'Reset Trinity', onPress: () => this.resetTrinity() },
      { label: 'Go to Heaven', onPress: () => this.devGoToHeaven() },
      { label: 'Return to Earth', onPress: () => this.devReturnToEarth() },
      { label: 'Toggle World', onPress: () => this.devToggleWorld() },
      { label: 'Travel: Egypt', onPress: () => this.devTravelEgypt() },
      { label: 'Travel: Earth', onPress: () => this.devTravelEarth() },
      { label: 'Travel: Mt Sinai', onPress: () => this.devTravelMtSinai() },
      { label: 'Travel: Europe (Rome)', onPress: () => this.devTravelEurope() },
      { label: 'Test City Arrow (cycle)', onPress: () => this.devCycleCityArrowTest() },
      { label: 'Complete Active Quest', onPress: () => this.chain.completeActive() },
      { label: 'Reset All Quests', onPress: () => this.devResetQuests() },
      { label: 'Save Now', onPress: () => this.manualSave() },
      { label: 'Load Save', onPress: () => this.devLoadSave() },
      { label: 'Delete Save', onPress: () => this.devDeleteSave() },
      { label: 'Dev Reset', key: KC.R, onPress: () => this.devReset() },
    ];

    const kb = this.input.keyboard;
    for (const a of actions) if (a.key !== undefined) kb?.addKey(a.key).on('down', a.onPress);

    new DevPanel(this, actions.map((a) => ({ label: a.label, onPress: a.onPress })), {
      rows: () => this.questTabRows(),
      onJump: (id) => this.devJumpToQuest(id),
    });
  }

  // --- DEV QUEST TAB: list the full chain + STATE-WARP to any quest's start --------
  //
  // The QUESTS tab (under the DEV tab) opens a paused, scrollable list of the whole
  // quest chain grouped by act, each marked complete/active, and a tap warps the game
  // to that quest's start. This replaces the removed targeted "Teleport to <place>"
  // buttons: one jump sets corruption, world, position, power, and the active quest.

  /** Static display metadata (act group + short chain code) per quest id, in registry order. */
  private static readonly QUEST_TAB_META: Record<string, { group: string; code: string }> = {
    'honest-days-work': { group: 'Act I — Enumclaw', code: '1' },
    'wolves-tree-line': { group: 'Act I — Enumclaw', code: '2' },
    shallows: { group: 'Act I — Enumclaw', code: '3' },
    'the-pass': { group: 'Act I — Enumclaw', code: '4' },
    'whats-gotten-into-them': { group: 'Act II — The Corruption', code: '5' },
    'the-blight': { group: 'Act II — The Corruption', code: '6' },
    'the-thing-at-white-pass': { group: 'Act II — The Corruption', code: '7' },
    'word-to-yakima': { group: 'Investigation', code: '8' },
    'the-iron-road': { group: 'Investigation', code: '9' },
    'the-northern-farms': { group: 'Investigation', code: '10' },
    'what-the-dark-ones-carry': { group: 'Investigation', code: '11' },
    'the-exile-of-longview': { group: 'Investigation', code: '12' },
    'the-source': { group: 'The Source (rift)', code: '13' },
    'act4-what-they-wont-give': { group: 'Act IV — Oregon', code: '4.1' },
    'act4-watchers-on-the-road': { group: 'Act IV — Oregon', code: '4.2' },
    'act4-the-trade-day': { group: 'Act IV — Oregon', code: '4.3' },
    'act4-salt-and-sea': { group: 'Act IV — Oregon', code: '4.4' },
    'act4-the-door-they-came-through': { group: 'Act IV — Idaho', code: '4.5' },
    'act4-olympia': { group: 'Act IV — Idaho', code: '4.5b' },
    'act4-poison-the-well': { group: 'Act IV — Idaho', code: '4.6' },
    'act4-the-heart-of-each-city': { group: 'Act IV — Idaho', code: '4.7' },
    // The Act IV FINALE replaces the retired descent-1..4 + climax-defiled-gate.
    'act4-draw-them-down': { group: 'Act IV — The Finale', code: '4.8' },
    'act4-the-door-home': { group: 'Act IV — The Finale', code: '4.9' },
    'act4-heaven': { group: 'Act IV — The Finale', code: '4.10' },
    'climax-judgment': { group: 'The Climax', code: 'C1' },
    'climax-seven-sins': { group: 'The Climax', code: 'C2' },
  };

  /** Snapshot the full quest chain for the DEV quest tab (called fresh on each open). */
  private questTabRows(): QuestTabRow[] {
    const rows = QUEST_REGISTRY.map((q) => {
      const meta = MainScene.QUEST_TAB_META[q.id] ?? { group: 'Other', code: '' };
      const st = this.chain.status(q.id);
      return {
        id: q.id,
        group: meta.group,
        code: meta.code,
        title: q.title,
        completed: st === 'complete',
        active: st === 'active',
      };
    });
    // FACTORY-REGISTERED chains (built Europe zones): appended after the
    // hand-authored chain, grouped by zone, coded by beat position.
    for (const zoneId of EUROPE_BUILT_ZONES) {
      const zone = getZone(zoneId);
      if (!zone) continue;
      zone.questChain.forEach((beat, i) => {
        const st = this.chain.status(beat.id);
        rows.push({
          id: beat.id,
          group: zone.displayName,
          code: `${i + 1}`,
          title: beat.title,
          completed: st === 'complete',
          active: st === 'active',
        });
      });
    }
    return rows;
  }

  /**
   * DEV STATE-WARP to a quest's start. Marks every EARLIER quest (chain order)
   * complete, applies the stateful prerequisites by range (corruption / power / Holy
   * Power / endgame gates), loads the correct world + a safe walkable position near
   * the first objective's target, activates the quest at objective 0, and refreshes
   * the tracker / marker / arrow. Synchronous (it may run while the quest tab pauses
   * the scene), so it uses applyWorldSwap directly rather than the tweened travel.
   *
   * Robust: any unresolved position falls back to the target world's defaultArrival,
   * and the quest is always left ACTIVE — it never soft-locks or lands out of bounds.
   */
  private devJumpToQuest(targetId: string): void {
    const order = QUEST_REGISTRY.map((q) => q.id);
    const ti = order.indexOf(targetId);
    const def = this.chain.get(targetId);
    if (!def) return;
    if (ti < 0) {
      // Not in the hand-authored chain → a FACTORY-REGISTERED (Europe) beat.
      this.devJumpToFactoryBeat(targetId, def);
      return;
    }

    const JUMP_APPROACH_OFFSET = 280; // place the player S of the target (clear of 'reach' range + enemy ring)
    const JUMP_HOLY_POWER = 60; // safe Holy Power buffer for endgame plunder/relic beats

    // --- Stateful prerequisites by chain range -------------------------------
    // Corruption is granted at the rift (completing 'the-source'), so everything
    // AFTER it begins corrupted; 'the-source' and earlier do not.
    const corrupted = ti > order.indexOf('the-source');
    // The demonic→holy swap happens at the throne (mid climax-judgment); only the
    // post-throne Hell gauntlet begins holy.
    const holy = targetId === SEVEN_SINS_QUEST_ID;

    // Pre-satisfy narrative one-shots so a jump never replays an old cutscene/gate.
    this.urielPending = false;
    this.urielArrived = true;
    this.seattleIntroShown = true;
    this.riftLieFired = corrupted;
    this.riftSceneStarted = corrupted; // the rift is behind us once corrupted
    if (this.semyaza) { this.semyaza.destroy(); this.semyaza = undefined; }
    // The 4.9 demon escort never travels across jumps (a jump TO 4.9 re-spawns a
    // fresh squad via its 'started' event).
    this.clearDemonAllies();

    // Corruption (drives Spirit Vision + the patron's offers + conditional dialogue).
    if (corrupted) this.setPlayerPath('corrupted');
    else { this.setPlayerPath('neutral'); this.spirit.setSpiritVision(false); }

    // Power state: holy (Holy Bolt + golden kit) only for the post-throne gauntlet.
    if (holy) this.swapToHoly(); else this.revertToDemonic();

    // Holy Power buffer (the Act IV finale onward) since we skip the prior quests'
    // reward grants (4.2/4.4/4.6/4.7 Light) — keeps endgame beats comfortable.
    if (ti >= order.indexOf(ACT4_DRAW_ID) && this.holyPower.count < JUMP_HOLY_POWER) {
      this.holyPower.add(JUMP_HOLY_POWER - this.holyPower.count);
    }

    // Endgame gate flags so the target quest lands mid-flow, not re-doing earlier beats.
    if (targetId === ACT4_DOOR_HOME_ID) {
      this.resetGuardianEncounter(); // the assault ends at a FRESH gate (guardians dormant)
      this.resetGodJudgment();
    } else if (targetId === ACT4_HEAVEN_ID || targetId === 'climax-judgment') {
      this.guardianPhase = 'corrupted'; // the Heaven gate is already defiled behind us
      this.michaelDefeated = false;
      this.judgmentFired = false;
      this.judgmentActive = false;
      this.hellPortal?.destroy();
      this.hellPortal = undefined;
    } else if (targetId === SEVEN_SINS_QUEST_ID) {
      this.guardianPhase = 'corrupted';
      this.michaelDefeated = true; // judgment already happened (we're past the throne)
      this.judgmentFired = true;
      this.judgmentActive = false;
    }

    // --- Chain state FIRST (prior quests complete), so progress-gated things
    // (Azazel's station, the 'outpost' hub) resolve correctly for the placement.
    // load() clears the active quest; autoActivate targets may self-accept on the
    // 'unlocked' event this fires — accept() below is then a harmless no-op.
    this.chain.load({ completed: order.slice(0, ti), activeId: null, activeObjective: 0 });
    this.updatePatronLocation();

    // --- World + position (synchronous swap; we may be paused) ----------------
    const obj0 = def.objectives[0];
    const world: WorldId = obj0?.target ? TARGET_WORLD[obj0.target] : WORLD_EARTH;
    const dest = this.jumpApproachPos(def, world, JUMP_APPROACH_OFFSET);
    if (this.activeWorld !== world) {
      this.applyWorldSwap(world, dest); // instant core swap (bounds/camera/zoom/bodies)
    } else {
      this.cancelDash();
      this.player.sprite.setPosition(dest.x, dest.y);
      this.player.setDirection(0, 0);
      this.cameras.main.centerOn(dest.x, dest.y);
    }

    // --- Activate the target quest at objective 0 ----------------------------
    // accept() fires 'started' → handleQuestEvent sets up arc objective 0 (spawns
    // enemies — and 4.9's demon escort — in the now-correct world).
    this.chain.accept(targetId);

    // Arrive at full HP/energy so the jump always lands playable (dev convenience).
    this.playerHealth.full();
    this.energy.full();

    this.refreshQuestUi();
    this.updateObjectiveMarker();
    this.showBanner(`Jumped to: ${def.title}`, 2200);
  }

  /**
   * DEV STATE-WARP for a FACTORY-REGISTERED beat (built Europe zones): satisfies
   * the beat's prerequisite CLOSURE (one arm per anyOf slot is enough — arms that
   * exist in the live chain are preferred), sets the dev class override when the
   * beat is class-gated and the current class doesn't satisfy it (announced in
   * the banner), travels the player to the beat's zone chunk (synchronous swap —
   * the quest tab pauses the scene), and activates the beat at objective 0.
   * The hand-authored NA jump path above is untouched.
   */
  private devJumpToFactoryBeat(targetId: string, def: QuestDef): void {
    const zone = WORLD.find((z) => z.questChain.some((b) => b.id === targetId));
    if (!zone || !(EUROPE_BUILT_ZONES.includes(zone.id) || AFRICA_BUILT_ZONES.includes(zone.id) || ASIA_BUILT_ZONES.includes(zone.id) || FINAL_REGIONS_BUILT_ZONES.includes(zone.id))) return;

    // Class gate: satisfy it via the dev override if needed, and say so.
    if (def.classRequirement) {
      const current = (this.devClassOverride ?? MANIFEST_CLASS_FOR[this.classId] ?? this.classId).toLowerCase();
      if (current !== def.classRequirement.toLowerCase()) {
        const name = def.classRequirement.charAt(0).toUpperCase() + def.classRequirement.slice(1);
        this.devClassOverride = name;
        this.showBanner(`DEV: class override → ${name} (this chain is ${name}-only)`, 2400);
      }
    }
    this.announcePlayerClass();

    // Prerequisite closure: any ONE arm of an anyOf group satisfies its slot.
    const completed = new Set<string>();
    const walk = (id: string): void => {
      const d = this.chain.get(id);
      if (!d) return;
      for (const p of d.prerequisites) {
        const arms = typeof p === 'string' ? [p] : p.anyOf;
        const pick = arms.find((a) => !!this.chain.get(a)) ?? arms[0];
        if (!pick || completed.has(pick)) continue;
        completed.add(pick);
        walk(pick);
      }
    };
    walk(targetId);
    this.clearDemonAllies(); // no stale escorts across any dev jump
    this.chain.load({ completed: [...completed], activeId: null, activeObjective: 0 });

    // Travel to the beat's zone (synchronous; we may be paused under the tab).
    // PRE-EXISTING zones (Cairo → the hand-built Egypt world) travel to their
    // real world; everything else goes to its continent's region world.
    const targetWorld = (PREBUILT_ZONE_WORLD[zone.id] ?? CONTINENT_WORLD[zone.continent]) as WorldId;
    const dest = this.regionZoneArrivals[zone.id] ?? this.worlds[targetWorld]?.defaultArrival;
    if (dest) {
      if (this.activeWorld !== targetWorld) {
        this.applyWorldSwap(targetWorld, dest);
      } else {
        this.cancelDash();
        this.player.sprite.setPosition(dest.x, dest.y);
        this.player.setDirection(0, 0);
        this.cameras.main.centerOn(dest.x, dest.y);
      }
    }

    // Activate at objective 0 (a no-op if auto-activation already started it).
    this.chain.accept(targetId);
    this.playerHealth.full();
    this.energy.full();
    this.refreshQuestUi();
    this.updateObjectiveMarker();
    this.showBanner(`Jumped to: ${def.title} (${zone.displayName})`, 2200);
  }

  /** Walkable world position near a quest's first-objective target (offset S so a
   *  'reach'/proximity objective isn't instantly tripped), with safe fallbacks. */
  private jumpApproachPos(def: QuestDef, world: WorldId, offset: number): { x: number; y: number } {
    const obj0 = def.objectives[0];
    const base = (obj0?.target ? this.resolveTarget(obj0.target) : null) ?? {
      x: this.worlds[world].defaultArrival.x,
      y: this.worlds[world].defaultArrival.y,
      label: '',
    };
    return this.worlds[world].map.nearestWalkableWorld(base.x, base.y + offset);
  }

  // --- Quest ----------------------------------------------------------------

  /**
   * Feed a world event to the active quest. The chain advances only if the
   * trigger matches its current objective, emitting events that drive the reward.
   */
  private notifyQuest(trigger: ObjectiveTrigger): void {
    this.chain.notify(trigger);
  }

  /** Store and display the single alignment-title string on the HUD. */
  private awardTitle(title: string | null): void {
    this.currentTitle = title;
    this.titleText.setText(title ? `Title: ${title}` : '').setVisible(!!title);
  }

  /** Sync the tracker panel to the active quest in the chain (+ live arc progress). */
  private refreshQuestUi(): void {
    const q = this.chain.activeQuest;
    if (q) {
      const obj = this.chain.activeObjectiveDef;
      this.tracker.show(q.title, (obj ? obj.text : '') + this.arcProgressSuffix());
    } else {
      this.tracker.hide();
    }
  }

  /** A live "(N left)" / "(Holy Power x/y)" suffix for arc objectives (Act I + descent). */
  private arcProgressSuffix(): string {
    // Europe kill counters (clear / eu-10 harvest) show the same live style.
    const eu = this.regionBeatForQuest(this.chain.activeQuest?.id);
    if (eu && eu.beat.archetype === 'clear') {
      return `  (kills ${Math.min(this.regionKillCounts[eu.beat.id] ?? 0, EUROPE_CLEAR_KILLS)}/${EUROPE_CLEAR_KILLS})`;
    }
    if (eu && eu.beat.archetype === 'portal_approach') {
      return `  (light ${Math.min(this.regionKillCounts[eu.beat.id] ?? 0, EUROPE_HARVEST_KILLS)}/${EUROPE_HARVEST_KILLS})`;
    }
    if (!this.isArcActive()) return '';
    if (this.arcMode === 'defeat') {
      const left = this.arcEnemies.filter((e) => e.isAlive).length;
      return `  (${left} left)`;
    }
    if (this.arcMode === 'plunder') {
      const got = Math.min(this.holyPower.count - this.arcHolyBaseline, this.arcHolyRequired);
      const left = this.arcEnemies.filter((e) => e.isAlive).length;
      return `  (Holy Power ${Math.max(0, got)}/${this.arcHolyRequired}, ${left} angels left)`;
    }
    if (this.arcMode === 'gather') {
      return `  (salt ${Math.min(this.arcGatherCount, this.arcGatherRequired)}/${this.arcGatherRequired})`;
    }
    return '';
  }

  /**
   * Self-healing activation for the auto-activate (main-story climax) quests, run
   * every frame in EVERY world. These quests have no NPC giver, so they must start
   * themselves — and the chain must never lag behind the player's actual world.
   *
   * This is the robust fix for "no quest arrow in Heaven": Quest 6's activation used
   * to hang entirely off the single one-shot `entered-heaven` event firing inside the
   * world-transition tween. If that was ever missed — a loaded save (chain.load runs
   * before activeWorld is set), a player who reached Heaven on an older build with no
   * climax quests, or any re-entrancy — Quest 6 never activated and the marker stayed
   * null. Now:
   *   1) If NO quest is active, start the first AVAILABLE auto-activate quest.
   *   2) Fast-forward an active climax quest past any objective whose target world the
   *      player has ALREADY moved beyond (forward-march), so the active objective's
   *      world always matches where the player actually is. In a clean playthrough
   *      step (2) never triggers; it only catches the chain up after a skip / stale save.
   * NPC-given quests (opening + descent) are never auto-activated (no autoActivate flag).
   */
  private updateClimaxQuestActivation(): void {
    // Guard caps the per-frame catch-up; the worst case (a fully-stale save in Hell
    // fast-forwarding Quests 5+6 and all of Quest 7's Sin objectives) is ~16 steps.
    let guard = 0;
    while (guard++ < 32) {
      if (!this.chain.activeQuest) {
        // (1) Start the next available auto-activate quest, if any.
        // Scan the CHAIN's registry (hand-authored + composed Europe quests), not
        // the base constant — same order/behavior for all existing content.
        const next = this.chain.firstAvailableAuto();
        if (!next) break;
        this.acceptQuest(next.id);
      }
      const q = this.chain.activeQuest;
      if (!q?.autoActivate) break; // NPC quest or none → leave it alone
      const obj = this.chain.activeObjectiveDef;
      if (!obj?.target) break;
      // (2) World catch-up: if this objective's world is one we've already moved
      //     beyond, complete it and re-check (forward-march; stale saves / skips).
      if (this.worldOrder(TARGET_WORLD[obj.target]) < this.worldOrder(this.activeWorld)) {
        this.notifyQuest(obj.trigger);
        continue;
      }
      // (3) Quest 7 Sin lockstep: keep the per-Sin objective index in sync with the
      //     gauntlet cursor (sinsDefeated) — covers stale saves / out-of-quest kills.
      //     `current-sin` already resolves live, so the arrow is right regardless;
      //     this just keeps the tracker TEXT on the matching Sin.
      if (q.id === SEVEN_SINS_QUEST_ID && obj.trigger === 'sin-defeated' && this.chain.activeObjectiveIndex < this.sins.count) {
        this.notifyQuest('sin-defeated');
        continue;
      }
      break;
    }
  }

  /** Forward-march ordering of the worlds (terrestrial → Heaven → Hell) for quest
   *  catch-up. Egypt sits WITH Earth at order 0: being there never fast-forwards
   *  the chain past Earth objectives (nor vice versa). */
  private worldOrder(w: WorldId): number {
    return this.isTerrestrial(w) ? 0 : w === WORLD_HEAVEN ? 1 : 2;
  }

  /** Terrestrial (ground-level, Earth-like) worlds run the full per-frame path in
   *  update() — doors, interactions, arcs, angels, townsfolk. Nested CITIES are
   *  terrestrial too (their NPCs/doors work like any ground world). */
  private isTerrestrial(w: WorldId): boolean {
    return w === WORLD_EARTH || w === WORLD_EGYPT || w === WORLD_GLOBE || !!this.cityRuntimes[w];
  }

  /** Position the world marker on the current target and update the edge arrow. */
  private updateObjectiveMarker(): void {
    const t = this.currentMarkerTarget();
    if (t) this.marker.show(t.x, t.y, t.label);
    else this.marker.hide();
    this.tracker.updateArrow(this.cameras.main, t);
  }

  /**
   * Where the objective marker should point right now, or null for none.
   *
   * WORLD-AWARE (Guidance Build 1): the gold beacon + the off-screen edge arrow
   * show the active objective's target ONLY when the player is in the SAME world
   * as that target (TARGET_WORLD). In a different world we point at nothing — no
   * cross-world arrows — so e.g. once the player drops into Hell, Quest 6's last
   * (Heaven) target stops drawing and the Sin beacon owns the screen. This works
   * in Heaven and Hell now, not just Earth (the marker layer + the tracker arrow
   * already render in any world; only this gate was Earth-only before).
   */
  private currentMarkerTarget(): { x: number; y: number; label: string } | null {
    // DEV "Test City Arrow": a fake objective exercising the hierarchical gate
    // waypoints without a real quest (cycled from the dev panel; dev-only).
    if (this.devArrowTarget) {
      const t = this.devArrowTarget;
      if (t.world === this.activeWorld) return { x: t.x, y: t.y, label: t.label };
      return this.cityWaypointToward(t.world);
    }
    // Active quest → its current objective's world target, if we're in its world.
    const active = this.chain.activeQuest;
    if (active) {
      const obj = this.chain.activeObjectiveDef;
      if (!obj || !obj.target) return null;
      if (TARGET_WORLD[obj.target] !== this.activeWorld) {
        // HIERARCHICAL WAYPOINT CHAINING: a target inside a nested city routes
        // via the city gates (entrance from the parent map; the exit gate from
        // inside). Non-city cross-world targets keep today's behavior (null —
        // no cross-world arrows between Earth/Heaven/Hell).
        return this.cityWaypointToward(TARGET_WORLD[obj.target]);
      }
      return this.resolveTarget(obj.target);
    }
    // No active quest → the pre-accept pointer to the next OFFERABLE quest's giver.
    // Givers live in TERRESTRIAL worlds (all on Earth today; Egypt givers come with
    // its questline), so this applies in any terrestrial world — but only points at
    // givers standing in the ACTIVE world (no cross-world arrows). Auto-activating
    // climax quests have no giver and need no pre-accept pointer.
    if (!this.isTerrestrial(this.activeWorld)) return null;
    // Act II finale: between Q7 and Uriel's arrival, point the player back to the square.
    if (this.activeWorld === WORLD_EARTH && this.urielPending && !this.urielArrived) {
      return { x: this.town.spawn.x, y: this.town.spawn.y, label: 'Return to Enumclaw' };
    }
    const b = this.activeMap().bounds;
    for (const g of this.questGivers) {
      const offer = this.offerableQuest(g);
      if (offer) {
        const p = g.pos();
        // Skip a giver who lives in a different world's coordinate region.
        if (p.x < b.x || p.x > b.x + b.width || p.y < b.y || p.y > b.y + b.height) continue;
        return { x: p.x, y: p.y, label: offer.preAcceptHint };
      }
    }
    return null;
  }

  /** Resolve a quest objective's TargetKind to a world position for the marker. */
  private resolveTarget(target: TargetKind): { x: number; y: number; label: string } | null {
    switch (target) {
      // --- Act I (Enumclaw opening) locations ---
      case 'olympia':
        return { x: OLYMPIA_POSITION.x, y: OLYMPIA_POSITION.y, label: '' };
      case 'tree-line':
        return { x: TREE_LINE_POSITION.x, y: TREE_LINE_POSITION.y, label: '' };
      case 'tacoma-beach':
        return { x: TACOMA_BEACH_POSITION.x, y: TACOMA_BEACH_POSITION.y, label: '' };
      case 'snoqualmie-pass':
        return { x: SNOQUALMIE_PASS_POSITION.x, y: SNOQUALMIE_PASS_POSITION.y, label: '' };
      // --- Act II (corruption escalation) locations ---
      case 'pells-farm':
        return { x: PELLS_FARM_POSITION.x, y: PELLS_FARM_POSITION.y, label: '' };
      case 'corrupted-grove':
        return { x: CORRUPTED_GROVE_POSITION.x, y: CORRUPTED_GROVE_POSITION.y, label: '' };
      case 'whitepass-farm':
        return { x: WHITEPASS_FARM_POSITION.x, y: WHITEPASS_FARM_POSITION.y, label: '' };
      // --- Investigation arc locations ---
      case 'yakima':
        return { x: YAKIMA_POSITION.x, y: YAKIMA_POSITION.y, label: '' };
      case 'lake-chelan':
        return { x: LAKE_CHELAN_POSITION.x, y: LAKE_CHELAN_POSITION.y, label: '' };
      case 'bellingham':
        return { x: BELLINGHAM_FARMS_POSITION.x, y: BELLINGHAM_FARMS_POSITION.y, label: '' };
      case 'cascades':
        return { x: CASCADES_POSITION.x, y: CASCADES_POSITION.y, label: '' };
      case 'seattle':
        // Q11 obj2 points at Alder (the vessel-examiner) in the Druid city.
        return { x: this.alderNpc.sprite.x, y: this.alderNpc.sprite.y, label: '' };
      case 'longview':
        // Q12 points at Mire (reach + verdict are at the same Longview spot).
        return { x: this.mireNpc.sprite.x, y: this.mireNpc.sprite.y, label: '' };
      case 'oregon-rift':
        // Q13 — the source, in the N-Oregon high country (reaching it begins the rift scene).
        return { x: OREGON_RIFT_POSITION.x, y: OREGON_RIFT_POSITION.y, label: '' };
      case 'sasquatch':
        return this.sasquatch.isAlive ? { x: this.sasquatch.x, y: this.sasquatch.y, label: '' } : null;
      case 'rift':
        return { x: this.town.rift.x, y: this.town.rift.y, label: '' };
      case 'npc':
        return { x: this.npc.sprite.x, y: this.npc.sprite.y, label: '' };
      // --- Act IV (4.1–4.4) locations ---
      case 'bend':
        return { x: BEND_POSITION.x, y: BEND_POSITION.y, label: '' };
      case 'la-grande':
        return { x: LA_GRANDE_POSITION.x, y: LA_GRANDE_POSITION.y, label: '' };
      case 'caravan-route':
        return { x: CARAVAN_ROUTE_POSITION.x, y: CARAVAN_ROUTE_POSITION.y, label: '' };
      case 'florence':
        return { x: FLORENCE_POSITION.x, y: FLORENCE_POSITION.y, label: '' };
      case 'roseburg':
        // 4.4b points at the cleric (reach + deliver are at the same Roseburg spot).
        return { x: this.clericNpc.sprite.x, y: this.clericNpc.sprite.y, label: '' };
      // --- Act IV (4.5–4.7) Idaho-leg locations ---
      case 'kamiah':
        // 4.5 — the patron's new outpost (reuses the Dark Outpost coord; Azazel stands there).
        return { x: KAMIAH_POSITION.x, y: KAMIAH_POSITION.y, label: '' };
      case 'river-1':
        return { x: RIVER_1_POSITION.x, y: RIVER_1_POSITION.y, label: '' };
      case 'river-2':
        return { x: RIVER_2_POSITION.x, y: RIVER_2_POSITION.y, label: '' };
      case 'river-3':
        return { x: RIVER_3_POSITION.x, y: RIVER_3_POSITION.y, label: '' };
      case 'city-1':
        return { x: CITY_1_POSITION.x, y: CITY_1_POSITION.y, label: '' };
      case 'city-2':
        return { x: CITY_2_POSITION.x, y: CITY_2_POSITION.y, label: '' };
      case 'city-3':
        return { x: CITY_3_POSITION.x, y: CITY_3_POSITION.y, label: '' };
      // --- ACT IV FINALE (4.8–4.10) locations ---
      case 'boise':
        return { x: BOISE_POSITION.x, y: BOISE_POSITION.y, label: '' };
      case 'catapult-1':
        return { x: CATAPULT_1_POSITION.x, y: CATAPULT_1_POSITION.y, label: '' };
      case 'catapult-2':
        return { x: CATAPULT_2_POSITION.x, y: CATAPULT_2_POSITION.y, label: '' };
      case 'catapult-3':
        return { x: CATAPULT_3_POSITION.x, y: CATAPULT_3_POSITION.y, label: '' };
      case 'azazel-heaven':
        // 4.10 — Azazel's LIVE position (relocated to Heaven once 4.9 completes).
        return this.oregonSpirit
          ? { x: this.oregonSpirit.x, y: this.oregonSpirit.y, label: '' }
          : { x: this.heavenArrivalPos.x, y: this.heavenArrivalPos.y, label: '' };
      case 'outpost':
        // The patron's hub — progress-gated (Oregon through 4.4, Kamiah from 4.5 on).
        return { x: this.patronHubPos().x, y: this.patronHubPos().y, label: '' };
      case 'oregon-city':
        return { x: OREGON_CITY_POSITION.x, y: OREGON_CITY_POSITION.y, label: '' };
      case 'farm-field':
        return { x: FARM_FIELD_POSITION.x, y: FARM_FIELD_POSITION.y, label: '' };
      case 'shipment':
        return this.arcShipmentPos
          ? { x: this.arcShipmentPos.x, y: this.arcShipmentPos.y, label: '' }
          : { x: FARM_FIELD_POSITION.x, y: FARM_FIELD_POSITION.y, label: '' };
      case 'loc-a':
        return { x: DESCENT_LOC_A.x, y: DESCENT_LOC_A.y, label: '' };
      case 'loc-b':
        return { x: DESCENT_LOC_B.x, y: DESCENT_LOC_B.y, label: '' };
      // --- Climax arc (the Holy Outpost is on Earth; the rest are in Heaven) ---
      case 'holy-outpost':
        return { x: HOLY_OUTPOST_POSITION.x, y: HOLY_OUTPOST_POSITION.y, label: '' };
      case 'michael':
        return { x: this.michael.x, y: this.michael.y, label: '' };
      case 'throne':
        return { x: this.thronePos.x, y: this.thronePos.y, label: '' };
      case 'hell-portal':
        // The Hell portal opens at the throne once judgment fires; before then,
        // fall back to the throne position so the arrow never goes blank mid-quest.
        return this.hellPortal
          ? { x: this.hellPortal.x, y: this.hellPortal.y, label: '' }
          : { x: this.thronePos.x, y: this.thronePos.y, label: '' };
      case 'current-sin':
        return this.currentSinPosition();
      case 'satan-lair': {
        const o = this.hellMap.bounds;
        return { x: o.x + SATAN_LAIR.x, y: o.y + SATAN_LAIR.y, label: '' };
      }
    }
  }

  /**
   * World position of the gauntlet's CURRENT (next undefeated, unlocked) Sin —
   * the live boss if it's spawned, else its data placement. Lockstep with the
   * gauntlet cursor (`sinsDefeated`), so Quest 7's arrow always tracks the right
   * Sin. Falls back to the lair once all seven are down.
   */
  private currentSinPosition(): { x: number; y: number; label: string } {
    const o = this.hellMap.bounds;
    const i = this.sins.nextIndex;
    if (i < 0) return { x: o.x + SATAN_LAIR.x, y: o.y + SATAN_LAIR.y, label: '' };
    const boss = this.sinBosses[i];
    if (boss && boss.isAlive) return { x: boss.x, y: boss.y, label: '' };
    const def = SIN_DEFS[i];
    return { x: o.x + def.placement.x, y: o.y + def.placement.y, label: '' };
  }

  /** The awarded-title HUD line (top-left, just under the health bar + readout). */
  private createQuestHud(): void {
    this.titleText = this.add
      .text(0, 0, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        color: '#ffd24a',
        fontStyle: 'bold',
        backgroundColor: 'rgba(8, 16, 28, 0.55)',
        padding: { x: 6, y: 4 },
      })
      .setScrollFactor(0)
      .setDepth(2000)
      .setVisible(false);

    const layout = (): void => {
      const insets = getInsets(this);
      // Below the 3-line debug readout (which starts at +33). Only ever visible
      // once the quest is complete, by which point the tracker has hidden.
      this.titleText.setPosition(insets.left + UI_MARGIN, insets.top + UI_MARGIN + 95);
    };
    layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, layout);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, layout)); // never leak across scene restarts
  }

  /**
   * The Holy Power counter — a fixed, right-anchored HUD readout in the TOP-RIGHT
   * corner. It is HIDDEN through the entire normal game (town, Acts I–IV, the
   * descent) and only SHOWN once the player is in the holy-powered endgame state
   * (after the throne power-swap, `this.power.isHoly`) — the Heaven→throne→Hell
   * stretch where Holy Power / the Holy Bolt actually matter. Routed through the UI
   * camera (fixed across zoom).
   */
  private createHolyPowerHud(): void {
    this.holyPowerText = this.add
      .text(0, 0, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        color: '#ffe06a',
        fontStyle: 'bold',
        backgroundColor: 'rgba(8, 16, 28, 0.5)',
        padding: { x: 6, y: 4 },
      })
      .setOrigin(1, 0) // right-anchored
      .setScrollFactor(0)
      .setDepth(2000)
      .setVisible(false); // gated on the holy endgame state (see refreshHolyPowerUi)

    const layout = (): void => {
      const insets = getInsets(this);
      this.holyPowerText.setPosition(this.scale.width - insets.right - UI_MARGIN, insets.top + UI_MARGIN + 4);
    };
    layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, layout);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, layout)); // never leak across scene restarts
  }

  /** Refresh the Holy Power counter + gate its visibility to the holy endgame. Called
   *  on every count change and whenever the power state flips (swap to holy / revert). */
  private refreshHolyPowerUi(): void {
    this.holyPowerText.setText(`✦ Holy Power: ${this.holyPower.count}`);
    this.holyPowerText.setVisible(this.power.isHoly);
  }

  // --- Building interior transitions ---------------------------------------

  private enterInterior(door: DoorFeature): void {
    this.controls.setEnabled(false);
    this.player.setDirection(0, 0);
    this.talkButton.setVisible(false);
    this.input.enabled = false;
    this.scene.setVisible(false);
    this.scene.launch('InteriorScene', {
      interiorId: door.interiorId,
      returnX: door.returnX,
      returnY: door.returnY,
    });
    this.scene.pause();
  }

  /** Called by InteriorScene after it resumes this scene. */
  returnFromInterior(x: number, y: number): void {
    this.player.sprite.setPosition(x, y);
    this.player.setDirection(0, 0);
    this.portalCooldownUntil = this.time.now + 800;
    this.controls.setEnabled(true);
  }

  // --- Decor ----------------------------------------------------------------

  /** A town nameplate (reused for Seattle and Portland). */
  private addTownLabel(label: { x: number; y: number; text: string }): void {
    this.add
      .text(label.x, label.y, label.text, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '11px',
        color: '#fdf6e3',
      })
      .setOrigin(0.5, 1)
      .setStroke('#1a1410', 4)
      .setDepth(6);
  }

  private addTownDecor(): void {
    this.addTownLabel(this.town.label);

    // Pulsing corruption-rift marker at the town's gates.
    const rift = this.town.rift;
    const ring = this.add.circle(rift.x, rift.y, 9, 0x8a2be2, 0.4).setDepth(7);
    this.tweens.add({
      targets: ring,
      scale: 1.9,
      alpha: 0.05,
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
    this.add
      .text(rift.x, rift.y - 13, 'Corruption Rift', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '10px',
        color: '#d6a8ff',
      })
      .setOrigin(0.5, 1)
      .setStroke('#160b22', 4)
      .setDepth(7);
  }
}

import Phaser from 'phaser';
import { GameMap } from '../map/GameMap';
import { preloadTerrainTiles } from '../render/tileAtlas';
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
import type { BossDef, BossHooks } from '../boss/bossTypes';
import { MICHAEL_DEF, TEST_BOSS_DEF, SEMYAZA_DEF } from '../boss/bossData';
import { SIN_DEFS } from '../boss/sinsData';
import { SinGauntlet } from '../boss/SinGauntlet';
import { DRAGON_DEF, BEAST_DEF, SATAN_DEF } from '../boss/trinityData';
import { TrinitySequence } from '../boss/TrinitySequence';
import { EarthPortal } from '../entities/EarthPortal';
import { SaveSystem } from '../save/SaveSystem';
import { SAVE_VERSION, type SaveData } from '../save/SaveData';
import { PortalDefense } from '../encounter/PortalDefense';
import { buildHeavenMapData, HEAVEN_WIDTH, HEAVEN_HEIGHT, HEAVEN_CHERUB_SPAWNS, THRONE_POSITION } from '../map/heavenWorld';
import { buildHellMapData, HELL_WIDTH, HELL_HEIGHT, HELL_DEMON_SPAWNS, SATAN_LAIR } from '../map/hellWorld';
import { WORLD_EARTH, WORLD_HEAVEN, WORLD_HELL, type WorldId, type WorldRuntime } from '../world/worlds';
import { ProjectileSystem } from '../combat/ProjectileSystem';
import { FloatingTextPool, CircleFxPool } from '../combat/FxPools';
import { HazardField } from '../combat/HazardField';
import { PickupSystem, type PickupCollected } from '../world/PickupSystem';
import { HolyPower } from '../progression/HolyPower';
import { Health } from '../combat/Health';
import { HealthBar } from '../combat/HealthBar';
import { HolyBoltButton } from '../ui/HolyBoltButton';
import { LoadoutBar } from '../ui/LoadoutBar';
import { SkillState } from '../skills/SkillState';
import { classSkills, combineMods, isStarterSkill, isAimableSkill, isEquippableSkill, type SkillDef, type SkillStatMods, type SkillEffect, type ActiveActionId, type ClassId } from '../skills/skillData';
import { TANK_TUNING } from '../skills/blacksmithTank';
import { DPS_TUNING } from '../skills/blacksmithDps';
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
import { ICEPOISON_TUNING } from '../skills/wizardIcePoison';
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
  SUMMON_BUFF_TUNING,
  AGGRO_REEVAL_INTERVAL_MS,
  AGGRO_STICKY_MARGIN,
} from '../summon/summonData';
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
import { OREGON_SPIRIT_ID } from '../spirit/spiritData';
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
  MAX_FLOATING_TEXTS,
  MAX_CIRCLE_FX,
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
import { TOWN_TILES } from '../town/townTiles';
import { buildTown, type TownFeatures, type DoorFeature } from '../town/TownBuilder';
import { PORTLAND_TOWN, PORTLAND_NPC_LINES, SEATTLE_DRUID_TOWN } from '../town/townData';
import type { WashingtonMap } from '../map/mapTypes';
import washingtonMap from '../map/washington.map.json';

// Proximity ranges in px, tuned for 32px tiles.
const DOOR_TRIGGER = 20; // < one tile (32) so returning one tile out doesn't re-enter
const NPC_AUTO_RANGE = 44; // ~1.4 tiles — auto-open dialogue on contact
const NPC_TALK_RANGE = 80; // ~2.5 tiles — show the Talk button

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

  // The Descent arc + the Act I (Enumclaw) opening both reuse the same per-objective
  // world setup + completion watcher. arcEnemies are the live spawns for the current
  // objective; arcMode picks the completion test. ACT1_IDS are the grounded openers
  // (no corruption gate); DESCENT_IDS the corrupted arc.
  private readonly ACT1_IDS = new Set(['honest-days-work', 'wolves-tree-line', 'shallows', 'the-pass']);
  private readonly ACT2_IDS = new Set(['whats-gotten-into-them', 'the-blight', 'the-thing-at-white-pass']);
  private readonly INV_IDS = new Set(['word-to-yakima', 'the-iron-road', 'the-northern-farms', 'what-the-dark-ones-carry', 'the-exile-of-longview']);
  private readonly DESCENT_IDS = new Set(['descent-1', 'descent-2', 'descent-3', 'descent-4']);
  // Act IV (4.1–4.4): the Necromancer's opening arc, given by Azazel BEFORE descent.
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
  private classId: ClassId = 'blacksmith';
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
  }

  create(): void {
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
    // The reusable projectile system draws bolts into the world-FX layer (so the
    // UI camera ignores them). Enemy bolts damage the player; impacts spawn a poof.
    this.projectiles = new ProjectileSystem(this, this.map, this.worldFx);
    this.projectiles.onPlayerHit = (dmg) => this.onProjectileHitPlayer(dmg);
    this.projectiles.onEnemyHit = (x, y, radius, dmg, hitSet) => this.resolveHolyBoltHit(x, y, radius, dmg, hitSet);
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
      this.physics.add.collider(s.sprite, this.map.layer);
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
    };
    // PASSIVE summon auras from the Necromancer's Summons tree (Necrotic Presence, Unyielding
    // Beast, the chosen branch passive, Tentacles) — per-summon-type, applied every frame.
    this.summons.passiveModsFor = (s) => this.summonPassiveMods(s);
    this.projectiles.onSummonHit = (x, y, radius, dmg) => this.resolveEnemyBoltVsSummon(x, y, radius, dmg);
    // Toxic Bolt: a poison field blooms where the bolt lands (per-target DoT in radius).
    this.projectiles.onImpactDot = (x, y, dot) => this.applyDotInRange(x, y, dot.radius, dot.dmgPerTick, dot.tickMs, dot.durationMs, dot.color);
    // PIECE 2: light aim-assist — nudge player bolts toward a nearby enemy in the aim cone.
    this.projectiles.onAimAssist = (x, y, dx, dy) => this.aimAssist(x, y, dx, dy);
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
    this.chain = new QuestChain(QUEST_REGISTRY);
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
        // Act IV (4.1–4.4) is offered FIRST (firstAvailable walks this list in order);
        // the old descent ids stay for the bridge after 4.4.
        questIds: [
          'act4-what-they-wont-give',
          'act4-watchers-on-the-road',
          'act4-the-trade-day',
          'act4-salt-and-sea',
          'act4-the-door-they-came-through',
          'act4-olympia',
          'act4-poison-the-well',
          'act4-the-heart-of-each-city',
          'descent-1',
          'descent-2',
          'descent-3',
          'descent-4',
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
    // Act II Q6: the proximity "Burn the Grove" action (same bottom-centre slot as
    // Talk/Corrupt; they never contend — the grove has no NPC). Hidden until in range.
    this.burnButton = new TouchButton(this, 'Burn the Grove', () => this.tryArcAction());
    this.zoomControls = new ZoomControls(this, cam, this.map.pixelWidth, this.map.pixelHeight);
    this.readout = new DebugReadout(this, this.map, this.player);
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

    // World-gated systems: all Earth content (NPCs, enemies, quests, encounters,
    // pickups) ticks only while Earth is the active world. Heaven is empty — its
    // only per-frame logic is the return-gate proximity. Movement, dash, zoom, the
    // HUD, regen and projectiles are world-agnostic and run for both.
    if (this.activeWorld === WORLD_EARTH) {
      this.checkDoors();
      this.checkUrielArrival(); // Act II finale: scripted Uriel scene back in the square
      this.checkSeattleIntro(); // first time in the Druid city: a one-shot intro narration
      this.checkRiftSceneStart(); // FINALE: reaching the N-Oregon rift begins the rift scene
      this.updateArc(); // descent-arc completion watcher (before interactions so a
      // "return to the outpost" completes before the patron auto-offers the next quest)
      if (this.isDashing()) this.talkButton.setVisible(false);
      else this.checkInteractions();
      const sqTarget = this.enemyAggroTarget(this.sasquatch, this.sasquatch.x, this.sasquatch.y); // hierarchy/golem aggro
      this.sasquatch.update(sqTarget.x, sqTarget.y, this.time.now);
      this.updateSwarmers();
      this.updateAngels();
      this.updateTownsfolk(); // prune dead first so the wave manager sees the live count
      this.portalDefense.update(this.time.now);
      this.updateGuardianEncounter();
    } else if (this.activeWorld === WORLD_HEAVEN) {
      this.talkButton.setVisible(false);
      this.updateHeaven();
    } else {
      this.talkButton.setVisible(false);
      this.updateHell(); // WORLD_HELL: the return-gate proximity
    }
    // World-agnostic: Cherubs/Michael (Heaven), Demons (Hell), the God-judgment
    // gate, projectiles + pickups all run for every world — distant enemies idle
    // (leashed), and the pickup/projectile systems carry items in any world.
    this.updateCherubs();
    this.updateBosses();
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
    this.clearDots();
    this.summons.clear();
    this.requireStartingSkill(); // pick a first skill if this class has none yet
    this.recomputeSkillEffects();
    this.playerHealth.setMax(this.skillAdjustedMaxHP());
    this.playerHealth.full();
    this.refreshLoadoutBar();
    this.showBanner(`Class: ${classId}`, 1400);
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

  /** The live melee damage (level-derived × skill multiplier from passives + buffs/forms). */
  private playerDamage(): number {
    return Math.round(this.progression.effectiveDamage * this.skillDamageMult * this.osteoDamageMult);
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
      this.runActiveSkill(e.action);
    } else if (e.kind === 'buff' || e.kind === 'transformation') {
      const aura = e.kind === 'transformation' ? { auraDamage: e.auraDamage, auraRadius: e.auraRadius } : {};
      this.startTimedSkill(id, e.durationMs, e.stats, e.tint, aura);
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
  private runActiveSkill(action: ActiveActionId): void {
    const px = this.player.x;
    const py = this.player.y;
    this.lastCombatTime = this.time.now;
    if (action === 'forge_strike') {
      // A heavy shockwave: a ring FX + a strong AoE hit around the player.
      const r = 150;
      this.spawnSkillRing(px, py, r, 0xff8a3a);
      this.aoeHitAll(px, py, r, this.playerDamage() * 2);
    } else if (action === 'shield_bash') {
      // Short shield strike in front + STUN to hit enemies (Tank #2).
      const c = TANK_TUNING.shieldBash;
      const fx = px + this.player.facingX * c.range * 0.6;
      const fy = py + this.player.facingY * c.range * 0.6;
      this.spawnSkillRing(fx, fy, c.range, 0xcfe3ff);
      this.aoeHitAll(fx, fy, c.range, c.damage);
      this.stunEnemiesInRange(fx, fy, c.range, c.stunMs);
    } else if (action === 'shove') {
      // Knock back all nearby enemies, creating space (Tank #4).
      const c = TANK_TUNING.shove;
      this.spawnSkillRing(px, py, c.radius, 0x9fd0ff);
      if (c.damage > 0) this.aoeHitAll(px, py, c.radius, c.damage);
      this.knockbackEnemiesInRange(px, py, c.radius, c.knockback, c.stunMs);
    } else if (action === 'shield_swing') {
      // Wide frontal arc (offset AoE in the facing direction) (Tank #6).
      const c = TANK_TUNING.shieldSwing;
      const fx = px + this.player.facingX * c.range * c.arcReach;
      const fy = py + this.player.facingY * c.range * c.arcReach;
      this.spawnSkillRing(fx, fy, c.range, 0xffd27a);
      this.aoeHitAll(fx, fy, c.range, c.damage);
    } else if (action === 'plow') {
      this.startPlow(); // tanky forward charge that shoves + damages the path (Tank #8)
    } else if (action === 'basic_strike') {
      this.doBasicStrike(); // the folded-in default attack (equippable basic)
    } else if (action === 'dodge') {
      this.doDodge(); // the folded-in default dodge/lunge (equippable basic)
    } else if (action === 'bash') {
      // DPS #1 — a quick hard strike in front.
      const c = DPS_TUNING.bash;
      const fx = px + this.player.facingX * c.range * 0.6;
      const fy = py + this.player.facingY * c.range * 0.6;
      this.spawnSkillRing(fx, fy, c.range, 0xff7a3a);
      this.aoeHitAll(fx, fy, c.range, this.skillDamage(c.damage));
    } else if (action === 'overswing') {
      // DPS #3 — slow telegraphed heavy strike: wind-up ring, then a big hit.
      const c = DPS_TUNING.overswing;
      const tele = this.add.circle(px, py, 10, 0xffd27a, 0).setStrokeStyle(3, 0xffb04a, 0.9).setDepth(13);
      this.worldFx.add(tele);
      this.tweens.add({ targets: tele, scale: c.range / 10, alpha: { from: 0.7, to: 0 }, duration: c.windUpMs, ease: 'Quad.in', onComplete: () => tele.destroy() });
      this.time.delayedCall(c.windUpMs, () => {
        if (this.playerDead) return;
        const fx = this.player.x + this.player.facingX * c.range * 0.6;
        const fy = this.player.y + this.player.facingY * c.range * 0.6;
        this.spawnSkillRing(fx, fy, c.range, 0xffb04a);
        this.aoeHitAll(fx, fy, c.range, this.skillDamage(c.damage));
      });
    } else if (action === 'windmill') {
      // DPS #6 — spin: hit ALL enemies around the player.
      const c = DPS_TUNING.windmill;
      this.spawnSkillRing(px, py, c.radius, 0xff9a5a);
      this.aoeHitAll(px, py, c.radius, this.skillDamage(c.damage));
    } else if (action === 'hammer_throw') {
      // DPS #7 — ranged thrown hammer (player-faction projectile; reuses the bolt path).
      const c = DPS_TUNING.hammerThrow;
      const len = Math.hypot(this.player.facingX, this.player.facingY) || 1;
      const dx = this.player.facingX / len;
      const dy = this.player.facingY / len;
      this.projectiles.spawn({
        x: px + dx * 18,
        y: py + dy * 18,
        dirX: dx,
        dirY: dy,
        speed: c.speed,
        damage: this.skillDamage(c.damage),
        maxRange: c.range,
        faction: 'player',
        color: 0xd9c08a,
        radius: c.radius,
      });
      this.notifyBossesPlayerAction('ranged');
    } else if (action === 'control_charge') {
      this.startCharge(); // Control #1 — forward rush + knockdown along the path
    } else if (action === 'disarm') {
      // Control #3 — strike a target in front + lock it down (can't act). (Disarm is
      // modeled as a freeze: per-enemy attack-only suppression isn't generic here.)
      const c = CONTROL_TUNING.disarm;
      const fx = px + this.player.facingX * c.range * 0.6;
      const fy = py + this.player.facingY * c.range * 0.6;
      this.spawnSkillRing(fx, fy, c.range, 0xb0a0ff);
      this.aoeHitAll(fx, fy, c.range, this.skillDamage(c.damage));
      this.stunEnemiesInRange(fx, fy, c.range, c.disarmMs);
    } else if (action === 'intimidate') {
      // Control #4 — AoE shout: SLOW + WEAKEN all nearby enemies for a duration.
      const c = CONTROL_TUNING.intimidate;
      this.spawnSkillRing(px, py, c.radius, 0xffa040);
      this.slowEnemiesInRange(px, py, c.radius, c.durationMs, c.slowFactor);
      this.intimidateWeakenUntil = this.time.now + c.durationMs;
      this.intimidateWeakenFactor = c.weaken;
    } else if (action === 'cripple') {
      // Control #6 — heavy blow + sharp single-target SLOW.
      const c = CONTROL_TUNING.cripple;
      const fx = px + this.player.facingX * c.range * 0.6;
      const fy = py + this.player.facingY * c.range * 0.6;
      this.spawnSkillRing(fx, fy, c.range, 0x8af0d0);
      this.aoeHitAll(fx, fy, c.range, this.skillDamage(c.damage));
      this.slowEnemiesInRange(fx, fy, c.range, c.slowMs, c.slowFactor);
    } else if (action === 'execute') {
      // Control #8 — finisher: enemies below the HP threshold take massive bonus damage.
      const c = CONTROL_TUNING.execute;
      const fx = px + this.player.facingX * c.range * 0.6;
      const fy = py + this.player.facingY * c.range * 0.6;
      this.spawnSkillRing(fx, fy, c.range, 0xff5050);
      const low = this.combatEnemiesInRange(fx, fy, c.range).some((e) => e.health.ratio < c.thresholdPct);
      this.aoeHitAll(fx, fy, c.range, this.skillDamage(low ? c.damage * c.executeMult : c.damage));
    } else if (action === 'wiz_fireball') {
      // Wizard #1 — single-target fire bolt (the entry damaging active).
      const c = WIZARD_FIREWIND_TUNING.fireball;
      this.castFireBolt(c.damage, c.speed, c.range, c.radius, 0xff7a2a);
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
    } else if (action === 'wiz_combust') {
      // Wizard #3 — bolt that EXPLODES into splash AoE on impact (always splashes).
      const c = WIZARD_FIREWIND_TUNING.combust;
      const { dx, dy } = this.facingUnit();
      this.spawnWizardBolt(dx, dy, this.skillDamage(c.directDamage), c.speed, c.range, c.radius, 0xff5a2a, {
        splashRadius: c.splashRadius,
        splashDamage: this.skillDamage(c.splashDamage),
      });
      this.notifyBossesPlayerAction('ranged');
    } else if (action === 'wiz_dust_devil') {
      // Wizard #4 — cone of wind in front of the player (true wedge hitbox).
      const c = WIZARD_FIREWIND_TUNING.dustDevil;
      const { dx, dy } = this.facingUnit();
      const half = (c.coneHalfAngleDeg * Math.PI) / 180;
      this.spawnConeFx(px, py, dx, dy, c.range, half, 0x9ad8ff);
      this.aoeHitAll(px, py, c.range, this.skillDamage(c.damage), (ex, ey) => this.inCone(px, py, dx, dy, ex, ey, c.range, half));
    } else if (action === 'wiz_gust') {
      this.startGust(); // Wizard #5 — wind-dash + path damage (reuses the dash movement)
    } else if (action === 'wiz_lava') {
      // Wizard #6 — persistent burning ground patch ahead (reuses the hazard pattern).
      const c = WIZARD_FIREWIND_TUNING.lava;
      const { dx, dy } = this.facingUnit();
      this.spawnSpellHazard(px + dx * c.placeAhead, py + dy * c.placeAhead, c.radius, this.skillDamage(c.tickDamage), c.durationMs, c.tickMs);
    } else if (action === 'wiz_immolation') {
      // Wizard #7 — fiery burst around the player (self-centered circle AoE).
      const c = WIZARD_FIREWIND_TUNING.immolation;
      this.spawnSkillRing(px, py, c.radius, 0xff7a2a);
      this.aoeHitAll(px, py, c.radius, this.skillDamage(c.damage));
    } else if (action === 'wiz_jet_stream') {
      // Wizard #8 — line/wall of wind projected straight ahead (true segment hitbox).
      const c = WIZARD_FIREWIND_TUNING.jetStream;
      const { dx, dy } = this.facingUnit();
      const x2 = px + dx * c.length;
      const y2 = py + dy * c.length;
      this.spawnLineFx(px, py, x2, y2, c.width, 0xbfe6ff);
      const bx = (px + x2) / 2;
      const by = (py + y2) / 2;
      this.aoeHitAll(bx, by, c.length / 2 + c.width, this.skillDamage(c.damage), (ex, ey) => this.inLine(px, py, x2, y2, ex, ey, c.width / 2));
    } else if (action === 'wiz_tornado') {
      // Wizard #9 — large multi-pulse vortex that follows the player (bigger than Immolation).
      const c = WIZARD_FIREWIND_TUNING.tornado;
      for (let i = 0; i < c.pulses; i++) {
        this.time.delayedCall(i * c.pulseMs, () => {
          if (this.playerDead) return;
          this.spawnSkillRing(this.player.x, this.player.y, c.radius, 0xbfe6ff);
          this.aoeHitAll(this.player.x, this.player.y, c.radius, this.skillDamage(c.damage));
        });
      }
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
    } else if (action === 'necro_dm_blip') {
      // Dark Matter #1 — fast cheap bolt (the spammable basic; entry damaging active).
      const c = DM_TUNING.blip;
      const { dx, dy } = this.facingUnit();
      this.projectiles.spawn({ x: px + dx * 18, y: py + dy * 18, dirX: dx, dirY: dy, speed: c.speed, damage: this.skillDamage(c.damage), maxRange: c.range, faction: 'player', color: 0xb98bff, radius: c.radius });
      this.notifyBossesPlayerAction('ranged');
    } else if (action === 'necro_dm_bomb') {
      // Dark Matter #2 — lobbed bolt: direct hit + splash AoE on impact (reuses splash).
      const c = DM_TUNING.bomb;
      const { dx, dy } = this.facingUnit();
      this.projectiles.spawn({ x: px + dx * 18, y: py + dy * 18, dirX: dx, dirY: dy, speed: c.speed, damage: this.skillDamage(c.directDamage), maxRange: c.range, faction: 'player', color: 0x7a3fb0, radius: c.radius, splashRadius: c.splashRadius, splashDamage: this.skillDamage(c.splashDamage) });
      this.notifyBossesPlayerAction('ranged');
    } else if (action === 'necro_dm_tainted') {
      // Dark Matter #3 — bolt + DEFENSE-DOWN window (reuses the Osteo damage-amp mechanic, timed).
      const c = DM_TUNING.tainted;
      const { dx, dy } = this.facingUnit();
      this.projectiles.spawn({ x: px + dx * 18, y: py + dy * 18, dirX: dx, dirY: dy, speed: c.speed, damage: this.skillDamage(c.damage), maxRange: c.range, faction: 'player', color: 0x9a5cff, radius: c.radius });
      this.darkVulnUntil = this.time.now + c.debuffMs;
      this.darkVulnMult = 1 + c.defenseReduction;
      this.showBanner('Defenses tainted', 900);
      this.notifyBossesPlayerAction('ranged');
    } else if (action === 'necro_dm_hex') {
      // Dark Matter #4 — debuff: SLOW + WEAKEN the nearest foe's area (reuses slow + weaken).
      const c = DM_TUNING.hex;
      const target = this.nearestEnemy(px, py, c.range);
      if (target) {
        this.slowEnemiesInRange(target.x, target.y, c.radius, c.durationMs, c.slowFactor);
        this.setPoisonWeaken(c.weaken, c.durationMs); // weaken = enemy damage dealt down (timed window)
        if (c.damage > 0) this.aoeHitAll(target.x, target.y, c.radius, this.skillDamage(c.damage));
        this.spawnSkillRing(target.x, target.y, c.radius, 0x6a3fb0);
      } else {
        this.showBanner('No target in range', 800);
      }
    } else if (action === 'necro_dm_abyssal') {
      // Dark Matter #5 — cone of dark energy in front (reuses the cone pattern).
      const c = DM_TUNING.abyssal;
      const { dx, dy } = this.facingUnit();
      const half = (c.coneHalfAngleDeg * Math.PI) / 180;
      this.spawnConeFx(px, py, dx, dy, c.range, half, 0x9a5cff);
      this.aoeHitAll(px, py, c.range, this.skillDamage(c.damage), (ex, ey) => this.inCone(px, py, dx, dy, ex, ey, c.range, half));
    } else if (action === 'necro_dm_rift') {
      // Dark Matter #6 — ranged AoE at a spot ahead (reuses the placed-AoE pattern).
      const c = DM_TUNING.rift;
      const { dx, dy } = this.facingUnit();
      const cxr = px + dx * c.range;
      const cyr = py + dy * c.range;
      this.spawnSkillRing(cxr, cyr, c.radius, 0x7a3fb0);
      this.aoeHitAll(cxr, cyr, c.radius, this.skillDamage(c.damage));
    } else if (action === 'necro_dm_singularity') {
      this.castSingularity(); // Dark Matter #10 capstone — pull + heavy AoE over time
    } else if (action === 'wiz_icicle') {
      // Ice/Poison #1 — piercing ice shard (passes through several enemies).
      const c = ICEPOISON_TUNING.icicle;
      const { dx, dy } = this.facingUnit();
      this.projectiles.spawn({ x: px + dx * 18, y: py + dy * 18, dirX: dx, dirY: dy, speed: c.speed, damage: this.skillDamage(c.damage), maxRange: c.range, faction: 'player', color: 0x9fe8ff, radius: c.radius, pierce: c.pierce });
      this.notifyBossesPlayerAction('ranged');
    } else if (action === 'wiz_toxic_bolt') {
      // Ice/Poison #2 — bolt that poisons (DoT field blooms on impact).
      const c = ICEPOISON_TUNING.toxicBolt;
      const { dx, dy } = this.facingUnit();
      this.projectiles.spawn({
        x: px + dx * 18, y: py + dy * 18, dirX: dx, dirY: dy, speed: c.speed, damage: this.skillDamage(c.impactDamage), maxRange: c.range, faction: 'player', color: 0x9acd32, radius: c.radius,
        dotOnImpact: { dmgPerTick: this.skillDamage(c.dotDamage), tickMs: c.dotTickMs, durationMs: c.dotDurationMs, radius: c.dotRadius, color: 0x9acd32 },
      });
      this.notifyBossesPlayerAction('ranged');
    } else if (action === 'wiz_black_ice') {
      // Ice/Poison #3 — slick ground patch ahead: SLOW only, no damage.
      const c = ICEPOISON_TUNING.blackIce;
      const { dx, dy } = this.facingUnit();
      this.spawnSpellHazard(px + dx * c.placeAhead, py + dy * c.placeAhead, c.radius, 0, c.durationMs, c.tickMs, { slowFactor: c.slowFactor, fill: 0x4a6a8f, stroke: 0xbfe6ff });
    } else if (action === 'wiz_frostbite') {
      // Ice/Poison #4 — chill a foe ahead: damage + SLOW + WEAKEN.
      const c = ICEPOISON_TUNING.frostbite;
      const fx = px + this.player.facingX * c.range * 0.6;
      const fy = py + this.player.facingY * c.range * 0.6;
      this.spawnSkillRing(fx, fy, c.range, 0xbfe6ff);
      this.aoeHitAll(fx, fy, c.range, this.skillDamage(c.damage));
      this.slowEnemiesInRange(fx, fy, c.range, c.durationMs, c.slowFactor);
      if (this.combatEnemiesInRange(fx, fy, c.range).length > 0) this.setPoisonWeaken(c.weaken, c.durationMs);
    } else if (action === 'wiz_sludge') {
      // Ice/Poison #5 — toxic cone: damage + KNOCKBACK (true wedge).
      const c = ICEPOISON_TUNING.sludge;
      const { dx, dy } = this.facingUnit();
      const half = (c.coneHalfAngleDeg * Math.PI) / 180;
      this.spawnConeFx(px, py, dx, dy, c.range, half, 0x9acd32);
      const inWedge = (ex: number, ey: number): boolean => this.inCone(px, py, dx, dy, ex, ey, c.range, half);
      this.aoeHitAll(px, py, c.range, this.skillDamage(c.damage), inWedge);
      this.knockbackEnemiesInRange(px, py, c.range, c.knockback, 200, inWedge);
    } else if (action === 'wiz_freezing_rain') {
      // Ice/Poison #6 — zone around the player: SLOW + DAMAGE over time.
      const c = ICEPOISON_TUNING.freezingRain;
      this.spawnSpellHazard(px, py, c.radius, this.skillDamage(c.tickDamage), c.durationMs, c.tickMs, { slowFactor: c.slowFactor, fill: 0x6aa0d0, stroke: 0xbfe6ff });
    } else if (action === 'wiz_biohazard') {
      // Ice/Poison #7 — lob a poison cloud ahead: lingering DoT zone.
      const c = ICEPOISON_TUNING.biohazard;
      const { dx, dy } = this.facingUnit();
      this.spawnSpellHazard(px + dx * c.throwRange, py + dy * c.throwRange, c.radius, this.skillDamage(c.tickDamage), c.durationMs, c.tickMs, { fill: 0x6b8e23, stroke: 0x9acd32 });
    } else if (action === 'wiz_plague') {
      // Ice/Poison #8 — infect foes ahead with a CONTAGIOUS DoT that spreads.
      const c = ICEPOISON_TUNING.plague;
      const fx = px + this.player.facingX * c.applyRange * 0.6;
      const fy = py + this.player.facingY * c.applyRange * 0.6;
      this.spawnSkillRing(fx, fy, c.applyRadius, 0x9acd32);
      this.applyPlagueInRange(fx, fy, c.applyRadius, this.skillDamage(c.dotDamage), c.dotTickMs, c.dotDurationMs, c.spreadRadius, c.maxSpread);
    } else if (action === 'wiz_pestilence') {
      // Ice/Poison #10 — ULTIMATE: a huge field — heavy DoT + SLOW + WEAKEN.
      const c = ICEPOISON_TUNING.pestilence;
      this.spawnSkillRing(px, py, c.radius, 0x9acd32);
      this.spawnSpellHazard(px, py, c.radius, this.skillDamage(c.tickDamage), c.durationMs, c.tickMs, { slowFactor: c.slowFactor, weaken: c.weaken, fill: 0x6b8e23, stroke: 0x9acd32 });
      this.showBanner('Pestilence!', 1400);
    } else if (action === 'eth_bolt') {
      // Ethereal #1 — ghostly single-target bolt (the entry damaging active).
      const c = ETHEREAL_TUNING.etherealBolt;
      const { dx, dy } = this.facingUnit();
      this.projectiles.spawn({ x: px + dx * 18, y: py + dy * 18, dirX: dx, dirY: dy, speed: c.speed, damage: this.skillDamage(c.damage), maxRange: c.range, faction: 'player', color: 0xcfc0ff, radius: c.radius });
      this.notifyBossesPlayerAction('ranged');
    } else if (action === 'eth_mend') {
      // Ethereal #2 — instant self-heal.
      const c = ETHEREAL_TUNING.mend;
      this.playerHealth.heal(c.healAmount);
      this.spawnSkillRing(px, py, 60, 0xa8ffd0);
      this.spawnDamageNumber(px, py - 30, c.healAmount, '#a8ffd0');
    } else if (action === 'eth_mana_shield') {
      // Ethereal #4 — raise a damage-absorbing shield pool for a duration.
      const c = ETHEREAL_TUNING.manaShield;
      this.playerHealth.shield = c.amount;
      this.shieldUntil = this.time.now + c.durationMs;
      this.spawnSkillRing(px, py, 70, 0x8fd8ff);
      this.showBanner('Mana Shield up', 1100);
    } else if (action === 'eth_blink') {
      this.doBlink(); // Ethereal #5 — instant teleport forward (the escape)
    } else if (action === 'eth_soul_siphon') {
      // Ethereal #8 — frontal drain: damage foes ahead + heal per enemy struck.
      const c = ETHEREAL_TUNING.soulSiphon;
      const fx = px + this.player.facingX * c.range * 0.6;
      const fy = py + this.player.facingY * c.range * 0.6;
      this.spawnSkillRing(fx, fy, c.range, 0xcf7aff);
      const hits = Math.min(c.maxHeals, this.combatEnemiesInRange(fx, fy, c.range).length);
      this.aoeHitAll(fx, fy, c.range, this.skillDamage(c.damage));
      if (hits > 0) {
        this.playerHealth.heal(c.healPerHit * hits);
        this.spawnDamageNumber(px, py - 30, c.healPerHit * hits, '#cf7aff');
      }
    } else if (action === 'eth_ankh') {
      // Ethereal #10 — ULTIMATE: arm the cheat-death ward (consumed by a lethal blow).
      const c = ETHEREAL_TUNING.ankh;
      this.ankhArmedUntil = this.time.now + c.armedMs;
      this.spawnSkillRing(px, py, 90, 0xffe9a8);
      this.showBanner('Ankh of Life armed', 1400);
    } else if (action === 'necro_bone_dart') {
      // Marrow #1 — ranged single-target bone shot (the entry damaging active).
      const c = MARROW_TUNING.boneDart;
      const { dx, dy } = this.facingUnit();
      this.projectiles.spawn({ x: px + dx * 18, y: py + dy * 18, dirX: dx, dirY: dy, speed: c.speed, damage: this.skillDamage(c.damage), maxRange: c.range, faction: 'player', color: 0xe9e4d6, radius: c.radius });
      this.notifyBossesPlayerAction('ranged');
    } else if (action === 'necro_spiked_punch') {
      // Marrow #2 — bone-fist melee in front + TAUNT the struck foe(s) onto the player.
      const c = MARROW_TUNING.spikedPunch;
      const fx = px + this.player.facingX * c.range * 0.6;
      const fy = py + this.player.facingY * c.range * 0.6;
      this.spawnSkillRing(fx, fy, c.range, 0xd9d2c2);
      this.aoeHitAll(fx, fy, c.range, this.skillDamage(c.damage));
      this.tauntEnemiesInRange(fx, fy, c.range, c.tauntMs);
    } else if (action === 'necro_bone_nova') {
      // Marrow #3 — shockwave around the player: damage + knockback + brief taunt.
      const c = MARROW_TUNING.boneNova;
      this.spawnSkillRing(px, py, c.radius, 0xe9e4d6);
      this.aoeHitAll(px, py, c.radius, this.skillDamage(c.damage));
      this.knockbackEnemiesInRange(px, py, c.radius, c.knockback, 160);
      this.tauntEnemiesInRange(px, py, c.radius, c.tauntMs);
    } else if (action === 'necro_stake') {
      // Marrow #6 — drive a stake through the nearest foe in front: ROOT (movement-lock).
      const c = MARROW_TUNING.stake;
      const fx = px + this.player.facingX * c.range * 0.6;
      const fy = py + this.player.facingY * c.range * 0.6;
      if (c.damage > 0) this.aoeHitAll(fx, fy, c.range, this.skillDamage(c.damage));
      this.rootNearestEnemy(fx, fy, c.range, c.rootMs);
    } else if (action === 'necro_wrecking_ball') {
      // Marrow #9 — charge into a crowd: damage + KNOCKDOWN along the path (reuses Charge).
      this.startCharge(MARROW_TUNING.wreckingBall);
    } else if (action === 'necro_grasp') {
      // Marrow #10 — capstone lifesteal: drain the nearest foe in front; heal a portion.
      const c = MARROW_TUNING.graspOfDeath;
      const fx = px + this.player.facingX * c.range * 0.6;
      const fy = py + this.player.facingY * c.range * 0.6;
      this.spawnSkillRing(fx, fy, c.range, 0x9a6cff);
      const target = this.nearestEnemy(fx, fy, c.range);
      if (target) {
        const dealt = target.takeHit(this.skillDamage(c.damage));
        if (dealt > 0) {
          this.dmgDealtAccum += dealt;
          this.spawnDamageNumber(target.x, target.y - 24, dealt, '#c8a8ff');
          const heal = Math.round(dealt * c.healPct);
          if (heal > 0 && this.playerHealth.current < this.playerHealth.max) {
            this.playerHealth.heal(heal);
            this.spawnDamageNumber(px, py - 30, heal, '#a8ffd0');
          }
        }
      }
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

  /** BLINK (Ethereal #5): instantly teleport forward, stopping short of blocking terrain. */
  private doBlink(): void {
    const { dx, dy } = this.facingUnit();
    const c = ETHEREAL_TUNING.blink;
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
   *  Crazed, Prism Quartz) so active abilities scale with offensive passives + buffs. */
  private skillDamage(base: number): number {
    return Math.round(base * this.skillDamageMult * this.osteoDamageMult);
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
    // Necromancer TAUNT is a LIVE override (don't wait for the next re-eval): focus the player.
    if (now < this.tauntUntil) return { x: this.player.x, y: this.player.y };
    let st = this.aggroState.get(enemy);
    const lostTarget = !!st && st.targetSummon != null && !st.targetSummon.isAlive;
    if (!st || now >= st.nextEval || lostTarget) st = this.reevalEnemyAggro(enemy, ex, ey, st, now);
    const t = st.targetSummon;
    if (t && t.isAlive) return { x: t.x, y: t.y };
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
    // Necromancer TAUNT overrides the hierarchy: focus the player while it's active.
    const taunted = now < this.tauntUntil;
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
  private castSingularity(): void {
    const c = DM_TUNING.singularity;
    const { dx, dy } = this.facingUnit();
    const cx = this.player.x + dx * c.placeAhead;
    const cy = this.player.y + dy * c.placeAhead;
    const step = c.durationMs / c.pulses;
    for (let i = 0; i < c.pulses; i++) {
      this.time.delayedCall(i * step, () => {
        if (this.playerDead) return;
        this.spawnSkillRing(cx, cy, c.radius * (1 - (i / c.pulses) * 0.35), 0x6a3fb0); // collapsing rings
        this.pullEnemiesInRange(cx, cy, c.radius, c.pullStrength);
        this.aoeHitAll(cx, cy, c.radius, this.skillDamage(c.damagePerTick));
      });
    }
    this.showBanner('SINGULARITY', 1400);
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
      `enemies ${this.combatEnemies().length}  summons ${this.summons.count}`,
      `dem ${this.demons.length} ang ${this.angels.length} twn ${this.townsfolk.length} swm ${this.swarmers.length} bos ${this.bosses.length}`,
      `bolts ${this.projectiles.count}  dots ${this.dots.length}`,
      `dmg# ${this.floatingText.activeCount}/${this.floatingText.size}  circ ${this.circleFx.activeCount}/${this.circleFx.size}`,
      `worldFx ${this.worldFx.list.length}`,
    ];
  }

  /** Freeze/unfreeze an enemy's physics body (the stun primitive's "can't move"). */
  private freezeEnemyBody(e: CombatEnemy, frozen: boolean): void {
    const body = e.sprite?.body as Phaser.Physics.Arcade.Body | undefined;
    if (!body) return;
    body.moves = !frozen;
    if (frozen) e.halt();
  }

  /** STUN: freeze every enemy within range in place for `ms` (generic primitive). */
  private stunEnemiesInRange(x: number, y: number, range: number, ms: number): void {
    const until = this.time.now + ms;
    for (const e of this.combatEnemiesInRange(x, y, range)) {
      this.stunnedEnemies.set(e, until);
      this.freezeEnemyBody(e, true);
      // A brief star spark over the stunned enemy (world FX) — pooled (fires per
      // stunned enemy, so an AoE stun into a crowd would otherwise churn many Texts).
      this.floatingText.show(e.x, e.y - 30, '✦', '#ffe9a8', { fontSize: 16, riseBy: 14, durationMs: ms, depth: 14 });
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
  private slowEnemiesInRange(x: number, y: number, range: number, ms: number, factor: number): void {
    const until = this.time.now + ms;
    for (const e of this.combatEnemiesInRange(x, y, range)) {
      const cur = this.slowedEnemies.get(e);
      // Keep the strongest slow + the latest expiry while refreshed (auras refresh each frame).
      this.slowedEnemies.set(e, { until: Math.max(cur?.until ?? 0, until), factor: Math.min(cur?.factor ?? 1, factor) });
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
    return this.skills.isUnlocked(IRON_WILL_ID) || this.skillTimed.some((t) => t.id === IRON_PYRITE_ID);
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
    // Apply: incoming = base × (1 - weaken).
    if (this.playerHealth) this.playerHealth.incomingMultiplier = this.baseIncomingMult * (1 - weaken);
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
    // LIFESTEAL (Bloodlust): heal a fraction of the damage dealt since last frame.
    const lifesteal = this.combinedSkillMods().lifestealPct ?? 0;
    if (!this.playerDead && lifesteal > 0 && this.dmgDealtAccum > 0 && this.playerHealth.current < this.playerHealth.max) {
      this.playerHealth.heal(this.dmgDealtAccum * lifesteal);
    }
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

  private respawnPlayer(): void {
    this.playerHealth.full();
    // During a portal-defense encounter, respawn at the portal so the player can
    // keep defending (the encounter CONTINUES on death); otherwise the town spawn.
    if (this.portalDefense.isActive) {
      this.player.sprite.setPosition(this.portal.x, this.portal.y + 90);
    } else {
      this.player.sprite.setPosition(this.town.spawn.x, this.town.spawn.y);
      this.sasquatch.reset(); // clean, repeatable fight
    }
    this.player.setDirection(0, 0);
    this.projectiles.clear(); // drop any bolts still in flight
    this.summons.clear(); // allied summons don't survive the player's death
    this.clearSpellHazards();
    this.clearDots();
    this.lastCombatTime = -1e9;
    this.playerDead = false;
    this.controls.setEnabled(true);
  }

  private regenTick(delta: number): void {
    const enemiesEngaged =
      this.sasquatch.isAggro ||
      this.swarmers.some((s) => s.isAggro) ||
      this.angels.some((a) => a.isAggro) ||
      this.townsfolk.length > 0 ||
      this.guardians.some((g) => g.isAggro) ||
      this.cherubs.some((c) => c.isAggro) ||
      this.demons.some((d) => d.isAggro) ||
      this.bosses.some((b) => b.isAggro);
    if (enemiesEngaged) this.lastCombatTime = this.time.now;
    const outOfCombat = !enemiesEngaged && this.time.now - this.lastCombatTime > PLAYER_HP_REGEN_DELAY_MS;
    if (outOfCombat && this.playerHealth.current < this.playerHealth.max) {
      this.playerHealth.heal((PLAYER_HP_REGEN_PER_SEC * delta) / 1000);
    }

    // Energy regenerates continuously, pausing briefly after each spend.
    if (this.time.now - this.lastEnergySpendTime > ENERGY_REGEN_DELAY_MS && this.energy.current < this.energy.max) {
      this.energy.heal((ENERGY_REGEN_PER_SEC * delta) / 1000);
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
      this.physics.add.collider(s.sprite, this.map.layer);
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
          color: 0xffe9a8,
          radius: HOLY_BOLT_RADIUS,
        });
      }
    };
    this.physics.add.collider(a.sprite, this.map.layer);
    this.uiCamera?.ignore(a.objects()); // runtime world objects: keep off the UI camera
    this.angels.push(a);
    return a;
  }

  /** Drive each angel with line-of-sight from the scene, then prune the dead. */
  private updateAngels(): void {
    for (const a of this.angels) {
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

  /** Damage the player when an enemy bolt connects. */
  private onProjectileHitPlayer(damage: number): void {
    if (this.playerDead) return;
    const dealt = this.playerHealth.damage(damage);
    this.player.flash();
    this.spawnDamageNumber(this.player.x, this.player.y - 26, dealt, '#ffd27a');
    this.lastCombatTime = this.time.now;
    if (this.playerHealth.isDead) this.onPlayerDeath();
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
  private activeMap(): GameMap {
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
  }

  /** Show the bar for the boss the player is currently engaged with (active + near). */
  private refreshBossBar(): void {
    const boss = this.bosses.find((b) => b.isAggro);
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
    this.physics.add.collider(t.sprite, this.map.layer);
    this.uiCamera?.ignore(t.sprite); // runtime world object: keep off the UI camera
    this.townsfolk.push(t);
    return t;
  }

  /** Advance every townsfolk toward its target, then prune the dead. Hostile townsfolk obey
   *  the summon aggro hierarchy via enemyAggroTarget (summons pull them off the player too). */
  private updateTownsfolk(): void {
    for (const t of this.townsfolk) {
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
    // Proximity activation: nearing the outpost wakes the dormant pair.
    if (this.guardianPhase === 'dormant') {
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

    // Entering the now-corrupted portal transports the player to Heaven (the real
    // transition, replacing the old "coming soon" beat). Gated on CORRUPTED.
    if (this.guardianPhase === 'corrupted') {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.heavenPortal.x, this.heavenPortal.y);
      if (d <= PORTAL_ENTER_RANGE) this.enterHeavenPortal();
    }
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

  /** Fired when the player enters the CORRUPTED Earth Heaven-Portal → travel to Heaven. */
  private enterHeavenPortal(): void {
    if (this.transitioning || this.time.now < this.worldCooldownUntil) return;
    if (this.guardianPhase !== 'corrupted') return; // only the corrupted portal transports
    this.travelToWorld(WORLD_HEAVEN, this.heavenArrivalPos);
  }

  /** Heaven-side per-frame logic: entering the return gate transitions back to Earth. */
  private updateHeaven(): void {
    if (this.transitioning || this.time.now < this.worldCooldownUntil) return;
    const d = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      this.heavenReturnPortalPos.x,
      this.heavenReturnPortalPos.y,
    );
    if (d <= PORTAL_ENTER_RANGE) this.travelToWorld(WORLD_EARTH, this.earthReturnPos);
  }

  /**
   * THE reusable world-travel function: fade out, swap the active world (bounds,
   * collider, zoom, player placement), then fade back in. `arrival` overrides the
   * world's remembered position (the portals pass explicit arrival points).
   */
  private travelToWorld(worldId: WorldId, arrival?: { x: number; y: number }): void {
    if (this.transitioning) return;
    const target = this.worlds[worldId];
    if (!target) return;
    const dest = arrival ?? this.worldPos[worldId] ?? target.defaultArrival;

    this.transitioning = true;
    this.cancelDash();
    this.controls.setEnabled(false);
    this.player.setDirection(0, 0);

    const half = WORLD_TRANSITION_MS / 2;
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
    this.clearDots();

    // Pause Earth's live enemy bodies while away (so collideWorldBounds can't yank
    // them into the other region); resume them on return.
    if (worldId === WORLD_EARTH) this.resumeEarthBodies();
    else this.pauseEarthBodies();

    this.activeWorld = worldId;
    const w = this.worlds[worldId];

    // Only the active world's terrain collider is live.
    for (const id of Object.keys(this.worlds)) this.worlds[id].collider.active = id === worldId;

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

    // Drop any in-flight Earth bolts; clear Earth-only UI prompts.
    this.projectiles.clear();
    this.talkButton.setVisible(false);
    this.corruptButton.setVisible(false);
  }

  /** Disable every currently-live Earth enemy body; remember them for resume. */
  private pauseEarthBodies(): void {
    this.pausedBodies = [];
    const sprites: (Phaser.Physics.Arcade.Sprite | undefined)[] = [
      this.sasquatch.isAlive ? this.sasquatch.sprite : undefined,
      ...this.swarmers.filter((s) => s.isAlive).map((s) => s.sprite),
      ...this.angels.filter((a) => a.isAlive).map((a) => a.sprite),
      ...this.townsfolk.filter((t) => t.isAlive).map((t) => t.sprite),
      ...this.guardians.filter((g) => g.isAlive).map((g) => g.sprite),
    ];
    for (const s of sprites) {
      const body = s?.body as Phaser.Physics.Arcade.Body | undefined;
      if (body && body.enable) {
        body.enable = false;
        this.pausedBodies.push(body);
      }
    }
  }

  /** Re-enable the Earth enemy bodies paused on departure (skipping any destroyed since). */
  private resumeEarthBodies(): void {
    for (const b of this.pausedBodies) {
      const go = b.gameObject as Phaser.GameObjects.GameObject | undefined;
      if (go && go.active) b.enable = true;
    }
    this.pausedBodies = [];
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
      (this.ACT1_IDS.has(id) ||
        this.ACT2_IDS.has(id) ||
        this.INV_IDS.has(id) ||
        this.ACTIV_IDS.has(id) ||
        this.DESCENT_IDS.has(id))
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
        this.arcMode = 'reach';
        this.arcReach = { ...DARK_OUTPOST_POSITION };
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
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, this.arcReach.x, this.arcReach.y) <= REACH_OUTPOST_RANGE) {
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
      const d = this.spawnDemon(center.x + Math.cos(a) * r, center.y + Math.sin(a) * r, this.map.layer);
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
        if (this.isArcQuest(e.questId)) this.beginArcObjective(); // set up objective 0 (Act I + descent)
        // Quest 13 (finale): Uriel's scripted send-off plays on start (pre-warning).
        if (e.questId === 'the-source') this.playUrielSendoff();
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
      { label: 'Summon Ice Golem', onPress: () => this.summonIceGolem() },
      { label: 'Summon Skeleton', onPress: () => this.summonSkeleton() },
      { label: 'Summon Dark Matter Monster', onPress: () => this.summonDarkMatterMonster() },
      { label: 'Buff Summons', onPress: () => this.buffSummons() },
      { label: 'Clear Summons', onPress: () => this.summons.clear() },
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
    'descent-1': { group: 'The Descent', code: 'D1' },
    'descent-2': { group: 'The Descent', code: 'D2' },
    'descent-3': { group: 'The Descent', code: 'D3' },
    'descent-4': { group: 'The Descent', code: 'D4' },
    'climax-defiled-gate': { group: 'The Climax', code: 'C1' },
    'climax-judgment': { group: 'The Climax', code: 'C2' },
    'climax-seven-sins': { group: 'The Climax', code: 'C3' },
  };

  /** Snapshot the full quest chain for the DEV quest tab (called fresh on each open). */
  private questTabRows(): QuestTabRow[] {
    return QUEST_REGISTRY.map((q) => {
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
    if (ti < 0 || !def) return;

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

    // Corruption (drives Spirit Vision + the patron's offers + conditional dialogue).
    if (corrupted) this.setPlayerPath('corrupted');
    else { this.setPlayerPath('neutral'); this.spirit.setSpiritVision(false); }

    // Power state: holy (Holy Bolt + golden kit) only for the post-throne gauntlet.
    if (holy) this.swapToHoly(); else this.revertToDemonic();

    // Holy Power buffer (descent onward) since we skip the prior quests' reward grants.
    if (ti >= order.indexOf('descent-1') && this.holyPower.count < JUMP_HOLY_POWER) {
      this.holyPower.add(JUMP_HOLY_POWER - this.holyPower.count);
    }

    // Endgame gate flags so the climax quests land mid-flow, not re-doing earlier beats.
    if (targetId === 'climax-defiled-gate') {
      this.resetGuardianEncounter(); // start the gate fresh at the Holy Outpost
      this.resetGodJudgment();
    } else if (targetId === 'climax-judgment') {
      this.guardianPhase = 'corrupted'; // the Heaven gate is already defiled
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
    // load() clears the active quest; accept() then fires 'started' → handleQuestEvent
    // sets up arc objective 0 (spawns enemies in the now-correct world).
    this.chain.load({ completed: order.slice(0, ti), activeId: null, activeObjective: 0 });
    this.chain.accept(targetId);

    // Arrive at full HP/energy so the jump always lands playable (dev convenience).
    this.playerHealth.full();
    this.energy.full();

    this.refreshQuestUi();
    this.updateObjectiveMarker();
    this.showBanner(`Jumped to: ${def.title}`, 2200);
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
        const next = QUEST_REGISTRY.find((d) => d.autoActivate && this.chain.status(d.id) === 'available');
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

  /** Forward-march ordering of the worlds (Earth → Heaven → Hell) for quest catch-up. */
  private worldOrder(w: WorldId): number {
    return w === WORLD_EARTH ? 0 : w === WORLD_HEAVEN ? 1 : 2;
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
    // Active quest → its current objective's world target, if we're in its world.
    const active = this.chain.activeQuest;
    if (active) {
      const obj = this.chain.activeObjectiveDef;
      if (!obj || !obj.target) return null;
      if (TARGET_WORLD[obj.target] !== this.activeWorld) return null; // don't point across worlds
      return this.resolveTarget(obj.target);
    }
    // No active quest → the pre-accept pointer to the next OFFERABLE quest's giver.
    // Givers live on Earth, so this only applies on Earth (auto-activating climax
    // quests have no giver and need no pre-accept pointer).
    if (this.activeWorld !== WORLD_EARTH) return null;
    // Act II finale: between Q7 and Uriel's arrival, point the player back to the square.
    if (this.urielPending && !this.urielArrived) {
      return { x: this.town.spawn.x, y: this.town.spawn.y, label: 'Return to Enumclaw' };
    }
    for (const g of this.questGivers) {
      const offer = this.offerableQuest(g);
      if (offer) {
        const p = g.pos();
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
      case 'outpost':
        return { x: DARK_OUTPOST_POSITION.x, y: DARK_OUTPOST_POSITION.y, label: '' };
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

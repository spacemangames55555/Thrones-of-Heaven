import Phaser from 'phaser';
import { GameMap } from '../map/GameMap';
import { Player } from '../entities/Player';
import { Npc } from '../entities/Npc';
import { Controls } from '../input/Controls';
import { CityMarkers } from '../ui/CityMarkers';
import { DebugReadout } from '../ui/DebugReadout';
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
import { MICHAEL_DEF, TEST_BOSS_DEF } from '../boss/bossData';
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
import { HazardField } from '../combat/HazardField';
import { PickupSystem, type PickupCollected } from '../world/PickupSystem';
import { HolyPower } from '../progression/HolyPower';
import { Health } from '../combat/Health';
import { HealthBar } from '../combat/HealthBar';
import { AttackButton } from '../ui/AttackButton';
import { DashButton } from '../ui/DashButton';
import { HolyBoltButton } from '../ui/HolyBoltButton';
import { PlayerPower } from '../player/PlayerPower';
import { ANGEL_ENCOUNTER } from '../story/angelData';
import { QuestChain, type QuestEvent } from '../quest/QuestChain';
import {
  QUEST_REGISTRY,
  THE_CORRUPTION_AT_THE_GATES,
  PATRON_IDLE_LINES,
  type ObjectiveTrigger,
  type TargetKind,
  type QuestDef,
} from '../quest/questData';
import { ObjectiveMarker } from '../quest/ObjectiveMarker';
import { QuestTracker } from '../ui/QuestTracker';
import { DevPanel } from '../ui/DevPanel';
import { PlayerProgression } from '../progression/PlayerProgression';
import { OREGON_SPIRIT_ID } from '../spirit/spiritData';
import type { SpiritEntity } from '../spirit/SpiritEntity';
import type { Interactable } from '../entities/Interactable';
import type { PlayerPath } from '../story/playerPath';
import { getInsets, UI_MARGIN } from '../ui/uiLayout';
import {
  CAMERA_ZOOM,
  PLAYER_ATTACK_RANGE,
  PLAYER_ATTACK_COOLDOWN_MS,
  PLAYER_HP_REGEN_PER_SEC,
  PLAYER_HP_REGEN_DELAY_MS,
  SASQUATCH_DAMAGE,
  DEV_GRANT_XP_CHUNK,
  DEV_MODE,
  DMG_PER_LEVEL,
  MAX_ENERGY,
  ENERGY_REGEN_PER_SEC,
  ENERGY_REGEN_DELAY_MS,
  DASH_DAMAGE,
  DASH_ENERGY_COST,
  DASH_COOLDOWN_MS,
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
  type TownsfolkVariant,
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
} from './settings';
import { TOWN_TILES } from '../town/townTiles';
import { buildTown, type TownFeatures, type DoorFeature } from '../town/TownBuilder';
import { PORTLAND_TOWN, PORTLAND_NPC_LINES } from '../town/townData';
import type { WashingtonMap } from '../map/mapTypes';
import washingtonMap from '../map/washington.map.json';

// Proximity ranges in px, tuned for 32px tiles.
const DOOR_TRIGGER = 20; // < one tile (32) so returning one tile out doesn't re-enter
const NPC_AUTO_RANGE = 44; // ~1.4 tiles — auto-open dialogue on contact
const NPC_TALK_RANGE = 80; // ~2.5 tiles — show the Talk button

// The lone Sasquatch sits in dense forest, 26 tiles north of the Seattle spawn.
const SASQUATCH_SPAWN = { x: 9872, y: 4464 };

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

/**
 * The overworld scene: renders Washington, stamps the Seattle town onto it,
 * spawns the player in the town, and wires camera, controls, the town NPC +
 * dialogue, building-door portals, and the debug readout. Building interiors
 * run in the separate, reusable InteriorScene.
 */
export class MainScene extends Phaser.Scene {
  private map!: GameMap;
  private player!: Player;
  private controls!: Controls;
  private readout!: DebugReadout;
  private town!: TownFeatures;
  private npc!: Npc;
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
  private attackButton!: AttackButton;
  private banner!: Phaser.GameObjects.Text;
  private worldFx!: Phaser.GameObjects.Layer;
  private attackCooldownUntil = 0;
  private lastCombatTime = -1e9;
  private playerDead = false;

  // The Power Swap: demonic (default) → holy (at God's judgment). Centralized +
  // serializable; drives the golden ability reflavor + the Holy Bolt's gating.
  private readonly power = new PlayerPower();
  private holyBoltButton!: HolyBoltButton;
  private holyBoltCooldownUntil = 0;
  private holyAura?: Phaser.GameObjects.Arc; // subtle golden aura while holy

  // Progression / leveling. Level-derived maxHP + damage feed the combat above.
  private progression!: PlayerProgression;
  private xpBar!: HealthBar;
  private levelBadge!: Phaser.GameObjects.Text;
  private levelBanner!: Phaser.GameObjects.Text;

  // Combat Depth v1: energy resource + dash ability.
  private energy!: Health;
  private energyBar!: HealthBar;
  private lastEnergySpendTime = -1e9;
  private dashButton!: DashButton;
  private dashCooldownUntil = 0;
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

  // The Descent arc: the per-objective world setup + completion watcher. arcEnemies
  // are the live spawns for the current objective; arcMode picks the completion test.
  private readonly DESCENT_IDS = new Set(['descent-1', 'descent-2', 'descent-3', 'descent-4']);
  private arcEnemies: (Townsfolk | AngelEnemy)[] = [];
  private arcMode: 'defeat' | 'plunder' | 'reach' | 'pickup' | 'none' = 'none';
  private arcReach: { x: number; y: number } | null = null;
  private arcShipmentPos: { x: number; y: number } | null = null;
  private arcHolyBaseline = 0;
  private arcHolyRequired = 0;

  // Interaction targets (the real NPC and, when Spirit Vision is on, spirits).
  private talkTarget: Interactable | null = null; // in range now (drives Talk button)
  private guardTarget: Interactable | null = null; // already auto-talked; wait to leave range
  private reenableControls = false;
  private portalCooldownUntil = 0;
  private earthCollider!: Phaser.Physics.Arcade.Collider; // player vs Earth terrain

  // --- Save system ---
  /** How this run was launched from the TitleScene: 'new' or 'continue'. */
  private launchMode: 'new' | 'continue' = 'new';
  /** True once create() has finished building + (optionally) loading — gates autosave. */
  private gameReady = false;
  /** True while applySave() is restoring — suppresses autosave so it can't write partial state. */
  private restoring = false;
  /** The player's current awarded title (mirrors the HUD text; serialized). */
  private currentTitle: string | null = null;
  private savedFlash?: Phaser.GameObjects.Text;
  /** Throttle: time (scene ms) of the last autosave write. */
  private lastAutosaveAt = -1e9;

  constructor() {
    super('MainScene');
  }

  /** Receive the launch mode from the TitleScene (before create()). */
  init(data?: { mode?: 'new' | 'continue' }): void {
    this.launchMode = data?.mode === 'continue' ? 'continue' : 'new';
  }

  create(): void {
    const data = washingtonMap as unknown as WashingtonMap;

    // Overworld map, now including the extra town tiles in its tileset.
    this.map = new GameMap(this, data, TOWN_TILES);

    this.physics.world.setBounds(0, 0, this.map.pixelWidth, this.map.pixelHeight);
    this.cameras.main.setBounds(0, 0, this.map.pixelWidth, this.map.pixelHeight);
    this.cameras.main.setBackgroundColor('#0b1a2b');

    // City labels for everywhere except the real walkable towns.
    new CityMarkers(this, this.map, ['Seattle', 'Portland']);

    // Stamp the town onto the overworld and read back its feature positions.
    this.town = buildTown(this.map);
    this.addTownDecor();

    // Portland (Oregon) — a second town from the same system, just a nameplate
    // (no rift). Built before the world snapshot so its tiles + NPC are world.
    this.portland = buildTown(this.map, PORTLAND_TOWN);
    this.addTownLabel(this.portland.label);

    // Spawn the player in the town square.
    this.player = new Player(this, this.town.spawn.x, this.town.spawn.y);
    this.earthCollider = this.physics.add.collider(this.player.sprite, this.map.layer);

    // Quest-giver NPC in the plaza. Its dialogue is chosen per quest-state at
    // talk time (see openDialogueWith); the lines passed here are the inactive
    // set as a sensible default.
    this.npc = new Npc(this, this.town.npc.x, this.town.npc.y, [
      ...THE_CORRUPTION_AT_THE_GATES.npcInactiveLines,
    ]);
    this.physics.add.collider(this.player.sprite, this.npc.sprite);

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
    // The reusable projectile system draws bolts into the world-FX layer (so the
    // UI camera ignores them). Enemy bolts damage the player; impacts spawn a poof.
    this.projectiles = new ProjectileSystem(this, this.map, this.worldFx);
    this.projectiles.onPlayerHit = (dmg) => this.onProjectileHitPlayer(dmg);
    this.projectiles.onEnemyHit = (x, y, radius, dmg) => this.resolveHolyBoltHit(x, y, radius, dmg);
    this.projectiles.onImpact = (x, y, color) => this.spawnBoltImpact(x, y, color);
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
    this.progression.onChange = () => this.refreshXpUi();
    this.playerHealth = new Health(this.progression.effectiveMaxHP);
    this.energy = new Health(MAX_ENERGY); // energy is a generic clamped pool
    this.sasquatch = new Sasquatch(this, SASQUATCH_SPAWN.x, SASQUATCH_SPAWN.y);
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
    // Quest-givers: the Seattle NPC gives the opening quest; the Oregon spirit is
    // the dark PATRON who gives the whole descent arc — reachable only with Spirit
    // Vision on AND only offered while the player is corrupted (requiresCorruption).
    // (The Portland NPC is no longer a giver; talking to it shows its flavor lines.)
    this.questGivers = [
      {
        entity: this.npc,
        pos: () => ({ x: this.npc.sprite.x, y: this.npc.sprite.y }),
        questIds: ['corruption-at-the-gates'],
        idleLines: [],
      },
    ];
    if (this.oregonSpirit) {
      const patron = this.oregonSpirit;
      this.questGivers.push({
        entity: patron,
        pos: () => ({ x: patron.x, y: patron.y }),
        questIds: ['descent-1', 'descent-2', 'descent-3', 'descent-4'],
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
    this.zoomControls = new ZoomControls(this, cam, this.map.pixelWidth, this.map.pixelHeight);
    this.readout = new DebugReadout(this, this.map, this.player);
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
    // Zoom keeps smoothing every frame, even during dialogue.
    this.zoomControls.update(delta);
    this.updateCombatHud();
    this.updateObjectiveMarker();
    this.updateSinMarker();
    this.updateLairEntry();
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
      this.readout.update();
      return;
    }

    // Dashing overrides normal movement: hold the dash velocity (terrain colliders
    // still stop the player), damage enemies passed through, then resume control.
    if (this.isDashing()) {
      this.player.sprite.setVelocity(this.dashDir.x * DASH_SPEED, this.dashDir.y * DASH_SPEED);
      this.spawnDashTrail();
      this.dashDamageTick();
      if (this.time.now >= this.dashEndsAt) this.endDash();
    } else {
      const dir = this.controls.getDirection();
      this.player.setDirection(dir.x, dir.y);
    }

    // World-gated systems: all Earth content (NPCs, enemies, quests, encounters,
    // pickups) ticks only while Earth is the active world. Heaven is empty — its
    // only per-frame logic is the return-gate proximity. Movement, dash, zoom, the
    // HUD, regen and projectiles are world-agnostic and run for both.
    if (this.activeWorld === WORLD_EARTH) {
      this.checkDoors();
      this.checkQuestProximity();
      this.checkAngelEncounter();
      this.updateArc(); // descent-arc completion watcher (before interactions so a
      // "return to the outpost" completes before the patron auto-offers the next quest)
      if (this.isDashing()) this.talkButton.setVisible(false);
      else this.checkInteractions();
      this.sasquatch.update(this.player.x, this.player.y, this.time.now);
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
    this.projectiles.update(delta, this.player.x, this.player.y, PROJECTILE_PLAYER_HIT_RADIUS);
    this.hazards.update(this.time.now, this.player.x, this.player.y, this.playerDead);
    this.pickups.update(this.player.x, this.player.y);
    this.regenTick(delta);
    this.readout.update();
  }

  // --- Combat ---------------------------------------------------------------

  private createCombatHud(): void {
    const depth = 2000;
    // Top-left cluster: a level badge + HP numbers on top, HP bar, then a thin
    // XP bar directly beneath — a clean HP + XP group above the debug readout.
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
    this.attackButton = new AttackButton(this, () => this.tryAttack());
    this.dashButton = new DashButton(this, () => this.tryDash());
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
      .setDepth(2100)
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
      .setDepth(2101)
      .setStroke('#08131f', 6)
      .setVisible(false);

    const layout = (): void => {
      const ins = getInsets(this);
      const x = ins.left + UI_MARGIN;
      const base = ins.top + UI_MARGIN;
      // Three stacked bars: HP (thick) → XP → Energy, with HP numbers and the
      // level badge in the right column. Energy ends above the debug readout.
      this.playerBar.setPosition(x, base + 7);
      this.playerHpText.setPosition(x + 158, base + 7);
      this.xpBar.setPosition(x, base + 17);
      this.energyBar.setPosition(x, base + 26);
      this.levelBadge.setPosition(x + 158, base + 26);
    };
    layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, layout);

    // Gameplay keys (never gated by DEV_MODE): Attack (also the on-screen button)
    // and a desktop-convenience Dash key alongside the on-screen Dash button.
    const kb = this.input.keyboard;
    kb?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE).on('down', () => this.tryAttack());
    kb?.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT).on('down', () => this.tryDash());
    // Desktop convenience for the Holy Bolt (self-gates: holy-only + cost/cooldown).
    kb?.addKey(Phaser.Input.Keyboard.KeyCodes.F).on('down', () => this.tryHolyBolt());
    // Desktop convenience for the on-screen "Corrupt the Portal" button (self-gates).
    kb?.addKey(Phaser.Input.Keyboard.KeyCodes.C).on('down', () => this.tryCorruptPortal());

    this.refreshXpUi();
  }

  private updateCombatHud(): void {
    const remaining = this.attackCooldownUntil - this.time.now;
    this.attackButton.setCooldownRatio(remaining / PLAYER_ATTACK_COOLDOWN_MS);
    this.playerBar.setRatio(this.playerHealth.ratio);
    this.playerHpText.setText(`${Math.ceil(this.playerHealth.current)} / ${this.playerHealth.max}`);
    this.energyBar.setRatio(this.energy.ratio);
    const dashCdRatio = (this.dashCooldownUntil - this.time.now) / DASH_COOLDOWN_MS;
    this.dashButton.setState(dashCdRatio, this.energy.current < DASH_ENERGY_COST);
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
    if (levelsGained > 0) this.onLevelUp();
  }

  /** Apply level-derived stats, heal to full, and play the level-up moment. */
  private onLevelUp(): void {
    this.playerHealth.setMax(this.progression.effectiveMaxHP);
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

  private tryAttack(): void {
    if (this.playerDead || this.dialogue.isOpen() || this.choice.isOpen()) return;
    if (this.time.now < this.attackCooldownUntil) return; // on cooldown: tap does nothing
    this.attackCooldownUntil = this.time.now + PLAYER_ATTACK_COOLDOWN_MS;

    // Swing in the facing direction; forgiving radius (the enemy is large).
    const sx = this.player.x + this.player.facingX * (PLAYER_ATTACK_RANGE * 0.5);
    const sy = this.player.y + this.player.facingY * (PLAYER_ATTACK_RANGE * 0.5);
    this.spawnSlash(sx, sy, Math.atan2(this.player.facingY, this.player.facingX));

    if (this.sasquatch.isAlive && this.sasquatch.distanceTo(sx, sy) <= PLAYER_ATTACK_RANGE + 24) {
      const dealt = this.sasquatch.takeHit(this.progression.effectiveDamage);
      this.spawnDamageNumber(this.sasquatch.x, this.sasquatch.y - 24, dealt, '#ffffff');
      this.lastCombatTime = this.time.now;
      if (!this.sasquatch.isAlive) {
        this.showBanner('Sasquatch defeated', 1600);
        this.notifyQuest('sasquatch-defeated');
        this.gainXP(this.sasquatch.xpReward); // enemy data drives the award
      }
    }

    // The same free swing also cleaves any swarmers / angels / townsfolk in the arc.
    this.hitSwarmersInRange(sx, sy, PLAYER_ATTACK_RANGE, this.progression.effectiveDamage);
    this.hitAngelsInRange(sx, sy, PLAYER_ATTACK_RANGE, this.progression.effectiveDamage);
    this.hitTownsfolkInRange(sx, sy, PLAYER_ATTACK_RANGE, this.progression.effectiveDamage);
    this.hitGuardiansInRange(sx, sy, PLAYER_ATTACK_RANGE, this.progression.effectiveDamage);
    this.hitCherubsInRange(sx, sy, PLAYER_ATTACK_RANGE, this.progression.effectiveDamage);
    this.hitDemonsInRange(sx, sy, PLAYER_ATTACK_RANGE, this.progression.effectiveDamage);
    this.hitBossesInRange(sx, sy, PLAYER_ATTACK_RANGE, this.progression.effectiveDamage);
  }

  /** Apply damage to every flaming-sword guardian within `range` of (x,y); award XP on kills. */
  private hitGuardiansInRange(x: number, y: number, range: number, damage: number): void {
    for (const g of this.guardians) {
      if (!g.isAlive) continue;
      if (g.distanceTo(x, y) <= range + 10) {
        const dealt = g.takeHit(damage);
        if (dealt > 0) {
          this.spawnDamageNumber(g.x, g.y - 26, dealt, '#ffd27a');
          this.lastCombatTime = this.time.now;
          if (!g.isAlive) this.onGuardianKilled(g);
        }
      }
    }
  }

  /** Apply damage to every townsfolk within `range` of (x,y); award XP on kills. */
  private hitTownsfolkInRange(x: number, y: number, range: number, damage: number): void {
    for (const t of this.townsfolk) {
      if (!t.isAlive) continue;
      if (t.distanceTo(x, y) <= range) {
        const dealt = t.takeHit(damage);
        if (dealt > 0) {
          this.spawnDamageNumber(t.x, t.y - 20, dealt, '#ffffff');
          this.lastCombatTime = this.time.now;
          if (!t.isAlive) this.onTownsfolkKilled(t);
        }
      }
    }
  }

  /** Apply damage to every angel within `range` of (x,y); award XP on kills. */
  private hitAngelsInRange(x: number, y: number, range: number, damage: number): void {
    for (const a of this.angels) {
      if (!a.isAlive) continue;
      if (a.distanceTo(x, y) <= range + 8) {
        const dealt = a.takeHit(damage);
        if (dealt > 0) {
          this.spawnDamageNumber(a.x, a.y - 28 * a.variant.scale, dealt, '#ffffff');
          this.lastCombatTime = this.time.now;
          if (!a.isAlive) this.onAngelKilled(a);
        }
      }
    }
  }

  /** Apply damage to every revealed swarmer within `range` of (x,y); award XP on kills. */
  private hitSwarmersInRange(x: number, y: number, range: number, damage: number): void {
    if (!this.swarmersRevealed) return;
    for (const s of this.swarmers) {
      if (!s.isAlive) continue;
      if (s.distanceTo(x, y) <= range) {
        const dealt = s.takeHit(damage);
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
    const dealt = this.playerHealth.damage(SASQUATCH_DAMAGE);
    this.player.flash();
    this.spawnDamageNumber(this.player.x, this.player.y - 26, dealt, '#ff6060');
    this.lastCombatTime = this.time.now;
    if (this.playerHealth.isDead) this.onPlayerDeath();
  }

  private onPlayerDeath(): void {
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
  private tryDash(): void {
    if (this.playerDead || this.dialogue.isOpen() || this.choice.isOpen()) return;
    if (this.isDashing() || this.time.now < this.dashCooldownUntil) return;
    if (this.energy.current < DASH_ENERGY_COST) return; // button already shows disabled

    this.energy.damage(DASH_ENERGY_COST);
    this.lastEnergySpendTime = this.time.now;
    this.dashCooldownUntil = this.time.now + DASH_COOLDOWN_MS;

    // Facing = last movement direction (or last-faced if idle); already unit-length.
    const len = Math.hypot(this.player.facingX, this.player.facingY) || 1;
    this.dashDir = { x: this.player.facingX / len, y: this.player.facingY / len };
    this.dashEndsAt = this.time.now + (DASH_DISTANCE / DASH_SPEED) * 1000;
    this.dashHits.clear();
    this.notifyBossesPlayerAction('dash'); // Envy's MIRROR may answer with a mimic-dash
  }

  private endDash(): void {
    this.dashEndsAt = 0;
    this.player.sprite.setVelocity(0, 0);
  }

  /** Abort an in-progress dash (used when control is frozen mid-lunge). */
  private cancelDash(): void {
    this.dashEndsAt = 0;
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
      s.onContact = () => this.onSwarmerContact();
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
    for (const s of this.swarmers) s.update(this.player.x, this.player.y, this.time.now);
    if (this.swarmers.some((s) => !s.isAlive)) this.swarmers = this.swarmers.filter((s) => s.isAlive);
  }

  private haltSwarmers(): void {
    for (const s of this.swarmers) s.halt();
  }

  private onSwarmerContact(): void {
    if (this.playerDead) return;
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
      const los = this.hasLineOfSight(a.x, a.y, this.player.x, this.player.y);
      a.update(this.player.x, this.player.y, this.time.now, los);
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

  /** A small fading flash where a bolt impacts. */
  private spawnBoltImpact(x: number, y: number, color: number): void {
    const flash = this.add.circle(x, y, 6, color, 0.85).setDepth(13);
    this.worldFx.add(flash);
    this.tweens.add({
      targets: flash,
      scale: 2.2,
      alpha: 0,
      duration: 180,
      ease: 'Quad.out',
      onComplete: () => flash.destroy(),
    });
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
    c.onMelee = (dmg) => this.onCherubMelee(dmg);
    this.physics.add.collider(c.sprite, mapLayer);
    this.uiCamera?.ignore(c.objects()); // runtime world objects: keep off the UI camera
    this.cherubs.push(c);
    return c;
  }

  /** Drive every Cherub (line of sight from the scene), then prune the dead. */
  private updateCherubs(): void {
    for (const c of this.cherubs) {
      const los = this.hasLineOfSight(c.x, c.y, this.player.x, this.player.y);
      c.update(this.player.x, this.player.y, this.time.now, los);
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

  private onCherubKilled(c: Cherub): void {
    this.showBanner(c.variantKey === 'cherubim' ? 'The Cherubim falls!' : 'Cherub vanquished', 1800);
    this.gainXP(c.xpReward); // enemy data drives the award
    this.dropHolyPower(c.x, c.y, c.holyPowerDrop); // larger drops than Earth angels
  }

  /** Apply damage to every Cherub within `range` of (x,y); award XP + drops on kills. */
  private hitCherubsInRange(x: number, y: number, range: number, damage: number): void {
    for (const c of this.cherubs) {
      if (!c.isAlive) continue;
      if (c.distanceTo(x, y) <= range + 14) {
        const dealt = c.takeHit(damage);
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
  private hitBossesInRange(x: number, y: number, range: number, damage: number): void {
    for (const b of this.bosses) {
      if (!b.isAlive) continue;
      if (b.distanceTo(x, y) <= range + 24) {
        const dealt = b.takeHit(damage);
        if (dealt > 0) {
          this.spawnDamageNumber(b.x, b.y - 40, dealt, '#ffffff');
          this.lastCombatTime = this.time.now;
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

  /** DEV: jump just south of Michael's sanctum (Heaven), travelling there if needed. */
  private devTeleportToMichael(): void {
    this.cancelDash();
    const sx = this.michael.x;
    const sy = this.michael.y;
    const off = this.michael.def.activationRange + 80;
    if (this.activeWorld !== WORLD_HEAVEN) this.travelToWorld(WORLD_HEAVEN, { x: sx, y: sy + off });
    else {
      this.player.sprite.setPosition(sx, sy + off);
      this.player.setDirection(0, 0);
      this.cameras.main.centerOn(sx, sy);
    }
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

  /** DEV: travel to the currently-available Sin's location (does not force-start it). */
  private devTeleportToNextSin(): void {
    const i = this.sins.nextIndex;
    if (i < 0) {
      this.showBanner('All available Sins are vanquished.', 2000);
      return;
    }
    this.teleportToBoss(this.ensureSinSpawned(i), false);
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
    this.controls.setEnabled(false); // hold the player still for the cutscene (re-enabled at the portal)
    this.player.setDirection(0, 0);
    this.playerHealth.full();
    this.energy.full();
    // The FIRST friendly angel: pure white-gold, peaceful — light piercing the lair.
    const angel = this.spawnRedemptionAngel(x, y - 30);
    // After the descent, the angel speaks; then the Earth portal opens.
    this.time.delayedCall(1300, () => {
      if (this.trinity.current !== 'ending') return;
      this.dialogue.open([...REDEMPTION_LINES], () => {
        if (this.trinity.current === 'ending') this.openEarthPortal(x, y, angel);
      });
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
        title: this.currentTitle,
      },
      quests: this.chain.toJSON(),
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
      // Progression first (drives derived maxHP/damage), then vitals.
      this.progression.level = Math.max(1, Math.floor(s.player.level));
      this.progression.currentXP = Math.max(0, Math.floor(s.player.currentXP));
      this.playerHealth.setMax(this.progression.effectiveMaxHP);
      this.playerHealth.current = Phaser.Math.Clamp(s.player.hp, 1, this.playerHealth.max);
      this.energy.current = Phaser.Math.Clamp(s.player.energy, 0, this.energy.max);
      this.holyPower.load({ holyPower: s.player.holyPower });

      // Narrative path + Spirit Vision + the angel-choice flag.
      this.angelEncounterFired = !!s.player.angelEncounterFired;
      if (this.angelEncounterFired) this.angel.dismiss();
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
    t.onHitPlayer = () => this.onTownsfolkHitPlayer();
    this.physics.add.collider(t.sprite, this.map.layer);
    this.uiCamera?.ignore(t.sprite); // runtime world object: keep off the UI camera
    this.townsfolk.push(t);
    return t;
  }

  /** Advance every townsfolk toward its target, then prune the dead. */
  private updateTownsfolk(): void {
    for (const t of this.townsfolk) {
      t.update(this.player.x, this.player.y, this.time.now);
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

  /** A townsfolk struck the player (intercepted / adjacent). */
  private onTownsfolkHitPlayer(): void {
    if (this.playerDead) return;
    const dealt = this.playerHealth.damage(TOWNSFOLK_PLAYER_DAMAGE);
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

    // Advance each guardian (the ranged one needs line of sight from the scene).
    for (const g of this.guardians) {
      const los = g.role === 'ranged' ? this.hasLineOfSight(g.x, g.y, this.player.x, this.player.y) : true;
      g.update(this.player.x, this.player.y, this.time.now, los);
    }

    // Defeat gate: both swords down → unlock the corruption interaction.
    if (this.guardianPhase === 'fighting' && this.guardians.every((g) => !g.isAlive)) {
      this.guardianPhase = 'defeated';
      this.showBanner('The guardians fall — the gate lies unguarded.', 2600);
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
    });
  }

  /** DEV: jump just south of the Holy Outpost so the guardians can be triggered. */
  private devTeleportToHolyOutpost(): void {
    this.cancelDash();
    this.player.sprite.setPosition(HOLY_OUTPOST_POSITION.x, HOLY_OUTPOST_POSITION.y + GUARDIAN_ACTIVATION_RANGE + 60);
    this.player.setDirection(0, 0);
    this.cameras.main.centerOn(HOLY_OUTPOST_POSITION.x, HOLY_OUTPOST_POSITION.y);
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
    d.onMelee = (dmg) => this.onCherubMelee(dmg); // reuse: damage the player
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

  /** Drive every Demon (idle when the player is far/elsewhere), then prune the dead. */
  private updateDemons(): void {
    for (const d of this.demons) d.update(this.player.x, this.player.y, this.time.now);
    if (this.demons.some((d) => !d.isAlive)) this.demons = this.demons.filter((d) => d.isAlive);
  }

  private haltDemons(): void {
    for (const d of this.demons) d.halt();
  }

  private onDemonKilled(d: Demon): void {
    this.gainXP(d.xpReward); // enemy data drives the award (no special loot)
  }

  /** Apply damage to every Demon within `range` of (x,y); award XP on kills. */
  private hitDemonsInRange(x: number, y: number, range: number, damage: number): void {
    for (const d of this.demons) {
      if (!d.isAlive) continue;
      if (d.distanceTo(x, y) <= range + 10) {
        const dealt = d.takeHit(damage);
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
  private resolveHolyBoltHit(x: number, y: number, radius: number, damage: number): boolean {
    const hit = (sprite: { x: number; y: number }, bodyR: number): boolean =>
      Phaser.Math.Distance.Between(x, y, sprite.x, sprite.y) <= radius + bodyR;

    if (this.sasquatch.isAlive && hit(this.sasquatch, 18)) {
      const dealt = this.sasquatch.takeHit(damage);
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
          const dealt = s.takeHit(damage);
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
        const dealt = a.takeHit(damage);
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
        const dealt = t.takeHit(damage);
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
        const dealt = g.takeHit(damage);
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
        const dealt = c.takeHit(damage);
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
        const dealt = d.takeHit(damage);
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
        const dealt = b.takeHit(damage);
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
    // Entering the Hell portal → REAL transition down to the Hell world.
    if (this.hellPortal && !this.transitioning && this.time.now >= this.worldCooldownUntil) {
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, this.hellPortal.x, this.hellPortal.y) <= PORTAL_ENTER_RANGE) {
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
  }

  /** DEV: jump to the throne (travelling to Heaven if needed). */
  private devTeleportToThrone(): void {
    this.cancelDash();
    const arrival = { x: this.thronePos.x, y: this.thronePos.y + 260 };
    if (this.activeWorld !== WORLD_HEAVEN) {
      this.travelToWorld(WORLD_HEAVEN, arrival);
    } else {
      this.player.sprite.setPosition(arrival.x, arrival.y);
      this.player.setDirection(0, 0);
      this.cameras.main.centerOn(this.thronePos.x, this.thronePos.y);
    }
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

  private isDescentActive(): boolean {
    const id = this.chain.activeQuest?.id;
    return id !== undefined && this.DESCENT_IDS.has(id);
  }

  /** Set up the world for the active descent objective (spawn enemies / pickup, pick the watcher). */
  private beginArcObjective(): void {
    this.clearArcObjective(); // clear any leftover arc spawns first
    const trig = this.chain.activeTrigger;
    switch (trig) {
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
      default:
        this.arcMode = 'none';
    }
    this.refreshQuestUi();
  }

  private beginPlunder(required: number): void {
    this.arcMode = 'plunder';
    this.arcHolyBaseline = this.holyPower.count;
    this.arcHolyRequired = required;
  }

  /** Watch for the active descent objective's completion each frame. */
  private updateArc(): void {
    if (!this.isDescentActive()) return;
    const trig = this.chain.activeTrigger;
    if (!trig) return;
    if (this.arcMode === 'defeat') {
      if (this.arcEnemies.length > 0 && this.arcEnemies.every((e) => !e.isAlive)) this.notifyQuest(trig);
    } else if (this.arcMode === 'plunder') {
      const collected = this.holyPower.count - this.arcHolyBaseline;
      const allDead = this.arcEnemies.length > 0 && this.arcEnemies.every((e) => !e.isAlive);
      if (allDead && collected >= this.arcHolyRequired) this.notifyQuest(trig);
    } else if (this.arcMode === 'reach' && this.arcReach) {
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, this.arcReach.x, this.arcReach.y) <= REACH_OUTPOST_RANGE) {
        this.notifyQuest(trig);
      }
    }
    // Keep the tracker's live "(N left)" / "(Holy Power x/y)" suffix current.
    if (this.arcMode === 'defeat' || this.arcMode === 'plunder') this.refreshQuestUi();
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

  /** Clear the current objective's arc enemies + watcher state (not the holy-power motes). */
  private clearArcObjective(): void {
    const set = new Set<Townsfolk | AngelEnemy>(this.arcEnemies);
    for (const e of this.arcEnemies) if (e.isAlive) e.destroy();
    this.townsfolk = this.townsfolk.filter((t) => !set.has(t));
    this.angels = this.angels.filter((x) => !set.has(x));
    this.arcEnemies = [];
    this.arcMode = 'none';
    this.arcReach = null;
    this.arcShipmentPos = null;
  }

  /** DEV: force the corrupted path (Spirit Vision on) so the descent arc is testable. */
  private devForceCorrupt(): void {
    this.setPlayerPath('corrupted');
  }

  /** DEV: jump to the Dark Outpost (the arc hub / patron). */
  private devTeleportToOutpost(): void {
    this.cancelDash();
    this.player.sprite.setPosition(DARK_OUTPOST_POSITION.x, DARK_OUTPOST_POSITION.y + 70);
    this.player.setDirection(0, 0);
    this.cameras.main.centerOn(DARK_OUTPOST_POSITION.x, DARK_OUTPOST_POSITION.y);
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

  /** DEV: jump straight to Portland (Oregon) to test the south without the walk. */
  private devTeleportToOregon(): void {
    this.cancelDash();
    this.player.sprite.setPosition(this.portland.spawn.x, this.portland.spawn.y);
    this.player.setDirection(0, 0);
    this.cameras.main.centerOn(this.portland.spawn.x, this.portland.spawn.y);
  }

  private spawnDamageNumber(x: number, y: number, amount: number, color: string): void {
    const t = this.add
      .text(x, y, `-${Math.round(amount)}`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '18px',
        color,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(13)
      .setStroke('#000000', 4);
    this.worldFx.add(t);
    this.tweens.add({
      targets: t,
      y: y - 34,
      alpha: 0,
      duration: 600,
      ease: 'Quad.out',
      onComplete: () => t.destroy(),
    });
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
    const candidates: Interactable[] = [this.npc, this.portlandNpc];
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
      case 'started':
        // No-soft-lock: if the opening beast was already slain, respawn it.
        if (e.questId === 'corruption-at-the-gates' && !this.sasquatch.isAlive) this.sasquatch.reset();
        if (this.DESCENT_IDS.has(e.questId)) this.beginArcObjective(); // set up objective 0
        this.refreshQuestUi();
        break;
      case 'objective-complete':
        // For descent quests, set up the NEXT objective's world state (the chain
        // has already advanced; if that was the last objective, activeObjectiveDef
        // is undefined and quest-complete follows).
        if (this.DESCENT_IDS.has(e.questId) && this.chain.activeObjectiveDef) this.beginArcObjective();
        this.refreshQuestUi();
        break;
      case 'quest-complete':
        if (this.DESCENT_IDS.has(e.questId)) this.clearArcObjective();
        this.grantQuestReward(e.questId);
        this.refreshQuestUi();
        break;
      case 'unlocked':
        // Informational (a later quest became available); the marker/giver handle it.
        break;
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
    this.showBanner(r.note ? `${r.banner}\n\n${r.note}` : r.banner, 3600);
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

  private checkAngelEncounter(): void {
    if (this.angelEncounterFired || this.playerPath !== 'neutral') return;
    const d = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      this.town.rift.x,
      this.town.rift.y,
    );
    if (d <= ANGEL_ENCOUNTER.triggerRange) this.startAngelEncounter();
  }

  private startAngelEncounter(): void {
    this.angelEncounterFired = true;
    this.angel.manifest();
    this.talkButton.setVisible(false);
    this.controls.setEnabled(false);
    this.player.setDirection(0, 0);
    // Angel speaks via the existing dialogue; the choice follows the last line.
    this.dialogue.open(ANGEL_ENCOUNTER.lines, () => this.presentAngelChoice());
  }

  private presentAngelChoice(): void {
    // Within the opening quest (objective "Face what stirs at the rift"), only
    // refusing advances the story: tapping Accept plays a placeholder line and
    // re-opens the choice. Outside the quest, the standalone two-branch logic is
    // untouched.
    const forced = this.chain.activeTrigger === 'angel-refused';
    this.choice.open(ANGEL_ENCOUNTER.prompt, [
      {
        label: ANGEL_ENCOUNTER.acceptLabel,
        onSelect: () => (forced ? this.onForcedAccept() : this.onAcceptLight()),
      },
      { label: ANGEL_ENCOUNTER.refuseLabel, onSelect: () => this.onRefuse() },
    ]);
  }

  /** Quest-forced encounter: Accept can't take hold — show a line, re-offer the choice. */
  private onForcedAccept(): void {
    const lines = this.chain.activeQuest?.forcedAcceptLines ?? ['...'];
    this.dialogue.open([...lines], () => this.presentAngelChoice());
  }

  private onAcceptLight(): void {
    this.setPlayerPath('righteous'); // Spirit Vision stays OFF
    this.angel.dismiss();
    // Righteous stub: a short acknowledgment, then back to normal play.
    this.dialogue.open(ANGEL_ENCOUNTER.righteousAck, () => {
      this.reenableControls = true;
    });
  }

  private onRefuse(): void {
    this.setPlayerPath('corrupted'); // turns Spirit Vision ON permanently
    this.angel.dismiss();
    this.spirit.fadeTintIn(1000); // the "sight opens" moment
    this.reenableControls = true; // resume play; the wraith is now visible
    // Within the quest this completes the final objective ("Face what stirs").
    this.notifyQuest('angel-refused');
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
    this.setPlayerPath('neutral');
    this.spirit.setSpiritVision(false); // 'neutral' alone doesn't turn it off
    this.sasquatch.reset();
    this.clearArcObjective(); // clear any descent-arc spawns + watcher state
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

    // Progression back to Lv1 / 0 XP, and the HP pool back to the level-1 max.
    this.progression.reset();
    this.playerHealth.setMax(this.progression.effectiveMaxHP);
    this.playerHealth.full();

    // Combat Depth: refill energy, end any dash, and reset the swarms to their
    // dormant starting packs (Seattle rift + Oregon seed).
    this.energy.full();
    this.lastEnergySpendTime = -1e9;
    this.dashEndsAt = 0;
    this.dashCooldownUntil = 0;
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
      { label: 'Start Portal Defense', onPress: () => this.devStartPortalDefense() },
      { label: 'Stop Portal Defense', onPress: () => this.resetPortalDefense() },
      { label: 'Refill Energy', onPress: () => this.energy.full() },
      { label: 'Teleport to Oregon', onPress: () => this.devTeleportToOregon() },
      { label: 'Force Corrupt', onPress: () => this.devForceCorrupt() },
      { label: 'Teleport to Dark Outpost', onPress: () => this.devTeleportToOutpost() },
      { label: 'Teleport to Holy Outpost', onPress: () => this.devTeleportToHolyOutpost() },
      { label: 'Start Guardian Fight', onPress: () => this.startGuardianFight() },
      { label: 'Reset Portal', onPress: () => this.resetGuardianEncounter() },
      { label: 'Spawn Cherub', onPress: () => this.devSpawnCherub('cherub') },
      { label: 'Spawn Cherubim', onPress: () => this.devSpawnCherub('cherubim') },
      { label: 'Smite All (Dev)', onPress: () => this.devSmite(true) },
      { label: 'Smite Adds (Dev)', onPress: () => this.devSmite(false) },
      { label: 'Teleport to Michael', onPress: () => this.devTeleportToMichael() },
      { label: 'Start Michael Fight', onPress: () => this.startMichaelFight() },
      { label: 'Reset Michael', onPress: () => this.resetMichael() },
      { label: 'Spawn Test Boss', onPress: () => this.devSpawnTestBoss() },
      { label: 'Teleport to Throne', onPress: () => this.devTeleportToThrone() },
      { label: "Trigger God's Judgment", onPress: () => this.devTriggerGodJudgment() },
      { label: 'Reset Judgment', onPress: () => this.resetGodJudgment() },
      { label: 'Grant Holy Power (swap to holy)', onPress: () => this.swapToHoly() },
      { label: 'Reset to Demonic', onPress: () => this.revertToDemonic() },
      { label: 'Go to Hell', onPress: () => this.devGoToHell() },
      { label: 'Spawn Demon', onPress: () => this.devSpawnDemon() },
      { label: 'Teleport to Next Sin', onPress: () => this.devTeleportToNextSin() },
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

    new DevPanel(this, actions.map((a) => ({ label: a.label, onPress: a.onPress })));
  }

  // --- Quest ----------------------------------------------------------------

  /**
   * Feed a world event to the active quest. The chain advances only if the
   * trigger matches its current objective, emitting events that drive the reward.
   * Still handles the no-soft-lock case: reaching the angel objective while
   * already corrupted auto-completes it (the angel will not manifest again).
   */
  private notifyQuest(trigger: ObjectiveTrigger): void {
    const result = this.chain.notify(trigger);
    if (!result.advanced || result.questCompleted) return;
    if (this.chain.activeTrigger === 'angel-refused' && this.playerPath === 'corrupted') {
      this.notifyQuest('angel-refused');
    }
  }

  /** The opening quest's OBJ 2 completes on rift proximity (independent of the angel). */
  private checkQuestProximity(): void {
    if (this.chain.activeTrigger !== 'rift-reached') return;
    const d = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      this.town.rift.x,
      this.town.rift.y,
    );
    if (d <= ANGEL_ENCOUNTER.triggerRange) this.notifyQuest('rift-reached');
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

  /** A live "(N left)" / "(Holy Power x/y)" suffix for descent-arc objectives. */
  private arcProgressSuffix(): string {
    if (!this.isDescentActive()) return '';
    if (this.arcMode === 'defeat') {
      const left = this.arcEnemies.filter((e) => e.isAlive).length;
      return `  (${left} left)`;
    }
    if (this.arcMode === 'plunder') {
      const got = Math.min(this.holyPower.count - this.arcHolyBaseline, this.arcHolyRequired);
      const left = this.arcEnemies.filter((e) => e.isAlive).length;
      return `  (Holy Power ${Math.max(0, got)}/${this.arcHolyRequired}, ${left} angels left)`;
    }
    return '';
  }

  /** Position the world marker on the current target and update the edge arrow. */
  private updateObjectiveMarker(): void {
    const t = this.currentMarkerTarget();
    if (t) this.marker.show(t.x, t.y, t.label);
    else this.marker.hide();
    this.tracker.updateArrow(this.cameras.main, t);
  }

  /** Where the objective marker should point right now, or null for none. */
  private currentMarkerTarget(): { x: number; y: number; label: string } | null {
    // Quests live on Earth; no marker while in Heaven.
    if (this.activeWorld !== WORLD_EARTH) return null;
    // Active quest → its current objective's world target.
    const active = this.chain.activeQuest;
    if (active) {
      const obj = this.chain.activeObjectiveDef;
      return obj && obj.target ? this.resolveTarget(obj.target) : null;
    }
    // No active quest → point at the giver of the next OFFERABLE quest (the
    // pre-accept pointer), so finishing one quest leads to the next.
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
      case 'sasquatch':
        return this.sasquatch.isAlive ? { x: this.sasquatch.x, y: this.sasquatch.y, label: '' } : null;
      case 'rift':
        return { x: this.town.rift.x, y: this.town.rift.y, label: '' };
      case 'npc':
        return { x: this.npc.sprite.x, y: this.npc.sprite.y, label: '' };
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
    }
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
   * The Holy Power counter — a fixed, right-anchored HUD readout in the free
   * TOP-RIGHT corner, grouped with the resource cluster but clear of the top-left
   * HP/XP/energy bars, the top-centre quest tracker, the joystick, and the action
   * buttons. Routed through the UI camera (fixed across zoom).
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
      .setDepth(2000);

    const layout = (): void => {
      const insets = getInsets(this);
      this.holyPowerText.setPosition(this.scale.width - insets.right - UI_MARGIN, insets.top + UI_MARGIN + 4);
    };
    layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, layout);
  }

  /** Refresh the Holy Power counter (called on every count change). */
  private refreshHolyPowerUi(): void {
    this.holyPowerText.setText(`✦ Holy Power: ${this.holyPower.count}`);
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

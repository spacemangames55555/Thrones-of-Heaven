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
import { ArchangelMichael } from '../entities/ArchangelMichael';
import { HellPortal } from '../entities/HellPortal';
import { PortalDefense } from '../encounter/PortalDefense';
import { buildHeavenMapData, HEAVEN_WIDTH, HEAVEN_HEIGHT, HEAVEN_CHERUB_SPAWNS, MICHAEL_SANCTUM, THRONE_POSITION } from '../map/heavenWorld';
import { WORLD_EARTH, WORLD_HEAVEN, type WorldId, type WorldRuntime } from '../world/worlds';
import { ProjectileSystem } from '../combat/ProjectileSystem';
import { PickupSystem, type PickupCollected } from '../world/PickupSystem';
import { HolyPower } from '../progression/HolyPower';
import { Health } from '../combat/Health';
import { HealthBar } from '../combat/HealthBar';
import { AttackButton } from '../ui/AttackButton';
import { DashButton } from '../ui/DashButton';
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
  MICHAEL,
  HEAVEN_WORLD_GAP,
  HEAVEN_ARRIVAL_OFFSET,
  EARTH_RETURN_OFFSET,
  WORLD_TRANSITION_MS,
  WORLD_TRANSITION_COOLDOWN_MS,
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
/** Shown when the player walks into the Hell portal (the Hell map is the NEXT build). */
const HELL_PORTAL_ENTER = 'Hell awaits below… (coming soon)';

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

  // Archangel Michael: the unique multi-phase Heaven boss + his summoned adds + a
  // dedicated boss HP bar (UI camera). A triggerable encounter unit.
  private michael!: ArchangelMichael;
  private michaelAdds: Cherub[] = [];
  private michaelBar!: HealthBar;
  private michaelBarBg!: Phaser.GameObjects.Rectangle;
  private michaelNameText!: Phaser.GameObjects.Text;

  // God's Judgment beat: the throne set piece, the Michael-gated scripted
  // sequence, and the Hell portal it spawns. State is centralized + serializable.
  private michaelDefeated = false; // the gate: judgment is locked until this is true
  private judgmentFired = false; // the sequence has played (plays once)
  private judgmentActive = false; // mid-sequence guard
  private thronePos = { x: 0, y: 0 };
  private hellPortal?: HellPortal;
  private hellPortalEnterShownUntil = 0;

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

  constructor() {
    super('MainScene');
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
    this.projectiles.onImpact = (x, y, color) => this.spawnBoltImpact(x, y, color);
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
    this.createMichaelHud(); // the boss HP bar (UI partition)
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
  }

  override update(_time: number, delta: number): void {
    // Zoom keeps smoothing every frame, even during dialogue.
    this.zoomControls.update(delta);
    this.updateCombatHud();
    this.updateObjectiveMarker();

    if (this.playerDead) {
      this.cancelDash();
      this.player.setDirection(0, 0);
      this.sasquatch.halt();
      this.haltSwarmers();
      this.haltAngels();
      this.haltTownsfolk();
      this.haltGuardians();
      this.haltCherubs();
      this.haltMichael();
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
      this.haltMichael();
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
    } else {
      this.talkButton.setVisible(false);
      this.updateHeaven();
    }
    // World-agnostic: Cherubs (Heaven defenders + dev spawns), projectiles, and
    // pickups run for both worlds — Cherubs idle when the player is far, and the
    // pickup/projectile systems carry drops/bolts in whichever world they exist.
    this.updateCherubs();
    this.updateMichael();
    this.updateGodJudgment();
    this.projectiles.update(delta, this.player.x, this.player.y, PROJECTILE_PLAYER_HIT_RADIUS);
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
    this.hitMichael(sx, sy, PLAYER_ATTACK_RANGE, this.progression.effectiveDamage);
  }

  /** Apply a player hit to Michael if in range (the boss is a single entity). */
  private hitMichael(x: number, y: number, range: number, damage: number): void {
    if (!this.michael || !this.michael.isAlive) return;
    if (this.michael.distanceTo(x, y) <= range + 24) {
      const dealt = this.michael.takeHit(damage);
      if (dealt > 0) {
        this.spawnDamageNumber(this.michael.x, this.michael.y - 40, dealt, '#ffffff');
        this.lastCombatTime = this.time.now;
      }
    }
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
      (this.michael?.isAggro ?? false);
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

    if (this.michael && this.michael.isAlive && !this.dashHits.has(this.michael)) {
      if (this.michael.distanceTo(px, py) <= DASH_HIT_RADIUS + 24) {
        this.dashHits.add(this.michael);
        const dealt = this.michael.takeHit(dmg);
        if (dealt > 0) {
          this.spawnDamageNumber(this.michael.x, this.michael.y - 40, dealt, '#ffe9a8');
          this.lastCombatTime = this.time.now;
        }
      }
    }
  }

  /** A fading after-image streak so the lunge reads clearly. */
  private spawnDashTrail(): void {
    const ghost = this.add
      .rectangle(this.player.x, this.player.y, 18, 34, 0x9fe0ff, 0.35)
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
    if (includeBoss) this.hitMichael(px, py, R, HUGE); // → die → onDefeat (rewards + hook)
  }

  // --- Archangel Michael: the multi-phase, summoning boss -------------------
  //
  // A TRIGGERABLE unit (approach → activate → phased fight w/ capped summons →
  // defeat). The phase machine lives on the entity (ArchangelMichael); the scene
  // wires its hooks to the existing projectile / Cherub / pickup / XP systems and
  // owns the boss HP bar. NOT wired to the quest chain.

  /** Build Michael at his sanctum (Heaven) + a marker; wire his hooks. World object. */
  private setupMichael(): void {
    const o = this.heavenMap.bounds;
    const sx = o.x + MICHAEL_SANCTUM.x;
    const sy = o.y + MICHAEL_SANCTUM.y;
    this.addHeavenLabel(sx, sy - 60, '⚔ Michael’s Sanctum ⚔', '#fff3c4');
    const ring = this.add.circle(sx, sy, 30, 0xfff1b8, 0.22).setDepth(6);
    this.tweens.add({ targets: ring, scale: 2, alpha: 0.05, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    this.michael = new ArchangelMichael(this, sx, sy);
    this.michael.onFire = (origin, dirs) => {
      const cfg = MICHAEL.phases[this.michael.currentPhase - 1];
      for (const d of dirs) {
        this.projectiles.spawn({
          x: origin.x,
          y: origin.y,
          dirX: d.x,
          dirY: d.y,
          speed: MICHAEL.projectileSpeed,
          damage: cfg.projectileDamage,
          maxRange: MICHAEL.projectileRange,
          faction: 'enemy',
          color: 0xfff1b8,
          radius: MICHAEL.boltRadius,
        });
      }
    };
    this.michael.onMelee = (dmg) => this.onCherubMelee(dmg); // reuse: damage the player
    this.michael.onSummon = (count) => this.summonMichaelWave(count);
    this.michael.onPhaseChange = (phase) => this.onMichaelPhaseChange(phase);
    this.michael.onDefeat = () => this.onMichaelDefeated();
    this.physics.add.collider(this.michael.sprite, this.heavenMap.layer);
    this.uiCamera?.ignore(this.michael.objects());
  }

  /** TRIGGER: begin the Michael fight (proximity or dev button). */
  private startMichaelFight(): void {
    this.michael.activate();
  }

  /** RESET: Michael dormant, full HP, Phase 1, adds cleared, bar hidden. */
  private resetMichael(): void {
    this.clearMichaelAdds();
    this.michael.reset();
    this.michaelBar?.setVisible(false);
    this.michaelBarBg?.setVisible(false);
    this.michaelNameText?.setVisible(false);
  }

  /** Drive Michael each frame: proximity activation, behavior, the boss bar. */
  private updateMichael(): void {
    if (!this.michael) return;
    // Proximity activation: nearing the sanctum wakes the boss.
    if (!this.michael.isActive && this.michael.isAlive) {
      if (this.michael.distanceTo(this.player.x, this.player.y) <= MICHAEL.activationRange) this.startMichaelFight();
    }
    const los = this.hasLineOfSight(this.michael.x, this.michael.y, this.player.x, this.player.y);
    this.michael.update(this.player.x, this.player.y, this.time.now, los);
    this.refreshMichaelBar();
  }

  private haltMichael(): void {
    this.michael?.halt();
  }

  /** Summon up to the cap: reinforcement Cherubs ring Michael (on walkable tiles). */
  private summonMichaelWave(count: number): void {
    this.michaelAdds = this.michaelAdds.filter((a) => a.isAlive);
    const room = MICHAEL.summonCap - this.michaelAdds.length;
    const n = Math.min(count, room);
    if (n <= 0) return;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 90 + Math.random() * 50;
      const spot = this.heavenMap.nearestWalkableWorld(this.michael.x + Math.cos(a) * r, this.michael.y + Math.sin(a) * r);
      const c = this.spawnCherub(MICHAEL.summonType, spot.x, spot.y, this.heavenMap.layer);
      this.michaelAdds.push(c);
    }
    this.showBanner('Michael summons reinforcements!', 1400);
  }

  /** Remove Michael's summoned adds (defeat / reset) — also from the live cherub list. */
  private clearMichaelAdds(): void {
    const set = new Set<Cherub>(this.michaelAdds);
    for (const a of this.michaelAdds) if (a.isAlive) a.destroy();
    this.cherubs = this.cherubs.filter((c) => !set.has(c));
    this.michaelAdds = [];
  }

  /** Phase transition telegraph: flash + burst + banner so escalation is felt. */
  private onMichaelPhaseChange(phase: number): void {
    if (phase <= 1) return; // Phase 1 is activation, not an escalation beat
    this.showBanner(`Archangel Michael — Phase ${phase}!`, 1800);
    const ring = this.add.circle(this.michael.x, this.michael.y, 30, 0xffffff, 0).setStrokeStyle(5, 0xfff1b8, 0.9).setDepth(13);
    this.worldFx.add(ring);
    this.tweens.add({ targets: ring, scale: 4, alpha: 0, duration: 520, ease: 'Quad.out', onComplete: () => ring.destroy() });
    this.michael.sprite.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.time.delayedCall(140, () => { if (this.michael.isAlive) this.michael.sprite.setTint(MICHAEL.color).setTintMode(Phaser.TintModes.MULTIPLY); });
  }

  /** Defeat: clear adds, climactic burst, big XP + Holy Power, victory + God hook. */
  private onMichaelDefeated(): void {
    this.michaelDefeated = true; // GATE: unlocks the God's-judgment beat at the throne
    this.clearMichaelAdds();
    this.spawnLevelUpBurst(); // a quick radiant burst (reuse)
    const burst = this.add.circle(this.michael.x, this.michael.y, 40, 0xfff1b8, 0.5).setDepth(13);
    this.worldFx.add(burst);
    this.tweens.add({ targets: burst, scale: 6, alpha: 0, duration: 900, ease: 'Quad.out', onComplete: () => burst.destroy() });
    this.gainXP(MICHAEL.xpReward);
    this.dropHolyPower(this.michael.x, this.michael.y, MICHAEL.holyPowerDrop);
    this.showBanner(MICHAEL_VICTORY_LINE, 3000);
    this.time.delayedCall(3200, () => this.showBanner(GOD_JUDGMENT_HOOK, 4200));
    this.michaelBar?.setVisible(false);
    this.michaelBarBg?.setVisible(false);
    this.michaelNameText?.setVisible(false);
  }

  /** The dedicated boss HP bar (UI camera, fixed): name + phase + HP, top-centre. */
  private createMichaelHud(): void {
    const depth = 2050;
    this.michaelBarBg = this.add
      .rectangle(0, 0, 320, 22, 0x10060a, 0.85)
      .setStrokeStyle(2, 0xfff1b8, 0.95)
      .setScrollFactor(0)
      .setDepth(depth)
      .setVisible(false);
    this.michaelBar = new HealthBar(this, 312, 16, depth + 1, 0xffe06a);
    this.michaelBar.setScrollFactor(0);
    this.michaelBar.setVisible(false);
    this.michaelNameText = this.add
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
      this.michaelBarBg.setPosition(cx, top + 11);
      this.michaelBar.setPosition(cx - 156, top + 11);
      this.michaelNameText.setPosition(cx, top - 2);
    };
    layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, layout);
  }

  /** Sync the boss bar to Michael's live HP + phase; show only while he fights (in Heaven). */
  private refreshMichaelBar(): void {
    const show = (this.michael?.isActive ?? false) && this.activeWorld === WORLD_HEAVEN;
    this.michaelBarBg.setVisible(show);
    this.michaelBar.setVisible(show);
    this.michaelNameText.setVisible(show);
    if (show) {
      this.michaelBar.setRatio(this.michael.hpRatio);
      this.michaelNameText.setText(`Archangel Michael — Phase ${this.michael.currentPhase}`);
    }
  }

  /** DEV: jump just south of Michael's sanctum (Heaven), travelling there if needed. */
  private devTeleportToMichael(): void {
    this.cancelDash();
    const sx = this.michael.x;
    const sy = this.michael.y;
    const place = (): void => {
      this.player.sprite.setPosition(sx, sy + MICHAEL.activationRange + 80);
      this.player.setDirection(0, 0);
      this.cameras.main.centerOn(sx, sy);
    };
    if (this.activeWorld !== WORLD_HEAVEN) this.travelToWorld(WORLD_HEAVEN, { x: sx, y: sy + MICHAEL.activationRange + 80 });
    else place();
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
  }

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

  /** 2) Power-strip beat — NARRATIVE ONLY for now (a draining effect + lines). */
  private godJudgmentPowerStrip(): void {
    this.spawnPowerStripEffect();
    // === FUTURE POWER-STRIP HOOK ============================================
    // The REAL mechanical power-strip (e.g. reset level/XP, zero Holy Power,
    // shrink the HP pool, revoke abilities) will be applied HERE in a later
    // build. It is NARRATIVE ONLY now — DO NOT change the player's stats yet.
    //   e.g. this.progression.reset(); this.holyPower.reset();
    //        this.playerHealth.setMax(this.progression.effectiveMaxHP); ...
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
    // Entering the Hell portal → placeholder beat (the Hell map is the NEXT build).
    if (this.hellPortal && this.time.now >= this.hellPortalEnterShownUntil) {
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, this.hellPortal.x, this.hellPortal.y) <= PORTAL_ENTER_RANGE) {
        this.hellPortalEnterShownUntil = this.time.now + 3600;
        this.showBanner(HELL_PORTAL_ENTER, 2600);
      }
    }
  }

  /** RESET: judgment un-fired, Hell portal removed, gate re-locked (replay the beat). */
  private resetGodJudgment(): void {
    this.michaelDefeated = false;
    this.judgmentFired = false;
    this.judgmentActive = false;
    this.hellPortalEnterShownUntil = 0;
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
    const arc = this.add
      .arc(x, y, PLAYER_ATTACK_RANGE * 0.7, -45, 45, false, 0xffe9a8, 0.45)
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

    // Reset the Michael encounter: dormant, full HP, Phase 1, adds cleared.
    this.resetMichael();

    // Reset God's-judgment beat: gate re-locked, judgment un-fired, Hell portal gone.
    this.resetGodJudgment();

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
      { label: 'Teleport to Throne', onPress: () => this.devTeleportToThrone() },
      { label: "Trigger God's Judgment", onPress: () => this.devTriggerGodJudgment() },
      { label: 'Reset Judgment', onPress: () => this.resetGodJudgment() },
      { label: 'Go to Heaven', onPress: () => this.devGoToHeaven() },
      { label: 'Return to Earth', onPress: () => this.devReturnToEarth() },
      { label: 'Toggle World', onPress: () => this.devToggleWorld() },
      { label: 'Complete Active Quest', onPress: () => this.chain.completeActive() },
      { label: 'Reset All Quests', onPress: () => this.devResetQuests() },
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

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
import { PortalDefense } from '../encounter/PortalDefense';
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

// >>> PLACEHOLDER TEXT — edit these two strings to change the descent-climax beats.
// Shown when the player corrupts the Heaven Portal (gold→purple), and when the
// player later walks into the now-corrupted portal (the Heaven map is a LATER build).
const CORRUPT_PORTAL_LINE = 'The gate is defiled. The way to Heaven opens…';
const ENTER_PORTAL_PLACEHOLDER = 'Heaven awaits beyond… (coming soon)';

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
  private enterPortalShownUntil = 0;

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
    this.physics.add.collider(this.player.sprite, this.map.layer);

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
    this.createDevTools(); // dev panel + dev keys (gated by DEV_MODE)

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
      this.guardians.some((g) => g.isAggro);
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
    for (let i = 0; i < n; i++) {
      const ang = (Math.PI * 2 * i) / Math.max(1, n) + Math.random() * 0.6;
      const r = n > 1 ? 18 + Math.random() * 14 : 0;
      const spot = this.map.nearestWalkableWorld(x + Math.cos(ang) * r, y + Math.sin(ang) * r);
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
    this.enterPortalShownUntil = 0;
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

    // Entering the now-corrupted portal is a placeholder beat (no map change).
    if (this.guardianPhase === 'corrupted') {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.heavenPortal.x, this.heavenPortal.y);
      if (d <= PORTAL_ENTER_RANGE && this.time.now >= this.enterPortalShownUntil) {
        this.enterPortalShownUntil = this.time.now + 3600;
        this.showBanner(ENTER_PORTAL_PLACEHOLDER, 2600);
      }
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

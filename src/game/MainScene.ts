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
import { Health } from '../combat/Health';
import { HealthBar } from '../combat/HealthBar';
import { AttackButton } from '../ui/AttackButton';
import { DashButton } from '../ui/DashButton';
import { ANGEL_ENCOUNTER } from '../story/angelData';
import { QuestChain, type QuestEvent } from '../quest/QuestChain';
import {
  QUEST_REGISTRY,
  THE_CORRUPTION_AT_THE_GATES,
  type ObjectiveTrigger,
  type TargetKind,
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

  // Story / alignment state.
  private playerPath: PlayerPath = 'neutral';
  private angelEncounterFired = false;

  // Quest CHAIN: the central, serializable manager driving the whole registry,
  // its tracker UI, and its world marker. Quest-givers map an NPC to the quest
  // ids it can offer (+ idle flavor lines when it has nothing to give).
  private chain!: QuestChain;
  private tracker!: QuestTracker;
  private marker!: ObjectiveMarker;
  private questGivers: { npc: Npc; questIds: string[]; idleLines: string[] }[] = [];
  private oregonSpirit?: SpiritEntity; // the stub quest's objective target
  // The single stored+displayed alignment title (its text() IS the stored value).
  private titleText!: Phaser.GameObjects.Text;

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
    // Progression first: the player's HP pool is the level-derived max (Lv1 → BASE_MAX_HP).
    this.progression = new PlayerProgression();
    this.progression.onChange = () => this.refreshXpUi();
    this.playerHealth = new Health(this.progression.effectiveMaxHP);
    this.energy = new Health(MAX_ENERGY); // energy is a generic clamped pool
    this.sasquatch = new Sasquatch(this, SASQUATCH_SPAWN.x, SASQUATCH_SPAWN.y);
    this.sasquatch.onStrike = () => this.onSasquatchStrike();
    this.physics.add.collider(this.sasquatch.sprite, this.map.layer);
    this.physics.add.collider(this.player.sprite, this.sasquatch.sprite);

    // The quest CHAIN (data-driven registry). The world objective marker lives
    // in the worldFx layer, so the main camera draws it and the UI camera ignores
    // it. Quest-givers: which NPC offers which quest ids (it offers the available
    // one); idleLines play when it has nothing to give.
    this.chain = new QuestChain(QUEST_REGISTRY);
    this.chain.onChange = () => this.refreshQuestUi();
    this.chain.onEvent = (e) => this.handleQuestEvent(e);
    this.questGivers = [
      { npc: this.npc, questIds: ['corruption-at-the-gates'], idleLines: [] },
      { npc: this.portlandNpc, questIds: ['a-path-opens'], idleLines: [...PORTLAND_NPC_LINES] },
    ];
    this.oregonSpirit = this.spirit.entities.find((e) => e.id === OREGON_SPIRIT_ID);
    this.chain.evaluateUnlocks(); // opening quest → available from the start
    this.marker = new ObjectiveMarker(this, this.worldFx);

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
    this.zoomControls = new ZoomControls(this, cam, this.map.pixelWidth, this.map.pixelHeight);
    this.readout = new DebugReadout(this, this.map, this.player);
    // Spirit Vision tint is UI (created after the world snapshot so it lands in
    // the UI camera partition below). The reusable choice prompt creates its
    // objects on demand and tells the main camera to ignore them.
    this.spirit.createTint();
    this.choice = new ChoicePrompt(this, cam);
    this.createCombatHud();
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
      this.sasquatch.halt();
      this.haltSwarmers();
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
    if (this.isDashing()) this.talkButton.setVisible(false);
    else this.checkInteractions();
    this.sasquatch.update(this.player.x, this.player.y, this.time.now);
    this.updateSwarmers();
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

    // The same free swing also cleaves any swarmers caught in the arc.
    this.hitSwarmersInRange(sx, sy, PLAYER_ATTACK_RANGE, this.progression.effectiveDamage);
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
    this.player.sprite.setPosition(this.town.spawn.x, this.town.spawn.y);
    this.player.setDirection(0, 0);
    this.sasquatch.reset(); // clean, repeatable fight
    this.lastCombatTime = -1e9;
    this.playerDead = false;
    this.controls.setEnabled(true);
  }

  private regenTick(delta: number): void {
    const enemiesEngaged = this.sasquatch.isAggro || this.swarmers.some((s) => s.isAggro);
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

    // A quest-giver NPC speaks per the chain's state (and offering accepts).
    const giver = this.questGivers.find((g) => (g.npc as Interactable) === target);
    if (giver) {
      this.openQuestGiverDialogue(giver);
      return;
    }

    // Generic interactable (spirits). Speaking to the seeded Oregon spirit
    // completes the stub quest's objective (no-op unless that's the active goal).
    const isOregonSpirit = this.oregonSpirit !== undefined && target === this.oregonSpirit;
    this.dialogue.open(target.lines, () => {
      if (isOregonSpirit) this.notifyQuest('oregon-spirit-spoken');
      this.reenableControls = true;
    });
  }

  /**
   * Data-driven quest-giver dialogue from the chain: a reminder if this giver has
   * an ACTIVE quest; an OFFER (accepted when the lines finish) if it has an
   * AVAILABLE one; an acknowledgment if its quest is COMPLETE; else idle flavor.
   */
  private openQuestGiverDialogue(giver: { npc: Npc; questIds: string[]; idleLines: string[] }): void {
    const activeId = giver.questIds.find((id) => this.chain.status(id) === 'active');
    if (activeId) {
      this.dialogue.open([...this.chain.get(activeId)!.npcActiveLines], () => {
        this.reenableControls = true;
      });
      return;
    }
    const offer = this.chain.firstAvailable(giver.questIds);
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
        this.refreshQuestUi();
        break;
      case 'objective-complete':
        this.refreshQuestUi();
        break;
      case 'quest-complete':
        this.grantQuestReward(e.questId);
        this.refreshQuestUi();
        break;
      case 'unlocked':
        // Informational (a later quest became available); the marker/giver handle it.
        break;
    }
  }

  /** Grant a completed quest's data-driven reward block (heal / title / XP + banner). */
  private grantQuestReward(questId: string): void {
    const def = this.chain.get(questId);
    if (!def) return;
    const r = def.reward;
    if (r.healToFull) this.playerHealth.full();
    if (r.title) this.awardTitle(r.title);
    this.showBanner(r.note ? `${r.banner}\n\n${r.note}` : r.banner, 3400);
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
      { label: 'Refill Energy', onPress: () => this.energy.full() },
      { label: 'Teleport to Oregon', onPress: () => this.devTeleportToOregon() },
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

  /** Sync the tracker panel to the active quest in the chain. */
  private refreshQuestUi(): void {
    const q = this.chain.activeQuest;
    if (q) {
      const obj = this.chain.activeObjectiveDef;
      this.tracker.show(q.title, obj ? obj.text : '');
    } else {
      this.tracker.hide();
    }
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
    // No active quest → point at the giver of the next AVAILABLE quest (the
    // pre-accept pointer), so finishing one quest leads to the next.
    for (const g of this.questGivers) {
      const offer = this.chain.firstAvailable(g.questIds);
      if (offer) return { x: g.npc.sprite.x, y: g.npc.sprite.y, label: offer.preAcceptHint };
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
      case 'oregon-spirit':
        return this.oregonSpirit
          ? { x: this.oregonSpirit.x, y: this.oregonSpirit.y, label: '' }
          : { x: OREGON_SWARM_SPAWN.x, y: OREGON_SWARM_SPAWN.y, label: '' };
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

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
import { Health } from '../combat/Health';
import { HealthBar } from '../combat/HealthBar';
import { AttackButton } from '../ui/AttackButton';
import { ANGEL_ENCOUNTER } from '../story/angelData';
import { QuestManager } from '../quest/QuestManager';
import { THE_CORRUPTION_AT_THE_GATES, type ObjectiveTrigger } from '../quest/questData';
import { ObjectiveMarker } from '../quest/ObjectiveMarker';
import { QuestTracker } from '../ui/QuestTracker';
import { DevPanel } from '../ui/DevPanel';
import { PlayerProgression } from '../progression/PlayerProgression';
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
  QUEST_XP_REWARD,
  DEV_GRANT_XP_CHUNK,
  DEV_MODE,
} from './settings';
import { TOWN_TILES } from '../town/townTiles';
import { buildTown, type TownFeatures, type DoorFeature } from '../town/TownBuilder';
import type { WashingtonMap } from '../map/mapTypes';
import washingtonMap from '../map/washington.map.json';

// Proximity ranges in px, tuned for 32px tiles.
const DOOR_TRIGGER = 20; // < one tile (32) so returning one tile out doesn't re-enter
const NPC_AUTO_RANGE = 44; // ~1.4 tiles — auto-open dialogue on contact
const NPC_TALK_RANGE = 80; // ~2.5 tiles — show the Talk button

// The lone Sasquatch sits in dense forest, 26 tiles north of the Seattle spawn.
const SASQUATCH_SPAWN = { x: 9872, y: 4464 };

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

  // Story / alignment state.
  private playerPath: PlayerPath = 'neutral';
  private angelEncounterFired = false;

  // Quest: the data-driven opening quest, its tracker UI, and its world marker.
  private quest!: QuestManager;
  private tracker!: QuestTracker;
  private marker!: ObjectiveMarker;
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

    // City labels for everywhere except Seattle (now a real town).
    new CityMarkers(this, this.map, ['Seattle']);

    // Stamp the town onto the overworld and read back its feature positions.
    this.town = buildTown(this.map);
    this.addTownDecor();

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
    this.sasquatch = new Sasquatch(this, SASQUATCH_SPAWN.x, SASQUATCH_SPAWN.y);
    this.sasquatch.onStrike = () => this.onSasquatchStrike();
    this.physics.add.collider(this.sasquatch.sprite, this.map.layer);
    this.physics.add.collider(this.player.sprite, this.sasquatch.sprite);

    // The opening quest (data-driven). The world objective marker lives in the
    // worldFx layer, so the main camera draws it and the UI camera ignores it.
    this.quest = new QuestManager(THE_CORRUPTION_AT_THE_GATES);
    this.quest.onChange = () => this.refreshQuestUi();
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
  }

  override update(_time: number, delta: number): void {
    // Zoom keeps smoothing every frame, even during dialogue.
    this.zoomControls.update(delta);
    this.updateCombatHud();
    this.updateObjectiveMarker();

    if (this.playerDead) {
      this.player.setDirection(0, 0);
      this.sasquatch.halt();
      this.readout.update();
      return;
    }

    if (this.reenableControls && !this.dialogue.isOpen() && !this.choice.isOpen()) {
      this.controls.setEnabled(true);
      this.reenableControls = false;
    }

    // Frozen while a conversation or a choice is open.
    if (this.dialogue.isOpen() || this.choice.isOpen()) {
      this.player.setDirection(0, 0);
      this.talkButton.setVisible(false);
      this.sasquatch.halt();
      this.readout.update();
      return;
    }

    const dir = this.controls.getDirection();
    this.player.setDirection(dir.x, dir.y);

    this.checkDoors();
    this.checkQuestProximity();
    this.checkAngelEncounter();
    this.checkInteractions();
    this.sasquatch.update(this.player.x, this.player.y, this.time.now);
    this.regenTick(delta);
    this.readout.update();
  }

  // --- Combat ---------------------------------------------------------------

  private createCombatHud(): void {
    const depth = 2000;
    // Top-left cluster: a level badge + HP numbers on top, HP bar, then a thin
    // XP bar directly beneath — a clean HP + XP group above the debug readout.
    this.playerBar = new HealthBar(this, 150, 11, depth);
    this.playerBar.setScrollFactor(0);
    this.xpBar = new HealthBar(this, 150, 5, depth, 0x49b6ff); // fixed blue XP fill
    this.xpBar.setScrollFactor(0);
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
      const hpY = ins.top + UI_MARGIN + 7;
      const xpY = ins.top + UI_MARGIN + 18;
      this.playerBar.setPosition(x, hpY);
      this.playerHpText.setPosition(x + 158, hpY);
      this.xpBar.setPosition(x, xpY);
      this.levelBadge.setPosition(x + 158, xpY);
    };
    layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, layout);

    // Attack is gameplay (also the on-screen Attack button) — never gated by DEV_MODE.
    this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE).on('down', () => this.tryAttack());

    this.refreshXpUi();
  }

  private updateCombatHud(): void {
    const remaining = this.attackCooldownUntil - this.time.now;
    this.attackButton.setCooldownRatio(remaining / PLAYER_ATTACK_COOLDOWN_MS);
    this.playerBar.setRatio(this.playerHealth.ratio);
    this.playerHpText.setText(`${Math.ceil(this.playerHealth.current)} / ${this.playerHealth.max}`);
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
    if (this.sasquatch.isAggro) this.lastCombatTime = this.time.now;
    const outOfCombat = !this.sasquatch.isAggro && this.time.now - this.lastCombatTime > PLAYER_HP_REGEN_DELAY_MS;
    if (outOfCombat && this.playerHealth.current < this.playerHealth.max) {
      this.playerHealth.heal((PLAYER_HP_REGEN_PER_SEC * delta) / 1000);
    }
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
    for (const door of this.town.doors) {
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
    const candidates: Interactable[] = [this.npc];
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

    // The quest-giver speaks a different set per quest state; finishing the
    // INACTIVE set starts the quest. Other interactables use their own lines.
    if (target === this.npc) {
      const startNow = this.quest.status === 'inactive';
      this.dialogue.open(this.npcLinesForState(), () => {
        if (startNow) this.startQuest();
        this.reenableControls = true;
      });
      return;
    }

    this.dialogue.open(target.lines, () => {
      // Re-enable on the next frame so the closing tap can't spawn the joystick.
      this.reenableControls = true;
    });
  }

  /** Pick the NPC's dialogue for the current quest state (all text in questData). */
  private npcLinesForState(): string[] {
    const q = this.quest.quest;
    if (this.quest.status === 'complete') return [...q.npcCompleteLines];
    if (this.quest.status === 'active') return [...q.npcActiveLines];
    return [...q.npcInactiveLines];
  }

  /** Begin the quest; respawn the beast if it was already dead so OBJ 1 is doable. */
  private startQuest(): void {
    this.quest.start();
    if (!this.sasquatch.isAlive) this.sasquatch.reset();
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
    const forced = this.quest.isActive && this.quest.currentTrigger === 'angel-refused';
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
    this.dialogue.open([...this.quest.quest.forcedAcceptLines], () => this.presentAngelChoice());
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

  /** DEV-ONLY: replay the whole opening quest without reloading (key R or the corner button). */
  private devReset(): void {
    this.setPlayerPath('neutral');
    this.spirit.setSpiritVision(false); // 'neutral' alone doesn't turn it off
    this.angelEncounterFired = false;
    this.angel.dismiss();
    this.choice.close();
    if (this.dialogue.isOpen()) this.dialogue.forceClose();
    this.guardTarget = null;
    this.controls.setEnabled(true);
    this.player.setDirection(0, 0);

    // Full quest replay: back to inactive, title cleared, beast respawned.
    this.quest.reset();
    this.awardTitle(null);
    this.sasquatch.reset();

    // Progression back to Lv1 / 0 XP, and the HP pool back to the level-1 max.
    this.progression.reset();
    this.playerHealth.setMax(this.progression.effectiveMaxHP);
    this.playerHealth.full();
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
    const actions = [
      { label: 'Grant XP', key: KC.X, onPress: () => this.gainXP(DEV_GRANT_XP_CHUNK) },
      { label: 'Instant Level-Up', key: KC.L, onPress: () => this.gainXP(this.progression.xpRemainingToLevel()) },
      { label: 'Full Heal', key: KC.H, onPress: () => this.playerHealth.full() },
      { label: 'Respawn Sasquatch', key: KC.K, onPress: () => this.sasquatch.reset() },
      { label: 'Dev Reset', key: KC.R, onPress: () => this.devReset() },
    ];

    const kb = this.input.keyboard;
    for (const a of actions) kb?.addKey(a.key).on('down', a.onPress);

    new DevPanel(this, actions.map((a) => ({ label: a.label, onPress: a.onPress })));
  }

  // --- Quest ----------------------------------------------------------------

  /**
   * Feed a world event to the quest. Advances only if it matches the current
   * objective. Handles the two no-soft-lock cases: a finished quest triggers the
   * reward; reaching the angel objective while already corrupted auto-completes
   * it (the angel will not manifest a second time).
   */
  private notifyQuest(trigger: ObjectiveTrigger): void {
    const result = this.quest.notify(trigger);
    if (!result.advanced) return;
    if (result.questCompleted) {
      this.onQuestComplete();
      return;
    }
    if (this.quest.currentTrigger === 'angel-refused' && this.playerPath === 'corrupted') {
      this.notifyQuest('angel-refused');
    }
  }

  /** OBJ 2 completes when the player gets close to the rift (independent of the angel). */
  private checkQuestProximity(): void {
    if (this.quest.currentTrigger !== 'rift-reached') return;
    const d = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      this.town.rift.x,
      this.town.rift.y,
    );
    if (d <= ANGEL_ENCOUNTER.triggerRange) this.notifyQuest('rift-reached');
  }

  /** Completion + reward: heal to full, award the alignment title, banner, clear tracker. */
  private onQuestComplete(): void {
    this.playerHealth.full();
    this.awardTitle(this.quest.quest.awardedTitle);
    this.showBanner(
      `${this.quest.quest.completionBanner}\n\n${this.quest.quest.titleNote}`,
      3400,
    );
    this.refreshQuestUi(); // status is now complete → tracker hides
    this.gainXP(QUEST_XP_REWARD); // XP chunk on top of the heal + title
  }

  /** Store and display the single alignment-title string on the HUD. */
  private awardTitle(title: string | null): void {
    this.titleText.setText(title ? `Title: ${title}` : '').setVisible(!!title);
  }

  /** Sync the tracker panel to the live quest state. */
  private refreshQuestUi(): void {
    if (this.quest.isActive) {
      const obj = this.quest.objective;
      this.tracker.show(this.quest.title, obj ? obj.text : '');
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
    if (this.quest.isComplete) return null;
    // Before the quest starts, point the player at the quest-giver.
    if (this.quest.status === 'inactive') {
      return { x: this.npc.sprite.x, y: this.npc.sprite.y, label: this.quest.quest.preAcceptHint };
    }
    const obj = this.quest.objective;
    if (!obj || !obj.target) return null;
    switch (obj.target) {
      case 'sasquatch':
        return this.sasquatch.isAlive ? { x: this.sasquatch.x, y: this.sasquatch.y, label: '' } : null;
      case 'rift':
        return { x: this.town.rift.x, y: this.town.rift.y, label: '' };
      case 'npc':
        return { x: this.npc.sprite.x, y: this.npc.sprite.y, label: '' };
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
      // Below the 3-line debug readout (which starts at +26). Only ever visible
      // once the quest is complete, by which point the tracker has hidden.
      this.titleText.setPosition(insets.left + UI_MARGIN, insets.top + UI_MARGIN + 86);
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

  private addTownDecor(): void {
    // Town nameplate where the old Seattle marker was.
    this.add
      .text(this.town.label.x, this.town.label.y, this.town.label.text, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '11px',
        color: '#fdf6e3',
      })
      .setOrigin(0.5, 1)
      .setStroke('#1a1410', 4)
      .setDepth(6);

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

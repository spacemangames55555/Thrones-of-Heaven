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
import { SpiritVision } from '../spirit/SpiritVision';
import type { Interactable } from '../entities/Interactable';
import { CAMERA_ZOOM } from './settings';
import { TOWN_TILES } from '../town/townTiles';
import { buildTown, type TownFeatures, type DoorFeature } from '../town/TownBuilder';
import type { WashingtonMap } from '../map/mapTypes';
import washingtonMap from '../map/washington.map.json';

// Placeholder dialogue — hints at the corruption at the town's edge. The user
// will rewrite this text later.
const TOWNSFOLK_LINES = [
  'Townsfolk: Oh — a new face. You picked a grim week to reach Seattle.',
  'Townsfolk: There is a rift at the eastern edge of town. The ground around it has gone black and violet.',
  'Townsfolk: We call it the corruption. Every night it creeps a little further up the eastern road.',
  'Townsfolk: The watch will not go near the gates anymore. Whatever opened down there, it is spreading.',
  'Townsfolk: If you are the sort to look trouble in the eye... someone ought to.',
];

const DOOR_TRIGGER = 11; // px — must be < one tile so returning doesn't re-enter
const NPC_AUTO_RANGE = 26; // px — auto-open dialogue on contact
const NPC_TALK_RANGE = 50; // px — show the Talk button

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

    // Quest-giver NPC in the plaza.
    this.npc = new Npc(this, this.town.npc.x, this.town.npc.y, TOWNSFOLK_LINES);
    this.physics.add.collider(this.player.sprite, this.npc.sprite);

    // Spirit entities live in the world (drawn by the main camera), hidden until
    // Spirit Vision is revealed. Created here so they fall in the WORLD snapshot.
    this.spirit = new SpiritVision(this);

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
    // Spirit Vision tint + toggle button are UI (created after the world snapshot
    // so they land in the UI camera partition below).
    this.spirit.createUI((on) => this.onSpiritVisionChanged(on));

    // Dedicated UI camera, fixed at zoom 1 and never scrolling, so the on-screen
    // UI is NOT scaled or moved by the main camera's zoom/follow (the bug:
    // scrollFactor(0) stops scrolling but NOT scaling with zoom). Partition
    // rendering: the main camera draws only the world; the UI camera only the UI.
    const uiObjects = this.children.list.filter((o) => !worldObjects.includes(o));
    this.uiCamera = this.cameras.add(0, 0, this.scale.width, this.scale.height);
    this.uiCamera.setName('UICamera');
    cam.ignore(uiObjects);
    this.uiCamera.ignore(worldObjects);
  }

  override update(_time: number, delta: number): void {
    // Zoom keeps smoothing every frame, even during dialogue.
    this.zoomControls.update(delta);

    if (this.reenableControls && !this.dialogue.isOpen()) {
      this.controls.setEnabled(true);
      this.reenableControls = false;
    }

    // Frozen while a conversation is open.
    if (this.dialogue.isOpen()) {
      this.player.setDirection(0, 0);
      this.talkButton.setVisible(false);
      this.readout.update();
      return;
    }

    const dir = this.controls.getDirection();
    this.player.setDirection(dir.x, dir.y);

    this.checkDoors();
    this.checkInteractions();
    this.readout.update();
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
    this.dialogue.open(target.lines, () => {
      // Re-enable on the next frame so the closing tap can't spawn the joystick.
      this.reenableControls = true;
    });
  }

  /** When Spirit Vision turns off mid-conversation with a spirit, end it. */
  private onSpiritVisionChanged(on: boolean): void {
    const talkingToSpirit = this.spirit.entities.some((e) => e === this.guardTarget);
    if (!on && this.dialogue.isOpen() && talkingToSpirit) {
      this.dialogue.forceClose();
    }
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

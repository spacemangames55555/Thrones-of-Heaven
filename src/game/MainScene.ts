import Phaser from 'phaser';
import { GameMap } from '../map/GameMap';
import { Player } from '../entities/Player';
import { Npc } from '../entities/Npc';
import { Controls } from '../input/Controls';
import { CityMarkers } from '../ui/CityMarkers';
import { DebugReadout } from '../ui/DebugReadout';
import { DialogueBox } from '../ui/DialogueBox';
import { TouchButton } from '../ui/TouchButton';
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

  private npcGuard = false; // talked; wait until player leaves range to re-trigger
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

    const cam = this.cameras.main;
    cam.startFollow(this.player.sprite, true, 0.12, 0.12);
    cam.setZoom(this.pickZoom());
    cam.setRoundPixels(true);

    this.controls = new Controls(this);
    this.dialogue = new DialogueBox(this);
    this.talkButton = new TouchButton(this, 'Talk', () => this.tryTalk());
    this.readout = new DebugReadout(this, this.map, this.player);

    this.scale.on(Phaser.Scale.Events.RESIZE, () => cam.setZoom(this.pickZoom()));
  }

  override update(): void {
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
    this.checkNpc();
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

  private checkNpc(): void {
    const dist = this.npc.distanceTo(this.player.x, this.player.y);
    this.talkButton.setVisible(dist <= NPC_TALK_RANGE);
    if (dist > NPC_TALK_RANGE) this.npcGuard = false;
    if (dist <= NPC_AUTO_RANGE && !this.npcGuard) this.openDialogue();
  }

  private tryTalk(): void {
    if (this.dialogue.isOpen()) return;
    if (this.npc.distanceTo(this.player.x, this.player.y) <= NPC_TALK_RANGE) this.openDialogue();
  }

  private openDialogue(): void {
    this.npcGuard = true;
    this.talkButton.setVisible(false);
    this.controls.setEnabled(false);
    this.player.setDirection(0, 0);
    this.dialogue.open(this.npc.lines, () => {
      // Re-enable on the next frame so the closing tap can't spawn the joystick.
      this.reenableControls = true;
    });
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

  /** Zoom so a useful slice of the map is visible on any screen size. */
  private pickZoom(): number {
    const target = 520;
    const shortSide = Math.min(this.scale.width, this.scale.height);
    const zoom = shortSide / target;
    return Phaser.Math.Clamp(Math.round(zoom * 2) / 2, 1.5, 4);
  }
}

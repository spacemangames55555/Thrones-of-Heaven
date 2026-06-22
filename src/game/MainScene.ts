import Phaser from 'phaser';
import { GameMap } from '../map/GameMap';
import { Player } from '../entities/Player';
import { Controls } from '../input/Controls';
import { CityMarkers } from '../ui/CityMarkers';
import { DebugReadout } from '../ui/DebugReadout';
import type { WashingtonMap } from '../map/mapTypes';
import washingtonMap from '../map/washington.map.json';

/**
 * The single gameplay scene: renders the whole Washington map, spawns the
 * player near Seattle, wires up controls, camera, city markers, and the debug
 * readout. Later layers (towns, quests, Spirit Vision, corruption) can be added
 * as additional scenes or layers over this same terrain.
 */
export class MainScene extends Phaser.Scene {
  private map!: GameMap;
  private player!: Player;
  private controls!: Controls;
  private readout!: DebugReadout;

  constructor() {
    super('MainScene');
  }

  create(): void {
    const data = washingtonMap as unknown as WashingtonMap;

    this.map = new GameMap(this, data);

    // World + camera bounds match the full map.
    this.physics.world.setBounds(0, 0, this.map.pixelWidth, this.map.pixelHeight);
    this.cameras.main.setBounds(0, 0, this.map.pixelWidth, this.map.pixelHeight);
    this.cameras.main.setBackgroundColor('#0b1a2b');

    new CityMarkers(this, this.map);

    const spawn = this.map.spawnWorld;
    this.player = new Player(this, spawn.x, spawn.y);

    // Collision against blocking terrain (ocean, sound, river, peaks).
    this.physics.add.collider(this.player.sprite, this.map.layer);

    // Smooth, centered camera follow with a chunky zoom for the phone.
    const cam = this.cameras.main;
    cam.startFollow(this.player.sprite, true, 0.12, 0.12);
    cam.setZoom(this.pickZoom());
    cam.setRoundPixels(true);

    this.controls = new Controls(this);
    this.readout = new DebugReadout(this, this.map, this.player);

    this.scale.on(Phaser.Scale.Events.RESIZE, () => {
      this.cameras.main.setZoom(this.pickZoom());
    });
  }

  override update(): void {
    const dir = this.controls.getDirection();
    this.player.setDirection(dir.x, dir.y);
    this.readout.update();
  }

  /** Zoom so a useful slice of the map is visible on any screen size. */
  private pickZoom(): number {
    const target = 520; // aim to show ~520 px of world across the shorter axis
    const shortSide = Math.min(this.scale.width, this.scale.height);
    const zoom = shortSide / target;
    return Phaser.Math.Clamp(Math.round(zoom * 2) / 2, 1.5, 4);
  }
}

import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Controls } from '../input/Controls';
import { INTERIORS, INTERIOR_TILE, type InteriorDef } from './interiors';

export interface InteriorInitData {
  interiorId: string;
  returnX: number;
  returnY: number;
}

/** Anything that can take the player back after an interior is exited. */
interface ReturnTarget {
  returnFromInterior(x: number, y: number): void;
}

const COLORS = {
  background: 0x140e08,
  floor: 0x6b4b2f,
  floorAlt: 0x654729,
  wall: 0x3a2a1c,
  bar: 0x8a5a2c,
  table: 0x9c6b3a,
  door: 0xffcf57,
};

/**
 * Generic interior scene. Builds whichever {@link InteriorDef} it is launched
 * with (placeholder colored "tiles" + solid furniture), drops the player in,
 * and sends them back to their town position when they reach the exit door.
 * Reusable for every building.
 */
export class InteriorScene extends Phaser.Scene {
  private def!: InteriorDef;
  private player!: Player;
  private controls!: Controls;
  private doorCenters: { x: number; y: number }[] = [];
  private returnX = 0;
  private returnY = 0;
  private exiting = false;
  private roomW = 0;
  private roomH = 0;

  constructor() {
    super('InteriorScene');
  }

  create(data: InteriorInitData): void {
    this.def = INTERIORS[data.interiorId];
    if (!this.def) throw new Error(`Unknown interior '${data.interiorId}'`);
    this.returnX = data.returnX;
    this.returnY = data.returnY;
    this.exiting = false;
    this.doorCenters = [];

    const ts = INTERIOR_TILE;
    const rows = this.def.rows;
    const cols = rows[0].length;
    this.roomW = cols * ts;
    this.roomH = rows.length * ts;

    this.cameras.main.setBackgroundColor(COLORS.background);

    const solids: Phaser.GameObjects.Rectangle[] = [];
    let spawn = { x: this.roomW / 2, y: this.roomH / 2 };

    for (let r = 0; r < rows.length; r++) {
      for (let c = 0; c < cols; c++) {
        const ch = rows[r][c];
        const x = c * ts + ts / 2;
        const y = r * ts + ts / 2;

        // Floor under everything (checkerboard for a tiled feel).
        const floorColor = (r + c) % 2 === 0 ? COLORS.floor : COLORS.floorAlt;
        this.add.rectangle(x, y, ts, ts, floorColor).setDepth(0);

        if (ch === '#' || ch === 'B' || ch === 'T') {
          const color = ch === '#' ? COLORS.wall : ch === 'B' ? COLORS.bar : COLORS.table;
          const rect = this.add.rectangle(x, y, ts, ts, color).setDepth(1);
          this.physics.add.existing(rect, true);
          solids.push(rect);
        } else if (ch === 'D') {
          this.add.rectangle(x, y, ts, ts, COLORS.door).setDepth(1);
          this.doorCenters.push({ x, y });
        } else if (ch === 's') {
          spawn = { x, y };
        }
      }
    }

    this.physics.world.setBounds(0, 0, this.roomW, this.roomH);

    this.player = new Player(this, spawn.x, spawn.y);
    this.player.sprite.setCollideWorldBounds(true);
    this.physics.add.collider(this.player.sprite, solids);

    this.controls = new Controls(this);

    // Title + exit hint.
    this.add
      .text(this.roomW / 2, 4, this.def.name, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '10px',
        color: '#f3ecd8',
      })
      .setOrigin(0.5, 0)
      .setDepth(5);
    this.add
      .text(this.roomW / 2, this.roomH - 4, 'walk out the door to leave', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '7px',
        color: '#ffd24a',
      })
      .setOrigin(0.5, 1)
      .setDepth(5);

    this.fitCamera();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.fitCamera, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.fitCamera, this);
    });
  }

  override update(): void {
    if (this.exiting) return;
    const dir = this.controls.getDirection();
    this.player.setDirection(dir.x, dir.y);

    for (const door of this.doorCenters) {
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, door.x, door.y) < 10) {
        this.exit();
        return;
      }
    }
  }

  private exit(): void {
    this.exiting = true;
    this.controls.setEnabled(false);

    const main = this.scene.get('MainScene') as unknown as ReturnTarget &
      { input: Phaser.Input.InputPlugin };
    this.scene.resume('MainScene');
    this.scene.setVisible(true, 'MainScene');
    main.input.enabled = true;
    main.returnFromInterior(this.returnX, this.returnY);

    this.scene.stop(); // triggers SHUTDOWN, which removes the resize listener
  }

  private fitCamera(): void {
    const cam = this.cameras.main;
    const zoom = Phaser.Math.Clamp(
      Math.min(this.scale.width / this.roomW, this.scale.height / this.roomH) * 0.92,
      1,
      5,
    );
    cam.setZoom(zoom);
    cam.centerOn(this.roomW / 2, this.roomH / 2);
  }
}

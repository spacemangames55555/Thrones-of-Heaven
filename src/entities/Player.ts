import Phaser from 'phaser';
import { PLAYER_SPEED } from '../game/settings';

const TEXTURE_KEY = 'player-dot';
const RADIUS = 7;
const SPEED = PLAYER_SPEED; // pixels per second — tune in src/game/settings.ts

/**
 * The player avatar: a simple colored sprite driven by Arcade Physics.
 * Movement is free and analog (smooth 8-directional) — never grid-snapped.
 */
export class Player {
  readonly sprite: Phaser.Physics.Arcade.Sprite;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    Player.ensureTexture(scene);

    this.sprite = scene.physics.add.sprite(x, y, TEXTURE_KEY);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setDepth(10);

    // Circular body slightly smaller than the sprite for forgiving collision.
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setCircle(RADIUS, this.sprite.width / 2 - RADIUS, this.sprite.height / 2 - RADIUS);
  }

  /** Apply a normalized-ish direction vector (components in [-1, 1]). */
  setDirection(dirX: number, dirY: number): void {
    let x = dirX;
    let y = dirY;
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    this.sprite.setVelocity(x * SPEED, y * SPEED);
  }

  get x(): number {
    return this.sprite.x;
  }

  get y(): number {
    return this.sprite.y;
  }

  private static ensureTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists(TEXTURE_KEY)) return;
    const d = RADIUS * 2 + 4;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x101418, 1);
    g.fillCircle(d / 2, d / 2, RADIUS + 1.5); // dark outline
    g.fillStyle(0xffd24a, 1);
    g.fillCircle(d / 2, d / 2, RADIUS); // gold core (a soul/herald)
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(d / 2 - 2, d / 2 - 2, 1.6); // tiny highlight
    g.generateTexture(TEXTURE_KEY, d, d);
    g.destroy();
  }
}

import Phaser from 'phaser';
import { PLAYER_SPEED_TILES_PER_SEC } from '../game/settings';
import { TILE_SIZE } from '../render/tileAtlas';

const TEXTURE_KEY = 'player-figure';
const WIDTH = 32; // ~1 tile wide
const HEIGHT = 48; // ~1.5 tiles tall — fixes the "character = one giant block" look
const SPEED = PLAYER_SPEED_TILES_PER_SEC * TILE_SIZE; // px/sec

/**
 * The player avatar: a simple colored figure (~1 x 1.5 tiles) driven by Arcade
 * Physics. Same placeholder gold "soul/herald" look as before, just sized for
 * 32px tiles. Movement is free and analog (8-directional), never grid-snapped.
 */
export class Player {
  readonly sprite: Phaser.Physics.Arcade.Sprite;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    Player.ensureTexture(scene);

    this.sprite = scene.physics.add.sprite(x, y, TEXTURE_KEY);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setDepth(10);

    // A small footprint at the figure's base (~0.6 tile) so it fits through
    // 1-tile gaps and collides where its "feet" are, not its whole height.
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    const r = 9;
    body.setCircle(r, WIDTH / 2 - r, HEIGHT - r * 2 - 3);
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
    if (len > 0.01) {
      const f = Math.hypot(x, y);
      this.facingX = x / f;
      this.facingY = y / f;
    }
    this.sprite.setVelocity(x * SPEED, y * SPEED);
  }

  /** Last-moved direction (defaults to facing down), for the melee swing. */
  facingX = 0;
  facingY = 1;

  /** Brief red flash when the player is hit. */
  flash(): void {
    this.sprite.setTint(0xff4444).setTintMode(Phaser.TintModes.FILL);
    this.sprite.scene.time.delayedCall(110, () => this.sprite.clearTint());
  }

  get x(): number {
    return this.sprite.x;
  }

  get y(): number {
    return this.sprite.y;
  }

  private static ensureTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists(TEXTURE_KEY)) return;
    const w = WIDTH;
    const h = HEIGHT;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    // Dark outline, gold body (a vertical "soul/herald" capsule), highlight, head.
    g.fillStyle(0x101418, 1);
    g.fillRoundedRect(4, 8, w - 8, h - 10, 9);
    g.fillStyle(0xffd24a, 1);
    g.fillRoundedRect(6, 10, w - 12, h - 14, 7);
    g.fillStyle(0xfff0b8, 1);
    g.fillCircle(w / 2, 13, 6); // head
    g.fillStyle(0xffffff, 0.85);
    g.fillCircle(w / 2 - 3, 11, 2); // tiny highlight
    g.generateTexture(TEXTURE_KEY, w, h);
    g.destroy();
  }
}

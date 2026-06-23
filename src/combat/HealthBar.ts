import Phaser from 'phaser';

/**
 * A small reusable health bar (background + colored fill). Used both for the
 * player's fixed UI bar and the Sasquatch's world-space floating bar. It only
 * draws — positioning + camera routing is the caller's job.
 */
export class HealthBar {
  readonly bg: Phaser.GameObjects.Rectangle;
  readonly fill: Phaser.GameObjects.Rectangle;
  private readonly w: number;

  constructor(scene: Phaser.Scene, width: number, height: number, depth: number) {
    this.w = width;
    this.bg = scene.add
      .rectangle(0, 0, width + 2, height + 2, 0x05080c, 0.85)
      .setOrigin(0, 0.5)
      .setStrokeStyle(1, 0x000000, 0.6)
      .setDepth(depth);
    this.fill = scene.add
      .rectangle(1, 0, width, height, 0x4cd964, 1)
      .setOrigin(0, 0.5)
      .setDepth(depth + 1);
  }

  /** Left-center anchor position. */
  setPosition(x: number, y: number): void {
    this.bg.setPosition(x - 1, y);
    this.fill.setPosition(x, y);
  }

  setScrollFactor(v: number): this {
    this.bg.setScrollFactor(v);
    this.fill.setScrollFactor(v);
    return this;
  }

  setVisible(visible: boolean): void {
    this.bg.setVisible(visible);
    this.fill.setVisible(visible);
  }

  /** ratio 0..1 — width shrinks from the right; color shifts green→amber→red. */
  setRatio(ratio: number): void {
    const r = Phaser.Math.Clamp(ratio, 0, 1);
    this.fill.width = Math.max(0, this.w * r);
    const color = r > 0.5 ? 0x4cd964 : r > 0.25 ? 0xf5c542 : 0xe54b4b;
    this.fill.setFillStyle(color, 1);
  }

  /** Both rectangles, for camera-partition ignore lists. */
  objects(): Phaser.GameObjects.GameObject[] {
    return [this.bg, this.fill];
  }
}

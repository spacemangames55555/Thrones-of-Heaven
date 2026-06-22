import Phaser from 'phaser';

/**
 * A small, reusable on-screen button pinned to the camera (works on touch and
 * mouse). Used for the "Talk" prompt; future buttons (Enter, Use, …) reuse it.
 */
export class TouchButton {
  private readonly scene: Phaser.Scene;
  private readonly bg: Phaser.GameObjects.Rectangle;
  private readonly label: Phaser.GameObjects.Text;
  private readonly width: number;
  private readonly height = 44;
  // Starts true to match the default-visible game objects, so the constructor's
  // setVisible(false) actually hides them.
  private visible = true;

  constructor(scene: Phaser.Scene, text: string, onTap: () => void) {
    this.scene = scene;
    this.width = Math.max(96, text.length * 11 + 28);
    const depth = 1400;

    this.bg = scene.add
      .rectangle(0, 0, this.width, this.height, 0x1d2b40, 0.92)
      .setStrokeStyle(2, 0xffd24a, 0.95)
      .setScrollFactor(0)
      .setDepth(depth)
      .setInteractive({ useHandCursor: true });

    this.label = scene.add
      .text(0, 0, text, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '17px',
        color: '#ffe9a8',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(depth + 1);

    this.bg.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, onTap);

    scene.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    this.layout();
    this.setVisible(false);
  }

  setVisible(v: boolean): void {
    if (this.visible === v) return;
    this.visible = v;
    this.bg.setVisible(v);
    this.label.setVisible(v);
    // Disable the hit area when hidden so it can't swallow taps.
    if (v) this.bg.setInteractive();
    else this.bg.disableInteractive();
  }

  private layout(): void {
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    const cx = w - 16 - this.width / 2;
    const cy = h - 16 - this.height / 2;
    this.bg.setPosition(cx, cy);
    this.label.setPosition(cx, cy);
  }
}

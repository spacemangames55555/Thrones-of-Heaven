import Phaser from 'phaser';
import { getInsets } from './uiLayout';

/**
 * A small, reusable on-screen button pinned to the camera (works on touch and
 * mouse). It is the SINGLE, STANDARD home for every contextual / proximity action
 * button — Talk (NPCs), Corrupt the Portal, Taint the Water / Burn the Grove, and
 * any similar interact prompt. Only one is ever applicable at a time (they are all
 * proximity-gated), so they share this one slot: the CENTRE, just above the bottom-
 * right skill-hotkey cluster and clear of the bottom-left HP bars + joystick.
 */
export class TouchButton {
  private readonly scene: Phaser.Scene;
  private readonly bg: Phaser.GameObjects.Rectangle;
  private readonly label: Phaser.GameObjects.Text;
  private width: number;
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

  /** Re-caption the button (used by the generic proximity-action button: "Burn the
   *  Grove" / "Taint the Water" / "Take the Pump"). Recomputes width + re-centres. */
  setLabel(text: string): void {
    if (this.label.text === text) return;
    this.label.setText(text);
    this.width = Math.max(96, text.length * 11 + 28);
    this.bg.setSize(this.width, this.height);
    this.layout();
  }

  private layout(): void {
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    const insets = getInsets(this.scene);
    const cx = w / 2;
    // CENTRE, sitting high enough above the bottom clusters to clear both the
    // bottom-right skill grid and the bottom-left HP bars (which now live there).
    const cy = h - insets.bottom - 210;
    this.bg.setPosition(cx, cy);
    this.label.setPosition(cx, cy);
  }
}

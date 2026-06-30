import Phaser from 'phaser';
import { getInsets, UI_MARGIN, DEPTH_HUD_TEXTBOX } from './uiLayout';

/**
 * Reusable, phone-friendly dialogue box pinned to the bottom of the screen.
 * Call {@link open} with an array of lines; tapping anywhere advances to the
 * next line, and tapping past the last line closes it. Any NPC plugs in by
 * passing its own lines — no per-NPC code.
 */
export class DialogueBox {
  private readonly scene: Phaser.Scene;
  private readonly box: Phaser.GameObjects.Rectangle;
  private readonly border: Phaser.GameObjects.Rectangle;
  private readonly text: Phaser.GameObjects.Text;
  private readonly hint: Phaser.GameObjects.Text;

  private lines: string[] = [];
  private index = 0;
  private open_ = false;
  private acceptTapAt = 0;
  private onClose?: () => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    // TEXTBOX band: dialogue renders in FRONT of the buttons + data readout.
    const depth = DEPTH_HUD_TEXTBOX;

    this.border = scene.add.rectangle(0, 0, 10, 10, 0xffd24a, 0.9).setScrollFactor(0).setDepth(depth);
    this.box = scene.add.rectangle(0, 0, 10, 10, 0x0c1626, 0.94).setScrollFactor(0).setDepth(depth + 1);

    this.text = scene.add
      .text(0, 0, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '15px',
        color: '#f3ecd8',
        lineSpacing: 4,
      })
      .setScrollFactor(0)
      .setDepth(depth + 2);

    this.hint = scene.add
      .text(0, 0, 'tap to continue ▸', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        color: '#ffd24a',
      })
      .setScrollFactor(0)
      .setDepth(depth + 2)
      .setOrigin(1, 1);

    this.setVisible(false);
    this.layout();

    scene.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
  }

  isOpen(): boolean {
    return this.open_;
  }

  open(lines: string[], onClose?: () => void): void {
    if (lines.length === 0) return;
    this.lines = lines;
    this.index = 0;
    this.onClose = onClose;
    this.open_ = true;
    this.acceptTapAt = this.scene.time.now + 180; // ignore the tap that opened it
    this.render();
    this.setVisible(true);
  }

  private onPointerDown(): void {
    if (!this.open_ || this.scene.time.now < this.acceptTapAt) return;
    this.index += 1;
    if (this.index >= this.lines.length) {
      this.close();
    } else {
      this.render();
    }
  }

  /**
   * Force the box closed WITHOUT firing the onClose callback (e.g. a dev reset
   * interrupting the angel's dialogue must not then trigger the choice prompt).
   */
  forceClose(): void {
    if (!this.open_) return;
    this.open_ = false;
    this.setVisible(false);
    this.onClose = undefined;
  }

  private close(): void {
    this.open_ = false;
    this.setVisible(false);
    const cb = this.onClose;
    this.onClose = undefined;
    cb?.();
  }

  private render(): void {
    this.text.setText(this.lines[this.index]);
    const last = this.index === this.lines.length - 1;
    this.hint.setText(last ? 'tap to close ▸' : 'tap to continue ▸');
  }

  private setVisible(v: boolean): void {
    this.box.setVisible(v);
    this.border.setVisible(v);
    this.text.setVisible(v);
    this.hint.setVisible(v);
  }

  private layout(): void {
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    const insets = getInsets(this.scene);
    // Fit within the safe area with equal padding on both sides.
    const left = insets.left + UI_MARGIN;
    const right = w - insets.right - UI_MARGIN;
    const boxW = Math.max(120, right - left);
    const boxH = Phaser.Math.Clamp(h * 0.26, 112, 180);
    const cx = (left + right) / 2;
    const bottom = h - insets.bottom - UI_MARGIN;
    const cy = bottom - boxH / 2;
    const pad = 14;

    this.border.setPosition(cx, cy).setSize(boxW + 4, boxH + 4);
    this.box.setPosition(cx, cy).setSize(boxW, boxH);

    // Left-anchored text, word-wrapped to the inner box width.
    this.text.setPosition(left + pad, cy - boxH / 2 + pad);
    this.text.setWordWrapWidth(boxW - pad * 2, true);
    this.hint.setPosition(right - pad, bottom - pad);
  }
}

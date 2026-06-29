import Phaser from 'phaser';
import { getInsets, UI_MARGIN } from './uiLayout';

/**
 * DEV-only on-screen PERFORMANCE readout (gated by DEV_MODE alongside the rest of
 * the dev tooling). Pinned top-left under the debug readout, routed through the UI
 * camera (fixed across zoom). Shows live FPS + frame time (avg / worst over a short
 * window) and live entity / effect / pool counts, so the under-load behaviour is
 * observable on a phone: if the frame time spikes you can SEE which count spiked.
 *
 * It pulls its content from a `getLines()` callback the scene supplies (the scene
 * owns the entity lists + FX pools), and only re-renders its Text ~4×/sec so the
 * readout itself doesn't add churn. Frame timing is accumulated every frame via
 * {@link sample}.
 */
export class PerfReadout {
  private readonly scene: Phaser.Scene;
  private readonly text: Phaser.GameObjects.Text;
  private readonly getLines: () => string[];

  private acc = 0; // ms since last refresh
  private frameMsSum = 0;
  private frameMsMax = 0;
  private frames = 0;
  private fps = 0;
  private avgMs = 0;
  private maxMs = 0;

  constructor(scene: Phaser.Scene, getLines: () => string[]) {
    this.scene = scene;
    this.getLines = getLines;
    this.text = scene.add.text(0, 0, '', {
      fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
      fontSize: '11px',
      color: '#aef5c0',
      backgroundColor: 'rgba(8, 16, 28, 0.62)',
      padding: { x: 6, y: 5 },
    });
    this.text.setScrollFactor(0).setDepth(2001);
    this.layout();
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this);
    });
  }

  private layout(): void {
    const insets = getInsets(this.scene);
    // Below the HP/XP/Energy cluster + the 3-line debug readout (top-left HUD stack).
    this.text.setPosition(insets.left + UI_MARGIN, insets.top + UI_MARGIN + 96);
  }

  /** Call every frame with the real frame delta (ms). Refreshes the display ~4×/sec. */
  sample(deltaMs: number): void {
    this.frameMsSum += deltaMs;
    if (deltaMs > this.frameMsMax) this.frameMsMax = deltaMs;
    this.frames++;
    this.acc += deltaMs;
    if (this.acc < 250) return;

    this.avgMs = this.frameMsSum / Math.max(1, this.frames);
    this.maxMs = this.frameMsMax;
    this.fps = 1000 / Math.max(0.0001, this.avgMs);
    this.acc = 0;
    this.frameMsSum = 0;
    this.frameMsMax = 0;
    this.frames = 0;

    const head = `FPS ${this.fps.toFixed(0)}  frame ${this.avgMs.toFixed(1)}ms (max ${this.maxMs.toFixed(1)})`;
    this.text.setText([head, ...this.getLines()]);
  }
}

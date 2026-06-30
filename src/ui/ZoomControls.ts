import Phaser from 'phaser';
import {
  ZOOM_STEP,
  ZOOM_TWEEN_MS,
  ZOOM_HOLD_RATE,
  ZOOM_IN_LIMIT,
  ZOOM_OUT_MARGIN,
} from '../game/settings';
import { getInsets } from './uiLayout';

const BTN = 31; // half-size zoom buttons, snug against the mid-right edge
const GAP = 8;
const HOLD_DELAY = 250; // ms before a press becomes a continuous zoom

type Dir = 'in' | 'out';

/**
 * Two stacked on-screen buttons (right side, thumb-reachable) plus keyboard
 * (+/=, −/_) and mouse wheel that smoothly zoom the camera between a tight view
 * on the character and the whole Washington map.
 *
 * - TAP a button: one smooth step (~ZOOM_TWEEN_MS) in that direction.
 * - HOLD a button (or key): keeps zooming continuously until released or a limit.
 *
 * The OUT limit is computed from the live map + screen size (so it keeps working
 * as the map grows); the IN limit is a tight gameplay framing. The camera only
 * changes scale — follow + map-bounds clamping are left to the scene's camera.
 */
export class ZoomControls {
  private readonly scene: Phaser.Scene;
  private readonly cam: Phaser.Cameras.Scene2D.Camera;
  private mapW: number;
  private mapH: number;

  private readonly inBtn: { bg: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text };
  private readonly outBtn: { bg: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text };

  private readonly plusKeys: Phaser.Input.Keyboard.Key[];
  private readonly minusKeys: Phaser.Input.Keyboard.Key[];

  private target: number;
  private outLimit: number;

  private holdDir: Dir | null = null;
  private holdStart = 0;
  private holdPointer: number | null = null;

  constructor(
    scene: Phaser.Scene,
    camera: Phaser.Cameras.Scene2D.Camera,
    mapPixelWidth: number,
    mapPixelHeight: number,
  ) {
    this.scene = scene;
    this.cam = camera;
    this.mapW = mapPixelWidth;
    this.mapH = mapPixelHeight;

    this.target = camera.zoom;
    this.outLimit = this.computeOutLimit();

    this.inBtn = this.makeButton('+', (p) => this.press('in', p));
    this.outBtn = this.makeButton('−', (p) => this.press('out', p)); // − (minus sign)

    // Keyboard: '=' / '+' and numpad-add zoom in; '-' / '_' and numpad-sub out.
    const KC = Phaser.Input.Keyboard.KeyCodes;
    const kb = scene.input.keyboard!;
    this.plusKeys = [kb.addKey(KC.PLUS), kb.addKey(KC.NUMPAD_ADD)]; // '='/'+' and numpad +
    this.minusKeys = [kb.addKey(KC.MINUS), kb.addKey(KC.NUMPAD_SUBTRACT)]; // '-'/'_' and numpad −
    for (const k of this.plusKeys) k.on('down', () => this.step('in'));
    for (const k of this.minusKeys) k.on('down', () => this.step('out'));

    // Mouse wheel (desktop): one step per notch.
    scene.input.on(Phaser.Input.Events.POINTER_WHEEL, this.onWheel, this);
    // Release a held button no matter where the finger lifts.
    scene.input.on(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onPointerUp, this);

    scene.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this);
      scene.input.off(Phaser.Input.Events.POINTER_WHEEL, this.onWheel, this);
    });

    this.layout();
  }

  /**
   * Re-point the zoom at a DIFFERENT map's dimensions (e.g. switching worlds) so
   * the zoom-out limit is re-derived from the now-active map, never hardcoded.
   */
  setMapSize(mapPixelWidth: number, mapPixelHeight: number): void {
    this.mapW = mapPixelWidth;
    this.mapH = mapPixelHeight;
    this.outLimit = this.computeOutLimit();
    this.target = Phaser.Math.Clamp(this.target, this.outLimit, ZOOM_IN_LIMIT);
  }

  /** Smoothly drive the camera zoom toward the target each frame. */
  update(deltaMs: number): void {
    const dt = deltaMs / 1000;

    // Continuous zoom from a held button or key (after the short delay).
    const now = this.scene.time.now;
    let cont: Dir | null = null;
    if (this.holdDir && now - this.holdStart > HOLD_DELAY) cont = this.holdDir;
    else if (this.keyHeld(this.plusKeys)) cont = 'in';
    else if (this.keyHeld(this.minusKeys)) cont = 'out';
    if (cont) {
      const factor = Math.pow(ZOOM_HOLD_RATE, cont === 'in' ? dt : -dt);
      this.setTarget(this.target * factor);
    }

    // Frame-rate independent smoothing toward the target (~ZOOM_TWEEN_MS settle).
    const k = 5000 / ZOOM_TWEEN_MS;
    const a = 1 - Math.exp(-dt * k);
    let z = Phaser.Math.Linear(this.cam.zoom, this.target, a);
    if (Math.abs(z - this.target) < 0.0005) z = this.target;
    this.cam.setZoom(z);

    // Dim a button when its limit is reached.
    this.inBtn.bg.setAlpha(this.target >= ZOOM_IN_LIMIT - 1e-4 ? 0.45 : 0.96);
    this.outBtn.bg.setAlpha(this.target <= this.outLimit + 1e-4 ? 0.45 : 0.96);
  }

  // --- input ----------------------------------------------------------------

  private press(dir: Dir, pointer: Phaser.Input.Pointer): void {
    // Pointer just went down on a button: one immediate step, then (if held) the
    // update loop takes over for continuous zoom.
    this.step(dir);
    this.holdDir = dir;
    this.holdStart = this.scene.time.now;
    this.holdPointer = pointer.id;
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    if (this.holdPointer === null || pointer.id === this.holdPointer) {
      this.holdDir = null;
      this.holdPointer = null;
    }
  }

  private onWheel(_p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number): void {
    this.step(dy < 0 ? 'in' : 'out');
  }

  private step(dir: Dir): void {
    this.setTarget(this.target * (dir === 'in' ? ZOOM_STEP : 1 / ZOOM_STEP));
  }

  private setTarget(z: number): void {
    this.target = Phaser.Math.Clamp(z, this.outLimit, ZOOM_IN_LIMIT);
  }

  private keyHeld(keys: Phaser.Input.Keyboard.Key[]): boolean {
    return keys.some((k) => k.isDown && k.getDuration() > HOLD_DELAY);
  }

  // --- limits / layout ------------------------------------------------------

  /** Smallest zoom that still fits the whole map on screen (with a margin). */
  private computeOutLimit(): number {
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    const fit = Math.min(w / (this.mapW * ZOOM_OUT_MARGIN), h / (this.mapH * ZOOM_OUT_MARGIN));
    return Math.min(fit, ZOOM_IN_LIMIT); // never invert the clamp
  }

  private makeButton(glyph: string, onDown: (pointer: Phaser.Input.Pointer) => void): {
    bg: Phaser.GameObjects.Rectangle;
    label: Phaser.GameObjects.Text;
  } {
    const depth = 1300;
    const bg = this.scene.add
      .rectangle(0, 0, BTN, BTN, 0x14223a, 0.96)
      .setStrokeStyle(3, 0xffd24a, 1)
      .setScrollFactor(0)
      .setDepth(depth)
      .setInteractive({ useHandCursor: true });
    const label = this.scene.add
      .text(0, 0, glyph, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '20px',
        color: '#ffe9a8',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(depth + 1);
    bg.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, onDown);
    return { bg, label };
  }

  private layout(): void {
    this.outLimit = this.computeOutLimit();
    // A rotation/resize can change the out-limit; keep the target in range.
    this.target = Phaser.Math.Clamp(this.target, this.outLimit, ZOOM_IN_LIMIT);
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    const insets = getInsets(this.scene);
    // SNUG against the RIGHT edge, vertically centred, stacked ([+] over [−]).
    const x = w - insets.right - 2 - BTN / 2;
    const cy = h / 2;
    const inY = cy - (BTN / 2 + GAP / 2); // + on top
    const outY = cy + (BTN / 2 + GAP / 2); // − below
    this.inBtn.bg.setPosition(x, inY);
    this.inBtn.label.setPosition(x, inY);
    this.outBtn.bg.setPosition(x, outY);
    this.outBtn.label.setPosition(x, outY);
  }
}

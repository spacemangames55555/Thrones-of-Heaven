import Phaser from 'phaser';

/**
 * Pooled transient combat FX — the fix for the under-load freeze. Profiling showed
 * the stutter came from CHURN: floating damage-number `Text` objects (~0.7 ms EACH
 * to allocate — canvas + measureText + texture upload) and impact `circle`s
 * (~0.2 ms each) were created and destroyed per hit. Under heavy combat (AoE / DoT /
 * channel ticks across a crowd) dozens spawn per frame — ~22 fresh damage numbers
 * alone blow a 16 ms frame budget. Reusing a fixed pool instead of allocating drops
 * the cost ~10× (measured: 300 Texts 225 ms fresh → 22 ms reused).
 *
 * Both pools animate their items MANUALLY (no per-show Tween allocation either) and
 * are driven once per frame from MainScene.update via {@link tick}. When the pool is
 * full the OLDEST active item is recycled, so a burst can never exceed its cap (a
 * hard, tunable ceiling on concurrent FX). Items live on the world-FX layer (drawn by
 * the main camera, ignored by the UI camera), exactly like the old per-hit effects.
 */

interface FloatItem {
  text: Phaser.GameObjects.Text;
  active: boolean;
  x: number;
  startY: number;
  riseBy: number;
  startAt: number;
  durationMs: number;
}

/** Pooled rising/fading damage numbers + small combat labels (the dominant churn source). */
export class FloatingTextPool {
  private readonly scene: Phaser.Scene;
  private readonly layer: Phaser.GameObjects.Layer;
  private readonly max: number;
  private readonly items: FloatItem[] = [];

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer, max: number) {
    this.scene = scene;
    this.layer = layer;
    this.max = max;
  }

  get activeCount(): number {
    let n = 0;
    for (const it of this.items) if (it.active) n++;
    return n;
  }
  get size(): number {
    return this.items.length;
  }

  /** Show a rising, fading label at (x,y). Reuses a pooled Text; recycles the oldest if full. */
  show(
    x: number,
    y: number,
    text: string,
    color: string,
    opts?: { fontSize?: number; riseBy?: number; durationMs?: number; depth?: number },
  ): void {
    const fontSize = opts?.fontSize ?? 18;
    const riseBy = opts?.riseBy ?? 34;
    const durationMs = opts?.durationMs ?? 600;
    const depth = opts?.depth ?? 13;

    let it = this.items.find((i) => !i.active);
    if (!it) {
      if (this.items.length < this.max) {
        const t = this.scene.add
          .text(0, 0, '', { fontFamily: 'system-ui, sans-serif', fontSize: `${fontSize}px`, color, fontStyle: 'bold' })
          .setOrigin(0.5)
          .setDepth(depth)
          .setStroke('#000000', 4);
        this.layer.add(t);
        it = { text: t, active: false, x: 0, startY: 0, riseBy: 0, startAt: 0, durationMs: 0 };
        this.items.push(it);
      } else {
        // Pool full → recycle the oldest active item (a hard ceiling on concurrent labels).
        it = this.items.reduce((a, b) => (a.startAt <= b.startAt ? a : b));
      }
    }

    const t = it.text;
    if (t.style.fontSize !== `${fontSize}px`) t.setFontSize(fontSize);
    t.setColor(color);
    t.setText(text);
    t.setDepth(depth);
    t.setPosition(x, y);
    t.setAlpha(1);
    t.setVisible(true);
    it.active = true;
    it.x = x;
    it.startY = y;
    it.riseBy = riseBy;
    it.startAt = this.scene.time.now;
    it.durationMs = durationMs;
  }

  /** Advance every active label (rise + fade); deactivate when finished. */
  tick(now: number): void {
    for (const it of this.items) {
      if (!it.active) continue;
      const p = (now - it.startAt) / it.durationMs;
      if (p >= 1) {
        it.active = false;
        it.text.setVisible(false);
        continue;
      }
      it.text.y = it.startY - it.riseBy * p;
      it.text.setAlpha(1 - p);
    }
  }

  /** Deactivate everything (dev reset / scene cleanup). */
  clear(): void {
    for (const it of this.items) {
      it.active = false;
      it.text.setVisible(false);
    }
  }
}

interface CircleItem {
  obj: Phaser.GameObjects.Arc;
  active: boolean;
  startAt: number;
  durationMs: number;
  fromScale: number;
  toScale: number;
  fromAlpha: number;
}

const CIRCLE_BASE_R = 10; // base radius; per-show size is applied via scale

/** Pooled fill-only impact circles / soft pulses (e.g. bolt impacts — once per bolt). */
export class CircleFxPool {
  private readonly scene: Phaser.Scene;
  private readonly layer: Phaser.GameObjects.Layer;
  private readonly max: number;
  private readonly items: CircleItem[] = [];

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer, max: number) {
    this.scene = scene;
    this.layer = layer;
    this.max = max;
  }

  get activeCount(): number {
    let n = 0;
    for (const it of this.items) if (it.active) n++;
    return n;
  }
  get size(): number {
    return this.items.length;
  }

  /** Flash a fill-only circle of `radius` at (x,y), growing to `toScale`× while fading out. */
  show(
    x: number,
    y: number,
    radius: number,
    color: number,
    opts?: { alpha?: number; toScale?: number; durationMs?: number; depth?: number },
  ): void {
    const alpha = opts?.alpha ?? 0.85;
    const toScale = opts?.toScale ?? 2.2;
    const durationMs = opts?.durationMs ?? 180;
    const depth = opts?.depth ?? 13;
    const baseScale = radius / CIRCLE_BASE_R;

    let it = this.items.find((i) => !i.active);
    if (!it) {
      if (this.items.length < this.max) {
        const o = this.scene.add.circle(0, 0, CIRCLE_BASE_R, color, alpha).setDepth(depth);
        this.layer.add(o);
        it = { obj: o, active: false, startAt: 0, durationMs: 0, fromScale: 1, toScale: 1, fromAlpha: 1 };
        this.items.push(it);
      } else {
        it = this.items.reduce((a, b) => (a.startAt <= b.startAt ? a : b));
      }
    }

    const o = it.obj;
    o.setFillStyle(color, alpha);
    o.setDepth(depth);
    o.setPosition(x, y);
    o.setScale(baseScale);
    o.setAlpha(alpha);
    o.setVisible(true);
    it.active = true;
    it.startAt = this.scene.time.now;
    it.durationMs = durationMs;
    it.fromScale = baseScale;
    it.toScale = baseScale * toScale;
    it.fromAlpha = alpha;
  }

  tick(now: number): void {
    for (const it of this.items) {
      if (!it.active) continue;
      const p = (now - it.startAt) / it.durationMs;
      if (p >= 1) {
        it.active = false;
        it.obj.setVisible(false);
        continue;
      }
      const e = 1 - (1 - p) * (1 - p); // Quad.out
      it.obj.setScale(it.fromScale + (it.toScale - it.fromScale) * e);
      it.obj.setAlpha(it.fromAlpha * (1 - p));
    }
  }

  clear(): void {
    for (const it of this.items) {
      it.active = false;
      it.obj.setVisible(false);
    }
  }
}

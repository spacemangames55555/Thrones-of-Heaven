import Phaser from 'phaser';
import type { WorldCalibration } from '../world/world-calibration';
import { EARTH_RASTER_DEG } from '../world/earth-raster-data';
import { groundClassAtLatLng, GROUND_CLASS_TINT, GROUND_WATER } from '../world/earth-raster';

/** Hard cap on ground cells drawn per redraw, at ANY zoom (the tile cap). When
 *  the camera window holds more raster cells than this, the layer samples at a
 *  coarser stride and draws bigger rects — bounded work at full zoom-out. */
export const GROUND_CELL_CAP = 9000;

/** Extra cells materialized around the camera window (the despawn hysteresis:
 *  no redraw happens while the view stays inside the materialized ring). */
const WINDOW_MARGIN_CELLS = 2;

/**
 * GROUND LAYER for SPARSE region worlds — makes the continents real. One
 * pooled Graphics per world draws flat biome-tinted ground cells (and water)
 * for the camera's area by sampling the bundled Earth raster through the
 * world's lat/lng calibration. Same materialize/despawn hysteresis idea as
 * the enemy chunks: the drawn window is a margin larger than the view and is
 * only rebuilt when the view escapes it (or the zoom changes the stride).
 * Zone chunk layers render ON TOP, unchanged (this sits at negative depth).
 * Dense hand-built worlds never get one.
 */
export class GroundLayer {
  private readonly g: Phaser.GameObjects.Graphics;
  /** The FAR view: the whole raster pre-baked ONCE into a tiny texture (one
   *  cell = one texel, nearest-filtered), drawn as a SINGLE image. Hundreds of
   *  per-frame Graphics fills at planet zoom are draw-call cost the continent-
   *  zoom FPS gate measures; one textured quad is flat. */
  private readonly planet: Phaser.GameObjects.Image;
  private readonly origin: { x: number; y: number };
  private readonly cal: WorldCalibration;
  private readonly cols: number;
  private readonly rows: number;
  private readonly cellW: number;
  private readonly cellH: number;
  /** Harness visibility switch (setVisible): hides WHICHEVER layer is live. */
  private shown = true;
  /** Rects drawn by the last redraw, AFTER same-class horizontal runs merge
   *  (runtime-gate observable; ≤ GROUND_CELL_CAP; 1 in planet-image mode). */
  cellsDrawn = 0;
  /** Materialized cell window + stride; view movement inside it skips redraws. */
  private win = { c0: 0, r0: 0, c1: -1, r1: -1, stride: 0 };

  constructor(scene: Phaser.Scene, origin: { x: number; y: number }, cal: WorldCalibration, sizePx: { w: number; h: number }, depth = -5) {
    this.origin = origin;
    this.cal = cal;
    this.cellW = EARTH_RASTER_DEG * cal.pixelsPerDegree.x;
    this.cellH = EARTH_RASTER_DEG * cal.pixelsPerDegree.y;
    this.cols = Math.ceil(sizePx.w / this.cellW);
    this.rows = Math.ceil(sizePx.h / this.cellH);
    this.g = scene.add.graphics().setDepth(depth); // below every chunk layer
    this.planet = this.buildPlanetImage(scene, depth);
  }

  /** Bake the whole raster (through this world's calibration) into a cols×rows
   *  canvas texture — one texel per 0.5° cell — shown scaled over the world
   *  bounds whenever the camera is far enough out that the windowed Graphics
   *  would need stride-coarsened blocks anyway (the texel grid is FINER). */
  private buildPlanetImage(scene: Phaser.Scene, depth: number): Phaser.GameObjects.Image {
    const key = `ground-planet-${this.origin.x}x${this.origin.y}`;
    if (!scene.textures.exists(key)) {
      const canvas = scene.textures.createCanvas(key, this.cols, this.rows)!;
      const ctx = canvas.getContext();
      const img = ctx.createImageData(this.cols, this.rows);
      let i = 0;
      for (let r = 0; r < this.rows; r++) {
        const lat = this.cal.origin.lat - (r + 0.5) * EARTH_RASTER_DEG;
        for (let c = 0; c < this.cols; c++) {
          const lng = this.cal.origin.lng + (c + 0.5) * EARTH_RASTER_DEG;
          const tint = GROUND_CLASS_TINT[groundClassAtLatLng(lat, lng)] ?? GROUND_CLASS_TINT[GROUND_WATER];
          img.data[i++] = (tint >> 16) & 0xff;
          img.data[i++] = (tint >> 8) & 0xff;
          img.data[i++] = tint & 0xff;
          img.data[i++] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
      canvas.refresh();
      scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST); // crisp cell blocks, no smear
    }
    const im = scene.add.image(this.origin.x, this.origin.y, key).setOrigin(0, 0).setDepth(depth).setVisible(false);
    im.setDisplaySize(this.cols * this.cellW, this.rows * this.cellH);
    return im;
  }

  /** Show/hide the ground as a whole (whichever mode is live) — the runtime
   *  gate's self-relative FPS baselines toggle THIS, never the internals. */
  setVisible(v: boolean): void {
    this.shown = v;
    if (!v) {
      this.g.setVisible(false);
      this.planet.setVisible(false);
    }
    // Re-shown: update() re-enables the correct layer on the next frame.
  }

  /** Ground class under a WORLD point (0 water, 1..5 biome). */
  classAtWorld(worldX: number, worldY: number): number {
    const lat = this.cal.origin.lat - (worldY - this.origin.y) / this.cal.pixelsPerDegree.y;
    const lng = this.cal.origin.lng + (worldX - this.origin.x) / this.cal.pixelsPerDegree.x;
    return groundClassAtLatLng(lat, lng);
  }

  /** True when the point's VOID ground is water (impassable; gates are travel). */
  isWaterAtWorld(worldX: number, worldY: number): boolean {
    return this.classAtWorld(worldX, worldY) === GROUND_WATER;
  }

  /** Per-frame while this world is active. NEAR (stride 1): the windowed
   *  Graphics, rebuilt only when the camera escapes the materialized ring
   *  (hysteresis). FAR (stride would exceed 1): the pre-baked planet image —
   *  one draw call, finer than stride blocks. */
  update(cam: Phaser.Cameras.Scene2D.Camera): void {
    const v = cam.worldView;
    const c0 = Phaser.Math.Clamp(Math.floor((v.x - this.origin.x) / this.cellW) - WINDOW_MARGIN_CELLS, 0, this.cols - 1);
    const r0 = Phaser.Math.Clamp(Math.floor((v.y - this.origin.y) / this.cellH) - WINDOW_MARGIN_CELLS, 0, this.rows - 1);
    const c1 = Phaser.Math.Clamp(Math.floor((v.right - this.origin.x) / this.cellW) + WINDOW_MARGIN_CELLS, 0, this.cols - 1);
    const r1 = Phaser.Math.Clamp(Math.floor((v.bottom - this.origin.y) / this.cellH) + WINDOW_MARGIN_CELLS, 0, this.rows - 1);
    const viewCells = (c1 - c0 + 1) * (r1 - r0 + 1);
    const stride = Math.max(1, Math.ceil(Math.sqrt(viewCells / GROUND_CELL_CAP)));
    if (stride > 1) {
      // FAR: one textured quad for the whole planet; drop the near window so
      // zooming back in rebuilds fresh.
      if (this.g.visible) this.g.setVisible(false);
      if (this.shown && !this.planet.visible) this.planet.setVisible(true);
      this.win = { c0: 0, r0: 0, c1: -1, r1: -1, stride: 0 };
      this.cellsDrawn = 1;
      return;
    }
    if (this.planet.visible) this.planet.setVisible(false);
    if (this.shown && !this.g.visible) this.g.setVisible(true);
    const w = this.win;
    const contained = stride === w.stride && c0 >= w.c0 && r0 >= w.r0 && c1 <= w.c1 && r1 <= w.r1;
    const winCells = (w.c1 - w.c0 + 1) * (w.r1 - w.r0 + 1);
    // Skip while the view stays inside the materialized ring — UNLESS the ring
    // is grossly oversized for the view (just zoomed back in): then shrink, so
    // ground zoom never keeps paying full-continent geometry after a map look.
    if (contained && winCells <= viewCells * 6) return;
    this.win = { c0, r0, c1, r1, stride };
    this.redraw();
  }

  private redraw(): void {
    const { c0, r0, c1, r1, stride } = this.win;
    this.g.clear();
    let drawn = 0;
    for (let r = r0; r <= r1; r += stride) {
      // Sample each block's center cell, but MERGE horizontal runs of the same
      // class into ONE rect — at planet zoom-out the window is thousands of
      // blocks and per-block rects are pure render cost (identical pixels;
      // this held the continent-zoom FPS gate, which caught the regression).
      const y = this.origin.y + r * this.cellH;
      const h = this.cellH * stride;
      const lat = this.cal.origin.lat - (r + stride / 2) * EARTH_RASTER_DEG;
      let runStart = c0;
      let runCls = -1;
      const flush = (endC: number): void => {
        if (runCls < 0) return;
        this.g.fillStyle(GROUND_CLASS_TINT[runCls] ?? GROUND_CLASS_TINT[GROUND_WATER], 1);
        this.g.fillRect(this.origin.x + runStart * this.cellW, y, (endC - runStart) * this.cellW, h);
        drawn++;
      };
      for (let c = c0; c <= c1; c += stride) {
        const lng = this.cal.origin.lng + (c + stride / 2) * EARTH_RASTER_DEG;
        const cls = groundClassAtLatLng(lat, lng);
        if (cls !== runCls) {
          flush(c);
          runStart = c;
          runCls = cls;
        }
      }
      flush(c1 + stride);
    }
    this.cellsDrawn = drawn;
  }
}

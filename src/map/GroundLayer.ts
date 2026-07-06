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
  private readonly origin: { x: number; y: number };
  private readonly cal: WorldCalibration;
  private readonly cols: number;
  private readonly rows: number;
  private readonly cellW: number;
  private readonly cellH: number;
  /** Cells drawn by the last redraw (runtime-gate observable; ≤ GROUND_CELL_CAP). */
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

  /** Per-frame while this world is active: rebuild the drawn window only when
   *  the camera escapes the materialized one (hysteresis) or the stride changes. */
  update(cam: Phaser.Cameras.Scene2D.Camera): void {
    const v = cam.worldView;
    const c0 = Phaser.Math.Clamp(Math.floor((v.x - this.origin.x) / this.cellW) - WINDOW_MARGIN_CELLS, 0, this.cols - 1);
    const r0 = Phaser.Math.Clamp(Math.floor((v.y - this.origin.y) / this.cellH) - WINDOW_MARGIN_CELLS, 0, this.rows - 1);
    const c1 = Phaser.Math.Clamp(Math.floor((v.right - this.origin.x) / this.cellW) + WINDOW_MARGIN_CELLS, 0, this.cols - 1);
    const r1 = Phaser.Math.Clamp(Math.floor((v.bottom - this.origin.y) / this.cellH) + WINDOW_MARGIN_CELLS, 0, this.rows - 1);
    const viewCells = (c1 - c0 + 1) * (r1 - r0 + 1);
    const stride = Math.max(1, Math.ceil(Math.sqrt(viewCells / GROUND_CELL_CAP)));
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
      for (let c = c0; c <= c1; c += stride) {
        // Sample the block's center cell; draw one stride-sized rect for it.
        const lat = this.cal.origin.lat - (r + stride / 2) * EARTH_RASTER_DEG;
        const lng = this.cal.origin.lng + (c + stride / 2) * EARTH_RASTER_DEG;
        const cls = groundClassAtLatLng(lat, lng);
        this.g.fillStyle(GROUND_CLASS_TINT[cls] ?? GROUND_CLASS_TINT[GROUND_WATER], 1);
        this.g.fillRect(this.origin.x + c * this.cellW, this.origin.y + r * this.cellH, this.cellW * stride, this.cellH * stride);
        drawn++;
      }
    }
    this.cellsDrawn = drawn;
  }
}

import Phaser from 'phaser';
import { TILE_PX, PX_PER_DEG_LAT } from './world-scale';
import { CHUNK_TILES, TILE_RECORD_BYTES, FLAG_SCATTER, Biome } from './terrain-schema';
import {
  FRINGE_MIN_ZOOM,
  FRINGE_POOL_CAP,
  PRIORITY_RANK,
  PROP_TABLE,
  SCATTER_MIN_ZOOM,
  SCATTER_POOL_CAP,
  WATER_ANIM_MS,
  selectOverlays,
  type OverlayQuad,
} from './terrain-visuals-config';
import { UNDERSTORY_POOL_CAP, floraFor, floraVariation } from './flora-config';
import { ATLAS_STRIDE, FRINGE_ATLAS_KEY, propTextureKey } from './terrain-placeholder';

/**
 * TERRAIN VISUALS RUNTIME (Pass 5): the fringe-overlay and scatter-prop pools
 * plus the water-anim cycle, driven entirely by the chunk streamer's cached
 * tile records. Everything here is a pure function of the records — no
 * randomness at draw time, no per-frame allocation once the pools are warm.
 */

/** One chunk's precomputed visual data (built once per fill, data only). */
export interface ChunkVisuals {
  /** Fringe overlay quads: tile-local (i, j) + biome + cell frame. */
  overlays: { i: number; j: number; q: OverlayQuad }[];
  /** Water tiles (OCEAN/FRESHWATER) for the anim cycle, PACKED (whole-ocean
   *  chunks hold 4096 of these): bits 0-11 = local tile index (j*64+i),
   *  bit 15 = FRESHWATER (else OCEAN). */
  water: Uint16Array;
  /** Deterministic scatter props: local tile + prop id + in-tile offset px. */
  scatter: { i: number; j: number; id: string; ox: number; oy: number }[];
  /** PASS 9: the UNDERSTORY tier — same shape, own hash salt, drawn beneath
   *  the canopy. Empty at ship (every understory palette is empty). */
  understory: { i: number; j: number; id: string; ox: number; oy: number }[];
}

/** Deterministic tile hash — PASS 9: lives in flora-config (the hash
 *  discipline IS the flora contract); re-exported here for the existing
 *  call sites and the gate handle. */
export { tileHash01 } from './flora-config';

/** PURE scatter reference: what (if anything) scatters on a global tile of a
 *  given biome. PASS 9: the CANOPY tier of the flora reference — same
 *  densities, same candidate order, same salts (canopy's tier salt is 0), so
 *  this is bit-for-bit the Pass 5 result (gate: migration-silence). */
export function scatterFor(tx: number, ty: number, biome: number): { id: string; ox: number; oy: number } | null {
  return floraFor(tx, ty, biome, 'canopy');
}

/**
 * Build one chunk's visual data from its record bytes. `biomeAt` resolves
 * neighbor biomes across chunk borders (cached chunk at the current version,
 * else the pure per-tile reference — deterministic either way). Stamped tiles
 * (flag bit 0x80) are punched out: no overlays, no scatter, no water anim.
 */
export function computeChunkVisuals(bytes: Uint8Array, cx: number, cy: number, biomeAt: (tx: number, ty: number) => number): ChunkVisuals {
  const overlays: ChunkVisuals['overlays'] = [];
  const waterPacked: number[] = [];
  const scatter: ChunkVisuals['scatter'] = [];
  const understory: ChunkVisuals['understory'] = [];
  const tx0 = cx * CHUNK_TILES;
  const ty0 = cy * CHUNK_TILES;
  for (let j = 0; j < CHUNK_TILES; j++) {
    for (let i = 0; i < CHUNK_TILES; i++) {
      const o = (j * CHUNK_TILES + i) * TILE_RECORD_BYTES;
      const flags = bytes[o + 3];
      if ((flags & 0x80) !== 0) continue; // stamped: the authored layer owns it
      const biome = bytes[o];
      const tx = tx0 + i;
      const ty = ty0 + j;
      if (biome === Biome.OCEAN || biome === Biome.FRESHWATER) waterPacked.push((j * CHUNK_TILES + i) | (biome === Biome.FRESHWATER ? 0x8000 : 0));
      // In-chunk neighbors read our own bytes; border tiles go through biomeAt.
      const nbOf = (di: number, dj: number): number => {
        const ni = i + di;
        const nj = j + dj;
        if (ni >= 0 && ni < CHUNK_TILES && nj >= 0 && nj < CHUNK_TILES) return bytes[(nj * CHUNK_TILES + ni) * TILE_RECORD_BYTES];
        return biomeAt(tx + di, ty + dj);
      };
      for (const q of selectOverlays(biome, {
        n: nbOf(0, -1),
        e: nbOf(1, 0),
        s: nbOf(0, 1),
        w: nbOf(-1, 0),
        ne: nbOf(1, -1),
        se: nbOf(1, 1),
        sw: nbOf(-1, 1),
        nw: nbOf(-1, -1),
      })) {
        overlays.push({ i, j, q });
      }
      if ((flags & FLAG_SCATTER) !== 0) {
        const s = floraFor(tx, ty, biome, 'canopy');
        if (s) scatter.push({ i, j, ...s });
        // PASS 9: the understory tier rolls on the SAME scatter-allowed
        // tiles with its own salt. Inert while the palette is empty.
        const u = floraFor(tx, ty, biome, 'understory');
        if (u) understory.push({ i, j, ...u });
      }
    }
  }
  return { overlays, water: Uint16Array.from(waterPacked), scatter, understory };
}

/** The world height in px (props y-sort by absolute y, normalized into a
 *  depth band that stays below the authored stamps at depth 0). */
const WORLD_H_PX = 170 * PX_PER_DEG_LAT;

/** PASS 9 — TIER SORTS BEFORE Y WITHIN A ROW: an understory instance depth-
 *  sorts as if it stood HALF A TILE north of its anchor, so at the same
 *  anchor row it draws under the canopy while never sinking below the row
 *  above (a full tile would). Derived, not tuned: the depth band spans 1.9
 *  over WORLD_H_PX, so one tile row is only ~2e-6 of depth — an arbitrary
 *  epsilon would have crossed many rows. */
const TIER_Y_BIAS_PX = TILE_PX / 2;

/** Y-sorted prop depth inside the props' own band [-2.5, -0.6] (under the
 *  authored stamps at 0). Shared by both tiers so their sort is one rule. */
function propDepth(py: number): number {
  return -2.5 + Math.min(1, Math.max(0, py / WORLD_H_PX)) * 1.9;
}

interface VisualChunk {
  cx: number;
  cy: number;
  visuals: ChunkVisuals;
  layer?: Phaser.Tilemaps.TilemapLayerBase;
}

/**
 * The pooled renderer. The streamer feeds it per-chunk data + the camera; it
 * assigns pooled images each frame (viewport-culled) and cycles water frames.
 * Pools are hard-capped (FRINGE_POOL_CAP / SCATTER_POOL_CAP): overflow quads
 * are skipped deterministically, never allocated.
 */
export class TerrainVisualsRenderer {
  private readonly fringePool: Phaser.GameObjects.Image[] = [];
  private readonly scatterPool: Phaser.GameObjects.Image[] = [];
  private readonly understoryPool: Phaser.GameObjects.Image[] = [];
  private waterPhase = 0;
  private lastWaterTick = 0;
  /** The globe origin of the last update — paintProp needs it to recover an
   *  instance's GLOBAL tile for the variation hash. */
  private originX = 0;
  private originY = 0;
  // Gate-observable state.
  fringeVisible = 0;
  scatterVisible = 0;
  understoryVisible = 0;
  fringeSkipped = 0;
  scatterSkipped = 0;
  understorySkipped = 0;
  fringeCreated = 0;
  scatterCreated = 0;
  understoryCreated = 0;
  waterCycles = 0;

  constructor(private readonly scene: Phaser.Scene) {}

  stats(): Record<string, number> {
    return {
      fringeVisible: this.fringeVisible,
      scatterVisible: this.scatterVisible,
      understoryVisible: this.understoryVisible,
      fringePool: this.fringePool.length,
      scatterPool: this.scatterPool.length,
      understoryPool: this.understoryPool.length,
      fringeSkipped: this.fringeSkipped,
      scatterSkipped: this.scatterSkipped,
      understorySkipped: this.understorySkipped,
      fringeCreated: this.fringeCreated,
      scatterCreated: this.scatterCreated,
      understoryCreated: this.understoryCreated,
      waterPhase: this.waterPhase,
      waterCycles: this.waterCycles,
    };
  }

  /** Per-frame: cull chunk visual data to the camera and assign the pools. */
  update(chunks: Iterable<VisualChunk>, originPx: { x: number; y: number }, now: number): void {
    const cam = this.scene.cameras.main;
    const view = cam.worldView;
    const zoom = cam.zoom;
    const chunkPx = CHUNK_TILES * TILE_PX;
    this.originX = originPx.x;
    this.originY = originPx.y;
    // Water anim cycle (cheap: only chunks with live layers + water tiles).
    if (now - this.lastWaterTick >= WATER_ANIM_MS) {
      this.lastWaterTick = now;
      this.waterPhase = (this.waterPhase + 1) % 3;
      this.waterCycles++;
      for (const c of chunks) {
        if (!c.layer || c.visuals.water.length === 0) continue;
        const layer = c.layer as Phaser.Tilemaps.TilemapLayer;
        for (const packed of c.visuals.water) {
          const idx = packed & 0x0fff;
          const t = layer.getTileAt(idx % CHUNK_TILES, Math.floor(idx / CHUNK_TILES));
          if (t) t.index = (packed & 0x8000 ? 1 : 0) * ATLAS_STRIDE + 4 + this.waterPhase;
        }
      }
    }
    let fUsed = 0;
    let sUsed = 0;
    let uUsed = 0;
    this.fringeSkipped = 0;
    this.scatterSkipped = 0;
    this.understorySkipped = 0;
    const x0 = view.x - TILE_PX;
    const y0 = view.y - TILE_PX;
    const x1 = view.right + TILE_PX;
    const y1 = view.bottom + 64; // props anchor at their base — keep tall ones entering from the south
    for (const c of chunks) {
      const chunkX = originPx.x + c.cx * chunkPx;
      const chunkY = originPx.y + c.cy * chunkPx;
      if (chunkX > x1 || chunkX + chunkPx < x0 || chunkY > y1 || chunkY + chunkPx < y0) continue;
      if (zoom >= FRINGE_MIN_ZOOM) {
        for (const ov of c.visuals.overlays) {
          const px = chunkX + ov.i * TILE_PX;
          const py = chunkY + ov.j * TILE_PX;
          if (px > x1 || px + TILE_PX < x0 || py > y1 || py + TILE_PX < y0) continue;
          const img = this.takeFringe(fUsed);
          if (!img) {
            this.fringeSkipped++;
            continue;
          }
          fUsed++;
          img.setTexture(FRINGE_ATLAS_KEY, `${ov.q.biome}:${ov.q.cell}`);
          img.setPosition(px, py);
          // Higher-priority fringes draw above lower ones, all under stamps (0).
          img.setDepth(-2.9 + (PRIORITY_RANK[ov.q.biome] ?? 0) * 0.002);
          img.setVisible(true);
        }
      }
      if (zoom >= SCATTER_MIN_ZOOM) {
        // UNDERSTORY FIRST (same cull ring, own pool, biased depth) — the
        // canopy above it wins every tie at the same anchor row.
        for (const uc of c.visuals.understory) {
          const px = chunkX + uc.i * TILE_PX + TILE_PX / 2 + uc.ox;
          const py = chunkY + uc.j * TILE_PX + TILE_PX / 2 + uc.oy;
          if (px > x1 || px < x0 || py > y1 || py < y0) continue;
          const img = this.takeUnderstory(uUsed);
          if (!img) {
            this.understorySkipped++;
            continue;
          }
          uUsed++;
          this.paintProp(img, uc, px, py, propDepth(py - TIER_Y_BIAS_PX), 'understory', chunkX, chunkY);
        }
        for (const sc of c.visuals.scatter) {
          const px = chunkX + sc.i * TILE_PX + TILE_PX / 2 + sc.ox;
          const py = chunkY + sc.j * TILE_PX + TILE_PX / 2 + sc.oy;
          if (px > x1 || px < x0 || py > y1 || py < y0) continue;
          const img = this.takeScatter(sUsed);
          if (!img) {
            this.scatterSkipped++;
            continue;
          }
          sUsed++;
          this.paintProp(img, sc, px, py, propDepth(py), 'canopy', chunkX, chunkY);
        }
      }
    }
    for (let k = fUsed; k < this.fringePool.length; k++) this.fringePool[k].setVisible(false);
    for (let k = sUsed; k < this.scatterPool.length; k++) this.scatterPool[k].setVisible(false);
    for (let k = uUsed; k < this.understoryPool.length; k++) this.understoryPool[k].setVisible(false);
    this.fringeVisible = fUsed;
    this.scatterVisible = sUsed;
    this.understoryVisible = uUsed;
  }

  /** Paint one pooled prop image: texture, place, depth, and the deterministic
   *  per-instance variation (mirror / scale / tint) from the SAME hash family
   *  that planted it. Collision footprints live in flora-config and never see
   *  the render scale (gate: collision-invariance). */
  private paintProp(
    img: Phaser.GameObjects.Image,
    inst: { i: number; j: number; id: string },
    px: number,
    py: number,
    depth: number,
    tier: 'canopy' | 'understory',
    chunkX: number,
    chunkY: number,
  ): void {
    img.setTexture(propTextureKey(inst.id));
    img.setPosition(px, py);
    img.setDepth(depth);
    // The variation hash keys off the instance's GLOBAL tile, so an instance
    // looks the same however its chunk was reached (worker or direct).
    const tx = Math.round((chunkX - this.originX) / TILE_PX) + inst.i;
    const ty = Math.round((chunkY - this.originY) / TILE_PX) + inst.j;
    const v = floraVariation(tx, ty, tier, inst.id);
    img.setFlipX(v.mirror);
    img.setScale(v.scale);
    img.setTint(v.tint);
    img.setVisible(true);
  }

  destroy(): void {
    for (const i of this.fringePool) i.destroy();
    for (const i of this.scatterPool) i.destroy();
    for (const i of this.understoryPool) i.destroy();
    this.fringePool.length = 0;
    this.scatterPool.length = 0;
    this.understoryPool.length = 0;
  }

  private takeUnderstory(idx: number): Phaser.GameObjects.Image | null {
    if (idx < this.understoryPool.length) return this.understoryPool[idx];
    if (this.understoryPool.length >= UNDERSTORY_POOL_CAP) return null;
    const first = Object.keys(PROP_TABLE)[0];
    const img = this.scene.add.image(0, 0, propTextureKey(first)).setOrigin(0.5, 1).setVisible(false);
    this.understoryPool.push(img);
    this.understoryCreated++;
    return img;
  }

  private takeFringe(idx: number): Phaser.GameObjects.Image | null {
    if (idx < this.fringePool.length) return this.fringePool[idx];
    if (this.fringePool.length >= FRINGE_POOL_CAP) return null;
    const img = this.scene.add.image(0, 0, FRINGE_ATLAS_KEY).setOrigin(0, 0).setVisible(false);
    this.fringePool.push(img);
    this.fringeCreated++;
    return img;
  }

  private takeScatter(idx: number): Phaser.GameObjects.Image | null {
    if (idx < this.scatterPool.length) return this.scatterPool[idx];
    if (this.scatterPool.length >= SCATTER_POOL_CAP) return null;
    const first = Object.keys(PROP_TABLE)[0];
    const img = this.scene.add.image(0, 0, propTextureKey(first)).setOrigin(0.5, 1).setVisible(false);
    this.scatterPool.push(img);
    this.scatterCreated++;
    return img;
  }
}

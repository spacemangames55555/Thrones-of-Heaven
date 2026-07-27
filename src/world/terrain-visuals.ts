import Phaser from 'phaser';
import { TILE_PX, PX_PER_DEG_LAT } from './world-scale';
import { CHUNK_TILES, TILE_RECORD_BYTES, FLAG_SCATTER, Biome } from './terrain-schema';
import {
  FRINGE_MIN_ZOOM,
  FRINGE_POOL_CAP,
  PRIORITY_RANK,
  PROP_TABLE,
  SCATTER_DENSITY,
  SCATTER_MIN_ZOOM,
  SCATTER_POOL_CAP,
  SCATTER_PROPS,
  WATER_ANIM_MS,
  selectOverlays,
  type OverlayQuad,
} from './terrain-visuals-config';
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
}

/** Deterministic tile hash (the ONE scatter/offset source — no Math.random). */
export function tileHash01(tx: number, ty: number, salt: number): number {
  let h = (Math.imul(tx, 374761393) + Math.imul(ty, 668265263)) ^ salt;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** PURE scatter reference: what (if anything) scatters on a global tile of a
 *  given biome. The streamer's per-chunk lists and the gate's recompute both
 *  call exactly this. Returns null when the roll fails or the biome is bare. */
export function scatterFor(tx: number, ty: number, biome: number): { id: string; ox: number; oy: number } | null {
  const density = SCATTER_DENSITY[biome];
  if (!density) return null;
  if (tileHash01(tx, ty, 0x5ca77e12) >= density) return null;
  const props = SCATTER_PROPS[biome];
  const id = props[Math.floor(tileHash01(tx, ty, 0x9e3779b9) * props.length) % props.length];
  return {
    id,
    ox: Math.round((tileHash01(tx, ty, 0x1b873593) - 0.5) * 20),
    oy: Math.round((tileHash01(tx, ty, 0x85ebca6b) - 0.5) * 20),
  };
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
        const s = scatterFor(tx, ty, biome);
        if (s) scatter.push({ i, j, ...s });
      }
    }
  }
  return { overlays, water: Uint16Array.from(waterPacked), scatter };
}

/** The world height in px (props y-sort by absolute y, normalized into a
 *  depth band that stays below the authored stamps at depth 0). */
const WORLD_H_PX = 170 * PX_PER_DEG_LAT;

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
  private waterPhase = 0;
  private lastWaterTick = 0;
  // Gate-observable state.
  fringeVisible = 0;
  scatterVisible = 0;
  fringeSkipped = 0;
  scatterSkipped = 0;
  fringeCreated = 0;
  scatterCreated = 0;
  waterCycles = 0;

  constructor(private readonly scene: Phaser.Scene) {}

  stats(): { fringeVisible: number; scatterVisible: number; fringePool: number; scatterPool: number; fringeSkipped: number; scatterSkipped: number; fringeCreated: number; scatterCreated: number; waterPhase: number; waterCycles: number } {
    return {
      fringeVisible: this.fringeVisible,
      scatterVisible: this.scatterVisible,
      fringePool: this.fringePool.length,
      scatterPool: this.scatterPool.length,
      fringeSkipped: this.fringeSkipped,
      scatterSkipped: this.scatterSkipped,
      fringeCreated: this.fringeCreated,
      scatterCreated: this.scatterCreated,
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
    this.fringeSkipped = 0;
    this.scatterSkipped = 0;
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
          img.setTexture(propTextureKey(sc.id));
          img.setPosition(px, py);
          // y-sorted within the props' own band [-2.5, -0.6] — under stamps.
          img.setDepth(-2.5 + Math.min(1, Math.max(0, py / WORLD_H_PX)) * 1.9);
          img.setVisible(true);
        }
      }
    }
    for (let k = fUsed; k < this.fringePool.length; k++) this.fringePool[k].setVisible(false);
    for (let k = sUsed; k < this.scatterPool.length; k++) this.scatterPool[k].setVisible(false);
    this.fringeVisible = fUsed;
    this.scatterVisible = sUsed;
  }

  destroy(): void {
    for (const i of this.fringePool) i.destroy();
    for (const i of this.scatterPool) i.destroy();
    this.fringePool.length = 0;
    this.scatterPool.length = 0;
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

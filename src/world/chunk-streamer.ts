import Phaser from 'phaser';
import { TILE_PX } from './world-scale';
import {
  CHUNK_PX,
  CHUNK_RECORD_BYTES,
  CHUNK_TILES,
  FLAG_WALKABLE,
  TILE_RECORD_BYTES,
  type TerrainSource,
} from './terrain-schema';
import { PLACEHOLDER_ATLAS_KEY, VARIANTS_PER_BIOME } from './terrain-placeholder';
import type { GameMap } from '../map/GameMap';

/** Load ring radius: 5×5 chunks around the player, +1 in the velocity heading. */
export const LOAD_RING_RADIUS = 2;
/** Chunks inside this Chebyshev radius are never evicted. */
export const KEEP_RADIUS = 4;
/** LRU cache cap (bytes + layer released on eviction). 9×9 keep ring = 81 < 96. */
export const CHUNK_CACHE_MAX = 96;
/** Max on-screen tiles the zoom-out clamp must respect (see outFloor below). */
export const V2_MAX_VISIBLE_TILES = 12000;
/** The loaded ring's span in world px — the viewport must always fit inside. */
export const RING_SPAN_PX = (2 * LOAD_RING_RADIUS + 1) * CHUNK_PX;

/** Streamer layers sit above the planet raster (−5), below stamped maps (0). */
const LAYER_DEPTH = -3;
/** Direct-synthesis budget: at most one chunk fill per frame (~2 ms). */
const DIRECT_FILLS_PER_FRAME = 1;
/** Worker jobs allowed in flight at once. */
const WORKER_JOBS_MAX = 4;

interface ChunkEntry {
  cx: number;
  cy: number;
  bytes: Uint8Array | null; // null while pending
  map?: Phaser.Tilemaps.Tilemap;
  layer?: Phaser.Tilemaps.TilemapLayerBase;
  lastTouch: number;
  renderless: boolean; // dev-simulation chunks skip layer construction
}

/**
 * CHUNK STREAMER (WORLD SCALE V2 only — v1 never constructs this). Streams
 * 64×64-tile terrain chunks around the player from a pure TerrainSource:
 * synthesis runs in a Web Worker (ArrayBuffer transfer back), with a direct
 * main-thread path as fallback and as the determinism reference. The
 * compositor then lets authored zone/city stamps WIN over procedural terrain:
 * stamped tiles are punched out of the streamer layer (the authored map is
 * the sole visual + collision truth there), and composed walkability reads
 * stamps first. Terrain is never persisted — always re-derived. Nothing here
 * allocates or iterates by world extents: state is strictly the ≤96 cached
 * chunks.
 */
export class ChunkStreamer {
  private readonly scene: Phaser.Scene;
  private readonly originPx: { x: number; y: number };
  private readonly source: TerrainSource;
  private readonly stamps: { map: GameMap; x: number; y: number; w: number; h: number }[];
  private readonly chunks = new Map<string, ChunkEntry>();
  private worker?: Worker;
  private workerJobs = 0;
  private readonly workerWanted = new Map<string, { cx: number; cy: number }>();
  private readonly directQueue: { cx: number; cy: number }[] = [];
  private touchClock = 0;
  // Gate-observable counters.
  chunksLoaded = 0;
  chunksEvicted = 0;
  workerUsed = false;

  constructor(scene: Phaser.Scene, opts: { originPx: { x: number; y: number }; source: TerrainSource; stamps: GameMap[] }) {
    this.scene = scene;
    this.originPx = { ...opts.originPx };
    this.source = opts.source;
    this.stamps = opts.stamps.map((m) => ({ map: m, x: m.bounds.x, y: m.bounds.y, w: m.bounds.width, h: m.bounds.height }));
    try {
      this.worker = new Worker(new URL('./terrain-worker.ts', import.meta.url), { type: 'module' });
      this.worker.onmessage = (e: MessageEvent<{ cx: number; cy: number; buffer: ArrayBuffer }>) => {
        this.workerJobs = Math.max(0, this.workerJobs - 1);
        this.workerUsed = true;
        const { cx, cy, buffer } = e.data;
        this.workerWanted.delete(key(cx, cy));
        this.finishChunk(cx, cy, new Uint8Array(buffer), false);
      };
      this.worker.onerror = () => {
        // Genuine worker failure → fall back to time-sliced direct synthesis.
        for (const j of this.workerWanted.values()) this.directQueue.push(j);
        this.workerWanted.clear();
        this.worker?.terminate();
        this.worker = undefined;
      };
    } catch {
      this.worker = undefined; // direct path carries the session
    }
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  /** Per-frame: ensure the ring around the player, drain budgets, evict. */
  update(playerX: number, playerY: number, velX: number, velY: number): void {
    const pcx = Math.floor((playerX - this.originPx.x) / CHUNK_PX);
    const pcy = Math.floor((playerY - this.originPx.y) / CHUNK_PX);
    for (let dy = -LOAD_RING_RADIUS; dy <= LOAD_RING_RADIUS; dy++) {
      for (let dx = -LOAD_RING_RADIUS; dx <= LOAD_RING_RADIUS; dx++) {
        this.want(pcx + dx, pcy + dy);
      }
    }
    // One extra chunk in the velocity heading (the direction we will need next).
    if (velX !== 0 || velY !== 0) {
      const hx = Math.abs(velX) > Math.abs(velY) * 0.4 ? Math.sign(velX) : 0;
      const hy = Math.abs(velY) > Math.abs(velX) * 0.4 ? Math.sign(velY) : 0;
      this.want(pcx + hx * (LOAD_RING_RADIUS + 1), pcy + hy * (LOAD_RING_RADIUS + 1));
    }
    // Drain the direct queue within its per-frame budget (worker path drains itself).
    for (let n = 0; n < DIRECT_FILLS_PER_FRAME && this.directQueue.length > 0; n++) {
      const j = this.directQueue.shift()!;
      const entry = this.chunks.get(key(j.cx, j.cy));
      if (!entry || entry.bytes) continue;
      this.finishChunk(j.cx, j.cy, this.synthesizeDirect(j.cx, j.cy), false);
    }
    this.evict(pcx, pcy);
  }

  /** Composed walkability at a scene-px point: authored stamps win; then the
   *  streamed record's walkable flag; unloaded terrain never traps (walkable). */
  walkableAt(x: number, y: number): boolean {
    const stamp = this.stampAt(x, y);
    if (stamp) return !stamp.map.isBlockedAtWorld(x, y);
    const rec = this.recordAt(x, y);
    return rec === null ? true : (rec[3] & FLAG_WALKABLE) !== 0;
  }

  /** Composed tile query (gate-observable): what actually governs this point. */
  composedTileAt(x: number, y: number): { source: 'stamp' | 'synth' | 'unloaded'; walkable: boolean; biome?: number } {
    const stamp = this.stampAt(x, y);
    if (stamp) return { source: 'stamp', walkable: !stamp.map.isBlockedAtWorld(x, y) };
    const rec = this.recordAt(x, y);
    if (rec === null) return { source: 'unloaded', walkable: true };
    return { source: 'synth', walkable: (rec[3] & FLAG_WALKABLE) !== 0, biome: rec[0] };
  }

  /** The zoom-out floor (both constraints from the ACTUAL viewport): the view
   *  must fit inside the loaded ring AND show at most V2_MAX_VISIBLE_TILES. */
  static outFloor(viewW: number, viewH: number): number {
    return Math.max(Math.max(viewW, viewH) / RING_SPAN_PX, Math.sqrt((viewW * viewH) / (V2_MAX_VISIBLE_TILES * TILE_PX * TILE_PX)));
  }

  stats(): { loaded: number; evicted: number; cacheSize: number; buffersHeld: number; workerUsed: boolean } {
    let buffersHeld = 0;
    for (const c of this.chunks.values()) if (c.bytes) buffersHeld++;
    return { loaded: this.chunksLoaded, evicted: this.chunksEvicted, cacheSize: this.chunks.size, buffersHeld, workerUsed: this.workerUsed };
  }

  /** The determinism reference path: synchronous main-thread synthesis. */
  synthesizeDirect(cx: number, cy: number): Uint8Array {
    const bytes = new Uint8Array(CHUNK_RECORD_BYTES);
    this.source.fillChunk(cx, cy, bytes);
    return bytes;
  }

  /** The worker path, exposed for the gate's worker-vs-direct parity check. */
  synthesizeViaWorker(cx: number, cy: number): Promise<Uint8Array> {
    const w = this.worker;
    if (!w) return Promise.resolve(this.synthesizeDirect(cx, cy)); // fallback mode
    return new Promise((resolve, reject) => {
      const probe = new Worker(new URL('./terrain-worker.ts', import.meta.url), { type: 'module' });
      probe.onmessage = (e: MessageEvent<{ buffer: ArrayBuffer }>) => {
        probe.terminate();
        resolve(new Uint8Array(e.data.buffer));
      };
      probe.onerror = (err) => {
        probe.terminate();
        reject(err);
      };
      probe.postMessage({ cx, cy });
    });
  }

  /** Raw cached record bytes (gate fixtures write forced tiles through this). */
  chunkBytes(cx: number, cy: number): Uint8Array | null {
    return this.chunks.get(key(cx, cy))?.bytes ?? null;
  }

  /** DEV/gate fixture: force every CACHED tile in a scene-px rect to OCEAN
   *  (non-walkable) so walkability wiring is testable this pass (procedural
   *  terrain is all land until Pass 3). Returns how many tiles were forced. */
  devForceWater(x0: number, y0: number, x1: number, y1: number): number {
    let forced = 0;
    for (let y = y0; y <= y1; y += TILE_PX) {
      for (let x = x0; x <= x1; x += TILE_PX) {
        const lx = x - this.originPx.x;
        const ly = y - this.originPx.y;
        const cx = Math.floor(lx / CHUNK_PX);
        const cy = Math.floor(ly / CHUNK_PX);
        const bytes = this.chunks.get(key(cx, cy))?.bytes;
        if (!bytes) continue;
        const i = Math.floor((lx - cx * CHUNK_PX) / TILE_PX);
        const j = Math.floor((ly - cy * CHUNK_PX) / TILE_PX);
        const o = (j * CHUNK_TILES + i) * TILE_RECORD_BYTES;
        bytes[o] = 0; // Biome.OCEAN
        bytes[o + 3] &= ~FLAG_WALKABLE;
        forced++;
      }
    }
    return forced;
  }

  /** DEV/gate: run the REAL ensure+evict machinery over an eastward N-chunk
   *  traversal with synchronous renderless synthesis; returns cache behavior. */
  devSimulateTraversal(chunkCount: number): { maxCache: number; evicted: number; buffersHeld: number } {
    const evicted0 = this.chunksEvicted;
    let maxCache = this.chunks.size;
    const startCx = 6000;
    const cy = 4000;
    for (let step = 0; step < chunkCount; step++) {
      const cx = startCx + step;
      for (let dy = -LOAD_RING_RADIUS; dy <= LOAD_RING_RADIUS; dy++) {
        for (let dx = -LOAD_RING_RADIUS; dx <= LOAD_RING_RADIUS; dx++) {
          const k = key(cx + dx, cy + dy);
          if (!this.chunks.has(k)) {
            const entry: ChunkEntry = { cx: cx + dx, cy: cy + dy, bytes: null, lastTouch: ++this.touchClock, renderless: true };
            this.chunks.set(k, entry);
            entry.bytes = this.synthesizeDirect(cx + dx, cy + dy);
            this.chunksLoaded++;
          } else {
            this.chunks.get(k)!.lastTouch = ++this.touchClock;
          }
        }
      }
      this.evict(cx, cy);
      maxCache = Math.max(maxCache, this.chunks.size);
    }
    return { maxCache, evicted: this.chunksEvicted - evicted0, buffersHeld: this.stats().buffersHeld };
  }

  destroy(): void {
    this.worker?.terminate();
    this.worker = undefined;
    for (const c of this.chunks.values()) this.release(c);
    this.chunks.clear();
  }

  // ── internals ──────────────────────────────────────────────────────────────

  private want(cx: number, cy: number): void {
    const k = key(cx, cy);
    const existing = this.chunks.get(k);
    if (existing) {
      existing.lastTouch = ++this.touchClock;
      return;
    }
    this.chunks.set(k, { cx, cy, bytes: null, lastTouch: ++this.touchClock, renderless: false });
    if (this.worker && this.workerJobs < WORKER_JOBS_MAX) {
      this.workerJobs++;
      this.workerWanted.set(k, { cx, cy });
      this.worker.postMessage({ cx, cy });
    } else {
      this.directQueue.push({ cx, cy });
    }
  }

  private finishChunk(cx: number, cy: number, bytes: Uint8Array, renderless: boolean): void {
    const entry = this.chunks.get(key(cx, cy));
    if (!entry || entry.bytes) return; // evicted while in flight, or already done
    entry.bytes = bytes;
    this.chunksLoaded++;
    this.compositeStamps(entry);
    if (!renderless && !entry.renderless) this.buildLayer(entry);
  }

  /** COMPOSITOR: authored stamps overwrite their tiles — walkability comes
   *  from the authored map, and the streamer punches the tile out of its own
   *  layer (frame −1) so the authored layer is the sole visual there. */
  private compositeStamps(entry: ChunkEntry): void {
    const bytes = entry.bytes!;
    const chunkX = this.originPx.x + entry.cx * CHUNK_PX;
    const chunkY = this.originPx.y + entry.cy * CHUNK_PX;
    for (const s of this.stamps) {
      if (s.x >= chunkX + CHUNK_PX || s.x + s.w <= chunkX || s.y >= chunkY + CHUNK_PX || s.y + s.h <= chunkY) continue;
      const i0 = Math.max(0, Math.floor((s.x - chunkX) / TILE_PX));
      const i1 = Math.min(CHUNK_TILES - 1, Math.floor((s.x + s.w - 1 - chunkX) / TILE_PX));
      const j0 = Math.max(0, Math.floor((s.y - chunkY) / TILE_PX));
      const j1 = Math.min(CHUNK_TILES - 1, Math.floor((s.y + s.h - 1 - chunkY) / TILE_PX));
      for (let j = j0; j <= j1; j++) {
        for (let i = i0; i <= i1; i++) {
          const o = (j * CHUNK_TILES + i) * TILE_RECORD_BYTES;
          const wx = chunkX + i * TILE_PX + TILE_PX / 2;
          const wy = chunkY + j * TILE_PX + TILE_PX / 2;
          const walkable = !s.map.isBlockedAtWorld(wx, wy);
          bytes[o + 3] = walkable ? bytes[o + 3] | FLAG_WALKABLE : bytes[o + 3] & ~FLAG_WALKABLE;
          bytes[o + 3] |= 0x80; // internal: stamped marker (reserved bit, never persisted)
        }
      }
    }
  }

  private buildLayer(entry: ChunkEntry): void {
    const bytes = entry.bytes!;
    const data: number[][] = [];
    for (let j = 0; j < CHUNK_TILES; j++) {
      const row: number[] = [];
      for (let i = 0; i < CHUNK_TILES; i++) {
        const o = (j * CHUNK_TILES + i) * TILE_RECORD_BYTES;
        // Punched out under stamps; otherwise biome frame + speckle variant.
        row.push((bytes[o + 3] & 0x80) !== 0 ? -1 : bytes[o] * VARIANTS_PER_BIOME + (bytes[o + 2] & (VARIANTS_PER_BIOME - 1)));
      }
      data.push(row);
    }
    const map = this.scene.make.tilemap({ data, tileWidth: TILE_PX, tileHeight: TILE_PX });
    const tileset = map.addTilesetImage('ph', PLACEHOLDER_ATLAS_KEY, TILE_PX, TILE_PX);
    if (!tileset) throw new Error('ChunkStreamer: placeholder tileset failed');
    const layer = map.createLayer(0, tileset, this.originPx.x + entry.cx * CHUNK_PX, this.originPx.y + entry.cy * CHUNK_PX, false);
    if (!layer) throw new Error('ChunkStreamer: layer failed');
    layer.setDepth(LAYER_DEPTH);
    // Fake hillshade: subtle per-tile brightness from the elevation band
    // (set ONCE at build — no per-frame cost).
    for (let j = 0; j < CHUNK_TILES; j++) {
      for (let i = 0; i < CHUNK_TILES; i++) {
        const t = layer.getTileAt(i, j);
        if (!t) continue;
        const elev = bytes[(j * CHUNK_TILES + i) * TILE_RECORD_BYTES + 1];
        const b = Math.round(255 * (0.86 + (elev / 255) * 0.14));
        t.tint = (b << 16) | (b << 8) | b;
      }
    }
    entry.map = map;
    entry.layer = layer;
  }

  private evict(pcx: number, pcy: number): void {
    if (this.chunks.size <= CHUNK_CACHE_MAX) return;
    const candidates: ChunkEntry[] = [];
    for (const c of this.chunks.values()) {
      if (Math.max(Math.abs(c.cx - pcx), Math.abs(c.cy - pcy)) > KEEP_RADIUS) candidates.push(c);
    }
    candidates.sort((a, b) => a.lastTouch - b.lastTouch); // LRU first
    for (const c of candidates) {
      if (this.chunks.size <= CHUNK_CACHE_MAX) break;
      this.release(c);
      this.chunks.delete(key(c.cx, c.cy));
      this.chunksEvicted++;
    }
  }

  private release(c: ChunkEntry): void {
    c.layer?.destroy();
    c.map?.destroy();
    c.layer = undefined;
    c.map = undefined;
    c.bytes = null; // buffer released
  }

  private stampAt(x: number, y: number): { map: GameMap } | null {
    for (const s of this.stamps) {
      if (x >= s.x && x < s.x + s.w && y >= s.y && y < s.y + s.h) return s;
    }
    return null;
  }

  private recordAt(x: number, y: number): [number, number, number, number] | null {
    const lx = x - this.originPx.x;
    const ly = y - this.originPx.y;
    const cx = Math.floor(lx / CHUNK_PX);
    const cy = Math.floor(ly / CHUNK_PX);
    const entry = this.chunks.get(key(cx, cy));
    if (!entry?.bytes) return null;
    const i = Math.floor((lx - cx * CHUNK_PX) / TILE_PX);
    const j = Math.floor((ly - cy * CHUNK_PX) / TILE_PX);
    const o = (j * CHUNK_TILES + i) * TILE_RECORD_BYTES;
    const b = entry.bytes;
    return [b[o], b[o + 1], b[o + 2], b[o + 3]];
  }
}

function key(cx: number, cy: number): string {
  return `${cx},${cy}`;
}

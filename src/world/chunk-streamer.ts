import Phaser from 'phaser';
import { PX_PER_DEG_LAT, PX_PER_DEG_LNG, TILE_PX } from './world-scale';
import {
  CHUNK_PX,
  CHUNK_RECORD_BYTES,
  CHUNK_TILES,
  FLAG_WALKABLE,
  TILE_RECORD_BYTES,
  type TerrainSource,
} from './terrain-schema';
import { ATLAS_STRIDE, PLACEHOLDER_ATLAS_KEY, VARIANTS_PER_BIOME, ensurePropPlaceholders } from './terrain-placeholder';
import { TerrainVisualsRenderer, computeChunkVisuals, type ChunkVisuals } from './terrain-visuals';
import { tileRecord as procTileRecord } from './terrain-procedural';
import {
  createEarthSource,
  decodePlanetPack,
  decodeRegionPack,
  earthSampleAt,
  earthTileRecord,
  loadPack,
  type PlanetGrids,
  type RegionGrids,
} from './terrain-earth';
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
/** Worker jobs allowed in flight at once (backlog drains as jobs finish). */
const WORKER_JOBS_MAX = 4;
/** Region packs prefetch when the load ring is this many chunks from a bbox. */
const REGION_PREFETCH_MARGIN_CHUNKS = 2;

interface ChunkEntry {
  cx: number;
  cy: number;
  bytes: Uint8Array | null; // null while first fill is pending
  version: number; // sourceVersion the bytes were computed under
  requestedVersion: number; // latest version a fill has been requested for
  map?: Phaser.Tilemaps.Tilemap;
  layer?: Phaser.Tilemaps.TilemapLayerBase;
  lastTouch: number;
  renderless: boolean; // dev-simulation chunks skip layer construction
  visuals?: ChunkVisuals; // Pass 5: fringe/water/scatter data (built with the layer)
}

/**
 * CHUNK STREAMER (WORLD SCALE V2 only — v1 never constructs this). Streams
 * 64×64-tile terrain chunks around the player from a pure TerrainSource:
 * synthesis runs in a Web Worker (ArrayBuffer transfer back), with a direct
 * main-thread path as fallback and as the determinism reference.
 *
 * PASS 3: boots on the procedural source, then swaps to the EARTH source when
 * the baked packs decode (loadEarthPacks — IndexedDB-cached; ?terrain=proc
 * pins the procedural dev fallback). Region packs stream lazily as the load
 * ring nears their manifest bbox; every source improvement bumps
 * sourceVersion and REPAINTS affected cached chunks exactly once (fill
 * responses echo their version, so stale fills are re-requested, never
 * applied). The compositor is untouched: authored zone/city stamps always
 * win. Terrain is never persisted. Nothing allocates or iterates by world
 * extents: state is strictly the ≤96 cached chunks + the decoded pack grids.
 */
export class ChunkStreamer {
  private readonly scene: Phaser.Scene;
  private readonly originPx: { x: number; y: number };
  private source: TerrainSource;
  private readonly stamps: { map: GameMap; x: number; y: number; w: number; h: number }[];
  private readonly chunks = new Map<string, ChunkEntry>();
  private worker?: Worker;
  private workerJobs = 0;
  private readonly workerBacklog: { cx: number; cy: number }[] = [];
  private readonly directQueue: { cx: number; cy: number }[] = [];
  private touchClock = 0;
  // Earth pack state.
  private planetGrids?: PlanetGrids;
  private readonly regionsRef: RegionGrids[] = [];
  private regionManifest?: {
    regions: {
      id: string;
      bbox: { latMin: number; latMax: number; lngMin: number; lngMax: number };
      file: string;
      version: number;
      /** Pass 6D: the baked regional map-tier image, when the bake emitted one. */
      map?: { file: string; w: number; h: number; bytes: number; sha256: string };
    }[];
  };
  private readonly regionFetching = new Set<string>();
  // Gate-observable state.
  chunksLoaded = 0;
  chunksEvicted = 0;
  workerUsed = false;
  sourceVersion = 1;
  activeSourceLabel: 'proc' | 'earth' = 'proc';
  packOrigin: Record<string, 'idb' | 'network'> = {};
  /** Pass 5: the pooled fringe/scatter renderer + water anim cycle. */
  readonly visualsRenderer: TerrainVisualsRenderer;
  /** Pass 6A: the baked world-map image bytes (IDB-cached like the packs;
   *  map mode decodes them into a texture — null until loaded/if missing). */
  worldmapBuf: ArrayBuffer | null = null;

  constructor(scene: Phaser.Scene, opts: { originPx: { x: number; y: number }; source: TerrainSource; stamps: GameMap[] }) {
    this.scene = scene;
    this.originPx = { ...opts.originPx };
    this.source = opts.source;
    this.stamps = opts.stamps.map((m) => ({ map: m, x: m.bounds.x, y: m.bounds.y, w: m.bounds.width, h: m.bounds.height }));
    ensurePropPlaceholders(scene); // scatter silhouettes (art drops replace by key)
    this.visualsRenderer = new TerrainVisualsRenderer(scene);
    try {
      this.worker = new Worker(new URL('./terrain-worker.ts', import.meta.url), { type: 'module' });
      this.worker.onmessage = (e: MessageEvent<{ cx: number; cy: number; version: number; buffer: ArrayBuffer }>) => {
        this.workerJobs = Math.max(0, this.workerJobs - 1);
        this.workerUsed = true;
        this.pumpWorker();
        const { cx, cy, version, buffer } = e.data;
        this.applyFill(cx, cy, new Uint8Array(buffer), version);
      };
      this.worker.onerror = () => {
        // Genuine worker failure → fall back to time-sliced direct synthesis.
        this.directQueue.push(...this.workerBacklog);
        this.workerBacklog.length = 0;
        this.worker?.terminate();
        this.worker = undefined;
      };
    } catch {
      this.worker = undefined; // direct path carries the session
    }
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  /** PASS 3 boot: fetch + decode the earth packs (IndexedDB-cached, keyed by
   *  pack version) and swap the live source. Fire-and-forget: the procedural
   *  source carries the session until (or unless) the packs arrive. */
  async loadEarthPacks(): Promise<void> {
    try {
      const planet = await loadPack('/world/planet.bin');
      this.packOrigin.planet = planet.from;
      const manifest = await loadPack('/world/regions.json');
      this.packOrigin.regions = manifest.from;
      this.regionManifest = JSON.parse(new TextDecoder().decode(manifest.buf));
      this.setEarthGrids(decodePlanetPack(planet.buf));
    } catch (e) {
      console.warn('ToH: earth packs unavailable — staying on procedural terrain:', e);
    }
    // Pass 6A: the world-map image, cached like the packs — its failure never
    // touches the terrain path (map mode just stays unavailable).
    try {
      const wm = await loadPack('/world/worldmap.png');
      this.packOrigin.worldmap = wm.from;
      this.worldmapBuf = wm.buf;
    } catch (e) {
      console.warn('ToH: worldmap unavailable — map mode disabled:', e);
    }
  }

  /** Swap the live source to earth (main thread + worker) and repaint. */
  setEarthGrids(planet: PlanetGrids): void {
    this.planetGrids = planet;
    this.source = createEarthSource(planet, this.regionsRef);
    this.worker?.postMessage({ type: 'use-earth', planet });
    this.activeSourceLabel = 'earth';
    this.sourceVersion++;
    for (const entry of this.chunks.values()) this.request(entry); // repaint everything cached
  }

  /** A region pack decoded: refine — repaint every cached chunk its bbox touches. */
  addRegion(region: RegionGrids): void {
    this.regionsRef.push(region);
    this.worker?.postMessage({ type: 'region', region });
    this.sourceVersion++;
    for (const entry of this.chunks.values()) {
      if (this.chunkIntersectsBbox(entry.cx, entry.cy, region)) this.request(entry);
    }
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
    // Lazy region packs: fetch when the ring nears a manifest bbox.
    this.maybeFetchRegions(pcx, pcy);
    // Drain the direct queue within its per-frame budget (worker drains itself).
    for (let n = 0; n < DIRECT_FILLS_PER_FRAME && this.directQueue.length > 0; n++) {
      const j = this.directQueue.shift()!;
      const entry = this.chunks.get(key(j.cx, j.cy));
      if (!entry || (entry.bytes && entry.version === this.sourceVersion)) continue;
      this.applyFill(j.cx, j.cy, this.synthesizeDirect(j.cx, j.cy), this.sourceVersion);
    }
    this.evict(pcx, pcy);
    // Pass 5: assign the fringe/scatter pools + water anim from cached data.
    const withVisuals: { cx: number; cy: number; visuals: ChunkVisuals; layer?: Phaser.Tilemaps.TilemapLayerBase }[] = [];
    for (const c of this.chunks.values()) if (c.visuals) withVisuals.push(c as (typeof withVisuals)[number]);
    this.visualsRenderer.update(withVisuals, this.originPx, this.scene.time.now);
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

  stats(): { loaded: number; evicted: number; cacheSize: number; buffersHeld: number; workerUsed: boolean; source: string; version: number; regions: number; visuals: ReturnType<TerrainVisualsRenderer['stats']> } {
    let buffersHeld = 0;
    for (const c of this.chunks.values()) if (c.bytes) buffersHeld++;
    return {
      loaded: this.chunksLoaded,
      evicted: this.chunksEvicted,
      cacheSize: this.chunks.size,
      buffersHeld,
      workerUsed: this.workerUsed,
      source: this.activeSourceLabel,
      version: this.sourceVersion,
      regions: this.regionsRef.length,
      visuals: this.visualsRenderer.stats(),
    };
  }

  /** The determinism reference path: synchronous main-thread synthesis. */
  synthesizeDirect(cx: number, cy: number): Uint8Array {
    const bytes = new Uint8Array(CHUNK_RECORD_BYTES);
    this.source.fillChunk(cx, cy, bytes);
    return bytes;
  }

  /** The worker path, exposed for the gate's worker-vs-direct parity check —
   *  a fresh probe worker receives the SAME grids, so parity covers earth. */
  synthesizeViaWorker(cx: number, cy: number): Promise<Uint8Array> {
    if (!this.worker) return Promise.resolve(this.synthesizeDirect(cx, cy)); // fallback mode
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
      if (this.planetGrids && this.activeSourceLabel === 'earth') {
        probe.postMessage({ type: 'use-earth', planet: this.planetGrids });
        for (const r of this.regionsRef) probe.postMessage({ type: 'region', region: r });
      }
      probe.postMessage({ type: 'fill', cx, cy, version: this.sourceVersion });
    });
  }

  /** Raw cached record bytes (gate fixtures write forced tiles through this). */
  chunkBytes(cx: number, cy: number): Uint8Array | null {
    return this.chunks.get(key(cx, cy))?.bytes ?? null;
  }

  /** Cached bytes' source version for a chunk (gate: repaint convergence). */
  chunkVersion(cx: number, cy: number): number | null {
    return this.chunks.get(key(cx, cy))?.version ?? null;
  }

  /** Gate probe: the composed earth record at a lat/lng (null before packs). */
  earthSample(lat: number, lng: number): [number, number, number, number] | null {
    return this.planetGrids ? earthSampleAt(lat, lng, this.planetGrids, this.regionsRef) : null;
  }

  /** Gate probe: the pure per-tile reference (seam checks recompute borders). */
  referenceRecord(tx: number, ty: number): [number, number, number, number] | null {
    return this.planetGrids ? earthTileRecord(tx, ty, this.planetGrids, this.regionsRef) : null;
  }

  /** Gate probe: a planet-only fill (regions ignored) for refinement diffs. */
  fillPlanetOnly(cx: number, cy: number): Uint8Array | null {
    if (!this.planetGrids) return null;
    const src = createEarthSource(this.planetGrids, []);
    const bytes = new Uint8Array(CHUNK_RECORD_BYTES);
    src.fillChunk(cx, cy, bytes);
    return bytes;
  }

  /** DEV/gate fixture: force every CACHED tile in a scene-px rect to OCEAN
   *  (non-walkable) so walkability wiring is testable anywhere. Returns how
   *  many tiles were forced. */
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
            const entry: ChunkEntry = {
              cx: cx + dx,
              cy: cy + dy,
              bytes: null,
              version: 0,
              requestedVersion: this.sourceVersion,
              lastTouch: ++this.touchClock,
              renderless: true,
            };
            this.chunks.set(k, entry);
            entry.bytes = this.synthesizeDirect(cx + dx, cy + dy);
            entry.version = this.sourceVersion;
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

  /** Pass 5: rebuild every cached chunk's layer + visual data (called after an
   *  art drop swaps the atlas textures — same frames, new pixels). */
  repaintAllLayers(): void {
    for (const entry of this.chunks.values()) {
      if (entry.bytes && !entry.renderless) this.buildLayer(entry);
    }
  }

  /** Gate probe: a cached chunk's precomputed visual data (fringe/scatter). */
  chunkVisuals(cx: number, cy: number): ChunkVisuals | null {
    return this.chunks.get(key(cx, cy))?.visuals ?? null;
  }

  /** Pass 6D: regions whose manifest entries carry a baked map-tier image
   *  (map mode's regional tier — empty until the manifest decodes). */
  regionMapEntries(): { id: string; bbox: { latMin: number; latMax: number; lngMin: number; lngMax: number }; file: string; w: number; h: number }[] {
    return (this.regionManifest?.regions ?? [])
      .filter((r) => r.map)
      .map((r) => ({ id: r.id, bbox: r.bbox, file: `/world/${r.map!.file}`, w: r.map!.w, h: r.map!.h }));
  }

  destroy(): void {
    this.visualsRenderer.destroy();
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
      if (existing.requestedVersion < this.sourceVersion) this.request(existing);
      return;
    }
    const entry: ChunkEntry = { cx, cy, bytes: null, version: 0, requestedVersion: 0, lastTouch: ++this.touchClock, renderless: false };
    this.chunks.set(k, entry);
    this.request(entry);
  }

  private request(entry: ChunkEntry): void {
    entry.requestedVersion = this.sourceVersion;
    if (this.worker) {
      this.workerBacklog.push({ cx: entry.cx, cy: entry.cy });
      this.pumpWorker();
    } else {
      this.directQueue.push({ cx: entry.cx, cy: entry.cy });
    }
  }

  private pumpWorker(): void {
    while (this.worker && this.workerJobs < WORKER_JOBS_MAX && this.workerBacklog.length > 0) {
      const j = this.workerBacklog.shift()!;
      this.workerJobs++;
      this.worker.postMessage({ type: 'fill', cx: j.cx, cy: j.cy, version: this.sourceVersion });
    }
  }

  private applyFill(cx: number, cy: number, bytes: Uint8Array, version: number): void {
    const entry = this.chunks.get(key(cx, cy));
    if (!entry) return; // evicted while in flight
    if (version !== this.sourceVersion) {
      // Stale fill (a repaint bumped the source mid-flight): keep whatever is
      // showing and request a fresh fill exactly once.
      if (entry.requestedVersion < this.sourceVersion) this.request(entry);
      return;
    }
    if (entry.bytes && entry.version === version) return; // duplicate
    entry.bytes = bytes;
    entry.version = version;
    this.chunksLoaded++;
    this.compositeStamps(entry);
    if (!entry.renderless) this.buildLayer(entry);
  }

  private maybeFetchRegions(pcx: number, pcy: number): void {
    if (!this.regionManifest || !this.planetGrids) return;
    const m = REGION_PREFETCH_MARGIN_CHUNKS;
    const ring = {
      x0: (pcx - LOAD_RING_RADIUS - m) * CHUNK_PX,
      x1: (pcx + LOAD_RING_RADIUS + 1 + m) * CHUNK_PX,
      y0: (pcy - LOAD_RING_RADIUS - m) * CHUNK_PX,
      y1: (pcy + LOAD_RING_RADIUS + 1 + m) * CHUNK_PX,
    };
    const ringLatMax = 85 - ring.y0 / PX_PER_DEG_LAT;
    const ringLatMin = 85 - ring.y1 / PX_PER_DEG_LAT;
    const ringLngMin = -180 + ring.x0 / PX_PER_DEG_LNG;
    const ringLngMax = -180 + ring.x1 / PX_PER_DEG_LNG;
    for (const r of this.regionManifest.regions) {
      if (this.regionFetching.has(r.id) || this.regionsRef.some((g) => g.id === r.id)) continue;
      const b = r.bbox;
      if (b.latMin > ringLatMax || b.latMax < ringLatMin || b.lngMin > ringLngMax || b.lngMax < ringLngMin) continue;
      this.regionFetching.add(r.id);
      loadPack(`/world/${r.file}`)
        .then((pack) => {
          this.packOrigin[r.id] = pack.from;
          this.addRegion(decodeRegionPack(r.id, pack.buf));
        })
        .catch((e) => console.warn(`ToH: region pack ${r.id} failed:`, e));
    }
  }

  private chunkIntersectsBbox(cx: number, cy: number, b: { latMin: number; latMax: number; lngMin: number; lngMax: number }): boolean {
    const latMax = 85 - (cy * CHUNK_PX) / PX_PER_DEG_LAT;
    const latMin = 85 - ((cy + 1) * CHUNK_PX) / PX_PER_DEG_LAT;
    const lngMin = -180 + (cx * CHUNK_PX) / PX_PER_DEG_LNG;
    const lngMax = -180 + ((cx + 1) * CHUNK_PX) / PX_PER_DEG_LNG;
    return !(b.latMin > latMax || b.latMax < latMin || b.lngMin > lngMax || b.lngMax < lngMin);
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
    // A repaint replaces the whole layer (simplest correct path — happens at
    // most once per source upgrade per chunk).
    entry.layer?.destroy();
    entry.map?.destroy();
    entry.layer = undefined;
    entry.map = undefined;
    const bytes = entry.bytes!;
    const data: number[][] = [];
    for (let j = 0; j < CHUNK_TILES; j++) {
      const row: number[] = [];
      for (let i = 0; i < CHUNK_TILES; i++) {
        const o = (j * CHUNK_TILES + i) * TILE_RECORD_BYTES;
        // Punched out under stamps; otherwise biome frame + speckle variant
        // (Pass 5 atlas: ATLAS_STRIDE cells per biome — slots 0-3 variants).
        row.push((bytes[o + 3] & 0x80) !== 0 ? -1 : bytes[o] * ATLAS_STRIDE + (bytes[o + 2] & (VARIANTS_PER_BIOME - 1)));
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
    // Pass 5: fringe/water/scatter data — pure function of the records (the
    // border resolver keeps chunk seams deterministic at the current version).
    entry.visuals = computeChunkVisuals(bytes, entry.cx, entry.cy, (tx, ty) => this.tileBiomeAt(tx, ty));
  }

  /** Neighbor-biome resolver for visual autotiling: a cached chunk at the
   *  CURRENT source version wins; anything else recomputes through the pure
   *  per-tile reference — byte-identical to what that chunk will hold. */
  private tileBiomeAt(tx: number, ty: number): number {
    const cx = Math.floor(tx / CHUNK_TILES);
    const cy = Math.floor(ty / CHUNK_TILES);
    const entry = this.chunks.get(key(cx, cy));
    if (entry?.bytes && entry.version === this.sourceVersion) {
      const i = tx - cx * CHUNK_TILES;
      const j = ty - cy * CHUNK_TILES;
      return entry.bytes[(j * CHUNK_TILES + i) * TILE_RECORD_BYTES];
    }
    if (this.activeSourceLabel === 'earth' && this.planetGrids) return earthTileRecord(tx, ty, this.planetGrids, this.regionsRef)[0];
    return procTileRecord(tx, ty)[0];
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
    c.visuals = undefined;
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

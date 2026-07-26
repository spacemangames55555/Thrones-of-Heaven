import {
  Biome,
  CHUNK_TILES,
  FLAG_SCATTER,
  FLAG_WALKABLE,
  PLAYABLE_LAT_LIMIT,
  TILE_RECORD_BYTES,
  WORLD_SEED,
  latOfTileRow,
  lngOfTileCol,
  tileOfLatLng,
  type TerrainSource,
} from './terrain-schema';
import { fbm3, hash01 } from './terrain-procedural';
import { PX_PER_DEG_LAT, PX_PER_DEG_LNG, TILE_PX } from './world-scale';

/**
 * EARTH-BACKED TERRAIN SOURCE (WORLD SCALE V2, Pass 3): the same TerrainSource
 * contract as Pass 2, fed by the baked real-Earth packs (public/world/*).
 * Continents, coastlines, lakes, rivers and elevation are REAL (Natural Earth
 * + AWS terrarium; see scripts/bake-earth); biomes in the packs are DERIVED
 * (labeled in bake-manifest.json).
 *
 * Everything here is a PURE function of (global tile coord, the decoded
 * grids): no per-chunk state, worker-safe, seam-pure — the same tile yields
 * identical bytes no matter which chunk, thread, or session computes it.
 *
 * Composition per tile:
 *  • sample the covering REGION grid (320 m) when inside a region bbox, else
 *    the PLANET grid (5.12 km biome / 10.2 km elevation);
 *  • within REGION_BLEND_MARGIN_TILES of a region edge, lerp region↔planet
 *    (elevation) and hash-select (biome) by distance — coordinate-pure;
 *  • land/water from BILINEAR landness (sub-sample coastlines), biome picked
 *    at hash-jittered grid coords so 5 km / 320 m squares never show;
 *  • detail-noise octaves add local relief scaled by the real base elevation;
 *  • BEACH on land within the coast landness band (jittered, never SNOW/ROCK);
 *  • rivers ship rasterized as FRESHWATER in the region grids (bake-time, by
 *    width class from the committed pnw-rivers.json polylines);
 *  • ROCK/SNOW elevation push uses the real bands (Pass 2 thresholds).
 */

// ── Named composition constants ──────────────────────────────────────────────
/** Region↔planet blend margin inside a region bbox edge, in tiles. */
export const REGION_BLEND_MARGIN_TILES = 64;
/** Landness (1 − bilinear water fraction) below this = water. */
const LANDNESS_WATER = 0.5;
/** Land within this landness band of the coast reads BEACH (~2 tiles, jittered). */
const BEACH_LANDNESS_BAND = 0.06;
/** Biome sampling jitter, in grid-sample units (kills visible grid squares). */
const BIOME_JITTER = 0.75;
/** Local relief detail noise: lattice scale (tiles) and amplitude (bands). */
const DETAIL_SCALE = 1 / 48;
const DETAIL_BAND_AMP = 14;
/** ROCK/SNOW elevation push over REAL bands (Pass 2 mechanism, re-thresholded
 *  for real meters — the placeholder values were tuned for 0–255 noise):
 *  ROCK above ~3,500 m, SNOW above ~4,700 m. */
export const EARTH_ROCK_BAND = 100;
export const EARTH_SNOW_BAND = 130;
/** Pack format version — the IndexedDB cache key includes it. */
export const PACK_VERSION = 1;

// ── Decoded pack shapes (plain arrays/numbers — structured-clone to worker) ──
export interface PlanetGrids {
  version: number;
  pbW: number;
  pbH: number;
  pbStep: number; // tiles per biome sample
  peW: number;
  peH: number;
  peStep: number; // tiles per elevation sample
  biome: Uint8Array;
  elev: Uint8Array;
}
export interface RegionGrids {
  id: string;
  version: number;
  w: number;
  h: number;
  stepTiles: number;
  latMin: number;
  latMax: number;
  lngMin: number;
  lngMax: number;
  biome: Uint8Array;
  elev: Uint8Array;
}

export function decodePlanetPack(buf: ArrayBuffer): PlanetGrids {
  const dv = new DataView(buf);
  if (String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3)) !== 'TOHW') throw new Error('planet.bin: bad magic');
  const version = dv.getUint32(4, true);
  const pbW = dv.getUint32(8, true);
  const pbH = dv.getUint32(12, true);
  const pbStep = dv.getUint32(16, true);
  const peW = dv.getUint32(20, true);
  const peH = dv.getUint32(24, true);
  const peStep = dv.getUint32(28, true);
  const biome = new Uint8Array(buf, 40, pbW * pbH);
  const elev = new Uint8Array(buf, 40 + pbW * pbH, peW * peH);
  return { version, pbW, pbH, pbStep, peW, peH, peStep, biome: new Uint8Array(biome), elev: new Uint8Array(elev) };
}

export function decodeRegionPack(id: string, buf: ArrayBuffer): RegionGrids {
  const dv = new DataView(buf);
  if (String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3)) !== 'TOHR') throw new Error(`${id}.bin: bad magic`);
  const version = dv.getUint32(4, true);
  const w = dv.getUint32(8, true);
  const h = dv.getUint32(12, true);
  const stepTiles = dv.getUint32(16, true);
  const latMin = dv.getFloat64(20, true);
  const latMax = dv.getFloat64(28, true);
  const lngMin = dv.getFloat64(36, true);
  const lngMax = dv.getFloat64(44, true);
  const biome = new Uint8Array(w * h);
  const elev = new Uint8Array(w * h);
  const inter = new Uint8Array(buf, 52, w * h * 2);
  for (let o = 0; o < w * h; o++) {
    biome[o] = inter[o * 2];
    elev[o] = inter[o * 2 + 1];
  }
  return { id, version, w, h, stepTiles, latMin, latMax, lngMin, lngMax, biome, elev };
}

// ── Grid sampling ────────────────────────────────────────────────────────────
const isWater = (b: number) => b === Biome.OCEAN || b === Biome.FRESHWATER;

interface Sample {
  biome: number; // hash-jitter-picked biome (categorical)
  elev: number; // bilinear elevation band
  landness: number; // 1 − bilinear water fraction
  waterKind: number; // OCEAN or FRESHWATER — the heaviest water corner
}

/** Bilinear + jittered-categorical sample of a biome/elev grid pair. gx/gy are
 *  continuous grid coords (sample centers at integers); jx/jy is the biome
 *  jitter in sample units. */
function sampleGrids(
  biomeG: Uint8Array,
  elevG: Uint8Array,
  W: number,
  H: number,
  elevW: number,
  elevH: number,
  gx: number,
  gy: number,
  ex: number,
  ey: number,
  jx: number,
  jy: number,
): Sample {
  const cl = (v: number, hi: number) => Math.min(hi, Math.max(0, v));
  const x0 = cl(Math.floor(gx), W - 1);
  const y0 = cl(Math.floor(gy), H - 1);
  const x1 = cl(x0 + 1, W - 1);
  const y1 = cl(y0 + 1, H - 1);
  const fx = cl(gx - x0, 1);
  const fy = cl(gy - y0, 1);
  const c00 = biomeG[y0 * W + x0];
  const c10 = biomeG[y0 * W + x1];
  const c01 = biomeG[y1 * W + x0];
  const c11 = biomeG[y1 * W + x1];
  const w00 = (1 - fx) * (1 - fy);
  const w10 = fx * (1 - fy);
  const w01 = (1 - fx) * fy;
  const w11 = fx * fy;
  const waterFrac = (isWater(c00) ? w00 : 0) + (isWater(c10) ? w10 : 0) + (isWater(c01) ? w01 : 0) + (isWater(c11) ? w11 : 0);
  let waterKind: number = Biome.OCEAN;
  let best = -1;
  for (const [c, w] of [
    [c00, w00],
    [c10, w10],
    [c01, w01],
    [c11, w11],
  ] as const) {
    if (isWater(c) && w > best) {
      best = w;
      waterKind = c;
    }
  }
  const bx = cl(Math.round(gx + jx), W - 1);
  const by = cl(Math.round(gy + jy), H - 1);
  // Elevation plane may have its own dims (planet) or share (regions).
  const ex0 = cl(Math.floor(ex), elevW - 1);
  const ey0 = cl(Math.floor(ey), elevH - 1);
  const ex1 = cl(ex0 + 1, elevW - 1);
  const ey1 = cl(ey0 + 1, elevH - 1);
  const efx = cl(ex - ex0, 1);
  const efy = cl(ey - ey0, 1);
  const e =
    elevG[ey0 * elevW + ex0] * (1 - efx) * (1 - efy) +
    elevG[ey0 * elevW + ex1] * efx * (1 - efy) +
    elevG[ey1 * elevW + ex0] * (1 - efx) * efy +
    elevG[ey1 * elevW + ex1] * efx * efy;
  return { biome: biomeG[by * W + bx], elev: e, landness: 1 - waterFrac, waterKind };
}

// ── The pure per-tile composition ────────────────────────────────────────────
export function earthTileRecord(tx: number, ty: number, planet: PlanetGrids, regions: readonly RegionGrids[]): [number, number, number, number] {
  const lat = latOfTileRow(ty);
  const lng = lngOfTileCol(tx);
  if (Math.abs(lat) > PLAYABLE_LAT_LIMIT) return [Biome.SNOW, 128, 0, FLAG_WALKABLE];

  const jx = (hash01(tx, ty, WORLD_SEED ^ 0x1b873593) - 0.5) * 2 * BIOME_JITTER;
  const jy = (hash01(ty, tx, WORLD_SEED ^ 0x85ebca6b) - 0.5) * 2 * BIOME_JITTER;

  const ps = sampleGrids(
    planet.biome,
    planet.elev,
    planet.pbW,
    planet.pbH,
    planet.peW,
    planet.peH,
    tx / planet.pbStep - 0.5,
    ty / planet.pbStep - 0.5,
    tx / planet.peStep - 0.5,
    ty / planet.peStep - 0.5,
    jx,
    jy,
  );

  // Covering region (if any) + edge-distance blend factor.
  let s = ps;
  const region = regions.find((r) => lat >= r.latMin && lat <= r.latMax && lng >= r.lngMin && lng <= r.lngMax);
  if (region) {
    const stepPx = region.stepTiles * TILE_PX;
    const gx = ((lng - region.lngMin) * PX_PER_DEG_LNG) / stepPx - 0.5;
    const gy = ((region.latMax - lat) * PX_PER_DEG_LAT) / stepPx - 0.5;
    const rs = sampleGrids(region.biome, region.elev, region.w, region.h, region.w, region.h, gx, gy, gx, gy, jx, jy);
    const edgeTiles = Math.min(
      ((lat - region.latMin) * PX_PER_DEG_LAT) / TILE_PX,
      ((region.latMax - lat) * PX_PER_DEG_LAT) / TILE_PX,
      ((lng - region.lngMin) * PX_PER_DEG_LNG) / TILE_PX,
      ((region.lngMax - lng) * PX_PER_DEG_LNG) / TILE_PX,
    );
    const t = Math.min(1, Math.max(0, edgeTiles / REGION_BLEND_MARGIN_TILES));
    if (t >= 1) s = rs;
    else {
      const pick = hash01(tx ^ 0x5bd1, ty ^ 0xe995, WORLD_SEED ^ 0xc2b2ae35) < t;
      s = {
        biome: pick ? rs.biome : ps.biome,
        elev: ps.elev * (1 - t) + rs.elev * t,
        landness: ps.landness * (1 - t) + rs.landness * t,
        waterKind: pick ? rs.waterKind : ps.waterKind,
      };
    }
  }

  const moist = Math.min(255, Math.max(0, Math.round(fbm3(tx / 384, ty / 384, WORLD_SEED ^ 0x2c1b3c6d) * 255)));

  // WATER: bilinear landness below the threshold — kind from the grids.
  if (s.landness < LANDNESS_WATER) {
    const band = Math.round(s.elev);
    return [s.waterKind, band, moist, 0]; // non-walkable, no scatter
  }

  // LAND: real base elevation + detail-noise relief scaled by that base.
  const detail = (fbm3(tx * DETAIL_SCALE, ty * DETAIL_SCALE, WORLD_SEED ^ 0x077e1e77) - 0.5) * DETAIL_BAND_AMP * (0.3 + (0.7 * s.elev) / 255);
  const band = Math.min(255, Math.max(0, Math.round(s.elev + detail)));

  let biome = s.biome;
  if (isWater(biome)) biome = Biome.BEACH; // jitter picked a water cell on a land tile — shoreline
  if (band >= EARTH_SNOW_BAND) biome = Biome.SNOW;
  else if (band >= EARTH_ROCK_BAND) biome = Biome.ROCK;
  else if (biome !== Biome.SNOW && biome !== Biome.ROCK) {
    const beachBand = BEACH_LANDNESS_BAND * (0.7 + 0.6 * hash01(tx ^ 0x27d4, ty ^ 0xeb2f, WORLD_SEED ^ 0x165667b1));
    if (s.landness < LANDNESS_WATER + beachBand) biome = Biome.BEACH;
  }

  let flags = FLAG_WALKABLE;
  if (biome === Biome.FOREST || biome === Biome.TAIGA) flags |= FLAG_SCATTER;
  return [biome, band, moist, flags];
}

/** Convenience for the gate's geo probes: the composed record at a lat/lng. */
export function earthSampleAt(lat: number, lng: number, planet: PlanetGrids, regions: readonly RegionGrids[]): [number, number, number, number] {
  const t = tileOfLatLng(lat, lng);
  return earthTileRecord(t.tx, t.ty, planet, regions);
}

/** The earth TerrainSource. `regions` is a LIVE array — appending a region
 *  (with a streamer sourceVersion bump + repaint) refines later fills;
 *  determinism holds for any FIXED grid state. */
export function createEarthSource(planet: PlanetGrids, regions: readonly RegionGrids[]): TerrainSource {
  return {
    fillChunk(cx: number, cy: number, out: Uint8Array): void {
      let o = 0;
      const baseX = cx * CHUNK_TILES;
      const baseY = cy * CHUNK_TILES;
      for (let j = 0; j < CHUNK_TILES; j++) {
        for (let i = 0; i < CHUNK_TILES; i++) {
          const r = earthTileRecord(baseX + i, baseY + j, planet, regions);
          out[o] = r[0];
          out[o + 1] = r[1];
          out[o + 2] = r[2];
          out[o + 3] = r[3];
          o += TILE_RECORD_BYTES;
        }
      }
    },
  };
}

// ── Pack loading with IndexedDB cache (browser main thread only) ─────────────
const IDB_NAME = 'toh-world';
const IDB_STORE = 'packs';

function idbOpen(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(key: string): Promise<ArrayBuffer | null> {
  try {
    const db = await idbOpen();
    return await new Promise((resolve) => {
      const req = db.transaction(IDB_STORE).objectStore(IDB_STORE).get(key);
      req.onsuccess = () => resolve(req.result instanceof ArrayBuffer ? req.result : null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function idbPut(key: string, buf: ArrayBuffer): Promise<void> {
  try {
    const db = await idbOpen();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(buf, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    /* cache is best-effort */
  }
}

/** Fetch a pack with the IndexedDB cache (keyed by path + PACK_VERSION).
 *  Returns where the bytes actually came from — the gate asserts a second
 *  boot serves planet.bin from 'idb' with the network blocked. */
export async function loadPack(path: string): Promise<{ buf: ArrayBuffer; from: 'idb' | 'network' }> {
  const key = `${path}@v${PACK_VERSION}`;
  const cached = await idbGet(key);
  if (cached) return { buf: cached, from: 'idb' };
  const res = await fetch(path);
  if (!res.ok) throw new Error(`loadPack ${path}: ${res.status}`);
  const buf = await res.arrayBuffer();
  await idbPut(key, buf);
  return { buf, from: 'network' };
}

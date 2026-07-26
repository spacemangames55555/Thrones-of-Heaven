// REAL-EARTH BAKE PIPELINE (WORLD SCALE V2, Pass 3) — npm run bake:earth
//
// Downloads real Earth datasets into the gitignored .cache/, converts them
// into compact binary packs under public/world/, and writes bake-manifest.json
// recording exactly which sources shipped (URL + sha256).
//
// SOURCES (real data — the bake FAILS rather than fabricate geography):
//   • Land / lakes / rivers: Natural Earth 10m GeoJSON from the
//     nvkelso/natural-earth-vector GitHub repo (50m fallback).
//   • Elevation: AWS Terrain Tiles (terrarium PNG, public, no auth) —
//     elev_m = (R*256 + G + B/256) − 32768. Planet from z5, PNW from z9.
//   • Biomes: DERIVED (fallback 3 — labeled in bake-manifest): the Pass 2
//     latitude+moisture band model masked by REAL land/ocean and pushed by
//     REAL elevation. The WWF-ecoregion and Koppen-Geiger paths were
//     attempted first; neither host is reachable from this environment
//     (gaftp.epa.gov / figshare.com / gloh2o.org all blocked at the proxy;
//     no GitHub mirror of the GeoTIFF exists in-tree anywhere probed).
//
// GRID MODEL (must match src/world/terrain-schema.ts — the pack-integrity
// gate check cross-verifies every header against the schema constants):
//   Runtime local frame: x px = (lng+180)·PX_PER_DEG_LNG, y px = (85−lat)·PX_PER_DEG_LAT.
//   planet.bin  — biome plane @ 1 sample / 256 tiles + elevation plane @ 1 / 512 tiles.
//   pnw.bin     — interleaved biome+elev @ 1 sample / 16 tiles over the PNW bbox.
//   Elevation band = clamp(floor((m + 500) / 40), 0, 255)   (schema-pinned).
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const CACHE = join(HERE, '.cache');
const OUT = join(HERE, '..', '..', 'public', 'world');
mkdirSync(CACHE, { recursive: true });
mkdirSync(join(OUT, 'regions'), { recursive: true });

// ── Schema constants (mirrored from src/world/terrain-schema.ts + world-scale.ts;
//    the gate asserts pack headers agree with the TS constants) ───────────────
const TILE_PX = 32;
const PX_PER_DEG_LAT = 178112;
const PX_PER_DEG_LNG = 121472;
const WORLD_SEED = 0x7a2e5eed;
const ELEV_OFFSET_M = 500;
const ELEV_STEP_M = 40;
const B = { OCEAN: 0, FRESHWATER: 1, BEACH: 2, GRASS: 3, SAVANNA: 4, DESERT: 5, FOREST: 6, TAIGA: 7, TUNDRA: 8, SNOW: 9, ROCK: 10, SWAMP: 11 };
const ROCK_BAND = 200; // matches terrain-procedural.ts
const SNOW_BAND = 232;

const WORLD_TILES_X = (360 * PX_PER_DEG_LNG) / TILE_PX; // 1,366,560
const WORLD_TILES_Y = (170 * PX_PER_DEG_LAT) / TILE_PX; // 946,220
const PLANET_BIOME_STEP = 256; // tiles per sample
const PLANET_ELEV_STEP = 512;
const PBW = Math.ceil(WORLD_TILES_X / PLANET_BIOME_STEP); // 5339
const PBH = Math.ceil(WORLD_TILES_Y / PLANET_BIOME_STEP); // 3697
const PEW = Math.ceil(WORLD_TILES_X / PLANET_ELEV_STEP); // 2670
const PEH = Math.ceil(WORLD_TILES_Y / PLANET_ELEV_STEP); // 1849

const PNW = { latMin: 41.5, latMax: 49.5, lngMin: -125.0, lngMax: -110.5 };
const REGION_STEP = 16; // tiles per sample (512 px ≈ 320 m)
const RW = Math.ceil(((PNW.lngMax - PNW.lngMin) * PX_PER_DEG_LNG) / (REGION_STEP * TILE_PX)); // 3440
const RH = Math.ceil(((PNW.latMax - PNW.latMin) * PX_PER_DEG_LAT) / (REGION_STEP * TILE_PX)); // 2783

const SIZE_GUARD_TOTAL = 60 * 1024 * 1024;
const SIZE_GUARD_FILE = 45 * 1024 * 1024;

// ── Helpers ──────────────────────────────────────────────────────────────────
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

async function download(url, file) {
  const path = join(CACHE, file);
  if (existsSync(path)) return readFileSync(path);
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      const buf = Buffer.from(await res.arrayBuffer());
      writeFileSync(path, buf);
      return buf;
    } catch (e) {
      if (attempt === 4) throw e;
      await new Promise((r) => setTimeout(r, attempt * 1500));
    }
  }
}

// Pass 2's integer-hash noise, verbatim (derived biomes reuse the same model).
function hash01(ix, iy, seed) {
  let h = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263)) ^ seed;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function vnoise(x, y, seed) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = hash01(ix, iy, seed);
  const b = hash01(ix + 1, iy, seed);
  const c = hash01(ix, iy + 1, seed);
  const d = hash01(ix + 1, iy + 1, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
function fbm3(x, y, seed) {
  return (vnoise(x, y, seed) + 0.5 * vnoise(x * 2, y * 2, seed ^ 0x9e3779b9) + 0.25 * vnoise(x * 4, y * 4, seed ^ 0x51ed270b)) / 1.75;
}
const MOISTURE_SCALE = 1 / 384;

/** SUBTROPICAL ARIDITY (derived-biome refinement): the Hadley-cell descending
 *  branch makes |lat| ≈ 15–35° the planet's desert belt (Sahara, Arabia,
 *  Kalahari, Australia). Moisture is biased down by a triangular weight
 *  peaking at the Tropic (~23°) — climatology, not point-fitting. */
const ARIDITY_PEAK_LAT = 23;
const ARIDITY_HALF_WIDTH = 12;
const ARIDITY_STRENGTH = 0.28;
function aridity(absLat) {
  const d = Math.abs(absLat - ARIDITY_PEAK_LAT);
  return d >= ARIDITY_HALF_WIDTH ? 0 : ARIDITY_STRENGTH * (1 - d / ARIDITY_HALF_WIDTH);
}

/** Derived biome (fallback 3): Pass 2 bands from |lat| + moisture (with the
 *  subtropical aridity bias), pushed by REAL elevation band; caller has
 *  already resolved REAL water. */
function derivedLandBiome(lat, tileX, tileY, elevBand) {
  if (elevBand >= SNOW_BAND) return B.SNOW;
  if (elevBand >= ROCK_BAND) return B.ROCK;
  const a = Math.abs(lat);
  const m = fbm3(tileX * MOISTURE_SCALE, tileY * MOISTURE_SCALE, WORLD_SEED ^ 0x2c1b3c6d) - aridity(a);
  if (a < 15) return m < 0.33 ? B.SAVANNA : m < 0.75 ? B.FOREST : B.SWAMP;
  if (a < 35) return m < 0.33 ? B.DESERT : m < 0.66 ? B.SAVANNA : B.GRASS;
  if (a < 55) return m < 0.5 ? B.GRASS : B.FOREST;
  if (a < 66) return m < 0.4 ? B.GRASS : B.TAIGA;
  if (a < 75) return B.TUNDRA;
  return B.SNOW;
}

const elevBand = (m) => Math.min(255, Math.max(0, Math.floor((m + ELEV_OFFSET_M) / ELEV_STEP_M)));
const latOfRow = (j, stepTiles) => 85 - ((j + 0.5) * stepTiles * TILE_PX) / PX_PER_DEG_LAT;
const lngOfCol = (i, stepTiles) => -180 + ((i + 0.5) * stepTiles * TILE_PX) / PX_PER_DEG_LNG;

// ── GeoJSON scanline rasterizer (equirect grids are linear in lng/lat) ───────
/** Collect polygon rings from a GeoJSON FeatureCollection. */
function collectRings(geojson, filter = () => true) {
  const rings = [];
  for (const f of geojson.features) {
    if (!f.geometry || !filter(f)) continue;
    const g = f.geometry;
    if (g.type === 'Polygon') rings.push(...g.coordinates);
    else if (g.type === 'MultiPolygon') for (const poly of g.coordinates) rings.push(...poly);
  }
  return rings;
}

/**
 * Even-odd scanline fill: marks grid samples whose CENTER lies inside the
 * polygons. Grid row j has latitude latOf(j), column i longitude lngOf(i).
 * Edges are bucketed by grid-row span so total work is proportional to edge
 * coverage, not rows × edges.
 */
function rasterizeMask(rings, W, H, lngOf, latOf, mask) {
  // Precompute per-row edge buckets. Row j covers latitude latOf(j).
  const lat0 = latOf(0);
  const latN = latOf(H - 1);
  const rowOfLat = (lat) => ((lat - lat0) / (latN - lat0)) * (H - 1);
  const buckets = Array.from({ length: H }, () => []);
  for (const ring of rings) {
    for (let k = 0; k < ring.length - 1; k++) {
      const [x1, y1] = ring[k];
      const [x2, y2] = ring[k + 1];
      if (y1 === y2) continue; // horizontal edges never cross a sample latitude
      let r1 = Math.ceil(Math.min(rowOfLat(y1), rowOfLat(y2)));
      let r2 = Math.floor(Math.max(rowOfLat(y1), rowOfLat(y2)));
      r1 = Math.max(0, r1);
      r2 = Math.min(H - 1, r2);
      for (let r = r1; r <= r2; r++) buckets[r].push([x1, y1, x2, y2]);
    }
  }
  const lng0 = lngOf(0);
  const lngW = lngOf(W - 1);
  const colOfLng = (lng) => ((lng - lng0) / (lngW - lng0)) * (W - 1);
  for (let j = 0; j < H; j++) {
    const lat = latOf(j);
    const edges = buckets[j];
    if (edges.length === 0) continue;
    const xs = [];
    for (const [x1, y1, x2, y2] of edges) {
      if (lat >= Math.min(y1, y2) && lat < Math.max(y1, y2)) {
        xs.push(x1 + ((lat - y1) / (y2 - y1)) * (x2 - x1));
      }
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      let i0 = Math.ceil(colOfLng(xs[k]) - 1e-9);
      let i1 = Math.floor(colOfLng(xs[k + 1]) + 1e-9);
      i0 = Math.max(0, i0);
      i1 = Math.min(W - 1, i1);
      for (let i = i0; i <= i1; i++) mask[j * W + i] = 1;
    }
  }
}

/** Full-precision even-odd point-in-polygons (for coast-truth). The loop
 *  covers EVERY edge including the ring-closing one (GeoJSON rings repeat
 *  the first vertex, making exactly one harmless degenerate edge). */
function pointInRings(rings, lng, lat) {
  let inside = false;
  for (const ring of rings) {
    for (let k = 0, m = ring.length - 1; k < ring.length; m = k++) {
      const [xi, yi] = ring[k];
      const [xj, yj] = ring[m];
      if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
}

// ── Terrarium elevation sampling (Mercator tiles → equirect grids) ───────────
function mercTileOf(lat, lng, z) {
  const n = 2 ** z;
  const x = ((lng + 180) / 360) * n;
  const rad = (lat * Math.PI) / 180;
  const y = ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n;
  return { x, y };
}

class TerrariumSampler {
  constructor(z) {
    this.z = z;
    this.tiles = new Map(); // key → decoded {data,width}
    this.lru = [];
    this.fetched = 0;
  }

  async tile(tx, ty) {
    const n = 2 ** this.z;
    if (tx < 0) tx += n;
    if (tx >= n) tx -= n;
    ty = Math.min(n - 1, Math.max(0, ty));
    const k = `${tx},${ty}`;
    const hit = this.tiles.get(k);
    if (hit) return hit;
    const buf = await download(`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${this.z}/${tx}/${ty}.png`, `terrarium-${this.z}-${tx}-${ty}.png`);
    const png = PNG.sync.read(buf);
    const t = { data: png.data, width: png.width };
    this.tiles.set(k, t);
    this.lru.push(k);
    this.fetched++;
    if (this.lru.length > 80) this.tiles.delete(this.lru.shift());
    return t;
  }

  /** Elevation in meters at (lat, lng) — nearest terrarium pixel. */
  async metersAt(lat, lng) {
    const { x, y } = mercTileOf(lat, lng, this.z);
    const tx = Math.floor(x);
    const ty = Math.floor(y);
    const t = await this.tile(tx, ty);
    const px = Math.min(255, Math.max(0, Math.floor((x - tx) * 256)));
    const py = Math.min(255, Math.max(0, Math.floor((y - ty) * 256)));
    const o = (py * t.width + px) * 4;
    return t.data[o] * 256 + t.data[o + 1] + t.data[o + 2] / 256 - 32768;
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────
const manifest = { bakedAt: new Date().toISOString(), sources: [], outputs: [], derivedBiomes: true, derivedBiomesNote: '' };

async function fetchGeo(name, res10, res50) {
  const base = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/';
  try {
    const buf = await download(base + res10, res10);
    manifest.sources.push({ name, url: base + res10, sha256: sha256(buf), bytes: buf.length, resolution: '10m' });
    return JSON.parse(buf.toString('utf8'));
  } catch (e) {
    console.warn(`10m ${name} failed (${e}); falling back to 50m`);
    const buf = await download(base + res50, res50);
    manifest.sources.push({ name, url: base + res50, sha256: sha256(buf), bytes: buf.length, resolution: '50m (fallback)' });
    return JSON.parse(buf.toString('utf8'));
  }
}

console.log('bake-earth: downloading Natural Earth vectors…');
const landGeo = await fetchGeo('land', 'ne_10m_land.geojson', 'ne_50m_land.geojson');
const lakesGeo = await fetchGeo('lakes', 'ne_10m_lakes.geojson', 'ne_50m_lakes.geojson');
const riversGeo = await fetchGeo('rivers', 'ne_10m_rivers_lake_centerlines.geojson', 'ne_50m_rivers_lake_centerlines.geojson');
const landRings = collectRings(landGeo);
const lakeRings = collectRings(lakesGeo);
console.log(`land rings ${landRings.length}, lake rings ${lakeRings.length}`);

// 1) PLANET LAND / LAKE MASKS at biome-plane resolution.
console.log('bake-earth: rasterizing planet land/lake masks…');
const planetLand = new Uint8Array(PBW * PBH);
const planetLake = new Uint8Array(PBW * PBH);
rasterizeMask(landRings, PBW, PBH, (i) => lngOfCol(i, PLANET_BIOME_STEP), (j) => latOfRow(j, PLANET_BIOME_STEP), planetLand);
rasterizeMask(lakeRings, PBW, PBH, (i) => lngOfCol(i, PLANET_BIOME_STEP), (j) => latOfRow(j, PLANET_BIOME_STEP), planetLake);

// 2) PLANET ELEVATION PLANE from z5 terrarium (+ a biome-plane elevation pass
//    reused by the derived biomes so ROCK/SNOW push uses REAL elevation).
console.log('bake-earth: sampling planet elevation (terrarium z5)…');
const z5 = new TerrariumSampler(5);
const planetElev = new Uint8Array(PEW * PEH);
for (let j = 0; j < PEH; j++) {
  const lat = latOfRow(j, PLANET_ELEV_STEP);
  for (let i = 0; i < PEW; i++) {
    planetElev[j * PEW + i] = elevBand(await z5.metersAt(lat, lngOfCol(i, PLANET_ELEV_STEP)));
  }
  if (j % 200 === 0) console.log(`  elev row ${j}/${PEH} (tiles fetched ${z5.fetched})`);
}

// 3) PLANET BIOME PLANE: real water, derived land biomes pushed by real elevation.
console.log('bake-earth: composing planet biome plane…');
const planetBiome = new Uint8Array(PBW * PBH);
for (let j = 0; j < PBH; j++) {
  const lat = latOfRow(j, PLANET_BIOME_STEP);
  const ej = Math.min(PEH - 1, Math.round((j * PLANET_BIOME_STEP) / PLANET_ELEV_STEP));
  for (let i = 0; i < PBW; i++) {
    const o = j * PBW + i;
    if (planetLake[o]) planetBiome[o] = B.FRESHWATER;
    else if (!planetLand[o]) planetBiome[o] = B.OCEAN;
    else {
      const ei = Math.min(PEW - 1, Math.round((i * PLANET_BIOME_STEP) / PLANET_ELEV_STEP));
      const tileX = Math.round((i + 0.5) * PLANET_BIOME_STEP);
      const tileY = Math.round((j + 0.5) * PLANET_BIOME_STEP);
      planetBiome[o] = derivedLandBiome(lat, tileX, tileY, planetElev[ej * PEW + ei]);
    }
  }
}

// 4) PNW REGION GRID (land/lakes @10m, elevation z9, derived biomes, rivers).
console.log('bake-earth: rasterizing PNW region…');
const rLngOf = (i) => PNW.lngMin + (((i + 0.5) * REGION_STEP * TILE_PX) / PX_PER_DEG_LNG);
const rLatOf = (j) => PNW.latMax - (((j + 0.5) * REGION_STEP * TILE_PX) / PX_PER_DEG_LAT);
const inBbox = (ring) => ring.some(([x, y]) => x >= PNW.lngMin - 1 && x <= PNW.lngMax + 1 && y >= PNW.latMin - 1 && y <= PNW.latMax + 1);
const regionLand = new Uint8Array(RW * RH);
const regionLake = new Uint8Array(RW * RH);
rasterizeMask(landRings.filter(inBbox), RW, RH, rLngOf, rLatOf, regionLand);
rasterizeMask(lakeRings.filter(inBbox), RW, RH, rLngOf, rLatOf, regionLake);

console.log('bake-earth: sampling PNW elevation (terrarium z9)…');
const z9 = new TerrariumSampler(9);
const regionElev = new Uint8Array(RW * RH);
for (let j = 0; j < RH; j++) {
  const lat = rLatOf(j);
  for (let i = 0; i < RW; i++) regionElev[j * RW + i] = elevBand(await z9.metersAt(lat, rLngOf(i)));
  if (j % 300 === 0) console.log(`  elev row ${j}/${RH} (tiles fetched ${z9.fetched})`);
}

const regionBiome = new Uint8Array(RW * RH);
for (let j = 0; j < RH; j++) {
  const lat = rLatOf(j);
  for (let i = 0; i < RW; i++) {
    const o = j * RW + i;
    if (regionLake[o]) regionBiome[o] = B.FRESHWATER; // lakes ≥ grid scale
    else if (!regionLand[o]) regionBiome[o] = B.OCEAN;
    else {
      const tileX = Math.round(((rLngOf(i) + 180) * PX_PER_DEG_LNG) / TILE_PX);
      const tileY = Math.round(((85 - lat) * PX_PER_DEG_LAT) / TILE_PX);
      regionBiome[o] = derivedLandBiome(lat, tileX, tileY, regionElev[o]);
    }
  }
}

// 5) RIVERS: clip NE centerlines to the bbox, classify width 1–3 by NE rank,
//    stamp FRESHWATER into the region grid, and ship the polylines as JSON.
console.log('bake-earth: rivers…');
const riverFeatures = [];
for (const f of riversGeo.features) {
  const g = f.geometry;
  if (!g) continue;
  const lines = g.type === 'LineString' ? [g.coordinates] : g.type === 'MultiLineString' ? g.coordinates : [];
  const sw = Number(f.properties?.strokeweig ?? 0.1);
  const widthClass = sw >= 0.7 ? 3 : sw >= 0.3 ? 2 : 1;
  const name = f.properties?.name ?? null;
  for (const line of lines) {
    // Clip to bbox by splitting into inside runs (endpoints clamped is fine
    // at 320 m grid scale — these are centerlines, not authoritative banks).
    let run = [];
    for (const [x, y] of line) {
      const inside = x >= PNW.lngMin && x <= PNW.lngMax && y >= PNW.latMin && y <= PNW.latMax;
      if (inside) run.push([+x.toFixed(5), +y.toFixed(5)]);
      else if (run.length > 1) {
        riverFeatures.push({ name, widthClass, points: run });
        run = [];
      } else run = [];
    }
    if (run.length > 1) riverFeatures.push({ name, widthClass, points: run });
  }
}
const riverNames = new Set(riverFeatures.map((r) => r.name).filter(Boolean));
if (!riverNames.has('Columbia') || !riverNames.has('Snake')) {
  throw new Error(`bake-earth: PNW rivers must include Columbia and Snake — got ${[...riverNames].join(', ')}`);
}
// Stamp rivers into the region biome grid (radius by width class, land only).
let riverSamples = 0;
for (const r of riverFeatures) {
  const rad = r.widthClass - 1; // samples: 0 / 1 / 2 → ~320 / 960 / 1600 m swaths
  for (let k = 0; k + 1 < r.points.length; k++) {
    const [ax, ay] = r.points[k];
    const [bx, by] = r.points[k + 1];
    const ai = ((ax - PNW.lngMin) * PX_PER_DEG_LNG) / (REGION_STEP * TILE_PX) - 0.5;
    const aj = ((PNW.latMax - ay) * PX_PER_DEG_LAT) / (REGION_STEP * TILE_PX) - 0.5;
    const bi = ((bx - PNW.lngMin) * PX_PER_DEG_LNG) / (REGION_STEP * TILE_PX) - 0.5;
    const bj = ((PNW.latMax - by) * PX_PER_DEG_LAT) / (REGION_STEP * TILE_PX) - 0.5;
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(bi - ai), Math.abs(bj - aj)) * 2));
    for (let s = 0; s <= steps; s++) {
      const ci = Math.round(ai + ((bi - ai) * s) / steps);
      const cj = Math.round(aj + ((bj - aj) * s) / steps);
      for (let dj = -rad; dj <= rad; dj++) {
        for (let di = -rad; di <= rad; di++) {
          const i = ci + di;
          const j = cj + dj;
          if (i < 0 || j < 0 || i >= RW || j >= RH) continue;
          const o = j * RW + i;
          if (regionLand[o] && regionBiome[o] !== B.FRESHWATER) {
            regionBiome[o] = B.FRESHWATER;
            riverSamples++;
          }
        }
      }
    }
  }
}
console.log(`  rivers: ${riverFeatures.length} clipped polylines, ${riverSamples} samples stamped`);

// 6) COAST-TRUTH: 300 seeded-random global points, land/water from the FULL
//    precision NE polygons (never the grids).
console.log('bake-earth: coast truth…');
function mulberry32(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(0x7a2e5eed);
const coastTruth = [];
for (let n = 0; n < 300; n++) {
  const lat = -80 + rng() * 160;
  const lng = -180 + rng() * 360;
  const land = pointInRings(landRings, lng, lat) && !pointInRings(lakeRings, lng, lat);
  coastTruth.push({ lat: +lat.toFixed(5), lng: +lng.toFixed(5), water: !land });
}

// 7) WRITE PACKS.
console.log('bake-earth: writing packs…');
const U32 = (n) => {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(n >>> 0);
  return b;
};
const F64 = (n) => {
  const b = Buffer.alloc(8);
  b.writeDoubleLE(n);
  return b;
};
// planet.bin: 'TOHW' v1 | pbW pbH pbStep | peW peH peStep | elevOffset elevStep | biome plane | elev plane
const planetHeader = Buffer.concat([
  Buffer.from('TOHW'),
  U32(1),
  U32(PBW),
  U32(PBH),
  U32(PLANET_BIOME_STEP),
  U32(PEW),
  U32(PEH),
  U32(PLANET_ELEV_STEP),
  U32(ELEV_OFFSET_M),
  U32(ELEV_STEP_M),
]);
const planetBin = Buffer.concat([planetHeader, Buffer.from(planetBiome), Buffer.from(planetElev)]);
writeFileSync(join(OUT, 'planet.bin'), planetBin);

// pnw.bin: 'TOHR' v1 | W H step | bbox f64×4 | interleaved [biome, elev] per sample
const pnwHeader = Buffer.concat([
  Buffer.from('TOHR'),
  U32(1),
  U32(RW),
  U32(RH),
  U32(REGION_STEP),
  F64(PNW.latMin),
  F64(PNW.latMax),
  F64(PNW.lngMin),
  F64(PNW.lngMax),
]);
const inter = Buffer.alloc(RW * RH * 2);
for (let o = 0; o < RW * RH; o++) {
  inter[o * 2] = regionBiome[o];
  inter[o * 2 + 1] = regionElev[o];
}
const pnwBin = Buffer.concat([pnwHeader, inter]);
writeFileSync(join(OUT, 'regions', 'pnw.bin'), pnwBin);

const riversJson = Buffer.from(JSON.stringify({ region: 'pnw', bbox: PNW, source: 'Natural Earth rivers_lake_centerlines', rivers: riverFeatures }));
writeFileSync(join(OUT, 'regions', 'pnw-rivers.json'), riversJson);
const coastJson = Buffer.from(JSON.stringify({ seed: '0x7a2e5eed', source: 'Natural Earth land + lakes (full precision)', points: coastTruth }));
writeFileSync(join(OUT, 'coast-truth.json'), coastJson);

const regionsManifest = {
  version: 1,
  regions: [
    {
      id: 'pnw',
      bbox: PNW,
      file: 'regions/pnw.bin',
      rivers: 'regions/pnw-rivers.json',
      bytes: pnwBin.length,
      sha256: sha256(pnwBin),
      version: 1,
    },
  ],
};
const regionsJson = Buffer.from(JSON.stringify(regionsManifest, null, 2));
writeFileSync(join(OUT, 'regions.json'), regionsJson);

for (const [file, buf] of [
  ['planet.bin', planetBin],
  ['regions/pnw.bin', pnwBin],
  ['regions/pnw-rivers.json', riversJson],
  ['coast-truth.json', coastJson],
  ['regions.json', regionsJson],
]) {
  manifest.outputs.push({ file: `public/world/${file}`, bytes: buf.length, sha256: sha256(buf) });
}
const total = manifest.outputs.reduce((a, o) => a + o.bytes, 0);
if (total > SIZE_GUARD_TOTAL) throw new Error(`bake-earth: total packs ${total} exceed ${SIZE_GUARD_TOTAL}`);
for (const o of manifest.outputs) if (o.bytes > SIZE_GUARD_FILE) throw new Error(`bake-earth: ${o.file} exceeds single-file guard`);

manifest.derivedBiomesNote =
  'Biomes are DERIVED (fallback 3): Pass 2 latitude+moisture bands masked by REAL Natural Earth land/ocean/lakes and pushed by REAL terrarium elevation. WWF ecoregions and Koppen-Geiger GeoTIFF were attempted first; their hosts are unreachable from the build environment.';
writeFileSync(join(HERE, 'bake-manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`bake-earth: DONE — ${(total / 1048576).toFixed(1)} MB committed packs, terrarium tiles fetched z5=${z5.fetched} z9=${z9.fetched}`);

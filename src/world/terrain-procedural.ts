import {
  Biome,
  CHUNK_TILES,
  FLAG_SCATTER,
  FLAG_WALKABLE,
  PLAYABLE_LAT_LIMIT,
  TILE_RECORD_BYTES,
  WORLD_SEED,
  latOfTileRow,
  tileOfLatLng,
  type TerrainSource,
} from './terrain-schema';

/**
 * PROCEDURAL PLACEHOLDER TERRAIN (WORLD SCALE V2, Pass 2) — a pure,
 * deterministic function of (global tile coordinate, WORLD_SEED). Integer-hash
 * value noise only: no Math.random, no per-chunk state. The SAME tile produces
 * identical bytes no matter which chunk (or which thread) requests it — that
 * per-tile purity is what makes chunk seams impossible by construction.
 *
 * PLACEHOLDER: all land in this pass (no fake coastlines). Pass 3 swaps in
 * real Earth data behind the same TerrainSource interface.
 *
 * Biomes come from |latitude| bands modulated by moisture; high elevation
 * pushes ROCK, then SNOW. Elevation + moisture are 3-octave value noise in
 * world-tile space.
 */

// ── Integer-hash noise (deterministic across main thread and worker) ─────────

/** 2D integer coordinate + seed → [0, 1). Pure 32-bit integer mixing. */
export function hash01(ix: number, iy: number, seed: number): number {
  let h = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263)) ^ seed;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Smoothstep-interpolated value noise at (x, y) lattice scale 1. */
function vnoise(x: number, y: number, seed: number): number {
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

/** 3-octave fractal value noise → [0, 1). */
export function fbm3(x: number, y: number, seed: number): number {
  const n = vnoise(x, y, seed) + 0.5 * vnoise(x * 2, y * 2, seed ^ 0x9e3779b9) + 0.25 * vnoise(x * 4, y * 4, seed ^ 0x51ed270b);
  return n / 1.75;
}

// Noise scales, in world tiles per lattice cell.
const ELEVATION_SCALE = 1 / 256;
const MOISTURE_SCALE = 1 / 384;
// Elevation thresholds (band 0–255): high ground reads ROCK, peaks read SNOW.
export const ROCK_BAND = 200;
export const SNOW_BAND = 232;

/** The full 4-byte record for ONE global tile — the single source of truth
 *  every path (chunk fill, worker, gate probes) goes through. */
export function tileRecord(txGlobal: number, tyGlobal: number): [number, number, number, number] {
  const lat = latOfTileRow(tyGlobal);
  const elev = Math.min(255, Math.max(0, Math.round(fbm3(txGlobal * ELEVATION_SCALE, tyGlobal * ELEVATION_SCALE, WORLD_SEED) * 255)));
  const moist01 = fbm3(txGlobal * MOISTURE_SCALE, tyGlobal * MOISTURE_SCALE, WORLD_SEED ^ 0x2c1b3c6d);
  const moist = Math.min(255, Math.max(0, Math.round(moist01 * 255)));

  let biome: number;
  const a = Math.abs(lat);
  if (a > PLAYABLE_LAT_LIMIT) biome = Biome.SNOW; // beyond the playable clamp
  else if (elev >= SNOW_BAND) biome = Biome.SNOW;
  else if (elev >= ROCK_BAND) biome = Biome.ROCK;
  else if (a < 15) biome = moist01 < 0.33 ? Biome.SAVANNA : moist01 < 0.75 ? Biome.FOREST : Biome.SWAMP;
  else if (a < 35) biome = moist01 < 0.33 ? Biome.DESERT : moist01 < 0.66 ? Biome.SAVANNA : Biome.GRASS;
  else if (a < 55) biome = moist01 < 0.5 ? Biome.GRASS : Biome.FOREST;
  else if (a < 66) biome = moist01 < 0.4 ? Biome.GRASS : Biome.TAIGA;
  else if (a < 75) biome = Biome.TUNDRA;
  else biome = Biome.SNOW;

  // All land this pass: everything walkable. Scatter only where forests grow.
  let flags = FLAG_WALKABLE;
  if (biome === Biome.FOREST || biome === Biome.TAIGA) flags |= FLAG_SCATTER;
  return [biome, elev, moist, flags];
}

/** Convenience for the latitude-sanity gate probes: the record at a lat/lng. */
export function sampleRecord(lat: number, lng: number): [number, number, number, number] {
  const t = tileOfLatLng(lat, lng);
  return tileRecord(t.tx, t.ty);
}

export function createProceduralSource(): TerrainSource {
  return {
    fillChunk(cx: number, cy: number, out: Uint8Array): void {
      let o = 0;
      const baseX = cx * CHUNK_TILES;
      const baseY = cy * CHUNK_TILES;
      for (let j = 0; j < CHUNK_TILES; j++) {
        for (let i = 0; i < CHUNK_TILES; i++) {
          const r = tileRecord(baseX + i, baseY + j);
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

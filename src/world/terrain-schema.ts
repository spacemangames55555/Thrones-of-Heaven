import { TILE_PX, PX_PER_DEG_LAT, PX_PER_DEG_LNG } from './world-scale';

/**
 * TERRAIN SCHEMA (WORLD SCALE V2, Pass 2) — LOCKED. Pass 3 (real Earth data)
 * and the art pass depend on this exact shape: enum values, record layout,
 * and chunk geometry may gain reserved values but never change meaning.
 *
 * Per-tile record: 4 bytes —
 *   [0] biome    (u8, Biome enum below; 12–15 reserved)
 *   [1] elevation band (u8, 0–255)
 *   [2] moisture / variant (u8)
 *   [3] flags    (u8: bit0 walkable, bit1 scatter-allowed, rest reserved)
 *
 * Chunk = 64×64 tiles = 2048×2048 px. Chunk id (cx, cy) = floor(worldPx/2048)
 * where worldPx is the GLOBE-LOCAL v2 frame (local (0,0) = 85°N 180°W — the
 * runtime translation of the spec frame; world-scale.ts documents the offset).
 * Terrain is NEVER persisted — always re-derived from (tile coord, WORLD_SEED).
 */
export const Biome = {
  OCEAN: 0,
  FRESHWATER: 1,
  BEACH: 2,
  GRASS: 3,
  SAVANNA: 4,
  DESERT: 5,
  FOREST: 6,
  TAIGA: 7,
  TUNDRA: 8,
  SNOW: 9,
  ROCK: 10,
  SWAMP: 11,
  // 12–15 reserved.
} as const;
export type BiomeId = (typeof Biome)[keyof typeof Biome];

export const TILE_RECORD_BYTES = 4;
export const CHUNK_TILES = 64;
export const CHUNK_PX = CHUNK_TILES * TILE_PX; // 2048
export const CHUNK_RECORD_BYTES = CHUNK_TILES * CHUNK_TILES * TILE_RECORD_BYTES;

/** The one seed every synthesis path hashes from — change it and the whole
 *  placeholder planet reshuffles (Pass 3 replaces synthesis with real data). */
export const WORLD_SEED = 0x7a2e5eed;

/** Playable latitude clamps to ±85°; beyond renders as SNOW. */
export const PLAYABLE_LAT_LIMIT = 85;

/** Record flag bits. */
export const FLAG_WALKABLE = 1;
export const FLAG_SCATTER = 2;

/** ELEVATION BAND ENCODING (PINNED — the bake pipeline and every pack file
 *  use exactly this): band = clamp(floor((meters + ELEV_BAND_OFFSET_M) /
 *  ELEV_BAND_STEP_M), 0, 255). Band 0 ≈ −500 m, band 255 ≈ +9700 m. */
export const ELEV_BAND_OFFSET_M = 500;
export const ELEV_BAND_STEP_M = 40;
export function elevationBandFromMeters(m: number): number {
  return Math.min(255, Math.max(0, Math.floor((m + ELEV_BAND_OFFSET_M) / ELEV_BAND_STEP_M)));
}

/** OCEAN and FRESHWATER are non-walkable (wired into the collision path). */
export const NON_WALKABLE_BIOMES: readonly number[] = [Biome.OCEAN, Biome.FRESHWATER];

/** The pure synthesis contract. Pass 3 swaps the implementation (real Earth
 *  data) behind this same interface with zero streamer changes. */
export interface TerrainSource {
  fillChunk(cx: number, cy: number, out: Uint8Array): void;
}

export function chunkIdFromWorldPx(x: number, y: number): { cx: number; cy: number } {
  return { cx: Math.floor(x / CHUNK_PX), cy: Math.floor(y / CHUNK_PX) };
}

/** Latitude of a global tile row's center (GLOBE-LOCAL v2 frame). */
export function latOfTileRow(tyGlobal: number): number {
  return 85 - (tyGlobal * TILE_PX + TILE_PX / 2) / PX_PER_DEG_LAT;
}

/** Longitude of a global tile column's center (GLOBE-LOCAL v2 frame). */
export function lngOfTileCol(txGlobal: number): number {
  return -180 + (txGlobal * TILE_PX + TILE_PX / 2) / PX_PER_DEG_LNG;
}

/** Global tile coordinate containing a lat/lng (inverse of the two above). */
export function tileOfLatLng(lat: number, lng: number): { tx: number; ty: number } {
  return {
    tx: Math.floor(((lng + 180) * PX_PER_DEG_LNG) / TILE_PX),
    ty: Math.floor(((85 - lat) * PX_PER_DEG_LAT) / TILE_PX),
  };
}

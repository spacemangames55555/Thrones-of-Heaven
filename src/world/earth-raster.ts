import { EARTH_RASTER_W, EARTH_RASTER_H, EARTH_RASTER_DEG, EARTH_RASTER_RLE_B64 } from './earth-raster-data';

/**
 * THE GROUND RASTER — sampling API over the bundled Earth land/water +
 * coarse-biome grid (see earth-raster-data.ts for provenance: derived from
 * PUBLIC DOMAIN Natural Earth 110m land polygons; biome classes are latitude
 * bands added by the generator). Sparse region worlds sample this through
 * their lat/lng calibration to draw real continents under the chunk layer.
 */

/** Class 0 = WATER (impassable void ground). 1..5 = walkable land biomes. */
export const GROUND_WATER = 0;

/** Flat gray-box tint per ground class (no final art — placeholder colors). */
export const GROUND_CLASS_TINT: Record<number, number> = {
  0: 0x1d3f63, // water
  1: 0x4a7d3c, // tropical
  2: 0xc2a45e, // arid belt
  3: 0x6f9c4e, // temperate
  4: 0x4e7d62, // boreal
  5: 0xdfe8ee, // polar
};

let grid: Uint8Array | null = null;

/** Decode the RLE grid once, lazily (17KB module → 259KB in-memory grid). */
function decode(): Uint8Array {
  if (grid) return grid;
  const bin = atob(EARTH_RASTER_RLE_B64);
  const out = new Uint8Array(EARTH_RASTER_W * EARTH_RASTER_H);
  let o = 0;
  for (let i = 0; i < bin.length; i += 3) {
    const count = (bin.charCodeAt(i) << 8) | bin.charCodeAt(i + 1);
    out.fill(bin.charCodeAt(i + 2), o, o + count);
    o += count;
  }
  grid = out;
  return out;
}

/** Ground class at a lat/lng (0 water, 1..5 biome). Off-grid = water. */
export function groundClassAtLatLng(lat: number, lng: number): number {
  const g = decode();
  const col = Math.floor((lng + 180) / EARTH_RASTER_DEG);
  const row = Math.floor((90 - lat) / EARTH_RASTER_DEG);
  if (col < 0 || col >= EARTH_RASTER_W || row < 0 || row >= EARTH_RASTER_H) return GROUND_WATER;
  return g[row * EARTH_RASTER_W + col];
}

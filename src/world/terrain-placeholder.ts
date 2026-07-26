import Phaser from 'phaser';
import { TILE_PX } from './world-scale';

/**
 * PLACEHOLDER TERRAIN ATLAS (WORLD SCALE V2, Pass 2): boot-time
 * canvas-generated 32px tiles, 4 speckle variants per biome (±6% value
 * dither, NO tile borders — borders would draw grid lines across the world).
 * THROWAWAY: these colors are dev placeholder only and deliberately NOT in
 * feel-config — the art pass replaces the whole atlas.
 * Frame index = biome * 4 + variant. Only ever generated under ?scale=v2.
 */
export const PLACEHOLDER_ATLAS_KEY = 'terrain-ph';
export const VARIANTS_PER_BIOME = 4;

// Indexed by Biome enum value (0..11).
const BIOME_COLORS = [
  0x274b6d, // OCEAN
  0x3a6d99, // FRESHWATER
  0xdcc98f, // BEACH
  0x5f9e46, // GRASS
  0xb8a24f, // SAVANNA
  0xd8b56a, // DESERT
  0x2f6d3a, // FOREST
  0x3a5f4a, // TAIGA
  0x8fa08a, // TUNDRA
  0xe8edf2, // SNOW
  0x7d7a74, // ROCK
  0x4a5f3f, // SWAMP
];

/** Deterministic per-pixel hash for the speckle (no Math.random). */
function hash01(ix: number, iy: number, seed: number): number {
  let h = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263)) ^ seed;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export function ensurePlaceholderAtlas(scene: Phaser.Scene): void {
  if (scene.textures.exists(PLACEHOLDER_ATLAS_KEY)) return;
  const cols = BIOME_COLORS.length * VARIANTS_PER_BIOME; // one row of 48 frames
  const canvas = document.createElement('canvas');
  canvas.width = cols * TILE_PX;
  canvas.height = TILE_PX;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(canvas.width, canvas.height);
  for (let b = 0; b < BIOME_COLORS.length; b++) {
    const base = BIOME_COLORS[b];
    const r0 = (base >> 16) & 0xff;
    const g0 = (base >> 8) & 0xff;
    const b0 = base & 0xff;
    for (let v = 0; v < VARIANTS_PER_BIOME; v++) {
      const x0 = (b * VARIANTS_PER_BIOME + v) * TILE_PX;
      for (let y = 0; y < TILE_PX; y++) {
        for (let x = 0; x < TILE_PX; x++) {
          // ±6% value dither, per pixel, deterministic per (frame, pixel).
          const d = 1 + (hash01(x0 + x, y, 0x51ed270b ^ (b * 31 + v)) - 0.5) * 0.12;
          const o = ((y * canvas.width) + x0 + x) * 4;
          img.data[o] = Math.min(255, Math.round(r0 * d));
          img.data[o + 1] = Math.min(255, Math.round(g0 * d));
          img.data[o + 2] = Math.min(255, Math.round(b0 * d));
          img.data[o + 3] = 255;
        }
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  scene.textures.addCanvas(PLACEHOLDER_ATLAS_KEY, canvas);
}

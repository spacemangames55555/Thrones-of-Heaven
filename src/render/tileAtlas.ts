import Phaser from 'phaser';

/**
 * Tileset atlas pipeline.
 *
 * The world is rendered from a single 32x32 TILE ATLAS image (a standard Phaser
 * tileset image). The region model gives each cell a terrain key; this module
 * maps each terrain key to a tile in the atlas, and ships a TEMPORARY,
 * code-generated placeholder atlas so the pipeline works end-to-end before real
 * art exists.
 *
 * ─── SWAPPING IN REAL ART (no logic changes) ──────────────────────────────────
 *  1. Author a PNG atlas: {@link ATLAS_COLUMNS} columns of {@link TILE_SIZE}px
 *     tiles, in the EXACT order of {@link ATLAS_TILES} (atlas frame = list index
 *     + 1; frame 0 / the top-left cell is reserved empty). See ATLAS_LAYOUT.md.
 *  2. Put it at public/tiles/terrain-atlas.png and, in GameMap, load it
 *     (this.load.image) instead of calling {@link generatePlaceholderAtlas}.
 *  3. To re-order/extend tiles, edit ATLAS_TILES here only — the terrain→frame
 *     mapping is derived from it. Nothing else changes.
 * ──────────────────────────────────────────────────────────────────────────────
 */

/** Pixel size of one tile (atlas and tilemap must agree). */
export const TILE_SIZE = 32;

/** Atlas grid width in tiles. */
export const ATLAS_COLUMNS = 8;

export type TilePattern = 'flat' | 'noise' | 'water' | 'rows' | 'speckle' | 'rift';

export interface AtlasTileDef {
  /** Terrain key — must match TerrainType.key in the map data / town tiles. */
  key: string;
  /** Placeholder base color (ignored once real art replaces the atlas). */
  color: string;
  /** Placeholder texture style. */
  pattern: TilePattern;
}

/**
 * THE terrain → atlas-tile mapping. Order matters: a terrain's atlas frame is
 * its index here + 1 (frame 0 is the reserved empty/top-left cell). Edit this
 * list to add, re-order, or restyle tiles.
 */
export const ATLAS_TILES: AtlasTileDef[] = [
  // --- base terrain ---
  { key: 'ocean', color: '#16335f', pattern: 'water' },
  { key: 'sound', color: '#2f6fae', pattern: 'water' },
  { key: 'river', color: '#3f8fcf', pattern: 'water' },
  { key: 'lake', color: '#2b5c86', pattern: 'water' },
  { key: 'beach', color: '#ddca97', pattern: 'speckle' },
  { key: 'grassland', color: '#76b14e', pattern: 'noise' },
  { key: 'forest', color: '#3f7d3f', pattern: 'speckle' },
  { key: 'rainforest', color: '#1f7a55', pattern: 'speckle' },
  { key: 'montane', color: '#245f37', pattern: 'speckle' },
  { key: 'foothills', color: '#8a8a52', pattern: 'noise' },
  { key: 'mountain', color: '#e0e7ee', pattern: 'noise' },
  { key: 'pass', color: '#b7ad86', pattern: 'noise' },
  { key: 'steppe', color: '#cdb37a', pattern: 'noise' },
  { key: 'scabland', color: '#9c8a63', pattern: 'speckle' },
  { key: 'farmland', color: '#d7c24f', pattern: 'rows' },
  { key: 'wetland', color: '#5f8d6a', pattern: 'noise' },
  { key: 'urban', color: '#9a9aa2', pattern: 'noise' },
  { key: 'bridge', color: '#a9742f', pattern: 'rows' },
  // --- town tiles ---
  { key: 'town_ground', color: '#7a6647', pattern: 'noise' },
  { key: 'town_road', color: '#a8946a', pattern: 'noise' },
  { key: 'town_plaza', color: '#b8b0a0', pattern: 'flat' },
  { key: 'town_building', color: '#5b3b26', pattern: 'flat' },
  { key: 'town_inn', color: '#a05a2c', pattern: 'flat' },
  { key: 'town_door', color: '#ffcf57', pattern: 'flat' },
  { key: 'town_tree', color: '#1e5233', pattern: 'speckle' },
  { key: 'corrupted_ground', color: '#2b1640', pattern: 'rift' },
  { key: 'corruption_rift', color: '#8a2be2', pattern: 'rift' },
  // --- heaven tiles (the second world — ethereal/divine; appended so every
  //     existing terrain keeps its atlas frame and Earth is unaffected) ---
  { key: 'holy_ground', color: '#f4eed6', pattern: 'noise' }, // soft white-gold ground
  { key: 'heaven_cloud', color: '#e9f0fb', pattern: 'noise' }, // pale cloud
  { key: 'gold_field', color: '#ecd9a3', pattern: 'noise' }, // soft gold expanse
  { key: 'heaven_path', color: '#ded0a4', pattern: 'rows' }, // radiant path
  // The impassable map edge: a denser blue-grey CLOUD bank (reads as a deliberate
  // cloud-edge of the realm, not the dark void/background it used to look like).
  { key: 'heaven_void', color: '#8ea6c6', pattern: 'noise' },
];

/** Total atlas cells, including the reserved empty frame 0. */
export const ATLAS_FRAME_COUNT = ATLAS_TILES.length + 1;
export const ATLAS_ROWS = Math.ceil(ATLAS_FRAME_COUNT / ATLAS_COLUMNS);

const frameByKey = new Map<string, number>();
ATLAS_TILES.forEach((t, i) => frameByKey.set(t.key, i + 1)); // frame 0 reserved

/** The atlas frame (tile index) for a terrain key. */
export function atlasFrameForKey(key: string): number {
  const f = frameByKey.get(key);
  if (f === undefined) throw new Error(`No atlas tile defined for terrain '${key}'`);
  return f;
}

// --- Placeholder atlas drawing (temporary; replaced by real art) -------------

function hash(x: number, y: number): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function shade(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, color: string, amt: number): void {
  ctx.fillStyle = color;
  ctx.globalAlpha = amt;
  ctx.fillRect(x, y, w, w);
  ctx.globalAlpha = 1;
}

function drawTile(ctx: CanvasRenderingContext2D, ox: number, oy: number, ts: number, def: AtlasTileDef, seed: number): void {
  // Base fill.
  ctx.fillStyle = def.color;
  ctx.fillRect(ox, oy, ts, ts);

  // Texture by pattern so it reads as a tile, not a flat block.
  if (def.pattern === 'noise' || def.pattern === 'speckle') {
    const density = def.pattern === 'speckle' ? 0.28 : 0.16;
    for (let py = 0; py < ts; py++) {
      for (let px = 0; px < ts; px++) {
        const r = hash(seed * 31 + px, seed * 17 + py);
        if (r < density) {
          ctx.fillStyle = r < density / 2 ? 'rgba(0,0,0,0.14)' : 'rgba(255,255,255,0.10)';
          ctx.fillRect(ox + px, oy + py, 1, 1);
        }
      }
    }
  } else if (def.pattern === 'water') {
    for (let py = 2; py < ts; py += 4) {
      const off = Math.round(Math.sin((py + seed) * 0.6) * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.10)';
      ctx.fillRect(ox + 2 + off, oy + py, ts - 6, 1);
    }
  } else if (def.pattern === 'rows') {
    for (let px = 3; px < ts; px += 5) {
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(ox + px, oy + 2, 1, ts - 4);
    }
  } else if (def.pattern === 'rift') {
    for (let i = 0; i < 10; i++) {
      const px = Math.floor(hash(seed + i, seed * 3) * (ts - 4)) + 2;
      const py = Math.floor(hash(seed * 5, seed + i * 7) * (ts - 4)) + 2;
      ctx.fillStyle = i % 2 ? 'rgba(180,120,255,0.55)' : 'rgba(40,10,70,0.6)';
      ctx.fillRect(ox + px, oy + py, 2, 2);
    }
  }

  // Subtle top highlight / bottom shadow + faint border so the grid reads.
  shade(ctx, ox, oy, ts, '#ffffff', 0.0);
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  ctx.fillRect(ox, oy, ts, 2);
  ctx.fillStyle = 'rgba(0,0,0,0.10)';
  ctx.fillRect(ox, oy + ts - 2, ts, 2);
  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  ctx.fillRect(ox + ts - 1, oy, 1, ts);
}

/**
 * Generate the TEMPORARY placeholder atlas as a canvas texture under `key`.
 * Replace this call with loading a real PNG to ship art — see the file header.
 */
export function generatePlaceholderAtlas(scene: Phaser.Scene, key: string): void {
  const cols = ATLAS_COLUMNS;
  const rows = ATLAS_ROWS;
  const ts = TILE_SIZE;
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const canvasTexture = scene.textures.createCanvas(key, cols * ts, rows * ts);
  if (!canvasTexture) throw new Error('Failed to create atlas canvas texture');
  const ctx = canvasTexture.context;
  ctx.clearRect(0, 0, cols * ts, rows * ts); // frame 0 (top-left) stays transparent

  ATLAS_TILES.forEach((def, i) => {
    const frame = i + 1;
    const ox = (frame % cols) * ts;
    const oy = Math.floor(frame / cols) * ts;
    drawTile(ctx, ox, oy, ts, def, frame * 1337 + 7);
  });

  canvasTexture.refresh();
}

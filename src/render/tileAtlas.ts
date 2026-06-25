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
  // --- hell tiles (the third world — fire & brimstone; appended so every existing
  //     terrain keeps its atlas frame and Earth/Heaven are unaffected) ---
  { key: 'charred_rock', color: '#2a2320', pattern: 'noise' }, // dark charred ground (walk)
  { key: 'ash_ground', color: '#4a423d', pattern: 'noise' }, // ash-grey (walk)
  { key: 'ember_rock', color: '#3a241a', pattern: 'speckle' }, // ember-flecked rock (walk)
  { key: 'lava', color: '#e0531a', pattern: 'noise' }, // glowing lava (BLOCKS — impassable)
  { key: 'hell_void', color: '#0a0606', pattern: 'flat' }, // chasm edge (blocks)
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

// --- REAL terrain art (drop-in overrides over the placeholder atlas) ----------
//
// Each entry below replaces ONE terrain's placeholder color with a real 32px-grid
// PNG (loaded, then drawn into that terrain's atlas cell; bigger source art is
// downscaled into the 32px cell and the tilemap renders it pixel-crisp). Terrains
// WITHOUT an entry keep their procedural placeholder — this is a partial pass.
//
// ─── TO ADD ANOTHER REAL TILE LATER (the whole drop-in step) ──────────────────
//  1. Drop the PNG in  public/tiles/terrain/<Name>.png  (served at /tiles/...).
//  2. Add ONE line here: { key: '<terrainKey>', file: 'tiles/terrain/<Name>.png' }
//     — `key` must be a terrain key from ATLAS_TILES above. Nothing else changes.
// ──────────────────────────────────────────────────────────────────────────────
export const TERRAIN_TILE_IMAGES: { key: string; file: string }[] = [
  { key: 'beach', file: 'tiles/terrain/Beachcoast.png' }, // Beachcoast.png  → "Beach / Coast"
  { key: 'rainforest', file: 'tiles/terrain/Coastal_rainforest.png' }, // Coastal_rainforest.png → "Coastal Rainforest"
  { key: 'sound', file: 'tiles/terrain/Soundinlet.png' }, // Soundinlet.png → "Puget Sound"
  { key: 'ocean', file: 'tiles/terrain/Ocean.png' }, // Ocean.png → "Pacific Ocean"
  { key: 'river', file: 'tiles/terrain/River.png' }, // River.png → "River"
  { key: 'lake', file: 'tiles/terrain/Lake.png' }, // Lake.png → "Lake"
  { key: 'forest', file: 'tiles/terrain/Lowland_forest.png' }, // Lowland_forest.png → "Lowland Forest"
  { key: 'wetland', file: 'tiles/terrain/Wetlandmarsh.png' }, // Wetlandmarsh.png → "Wetland / Marsh"
  { key: 'grassland', file: 'tiles/terrain/Meadowgrassland.png' }, // Meadowgrassland.png → "Meadow / Grassland"
  { key: 'steppe', file: 'tiles/terrain/Shrubsteppe.png' }, // Shrubsteppe.png → "Shrub-Steppe"
  { key: 'scabland', file: 'tiles/terrain/Scabland.png' }, // Scabland.png → "Scabland / Coulee"
  { key: 'farmland', file: 'tiles/terrain/Farmlandwheat.png' }, // Farmlandwheat.png → "Palouse Farmland"
  { key: 'montane', file: 'tiles/terrain/Evergreenmontane_forest.png' }, // Evergreenmontane_forest.png → "Montane Forest"
  { key: 'foothills', file: 'tiles/terrain/Foothills.png' }, // Foothills.png → "Foothills"
  { key: 'mountain', file: 'tiles/terrain/Alpinesnow_peak.png' }, // Alpinesnow_peak.png → "Alpine Peak"
  { key: 'pass', file: 'tiles/terrain/Mountain_pass.png' }, // Mountain_pass.png → "Mountain Pass"
  { key: 'urban', file: 'tiles/terrain/Urbantown_ground.png' }, // Urbantown_ground.png → "Urban / Town"
  { key: 'bridge', file: 'tiles/terrain/Bridge.png' }, // Bridge.png → "Bridge"
  { key: 'corruption_rift', file: 'tiles/terrain/Corruptionrift.png' }, // Corruptionrift.png → "Corruption Rift"
  // --- Heaven tiles ---
  { key: 'holy_ground', file: 'tiles/terrain/Holy_ground.png' }, // Holy_ground.png → Heaven "Holy Ground"
  { key: 'heaven_cloud', file: 'tiles/terrain/Heaven_cloud.png' }, // Heaven_cloud.png → Heaven "Cloud"
  { key: 'gold_field', file: 'tiles/terrain/Gold_field.png' }, // Gold_field.png → Heaven "Gold Field"
  { key: 'heaven_path', file: 'tiles/terrain/Heaven_path.png' }, // Heaven_path.png → Heaven "Radiant Path"
  { key: 'heaven_void', file: 'tiles/terrain/Heaven_void.png' }, // Heaven_void.png → Heaven "Cloud Edge" (BLOCKS — unchanged)
  // --- Hell tiles ---
  { key: 'charred_rock', file: 'tiles/terrain/Charred_rock.png' }, // Charred_rock.png → Hell "Charred Rock"
  { key: 'ash_ground', file: 'tiles/terrain/Ash_ground.png' }, // Ash_ground.png → Hell "Ash"
  { key: 'ember_rock', file: 'tiles/terrain/Ember_rock.png' }, // Ember_rock.png → Hell "Ember Rock"
  { key: 'lava', file: 'tiles/terrain/Lava.png' }, // Lava.png → Hell "Lava" (BLOCKS — unchanged)
  { key: 'hell_void', file: 'tiles/terrain/Hell_void.png' }, // Hell_void.png → Hell "Chasm" (BLOCKS — unchanged)
];

/** Texture cache key under which a terrain's real tile PNG is loaded. */
export function terrainTileTextureKey(key: string): string {
  return `tile-${key}`;
}

/** Queue the real terrain tile PNGs for loading. Call from a scene's preload(). */
export function preloadTerrainTiles(scene: Phaser.Scene): void {
  for (const { key, file } of TERRAIN_TILE_IMAGES) {
    const texKey = terrainTileTextureKey(key);
    if (!scene.textures.exists(texKey)) scene.load.image(texKey, file);
  }
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

  // Overlay REAL art onto the frames that have a loaded PNG (the rest keep the
  // placeholder). The source is downscaled into the 32px cell; the tilemap then
  // samples it nearest-neighbor (pixelArt mode) so the pixel art stays crisp.
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  for (const { key } of TERRAIN_TILE_IMAGES) {
    const frame = frameByKey.get(key);
    const texKey = terrainTileTextureKey(key);
    if (frame === undefined || !scene.textures.exists(texKey)) continue; // not loaded → keep placeholder
    const src = scene.textures.get(texKey).getSourceImage();
    if (!(src instanceof HTMLImageElement || src instanceof HTMLCanvasElement)) continue;
    const ox = (frame % cols) * ts;
    const oy = Math.floor(frame / cols) * ts;
    ctx.clearRect(ox, oy, ts, ts);
    ctx.drawImage(src, ox, oy, ts, ts); // whole source → the 32px cell
  }
  ctx.imageSmoothingEnabled = false;

  canvasTexture.refresh();
}

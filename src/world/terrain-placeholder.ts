import Phaser from 'phaser';
import { TILE_PX } from './world-scale';
import { BIOME_COLORS } from './biome-anchors';
import { FRINGE_CELLS, PROP_TABLE, SHEET_CELL, type FringeCell } from './terrain-visuals-config';
import { FLORA_PROPS, type SilhouetteClass } from './flora-config';

/**
 * TERRAIN ATLAS BUILDER (Pass 2 placeholder → Pass 5 art pipeline): builds the
 * TWO runtime terrain textures, per-biome from EITHER a dropped art sheet
 * (/public/art/terrain/{biome}.png, the 8×4 drop contract) or the boot-time
 * procedural fallback (speckle bases; the 17 dithered fringe masks applied to
 * the biome base). Mixed art/placeholder biomes coexist because both paths
 * land in the same atlas cells — art drops only swap the texture SOURCE.
 *
 *  • PLACEHOLDER_ATLAS_KEY — base + water-anim cells. Frame index =
 *    biome * ATLAS_STRIDE + slot (slots 0–3 base variants, 4–6 water anim
 *    frames — copies of base-0 for artless biomes — 7 reserved).
 *  • FRINGE_ATLAS_KEY — named frames `${biome}:${cell}` for the 17 fringe
 *    geometries per biome.
 *
 * Placeholder colors are throwaway dev values, deliberately NOT feel-config.
 */
export const PLACEHOLDER_ATLAS_KEY = 'terrain-ph';
export const FRINGE_ATLAS_KEY = 'terrain-fringe';
export const VARIANTS_PER_BIOME = 4;
export const ATLAS_STRIDE = 8;
export const BIOME_COUNT = 12;


/** Deterministic per-pixel hash for speckle + dither (no Math.random). */
function hash01(ix: number, iy: number, seed: number): number {
  let h = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263)) ^ seed;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Paint one 32 px speckle cell of a biome into an ImageData at (x0, y0). */
function paintSpeckle(img: ImageData, W: number, x0: number, y0: number, biome: number, variant: number): void {
  const base = BIOME_COLORS[biome];
  const r0 = (base >> 16) & 0xff;
  const g0 = (base >> 8) & 0xff;
  const b0 = base & 0xff;
  for (let y = 0; y < TILE_PX; y++) {
    for (let x = 0; x < TILE_PX; x++) {
      const d = 1 + (hash01(x0 + x, y, 0x51ed270b ^ (biome * 31 + variant)) - 0.5) * 0.12;
      const o = ((y0 + y) * W + x0 + x) * 4;
      img.data[o] = Math.min(255, Math.round(r0 * d));
      img.data[o + 1] = Math.min(255, Math.round(g0 * d));
      img.data[o + 2] = Math.min(255, Math.round(b0 * d));
      img.data[o + 3] = 255;
    }
  }
}

/** Fringe geometry coverage [0..1] at a cell-local pixel — the 17 dither
 *  masks share these shapes with the art drop contract. */
export function fringeCoverage(cell: FringeCell, x: number, y: number): number {
  const F = 12; // fringe depth in px
  const eN = Math.max(0, 1 - y / F);
  const eS = Math.max(0, 1 - (31 - y) / F);
  const eW = Math.max(0, 1 - x / F);
  const eE = Math.max(0, 1 - (31 - x) / F);
  switch (cell) {
    case 'edge-n':
      return eN;
    case 'edge-e':
      return eE;
    case 'edge-s':
      return eS;
    case 'edge-w':
      return eW;
    case 'corner-out-ne':
      return Math.max(eN, eE);
    case 'corner-out-se':
      return Math.max(eS, eE);
    case 'corner-out-sw':
      return Math.max(eS, eW);
    case 'corner-out-nw':
      return Math.max(eN, eW);
    case 'cap-open-n':
      return Math.max(eE, eS, eW);
    case 'cap-open-e':
      return Math.max(eN, eS, eW);
    case 'cap-open-s':
      return Math.max(eN, eE, eW);
    case 'cap-open-w':
      return Math.max(eN, eE, eS);
    case 'island':
      return Math.max(eN, eE, eS, eW);
    case 'corner-in-ne':
      return Math.max(0, 1 - Math.hypot(31 - x, y) / F);
    case 'corner-in-se':
      return Math.max(0, 1 - Math.hypot(31 - x, 31 - y) / F);
    case 'corner-in-sw':
      return Math.max(0, 1 - Math.hypot(x, 31 - y) / F);
    case 'corner-in-nw':
      return Math.max(0, 1 - Math.hypot(x, y) / F);
  }
}

export type ArtSheets = Map<number, HTMLImageElement | ImageBitmap>;

/** (Re)build BOTH terrain textures — per biome from art when live, else the
 *  procedural fallback. Safe to call again when art arrives (replaces the
 *  textures in place; callers repaint chunk layers afterwards). */
export function buildTerrainAtlases(scene: Phaser.Scene, art: ArtSheets = new Map()): void {
  // ── Base atlas: 12 biomes × ATLAS_STRIDE cells in one row ─────────────────
  const baseW = BIOME_COUNT * ATLAS_STRIDE * TILE_PX;
  const baseCanvas = document.createElement('canvas');
  baseCanvas.width = baseW;
  baseCanvas.height = TILE_PX;
  const bctx = baseCanvas.getContext('2d')!;
  const img = bctx.createImageData(baseW, TILE_PX);
  for (let b = 0; b < BIOME_COUNT; b++) {
    for (let v = 0; v < VARIANTS_PER_BIOME; v++) paintSpeckle(img, baseW, (b * ATLAS_STRIDE + v) * TILE_PX, 0, b, v);
    // Anim slots get DISTINCT speckle phases so the water cycle shimmers even
    // before art exists (the drop contract's anim-2..4 replace these).
    for (let a = 0; a < 3; a++) paintSpeckle(img, baseW, (b * ATLAS_STRIDE + 4 + a) * TILE_PX, 0, b, 16 + a);
  }
  bctx.putImageData(img, 0, 0);
  for (const [biome, sheet] of art) {
    for (let v = 0; v < 4; v++) bctx.drawImage(sheet, v * TILE_PX, 0, TILE_PX, TILE_PX, (biome * ATLAS_STRIDE + v) * TILE_PX, 0, TILE_PX, TILE_PX);
    for (let a = 0; a < 3; a++) bctx.drawImage(sheet, (4 + a) * TILE_PX, 0, TILE_PX, TILE_PX, (biome * ATLAS_STRIDE + 4 + a) * TILE_PX, 0, TILE_PX, TILE_PX);
  }
  if (scene.textures.exists(PLACEHOLDER_ATLAS_KEY)) scene.textures.remove(PLACEHOLDER_ATLAS_KEY);
  scene.textures.addCanvas(PLACEHOLDER_ATLAS_KEY, baseCanvas);

  // ── Fringe atlas: 17 cols × 12 rows, named frames `${biome}:${cell}` ──────
  const fw = FRINGE_CELLS.length * TILE_PX;
  const fh = BIOME_COUNT * TILE_PX;
  const fCanvas = document.createElement('canvas');
  fCanvas.width = fw;
  fCanvas.height = fh;
  const fctx = fCanvas.getContext('2d')!;
  const fimg = fctx.createImageData(fw, fh);
  for (let b = 0; b < BIOME_COUNT; b++) {
    if (art.has(b)) continue; // painted from the sheet after the putImageData
    const base = BIOME_COLORS[b];
    const r0 = (base >> 16) & 0xff;
    const g0 = (base >> 8) & 0xff;
    const b0 = base & 0xff;
    FRINGE_CELLS.forEach((cell, ci) => {
      for (let y = 0; y < TILE_PX; y++) {
        for (let x = 0; x < TILE_PX; x++) {
          const c = fringeCoverage(cell, x, y);
          if (!(c > 0) || hash01(x ^ (ci * 97), y ^ (b * 131), 0x2c1b3c6d) >= c) continue;
          const d = 1 + (hash01(x + ci * 32, y, 0x51ed270b ^ (b * 31)) - 0.5) * 0.12;
          const o = ((b * TILE_PX + y) * fw + ci * TILE_PX + x) * 4;
          fimg.data[o] = Math.min(255, Math.round(r0 * d));
          fimg.data[o + 1] = Math.min(255, Math.round(g0 * d));
          fimg.data[o + 2] = Math.min(255, Math.round(b0 * d));
          fimg.data[o + 3] = 255;
        }
      }
    });
  }
  fctx.putImageData(fimg, 0, 0);
  for (const [biome, sheet] of art) {
    FRINGE_CELLS.forEach((cell, ci) => {
      const [col, row] = SHEET_CELL[cell];
      fctx.drawImage(sheet, col * TILE_PX, row * TILE_PX, TILE_PX, TILE_PX, ci * TILE_PX, biome * TILE_PX, TILE_PX, TILE_PX);
    });
  }
  if (scene.textures.exists(FRINGE_ATLAS_KEY)) scene.textures.remove(FRINGE_ATLAS_KEY);
  const ftex = scene.textures.addCanvas(FRINGE_ATLAS_KEY, fCanvas);
  if (ftex) {
    for (let b = 0; b < BIOME_COUNT; b++) {
      FRINGE_CELLS.forEach((cell, ci) => ftex.add(`${b}:${cell}`, 0, ci * TILE_PX, b * TILE_PX, TILE_PX, TILE_PX));
    }
  }
}

/** Pass 2 compatibility: first-boot atlas build (procedural only). */
export function ensurePlaceholderAtlas(scene: Phaser.Scene): void {
  if (scene.textures.exists(PLACEHOLDER_ATLAS_KEY)) return;
  buildTerrainAtlases(scene);
}

// ── Scatter props (drop-contract table lives in terrain-visuals-config) ──────
export function propTextureKey(id: string): string {
  return `terrain-prop-${id}`;
}

/** Fill color per silhouette class (PASS 9: the Pass 5 colors, now keyed by
 *  the prop's DECLARED class instead of its id prefix — same pixels for
 *  every shipped id, and a new class is a row here plus a draw case). */
const SILHOUETTE_FILL: Record<SilhouetteClass, string> = {
  conifer: '#16351f',
  broadleaf: '#1e4426',
  cactus: '#2c5e33',
  pillar: '#7d8ba8',
  lump: '#4c4a44',
  'fern-frond': '#2b5230',
  'shrub-blob': '#24462a',
  'log-lump': '#3d3226',
  stump: '#4a3b2b',
};

/** Boot-generated silhouettes (dark conifer triangle, broadleaf blob, boulder
 *  lump…) so scatter density is tunable before any art exists. Art prop drops
 *  replace these textures by key, nothing else changes. PASS 9: understory
 *  classes draw too, but nothing places them until a biome's understory
 *  palette is populated (every palette ships EMPTY). */
export function ensurePropPlaceholders(scene: Phaser.Scene): void {
  for (const [id, dim] of Object.entries(PROP_TABLE)) {
    const key = propTextureKey(id);
    if (scene.textures.exists(key)) continue;
    const cls = FLORA_PROPS[id]?.silhouette ?? 'lump';
    const c = document.createElement('canvas');
    c.width = dim.w;
    c.height = dim.h;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = SILHOUETTE_FILL[cls];
    if (cls === 'conifer') {
      ctx.beginPath();
      ctx.moveTo(dim.w / 2, 2);
      ctx.lineTo(dim.w - 6, dim.h - 10);
      ctx.lineTo(6, dim.h - 10);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(dim.w / 2 - 3, dim.h - 12, 6, 12);
    } else if (cls === 'broadleaf') {
      ctx.beginPath();
      ctx.arc(dim.w / 2, dim.h * 0.38, dim.w * 0.42, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(dim.w / 2 - 3, dim.h * 0.6, 6, dim.h * 0.4);
    } else if (cls === 'cactus') {
      ctx.fillRect(dim.w / 2 - 4, 6, 8, dim.h - 8);
      ctx.fillRect(6, dim.h * 0.35, dim.w - 12, 7);
    } else if (cls === 'pillar') {
      ctx.fillRect(dim.w / 2 - 6, 4, 12, dim.h - 6);
    } else if (cls === 'fern-frond') {
      // A low spray of fronds: three arcs fanning from the base.
      for (const lean of [-0.5, 0, 0.5]) {
        ctx.beginPath();
        ctx.moveTo(dim.w / 2, dim.h - 1);
        ctx.quadraticCurveTo(dim.w / 2 + lean * dim.w * 0.5, dim.h * 0.35, dim.w / 2 + lean * dim.w * 0.46, dim.h * 0.28);
        ctx.lineTo(dim.w / 2 + lean * dim.w * 0.3, dim.h * 0.5);
        ctx.closePath();
        ctx.fill();
      }
    } else if (cls === 'shrub-blob') {
      // A squat two-lobe bush sitting on the ground line.
      ctx.beginPath();
      ctx.ellipse(dim.w * 0.4, dim.h * 0.72, dim.w * 0.3, dim.h * 0.26, 0, 0, Math.PI * 2);
      ctx.ellipse(dim.w * 0.62, dim.h * 0.78, dim.w * 0.26, dim.h * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (cls === 'log-lump') {
      // A fallen trunk lying east-west, with a visible cut end.
      ctx.fillRect(dim.w * 0.08, dim.h * 0.62, dim.w * 0.84, dim.h * 0.28);
      ctx.beginPath();
      ctx.ellipse(dim.w * 0.08, dim.h * 0.76, dim.w * 0.06, dim.h * 0.14, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (cls === 'stump') {
      // A cut stump: short cylinder plus its top ellipse.
      ctx.fillRect(dim.w * 0.3, dim.h * 0.6, dim.w * 0.4, dim.h * 0.34);
      ctx.beginPath();
      ctx.ellipse(dim.w * 0.5, dim.h * 0.6, dim.w * 0.2, dim.h * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.ellipse(dim.w / 2, dim.h * 0.62, dim.w * 0.42, dim.h * 0.34, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    scene.textures.addCanvas(key, c);
  }
}

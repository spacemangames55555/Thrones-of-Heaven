import type { WashingtonMap, TerrainType } from './mapTypes';
import { TILE_SIZE } from '../render/tileAtlas';

/**
 * HEAVEN — the second, separate world's REGION MODEL + map generator.
 *
 * Heaven is authored here (not as a giant JSON like Earth's washington.map.json)
 * so it adds no bundle weight: the same {@link WashingtonMap} schema + the same
 * 32px tileset pipeline (GameMap) render it. It is roughly the size of Washington,
 * ethereal/divine, and EMPTY of content — an open expanse of holy ground, cloud,
 * and soft-gold fields ringed by a blocking "void" border so the player can't walk
 * off the edge, with a few void gaps to walk around. Prop landmarks (pillars / a
 * structure) are added as sprites by the scene (see MainScene.setupHeaven), not as
 * tiles.
 *
 * >>> TO EDIT HEAVEN'S TERRAIN: tune HEAVEN_TERRAIN (walk/block + look) and the
 *     fill rules in buildHeavenMapData below. <<<
 */

/** Heaven's terrain palette. ids are local to this map; keys map to atlas tiles. */
export const HEAVEN_TERRAIN: TerrainType[] = [
  { id: 1, key: 'holy_ground', name: 'Holy Ground', color: '#f4eed6', blocks: false },
  { id: 2, key: 'heaven_cloud', name: 'Cloud', color: '#e9f0fb', blocks: false },
  { id: 3, key: 'gold_field', name: 'Gold Field', color: '#ecd9a3', blocks: false },
  { id: 4, key: 'heaven_path', name: 'Radiant Path', color: '#ded0a4', blocks: false },
  { id: 5, key: 'heaven_void', name: 'Void', color: '#0a1124', blocks: true },
];

const HOLY = 1;
const CLOUD = 2;
const GOLD = 3;
const VOID = 5;

/** Heaven map dimensions — roughly Washington-sized (Washington is 800×800). */
export const HEAVEN_WIDTH = 720;
export const HEAVEN_HEIGHT = 720;
/** Blocking void border thickness (tiles) so the player can't leave the map. */
const BORDER = 8;

/** Cheap deterministic hash in [0,1) so the layout is stable across reloads. */
function hash(x: number, y: number): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

/** A few void "lakes" (centre tile + radius) to walk around — purely visual. */
const VOID_LAKES: { cx: number; cy: number; r: number }[] = [
  { cx: 240, cy: 250, r: 34 },
  { cx: 500, cy: 300, r: 46 },
  { cx: 330, cy: 520, r: 40 },
  { cx: 560, cy: 540, r: 30 },
];

/**
 * Build Heaven's map data procedurally (same schema as the Earth JSON). Returns a
 * single-zone {@link WashingtonMap}; GameMap stitches + renders it identically.
 */
export function buildHeavenMapData(): WashingtonMap {
  const W = HEAVEN_WIDTH;
  const H = HEAVEN_HEIGHT;
  const tiles: number[][] = [];
  for (let y = 0; y < H; y++) {
    const row = new Array<number>(W);
    for (let x = 0; x < W; x++) {
      // Blocking void border ring.
      if (x < BORDER || y < BORDER || x >= W - BORDER || y >= H - BORDER) {
        row[x] = VOID;
        continue;
      }
      // Interior void lakes (walk around them).
      let isLake = false;
      for (const l of VOID_LAKES) {
        if (Math.hypot(x - l.cx, y - l.cy) <= l.r) {
          isLake = true;
          break;
        }
      }
      if (isLake) {
        row[x] = VOID;
        continue;
      }
      // Soft, low-frequency blend of holy ground / cloud / gold so it reads as an
      // ethereal expanse rather than flat fill.
      const n = hash(Math.floor(x / 9), Math.floor(y / 9)) * 0.6 + hash(x, y) * 0.4;
      row[x] = n < 0.5 ? HOLY : n < 0.78 ? CLOUD : GOLD;
    }
    tiles.push(row);
  }

  return {
    name: 'Heaven',
    generated: 'runtime',
    tileSize: TILE_SIZE,
    width: W,
    height: H,
    zoneSize: W,
    zonesX: 1,
    zonesY: 1,
    terrain: HEAVEN_TERRAIN,
    spawn: { x: Math.floor(W / 2), y: Math.floor(H / 2) },
    cities: [],
    zones: [{ id: 'heaven', zx: 0, zy: 0, x: 0, y: 0, width: W, height: H, tiles }],
  };
}

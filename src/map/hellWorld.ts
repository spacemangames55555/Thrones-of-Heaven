import type { WashingtonMap, TerrainType } from './mapTypes';
import { TILE_SIZE } from '../render/tileAtlas';

/**
 * HELL — the third, separate world's REGION MODEL + map generator.
 *
 * Built procedurally here (no bundle weight) and rendered through the SAME 32px
 * tileset pipeline + multi-world system as Earth/Heaven. Roughly Washington-sized,
 * fire & brimstone, lightly seeded. Charred rock / ash / ember are walkable; LAVA
 * pools and the map-edge VOID are blocking (impassable — no lava damage this build).
 * Prop landmarks (spires, a lava pool, a distant "Satan's Lair" placeholder) are
 * added as sprites by the scene (MainScene.setupHell), not as tiles.
 *
 * >>> TO EDIT HELL'S TERRAIN: tune HELL_TERRAIN (walk/block + look) and the fill
 *     rules in buildHellMapData below. <<<
 */

export const HELL_TERRAIN: TerrainType[] = [
  { id: 1, key: 'charred_rock', name: 'Charred Rock', color: '#2a2320', blocks: false },
  { id: 2, key: 'ash_ground', name: 'Ash', color: '#4a423d', blocks: false },
  { id: 3, key: 'ember_rock', name: 'Ember Rock', color: '#3a241a', blocks: false },
  { id: 4, key: 'lava', name: 'Lava', color: '#e0531a', blocks: true },
  { id: 5, key: 'hell_void', name: 'Chasm', color: '#0a0606', blocks: true },
];

const ROCK = 1;
const ASH = 2;
const EMBER = 3;
const LAVA = 4;
const VOID = 5;

/** Hell map dimensions — roughly Washington-sized (Washington is 800×800). */
export const HELL_WIDTH = 720;
export const HELL_HEIGHT = 720;
/** Blocking void/chasm border thickness (tiles) so the player can't leave the map. */
const BORDER = 8;

/** Cheap deterministic hash in [0,1) so the layout is stable across reloads. */
function hash(x: number, y: number): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

/** Impassable LAVA pools (centre tile + radius) — fire-and-brimstone hazards to walk around. */
const LAVA_POOLS: { cx: number; cy: number; r: number }[] = [
  { cx: 250, cy: 240, r: 40 },
  { cx: 470, cy: 300, r: 52 },
  { cx: 320, cy: 500, r: 44 },
  { cx: 540, cy: 520, r: 36 },
  { cx: 200, cy: 430, r: 30 },
];

export function buildHellMapData(): WashingtonMap {
  const W = HELL_WIDTH;
  const H = HELL_HEIGHT;
  const tiles: number[][] = [];
  for (let y = 0; y < H; y++) {
    const row = new Array<number>(W);
    for (let x = 0; x < W; x++) {
      if (x < BORDER || y < BORDER || x >= W - BORDER || y >= H - BORDER) {
        row[x] = VOID; // chasm border (blocks)
        continue;
      }
      let inLava = false;
      for (const l of LAVA_POOLS) {
        if (Math.hypot(x - l.cx, y - l.cy) <= l.r) {
          inLava = true;
          break;
        }
      }
      if (inLava) {
        row[x] = LAVA; // impassable
        continue;
      }
      // A scorched blend of charred rock / ash / ember so it reads as infernal ground.
      const n = hash(Math.floor(x / 9), Math.floor(y / 9)) * 0.6 + hash(x, y) * 0.4;
      row[x] = n < 0.58 ? ROCK : n < 0.82 ? ASH : EMBER;
    }
    tiles.push(row);
  }

  return {
    name: 'Hell',
    generated: 'runtime',
    tileSize: TILE_SIZE,
    width: W,
    height: H,
    zoneSize: W,
    zonesX: 1,
    zonesY: 1,
    terrain: HELL_TERRAIN,
    spawn: { x: Math.floor(W / 2), y: Math.floor(H / 2) },
    cities: [],
    zones: [{ id: 'hell', zx: 0, zy: 0, x: 0, y: 0, width: W, height: H, tiles }],
  };
}

/**
 * Where Hell's demons stand — EDITABLE placement data (LOCAL Hell pixels; the
 * scene adds the Hell world offset). The arrival / return gate sit at the map
 * centre ≈ (HELL_WIDTH*16, HELL_HEIGHT*16) ≈ (11520, 11520).
 */
export const HELL_DEMON_SPAWNS: { x: number; y: number }[] = [
  { x: 11520, y: 11040 }, // north of the gate (first encounter)
  { x: 10900, y: 11380 }, // west
  { x: 12140, y: 11380 }, // east
  { x: 10720, y: 12000 }, // south-west
  { x: 12320, y: 12000 }, // south-east
  { x: 11520, y: 10500 }, // deeper north
];

/**
 * The distant "SATAN'S LAIR" — a placeholder marker/structure for the future
 * final-boss site (purely visual/collision; no interaction this build). LOCAL
 * Hell pixels, deep in Hell's north.
 */
export const SATAN_LAIR = { x: 11520, y: 8600 };

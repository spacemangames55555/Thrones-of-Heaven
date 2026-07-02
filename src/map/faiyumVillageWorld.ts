import type { WashingtonMap, TerrainType } from './mapTypes';
import { TILE_SIZE } from '../render/tileAtlas';

/**
 * THE FAIYUM HOME VILLAGE — the first NESTED CITY sub-map (the pilot for the
 * generic city system, see src/world/cities.ts).
 *
 * A city is just a very small WORLD: this module builds its map data with the
 * same {@link WashingtonMap} schema Heaven/Hell use (authored in code, no JSON,
 * no bundle weight), and MainScene.setupCities registers it on the world
 * registry at its own coordinate offset. Placeholder tiles only — every key
 * here already exists in the shared atlas (village walls reuse wadi rock,
 * houses reuse the town stamps, the mill reuses the distinct inn roof).
 *
 * >>> TO EDIT THE VILLAGE: tune the constants + the layout steps in
 *     buildFaiyumVillageMapData below (sizes, houses, the mill, palms). <<<
 */

/** Village map dimensions (tiles) — small on purpose; a city loads instantly. */
export const VILLAGE_WIDTH = 60;
export const VILLAGE_HEIGHT = 60;

/** The wall ring inset from the map edge (tiles of open fringe outside it). */
const WALL_INSET = 2;

/** Local terrain palette (ids local to this map; keys map to shared atlas tiles). */
export const VILLAGE_TERRAIN: TerrainType[] = [
  { id: 1, key: 'palm_oasis', name: 'Oasis Green', color: '#3c8f4e', blocks: false },
  { id: 2, key: 'irrigated_field', name: 'Garden Plot', color: '#7fae3f', blocks: false },
  { id: 3, key: 'dune_sand', name: 'Sand', color: '#e2c07a', blocks: false },
  { id: 4, key: 'town_ground', name: 'Village Ground', color: '#7a6647', blocks: false },
  { id: 5, key: 'town_road', name: 'Pathway', color: '#a8946a', blocks: false },
  { id: 6, key: 'town_plaza', name: 'Village Square', color: '#b8b0a0', blocks: false },
  { id: 7, key: 'town_building', name: 'House', color: '#5b3b26', blocks: true },
  { id: 8, key: 'town_inn', name: 'The Mill', color: '#a05a2c', blocks: true },
  { id: 9, key: 'town_door', name: 'Doorway', color: '#ffcf57', blocks: false },
  { id: 10, key: 'town_tree', name: 'Palm', color: '#1e5233', blocks: true },
  { id: 11, key: 'wadi_rock', name: 'Village Wall', color: '#8a6f4d', blocks: true },
  { id: 12, key: 'lake', name: 'The Well', color: '#2b5c86', blocks: true },
];

const GREEN = 1;
const GARDEN = 2;
const SAND = 3;
const GROUND = 4;
const PATH = 5;
const PLAZA = 6;
const HOUSE = 7;
const MILL = 8;
const DOOR = 9;
const PALM = 10;
const WALL = 11;
const WELL = 12;

/** The exit gate tiles in the SOUTH wall (3 wide, centered) + key waypoints. */
export const VILLAGE_GATE_TILE = { x: 29, y: VILLAGE_HEIGHT - WALL_INSET - 1 }; // gate center (y=57)
/** Where the player lands when ENTERING (just inside the gate, on the path). */
export const VILLAGE_INSIDE_ARRIVAL_TILE = { x: 29, y: VILLAGE_GATE_TILE.y - 3 };
/** The MILL door-front tile (the future Q1 giver's home; the dev arrow target). */
export const VILLAGE_MILL_TILE = { x: 44, y: 30 };

/** Cheap deterministic hash in [0,1) so the layout is stable across reloads. */
function hash(x: number, y: number): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

/** Build the village map data (same schema as every other world's map). */
export function buildFaiyumVillageMapData(): WashingtonMap {
  const W = VILLAGE_WIDTH;
  const H = VILLAGE_HEIGHT;
  const lo = WALL_INSET;
  const hiX = W - WALL_INSET - 1;
  const hiY = H - WALL_INSET - 1;

  // 1) Base fill: sandy fringe outside the walls; an oasis-green blend inside.
  const tiles: number[][] = [];
  for (let y = 0; y < H; y++) {
    const row = new Array<number>(W);
    for (let x = 0; x < W; x++) {
      if (x < lo || y < lo || x > hiX || y > hiY) {
        row[x] = SAND;
        continue;
      }
      const n = hash(Math.floor(x / 5), Math.floor(y / 5)) * 0.6 + hash(x, y) * 0.4;
      row[x] = n < 0.55 ? GREEN : n < 0.8 ? GROUND : GARDEN;
    }
    tiles.push(row);
  }
  const put = (x: number, y: number, id: number): void => {
    if (x >= 0 && y >= 0 && x < W && y < H) tiles[y][x] = id;
  };
  const rect = (x0: number, y0: number, w: number, h: number, id: number): void => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) put(x, y, id);
  };

  // 2) The wall ring (blocking) with the 3-wide SOUTH GATE opening.
  for (let x = lo; x <= hiX; x++) {
    put(x, lo, WALL);
    put(x, hiY, WALL);
  }
  for (let y = lo; y <= hiY; y++) {
    put(lo, y, WALL);
    put(hiX, y, WALL);
  }
  for (let gx = VILLAGE_GATE_TILE.x - 1; gx <= VILLAGE_GATE_TILE.x + 1; gx++) put(gx, hiY, DOOR);

  // 3) The central square: plaza + the WELL at its middle.
  rect(24, 24, 11, 9, PLAZA);
  rect(29, 28, 1, 1, WELL);

  // 4) Pathways: gate → square, plus an east-west lane through the square.
  rect(VILLAGE_GATE_TILE.x - 1, 33, 3, hiY - 33, PATH); // south lane (gate → plaza)
  rect(8, 28, 16, 2, PATH); // west lane
  rect(35, 28, 17, 2, PATH); // east lane (→ the mill)
  rect(28, 12, 3, 12, PATH); // north lane

  // 5) Houses: solid stamps with a doorway on the south face (visual for now —
  //    interiors/NPCs come with the questline batches).
  const house = (x0: number, y0: number, w: number, h: number, id = HOUSE): void => {
    rect(x0, y0, w, h, id);
    put(x0 + Math.floor(w / 2), y0 + h - 1, DOOR);
    put(x0 + Math.floor(w / 2), y0 + h, GROUND); // clear a doorstep
  };
  house(10, 12, 6, 5);
  house(44, 12, 6, 5);
  house(10, 40, 7, 5);
  house(43, 42, 6, 5);
  house(18, 19, 5, 4);
  house(36, 40, 5, 4);

  // 6) THE MILL — the future Q1 giver's home. Visually distinct: the inn-orange
  //    roof (nothing else in the village uses it), garden plots hugging its east
  //    side, and its own nameplate (cities list below).
  house(40, 24, 8, 6, MILL);
  rect(49, 24, 5, 8, GARDEN);

  // 7) Palm scatter on remaining green (blocking, decorative) — sparse and kept
  //    off the lanes/square so it can never seal a route.
  for (let y = lo + 2; y < hiY - 2; y++) {
    for (let x = lo + 2; x < hiX - 2; x++) {
      if (tiles[y][x] !== GREEN) continue;
      if (hash(x * 3 + 1, y * 7 + 5) < 0.055) put(x, y, PALM);
    }
  }

  return {
    name: 'Faiyum Village',
    generated: 'runtime',
    tileSize: TILE_SIZE,
    width: W,
    height: H,
    zoneSize: W,
    zonesX: 1,
    zonesY: 1,
    terrain: VILLAGE_TERRAIN,
    spawn: { ...VILLAGE_INSIDE_ARRIVAL_TILE },
    // Nameplates INSIDE the village (CityMarkers renders them; the readout's
    // nearest-city line names them too).
    cities: [
      // The nameplate sits on the mill's face, one tile above its (walkable) door.
      { name: 'The Mill', tx: VILLAGE_MILL_TILE.x, ty: VILLAGE_MILL_TILE.y - 2 },
      { name: 'The Well', tx: 29, ty: 27 },
      { name: 'South Gate', tx: VILLAGE_GATE_TILE.x, ty: VILLAGE_GATE_TILE.y - 1 },
    ],
    zones: [{ id: 'faiyum-village', zx: 0, zy: 0, x: 0, y: 0, width: W, height: H, tiles }],
  };
}

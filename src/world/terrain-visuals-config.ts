import { Biome } from './terrain-schema';

/**
 * TERRAIN VISUALS CONFIG (Pass 5) — the LOCKED render model for the terrain
 * art pipeline. Art drops swap texture sources; nothing here changes shape.
 */

/** Fringe draw priority, LOW → HIGH (higher-priority biomes fringe onto
 *  lower-priority neighbors). LOCKED — the priority-lock gate pins it. */
export const TERRAIN_PRIORITY: readonly number[] = [
  Biome.OCEAN,
  Biome.FRESHWATER,
  Biome.BEACH,
  Biome.DESERT,
  Biome.SAVANNA,
  Biome.GRASS,
  Biome.SWAMP,
  Biome.TUNDRA,
  Biome.TAIGA,
  Biome.FOREST,
  Biome.SNOW,
  Biome.ROCK,
];
export const PRIORITY_RANK: Record<number, number> = Object.fromEntries(TERRAIN_PRIORITY.map((b, i) => [b, i]));

/** Overlay budget per tile: overflow trims lowest priority first. */
export const OVERLAY_MAX_BIOMES = 2;
export const OVERLAY_MAX_QUADS = 4;

/** Scatter densities per biome (probability per scatter-allowed tile). */
export const SCATTER_DENSITY: Record<number, number> = {
  [Biome.FOREST]: 0.3,
  [Biome.TAIGA]: 0.22,
  [Biome.SWAMP]: 0.15,
  [Biome.ROCK]: 0.05,
  [Biome.DESERT]: 0.03,
};
/** Hard pool caps (view-driven pools; culled to the load ring). */
export const SCATTER_POOL_CAP = 900;
export const FRINGE_POOL_CAP = 2600;

/** The 17 fringe geometries, in SHEET order (rows 1–3 of the drop contract). */
export const FRINGE_CELLS = [
  'edge-n',
  'edge-e',
  'edge-s',
  'edge-w',
  'corner-out-ne',
  'corner-out-se',
  'corner-out-sw',
  'corner-out-nw',
  'corner-in-ne',
  'corner-in-se',
  'corner-in-sw',
  'corner-in-nw',
  'cap-open-n',
  'cap-open-e',
  'cap-open-s',
  'cap-open-w',
  'island',
] as const;
export type FringeCell = (typeof FRINGE_CELLS)[number];

/** Sheet cell → [col, row] in the 8×4 / 32 px drop-contract grid. */
export const SHEET_CELL: Record<string, [number, number]> = {
  'base-0': [0, 0],
  'base-1': [1, 0],
  'base-2': [2, 0],
  'base-3': [3, 0],
  'anim-2': [4, 0],
  'anim-3': [5, 0],
  'anim-4': [6, 0],
  'edge-n': [0, 1],
  'edge-e': [1, 1],
  'edge-s': [2, 1],
  'edge-w': [3, 1],
  'corner-out-ne': [4, 1],
  'corner-out-se': [5, 1],
  'corner-out-sw': [6, 1],
  'corner-out-nw': [7, 1],
  'corner-in-ne': [0, 2],
  'corner-in-se': [1, 2],
  'corner-in-sw': [2, 2],
  'corner-in-nw': [3, 2],
  'cap-open-n': [4, 2],
  'cap-open-e': [5, 2],
  'cap-open-s': [6, 2],
  'cap-open-w': [7, 2],
  island: [0, 3],
};

export interface NeighborMask {
  n: boolean;
  e: boolean;
  s: boolean;
  w: boolean;
  ne: boolean;
  se: boolean;
  sw: boolean;
  nw: boolean;
}

/**
 * PURE fringe selection from the 4-edge mask + diagonals (the locked rules):
 * single edge → edge · adjacent pair → corner-out · opposite pair → both
 * edges stacked · triple → cap-open toward the missing edge · all four →
 * island · a diagonal with NEITHER of its adjacent edges set → corner-in nub
 * (auto-suppressed when either adjacent edge is set).
 */
export function fringePiecesForMask(m: NeighborMask): FringeCell[] {
  const out: FringeCell[] = [];
  const count = (m.n ? 1 : 0) + (m.e ? 1 : 0) + (m.s ? 1 : 0) + (m.w ? 1 : 0);
  if (count === 4) out.push('island');
  else if (count === 3) {
    if (!m.n) out.push('cap-open-n');
    else if (!m.e) out.push('cap-open-e');
    else if (!m.s) out.push('cap-open-s');
    else out.push('cap-open-w');
  } else if (count === 2) {
    if (m.n && m.e) out.push('corner-out-ne');
    else if (m.e && m.s) out.push('corner-out-se');
    else if (m.s && m.w) out.push('corner-out-sw');
    else if (m.w && m.n) out.push('corner-out-nw');
    else if (m.n && m.s) out.push('edge-n', 'edge-s');
    else out.push('edge-e', 'edge-w');
  } else if (count === 1) {
    if (m.n) out.push('edge-n');
    else if (m.e) out.push('edge-e');
    else if (m.s) out.push('edge-s');
    else out.push('edge-w');
  }
  if (m.ne && !m.n && !m.e) out.push('corner-in-ne');
  if (m.se && !m.s && !m.e) out.push('corner-in-se');
  if (m.sw && !m.s && !m.w) out.push('corner-in-sw');
  if (m.nw && !m.n && !m.w) out.push('corner-in-nw');
  return out;
}

/** Biome id → drop-contract sheet filename stem (/public/art/terrain/{stem}.png). */
export const BIOME_SHEET_NAME: Record<number, string> = {
  [Biome.OCEAN]: 'ocean',
  [Biome.FRESHWATER]: 'freshwater',
  [Biome.BEACH]: 'beach',
  [Biome.GRASS]: 'grass',
  [Biome.SAVANNA]: 'savanna',
  [Biome.DESERT]: 'desert',
  [Biome.FOREST]: 'forest',
  [Biome.TAIGA]: 'taiga',
  [Biome.TUNDRA]: 'tundra',
  [Biome.SNOW]: 'snow',
  [Biome.ROCK]: 'rock',
  [Biome.SWAMP]: 'swamp',
};

/** Scatter prop drop contract (/public/art/terrain/props/{id}.png, exact px). */
export const PROP_TABLE: Record<string, { w: number; h: number }> = {
  'tree-fir-a': { w: 48, h: 64 },
  'tree-fir-b': { w: 48, h: 64 },
  'tree-broad-a': { w: 48, h: 64 },
  'tree-broad-b': { w: 48, h: 64 },
  'boulder-a': { w: 32, h: 32 },
  'boulder-b': { w: 32, h: 32 },
  'cactus-a': { w: 32, h: 48 },
  'scrub-a': { w: 32, h: 32 },
  'swamp-tree-a': { w: 48, h: 64 },
  'swamp-tree-b': { w: 48, h: 64 },
  waystone: { w: 32, h: 64 },
};

/** Which props a scatter roll can pick per biome (hash-indexed, LOCKED order). */
export const SCATTER_PROPS: Record<number, readonly string[]> = {
  [Biome.FOREST]: ['tree-broad-a', 'tree-broad-b', 'tree-fir-a'],
  [Biome.TAIGA]: ['tree-fir-a', 'tree-fir-b'],
  [Biome.SWAMP]: ['swamp-tree-a', 'swamp-tree-b'],
  [Biome.ROCK]: ['boulder-a', 'boulder-b'],
  [Biome.DESERT]: ['cactus-a', 'scrub-a'],
};

/** MAP_PALETTE (Pass 6A): the world-map overview colors — CARTOGRAPHIC
 *  (physical-atlas hues modulated by hillshade at bake time), deliberately
 *  NOT the placeholder speckle palette. The worldmap bake and the
 *  worldmap-parity gate both read exactly this table (art restyle slot —
 *  parchment/atlas pass — is ledgered). */
export const MAP_PALETTE: Record<number, number> = {
  [Biome.OCEAN]: 0x5d89b3,
  [Biome.FRESHWATER]: 0x7fb3d4,
  [Biome.BEACH]: 0xe6d9a8,
  [Biome.GRASS]: 0xa9c489,
  [Biome.SAVANNA]: 0xd6c883,
  [Biome.DESERT]: 0xe8d3a0,
  [Biome.FOREST]: 0x6f9e63,
  [Biome.TAIGA]: 0x86a98a,
  [Biome.TUNDRA]: 0xc7c9b0,
  [Biome.SNOW]: 0xf4f6f4,
  [Biome.ROCK]: 0xa89a8c,
  [Biome.SWAMP]: 0x8fae7e,
};
/** Worldmap image width (px); height follows the world aspect exactly. */
export const WORLDMAP_WIDTH = 2048;

/** Water shimmer: anim slots 4–6 cycle at this period (art frames when
 *  dropped; distinct procedural speckle phases in the fallback). */
export const WATER_ANIM_MS = 450;
/** Below these camera zooms the detail is sub-pixel — pools go dormant. */
export const FRINGE_MIN_ZOOM = 0.2;
export const SCATTER_MIN_ZOOM = 0.15;

export interface OverlayQuad {
  biome: number;
  cell: FringeCell;
}

/**
 * Overlay selection for one tile: for each DISTINCT higher-priority
 * neighboring biome build its mask and take its pieces; enforce the budget
 * (≤ OVERLAY_MAX_BIOMES biomes, ≤ OVERLAY_MAX_QUADS quads) trimming the
 * LOWEST priority first. Result is in draw order (lower priority first, so
 * higher-priority fringes draw on top).
 */
export function selectOverlays(tileBiome: number, nb: { n: number; e: number; s: number; w: number; ne: number; se: number; sw: number; nw: number }): OverlayQuad[] {
  const mine = PRIORITY_RANK[tileBiome] ?? 0;
  const biomes = new Set<number>();
  for (const b of [nb.n, nb.e, nb.s, nb.w, nb.ne, nb.se, nb.sw, nb.nw]) {
    if ((PRIORITY_RANK[b] ?? 0) > mine) biomes.add(b);
  }
  let list = [...biomes].sort((a, b) => PRIORITY_RANK[a] - PRIORITY_RANK[b]);
  if (list.length > OVERLAY_MAX_BIOMES) list = list.slice(list.length - OVERLAY_MAX_BIOMES); // trim lowest priority
  const quads: OverlayQuad[] = [];
  for (const b of list) {
    const mask: NeighborMask = {
      n: nb.n === b,
      e: nb.e === b,
      s: nb.s === b,
      w: nb.w === b,
      ne: nb.ne === b,
      se: nb.se === b,
      sw: nb.sw === b,
      nw: nb.nw === b,
    };
    for (const cell of fringePiecesForMask(mask)) quads.push({ biome: b, cell });
  }
  while (quads.length > OVERLAY_MAX_QUADS) {
    // Trim the lowest-priority biome's quads first (they sit at the front).
    quads.shift();
  }
  return quads;
}

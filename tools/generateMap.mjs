/**
 * Thrones of Heaven — Washington State map generator (large, enriched build).
 *
 * AUTHORED region model: every region (Pacific coast, Olympic rainforest, Puget
 * Sound + Hood Canal, the urban lowland corridor, the Cascade crest with its
 * passes, the Columbia Basin shrub-steppe, the channeled scablands, the Palouse
 * wheat country, the Okanogan highlands, the Columbia/Snake rivers) is placed by
 * hand-tuned geometry in normalised 0..1 coordinates, then sampled onto an
 * 800 x 500 tile grid. Because the geography is normalised, the whole map —
 * cities, rivers, bridges, the town anchor — re-derives cleanly at any size:
 * change WIDTH/HEIGHT and re-run.
 *
 * Output: src/map/washington.map.json — clean custom JSON, organised into zone
 * chunks so streaming can be added later without a rewrite.
 *
 * Run:  node tools/generateMap.mjs
 */

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Grid configuration. Washington occupies the original WA_ROWS rows; Oregon is
// appended below as OR_ROWS more rows of ONE continuous landmass on the SAME
// coordinate space. Washington features stay anchored to WA_ROWS (nyWA), so WA
// is byte-identical to before — only the former ocean south of the Columbia is
// reclaimed as Oregon. Change any of these and re-run.
// ---------------------------------------------------------------------------
// Idaho is APPENDED on the EAST as NEW columns, WITHOUT rescaling WA/OR. The WA/OR
// geography is normalised over its ORIGINAL width (WAOR_WIDTH) so every existing tile
// keeps its exact pixel coordinate; only columns >= WAOR_WIDTH are new Idaho land.
const WAOR_WIDTH = 800; // original WA+OR width — DO NOT change (keeps WA/OR pixel-stable)
const IDAHO_COLS = 300; // appended Idaho columns on the east (px 25,600 -> 35,168)
const WIDTH = WAOR_WIDTH + IDAHO_COLS; // total grid width (tiles, west -> east)
const WA_ROWS = 500;   // original Washington rows (all WA geography anchors here)
const OR_ROWS = 300;   // appended Oregon rows to the south
const HEIGHT = WA_ROWS + OR_ROWS; // 800 — continuous WA+OR (Idaho fills all rows east)
const TILE_SIZE = 32;
const ZONE_SIZE = 32;

// ---------------------------------------------------------------------------
// Terrain types. `id` is also the tileset frame index used by the renderer.
// ids 0–9 and 19 are the original set; ids 20+ are the new richer terrains.
// (ids 10–18 are reserved at runtime for town tiles — see src/town/townTiles.ts.)
// ---------------------------------------------------------------------------
const TERRAIN = [
  { id: 0,  key: 'ocean',      name: 'Pacific Ocean',        color: '#16335f', blocks: true },
  { id: 1,  key: 'sound',      name: 'Puget Sound',          color: '#2f6fae', blocks: true },
  { id: 2,  key: 'river',      name: 'River',                color: '#3f8fcf', blocks: true },
  { id: 3,  key: 'beach',      name: 'Beach / Coast',        color: '#ddca97', blocks: false },
  { id: 4,  key: 'grassland',  name: 'Meadow / Grassland',   color: '#76b14e', blocks: false },
  { id: 5,  key: 'forest',     name: 'Lowland Forest',       color: '#3f7d3f', blocks: false },
  { id: 6,  key: 'foothills',  name: 'Foothills',            color: '#8a8a52', blocks: false },
  { id: 7,  key: 'mountain',   name: 'Alpine Peak',          color: '#e0e7ee', blocks: true },
  { id: 8,  key: 'steppe',     name: 'Shrub-Steppe',         color: '#cdb37a', blocks: false },
  { id: 9,  key: 'urban',      name: 'Urban / Town',         color: '#9a9aa2', blocks: false },
  { id: 19, key: 'bridge',     name: 'Bridge',               color: '#a9742f', blocks: false },
  { id: 20, key: 'lake',       name: 'Lake',                 color: '#2b5c86', blocks: true },
  { id: 21, key: 'rainforest', name: 'Coastal Rainforest',   color: '#1f7a55', blocks: false },
  { id: 22, key: 'montane',    name: 'Montane Forest',       color: '#245f37', blocks: false },
  { id: 23, key: 'scabland',   name: 'Scabland / Coulee',    color: '#9c8a63', blocks: false },
  { id: 24, key: 'farmland',   name: 'Palouse Farmland',     color: '#d7c24f', blocks: false },
  { id: 25, key: 'wetland',    name: 'Wetland / Marsh',      color: '#5f8d6a', blocks: false },
  { id: 26, key: 'pass',       name: 'Mountain Pass',        color: '#b7ad86', blocks: false },
];
const T = Object.fromEntries(TERRAIN.map((t) => [t.key, t.id]));

// ---------------------------------------------------------------------------
// Geometry + noise helpers (normalised 0..1 coords; nx west→east, ny north→south)
// ---------------------------------------------------------------------------
function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

function projToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return { x: x1 + t * dx, y: y1 + t * dy, dx, dy, len2 };
}

function distToPolyline(px, py, pts) {
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const p = projToSegment(px, py, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
    best = Math.min(best, dist(px, py, p.x, p.y));
  }
  return best;
}

// Nearest point on a polyline plus the local tangent (for bridge orientation).
function nearestOnPolyline(px, py, pts) {
  let best = Infinity;
  let res = { x: pts[0][0], y: pts[0][1], dx: 1, dy: 0 };
  for (let i = 0; i < pts.length - 1; i++) {
    const p = projToSegment(px, py, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
    const d = dist(px, py, p.x, p.y);
    if (d < best) {
      best = d;
      res = { x: p.x, y: p.y, dx: p.dx, dy: p.dy };
    }
  }
  return res;
}

// Deterministic value noise (smooth, repeatable) for organic region edges.
function hash2(x, y) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
function vnoise(x, y) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const tl = hash2(xi, yi);
  const tr = hash2(xi + 1, yi);
  const bl = hash2(xi, yi + 1);
  const br = hash2(xi + 1, yi + 1);
  return (
    tl * (1 - u) * (1 - v) + tr * u * (1 - v) + bl * (1 - u) * v + br * u * v
  );
}
// Fractal noise in normalised space (returns roughly -1..1).
function fbm(nx, ny, freq) {
  let a = 0;
  let amp = 0.6;
  let f = freq;
  for (let o = 0; o < 3; o++) {
    a += (vnoise(nx * f, ny * f) - 0.5) * 2 * amp;
    f *= 2;
    amp *= 0.5;
  }
  return a;
}

// ---------------------------------------------------------------------------
// Authored geography (normalised; tuned against a real WA map)
// ---------------------------------------------------------------------------

// Puget Sound + Hood Canal.
const PUGET = [
  [0.345, 0.075], [0.350, 0.135], [0.342, 0.200], [0.330, 0.260],
  [0.335, 0.320], [0.330, 0.380], [0.320, 0.440], [0.300, 0.500], [0.300, 0.545],
];
const HOOD = [
  [0.300, 0.150], [0.285, 0.230], [0.275, 0.310], [0.285, 0.390], [0.305, 0.450],
];

// Columbia River: enters north, big bend, turns west to the Pacific.
const COLUMBIA = [
  [0.655, -0.02], [0.640, 0.10], [0.660, 0.22], [0.705, 0.34],
  [0.715, 0.46], [0.722, 0.60], [0.700, 0.70], [0.640, 0.745],
  [0.540, 0.775], [0.420, 0.800], [0.300, 0.815], [0.180, 0.820],
  [0.100, 0.805], [0.050, 0.790],
];
const SNAKE = [
  [1.02, 0.640], [0.900, 0.660], [0.800, 0.690], [0.722, 0.700],
];
// Tributaries (thin; their headwaters end in walkable land so they never seal).
const SKAGIT = [[0.452, 0.108], [0.410, 0.118], [0.378, 0.128], [0.356, 0.138]];
const YAKIMA = [[0.575, 0.520], [0.620, 0.580], [0.665, 0.640], [0.705, 0.685]];
const WENATCHEE_R = [[0.585, 0.400], [0.620, 0.420], [0.652, 0.432]];
const SPOKANE_R = [[0.985, 0.235], [0.900, 0.265], [0.820, 0.300]];
const TRIBUTARIES = [SKAGIT, YAKIMA, WENATCHEE_R, SPOKANE_R];

// Southern border (lower Columbia in the west, straight Oregon line in the SE).
const SOUTH_BORDER = [
  [0.000, 0.790], [0.100, 0.805], [0.180, 0.822], [0.300, 0.815],
  [0.420, 0.800], [0.540, 0.775], [0.660, 0.748], [0.720, 0.730],
  [0.860, 0.760], [1.000, 0.800],
];
function southBorderNy(nx) {
  for (let i = 0; i < SOUTH_BORDER.length - 1; i++) {
    const [x1, y1] = SOUTH_BORDER[i];
    const [x2, y2] = SOUTH_BORDER[i + 1];
    if (nx >= x1 && nx <= x2) {
      const t = (nx - x1) / (x2 - x1);
      return y1 + t * (y2 - y1);
    }
  }
  return 0.80;
}

// Mountains. Olympic core + Cascade peaks along the crest.
const OLYMPIC = { x: 0.150, y: 0.250, r: 0.070 };
const PEAKS = [
  { name: 'Baker',       x: 0.560, y: 0.085, r: 0.030 },
  { name: 'Glacier Peak', x: 0.560, y: 0.300, r: 0.028 },
  { name: 'Rainier',     x: 0.548, y: 0.500, r: 0.040 },
  { name: 'Adams',       x: 0.598, y: 0.660, r: 0.030 },
  { name: 'St Helens',   x: 0.520, y: 0.690, r: 0.026 },
];
const CREST_X = 0.560;
const CREST_HALF = 0.040;
const PASSES = [0.200, 0.420, 0.585]; // 3 walkable crossings of the crest

// Lakes (block).
const LAKE_CRESCENT = [[0.095, 0.180], [0.130, 0.182], [0.160, 0.185]]; // Olympic, E-W
const LAKE_CHELAN = [[0.600, 0.250], [0.628, 0.300], [0.652, 0.345]];   // long NW->SE fjord
const LAKE_WASHINGTON = { x: 0.408, y: 0.330, rx: 0.005, ry: 0.026 };   // east of Seattle (room for the town)
const BANKS_LAKE = [[0.770, 0.360], [0.772, 0.420]];                     // Grand Coulee

// Wetland / marsh patches (estuaries).
const WETLANDS = [
  { x: 0.360, y: 0.135, r: 0.030 }, // Skagit delta
  { x: 0.305, y: 0.540, r: 0.026 }, // south Sound / Nisqually
  { x: 0.230, y: 0.560, r: 0.024 }, // Grays Harbor estuary
];

// City anchors (normalised). Used for urban tiles, markers, spawn, town & bridges.
const CITIES = [
  { name: 'Seattle',     x: 0.370, y: 0.330 },
  { name: 'Tacoma',      x: 0.355, y: 0.430 },
  { name: 'Olympia',     x: 0.318, y: 0.560 },
  { name: 'Everett',     x: 0.378, y: 0.250 },
  { name: 'Bellingham',  x: 0.388, y: 0.072 },
  { name: 'Spokane',     x: 0.880, y: 0.250 },
  { name: 'Yakima',      x: 0.600, y: 0.620 },
  { name: 'Tri-Cities',  x: 0.715, y: 0.690 },
  { name: 'Vancouver',   x: 0.470, y: 0.778 },
  { name: 'Wenatchee',   x: 0.660, y: 0.430 },
  { name: 'Walla Walla', x: 0.840, y: 0.715 },
];

// ---------------------------------------------------------------------------
// Oregon — continuous southern extension. Authored in the SAME normalised x and
// the SAME WA-anchored latitude space (nyWA = ty/(WA_ROWS-1)), continuing south
// of the Columbia/parallel border so the Cascades and coast line up across the
// seam. Intentionally SPARSE in the normal world. Cities' y may exceed 1.0 (they
// are just nyWA values south of Washington).
// ---------------------------------------------------------------------------
const OR_CITIES = [
  { name: 'Portland', x: 0.470, y: 0.820 }, // just S of the Columbia, on the valley
  { name: 'Salem',    x: 0.452, y: 0.892 },
  { name: 'Eugene',   x: 0.448, y: 0.988 },
  { name: 'Bend',     x: 0.610, y: 0.966 }, // E of the Cascades (high desert)
  { name: 'Medford',  x: 0.470, y: 1.108 },
];
const OR_PEAKS = [
  { name: 'Hood',          x: 0.556, y: 0.836, r: 0.030 }, // prominent, near the north
  { name: 'Jefferson',     x: 0.560, y: 0.918, r: 0.024 },
  { name: 'Three Sisters', x: 0.566, y: 0.992, r: 0.026 },
  { name: 'McLoughlin',    x: 0.560, y: 1.150, r: 0.022 },
];
const OR_PASSES = [0.900, 1.060]; // walkable Cascade crossings in Oregon

function isOregon(nx, nyWA) {
  return nyWA > southBorderNy(nx) + 0.004;
}
function nearOregonPass(nyWA) {
  return OR_PASSES.some((p) => Math.abs(nyWA - p) < 0.030);
}
function isOregonAlpine(nx, nyWA, n) {
  for (const p of OR_PEAKS) if (dist(nx, nyWA, p.x, p.y) < p.r + n * 0.006) return true;
  const onCrest = Math.abs(nx - crestXAt(nyWA) + n * 0.010) < CREST_HALF * 0.6;
  return onCrest && !nearOregonPass(nyWA);
}
function oregonLand(nx, nyWA, n) {
  // Sparse cities (urban cores).
  for (const c of OR_CITIES) if (dist(nx, nyWA, c.x, c.y) < 0.010) return T.urban;

  if (isOregonAlpine(nx, nyWA, n)) return T.mountain;

  const crest = crestXAt(nyWA);
  const distCrest = nx - crest;
  // The Cascade crest continues south: a walkable pass band, else foothills.
  if (Math.abs(distCrest + n * 0.010) < CREST_HALF) return nearOregonPass(nyWA) ? T.pass : T.foothills;
  if (Math.abs(distCrest) < CREST_HALF * 2.0) return T.foothills;

  if (nx < crest) {
    // West of the crest.
    if (nx < oceanEdge(nyWA) + 0.012) return T.beach;                            // Pacific beach
    if (nx < 0.20) return fbm(nx, nyWA, 55) > 0.2 ? T.foothills : T.montane;     // Coast Range
    if (nx < 0.52) return fbm(nx, nyWA, 40) > 0.15 ? T.farmland : T.grassland;   // Willamette Valley
    return fbm(nx, nyWA, 55) > 0.3 ? T.foothills : T.montane;                    // W Cascade slope
  }

  // East of the crest — high desert, with forested Blue Mountains in the NE.
  if (nx > 0.80 && nyWA < 1.05) return fbm(nx, nyWA, 50) > 0.25 ? T.foothills : T.montane;
  if (distCrest < 0.10) return fbm(nx, nyWA, 45) > 0.15 ? T.montane : T.steppe;  // E Cascade slope
  if (nx > 0.62 && nx < 0.85 && fbm(nx, nyWA, 32) > 0.25) return T.scabland;     // scabland patch
  return T.steppe;                                                              // shrub-steppe / high desert
}
function oregonTerrainAt(nx, nyWA, n) {
  if (nx < oceanEdge(nyWA) + n * 0.010) return T.ocean;                          // Pacific
  if (distToPolyline(nx + n * 0.006, nyWA, COLUMBIA) < 0.0085) return T.river;   // shared WA/OR border
  return oregonLand(nx, nyWA, n);
}

// ---------------------------------------------------------------------------
// IDAHO — the NEW eastern land (appended columns tx >= WAOR_WIDTH). Authored in a
// LOCAL normalised x (ix 0..1 across the appended columns, west->east) and the SAME
// WA-anchored latitude (nyWA = ty/(WA_ROWS-1)) so it lines up with WA/OR across the
// seam. Stylised, consistent palette: a walkable western seam (Snake/Owyhee plain
// you can walk in from eastern Oregon/Washington), the rugged central Idaho
// batholith (mountains + montane forest, with periodic E-W pass valleys), the
// forested northern panhandle (Clearwater country, where Kamiah sits), the southern
// Snake River Plain (steppe + farmland), and a hard Bitterroot wall on the far-east
// Idaho/Montana border. NONE of this touches WA/OR tiles.
// ---------------------------------------------------------------------------
const ID_CITIES = [
  { name: 'Kamiah, ID',     x: 0.30, y: 0.265 }, // north-central, Clearwater valley (Mount McGuire leg)
  { name: 'Lewiston, ID',   x: 0.075, y: 0.300 }, // on the seam where the Clearwater meets the Snake
  { name: 'Boise, ID',      x: 0.30, y: 0.905 }, // SW Snake plain
  { name: 'Twin Falls, ID', x: 0.52, y: 0.965 }, // S-central Snake plain
  { name: 'Idaho Falls, ID', x: 0.74, y: 0.855 }, // SE Snake plain
];
// Snake River — a broad arc across the SOUTH (in from the east, bows south, out west).
const ID_SNAKE = [
  [1.00, 0.78], [0.80, 0.86], [0.58, 0.95], [0.40, 0.965], [0.22, 0.92], [0.04, 0.80],
];
// Clearwater River — across the NORTH panhandle to the Snake at the seam (Lewiston).
const ID_CLEARWATER = [[0.62, 0.255], [0.42, 0.262], [0.24, 0.272], [0.075, 0.295]];

function idahoTerrainAt(tx, ty) {
  const ix = (tx - WAOR_WIDTH) / (IDAHO_COLS - 1); // 0..1 across Idaho, west -> east
  const ny = ty / (WA_ROWS - 1);                   // same latitude space as WA/OR
  const n = fbm(ix + 7.3, ny + 3.1, 22);           // organic edge wobble (offset seed → distinct from WA)

  // Urban cores at the Idaho city anchors.
  for (const c of ID_CITIES) if (dist(ix, ny, c.x, c.y) < 0.011) return T.urban;

  // Narrow rivers (kept thin so they never seal a valley).
  if (distToPolyline(ix + n * 0.008, ny, ID_SNAKE) < 0.0085) return T.river;
  if (distToPolyline(ix, ny, ID_CLEARWATER) < 0.006) return T.river;

  // Far-east Bitterroot wall (Idaho/Montana border) — the hard eastern boundary.
  if (ix > 0.88 + n * 0.03) return T.mountain;

  // Walkable western seam (continuity with eastern WA/OR so you can walk into Idaho).
  if (ix < 0.10) return ny < 0.30 ? T.foothills : T.steppe;

  // Central Idaho batholith: rugged mountains + montane forest, with periodic E-W
  // pass valleys (so it is crossable). Roughly ix 0.34..0.74, ny 0.16..0.66.
  if (ix > 0.34 && ix < 0.74 && ny > 0.16 && ny < 0.66) {
    if (Math.abs(Math.sin(ny * 7.0)) < 0.20) return T.foothills; // E-W pass valley
    return fbm(ix, ny, 26) > 0.15 ? T.mountain : T.montane;
  }

  // Northern panhandle (Clearwater country): forested foothills + montane.
  if (ny < 0.32) return fbm(ix, ny, 40) > 0.10 ? T.foothills : T.montane;

  // Southern Snake River Plain: shrub-steppe + Palouse-like farmland.
  if (ny > 0.62) return fbm(ix, ny, 35) > 0.0 ? T.steppe : T.farmland;

  // Interior default: shrub-steppe with scattered montane stands.
  return fbm(ix, ny, 30) > 0.35 ? T.montane : T.steppe;
}

// ---------------------------------------------------------------------------
// Water masks
// ---------------------------------------------------------------------------
function oceanEdge(ny) {
  let edge = 0.045 + 0.02 * Math.sin(ny * Math.PI * 1.3);
  if (ny > 0.55 && ny < 0.78) edge += 0.018; // Grays Harbor / Willapa Bay
  return edge;
}
function straitBottom(nx) {
  if (nx < 0.045) return 1;
  if (nx > 0.345) return 0;
  const base = 0.060 + 0.010 * Math.sin(nx * 12);
  const inlet = 0.075 * Math.exp(-((nx - 0.315) ** 2) / 0.0016);
  return base + inlet;
}
function isOcean(nx, ny, n) {
  if (nx < oceanEdge(ny) + n * 0.010) return true;
  if (ny < straitBottom(nx) + n * 0.006) return true;
  if (ny > southBorderNy(nx) + 0.012 + n * 0.006) return true;
  return false;
}
function isSound(nx, ny, n) {
  if (distToPolyline(nx, ny + n * 0.010, PUGET) < 0.026 + Math.abs(n) * 0.012) return true;
  if (distToPolyline(nx, ny, HOOD) < 0.012) return true;
  return false;
}
function isLake(nx, ny) {
  if (distToPolyline(nx, ny, LAKE_CRESCENT) < 0.010) return true;
  if (distToPolyline(nx, ny, LAKE_CHELAN) < 0.009) return true;
  if (distToPolyline(nx, ny, BANKS_LAKE) < 0.008) return true;
  const lw = LAKE_WASHINGTON;
  if (((nx - lw.x) / lw.rx) ** 2 + ((ny - lw.y) / lw.ry) ** 2 < 1) return true;
  return false;
}
function isRiver(nx, ny, n) {
  if (distToPolyline(nx + n * 0.006, ny, COLUMBIA) < 0.0085) return true;
  if (distToPolyline(nx, ny, SNAKE) < 0.0060) return true;
  for (const trib of TRIBUTARIES) {
    if (distToPolyline(nx, ny, trib) < 0.0032) return true;
  }
  return false;
}
function isWetland(nx, ny, n) {
  return WETLANDS.some((w) => dist(nx, ny, w.x, w.y) < w.r + n * 0.01);
}

// Walkable islands punched into the Sound.
const ISLANDS = [
  { x: 0.300, y: 0.058, r: 0.020 }, // San Juans
  { x: 0.330, y: 0.040, r: 0.015 },
  { x: 0.318, y: 0.085, r: 0.012 },
  { x: 0.352, y: 0.150, r: 0.024 }, // Whidbey
  { x: 0.318, y: 0.300, r: 0.014 }, // Bainbridge
  { x: 0.350, y: 0.365, r: 0.012 }, // Vashon
];
function isIsland(nx, ny) {
  return ISLANDS.some((i) => dist(nx, ny, i.x, i.y) < i.r);
}

// ---------------------------------------------------------------------------
// Mountains / passes
// ---------------------------------------------------------------------------
function crestXAt(ny) {
  return CREST_X + 0.012 * Math.sin(ny * 6.0);
}
function nearPass(ny) {
  return PASSES.some((p) => Math.abs(ny - p) < 0.028);
}
function isAlpine(nx, ny, n) {
  for (const p of PEAKS) {
    if (dist(nx, ny, p.x, p.y) < p.r + n * 0.006) return true;
  }
  if (dist(nx, ny, OLYMPIC.x, OLYMPIC.y) < OLYMPIC.r + n * 0.006) return true;
  const onCrest = Math.abs(nx - crestXAt(ny) + n * 0.010) < CREST_HALF * 0.6;
  if (onCrest && ny > 0.04 && ny < 0.86 && !nearPass(ny)) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Land terrain by region
// ---------------------------------------------------------------------------
function landTerrain(nx, ny, n) {
  // Urban cores near the city anchors.
  for (const c of CITIES) {
    if (dist(nx, ny, c.x, c.y) < 0.010) return T.urban;
  }

  if (isAlpine(nx, ny, n)) return T.mountain;

  const crest = crestXAt(ny);
  const distCrest = nx - crest; // negative = west of crest

  // The crest band that is not an alpine peak becomes a walkable pass.
  if (Math.abs(distCrest + n * 0.010) < CREST_HALF && ny > 0.04 && ny < 0.86) {
    return nearPass(ny) ? T.pass : T.foothills;
  }

  // Foothills flank the crest on both sides.
  if (Math.abs(distCrest) < CREST_HALF * 2.0 && ny > 0.03 && ny < 0.88) return T.foothills;

  // Olympic apron: foothills then rainforest ring around the peaks.
  const dOly = dist(nx, ny, OLYMPIC.x, OLYMPIC.y);
  if (dOly < OLYMPIC.r * 1.55) return T.foothills;

  const west = nx < crest;
  if (west) {
    // A thin beach hugs the open Pacific coast.
    if (nx < oceanEdge(ny) + 0.010) return T.beach;

    // Olympic Peninsula (west of the Sound, north of Grays Harbor): rainforest.
    const peninsula = nx < 0.305 && ny > straitBottom(nx) && ny < 0.56;
    if (peninsula) return dOly < OLYMPIC.r * 2.3 ? T.rainforest : T.rainforest;

    // West Cascade slope: montane forest within ~0.12 of the crest.
    if (distCrest > -0.13) {
      return fbm(nx, ny, 60) > 0.35 ? T.foothills : T.montane;
    }

    // Lowlands between the Sound and the slope: forest with meadow valleys + urban.
    const lowland = nx > 0.33 && nx < 0.50;
    const open = fbm(nx, ny, 40);
    if (lowland && open > 0.20) return T.grassland;
    return T.forest;
  }

  // ---- East of the crest ----
  // Okanogan highlands: forested north-east.
  if (ny < 0.22 && nx > 0.615 && nx < 0.90) {
    return fbm(nx, ny, 55) > 0.25 ? T.foothills : T.montane;
  }
  // East Cascade slope: montane fading to steppe.
  if (distCrest < 0.12) {
    return fbm(nx, ny, 50) > 0.1 ? T.montane : T.steppe;
  }
  // Palouse wheat country: rolling farmland in the SE.
  if (nx > 0.78 && ny > 0.58 && ny < 0.92) {
    return fbm(nx, ny, 45) > -0.15 ? T.farmland : T.grassland;
  }
  // Channeled scablands / coulees: rocky patch in the central basin.
  const scab = fbm(nx, ny, 35);
  if (nx > 0.66 && nx < 0.86 && ny > 0.36 && ny < 0.62 && scab > 0.05) return T.scabland;

  // Default: Columbia Basin shrub-steppe, greener (grassland) along the rivers.
  const nearWater = Math.min(
    distToPolyline(nx, ny, COLUMBIA),
    distToPolyline(nx, ny, SNAKE),
    distToPolyline(nx, ny, YAKIMA),
  );
  if (nearWater < 0.030) return T.grassland;
  return T.steppe;
}

// ---------------------------------------------------------------------------
// Sample one tile
// ---------------------------------------------------------------------------
function terrainAt(tx, ty) {
  // Idaho = the NEW eastern columns. Sampled in its own normalised x so WA/OR is
  // untouched. (Branch BEFORE the WA/OR nx math so existing columns are byte-stable.)
  if (tx >= WAOR_WIDTH) return idahoTerrainAt(tx, ty);

  // WA/OR keep their ORIGINAL normalisation (over WAOR_WIDTH), so columns 0..799
  // map to the exact same nx — and thus the same terrain — as before Idaho existed.
  const nx = tx / (WAOR_WIDTH - 1);
  // Latitude stays anchored to the original Washington height, so WA features
  // land on the exact same rows as before and Oregon simply continues south.
  const nyWA = ty / (WA_ROWS - 1);
  const n = fbm(nx, nyWA, 22); // organic edge wobble

  // South of the WA/OR border: the continuous Oregon extension.
  if (isOregon(nx, nyWA)) return oregonTerrainAt(nx, nyWA, n);

  // ---- Washington (unchanged) ----
  if (isOcean(nx, nyWA, n)) return T.ocean;

  const island = isIsland(nx, nyWA);
  if (!island) {
    if (isLake(nx, nyWA)) return T.lake;
    if (isSound(nx, nyWA, n)) return T.sound;
    if (isRiver(nx, nyWA, n)) return T.river;
    if (isWetland(nx, nyWA, n) && nx < 0.5) return T.wetland;
  }
  return landTerrain(nx, nyWA, n);
}

// ---------------------------------------------------------------------------
// Build grid
// ---------------------------------------------------------------------------
const grid = [];
for (let ty = 0; ty < HEIGHT; ty++) {
  const row = new Array(WIDTH);
  for (let tx = 0; tx < WIDTH; tx++) row[tx] = terrainAt(tx, ty);
  grid.push(row);
}

// ---------------------------------------------------------------------------
// Bridges — anchored to named features so they re-derive at any scale. Each
// bridge snaps onto the nearest point of its river, orients across the flow,
// and auto-spans the water (never bridging open ocean).
// ---------------------------------------------------------------------------
const cityXY = (name) => {
  const c = CITIES.find((q) => q.name === name);
  return [c.x, c.y];
};
const BRIDGES = [
  { name: 'Wenatchee (Columbia)',  anchor: cityXY('Wenatchee'),  river: COLUMBIA },
  { name: 'Vantage (Columbia)',    anchor: [0.715, 0.500],       river: COLUMBIA },
  { name: 'Tri-Cities (Columbia)', anchor: [0.700, 0.700],       river: COLUMBIA },
  { name: 'Tri-Cities (Snake)',    anchor: [0.790, 0.690],       river: SNAKE },
  { name: 'Vancouver (Columbia)',  anchor: cityXY('Vancouver'),  river: COLUMBIA },
];

function placeBridge(bridge) {
  const CROSSABLE = new Set([T.sound, T.river]);
  const BLOCKED = new Set(TERRAIN.filter((t) => t.blocks).map((t) => t.id));
  const inBounds = (x, y) => x >= 0 && y >= 0 && x < WIDTH && y < HEIGHT;

  // Snap onto the river centreline and orient across the local flow.
  const p = nearestOnPolyline(bridge.anchor[0], bridge.anchor[1], bridge.river);
  const dir = Math.abs(p.dy) > Math.abs(p.dx) ? 'h' : 'v'; // bridge runs across flow
  const step = dir === 'h' ? [1, 0] : [0, 1];
  let cx = Math.round(p.x * (WAOR_WIDTH - 1)); // bridges are WA features → WA/OR x-domain
  let cy = Math.round(p.y * (WA_ROWS - 1)); // river anchors live in WA-anchored latitude

  // Nudge onto an actual river/sound tile (search a small neighbourhood).
  if (!CROSSABLE.has(grid[cy]?.[cx])) {
    let best = null;
    let bestD = Infinity;
    for (let dy = -6; dy <= 6; dy++) {
      for (let dx = -6; dx <= 6; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (inBounds(x, y) && CROSSABLE.has(grid[y][x])) {
          const d = dx * dx + dy * dy;
          if (d < bestD) {
            bestD = d;
            best = [x, y];
          }
        }
      }
    }
    if (!best) throw new Error(`Bridge "${bridge.name}" found no crossable water`);
    [cx, cy] = best;
  }

  // Span the contiguous water through the centre, anchoring onto each bank.
  const span = [[cx, cy]];
  for (const sign of [-1, 1]) {
    let x = cx + step[0] * sign;
    let y = cy + step[1] * sign;
    let guard = 0;
    while (inBounds(x, y) && CROSSABLE.has(grid[y][x]) && guard++ < 60) {
      span.push([x, y]);
      x += step[0] * sign;
      y += step[1] * sign;
    }
    if (inBounds(x, y) && !BLOCKED.has(grid[y][x])) span.push([x, y]);
  }
  for (const [x, y] of span) grid[y][x] = T.bridge;
  return span.length;
}

for (const bridge of BRIDGES) {
  console.log(`bridge: ${bridge.name.padEnd(22)} ${placeBridge(bridge)} tiles`);
}

// ---------------------------------------------------------------------------
// Spawn (near Seattle) + connectivity check
// ---------------------------------------------------------------------------
const blockedIds = new Set(TERRAIN.filter((t) => t.blocks).map((t) => t.id));
function nearestWalkable(cx, cy) {
  for (let r = 0; r < 60; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) continue;
        if (!blockedIds.has(grid[y][x])) return { x, y };
      }
    }
  }
  return { x: cx, y: cy };
}
const seattle = CITIES[0];
const spawnTile = nearestWalkable(
  Math.round(seattle.x * (WAOR_WIDTH - 1)),
  Math.round(seattle.y * (WA_ROWS - 1)),
);

function connectivityReport() {
  const walk = (x, y) =>
    x >= 0 && y >= 0 && x < WIDTH && y < HEIGHT && !blockedIds.has(grid[y][x]);
  const seen = Array.from({ length: HEIGHT }, () => new Array(WIDTH).fill(false));
  const stack = [[spawnTile.x, spawnTile.y]];
  seen[spawnTile.y][spawnTile.x] = true;
  let reach = 0;
  while (stack.length) {
    const [x, y] = stack.pop();
    reach++;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (walk(nx, ny) && !seen[ny][nx]) {
        seen[ny][nx] = true;
        stack.push([nx, ny]);
      }
    }
  }
  const tile = (nx, ny) => [Math.round(nx * (WAOR_WIDTH - 1)), Math.round(ny * (WA_ROWS - 1))];
  // Idaho region probes use the appended-column x-mapping (ix 0..1 across Idaho).
  const idTile = (ix, ny) => [Math.round(WAOR_WIDTH + ix * (IDAHO_COLS - 1)), Math.round(ny * (WA_ROWS - 1))];
  const nearReach = (tx, ty) => {
    for (let r = 0; r < 12; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const x = tx + dx;
          const y = ty + dy;
          if (walk(x, y)) return seen[y][x];
        }
      }
    }
    return false;
  };
  const regions = {
    'Olympic Peninsula': tile(0.12, 0.35),
    'Olympia (S Sound)': tile(0.318, 0.56),
    Bellingham: tile(0.388, 0.072),
    'Wenatchee (C)': tile(0.66, 0.43),
    'Okanogan (N)': tile(0.75, 0.12),
    'Spokane (NE)': tile(0.88, 0.25),
    'Scablands (C)': tile(0.76, 0.5),
    'Yakima (SC)': tile(0.6, 0.62),
    'Tri-Cities': tile(0.715, 0.69),
    'Walla Walla (SE)': tile(0.84, 0.715),
    'Palouse (SE)': tile(0.92, 0.78),
    'Portland OR': tile(0.470, 0.820),
    'Salem OR': tile(0.452, 0.892),
    'Eugene OR': tile(0.448, 0.988),
    'Bend OR (E)': tile(0.610, 0.966),
    'OR coast': tile(0.060, 0.900),
    'S Oregon': tile(0.470, 1.150),
    // Idaho (new eastern land) — quest-leg valleys must be reachable on foot.
    'ID seam (W)': idTile(0.04, 0.45),
    'ID Kamiah (N)': idTile(0.30, 0.27),
    'ID Snake plain (S)': idTile(0.45, 0.92),
    'ID city east (SE)': idTile(0.70, 0.88),
  };
  console.log('Connectivity from spawn', spawnTile, ':');
  let allOk = true;
  let totalWalk = 0;
  for (let y = 0; y < HEIGHT; y++) for (let x = 0; x < WIDTH; x++) if (walk(x, y)) totalWalk++;
  for (const [name, [x, y]] of Object.entries(regions)) {
    const ok = nearReach(x, y);
    if (!ok) allOk = false;
    console.log(`  ${name.padEnd(20)} ${ok ? 'REACHABLE' : 'SEALED ***'}`);
  }
  console.log(
    `reachable ${reach} / walkable ${totalWalk} (${(totalWalk - reach)} sealed in islands/spits)`,
  );
  if (!allOk) console.log('WARNING: some named regions are still sealed.');
}
connectivityReport();

// ---------------------------------------------------------------------------
// Zone chunks
// ---------------------------------------------------------------------------
const zonesX = Math.ceil(WIDTH / ZONE_SIZE);
const zonesY = Math.ceil(HEIGHT / ZONE_SIZE);
const zones = [];
for (let zy = 0; zy < zonesY; zy++) {
  for (let zx = 0; zx < zonesX; zx++) {
    const x0 = zx * ZONE_SIZE;
    const y0 = zy * ZONE_SIZE;
    const w = Math.min(ZONE_SIZE, WIDTH - x0);
    const h = Math.min(ZONE_SIZE, HEIGHT - y0);
    const tiles = [];
    for (let y = 0; y < h; y++) tiles.push(grid[y0 + y].slice(x0, x0 + w));
    zones.push({ id: `zone_${zx}_${zy}`, zx, zy, x: x0, y: y0, width: w, height: h, tiles });
  }
}

// Marker-ONLY cities: emitted into the cities list (so the home-town TownBuilder can
// anchor on them) but NOT painted as urban terrain — so the underlying tiles stay
// byte-stable. Enumclaw is the home-town anchor (townData.ts) and is intentionally a
// grassland tile, not an urban core; its marker tile matches the original map exactly.
const MARKER_ONLY_CITIES = [{ name: 'Enumclaw', tx: 316, ty: 196 }];
const cities = [
  // WA + OR cities keep the ORIGINAL x-domain so their pixel markers don't move.
  ...[...CITIES, ...OR_CITIES].map((c) => ({
    name: c.name,
    tx: Math.round(c.x * (WAOR_WIDTH - 1)),
    ty: Math.round(c.y * (WA_ROWS - 1)),
  })),
  ...MARKER_ONLY_CITIES,
  // Idaho cities use the appended-column x-mapping (ix 0..1 across the new land).
  ...ID_CITIES.map((c) => ({
    name: c.name,
    tx: Math.round(WAOR_WIDTH + c.x * (IDAHO_COLS - 1)),
    ty: Math.round(c.y * (WA_ROWS - 1)),
  })),
];

const out = {
  name: 'Washington',
  generated: new Date().toISOString(),
  tileSize: TILE_SIZE,
  width: WIDTH,
  height: HEIGHT,
  zoneSize: ZONE_SIZE,
  zonesX,
  zonesY,
  terrain: TERRAIN,
  spawn: spawnTile,
  cities,
  zones,
};

const outPath = resolve(__dirname, '../src/map/washington.map.json');
writeFileSync(outPath, JSON.stringify(out));
console.log(`Wrote ${outPath} (${WIDTH}x${HEIGHT}, ${zones.length} zones)`);

// ---------------------------------------------------------------------------
// ASCII preview + histogram
// ---------------------------------------------------------------------------
const GLYPH = {
  [T.ocean]: '~', [T.sound]: '≈', [T.river]: 'r', [T.beach]: '.',
  [T.grassland]: ',', [T.forest]: '#', [T.foothills]: 'v', [T.mountain]: '^',
  [T.steppe]: ':', [T.urban]: 'O', [T.bridge]: '=', [T.lake]: 'L',
  [T.rainforest]: '@', [T.montane]: '%', [T.scabland]: 'c', [T.farmland]: 'w',
  [T.wetland]: 'm', [T.pass]: '+',
};
const stepX = Math.ceil(WIDTH / 100);
const stepY = Math.ceil(HEIGHT / 50);
let preview = '';
for (let ty = 0; ty < HEIGHT; ty += stepY) {
  let line = '';
  for (let tx = 0; tx < WIDTH; tx += stepX) line += GLYPH[grid[ty][tx]] ?? '?';
  preview += line + '\n';
}
console.log(preview);

const counts = {};
for (const row of grid) for (const v of row) counts[v] = (counts[v] || 0) + 1;
const total = WIDTH * HEIGHT;
for (const t of TERRAIN) {
  const pct = (((counts[t.id] || 0) / total) * 100).toFixed(1);
  console.log(`${t.key.padEnd(11)} ${String(pct).padStart(5)}%`);
}
console.log(`spawn tile: ${spawnTile.x},${spawnTile.y}`);

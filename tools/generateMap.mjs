/**
 * Thrones of Heaven — Washington State map generator.
 *
 * This is the AUTHORED region model for Washington. It is NOT procedural noise:
 * every region (Pacific coast, Strait of Juan de Fuca, Olympic Peninsula, Puget
 * Sound, the Cascade crest, the eastern shrub-steppe, the Columbia River) is
 * placed by hand-tuned geometry derived from a real map of the state, then
 * sampled onto a 256 x 160 tile grid.
 *
 * Output: src/map/washington.map.json — a clean custom JSON, organised into a
 * grid of zone chunks so streaming can be added later without a rewrite.
 *
 * Run with:  node tools/generateMap.mjs
 */

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Grid configuration
// ---------------------------------------------------------------------------
const WIDTH = 256;   // tiles, west -> east
const HEIGHT = 160;  // tiles, north -> south  (8:5 landscape)
const TILE_SIZE = 16;
const ZONE_SIZE = 32; // tiles per zone edge -> 8 x 5 = 40 zones

// ---------------------------------------------------------------------------
// Terrain types. `id` is also the tile index used by the tileset/renderer.
// `blocks` marks impassable terrain for collision.
// ---------------------------------------------------------------------------
const TERRAIN = [
  { id: 0, key: 'ocean',     name: 'Pacific Ocean',      color: '#1b3a6b', blocks: true },
  { id: 1, key: 'sound',     name: 'Puget Sound / Lake', color: '#2f6fae', blocks: true },
  { id: 2, key: 'river',     name: 'River',              color: '#3f8fcf', blocks: true },
  { id: 3, key: 'beach',     name: 'Beach / Coast',      color: '#d9c8a0', blocks: false },
  { id: 4, key: 'grassland', name: 'Grassland / Plains', color: '#6aa84f', blocks: false },
  { id: 5, key: 'forest',    name: 'Forest',             color: '#2f6b3a', blocks: false },
  { id: 6, key: 'foothills', name: 'Foothills',          color: '#7c8a4a', blocks: false },
  { id: 7, key: 'mountain',  name: 'Mountain Peak',      color: '#b9b6b0', blocks: true },
  { id: 8, key: 'steppe',    name: 'Dry Steppe',         color: '#c9b079', blocks: false },
  { id: 9, key: 'urban',     name: 'Urban / Town',       color: '#9a9aa2', blocks: false },
];
const T = Object.fromEntries(TERRAIN.map((t) => [t.key, t.id]));

// ---------------------------------------------------------------------------
// Geometry helpers (all in normalised 0..1 coordinates)
//   nx: 0 = far west,  1 = far east
//   ny: 0 = far north, 1 = far south
// ---------------------------------------------------------------------------
function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

// Distance from point P to a polyline (list of [nx,ny] waypoints).
function distToPolyline(px, py, pts) {
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[i + 1];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len2 = dx * dx + dy * dy;
    let t = len2 === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    const cx = x1 + t * dx;
    const cy = y1 + t * dy;
    best = Math.min(best, dist(px, py, cx, cy));
  }
  return best;
}

// Cheap deterministic value-noise so coastlines/forests get a little wobble
// without becoming random mush. Same input always gives same output.
function jitter(tx, ty, scale = 1, freq = 0.13) {
  const s = Math.sin(tx * freq * 1.7 + ty * freq * 0.9) +
            Math.sin(tx * freq * 0.6 - ty * freq * 1.3 + 2.1);
  return s * 0.5 * scale;
}

// ---------------------------------------------------------------------------
// Authored geography (normalised coordinates, tuned against a real WA map)
// ---------------------------------------------------------------------------

// Puget Sound: irregular inland waterway running from the Strait down to Olympia.
const PUGET = [
  [0.345, 0.075], [0.350, 0.135], [0.342, 0.200], [0.330, 0.260],
  [0.335, 0.320], [0.330, 0.380], [0.320, 0.440], [0.300, 0.500],
  [0.300, 0.545],
];
// Hood Canal: the long hooked inlet on the west side of the Sound.
const HOOD = [
  [0.300, 0.150], [0.285, 0.230], [0.275, 0.310], [0.285, 0.390], [0.305, 0.450],
];

// Columbia River: enters from the north, sweeps down the big bend, turns west
// through the Tri-Cities and runs the southern border out to the Pacific.
const COLUMBIA = [
  [0.655, -0.02], [0.640, 0.10], [0.660, 0.22], [0.705, 0.34],
  [0.715, 0.46], [0.722, 0.60], [0.700, 0.70], [0.640, 0.745],
  [0.540, 0.775], [0.420, 0.800], [0.300, 0.815], [0.180, 0.820],
  [0.100, 0.805], [0.050, 0.790],
];
// Snake River: comes in from the east to join the Columbia near the Tri-Cities.
const SNAKE = [
  [1.02, 0.640], [0.900, 0.660], [0.800, 0.690], [0.722, 0.700],
];

// Southern state border, west -> east. In the west it follows the lower
// Columbia out to the Pacific; it notches north at the Tri-Cities bend, then
// runs the straight Oregon/Idaho line through the SE. Anything south is
// off-state (rendered as ocean so the WA landmass reads as a clean silhouette).
const SOUTH_BORDER = [
  [0.000, 0.790], [0.100, 0.805], [0.180, 0.822], [0.300, 0.815],
  [0.420, 0.800], [0.540, 0.775], [0.660, 0.748], [0.720, 0.730],
  [0.860, 0.760], [1.000, 0.800],
];

// Southern border latitude (ny) at a given longitude (nx).
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

// Olympic Mountains: impassable core of the Olympic Peninsula.
const OLYMPIC = { x: 0.150, y: 0.250, r: 0.072 };

// Cascade high peaks (impassable masses along the crest).
const PEAKS = [
  { name: 'Baker',      x: 0.560, y: 0.085, r: 0.030 },
  { name: 'Rainier',    x: 0.545, y: 0.500, r: 0.040 },
  { name: 'St Helens',  x: 0.520, y: 0.665, r: 0.026 },
  { name: 'Adams',      x: 0.595, y: 0.655, r: 0.030 },
];

// Cascade crest line and its two walkable passes.
const CREST_X = 0.560;            // centre of the range, west->east
const CREST_HALF = 0.045;         // half-width of the high ridge
const PASSES = [0.330, 0.470];    // ny of Stevens & Snoqualmie passes

// City anchors (normalised). Used for urban tiles, markers and spawn.
const CITIES = [
  { name: 'Seattle',     x: 0.370, y: 0.330 },
  { name: 'Tacoma',      x: 0.355, y: 0.430 },
  { name: 'Olympia',     x: 0.318, y: 0.560 },
  { name: 'Everett',     x: 0.378, y: 0.250 },
  { name: 'Bellingham',  x: 0.360, y: 0.090 },
  { name: 'Spokane',     x: 0.880, y: 0.250 },
  { name: 'Yakima',      x: 0.600, y: 0.620 },
  { name: 'Tri-Cities',  x: 0.715, y: 0.690 },
  { name: 'Vancouver',   x: 0.470, y: 0.778 },
  { name: 'Wenatchee',   x: 0.660, y: 0.430 },
  { name: 'Walla Walla', x: 0.840, y: 0.715 },
];

// ---------------------------------------------------------------------------
// Water masks
// ---------------------------------------------------------------------------

// Pacific coastline: ocean lies west of this edge. The edge bulges east in the
// SW (Willapa/Grays Harbor) and the coast wraps below the Columbia mouth.
function oceanEdge(ny) {
  let edge = 0.045 + 0.02 * Math.sin(ny * Math.PI * 1.3);
  // Grays Harbor / Willapa Bay bite out of the SW coast.
  if (ny > 0.55 && ny < 0.78) edge += 0.018;
  return edge;
}

// Strait of Juan de Fuca: water across the top-left, north of the Olympic
// Peninsula and the northern Sound, separating WA from Canada.
function straitBottom(nx) {
  if (nx < 0.045) return 1; // open ocean corner, all water at top
  if (nx > 0.345) return 0; // east of the Sound the border is land to the top
  // Dip deepest where the Strait turns south into Admiralty Inlet (~0.30).
  const base = 0.060 + 0.010 * Math.sin(nx * 12);
  const inlet = 0.075 * Math.exp(-((nx - 0.315) ** 2) / 0.0016);
  return base + inlet;
}

function isOcean(nx, ny, tx, ty) {
  // West of the Pacific coastline.
  if (nx < oceanEdge(ny) + jitter(tx, ty, 0.012)) return true;
  // North of the Strait.
  if (ny < straitBottom(nx) + jitter(tx, ty, 0.006)) return true;
  // South of the lower Columbia (the western southern border) is off-state.
  if (ny > southBorderNy(nx) + 0.012 + jitter(tx, ty, 0.006)) return true;
  return false;
}

function isSound(nx, ny, tx, ty) {
  const w = jitter(tx, ty, 0.010);
  const dPuget = distToPolyline(nx, ny + w, PUGET);
  if (dPuget < 0.028 + Math.abs(jitter(tx, ty, 0.012, 0.2))) return true;
  const dHood = distToPolyline(nx, ny, HOOD);
  if (dHood < 0.013) return true;
  // A couple of inland lakes east of the Sound for flavour.
  if (dist(nx, ny, 0.395, 0.330) < 0.012) return true; // Lake Washington
  if (dist(nx, ny, 0.905, 0.470) < 0.010) return true; // Banks Lake-ish
  return false;
}

function isRiver(nx, ny, tx, ty) {
  const w = jitter(tx, ty, 0.006);
  if (distToPolyline(nx + w, ny, COLUMBIA) < 0.0125) return true;
  if (distToPolyline(nx, ny, SNAKE) < 0.0090) return true;
  return false;
}

// Puget Sound islands (San Juans + Whidbey/Vashon-ish) punched back into water.
function isIsland(nx, ny) {
  const islands = [
    { x: 0.300, y: 0.060, r: 0.018 }, // San Juans
    { x: 0.330, y: 0.040, r: 0.014 },
    { x: 0.352, y: 0.150, r: 0.022 }, // Whidbey
    { x: 0.355, y: 0.360, r: 0.012 }, // Vashon
    { x: 0.318, y: 0.300, r: 0.013 }, // Bainbridge
  ];
  return islands.some((i) => dist(nx, ny, i.x, i.y) < i.r);
}

// ---------------------------------------------------------------------------
// Land terrain
// ---------------------------------------------------------------------------

function isMountain(nx, ny, tx, ty) {
  // Big impassable peaks.
  for (const p of PEAKS) {
    if (dist(nx, ny, p.x, p.y) < p.r + jitter(tx, ty, 0.006)) return true;
  }
  // Olympic Mountains core.
  if (dist(nx, ny, OLYMPIC.x, OLYMPIC.y) < OLYMPIC.r + jitter(tx, ty, 0.006)) return true;
  // The Cascade crest ridge, with gaps at the passes.
  const onCrest = Math.abs(nx - CREST_X + jitter(tx, ty, 0.010)) < CREST_HALF * 0.55;
  if (onCrest && ny > 0.04 && ny < 0.86) {
    const nearPass = PASSES.some((py) => Math.abs(ny - py) < 0.035);
    if (!nearPass) return true;
  }
  return false;
}

function landTerrain(nx, ny, tx, ty) {
  // Urban cores near the city anchors.
  for (const c of CITIES) {
    if (dist(nx, ny, c.x, c.y) < 0.011) return T.urban;
  }

  if (isMountain(nx, ny, tx, ty)) return T.mountain;

  // Foothills flank the Cascade crest (and the passes are foothills, walkable).
  const distCrest = Math.abs(nx - CREST_X + jitter(tx, ty, 0.012));
  if (distCrest < CREST_HALF * 1.7 && ny > 0.03 && ny < 0.88) return T.foothills;

  // Olympic Peninsula apron: foothills/forest ring around the Olympic core.
  const dOly = dist(nx, ny, OLYMPIC.x, OLYMPIC.y);
  if (dOly < OLYMPIC.r * 1.7) return T.foothills;

  const west = nx < CREST_X;
  if (west) {
    // Wet, green west side: forest with grassland in the lowland valleys.
    // A thin beach strip hugs the open Pacific coast.
    if (nx < oceanEdge(ny) + 0.012) return T.beach;
    const lowland = nx > 0.34 && nx < 0.50 && ny > 0.20 && ny < 0.78;
    const forestNoise = jitter(tx, ty, 1, 0.21);
    if (lowland && forestNoise < 0.25) return T.grassland;
    return T.forest;
  }

  // Dry east side: shrub-steppe / farmland, greener along the rivers.
  const nearRiver = Math.min(
    distToPolyline(nx, ny, COLUMBIA),
    distToPolyline(nx, ny, SNAKE),
  );
  if (nearRiver < 0.035) return T.grassland; // irrigated river valleys
  // A little forest on the east Cascade slope.
  if (nx < 0.66 && distCrest < CREST_HALF * 3.0) return T.forest;
  return T.steppe;
}

// ---------------------------------------------------------------------------
// Sample one tile
// ---------------------------------------------------------------------------
function terrainAt(tx, ty) {
  const nx = tx / (WIDTH - 1);
  const ny = ty / (HEIGHT - 1);

  if (isOcean(nx, ny, tx, ty)) return T.ocean;

  // Islands sit inside the Sound region as land.
  const island = isIsland(nx, ny);
  if (!island) {
    if (isSound(nx, ny, tx, ty)) return T.sound;
    if (isRiver(nx, ny, tx, ty)) return T.river;
  }

  return landTerrain(nx, ny, tx, ty);
}

// ---------------------------------------------------------------------------
// Build full grid
// ---------------------------------------------------------------------------
const grid = [];
for (let ty = 0; ty < HEIGHT; ty++) {
  const row = [];
  for (let tx = 0; tx < WIDTH; tx++) row.push(terrainAt(tx, ty));
  grid.push(row);
}

// Pick a guaranteed-walkable spawn near Seattle (search outward if needed).
function nearestWalkable(cx, cy) {
  const blocked = new Set(TERRAIN.filter((t) => t.blocks).map((t) => t.id));
  for (let r = 0; r < 40; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) continue;
        if (!blocked.has(grid[y][x])) return { x, y };
      }
    }
  }
  return { x: cx, y: cy };
}
const seattle = CITIES[0];
const spawnTile = nearestWalkable(
  Math.round(seattle.x * (WIDTH - 1)),
  Math.round(seattle.y * (HEIGHT - 1)),
);

// ---------------------------------------------------------------------------
// Organise into zone chunks (a grid of zones) for future streaming.
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
    for (let y = 0; y < h; y++) {
      tiles.push(grid[y0 + y].slice(x0, x0 + w));
    }
    zones.push({ id: `zone_${zx}_${zy}`, zx, zy, x: x0, y: y0, width: w, height: h, tiles });
  }
}

const cities = CITIES.map((c) => ({
  name: c.name,
  tx: Math.round(c.x * (WIDTH - 1)),
  ty: Math.round(c.y * (HEIGHT - 1)),
}));

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
console.log(`Wrote ${outPath}`);

// ---------------------------------------------------------------------------
// ASCII preview so the shape can be eyeballed against a real WA map.
// ---------------------------------------------------------------------------
const GLYPH = {
  [T.ocean]: '~', [T.sound]: '≈', [T.river]: 'r', [T.beach]: '.',
  [T.grassland]: ',', [T.forest]: '#', [T.foothills]: 'v', [T.mountain]: '^',
  [T.steppe]: ':', [T.urban]: 'O',
};
const stepX = 3;
const stepY = 3;
let preview = '';
for (let ty = 0; ty < HEIGHT; ty += stepY) {
  let line = '';
  for (let tx = 0; tx < WIDTH; tx += stepX) line += GLYPH[grid[ty][tx]] ?? '?';
  preview += line + '\n';
}
console.log(preview);

// Terrain histogram (sanity check on balance).
const counts = {};
for (const row of grid) for (const v of row) counts[v] = (counts[v] || 0) + 1;
const total = WIDTH * HEIGHT;
for (const t of TERRAIN) {
  const pct = (((counts[t.id] || 0) / total) * 100).toFixed(1);
  console.log(`${t.key.padEnd(10)} ${String(pct).padStart(5)}%`);
}
console.log(`spawn tile: ${spawnTile.x},${spawnTile.y}`);

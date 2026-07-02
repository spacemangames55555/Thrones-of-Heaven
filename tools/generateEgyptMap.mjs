// Thrones of Heaven — EGYPT map generator (E3-1).
//
// Sibling of generateMap.mjs: emits the SAME zone-chunk JSON format the game's
// GameMap consumes, but for the EGYPT world — its own file, its own TERRAIN
// table, its own geography. washington.map.json and its generator are untouched.
//
// Geography (stylized like WA — recognizable, not literal; north = top/−y):
//   Mediterranean along the top; Alexandria NW coast; the green DELTA fan with
//   branching Nile arms down to CAIRO/GIZA at its apex; the blocking NILE ribbon
//   south to the map bottom with an irrigated strip on both banks + bridge
//   crossings; the FAIYUM oasis basin (lake + palms) SW of Cairo — the future
//   home-village country; Beni Suef / Minya / Asyut down the strip; the empty
//   deep WESTERN DESERT (the future rift country); the EASTERN DESERT hills
//   with a monastery + Red Sea salt flats; the RED SEA / GULF OF SUEZ wedge
//   separating the mainland from SINAI (crossed by ONE causeway at Suez); the
//   Sinai interior with three towns and MOUNT SINAI in its south (a walkable
//   approach valley + a clear flat site at its foot for the future outpost).
//
// Output: src/map/egypt.map.json
// Run:    node tools/generateEgyptMap.mjs
//
// The script FAILS (non-zero exit) if any city marker is unreachable on foot
// from the spawn — the whole map is guaranteed traversable at generation time.

import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- Dimensions (tunable) ----------------------------------------------------
const WIDTH = 600;
const HEIGHT = 650;
const TILE_SIZE = 32;
const ZONE_SIZE = 32;

// ---------------------------------------------------------------------------
// Terrain types. `id` is the per-map terrain id (mapped to atlas frames by KEY
// at runtime, so these ids are independent of Washington's). ids 10–18 stay
// reserved for the runtime town tiles, mirroring the WA convention.
// Reused keys (ocean/beach/grassland/mountain/urban/bridge/farmland/lake/pass)
// share Washington's atlas art; the six NEW keys get placeholder atlas rows.
// ---------------------------------------------------------------------------
const TERRAIN = [
  { id: 0, key: 'ocean', name: 'The Sea', color: '#16335f', blocks: true },
  { id: 3, key: 'beach', name: 'Shore / Salt Flat', color: '#ddca97', blocks: false },
  { id: 4, key: 'grassland', name: 'Green Verge', color: '#76b14e', blocks: false },
  { id: 7, key: 'mountain', name: 'Peak', color: '#e0e7ee', blocks: true },
  { id: 9, key: 'urban', name: 'City', color: '#9a9aa2', blocks: false },
  { id: 19, key: 'bridge', name: 'Bridge / Causeway', color: '#a9742f', blocks: false },
  { id: 20, key: 'lake', name: 'Lake Qarun', color: '#2b5c86', blocks: true },
  { id: 24, key: 'farmland', name: 'Farmland', color: '#d7c24f', blocks: false },
  { id: 26, key: 'pass', name: 'Desert Road', color: '#b7ad86', blocks: false },
  // --- the six NEW Egypt terrains ---
  { id: 30, key: 'dune_sand', name: 'Dune Sand', color: '#e2c07a', blocks: false },
  { id: 31, key: 'nile_water', name: 'The Nile', color: '#2e7fb8', blocks: true },
  { id: 32, key: 'irrigated_field', name: 'Irrigated Field', color: '#7fae3f', blocks: false },
  { id: 33, key: 'palm_oasis', name: 'Palm Oasis', color: '#3c8f4e', blocks: false },
  { id: 34, key: 'reed_marsh', name: 'Reed Marsh', color: '#6f9a5a', blocks: false },
  { id: 35, key: 'wadi_rock', name: 'Wadi Rock', color: '#8a6f4d', blocks: true },
];
const T = Object.fromEntries(TERRAIN.map((t) => [t.key, t.id]));
const BLOCKS = new Set(TERRAIN.filter((t) => t.blocks).map((t) => t.id));

// --- Helpers (normalized coords: nx 0..1 west→east, ny 0..1 north→south) -----
const grid = Array.from({ length: HEIGHT }, () => new Array(WIDTH).fill(T.dune_sand));
const tx = (nx) => Math.round(nx * (WIDTH - 1));
const ty = (ny) => Math.round(ny * (HEIGHT - 1));
const inb = (x, y) => x >= 0 && y >= 0 && x < WIDTH && y < HEIGHT;
const put = (x, y, id) => { if (inb(x, y)) grid[y][x] = id; };
const get = (x, y) => (inb(x, y) ? grid[y][x] : -1);

function hash(x, y) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

/** Paint a filled disc of terrain `id` (radius in tiles). */
function disc(cx, cy, r, id, keep = null) {
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      if (!inb(x, y)) continue;
      if ((x - cx) ** 2 + (y - cy) ** 2 > r * r) continue;
      if (keep && keep.has(get(x, y))) continue;
      put(x, y, id);
    }
  }
}

/** Paint along a polyline with the given half-width. `over(x,y)` picks the id. */
function ribbon(points, halfW, over) {
  for (let i = 0; i < points.length - 1; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];
    const steps = Math.ceil(Math.hypot(x2 - x1, y2 - y1)) * 2;
    for (let s = 0; s <= steps; s++) {
      const px = x1 + ((x2 - x1) * s) / steps;
      const py = y1 + ((y2 - y1) * s) / steps;
      for (let dy = -halfW; dy <= halfW; dy++) {
        for (let dx = -halfW; dx <= halfW; dx++) {
          if (dx * dx + dy * dy > halfW * halfW + 0.5) continue;
          const x = Math.round(px + dx);
          const y = Math.round(py + dy);
          if (!inb(x, y)) continue;
          const id = over(x, y);
          if (id !== null) put(x, y, id);
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 1) THE SEAS
// ---------------------------------------------------------------------------
// Mediterranean along the whole top edge, with a gently wavy coastline.
for (let x = 0; x < WIDTH; x++) {
  const coast = ty(0.045) + Math.round(Math.sin(x * 0.05) * 3 + Math.sin(x * 0.013) * 5);
  for (let y = 0; y <= coast; y++) put(x, y, T.ocean);
  for (let y = coast + 1; y <= coast + 2; y++) put(x, y, T.beach); // shoreline
}

// RED SEA / GULF OF SUEZ: a wedge from the bottom-right cutting NW to a head at
// Suez (0.72, 0.44). West edge slants; east edge bounds the Sinai triangle.
const GULF_HEAD = { x: tx(0.72), y: ty(0.44) };
for (let y = GULF_HEAD.y; y < HEIGHT; y++) {
  const t = (y - GULF_HEAD.y) / (HEIGHT - GULF_HEAD.y); // 0 at head → 1 at bottom
  const westEdge = GULF_HEAD.x - Math.round(t * tx(0.10));
  const eastEdge = GULF_HEAD.x + 2 + Math.round(t * tx(0.085));
  for (let x = westEdge; x <= eastEdge; x++) put(x, y, T.ocean);
  // Salt-flat / beach fringe on both shores.
  for (let x = westEdge - 3; x < westEdge; x++) if (get(x, y) === T.dune_sand) put(x, y, T.beach);
  for (let x = eastEdge + 1; x <= eastEdge + 3; x++) if (get(x, y) === T.dune_sand) put(x, y, T.beach);
}

// ---------------------------------------------------------------------------
// 2) THE DELTA + CAIRO + THE NILE
// ---------------------------------------------------------------------------
const CAIRO = { x: tx(0.42), y: ty(0.30) }; // the delta's apex, on the Nile

// The delta fan: green triangle from the apex up to the coast (nx 0.25..0.62).
for (let y = ty(0.07); y <= CAIRO.y; y++) {
  const t = (CAIRO.y - y) / (CAIRO.y - ty(0.07)); // 0 at apex → 1 at coast
  const half = Math.round(2 + t * tx(0.18));
  for (let x = CAIRO.x - half; x <= CAIRO.x + half; x++) {
    if (!inb(x, y) || get(x, y) === T.ocean || get(x, y) === T.beach) continue;
    const r = hash(x, y);
    // Mostly irrigated fields; farmland patches; reed marsh toward the coast.
    put(x, y, t > 0.75 && r < 0.45 ? T.reed_marsh : r < 0.30 ? T.farmland : T.irrigated_field);
  }
}

// Three branching Nile arms through the delta (blocking water, apex → sea).
const armEnds = [0.3, 0.44, 0.58];
for (const endNx of armEnds) {
  ribbon([[CAIRO.x, CAIRO.y], [tx(endNx), ty(0.06)]], 1, () => T.nile_water);
}

// THE NILE: a meandering blocking ribbon from Cairo south to the map bottom,
// with a green irrigated strip hugging both banks and desert beyond.
const nileAt = (y) => {
  const t = (y - CAIRO.y) / (HEIGHT - CAIRO.y);
  return CAIRO.x + Math.round(tx(0.05) * t + Math.sin(y * 0.02) * 6);
};
for (let y = CAIRO.y; y < HEIGHT; y++) {
  const cx = nileAt(y);
  for (let x = cx - 1; x <= cx + 1; x++) put(x, y, T.nile_water); // ~3 tiles wide
  for (let d = 2; d <= 7; d++) {
    for (const x of [cx - d, cx + d]) {
      if (get(x, y) !== T.dune_sand) continue;
      const r = hash(x, y);
      put(x, y, r < 0.14 ? T.palm_oasis : r < 0.3 ? T.farmland : T.irrigated_field);
    }
  }
}

// ---------------------------------------------------------------------------
// 3) THE FAIYUM (oasis basin SW of Cairo — the future home-village country)
// ---------------------------------------------------------------------------
const FAIYUM = { x: tx(0.3), y: ty(0.4) };
disc(FAIYUM.x, FAIYUM.y, Math.round(tx(0.055)), T.irrigated_field, new Set([T.nile_water]));
// Palm ring inside the basin, small blocking lake (Qarun) at its NW heart.
disc(FAIYUM.x, FAIYUM.y, Math.round(tx(0.032)), T.palm_oasis, new Set([T.nile_water]));
disc(FAIYUM.x - 8, FAIYUM.y - 6, 7, T.lake);
const FAIYUM_VILLAGE = { x: FAIYUM.x + 10, y: FAIYUM.y + 8 }; // SE of the lake, on palms

// ---------------------------------------------------------------------------
// 4) DESERT FEATURES: wadi ridges, Sinai mountains, the western empty expanse
// ---------------------------------------------------------------------------
// Scattered wadi-rock outcrops everywhere sand — EXCEPT the deep WESTERN
// interior (the future rift country: keep it open and empty).
const WEST_EXPANSE = { x0: tx(0.03), x1: tx(0.26), y0: ty(0.45), y1: ty(0.92) };
for (let y = ty(0.08); y < HEIGHT; y++) {
  for (let x = 0; x < WIDTH; x++) {
    if (get(x, y) !== T.dune_sand) continue;
    const inWest = x >= WEST_EXPANSE.x0 && x <= WEST_EXPANSE.x1 && y >= WEST_EXPANSE.y0 && y <= WEST_EXPANSE.y1;
    const density = inWest ? 0.004 : 0.02;
    if (hash(x * 3 + 11, y * 7 + 5) < density) {
      disc(x, y, 1 + Math.floor(hash(x, y * 2) * 3), T.wadi_rock, new Set([T.ocean, T.nile_water, T.urban, T.pass, T.bridge]));
    }
  }
}
// EASTERN DESERT ridges between the Nile strip and the Red Sea (heavier rock).
for (let i = 0; i < 60; i++) {
  const rx = tx(0.55 + hash(i, 3) * 0.13);
  const ry = ty(0.34 + hash(i, 9) * 0.5);
  if (get(rx, ry) === T.dune_sand) disc(rx, ry, 2 + Math.floor(hash(i, 5) * 4), T.wadi_rock, new Set([T.ocean, T.nile_water]));
}

// SINAI interior: heavy rock + mountains; MOUNT SINAI cluster in its south with
// a walkable approach valley from the north and a clear flat site at its foot.
const SINAI_X0 = GULF_HEAD.x + 6;
for (let i = 0; i < 90; i++) {
  const rx = tx(0.78 + hash(i, 21) * 0.2);
  const ry = ty(0.48 + hash(i, 33) * 0.48);
  if (rx <= SINAI_X0 || get(rx, ry) !== T.dune_sand) continue;
  disc(rx, ry, 2 + Math.floor(hash(i, 41) * 3), i % 3 === 0 ? T.mountain : T.wadi_rock, new Set([T.ocean]));
}
const MT_SINAI = { x: tx(0.88), y: ty(0.82) };
const ST_CATHERINE = { x: MT_SINAI.x - 10, y: MT_SINAI.y - 12 }; // the flat foot site
disc(MT_SINAI.x, MT_SINAI.y, 12, T.mountain, new Set([T.ocean]));
disc(MT_SINAI.x - 14, MT_SINAI.y - 4, 6, T.mountain, new Set([T.ocean]));
disc(MT_SINAI.x + 12, MT_SINAI.y - 8, 6, T.mountain, new Set([T.ocean]));
// The approach valley (NW → the foot) + the CLEAR flat site (no structures yet).
disc(ST_CATHERINE.x, ST_CATHERINE.y, 6, T.dune_sand);
ribbon([[ST_CATHERINE.x - 26, ST_CATHERINE.y - 24], [ST_CATHERINE.x, ST_CATHERINE.y]], 3, () => T.dune_sand);

// The MONASTERY site in the Eastern Desert hills.
const MONASTERY = { x: tx(0.62), y: ty(0.52) };
disc(MONASTERY.x, MONASTERY.y, 4, T.dune_sand);

// ---------------------------------------------------------------------------
// 5) CITIES (urban discs; marker list at the end)
// ---------------------------------------------------------------------------
const ALEXANDRIA = { x: tx(0.13), y: ty(0.085) };
const ZAGAZIG = { x: tx(0.5), y: ty(0.17) };
const GIZA = { x: CAIRO.x - 12, y: CAIRO.y + 4 }; // west bank; open desert at its west edge
const BENI_SUEF = { x: nileAt(ty(0.455)) - 6, y: ty(0.455) }; // west bank, SE of the Faiyum
const MINYA = { x: nileAt(ty(0.62)) - 6, y: ty(0.62) };
const ASYUT = { x: nileAt(ty(0.8)) - 6, y: ty(0.8) };
const SUEZ = { x: GULF_HEAD.x - 5, y: GULF_HEAD.y - 4 };
const NEKHEL = { x: tx(0.83), y: ty(0.56) };
const DAHAB = { x: tx(0.94), y: ty(0.7) };
const EL_TOR = { x: tx(0.8), y: ty(0.88) };
const urbanKeep = new Set([T.ocean, T.nile_water, T.lake]);
for (const c of [ALEXANDRIA, ZAGAZIG, CAIRO, GIZA, BENI_SUEF, MINYA, ASYUT, SUEZ, MONASTERY, NEKHEL, DAHAB, EL_TOR]) {
  disc(c.x, c.y, 4, T.urban, urbanKeep);
}

// ---------------------------------------------------------------------------
// 6) ROADS + BRIDGES (walkable network; bridge wherever a road crosses water)
// ---------------------------------------------------------------------------
const WATER = new Set([T.ocean, T.nile_water, T.lake]);
/** Lay a road along the points: 'pass' over land, 'bridge' over water. */
function road(points, halfW = 1) {
  ribbon(points, halfW, (x, y) => {
    const cur = get(x, y);
    if (cur === T.urban) return null; // keep city cores
    // Keep bridge on revisit: the sweep's overlapping stamps touch each tile
    // several times, and once water has turned to bridge a later touch must not
    // read it as land and downgrade the crossing to a plain road.
    if (cur === T.bridge) return T.bridge;
    if (cur === T.mountain || cur === T.wadi_rock) return T.pass; // carve through rock
    if (WATER.has(cur)) return T.bridge;
    return T.pass;
  });
}
road([[ALEXANDRIA.x, ALEXANDRIA.y], [tx(0.24), ty(0.2)], [CAIRO.x - 4, CAIRO.y - 2]]); // Alexandria → Cairo (delta W edge)
road([[ZAGAZIG.x, ZAGAZIG.y], [CAIRO.x, CAIRO.y - 6], [CAIRO.x, CAIRO.y]]); // Zagazig → Cairo
road([[CAIRO.x, CAIRO.y], [GIZA.x, GIZA.y]]); // Cairo → Giza (crosses the Nile → bridge @ Cairo)
road([[GIZA.x, GIZA.y], [FAIYUM_VILLAGE.x, FAIYUM_VILLAGE.y]]); // Giza → the Faiyum village
road([[FAIYUM_VILLAGE.x, FAIYUM_VILLAGE.y], [BENI_SUEF.x, BENI_SUEF.y]]); // Faiyum → Beni Suef
road([[BENI_SUEF.x, BENI_SUEF.y], [MINYA.x, MINYA.y], [ASYUT.x, ASYUT.y]]); // down the west-bank strip
road([[CAIRO.x, CAIRO.y], [tx(0.56), ty(0.36)], [SUEZ.x, SUEZ.y]]); // the desert road east to Suez
road([[SUEZ.x, SUEZ.y], [GULF_HEAD.x + 4, GULF_HEAD.y - 2], [NEKHEL.x, NEKHEL.y]]); // around the gulf head → Sinai
road([[NEKHEL.x, NEKHEL.y], [ST_CATHERINE.x - 20, ST_CATHERINE.y - 20], [ST_CATHERINE.x, ST_CATHERINE.y]]); // → Mount Sinai approach
road([[NEKHEL.x, NEKHEL.y], [DAHAB.x, DAHAB.y]]); // → Dahab
road([[ST_CATHERINE.x, ST_CATHERINE.y], [EL_TOR.x, EL_TOR.y]]); // → El-Tor
road([[CAIRO.x - 4, CAIRO.y - 2], [MONASTERY.x, MONASTERY.y]], 1); // the monastery track

// SUEZ CAUSEWAY: the one explicit land crossing over the gulf tip (a straight
// bridge line just south of the head, so the crossing reads deliberately).
ribbon([[GULF_HEAD.x - 8, GULF_HEAD.y + 6], [GULF_HEAD.x + 10, GULF_HEAD.y + 6]], 1, (x, y) => {
  const cur = get(x, y);
  return WATER.has(cur) || cur === T.bridge ? T.bridge : T.pass; // keep bridge on revisit
});

// NILE BRIDGE CROSSINGS (Cairo's came from the Cairo→Giza road): the ferry
// landing mid-river, Beni Suef, and Asyut each get an east–west bridge line.
for (const ny of [0.455, 0.6, 0.8]) {
  const y = ty(ny);
  const cx = nileAt(y);
  ribbon([[cx - 9, y], [cx + 9, y]], 1, (x, yy) => {
    const cur = get(x, yy);
    return WATER.has(cur) || cur === T.bridge ? T.bridge : T.pass; // keep bridge on revisit
  });
}

// ---------------------------------------------------------------------------
// 7) SPAWN + CITY MARKERS
// ---------------------------------------------------------------------------
const spawnTile = { x: FAIYUM_VILLAGE.x, y: FAIYUM_VILLAGE.y };
const cities = [
  { name: 'Alexandria', tx: ALEXANDRIA.x, ty: ALEXANDRIA.y },
  { name: 'Zagazig', tx: ZAGAZIG.x, ty: ZAGAZIG.y },
  { name: 'Cairo', tx: CAIRO.x, ty: CAIRO.y },
  { name: 'Giza', tx: GIZA.x, ty: GIZA.y },
  { name: 'Faiyum Village', tx: FAIYUM_VILLAGE.x, ty: FAIYUM_VILLAGE.y },
  { name: 'Beni Suef', tx: BENI_SUEF.x, ty: BENI_SUEF.y },
  { name: 'Minya', tx: MINYA.x, ty: MINYA.y },
  { name: 'Asyut', tx: ASYUT.x, ty: ASYUT.y },
  { name: 'The Monastery', tx: MONASTERY.x, ty: MONASTERY.y },
  { name: 'Suez', tx: SUEZ.x, ty: SUEZ.y },
  { name: 'Nekhel', tx: NEKHEL.x, ty: NEKHEL.y },
  { name: 'Dahab', tx: DAHAB.x, ty: DAHAB.y },
  { name: 'El-Tor', tx: EL_TOR.x, ty: EL_TOR.y },
  { name: 'Saint Catherine', tx: ST_CATHERINE.x, ty: ST_CATHERINE.y },
];

// ---------------------------------------------------------------------------
// 8) TRAVERSABILITY CHECK (BFS from the spawn over walkable tiles) — the script
//    FAILS if any city is unreachable, so a sealed-off map can never ship.
// ---------------------------------------------------------------------------
function bfsReach() {
  const seen = Array.from({ length: HEIGHT }, () => new Uint8Array(WIDTH));
  const qx = [spawnTile.x];
  const qy = [spawnTile.y];
  seen[spawnTile.y][spawnTile.x] = 1;
  let head = 0;
  while (head < qx.length) {
    const x = qx[head];
    const y = qy[head];
    head++;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx2 = x + dx;
      const ny2 = y + dy;
      if (!inb(nx2, ny2) || seen[ny2][nx2] || BLOCKS.has(grid[ny2][nx2])) continue;
      seen[ny2][nx2] = 1;
      qx.push(nx2);
      qy.push(ny2);
    }
  }
  return seen;
}
if (BLOCKS.has(grid[spawnTile.y][spawnTile.x])) {
  console.error('FATAL: spawn tile is blocked');
  process.exit(1);
}
const reach = bfsReach();
let fail = false;
for (const c of cities) {
  // A city marker must be reachable at (or adjacent to) its tile.
  const ok = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => inb(c.tx + dx, c.ty + dy) && reach[c.ty + dy][c.tx + dx]);
  if (!ok) {
    console.error(`FATAL: city unreachable from spawn: ${c.name} (${c.tx},${c.ty})`);
    fail = true;
  }
}
let walkable = 0;
let reached = 0;
for (let y = 0; y < HEIGHT; y++) {
  for (let x = 0; x < WIDTH; x++) {
    if (!BLOCKS.has(grid[y][x])) {
      walkable++;
      if (reach[y][x]) reached++;
    }
  }
}
console.log(`walkable reach: ${((reached / walkable) * 100).toFixed(1)}% of walkable tiles connected to spawn`);
if (fail) process.exit(1);

// ---------------------------------------------------------------------------
// 9) EMIT (same zone-chunk format as washington.map.json)
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

const out = {
  name: 'Egypt',
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

const outPath = resolve(__dirname, '../src/map/egypt.map.json');
writeFileSync(outPath, JSON.stringify(out));
console.log(`Wrote ${outPath} (${WIDTH}x${HEIGHT}, ${zones.length} zones)`);

// --- ASCII preview + histogram ------------------------------------------------
const GLYPH = {
  [T.ocean]: '~', [T.beach]: '.', [T.grassland]: ',', [T.mountain]: '^',
  [T.urban]: 'O', [T.bridge]: '=', [T.lake]: 'L', [T.farmland]: 'w',
  [T.pass]: '+', [T.dune_sand]: ' ', [T.nile_water]: 'N', [T.irrigated_field]: 'i',
  [T.palm_oasis]: 'p', [T.reed_marsh]: 'm', [T.wadi_rock]: 'x',
};
const stepX = Math.ceil(WIDTH / 110);
const stepY = Math.ceil(HEIGHT / 55);
let preview = '';
for (let y = 0; y < HEIGHT; y += stepY) {
  let line = '';
  for (let x = 0; x < WIDTH; x += stepX) line += GLYPH[grid[y][x]] ?? '?';
  preview += line + '\n';
}
console.log(preview);
const counts = {};
for (const row of grid) for (const v of row) counts[v] = (counts[v] || 0) + 1;
for (const t of TERRAIN) {
  console.log(`${t.key.padEnd(16)} ${(((counts[t.id] || 0) / (WIDTH * HEIGHT)) * 100).toFixed(1)}%`);
}
console.log(`spawn tile: ${spawnTile.x},${spawnTile.y}`);

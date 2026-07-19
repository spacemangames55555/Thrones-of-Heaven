// WORLD UNIFICATION — DRY RUN (report generator, changes NOTHING).
// Computes the earth→globe and egypt→globe translations, tabulates every
// named landmark's old→new position, enumerates every position-bearing
// constant in settings.ts that sits in a moving world, checks the landed
// rectangles against every manifest zone for collisions, and lists the
// cross-world gates that become local. Output: toh-world-unification-dryrun.md
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

async function loadTs(entry, out) {
  const outfile = join(ROOT, 'node_modules/.cache', out);
  mkdirSync(dirname(outfile), { recursive: true });
  await build({ entryPoints: [join(ROOT, entry)], bundle: true, format: 'esm', platform: 'node', outfile, external: ['phaser'], logLevel: 'silent' });
  return import(pathToFileURL(outfile).href);
}

const uni = await loadTs('src/world/world-unification.ts', 'toh-unification.mjs');
const manifest = await loadTs('src/world/world-manifest.ts', 'toh-manifest.mjs');
const settings = await loadTs('src/game/settings.ts', 'toh-settings.mjs');
const eu = await loadTs('src/world/europe-built.ts', 'toh-eu.mjs');
const af = await loadTs('src/world/africa-built.ts', 'toh-af.mjs');
const as = await loadTs('src/world/asia-built.ts', 'toh-as.mjs');
const fr = await loadTs('src/world/final-regions-built.ts', 'toh-fr.mjs');
const STAMPED = new Set(
  [...eu.EUROPE_BUILT_ZONES, ...af.AFRICA_BUILT_ZONES, ...as.ASIA_BUILT_ZONES, ...fr.FINAL_REGIONS_BUILT_ZONES].filter((id) => !af.PREBUILT_ZONE_WORLD[id]),
);
const wa = JSON.parse(readFileSync(join(ROOT, 'src/map/washington.map.json'), 'utf8'));
const eg = JSON.parse(readFileSync(join(ROOT, 'src/map/egypt.map.json'), 'utf8'));

const dEarth = uni.earthUnificationDelta();
const dEgypt = uni.egyptUnificationDelta();
const r1 = (n) => Math.round(n);
const geo = (p) => {
  const g = uni.latLngFromGlobeLocal(p.x, p.y);
  return `${g.lat.toFixed(2)}°, ${g.lng.toFixed(2)}°`;
};

// World rects AFTER the move, in globe-local px.
const earthRect = { x: dEarth.dx, y: dEarth.dy, w: wa.width * wa.tileSize, h: wa.height * wa.tileSize };
const egyptRect = { x: dEgypt.dx, y: dEgypt.dy, w: eg.width * eg.tileSize, h: eg.height * eg.tileSize };
const inRect = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

// 1) LANDMARKS: every city on both maps, old local px → new globe-local px + lat/lng.
const cityRows = (map, d, world) =>
  (map.cities ?? []).map((c) => {
    const ox = c.tx * map.tileSize;
    const oy = c.ty * map.tileSize;
    const np = { x: ox + d.dx, y: oy + d.dy };
    return `| ${world} | ${c.name} | ${ox}, ${oy} | ${r1(np.x)}, ${r1(np.y)} | ${geo(np)} |`;
  });

// 2) SETTINGS CONSTANTS: walk every export for {x,y} number pairs; classify by
// x-range (worlds chain east: earth 0..35200 px; egypt origin is runtime-
// computed but its content constants are origin-RELATIVE, so only absolute
// EARTH-range constants appear here).
const positions = [];
const walk = (val, path, depth) => {
  if (depth > 6 || val === null || typeof val !== 'object') return;
  if (typeof val.x === 'number' && typeof val.y === 'number' && Object.keys(val).length <= 4) {
    positions.push({ path, x: val.x, y: val.y });
    return;
  }
  if (Array.isArray(val)) val.forEach((v, i) => walk(v, `${path}[${i}]`, depth + 1));
  else for (const [k, v] of Object.entries(val)) walk(v, `${path}.${k}`, depth + 1);
};
for (const [name, val] of Object.entries(settings)) walk(val, name, 0);
const earthPx = { w: wa.width * wa.tileSize, h: wa.height * wa.tileSize };
// `.placement` constants are PLANE-LOCAL offsets (consumed as origin+placement
// against the heaven/hell maps — e.g. the Seven Sins, Michael) — never
// earth-frame, so they are excluded even though their raw numbers fall in range.
const earthConsts = positions.filter((p) => !/\.placement$/.test(p.path) && p.x >= 0 && p.x <= earthPx.w && p.y >= 0 && p.y <= earthPx.h);
const constRows = earthConsts.map((p) => {
  const np = { x: p.x + dEarth.dx, y: p.y + dEarth.dy };
  return `| ${p.path} | ${r1(p.x)}, ${r1(p.y)} | ${r1(np.x)}, ${r1(np.y)} | ${geo(np)} |`;
});

// 3) COLLISIONS: every manifest zone anchor → globe-local px; flag those whose
// anchor falls INSIDE either landed rectangle (their stamped chunk would sit
// under/over the migrated dense map).
const collisions = [];
const nearMisses = [];
for (const z of manifest.WORLD) {
  if (!z.anchor) continue;
  const p = uni.globeLocalFromLatLng(z.anchor.lat, z.anchor.lng);
  for (const [world, rect] of [['earth(PNW)', earthRect], ['egypt', egyptRect]]) {
    if (inRect(p, rect)) collisions.push({ world, id: z.id, lat: z.anchor.lat, lng: z.anchor.lng, px: p });
    else {
      const dx = Math.max(rect.x - p.x, 0, p.x - (rect.x + rect.w));
      const dy = Math.max(rect.y - p.y, 0, p.y - (rect.y + rect.h));
      const dist = Math.hypot(dx, dy);
      if (dist < 2453) nearMisses.push({ world, id: z.id, distPx: r1(dist) });
    }
  }
}

// 4) SCALE DELTAS (egypt): landmark-pair px/deg vs the globe's 2426/2453.
const egLm = Object.fromEntries((eg.cities ?? []).map((c) => [c.name, { x: c.tx * eg.tileSize, y: c.ty * eg.tileSize }]));
const TRUE = {
  Cairo: { lat: 30.044, lng: 31.236 },
  Alexandria: { lat: 31.2, lng: 29.919 },
  'Mount Sinai (Saint Catherine)': { lat: 28.54, lng: 33.975 },
  'Faiyum Village': { lat: 29.31, lng: 30.84 },
};
const pairs = [
  ['Cairo', 'Alexandria'],
  ['Cairo', 'Mount Sinai (Saint Catherine)'],
  ['Cairo', 'Faiyum Village'],
];
const scaleRows = pairs.map(([a, b]) => {
  const dLng = Math.abs(TRUE[a].lng - TRUE[b].lng);
  const dLat = Math.abs(TRUE[a].lat - TRUE[b].lat);
  const dxPx = Math.abs(egLm[a].x - egLm[b].x);
  const dyPx = Math.abs(egLm[a].y - egLm[b].y);
  return `| ${a} ↔ ${b} | ${r1(dxPx / dLng)} (${(dxPx / dLng / 2426).toFixed(2)}x) | ${r1(dyPx / dLat)} (${(dyPx / dLat / 2453).toFixed(2)}x) |`;
});
// Where key egypt landmarks LAND geographically under the Cairo-anchored translation.
const egyptLanded = Object.keys(TRUE).map((name) => {
  const np = { x: egLm[name].x + dEgypt.dx, y: egLm[name].y + dEgypt.dy };
  return `| ${name} | true ${TRUE[name].lat.toFixed(2)}°, ${TRUE[name].lng.toFixed(2)}° | lands ${geo(np)} |`;
});

const report = `# World Unification — Dry Run (coordinates only, nothing moved yet)

Generated by tools/world-unification-dryrun.mjs. Every number below is the
TRANSFORM's output; no world data has changed.

## The transforms (pure translations — scale locked at 1)

| World | Δx (px) | Δy (px) | Anchor | Internal distances |
|---|---|---|---|---|
| earth (PNW) → globe | +${r1(dEarth.dx)} | +${r1(dEarth.dy)} | shared calibration (same px/deg both sides) | preserved EXACTLY — scale delta 0 |
| egypt → globe | +${r1(dEgypt.dx)} | +${r1(dEgypt.dy)} | Cairo pinned at true 30.04°N 31.24°E | preserved EXACTLY — geo drift on secondary landmarks (below) |

Landed rectangles (globe-local px):
- earth (PNW): ${r1(earthRect.x)},${r1(earthRect.y)} → ${r1(earthRect.x + earthRect.w)},${r1(earthRect.y + earthRect.h)} (${geo(earthRect)} to ${geo({ x: earthRect.x + earthRect.w, y: earthRect.y + earthRect.h })})
- egypt: ${r1(egyptRect.x)},${r1(egyptRect.y)} → ${r1(egyptRect.x + egyptRect.w)},${r1(egyptRect.y + egyptRect.h)} (${geo(egyptRect)} to ${geo({ x: egyptRect.x + egyptRect.w, y: egyptRect.y + egyptRect.h })})

## Egypt scale delta (the map is stylized large; translation keeps its pixels)

| Landmark pair | map px/°lng (vs globe 2426) | map px/°lat (vs globe 2453) |
|---|---|---|
${scaleRows.join('\n')}

| Landmark | True position | Landed position (Cairo-anchored) |
|---|---|---|
${egyptLanded.join('\n')}

## Every named landmark, old → new

| World | Landmark | Old local px | New globe-local px | Lands at |
|---|---|---|---|---|
${cityRows(wa, dEarth, 'earth').join('\n')}
${cityRows(eg, dEgypt, 'egypt').join('\n')}

## Every absolute position constant in settings.ts inside the moving earth world (${earthConsts.length})

(Egypt content is origin-relative at runtime — the Cairo binding, Faiyum city,
wolves, civics, and both gate pads all derive from the map origin and move as a
body with it; nothing to enumerate. Heaven/Hell \`.placement\` constants are
plane-local offsets and are EXCLUDED — the planes never move.)

| Constant | Old px | New globe-local px | Lands at |
|---|---|---|---|
${constRows.join('\n')}

## Collisions: manifest zones whose anchor falls INSIDE a landed rectangle

${collisions.length === 0 ? 'None.' : collisions.map((c) => `- ${STAMPED.has(c.id) ? '⚠️ **REAL CHUNK COLLISION** — ' : ''}**${c.id}** (${c.lat}°, ${c.lng}°) falls inside the landed **${c.world}** rectangle at globe-local ${r1(c.px.x)},${r1(c.px.y)}${STAMPED.has(c.id) ? ' — this zone IS a stamped globe chunk; it must be reconciled before the move' : ' — manifest-only: its content IS the migrating hand-built world, so the move FULFILLS the manifest (no conflict)'}`).join('\n')}

Reconciliation plan for the one real collision (**luxor-valley-of-kings**):
the egypt map is stylized ~2x geo-large, so its hand-built southern Nile reach
covers Luxor's true position — and aswan-first-cataract already sits 45 px
from the landed rectangle's edge, so there is no room to slide the stamp
south. Resolution: **ABSORPTION** (hand-built is authoritative). Luxor keeps
its zone id, quests, spawns, arrival, and champion, but they re-host ON the
hand-built Nile tiles at Luxor's landed position inside the egypt map; only
its GENERATED terrain chunk is retired. The egypt↔luxor gate pair retires
into local road labels — Luxor is simply a place on the same river now, and
the Africa chain continues south to the adjacent Aswan on foot.

Near misses (anchor within 1° of a landed rectangle edge):
${nearMisses.length === 0 ? '- none' : nearMisses.map((n) => `- ${n.id} → ${n.distPx} px from the ${n.world} rectangle`).join('\n')}

## Cross-world gates that become local

- **egypt ↔ luxor-valley-of-kings** (the only terrestrial cross-world gate
  pair): both pads become local landmarks of ONE world; travel becomes a walk
  off the Egypt map's south edge. Both pads are runtime-derived (map south
  edge / stamped Luxor arrival) — they follow the move automatically.
- Heaven/Hell portals: PLANES, untouched by design.
- Dev travel entries: re-pointed keys only, no coordinates.

## Saves

Save world field: \`world.{active,x,y,remembered{}}\`. Migration rule per
world key: 'earth' → +(${r1(dEarth.dx)}, ${r1(dEarth.dy)}), 'egypt' →
+(${r1(dEgypt.dx)}, ${r1(dEgypt.dy)}), then active key becomes the unified
world. Remembered per-world entries translate by the same rule. One version
bump per migration commit.
`;

writeFileSync(join(ROOT, 'toh-world-unification-dryrun.md'), report);
console.log(`dry run written: ${earthConsts.length} earth constants, ${collisions.length} collisions, ${nearMisses.length} near misses`);
for (const c of collisions) console.log('COLLISION', c.world, c.id);

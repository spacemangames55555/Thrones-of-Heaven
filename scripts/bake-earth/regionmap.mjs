#!/usr/bin/env node
// REGIONAL MAP BAKE (Pass 6D): per region in regions.json, render
// public/world/regions/{id}-map.png from the REGION pack grid — the map tier
// between gameplay tiles and the planet image. Same cartographic rules as
// worldmap.mjs (MAP_PALETTE + quantized NW-lit hillshade with a flat dead
// zone), but sampled 1:1 from the region grid at its native resolution (one
// image px per 16-tile grid cell — rivers arrive as baked FRESHWATER cells).
// If a PNG exceeds the 6 MB budget it is downscaled to a 2048 long edge and
// the manifest entry states it. Updates regions.json (per-region `map` entry)
// and bake-manifest outputs + shas in place.
// Run: npm run bake:regionmaps  (requires the committed region packs).
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { PNG } from 'pngjs';
import { build } from 'esbuild';

const MAX_BYTES = 6 * 1024 * 1024;
const DOWNSCALE_LONG_EDGE = 2048;

const mod = async (entry, tag) => {
  const outfile = new URL(`../../node_modules/.cache/toh-rm-${tag}.mjs`, import.meta.url).pathname;
  await build({ entryPoints: [new URL(entry, import.meta.url).pathname], bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'silent' });
  return import(outfile);
};
const earth = await mod('../../src/world/terrain-earth.ts', 'earth');
const vis = await mod('../../src/world/terrain-visuals-config.ts', 'vis');
const schema = await mod('../../src/world/terrain-schema.ts', 'schema');
const B = schema.Biome;

const regionsFile = new URL('../../public/world/regions.json', import.meta.url).pathname;
const regions = JSON.parse(readFileSync(regionsFile, 'utf8'));
const manifestFile = new URL('./bake-manifest.json', import.meta.url).pathname;
const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));

function renderRegion(entry) {
  const packPath = new URL(`../../public/world/${entry.file}`, import.meta.url).pathname;
  // Pass 7: committed packs are gzip; decode truth is the DECOMPRESSED bytes.
  const rawFile = readFileSync(packPath);
  const raw = entry.file.endsWith('.gz') ? gunzipSync(rawFile) : rawFile;
  const g = earth.decodeRegionPack(entry.id, raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength));
  console.log(`${entry.id}: grid ${g.w}×${g.h} (${g.stepTiles} tiles/cell) — rendering…`);
  const png = new PNG({ width: g.w, height: g.h, colorType: 2, deflateLevel: 9 });
  const at = (x, y) => {
    const cx = Math.min(g.w - 1, Math.max(0, x));
    const cy = Math.min(g.h - 1, Math.max(0, y));
    return cy * g.w + cx;
  };
  for (let y = 0; y < g.h; y++) {
    for (let x = 0; x < g.w; x++) {
      const o = at(x, y);
      let biome = g.biome[o];
      const band = g.elev[o];
      // The SAME elevation overrides the earth source applies at runtime —
      // probe classes must match the live truth (Rainier reads high band).
      if (biome !== B.OCEAN && biome !== B.FRESHWATER) {
        if (band >= earth.EARTH_SNOW_BAND) biome = B.SNOW;
        else if (band >= earth.EARTH_ROCK_BAND) biome = B.ROCK;
      }
      const base = vis.MAP_PALETTE[biome];
      let shade = 1;
      if (biome !== B.OCEAN && biome !== B.FRESHWATER) {
        // NW-lit relief, quantized, with the flat dead zone (PNG budget).
        const d = g.elev[at(x + 1, y + 1)] - g.elev[at(x - 1, y - 1)];
        const s = d * 0.03;
        if (Math.abs(s) > 0.045) shade = Math.round(Math.max(0.82, Math.min(1.18, 1 + s)) * 16) / 16;
      }
      const p = (y * g.w + x) * 4; // pngjs data is ALWAYS RGBA
      png.data[p] = Math.min(255, Math.round(((base >> 16) & 0xff) * shade));
      png.data[p + 1] = Math.min(255, Math.round(((base >> 8) & 0xff) * shade));
      png.data[p + 2] = Math.min(255, Math.round((base & 0xff) * shade));
      png.data[p + 3] = 255;
    }
    if (y % 256 === 0) process.stdout.write(`  row ${y}/${g.h}\r`);
  }
  let outPng = png;
  let scale = 1;
  let bytes = PNG.sync.write(png, { colorType: 2, deflateLevel: 9 });
  if (bytes.length > MAX_BYTES) {
    // Budget blown at native resolution: downscale to the stated long edge
    // (nearest sample — cartographic classes must stay exact colors).
    scale = DOWNSCALE_LONG_EDGE / Math.max(g.w, g.h);
    const w2 = Math.round(g.w * scale);
    const h2 = Math.round(g.h * scale);
    console.log(`\n${entry.id}: ${(bytes.length / 1048576).toFixed(2)} MB > 6 MB — downscaling to ${w2}×${h2}`);
    const small = new PNG({ width: w2, height: h2, colorType: 2, deflateLevel: 9 });
    for (let y = 0; y < h2; y++) {
      for (let x = 0; x < w2; x++) {
        const sx = Math.min(g.w - 1, Math.floor((x + 0.5) / scale));
        const sy = Math.min(g.h - 1, Math.floor((y + 0.5) / scale));
        const so = (sy * g.w + sx) * 4;
        const dof = (y * w2 + x) * 4;
        small.data[dof] = png.data[so];
        small.data[dof + 1] = png.data[so + 1];
        small.data[dof + 2] = png.data[so + 2];
        small.data[dof + 3] = 255;
      }
    }
    outPng = small;
    bytes = PNG.sync.write(small, { colorType: 2, deflateLevel: 9 });
  }
  const file = `regions/${entry.id}-map.png`;
  writeFileSync(new URL(`../../public/world/${file}`, import.meta.url).pathname, bytes);
  const sha = createHash('sha256').update(bytes).digest('hex');
  console.log(`\n${file}: ${outPng.width}×${outPng.height}, ${(bytes.length / 1048576).toFixed(2)} MB, sha256 ${sha.slice(0, 12)}…`);
  entry.map = { file, w: outPng.width, h: outPng.height, bytes: bytes.length, sha256: sha, ...(scale !== 1 ? { downscaledFrom: { w: g.w, h: g.h } } : {}) };
  const manifestPath = `public/world/${file}`;
  manifest.outputs = manifest.outputs.filter((o) => o.file !== manifestPath);
  manifest.outputs.push({ file: manifestPath, bytes: bytes.length, sha256: sha });
}

for (const entry of regions.regions) renderRegion(entry);

// Manifest updates (in place): regions.json first, then bake-manifest
// re-hashes regions.json (itself a tracked output) with the new entries.
const regionsOut = JSON.stringify(regions, null, 2);
writeFileSync(regionsFile, regionsOut);
const rj = manifest.outputs.find((o) => o.file === 'public/world/regions.json');
if (rj) {
  rj.bytes = Buffer.byteLength(regionsOut);
  rj.sha256 = createHash('sha256').update(regionsOut).digest('hex');
}
writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + '\n');
const total = manifest.outputs.reduce((a, o) => a + (o.gzBytes ?? o.bytes), 0); // committed bytes (gz where compressed)
console.log(`manifests updated — pack total now ${(total / 1048576).toFixed(1)} MB`);

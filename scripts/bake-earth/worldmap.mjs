#!/usr/bin/env node
// WORLDMAP BAKE (Pass 6A): planet.bin → public/world/worldmap.png — the
// full-Earth map-mode image. Rendered through the SAME composed per-tile
// truth the runtime uses (earthTileRecord, planet-only: region detail insets
// are ledgered) and colored via MAP_PALETTE (terrain-visuals-config) with a
// bake-time hillshade from the real elevation plane. Updates bake-manifest
// outputs + the regions.json worldmap entry (bytes + sha256) in place.
// Run: npm run bake:worldmap  (requires the committed planet.bin).
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { PNG } from 'pngjs';
import { build } from 'esbuild';

const MAX_BYTES = 1.5 * 1024 * 1024; // the spec budget — hard-enforced

const mod = async (entry, tag) => {
  const outfile = new URL(`../../node_modules/.cache/toh-wm-${tag}.mjs`, import.meta.url).pathname;
  await build({ entryPoints: [new URL(entry, import.meta.url).pathname], bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'silent' });
  return import(outfile);
};
const earth = await mod('../../src/world/terrain-earth.ts', 'earth');
const vis = await mod('../../src/world/terrain-visuals-config.ts', 'vis');
const ws = await mod('../../src/world/world-scale.ts', 'scale');
const schema = await mod('../../src/world/terrain-schema.ts', 'schema');

const planetFile = new URL('../../public/world/planet.bin', import.meta.url).pathname;
const raw = readFileSync(planetFile);
const planet = earth.decodePlanetPack(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength));

const W = vis.WORLDMAP_WIDTH;
const worldPxW = 360 * ws.PX_PER_DEG_LNG;
const worldPxH = 170 * ws.PX_PER_DEG_LAT;
const H = Math.round((W * worldPxH) / worldPxW);
const tilesX = worldPxW / 32;
const tilesY = worldPxH / 32;
const B = schema.Biome;

// Smooth bilinear elevation over the planet elevation plane (image-scale
// relief; the per-tile record's detail noise would read as speckle here).
function elevAt(txf, tyf) {
  const gx = Math.min(planet.peW - 1.001, Math.max(0, txf / planet.peStep - 0.5));
  const gy = Math.min(planet.peH - 1.001, Math.max(0, tyf / planet.peStep - 0.5));
  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const fx = gx - x0;
  const fy = gy - y0;
  const at = (x, y) => planet.elev[y * planet.peW + x];
  return (
    at(x0, y0) * (1 - fx) * (1 - fy) +
    at(x0 + 1, y0) * fx * (1 - fy) +
    at(x0, y0 + 1) * (1 - fx) * fy +
    at(x0 + 1, y0 + 1) * fx * fy
  );
}

console.log(`worldmap: ${W}×${H} from planet ${planet.pbW}×${planet.pbH} biome / ${planet.peW}×${planet.peH} elev…`);
const png = new PNG({ width: W, height: H, colorType: 2, deflateLevel: 9 });
const gradStepTiles = (tilesX / W) * 2; // hillshade gradient step ≈ 2 image px
// MAP SAMPLING: one image px covers ~667 tiles (~21 km) — coarser than the
// biome plane itself — so the plane is sampled NEAREST (clean cartographic
// regions; the runtime's per-tile jitter/detail-noise would only speckle
// boundaries and quadruple the PNG). The SAME elevation overrides the earth
// source applies (EARTH_SNOW_BAND / EARTH_ROCK_BAND) apply here, so the
// probe classes match the runtime truth.
// The derived-biome plane carries per-sample class noise (its octaves were
// tuned for tile-scale jitter). At 21 km/px that reads as pure dither — a
// MODE filter over each pixel's plane-sample footprint (5×5) yields the
// coherent cartographic regions a map wants, while water/land membership
// and the probe classes stay those of the underlying truth.
const counts = new Uint32Array(16);
function mapBiomeAt(txf, tyf) {
  const cx = Math.round(txf / planet.pbStep - 0.5);
  const cy = Math.round(tyf / planet.pbStep - 0.5);
  counts.fill(0);
  for (let dy = -2; dy <= 2; dy++) {
    const gy = Math.min(planet.pbH - 1, Math.max(0, cy + dy));
    for (let dx = -2; dx <= 2; dx++) {
      const gx = Math.min(planet.pbW - 1, Math.max(0, cx + dx));
      counts[planet.biome[gy * planet.pbW + gx]]++;
    }
  }
  let b = 0;
  for (let k = 1; k < 16; k++) if (counts[k] > counts[b]) b = k;
  if (b !== B.OCEAN && b !== B.FRESHWATER) {
    // Ridge-preserving override: bilinear smoothing would clip 1–2 px peaks
    // (Everest is barely 2 map px) below the thresholds — take the MAX of
    // the surrounding elevation samples instead.
    const gx0 = Math.min(planet.peW - 2, Math.max(0, Math.floor(txf / planet.peStep - 0.5)));
    const gy0 = Math.min(planet.peH - 2, Math.max(0, Math.floor(tyf / planet.peStep - 0.5)));
    const band = Math.max(
      planet.elev[gy0 * planet.peW + gx0],
      planet.elev[gy0 * planet.peW + gx0 + 1],
      planet.elev[(gy0 + 1) * planet.peW + gx0],
      planet.elev[(gy0 + 1) * planet.peW + gx0 + 1],
    );
    if (band >= earth.EARTH_SNOW_BAND) b = B.SNOW;
    else if (band >= earth.EARTH_ROCK_BAND) b = B.ROCK;
  }
  return b;
}
for (let y = 0; y < H; y++) {
  const tyf = ((y + 0.5) / H) * tilesY;
  for (let x = 0; x < W; x++) {
    const txf = ((x + 0.5) / W) * tilesX;
    const biome = mapBiomeAt(txf, tyf);
    const base = vis.MAP_PALETTE[biome];
    let shade = 1;
    if (biome !== B.OCEAN && biome !== B.FRESHWATER) {
      // NW-lit relief: ground rising toward SE faces the light. A DEAD ZONE
      // keeps flat terrain at exactly the base color (long PNG runs — the
      // budget lives or dies on this) and coarse quantization keeps the
      // mountain shading to a handful of tones.
      const d = elevAt(txf + gradStepTiles, tyf + gradStepTiles) - elevAt(txf - gradStepTiles, tyf - gradStepTiles);
      const s = d * 0.012;
      if (Math.abs(s) > 0.045) shade = Math.round(Math.max(0.82, Math.min(1.18, 1 + s)) * 16) / 16;
    }
    const o = (y * W + x) * 4; // pngjs data is ALWAYS RGBA; colorType 2 applies at encode
    png.data[o] = Math.min(255, Math.round(((base >> 16) & 0xff) * shade));
    png.data[o + 1] = Math.min(255, Math.round(((base >> 8) & 0xff) * shade));
    png.data[o + 2] = Math.min(255, Math.round((base & 0xff) * shade));
    png.data[o + 3] = 255;
  }
  if (y % 256 === 0) process.stdout.write(`  row ${y}/${H}\r`);
}
const out = PNG.sync.write(png, { colorType: 2, deflateLevel: 9 });
const outFile = new URL('../../public/world/worldmap.png', import.meta.url).pathname;
writeFileSync(outFile, out);
const sha = createHash('sha256').update(out).digest('hex');
console.log(`\nworldmap.png: ${out.length} bytes (${(out.length / 1048576).toFixed(2)} MB), sha256 ${sha.slice(0, 12)}…`);
if (out.length > MAX_BYTES) {
  console.error(`worldmap.png exceeds the ${(MAX_BYTES / 1048576).toFixed(1)} MB budget — reduce shade quantization or width`);
  process.exit(1);
}

// Manifest updates (in place): regions.json gains the worldmap entry FIRST,
// then bake-manifest re-hashes BOTH regions.json (itself a tracked output —
// its sha changes with the edit) and the new image.
const regionsFile = new URL('../../public/world/regions.json', import.meta.url).pathname;
const regions = JSON.parse(readFileSync(regionsFile, 'utf8'));
regions.worldmap = { file: 'worldmap.png', w: W, h: H, bytes: out.length, sha256: sha };
const regionsOut = JSON.stringify(regions, null, 2);
writeFileSync(regionsFile, regionsOut);
const manifestFile = new URL('./bake-manifest.json', import.meta.url).pathname;
const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
manifest.outputs = manifest.outputs.filter((o) => o.file !== 'public/world/worldmap.png');
manifest.outputs.push({ file: 'public/world/worldmap.png', bytes: out.length, sha256: sha });
const rj = manifest.outputs.find((o) => o.file === 'public/world/regions.json');
if (rj) {
  rj.bytes = Buffer.byteLength(regionsOut);
  rj.sha256 = createHash('sha256').update(regionsOut).digest('hex');
}
writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + '\n');
const total = manifest.outputs.reduce((a, o) => a + o.bytes, 0);
console.log(`manifests updated — pack total now ${(total / 1048576).toFixed(1)} MB`);

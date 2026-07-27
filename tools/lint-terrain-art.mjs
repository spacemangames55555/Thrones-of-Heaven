#!/usr/bin/env node
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { build } from 'esbuild';

/**
 * TERRAIN ART LINT (`npm run lint:terrain-art`) — validates every dropped
 * sheet/prop in /public/art/terrain against the LOCKED drop contract
 * (toh-terrain-art-brief.md). Missing files are fine (procedural fallback
 * carries them); present-but-wrong files are HARD failures so a bad drop can
 * never ship half-applied. `--dir <path>` overrides the scanned directory
 * (the verify gate lints fixtures through this).
 *
 * HARD (exit 1): unknown filename · undecodable PNG · sheet not 256×128 ·
 * prop not its contract size · leftover exact-magenta key pixels · base cells
 * not fully opaque · fringe cells not partial-alpha masks · water anim cells
 * not fully opaque.
 * ADVISORY (exit 0): identical base variants · identical water anim frames ·
 * reserved cell 7 painted · fully-transparent prop.
 */

const argDir = process.argv.indexOf('--dir');
const DIR = argDir !== -1 ? process.argv[argDir + 1] : 'public/art/terrain';
const CELL = 32;

// Import the LOCKED contract tables from the live config (single source).
const cfgOut = new URL('../node_modules/.cache/toh-visuals-config-lint.mjs', import.meta.url).pathname;
await build({
  entryPoints: [new URL('../src/world/terrain-visuals-config.ts', import.meta.url).pathname],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: cfgOut,
  logLevel: 'silent',
});
const cfg = await import(cfgOut);
const SHEET_STEMS = new Map(Object.entries(cfg.BIOME_SHEET_NAME).map(([b, stem]) => [stem, Number(b)]));
const WATER_BIOMES = new Set([0, 1]); // OCEAN, FRESHWATER (schema-locked ids)

const hard = [];
const advisory = [];

function decode(path) {
  try {
    return PNG.sync.read(readFileSync(path));
  } catch (e) {
    hard.push(`${path}: not a decodable PNG (${e.message})`);
    return null;
  }
}

function cellPixels(png, col, row) {
  const out = [];
  for (let y = 0; y < CELL; y++) {
    for (let x = 0; x < CELL; x++) {
      const o = ((row * CELL + y) * png.width + col * CELL + x) * 4;
      out.push([png.data[o], png.data[o + 1], png.data[o + 2], png.data[o + 3]]);
    }
  }
  return out;
}

function lintSheet(path, stem, biome) {
  const png = decode(path);
  if (!png) return;
  if (png.width !== 256 || png.height !== 128) {
    hard.push(`${path}: sheet is ${png.width}×${png.height}, contract is 256×128 (8×4 grid of 32 px cells)`);
    return;
  }
  for (let i = 0; i < png.data.length; i += 4) {
    if (png.data[i] === 255 && png.data[i + 1] === 0 && png.data[i + 2] === 255 && png.data[i + 3] > 0) {
      hard.push(`${path}: leftover exact-magenta key pixels — run npm run convert:terrain on the raw export`);
      break;
    }
  }
  const cells = {};
  for (let v = 0; v < 4; v++) cells[`base-${v}`] = cellPixels(png, v, 0);
  for (let a = 0; a < 3; a++) cells[`anim-${a + 2}`] = cellPixels(png, 4 + a, 0);
  for (const [name, [col, row]] of Object.entries(cfg.SHEET_CELL)) {
    if (name.startsWith('base-') || name.startsWith('anim-')) continue;
    cells[name] = cellPixels(png, col, row);
  }
  for (let v = 0; v < 4; v++) {
    if (cells[`base-${v}`].some(([, , , a]) => a < 255)) hard.push(`${path}: base-${v} must be fully opaque (it is the ground)`);
  }
  if (WATER_BIOMES.has(biome)) {
    for (let a = 2; a <= 4; a++) {
      if (cells[`anim-${a}`].some(([, , , al]) => al < 255)) hard.push(`${path}: anim-${a} must be fully opaque (water anim base frames)`);
    }
  }
  for (const cell of cfg.FRINGE_CELLS) {
    const px = cells[cell];
    const opaque = px.filter(([, , , a]) => a > 0).length;
    if (opaque === 0) hard.push(`${path}: fringe cell ${cell} is empty — every fringe geometry must be drawn`);
    else if (opaque === px.length) hard.push(`${path}: fringe cell ${cell} is fully opaque — fringes are partial masks over the neighbor`);
  }
  const same = (a, b) => a.every((p, i) => p[0] === b[i][0] && p[1] === b[i][1] && p[2] === b[i][2] && p[3] === b[i][3]);
  if (same(cells['base-0'], cells['base-1']) && same(cells['base-1'], cells['base-2']) && same(cells['base-2'], cells['base-3']))
    advisory.push(`${path}: all four base variants are identical — variation hides tiling`);
  if (WATER_BIOMES.has(biome) && same(cells['anim-2'], cells['anim-3']) && same(cells['anim-3'], cells['anim-4']))
    advisory.push(`${path}: water anim frames are identical — the shimmer will be static`);
  if (cellPixels(png, 7, 0).some(([, , , a]) => a > 0)) advisory.push(`${path}: reserved cell (col 7, row 0) is painted — it is never drawn`);
}

function lintProp(path, id) {
  const png = decode(path);
  if (!png) return;
  const dim = cfg.PROP_TABLE[id];
  if (png.width !== dim.w || png.height !== dim.h) {
    hard.push(`${path}: prop is ${png.width}×${png.height}, contract is ${dim.w}×${dim.h}`);
    return;
  }
  let magenta = false;
  let opaque = 0;
  for (let i = 0; i < png.data.length; i += 4) {
    if (png.data[i + 3] > 0) opaque++;
    if (png.data[i] === 255 && png.data[i + 1] === 0 && png.data[i + 2] === 255 && png.data[i + 3] > 0) magenta = true;
  }
  if (magenta) hard.push(`${path}: leftover exact-magenta key pixels — run npm run convert:terrain on the raw export`);
  if (opaque === 0) advisory.push(`${path}: prop is fully transparent`);
}

let scanned = 0;
if (existsSync(DIR)) {
  for (const f of readdirSync(DIR, { withFileTypes: true })) {
    if (f.isDirectory()) {
      if (f.name !== 'props') hard.push(`${join(DIR, f.name)}: unknown directory — the contract has only props/`);
      continue;
    }
    if (!f.name.endsWith('.png')) {
      hard.push(`${join(DIR, f.name)}: unknown file — only {biome}.png sheets live here`);
      continue;
    }
    const stem = f.name.slice(0, -4);
    if (!SHEET_STEMS.has(stem)) {
      hard.push(`${join(DIR, f.name)}: '${stem}' is not a contract biome (${[...SHEET_STEMS.keys()].join(', ')})`);
      continue;
    }
    scanned++;
    lintSheet(join(DIR, f.name), stem, SHEET_STEMS.get(stem));
  }
  const propsDir = join(DIR, 'props');
  if (existsSync(propsDir)) {
    for (const f of readdirSync(propsDir)) {
      if (!f.endsWith('.png') || !cfg.PROP_TABLE[f.slice(0, -4)]) {
        hard.push(`${join(propsDir, f)}: unknown prop — contract ids: ${Object.keys(cfg.PROP_TABLE).join(', ')}`);
        continue;
      }
      scanned++;
      lintProp(join(propsDir, f), f.slice(0, -4));
    }
  }
}

for (const a of advisory) console.log(`ADVISORY  ${a}`);
for (const h of hard) console.error(`HARD      ${h}`);
console.log(`lint:terrain-art — ${scanned} file(s) scanned in ${DIR}: ${hard.length} hard, ${advisory.length} advisory`);
process.exit(hard.length > 0 ? 1 : 0);

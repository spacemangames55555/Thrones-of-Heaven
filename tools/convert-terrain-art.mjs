#!/usr/bin/env node
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from 'pngjs';

/**
 * TERRAIN ART CONVERTER (`npm run convert:terrain -- <in-dir> [out-dir]`) —
 * converts magenta-keyed PixelLab exports into the drop-contract form:
 * every EXACT-magenta pixel (255, 0, 255) becomes fully transparent; all
 * other pixels pass through byte-identical. Files land in out-dir (default
 * public/art/terrain) preserving the {biome}.png / props/{id}.png layout.
 * Run `npm run lint:terrain-art` afterwards — the converter moves pixels,
 * the lint judges them.
 */

const inDir = process.argv[2];
const outDir = process.argv[3] ?? 'public/art/terrain';
if (!inDir || !existsSync(inDir)) {
  console.error('usage: npm run convert:terrain -- <in-dir> [out-dir]   (in-dir must exist)');
  process.exit(1);
}

let converted = 0;
let keyed = 0;

function convertFile(from, to) {
  const png = PNG.sync.read(readFileSync(from));
  let hits = 0;
  for (let i = 0; i < png.data.length; i += 4) {
    if (png.data[i] === 255 && png.data[i + 1] === 0 && png.data[i + 2] === 255) {
      png.data[i + 3] = 0;
      hits++;
    }
  }
  writeFileSync(to, PNG.sync.write(png));
  converted++;
  keyed += hits;
  console.log(`converted ${from} → ${to} (${hits} keyed px)`);
}

mkdirSync(outDir, { recursive: true });
for (const f of readdirSync(inDir, { withFileTypes: true })) {
  if (f.isDirectory() && f.name === 'props') {
    mkdirSync(join(outDir, 'props'), { recursive: true });
    for (const p of readdirSync(join(inDir, 'props'))) {
      if (p.endsWith('.png')) convertFile(join(inDir, 'props', p), join(outDir, 'props', p));
    }
  } else if (f.isFile() && f.name.endsWith('.png')) {
    convertFile(join(inDir, f.name), join(outDir, f.name));
  }
}
console.log(`convert:terrain — ${converted} file(s), ${keyed} magenta pixels keyed out. Now run: npm run lint:terrain-art`);
process.exit(0);

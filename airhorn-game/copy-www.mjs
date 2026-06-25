// copy-www.mjs — assemble the static web payload into ./www for Capacitor.
// The app has no build step; this just copies the shippable files so the
// Capacitor webDir is clean (no node_modules, native projects, or tooling).
import { mkdirSync, copyFileSync, rmSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';

const ROOT = dirname(new URL(import.meta.url).pathname);
const WWW = join(ROOT, 'www');

const FILES = [
  'index.html',
  'styles.css',
  'main.js',
  'audio.js',
  'game.js',
  'manifest.webmanifest',
  'sw.js',
];
const DIRS = ['icons'];

rmSync(WWW, { recursive: true, force: true });
mkdirSync(WWW, { recursive: true });

for (const f of FILES) copyFileSync(join(ROOT, f), join(WWW, f));

for (const d of DIRS) {
  const src = join(ROOT, d);
  const dst = join(WWW, d);
  mkdirSync(dst, { recursive: true });
  for (const name of readdirSync(src)) {
    const sp = join(src, name);
    if (statSync(sp).isFile()) copyFileSync(sp, join(dst, name));
  }
}

console.log(`Copied ${FILES.length} files + ${DIRS.join(', ')} -> www/`);

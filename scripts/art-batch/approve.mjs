#!/usr/bin/env node
import { readFileSync, mkdirSync, copyFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, dirname, relative } from 'node:path';

/**
 * BATCH APPROVAL (`npm run art:approve -- --batch <id>`, Pass 8): move an
 * on-device-APPROVED staged batch onto its contract paths. The staging
 * layout mirrors the contract tree, so approval is a pure copy. This is the
 * ONLY road from art-review/ to contract paths — the batch tool itself
 * cannot write them. After approving: `npm run art:manifest` (statuses flip
 * by regeneration), full `npm run verify`, land as a normal gated commit
 * ("art: {category} batch {id}").
 *
 * `--root <dir>` overrides the destination root (the gate's sandbox flip —
 * the suite never mutates the live tree).
 */

const args = process.argv.slice(2);
const arg = (name, dflt) => {
  const i = args.indexOf(name);
  return i !== -1 ? args[i + 1] : dflt;
};
const BATCH = arg('--batch', null);
const ROOT = resolve(arg('--root', '.'));
if (!BATCH) {
  console.error('art:approve: --batch <id> is required');
  process.exit(1);
}
const SRC = resolve('art-review', BATCH);
if (!existsSync(join(SRC, 'report.json'))) {
  console.error(`art:approve: no staged batch at art-review/${BATCH}`);
  process.exit(1);
}
const report = JSON.parse(readFileSync(join(SRC, 'report.json'), 'utf8'));

let moved = 0;
for (const s of report.staged) {
  for (const rel of s.files) {
    const from = join(SRC, rel);
    const to = join(ROOT, rel);
    mkdirSync(dirname(to), { recursive: true });
    copyFileSync(from, to);
    moved++;
  }
}
console.log(`art:approve ${BATCH}: moved ${moved} file(s) to ${relative('.', ROOT) || '.'} — now run npm run art:manifest, then npm run verify, then commit "art: ${report.category} batch ${BATCH}"`);

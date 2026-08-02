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

// PERMANENTLY SYNTHETIC HARNESS ROWS can never become art (Art Session 5):
// they exist only as the gate's guaranteed-non-live batch target. Approving
// one would put a fixture at a contract path and quietly retire the checks
// that depend on it staying unlive.
const manifest = JSON.parse(readFileSync('toh-asset-manifest.json', 'utf8'));
const fixtureIds = new Set(manifest.assets.filter((a) => a.fixture).map((a) => a.id));
const staged = report.staged.filter((s) => {
  if (!fixtureIds.has(s.id)) return true;
  console.error(`art:approve: REFUSED ${s.id} — synthetic harness row, never art (it is the gate's permanent batch fixture)`);
  return false;
});
if (staged.length !== report.staged.length && staged.length === 0) {
  console.error('art:approve: nothing to approve (the batch held only harness rows)');
  process.exit(1);
}

let moved = 0;
for (const s of staged) {
  for (const rel of s.files) {
    const from = join(SRC, rel);
    const to = join(ROOT, rel);
    mkdirSync(dirname(to), { recursive: true });
    copyFileSync(from, to);
    moved++;
  }
}
console.log(`art:approve ${BATCH}: moved ${moved} file(s) to ${relative('.', ROOT) || '.'} — now run npm run art:manifest, then npm run verify, then commit "art: ${report.category} batch ${BATCH}"`);

#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { PNG } from 'pngjs';
import { spawnSync } from 'node:child_process';

/**
 * ART BATCH MACHINE (`npm run art:batch -- --category X [--limit N]`, Pass 8).
 * For each UNBLOCKED missing/fallback manifest item of the category:
 * generate against the category's LOCKED style reference -> convert (the
 * existing terrain converter where applicable) -> lint -> STAGE under
 * art-review/<batch-id>/ with a per-asset report. Review-sized: limit
 * defaults to and is HARD-CAPPED at 12.
 *
 * DISCIPLINE (gate-proven):
 * - The tool CANNOT write contract paths: every write resolves through
 *   stagePath(), which throws unless the target is inside the batch dir.
 * - No style lock for the category (art/style-locks.json) => REFUSE.
 * - Blocked items (manifest blockedBy) are NEVER generated — reported only.
 * - A staged asset that fails lint is EXCLUDED, with the reason in the
 *   report; advisories (palette size, mean luminance) become report columns.
 * - The API key comes from env PIXELLAB_SECRET ONLY; without it the tool
 *   refuses unless --fixture-dir supplies offline sources (the gate's path —
 *   generation is NEVER part of the gate).
 *
 * `--fixture-dir <dir>`: offline generator — for each item, <dir>/<id>.png
 * (or <dir>/<id>/<dir8>.png for rotation sets) is used instead of the API.
 * `--locks <path>`: TEST-ONLY locks override (the gate's fixture locks; the
 * staging guard applies regardless of configuration).
 */

const args = process.argv.slice(2);
const arg = (name, dflt) => {
  const i = args.indexOf(name);
  return i !== -1 ? args[i + 1] : dflt;
};
const CATEGORY = arg('--category', null);
const LIMIT = Math.min(Number(arg('--limit', 12)) || 12, 12); // review-sized, hard cap
const FIXTURE_DIR = arg('--fixture-dir', null);
const LOCKS_PATH = arg('--locks', 'art/style-locks.json');
if (!CATEGORY) {
  console.error('art:batch: --category is required (see toh-asset-manifest.json categories)');
  process.exit(1);
}

// STYLE LOCK: no entry => the batch REFUSES the category (locks are created
// by humans: candidates generated, ONE approved on-device becomes the lock).
const locks = JSON.parse(readFileSync(LOCKS_PATH, 'utf8')).locks ?? {};
const lock = locks[CATEGORY];
if (!lock || !lock.reference) {
  console.error(`art:batch: REFUSED — no style lock for category '${CATEGORY}' in ${LOCKS_PATH}. Locks are human-approved; generate candidates, approve one on-device, record it.`);
  process.exit(1);
}
if (!FIXTURE_DIR && !process.env.PIXELLAB_SECRET) {
  console.error('art:batch: REFUSED — PIXELLAB_SECRET is not set (the key lives in the environment ONLY) and no --fixture-dir was given.');
  process.exit(1);
}

const { assets } = JSON.parse(readFileSync('toh-asset-manifest.json', 'utf8'));
const inCat = assets.filter((a) => a.category === CATEGORY);
const blocked = inCat.filter((a) => (a.blockedBy ?? []).length > 0 && a.status !== 'live');
const targets = inCat.filter((a) => a.status !== 'live' && (a.blockedBy ?? []).length === 0).slice(0, LIMIT);

const batchId = arg('--batch-id', `${CATEGORY}-${new Date().toISOString().slice(0, 10)}-${Math.random().toString(36).slice(2, 6)}`);
// The batch id is a single path segment — a traversal id would move
// BATCH_ROOT itself outside art-review/ and defeat the staging guard.
if (!/^[a-z0-9][a-z0-9._-]*$/i.test(batchId)) {
  console.error(`art:batch: REFUSED — batch id '${batchId}' is not a plain path segment`);
  process.exit(1);
}
const BATCH_ROOT = resolve('art-review', batchId);
if (!BATCH_ROOT.startsWith(resolve('art-review') + sep)) {
  console.error(`art:batch: REFUSED — batch root escapes art-review/`);
  process.exit(1);
}

/** THE ONE WRITE FUNNEL: resolves inside the batch dir or throws — the tool
 *  is INCAPABLE of writing a contract path (gate-proven with traversal
 *  fixtures). */
function stagePath(rel) {
  const p = resolve(BATCH_ROOT, rel);
  if (p !== BATCH_ROOT && !p.startsWith(BATCH_ROOT + sep)) {
    throw new Error(`art:batch: staging escape refused — '${rel}' resolves outside ${BATCH_ROOT}`);
  }
  return p;
}
function writeStaged(rel, buf) {
  const p = stagePath(rel);
  mkdirSync(resolve(p, '..'), { recursive: true });
  writeFileSync(p, buf);
  return p;
}

/** Offline (fixture) or live generation. The LIVE path calls PixelLab with
 *  the locked reference attached — see generator-pixellab.mjs; it is only
 *  ever entered on a human-triggered run with PIXELLAB_SECRET set. */
async function generate(item) {
  if (FIXTURE_DIR) {
    if (item.spec.kind === 'rotations-8') {
      const dirs = ['south', 'south-east', 'east', 'north-east', 'north', 'north-west', 'west', 'south-west'];
      const frames = {};
      for (const d of dirs) {
        const p = join(FIXTURE_DIR, item.id, `${d}.png`);
        if (!existsSync(p)) return { error: `fixture missing frame ${d}` };
        frames[d] = readFileSync(p);
      }
      return { frames };
    }
    const p = join(FIXTURE_DIR, `${item.id}.png`);
    if (!existsSync(p)) return { error: 'fixture missing' };
    return { image: readFileSync(p) };
  }
  const { generatePixellab } = await import('./generator-pixellab.mjs');
  return generatePixellab(item, lock, process.env.PIXELLAB_SECRET);
}

/** Lint gate per staged asset: terrain items ride the REAL terrain lint in a
 *  contract-layout sandbox; sprites must decode with opaque content. Returns
 *  { ok, reason?, advisories: { paletteSize, meanLuminance } }. */
function lintStaged(item, files) {
  const advisories = {};
  for (const [rel, buf] of Object.entries(files)) {
    let png;
    try {
      png = PNG.sync.read(buf);
    } catch (e) {
      return { ok: false, reason: `${rel}: not a decodable PNG (${e.message})` };
    }
    if (item.spec.kind === 'sheet-256x128' && (png.width !== 256 || png.height !== 128)) {
      return { ok: false, reason: `${rel}: sheet is ${png.width}x${png.height}, contract is 256x128` };
    }
    if (item.spec.kind === 'prop' && (png.width !== item.spec.w || png.height !== item.spec.h)) {
      return { ok: false, reason: `${rel}: prop is ${png.width}x${png.height}, contract is ${item.spec.w}x${item.spec.h}` };
    }
    const colors = new Set();
    let lum = 0;
    let opaque = 0;
    for (let i = 0; i < png.data.length; i += 4) {
      if (png.data[i + 3] === 0) continue;
      opaque++;
      colors.add((png.data[i] << 16) | (png.data[i + 1] << 8) | png.data[i + 2]);
      lum += 0.2126 * png.data[i] + 0.7152 * png.data[i + 1] + 0.0722 * png.data[i + 2];
      if (png.data[i] === 255 && png.data[i + 1] === 0 && png.data[i + 2] === 255 && png.data[i + 3] > 0) {
        return { ok: false, reason: `${rel}: leftover exact-magenta key pixels — run the converter on the raw` };
      }
    }
    if (opaque === 0) return { ok: false, reason: `${rel}: fully transparent` };
    advisories.paletteSize = Math.max(advisories.paletteSize ?? 0, colors.size);
    advisories.meanLuminance = Math.round(lum / opaque);
  }
  // Terrain files additionally ride the REAL lint in a contract-layout dir.
  if (item.spec.kind === 'sheet-256x128' || item.spec.kind === 'prop') {
    const sandbox = stagePath(join('.lint', item.id));
    for (const [rel, buf] of Object.entries(files)) {
      const name = rel.split('/').pop();
      const target = item.spec.kind === 'prop' ? join('.lint', item.id, 'props', name) : join('.lint', item.id, name);
      writeStaged(target, buf);
    }
    const r = spawnSync('node', ['tools/lint-terrain-art.mjs', '--dir', sandbox], { encoding: 'utf8' });
    if (r.status !== 0) return { ok: false, reason: `terrain lint HARD: ${(r.stderr || r.stdout).slice(0, 200)}` };
  }
  return { ok: true, advisories };
}

const report = { batchId, category: CATEGORY, lock: { reference: lock.reference, palette: lock.palette ?? null }, staged: [], excluded: [], blockedSkipped: blocked.map((b) => ({ id: b.id, blockedBy: b.blockedBy })) };
for (const item of targets) {
  const gen = await generate(item);
  if (gen.error) {
    report.excluded.push({ id: item.id, reason: gen.error });
    continue;
  }
  // Contract-relative staging layout mirrors the eventual contract path, so
  // approval is a pure move (art-review/<id>/<contract-path>).
  const files = {};
  if (gen.frames) for (const [d, buf] of Object.entries(gen.frames)) files[`${item.spec.path.replace('<dir>.png', '')}${d}.png`] = buf;
  else files[item.spec.path] = gen.image;
  const lint = lintStaged(item, files);
  if (!lint.ok) {
    report.excluded.push({ id: item.id, reason: lint.reason });
    continue;
  }
  for (const [rel, buf] of Object.entries(files)) writeStaged(rel, buf);
  report.staged.push({ id: item.id, kind: item.spec.kind, files: Object.keys(files), ...lint.advisories });
}

writeStaged('report.json', JSON.stringify(report, null, 2) + '\n');
const lines = [
  `# art:batch ${batchId} — category ${CATEGORY} (lock: ${lock.reference})`,
  '',
  '| asset | kind | palette | luminance |',
  '|---|---|---|---|',
  ...report.staged.map((s) => `| ${s.id} | ${s.kind} | ${s.paletteSize} | ${s.meanLuminance} |`),
  '',
  ...(report.excluded.length ? ['EXCLUDED (lint/generation failures):', ...report.excluded.map((e) => `- ${e.id}: ${e.reason}`)] : []),
  ...(report.blockedSkipped.length ? ['', 'BLOCKED (never generated):', ...report.blockedSkipped.map((b) => `- ${b.id} <- ${b.blockedBy.join(', ')}`)] : []),
  '',
  `Review: push art-review/${batchId} on a review branch — the Vercel preview is the phone review surface.`,
  `Approve: npm run art:approve -- --batch ${batchId} (moves to contract paths; land as "art: ${CATEGORY} batch ${batchId}").`,
].join('\n');
writeStaged('report.md', lines + '\n');
console.log(`art:batch ${batchId}: staged ${report.staged.length}, excluded ${report.excluded.length}, blocked ${report.blockedSkipped.length} (see art-review/${batchId}/report.md)`);

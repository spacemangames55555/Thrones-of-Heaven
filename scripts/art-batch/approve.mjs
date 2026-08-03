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
 * the suite never mutates the live tree). `--review <dir>` overrides the
 * staging root (gate fixtures only).
 *
 * ── VERDICT RECEIPTS (Casey standing rule, Session 8 reconciliation) ──────
 * Art Session 8 shipped UNVERDICTED. A hold was declared, no image was ever
 * posted, and a reply that had nothing to judge was read as approval. The
 * rule that came out of it: **any hold-gated commit must quote the human
 * verdict verbatim in the commit body, and that verdict must be a human
 * message sent AFTER the hold was staged. No quotable verdict, no landing.**
 *
 * This tool now refuses to move a single file without a VERDICT.json beside
 * the batch report:
 *
 *   { "batch": "<id>", "stagedAt": "<ISO>", "images": ["<path>", ...],
 *     "receivedAt": "<ISO>", "verdict": "<the human message, verbatim>" }
 *
 * WHAT IT ACTUALLY ENFORCES, STATED HONESTLY. It checks the receipt's SHAPE
 * and ORDERING, and that the hold really showed something: the images must be
 * listed and must exist on disk (a hold with no visible image is not a hold),
 * receivedAt must be strictly after stagedAt (a reply that predates the hold
 * cannot be a verdict on it), and the verdict text must be non-empty and
 * quotable. It CANNOT prove a human wrote it — no local tool can. It raises
 * the floor from "an agent believed it was approved" to "an agent had to
 * write down the exact words, when they arrived, and what was on screen when
 * they did", which is the part that failed in Session 8.
 */

const args = process.argv.slice(2);
const arg = (name, dflt) => {
  const i = args.indexOf(name);
  return i !== -1 ? args[i + 1] : dflt;
};
const BATCH = arg('--batch', null);
const ROOT = resolve(arg('--root', '.'));
const REVIEW = resolve(arg('--review', 'art-review'));
if (!BATCH) {
  console.error('art:approve: --batch <id> is required');
  process.exit(1);
}
const SRC = join(REVIEW, BATCH);
if (!existsSync(join(SRC, 'report.json'))) {
  console.error(`art:approve: no staged batch at ${relative('.', SRC)}`);
  process.exit(1);
}
const report = JSON.parse(readFileSync(join(SRC, 'report.json'), 'utf8'));

// ── THE VERDICT RECEIPT GATE ─────────────────────────────────────────────
const RECEIPT = join(SRC, 'VERDICT.json');
const refuse = (why) => {
  console.error(`art:approve: REFUSED — ${why}`);
  console.error(`No quotable verdict, no landing. Write ${relative('.', RECEIPT)} with batch, stagedAt, images, receivedAt, verdict.`);
  process.exit(1);
};
if (!existsSync(RECEIPT)) refuse(`no verdict receipt at ${relative('.', RECEIPT)} — this batch has not been verdicted`);
let receipt;
try {
  receipt = JSON.parse(readFileSync(RECEIPT, 'utf8'));
} catch (e) {
  refuse(`verdict receipt is not valid JSON (${e.message})`);
}
if (receipt.batch !== BATCH) refuse(`verdict receipt is for batch "${receipt.batch}", not "${BATCH}"`);
if (typeof receipt.verdict !== 'string' || receipt.verdict.trim().length < 2) refuse('verdict receipt has no quotable verdict text');
if (!Array.isArray(receipt.images) || receipt.images.length === 0) refuse('verdict receipt lists no images — a hold with no visible image is not a hold');
const missingImages = receipt.images.filter((p) => !existsSync(resolve(p)));
if (missingImages.length > 0) refuse(`verdict receipt lists image(s) that do not exist: ${missingImages.join(', ')}`);
const heldAt = Date.parse(receipt.stagedAt);
const verdictAt = Date.parse(receipt.receivedAt);
if (Number.isNaN(heldAt)) refuse(`stagedAt is not a parseable timestamp: ${receipt.stagedAt}`);
if (Number.isNaN(verdictAt)) refuse(`receivedAt is not a parseable timestamp: ${receipt.receivedAt}`);
if (verdictAt <= heldAt) refuse(`the verdict (${receipt.receivedAt}) does not postdate the staged hold (${receipt.stagedAt}) — it cannot be a verdict on art it preceded`);

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
// Print the receipt so the verdict goes into the commit body VERBATIM. The
// rule is that the commit QUOTES it; making the exact string the last thing
// the tool says is the cheapest way to stop it being paraphrased.
console.log(`\nart:approve: quote this verbatim in the commit body (verdict received ${receipt.receivedAt}, hold staged ${receipt.stagedAt}):`);
console.log(receipt.verdict.split('\n').map((l) => `  > ${l}`).join('\n'));

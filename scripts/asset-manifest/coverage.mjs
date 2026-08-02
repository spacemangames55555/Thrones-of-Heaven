#!/usr/bin/env node
import { readFileSync } from 'node:fs';

/**
 * ART COVERAGE REPORT (`npm run art:coverage`, Pass 8) — the human view of
 * toh-asset-manifest.json: per-category live/fallback/missing counts, the
 * GENERATION-CALL ESTIMATE for everything a batch could target (cost
 * visibility BEFORE credits are spent), and every blocked item with the
 * ruling that blocks it.
 *
 * Estimate rule (stated, not hidden): one call per still/sheet/prop,
 * EIGHT per 8-way rotation set; blocked and live items cost nothing.
 */

const { assets } = JSON.parse(readFileSync('toh-asset-manifest.json', 'utf8'));

// SYNTHETIC HARNESS ROWS are not art debt — they exist only so the gate's
// batch-machine checks have a permanent non-live target. Never counted.
const cats = {};
for (const a of assets) {
  if (a.fixture) continue;
  const c = (cats[a.category] ??= { live: 0, fallback: 0, missing: 0, calls: 0, blocked: [] });
  c[a.status]++;
  const blocked = (a.blockedBy ?? []).length > 0;
  if (blocked && a.status !== 'live') c.blocked.push(`${a.id} <- ${a.blockedBy.join(', ')}`);
  else if (a.status !== 'live') c.calls += a.spec.kind === 'rotations-8' ? 8 : 1;
}

let totalCalls = 0;
let totalBlocked = 0;
console.log('ART COVERAGE (from toh-asset-manifest.json)\n');
console.log('category         live  fallback  missing  est-calls  blocked');
for (const [cat, c] of Object.entries(cats).sort()) {
  totalCalls += c.calls;
  totalBlocked += c.blocked.length;
  console.log(`${cat.padEnd(16)} ${String(c.live).padStart(4)}  ${String(c.fallback).padStart(8)}  ${String(c.missing).padStart(7)}  ${String(c.calls).padStart(9)}  ${String(c.blocked.length).padStart(7)}`);
}
console.log(`\nGENERATION-CALL ESTIMATE (unblocked, non-live): ${totalCalls} calls`);
console.log('(one call per still/sheet/prop, eight per 8-way rotation set)\n');
if (totalBlocked > 0) {
  console.log(`BLOCKED ITEMS (${totalBlocked}) — grouped by the ruling that blocks them:`);
  const byFence = {};
  for (const a of assets) {
    if (a.fixture || a.status === 'live' || !(a.blockedBy ?? []).length) continue;
    for (const fence of a.blockedBy) (byFence[fence] ??= []).push(`${a.category}:${a.id}`);
  }
  for (const [fence, items] of Object.entries(byFence).sort()) {
    console.log(`\n  ${fence} — ${items.length} item(s):`);
    // Small groups list every id; big ones (the FX sea) summarize.
    if (items.length <= 20) for (const it of items) console.log(`    ${it}`);
    else console.log(`    ${items.slice(0, 6).join(', ')}, ... (+${items.length - 6} more)`);
  }
}

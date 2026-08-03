#!/usr/bin/env node
/**
 * ENEMY RIM BAKER (`npm run art:rims`) — Art Session 7, MODEL C.
 *
 * THE RULE (Casey verdict, Art Session 7): **MASTERS ARE CANONICAL, RIMS ARE
 * DERIVED.** A shipped enemy sprite is never authored; it is baked from
 *
 *     (full-colour master)  +  (the domain table in src/world/enemy-roster.ts)
 *
 * and nothing else. Three consequences, all of them the point:
 *
 *   1. A CANON FIX STAYS A DATA EDIT. Re-domaining a family is a one-line
 *      change to EXISTING_FAMILY_DOMAIN followed by a ZERO-CREDIT re-bake.
 *      This is not hypothetical — enemy-roster.ts already carries one:
 *      `'lesser-evil-scouts': 'physical', // CANON FIX: was mis-mapped 'mental'`
 *      Under a hand-authored model that fix would have been a regeneration
 *      across the fifteen zones using that family.
 *   2. HAND-LANDING A RIMMED SPRITE IS FORBIDDEN. The `rims-derived` gate
 *      check re-bakes every rim-derived sprite and compares it byte for byte,
 *      so a hand-edited rim is red. `--check` is that mode.
 *   3. The TREATMENT is frozen: a 4 px chebyshev dilation outward from the
 *      silhouette, filled with pure unmultiplied DOMAIN_TINT. 4 px is the
 *      DERIVED MINIMUM, not a taste call — masters fit to their contract size
 *      by nearest-neighbour downscale, and a thinner rim can fall between
 *      samples and vanish on some edges. CHANGING THE TREATMENT (thickness,
 *      inner rim, gradient, anything) IS AMENDMENT TERRITORY: its own
 *      bake-off and Casey's approval, the same ceremony as a lock amendment.
 *
 * Masters live at `public/sprites/masters/<key>.png`; the baked sprite lands
 * at `public/sprites/<key>.png`. A key with no master is simply not
 * rim-derived (today that is all of them — the nine live enemy sprites are
 * still the grayscale gen-sprites placeholders, and they stay that way until
 * the bestiary session paints masters under the enemy style lock).
 *
 * usage:
 *   node scripts/art-batch/bake-rims.mjs            bake every master
 *   node scripts/art-batch/bake-rims.mjs --check    re-derive + compare only
 *   --masters <dir> / --out <dir>                   test-only overrides
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { build } from 'esbuild';

/** THE FROZEN TREATMENT — see rule 3 above. Amendment territory. */
export const RIM_PX = 4;

const args = process.argv.slice(2);
const arg = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const CHECK = args.includes('--check');
const MASTERS = arg('--masters', 'public/sprites/masters');
const OUT = arg('--out', 'public/sprites');

/** Domain table, read from the ONE source — never restated here. */
async function domainTable() {
  const outfile = new URL('../../node_modules/.cache/toh-rim-roster.mjs', import.meta.url).pathname;
  await build({
    entryPoints: [new URL('../../src/world/enemy-roster.ts', import.meta.url).pathname],
    bundle: true,
    format: 'esm',
    platform: 'node',
    outfile,
    logLevel: 'silent',
  });
  const m = await import(`${outfile}?t=${Date.now()}`);
  return { DOMAIN_TINT: m.DOMAIN_TINT, FAMILY_DOMAIN: m.EXISTING_FAMILY_DOMAIN, UNMARKED: m.UNMARKED_FAMILIES };
}

/**
 * Bake one master: full-colour body untouched, plus an outer rim of pure
 * DOMAIN_TINT dilated RIM_PX outward. Deterministic — same inputs, same bytes.
 */
export function bakeRim(masterBuf, tint) {
  const src = PNG.sync.read(masterBuf);
  const { width: W, height: H } = src;
  const alphaAt = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : src.data[(y * W + x) * 4 + 3]);
  const out = new PNG({ width: W, height: H });
  src.data.copy(out.data);
  const r = (tint >> 16) & 0xff;
  const g = (tint >> 8) & 0xff;
  const b = tint & 0xff;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (alphaAt(x, y) > 0) continue; // body pixels are never touched
      let near = false;
      for (let dy = -RIM_PX; dy <= RIM_PX && !near; dy++) {
        for (let dx = -RIM_PX; dx <= RIM_PX; dx++) {
          if (alphaAt(x + dx, y + dy) > 0) {
            near = true;
            break;
          }
        }
      }
      if (!near) continue;
      const o = (y * W + x) * 4;
      out.data[o] = r;
      out.data[o + 1] = g;
      out.data[o + 2] = b;
      out.data[o + 3] = 255;
    }
  }
  return PNG.sync.write(out);
}

/** Which master keys exist, and which domain each resolves to. */
export function rimTargets(masters, familyDomain) {
  if (!existsSync(masters)) return [];
  return readdirSync(masters)
    .filter((f) => f.endsWith('.png'))
    .sort()
    .map((f) => {
      const key = f.slice(0, -4);
      const family = key.replace(/^enemy-/, '');
      return { key, family, domain: familyDomain[family] ?? null, master: join(masters, f) };
    });
}

const { DOMAIN_TINT, FAMILY_DOMAIN, UNMARKED } = await domainTable();
const targets = rimTargets(MASTERS, FAMILY_DOMAIN);
const drift = [];
const baked = [];
const unmapped = [];

for (const t of targets) {
  if (!t.domain) {
    unmapped.push(t.key);
    continue;
  }
  // UNMARKED FAMILIES DERIVE AS IDENTITY (Casey ruling, Art Session 8). The
  // domain stays real as data; it is simply never painted. The master ships
  // byte-for-byte, and rims-derived still enforces that identity, so an
  // unmarked family is exactly as derived — and as un-hand-landable — as a
  // rimmed one. See UNMARKED_FAMILIES in src/world/enemy-roster.ts.
  const unmarked = UNMARKED.has(t.family);
  const bytes = unmarked ? readFileSync(t.master) : bakeRim(readFileSync(t.master), DOMAIN_TINT[t.domain]);
  const dest = join(OUT, `${t.key}.png`);
  if (CHECK) {
    if (!existsSync(dest) || !readFileSync(dest).equals(bytes)) drift.push(t.key);
  } else {
    mkdirSync(OUT, { recursive: true });
    writeFileSync(dest, bytes);
  }
  baked.push(t.key);
}

if (unmapped.length > 0) {
  console.error(`art:rims: REFUSED — master(s) with no domain in EXISTING_FAMILY_DOMAIN: ${unmapped.join(', ')}`);
  process.exit(1);
}
// The runtime registry: which keys are rim-derived. Written on a real bake,
// verified (never written) under --check. This file is what lets the boot
// registry tell a baked rim from the grayscale placeholder that shares its
// path — see src/render/enemyArtRegistry.ts.
const REGISTRY = 'art/enemy-rims.json';
const registryNow = existsSync(REGISTRY) ? JSON.parse(readFileSync(REGISTRY, 'utf8')) : { rimDerived: [] };
const wantKeys = baked.slice().sort();
// The registry describes the LIVE tree, so it is only meaningful when we are
// baking into it. A sandbox --out (the gate's fixtures) must not be measured
// against it, or every fixture run would report drift against the real file.
const LIVE_TREE = OUT === 'public/sprites';
const registryDrift = LIVE_TREE && JSON.stringify(registryNow.rimDerived ?? []) !== JSON.stringify(wantKeys);

if (CHECK) {
  if (registryDrift) {
    console.error(`art:rims --check: REGISTRY DRIFT — ${REGISTRY} lists [${(registryNow.rimDerived ?? []).join(', ')}] but the masters bake [${wantKeys.join(', ')}]`);
    process.exit(1);
  }
  if (drift.length > 0) {
    console.error(`art:rims --check: DRIFT — these sprites are NOT what the master + domain table bake to: ${drift.join(', ')}`);
    console.error('Rimmed sprites are DERIVED, never hand-landed. Fix the master or the domain table, then re-run npm run art:rims.');
    process.exit(1);
  }
  console.log(`art:rims --check: ${baked.length} rim-derived sprite(s) re-derive byte-identically; registry in sync`);
} else {
  if (registryDrift) {
    registryNow.rimDerived = wantKeys;
    writeFileSync(REGISTRY, `${JSON.stringify(registryNow, null, 2)}\n`);
  }
  console.log(`art:rims: derived ${baked.length} sprite(s) from ${MASTERS} -> ${OUT} (${baked.filter((k) => UNMARKED.has(k.replace(/^enemy-/, ''))).length} unmarked, shipped as identity)`);
}

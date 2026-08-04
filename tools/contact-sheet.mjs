#!/usr/bin/env node
/**
 * CONTACT SHEET BAKER (`npm run art:contact`) — Art Session 8 reconciliation.
 *
 * THE RULE THIS SERVES (Casey standing rule, Session 8 reconciliation):
 * **HOLDS ARE VISUAL.** Every hold must deliver images Casey can SEE in the
 * chat surface — not a branch URL, not a table of measurements. Numbers and
 * prose supplement the images; they never replace them. A hold with no
 * visible image is not a hold.
 *
 * Art Session 8 shipped unverdicted precisely because that rule did not exist
 * and no image was ever posted. There was nothing to judge, so what came back
 * could not have been a verdict. This tool exists so no future hold has that
 * excuse: it renders the shipped art AT SHIPPED DISPLAY SIZE and produces a
 * PNG that goes straight into the thread.
 *
 * WHAT IT RENDERS, AND WHY EACH VIEW IS THERE
 *   1:1 on neutral    the honest judgment size — exactly the pixels the boot
 *                     fitter puts on a 428x926 phone, nothing flattering;
 *   1:1 on terrain    the enemy style lock's own criterion is "readable at
 *                     thumbnail size", and readability is against GROUND, not
 *                     against a swatch. Uses the shipped biome tiles;
 *   6x magnified      an exact integer magnification of the SAME reduced
 *                     pixels, so rim thickness and silhouette can be examined
 *                     without misrepresenting the shipped result.
 *
 * The 1:1 image is produced by fitLikeBoot below, which reproduces the real
 * fitter (contain-fit of the OPAQUE BOX, then the family's RUNTIME SCALE) —
 * see the correction note on that function. The 6x view magnifies that
 * reduced image, never the master: magnifying the master would show detail
 * the player never receives.
 *
 * usage:
 *   node tools/contact-sheet.mjs --batch <name>   sheet + per-family crops
 *   --out <dir>                                   default art-review/contact-sheets
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PNG } from 'pngjs';
import { chromium } from 'playwright-core';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const args = process.argv.slice(2);
const arg = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const BATCH = arg('--batch', 'bestiary-roster-v1');
const OUT = join(ROOT, arg('--out', 'art-review/contact-sheets'));

/** Bundle + import a TS source so every fact is READ, never retyped. */
function loadTs(rel, cacheName) {
  const out = join(ROOT, `node_modules/.cache/${cacheName}.mjs`);
  mkdirSync(join(ROOT, 'node_modules/.cache'), { recursive: true });
  execFileSync('npx', ['esbuild', rel, '--bundle', '--format=esm', '--platform=node', `--outfile=${out}`, '--log-level=warning'], { cwd: ROOT });
  return import(pathToFileURL(out).href + `?t=${Date.now()}`);
}

/**
 * THE BOOT FITTER'S OWN MATH (Pass 11 Commit 2 — CORRECTED).
 *
 * The first version of this reduced the WHOLE CANVAS by nearest-neighbour and
 * advertised itself as "the same sampling Phaser applies at boot". Reading
 * `mintFitted` in src/render/spriteOverrides.ts showed both halves were wrong:
 * it CONTAIN-FITS the master's OPAQUE BOX (`Math.min(w/crop.w, h/crop.h)`,
 * empty margins discarded) and draws with `imageSmoothingEnabled = true` at
 * 'high' quality, i.e. BILINEAR. Sheets built the old way misreported both the
 * size and the softness of every family — on the one tool whose entire purpose
 * is showing the truth.
 *
 * This crops to the opaque box, contain-fits it into the frame, applies the
 * family's RUNTIME SCALE, and area-averages when downsampling (the honest
 * stand-in for the browser's smoothing — box filtering, not point sampling).
 */
function fitLikeBoot(src, frameW, frameH, runtimeScale) {
  let minX = src.width; let minY = src.height; let maxX = -1; let maxY = -1;
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      if (src.data[(y * src.width + x) * 4 + 3] > 8) { // the fitter's own threshold
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return { png: new PNG({ width: 1, height: 1 }), w: 0, h: 0 };
  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;
  const fit = Math.min(frameW / cw, frameH / ch) * runtimeScale;
  const w = Math.max(1, Math.round(cw * fit));
  const h = Math.max(1, Math.round(ch * fit));
  const out = new PNG({ width: w, height: h });
  const sxr = cw / w;
  const syr = ch / h;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // Area average over the source footprint of this destination pixel.
      const x0 = minX + x * sxr; const x1 = minX + (x + 1) * sxr;
      const y0 = minY + y * syr; const y1 = minY + (y + 1) * syr;
      let r = 0; let g = 0; let b = 0; let a = 0; let n = 0;
      for (let sy2 = Math.floor(y0); sy2 < Math.max(Math.floor(y0) + 1, Math.ceil(y1)); sy2++) {
        for (let sx2 = Math.floor(x0); sx2 < Math.max(Math.floor(x0) + 1, Math.ceil(x1)); sx2++) {
          if (sx2 < 0 || sy2 < 0 || sx2 >= src.width || sy2 >= src.height) continue;
          const o = (sy2 * src.width + sx2) * 4;
          const al = src.data[o + 3] / 255;
          r += src.data[o] * al; g += src.data[o + 1] * al; b += src.data[o + 2] * al;
          a += src.data[o + 3]; n++;
        }
      }
      const d = (y * w + x) * 4;
      const aw = a / 255;
      out.data[d] = n && aw ? Math.round(r / aw) : 0;
      out.data[d + 1] = n && aw ? Math.round(g / aw) : 0;
      out.data[d + 2] = n && aw ? Math.round(b / aw) : 0;
      out.data[d + 3] = n ? Math.round(a / n) : 0;
    }
  }
  return { png: out, w, h };
}

/** Exact integer magnification of an already-reduced image. */
function magnify(src, factor) {
  const w = src.width * factor;
  const h = src.height * factor;
  const out = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const s = ((Math.floor(y / factor) * src.width) + Math.floor(x / factor)) * 4;
      const d = (y * w + x) * 4;
      for (let c = 0; c < 4; c++) out.data[d + c] = src.data[s + c];
    }
  }
  return out;
}

/** Crop one 32x32 tile out of a shipped terrain sheet (base-0, top-left). */
function terrainTile(name) {
  const file = join(ROOT, 'public/art/terrain', `${name}.png`);
  if (!existsSync(file)) return null;
  const sheet = PNG.sync.read(readFileSync(file));
  const t = new PNG({ width: 32, height: 32 });
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const s = (y * sheet.width + x) * 4;
      const d = (y * 32 + x) * 4;
      for (let c = 0; c < 4; c++) t.data[d + c] = sheet.data[s + c];
    }
  }
  return t;
}

const uri = (png) => `data:image/png;base64,${PNG.sync.write(png).toString('base64')}`;

// RUNTIME SCALE, READ FROM SOURCE (never retyped). A sheet that ignores this
// misreports size — Session 9 showed hollowed-brutes smaller than it renders,
// and the angel variants each carry a scale too.
const mainSrc = readFileSync(join(ROOT, 'src/game/MainScene.ts'), 'utf8');
const setSrc = readFileSync(join(ROOT, 'src/game/settings.ts'), 'utf8');
const angelScale = (k) => Number(new RegExp(`\\b${k}:\\s*\\{[\\s\\S]{0,900}?scale:\\s*([\\d.]+)`).exec(setSrc)?.[1]) || 1;
const RUNTIME_SCALE = {
  'hollowed-brutes': Number(/spawnEuropeBrute[\s\S]{0,900}?t\.sprite\.setScale\(([\d.]+)\)/.exec(mainSrc)?.[1]) || 1,
  'lesser-angels': angelScale('lesser'),
  'radiant-guardians': angelScale('warden'),
  'herald-angels': angelScale('herald'),
  'dark-casters': angelScale('darkcaster'),
};

const roster = await loadTs('src/world/enemy-roster.ts', 'toh-contact-roster');
const cfg = await loadTs('src/art/spritegen-config.ts', 'toh-contact-cfg');
const { EXISTING_FAMILY_DOMAIN: DOMAIN, UNMARKED_FAMILIES: UNMARKED, DOMAIN_TINT } = roster;

// CANDIDATE MODE (`--candidates <family>`): render every PNG staged under
// art-review/<batch>/ against that family's real frame, unrimmed, so a
// re-lock bake-off is judged at the SAME true display size as shipped art.
// The subject is what is on trial, so nothing else may differ.
const CANDIDATES = args.includes('--candidates') ? arg('--candidates', null) : null;

let rows;
if (CANDIDATES) {
  const fam = cfg.SPRITE_FAMILIES.find((f) => f.id === CANDIDATES);
  if (!fam) {
    console.error(`art:contact: unknown family "${CANDIDATES}"`);
    process.exit(1);
  }
  const frame = cfg.SIZE_CLASS[fam.sizeClass];
  const dir = join(ROOT, 'art-review', BATCH);
  rows = readdirSync(dir)
    .filter((f) => f.endsWith('.png'))
    .sort()
    .map((f) => {
      const src = PNG.sync.read(readFileSync(join(dir, f)));
      const fitted = fitLikeBoot(src, frame.w, frame.h, RUNTIME_SCALE[CANDIDATES] ?? 1);
      return {
        id: f.slice(0, -4), domain: null, unmarked: false, group: 'candidates',
        sizeClass: fam.sizeClass, frame, master: `${src.width}x${src.height}`,
        renders: `${fitted.w}x${fitted.h}`, rs: RUNTIME_SCALE[CANDIDATES] ?? 1,
        small: fitted.png, big: magnify(fitted.png, 6),
      };
    });
  if (rows.length === 0) {
    console.error(`art:contact: no candidate PNGs under art-review/${BATCH}`);
    process.exit(1);
  }
} else {
  rows = cfg.SPRITE_FAMILIES.map((f) => {
    const frame = cfg.SIZE_CLASS[f.sizeClass];
    const shipped = join(ROOT, cfg.spriteFileFor(f.id));
    const src = PNG.sync.read(readFileSync(shipped));
    const rs = RUNTIME_SCALE[f.id] ?? 1;
    const fitted = fitLikeBoot(src, frame.w, frame.h, rs);
    const small = fitted.png;
    const unmarked = UNMARKED.has(f.id);
    return {
      id: f.id,
      domain: DOMAIN[f.id],
      unmarked,
      group: unmarked ? 'unmarked' : DOMAIN[f.id],
      sizeClass: f.sizeClass,
      frame,
      master: `${src.width}x${src.height}`,
      renders: `${fitted.w}x${fitted.h}`,
      rs,
      small,
      big: magnify(small, 6),
    };
  });
}

mkdirSync(OUT, { recursive: true });
mkdirSync(join(OUT, 'crops'), { recursive: true });
for (const r of rows) writeFileSync(join(OUT, 'crops', `${r.id}.png`), PNG.sync.write(r.big));

const grass = terrainTile('grass');
const forest = terrainTile('forest');
const GROUPS = CANDIDATES ? [{ key: 'candidates', label: `RE-LOCK CANDIDATES — ${CANDIDATES}`, tint: null }] : [
  { key: 'physical', label: 'PHYSICAL', tint: DOMAIN_TINT.physical },
  { key: 'mental', label: 'MENTAL', tint: DOMAIN_TINT.mental },
  { key: 'spiritual', label: 'SPIRITUAL', tint: DOMAIN_TINT.spiritual },
  { key: 'unmarked', label: 'UNMARKED — no rim by canon', tint: null },
];
const hex = (n) => `#${n.toString(16).padStart(6, '0')}`;

const cell = (r) => `
  <div class="fam">
    <div class="nm">${r.id}</div>
    <div class="meta">${r.sizeClass} &middot; frame ${r.frame.w}&times;${r.frame.h} &middot; master ${r.master} &middot; <strong>renders ${r.renders}</strong>${r.rs !== 1 ? ` (runtime scale ${r.rs}&times;)` : ''}</div>
    <div class="views">
      <figure><div class="pad neutral"><img src="${uri(r.small)}" width="${r.frame.w}" height="${r.frame.h}"></div><figcaption>1:1 neutral</figcaption></figure>
      ${grass ? `<figure><div class="pad" style="background-image:url(${uri(grass)})"><img src="${uri(r.small)}" width="${r.frame.w}" height="${r.frame.h}"></div><figcaption>1:1 grass</figcaption></figure>` : ''}
      ${forest ? `<figure><div class="pad" style="background-image:url(${uri(forest)})"><img src="${uri(r.small)}" width="${r.frame.w}" height="${r.frame.h}"></div><figcaption>1:1 forest</figcaption></figure>` : ''}
      <figure><div class="pad neutral big"><img src="${uri(r.big)}" width="${r.frame.w * 6}" height="${r.frame.h * 6}"></div><figcaption>6&times; of the same pixels</figcaption></figure>
    </div>
  </div>`;

// ONE SHEET PER DOMAIN GROUP. A single nine-family sheet renders ~8200 px
// tall, which the chat surface rejects outright (HTTP 400) — and an image
// that cannot be posted is exactly the failure this tool exists to prevent.
// Per-group sheets stay well inside the limit and read better anyway, since
// the comparison that matters is within a domain.
const shell = (body) => `<!doctype html><meta charset="utf-8"><style>
  *{box-sizing:border-box}
  body{margin:0;padding:28px 30px;background:#14161a;color:#e8e6e1;
       font:13px/1.45 ui-monospace,Menlo,Consolas,monospace;width:1180px}
  h1{font-size:20px;margin:0 0 4px;letter-spacing:.3px}
  .sub{color:#9aa0a8;font-size:12px;margin-bottom:6px}
  .pending{display:inline-block;margin:10px 0 22px;padding:7px 12px;border-radius:5px;
           background:#3a2a10;border:1px solid #7a5a18;color:#f0c27a;font-size:12px}
  .grp{margin:0 0 6px;padding:7px 11px;border-radius:5px;background:#1c1f25;
       display:flex;align-items:center;gap:10px;font-size:12px;letter-spacing:1.2px}
  .sw{width:15px;height:15px;border-radius:3px;border:1px solid #444}
  .grpwrap{margin-bottom:26px}
  .fam{padding:12px 0 14px;border-bottom:1px solid #23262c}
  .fam:last-child{border-bottom:0}
  .nm{font-size:14px;color:#fff}
  .meta{color:#868c94;font-size:11px;margin:2px 0 9px}
  .views{display:flex;gap:16px;align-items:flex-end}
  .pad{display:flex;align-items:center;justify-content:center;padding:8px;
       border:1px solid #2c3037;border-radius:4px;image-rendering:pixelated}
  .neutral{background:#22262c}
  .big{padding:10px}
  img{image-rendering:pixelated;display:block}
  figcaption{color:#7e858d;font-size:10px;margin-top:5px;text-align:center}
</style>
<h1>Thrones of Heaven — ${CANDIDATES ? `re-lock candidates: ${CANDIDATES}` : 'bestiary roster v1'} contact sheet</h1>
<div class="sub">${CANDIDATES
  ? `UNRIMMED candidate masters staged under art-review/${BATCH}/ — no rim is baked until a lock is approved. Put through the REAL boot fitter geometry (contain-fit of the opaque box into the frame, then runtime scale), so the 1:1 views are the pixels a 428&times;926 phone would actually receive.`
  : 'Rimmed as shipped. Rendered from public/sprites/enemy-*.png through the REAL boot fitter geometry — contain-fit of the opaque box into the frame, then runtime scale — so the 1:1 views are the pixels a 428&times;926 phone actually receives.'}</div>
<div class="pending">${CANDIDATES ? 'HOLD — awaiting Casey verdict. Nothing lands until a verdict receipt exists.' : 'VERDICT PENDING — backfill for Art Session 8. The art landed unverdicted; this sheet is the hold that should have preceded it.'}</div>
${body}`;

const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
const sheets = [];
for (const g of GROUPS) {
  const list = rows.filter((r) => r.group === g.key);
  if (list.length === 0) continue;
  const body = `<div class="grpwrap"><div class="grp">
      ${g.tint === null ? '<span class="sw" style="background:repeating-linear-gradient(45deg,#333,#333 4px,#222 4px,#222 8px)"></span>' : `<span class="sw" style="background:${hex(g.tint)}"></span>`}
      <span>${g.label}</span>
      <span style="color:#868c94;letter-spacing:0">${g.tint === null ? (CANDIDATES ? 'unrimmed masters, judged on SUBJECT' : 'domain data intact, never painted') : hex(g.tint)} &middot; ${list.length} famil${list.length === 1 ? 'y' : 'ies'}</span>
    </div>${list.map(cell).join('')}</div>`;
  const page = join(OUT, `${BATCH}-${g.key}.html`);
  writeFileSync(page, shell(body));
  const p = await browser.newPage({ viewport: { width: 1180, height: 900 }, deviceScaleFactor: 2 });
  await p.goto(pathToFileURL(page).href);
  await p.waitForLoadState('networkidle');
  const out = join(OUT, `${BATCH}-${g.key}.png`);
  await p.screenshot({ path: out, fullPage: true });
  await p.close();
  const dims = PNG.sync.read(readFileSync(out));
  // A sheet the chat surface will reject is not a delivered hold. Fail loudly
  // rather than hand back an image that cannot be posted.
  if (dims.height > 6000) {
    console.error(`art:contact: REFUSED — ${out} is ${dims.width}x${dims.height}; too tall to post. Split the group.`);
    process.exit(1);
  }
  sheets.push({ out, dims: `${dims.width}x${dims.height}` });
}
await browser.close();

for (const s of sheets) console.log(`art:contact: ${s.out} (${s.dims})`);
console.log(`art:contact: ${rows.length} per-family crops -> ${join(OUT, 'crops')}`);
for (const r of rows) console.log(`  ${r.id.padEnd(20)} ${r.group.padEnd(10)} frame ${r.frame.w}x${r.frame.h}  master ${r.master} (${r.scale}x)`);

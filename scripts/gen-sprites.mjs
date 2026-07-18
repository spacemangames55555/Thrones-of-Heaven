// SPRITE GENERATOR (art pass 1) — plain Node, zero new runtime dependencies.
// `npm run gen:sprites` regenerates every roster-family sprite from
// src/art/spritegen-config.ts (bundled on the fly with the repo's esbuild).
// Deterministic: fixed seed, same config → byte-identical PNGs (gate-checked).
//
// Output: public/sprites/enemy-<family-id>.png at the canonical size of the
// shared key each family replaces (the drop-in fitter's frame). Override the
// output directory with GEN_SPRITES_OUT (the determinism check regenerates
// into a temp dir and hash-compares against the committed files).
import { execFileSync } from 'node:child_process';
import { deflateSync, inflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Bundle + import the TS config (the repo's esbuild, no new deps). */
export async function loadConfig() {
  const out = join(ROOT, 'node_modules/.cache/toh-spritegen-config.mjs');
  execFileSync('npx', ['esbuild', 'src/art/spritegen-config.ts', '--bundle', '--format=esm', '--platform=node', `--outfile=${out}`, '--log-level=warning'], {
    cwd: ROOT,
    stdio: 'inherit',
  });
  return import(pathToFileURL(out).href + `?t=${Date.now()}`);
}

// ── Minimal PNG codec (8-bit RGBA, filter 0) ─────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type, data) {
  const out = Buffer.alloc(8 + data.length + 4);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, 'ascii'), data])), 8 + data.length);
  return out;
}
export function encodePng(w, h, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0; // filter 0
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  // Deterministic deflate (fixed level — no timestamps, no variance).
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}
/** Decode OUR PNGs (8-bit RGBA, filter 0 only) — used by the runtime gate. */
export function decodePng(buf) {
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  const bitDepth = buf[24];
  const colorType = buf[25];
  const idat = [];
  let off = 8;
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    if (type === 'IDAT') idat.push(buf.subarray(off + 8, off + 8 + len));
    off += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const rgba = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    if (raw[y * (w * 4 + 1)] !== 0) throw new Error('unsupported PNG filter (our encoder writes filter 0)');
    raw.copy(rgba, y * w * 4, y * (w * 4 + 1) + 1, (y + 1) * (w * 4 + 1));
  }
  return { w, h, bitDepth, colorType, rgba };
}

// ── Deterministic RNG (mulberry32) + raster helpers ──────────────────────────
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class Raster {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.px = Buffer.alloc(w * h * 4);
  }
  set(x, y, v, a = 255) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    this.px[i] = v;
    this.px[i + 1] = v;
    this.px[i + 2] = v;
    this.px[i + 3] = a;
  }
  alphaAt(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    return this.px[(y * this.w + x) * 4 + 3];
  }
  ellipse(cx, cy, rx, ry, v, a = 255) {
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++)
      for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
        const dx = (x - cx) / rx;
        const dy = (y - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.set(x, y, v, a);
      }
  }
  rect(x0, y0, w, h, v, a = 255) {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) this.set(x, y, v, a);
  }
  /** Filled triangle (for blades, horns, cloaks). */
  tri(ax, ay, bx, by, cx, cy, v) {
    const minX = Math.floor(Math.min(ax, bx, cx));
    const maxX = Math.ceil(Math.max(ax, bx, cx));
    const minY = Math.floor(Math.min(ay, by, cy));
    const maxY = Math.ceil(Math.max(ay, by, cy));
    const sign = (x1, y1, x2, y2, x3, y3) => (x1 - x3) * (y2 - y3) - (x2 - x3) * (y1 - y3);
    for (let y = minY; y <= maxY; y++)
      for (let x = minX; x <= maxX; x++) {
        const d1 = sign(x, y, ax, ay, bx, by);
        const d2 = sign(x, y, bx, by, cx, cy);
        const d3 = sign(x, y, cx, cy, ax, ay);
        const neg = d1 < 0 || d2 < 0 || d3 < 0;
        const pos = d1 > 0 || d2 > 0 || d3 > 0;
        if (!(neg && pos)) this.set(x, y, v);
      }
  }
  line(x0, y0, x1, y1, v, thick = 1) {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2 + 1;
    for (let s = 0; s <= steps; s++) {
      const x = x0 + ((x1 - x0) * s) / steps;
      const y = y0 + ((y1 - y0) * s) / steps;
      for (let dx = 0; dx < thick; dx++) for (let dy = 0; dy < thick; dy++) this.set(x + dx, y + dy, v);
    }
  }
  /** 1px dark outline: every opaque pixel touching transparency darkens. */
  outline(v) {
    const marks = [];
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (this.alphaAt(x, y) === 0) continue;
        if (this.alphaAt(x - 1, y) === 0 || this.alphaAt(x + 1, y) === 0 || this.alphaAt(x, y - 1) === 0 || this.alphaAt(x, y + 1) === 0) marks.push([x, y]);
      }
    for (const [x, y] of marks) this.set(x, y, v);
  }
}

// ── The nine family painters (silhouette-first, grayscale bands) ─────────────
function paint(family, cfg, rand) {
  const { GRAY, SIZE_CLASS, SHADOW_ALPHA, SHADOW_HEIGHT_PX } = cfg;
  const { w, h } = SIZE_CLASS[family.sizeClass];
  const r = new Raster(w, h);
  const cx = w / 2;
  const groundY = h - 2;
  // Shared base shadow FIRST (identical treatment across all 9).
  r.ellipse(cx, groundY, w * 0.34, SHADOW_HEIGHT_PX / 2, GRAY.shadow, SHADOW_ALPHA);
  const bodyTop = 3;

  switch (family.id) {
    case 'corrupted-wildlife': {
      // Hunched quadruped in profile: raised haunch, low head.
      r.ellipse(cx + 3, h * 0.52, w * 0.34, h * 0.2, GRAY.mid); // body
      r.ellipse(cx + w * 0.24, h * 0.42, w * 0.17, h * 0.16, GRAY.light); // haunch
      r.ellipse(cx - w * 0.3, h * 0.62, w * 0.14, h * 0.11, GRAY.dark); // low head
      r.line(cx - w * 0.4, h * 0.58, cx - w * 0.46, h * 0.52, GRAY.bright, 1); // ear/tooth glint
      for (const lx of [-0.22, -0.08, 0.12, 0.28]) r.rect(Math.round(cx + w * lx), Math.round(h * 0.66), 2, Math.round(h * 0.3), GRAY.dark); // legs
      r.line(cx + w * 0.38, h * 0.44, cx + w * 0.48, h * 0.3, GRAY.dark, 1); // tail
      break;
    }
    case 'evil-raiders': {
      // Humanoid marauder: horned helm, jagged blade arm.
      r.rect(Math.round(cx - w * 0.14), Math.round(h * 0.62), 3, Math.round(h * 0.32), GRAY.dark); // legs
      r.rect(Math.round(cx + w * 0.05), Math.round(h * 0.62), 3, Math.round(h * 0.32), GRAY.dark);
      r.ellipse(cx, h * 0.46, w * 0.2, h * 0.2, GRAY.mid); // torso
      r.ellipse(cx, h * 0.22, w * 0.13, h * 0.1, GRAY.light); // head
      r.tri(cx - w * 0.12, h * 0.16, cx - w * 0.2, h * 0.04, cx - w * 0.05, h * 0.14, GRAY.dark); // horn L
      r.tri(cx + w * 0.12, h * 0.16, cx + w * 0.2, h * 0.04, cx + w * 0.05, h * 0.14, GRAY.dark); // horn R
      r.tri(cx + w * 0.2, h * 0.52, cx + w * 0.46, h * 0.2, cx + w * 0.32, h * 0.56, GRAY.bright); // jagged blade
      break;
    }
    case 'veil-ambushers': {
      // Low crouched cloak, two claws reaching forward.
      r.tri(cx, bodyTop + h * 0.18, cx - w * 0.4, groundY - 2, cx + w * 0.4, groundY - 2, GRAY.mid); // cloak cone
      r.ellipse(cx, h * 0.34, w * 0.15, h * 0.1, GRAY.dark); // cowl hollow
      r.line(cx - w * 0.34, groundY - 4, cx - w * 0.48, groundY - 7, GRAY.light, 1); // claw L
      r.line(cx + w * 0.34, groundY - 4, cx + w * 0.48, groundY - 7, GRAY.light, 1); // claw R
      r.line(cx - w * 0.1, h * 0.5, cx - w * 0.2, h * 0.72, GRAY.dark, 1); // fold
      r.line(cx + w * 0.1, h * 0.5, cx + w * 0.2, h * 0.72, GRAY.dark, 1);
      break;
    }
    case 'hollowed-brutes': {
      // Top-heavy torso, tiny sunken head, fists dragging at the ground.
      r.ellipse(cx, h * 0.4, w * 0.36, h * 0.27, GRAY.mid); // huge torso
      r.ellipse(cx, h * 0.16, w * 0.1, h * 0.07, GRAY.dark); // tiny head
      r.ellipse(cx - w * 0.34, h * 0.78, w * 0.12, h * 0.09, GRAY.dark); // fist L
      r.ellipse(cx + w * 0.34, h * 0.78, w * 0.12, h * 0.09, GRAY.dark); // fist R
      r.rect(Math.round(cx - w * 0.38), Math.round(h * 0.44), 3, Math.round(h * 0.32), GRAY.dark); // arm L
      r.rect(Math.round(cx + w * 0.3), Math.round(h * 0.44), 3, Math.round(h * 0.32), GRAY.dark); // arm R
      r.rect(Math.round(cx - w * 0.12), Math.round(h * 0.64), 3, Math.round(h * 0.3), GRAY.dark); // squat legs
      r.rect(Math.round(cx + w * 0.04), Math.round(h * 0.64), 3, Math.round(h * 0.3), GRAY.dark);
      r.ellipse(cx, h * 0.32, w * 0.16, h * 0.08, GRAY.light); // chest ridge
      break;
    }
    case 'lesser-evil-scouts': {
      // Wiry imp: swept-back horns, whip tail.
      r.rect(Math.round(cx - w * 0.12), Math.round(h * 0.6), 2, Math.round(h * 0.34), GRAY.dark); // legs
      r.rect(Math.round(cx + w * 0.06), Math.round(h * 0.6), 2, Math.round(h * 0.34), GRAY.dark);
      r.ellipse(cx, h * 0.44, w * 0.16, h * 0.18, GRAY.mid); // slim torso
      r.ellipse(cx, h * 0.2, w * 0.15, h * 0.12, GRAY.light); // big head
      r.line(cx - w * 0.1, h * 0.12, cx - w * 0.32, h * 0.02, GRAY.dark, 2); // swept horn L
      r.line(cx + w * 0.1, h * 0.12, cx + w * 0.32, h * 0.02, GRAY.dark, 2); // swept horn R
      r.line(cx + w * 0.14, h * 0.56, cx + w * 0.42, h * 0.44, GRAY.dark, 1); // tail out
      r.line(cx + w * 0.42, h * 0.44, cx + w * 0.34, h * 0.3, GRAY.dark, 1); // tail whip
      r.set(cx - 2, h * 0.19, GRAY.highlight);
      r.set(cx + 2, h * 0.19, GRAY.highlight); // eye glints
      break;
    }
    case 'herald-angels': {
      // Tall herald: narrow high wings, raised trumpet arm.
      r.tri(cx - w * 0.14, h * 0.5, cx - w * 0.3, bodyTop, cx - w * 0.08, h * 0.28, GRAY.dark); // wing L (high, narrow)
      r.tri(cx + w * 0.14, h * 0.5, cx + w * 0.3, bodyTop, cx + w * 0.08, h * 0.28, GRAY.dark); // wing R
      r.tri(cx, h * 0.3, cx - w * 0.16, groundY - 3, cx + w * 0.16, groundY - 3, GRAY.mid); // long robe
      r.ellipse(cx, h * 0.2, w * 0.09, h * 0.08, GRAY.light); // head
      r.line(cx + w * 0.08, h * 0.3, cx + w * 0.3, h * 0.12, GRAY.light, 2); // raised arm
      r.tri(cx + w * 0.28, h * 0.14, cx + w * 0.42, h * 0.04, cx + w * 0.38, h * 0.18, GRAY.bright); // trumpet bell
      r.ellipse(cx, h * 0.09, w * 0.07, h * 0.02, GRAY.highlight, 200); // halo sliver
      break;
    }
    case 'radiant-guardians': {
      // Broad warden behind a tower shield, wide low wings.
      r.tri(cx - w * 0.2, h * 0.62, cx - w * 0.46, h * 0.34, cx - w * 0.12, h * 0.4, GRAY.dark); // wing L (wide, low)
      r.tri(cx + w * 0.2, h * 0.62, cx + w * 0.46, h * 0.34, cx + w * 0.12, h * 0.4, GRAY.dark); // wing R
      r.ellipse(cx, h * 0.4, w * 0.24, h * 0.24, GRAY.mid); // broad body
      r.ellipse(cx, h * 0.16, w * 0.1, h * 0.08, GRAY.light); // head
      r.rect(Math.round(cx - w * 0.14), Math.round(h * 0.42), Math.round(w * 0.28), Math.round(h * 0.42), GRAY.light); // tower shield
      r.rect(Math.round(cx - w * 0.14), Math.round(h * 0.42), Math.round(w * 0.28), 2, GRAY.bright); // shield rim
      r.line(cx, h * 0.46, cx, h * 0.8, GRAY.mid, 1); // shield boss line
      break;
    }
    case 'lesser-angels': {
      // Slight figure, drooping wingtips, empty hands.
      r.tri(cx - w * 0.1, h * 0.42, cx - w * 0.3, h * 0.7, cx - w * 0.06, h * 0.6, GRAY.dark); // droop wing L
      r.tri(cx + w * 0.1, h * 0.42, cx + w * 0.3, h * 0.7, cx + w * 0.06, h * 0.6, GRAY.dark); // droop wing R
      r.tri(cx, h * 0.32, cx - w * 0.11, groundY - 4, cx + w * 0.11, groundY - 4, GRAY.mid); // slim robe
      r.ellipse(cx, h * 0.22, w * 0.08, h * 0.07, GRAY.light); // head
      r.line(cx - w * 0.08, h * 0.4, cx - w * 0.14, h * 0.58, GRAY.mid, 1); // empty arm L
      r.line(cx + w * 0.08, h * 0.4, cx + w * 0.14, h * 0.58, GRAY.mid, 1); // empty arm R
      break;
    }
    case 'dark-casters': {
      // Hooded robe, orb held high on a staff, NO wings.
      r.tri(cx, h * 0.18, cx - w * 0.2, groundY - 3, cx + w * 0.2, groundY - 3, GRAY.mid); // robe
      r.ellipse(cx, h * 0.2, w * 0.11, h * 0.09, GRAY.dark); // deep hood
      r.ellipse(cx, h * 0.22, w * 0.05, h * 0.04, GRAY.outline, 255); // face void
      r.line(cx + w * 0.12, h * 0.34, cx + w * 0.3, h * 0.1, GRAY.dark, 2); // staff
      r.ellipse(cx + w * 0.3, h * 0.08, w * 0.06, w * 0.06 / 1.2, GRAY.bright); // orb
      r.set(cx + w * 0.3, h * 0.07, GRAY.highlight); // orb spark
      break;
    }
    default:
      throw new Error(`no painter for family '${family.id}'`);
  }

  // Sparse deterministic dither inside the body (texture without breaking bands).
  for (let i = 0; i < w * h * 0.02; i++) {
    const x = Math.floor(rand() * w);
    const y = Math.floor(rand() * h);
    if (r.alphaAt(x, y) === 255) r.set(x, y, GRAY.dark);
  }
  r.outline(GRAY.outline);
  return r;
}

export async function generateAll(outDir) {
  const cfg = await loadConfig();
  const rand = rng(cfg.SPRITE_SEED);
  const files = [];
  mkdirSync(outDir, { recursive: true });
  for (const fam of cfg.SPRITE_FAMILIES) {
    const raster = paint(fam, cfg, rand);
    const png = encodePng(raster.w, raster.h, raster.px);
    const file = join(outDir, `${cfg.spriteKeyFor(fam.id)}.png`);
    writeFileSync(file, png);
    files.push(file);
  }
  return files;
}

// CLI entry: regenerate into the live drop-in folder (or GEN_SPRITES_OUT).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const outDir = process.env.GEN_SPRITES_OUT ?? join(ROOT, 'public/sprites');
  const files = await generateAll(outDir);
  console.log(`gen-sprites: wrote ${files.length} sprites to ${outDir}`);
}

/**
 * Generates the app icons (no image libraries — just a hand-rolled rasterizer
 * and Node's zlib for PNG encoding). Draws a bold white megaphone with sound
 * waves on a warm gradient, supersampled 3x for smooth edges.
 *
 * Run: node tools/make-icons.mjs   (outputs to public/icons/)
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
mkdirSync(OUT, { recursive: true });

const SS = 3; // supersample factor

// --- colour helpers --------------------------------------------------------
const lerp = (a, b, t) => a + (b - a) * t;
function mix(c1, c2, t) {
  return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
}

// --- geometry helpers ------------------------------------------------------
function pointInPoly(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Render one icon at `size` px. `maskable` keeps art inside a safe centre zone
 * and fills the whole square (no rounded transparent corners).
 */
function render(size, { maskable }) {
  const N = size * SS;
  const buf = Buffer.alloc(N * N * 4);

  const bgTop = [255, 122, 0]; // warm orange
  const bgBot = [255, 45, 85]; // hot pink-red
  const corner = maskable ? 0 : N * 0.22; // rounded corners for non-maskable
  const white = [255, 255, 255];

  // Megaphone geometry in 0..1 space (a touch smaller for maskable safe zone).
  const s = maskable ? 0.78 : 0.92;
  const cx = 0.5;
  const cy = 0.52;
  const u = (x, y) => [(cx + (x - 0.5) * s) * N, (cy + (y - 0.5) * s) * N];

  // Bell: trapezoid pointing right.
  const bell = [u(0.26, 0.5), u(0.5, 0.34), u(0.5, 0.66)];
  // Cone body.
  const cone = [u(0.26, 0.42), u(0.26, 0.58), u(0.52, 0.7), u(0.52, 0.3)];
  // Mouthpiece rectangle on the left.
  const mouth = [u(0.2, 0.44), u(0.26, 0.44), u(0.26, 0.56), u(0.2, 0.56)];
  // Sound-wave arcs emanate from this pivot, to the right of the bell.
  const pivot = u(0.18, 0.5);
  const waveR = [0.32, 0.4, 0.48].map((r) => r * s * N);
  const waveThick = 0.028 * s * N;

  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      // Rounded-corner mask for non-maskable icons.
      if (!maskable) {
        const dx = Math.min(x, N - 1 - x);
        const dy = Math.min(y, N - 1 - y);
        if (dx < corner && dy < corner) {
          const ddx = corner - dx;
          const ddy = corner - dy;
          if (ddx * ddx + ddy * ddy > corner * corner) continue; // transparent
        }
      }

      // Background gradient (diagonal).
      const t = (x / N) * 0.4 + (y / N) * 0.6;
      let [r, g, b] = mix(bgTop, bgBot, Math.min(1, t));

      // Megaphone (white).
      const inHorn =
        pointInPoly(x, y, cone) ||
        pointInPoly(x, y, bell) ||
        pointInPoly(x, y, mouth);
      if (inHorn) {
        [r, g, b] = white;
      } else {
        // Sound waves: arc bands to the right, within an angular wedge.
        const ddx = x - pivot[0];
        const ddy = y - pivot[1];
        const dist = Math.hypot(ddx, ddy);
        const ang = Math.atan2(ddy, ddx);
        if (ddx > 0 && Math.abs(ang) < 0.62) {
          for (const R of waveR) {
            if (Math.abs(dist - R) < waveThick) {
              [r, g, b] = white;
              break;
            }
          }
        }
      }

      const i = (y * N + x) * 4;
      buf[i] = r;
      buf[i + 1] = g;
      buf[i + 2] = b;
      buf[i + 3] = 255;
    }
  }

  return downsample(buf, N, size);
}

/** Box-average SSxSS blocks down to the target size, producing RGBA. */
function downsample(buf, N, size) {
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const i = ((y * SS + sy) * N + (x * SS + sx)) * 4;
          r += buf[i];
          g += buf[i + 1];
          b += buf[i + 2];
          a += buf[i + 3];
        }
      }
      const n = SS * SS;
      const o = (y * size + x) * 4;
      out[o] = Math.round(r / n);
      out[o + 1] = Math.round(g / n);
      out[o + 2] = Math.round(b / n);
      out[o + 3] = Math.round(a / n);
    }
  }
  return out;
}

// --- PNG encoder -----------------------------------------------------------
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePng(rgba, size) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type RGBA
  // 10,11,12 = compression/filter/interlace = 0

  // Filter type 0 per scanline.
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- emit ------------------------------------------------------------------
const targets = [
  ['icon-192.png', 192, { maskable: false }],
  ['icon-512.png', 512, { maskable: false }],
  ['maskable-512.png', 512, { maskable: true }],
  ['apple-touch-icon-180.png', 180, { maskable: true }],
];

for (const [name, size, opts] of targets) {
  const rgba = render(size, opts);
  writeFileSync(join(OUT, name), encodePng(rgba, size));
  console.log('wrote', name, `${size}x${size}`);
}

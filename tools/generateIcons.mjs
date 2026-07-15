// PWA PLACEHOLDER ICONS — generated IN CODE (no image assets, no dependencies):
// a dark app tile in the game's UI palette with a gold pixel "ToH" mark. Real
// art drops in later by replacing the PNGs in public/icons/ (same filenames).
//
//   node tools/generateIcons.mjs   → public/icons/icon-{180,192,512}.png
//
// The PNGs are written with a minimal encoder (zlib + hand-built chunks) so the
// repo needs no canvas/image packages.
import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
const SIZES = [180, 192, 512]; // apple-touch-icon + the two manifest sizes

// ─── Minimal PNG writer (8-bit RGBA, filter 0) ────────────────────────────────
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
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ─── The tile art, painted on a 32×32 design grid ─────────────────────────────
// Palette: the game's dark UI navy + its gold accent.
const BG = [0x0b, 0x1a, 0x2b]; // #0b1a2b (theme/background color)
const BG_EDGE = [0x07, 0x10, 0x1c]; // darker vignette edge
const FRAME = [0x6a, 0x57, 0x22]; // dim gold frame
const GOLD = [0xff, 0xd2, 0x4a]; // #ffd24a — the mark

// The "ToH" mark as pixel bitmaps (7 rows). T + o + H, 1-cell gaps → 17 wide.
const MARK = [
  '#####......#...#',
  '..#........#...#',
  '..#...###..#####',
  '..#..#...#.#...#',
  '..#..#...#.#...#',
  '..#..#...#.#...#',
  '..#...###..#...#',
];
const MARK_W = MARK[0].length;
const MARK_X = Math.floor((32 - MARK_W) / 2);
const MARK_Y = 13;

/** Color of design-grid cell (gx,gy) in [0..31]². */
function cellColor(gx, gy) {
  // Gold mark on top.
  const mx = gx - MARK_X;
  const my = gy - MARK_Y;
  if (my >= 0 && my < MARK.length && mx >= 0 && mx < MARK_W && MARK[my][mx] === '#') return GOLD;
  // A small gold crown dot above the mark (three points).
  if (gy === 9 && (gx === 13 || gx === 16 || gx === 19)) return GOLD;
  if (gy === 10 && gx >= 13 && gx <= 19) return FRAME;
  // Thin dim-gold frame inset one ring from the vignette edge.
  const onFrame = (gx === 2 || gx === 29 || gy === 2 || gy === 29) && gx >= 2 && gx <= 29 && gy >= 2 && gy <= 29;
  if (onFrame) return FRAME;
  // Vignette: the outermost two rings darker than the body.
  if (gx < 2 || gx > 29 || gy < 2 || gy > 29) return BG_EDGE;
  return BG;
}

function drawIcon(size) {
  const rgba = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [r, g, b] = cellColor(Math.floor((x * 32) / size), Math.floor((y * 32) / size));
      const i = (y * size + x) * 4;
      rgba[i] = r;
      rgba[i + 1] = g;
      rgba[i + 2] = b;
      rgba[i + 3] = 255; // fully opaque tile (maskable-friendly)
    }
  }
  return encodePng(size, size, rgba);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
for (const size of SIZES) {
  const file = path.join(OUT_DIR, `icon-${size}.png`);
  fs.writeFileSync(file, drawIcon(size));
  console.log(`wrote ${file}`);
}

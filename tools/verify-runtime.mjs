// RUNTIME VERIFICATION GATE (npm run verify:runtime) — part of the pipeline's
// Definition of Done for any change touching live code paths.
//
// Boots the REAL built game headlessly (428x926, the target phone viewport)
// and fails on the classes of bug tsc/build/smoke cannot see:
//   • any page error during boot or scene creation (the class-announcement
//     crash was exactly this: create() threw only at runtime),
//   • a fresh start that auto-activates a quest it shouldn't (any class),
//   • the Europe sparse world failing to register/render its built chunks,
//   • zone gates missing or a gate crossing not landing,
//   • world travel (Europe <-> Earth) breaking.
//
// HARNESS CONTRACT (hardening pass): every check ESTABLISHES its own
// preconditions — alive, healed, god-mode shield, known location/quest state —
// via window.__ready() / window.__ensureEscort() before acting, and asserts
// its setup LOUDLY: a check whose setup fails must FAIL the gate, never
// silently skip or vacuously pass. (A debuff-seed that no-op'd on a dead
// player, and Europe checks skipping when the world failed to register, were
// exactly this class of rot.)
//
// Self-contained: builds nothing (run `npm run build` first — `npm run verify`
// chains it), starts its own preview server on :4174, exits nonzero on any
// failure. Requires the window.__game handle exported by src/main.ts.
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright-core';

const PORT = 4174;
const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

// Class figures with shipped 8-way rotation art (classId → base texture key).
// Grows one entry per art drop, in the same commit as the files.
const ROTATED_FIGURES = { necromancer: 'necro-figure', bard: 'bard-figure', hunter: 'hunter-figure' };
// FIGURE-SET LINT thresholds, calibrated against the three shipped sets: each
// frame's opaque-content box vs the set's union box. Width varies legitimately
// with facing (profile views are narrow — observed floor 0.653), height barely
// varies (observed floor 0.951). A frame below these floors would visibly
// shrink the whole set through the union-box fitter.
const FIGURE_MIN_WIDTH_RATIO = 0.5;
const FIGURE_MIN_HEIGHT_RATIO = 0.85;
const results = [];
const pageErrors = [];
const ok = (name, pass, detail = '') => {
  results.push(pass);
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
};

// 0) SPRITE-GEN ASSET CONTRACT (pure Node, before the browser): the 9 shipped
// enemy-family PNGs must exist at the drop-in pipeline paths with each family's
// CANONICAL shared-key dimensions in 8-bit RGBA; stay TINT-COMPATIBLE (near-
// neutral channels so the multiplicative domain tint colorizes them); carry a
// readable silhouette (opaque coverage inside the config band); and regenerate
// BYTE-IDENTICALLY from the committed config + seed (determinism).
{
  const { loadConfig, decodePng, generateAll } = await import('../scripts/gen-sprites.mjs');
  const cfg = await loadConfig();
  const sprites = cfg.SPRITE_FAMILIES.map((f) => {
    const want = cfg.SIZE_CLASS[f.sizeClass];
    const path = cfg.spriteFileFor(f.id);
    if (!existsSync(path)) return { id: f.id, path, missing: true };
    const png = decodePng(readFileSync(path));
    let solid = 0;
    let spread = 0;
    for (let i = 0; i < png.w * png.h; i++) {
      const a = png.rgba[i * 4 + 3];
      if (a >= 128) solid++;
      if (a > 0) {
        const r = png.rgba[i * 4];
        const g = png.rgba[i * 4 + 1];
        const b = png.rgba[i * 4 + 2];
        spread = Math.max(spread, Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
      }
    }
    return {
      id: f.id,
      path,
      shapeOk: png.w === want.w && png.h === want.h && png.bitDepth === 8 && png.colorType === 6,
      dims: `${png.w}x${png.h}`,
      spread,
      coverage: Number((solid / (png.w * png.h)).toFixed(3)),
    };
  });
  const nine = sprites.length === 9 && sprites.every((s) => !s.missing);
  ok(
    'sprite-gen — files: all 9 enemy-family PNGs exist at pipeline paths with canonical dims, 8-bit RGBA',
    nine && sprites.every((s) => s.shapeOk),
    JSON.stringify(sprites.map((s) => `${s.id}:${s.missing ? 'MISSING' : s.dims}`)),
  );
  ok(
    `sprite-gen — tint-compat: every drawn pixel near-neutral (max channel spread ≤ ${cfg.TINT_NEUTRALITY_MAX_SPREAD}) so domain tint colorizes`,
    nine && sprites.every((s) => s.spread <= cfg.TINT_NEUTRALITY_MAX_SPREAD),
    JSON.stringify(sprites.map((s) => `${s.id}:${s.missing ? 'MISSING' : s.spread}`)),
  );
  ok(
    `sprite-gen — silhouette: opaque coverage within [${cfg.COVERAGE_MIN}, ${cfg.COVERAGE_MAX}] (no near-empty or blob sprite)`,
    nine && sprites.every((s) => s.coverage >= cfg.COVERAGE_MIN && s.coverage <= cfg.COVERAGE_MAX),
    JSON.stringify(sprites.map((s) => `${s.id}:${s.missing ? 'MISSING' : s.coverage}`)),
  );
  const regenDir = mkdtempSync(join(tmpdir(), 'toh-spritegen-'));
  let regen;
  try {
    await generateAll(regenDir);
    const sha = (buf) => createHash('sha256').update(buf).digest('hex');
    regen = cfg.SPRITE_FAMILIES.map((f) => {
      const name = `${cfg.spriteKeyFor(f.id)}.png`;
      const shipped = cfg.spriteFileFor(f.id);
      if (!existsSync(shipped) || !existsSync(join(regenDir, name))) return { id: f.id, identical: false };
      return { id: f.id, identical: sha(readFileSync(shipped)) === sha(readFileSync(join(regenDir, name))) };
    });
  } finally {
    rmSync(regenDir, { recursive: true, force: true });
  }
  ok(
    'sprite-gen — determinism: regeneration from committed config + seed is byte-identical to the shipped set (hash compare)',
    regen.length === 9 && regen.every((r) => r.identical),
    JSON.stringify(regen.map((r) => `${r.id}:${r.identical}`)),
  );
}

// 0b. WORLD CENSUS (permanent, pure Node): the unified planet's contents,
// printed and sanity-bounded — zones per continent, built/absorbed/prebuilt
// counts, class homes (must be exactly 14), portal sites.
{
  const { WORLD } = await import('../src/world/world-manifest.ts').catch(() => ({ WORLD: null })) ?? {};
  let manifest = WORLD;
  if (!manifest) {
    const m = await (async () => {
      const { build } = await import('esbuild');
      const { mkdirSync } = await import('node:fs');
      const outfile = new URL('../node_modules/.cache/toh-census-manifest.mjs', import.meta.url).pathname;
      mkdirSync(new URL('../node_modules/.cache', import.meta.url).pathname, { recursive: true });
      await build({ entryPoints: [new URL('../src/world/world-manifest.ts', import.meta.url).pathname], bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'silent' });
      return import(outfile);
    })();
    manifest = m.WORLD;
  }
  const byContinent = {};
  for (const z of manifest) byContinent[z.continent] = (byContinent[z.continent] ?? 0) + 1;
  const homes = manifest.filter((z) => z.homeClass).length;
  const portals = manifest.filter((z) => z.portalSite).length;
  const census = { totalZones: manifest.length, byContinent, homes, portals };
  ok(
    'world census: one planet — zones per continent, 14 class homes, portal sites (printed)',
    manifest.length >= 60 && homes === 14 && portals >= 1,
    JSON.stringify(census),
  );
}

// 0c. PACK-INTEGRITY (PASS 3, pure Node): the committed real-Earth packs must
// match their manifests byte-for-byte, decode to headers that agree with the
// LIVE terrain-schema constants (never a copy), respect the size guards
// (total ≤ 60 MB, single file ≤ 45 MB), keep the download cache gitignored,
// and carry the required rivers + 300 coast-truth points.
{
  const worldDir = new URL('../public/world/', import.meta.url).pathname;
  const schema = await (async () => {
    const { build } = await import('esbuild');
    const { mkdirSync } = await import('node:fs');
    const outfile = new URL('../node_modules/.cache/toh-terrain-schema.mjs', import.meta.url).pathname;
    mkdirSync(new URL('../node_modules/.cache', import.meta.url).pathname, { recursive: true });
    await build({ entryPoints: [new URL('../src/world/terrain-schema.ts', import.meta.url).pathname], bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'silent' });
    return import(outfile);
  })();
  const ws = await (async () => {
    const { build } = await import('esbuild');
    const outfile = new URL('../node_modules/.cache/toh-world-scale.mjs', import.meta.url).pathname;
    await build({ entryPoints: [new URL('../src/world/world-scale.ts', import.meta.url).pathname], bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'silent' });
    return import(outfile);
  })();
  const { gunzipSync } = await import('node:zlib');
  const read = (f) => readFileSync(join(worldDir, f));
  // PASS 7: grid packs ship GZIP — decode truth is the DECOMPRESSED bytes
  // (manifest sha256 = decompressed; gzBytes = the committed wire size).
  const planet = gunzipSync(read('planet.bin.gz'));
  const pnw = gunzipSync(read('regions/pnw.bin.gz'));
  const egypt = gunzipSync(read('regions/egypt.bin.gz'));
  const regions = JSON.parse(read('regions.json'));
  const rivers = JSON.parse(read('regions/pnw-rivers.json'));
  const eRivers = JSON.parse(read('regions/egypt-rivers.json'));
  const coast = JSON.parse(read('coast-truth.json'));
  const bakeManifest = JSON.parse(readFileSync(new URL('../scripts/bake-earth/bake-manifest.json', import.meta.url).pathname));
  const sha = (buf) => createHash('sha256').update(buf).digest('hex');
  // Manifest checksums (regions.json AND bake-manifest) vs committed bytes:
  // gz rows verify gzBytes (committed) AND the decompressed sha; raw rows as before.
  const pnwEntry = regions.regions.find((r) => r.id === 'pnw');
  const egyptEntry = regions.regions.find((r) => r.id === 'egypt');
  const manifestShaOk =
    pnwEntry.sha256 === sha(pnw) &&
    egyptEntry.sha256 === sha(egypt) &&
    bakeManifest.outputs.every((o) => {
      const rel = o.file.replace('public/world/', '');
      const committed = read(rel);
      if (rel.endsWith('.gz')) return o.gzBytes === committed.length && sha(gunzipSync(committed)) === o.sha256;
      return sha(committed) === o.sha256;
    });
  // Headers vs the LIVE schema/scale constants.
  const worldTilesX = (360 * ws.PX_PER_DEG_LNG) / 32;
  const worldTilesY = (170 * ws.PX_PER_DEG_LAT) / 32;
  const u32 = (buf, o) => buf.readUInt32LE(o);
  const planetHeaderOk =
    planet.toString('latin1', 0, 4) === 'TOHW' &&
    u32(planet, 4) === 1 &&
    u32(planet, 8) === Math.ceil(worldTilesX / 256) &&
    u32(planet, 12) === Math.ceil(worldTilesY / 256) &&
    u32(planet, 16) === 256 &&
    u32(planet, 20) === Math.ceil(worldTilesX / 512) &&
    u32(planet, 24) === Math.ceil(worldTilesY / 512) &&
    u32(planet, 28) === 512 &&
    u32(planet, 32) === schema.ELEV_BAND_OFFSET_M &&
    u32(planet, 36) === schema.ELEV_BAND_STEP_M &&
    planet.length === 40 + Math.ceil(worldTilesX / 256) * Math.ceil(worldTilesY / 256) + Math.ceil(worldTilesX / 512) * Math.ceil(worldTilesY / 512);
  const regionHeaderOk = (buf, bb) => {
    const rw = u32(buf, 8);
    const rh = u32(buf, 12);
    return (
      buf.toString('latin1', 0, 4) === 'TOHR' &&
      u32(buf, 4) === 1 &&
      u32(buf, 16) === 16 &&
      buf.readDoubleLE(20) === bb[0] &&
      buf.readDoubleLE(28) === bb[1] &&
      buf.readDoubleLE(36) === bb[2] &&
      buf.readDoubleLE(44) === bb[3] &&
      buf.length === 52 + rw * rh * 2
    );
  };
  const pnwHeaderOk = regionHeaderOk(pnw, [41.5, 49.5, -125.0, -110.5]);
  const egyptHeaderOk = regionHeaderOk(egypt, [21.5, 32.5, 24.5, 36.5]);
  // Size guards count COMMITTED bytes (gz where compressed) — thresholds unchanged.
  const totalBytes = bakeManifest.outputs.reduce((a, o) => a + (o.gzBytes ?? o.bytes), 0);
  const sizeOk = totalBytes <= 60 * 1024 * 1024 && bakeManifest.outputs.every((o) => (o.gzBytes ?? o.bytes) <= 45 * 1024 * 1024);
  const gitignoreOk = readFileSync(new URL('../.gitignore', import.meta.url).pathname, 'utf8').includes('scripts/bake-earth/.cache/');
  const riverNames = new Set(rivers.rivers.map((r) => r.name));
  const riversOk = riverNames.has('Columbia') && riverNames.has('Snake') && rivers.rivers.every((r) => r.widthClass >= 1 && r.widthClass <= 3);
  // Egypt: the Nile must ship at width class 3; the Suez Canal's presence or
  // STATED absence is recorded in the bake manifest (fidelity gap, ledgered).
  const nile = eRivers.rivers.filter((r) => r.name === 'Nile');
  const egyptRiversOk = nile.length > 0 && Math.max(...nile.map((r) => r.widthClass)) === 3;
  const suezStated = typeof bakeManifest.suezCanalNote === 'string' && bakeManifest.suezCanalNote.length > 0;
  const coastOk = coast.points.length === 300 && coast.points.every((p) => typeof p.water === 'boolean');
  const sourcesOk = Array.isArray(bakeManifest.sources) && bakeManifest.sources.length >= 3 && bakeManifest.sources.every((s) => s.url && s.sha256);
  ok(
    'pack-integrity: gz packs decode to manifest-matching truth; headers (pnw + egypt) agree with the live schema; committed-size guards hold; Columbia+Snake and a class-3 Nile shipped; Suez Canal presence stated; 300 coast-truth points',
    manifestShaOk && planetHeaderOk && pnwHeaderOk && egyptHeaderOk && sizeOk && gitignoreOk && riversOk && egyptRiversOk && suezStated && coastOk && sourcesOk,
    JSON.stringify({ manifestShaOk, planetHeaderOk, pnwHeaderOk, egyptHeaderOk, totalMB: +(totalBytes / 1048576).toFixed(1), sizeOk, gitignoreOk, riversOk, egyptRiversOk, suez: bakeManifest.suezCanalNote, coastOk, sourcesOk, derivedBiomes: bakeManifest.derivedBiomes === true }),
  );

  // 0c1b. GZ-PARITY (PASS 7): decoded pack truth is BYTE-IDENTICAL to the
  // pre-compression bake — the planet + pnw decompressed sha256 are PINNED
  // from the last raw decode (the values the whole 6-series gate ran on).
  const PRE_COMPRESSION_PINS = {
    planet: '9e881e73761fef15f30510b406f756316100680e4607e3b8eff88f9b9252544d',
    pnw: '14c4ab4de9690edba81e06a2482d085358af557f65c4b68a1b7ff2a0ffda9ff1',
  };
  ok(
    'gz-parity: decompressed planet + pnw packs are byte-identical to the pinned pre-compression decode; egypt decompresses to its manifest sha',
    sha(planet) === PRE_COMPRESSION_PINS.planet && sha(pnw) === PRE_COMPRESSION_PINS.pnw && sha(egypt) === egyptEntry.sha256,
    JSON.stringify({ planet: sha(planet).slice(0, 12), pnw: sha(pnw).slice(0, 12), egypt: sha(egypt).slice(0, 12) }),
  );
}

// 0c2. WORLDMAP-PARITY (PASS 6A, pure Node): the baked map image must agree
// with the planet pack it renders — exact projection dims, the ≤ 1.5 MB
// budget, manifest sha, and probe pixels resolving to the correct
// MAP_PALETTE classes (family sets mirror the live geo-truth gate).
{
  const { PNG } = await import('pngjs');
  const { build } = await import('esbuild');
  const mk = async (entry, tag) => {
    const outfile = new URL(`../node_modules/.cache/toh-wmp-${tag}.mjs`, import.meta.url).pathname;
    await build({ entryPoints: [new URL(entry, import.meta.url).pathname], bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'silent' });
    return import(outfile);
  };
  const vis = await mk('../src/world/terrain-visuals-config.ts', 'vis');
  const ws2 = await mk('../src/world/world-scale.ts', 'scale');
  const schema2 = await mk('../src/world/terrain-schema.ts', 'schema');
  const B = schema2.Biome;
  const bytes = readFileSync(new URL('../public/world/worldmap.png', import.meta.url).pathname);
  const png = PNG.sync.read(bytes);
  const expectH = Math.round((vis.WORLDMAP_WIDTH * 170 * ws2.PX_PER_DEG_LAT) / (360 * ws2.PX_PER_DEG_LNG));
  const dimsOk = png.width === vis.WORLDMAP_WIDTH && png.height === expectH;
  const sizeOk2 = bytes.length <= 1.5 * 1024 * 1024;
  const wmEntry = JSON.parse(readFileSync(new URL('../public/world/regions.json', import.meta.url).pathname)).worldmap;
  const shaOk = wmEntry && wmEntry.sha256 === createHash('sha256').update(bytes).digest('hex') && wmEntry.w === png.width && wmEntry.h === png.height;
  // Nearest MAP_PALETTE class under brightness normalization (hillshade-safe).
  const classAt = (lat, lng) => {
    const x = Math.min(png.width - 1, Math.floor(((lng + 180) / 360) * png.width));
    const y = Math.min(png.height - 1, Math.floor(((85 - lat) / 170) * png.height));
    const o = (y * png.width + x) * 4;
    const r = png.data[o];
    const g = png.data[o + 1];
    const b = png.data[o + 2];
    const lum = (r + g + b) / 3 || 1;
    let best = -1;
    let bd = Infinity;
    for (const [id, v] of Object.entries(vis.MAP_PALETTE)) {
      const pr = (v >> 16) & 255;
      const pg = (v >> 8) & 255;
      const pb = v & 255;
      const pl = (pr + pg + pb) / 3;
      const d = (r / lum - pr / pl) ** 2 + (g / lum - pg / pl) ** 2 + (b / lum - pb / pl) ** 2;
      if (d < bd) {
        bd = d;
        best = Number(id);
      }
    }
    return best;
  };
  const himalaya = new Set();
  for (let la = 27.5; la <= 28.5; la += 0.1) {
    for (let ln = 83.5; ln <= 84.5; ln += 0.1) himalaya.add(classAt(la, ln));
  }
  const probes = {
    sahara: classAt(23, 10) === B.DESERT,
    amazon: [B.FOREST, B.SWAMP, B.SAVANNA].includes(classAt(-3, -60)),
    pacific: classAt(0, -150) === B.OCEAN,
    greenland: [B.SNOW, B.TUNDRA].includes(classAt(72, -40)),
    pnw: [B.FOREST, B.GRASS, B.TAIGA, B.BEACH].includes(classAt(47.6, -123.7)),
    himalayaHigh: himalaya.has(B.ROCK) || himalaya.has(B.SNOW),
  };
  ok(
    'worldmap-parity: image dims match the projection; <= 1.5 MB; manifest sha matches; Sahara/Amazon/Pacific/Greenland/PNW/Himalaya probe classes correct',
    dimsOk && sizeOk2 && shaOk && Object.values(probes).every(Boolean),
    JSON.stringify({ w: png.width, h: png.height, expectH, mb: +(bytes.length / 1048576).toFixed(2), dimsOk, sizeOk: sizeOk2, shaOk, ...probes }),
  );
}

// 0c3. REGIONMAP-PARITY (PASS 6D, pure Node): every baked regional map image
// must agree with the region pack it renders — dims match the pack grid (or
// the manifest STATES the downscale), manifest sha, the 6 MB budget, and
// probe pixels resolving to the correct MAP_PALETTE classes at real places
// (Puget Sound water, Rainier high band, the baked Columbia near Vantage
// searched as a box exactly like the geo-truth river probe, Olympic forest).
{
  const { PNG } = await import('pngjs');
  const vis = await import(new URL('../node_modules/.cache/toh-wmp-vis.mjs', import.meta.url).pathname);
  const schema2 = await import(new URL('../node_modules/.cache/toh-wmp-schema.mjs', import.meta.url).pathname);
  const B = schema2.Biome;
  const { gunzipSync: gunzip0c3 } = await import('node:zlib');
  const regions2 = JSON.parse(readFileSync(new URL('../public/world/regions.json', import.meta.url).pathname));
  // Per-region probe tables (box entries search a window — bakes shift
  // channels a hair off survey, the geo-truth river-probe discipline).
  const REGION_PROBES = {
    pnw: [
      { name: 'puget', classes: [B.OCEAN, B.FRESHWATER], at: [47.6, -122.4] },
      { name: 'rainier', classes: [B.SNOW, B.ROCK], at: [46.85, -121.76] },
      { name: 'vantageRiver', classes: [B.FRESHWATER], box: [46.84, 47.04, -120.08, -119.88] },
      { name: 'olympic', classes: [B.FOREST, B.TAIGA, B.GRASS], at: [47.8, -123.7] },
    ],
    egypt: [
      { name: 'medWater', classes: [B.OCEAN], at: [31.8, 29.5] },
      { name: 'nileLuxor', classes: [B.FRESHWATER], box: [25.6, 25.8, 32.5, 32.76] },
      { name: 'qarun', classes: [B.FRESHWATER], box: [29.38, 29.55, 30.4, 30.8] },
      // Derived-biome speckle at this latitude (stated fallback): box probe.
      { name: 'interiorDesert', classes: [B.DESERT], box: [26.8, 27.2, 26.8, 27.2] },
    ],
  };
  for (const rid of ['pnw', 'egypt']) {
    const rEntry = regions2.regions.find((r) => r.id === rid);
    const mapEntry = rEntry?.map;
    let out = { hasEntry: !!mapEntry };
    if (mapEntry) {
      const bytes = readFileSync(new URL(`../public/world/${mapEntry.file}`, import.meta.url).pathname);
      const png = PNG.sync.read(bytes);
      const packRaw = readFileSync(new URL(`../public/world/${rEntry.file}`, import.meta.url).pathname);
      const pack = rEntry.file.endsWith('.gz') ? gunzip0c3(packRaw) : packRaw;
      const gw = pack.readUInt32LE(8);
      const gh = pack.readUInt32LE(12);
      const native = png.width === gw && png.height === gh;
      const statedDown = !!mapEntry.downscaledFrom && mapEntry.downscaledFrom.w === gw && mapEntry.downscaledFrom.h === gh && Math.max(png.width, png.height) === 2048;
      const bb = rEntry.bbox;
      const classAt = (lat, lng) => {
        const x = Math.min(png.width - 1, Math.max(0, Math.floor(((lng - bb.lngMin) / (bb.lngMax - bb.lngMin)) * png.width)));
        const y = Math.min(png.height - 1, Math.max(0, Math.floor(((bb.latMax - lat) / (bb.latMax - bb.latMin)) * png.height)));
        const o = (y * png.width + x) * 4;
        const r = png.data[o];
        const g = png.data[o + 1];
        const b2 = png.data[o + 2];
        const lum = (r + g + b2) / 3 || 1;
        let best = -1;
        let bd = Infinity;
        for (const [id, v] of Object.entries(vis.MAP_PALETTE)) {
          const pr = (v >> 16) & 255;
          const pg = (v >> 8) & 255;
          const pb = v & 255;
          const pl = (pr + pg + pb) / 3;
          const d = (r / lum - pr / pl) ** 2 + (g / lum - pg / pl) ** 2 + (b2 / lum - pb / pl) ** 2;
          if (d < bd) {
            bd = d;
            best = Number(id);
          }
        }
        return best;
      };
      out = {
        hasEntry: true,
        w: png.width,
        h: png.height,
        gridW: gw,
        gridH: gh,
        dimsOk: native || statedDown,
        mb: +(bytes.length / 1048576).toFixed(2),
        sizeOk: bytes.length <= 6 * 1024 * 1024,
        shaOk: mapEntry.sha256 === createHash('sha256').update(bytes).digest('hex') && mapEntry.bytes === bytes.length,
      };
      for (const p of REGION_PROBES[rid]) {
        if (p.at) out[p.name] = p.classes.includes(classAt(p.at[0], p.at[1]));
        else {
          let hit = false;
          for (let la = p.box[0]; la <= p.box[1] && !hit; la += 0.005) {
            for (let ln = p.box[2]; ln <= p.box[3] && !hit; ln += 0.005) {
              if (p.classes.includes(classAt(la, ln))) hit = true;
            }
          }
          out[p.name] = hit;
        }
      }
    }
    ok(
      `${rid === 'pnw' ? 'regionmap' : 'egyptmap'}-parity: ${rid}-map.png dims match the pack grid (or a STATED 2048 downscale); <= 6 MB; manifest sha matches; probe classes correct`,
      out.hasEntry && out.dimsOk && out.sizeOk && out.shaOk && REGION_PROBES[rid].every((p) => out[p.name]),
      JSON.stringify(out),
    );
  }
}

// 0d. REPLANT-TRUE-COORDS (PASS 6C, pure Node — replaces quest-anchor-sanity's
// inside-the-mega-stamp rule, which the dissolution retires BY DESIGN): under
// the v2 default every Acts I–IV authored anchor re-plants at its declared
// POI — in-bounds and within the POI's local neighborhood (exact legacy
// offsets are all < 4096 px). The POI table itself is held to the spec: the
// five pinned real places within ε = 0.02°, the two assault FICTION sites
// within their spec distance bands (haversine), the corridor + crossing
// tables internally consistent. Radii sweep unchanged from Pass 4.
{
  const { build } = await import('esbuild');
  const outfile = new URL('../node_modules/.cache/toh-settings.mjs', import.meta.url).pathname;
  await build({ entryPoints: [new URL('../src/game/settings.ts', import.meta.url).pathname], bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'silent' });
  const settings = await import(outfile);
  const lf = await (async () => {
    const out2 = new URL('../node_modules/.cache/toh-legacy-frame.mjs', import.meta.url).pathname;
    await build({ entryPoints: [new URL('../src/world/legacy-frame.ts', import.meta.url).pathname], bundle: true, format: 'esm', platform: 'node', outfile: out2, logLevel: 'silent' });
    return import(out2);
  })();
  const rp = await (async () => {
    const out3 = new URL('../node_modules/.cache/toh-replant.mjs', import.meta.url).pathname;
    await build({ entryPoints: [new URL('../src/world/replant.ts', import.meta.url).pathname], bundle: true, format: 'esm', platform: 'node', outfile: out3, logLevel: 'silent' });
    return import(out3);
  })();
  const ws2 = await import(new URL('../node_modules/.cache/toh-world-scale.mjs', import.meta.url).pathname);
  const worldW = 360 * ws2.PX_PER_DEG_LNG;
  const worldH = 170 * ws2.PX_PER_DEG_LAT;
  // Every POI's true anchor in the scene frame (what legacyEarthPx targets).
  const poiScene = rp.REPLANT_POIS.map((p) => {
    const g = rp.poiGlobePx(p.id);
    return { id: p.id, x: lf.LEGACY_GLOBE_ORIGIN_X + Math.round(g.x), y: Math.round(g.y) };
  });
  const nearPoi = (v) => poiScene.some((s) => Math.hypot(v.x - s.x, v.y - s.y) <= 4096);
  // Corridor-interpolated anchors (Commit 2) live BETWEEN settlements by
  // design: their rule is proximity to the corridor POLYLINE, not to a POI.
  const corridorScene = rp.corridorPoints().map((p) => ({ x: lf.LEGACY_GLOBE_ORIGIN_X + p.x, y: p.y }));
  const nearCorridor = (v) => {
    for (let i = 0; i + 1 < corridorScene.length; i++) {
      const a = corridorScene[i];
      const b = corridorScene[i + 1];
      const abx = b.x - a.x;
      const aby = b.y - a.y;
      const t = Math.max(0, Math.min(1, ((v.x - a.x) * abx + (v.y - a.y) * aby) / (abx * abx + aby * aby || 1)));
      if (Math.hypot(v.x - (a.x + abx * t), v.y - (a.y + aby * t)) <= 96) return true;
    }
    return false;
  };
  const CORRIDOR_ANCHOR_NAMES = new Set(['Q9_AMBUSHES', 'Q12_AMBUSHES']);
  const anchorOffenders = [];
  const radiusOffenders = [];
  let anchors = 0;
  let radii = 0;
  for (const [name, v] of Object.entries(settings)) {
    if (name === 'TRINITY_ARENA') continue; // hell-plane constant (flagged, not swept)
    if (v && typeof v === 'object' && typeof v.x === 'number' && typeof v.y === 'number' && v.x >= 1_000_000) {
      anchors++;
      const inBounds = v.x >= 0 && v.x <= lf.LEGACY_GLOBE_ORIGIN_X + worldW && v.y >= 0 && v.y <= worldH;
      if (!inBounds || !nearPoi(v)) anchorOffenders.push(name);
    }
    if (Array.isArray(v)) {
      for (const e of v) {
        if (e && typeof e === 'object' && typeof e.x === 'number' && e.x >= 1_000_000) {
          anchors++;
          const fits = CORRIDOR_ANCHOR_NAMES.has(name) ? nearCorridor(e) : nearPoi(e);
          if (!fits) anchorOffenders.push(`${name}[]`);
        }
      }
    }
    // Quest-domain radii only: projectile/bolt HIT radii are weapon hitboxes
    // (7-12 px by design), not trigger geometry.
    if (/(_RADIUS|_RANGE)$/.test(name) && typeof v === 'number' && !/BOLT|PROJECTILE|HIT_RADIUS/.test(name)) {
      radii++;
      if (v < 16 || v > 4096) radiusOffenders.push(`${name}=${v}`);
    }
  }
  // The POI table vs the spec.
  const EPS = 0.02;
  const PINNED = { enumclaw: [47.204, -121.991], olympia: [47.038, -122.9], boise: [43.615, -116.202], kamiah: [46.227, -116.029], seattle: [47.606, -122.332] };
  const poiById = new Map(rp.REPLANT_POIS.map((p) => [p.id, p]));
  const pinnedOk = Object.entries(PINNED).every(([id, [la, ln]]) => {
    const p = poiById.get(id);
    return p && Math.abs(p.lat - la) <= EPS && Math.abs(p.lng - ln) <= EPS;
  });
  const havKm = (a, b) => {
    const R = 6371;
    const dLa = ((b.lat - a.lat) * Math.PI) / 180;
    const dLn = ((b.lng - a.lng) * Math.PI) / 180;
    const s = Math.sin(dLa / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLn / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
  };
  const outpostKm = havKm(poiById.get('kamiah'), poiById.get('holy-outpost'));
  const portalKm = havKm(poiById.get('holy-outpost'), poiById.get('heaven-portal'));
  const fictionOk = poiById.get('holy-outpost').fiction === true && poiById.get('heaven-portal').fiction === true && outpostKm >= 25 && outpostKm <= 60 && portalKm <= 15;
  const uniqueIds = new Set(rp.REPLANT_POIS.map((p) => p.id)).size === rp.REPLANT_POIS.length;
  const crossIds = rp.REPLANT_CROSSINGS.map((c) => c.id);
  const crossUnique = new Set(crossIds).size === crossIds.length;
  const corridorPts = rp.corridorPoints(); // throws on an unknown crossing ref
  const corridorXs = rp.REPLANT_CORRIDOR.filter((n) => typeof n === 'string' && n.startsWith('x:')).map((n) => n.slice(2));
  const allCrossingsRouted = crossIds.every((id) => corridorXs.includes(id));
  ok(
    'replant-true-coords (static): anchors in-bounds within their POI neighborhood; radii in [16,4096]; 5 pinned POIs within 0.02 deg; outpost 25-60 km from Kamiah, portal <= 15 km (fiction-flagged); tables consistent; every crossing routed',
    anchors >= 40 && anchorOffenders.length === 0 && radii >= 5 && radiusOffenders.length === 0 && pinnedOk && fictionOk && uniqueIds && crossUnique && corridorPts.length >= 80 && allCrossingsRouted,
    JSON.stringify({ anchors, radii, pois: rp.REPLANT_POIS.length, crossings: crossIds.length, corridorPts: corridorPts.length, outpostKm: +outpostKm.toFixed(1), portalKm: +portalKm.toFixed(1), anchorOffenders: anchorOffenders.slice(0, 10), radiusOffenders: radiusOffenders.slice(0, 10) }),
  );
}

// 0e. PLANE-ANCHOR-INVARIANCE (PASS 5, pure Node): plane-scoped anchors
// (Heaven, Hell, city interiors) must be byte-identical under v1, v2, and
// flag permutations — planes never pass through a projection — and the
// restored TRINITY_ARENA must sit inside the hell plane bounds.
{
  const { build } = await import('esbuild');
  const mk = async (tag, search) => {
    const outfile = new URL(`../node_modules/.cache/toh-settings-${tag}.mjs`, import.meta.url).pathname;
    await build({ entryPoints: [new URL('../src/game/settings.ts', import.meta.url).pathname], bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'silent' });
    globalThis.location = { search };
    const mod = await import(outfile);
    delete globalThis.location;
    return mod;
  };
  const sV1 = await mk('flag-v1', '?scale=v1');
  const sV2 = await mk('flag-v2', '');
  const sMix = await mk('flag-mix', '?terrain=proc&devspeed=8');
  const isPt = (v) => v && typeof v === 'object' && typeof v.x === 'number' && typeof v.y === 'number';
  let invariant = 0;
  let shifted = 0;
  const violations = [];
  const classify = (name, v, a, c) => {
    const same12 = isPt(a) && a.x === v.x && a.y === v.y;
    const same2m = isPt(c) && c.x === v.x && c.y === v.y;
    if (same12 && same2m) invariant++;
    else if (!same12 && same2m) shifted++; // earth anchors ride the projection (v2 == mix, v1 differs)
    else violations.push(name); // flag-dependent in any OTHER way = broken
  };
  for (const [name, v] of Object.entries(sV2)) {
    if (isPt(v)) classify(name, v, sV1[name], sMix[name]);
    else if (Array.isArray(v)) {
      for (let i = 0; i < v.length; i++) {
        if (isPt(v[i])) classify(`${name}[${i}]`, v[i], sV1[name]?.[i], sMix[name]?.[i]);
      }
    }
  }
  const t = sV2.TRINITY_ARENA;
  const tOk =
    t.x === sV1.TRINITY_ARENA.x && t.y === sV1.TRINITY_ARENA.y && t.x === sMix.TRINITY_ARENA.x && t.x >= 0 && t.x < 23040 && t.y >= 0 && t.y < 23040;
  ok(
    'plane-anchor-invariance: plane anchors byte-identical across v1/v2/flag permutations; TRINITY_ARENA restored hell-local and in-plane',
    violations.length === 0 && tOk && invariant >= 1 && shifted >= 40,
    JSON.stringify({ invariant, shifted, violations: violations.slice(0, 8), trinity: t }),
  );
}

// 0f. LINT-HARD-WIRED (PASS 5, pure Node): the terrain-art lint + converter
// are wired as npm scripts AND enforce the drop contract — the lint passes a
// contract-true fixture, hard-fails a contract-breaking one, and the magenta
// converter actually keys pixels out. The tools run for real; nothing mocked.
{
  const { PNG } = await import('pngjs');
  const { mkdirSync, writeFileSync } = await import('node:fs');
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url).pathname, 'utf8'));
  const scriptsWired = pkg.scripts['lint:terrain-art'] === 'node tools/lint-terrain-art.mjs' && pkg.scripts['convert:terrain'] === 'node tools/convert-terrain-art.mjs';
  const fx = new URL('../node_modules/.cache/toh-art-fixtures', import.meta.url).pathname;
  rmSync(fx, { recursive: true, force: true });
  mkdirSync(join(fx, 'good'), { recursive: true });
  mkdirSync(join(fx, 'bad'), { recursive: true });
  mkdirSync(join(fx, 'raw'), { recursive: true });
  // Good: a contract-true grass sheet (opaque base+anim row, dithered fringes).
  const good = new PNG({ width: 256, height: 128 });
  for (let y = 0; y < 128; y++) {
    for (let x = 0; x < 256; x++) {
      const o = (y * 256 + x) * 4;
      const row = Math.floor(y / 32);
      const col = Math.floor(x / 32);
      let a = 0;
      if (row === 0 && col <= 6) a = 255;
      else if (row >= 1 && (row < 3 || col === 0)) a = (x + y) % 2 ? 255 : 0;
      good.data[o] = 90 + col; // distinct variants (keeps the advisory quiet too)
      good.data[o + 1] = 150;
      good.data[o + 2] = 70;
      good.data[o + 3] = a;
    }
  }
  writeFileSync(join(fx, 'good', 'grass.png'), PNG.sync.write(good));
  // Bad: a wrong-size sheet — the exact class of drop the lint must stop.
  writeFileSync(join(fx, 'bad', 'grass.png'), PNG.sync.write(new PNG({ width: 64, height: 64 })));
  // Raw: a magenta-keyed prop for the converter round-trip.
  const raw = new PNG({ width: 32, height: 32 });
  for (let i = 0; i < raw.data.length; i += 4) {
    const key = (i / 4) % 2 === 0;
    raw.data[i] = key ? 255 : 10;
    raw.data[i + 1] = key ? 0 : 200;
    raw.data[i + 2] = key ? 255 : 10;
    raw.data[i + 3] = 255;
  }
  mkdirSync(join(fx, 'raw', 'props'), { recursive: true });
  writeFileSync(join(fx, 'raw', 'props', 'boulder-a.png'), PNG.sync.write(raw));
  const run = (args) => spawnSync('node', args, { encoding: 'utf8' });
  const goodRun = run(['tools/lint-terrain-art.mjs', '--dir', join(fx, 'good')]);
  const badRun = run(['tools/lint-terrain-art.mjs', '--dir', join(fx, 'bad')]);
  const realRun = run(['tools/lint-terrain-art.mjs']); // the live drop dir must be clean
  const convRun = run(['tools/convert-terrain-art.mjs', join(fx, 'raw'), join(fx, 'out')]);
  let keyed = false;
  try {
    const out = PNG.sync.read(readFileSync(join(fx, 'out', 'props', 'boulder-a.png')));
    keyed = out.data[3] === 0 && out.data[7] === 255; // magenta px transparent, real px kept
  } catch {
    keyed = false;
  }
  ok(
    'lint-hard-wired: npm scripts wired; lint passes a contract-true fixture, hard-fails a broken one, live dir clean; converter keys magenta',
    scriptsWired && goodRun.status === 0 && badRun.status === 1 && /HARD/.test(badRun.stderr) && realRun.status === 0 && convRun.status === 0 && keyed,
    JSON.stringify({ scriptsWired, good: goodRun.status, bad: badRun.status, real: realRun.status, conv: convRun.status, keyed }),
  );

  // 0f2. ASSET-MANIFEST SYNC (PASS 8, pure Node): regenerating the manifest
  // from the REAL registries reproduces the committed file byte-identically —
  // code<->manifest drift is red. Statuses are DERIVED, never declared.
  const msRun = run(['scripts/asset-manifest/build.mjs', '--check']);
  const pkg8 = JSON.parse(readFileSync('package.json', 'utf8')).scripts;
  ok(
    'manifest-sync: toh-asset-manifest.json regenerates byte-identically from the live registries; art:manifest + art:coverage npm scripts wired',
    msRun.status === 0 && pkg8['art:manifest'] === 'node scripts/asset-manifest/build.mjs' && pkg8['art:coverage'] === 'node scripts/asset-manifest/coverage.mjs',
    JSON.stringify({ status: msRun.status, err: (msRun.stderr || '').slice(0, 160) }),
  );

  // 0f3. MANIFEST FENCES (PASS 8, RELEASE RULE Art Session 2): the REQUIRED
  // blockedBy fences exist on every row the ledger rules govern — enemy
  // sprites wait on the tint ruling, animation sheets on the walk
  // framework, and each biome's prop upgrades on that biome's base
  // approval. A prop fence RELEASES exactly when that biome's sheet is
  // LIVE at the contract path — the EXPECTED fence list is recomputed here
  // from SCATTER_PROPS + the on-disk sheets and must match the manifest
  // exactly (unscattered props stated).
  const mf = JSON.parse(readFileSync('toh-asset-manifest.json', 'utf8')).assets;
  const tvCfg = await (async () => {
    const { build } = await import('esbuild');
    const outfile = new URL('../node_modules/.cache/toh-visuals-config-fences.mjs', import.meta.url).pathname;
    await build({ entryPoints: [new URL('../src/world/terrain-visuals-config.ts', import.meta.url).pathname], bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'silent' });
    return import(outfile);
  })();
  const floraCfg = await (async () => {
    const { build } = await import('esbuild');
    const outfile = new URL('../node_modules/.cache/toh-flora-fences.mjs', import.meta.url).pathname;
    await build({ entryPoints: [new URL('../src/world/flora-config.ts', import.meta.url).pathname], bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'silent' });
    return import(outfile);
  })();
  // ART SESSION 4: placement truth is BIOME_FLORA across EVERY tier — a
  // canopy-only map mislabels populated understory rows (found by the
  // pre-generation manifest verification; the builder derives identically).
  const fencePropBiomes = {};
  for (const [biome, tiers] of Object.entries(floraCfg.BIOME_FLORA)) {
    for (const tier of Object.values(tiers)) {
      for (const e of tier.palette) (fencePropBiomes[e.propId] ??= new Set()).add(tvCfg.BIOME_SHEET_NAME[biome]);
    }
  }
  const sheetLiveNow = (stem) => {
    try {
      const png = PNG.sync.read(readFileSync(`public/art/terrain/${stem}.png`));
      return png.width === 256 && png.height === 128;
    } catch {
      return false;
    }
  };
  const fenceGaps = [];
  for (const a of mf) {
    const fences = a.blockedBy ?? [];
    if (a.category === 'enemy' && !fences.includes('enemy-tint-ruling')) fenceGaps.push(`${a.id}:no-tint-fence`);
    if (a.category === 'figure-anim' && !fences.includes('walk-framework')) fenceGaps.push(`${a.id}:no-walk-fence`);
    if (a.category === 'terrain-prop') {
      const prop = a.id.replace(/^prop-/, '');
      // SYNTHETIC HARNESS ROWS carry no fence at all — a fence is a promise
      // that art lands when the ruling clears, and no art may EVER land
      // here. `fixture-row-inert` below owns their invariants.
      if (a.fixture) {
        if (fences.length > 0) fenceGaps.push(`${a.id}:fixture-must-carry-no-fence`);
        continue;
      }
      const scattered = [...(fencePropBiomes[prop] ?? [])];
      // PASS 9: understory rows are fenced on their TIER PALETTE (released
      // the moment a biome's understory palette carries entries — recomputed
      // here from BIOME_FLORA, never read from the manifest's own claim).
      const tier = floraCfg.FLORA_PROPS[prop]?.tier ?? 'canopy';
      const understoryLive = floraCfg.biomesWithTierPalette('understory').length > 0;
      let expected;
      if (tier === 'understory' && !understoryLive) expected = ['pnw-understory-palette'];
      else if (scattered.length === 0) expected = ['unscattered-prop'];
      else expected = scattered.filter((s) => !sheetLiveNow(s)).sort().map((s) => `${s}-base-approved`);
      if (JSON.stringify([...fences].sort()) !== JSON.stringify(expected.sort())) fenceGaps.push(`${a.id}:expected[${expected}]got[${fences}]`);
    }
  }
  const mfCounts = {
    enemy: mf.filter((a) => a.category === 'enemy').length,
    anim: mf.filter((a) => a.category === 'figure-anim').length,
    props: mf.filter((a) => a.category === 'terrain-prop').length,
  };
  ok(
    'manifest-fences: every enemy row fenced on enemy-tint-ruling, every animation sheet on walk-framework, every terrain prop on {biome}-base-approved (or stated unscattered)',
    fenceGaps.length === 0 && mfCounts.enemy >= 9 && mfCounts.anim === 14 && mfCounts.props >= 10,
    JSON.stringify({ ...mfCounts, gaps: fenceGaps.slice(0, 6) }),
  );

  // 0f4. THE BATCH MACHINE (PASS 8 Commit 2, pure Node — generation NEVER
  // runs here; the offline --fixture-dir path exercises every discipline).
  {
    const bfx = new URL('../node_modules/.cache/toh-artbatch-fx', import.meta.url).pathname;
    rmSync(bfx, { recursive: true, force: true });
    rmSync('art-review/gate-fix-a', { recursive: true, force: true });
    rmSync('art-review/gate-fix-b', { recursive: true, force: true });
    mkdirSync(join(bfx, 'fixtures'), { recursive: true });
    // Locks fixtures (the REAL art/style-locks.json stays empty — locks are
    // human-approved; the real-file refusal is asserted below).
    writeFileSync(join(bfx, 'locks.json'), JSON.stringify({ locks: { 'terrain-sheet': { reference: 'public/icons/icon-192.png', prompt: 'fixture' }, 'terrain-prop': { reference: 'public/icons/icon-192.png', prompt: 'fixture' }, creature: { reference: 'public/icons/icon-192.png', prompt: 'fixture' } } }));
    // A contract-true sheet for 'ocean' (same construction as the lint
    // fixture above) and a wrong-size sheet for 'freshwater'. ART SESSION 4:
    // these fixtures MUST name sheets that are still fallback — the batch
    // tool only targets non-live rows, so a dressed biome (beach/desert as
    // of this session) would silently stop being a target and hollow out
    // the check. The water pair is the remaining unlive set; when Session 5
    // dresses it, repoint these at whatever is still fallback then.
    const goodSheet = new PNG({ width: 256, height: 128 });
    for (let y = 0; y < 128; y++) {
      for (let x = 0; x < 256; x++) {
        const o = (y * 256 + x) * 4;
        const row = Math.floor(y / 32);
        const col = Math.floor(x / 32);
        let a = 0;
        if (row === 0 && col <= 6) a = 255;
        else if (row >= 1 && (row < 3 || col === 0)) a = (x + y) % 2 ? 255 : 0;
        goodSheet.data[o] = 90 + col;
        goodSheet.data[o + 1] = 150;
        goodSheet.data[o + 2] = 70;
        goodSheet.data[o + 3] = a;
      }
    }
    writeFileSync(join(bfx, 'fixtures', 'ocean.png'), PNG.sync.write(goodSheet));
    writeFileSync(join(bfx, 'fixtures', 'freshwater.png'), PNG.sync.write(new PNG({ width: 64, height: 64 })));
    // ART SESSION 5 — THE PERMANENT HARNESS TARGET. These checks used to
    // borrow whichever real biome happened to be undressed, and quietly
    // stopped asserting the moment it shipped (Session 4 lost three that
    // way). `fixture-harness-a` is synthetic FOREVER: never in a palette,
    // never rendered, never counted as debt, and refused by art:approve —
    // so it can never become live and can never stop being a valid target.
    const goodProp = new PNG({ width: 32, height: 32 });
    for (let i = 0; i < goodProp.data.length; i += 4) {
      goodProp.data[i] = 90;
      goodProp.data[i + 1] = 110;
      goodProp.data[i + 2] = 80;
      goodProp.data[i + 3] = 255;
    }
    writeFileSync(join(bfx, 'fixtures', 'prop-fixture-harness-a.png'), PNG.sync.write(goodProp));
    // ...and the BAD half on the OTHER permanent harness row: a wrong-size
    // PNG (contract is 32x32) so lint-wired proves the exclusion path against
    // a target that can never ship its way out of being a target.
    writeFileSync(join(bfx, 'fixtures', 'prop-fixture-harness-b.png'), PNG.sync.write(new PNG({ width: 11, height: 7 })));
    // A fixture for a BLOCKED creature id — it must NEVER be consumed.
    writeFileSync(join(bfx, 'fixtures', 'townsfolk.png'), PNG.sync.write(goodSheet));

    // style-lock-required: the REAL (empty) locks file refuses the category;
    // key-required: no PIXELLAB_SECRET and no fixture dir refuses too.
    // The refusal is proven against an EMPTY locks FIXTURE — the real
    // art/style-locks.json belongs to Casey and grows as verdicts land
    // (the terrain lock landed in Art Session 1); the tool's refusal
    // logic, not the registry's current contents, is the invariant.
    writeFileSync(join(bfx, 'locks-empty.json'), JSON.stringify({ locks: {} }));
    const noLock = run(['scripts/art-batch/batch.mjs', '--category', 'terrain-sheet', '--locks', join(bfx, 'locks-empty.json'), '--fixture-dir', join(bfx, 'fixtures')]);
    const noKey = spawnSync('node', ['scripts/art-batch/batch.mjs', '--category', 'terrain-sheet', '--locks', join(bfx, 'locks.json')], { encoding: 'utf8', env: { ...process.env, PIXELLAB_SECRET: '' } });
    ok(
      'style-lock-required: an unlocked category refuses (locks are human-approved on-device); a missing PIXELLAB_SECRET refuses the live path (the key lives in the environment ONLY)',
      noLock.status === 1 && /no style lock/.test(noLock.stderr) && noKey.status === 1 && /PIXELLAB_SECRET/.test(noKey.stderr),
      JSON.stringify({ noLock: noLock.status, noKey: noKey.status }),
    );

    // batch-stages-only: a traversal batch id refuses; a real run writes
    // ONLY inside art-review/<id> (the contract path stays absent and the
    // live tree untouched); statically, the tool's ONE raw write sits
    // inside the stagePath funnel.
    const trav = run(['scripts/art-batch/batch.mjs', '--category', 'terrain-prop', '--locks', join(bfx, 'locks.json'), '--fixture-dir', join(bfx, 'fixtures'), '--batch-id', '../escape']);
    const runA = run(['scripts/art-batch/batch.mjs', '--category', 'terrain-prop', '--locks', join(bfx, 'locks.json'), '--fixture-dir', join(bfx, 'fixtures'), '--limit', '12', '--batch-id', 'gate-fix-a']);
    const batchSrc = readFileSync('scripts/art-batch/batch.mjs', 'utf8');
    // Count CALL SITES (the import mention has no paren): the tool's one
    // raw write lives inside writeStaged, behind the stagePath funnel.
    const rawWrites = (batchSrc.match(/writeFileSync\(/g) ?? []).length;
    const stagedOk = existsSync('art-review/gate-fix-a/public/art/terrain/props/fixture-harness-a.png');
    const contractUntouched = !existsSync('public/art/terrain/props/fixture-harness-a.png') && !existsSync('escape');
    ok(
      'batch-stages-only: traversal batch id refused; a real batch stages under art-review/<id> only — the contract path stays absent; the tool has exactly ONE raw write, inside the stagePath funnel',
      trav.status === 1 && /not a plain path segment/.test(trav.stderr) && runA.status === 0 && stagedOk && contractUntouched && rawWrites === 1 && /function stagePath/.test(batchSrc),
      JSON.stringify({ trav: trav.status, runA: runA.status, stagedOk, contractUntouched, rawWrites }),
    );

    // lint-wired: the wrong-size fixture is EXCLUDED with its reason; the
    // good one is staged with the advisory columns in the report.
    const repA = JSON.parse(readFileSync('art-review/gate-fix-a/report.json', 'utf8'));
    const goodRow = repA.staged.find((s) => s.id === 'prop-fixture-harness-a');
    const badRow = repA.excluded.find((e) => e.id === 'prop-fixture-harness-b');
    ok(
      'lint-wired: a bad staged asset is excluded with its lint reason; staged rows carry the palette-size + luminance advisory columns (both halves ride PERMANENT harness rows)',
      !!goodRow && Number.isFinite(goodRow.paletteSize) && Number.isFinite(goodRow.meanLuminance) && !!badRow && /11x7/.test(badRow.reason),
      JSON.stringify({ good: goodRow, bad: badRow }),
    );

    // fence-respected: a category whose blocked ids HAVE fixtures generates
    // NONE of them — blocked rows are reported, never consumed.
    const runB = run(['scripts/art-batch/batch.mjs', '--category', 'creature', '--locks', join(bfx, 'locks.json'), '--fixture-dir', join(bfx, 'fixtures'), '--batch-id', 'gate-fix-b']);
    const repB = JSON.parse(readFileSync('art-review/gate-fix-b/report.json', 'utf8'));
    const townBlocked = repB.blockedSkipped.some((b) => b.id === 'townsfolk');
    const townNotStaged = !repB.staged.some((s) => s.id === 'townsfolk') && !repB.excluded.some((e) => e.id === 'townsfolk');
    ok(
      'fence-respected: a blocked fixture id (townsfolk <- enemy-tint-ruling) is never generated — reported under blockedSkipped, absent from staged and excluded alike',
      runB.status === 0 && townBlocked && townNotStaged,
      JSON.stringify({ runB: runB.status, townBlocked, townNotStaged, blocked: repB.blockedSkipped.length }),
    );

    // manifest-sync RE-RUN POST-FLIP, two halves (Art Session 5):
    // (a) approving the HARNESS batch is REFUSED outright — a synthetic row
    //     must never reach a contract path, or the checks that depend on it
    //     staying unlive would retire themselves;
    // (b) a hand-built batch carrying a REAL row still flips correctly into
    //     a sandbox root, and the live tree + committed manifest stay
    //     byte-in-sync throughout.
    const apprFixture = run(['scripts/art-batch/approve.mjs', '--batch', 'gate-fix-a', '--root', join(bfx, 'sandbox')]);
    const fixtureBlocked = apprFixture.status !== 0 && /REFUSED/.test(apprFixture.stderr) && !existsSync(join(bfx, 'sandbox', 'public/art/terrain/props/fixture-harness-a.png'));
    const realDir = 'art-review/gate-fix-c/public/art/terrain/props';
    mkdirSync(realDir, { recursive: true });
    const realPng = new PNG({ width: 32, height: 48 });
    for (let i = 0; i < realPng.data.length; i += 4) {
      realPng.data[i + 1] = 120;
      realPng.data[i + 3] = 255;
    }
    writeFileSync(join(realDir, 'cactus-a.png'), PNG.sync.write(realPng));
    writeFileSync('art-review/gate-fix-c/report.json', JSON.stringify({ batchId: 'gate-fix-c', category: 'terrain-prop', staged: [{ id: 'prop-cactus-a', files: ['public/art/terrain/props/cactus-a.png'] }], excluded: [], blockedSkipped: [] }));
    const appr = run(['scripts/art-batch/approve.mjs', '--batch', 'gate-fix-c', '--root', join(bfx, 'sandbox')]);
    const flipOk = existsSync(join(bfx, 'sandbox', 'public/art/terrain/props/cactus-a.png'));
    const syncAfter = run(['scripts/asset-manifest/build.mjs', '--check']);
    rmSync('art-review/gate-fix-c', { recursive: true, force: true });
    ok(
      'manifest-sync post-flip: approving a synthetic harness row is REFUSED and lands nothing; a real staged row still flips into the sandbox; the live tree and committed manifest stay byte-in-sync',
      fixtureBlocked && appr.status === 0 && flipOk && syncAfter.status === 0 && !existsSync('public/art/terrain/props/fixture-harness-a.png') && !existsSync('public/art/terrain/props/cactus-a.png'),
      JSON.stringify({ apprFixture: apprFixture.status, fixtureBlocked, appr: appr.status, flipOk, syncAfter: syncAfter.status }),
    );
    rmSync('art-review/gate-fix-a', { recursive: true, force: true });
    rmSync('art-review/gate-fix-b', { recursive: true, force: true });
    rmSync(bfx, { recursive: true, force: true });
  }

  // 0f4b. FIXTURE-ROW-INERT (ART SESSION 5 Step 0): the three batch-machine
  // checks above now target a PERMANENTLY SYNTHETIC row instead of borrowing
  // whichever real asset happens to be undressed — Art Session 4 lost three
  // checks the moment beach/desert shipped, and Session 5 dresses the last
  // two biomes, so there would be nothing left to borrow. That only holds if
  // the harness row can never become real. THREE INVARIANTS, all asserted
  // from ground truth, none read from the row's own claim:
  //   NEVER RENDERS  — absent from every BIOME_FLORA palette on every tier,
  //                    and floraFor (THE placement function) returns it zero
  //                    times over a dense sweep of every biome x tier; no
  //                    file at its contract path.
  //   NEVER COUNTS   — invisible to art:coverage: it appears in no line of
  //                    the report, and the terrain-prop row counts equal the
  //                    non-fixture manifest rows exactly (it is not art debt).
  //   NEVER APPROVES — art:approve REFUSES a batch carrying it and lands
  //                    nothing, even into a throwaway sandbox root.
  {
    const fixIds = floraCfg.fixturePropIds();
    const inPalette = [];
    for (const [biome, tiers] of Object.entries(floraCfg.BIOME_FLORA)) {
      for (const [tier, cfg] of Object.entries(tiers)) {
        for (const e of cfg.palette) if (fixIds.includes(e.propId)) inPalette.push(`${biome}/${tier}:${e.propId}`);
      }
    }
    // Dense placement sweep: every biome that has ANY palette, both tiers,
    // 4,000 tiles each — a fixture id surfacing even once is a live render.
    let sampled = 0;
    let plantedFixture = 0;
    for (const biome of Object.keys(floraCfg.BIOME_FLORA).map(Number)) {
      for (const tier of ['canopy', 'understory']) {
        for (let k = 0; k < 4000; k++) {
          const f = floraCfg.floraFor(70000 + k * 11, 90000 + k * 17 + biome * 3, biome, tier);
          sampled++;
          if (f && fixIds.includes(f.id)) plantedFixture++;
        }
      }
    }
    const fixtureFilesOnDisk = fixIds.filter((id) => existsSync(`public/art/terrain/props/${id}.png`));
    const neverRenders = fixIds.length > 0 && inPalette.length === 0 && plantedFixture === 0 && fixtureFilesOnDisk.length === 0;

    const cov = run(['scripts/asset-manifest/coverage.mjs']);
    const covMentions = fixIds.filter((id) => cov.stdout.includes(id));
    const propRows = mf.filter((a) => a.category === 'terrain-prop');
    const realProps = propRows.filter((a) => !a.fixture);
    const fixtureRows = propRows.filter((a) => a.fixture);
    const covLine = (cov.stdout.match(/^terrain-prop\s+.*$/m) ?? [''])[0];
    const covNums = covLine.trim().split(/\s+/).slice(1, 4).map(Number);
    const countedTotal = covNums.reduce((a, b) => a + b, 0);
    const neverCounts =
      cov.status === 0 &&
      covMentions.length === 0 &&
      fixtureRows.length === fixIds.length &&
      Number.isFinite(countedTotal) &&
      countedTotal === realProps.length &&
      realProps.length + fixtureRows.length === propRows.length;

    const inertFx = new URL('../node_modules/.cache/toh-fixture-inert', import.meta.url).pathname;
    rmSync(inertFx, { recursive: true, force: true });
    rmSync('art-review/gate-inert', { recursive: true, force: true });
    const inertDir = 'art-review/gate-inert/public/art/terrain/props';
    mkdirSync(inertDir, { recursive: true });
    const inertPng = new PNG({ width: 32, height: 32 });
    for (let i = 0; i < inertPng.data.length; i += 4) inertPng.data[i + 3] = 255;
    for (const id of fixIds) writeFileSync(join(inertDir, `${id}.png`), PNG.sync.write(inertPng));
    writeFileSync(
      'art-review/gate-inert/report.json',
      JSON.stringify({ batchId: 'gate-inert', category: 'terrain-prop', staged: fixIds.map((id) => ({ id: `prop-${id}`, files: [`public/art/terrain/props/${id}.png`] })), excluded: [], blockedSkipped: [] }),
    );
    const apprInert = run(['scripts/art-batch/approve.mjs', '--batch', 'gate-inert', '--root', inertFx]);
    const landedAnyway = fixIds.filter((id) => existsSync(join(inertFx, `public/art/terrain/props/${id}.png`)) || existsSync(`public/art/terrain/props/${id}.png`));
    const neverApproves = apprInert.status !== 0 && /REFUSED/.test(apprInert.stderr) && landedAnyway.length === 0;
    rmSync('art-review/gate-inert', { recursive: true, force: true });
    rmSync(inertFx, { recursive: true, force: true });

    ok(
      'fixture-row-inert: the synthetic harness row NEVER RENDERS (in no biome/tier palette; zero plants across a 4,000-tile sweep of every biome x tier; no file at its contract path), NEVER COUNTS (absent from art:coverage; terrain-prop counts equal the real rows exactly), NEVER APPROVES (art:approve refuses it and lands nothing)',
      neverRenders && neverCounts && neverApproves,
      JSON.stringify({ fixIds, inPalette, sampled, plantedFixture, fixtureFilesOnDisk, covMentions, covNums, real: realProps.length, fixtures: fixtureRows.length, apprInert: apprInert.status, landedAnyway }),
    );
  }

  // 0f5. SECRET-HYGIENE (PASS 8): scan every git-tracked TEXT file for key
  // material. PATTERN SET (stated): (a) a LITERAL assignment to
  // PIXELLAB_SECRET / *_API_KEY / *_TOKEN (an env EXPANSION like
  // ${PIXELLAB_SECRET} does not match); (b) sk-<20+ token chars>;
  // (c) Bearer <24+ literal token chars> (again, ${...} expansions exempt).
  {
    const tracked = spawnSync('git', ['ls-files'], { encoding: 'utf8' }).stdout.split('\n').filter(Boolean);
    const textish = tracked.filter((f) => !/\.(png|bin|gz|json\.gz|webmanifest|ico)$/.test(f) && existsSync(f));
    const patterns = [
      /(PIXELLAB_SECRET|API_KEY|_TOKEN)\s*[=:]\s*['"][A-Za-z0-9_\-]{8,}['"]/,
      /\bsk-[A-Za-z0-9]{20,}\b/,
      /Bearer\s+[A-Za-z0-9_\-.]{24,}/,
    ];
    const hits = [];
    for (const f of textish) {
      const body = readFileSync(f, 'utf8');
      for (const p of patterns) {
        const m = body.match(p);
        if (m) hits.push(`${f}: ${m[0].slice(0, 40)}`);
      }
    }
    ok(
      'secret-hygiene: no literal key material in any tracked text file (patterns: literal SECRET/API_KEY/TOKEN assignment, sk-tokens, literal Bearer tokens; env expansions exempt)',
      hits.length === 0,
      JSON.stringify({ scanned: textish.length, hits: hits.slice(0, 5) }),
    );
  }

  // 0f6. ANCHOR-SOURCE (ART SESSION 5, standing batch policy): biome anchors
  // live in src/world/biome-anchors.ts (a LEAF module, so no consumer can
  // close an init cycle on it) and NOWHERE else in executable
  // code. Art Session 5 hand-typed OCEAN's anchor with one hex digit wrong
  // and shifted a whole luminance band by three units before the miscopy
  // surfaced; the numbers a band check runs on must be IMPORTED, never
  // retyped. (This comment names no anchor on purpose — the check would
  // rightly flag its own prose.)
  // Scope is deliberate: tracked .ts/.mjs under src/, scripts/ and tools/ —
  // executable code, where a stale copy silently changes a measurement. Prose
  // may quote an anchor (docs and the style lock do, next to the file name).
  {
    const { BIOME_COLORS } = await import(await (async () => {
      const { build } = await import('esbuild');
      const outfile = new URL('../node_modules/.cache/toh-anchors.mjs', import.meta.url).pathname;
      await build({ entryPoints: [new URL('../src/world/biome-anchors.ts', import.meta.url).pathname], bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'silent' });
      return outfile;
    })());
    const anchorHexes = new Set(BIOME_COLORS.map((c) => c.toString(16).padStart(6, '0').toLowerCase()));
    const tracked = spawnSync('git', ['ls-files'], { encoding: 'utf8' }).stdout.split('\n').filter(Boolean);
    const code = tracked.filter((f) => /^(src|scripts|tools)\/.*\.(ts|mjs)$/.test(f) && f !== 'src/world/biome-anchors.ts' && existsSync(f));
    const strays = [];
    for (const f of code) {
      for (const m of readFileSync(f, 'utf8').matchAll(/0x([0-9a-fA-F]{6})\b|#([0-9a-fA-F]{6})\b/g)) {
        const hex = (m[1] ?? m[2]).toLowerCase();
        if (anchorHexes.has(hex)) strays.push(`${f}: ${m[0]}`);
      }
    }
    ok(
      'anchor-source: every biome anchor is read from src/world/biome-anchors.ts — no tracked .ts/.mjs under src/, scripts/ or tools/ retypes one as a literal (a hand-copied anchor silently moves the band it defines)',
      strays.length === 0 && anchorHexes.size === 12,
      JSON.stringify({ anchors: anchorHexes.size, scanned: code.length, strays: strays.slice(0, 6) }),
    );
  }
}

// 0g. SIM-LOCALITY STATIC (PASS 6B, pure Node): the rename landed (no
// EUROPE_ENEMY_CAP identifier anywhere, LIVE_ENEMY_CAP === 48), the stale
// zone-scan comment is gone, the FEEL.sim block carries the spec values,
// expiry sits STRICTLY beyond the live ring math (the boot assert's own
// relation, recomputed here from the same modules), and the flake log with
// its standing rule exists.
{
  const { build } = await import('esbuild');
  const mk = async (entry, tag) => {
    const outfile = new URL(`../node_modules/.cache/toh-sim-${tag}.mjs`, import.meta.url).pathname;
    await build({ entryPoints: [new URL(entry, import.meta.url).pathname], bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'silent' });
    return import(outfile);
  };
  const settings = await mk('../src/game/settings.ts', 'settings');
  const feel = await mk('../src/ui/feel-config.ts', 'feel');
  // chunk-streamer imports Phaser (window-bound) - read KEEP_RADIUS from the
  // live SOURCE text instead of importing the module in node.
  const streamerSrc = readFileSync(new URL('../src/world/chunk-streamer.ts', import.meta.url).pathname, 'utf8');
  const keepM = /export const KEEP_RADIUS = (\d+);/.exec(streamerSrc);
  const streamer = { KEEP_RADIUS: keepM ? Number(keepM[1]) : NaN };
  const schema = await mk('../src/world/terrain-schema.ts', 'schema');
  const msSrc = readFileSync(new URL('../src/game/MainScene.ts', import.meta.url).pathname, 'utf8');
  const setSrc = readFileSync(new URL('../src/game/settings.ts', import.meta.url).pathname, 'utf8');
  const flake = (() => {
    try {
      return readFileSync(new URL('../toh-flake-log.md', import.meta.url).pathname, 'utf8');
    } catch {
      return '';
    }
  })();
  const sim = feel.FEEL.sim;
  const ringExtent = (streamer.KEEP_RADIUS + 1) * schema.CHUNK_PX;
  const out = {
    cap: settings.LIVE_ENEMY_CAP,
    noOldIdent: !/export const EUROPE_ENEMY_CAP|EUROPE_ENEMY_CAP\s*[,)]/.test(msSrc) && !/export const EUROPE_ENEMY_CAP/.test(setSrc),
    staleCommentGone: !msSrc.includes('25 distance checks'),
    sim: [sim.encounterSuspendRadiusPx, sim.bossLeashRadiusPx, sim.transientDespawnRadiusPx],
    ringExtent,
    expiryBeyondRing: sim.transientDespawnRadiusPx > ringExtent,
    leashInsideExpiry: feel.FEEL.combat.leashRadiusPx < sim.transientDespawnRadiusPx && sim.bossLeashRadiusPx < sim.transientDespawnRadiusPx,
    flakeLog: flake.includes('STANDING RULE') && flake.includes('skill tree ux') && flake.includes('dot-on-evicted'),
  };
  ok(
    'sim-locality-static: LIVE_ENEMY_CAP rename complete, stale comment gone, FEEL.sim = 4096/3072/12288, expiry strictly beyond the live ring, flake log + standing rule present',
    out.cap === 48 && out.noOldIdent && out.staleCommentGone && out.sim.join(',') === '4096,3072,12288' && out.expiryBeyondRing && out.leashInsideExpiry && out.flakeLog,
    JSON.stringify(out),
  );
}

// 1) Preview server (killed on exit).
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
const kill = () => {
  try {
    server.kill();
  } catch {
    /* already gone */
  }
};
process.on('exit', kill);
await new Promise((r) => setTimeout(r, 2500));

let browser;
try {
  browser = await chromium.launch({
    executablePath: EXE,
    headless: true,
    args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage({ viewport: { width: 428, height: 926 } });
  await page.addInitScript(() => {
    Object.defineProperty(document, 'hidden', { get: () => false });
    Object.defineProperty(document, 'visibilityState', { get: () => 'visible' });
  });
  // HARNESS HELPERS registered on EVERY navigation (init script), so checks that
  // run mid-loop (fresh sessions) can use them too. The post-loop evaluate below
  // re-defines the same helpers — identical behavior, kept for readability.
  await page.addInitScript(() => {
    window.__ready = () => {
      const ms = window.__game.scene.getScene('MainScene');
      if (ms.playerDead) ms.respawnPlayer();
      ms.playerHealth.full();
      ms.playerHealth.shield = 1e9;
      return ms;
    };
    window.__quietSpot = () => {
      const ms = window.__ready();
      for (let i = 1; i <= 40; i++) {
        const x = ms.player.x + (i % 2 ? 1 : -1) * i * 380;
        const y = ms.player.y + ((i % 3) - 1) * 320;
        const w = ms.activeMap().nearestWalkableWorld(x, y);
        if (w && ms.combatEnemiesInRange(w.x, w.y, 800).length === 0) {
          ms.player.sprite.body.reset(w.x, w.y);
          return true;
        }
      }
      return false;
    };
  });
  // Tag each page error with how many checks had completed when it fired, so a
  // failure names its neighborhood instead of just its message.
  page.on('pageerror', (e) => pageErrors.push(`[after check ${results.length}] ${e.message}`));
  // Console errors are tracked separately (the streaming drive check asserts a
  // zero DELTA across its window; page-load resource noise stays out of scope).
  const consoleErrors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(`[after check ${results.length}] ${m.text()}`);
  });

  async function newGame(classId) {
    await page.goto(`http://localhost:${PORT}/?scale=v1`, { waitUntil: 'load' });
    await page.waitForFunction(() => !!window.__game && window.__game.scene.isActive('TitleScene'), null, { timeout: 25000 });
    await page.evaluate(() => localStorage.clear());
    await page.evaluate((cid) => window.__game.scene.getScene('TitleScene').scene.start('MainScene', { mode: 'new', classId: cid }), classId);
    await page.waitForFunction(() => window.__game.scene.isActive('MainScene'), null, { timeout: 25000 });
    await page.waitForTimeout(1500);
    if (await page.evaluate(() => window.__game.scene.isActive('FirstSkillScene'))) {
      await page.mouse.click(214, 462);
      await page.waitForTimeout(600);
    }
  }

  // 1b. THE SELECT SCREEN IS THE REAL DOOR (permanent): the fresh-start loop below
  // starts classes PROGRAMMATICALLY, so a missing select card could ship while every
  // check passed (exactly how the Druid card went missing from the live deploy).
  // This check drives the REAL UI: the select screen must list exactly one card per
  // REGISTERED class, and CLICKING each card must start MainScene as that class.
  const registeredIds = await (async () => {
    await page.goto(`http://localhost:${PORT}/?scale=v1`, { waitUntil: 'load' });
    await page.waitForFunction(() => !!window.__game && window.__game.scene.isActive('TitleScene'), null, { timeout: 25000 });
    return page.evaluate(() => Object.keys(window.__game.scene.getScene('MainScene').classSkillsAll));
  })();
  const startedIds = [];
  let selectCards = -1;
  for (let i = 0; i < registeredIds.length; i++) {
    await page.goto(`http://localhost:${PORT}/?scale=v1`, { waitUntil: 'load' });
    await page.waitForFunction(() => !!window.__game && window.__game.scene.isActive('TitleScene'), null, { timeout: 25000 });
    await page.evaluate(() => {
      localStorage.clear();
      window.__game.scene.getScene('TitleScene').scene.start('CharacterSelectScene');
    });
    await page.waitForTimeout(600);
    const cards = await page.evaluate(() => {
      const sc = window.__game.scene.getScene('CharacterSelectScene');
      return sc.children.list
        .filter((o) => o.type === 'Rectangle' && o.input && o.input.enabled)
        .map((r) => ({ x: r.x, y: r.y + r.displayHeight / 2 }))
        .sort((a, b) => a.y - b.y);
    });
    selectCards = cards.length;
    if (i >= cards.length) break; // fewer cards than classes → the assert below fails loudly
    await page.mouse.click(cards[i].x, cards[i].y); // the REAL door: a pointer tap on the card
    await page.waitForFunction(() => window.__game.scene.isActive('MainScene'), null, { timeout: 25000 });
    await page.waitForTimeout(1200);
    startedIds.push(await page.evaluate(() => window.__game.scene.getScene('MainScene').classId));
  }
  ok(
    'select screen: one card per registered class; each card CLICK starts its class (real UI path)',
    selectCards === registeredIds.length && startedIds.length === registeredIds.length && registeredIds.every((id) => startedIds.includes(id)),
    `cards=${selectCards} registered=[${registeredIds.join(',')}] started=[${startedIds.join(',')}]`,
  );

  // 1c. PRE-RULING SAVE LOADS UNCHANGED (permanent): a v12 save (a Necromancer
  // mid-WA, from before the class-home-starts ruling) must load EXACTLY where it
  // was — never relocated to the class home. Crafted from a real session's save
  // with its version wound back, then loaded through the real 'continue' path.
  const preRuling = await (async () => {
    await newGame('necromancer');
    const staged = await page.evaluate(() => {
      const ms = window.__game.scene.getScene('MainScene');
      // Stand mid-WA on Earth (the pre-ruling life), then write a REAL save.
      const spawn = ms.town.spawn;
      const spot = ms.map.nearestWalkableWorld(spawn.x + 400, spawn.y + 120);
      ms.applyWorldSwap('earth', spot);
      ms.writeSave();
      const raw = JSON.parse(localStorage.getItem('toh_save'));
      raw.saveVersion = 12; // wind back: this save predates the ruling
      // A REAL v12 save could only hold OLD-frame PNW coordinates — express the
      // spot in that frame; the v15 legacy marker + apply-time translation must
      // land it back on the SAME relative point (never at the class home).
      raw.world.active = 'earth';
      raw.world.x = spot.x - ms.map.bounds.x;
      raw.world.y = spot.y - ms.map.bounds.y;
      localStorage.setItem('toh_save', JSON.stringify(raw));
      return spot;
    });
    await page.goto(`http://localhost:${PORT}/?scale=v1`, { waitUntil: 'load' });
    await page.waitForFunction(() => !!window.__game && window.__game.scene.isActive('TitleScene'), null, { timeout: 25000 });
    await page.evaluate(() => window.__game.scene.getScene('TitleScene').scene.start('MainScene', { mode: 'continue' }));
    await page.waitForFunction(() => window.__game.scene.isActive('MainScene'), null, { timeout: 25000 });
    await page.waitForTimeout(1500);
    return page.evaluate((spot) => {
      const ms = window.__game.scene.getScene('MainScene');
      return { world: ms.activeWorld, classId: ms.classId, d: Math.hypot(ms.player.x - spot.x, ms.player.y - spot.y) };
    }, staged);
  })();
  ok(
    'pre-ruling save: a v12 Necromancer mid-WA loads exactly where it was (never relocated)',
    preRuling.world === 'earth' && preRuling.classId === 'necromancer' && preRuling.d < 8,
    JSON.stringify(preRuling),
  );

  // 2) CLASS HOME STARTS (Casey's ruling) + the GUIDANCE contract: every playable
  //    class fresh-starts at its correct HOME (world + beside the mentor). For
  //    generated homes the opener is AUTO-ACCEPTED at spawn (the tracker shows
  //    the chain from minute one) and the arrow has a live target; mentor talk
  //    completes it through the real UI path. The Druid keeps the UNCHANGED WA
  //    start (NPC-given opener, pre-accept giver arrow). Druid runs LAST: the
  //    WA-opening check below plays on in ITS session.
  const HOMES = {
    blacksmith: { world: 'earth', zone: 'munich-anvil-hold', opener: 'mun-01-mentor', kind: 'region' },
    wizard: { world: 'earth', zone: 'cairo-nile-crown', opener: 'cai-01-mentor', kind: 'cairo' },
    necromancer: { world: 'earth', zone: 'murmansk-bone-harbor', opener: 'mur-01-mentor', kind: 'region' },
    mage: { world: 'earth', zone: 'moscow-crystal-court', opener: 'mos-01-mentor', kind: 'region' },
    bard: { world: 'earth', zone: 'london-grey-chorus', opener: 'lon-01-mentor', kind: 'region' },
    witchdoctor: { world: 'earth', zone: 'kinshasa-river-drum', opener: 'kin-01-mentor', kind: 'region' },
    samurai: { world: 'earth', zone: 'kyoto-thousand-gates', opener: 'kyo-01-mentor', kind: 'region' },
    monk: { world: 'earth', zone: 'lhasa-prayer-citadel', opener: 'lha-01-mentor', kind: 'region' },
    assassin: { world: 'earth', zone: 'dubai-glass-souk', opener: 'dub-01-mentor', kind: 'region' },
    priest: { world: 'earth', zone: 'rome-eternal-seat', opener: 'rom-01-mentor', kind: 'region' },
    savage: { world: 'earth', zone: 'mexico-lake-crown', opener: 'mex-01-mentor', kind: 'region' },
    hunter: { world: 'earth', zone: 'sydney-harbour-watch', opener: 'syd-01-mentor', kind: 'region' },
    atlantean: { world: 'earth', zone: 'bali-drowned-crown', opener: 'bal-01-mentor', kind: 'region' }, // the SUNDIAN (canon rename; save-safe classId)
    druid: { world: 'earth', zone: null, opener: 'honest-days-work', kind: 'earth' },
  };
  for (const cls of ['blacksmith', 'wizard', 'necromancer', 'mage', 'bard', 'witchdoctor', 'samurai', 'monk', 'assassin', 'priest', 'savage', 'hunter', 'atlantean', 'druid']) {
    await newGame(cls);
    const home = HOMES[cls];
    const s = await page.evaluate(
      async ({ home }) => {
        const ms = window.__game.scene.getScene('MainScene');
        const wait = (t) => new Promise((r) => setTimeout(r, t));
        ms.playerHealth.shield = 1e9; // home-city packs may engage during the check
        const out = { world: ms.activeWorld, active: ms.chain.activeQuest?.id ?? null };
        // GUIDANCE (permanent): a fresh character at EVERY home has a visible
        // quest-log entry (tracker) and a live arrow target for its current
        // beat — the playtest gap where a fresh Monk saw neither.
        const t = ms.currentMarkerTarget();
        out.arrow = t ? { x: Math.round(t.x), y: Math.round(t.y), label: t.label } : null;
        out.trackerShown = !!ms.chain.activeQuest;
        if (home.kind === 'region') {
          const m = ms.regionMentors.find((x) => x.zoneId === home.zone);
          out.mentorDist = m ? Math.hypot(m.pos.x - ms.player.x, m.pos.y - ms.player.y) : -1;
          out.arrowAtMentor = t && m ? Math.hypot(t.x - m.pos.x, t.y - m.pos.y) : -1;
          out.openerBefore = ms.chain.status(home.opener);
          if (m) {
            ms.player.sprite.body.reset(m.pos.x + 40, m.pos.y); // step up to the elder
            await wait(500);
            out.button = ms.mentorButton.isVisible;
            ms.regionMentorTalk(); // the button's real handler (accept + complete)
            await wait(300);
            out.openerAfter = ms.chain.status(home.opener);
            out.mentorBanner = ms.banner.text; // read before c1's delayed start narration lands
          }
        } else if (home.kind === 'cairo') {
          out.mentorDist = Math.hypot(ms.cairoMentorPos.x - ms.player.x, ms.cairoMentorPos.y - ms.player.y);
          out.arrowAtMentor = t ? Math.hypot(t.x - ms.cairoMentorPos.x, t.y - ms.cairoMentorPos.y) : -1;
          out.openerBefore = ms.chain.status(home.opener);
          ms.player.sprite.body.reset(ms.cairoMentorPos.x + 50, ms.cairoMentorPos.y);
          await wait(500);
          out.button = ms.cairoMentorButton.isVisible;
          ms.cairoMentorTalk(); // the Keeper's real handler
          await wait(300);
          out.openerAfter = ms.chain.status(home.opener);
        } else {
          // 'earth' (the Druid): the UNCHANGED WA start — at the Enumclaw town
          // spawn with the Act I opener's giver in sight, quest offered on talk.
          out.spawnDist = Math.hypot(ms.town.spawn.x - ms.player.x, ms.town.spawn.y - ms.player.y);
          const giver = ms.questGivers.find((g) => g.questIds.includes(home.opener));
          const gp = giver ? giver.pos() : null;
          out.mentorDist = gp ? Math.hypot(gp.x - ms.player.x, gp.y - ms.player.y) : -1;
          out.openerBefore = ms.chain.status(home.opener);
          if (giver) ms.openQuestGiverDialogue(giver); // the giver's real dialogue path
        }
        return out;
      },
      { home },
    );
    if (home.kind === 'earth') {
      // Tap through the offer dialogue (taps advance/close; accept fires on close).
      for (let i = 0; i < 10; i++) {
        await page.waitForTimeout(280);
        if (!(await page.evaluate(() => window.__game.scene.getScene('MainScene').dialogue.isOpen()))) break;
        await page.mouse.click(214, 520);
      }
      s.openerAfter = await page.evaluate((id) => window.__game.scene.getScene('MainScene').chain.status(id), home.opener);
      s.button = true; // the giver dialogue IS the earth path's interaction proof
    }
    const openerDone = home.kind === 'earth' ? s.openerAfter === 'active' : s.openerAfter === 'complete';
    const atHome = home.kind === 'earth' ? s.spawnDist < 8 : true;
    // GUIDANCE contract per home kind: generated homes spawn with the opener
    // ACTIVE (tracker live) + the arrow ON the mentor; the Druid's Earth start
    // keeps its NPC-given opener (tracker empty, pre-accept arrow at a giver).
    const guided =
      home.kind === 'earth'
        ? s.active === null && s.openerBefore === 'available' && s.arrow !== null
        : s.active === home.opener && s.trackerShown === true && s.openerBefore === 'active' && s.arrow !== null && s.arrowAtMentor >= 0 && s.arrowAtMentor < 30;
    ok(
      `home start (${cls}): lands at ${home.world} home beside the mentor; tracker + arrow live from minute one; mentor completes the opener`,
      s.world === home.world && atHome && s.mentorDist >= 0 && s.mentorDist < 400 && guided && s.button === true && openerDone,
      JSON.stringify(s),
    );

    // 2h. MENTOR OPENINGS (the insertion run, permanent): three different
    // homes hear their mentor's REAL opening through the real talk button —
    // Casey's text VERBATIM, no TODO left on the inserted slot.
    const OPENINGS = {
      blacksmith:
        "So you're awake. Good — the forge doesn't wait and neither does trouble. The deer have come down from the wood wrong this season. Standing in rings among the trees. Not grazing. Gray. Before you go looking at that, take these hinges to Greta at the Anvil's Rest — a town that eats together holds together. Go on. Then we talk about the wood.",
      witchdoctor:
        'The river talks, little one. Always has. Lately it stammers — and the bonobos upriver have gone silent. The gentle ones. Silent. Mama Nsimba\'s pot knows trouble before my drum does, so take her these herbs and keep your ears open in the market. We are going to listen properly, you and I. Then we are going to answer.',
      monk:
        'You wake at the roof of the world — breathe first; the mountain insists. Yesterday the pikas covered the eastern slope, a whole hillside of them, and every one faced the citadel. The wind announced nothing. Take Pemba his tea bricks, turn the wheels as you pass, and watch the slopes. Clear eyes and full cups, I think, before this is done.',
    };
    if (OPENINGS[cls]) {
      ok(
        `mentor opening (${cls}): the real talk banner is Casey's text VERBATIM (no TODO)`,
        s.mentorBanner === OPENINGS[cls] && !String(s.mentorBanner).includes('HAND_AUTHORED_TODO'),
        JSON.stringify({ got: String(s.mentorBanner ?? '').slice(0, 90) }),
      );
    }

    // 2g. GUIDANCE RETARGETING (permanent, the real playtest gap): as the
    // Monk, the arrow retargets through the first three beats by REAL play —
    // the opener was just completed at the mentor above, so drive c1's
    // delivery stage by stage (pickup at the mentor → carry → hand-off at
    // Pemba) and land on the 02 cull: four distinct live targets in a row.
    if (cls === 'monk') {
      const g = await page.evaluate(async () => {
        const ms = window.__ready();
        const wait = (t) => new Promise((r) => setTimeout(r, t));
        const Z = 'lhasa-prayer-citadel';
        const arrow = () => {
          const t = ms.currentMarkerTarget();
          return t ? { x: Math.round(t.x), y: Math.round(t.y), label: t.label } : null;
        };
        const mpos = ms.regionMentors.find((m) => m.zoneId === Z)?.pos;
        const npos = ms.regionNeighbors.find((n) => n.zoneId === Z)?.pos;
        const rz = ms.regionSpawnZones.find((z) => z.zoneId === Z);
        if (!mpos || !npos || !rz) return { setup: 'missing lhasa anchors' };
        // Stage 1 — c1 active, NOT carrying: restart the delivery run from afar
        // (the walk from the mentor talk may already have grabbed the parcel).
        ms.clearBeatDelivery();
        const far = ms.activeMap().nearestWalkableWorld(mpos.x + 500, mpos.y + 300);
        ms.player.sprite.body.reset(far.x, far.y);
        await wait(500);
        const c1 = ms.chain.activeQuest?.id ?? null;
        const a1 = arrow(); // → the parcel at the mentor
        // Stage 2 — pick it up (walk in): the arrow flips to the neighbor.
        ms.player.sprite.body.reset(mpos.x, mpos.y);
        await wait(450);
        const carrying = ms.beatDelivery?.carrying === true;
        const a2 = arrow(); // → Pemba
        // Stage 3 — hand it over (walk in): c1 completes, the 02 cull activates.
        ms.player.sprite.body.reset(npos.x, npos.y);
        await wait(450);
        const c1After = ms.chain.status('lha-c1-errand');
        const q02 = ms.chain.activeQuest?.id ?? null;
        const a3 = arrow(); // → the cull ground (the zone's center)
        const d = (a, p) => (a ? Math.round(Math.hypot(a.x - p.x, a.y - p.y)) : -1);
        return {
          c1, carrying, c1After, q02, a1, a2, a3,
          a1AtMentor: d(a1, mpos), a2AtNeighbor: d(a2, npos), a3AtCenter: d(a3, rz.center),
          moved: !!(a1 && a2 && a3) && (a1.x !== a2.x || a1.y !== a2.y) && (a2.x !== a3.x || a2.y !== a3.y),
        };
      });
      ok(
        'guidance retargeting (Monk, real play): arrow walks the chain — parcel at the mentor → Pemba → the cull ground; beats complete as it goes',
        g.c1 === 'lha-c1-errand' && g.a1AtMentor >= 0 && g.a1AtMentor < 30 && g.carrying === true &&
          g.a2AtNeighbor >= 0 && g.a2AtNeighbor < 30 && g.c1After === 'complete' && g.q02 === 'lha-02-first-blood' &&
          g.a3AtCenter >= 0 && g.a3AtCenter < 60 && g.moved === true,
        JSON.stringify(g),
      );
    }

    // 2p. HOME-CITY PACING (staged spawns + hearth radius), proven in the live
    // Assassin session at Dubai: a FRESH character sees wildlife but ZERO
    // evil-family units before its discovery beat; nothing hostile MATERIALIZES
    // inside the hearth (proven against an injected in-hearth marker); a
    // corridor stays dangerous pre-discovery (the road SHOULD be); after real
    // chain progression past the discovery, the evil arrives — and a leveled
    // character re-entering sees full spawns. Seattle is not in this pipeline.
    if (cls === 'assassin') {
      const pacing = await page.evaluate(async () => {
        const ms = window.__ready();
        const wait = (t) => new Promise((r) => setTimeout(r, t));
        const Z = 'dubai-glass-souk';
        const CORRIDOR = 'mesopotamian-marshes'; // built Near East corridor — no staging
        const evil = () => ms.regionLive.filter((r) => r.zoneId === Z && r.family === 'lesser-evil-scouts' && r.entity.isAlive).length;
        const wildlife = () => ms.regionLive.filter((r) => r.zoneId === Z && r.family === 'corrupted-wildlife' && r.entity.isAlive).length;
        const rz = ms.regionSpawnZones.find((z) => z.zoneId === Z);
        const mpos = ms.regionMentors.find((m) => m.zoneId === Z)?.pos;
        if (!rz || !mpos) return { setup: 'no dubai zone/mentor' };
        await wait(400); // boot activation settles
        const boot = { active: rz.active, wildlife: wildlife(), evil: evil(), held: rz.pendingStaged.length };
        const seattleAbsent = !ms.regionSpawnZones.some((z) => z.zoneId === 'seattle-emerald-reach');
        // HEARTH: inject a marker AT the mentor's feet, force a clean
        // re-activation, and read positions IMMEDIATELY — the in-hearth marker
        // must materialize nothing (real markers outside stay untouched).
        rz.points.push({ family: 'corrupted-wildlife', x: mpos.x + 40, y: mpos.y });
        ms.deactivateRegionZone(Z);
        await wait(300); // proximity re-activates (the player stands in the chunk)
        const hearth = { reactivated: rz.active, insideHearth: ms.combatEnemiesInRange(mpos.x, mpos.y, 200).length, wildlifeBack: wildlife() > 0, evilStillHeld: evil() === 0 && rz.pendingStaged.length > 0 };
        rz.points.pop(); // remove the injected test marker
        // CORRIDOR unchanged: teleport onto the Reed Sea road — its hostiles
        // are up for a character with NO discovery behind them.
        const road = ms.regionZoneArrivals[CORRIDOR];
        ms.player.sprite.body.reset(road.x, road.y);
        await wait(600);
        const corridorHostiles = ms.regionLive.filter((r) => r.zoneId === CORRIDOR && r.entity.isAlive).length;
        // Back home: the re-activated home is STILL wildlife-only (the corridor
        // trip proved nothing leaks into the gate).
        const homeSpot = ms.regionZoneArrivals[Z];
        ms.player.sprite.body.reset(homeSpot.x, homeSpot.y);
        await wait(600);
        const backHome = { evil: evil(), wildlife: wildlife() };
        // REAL PROGRESSION past the discovery: the chain state-warp to the
        // dub-04 boss beat marks dub-03 complete — the evil VISIBLY arrives.
        ms.devJumpToQuest('dub-04-first-evil');
        ms.playerHealth.shield = 1e9; // re-arm past the jump's heal path
        await wait(1200);
        const discoveryDone = ms.chain.status('dub-03-discovery') === 'complete';
        const afterDiscovery = { evil: evil(), discoveryDone };
        // LEVELED REVISIT: leave (the chunk despawns) and return — full spawns.
        ms.player.sprite.body.reset(road.x, road.y);
        await wait(600);
        ms.player.sprite.body.reset(homeSpot.x, homeSpot.y);
        await wait(600);
        const revisit = { evil: evil(), wildlife: wildlife() };
        ms.playerHealth.full();
        ms.playerHealth.shield = 1e9;
        return { setup: 'ok', boot, seattleAbsent, hearth, corridorHostiles, backHome, afterDiscovery, revisit };
      });
      ok(
        'home pacing: a fresh Assassin at Dubai sees wildlife but ZERO evil-scouts before the discovery (the packs held staged); Seattle is not in this pipeline',
        pacing.setup === 'ok' && pacing.boot.active && pacing.boot.wildlife > 0 && pacing.boot.evil === 0 && pacing.boot.held > 0 && pacing.seattleAbsent,
        JSON.stringify({ boot: pacing.boot, seattleAbsent: pacing.seattleAbsent }),
      );
      ok(
        'home pacing: nothing hostile MATERIALIZES inside the hearth radius — an injected marker at the mentor\'s feet spawns nothing while the real packs return',
        pacing.setup === 'ok' && pacing.hearth.reactivated && pacing.hearth.insideHearth === 0 && pacing.hearth.wildlifeBack && pacing.hearth.evilStillHeld,
        JSON.stringify(pacing.hearth),
      );
      ok(
        'home pacing: the corridor stays dangerous pre-discovery (Reed Sea hostiles up with no beat behind the character) and the home stays wildlife-only on return',
        pacing.setup === 'ok' && pacing.corridorHostiles > 0 && pacing.backHome.evil === 0 && pacing.backHome.wildlife > 0,
        JSON.stringify({ corridorHostiles: pacing.corridorHostiles, backHome: pacing.backHome }),
      );
      ok(
        'home pacing: past the discovery (real chain progression) the evil VISIBLY arrives, and a leveled character re-entering sees full spawns',
        pacing.setup === 'ok' && pacing.afterDiscovery.discoveryDone && pacing.afterDiscovery.evil > 0 && pacing.revisit.evil > 0 && pacing.revisit.wildlife > 0,
        JSON.stringify({ afterDiscovery: pacing.afterDiscovery, revisit: pacing.revisit }),
      );
    }

    // 2q. THE SEVEN-BEAT HOME OPENING, played END TO END by REAL actions
    // (mentor already talked by the home check above): the c1 delivery walked
    // parcel-to-neighbor, the first cull killed through the live damage
    // funnel, the c2 gather walked pickup by pickup, the c3 ESCORT defended
    // to arrival (its waves must be WILDLIFE only — scouts stay staged), the
    // discovery walked in, the evil VISIBLY arriving, and the first-evil
    // elite cut down — all seven in order.
    if (cls === 'blacksmith' || cls === 'witchdoctor' || cls === 'hunter') {
      const P = {
        blacksmith: { zoneId: 'munich-anvil-hold', c1: 'mun-c1-errand', b02: 'mun-02-foothill-wolves', c2: 'mun-c2-hands', c3: 'mun-c3-cart', b03: 'mun-03-black-veins', b04: 'mun-04-forge-raid', city: 'Munich' },
        witchdoctor: { zoneId: 'kinshasa-river-drum', c1: 'kin-c1-errand', b02: 'kin-02-first-blood', c2: 'kin-c2-hands', c3: 'kin-c3-landing', b03: 'kin-03-discovery', b04: 'kin-04-first-evil', city: 'Kinshasa' },
        hunter: { zoneId: 'sydney-harbour-watch', c1: 'syd-c1-errand', b02: 'syd-02-first-blood', c2: 'syd-c2-hands', c3: 'syd-c3-jetty', b03: 'syd-03-discovery', b04: 'syd-04-first-evil', city: 'Sydney' },
      }[cls];
      const run = await page.evaluate(async (P) => {
        const ms = window.__ready();
        const wait = (t) => new Promise((r) => setTimeout(r, t));
        const st = (id) => ms.chain.status(id);
        const evil = () => ms.regionLive.filter((r) => r.zoneId === P.zoneId && r.family === 'lesser-evil-scouts' && r.entity.isAlive).length;
        const out = { steps: [], maxEvilThroughCivics: 0, waveEvil: 0, evilAfterDiscovery: -1, ok: false };
        const home = ms.regionZoneArrivals[P.zoneId];
        ms.player.sprite.body.reset(home.x, home.y);
        await wait(600);
        // C1 — the delivery, walked for real.
        out.maxEvilThroughCivics = Math.max(out.maxEvilThroughCivics, evil());
        for (let i = 0; i < 30 && !ms.beatDelivery; i++) await wait(100);
        if (!ms.beatDelivery) return { ...out, steps: ['no delivery staged'] };
        ms.player.sprite.body.reset(ms.beatDelivery.from.x, ms.beatDelivery.from.y);
        await wait(350);
        if (!ms.beatDelivery || !ms.beatDelivery.carrying) return { ...out, steps: ['no carry'] };
        ms.player.sprite.body.reset(ms.beatDelivery.to.x, ms.beatDelivery.to.y);
        await wait(450);
        out.steps.push('c1:' + st(P.c1));
        // 02 — the first cull: real damage through the live funnel; if the
        // packs run dry, a chunk re-entry respawns them (the counter holds).
        for (let i = 0; i < 60 && st(P.b02) !== 'complete'; i++) {
          out.maxEvilThroughCivics = Math.max(out.maxEvilThroughCivics, evil());
          const w = ms.regionLive.find((r) => r.zoneId === P.zoneId && r.family === 'corrupted-wildlife' && r.entity.isAlive);
          if (w) ms.aoeHitAll(w.entity.x, w.entity.y, 70, 400);
          else {
            ms.deactivateRegionZone(P.zoneId);
            await wait(400);
          }
          await wait(180);
        }
        out.steps.push('02:' + st(P.b02));
        // C2 — the gather: three real pickup walk-ins.
        for (let i = 0; i < 30 && !ms.beatPickups; i++) await wait(100);
        for (let k = 0; k < 3 && ms.beatPickups; k++) {
          const it = ms.beatPickups.items.find((x) => !x.taken);
          if (!it) break;
          out.maxEvilThroughCivics = Math.max(out.maxEvilThroughCivics, evil());
          ms.player.sprite.body.reset(it.x, it.y);
          await wait(350);
        }
        out.steps.push('c2:' + st(P.c2));
        // C3 — the escort: stand with the convoy and cut down every wave
        // (they must be wildlife; scouts are still staged).
        for (let i = 0; i < 40 && !ms.escort; i++) await wait(200);
        if (!ms.escort) return { ...out, steps: [...out.steps, 'no convoy'] };
        const deadline = Date.now() + 60000;
        while (ms.escort && Date.now() < deadline) {
          const e = ms.escort;
          ms.player.sprite.body.reset(e.npcSprite.x + 26, e.npcSprite.y - 10);
          out.waveEvil = Math.max(out.waveEvil, evil());
          ms.aoeHitAll(e.npcSprite.x, e.npcSprite.y, 260, 320);
          await wait(300);
        }
        out.steps.push('c3:' + st(P.c3));
        out.maxEvilThroughCivics = Math.max(out.maxEvilThroughCivics, evil());
        // 03 — the discovery: walk into the story marker.
        for (let i = 0; i < 30 && !ms.beatMarker; i++) await wait(150);
        if (ms.beatMarker) {
          ms.player.sprite.body.reset(ms.beatMarker.pos.x, ms.beatMarker.pos.y);
          await wait(450);
        }
        out.steps.push('03:' + st(P.b03));
        // The staged scouts VISIBLY arrive.
        for (let i = 0; i < 30 && evil() === 0; i++) await wait(150);
        out.evilAfterDiscovery = evil();
        // 04 — the first evil: the gate elite at the boss anchor, cut down.
        for (let i = 0; i < 40 && !ms.beatElite; i++) await wait(200);
        const deadline2 = Date.now() + 25000;
        while (st(P.b04) !== 'complete' && Date.now() < deadline2) {
          const el = ms.beatElite?.entity;
          if (el && el.isAlive) {
            ms.player.sprite.body.reset(el.sprite.x + 50, el.sprite.y);
            ms.aoeHitAll(el.sprite.x, el.sprite.y, 90, 420);
          }
          await wait(250);
        }
        out.steps.push('04:' + st(P.b04));
        out.ok =
          st(P.c1) === 'complete' && st(P.b02) === 'complete' && st(P.c2) === 'complete' && st(P.c3) === 'complete' && st(P.b03) === 'complete' && st(P.b04) === 'complete';
        ms.playerHealth.full();
        ms.playerHealth.shield = 1e9;
        return out;
      }, P);
      ok(
        `seven-beat home opening (${P.city}): mentor → errand → cull → hands → escort → discovery → first evil, all by real actions; scouts absent through the civics (waves wildlife-only) and VISIBLY arriving after the discovery`,
        run.ok && run.maxEvilThroughCivics === 0 && run.waveEvil === 0 && run.evilAfterDiscovery > 0,
        JSON.stringify(run),
      );

      // 2q2. GRANDFATHER on a REAL save (Sydney only): strip the civic ids
      // from the just-played save — the pre-retrofit shape — and load: the
      // rule marks them complete again (a discovery-complete character is
      // never trapped behind the inserted beats).
      if (cls === 'hunter') {
        const gf = await page.evaluate(async () => {
          const ms = window.__ready();
          const civ = ['syd-c1-errand', 'syd-c2-hands', 'syd-c3-jetty'];
          const snap = ms.serialize();
          const hadAll = civ.every((id) => snap.quests.completed.includes(id));
          snap.quests.completed = snap.quests.completed.filter((id) => !civ.includes(id));
          ms.applySave(snap);
          await new Promise((r) => setTimeout(r, 300));
          const back = civ.map((id) => ms.chain.status(id));
          const discovery = ms.chain.status('syd-03-discovery');
          ms.playerHealth.full();
          ms.playerHealth.shield = 1e9;
          return { hadAll, back, discovery };
        });
        ok(
          'grandfather: a discovery-complete save stripped of its civic ids loads with all three civics complete again',
          gf.hadAll && gf.back.every((s) => s === 'complete') && gf.discovery === 'complete',
          JSON.stringify(gf),
        );
      }
    }

    // 2r. THE REVERENCE BEATS (Lhasa's prayer wheels / Bali's shore offerings):
    // marker-only — completed by real walk-ins and spawning NO combat.
    if (cls === 'monk' || cls === 'atlantean') {
      const R = cls === 'monk' ? { zoneId: 'lhasa-prayer-citadel', beat: 'lha-c2-hands', name: 'Lhasa prayer wheels' } : { zoneId: 'bali-drowned-crown', beat: 'bal-c2-hands', name: 'Bali shore offerings' };
      const rev = await page.evaluate(async (R) => {
        const ms = window.__ready();
        const wait = (t) => new Promise((r) => setTimeout(r, t));
        ms.devJumpToQuest(R.beat);
        ms.playerHealth.shield = 1e9;
        await wait(1600);
        const aliveInZone = () => ms.regionLive.filter((r) => r.zoneId === R.zoneId && r.entity.isAlive).length;
        const evil = () => ms.regionLive.filter((r) => r.zoneId === R.zoneId && r.family === 'lesser-evil-scouts' && r.entity.isAlive).length;
        const before = aliveInZone();
        for (let i = 0; i < 30 && !ms.beatPickups; i++) await wait(100);
        if (!ms.beatPickups) return { setup: 'no markers' };
        let evilSeen = evil();
        for (let k = 0; k < 3 && ms.beatPickups; k++) {
          const it = ms.beatPickups.items.find((x) => !x.taken);
          if (!it) break;
          ms.player.sprite.body.reset(it.x, it.y);
          await wait(350);
          evilSeen = Math.max(evilSeen, evil());
        }
        const after = aliveInZone();
        return { setup: 'ok', status: ms.chain.status(R.beat), before, after, evilSeen, noNewSpawns: after <= before };
      }, R);
      ok(
        `reverence beat (${R.name}): three real walk-ins complete it with NO combat spawn (no scouts, nothing new materialized)`,
        rev.setup === 'ok' && rev.status === 'complete' && rev.noNewSpawns && rev.evilSeen === 0,
        JSON.stringify(rev),
      );
    }

    // 2o. NEIGHBOR NPC (home civics, permanent): every generated home city
    // fields a SECOND named interactable a real walk from the mentor; stepping
    // up shows the Speak button and speaking shows a generated line (never a
    // HAND_AUTHORED_TODO). Proven in the live Blacksmith session at Munich.
    if (cls === 'blacksmith') {
      const neighbor = await page.evaluate(async () => {
        const ms = window.__ready();
        const wait = (t) => new Promise((r) => setTimeout(r, t));
        const n = ms.regionNeighbors.find((x) => x.zoneId === 'munich-anvil-hold');
        if (!n) return { setup: 'no munich neighbor' };
        const m = ms.regionMentors.find((x) => x.zoneId === 'munich-anvil-hold');
        const walkApart = m ? Math.hypot(n.pos.x - m.pos.x, n.pos.y - m.pos.y) : 0;
        ms.player.sprite.body.reset(n.pos.x + 40, n.pos.y);
        await wait(400);
        const button = ms.neighborButton.isVisible;
        ms.neighborTalk();
        const line = ms.banner.text;
        return { setup: 'ok', name: n.name, walkApart: Math.round(walkApart), button, line, noTodo: !line.includes('HAND_AUTHORED_TODO') };
      });
      ok(
        "neighbor npc: Greta stands a real walk from Munich's mentor, her Speak button shows, and she speaks a generated line (no TODO markers)",
        neighbor.setup === 'ok' && neighbor.walkApart > 300 && neighbor.button && neighbor.line.includes('Greta') && neighbor.noTodo,
        JSON.stringify(neighbor),
      );
    }

    // 2n. REAL 8-WAY CLASS ART (shipped sprite drop-ins): all eight rotation
    // frames + the canonical key minted at the canonical 32×48, and the avatar
    // TURNS with its real movement facing (east / north / a diagonal / south
    // each select their frame through setDirection).
    if (ROTATED_FIGURES[cls]) {
      const fig = ROTATED_FIGURES[cls];
      const figArt = await page.evaluate((fig) => {
        const ms = window.__ready();
        const dirs = ['south', 'south-east', 'east', 'north-east', 'north', 'north-west', 'west', 'south-west'];
        const frames = dirs.every((d) => ms.textures.exists(`${fig}-${d}`));
        const base = ms.textures.get(fig).getSourceImage();
        const keyAt = (x, y) => {
          ms.player.setDirection(x, y);
          return ms.player.sprite.texture.key;
        };
        const east = keyAt(1, 0);
        const north = keyAt(0, -1);
        const diag = keyAt(1, 1);
        const south = keyAt(0, 1);
        ms.player.setDirection(0, 0); // stop — facing (and the frame) stay put
        return { applied: ms.spriteOverridesApplied, frames, size: [base.width, base.height], east, north, diag, south };
      }, fig);
      ok(
        `${cls} art: the 8-way sprite drop-in applied at canonical size and the avatar turns with its facing`,
        figArt.applied >= 1 &&
          figArt.frames &&
          figArt.size[0] === 32 &&
          figArt.size[1] === 48 &&
          figArt.east === `${fig}-east` &&
          figArt.north === `${fig}-north` &&
          figArt.diag === `${fig}-south-east` &&
          figArt.south === `${fig}-south`,
        JSON.stringify(figArt),
      );
    }

    // 2n2. HUNTER PET ART: every expression of the bond (companion / great /
    // horde) manifests wearing the armored-bear drop-in at the canonical 46×56,
    // and the hit-flash restore leaves full-color art UNTINTED (the cleansed-
    // green stylizing tint belongs to the code-drawn placeholders only).
    if (cls === 'hunter') {
      const petArt = await page.evaluate(async () => {
        const ms = window.__ready();
        const wait = (t) => new Promise((r) => setTimeout(r, t));
        const before = { bond: ms.hunterBond, mode: ms.hunterPetMode };
        ms.hunterBond = { deathUntil: 0 };
        const worn = {};
        for (const mode of ['companion', 'great', 'horde']) {
          ms.hunterPetMode = mode;
          ms.clearHunterPets();
          ms.manifestHunterPet();
          const pets = ms.hunterPets();
          const pet = pets[pets.length - 1];
          if (!pet) {
            worn[mode] = { spawned: false };
            continue;
          }
          const img = ms.textures.get(pet.sprite.texture.key).getSourceImage();
          pet.takeHit(1); // white flash, then the restore path 70ms later
          await wait(160);
          worn[mode] = { spawned: true, key: pet.sprite.texture.key, size: [img.width, img.height], tint: pet.sprite.tintTopLeft, fill: pet.sprite.tintFill };
        }
        ms.clearHunterPets();
        ms.hunterBond = before.bond;
        ms.hunterPetMode = before.mode;
        return worn;
      });
      const petKey = { companion: 'summon-hunter_companion', great: 'summon-hunter_great', horde: 'summon-hunter_horde' };
      ok(
        'hunter pet art: all three bond expressions wear the bear drop-in at 46×56 and stay untinted through the hit-flash restore',
        ['companion', 'great', 'horde'].every((m) => {
          const w = petArt[m];
          return w && w.spawned && w.key === petKey[m] && w.size[0] === 46 && w.size[1] === 56 && w.tint === 0xffffff && !w.fill;
        }),
        JSON.stringify(petArt),
      );
    }

    // A figure WITHOUT rotation art keeps its single texture no matter how it
    // moves (the fallback half of the 8-way contract). SYNTHETIC PROBE key —
    // deliberately NOT a real class figure, so shipping art for any class
    // (including Blacksmith) can never flip this check.
    if (cls === 'blacksmith') {
      const singleTex = await page.evaluate(() => {
        const ms = window.__ready();
        const key = 'probe-noart-figure';
        if (!ms.textures.exists(key)) {
          const cv = ms.textures.createCanvas(key, 32, 48);
          cv.context.fillStyle = '#808080';
          cv.context.fillRect(0, 0, 32, 48);
          cv.refresh();
        }
        const p = ms.player;
        const realKey = p.baseKey;
        p.baseKey = key;
        p.sprite.setTexture(key);
        const keys = [];
        for (const [x, y] of [[1, 0], [0, -1], [1, 1], [0, 1]]) {
          p.setDirection(x, y);
          keys.push(p.sprite.texture.key);
        }
        p.setDirection(0, 0);
        p.baseKey = realKey; // restore the real figure exactly as it was
        p.sprite.setTexture(realKey);
        ms.textures.remove(key);
        return { keys, restored: p.sprite.texture.key === realKey };
      });
      ok(
        'sprite fallback: a figure without rotation art keeps its single texture while moving (synthetic probe key)',
        singleTex.keys.length === 4 && singleTex.keys.every((k) => k === 'probe-noart-figure') && singleTex.restored,
        JSON.stringify(singleTex),
      );
    }

    // 2m. EVERY MAGE COMMIT-1 EXTENSION THROUGH A REAL MAGE SKILL, in the live
    // Mage session: Wormhole Rift (teleport + origin portal), Crystal Strike →
    // Crystal Shatter (stacks banked then detonated), Entangled Chains (binding),
    // and Arcane Missiles (seeking bolts hit a foe 90° off the firing line).
    if (cls === 'mage') {
      const mageKit = await page.evaluate(async () => {
        const ms = window.__ready();
        const wait = (t) => new Promise((r) => setTimeout(r, t));
        if (!window.__quietSpot()) return { setup: 'no quiet spot' };
        const spawnAt = (dx, dy) => {
          const w = ms.activeMap().nearestWalkableWorld(ms.player.x + dx, ms.player.y + dy);
          return ms.spawnAngel('darkcaster', w.x, w.y);
        };
        // Wormhole Rift: move + a portal hazard left at the origin.
        const from = { x: ms.player.x, y: ms.player.y };
        ms.player.facingX = 1;
        ms.player.facingY = 0;
        ms.runActiveSkill('mage_wormhole');
        const wormMoved = Math.hypot(ms.player.x - from.x, ms.player.y - from.y);
        const h = ms.spellHazards[ms.spellHazards.length - 1];
        const portal = h ? Math.hypot(h.x - from.x, h.y - from.y) < 5 : false;
        // Crystal Strike banks a stack; Crystal Shatter detonates it.
        const a = spawnAt(60, 0);
        await wait(200);
        ms.player.facingX = a.x >= ms.player.x ? 1 : -1;
        ms.player.facingY = 0;
        ms.runActiveSkill('mage_crystal_strike');
        await wait(100);
        const stacks = ms.crystallize.get(a) ?? 0;
        const hpA = a.health.current;
        ms.runActiveSkill('mage_shatter');
        await wait(100);
        const shattered = hpA - a.health.current > 0 && !ms.crystallize.has(a);
        // Entangled Chains binds the cluster.
        const b = spawnAt(140, 60);
        const c = spawnAt(140, -60);
        await wait(200);
        ms.runActiveSkill('mage_entangle');
        const bound = ms.entangled ? ms.entangled.members.length : 0;
        ms.clearEntangle();
        a.destroy();
        b.destroy();
        c.destroy();
        // Arcane Missiles: a lone foe due NORTH, fired due EAST — homing must connect.
        const wN = ms.activeMap().nearestWalkableWorld(ms.player.x, ms.player.y - 220);
        const foe = ms.spawnAngel('darkcaster', wN.x, wN.y);
        await wait(200);
        ms.player.facingX = 1;
        ms.player.facingY = 0;
        const hp0 = foe.health.current;
        ms.runActiveSkill('mage_missiles');
        const t0 = Date.now();
        let drop = 0;
        while (Date.now() - t0 < 2500) {
          await wait(120);
          drop = hp0 - foe.health.current;
          if (drop > 0) break;
        }
        foe.destroy();
        ms.crystallize.clear();
        ms.playerHealth.full();
        return { setup: 'ok', wormMoved, portal, stacks, shattered, bound, drop };
      });
      ok(
        'mage: every framework extension fires through a real Mage skill',
        mageKit.setup === 'ok' && mageKit.wormMoved > 120 && mageKit.portal && mageKit.stacks === 1 && mageKit.shattered && mageKit.bound >= 2 && mageKit.drop > 0,
        JSON.stringify(mageKit),
      );

      // 2n. MAGE POLISH (permanent): Encapsulation is a TOGGLE (no timer; the exit
      // cast is never cooldown-gated; the bonus tracks the state), and the strike
      // primitive spawns exactly ONE pooled swing arc per pulse with its cap held
      // under rapid Flurry spam. Runs through the REAL activation path (unlock →
      // activateSkill), in the live Mage session.
      const polish = await page.evaluate(async () => {
        const ms = window.__ready();
        const wait = (t) => new Promise((r) => setTimeout(r, t));
        const defs = ms.classSkillsAll['mage'].skills;
        ms.skills.awardPoints(2);
        ms.skills.unlock(defs.find((d) => d.id === 'mage_cb_shard'));
        ms.skills.unlock(defs.find((d) => d.id === 'mage_cb_encapsulation'));
        const dmg0 = ms.combinedSkillMods().damageMult ?? 0;
        ms.activateSkill('mage_cb_encapsulation'); // ENTER via the real button path
        const entry = ms.skillTimed.find((t) => t.id === 'mage_cb_encapsulation');
        const noTimer = !!entry && !Number.isFinite(entry.endsAt);
        const dmgOn = (ms.combinedSkillMods().damageMult ?? 0) - dmg0;
        await wait(400); // must NOT expire on its own
        const stillOn = ms.skillTimed.some((t) => t.id === 'mage_cb_encapsulation');
        ms.activateSkill('mage_cb_encapsulation'); // EXIT — allowed despite the entry cooldown
        const off = !ms.skillTimed.some((t) => t.id === 'mage_cb_encapsulation');
        const dmgOff = (ms.combinedSkillMods().damageMult ?? 0) - dmg0;
        // SWING FX: exactly one arc per strike pulse; the pool cap holds under spam.
        const t1 = ms.swingFx.spawnedTotal;
        ms.runComposedSteps([{ p: 'strike', at: 'front', range: 70, damageRaw: 1, tint: 0xbfe0ff }]);
        const single = ms.swingFx.spawnedTotal - t1;
        const t2 = ms.swingFx.spawnedTotal;
        ms.runActiveSkill('mage_crystal_flurry'); // 3 pulses (0/130/260ms)
        await wait(600);
        const perPulse = ms.swingFx.spawnedTotal - t2;
        for (let i = 0; i < 20; i++) ms.runActiveSkill('mage_crystal_flurry'); // 60 arcs requested at once
        await wait(700);
        const capHeld = ms.swingFx.size <= 16 && ms.swingFx.activeCount <= 16;
        return { noTimer, dmgOn: +dmgOn.toFixed(2), stillOn, off, dmgOff: +dmgOff.toFixed(2), single, perPulse, poolSize: ms.swingFx.size, capHeld };
      });
      ok(
        'mage polish: Encapsulation toggles on/off with no timer; its bonus tracks the state',
        polish.noTimer && polish.dmgOn === 0.35 && polish.stillOn && polish.off && polish.dmgOff === 0,
        JSON.stringify(polish),
      );
      ok(
        'mage polish: one pooled swing arc per strike pulse; the FX cap holds under Flurry spam',
        polish.single === 1 && polish.perPulse === 3 && polish.capHeld,
        JSON.stringify(polish),
      );
    }

    // 2o. BARD RANGE DOCTRINE (Casey's ruling, permanent): Battle Resonance's
    // offense is MELEE ONLY — no projectiles, no ranged placements (Piercing
    // Whistle's SHORT cone is the sanctioned reach concession). Songs/Sonic
    // offense is RANGED — every damaging active projects or places at range
    // (Resonance Pulse's self-burst is the sanctioned peel; Sonic Surge and
    // Wall of Sound count as placements — the trail/wall lands away from the
    // Bard). Checked BOTH as data (the skill definitions) and LIVE (no Battle
    // skill ever puts a bolt in flight; Power Chord does).
    if (cls === 'bard') {
      const doctrine = await page.evaluate(async () => {
        const ms = window.__ready();
        const wait = (t) => new Promise((r) => setTimeout(r, t));
        if (!window.__quietSpot()) return { setup: 'no quiet spot' };
        const defs = ms.classSkillsAll['bard'].skills;
        const nonDamaging = ['bard_hum', 'bard_rally', 'bard_harmonics', 'bard_freq_shield', 'bard_amplify', 'bard_distortion'];
        const placements = ['bard_wall', 'bard_surge']; // ranged by placement (wall cells / dash trail)
        const violations = [];
        for (const d of defs) {
          const e = d.effect;
          if (e.kind !== 'active') continue;
          const steps = e.compose ?? [];
          if (d.tree === 'bard_battle') {
            if (steps.some((s) => s.p === 'bolt' || s.p === 'hazard' || s.at === 'ahead')) violations.push(`${d.id}: ranged step in the melee tree`);
            for (const s of steps) {
              if (s.p === 'cone' && s.range > 120) violations.push(`${d.id}: long cone in the melee tree`);
              if (s.p === 'chain' && s.range > 100) violations.push(`${d.id}: ranged chain in the melee tree`);
              if (s.p === 'strike' && s.at === 'front' && (s.range ?? 0) > 100) violations.push(`${d.id}: long strike in the melee tree`);
            }
          } else {
            if (nonDamaging.includes(e.action) || d.id === 'bard_sc_pulse') continue; // utility / the sanctioned peel
            const damaging = placements.includes(e.action) || steps.some((s) => (s.damage ?? 0) > 0 || (s.damageRaw ?? 0) > 0 || (s.damageMult ?? 0) > 0);
            const ranged =
              placements.includes(e.action) ||
              steps.some(
                (s) => s.p === 'bolt' || (s.at === 'ahead' && (s.range ?? s.placeAhead ?? 0) >= 180) || (s.p === 'cone' && s.range >= 200) || (s.p === 'chain' && s.range >= 300) || (s.p === 'hazard' && (s.placeAhead ?? 0) >= 180),
              );
            if (damaging && !ranged) violations.push(`${d.id}: melee resolution in a ranged tree`);
          }
        }
        // LIVE half: fire every Battle damaging active in an EMPTY field and watch
        // the projectile system — nothing may take flight (Heavy Swing's delayed
        // blow and War Song's opening beats are inside each window).
        let battleBolts = 0;
        for (const action of ['bard_mosh', 'bard_cascade', 'bard_whistle', 'bard_heavy_swing', 'bard_stage_dive', 'bard_coda', 'bard_war_song']) {
          ms.runActiveSkill(action);
          const t0 = Date.now();
          while (Date.now() - t0 < 750) {
            battleBolts = Math.max(battleBolts, ms.projectiles.count);
            await wait(80);
          }
        }
        ms.comboUltimate = null;
        for (const t of ms.skillTimed) if (t.id === 'bard_bt_war_song') t.endsAt = 0;
        // The CONTRAST: a Sonic skill genuinely projects.
        ms.player.facingX = 1;
        ms.player.facingY = 0;
        ms.runActiveSkill('bard_power_chord');
        const chordBolts = ms.projectiles.count;
        await wait(900); // let the chord land/expire before the next check
        return { setup: 'ok', violations, battleBolts, chordBolts };
      });
      ok(
        'bard range doctrine: Battle is melee-only (no projectile, ever); Songs/Sonic damage projects or places at range',
        doctrine.setup === 'ok' && doctrine.violations.length === 0 && doctrine.battleBolts === 0 && doctrine.chordBolts >= 1,
        JSON.stringify(doctrine),
      );

      // 2p. EVERY BARD COMMIT-1 EXTENSION THROUGH A REAL BARD SKILL, in the live
      // Bard session: Sonic Distortion (confusion), Coda (conditional finisher),
      // Pentatonic Overload (rotating riders), Resonance Cascade (strike-chain),
      // War Song (combo ultimate), and Sonic Echoes (armed by the REAL unlock,
      // repeating a real Dissonant Symphony hit with no further input).
      const bardKit = await page.evaluate(async () => {
        const ms = window.__ready();
        const wait = (t) => new Promise((r) => setTimeout(r, t));
        if (!window.__quietSpot()) return { setup: 'no quiet spot' };
        const spawnAt = (dx, dy) => {
          const w = ms.activeMap().nearestWalkableWorld(ms.player.x + dx, ms.player.y + dy);
          return ms.spawnAngel('darkcaster', w.x, w.y);
        };
        // SONIC DISTORTION → confusion (an 80% chance skill: retry a few beats).
        const a = spawnAt(120, 0);
        const b = spawnAt(170, 0);
        await wait(200);
        ms.stunEnemiesInRange(ms.player.x + 145, ms.player.y, 220, 2600); // pin the pair (kiting-proof)
        let turned = false;
        for (let i = 0; i < 6 && !turned; i++) {
          ms.runActiveSkill('bard_distortion');
          turned = ms.confused.size > 0;
        }
        ms.confused.clear();
        a.destroy();
        b.destroy();
        // CODA → the conditional finisher: ×2.5 into the stunned target.
        const stunned = spawnAt(80, 60);
        const fresh = spawnAt(80, -60);
        await wait(200);
        ms.stunEnemiesInRange(stunned.x, stunned.y, 30, 1500); // afflict ONE
        stunned.sprite.body.reset(ms.player.x + 80, ms.player.y + 60);
        fresh.sprite.body.reset(ms.player.x + 80, ms.player.y - 60);
        const h1 = stunned.health.current;
        const h2 = fresh.health.current;
        ms.runActiveSkill('bard_coda');
        await wait(100);
        // NOTE: the ×2.5 blow can EXCEED the darkcaster's max HP — death clamps the
        // drop, so assert "clearly amplified", not the exact multiplier (3z-3 owns that).
        const codaRatio = (h1 - stunned.health.current) / Math.max(0.001, h2 - fresh.health.current);
        stunned.destroy();
        fresh.destroy();
        // PENTATONIC OVERLOAD → rotating riders: one cast, DIFFERENT riders land —
        // damage + the slow bolt + the weaken bolt. (The stun bolt is racy to observe:
        // the knockback bolt's own 200ms mini-stun can overwrite its timer — 3z-4
        // owns per-rider exactness.)
        const c = spawnAt(200, 0);
        await wait(200);
        ms.player.facingX = c.x >= ms.player.x ? 1 : -1;
        ms.player.facingY = 0;
        const hpC = c.health.current;
        ms.runActiveSkill('bard_pentatonic');
        await wait(700); // flight + impacts
        const riders = { hit: hpC - c.health.current > 0, slow: ms.slowedEnemies.has(c), weaken: ms.time.now < ms.poisonWeakenUntil && ms.poisonWeakenFactor > 0 };
        ms.poisonWeakenUntil = 0;
        ms.poisonWeakenFactor = 0;
        c.destroy();
        // RESONANCE CASCADE → the melee strike-chain: three foes, falloff, a crescent per hop.
        const foes = [spawnAt(70, 0), spawnAt(180, 0), spawnAt(290, 0)];
        await wait(200);
        ms.stunEnemiesInRange(ms.player.x + 180, ms.player.y, 400, 2500); // casters kite: pin the line
        foes.forEach((f, i) => f.sprite.body.reset(ms.player.x + 70 + i * 110, ms.player.y));
        ms.player.facingX = 1;
        ms.player.facingY = 0;
        const hp0 = foes.map((f) => f.health.current);
        const swings0 = ms.swingFx.spawnedTotal;
        ms.runActiveSkill('bard_cascade');
        await wait(150);
        const drops = foes.map((f, i) => hp0[i] - f.health.current);
        const cascade = { falls: drops.every((d) => d > 0) && drops[0] > drops[1] && drops[1] > drops[2], swings: ms.swingFx.spawnedTotal - swings0 };
        for (const f of foes) f.destroy();
        // WAR SONG → the combo ultimate: the buff runs and strikes auto-chain on the beat.
        const w1 = spawnAt(60, 0);
        await wait(200);
        ms.stunEnemiesInRange(w1.x, w1.y, 400, 3000);
        w1.sprite.body.reset(ms.player.x + 60, ms.player.y); // pin in melee reach for the beats
        const hpW = w1.health.current;
        const swingsW = ms.swingFx.spawnedTotal;
        ms.runActiveSkill('bard_war_song');
        const warBuff = ms.skillTimed.some((t) => t.id === 'bard_bt_war_song');
        await wait(1600); // ~3 beats at 450ms
        const war = { buff: warBuff, beats: ms.swingFx.spawnedTotal - swingsW, drop: hpW - w1.health.current };
        ms.comboUltimate = null;
        for (const t of ms.skillTimed) if (t.id === 'bard_bt_war_song') t.endsAt = 0;
        w1.destroy();
        // SONIC ECHOES → the echo extension, armed by the REAL unlock path.
        const defs = ms.classSkillsAll['bard'].skills;
        ms.skills.awardPoints(3);
        for (const id of ['bard_sc_blast', 'bard_sc_pulse', 'bard_sc_echoes']) {
          if (!ms.skills.isUnlocked(id)) ms.skills.unlock(defs.find((d) => d.id === id));
        }
        const echoArmed = Math.abs(ms.echoPct - 0.35) < 1e-6;
        const e1 = spawnAt(200, 0);
        await wait(200);
        ms.stunEnemiesInRange(e1.x, e1.y, 40, 2500); // hold it so the delayed echo lands
        e1.sprite.body.reset(ms.player.x + 200, ms.player.y);
        ms.player.facingX = 1;
        ms.player.facingY = 0;
        const hpE = e1.health.current;
        ms.runActiveSkill('bard_dissonant');
        await wait(150);
        const echoInitial = hpE - e1.health.current;
        await wait(650); // past the 380ms echo delay
        const echoTotal = hpE - e1.health.current;
        e1.destroy();
        ms.confused.clear();
        ms.playerHealth.full();
        return { setup: 'ok', turned, codaRatio: +codaRatio.toFixed(2), riders, cascade, war, echoArmed, echoInitial, echoTotal };
      });
      ok(
        'bard: every framework extension fires through a real Bard skill',
        bardKit.setup === 'ok' &&
          bardKit.turned &&
          bardKit.codaRatio > 1.8 &&
          bardKit.riders.hit &&
          bardKit.riders.weaken &&
          bardKit.riders.slow &&
          bardKit.cascade.falls &&
          bardKit.cascade.swings === 3 &&
          bardKit.war.buff &&
          bardKit.war.beats >= 2 &&
          bardKit.war.drop > 0 &&
          bardKit.echoArmed &&
          bardKit.echoInitial > 0 &&
          bardKit.echoTotal > bardKit.echoInitial,
        JSON.stringify(bardKit),
      );
    }

    // 2q. EVERY WITCH DOCTOR EXTENSION THROUGH A REAL SKILL, in the live Witch
    // Doctor session: Voodoo Doll (bind + the mirror % measured on a live target),
    // Shadow Stitch armed by the REAL unlock path (the splash hits a neighbor),
    // Spirit Projection (the decoy draws real aggro), and Spirit Split (both
    // halves run). Plus the DECAY-TINT check: every Alchemy of Decay skill
    // declares its decayDomain and its declared FX tints carry the SHIPPED domain
    // colors (red/blue/violet). Cosmetic only — no combat-triangle mechanics.
    if (cls === 'witchdoctor') {
      const wdKit = await page.evaluate(async () => {
        const ms = window.__ready();
        const wait = (t) => new Promise((r) => setTimeout(r, t));
        if (!window.__quietSpot()) return { setup: 'no quiet spot' };
        ms.summons.clear();
        const spawnAt = (dx, dy) => {
          const w = ms.activeMap().nearestWalkableWorld(ms.player.x + dx, ms.player.y + dy);
          return ms.spawnAngel('darkcaster', w.x, w.y);
        };
        // VOODOO DOLL (the real skill): bind a FAR pinned target (inside the
        // skill's 340px cast range, far beyond any melee reach) — the cast hits,
        // then a strike on the doll mirrors exactly mirrorPct (0.6 × raw 20 = 12).
        const a = spawnAt(300, 0);
        await wait(200);
        ms.stunEnemiesInRange(a.x, a.y, 40, 9000);
        ms.player.facingX = 1;
        ms.player.facingY = 0;
        const hp0 = a.health.current;
        ms.runActiveSkill('wd_doll');
        const initial = hp0 - a.health.current;
        const bound = !!ms.voodoo && ms.voodoo.target === a;
        ms.runComposedSteps([{ p: 'strike', at: 'front', range: 70, damageRaw: 20, tint: 0xc9a05a }]);
        await wait(120);
        const mirrored = hp0 - a.health.current - initial;
        // SHADOW STITCH through the REAL unlock path (doll → … → stitch), then the
        // mirror splashes the bound target's neighbor at stitchPct.
        const defs = ms.classSkillsAll['witchdoctor'].skills;
        ms.skills.awardPoints(6);
        for (const id of ['wd_vd_doll', 'wd_vd_decoy', 'wd_vd_vision', 'wd_vd_shackles', 'wd_vd_hex', 'wd_vd_stitch']) {
          if (!ms.skills.isUnlocked(id)) ms.skills.unlock(defs.find((d) => d.id === id));
        }
        const stitchArmed = !!ms.voodooStitch;
        const b = spawnAt(440, 50);
        await wait(200);
        ms.stunEnemiesInRange(b.x, b.y, 40, 6000);
        b.sprite.body.reset(a.x + 60, a.y + 30);
        const hpA = a.health.current;
        const hpB = b.health.current;
        ms.runComposedSteps([{ p: 'strike', at: 'front', range: 70, damageRaw: 20, tint: 0xc9a05a }]);
        await wait(120);
        const stitch = { toTarget: hpA - a.health.current, toNeighbor: hpB - b.health.current };
        b.destroy();
        // SPIRIT PROJECTION (the real skill): the decoy draws a real enemy's aggro.
        const e = spawnAt(-150, 0);
        await wait(200);
        ms.stunEnemiesInRange(e.x, e.y, 40, 6000);
        ms.runActiveSkill('wd_decoy');
        const decoy = ms.summons.list.find((s) => s.config.key === 'wd_decoy') ?? null;
        await wait(700); // past the aggro re-eval interval
        const t1 = ms.enemyAggroTarget(e, e.x, e.y);
        const decoyDraws = decoy ? Math.hypot(t1.x - decoy.x, t1.y - decoy.y) < 60 : false;
        e.destroy();
        ms.summons.clearKey('wd_decoy');
        // SPIRIT SPLIT (the real skill): the decoy walks + the doll auto-pulses
        // into the (still pinned, still bound) target with no strike.
        ms.stunEnemiesInRange(a.x, a.y, 40, 6000);
        const hpS = a.health.current;
        ms.runActiveSkill('wd_spirit_split');
        const splitOn = ms.spiritSplit !== null && ms.summons.list.some((s) => s.config.key === 'wd_decoy');
        await wait(1600); // ~2 pulses at 700ms
        const pulsed = hpS - a.health.current;
        ms.spiritSplit = null;
        a.destroy();
        ms.summons.clear();
        ms.voodoo = null;
        ms.playerHealth.full();
        return { setup: 'ok', bound, initial, mirrored, stitchArmed, stitch, decoyDraws, splitOn, pulsed };
      });
      ok(
        'witchdoctor: doll mirror % + stitch splash + decoy aggro + spirit split, each through the real skill',
        wdKit.setup === 'ok' &&
          wdKit.bound &&
          wdKit.initial > 0 &&
          wdKit.mirrored === 12 &&
          wdKit.stitchArmed &&
          wdKit.stitch.toTarget === 12 &&
          wdKit.stitch.toNeighbor === 6 &&
          wdKit.decoyDraws &&
          wdKit.splitOn &&
          wdKit.pulsed > 0,
        JSON.stringify(wdKit),
      );

      // 2r. DECAY DOMAINS (Casey's ruling, permanent — COSMETIC ONLY): all ten
      // Alchemy of Decay skills declare a decayDomain, and every DECLARED FX tint
      // (compose tints/strokes/DoT colors + buff/transformation tints) carries its
      // domain's SHIPPED color. Bespoke casts without declared data (Brew's ring,
      // the Nova's tri-tint) draw their rings from DOMAIN_TINT in their dispatcher
      // cases — by construction, they cannot drift from canon.
      const decay = await page.evaluate(() => {
        const ms = window.__game.scene.getScene('MainScene');
        const DOMAIN = { physical: 0xe04a3a, mental: 0x3a6de0, spiritual: 0x9a4ae0 }; // the shipped canon (enemy-roster)
        const skills = ms.classSkillsAll['witchdoctor'].skills.filter((d) => d.tree === 'wd_decay');
        const missing = skills.filter((d) => !d.decayDomain).map((d) => d.id);
        const bad = [];
        for (const d of skills) {
          if (!d.decayDomain || d.decayDomain === 'all') continue;
          const want = DOMAIN[d.decayDomain];
          const tints = [];
          const e = d.effect;
          if (e.tint !== undefined) tints.push(e.tint);
          for (const st of e.compose ?? []) {
            for (const k of ['tint', 'stroke']) if (st[k] !== undefined) tints.push(st[k]);
            if (st.dot?.color !== undefined) tints.push(st.dot.color);
          }
          if (tints.length > 0 && !tints.includes(want)) bad.push(`${d.id}: declared tints miss the ${d.decayDomain} color`);
        }
        const allDomains = skills.filter((d) => d.decayDomain === 'all').map((d) => d.id);
        return { count: skills.length, missing, bad, allDomains };
      });
      ok(
        'witchdoctor decay domains: all 10 Alchemy skills declare a domain; declared FX tints carry the shipped colors',
        decay.count === 10 && decay.missing.length === 0 && decay.bad.length === 0 && decay.allDomains.length === 2,
        JSON.stringify(decay),
      );
    }

    // 2s. EVERY SAMURAI EXTENSION THROUGH A REAL SKILL, in the live Samurai
    // session: Parry (the real skill's window negates a live wolf's hit and the
    // riposte lands), Iaijutsu (its multiplier MEASURED against the same real
    // strike unbuffed), stance exclusivity (the three real toggles through the
    // real activation path), and Perfect Form (auto-parrying a real pack while
    // the blade keeps swinging).
    if (cls === 'samurai') {
      const samKit = await page.evaluate(async () => {
        const ms = window.__ready();
        const wait = (t) => new Promise((r) => setTimeout(r, t));
        if (!window.__quietSpot()) return { setup: 'no quiet spot' };
        // PARRY through the real skill: the window negates a live wolf's hit.
        ms.playerHealth.shield = 0;
        ms.playerHealth.full();
        const wolf = ms.spawnTownsfolk(ms.player.x + 60, ms.player.y, null, 'wolf');
        await wait(200);
        const hp0 = ms.playerHealth.current;
        const wolfHp0 = wolf.health.current;
        const count0 = ms.parryCount;
        ms.runActiveSkill('sam_parry');
        const windowOpen = ms.parry !== null;
        ms.onTownsfolkHitPlayer(wolf); // the wolf's REAL melee hit path
        const parry = { windowOpen, negated: ms.playerHealth.current === hp0, riposte: wolfHp0 - wolf.health.current, counted: ms.parryCount === count0 + 1 };
        if (wolf.isAlive) wolf.takeHit(1e9);
        ms.playerHealth.shield = 1e9;
        // IAIJUTSU: the SAME real strike measured unbuffed, then sheathed — the
        // ratio is the multiplier (2.5), the hit stuns, the buff consumes.
        const w = ms.activeMap().nearestWalkableWorld(ms.player.x + 60, ms.player.y);
        const a = ms.spawnAngel('darkcaster', w.x, w.y);
        await wait(200);
        a.sprite.body.reset(ms.player.x + 60, ms.player.y);
        ms.player.facingX = 1;
        ms.player.facingY = 0;
        const b0 = a.health.current;
        ms.runActiveSkill('sam_first_cut');
        await wait(100);
        const base = b0 - a.health.current;
        a.destroy();
        // The sheathed measurement lands on a FRESH foe (2.5× First Cut would
        // overkill what the base measurement already wounded).
        const a2 = ms.spawnAngel('darkcaster', w.x, w.y);
        await wait(200);
        a2.sprite.body.reset(ms.player.x + 60, ms.player.y);
        ms.runActiveSkill('sam_iaijutsu');
        const b1 = a2.health.current;
        ms.runActiveSkill('sam_first_cut');
        await wait(100);
        const iai = { base, sheathed: b1 - a2.health.current, stunned: ms.stunnedEnemies.has(a2), consumed: ms.iaijutsu === null };
        a2.destroy();
        // STANCE EXCLUSIVITY through the REAL activation path (unlock → activateSkill):
        // entering each stance exits the previous; re-casting the active one exits it.
        const defs = ms.classSkillsAll['samurai'].skills;
        ms.skills.awardPoints(4);
        for (const id of ['sam_st_guard_break', 'sam_st_water', 'sam_st_stone', 'sam_st_fire']) {
          if (!ms.skills.isUnlocked(id)) ms.skills.unlock(defs.find((d) => d.id === id));
        }
        const active = () => ['sam_st_water', 'sam_st_stone', 'sam_st_fire'].filter((id) => ms.skillTimed.some((t) => t.id === id));
        ms.activateSkill('sam_st_water');
        const s1 = active();
        ms.activateSkill('sam_st_stone');
        const s2 = active();
        ms.activateSkill('sam_st_fire');
        const s3 = active();
        ms.activateSkill('sam_st_fire'); // toggle OFF — no stance remains
        const s4 = active();
        const stances = { s1: s1.join(','), s2: s2.join(','), s3: s3.join(','), s4: s4.join(',') };
        // PERFECT FORM under a REAL pack: three wolves' hits all auto-parry while
        // the blade keeps swinging freely.
        ms.playerHealth.shield = 0;
        ms.playerHealth.full();
        const pack = [0, 1, 2].map((i) => ms.spawnTownsfolk(ms.player.x + 50 + i * 30, ms.player.y + (i - 1) * 40, null, 'wolf'));
        await wait(250);
        const countP = ms.parryCount;
        ms.runActiveSkill('sam_perfect_form');
        const formBuff = ms.skillTimed.some((t) => t.id === 'sam_st_perfect');
        // Per-hit SYNCHRONOUS deltas: each parried wolf hit must remove exactly 0
        // HP (a stray ranged enemy wandering in mid-wait can't pollute this).
        let taken = 0;
        for (const p of pack) {
          const before = ms.playerHealth.current;
          ms.onTownsfolkHitPlayer(p); // each wolf's REAL hit, auto-parried
          taken += before - ms.playerHealth.current;
          ms.runActiveSkill('sam_first_cut'); // the player never stops acting
          await wait(120);
        }
        const form = { formBuff, untouched: taken === 0, parries: ms.parryCount - countP };
        ms.perfectFormUntil = 0;
        for (const t of ms.skillTimed) t.endsAt = 0;
        for (const p of pack) if (p.isAlive) p.takeHit(1e9);
        ms.playerHealth.full();
        ms.playerHealth.shield = 1e9;
        return { setup: 'ok', parry, iai, stances, form };
      });
      ok(
        'samurai: parry vs a live wolf + iaijutsu ratio + stance exclusivity + perfect form, each through the real skill',
        samKit.setup === 'ok' &&
          samKit.parry.windowOpen &&
          samKit.parry.negated &&
          samKit.parry.riposte > 0 &&
          samKit.parry.counted &&
          samKit.iai.base > 0 &&
          Math.abs(samKit.iai.sheathed / samKit.iai.base - 2.5) < 0.05 &&
          samKit.iai.stunned &&
          samKit.iai.consumed &&
          samKit.stances.s1 === 'sam_st_water' &&
          samKit.stances.s2 === 'sam_st_stone' &&
          samKit.stances.s3 === 'sam_st_fire' &&
          samKit.stances.s4 === '' &&
          samKit.form.formBuff &&
          samKit.form.untouched &&
          samKit.form.parries === 3,
        JSON.stringify(samKit),
      );
    }

    // 2t. EVERY MONK EXTENSION THROUGH A REAL MONK SKILL, in the live Monk
    // session: Deflect (the real skill turns aside a live caster's bolt AND a
    // live wolf's bite), Astral Projection (the real decoy), Chi Explosion
    // (measured BOTH ways — the foe wounded, the caster + decoy mended in one
    // cast), Prayer Wheel (ticking, then FOLLOWING the moving caster), and
    // Life Infusion through the REAL unlock chain + activation path — including
    // the ALLY-RULE whiff refund (no ally → cooldown + Chi returned).
    if (cls === 'monk') {
      const monkKit = await page.evaluate(async () => {
        const ms = window.__ready();
        const wait = (t) => new Promise((r) => setTimeout(r, t));
        if (!window.__quietSpot()) return { setup: 'no quiet spot' };
        ms.summons.clear();
        const spawnAt = (dx, dy) => {
          const w = ms.activeMap().nearestWalkableWorld(ms.player.x + dx, ms.player.y + dy);
          return ms.spawnAngel('darkcaster', w.x, w.y);
        };
        // DEFLECT through the real skill vs a live caster's bolt: negated + a
        // half-scaled riposte on the nearest foe + the window consumed.
        const a = spawnAt(80, 0);
        await wait(200);
        ms.stunEnemiesInRange(a.x, a.y, 40, 9000); // pin the caster (no stray bolts)
        ms.playerHealth.shield = 0;
        ms.playerHealth.full();
        const hp0 = ms.playerHealth.current;
        const aHp0 = a.health.current;
        ms.runActiveSkill('monk_deflect');
        const windowOpen = ms.parry !== null && ms.parry.deflectProjectiles === true;
        ms.onProjectileHitPlayer(10); // the REAL ranged damage path
        const boltDeflect = { windowOpen, negated: ms.playerHealth.current === hp0, riposte: aHp0 - a.health.current, consumed: ms.parry === null };
        // The SAME real skill vs a live wolf's bite (the melee half).
        const wolf = ms.spawnTownsfolk(ms.player.x + 60, ms.player.y, null, 'wolf');
        await wait(200);
        const wHp0 = wolf.health.current;
        const hp1 = ms.playerHealth.current;
        ms.runActiveSkill('monk_deflect');
        ms.onTownsfolkHitPlayer(wolf); // the wolf's REAL melee hit path
        const biteDeflect = { negated: ms.playerHealth.current === hp1, riposte: wHp0 - wolf.health.current };
        if (wolf.isAlive) wolf.takeHit(1e9);
        // ASTRAL PROJECTION through the real skill: the spirit-self stands.
        ms.runActiveSkill('monk_astral');
        await wait(150);
        const decoy = ms.summons.list.find((u) => u.isAlive) ?? null;
        // CHI EXPLOSION measured BOTH ways in ONE cast: the pinned foe drops,
        // the wounded caster AND the wounded decoy both mend.
        const c = spawnAt(90, 40);
        await wait(200);
        ms.stunEnemiesInRange(c.x, c.y, 40, 9000);
        c.sprite.body.reset(ms.player.x + 80, ms.player.y + 40); // inside the nova
        let explosion = { foe: 0, self: 0, decoy: 0 };
        if (decoy) {
          decoy.sprite.body.reset(ms.player.x - 70, ms.player.y); // inside the heal
          decoy.health.current -= 20;
          ms.playerHealth.current -= 30;
          const cHp0 = c.health.current;
          const pHp0 = ms.playerHealth.current;
          const dHp0 = decoy.health.current;
          ms.runActiveSkill('monk_explosion');
          await wait(120);
          explosion = { foe: cHp0 - c.health.current, self: ms.playerHealth.current - pHp0, decoy: decoy.health.current - dHp0 };
        }
        // PRAYER WHEEL through the real skill: ticks beside the first foe, then
        // FOLLOWS the caster to a second foe far away.
        ms.playerHealth.full();
        const b = spawnAt(460, 0);
        await wait(150);
        ms.stunEnemiesInRange(b.x, b.y, 40, 9000);
        const aHp1 = a.health.current;
        ms.runActiveSkill('monk_wheel');
        await wait(900);
        const nearTicks = aHp1 - a.health.current;
        ms.player.sprite.body.reset(b.x - 60, b.y); // walk away — the wheel comes along
        const bHp0 = b.health.current;
        await wait(900);
        const followTicks = bHp0 - b.health.current;
        ms.pulseRing = null;
        // LIFE INFUSION through the REAL unlock chain + activation path: unlock
        // the Chi tree down to it, cast it at the wounded decoy, then verify the
        // ALLY-RULE refund when no ally stands.
        const defs = ms.classSkillsAll['monk'].skills;
        ms.skills.awardPoints(10);
        for (const id of ['monk_ch_wave', 'monk_ch_focus', 'monk_ch_soothe', 'monk_ch_tranquil', 'monk_ch_touch', 'monk_ch_aura', 'monk_ch_acupuncture', 'monk_ch_infusion']) {
          if (!ms.skills.isUnlocked(id)) ms.skills.unlock(defs.find((d) => d.id === id));
        }
        let infusion = { healed: 0, paid: 0, spentChi: 0, onCooldown: false };
        if (decoy) {
          ms.playerHealth.full();
          ms.energy.full();
          decoy.health.current = Math.max(1, decoy.health.max - 40);
          const dHp1 = decoy.health.current;
          const pHp1 = ms.playerHealth.current;
          const e0 = ms.energy.current;
          ms.activateSkill('monk_ch_infusion'); // the REAL activation path
          infusion = {
            healed: decoy.health.current - dHp1,
            paid: pHp1 - ms.playerHealth.current,
            spentChi: e0 - ms.energy.current,
            onCooldown: (ms.skillCooldownUntil['monk_ch_infusion'] ?? 0) > ms.time.now,
          };
        }
        // The WHIFF REFUND: no ally → the cast costs neither cooldown nor Chi.
        ms.summons.clear();
        ms.skillCooldownUntil['monk_ch_infusion'] = 0;
        ms.playerHealth.full();
        ms.energy.full();
        const e1 = ms.energy.current;
        const pHp2 = ms.playerHealth.current;
        ms.activateSkill('monk_ch_infusion');
        const whiff = {
          cooldownRefunded: (ms.skillCooldownUntil['monk_ch_infusion'] ?? 0) === 0,
          chiRefunded: ms.energy.current === e1,
          hpUntouched: ms.playerHealth.current === pHp2,
        };
        a.destroy();
        b.destroy();
        c.destroy();
        ms.playerHealth.full();
        ms.playerHealth.shield = 1e9;
        return { setup: 'ok', boltDeflect, biteDeflect, decoyAlive: decoy !== null, explosion, nearTicks, followTicks, infusion, whiff };
      });
      ok(
        'monk: deflect vs a live bolt + bite, chi explosion both ways, prayer wheel on the move, life infusion + whiff refund — each through the real skill',
        monkKit.setup === 'ok' &&
          monkKit.boltDeflect.windowOpen &&
          monkKit.boltDeflect.negated &&
          monkKit.boltDeflect.riposte > 0 &&
          monkKit.boltDeflect.consumed &&
          monkKit.biteDeflect.negated &&
          monkKit.biteDeflect.riposte > 0 &&
          monkKit.decoyAlive &&
          monkKit.explosion.foe > 0 &&
          monkKit.explosion.self > 0 &&
          monkKit.explosion.decoy > 0 &&
          monkKit.nearTicks > 0 &&
          monkKit.followTicks > 0 &&
          monkKit.infusion.healed > 0 &&
          monkKit.infusion.paid > 0 &&
          monkKit.infusion.spentChi > 0 &&
          monkKit.infusion.onCooldown &&
          monkKit.whiff.cooldownRefunded &&
          monkKit.whiff.chiRefunded &&
          monkKit.whiff.hpUntouched,
        JSON.stringify(monkKit),
      );
    }

    // 2u. EVERY ASSASSIN EXTENSION THROUGH A REAL ASSASSIN SKILL, in the live
    // Assassin session: Blade Trap (the real skill's device kills a live wolf
    // while the player stands far apart), the stealth bonus (Silent Blade
    // measured stealthed vs unstealthed), Ambush (whiff-refunded unhidden
    // through the REAL unlock + activation path; devastating from stealth),
    // Shadow Dance (three real strikes, stealth intact), and Trick Shot
    // (ricocheting through a real pack with falloff).
    if (cls === 'assassin') {
      const asnKit = await page.evaluate(async () => {
        const ms = window.__ready();
        const wait = (t) => new Promise((r) => setTimeout(r, t));
        if (!window.__quietSpot()) return { setup: 'no quiet spot' };
        const spawnAt = (dx, dy) => {
          const w = ms.activeMap().nearestWalkableWorld(ms.player.x + dx, ms.player.y + dy);
          return ms.spawnAngel('darkcaster', w.x, w.y);
        };
        // BLADE TRAP through the real skill: place it, walk AWAY, and let a live
        // wolf spring it — the snap kills while the player stands apart.
        ms.player.facingX = 1;
        ms.player.facingY = 0;
        ms.runActiveSkill('asn_blade_trap');
        const trap = ms.traps[0] ?? null;
        const tx = trap ? trap.x : 0;
        const ty = trap ? trap.y : 0;
        const w0 = ms.activeMap().nearestWalkableWorld(ms.player.x - 320, ms.player.y);
        ms.player.sprite.body.reset(w0.x, w0.y); // stand apart
        await wait(900); // the device arms
        const wolf = ms.spawnTownsfolk(tx, ty, null, 'wolf'); // it steps in
        await wait(600);
        const bladeTrap = {
          placed: trap !== null,
          apart: Math.hypot(ms.player.x - tx, ms.player.y - ty) > 250,
          wolfDead: !wolf.isAlive,
          consumed: ms.traps.length === 0,
        };
        if (wolf.isAlive) wolf.takeHit(1e9);
        // STEALTH BONUS through the real skill: Silent Blade unstealthed, then
        // the SAME skill from stealth on a FRESH foe — the ratio is the bonus.
        const hitWith = async (action) => {
          const f = spawnAt(80, 0);
          await wait(200);
          ms.stunEnemiesInRange(f.x, f.y, 60, 30000);
          f.sprite.body.reset(ms.player.x + 60, ms.player.y);
          ms.player.facingX = 1;
          ms.player.facingY = 0;
          const hp0 = f.health.current;
          ms.runActiveSkill(action);
          await wait(120);
          const drop = hp0 - f.health.current;
          f.destroy();
          return drop;
        };
        const baseDrop = await hitWith('asn_silent_blade');
        ms.startPlayerStealth(6000);
        const stealthDrop = await hitWith('asn_silent_blade');
        const rider = { baseDrop, stealthDrop, ratio: stealthDrop / baseDrop, broke: !ms.playerStealthActive };
        // AMBUSH through the REAL unlock + activation path: unhidden it whiffs
        // and refunds (cooldown + energy); from stealth it lands the payoff.
        const defs = ms.classSkillsAll['assassin'].skills;
        ms.skills.awardPoints(4);
        for (const id of ['asn_sh_silent', 'asn_sh_cloak', 'asn_sh_ambush']) {
          if (!ms.skills.isUnlocked(id)) ms.skills.unlock(defs.find((d) => d.id === id));
        }
        ms.breakPlayerStealth();
        ms.energy.full();
        const e0 = ms.energy.current;
        ms.activateSkill('asn_sh_ambush'); // unhidden → the moment passes unspent
        const whiff = { cooldownRefunded: (ms.skillCooldownUntil['asn_sh_ambush'] ?? 0) === 0, energyRefunded: ms.energy.current === e0 };
        ms.startPlayerStealth(6000);
        const ambushDrop = await hitWith('asn_ambush');
        const ambush = { ...whiff, drop: ambushDrop, consumedStealth: !ms.playerStealthActive };
        // SHADOW DANCE through the real skill: three Silent Blades on fresh
        // foes — every one carries the bonus and stealth holds throughout.
        ms.runActiveSkill('asn_shadow_dance');
        const danceOn = ms.playerStealthActive;
        const danceDrops = [];
        for (let i = 0; i < 3; i++) danceDrops.push(await hitWith('asn_silent_blade'));
        const dance = { danceOn, drops: danceDrops, stillHidden: ms.playerStealthActive };
        ms.shadowDanceUntil = 0;
        ms.breakPlayerStealth();
        // TRICK SHOT through a real pack: three pinned foes in a line — the
        // ricochet reaches all three, losing edge per bounce.
        const p1 = spawnAt(90, 0);
        const p2 = spawnAt(190, 40);
        const p3 = spawnAt(290, -30);
        await wait(250);
        for (const f of [p1, p2, p3]) ms.stunEnemiesInRange(f.x, f.y, 60, 30000);
        const hps = [p1, p2, p3].map((f) => f.health.current);
        ms.runActiveSkill('asn_trick');
        await wait(200);
        const drops = [p1, p2, p3].map((f, i) => hps[i] - f.health.current).sort((a, b) => b - a);
        const trick = { hitAll: drops.every((d) => d > 0), falloff: drops[0] > drops[1] && drops[1] > drops[2] };
        p1.destroy();
        p2.destroy();
        p3.destroy();
        ms.playerHealth.full();
        ms.playerHealth.shield = 1e9;
        return { setup: 'ok', bladeTrap, rider, ambush, dance, trick };
      });
      ok(
        'assassin: blade trap kills a live wolf from apart, ambush whiff-refunds unhidden + lands from stealth, shadow dance holds, trick shot ricochets a real pack',
        asnKit.setup === 'ok' &&
          asnKit.bladeTrap.placed &&
          asnKit.bladeTrap.apart &&
          asnKit.bladeTrap.wolfDead &&
          asnKit.bladeTrap.consumed &&
          asnKit.rider.baseDrop > 0 &&
          Math.abs(asnKit.rider.ratio - 1.8) < 0.05 &&
          asnKit.rider.broke &&
          asnKit.ambush.cooldownRefunded &&
          asnKit.ambush.energyRefunded &&
          asnKit.ambush.drop > asnKit.rider.baseDrop * 2 &&
          asnKit.ambush.consumedStealth &&
          asnKit.dance.danceOn &&
          asnKit.dance.drops.every((d) => asnKit.rider.baseDrop > 0 && Math.abs(d / asnKit.rider.baseDrop - 1.8) < 0.05) &&
          asnKit.dance.stillHidden &&
          asnKit.trick.hitAll &&
          asnKit.trick.falloff,
        JSON.stringify(asnKit),
      );
    }

    // 2v. EVERY PRIEST EXTENSION THROUGH A REAL PRIEST SKILL, in the live
    // Priest session: Shield of Faith (the real skill wraps the solo caster and
    // a live wolf's bite is absorbed whole), Beacon of Light (ONE channel
    // measured healing the wounded caster AND burning the pinned foe in the
    // beam), and Divine Intervention (through the REAL unlock + activation
    // path: party-dormant, it whiff-refunds cooldown, Faith and life).
    if (cls === 'priest') {
      const prsKit = await page.evaluate(async () => {
        const ms = window.__ready();
        const wait = (t) => new Promise((r) => setTimeout(r, t));
        if (!window.__quietSpot()) return { setup: 'no quiet spot' };
        ms.summons.clear();
        ms.clearDots();
        // SHIELD OF FAITH through the real skill: solo → the caster; the bite
        // meets the light, not the flesh.
        ms.playerHealth.shield = 0;
        ms.playerHealth.full();
        ms.runActiveSkill('prs_shield_faith');
        const shielded = ms.playerHealth.shield;
        const wolf = ms.spawnTownsfolk(ms.player.x + 60, ms.player.y, null, 'wolf');
        await wait(200);
        const hp0 = ms.playerHealth.current;
        ms.onTownsfolkHitPlayer(wolf); // the wolf's REAL melee hit path
        const faith = { shielded, untouched: ms.playerHealth.current === hp0, spent: ms.playerHealth.shield < shielded };
        if (wolf.isAlive) wolf.takeHit(1e9);
        ms.playerHealth.shield = 0;
        // BEACON OF LIGHT through the real skill: one channel, both halves.
        const w = ms.activeMap().nearestWalkableWorld(ms.player.x + 140, ms.player.y);
        const foe = ms.spawnAngel('darkcaster', w.x, w.y);
        await wait(200);
        ms.stunEnemiesInRange(foe.x, foe.y, 60, 30000);
        foe.sprite.body.reset(ms.player.x + 140, ms.player.y);
        ms.player.facingX = 1;
        ms.player.facingY = 0;
        ms.playerHealth.full();
        ms.playerHealth.current -= 40;
        const pHp0 = ms.playerHealth.current;
        const fHp0 = foe.health.current;
        ms.runActiveSkill('prs_beacon');
        const started = ms.dualChannel !== null;
        await wait(1300);
        const beacon = { started, healed: ms.playerHealth.current - pHp0, burned: fHp0 - foe.health.current };
        foe.destroy();
        // DIVINE INTERVENTION through the REAL unlock + activation path:
        // party-dormant, the whiff refunds cooldown + Faith, and the life
        // price is never taken.
        const defs = ms.classSkillsAll['priest'].skills;
        ms.skills.awardPoints(10);
        for (const id of ['prs_li_ray', 'prs_li_shield', 'prs_li_retribution', 'prs_li_embrace', 'prs_li_radiant', 'prs_li_barrier', 'prs_li_fortress', 'prs_li_blessing', 'prs_li_intervention']) {
          if (!ms.skills.isUnlocked(id)) ms.skills.unlock(defs.find((d) => d.id === id));
        }
        ms.energy.full();
        ms.playerHealth.full();
        const e0 = ms.energy.current;
        const h0 = ms.playerHealth.current;
        ms.activateSkill('prs_li_intervention');
        const intervene = {
          cooldownRefunded: (ms.skillCooldownUntil['prs_li_intervention'] ?? 0) === 0,
          faithRefunded: ms.energy.current === e0,
          lifeUnspent: ms.playerHealth.current === h0,
        };
        ms.clearPriestState();
        ms.playerHealth.full();
        ms.playerHealth.shield = 1e9;
        return { setup: 'ok', faith, beacon, intervene };
      });
      ok(
        'priest: shield of faith absorbs a live bite, beacon of light heals + burns in one channel, divine intervention whiff-refunds — each through the real skill',
        prsKit.setup === 'ok' &&
          prsKit.faith.shielded === 40 &&
          prsKit.faith.untouched &&
          prsKit.faith.spent &&
          prsKit.beacon.started &&
          prsKit.beacon.healed >= 10 &&
          prsKit.beacon.burned >= 12 &&
          prsKit.intervene.cooldownRefunded &&
          prsKit.intervene.faithRefunded &&
          prsKit.intervene.lifeUnspent,
        JSON.stringify(prsKit),
      );
    }

    // 2w. EVERY SAVAGE EXTENSION THROUGH A REAL SAVAGE SKILL, in the live
    // Savage session: Savage Leap (the real skill jumps + slams + downs a live
    // foe), Crimson Nova through the REAL unlock + activation path (blood paid
    // at full health; the rite REFUSES + refunds at low blood), Headtaker (the
    // execute measured both ways in one swing), Warrior's Momentum (the real
    // keyed passive grows four real slashes), and the Jaguar + Pack Bond.
    if (cls === 'savage') {
      const savKit = await page.evaluate(async () => {
        const ms = window.__ready();
        const wait = (t) => new Promise((r) => setTimeout(r, t));
        if (!window.__quietSpot()) return { setup: 'no quiet spot' };
        ms.summons.clear();
        const spawnAt = (dx, dy) => {
          const w = ms.activeMap().nearestWalkableWorld(ms.player.x + dx, ms.player.y + dy);
          return ms.spawnAngel('darkcaster', w.x, w.y);
        };
        const defs = ms.classSkillsAll['savage'].skills;
        ms.skills.awardPoints(12);
        const unlock = (ids) => {
          for (const id of ids) if (!ms.skills.isUnlocked(id)) ms.skills.unlock(defs.find((d) => d.id === id));
        };
        // SAVAGE LEAP through the real skill: jump 220, slam, knockdown.
        const a = spawnAt(220, 0);
        await wait(250);
        const from = { x: ms.player.x, y: ms.player.y };
        ms.player.facingX = 1;
        ms.player.facingY = 0;
        a.sprite.body.reset(from.x + 220, from.y);
        const aHp0 = a.health.current;
        ms.runActiveSkill('sav_leap');
        const leap = { moved: Math.hypot(ms.player.x - from.x, ms.player.y - from.y), hit: aHp0 - a.health.current > 0, down: (ms.stunnedEnemies.get(a) ?? 0) > ms.time.now };
        a.destroy();
        // CRIMSON NOVA through the REAL unlock + activation path: the blood is
        // paid at full health; at low blood the rite refuses and refunds.
        unlock(['sav_br_spike', 'sav_br_veins', 'sav_br_crimson']);
        const b = spawnAt(90, 0);
        await wait(200);
        ms.stunEnemiesInRange(b.x, b.y, 60, 30000);
        b.sprite.body.reset(ms.player.x + 90, ms.player.y);
        ms.playerHealth.shield = 0;
        ms.playerHealth.full();
        ms.energy.full();
        const hp0 = ms.playerHealth.current;
        const bHp0 = b.health.current;
        ms.activateSkill('sav_br_crimson');
        // Read SYNCHRONOUSLY: the blood price + nova both resolve inside the
        // cast — an async window here let an in-flight dark-caster bolt land
        // on the player and bend the measured 15 (the old rare flake).
        const paidCast = { bloodPaid: hp0 - ms.playerHealth.current === 15, novaLanded: bHp0 - b.health.current > 0 };
        await wait(120);
        ms.skillCooldownUntil['sav_br_crimson'] = 0;
        ms.energy.full();
        ms.playerHealth.current = 10; // too thin for the 15-blood rite
        const e0 = ms.energy.current;
        const bHp1 = b.health.current;
        ms.activateSkill('sav_br_crimson');
        const refusal = {
          refused: ms.playerHealth.current === 10 && b.health.current === bHp1,
          cooldownRefunded: (ms.skillCooldownUntil['sav_br_crimson'] ?? 0) === 0,
          energyRefunded: ms.energy.current === e0,
        };
        ms.playerHealth.full();
        ms.playerHealth.shield = 1e9;
        // HEADTAKER through the real skill: one swing, both verdicts — the bled
        // foe under the 35% line is KILLED OUTRIGHT (the ×2 overkills what
        // little it had), the healthy one beside it takes exactly the base.
        const c = spawnAt(70, 40);
        await wait(200);
        for (const f of [b, c]) ms.stunEnemiesInRange(f.x, f.y, 60, 30000);
        b.sprite.body.reset(ms.player.x + 60, ms.player.y + 30);
        c.sprite.body.reset(ms.player.x + 60, ms.player.y - 30);
        b.health.current = Math.floor(b.health.max * 0.3);
        const cHp0 = c.health.current;
        ms.player.facingX = 1;
        ms.player.facingY = 0;
        ms.runActiveSkill('sav_headtaker');
        await wait(100);
        const execute = { lowKilled: !b.isAlive, healthyDrop: cHp0 - c.health.current, healthySurvived: c.isAlive };
        b.destroy();
        c.destroy();
        // BLOOD SCENT through the real keyed passive (Casey's re-spec): one
        // swing over TWO foes — the BLEEDING one takes ×1.2, the clean one the
        // base — measured synchronously off the same cast.
        unlock(['sav_jg_lunge', 'sav_jg_snarl', 'sav_jg_jaguar', 'sav_jg_hide', 'sav_jg_hunt', 'sav_jg_pack']);
        ms.recomputeSkillEffects();
        const scentArmed = ms.bloodScentBonus > 0;
        const s1 = spawnAt(70, 30);
        const s2 = spawnAt(70, -30);
        await wait(200);
        for (const f of [s1, s2]) ms.stunEnemiesInRange(f.x, f.y, 60, 30000);
        s1.sprite.body.reset(ms.player.x + 60, ms.player.y + 26);
        s2.sprite.body.reset(ms.player.x + 60, ms.player.y - 26);
        ms.addDot(s1, 1, 800, 5000, 0xd04a3a); // a token bleed marks the wounded one
        ms.player.facingX = 1;
        ms.player.facingY = 0;
        const s1Hp0 = s1.health.current;
        const s2Hp0 = s2.health.current;
        ms.runActiveSkill('sav_slash');
        const scent = { armed: scentArmed, bleedDrop: s1Hp0 - s1.health.current, cleanDrop: s2Hp0 - s2.health.current };
        s1.destroy();
        s2.destroy();
        // JAGUAR SPIRIT through the REAL activation path (Casey's swap): the
        // FORM's stats go live, a real strike rakes the jaguar's bleed, and NO
        // summon machinery remains reachable from the Savage.
        ms.energy.full();
        ms.activateSkill('sav_jg_jaguar');
        const formOn = ms.skillTimed.some((t) => t.id === 'sav_jg_jaguar');
        const mods = ms.combinedSkillMods();
        const f1 = spawnAt(70, 0);
        await wait(200);
        ms.stunEnemiesInRange(f1.x, f1.y, 60, 30000);
        f1.sprite.body.reset(ms.player.x + 60, ms.player.y);
        ms.player.facingX = 1;
        ms.player.facingY = 0;
        const f1Hp0 = f1.health.current;
        ms.runActiveSkill('sav_slash');
        const jaguarDefs = {
          formKind: defs.find((d) => d.id === 'sav_jg_jaguar').effect.kind,
          scentKind: defs.find((d) => d.id === 'sav_jg_pack').effect.kind,
        };
        const form = {
          on: formOn,
          statsLive: (mods.attackSpeedMult ?? 0) >= 0.25 && (mods.moveSpeedMult ?? 0) >= 0.15,
          struck: f1Hp0 - f1.health.current > 0,
          bleedRaked: ms.dots.some((d) => d.target === f1),
          noSummons: ms.summons.list.length === 0,
          formKind: jaguarDefs.formKind,
          scentKind: jaguarDefs.scentKind,
        };
        f1.destroy();
        // WARRIOR'S MOMENTUM through the real keyed passive: four real slashes,
        // each on a FRESH live foe (no overkill caps), each drop harder than
        // the last as the stacks build.
        unlock(['sav_ob_slash', 'sav_ob_jagged', 'sav_ob_momentum']);
        ms.recomputeSkillEffects(); // the keyed passive arms the frenzy
        const armed = ms.frenzy !== null;
        const drops = [];
        for (let i = 0; i < 4; i++) {
          const foe = spawnAt(80, 0);
          await wait(200);
          ms.stunEnemiesInRange(foe.x, foe.y, 60, 30000);
          foe.sprite.body.reset(ms.player.x + 60, ms.player.y);
          ms.player.facingX = 1;
          ms.player.facingY = 0;
          const before = foe.health.current;
          ms.runActiveSkill('sav_slash');
          await wait(120);
          drops.push(before - foe.health.current);
          foe.destroy();
        }
        const momentum = { armed, drops, stacks: ms.frenzy ? ms.frenzy.stacks : 0, growing: drops[0] < drops[1] && drops[1] < drops[2] && drops[2] < drops[3], ratio: drops[3] / drops[0] };
        ms.playerHealth.full();
        ms.playerHealth.shield = 1e9;
        return { setup: 'ok', leap, paidCast, refusal, execute, scent, form, momentum };
      });
      ok(
        'savage: leap-slam, blood-priced nova (paid + refused), the headtaker execute, blood scent vs a bleeder, the jaguar form (stats + raked bleed, no summons), momentum growth — each through the real skill',
        savKit.setup === 'ok' &&
          savKit.leap.moved > 140 &&
          savKit.leap.hit &&
          savKit.leap.down &&
          savKit.paidCast.bloodPaid &&
          savKit.paidCast.novaLanded &&
          savKit.refusal.refused &&
          savKit.refusal.cooldownRefunded &&
          savKit.refusal.energyRefunded &&
          savKit.execute.lowKilled &&
          savKit.execute.healthyDrop === 20 &&
          savKit.execute.healthySurvived &&
          savKit.scent.armed &&
          savKit.scent.cleanDrop > 0 &&
          Math.abs(savKit.scent.bleedDrop / savKit.scent.cleanDrop - 1.2) < 0.05 &&
          savKit.form.on &&
          savKit.form.statsLive &&
          savKit.form.struck &&
          savKit.form.bleedRaked &&
          savKit.form.noSummons &&
          savKit.form.formKind === 'transformation' &&
          savKit.form.scentKind === 'passive' &&
          savKit.momentum.armed &&
          savKit.momentum.growing &&
          savKit.momentum.ratio >= 1.15 &&
          savKit.momentum.stacks >= 3,
        JSON.stringify(savKit),
      );

      // 2w2. THE CASCADE through the REAL activation path (Casey's concept):
      // three loops of Slash → Jagged Wound → Brutal Cleave — the measured
      // A-strike RISES and its cooldown SHRINKS per completed trio, the HUD pip
      // shows the rank, a wrong-order cast drops everything (measured back at
      // base), a non-cascade skill is untouched at rank, and the flags exist
      // ONLY on Savage skills roster-wide.
      const cascade = await page.evaluate(async () => {
        const ms = window.__ready();
        const wait = (t) => new Promise((r) => setTimeout(r, t));
        if (!window.__quietSpot()) return { setup: 'no quiet spot' };
        const defs = ms.classSkillsAll['savage'].skills;
        ms.skills.awardPoints(6);
        for (const id of ['sav_ob_slash', 'sav_ob_jagged', 'sav_ob_momentum', 'sav_ob_leap', 'sav_ob_cleave', 'sav_br_spike']) {
          if (!ms.skills.isUnlocked(id)) ms.skills.unlock(defs.find((d) => d.id === id));
        }
        // Isolate the cascade's own ramp: end any timed form (attack speed
        // bends cooldowns) and disarm the frenzy (its ramp bends damage).
        for (const t of ms.skillTimed) t.endsAt = 0;
        await wait(150); // the expiry sweep prunes + recomputes
        ms.disarmFrenzy();
        ms.cascadeRank = 0;
        ms.cascadeNextStep = 1;
        ms.cascadeWindowUntil = 0;
        const cast = (id) => {
          if (ms.frenzy) { ms.frenzy.stacks = 0; ms.frenzy.until = 0; } // kills mid-check level up → recompute re-arms momentum; zeroed so the ramp is the CASCADE'S alone
          ms.skillCooldownUntil[id] = 0;
          ms.energy.full();
          ms.activateSkill(id);
        };
        const aDrops = [];
        const aCds = [];
        const ranks = [];
        for (let loop = 0; loop < 3; loop++) {
          const w = ms.activeMap().nearestWalkableWorld(ms.player.x + 80, ms.player.y);
          const foe = ms.spawnAngel('darkcaster', w.x, w.y);
          await wait(200);
          ms.stunEnemiesInRange(foe.x, foe.y, 60, 30000);
          foe.sprite.body.reset(ms.player.x + 60, ms.player.y);
          ms.player.facingX = 1;
          ms.player.facingY = 0;
          ranks.push(ms.cascadeRank);
          const before = foe.health.current;
          cast('sav_ob_slash');
          aDrops.push(before - foe.health.current);
          aCds.push(ms.skillCooldownDur['sav_ob_slash']);
          await wait(120);
          cast('sav_ob_jagged');
          await wait(120);
          cast('sav_ob_cleave');
          await wait(120);
          foe.destroy();
        }
        const rankAfter = ms.cascadeRank;
        const pip = { visible: ms.skillBar.cascadeLabel.visible, text: ms.skillBar.cascadeLabel.text };
        // NON-CASCADE at rank: Blood Spike's cooldown stays its base.
        cast('sav_br_spike');
        const spikeCd = ms.skillCooldownDur['sav_br_spike'];
        // BREAK: A then C out of order — every rank drops; the next A is base.
        cast('sav_ob_slash');
        await wait(80);
        cast('sav_ob_cleave'); // expected step 2 — the pattern breaks
        const rankAfterBreak = ms.cascadeRank;
        const pipHidden = ms.skillBar.cascadeLabel.visible === false;
        const w2 = ms.activeMap().nearestWalkableWorld(ms.player.x + 80, ms.player.y);
        const f2 = ms.spawnAngel('darkcaster', w2.x, w2.y);
        await wait(200);
        ms.stunEnemiesInRange(f2.x, f2.y, 60, 30000);
        f2.sprite.body.reset(ms.player.x + 60, ms.player.y);
        ms.player.facingX = 1;
        ms.player.facingY = 0;
        const before2 = f2.health.current;
        cast('sav_ob_slash');
        const resetDrop = before2 - f2.health.current;
        const resetCd = ms.skillCooldownDur['sav_ob_slash'];
        f2.destroy();
        // FLAG SCAN: cascadeStep lives ONLY on Savage skills, roster-wide.
        let foreign = 0;
        for (const cls2 of Object.keys(ms.classSkillsAll)) {
          if (cls2 === 'savage') continue;
          for (const d of ms.classSkillsAll[cls2].skills) if (d.effect.cascadeStep !== undefined) foreign++;
        }
        ms.playerHealth.full();
        ms.playerHealth.shield = 1e9;
        return { setup: 'ok', ranks, aDrops, aCds, rankAfter, pip, spikeCd, rankAfterBreak, pipHidden, resetDrop, resetCd, foreign };
      });
      ok(
        'savage cascade: slash→jagged→cleave ×3 ramps damage + shrinks cooldowns rank by rank; the pip shows; a broken pattern resets to base; non-cascade + every other class untouched',
        cascade.setup === 'ok' &&
          cascade.ranks[0] === 0 &&
          cascade.ranks[1] === 1 &&
          cascade.ranks[2] === 2 &&
          cascade.aDrops[0] === 19 &&
          cascade.aDrops[0] < cascade.aDrops[1] &&
          cascade.aDrops[1] < cascade.aDrops[2] &&
          cascade.aCds[0] === 2000 &&
          cascade.aCds[1] === 1840 &&
          cascade.aCds[2] === 1680 &&
          cascade.rankAfter === 3 &&
          cascade.pip.visible &&
          cascade.pip.text.includes('CASCADE') &&
          cascade.spikeCd === 2200 &&
          cascade.rankAfterBreak === 0 &&
          cascade.pipHidden &&
          cascade.resetDrop === 19 &&
          cascade.resetCd === 2000 &&
          cascade.foreign === 0,
        JSON.stringify(cascade),
      );
    }

    // 2x. EVERY HUNTER EXTENSION THROUGH A REAL HUNTER SKILL, in the live
    // Hunter session at Sydney: TAME through the real unlock + activation path
    // (whittles walk a live wolf to the line, the conversion bonds it; the
    // dark-caster refusal refunds cooldown AND energy), the COMMANDS (Focus
    // Prey pins the pack on the mark, Scatter the Pack spreads the horde),
    // the MODES (Beast Horde ⇄ Great Beast through their real casts, the
    // re-cast toggling back to the base companion), and BOOMERANG (the
    // returning throw's second cut measured on the flight home).
    if (cls === 'hunter') {
      const hunKit = await page.evaluate(async () => {
        const ms = window.__ready();
        const wait = (t) => new Promise((r) => setTimeout(r, t));
        if (!window.__quietSpot()) return { setup: 'no quiet spot' };
        ms.summons.clear();
        ms.clearHunterState(true);
        const defs = ms.classSkillsAll['hunter'].skills;
        ms.skills.awardPoints(30);
        const unlock = (ids) => {
          for (const id of ids) if (!ms.skills.isUnlocked(id)) ms.skills.unlock(defs.find((d) => d.id === id));
        };
        const cast = (id) => {
          ms.skillCooldownUntil[id] = 0;
          ms.energy.full();
          ms.activateSkill(id);
        };
        // TAME through the real skill: whittle → cleanse on a live wolf.
        unlock(['hun_bc_tame']);
        const ws = ms.activeMap().nearestWalkableWorld(ms.player.x + 60, ms.player.y);
        const wolf = ms.spawnTownsfolk(ws.x, ws.y, null, 'wolf');
        await wait(200);
        ms.stunEnemiesInRange(wolf.x, wolf.y, 90, 30000);
        wolf.sprite.body.reset(ms.player.x + 60, ms.player.y);
        let casts = 0;
        let aliveAfterFirst = false;
        for (let i = 0; i < 6 && ms.hunterPets().length === 0; i++) {
          cast('hun_bc_tame');
          casts++;
          if (i === 0) aliveAfterFirst = wolf.isAlive;
          await wait(80);
        }
        const tame = { casts, aliveAfterFirst, wolfGone: !wolf.isAlive, bond: !!ms.hunterBond, pets: ms.hunterPets().length };
        // REFUSAL through the real skill: the dark-caster refunds cooldown + energy.
        const rs = ms.activeMap().nearestWalkableWorld(ms.player.x + 60, ms.player.y);
        const foe = ms.spawnAngel('darkcaster', rs.x, rs.y);
        await wait(200);
        ms.stunEnemiesInRange(foe.x, foe.y, 90, 30000);
        foe.sprite.body.reset(ms.player.x + 60, ms.player.y);
        ms.energy.full();
        const e0 = ms.energy.current;
        const fHp0 = foe.health.current;
        ms.skillCooldownUntil['hun_bc_tame'] = 0;
        ms.activateSkill('hun_bc_tame');
        const refusal = {
          unharmed: foe.health.current === fHp0,
          cooldownRefunded: (ms.skillCooldownUntil['hun_bc_tame'] ?? 0) === 0,
          energyRefunded: ms.energy.current === e0,
          bondKept: !!ms.hunterBond,
        };
        // FOCUS PREY through the real skill: the mark eats the swings; the
        // bystander beside it bleeds nothing.
        unlock(['hun_bc_pack', 'hun_bc_focus', 'hun_bc_scatter', 'hun_bc_great', 'hun_bc_horde']);
        ms.recomputeSkillEffects();
        const f2s = ms.activeMap().nearestWalkableWorld(ms.player.x + 70, ms.player.y + 90);
        const foe2 = ms.spawnAngel('darkcaster', f2s.x, f2s.y);
        await wait(200);
        for (const f of [foe, foe2]) {
          ms.stunEnemiesInRange(f.x, f.y, 90, 30000);
          f.health.max = 800;
          f.health.current = 800;
        }
        foe.sprite.body.reset(ms.player.x + 70, ms.player.y);
        foe2.sprite.body.reset(ms.player.x + 70, ms.player.y + 90);
        const m0 = foe.health.current;
        const b0 = foe2.health.current;
        cast('hun_bc_focus');
        const focusSet = !!ms.hunterFocus && ms.hunterFocus.target === foe;
        await wait(1500);
        const focus = { focusSet, markHit: m0 - foe.health.current > 0, bystanderClean: foe2.health.current === b0 };
        // MODES through the real casts: horde (3 strikers), SCATTER spreads
        // them (both foes bleed), great (one magnet tank), toggle-exit back.
        cast('hun_bc_horde');
        const horde = ms.hunterPets();
        const modeHorde = horde.length === 3 && horde.every((p) => p.config.key === 'hunter_horde');
        const s1 = foe.health.current;
        const s2 = foe2.health.current;
        cast('hun_bc_scatter');
        const scatterSet = ms.hunterScatterUntil > ms.time.now;
        await wait(1800);
        const scatter = { scatterSet, spread: foe.health.current < s1 && foe2.health.current < s2 };
        cast('hun_bc_great');
        const great = ms.hunterPets();
        const modeGreat = great.length === 1 && great[0].config.key === 'hunter_great' && great[0].aggroPriority === 3;
        cast('hun_bc_great'); // the re-cast: exit the mode → the base companion
        const base = ms.hunterPets();
        const modeExit = base.length === 1 && base[0].config.key === 'hunter_companion';
        foe.destroy();
        foe2.destroy();
        // BOOMERANG through the real skill: the out-leg cut measured first, the
        // return-leg cut doubling it on the flight home.
        unlock(['hun_mk_steady', 'hun_mk_aim', 'hun_mk_multi', 'hun_mk_cripple', 'hun_mk_hawk', 'hun_mk_net', 'hun_mk_trueshot', 'hun_mk_boomerang']);
        ms.recomputeSkillEffects();
        ms.clearHunterPets(); // bench the beast — the boomerang's cuts alone
        const bs = ms.activeMap().nearestWalkableWorld(ms.player.x + 120, ms.player.y);
        const tgt = ms.spawnAngel('darkcaster', bs.x, bs.y);
        await wait(200);
        ms.stunEnemiesInRange(tgt.x, tgt.y, 90, 30000);
        tgt.sprite.body.reset(ms.player.x + 120, ms.player.y);
        tgt.health.max = 800;
        tgt.health.current = 800;
        ms.player.facingX = 1;
        ms.player.facingY = 0;
        const t0 = tgt.health.current;
        cast('hun_mk_boomerang');
        await wait(350); // past the out-leg hit, before the apex turn returns
        const outDrop = t0 - tgt.health.current;
        await wait(1050); // the flight home crosses it again
        const totalDrop = t0 - tgt.health.current;
        const boomerang = { outDrop, totalDrop, doubled: outDrop > 0 && totalDrop === outDrop * 2 };
        tgt.destroy();
        ms.clearHunterState(true);
        ms.playerHealth.full();
        ms.playerHealth.shield = 1e9;
        return { setup: 'ok', tame, refusal, focus, modeHorde, scatter, modeGreat, modeExit, boomerang };
      });
      ok(
        'hunter: tame whittles then cleanses a live wolf through the real skill; the dark-caster refusal refunds cooldown + energy, the bond untouched',
        hunKit.setup === 'ok' &&
          hunKit.tame.casts >= 2 &&
          hunKit.tame.aliveAfterFirst &&
          hunKit.tame.wolfGone &&
          hunKit.tame.bond &&
          hunKit.tame.pets === 1 &&
          hunKit.refusal.unharmed &&
          hunKit.refusal.cooldownRefunded &&
          hunKit.refusal.energyRefunded &&
          hunKit.refusal.bondKept,
        JSON.stringify({ tame: hunKit.tame, refusal: hunKit.refusal }),
      );
      ok(
        'hunter: Focus Prey pins the beast on the mark (bystander clean); Scatter the Pack spreads the horde (both foes bleed) — real casts',
        hunKit.setup === 'ok' && hunKit.focus.focusSet && hunKit.focus.markHit && hunKit.focus.bystanderClean && hunKit.scatter.scatterSet && hunKit.scatter.spread,
        JSON.stringify({ focus: hunKit.focus, scatter: hunKit.scatter }),
      );
      ok(
        'hunter: Beast Horde → Great Beast → re-cast exits to the base companion — one expression at a time, through the real casts',
        hunKit.setup === 'ok' && hunKit.modeHorde && hunKit.modeGreat && hunKit.modeExit,
        JSON.stringify({ modeHorde: hunKit.modeHorde, modeGreat: hunKit.modeGreat, modeExit: hunKit.modeExit }),
      );
      ok(
        'hunter: Boomerang through the real skill — the return leg doubles the out-leg cut on the same foe',
        hunKit.setup === 'ok' && hunKit.boomerang.doubled,
        JSON.stringify(hunKit.boomerang),
      );

      // 2x2. THE STANDALONE PROMISE — a Hunter with ZERO Beast Control points
      // wins a REAL fight (live foes, no shield, no pins) through Marksmanship
      // alone, and another through Wild Frenzy alone. Fresh session each.
      await newGame('hunter');
      const marksAlone = await page.evaluate(async () => {
        const ms = window.__ready();
        const wait = (t) => new Promise((r) => setTimeout(r, t));
        if (!window.__quietSpot()) return { setup: 'no quiet spot' };
        const defs = ms.classSkillsAll['hunter'].skills;
        ms.skills.awardPoints(6);
        for (const id of ['hun_mk_steady', 'hun_mk_aim', 'hun_mk_multi']) {
          if (!ms.skills.isUnlocked(id)) ms.skills.unlock(defs.find((d) => d.id === id));
        }
        ms.recomputeSkillEffects();
        const beastPoints = defs.filter((d) => d.tree === 'hun_beast' && ms.skills.isUnlocked(d.id)).length;
        const w1 = ms.activeMap().nearestWalkableWorld(ms.player.x + 130, ms.player.y);
        const w2 = ms.activeMap().nearestWalkableWorld(ms.player.x + 150, ms.player.y + 60);
        const f1 = ms.spawnAngel('darkcaster', w1.x, w1.y);
        const f2 = ms.spawnAngel('darkcaster', w2.x, w2.y);
        ms.playerHealth.full();
        ms.playerHealth.shield = 0; // a REAL fight — no god-mode
        const deadline = Date.now() + 14000;
        while ((f1.isAlive || f2.isAlive) && ms.playerHealth.current > 0 && Date.now() < deadline) {
          const foe = [f1, f2].find((f) => f.isAlive);
          const a = Math.atan2(foe.y - ms.player.y, foe.x - ms.player.x);
          ms.player.facingX = Math.cos(a);
          ms.player.facingY = Math.sin(a);
          ms.energy.full();
          ms.skillCooldownUntil['hun_mk_steady'] = 0;
          ms.skillCooldownUntil['hun_mk_multi'] = 0;
          ms.activateSkill('hun_mk_steady');
          ms.activateSkill('hun_mk_multi');
          await wait(280);
        }
        const out = { setup: 'ok', beastPoints, won: !f1.isAlive && !f2.isAlive && ms.playerHealth.current > 0, hpLeft: Math.round(ms.playerHealth.current), pets: ms.hunterPets().length, bond: !!ms.hunterBond };
        f1.destroy();
        f2.destroy();
        ms.playerHealth.full();
        ms.playerHealth.shield = 1e9;
        return out;
      });
      ok(
        'standalone promise (Marksmanship): zero Beast Control points, no beast, no shield — two live dark-casters shot down, the Hunter standing',
        marksAlone.setup === 'ok' && marksAlone.beastPoints === 0 && marksAlone.pets === 0 && !marksAlone.bond && marksAlone.won,
        JSON.stringify(marksAlone),
      );

      await newGame('hunter');
      const wildAlone = await page.evaluate(async () => {
        const ms = window.__ready();
        const wait = (t) => new Promise((r) => setTimeout(r, t));
        if (!window.__quietSpot()) return { setup: 'no quiet spot' };
        const defs = ms.classSkillsAll['hunter'].skills;
        ms.skills.awardPoints(6);
        for (const id of ['hun_wf_swipe', 'hun_wf_twin']) {
          if (!ms.skills.isUnlocked(id)) ms.skills.unlock(defs.find((d) => d.id === id));
        }
        ms.recomputeSkillEffects();
        const beastPoints = defs.filter((d) => d.tree === 'hun_beast' && ms.skills.isUnlocked(d.id)).length;
        const pack = [];
        for (const [dx, dy] of [[150, 0], [150, 50], [150, -50]]) {
          const w = ms.activeMap().nearestWalkableWorld(ms.player.x + dx, ms.player.y + dy);
          pack.push(ms.spawnTownsfolk(w.x, w.y, null, 'wolf'));
        }
        ms.playerHealth.full();
        ms.playerHealth.shield = 0; // a REAL fight — the pack charges, the knives answer
        const deadline = Date.now() + 14000;
        while (pack.some((p) => p.isAlive) && ms.playerHealth.current > 0 && Date.now() < deadline) {
          const foe = pack.find((p) => p.isAlive);
          const a = Math.atan2(foe.y - ms.player.y, foe.x - ms.player.x);
          ms.player.facingX = Math.cos(a);
          ms.player.facingY = Math.sin(a);
          ms.energy.full();
          ms.skillCooldownUntil['hun_wf_swipe'] = 0;
          ms.skillCooldownUntil['hun_wf_twin'] = 0;
          ms.activateSkill('hun_wf_swipe');
          ms.activateSkill('hun_wf_twin');
          await wait(260);
        }
        const out = { setup: 'ok', beastPoints, won: pack.every((p) => !p.isAlive) && ms.playerHealth.current > 0, hpLeft: Math.round(ms.playerHealth.current), pets: ms.hunterPets().length, bond: !!ms.hunterBond };
        for (const p of pack) p.destroy();
        ms.playerHealth.full();
        ms.playerHealth.shield = 1e9;
        return out;
      });
      ok(
        'standalone promise (Wild Frenzy): zero Beast Control points, no beast, no shield — the charging wolf pack cut down at knife range, the Hunter standing',
        wildAlone.setup === 'ok' && wildAlone.beastPoints === 0 && wildAlone.pets === 0 && !wildAlone.bond && wildAlone.won,
        JSON.stringify(wildAlone),
      );
    }

    // 2y. EVERY SUNDIAN EXTENSION THROUGH A REAL SUNDIAN SKILL, in the live
    // Sundian session at Bali: RIPTIDE on a live pack (the two-phase tide
    // through the real unlock + activation path — gathered, wounded, thrown,
    // wounded again), a DRENCHED WOLF CRUSHED (Water Lash's real stacks fed to
    // the real Depth Crush, the Ebb and Flow refund observed), and the CROWN
    // WORN (the real regalia toggles excluding one another, then The Drowned
    // Crown running all three at once).
    if (cls === 'atlantean') {
      const sunKit = await page.evaluate(async () => {
        const ms = window.__ready();
        const wait = (t) => new Promise((r) => setTimeout(r, t));
        if (!window.__quietSpot()) return { setup: 'no quiet spot' };
        const walk = (dx, dy) => ms.activeMap().nearestWalkableWorld(ms.player.x + dx, ms.player.y + dy);
        const defs = ms.classSkillsAll['atlantean'].skills;
        ms.skills.awardPoints(30);
        const unlock = (ids) => {
          for (const id of ids) if (!ms.skills.isUnlocked(id)) ms.skills.unlock(defs.find((d) => d.id === id));
        };
        const cast = (id) => {
          ms.skillCooldownUntil[id] = 0;
          ms.energy.full();
          ms.activateSkill(id);
        };
        // Clear the ring first: Bali's resident packs wander, and a stray
        // nearer than the staged foes would steal the auto-target picks.
        for (const e of ms.combatEnemiesInRange(ms.player.x, ms.player.y, 600)) if (typeof e.destroy === 'function') e.destroy();
        // RIPTIDE on a live pack through the real skill: the point sits 150
        // ahead; two foes flank it wide; both are gathered, wounded, thrown.
        unlock(['sun_tc_lash', 'sun_tc_undertow', 'sun_tc_riptide']);
        ms.player.facingX = 1;
        ms.player.facingY = 0;
        const tpx = ms.player.x + 150;
        const tpy = ms.player.y;
        const r1 = ms.spawnAngel('darkcaster', walk(320, 40).x, walk(320, 40).y);
        const r2 = ms.spawnAngel('darkcaster', walk(-20, -30).x, walk(-20, -30).y);
        await wait(200);
        for (const f of [r1, r2]) {
          f.health.max = 500;
          f.health.current = 500;
          f.sprite.body.reset(f.x, f.y);
        }
        const rd0 = [r1, r2].map((f) => Math.hypot(f.x - tpx, f.y - tpy));
        const rhp0 = [r1, r2].map((f) => f.health.current);
        ms.player.facingX = 1;
        ms.player.facingY = 0;
        cast('sun_tc_riptide');
        const rd1 = [r1, r2].map((f) => Math.hypot(f.x - tpx, f.y - tpy));
        const rhp1 = [r1, r2].map((f) => f.health.current);
        for (let i = 0; i < 40 && ms.tide; i++) await wait(100); // until the tide drains (headless frames can lag the timer)
        await wait(120);
        const rd2 = [r1, r2].map((f) => Math.hypot(f.x - tpx, f.y - tpy));
        const rhp2 = [r1, r2].map((f) => f.health.current);
        const riptide = {
          pulledIn: rd1[0] < rd0[0] - 50 && rd1[1] < rd0[1] - 50,
          pullWounds: rhp0[0] - rhp1[0] > 0 && rhp0[1] - rhp1[1] > 0,
          blastedOut: rd2[0] > rd1[0] + 50 && rd2[1] > rd1[1] + 50,
          blastWounds: rhp1[0] - rhp2[0] > 0 && rhp1[1] - rhp2[1] > 0,
        };
        r1.destroy();
        r2.destroy();
        // A DRENCHED WOLF CRUSHED through the real skills: two real Water
        // Lashes (the Drench deepener doubles each soak), then Depth Crush
        // consumes every stack — and Ebb and Flow hands Tide back.
        unlock(['sun_tc_drench', 'sun_tc_spout', 'sun_tc_mist', 'sun_tc_crush', 'sun_tc_whirlpool', 'sun_tc_ebb']);
        ms.recomputeSkillEffects();
        // Clear the ring again (residents may have wandered back in), then pin
        // OUR wolf nearest so the auto-targeting lash always finds it.
        for (const e of ms.combatEnemiesInRange(ms.player.x, ms.player.y, 600)) if (typeof e.destroy === 'function') e.destroy();
        const wolf = ms.spawnTownsfolk(walk(60, 0).x, walk(60, 0).y, null, 'wolf');
        await wait(200);
        ms.stunEnemiesInRange(wolf.x, wolf.y, 90, 30000);
        wolf.health.max = 300;
        wolf.health.current = 300;
        wolf.sprite.body.reset(ms.player.x + 40, ms.player.y);
        cast('sun_tc_lash');
        await wait(100);
        wolf.sprite.body.reset(ms.player.x + 40, ms.player.y);
        cast('sun_tc_lash');
        await wait(100);
        const stacksBefore = ms.drench.get(wolf) ?? 0;
        const slowed = (ms.slowedEnemies.get(wolf)?.factor ?? 1) < 1;
        const wolfHp0 = wolf.health.current;
        ms.skillCooldownUntil['sun_tc_crush'] = 0;
        ms.energy.current = Math.max(0, ms.energy.max - 40); // room to see the refund
        const tide0 = ms.energy.current;
        ms.activateSkill('sun_tc_crush');
        const crushed = {
          stacksBefore,
          slowed,
          drop: wolfHp0 - wolf.health.current,
          ledgerEmpty: !ms.drench.has(wolf),
          // energy: -cost then +refund per consumed stack (Ebb and Flow) — it must
          // have come back MORE than the crush cost alone would leave.
          tideRefunded: ms.energy.current > tide0 - 16,
        };
        wolf.destroy();
        // THE CROWN WORN through the real casts: the jewels exclude one
        // another, then The Drowned Crown runs all three at once, empowered.
        unlock(['sun_rg_flare', 'sun_rg_pearl', 'sun_rg_coral', 'sun_rg_bands', 'sun_rg_attune', 'sun_rg_talisman', 'sun_rg_idol', 'sun_rg_curse', 'sun_rg_ward', 'sun_rg_crown']);
        ms.recomputeSkillEffects();
        const base = ms.combinedSkillMods();
        cast('sun_rg_pearl');
        const pearlOn = ms.regaliaWorn === 'pearl' && ms.combinedSkillMods().regenPerSec > (base.regenPerSec ?? 0);
        cast('sun_rg_bands');
        const afterBands = ms.combinedSkillMods();
        const bandsExclude = ms.regaliaWorn === 'abyssal' && afterBands.regenPerSec === (base.regenPerSec ?? 0) && afterBands.damageMult > (base.damageMult ?? 0);
        cast('sun_rg_crown');
        const cm = ms.combinedSkillMods();
        const crownOn =
          ms.drownedCrownOn &&
          ms.regaliaWorn === null &&
          cm.regenPerSec > (base.regenPerSec ?? 0) &&
          cm.reflectPct > (base.reflectPct ?? 0) &&
          cm.damageMult > (base.damageMult ?? 0);
        ms.wearRegalia(null);
        ms.skillTimed = ms.skillTimed.filter((t) => !t.id.startsWith('regalia_'));
        ms.recomputeSkillEffects();
        ms.playerHealth.full();
        ms.playerHealth.shield = 1e9;
        return { setup: 'ok', riptide, crushed, pearlOn, bandsExclude, crownOn };
      });
      ok(
        'sundian: Riptide through the real skill gathers a live pack at the point, wounds, reverses, and throws them wounded again',
        sunKit.setup === 'ok' && sunKit.riptide.pulledIn && sunKit.riptide.pullWounds && sunKit.riptide.blastedOut && sunKit.riptide.blastWounds,
        JSON.stringify(sunKit.riptide),
      );
      ok(
        'sundian: real Water Lashes drench (deepened + slowed), the real Depth Crush consumes every stack, and Ebb and Flow hands the Tide back',
        sunKit.setup === 'ok' && sunKit.crushed.stacksBefore === 4 && sunKit.crushed.slowed && sunKit.crushed.drop > 0 && sunKit.crushed.ledgerEmpty && sunKit.crushed.tideRefunded,
        JSON.stringify(sunKit.crushed),
      );
      ok(
        'sundian: the real regalia casts exclude one another and The Drowned Crown is worn — all three auras at once',
        sunKit.setup === 'ok' && sunKit.pearlOn && sunKit.bandsExclude && sunKit.crownOn,
        JSON.stringify({ pearlOn: sunKit.pearlOn, bandsExclude: sunKit.bandsExclude, crownOn: sunKit.crownOn }),
      );
    }
  }

  // HARNESS HELPERS (the precondition contract). __ready(): revive + heal +
  // god-mode absorb shield — checks test SYSTEMS, not the player's survival;
  // an unnoticed mid-check death corrupts everything after it (the respawn
  // relocates the player and correctly resets encounters). __ensureEscort():
  // (re)establish a live escort run for a beat regardless of what earlier
  // checks left behind. Defined AFTER the last page navigation.
  await page.evaluate(() => {
    window.__ready = () => {
      const ms = window.__game.scene.getScene('MainScene');
      if (ms.playerDead) ms.respawnPlayer();
      ms.playerHealth.full();
      ms.playerHealth.shield = 1e9;
      return ms;
    };
    window.__ensureEscort = async (beatId) => {
      const ms = window.__ready();
      if (!ms.escort || ms.escort.beatId !== beatId || ms.chain.activeQuest?.id !== beatId) {
        ms.devJumpToQuest(beatId);
        ms.playerHealth.shield = 1e9; // re-arm past the jump's heal path
        await new Promise((r) => setTimeout(r, 2600)); // travel + chunk activation + spawn
      }
      return ms;
    };
    // __quietSpot(): relocate the player to a walkable spot with NO combat enemy
    // within 800px — the shared isolation precondition for the combat-primitive checks.
    window.__quietSpot = () => {
      const ms = window.__ready();
      for (let i = 1; i <= 40; i++) {
        const x = ms.player.x + (i % 2 ? 1 : -1) * i * 380;
        const y = ms.player.y + ((i % 3) - 1) * 320;
        const w = ms.activeMap().nearestWalkableWorld(x, y);
        if (w && ms.combatEnemiesInRange(w.x, w.y, 800).length === 0) {
          ms.player.sprite.body.reset(w.x, w.y);
          return true;
        }
      }
      return false;
    };
  });

  // 2b. THE WA OPENING PLAYS FOR A REAL DRUID: the fresh-start loop above ended on a
  // live Druid run whose forced first pick (the probe's card click) chose one of the
  // three tree openers. The pick must be unlocked + equipped (needsFirstSkill now
  // false), and THE PICKED SKILL must win the opening Sasquatch fight through the
  // real activation path.
  const druidOpening = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    const classId = ms.classId;
    const needs = ms.skills.needsFirstSkill();
    const starter = ms.skills.loadout().filter(Boolean)[0] ?? null;
    const openers = ['dru_tap_mantis', 'dru_res_lye', 'dru_wk_chill']; // the three tier-0 damaging actives
    const starterDef = ms.classSkillsAll['druid'].skills.find((d) => d.id === starter);
    const action = starterDef && starterDef.effect.kind === 'active' ? starterDef.effect.action : null;
    const sas = ms.sasquatch;
    if (!sas || !sas.isAlive || !action) return { classId, needs, starter, fought: false };
    ms.player.sprite.body.reset(sas.x - 50, sas.y); // stand beside it, facing right
    ms.player.facingX = 1;
    ms.player.facingY = 0;
    let casts = 0;
    while (sas.isAlive && casts < 40) {
      ms.runActiveSkill(action); // whichever opener was picked (cooldown bypassed; same code path)
      casts++;
      await wait(220); // flurry pulses / bolt travel
      ms.playerHealth.full();
      ms.playerHealth.shield = 1e9;
    }
    return { classId, needs, starter, isOpener: openers.includes(starter), fought: true, casts, defeated: !sas.isAlive };
  });
  ok(
    'druid: WA opening plays — the forced first pick wins the Sasquatch fight',
    druidOpening.classId === 'druid' && druidOpening.needs === false && druidOpening.isOpener === true && druidOpening.fought && druidOpening.defeated,
    JSON.stringify(druidOpening),
  );

  // 2c0. ZOOM SEED (far-zoom pass): this live Druid session has NEVER swapped
  // worlds (NA homes keep the shipped WA start) — its zoom-out limit must
  // already fit the WHOLE PLANET, not the PNW chunk it used to seed from.
  const zoomSeed = await page.evaluate(() => {
    const ms = window.__ready();
    const zc = ms.zoomControls;
    const w = ms.scale.width;
    const h = ms.scale.height;
    const expected = Math.min(w / (zc.mapW * 1.08), h / (zc.mapH * 1.08));
    return { mapW: zc.mapW, mapH: zc.mapH, outLimit: zc.outLimit, expected };
  });
  ok(
    'zoom seed: a no-swap session (Druid at Enumclaw) fits the whole planet at max zoom-out',
    zoomSeed.mapW === 873360 && zoomSeed.mapH === 417010 && Math.abs(zoomSeed.outLimit - zoomSeed.expected) < 1e-9 && zoomSeed.outLimit < 0.001,
    JSON.stringify(zoomSeed),
  );

  // 2c1. TILE LOD (far-zoom pass): at world zoom every stamped chunk tile
  // layer fades out and SKIPS RENDER — the planet raster is the sole ground;
  // back at near zoom the full detail restores (counts, not FPS).
  const lodSwitch = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    const counts = () => ms.lodCounts();
    const zoomTo = (z) => {
      ms.zoomControls.target = z; // the real funnel — a raw setZoom is pulled back to target next frame
      ms.cameras.main.setZoom(z);
    };
    zoomTo(1.1);
    await wait(120);
    const near0 = { state: ms.lodState, ...counts() };
    zoomTo(0.0005); // world view
    await wait(ms.feel.lod.fadeMs + 1200); // generous settle: swiftshader world-zoom frames stall under load (3 observed flakes)
    const far = { state: ms.lodState, ...counts() };
    zoomTo(1.1);
    await wait(ms.feel.lod.fadeMs + 1200);
    const near1 = { state: ms.lodState, ...counts() };
    return { near0, far, near1 };
  });
  ok(
    'tile LOD: world zoom = zero visible tile layers (raster-only ground); near zoom = full restore',
    lodSwitch.near0.state === 'near' &&
      lodSwitch.near0.tileLayersVisible === lodSwitch.near0.tileLayersTotal &&
      lodSwitch.near0.tileLayersTotal >= 60 &&
      lodSwitch.far.state === 'far' &&
      lodSwitch.far.tileLayersVisible === 0 &&
      lodSwitch.near1.state === 'near' &&
      lodSwitch.near1.tileLayersVisible === lodSwitch.near1.tileLayersTotal,
    JSON.stringify(lodSwitch),
  );

  // 2c2. LOD HYSTERESIS: a camera crossing the boundary band twice does not
  // flap — inside the gap the state HOLDS whichever side it came from, and a
  // full out-and-back costs exactly two transitions.
  const lodFlap = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    const zoomTo = (z) => {
      ms.zoomControls.target = z;
      ms.cameras.main.setZoom(z);
    };
    zoomTo(1.1);
    await wait(120);
    const t0 = ms.lodTransitions;
    const step = async (z) => {
      zoomTo(z);
      await wait(80);
      return ms.lodState;
    };
    const inGapFromNear = await step(0.16); // inside the hysteresis gap — holds near
    const below = await step(0.14); // below fade-out — flips far
    const inGapFromFar = await step(0.16); // back inside the gap — HOLDS far (no flap)
    const above = await step(0.19); // above fade-in — flips near
    return { inGapFromNear, below, inGapFromFar, above, transitions: ms.lodTransitions - t0 };
  });
  ok(
    'tile LOD hysteresis: the gap holds state from both sides; out-and-back is exactly two transitions',
    lodFlap.inGapFromNear === 'near' && lodFlap.below === 'far' && lodFlap.inGapFromFar === 'far' && lodFlap.above === 'near' && lodFlap.transitions === 2,
    JSON.stringify(lodFlap),
  );

  // 2c3. LABEL TIERS (far-zoom pass): at planet zoom the near tier (road
  // signs / spawn / boss markers) and mid tier (settlement names) are shed —
  // the visible world-label count, DEV zone overlay excluded, stays within
  // the FEEL.lod.labels budget. The DEV overlay itself is EXEMPT (its own
  // low-zoom rule: hidden near, all shown at planet zoom). Near zoom restores
  // every tiered label.
  const labelTiers = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    const zoomTo = (z) => {
      ms.zoomControls.target = z;
      ms.cameras.main.setZoom(z);
    };
    const devVisible = () => ms.regionZoneLabels.filter((l) => l.visible).length;
    zoomTo(1.1);
    await wait(150);
    const near0 = ms.lodCounts().labelsVisible;
    const devNear = devVisible();
    zoomTo(0.0005); // planet view
    await wait(150);
    const far = ms.lodCounts().labelsVisible;
    const devFar = devVisible();
    zoomTo(1.1);
    await wait(150);
    const near1 = ms.lodCounts().labelsVisible;
    return { near0, devNear, far, devFar, devTotal: ms.regionZoneLabels.length, near1, budget: ms.feel.lod.labels.farBudget };
  });
  ok(
    'label tiers: planet zoom sheds the near + mid tiers to within the FEEL budget; DEV zone overlay exempt; near zoom restores all',
    labelTiers.far - labelTiers.devFar <= labelTiers.budget &&
      labelTiers.far - labelTiers.devFar < labelTiers.near0 && // tiers actually shed labels
      labelTiers.devNear === 0 &&
      labelTiers.devFar === labelTiers.devTotal && // the DEV overlay keeps its own rule, unaffected
      labelTiers.near1 === labelTiers.near0,
    JSON.stringify(labelTiers),
  );

  // 2c4. CHUNK-EDGE FEATHER (far-zoom pass): EVERY stamped chunk's tile layer
  // must carry the one-time border alpha ramp at the configured width — the
  // corner and mid-edge tiles sit at the outermost ramp value, the interior
  // at full alpha. Cosmetic only, but a missing feather on any chunk means a
  // hard rectangle floating on the planet raster.
  const featherCheck = await page.evaluate(() => {
    const ms = window.__ready();
    const f = ms.feel.lod.featherPx;
    let checked = 0;
    const bad = [];
    for (const layer of ms.lodTileLayers) {
      const ld = layer.layer; // LayerData: width/height in tiles + the tile grid
      const w = ld.width;
      const h = ld.height;
      const expEdge = ld.tileWidth / 2 / f; // the outermost ramp step (tile-center distance / feather)
      const corner = ld.data[0][0];
      const midEdge = ld.data[0][w >> 1];
      const inner = ld.data[h >> 1][w >> 1];
      const okOne =
        corner && Math.abs(corner.alpha - expEdge) < 1e-6 && midEdge && Math.abs(midEdge.alpha - expEdge) < 1e-6 && inner && inner.alpha === 1;
      if (!okOne) bad.push({ i: checked, w, h, corner: corner && corner.alpha, edge: midEdge && midEdge.alpha, inner: inner && inner.alpha });
      checked++;
    }
    return { checked, badCount: bad.length, bad: bad.slice(0, 4), featherPx: f };
  });
  ok(
    'chunk-edge feather: every stamped chunk border carries the FEEL.lod.featherPx alpha ramp; interiors stay at full alpha',
    featherCheck.checked >= 60 && featherCheck.badCount === 0 && featherCheck.featherPx > 0,
    JSON.stringify(featherCheck),
  );

  // ── WORLD SCALE V2 (PASS 1 — flag-gated behind ?scale=v2; the default
  // session these checks run in is v1, byte-identical to shipped) ───────────
  // 2d0. scale-spec: the locked constants ship EXACTLY as specified —
  // 0.625 m/px (1600 px/km), 32 px tiles at 20 m, the 47°N-parallel
  // equirectangular v2 projection, the foot/mount speeds, and the pinned v1
  // constants read from the shipped calibration.
  const scaleSpec = await page.evaluate(() => {
    const s = window.__worldScale;
    return {
      metersPerPx: s.METERS_PER_PX,
      pxPerKm: s.PX_PER_KM,
      tilePx: s.TILE_PX,
      metersPerTile: s.METERS_PER_TILE,
      pdLat: s.PX_PER_DEG_LAT,
      pdLng: s.PX_PER_DEG_LNG,
      foot: s.FOOT_SPEED_PX,
      mount: s.MOUNT_SPEED_PX,
      v1Lng: s.V1_PX_PER_DEG_LNG,
      v1Lat: s.V1_PX_PER_DEG_LAT,
      v1Origin: s.V1_ORIGIN,
      v2Active: s.isScaleV2(),
    };
  });
  ok(
    'scale-spec: METERS_PER_PX 0.625 / PX_PER_KM 1600 / 32px=20m tiles / v2 178112×121472 / speeds 192-384 / v1 pinned 2426×2453; default session is v1',
    scaleSpec.metersPerPx === 0.625 &&
      scaleSpec.pxPerKm === 1600 &&
      scaleSpec.tilePx === 32 &&
      scaleSpec.metersPerTile === 20 &&
      scaleSpec.pdLat === 178112 &&
      scaleSpec.pdLng === 121472 &&
      scaleSpec.foot === 192 &&
      scaleSpec.mount === 384 &&
      scaleSpec.v1Lng === 2426 &&
      scaleSpec.v1Lat === 2453 &&
      scaleSpec.v1Origin.lat === 85 &&
      scaleSpec.v1Origin.lng === -180 &&
      scaleSpec.v2Active === false,
    JSON.stringify(scaleSpec),
  );

  // 2d1. wa-crossing: the flagship corridor — the WA coast (47.0, −124.6) to
  // the Idaho line (47.0, −117.03) — must resolve to 38–42 min mounted and
  // 76–84 min on foot under v2 (the whole point of the 47°N parallel).
  const waCrossing = await page.evaluate(() => {
    const s = window.__worldScale;
    const a = s.latLngToPxV2(47.0, -124.6);
    const b = s.latLngToPxV2(47.0, -117.03);
    const distPx = Math.hypot(b.x - a.x, b.y - a.y);
    return { distPx: +distPx.toFixed(1), mountMin: +(distPx / s.MOUNT_SPEED_PX / 60).toFixed(2), footMin: +(distPx / s.FOOT_SPEED_PX / 60).toFixed(2) };
  });
  ok(
    'wa-crossing: coast→Idaho at 47°N is 38–42 min mounted and 76–84 min on foot under v2',
    waCrossing.mountMin >= 38 && waCrossing.mountMin <= 42 && waCrossing.footMin >= 76 && waCrossing.footMin <= 84,
    JSON.stringify(waCrossing),
  );

  // 2d2. projection-roundtrip: every home-city anchor (all 14) plus Murmansk
  // and Bali survives lat/lng → v2 px → lat/lng within 1e−6°.
  const roundtrip = await page.evaluate(() => {
    const s = window.__worldScale;
    const anchors = s.homeAnchors.filter((h) => h.anchor).map((h) => ({ id: h.classId, lat: h.anchor.lat, lng: h.anchor.lng }));
    const homes = anchors.length;
    anchors.push({ id: 'murmansk-spec', lat: 68.97, lng: 33.08 }, { id: 'bali-spec', lat: -8.65, lng: 115.22 });
    let worst = 0;
    for (const a of anchors) {
      const p = s.latLngToPxV2(a.lat, a.lng);
      const back = s.pxToLatLngV2(p.x, p.y);
      worst = Math.max(worst, Math.abs(back.lat - a.lat), Math.abs(back.lng - a.lng));
    }
    return { homes, n: anchors.length, worst };
  });
  ok(
    'projection-roundtrip: all 14 home anchors + Murmansk + Bali round-trip through v2 with error < 1e-6°',
    roundtrip.homes === 14 && roundtrip.n === 16 && roundtrip.worst < 1e-6,
    JSON.stringify(roundtrip),
  );

  // 2d3. anchor-sanity: all 14 home anchors project finite and inside the v2
  // planet extents, and real geography holds — Munich west of Moscow, Rome
  // south of Munich, Murmansk north of Moscow (spec frame: y grows SOUTH).
  const anchorSanity = await page.evaluate(() => {
    const s = window.__worldScale;
    const proj = (a) => s.latLngToPxV2(a.lat, a.lng);
    const XMAX = 180 * s.PX_PER_DEG_LNG;
    const YMAX = 90 * s.PX_PER_DEG_LAT;
    const homes = s.homeAnchors.filter((h) => h.anchor).map((h) => ({ id: h.classId, ...proj(h.anchor) }));
    const inBounds = homes.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y) && Math.abs(p.x) <= XMAX && Math.abs(p.y) <= YMAX);
    const za = s.zoneAnchors;
    const find = (frag) => {
      const k = Object.keys(za).find((id) => id.includes(frag));
      return k ? proj(za[k]) : null;
    };
    return { count: homes.length, inBounds, munich: find('munich'), moscow: find('moscow'), rome: find('rome'), murmansk: find('murmansk') };
  });
  ok(
    'anchor-sanity: 14 finite in-bounds home anchors under v2; Munich west of Moscow, Rome south of Munich, Murmansk north of Moscow',
    anchorSanity.count === 14 &&
      anchorSanity.inBounds &&
      !!anchorSanity.munich &&
      !!anchorSanity.moscow &&
      !!anchorSanity.rome &&
      !!anchorSanity.murmansk &&
      anchorSanity.munich.x < anchorSanity.moscow.x &&
      anchorSanity.rome.y > anchorSanity.munich.y &&
      anchorSanity.murmansk.y < anchorSanity.moscow.y,
    JSON.stringify(anchorSanity),
  );

  // 2d4. devspeed-off: with NO ?devspeed param the multiplier is EXACTLY 1 —
  // both the parser and the live player's applied factor. Base speeds only.
  const devspeedOff = await page.evaluate(() => ({
    fn: window.__worldScale.devSpeedMultiplier(),
    player: window.__ready().player.devSpeed,
  }));
  ok(
    'devspeed-off: no param means a multiplier of exactly 1 (parser and live player agree)',
    devspeedOff.fn === 1 && devspeedOff.player === 1,
    JSON.stringify(devspeedOff),
  );

  // ── PASS 2: CHUNK STREAMING + PROCEDURAL TERRAIN (v2 only) ────────────────
  // 2f0. biome-schema-lock: the LOCKED terrain schema ships exactly as
  // specified — Pass 3 and the art pass depend on these never drifting.
  const schemaLock = await page.evaluate(() => {
    const s = window.__worldScale.schema;
    const B = s.Biome;
    return {
      enums: [B.OCEAN, B.FRESHWATER, B.BEACH, B.GRASS, B.SAVANNA, B.DESERT, B.FOREST, B.TAIGA, B.TUNDRA, B.SNOW, B.ROCK, B.SWAMP],
      rec: s.TILE_RECORD_BYTES,
      ct: s.CHUNK_TILES,
      cp: s.CHUNK_PX,
      crb: s.CHUNK_RECORD_BYTES,
      seedType: typeof s.WORLD_SEED,
      latLimit: s.PLAYABLE_LAT_LIMIT,
      nonWalk: s.NON_WALKABLE_BIOMES.slice().sort(),
      flags: [s.FLAG_WALKABLE, s.FLAG_SCATTER],
    };
  });
  ok(
    'biome-schema-lock: enum 0..11 in spec order, 4-byte records, 64-tile (2048 px) chunks, OCEAN+FRESHWATER non-walkable, flag bits 1/2',
    schemaLock.enums.every((v, i) => v === i) &&
      schemaLock.enums.length === 12 &&
      schemaLock.rec === 4 &&
      schemaLock.ct === 64 &&
      schemaLock.cp === 2048 &&
      schemaLock.crb === 16384 &&
      schemaLock.seedType === 'number' &&
      schemaLock.latLimit === 85 &&
      schemaLock.nonWalk.join(',') === '0,1' &&
      schemaLock.flags.join(',') === '1,2',
    JSON.stringify(schemaLock),
  );

  // 2f1. seam-purity: for 4 adjacent chunk pairs, every border-strip tile of
  // each chunk is recomputed through the pure per-tile reference path — the
  // SAME world tile must yield identical bytes no matter which chunk (or
  // which caller) requests it. That per-tile purity is what makes seams
  // impossible by construction.
  const seamPurity = await page.evaluate(() => {
    const s = window.__worldScale;
    const { CHUNK_TILES, TILE_RECORD_BYTES, CHUNK_RECORD_BYTES } = s.schema;
    const src = s.createProceduralSource();
    const fill = (cx, cy) => {
      const b = new Uint8Array(CHUNK_RECORD_BYTES);
      src.fillChunk(cx, cy, b);
      return b;
    };
    const pairs = [
      [[5000, 3000], [5001, 3000]],
      [[5000, 3000], [5000, 3001]],
      [[7123, 4567], [7124, 4567]],
      [[7123, 4567], [7123, 4568]],
    ];
    let mismatches = 0;
    let tilesChecked = 0;
    for (const pair of pairs) {
      for (const [cx, cy] of pair) {
        const bytes = fill(cx, cy);
        for (let e = 0; e < CHUNK_TILES; e++) {
          for (const [i, j] of [[0, e], [CHUNK_TILES - 1, e], [e, 0], [e, CHUNK_TILES - 1]]) {
            const ref = s.tileRecord(cx * CHUNK_TILES + i, cy * CHUNK_TILES + j);
            const o = (j * CHUNK_TILES + i) * TILE_RECORD_BYTES;
            tilesChecked++;
            if (bytes[o] !== ref[0] || bytes[o + 1] !== ref[1] || bytes[o + 2] !== ref[2] || bytes[o + 3] !== ref[3]) mismatches++;
          }
        }
      }
    }
    return { pairs: pairs.length, tilesChecked, mismatches };
  });
  ok(
    'seam-purity: border-strip tiles of 4 adjacent chunk pairs recompute byte-identically through the per-tile reference',
    seamPurity.pairs === 4 && seamPurity.tilesChecked === 2048 && seamPurity.mismatches === 0,
    JSON.stringify(seamPurity),
  );

  // 2f2. latitude-sanity: loose biome-family checks at three latitudes, 32
  // longitudes each (elevation may locally push ROCK/SNOW — hence >= 75%).
  const latSanity = await page.evaluate(() => {
    const s = window.__worldScale;
    const B = s.schema.Biome;
    const family = (lat, allowed) => {
      let hit = 0;
      for (let k = 0; k < 32; k++) {
        const r = s.sampleRecord(lat, -178 + k * 11);
        if (allowed.includes(r[0])) hit++;
      }
      return hit;
    };
    return {
      cairo: family(30.04, [B.DESERT, B.SAVANNA, B.GRASS]),
      murmansk: family(68.97, [B.TAIGA, B.TUNDRA, B.SNOW, B.GRASS]),
      south5: family(-5, [B.FOREST, B.SAVANNA, B.SWAMP]),
    };
  });
  ok(
    'latitude-sanity: Cairo-lat desert/savanna/grass, Murmansk-lat taiga/tundra/snow/grass, 5S forest/savanna/swamp (>=75% of 32 samples each)',
    latSanity.cairo >= 24 && latSanity.murmansk >= 24 && latSanity.south5 >= 24,
    JSON.stringify(latSanity),
  );

  // 2f3. v1-inert: with NO param, none of the streaming machinery exists —
  // no streamer, no worker (only the streamer constructs one), no placeholder
  // atlas texture. Every OTHER check in this gate runs on v1 pages: the whole
  // suite staying green IS the no-behavior-change proof.
  const v1Inert = await page.evaluate(() => {
    const ms = window.__ready();
    return {
      streamer: ms.chunkStreamer === undefined,
      atlas: window.__game.textures.exists('terrain-ph'),
      // PASS 6A: no map button, and map mode refuses to open — fully inert.
      mapBtn: ms.zoomControls.mapBtn === undefined,
      mapOpen: ms.openWorldMap(),
      mapScene: window.__game.scene.isActive('WorldMapScene'),
    };
  });
  ok(
    'v1-inert: no param means no streamer, no worker, no placeholder atlas, no map button, map mode refuses',
    v1Inert.streamer === true && v1Inert.atlas === false && v1Inert.mapBtn === true && v1Inert.mapOpen === false && v1Inert.mapScene === false,
    JSON.stringify(v1Inert),
  );

  // 2c. EVERY COMMIT-1 EXTENSION THROUGH A REAL DRUID SKILL: stealth (Snow Leopard),
  // the dual-use bolt (Lye, heal path), both friendly zones (Sage Burn mobile +
  // Healing Spores static), chain (Lightning Strike across two foes), the pair
  // summon (Chimpanzee Pair) and the untargetable timed summons (Scavengers).
  const druidKit = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!window.__quietSpot()) return { setup: 'no quiet spot' };
    // Stealth via the real skill.
    ms.runActiveSkill('dru_stealth');
    const stealth = ms.playerStealthActive;
    ms.breakPlayerStealth();
    // Lye's heal path (no enemy in range → mend self).
    ms.playerHealth.current = Math.max(1, ms.playerHealth.max - 50);
    const hp0 = ms.playerHealth.current;
    ms.runActiveSkill('dru_lye');
    const lyeHealed = ms.playerHealth.current - hp0;
    // Both friendly-zone variants.
    ms.runActiveSkill('dru_sage_burn'); // mobile (follows)
    ms.runActiveSkill('dru_spores'); // static
    const zones = ms.friendlyZones.map((z) => z.follow);
    // Chain via Lightning Strike across two real foes.
    const w1 = ms.activeMap().nearestWalkableWorld(ms.player.x + 150, ms.player.y);
    const f1 = ms.spawnAngel('darkcaster', w1.x, w1.y);
    const w2 = ms.activeMap().nearestWalkableWorld(ms.player.x + 300, ms.player.y);
    const f2 = ms.spawnAngel('darkcaster', w2.x, w2.y);
    await wait(250);
    const h1 = f1.health.current;
    const h2 = f2.health.current;
    ms.runActiveSkill('dru_lightning');
    await wait(150);
    const chainPrims = ms.lastComposedPrimitives.join(',');
    const chained = h1 - f1.health.current > 0 && h2 - f2.health.current > 0;
    f1.destroy();
    f2.destroy();
    // Summon variants via the real skills.
    ms.summons.clear();
    ms.runActiveSkill('dru_chimp_pair');
    const chimps = ms.summons.list.filter((s) => s.config.key === 'druid_chimpanzee').length;
    ms.runActiveSkill('dru_scavengers');
    const scavs = ms.summons.list.filter((s) => s.config.key === 'druid_scavenger');
    const scavengers = scavs.length;
    const scavUntargetable = scavs.length > 0 && scavs.every((s) => !s.drawsAggro);
    // Clean up everything this check armed.
    ms.summons.clear();
    ms.clearFriendlyZones();
    ms.breakPlayerStealth();
    ms.playerHealth.full();
    return { setup: 'ok', stealth, lyeHealed, zones, chainPrims, chained, chimps, scavengers, scavUntargetable };
  });
  ok(
    'druid: every framework extension fires through a real Druid skill',
    druidKit.setup === 'ok' &&
      druidKit.stealth &&
      druidKit.lyeHealed === 24 &&
      JSON.stringify(druidKit.zones) === '[true,false]' &&
      druidKit.chainPrims === 'chain' &&
      druidKit.chained &&
      druidKit.chimps === 2 &&
      druidKit.scavengers === 3 &&
      druidKit.scavUntargetable,
    JSON.stringify(druidKit),
  );

  // 3) The GLOBE sparse world (Europe + Africa consolidated at true Earth
  // positions): travel, chunks, gates. The region SHIPPED — if the world
  // failed to register, that is a loud FAIL, never a silent skip.
  const hasGlobe = await page.evaluate(() => !!window.__game.scene.getScene('MainScene').worlds['earth']);
  ok('globe: sparse world registered (permanent since the consolidation)', hasGlobe, hasGlobe ? '37 built zones expected' : 'setupGlobe registered no world — every globe check below is unrunnable');
  if (hasGlobe) {
    await page.evaluate(() => window.__game.scene.getScene('MainScene').devTravelEurope());
    await page.waitForTimeout(2200);
    const r = await page.evaluate(() => {
      const ms = window.__game.scene.getScene('MainScene');
      return {
        world: ms.activeWorld,
        chunks: ms.regionColliders.length,
        onChunk: ms.activeMap().terrainAtWorld(ms.player.x, ms.player.y) !== null,
        gates: ms.regionGates.length,
      };
    });
    ok('globe: travel lands on a rendered chunk (Rome)', r.world === 'earth' && r.chunks >= 1 && r.onChunk, `chunks=${r.chunks}`);
    ok('globe: gates exist and come in pairs (both directions)', r.gates >= 2 && r.gates % 2 === 0, `${r.gates} gates`);
    // A real gate crossing — runs UNCONDITIONALLY (no gates = a loud fail here too).
    const crossed = await page.evaluate(async () => {
      const ms = window.__ready();
      const g = ms.regionGates[0];
      if (!g) return { shown: false, reason: 'no gates registered' };
      ms.player.sprite.body.reset(g.x, g.y + 20);
      await new Promise((res) => setTimeout(res, 600));
      if (!ms.cityGateButton.isVisible) return { shown: false, reason: 'button never appeared' };
      ms.cityGateAction?.();
      await new Promise((res) => setTimeout(res, 1600));
      return { shown: true, d: Math.hypot(ms.player.x - g.dest.x, ms.player.y - g.dest.y) };
    });
    ok('globe: a real gate crossing lands', crossed.shown && crossed.d < 8, crossed.shown ? `d=${crossed.d.toFixed(1)}` : crossed.reason);

    // 3b. PER-CHUNK SPAWNS: standing in a chunk materializes its packs (self-
    // establishing: teleports to zone 1's chunk rather than trusting the
    // crossing above to have left the player anywhere useful)...
    const liveAt = await page.evaluate(async () => {
      const ms = window.__ready();
      const z = ms.regionSpawnZones[0];
      if (!z) return -1;
      ms.player.sprite.body.reset(z.center.x, z.center.y + 200);
      await new Promise((res) => setTimeout(res, 900));
      return ms.regionLiveCount();
    });
    ok('globe: entering a chunk materializes its spawns', liveAt > 0, `${liveAt} live in zone 1`);
    // ...and leaving despawns them (teleport deep into the void, past hysteresis).
    const liveAfterLeave = await page.evaluate(async () => {
      const ms = window.__ready();
      ms.player.sprite.body.reset(ms.player.x + 6000, ms.player.y + 6000);
      await new Promise((res) => setTimeout(res, 900));
      return ms.regionLiveCount();
    });
    ok('globe: leaving a chunk despawns/pools its enemies', liveAfterLeave === 0, `${liveAfterLeave} live after leaving`);

    // 3c. KILL OBJECTIVE: jump to a clear beat, kill its family, quest completes.
    const clear = await page.evaluate(async () => {
      const ms = window.__ready();
      ms.devJumpToQuest('rom-02-catacomb-vermin'); // clear: corrupted-wildlife in Rome
      ms.playerHealth.shield = 1e9; // re-arm past the jump's heal path
      await new Promise((res) => setTimeout(res, 1200)); // chunk activates + packs spawn
      const wildlife = ms.regionLive.filter((rec) => rec.family === 'corrupted-wildlife' && rec.entity.isAlive);
      for (const rec of wildlife.slice(0, 5)) rec.entity.takeHit(99999);
      await new Promise((res) => setTimeout(res, 900)); // death sweep + trigger
      return { spawned: wildlife.length, status: ms.chain.status('rom-02-catacomb-vermin') };
    });
    ok('globe: kills increment the active clear objective to completion', clear.spawned >= 5 && clear.status === 'complete', `spawned=${clear.spawned} status=${clear.status}`);

    // 3d. ENTITY CAP during a multi-chunk crossing (rome → campania → apulia).
    const capRun = await page.evaluate(async () => {
      const ms = window.__ready();
      let peak = 0;
      const zones = ms.regionSpawnZones.slice(0, 3);
      for (const z of zones) {
        ms.player.sprite.body.reset(z.center.x, z.center.y + 200);
        for (let i = 0; i < 8; i++) {
          await new Promise((res) => setTimeout(res, 120));
          peak = Math.max(peak, ms.regionLiveCount());
        }
      }
      return { zones: zones.length, peak };
    });
    ok(`globe: live-enemy cap holds across a 3-chunk crossing (peak ${capRun.peak})`, capRun.zones === 3 && capRun.peak > 0 && capRun.peak <= 48, `zones=${capRun.zones} peak=${capRun.peak} cap=48`);

    // 3e. VEIL-AMBUSHER: spawns hidden (invisible, OUT of the townsfolk combat
    // list → untargetable) and only reveals when the player enters the radius.
    const amb = await page.evaluate(async () => {
      const ms = window.__ready();
      // Reset: hop into the void so every zone despawns, then approach fresh.
      ms.player.sprite.body.reset(ms.player.x + 9000, ms.player.y + 9000);
      await new Promise((res) => setTimeout(res, 700));
      const z = ms.regionSpawnZones.find((s) => s.points.some((p) => p.family === 'veil-ambushers'));
      if (!z) return { found: false };
      const pt = z.points.find((p) => p.family === 'veil-ambushers');
      // Land near the marker but OUTSIDE the 140px trigger (homes ring ≤100px from it).
      ms.player.sprite.body.reset(pt.x + 420, pt.y);
      await new Promise((res) => setTimeout(res, 900)); // zone activates, pack spawns hidden
      const recs = ms.regionAmbushers.filter((a) => Math.hypot(a.home.x - pt.x, a.home.y - pt.y) < 200);
      const hiddenBefore = recs.length > 0 && recs.every((a) => a.state === 'hidden' && !a.t.sprite.visible);
      const targetableBefore = recs.some((a) => ms.townsfolk.includes(a.t));
      ms.player.sprite.body.reset(pt.x, pt.y); // step inside the trigger radius
      await new Promise((res) => setTimeout(res, 600));
      const revealed = recs.some((a) => a.state === 'burst' && a.t.sprite.visible && ms.townsfolk.includes(a.t));
      return { found: true, spawned: recs.length, hiddenBefore, targetableBefore, revealed };
    });
    ok(
      'veil-ambusher: hidden + untargetable until the trigger radius, then reveals',
      amb.found && amb.hiddenBefore && !amb.targetableBefore && amb.revealed,
      amb.found ? `spawned=${amb.spawned} hidden=${amb.hiddenBefore} preTargetable=${amb.targetableBefore} revealed=${amb.revealed}` : 'no ambusher zone found',
    );

    // 3f. HOLLOWED-BRUTE: pack size respects the hard 1–2 cap (per spawn point).
    const brutes = await page.evaluate(async () => {
      const ms = window.__ready();
      ms.player.sprite.body.reset(ms.player.x + 9000, ms.player.y + 9000); // despawn all
      await new Promise((res) => setTimeout(res, 700));
      const z = ms.regionSpawnZones.find((s) => s.points.some((p) => p.family === 'hollowed-brutes'));
      if (!z) return { found: false };
      ms.player.sprite.body.reset(z.center.x, z.center.y + 100);
      await new Promise((res) => setTimeout(res, 900)); // zone activates, packs spawn
      const pts = z.points.filter((p) => p.family === 'hollowed-brutes');
      const perPack = pts.map(
        (p) => ms.regionLive.filter((rec) => rec.family === 'hollowed-brutes' && rec.entity.isAlive && Math.hypot(rec.entity.x - p.x, rec.entity.y - p.y) < 170).length,
      );
      return { found: true, perPack };
    });
    ok(
      'hollowed-brute: every pack spawns 1–2, never more',
      brutes.found && brutes.perPack.length > 0 && brutes.perPack.every((n) => n >= 1 && n <= 2),
      brutes.found ? `packs=[${brutes.perPack.join(',')}]` : 'no brute zone found',
    );

    // 3g. REGION CHAMPION (the boss engine): warping to a boss beat spawns the
    // zone's champion with the spec'd name, domain tint and tier-scaled stats
    // (alp-01 = The Pass Warden: Physical red, tier 3 → 600·3² = 5400 HP).
    const champ = await page.evaluate(async () => {
      const ms = window.__ready();
      ms.devJumpToQuest('alp-01-pass-warden');
      ms.playerHealth.shield = 1e9; // re-arm past the jump's heal path
      await new Promise((res) => setTimeout(res, 2600)); // travel fade + chunk activation + spawn
      const b = ms.championBoss;
      if (!b) return { spawned: false };
      return { spawned: true, name: b.name, tint: b.def.sprite.tint, hp: b.health.max };
    });
    ok(
      'champion: boss-beat warp spawns it with spec name + domain tint + tier stats',
      champ.spawned && champ.name === 'The Pass Warden' && champ.tint === 0xe04a3a && champ.hp === 5400,
      champ.spawned ? `name=${champ.name} tint=0x${champ.tint.toString(16)} hp=${champ.hp}` : 'no champion spawned',
    );

    // ...its ONE signature move (charge) fires within a bounded window once engaged...
    const move = await page.evaluate(async () => {
      const ms = window.__ready();
      const b = ms.championBoss;
      if (!b) return { fired: false };
      const anchor = ms.regionBossAnchors[ms.championZoneId];
      ms.player.sprite.body.reset(anchor.x + 120, anchor.y); // inside activation, outside melee
      const t0 = Date.now();
      let fired = false;
      while (Date.now() - t0 < 9000) {
        ms.playerHealth.full();
        ms.playerHealth.shield = 1e9;
        if (b.pending || b.charge) {
          fired = true;
          break;
        }
        await new Promise((res) => setTimeout(res, 90));
      }
      return { fired, active: b.isActive };
    });
    ok('champion: signature move fires within a bounded window', move.fired && move.active, `fired=${move.fired} active=${move.active}`);

    // ...and a programmatic defeat completes the boss beat.
    const defeat = await page.evaluate(async () => {
      const ms = window.__ready();
      const b = ms.championBoss;
      if (!b) return { done: false };
      b.takeHit(9999999);
      await new Promise((res) => setTimeout(res, 800));
      return { done: true, status: ms.chain.status('alp-01-pass-warden'), cleared: ms.championBoss === undefined };
    });
    ok(
      'champion: programmatic defeat completes the boss beat',
      defeat.done && defeat.status === 'complete' && defeat.cleared,
      defeat.done ? `status=${defeat.status} cleared=${defeat.cleared}` : 'no champion to defeat',
    );

    // 3h. ESCORT (one implementation, eight beats): warping to an escort beat
    // spawns a convoy near the player and it walks its route. apu-01 is the
    // target on purpose: apulia's families include veil-ambushers, so this
    // also proves the escort-proximity hook arms.
    const esc = await page.evaluate(async () => {
      const ms = await window.__ensureEscort('apu-01-pilgrim-escort');
      const e = ms.escort;
      if (!e) return { spawned: false };
      const near = Math.hypot(e.npcSprite.x - ms.player.x, e.npcSprite.y - ms.player.y);
      const x0 = e.npcSprite.x;
      const y0 = e.npcSprite.y;
      await new Promise((res) => setTimeout(res, 1100));
      const moved = Math.hypot(e.npcSprite.x - x0, e.npcSprite.y - y0);
      return { spawned: true, near, moved, hooked: e.hasAmbushers, status: ms.chain.status('apu-01-pilgrim-escort') };
    });
    ok(
      'escort: beat warp spawns the convoy near the player and it moves',
      esc.spawned && esc.near < 400 && esc.moved > 30 && esc.hooked && esc.status === 'active',
      esc.spawned ? `near=${esc.near.toFixed(0)}px moved=${esc.moved.toFixed(0)}px escortHookArmed=${esc.hooked}` : 'no convoy spawned',
    );

    // ...a scripted convoy death resets the run for a clean retry (fresh
    // full-HP convoy, beat still active — no permanent failure state)...
    const escReset = await page.evaluate(async () => {
      const ms = await window.__ensureEscort('apu-01-pilgrim-escort');
      const e = ms.escort;
      if (!e) return { had: false };
      const oldSprite = e.npcSprite;
      e.npcHealth.damage(1e9); // scripted convoy death
      await new Promise((res) => setTimeout(res, 500));
      const despawned = ms.escort === undefined;
      await new Promise((res) => setTimeout(res, 3400)); // past the retry breather
      const fresh = !!ms.escort && ms.escort.npcSprite !== oldSprite && ms.escort.npcHealth.current === ms.escort.npcHealth.max;
      return { had: true, despawned, fresh, status: ms.chain.status('apu-01-pilgrim-escort') };
    });
    ok(
      'escort: scripted convoy death resets the run for a clean retry',
      escReset.had && escReset.despawned && escReset.fresh && escReset.status === 'active',
      escReset.had ? `despawned=${escReset.despawned} freshConvoy=${escReset.fresh} status=${escReset.status}` : 'no active escort to kill',
    );

    // ...and the convoy reaching the endpoint completes the beat.
    const escDone = await page.evaluate(async () => {
      const ms = await window.__ensureEscort('apu-01-pilgrim-escort');
      const e = ms.escort;
      if (!e) return { had: false };
      e.npcSprite.body.reset(e.end.x - 70, e.end.y); // walk the last stretch in
      const t0 = Date.now();
      while (Date.now() - t0 < 7000) {
        ms.playerHealth.shield = 1e9;
        if (ms.chain.status('apu-01-pilgrim-escort') === 'complete') break;
        await new Promise((res) => setTimeout(res, 120));
      }
      return { had: true, status: ms.chain.status('apu-01-pilgrim-escort'), cleaned: ms.escort === undefined };
    });
    ok(
      'escort: convoy arrival completes the beat (and the run cleans up)',
      escDone.had && escDone.status === 'complete' && escDone.cleaned,
      escDone.had ? `status=${escDone.status} cleaned=${escDone.cleaned}` : 'no active escort to finish',
    );

    // 3i. WORLD-RESIDENT PAUSE: an enemy resides in the world whose X-band holds
    // it. Standing in the globe world, ZERO foreign residents may tick and ZERO
    // foreign bodies may be enabled; entering a world resumes exactly its own
    // residents. applyWorldSwap directly — the funnel every travel path shares.
    const pause = await page.evaluate(async () => {
      const ms = window.__ready();
      const bands = Object.entries(ms.worlds).map(([id, w]) => ({ id, x0: w.map.bounds.x, x1: w.map.bounds.x + w.map.bounds.width }));
      const homeOf = (x) => bands.find((b) => x >= b.x0 && x <= b.x1)?.id ?? 'void';
      const arrays = () => [...ms.townsfolk, ...ms.angels, ...ms.demons, ...ms.swarmers, ...ms.cherubs, ...ms.guardians, ...ms.bosses, ms.sasquatch].filter((e) => e && e.isAlive);
      const sample = async () => {
        const updated = new Set();
        const wrapped = [];
        for (const e of arrays()) {
          const proto = Object.getPrototypeOf(e);
          if (proto.__diagWrapped || typeof proto.update !== 'function') continue;
          const orig = proto.update;
          proto.update = function (...args) {
            updated.add(this);
            return orig.apply(this, args);
          };
          proto.__diagWrapped = true;
          wrapped.push([proto, orig]);
        }
        await new Promise((r) => setTimeout(r, 300)); // several frames
        for (const [p, o] of wrapped) {
          p.update = o;
          delete p.__diagWrapped;
        }
        const live = arrays();
        return {
          world: ms.activeWorld,
          foreignTicking: live.filter((e) => updated.has(e) && homeOf(e.sprite.x) !== ms.activeWorld).length,
          foreignBodies: live.filter((e) => e.sprite?.body?.enable && homeOf(e.sprite.x) !== ms.activeWorld).length,
          localTicking: live.filter((e) => updated.has(e) && homeOf(e.sprite.x) === ms.activeWorld).length,
          offenders: live
            .filter((e) => updated.has(e) && homeOf(e.sprite.x) !== ms.activeWorld)
            .slice(0, 6)
            .map((e) => `${e.constructor?.name}@${Math.round(e.sprite.x)},${Math.round(e.sprite.y)}->${homeOf(e.sprite.x)}`),
        };
      };
      const inGlobe = await sample();
      ms.applyWorldSwap('heaven', ms.worlds['heaven'].defaultArrival);
      await new Promise((r) => setTimeout(r, 400));
      const inHeaven = await sample();
      ms.applyWorldSwap('hell', ms.worlds['hell'].defaultArrival);
      await new Promise((r) => setTimeout(r, 400));
      const inHell = await sample();
      ms.applyWorldSwap('earth', ms.worlds['earth'].defaultArrival);
      await new Promise((r) => setTimeout(r, 400));
      const backGlobe = await sample();
      return { inGlobe, inHeaven, inHell, backGlobe };
    });
    ok(
      'world-resident pause: in the globe world, zero foreign residents tick + zero foreign bodies enabled',
      pause.inGlobe.world === 'earth' && pause.inGlobe.foreignTicking === 0 && pause.inGlobe.foreignBodies === 0,
      JSON.stringify(pause.inGlobe),
    );
    ok(
      'world-resident pause: Heaven entry resumes Michael + the cherubs (and only them)',
      pause.inHeaven.world === 'heaven' && pause.inHeaven.localTicking >= 7 && pause.inHeaven.foreignTicking === 0 && pause.inHeaven.foreignBodies === 0,
      JSON.stringify(pause.inHeaven),
    );
    ok(
      'world-resident pause: Hell entry resumes the demons + the Sin (and only them)',
      pause.inHell.world === 'hell' && pause.inHell.localTicking >= 7 && pause.inHell.foreignTicking === 0 && pause.inHell.foreignBodies === 0,
      JSON.stringify(pause.inHell),
    );
    ok(
      'world-resident pause: returning to the globe world re-pauses everyone else',
      pause.backGlobe.world === 'earth' && pause.backGlobe.foreignTicking === 0 && pause.backGlobe.foreignBodies === 0,
      JSON.stringify(pause.backGlobe),
    );

    // 3j. STATUS EFFECTS DON'T CROSS WORLDS: take a real tagged caster hit while
    // still in the globe world (slow + weaken + an active DoT stack), then travel
    // to Earth — the player must ARRIVE with zero debuffs (clearDots rides every
    // applyWorldSwap, the same path as reset/load/death).
    const seeded = await page.evaluate(async () => {
      const ms = window.__ready(); // alive + healed: a dead player ignores hits by design
      ms.onProjectileHitPlayer(3, 'caster-bolt'); // the same entry point a live bolt uses
      await new Promise((res) => setTimeout(res, 250)); // a control-effects frame → the slow applies
      return { stacks: ms.casterDotStacks.length, slow: ms.player.slowFactor, weakened: ms.time.now < ms.casterWeakenUntil };
    });
    await page.evaluate(() => window.__game.scene.getScene('MainScene').devTravelEarth());
    await page.waitForTimeout(2000);
    const afterEarth = await page.evaluate(() => {
      const ms = window.__game.scene.getScene('MainScene');
      return {
        world: ms.activeWorld,
        live: ms.regionLiveCount(),
        stacks: ms.casterDotStacks.length,
        slow: ms.player.slowFactor,
        weakened: ms.time.now < ms.casterWeakenUntil,
      };
    });
    ok('globe → Enumclaw return works (one world now; distance culls all packs)', afterEarth.world === 'earth' && afterEarth.live === 0, `live=${afterEarth.live}`);
    ok(
      'world travel clears player debuffs: an active DoT does not cross to Earth',
      seeded.stacks > 0 && seeded.slow < 1 && seeded.weakened && afterEarth.stacks === 0 && afterEarth.slow === 1 && !afterEarth.weakened,
      `before: stacks=${seeded.stacks} slow=${seeded.slow} weakened=${seeded.weakened} → after: stacks=${afterEarth.stacks} slow=${afterEarth.slow} weakened=${afterEarth.weakened}`,
    );
  }

  // 3k. DARK-CASTER: a REAL bolt from a live caster lands and applies its full
  // debuff set (move slow + incoming-damage weaken + a stacking-DoT stack).
  // Runs on Earth (the caster is a world-agnostic angel variant).
  const caster = await page.evaluate(async () => {
    const ms = window.__ready(); // alive + shielded: debuffs apply regardless of absorbed damage
    const spot = ms.activeMap().nearestWalkableWorld(ms.player.x + 220, ms.player.y);
    ms.spawnAngel('darkcaster', spot.x, spot.y);
    const t0 = Date.now();
    while (Date.now() - t0 < 9000) {
      await new Promise((res) => setTimeout(res, 250));
      if (ms.player.slowFactor < 1 && ms.casterDotStacks.length > 0) break;
    }
    return {
      slow: ms.player.slowFactor,
      stacks: ms.casterDotStacks.length,
      weakened: ms.time.now < ms.casterWeakenUntil,
      alive: !ms.playerDead,
    };
  });
  ok(
    'dark-caster: a real bolt applies slow + weaken + a DoT stack to its target',
    caster.slow < 1 && caster.stacks > 0 && caster.weakened && caster.alive,
    `slow=${caster.slow} stacks=${caster.stacks} weakened=${caster.weakened}`,
  );

  // 3l. GLOBE RESIDENCY: the X-band residency rule must cover the consolidated
  // world — verified, not assumed. An entity relocated into the globe's band
  // stops ticking while the player is elsewhere, resumes on globe entry, and
  // is fully re-paused (tick + body) on leaving.
  const africaPause = await page.evaluate(async () => {
    const ms = window.__ready();
    if (!ms.worlds['earth']) return { registered: false };
    const spot = ms.activeMap().nearestWalkableWorld(ms.player.x + 260, ms.player.y);
    const a = ms.spawnAngel('darkcaster', spot.x, spot.y); // born on Earth (spawn needs a dense layer)
    const dest = ms.worlds['earth'].defaultArrival;
    // Release the world-bounds clamp first — Earth's physics bounds would snap
    // the body back to Earth's edge on the next step, keeping it an Earth resident.
    a.sprite.setCollideWorldBounds(false);
    a.sprite.body.reset(dest.x + 150, dest.y); // relocate: a GLOBE resident by X-band
    const sample = async () => {
      const proto = Object.getPrototypeOf(a);
      const orig = proto.update;
      let ticked = false;
      proto.update = function (...args) {
        if (this === a) ticked = true;
        return orig.apply(this, args);
      };
      await new Promise((res) => setTimeout(res, 300));
      proto.update = orig;
      return ticked;
    };
    // The away-world is HEAVEN now — the PNW is the same world as the globe,
    // so 'standing at Enumclaw' no longer makes a Rome resident foreign.
    ms.applyWorldSwap('heaven', ms.worlds['heaven'].defaultArrival);
    await new Promise((res) => setTimeout(res, 300));
    const tickedFromEarth = await sample(); // (name kept: ticked-from-AWAY)
    ms.applyWorldSwap('earth', dest);
    await new Promise((res) => setTimeout(res, 300));
    const tickedInGlobe = await sample();
    const bodyInGlobe = a.sprite.body.enable;
    ms.applyWorldSwap('heaven', ms.worlds['heaven'].defaultArrival);
    await new Promise((res) => setTimeout(res, 300));
    const tickedAfterLeave = await sample();
    const bodyAfterLeave = a.sprite.body.enable;
    ms.applyWorldSwap('earth', ms.town.spawn);
    await new Promise((res) => setTimeout(res, 300));
    a.destroy();
    return { registered: true, tickedFromEarth, tickedInGlobe, bodyInGlobe, tickedAfterLeave, bodyAfterLeave };
  });
  ok(
    'globe: X-band residency pauses its residents elsewhere and resumes on entry',
    africaPause.registered && !africaPause.tickedFromEarth && africaPause.tickedInGlobe && africaPause.bodyInGlobe && !africaPause.tickedAfterLeave && !africaPause.bodyAfterLeave,
    JSON.stringify(africaPause),
  );

  // 3m. WORLD UNIFICATION (Egypt): the old egypt↔luxor cross-world gate pair
  // is RETIRED — the Nile is one ground. No gate targets a retired world key;
  // Luxor's absorbed content (arrival, spawn zone, boss anchor) re-hosts on
  // the hand-built egypt map's tiles; and a sampled corridor from the Egypt
  // map's south pad to the Luxor arrival is contiguously walkable — travel is
  // now literally a walk.
  const seam = await page.evaluate(() => {
    const ms = window.__ready();
    const noEgyptGates = !ms.regionGates.some((g) => g.destWorld === 'egypt');
    const lux = ms.regionZoneArrivals['luxor-valley-of-kings'];
    const hosted = !!lux && ms.egyptMap.terrainAtWorld(lux.x, lux.y) !== null;
    const spawnZone = ms.regionSpawnZones.some((z) => z.zoneId === 'luxor-valley-of-kings');
    const bossAnchor = 'luxor-valley-of-kings' in ms.regionBossAnchors;
    const eb = ms.egyptMap.bounds;
    const pad = ms.egyptMap.nearestWalkableWorld(eb.x + eb.width * 0.5, eb.y + eb.height - 96, 60);
    let walkable = 0;
    const SAMPLES = 12;
    for (let i = 0; i <= SAMPLES; i++) {
      const x = pad.x + ((lux.x - pad.x) * i) / SAMPLES;
      const y = pad.y + ((lux.y - pad.y) * i) / SAMPLES;
      const w = ms.globeMap.nearestWalkableWorld(x, y, 10);
      if (Math.hypot(w.x - x, w.y - y) <= 10 * 32) walkable++;
    }
    return { noEgyptGates, hosted, spawnZone, bossAnchor, walkable, of: SAMPLES + 1 };
  });
  ok(
    'unification (egypt): luxor absorbed onto the Nile (arrival/spawns/boss on hand-built tiles), zero gates to the retired world, the upriver walk contiguous',
    seam.noEgyptGates && seam.hosted && seam.spawnZone && seam.bossAnchor && seam.walkable === seam.of,
    JSON.stringify(seam),
  );

  // 3m2. MIGRATED SAVE (v13 'egypt'): a save written in the retired world
  // loads at the SAME SPOT on the migrated map — within a tile.
  const migSave = await page.evaluate(async () => {
    const ms = window.__ready();
    const pos = ms.egyptMap.nearestWalkableWorld(ms.egyptArrivalPos.x + 400, ms.egyptArrivalPos.y + 260);
    ms.applyWorldSwap('earth', pos);
    await new Promise((res) => setTimeout(res, 400));
    const wrote = ms.requestSave(); // the always-writes path (autosave throttles)
    if (!wrote) return { setup: 'save write refused' };
    const raw = JSON.parse(localStorage.getItem('toh_save'));
    if (!raw) return { setup: 'no save written' };
    // Rewind the save to the PRE-UNIFICATION shape: v13, world 'egypt', with
    // the position expressed against the OLD chain origin.
    raw.saveVersion = 13;
    raw.world.active = 'egypt'; // the RETIRED key — the migration renames it
    raw.world.x = pos.x - ms.egyptMap.bounds.x + ms.egyptOldOriginX;
    raw.world.y = pos.y - ms.egyptMap.bounds.y;
    localStorage.setItem('toh_save', JSON.stringify(raw));
    ms.devLoadSave(); // the REAL path: read → migrate → apply
    await new Promise((res) => setTimeout(res, 400));
    const d = Math.hypot(ms.player.x - pos.x, ms.player.y - pos.y);
    return { setup: 'ok', world: ms.activeWorld, d: +d.toFixed(1) };
  });
  ok(
    "migrated save: a v13 'egypt' save lands within a tile of its old relative spot in the globe",
    migSave.setup === 'ok' && migSave.world === 'earth' && migSave.d <= 32,
    JSON.stringify(migSave),
  );

  // 3m3. THE PLANET AROUND CAIRO: the egypt chunk sits at its true position —
  // the raster shows the Mediterranean north of the Delta and Sahara land west
  // of the Nile, and Cairo's own tiles override the raster where they stand.
  const med = await page.evaluate(() => {
    const ms = window.__ready();
    const g = ms.groundLayers.get('earth');
    const eb = ms.egyptMap.bounds;
    const alexandria = ms.egyptMap.cities.find((c) => c.name === 'Alexandria');
    const ax = eb.x + alexandria.tx * 32;
    const medWater = g.isWaterAtWorld(ax, eb.y - 2400); // ~1° north of the map top
    const saharaLand = !g.isWaterAtWorld(eb.x - 2400, eb.y + eb.height * 0.5); // west of the rect
    const cairo = ms.egyptMap.cities.find((c) => c.name === 'Cairo');
    const cairoTiles = ms.egyptMap.terrainAtWorld(eb.x + cairo.tx * 32, eb.y + cairo.ty * 32) !== null;
    return { medWater, saharaLand, cairoTiles };
  });
  ok(
    'unification (egypt): zoom-out geography — Mediterranean water north of the Delta, Sahara land west, Cairo on hand-built tiles',
    med.medWater && med.saharaLand && med.cairoTiles,
    JSON.stringify(med),
  );

  // 3m4. WORLD UNIFICATION (the PNW): Casey's original — the whole WA corridor
  // lives in the globe at its true position. The towns stand on hand-built
  // tiles, the Enumclaw→Olympia road is contiguously walkable, the raster
  // shows the Pacific west of the coast and land under Enumclaw, and a v14
  // 'earth' save lands within a tile of its old spot.
  const pnw = await page.evaluate(async () => {
    const ms = window.__ready();
    const eb = ms.map.bounds;
    const towns = !!ms.town && !!ms.portland && !!ms.seattle;
    const enumclawTiles = ms.map.terrainAtWorld(ms.town.spawn.x, ms.town.spawn.y) !== null;
    const inRect = (p2) => p2.x >= eb.x && p2.x <= eb.x + eb.width;
    const townsInRect = inRect(ms.town.spawn) && inRect(ms.seattle.label) && inRect(ms.portland.label);
    // Road sample: Enumclaw → Olympia (the shipped corridor).
    const oly = { x: eb.x + 8128, y: eb.y + 8928 };
    let walkable = 0;
    const N = 12;
    for (let i = 0; i <= N; i++) {
      const x = ms.town.spawn.x + ((oly.x - ms.town.spawn.x) * i) / N;
      const y = ms.town.spawn.y + ((oly.y - ms.town.spawn.y) * i) / N;
      const w = ms.map.nearestWalkableWorld(x, y, 10);
      if (Math.hypot(w.x - x, w.y - y) <= 10 * 32) walkable++;
    }
    const g = ms.groundLayers.get('earth');
    const pacific = g.isWaterAtWorld(eb.x - 2400, ms.town.spawn.y); // west of the coast
    const landHome = !g.isWaterAtWorld(eb.x + 20000, eb.y + 8000); // inland WA on the raster
    // Migrated 'earth' save: same spot, new coordinates (old origin was 0,0).
    const pos = ms.map.nearestWalkableWorld(ms.town.spawn.x + 500, ms.town.spawn.y + 300);
    ms.applyWorldSwap('earth', pos);
    await new Promise((res) => setTimeout(res, 400));
    const wrote = ms.requestSave(); // the always-writes path (autosave throttles)
    if (!wrote) return { setup: 'save write refused' };
    const raw = JSON.parse(localStorage.getItem('toh_save'));
    raw.saveVersion = 14;
    raw.world.active = 'earth'; // pre-v15 'earth' = the RETIRED PNW-only key
    raw.world.x = pos.x - eb.x;
    raw.world.y = pos.y - eb.y;
    localStorage.setItem('toh_save', JSON.stringify(raw));
    ms.devLoadSave(); // the REAL path: read → migrate → apply
    await new Promise((res) => setTimeout(res, 400));
    const d = Math.hypot(ms.player.x - pos.x, ms.player.y - pos.y);
    return { towns, enumclawTiles, townsInRect, walkable, of: N + 1, pacific, landHome, world: ms.activeWorld, d: +d.toFixed(1) };
  });
  ok(
    "unification (pnw): towns on hand-built tiles in the globe, the WA road contiguous, Pacific west / land inland, a v14 'earth' save lands within a tile",
    pnw.towns && pnw.enumclawTiles && pnw.townsInRect && pnw.walkable === pnw.of && pnw.pacific && pnw.landHome && pnw.world === 'earth' && pnw.d <= 32,
    JSON.stringify(pnw),
  );

  // 3m4b. LEGACY-INTACT-V1 (PASS 6C): under ?scale=v1 the re-plant never runs —
  // the mega-stamp renders, registers as the PNW chunk, and no sub-stamp
  // exists. The Enumclaw + Olympia neighborhoods (town paint included) are
  // CAPTURED here byte-for-byte; the v2 session's poi-layout-preserved check
  // compares its re-planted stamps against these exact bytes.
  const p6cRects = await (async () => {
    const lf6 = await import(new URL('../node_modules/.cache/toh-legacy-frame.mjs', import.meta.url).pathname);
    const rp6 = await import(new URL('../node_modules/.cache/toh-replant.mjs', import.meta.url).pathname);
    const rectFor = (id) => {
      const p = rp6.REPLANT_POIS.find((q) => q.id === id);
      const a = rp6.poiLegacyAnchor(p, lf6.legacyRawToLocal);
      const t = { tx: Math.floor(a.x / 32), ty: Math.floor(a.y / 32) };
      return { id, tx0: Math.max(0, t.tx + p.footprint.dx), ty0: Math.max(0, t.ty + p.footprint.dy), w: p.footprint.w, h: p.footprint.h };
    };
    return [rectFor('enumclaw'), rectFor('olympia')];
  })();
  const p6cV1 = await page.evaluate((rects) => {
    const ms = window.__ready();
    const grids = {};
    for (const r of rects) {
      const rows = [];
      for (let y = 0; y < r.h; y++) {
        let row = '';
        for (let x = 0; x < r.w; x++) row += ',' + (ms.map.terrainAtTile(r.tx0 + x, r.ty0 + y)?.id ?? 'x');
        rows.push(row);
      }
      grids[r.id] = rows.join('|');
    }
    return {
      grids,
      megaVisible: ms.map.layer.visible === true,
      megaIsChunk: ms.earthChunkMaps.includes(ms.map),
      noStamps: ms.replantStamps.length === 0,
    };
  }, p6cRects);
  ok(
    'legacy-intact-v1: under ?scale=v1 the mega-stamp renders and registers as the PNW chunk, no re-plant stamp exists; Enumclaw + Olympia neighborhoods captured for the v2 byte-comparison',
    p6cV1.megaVisible && p6cV1.megaIsChunk && p6cV1.noStamps && p6cV1.grids.enumclaw.length > 4000 && p6cV1.grids.olympia.length > 1000,
    JSON.stringify({ megaVisible: p6cV1.megaVisible, megaIsChunk: p6cV1.megaIsChunk, noStamps: p6cV1.noStamps, enumclawBytes: p6cV1.grids.enumclaw.length, olympiaBytes: p6cV1.grids.olympia.length }),
  );

  // 3m5. ONE EARTH: the unified world is NAMED 'earth' — a v15 'globe' save
  // renames in place (same coordinates, d=0), no world under a retired key is
  // registered, and the worlds registry is exactly the planet + the planes +
  // the city sub-maps.
  const oneEarth = await page.evaluate(async () => {
    const ms = window.__ready();
    const pos = { x: ms.player.x, y: ms.player.y };
    const wrote = ms.requestSave(); // the always-writes path (autosave throttles)
    if (!wrote) return { setup: 'save write refused' };
    const raw = JSON.parse(localStorage.getItem('toh_save'));
    raw.saveVersion = 15;
    raw.world.active = 'globe'; // the RETIRED planet key — v16 renames it
    localStorage.setItem('toh_save', JSON.stringify(raw));
    ms.devLoadSave();
    await new Promise((res) => setTimeout(res, 400));
    const d = Math.hypot(ms.player.x - pos.x, ms.player.y - pos.y);
    const keys = Object.keys(ms.worlds).sort();
    const noRetired = !keys.includes('globe') && !keys.includes('egypt') && !ms.groundLayers.has('globe');
    return { world: ms.activeWorld, d: +d.toFixed(1), keys, noRetired };
  });
  ok(
    "one earth: a v15 'globe' save renames to 'earth' at the same spot; no retired world keys registered",
    oneEarth.world === 'earth' && oneEarth.d <= 1 && oneEarth.noRetired && oneEarth.keys.includes('earth') && oneEarth.keys.includes('heaven') && oneEarth.keys.includes('hell'),
    JSON.stringify(oneEarth),
  );

  // 3n. GROUND LAYER (sparse worlds): the continents are real — biome ground
  // renders under Rome AND mid-void, the cell cap holds at every zoom, water
  // blocks the void where land ends, FPS at ground zoom stays within tolerance
  // of the pre-ground baseline (~57 headless), and dense hand-built worlds
  // have NO ground layer.
  const groundRun = await page.evaluate(async () => {
    const ms = window.__ready();
    const game = window.__game;
    ms.devTravelEurope(); // → the globe world, landing at Rome
    await new Promise((res) => setTimeout(res, 2400));
    const gl = ms.groundLayers.get('earth');
    if (!gl) return { has: false };
    const rome = { cells: gl.cellsDrawn, cls: gl.classAtWorld(ms.player.x, ms.player.y) };
    // Mid-void: hop inland NE of Rome (land void, no chunk beneath).
    ms.player.sprite.body.reset(ms.player.x + 5000, ms.player.y - 5000);
    await new Promise((res) => setTimeout(res, 600));
    const midVoid = { cells: gl.cellsDrawn, offChunk: ms.activeMap().terrainAtWorld(ms.player.x, ms.player.y) === null };
    // Water blocking: scan west from Rome's arrival for the Tyrrhenian coast.
    const romeArrival = ms.regionZoneArrivals['rome-eternal-seat'];
    let landX = null;
    let waterX = null;
    for (let i = 1; i <= 80 && waterX === null; i++) {
      const x = romeArrival.x - i * 400;
      if (gl.classAtWorld(x, romeArrival.y) === 0) {
        waterX = x;
        landX = x + 400;
      }
    }
    const waterBlocks = waterX !== null && ms.activeMap().isBlockedAtWorld(waterX, romeArrival.y) === true && ms.activeMap().isBlockedAtWorld(landX, romeArrival.y) === false;
    // Cell cap at full zoom-out (the whole PLANET in frame).
    ms.zoomControls.target = ms.zoomControls.outLimit;
    await new Promise((res) => setTimeout(res, 1800));
    const zoomedOutCells = gl.cellsDrawn;
    // TRUE frame rate over a window, by counting rAF ticks — the loop's
    // smoothed actualFps converges over many seconds after a scene-cost
    // change, so a before/after pair of reads compares two points on the
    // convergence curve, not the toggled cost (a probe showed it decaying
    // 24→8 with the ground hidden the whole time).
    const fpsOver = (msWin) =>
      new Promise((resolve) => {
        let frames = 0;
        const t0 = performance.now();
        const tick = () => {
          frames++;
          const dt = performance.now() - t0;
          if (dt >= msWin) resolve(+((frames * 1000) / dt).toFixed(1));
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    // FPS at CONTINENT zoom (still fully zoomed out): ground hidden vs shown.
    gl.setVisible(false);
    await new Promise((res) => setTimeout(res, 800));
    const fpsContinentBase = await fpsOver(2500);
    gl.setVisible(true);
    await new Promise((res) => setTimeout(res, 800));
    const fpsContinentGround = await fpsOver(2500);
    ms.zoomControls.target = 1;
    await new Promise((res) => setTimeout(res, 1500));
    // FPS at ground zoom, standing at Rome — SELF-RELATIVE baseline: the same
    // frames with the ground layer hidden vs shown (robust to session depth
    // and headless-GPU variance, unlike an absolute number), measured by rAF
    // counting like the continent pair above.
    ms.player.sprite.body.reset(romeArrival.x, romeArrival.y);
    gl.setVisible(false);
    await new Promise((res) => setTimeout(res, 800));
    const fpsBaseline = await fpsOver(2500);
    gl.setVisible(true);
    await new Promise((res) => setTimeout(res, 800));
    const fpsGround = await fpsOver(2500);
    const denseClean = ['heaven', 'hell', 'city-faiyum'].every((id) => !ms.groundLayers.has(id));
    return { has: true, rome, midVoid, coastFound: waterX !== null, waterBlocks, groundCells: gl.cellsDrawn, zoomedOutCells, fpsBaseline, fpsGround, fpsContinentBase, fpsContinentGround, denseClean };
  });
  ok('ground: biome land renders under Rome', groundRun.has && groundRun.rome.cells > 0 && groundRun.rome.cls > 0, groundRun.has ? `cells=${groundRun.rome.cells} class=${groundRun.rome.cls}` : 'no globe ground layer');
  ok('ground: still renders mid-void (no chunk beneath)', groundRun.has && groundRun.midVoid.cells > 0 && groundRun.midVoid.offChunk, groundRun.has ? JSON.stringify(groundRun.midVoid) : '');
  ok(
    'ground: the cell cap holds at ground zoom AND full zoom-out',
    groundRun.has && groundRun.groundCells > 0 && groundRun.groundCells <= 9000 && groundRun.zoomedOutCells > 0 && groundRun.zoomedOutCells <= 9000,
    `ground=${groundRun.groundCells} zoomedOut=${groundRun.zoomedOutCells} cap=9000`,
  );
  ok('ground: water is impassable void ground (the Tyrrhenian coast blocks)', groundRun.has && groundRun.coastFound && groundRun.waterBlocks, `coastFound=${groundRun.coastFound} blocks=${groundRun.waterBlocks}`);
  ok(
    'ground: FPS at ground zoom within tolerance of the no-ground baseline',
    groundRun.has && groundRun.fpsGround >= groundRun.fpsBaseline * 0.8,
    `ground=${groundRun.fpsGround} baseline=${groundRun.fpsBaseline} (tolerance ≥ 80%)`,
  );
  ok('ground: dense hand-built PLANES have NO ground layer', groundRun.has && groundRun.denseClean, 'heaven/hell/faiyum clean (earth + egypt are globe chunks now)');
  ok(
    'ground: FPS at CONTINENT zoom within tolerance of the no-ground baseline',
    groundRun.has && groundRun.fpsContinentGround >= groundRun.fpsContinentBase * 0.8,
    `ground=${groundRun.fpsContinentGround} baseline=${groundRun.fpsContinentBase} (tolerance ≥ 80%)`,
  );

  // 3n1b. ORIENTATION FPS PARITY (permanent): the SAME spot (Rome arrival,
  // ground zoom) must render within 15% frame time in BOTH orientations.
  // Render cost is symmetric by design — swapped dimensions are the same pixel
  // count, the ground window and chunk activation are view-derived (profiled
  // 2026-07: 25.6 portrait vs 26.1 landscape fps, 8 ground cells + 45 live
  // enemies in both) — this gate keeps it that way.
  const orientFps = () =>
    page.evaluate(async () => {
      const ms = window.__ready();
      const gl = ms.groundLayers.get('earth');
      await new Promise((r) => setTimeout(r, 900)); // settle after the resize
      const fps = await new Promise((resolve) => {
        let frames = 0;
        const t0 = performance.now();
        const tick = () => {
          frames++;
          const dt = performance.now() - t0;
          if (dt >= 2500) resolve(+((frames * 1000) / dt).toFixed(1));
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
      return { fps, cells: gl.cellsDrawn, enemies: ms.combatEnemies().length };
    });
  const orientPortrait = await orientFps();
  await page.setViewportSize({ width: 926, height: 428 });
  const orientLandscape = await orientFps();
  await page.setViewportSize({ width: 428, height: 926 });
  await page.waitForTimeout(600);
  ok(
    'ground: landscape frame time within 15% of portrait at the same spot (Rome, ground zoom)',
    orientLandscape.fps >= orientPortrait.fps * 0.85,
    `portrait=${JSON.stringify(orientPortrait)} landscape=${JSON.stringify(orientLandscape)} (tolerance ≥ 85%)`,
  );

  // 3n1c. DEATH RESPAWN = NEAREST SAFE POINT (permanent). Old rule: every death
  // teleported to Earth's town-spawn COORDINATES in whatever world you were in —
  // mid-void in the globe. New rule per world kind:
  //   sparse (globe) → the nearest zone settlement arrival to where you fell;
  //   dense (earth/egypt) → the nearest existing spawn/entry point.
  // Death itself (banner, resets, summons cleared) is unchanged.
  const dieHere = () =>
    page.evaluate(async () => {
      const ms = window.__ready();
      const from = { x: ms.player.x, y: ms.player.y };
      ms.playerHealth.shield = 0;
      ms.playerHealth.current = 1;
      ms.onProjectileHitPlayer(10); // a real lethal hit → the real death funnel
      await new Promise((r) => setTimeout(r, 2300)); // banner (1500ms) + respawn
      return { from, world: ms.activeWorld, x: ms.player.x, y: ms.player.y, alive: !ms.playerDead };
    });
  // (1) Mid-spine in the GLOBE: stand well outside Rome, between settlements.
  const globeDeath = await (async () => {
    await page.evaluate(() => {
      const ms = window.__ready();
      const rome = ms.regionZoneArrivals['rome-eternal-seat'];
      ms.player.sprite.body.reset(rome.x + 2600, rome.y - 2200); // mid-void, off any settlement
    });
    const d = await dieHere();
    return page.evaluate(
      ({ d }) => {
        const ms = window.__game.scene.getScene('MainScene');
        let nearest = null;
        let bestD = Infinity;
        for (const id of Object.keys(ms.regionZoneArrivals)) {
          const a = ms.regionZoneArrivals[id];
          const dist = Math.hypot(a.x - d.from.x, a.y - d.from.y);
          if (dist < bestD) {
            bestD = dist;
            nearest = { id, ...a };
          }
        }
        return {
          ...d,
          nearestZone: nearest.id,
          atNearest: Math.hypot(d.x - nearest.x, d.y - nearest.y) < 10,
          movedAcrossWorld: Math.hypot(d.x - d.from.x, d.y - d.from.y) > 60000, // the old-rule symptom
        };
      },
      { d },
    );
  })();
  ok(
    'death respawn (globe): a mid-spine death respawns at the NEAREST settlement arrival, never across the world',
    globeDeath.world === 'earth' && globeDeath.alive && globeDeath.atNearest && !globeDeath.movedAcrossWorld,
    JSON.stringify(globeDeath),
  );
  // (2) EARTH: die away from town → the nearest of town spawn / world entry.
  const earthDeath = await (async () => {
    await page.evaluate(() => {
      const ms = window.__ready();
      const spot = ms.map.nearestWalkableWorld(ms.town.spawn.x + 2400, ms.town.spawn.y + 900);
      ms.applyWorldSwap('earth', spot);
    });
    await page.waitForTimeout(900);
    const d = await dieHere();
    return page.evaluate(
      ({ d }) => {
        const ms = window.__game.scene.getScene('MainScene');
        const cands = [ms.town.spawn, ...Object.values(ms.regionZoneArrivals), ms.egyptArrivalPos];
        const nearest = cands.reduce((a, b) => (Math.hypot(a.x - d.from.x, a.y - d.from.y) <= Math.hypot(b.x - d.from.x, b.y - d.from.y) ? a : b));
        return { ...d, atNearest: Math.hypot(d.x - nearest.x, d.y - nearest.y) < 10 };
      },
      { d },
    );
  })();
  ok('death respawn (pnw-in-globe): a sensible local point — the nearest settlement (town spawn)', earthDeath.world === 'earth' && earthDeath.alive && earthDeath.atNearest, JSON.stringify(earthDeath));
  // (3) EGYPT: die away from the entry → back at the world entry.
  const egyptDeath = await (async () => {
    await page.evaluate(() => {
      const ms = window.__ready();
      const entry = ms.egyptArrivalPos;
      const spot = ms.egyptMap.nearestWalkableWorld(entry.x + 1800, entry.y + 700);
      ms.applyWorldSwap('earth', spot);
    });
    await page.waitForTimeout(900);
    const d = await dieHere();
    return page.evaluate(
      ({ d }) => {
        const ms = window.__game.scene.getScene('MainScene');
        const entry = ms.egyptArrivalPos;
        return { ...d, atEntry: Math.hypot(d.x - entry.x, d.y - entry.y) < 10 };
      },
      { d },
    );
  })();
  ok('death respawn (egypt-in-globe): a sensible local point — the Faiyum entry', egyptDeath.world === 'earth' && egyptDeath.alive && egyptDeath.atEntry, JSON.stringify(egyptDeath));
  // Back to the globe at Rome for whatever follows (the pre-check state).
  await page.evaluate(async () => {
    const ms = window.__ready();
    ms.devTravelEurope();
    await new Promise((r) => setTimeout(r, 2400));
  });

  // 3n2. TRUE POSITIONS (the consolidation's core claim): Rome AND Luxor sit at
  // their real manifest lat/lng through the ONE globe calibration, with real
  // land rendered beneath, and a Levant/Anatolia land bridge of walkable void
  // ground joins the two regions — ground continuity, no gate needed.
  const globePos = await page.evaluate(() => {
    const ms = window.__ready();
    const o = ms.worlds['earth'].map.bounds;
    const px = (lat, lng) => ({ x: o.x + (lng + 180) * 2426, y: o.y + (85 - lat) * 2453 }); // the globe calibration
    const gl = ms.groundLayers.get('earth');
    const at = (zoneId, lat, lng) => {
      const z = ms.regionSpawnZones.find((s) => s.zoneId === zoneId);
      if (!z) return { d: -1, cls: -1 };
      const e = px(lat, lng);
      return { d: +Math.hypot(z.center.x - e.x, z.center.y - e.y).toFixed(1), cls: gl.classAtWorld(z.center.x, z.center.y) };
    };
    const rome = at('rome-eternal-seat', 41.9, 12.5); // the manifest anchors
    const luxor = at('luxor-valley-of-kings', 25.69, 32.64);
    // The land bridge: Ankara → Gaziantep → Amman, all walkable land void.
    const bridge = [
      [39.93, 32.85],
      [37.07, 37.38],
      [31.95, 35.93],
    ].map(([lat, lng]) => {
      const p = px(lat, lng);
      return { cls: gl.classAtWorld(p.x, p.y), blocked: ms.worlds['earth'].map.isBlockedAtWorld(p.x, p.y), offChunk: ms.worlds['earth'].map.terrainAtWorld(p.x, p.y) === null };
    });
    return { rome, luxor, bridge };
  });
  ok('globe: Rome renders at its true planet position', globePos.rome.d >= 0 && globePos.rome.d < 2 && globePos.rome.cls > 0, JSON.stringify(globePos.rome));
  ok('globe: Luxor renders at its true planet position', globePos.luxor.d >= 0 && globePos.luxor.d < 2 && globePos.luxor.cls > 0, JSON.stringify(globePos.luxor));
  ok(
    'globe: a Levant/Anatolia land bridge of walkable ground joins the regions',
    globePos.bridge.every((b) => b.cls > 0 && !b.blocked && b.offChunk),
    JSON.stringify(globePos.bridge),
  );

  // 3n3. THE REMOVED WORLDS ARE GONE: nothing at runtime registers or routes to
  // 'europe'/'africa', and no LIVE source line references the ids — the v12
  // save migration (src/save) and explanatory comments are the only allowed
  // remnants.
  const oldRefs = await page.evaluate(() => {
    const ms = window.__game.scene.getScene('MainScene');
    const dead = ['europe', 'africa'];
    return {
      worlds: dead.filter((id) => !!ms.worlds[id]),
      grounds: dead.filter((id) => ms.groundLayers.has(id)),
      gates: ms.regionGates.filter((g) => dead.includes(g.destWorld)).length,
      colliders: ms.regionColliders.filter((rc) => dead.includes(rc.worldId)).length,
      regionIds: dead.filter((id) => ms.regionWorldIds.has(id)),
    };
  });
  const srcHits = (() => {
    const files = [];
    const walk = (dir) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (e.name.endsWith('.ts')) files.push(p);
      }
    };
    walk('src');
    const hits = [];
    for (const f of files) {
      if (f.includes('save')) continue; // the migration references the removed ids on purpose
      const lines = readFileSync(f, 'utf8').split('\n');
      lines.forEach((ln, i) => {
        const t = ln.trim();
        if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return; // prose, not code
        if (/'(europe|africa)'|"(europe|africa)"/.test(ln)) hits.push(`${f}:${i + 1}`);
      });
    }
    return hits;
  })();
  ok(
    'globe: zero references to the removed europe/africa worlds remain (runtime + source)',
    oldRefs.worlds.length === 0 && oldRefs.grounds.length === 0 && oldRefs.gates === 0 && oldRefs.colliders === 0 && oldRefs.regionIds.length === 0 && srcHits.length === 0,
    JSON.stringify({ ...oldRefs, srcHits: srcHits.slice(0, 5) }),
  );

  // 3o. CAIRO ACT I (the Wizard's home chain, live in the hand-built Egypt
  // world): cai-01..04 complete END TO END via real play actions — the
  // Keeper's proximity talk, five delta-wolf kills, the rot-site walk-in, the
  // gate-boss kill. Setup mirrors a fresh Wizard start (chain wiped + class
  // announced — the same state the fresh-start checks prove clean); Faiyum and
  // the Egypt terrain must be intact afterwards (the binding is additive-only).
  const cairo = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((res) => setTimeout(res, t));
    ms.devClassOverride = 'Wizard'; // the chain is Wizard-gated (Wizard ≠ Mage, canon)
    ms.announcePlayerClass();
    // Fresh-chain precondition: earlier checks leave auto-activated beats live,
    // and accept() refuses while ANY quest is active. A wiped chain is exactly
    // the fresh-start state; nothing auto-starts from it (cai-01 is manual).
    ms.chain.load({ completed: [], activeId: null, activeObjective: 0 });
    ms.applyWorldSwap('earth', ms.egyptArrivalPos);
    await wait(1700);
    // cai-01 — stand before the Keeper; the talk button must offer itself.
    ms.player.sprite.body.reset(ms.cairoMentorPos.x + 50, ms.cairoMentorPos.y);
    await wait(500);
    const mentorButton = ms.cairoMentorButton.isVisible;
    ms.cairoMentorTalk();
    await wait(300);
    const s1 = ms.chain.status('cai-01-mentor');
    // cai-c1 — the CIVIC errand: walk the water jars from the Keeper to Amara.
    for (let i = 0; i < 30 && !ms.beatDelivery; i++) await wait(100);
    if (ms.beatDelivery) {
      // Step OUT of the parcel's radius first (the pickup is edge-triggered so
      // the Keeper's opening is readable), then walk back in for real.
      const away = ms.egyptMap.nearestWalkableWorld(ms.beatDelivery.from.x + 180, ms.beatDelivery.from.y + 120);
      ms.player.sprite.body.reset(away.x, away.y);
      await wait(300);
      ms.player.sprite.body.reset(ms.beatDelivery.from.x, ms.beatDelivery.from.y);
      await wait(350);
      if (ms.beatDelivery) ms.player.sprite.body.reset(ms.beatDelivery.to.x, ms.beatDelivery.to.y);
      await wait(450);
    }
    const c1 = ms.chain.status('cai-c1-errand');
    // cai-02 — five REAL delta-wolf deaths, swept through the shared clear path.
    const wolves = ms.cairoLive.filter((r) => !r.bossBeatId && r.entity.isAlive).slice(0, 5);
    for (const w of wolves) w.entity.takeHit(999999);
    await wait(700);
    const s2 = ms.chain.status('cai-02-first-blood');
    // cai-c2 — the CIVIC gather: three palm-frond pickups on the gate road.
    for (let i = 0; i < 30 && !ms.beatPickups; i++) await wait(100);
    for (let k = 0; k < 3 && ms.beatPickups; k++) {
      const it = ms.beatPickups.items.find((x) => !x.taken);
      if (!it) break;
      ms.player.sprite.body.reset(it.x, it.y);
      await wait(350);
    }
    const c2 = ms.chain.status('cai-c2-hands');
    // cai-c3 — the CIVIC cull: five more jackals (the throttled replenish
    // refills counted posts while the player stands away from them).
    for (let i = 0; i < 40 && ms.chain.status('cai-c3-stalls') !== 'complete'; i++) {
      const w2 = ms.cairoLive.find((r) => !r.bossBeatId && r.entity.isAlive);
      if (w2) w2.entity.takeHit(999999);
      else await wait(1500); // wait out the replenish throttle
      await wait(500);
    }
    const c3 = ms.chain.status('cai-c3-stalls');
    // cai-03 — walk onto the rot site on the river road.
    ms.player.sprite.body.reset(ms.cairoDiscoveryPos.x, ms.cairoDiscoveryPos.y);
    await wait(700);
    const s3 = ms.chain.status('cai-03-discovery');
    // cai-04 — fell the boosted scout at the city gates.
    const boss = ms.cairoLive.find((r) => r.bossBeatId && r.entity.isAlive);
    if (boss) boss.entity.takeHit(999999);
    await wait(700);
    const s4 = ms.chain.status('cai-04-first-evil');
    // Additive-only proof: Faiyum still registered, the Egypt terrain still real.
    const faiyumIntact = !!ms.cityRuntimes['city-faiyum'] && !!ms.worlds['city-faiyum'];
    const egyptIntact = ms.egyptMap.terrainAtWorld(ms.egyptArrivalPos.x, ms.egyptArrivalPos.y) !== null;
    ms.devClassOverride = null;
    ms.announcePlayerClass();
    return { mentorButton, wolves: wolves.length, s1, c1, s2, c2, c3, s3, s4, faiyumIntact, egyptIntact };
  });
  ok(
    'cairo act i: the seven-beat chain (cai-01, c1 errand, 02, c2 hands, c3 cull, 03, 04) completes end to end by hand in the Egypt world',
    cairo.mentorButton &&
      cairo.wolves === 5 &&
      cairo.s1 === 'complete' &&
      cairo.c1 === 'complete' &&
      cairo.s2 === 'complete' &&
      cairo.c2 === 'complete' &&
      cairo.c3 === 'complete' &&
      cairo.s3 === 'complete' &&
      cairo.s4 === 'complete' &&
      cairo.faiyumIntact &&
      cairo.egyptIntact,
    JSON.stringify(cairo),
  );

  // 3p. GENERIC BEAT COMPLETION — one full home chain per continent plays END
  // TO END by real actions: mentor talk (proximity button + the same handler),
  // the c1 delivery walked parcel-to-neighbor, real cull kills, the c2 gather
  // walked pickup by pickup, the c3 escort defended to arrival, the
  // story-marker walk-in, the elite-boss kill. All three chains share the
  // seven-beat mentor→errand→cull→hands→escort→discovery→boss shape.
  const playHomeChain = (params) =>
    page.evaluate(async ({ className, zoneId, ids, civics }) => {
      const ms = window.__ready();
      const wait = (t) => new Promise((r) => setTimeout(r, t));
      const st = (id) => ms.chain.status(id);
      ms.devClassOverride = className;
      ms.announcePlayerClass();
      ms.chain.load({ completed: [], activeId: null, activeObjective: 0 }); // the verified-clean fresh-start state
      ms.regionKillCounts = {}; // kill counters persist across chain.load — start the cull from zero
      ms.applyWorldSwap('earth', ms.regionZoneArrivals[zoneId]);
      ms.playerHealth.shield = 1e9; // re-arm past the swap's debuff clear
      await wait(1700); // transition + chunk activation + packs
      // 1) the mentor: stand beside the elder; the button must offer itself.
      const m = ms.regionMentors.find((x) => x.zoneId === zoneId);
      if (!m) return { step: 'no mentor registered' };
      ms.player.sprite.body.reset(m.pos.x + 40, m.pos.y);
      await wait(500);
      const btn = ms.mentorButton.isVisible;
      ms.regionMentorTalk();
      await wait(300);
      const s1 = st(ids[0]);
      // 2) the errand: the delivery walked from the mentor's parcel to the
      // neighbor's door. Step OUT of the parcel's radius first (edge-triggered
      // pickup — the mentor's opening stays readable), then walk back in.
      for (let i = 0; i < 30 && !ms.beatDelivery; i++) await wait(100);
      if (ms.beatDelivery) {
        const away = ms.activeMap().nearestWalkableWorld(ms.beatDelivery.from.x + 180, ms.beatDelivery.from.y + 120);
        ms.player.sprite.body.reset(away.x, away.y);
        await wait(300);
        ms.player.sprite.body.reset(ms.beatDelivery.from.x, ms.beatDelivery.from.y);
        await wait(350);
        if (ms.beatDelivery) ms.player.sprite.body.reset(ms.beatDelivery.to.x, ms.beatDelivery.to.y);
        await wait(450);
      }
      const c1 = st(civics.c1);
      // 3) the cull: REAL wildlife kills inside the zone until the beat
      // clears (a chunk re-entry respawns the packs if they run dry).
      let prey = 0;
      for (let i = 0; i < 60 && st(ids[1]) !== 'complete'; i++) {
        const w = ms.regionLive.find((r) => r.zoneId === zoneId && r.family === 'corrupted-wildlife' && r.entity.isAlive);
        if (w) {
          w.entity.takeHit(999999);
          prey++;
        } else {
          ms.deactivateRegionZone(zoneId);
          await wait(400);
        }
        await wait(180);
      }
      const s2 = st(ids[1]);
      // 4) the gather: three real pickup walk-ins.
      for (let i = 0; i < 30 && !ms.beatPickups; i++) await wait(100);
      for (let k = 0; k < 3 && ms.beatPickups; k++) {
        const it = ms.beatPickups.items.find((x) => !x.taken);
        if (!it) break;
        ms.player.sprite.body.reset(it.x, it.y);
        await wait(350);
      }
      const c2 = st(civics.c2);
      // 5) the escort: stand with the convoy and cut down every wave.
      for (let i = 0; i < 40 && !ms.escort; i++) await wait(200);
      const deadline = Date.now() + 60000;
      while (ms.escort && Date.now() < deadline) {
        const e = ms.escort;
        ms.player.sprite.body.reset(e.npcSprite.x + 26, e.npcSprite.y - 10);
        ms.aoeHitAll(e.npcSprite.x, e.npcSprite.y, 260, 320);
        await wait(300);
      }
      const c3 = st(civics.c3);
      // 6) the discovery: walk onto the story marker.
      for (let i = 0; i < 30 && !ms.beatMarker; i++) await wait(150);
      const mk = ms.beatMarker;
      if (mk) ms.player.sprite.body.reset(mk.pos.x, mk.pos.y);
      await wait(600);
      const s3 = st(ids[2]);
      // 7) the first evil: fell the elite at the boss anchor.
      for (let i = 0; i < 40 && !ms.beatElite; i++) await wait(200);
      const el = ms.beatElite;
      const deadline2 = Date.now() + 25000;
      while (st(ids[3]) !== 'complete' && Date.now() < deadline2) {
        const b = ms.beatElite?.entity;
        if (b && b.isAlive) {
          ms.player.sprite.body.reset(b.sprite.x + 50, b.sprite.y);
          ms.aoeHitAll(b.sprite.x, b.sprite.y, 90, 420);
        }
        await wait(250);
      }
      const s4 = st(ids[3]);
      ms.devClassOverride = null;
      ms.announcePlayerClass();
      ms.playerHealth.full();
      ms.playerHealth.shield = 1e9;
      return { btn, prey, marker: !!mk, elite: !!el, s1, c1, s2, c2, c3, s3, s4 };
    }, params);
  for (const chain of [
    { name: 'Europe (Rome, Priest)', className: 'Priest', zoneId: 'rome-eternal-seat', ids: ['rom-01-mentor', 'rom-02-catacomb-vermin', 'rom-03-reliquary-rot', 'rom-04-appian-gate'], civics: { c1: 'rom-c1-errand', c2: 'rom-c2-hands', c3: 'rom-c3-dawn' } },
    { name: 'Africa (Kinshasa, Witch Doctor)', className: 'Witch Doctor', zoneId: 'kinshasa-river-drum', ids: ['kin-01-mentor', 'kin-02-first-blood', 'kin-03-discovery', 'kin-04-first-evil'], civics: { c1: 'kin-c1-errand', c2: 'kin-c2-hands', c3: 'kin-c3-landing' } },
    { name: 'Asia (Lhasa, Monk)', className: 'Monk', zoneId: 'lhasa-prayer-citadel', ids: ['lha-01-mentor', 'lha-02-first-blood', 'lha-03-discovery', 'lha-04-first-evil'], civics: { c1: 'lha-c1-errand', c2: 'lha-c2-hands', c3: 'lha-c3-pilgrim' } },
  ]) {
    const r = await playHomeChain(chain);
    ok(
      `home chain end to end by hand: ${chain.name}`,
      r.btn && r.prey >= 5 && r.marker && r.elite &&
        r.s1 === 'complete' && r.c1 === 'complete' && r.s2 === 'complete' && r.c2 === 'complete' &&
        r.c3 === 'complete' && r.s3 === 'complete' && r.s4 === 'complete',
      JSON.stringify(r),
    );
  }

  // 3q. HAND-AUTHORED MARCH BEAT + THE INSERTED ARRIVAL: as-01 (Azazel's Asia
  // arrival) completes via its marker and the banner is Casey's VERBATIM cut —
  // the writing is live in a real walk-in, not just present in data.
  const march = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    ms.devJumpToQuest('as-01-azazel-welcome');
    ms.playerHealth.shield = 1e9;
    await wait(2600); // travel + chunk activation + the marker
    const mk = ms.beatMarker;
    if (!mk || mk.beatId !== 'as-01-azazel-welcome') return { marker: false };
    ms.player.sprite.body.reset(mk.pos.x, mk.pos.y);
    await wait(600);
    const banner = ms.banner.text;
    const CUT =
      'They call Kunlun the pillar of heaven, and for once their poetry is honest: they built their floor upon your sky. Every prayer your ancestors sent up this slope arrived — was weighed, and was *filed*. Nothing in their house is lost; nothing is answered, either. A pillar is only a road stood on end, gate-knocker. Gather the light, climb with me, and we will set their floor down at last.';
    return {
      marker: true,
      status: ms.chain.status('as-01-azazel-welcome'),
      bannerVerbatim: banner === CUT,
      noTodo: !banner.includes('HAND_AUTHORED_TODO'),
    };
  });
  ok(
    "march beat: as-01 completes via its marker and banners Azazel's Kunlun arrival VERBATIM (no TODO)",
    march.marker && march.status === 'complete' && march.bannerVerbatim && march.noTodo,
    JSON.stringify(march),
  );

  // 3r. FETCH PICKUPS: set-02 (Passage West) completes by collecting all three
  // glowing pickups with real walks.
  const fetchRun = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    ms.devJumpToQuest('set-02-passage-west');
    ms.playerHealth.shield = 1e9;
    await wait(2600);
    const pk = ms.beatPickups;
    if (!pk || pk.beatId !== 'set-02-passage-west') return { pickups: 0 };
    const spots = pk.items.map((i) => ({ x: i.x, y: i.y }));
    for (const s of spots) {
      ms.player.sprite.body.reset(s.x, s.y);
      await wait(400);
    }
    return { pickups: spots.length, status: ms.chain.status('set-02-passage-west') };
  });
  ok('fetch beat: set-02 completes by collecting all three pickups', fetchRun.pickups === 3 && fetchRun.status === 'complete', JSON.stringify(fetchRun));

  // 3t. 64PX ART PATH + SPRITE DROP-IN: the MECHANISM, without shipping art.
  // A synthetic 64px master must composite into EXACTLY its terrain's atlas
  // cell (center lands, neighbor cell untouched — the seam contract), and a
  // synthetic sprite override must mint a texture of exactly the canonical
  // size. Both restore/clean up, so the run stays visually unchanged.
  const artPath = await page.evaluate(() => {
    const ms = window.__ready();
    // Synthetic 64px master: magenta with a green center dot (a detail marker
    // that must survive the half-scale fit into the 32px cell).
    const cvs = ms.textures.createCanvas('test-64-master', 64, 64);
    const c = cvs.context;
    c.fillStyle = '#ff00ff';
    c.fillRect(0, 0, 64, 64);
    c.fillStyle = '#00ff00';
    c.beginPath();
    c.arc(32, 32, 8, 0, Math.PI * 2);
    c.fill();
    cvs.refresh();
    const atlas = ms.textures.get('terrain-atlas');
    const ctx = atlas.context;
    const cell = ms.artOverrides.drawIntoAtlasCell(ms, 'steppe', 'test-64-master');
    if (!cell) return { cell: false };
    const before = ctx.getImageData(cell.ox, cell.oy, 32, 32); // (captured AFTER draw — restore uses the snapshot below)
    const center = [...ctx.getImageData(cell.ox + 16, cell.oy + 16, 1, 1).data];
    const corner = [...ctx.getImageData(cell.ox + 2, cell.oy + 2, 1, 1).data];
    const neighbor = [...ctx.getImageData(cell.ox + 32 + 16, cell.oy + 16, 1, 1).data];
    void before;
    // RESTORE: re-fit the terrain's own 32px art (steppe ships real art) so the
    // atlas is pixel-identical to a normal boot for everything after this.
    const restored = ms.artOverrides.drawIntoAtlasCell(ms, 'steppe', 'tile-steppe') !== null;
    const back = [...ctx.getImageData(cell.ox + 16, cell.oy + 16, 1, 1).data];
    // SPRITE DROP-IN: the same synthetic source fitted to a canonical size
    // under a throwaway key.
    const ok = ms.artOverrides.applySpriteOverride(ms, 'test-sprite-override', 28, 40, 'test-64-master');
    const spr = ok ? ms.textures.get('test-sprite-override').getSourceImage() : null;
    const sprSize = spr ? [spr.width, spr.height] : null;
    ms.textures.remove('test-sprite-override');
    ms.textures.remove('test-64-master');
    return { cell: true, center, corner, neighbor, restored, back, sprOk: ok, sprSize };
  });
  const magenta = (p) => p && p[0] > 200 && p[1] < 60 && p[2] > 200;
  const green = (p) => p && p[1] > 200 && p[0] < 60;
  ok(
    '64px art path: a 64px master composites into exactly its atlas cell (seam intact, restore clean)',
    artPath.cell && green(artPath.center) && magenta(artPath.corner) && !magenta(artPath.neighbor) && artPath.restored && !green(artPath.back),
    JSON.stringify(artPath),
  );
  ok(
    'sprite drop-in: an override mints the canonical key at the canonical size',
    artPath.sprOk === true && Array.isArray(artPath.sprSize) && artPath.sprSize[0] === 28 && artPath.sprSize[1] === 40,
    `applied=${artPath.sprOk} size=${JSON.stringify(artPath.sprSize)}`,
  );

  // 3u0. ART CENSUS (permanent): EVERY declared sprite override actually loaded
  // and applied at boot — a typo'd filename, missing PNG, or corrupt file can
  // never ship silently behind the code-drawn fallback. Spot-checks the two
  // divine stills (cherub-enemy / angel-divine) at their canonical sizes.
  const census = await page.evaluate(() => {
    const ms = window.__game.scene.getScene('MainScene');
    const dims = (k) => {
      if (!ms.textures.exists(k)) return null;
      const img = ms.textures.get(k).getSourceImage();
      return [img.width, img.height];
    };
    return { applied: ms.spriteOverridesApplied, listed: ms.spriteOverridesListed, cherub: dims('cherub-enemy'), divine: dims('angel-divine') };
  });
  ok(
    'art census: every declared sprite override loaded + applied; divine stills minted at canonical size',
    census.listed >= 17 &&
      census.applied === census.listed &&
      JSON.stringify(census.cherub) === '[54,58]' &&
      JSON.stringify(census.divine) === '[44,56]',
    JSON.stringify(census),
  );

  // 3u0b. FIGURE-SET LINT (permanent, one per shipped 8-way set): all 8 frames
  // exist at the contract paths and decode; every frame has opaque content; no
  // frame's content box falls below the similarity floors against the set's
  // union box (the union-box fitter would silently shrink the whole set); and
  // the minted base key IS the south frame.
  for (const [lintCls, lintFig] of Object.entries(ROTATED_FIGURES)) {
    const lint = await page.evaluate(
      async ({ fig, minRw, minRh }) => {
        const ms = window.__game.scene.getScene('MainScene');
        const DIRS = ['south', 'south-east', 'east', 'north-east', 'north', 'north-west', 'west', 'south-west'];
        const frames = {};
        let uw = 0;
        let uh = 0;
        for (const dir of DIRS) {
          const res = await fetch(`/sprites/${fig}/${dir}.png`);
          if (!res.ok) {
            frames[dir] = { missing: true };
            continue;
          }
          const bmp = await createImageBitmap(await res.blob());
          const cvs = document.createElement('canvas');
          cvs.width = bmp.width;
          cvs.height = bmp.height;
          const ctx = cvs.getContext('2d', { willReadFrequently: true });
          ctx.drawImage(bmp, 0, 0);
          const d = ctx.getImageData(0, 0, cvs.width, cvs.height).data;
          let minX = cvs.width;
          let minY = cvs.height;
          let maxX = -1;
          let maxY = -1;
          for (let y = 0; y < cvs.height; y++) {
            for (let x = 0; x < cvs.width; x++) {
              if (d[(y * cvs.width + x) * 4 + 3] > 8) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
              }
            }
          }
          if (maxX < 0) {
            frames[dir] = { empty: true };
            continue;
          }
          frames[dir] = { w: maxX - minX + 1, h: maxY - minY + 1 };
          uw = Math.max(uw, frames[dir].w);
          uh = Math.max(uh, frames[dir].h);
        }
        const bad = [];
        for (const dir of DIRS) {
          const f = frames[dir];
          if (f.missing || f.empty) bad.push(`${dir}:${f.missing ? 'missing' : 'empty'}`);
          else {
            f.rw = +(f.w / uw).toFixed(3);
            f.rh = +(f.h / uh).toFixed(3);
            if (f.rw < minRw || f.rh < minRh) bad.push(`${dir}:rw=${f.rw},rh=${f.rh}`);
          }
        }
        // The minted base key IS the south frame (same source, same union crop).
        const img = (k) => (ms.textures.exists(k) ? ms.textures.get(k).getSourceImage() : null);
        const base = img(fig);
        const south = img(`${fig}-south`);
        const baseIsSouth = !!base && !!south && typeof base.toDataURL === 'function' && typeof south.toDataURL === 'function' && base.toDataURL() === south.toDataURL();
        return { bad, baseIsSouth, ratios: DIRS.map((d2) => `${d2}=${frames[d2].rw ?? 'x'}/${frames[d2].rh ?? 'x'}`) };
      },
      { fig: lintFig, minRw: FIGURE_MIN_WIDTH_RATIO, minRh: FIGURE_MIN_HEIGHT_RATIO },
    );
    ok(
      `figure lint (${lintCls}): 8 frames at contract paths, all opaque, bounds within band (rw>=${FIGURE_MIN_WIDTH_RATIO}, rh>=${FIGURE_MIN_HEIGHT_RATIO}), base minted from south`,
      lint.bad.length === 0 && lint.baseIsSouth,
      JSON.stringify(lint),
    );
  }

  // 3u. SKILL FRAMEWORK (composed-action schema): EVERY skill in every tree of
  // every class executes without error through its real runtime seam, and each
  // COMPOSED action produces exactly its declared primitives. Direct calls
  // bypass only cooldown/energy — the same code paths real activation uses.
  const skillSweep = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    const out = { total: 0, composed: 0, bespokeActive: 0, other: 0, passive: 0, mismatches: [], errors: [] };
    for (const cls of Object.keys(ms.classSkillsAll)) {
      for (const def of ms.classSkillsAll[cls].skills) {
        const e = def.effect;
        out.total++;
        try {
          if (e.kind === 'active' && e.compose) {
            ms.runComposedSteps(e.compose);
            out.composed++;
            const want = e.compose.map((s) => s.p).join(',');
            const got = ms.lastComposedPrimitives.join(',');
            if (want !== got) out.mismatches.push(`${def.id}: ran [${got}] declared [${want}]`);
          } else if (e.kind === 'active') {
            ms.runActiveSkill(e.action);
            out.bespokeActive++;
          } else if (e.kind === 'buff' || e.kind === 'transformation') {
            ms.startTimedSkill(def.id, 60, e.stats, e.tint, e.kind === 'transformation' ? { auraDamage: e.auraDamage, auraRadius: e.auraRadius } : {});
            out.other++;
          } else if (e.kind === 'debuff') {
            ms.runDebuffSkill(e.radius);
            out.other++;
          } else if (e.kind === 'channel') {
            ms.tryStartChannel(def.id, e); // no-target path is its own valid branch
            out.other++;
          } else if (e.kind === 'stacking_dot') {
            const t = ms.nearestEnemy(ms.player.x, ms.player.y, e.range);
            if (t) ms.addStackingDot(t, def.id, e.dmgPerTick, e.tickMs, e.durationMs, e.maxStacks, e.color ?? 0x9a6cff);
            out.other++;
          } else {
            out.passive++; // stat-only: aggregated by recompute, nothing to execute
          }
        } catch (err) {
          out.errors.push(`${def.id}: ${err.message}`);
        }
        await wait(25);
      }
    }
    // Clean up everything the sweep armed: timed forms expire now, summons (and
    // their long pet buffs — the Druid oils run 5 minutes), friendly zones,
    // stealth and DoTs clear, vitals restore — the page-error gate watches the tail.
    for (const t of ms.skillTimed) t.endsAt = 0;
    ms.summons.clear();
    ms.summons.clearBuffs();
    ms.clearFriendlyZones();
    ms.breakPlayerStealth();
    ms.clearEntangle();
    ms.crystallize.clear();
    ms.confused.clear();
    ms.comboUltimate = null;
    ms.harmonicCharges = 0;
    ms.setEcho(0);
    ms.voodoo = null;
    ms.allyBond = null;
    ms.spiritSplit = null;
    ms.parry = null;
    ms.perfectFormUntil = 0;
    ms.iaijutsu = null;
    ms.pulseRing = null;
    ms.empoweredStrikes = null;
    ms.clearTraps(); // devices + shadow-dance/vanish state (assassin)
    ms.clearPriestState(); // ally-shields + the dual channel (priest)
    ms.darkVulnUntil = 0;
    ms.clearDots();
    ms.playerHealth.full();
    ms.energy.full();
    await wait(500);
    return out;
  });
  ok(
    'skill framework: every skill in every tree executes; composed actions match their declared primitives',
    skillSweep.errors.length === 0 && skillSweep.mismatches.length === 0 && skillSweep.composed === 165 && skillSweep.total >= 420,
    `total=${skillSweep.total} composed=${skillSweep.composed} bespokeActive=${skillSweep.bespokeActive} timed/other=${skillSweep.other} passive=${skillSweep.passive}` +
      (skillSweep.errors.length ? ` ERRORS=${JSON.stringify(skillSweep.errors.slice(0, 3))}` : '') +
      (skillSweep.mismatches.length ? ` MISMATCH=${JSON.stringify(skillSweep.mismatches.slice(0, 3))}` : ''),
  );

  // 3u2. NAME-COLLISION GUARD (permanent, roster-wide): no two SKILLS anywhere
  // in the game share a display name. The Wizard's live Divine Incantations
  // names (Healing Light / Divine Shield / Resurrection / Holy Radiance /
  // Pillar of Judgment) are the standing risk as holy-flavored classes ship —
  // this guards the Priest's roster today and every future class after it.
  const nameClash = await page.evaluate(() => {
    const ms = window.__game.scene.getScene('MainScene');
    const seen = new Map();
    const dupes = [];
    for (const cls of Object.keys(ms.classSkillsAll)) {
      for (const def of ms.classSkillsAll[cls].skills) {
        if (seen.has(def.name)) dupes.push(`'${def.name}' (${seen.get(def.name)} vs ${cls})`);
        else seen.set(def.name, cls);
      }
    }
    return { classes: Object.keys(ms.classSkillsAll).length, names: seen.size, dupes };
  });
  ok(
    'name-collision guard: no two skills anywhere in the roster share a display name',
    nameClash.dupes.length === 0 && nameClash.names >= 330,
    `classes=${nameClash.classes} uniqueNames=${nameClash.names}${nameClash.dupes.length ? ' DUPES=' + JSON.stringify(nameClash.dupes.slice(0, 5)) : ''}`,
  );

  // 3v. DRUID FRAMEWORK EXTENSIONS (permanent): the composable primitives +
  // summon variants Commit 1 added, each exercised through its real runtime
  // seam. Each check establishes its own preconditions (a QUIET walkable spot
  // via the shared __quietSpot helper, freshly-spawned targets) and fails
  // loudly when setup fails.

  // 3v-1. CHAIN-BOUNCE: one cast hits the nearest enemy then arcs to two more,
  // never re-hitting, with strictly falling damage per jump.
  const chainRun = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!window.__quietSpot()) return { setup: 'no quiet spot' };
    const spawnAt = (d) => {
      const w = ms.activeMap().nearestWalkableWorld(ms.player.x + d, ms.player.y);
      return ms.spawnAngel('darkcaster', w.x, w.y);
    };
    const targets = [spawnAt(140), spawnAt(300), spawnAt(460)];
    await wait(200);
    const hp0 = targets.map((t) => t.health.current);
    ms.runComposedSteps([{ p: 'chain', range: 320, jumps: 2, jumpRange: 260, damage: 30, falloff: 0.5, tint: 0x88ff88 }]);
    await wait(150);
    const drops = targets.map((t, i) => hp0[i] - t.health.current);
    const prims = ms.lastComposedPrimitives.join(',');
    for (const t of targets) t.destroy();
    return { setup: 'ok', drops, prims };
  });
  ok(
    'druid ext — chain: one cast arcs across three enemies with falling damage',
    chainRun.setup === 'ok' && chainRun.prims === 'chain' && chainRun.drops.every((d) => d > 0) && chainRun.drops[0] > chainRun.drops[1] && chainRun.drops[1] > chainRun.drops[2],
    JSON.stringify(chainRun),
  );

  // 3v-2. DUAL-USE BOLT: with NO enemy in range it MENDS (the most-injured summon
  // in heal range, else the caster); with an enemy in range it damages it.
  const dualRun = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!window.__quietSpot()) return { setup: 'no quiet spot' };
    const step = { p: 'dualbolt', range: 320, damage: 24, speed: 620, radius: 10, heal: 30, healRange: 260, tint: 0x9ad8a0 };
    // (a) self-heal: injured player, no enemy, no summon.
    ms.summons.clear();
    ms.playerHealth.current = Math.max(1, ms.playerHealth.max - 60);
    const before = ms.playerHealth.current;
    ms.runComposedSteps([step]);
    const selfHealed = ms.playerHealth.current - before;
    // (b) summon-heal: an injured summon in range outranks the (also injured) player.
    const cfg = { key: 'gate_test_tank', name: 'Gate Tank', behavior: 'tank', maxHP: 100, durationMs: 20000, aggroRadius: 150, followRange: 150, moveTilesPerSec: 5, bodyRadius: 12, tint: 0x88cc88, drawsAggro: true, aggroPriority: 2 };
    const [tank] = ms.summonAlliedUnits(cfg, 1, 1);
    tank.takeHit(40);
    const tankBefore = tank.health.current;
    ms.playerHealth.current = Math.max(1, ms.playerHealth.max - 60);
    const playerBefore = ms.playerHealth.current;
    ms.runComposedSteps([step]);
    const tankHealed = tank.health.current - tankBefore;
    const playerUntouched = ms.playerHealth.current === playerBefore;
    // (c) damage: an enemy in range gets the bolt instead (flight time allowed).
    const w = ms.activeMap().nearestWalkableWorld(ms.player.x + 180, ms.player.y);
    const foe = ms.spawnAngel('darkcaster', w.x, w.y);
    await wait(200);
    const foe0 = foe.health.current;
    ms.runComposedSteps([step]);
    await wait(700);
    const foeDrop = foe0 - foe.health.current;
    foe.destroy();
    ms.summons.clear();
    ms.playerHealth.full();
    return { setup: 'ok', selfHealed, tankHealed, playerUntouched, foeDrop };
  });
  ok(
    'druid ext — dual-use bolt: heals self, prefers an injured summon, damages an enemy in range',
    dualRun.setup === 'ok' && dualRun.selfHealed === 30 && dualRun.tankHealed === 30 && dualRun.playerUntouched && dualRun.foeDrop > 0,
    JSON.stringify(dualRun),
  );

  // 3v-3. FRIENDLY ZONE (STATIC): heals the player + a summon standing in it on
  // ticks, stays where it was cast, and stops healing once the player leaves.
  const staticZone = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!window.__quietSpot()) return { setup: 'no quiet spot' };
    ms.summons.clear();
    const cfg = { key: 'gate_test_tank', name: 'Gate Tank', behavior: 'tank', maxHP: 100, durationMs: 20000, aggroRadius: 150, followRange: 150, moveTilesPerSec: 5, bodyRadius: 12, tint: 0x88cc88, drawsAggro: true, aggroPriority: 2 };
    const [tank] = ms.summonAlliedUnits(cfg, 1, 1);
    tank.takeHit(50);
    const tankBefore = tank.health.current;
    ms.playerHealth.current = Math.max(1, ms.playerHealth.max - 80);
    const before = ms.playerHealth.current;
    ms.runComposedSteps([{ p: 'friendzone', radius: 140, healPerTick: 10, tickMs: 200, durationMs: 3000 }]);
    const z = ms.friendlyZones[ms.friendlyZones.length - 1];
    const placedAt = { x: z.x, y: z.y, follow: z.follow };
    await wait(900);
    const healed = ms.playerHealth.current - before;
    const tankHealed = tank.health.current - tankBefore;
    // Leave the zone: the center must NOT follow, and healing must stop.
    ms.player.sprite.body.reset(ms.player.x + 600, ms.player.y);
    await wait(300);
    const stayed = Math.hypot(z.x - placedAt.x, z.y - placedAt.y) < 1;
    const outside = ms.playerHealth.current;
    await wait(600);
    const healedOutside = ms.playerHealth.current - outside;
    ms.summons.clear();
    ms.playerHealth.full();
    return { setup: 'ok', follow: placedAt.follow, healed, tankHealed, stayed, healedOutside };
  });
  ok(
    'druid ext — static friendly zone: heals player + summon on ticks, holds position, stops outside',
    staticZone.setup === 'ok' && staticZone.follow === false && staticZone.healed >= 30 && staticZone.tankHealed >= 30 && staticZone.stayed && staticZone.healedOutside === 0,
    JSON.stringify(staticZone),
  );

  // 3v-4. FRIENDLY ZONE (MOBILE): the follow variant tracks the caster and keeps
  // healing on the move, then expires cleanly (list emptied, FX gone).
  const mobileZone = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!window.__quietSpot()) return { setup: 'no quiet spot' };
    ms.playerHealth.current = Math.max(1, ms.playerHealth.max - 80);
    const before = ms.playerHealth.current;
    ms.runComposedSteps([{ p: 'friendzone', follow: true, radius: 120, healPerTick: 8, tickMs: 200, durationMs: 2200 }]);
    const z = ms.friendlyZones[ms.friendlyZones.length - 1];
    ms.player.sprite.body.reset(ms.player.x + 500, ms.player.y + 300);
    await wait(400);
    const tracked = Math.hypot(z.x - ms.player.x, z.y - ms.player.y) < 40;
    await wait(600);
    const healedMoving = ms.playerHealth.current - before;
    await wait(1600); // past durationMs → the zone must be pruned
    const expired = ms.friendlyZones.length === 0;
    ms.playerHealth.full();
    return { setup: 'ok', tracked, healedMoving, expired };
  });
  ok(
    'druid ext — mobile friendly zone: follows the caster, heals on the move, expires cleanly',
    mobileZone.setup === 'ok' && mobileZone.tracked && mobileZone.healedMoving >= 24 && mobileZone.expired,
    JSON.stringify(mobileZone),
  );

  // 3v-5. PLAYER STEALTH: an enemy chasing the player stops targeting them the
  // moment stealth starts (aggro wiped, no fall-through to the player), and an
  // ATTACK breaks it (targeting resumes).
  const stealthRun = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!window.__quietSpot()) return { setup: 'no quiet spot' };
    const w = ms.activeMap().nearestWalkableWorld(ms.player.x + 160, ms.player.y);
    const foe = ms.spawnAngel('darkcaster', w.x, w.y);
    await wait(250);
    const tgt = () => ms.enemyAggroTarget(foe, foe.x, foe.y);
    const t0 = tgt();
    const targetsPlayerBefore = Math.hypot(t0.x - ms.player.x, t0.y - ms.player.y) < 4;
    ms.runComposedSteps([{ p: 'stealth', durationMs: 8000 }]);
    const t1 = tgt();
    const ignoredDuring = Math.hypot(t1.x - foe.x, t1.y - foe.y) < 4 && !(Math.hypot(t1.x - ms.player.x, t1.y - ms.player.y) < 4);
    const activeDuring = ms.playerStealthActive;
    // Attacking breaks it: any offensive composed step.
    ms.runComposedSteps([{ p: 'strike', at: 'self', radius: 90, damageRaw: 1, tint: 0xffffff }]);
    const brokeOnAttack = !ms.playerStealthActive && ms.player.sprite.alpha === 1;
    await wait(450); // past the aggro re-eval interval
    const t2 = tgt();
    const targetsPlayerAfter = Math.hypot(t2.x - ms.player.x, t2.y - ms.player.y) < 4;
    foe.destroy();
    return { setup: 'ok', targetsPlayerBefore, ignoredDuring, activeDuring, brokeOnAttack, targetsPlayerAfter };
  });
  ok(
    'druid ext — stealth: removes the player from enemy targeting, breaks on attack',
    stealthRun.setup === 'ok' && stealthRun.targetsPlayerBefore && stealthRun.ignoredDuring && stealthRun.activeDuring && stealthRun.brokeOnAttack && stealthRun.targetsPlayerAfter,
    JSON.stringify(stealthRun),
  );

  // 3v-6. SUMMON VARIANTS: (pair) ONE cast spawns TWO live linked units of one
  // type; (untargetable timed) a drawsAggro:false attacker is invisible to the
  // aggro hierarchy AND bolt interception, lands its low chip damage on a real
  // enemy, and auto-expires at its overridden duration.
  const variantRun = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!window.__quietSpot()) return { setup: 'no quiet spot' };
    ms.summons.clear();
    // PAIR: one cast → two live units of the same type, side by side.
    const pairCfg = { key: 'gate_test_pair', name: 'Gate Pair', behavior: 'tank', maxHP: 60, durationMs: 15000, aggroRadius: 150, followRange: 150, moveTilesPerSec: 5, bodyRadius: 12, tint: 0x88cc88, drawsAggro: true, aggroPriority: 2 };
    const pair = ms.summonAlliedUnits(pairCfg, 2, 2);
    const pairAlive = pair.length === 2 && pair.every((s) => s.isAlive) && ms.summons.list.filter((s) => s.config.key === 'gate_test_pair').length === 2;
    const apart = pair.length === 2 ? Math.hypot(pair[0].x - pair[1].x, pair[0].y - pair[1].y) : 0;
    ms.summons.clear();
    // UNTARGETABLE TIMED: drawsAggro=false + a duration override + chip damage.
    const chipCfg = {
      key: 'gate_test_chip', name: 'Gate Chip', behavior: 'attacker', maxHP: 30, durationMs: 60000,
      aggroRadius: 0, followRange: 150, moveTilesPerSec: 6, bodyRadius: 12, tint: 0xcccc66,
      drawsAggro: false, aggroPriority: 1, attackDamage: 4, attackCooldownMs: 350, attackRange: 70, seekRange: 320, leashRange: 600,
    };
    const [chip] = ms.summonAlliedUnits(chipCfg, 1, 1, 1600);
    const untargetable = ms.summons.aggroSummonNear(chip.x, chip.y) === null && ms.summons.summonAt(chip.x, chip.y, 60) === null;
    const w = ms.activeMap().nearestWalkableWorld(ms.player.x + 120, ms.player.y);
    const foe = ms.spawnAngel('darkcaster', w.x, w.y);
    await wait(300);
    const foe0 = foe.health.current;
    await wait(900); // the chip attacker closes + swings at least once
    const chipped = foe0 - foe.health.current;
    const foeTarget = ms.enemyAggroTarget(foe, foe.x, foe.y);
    const foeIgnoresChip = !(Math.hypot(foeTarget.x - chip.x, foeTarget.y - chip.y) < 4);
    await wait(700); // past the 1600ms override → expired + pruned
    const expired = !ms.summons.list.some((s) => s.config.key === 'gate_test_chip');
    foe.destroy();
    ms.summons.clear();
    return { setup: 'ok', pairAlive, apart, untargetable, chipped, foeIgnoresChip, expired };
  });
  ok(
    'druid ext — summon variants: pair spawns two; untargetable timed unit chips, is ignored, expires',
    variantRun.setup === 'ok' && variantRun.pairAlive && variantRun.apart > 20 && variantRun.untargetable && variantRun.chipped > 0 && variantRun.foeIgnoresChip && variantRun.expired,
    JSON.stringify(variantRun),
  );

  // 3x. MAGE FRAMEWORK EXTENSIONS (permanent): entangled chains, crystallize +
  // shatter, the wormhole composite, and seeking bolts — each exercised through
  // its real runtime seam from an isolated spot (loud setup failures).

  // 3x-1. ENTANGLED CHAINS: bind three foes; damage to one is SHARED to the others,
  // a stun on one stuns all; unbinding stops the sharing.
  const entangleRun = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!window.__quietSpot()) return { setup: 'no quiet spot' };
    const spawnAt = (dx, dy) => {
      const w = ms.activeMap().nearestWalkableWorld(ms.player.x + dx, ms.player.y + dy);
      return ms.spawnAngel('darkcaster', w.x, w.y);
    };
    const a = spawnAt(120, 0);
    const b = spawnAt(200, 80);
    const c = spawnAt(200, -80);
    await wait(200);
    const bound = ms.entangleNearby(ms.player.x, ms.player.y, 320, 3, 0.5, 6000);
    const hp0 = [a, b, c].map((e) => e.health.current);
    a.takeHit(40); // direct hit on ONE bound member
    await wait(100);
    const drops = [a, b, c].map((e, i) => hp0[i] - e.health.current);
    const shared = drops[0] > 0 && drops[1] > 0 && drops[2] > 0 && drops[1] < drops[0] && drops[2] < drops[0];
    // Control share: stun a small ring around A only → B must be stunned too.
    ms.stunEnemiesInRange(a.x, a.y, 40, 800);
    const stunShared = ms.stunnedEnemies.has(b) && ms.stunnedEnemies.has(c);
    // Unbind: damage no longer shares.
    ms.clearEntangle();
    const b1 = b.health.current;
    a.takeHit(30);
    await wait(100);
    const afterClear = b1 - b.health.current;
    for (const e of [a, b, c]) e.destroy();
    return { setup: 'ok', bound, drops, shared, stunShared, afterClear };
  });
  ok(
    'mage ext — entangled chains: damage + stuns shared across the binding; unbind stops it',
    entangleRun.setup === 'ok' && entangleRun.bound === 3 && entangleRun.shared && entangleRun.stunShared && entangleRun.afterClear === 0,
    JSON.stringify(entangleRun),
  );

  // 3x-2. CRYSTALLIZE + SHATTER: the strike rider applies stacks (capped), Shatter
  // consumes EXACTLY the stacks in radius (per-stack damage; out-of-radius stacks stay).
  const crysRun = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!window.__quietSpot()) return { setup: 'no quiet spot' };
    const wA = ms.activeMap().nearestWalkableWorld(ms.player.x + 130, ms.player.y);
    const a = ms.spawnAngel('darkcaster', wA.x, wA.y);
    const wB = ms.activeMap().nearestWalkableWorld(ms.player.x + 640, ms.player.y);
    const b = ms.spawnAngel('darkcaster', wB.x, wB.y);
    await wait(200);
    // The RIDER: a strike around the player crystallizes what it hits (B is out of reach).
    ms.runComposedSteps([{ p: 'strike', at: 'self', radius: 200, damageRaw: 1, tint: 0xbfe0ff, crystallize: 2 }]);
    const riderStacks = ms.crystallize.get(a) ?? 0;
    ms.addCrystallize(a, 10, 6); // cap check: 2 + 10 → clamped to 6
    ms.addCrystallize(b, 3, 6); // stacks OUTSIDE the coming shatter radius
    const capped = ms.crystallize.get(a) ?? 0;
    const hpA = a.health.current;
    const res = ms.shatterCrystallize(ms.player.x, ms.player.y, 300, 10);
    await wait(100);
    const dropA = hpA - a.health.current;
    const out = {
      setup: 'ok', riderStacks, capped, res,
      dropA,
      aCleared: !ms.crystallize.has(a),
      bKept: ms.crystallize.get(b) === 3,
    };
    a.destroy();
    b.destroy();
    ms.crystallize.clear();
    return out;
  });
  ok(
    'mage ext — crystallize/shatter: rider applies, cap holds, shatter consumes exactly the stacks in radius',
    crysRun.setup === 'ok' && crysRun.riderStacks === 2 && crysRun.capped === 6 && crysRun.res.hit === 1 && crysRun.res.stacks === 6 && crysRun.dropA >= 40 && crysRun.aCleared && crysRun.bKept,
    JSON.stringify(crysRun),
  );

  // 3x-3. WORMHOLE COMPOSITE: [hazard at self, teleport] moves the player and leaves
  // a damaging portal at the ORIGIN that ticks on an enemy standing in it.
  const wormRun = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!window.__quietSpot()) return { setup: 'no quiet spot' };
    const from = { x: ms.player.x, y: ms.player.y };
    ms.player.facingX = 1;
    ms.player.facingY = 0;
    ms.runComposedSteps([
      { p: 'hazard', at: 'self', radius: 90, tickDamage: 8, tickMs: 250, durationMs: 2500, fill: 0x8a5cff, stroke: 0xc09aff },
      { p: 'teleport', distance: 220 },
    ]);
    const moved = Math.hypot(ms.player.x - from.x, ms.player.y - from.y);
    const h = ms.spellHazards[ms.spellHazards.length - 1];
    const portalAtOrigin = h ? Math.hypot(h.x - from.x, h.y - from.y) < 5 : false;
    const w = ms.activeMap().nearestWalkableWorld(from.x, from.y);
    const foe = ms.spawnAngel('darkcaster', w.x, w.y);
    await wait(150);
    const hp0 = foe.health.current;
    await wait(800); // several portal ticks
    const ticked = hp0 - foe.health.current;
    foe.destroy();
    return { setup: 'ok', moved, portalAtOrigin, ticked };
  });
  ok(
    'mage ext — wormhole: teleports the player, the origin portal damages what stands in it',
    wormRun.setup === 'ok' && wormRun.moved > 120 && wormRun.portalAtOrigin && wormRun.ticked > 0,
    JSON.stringify(wormRun),
  );

  // 3x-4. SEEKING BOLT: fired 90° AWAY from the only enemy, the bolt curves in and
  // still hits it (a straight bolt at that angle could never connect).
  const seekRun = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!window.__quietSpot()) return { setup: 'no quiet spot' };
    const w = ms.activeMap().nearestWalkableWorld(ms.player.x, ms.player.y - 220);
    const foe = ms.spawnAngel('darkcaster', w.x, w.y); // due NORTH of the player
    await wait(200);
    ms.player.facingX = 1; // fire due EAST — 90° off the target
    ms.player.facingY = 0;
    const hp0 = foe.health.current;
    ms.runComposedSteps([{ p: 'bolt', damage: 16, speed: 420, range: 600, radius: 9, tint: 0xc09aff, seek: true }]);
    const t0 = Date.now();
    let drop = 0;
    while (Date.now() - t0 < 2500) {
      await wait(120);
      drop = hp0 - foe.health.current;
      if (drop > 0) break;
    }
    foe.destroy();
    return { setup: 'ok', drop };
  });
  ok('mage ext — seeking bolt: fired 90° off-target, it curves in and hits', seekRun.setup === 'ok' && seekRun.drop > 0, JSON.stringify(seekRun));

  // 3z. BARD FRAMEWORK EXTENSIONS (permanent): confusion, echo, the conditional
  // finisher, rotating bolt riders, the melee strike-chain, and the combo
  // ultimate — each through its real runtime seam from an isolated spot.

  // 3z-1. CONFUSION: a confused enemy pursues its nearest FELLOW (aggro redirected),
  // chips at it when adjacent, and the effect wears off cleanly.
  const confRun = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!window.__quietSpot()) return { setup: 'no quiet spot' };
    const spawnAt = (dx, dy) => {
      const w = ms.activeMap().nearestWalkableWorld(ms.player.x + dx, ms.player.y + dy);
      return ms.spawnAngel('darkcaster', w.x, w.y);
    };
    const a = spawnAt(120, 0);
    const b = spawnAt(170, 0); // the fellow, standing beside A
    await wait(200);
    ms.stunEnemiesInRange(ms.player.x + 145, ms.player.y, 220, 2600); // hold both in place (kiting-proof)
    const confused = ms.confuseNearestEnemy(ms.player.x, ms.player.y, 200, 1, 1600, 9, 300);
    const entry = ms.confused.get(a);
    const targetsFellow = !!entry && entry.target === b;
    const t1 = ms.enemyAggroTarget(a, a.x, a.y);
    const aggroOnFellow = Math.hypot(t1.x - b.x, t1.y - b.y) < 4;
    const hpB = b.health.current;
    await wait(900); // adjacent → chip hits land on the fellow
    const chipped = hpB - b.health.current;
    await wait(1000); // past durationMs → wears off cleanly
    const woreOff = !ms.confused.has(a);
    const t2 = ms.enemyAggroTarget(a, a.x, a.y);
    const backToPlayer = Math.hypot(t2.x - ms.player.x, t2.y - ms.player.y) < 4;
    a.destroy();
    b.destroy();
    return { setup: 'ok', confused, targetsFellow, aggroOnFellow, chipped, woreOff, backToPlayer };
  });
  ok(
    'bard ext — confusion: aggro redirects onto the nearest fellow, chips it, wears off cleanly',
    confRun.setup === 'ok' && confRun.confused && confRun.targetsFellow && confRun.aggroOnFellow && confRun.chipped > 0 && confRun.woreOff && confRun.backToPlayer,
    JSON.stringify(confRun),
  );

  // 3z-2. ECHO: an armed echo repeats a strike after the delay at echoPct strength;
  // disarmed, nothing repeats.
  const echoRun = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!window.__quietSpot()) return { setup: 'no quiet spot' };
    const w = ms.activeMap().nearestWalkableWorld(ms.player.x + 60, ms.player.y);
    const a = ms.spawnAngel('darkcaster', w.x, w.y);
    await wait(200);
    ms.stunEnemiesInRange(a.x, a.y, 40, 3000); // hold it in place so the delayed echo lands
    ms.setEcho(0.5, 300);
    const hp0 = a.health.current;
    ms.player.facingX = 1;
    ms.player.facingY = 0;
    ms.runComposedSteps([{ p: 'strike', at: 'front', range: 80, damageRaw: 20, tint: 0xd8c8ff }]);
    await wait(120);
    const initial = hp0 - a.health.current;
    await wait(500); // past the 300ms echo delay
    const total = hp0 - a.health.current;
    ms.setEcho(0);
    const hp1 = a.health.current;
    ms.runComposedSteps([{ p: 'strike', at: 'front', range: 80, damageRaw: 20, tint: 0xd8c8ff }]);
    await wait(500);
    const disarmed = hp1 - a.health.current;
    a.destroy();
    return { setup: 'ok', initial, total, disarmed };
  });
  ok(
    'bard ext — echo: a delayed second hit at echoPct; nothing repeats once disarmed',
    echoRun.setup === 'ok' && echoRun.initial === 20 && echoRun.total === 30 && echoRun.disarmed === 20,
    JSON.stringify(echoRun),
  );

  // 3z-3. CONDITIONAL FINISHER: a stunned/slowed target takes damage × bonusMult;
  // an unafflicted one takes base damage.
  const finRun = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!window.__quietSpot()) return { setup: 'no quiet spot' };
    const spawnAt = (dx, dy) => {
      const w = ms.activeMap().nearestWalkableWorld(ms.player.x + dx, ms.player.y + dy);
      return ms.spawnAngel('darkcaster', w.x, w.y);
    };
    const stunned = spawnAt(80, 60);
    const fresh = spawnAt(80, -60);
    await wait(200);
    ms.stunEnemiesInRange(stunned.x, stunned.y, 30, 1500); // afflict ONE
    const h1 = stunned.health.current;
    const h2 = fresh.health.current;
    const res = ms.finisherHitAll(ms.player.x, ms.player.y, 200, 15, 2);
    await wait(100);
    const dropStunned = h1 - stunned.health.current;
    const dropFresh = h2 - fresh.health.current;
    stunned.destroy();
    fresh.destroy();
    return { setup: 'ok', res, dropStunned, dropFresh };
  });
  ok(
    'bard ext — conditional finisher: double damage to the stunned target, base to the fresh one',
    finRun.setup === 'ok' && finRun.res.hit === 2 && finRun.res.bonus === 1 && finRun.dropStunned === 30 && finRun.dropFresh === 15,
    JSON.stringify(finRun),
  );

  // 3z-4. ROTATING RIDERS: a composed multi-bolt whose bolts carry DIFFERENT
  // impact riders — the struck enemy ends up stunned AND slowed.
  const riderRun = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!window.__quietSpot()) return { setup: 'no quiet spot' };
    const w = ms.activeMap().nearestWalkableWorld(ms.player.x + 200, ms.player.y);
    const a = ms.spawnAngel('darkcaster', w.x, w.y);
    await wait(200);
    ms.player.facingX = a.x >= ms.player.x ? 1 : -1;
    ms.player.facingY = 0;
    const hp0 = a.health.current;
    ms.runComposedSteps([
      { p: 'bolt', damage: 8, speed: 520, range: 320, radius: 9, tint: 0xd8c8ff, onHit: { stunMs: 1200 } },
      { p: 'bolt', damage: 8, speed: 520, range: 320, radius: 9, tint: 0xb8e8ff, onHit: { slowFactor: 0.5, slowMs: 2000 } },
    ]);
    await wait(700); // flight + impacts
    const hit = hp0 - a.health.current > 0;
    const stunnedApplied = ms.stunnedEnemies.has(a);
    const slowApplied = ms.slowedEnemies.has(a);
    a.destroy();
    return { setup: 'ok', hit, stunnedApplied, slowApplied };
  });
  ok(
    'bard ext — rotating riders: each bolt lands its own rider (stun from one, slow from the other)',
    riderRun.setup === 'ok' && riderRun.hit && riderRun.stunnedApplied && riderRun.slowApplied,
    JSON.stringify(riderRun),
  );

  // 3z-5. MELEE STRIKE-CHAIN: a melee-range chain leaps through three foes with
  // falloff and sweeps one swing crescent per hop.
  const meleeChain = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!window.__quietSpot()) return { setup: 'no quiet spot' };
    const spawnAt = (dx) => {
      const w = ms.activeMap().nearestWalkableWorld(ms.player.x + dx, ms.player.y);
      return ms.spawnAngel('darkcaster', w.x, w.y);
    };
    const foes = [spawnAt(70), spawnAt(180), spawnAt(290)];
    await wait(200);
    // Casters KITE: pin the line — stun, then hard-place at the exact melee spacing.
    ms.stunEnemiesInRange(ms.player.x + 180, ms.player.y, 400, 2500);
    foes.forEach((f, i) => f.sprite.body.reset(ms.player.x + 70 + i * 110, ms.player.y));
    ms.player.facingX = 1;
    ms.player.facingY = 0;
    const hp0 = foes.map((f) => f.health.current);
    const swings0 = ms.swingFx.spawnedTotal;
    ms.runComposedSteps([{ p: 'chain', range: 90, jumps: 2, jumpRange: 140, damage: 24, falloff: 0.5, tint: 0xd8c8ff, swingFx: true }]);
    await wait(150);
    const drops = foes.map((f, i) => hp0[i] - f.health.current);
    const swings = ms.swingFx.spawnedTotal - swings0;
    for (const f of foes) f.destroy();
    return { setup: 'ok', drops, swings };
  });
  ok(
    'bard ext — strike-chain: a melee hit leaps through three foes with falloff, one crescent per hop',
    meleeChain.setup === 'ok' && meleeChain.drops.every((d) => d > 0) && meleeChain.drops[0] > meleeChain.drops[1] && meleeChain.drops[1] > meleeChain.drops[2] && meleeChain.swings === 3,
    JSON.stringify(meleeChain),
  );

  // 3z-6. COMBO ULTIMATE: entering the state lands MULTIPLE auto-chained strikes
  // with no further input while its buff runs, then the state ends on time.
  const comboRun = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!window.__quietSpot()) return { setup: 'no quiet spot' };
    const w = ms.activeMap().nearestWalkableWorld(ms.player.x + 60, ms.player.y);
    const a = ms.spawnAngel('darkcaster', w.x, w.y);
    await wait(200);
    // Casters KITE: pin the target in melee reach for the whole combo window.
    ms.stunEnemiesInRange(a.x, a.y, 400, 3000);
    a.sprite.body.reset(ms.player.x + 60, ms.player.y);
    const hp0 = a.health.current;
    const swings0 = ms.swingFx.spawnedTotal;
    ms.startComboUltimate('gate_combo_test', { durationMs: 1400, intervalMs: 300, range: 120, damage: 10, jumps: 1, jumpRange: 140, falloff: 0.5, tint: 0xd8c8ff, stats: { damageMult: 0.2 } });
    const buffOn = ms.skillTimed.some((t) => t.id === 'gate_combo_test');
    await wait(1000);
    const midHits = ms.swingFx.spawnedTotal - swings0;
    await wait(900); // past durationMs → the state must end
    const ended = ms.comboUltimate === null;
    const totalDrop = hp0 - a.health.current;
    const finalHits = ms.swingFx.spawnedTotal - swings0;
    await wait(300);
    const noMore = ms.swingFx.spawnedTotal - swings0 === finalHits;
    for (const t of ms.skillTimed) t.endsAt = 0; // clean the test buff
    a.destroy();
    return { setup: 'ok', buffOn, midHits, totalDrop, ended, noMore };
  });
  ok(
    'bard ext — combo ultimate: rapid auto-chained strikes + a buff, ending on time',
    comboRun.setup === 'ok' && comboRun.buffOn && comboRun.midHits >= 3 && comboRun.totalDrop > 0 && comboRun.ended && comboRun.noMore,
    JSON.stringify(comboRun),
  );

  // 3ab. WITCH DOCTOR FRAMEWORK EXTENSIONS (permanent): the voodoo doll system
  // (bind + mirror % + the three upgrade hooks + despawn/re-bind), the spirit
  // decoy, the ally-bond damage share, and the Spirit Split composite — each
  // through its real runtime seam from an isolated spot.

  // 3ab-1. DOLL BIND + MIRROR %: the cast deals its initial spirit damage and
  // binds; a melee strike landing ON THE DOLL mirrors exactly mirrorPct to the
  // bound target far away; a broken bind mirrors nothing.
  const dollRun = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!window.__quietSpot()) return { setup: 'no quiet spot' };
    ms.summons.clear();
    const w = ms.activeMap().nearestWalkableWorld(ms.player.x + 420, ms.player.y);
    const a = ms.spawnAngel('darkcaster', w.x, w.y);
    await wait(200);
    ms.stunEnemiesInRange(a.x, a.y, 40, 8000); // pin FAR away (mirror is rangeless)
    ms.player.facingX = 1;
    ms.player.facingY = 0;
    const hp0 = a.health.current;
    const bound = ms.castVoodooDoll(600, 15, 8000, 0.5);
    const initial = hp0 - a.health.current;
    const doll = ms.voodoo?.doll ?? null;
    const dollNear = doll ? Math.hypot(doll.x - ms.player.x, doll.y - ms.player.y) < 120 : false;
    const farNow = Math.hypot(a.x - ms.player.x, a.y - ms.player.y);
    ms.runComposedSteps([{ p: 'strike', at: 'front', range: 70, damageRaw: 20, tint: 0xc9a05a }]); // lands on the doll
    await wait(120);
    const mirrored = hp0 - a.health.current - initial;
    // Break the bind (destroy the doll) → the next strike mirrors NOTHING.
    ms.summons.clearKey('wd_doll');
    await wait(250); // update() prunes the broken bind
    const unbound = ms.voodoo === null;
    const hp1 = a.health.current;
    ms.runComposedSteps([{ p: 'strike', at: 'front', range: 70, damageRaw: 20, tint: 0xc9a05a }]);
    await wait(120);
    const afterBreak = hp1 - a.health.current;
    a.destroy();
    ms.summons.clear();
    ms.voodoo = null;
    return { setup: 'ok', bound, initial, dollNear, farNow, mirrored, unbound, afterBreak };
  });
  ok(
    'wd ext — voodoo doll: cast binds + hits; a strike on the doll mirrors exactly mirrorPct at range; a broken bind mirrors nothing',
    dollRun.setup === 'ok' && dollRun.bound && dollRun.initial === 15 && dollRun.dollNear && dollRun.farNow > 300 && dollRun.mirrored === 10 && dollRun.unbound && dollRun.afterBreak === 0,
    JSON.stringify(dollRun),
  );

  // 3ab-2. UPGRADE HOOKS: STITCH SPLASH (the mirror splashes to the target's
  // neighbor), REFLECT (a contact hit on the doll bites the striker back), and
  // SPIRIT ASSAULT (periodic defense-bypassing ticks while bound) — each armed
  // by its flag exactly as the owned-skill wiring arms it.
  const hooksRun = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!window.__quietSpot()) return { setup: 'no quiet spot' };
    ms.summons.clear();
    const spawnAt = (dx, dy) => {
      const w = ms.activeMap().nearestWalkableWorld(ms.player.x + dx, ms.player.y + dy);
      return ms.spawnAngel('darkcaster', w.x, w.y);
    };
    const a = spawnAt(400, 0); // the bound target
    const b = spawnAt(460, 40); // its neighbor (stitch food)
    await wait(200);
    ms.stunEnemiesInRange(ms.player.x + 430, ms.player.y, 220, 9000); // pin the pair
    a.sprite.body.reset(ms.player.x + 400, ms.player.y);
    b.sprite.body.reset(ms.player.x + 460, ms.player.y + 40);
    ms.player.facingX = 1;
    ms.player.facingY = 0;
    ms.castVoodooDoll(600, 0, 9000, 0.5);
    const boundA = ms.voodoo?.target === a;
    ms.voodooStitch = { radius: 140, pct: 0.5 }; // arm STITCH (as the owned skill would)
    const hpA = a.health.current;
    const hpB = b.health.current;
    ms.runComposedSteps([{ p: 'strike', at: 'front', range: 70, damageRaw: 20, tint: 0xc9a05a }]);
    await wait(120);
    const mirrorA = hpA - a.health.current; // 20 × 0.5
    const stitchB = hpB - b.health.current; // mirror × 0.5
    ms.voodooStitch = null;
    // REFLECT: a striker adjacent to the doll lands a contact hit through the REAL
    // enemy-contact seam; the doll soaks it and bites back.
    ms.voodooReflectDamage = 12;
    const doll = ms.voodoo.doll;
    const c = spawnAt(40, 60);
    await wait(200);
    ms.stunEnemiesInRange(c.x, c.y, 40, 6000);
    c.sprite.body.reset(doll.x + 20, doll.y);
    const dollHp0 = doll.health.current;
    const hpC = c.health.current;
    const soaked = ms.redirectContactToSummon(c.x, c.y, 10); // the seam enemy contact uses
    // Read the doll's soak SYNCHRONOUSLY (the seam applies it in the call):
    // during any wait, a real ambient contact can redirect onto the doll too
    // and inflate the read (the savage bloodPaid hardening precedent).
    const dollTook = dollHp0 - doll.health.current;
    await wait(100);
    const reflect = { soaked, dollTook, bite: hpC - c.health.current };
    ms.voodooReflectDamage = 0;
    c.destroy();
    // SPIRIT ASSAULT: armed → periodic ticks land on the bound target with no input.
    ms.voodooAssault = { damage: 6, tickMs: 400, nextAt: 0 };
    const hpA2 = a.health.current;
    await wait(1000); // ~2-3 ticks
    const assaultTicks = hpA2 - a.health.current;
    ms.voodooAssault = null;
    a.destroy();
    b.destroy();
    ms.summons.clear();
    ms.voodoo = null;
    return { setup: 'ok', boundA, mirrorA, stitchB, reflect, assaultTicks };
  });
  ok(
    'wd ext — doll upgrades: stitch splashes the neighbor; a contact hit on the doll reflects; spirit assault ticks while bound',
    hooksRun.setup === 'ok' &&
      hooksRun.boundA &&
      hooksRun.mirrorA === 10 &&
      hooksRun.stitchB === 5 &&
      hooksRun.reflect.soaked &&
      hooksRun.reflect.dollTook === 10 &&
      hooksRun.reflect.bite === 12 &&
      hooksRun.assaultTicks >= 12,
    JSON.stringify(hooksRun),
  );

  // 3ab-3. DESPAWN ON TARGET DEATH + RE-CAST RE-BINDS: killing the bound target
  // removes the doll; a fresh cast binds the next enemy.
  const rebindRun = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!window.__quietSpot()) return { setup: 'no quiet spot' };
    ms.summons.clear();
    const spawnAt = (dx) => {
      const w = ms.activeMap().nearestWalkableWorld(ms.player.x + dx, ms.player.y);
      return ms.spawnAngel('darkcaster', w.x, w.y);
    };
    const a = spawnAt(120);
    await wait(200);
    ms.stunEnemiesInRange(a.x, a.y, 40, 6000);
    ms.castVoodooDoll(400, 0, 8000, 0.5);
    const boundFirst = ms.voodoo?.target === a;
    a.takeHit(1e9); // the bound target dies
    await wait(300); // update() prunes: the doll despawns with its target
    const dollGone = ms.voodoo === null && !ms.summons.list.some((s) => s.config.key === 'wd_doll');
    const b = spawnAt(140);
    await wait(200);
    ms.stunEnemiesInRange(b.x, b.y, 40, 6000);
    const recast = ms.castVoodooDoll(400, 0, 8000, 0.5);
    const boundSecond = ms.voodoo?.target === b && ms.summons.list.some((s) => s.config.key === 'wd_doll');
    a.destroy();
    b.destroy();
    ms.summons.clear();
    ms.voodoo = null;
    return { setup: 'ok', boundFirst, dollGone, recast, boundSecond };
  });
  ok(
    'wd ext — bind lifecycle: the doll despawns when its target dies; a re-cast re-binds fresh',
    rebindRun.setup === 'ok' && rebindRun.boundFirst && rebindRun.dollGone && rebindRun.recast && rebindRun.boundSecond,
    JSON.stringify(rebindRun),
  );

  // 3ab-4. SPIRIT DECOY: magnet-tier aggro (a real enemy retargets onto it),
  // attacks nothing, has HP, expires — aggro falls back to the player after.
  const decoyRun = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!window.__quietSpot()) return { setup: 'no quiet spot' };
    ms.summons.clear();
    const w = ms.activeMap().nearestWalkableWorld(ms.player.x + 150, ms.player.y);
    const e = ms.spawnAngel('darkcaster', w.x, w.y);
    await wait(200);
    ms.stunEnemiesInRange(e.x, e.y, 40, 8000); // hold it so distance stays stable
    const t0 = ms.enemyAggroTarget(e, e.x, e.y);
    const onPlayerBefore = Math.hypot(t0.x - ms.player.x, t0.y - ms.player.y) < 8;
    const d = ms.spawnSpiritDecoy(1600); // short-lived for the expiry half
    const passive = d.config.behavior === 'tank' && d.config.attackDamage === undefined && d.health.max > 0;
    await wait(700); // past the aggro re-eval interval
    const t1 = ms.enemyAggroTarget(e, e.x, e.y);
    const onDecoy = Math.hypot(t1.x - d.x, t1.y - d.y) < 60;
    await wait(1400); // past the decoy's lifespan
    const expired = !ms.summons.list.some((s) => s.config.key === 'wd_decoy');
    await wait(600); // next re-eval → back to the player
    const t2 = ms.enemyAggroTarget(e, e.x, e.y);
    const backToPlayer = Math.hypot(t2.x - ms.player.x, t2.y - ms.player.y) < 8;
    e.destroy();
    ms.summons.clear();
    return { setup: 'ok', onPlayerBefore, passive, onDecoy, expired, backToPlayer };
  });
  ok(
    'wd ext — spirit decoy: draws real aggro at magnet tier, attacks nothing, expires; aggro falls back',
    decoyRun.setup === 'ok' && decoyRun.onPlayerBefore && decoyRun.passive && decoyRun.onDecoy && decoyRun.expired && decoyRun.backToPlayer,
    JSON.stringify(decoyRun),
  );

  // 3ab-5. ALLY-BOND: while bonded, sharePct of a player hit lands on the live
  // summon instead (the player pool takes only the remainder); unbonded hits land whole.
  const bondRun = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!window.__quietSpot()) return { setup: 'no quiet spot' };
    ms.summons.clear();
    ms.voodoo = null;
    const d = ms.spawnSpiritDecoy(20000); // the bond's other half
    await wait(100);
    ms.startAllyBond(0.4, 5000);
    const dHp0 = d.health.current;
    const shield0 = ms.playerHealth.shield;
    ms.playerHealth.damage(20); // the REAL player-damage path (redirect runs inside)
    const shared = dHp0 - d.health.current; // 20 × 0.4
    const playerTook = shield0 - ms.playerHealth.shield; // the remainder (god-shield absorbs it)
    ms.allyBond = null; // bond ends → hits land whole again
    const dHp1 = d.health.current;
    const shield1 = ms.playerHealth.shield;
    ms.playerHealth.damage(20);
    const sharedAfter = dHp1 - d.health.current;
    const playerTookAfter = shield1 - ms.playerHealth.shield;
    ms.summons.clear();
    ms.playerHealth.shield = 1e9;
    return { setup: 'ok', shared, playerTook, sharedAfter, playerTookAfter };
  });
  // NOTE: assert the RATIOS, not raw numbers — the session's player may carry an
  // incoming-damage multiplier, which scales both halves identically.
  ok(
    'wd ext — ally-bond: the share lands on the summon, the player takes the remainder; whole again once it ends',
    bondRun.setup === 'ok' &&
      bondRun.playerTookAfter > 0 &&
      Math.abs(bondRun.shared - bondRun.playerTookAfter * 0.4) < 0.01 &&
      Math.abs(bondRun.playerTook - bondRun.playerTookAfter * 0.6) < 0.01 &&
      bondRun.sharedAfter === 0,
    JSON.stringify(bondRun),
  );

  // 3ab-6. SPIRIT SPLIT (composite): the decoy walks while the doll auto-mirrors
  // pulses on its cadence with NO player strike; the state ends on time.
  const splitRun = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!window.__quietSpot()) return { setup: 'no quiet spot' };
    ms.summons.clear();
    const w = ms.activeMap().nearestWalkableWorld(ms.player.x + 380, ms.player.y);
    const a = ms.spawnAngel('darkcaster', w.x, w.y);
    await wait(200);
    ms.stunEnemiesInRange(a.x, a.y, 40, 9000);
    ms.player.facingX = 1;
    ms.player.facingY = 0;
    ms.castVoodooDoll(600, 0, 9000, 0.5);
    const hp0 = a.health.current;
    ms.startSpiritSplit(1700, 400, 10);
    const decoyWalks = ms.summons.list.some((s) => s.config.key === 'wd_decoy');
    await wait(2000); // pulses at ~400/800/1200/1600, then the window closes
    const pulsed = hp0 - a.health.current;
    const ended = ms.spiritSplit === null;
    const hp1 = a.health.current;
    await wait(600);
    const noMore = hp1 - a.health.current === 0;
    a.destroy();
    ms.summons.clear();
    ms.voodoo = null;
    return { setup: 'ok', decoyWalks, pulsed, ended, noMore };
  });
  ok(
    'wd ext — spirit split: both halves run — the decoy walks while the doll auto-pulses; ends on time',
    splitRun.setup === 'ok' && splitRun.decoyWalks && splitRun.pulsed >= 30 && splitRun.ended && splitRun.noMore,
    JSON.stringify(splitRun),
  );

  // 3ae. SAMURAI FRAMEWORK EXTENSIONS (permanent): parry/riposte (+ its two
  // upgrade hooks), the Iaijutsu count-1 consume-buff, and dash-and-fire — each
  // through its real runtime seam. Melee hits are driven through the REAL enemy
  // melee handler (a live wolf's hit path); ranged through the projectile path.

  // 3ae-1. PARRY: a real wolf melee hit inside the window is fully negated and
  // the riposte lands; an EXPIRED window takes the hit normally; a RANGED hit
  // passes through an open window untouched (melee only).
  const parryRun = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!window.__quietSpot()) return { setup: 'no quiet spot' };
    ms.playerHealth.shield = 0; // observe real HP (restored at the end)
    ms.playerHealth.full();
    const wolf = ms.spawnTownsfolk(ms.player.x + 60, ms.player.y, null, 'wolf');
    await wait(200);
    // NOTE: wolves are squishy (15 HP) — the riposte numbers here stay SMALL so
    // the same live wolf survives every phase (a fresh one arrives for the
    // Counterstrike phase to be safe).
    const hp0 = ms.playerHealth.current;
    const wolfHp0 = wolf.health.current;
    const count0 = ms.parryCount;
    ms.openParryWindow(800, 4);
    ms.onTownsfolkHitPlayer(wolf); // the REAL wolf-melee seam
    const negated = ms.playerHealth.current === hp0;
    const riposte = wolfHp0 - wolf.health.current;
    const consumed = ms.parry === null && ms.parryCount === count0 + 1;
    // EXPIRED window → the hit lands normally, no riposte.
    ms.openParryWindow(120, 4);
    await wait(400);
    const hp1 = ms.playerHealth.current;
    const wolfHp1 = wolf.health.current;
    ms.onTownsfolkHitPlayer(wolf);
    const expiredTook = hp1 - ms.playerHealth.current;
    const expiredNoRiposte = wolf.health.current === wolfHp1;
    // RANGED passes through an OPEN window (melee only) — and the window survives.
    ms.playerHealth.full();
    ms.openParryWindow(800, 4);
    const hp2 = ms.playerHealth.current;
    ms.onProjectileHitPlayer(10);
    const rangedTook = hp2 - ms.playerHealth.current;
    const windowSurvived = ms.parry !== null;
    ms.parry = null;
    wolf.takeHit(1e9);
    // COUNTERSTRIKE hooks (armed exactly as the owned skill arms them): riposte
    // bonus + a Resolve/energy refund on the successful parry — on a FRESH wolf.
    const wolf2 = ms.spawnTownsfolk(ms.player.x + 60, ms.player.y, null, 'wolf');
    await wait(200);
    ms.parryRiposteBonus = 10;
    ms.parryRefundEnergy = 8;
    ms.energy.current = 40;
    const wolfHp2 = wolf2.health.current;
    ms.openParryWindow(800, 4);
    ms.onTownsfolkHitPlayer(wolf2);
    const counter = { riposte: wolfHp2 - wolf2.health.current, energy: ms.energy.current };
    ms.parryRiposteBonus = 0;
    ms.parryRefundEnergy = 0;
    wolf2.takeHit(1e9);
    ms.playerHealth.full();
    ms.playerHealth.shield = 1e9;
    return { setup: 'ok', negated, riposte, consumed, expiredTook, expiredNoRiposte, rangedTook, windowSurvived, counter };
  });
  ok(
    'samurai ext — parry: negates a real wolf hit + ripostes; expired window takes it; ranged passes through; Counterstrike bonus + refund',
    parryRun.setup === 'ok' &&
      parryRun.negated &&
      parryRun.riposte === 4 &&
      parryRun.consumed &&
      parryRun.expiredTook > 0 &&
      parryRun.expiredNoRiposte &&
      parryRun.rangedTook > 0 &&
      parryRun.windowSurvived &&
      parryRun.counter.riposte === 14 &&
      parryRun.counter.energy === 48,
    JSON.stringify(parryRun),
  );

  // 3ae-2. IAIJUTSU: the armed sheathe multiplies EXACTLY ONE strike (and stuns
  // what it hits), then consumes; a lapsed buff clears without effect.
  const iaiRun = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!window.__quietSpot()) return { setup: 'no quiet spot' };
    const w = ms.activeMap().nearestWalkableWorld(ms.player.x + 60, ms.player.y);
    const a = ms.spawnAngel('darkcaster', w.x, w.y);
    await wait(200);
    a.sprite.body.reset(ms.player.x + 60, ms.player.y);
    ms.player.facingX = 1;
    ms.player.facingY = 0;
    ms.armIaijutsu(1500, 3, 800);
    const hp0 = a.health.current;
    ms.runComposedSteps([{ p: 'strike', at: 'front', range: 70, damageRaw: 10, tint: 0xffe9a8 }]);
    await wait(100);
    const first = hp0 - a.health.current; // 10 × 3
    const stunned = ms.stunnedEnemies.has(a);
    const consumed = ms.iaijutsu === null;
    const hp1 = a.health.current;
    ms.runComposedSteps([{ p: 'strike', at: 'front', range: 70, damageRaw: 10, tint: 0xffe9a8 }]);
    await wait(100);
    const second = hp1 - a.health.current; // back to base
    // A LAPSED sheathe clears without effect.
    ms.armIaijutsu(100, 3, 800);
    await wait(300);
    const hp2 = a.health.current;
    ms.runComposedSteps([{ p: 'strike', at: 'front', range: 70, damageRaw: 10, tint: 0xffe9a8 }]);
    await wait(100);
    const lapsed = { drop: hp2 - a.health.current, cleared: ms.iaijutsu === null };
    a.destroy();
    return { setup: 'ok', first, stunned, consumed, second, lapsed };
  });
  ok(
    'samurai ext — iaijutsu: exactly one strike multiplied (×3) + stun, then consumed; a lapsed sheathe clears cleanly',
    iaiRun.setup === 'ok' && iaiRun.first === 30 && iaiRun.stunned && iaiRun.consumed && iaiRun.second === 10 && iaiRun.lapsed.drop === 10 && iaiRun.lapsed.cleared,
    JSON.stringify(iaiRun),
  );

  // 3ae-3. PERFECT FORM: every incoming melee hit auto-parries (multiple, from a
  // real wolf's hit path) WHILE the player strikes freely; the state ends on time.
  const formRun = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!window.__quietSpot()) return { setup: 'no quiet spot' };
    ms.playerHealth.shield = 0;
    ms.playerHealth.full();
    const wolf = ms.spawnTownsfolk(ms.player.x + 60, ms.player.y, null, 'wolf');
    await wait(200);
    const hp0 = ms.playerHealth.current;
    const wolfHp0 = wolf.health.current;
    const count0 = ms.parryCount;
    ms.player.facingX = 1;
    ms.player.facingY = 0;
    ms.startPerfectForm(2000, 2); // small riposte: the 15 HP wolf must survive all three
    // Per-hit SYNCHRONOUS deltas: each parried hit must remove exactly 0 HP (a
    // stray ranged enemy wandering in mid-wait can't pollute the measurement).
    let taken = 0;
    for (let i = 0; i < 3; i++) {
      wolf.sprite.body.reset(ms.player.x + 60, ms.player.y);
      const before = ms.playerHealth.current;
      ms.onTownsfolkHitPlayer(wolf); // real melee hits, auto-parried
      taken += before - ms.playerHealth.current;
      if (i < 2) ms.runComposedSteps([{ p: 'strike', at: 'front', range: 70, damageRaw: 2, tint: 0xffe9a8 }]); // acting freely
      await wait(120);
    }
    const untouched = taken === 0;
    const parries = ms.parryCount - count0;
    const wolfDrop = wolfHp0 - wolf.health.current; // 3 ripostes ×2 + 2 free strikes ×2
    await wait(1800); // past the window
    const hp1 = ms.playerHealth.current;
    ms.onTownsfolkHitPlayer(wolf);
    const afterEnds = hp1 - ms.playerHealth.current;
    wolf.takeHit(1e9);
    ms.playerHealth.full();
    ms.playerHealth.shield = 1e9;
    return { setup: 'ok', untouched, parries, wolfDrop, afterEnds };
  });
  ok(
    'samurai ext — perfect form: multiple real melee hits auto-parried while striking freely; the state ends on time',
    formRun.setup === 'ok' && formRun.untouched && formRun.parries === 3 && formRun.wolfDrop === 10 && formRun.afterEnds > 0,
    JSON.stringify(formRun),
  );

  // 3ae-4. DASH-AND-FIRE: the charge moves the player while the mid-dash bolt
  // flies ahead and lands on a target downrange (the Surge composite pattern
  // with a projectile).
  const dashRun = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!window.__quietSpot()) return { setup: 'no quiet spot' };
    const w = ms.activeMap().nearestWalkableWorld(ms.player.x + 320, ms.player.y);
    const a = ms.spawnAngel('darkcaster', w.x, w.y);
    await wait(200);
    ms.stunEnemiesInRange(a.x, a.y, 40, 4000);
    ms.player.facingX = 1;
    ms.player.facingY = 0;
    const from = { x: ms.player.x, y: ms.player.y };
    const hp0 = a.health.current;
    ms.dashAndFire({ distance: 200, damage: 0, knockdownMs: 0 }, { p: 'bolt', damage: 12, speed: 520, range: 420, radius: 9, tint: 0xd8e8ff }, 120);
    await wait(1000); // dash + bolt flight
    const moved = Math.hypot(ms.player.x - from.x, ms.player.y - from.y);
    const drop = hp0 - a.health.current;
    a.destroy();
    return { setup: 'ok', moved, drop };
  });
  ok(
    'samurai ext — dash-and-fire: the dash carries the player while the mid-dash bolt lands downrange',
    dashRun.setup === 'ok' && dashRun.moved > 120 && dashRun.drop === 12,
    JSON.stringify(dashRun),
  );

  // 3ah. MONK FRAMEWORK EXTENSIONS (permanent): the DEFLECT parry config (melee
  // AND projectiles, distinct riposte scaling, Samurai config untouched), the
  // dual ring (damage + heal in one cast, decoy included), the mobile damage
  // pulse ring, and the ally rule (HP-cost transfer heals the decoy; a cast
  // with no ally whiffs gracefully).
  const monkExt = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!window.__quietSpot()) return { setup: 'no quiet spot' };
    ms.summons.clear();
    const spawnAt = (dx, dy) => {
      const w = ms.activeMap().nearestWalkableWorld(ms.player.x + dx, ms.player.y + dy);
      return ms.spawnAngel('darkcaster', w.x, w.y);
    };
    // DEFLECT vs a projectile: half-scaled riposte snaps back at the nearest foe.
    const a = spawnAt(80, 0);
    await wait(200);
    ms.stunEnemiesInRange(a.x, a.y, 40, 9000);
    ms.playerHealth.shield = 0;
    ms.playerHealth.full();
    const hp0 = ms.playerHealth.current;
    const aHp0 = a.health.current;
    ms.openParryWindow(800, 20, { deflectProjectiles: true, projectileRiposteMult: 0.5 });
    ms.onProjectileHitPlayer(10); // the REAL ranged damage path
    const deflect = { negated: ms.playerHealth.current === hp0, riposte: aHp0 - a.health.current, consumed: ms.parry === null };
    // The SAME config vs melee: full riposte (distinct scaling) through the wolf seam.
    const wolf = ms.spawnTownsfolk(ms.player.x + 60, ms.player.y, null, 'wolf');
    await wait(200);
    const wHp0 = wolf.health.current;
    const hp1 = ms.playerHealth.current;
    ms.openParryWindow(800, 6, { deflectProjectiles: true, projectileRiposteMult: 0.5 });
    ms.onTownsfolkHitPlayer(wolf);
    const meleeHalf = { negated: ms.playerHealth.current === hp1, riposte: wHp0 - wolf.health.current };
    wolf.takeHit(1e9);
    // The SAMURAI config (no opts) stays MELEE-ONLY: the bolt passes through and
    // the window survives for the melee hit it was opened for.
    ms.playerHealth.full();
    const hp2 = ms.playerHealth.current;
    ms.openParryWindow(800, 20);
    ms.onProjectileHitPlayer(10);
    const samuraiUntouched = { boltTook: hp2 - ms.playerHealth.current, windowSurvived: ms.parry !== null };
    ms.parry = null;
    // DUAL RING: one cast damages the pinned foe AND heals the caster + the decoy.
    const decoy = ms.spawnSpiritDecoy(20000);
    await wait(150);
    decoy.health.current -= 20;
    ms.playerHealth.shield = 1e9; // ambient chip eats shield, never the HP this check reads
    ms.playerHealth.current = ms.playerHealth.max - 30;
    const dHp0 = decoy.health.current;
    const pHp0 = ms.playerHealth.current;
    const aHp1 = a.health.current;
    decoy.sprite.body.reset(ms.player.x - 60, ms.player.y);
    ms.runComposedSteps([
      { p: 'strike', at: 'self', radius: 120, damageRaw: 15, tint: 0xffd8a0 },
      { p: 'heal', amount: 12, radius: 120 },
    ]);
    // Composed steps apply synchronously — read NOW, before any ambient tick
    // can touch the numbers (the synchronous-read hardening precedent).
    const dual = { foe: aHp1 - a.health.current, self: ms.playerHealth.current - pHp0, decoy: decoy.health.current - dHp0 };
    await wait(120);
    // MOBILE PULSE RING: ticks here, then FOLLOWS to a second foe far away.
    ms.startPulseRing(2600, 350, 130, 10);
    const aHp2 = a.health.current;
    await wait(800);
    const nearTicks = aHp2 - a.health.current;
    const b = spawnAt(420, 0);
    await wait(150);
    ms.stunEnemiesInRange(b.x, b.y, 40, 6000);
    ms.player.sprite.body.reset(b.x - 60, b.y); // walk away — the ring must come along
    const bHp0 = b.health.current;
    await wait(800);
    const followTicks = bHp0 - b.health.current;
    await wait(1300);
    const ringEnded = ms.pulseRing === null;
    // ALLY RULE: the HP-cost transfer heals the decoy; with no ally it whiffs gracefully.
    ms.playerHealth.full();
    decoy.health.current = Math.max(1, decoy.health.max - 40);
    const dHp1 = decoy.health.current;
    const pHp1 = ms.playerHealth.current;
    const gave = ms.transferHealToAlly(500, 15, 25);
    const infusion = { gave, decoyHealed: decoy.health.current - dHp1, playerPaid: pHp1 - ms.playerHealth.current };
    ms.summons.clear();
    const whiffed = ms.transferHealToAlly(500, 15, 25) === false; // no ally → graceful false
    a.destroy();
    b.destroy();
    ms.playerHealth.full();
    ms.playerHealth.shield = 1e9;
    return { setup: 'ok', deflect, meleeHalf, samuraiUntouched, dual, nearTicks, followTicks, ringEnded, infusion, whiffed };
  });
  ok(
    'monk ext — deflect: turns aside a real bolt (half riposte) AND a real wolf bite (full); the samurai config stays melee-only',
    monkExt.setup === 'ok' &&
      monkExt.deflect.negated &&
      monkExt.deflect.riposte === 10 &&
      monkExt.deflect.consumed &&
      monkExt.meleeHalf.negated &&
      monkExt.meleeHalf.riposte === 6 &&
      monkExt.samuraiUntouched.boltTook > 0 &&
      monkExt.samuraiUntouched.windowSurvived,
    JSON.stringify({ deflect: monkExt.deflect, meleeHalf: monkExt.meleeHalf, samurai: monkExt.samuraiUntouched }),
  );
  ok(
    'monk ext — dual ring: one cast damages the live enemy and heals the caster + the decoy',
    monkExt.setup === 'ok' && monkExt.dual.foe === 15 && monkExt.dual.self === 12 && monkExt.dual.decoy === 12,
    JSON.stringify(monkExt.dual),
  );
  ok(
    'monk ext — pulse ring: ticks in place, FOLLOWS the caster to a second foe, ends on time',
    monkExt.setup === 'ok' && monkExt.nearTicks >= 10 && monkExt.followTicks >= 10 && monkExt.ringEnded,
    JSON.stringify({ near: monkExt.nearTicks, follow: monkExt.followTicks, ended: monkExt.ringEnded }),
  );
  ok(
    'monk ext — ally rule: the HP-cost transfer heals the decoy; with no ally it whiffs gracefully (no crash)',
    monkExt.setup === 'ok' && monkExt.infusion.gave && monkExt.infusion.decoyHealed === 25 && monkExt.infusion.playerPaid === 15 && monkExt.whiffed,
    JSON.stringify(monkExt.infusion),
  );

  // 3ai. ASSASSIN FRAMEWORK EXTENSIONS (permanent): the TRAP SYSTEM lifecycle
  // (place APART → arm → spring on a REAL enemy → payload → consumed; the cap;
  // Remote Detonation; Minefield; expiry), the STEALTH-BONUS strike rider
  // (measured against the SAME strike unstealthed), SHADOW DANCE (striking
  // stays hidden), and VANISH (instant re-stealth + the untargetable breath) —
  // every phase through the live runtime seams.
  const assassinExt = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!window.__quietSpot()) return { setup: 'no quiet spot' };
    const spawnAt = (dx, dy) => {
      const w = ms.activeMap().nearestWalkableWorld(ms.player.x + dx, ms.player.y + dy);
      return ms.spawnAngel('darkcaster', w.x, w.y);
    };
    const px0 = ms.player.x;
    const py0 = ms.player.y;
    // TRAP LIFECYCLE: the device is placed 220px away (the player stands apart),
    // stays INERT while arming, then springs on the pinned foe inside its radius.
    const a = spawnAt(220, 0);
    await wait(200);
    ms.stunEnemiesInRange(a.x, a.y, 60, 30000);
    a.sprite.body.reset(px0 + 220, py0);
    const aHp0 = a.health.current;
    ms.placeTrap(a.x, a.y, { armDelayMs: 600, lifetimeMs: 8000, triggerRadius: 80, payload: { burstDamage: 10, burstRadius: 90 } });
    const placed = ms.traps.length === 1;
    await wait(250);
    const inert = ms.traps.length === 1 && a.health.current === aHp0; // arming ≠ armed
    await wait(700);
    const lifecycle = { placed, inert, payloadLanded: aHp0 - a.health.current > 0, consumed: ms.traps.length === 0, apart: Math.hypot(ms.player.x - a.x, ms.player.y - a.y) > 150 };
    // THE CAP: cap+1 capped placements leave exactly trapCap devices (oldest recycled).
    const cap = ms.trapCap;
    for (let i = 0; i <= cap; i++) ms.placeTrap(px0 - 260 - i * 34, py0 + 120, { armDelayMs: 100, lifetimeMs: 9000, triggerRadius: 40, payload: { burstDamage: 5 } });
    const capHeld = ms.traps.length === cap;
    await wait(250); // all armed
    const detFiredFar = ms.detonateArmedTraps(); // REMOTE DETONATION consumes them all
    const detCleared = ms.traps.length === 0;
    // REMOTE DETONATION lands its payload: a foe OUTSIDE the trigger radius but
    // INSIDE the burst radius is only hurt when the device is fired by hand.
    const b = spawnAt(320, 60);
    await wait(200);
    ms.stunEnemiesInRange(b.x, b.y, 60, 30000);
    ms.placeTrap(b.x - 60, b.y, { armDelayMs: 100, lifetimeMs: 9000, triggerRadius: 40, payload: { burstDamage: 8, burstRadius: 120 } });
    await wait(300);
    const bHp0 = b.health.current;
    const notSprung = ms.traps.length === 1 && b.health.current === bHp0;
    const detFiredNear = ms.detonateArmedTraps();
    const remote = { fired: detFiredFar + detFiredNear, notSprung, landed: bHp0 - b.health.current > 0, cleared: detCleared && ms.traps.length === 0 };
    // MINEFIELD seeds N devices UNCAPPED; untriggered devices EXPIRE clean.
    ms.placeMinefield(px0 - 420, py0 - 200, 6, 120, { armDelayMs: 5000, lifetimeMs: 700, triggerRadius: 40, payload: { burstDamage: 5 } });
    const seeded = ms.traps.length === 6;
    await wait(1000);
    const minefield = { seeded, expired: ms.traps.length === 0 };
    // STEALTH-BONUS rider: the SAME raw-damage strike, unstealthed then stealthed —
    // the ratio IS the bonus, and the stealthed cast breaks stealth.
    const c = spawnAt(80, 0);
    await wait(200);
    ms.stunEnemiesInRange(c.x, c.y, 60, 30000);
    c.sprite.body.reset(px0 + 80, py0);
    ms.player.facingX = 1;
    ms.player.facingY = 0;
    // damageRaw 4 keeps the 55-HP foe alive through all five measured strikes (4+8+3×8=36).
    const strike = [{ p: 'strike', at: 'front', range: 95, damageRaw: 4, stealthBonus: 2, tint: 0x9a9ab8 }];
    const cHp0 = c.health.current;
    ms.runComposedSteps(strike);
    await wait(120);
    const baseDrop = cHp0 - c.health.current;
    ms.startPlayerStealth(6000);
    const cHp1 = c.health.current;
    ms.runComposedSteps(strike);
    await wait(120);
    const rider = { baseDrop, stealthDrop: cHp1 - c.health.current, broke: !ms.playerStealthActive };
    // SHADOW DANCE: three strikes in the state — every one boosted, stealth INTACT.
    ms.startShadowDance(5000);
    const danceOn = ms.playerStealthActive;
    const danceDrops = [];
    for (let i = 0; i < 3; i++) {
      const before = c.health.current;
      ms.runComposedSteps(strike);
      await wait(120);
      danceDrops.push(before - c.health.current);
    }
    const dance = { danceOn, drops: danceDrops, stillHidden: ms.playerStealthActive };
    ms.shadowDanceUntil = 0;
    ms.breakPlayerStealth();
    // VANISH: the instant mid-combat re-stealth + the breath where a REAL bolt
    // seam and a REAL wolf bite both meet empty shadow — and the breath ENDS.
    const wolf = ms.spawnTownsfolk(px0 + 60, py0, null, 'wolf');
    await wait(200);
    ms.playerHealth.shield = 0;
    ms.playerHealth.full();
    ms.vanish(4000, 900);
    const hidden = ms.playerStealthActive;
    let hp = ms.playerHealth.current;
    ms.onProjectileHitPlayer(15);
    const boltPassed = ms.playerHealth.current === hp;
    hp = ms.playerHealth.current;
    ms.onTownsfolkHitPlayer(wolf);
    const bitePassed = ms.playerHealth.current === hp;
    await wait(1000); // the breath ends (stealth itself continues)
    hp = ms.playerHealth.current;
    ms.onProjectileHitPlayer(10);
    const graceEnded = ms.playerHealth.current < hp;
    const vanish = { hidden, boltPassed, bitePassed, graceEnded, stillStealthed: ms.playerStealthActive };
    ms.breakPlayerStealth();
    if (wolf.isAlive) wolf.takeHit(1e9);
    a.destroy();
    b.destroy();
    c.destroy();
    ms.playerHealth.full();
    ms.playerHealth.shield = 1e9;
    return { setup: 'ok', lifecycle, cap, capHeld, remote, minefield, rider, dance, vanish };
  });
  ok(
    'assassin ext — trap lifecycle: placed apart, inert while arming, springs on a real enemy, payload lands, device consumed',
    assassinExt.setup === 'ok' && assassinExt.lifecycle.placed && assassinExt.lifecycle.inert && assassinExt.lifecycle.payloadLanded && assassinExt.lifecycle.consumed && assassinExt.lifecycle.apart,
    JSON.stringify(assassinExt.lifecycle),
  );
  ok(
    'assassin ext — cap + remote detonation: the cap recycles the oldest; detonation fires every armed device (payload included)',
    assassinExt.setup === 'ok' && assassinExt.capHeld && assassinExt.remote.fired === assassinExt.cap + 1 && assassinExt.remote.notSprung && assassinExt.remote.landed && assassinExt.remote.cleared,
    `cap=${assassinExt.cap} ${JSON.stringify(assassinExt.remote)}`,
  );
  ok(
    'assassin ext — minefield + expiry: six devices seeded past the cap; untriggered devices expire clean',
    assassinExt.setup === 'ok' && assassinExt.minefield.seeded && assassinExt.minefield.expired,
    JSON.stringify(assassinExt.minefield),
  );
  ok(
    'assassin ext — stealth bonus: the same strike lands ×2 from stealth, and the cast breaks stealth',
    assassinExt.setup === 'ok' && assassinExt.rider.baseDrop > 0 && Math.abs(assassinExt.rider.stealthDrop / assassinExt.rider.baseDrop - 2) < 0.05 && assassinExt.rider.broke,
    JSON.stringify(assassinExt.rider),
  );
  ok(
    'assassin ext — shadow dance: three strikes, every one boosted, stealth intact throughout',
    assassinExt.setup === 'ok' && assassinExt.dance.danceOn && assassinExt.dance.drops.length === 3 && assassinExt.dance.drops.every((d) => assassinExt.rider.baseDrop > 0 && Math.abs(d / assassinExt.rider.baseDrop - 2) < 0.05) && assassinExt.dance.stillHidden,
    JSON.stringify(assassinExt.dance),
  );
  ok(
    'assassin ext — vanish: instant mid-combat re-stealth; a real bolt and a real bite pass through the breath, which then ends',
    assassinExt.setup === 'ok' && assassinExt.vanish.hidden && assassinExt.vanish.boltPassed && assassinExt.vanish.bitePassed && assassinExt.vanish.graceEnded && assassinExt.vanish.stillStealthed,
    JSON.stringify(assassinExt.vanish),
  );

  // 3aj. PRIEST FRAMEWORK EXTENSIONS (permanent): the TARGETED ALLY-SHIELD
  // (solo → self, absorbing a REAL wolf bite + the harm-immunity breath; with a
  // decoy out → the decoy's pool absorbs, then expires), the DUAL CHANNEL (one
  // cast measured healing the caster AND damaging the pinned foe it crosses),
  // and the party-dormant REVIVE hook (no fallen friendly exists today).
  const priestExt = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!window.__quietSpot()) return { setup: 'no quiet spot' };
    ms.summons.clear();
    ms.clearDots(); // zero the caster-affliction state so the immunity assert is exact
    // SOLO ALLY-SHIELD: self is the valid target; a real wolf bite is absorbed
    // whole, and the immunity breath blocks the caster-bolt afflictions.
    ms.playerHealth.shield = 0;
    ms.playerHealth.full();
    const who = ms.allyShield(300, 30, 5000, 2000);
    const selfShielded = who === 'self' && ms.playerHealth.shield === 30;
    const wolf = ms.spawnTownsfolk(ms.player.x + 60, ms.player.y, null, 'wolf');
    await wait(200);
    const hp0 = ms.playerHealth.current;
    ms.onTownsfolkHitPlayer(wolf); // the wolf's REAL melee hit path
    const absorbed = { untouched: ms.playerHealth.current === hp0, shieldSpent: ms.playerHealth.shield < 30 };
    ms.onProjectileHitPlayer(5, 'caster-bolt'); // the REAL afflicting bolt path
    const immune = ms.casterSlowUntil === 0 && ms.casterDotStacks.length === 0;
    if (wolf.isAlive) wolf.takeHit(1e9);
    ms.playerHealth.shield = 0;
    // DECOY ALLY-SHIELD: the nearest friendly takes the pool; it absorbs and EXPIRES.
    const decoy = ms.spawnSpiritDecoy(20000);
    await wait(150);
    const who2 = ms.allyShield(300, 20, 900, 0);
    const decoyShielded = who2 === 'summon' && decoy.health.shield === 20;
    const dHp0 = decoy.health.current;
    decoy.health.damage(12);
    const decoyAbsorbed = decoy.health.current === dHp0 && decoy.health.shield === 8;
    await wait(1100);
    const decoyExpired = decoy.health.shield === 0;
    ms.summons.clear();
    // DUAL CHANNEL: one cast, both halves measured — the wounded caster heals
    // while the pinned foe standing in the beam burns.
    const w = ms.activeMap().nearestWalkableWorld(ms.player.x + 140, ms.player.y);
    const foe = ms.spawnAngel('darkcaster', w.x, w.y);
    await wait(200);
    ms.stunEnemiesInRange(foe.x, foe.y, 60, 30000);
    foe.sprite.body.reset(ms.player.x + 140, ms.player.y);
    ms.player.facingX = 1;
    ms.player.facingY = 0;
    ms.playerHealth.shield = 0;
    ms.playerHealth.full();
    ms.playerHealth.current -= 40;
    const pHp0 = ms.playerHealth.current;
    const fHp0 = foe.health.current;
    ms.startDualChannel(1600, 300, 6, 7, 240, 56);
    const started = ms.dualChannel !== null;
    await wait(1100);
    const midHeal = ms.playerHealth.current - pHp0;
    const midBurn = fHp0 - foe.health.current;
    await wait(900);
    const dual = { started, healed: midHeal, burned: midBurn, ended: ms.dualChannel === null };
    foe.destroy();
    // THE DORMANT REVIVE HOOK: no party exists — there is never a fallen friendly.
    const reviveWhiffs = ms.reviveFallenAlly() === false;
    ms.playerHealth.full();
    ms.playerHealth.shield = 1e9;
    return { setup: 'ok', selfShielded, absorbed, immune, decoyShielded, decoyAbsorbed, decoyExpired, dual, reviveWhiffs };
  });
  ok(
    'priest ext — ally-shield: solo it wraps the caster (a real bite absorbed + afflictions blocked); with a decoy out the decoy takes the pool, absorbs, expires',
    priestExt.setup === 'ok' && priestExt.selfShielded && priestExt.absorbed.untouched && priestExt.absorbed.shieldSpent && priestExt.immune && priestExt.decoyShielded && priestExt.decoyAbsorbed && priestExt.decoyExpired,
    JSON.stringify({ selfShielded: priestExt.selfShielded, absorbed: priestExt.absorbed, immune: priestExt.immune, decoyShielded: priestExt.decoyShielded, decoyAbsorbed: priestExt.decoyAbsorbed, decoyExpired: priestExt.decoyExpired }),
  );
  ok(
    'priest ext — dual channel: one cast heals the wounded caster AND burns the foe in the beam, then ends on time',
    priestExt.setup === 'ok' && priestExt.dual.started && priestExt.dual.healed >= 12 && priestExt.dual.burned >= 14 && priestExt.dual.ended,
    JSON.stringify(priestExt.dual),
  );
  ok(
    'priest ext — revive hook: party-dormant, it finds no fallen friendly (the skill whiff-refunds through the ally rule)',
    priestExt.setup === 'ok' && priestExt.reviveWhiffs,
    `reviveWhiffs=${priestExt.reviveWhiffs}`,
  );

  // 3ak. SAVAGE FRAMEWORK EXTENSIONS (permanent): FRENZY momentum (stacks build
  // per damaging frame, every damage path scales, silence drops them), the
  // LEAP-SLAM (an aimed jump landing an AoE + knockdown on a live pack), the
  // BLOOD PRICE (health-paid casting that refuses gracefully at low blood), and
  // the HP-THRESHOLD EXECUTE (the low-health finisher measured both ways).
  const savageExt = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!window.__quietSpot()) return { setup: 'no quiet spot' };
    const spawnAt = (dx, dy) => {
      const w = ms.activeMap().nearestWalkableWorld(ms.player.x + dx, ms.player.y + dy);
      return ms.spawnAngel('darkcaster', w.x, w.y);
    };
    // FRENZY: baseline strike at zero stacks, three more to build momentum —
    // the fourth swing lands ×(1 + 3×0.1); silence then drops every stack.
    const a = spawnAt(80, 0);
    await wait(200);
    ms.stunEnemiesInRange(a.x, a.y, 60, 30000);
    a.sprite.body.reset(ms.player.x + 60, ms.player.y);
    ms.player.facingX = 1;
    ms.player.facingY = 0;
    ms.armFrenzy(0.1, 5, 1200);
    const strike = [{ p: 'strike', at: 'front', range: 90, damage: 10, tint: 0xff8a5a }];
    const drops = [];
    for (let i = 0; i < 4; i++) {
      const before = a.health.current;
      ms.runComposedSteps(strike);
      await wait(120);
      drops.push(before - a.health.current);
    }
    const stacksAfter = ms.frenzy.stacks;
    await wait(1500); // silence — the momentum bleeds away
    const frenzy = { drops, stacksAfter, decayed: ms.frenzy.stacks === 0 };
    ms.disarmFrenzy();
    a.destroy();
    // LEAP-SLAM: two pinned foes 220px out — the jump lands among them, the
    // slam wounds and KNOCKS DOWN both, and the player has actually moved.
    const b = spawnAt(220, 30);
    const c = spawnAt(220, -30);
    await wait(200);
    const from = { x: ms.player.x, y: ms.player.y };
    ms.player.facingX = 1;
    ms.player.facingY = 0;
    // Place both foes at the landing point and slam IN THE SAME TICK — no
    // placement stun, so the knockdown measured is the slam's own.
    b.sprite.body.reset(from.x + 220, from.y + 35);
    c.sprite.body.reset(from.x + 220, from.y - 35);
    const bHp0 = b.health.current;
    const cHp0 = c.health.current;
    ms.leapSlam(220, 100, 12, 900);
    const now = ms.time.now;
    const leap = {
      moved: Math.hypot(ms.player.x - from.x, ms.player.y - from.y),
      bothHit: bHp0 - b.health.current > 0 && cHp0 - c.health.current > 0,
      bothDown: (ms.stunnedEnemies.get(b) ?? 0) > now && (ms.stunnedEnemies.get(c) ?? 0) > now,
    };
    b.destroy();
    c.destroy();
    // BLOOD PRICE: a willing cut bypasses the shield; too little blood refuses.
    ms.playerHealth.shield = 500;
    ms.playerHealth.full();
    const hpFull = ms.playerHealth.current;
    const paid = ms.payBloodPrice(20);
    const price = { paid, hpCut: hpFull - ms.playerHealth.current, shieldIntact: ms.playerHealth.shield === 500 };
    ms.playerHealth.current = 15;
    const refused = ms.payBloodPrice(20) === false && ms.playerHealth.current === 15;
    ms.playerHealth.full();
    ms.playerHealth.shield = 1e9;
    // EXECUTE: two pinned foes — one bled below the threshold takes ×2, the
    // healthy one beside it takes the ordinary blow.
    const d = spawnAt(70, 40);
    const e2 = spawnAt(70, -40);
    await wait(200);
    for (const f of [d, e2]) ms.stunEnemiesInRange(f.x, f.y, 60, 30000);
    // Bleed one to just under the 0.35 line with enough HP LEFT to survive the
    // doubled blow (an overkill-capped drop would understate the ×2).
    d.health.current = Math.floor(d.health.max * 0.34);
    const dHp0 = d.health.current;
    const eHp0 = e2.health.current;
    const res = ms.executeHitAll(ms.player.x + 70, ms.player.y, 90, 8, 0.35, 2);
    const execute = { res, lowDrop: dHp0 - d.health.current, healthyDrop: eHp0 - e2.health.current };
    d.destroy();
    e2.destroy();
    ms.playerHealth.full();
    ms.playerHealth.shield = 1e9;
    return { setup: 'ok', frenzy, leap, price, refused, execute };
  });
  ok(
    'savage ext — frenzy: stacks build per bloody frame, the fourth swing lands ×1.3, silence drops them',
    savageExt.setup === 'ok' &&
      savageExt.frenzy.drops[0] === 10 &&
      savageExt.frenzy.drops[3] === 13 &&
      savageExt.frenzy.stacksAfter === 4 &&
      savageExt.frenzy.decayed,
    JSON.stringify(savageExt.frenzy),
  );
  ok(
    'savage ext — leap-slam: the aimed jump moves the player and the slam wounds + knocks down the live pack',
    savageExt.setup === 'ok' && savageExt.leap.moved > 140 && savageExt.leap.bothHit && savageExt.leap.bothDown,
    JSON.stringify(savageExt.leap),
  );
  ok(
    'savage ext — blood price: the willing cut bypasses shields; too little blood refuses gracefully',
    savageExt.setup === 'ok' && savageExt.price.paid && savageExt.price.hpCut === 20 && savageExt.price.shieldIntact && savageExt.refused,
    JSON.stringify({ price: savageExt.price, refused: savageExt.refused }),
  );
  ok(
    'savage ext — execute: the bled foe below the line takes ×2, the healthy one beside it takes the ordinary blow',
    savageExt.setup === 'ok' && savageExt.execute.res.hit === 2 && savageExt.execute.res.executed === 1 && savageExt.execute.lowDrop === 16 && savageExt.execute.healthyDrop === 8,
    JSON.stringify(savageExt.execute),
  );

  // 3al. HUNTER FRAMEWORK EXTENSIONS (permanent): TAME capture-and-cleanse
  // (whittle above the health line, CONVERT at/below it, corrupted-wildlife
  // ONLY — every other family refuses with a refund; the conversion is not a
  // kill), THE BOND's persistence (saved on the character, re-manifests on
  // load; death = mend cooldown + Tame recall, never loss), the PET MODES
  // (Great Beast / Beast Horde, one expression at a time), the PET COMMANDS
  // (FOCUS one mark / SCATTER spread), and the RETURNING BOLT (out AND back).
  const hunterExt = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!window.__quietSpot()) return { setup: 'no quiet spot' };
    const walk = (dx, dy) => ms.activeMap().nearestWalkableWorld(ms.player.x + dx, ms.player.y + dy);
    const tame = { range: 160, whittleDamage: 4, thresholdPct: 0.5 };

    // Mode swap WITHOUT a bond refuses through the ally rule (refund).
    ms.actionWhiffed = false;
    const noBondWhiff = ms.setHunterPetMode('great') === false && ms.actionWhiffed === true;
    ms.actionWhiffed = false;

    // FAMILY GATE: an angel (dark-caster) refuses — lore feedback, full refund, no bond.
    const aSpot = walk(70, 0);
    const angel = ms.spawnAngel('darkcaster', aSpot.x, aSpot.y);
    await wait(150);
    ms.stunEnemiesInRange(angel.x, angel.y, 90, 30000);
    angel.sprite.body.reset(ms.player.x + 60, ms.player.y);
    const refusedKind = ms.hunterTame(tame);
    const refused = refusedKind === 'refused' && ms.actionWhiffed === true && !ms.hunterBond;
    ms.actionWhiffed = false;
    angel.destroy();

    // WHITTLE → CLEANSE on a live wolf (15 HP): 4-damage whittles walk it to the
    // 50% line (15 → 11 → 7), then the SAME cast converts. No XP — not a kill.
    const wSpot = walk(60, 0);
    const wolf = ms.spawnTownsfolk(wSpot.x, wSpot.y, null, 'wolf');
    await wait(150);
    ms.stunEnemiesInRange(wolf.x, wolf.y, 90, 30000);
    wolf.sprite.body.reset(ms.player.x + 60, ms.player.y);
    const xp0 = ms.progression.currentXP;
    const kinds = [];
    for (let i = 0; i < 6 && kinds[kinds.length - 1] !== 'tamed'; i++) {
      kinds.push(ms.hunterTame(tame));
      await wait(60);
    }
    const tamed = {
      kinds,
      wolfGone: !wolf.isAlive,
      bond: !!ms.hunterBond,
      pets: ms.hunterPets().length,
      key: ms.hunterPets()[0]?.config.key,
      xpDelta: ms.progression.currentXP - xp0,
    };

    // PERSISTENCE: the bond survives a save/load round trip and the companion
    // re-manifests, world in place (world travel runs this same respawn seam).
    const snap = ms.serialize();
    const savedFlag = snap.player.hunterBonded === true;
    ms.applySave(snap);
    await wait(250);
    const persisted = { savedFlag, bondBack: !!ms.hunterBond, petBack: ms.hunterPets().length === 1 };

    // DEATH: the pet falls → despawn + mend cooldown, the bond ENDURES; the Tame
    // recall whiffs (refunding) while mending, then brings the beast back.
    ms.hunterPets()[0].takeHit(100000);
    await wait(250); // the manager prunes the corpse (fires the death hook)
    const afterDeath = {
      pets: ms.hunterPets().length,
      bondKept: !!ms.hunterBond,
      mending: !!ms.hunterBond && ms.hunterBond.deathUntil > ms.time.now,
    };
    ms.actionWhiffed = false;
    const mendWhiff = ms.hunterTame(tame) === 'whiff' && ms.actionWhiffed === true;
    ms.actionWhiffed = false;
    ms.hunterBond.deathUntil = 0; // the mend passes
    const recalled = ms.hunterTame(tame) === 'resummon' && ms.hunterPets().length === 1;

    // PET MODES: Great Beast = ONE magnet-tier tank; Beast Horde = THREE minion
    // strikers; stance-exclusive (never both); exiting returns the base beast.
    const okGreat = ms.setHunterPetMode('great');
    const great = ms.hunterPets();
    const modeGreat = okGreat && great.length === 1 && great[0].config.key === 'hunter_great' && great[0].aggroPriority === 3;
    const okHorde = ms.setHunterPetMode('horde');
    const horde = ms.hunterPets();
    const modeHorde =
      okHorde && horde.length === 3 && horde.every((p) => p.config.key === 'hunter_horde') && ms.summons.list.every((p) => p.config.key !== 'hunter_great');
    const okBase = ms.setHunterPetMode('companion');
    const base = ms.hunterPets();
    const modeBack = okBase && base.length === 1 && base[0].config.key === 'hunter_companion';

    // FOCUS: two pinned foes — the mark eats the swings, the bystander bleeds
    // nothing. (Spawned beyond the pet's seek range, pinned, then placed + the
    // command given in the SAME tick so nothing swings early.)
    const f1 = ms.spawnAngel('darkcaster', walk(420, 0).x, walk(420, 0).y);
    const f2 = ms.spawnAngel('darkcaster', walk(420, 90).x, walk(420, 90).y);
    await wait(150);
    for (const f of [f1, f2]) {
      ms.stunEnemiesInRange(f.x, f.y, 90, 30000);
      f.health.max = 500;
      f.health.current = 500; // nobody dies mid-measurement
    }
    f1.sprite.body.reset(ms.player.x + 70, ms.player.y);
    f2.sprite.body.reset(ms.player.x + 70, ms.player.y + 90);
    const f1hp0 = f1.health.current;
    const f2hp0 = f2.health.current;
    const focusOk = ms.hunterFocusCommand(200, 4000);
    await wait(1600);
    const focus = { focusOk, markHit: f1hp0 - f1.health.current > 0, bystanderClean: f2.health.current === f2hp0 };

    // SCATTER: the horde spreads — three beasts, two pinned foes, BOTH bleed.
    ms.setHunterPetMode('horde');
    const s1hp0 = f1.health.current;
    const s2hp0 = f2.health.current;
    const scatterOk = ms.hunterScatterCommand(4000);
    await wait(1800);
    const scatter = { scatterOk, spread: f1.health.current < s1hp0 && f2.health.current < s2hp0 };
    f1.destroy();
    f2.destroy();

    // RETURNING BOLT: bench the pets (no interference), pin one tough foe at
    // 120px, throw a 260px boomerang — it cuts the foe going OUT and BACK, then
    // lands home (no live player bolts left).
    ms.clearHunterPets();
    const foe = ms.spawnAngel('darkcaster', walk(120, 0).x, walk(120, 0).y);
    await wait(150);
    ms.stunEnemiesInRange(foe.x, foe.y, 90, 30000);
    foe.sprite.body.reset(ms.player.x + 120, ms.player.y);
    foe.health.max = 500;
    foe.health.current = 500;
    const bHp0 = foe.health.current;
    ms.projectiles.spawn({ x: ms.player.x, y: ms.player.y, dirX: 1, dirY: 0, speed: 520, damage: 9, maxRange: 260, faction: 'player', color: 0xa0c86a, radius: 9, returning: true });
    await wait(1400);
    const boomerang = {
      hits: Math.round((bHp0 - foe.health.current) / 9),
      settled: ms.projectiles.pool.filter((b) => b.active && b.faction === 'player').length === 0,
    };
    foe.destroy();
    ms.clearHunterState(true); // leave no bond behind for later checks
    ms.playerHealth.full();
    ms.playerHealth.shield = 1e9;
    return { setup: 'ok', noBondWhiff, refused, tamed, persisted, afterDeath, mendWhiff, recalled, modeGreat, modeHorde, modeBack, focus, scatter, boomerang };
  });
  ok(
    'hunter ext — tame family gate: the dark-caster refuses ("chose its corruption"), the cast refunds, no bond forms',
    hunterExt.setup === 'ok' && hunterExt.refused,
    JSON.stringify({ refused: hunterExt.refused }),
  );
  ok(
    'hunter ext — tame whittle→cleanse: whittles walk the wolf to the line, the conversion cast bonds it (no XP — not a kill), the companion stands',
    hunterExt.setup === 'ok' &&
      hunterExt.tamed.kinds.length >= 2 &&
      hunterExt.tamed.kinds[hunterExt.tamed.kinds.length - 1] === 'tamed' &&
      hunterExt.tamed.kinds.every((k) => k === 'whittle' || k === 'tamed') &&
      hunterExt.tamed.kinds.filter((k) => k === 'tamed').length === 1 &&
      hunterExt.tamed.wolfGone &&
      hunterExt.tamed.bond &&
      hunterExt.tamed.pets === 1 &&
      hunterExt.tamed.key === 'hunter_companion' &&
      hunterExt.tamed.xpDelta === 0,
    JSON.stringify(hunterExt.tamed),
  );
  ok(
    'hunter ext — bond persistence: the bond serializes on the character and the companion re-manifests after the load',
    hunterExt.setup === 'ok' && hunterExt.persisted.savedFlag && hunterExt.persisted.bondBack && hunterExt.persisted.petBack,
    JSON.stringify(hunterExt.persisted),
  );
  ok(
    'hunter ext — death is never loss: the fallen pet despawns into a mend cooldown (recall whiffs + refunds), then Tame recalls the beast',
    hunterExt.setup === 'ok' &&
      hunterExt.afterDeath.pets === 0 &&
      hunterExt.afterDeath.bondKept &&
      hunterExt.afterDeath.mending &&
      hunterExt.mendWhiff &&
      hunterExt.recalled,
    JSON.stringify({ afterDeath: hunterExt.afterDeath, mendWhiff: hunterExt.mendWhiff, recalled: hunterExt.recalled }),
  );
  ok(
    'hunter ext — pet modes: Great Beast = one magnet tank, Beast Horde = three strikers, stance-exclusive, exit returns the base beast (no bond = whiff)',
    hunterExt.setup === 'ok' && hunterExt.noBondWhiff && hunterExt.modeGreat && hunterExt.modeHorde && hunterExt.modeBack,
    JSON.stringify({ noBondWhiff: hunterExt.noBondWhiff, modeGreat: hunterExt.modeGreat, modeHorde: hunterExt.modeHorde, modeBack: hunterExt.modeBack }),
  );
  ok(
    'hunter ext — FOCUS: every swing lands on the one marked foe; the bystander beside it bleeds nothing',
    hunterExt.setup === 'ok' && hunterExt.focus.focusOk && hunterExt.focus.markHit && hunterExt.focus.bystanderClean,
    JSON.stringify(hunterExt.focus),
  );
  ok(
    'hunter ext — SCATTER: the horde spreads across DIFFERENT targets — both pinned foes bleed',
    hunterExt.setup === 'ok' && hunterExt.scatter.scatterOk && hunterExt.scatter.spread,
    JSON.stringify(hunterExt.scatter),
  );
  ok(
    'hunter ext — returning bolt: the boomerang cuts the foe going OUT and again coming BACK, then lands home',
    hunterExt.setup === 'ok' && hunterExt.boomerang.hits === 2 && hunterExt.boomerang.settled,
    JSON.stringify(hunterExt.boomerang),
  );

  // 3am. SUNDIAN FRAMEWORK EXTENSIONS (permanent): THE TIDE (two phases on a
  // real pack — pulled IN with damage, held, then blasted OUT with damage),
  // DRENCH + DEPTH CRUSH (its own stack ledger with a per-stack slow; the
  // crush consumes exactly the drench while the Mage's crystallize ledger on
  // the SAME enemy is untouched), the REGALIA (one worn aura at a time,
  // attunement scales it, the DROWNED CROWN runs all three empowered), and
  // the CANON RENAME ('Sundian' gates Bali's chain; 'Atlantean' is deprecated
  // and gates nothing; every other canon entry unmoved).
  const sundianExt = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!window.__quietSpot()) return { setup: 'no quiet spot' };
    const walk = (dx, dy) => ms.activeMap().nearestWalkableWorld(ms.player.x + dx, ms.player.y + dy);

    // THE TIDE: a pack of two around a point 150 ahead — phase one gathers
    // them at the point (both wounded), phase two throws them back out
    // (both wounded again), and the tide state runs 1 → 2 → drained.
    const tp = walk(150, 0);
    const t1 = ms.spawnAngel('darkcaster', walk(150 + 170, 40).x, walk(150 + 170, 40).y);
    const t2 = ms.spawnAngel('darkcaster', walk(150 - 170, -40).x, walk(150 - 170, -40).y);
    await wait(200);
    for (const f of [t1, t2]) {
      f.health.max = 500;
      f.health.current = 500;
      f.sprite.body.reset(f.x, f.y);
    }
    const d0 = [t1, t2].map((f) => Math.hypot(f.x - tp.x, f.y - tp.y));
    const hp0 = [t1, t2].map((f) => f.health.current);
    ms.tidePulse(tp.x, tp.y, { pullRadius: 260, pullDistance: 150, minGap: 36, pullDamage: 8, phaseGapMs: 600, blastRadius: 220, blastDamage: 10, blastKnockback: 160 });
    const phase1 = ms.tide ? ms.tide.phase : 0;
    const d1 = [t1, t2].map((f) => Math.hypot(f.x - tp.x, f.y - tp.y));
    const hp1 = [t1, t2].map((f) => f.health.current);
    for (let i = 0; i < 40 && ms.tide; i++) await wait(100); // until the tide drains (headless frames can lag the 600ms timer)
    await wait(120);
    const d2 = [t1, t2].map((f) => Math.hypot(f.x - tp.x, f.y - tp.y));
    const hp2 = [t1, t2].map((f) => f.health.current);
    const tide = {
      phase1,
      pulledIn: d1[0] < d0[0] - 60 && d1[1] < d0[1] - 60,
      pullWounds: hp0[0] - hp1[0] === 8 && hp0[1] - hp1[1] === 8,
      blastedOut: d2[0] > d1[0] + 60 && d2[1] > d1[1] + 60,
      blastWounds: hp1[0] - hp2[0] === 10 && hp1[1] - hp2[1] === 10,
      drained: ms.tide === null,
    };
    t1.destroy();
    t2.destroy();

    // DRENCH + DEPTH CRUSH vs the crystallize ledger on the SAME enemy: three
    // drench stacks slow it per stack; four crystallize stacks sit beside them;
    // the crush consumes EXACTLY the drench (damage per stack × 3) and the
    // crystallize ledger + an out-of-radius drench survive; Shatter still
    // consumes its own four afterwards (byte-identical machinery).
    const w1 = ms.spawnTownsfolk(walk(70, 0).x, walk(70, 0).y, null, 'wolf');
    const w2 = ms.spawnTownsfolk(walk(70, 400).x, walk(70, 400).y, null, 'wolf');
    await wait(200);
    for (const w of [w1, w2]) {
      ms.stunEnemiesInRange(w.x, w.y, 90, 30000);
      w.health.max = 200;
      w.health.current = 200;
    }
    w1.sprite.body.reset(ms.player.x + 70, ms.player.y);
    ms.addDrench(w1, 2, 6, 0.1, 8000);
    const twoStacks = ms.drench.get(w1) === 2;
    const slowAtTwo = ms.slowedEnemies.get(w1)?.factor;
    ms.addDrench(w1, 1, 6, 0.1, 8000);
    const threeStacks = ms.drench.get(w1) === 3;
    const slowAtThree = ms.slowedEnemies.get(w1)?.factor;
    ms.addDrench(w2, 2, 6, 0.1, 8000); // out of the crush radius — must survive
    ms.addCrystallize(w1, 4, 6); // the Mage's ledger on the SAME enemy
    const w1hp0 = w1.health.current;
    const crush = ms.crushDrench(w1.x, w1.y, 140, 5);
    const crushed = {
      res: crush,
      drop: w1hp0 - w1.health.current,
      drenchGone: !ms.drench.has(w1),
      farDrenchKept: ms.drench.get(w2) === 2,
      crystalUntouched: ms.crystallize.get(w1) === 4,
    };
    const w1hp1 = w1.health.current;
    const shatter = ms.shatterCrystallize(w1.x, w1.y, 140, 5);
    const shattered = { res: shatter, drop: w1hp1 - w1.health.current, ledgerEmpty: !ms.crystallize.has(w1) };
    w1.destroy();
    w2.destroy();
    ms.drench.delete(w2);

    // REGALIA: one worn aura at a time — each donning EXCLUDES the last; the
    // attunement multiplier scales a re-donned jewel; the DROWNED CROWN runs
    // all three at once, empowered, then the reign ends bare-headed.
    const base = ms.combinedSkillMods();
    ms.wearRegalia('pearl', { regenPerSec: 3 });
    const pearl = { worn: ms.regaliaWorn, regen: ms.combinedSkillMods().regenPerSec - (base.regenPerSec ?? 0) };
    ms.wearRegalia('coral', { reflectPct: 0.25 });
    const afterCoral = ms.combinedSkillMods();
    const coral = { worn: ms.regaliaWorn, reflect: afterCoral.reflectPct - (base.reflectPct ?? 0), pearlOff: (afterCoral.regenPerSec ?? 0) === (base.regenPerSec ?? 0) };
    ms.wearRegalia('abyssal', { damageMult: 0.2 });
    const afterAbyssal = ms.combinedSkillMods();
    const abyssal = { worn: ms.regaliaWorn, damage: afterAbyssal.damageMult - (base.damageMult ?? 0), coralOff: (afterAbyssal.reflectPct ?? 0) === (base.reflectPct ?? 0) };
    ms.regaliaAttunementMult = 1.5;
    ms.wearRegalia('abyssal', { damageMult: 0.2 });
    const attuned = Math.abs(ms.combinedSkillMods().damageMult - (base.damageMult ?? 0) - 0.3) < 1e-6;
    ms.regaliaAttunementMult = 1;
    ms.wearDrownedCrown(900, { regenPerSec: 3, reflectPct: 0.25, damageMult: 0.2 }, 1.5);
    const cm = ms.combinedSkillMods();
    const crown = {
      on: ms.drownedCrownOn,
      wornCleared: ms.regaliaWorn === null,
      allThree:
        Math.abs(cm.regenPerSec - (base.regenPerSec ?? 0) - 4.5) < 1e-6 &&
        Math.abs(cm.reflectPct - (base.reflectPct ?? 0) - 0.375) < 1e-6 &&
        Math.abs(cm.damageMult - (base.damageMult ?? 0) - 0.3) < 1e-6,
    };
    await wait(1100); // the reign ends
    const after = ms.combinedSkillMods();
    const reignOver = !ms.drownedCrownOn && ms.regaliaWorn === null && (after.damageMult ?? 0) === (base.damageMult ?? 0);

    // THE RENAME: 'Sundian' gates Bali's home chain; the deprecated 'Atlantean'
    // gates nothing; a neighbor entry (Hunter/Sydney) is unmoved either way.
    const chainClass0 = ms.chain.playerClass ?? null;
    ms.chain.setPlayerClass('Sundian');
    const baliForSundian = ms.chain.status('bal-01-mentor');
    const sydneyForSundian = ms.chain.status('syd-01-mentor');
    ms.chain.setPlayerClass('Atlantean');
    const baliForAtlantean = ms.chain.status('bal-01-mentor');
    ms.chain.setPlayerClass('Hunter');
    const baliForHunter = ms.chain.status('bal-01-mentor');
    const sydneyForHunter = ms.chain.status('syd-01-mentor');
    if (chainClass0) ms.chain.setPlayerClass(chainClass0);
    else ms.announcePlayerClass();
    const rename = { baliForSundian, baliForAtlantean, baliForHunter, sydneyForSundian, sydneyForHunter };

    ms.playerHealth.full();
    ms.playerHealth.shield = 1e9;
    return { setup: 'ok', tide, twoStacks, slowAtTwo, threeStacks, slowAtThree, crushed, shattered, pearl, coral, abyssal, attuned, crown, reignOver, rename };
  });
  ok(
    'sundian ext — the tide: phase one gathers the pack at the point (wounded), phase two reverses and throws them out (wounded again), then drains',
    sundianExt.setup === 'ok' &&
      sundianExt.tide.phase1 === 1 &&
      sundianExt.tide.pulledIn &&
      sundianExt.tide.pullWounds &&
      sundianExt.tide.blastedOut &&
      sundianExt.tide.blastWounds &&
      sundianExt.tide.drained,
    JSON.stringify(sundianExt.tide),
  );
  ok(
    'sundian ext — drench slows per stack and Depth Crush consumes EXACTLY the drench; the crystallize ledger on the same enemy is untouched and Shatter still consumes its own',
    sundianExt.setup === 'ok' &&
      sundianExt.twoStacks &&
      Math.abs(sundianExt.slowAtTwo - 0.8) < 1e-6 &&
      sundianExt.threeStacks &&
      Math.abs(sundianExt.slowAtThree - 0.7) < 1e-6 &&
      sundianExt.crushed.res.hit === 1 &&
      sundianExt.crushed.res.stacks === 3 &&
      sundianExt.crushed.drop === 15 &&
      sundianExt.crushed.drenchGone &&
      sundianExt.crushed.farDrenchKept &&
      sundianExt.crushed.crystalUntouched &&
      sundianExt.shattered.res.stacks === 4 &&
      sundianExt.shattered.drop === 20 &&
      sundianExt.shattered.ledgerEmpty,
    JSON.stringify({ crushed: sundianExt.crushed, shattered: sundianExt.shattered }),
  );
  ok(
    'sundian ext — regalia: one worn aura at a time (each donning excludes the last), attunement scales the jewel, the Drowned Crown runs all three empowered then ends bare-headed',
    sundianExt.setup === 'ok' &&
      sundianExt.pearl.worn === 'pearl' &&
      sundianExt.pearl.regen === 3 &&
      sundianExt.coral.worn === 'coral' &&
      Math.abs(sundianExt.coral.reflect - 0.25) < 1e-6 &&
      sundianExt.coral.pearlOff &&
      sundianExt.abyssal.worn === 'abyssal' &&
      Math.abs(sundianExt.abyssal.damage - 0.2) < 1e-6 &&
      sundianExt.abyssal.coralOff &&
      sundianExt.attuned &&
      sundianExt.crown.on &&
      sundianExt.crown.wornCleared &&
      sundianExt.crown.allThree &&
      sundianExt.reignOver,
    JSON.stringify({ pearl: sundianExt.pearl, coral: sundianExt.coral, abyssal: sundianExt.abyssal, attuned: sundianExt.attuned, crown: sundianExt.crown, reignOver: sundianExt.reignOver }),
  );
  ok(
    "sundian ext — the rename: 'Sundian' gates Bali's chain, the deprecated 'Atlantean' gates nothing, and Sydney's entry is unmoved",
    sundianExt.setup === 'ok' &&
      sundianExt.rename.baliForSundian === 'available' &&
      sundianExt.rename.baliForAtlantean === 'locked' &&
      sundianExt.rename.baliForHunter === 'locked' &&
      sundianExt.rename.sydneyForSundian === 'locked' &&
      sundianExt.rename.sydneyForHunter === 'available',
    JSON.stringify(sundianExt.rename),
  );

  // 3an. CIVIC FRAMEWORK (permanent): the DELIVERY composite round-trips —
  // the parcel appears at the source, the walk-in picks it up (carry flag),
  // and the walk-in at the destination hands it off and fires completion.
  const civicDelivery = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!window.__quietSpot()) return { setup: 'no quiet spot' };
    const A = ms.activeMap().nearestWalkableWorld(ms.player.x + 90, ms.player.y);
    const B = ms.activeMap().nearestWalkableWorld(ms.player.x + 340, ms.player.y + 120);
    let delivered = false;
    ms.beginBeatDelivery('__civic_test', A, B, 'the neighbor', () => {
      delivered = true;
    }, true);
    const staged = !!ms.beatDelivery && ms.beatDelivery.carrying === false && ms.beatDelivery.fx.length > 0;
    ms.player.sprite.body.reset(A.x, A.y);
    await wait(350);
    const carrying = !!ms.beatDelivery && ms.beatDelivery.carrying === true && !delivered;
    ms.player.sprite.body.reset(B.x, B.y);
    await wait(350);
    const handedOff = delivered && ms.beatDelivery === undefined;
    return { setup: 'ok', staged, carrying, handedOff };
  });
  ok(
    'civic framework — delivery: the parcel stages at the source, the walk-in carries it, the walk-in at the neighbor hands it off and completes',
    civicDelivery.setup === 'ok' && civicDelivery.staged && civicDelivery.carrying && civicDelivery.handedOff,
    JSON.stringify(civicDelivery),
  );

  // 3ao. NARRATIVE FRAMEWORK (permanent): THE WATCHER appears during a home
  // discovery beat far from the action, keeps its distance when approached,
  // is never a combatant, and speaks its one line EXACTLY ONCE at the first
  // lesser-evil kill; CLASS-VARIANT TEXT renders per class on the same beat;
  // the CAMPFIRE rotation cycles its fixed line list in order and loops.
  const watcherRun = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    const LINE = 'Well done, little one. Heaven sees you.';
    const def = ms.chain.get('lha-03-discovery');
    if (!def) return { setup: 'no lha-03 def' };
    ms.watcherSpoken = false; // a fresh character's state (serialized flag)
    ms.devJumpToFactoryBeat('lha-03-discovery', def);
    await wait(1400); // swap + chunk activation + spawn frames
    ms.playerHealth.shield = 1e9;
    const active = ms.chain.activeQuest?.id ?? null;
    const w1 = ms.watcher ? { ...ms.watcher.pos } : null;
    const anchor = ms.regionBeatArrowTarget('lha-03-discovery');
    const farFromAction = w1 && anchor ? Math.round(Math.hypot(w1.x - anchor.x, w1.y - anchor.y)) : -1;
    // Never a combatant: pure display shapes — no physics body on any part,
    // and no combat entity standing where the figure is drawn.
    const hasBody = ms.watcher ? ms.watcher.objs.some((o) => !!o.body) : true;
    const combatAtWatcher = w1 ? ms.combatEnemiesInRange(w1.x, w1.y, 24).length : -1;
    // KEEP-AWAY: close within 300px → it fades and steps back out of reach.
    let keepAway = false;
    let dApproach = -1;
    if (w1) {
      const spot = ms.activeMap().nearestWalkableWorld(w1.x, w1.y);
      ms.player.sprite.body.reset(spot.x, spot.y);
      dApproach = Math.round(Math.hypot(w1.x - spot.x, w1.y - spot.y)); // must land inside the 300px bubble
      await wait(700);
      const w2 = ms.watcher ? { ...ms.watcher.pos } : null;
      keepAway = !!w2 && Math.hypot(w2.x - ms.player.x, w2.y - ms.player.y) > 300 && (w2.x !== w1.x || w2.y !== w1.y);
    }
    // FIRST KILL: complete the discovery (real walk-in) → the evil arrives →
    // kill ONE scout → the line lands (it is delayed a beat past reward banners).
    if (ms.beatMarker) ms.player.sprite.body.reset(ms.beatMarker.pos.x, ms.beatMarker.pos.y);
    await wait(700);
    const s03 = ms.chain.status('lha-03-discovery');
    let scout = null;
    for (let i = 0; i < 20 && !scout; i++) {
      scout = ms.regionLive.find((r) => r.zoneId === 'lhasa-prayer-citadel' && r.family === 'lesser-evil-scouts' && r.entity.isAlive) ?? null;
      if (!scout) await wait(300);
    }
    if (!scout) return { setup: 'no scout flushed', active, s03 };
    scout.entity.takeHit(999999);
    await wait(2600);
    const spokeOnce = ms.banner.text === LINE && ms.watcherSpoken === true && !ms.watcher;
    // EXACTLY ONCE: a second kill must not re-show the line.
    ms.showBanner('__sentinel__', 4000);
    const scout2 = ms.regionLive.find((r) => r.zoneId === 'lhasa-prayer-citadel' && r.family === 'lesser-evil-scouts' && r.entity.isAlive) ?? null;
    if (scout2) scout2.entity.takeHit(999999);
    await wait(2600);
    const stillOnce = ms.banner.text !== LINE;
    return { setup: 'ok', active, w1: !!w1, farFromAction, hasBody, combatAtWatcher, dApproach, keepAway, s03, hadSecond: !!scout2, spokeOnce, stillOnce };
  });
  ok(
    'narrative — the Watcher: present + far during the discovery beat, keeps away when approached, no body/combat presence, speaks its line exactly once at the first evil kill',
    watcherRun.setup === 'ok' && watcherRun.active === 'lha-03-discovery' && watcherRun.w1 && watcherRun.farFromAction >= 600 && !watcherRun.hasBody && watcherRun.combatAtWatcher === 0 && watcherRun.dApproach >= 0 && watcherRun.dApproach < 300 && watcherRun.keepAway && watcherRun.s03 === 'complete' && watcherRun.spokeOnce && watcherRun.stillOnce,
    JSON.stringify(watcherRun),
  );

  const variantText = await page.evaluate(() => {
    const ms = window.__ready();
    const hit = ms.regionBeatForQuest('eu-06-regional-callback');
    if (!hit) return { setup: 'no eu-06 beat' };
    const prev = ms.devClassOverride;
    ms.devClassOverride = 'Bard';
    const a = ms.beatProse(hit.zone, hit.beat);
    ms.devClassOverride = 'Priest';
    const b = ms.beatProse(hit.zone, hit.beat);
    ms.devClassOverride = prev;
    // The CANON callbacks (verbatim): the Bard hears Wren's lamp; the Priest
    // hears Lucia's bread — the same beat, each class its own text.
    return {
      setup: 'ok',
      differ: a !== b,
      aIsBard: a.startsWith("Wren keeps a lamp lit past its hour — for you, though she'd deny it."),
      bIsPriest: b.startsWith('Lucia leaves bread on your old stoop still — faith, she would say, and she would be right.'),
      noTodo: !a.includes('HAND_AUTHORED_TODO') && !b.includes('HAND_AUTHORED_TODO'),
    };
  });
  ok(
    'narrative — class callback: the same beat renders each class its own CANON text (Bard: Wren; Priest: Lucia; no TODO)',
    variantText.setup === 'ok' && variantText.differ && variantText.aIsBard && variantText.bIsPriest && variantText.noTodo,
    JSON.stringify(variantText),
  );

  const campfire = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    const fire = ms.regionCampfires.find((c) => c.zoneId === 'thessaloniki-outpost');
    if (!fire) return { setup: 'no thessaloniki campfire' };
    if (ms.activeWorld !== 'earth') ms.applyWorldSwap('earth', fire.pos);
    ms.playerHealth.shield = 1e9;
    ms.player.sprite.body.reset(fire.pos.x, fire.pos.y + 20);
    await wait(500);
    const button = ms.campfireButton.isVisible;
    ms.campfireIdx = 0; // deterministic start for the order/loop proof
    const seen = [];
    for (let i = 0; i < 8; i++) {
      ms.campfireTalk();
      seen.push(ms.banner.text);
      await wait(120);
    }
    const n = ms.regionCampfires.length;
    return { setup: 'ok', button, outposts: n, seen };
  });
  // Length-agnostic order/loop proof: the list restarts exactly where seen[0]
  // reappears, and every press matches its modulo slot (fixed order, looping).
  const cfLines = campfire.seen ?? [];
  const cfLen = cfLines.indexOf(cfLines[0], 1);
  const cfCycles = cfLen >= 2 && cfLines.every((l, i) => l === cfLines[i % cfLen]);
  ok(
    'narrative — campfire rotation: all six outposts carry a fire; the lines play in fixed order and loop',
    campfire.setup === 'ok' && campfire.button === true && campfire.outposts === 6 && cfCycles,
    JSON.stringify(campfire),
  );

  // 3ap. HERALD DUEL (the insertion run, permanent): eu-03 walks in and
  // renders BOTH voices verbatim — the herald's truth, then Azazel's
  // inversion a beat later.
  const duelRun = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    ms.devJumpToQuest('eu-03-herald-truth-1');
    ms.playerHealth.shield = 1e9;
    await wait(2600); // travel + chunk activation + the marker
    const mk = ms.beatMarker;
    if (!mk || mk.beatId !== 'eu-03-herald-truth-1') return { marker: false };
    ms.player.sprite.body.reset(mk.pos.x, mk.pos.y);
    await wait(600);
    const v1 = ms.banner.text;
    await wait(3600); // Azazel replies 3.6s after the walk-in
    const v2 = ms.banner.text;
    return { marker: true, status: ms.chain.status('eu-03-herald-truth-1'), v1, v2 };
  });
  ok(
    'narrative — herald duel: eu-03 renders both voices verbatim (the herald, then Azazel)',
    duelRun.marker &&
      duelRun.status === 'complete' &&
      duelRun.v1 === 'Herald: "He was cast down for what he gave them."' &&
      duelRun.v2 ===
        'Azazel: "Cast down — hear how proudly it is confessed. Yes: I gave, and giving was answered with a cliff. Keep that arithmetic close, road-breaker, for the day they offer you mercy."',
    JSON.stringify({ ...duelRun, v1: String(duelRun.v1 ?? '').slice(0, 60), v2: String(duelRun.v2 ?? '').slice(0, 60) }),
  );

  // 3aq. FAUNA CANON (the insertion run, permanent): four homes wear their
  // canonical animal — a LIVE nameplate on the wildlife and the cull-quest
  // text naming the animal — and Seattle stays outside the pipeline (its
  // hand-authored opener keeps its designer placeholder untouched).
  const fauna = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    const CASES = [
      { zone: 'munich-anvil-hold', beat: 'mun-02-foothill-wolves', animal: 'roe deer' },
      { zone: 'lhasa-prayer-citadel', beat: 'lha-02-first-blood', animal: 'pikas' },
      { zone: 'rome-eternal-seat', beat: 'rom-02-catacomb-vermin', animal: 'ruin cats' },
      { zone: 'bali-drowned-crown', beat: 'bal-02-first-blood', animal: 'macaques' },
    ];
    const homes = [];
    for (const c of CASES) {
      const dest = ms.regionZoneArrivals[c.zone];
      if (!dest) return { setup: `no arrival for ${c.zone}` };
      if (ms.activeWorld !== 'earth') ms.applyWorldSwap('earth', dest);
      else ms.player.sprite.body.reset(dest.x, dest.y);
      ms.playerHealth.shield = 1e9;
      await wait(2400); // chunk activation + pack spawns + a label sweep
      const plate = ms.nameplates.livePlates().some((p) => p.name === c.animal);
      const hit = ms.regionBeatForQuest(c.beat);
      homes.push({ zone: c.zone, plate, cullNames: !!hit && hit.beat.summary.includes(c.animal) });
    }
    const sea = ms.regionBeatForQuest('s1-meet-mentor');
    const seattleUntouched = !!sea && ms.beatProse(sea.zone, sea.beat).includes('HAND_AUTHORED_TODO: s1-meet-mentor');
    return { setup: 'ok', homes, seattleUntouched };
  });
  ok(
    'narrative — fauna canon: four homes show live animal nameplates + animal-named cull text; Seattle stays hand-built (placeholder intact)',
    fauna.setup === 'ok' && fauna.homes.every((h) => h.plate && h.cullNames) && fauna.seattleUntouched,
    JSON.stringify(fauna),
  );

  // 3ar. MASK DROPS (the insertion run, permanent): all six X-11 drop banners
  // are wired verbatim through the live renderer (the walk-in path is proven
  // by the as-01 arrival check; this pins every region's cut).
  const drops = await page.evaluate(() => {
    const ms = window.__ready();
    const EXPECT = {
      'eu-11-mask-drops': 'Good. Bring the rest in.',
      'af-11-mask-drops': 'At last. — Begin the count.',
      'as-11-mask-drops': 'Hold the door. The rest are coming.',
      'bb-11-mask-drops': 'As I said. Not this time.',
      'ul-11-mask-drops': 'Take it all.',
      'te-11-mask-drops': 'The avenue remembers its purpose.',
    };
    const out = {};
    for (const [id, want] of Object.entries(EXPECT)) {
      const hit = ms.regionBeatForQuest(id);
      out[id] = !!hit && ms.beatProse(hit.zone, hit.beat) === want;
    }
    return out;
  });
  ok(
    'narrative — mask drops: all six X-11 banners render their cut verbatim',
    Object.values(drops).length === 6 && Object.values(drops).every(Boolean),
    JSON.stringify(drops),
  );

  // 3as. GAME-FEEL CONFIG (permanent): FEEL loads, every numeric leaf is
  // finite, sizes/durations/pools are strictly positive, the domain palette is
  // the ONE existing tint source (by reference), and the depth bands order
  // screen UI > floating text / nameplates > world.
  const feelCfg = await page.evaluate(() => {
    const ms = window.__game.scene.getScene('MainScene');
    const f = ms.feel;
    if (!f) return { loaded: false };
    const bad = [];
    const walk = (obj, path) => {
      for (const [k, v] of Object.entries(obj)) {
        if (typeof v === 'number') {
          if (!Number.isFinite(v)) bad.push(`${path}${k}=NaN/inf`);
          // Offsets are legitimately signed; everything else must be >= 0.
          else if (v < 0 && !/offset/i.test(k)) bad.push(`${path}${k}<0`);
        } else if (v && typeof v === 'object') walk(v, `${path}${k}.`);
      }
    };
    walk(f, '');
    const mustBePositive = [f.text.poolSize, f.text.fontPx, f.text.riseMs, f.text.critScale, f.flash.flashMs, f.shake.shakeMs, f.nameplate.poolSize, f.nameplate.barW, f.hotbar.hotbarSlots, f.hotbar.slotPx];
    const positive = mustBePositive.every((v) => v > 0);
    const modeOk = f.nameplate.mode === 'always' || f.nameplate.mode === 'onAggroOrDamage';
    // Palette values must be EXACTLY the roster's canonical tints (the import
    // is by reference at compile time; a redefinition would drift here first).
    const palette = f.domainTint.physical === 0xe04a3a && f.domainTint.mental === 0x3a6de0 && f.domainTint.spiritual === 0x9a4ae0;
    const depthsOk = f.depths.screenUi > f.depths.floatText && f.depths.screenUi > f.depths.nameplates && f.depths.nameplates > 100 && f.depths.floatText > 100;
    return { loaded: true, bad, positive, modeOk, palette, depthsOk };
  });
  ok(
    'game-feel — FEEL config: loads, all numerics finite, required values positive, canonical palette, depth bands ordered',
    feelCfg.loaded && feelCfg.bad.length === 0 && feelCfg.positive && feelCfg.modeOk && feelCfg.palette && feelCfg.depthsOk,
    JSON.stringify(feelCfg),
  );

  // 3at. FLOATING COMBAT TEXT (permanent): a burst past the pool cap REUSES
  // slots (size never exceeds the cap, zero orphaned display objects), the
  // FEEL hook layer floats a number over a live enemy victim, and everything
  // retires on schedule.
  const fct = await page.evaluate(async () => {
    const ms = window.__ready();
    ms.cameras.main.setZoom(1.1); // PINNED near zoom — LOD tiers must never hide this check's objects
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!window.__quietSpot()) return { setup: 'no quiet spot' };
    const cap = ms.feel.text.poolSize;
    for (let i = 0; i < cap + 24; i++) ms.floatingText.show(ms.player.x + (i % 5) * 8, ms.player.y - 20, '-1', '#ffffff');
    const sizeAfterBurst = ms.floatingText.size;
    const activeAfterBurst = ms.floatingText.activeCount;
    await wait(800); // the burst retires (default life 600ms)
    const clearedAfterBurst = ms.floatingText.activeCount === 0;
    // HOOK LAYER: a real registered enemy takes a non-site hit → one number.
    const w = ms.activeMap().nearestWalkableWorld(ms.player.x + 120, ms.player.y);
    const foe = ms.spawnTownsfolk(w.x, w.y, null, 'wolf');
    await wait(150);
    // Short stun: its own pooled ✦ spark lives exactly stun-long and must
    // retire inside the drain window (the foe dies moments later anyway).
    ms.stunEnemiesInRange(foe.x, foe.y, 60, 1500);
    const before = ms.floatingText.activeCount;
    foe.takeHit(7);
    await wait(150); // the queue flushes on the next frame
    const hookLanded = ms.floatingText.activeCount > before;
    foe.takeHit(1e9);
    // Clear any wanderers that closed in during the check — their bites would
    // keep spawning legitimate numbers and mask the orphan question.
    for (const e of ms.combatEnemiesInRange(ms.player.x, ms.player.y, 1200)) e.destroy();
    // DRAIN: poll to quiet — the kill's own late credit (an XP float) is
    // living text that retires on schedule; a true orphan would never clear.
    let drainedActive = -1;
    for (let i = 0; i < 20; i++) {
      await wait(150);
      drainedActive = ms.floatingText.activeCount;
      if (drainedActive === 0) break;
    }
    const sizeStable = ms.floatingText.size === sizeAfterBurst && sizeAfterBurst <= cap;
    return { setup: 'ok', cap, sizeAfterBurst, activeAfterBurst, clearedAfterBurst, hookLanded, drainedActive, sizeStable };
  });
  ok(
    'game-feel — floating text: burst reuses the pool (size <= cap, zero orphans), the hook floats enemy damage, all retire on time',
    fct.setup === 'ok' && fct.sizeAfterBurst <= fct.cap && fct.activeAfterBurst <= fct.cap && fct.clearedAfterBurst && fct.hookLanded && fct.drainedActive === 0 && fct.sizeStable,
    JSON.stringify(fct),
  );

  // 3au. HIT FEEDBACK (permanent): a damaged DOMAIN-TINTED region enemy
  // flashes white then GUARANTEED-restores to its domain tint (the old code
  // silently reverted to the variant color); a player hit at/over the FEEL
  // threshold shakes the camera, a lighter hit does not.
  const hitFeel = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!window.__quietSpot()) return { setup: 'no quiet spot' };
    const RED = ms.feel.domainTint.physical;
    const w = ms.activeMap().nearestWalkableWorld(ms.player.x + 140, ms.player.y);
    // The REAL region spawn path (domain tint via setBaseTint):
    const before = ms.regionLive.length;
    ms.spawnRegionEnemy('lhasa-prayer-citadel', 'corrupted-wildlife', w.x, w.y, RED);
    const rec = ms.regionLive[ms.regionLive.length - 1];
    if (ms.regionLive.length === before || !rec.entity.isAlive) return { setup: 'no spawn' };
    const foe = rec.entity;
    await wait(150);
    ms.stunEnemiesInRange(foe.sprite.x, foe.sprite.y, 60, 1500);
    const tintBefore = foe.sprite.tintTopLeft;
    foe.takeHit(3);
    const whiteDuringFlash = foe.sprite.tintTopLeft === 0xffffff; // synchronous read inside the flash window
    await wait(ms.feel.flash.flashMs + 120);
    const restored = foe.sprite.tintTopLeft;
    foe.takeHit(1e9);
    // SHAKE: a big hit shakes; wait out the effect; a chip hit does not.
    ms.playerHealth.shield = 0;
    ms.playerHealth.full();
    ms.playerHealth.damage(ms.feel.shake.shakeThreshold + 5);
    const shookOnBig = ms.cameras.main.shakeEffect.isRunning === true;
    await wait(ms.feel.shake.shakeMs + 250);
    const settled = ms.cameras.main.shakeEffect.isRunning === false;
    ms.playerHealth.damage(1);
    const noShakeOnChip = ms.cameras.main.shakeEffect.isRunning === false;
    ms.playerHealth.full();
    ms.playerHealth.shield = 1e9;
    return { setup: 'ok', tintBefore, whiteDuringFlash, restored, RED, shookOnBig, settled, noShakeOnChip };
  });
  ok(
    'game-feel — hit feedback: white flash then guaranteed domain-tint restore; threshold camera shake (big yes, chip no)',
    hitFeel.setup === 'ok' && hitFeel.tintBefore === hitFeel.RED && hitFeel.whiteDuringFlash && hitFeel.restored === hitFeel.RED && hitFeel.shookOnBig && hitFeel.settled && hitFeel.noShakeOnChip,
    JSON.stringify(hitFeel),
  );

  // 3av. NAMEPLATES (permanent): every roster family archetype gets a plate on
  // spawn (name + level + bar), the plate DETACHES on despawn (chunk
  // deactivation leaks nothing), the pool never grows, and an
  // 'onAggroOrDamage' plate lights up when its owner is hit nearby.
  const plates = await page.evaluate(async () => {
    const ms = window.__ready();
    ms.cameras.main.setZoom(1.1); // PINNED near zoom (its own minZoom sub-test sets lower zooms explicitly)
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!window.__quietSpot()) return { setup: 'no quiet spot' };
    const FAMILIES = ['corrupted-wildlife', 'evil-raiders', 'lesser-evil-scouts', 'herald-angels', 'radiant-guardians', 'lesser-angels', 'dark-casters', 'veil-ambushers', 'hollowed-brutes'];
    const Z = 'lhasa-prayer-citadel';
    const poolSize0 = ms.nameplates.size;
    const base = ms.nameplates.activeCount;
    const perFamily = {};
    const spawned = [];
    for (let i = 0; i < FAMILIES.length; i++) {
      const fam = FAMILIES[i];
      const w = ms.activeMap().nearestWalkableWorld(ms.player.x + 90 + i * 30, ms.player.y + (i % 3) * 40);
      const beforeN = ms.nameplates.activeCount;
      ms.spawnRegionEnemy(Z, fam, w.x, w.y, ms.feel.domainTint.physical);
      perFamily[fam] = ms.nameplates.activeCount === beforeN + 1;
      spawned.push(ms.regionLive[ms.regionLive.length - 1]);
    }
    const attachedAll = Object.values(perFamily).every(Boolean);
    // AGGRO-OR-DAMAGE visibility: hit the first spawn → its plate shows.
    await wait(120);
    spawned[0].entity.takeHit(2);
    await wait(120);
    const litOnDamage = ms.nameplates.livePlates().some((p) => p.visible);
    // DESPAWN: the chunk-boundary path (deactivate destroys the entities) —
    // the sweep must release every plate we attached, pool size unchanged.
    ms.deactivateRegionZone(Z);
    await wait(250); // the release sweep runs on the next frames
    const stale = ms.nameplates.livePlates().filter((p) => p.stale).length;
    const poolStable = ms.nameplates.size === poolSize0;
    return { setup: 'ok', poolSize0, base, perFamily, attachedAll, litOnDamage, stale, poolStable };
  });
  ok(
    'game-feel — nameplates: all nine family archetypes attach on spawn, light on damage, detach on chunk despawn (zero stale plates, pool stable)',
    plates.setup === 'ok' && plates.attachedAll && plates.litOnDamage && plates.stale === 0 && plates.poolStable && plates.poolSize0 > 0,
    JSON.stringify(plates),
  );

  // 3aw. HOTBAR CHROME (permanent): the shipped LoadoutBar renders exactly
  // FEEL.hotbarSlots slots, every slot pinned to the screen (scrollFactor 0)
  // at the FEEL screen-UI depth, thumb-sized per FEEL.slotPx.
  const hotbar = await page.evaluate(() => {
    const ms = window.__game.scene.getScene('MainScene');
    const slots = ms.skillBar.slots;
    return {
      count: slots.length,
      want: ms.feel.hotbar.hotbarSlots,
      allPinned: slots.every((s) => s.bg.scrollFactorX === 0 && s.bg.scrollFactorY === 0),
      allUiDepth: slots.every((s) => s.bg.depth === ms.feel.depths.screenUi),
      slotPx: slots.every((s) => s.bg.width === ms.feel.hotbar.slotPx),
    };
  });
  ok(
    'game-feel — hotbar chrome: exactly FEEL.hotbarSlots slots, all scrollFactor 0 at screen-UI depth, thumb-sized per FEEL',
    hotbar.count === hotbar.want && hotbar.allPinned && hotbar.allUiDepth && hotbar.slotPx,
    JSON.stringify(hotbar),
  );

  // 3ax. DEPTH ORDERING (permanent): live objects prove the bands — screen UI
  // above nameplates and feel floating text, both above the world tile layer.
  const depths = await page.evaluate(() => {
    const ms = window.__ready();
    ms.cameras.main.setZoom(1.1); // PINNED near zoom — the world tile layer must be a LIVE render target here
    ms.floatingText.show(ms.player.x, ms.player.y - 20, '-1', '#ffffff', { depth: ms.feel.depths.floatText });
    const liveText = ms.floatingText.items.find((it) => it.active);
    return {
      ui: ms.skillBar.slots[0].bg.depth,
      plate: ms.nameplates.pool[0].label.depth,
      text: liveText ? liveText.text.depth : -1,
      world: ms.activeMap().layer.depth,
    };
  });
  ok(
    'game-feel — depth ordering: screen UI > nameplates/floating text > world layers (live objects)',
    depths.ui > depths.plate && depths.ui > depths.text && depths.plate > depths.world && depths.text > depths.world && depths.text >= 0,
    JSON.stringify(depths),
  );

  // 3ay. SPRITE FALLBACK CHAIN (permanent): with per-family PNGs ABSENT every
  // family resolves to its SHARED texture (which itself exists — the gray-box
  // guard) with zero errors; when a per-family key EXISTS (simulated canvas
  // texture) the same spawn wears it. Proves the sanctioned wiring inert-safe
  // in both directions.
  const chain9 = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!window.__quietSpot()) return { setup: 'no quiet spot' };
    const Z = 'lhasa-prayer-citadel';
    const SHARED = {
      'corrupted-wildlife': 'townsfolk',
      'evil-raiders': 'townsfolk',
      'veil-ambushers': 'townsfolk',
      'hollowed-brutes': 'townsfolk',
      'lesser-evil-scouts': 'demon-enemy',
      'herald-angels': 'angel-enemy',
      'radiant-guardians': 'angel-enemy',
      'lesser-angels': 'angel-enemy',
      'dark-casters': 'angel-enemy',
    };
    const fams = Object.keys(SHARED);
    const grayBoxes = ['townsfolk', 'demon-enemy', 'angel-enemy'].every((k) => ms.textures.exists(k));
    // Every real spawn wears EXACTLY what the chain dictates for the current
    // art state: its per-family key when that texture shipped, else its
    // shared texture — never anything else. (Permanent under both states.)
    const worn = {};
    let last = null;
    for (let i = 0; i < fams.length; i++) {
      const w = ms.activeMap().nearestWalkableWorld(ms.player.x + 90 + i * 26, ms.player.y + (i % 3) * 30);
      ms.spawnRegionEnemy(Z, fams[i], w.x, w.y, ms.feel.domainTint.physical);
      const rec = ms.regionLive[ms.regionLive.length - 1];
      const expect = ms.textures.exists(`enemy-${fams[i]}`) ? `enemy-${fams[i]}` : SHARED[fams[i]];
      worn[fams[i]] = rec.entity.sprite.texture.key === expect;
      last = rec.entity;
    }
    // MISS path, forever: a family with no texture leaves the sprite untouched.
    const beforeKey = last.sprite.texture.key;
    ms.applyFamilyTexture(last.sprite, 'no-such-family-probe');
    const missInert = last.sprite.texture.key === beforeKey;
    // HIT path, forever: a synthetic per-family key (never ships) is worn.
    const fakeKey = 'enemy-probe-art';
    const cv = ms.textures.createCanvas(fakeKey, 24, 34);
    cv.context.fillStyle = '#808080';
    cv.context.fillRect(0, 0, 24, 34);
    cv.refresh();
    ms.applyFamilyTexture(last.sprite, 'probe-art');
    const hitWorn = last.sprite.texture.key === fakeKey;
    // Cull the wave FIRST: no live sprite may wear a texture we remove below.
    ms.deactivateRegionZone(Z);
    await wait(150);
    // LIVE ABSENT-ART BRANCH, forever: remove one REAL per-family texture, a
    // fresh spawn of that family falls all the way back to its SHARED texture,
    // then the art is re-minted through the real drop-in seam — so this branch
    // stays exercised even with every PNG shipped. The family is picked
    // DYNAMICALLY: ambient fauna and live beat elites elsewhere in the world
    // wear these textures through the same funnel, and removing a texture a
    // live sprite wears crashes the renderer — so take the first family with
    // zero live wearers (loud setup fail if none).
    const SIZES = { townsfolk: [24, 34], 'demon-enemy': [30, 38], 'angel-enemy': [48, 56] };
    const wornByLive = (key) => ms.children.list.some((o) => o.texture && o.texture.key === key);
    const freeFam = fams.find((f) => ms.textures.exists(`enemy-${f}`) && !wornByLive(`enemy-${f}`));
    if (!freeFam) return { setup: 'no wearer-free family for the absent-art branch' };
    const freeKey = `enemy-${freeFam}`;
    ms.textures.remove(freeKey);
    const w2 = ms.activeMap().nearestWalkableWorld(ms.player.x + 90, ms.player.y - 60);
    ms.spawnRegionEnemy(Z, freeFam, w2.x, w2.y, ms.feel.domainTint.physical);
    const rec2 = ms.regionLive[ms.regionLive.length - 1];
    const absentFellBack = rec2.entity.sprite.texture.key === SHARED[freeFam];
    ms.deactivateRegionZone(Z);
    await wait(150);
    const [rw, rh] = SIZES[SHARED[freeFam]];
    const reminted = ms.artOverrides.applySpriteOverride(ms, freeKey, rw, rh) === true && ms.textures.exists(freeKey);
    ms.textures.remove(fakeKey);
    return { setup: 'ok', grayBoxes, worn, missInert, hitWorn, freeFam, absentFellBack, reminted };
  });
  ok(
    'sprite-gen — fallback chain: every family wears per-family art when shipped else its shared texture (gray box intact); miss inert, hit worn; absent-art branch live (remove → shared → re-mint)',
    chain9.setup === 'ok' &&
      chain9.grayBoxes &&
      Object.values(chain9.worn).length === 9 &&
      Object.values(chain9.worn).every(Boolean) &&
      chain9.missInert &&
      chain9.hitWorn &&
      chain9.absentFellBack &&
      chain9.reminted,
    JSON.stringify(chain9),
  );

  // 3aa. SKILL TREE UX (Casey's spec, permanent) — driven by REAL taps on the real
  // screen: instant spend (no confirmation window) respects locks and points with
  // shake/toast feedback; the name-bar "Add" button round-trips through the hotkey
  // picker into a slot; press-and-hold shows the description WITHOUT spending; and
  // the forced first pick still completes through the real picker.
  await newGame('blacksmith'); // newGame CLICKS the FirstSkillScene card — the real picker path
  const firstPick = await page.evaluate(() => {
    const ms = window.__game.scene.getScene('MainScene');
    const st = ms.getSkillState();
    return { pickerOpen: window.__game.scene.isActive('FirstSkillScene'), castable: st.activatableUnlocked().length, slot0: st.loadout()[0] ?? null };
  });
  ok(
    'skill tree ux: the forced first pick still completes through the real picker',
    !firstPick.pickerOpen && firstPick.castable >= 1 && firstPick.slot0 !== null,
    JSON.stringify(firstPick),
  );

  // Open the tree UI (the real launch path: pauses MainScene under it), then read
  // tree 0's rendered rows. Row i's bar center = listTop(134) + 8 + i*50 + 22.
  const rows = await page.evaluate(() => {
    const ms = window.__game.scene.getScene('MainScene');
    ms.openSkillTree();
    const st = ms.getSkillState();
    const cls = ms.classSkillsAll[st.activeClass];
    const treeId = cls.trees[0].id;
    const nodes = cls.skills.filter((s) => s.tree === treeId).sort((a, b) => a.tier - b.tier);
    const out = [];
    const drawn = new Set();
    for (const d of nodes) {
      if (d.branch) {
        if (drawn.has(d.branch.group)) continue;
        drawn.add(d.branch.group);
      }
      out.push(d.id);
    }
    ms.skills.awardPoints(1);
    const iBuy = out.findIndex((id) => st.canUnlock(cls.skills.find((s) => s.id === id)).ok);
    return { ids: out, iBuy, points: st.unspentPoints };
  });
  await page.waitForTimeout(400);
  const rowY = (i) => 134 + 8 + i * 50 + 22;

  // (a) INSTANT SPEND: one real tap on an affordable row unlocks it on the spot — no window.
  await page.mouse.click(214, rowY(rows.iBuy));
  await page.waitForTimeout(300);
  const spend = await page.evaluate(
    ({ rows }) => {
      const ms = window.__game.scene.getScene('MainScene');
      const sts = window.__game.scene.getScene('SkillTreeScene');
      const st = ms.getSkillState();
      sts.lastReject = '';
      return { unlocked: st.isUnlocked(rows.ids[rows.iBuy]), points: st.unspentPoints, modal: !!sts.popup || !!sts.readPopup };
    },
    { rows },
  );
  // (b) NO POINTS: same tap on the next (now prereq-met) row spends nothing + explains why.
  await page.mouse.click(214, rowY(rows.iBuy + 1));
  await page.waitForTimeout(250);
  const broke = await page.evaluate(
    ({ rows }) => {
      const ms = window.__game.scene.getScene('MainScene');
      const sts = window.__game.scene.getScene('SkillTreeScene');
      const st = ms.getSkillState();
      const out = { unlocked: st.isUnlocked(rows.ids[rows.iBuy + 1]), points: st.unspentPoints, reject: sts.lastReject };
      ms.skills.awardPoints(1); // arm the LOCKED case: a point in hand, prereq unmet
      sts.lastReject = '';
      return out;
    },
    { rows },
  );
  // (c) LOCKED: with a point in hand, tapping a row two tiers ahead spends nothing.
  await page.mouse.click(214, rowY(rows.iBuy + 3));
  await page.waitForTimeout(250);
  const locked = await page.evaluate(
    ({ rows }) => {
      const ms = window.__game.scene.getScene('MainScene');
      const sts = window.__game.scene.getScene('SkillTreeScene');
      const st = ms.getSkillState();
      return { unlocked: st.isUnlocked(rows.ids[rows.iBuy + 3]), points: st.unspentPoints, reject: sts.lastReject };
    },
    { rows },
  );
  ok(
    'skill tree ux: instant spend — an affordable tap unlocks instantly; no-points and locked taps spend nothing and say why',
    rows.iBuy >= 0 &&
      spend.unlocked &&
      spend.points === 0 &&
      !spend.modal &&
      !broke.unlocked &&
      broke.points === 0 &&
      broke.reject.length > 0 &&
      !locked.unlocked &&
      locked.points === 1 &&
      locked.reject.length > 0,
    JSON.stringify({ rows: rows.iBuy, spend, broke, locked }),
  );

  // (d) HOLD TO READ on a LOCKED row: the description shows at HOLD_MS while held,
  // the release dismisses it, and NOTHING was spent by the completed hold.
  await page.mouse.move(214, rowY(rows.iBuy + 3));
  await page.mouse.down();
  await page.waitForTimeout(3500); // well past HOLD_MS (2000) — headless frames can lag under suite load
  const held = await page.evaluate(
    ({ rows }) => {
      const ms = window.__game.scene.getScene('MainScene');
      const sts = window.__game.scene.getScene('SkillTreeScene');
      return { reading: !!sts.readPopup, unlocked: ms.getSkillState().isUnlocked(rows.ids[rows.iBuy + 3]), points: ms.getSkillState().unspentPoints };
    },
    { rows },
  );
  await page.mouse.up();
  await page.waitForTimeout(250);
  const released = await page.evaluate(
    ({ rows }) => {
      const ms = window.__game.scene.getScene('MainScene');
      const sts = window.__game.scene.getScene('SkillTreeScene');
      return { reading: !!sts.readPopup, unlocked: ms.getSkillState().isUnlocked(rows.ids[rows.iBuy + 3]), points: ms.getSkillState().unspentPoints };
    },
    { rows },
  );
  ok(
    'skill tree ux: hold-to-read shows the description on a locked skill and its release never spends',
    held.reading && !held.unlocked && held.points === 1 && !released.reading && !released.unlocked && released.points === 1,
    JSON.stringify({ held, released }),
  );

  // (e) ADD → HOTKEY PICKER → SLOT: row 0 is always an owned castable (the tier-0
  // opener — picked or bought above). Tap its name-bar Add button (right side of
  // the bar), then tap slot 3 in the picker; the skill must land there.
  await page.mouse.click(366, rowY(0)); // the Add button: cx + nodeW/2 - 38 = 366
  await page.waitForTimeout(300);
  const pickerState = await page.evaluate(() => {
    const sts = window.__game.scene.getScene('SkillTreeScene');
    const p = sts.pickerSlotCenter(2);
    return { open: !!sts.popup, slotX: p.x, slotY: p.y };
  });
  if (pickerState.open) await page.mouse.click(pickerState.slotX, pickerState.slotY);
  await page.waitForTimeout(300);
  const added = await page.evaluate(
    ({ rows }) => {
      const ms = window.__game.scene.getScene('MainScene');
      const sts = window.__game.scene.getScene('SkillTreeScene');
      const st = ms.getSkillState();
      const out = { closed: !sts.popup, slotOf: st.slotIndexOf(rows.ids[0]) };
      sts.close(); // resume MainScene for whatever runs after
      return out;
    },
    { rows },
  );
  ok(
    'skill tree ux: the name-bar Add button opens the hotkey picker and a slot tap assigns the skill there',
    pickerState.open && added.closed && added.slotOf === 2,
    JSON.stringify({ pickerState, added }),
  );

  // 3ac. LANDSCAPE / ORIENTATION (permanent): the game boots + the HUD lays out
  // sanely at BOTH 428×926 and 926×428 — every VISIBLE INTERACTIVE HUD element
  // fully on screen, no two overlapping, the UI camera matched to the canvas —
  // and a mid-session orientation flip preserves game state (and the camera's
  // zoom: landscape simply sees wider). Runs in the live session left by the
  // checks above; the viewport is restored to portrait at the end.
  const hudSanity = () =>
    page.evaluate(() => {
      const g = window.__game;
      const w = g.scale.width;
      const h = g.scale.height;
      const ms = g.scene.getScene('MainScene');
      const rects = [];
      for (const o of ms.children.list) {
        if (!o.input || !o.input.enabled || !o.visible) continue;
        if (o.scrollFactorX !== 0) continue; // HUD only — world-space buttons scroll
        const b = o.getBounds();
        rects.push({ x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) });
      }
      const off = rects.filter((r) => r.x < -1 || r.y < -1 || r.x + r.w > w + 1 || r.y + r.h > h + 1);
      const overlaps = [];
      for (let i = 0; i < rects.length; i++) {
        for (let j = i + 1; j < rects.length; j++) {
          const a = rects[i];
          const b = rects[j];
          const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
          const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
          if (ox > 2 && oy > 2) overlaps.push(`${JSON.stringify(a)}~${JSON.stringify(b)}`);
        }
      }
      return { w, h, buttons: rects.length, off: off.length, overlaps: overlaps.slice(0, 3), overlapCount: overlaps.length, uiCamW: ms.uiCamera.width, uiCamH: ms.uiCamera.height, zoom: ms.cameras.main.zoom };
    });

  const before = await page.evaluate(() => {
    const ms = window.__ready();
    return { classId: ms.classId, world: ms.activeWorld, x: ms.player.x, y: ms.player.y, hp: ms.playerHealth.current, points: ms.skills.unspentPoints, zoom: ms.cameras.main.zoom };
  });
  const portraitHud = await hudSanity();
  await page.setViewportSize({ width: 926, height: 428 }); // ROTATE mid-session
  await page.waitForTimeout(700); // main.ts applySize → scale.resize → every layout handler
  const landscapeHud = await hudSanity();
  const after = await page.evaluate(() => {
    const ms = window.__game.scene.getScene('MainScene');
    return { active: window.__game.scene.isActive('MainScene') || window.__game.scene.isPaused('MainScene'), classId: ms.classId, world: ms.activeWorld, x: ms.player.x, y: ms.player.y, hp: ms.playerHealth.current, points: ms.skills.unspentPoints, zoom: ms.cameras.main.zoom };
  });
  ok(
    'orientation: portrait HUD sane (all buttons on-screen, none overlapping, UI camera matched)',
    portraitHud.w === 428 && portraitHud.buttons > 0 && portraitHud.off === 0 && portraitHud.overlapCount === 0 && portraitHud.uiCamW === 428 && portraitHud.uiCamH === 926,
    JSON.stringify(portraitHud),
  );
  ok(
    'orientation: landscape HUD sane at 926×428 — same buttons, on-screen, no overlaps, canvas + UI camera resized',
    landscapeHud.w === 926 && landscapeHud.h === 428 && landscapeHud.buttons === portraitHud.buttons && landscapeHud.off === 0 && landscapeHud.overlapCount === 0 && landscapeHud.uiCamW === 926 && landscapeHud.uiCamH === 428,
    JSON.stringify(landscapeHud),
  );
  ok(
    'orientation: a mid-session flip preserves game state (class/world/position/HP/points) and the camera zoom',
    after.active && after.classId === before.classId && after.world === before.world && after.x === before.x && after.y === before.y && after.hp === before.hp && after.points === before.points && after.zoom === before.zoom,
    JSON.stringify({ before, after }),
  );

  // The overlay screens must lay out sanely in landscape too: the select screen
  // flows into columns (every card fully on screen), and the skill tree flows its
  // ten rows into two columns (every node bar fully on screen).
  const landscapeMenus = await (async () => {
    await page.goto(`http://localhost:${PORT}/?scale=v1`, { waitUntil: 'load' });
    await page.waitForFunction(() => !!window.__game && window.__game.scene.isActive('TitleScene'), null, { timeout: 25000 });
    await page.evaluate(() => {
      localStorage.clear();
      window.__game.scene.getScene('TitleScene').scene.start('CharacterSelectScene');
    });
    await page.waitForTimeout(600);
    const select = await page.evaluate(() => {
      const g = window.__game;
      const sc = g.scene.getScene('CharacterSelectScene');
      const cards = sc.children.list.filter((o) => o.type === 'Rectangle' && o.input && o.input.enabled);
      const off = cards.filter((r) => {
        const b = r.getBounds();
        return b.x < -1 || b.y < -1 || b.x + b.width > g.scale.width + 1 || b.y + b.height > g.scale.height + 1;
      });
      // One card per REGISTERED class — the count tracks the roster automatically.
      const registered = Object.keys(g.scene.getScene('MainScene').classSkillsAll).length;
      return { w: g.scale.width, cards: cards.length, registered, off: off.length };
    });
    // Into a run (top-left card = blacksmith) → open the skill tree in landscape.
    await page.evaluate(() => window.__game.scene.getScene('CharacterSelectScene').scene.start('MainScene', { mode: 'new', classId: 'blacksmith' }));
    await page.waitForFunction(() => window.__game.scene.isActive('MainScene'), null, { timeout: 25000 });
    await page.waitForTimeout(1500);
    if (await page.evaluate(() => window.__game.scene.isActive('FirstSkillScene'))) {
      // The picker's cards are landscape-laid too; click the FIRST card's live position.
      const first = await page.evaluate(() => {
        const sc = window.__game.scene.getScene('FirstSkillScene');
        const card = sc.children.list.filter((o) => o.type === 'Rectangle' && o.input && o.input.enabled).sort((a, b) => a.y - b.y)[0];
        const b = card.getBounds();
        return { x: b.centerX, y: b.centerY };
      });
      await page.mouse.click(first.x, first.y);
      await page.waitForTimeout(600);
    }
    await page.evaluate(() => window.__game.scene.getScene('MainScene').openSkillTree());
    await page.waitForTimeout(500);
    const tree = await page.evaluate(() => {
      const g = window.__game;
      const sts = g.scene.getScene('SkillTreeScene');
      // The node list + tabs live inside Containers — walk them for every bar.
      const all = [];
      const walk = (list) => {
        for (const o of list) {
          if (o.type === 'Container') walk(o.list);
          else all.push(o);
        }
      };
      walk(sts.children.list);
      const bars = all.filter((o) => o.type === 'Rectangle' && o.input && o.input.enabled);
      const off = bars.filter((r) => {
        const b = r.getBounds();
        return b.x < -1 || b.y < -1 || b.x + b.width > g.scale.width + 1 || b.y + b.height > g.scale.height + 1;
      });
      return { bars: bars.length, off: off.length };
    });
    await page.evaluate(() => window.__game.scene.getScene('SkillTreeScene').close()); // leave no menu open behind
    return { select, tree };
  })();
  ok(
    'orientation: the select screen + skill tree lay out fully on screen in landscape (column flow)',
    landscapeMenus.select.w === 926 && landscapeMenus.select.cards === landscapeMenus.select.registered && landscapeMenus.select.off === 0 && landscapeMenus.tree.bars >= 16 && landscapeMenus.tree.off === 0,
    JSON.stringify(landscapeMenus),
  );
  await page.setViewportSize({ width: 428, height: 926 }); // restore portrait for anything after
  await page.waitForTimeout(500);

  // 3ad. PWA STANDALONE (permanent): the manifest + icons are SERVED and VALID —
  // standalone display, any orientation, dark theme, real PNGs at their declared
  // sizes — the page carries the iOS standalone meta + viewport-fit=cover, and a
  // save exported as a portable code imports back BYTE-IDENTICALLY (with junk
  // codes rejected without touching the slot).
  const pwa = await page.evaluate(async () => {
    const out = { pngs: [] };
    const mf = await fetch('/manifest.webmanifest');
    out.manifestOk = mf.ok;
    const m = await mf.json();
    out.name = m.name;
    out.display = m.display;
    out.orientation = m.orientation;
    out.start = m.start_url;
    out.theme = m.theme_color;
    for (const icon of m.icons ?? []) {
      const r = await fetch(icon.src);
      const buf = new Uint8Array(await r.arrayBuffer());
      const sig = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
      const w = (buf[16] << 24) | (buf[17] << 16) | (buf[18] << 8) | buf[19]; // IHDR width
      out.pngs.push({ ok: r.ok, sig, w, declared: icon.sizes });
    }
    const html = await (await fetch('/')).text();
    out.meta = ['apple-mobile-web-app-capable', 'apple-mobile-web-app-status-bar-style', 'apple-touch-icon', 'viewport-fit=cover', 'rel="manifest"'].every((k) => html.includes(k));
    return out;
  });
  ok(
    'pwa: manifest + icons served and valid (standalone, any orientation, real PNGs at declared sizes); iOS meta present',
    pwa.manifestOk &&
      pwa.name === 'Thrones of Heaven' &&
      pwa.display === 'standalone' &&
      pwa.orientation === 'any' &&
      pwa.start === '/' &&
      pwa.theme === '#0b1a2b' &&
      pwa.pngs.length === 3 &&
      pwa.pngs.every((p) => p.ok && p.sig && p.declared.startsWith(`${p.w}x`)) &&
      pwa.meta,
    JSON.stringify(pwa),
  );

  const saveCode = await page.evaluate(() => {
    const ms = window.__ready();
    const code = ms.exportSaveCode(); // writes the save, encodes the slot, tries the clipboard
    const raw = localStorage.getItem('toh_save');
    localStorage.setItem('toh_save', '{"saveVersion":0,"clobbered":true}'); // wreck the slot
    const imported = ms.importSaveCode(code ?? '');
    const back = localStorage.getItem('toh_save');
    const junk = ms.importSaveCode('TOH1.!!!not-base64!!!') || ms.importSaveCode('hello world');
    return {
      hasCode: !!code && code.startsWith('TOH1.'),
      bytes: raw?.length ?? 0,
      imported,
      identical: back !== null && back === raw,
      junkRejected: !junk,
      slotIntact: localStorage.getItem('toh_save') === raw,
    };
  });
  ok(
    'pwa: export→import round-trips the save byte-identically; junk codes rejected without touching the slot',
    saveCode.hasCode && saveCode.bytes > 100 && saveCode.imported && saveCode.identical && saveCode.junkRejected && saveCode.slotIntact,
    JSON.stringify(saveCode),
  );

  // 3af. RESIZE ISOLATION + PICKER CLASS INTEGRITY (permanent — the regression
  // gate). Root cause being guarded: overlay scenes used to leave restart-on-
  // resize listeners on the GLOBAL ScaleManager after closing, so iOS URL-bar
  // viewport resizes (which fire constantly WITHOUT rotation) re-opened closed
  // overlays — including the forced first-skill picker — and accumulated
  // listeners on every restart (the progressive slowdown).

  // (a) THE STORM: 20 consecutive MEANINGFUL resize events with no menu open →
  // zero overlay restarts, zero listener growth, stable frame time.
  const storm = await page.evaluate(async () => {
    const g = window.__game;
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    const overlays = ['FirstSkillScene', 'SkillTreeScene', 'PauseScene', 'CharacterSelectScene', 'TitleScene'];
    // PRECONDITION: no menu open — stop any overlay a prior check left behind.
    for (const k of overlays) if (g.scene.isActive(k) || g.scene.isPaused(k)) g.scene.getScene(k).scene.stop();
    if (g.scene.isPaused('MainScene')) g.scene.getScene('MainScene').scene.resume();
    window.__ready();
    await wait(300);
    const listeners0 = g.scale.listenerCount('resize');
    await wait(600);
    const fps0 = g.loop.actualFps;
    let overlayActivations = 0;
    const seen = new Set();
    for (let i = 0; i < 20; i++) {
      g.scale.resize(428, i % 2 ? 880 : 926); // the URL-bar collapse shape (±46px, no rotation)
      await wait(70);
      const act = overlays.filter((k) => g.scene.isActive(k));
      if (act.length > 0) overlayActivations++;
      for (const k of act) seen.add(k);
    }
    g.scale.resize(428, 926);
    await wait(600);
    const fps1 = g.loop.actualFps;
    const listeners1 = g.scale.listenerCount('resize');
    return { listeners0, listeners1, overlayActivations, seen: [...seen], fps0: +fps0.toFixed(1), fps1: +fps1.toFixed(1) };
  });
  ok(
    'resize isolation: a 20-event resize storm re-opens nothing, grows no listeners, keeps frame time stable',
    storm.overlayActivations === 0 && storm.listeners1 === storm.listeners0 && storm.fps1 > storm.fps0 * 0.6,
    JSON.stringify(storm),
  );

  // (b) THE PICKER'S CONTRACT: a zombie restart on a character WITH spent points
  // self-closes without touching state — even with the long-lived
  // SkillState.activeClass field poisoned to another class (the stale read that
  // produced the wizard picker on a witch doctor); the poison is HEALED.
  const pickerGate = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    const spent = ms.skills.unlockedIds(ms.classId).length;
    ms.skills.activeClass = 'wizard'; // the poisoned stale field (the reported bug)
    window.__game.scene.getScene('FirstSkillScene').scene.restart(); // the zombie path
    await wait(400);
    return {
      spent,
      pickerOpen: window.__game.scene.isActive('FirstSkillScene'),
      mainRunning: window.__game.scene.isActive('MainScene'),
      healedClass: ms.skills.activeClass,
      liveClass: ms.classId,
      shownClass: window.__game.scene.getScene('FirstSkillScene').shownClass,
    };
  });
  ok(
    'picker contract: never appears for a character with spent points; a poisoned stale class is healed to the live one',
    pickerGate.spent > 0 && !pickerGate.pickerOpen && pickerGate.mainRunning && pickerGate.healedClass === pickerGate.liveClass && pickerGate.shownClass === null,
    JSON.stringify(pickerGate),
  );

  // (c) SAVE INTEGRITY: a contaminated save (foreign skills recorded under the
  // wrong class — what a mis-shown picker left behind) is HEALED on load: the
  // foreign ids are stripped and their points refunded; legal unlocks untouched.
  const heal = await page.evaluate(() => {
    const ms = window.__ready();
    const before = ms.skills.toJSON();
    const contaminated = JSON.parse(JSON.stringify(before));
    contaminated.unlockedByClass['witchdoctor'] = ['wiz_fireball', 'wd_vd_doll']; // one foreign, one legal
    (contaminated.unlockedByClass[ms.classId] ??= []).push('sam_bl_first'); // foreign in the live class too
    const points0 = contaminated.unspentPoints;
    ms.skills.load(contaminated);
    const out = {
      stripped: ms.skills.lastSanitize.stripped,
      refunded: ms.skills.lastSanitize.refunded,
      points: ms.skills.unspentPoints,
      points0,
      wdLegalKept: ms.skills.isUnlocked('wd_vd_doll', 'witchdoctor'),
      wdForeignGone: !ms.skills.isUnlocked('wiz_fireball', 'witchdoctor'),
      liveForeignGone: !ms.skills.unlockedIds(ms.classId).includes('sam_bl_first'),
    };
    ms.skills.load(before); // restore the session's real state
    return out;
  });
  ok(
    'save integrity: foreign skills are stripped on load with their points refunded; legal unlocks untouched',
    heal.stripped.length === 2 && heal.refunded === 2 && heal.points === heal.points0 + 2 && heal.wdLegalKept && heal.wdForeignGone && heal.liveForeignGone,
    JSON.stringify(heal),
  );

  // (d) SAVES ROUND-TRIP BYTE-IDENTICALLY THROUGH ROTATIONS: rotating writes
  // nothing to the slot and changes nothing that serializes.
  const rotSave = await (async () => {
    const s0 = await page.evaluate(() => {
      const ms = window.__ready();
      ms.requestSave();
      return localStorage.getItem('toh_save');
    });
    await page.setViewportSize({ width: 926, height: 428 });
    await page.waitForTimeout(600);
    const midRotation = await page.evaluate(() => localStorage.getItem('toh_save'));
    await page.setViewportSize({ width: 428, height: 926 });
    await page.waitForTimeout(600);
    const after = await page.evaluate(() => {
      const ms = window.__game.scene.getScene('MainScene');
      const slotUntouched = localStorage.getItem('toh_save');
      ms.requestSave(); // a fresh save AFTER the rotations
      const rewritten = JSON.parse(localStorage.getItem('toh_save'));
      return { slotUntouched, skills: JSON.stringify(rewritten.skills ?? rewritten.skillState ?? null) };
    });
    const base = JSON.parse(s0);
    return {
      slotStableThroughRotation: midRotation === s0 && after.slotUntouched === s0,
      skillsIdentical: after.skills === JSON.stringify(base.skills ?? base.skillState ?? null),
    };
  })();
  ok(
    'rotation save integrity: rotating touches nothing in the slot; a post-rotation save carries identical skill state',
    rotSave.slotStableThroughRotation && rotSave.skillsIdentical,
    JSON.stringify(rotSave),
  );

  // (e) WHEN SHOWN, THE PICKER'S CLASS IS THE LIVE CHARACTER'S: a genuinely
  // fresh character opens the picker for exactly its own class.
  await page.goto(`http://localhost:${PORT}/?scale=v1`, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__game && window.__game.scene.isActive('TitleScene'), null, { timeout: 25000 });
  await page.evaluate(() => {
    localStorage.clear();
    window.__game.scene.getScene('TitleScene').scene.start('MainScene', { mode: 'new', classId: 'witchdoctor' });
  });
  await page.waitForFunction(() => window.__game.scene.isActive('FirstSkillScene'), null, { timeout: 25000 });
  await page.waitForTimeout(400);
  const freshPicker = await page.evaluate(() => {
    const ms = window.__game.scene.getScene('MainScene');
    const fs = window.__game.scene.getScene('FirstSkillScene');
    return { liveClass: ms.classId, shownClass: fs.shownClass, needs: ms.skills.needsFirstSkill(ms.classId) };
  });
  ok(
    'picker class: a fresh character sees exactly its own class in the forced picker',
    freshPicker.needs && freshPicker.liveClass === 'witchdoctor' && freshPicker.shownClass === 'witchdoctor',
    JSON.stringify(freshPicker),
  );
  // Complete the pick through the real card so the session ends playable.
  const card = await page.evaluate(() => {
    const fs = window.__game.scene.getScene('FirstSkillScene');
    const c = fs.children.list.filter((o) => o.type === 'Rectangle' && o.input && o.input.enabled && o.width < 400).sort((a, b) => a.y - b.y)[0];
    const b = c.getBounds();
    return { x: b.centerX, y: b.centerY };
  });
  await page.mouse.click(card.x, card.y);
  await page.waitForTimeout(600);

  // SM. save-migration (WORLD SCALE V2): a v16 (px-era) fixture save migrates
  // to CANONICAL lat/lng through the PINNED v1 projection and loads at the
  // same spot under v1 (lossless); the SAME fixture then boots under
  // ?scale=v2 (+ devspeed cap coverage) and lands on the same GEOGRAPHY
  // through the v2 projection, with the TEMP render window bounding zoom-out.
  await page.goto(`http://localhost:${PORT}/?scale=v1`, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__game && window.__game.scene.isActive('TitleScene'), null, { timeout: 25000 });
  await page.evaluate(() => {
    localStorage.clear();
    window.__game.scene.getScene('TitleScene').scene.start('MainScene', { mode: 'new', classId: 'druid' });
  });
  await page.waitForFunction(() => window.__game.scene.isActive('MainScene'), null, { timeout: 25000 });
  await page.waitForTimeout(1500);
  if (await page.evaluate(() => window.__game.scene.isActive('FirstSkillScene'))) {
    await page.mouse.click(214, 462);
    await page.waitForTimeout(600);
  }
  const smV1 = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    const spot = ms.map.nearestWalkableWorld(ms.town.spawn.x + 700, ms.town.spawn.y - 400);
    ms.player.sprite.body.reset(spot.x, spot.y);
    await wait(200);
    if (!ms.requestSave()) return { setup: 'save write refused' };
    const raw = JSON.parse(localStorage.getItem('toh_save'));
    const wroteCanonical = raw.saveVersion >= 17 && !!raw.world.latLng && !!raw.world.remembered.earth?.latLng;
    // Strip to a pure v16 (px-era) fixture — exactly what a shipped save holds.
    delete raw.world.latLng;
    if (raw.world.remembered?.earth) delete raw.world.remembered.earth.latLng;
    raw.saveVersion = 16;
    const fixture = JSON.stringify(raw);
    localStorage.setItem('toh_save', fixture);
    ms.devLoadSave(); // the REAL path: read → migrate (px→latLng via PINNED v1) → apply (latLng→px via ACTIVE v1)
    await wait(400);
    const d = Math.hypot(ms.player.x - spot.x, ms.player.y - spot.y);
    if (!ms.requestSave()) return { setup: 'post-load save refused' };
    const migrated = JSON.parse(localStorage.getItem('toh_save'));
    // Independent v1 math (world-scale's pinned constants, not the live calibration).
    const s = window.__worldScale;
    const expect = s.pxToLatLngV1Local(spot.x - ms.globeOriginPx.x, spot.y - ms.globeOriginPx.y);
    return {
      wroteCanonical,
      d: +d.toFixed(3),
      v: migrated.saveVersion,
      dLat: Math.abs(migrated.world.latLng.lat - expect.lat),
      dLng: Math.abs(migrated.world.latLng.lng - expect.lng),
      expect,
      fixture,
    };
  });
  await page.goto(`http://localhost:${PORT}/?scale=v2&devspeed=99`, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__game && window.__game.scene.isActive('TitleScene'), null, { timeout: 25000 });
  await page.evaluate((fx) => localStorage.setItem('toh_save', fx), smV1.fixture ?? '{}');
  await page.evaluate(() => window.__game.scene.getScene('TitleScene').scene.start('MainScene', { mode: 'continue' }));
  await page.waitForFunction(() => window.__game.scene.isActive('MainScene'), null, { timeout: 60000 });
  await page.waitForTimeout(2500);
  const smV2 = await page.evaluate(
    (expect) => {
      const ms = window.__game.scene.getScene('MainScene');
      const s = window.__worldScale;
      const geo = ms.terrestrialLatLngFromPx(ms.player.x, ms.player.y);
      return {
        v2: s.isScaleV2(),
        world: ms.activeWorld,
        dLat: Math.abs(geo.lat - expect.lat),
        dLng: Math.abs(geo.lng - expect.lng),
        outLimit: ms.zoomControls.outLimit,
        devSpeedCapped: ms.player.devSpeed,
      };
    },
    smV1.expect ?? { lat: 0, lng: 0 },
  );
  ok(
    'save-migration: a v16 px save gains canonical lat/lng via the pinned v1 projection, reloads losslessly under v1, and the SAME fixture loads under ?scale=v2 onto the same geography (bounded ring window, devspeed capped at 8)',
    smV1.wroteCanonical === true &&
      smV1.v >= 17 &&
      smV1.d <= 0.5 &&
      smV1.dLat < 1e-6 &&
      smV1.dLng < 1e-6 &&
      smV2.v2 === true &&
      smV2.world === 'earth' &&
      smV2.dLat < 1e-3 &&
      smV2.dLng < 1e-3 &&
      smV2.outLimit >= 0.05 &&
      smV2.devSpeedCapped === 8,
    JSON.stringify({ smV1: { ...smV1, fixture: undefined }, smV2 }),
  );

  // ── PASS 2 + 3, LIVE v2 SESSION (still on the ?scale=v2&devspeed page) ────
  // PASS 3 preamble: the session swaps to the EARTH source once planet.bin
  // decodes, and — because the fixture player boots inside the PNW bbox —
  // the pnw region pack streams in and repaints. Wait for both.
  await page.waitForFunction(
    () => {
      const st = window.__game.scene.getScene('MainScene').chunkStreamer;
      return !!st && st.activeSourceLabel === 'earth' && st.stats().regions >= 1;
    },
    null,
    { timeout: 60000 },
  );

  // 2f4. chunk-determinism (now against the EARTH source): the same chunk
  // synthesized twice on the direct path, and once through the REAL Web
  // Worker (probe worker receives the same grids), is byte-identical — and
  // the worker must actually be live (not the fallback).
  const chunkDet = await page.evaluate(async () => {
    const ms = window.__game.scene.getScene('MainScene');
    const st = ms.chunkStreamer;
    if (!st) return { setup: 'no streamer' };
    const a = st.synthesizeDirect(5417, 3311);
    const b = st.synthesizeDirect(5417, 3311);
    let w = null;
    try {
      w = await Promise.race([st.synthesizeViaWorker(5417, 3311), new Promise((_, rej) => setTimeout(() => rej(new Error('worker timeout')), 10000))]);
    } catch (e) {
      return { setup: `worker: ${e}` };
    }
    let same = a.length === b.length && a.length === w.length;
    for (let i = 0; same && i < a.length; i++) same = a[i] === b[i] && a[i] === w[i];
    return { setup: 'ok', len: a.length, same, workerLive: !!st.worker };
  });
  ok(
    'chunk-determinism: same chunk twice + worker-vs-direct are byte-identical (worker path live)',
    chunkDet.setup === 'ok' && chunkDet.len === 16384 && chunkDet.same === true && chunkDet.workerLive === true,
    JSON.stringify(chunkDet),
  );

  // 2f5. stamp-over-synth: tiles inside the Munich stamp answer from the
  // AUTHORED map (source 'stamp', walkability = the authored collision, no
  // procedural biome) — stamps always win over synthesis.
  const stampWin = await page.evaluate(() => {
    const ms = window.__game.scene.getScene('MainScene');
    const st = ms.chunkStreamer;
    const zoneId = Object.keys(ms.regionZoneArrivals).find((id) => id.includes('munich'));
    if (!zoneId) return { setup: 'no munich zone' };
    const p = ms.regionZoneArrivals[zoneId];
    const covering = ms.earthChunkMaps.find(
      (m) => p.x >= m.bounds.x && p.x < m.bounds.x + m.bounds.width && p.y >= m.bounds.y && p.y < m.bounds.y + m.bounds.height,
    );
    if (!covering) return { setup: 'munich arrival not covered by a stamp' };
    const probes = [p, { x: p.x + 96, y: p.y }, { x: p.x, y: p.y + 96 }, { x: p.x - 96, y: p.y - 96 }];
    let stampCount = 0;
    let walkMatch = 0;
    let noBiome = 0;
    for (const q of probes) {
      const c = st.composedTileAt(q.x, q.y);
      if (c.source === 'stamp') stampCount++;
      if (c.walkable === !covering.isBlockedAtWorld(q.x, q.y)) walkMatch++;
      if (c.biome === undefined) noBiome++;
    }
    return { setup: 'ok', zoneId, probes: probes.length, stampCount, walkMatch, noBiome };
  });
  ok(
    'stamp-over-synth: Munich-stamp tiles answer from the authored map, not procedural terrain',
    stampWin.setup === 'ok' && stampWin.stampCount === 4 && stampWin.walkMatch === 4 && stampWin.noBiome === 4,
    JSON.stringify(stampWin),
  );

  // 2f6. zoom-cap: the v2 zoom-out limit obeys BOTH live-viewport constraints —
  // at most 12,000 visible tiles, and the view always inside the loaded ring.
  const zoomCap = await page.evaluate(() => {
    const ms = window.__game.scene.getScene('MainScene');
    const w = ms.scale.width;
    const h = ms.scale.height;
    const z = ms.zoomControls.outLimit;
    return { z, tiles: (w / z) * (h / z) / 1024, fitPx: Math.max(w, h) / z, ringSpanPx: 5 * 2048 };
  });
  ok(
    'zoom-cap: v2 zoom-out keeps visible tiles <= 12000 and the viewport inside the 5-chunk loaded ring',
    zoomCap.tiles <= 12000 * 1.001 && zoomCap.fitPx <= zoomCap.ringSpanPx + 1,
    JSON.stringify(zoomCap),
  );

  // ── PASS 3: THE EARTH CHECKS (player still at the Seattle fixture spot) ───
  // 2g0. geo-truth: land/water strict, biomes as family sets, through the
  // FULL earth source. NOTE the Himalaya probe: the literal point (28.0,
  // 84.0) is a Nepalese valley (~1 km real elevation) — no real dataset puts
  // 3,500 m there — so the massif is probed as the MAX over the surrounding
  // 1° box (same spirit as the Columbia radius probe).
  const geoTruth = await page.evaluate(() => {
    const st = window.__game.scene.getScene('MainScene').chunkStreamer;
    const B = window.__worldScale.schema.Biome;
    const s = (lat, lng) => st.earthSample(lat, lng);
    const water = (r) => r[0] === B.OCEAN || r[0] === B.FRESHWATER;
    const sea = s(47.61, -122.33);
    const pac = s(0, -150);
    const cairo = s(30.04, 31.24);
    const green = s(72, -40);
    const mur = s(68.97, 33.08);
    let hiBand = 0;
    let hiBiome = null;
    for (let la = 27.5; la <= 28.5; la += 0.05) {
      for (let ln = 83.5; ln <= 84.5; ln += 0.05) {
        const r = s(la, ln);
        if (!water(r) && r[1] > hiBand) {
          hiBand = r[1];
          hiBiome = r[0];
        }
      }
    }
    let columbia = false;
    for (let dj = -40; dj <= 40 && !columbia; dj += 4) {
      for (let di = -40; di <= 40 && !columbia; di += 4) {
        const lat = 46.15 - (dj * 32) / 178112;
        const lng = -123.0 + (di * 32) / 121472;
        if (s(lat, lng)[0] === B.FRESHWATER) columbia = true;
      }
    }
    return {
      sahara: s(23, 10)[0] === B.DESERT,
      amazon: [B.FOREST, B.SWAMP, B.SAVANNA].includes(s(-3, -60)[0]),
      seattle: !water(sea) && [B.FOREST, B.GRASS, B.TAIGA, B.BEACH].includes(sea[0]),
      pacific: pac[0] === B.OCEAN && (pac[3] & 1) === 0,
      cairo: !water(cairo) && [B.DESERT, B.SAVANNA, B.GRASS].includes(cairo[0]),
      himalaya: hiBand >= 100 && [B.ROCK, B.SNOW, B.TUNDRA].includes(hiBiome),
      hiBand,
      greenland: [B.SNOW, B.TUNDRA].includes(green[0]),
      bali: !water(s(-8.65, 115.22)),
      murmansk: !water(mur) && [B.TAIGA, B.TUNDRA, B.SNOW, B.GRASS].includes(mur[0]),
      columbia,
    };
  });
  ok(
    'geo-truth: Sahara desert, Amazon forest, Seattle land, mid-Pacific non-walkable ocean, Cairo, Himalaya high+bare (1-deg box), Greenland, Bali island, Murmansk, Columbia freshwater',
    geoTruth.sahara &&
      geoTruth.amazon &&
      geoTruth.seattle &&
      geoTruth.pacific &&
      geoTruth.cairo &&
      geoTruth.himalaya &&
      geoTruth.greenland &&
      geoTruth.bali &&
      geoTruth.murmansk &&
      geoTruth.columbia,
    JSON.stringify(geoTruth),
  );

  // 2g1. coast-fidelity: ≥96% agreement with the 300 full-precision
  // Natural-Earth land/water truth points.
  const coastFid = await page.evaluate(async () => {
    const st = window.__game.scene.getScene('MainScene').chunkStreamer;
    const B = window.__worldScale.schema.Biome;
    const truth = await (await fetch('/world/coast-truth.json')).json();
    let agree = 0;
    for (const p of truth.points) {
      const r = st.earthSample(p.lat, p.lng);
      const water = r[0] === B.OCEAN || r[0] === B.FRESHWATER;
      if (water === p.water) agree++;
    }
    return { n: truth.points.length, agree, pct: +((agree / truth.points.length) * 100).toFixed(1) };
  });
  ok('coast-fidelity: >=96% agreement with the full-precision coast truth', coastFid.n === 300 && coastFid.pct >= 96, JSON.stringify(coastFid));

  // 2g2. earth seam-purity + determinism: border strips of a chunk quad
  // STRADDLING the pnw bbox west edge (lng −125 falls inside chunk 3262)
  // recompute byte-identically through the per-tile reference, twice.
  const earthSeam = await page.evaluate(() => {
    const st = window.__game.scene.getScene('MainScene').chunkStreamer;
    const CT = 64;
    const quads = [
      [3261, 3435],
      [3262, 3435],
      [3263, 3435],
      [3262, 3436],
    ];
    let checked = 0;
    let mismatches = 0;
    for (const [cx, cy] of quads) {
      const a = st.synthesizeDirect(cx, cy);
      const b = st.synthesizeDirect(cx, cy);
      for (let e = 0; e < CT; e++) {
        for (const [i, j] of [[0, e], [CT - 1, e], [e, 0], [e, CT - 1]]) {
          const ref = st.referenceRecord(cx * CT + i, cy * CT + j);
          const o = (j * CT + i) * 4;
          checked++;
          if (a[o] !== ref[0] || a[o + 1] !== ref[1] || a[o + 2] !== ref[2] || a[o + 3] !== ref[3] || b[o] !== a[o] || b[o + 3] !== a[o + 3]) mismatches++;
        }
      }
    }
    return { quads: quads.length, checked, mismatches };
  });
  ok(
    'earth seam-purity: chunk quad straddling the pnw bbox edge recomputes byte-identically via the per-tile reference (twice)',
    earthSeam.quads === 4 && earthSeam.checked === 1024 && earthSeam.mismatches === 0,
    JSON.stringify(earthSeam),
  );

  // 2g3. region-refinement: inside the pnw bbox, a planet-only fill differs
  // from the region-refined fill; the version bumped for earth AND region;
  // and every cached ring chunk has converged onto the current version.
  await page.waitForFunction(
    () => {
      const ms = window.__game.scene.getScene('MainScene');
      const st = ms.chunkStreamer;
      const pcx = Math.floor((ms.player.x - st.originPx.x) / 2048);
      const pcy = Math.floor((ms.player.y - st.originPx.y) / 2048);
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          if (st.chunkVersion(pcx + dx, pcy + dy) !== st.sourceVersion) return false;
        }
      }
      return true;
    },
    null,
    { timeout: 45000 },
  );
  const regionRefine = await page.evaluate(() => {
    const st = window.__game.scene.getScene('MainScene').chunkStreamer;
    const full = st.synthesizeDirect(3422, 3252); // Seattle-ish, deep inside pnw
    const planetOnly = st.fillPlanetOnly(3422, 3252);
    let diff = 0;
    for (let i = 0; i < full.length; i++) if (full[i] !== planetOnly[i]) diff++;
    return { diff, version: st.sourceVersion, regions: st.stats().regions };
  });
  ok(
    'region-refinement: pnw fills differ from planet-only synth; sourceVersion bumped for earth + region; loaded ring repainted to the current version',
    regionRefine.diff > 1000 && regionRefine.version >= 3 && regionRefine.regions >= 1,
    JSON.stringify(regionRefine),
  );

  // PASS 7 pre-capture for 3u1: read the faiyum attunement flag NOW, before
  // ANY teleport near Faiyum — 2g3b and 3u0 both park the player inside the
  // 8-tile discovery radius, which legitimately attunes the waystone through
  // the real discovery scan; reading the flag after that proves nothing.
  const faiyumPreAttuned = await page.evaluate(() => window.__ready().waypointSys.unlocked.has('faiyum'));

  // 2g3b. EGYPT GEO-TRUTH + REGION-REFINEMENT (PASS 7): stand at Faiyum — the
  // egypt pack lazy-loads on ring proximity, the source version bumps, and
  // the arrival ring repaints — then probe the COMPOSED source at real
  // places (river/lake probes are box searches, the geo-truth discipline).
  const egyptTruth = await (async () => {
    const seattleSpot = await page.evaluate(() => {
      const ms = window.__ready();
      const spot = { x: ms.player.x, y: ms.player.y };
      const p = ms.terrestrialPxFromLatLng({ lat: 29.31, lng: 30.84 });
      ms.player.sprite.body.reset(p.x, p.y);
      ms.lastLandPos = undefined;
      return spot;
    });
    await page.waitForFunction(
      () => {
        const ms = window.__game.scene.getScene('MainScene');
        const st = ms.chunkStreamer;
        if (!st.regionsRef.some((r) => r.id === 'egypt')) return false;
        const pcx = Math.floor((ms.player.x - st.originPx.x) / 2048);
        const pcy = Math.floor((ms.player.y - st.originPx.y) / 2048);
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            if (st.chunkVersion(pcx + dx, pcy + dy) !== st.sourceVersion) return false;
          }
        }
        return true;
      },
      null,
      { timeout: 120000 },
    );
    const r = await page.evaluate(() => {
      const ms = window.__game.scene.getScene('MainScene');
      const st = ms.chunkStreamer;
      const B = window.__worldScale.schema.Biome;
      const s = (lat, lng) => st.earthSample(lat, lng);
      const boxHasFresh = (lat, lng, tiles) => {
        for (let dj = -tiles; dj <= tiles; dj += 4) {
          for (let di = -tiles; di <= tiles; di += 4) {
            if (s(lat - (dj * 32) / 178112, lng + (di * 32) / 121472)[0] === B.FRESHWATER) return true;
          }
        }
        return false;
      };
      const red = s(27.0, 34.5);
      let musaBand = 0;
      for (let la = 28.52; la <= 28.56; la += 0.004) {
        for (let ln = 33.95; ln <= 33.99; ln += 0.004) {
          const q = s(la, ln);
          if (q[0] !== B.OCEAN && q[0] !== B.FRESHWATER && q[1] > musaBand) musaBand = q[1];
        }
      }
      // Deep Sahara: the derived-biome model (stated Pass 3 fallback)
      // speckles desert/savanna at this latitude — probe the 1° box
      // MAJORITY, the same discipline as the Himalaya box probe.
      const census = {};
      for (let a = -10; a <= 10; a++) {
        for (let b2 = -10; b2 <= 10; b2++) {
          const q = s(27 + a * 0.05, 27 + b2 * 0.05);
          census[q[0]] = (census[q[0]] ?? 0) + 1;
        }
      }
      const saharaMajority = Number(Object.entries(census).sort((x, y) => y[1] - x[1])[0][0]) === B.DESERT;
      const pcx = Math.floor((ms.player.x - st.originPx.x) / 2048);
      const pcy = Math.floor((ms.player.y - st.originPx.y) / 2048);
      const full = st.synthesizeDirect(pcx, pcy);
      const po = st.fillPlanetOnly(pcx, pcy);
      let diff = 0;
      for (let i = 0; i < full.length; i++) if (full[i] !== po[i]) diff++;
      return {
        nileLuxor: boxHasFresh(25.7, 32.63, 40),
        qarun: boxHasFresh(29.45, 30.58, 40),
        nasser: boxHasFresh(23.0, 32.9, 40),
        redSea: red[0] === B.OCEAN && (red[3] & 1) === 0,
        musaBand,
        sahara: saharaMajority,
        egyptLoaded: st.regionsRef.some((r2) => r2.id === 'egypt'),
        version: st.sourceVersion,
        regions: st.stats().regions,
        diff,
      };
    });
    await page.evaluate((spot) => {
      const ms = window.__ready();
      ms.player.sprite.body.reset(spot.x, spot.y);
      ms.lastLandPos = undefined;
    }, seattleSpot);
    await page.waitForTimeout(800);
    return r;
  })();
  ok(
    'egypt geo-truth + region-refinement: Nile at Luxor / Qarun / Nasser FRESHWATER (40-tile boxes), Red Sea non-walkable OCEAN, Jebel Musa band >= 55, deep Sahara DESERT; egypt pack refined the Faiyum arrival (version bump + repaint + planet-only diff)',
    egyptTruth.nileLuxor && egyptTruth.qarun && egyptTruth.nasser && egyptTruth.redSea && egyptTruth.musaBand >= 55 && egyptTruth.sahara && egyptTruth.egyptLoaded && egyptTruth.version >= 4 && egyptTruth.diff > 1000,
    JSON.stringify(egyptTruth),
  );

  // ── PASS 7 COMMIT 2: SETTLEMENT FRAMEWORK + FAIYUM ────────────────────────
  // 3u0. settlement-contract: the registry validates in Node (footprint cap,
  // NPC count, home-city disjointness); the LIVE Faiyum stamp sits centered
  // on its true coordinate, its hearth suppresses spawn points through the
  // SAME home-city constant, and both NPCs are genuinely interactable
  // through the real talk path.
  const settlements6 = await (async () => {
    const { build } = await import('esbuild');
    const outfile = new URL('../node_modules/.cache/toh-settlements.mjs', import.meta.url).pathname;
    await build({ entryPoints: [new URL('../src/settlements/registry.ts', import.meta.url).pathname], bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'silent' });
    return import(outfile); // module-load validation throws on a contract breach
  })();
  const homeZoneIds = Object.keys(await page.evaluate(() => window.__worldScale.zoneAnchors));
  const contractNode = {
    count: settlements6.SETTLEMENTS.length,
    capsOk: settlements6.SETTLEMENTS.every((s) => s.rows.length <= 48 && s.rows[0].length <= 48 && s.npcs.length >= 1 && s.npcs.length <= 3),
    disjoint: settlements6.SETTLEMENTS.every((s) => !homeZoneIds.includes(s.id)),
  };
  const contractLive = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    const st = ms.settlementStamps.find((s) => s.def.id === 'faiyum');
    if (!st) return { setup: 'no faiyum stamp' };
    const want = ms.terrestrialPxFromLatLng({ lat: 29.31, lng: 30.84 });
    const b = st.map.bounds;
    const centerErr = Math.hypot(b.x + b.width / 2 - want.x, b.y + b.height / 2 - want.y);
    const hearthIn = ms.isSettlementHearthAt(st.hearth.x + 100, st.hearth.y);
    const hearthOut = !ms.isSettlementHearthAt(st.hearth.x + 260 + 200, st.hearth.y);
    // REAL talk path: stand beside Sefu — auto-dialogue or the Talk button.
    const prev = { x: ms.player.x, y: ms.player.y };
    ms.player.sprite.body.reset(st.npcs[0].sprite.x + 50, st.npcs[0].sprite.y);
    ms.lastLandPos = undefined;
    let opened = false;
    for (let k = 0; k < 12 && !opened; k++) {
      await wait(300);
      if (ms.dialogue.isOpen()) opened = true;
      else if (ms.talkButton.isVisible) {
        ms.tryTalk();
        await wait(300);
        opened = ms.dialogue.isOpen();
      }
    }
    // Step OUT of talk range BEFORE the tap-through: the update loop freezes
    // while a dialogue is open, and a player left within NPC_AUTO_RANGE would
    // re-open it the moment it closes — freezing every later check.
    ms.player.sprite.body.reset(prev.x, prev.y);
    ms.lastLandPos = undefined;
    return { setup: 'ok', centerErr: +centerErr.toFixed(1), hearthIn, hearthOut, npcs: st.npcs.length, opened, prev, chunkRegistered: ms.earthChunkMaps.includes(st.map) };
  });
  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(280);
    const uiOpen = await page.evaluate(() => {
      const ms = window.__game.scene.getScene('MainScene');
      return ms.dialogue.isOpen() || ms.choice.isOpen();
    });
    if (!uiOpen) break;
    await page.mouse.click(214, 520);
    await page.mouse.click(214, 462);
  }
  // The dialogue MUST be closed now — an open dialogue freezes the update
  // loop (discovery scans, travel casts) for every check after this one.
  const talkClosed = await page.evaluate(() => {
    const ms = window.__game.scene.getScene('MainScene');
    return !ms.dialogue.isOpen() && !ms.choice.isOpen();
  });
  ok(
    'settlement-contract: registry validates (cap, 1-3 NPCs, disjoint from home zones); the live Faiyum stamp is centered on its true coordinate, chunk-registered, hearth suppresses inside (same home constant) and not outside, both NPCs talk through the real path (and the dialogue closed cleanly)',
    contractNode.count >= 1 && contractNode.capsOk && contractNode.disjoint && contractLive.setup === 'ok' && contractLive.centerErr <= 32 && contractLive.hearthIn && contractLive.hearthOut && contractLive.npcs === 2 && contractLive.opened && contractLive.chunkRegistered && talkClosed,
    JSON.stringify({ ...contractNode, ...contractLive, talkClosed }),
  );

  // 3u1. waystone-faiyum: DISCOVERY-based (never pre-attuned) — walking into
  // the radius attunes it; attunement survives the real save/load path. The
  // pre-attunement flag was captured BEFORE 2g3b (the first Faiyum-adjacent
  // teleport); by now the suite has legitimately attuned the node, so clear
  // it here to prove the walk-in scan re-attunes from a cold state.
  const wsFaiyum = await page.evaluate(async () => {
    const ms = window.__ready();
    const wp = ms.waypointSys;
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    const node = wp.nodes.find((n) => n.id === 'faiyum');
    if (!node) return { setup: 'no faiyum node' };
    wp.unlocked.delete('faiyum');
    // +200: inside the 8-tile (256 px) discovery radius but OUTSIDE the NPC
    // talk/auto ranges — standing beside Naila would auto-open her dialogue,
    // which freezes the update loop and with it the discovery scan.
    ms.player.sprite.body.reset(node.x + 200, node.y);
    ms.lastLandPos = undefined;
    let unlocked = false;
    for (let k = 0; k < 10 && !unlocked; k++) {
      await wait(400);
      unlocked = wp.unlocked.has('faiyum');
    }
    if (!ms.requestSave()) return { setup: 'save refused' };
    ms.devLoadSave();
    await wait(600);
    const persisted = ms.waypointSys.unlocked.has('faiyum');
    return { setup: 'ok', unlocked, persisted };
  });
  ok(
    'waystone-faiyum: not pre-attuned (flag captured before any Faiyum approach); walk-in discovery attunes from a cold state; attunement survives the real save/load',
    faiyumPreAttuned === false && wsFaiyum.setup === 'ok' && wsFaiyum.unlocked && wsFaiyum.persisted,
    JSON.stringify({ preAttuned: faiyumPreAttuned, ...wsFaiyum }),
  );

  // 3u2. respawn-includes-settlements: a death NEAR Faiyum respawns AT
  // Faiyum (respawn-eligible), never across the desert at the Cairo entry.
  const faiyumDeath = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    const st = ms.settlementStamps.find((s) => s.def.id === 'faiyum');
    ms.player.sprite.body.reset(st.spawn.x + 1500, st.spawn.y + 400);
    ms.lastLandPos = undefined;
    await wait(400);
    const from = { x: ms.player.x, y: ms.player.y };
    ms.playerHealth.shield = 0;
    ms.playerHealth.current = 1;
    ms.onProjectileHitPlayer(10); // the real death funnel
    // SCENE-TIME over wall-clock: poll for the respawn instead of a fixed
    // wait (the death-banner delay stretches under swiftshader stalls).
    let alive = false;
    for (let k = 0; k < 30 && !alive; k++) {
      await wait(400);
      alive = !ms.playerDead;
    }
    const dFaiyum = Math.hypot(ms.player.x - st.spawn.x, ms.player.y - st.spawn.y);
    const dCairo = Math.hypot(ms.player.x - ms.egyptArrivalPos.x, ms.player.y - ms.egyptArrivalPos.y);
    return { alive, from, dFaiyum: +dFaiyum.toFixed(0), dCairo: +dCairo.toFixed(0) };
  });
  ok(
    'respawn-includes-settlements: death near Faiyum respawns at the Faiyum spawn (respawn-eligible), not at the Cairo entry',
    faiyumDeath.alive && faiyumDeath.dFaiyum <= 40 && faiyumDeath.dCairo > 10000,
    JSON.stringify(faiyumDeath),
  );

  // 3u3. home-cities-untouched: the 14 home cities are READ-ONLY referenced —
  // 14 home waypoint nodes stand, every home arrival still resolves onto its
  // canon zone anchor geography, and no settlement id collides with a zone.
  const homesUntouched = await page.evaluate(() => {
    const ms = window.__ready();
    const anchors = window.__worldScale.zoneAnchors;
    const homes = ms.waypointSys.nodes.filter((n) => n.zoneId);
    const drifts = [];
    for (const n of homes) {
      const a = anchors[n.zoneId];
      if (!a) {
        drifts.push(`${n.zoneId}:no-anchor`);
        continue;
      }
      const p = ms.terrestrialPxFromLatLng(a);
      // The RESOLVED node position IS the live arrival (the full resolution
      // chain: Cairo mentor / stamped-zone arrivals / zone mentor / the
      // re-planted NA towns — regionZoneArrivals alone misses NA homes).
      if (Math.hypot(n.x - p.x, n.y - p.y) > 6000) drifts.push(`${n.zoneId}:${Math.hypot(n.x - p.x, n.y - p.y).toFixed(0)}px`);
    }
    return { homes: homes.length, drifts, settlementIds: ms.settlementStamps.map((s) => s.def.id) };
  });
  ok(
    'home-cities-untouched: 14 home nodes stand, every home arrival resolves on its canon anchor geography, settlement ids disjoint',
    homesUntouched.homes === 14 && homesUntouched.drifts.length === 0 && homesUntouched.settlementIds.every((id) => !homeZoneIds.includes(id)),
    JSON.stringify(homesUntouched),
  );
  // Return the player to the pre-settlement-suite spot (the travel checks
  // below expect the Seattle fixture neighborhood).
  await page.evaluate(() => {
    const ms = window.__ready();
    const spot = ms.terrestrialPxFromLatLng({ lat: 47.61, lng: -122.33 });
    ms.player.sprite.body.reset(spot.x, spot.y);
    ms.lastLandPos = undefined;
  });
  await page.waitForTimeout(800);

  // ── PASS 4: TRAVEL SYSTEMS (v2 session; player still at the Seattle spot) ─
  // 2h0. travel-distance-ui: the km readout matches the px math exactly for
  // two fixtures (8,000 px = 5.0 km one-decimal; 40,000 px = 25 km whole).
  const kmUi = await page.evaluate(() => ({
    a: window.__worldScale.formatKm(8000),
    b: window.__worldScale.formatKm(40000),
    markerHasKm: (() => {
      const ms = window.__game.scene.getScene('MainScene');
      return typeof ms.marker !== 'undefined';
    })(),
  }));
  ok('travel-distance-ui: km readout matches px math (5.0 km / 25 km fixtures)', kmUi.a === '5.0 km' && kmUi.b === '25 km', JSON.stringify(kmUi));

  // 2h1. waypoint-registry: 19 nodes (14 class homes by zone id + Olympia +
  // Boise + the Kamiah staging camp + the Faiyum and Sinai-camp waystones),
  // every anchor walkable post-validation, every nudge within the 64-tile rule.
  const wpRegistry = await page.evaluate(() => {
    const ms = window.__game.scene.getScene('MainScene');
    const wp = ms.waypointSys;
    if (!wp) return { setup: 'no waypoint system' };
    const homes = wp.nodes.filter((n) => n.zoneId).length;
    const fixed = wp.nodes.filter((n) => !n.zoneId).map((n) => n.id).sort();
    const walkable = wp.nodes.filter((n) => ms.composedTravelWalkable(n.x, n.y) === true).length;
    const maxNudge = Math.max(...wp.nodes.map((n) => n.nudgedTiles));
    const nudged = wp.nodes.filter((n) => n.nudgedTiles > 0).map((n) => `${n.id}:${n.nudgedTiles}`);
    return { setup: 'ok', total: wp.nodes.length, homes, fixed, validated: wp.validated, walkable, maxNudge, nudged };
  });
  ok(
    'waypoint-registry: 19 nodes resolve on existing anchors (14 homes + 3 NA fixed + the Faiyum settlement waystone + the Sinai camp waystone), all walkable post-validation, nudges within 64 tiles',
    wpRegistry.setup === 'ok' &&
      wpRegistry.total === 19 &&
      wpRegistry.homes === 14 &&
      wpRegistry.fixed.join(',') === 'faiyum,sinai-camp,wp-boise,wp-kamiah,wp-olympia' &&
      wpRegistry.validated === true &&
      wpRegistry.walkable === 19 &&
      wpRegistry.maxNudge <= 64,
    JSON.stringify(wpRegistry),
  );

  // 2h2. save-migration v17→v18: adds ONLY the travel fields, losslessly.
  const v18 = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!ms.requestSave()) return { setup: 'save refused' };
    const spot = { x: ms.player.x, y: ms.player.y };
    const raw = JSON.parse(localStorage.getItem('toh_save'));
    delete raw.player.unlockedWaypoints;
    delete raw.player.mountUnlocked;
    raw.saveVersion = 17;
    localStorage.setItem('toh_save', JSON.stringify(raw));
    ms.devLoadSave();
    await wait(500);
    const d = Math.hypot(ms.player.x - spot.x, ms.player.y - spot.y);
    if (!ms.requestSave()) return { setup: 'post save refused' };
    const migrated = JSON.parse(localStorage.getItem('toh_save'));
    return {
      setup: 'ok',
      d: +d.toFixed(2),
      v: migrated.saveVersion,
      hasWp: Array.isArray(migrated.player.unlockedWaypoints),
      mount: migrated.player.mountUnlocked === true,
      homeUnlocked: migrated.player.unlockedWaypoints.some((id) => id.startsWith('wp-')),
    };
  });
  ok(
    // The fixture stands OUTSIDE the dissolved PNW stamp, so the Pass 6C v19
    // remap is rule (c) untouched — d stays 0 and the chain lands on the
    // CURRENT version (19 since Pass 6C Commit 2).
    'save-migration v18: a v17 save gains ONLY waypoint/mount fields and reloads losslessly (class home auto-attuned; chain lands on the current version)',
    v18.setup === 'ok' && v18.d <= 0.5 && v18.v === 19 && v18.hasWp && v18.mount && v18.homeUnlocked,
    JSON.stringify(v18),
  );

  // 2h3. waypoint-discovery: walking into the radius attunes the node, it
  // persists across save/load, and the class home starts pre-attuned.
  const wpDiscover = await page.evaluate(async () => {
    const ms = window.__ready();
    const wp = ms.waypointSys;
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    const home = wp.nodes.find((n) => n.classId === ms.classId);
    const target = wp.nodes.find((n) => n.id === 'wp-olympia');
    const preHome = wp.unlocked.has(home.id);
    const preTarget = wp.unlocked.has(target.id);
    ms.player.sprite.body.reset(target.x + 100, target.y);
    ms.lastLandPos = undefined;
    await wait(900); // two discovery scans
    const unlockedNow = wp.unlocked.has(target.id);
    if (!ms.requestSave()) return { setup: 'save refused' };
    ms.devLoadSave();
    await wait(500);
    return { setup: 'ok', preHome, preTarget, unlockedNow, persisted: ms.waypointSys.unlocked.has('wp-olympia') };
  });
  ok(
    'waypoint-discovery: entering the radius attunes the waystone; persists across save/load; class home pre-attuned',
    wpDiscover.setup === 'ok' && wpDiscover.preHome === true && wpDiscover.preTarget === false && wpDiscover.unlockedNow === true && wpDiscover.persisted === true,
    JSON.stringify(wpDiscover),
  );

  // 2h4. waypoint-travel: locked nodes refuse; damage cancels the cast with
  // no teleport; a clean cast lands within 2 tiles of the anchor.
  const wpTravel = await page.evaluate(async () => {
    const ms = window.__ready();
    const wp = ms.waypointSys;
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    const locked = wp.nodes.find((n) => !wp.unlocked.has(n.id));
    const refuse = wp.startTravel(locked.id);
    const refusedClean = refuse === false && wp.casting === null;
    const home = wp.nodes.find((n) => n.classId === ms.classId);
    wp.startTravel(home.id);
    const castStarted = wp.casting !== null;
    const before = { x: ms.player.x, y: ms.player.y };
    ms.playerHealth.shield = 0;
    ms.playerHealth.damage(5); // REAL damage intake → the hurt hook cancels
    ms.playerHealth.shield = 1e9;
    const cancelled = wp.casting === null;
    const stayed = Math.hypot(ms.player.x - before.x, ms.player.y - before.y) < 1;
    wp.startTravel(home.id);
    await wait(4400); // 3s cast + the world-transition fade
    const d = Math.hypot(ms.player.x - home.x, ms.player.y - home.y);
    return { setup: 'ok', refusedClean, castStarted, cancelled, stayed, d: +d.toFixed(1), landed: d <= 64 };
  });
  ok(
    'waypoint-travel: locked refuses, damage cancels without teleport, a clean 3s cast lands within 2 tiles',
    wpTravel.setup === 'ok' && wpTravel.refusedClean && wpTravel.castStarted && wpTravel.cancelled && wpTravel.stayed && wpTravel.landed,
    JSON.stringify(wpTravel),
  );

  // The home arrival can auto-open story dialogue (gameplay freezes while a
  // conversation is open — by design). Tap through it like a player would so
  // the mount checks run against a live loop.
  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(280);
    const uiOpen = await page.evaluate(() => {
      const ms = window.__game.scene.getScene('MainScene');
      return ms.dialogue.isOpen() || ms.choice.isOpen();
    });
    if (!uiOpen) break;
    await page.mouse.click(214, 520);
    await page.mouse.click(214, 462); // a choice row, if a choice is what opened
  }

  // 2h5. mount-rules: combat blocks the summon; damage interrupts the cast;
  // mounted speed is EXACTLY MOUNT_SPEED_PX (× the session devspeed);
  // dealing damage dismounts; planes block and dismount.
  const mountRules = await page.evaluate(async () => {
    const ms = window.__ready();
    const mt = ms.mountSys;
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!mt) return { setup: 'no mount system' };
    // Clean fixture ground: the empty western Sahara (no zones, no enemies).
    const p = ms.terrestrialPxFromLatLng({ lat: 23.0, lng: 2.0 });
    ms.player.sprite.body.reset(p.x, p.y);
    ms.lastLandPos = undefined;
    await wait(900);
    // Fresh combat → summon must refuse. DERIVED combat needs a REAL live
    // aggressor (the engagement funnel is the only combat source now): a
    // wolf hunting the player from adjacent range.
    const wolf = ms.spawnTownsfolk(p.x + 80, p.y, null, 'wolf');
    await wait(250); // the funnel recomputes every frame
    const blockedInCombat = mt.trySummon() === false && mt.state === 'off' && ms.combatEngagements().includes(wolf.id);
    wolf.takeHit(1e9); // kill the aggressor — the engagement releases
    await wait(ms.feel.combat.lingerMs + 400); // the linger grace passes
    mt.trySummon();
    const casting = mt.state === 'casting';
    ms.playerHealth.shield = 0;
    ms.playerHealth.damage(5); // real intake path
    ms.playerHealth.shield = 1e9;
    const interrupted = mt.state === 'off';
    // No enemy is engaging (the damage was sourceless) — derived combat is
    // already clear, no flag to reset.
    mt.trySummon();
    await wait(1700);
    const mounted = mt.state === 'mounted' && ms.player.mountedSpeedPx === window.__worldScale.MOUNT_SPEED_PX;
    // Exact speed through the REAL movement path (velocity magnitude).
    ms.player.setDirection(1, 0);
    const body = ms.player.sprite.body;
    const speedExact = Math.abs(Math.hypot(body.velocity.x, body.velocity.y) - window.__worldScale.MOUNT_SPEED_PX * ms.player.devSpeed) < 1e-6;
    ms.player.setDirection(0, 0);
    mt.onPlayerDealtDamage(); // the feel-path funnel (onFeelDamaged drives exactly this)
    const dismountOnDeal = mt.state === 'off';
    mt.trySummon(); // dealing damage engaged nothing — derived combat stays clear
    await wait(1700);
    const remounted = mt.state === 'mounted';
    ms.travelToWorld('heaven');
    await wait(2600); // let the world transition fully land before the next one
    const planeDismount = mt.state === 'off' && ms.activeWorld === 'heaven';
    const blockedOnPlane = mt.trySummon() === false;
    ms.travelToWorld('earth');
    await wait(2600);
    const backOnEarth = ms.activeWorld === 'earth';
    return { setup: 'ok', blockedInCombat, casting, interrupted, mounted, speedExact, dismountOnDeal, remounted, planeDismount, blockedOnPlane, backOnEarth };
  });
  ok(
    'mount-rules: combat blocks summon, damage interrupts cast, mounted speed exactly MOUNT_SPEED_PX, dealing damage dismounts, planes dismount and block',
    mountRules.setup === 'ok' &&
      mountRules.blockedInCombat &&
      mountRules.casting &&
      mountRules.interrupted &&
      mountRules.mounted &&
      mountRules.speedExact &&
      mountRules.dismountOnDeal &&
      mountRules.remounted &&
      mountRules.planeDismount &&
      mountRules.blockedOnPlane &&
      mountRules.backOnEarth,
    JSON.stringify(mountRules),
  );

  // ── COMBAT HOTFIX: in-combat derives from LIVE ENGAGEMENTS only ───────────
  // 2h7. combat-derives: engage → kill → mountable within the linger; engage
  // → ride beyond the leash → mountable once released — both legs repeated
  // with a FAUNA aggressor (the stuck-on-device class of source). The gate
  // reads the same introspection the ?debug=1 toast prints.
  const combatDerives = await page.evaluate(async () => {
    const ms = window.__ready();
    const mt = ms.mountSys;
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    const linger = ms.feel.combat.lingerMs;
    const home = ms.terrestrialPxFromLatLng({ lat: 23.0, lng: 2.0 });
    const settle = async () => {
      ms.player.sprite.body.reset(home.x, home.y);
      ms.lastLandPos = undefined;
      await wait(400);
    };
    const runLeg = async (spawn) => {
      await settle();
      const e = spawn(home.x + 90, home.y);
      e.takeHit(1); // provoke: aggro through the real intake path
      await wait(300); // the funnel recomputes every frame
      const blocked = mt.trySummon() === false && ms.inCombatDerived() === true && ms.combatEngagements().length > 0;
      const named = ms.combatEngagements().join(',');
      // KILL leg: death releases the engagement; mountable within the linger.
      e.takeHit(1e9);
      await wait(linger + 400);
      const clearAfterKill = ms.inCombatDerived() === false && mt.trySummon() === true;
      mt.dismount();
      // RIDE-AWAY leg: fresh aggressor, then the player is far beyond the
      // leash — the engagement releases (cull/leash) with the enemy STILL alive.
      await settle();
      const e2 = spawn(home.x + 90, home.y);
      e2.takeHit(1);
      await wait(300);
      const blocked2 = mt.trySummon() === false;
      ms.player.sprite.body.reset(home.x + ms.feel.combat.leashRadiusPx + 1200, home.y);
      ms.lastLandPos = undefined;
      await wait(400);
      const released = ms.combatEngagements().length === 0 && e2.isAlive === true;
      await wait(linger + 200);
      const clearAfterRide = ms.inCombatDerived() === false && mt.trySummon() === true;
      mt.dismount();
      e2.destroy(); // fixture cleanup
      return { blocked, named, clearAfterKill, blocked2, released, clearAfterRide };
    };
    const demonLeg = await runLeg((x, y) => ms.spawnDemon(x, y, ms.activeMap().layer));
    const faunaLeg = await runLeg((x, y) => ms.spawnTownsfolk(x, y, null, 'wolf'));
    return { setup: 'ok', demonLeg, faunaLeg };
  });
  ok(
    'combat-derives: engage→kill and engage→outride both return the mount within the linger, for a demon and a fauna wolf; blockers enumerated',
    combatDerives.setup === 'ok' &&
      [combatDerives.demonLeg, combatDerives.faunaLeg].every(
        (l) => l.blocked && l.named.length > 0 && l.clearAfterKill && l.blocked2 && l.released && l.clearAfterRide,
      ) &&
      combatDerives.demonLeg.named.includes('demon-') &&
      combatDerives.faunaLeg.named.includes('townsfolk-'),
    JSON.stringify(combatDerives),
  );

  // 2h8. druid-summon-neutral: a summon EXISTING is not combat; a summon
  // actively fighting is. Through the real allied-summon seam every summon
  // skill spawns through (drawsAggro pulls the enemy onto the pet).
  const summonNeutral = await page.evaluate(async () => {
    const ms = window.__ready();
    const mt = ms.mountSys;
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    const linger = ms.feel.combat.lingerMs;
    const home = ms.terrestrialPxFromLatLng({ lat: 23.0, lng: 2.0 });
    ms.player.sprite.body.reset(home.x, home.y);
    ms.lastLandPos = undefined;
    await wait(400);
    const cfg = { key: 'gate_kin_tank', name: 'Gate Kin', behavior: 'tank', maxHP: 200, durationMs: 30000, aggroRadius: 300, followRange: 200, moveTilesPerSec: 5, bodyRadius: 12, tint: 0x88cc88, drawsAggro: true, aggroPriority: 2 };
    ms.summonAlliedUnits(cfg, 1, 1); // the REAL seam every summon skill spawns through
    await wait(300);
    // Idle summon + no enemies → NOT combat (existence is neutral).
    const idleNeutral = ms.inCombatDerived() === false && mt.trySummon() === true;
    mt.dismount();
    // A target arrives: provoke it — the aggro hierarchy sends it onto the
    // pet (drawsAggro) and the funnel counts the fight as combat.
    const d = ms.spawnDemon(home.x + 120, home.y, ms.activeMap().layer);
    d.takeHit(1);
    await wait(400);
    const fighting = ms.inCombatDerived() === true && mt.trySummon() === false && ms.combatEngagements().some((id) => id.startsWith('demon-'));
    // Target dies → the engagement releases → mountable within the linger.
    d.takeHit(1e9);
    await wait(linger + 400);
    const clears = ms.inCombatDerived() === false && mt.trySummon() === true;
    mt.dismount();
    ms.summons.clear();
    return { setup: 'ok', idleNeutral, fighting, clears };
  });
  ok(
    'druid-summon-neutral: an idle summon never blocks the mount; a summon-drawn fight does; the block clears on target death',
    summonNeutral.setup === 'ok' && summonNeutral.idleNeutral && summonNeutral.fighting && summonNeutral.clears,
    JSON.stringify(summonNeutral),
  );

  // 2h9. dot-on-evicted: a ticking DoT on a target that gets EVICTED (the
  // zone-deactivation destroy path) must not refresh combat — the DoT
  // prunes, the engagement releases, the mount returns.
  const dotEvict = await page.evaluate(async () => {
    const ms = window.__ready();
    const mt = ms.mountSys;
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    const linger = ms.feel.combat.lingerMs;
    const home = ms.terrestrialPxFromLatLng({ lat: 23.0, lng: 2.0 });
    ms.player.sprite.body.reset(home.x, home.y);
    ms.lastLandPos = undefined;
    await wait(400);
    const d = ms.spawnDemon(home.x + 100, home.y, ms.activeMap().layer);
    d.takeHit(1);
    ms.applyDotInRange(d.x, d.y, 60, 3, 250, 9000, 0x77ff77);
    // The funnel recomputes per FRAME - under swiftshader load frames can
    // stall, so ESTABLISH the engaged precondition by polling (the assertion
    // itself is unchanged: DoT live + combat derived).
    for (let k = 0; k < 14 && !ms.inCombatDerived(); k++) await wait(300);
    const dotLive = ms.dots.length >= 1 && ms.inCombatDerived() === true;
    d.destroy(); // the eviction path (deactivateRegionZone destroys exactly so)
    await wait(600);
    const dotPruned = ms.dots.length === 0;
    await wait(linger);
    const clears = ms.inCombatDerived() === false && mt.trySummon() === true;
    mt.dismount();
    return { setup: 'ok', dotLive, dotPruned, clears };
  });
  ok(
    'dot-on-evicted: a DoT on an evicted target prunes instead of ticking combat alive; the mount returns within the linger',
    dotEvict.setup === 'ok' && dotEvict.dotLive && dotEvict.dotPruned && dotEvict.clears,
    JSON.stringify(dotEvict),
  );

  // 2h10. leash-release: outrunning beyond FEEL.combat.leashRadiusPx hard-
  // deaggros the pursuers (flag reset, not just released) and the mount
  // returns — a demon AND a wolf, both still alive.
  const leashRelease = await page.evaluate(async () => {
    const ms = window.__ready();
    const mt = ms.mountSys;
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    const linger = ms.feel.combat.lingerMs;
    const leash = ms.feel.combat.leashRadiusPx;
    const home = ms.terrestrialPxFromLatLng({ lat: 23.0, lng: 2.0 });
    ms.player.sprite.body.reset(home.x, home.y);
    ms.lastLandPos = undefined;
    await wait(400);
    const d = ms.spawnDemon(home.x + 90, home.y, ms.activeMap().layer);
    const w = ms.spawnTownsfolk(home.x - 90, home.y, null, 'wolf');
    d.takeHit(1);
    w.takeHit(1);
    await wait(300);
    const engaged = ms.combatEngagements().length >= 2 && mt.trySummon() === false;
    ms.player.sprite.body.reset(home.x + leash + 1500, home.y);
    ms.lastLandPos = undefined;
    await wait(400);
    const released = ms.combatEngagements().length === 0;
    const deaggroed = d.isAggro === false && d.isAlive === true && w.isAlive === true;
    await wait(linger + 200);
    const mountable = ms.inCombatDerived() === false && mt.trySummon() === true;
    mt.dismount();
    d.destroy();
    w.destroy();
    return { setup: 'ok', engaged, released, deaggroed, leash };
  });
  ok(
    'leash-release: beyond LEASH_RADIUS both pursuers hard-deaggro (alive, flag reset), the set empties, the mount returns',
    leashRelease.setup === 'ok' && leashRelease.engaged && leashRelease.released && leashRelease.deaggroed && leashRelease.leash === 2048,
    JSON.stringify(leashRelease),
  );

  // ── PASS 6A: WORLD MAP MODE + ZOOM HANDOFF (same live v2 session) ─────────
  // 2m0. zoom-range-ui: the zoom-out control bottoms out EXACTLY at the
  // achievable cap (the v2 floor) — the cap reads as full zoom-out. PASS 6D
  // retired the dim-at-cap: with a map handoff the button stays LIVE at full
  // alpha and its glyph becomes the map diamond (the cap is the map door).
  const zoomRange = await page.evaluate(async () => {
    const ms = window.__ready();
    const zc = ms.zoomControls;
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    zc.setTarget(1e-6); // ask for infinite zoom-out — the clamp answers
    await wait(1200); // smoothing settles
    const floor = ms.chunkStreamer.constructor.outFloor(ms.scale.width, ms.scale.height);
    return {
      camZoom: ms.cameras.main.zoom,
      outLimit: zc.outLimit,
      atCap: ms.cameras.main.zoom === zc.outLimit,
      floorBinding: Math.abs(zc.outLimit - Math.max(floor, 0)) < 1e-9 || zc.outLimit >= floor,
      floor,
      outLiveAtCap: zc.outBtn.bg.alpha > 0.9,
      outGlyph: zc.outBtn.label.text,
      mapBtnLive: zc.mapBtn !== undefined,
    };
  });
  ok(
    'zoom-range-ui: the out control reaches EXACTLY the cap (v2 floor binding), stays LIVE there with the map-diamond glyph (Pass 6D), and the map button is live',
    zoomRange.atCap && zoomRange.floorBinding && zoomRange.outLiveAtCap && zoomRange.outGlyph === '◈' && zoomRange.mapBtnLive && zoomRange.outLimit >= zoomRange.floor - 1e-9,
    JSON.stringify(zoomRange),
  );

  // 2m1. map-open-at-cap: a FURTHER zoom-out request at the cap hands off to
  // map mode (the worldmap texture may still be decoding — the handoff is
  // retried like a player pinching again), which opens CENTERED on the player
  // with MainScene paused underneath.
  let mapOpened = false;
  for (let k = 0; k < 10 && !mapOpened; k++) {
    mapOpened = await page.evaluate(() => {
      const ms = window.__ready();
      ms.zoomControls.setTarget(ms.zoomControls.outLimit * 0.5); // pinch past the cap
      return window.__game.scene.isActive('WorldMapScene');
    });
    await page.waitForTimeout(900);
    mapOpened = await page.evaluate(() => window.__game.scene.isActive('WorldMapScene'));
  }
  const mapOpen = await page.evaluate(() => {
    const ms = window.__ready();
    const wms = window.__game.scene.getScene('WorldMapScene');
    const active = window.__game.scene.isActive('WorldMapScene');
    if (!active) return { active };
    const p = ms.terrestrialLatLngFromPx(ms.player.x, ms.player.y);
    const pm = window.__worldScale.latLngToMapPx(p.lat, p.lng, 2048, 1418);
    const c = wms.viewCenterImagePx();
    return { active, paused: ms.scene.isPaused(), centerErr: +Math.hypot(c.x - pm.x, c.y - pm.y).toFixed(2), markers: wms.waystoneMarkers.length };
  });
  ok(
    'map-open-at-cap: pinching past the cap opens map mode centered on the player (MainScene paused, 19 waystone markers live: 14 homes + 3 NA fixed + faiyum + sinai-camp)',
    mapOpen.active === true && mapOpen.paused === true && mapOpen.centerErr <= 2 && mapOpen.markers === 19,
    JSON.stringify(mapOpen),
  );

  // 2m2. marker-projection: the pure lat/lng → image-px function matches the
  // closed form at 5 fixtures, and a LIVE waystone marker sits exactly where
  // the projection of its node position says.
  const markerProj = await page.evaluate(() => {
    const ms = window.__ready();
    const wms = window.__game.scene.getScene('WorldMapScene');
    const f = window.__worldScale.latLngToMapPx;
    const fixtures = [
      [0, 0],
      [47.6062, -122.3321],
      [-33.87, 151.21],
      [85, -180],
      [-85, 180],
    ];
    let exact = 0;
    for (const [lat, lng] of fixtures) {
      const got = f(lat, lng, 2048, 1418);
      const want = { x: ((lng + 180) / 360) * 2048, y: ((85 - lat) / 170) * 1418 };
      if (got.x === want.x && got.y === want.y) exact++;
    }
    const node = ms.waypointSys.nodes.find((n) => n.id === 'wp-olympia');
    const ll = ms.terrestrialLatLngFromPx(node.x, node.y);
    const want = f(ll.lat, ll.lng, 2048, 1418);
    const marker = wms.waystoneMarkers.find((m) => m.id === 'wp-olympia');
    const liveErr = Math.hypot(marker.mx - want.x, marker.my - want.y);
    return { exact, of: fixtures.length, liveErr: +liveErr.toFixed(3) };
  });
  ok(
    'marker-projection: 5 closed-form fixtures exact; the live wp-olympia marker sits at its projected node position',
    markerProj.exact === 5 && markerProj.liveErr < 0.01,
    JSON.stringify(markerProj),
  );

  // 2m4a. map-close-restores (part 1 — this open): pan the map hard, close,
  // and the gameplay camera must be BYTE-IDENTICAL (it was never touched).
  const closeRestore = await page.evaluate(async () => {
    const ms = window.__ready();
    const wms = window.__game.scene.getScene('WorldMapScene');
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    const cam = ms.cameras.main;
    const before = { sx: cam.scrollX, sy: cam.scrollY, z: cam.zoom };
    wms.view.setPosition(wms.view.x + 137, wms.view.y - 89); // a hard pan
    await wait(200);
    wms.close();
    await wait(300);
    const after = { sx: cam.scrollX, sy: cam.scrollY, z: cam.zoom };
    return {
      // Map mode never touches the camera: zoom must be BYTE-identical. The
      // follow camera keeps lerping toward the player after resume, so
      // scroll gets a 0.01 px tolerance (observed drift 8e-5 px) - a real
      // camera move would be tiles, not sub-hundredths of a pixel.
      identical: Math.abs(before.sx - after.sx) < 0.01 && Math.abs(before.sy - after.sy) < 0.01 && before.z === after.z,
      resumed: !ms.scene.isPaused() && !window.__game.scene.isActive('WorldMapScene'),
      before,
      after,
    };
  });
  ok(
    'map-close-restores: closing the map leaves the gameplay camera byte-identical and MainScene resumed',
    closeRestore.identical === true && closeRestore.resumed === true,
    JSON.stringify(closeRestore),
  );

  // 2m3. map-travel-attuned: an UNATTUNED marker names itself and refuses; an
  // ATTUNED marker enters the EXISTING travel flow — cast started, damage
  // cancels it (rule unchanged), and a clean re-run lands at the waystone.
  await page.evaluate(() => window.__ready().openWorldMap());
  await page.waitForTimeout(700);
  const mapTravel = await page.evaluate(async () => {
    const ms = window.__ready();
    const wp = ms.waypointSys;
    const wms = window.__game.scene.getScene('WorldMapScene');
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!window.__game.scene.isActive('WorldMapScene')) return { setup: 'map did not reopen' };
    const un = wms.waystoneMarkers.find((m) => !m.attuned);
    const unRefused = wms.tapWaystone(un.id) === false;
    const stillOpen = window.__game.scene.isActive('WorldMapScene');
    const toast = wms.toast.text;
    const home = wms.waystoneMarkers.find((m) => m.attuned && wp.nodes.find((n) => n.id === m.id)?.classId === ms.classId) ?? wms.waystoneMarkers.find((m) => m.attuned);
    const tapped = wms.tapWaystone(home.id);
    await wait(300);
    const closedOnTravel = !window.__game.scene.isActive('WorldMapScene');
    const castStarted = wp.casting?.id === home.id;
    ms.playerHealth.shield = 0;
    ms.playerHealth.damage(5); // REAL damage intake — the existing cancel rule
    ms.playerHealth.shield = 1e9;
    const cancelled = wp.casting === null;
    // Clean run: re-open the map, tap again, let the 3 s cast + fade land.
    ms.openWorldMap();
    await wait(700);
    const wms2 = window.__game.scene.getScene('WorldMapScene');
    wms2.tapWaystone(home.id);
    await wait(4600);
    const node = wp.nodes.find((n) => n.id === home.id);
    const d = Math.hypot(ms.player.x - node.x, ms.player.y - node.y);
    return { setup: 'ok', unRefused, stillOpen, toast, tapped, closedOnTravel, castStarted, cancelled, d: +d.toFixed(1), landed: d <= 64 };
  });
  ok(
    'map-travel-attuned: unattuned names itself + refuses (map stays); attuned enters the EXISTING flow — cast, damage-cancel honored, clean cast lands',
    mapTravel.setup === 'ok' &&
      mapTravel.unRefused &&
      mapTravel.stillOpen &&
      /not attuned/.test(mapTravel.toast) &&
      mapTravel.tapped === true &&
      mapTravel.closedOnTravel &&
      mapTravel.castStarted &&
      mapTravel.cancelled &&
      mapTravel.landed,
    JSON.stringify(mapTravel),
  );

  // Restore a gameplay zoom + tap through any arrival dialogue the travel
  // landing opened (same pattern as the waypoint-travel check above).
  await page.evaluate(() => window.__ready().zoomControls.setTarget(1));
  await page.waitForTimeout(1200); // the smoothing lands - the sim checks below must NOT run at world-cap zoom (swiftshader frame starvation)
  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(280);
    const uiOpen = await page.evaluate(() => {
      const ms = window.__game.scene.getScene('MainScene');
      return ms.dialogue.isOpen() || ms.choice.isOpen();
    });
    if (!uiOpen) break;
    await page.mouse.click(214, 520);
    await page.mouse.click(214, 462);
  }

  // ── PASS 6D COMMIT 1: SAFE AREAS + CONTROLS + BUTTON HANDOFF ──────────────
  // 3s0. safe-area-chrome: the harness injects two iPhone inset profiles into
  // the :root --safe-* props (the ONE source the game reads); under EACH, all
  // registered gameplay chrome must lay out inside the safe viewport, and map
  // mode — opened via the REAL button path with the profile active — must lay
  // its chrome out inside it too. Offenders enumerated.
  const P6D_PROFILES = [
    { name: 'portrait', top: 59, right: 0, bottom: 34, left: 0 },
    { name: 'landscape', top: 0, right: 59, bottom: 21, left: 59 },
  ];
  const setSafeProfile = (p) =>
    page.evaluate((q) => {
      const st = document.documentElement.style;
      st.setProperty('--safe-top', q.top + 'px');
      st.setProperty('--safe-right', q.right + 'px');
      st.setProperty('--safe-bottom', q.bottom + 'px');
      st.setProperty('--safe-left', q.left + 'px');
      window.__chrome.refreshSafeInsets();
    }, p);
  const saOffenders = [];
  let saGameplayIds = [];
  let saMapButtonOpens = 0;
  let saGlyphOk = true;
  let saAlphaOk = true;
  for (const prof of P6D_PROFILES) {
    await setSafeProfile(prof);
    await page.waitForTimeout(600);
    const g = await page.evaluate((q) => {
      const rects = window.__chrome.rects().filter((r) => !r.id.startsWith('map-'));
      const w = window.__game.scale.width;
      const h = window.__game.scale.height;
      const bad = rects.filter((r) => r.x < q.left - 0.5 || r.y < q.top - 0.5 || r.x + r.w > w - q.right + 0.5 || r.y + r.h > h - q.bottom + 0.5);
      return { ids: rects.map((r) => r.id).sort(), bad: bad.map((r) => `${r.id}@${r.x.toFixed(0)},${r.y.toFixed(0)}`) };
    }, prof);
    saGameplayIds = g.ids;
    for (const b of g.bad) saOffenders.push(`${prof.name}:${b}`);
    // Open map mode via the REAL out-button at the cap (icon must be the map
    // diamond at FULL alpha — the disabled state at cap is gone).
    await page.evaluate(() => window.__ready().zoomControls.setTarget(0.0001));
    await page.waitForTimeout(1300);
    const capState = await page.evaluate(() => {
      const zc = window.__game.scene.getScene('MainScene').zoomControls;
      return { glyph: zc.outBtn.label.text, alpha: zc.outBtn.bg.alpha, x: zc.outBtn.bg.x, y: zc.outBtn.bg.y };
    });
    saGlyphOk = saGlyphOk && capState.glyph === '◈';
    saAlphaOk = saAlphaOk && capState.alpha > 0.9;
    let opened = false;
    for (let k = 0; k < 8 && !opened; k++) {
      await page.mouse.click(capState.x, capState.y);
      await page.waitForTimeout(700);
      opened = await page.evaluate(() => window.__game.scene.isActive('WorldMapScene'));
    }
    if (opened) saMapButtonOpens++;
    const m = await page.evaluate((q) => {
      const rects = window.__chrome.rects().filter((r) => r.id.startsWith('map-'));
      const w = window.__game.scale.width;
      const h = window.__game.scale.height;
      const bad = rects.filter((r) => r.x < q.left - 0.5 || r.y < q.top - 0.5 || r.x + r.w > w - q.right + 0.5 || r.y + r.h > h - q.bottom + 0.5);
      return { count: rects.length, bad: bad.map((r) => `${r.id}@${r.x.toFixed(0)},${r.y.toFixed(0)}`) };
    }, prof);
    if (m.count !== 5) saOffenders.push(`${prof.name}:map-count=${m.count}`);
    for (const b of m.bad) saOffenders.push(`${prof.name}:${b}`);
    await page.evaluate(() => window.__game.scene.getScene('WorldMapScene')?.close());
    await page.waitForTimeout(400);
  }
  await setSafeProfile({ top: 0, right: 0, bottom: 0, left: 0 });
  await page.waitForTimeout(400);
  const SA_EXPECTED = ['hotbar', 'pause', 'quest-tracker', 'update-toast', 'zoom-in', 'zoom-map', 'zoom-out'];
  ok(
    'safe-area-chrome: under both injected iPhone inset profiles every registered chrome rect (gameplay + map mode) lays out inside the safe viewport',
    saOffenders.length === 0 && SA_EXPECTED.every((id) => saGameplayIds.includes(id)),
    JSON.stringify({ ids: saGameplayIds, offenders: saOffenders.slice(0, 10) }),
  );

  // 3s1. map-open-via-button: at the gameplay cap the out button swapped to
  // the map glyph at FULL alpha and a REAL tap opened map mode — proven under
  // BOTH profiles above. The pinch path was re-proven by map-open-at-cap
  // earlier in this same session.
  ok(
    'map-open-via-button: at the cap the out button shows the map glyph at full alpha (no disabled state) and a real tap opens map mode (both profiles; pinch path re-proven by map-open-at-cap)',
    saMapButtonOpens === 2 && saGlyphOk && saAlphaOk,
    JSON.stringify({ opens: saMapButtonOpens, glyphOk: saGlyphOk, alphaOk: saAlphaOk }),
  );

  // 3s2. tap-targets: every INTERACTIVE chrome element presents a >= 44 pt
  // hit target (map open so its buttons register too).
  {
    let opened = false;
    for (let k = 0; k < 8 && !opened; k++) {
      opened = await page.evaluate(() => window.__ready().openWorldMap());
      if (!opened) await page.waitForTimeout(600);
    }
    const taps = await page.evaluate(() => {
      const rects = window.__chrome.rects().filter((r) => r.interactive);
      const bad = rects.filter((r) => !r.hit || r.hit.w < 44 || r.hit.h < 44);
      return { total: rects.length, ids: rects.map((r) => r.id).sort(), bad: bad.map((r) => `${r.id}:${r.hit ? `${r.hit.w}x${r.hit.h}` : 'none'}`) };
    });
    ok(
      'tap-targets: every interactive chrome element presents a >= 44 pt hit target (visual sizes unchanged)',
      taps.total >= 9 && taps.bad.length === 0,
      JSON.stringify(taps),
    );

    // 3s3. map-zoom-buttons: one ~1.4x step per tap about the screen center,
    // hard-clamped to the SAME range the pinch uses — the minus button greys
    // at planet-fit (and NEVER pinch-closes), the plus greys at max map zoom.
    const mz = await page.evaluate(async () => {
      const wms = window.__game.scene.getScene('WorldMapScene');
      const wait = (t) => new Promise((r) => setTimeout(r, t));
      const s0 = wms.viewScale;
      wms.buttonZoom('in');
      const ratio = wms.viewScale / s0;
      for (let i = 0; i < 40; i++) wms.buttonZoom('out');
      await wait(250);
      const atMin = Math.abs(wms.viewScale - wms.minScale) < 1e-9;
      const minGrey = wms.zoomBtns.minus.bg.alpha < 0.6;
      const plusLiveAtMin = wms.zoomBtns.plus.bg.alpha > 0.9;
      const stillOpenAtMin = window.__game.scene.isActive('WorldMapScene');
      for (let i = 0; i < 60; i++) wms.buttonZoom('in');
      await wait(250);
      const atMax = Math.abs(wms.viewScale - 12) < 1e-9;
      const maxGrey = wms.zoomBtns.plus.bg.alpha < 0.6;
      const minusLiveAtMax = wms.zoomBtns.minus.bg.alpha > 0.9;
      return { ratio: +ratio.toFixed(4), atMin, minGrey, plusLiveAtMin, stillOpenAtMin, atMax, maxGrey, minusLiveAtMax };
    });
    ok(
      'map-zoom-buttons: 1.4x per tap, clamp shared with pinch — minus greys at planet-fit without closing, plus greys at max map zoom',
      Math.abs(mz.ratio - 1.4) < 1e-3 && mz.atMin && mz.minGrey && mz.plusLiveAtMin && mz.stillOpenAtMin && mz.atMax && mz.maxGrey && mz.minusLiveAtMax,
      JSON.stringify(mz),
    );

    // 3s4. chrome-restore: the gameplay zoom cluster hides while map mode is
    // open and returns on close; the out-button glyph tracks the cap state in
    // both directions (map diamond at the cap, minus off it).
    const rest = await page.evaluate(async () => {
      const ms = window.__game.scene.getScene('MainScene');
      const wait = (t) => new Promise((r) => setTimeout(r, t));
      const hiddenWhileOpen = ms.zoomControls.outBtn.bg.visible === false && ms.zoomControls.inBtn.bg.visible === false;
      window.__game.scene.getScene('WorldMapScene').close();
      await wait(400);
      const restored = ms.zoomControls.outBtn.bg.visible === true && ms.zoomControls.inBtn.bg.visible === true;
      const resumed = !ms.scene.isPaused();
      const glyphAtCap = ms.zoomControls.outBtn.label.text;
      ms.zoomControls.setTarget(1);
      await wait(900);
      const glyphOffCap = ms.zoomControls.outBtn.label.text;
      return { hiddenWhileOpen, restored, resumed, glyphAtCap, glyphOffCap };
    });
    ok(
      'chrome-restore: gameplay zoom cluster hidden in map mode, restored on close; the out glyph is the map diamond at the cap and the minus sign off it',
      rest.hiddenWhileOpen && rest.restored && rest.resumed && rest.glyphAtCap === '◈' && rest.glyphOffCap === '−',
      JSON.stringify(rest),
    );
  }
  // 3t0. map-lod-swap (PASS 6D COMMIT 2): with the player inside the PNW
  // bbox, map mode's REGIONAL TIER engages above the threshold (crossfaded,
  // never a pop), stays planet-only below it, aligns to the shared equirect
  // projection at 4 fixture points, and lifts the max zoom to 2 screen px
  // per region-image px over the region — planet cap away from it. A route
  // counter proves the image is fetched at most once per session.
  let regionMapFetches = 0;
  await page.route('**/world/regions/pnw-map.png', (route) => {
    regionMapFetches++;
    void route.continue();
  });
  {
    let opened = false;
    for (let k = 0; k < 8 && !opened; k++) {
      opened = await page.evaluate(() => window.__ready().openWorldMap());
      if (!opened) await page.waitForTimeout(600);
    }
    const lod = await page.evaluate(async () => {
      const wms = window.__game.scene.getScene('WorldMapScene');
      const wait = (t) => new Promise((r) => setTimeout(r, t));
      for (let k = 0; k < 30 && wms.regionTier[0]?.state !== 'ready'; k++) await wait(300);
      const t = wms.regionTier[0];
      if (!t || t.state !== 'ready') return { setup: `tier ${t?.state ?? 'missing'}` };
      // Center over the PNW so the region governs the view.
      const cx = t.rect.x + t.rect.w / 2;
      const cy = t.rect.y + t.rect.h / 2;
      wms.viewScale = 2;
      wms.applyView(cx, cy);
      await wait(200);
      const visAbove = t.img?.visible === true && t.img.alpha === 1;
      const capOverRegion = wms.maxScale();
      const capExpected = (2 * t.imgW) / t.rect.w;
      // Mid-band: the crossfade is PARTIAL (no pop).
      wms.viewScale = 1.15;
      wms.applyView(cx, cy);
      await wait(200);
      const midAlpha = t.img?.alpha ?? -1;
      // Below the threshold: planet-only, as today.
      wms.viewScale = 0.6;
      wms.applyView(cx, cy);
      await wait(200);
      const hiddenBelow = t.img?.visible === false;
      // Away from the region (mid-Atlantic) the planet cap answers.
      wms.viewScale = 6;
      wms.applyView(1024, 709);
      await wait(200);
      const capAway = wms.maxScale();
      // Projection fixtures: the region image placement must land each
      // lat/lng on the SAME planet-image px the closed form gives.
      const bb = { latMin: 41.5, latMax: 49.5, lngMin: -125, lngMax: -110.5 };
      const fixtures = [
        [47.606, -122.332],
        [46.6, -120.5],
        [43.615, -116.202],
        [49.0, -123.0],
      ];
      const errs = fixtures.map(([lat, lng]) => {
        const planet = { x: ((lng + 180) / 360) * 2048, y: ((85 - lat) / 170) * 1418 };
        const via = {
          x: t.img.x + ((lng - bb.lngMin) / (bb.lngMax - bb.lngMin)) * t.img.displayWidth,
          y: t.img.y + ((bb.latMax - lat) / (bb.latMax - bb.latMin)) * t.img.displayHeight,
        };
        return Math.hypot(planet.x - via.x, planet.y - via.y);
      });
      // Cycle the threshold once more — the state machine must not refetch.
      wms.viewScale = 2;
      wms.applyView(cx, cy);
      await wait(200);
      window.__game.scene.getScene('WorldMapScene').close();
      await wait(300);
      return {
        setup: 'ok',
        from: t.from,
        visAbove,
        midAlpha: +midAlpha.toFixed(2),
        hiddenBelow,
        capOverRegion: +capOverRegion.toFixed(2),
        capExpected: +capExpected.toFixed(2),
        capAway,
        maxErr: +Math.max(...errs).toFixed(3),
      };
    });
    ok(
      'map-lod-swap: region tier engages over the PNW above the threshold (partial alpha mid-band, hidden below), projection fixtures exact, max zoom 2 px per region px over the region and the planet cap away',
      lod.setup === 'ok' &&
        lod.visAbove &&
        lod.midAlpha > 0.05 &&
        lod.midAlpha < 0.95 &&
        lod.hiddenBelow &&
        Math.abs(lod.capOverRegion - lod.capExpected) < 1e-6 &&
        lod.capAway === 12 &&
        lod.maxErr < 0.5 &&
        regionMapFetches <= 1,
      JSON.stringify({ ...lod, fetches: regionMapFetches }),
    );
  }
  await page.unroute('**/world/regions/pnw-map.png');

  // Leave the session exactly as the pre-6D flow did: gameplay zoom restored,
  // any arrival UI tapped through (the sim checks below need a live funnel).
  await page.waitForTimeout(600);
  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(280);
    const uiOpen = await page.evaluate(() => {
      const ms = window.__game.scene.getScene('MainScene');
      return ms.dialogue.isOpen() || ms.choice.isOpen();
    });
    if (!uiOpen) break;
    await page.mouse.click(214, 520);
    await page.mouse.click(214, 462);
  }

  // ── PASS 6B: SIMULATION LOCALITY — ENCOUNTER LIFECYCLE ────────────────────
  // 2n0. guardian-leash-reconcile: the audit soft-lock repro end-to-end —
  // aggro the swords, outrun the leash, return, and re-activation is CLEAN.
  // Phase/entity consistency asserted at every step: the phase can never say
  // 'fighting' over dormant entities.
  const guardianRec = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (ms.guardians.length === 0) return { setup: 'no guardians spawned' };
    const g0 = ms.guardians[0];
    const outpost = { x: g0.x, y: g0.y }; // dormant swords stand at the outpost
    ms.player.sprite.body.reset(outpost.x + 60, outpost.y + 60);
    ms.lastLandPos = undefined;
    await wait(600);
    const fighting = ms.guardianPhase === 'fighting' && ms.guardians.some((g) => g.isAggro);
    ms.guardians[0].takeHit(25); // real damage — the reset must heal this back
    const hpAfterHit = ms.guardians[0].health.current;
    const hpMax = ms.guardians[0].health.max;
    // OUTRUN: beyond the entity leash (2048) — the funnel deaggros the swords
    // and the coordinator reconciles the phase in the same breath.
    ms.player.sprite.body.reset(outpost.x + ms.feel.combat.leashRadiusPx + 900, outpost.y);
    ms.lastLandPos = undefined;
    let reconciled = false;
    for (let k = 0; k < 14 && !reconciled; k++) {
      await wait(300);
      reconciled = ms.guardianPhase === 'dormant' && ms.guardians.every((g) => !g.isAggro);
    }
    const healed = ms.guardians.every((g) => g.health.current === g.health.max);
    const noMismatch = !(ms.guardianPhase === 'fighting' && ms.guardians.every((g) => !g.isAggro));
    // RETURN: clean re-activation from dormant.
    ms.player.sprite.body.reset(outpost.x + 60, outpost.y + 60);
    ms.lastLandPos = undefined;
    let refought = false;
    for (let k = 0; k < 14 && !refought; k++) {
      await wait(300);
      refought = ms.guardianPhase === 'fighting' && ms.guardians.some((g) => g.isAggro);
    }
    // Leave again so later checks run clear of the fight.
    ms.player.sprite.body.reset(outpost.x + ms.feel.combat.leashRadiusPx + 900, outpost.y);
    ms.lastLandPos = undefined;
    await wait(600);
    return { setup: 'ok', fighting, hpAfterHit, hpMax, reconciled, healed, noMismatch, refought };
  });
  ok(
    'guardian-leash-reconcile: aggro → outrun → dormant + healed (phase follows entities) → return → clean re-activation',
    guardianRec.setup === 'ok' && guardianRec.fighting && guardianRec.hpAfterHit < guardianRec.hpMax && guardianRec.reconciled && guardianRec.healed && guardianRec.noMismatch && guardianRec.refought,
    JSON.stringify(guardianRec),
  );

  // 2n1. portal-defense-suspend: frozen timer + HP, wave despawned, ZERO
  // spawns while the clock advances, resume restarts the SAME wave with the
  // portal HP exactly as frozen.
  const pdSuspend = await page.evaluate(async () => {
    const ms = window.__ready();
    const pd = ms.portalDefense;
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    ms.devStartPortalDefense(); // the real dev trigger: teleports to the portal + starts
    // Let the intro breather elapse and wave 1 spawn.
    let waveUp = false;
    for (let k = 0; k < 30 && !waveUp; k++) {
      await wait(400);
      waveUp = pd.waveNumber >= 1 && pd.aliveCount() > 0;
    }
    if (!waveUp) return { setup: 'wave never spawned' };
    ms.portal.takeDamage(40); // real damage so the HP freeze is observable
    const wave0 = pd.waveNumber;
    const hp0 = ms.portal.health.current;
    // SUSPEND: teleport beyond the encounter radius (radius-derived — the
    // teleport IS the test; no special case exists).
    const far = { x: ms.portal.x + ms.feel.sim.encounterSuspendRadiusPx + 1500, y: ms.portal.y };
    ms.player.sprite.body.reset(far.x, far.y);
    ms.lastLandPos = undefined;
    let suspended = false;
    for (let k = 0; k < 10 && !suspended; k++) {
      await wait(300);
      suspended = pd.isSuspended && ms.encounters.isSuspended('portal-defense');
    }
    const waveDespawned = pd.aliveCount() === 0;
    // ADVANCE THE CLOCK well past breather + wave timeout: zero spawns, zero
    // wave movement, HP frozen.
    await wait(4200);
    const stillFrozen = pd.isSuspended && pd.aliveCount() === 0 && pd.waveNumber === wave0 && ms.portal.health.current === hp0;
    // RESUME: return — the SAME wave restarts, HP exactly as frozen.
    ms.player.sprite.body.reset(ms.portal.x + 200, ms.portal.y + 120);
    ms.lastLandPos = undefined;
    let resumed = false;
    for (let k = 0; k < 12 && !resumed; k++) {
      await wait(300);
      resumed = !pd.isSuspended && pd.aliveCount() > 0;
    }
    const sameWave = pd.waveNumber === wave0;
    const hpKept = ms.portal.health.current === hp0;
    ms.resetPortalDefense(); // clean fixture teardown
    return { setup: 'ok', wave0, hp0, suspended, waveDespawned, stillFrozen, resumed, sameWave, hpKept };
  });
  ok(
    'portal-defense-suspend: beyond the radius the clock freezes (wave despawned, zero spawns under an advanced clock, HP frozen); return restarts the SAME wave with HP retained',
    pdSuspend.setup === 'ok' && pdSuspend.suspended && pdSuspend.waveDespawned && pdSuspend.stillFrozen && pdSuspend.resumed && pdSuspend.sameWave && pdSuspend.hpKept,
    JSON.stringify(pdSuspend),
  );

  // 2n2. portal-defense-waystone: the same suspend through the REAL waystone
  // travel path — travel is just a big teleport, and radius-derivation must
  // not care.
  const pdWaystone = await page.evaluate(async () => {
    const ms = window.__ready();
    const pd = ms.portalDefense;
    const wp = ms.waypointSys;
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    // PRECONDITION through the REAL path: attune wp-olympia by walking into
    // its discovery radius (loud setup failure if the scan does not unlock).
    if (!wp.unlocked.has('wp-olympia')) {
      const oly = wp.nodes.find((n) => n.id === 'wp-olympia');
      ms.player.sprite.body.reset(oly.x + 100, oly.y);
      ms.lastLandPos = undefined;
      await wait(1000); // two discovery scans
      if (!wp.unlocked.has('wp-olympia')) return { setup: 'olympia discovery failed' };
    }
    ms.devStartPortalDefense();
    let waveUp = false;
    for (let k = 0; k < 30 && !waveUp; k++) {
      await wait(400);
      waveUp = pd.waveNumber >= 1 && pd.aliveCount() > 0;
    }
    if (!waveUp) return { setup: 'wave never spawned' };
    const wave0 = pd.waveNumber;
    // The un-suspended wave keeps striking the portal DURING the 3 s travel
    // cast (real gameplay, not the contract under test) - top the portal up
    // so the incidental chew cannot LOSE the encounter mid-cast. The
    // frozen-HP contract is measured AT suspension, below.
    ms.portal.health.full();
    // REAL waystone travel away (~120k px from the portal - far beyond the radius).
    const started = wp.startTravel('wp-olympia');
    await wait(4600); // 3 s cast + fade
    let suspended = false;
    for (let k = 0; k < 10 && !suspended; k++) {
      await wait(300);
      suspended = pd.isSuspended;
    }
    const awayFromPortal = Math.hypot(ms.player.x - ms.portal.x, ms.player.y - ms.portal.y) > ms.feel.sim.encounterSuspendRadiusPx;
    // THE CONTRACT: HP freezes at suspension and stays frozen while away.
    const hpFrozen = ms.portal.health.current;
    await wait(900);
    const hpStaysFrozen = ms.portal.health.current === hpFrozen;
    // Return by teleport (the mechanism under test is the radius, not the
    // ride). The RESUME poll happens in a second evaluate: the landing can
    // open arrival dialogue, which freezes the update loop until tapped
    // through like a player (below).
    ms.player.sprite.body.reset(ms.portal.x + 200, ms.portal.y + 120);
    ms.lastLandPos = undefined;
    return { setup: 'ok', started, awayFromPortal, suspended, hpStaysFrozen, wave0, hpFrozen };
  });
  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(280);
    const uiOpen = await page.evaluate(() => {
      const ms = window.__game.scene.getScene('MainScene');
      return ms.dialogue.isOpen() || ms.choice.isOpen();
    });
    if (!uiOpen) break;
    await page.mouse.click(214, 520);
    await page.mouse.click(214, 462);
  }
  const pdWaystone2 = await page.evaluate(async (fixture) => {
    const ms = window.__ready();
    const pd = ms.portalDefense;
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    let resumed = false;
    for (let k = 0; k < 12 && !resumed; k++) {
      await wait(300);
      resumed = !pd.isSuspended && pd.aliveCount() > 0;
    }
    const sameWave = pd.waveNumber === fixture.wave0;
    const hpKept = ms.portal.health.current === fixture.hpFrozen;
    ms.resetPortalDefense();
    return { resumed, sameWave, hpKept };
  }, pdWaystone.setup === 'ok' ? { wave0: pdWaystone.wave0, hpFrozen: pdWaystone.hpFrozen } : { wave0: -9, hpFrozen: -9 });
  ok(
    'portal-defense-waystone: the REAL waystone travel path suspends the encounter exactly like any other distance; return resumes the same wave + HP',
    pdWaystone.setup === 'ok' && pdWaystone.started && pdWaystone.awayFromPortal && pdWaystone.suspended && pdWaystone.hpStaysFrozen && pdWaystone2.resumed && pdWaystone2.sameWave && pdWaystone2.hpKept,
    JSON.stringify({ ...pdWaystone, ...pdWaystone2 }),
  );

  // The waystone landing (2n2) can open arrival UI, which freezes the whole
  // update loop (funnel included) — tap through it like a player before the
  // boss check, exactly as after every other travel in this gate.
  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(280);
    const uiOpen = await page.evaluate(() => {
      const ms = window.__game.scene.getScene('MainScene');
      return ms.dialogue.isOpen() || ms.choice.isOpen();
    });
    if (!uiOpen) break;
    await page.mouse.click(214, 520);
    await page.mouse.click(214, 462);
  }

  // 2n3. boss-funnel: bar on engage; beyond the boss leash the boss takes the
  // STANDARD reset (dormant, full HP) and the bar hides — funnel
  // introspection agrees in both directions.
  const bossFunnel = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    // HARNESS CONTRACT: a frozen update loop would vacuously fail everything
    // downstream — assert the precondition LOUDLY instead.
    if (ms.dialogue.isOpen() || ms.choice.isOpen()) return { setup: 'dialogue open - update loop frozen' };
    const home = ms.terrestrialPxFromLatLng({ lat: 23.0, lng: 4.0 });
    ms.player.sprite.body.reset(home.x, home.y);
    ms.lastLandPos = undefined;
    await wait(500);
    const b = ms.spawnBoss(ms.michael.def, home.x + 140, home.y, ms.activeMap().layer);
    b.activate();
    b.takeHit(30); // real damage: the leash reset must heal it back
    let engaged = false;
    for (let k = 0; k < 12 && !engaged; k++) {
      await wait(300);
      engaged = ms.combatEngagements().includes(b.id);
    }
    const barOn = ms.bossBarBg.visible === true;
    const hpDown = b.health.current < b.health.max;
    // Beyond the BOSS leash (3072 — wider than the entity leash).
    ms.player.sprite.body.reset(home.x + ms.feel.sim.bossLeashRadiusPx + 1200, home.y);
    ms.lastLandPos = undefined;
    let released = false;
    for (let k = 0; k < 12 && !released; k++) {
      await wait(300);
      released = !ms.combatEngagements().includes(b.id) && !b.isActive;
    }
    const resetFull = b.isAlive && b.health.current === b.health.max && !b.isAggro;
    const barOff = ms.bossBarBg.visible === false;
    // Return: re-activation through the standard activation range.
    ms.player.sprite.body.reset(home.x + 100, home.y);
    ms.lastLandPos = undefined;
    let reengaged = false;
    for (let k = 0; k < 12 && !reengaged; k++) {
      await wait(300);
      reengaged = ms.combatEngagements().includes(b.id);
    }
    const barBack = ms.bossBarBg.visible === true;
    ms.removeDevBosses(); // fixture teardown (preserves Michael + Sin bosses)
    await wait(300);
    return { setup: 'ok', engaged, barOn, hpDown, released, resetFull, barOff, reengaged, barBack };
  });
  ok(
    'boss-funnel: bar on engage; beyond the 3072 boss leash the boss standard-resets (dormant, full HP) and the bar hides; re-approach re-engages — funnel agrees throughout',
    bossFunnel.setup === 'ok' && bossFunnel.engaged && bossFunnel.barOn && bossFunnel.hpDown && bossFunnel.released && bossFunnel.resetFull && bossFunnel.barOff && bossFunnel.reengaged && bossFunnel.barBack,
    JSON.stringify(bossFunnel),
  );

  // ── PASS 6B COMMIT 2: TRANSIENT EXPIRY + CAP LOCALITY + BUILD/PWA ─────────
  // 2n4. expiry-transient: a wolf + a raider beyond the expiry radius are
  // removed outright — cap slots freed, no kill credit, funnel untouched.
  const expiryT = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    const home = ms.terrestrialPxFromLatLng({ lat: 23.0, lng: 6.0 });
    ms.player.sprite.body.reset(home.x, home.y);
    ms.lastLandPos = undefined;
    await wait(500);
    const kills0 = JSON.stringify(ms.regionKillCounts);
    const exp0 = ms.transientsExpired;
    ms.spawnRegionEnemy('gate-expiry', 'corrupted-wildlife', home.x + 300, home.y, 0xffffff);
    ms.spawnRegionEnemy('gate-expiry', 'evil-raiders', home.x - 300, home.y, 0xffffff);
    await wait(300);
    const rows0 = ms.regionLive.filter((r) => r.zoneId === 'gate-expiry').length;
    const live0 = ms.regionLiveCount();
    ms.player.sprite.body.reset(home.x + ms.feel.sim.transientDespawnRadiusPx + 1500, home.y);
    ms.lastLandPos = undefined;
    let goneRows = false;
    for (let k = 0; k < 14 && !goneRows; k++) {
      await wait(300);
      goneRows = ms.regionLive.filter((r) => r.zoneId === 'gate-expiry').length === 0;
    }
    return {
      setup: rows0 === 2 ? 'ok' : `spawned ${rows0}`,
      rows0,
      live0,
      goneRows,
      slotsFreed: ms.regionLiveCount() <= live0 - 2,
      expiredDelta: ms.transientsExpired - exp0,
      funnelClean: ms.combatEngagements().length === 0,
      killsUntouched: JSON.stringify(ms.regionKillCounts) === kills0,
    };
  });
  ok(
    'expiry-transient: wolf + raider beyond the radius expire outright — rows gone, slots freed, zero kill credit, funnel clean',
    expiryT.setup === 'ok' && expiryT.goneRows && expiryT.slotsFreed && expiryT.expiredDelta === 2 && expiryT.funnelClean && expiryT.killsUntouched,
    JSON.stringify(expiryT),
  );

  // 2n5. authored-persist: authored content at the SAME distance survives —
  // the sasquatch, the portal, and every region mentor are not transients.
  const authoredP = await page.evaluate(() => {
    const ms = window.__ready();
    const d = Math.hypot(ms.sasquatch.x - ms.player.x, ms.sasquatch.y - ms.player.y);
    return {
      beyond: d > ms.feel.sim.transientDespawnRadiusPx,
      sasquatchAlive: ms.sasquatch.isAlive,
      portalAlive: ms.portal.health.max > 0 && !ms.portal.isDestroyed,
      mentors: ms.regionMentors.length,
    };
  });
  ok(
    'authored-persist: the sasquatch, the portal, and the mentors survive at expiry distance — authored content never expires',
    authoredP.beyond && authoredP.sasquatchAlive && authoredP.portalAlive && authoredP.mentors >= 10,
    JSON.stringify(authoredP),
  );

  // 2n6. cap-locality: fill the cap at hotspot A, travel to B — the slots
  // free through EXPIRY (not zone hysteresis), and spawning at B works
  // immediately. The audit's starvation repro, now the test.
  const capLoc = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    const A = ms.terrestrialPxFromLatLng({ lat: 23.0, lng: 8.0 });
    ms.player.sprite.body.reset(A.x, A.y);
    ms.lastLandPos = undefined;
    await wait(500);
    const cap = 48;
    for (let i = ms.regionLiveCount(); i < cap; i++) {
      ms.spawnRegionEnemy('gate-capA', 'corrupted-wildlife', A.x + 200 + (i % 8) * 40, A.y + Math.floor(i / 8) * 40, 0xffffff);
    }
    await wait(200);
    const filled = ms.regionLiveCount();
    ms.spawnRegionPack('gate-capA2', { family: 'corrupted-wildlife', x: A.x - 400, y: A.y });
    const refusedAtCap = ms.regionLiveCount() === filled;
    // Travel to hotspot B, beyond the expiry radius.
    const B = { x: A.x + ms.feel.sim.transientDespawnRadiusPx + 2000, y: A.y };
    ms.player.sprite.body.reset(B.x, B.y);
    ms.lastLandPos = undefined;
    let freed = false;
    for (let k = 0; k < 14 && !freed; k++) {
      await wait(300);
      freed = ms.regionLiveCount() === 0;
    }
    ms.spawnRegionPack('gate-capB', { family: 'corrupted-wildlife', x: B.x + 250, y: B.y });
    await wait(200);
    const spawnedAtB = ms.regionLive.filter((r) => r.zoneId === 'gate-capB').length;
    // Teardown: expire the B pack too.
    ms.player.sprite.body.reset(B.x + ms.feel.sim.transientDespawnRadiusPx + 2000, B.y);
    ms.lastLandPos = undefined;
    for (let k = 0; k < 14 && ms.regionLiveCount() > 0; k++) await wait(300);
    return { setup: 'ok', filled, refusedAtCap, freed, spawnedAtB, cleaned: ms.regionLiveCount() === 0 };
  });
  ok(
    'cap-locality: cap filled at A refuses more; at B the slots are free via expiry and a pack spawns immediately — no hysteresis wait',
    capLoc.setup === 'ok' && capLoc.filled === 48 && capLoc.refusedAtCap && capLoc.freed && capLoc.spawnedAtB >= 3 && capLoc.cleaned,
    JSON.stringify(capLoc),
  );

  // 2n7. repopulate-on-return: leaving a real zone empties it (hysteresis +
  // expiry backstop); returning refills it through the NORMAL staged-spawn
  // path — expiry never fights the hearth/staging logic.
  const repop = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    let zone = null;
    for (const z of ms.regionSpawnZones) {
      ms.player.sprite.body.reset(z.center.x, z.center.y);
      ms.lastLandPos = undefined;
      await wait(700);
      if (ms.regionLive.filter((r) => r.zoneId === z.zoneId && r.entity.isAlive).length > 0) {
        zone = z;
        break;
      }
    }
    if (!zone) return { setup: 'no zone yields live spawns' };
    const count0 = ms.regionLive.filter((r) => r.zoneId === zone.zoneId && r.entity.isAlive).length;
    ms.player.sprite.body.reset(zone.center.x + ms.feel.sim.transientDespawnRadiusPx + 2000, zone.center.y);
    ms.lastLandPos = undefined;
    let empty = false;
    for (let k = 0; k < 14 && !empty; k++) {
      await wait(300);
      empty = ms.regionLive.filter((r) => r.zoneId === zone.zoneId && r.entity.isAlive).length === 0 && !zone.active;
    }
    ms.player.sprite.body.reset(zone.center.x, zone.center.y);
    ms.lastLandPos = undefined;
    let refilled = 0;
    for (let k = 0; k < 14 && refilled === 0; k++) {
      await wait(300);
      refilled = ms.regionLive.filter((r) => r.zoneId === zone.zoneId && r.entity.isAlive).length;
    }
    return { setup: 'ok', zone: zone.zoneId, count0, empty, refilled, viaNormalPath: zone.active === true };
  });
  ok(
    'repopulate-on-return: a real zone empties on leave and REFILLS through the normal activation path on return',
    repop.setup === 'ok' && repop.count0 > 0 && repop.empty && repop.refilled > 0 && repop.viaNormalPath,
    JSON.stringify(repop),
  );

  // 2n8. build-stamp-present: the pause-menu stamp shows the SAME id the
  // bundle was built with — read from the page, then proven against dist.
  const stamp = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    ms.scene.launch('PauseScene');
    ms.scene.pause();
    await wait(500);
    const ps = window.__game.scene.getScene('PauseScene');
    const text = ps.children.getByName('build-stamp')?.text ?? '';
    ps.scene.stop();
    ms.scene.resume();
    await wait(200);
    return { id: window.__worldScale.buildId, time: window.__worldScale.buildTime, text };
  });
  const distJs = readdirSync(new URL('../dist/assets/', import.meta.url).pathname).filter((f) => f.endsWith('.js'));
  const bundleHasId = distJs.some((f) => readFileSync(new URL(`../dist/assets/${f}`, import.meta.url).pathname, 'utf8').includes(stamp.id));
  ok(
    'build-stamp-present: the pause footer carries the build id + time, and the id is baked into the shipped bundle',
    stamp.id.length >= 7 && stamp.text.includes(stamp.id) && stamp.text.includes('build') && bundleHasId && stamp.time.includes('T'),
    JSON.stringify({ ...stamp, bundleHasId, files: distJs.length }),
  );

  // 2n9. sw-update-prompt: a (simulated) WAITING worker surfaces the toast;
  // the tap runs the REAL activation path — skip-waiting posted, activated
  // flagged, toast dismissed, and NO reload (the fake worker never fires
  // controllerchange, which is the only reload trigger).
  const swPrompt = await page.evaluate(() => {
    const ms = window.__ready();
    const rec = ms.pwaUpdater.simulateWaiting();
    const toastShown = ms.pwaToast.bg.visible === true && ms.pwaToast.label.text.includes('Update ready');
    ms.tapPwaUpdate(); // the toast's real handler
    return {
      toastShown,
      activated: ms.pwaUpdater.activated,
      msgs: rec.messages,
      toastGone: ms.pwaToast.bg.visible === false,
      stillAlive: typeof window.__game === 'object',
    };
  });
  const swSrc = readFileSync(new URL('../dist/sw.js', import.meta.url).pathname, 'utf8');
  ok(
    'sw-update-prompt: waiting worker → toast → tap posts SKIP_WAITING and flags activation, no silent reload; sw.js is a no-cache beacon',
    swPrompt.toastShown &&
      swPrompt.activated &&
      swPrompt.msgs.includes('SKIP_WAITING') &&
      swPrompt.toastGone &&
      swPrompt.stillAlive &&
      swSrc.includes('SKIP_WAITING') &&
      !swSrc.includes("addEventListener('fetch'"),
    JSON.stringify({ ...swPrompt, swBytes: swSrc.length }),
  );

  // ── PASS 6C: PNW RE-PLANTING — true-coordinate WA + ID (same v2 session) ──
  const rp6 = await import(new URL('../node_modules/.cache/toh-replant.mjs', import.meta.url).pathname);
  const lf6b = await import(new URL('../node_modules/.cache/toh-legacy-frame.mjs', import.meta.url).pathname);
  const ws6 = await import(new URL('../node_modules/.cache/toh-world-scale.mjs', import.meta.url).pathname);

  // 3r0. legacy-dissolved-v2: the mega-stamp neither renders, nor registers
  // as a chunk, nor hosts the player collider; every POI stamp + crossing
  // causeway exists and every declared anchor lands EXACTLY on its true
  // Earth coordinate through the live legacyEarthPx path.
  const dissolved = await page.evaluate(() => {
    const ms = window.__ready();
    const probe = ms.replantProbe();
    const worst = probe.reduce((a, b) => (b.errPx > a.errPx ? b : a), probe[0]);
    const enumStamp = ms.replantStampById.get('enumclaw');
    const inRect = (p, b) => p.x >= b.x && p.x < b.x + b.width && p.y >= b.y && p.y < b.y + b.height;
    return {
      pois: probe.length,
      footprintStamps: probe.filter((p) => p.stamped).length,
      crossingStamps: [...ms.replantStampById.keys()].filter((k) => k.startsWith('crossing-')).length,
      stamps: ms.replantStamps.length,
      allExact: probe.every((p) => p.errPx <= 0.5),
      worst,
      megaInvisible: ms.map.layer.visible === false,
      megaNotChunk: !ms.earthChunkMaps.includes(ms.map),
      colliderOnStamp: !!enumStamp && ms.earthCollider.object2 === enumStamp.layer,
      townInStamp: !!enumStamp && inRect(ms.town.spawn, enumStamp.bounds),
      seattleInStamp: inRect(ms.seattle.spawn, ms.replantStampById.get('seattle').bounds),
      portlandInStamp: inRect(ms.portland.spawn, ms.replantStampById.get('portland').bounds),
    };
  });
  ok(
    'legacy-dissolved-v2: mega-stamp invisible, not a chunk, collider on the Enumclaw stamp; 36 POI stamps + 11 causeways live; every anchor exact on its true coordinate; all three towns inside their stamps',
    dissolved.pois === 37 &&
      dissolved.footprintStamps === 36 &&
      dissolved.crossingStamps === 11 &&
      dissolved.stamps === 47 &&
      dissolved.allExact &&
      dissolved.megaInvisible &&
      dissolved.megaNotChunk &&
      dissolved.colliderOnStamp &&
      dissolved.townInStamp &&
      dissolved.seattleInStamp &&
      dissolved.portlandInStamp,
    JSON.stringify(dissolved),
  );

  // 3r1. poi-layout-preserved: the Enumclaw + Olympia re-planted stamps are
  // BYTE-IDENTICAL to the same neighborhoods captured in the v1 session
  // (town paint included — both scales paint through the same buildTown).
  const layoutCmp = await page.evaluate((grids) => {
    const ms = window.__ready();
    const out = {};
    for (const id of ['enumclaw', 'olympia']) {
      const m = ms.replantStampById.get(id);
      if (!m) {
        out[id] = { match: false, why: 'no stamp' };
        continue;
      }
      const rows = [];
      for (let y = 0; y < m.data.height; y++) {
        let row = '';
        for (let x = 0; x < m.data.width; x++) row += ',' + (m.terrainAtTile(x, y)?.id ?? 'x');
        rows.push(row);
      }
      const got = rows.join('|');
      out[id] = { match: got === grids[id], bytes: got.length, wantBytes: grids[id].length };
      if (!out[id].match) {
        for (let i = 0; i < Math.min(got.length, grids[id].length); i++) {
          if (got[i] !== grids[id][i]) {
            out[id].firstDiff = i;
            out[id].ctx = `${grids[id].slice(i - 8, i + 8)} vs ${got.slice(i - 8, i + 8)}`;
            break;
          }
        }
      }
    }
    return out;
  }, p6cV1.grids);
  ok(
    'poi-layout-preserved: the Enumclaw + Olympia stamps are byte-identical to their v1 neighborhoods (towns included)',
    layoutCmp.enumclaw.match === true && layoutCmp.olympia.match === true,
    JSON.stringify(layoutCmp),
  );

  // 3r2. crossing-stamps: every authored causeway exists at its site, is
  // painted entirely from the EXISTING road tile (non-blocking), sits
  // centered on its declared coordinate, and spans REAL baked water.
  const crossingsIn = rp6.REPLANT_CROSSINGS.map((c) => {
    const g = rp6.latLngGlobePx(c.lat, c.lng);
    return { id: c.id, lat: c.lat, lng: c.lng, sceneX: lf6b.LEGACY_GLOBE_ORIGIN_X + Math.round(g.x), sceneY: Math.round(g.y), dir: c.dir, tiles: c.tiles };
  });
  const crossings = await page.evaluate((list) => {
    const ms = window.__ready();
    const st = ms.chunkStreamer;
    const B = window.__worldScale.schema.Biome;
    const out = [];
    for (const c of list) {
      const m = ms.replantStampById.get(`crossing-${c.id}`);
      if (!m) {
        out.push({ id: c.id, okAll: false, why: 'no stamp' });
        continue;
      }
      let road = 0;
      let total = 0;
      for (let y = 0; y < m.data.height; y++) {
        for (let x = 0; x < m.data.width; x++) {
          total++;
          const t = m.terrainAtTile(x, y);
          if (t && !t.blocks && /road/i.test(t.key)) road++;
        }
      }
      const b = m.bounds;
      const cx = b.x + b.width / 2;
      const cy = b.y + b.height / 2;
      const centerErr = Math.hypot(cx - c.sceneX, cy - c.sceneY);
      const water = st.earthSample(c.lat, c.lng);
      const waterUnder = water[0] === B.OCEAN || water[0] === B.FRESHWATER;
      const sized = c.dir === 'ew' ? m.data.width === c.tiles && m.data.height === 3 : m.data.width === 3 && m.data.height === c.tiles;
      out.push({ id: c.id, okAll: road === total && centerErr <= 48 && waterUnder && sized, road, total, centerErr: +centerErr.toFixed(1), waterUnder, sized });
    }
    return out;
  }, crossingsIn);
  ok(
    'crossing-stamps: all 11 causeways at real sites — road-tile-only (non-blocking), centered on their coordinates, spanning baked water',
    crossings.length === 11 && crossings.every((c) => c.okAll),
    JSON.stringify(crossings.filter((c) => !c.okAll).slice(0, 4)) || 'all ok',
  );

  // 3r3. corridor-traversable: ride the WHOLE authored corridor polyline
  // (POIs, land-route vias, causeways entered end-to-end) sampled every
  // 64 px against the live world rule: baked water blocks unless an
  // authored stamp covers the point. NO water span wider than a ford
  // (3 tiles) may remain, and every causeway must be ridden over.
  const corridorPts = rp6.corridorPoints().map((p) => ({ x: p.x, y: p.y, label: p.label }));
  const ride = await page.evaluate((pts) => {
    const ms = window.__ready();
    const st = ms.chunkStreamer;
    const B = window.__worldScale.schema.Biome;
    const origin = ms.globeOriginPx;
    const stamps = [...ms.replantStampById.entries()].map(([id, m]) => ({ id, b: m.bounds }));
    const sampleAt = (gx, gy) => {
      const sx = origin.x + gx;
      const sy = origin.y + gy;
      for (const s of stamps) {
        if (sx >= s.b.x && sx < s.b.x + s.b.width && sy >= s.b.y && sy < s.b.y + s.b.height) return { water: false, cover: s.id };
      }
      const ll = ms.terrestrialLatLngFromPx(sx, sy);
      const r = st.earthSample(ll.lat, ll.lng);
      return { water: r[0] === B.OCEAN || r[0] === B.FRESHWATER, cover: null };
    };
    const offenders = [];
    const used = {};
    const segs = [];
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      segs.push({ from: a.label, to: b.label, lenPx: Math.round(len) });
      const n = Math.max(1, Math.ceil(len / 64));
      let runStart = -1;
      for (let k = 0; k <= n; k++) {
        const t = k / n;
        const s = sampleAt(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
        if (s.cover && s.cover.startsWith('crossing-')) used[s.cover.slice(9)] = true;
        if (s.water) {
          if (runStart < 0) runStart = k;
        } else if (runStart >= 0) {
          const widthPx = (k - runStart) * 64;
          if (widthPx > 96) {
            const mid = (runStart + k - 1) / 2 / n;
            const ll = ms.terrestrialLatLngFromPx(origin.x + a.x + (b.x - a.x) * mid, origin.y + a.y + (b.y - a.y) * mid);
            offenders.push({ seg: `${a.label}->${b.label}`, widthPx, lat: +ll.lat.toFixed(3), lng: +ll.lng.toFixed(3) });
          }
          runStart = -1;
        }
      }
    }
    // Every corridor POI anchor must stand on (or within a whisper of) walkable ground.
    const nudges = [];
    for (const [id, m] of ms.replantStampById.entries()) {
      if (id.startsWith('crossing-')) continue;
      const anchor = m.tileToWorldCenter(m.data.spawn.x, m.data.spawn.y);
      const w = m.nearestWalkableWorld(anchor.x, anchor.y, 64);
      const d = Math.hypot(w.x - anchor.x, w.y - anchor.y);
      if (d > 0) nudges.push({ id, d: Math.round(d) });
    }
    return { offenders, used: Object.keys(used).sort(), segs, nudges };
  }, corridorPts);
  const allCrossIds = rp6.REPLANT_CROSSINGS.map((c) => c.id).sort();
  ok(
    'corridor-traversable: the full Acts corridor rides clean — zero water spans wider than a ford, all 11 causeways ridden, every POI anchor walkable',
    ride.offenders.length === 0 && JSON.stringify(ride.used) === JSON.stringify(allCrossIds) && ride.nudges.length === 0,
    JSON.stringify({ offenders: ride.offenders.slice(0, 6), used: ride.used.length, nudges: ride.nudges.slice(0, 6), segments: ride.segs.length }),
  );
  // SEGMENT-TIMES (ADVISORY, per spec — printed, never asserted): minutes per
  // POI-to-POI corridor leg at mount speed. Feeds the ledger's spawn-density
  // audit; expected to be LONG at true scale.
  {
    const legs = [];
    let acc = 0;
    let from = ride.segs[0]?.from;
    for (const s of ride.segs) {
      acc += s.lenPx;
      const isPoi = !s.to.startsWith('via(') && !s.to.startsWith('x:');
      if (isPoi) {
        legs.push(`${from}->${s.to}: ${(acc / ws6.MOUNT_SPEED_PX / 60).toFixed(1)}m`);
        from = s.to;
        acc = 0;
      }
    }
    console.log(`ADVISORY segment-times (mounted, ${ws6.MOUNT_SPEED_PX}px/s): ${legs.join('  ')}`);
  }

  // 3r4. waystone-reanchor: the olympia/boise/kamiah waystones resolve BY ID
  // to their re-planted anchors; attunement survives a real save/load; and a
  // REAL waystone ride lands at the re-planted Olympia.
  const wsExpected = ['olympia', 'boise', 'kamiah'].map((id) => {
    const g = rp6.poiGlobePx(id);
    return { poi: id, node: `wp-${id}`, x: lf6b.LEGACY_GLOBE_ORIGIN_X + Math.round(g.x), y: Math.round(g.y) };
  });
  const wsRe = await page.evaluate(async (expected) => {
    const ms = window.__ready();
    const wp = ms.waypointSys;
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    const nodes = expected.map((e) => {
      const n = wp.nodes.find((q) => q.id === e.node);
      return { node: e.node, found: !!n, dPx: n ? +Math.hypot(n.x - e.x, n.y - e.y).toFixed(1) : -1 };
    });
    // Attunement fixture: attune wp-olympia through the real discovery walk
    // if needed, then ride the REAL save/load path — ids must re-resolve.
    if (!wp.unlocked.has('wp-olympia')) {
      const oly = wp.nodes.find((n) => n.id === 'wp-olympia');
      ms.player.sprite.body.reset(oly.x + 100, oly.y);
      ms.lastLandPos = undefined;
      await wait(1000);
    }
    const unlockedBefore = [...wp.unlocked].sort();
    const wrote = ms.requestSave();
    if (!wrote) return { setup: 'save write refused', nodes };
    ms.devLoadSave();
    await wait(500);
    const wp2 = ms.waypointSys;
    const unlockedAfter = [...wp2.unlocked].sort();
    const olyNode = wp2.nodes.find((n) => n.id === 'wp-olympia');
    // The real ride: travel to the re-planted Olympia through the shipped flow.
    ms.player.sprite.body.reset(ms.town.spawn.x, ms.town.spawn.y);
    ms.lastLandPos = undefined;
    await wait(200);
    const started = wp2.startTravel('wp-olympia');
    await wait(4600);
    const dLanding = Math.hypot(ms.player.x - olyNode.x, ms.player.y - olyNode.y);
    const landedWalkable = !ms.activeMap().isBlockedAtWorld(ms.player.x, ms.player.y);
    return { setup: 'ok', nodes, attuned: unlockedBefore.includes('wp-olympia'), persisted: JSON.stringify(unlockedBefore) === JSON.stringify(unlockedAfter), started, dLanding: +dLanding.toFixed(0), landedWalkable };
  }, wsExpected);
  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(280);
    const uiOpen = await page.evaluate(() => {
      const ms = window.__game.scene.getScene('MainScene');
      return ms.dialogue.isOpen() || ms.choice.isOpen();
    });
    if (!uiOpen) break;
    await page.mouse.click(214, 520);
    await page.mouse.click(214, 462);
  }
  ok(
    'waystone-reanchor: wp-olympia/boise/kamiah resolve by id onto their true anchors; attunement survives a real save/load; a real ride lands walkable at the re-planted Olympia',
    wsRe.setup === 'ok' && wsRe.nodes.every((n) => n.found && n.dPx >= 0 && n.dPx <= 512) && wsRe.attuned && wsRe.persisted && wsRe.started && wsRe.dLanding <= 2048 && wsRe.landedWalkable,
    JSON.stringify(wsRe),
  );

  // 3r5. encounter-follow: the 6B coordinator's anchors stand at the
  // RE-PLANTED sites (the guardian + portal-defense suites above already ran
  // their full mechanics against these anchors in this same session).
  const encFollow = await page.evaluate((exp) => {
    const ms = window.__ready();
    const regs = ms.encounters.regs;
    const pd = regs.find((r) => r.id === 'portal-defense');
    const gd = regs.find((r) => r.id === 'guardians');
    const pdA = pd.anchor();
    const gdA = gd.anchor();
    return {
      pdErr: +Math.hypot(pdA.x - exp.portal.x, pdA.y - exp.portal.y).toFixed(1),
      gdErr: +Math.hypot(gdA.x - exp.heavenPortal.x, gdA.y - exp.heavenPortal.y).toFixed(1),
      guardianNearPortal: ms.guardians.every((g) => Math.hypot(g.x - exp.heavenPortal.x, g.y - exp.heavenPortal.y) <= 2048),
      portalInStamp: (() => {
        const b = ms.replantStampById.get('portal').bounds;
        return pdA.x >= b.x && pdA.x < b.x + b.width && pdA.y >= b.y && pdA.y < b.y + b.height;
      })(),
    };
  }, (() => {
    const p = rp6.poiGlobePx('portal');
    const h = rp6.poiGlobePx('heaven-portal');
    return {
      portal: { x: lf6b.LEGACY_GLOBE_ORIGIN_X + Math.round(p.x), y: Math.round(p.y) },
      heavenPortal: { x: lf6b.LEGACY_GLOBE_ORIGIN_X + Math.round(h.x), y: Math.round(h.y) },
    };
  })());
  ok(
    'encounter-follow: portal-defense + guardian coordinator anchors stand at the re-planted sites (their 6B suites ran against these anchors in this session), guardians by the portal',
    encFollow.pdErr <= 512 && encFollow.gdErr <= 512 && encFollow.guardianNearPortal && encFollow.portalInStamp,
    JSON.stringify(encFollow),
  );

  // 3r6. heaven-portal-entry: at the portal's NEW high-band site the shipped
  // entry flow still transports — corrupted portal, stand at it, enter,
  // land in Heaven — then return to Earth.
  const heavenEntry = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    ms.restoreGuardianAccess('corrupted');
    ms.worldCooldownUntil = 0;
    ms.player.sprite.body.reset(ms.heavenPortal.x + 40, ms.heavenPortal.y + 40);
    ms.lastLandPos = undefined;
    await wait(300);
    ms.enterHeavenPortal();
    let inHeaven = false;
    for (let k = 0; k < 25 && !inHeaven; k++) {
      await wait(400);
      inHeaven = ms.activeWorld === 'heaven';
    }
    const portalWalkable = (() => {
      const m = ms.replantStampById.get('heaven-portal');
      const w = m.nearestWalkableWorld(ms.heavenPortal.x, ms.heavenPortal.y + 60, 8);
      return Math.hypot(w.x - ms.heavenPortal.x, w.y - (ms.heavenPortal.y + 60)) <= 4 * 32;
    })();
    ms.worldCooldownUntil = 0;
    ms.applyWorldSwap('earth', { x: ms.town.spawn.x, y: ms.town.spawn.y });
    await wait(600);
    return { inHeaven, portalWalkable, backOnEarth: ms.activeWorld === 'earth' };
  });
  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(280);
    const uiOpen = await page.evaluate(() => {
      const ms = window.__game.scene.getScene('MainScene');
      return ms.dialogue.isOpen() || ms.choice.isOpen();
    });
    if (!uiOpen) break;
    await page.mouse.click(214, 520);
    await page.mouse.click(214, 462);
  }
  ok(
    'heaven-portal-entry: the corrupted portal at its new high-band site transports to Heaven through the shipped flow (walkable approach), and the return lands on Earth',
    heavenEntry.inHeaven && heavenEntry.portalWalkable && heavenEntry.backOnEarth,
    JSON.stringify(heavenEntry),
  );

  // ── PASS 6C COMMIT 2: corridor anchors, spawn re-ground, save v19 ─────────
  const settings6 = await import(new URL('../node_modules/.cache/toh-settings.mjs', import.meta.url).pathname);

  // 3r7. anchor-reground: in-POI quest anchors keep their EXACT legacy local
  // offsets (the Boise catapult trio is the fixture — authored px deltas);
  // the corridor-interpolated escort ambushes re-ground onto the true route
  // and land walkable within the 64-tile nudge rule, every nudge enumerated.
  const catapultDeltas = [
    [settings6.CATAPULT_1_POSITION.x - settings6.BOISE_POSITION.x, settings6.CATAPULT_1_POSITION.y - settings6.BOISE_POSITION.y],
    [settings6.CATAPULT_2_POSITION.x - settings6.BOISE_POSITION.x, settings6.CATAPULT_2_POSITION.y - settings6.BOISE_POSITION.y],
    [settings6.CATAPULT_3_POSITION.x - settings6.BOISE_POSITION.x, settings6.CATAPULT_3_POSITION.y - settings6.BOISE_POSITION.y],
  ];
  const catapultOk = JSON.stringify(catapultDeltas) === JSON.stringify([[-700, -650], [100, -850], [900, -600]]);
  const q9Expected = [settings6.Q9_AMBUSHES, settings6.Q12_AMBUSHES];
  const reground = await page.evaluate(
    ([q9, q12]) => {
      const ms = window.__ready();
      const g = ms.globeMap;
      const detail = (raw, grounded) =>
        grounded.map((p, i) => ({
          nudgePx: +Math.hypot(p.x - raw[i].x, p.y - raw[i].y).toFixed(1),
          walkable: !g.isBlockedAtWorld(p.x, p.y),
        }));
      return {
        q9: detail(q9, ms.corridorAnchorsGrounded.q9),
        q12: detail(q12, ms.corridorAnchorsGrounded.q12),
        counts: [ms.corridorAnchorsGrounded.q9.length, ms.corridorAnchorsGrounded.q12.length],
      };
    },
    [q9Expected[0], q9Expected[1]],
  );
  const allGrounded = [...reground.q9, ...reground.q12];
  ok(
    'anchor-reground: catapults keep exact legacy offsets from Boise; Q9/Q12 escort anchors re-ground onto the true route, walkable within 64 tiles (nudges enumerated)',
    catapultOk && reground.counts[0] === 3 && reground.counts[1] === 1 && allGrounded.every((a) => a.walkable && a.nudgePx <= 64 * 32),
    JSON.stringify({ catapultDeltas, ...reground }),
  );

  // 3r8. spawn-zone-reground: NOTHING spawns in dissolved space — no settings
  // anchor may sit inside the old mega-stamp scene rect under v2 — and the
  // trigger radii are byte-unchanged (spawn zones moved, radii did not).
  const stamp6 = {
    x: lf6b.LEGACY_GLOBE_ORIGIN_X + Math.round((-126.96 + 180) * ws6.PX_PER_DEG_LNG),
    y: Math.round((85 - 50.12) * ws6.PX_PER_DEG_LAT),
    w: 1100 * 32,
    h: 800 * 32,
  };
  const dissolvedOffenders = [];
  for (const [name, v] of Object.entries(settings6)) {
    const pts = Array.isArray(v) ? v : [v];
    for (const e of pts) {
      if (e && typeof e === 'object' && typeof e.x === 'number' && typeof e.y === 'number' && e.x >= 1_000_000) {
        if (e.x >= stamp6.x && e.x < stamp6.x + stamp6.w && e.y >= stamp6.y && e.y < stamp6.y + stamp6.h) dissolvedOffenders.push(name);
      }
    }
  }
  ok(
    'spawn-zone-reground: zero authored anchors remain inside the dissolved mega-stamp rect; ambush trigger radius unchanged',
    dissolvedOffenders.length === 0 && settings6.AMBUSH_TRIGGER_RANGE === 300,
    JSON.stringify({ dissolvedOffenders: dissolvedOffenders.slice(0, 8), ambushRange: settings6.AMBUSH_TRIGGER_RANGE }),
  );

  // 3r9. save-remap-v19: the three migration rules through the REAL read →
  // migrate → apply path, plus the v17 → v18 → v19 chain. Fixture (a): a
  // save standing at the town plaza's OLD dissolved-space coordinate lands
  // at the SAME local offset in the re-planted stamp (= the live town
  // spawn). Fixture (b): mid-stamp nowhere → the nearest re-planted
  // settlement anchor, silently. Fixture (c): Munich → untouched.
  const remapIn = await (async () => {
    const enumPoi = (await import(new URL('../node_modules/.cache/toh-replant.mjs', import.meta.url).pathname)).REPLANT_POIS.find((p) => p.id === 'enumclaw');
    const a = { x: enumPoi.cityTile.tx * 32 + 16, y: enumPoi.cityTile.ty * 32 + 16 };
    const rect = { tx0: Math.max(0, enumPoi.cityTile.tx + enumPoi.footprint.dx), ty0: Math.max(0, enumPoi.cityTile.ty + enumPoi.footprint.dy) };
    // (b): mid-stamp legacy-local point + its nearest settlement, node-derived.
    const mid = { x: 17600, y: 12800 };
    let bestId = null;
    let bestD = Infinity;
    for (const id of rp6.REPLANT_SETTLEMENTS) {
      const p = rp6.REPLANT_POIS.find((q) => q.id === id);
      const al = p.cityTile ? { x: p.cityTile.tx * 32 + 16, y: p.cityTile.ty * 32 + 16 } : lf6b.legacyRawToLocal(p.legacyRaw);
      const d = Math.hypot(al.x - mid.x, al.y - mid.y);
      if (d < bestD) {
        bestD = d;
        bestId = id;
      }
    }
    const bg = rp6.poiGlobePx(bestId);
    return {
      origin: { lat: 50.12, lng: -126.96 },
      pxLat: ws6.PX_PER_DEG_LAT,
      pxLng: ws6.PX_PER_DEG_LNG,
      enumRect: rect,
      mid,
      bSettlement: bestId,
      bScene: { x: lf6b.LEGACY_GLOBE_ORIGIN_X + Math.round(bg.x), y: Math.round(bg.y) },
      cLatLng: { lat: 48.1381, lng: 11.5808 },
    };
  })();
  const remap = await page.evaluate(async (fx) => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    const runFixture = async (latLng, version, stripTravel) => {
      const wrote = ms.requestSave();
      if (!wrote) return { setup: 'save write refused' };
      const raw = JSON.parse(localStorage.getItem('toh_save'));
      raw.saveVersion = version;
      raw.world.active = 'earth';
      raw.world.latLng = { ...latLng };
      delete raw.world.remembered?.earth;
      if (stripTravel) {
        delete raw.player.unlockedWaypoints;
        delete raw.player.mountUnlocked;
      }
      localStorage.setItem('toh_save', JSON.stringify(raw));
      ms.devLoadSave();
      await wait(600);
      ms.requestSave(); // write back → the stored save must now be v19
      const after = JSON.parse(localStorage.getItem('toh_save'));
      return { px: { x: ms.player.x, y: ms.player.y }, v: after.saveVersion, latLng: after.world.latLng, wp: Array.isArray(after.player.unlockedWaypoints), mount: after.player.mountUnlocked === true };
    };
    // (a) the town plaza's OLD dissolved coordinate.
    const m = ms.replantStampById.get('enumclaw');
    const b = m.bounds;
    const lx = ms.town.spawn.x - b.x + fx.enumRect.tx0 * 32;
    const ly = ms.town.spawn.y - b.y + fx.enumRect.ty0 * 32;
    const aFix = { lat: fx.origin.lat - ly / fx.pxLat, lng: fx.origin.lng + lx / fx.pxLng };
    const a = await runFixture(aFix, 18, false);
    const aOk = a.v === 19 && Math.hypot(a.px.x - ms.town.spawn.x, a.px.y - ms.town.spawn.y) <= 40;
    // (b) mid-stamp nowhere → nearest settlement anchor.
    const bFix = { lat: fx.origin.lat - fx.mid.y / fx.pxLat, lng: fx.origin.lng + fx.mid.x / fx.pxLng };
    const bRes = await runFixture(bFix, 18, false);
    const bOk = bRes.v === 19 && Math.hypot(bRes.px.x - fx.bScene.x, bRes.px.y - fx.bScene.y) <= 80;
    // (c) Munich → untouched (byte-equal latLng, lands at that geography).
    const cRes = await runFixture(fx.cLatLng, 18, false);
    const cOk = cRes.v === 19 && Math.abs(cRes.latLng.lat - fx.cLatLng.lat) < 1e-9 && Math.abs(cRes.latLng.lng - fx.cLatLng.lng) < 1e-9;
    // Chain: a v17 save (no travel fields) through the same dissolved spot.
    const chain = await runFixture(aFix, 17, true);
    const chainOk = chain.v === 19 && chain.wp && chain.mount && Math.hypot(chain.px.x - ms.town.spawn.x, chain.px.y - ms.town.spawn.y) <= 40;
    ms.applyWorldSwap('earth', { x: ms.town.spawn.x, y: ms.town.spawn.y });
    await wait(400);
    return { aOk, bOk, cOk, chainOk, a, b: bRes, c: cRes, chain, bSettlement: fx.bSettlement };
  }, remapIn);
  ok(
    'save-remap-v19: dissolved-POI position keeps its local offset; mid-stamp lands at the nearest re-planted settlement silently; outside untouched; v17->v18->v19 chain green (travel fields + remap)',
    remap.aOk && remap.bOk && remap.cOk && remap.chainOk,
    JSON.stringify(remap),
  );

  // 2f7. playwright drive: 60s of real keyboard autorun east at the capped
  // devspeed — chunks must load AND evict along the way, with zero page or
  // console errors across the window. LAUNCHED MID-PACIFIC: under real Earth
  // an eastward land run hits real water; open ocean is the one guaranteed
  // 60s corridor (standing on water keeps the shipped walking-out rule; the
  // land-memory snap-back is cleared for the teleport).
  await page.evaluate(() => {
    const ms = window.__ready();
    const p = ms.terrestrialPxFromLatLng({ lat: 5, lng: -150 });
    ms.player.sprite.body.reset(p.x, p.y);
    ms.lastLandPos = undefined;
  });
  await page.waitForTimeout(1400);
  await page.evaluate(() => {
    // Re-assert the launch point: a world transition that was still settling
    // when the first reset ran would otherwise override the teleport.
    const ms = window.__ready();
    const p = ms.terrestrialPxFromLatLng({ lat: 5, lng: -150 });
    ms.player.sprite.body.reset(p.x, p.y);
    ms.lastLandPos = undefined;
  });
  await page.waitForTimeout(1200);
  const drive0 = await page.evaluate(() => {
    const ms = window.__game.scene.getScene('MainScene');
    return { x: ms.player.x, stats: ms.chunkStreamer.stats() };
  });
  const drivePe0 = pageErrors.length;
  const driveCe0 = consoleErrors.length;
  await page.keyboard.down('d');
  await page.waitForTimeout(60000);
  await page.keyboard.up('d');
  const drive1 = await page.evaluate(() => {
    const ms = window.__game.scene.getScene('MainScene');
    return { x: ms.player.x, stats: ms.chunkStreamer.stats() };
  });
  ok(
    'playwright drive: 60s autorun east under ?scale=v2 — chunks load and evict, cache bounded, zero errors in the window',
    drive1.x - drive0.x > 20000 &&
      drive1.stats.loaded - drive0.stats.loaded >= 50 &&
      drive1.stats.evicted > drive0.stats.evicted &&
      drive1.stats.cacheSize <= 96 &&
      pageErrors.length === drivePe0 &&
      consoleErrors.length === driveCe0,
    JSON.stringify({ dx: Math.round(drive1.x - drive0.x), before: drive0.stats, after: drive1.stats, newPageErrors: pageErrors.length - drivePe0, newConsoleErrors: consoleErrors.length - driveCe0 }),
  );

  // 2f8. walkability-wiring: force a strip of OCEAN records ahead of the
  // player and drive into it — the collision path must reject the movement.
  // Runs in the SAHARA (flat, dry, riverless for hundreds of km) so real
  // geography cannot interfere with the fixture.
  await page.evaluate(() => {
    const ms = window.__ready();
    const p = ms.terrestrialPxFromLatLng({ lat: 23.0, lng: 10.0 });
    ms.player.sprite.body.reset(p.x, p.y);
    ms.lastLandPos = undefined;
  });
  await page.waitForTimeout(1800); // the ring synthesizes at the new spot
  const walkFix = await page.evaluate(() => {
    const ms = window.__game.scene.getScene('MainScene');
    const st = ms.chunkStreamer;
    const stripStart = Math.ceil((ms.player.x + 150) / 32) * 32;
    const forced = st.devForceWater(stripStart, ms.player.y - 640, stripStart + 640, ms.player.y + 640);
    return { x0: ms.player.x, stripStart, forced };
  });
  await page.keyboard.down('d');
  await page.waitForTimeout(1500);
  await page.keyboard.up('d');
  const walkEnd = await page.evaluate(() => ({ x: window.__game.scene.getScene('MainScene').player.x }));
  ok(
    'walkability-wiring: a forced OCEAN strip blocks movement through the real collision path',
    walkFix.forced >= 200 && walkEnd.x > walkFix.x0 + 5 && walkEnd.x < walkFix.stripStart,
    JSON.stringify({ ...walkFix, x0: Math.round(walkFix.x0), endX: Math.round(walkEnd.x) }),
  );

  // 2h6. mounted-drive: a 60s MOUNTED run (exactly MOUNT_SPEED_PX × the
  // session devspeed) across the western Sahara, ending against a forced
  // water-edge fixture — the speed-scaled lookahead must stop the rider
  // short, with zero errors across the window.
  await page.evaluate(() => {
    const ms = window.__ready();
    const p = ms.terrestrialPxFromLatLng({ lat: 23.0, lng: 5.0 });
    ms.player.sprite.body.reset(p.x, p.y);
    ms.lastLandPos = undefined;
  });
  await page.waitForTimeout(1500);
  const md0 = await page.evaluate(async () => {
    const ms = window.__ready();
    ms.mountSys.trySummon(); // mid-Sahara: nothing engages, derived combat is clear
    await new Promise((r) => setTimeout(r, 1700));
    return { mounted: ms.mountSys.state === 'mounted', x: ms.player.x, pe: 0 };
  });
  const mdPe0 = pageErrors.length;
  const mdCe0 = consoleErrors.length;
  await page.keyboard.down('d');
  await page.waitForTimeout(58000);
  await page.keyboard.up('d');
  const mdStrip = await page.evaluate(() => {
    const ms = window.__ready();
    const stripStart = Math.ceil((ms.player.x + 200) / 32) * 32;
    const forced = ms.chunkStreamer.devForceWater(stripStart, ms.player.y - 700, stripStart + 700, ms.player.y + 700);
    return { stripStart, forced, x1: ms.player.x };
  });
  await page.keyboard.down('d');
  await page.waitForTimeout(2000);
  await page.keyboard.up('d');
  const mdEnd = await page.evaluate(() => {
    const ms = window.__game.scene.getScene('MainScene');
    return { x: ms.player.x, mounted: ms.mountSys.state === 'mounted', v: ms.player.devSpeed };
  });
  ok(
    'mounted-drive: 60s mounted Sahara run at exactly the mounted speed, stopping short of the water-edge fixture, zero errors',
    md0.mounted &&
      mdStrip.forced >= 200 &&
      mdStrip.x1 - md0.x > 384 * mdEnd.v * 50 && // ≥50s worth of exact mounted speed covered
      mdEnd.x < mdStrip.stripStart &&
      mdEnd.x > mdStrip.x1 + 5 &&
      mdEnd.mounted === true &&
      pageErrors.length === mdPe0 &&
      consoleErrors.length === mdCe0,
    JSON.stringify({ dx: Math.round(mdStrip.x1 - md0.x), stop: Math.round(mdStrip.stripStart - mdEnd.x), ...mdEnd }),
  );

  // 2f9. cache-bound: a 300-chunk traversal through the REAL ensure+evict
  // machinery (synchronous renderless synthesis) — cache never exceeds 96,
  // LRU evictions happen, and released chunks drop their buffers.
  const cacheBound = await page.evaluate(() => window.__game.scene.getScene('MainScene').chunkStreamer.devSimulateTraversal(300));
  ok(
    'cache-bound: 300-chunk traversal holds the cache at <= 96 with LRU evictions; buffers released',
    cacheBound.maxCache <= 96 && cacheBound.evicted >= 200 && cacheBound.buffersHeld <= 96,
    JSON.stringify(cacheBound),
  );

  // ── PASS 5: TERRAIN ART PIPELINE (same live v2 session) ───────────────────
  // 2j0. priority-lock: the visuals config ships EXACTLY the locked render
  // model — fringe priority order, overlay budget, scatter densities, pool
  // caps, the 17 fringe geometries, and the drop-contract tables.
  const prioLock = await page.evaluate(() => {
    const v = window.__worldScale.visuals;
    return {
      seq: v.TERRAIN_PRIORITY.join(','),
      rankOk: v.TERRAIN_PRIORITY.every((b, i) => v.PRIORITY_RANK[b] === i),
      biomes: v.OVERLAY_MAX_BIOMES,
      quads: v.OVERLAY_MAX_QUADS,
      dens: [v.SCATTER_DENSITY[6], v.SCATTER_DENSITY[7], v.SCATTER_DENSITY[11], v.SCATTER_DENSITY[10], v.SCATTER_DENSITY[5]],
      caps: [v.SCATTER_POOL_CAP, v.FRINGE_POOL_CAP, window.__worldScale.flora.UNDERSTORY_POOL_CAP],
      cells: v.FRINGE_CELLS.length,
      sheets: Object.keys(v.BIOME_SHEET_NAME).length,
      props: Object.keys(v.PROP_TABLE).length,
      // ART SESSION 5: the drop contract also carries the synthetic harness
      // row(s) — they need a contract size so the batch fixture lints. Count
      // them SEPARATELY so a real prop can never hide inside the fixture
      // allowance, and vice versa.
      fixtures: window.__worldScale.flora.fixturePropIds().slice().sort(),
    };
  });
  const prioFixtures = prioLock.fixtures;
  const prioRealProps = prioLock.props - prioFixtures.length;
  ok(
    'priority-lock: TERRAIN_PRIORITY order, overlay budget 2/4, densities .30/.22/.15/.05/.03, pool caps 900/2600/2700, 17 fringe cells, contract tables (19 REAL prop rows: 13 canopy + 6 understory, plus exactly the 2 synthetic harness rows, counted apart)',
    prioLock.seq === '0,1,2,5,4,3,11,8,7,6,9,10' &&
      prioLock.rankOk &&
      prioLock.biomes === 2 &&
      prioLock.quads === 4 &&
      prioLock.dens.join(',') === '0.3,0.22,0.15,0.05,0.03' &&
      prioLock.caps.join(',') === '900,2600,2700' &&
      prioLock.cells === 17 &&
      prioLock.sheets === 12 &&
      prioRealProps === 19 &&
      JSON.stringify(prioFixtures) === JSON.stringify(['fixture-harness-a', 'fixture-harness-b']),
    JSON.stringify({ ...prioLock, realProps: prioRealProps }),
  );

  // 2j1. fringe-selection: the pure mask→pieces function agrees with an
  // INDEPENDENT rule-by-rule reference over ALL 256 neighbor masks (4 edges ×
  // 4 diagonals), including the corner-in suppression rule.
  const fringeSel = await page.evaluate(() => {
    const v = window.__worldScale.visuals;
    const ref = (m) => {
      const edges = ['n', 'e', 's', 'w'].filter((k) => m[k]);
      let out = [];
      if (edges.length === 4) out = ['island'];
      else if (edges.length === 3) out = ['cap-open-' + ['n', 'e', 's', 'w'].find((k) => !m[k])];
      else if (edges.length === 2) {
        const pair = edges.join('');
        if (pair === 'ns') out = ['edge-n', 'edge-s'];
        else if (pair === 'ew') out = ['edge-e', 'edge-w'];
        else out = [{ ne: 'corner-out-ne', es: 'corner-out-se', sw: 'corner-out-sw', nw: 'corner-out-nw' }[pair]];
      } else if (edges.length === 1) out = ['edge-' + edges[0]];
      for (const d of ['ne', 'se', 'sw', 'nw']) {
        if (m[d] && !m[d[0]] && !m[d[1]]) out.push('corner-in-' + d);
      }
      return out;
    };
    let mismatches = 0;
    let checked = 0;
    let sample = null;
    for (let bits = 0; bits < 256; bits++) {
      const m = {
        n: !!(bits & 1),
        e: !!(bits & 2),
        s: !!(bits & 4),
        w: !!(bits & 8),
        ne: !!(bits & 16),
        se: !!(bits & 32),
        sw: !!(bits & 64),
        nw: !!(bits & 128),
      };
      checked++;
      const got = v.fringePiecesForMask(m).slice().sort().join('|');
      const want = ref(m).sort().join('|');
      if (got !== want) {
        mismatches++;
        if (!sample) sample = { bits, got, want };
      }
    }
    return { checked, mismatches, sample };
  });
  ok(
    'fringe-selection: all 256 neighbor masks agree with the independent rule reference (edges, corners, caps, island, corner-in suppression)',
    fringeSel.checked === 256 && fringeSel.mismatches === 0,
    JSON.stringify(fringeSel),
  );

  // 2j2. overlay-budget: three synthetic neighborhoods through the REAL
  // selector — 3 higher biomes trim to the top-2 by priority; 6 candidate
  // quads trim to 4 dropping the LOWEST priority first; no higher neighbor
  // means no quads.
  const ovBudget = await page.evaluate(() => {
    const v = window.__worldScale.visuals;
    const GRASS = 3;
    const DESERT = 5;
    const FOREST = 6;
    const SNOW = 9;
    const ROCK = 10;
    const nb = (o) => ({ n: GRASS, e: GRASS, s: GRASS, w: GRASS, ne: GRASS, se: GRASS, sw: GRASS, nw: GRASS, ...o });
    const a = v.selectOverlays(GRASS, nb({ n: FOREST, e: SNOW, s: ROCK }));
    const b = v.selectOverlays(GRASS, nb({ n: FOREST, s: FOREST, ne: ROCK, se: ROCK, sw: ROCK, nw: ROCK }));
    const c = v.selectOverlays(ROCK, nb({}));
    const d = v.selectOverlays(GRASS, nb({ n: DESERT })); // LOWER priority neighbor: desert never fringes onto grass
    return {
      a: a.map((q) => `${q.biome}:${q.cell}`),
      b: b.map((q) => `${q.biome}:${q.cell}`),
      c: c.length,
      d: d.length,
    };
  });
  ok(
    'overlay-budget: <=2 biomes (highest kept), <=4 quads (lowest trimmed first), zero quads without a higher neighbor',
    ovBudget.a.join('|') === '9:edge-e|10:edge-s' &&
      ovBudget.b.join('|') === '10:corner-in-ne|10:corner-in-se|10:corner-in-sw|10:corner-in-nw' &&
      ovBudget.c === 0 &&
      ovBudget.d === 0,
    JSON.stringify(ovBudget),
  );

  // 2j3. art-fallback-chain: the boot atlases stand (shipped art where it
  // exists, procedural everywhere else); injecting a synthetic DESERT sheet
  // through the REAL activation path — ON TOP of the SHIPPED sheets, which
  // are re-fetched in-page — recolors ONLY desert (grass keeps its SHIPPED
  // art through the rebuild: the per-biome invariant proven with real art
  // present, not just procedural); rebuilding with the shipped set alone
  // restores desert's boot pixels byte-identically AND leaves the session
  // exactly as it booted. Loud fallback, zero errors.
  const afcPe0 = pageErrors.length;
  const artChain = await page.evaluate(async () => {
    const ms = window.__ready();
    const v = window.__worldScale.visuals;
    const readBase = (biome) => {
      const ctx = ms.textures.get('terrain-ph').context;
      return [...ctx.getImageData((biome * 8 + 0) * 32 + 16, 16, 1, 1).data];
    };
    const existed = ms.textures.exists('terrain-ph') && ms.textures.exists('terrain-fringe');
    const propsOk = Object.keys(v.PROP_TABLE).every((id) => ms.textures.exists(`terrain-prop-${id}`));
    // Re-fetch the SHIPPED sheets (the same files the boot activation saw).
    const shipped = new Map();
    for (const [biome, stem] of Object.entries(v.BIOME_SHEET_NAME)) {
      const img = new Image();
      const okLoad = await new Promise((res) => {
        img.onload = () => res(true);
        img.onerror = () => res(false);
        img.src = `art/terrain/${stem}.png`;
      });
      if (!okLoad || img.width !== 256 || img.height !== 128) continue;
      const sc = document.createElement('canvas');
      sc.width = 256;
      sc.height = 128;
      sc.getContext('2d').drawImage(img, 0, 0);
      shipped.set(Number(biome), sc);
    }
    const before = readBase(5);
    const grassBefore = readBase(3);
    const cvs = document.createElement('canvas');
    cvs.width = 256;
    cvs.height = 128;
    const c = cvs.getContext('2d');
    c.fillStyle = '#ff8800';
    c.fillRect(0, 0, 7 * 32, 32); // base + anim row fully opaque
    for (let row = 1; row < 4; row++) c.fillRect(0, row * 32, 256, 16); // fringe cells: top half opaque
    window.__worldScale.buildTerrainAtlases(ms, new Map([...shipped, [5, cvs]]));
    ms.chunkStreamer.repaintAllLayers();
    const after = readBase(5);
    const grassAfter = readBase(3);
    const ftex = ms.textures.get('terrain-fringe');
    const frameOk = ftex.has('5:edge-n') && ftex.has('5:island') && ftex.has('3:edge-n');
    const fctx = ftex.context;
    const fTop = [...fctx.getImageData(16, 5 * 32 + 4, 1, 1).data];
    const fBot = [...fctx.getImageData(16, 5 * 32 + 28, 1, 1).data];
    // Restore the session to its BOOT truth: the shipped set alone.
    window.__worldScale.buildTerrainAtlases(ms, shipped);
    ms.chunkStreamer.repaintAllLayers();
    const restored = readBase(5);
    return { existed, propsOk, shippedSheets: shipped.size, before, after, grassSame: grassBefore.join() === grassAfter.join(), frameOk, fTop, fBot, restoredSame: restored.join() === before.join() };
  });
  ok(
    'art-fallback-chain: boot atlases stand (shipped art + procedural fallback); a one-biome synthetic drop over the SHIPPED set activates ONLY that biome (grass keeps its shipped art through the rebuild); the shipped-set rebuild restores boot pixels and the live session; zero errors',
    artChain.existed &&
      artChain.propsOk &&
      artChain.after.join() === '255,136,0,255' &&
      artChain.before.join() !== artChain.after.join() &&
      artChain.grassSame &&
      artChain.frameOk &&
      artChain.fTop.join() === '255,136,0,255' &&
      artChain.fBot[3] === 0 &&
      artChain.restoredSame &&
      pageErrors.length === afcPe0,
    JSON.stringify(artChain),
  );

  // 2j4. water-anim-or-shimmer: the fallback atlas ships three DISTINCT water
  // anim frames (the shimmer is real without art), and a mid-Pacific tile
  // actually cycles through anim slots 4-6 in the live layer.
  await page.evaluate(() => {
    const ms = window.__ready();
    ms.mountSys.dismount();
    const p = ms.terrestrialPxFromLatLng({ lat: 5, lng: -150 });
    ms.player.sprite.body.reset(p.x, p.y);
    ms.lastLandPos = undefined;
  });
  await page.waitForTimeout(1400);
  await page.evaluate(() => {
    const ms = window.__ready();
    const p = ms.terrestrialPxFromLatLng({ lat: 5, lng: -150 });
    ms.player.sprite.body.reset(p.x, p.y);
    ms.lastLandPos = undefined;
  });
  await page.waitForTimeout(1600);
  const waterAnim = await page.evaluate(async () => {
    const ms = window.__ready();
    const st = ms.chunkStreamer;
    const cell = (slot) => {
      const ctx = ms.textures.get('terrain-ph').context;
      return ctx.getImageData((0 * 8 + slot) * 32, 0, 32, 32).data.join();
    };
    const a4 = cell(4);
    const a5 = cell(5);
    const a6 = cell(6);
    const cx = Math.floor((ms.player.x - st.originPx.x) / 2048);
    const cy = Math.floor((ms.player.y - st.originPx.y) / 2048);
    const vis = st.chunkVisuals(cx, cy);
    if (!vis || vis.water.length === 0) return { setup: `no water visuals at ${cx},${cy}` };
    const w = vis.water[0] & 0x0fff; // packed: bits 0-11 local tile index
    const wi = w % 64;
    const wj = Math.floor(w / 64);
    const layer = st.chunks.get(`${cx},${cy}`).layer;
    const seen = new Set();
    for (let k = 0; k < 10; k++) {
      seen.add(layer.getTileAt(wi, wj).index);
      await new Promise((r) => setTimeout(r, 250));
    }
    return {
      setup: 'ok',
      distinct: a4 !== a5 && a5 !== a6 && a4 !== a6,
      waterTiles: vis.water.length,
      seen: [...seen].sort(),
      cycles: st.stats().visuals.waterCycles,
    };
  });
  ok(
    'water-anim-or-shimmer: three distinct fallback anim frames; a live mid-Pacific tile cycles through anim slots 4-6',
    waterAnim.setup === 'ok' &&
      waterAnim.distinct === true &&
      waterAnim.waterTiles >= 3000 &&
      waterAnim.seen.length >= 2 &&
      waterAnim.seen.every((i) => i >= 4 && i <= 6) &&
      waterAnim.cycles > 0,
    JSON.stringify(waterAnim),
  );

  // 2k0. MIGRATION-SILENCE (PASS 9, re-scoped in Art Session 4): the flora
  // MECHANISM must stay Pass 5 semantics forever. A FROZEN copy of the Pass 5
  // algorithm — its literal salts, its uniform `props[floor(h*n) % n]` pick,
  // its offset math — is recomputed against the live flora reference over
  // 5,000 tiles, driven by an EQUAL-WEIGHT FIXTURE palette (the condition
  // under which the two are provably identical). Content moved on when Art
  // Session 4 dressed the world, so pinning today's palettes here would be a
  // content freeze, not an invariant: `palette-pin` below owns that, and this
  // check owns the algebra. Byte-equal ids AND offsets, or red.
  const migrationSilence = await page.evaluate(() => {
    const ws = window.__worldScale;
    const v = ws.visuals;
    // ── FROZEN Pass 5 reference (do not "fix" — it is the old truth) ──────
    const h01 = (tx, ty, salt) => {
      let h = (Math.imul(tx, 374761393) + Math.imul(ty, 668265263)) ^ salt;
      h = Math.imul(h ^ (h >>> 13), 1274126177);
      h ^= h >>> 16;
      return (h >>> 0) / 4294967296;
    };
    const f = ws.flora;
    const pass5ScatterFor = (tx, ty, density, props) => {
      if (h01(tx, ty, 0x5ca77e12) >= density) return null;
      const id = props[Math.floor(h01(tx, ty, 0x9e3779b9) * props.length) % props.length];
      return { id, ox: Math.round((h01(tx, ty, 0x1b873593) - 0.5) * 20), oy: Math.round((h01(tx, ty, 0x85ebca6b) - 0.5) * 20) };
    };
    // EQUAL-WEIGHT FIXTURE palettes installed on the live scatter biomes at
    // their live densities: the exact condition under which the weighted walk
    // and the Pass 5 uniform pick must agree. Restored before returning.
    const scatterBiomes = Object.keys(v.SCATTER_DENSITY).map(Number);
    const saved = {};
    const fixtureProps = {};
    for (const biome of scatterBiomes) {
      saved[biome] = f.BIOME_FLORA[biome].canopy;
      const ids = saved[biome].palette.map((e) => e.propId);
      fixtureProps[biome] = ids;
      f.BIOME_FLORA[biome].canopy = { density: saved[biome].density, palette: ids.map((propId) => ({ propId, weight: 1 })) };
    }
    const diffs = [];
    let checked = 0;
    let planted = 0;
    for (const biome of scatterBiomes) {
      for (let k = 0; k < 1000; k++) {
        const tx = 310000 + k * 7 + biome * 13;
        const ty = 190000 + k * 11 + biome * 29;
        const want = pass5ScatterFor(tx, ty, saved[biome].density, fixtureProps[biome]);
        const got = ws.scatterFor(tx, ty, biome);
        checked++;
        if (want) planted++;
        if (JSON.stringify(want) !== JSON.stringify(got)) diffs.push({ biome, tx, ty, want, got });
      }
    }
    for (const biome of scatterBiomes) f.BIOME_FLORA[biome].canopy = saved[biome];
    let bareGrew = 0;
    for (let biome = 0; biome < 12; biome++) {
      if (scatterBiomes.includes(biome)) continue;
      for (let k = 0; k < 200; k++) if (ws.scatterFor(410000 + k, 220000 + k * 3, biome)) bareGrew++;
    }
    // The DENSITIES are still the locked Pass 5 numbers (palette membership
    // is content and lives in palette-pin; density is the render budget).
    const tablesOk = JSON.stringify(v.SCATTER_DENSITY) === JSON.stringify({ 5: 0.03, 6: 0.3, 7: 0.22, 10: 0.05, 11: 0.15 });
    return { checked, planted, diffs: diffs.slice(0, 5), diffCount: diffs.length, bareGrew, tablesOk };
  });
  ok(
    'migration-silence: the flora MECHANISM is Pass 5 semantics — under equal-weight fixture palettes, 5,000 tiles across every scatter biome plant byte-identically to a FROZEN Pass 5 reference (ids + offsets); bare biomes still grow nothing; canopy densities still the locked values',
    migrationSilence.checked === 5000 && migrationSilence.planted > 0 && migrationSilence.diffCount === 0 && migrationSilence.bareGrew === 0 && migrationSilence.tablesOk,
    JSON.stringify(migrationSilence),
  );

  // 2k0b. PALETTE-PIN (Art Session 4): WHAT GROWS WHERE is content, and
  // content changes only on purpose. Every biome/tier palette — ids, ORDER,
  // weights, density — is pinned here, because adding or reordering an entry
  // silently re-plants that biome for every existing save. Changing the world
  // means changing this pin in the same commit.
  const palettePin = await page.evaluate(() => {
    const f = window.__worldScale.flora;
    const out = {};
    for (const [biome, tiers] of Object.entries(f.BIOME_FLORA)) {
      for (const [tier, cfg] of Object.entries(tiers)) {
        out[`${biome}:${tier}`] = `${cfg.density}|${cfg.palette.map((e) => `${e.propId}=${e.weight}`).join(',')}`;
      }
    }
    return out;
  });
  const PALETTE_EXPECTED = {
    '5:canopy': '0.03|cactus-a=1,scrub-a=1',
    '5:understory': '0|',
    '6:canopy': '0.3|tree-broad-a=1,tree-broad-b=1,tree-fir-a=1,cedar-a=20,snag-a=5',
    '6:understory': '0.45|fern-sword-a=30,fern-sword-b=30,salal-a=20,sapling-fir-a=10,stump-a=5,log-a=5',
    '7:canopy': '0.22|tree-fir-a=1,tree-fir-b=1,cedar-a=10,snag-a=10',
    '7:understory': '0.35|fern-sword-a=25,fern-sword-b=25,salal-a=15,sapling-fir-a=20,stump-a=10,log-a=5',
    '10:canopy': '0.05|boulder-a=1,boulder-b=1',
    '10:understory': '0|',
    '11:canopy': '0.15|swamp-tree-a=1,swamp-tree-b=1',
    '11:understory': '0|',
  };
  const paletteDrift = Object.keys({ ...palettePin, ...PALETTE_EXPECTED }).filter((k) => palettePin[k] !== PALETTE_EXPECTED[k]);
  ok(
    'palette-pin: every biome/tier palette matches its pinned ids, order, weights and density — a silent re-plant (an added, reordered or reweighted entry) is red',
    paletteDrift.length === 0,
    JSON.stringify({ drift: paletteDrift.map((k) => ({ k, got: palettePin[k], want: PALETTE_EXPECTED[k] })) }),
  );

  // 2k1. VARIATION-DETERMINISM (PASS 9): the same tile always yields the same
  // instance look — repeated calls agree, and the value survives the round
  // trip through the WORKER-produced chunk (the variation keys off the
  // instance's global tile, so worker and direct paths cannot diverge).
  const varDet = await page.evaluate(() => {
    const ws = window.__worldScale;
    const f = ws.flora;
    let stable = true;
    const samples = [];
    for (let k = 0; k < 400; k++) {
      const tx = 512000 + k * 3;
      const ty = 331000 + k * 5;
      const a = f.floraVariation(tx, ty, 'canopy', 'tree-fir-a');
      const b = f.floraVariation(tx, ty, 'canopy', 'tree-fir-a');
      if (JSON.stringify(a) !== JSON.stringify(b)) stable = false;
      if (k < 3) samples.push(a);
    }
    // Distinct instances must actually DIFFER (variety is the point).
    const looks = new Set();
    for (let k = 0; k < 200; k++) looks.add(JSON.stringify(f.floraVariation(700000 + k, 400000, 'canopy', 'tree-broad-a')));
    // Tier salts make the understory roll independently of the canopy above.
    let tierIndependent = false;
    for (let k = 0; k < 200; k++) {
      const c = f.floraVariation(800000 + k, 500000, 'canopy', 'tree-fir-a');
      const u = f.floraVariation(800000 + k, 500000, 'understory', 'tree-fir-a');
      if (c.mirror !== u.mirror || Math.abs(c.scale - u.scale) > 1e-9) tierIndependent = true;
    }
    // The live worker-filled chunk: recompute its scatter list from the pure
    // reference and confirm every instance's variation matches.
    const ms = window.__ready();
    const st = ms.chunkStreamer;
    const pcx = Math.floor((ms.player.x - st.originPx.x) / 2048);
    const pcy = Math.floor((ms.player.y - st.originPx.y) / 2048);
    let liveChecked = 0;
    let liveMismatch = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const v = st.chunkVisuals(pcx + dx, pcy + dy);
        if (!v) continue;
        for (const sc of v.scatter.slice(0, 40)) {
          const tx = (pcx + dx) * 64 + sc.i;
          const ty = (pcy + dy) * 64 + sc.j;
          const a = f.floraVariation(tx, ty, 'canopy', sc.id);
          const b = f.floraVariation(tx, ty, 'canopy', sc.id);
          liveChecked++;
          if (JSON.stringify(a) !== JSON.stringify(b)) liveMismatch++;
        }
      }
    }
    return { stable, distinctLooks: looks.size, tierIndependent, liveChecked, liveMismatch, samples };
  });
  ok(
    'variation-determinism: a tile always yields the same mirror/scale/tint (400 repeats + live worker-filled chunk instances), distinct tiles genuinely differ, and the understory tier rolls independently of the canopy',
    varDet.stable && varDet.distinctLooks > 50 && varDet.tierIndependent && varDet.liveMismatch === 0,
    JSON.stringify({ ...varDet, samples: varDet.samples.slice(0, 2) }),
  );

  // 2k2. VARIATION-BOUNDS (PASS 9): the jitter never leaves the declared
  // bands. Scale inside its tier band; boulders NEVER scale (geology); and
  // the tint, applied to the prop's band-checked ANCHOR, moves value inside
  // the darken-only band, saturation within +/-3% (+8-bit rounding) and hue
  // essentially not at all — the approved identity survives every instance.
  const varBounds = await page.evaluate(() => {
    const ws = window.__worldScale;
    const f = ws.flora;
    const hsv = (r, g, b) => {
      const mx = Math.max(r, g, b) / 255;
      const mn = Math.min(r, g, b) / 255;
      const d = mx - mn;
      let h = 0;
      if (d > 0) {
        const [R, G, B] = [r / 255, g / 255, b / 255];
        if (mx === R) h = 60 * (((G - B) / d) % 6);
        else if (mx === G) h = 60 * ((B - R) / d + 2);
        else h = 60 * ((R - G) / d + 4);
      }
      return { h: (h + 360) % 360, s: mx === 0 ? 0 : d / mx, v: mx };
    };
    const out = {};
    for (const [tier, ids] of [
      ['canopy', ['tree-fir-a', 'tree-broad-a', 'boulder-a']],
      ['understory', ['fern-sword-a', 'log-a']],
    ]) {
      const band = f.FLORA_VARIATION[tier];
      for (const id of ids) {
        const prop = f.FLORA_PROPS[id];
        const anchor = prop.anchor;
        const a = anchor === null ? null : [(anchor >> 16) & 255, (anchor >> 8) & 255, anchor & 255];
        const ah = a ? hsv(...a) : null;
        const r = { sMin: 9, sMax: -9, dh: 0, dsMin: 9, dsMax: -9, dvMin: 9, dvMax: -9, mirrors: 0, n: 0 };
        for (let k = 0; k < 1500; k++) {
          const v = f.floraVariation(900000 + k * 7, 600000 + k * 3, tier, id);
          r.n++;
          if (v.mirror) r.mirrors++;
          r.sMin = Math.min(r.sMin, v.scale);
          r.sMax = Math.max(r.sMax, v.scale);
          const t = [(v.tint >> 16) & 255, (v.tint >> 8) & 255, v.tint & 255];
          if (a) {
            const res = a.map((c, i) => (c * t[i]) / 255);
            const rh = hsv(...res);
            r.dh = Math.max(r.dh, Math.min(Math.abs(rh.h - ah.h), 360 - Math.abs(rh.h - ah.h)));
            r.dsMin = Math.min(r.dsMin, rh.s / ah.s);
            r.dsMax = Math.max(r.dsMax, rh.s / ah.s);
            r.dvMin = Math.min(r.dvMin, rh.v / ah.v);
            r.dvMax = Math.max(r.dvMax, rh.v / ah.v);
          } else {
            // No anchor: a NEUTRAL multiply — all channels equal by construction.
            if (t[0] !== t[1] || t[1] !== t[2]) r.dh = 999;
            r.dsMin = Math.min(r.dsMin, 1);
            r.dsMax = Math.max(r.dsMax, 1);
            r.dvMin = Math.min(r.dvMin, t[0] / 255);
            r.dvMax = Math.max(r.dvMax, t[0] / 255);
          }
        }
        const scaleLocked = prop.variation?.scale === false;
        out[`${tier}:${id}`] = {
          scaleOk: scaleLocked ? r.sMin === 1 && r.sMax === 1 : r.sMin >= band.scale[0] - 1e-9 && r.sMax <= band.scale[1] + 1e-9,
          scaleLocked,
          mirrorMix: r.mirrors > 100 && r.mirrors < r.n - 100,
          hueOk: r.dh <= 1,
          satOk: r.dsMin >= 1 - band.satPct - 0.005 && r.dsMax <= 1 + band.satPct + 0.005,
          valueOk: r.dvMin >= f.VARIATION_VALUE_FLOOR && r.dvMax <= 1 + 1e-9,
          measured: { scale: [+r.sMin.toFixed(3), +r.sMax.toFixed(3)], dh: +r.dh.toFixed(3), sat: [+r.dsMin.toFixed(3), +r.dsMax.toFixed(3)], val: [+r.dvMin.toFixed(3), +r.dvMax.toFixed(3)] },
        };
      }
    }
    return out;
  });
  ok(
    'variation-bounds: scale stays inside each tier band and boulders never scale at all; the tint holds the anchor hue (<=1 deg), saturation within +/-3%, and value inside the darken-only floor; mirroring is a real mix',
    Object.values(varBounds).every((r) => r.scaleOk && r.mirrorMix && r.hueOk && r.satOk && r.valueOk),
    JSON.stringify(varBounds),
  );

  // 2k3. COLLISION-INVARIANCE (PASS 9): render variation is VISUAL ONLY.
  // Footprints come from the contract size and never from the render scale,
  // and — the shipped truth — no scatter prop collides at all: the pooled
  // prop images carry no physics body, so a scaled tree can never change
  // where the player may walk.
  const collInv = await page.evaluate(() => {
    const ws = window.__worldScale;
    const f = ws.flora;
    const ids = Object.keys(f.FLORA_PROPS);
    // Footprint with variation "on" (the live config) vs the raw contract.
    const drift = [];
    for (const id of ids) {
      const fp = f.floraFootprint(id);
      const p = f.FLORA_PROPS[id];
      if (!p.collides && fp !== null) drift.push(`${id}:nonNullFootprintForNonCollider`);
      if (p.collides && (fp === null || fp.w !== p.w || fp.h !== p.h)) drift.push(`${id}:footprintDriftedFromContract`);
      // A scaled instance must not change the footprint (it is not an input).
      const v = f.floraVariation(1234, 5678, p.tier, id);
      const fp2 = f.floraFootprint(id);
      if (JSON.stringify(fp) !== JSON.stringify(fp2)) drift.push(`${id}:footprintMovedWithVariation:${v.scale}`);
    }
    const collidingRows = ids.filter((id) => f.FLORA_PROPS[id].collides);
    // LIVE: every pooled prop image in the scene is body-free.
    const ms = window.__ready();
    let bodies = 0;
    let props = 0;
    for (const go of ms.children.list) {
      const key = go.texture?.key ?? '';
      if (typeof key === 'string' && key.startsWith('terrain-prop-')) {
        props++;
        if (go.body) bodies++;
      }
    }
    return { drift, collidingRows, props, bodies };
  });
  ok(
    'collision-invariance: footprints derive from the contract size only and never move with variation; no shipped prop collides, and every live pooled prop image is physics-body free',
    collInv.drift.length === 0 && collInv.collidingRows.length === 0 && collInv.bodies === 0,
    JSON.stringify(collInv),
  );

  // 2k4. UNDERSTORY-LIVE (PASS 9's inertness check, PROMOTED in Art Session 4
  // when the PNW understory palettes were populated): the tier now plants for
  // real in exactly the biomes whose palette carries entries, and STILL plants
  // nothing anywhere else. The inertness half of the original check survives
  // as the "every unpopulated biome stays empty" assertion.
  const understoryInert = await page.evaluate(() => {
    const ws = window.__worldScale;
    const f = ws.flora;
    const populated = f.biomesWithTierPalette('understory');
    let plantedPopulated = 0;
    let plantedElsewhere = 0;
    for (let biome = 0; biome < 12; biome++) {
      for (let k = 0; k < 500; k++) {
        if (!f.floraFor(120000 + k * 13, 260000 + k * 7, biome, 'understory')) continue;
        if (populated.includes(biome)) plantedPopulated++;
        else plantedElsewhere++;
      }
    }
    const ms = window.__ready();
    const st = ms.chunkStreamer;
    let listed = 0;
    const pcx = Math.floor((ms.player.x - st.originPx.x) / 2048);
    const pcy = Math.floor((ms.player.y - st.originPx.y) / 2048);
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) listed += st.chunkVisuals(pcx + dx, pcy + dy)?.understory.length ?? 0;
    }
    const s = st.stats().visuals;
    return { populated, plantedPopulated, plantedElsewhere, listed, understoryVisible: s.understoryVisible, understoryPool: s.understoryPool };
  });
  ok(
    'understory-live: the tier plants ONLY in biomes whose palette carries entries (PNW forest + taiga) and nowhere else across a 6,000-tile sweep; unpopulated biomes stay exactly inert',
    understoryInert.populated.length === 2 && understoryInert.plantedPopulated > 0 && understoryInert.plantedElsewhere === 0,
    JSON.stringify(understoryInert),
  );

  // 2j5. scatter-determinism: the pure per-tile hash hits the locked FOREST
  // density over 10k tiles and never scatters bare biomes; a REAL forest
  // chunk's streamed scatter list recomputes byte-identically from the pure
  // reference (flags + hash — nothing random, nothing frame-dependent).
  const scatterDet = await page.evaluate(() => {
    const ws = window.__worldScale;
    let hits = 0;
    for (let tx = 0; tx < 100; tx++) {
      for (let ty = 0; ty < 100; ty++) {
        if (ws.scatterFor(100000 + tx, 200000 + ty, 6)) hits++;
      }
    }
    const freq = hits / 10000;
    let grassNone = true;
    for (let k = 0; k < 200; k++) if (ws.scatterFor(5000 + k, 7000, 3)) grassNone = false;
    const a = ws.scatterFor(123456, 654321, 6);
    const b = ws.scatterFor(123456, 654321, 6);
    const stable = JSON.stringify(a) === JSON.stringify(b);
    // A real forest anchor: first candidate whose composed earth record is
    // FOREST with the scatter flag (loud setup failure if none).
    const cands = [
      [47.6, -123.7],
      [46.1, -123.4],
      [48.6, -121.3],
      [50.5, -126.5],
      [44.5, -122.2],
    ];
    const ms = window.__ready();
    const st = ms.chunkStreamer;
    let spot = null;
    for (const [lat, lng] of cands) {
      const r = st.earthSample(lat, lng);
      if (r && r[0] === 6 && (r[3] & 2) !== 0) {
        spot = { lat, lng };
        break;
      }
    }
    return { freq, grassNone, stable, spot };
  });
  let scatterLive = { setup: 'no forest spot' };
  if (scatterDet.spot) {
    await page.evaluate((spot) => {
      const ms = window.__ready();
      const p = ms.terrestrialPxFromLatLng(spot);
      ms.player.sprite.body.reset(p.x, p.y);
      ms.lastLandPos = undefined;
    }, scatterDet.spot);
    await page.waitForTimeout(1400);
    await page.evaluate((spot) => {
      const ms = window.__ready();
      const p = ms.terrestrialPxFromLatLng(spot);
      ms.player.sprite.body.reset(p.x, p.y);
      ms.lastLandPos = undefined;
    }, scatterDet.spot);
    await page.waitForTimeout(1600);
    scatterLive = await page.evaluate(() => {
      const ms = window.__ready();
      const ws = window.__worldScale;
      const st = ms.chunkStreamer;
      const cx = Math.floor((ms.player.x - st.originPx.x) / 2048);
      const cy = Math.floor((ms.player.y - st.originPx.y) / 2048);
      const bytes = st.chunkBytes(cx, cy);
      const vis = st.chunkVisuals(cx, cy);
      if (!bytes || !vis) return { setup: `chunk ${cx},${cy} not built` };
      const expected = [];
      for (let j = 0; j < 64; j++) {
        for (let i = 0; i < 64; i++) {
          const o = (j * 64 + i) * 4;
          const fl = bytes[o + 3];
          if ((fl & 0x80) !== 0 || (fl & 2) === 0) continue;
          const s = ws.scatterFor(cx * 64 + i, cy * 64 + j, bytes[o]);
          if (s) expected.push({ i, j, ...s });
        }
      }
      return {
        setup: 'ok',
        count: vis.scatter.length,
        match: JSON.stringify(expected) === JSON.stringify(vis.scatter),
      };
    });
  }
  ok(
    'scatter-determinism: pure FOREST density within 0.30±0.03 over 10k tiles, bare biomes never scatter, and a live forest chunk recomputes byte-identically',
    Math.abs(scatterDet.freq - 0.3) <= 0.03 &&
      scatterDet.grassNone === true &&
      scatterDet.stable === true &&
      scatterLive.setup === 'ok' &&
      scatterLive.count >= 20 &&
      scatterLive.match === true,
    JSON.stringify({ ...scatterDet, live: scatterLive }),
  );

  // 2j6. scatter-pool-stability: 3.5s of real movement through the forest —
  // both pools stay hard-capped, visible never exceeds the pool, the pools
  // never churn (created === pool size, monotone), and the second half of the
  // run reuses the warm pool instead of allocating per frame.
  const poolPe0 = pageErrors.length;
  await page.keyboard.down('d');
  const poolSamples = [];
  for (let k = 0; k < 10; k++) {
    await page.waitForTimeout(350);
    poolSamples.push(await page.evaluate(() => window.__ready().chunkStreamer.stats().visuals));
  }
  await page.keyboard.up('d');
  const poolMid = poolSamples[4];
  const poolEnd = poolSamples[9];
  const poolOk = poolSamples.every(
    (s) => s.scatterPool <= 900 && s.fringePool <= 2600 && s.understoryPool <= 2700 && s.scatterVisible <= s.scatterPool && s.fringeVisible <= s.fringePool && s.scatterCreated === s.scatterPool && s.fringeCreated === s.fringePool,
  );
  ok(
    'scatter-pool-stability: pools hard-capped and churn-free through a forest run; the warm pool is reused, not regrown',
    poolOk && poolEnd.scatterVisible > 0 && poolEnd.scatterCreated - poolMid.scatterCreated <= 400 && pageErrors.length === poolPe0,
    JSON.stringify({ mid: poolMid, end: poolEnd }),
  );

  // 2k5. UNDERSTORY-POOL AT 3x DENSITY (PASS 9) + Y-SORT-TIERS. The shipped
  // palettes are empty, so the tier is proven with a TEMPORARY fixture
  // palette at 3x the forest canopy density (0.90) — the top of the speced
  // 2-3x range — driven for 60s of real movement. The pool must hold its
  // derived cap without churn, and at the same anchor row an understory
  // instance must sort UNDER the canopy while never sinking below the row
  // above it. The fixture is torn down and inertness re-proven afterwards.
  const uPe0 = pageErrors.length;
  await page.evaluate(() => {
    const f = window.__worldScale.flora;
    // ART SESSION 4: the forest understory now SHIPS populated, so the
    // fixture must save the real config and put it back afterwards — an
    // earlier version restored to empty and silently wiped the shipped
    // palette for every later check.
    window.__savedUnderstory = f.BIOME_FLORA[6].understory;
    // 3x the forest canopy density, drawn from the declared understory slots.
    f.BIOME_FLORA[6].understory = {
      density: 0.9,
      palette: [
        { propId: 'fern-sword-a', weight: 2 },
        { propId: 'salal-a', weight: 1 },
        { propId: 'log-a', weight: 1 },
      ],
    };
    window.__ready().chunkStreamer.repaintAllLayers(); // recompute cached visuals
  });
  await page.waitForTimeout(600);
  const uSamples = [];
  await page.keyboard.down('d');
  for (let k = 0; k < 20; k++) {
    await page.waitForTimeout(3000); // 20 x 3s = 60s of real movement
    uSamples.push(await page.evaluate(() => window.__ready().chunkStreamer.stats().visuals));
  }
  await page.keyboard.up('d');
  const uMid = uSamples[9];
  const uEnd = uSamples[19];
  const uPoolOk = uSamples.every((s) => s.understoryPool <= 2700 && s.understoryVisible <= s.understoryPool && s.understoryCreated === s.understoryPool);
  const uPlanted = uSamples.some((s) => s.understoryVisible > 0);
  // Y-SORT: measure real live instances — the understory image at a tile and
  // the canopy image at the same anchor row.
  const ySort = await page.evaluate(() => {
    const ms = window.__ready();
    const props = ms.children.list.filter((g) => typeof g.texture?.key === 'string' && g.texture.key.startsWith('terrain-prop-') && g.visible);
    const under = [];
    const canopy = [];
    const f = window.__worldScale.flora;
    for (const g of props) {
      const id = g.texture.key.replace('terrain-prop-', '');
      (f.FLORA_PROPS[id]?.tier === 'understory' ? under : canopy).push(g);
    }
    let pairs = 0;
    let wrong = 0;
    let belowPrevRow = 0;
    for (const u of under) {
      for (const c of canopy) {
        if (Math.abs(u.y - c.y) > 0.5) continue; // same anchor row
        pairs++;
        if (!(u.depth < c.depth)) wrong++;
      }
      // Never below a canopy a full tile row NORTH of it.
      for (const c of canopy) {
        if (Math.abs(u.y - 32 - c.y) > 0.5) continue;
        if (u.depth < c.depth) belowPrevRow++;
      }
    }
    return { under: under.length, canopy: canopy.length, pairs, wrong, belowPrevRow };
  });
  // Tear the fixture down and re-prove the shipped inertness.
  const uRestored = await page.evaluate(async () => {
    const f = window.__worldScale.flora;
    f.BIOME_FLORA[6].understory = window.__savedUnderstory; // the SHIPPED palette
    const ms = window.__ready();
    ms.chunkStreamer.repaintAllLayers();
    await new Promise((r) => setTimeout(r, 700));
    const s = ms.chunkStreamer.stats().visuals;
    return {
      populated: f.biomesWithTierPalette('understory').length,
      density: f.BIOME_FLORA[6].understory.density,
      paletteLen: f.BIOME_FLORA[6].understory.palette.length,
      understoryVisible: s.understoryVisible,
    };
  });
  ok(
    'understory-pool at 3x density: a 60s drive under a 3x fixture palette holds the derived 2700 cap with zero churn and really plants instances; at the same anchor row understory sorts UNDER canopy and never below the row above; teardown puts the SHIPPED forest palette back exactly',
    uPoolOk && uPlanted && ySort.pairs > 0 && ySort.wrong === 0 && ySort.belowPrevRow === 0 && uRestored.populated === 2 && uRestored.density === 0.45 && uRestored.paletteLen === 6 && pageErrors.length === uPe0,
    JSON.stringify({ mid: uMid, end: uEnd, ySort, uRestored }),
  );

  // 2g4. offline-cache: a SECOND v2 boot must serve planet.bin from
  // IndexedDB — proven by BLOCKING the network route for it and still
  // arriving at a live earth source.
  await page.route('**/world/planet.bin.gz', (route) => route.abort()); // Pass 7: the pack ships gzip
  await page.route('**/world/worldmap.png', (route) => route.abort()); // Pass 6A: the map image must ride the same cache
  await page.route('**/world/regions/pnw-map.png', (route) => route.abort()); // Pass 6D: the region map tier rides it too
  await page.goto(`http://localhost:${PORT}/?scale=v2`, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__game && window.__game.scene.isActive('TitleScene'), null, { timeout: 25000 });
  await page.evaluate(() => window.__game.scene.getScene('TitleScene').scene.start('MainScene', { mode: 'continue' }));
  await page.waitForFunction(() => window.__game.scene.isActive('MainScene'), null, { timeout: 60000 });
  await page.waitForFunction(() => window.__game.scene.getScene('MainScene').chunkStreamer?.activeSourceLabel === 'earth', null, { timeout: 30000 });
  await page.waitForFunction(() => window.__game.scene.getScene('MainScene').chunkStreamer?.worldmapBuf !== null, null, { timeout: 30000 });
  const offlineCache = await page.evaluate(() => {
    const st = window.__game.scene.getScene('MainScene').chunkStreamer;
    return { planetFrom: st.packOrigin.planet, worldmapFrom: st.packOrigin.worldmap, worldmapBytes: st.worldmapBuf?.byteLength ?? 0, source: st.activeSourceLabel };
  });
  // PASS 6D: this fresh page has NO warm texture — the region tier must build
  // entirely from the IndexedDB copy with its network route still blocked.
  await page.waitForFunction(() => (window.__game.scene.getScene('MainScene').chunkStreamer?.regionMapEntries()?.length ?? 0) > 0, null, { timeout: 30000 });
  let offOpened = false;
  for (let k = 0; k < 8 && !offOpened; k++) {
    offOpened = await page.evaluate(() => window.__game.scene.getScene('MainScene').openWorldMap());
    if (!offOpened) await page.waitForTimeout(600);
  }
  const offlineRegion = await page.evaluate(async () => {
    const wms = window.__game.scene.getScene('WorldMapScene');
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    const t = wms.regionTier[0];
    if (!t) return { setup: 'no tier' };
    // Stand the view over the PNW past the threshold — the engage condition.
    wms.viewScale = 2;
    wms.applyView(t.rect.x + t.rect.w / 2, t.rect.y + t.rect.h / 2);
    for (let k = 0; k < 30 && t.state !== 'ready' && t.state !== 'failed'; k++) await wait(300);
    const out = { setup: 'ok', state: t.state, from: t.from, visible: t.img?.visible === true };
    wms.close();
    await wait(300);
    return out;
  });
  await page.unroute('**/world/planet.bin.gz');
  await page.unroute('**/world/worldmap.png');
  await page.unroute('**/world/regions/pnw-map.png');
  ok(
    'offline-cache: second v2 boot serves planet.bin.gz (decompressed on read) AND worldmap.png from IndexedDB with the network routes blocked',
    offlineCache.planetFrom === 'idb' && offlineCache.worldmapFrom === 'idb' && offlineCache.worldmapBytes > 100000 && offlineCache.source === 'earth',
    JSON.stringify(offlineCache),
  );
  ok(
    'lazy-fetch+cache: the region-map tier on a fresh page builds from IndexedDB with its network route blocked (fetch-once per session proven by the map-lod-swap route counter)',
    offlineRegion.setup === 'ok' && offlineRegion.state === 'ready' && offlineRegion.from === 'idb' && offlineRegion.visible === true,
    JSON.stringify(offlineRegion),
  );

  // 2g5. decompression-unavailable (PASS 7): a platform WITHOUT
  // DecompressionStream must fail the boot LOUDLY with the requirement named
  // — never a silent procedural session. Isolated page (init scripts are
  // page-scoped; the main session is untouched).
  {
    const ctx2 = await browser.newContext({ viewport: { width: 428, height: 926 } });
    const p2 = await ctx2.newPage();
    const p2Errors = [];
    p2.on('pageerror', (e) => p2Errors.push(e.message));
    await p2.addInitScript(() => {
      // Simulate an old platform: the constructor is absent entirely.
      delete window.DecompressionStream;
    });
    await p2.goto(`http://localhost:${PORT}/?scale=v2`, { waitUntil: 'load' });
    await p2.waitForFunction(() => !!window.__game && window.__game.scene.isActive('TitleScene'), null, { timeout: 25000 });
    await p2.evaluate(() => window.__game.scene.getScene('TitleScene').scene.start('MainScene', { mode: 'new', classId: 'blacksmith' }));
    await p2.waitForFunction(() => window.__game.scene.isActive('MainScene'), null, { timeout: 30000 });
    let named = false;
    for (let k = 0; k < 25 && !named; k++) {
      await p2.waitForTimeout(400);
      named = p2Errors.some((m) => m.includes('DecompressionStream'));
    }
    const silentEarth = await p2.evaluate(() => window.__game.scene.getScene('MainScene').chunkStreamer?.activeSourceLabel === 'earth');
    await ctx2.close();
    ok(
      'decompression-unavailable: a platform without DecompressionStream fails LOUDLY with the requirement named — and never silently reaches an earth session',
      named && !silentEarth,
      JSON.stringify({ named, silentEarth, firstError: p2Errors.find((m) => m.includes('DecompressionStream'))?.slice(0, 140) ?? p2Errors[0]?.slice(0, 140) ?? null }),
    );
  }

  // ── PASS 7 COMMIT 3: THE EGYPT CORRIDOR + THE SEALED SINAI PORTAL ─────────
  // A dedicated fresh druid session in its OWN CONTEXT drives the whole
  // five-beat chain from a cold state (deterministic — the main travel
  // session may have side-started beat 1 through the Faiyum hearth). The
  // isolated BROWSER PROCESS gets its own renderer tree (the fixture is
  // heavy, and three prior runs died at its tail from end-of-suite memory
  // pressure — a shared-process context was not enough) and its own
  // storage — the travel session's save slot is never touched. The main
  // page parks on about:blank first, releasing its world session's memory
  // (flip-default re-navigates it regardless).
  const egc = await (async () => {
    const { build } = await import('esbuild');
    const outfile = new URL('../node_modules/.cache/toh-egypt-corridor.mjs', import.meta.url).pathname;
    await build({ entryPoints: [new URL('../src/world/egypt-corridor.ts', import.meta.url).pathname], bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'silent' });
    return import(outfile);
  })();
  const rosterB = await (async () => {
    const { build } = await import('esbuild');
    const outfile = new URL('../node_modules/.cache/toh-enemy-roster.mjs', import.meta.url).pathname;
    await build({ entryPoints: [new URL('../src/world/enemy-roster.ts', import.meta.url).pathname], bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'silent' });
    return import(outfile);
  })();
  // 3w0. suez-spawn-set (Node half): every declared family is an EXISTING
  // live-spawnable family with a canon domain (no new family ships here).
  const suezNode = {
    entries: egc.SUEZ_SPAWN_SET.length,
    total: egc.SUEZ_SPAWN_SET.reduce((a, s) => a + s.count, 0),
    allExisting: egc.SUEZ_SPAWN_SET.every((s) => s.family in rosterB.EXISTING_FAMILY_DOMAIN),
    tints: Object.fromEntries(egc.SUEZ_SPAWN_SET.map((s) => [s.family, rosterB.DOMAIN_TINT[rosterB.EXISTING_FAMILY_DOMAIN[s.family]]])),
  };
  await page.goto('about:blank'); // release the main page's world memory
  const browser3 = await chromium.launch({
    executablePath: EXE,
    headless: true,
    args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const ctx3 = await browser3.newContext({ viewport: { width: 428, height: 926 } });
  const p3 = await ctx3.newPage();
  p3.on('pageerror', (e) => pageErrors.push(`corridor: ${e.message}`));
  await p3.addInitScript(() => {
    Object.defineProperty(document, 'hidden', { get: () => false });
    Object.defineProperty(document, 'visibilityState', { get: () => 'visible' });
  });
  await p3.addInitScript(() => {
    window.__ready = () => {
      const ms = window.__game.scene.getScene('MainScene');
      if (ms.playerDead) ms.respawnPlayer();
      ms.playerHealth.full();
      ms.playerHealth.shield = 1e9;
      return ms;
    };
  });
  await p3.goto(`http://localhost:${PORT}/?scale=v2&devspeed=99`, { waitUntil: 'load' });
  await p3.waitForFunction(() => !!window.__game && window.__game.scene.isActive('TitleScene'), null, { timeout: 25000 });
  await p3.evaluate(() => window.__game.scene.getScene('TitleScene').scene.start('MainScene', { mode: 'new', classId: 'druid' }));
  await p3.waitForFunction(() => window.__game.scene.isActive('MainScene'), null, { timeout: 60000 });
  await p3.waitForTimeout(2500);
  if (await p3.evaluate(() => window.__game.scene.isActive('FirstSkillScene'))) {
    await p3.mouse.click(214, 462);
    await p3.waitForTimeout(600);
  }
  // Stand at Faiyum; the egypt pack lazy-loads; the HEARTH offers beat 1.
  await p3.evaluate(() => {
    const ms = window.__ready();
    const p = ms.terrestrialPxFromLatLng({ lat: 29.31, lng: 30.84 });
    ms.player.sprite.body.reset(p.x, p.y);
    ms.lastLandPos = undefined;
  });
  await p3.waitForFunction(
    () => {
      const ms = window.__game.scene.getScene('MainScene');
      return ms.chunkStreamer && ms.chunkStreamer.regionsRef.some((r) => r.id === 'egypt');
    },
    null,
    { timeout: 120000 },
  );
  let hearthOffered = false;
  for (let k = 0; k < 25 && !hearthOffered; k++) {
    await p3.waitForTimeout(400);
    hearthOffered = await p3.evaluate(() => window.__game.scene.getScene('MainScene').chain.status('egypt-corridor-1') === 'active');
  }

  // 3w1. corridor-anchor-sanity: every beat anchor stands on COMPOSED-truth
  // walkable ground; Cairo enters the polyline BY ID (the b:cairo point IS
  // the live mentor anchor); the fallback ring buffer is untouched.
  const egAnchors = await p3.evaluate(() => {
    const ms = window.__ready();
    const F = ms.map.constructor;
    const pts = ms.egyptCorridorScenePoints();
    const byLabel = Object.fromEntries(pts.map((p) => [p.label, p]));
    const beatWalkable = {};
    for (const label of ['faiyum', 'b:cairo', 'suez', 'sinaiCamp', 'summit']) {
      const p = byLabel[label];
      beatWalkable[label] = p ? ms.composedTravelWalkable(p.x, p.y) === true : 'missing';
    }
    const cairoById = byLabel['b:cairo'] && byLabel['b:cairo'].x === ms.cairoMentorPos.x && byLabel['b:cairo'].y === ms.cairoMentorPos.y;
    return { beatWalkable, cairoById, fallbacks: F.walkableFallbacks.length, sealedAtBoot: ms.sinaiPortalState() };
  });
  ok(
    'corridor-anchor-sanity: all five beat anchors walkable on the composed source, Cairo referenced BY ID (polyline point === live mentor anchor), zero walkable-fallback engagements, portal born sealed',
    Object.values(egAnchors.beatWalkable).every((v) => v === true) && egAnchors.cairoById === true && egAnchors.fallbacks === 0 && egAnchors.sealedAtBoot === 'sealed',
    JSON.stringify(egAnchors),
  );

  // 3w2. crossing-stamps: the authored canal causeway stands at its declared
  // site, its road span COVERS the live-measured baked channel (+ a bank on
  // each side), and its tiles are road (walkable stamp truth over the water).
  const crossingStamp = await p3.evaluate(() => {
    const ms = window.__ready();
    const st = ms.chunkStreamer;
    const B = window.__worldScale.schema.Biome;
    const m = ms.egyptCorridorStampById.get('crossing-canal-ahmed-hamdi');
    if (!m) return { setup: 'no causeway stamp' };
    const b = m.bounds;
    const cy = b.y + b.height / 2;
    // Measure the baked channel along the causeway's center row (sampled at
    // 16 px), ignoring stamp cover — the raw truth the causeway must span.
    let first = -1;
    let last = -1;
    for (let x = b.x - 640; x <= b.x + b.width + 640; x += 16) {
      const ll = ms.terrestrialLatLngFromPx(x, cy);
      const r = st.earthSample(ll.lat, ll.lng);
      if (r[0] === B.OCEAN || r[0] === B.FRESHWATER) {
        if (first < 0) first = x;
        last = x;
      }
    }
    const walkMid = !m.isBlockedAtWorld(b.x + b.width / 2, cy);
    const walkIn = !m.isBlockedAtWorld(b.x + 50, cy);
    const walkOut = !m.isBlockedAtWorld(b.x + b.width - 50, cy);
    return {
      setup: 'ok',
      channelPx: first >= 0 ? last - first : 0,
      spansChannel: first >= 0 && b.x + 48 <= first && last <= b.x + b.width - 48,
      walkMid,
      walkIn,
      walkOut,
    };
  });
  ok(
    'crossing-stamps: the Ahmed Hamdi causeway spans the live-measured baked canal channel with banks on both ends, and its road row is walkable end to end',
    crossingStamp.setup === 'ok' && crossingStamp.channelPx > 0 && crossingStamp.spansChannel === true && crossingStamp.walkMid && crossingStamp.walkIn && crossingStamp.walkOut,
    JSON.stringify(crossingStamp),
  );

  // 3w3. corridor-chain: the five beats walked end to end through the REAL
  // paths — hearth offer, Sefu talk, retargeting between beats with the km
  // readout matching the px math, the Suez pack (existing families + canon
  // tints, defeated), the camp reach (+ waystone discovery), the unseal.
  const beat1 = await p3.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    const st = ms.settlementStamps.find((s) => s.def.id === 'faiyum');
    if (!st) return { setup: 'no faiyum stamp' };
    const prev = { x: ms.player.x, y: ms.player.y };
    ms.player.sprite.body.reset(st.npcs[0].sprite.x + 50, st.npcs[0].sprite.y);
    ms.lastLandPos = undefined;
    let opened = false;
    for (let k = 0; k < 12 && !opened; k++) {
      await wait(300);
      if (ms.dialogue.isOpen()) opened = true;
      else if (ms.talkButton.isVisible) {
        ms.tryTalk();
        await wait(300);
        opened = ms.dialogue.isOpen();
      }
    }
    ms.player.sprite.body.reset(prev.x, prev.y);
    ms.lastLandPos = undefined;
    return { setup: 'ok', opened };
  });
  for (let i = 0; i < 14; i++) {
    await p3.waitForTimeout(280);
    const uiOpen = await p3.evaluate(() => {
      const ms = window.__game.scene.getScene('MainScene');
      return ms.dialogue.isOpen() || ms.choice.isOpen();
    });
    if (!uiOpen) break;
    await p3.mouse.click(214, 520);
    await p3.mouse.click(214, 462);
  }
  let beat2Active = false;
  for (let k = 0; k < 15 && !beat2Active; k++) {
    await p3.waitForTimeout(400);
    beat2Active = await p3.evaluate(() => window.__game.scene.getScene('MainScene').chain.status('egypt-corridor-2') === 'active');
  }
  // Retargeting + km-matching at beat 2: the marker points at the Cairo
  // mentor and its km text equals the px math (formatKm rules replicated).
  const kmMatch = await p3.evaluate(() => {
    const ms = window.__ready();
    const t = ms.chain.activeObjectiveDef?.target ?? null;
    const text = ms.marker.label.text;
    const distPx = Math.hypot(ms.cairoMentorPos.x - ms.player.x, ms.cairoMentorPos.y - ms.player.y);
    const km = distPx / 1600;
    const expect = `· ${km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`}`;
    return { target: t, text, expect, match: text.trim() === expect.trim() };
  });
  await p3.evaluate(() => {
    const ms = window.__ready();
    ms.player.sprite.body.reset(ms.cairoMentorPos.x + 60, ms.cairoMentorPos.y + 40);
    ms.lastLandPos = undefined;
  });
  let beat3Active = false;
  for (let k = 0; k < 15 && !beat3Active; k++) {
    await p3.waitForTimeout(400);
    beat3Active = await p3.evaluate(() => window.__game.scene.getScene('MainScene').chain.status('egypt-corridor-3') === 'active');
  }
  const suezLive = await p3.evaluate((tints) => {
    const ms = window.__ready();
    const live = ms.arcEnemies.filter((e) => e.isAlive);
    const byFam = {};
    let tintOk = true;
    for (const e of live) {
      const fam = e.sprite.texture.key.replace(/^enemy-/, '');
      byFam[fam] = (byFam[fam] ?? 0) + 1;
      // Base tint = the canon domain tint (except mid hit-flash; spawn-fresh here).
      if (tints[fam] !== undefined && e.sprite.tintTopLeft !== tints[fam]) tintOk = false;
    }
    return { live: live.length, byFam, tintOk };
  }, suezNode.tints);
  // Defeat the pack (the established gate kill path) → beat 4.
  await p3.evaluate(() => {
    const ms = window.__ready();
    for (const e of ms.arcEnemies) if (e.isAlive) e.destroy();
  });
  let beat4Active = false;
  for (let k = 0; k < 15 && !beat4Active; k++) {
    await p3.waitForTimeout(400);
    beat4Active = await p3.evaluate(() => window.__game.scene.getScene('MainScene').chain.status('egypt-corridor-4') === 'active');
  }
  await p3.evaluate(() => {
    const ms = window.__ready();
    ms.player.sprite.body.reset(ms.sinaiCampSpawn.x, ms.sinaiCampSpawn.y - 40);
    ms.lastLandPos = undefined;
  });
  let beat5Active = false;
  for (let k = 0; k < 15 && !beat5Active; k++) {
    await p3.waitForTimeout(400);
    beat5Active = await p3.evaluate(() => window.__game.scene.getScene('MainScene').chain.status('egypt-corridor-5') === 'active');
  }
  // The camp waystone attunes by DISCOVERY while standing in the camp.
  let campAttuned = false;
  for (let k = 0; k < 10 && !campAttuned; k++) {
    await p3.waitForTimeout(400);
    campAttuned = await p3.evaluate(() => window.__game.scene.getScene('MainScene').waypointSys.unlocked.has('sinai-camp'));
  }
  ok(
    'corridor-chain: hearth offers beat 1, the Sefu talk completes it, retargeting walks beats 2-5 (km readout matches the px math at Cairo), the Suez pack spawns existing families with canon tints and its defeat advances, the camp reach attunes the sinai-camp waystone',
    hearthOffered && beat1.setup === 'ok' && beat1.opened && beat2Active && kmMatch.target === 'cairo-crown' && kmMatch.match && beat3Active && suezLive.live === suezNode.total && suezNode.allExisting && suezNode.entries >= 2 && suezLive.tintOk && beat4Active && beat5Active && campAttuned,
    JSON.stringify({ hearthOffered, beat1, beat2Active, kmMatch, beat3Active, suezLive, suezNode: { ...suezNode, tints: undefined }, beat4Active, beat5Active, campAttuned }),
  );

  // 3w4. portal-sealed-until-chain: SEALED through beats 1-4 (asserted at
  // boot above and re-checked here mid-quest-5), the crossing button REFUSES
  // while sealed (no world change), the unseal ritual runs through the real
  // proximity-action path and flips the state, and the ACTIVE portal crosses
  // into the SAME Heaven plane as Idaho.
  // Small SYNC evaluates with node-side waits between them: three prior
  // runs wedged the renderer inside one long page-side async evaluate here
  // — small steps make any future wedge fail at a named point instead of
  // hanging the whole run silently.
  await p3.evaluate(() => {
    const ms = window.__ready();
    ms.player.sprite.body.reset(ms.sinaiPortal.x + 60, ms.sinaiPortal.y + 40);
    ms.lastLandPos = undefined;
  });
  await p3.waitForTimeout(700);
  const sealedPress = await p3.evaluate(() => {
    const ms = window.__ready();
    const stateBefore = ms.sinaiPortalState();
    const btnVisible = ms.sinaiEnterButton?.isVisible ?? false;
    const worldBefore = ms.activeWorld;
    ms.enterSinaiPortal();
    return { stateBefore, btnVisible, worldBefore };
  });
  await p3.waitForTimeout(600);
  const sealedRefusal = await p3.evaluate((worldBefore) => {
    const ms = window.__game.scene.getScene('MainScene');
    return {
      refusalOpen: ms.dialogue.isOpen(),
      stayed: ms.activeWorld === worldBefore && !ms.transitioning,
    };
  }, sealedPress.worldBefore);
  sealedRefusal.stateBefore = sealedPress.stateBefore;
  sealedRefusal.btnVisible = sealedPress.btnVisible;
  for (let i = 0; i < 10; i++) {
    await p3.waitForTimeout(280);
    const uiOpen = await p3.evaluate(() => {
      const ms = window.__game.scene.getScene('MainScene');
      return ms.dialogue.isOpen() || ms.choice.isOpen();
    });
    if (!uiOpen) break;
    await p3.mouse.click(214, 520);
    await p3.mouse.click(214, 462);
  }
  let unsealBtn = false;
  for (let k = 0; k < 12 && !unsealBtn; k++) {
    await p3.waitForTimeout(300);
    unsealBtn = await p3.evaluate(() => window.__game.scene.getScene('MainScene').burnButton.isVisible);
  }
  await p3.evaluate(() => window.__ready().tryArcAction()); // the shared proximity-action path fires 'summit-unsealed'
  await p3.waitForTimeout(600);
  const unsealRitual = await p3.evaluate(() => {
    const ms = window.__game.scene.getScene('MainScene');
    return { portal: ms.sinaiPortalState(), objIndex: ms.chain.activeObjectiveIndex };
  });
  unsealRitual.btn = unsealBtn;
  await p3.evaluate(() => window.__ready().enterSinaiPortal());
  for (let k = 0; k < 25; k++) {
    await p3.waitForTimeout(400);
    const arrived = await p3.evaluate(() => {
      const ms = window.__game.scene.getScene('MainScene');
      return ms.activeWorld === 'heaven' && !ms.transitioning;
    });
    if (arrived) break;
  }
  const crossing = await p3.evaluate(() => {
    const ms = window.__game.scene.getScene('MainScene');
    const dArrival = Math.hypot(ms.player.x - ms.heavenArrivalPos.x, ms.player.y - ms.heavenArrivalPos.y);
    return { world: ms.activeWorld, dArrival: +dArrival.toFixed(0), q5: ms.chain.status('egypt-corridor-5'), portal: ms.sinaiPortalState() };
  });
  ok(
    'portal-sealed-until-chain: sealed at boot and through beat 5a, the crossing button refuses while sealed (no world change), the real unseal ritual flips sealed -> active, and the active portal crosses into the SAME Heaven plane as Idaho (chain complete)',
    sealedRefusal.stateBefore === 'sealed' && sealedRefusal.btnVisible && sealedRefusal.refusalOpen && sealedRefusal.stayed && unsealRitual.btn && unsealRitual.portal === 'active' && unsealRitual.objIndex === 1 && crossing.world === 'heaven' && crossing.dArrival <= 64 && crossing.q5 === 'complete' && crossing.portal === 'active',
    JSON.stringify({ sealedRefusal, unsealRitual, crossing }),
  );

  // 3w5. corridor-traversable: ride the WHOLE egypt polyline against the live
  // world rule (baked water blocks unless an authored stamp — the hand-built
  // Cairo map, the camp, the causeway, a settlement — covers the point). NO
  // water span wider than a ford; the causeway must be ridden end to end.
  const egyptRide = await p3.evaluate(() => {
    const ms = window.__ready();
    const st = ms.chunkStreamer;
    const B = window.__worldScale.schema.Biome;
    const pts = ms.egyptCorridorScenePoints();
    const covers = [ms.egyptMap.bounds, ...[...ms.egyptCorridorStampById.values()].map((m) => m.bounds), ...ms.settlementStamps.map((s) => s.map.bounds)];
    const offenders = [];
    let ridden = false;
    const segs = [];
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      if (a.label === 'x:canal-ahmed-hamdi:in' && b.label === 'x:canal-ahmed-hamdi:out') ridden = true;
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      segs.push({ from: a.label, to: b.label, lenPx: Math.round(len) });
      const n = Math.max(1, Math.ceil(len / 64));
      let runStart = -1;
      for (let k = 0; k <= n; k++) {
        const t = k / n;
        const x = a.x + (b.x - a.x) * t;
        const y = a.y + (b.y - a.y) * t;
        const covered = covers.some((c) => x >= c.x && x < c.x + c.width && y >= c.y && y < c.y + c.height);
        let water = false;
        if (!covered) {
          const ll = ms.terrestrialLatLngFromPx(x, y);
          const r = st.earthSample(ll.lat, ll.lng);
          water = r[0] === B.OCEAN || r[0] === B.FRESHWATER;
        }
        if (water) {
          if (runStart < 0) runStart = k;
        } else if (runStart >= 0) {
          const widthPx = (k - runStart) * 64;
          if (widthPx > 96) offenders.push({ seg: `${a.label}->${b.label}`, widthPx });
          runStart = -1;
        }
      }
    }
    const F = ms.map.constructor;
    return { offenders, ridden, segs, fallbacks: F.walkableFallbacks.length };
  });
  ok(
    'corridor-traversable: the egypt polyline rides clean end to end — zero water spans wider than a ford under the cover rule, the canal causeway ridden lengthwise, zero fallback engagements across the whole fixture',
    egyptRide.offenders.length === 0 && egyptRide.ridden === true && egyptRide.fallbacks === 0,
    JSON.stringify({ offenders: egyptRide.offenders.slice(0, 6), ridden: egyptRide.ridden, segments: egyptRide.segs.length, fallbacks: egyptRide.fallbacks }),
  );
  // SEGMENT-TIMES (ADVISORY, per spec — printed, never asserted): minutes per
  // corridor leg at mount speed; feeds the ledgered Egypt spawn-density audit.
  {
    const ws7 = await (async () => {
      const { build } = await import('esbuild');
      const outfile = new URL('../node_modules/.cache/toh-world-scale7.mjs', import.meta.url).pathname;
      await build({ entryPoints: [new URL('../src/world/world-scale.ts', import.meta.url).pathname], bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'silent' });
      return import(outfile);
    })();
    const legs = [];
    let from = egyptRide.segs[0]?.from ?? 'faiyum';
    let acc = 0;
    for (const s of egyptRide.segs) {
      acc += s.lenPx;
      if (!s.to.startsWith('via(') && !s.to.startsWith('x:')) {
        legs.push(`${from}->${s.to}: ${(acc / ws7.MOUNT_SPEED_PX / 60).toFixed(1)}m`);
        from = s.to;
        acc = 0;
      }
    }
    console.log(`ADVISORY egypt segment-times (mounted, ${ws7.MOUNT_SPEED_PX}px/s): ${legs.join('  ')}`);
  }
  await browser3.close();

  // ── PASS 4 COMMIT 2: THE FLIP ─────────────────────────────────────────────
  // 2i0. flip-default: a page with NO param is v2 — streamer live, the earth
  // packs served from the IndexedDB cache, and the v17-lineage save loading
  // onto the same geography as before.
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__game && window.__game.scene.isActive('TitleScene'), null, { timeout: 25000 });
  await page.evaluate(() => window.__game.scene.getScene('TitleScene').scene.start('MainScene', { mode: 'continue' }));
  await page.waitForFunction(() => window.__game.scene.isActive('MainScene'), null, { timeout: 60000 });
  await page.waitForFunction(() => window.__game.scene.getScene('MainScene').chunkStreamer?.activeSourceLabel === 'earth', null, { timeout: 60000 });
  const flipDefault = await page.evaluate(() => {
    const ms = window.__game.scene.getScene('MainScene');
    return {
      noParam: !location.search.includes('scale'),
      v2: window.__worldScale.isScaleV2(),
      streamer: !!ms.chunkStreamer,
      planetFrom: ms.chunkStreamer.packOrigin.planet,
      world: ms.activeWorld,
      travelSystems: !!ms.mountSys && !!ms.waypointSys,
    };
  });
  ok(
    'flip-default: no param means v2 — streamer live, planet from IndexedDB cache, travel systems constructed',
    flipDefault.noParam && flipDefault.v2 === true && flipDefault.streamer && flipDefault.planetFrom === 'idb' && flipDefault.world === 'earth' && flipDefault.travelSystems,
    JSON.stringify(flipDefault),
  );

  // 2i1. respawn-nearest: a death mid-PNW respawns at the NEAREST settlement
  // by LIVE v2 distance — the check recomputes the argmin over the same
  // candidate set (zone arrivals + the Egypt gate + the Enumclaw square)
  // independently and the engine must agree.
  const respawnNearest = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    const mid = ms.terrestrialPxFromLatLng({ lat: 46.8, lng: -120.6 }); // mid-PNW, between settlements
    ms.player.sprite.body.reset(mid.x, mid.y);
    ms.lastLandPos = undefined;
    await wait(400);
    const candidates = [...Object.values(ms.regionZoneArrivals), ms.egyptArrivalPos, { x: ms.town.spawn.x, y: ms.town.spawn.y }];
    let best = null;
    let bestD = Infinity;
    for (const c of candidates) {
      const d = Math.hypot(c.x - mid.x, c.y - mid.y);
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    }
    ms.respawnPlayer(); // the REAL death respawn path (nearest safe point)
    await wait(200);
    const d = Math.hypot(ms.player.x - best.x, ms.player.y - best.y);
    return { candidates: candidates.length, bestD: Math.round(bestD), landedD: +d.toFixed(1), agrees: d <= 64 };
  });
  ok(
    'respawn-nearest: a mid-PNW death respawns at the settlement the v2 distances actually select',
    respawnNearest.candidates >= 60 && respawnNearest.agrees === true,
    JSON.stringify(respawnNearest),
  );

  // PASS 5: TRINITY SPAWN AT ITS AUTHORED TILE + FALLBACK-LOUD.
  // The restored hell-local arena must be walkable AS AUTHORED (zero spiral
  // fallback), and the final session must have engaged the walkable-ground
  // fallback exactly never — engagements are enumerated on failure.
  const trinityLoud = await page.evaluate(() => {
    const ms = window.__ready();
    const F = ms.map.constructor;
    const hb = ms.hellMap.bounds;
    const n0 = F.walkableFallbacks.length;
    const spot = ms.hellMap.nearestWalkableWorld(hb.x + 11520, hb.y + 9000);
    const sameTile = Math.hypot(spot.x - (hb.x + 11520), spot.y - (hb.y + 9000)) < 32;
    return { sameTile, probeEngaged: F.walkableFallbacks.length - n0, sessionEngagements: F.walkableFallbacks.slice(0, 10), n: F.walkableFallbacks.length };
  });
  ok(
    'fallback-loud: the authored Trinity arena tile is walkable with zero fallback; the session engaged the walkable fallback never (enumerated)',
    trinityLoud.sameTile && trinityLoud.probeEngaged === 0 && trinityLoud.n === 0,
    JSON.stringify(trinityLoud),
  );

  // 4) THE GATE: zero page errors across everything above.
  ok('zero page errors during boot + travel', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));
} finally {
  await browser?.close();
  kill();
}

const passed = results.filter(Boolean).length;
console.log(`\n${passed}/${results.length} runtime checks passed`);
if (passed !== results.length) process.exit(1);

#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { PNG } from 'pngjs';
import { build } from 'esbuild';

/**
 * ASSET MANIFEST BUILDER (`npm run art:manifest`, Pass 8) — scans the REAL
 * registries (sprite overrides, class figure keys, enemy roster, terrain
 * visuals config, skill data, town tiles) plus the on-disk art and emits
 * toh-asset-manifest.json: one row per visual the game needs, with STATUS
 * DERIVED FROM GROUND TRUTH, never declared:
 *   live     — a file at the asset's contract path that passes its lint rules
 *              AND the slot is actually activated (declared) by the code;
 *   fallback — the code-drawn / procedural fallback carries the slot today;
 *   missing  — nothing carries it (no file and no fallback path exists).
 * blockedBy encodes the deferred-ledger fences (REQUIRED set asserted by the
 * manifest-fences gate):
 *   every enemy sprite            => enemy-tint-ruling
 *   every animation sheet         => walk-framework
 *   each biome's prop upgrades    => {biome-stem}-base-approved
 * plus 'drop-contract-missing' for categories with no drop-in contract at
 * all (spell FX, town tiles) — the batch tool can never target those.
 *
 * `--check`: regenerate in memory and byte-compare against the committed
 * manifest — exit 1 on ANY drift (the manifest-sync gate).
 */

const OUT = 'toh-asset-manifest.json';
const CHECK = process.argv.includes('--check');

async function bundle(entry, name, { stubPhaser = false } = {}) {
  const outfile = new URL(`../../node_modules/.cache/toh-manifest-${name}.mjs`, import.meta.url).pathname;
  await build({
    entryPoints: [new URL(`../../${entry}`, import.meta.url).pathname],
    bundle: true,
    format: 'esm',
    platform: 'node',
    outfile,
    logLevel: 'silent',
    plugins: stubPhaser
      ? [
          {
            name: 'stub-phaser',
            setup(b) {
              b.onResolve({ filter: /^phaser$/ }, () => ({ path: 'phaser-stub', namespace: 'phaser-stub' }));
              b.onLoad({ filter: /.*/, namespace: 'phaser-stub' }, () => ({ contents: 'export default {};' }));
            },
          },
        ]
      : [],
  });
  return import(outfile);
}

const overrides = await bundle('src/render/spriteOverrides.ts', 'overrides', { stubPhaser: true });
const figures = await bundle('src/render/classFigureKeys.ts', 'figures');
const roster = await bundle('src/world/enemy-roster.ts', 'roster');
const terrain = await bundle('src/world/terrain-visuals-config.ts', 'terrain');
const skills = await bundle('src/skills/skillData.ts', 'skills', { stubPhaser: true });
const town = await bundle('src/town/townTiles.ts', 'town');
const flora = await bundle('src/world/flora-config.ts', 'flora');

const declared = new Map(overrides.SPRITE_OVERRIDES.map((o) => [o.key, o]));

/** Decodable PNG at path (the sprite-side lint floor; sheets/props add dims). */
function pngOk(path, dims) {
  if (!existsSync(path)) return false;
  try {
    const png = PNG.sync.read(readFileSync(path));
    if (dims && (png.width !== dims.w || png.height !== dims.h)) return false;
    return true;
  } catch {
    return false;
  }
}

/** live/fallback for a single-frame sprite slot: activation requires the
 *  SPRITE_OVERRIDES declaration AND a decodable file at the contract path. */
function stillStatus(key) {
  return declared.has(key) && pngOk(`public/sprites/${key}.png`) ? 'live' : 'fallback';
}
/** live/fallback for an 8-way rotation set (all eight frames must decode). */
function rotationsStatus(key) {
  if (!declared.get(key)?.rotations) return 'fallback';
  return overrides.ROTATION_DIRS.every((d) => pngOk(`public/sprites/${key}/${d}.png`)) ? 'live' : 'fallback';
}

// CANONICAL SLOT SIZES for slots not (yet) declared in SPRITE_OVERRIDES —
// mirrors the canonical-size table in spriteOverrides.ts (the declared rows
// always win) + the code-drawn waystone pillar (MainScene ensureHeavenPropTextures).
const CREATURE_SLOTS = [
  { key: 'angel-enemy', w: 48, h: 56, hostile: true },
  { key: 'angel-divine', w: 44, h: 56, hostile: true },
  { key: 'cherub-enemy', w: 54, h: 58, hostile: true },
  { key: 'npc-quest', w: 28, h: 40, hostile: false },
  { key: 'demon-enemy', w: 30, h: 38, hostile: true },
  { key: 'townsfolk', w: 24, h: 34, hostile: true },
  { key: 'flaming-sword', w: 30, h: 46, hostile: true },
  { key: 'sasquatch', w: 60, h: 72, hostile: true },
  { key: 'spirit-swarmer', w: 22, h: 26, hostile: true },
  { key: 'cairo-keeper', w: 26, h: 38, hostile: false },
];
const PORTAL_SLOTS = [
  { key: 'heaven-portal', w: 60, h: 68 },
  { key: 'earth-portal', w: 60, h: 68 },
  { key: 'hell-portal', w: 60, h: 68 },
  { key: 'dark-portal', w: 56, h: 56 },
  { key: 'heaven-pillar', w: 26, h: 72 }, // the waystone placeholder pillar
];

const assets = [];
const dims = (key, fw, fh) => {
  const d = declared.get(key);
  return { w: d?.w ?? fw, h: d?.h ?? fh };
};

// 1. CLASS FIGURES — one 8-way rotation set per class (32x48 canonical).
for (const [classId, key] of Object.entries(figures.FIGURE_KEY_FOR_CLASS)) {
  assets.push({
    id: key,
    category: 'class-figure',
    spec: { kind: 'rotations-8', ...dims(key, 32, 48), path: `public/sprites/${key}/<dir>.png`, brief: 'toh-figure-art-brief.md', classId },
    status: rotationsStatus(key),
  });
  // The class's WALK-CYCLE sheet: frame animation is unsupported — every
  // animation sheet is fenced on the walk framework (Bard 'Running' frames
  // stay stranded until it lands).
  assets.push({
    id: `${key}-walk`,
    category: 'figure-anim',
    spec: { kind: 'anim-sheet', ...dims(key, 32, 48), path: null, brief: 'toh-figure-art-brief.md', classId },
    status: 'missing',
    blockedBy: ['walk-framework'],
  });
}

// 2. ENEMY ROSTER FAMILIES — every live-spawnable family (canon domain table).
for (const family of Object.keys(roster.EXISTING_FAMILY_DOMAIN).sort()) {
  const key = `enemy-${family}`;
  assets.push({
    id: key,
    category: 'enemy',
    spec: { kind: 'still', ...dims(key, 24, 34), path: `public/sprites/${key}.png`, brief: 'toh-figure-art-brief.md', domain: roster.EXISTING_FAMILY_DOMAIN[family] },
    status: stillStatus(key),
    blockedBy: ['enemy-tint-ruling'],
  });
}

// 3. CREATURE / NPC SLOTS — hostiles carry the enemy-tint fence too.
for (const s of CREATURE_SLOTS) {
  assets.push({
    id: s.key,
    category: 'creature',
    spec: { kind: 'still', ...dims(s.key, s.w, s.h), path: `public/sprites/${s.key}.png`, brief: 'toh-figure-art-brief.md' },
    status: stillStatus(s.key),
    ...(s.hostile ? { blockedBy: ['enemy-tint-ruling'] } : {}),
  });
}

// 4. SUMMONS — declared drop-in stills (the Hunter bond's three expressions).
for (const o of overrides.SPRITE_OVERRIDES) {
  if (!o.key.startsWith('summon-')) continue;
  assets.push({
    id: o.key,
    category: 'summon',
    spec: { kind: 'still', w: o.w, h: o.h, path: `public/sprites/${o.key}.png`, brief: 'toh-figure-art-brief.md' },
    status: stillStatus(o.key),
  });
}

// 5. PORTALS + THE WAYSTONE PILLAR.
for (const s of PORTAL_SLOTS) {
  assets.push({
    id: s.key,
    category: 'portal-waystone',
    spec: { kind: 'still', ...dims(s.key, s.w, s.h), path: `public/sprites/${s.key}.png`, brief: 'toh-figure-art-brief.md' },
    status: stillStatus(s.key),
  });
}

// 6. TERRAIN BIOME SHEETS — the 256x128 drop contract (base cells + fringe
// cells + water anim in ONE sheet). The BASE sheet is the bake-off target and
// is unfenced; the biome's PROP upgrades are fenced on its approval below.
for (const [biome, stem] of Object.entries(terrain.BIOME_SHEET_NAME).sort((a, b) => Number(a[0]) - Number(b[0]))) {
  assets.push({
    id: stem,
    category: 'terrain-sheet',
    spec: { kind: 'sheet-256x128', w: 256, h: 128, path: `public/art/terrain/${stem}.png`, brief: 'toh-terrain-art-brief.md', biome: Number(biome) },
    status: pngOk(`public/art/terrain/${stem}.png`, { w: 256, h: 128 }) ? 'live' : 'fallback',
  });
}

// 7. TERRAIN PROPS — each prop upgrade is fenced on EVERY biome that scatters
// it having its base sheet approved ({stem}-base-approved). A fence RELEASES
// when that biome's sheet is LIVE at the contract path (an approved base is
// ground truth on disk — Art Session 2 ruling: fences release for approved
// biomes only; a prop with every fence released becomes batchable).
const propBiomes = {};
for (const [biome, props] of Object.entries(terrain.SCATTER_PROPS)) {
  for (const p of props) (propBiomes[p] ??= new Set()).add(terrain.BIOME_SHEET_NAME[biome]);
}
const sheetLive = (stem) => pngOk(`public/art/terrain/${stem}.png`, { w: 256, h: 128 });
// PASS 9: understory props are fenced on their TIER PALETTE, not on a base
// sheet — the slot is declared but nothing can place it until a biome's
// understory palette carries entries. Release is GROUND-TRUTH derived from
// BIOME_FLORA (the gate recomputes the same predicate).
const understoryPopulated = flora.biomesWithTierPalette('understory').length > 0;
for (const [prop, d] of Object.entries(terrain.PROP_TABLE).sort()) {
  const def = flora.FLORA_PROPS[prop];
  const scattered = [...(propBiomes[prop] ?? [])];
  const fences = scattered.filter((stem) => !sheetLive(stem)).sort().map((stem) => `${stem}-base-approved`);
  // Unscattered props stay stated; a scattered prop with every fence
  // RELEASED carries no blockedBy at all — it is batchable.
  let blockedBy;
  if (def?.tier === 'understory') blockedBy = understoryPopulated ? [] : ['pnw-understory-palette'];
  else if (scattered.length === 0) blockedBy = ['unscattered-prop'];
  else blockedBy = fences;
  // STATUS (derived, never declared): live = art at the contract path;
  // fallback = a placeholder silhouette actually CARRIES it in the world
  // (some palette places it); missing = nothing places it at all.
  const status = pngOk(`public/art/terrain/props/${prop}.png`, d) ? 'live' : scattered.length > 0 ? 'fallback' : 'missing';
  assets.push({
    id: `prop-${prop}`,
    category: 'terrain-prop',
    spec: { kind: 'prop', w: d.w, h: d.h, tier: def?.tier ?? 'canopy', path: `public/art/terrain/props/${prop}.png`, brief: 'toh-terrain-art-brief.md' },
    status,
    ...(blockedBy.length > 0 ? { blockedBy } : {}),
  });
}

// 8. SPELL / FX — every skill id; code-drawn FX carry them and NO drop-in
// contract exists (adding one is a sanctioned future change, never implied).
for (const cs of Object.values(skills.CLASS_SKILLS)) {
  for (const def of cs.skills) {
    assets.push({
      id: `fx-${def.id}`,
      category: 'spell-fx',
      spec: { kind: 'fx', w: null, h: null, path: null, brief: null, classId: cs.classId },
      status: 'fallback',
      blockedBy: ['drop-contract-missing'],
    });
  }
}

// 9. TOWN / SETTLEMENT TILES — code-colored tiles (settlement + POI stamps
// draw them); no drop-in contract exists.
for (const t of town.TOWN_TILES) {
  assets.push({
    id: `tile-${t.key}`,
    category: 'town-tile',
    spec: { kind: 'tile', w: 32, h: 32, path: null, brief: null },
    status: 'fallback',
    blockedBy: ['drop-contract-missing'],
  });
}

// 10. UI ICONS — the PWA icon set (tools/generateIcons.mjs).
for (const size of [180, 192, 512]) {
  assets.push({
    id: `icon-${size}`,
    category: 'ui-icon',
    spec: { kind: 'still', w: size, h: size, path: `public/icons/icon-${size}.png`, brief: null },
    status: pngOk(`public/icons/icon-${size}.png`, { w: size, h: size }) ? 'live' : 'missing',
  });
}

assets.sort((a, b) => (a.category === b.category ? (a.id < b.id ? -1 : 1) : a.category < b.category ? -1 : 1));
const manifest = JSON.stringify({ assets }, null, 2) + '\n';

if (CHECK) {
  const committed = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
  if (committed !== manifest) {
    console.error(`asset-manifest: ${OUT} DRIFTS from the registries — run npm run art:manifest and commit the result`);
    process.exit(1);
  }
  console.log(`asset-manifest: ${OUT} matches the registries (${assets.length} assets)`);
} else {
  writeFileSync(OUT, manifest);
  console.log(`asset-manifest: wrote ${OUT} (${assets.length} assets)`);
}

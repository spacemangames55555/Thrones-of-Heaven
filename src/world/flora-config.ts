import { Biome } from './terrain-schema';

/**
 * FLORA CONFIG (Pass 9) — the structural home of world scatter: WHAT can
 * grow (the prop table), WHERE it grows (per-biome, per-tier weighted
 * palettes), and HOW MUCH (per-tier density). Future art sessions add ROWS
 * here and palette entries — never code.
 *
 * This module is the SOURCE OF TRUTH; terrain-visuals-config re-exports the
 * legacy views (PROP_TABLE / SCATTER_PROPS / SCATTER_DENSITY) derived from
 * these tables, so every existing consumer (the art lint, the asset
 * manifest, the drop pipeline, the gate) keeps reading one truth.
 *
 * BEHAVIOR AT SHIP: the canopy tier reproduces the Pass 5 scatter model
 * EXACTLY — same densities, same candidate sets, same hash discipline, same
 * in-tile offsets (the migration-silence gate proves byte-identity over
 * 5,000 tiles). The understory tier exists but every palette is EMPTY, so
 * it renders nothing until art and a palette entry land together.
 */

export type FloraTier = 'canopy' | 'understory';
export const FLORA_TIERS: readonly FloraTier[] = ['canopy', 'understory'];

/** Boot-canvas silhouette classes (terrain-placeholder draws these). A prop
 *  with no art file falls back to its class silhouette — the Pass 5 rule,
 *  now declared per row instead of inferred from the id prefix. */
export type SilhouetteClass = 'conifer' | 'broadleaf' | 'cactus' | 'pillar' | 'lump' | 'fern-frond' | 'shrub-blob' | 'log-lump' | 'stump';

export interface FloraProp {
  /** Exact drop-contract size (px) — art at artPath must match. */
  w: number;
  h: number;
  tier: FloraTier;
  /**
   * Does this prop block movement? FALSE for every shipped prop — VERIFIED
   * against the live path, not assumed: scatter props are pooled IMAGES with
   * no physics body anywhere in the renderer, so nothing scattered has ever
   * collided (boulders included). The field is declared so a future,
   * sanctioned pass can flip a row and wire footprints; flipping it is a
   * BEHAVIOR change and needs its own ruling.
   */
  collides: boolean;
  silhouette: SilhouetteClass;
  /** Drop path for real art (the lint + manifest contract). */
  artPath: string;
  /**
   * The band-checked anchor color this prop was generated against (Art
   * Sessions 2-3). Render-time tint jitter is solved AT this color, so the
   * approved identity is what the bands protect. Null = no approved anchor
   * yet (placeholder-only rows); those get value-only jitter.
   */
  anchor: number | null;
  /** Per-prop variation overrides (see FLORA_VARIATION). */
  variation?: { scale?: false };
}

const propPath = (id: string) => `public/art/terrain/props/${id}.png`;

/**
 * THE PROP TABLE. Canopy rows first (the six live PNW props + the fenced
 * Egypt/swamp rows + the reserved waystone), then the understory rows that
 * ship as declared-but-unpopulated slots.
 */
export const FLORA_PROPS: Record<string, FloraProp> = {
  // ── Canopy: the live PNW set (Art Session 3, band-checked anchors) ──────
  'tree-fir-a': { w: 48, h: 64, tier: 'canopy', collides: false, silhouette: 'conifer', artPath: propPath('tree-fir-a'), anchor: 0x3a5f4a },
  'tree-fir-b': { w: 48, h: 64, tier: 'canopy', collides: false, silhouette: 'conifer', artPath: propPath('tree-fir-b'), anchor: 0x3a5f4a },
  'tree-broad-a': { w: 48, h: 64, tier: 'canopy', collides: false, silhouette: 'broadleaf', artPath: propPath('tree-broad-a'), anchor: 0x2f6d3a },
  'tree-broad-b': { w: 48, h: 64, tier: 'canopy', collides: false, silhouette: 'broadleaf', artPath: propPath('tree-broad-b'), anchor: 0x2f6d3a },
  // GEOLOGY DOES NOT GROW: a scale-jittered boulder reads as a floating rock
  // (the eye knows stone size from its texture), so boulders take mirror +
  // tint variation only. Stated here, enforced by the variation resolver.
  'boulder-a': { w: 32, h: 32, tier: 'canopy', collides: false, silhouette: 'lump', artPath: propPath('boulder-a'), anchor: 0x7d7a74, variation: { scale: false } },
  'boulder-b': { w: 32, h: 32, tier: 'canopy', collides: false, silhouette: 'lump', artPath: propPath('boulder-b'), anchor: 0x7d7a74, variation: { scale: false } },
  // ── Canopy: fenced rows (no art yet — placeholder silhouettes carry them) ─
  'cactus-a': { w: 32, h: 48, tier: 'canopy', collides: false, silhouette: 'cactus', artPath: propPath('cactus-a'), anchor: null },
  'scrub-a': { w: 32, h: 32, tier: 'canopy', collides: false, silhouette: 'lump', artPath: propPath('scrub-a'), anchor: null },
  'swamp-tree-a': { w: 48, h: 64, tier: 'canopy', collides: false, silhouette: 'conifer', artPath: propPath('swamp-tree-a'), anchor: null },
  'swamp-tree-b': { w: 48, h: 64, tier: 'canopy', collides: false, silhouette: 'conifer', artPath: propPath('swamp-tree-b'), anchor: null },
  // Reserved hero object — its own mini bake-off, never batched (ledgered).
  waystone: { w: 32, h: 64, tier: 'canopy', collides: false, silhouette: 'pillar', artPath: propPath('waystone'), anchor: null },
  // ── Canopy adds (Art Session 4) ────────────────────────────────────────
  // Cedar: a second PNW conifer, shaggier and broader than the firs.
  'cedar-a': { w: 48, h: 64, tier: 'canopy', collides: false, silhouette: 'conifer', artPath: propPath('cedar-a'), anchor: 0x3a5f4a },
  // Snag: a DEAD standing trunk. Nearest existing silhouette class is
  // 'stump' — the same dead-wood object, just tall (a 'conifer' triangle
  // would draw it alive and green, 'pillar' would draw it as blue stone).
  'snag-a': { w: 48, h: 64, tier: 'canopy', collides: false, silhouette: 'stump', artPath: propPath('snag-a'), anchor: 0x6b5a49 },
  // ── Understory: declared slots, EMPTY in every palette at ship ──────────
  'fern-sword-a': { w: 32, h: 32, tier: 'understory', collides: false, silhouette: 'fern-frond', artPath: propPath('fern-sword-a'), anchor: null },
  'fern-sword-b': { w: 32, h: 32, tier: 'understory', collides: false, silhouette: 'fern-frond', artPath: propPath('fern-sword-b'), anchor: null },
  'salal-a': { w: 32, h: 32, tier: 'understory', collides: false, silhouette: 'shrub-blob', artPath: propPath('salal-a'), anchor: null },
  'stump-a': { w: 32, h: 32, tier: 'understory', collides: false, silhouette: 'stump', artPath: propPath('stump-a'), anchor: null },
  'log-a': { w: 48, h: 32, tier: 'understory', collides: false, silhouette: 'log-lump', artPath: propPath('log-a'), anchor: null },
  'sapling-fir-a': { w: 32, h: 32, tier: 'understory', collides: false, silhouette: 'conifer', artPath: propPath('sapling-fir-a'), anchor: null },
};

export interface FloraPaletteEntry {
  propId: string;
  /** Relative pick weight within its tier palette (integers by convention). */
  weight: number;
}
export interface FloraTierConfig {
  /** Probability per scatter-allowed tile. 0 (or an empty palette) = inert. */
  density: number;
  palette: readonly FloraPaletteEntry[];
}

/** Equal weights across a palette reproduce the Pass 5 uniform pick exactly
 *  (see pickWeighted) — the shipped canopy palettes are all weight 1. */
const even = (...ids: string[]): FloraPaletteEntry[] => ids.map((propId) => ({ propId, weight: 1 }));
const EMPTY_UNDERSTORY: FloraTierConfig = { density: 0, palette: [] };

/**
 * BIOME FLORA: per biome, per tier. The canopy numbers and candidate ORDER
 * are the Pass 5 tables verbatim — do not reorder a palette without a
 * migration ruling (order + weights decide which prop a tile's hash lands
 * on, so a reorder silently re-plants the whole world).
 */
export const BIOME_FLORA: Record<number, Record<FloraTier, FloraTierConfig>> = {
  // ART SESSION 4: the PNW gains an understory and two more canopy species.
  // Adding a weighted entry RE-ROLLS which species each tile holds (the
  // palette is the pick space) — an intended re-plant, not a regression.
  // Weights + densities are INITIAL values; the density feel ruling is the
  // dressed-forest ride's job (ledgered).
  [Biome.FOREST]: {
    canopy: {
      density: 0.3,
      palette: [
        { propId: 'tree-broad-a', weight: 1 },
        { propId: 'tree-broad-b', weight: 1 },
        { propId: 'tree-fir-a', weight: 1 },
        { propId: 'cedar-a', weight: 20 },
        { propId: 'snag-a', weight: 5 },
      ],
    },
    understory: {
      density: 0.45,
      palette: [
        { propId: 'fern-sword-a', weight: 30 },
        { propId: 'fern-sword-b', weight: 30 },
        { propId: 'salal-a', weight: 20 },
        { propId: 'sapling-fir-a', weight: 10 },
        { propId: 'stump-a', weight: 5 },
        { propId: 'log-a', weight: 5 },
      ],
    },
  },
  [Biome.TAIGA]: {
    canopy: {
      density: 0.22,
      palette: [
        { propId: 'tree-fir-a', weight: 1 },
        { propId: 'tree-fir-b', weight: 1 },
        { propId: 'cedar-a', weight: 10 },
        { propId: 'snag-a', weight: 10 },
      ],
    },
    understory: {
      density: 0.35,
      palette: [
        { propId: 'fern-sword-a', weight: 25 },
        { propId: 'fern-sword-b', weight: 25 },
        { propId: 'salal-a', weight: 15 },
        { propId: 'sapling-fir-a', weight: 20 },
        { propId: 'stump-a', weight: 10 },
        { propId: 'log-a', weight: 5 },
      ],
    },
  },
  [Biome.SWAMP]: {
    canopy: { density: 0.15, palette: even('swamp-tree-a', 'swamp-tree-b') },
    understory: EMPTY_UNDERSTORY,
  },
  [Biome.ROCK]: {
    canopy: { density: 0.05, palette: even('boulder-a', 'boulder-b') },
    understory: EMPTY_UNDERSTORY,
  },
  [Biome.DESERT]: {
    canopy: { density: 0.03, palette: even('cactus-a', 'scrub-a') },
    understory: EMPTY_UNDERSTORY,
  },
};

/** Deterministic tile hash — the ONE flora/offset source (no Math.random).
 *  Lives here because the hash discipline IS the flora contract;
 *  terrain-visuals re-exports it for the existing call sites. */
export function tileHash01(tx: number, ty: number, salt: number): number {
  let h = (Math.imul(tx, 374761393) + Math.imul(ty, 668265263)) ^ salt;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Hash salts — the Pass 5 constants, XORed with a per-tier salt so the
 *  understory tier never correlates with the canopy above it. CANOPY'S SALT
 *  IS 0: `x ^ 0 === x`, so canopy hashing is bit-for-bit the Pass 5 path. */
export const FLORA_SALT = { density: 0x5ca77e12, pick: 0x9e3779b9, ox: 0x1b873593, oy: 0x85ebca6b } as const;
export const TIER_SALT: Record<FloraTier, number> = { canopy: 0, understory: 0x00c0ffee };

/**
 * Weighted pick from a tier palette. With every weight 1 this is exactly
 * `palette[floor(r * n)]` — the Pass 5 uniform pick — which is why the
 * shipped config migrates in silence.
 */
export function pickWeighted(palette: readonly FloraPaletteEntry[], r01: number): string {
  let total = 0;
  for (const e of palette) total += e.weight;
  let x = r01 * total;
  for (const e of palette) {
    x -= e.weight;
    if (x < 0) return e.propId;
  }
  return palette[palette.length - 1].propId;
}

/**
 * PURE flora reference: what (if anything) grows on a global tile of a given
 * biome in a given tier. The streamer's per-chunk lists and the gate's
 * recompute both call exactly this. Null when the tier is inert, the roll
 * fails, or the biome grows nothing.
 */
export function floraFor(tx: number, ty: number, biome: number, tier: FloraTier): { id: string; ox: number; oy: number } | null {
  const cfg = BIOME_FLORA[biome]?.[tier];
  if (!cfg || cfg.density <= 0 || cfg.palette.length === 0) return null;
  const salt = TIER_SALT[tier];
  if (tileHash01(tx, ty, FLORA_SALT.density ^ salt) >= cfg.density) return null;
  return {
    id: pickWeighted(cfg.palette, tileHash01(tx, ty, FLORA_SALT.pick ^ salt)),
    ox: Math.round((tileHash01(tx, ty, FLORA_SALT.ox ^ salt) - 0.5) * 20),
    oy: Math.round((tileHash01(tx, ty, FLORA_SALT.oy ^ salt) - 0.5) * 20),
  };
}

/** Movement footprint of a prop instance, or null when it does not collide.
 *  Derived from the CONTRACT size only — render-time scale jitter never
 *  reaches this (gate: collision-invariance). */
export function floraFootprint(propId: string): { w: number; h: number } | null {
  const p = FLORA_PROPS[propId];
  if (!p || !p.collides) return null;
  return { w: p.w, h: p.h };
}

// ── RENDER-TIME VARIATION (Pass 9 Commit 2) ─────────────────────────────────

export interface TierVariation {
  enabled: boolean;
  /** Horizontal flip on ~50% of instances. */
  mirror: boolean;
  /** Uniform scale band [min, max], applied about the bottom-center anchor. */
  scale: readonly [number, number];
  /** Value (brightness) jitter depth — see the DARKEN-ONLY note below. */
  valuePct: number;
  /** Saturation jitter, +/- this fraction, hue untouched. */
  satPct: number;
}

/**
 * Per-tier variation bands. Free variety from the SAME hash family that
 * placed the instance — no extra state, no per-frame randomness.
 *
 * VALUE IS DARKEN-ONLY, and that is a platform fact, not a preference: a
 * Phaser tint MULTIPLIES the texture, so it can darken but can never
 * brighten. The value jitter therefore runs [1 - valuePct, 1]: every
 * approved anchor stays the BRIGHTEST instance of itself and variation only
 * pushes into shadow. (Brightening would need pre-baked lighter textures —
 * ledgered, not smuggled in here.)
 *
 * Saturation moves both ways: raising saturation multiplies the WEAK
 * channels down, which a multiply tint does exactly. The solve below runs
 * at the prop's band-checked ANCHOR color, so the identity Casey approved
 * is the one the math protects.
 */
export const FLORA_VARIATION: Record<FloraTier, TierVariation> = {
  canopy: { enabled: true, mirror: true, scale: [0.85, 1.15], valuePct: 0.04, satPct: 0.03 },
  understory: { enabled: true, mirror: true, scale: [0.9, 1.1], valuePct: 0.04, satPct: 0.03 },
};

/**
 * UNDERSTORY POOL CAP — DERIVED, not picked: the canopy pool holds 900 for
 * densities up to 0.30, and the understory tier is speced to support 2-3x
 * canopy density, so 3 x SCATTER_POOL_CAP keeps the SAME per-instance
 * headroom at the top of that range. (Gate: understory-pool proves stability
 * at 3x density in a real drive.)
 */
export const UNDERSTORY_POOL_CAP = 2700;

/** Variation hash salts (same family, disjoint from placement). */
export const VARIATION_SALT = { mirror: 0x27d4eb2f, scale: 0x165667b1, value: 0x2545f491, sat: 0x9e3779b1 } as const;

/** GUARANTEED achieved-value floor at the anchor: the jitter itself takes at
 *  most valuePct, and the multiply normalization can take at most satPct
 *  more, so no instance sits below (1 - valuePct - satPct) of the anchor's
 *  value. (Measured envelope today: 0.961-1.000 — normalization never bites
 *  for the shipped anchors.) The gate asserts the live envelope inside it. */
export const VARIATION_VALUE_FLOOR = 1 - 0.04 - 0.03;

/** Below this anchor saturation, HUE AND SATURATION ARE ILL-CONDITIONED — a
 *  one-step channel change swings the computed hue wildly (measured: 2.4 deg
 *  on the gray boulder anchor vs 0.4 deg on the greens). Near-neutral anchors
 *  therefore take VALUE-ONLY jitter, which is exactly hue- and
 *  saturation-preserving for every source pixel. Geology varies least. */
export const NEUTRAL_ANCHOR_SAT = 0.2;

function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
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
}
function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  const seg = Math.floor(((h % 360) + 360) % 360 / 60) % 6;
  const [r1, g1, b1] = [
    [c, x, 0],
    [x, c, 0],
    [0, c, x],
    [0, x, c],
    [x, 0, c],
    [c, 0, x],
  ][seg];
  return [(r1 + m) * 255, (g1 + m) * 255, (b1 + m) * 255];
}

export interface FloraVariationResult {
  mirror: boolean;
  scale: number;
  /** Phaser multiply tint (0xrrggbb); 0xffffff = untouched. */
  tint: number;
}

/**
 * Deterministic per-instance variation for the prop planted at a tile.
 * Same tile + same tier + same prop => same result, forever, on any thread.
 */
export function floraVariation(tx: number, ty: number, tier: FloraTier, propId: string): FloraVariationResult {
  const band = FLORA_VARIATION[tier];
  const prop = FLORA_PROPS[propId];
  if (!band?.enabled) return { mirror: false, scale: 1, tint: 0xffffff };
  const salt = TIER_SALT[tier];
  const mirror = band.mirror && tileHash01(tx, ty, VARIATION_SALT.mirror ^ salt) < 0.5;
  // Geology never scales (see the boulder rows) — mirror + tint only.
  const scale =
    prop?.variation?.scale === false ? 1 : band.scale[0] + tileHash01(tx, ty, VARIATION_SALT.scale ^ salt) * (band.scale[1] - band.scale[0]);
  // Value: darken-only band. Saturation: symmetric around the anchor.
  const dv = 1 - tileHash01(tx, ty, VARIATION_SALT.value ^ salt) * band.valuePct;
  const ds = 1 + (tileHash01(tx, ty, VARIATION_SALT.sat ^ salt) * 2 - 1) * band.satPct;
  const anchor = prop?.anchor ?? null;
  let tint: number;
  if (anchor === null) {
    // No approved anchor: a NEUTRAL multiply — scales value, leaves hue and
    // saturation mathematically untouched for any source pixel.
    const g = Math.round(Math.max(0, Math.min(255, 255 * dv)));
    tint = (g << 16) | (g << 8) | g;
  } else {
    const ar = (anchor >> 16) & 255;
    const ag = (anchor >> 8) & 255;
    const ab = anchor & 255;
    const hsv0 = rgbToHsv(ar, ag, ab);
    if (Math.min(ar, ag, ab) < 8 || hsv0.s < NEUTRAL_ANCHOR_SAT) {
      // Degenerate channel OR a near-neutral anchor: value-only multiply,
      // which preserves hue and saturation exactly (see NEUTRAL_ANCHOR_SAT).
      const g = Math.round(Math.max(0, Math.min(255, 255 * dv)));
      tint = (g << 16) | (g << 8) | g;
    } else {
      const hsv = hsv0;
      const target = hsvToRgb(hsv.h, Math.max(0, Math.min(1, hsv.s * ds)), Math.max(0, Math.min(1, hsv.v * dv)));
      // Per-channel multiply that maps the ANCHOR exactly onto the target.
      let t = [target[0] / ar, target[1] / ag, target[2] / ab];
      // A multiply can never exceed 1 — normalize the whole tint down so the
      // largest channel lands at 1. Hue and the saturation RATIO survive
      // exactly; only value takes the extra (bounded) step into shadow.
      const mx = Math.max(...t);
      if (mx > 1) t = t.map((c) => c / mx);
      const [r, g, b] = t.map((c) => Math.round(Math.max(0, Math.min(255, c * 255))));
      tint = (r << 16) | (g << 8) | b;
    }
  }
  return { mirror, scale, tint };
}

/** Every prop id of a tier (manifest + placeholder builders read this). */
export function propsOfTier(tier: FloraTier): string[] {
  return Object.keys(FLORA_PROPS).filter((id) => FLORA_PROPS[id].tier === tier);
}

/** Biomes whose tier palette actually carries entries (ground truth for the
 *  manifest's understory fence — both the builder and the gate derive the
 *  release from THIS, never from a declaration). */
export function biomesWithTierPalette(tier: FloraTier): number[] {
  return Object.keys(BIOME_FLORA)
    .map(Number)
    .filter((b) => (BIOME_FLORA[b][tier]?.palette.length ?? 0) > 0);
}

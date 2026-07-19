import Phaser from 'phaser';

/**
 * SPRITE DROP-IN OVERRIDES — the artist path for characters, NPCs, and portals.
 *
 * Every creature today is a single code-drawn texture under a stable key. To
 * replace one with real art (no code changes at any call site):
 *   1. Drop the PNG at  public/sprites/<texture-key>.png  (any resolution —
 *      64/128px masters downscale cleanly; transparency respected).
 *   2. Add ONE line to {@link SPRITE_OVERRIDES} with the texture key and its
 *      CANONICAL size from the table below (hitboxes and display code key off
 *      that size, so it never changes with the art).
 * At boot the PNG is auto-fitted into a canvas texture of exactly that size
 * under the same key; every entity's ensure-texture guard then sees the key
 * exists and skips its gray-box drawing. A missing/failed file falls back to
 * the code-drawn texture — additive and fallback-safe, zero change until art
 * ships.
 *
 * FITTING: the source's OPAQUE CONTENT (its non-transparent bounding box) is
 * fitted into the canonical canvas preserving aspect, anchored bottom-center —
 * feet on the ground, empty master margins discarded — so square 128px masters
 * land undistorted in the 32×48 figure frame.
 *
 * ROTATIONS (8-way art): set `rotations: true` and drop EIGHT PNGs at
 *   public/sprites/<texture-key>/<dir>.png   (dir ∈ {@link ROTATION_DIRS}).
 * Each direction mints `<texture-key>-<dir>` at the canonical size, and the
 * SOUTH frame also mints the canonical `<texture-key>` itself (so every
 * existing call site simply shows the south-facing art). One shared content
 * box (the union across all 8 frames) sizes every direction identically, so
 * turning never makes the figure pulse. {@link rotationTextureFor} maps a
 * facing vector to the right key; the Player swaps frames as it turns.
 *
 * ── CANONICAL TEXTURE SIZES (px, from the code-drawn originals) ──────────────
 *   player-figure 32×48 · wizard-figure 32×48 · necro-figure 32×48
 *   angel-enemy 48×56 · angel-divine 44×56 · cherub-enemy 54×(see Cherub.ts)
 *   npc-quest 28×40 · demon-enemy 30×38 · townsfolk 24×34 (variants are tints)
 *   flaming-sword 30×46 · sasquatch 60×72 · spirit-swarmer 22×26
 *   heaven-portal 60×68 · earth-portal 60×68 · hell-portal 60×68
 *   dark-portal 56×56 · cairo-keeper 26×38
 * ──────────────────────────────────────────────────────────────────────────────
 */
export const SPRITE_OVERRIDES: { key: string; w: number; h: number; rotations?: boolean }[] = [
  // Necromancer — real 8-way pixel art (128px masters in public/sprites/necro-figure/).
  { key: 'necro-figure', w: 32, h: 48, rotations: true },
  // Bard + Hunter — real 8-way pixel art (244px masters in their folders).
  { key: 'bard-figure', w: 32, h: 48, rotations: true },
  { key: 'hunter-figure', w: 32, h: 48, rotations: true },
  // The Hunter bond's three expressions all wear the armored-bear art (a single
  // still — summons don't turn). The wild pack is NOT the bond and keeps its own look.
  { key: 'summon-hunter_companion', w: 46, h: 56 },
  { key: 'summon-hunter_great', w: 46, h: 56 },
  { key: 'summon-hunter_horde', w: 46, h: 56 },
  // Enemy roster families — generated grayscale art (scripts/gen-sprites.mjs),
  // each at the canonical size of the shared key it replaces (tinted at runtime).
  { key: 'enemy-corrupted-wildlife', w: 24, h: 34 },
  { key: 'enemy-evil-raiders', w: 24, h: 34 },
  { key: 'enemy-veil-ambushers', w: 24, h: 34 },
  { key: 'enemy-hollowed-brutes', w: 24, h: 34 },
  { key: 'enemy-lesser-evil-scouts', w: 30, h: 38 },
  { key: 'enemy-herald-angels', w: 48, h: 56 },
  { key: 'enemy-radiant-guardians', w: 48, h: 56 },
  { key: 'enemy-lesser-angels', w: 48, h: 56 },
  { key: 'enemy-dark-casters', w: 48, h: 56 },
];

/** The eight rotation frame names (file + key suffixes), compass-fixed. */
export const ROTATION_DIRS = ['south', 'south-east', 'east', 'north-east', 'north', 'north-west', 'west', 'south-west'] as const;

/** Cache key the raw override PNG loads under (the canonical key is minted later). */
function rawKey(key: string): string {
  return `sprite-src-${key}`;
}

/** Queue every listed override PNG for loading. Call from a scene's preload(). */
export function preloadSpriteOverrides(scene: Phaser.Scene): void {
  for (const { key, rotations } of SPRITE_OVERRIDES) {
    if (rotations) {
      for (const dir of ROTATION_DIRS) {
        if (!scene.textures.exists(rawKey(`${key}-${dir}`))) scene.load.image(rawKey(`${key}-${dir}`), `sprites/${key}/${dir}.png`);
      }
    } else if (!scene.textures.exists(rawKey(key))) {
      scene.load.image(rawKey(key), `sprites/${key}.png`);
    }
  }
}

/** The set of base keys whose 8-way rotation art actually loaded + applied —
 *  what {@link rotationTextureFor} (and the runtime gate) key off. */
const rotatedKeys = new Set<string>();

/** True when 8-way art shipped for this base texture key. */
export function hasRotationArt(key: string): boolean {
  return rotatedKeys.has(key);
}

/** Single-frame keys whose drop-in art actually loaded + applied at boot. */
const artKeys = new Set<string>();

/** True when real drop-in art shipped for this texture key — call sites that
 *  layer a stylizing tint over their code-drawn placeholder (e.g. the summon
 *  hit-flash restore) skip it for full-color art. */
export function hasOverrideArt(key: string): boolean {
  return artKeys.has(key);
}

/** Map a facing vector to this base key's rotation texture (screen-space:
 *  +y = south). Returns null when no rotation art shipped for the key. */
export function rotationTextureFor(key: string, facingX: number, facingY: number): string | null {
  if (!rotatedKeys.has(key)) return null;
  // Octant index from the facing angle: east=0 → south-east=1 → … (45° steps).
  const oct = (Math.round(Math.atan2(facingY, facingX) / (Math.PI / 4)) + 8) % 8;
  const byOctant = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'] as const;
  return `${key}-${byOctant[oct]}`;
}

/** The opaque-content bounding box of a loaded image (alpha > 8), or null for
 *  a fully transparent / unreadable source. */
function contentBounds(src: HTMLImageElement | HTMLCanvasElement): { x: number; y: number; w: number; h: number } | null {
  const cvs = document.createElement('canvas');
  cvs.width = src.width;
  cvs.height = src.height;
  const ctx = cvs.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(src, 0, 0);
  const data = ctx.getImageData(0, 0, cvs.width, cvs.height).data;
  let minX = cvs.width;
  let minY = cvs.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < cvs.height; y++) {
    for (let x = 0; x < cvs.width; x++) {
      if (data[(y * cvs.width + x) * 4 + 3] > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/** Draw `src` into a fresh canonical-size canvas texture under `key`: the crop
 *  box is contain-fitted (aspect preserved) and anchored bottom-center. */
function mintFitted(scene: Phaser.Scene, key: string, w: number, h: number, src: HTMLImageElement | HTMLCanvasElement, crop: { x: number; y: number; w: number; h: number }): boolean {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const canvas = scene.textures.createCanvas(key, w, h);
  if (!canvas) return false;
  const ctx = canvas.context;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  const scale = Math.min(w / crop.w, h / crop.h);
  const dw = crop.w * scale;
  const dh = crop.h * scale;
  ctx.drawImage(src, crop.x, crop.y, crop.w, crop.h, (w - dw) / 2, h - dh, dw, dh);
  canvas.refresh();
  return true;
}

/**
 * Fit ONE loaded source image into a canvas texture of the canonical size
 * under the canonical key (the alignment contract the runtime gate checks).
 * Returns false (fallback: the code-drawn texture) when the source is absent.
 * `srcTextureKey` defaults to the preloaded PNG's cache key; the runtime gate
 * passes a synthetic source to exercise the mechanism without shipping art.
 */
export function applySpriteOverride(scene: Phaser.Scene, key: string, w: number, h: number, srcTextureKey = rawKey(key)): boolean {
  if (!scene.textures.exists(srcTextureKey)) return false;
  const src = scene.textures.get(srcTextureKey).getSourceImage();
  if (!(src instanceof HTMLImageElement || src instanceof HTMLCanvasElement)) return false;
  const crop = contentBounds(src) ?? { x: 0, y: 0, w: src.width, h: src.height };
  return mintFitted(scene, key, w, h, src, crop);
}

/** Apply an 8-way ROTATION set: all eight frames share ONE content box (the
 *  union across frames) so every direction lands at the same scale — turning
 *  never pulses. South also mints the canonical base key. All-or-nothing:
 *  a missing frame falls back to the code-drawn texture for the whole set. */
function applyRotationOverride(scene: Phaser.Scene, key: string, w: number, h: number): boolean {
  const sources: { dir: string; src: HTMLImageElement | HTMLCanvasElement }[] = [];
  for (const dir of ROTATION_DIRS) {
    if (!scene.textures.exists(rawKey(`${key}-${dir}`))) return false;
    const src = scene.textures.get(rawKey(`${key}-${dir}`)).getSourceImage();
    if (!(src instanceof HTMLImageElement || src instanceof HTMLCanvasElement)) return false;
    sources.push({ dir, src });
  }
  let union: { x: number; y: number; w: number; h: number } | null = null;
  for (const { src } of sources) {
    const b = contentBounds(src);
    if (!b) return false;
    if (!union) union = { ...b };
    else {
      const x2 = Math.max(union.x + union.w, b.x + b.w);
      const y2 = Math.max(union.y + union.h, b.y + b.h);
      union.x = Math.min(union.x, b.x);
      union.y = Math.min(union.y, b.y);
      union.w = x2 - union.x;
      union.h = y2 - union.y;
    }
  }
  if (!union) return false;
  for (const { dir, src } of sources) {
    if (!mintFitted(scene, `${key}-${dir}`, w, h, src, union)) return false;
    if (dir === 'south') mintFitted(scene, key, w, h, src, union); // the base key shows south
  }
  rotatedKeys.add(key);
  return true;
}

/** Apply every listed override whose PNG loaded. Run EARLY in create(), before
 *  any entity ensures its texture. Returns how many applied (observable). */
export function applySpriteOverrides(scene: Phaser.Scene): number {
  let applied = 0;
  for (const { key, w, h, rotations } of SPRITE_OVERRIDES) {
    if (rotations ? applyRotationOverride(scene, key, w, h) : applySpriteOverride(scene, key, w, h)) {
      if (!rotations) artKeys.add(key);
      applied++;
    }
  }
  return applied;
}

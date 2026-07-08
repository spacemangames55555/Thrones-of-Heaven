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
 * ships (this list SHIPS EMPTY).
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
export const SPRITE_OVERRIDES: { key: string; w: number; h: number }[] = [];

/** Cache key the raw override PNG loads under (the canonical key is minted later). */
function rawKey(key: string): string {
  return `sprite-src-${key}`;
}

/** Queue every listed override PNG for loading. Call from a scene's preload(). */
export function preloadSpriteOverrides(scene: Phaser.Scene): void {
  for (const { key } of SPRITE_OVERRIDES) {
    if (!scene.textures.exists(rawKey(key))) scene.load.image(rawKey(key), `sprites/${key}.png`);
  }
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
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const canvas = scene.textures.createCanvas(key, w, h);
  if (!canvas) return false;
  const ctx = canvas.context;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, w, h);
  canvas.refresh();
  return true;
}

/** Apply every listed override whose PNG loaded. Run EARLY in create(), before
 *  any entity ensures its texture. Returns how many applied (observable). */
export function applySpriteOverrides(scene: Phaser.Scene): number {
  let applied = 0;
  for (const { key, w, h } of SPRITE_OVERRIDES) {
    if (applySpriteOverride(scene, key, w, h)) applied++;
  }
  return applied;
}

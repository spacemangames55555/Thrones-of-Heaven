import Phaser from 'phaser';

/**
 * Boss placeholder SPRITE LIBRARY. A {@link BossDef}'s sprite.key selects one of
 * these generated textures; the controller tints/scales it. Add a new boss sprite
 * by adding a case here. (Drawn WHITE so the per-boss tint colors it.)
 */
const DRAWERS: Record<string, (g: Phaser.GameObjects.Graphics) => { w: number; h: number }> = {
  // Archangel Michael — ported verbatim from the old entity so he looks IDENTICAL.
  michael: (g) => {
    const w = 64;
    const h = 76;
    const cx = w / 2;
    g.fillStyle(0xffffff, 0.45); // great wings
    g.fillTriangle(cx - 6, 26, 2, 6, 8, 56);
    g.fillTriangle(cx + 6, 26, w - 2, 6, w - 8, 56);
    g.fillStyle(0xffffff, 0.7); // inner wings
    g.fillTriangle(cx - 5, 26, 12, 14, 14, 48);
    g.fillTriangle(cx + 5, 26, w - 12, 14, w - 14, 48);
    g.fillStyle(0xffffff, 1); // robed body
    g.fillRoundedRect(cx - 9, 22, 18, h - 28, 6);
    g.fillCircle(cx, 18, 8); // head
    g.lineStyle(2, 0xffffff, 0.95); // halo
    g.strokeCircle(cx, 11, 7);
    g.fillStyle(0xffffff, 0.9); // raised flaming sword
    g.fillRect(w - 16, 4, 4, 30);
    g.fillStyle(0xffffff, 0.5);
    g.fillCircle(w - 14, 4, 6);
    g.fillStyle(0xffffff, 1);
    g.fillRect(w - 20, 32, 12, 3);
    return { w, h };
  },

  // A generic placeholder boss — a faceted crystalline core with an aura ring +
  // a "?" so it clearly reads as a DEV/test stand-in.
  'test-boss': (g) => {
    const w = 56;
    const h = 56;
    const cx = w / 2;
    const cy = h / 2;
    g.fillStyle(0xffffff, 0.3);
    g.fillCircle(cx, cy, 26);
    g.fillStyle(0xffffff, 0.85);
    g.fillTriangle(cx, 6, w - 8, cy, cx, h - 6);
    g.fillTriangle(cx, 6, 8, cy, cx, h - 6);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(cx, cy, 9);
    g.lineStyle(2, 0xffffff, 0.9);
    g.strokeCircle(cx, cy, 24);
    return { w, h };
  },
};

/** Ensure (generate once) the placeholder texture for a boss sprite key. */
export function ensureBossTexture(scene: Phaser.Scene, key: string): string {
  const textureKey = `boss-${key}`;
  if (scene.textures.exists(textureKey)) return textureKey;
  const draw = DRAWERS[key] ?? DRAWERS['test-boss'];
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  const { w, h } = draw(g);
  g.generateTexture(textureKey, w, h);
  g.destroy();
  return textureKey;
}

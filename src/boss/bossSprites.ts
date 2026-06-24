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

  // SIN 1 — WRATH (the Rusher): an angular, horned, forward-leaning blade-figure
  // (jagged + aggressive). Spikes read as "danger / speed".
  wrath: (g) => {
    const w = 60;
    const h = 64;
    const cx = w / 2;
    g.fillStyle(0xffffff, 0.9); // sharp horns
    g.fillTriangle(cx - 14, 16, cx - 22, -2, cx - 6, 14);
    g.fillTriangle(cx + 14, 16, cx + 22, -2, cx + 6, 14);
    g.fillStyle(0xffffff, 1); // angular body (a downward blade)
    g.fillTriangle(cx, h - 2, 8, 18, w - 8, 18);
    g.fillStyle(0xffffff, 0.85); // chest plate
    g.fillTriangle(cx, h - 18, cx - 14, 22, cx + 14, 22);
    g.fillStyle(0x000000, 0.5); // angry eye slit
    g.fillRect(cx - 9, 24, 7, 4);
    g.fillRect(cx + 2, 24, 7, 4);
    return { w, h };
  },

  // SIN 2 — SLOTH (the Wall): a squat, heavy, wide mound — bulky + immovable, with
  // half-lidded eyes.
  sloth: (g) => {
    const w = 78;
    const h = 60;
    const cx = w / 2;
    g.fillStyle(0xffffff, 0.85); // broad lower mass
    g.fillRoundedRect(4, 20, w - 8, h - 22, 16);
    g.fillStyle(0xffffff, 1); // heavy shoulders/head lump
    g.fillRoundedRect(16, 8, w - 32, 30, 14);
    g.fillStyle(0x000000, 0.45); // sleepy half-lidded eyes
    g.fillRect(cx - 16, 22, 12, 3);
    g.fillRect(cx + 4, 22, 12, 3);
    g.fillStyle(0xffffff, 0.5); // slumping arms
    g.fillCircle(12, h - 16, 11);
    g.fillCircle(w - 12, h - 16, 11);
    return { w, h };
  },

  // SIN 3 — GLUTTONY (the Devourer): a round, bloated maw — a big circular body
  // with a gaping toothy mouth.
  gluttony: (g) => {
    const w = 64;
    const h = 64;
    const cx = w / 2;
    const cy = h / 2;
    g.fillStyle(0xffffff, 0.9); // bloated round body
    g.fillCircle(cx, cy, 28);
    g.fillStyle(0x000000, 0.6); // gaping maw
    g.fillCircle(cx, cy + 6, 15);
    g.fillStyle(0xffffff, 1); // ring of teeth
    for (let i = 0; i < 10; i++) {
      const a = (Math.PI * 2 * i) / 10;
      g.fillTriangle(
        cx + Math.cos(a) * 15,
        cy + 6 + Math.sin(a) * 15,
        cx + Math.cos(a + 0.18) * 9,
        cy + 6 + Math.sin(a + 0.18) * 9,
        cx + Math.cos(a - 0.18) * 9,
        cy + 6 + Math.sin(a - 0.18) * 9,
      );
    }
    g.fillStyle(0x000000, 0.5); // small eyes up top
    g.fillCircle(cx - 9, cy - 14, 3);
    g.fillCircle(cx + 9, cy - 14, 3);
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

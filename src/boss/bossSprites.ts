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

  // SIN 4 — ENVY (the Mirror): a tall twin-faced figure split down the middle (a
  // mirrored silhouette) reading as "duality / reflection".
  envy: (g) => {
    const w = 58;
    const h = 70;
    const cx = w / 2;
    g.fillStyle(0xffffff, 1); // body
    g.fillRoundedRect(cx - 13, 16, 26, h - 20, 8);
    g.fillStyle(0x000000, 0.35); // mirror seam down the centre
    g.fillRect(cx - 1, 16, 2, h - 20);
    g.fillStyle(0xffffff, 1); // two heads (the twin / mirror)
    g.fillCircle(cx - 8, 12, 8);
    g.fillCircle(cx + 8, 12, 8);
    g.fillStyle(0x000000, 0.5); // facing-away eyes (envious glance)
    g.fillCircle(cx - 10, 12, 2);
    g.fillCircle(cx + 10, 12, 2);
    return { w, h };
  },

  // SIN 5 — PRIDE (the Shielded): a regal crowned figure behind a kite shield —
  // reads as "guarded / haughty".
  pride: (g) => {
    const w = 64;
    const h = 72;
    const cx = w / 2;
    g.fillStyle(0xffffff, 1); // tall proud body
    g.fillRoundedRect(cx - 11, 20, 22, h - 24, 7);
    g.fillCircle(cx, 16, 8); // head
    g.fillStyle(0xffffff, 1); // crown
    g.fillTriangle(cx - 9, 9, cx - 9, 1, cx - 4, 7);
    g.fillTriangle(cx, 9, cx, -2, cx + 0, 9);
    g.fillTriangle(cx + 9, 9, cx + 9, 1, cx + 4, 7);
    g.fillRect(cx - 9, 7, 18, 3);
    g.fillStyle(0xffffff, 0.55); // raised kite shield (the invuln motif)
    g.fillTriangle(cx + 6, 24, cx + 26, 30, cx + 12, h - 14);
    g.lineStyle(2, 0xffffff, 0.9);
    g.strokeTriangle(cx + 6, 24, cx + 26, 30, cx + 12, h - 14);
    return { w, h };
  },

  // SIN 6 — GREED (the Hoarder): a bloated figure hunched over a hoard of coins —
  // reads as "grasping / treasure".
  greed: (g) => {
    const w = 70;
    const h = 64;
    const cx = w / 2;
    g.fillStyle(0xffffff, 1); // hunched bulky body
    g.fillRoundedRect(cx - 16, 14, 32, h - 28, 9);
    g.fillCircle(cx, 12, 8); // head
    g.fillStyle(0xffffff, 0.85); // grasping arms wrapped around the hoard
    g.fillRoundedRect(cx - 24, 30, 12, 18, 6);
    g.fillRoundedRect(cx + 12, 30, 12, 18, 6);
    g.fillStyle(0xffffff, 0.7); // a pile of coins at its feet (the hoard)
    for (const [dx, dy] of [[-14, -2], [-4, 2], [6, -2], [14, 1], [-9, 4], [2, 5], [11, 4]]) {
      g.fillCircle(cx + dx, h - 6 + dy, 4);
    }
    g.fillStyle(0x000000, 0.5); // greedy eyes
    g.fillCircle(cx - 3, 11, 2);
    g.fillCircle(cx + 3, 11, 2);
    return { w, h };
  },

  // SIN 7 — LUST (the Chaos Finale): a writhing many-armed silhouette — the
  // ever-shifting capstone reads as "chaotic / overwhelming".
  lust: (g) => {
    const w = 72;
    const h = 76;
    const cx = w / 2;
    const cy = 40;
    g.fillStyle(0xffffff, 0.5); // a halo of writhing tendrils/arms
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI * 2 * i) / 8;
      const ex = cx + Math.cos(a) * 30;
      const ey = cy + Math.sin(a) * 30;
      g.fillTriangle(cx + Math.cos(a - 0.18) * 12, cy + Math.sin(a - 0.18) * 12, cx + Math.cos(a + 0.18) * 12, cy + Math.sin(a + 0.18) * 12, ex, ey);
    }
    g.fillStyle(0xffffff, 1); // central body
    g.fillRoundedRect(cx - 12, 22, 24, h - 28, 10);
    g.fillCircle(cx, 18, 9); // head
    g.fillStyle(0x000000, 0.5); // three feverish eyes
    g.fillCircle(cx - 4, 17, 2);
    g.fillCircle(cx + 4, 17, 2);
    g.fillCircle(cx, 22, 2);
    return { w, h };
  },

  // THE DRAGON — a winged, horned serpent silhouette: broad swept wings + a long
  // maw. Large + imposing; reads as "aerial devastator".
  dragon: (g) => {
    const w = 92;
    const h = 72;
    const cx = w / 2;
    g.fillStyle(0xffffff, 0.45); // vast swept wings
    g.fillTriangle(cx - 10, 30, 2, 4, 6, 50);
    g.fillTriangle(cx + 10, 30, w - 2, 4, w - 6, 50);
    g.fillStyle(0xffffff, 0.7); // wing membranes (inner)
    g.fillTriangle(cx - 8, 30, 16, 16, 18, 46);
    g.fillTriangle(cx + 8, 30, w - 16, 16, w - 18, 46);
    g.fillStyle(0xffffff, 1); // serpentine body
    g.fillRoundedRect(cx - 9, 24, 18, h - 30, 7);
    g.fillStyle(0xffffff, 1); // long horned head thrust forward/down
    g.fillTriangle(cx - 8, 16, cx + 8, 16, cx, 36);
    g.fillTriangle(cx - 7, 12, cx - 12, 2, cx - 2, 12); // horns
    g.fillTriangle(cx + 7, 12, cx + 12, 2, cx + 2, 12);
    g.fillStyle(0x000000, 0.55); // slit eyes
    g.fillRect(cx - 6, 20, 4, 3);
    g.fillRect(cx + 2, 20, 4, 3);
    g.fillStyle(0xffffff, 0.8); // barbed tail
    g.fillTriangle(cx - 4, h - 6, cx + 4, h - 6, cx, h + 6);
    return { w, h };
  },

  // THE BEAST — a hulking, armored, multi-horned brute: a massive blocky torso with
  // a crown of horns. The biggest, most imposing silhouette.
  beast: (g) => {
    const w = 86;
    const h = 84;
    const cx = w / 2;
    g.fillStyle(0xffffff, 1); // massive armored torso
    g.fillRoundedRect(cx - 24, 22, 48, h - 26, 10);
    g.fillStyle(0xffffff, 1); // heavy head/skull
    g.fillRoundedRect(cx - 14, 10, 28, 26, 8);
    g.fillStyle(0xffffff, 0.95); // a crown of many horns rising off the skull
    g.fillTriangle(cx - 14, 12, cx - 8, 12, cx - 22, 0);
    g.fillTriangle(cx - 5, 11, cx - 1, 11, cx - 6, 0);
    g.fillTriangle(cx + 5, 11, cx + 1, 11, cx + 6, 0);
    g.fillTriangle(cx + 14, 12, cx + 8, 12, cx + 22, 0);
    g.fillStyle(0x000000, 0.6); // burning eyes
    g.fillCircle(cx - 6, 20, 3);
    g.fillCircle(cx + 6, 20, 3);
    g.fillStyle(0xffffff, 0.85); // huge fists/shoulders
    g.fillCircle(cx - 26, 40, 13);
    g.fillCircle(cx + 26, 40, 13);
    return { w, h };
  },

  // SATAN — the final boss: a towering horned devil with vast bat wings, a great
  // crown of horns and a trident. The grandest, most imposing silhouette.
  satan: (g) => {
    const w = 104;
    const h = 100;
    const cx = w / 2;
    g.fillStyle(0xffffff, 0.4); // vast bat wings (clawed)
    g.fillTriangle(cx - 12, 40, 2, 8, 10, 64);
    g.fillTriangle(cx + 12, 40, w - 2, 8, w - 10, 64);
    g.fillStyle(0xffffff, 0.62); // wing ribs
    g.fillTriangle(cx - 10, 40, 18, 22, 20, 58);
    g.fillTriangle(cx + 10, 40, w - 18, 22, w - 20, 58);
    g.fillStyle(0xffffff, 1); // hulking torso + legs
    g.fillRoundedRect(cx - 18, 34, 36, h - 40, 10);
    g.fillStyle(0xffffff, 1); // head
    g.fillRoundedRect(cx - 13, 18, 26, 24, 7);
    g.fillStyle(0xffffff, 1); // great curved crown of horns
    g.fillTriangle(cx - 13, 20, cx - 6, 20, cx - 26, -2);
    g.fillTriangle(cx + 13, 20, cx + 6, 20, cx + 26, -2);
    g.fillTriangle(cx - 6, 18, cx - 1, 18, cx - 9, 2);
    g.fillTriangle(cx + 6, 18, cx + 1, 18, cx + 9, 2);
    g.fillStyle(0x000000, 0.6); // burning eyes + maw
    g.fillCircle(cx - 6, 28, 3);
    g.fillCircle(cx + 6, 28, 3);
    g.fillRect(cx - 7, 35, 14, 3);
    g.fillStyle(0xffffff, 0.9); // a raised trident off to one side
    g.fillRect(w - 12, 6, 3, 54);
    g.fillTriangle(w - 17, 8, w - 7, 8, w - 12, -2);
    g.fillStyle(0xffffff, 0.85); // massive fists
    g.fillCircle(cx - 24, 56, 12);
    g.fillCircle(cx + 24, 56, 12);
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

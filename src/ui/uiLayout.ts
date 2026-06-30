import Phaser from 'phaser';

/** iOS safe-area insets (notch, home indicator, rounded corners), in CSS px. */
export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export const NO_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

/** Gap between on-screen UI and the safe-area edge. */
export const UI_MARGIN = 14;

/**
 * Left-edge stacked tab geometry, SHARED so the DEV / QUESTS / SKILLS buttons line
 * up as one column (DevPanel owns DEV + QUESTS; LoadoutBar owns SKILLS). Index 0 =
 * DEV (mid-left), each next tab sits directly under the previous.
 */
export const LEFT_TAB_W = 46;
export const LEFT_TAB_H = 66;
export const LEFT_TAB_GAP = 10;

/** Centre of the Nth stacked left-edge tab (0 = DEV, 1 = QUESTS, 2 = SKILLS). */
export function leftTabPos(scene: Phaser.Scene, index: number): { x: number; y: number } {
  const insets = getInsets(scene);
  const h = scene.scale.height;
  const x = insets.left + 6 + LEFT_TAB_W / 2;
  const y = h / 2 + index * (LEFT_TAB_H + LEFT_TAB_GAP);
  return { x, y };
}

/**
 * Safe-area insets, published to the game registry by main.ts and refreshed on
 * resize. UI reads this so nothing sits under the notch or home indicator.
 */
export function getInsets(scene: Phaser.Scene): Insets {
  return (scene.registry.get('safeInsets') as Insets | undefined) ?? NO_INSETS;
}

/**
 * The actual visible viewport size. `visualViewport` is the reliable source on
 * mobile Safari (it reflects what is really on screen, unlike a fixed element's
 * measured bounds, which is what made the UI lay out too wide).
 */
export function viewportSize(): { w: number; h: number } {
  const hasWindow = typeof window !== 'undefined';
  const vv = hasWindow ? window.visualViewport : null;
  const w = Math.max(1, Math.floor(vv?.width ?? (hasWindow ? window.innerWidth : 390)));
  const h = Math.max(1, Math.floor(vv?.height ?? (hasWindow ? window.innerHeight : 800)));
  return { w, h };
}

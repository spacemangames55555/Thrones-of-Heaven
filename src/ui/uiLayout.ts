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

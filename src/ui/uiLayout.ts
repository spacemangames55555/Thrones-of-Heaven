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
 * HUD draw order (z-order) on the UI camera, back → front:
 *   BUTTONS  — in-game player buttons + bars (DEV/QUESTS/SKILLS, zoom, skill hotkeys,
 *              contextual action buttons, HP/mana/resource bars, the joystick).
 *   READOUT  — the DEV data readout (X/Y/Terrain/Nearest + FPS/entity panel).
 *   TEXTBOX  — quest / dialogue / story text boxes (tracker banner, DialogueBox,
 *              encounterNarration, choice / tap-to-close panels) — in FRONT of the
 *              buttons AND the readout, so story text is never occluded by HUD chrome.
 *   ARROW    — the world-aware quest direction arrow, on TOP of everything.
 */
export const DEPTH_HUD_BUTTONS = 1400;
export const DEPTH_HUD_READOUT = 2000;
export const DEPTH_HUD_TEXTBOX = 2400;
export const DEPTH_HUD_ARROW = 3000;

/**
 * Left-edge stacked tab geometry, SHARED so the DEV / QUESTS / SKILLS buttons line
 * up as one column (DevPanel owns DEV + QUESTS; LoadoutBar owns SKILLS). Index 0 =
 * DEV, each next tab sits directly under the previous. The column starts just BELOW
 * the top-left data-readout stack (X/Y/Terrain + FPS/entity panel).
 */
export const LEFT_TAB_W = 46;
export const LEFT_TAB_H = 66;
export const LEFT_TAB_GAP = 10;
const LEFT_TAB_TOP = 160; // clears the top-left readout stack (debug + perf)

/** Centre of the Nth stacked left-edge tab (0 = DEV, 1 = QUESTS, 2 = SKILLS). */
export function leftTabPos(scene: Phaser.Scene, index: number): { x: number; y: number } {
  const insets = getInsets(scene);
  const x = insets.left + 6 + LEFT_TAB_W / 2;
  const y = insets.top + UI_MARGIN + LEFT_TAB_TOP + LEFT_TAB_H / 2 + index * (LEFT_TAB_H + LEFT_TAB_GAP);
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
 * OVERLAY RESIZE BINDING — the ONLY sanctioned way an overlay scene reacts to a
 * viewport resize. Fixes the restart-leak regression:
 *   • fires ONLY while the scene is genuinely active — a resize can NEVER
 *     re-open (restart) a closed overlay (the "picker re-appears" bug);
 *   • auto-removes itself on SHUTDOWN — restarts never accumulate listeners on
 *     the global ScaleManager (the progressive-slowdown bug);
 *   • ignores resizes that change neither orientation nor meaningful size
 *     (< 24px — the iOS Safari URL-bar collapse fires viewport resizes
 *     constantly WITHOUT rotation; those must relayout nothing).
 */
export function bindOverlayRelayout(scene: Phaser.Scene, relayout: () => void): void {
  let lastW = scene.scale.width;
  let lastH = scene.scale.height;
  const handler = (): void => {
    const w = scene.scale.width;
    const h = scene.scale.height;
    const flipped = w > h !== lastW > lastH;
    const meaningful = Math.abs(w - lastW) >= 24 || Math.abs(h - lastH) >= 24;
    if (!flipped && !meaningful) return; // URL-bar jitter: no relayout
    lastW = w;
    lastH = h;
    if (!scene.scene.isActive()) return; // NEVER touch a closed scene
    relayout();
  };
  scene.scale.on(Phaser.Scale.Events.RESIZE, handler);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.scale.off(Phaser.Scale.Events.RESIZE, handler));
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

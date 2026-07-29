import Phaser from 'phaser';

/**
 * CHROME REGISTRY (Pass 6D): every FIXED UI element (buttons, toasts, panels
 * — anything that must sit inside the phone's safe viewport) registers a
 * screen-space rect provider here. The runtime gate enumerates the registry
 * under harness-injected iPhone safe-area profiles and fails on any element
 * outside the safe viewport or any interactive element under the 44 pt hit
 * target. Pure bookkeeping: registering draws nothing and changes no input.
 */
export interface ChromeRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface ChromeEntry {
  id: string;
  /** Interactive chrome must present a >= 44x44 pt hit target. */
  interactive: boolean;
  /** The element's VISUAL layout rect (screen px) — reported even while
   *  hidden (a hidden toast still must lay out inside the safe viewport);
   *  null when the element cannot currently be measured (owner scene gone).
   *  The safe-area gate asserts THIS rect. */
  rect: () => ChromeRect | null;
  /** Whether the element is currently shown (gate context only). */
  visible: () => boolean;
  /** The (possibly padded) HIT rect — the tap-target gate asserts THIS; it
   *  may legitimately overhang the screen edge (generous edge buttons).
   *  Defaults to the visual rect. */
  hitRect?: () => ChromeRect | null;
}

const entries = new Map<string, ChromeEntry>();

export function registerChrome(
  id: string,
  interactive: boolean,
  rect: () => ChromeRect | null,
  visible: () => boolean,
  hitRect?: () => ChromeRect | null,
): void {
  entries.set(id, { id, interactive, rect, visible, hitRect });
}

export function unregisterChrome(id: string): void {
  entries.delete(id);
}

/** Gate enumeration: every registered element with a measurable rect. */
export function chromeRects(): ({ id: string; interactive: boolean; visible: boolean; hit: ChromeRect | null } & ChromeRect)[] {
  const out: ({ id: string; interactive: boolean; visible: boolean; hit: ChromeRect | null } & ChromeRect)[] = [];
  for (const e of entries.values()) {
    let r: ChromeRect | null = null;
    let h: ChromeRect | null = null;
    try {
      r = e.rect();
      h = e.hitRect ? e.hitRect() : r;
    } catch {
      r = null; // a mid-teardown owner never breaks enumeration
    }
    if (r) out.push({ id: e.id, interactive: e.interactive, visible: e.visible(), hit: h, ...r });
  }
  return out;
}

/** Minimum interactive hit target (Apple HIG), CSS px. */
export const MIN_HIT_PX = 44;

/**
 * Pad an origin-centered button's HIT AREA up to the 44 pt target without
 * touching its visual size, and return the padded hit size. Phaser hit areas
 * live in the object's local frame space (top-left 0,0), so the pad extends
 * symmetrically into negative local space.
 */
export function padHitArea(obj: Phaser.GameObjects.Rectangle, minPx = MIN_HIT_PX): { w: number; h: number } {
  const w = Math.max(obj.width, minPx);
  const h = Math.max(obj.height, minPx);
  obj.setInteractive(new Phaser.Geom.Rectangle((obj.width - w) / 2, (obj.height - h) / 2, w, h), Phaser.Geom.Rectangle.Contains);
  return { w, h };
}

/** Screen rect of an origin-0.5 fixed button, using its (padded) hit size. */
export function hitRectOf(obj: Phaser.GameObjects.Rectangle, hit: { w: number; h: number }): ChromeRect {
  return { x: obj.x - hit.w / 2, y: obj.y - hit.h / 2, w: hit.w, h: hit.h };
}

/** Screen rect of an origin-0.5 fixed button's VISUAL box. */
export function visualRectOf(obj: Phaser.GameObjects.Rectangle): ChromeRect {
  return { x: obj.x - obj.width / 2, y: obj.y - obj.height / 2, w: obj.width, h: obj.height };
}

/** Register an origin-0.5 button: 44 pt padded hit + both rects. */
export function registerButtonChrome(id: string, bg: Phaser.GameObjects.Rectangle): void {
  const hit = padHitArea(bg);
  registerChrome(id, true, () => (bg.scene ? visualRectOf(bg) : null), () => bg.visible, () => (bg.scene ? hitRectOf(bg, hit) : null));
}

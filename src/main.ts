import Phaser from 'phaser';
import { gameConfig } from './game/config';
import { viewportSize, type Insets } from './ui/uiLayout';

/**
 * Thrones of Heaven — entry point.
 *
 * Boots the game, then keeps its size locked to the REAL visible viewport
 * (window.visualViewport) and publishes the iOS safe-area insets to the game
 * registry. This is what guarantees the on-screen UI lays out within the screen
 * on phones — see src/game/config.ts for why Scale.NONE is used.
 */
const game = new Phaser.Game(gameConfig);

// Read CSS env(safe-area-inset-*) via a hidden probe element.
let probe: HTMLDivElement | null = null;
function readSafeInsets(): Insets {
  if (!probe) {
    probe = document.createElement('div');
    probe.style.cssText =
      'position:fixed;top:0;left:0;width:0;height:0;visibility:hidden;pointer-events:none;' +
      'padding:env(safe-area-inset-top) env(safe-area-inset-right) ' +
      'env(safe-area-inset-bottom) env(safe-area-inset-left);';
    document.body.appendChild(probe);
  }
  const s = getComputedStyle(probe);
  return {
    top: parseFloat(s.paddingTop) || 0,
    right: parseFloat(s.paddingRight) || 0,
    bottom: parseFloat(s.paddingBottom) || 0,
    left: parseFloat(s.paddingLeft) || 0,
  };
}

let lastW = 0;
let lastH = 0;
function applySize(force = false): void {
  const { w, h } = viewportSize();
  if (!force && w === lastW && h === lastH) return;
  lastW = w;
  lastH = h;
  game.registry.set('safeInsets', readSafeInsets());
  game.scale.resize(w, h); // emits RESIZE → cameras + every UI element re-layout
}

game.events.once(Phaser.Core.Events.READY, () => applySize(true));
window.addEventListener('resize', () => applySize());
window.addEventListener('orientationchange', () => window.setTimeout(() => applySize(true), 150));
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', () => applySize());
  window.visualViewport.addEventListener('scroll', () => applySize());
}

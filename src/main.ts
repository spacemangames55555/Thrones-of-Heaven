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

// ---------------------------------------------------------------------------
// Diagnostic overlay (plain DOM, NOT a Phaser object). Fixed-position div with
// a very high z-index, so it bypasses the game canvas and all Phaser scaling —
// if the deploy reaches the device, this WILL show. Bump BUILD each deploy to
// confirm new code is live. pointer-events:none so it never blocks taps.
// ---------------------------------------------------------------------------
const BUILD_MARKER = 'BUILD 3';
const SCALE_MODE_NAMES = [
  'NONE',
  'WIDTH_CONTROLS_HEIGHT',
  'HEIGHT_CONTROLS_WIDTH',
  'FIT',
  'ENVELOP',
  'RESIZE',
  'EXPAND',
];

const diag = document.createElement('div');
diag.id = 'diag-overlay';
diag.style.cssText =
  'position:fixed;top:0;left:0;z-index:2147483647;pointer-events:none;' +
  'background:#000;color:#fff;opacity:0.92;padding:4px 7px;' +
  'font:12px/1.35 ui-monospace,Menlo,Consolas,monospace;white-space:pre;' +
  'border-bottom-right-radius:5px;max-width:100vw;';
document.body.appendChild(diag);

function updateDiag(): void {
  const gs = game.scale.gameSize;
  const mode = SCALE_MODE_NAMES[game.scale.scaleMode] ?? String(game.scale.scaleMode);
  diag.textContent = [
    BUILD_MARKER,
    `win ${window.innerWidth} x ${window.innerHeight} css`,
    `dpr ${window.devicePixelRatio}`,
    `game ${Math.round(gs.width)} x ${Math.round(gs.height)}  ${mode}`,
  ].join('\n');
}
updateDiag();
game.scale.on(Phaser.Scale.Events.RESIZE, updateDiag);
game.events.once(Phaser.Core.Events.READY, updateDiag);

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
  updateDiag();
}

game.events.once(Phaser.Core.Events.READY, () => applySize(true));
window.addEventListener('resize', () => applySize());
window.addEventListener('orientationchange', () => window.setTimeout(() => applySize(true), 150));
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', () => applySize());
  window.visualViewport.addEventListener('scroll', () => applySize());
}

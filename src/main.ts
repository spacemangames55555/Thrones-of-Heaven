import Phaser from 'phaser';
import { gameConfig } from './game/config';
import { viewportSize, type Insets } from './ui/uiLayout';
import { chromeRects } from './ui/chrome';
import * as worldScale from './world/world-scale';
import * as terrainSchema from './world/terrain-schema';
import { createProceduralSource, sampleRecord, tileRecord } from './world/terrain-procedural';
import * as terrainVisualsConfig from './world/terrain-visuals-config';
import * as floraConfig from './world/flora-config';
import { scatterFor, tileHash01 } from './world/terrain-visuals';
import { buildTerrainAtlases, fringeCoverage } from './world/terrain-placeholder';
import { latLngToMapPx } from './ui/WorldMapScene';
import { WORLD } from './world/world-manifest';
import { MANIFEST_CLASS_FOR, homeZoneForClass } from './world/class-canon';

/**
 * Thrones of Heaven — entry point.
 *
 * Boots the game, then keeps its size locked to the REAL visible viewport
 * (window.visualViewport) and publishes the iOS safe-area insets to the game
 * registry. This is what guarantees the on-screen UI lays out within the screen
 * on phones — see src/game/config.ts for why Scale.NONE is used.
 */
const game = new Phaser.Game(gameConfig);
// Stable handle for the RUNTIME VERIFICATION GATE (tools/verify-runtime.mjs,
// `npm run verify:runtime`): headless checks boot the real game through this.
// Invisible to players; no UI, no behavior — do not remove.
(window as unknown as { __game: Phaser.Game }).__game = game;
// WORLD SCALE V2 gate handle: the scale module's constants/projections plus
// the manifest's real-geography anchors (home cities + every zone), so the
// scale checks measure the projection against the same data the world builds
// from. Invisible to players; no UI, no behavior — do not remove.
(window as unknown as { __worldScale: unknown }).__worldScale = {
  ...worldScale,
  // Pass 2: the LOCKED terrain schema + the pure synthesis reference paths
  // (exposing the factory constructs nothing — v1 stays fully inert).
  schema: terrainSchema,
  createProceduralSource,
  sampleRecord,
  tileRecord,
  // Pass 5: the LOCKED visuals config + the pure autotile/scatter references
  // (again pure exposure — nothing constructs, v1 stays fully inert).
  visuals: terrainVisualsConfig,
  // Pass 9: the flora framework (prop table + per-biome/per-tier palettes +
  // the pure selection/variation references) — pure exposure, same rule.
  flora: floraConfig,
  scatterFor,
  tileHash01,
  fringeCoverage,
  buildTerrainAtlases,
  // Pass 6A: the pure map-marker projection (the gate recomputes it closed-form).
  latLngToMapPx,
  // Pass 6B addendum: the build identity (gate: menu stamp matches the bundle).
  get buildId() {
    return __BUILD_ID__;
  },
  get buildTime() {
    return __BUILD_TIME__;
  },
  homeAnchors: Object.keys(MANIFEST_CLASS_FOR).map((classId) => {
    const zone = homeZoneForClass(classId);
    return { classId, zoneId: zone?.id ?? null, anchor: zone?.anchor ?? null };
  }),
  zoneAnchors: Object.fromEntries(WORLD.map((z) => [z.id, z.anchor])),
};

// Build identifier — console-only, no on-screen overlay. __BUILD_ID__ is injected
// at build time by Vite (commit short-hash when the host provides it, else an ISO
// timestamp; see vite.config.ts). To verify which build is live, open the browser
// console and look for this line.
declare const __BUILD_ID__: string;
declare const __BUILD_TIME__: string;
console.log('ToH build:', __BUILD_ID__);

// Read CSS env(safe-area-inset-*) via a hidden probe element.
let probe: HTMLDivElement | null = null;
function readSafeInsets(): Insets {
  if (!probe) {
    probe = document.createElement('div');
    // Pass 6D: read through the :root --safe-* props (defined in index.html
    // from env(safe-area-inset-*)) so the runtime gate can inject phone
    // profiles by overriding the props — one source for device and harness.
    probe.style.cssText =
      'position:fixed;top:0;left:0;width:0;height:0;visibility:hidden;pointer-events:none;' +
      'padding:var(--safe-top, 0px) var(--safe-right, 0px) var(--safe-bottom, 0px) var(--safe-left, 0px);';
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
  // Ignore sub-2px jitter outright (scroll-driven visualViewport noise); overlay
  // scenes additionally ignore anything under 24px that isn't an orientation flip.
  if (!force && Math.abs(w - lastW) < 2 && Math.abs(h - lastH) < 2) return;
  lastW = w;
  lastH = h;
  game.registry.set('safeInsets', readSafeInsets());
  game.scale.resize(w, h); // emits RESIZE → cameras + every UI element re-layout
}

// Pass 6D gate handles: the chrome registry enumeration + a forced safe-area
// re-read (the harness sets --safe-* props, then calls refresh). Invisible to
// players; no UI, no behavior — do not remove.
(window as unknown as { __chrome: unknown }).__chrome = {
  rects: chromeRects,
  refreshSafeInsets: () => applySize(true),
};

game.events.once(Phaser.Core.Events.READY, () => applySize(true));
window.addEventListener('resize', () => applySize());
window.addEventListener('orientationchange', () => window.setTimeout(() => applySize(true), 150));
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', () => applySize());
  window.visualViewport.addEventListener('scroll', () => applySize());
}

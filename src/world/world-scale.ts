/**
 * WORLD SCALE V2 — the locked scale system for the streamed-world rescale
 * (PASS 1: flag-gated; PASS 2 flips the default and adds chunk streaming).
 *
 * CANONICAL MODEL: lat/lng is the stored position format for everything on the
 * terrestrial planet; pixels are DERIVED at runtime through whichever
 * projection is active, so projections can change without breaking saves.
 * Heaven/Hell and the city interiors are separate PLANES with their own local
 * px frames (they are anchor-local layouts, not places on the planet) and
 * never pass through a projection.
 *
 * PROJECTION V2 (equirectangular, standard parallel 47°N — chosen so E–W
 * distances are exact at Washington's latitude, where the flagship corridor
 * lives; the parallel is a DESIGN LOCK, not an approximation to fix):
 *   x = lng × PX_PER_DEG_LNG
 *   y = −lat × PX_PER_DEG_LAT      (north = up = smaller y)
 * That spec frame is what latLngToPxV2/pxToLatLngV2 speak, and what all scale
 * checks measure. The RUNTIME world frame is the same projection translated by
 * a constant (+180° lng, −85° lat → local (0,0) at 85°N 180°W) so the sparse-
 * world machinery keeps positive local pixels — a pure translation, so every
 * distance and crossing time is identical in both frames.
 */

// ── Locked scale constants ───────────────────────────────────────────────────
export const METERS_PER_PX = 0.625;
export const PX_PER_KM = 1600; // = 1000 / METERS_PER_PX
export const TILE_PX = 32; // matches the shipped atlas TILE_SIZE
export const METERS_PER_TILE = TILE_PX * METERS_PER_PX; // = 20
export const PX_PER_DEG_LAT = 178112;
export const PX_PER_DEG_LNG = 121472; // = 178112 × cos 47°
// Movement speeds (px/sec). Mounts ship in a later pass — the constants exist
// now for the crossing-time checks and dev traversal testing. NOTE: the
// shipped player RUN_SPEED is untouched by this pass.
export const FOOT_SPEED_PX = 192;
export const MOUNT_SPEED_PX = 384;

// ── The CURRENT (v1) projection, read from world-calibration.ts (not guessed):
// the shipped 'earth' row — origin 85°N 180°W at local (0,0), ~45–50 m/px
// ("50:1"). Pinned here so save migration ALWAYS converts old px through v1,
// no matter which projection is active at load time.
export const V1_PX_PER_DEG_LNG = 2426;
export const V1_PX_PER_DEG_LAT = 2453;
export const V1_ORIGIN = { lat: 85.0, lng: -180.0 } as const;

/** V1 globe-LOCAL px → lat/lng (the migration direction; pinned to v1). */
export function pxToLatLngV1Local(x: number, y: number): { lat: number; lng: number } {
  return {
    lat: V1_ORIGIN.lat - y / V1_PX_PER_DEG_LAT,
    lng: V1_ORIGIN.lng + x / V1_PX_PER_DEG_LNG,
  };
}

// ── V2 projection, spec frame ────────────────────────────────────────────────
export function latLngToPxV2(lat: number, lng: number): { x: number; y: number } {
  return { x: lng * PX_PER_DEG_LNG, y: -lat * PX_PER_DEG_LAT };
}
export function pxToLatLngV2(x: number, y: number): { lat: number; lng: number } {
  return { lat: -y / PX_PER_DEG_LAT, lng: x / PX_PER_DEG_LNG };
}

// ── Boot-time flags (query params; default = v1, zero behavior change) ───────
/** PASS 4 FLIP: v2 (the real Earth) is the DEFAULT. ?scale=v1 is the
 *  gate-checked escape hatch keeping the legacy world fully functional
 *  (removal ledgered, not scheduled). Node tooling follows the default. */
/** Memoized per page load (the URL never changes inside a session): Pass 6C
 *  put this flag on per-terrain-sample hot paths, where re-parsing
 *  location.search every call burned ~70% of the frame (profiled). */
let scaleV2Cache: boolean | undefined;
export function isScaleV2(): boolean {
  if (scaleV2Cache !== undefined) return scaleV2Cache;
  try {
    scaleV2Cache = typeof location === 'undefined' ? true : new URLSearchParams(location.search).get('scale') !== 'v1';
  } catch {
    scaleV2Cache = true;
  }
  return scaleV2Cache;
}

/** Distance readout for travel UI: km from px through METERS_PER_PX — one
 *  decimal under 10 km, whole km above. */
export function formatKm(distPx: number): string {
  const km = (distPx * METERS_PER_PX) / 1000;
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
}

/** ?debug=1 turns on opt-in dev observability (e.g. the mount-block toast
 *  names the entity ids holding the player in combat). Zero player-facing
 *  behavior without the param. */
export function isDebugOverlay(): boolean {
  try {
    return typeof location !== 'undefined' && new URLSearchParams(location.search).get('debug') === '1';
  } catch {
    return false;
  }
}

/** ?terrain=proc pins the Pass 2 procedural source under v2 (dev fallback) —
 *  the real-Earth packs are neither fetched nor decoded. */
export function isTerrainProc(): boolean {
  try {
    return typeof location !== 'undefined' && new URLSearchParams(location.search).get('terrain') === 'proc';
  } catch {
    return false;
  }
}

/** ?devspeed=N multiplies movement speed for traversal testing (cap 8).
 *  No param (or junk) ⇒ EXACTLY 1 — base speeds untouched. */
export function devSpeedMultiplier(): number {
  try {
    if (typeof location === 'undefined') return 1;
    const raw = new URLSearchParams(location.search).get('devspeed');
    if (raw === null) return 1;
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return 1;
    return Math.min(n, 8);
  } catch {
    return 1;
  }
}

// (The Pass 1 TEMP render window lived here; Pass 2 replaced it with real
// chunk streaming — the zoom-out floor now comes from chunk-streamer.ts.)

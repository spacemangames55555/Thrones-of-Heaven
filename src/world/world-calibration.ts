import type { LatLng } from './world-manifest';

/**
 * PER-WORLD lat/lng → pixel calibration (Phase 0 of the data-driven world
 * pipeline). No calibration existed in the repo before this file — every
 * landmark was hand-placed in pixels — so each region world gets one entry
 * here, derived empirically from its existing hand-placed landmarks.
 *
 * MODEL (simple equirectangular, per world):
 *   x = (lng - origin.lng) * pixelsPerDegree.x
 *   y = (origin.lat - lat) * pixelsPerDegree.y     (north = up = smaller y)
 * where `origin` is the real-world point that sits at the WORLD MAP's local
 * pixel (0,0) (its top-left corner), NOT the multi-world coordinate offset —
 * WorldBuilder adds the world's runtime origin separately.
 *
 * ── HOW THE NORTH AMERICA VALUES WERE DERIVED ────────────────────────────────
 * Least-squares fit of three existing hand-placed landmarks on the Washington
 * world map (pixel positions from washington.map.json / settings.ts):
 *   Seattle  (47.6062, -122.3321) → ( 9488,  5296)
 *   Portland (45.5152, -122.6784) → (12048, 13104)
 *   Boise    (43.6150, -116.2023) → (26200, 15000)
 * Fit: ~2426 px/°lng, ~2453 px/°lat, top-left (0,0) ≈ 50.12°N 126.96°W.
 * That is ≈ 45–50 m per pixel — consistent with the game's 50:1 scale. Mean
 * residual vs the hand-placed landmarks is ~1,100 px (~34 tiles) because the
 * existing map is stylized, not projected; new loop-placed zones will be
 * geographically consistent with each other, and close to (not exactly on)
 * the hand-built landmarks.
 */
export interface WorldCalibration {
  /** Real-world point at the world map's LOCAL pixel (0,0) (its top-left). */
  origin: LatLng;
  /** Pixels per degree: x = longitude (east), y = latitude (south). */
  pixelsPerDegree: { x: number; y: number };
}

export const WORLD_CALIBRATION: Record<string, WorldCalibration> = {
  // The existing Washington/Oregon/Idaho map — the NORTH AMERICA region world.
  earth: {
    origin: { lat: 50.12, lng: -126.96 },
    pixelsPerDegree: { x: 2426, y: 2453 },
  },
  // EUROPE — the Delphi-march region world. Same pixels-per-degree as NA for a
  // consistent travel feel. Logical span ~50° lng × ~34° lat (Murmansk to
  // Delphi, London to Moscow) — far too large for one dense tilemap, so this
  // world is SPARSE/CHUNKED: only stamped zone areas materialize as their own
  // small chunk layers; the empty span renders as cheap void fill. See
  // createSparseWorld in world-builder.ts.
  europe: {
    origin: { lat: 71.0, lng: -8.0 },
    pixelsPerDegree: { x: 2426, y: 2453 },
  },
  // Future region worlds (e.g. the Egypt map) get their own row, derived the
  // same way from that world's existing landmarks.
};

/** Logical spans (degrees east / south of origin) for SPARSE region worlds. */
export const WORLD_SPAN_DEGREES: Record<string, { lng: number; lat: number }> = {
  europe: { lng: 50, lat: 34 },
};

/** Convert a real-world anchor to LOCAL pixels on its region world's map. */
export function latLngToPixels(cal: WorldCalibration, anchor: LatLng): { x: number; y: number } {
  const x = (anchor.lng - cal.origin.lng) * cal.pixelsPerDegree.x;
  const y = (cal.origin.lat - anchor.lat) * cal.pixelsPerDegree.y;
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    throw new Error(`latLngToPixels: non-finite result for (${anchor.lat}, ${anchor.lng})`);
  }
  return { x, y };
}

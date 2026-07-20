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
  'pnw-legacy': {
    origin: { lat: 50.12, lng: -126.96 },
    pixelsPerDegree: { x: 2426, y: 2453 },
  },
  // GLOBE — the ONE whole-planet SPARSE region world (the former per-continent
  // 'europe' and 'africa' worlds, consolidated at TRUE Earth positions through
  // this single calibration). Origin is the planet's usable top-left (85°N
  // 180°W); same pixels-per-degree as earth so travel feel is unchanged. Far
  // too large for one dense tilemap, so only stamped zone areas materialize as
  // their own small chunk layers (createSparseWorld in world-builder.ts); the
  // span between renders as the whole-planet Natural-Earth ground raster —
  // already global, so no new ground data was needed.
  earth: {
    origin: { lat: 85.0, lng: -180.0 },
    pixelsPerDegree: { x: 2426, y: 2453 },
  },
  // Future region worlds (e.g. the Egypt map) get their own row, derived the
  // same way from that world's existing landmarks.
};

/** Logical spans (degrees east / south of origin) for SPARSE region worlds. */
export const WORLD_SPAN_DEGREES: Record<string, { lng: number; lat: number }> = {
  // Earth: the whole planet (85°N..85°S, 180°W..180°E) — every future zone fits.
  earth: { lng: 360, lat: 170 },
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

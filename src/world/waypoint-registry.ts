import { MANIFEST_CLASS_FOR, homeZoneForClass } from './class-canon';
import { BOISE_POSITION, KAMIAH_POSITION, OLYMPIA_POSITION } from '../game/settings';
import { SETTLEMENTS } from '../settlements/registry';
import { isScaleV2 } from './world-scale';
import { latLngGlobePx } from './replant';
import { LEGACY_GLOBE_ORIGIN_X } from './legacy-frame';

/**
 * WAYPOINT REGISTRY (WORLD SCALE V2, Pass 4). Code name is `waypoint`; the
 * display text "Waystone" is a PLACEHOLDER — TODO-lore: Casey names these.
 *
 * Nodes: the 14 class home cities (referencing the EXISTING zone anchors by
 * id — lat/lng is never re-entered here) plus Olympia, Boise, and the
 * Idaho-corridor staging node. The three non-home nodes reference the
 * EXISTING authored quest anchors (settings.ts, legacy-frame translated):
 * OLYMPIA_POSITION (the Q1/4.5b delivery site), BOISE_POSITION (the Act IV
 * anchor), and KAMIAH_POSITION as the Idaho staging camp (the Clearwater
 * valley camp the 4.5–4.7 leg stages from — flagged in the commit body for
 * review; no separate corridor camp anchor exists).
 */
export const DISCOVER_RADIUS_TILES = 8;
export const INTERACT_RADIUS_TILES = 3;
/** Anchor-safety rule: unwalkable anchors nudge deterministically up to this
 *  many tiles; beyond it the position is WRONG and registration hard-fails. */
export const MAX_NUDGE_TILES = 64;

export interface WaypointDef {
  id: string;
  /** TODO-lore placeholder display name. */
  label: string;
  continent: string;
  /** Home nodes resolve through the zone's live arrival point. */
  zoneId?: string;
  classId?: string;
  /** Non-home nodes resolve through an existing authored anchor (scene px). */
  fixed?: { x: number; y: number };
}

export function buildWaypointRegistry(): WaypointDef[] {
  const nodes: WaypointDef[] = [];
  for (const classId of Object.keys(MANIFEST_CLASS_FOR)) {
    const z = homeZoneForClass(classId);
    if (!z) continue;
    const shortName = z.displayName.split('(')[0].trim();
    nodes.push({ id: `wp-${z.id}`, label: `${shortName} Waystone`, continent: z.continent, zoneId: z.id, classId });
  }
  nodes.push({ id: 'wp-olympia', label: 'Olympia Waystone', continent: 'North America', fixed: { ...OLYMPIA_POSITION } });
  nodes.push({ id: 'wp-boise', label: 'Boise Waystone', continent: 'North America', fixed: { ...BOISE_POSITION } });
  nodes.push({ id: 'wp-kamiah', label: 'Kamiah Camp Waystone', continent: 'North America', fixed: { ...KAMIAH_POSITION } });
  // PASS 7: settlement waystones (v2-only — settlements stamp on the
  // true-coordinate world) — placeholder pillar, DISCOVERY-based, never
  // pre-attuned (nothing here touches the unlocked set).
  if (isScaleV2()) {
    for (const s of SETTLEMENTS) {
      if (!s.waystone) continue;
      const g = latLngGlobePx(s.lat, s.lng);
      nodes.push({ id: s.waystone.nodeId, label: s.waystone.label, continent: 'Africa', fixed: { x: LEGACY_GLOBE_ORIGIN_X + Math.round(g.x), y: Math.round(g.y) } });
    }
  }
  return nodes;
}

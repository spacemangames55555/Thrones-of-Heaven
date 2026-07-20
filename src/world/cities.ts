import type { WashingtonMap } from '../map/mapTypes';
import type { WorldId } from './worlds';
import { WORLD_EARTH } from './worlds';
import {
  buildFaiyumVillageMapData,
  VILLAGE_GATE_TILE,
  VILLAGE_INSIDE_ARRIVAL_TILE,
} from '../map/faiyumVillageWorld';

/**
 * NESTED CITY MAPS — the generic, data-driven city sub-map system.
 *
 * A CITY is a very small WORLD on the existing multi-world registry: on its
 * PARENT world's map it renders as a compact walled settlement with a gate
 * (stamped tiles, one functional door); walking up to the gate shows an
 * "Enter <Name>" button that travels INTO the city's own map, and the gate
 * inside shows "Leave <Name>" back out. Arrivals are FIXED both ways
 * (predictable; no mid-city remembered-position weirdness).
 *
 * ── ADDING CITY #2 LATER (zero new code) ────────────────────────────────────
 *  1. Author its map like src/map/faiyumVillageWorld.ts (any WashingtonMap).
 *  2. Append ONE CityDef below (id, parent, entrance anchor + stamp, tiles).
 *  MainScene.setupCities registers the world, stamps the entrance, wires the
 *  Enter/Leave gate buttons and the hierarchical quest-arrow waypoints for
 *  every entry in CITY_DEFS. Nothing else changes.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export interface CityDef {
  /** The city's WORLD id on the registry (also what saves persist in world.active). */
  id: WorldId;
  displayName: string;
  /** The world this city's entrance sits on (arrow chaining routes through it). */
  parentWorld: WorldId;
  /**
   * The compact walled-settlement STAMP painted onto the parent map. Legend:
   * 'W' wall (blocks), 'G' ground, 'D' the gate door (exactly one), 'P' path,
   * '.' leave the parent terrain untouched.
   */
  entranceStamp: string[];
  /** Top-left tile ON THE PARENT MAP where the stamp is painted. */
  entranceAnchorTile: { x: number; y: number };
  /** Builds the city's own map (same schema as every world map). */
  buildMap: () => WashingtonMap;
  /** Where the player lands when entering (city-map tile, just inside the gate). */
  insideArrivalTile: { x: number; y: number };
  /** The exit gate INSIDE the city (city-map tile — the "Leave" proximity anchor). */
  gateTile: { x: number; y: number };
  /** Tiles SOUTH of the entrance gate where "Leave" drops the player outside. */
  outsideArrivalOffsetTiles: number;
}

/** The Faiyum home village — the pilot city (world id; a plain string key). */
export const CITY_FAIYUM: WorldId = 'city-faiyum';

export const CITY_DEFS: CityDef[] = [
  {
    id: CITY_FAIYUM,
    displayName: 'Faiyum Village',
    // WORLD UNIFICATION: the egypt map is a dense chunk of the globe now, so
    // the village's parent world is the globe (its dense HOST map is still the
    // egypt map — setupCities resolves that for the entrance stamp).
    parentWorld: WORLD_EARTH,
    // A 9x5 walled settlement whose gate 'D' lands exactly on the old Faiyum
    // Village marker/road-junction tile (190,268) on the Egypt map.
    entranceStamp: [
      'WWWWWWWWW',
      'WGGGGGGGW',
      'WGGGGGGGW',
      'WGGGGGGGW',
      'WWWWDWWWW',
    ],
    entranceAnchorTile: { x: 186, y: 264 },
    buildMap: buildFaiyumVillageMapData,
    insideArrivalTile: VILLAGE_INSIDE_ARRIVAL_TILE,
    gateTile: VILLAGE_GATE_TILE,
    outsideArrivalOffsetTiles: 2,
  },
];

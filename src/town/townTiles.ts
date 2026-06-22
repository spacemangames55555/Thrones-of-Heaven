import type { TerrainType } from '../map/mapTypes';

/**
 * Extra tile types for the town. Their ids continue after the base terrain
 * (0–9), so they append cleanly to the shared tileset and can be stamped onto
 * the same GPU tilemap layer as the overworld. Flat placeholder colors only —
 * no downloaded art.
 */
export const TownTileId = {
  ground: 10, // packed dirt
  road: 11, // path through town
  plaza: 12, // stone square
  building: 13, // generic roof (solid)
  inn: 14, // inn roof (solid, distinct)
  door: 15, // inn doorway (walkable, triggers interior)
  tree: 16, // decorative tree (solid)
  corrupted: 17, // corrupted ground (walkable, ominous)
  rift: 18, // corruption rift core (solid)
} as const;

export const TOWN_TILES: TerrainType[] = [
  { id: TownTileId.ground, key: 'town_ground', name: 'Town Ground', color: '#7a6647', blocks: false },
  { id: TownTileId.road, key: 'town_road', name: 'Road', color: '#a8946a', blocks: false },
  { id: TownTileId.plaza, key: 'town_plaza', name: 'Town Square', color: '#b8b0a0', blocks: false },
  { id: TownTileId.building, key: 'town_building', name: 'Building', color: '#5b3b26', blocks: true },
  { id: TownTileId.inn, key: 'town_inn', name: 'Inn', color: '#a05a2c', blocks: true },
  { id: TownTileId.door, key: 'town_door', name: 'Doorway', color: '#ffcf57', blocks: false },
  { id: TownTileId.tree, key: 'town_tree', name: 'Tree', color: '#1e5233', blocks: true },
  { id: TownTileId.corrupted, key: 'corrupted_ground', name: 'Corrupted Ground', color: '#2b1640', blocks: false },
  { id: TownTileId.rift, key: 'corruption_rift', name: 'Corruption Rift', color: '#8a2be2', blocks: true },
];

/**
 * Shared types for the Washington map data produced by tools/generateMap.mjs.
 *
 * The map is authored as a clean custom JSON, organised into a grid of zone
 * chunks. The whole state is rendered at once for now, but keeping the source
 * data chunked means streaming can be added later without reshaping the data.
 */

export interface TerrainType {
  /** Stable id, also used directly as the tileset tile index. */
  id: number;
  key: string;
  name: string;
  /** Hex color string used to paint the placeholder tileset texture. */
  color: string;
  /** Whether this terrain blocks movement (collision). */
  blocks: boolean;
}

export interface ZoneChunk {
  id: string;
  /** Zone grid coordinates. */
  zx: number;
  zy: number;
  /** Top-left tile coordinates of this zone within the full map. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** tiles[row][col] = terrain id. */
  tiles: number[][];
}

export interface CityMarker {
  name: string;
  tx: number;
  ty: number;
}

export interface TileCoord {
  x: number;
  y: number;
}

export interface WashingtonMap {
  name: string;
  generated: string;
  tileSize: number;
  width: number;
  height: number;
  zoneSize: number;
  zonesX: number;
  zonesY: number;
  terrain: TerrainType[];
  spawn: TileCoord;
  cities: CityMarker[];
  zones: ZoneChunk[];
}

import Phaser from 'phaser';
import type { WashingtonMap, TerrainType, CityMarker, TileCoord } from './mapTypes';

/**
 * Builds the renderable Washington map from the authored JSON:
 *
 *  1. Stitches the zone chunks back into one full tile grid.
 *  2. Paints a placeholder tileset texture (one flat-color tile per terrain
 *     type) at runtime, so no art assets need to be downloaded.
 *  3. Creates a single GPU tilemap layer (Phaser 4 TilemapGPULayer) for the
 *     whole state, and marks blocking terrain for Arcade Physics collision.
 *
 * Tile data uses terrainId + 1 as the tile index so that index 0 stays the
 * conventional "empty" tile; frames 1..N are the terrain colors.
 */
export class GameMap {
  readonly data: WashingtonMap;
  readonly tileSize: number;
  readonly pixelWidth: number;
  readonly pixelHeight: number;
  readonly layer: Phaser.Tilemaps.TilemapLayerBase;

  private readonly terrainById: Map<number, TerrainType>;
  /** Full grid of raw terrain ids, indexed [y][x], for terrain queries. */
  private readonly grid: number[][];

  constructor(scene: Phaser.Scene, data: WashingtonMap) {
    this.data = data;
    this.tileSize = data.tileSize;
    this.pixelWidth = data.width * data.tileSize;
    this.pixelHeight = data.height * data.tileSize;
    this.terrainById = new Map(data.terrain.map((t) => [t.id, t]));

    this.grid = GameMap.stitchZones(data);
    this.buildTilesetTexture(scene, data);
    this.layer = this.buildLayer(scene, data);
  }

  /** Reassemble the zone chunks into a single [y][x] grid of terrain ids. */
  private static stitchZones(data: WashingtonMap): number[][] {
    const grid: number[][] = Array.from({ length: data.height }, () =>
      new Array<number>(data.width).fill(0),
    );
    for (const zone of data.zones) {
      for (let y = 0; y < zone.height; y++) {
        const row = zone.tiles[y];
        for (let x = 0; x < zone.width; x++) {
          grid[zone.y + y][zone.x + x] = row[x];
        }
      }
    }
    return grid;
  }

  /** Paint a horizontal strip texture: frame 0 empty, frames 1..N = terrain. */
  private buildTilesetTexture(scene: Phaser.Scene, data: WashingtonMap): void {
    const ts = data.tileSize;
    const frames = data.terrain.length + 1; // +1 for the empty frame 0
    const key = 'terrain-tiles';

    if (scene.textures.exists(key)) scene.textures.remove(key);
    const canvasTexture = scene.textures.createCanvas(key, frames * ts, ts);
    if (!canvasTexture) throw new Error('Failed to create tileset canvas texture');

    const ctx = canvasTexture.context;
    ctx.clearRect(0, 0, frames * ts, ts); // frame 0 stays transparent
    for (const terrain of data.terrain) {
      const fx = (terrain.id + 1) * ts;
      ctx.fillStyle = terrain.color;
      ctx.fillRect(fx, 0, ts, ts);
      // Subtle inner shade so adjacent same-type tiles still read as a grid.
      ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
      ctx.fillRect(fx, ts - 2, ts, 2);
      ctx.fillRect(fx + ts - 2, 0, 2, ts);
    }
    canvasTexture.refresh();
  }

  private buildLayer(scene: Phaser.Scene, data: WashingtonMap): Phaser.Tilemaps.TilemapLayerBase {
    // Offset every terrain id by +1 to match the tileset frames.
    const layerData = this.grid.map((row) => row.map((id) => id + 1));

    const map = scene.make.tilemap({
      data: layerData,
      tileWidth: data.tileSize,
      tileHeight: data.tileSize,
    });

    const tileset = map.addTilesetImage('terrain', 'terrain-tiles', data.tileSize, data.tileSize);
    if (!tileset) throw new Error('Failed to add terrain tileset');

    // Use the GPU layer when WebGL is available (the whole state in one quad);
    // fall back to the CPU layer on the rare Canvas-only device.
    const useGpu = scene.game.renderer.type === Phaser.WEBGL;
    const layer = map.createLayer(0, tileset, 0, 0, useGpu);
    if (!layer) throw new Error('Failed to create tilemap layer');

    // Mark blocking terrain (frames = id + 1) as collidable.
    const blockingFrames = data.terrain.filter((t) => t.blocks).map((t) => t.id + 1);
    layer.setCollision(blockingFrames);

    return layer;
  }

  // --- Queries --------------------------------------------------------------

  worldToTile(worldX: number, worldY: number): TileCoord {
    return {
      x: Math.floor(worldX / this.tileSize),
      y: Math.floor(worldY / this.tileSize),
    };
  }

  tileToWorldCenter(tx: number, ty: number): { x: number; y: number } {
    return {
      x: tx * this.tileSize + this.tileSize / 2,
      y: ty * this.tileSize + this.tileSize / 2,
    };
  }

  terrainAtTile(tx: number, ty: number): TerrainType | null {
    if (tx < 0 || ty < 0 || tx >= this.data.width || ty >= this.data.height) return null;
    return this.terrainById.get(this.grid[ty][tx]) ?? null;
  }

  terrainAtWorld(worldX: number, worldY: number): TerrainType | null {
    const { x, y } = this.worldToTile(worldX, worldY);
    return this.terrainAtTile(x, y);
  }

  get spawnWorld(): { x: number; y: number } {
    return this.tileToWorldCenter(this.data.spawn.x, this.data.spawn.y);
  }

  get cities(): CityMarker[] {
    return this.data.cities;
  }

  /** Nearest city to a world position (for the debug readout). */
  nearestCity(worldX: number, worldY: number): { city: CityMarker; distanceTiles: number } {
    const { x: tx, y: ty } = this.worldToTile(worldX, worldY);
    let best = this.data.cities[0];
    let bestDist = Infinity;
    for (const city of this.data.cities) {
      const d = Math.hypot(city.tx - tx, city.ty - ty);
      if (d < bestDist) {
        bestDist = d;
        best = city;
      }
    }
    return { city: best, distanceTiles: bestDist };
  }
}

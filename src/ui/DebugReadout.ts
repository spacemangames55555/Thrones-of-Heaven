import Phaser from 'phaser';
import type { GameMap } from '../map/GameMap';
import type { Player } from '../entities/Player';

/**
 * Small on-screen readout pinned to the camera: player world X/Y, the terrain
 * type under the player, and the nearest city.
 */
export class DebugReadout {
  private readonly text: Phaser.GameObjects.Text;
  private readonly map: GameMap;
  private readonly player: Player;

  constructor(scene: Phaser.Scene, map: GameMap, player: Player) {
    this.map = map;
    this.player = player;

    this.text = scene.add.text(8, 8, '', {
      fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
      fontSize: '12px',
      color: '#e8f0ff',
      backgroundColor: 'rgba(8, 16, 28, 0.55)',
      padding: { x: 6, y: 5 },
    });
    this.text.setScrollFactor(0);
    this.text.setDepth(2000);
  }

  update(): void {
    const wx = Math.round(this.player.x);
    const wy = Math.round(this.player.y);
    const terrain = this.map.terrainAtWorld(this.player.x, this.player.y);
    const { city, distanceTiles } = this.map.nearestCity(this.player.x, this.player.y);

    this.text.setText([
      `X ${wx}   Y ${wy}`,
      `Terrain: ${terrain ? terrain.name : '—'}`,
      `Nearest: ${city.name} (${Math.round(distanceTiles)} tiles)`,
    ]);
  }
}

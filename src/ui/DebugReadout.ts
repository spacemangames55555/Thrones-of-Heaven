import Phaser from 'phaser';
import type { GameMap } from '../map/GameMap';
import type { Player } from '../entities/Player';
import { getInsets, UI_MARGIN } from './uiLayout';

/**
 * Small on-screen readout pinned to the camera (top-left, inside the safe
 * area): player world X/Y, the terrain type under the player, and nearest city.
 */
export class DebugReadout {
  private readonly scene: Phaser.Scene;
  private readonly text: Phaser.GameObjects.Text;
  private readonly map: GameMap;
  private readonly player: Player;

  constructor(scene: Phaser.Scene, map: GameMap, player: Player) {
    this.scene = scene;
    this.map = map;
    this.player = player;

    this.text = scene.add.text(0, 0, '', {
      fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
      fontSize: '12px',
      color: '#e8f0ff',
      backgroundColor: 'rgba(8, 16, 28, 0.55)',
      padding: { x: 6, y: 5 },
    });
    this.text.setScrollFactor(0);
    this.text.setDepth(2000);

    this.layout();
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this);
    });
  }

  private layout(): void {
    const insets = getInsets(this.scene);
    // Below the player HP bar (top-left HUD).
    this.text.setPosition(insets.left + UI_MARGIN, insets.top + UI_MARGIN + 26);
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

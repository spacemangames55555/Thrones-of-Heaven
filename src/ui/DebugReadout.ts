import Phaser from 'phaser';
import type { WorldMapLike } from '../world/worlds';
import type { Player } from '../entities/Player';
import { getInsets, UI_MARGIN } from './uiLayout';

/**
 * Small on-screen readout pinned to the camera (top-left, inside the safe
 * area): player world X/Y, the terrain type under the player, and nearest city.
 * Reads the ACTIVE world's map each frame (via the provider) so terrain +
 * nearest-city stay correct after a world transition (Egypt names Egyptian cities).
 */
export class DebugReadout {
  private readonly scene: Phaser.Scene;
  private readonly text: Phaser.GameObjects.Text;
  private readonly getMap: () => WorldMapLike;
  private readonly player: Player;

  constructor(scene: Phaser.Scene, getMap: () => WorldMapLike, player: Player) {
    this.scene = scene;
    this.getMap = getMap;
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
    // Top-left: the HP/XP/Energy bars moved to the bottom-left, so this readout now
    // sits at the very top of the left column.
    this.text.setPosition(insets.left + UI_MARGIN, insets.top + UI_MARGIN);
  }

  update(): void {
    const map = this.getMap();
    const wx = Math.round(this.player.x);
    const wy = Math.round(this.player.y);
    const terrain = map.terrainAtWorld(this.player.x, this.player.y);
    // Heaven/Hell have no city markers — skip the line rather than index nothing.
    let nearest = 'Nearest: —';
    if (map.cities.length > 0) {
      const { city, distanceTiles } = map.nearestCity(this.player.x, this.player.y);
      nearest = `Nearest: ${city.name} (${Math.round(distanceTiles)} tiles)`;
    }

    this.text.setText([`X ${wx}   Y ${wy}`, `Terrain: ${terrain ? terrain.name : '—'}`, nearest]);
  }
}

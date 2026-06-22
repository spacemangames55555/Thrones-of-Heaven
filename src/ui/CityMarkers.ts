import Phaser from 'phaser';
import type { GameMap } from '../map/GameMap';

/**
 * Small, non-interactive labeled markers at the major cities. They live in
 * world space, so they pan with the map. No interaction yet — just landmarks
 * that help the state read as Washington.
 */
export class CityMarkers {
  constructor(scene: Phaser.Scene, map: GameMap) {
    for (const city of map.cities) {
      const { x, y } = map.tileToWorldCenter(city.tx, city.ty);

      // Diamond marker.
      const marker = scene.add.rectangle(x, y, 7, 7, 0xf4f0e6, 1);
      marker.setStrokeStyle(1.5, 0x1a1410, 1);
      marker.setAngle(45);
      marker.setDepth(6);

      // Label above the marker.
      const label = scene.add.text(x, y - 9, city.name, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '10px',
        color: '#fdf6e3',
      });
      label.setOrigin(0.5, 1);
      label.setDepth(6);
      label.setStroke('#1a1410', 3);
      label.setShadow(0, 1, '#000000', 2, true, true);
    }
  }
}

import Phaser from 'phaser';
import type { GameMap } from '../map/GameMap';

/** The far-zoom label registry MainScene exposes (structural — no import cycle). */
interface LodLabelHost {
  registerLodLabel(obj: { setVisible(v: boolean): unknown }, tier: 'near' | 'mid' | 'far'): void;
}

/**
 * Small, non-interactive labeled markers at the major cities. They live in
 * world space, so they pan with the map. No interaction yet — just landmarks
 * that help the state read as Washington.
 *
 * @param exclude City names to skip (e.g. Seattle, now a real walkable town).
 * @param tier LOD tier for these markers: 'mid' = settlement names on the
 *   dense hand-built maps, 'far' = zone/region nameplates (never hidden),
 *   'near' = interior signage readable only up close.
 */
export class CityMarkers {
  constructor(scene: Phaser.Scene, map: GameMap, exclude: string[] = [], tier: 'near' | 'mid' | 'far' = 'far') {
    const host = scene as Partial<LodLabelHost>;
    for (const city of map.cities) {
      if (exclude.includes(city.name)) continue;
      const { x, y } = map.tileToWorldCenter(city.tx, city.ty);

      // Diamond marker.
      const marker = scene.add.rectangle(x, y, 7, 7, 0xf4f0e6, 1);
      marker.setStrokeStyle(1.5, 0x1a1410, 1);
      marker.setAngle(45);
      marker.setDepth(6);
      host.registerLodLabel?.(marker, tier);

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
      host.registerLodLabel?.(label, tier);
    }
  }
}

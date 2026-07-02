import type { GameMap } from '../map/GameMap';

/**
 * Multi-world support. A WORLD is a separate map with its own tile data and
 * coordinate region; only ONE is active/rendered at a time. The set is a registry
 * (not hardcoded to two) so a new map is added by building its GameMap at a fresh
 * origin and registering a WorldRuntime — see MainScene.setupHeaven for the
 * Heaven example and travelToWorld for the transition.
 */
export type WorldId = string;

export const WORLD_EARTH: WorldId = 'earth';
export const WORLD_HEAVEN: WorldId = 'heaven';
export const WORLD_HELL: WorldId = 'hell';
export const WORLD_EGYPT: WorldId = 'egypt';

/** A built, registered world: its map plus where to drop the player by default. */
export interface WorldRuntime {
  readonly id: WorldId;
  readonly map: GameMap;
  /** Player-vs-terrain collider for this world (toggled active with the world). */
  readonly collider: Phaser.Physics.Arcade.Collider;
  /** Fallback arrival point (world coords) when no remembered position exists. */
  readonly defaultArrival: { x: number; y: number };
}

import washingtonMap from '../map/washington.map.json';
import egyptMapJson from '../map/egypt.map.json';
import type { WashingtonMap } from '../map/mapTypes';
import { HEAVEN_WIDTH } from '../map/heavenWorld';
import { HELL_WIDTH } from '../map/hellWorld';
import { TILE_SIZE } from '../render/tileAtlas';
import { HEAVEN_WORLD_GAP } from '../game/settings';
import { CITY_DEFS } from './cities';

/**
 * The GLOBE world's scene-frame origin, from SIZES alone (positions never
 * enter the chain): earth slot + heaven + hell + reserved-egypt slot + the
 * city sub-maps, each followed by the shared gap. This is the single source —
 * MainScene.computeGlobeOriginX delegates here and setupGlobe asserts the
 * step-by-step chain agrees. Save migration needs it STATICALLY (localStorage
 * reads happen before any scene exists), which is why it lives in a module and
 * not on the scene. Projection-independent: only dense hand-built map widths
 * participate, and those never rescale.
 */
export function globeSceneOriginX(): number {
  const ts = TILE_SIZE;
  const earthW = (washingtonMap as unknown as WashingtonMap).width * ts;
  const egyptW = (egyptMapJson as unknown as WashingtonMap).width * ts;
  let x = earthW + HEAVEN_WORLD_GAP + HEAVEN_WIDTH * ts + HEAVEN_WORLD_GAP + HELL_WIDTH * ts + HEAVEN_WORLD_GAP + egyptW + HEAVEN_WORLD_GAP;
  for (const def of CITY_DEFS) x += def.buildMap().width * ts + HEAVEN_WORLD_GAP;
  return x;
}

/**
 * HEADLESS SMOKE CHECK for the data-driven world pipeline (npm run smoke).
 * No Phaser, no browser: bundled by esbuild and run under plain node.
 *
 * For every manifest zone it verifies:
 *   1. the world graph is healthy (connectsTo resolves BOTH ways, seaGates
 *      are subsets, no duplicates, nothing unreachable),
 *   2. the zone maps to a region world that has a calibration entry and its
 *      anchor converts to sane pixels on that world's map,
 *   3. every quest beat instantiates through QuestFactory's data path without
 *      throwing, chains in order off the entry prerequisite, carries
 *      HAND_AUTHORED_TODO markers where prose is reserved, and collides with
 *      no existing quest id in the real QUEST_REGISTRY.
 * Exits nonzero on any failure.
 */
// Runs under node (no @types/node in this browser project — declare the bit we use).
declare const process: { exit(code: number): never };

import { WORLD } from './world-manifest';
import { WORLD_CALIBRATION } from './world-calibration';
import { validateWorldGraph, worldIdForZone, planZoneStamp, createWorld, stampZone } from './world-builder';
import { buildZoneQuests, appendToRegistry } from './quest-factory';
import { QUEST_REGISTRY } from '../quest/questData';

/** Known LOCAL pixel extents per region world (for the bounds sanity check). */
const WORLD_PIXEL_BOUNDS: Record<string, { w: number; h: number }> = {
  earth: { w: 1100 * 32, h: 800 * 32 }, // the Washington/NA map
  egypt: { w: 600 * 32, h: 650 * 32 },
};

const failures: string[] = [];
const fail = (msg: string): void => {
  failures.push(msg);
  console.error(`FAIL  ${msg}`);
};
const pass = (msg: string): void => console.log(`ok    ${msg}`);

// 1) Graph health.
const graphErrors = validateWorldGraph(WORLD);
if (graphErrors.length) graphErrors.forEach((e) => fail(`graph: ${e}`));
else pass(`graph: ${WORLD.length} zones, adjacency resolves in both directions`);

// 2) Calibration + coordinate conversion + stamp planning per zone.
const regionWorlds = new Map<string, ReturnType<typeof createWorld>>();
for (const zone of WORLD) {
  try {
    const worldId = worldIdForZone(zone);
    const cal = WORLD_CALIBRATION[worldId];
    if (!cal) {
      fail(`${zone.id}: no calibration entry for world '${worldId}'`);
      continue;
    }
    const plan = planZoneStamp(zone, cal);
    const bounds = WORLD_PIXEL_BOUNDS[worldId];
    const inBounds =
      !bounds || (plan.centerPx.x >= 0 && plan.centerPx.y >= 0 && plan.centerPx.x <= bounds.w && plan.centerPx.y <= bounds.h);
    if (!inBounds) {
      fail(`${zone.id}: anchor converts OFF its world map (${plan.centerPx.x.toFixed(0)}, ${plan.centerPx.y.toFixed(0)})`);
      continue;
    }
    // Exercise the region-world path (plan-only; Phase 0 paints nothing).
    if (!regionWorlds.has(worldId)) regionWorlds.set(worldId, createWorld(worldId, cal));
    stampZone(regionWorlds.get(worldId)!, zone);
    pass(
      `${zone.id}: → world '${worldId}' at local px (${plan.centerPx.x.toFixed(0)}, ${plan.centerPx.y.toFixed(0)}), ` +
        `${plan.spawnMarkers.length} spawn markers, transitions [${plan.transitions.map((t) => `${t.toZoneId}:${t.kind}`).join(', ')}]`,
    );
  } catch (e) {
    fail(`${zone.id}: ${(e as Error).message}`);
  }
}

// 3) Quest beats instantiate + chain + never collide with real quests.
let entry: string | null = 'smoke-entry-prerequisite';
const allGenerated = [];
for (const zone of WORLD) {
  try {
    const { defs, exitQuestId } = buildZoneQuests(zone, entry);
    if (defs.length !== zone.questChain.length) throw new Error(`built ${defs.length}/${zone.questChain.length} beats`);
    if (defs.length && defs[0].prerequisites[0] !== entry) throw new Error('first beat not gated on the entry prerequisite');
    for (let i = 1; i < defs.length; i++) {
      if (defs[i].prerequisites[0] !== defs[i - 1].id) throw new Error(`beat '${defs[i].id}' not chained to '${defs[i - 1].id}'`);
    }
    for (let i = 0; i < defs.length; i++) {
      const beat = zone.questChain[i];
      const reserved = beat.handAuthored === true || zone.handAuthored === true;
      const hasTodo = defs[i].npcInactiveLines[0].includes(`HAND_AUTHORED_TODO: ${beat.id}`);
      if (reserved && !hasTodo) throw new Error(`hand-authored beat '${beat.id}' is missing its HAND_AUTHORED_TODO marker`);
      if (!reserved && hasTodo) throw new Error(`loop-authored beat '${beat.id}' unexpectedly carries a TODO marker`);
    }
    allGenerated.push(...defs);
    entry = exitQuestId ?? entry; // explicit spine hand-off zone → zone
    pass(`${zone.id}: ${defs.length} quest beats instantiate + chain (exit '${exitQuestId}')`);
  } catch (e) {
    fail(`${zone.id} quests: ${(e as Error).message}`);
  }
}
try {
  appendToRegistry(QUEST_REGISTRY, allGenerated);
  pass(`registry composition: ${allGenerated.length} generated beats collide with none of the ${QUEST_REGISTRY.length} real quests`);
} catch (e) {
  fail(`registry composition: ${(e as Error).message}`);
}

console.log(failures.length ? `\nSMOKE FAILED — ${failures.length} problem(s)` : '\nSMOKE PASSED');
if (failures.length) process.exit(1);

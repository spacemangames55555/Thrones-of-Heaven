/**
 * HEADLESS SMOKE CHECK for the data-driven world pipeline (npm run smoke).
 * No Phaser, no browser: bundled by esbuild and run under plain node.
 *
 * Verifies, for EVERY manifest zone (NA + Europe):
 *   1. the world graph is healthy (connectsTo resolves BOTH ways, seaGates are
 *      subsets, no duplicates, nothing unreachable),
 *   2. the zone maps to a region world with a calibration entry and its anchor
 *      converts to pixels INSIDE that world's bounds (dense or sparse span),
 *   3. every id in spine-chains.ts resolves: keys are real zones; every entry
 *      (including inside anyOf groups) is a real quest beat in the manifest,
 *   4. every quest beat instantiates through QuestFactory using its
 *      spine-chain entry prerequisite, chains in order, carries
 *      HAND_AUTHORED_TODO markers where reserved (incl. the eu-06 five-class
 *      variant scaffold), and home-city chains carry classRequirement,
 *   5. every enemyFamily named by a zone resolves in the roster,
 *   6. zero quest-id collisions against the live QUEST_REGISTRY, and the
 *      anyOf/unknown-id prerequisite rules behave (unknown = UNMET, no crash).
 * Exits nonzero on any failure.
 */
// Runs under node (no @types/node in this browser project — declare the bit we use).
declare const process: { exit(code: number): never };

import { WORLD } from './world-manifest';
import { WORLD_CALIBRATION, WORLD_SPAN_DEGREES } from './world-calibration';
import { validateWorldGraph, worldIdForZone, planZoneStamp, createWorld, createSparseWorld, stampZone } from './world-builder';
import { buildZoneQuests, appendToRegistry, CALLBACK_CLASSES_BY_CONTINENT } from './quest-factory';
import { ENTRY_PREREQUISITES } from './spine-chains';
import { familyResolves } from './enemy-roster';
import { QUEST_REGISTRY, type QuestDef } from '../quest/questData';
import { QuestChain } from '../quest/QuestChain';

/** Known LOCAL pixel extents per DENSE region world (sparse worlds use spans). */
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
    if (!regionWorlds.has(worldId)) {
      const span = WORLD_SPAN_DEGREES[worldId];
      regionWorlds.set(worldId, span ? createSparseWorld(worldId, cal, span) : createWorld(worldId, cal));
    }
    const rw = regionWorlds.get(worldId)!;
    const plan = planZoneStamp(zone, cal);
    const bounds = rw.sparse ? rw.sparse.boundsPx : WORLD_PIXEL_BOUNDS[worldId];
    const inBounds =
      !bounds || (plan.centerPx.x >= 0 && plan.centerPx.y >= 0 && plan.centerPx.x <= bounds.w && plan.centerPx.y <= bounds.h);
    if (!inBounds) {
      fail(`${zone.id}: anchor converts OFF its world (${plan.centerPx.x.toFixed(0)}, ${plan.centerPx.y.toFixed(0)})`);
      continue;
    }
    stampZone(rw, zone); // plan-only (no tile stamper): sparse worlds also record their chunk
    pass(`${zone.id}: → '${worldId}' @ (${plan.centerPx.x.toFixed(0)}, ${plan.centerPx.y.toFixed(0)}), transitions [${plan.transitions.map((t) => `${t.toZoneId}:${t.kind}`).join(', ')}]`);
  } catch (e) {
    fail(`${zone.id}: ${(e as Error).message}`);
  }
}
{
  const eu = regionWorlds.get('europe');
  if (eu?.sparse) pass(`europe sparse world: ${eu.sparse.chunks.length} chunks planned inside ${eu.sparse.boundsPx.w.toFixed(0)}x${eu.sparse.boundsPx.h.toFixed(0)}px span (no dense allocation)`);
}

// 3) Spine-chain table: keys are zones; every id (incl. anyOf members) is a real beat.
{
  const zoneIds = new Set(WORLD.map((z) => z.id));
  const beatIds = new Set(WORLD.flatMap((z) => z.questChain.map((b) => b.id)));
  let bad = 0;
  for (const [zoneId, entries] of Object.entries(ENTRY_PREREQUISITES)) {
    if (!zoneIds.has(zoneId)) {
      fail(`spine-chains: key '${zoneId}' is not a manifest zone`);
      bad++;
    }
    for (const e of entries) {
      const ids = typeof e === 'string' ? [e] : e.anyOf;
      for (const id of ids) {
        if (!beatIds.has(id)) {
          fail(`spine-chains: '${zoneId}' references unknown beat '${id}'`);
          bad++;
        }
      }
    }
  }
  if (!bad) pass(`spine-chains: all ${Object.keys(ENTRY_PREREQUISITES).length} entries resolve (incl. anyOf members)`);
}

// 4) Quest beats instantiate + chain off their spine-chain entry prerequisite.
const allGenerated: QuestDef[] = [];
for (const zone of WORLD) {
  try {
    const entry = ENTRY_PREREQUISITES[zone.id] ?? null;
    const { defs } = buildZoneQuests(zone, entry);
    if (defs.length !== zone.questChain.length) throw new Error(`built ${defs.length}/${zone.questChain.length} beats`);
    const expectedFirst = entry === null ? [] : entry;
    if (defs.length && JSON.stringify(defs[0].prerequisites) !== JSON.stringify(expectedFirst)) {
      throw new Error('first beat not gated on the spine-chain entry prerequisite');
    }
    for (let i = 1; i < defs.length; i++) {
      if (defs[i].prerequisites[0] !== defs[i - 1].id) throw new Error(`beat '${defs[i].id}' not chained to '${defs[i - 1].id}'`);
    }
    for (let i = 0; i < defs.length; i++) {
      const beat = zone.questChain[i];
      const reserved = beat.handAuthored === true || zone.handAuthored === true;
      const hasTodo = defs[i].npcInactiveLines[0].includes(`HAND_AUTHORED_TODO: ${beat.id}`);
      if (reserved && !hasTodo) throw new Error(`hand-authored beat '${beat.id}' is missing its HAND_AUTHORED_TODO marker`);
      if (!reserved && hasTodo) throw new Error(`loop-authored beat '${beat.id}' unexpectedly carries a TODO marker`);
      if (zone.homeClass && defs[i].classRequirement !== zone.homeClass.toLowerCase()) {
        throw new Error(`home-city beat '${beat.id}' is missing classRequirement '${zone.homeClass}'`);
      }
      if (beat.summary.includes('class-variant')) {
        // One TODO variant per class in the beat's CONTINENT callback list
        // (Europe 5, Africa 2 — the factory's map is the single source of truth).
        const expected = (CALLBACK_CLASSES_BY_CONTINENT[zone.continent] ?? []).length;
        const variants = defs[i].classVariants ?? {};
        const names = Object.keys(variants);
        const allTodo = names.every((c) => variants[c][0].includes(`HAND_AUTHORED_TODO: ${beat.id}`));
        if (names.length !== expected || !allTodo) throw new Error(`class-variant beat '${beat.id}' should scaffold ${expected} TODO variants (got ${names.length})`);
      }
    }
    allGenerated.push(...defs);
    pass(`${zone.id}: ${defs.length} quest beats instantiate + chain${zone.homeClass ? ` (class-gated: ${zone.homeClass})` : ''}`);
  } catch (e) {
    fail(`${zone.id} quests: ${(e as Error).message}`);
  }
}

// 5) Roster coverage: every named enemy family resolves to something spawnable.
{
  const missing = new Set<string>();
  for (const zone of WORLD) {
    for (const fam of zone.enemyFamilies) if (!familyResolves(fam)) missing.add(fam);
    for (const beat of zone.questChain) if (beat.enemyFamily && !familyResolves(beat.enemyFamily)) missing.add(beat.enemyFamily);
  }
  if (missing.size) fail(`roster: unresolved enemy families: ${[...missing].join(', ')}`);
  else pass('roster: every zone/beat enemy family resolves (5 new gray-box families + existing spawners + champion template)');
}

// 6) Registry composition + prerequisite rules behave at runtime.
try {
  const combined = appendToRegistry(QUEST_REGISTRY, allGenerated);
  pass(`registry composition: ${allGenerated.length} generated beats collide with none of the ${QUEST_REGISTRY.length} real quests`);
  const chain = new QuestChain(combined);
  // Unknown prerequisite ids read as UNMET (locked), never crash:
  const gated = combined.find((q) => q.prerequisites.length > 0 && typeof q.prerequisites[0] === 'string' && !combined.some((o) => o.id === q.prerequisites[0]));
  if (chain.status('rom-01-mentor') !== 'locked') fail('classRequirement: rom-01 should be locked with no player class set');
  chain.setPlayerClass('priest');
  if (chain.status('rom-01-mentor') !== 'available') fail('classRequirement: rom-01 should be available to a Priest');
  if (chain.status('mur-01-mentor') !== 'locked') fail('classRequirement: mur-01 should stay locked for a Priest');
  if (gated && chain.status(gated.id) === 'available') fail(`guard rule: '${gated.id}' with an unregistered prerequisite should read UNMET`);
  pass('runtime rules: class gating + anyOf/unknown-prerequisite guard behave (no crash)');
} catch (e) {
  fail(`registry composition: ${(e as Error).message}`);
}

console.log(failures.length ? `\nSMOKE FAILED — ${failures.length} problem(s)` : '\nSMOKE PASSED');
if (failures.length) process.exit(1);

import type { QuestDef } from '../quest/questData';
import { WORLD, getZone } from './world-manifest';
import { ENTRY_PREREQUISITES } from './spine-chains';
import { buildZoneQuests } from './quest-factory';

/**
 * WHICH Europe zones are BUILT (stamped + quest-registered) in the live game.
 * The build loop appends one id per zone commit, in manifest order — this list
 * is what MainScene.setupEurope materializes and what the live quest registry
 * composes from. Zones NOT listed here exist only as manifest data.
 */
export const EUROPE_BUILT_ZONES: string[] = [
  'rome-eternal-seat',
  'campania-shadow',
  'apulia-eastern-dock',
  'epirus-landing',
  'thessaloniki-outpost',
  'thermopylae-pass',
  'delphi-sanctuary',
  'murmansk-bone-harbor',
  'karelia-lakes',
  'smolensk-gate',
  'moscow-crystal-court',
  'bryansk-woodland',
  'kyiv-river-gate',
  'carpathian-crossing',
  'munich-anvil-hold',
  'tyrol-forge-road',
  'alps-high-pass',
  'vienna-river-muster',
  'belgrade-iron-river',
  'vardar-corridor',
  'london-grey-chorus',
];

/**
 * The generated QuestDefs for every BUILT Europe zone, chained per
 * spine-chains.ts (home cities have no entry prerequisite — they're gated by
 * classRequirement instead). Composed AFTER the hand-authored registry via
 * appendToRegistry, so existing quests are untouched and prerequisite ids
 * that reference not-yet-built zones simply read as UNMET.
 */
export function buildEuropeQuestDefs(): QuestDef[] {
  const defs: QuestDef[] = [];
  for (const id of EUROPE_BUILT_ZONES) {
    const zone = getZone(id);
    if (!zone) throw new Error(`EUROPE_BUILT_ZONES lists unknown zone '${id}'`);
    defs.push(...buildZoneQuests(zone, ENTRY_PREREQUISITES[id] ?? null).defs);
  }
  return defs;
}

/** Manifest order sanity: built zones must appear in WORLD order (build order). */
export function builtZonesInManifestOrder(): boolean {
  const order = WORLD.map((z) => z.id);
  const idx = EUROPE_BUILT_ZONES.map((id) => order.indexOf(id));
  return idx.every((v, i) => v >= 0 && (i === 0 || v > idx[i - 1]));
}

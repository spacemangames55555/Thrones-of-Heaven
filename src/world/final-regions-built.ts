import type { QuestDef } from '../quest/questData';
import { getZone } from './world-manifest';
import { ENTRY_PREREQUISITES } from './spine-chains';
import { buildZoneQuests } from './quest-factory';

/**
 * WHICH final-region zones are BUILT (stamped into the 'globe' world + quest-
 * registered) in the live game — BABEL (the Assassin's road), ULURU (the
 * Hunter's songline) and TEOTIHUACAN (the Savage's tour). Appended one zone
 * per build run, in manifest order. Home-city Act I chains (Dubai/Assassin,
 * Sydney/Hunter, Mexico City/Savage) register class-gated with manual-start
 * openers — nothing auto-starts on a fresh boot.
 */
export const FINAL_REGIONS_BUILT_ZONES: string[] = [
  'dubai-glass-souk',
  'pearl-coast',
  'mesopotamian-marshes',
  'shinar-muster',
];

/** Generated QuestDefs for every BUILT final-region zone (the shared factory). */
export function buildFinalRegionsQuestDefs(): QuestDef[] {
  const defs: QuestDef[] = [];
  for (const id of FINAL_REGIONS_BUILT_ZONES) {
    const zone = getZone(id);
    if (!zone) throw new Error(`FINAL_REGIONS_BUILT_ZONES lists unknown zone '${id}'`);
    defs.push(...buildZoneQuests(zone, ENTRY_PREREQUISITES[id] ?? null).defs);
  }
  return defs;
}

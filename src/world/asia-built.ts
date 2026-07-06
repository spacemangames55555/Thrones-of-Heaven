import type { QuestDef } from '../quest/questData';
import { getZone } from './world-manifest';
import { ENTRY_PREREQUISITES } from './spine-chains';
import { buildZoneQuests } from './quest-factory';

/**
 * WHICH Asia zones are BUILT (stamped into the 'globe' world + quest-
 * registered) in the live game. Appended one zone per build run, in manifest
 * order (the Kunlun march). Home-city Act I chains (Lhasa/Monk, Kyoto/Samurai,
 * Bali/Atlantean) register class-gated with manual-start openers — nothing
 * auto-starts on a fresh boot.
 */
export const ASIA_BUILT_ZONES: string[] = [
  'lhasa-prayer-citadel',
  'changtang-empty-crossing',
  'hoh-xil-roof-of-world',
  'kunlun-jade-gate',
  'kunlun-ascent',
  'kunlun-jade-court',
  'kyoto-thousand-gates',
  'setouchi-inland-sea',
];

/** Generated QuestDefs for every BUILT Asia zone (same factory as Europe/Africa). */
export function buildAsiaQuestDefs(): QuestDef[] {
  const defs: QuestDef[] = [];
  for (const id of ASIA_BUILT_ZONES) {
    const zone = getZone(id);
    if (!zone) throw new Error(`ASIA_BUILT_ZONES lists unknown zone '${id}'`);
    defs.push(...buildZoneQuests(zone, ENTRY_PREREQUISITES[id] ?? null).defs);
  }
  return defs;
}

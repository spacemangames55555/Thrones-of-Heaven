import type { QuestDef } from '../quest/questData';
import { getZone } from './world-manifest';
import { ENTRY_PREREQUISITES } from './spine-chains';
import { buildZoneQuests } from './quest-factory';

/**
 * WHICH Africa zones are BUILT (quest-registered) in the live game. CAIRO is
 * PRE-EXISTING: it corresponds to the hand-built EGYPT world + Faiyum, exactly
 * as Seattle corresponds to the Washington map — its chain registers (the
 * Wizard's Act I, cai-01..cai-04, class-gated + manual-start) but the zone is
 * NEVER stamped. The other 12 zones are appended here by the Africa build runs.
 */
export const AFRICA_BUILT_ZONES: string[] = [
  'cairo-nile-crown',
  'luxor-valley-of-kings',
];

/** Zones whose CONTENT lives in a pre-existing hand-built world (never stamped):
 *  dev jumps / travel for their beats target that world, not the region world. */
export const PREBUILT_ZONE_WORLD: Record<string, string> = {
  'cairo-nile-crown': 'egypt',
};

/** Generated QuestDefs for every BUILT Africa zone (same factory as Europe). */
export function buildAfricaQuestDefs(): QuestDef[] {
  const defs: QuestDef[] = [];
  for (const id of AFRICA_BUILT_ZONES) {
    const zone = getZone(id);
    if (!zone) throw new Error(`AFRICA_BUILT_ZONES lists unknown zone '${id}'`);
    defs.push(...buildZoneQuests(zone, ENTRY_PREREQUISITES[id] ?? null).defs);
  }
  return defs;
}

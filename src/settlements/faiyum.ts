import type { SettlementDef } from './types';

/**
 * FAIYUM VILLAGE (Pass 7 pilot) — a mudbrick fishing-and-pottery village on
 * the south shore of Lake Qarun, at its TRUE coordinate. "Mudbrick" is
 * flavor only: the stamp is the EXISTING town vocabulary (buildings, ground,
 * roads, plaza, palms via the tree tile) — the art upgrade is ledgered.
 * NPC names + every line are TODO-lore-approve placeholders:
 *   Sefu  — fisherman (Lake Qarun's living)
 *   Naila — potter (the Faiyum pottery tradition)
 * The waystone is the placeholder pillar, node id `faiyum`, id-referenced,
 * DISCOVERY-based — never pre-attuned.
 */
export const FAIYUM_SETTLEMENT: SettlementDef = {
  id: 'faiyum',
  displayName: 'Faiyum',
  lat: 29.31,
  lng: 30.84,
  rows: [
    't..BB..=..BB..t',
    '...BB..=..BB...',
    '.t.....=.....t.',
    'BB..ooooo...BB.',
    'BB..oosoo...BB.',
    '====ooooo======',
    '.......=.......',
    '.BB....=....BB.',
    '.BB....=....BB.',
    't......=......t',
  ],
  npcs: [
    {
      name: 'Sefu',
      role: 'fisherman',
      offset: { tx: -2, ty: 0 },
      lines: [
        'Sefu: The lake gives what it gives. Some days nets full, some days only reeds. (TODO-lore-approve)',
        'Sefu: You walked in off the sand? Then you will want water before talk. Well is by the plaza. (TODO-lore-approve)',
      ],
    },
    {
      name: 'Naila',
      role: 'potter',
      offset: { tx: 2, ty: 0 },
      lines: [
        'Naila: Faiyum clay remembers hands better than people do. This bowl will outlive us both. (TODO-lore-approve)',
        'Naila: If you are heading east toward the river, carry water and do not trust the noon sun. (TODO-lore-approve)',
      ],
    },
  ],
  waystone: { nodeId: 'faiyum', label: 'Faiyum Waystone' },
  respawnEligible: true,
};

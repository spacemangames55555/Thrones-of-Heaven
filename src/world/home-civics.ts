import { getZone } from './world-manifest';

/**
 * HOME CIVIC LAYER — data + helpers for the generated home cities' civic beats
 * (the Druid's seven-beat opening, generalized).
 *
 * NEIGHBOR NPCs: every generated home city gets a SECOND named interactable
 * (the mentor pattern reused — nameplate + Speak button), placed a sensible
 * walk from the mentor so the c1 errand is a small journey through town.
 * MainScene places them at region build (Cairo's in the Egypt binding).
 */
export const HOME_NEIGHBORS: Readonly<Record<string, string>> = {
  'munich-anvil-hold': "Greta, innkeeper of the Anvil's Rest",
  'cairo-nile-crown': 'Amara, the date-seller',
  'murmansk-bone-harbor': 'Old Varya, the net-mender',
  'london-grey-chorus': 'Wren, the lamplighter',
  'moscow-crystal-court': 'Fyodor, the glazier',
  'kinshasa-river-drum': 'Mama Nsimba, the market cook',
  'kyoto-thousand-gates': 'Hana, the shrine-keeper',
  'lhasa-prayer-citadel': 'Pemba, the tea-master',
  'dubai-glass-souk': 'Rashid, the glassblower',
  'rome-eternal-seat': 'Lucia, the baker by the basilica steps',
  'mexico-lake-crown': 'Itzel, the canal farmer',
  'sydney-harbour-watch': 'Banjo, the ferryman',
  'bali-drowned-crown': 'Ketut, the offering-maker',
};

/** The zone's civic beat ids (<pfx>-c1-… / -c2-… / -c3-…). Empty until the
 *  civic beats land in the manifest — every consumer no-ops gracefully. */
export function civicBeatIds(zoneId: string): string[] {
  return (getZone(zoneId)?.questChain ?? []).filter((b) => /-c[123]-/.test(b.id)).map((b) => b.id);
}

/** The neighbor's spoken line: the zone's c1 errand summary — loop-writable
 *  generated prose, deliberately NEVER a HAND_AUTHORED_TODO. */
export function neighborLineFor(zoneId: string): string {
  const c1 = getZone(zoneId)?.questChain.find((b) => b.id.includes('-c1-'));
  return c1 ? c1.summary : 'A neighbor of the settlement. They nod as you pass.';
}

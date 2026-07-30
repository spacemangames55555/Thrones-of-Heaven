/**
 * VILLAGE-TIER SETTLEMENT REGISTRY (Pass 7): the framework for NON-home
 * settlements — small authored stamps planted at TRUE coordinates on the
 * streamed world, built entirely from the EXISTING town tile vocabulary.
 * The 14 home cities are NOT part of this registry (read-only referenced by
 * the contract validator to guarantee disjointness; their unification stays
 * ledgered). Zero new art, zero new mechanics: stamps ride the 6C sub-stamp
 * machinery, NPCs are plain Npc instances, waystones are ordinary waypoint
 * nodes (discovery-based, never pre-attuned).
 */
export interface SettlementNpcDef {
  /** TODO-lore-approve: names + roles are placeholders until Casey rules. */
  name: string;
  role: string;
  lines: string[];
  /** Tile offset from the settlement spawn ('s') tile. */
  offset: { tx: number; ty: number };
}

export interface SettlementDef {
  id: string;
  displayName: string;
  /** True Earth anchor of the stamp CENTER. */
  lat: number;
  lng: number;
  /** Stamp rows in the EXISTING town legend (see townData TOWN_LEGEND). */
  rows: string[];
  /** 1–3 named NPCs. */
  npcs: SettlementNpcDef[];
  /** Optional waystone: an ordinary waypoint node, id-referenced. */
  waystone?: { nodeId: string; label: string };
  /** Optional vendor slot (none shipped yet — the contract reserves it). */
  vendor?: { name: string; offset: { tx: number; ty: number } };
  /** Respawn-to-nearest includes this settlement's spawn when true. */
  respawnEligible: boolean;
}

/** CONTRACT: a settlement footprint never exceeds this (village tier). */
export const SETTLEMENT_MAX_FOOTPRINT_TILES = 48;

/** Contract validation — throws at module load (build-breaking, gate-backed). */
export function validateSettlement(s: SettlementDef): void {
  const w = s.rows[0]?.length ?? 0;
  const h = s.rows.length;
  if (w === 0 || h === 0) throw new Error(`settlement ${s.id}: empty stamp`);
  if (w > SETTLEMENT_MAX_FOOTPRINT_TILES || h > SETTLEMENT_MAX_FOOTPRINT_TILES) {
    throw new Error(`settlement ${s.id}: footprint ${w}x${h} exceeds the ${SETTLEMENT_MAX_FOOTPRINT_TILES}-tile village cap`);
  }
  if (s.rows.some((r) => r.length !== w)) throw new Error(`settlement ${s.id}: ragged rows`);
  if (!s.rows.some((r) => r.includes('s'))) throw new Error(`settlement ${s.id}: no spawn ('s') cell`);
  if (s.npcs.length < 1 || s.npcs.length > 3) throw new Error(`settlement ${s.id}: ${s.npcs.length} NPCs outside the 1-3 contract`);
}

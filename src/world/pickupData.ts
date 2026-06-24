/**
 * Pickup types — DATA. A pickup carries a `type` string; the visual (color,
 * label) lives here and the COLLECTION EFFECT lives in the scene (keyed by the
 * same type). This keeps the pickup system generic: a future loot/crystal/quest
 * item is a new entry here plus a new case in the scene's collect handler — no
 * changes to PickupSystem itself.
 *
 * >>> TO ADD A PICKUP TYPE: add an entry here, then handle its `type` in
 *     MainScene.onPickupCollected. <<<
 */
export interface PickupTypeDef {
  readonly key: string;
  /** Mote tint. */
  readonly color: number;
  /** Player distance (px) at which it is collected (falls back to spawn override). */
  readonly collectRadius: number;
  /** Human label (for HUD / debug). */
  readonly label: string;
}

export const PICKUP_TYPES: Record<string, PickupTypeDef> = {
  'holy-power': { key: 'holy-power', color: 0xffe06a, collectRadius: 38, label: 'Holy Power' },
  // The descent arc's "pillage the shipment" objective — proves a SECOND pickup
  // type reuses the same system (its collect effect is a quest trigger, not a count).
  plunder: { key: 'plunder', color: 0xc89b3a, collectRadius: 42, label: 'Plunder' },
};

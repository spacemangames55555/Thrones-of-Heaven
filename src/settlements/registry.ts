import { validateSettlement, type SettlementDef } from './types';
import { FAIYUM_SETTLEMENT } from './faiyum';

/** Every shipped village-tier settlement (the 14 home cities are NOT here —
 *  see types.ts). Validation throws at module load; the gate re-proves it. */
export const SETTLEMENTS: readonly SettlementDef[] = [FAIYUM_SETTLEMENT];
for (const s of SETTLEMENTS) validateSettlement(s);

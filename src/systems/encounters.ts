/**
 * ENCOUNTER COORDINATOR (Pass 6B — simulation locality): encounters register
 * an ANCHOR and a RADIUS; their sim state is derived from player distance
 * every frame. Beyond the radius an engaged encounter SUSPENDS; back inside
 * it RESUMES. Teleports are not a special case — a pure distance function
 * covers them by construction. The coordinator owns no encounter mechanics:
 * suspend/resume semantics live with each encounter (guardian full-reset,
 * portal-defense freeze — see MainScene registrations).
 */
export interface EncounterReg {
  id: string;
  anchor: () => { x: number; y: number };
  radiusPx: number;
  /** True while the encounter holds suspendable live state right now. */
  isEngaged: () => boolean;
  onSuspend: () => void;
  onResume: () => void;
}

export class EncounterCoordinator {
  private readonly regs: (EncounterReg & { suspended: boolean })[] = [];

  register(r: EncounterReg): void {
    this.regs.push({ ...r, suspended: false });
  }

  /** Per-frame: derive each encounter's sim state from player distance. */
  update(px: number, py: number): void {
    for (const r of this.regs) {
      const a = r.anchor();
      const far = Math.hypot(a.x - px, a.y - py) > r.radiusPx;
      if (!r.suspended) {
        if (far && r.isEngaged()) {
          r.suspended = true;
          r.onSuspend();
        }
      } else if (!far) {
        r.suspended = false;
        r.onResume();
      }
    }
  }

  /** Gate/debug introspection. */
  isSuspended(id: string): boolean {
    return this.regs.find((r) => r.id === id)?.suspended === true;
  }
}

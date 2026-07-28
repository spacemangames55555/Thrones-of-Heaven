/**
 * PWA UPDATE FLOW (Pass 6B addendum): the service worker (sw.js, emitted at
 * build with the build id baked in) exists ONLY to detect a newer deploy —
 * it caches nothing. When a new worker reaches the WAITING state this class
 * fires onUpdateReady (MainScene shows the "Update ready — Restart" toast);
 * tapping it activates the waiting worker and reloads ON CONTROLLERCHANGE.
 * There is NO other reload path — a mid-session deploy never silent-reloads.
 */
export interface WaitingLike {
  postMessage(message: unknown): void;
}

export class PwaUpdater {
  waiting: WaitingLike | null = null;
  onUpdateReady?: () => void;
  /** Set by activate(); controllerchange only reloads when the player asked. */
  activated = false;

  async register(): Promise<void> {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    try {
      const reg = await navigator.serviceWorker.register('./sw.js');
      if (reg.waiting) this.noteWaiting(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        w?.addEventListener('statechange', () => {
          if (w.state === 'installed' && navigator.serviceWorker.controller) this.noteWaiting(w);
        });
      });
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (this.activated) location.reload();
      });
    } catch {
      /* SW unavailable (older browser / storage off) — the beacon just stays dark */
    }
  }

  /** The toast tap: tell the waiting worker to take over; the reload happens
   *  on controllerchange (never before, never without the tap). */
  activate(): void {
    if (!this.waiting) return;
    this.activated = true;
    this.waiting.postMessage('SKIP_WAITING');
  }

  private noteWaiting(w: WaitingLike): void {
    this.waiting = w;
    this.onUpdateReady?.();
  }

  /** GATE SEAM: inject a fake waiting worker that records its messages — the
   *  toast, the tap, and the activation path run for real; only the browser
   *  side (controllerchange → reload) is absent, so the gate page survives. */
  simulateWaiting(): { messages: unknown[] } {
    const rec = { messages: [] as unknown[] };
    this.noteWaiting({ postMessage: (m) => rec.messages.push(m) });
    return rec;
  }
}

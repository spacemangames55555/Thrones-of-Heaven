import Phaser from 'phaser';
import { FEEL } from '../ui/feel-config';
import { TILE_PX, formatKm } from '../world/world-scale';
import {
  DISCOVER_RADIUS_TILES,
  INTERACT_RADIUS_TILES,
  MAX_NUDGE_TILES,
  buildWaypointRegistry,
  type WaypointDef,
} from '../world/waypoint-registry';

/**
 * WAYPOINT SYSTEM (WORLD SCALE V2, Pass 4): the discovered-teleport network.
 * Pure travel logic — MainScene owns the pillars, buttons, panel, and save
 * plumbing through the host interface. Travel is FREE this pass (the
 * crystal/arcane-liquid cost hook is ledgered, not wired).
 */
export interface ResolvedWaypoint extends WaypointDef {
  x: number;
  y: number;
  nudgedTiles: number;
}

export interface WaypointHost {
  playerPos(): { x: number; y: number };
  resolveZoneArrival(zoneId: string): { x: number; y: number } | null;
  /** Composed walkability truth (stamps + earth source), or null before packs. */
  composedWalkable(x: number, y: number): boolean | null;
  teleport(x: number, y: number): void;
  banner(text: string): void;
  onUnlocked(node: ResolvedWaypoint): void;
  onNudged(node: ResolvedWaypoint): void;
  classId(): string;
}

const DISCOVER_SCAN_MS = 400;

export class WaypointSystem {
  readonly nodes: ResolvedWaypoint[] = [];
  readonly unlocked = new Set<string>();
  casting: { id: string; start: number } | null = null;
  validated = false;
  private lastScan = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly host: WaypointHost,
  ) {}

  /** Resolve the registry onto live anchors (zone arrivals / authored sites). */
  build(): void {
    for (const def of buildWaypointRegistry()) {
      const pos = def.zoneId ? this.host.resolveZoneArrival(def.zoneId) : (def.fixed ?? null);
      if (!pos) throw new Error(`waypoints: node ${def.id} resolved no anchor`);
      this.nodes.push({ ...def, x: pos.x, y: pos.y, nudgedTiles: 0 });
    }
    this.ensureHomeUnlocked();
  }

  /** The player's own class home waystone always starts unlocked. */
  ensureHomeUnlocked(): void {
    const home = this.nodes.find((n) => n.classId === this.host.classId());
    if (home) this.unlocked.add(home.id);
  }

  /** Load persisted unlocks (v18 save field), keeping the class home rule. */
  load(ids: readonly string[] | undefined): void {
    this.unlocked.clear();
    for (const id of ids ?? []) if (this.nodes.some((n) => n.id === id)) this.unlocked.add(id);
    this.ensureHomeUnlocked();
  }

  /** ANCHOR SAFETY: every node must land on walkable ground under the earth
   *  source. Unwalkable anchors nudge DETERMINISTICALLY (fixed ring scan
   *  order) to the nearest walkable within MAX_NUDGE_TILES; beyond that the
   *  position is wrong — hard fail, never guess. Runs once when the earth
   *  truth is available. */
  validateAnchors(): void {
    if (this.validated) return;
    if (this.host.composedWalkable(0, 0) === null) return; // earth truth not ready
    for (const node of this.nodes) {
      if (this.host.composedWalkable(node.x, node.y)) continue;
      let done = false;
      for (let r = 1; r <= MAX_NUDGE_TILES && !done; r++) {
        for (let dy = -r; dy <= r && !done; dy++) {
          for (let dx = -r; dx <= r && !done; dx++) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
            const x = node.x + dx * TILE_PX;
            const y = node.y + dy * TILE_PX;
            if (this.host.composedWalkable(x, y)) {
              node.x = x;
              node.y = y;
              node.nudgedTiles = r;
              this.host.onNudged(node);
              done = true;
            }
          }
        }
      }
      if (!done) throw new Error(`waypoints: ${node.id} has no walkable ground within ${MAX_NUDGE_TILES} tiles — the position is wrong`);
    }
    this.validated = true;
  }

  /** Nearest unlocked-or-not node within the interact radius (the button). */
  nearestInteractable(): ResolvedWaypoint | null {
    const p = this.host.playerPos();
    const r = INTERACT_RADIUS_TILES * TILE_PX;
    let best: ResolvedWaypoint | null = null;
    let bestD = Infinity;
    for (const n of this.nodes) {
      const d = Math.hypot(n.x - p.x, n.y - p.y);
      if (d <= r && d < bestD) {
        best = n;
        bestD = d;
      }
    }
    return best;
  }

  /** Travel list rows: unlocked nodes grouped by continent, sorted by
   *  distance inside each group, with the km readout. */
  travelRows(): { id: string; label: string; distPx: number }[] {
    const p = this.host.playerPos();
    const rows = this.nodes
      .filter((n) => this.unlocked.has(n.id))
      .map((n) => ({ id: n.id, continent: n.continent, distPx: Math.hypot(n.x - p.x, n.y - p.y), name: n.label }));
    rows.sort((a, b) => (a.continent === b.continent ? a.distPx - b.distPx : a.continent < b.continent ? -1 : 1));
    return rows.map((r) => ({ id: r.id, label: `[${r.continent}] ${r.name} — ${formatKm(r.distPx)}`, distPx: r.distPx }));
  }

  /** Start the travel cast (FEEL.waypoint.castMs; damage cancels). */
  startTravel(id: string): boolean {
    if (!this.unlocked.has(id)) {
      this.host.banner('That waystone is still dormant.');
      return false;
    }
    this.casting = { id, start: this.scene.time.now };
    this.host.banner('Channeling the waystone…');
    return true;
  }

  onPlayerDamaged(): void {
    if (this.casting) {
      this.casting = null;
      this.host.banner('Waystone travel interrupted!');
    }
  }

  update(): void {
    const now = this.scene.time.now;
    // Discovery scan (throttled): entering the radius unlocks + persists.
    if (now - this.lastScan >= DISCOVER_SCAN_MS) {
      this.lastScan = now;
      const p = this.host.playerPos();
      const r = DISCOVER_RADIUS_TILES * TILE_PX;
      for (const n of this.nodes) {
        if (!this.unlocked.has(n.id) && Math.hypot(n.x - p.x, n.y - p.y) <= r) {
          this.unlocked.add(n.id);
          this.host.onUnlocked(n);
        }
      }
    }
    // Travel cast completion.
    if (this.casting && now - this.casting.start >= FEEL.waypoint.castMs) {
      const node = this.nodes.find((n) => n.id === this.casting!.id);
      this.casting = null;
      if (node) {
        this.host.teleport(node.x, node.y);
        this.host.banner(`Arrived: ${node.label}`);
      }
    }
  }
}

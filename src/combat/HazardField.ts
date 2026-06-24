import Phaser from 'phaser';

/** How often a player standing in a hazard takes a damage tick (ms). */
const TICK_MS = 450;
/** Amber/gold molten-floor glow (a greedy "treasure" hazard; generic enough to reuse). */
const HAZARD_COLOR = 0xffb020;

interface Zone {
  bossId: string;
  x: number;
  y: number;
  radius: number;
  damage: number;
  /** Time it becomes harmful (after its telegraph). */
  activeAt: number;
  /** Absolute expiry time, or 0 for "whole fight" (cleared on reset/defeat). */
  expireAt: number;
  fill: Phaser.GameObjects.Arc;
  ring: Phaser.GameObjects.Arc;
}

/**
 * PERSISTENT GROUND HAZARD — a reusable boss attack pattern (the 'hazard' kind).
 *
 * Bosses drop lingering damage zones that telegraph, then damage the player who
 * stands in them, ACCUMULATING to progressively deny arena space. Zones are
 * capped per boss (the oldest is recycled past the cap) and can be timed or last
 * the whole fight. The controller only asks for a drop (via a hook); this scene-
 * side system owns the visuals + tick damage. Reusable by ANY boss via data
 * (Greed today; the Trinity later). Zones live on the world-FX layer, so the main
 * camera draws them and the UI camera ignores them.
 */
export class HazardField {
  private readonly scene: Phaser.Scene;
  private readonly layer: Phaser.GameObjects.Layer;
  private zones: Zone[] = [];
  private nextTickAt = 0;

  /** Called when the player takes a hazard tick (the scene applies the damage). */
  onTick?: (damage: number) => void;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer) {
    this.scene = scene;
    this.layer = layer;
  }

  /** Number of live hazard zones (any boss). */
  get count(): number {
    return this.zones.length;
  }

  /** Drop a zone at (x,y): telegraphs for `telegraphMs`, lives `lifetimeMs` (0 = whole fight). */
  spawn(bossId: string, x: number, y: number, radius: number, damage: number, lifetimeMs: number, telegraphMs: number, cap: number): void {
    // Enforce the per-boss concurrent cap — recycle this boss's OLDEST zone first.
    let mine = this.zones.filter((z) => z.bossId === bossId).length;
    while (mine >= Math.max(1, cap)) {
      const idx = this.zones.findIndex((z) => z.bossId === bossId);
      if (idx < 0) break;
      this.removeZone(this.zones[idx]);
      this.zones.splice(idx, 1);
      mine--;
    }

    const now = this.scene.time.now;
    const fill = this.scene.add.circle(x, y, radius, HAZARD_COLOR, 0.0).setDepth(6);
    const ring = this.scene.add.circle(x, y, radius, HAZARD_COLOR, 0).setStrokeStyle(3, HAZARD_COLOR, 0.9).setDepth(6);
    this.layer.add(fill);
    this.layer.add(ring);
    // Telegraph: a pulsing warning outline; then the floor "ignites" (fills in).
    this.scene.tweens.add({ targets: ring, alpha: { from: 0.35, to: 0.95 }, duration: Math.max(120, telegraphMs / 2), yoyo: true, repeat: 1 });
    this.scene.tweens.add({ targets: fill, alpha: 0.3, delay: telegraphMs, duration: 250 });

    this.zones.push({
      bossId,
      x,
      y,
      radius,
      damage,
      activeAt: now + telegraphMs,
      expireAt: lifetimeMs > 0 ? now + telegraphMs + lifetimeMs : 0,
      fill,
      ring,
    });
  }

  /** Each frame: expire finished zones; damage the player standing in any live one. */
  update(time: number, playerX: number, playerY: number, playerDead: boolean): void {
    // Expire timed zones.
    if (this.zones.some((z) => z.expireAt > 0 && time >= z.expireAt)) {
      for (const z of this.zones) if (z.expireAt > 0 && time >= z.expireAt) this.fadeOut(z);
      this.zones = this.zones.filter((z) => !(z.expireAt > 0 && time >= z.expireAt));
    }
    // Tick damage (throttled): the strongest active zone the player is standing in.
    if (!playerDead && time >= this.nextTickAt) {
      let worst = 0;
      for (const z of this.zones) {
        if (time < z.activeAt) continue;
        if (Phaser.Math.Distance.Between(playerX, playerY, z.x, z.y) <= z.radius) worst = Math.max(worst, z.damage);
      }
      if (worst > 0) {
        this.nextTickAt = time + TICK_MS;
        this.onTick?.(worst);
      }
    }
  }

  /** Remove every zone owned by a boss (on its defeat). */
  clearBoss(bossId: string): void {
    for (const z of this.zones) if (z.bossId === bossId) this.removeZone(z);
    this.zones = this.zones.filter((z) => z.bossId !== bossId);
  }

  /** Remove every zone (dev reset). */
  clearAll(): void {
    for (const z of this.zones) this.removeZone(z);
    this.zones = [];
  }

  private fadeOut(z: Zone): void {
    this.scene.tweens.killTweensOf(z.fill);
    this.scene.tweens.killTweensOf(z.ring);
    this.scene.tweens.add({ targets: [z.fill, z.ring], alpha: 0, duration: 250, onComplete: () => { z.fill.destroy(); z.ring.destroy(); } });
  }

  private removeZone(z: Zone): void {
    this.scene.tweens.killTweensOf(z.fill);
    this.scene.tweens.killTweensOf(z.ring);
    z.fill.destroy();
    z.ring.destroy();
  }
}

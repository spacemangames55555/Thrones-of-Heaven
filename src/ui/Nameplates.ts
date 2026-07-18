import Phaser from 'phaser';
import { FEEL } from './feel-config';

/** What a nameplate needs from its owner — position, life, and an HP ratio. */
export interface PlateTarget {
  sprite: { x: number; y: number; visible: boolean; active: boolean };
  isAlive: () => boolean;
  ratio: () => number;
  name: string;
  level: number;
}

/** Family id → player-facing display name (home wildlife overrides with its
 *  FAUNA canon animal at the attach site). Presentation only. */
export const FAMILY_DISPLAY: Readonly<Record<string, string>> = {
  'corrupted-wildlife': 'Corrupted Wildlife',
  'evil-raiders': 'Evil Raider',
  'lesser-evil-scouts': 'Evil Scout',
  'herald-angels': 'Herald Angel',
  'radiant-guardians': 'Radiant Guardian',
  'lesser-angels': 'Lesser Angel',
  'dark-casters': 'Dark Caster',
  'veil-ambushers': 'Veil Ambusher',
  'hollowed-brutes': 'Hollowed Brute',
};

interface Plate {
  label: Phaser.GameObjects.Text;
  barBg: Phaser.GameObjects.Rectangle;
  bar: Phaser.GameObjects.Rectangle;
  used: boolean;
  target: PlateTarget | null;
  lastDamageAt: number;
}

/**
 * NAMEPLATES + HEALTH BARS (game-feel pass) — a fixed pool created up front on
 * the world-FX layer (main camera only, like every pooled FX). Plates attach
 * at the enemy spawn funnels and RELEASE themselves the moment their target
 * dies or its sprite is destroyed, so chunk deactivation can never leak one.
 * Visibility follows FEEL.nameplate.mode: 'always', or 'onAggroOrDamage'
 * (within aggro range of the player, or for showMs after taking damage).
 * Driven from update() — any pause freezes the layer with the scene.
 */
export class NameplatePool {
  private readonly pool: Plate[] = [];

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer) {
    const np = FEEL.nameplate;
    for (let i = 0; i < np.poolSize; i++) {
      const label = scene.add
        .text(0, 0, '', { fontFamily: 'system-ui, sans-serif', fontSize: `${np.fontPx}px`, color: '#e8e8f0' })
        .setOrigin(0.5, 1)
        .setStroke('#101830', 3)
        .setDepth(FEEL.depths.nameplates)
        .setVisible(false);
      const barBg = scene.add.rectangle(0, 0, np.barW, np.barH, 0x101820, 0.85).setOrigin(0.5, 0.5).setDepth(FEEL.depths.nameplates).setVisible(false);
      const bar = scene.add.rectangle(0, 0, np.barW, np.barH, 0x58d068, 1).setOrigin(0, 0.5).setDepth(FEEL.depths.nameplates + 1).setVisible(false);
      layer.add(label);
      layer.add(barBg);
      layer.add(bar);
      this.pool.push({ label, barBg, bar, used: false, target: null, lastDamageAt: 0 });
    }
  }

  get size(): number {
    return this.pool.length;
  }

  get activeCount(): number {
    return this.pool.reduce((n, p) => n + (p.used ? 1 : 0), 0);
  }

  /** Live plates for the runtime gate (name + visibility + leak detection:
   *  a STALE plate still references a dead or destroyed target — the sweep
   *  must never leave one behind a frame). */
  livePlates(): { name: string; level: number; visible: boolean; stale: boolean }[] {
    return this.pool
      .filter((p) => p.used && p.target)
      .map((p) => ({ name: p.target!.name, level: p.target!.level, visible: p.label.visible, stale: !p.target!.isAlive() || !p.target!.sprite.active }));
  }

  /** Attach a plate to a spawned enemy. Pool exhausted = quietly unplated
   *  (a hard ceiling, exactly like the floating-text cap). */
  attach(target: PlateTarget): void {
    const p = this.pool.find((pl) => !pl.used);
    if (!p) return;
    p.used = true;
    p.target = target;
    p.lastDamageAt = 0;
    p.label.setText(`${target.name}  Lv ${target.level}`);
  }

  /** The Health hook pings us so 'onAggroOrDamage' plates light up on hits. */
  notifyDamaged(sprite: { x: number; y: number }, now: number): void {
    for (const p of this.pool) {
      if (p.used && p.target && (p.target.sprite as unknown) === (sprite as unknown)) p.lastDamageAt = now;
    }
  }

  /** Per-frame: follow, fill the bar, apply the visibility rule, and release
   *  plates whose targets died or despawned (chunk boundaries leak nothing). */
  update(now: number, playerX: number, playerY: number, zoom = 1): void {
    const np = FEEL.nameplate;
    // CONTINENT ZOOM: plates are unreadable specks — hide everything and do
    // no per-plate work at all (release still happens on the next zoom-in).
    if (zoom < np.minZoom) {
      for (const p of this.pool) {
        if (p.used && p.label.visible) {
          p.label.setVisible(false);
          p.barBg.setVisible(false);
          p.bar.setVisible(false);
        }
      }
      return;
    }
    for (const p of this.pool) {
      if (!p.used || !p.target) continue;
      const t = p.target;
      if (!t.isAlive() || !t.sprite.active) {
        this.release(p);
        continue;
      }
      const show =
        t.sprite.visible &&
        (np.mode === 'always' || now - p.lastDamageAt < np.showMs || Phaser.Math.Distance.Between(playerX, playerY, t.sprite.x, t.sprite.y) <= np.aggroRadiusPx);
      p.label.setVisible(show);
      p.barBg.setVisible(show);
      p.bar.setVisible(show);
      if (!show) continue;
      const x = t.sprite.x;
      const y = t.sprite.y + np.offsetY;
      p.label.setPosition(x, y);
      p.barBg.setPosition(x, y + 4);
      const ratio = Math.max(0, Math.min(1, t.ratio()));
      p.bar.setPosition(x - np.barW / 2, y + 4).setSize(Math.max(1, np.barW * ratio), np.barH);
    }
  }

  private release(p: Plate): void {
    p.used = false;
    p.target = null;
    p.label.setVisible(false);
    p.barBg.setVisible(false);
    p.bar.setVisible(false);
  }

  /** Release everything (world swaps — plates re-attach with fresh spawns). */
  releaseAll(): void {
    for (const p of this.pool) if (p.used) this.release(p);
  }
}

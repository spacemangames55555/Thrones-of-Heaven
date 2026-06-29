import Phaser from 'phaser';
import { PICKUP_TYPES } from './pickupData';

const TEXTURE_KEY = 'pickup-mote';
let NEXT_ID = 1;

export interface PickupSpawn {
  x: number;
  y: number;
  /** Pickup type key (see PICKUP_TYPES), e.g. 'holy-power'. */
  type: string;
  /** How much this pickup is worth on collection (e.g. +1 to a count). */
  amount: number;
  /** Optional overrides. */
  color?: number;
  collectRadius?: number;
}

/** A discrete collection event (handled by the scene to apply the effect). */
export interface PickupCollected {
  id: string;
  type: string;
  amount: number;
  x: number;
  y: number;
  color: number;
}

/** One world pickup: a glowing mote lying in the world until walked over. */
class Pickup {
  readonly id = `pickup-${NEXT_ID++}`;
  readonly sprite: Phaser.GameObjects.Image;
  readonly type: string;
  readonly amount: number;
  readonly color: number;
  readonly collectRadius: number;
  collected = false;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer, spawn: PickupSpawn) {
    const def = PICKUP_TYPES[spawn.type];
    this.type = spawn.type;
    this.amount = spawn.amount;
    this.color = spawn.color ?? def?.color ?? 0xffe06a;
    this.collectRadius = spawn.collectRadius ?? def?.collectRadius ?? 36;

    this.sprite = scene.add
      .image(spawn.x, spawn.y, TEXTURE_KEY)
      .setTint(this.color)
      .setDepth(11);
    layer.add(this.sprite); // world-FX layer → main camera only, UI camera ignores it

    // Gentle bob + pulse so it reads as a collectible lying in the world.
    scene.tweens.add({
      targets: this.sprite,
      y: spawn.y - 5,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
    scene.tweens.add({
      targets: this.sprite,
      scale: { from: 0.85, to: 1.15 },
      alpha: { from: 0.8, to: 1 },
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
  }

  destroy(): void {
    this.sprite.destroy();
  }
}

/**
 * A reusable world-pickup / collectible system: drop → lies in the world → walk
 * to collect → emits a discrete {@link PickupCollected} event the scene applies.
 * Generic by `type` so future pickups reuse it; Holy Power is the only type now.
 * Pickups have stable ids and are destroyed on collection or {@link clear} (no
 * leaks). Motes draw into the world-FX layer so the UI camera ignores them.
 */
export class PickupSystem {
  private readonly scene: Phaser.Scene;
  private readonly layer: Phaser.GameObjects.Layer;
  private items: Pickup[] = [];

  /** Fired the moment the player collects a pickup. */
  onCollect?: (e: PickupCollected) => void;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer) {
    this.scene = scene;
    this.layer = layer;
    PickupSystem.ensureTexture(scene);
  }

  /** Number of uncollected pickups currently in the world. */
  get count(): number {
    return this.items.length;
  }

  spawn(spawn: PickupSpawn): string {
    const p = new Pickup(this.scene, this.layer, spawn);
    this.items.push(p);
    return p.id;
  }

  /** Collect any pickup the player is standing on; emit + remove it. */
  update(playerX: number, playerY: number): void {
    if (this.items.length === 0) return;
    const remaining: Pickup[] = [];
    for (const p of this.items) {
      const d = Phaser.Math.Distance.Between(p.sprite.x, p.sprite.y, playerX, playerY);
      if (!p.collected && d <= p.collectRadius) {
        p.collected = true;
        this.onCollect?.({ id: p.id, type: p.type, amount: p.amount, x: p.sprite.x, y: p.sprite.y, color: p.color });
        p.destroy();
      } else {
        remaining.push(p);
      }
    }
    this.items = remaining;
  }

  /** Remove every uncollected pickup (dev reset). */
  clear(): void {
    for (const p of this.items) p.destroy();
    this.items = [];
  }

  /** Remove uncollected pickups of one type (e.g. leftover salt when an arc objective ends). */
  clearByType(type: string): void {
    const remaining: Pickup[] = [];
    for (const p of this.items) {
      if (p.type === type) p.destroy();
      else remaining.push(p);
    }
    this.items = remaining;
  }

  private static ensureTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists(TEXTURE_KEY)) return;
    const s = 18;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    // A holy mote: soft halo, bright core, a tiny 4-point sparkle — drawn white
    // so the per-pickup tint colors it.
    g.fillStyle(0xffffff, 0.25);
    g.fillCircle(s / 2, s / 2, 9);
    g.fillStyle(0xffffff, 0.6);
    g.fillCircle(s / 2, s / 2, 5.5);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(s / 2, s / 2, 3);
    g.fillStyle(0xffffff, 0.9); // sparkle spikes
    g.fillTriangle(s / 2, 0, s / 2 - 1.5, s / 2, s / 2 + 1.5, s / 2);
    g.fillTriangle(s / 2, s, s / 2 - 1.5, s / 2, s / 2 + 1.5, s / 2);
    g.generateTexture(TEXTURE_KEY, s, s);
    g.destroy();
  }
}

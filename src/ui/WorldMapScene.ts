import Phaser from 'phaser';

export const WORLDMAP_TEXTURE_KEY = 'worldmap';

/**
 * PURE marker projection (Pass 6A): lat/lng → worldmap image px. The map is a
 * plain equirectangular render of the full playable frame (85°N…85°S,
 * 180°W…180°E), so the closed form is exact — the marker-projection gate
 * recomputes this independently.
 */
export function latLngToMapPx(lat: number, lng: number, imgW: number, imgH: number): { x: number; y: number } {
  return { x: ((lng + 180) / 360) * imgW, y: ((85 - lat) / 170) * imgH };
}

export interface WorldMapHost {
  playerLatLng(): { lat: number; lng: number };
  waystones(): { id: string; label: string; lat: number; lng: number; attuned: boolean }[];
  homeCities(): { label: string; lat: number; lng: number }[];
  /** The tracked quest beat's live target, with the km readout precomputed. */
  questTarget(): { lat: number; lng: number; label: string; km: string } | null;
  /** The EXISTING waypoint travel flow — same rules, same cast, same cancels. */
  startTravel(id: string): boolean;
  onClosed(): void;
}

const MAX_SCALE = 12;
const TAP_SLOP_PX = 12;

/**
 * WORLD MAP MODE (Pass 6A): fullscreen pan/pinch over the baked worldmap.png.
 * Opens centered on the player at the gameplay zoom cap; NEVER touches the
 * gameplay camera (MainScene is paused underneath and resumes untouched).
 * Marker taps route into the EXISTING waypoint travel flow only.
 */
export class WorldMapScene extends Phaser.Scene {
  private host!: WorldMapHost;
  private view!: Phaser.GameObjects.Container;
  private imgW = 0;
  private imgH = 0;
  private viewScale = 1;
  private minScale = 0.5;
  private markers: Phaser.GameObjects.GameObject[] = [];
  private toast?: Phaser.GameObjects.Text;
  private toastUntil = 0;
  // Gate-observable: the waystone marker registry (id → attuned + map px).
  waystoneMarkers: { id: string; label: string; attuned: boolean; mx: number; my: number }[] = [];
  // Pan/pinch state.
  private downAt: { x: number; y: number; vx: number; vy: number; moved: boolean } | null = null;
  private pinchStart: { dist: number; scale: number } | null = null;

  constructor() {
    super('WorldMapScene');
  }

  init(data: { host: WorldMapHost }): void {
    this.host = data.host;
  }

  create(): void {
    const sw = this.scale.width;
    const sh = this.scale.height;
    this.add.rectangle(sw / 2, sh / 2, sw, sh, 0x0a141f, 1).setDepth(0);
    const tex = this.textures.get(WORLDMAP_TEXTURE_KEY).getSourceImage() as { width: number; height: number };
    this.imgW = tex.width;
    this.imgH = tex.height;
    this.minScale = Math.min(sw / this.imgW, sh / this.imgH) * 0.95; // whole Earth fits with a hair of margin
    this.view = this.add.container(0, 0).setDepth(1);
    this.view.add(this.add.image(0, 0, WORLDMAP_TEXTURE_KEY).setOrigin(0, 0));
    this.buildMarkers();
    // Open CENTERED ON THE PLAYER at a readable regional scale — at least 2×
    // the COVER scale, so the map overfills the screen in both axes and the
    // edge clamps cannot override the player centering (only within half a
    // screen of the poles would they bite, and nobody lives there).
    const p = this.host.playerLatLng();
    const pm = latLngToMapPx(p.lat, p.lng, this.imgW, this.imgH);
    this.viewScale = Math.min(MAX_SCALE, Math.max(this.minScale * 3, Math.max(sw / this.imgW, sh / this.imgH) * 2));
    this.applyView(pm.x, pm.y);

    // ── input: drag pan, pinch zoom (2 pointers), wheel, ESC/X close ────────
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (ptr: Phaser.Input.Pointer) => {
      const p2 = this.input.pointer2;
      if (p2 && p2.isDown && ptr.id !== p2.id) return; // second finger → pinch handles it
      this.downAt = { x: ptr.x, y: ptr.y, vx: this.view.x, vy: this.view.y, moved: false };
    });
    this.input.on(Phaser.Input.Events.POINTER_MOVE, (ptr: Phaser.Input.Pointer) => {
      const p1 = this.input.pointer1;
      const p2 = this.input.pointer2;
      if (p1.isDown && p2.isDown) {
        // PINCH: scale about the midpoint; pinching in past the whole-Earth
        // fit closes the map (the zoom handoff in reverse).
        const dist = Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y);
        if (!this.pinchStart) this.pinchStart = { dist, scale: this.viewScale };
        const next = Phaser.Math.Clamp((this.pinchStart.scale * dist) / this.pinchStart.dist, this.minScale * 0.85, MAX_SCALE);
        const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
        this.zoomAbout(next, mid.x, mid.y);
        if (next <= this.minScale * 0.88) this.close();
        return;
      }
      if (this.downAt && ptr.isDown) {
        const dx = ptr.x - this.downAt.x;
        const dy = ptr.y - this.downAt.y;
        if (Math.hypot(dx, dy) > TAP_SLOP_PX) this.downAt.moved = true;
        this.view.setPosition(this.downAt.vx + dx, this.downAt.vy + dy);
        this.clampView();
      }
    });
    this.input.on(Phaser.Input.Events.POINTER_UP, () => {
      this.downAt = null;
      this.pinchStart = null;
    });
    this.input.on(
      Phaser.Input.Events.POINTER_WHEEL,
      (ptr: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
        const next = Phaser.Math.Clamp(this.viewScale * (dy < 0 ? 1.18 : 1 / 1.18), this.minScale, MAX_SCALE);
        this.zoomAbout(next, ptr.x, ptr.y);
      },
    );
    this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC).on('down', () => this.close());
    // X close button (top-right).
    const bx = sw - 30;
    this.add.rectangle(bx, 30, 40, 40, 0x14223a, 0.96).setStrokeStyle(3, 0xffd24a, 1).setDepth(3).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.close());
    this.add.text(bx, 30, '✕', { fontFamily: 'system-ui, sans-serif', fontSize: '20px', color: '#ffe9a8' }).setOrigin(0.5).setDepth(4);
    this.add
      .text(sw / 2, 16, 'WORLD MAP', { fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: '#ffe9a8' })
      .setOrigin(0.5, 0)
      .setDepth(3)
      .setAlpha(0.9);
    this.toast = this.add
      .text(sw / 2, sh - 46, '', { fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: '#ffe9a8', backgroundColor: '#14223aee', padding: { x: 10, y: 6 } })
      .setOrigin(0.5)
      .setDepth(5)
      .setVisible(false);
  }

  override update(): void {
    if (this.toast?.visible && this.time.now > this.toastUntil) this.toast.setVisible(false);
  }

  /** Gate probe: the map-image px currently at the screen center. */
  viewCenterImagePx(): { x: number; y: number } {
    return {
      x: (this.scale.width / 2 - this.view.x) / this.viewScale,
      y: (this.scale.height / 2 - this.view.y) / this.viewScale,
    };
  }

  /** The ONE waystone-tap path — the real pointer handler and the gate both
   *  land here. Attuned → the existing travel flow (then close); unattuned →
   *  name + refusal, no travel of any kind. */
  tapWaystone(id: string): boolean {
    const m = this.waystoneMarkers.find((w) => w.id === id);
    if (!m) return false;
    if (!m.attuned) {
      this.showToast(`${m.label} — not attuned.`);
      return false;
    }
    const ok = this.host.startTravel(id);
    if (ok) this.close();
    return ok;
  }

  close(): void {
    this.host.onClosed();
    this.scene.stop();
  }

  // ── internals ──────────────────────────────────────────────────────────────

  private showToast(text: string): void {
    this.toast?.setText(text).setVisible(true);
    this.toastUntil = this.time.now + 1800;
  }

  private buildMarkers(): void {
    this.waystoneMarkers = [];
    const mk = (x: number, y: number, obj: Phaser.GameObjects.GameObject & { setPosition(x: number, y: number): unknown }): void => {
      obj.setPosition(x, y);
      this.view.add(obj);
      this.markers.push(obj);
    };
    // Home cities (14): small warm squares under everything else.
    for (const c of this.host.homeCities()) {
      const p = latLngToMapPx(c.lat, c.lng, this.imgW, this.imgH);
      mk(p.x, p.y, this.add.rectangle(0, 0, 7, 7, 0xe8c06a, 0.95).setStrokeStyle(1, 0x4a3a14, 1));
    }
    // Waystones: attuned bright, unattuned dim; both tappable.
    for (const w of this.host.waystones()) {
      const p = latLngToMapPx(w.lat, w.lng, this.imgW, this.imgH);
      this.waystoneMarkers.push({ id: w.id, label: w.label, attuned: w.attuned, mx: p.x, my: p.y });
      const dia = this.add
        .rectangle(0, 0, 10, 10, w.attuned ? 0x6ae8e0 : 0x5a6a72, w.attuned ? 1 : 0.8)
        .setStrokeStyle(2, w.attuned ? 0x0a4a46 : 0x2a3238, 1)
        .setAngle(45)
        .setInteractive({ useHandCursor: true });
      dia.on('pointerdown', () => {
        if (!this.downAt?.moved) this.tapWaystone(w.id);
      });
      mk(p.x, p.y, dia);
    }
    // Tracked quest target with the km readout.
    const q = this.host.questTarget();
    if (q) {
      const p = latLngToMapPx(q.lat, q.lng, this.imgW, this.imgH);
      mk(p.x, p.y, this.add.star(0, 0, 5, 4, 9, 0xffd24a, 1).setStrokeStyle(1, 0x4a3a14, 1));
      const label = this.add
        .text(0, 0, `${q.label} — ${q.km}`, { fontFamily: 'system-ui, sans-serif', fontSize: '11px', color: '#ffe9a8', backgroundColor: '#14223acc', padding: { x: 4, y: 2 } })
        .setOrigin(0.5, 1.6);
      mk(p.x, p.y, label);
    }
    // Player: gold dot + ring on top.
    const pl = this.host.playerLatLng();
    const pp = latLngToMapPx(pl.lat, pl.lng, this.imgW, this.imgH);
    mk(pp.x, pp.y, this.add.circle(0, 0, 5, 0xffd24a, 1).setStrokeStyle(2, 0x4a3a14, 1));
    mk(pp.x, pp.y, this.add.circle(0, 0, 10, 0xffd24a, 0).setStrokeStyle(2, 0xffd24a, 0.7));
  }

  /** Apply the current scale + center the given image px on screen. */
  private applyView(cx: number, cy: number): void {
    this.view.setScale(this.viewScale);
    this.view.setPosition(this.scale.width / 2 - cx * this.viewScale, this.scale.height / 2 - cy * this.viewScale);
    this.clampView();
    this.rescaleMarkers();
  }

  private zoomAbout(next: number, sx: number, sy: number): void {
    const ix = (sx - this.view.x) / this.viewScale;
    const iy = (sy - this.view.y) / this.viewScale;
    this.viewScale = next;
    this.view.setScale(next);
    this.view.setPosition(sx - ix * next, sy - iy * next);
    this.clampView();
    this.rescaleMarkers();
  }

  /** Markers keep constant SCREEN size across map zoom. */
  private rescaleMarkers(): void {
    const inv = 1 / this.viewScale;
    for (const m of this.markers) (m as Phaser.GameObjects.Container).setScale(inv);
  }

  private clampView(): void {
    const sw = this.scale.width;
    const sh = this.scale.height;
    const w = this.imgW * this.viewScale;
    const h = this.imgH * this.viewScale;
    // Keep the map covering the screen where it can; center it when smaller.
    if (w <= sw) this.view.x = (sw - w) / 2;
    else this.view.x = Phaser.Math.Clamp(this.view.x, sw - w, 0);
    if (h <= sh) this.view.y = (sh - h) / 2;
    else this.view.y = Phaser.Math.Clamp(this.view.y, sh - h, 0);
  }
}

import Phaser from 'phaser';

const FLOAT_ABOVE = 40; // px above the target the beacon hovers

/**
 * A world-space "go here" beacon for the current quest objective: a pulsing
 * glow + a gold diamond, with an optional label beneath it. It is added to the
 * scene's world-FX layer, so the MAIN camera draws it (scaling/scrolling with
 * the world) and the UI camera — which ignores that layer — does not.
 */
export class ObjectiveMarker {
  private readonly glow: Phaser.GameObjects.Arc;
  private readonly diamond: Phaser.GameObjects.Rectangle;
  private readonly label: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer) {
    this.glow = scene.add.circle(0, 0, 13, 0xffe066, 0.22).setDepth(13);
    this.diamond = scene.add
      .rectangle(0, 0, 15, 15, 0xffe066, 0.95)
      .setStrokeStyle(2, 0x5a4410, 1)
      .setAngle(45)
      .setDepth(14);
    this.label = scene.add
      .text(0, 0, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '11px',
        color: '#ffe9a8',
        align: 'center',
      })
      .setOrigin(0.5, 1)
      .setStroke('#1a1410', 4)
      .setDepth(14);

    layer.add(this.glow);
    layer.add(this.diamond);
    layer.add(this.label);

    // A soft, continuous pulse so it reads as a live waypoint.
    scene.tweens.add({
      targets: this.glow,
      scale: 1.9,
      alpha: 0.04,
      duration: 950,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });

    this.setVisible(false);
  }

  /** Show the beacon hovering over a world point, with an optional label. */
  show(x: number, y: number, label: string): void {
    const my = y - FLOAT_ABOVE;
    this.glow.setPosition(x, my);
    this.diamond.setPosition(x, my);
    if (label) {
      this.label.setText(label).setPosition(x, my - 14).setVisible(true);
    } else {
      this.label.setVisible(false);
    }
    this.setVisible(true);
  }

  hide(): void {
    this.setVisible(false);
  }

  private setVisible(v: boolean): void {
    this.glow.setVisible(v);
    this.diamond.setVisible(v);
    if (!v) this.label.setVisible(false);
  }
}

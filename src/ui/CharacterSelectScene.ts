import Phaser from 'phaser';
import type { ClassId } from '../skills/skillData';
import { homeStartLabelForClass } from '../world/class-canon';

interface ClassOption {
  id: ClassId;
  name: string;
  blurb: string;
  fill: number;
  stroke: number;
  comingSoon?: boolean;
}

/** The selectable classes (all four are now playable). */
const CLASS_OPTIONS: ClassOption[] = [
  { id: 'blacksmith', name: 'Blacksmith', blurb: 'Tanky bruiser. High HP, melee + shield skills across three Crystal trees.', fill: 0x5a3a12, stroke: 0xffd24a },
  { id: 'wizard', name: 'Wizard', blurb: 'Fragile glass-cannon caster. Low HP, fast, devastating Fire/Wind spells.', fill: 0x21347a, stroke: 0x6aa6ff },
  { id: 'necromancer', name: 'Necromancer', blurb: 'Slavic death-sorcerer. In-between durability; bone strikes, taunts, a root, and the Marrownaut bone-suit across the Marrow tree.', fill: 0x2a2433, stroke: 0x9a6cff },
  { id: 'druid', name: 'Druid', blurb: 'A walking ecosystem of fury and life. No two Druids will ever look alike.', fill: 0x24361c, stroke: 0x8ac86a },
];

/**
 * CHARACTER SELECT (mobile, its own scene → own camera, fixed + unzoomed). Shown after
 * "New Game" on the Title screen. Picking a playable class launches MainScene with that
 * class; under the no-kit model the run then opens on the forced first-skill pick. All
 * three classes (Blacksmith, Wizard, Necromancer) are selectable. The save slot was
 * already cleared by the Title screen's overwrite confirm before we got here.
 */
export class CharacterSelectScene extends Phaser.Scene {
  constructor() {
    super('CharacterSelectScene');
  }

  create(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const cx = w / 2;

    this.cameras.main.setBackgroundColor('#0a0610');
    this.add.circle(cx, h * 0.18, Math.min(w, h) * 0.4, 0x2a1840, 0.5).setDepth(0);

    this.add
      .text(cx, h * 0.1, 'CHOOSE YOUR CLASS', { fontFamily: 'Georgia, serif', fontSize: '24px', color: '#ffe9a8', fontStyle: 'bold', align: 'center', wordWrap: { width: w - 40 } })
      .setOrigin(0.5, 0)
      .setDepth(2);

    const cardW = Math.min(384, w - 28);
    const cardH = 116; // room for the "Starts in:" home-city line under the blurb
    const gap = 16;
    const totalH = CLASS_OPTIONS.length * cardH + (CLASS_OPTIONS.length - 1) * gap;
    let y = Math.max(h * 0.22, h / 2 - totalH / 2);
    for (const opt of CLASS_OPTIONS) {
      this.makeCard(cx, y, cardW, cardH, opt);
      y += cardH + gap;
    }

    this.scale.on(Phaser.Scale.Events.RESIZE, () => this.scene.restart());
  }

  private makeCard(cx: number, y: number, w: number, h: number, opt: ClassOption): void {
    const enabled = !opt.comingSoon;
    const bg = this.add
      .rectangle(cx, y, w, h, enabled ? opt.fill : 0x1a1620, enabled ? 0.96 : 0.7)
      .setOrigin(0.5, 0)
      .setStrokeStyle(3, enabled ? opt.stroke : 0x44414f, 1)
      .setDepth(2);
    this.add.text(cx - w / 2 + 16, y + 12, opt.name, { fontFamily: 'system-ui, sans-serif', fontSize: '20px', color: enabled ? '#ffffff' : '#6a6577', fontStyle: 'bold' }).setOrigin(0, 0).setDepth(3);
    if (opt.comingSoon) {
      this.add.text(cx + w / 2 - 16, y + 16, 'COMING SOON', { fontFamily: 'system-ui, sans-serif', fontSize: '12px', color: '#9a86b8', fontStyle: 'bold' }).setOrigin(1, 0).setDepth(3);
    }
    this.add
      .text(cx - w / 2 + 16, y + 44, opt.blurb, { fontFamily: 'system-ui, sans-serif', fontSize: '13px', color: enabled ? '#d6e2f2' : '#6a6577', wordWrap: { width: w - 32 } })
      .setOrigin(0, 0)
      .setDepth(3);
    // CLASS HOME STARTS: where a new character of this class spawns (data-driven
    // from the manifest's homeClass zones; Earth homes = the WA start).
    this.add
      .text(cx - w / 2 + 16, y + h - 20, `Starts in: ${homeStartLabelForClass(opt.id)}`, { fontFamily: 'system-ui, sans-serif', fontSize: '11px', color: enabled ? '#ffe9a8' : '#6a6577', fontStyle: 'bold' })
      .setOrigin(0, 0)
      .setDepth(3);

    if (enabled) {
      bg.setInteractive({ useHandCursor: true });
      bg.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => this.scene.start('MainScene', { mode: 'new', classId: opt.id }));
    }
  }
}

import Phaser from 'phaser';
import { bindOverlayRelayout } from './uiLayout';
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
  { id: 'mage', name: 'Mage', blurb: 'The surgeon of reality. Where others cast spells, the Mage rewrites the laws.', fill: 0x2a1a4a, stroke: 0xc09aff },
  { id: 'bard', name: 'Bard', blurb: 'Memory-keeper and war-drum. Where the Bard plays, the battlefield dances.', fill: 0x3a2430, stroke: 0xffb8d0 },
  { id: 'witchdoctor', name: 'Witch Doctor', blurb: 'The drum speaks and the spirits answer. Somewhere far away, his enemy feels every blow.', fill: 0x24342c, stroke: 0x8fe8d0 },
  { id: 'samurai', name: 'Samurai', blurb: 'One breath. One cut.', fill: 0x3a2020, stroke: 0xffd8b0 },
  { id: 'monk', name: 'Monk', blurb: 'Empty hands. Full spirit.', fill: 0x1c3430, stroke: 0xa8ffd0 },
  { id: 'assassin', name: 'Assassin', blurb: 'Hidden blades. Empty shadows.', fill: 0x26222e, stroke: 0x9a9ab8 },
  { id: 'priest', name: 'Priest', blurb: "Heaven lied. The Light didn't.", fill: 0x3a3220, stroke: 0xffe9a8 },
  { id: 'savage', name: 'Savage', blurb: 'Blood for the sun. Fury for the rest.', fill: 0x3a1c14, stroke: 0xff8a5a },
  { id: 'hunter', name: 'Hunter', blurb: "The pack is a choice. The hunt isn't.", fill: 0x1c2a14, stroke: 0xa0c86a },
  // 'atlantean' is the save-safe classId; 'Sundian' is the canon display name.
  { id: 'atlantean', name: 'Sundian', blurb: 'The sea remembers what heaven drowned.', fill: 0x0c2030, stroke: 0x35e0c8 },
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

    // ORIENTATION-AWARE GRID: every card must sit fully on screen in BOTH
    // orientations. Portrait = the classic single column (adaptive height, never
    // below 96); landscape flows into as many columns as the height demands.
    const gap = 12;
    const topY = h * 0.18;
    const availH = h - topY - 16;
    const rowsFit = Math.max(1, Math.floor((availH + gap) / (96 + gap)));
    const cols = Math.ceil(CLASS_OPTIONS.length / rowsFit);
    const rows = Math.ceil(CLASS_OPTIONS.length / cols);
    const cardW = Math.min(384, (w - 28 - (cols - 1) * gap) / cols);
    const cardH = Math.max(96, Math.min(116, Math.floor((availH - (rows - 1) * gap) / rows)));
    const totalW = cols * cardW + (cols - 1) * gap;
    const totalH = rows * cardH + (rows - 1) * gap;
    const y0 = Math.max(topY, h / 2 - totalH / 2);
    CLASS_OPTIONS.forEach((opt, i) => {
      const col = Math.floor(i / rows);
      const row = i % rows;
      const colCx = cx - totalW / 2 + cardW / 2 + col * (cardW + gap);
      this.makeCard(colCx, y0 + row * (cardH + gap), cardW, cardH, opt);
    });

    bindOverlayRelayout(this, () => this.scene.restart()); // active-only + auto-teardown + jitter-filtered
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
    // TRUNCATE-TO-FIT: with eight classes the grid can go narrow (two columns in
    // portrait) — long blurbs are trimmed word by word (…) so they never spill
    // over the card's "Starts in" line.
    const blurb = this.add
      .text(cx - w / 2 + 16, y + 44, opt.blurb, { fontFamily: 'system-ui, sans-serif', fontSize: w < 280 ? '11px' : '13px', color: enabled ? '#d6e2f2' : '#6a6577', wordWrap: { width: w - 32 } })
      .setOrigin(0, 0)
      .setDepth(3);
    const words = opt.blurb.split(' ');
    while (blurb.height > h - 70 && words.length > 1) {
      words.pop();
      blurb.setText(`${words.join(' ')}…`);
    }
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

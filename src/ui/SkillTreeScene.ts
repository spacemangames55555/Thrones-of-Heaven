import Phaser from 'phaser';
import { classSkills, type SkillDef } from '../skills/skillData';
import type { SkillState } from '../skills/SkillState';

/** The bits of MainScene the skill UI needs (kept narrow + decoupled). */
export interface SkillHost {
  getSkillState(): SkillState;
  /** Spend a point to unlock the skill (applies its effect); returns success. */
  tryUnlockSkill(id: string): boolean;
}

/**
 * THE SKILL TREE screen (mobile, its own scene → its own camera, fixed + unzoomed).
 * Launched over MainScene (which is paused, like the pause menu), so game state is
 * untouched. Shows the active class's THREE trees as tabs; each tree lists its
 * skill nodes (name / cost / locked-unlocked-available state). Tap a node to
 * select it → the detail box + an "Unlock" button confirm the spend.
 */
export class SkillTreeScene extends Phaser.Scene {
  private activeTree = 0;
  private selectedId: string | null = null;
  private dynamic?: Phaser.GameObjects.Container; // redrawn on tab change / unlock

  constructor() {
    super('SkillTreeScene');
  }

  private host(): SkillHost {
    return this.scene.get('MainScene') as unknown as SkillHost;
  }
  private skills(): SkillState {
    return this.host().getSkillState();
  }

  create(): void {
    const w = this.scale.width;
    const h = this.scale.height;

    // Dim + eat taps so nothing leaks to the (paused) game underneath.
    this.add.rectangle(w / 2, h / 2, w, h, 0x05060a, 0.82).setInteractive();

    const cx = w / 2;
    this.add
      .text(cx, this.topInset() + 14, 'SKILLS', {
        fontFamily: 'Georgia, serif',
        fontSize: '24px',
        color: '#ffe9a8',
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0);

    // Close (top-right).
    this.makeButton(w - 44, this.topInset() + 24, 64, 36, '✕', 0x4a1d1d, 0xff7a5a, () => this.close());

    this.activeTree = 0;
    this.selectedId = null;
    this.redraw();

    this.input.keyboard?.on('keydown-ESC', () => this.close());
    this.scale.on(Phaser.Scale.Events.RESIZE, () => this.scene.restart());
  }

  private topInset(): number {
    // Keep clear of the notch; mirror the rest of the UI's top margin.
    return 18;
  }

  /** Full redraw of the tabs + node list + detail (cheap; few nodes). */
  private redraw(): void {
    this.dynamic?.destroy();
    const c = this.add.container(0, 0);
    this.dynamic = c;

    const w = this.scale.width;
    const cx = w / 2;
    const cls = classSkills(this.skills().activeClass);
    const trees = cls.trees;

    // Points readout.
    c.add(
      this.add
        .text(cx, this.topInset() + 48, `Skill Points: ${this.skills().unspentPoints}`, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '16px',
          color: '#9fd0ff',
          fontStyle: 'bold',
        })
        .setOrigin(0.5, 0),
    );

    // Tabs (one per tree).
    const tabY = this.topInset() + 86;
    const tabW = Math.min(132, (w - 24) / Math.max(1, trees.length));
    const startX = cx - (tabW * trees.length) / 2 + tabW / 2;
    trees.forEach((t, i) => {
      const x = startX + i * tabW;
      const active = i === this.activeTree;
      const bg = this.add
        .rectangle(x, tabY, tabW - 6, 38, active ? 0x2a3550 : 0x161c28, 0.98)
        .setStrokeStyle(2, active ? 0xffd24a : 0x44506a, 1)
        .setInteractive({ useHandCursor: true });
      const label = this.add
        .text(x, tabY, t.name, { fontFamily: 'system-ui, sans-serif', fontSize: '13px', color: active ? '#ffe9a8' : '#aebbd0', fontStyle: 'bold' })
        .setOrigin(0.5);
      bg.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
        this.activeTree = i;
        this.selectedId = null;
        this.redraw();
      });
      c.add([bg, label]);
    });

    // Node list for the active tree (ordered by tier).
    const treeId = trees[this.activeTree]?.id;
    const nodes = cls.skills.filter((s) => s.tree === treeId).sort((a, b) => a.tier - b.tier);
    let y = tabY + 38;
    if (nodes.length === 0) {
      c.add(
        this.add
          .text(cx, y + 30, '(no skills yet — coming soon)', { fontFamily: 'system-ui, sans-serif', fontSize: '13px', color: '#7a8aa0' })
          .setOrigin(0.5, 0),
      );
    }
    for (const def of nodes) {
      y += 14;
      c.add(this.makeNode(cx, y, def));
      y += 46;
    }

    // Detail + unlock for the selected node.
    this.drawDetail(c);
  }

  /** One skill node row: color-coded by state, tappable to select. */
  private makeNode(cx: number, y: number, def: SkillDef): Phaser.GameObjects.GameObject[] {
    const w = this.scale.width;
    const nodeW = Math.min(360, w - 28);
    const st = this.skills();
    const unlocked = st.isUnlocked(def.id);
    const can = st.canUnlock(def);
    const selected = this.selectedId === def.id;

    // State → colors: unlocked = gold, available = blue, locked = grey.
    const fill = unlocked ? 0x3a2f12 : can.ok ? 0x13294a : 0x1a1d24;
    const stroke = selected ? 0xffffff : unlocked ? 0xffd24a : can.ok ? 0x49a6ff : 0x3a4150;
    const bg = this.add
      .rectangle(cx, y, nodeW, 42, fill, 0.98)
      .setOrigin(0.5, 0)
      .setStrokeStyle(selected ? 3 : 2, stroke, 1)
      .setInteractive({ useHandCursor: true });

    const name = this.add
      .text(cx - nodeW / 2 + 12, y + 8, def.name, { fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: unlocked ? '#ffe9a8' : '#eaf2ff', fontStyle: 'bold' })
      .setOrigin(0, 0);
    const tag = unlocked ? '✓ owned' : `${def.cost} pt`;
    const tagColor = unlocked ? '#a8ffb0' : can.ok ? '#9fd0ff' : '#7a8aa0';
    const cost = this.add
      .text(cx + nodeW / 2 - 12, y + 8, tag, { fontFamily: 'system-ui, sans-serif', fontSize: '13px', color: tagColor, fontStyle: 'bold' })
      .setOrigin(1, 0);
    const sub = this.add
      .text(cx - nodeW / 2 + 12, y + 25, this.kindLabel(def), { fontFamily: 'system-ui, sans-serif', fontSize: '11px', color: '#90a0b8' })
      .setOrigin(0, 0);

    bg.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      this.selectedId = def.id;
      this.redraw();
    });
    return [bg, name, cost, sub];
  }

  private kindLabel(def: SkillDef): string {
    const k = def.effect.kind;
    const map: Record<string, string> = {
      passive: 'Passive',
      active: 'Active ability',
      buff: 'Buff',
      debuff: 'Debuff',
      transformation: 'Transformation',
    };
    return def.prereq ? `${map[k]} · needs previous` : map[k];
  }

  /** The bottom detail box for the selected node + the Unlock button. */
  private drawDetail(c: Phaser.GameObjects.Container): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const cx = w / 2;
    const boxW = Math.min(380, w - 20);
    const boxH = 132;
    const boxY = h - this.bottomInset() - boxH - 12;

    c.add(this.add.rectangle(cx, boxY, boxW, boxH, 0x0c1322, 0.98).setOrigin(0.5, 0).setStrokeStyle(2, 0xffd24a, 0.8));

    const def = this.selectedId ? classSkills(this.skills().activeClass).skills.find((s) => s.id === this.selectedId) : undefined;
    if (!def) {
      c.add(
        this.add
          .text(cx, boxY + boxH / 2, 'Tap a skill to see details', { fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: '#7a8aa0' })
          .setOrigin(0.5),
      );
      return;
    }

    c.add(
      this.add.text(cx, boxY + 10, def.name, { fontFamily: 'system-ui, sans-serif', fontSize: '15px', color: '#ffe9a8', fontStyle: 'bold' }).setOrigin(0.5, 0),
    );
    c.add(
      this.add
        .text(cx, boxY + 34, def.description, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '12px',
          color: '#cdd9ec',
          align: 'center',
          wordWrap: { width: boxW - 28 },
        })
        .setOrigin(0.5, 0),
    );

    const st = this.skills();
    const unlocked = st.isUnlocked(def.id);
    const can = st.canUnlock(def);
    const btnY = boxY + boxH - 26;
    if (unlocked) {
      c.add(this.add.text(cx, btnY, '✓ Unlocked', { fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: '#a8ffb0', fontStyle: 'bold' }).setOrigin(0.5));
    } else if (can.ok) {
      c.add(this.makeButton(cx, btnY, 200, 40, `Unlock  (${def.cost} pt)`, 0x13506b, 0x49d6ff, () => this.doUnlock(def.id)));
    } else {
      c.add(this.add.text(cx, btnY, can.reason, { fontFamily: 'system-ui, sans-serif', fontSize: '13px', color: '#ff9a8a', fontStyle: 'bold' }).setOrigin(0.5));
    }
  }

  private doUnlock(id: string): void {
    if (this.host().tryUnlockSkill(id)) this.redraw();
  }

  private bottomInset(): number {
    return 16;
  }

  private close(): void {
    this.scene.resume('MainScene');
    this.scene.stop();
  }

  /** A small labeled button; returns its objects so callers can add them to a container. */
  private makeButton(x: number, y: number, w: number, h: number, label: string, fill: number, stroke: number, onTap: () => void): Phaser.GameObjects.GameObject {
    const bg = this.add.rectangle(x, y, w, h, fill, 0.96).setStrokeStyle(2, stroke, 1).setInteractive({ useHandCursor: true });
    const t = this.add.text(x, y, label, { fontFamily: 'system-ui, sans-serif', fontSize: '15px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    bg.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, onTap);
    // Group as a tiny container so it can live inside `dynamic`.
    return this.add.container(0, 0, [bg, t]);
  }
}

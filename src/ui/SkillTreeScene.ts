import Phaser from 'phaser';
import { classSkills, isEquippableSkill, LOADOUT_SLOTS, type SkillDef } from '../skills/skillData';
import type { SkillState } from '../skills/SkillState';

/** HOLD-TO-READ threshold (Casey's spec: press-and-hold a name bar this long to
 *  read the skill's description; releasing dismisses it and NEVER spends). */
export const HOLD_MS = 2000;

/** The bits of MainScene the skill UI needs (kept narrow + decoupled). */
export interface SkillHost {
  getSkillState(): SkillState;
  /** Spend a point to unlock the skill (applies its effect); returns success. */
  tryUnlockSkill(id: string): boolean;
  /** Equip an unlocked equippable skill into a loadout slot. */
  equipSkill(slot: number, id: string): boolean;
  /** Clear a loadout slot. */
  unequipSlot(slot: number): void;
  /** PLAYER RESPEC: refund points + clear all unlocks for the current character (frees branch). */
  resetSkillTrees(): void;
}

/**
 * THE SKILL TREE screen (mobile, its own scene → own camera, fixed + unzoomed).
 * Launched over MainScene (paused). Tabs select a tree; the tree's nodes list down
 * the full height. INTERACTION MODEL (Casey's skill-tree UX spec):
 *   • INSTANT SPEND — tapping an affordable, unlockable node immediately spends the
 *     point (no confirmation window). Tapping a locked/unaffordable node spends
 *     nothing: the bar shakes and a toast says why.
 *   • ADD TO HOTKEYS — castable skills with ≥1 point show an "Add" button on their
 *     name bar; it opens a small hotkey picker of the current slot assignments, and
 *     tapping a slot assigns the skill there (replacing any occupant) and closes.
 *   • HOLD TO READ — press-and-hold any name bar (locked skills included) for
 *     HOLD_MS to pop up the description; releasing dismisses it. A completed hold
 *     NEVER spends — only a release before the threshold counts as a tap.
 * The forced first-skill pick (FirstSkillScene) is a separate flow and unchanged.
 */
export class SkillTreeScene extends Phaser.Scene {
  private activeTree = 0;
  private dynamic?: Phaser.GameObjects.Container; // node list (redrawn on change)
  private tabsC?: Phaser.GameObjects.Container; // tab row (redrawn so the active tab updates)
  private popup?: Phaser.GameObjects.Container; // modal layer (hotkey picker / reset confirm)
  private readPopup?: Phaser.GameObjects.Container; // the hold-to-read description popup
  private holdTimer?: Phaser.Time.TimerEvent; // pending hold on the pressed node
  private holdFired = false; // the current press completed its hold (so release must not tap)
  /** Last instant-spend rejection reason (observability for the runtime gate). */
  lastReject = '';

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
    const cx = w / 2;

    // Full-screen dim that also eats taps so nothing leaks to the paused game.
    this.add.rectangle(w / 2, h / 2, w, h, 0x05060a, 0.9).setInteractive();

    // Header band (depth 20) covers the top of the node list; the title/points/tabs/
    // close sit on top of it. Drawn BEFORE the list so the list (depth 5) is behind.
    const headerH = this.listTop();
    this.add.rectangle(cx, headerH / 2, w, headerH, 0x05060a, 1).setDepth(20);
    this.add
      .text(cx, this.topInset() + 12, 'SKILLS', { fontFamily: 'Georgia, serif', fontSize: '24px', color: '#ffe9a8', fontStyle: 'bold' })
      .setOrigin(0.5, 0)
      .setDepth(21);
    this.pointsText = this.add
      .text(cx, this.topInset() + 44, '', { fontFamily: 'system-ui, sans-serif', fontSize: '16px', color: '#9fd0ff', fontStyle: 'bold' })
      .setOrigin(0.5, 0)
      .setDepth(21);
    this.makeButton(w - 42, this.topInset() + 22, 60, 34, '✕', 0x4a1d1d, 0xff7a5a, () => this.close()).setDepth(21);
    // PLAYER-FACING RESPEC: reset all of this character's trees (refund + clear unlocks).
    this.makeButton(54, this.topInset() + 22, 92, 34, '⟲ Reset', 0x3a2a12, 0xffb86a, () => this.confirmReset()).setDepth(21);

    this.activeTree = 0;
    this.redraw(); // draws the tabs (depth 22) + the node list (depth 5)
    this.refreshPoints();

    this.input.keyboard?.on('keydown-ESC', () => (this.popup ? this.closePopup() : this.readPopup ? this.closeReadPopup() : this.close()));
    this.scale.on(Phaser.Scale.Events.RESIZE, () => this.scene.restart());
  }

  private pointsText!: Phaser.GameObjects.Text;

  private topInset(): number {
    return 18;
  }
  /** Y where the node list begins (below title + points + tabs). */
  private listTop(): number {
    return this.topInset() + 116;
  }

  private refreshPoints(): void {
    this.pointsText.setText(`Skill Points: ${this.skills().unspentPoints}`);
  }

  private drawTabs(): void {
    this.tabsC?.destroy();
    const tc = this.add.container(0, 0).setDepth(22);
    this.tabsC = tc;
    const w = this.scale.width;
    const cx = w / 2;
    const trees = classSkills(this.skills().activeClass).trees;
    const tabY = this.topInset() + 80;
    const tabW = Math.min(120, (w - 16) / Math.max(1, trees.length));
    const startX = cx - (tabW * trees.length) / 2 + tabW / 2;
    trees.forEach((t, i) => {
      const x = startX + i * tabW;
      const active = i === this.activeTree;
      const bg = this.add
        .rectangle(x, tabY, tabW - 5, 34, active ? 0x2a3550 : 0x161c28, 1)
        .setStrokeStyle(2, active ? 0xffd24a : 0x44506a, 1)
        .setInteractive({ useHandCursor: true });
      const label = this.add.text(x, tabY, t.name, { fontFamily: 'system-ui, sans-serif', fontSize: '13px', color: active ? '#ffe9a8' : '#aebbd0', fontStyle: 'bold' }).setOrigin(0.5);
      bg.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
        if (this.activeTree === i) return;
        this.activeTree = i;
        this.redraw();
      });
      tc.add([bg, label]);
    });
  }

  /** Draw the active tree's tabs (active highlight updates) + node list. */
  private redraw(): void {
    this.drawTabs();
    this.dynamic?.destroy();
    const c = this.add.container(0, 0).setDepth(5);
    this.dynamic = c;

    const w = this.scale.width;
    const cx = w / 2;
    const cls = classSkills(this.skills().activeClass);
    const treeId = cls.trees[this.activeTree]?.id;
    const nodes = cls.skills.filter((s) => s.tree === treeId).sort((a, b) => a.tier - b.tier);

    let y = this.listTop() + 8;
    if (nodes.length === 0) {
      c.add(this.add.text(cx, y + 20, '(no skills yet — coming soon)', { fontFamily: 'system-ui, sans-serif', fontSize: '13px', color: '#7a8aa0' }).setOrigin(0.5, 0));
    }
    const stride = 50;
    const drawnBranch = new Set<string>();
    for (const def of nodes) {
      // EITHER/OR BRANCH: render all options of a group as ONE split node (skip the rest).
      if (def.branch) {
        if (drawnBranch.has(def.branch.group)) continue;
        drawnBranch.add(def.branch.group);
        const options = nodes.filter((s) => s.branch?.group === def.branch!.group);
        c.add(this.makeSplitNode(cx, y, options));
        y += stride;
        continue;
      }
      c.add(this.makeNode(cx, y, def));
      y += stride;
    }
  }

  /** PRESS MODEL for every name bar: pointer-down arms the HOLD_MS read timer; a
   *  release BEFORE the threshold is a tap (instant spend path); a completed hold
   *  shows the description and its release only dismisses — it never spends. */
  private attachNodeInput(bg: Phaser.GameObjects.Rectangle, def: SkillDef): void {
    bg.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      this.holdTimer?.remove(false);
      this.holdFired = false;
      this.holdTimer = this.time.delayedCall(HOLD_MS, () => {
        this.holdFired = true;
        this.openReadPopup(def);
      });
      // Release ANYWHERE ends the press (the finger may slide off the bar).
      this.input.once(Phaser.Input.Events.POINTER_UP, () => {
        this.holdTimer?.remove(false);
        this.holdTimer = undefined;
        if (this.holdFired) {
          this.closeReadPopup(); // a completed hold NEVER spends
          return;
        }
        this.tapNode(def, bg);
      });
    });
  }

  /** INSTANT SPEND: an affordable, unlockable node unlocks on the spot; a locked or
   *  unaffordable one spends nothing and shakes with a toast saying why. Owned nodes
   *  ignore taps (the Add button handles hotkeys; hold-to-read handles reading). */
  private tapNode(def: SkillDef, bg: Phaser.GameObjects.Rectangle): void {
    const st = this.skills();
    if (st.isUnlocked(def.id)) return;
    const can = st.canUnlock(def);
    if (!can.ok) {
      this.rejectFeedback(bg, can.reason ?? 'Locked');
      return;
    }
    if (this.host().tryUnlockSkill(def.id)) {
      this.refreshPoints();
      this.redraw();
    }
  }

  /** Shake the bar + float a brief toast with the rejection reason (no point spent). */
  private rejectFeedback(bg: Phaser.GameObjects.Rectangle, reason: string): void {
    this.lastReject = reason;
    const x0 = bg.x;
    this.tweens.add({ targets: bg, x: x0 + 6, duration: 40, yoyo: true, repeat: 3, onComplete: () => (bg.x = x0) });
    const toast = this.add
      .text(bg.x, bg.y - 6, reason, { fontFamily: 'system-ui, sans-serif', fontSize: '13px', color: '#ff9a8a', fontStyle: 'bold', backgroundColor: '#1a0e12', padding: { x: 8, y: 4 } })
      .setOrigin(0.5, 1)
      .setDepth(60);
    this.tweens.add({ targets: toast, y: toast.y - 16, alpha: 0, duration: 900, ease: 'Cubic.easeOut', onComplete: () => toast.destroy() });
  }

  /** A node split into N halves (the either/or branch): each half is one mutually-exclusive
   *  option showing its name + state (chosen ★ / locked-out / available). Tap = instant
   *  spend; hold = read; a chosen castable option's tag becomes its "Add" button. */
  private makeSplitNode(cx: number, y: number, options: SkillDef[]): Phaser.GameObjects.GameObject[] {
    const w = this.scale.width;
    const nodeW = Math.min(380, w - 24);
    const st = this.skills();
    const out: Phaser.GameObjects.GameObject[] = [];
    const gap = 6;
    const halfW = (nodeW - gap * (options.length - 1)) / options.length;
    const x0 = cx - nodeW / 2;
    // A faint "CHOOSE ONE" caption above the split row.
    out.push(this.add.text(cx, y - 1, 'CHOOSE ONE', { fontFamily: 'system-ui, sans-serif', fontSize: '9px', color: '#ffb86a', fontStyle: 'bold' }).setOrigin(0.5, 0));
    options.forEach((def, i) => {
      const chosen = st.isUnlocked(def.id);
      const lockedOut = !chosen && !!st.ownedBranchOption(def.branch!.group); // sibling owned
      const can = st.canUnlock(def);
      const hx = x0 + i * (halfW + gap) + halfW / 2;
      const fill = chosen ? 0x33300f : lockedOut ? 0x241317 : can.ok ? 0x13294a : 0x1a1d24;
      const stroke = chosen ? 0xffd24a : lockedOut ? 0x7a3a3a : can.ok ? 0x49a6ff : 0x3a4150;
      const bg = this.add
        .rectangle(hx, y + 10, halfW, 42, fill, 0.98)
        .setOrigin(0.5, 0)
        .setStrokeStyle(chosen ? 3 : 2, stroke, 1)
        .setInteractive({ useHandCursor: true });
      const title = `${chosen ? '★ ' : ''}${def.name.split(' ')[0]}`;
      out.push(this.add.text(hx, y + 16, title, { fontFamily: 'system-ui, sans-serif', fontSize: '13px', color: chosen ? '#ffe9a8' : lockedOut ? '#9a6a6a' : '#eaf2ff', fontStyle: 'bold', align: 'center', wordWrap: { width: halfW - 8 } }).setOrigin(0.5, 0));
      if (chosen && isEquippableSkill(def)) {
        // The chosen castable option's tag doubles as its Add-to-hotkeys button.
        const slot = st.slotIndexOf(def.id);
        const addTag = this.add
          .text(hx, y + 34, slot >= 0 ? `★ slot ${slot + 1} · Add` : '+ Add', { fontFamily: 'system-ui, sans-serif', fontSize: '10px', color: '#66e0ff', fontStyle: 'bold' })
          .setOrigin(0.5, 0)
          .setInteractive({ useHandCursor: true });
        addTag.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => this.openHotkeyPicker(def.id));
        out.push(addTag);
      } else {
        const tag = chosen ? 'chosen' : lockedOut ? 'locked out' : `${def.cost} pt`;
        out.push(this.add.text(hx, y + 34, tag, { fontFamily: 'system-ui, sans-serif', fontSize: '10px', color: chosen ? '#a8ffb0' : lockedOut ? '#a86a6a' : can.ok ? '#9fd0ff' : '#7a8aa0', fontStyle: 'bold' }).setOrigin(0.5, 0));
      }
      this.attachNodeInput(bg, def);
      out.push(bg);
    });
    return out;
  }

  /** One node row: color-coded by state. Tap = instant spend; hold = read; castable
   *  owned skills carry an "Add" (to hotkeys) button on the right of the name bar. */
  private makeNode(cx: number, y: number, def: SkillDef): Phaser.GameObjects.GameObject[] {
    const w = this.scale.width;
    const nodeW = Math.min(380, w - 24);
    const st = this.skills();
    const unlocked = st.isUnlocked(def.id);
    const can = st.canUnlock(def);
    const equipped = isEquippableSkill(def) && st.isEquipped(def.id);

    const fill = unlocked ? 0x33300f : can.ok ? 0x13294a : 0x1a1d24;
    const stroke = equipped ? 0x66e0ff : unlocked ? 0xffd24a : can.ok ? 0x49a6ff : 0x3a4150;
    const bg = this.add
      .rectangle(cx, y, nodeW, 44, fill, 0.98)
      .setOrigin(0.5, 0)
      .setStrokeStyle(equipped ? 3 : 2, stroke, 1)
      .setInteractive({ useHandCursor: true });

    const name = this.add.text(cx - nodeW / 2 + 12, y + 7, def.name, { fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: unlocked ? '#ffe9a8' : '#eaf2ff', fontStyle: 'bold' }).setOrigin(0, 0);
    const sub = this.add.text(cx - nodeW / 2 + 12, y + 25, this.kindLabel(def), { fontFamily: 'system-ui, sans-serif', fontSize: '11px', color: '#90a0b8' }).setOrigin(0, 0);
    const out: Phaser.GameObjects.GameObject[] = [bg, name, sub];

    if (unlocked && isEquippableSkill(def)) {
      // ADD TO HOTKEYS: the name-bar button (right side); slot tag sits beside it.
      const slot = st.slotIndexOf(def.id);
      const addBg = this.add
        .rectangle(cx + nodeW / 2 - 38, y + 22, 60, 30, 0x13506b, 0.98)
        .setStrokeStyle(2, 0x49d6ff, 1)
        .setInteractive({ useHandCursor: true });
      const addLbl = this.add.text(cx + nodeW / 2 - 38, y + 22, '+ Add', { fontFamily: 'system-ui, sans-serif', fontSize: '12px', color: '#cffaff', fontStyle: 'bold' }).setOrigin(0.5);
      addBg.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => this.openHotkeyPicker(def.id));
      out.push(addBg, addLbl);
      if (slot >= 0) {
        out.push(this.add.text(cx + nodeW / 2 - 74, y + 22, `★ ${slot + 1}`, { fontFamily: 'system-ui, sans-serif', fontSize: '12px', color: '#66e0ff', fontStyle: 'bold' }).setOrigin(1, 0.5));
      }
    } else {
      const tag = !unlocked ? `${def.cost} pt` : '✓ owned';
      const tagColor = !unlocked ? (can.ok ? '#9fd0ff' : '#7a8aa0') : '#a8ffb0';
      out.push(this.add.text(cx + nodeW / 2 - 12, y + 7, tag, { fontFamily: 'system-ui, sans-serif', fontSize: '12px', color: tagColor, fontStyle: 'bold' }).setOrigin(1, 0));
    }

    this.attachNodeInput(bg, def);
    return out;
  }

  private kindLabel(def: SkillDef): string {
    const map: Record<string, string> = { passive: 'Passive', active: 'Active', buff: 'Buff', debuff: 'Debuff', transformation: 'Transformation', channel: 'Channel', stacking_dot: 'Stacking DoT' };
    let s = map[def.effect.kind] ?? def.effect.kind;
    // Only flag an unmet gate (don't nag once it's owned).
    if (def.prereq && !this.skills().isUnlocked(def.prereq)) s += ' · needs previous';
    else if (def.prereqGroup && !this.skills().ownedBranchOption(def.prereqGroup)) s += ' · needs a branch choice';
    return s;
  }

  /** Confirm the destructive player-facing reset, then run it + close (so the forced first-
   *  skill picker can re-open if the reset emptied the player's offense). */
  private confirmReset(): void {
    this.closePopup();
    const w = this.scale.width;
    const h = this.scale.height;
    const cx = w / 2;
    const cy = h / 2;
    const c = this.add.container(0, 0).setDepth(120);
    this.popup = c;
    c.add(this.add.rectangle(cx, cy, w, h, 0x05060a, 0.78).setInteractive().on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => this.closePopup()));
    const panelW = Math.min(340, w - 28);
    c.add(this.add.rectangle(cx, cy, panelW, 200, 0x1a1220, 0.99).setStrokeStyle(2, 0xffb86a, 0.9));
    c.add(this.add.text(cx, cy - 80, 'Reset Skill Trees?', { fontFamily: 'system-ui, sans-serif', fontSize: '18px', color: '#ffd24a', fontStyle: 'bold' }).setOrigin(0.5));
    c.add(this.add.text(cx, cy - 44, 'Refunds ALL skill points and clears every unlocked skill for this character (all trees). Frees your branch choice. You re-spend from scratch.', { fontFamily: 'system-ui, sans-serif', fontSize: '12px', color: '#cdd9ec', align: 'center', wordWrap: { width: panelW - 28 } }).setOrigin(0.5, 0));
    c.add(this.makeButton(cx - 78, cy + 64, 132, 40, 'Reset', 0x5a1d1d, 0xff7a5a, () => this.doReset()));
    c.add(this.makeButton(cx + 78, cy + 64, 132, 40, 'Cancel', 0x33373d, 0x8a93a6, () => this.closePopup()));
  }

  private doReset(): void {
    this.host().resetSkillTrees();
    this.close(); // resume MainScene; if the reset emptied offense, it re-opens the first-skill picker
  }

  // --- HOLD TO READ: the description popup shown while the press is held ---------

  private openReadPopup(def: SkillDef): void {
    this.closeReadPopup();
    const w = this.scale.width;
    const h = this.scale.height;
    const cx = w / 2;
    const cy = h / 2;
    const c = this.add.container(0, 0).setDepth(110);
    this.readPopup = c;
    const panelW = Math.min(360, w - 28);
    // NON-interactive (no backdrop): the popup lives only while the finger is down,
    // and the release that dismisses it must reach the scene's pointer-up.
    c.add(this.add.rectangle(cx, cy, panelW, 220, 0x111826, 0.99).setStrokeStyle(2, 0xffd24a, 0.9));
    c.add(this.add.text(cx, cy - 96, def.name, { fontFamily: 'system-ui, sans-serif', fontSize: '17px', color: '#ffe9a8', fontStyle: 'bold', align: 'center', wordWrap: { width: panelW - 28 } }).setOrigin(0.5, 0));
    c.add(this.add.text(cx, cy - 62, this.kindLabel(def), { fontFamily: 'system-ui, sans-serif', fontSize: '12px', color: '#9fd0ff', fontStyle: 'bold' }).setOrigin(0.5, 0));
    c.add(this.add.text(cx, cy - 40, def.description, { fontFamily: 'system-ui, sans-serif', fontSize: '12px', color: '#cdd9ec', align: 'center', wordWrap: { width: panelW - 32 } }).setOrigin(0.5, 0));
    c.add(this.add.text(cx, cy + 92, 'release to close', { fontFamily: 'system-ui, sans-serif', fontSize: '11px', color: '#7a8aa0' }).setOrigin(0.5, 1));
  }

  private closeReadPopup(): void {
    this.readPopup?.destroy();
    this.readPopup = undefined;
  }

  // --- ADD TO HOTKEYS: the small slot picker -------------------------------------

  /** Screen center of hotkey-picker slot `i` — the single source of truth for the
   *  picker's grid layout (the runtime gate taps these exact points). */
  pickerSlotCenter(i: number): { x: number; y: number } {
    const w = this.scale.width;
    const cx = w / 2;
    const cy = this.scale.height / 2;
    const panelW = Math.min(340, w - 28);
    const cols = 3;
    const bw = (panelW - 28) / cols;
    const bh = 44;
    const gx = 6;
    const gy = 6;
    const gridX = cx - ((bw + gx) * cols - gx) / 2 + bw / 2;
    const gridY = cy - 10;
    return { x: gridX + (i % cols) * (bw + gx), y: gridY + Math.floor(i / cols) * (bh + gy) };
  }

  /** The small hotkey picker: shows every slot's current assignment; tapping a slot
   *  assigns the skill there (replacing any occupant) and closes. Tapping the slot
   *  it already holds clears it instead (parity with the old equip grid). */
  private openHotkeyPicker(id: string): void {
    this.closePopup();
    const def = classSkills(this.skills().activeClass).skills.find((s) => s.id === id);
    if (!def || !this.skills().isUnlocked(id) || !isEquippableSkill(def)) return;
    const w = this.scale.width;
    const h = this.scale.height;
    const cx = w / 2;
    const cy = h / 2;
    const st = this.skills();
    const c = this.add.container(0, 0).setDepth(100);
    this.popup = c;
    c.add(this.add.rectangle(cx, cy, w, h, 0x05060a, 0.72).setInteractive().on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => this.closePopup()));
    const panelW = Math.min(340, w - 28);
    c.add(this.add.rectangle(cx, cy, panelW, 210, 0x111826, 0.99).setStrokeStyle(2, 0x49d6ff, 0.9));
    c.add(this.add.text(cx, cy - 92, `Add "${this.shortLabel(id)}" to a hotkey`, { fontFamily: 'system-ui, sans-serif', fontSize: '15px', color: '#cffaff', fontStyle: 'bold', align: 'center', wordWrap: { width: panelW - 24 } }).setOrigin(0.5, 0));
    c.add(this.add.text(cx, cy - 56, 'Tap a slot (replaces what it holds):', { fontFamily: 'system-ui, sans-serif', fontSize: '12px', color: '#9fd0ff' }).setOrigin(0.5, 0));
    const loadout = st.loadout();
    const bw = (panelW - 28) / 3;
    for (let i = 0; i < LOADOUT_SLOTS; i++) {
      const { x: bx, y: by } = this.pickerSlotCenter(i);
      const occupant = loadout[i];
      const mine = occupant === def.id;
      const occLabel = occupant ? this.shortLabel(occupant) : 'Empty';
      const fill = mine ? 0x2a3f16 : occupant ? 0x202632 : 0x13294a;
      const stroke = mine ? 0x66e0ff : occupant ? 0x55617a : 0x49a6ff;
      const bg = this.add.rectangle(bx, by, bw - 4, 44, fill, 0.98).setStrokeStyle(2, stroke, 1).setInteractive({ useHandCursor: true });
      const lbl = this.add.text(bx, by, `${mine ? '★ ' : ''}${i + 1}: ${occLabel}`, { fontFamily: 'system-ui, sans-serif', fontSize: '11px', color: mine ? '#cffaff' : '#dbe6f5', fontStyle: 'bold', align: 'center', wordWrap: { width: bw - 8 } }).setOrigin(0.5);
      bg.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
        if (mine) this.host().unequipSlot(i);
        else this.host().equipSkill(i, def.id);
        this.closePopup(); // assign + close (Casey's spec)
        this.redraw(); // node tags update
      });
      c.add([bg, lbl]);
    }
    c.add(this.makeButton(cx, cy + 82, 120, 32, 'Cancel', 0x33373d, 0x8a93a6, () => this.closePopup()));
  }

  private closePopup(): void {
    this.popup?.destroy();
    this.popup = undefined;
  }

  /** Short caption for an equipped skill id (first two words). */
  private shortLabel(id: string): string {
    const def = classSkills(this.skills().activeClass).skills.find((s) => s.id === id);
    if (!def) return id;
    return def.name.split(' ').slice(0, 2).join(' ');
  }

  private close(): void {
    this.scene.resume('MainScene');
    this.scene.stop();
  }

  /** A small labeled button; returns its container so callers can nest/position it. */
  private makeButton(x: number, y: number, w: number, h: number, label: string, fill: number, stroke: number, onTap: () => void): Phaser.GameObjects.Container {
    const bg = this.add.rectangle(0, 0, w, h, fill, 0.96).setInteractive({ useHandCursor: true }).setStrokeStyle(2, stroke, 1);
    const t = this.add.text(0, 0, label, { fontFamily: 'system-ui, sans-serif', fontSize: '15px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    bg.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, onTap);
    return this.add.container(x, y, [bg, t]);
  }
}

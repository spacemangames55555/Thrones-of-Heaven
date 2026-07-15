import Phaser from 'phaser';
import { bindOverlayRelayout } from './uiLayout';
import { classSkills, isStarterSkill, type ClassId, type SkillDef } from '../skills/skillData';
import type { SkillState } from '../skills/SkillState';

/** The bits of MainScene the forced first-skill picker needs (kept narrow + decoupled). */
export interface FirstSkillHost {
  /** The LIVE character's class — the picker's ONLY class source. */
  readonly classId: ClassId;
  getSkillState(): SkillState;
  /** Unlock the chosen first skill + auto-equip it to slot 1, then unfreeze the game. */
  completeFirstSkill(id: string): boolean;
}

/**
 * THE FORCED FIRST-SKILL PICKER (mobile, its own scene → own camera, fixed + unzoomed).
 *
 * Under the no-base-kit model a new character starts with ZERO playable abilities. This
 * modal is launched over a PAUSED MainScene at New Game (and after a skills reset that
 * leaves the player with no offense). It shows each tree's FIRST node — every one a
 * DAMAGING ACTIVE — and REQUIRES the player to pick one to begin: there is no close
 * button and the game underneath stays frozen until a choice is made. Tapping a skill
 * unlocks it (spending the granted first point) and auto-equips it to loadout slot 1,
 * then resumes play.
 */
export class FirstSkillScene extends Phaser.Scene {
  /** The class whose openers are currently shown (runtime-gate observability). */
  shownClass: ClassId | null = null;

  constructor() {
    super('FirstSkillScene');
  }

  private host(): FirstSkillHost {
    return this.scene.get('MainScene') as unknown as FirstSkillHost;
  }

  create(): void {
    // ── THE PICKER'S CONTRACT (regression guard) ────────────────────────────────
    // This modal exists for exactly one situation: a LIVE MainScene character with
    // ZERO unlocked damaging actives (a genuinely fresh character / a full respec).
    // Anything else that manages to (re)start this scene — a stale resize handler,
    // a stray restart — closes itself immediately and never touches game state.
    const mainAlive = this.scene.isActive('MainScene') || this.scene.isPaused('MainScene');
    const host = this.host();
    const st = host.getSkillState();
    // The class comes from the LIVE character (MainScene.classId) — never from the
    // long-lived SkillState.activeClass field, which a zombie restart could read
    // stale (the wizard-picker-on-a-witchdoctor bug). Heal the field while here.
    const liveClass = mainAlive ? host.classId : null;
    if (liveClass && st.activeClass !== liveClass) st.activeClass = liveClass;
    if (!mainAlive || !liveClass || !st.needsFirstSkill(liveClass)) {
      this.shownClass = null;
      if (this.scene.isPaused('MainScene')) this.scene.resume('MainScene');
      this.scene.stop();
      return;
    }
    this.shownClass = liveClass;

    const w = this.scale.width;
    const h = this.scale.height;
    const cx = w / 2;

    // Full-screen dim that also eats taps so nothing leaks to the frozen game beneath.
    this.add.rectangle(cx, h / 2, w, h, 0x05060a, 0.92).setInteractive();

    this.add
      .text(cx, h * 0.12, 'CHOOSE YOUR FIRST SKILL', { fontFamily: 'Georgia, serif', fontSize: '22px', color: '#ffe9a8', fontStyle: 'bold', align: 'center', wordWrap: { width: w - 40 } })
      .setOrigin(0.5, 0);
    this.add
      .text(cx, h * 0.12 + 36, 'Spend your first skill point to begin. This becomes your starting ability — you can unlock more as you level up.', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        color: '#c9d6ea',
        align: 'center',
        wordWrap: { width: w - 56 },
      })
      .setOrigin(0.5, 0);

    const openers = this.treeOpeners();
    const cardW = Math.min(380, w - 28);
    // ORIENTATION-AWARE height: shrink the cards in landscape so all three picks
    // stay fully on screen (portrait keeps the classic 96px cards).
    const gap = 16;
    const top = h * 0.32;
    const cardH = Math.max(72, Math.min(96, Math.floor((h - top - 12 - (openers.length - 1) * gap) / Math.max(1, openers.length))));
    const totalH = openers.length * cardH + (openers.length - 1) * gap;
    let y = Math.max(top, h / 2 - totalH / 2);
    for (const def of openers) {
      this.makeCard(cx, y, cardW, cardH, def);
      y += cardH + gap;
    }

    bindOverlayRelayout(this, () => this.scene.restart()); // active-only + auto-teardown + jitter-filtered
  }

  /** Each tree's entry node (lowest tier) that is a STARTER skill — a damaging active OR an
   *  attacking summon (e.g. the Summons tree opens on Summon Skeleton). The legal first picks. */
  private treeOpeners(): SkillDef[] {
    const cls = classSkills(this.shownClass ?? this.host().classId); // the LIVE class, always
    const out: SkillDef[] = [];
    for (const tree of cls.trees) {
      const first = cls.skills
        .filter((s) => s.tree === tree.id)
        .sort((a, b) => a.tier - b.tier)
        .find((s) => isStarterSkill(s));
      if (first) out.push(first);
    }
    return out;
  }

  /** One tappable skill card: tree name + skill name + description. */
  private makeCard(cx: number, y: number, w: number, h: number, def: SkillDef): void {
    const treeName = classSkills(this.shownClass ?? this.host().classId).trees.find((t) => t.id === def.tree)?.name ?? '';
    const bg = this.add
      .rectangle(cx, y, w, h, 0x14233c, 0.98)
      .setOrigin(0.5, 0)
      .setStrokeStyle(2, 0x49a6ff, 1)
      .setInteractive({ useHandCursor: true });
    this.add.text(cx - w / 2 + 14, y + 10, `${def.name}`, { fontFamily: 'system-ui, sans-serif', fontSize: '16px', color: '#ffe9a8', fontStyle: 'bold' }).setOrigin(0, 0);
    this.add.text(cx + w / 2 - 14, y + 12, treeName, { fontFamily: 'system-ui, sans-serif', fontSize: '12px', color: '#9fd0ff', fontStyle: 'bold' }).setOrigin(1, 0);
    this.add
      .text(cx - w / 2 + 14, y + 36, def.description, { fontFamily: 'system-ui, sans-serif', fontSize: '12px', color: '#cdd9ec', wordWrap: { width: w - 28 } })
      .setOrigin(0, 0);

    const pick = (): void => {
      if (this.host().completeFirstSkill(def.id)) {
        this.scene.resume('MainScene');
        this.scene.stop();
      }
    };
    bg.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, pick);
  }
}

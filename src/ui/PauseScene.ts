import Phaser from 'phaser';
import { bindOverlayRelayout } from './uiLayout';

/** Minimal structural view of MainScene that the pause menu needs. */
interface SaveableScene {
  requestSave(): boolean;
  /** Export the save as a portable code (also tries the clipboard); null = failed. */
  exportSaveCode(): string | null;
  /** Import a save code into the slot (byte-identical); true = written. */
  importSaveCode(code: string): boolean;
}

/**
 * The in-game PAUSE / MENU overlay. Launched on top of MainScene (which is paused,
 * frozen and dimmed underneath — the same launch+pause pattern as the building
 * interiors), so game state is untouched and resuming continues exactly. Offers:
 *   • Resume        — unpause + close.
 *   • Save Game     — manual save via MainScene's existing save system.
 *   • Export Save   — copies a portable save code to the clipboard (falls back to
 *     showing it in a prompt for copying by hand).
 *   • Import Save   — pastes a save code back (clipboard, else a paste prompt),
 *     writes the slot byte-identically, and reloads into it.
 *   • Return to Title — autosaves, then returns to the start screen (New Game /
 *     Continue) so the player can exit and enter a different game (single slot).
 */
export class PauseScene extends Phaser.Scene {
  private toast?: Phaser.GameObjects.Text;

  constructor() {
    super('PauseScene');
  }

  create(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const cx = w / 2;

    // Dim the (visible, paused) game behind the menu; the shade also eats taps so
    // nothing leaks to the world underneath.
    this.add.rectangle(cx, h / 2, w, h, 0x05060a, 0.6).setInteractive();

    // Six buttons at a 54px stride — compact enough that the panel still fits a
    // LANDSCAPE viewport (h=428) with margin.
    const panelW = Math.min(300, w - 48);
    this.add.rectangle(cx, h / 2, panelW, 412, 0x161018, 0.98).setStrokeStyle(2, 0xffd24a, 0.9);
    this.add
      .text(cx, h / 2 - 182, 'Paused', {
        fontFamily: 'Georgia, serif',
        fontSize: '26px',
        color: '#ffe9a8',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const btnW = panelW - 48;
    this.makeButton(cx, h / 2 - 138, btnW, 'Resume', 0x13506b, 0x49d6ff, () => this.resumeGame());
    this.makeButton(cx, h / 2 - 84, btnW, 'Skills', 0x2a1f3a, 0xb98aff, () => this.onSkills());
    this.makeButton(cx, h / 2 - 30, btnW, 'Save Game', 0x1d2b40, 0x9fd0ff, () => this.onSave());
    this.makeButton(cx, h / 2 + 24, btnW, 'Export Save', 0x1d3a2b, 0x7ae0a8, () => this.onExport());
    this.makeButton(cx, h / 2 + 78, btnW, 'Import Save', 0x3a331d, 0xe0c87a, () => void this.onImport());
    this.makeButton(cx, h / 2 + 132, btnW, 'Return to Title', 0x4a1d1d, 0xff7a5a, () => this.onReturnToTitle());

    // A small toast for save feedback (the game's own "Saved" flash is paused).
    this.toast = this.add
      .text(cx, h / 2 + 172, '', { fontFamily: 'system-ui, sans-serif', fontSize: '13px', color: '#a8ffb0', fontStyle: 'bold' })
      .setOrigin(0.5)
      .setVisible(false);

    bindOverlayRelayout(this, () => this.scene.restart()); // active-only + auto-teardown + jitter-filtered
  }

  private main(): SaveableScene {
    return this.scene.get('MainScene') as unknown as SaveableScene;
  }

  private resumeGame(): void {
    this.scene.resume('MainScene');
    this.scene.stop();
  }

  /** Open the skill tree. MainScene stays paused (this menu paused it); the skill
   *  scene resumes MainScene when it closes. The pause menu closes behind it. */
  private onSkills(): void {
    this.scene.stop();
    this.scene.launch('SkillTreeScene');
  }

  private onSave(): void {
    const ok = this.main().requestSave();
    this.showToast(ok ? 'Game saved ✓' : 'Save failed', ok ? '#a8ffb0' : '#ff9a8a');
  }

  /** SAVE PORTABILITY: export the slot as a portable code. exportSaveCode already
   *  tried the clipboard; without one (or to copy by hand) show the code in a prompt. */
  private onExport(): void {
    const code = this.main().exportSaveCode();
    if (!code) {
      this.showToast('Export failed', '#ff9a8a');
      return;
    }
    if (!navigator.clipboard) window.prompt('Copy your save code:', code);
    this.showToast('Save code copied to clipboard \u2713', '#a8ffb0');
  }

  /** SAVE PORTABILITY: import a save code (clipboard first, else a paste prompt),
   *  then reload so the imported save loads through the normal Continue path. */
  private async onImport(): Promise<void> {
    let code = '';
    try {
      code = (await navigator.clipboard?.readText()) ?? '';
    } catch {
      /* clipboard read denied/unavailable → fall through to the prompt */
    }
    if (!code.trim().startsWith('TOH1.')) code = window.prompt('Paste your save code:') ?? '';
    if (!code.trim()) {
      this.showToast('Import cancelled', '#ff9a8a');
      return;
    }
    if (!this.main().importSaveCode(code)) {
      this.showToast('Invalid save code', '#ff9a8a');
      return;
    }
    this.showToast('Save imported \u2014 loading\u2026', '#a8ffb0');
    this.time.delayedCall(650, () => window.location.reload());
  }

  private onReturnToTitle(): void {
    // Auto-save first so no progress is lost. Then return to the start screen via a
    // clean page reload (TitleScene auto-shows on load) — this guarantees a fresh
    // game instance, avoiding any stale state from reusing the stopped MainScene.
    // From the title the player can Continue (loads the save just written) or start
    // a New Game (overwrites, with the existing warning) — the "exit/enter a
    // different game" flow on the single save slot.
    this.main().requestSave();
    this.showToast('Saved — returning to title…', '#a8ffb0');
    this.time.delayedCall(650, () => window.location.reload());
  }

  private showToast(text: string, color: string): void {
    if (!this.toast) return;
    this.toast.setText(text).setColor(color).setVisible(true).setAlpha(1);
    this.tweens.killTweensOf(this.toast);
    this.tweens.add({ targets: this.toast, alpha: 0.55, duration: 500, yoyo: true, repeat: 1 });
  }

  private makeButton(x: number, y: number, w: number, label: string, fill: number, stroke: number, onTap: () => void): void {
    const bg = this.add.rectangle(x, y, w, 46, fill, 0.96).setStrokeStyle(2, stroke, 1).setInteractive({ useHandCursor: true });
    this.add.text(x, y, label, { fontFamily: 'system-ui, sans-serif', fontSize: '18px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    bg.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, onTap);
  }
}

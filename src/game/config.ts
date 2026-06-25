import Phaser from 'phaser';
import { TitleScene } from '../ui/TitleScene';
import { MainScene } from './MainScene';
import { InteriorScene } from '../interior/InteriorScene';
import { PauseScene } from '../ui/PauseScene';
import { SkillTreeScene } from '../ui/SkillTreeScene';
import { FirstSkillScene } from '../ui/FirstSkillScene';
import { CharacterSelectScene } from '../ui/CharacterSelectScene';
import { viewportSize } from '../ui/uiLayout';

const { w, h } = viewportSize();

/**
 * Phaser 4 game configuration. Mobile-first: the canvas is sized to the real
 * visible viewport (see main.ts, which keeps it synced via visualViewport) and
 * pixel-art rendering keeps the tiles crisp.
 *
 * Scale mode is NONE on purpose: we drive the game size explicitly from the
 * visual viewport so the UI coordinate space always matches what's on screen.
 * (RESIZE mode measured the parent element, which on iOS Safari came out wider
 * than the visible area and pushed edge-anchored UI off-screen.)
 */
export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#0b1a2b',
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.NONE,
    autoCenter: Phaser.Scale.NO_CENTER,
    width: w,
    height: h,
  },
  input: {
    activePointers: 3, // multi-touch headroom for future on-screen buttons
  },
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
      gravity: { x: 0, y: 0 },
    },
  },
  // TitleScene starts automatically (the start screen); it launches MainScene with
  // { mode: 'new' | 'continue' }. InteriorScene + PauseScene are launched on demand.
  scene: [TitleScene, CharacterSelectScene, MainScene, InteriorScene, PauseScene, SkillTreeScene, FirstSkillScene],
};

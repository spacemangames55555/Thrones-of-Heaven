import Phaser from 'phaser';
import { MainScene } from './MainScene';

/**
 * Phaser 4 game configuration. Mobile-first: the canvas resizes to fill the
 * screen (portrait or landscape) and pixel-art rendering keeps the tiles crisp.
 */
export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#0b1a2b',
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: '100%',
    height: '100%',
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
  scene: [MainScene],
};

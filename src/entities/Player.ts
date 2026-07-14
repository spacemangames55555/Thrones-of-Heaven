import Phaser from 'phaser';
import { RUN_SPEED } from '../game/settings';

const TEXTURE_KEY = 'player-figure'; // Blacksmith (gold soul/herald) avatar
const WIZARD_TEXTURE_KEY = 'wizard-figure'; // Wizard (Egyptian sorcerer) avatar
const NECRO_TEXTURE_KEY = 'necro-figure'; // Necromancer (Slavic death-sorcerer) avatar
const DRUID_TEXTURE_KEY = 'druid-figure'; // Druid (Seattle wild-warden) avatar
const WIDTH = 32; // ~1 tile wide
const HEIGHT = 48; // ~1.5 tiles tall — fixes the "character = one giant block" look

/** Pick the avatar texture for a class id (defaults to the Blacksmith figure). */
function textureForClass(classId: string): string {
  if (classId === 'wizard') return WIZARD_TEXTURE_KEY;
  if (classId === 'necromancer') return NECRO_TEXTURE_KEY;
  if (classId === 'druid') return DRUID_TEXTURE_KEY;
  return TEXTURE_KEY;
}

/**
 * The player avatar: a simple colored figure (~1 x 1.5 tiles) driven by Arcade
 * Physics. The look is per-class (the gold Blacksmith herald, or the Egyptian
 * sorcerer Wizard) but the body/footprint are identical so movement + collision are
 * class-agnostic. Movement is free and analog (8-directional), never grid-snapped.
 */
export class Player {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  /** Move-speed multiplier (1 = base). Skill passives/buffs + class base speed set this. */
  speedMultiplier = 1;
  /** HOSTILE slow (1 = none). Multiplied on top of speedMultiplier so enemy slows
   *  (dark-caster bolts) compose with — and never clobber — skill/class speed math. */
  slowFactor = 1;

  constructor(scene: Phaser.Scene, x: number, y: number, classId: string = 'blacksmith') {
    Player.ensureTexture(scene);
    Player.ensureWizardTexture(scene);
    Player.ensureNecroTexture(scene);
    Player.ensureDruidTexture(scene);

    this.sprite = scene.physics.add.sprite(x, y, textureForClass(classId));
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setDepth(10);

    // A small footprint at the figure's base (~0.6 tile) so it fits through
    // 1-tile gaps and collides where its "feet" are, not its whole height.
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    const r = 9;
    body.setCircle(r, WIDTH / 2 - r, HEIGHT - r * 2 - 3);
  }

  /**
   * Apply a direction vector. RUN-ONLY + INSTANT: any nonzero input is normalized to
   * unit length, so the player always moves at exactly RUN_SPEED (no analog "walk" from
   * a half-pushed joystick) and turns on a dime — velocity is set directly each frame, so
   * there is no acceleration ramp or momentum/sliding. Class/skill move multipliers still
   * scale RUN_SPEED. Collision is unchanged (the arcade body + colliders still resolve).
   */
  setDirection(dirX: number, dirY: number): void {
    const len = Math.hypot(dirX, dirY);
    let x = 0;
    let y = 0;
    if (len > 0.01) {
      x = dirX / len; // normalize ANY movement to full magnitude → one run speed
      y = dirY / len;
      this.facingX = x;
      this.facingY = y;
    }
    const s = RUN_SPEED * this.speedMultiplier * this.slowFactor;
    this.sprite.setVelocity(x * s, y * s);
  }

  /** Last-moved direction (defaults to facing down), for the melee swing. */
  facingX = 0;
  facingY = 1;

  /** Brief red flash when the player is hit. */
  flash(): void {
    this.sprite.setTint(0xff4444).setTintMode(Phaser.TintModes.FILL);
    this.sprite.scene.time.delayedCall(110, () => this.sprite.clearTint());
  }

  /** Brief gold flash + scale pop when the player levels up. */
  levelUpFlash(): void {
    const s = this.sprite;
    s.setTint(0xffe9a8).setTintMode(Phaser.TintModes.FILL);
    s.scene.time.delayedCall(260, () => s.clearTint());
    s.scene.tweens.add({
      targets: s,
      scale: 1.25,
      duration: 130,
      yoyo: true,
      ease: 'Quad.out',
    });
  }

  /** Re-skin the avatar for a class (used when a save loads a different class). Keeps
   *  any active tint/transform; only swaps the base texture. */
  setClassSkin(classId: string): void {
    this.sprite.setTexture(textureForClass(classId));
  }

  get x(): number {
    return this.sprite.x;
  }

  get y(): number {
    return this.sprite.y;
  }

  private static ensureTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists(TEXTURE_KEY)) return;
    const w = WIDTH;
    const h = HEIGHT;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    // Dark outline, gold body (a vertical "soul/herald" capsule), highlight, head.
    g.fillStyle(0x101418, 1);
    g.fillRoundedRect(4, 8, w - 8, h - 10, 9);
    g.fillStyle(0xffd24a, 1);
    g.fillRoundedRect(6, 10, w - 12, h - 14, 7);
    g.fillStyle(0xfff0b8, 1);
    g.fillCircle(w / 2, 13, 6); // head
    g.fillStyle(0xffffff, 0.85);
    g.fillCircle(w / 2 - 3, 11, 2); // tiny highlight
    g.generateTexture(TEXTURE_KEY, w, h);
    g.destroy();
  }

  /** The Wizard avatar — an Egyptian sorcerer: deep-blue robe, gold trim, a striped
   *  nemes-style headdress, and a small staff. Same footprint as the Blacksmith figure. */
  private static ensureWizardTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists(WIZARD_TEXTURE_KEY)) return;
    const w = WIDTH;
    const h = HEIGHT;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    // Dark outline + deep-blue robe body (a vertical caster capsule).
    g.fillStyle(0x0b0f1c, 1);
    g.fillRoundedRect(4, 8, w - 8, h - 10, 9);
    g.fillStyle(0x21347a, 1); // lapis-blue robe
    g.fillRoundedRect(6, 10, w - 12, h - 14, 7);
    // Gold robe trim down the center (Egyptian collar/hem feel).
    g.fillStyle(0xffd24a, 1);
    g.fillRect(w / 2 - 1.5, 18, 3, h - 24);
    g.fillRoundedRect(8, 18, w - 16, 4, 2); // gold collar
    // Head + striped nemes headdress.
    g.fillStyle(0xe8c79a, 1); // warm skin
    g.fillCircle(w / 2, 13, 6);
    g.fillStyle(0x2a6ec0, 1); // blue headdress drape
    g.fillRoundedRect(w / 2 - 8, 7, 16, 9, 3);
    g.fillStyle(0xffd24a, 1); // gold band
    g.fillRect(w / 2 - 8, 12, 16, 2);
    g.fillStyle(0xe8c79a, 1); // face opening
    g.fillCircle(w / 2, 13, 4);
    g.fillStyle(0x101418, 1); // eyes
    g.fillCircle(w / 2 - 2, 13, 1);
    g.fillCircle(w / 2 + 2, 13, 1);
    // A small staff with a glowing ember tip on the right.
    g.fillStyle(0x6b4a2a, 1);
    g.fillRect(w - 7, 12, 2, h - 20);
    g.fillStyle(0xff7a2a, 1);
    g.fillCircle(w - 6, 11, 3);
    g.generateTexture(WIZARD_TEXTURE_KEY, w, h);
    g.destroy();
  }

  /** The Necromancer avatar — a NW-Russia / Slavic death-sorcerer: charcoal-black
   *  hooded robe with ash-grey trim, a pale skull face in the cowl, and a small
   *  bone wand. Same footprint as the other figures (class-agnostic body). */
  private static ensureNecroTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists(NECRO_TEXTURE_KEY)) return;
    const w = WIDTH;
    const h = HEIGHT;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    // Dark outline + charcoal robe body (a vertical caster capsule).
    g.fillStyle(0x06060a, 1);
    g.fillRoundedRect(4, 8, w - 8, h - 10, 9);
    g.fillStyle(0x24242c, 1); // charcoal-black robe
    g.fillRoundedRect(6, 10, w - 12, h - 14, 7);
    // Ash-grey trim down the center + a bone clasp.
    g.fillStyle(0x8a8f99, 1);
    g.fillRect(w / 2 - 1, 18, 2, h - 24);
    g.fillStyle(0xd9d2c2, 1); // pale bone clasp
    g.fillCircle(w / 2, 20, 2.2);
    // Black hood drape framing a pale skull face.
    g.fillStyle(0x06060a, 1);
    g.fillRoundedRect(w / 2 - 9, 5, 18, 14, 5);
    g.fillStyle(0xe9e4d6, 1); // pale skull
    g.fillCircle(w / 2, 13, 5.5);
    g.fillStyle(0x06060a, 1); // hollow eye sockets
    g.fillCircle(w / 2 - 2.2, 12, 1.5);
    g.fillCircle(w / 2 + 2.2, 12, 1.5);
    g.fillRect(w / 2 - 0.7, 14, 1.4, 2.5); // nasal cavity
    // A small bone wand with a cold violet tip on the right.
    g.fillStyle(0xd9d2c2, 1);
    g.fillRect(w - 7, 12, 2, h - 20);
    g.fillStyle(0x9a6cff, 1);
    g.fillCircle(w - 6, 11, 3);
    g.generateTexture(NECRO_TEXTURE_KEY, w, h);
    g.destroy();
  }

  /** The Druid avatar — Seattle's wild-warden: a moss-green hooded mantle with a bark-brown
   *  under-robe, small antler tines above the hood, and a gnarled staff with a living green
   *  bud. CODE-DRAWN PLACEHOLDER (a real sprite PNG drops in later via the sprite override
   *  under this same key). Same footprint as the other figures (class-agnostic body). */
  private static ensureDruidTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists(DRUID_TEXTURE_KEY)) return;
    const w = WIDTH;
    const h = HEIGHT;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    // Dark outline + bark-brown under-robe body (a vertical warden capsule).
    g.fillStyle(0x0c1008, 1);
    g.fillRoundedRect(4, 8, w - 8, h - 10, 9);
    g.fillStyle(0x5a4428, 1); // bark-brown robe
    g.fillRoundedRect(6, 10, w - 12, h - 14, 7);
    // Moss-green mantle over the shoulders + a leaf clasp.
    g.fillStyle(0x4a7a3a, 1);
    g.fillRoundedRect(6, 16, w - 12, 12, 5);
    g.fillStyle(0x8ac86a, 1); // pale leaf clasp
    g.fillCircle(w / 2, 21, 2.2);
    g.fillStyle(0x4a7a3a, 1); // moss trim down the center
    g.fillRect(w / 2 - 1, 26, 2, h - 32);
    // Green hood framing a weathered face, antler tines above.
    g.fillStyle(0x3a6030, 1);
    g.fillRoundedRect(w / 2 - 9, 5, 18, 14, 5);
    g.fillStyle(0xd8b890, 1); // weathered skin
    g.fillCircle(w / 2, 13, 5);
    g.fillStyle(0x0c1008, 1); // eyes
    g.fillCircle(w / 2 - 2, 12.5, 1.1);
    g.fillCircle(w / 2 + 2, 12.5, 1.1);
    g.fillStyle(0xd9cba8, 1); // small antler tines
    g.fillTriangle(w / 2 - 7, 7, w / 2 - 4, 8, w / 2 - 9, 1);
    g.fillTriangle(w / 2 + 7, 7, w / 2 + 4, 8, w / 2 + 9, 1);
    // A gnarled staff with a living green bud on the right.
    g.fillStyle(0x6b4a2a, 1);
    g.fillRect(w - 7, 12, 2, h - 20);
    g.fillStyle(0x74c86a, 1);
    g.fillCircle(w - 6, 11, 3);
    g.generateTexture(DRUID_TEXTURE_KEY, w, h);
    g.destroy();
  }
}

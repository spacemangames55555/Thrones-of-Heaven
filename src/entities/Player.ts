import Phaser from 'phaser';
import { RUN_SPEED } from '../game/settings';
import { devSpeedMultiplier } from '../world/world-scale';
import { rotationTextureFor } from '../render/spriteOverrides';

const TEXTURE_KEY = 'player-figure'; // Blacksmith (gold soul/herald) avatar
const WIZARD_TEXTURE_KEY = 'wizard-figure'; // Wizard (Egyptian sorcerer) avatar
const NECRO_TEXTURE_KEY = 'necro-figure'; // Necromancer (Slavic death-sorcerer) avatar
const DRUID_TEXTURE_KEY = 'druid-figure'; // Druid (Seattle wild-warden) avatar
const MAGE_TEXTURE_KEY = 'mage-figure'; // Mage (Moscow reality-surgeon) avatar — NOT the Wizard (canon)
const BARD_TEXTURE_KEY = 'bard-figure'; // Bard (London memory-keeper) avatar
const WITCHDOCTOR_TEXTURE_KEY = 'witchdoctor-figure'; // Witch Doctor (Kinshasa spirit-speaker) avatar
const SAMURAI_TEXTURE_KEY = 'samurai-figure'; // Samurai (Kyoto blade) avatar
const MONK_TEXTURE_KEY = 'monk-figure'; // Monk (Lhasa ascetic) avatar
const ASSASSIN_TEXTURE_KEY = 'assassin-figure'; // Assassin (Dubai knife-in-the-dark) avatar
const PRIEST_TEXTURE_KEY = 'priest-figure'; // Priest (Rome keeper of the Light) avatar
const SAVAGE_TEXTURE_KEY = 'savage-figure'; // Savage (Mexico City blood-and-sun bruiser) avatar
const HUNTER_TEXTURE_KEY = 'hunter-figure'; // Hunter (Sydney beast-bonded tracker) avatar
const SUNDIAN_TEXTURE_KEY = 'sundian-figure'; // Sundian (Bali drowned sovereign; classId 'atlantean') avatar
const WIDTH = 32; // ~1 tile wide
const HEIGHT = 48; // ~1.5 tiles tall — fixes the "character = one giant block" look

/** Pick the avatar texture for a class id (defaults to the Blacksmith figure). */
function textureForClass(classId: string): string {
  if (classId === 'wizard') return WIZARD_TEXTURE_KEY;
  if (classId === 'necromancer') return NECRO_TEXTURE_KEY;
  if (classId === 'druid') return DRUID_TEXTURE_KEY;
  if (classId === 'mage') return MAGE_TEXTURE_KEY;
  if (classId === 'bard') return BARD_TEXTURE_KEY;
  if (classId === 'witchdoctor') return WITCHDOCTOR_TEXTURE_KEY;
  if (classId === 'samurai') return SAMURAI_TEXTURE_KEY;
  if (classId === 'monk') return MONK_TEXTURE_KEY;
  if (classId === 'assassin') return ASSASSIN_TEXTURE_KEY;
  if (classId === 'priest') return PRIEST_TEXTURE_KEY;
  if (classId === 'savage') return SAVAGE_TEXTURE_KEY;
  if (classId === 'hunter') return HUNTER_TEXTURE_KEY;
  if (classId === 'atlantean') return SUNDIAN_TEXTURE_KEY;
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
  /** DEV traversal multiplier from ?devspeed=N (cap 8) — WORLD SCALE V2 dev
   *  testing. No param ⇒ EXACTLY 1: base speeds untouched. Fixed for the
   *  session at construction; gate-observable. */
  readonly devSpeed = devSpeedMultiplier();
  /** MOUNTED speed override (px/s). When set, movement runs at EXACTLY this
   *  speed (× devSpeed only) — skill multipliers and slows do not apply; any
   *  combat dismounts before they could matter. null = on foot. */
  mountedSpeedPx: number | null = null;
  /** HOSTILE slow (1 = none). Multiplied on top of speedMultiplier so enemy slows
   *  (dark-caster bolts) compose with — and never clobber — skill/class speed math. */
  slowFactor = 1;

  /** The class figure's BASE texture key — rotation frames derive from it. */
  private baseKey: string;

  constructor(scene: Phaser.Scene, x: number, y: number, classId: string = 'blacksmith') {
    Player.ensureTexture(scene);
    Player.ensureWizardTexture(scene);
    Player.ensureNecroTexture(scene);
    Player.ensureDruidTexture(scene);
    Player.ensureMageTexture(scene);
    Player.ensureBardTexture(scene);
    Player.ensureWitchDoctorTexture(scene);
    Player.ensureSamuraiTexture(scene);
    Player.ensureMonkTexture(scene);
    Player.ensureAssassinTexture(scene);
    Player.ensurePriestTexture(scene);
    Player.ensureSavageTexture(scene);
    Player.ensureHunterTexture(scene);
    Player.ensureSundianTexture(scene);

    this.baseKey = textureForClass(classId);
    this.sprite = scene.physics.add.sprite(x, y, this.baseKey);
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
      this.applyFacingFrame();
    }
    const s = this.mountedSpeedPx !== null ? this.mountedSpeedPx * this.devSpeed : RUN_SPEED * this.speedMultiplier * this.slowFactor * this.devSpeed;
    this.sprite.setVelocity(x * s, y * s);
  }

  /** 8-WAY ART: when real rotation frames shipped for this class figure (the
   *  sprite-override rotations path), turn the avatar with its facing. Classes
   *  without rotation art keep their single texture — nothing changes. */
  private applyFacingFrame(): void {
    const dirKey = rotationTextureFor(this.baseKey, this.facingX, this.facingY);
    if (dirKey && this.sprite.texture.key !== dirKey) this.sprite.setTexture(dirKey);
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
    this.baseKey = textureForClass(classId);
    this.sprite.setTexture(this.baseKey);
    this.applyFacingFrame(); // 8-way art picks the frame for the current facing
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

  /** The Mage avatar — Moscow's reality-surgeon (CANON: distinct from the Wizard): a
   *  deep-violet high-collared coat with a pale lattice trim, a silver circlet, and a
   *  crystal blade at the right hand. CODE-DRAWN PLACEHOLDER (a real sprite PNG drops
   *  in later via the sprite override under this same key). Same footprint. */
  private static ensureMageTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists(MAGE_TEXTURE_KEY)) return;
    const w = WIDTH;
    const h = HEIGHT;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    // Dark outline + deep-violet coat body (a vertical caster capsule).
    g.fillStyle(0x0c0818, 1);
    g.fillRoundedRect(4, 8, w - 8, h - 10, 9);
    g.fillStyle(0x3a2468, 1); // deep-violet coat
    g.fillRoundedRect(6, 10, w - 12, h - 14, 7);
    // Pale crystalline lattice trim: center seam + a high collar band.
    g.fillStyle(0xbfe0ff, 1);
    g.fillRect(w / 2 - 1, 18, 2, h - 24);
    g.fillRoundedRect(8, 17, w - 16, 3, 1.5); // collar band
    g.fillStyle(0x8a5cff, 1); // arcane clasp
    g.fillCircle(w / 2, 22, 2.4);
    // Head + a thin silver circlet.
    g.fillStyle(0xe0d2c2, 1); // fair skin
    g.fillCircle(w / 2, 13, 5.5);
    g.fillStyle(0xd8e8f4, 1); // circlet
    g.fillRect(w / 2 - 5, 9, 10, 1.6);
    g.fillStyle(0x0c0818, 1); // eyes
    g.fillCircle(w / 2 - 2, 13, 1.1);
    g.fillCircle(w / 2 + 2, 13, 1.1);
    // The crystal blade at the right hand: a pale shard with a violet glint.
    g.fillStyle(0xbfe0ff, 1);
    g.fillTriangle(w - 8, 14, w - 3, 14, w - 5.5, h - 12);
    g.fillStyle(0x8a5cff, 0.9);
    g.fillCircle(w - 5.5, 15, 2);
    g.generateTexture(MAGE_TEXTURE_KEY, w, h);
    g.destroy();
  }

  /** The Bard avatar — London's memory-keeper and war-drum: a wine-dark traveling
   *  coat with a rose sash, a feathered cap, and a small lute slung at the right
   *  side. CODE-DRAWN PLACEHOLDER (a real sprite PNG drops in later via the sprite
   *  override under this same key). Same footprint as the other figures. */
  private static ensureBardTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists(BARD_TEXTURE_KEY)) return;
    const w = WIDTH;
    const h = HEIGHT;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    // Dark outline + wine-dark coat body (a vertical minstrel capsule).
    g.fillStyle(0x140a10, 1);
    g.fillRoundedRect(4, 8, w - 8, h - 10, 9);
    g.fillStyle(0x5a2438, 1); // wine coat
    g.fillRoundedRect(6, 10, w - 12, h - 14, 7);
    // Rose sash across the chest + a brass clasp.
    g.fillStyle(0xff9ab8, 1);
    g.fillRect(8, 22, w - 16, 4);
    g.fillStyle(0xe8c05a, 1);
    g.fillCircle(w / 2, 24, 2.2);
    // Head + a feathered cap.
    g.fillStyle(0xe0c8a8, 1); // skin
    g.fillCircle(w / 2, 13, 5.5);
    g.fillStyle(0x3a1a28, 1); // cap
    g.fillRoundedRect(w / 2 - 7, 6, 14, 6, 3);
    g.fillStyle(0x9ad8b0, 1); // the feather
    g.fillTriangle(w / 2 + 5, 8, w / 2 + 8, 9, w / 2 + 13, 1);
    g.fillStyle(0x140a10, 1); // eyes
    g.fillCircle(w / 2 - 2, 13.5, 1.1);
    g.fillCircle(w / 2 + 2, 13.5, 1.1);
    // A small lute at the right hip: warm body + neck.
    g.fillStyle(0xb0763a, 1);
    g.fillCircle(w - 8, h - 18, 5.5);
    g.fillStyle(0x7a4a22, 1);
    g.fillRect(w - 9, h - 34, 2.4, 14);
    g.fillStyle(0x140a10, 1); // sound hole
    g.fillCircle(w - 8, h - 18, 1.8);
    g.generateTexture(BARD_TEXTURE_KEY, w, h);
    g.destroy();
  }

  /** The Witch Doctor avatar — Kinshasa's spirit-speaker: an earth-green wrap
   *  with bone-bead strings, a carved spirit mask with pale eyes, a feathered
   *  headdress, and a small stitched doll at the left hip. CODE-DRAWN PLACEHOLDER
   *  (a real sprite PNG drops in later via the sprite override under this same
   *  key). Same footprint as the other figures. */
  private static ensureWitchDoctorTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists(WITCHDOCTOR_TEXTURE_KEY)) return;
    const w = WIDTH;
    const h = HEIGHT;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    // Dark outline + earth-green wrap (the speaker's robe).
    g.fillStyle(0x0e140e, 1);
    g.fillRoundedRect(4, 8, w - 8, h - 10, 9);
    g.fillStyle(0x2e4a34, 1); // earth-green wrap
    g.fillRoundedRect(6, 10, w - 12, h - 14, 7);
    // Bone-bead strings across the chest.
    g.fillStyle(0xe8e0c8, 1);
    for (let i = 0; i < 5; i++) g.fillCircle(9 + i * ((w - 18) / 4), 24, 1.8);
    g.fillStyle(0xd0c8a8, 1);
    for (let i = 0; i < 4; i++) g.fillCircle(11 + i * ((w - 22) / 3), 29, 1.5);
    // The carved spirit mask: pale wood, dark eye-slits, painted stripes.
    g.fillStyle(0xc9a05a, 1); // mask
    g.fillRoundedRect(w / 2 - 6, 7, 12, 13, 4);
    g.fillStyle(0x0e140e, 1); // eye-slits
    g.fillRect(w / 2 - 4, 12, 3, 2);
    g.fillRect(w / 2 + 1, 12, 3, 2);
    g.fillStyle(0x8fe8d0, 1); // pale spirit eyes inside the slits
    g.fillRect(w / 2 - 3, 12.5, 1.4, 1);
    g.fillRect(w / 2 + 2, 12.5, 1.4, 1);
    g.fillStyle(0xd85a5a, 1); // painted stripe
    g.fillRect(w / 2 - 6, 17, 12, 1.6);
    // Feathered headdress.
    g.fillStyle(0xd85a5a, 1);
    g.fillTriangle(w / 2 - 5, 7, w / 2 - 1, 7, w / 2 - 4, 0);
    g.fillStyle(0x8fe8d0, 1);
    g.fillTriangle(w / 2 - 1, 7, w / 2 + 3, 7, w / 2 + 1, -1);
    g.fillStyle(0xe8c05a, 1);
    g.fillTriangle(w / 2 + 3, 7, w / 2 + 7, 7, w / 2 + 6, 1);
    // The stitched doll at the left hip: burlap body + thread cross.
    g.fillStyle(0xc9a05a, 1);
    g.fillRoundedRect(4, h - 26, 8, 12, 3);
    g.fillCircle(8, h - 27, 3.2);
    g.fillStyle(0x5a2438, 1); // the thread cross over its heart
    g.fillRect(6.6, h - 23, 3, 1);
    g.fillRect(7.6, h - 24, 1, 3);
    g.generateTexture(WITCHDOCTOR_TEXTURE_KEY, w, h);
    g.destroy();
  }

  /** The Samurai avatar — Kyoto's blade: lacquer-dark armor with a crimson sash,
   *  a wide jingasa-line helm, and the katana's saya at the left hip. CODE-DRAWN
   *  PLACEHOLDER (a real sprite PNG drops in later via the sprite override under
   *  this same key). Same footprint as the other figures. */
  private static ensureSamuraiTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists(SAMURAI_TEXTURE_KEY)) return;
    const w = WIDTH;
    const h = HEIGHT;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    // Dark outline + lacquered armor body.
    g.fillStyle(0x120c0c, 1);
    g.fillRoundedRect(4, 8, w - 8, h - 10, 9);
    g.fillStyle(0x33201e, 1); // lacquer-dark plates
    g.fillRoundedRect(6, 10, w - 12, h - 14, 7);
    // Plate lines (the laced rows of the do).
    g.fillStyle(0x1c1210, 1);
    g.fillRect(8, 26, w - 16, 1.6);
    g.fillRect(8, 32, w - 16, 1.6);
    g.fillRect(8, 38, w - 16, 1.6);
    // Crimson sash across the waist.
    g.fillStyle(0xd8503a, 1);
    g.fillRect(8, 30, w - 16, 3);
    // Head + the wide helm line.
    g.fillStyle(0xe0c8a8, 1); // face
    g.fillCircle(w / 2, 14, 5.5);
    g.fillStyle(0x120c0c, 1); // eyes
    g.fillCircle(w / 2 - 2, 14.5, 1.1);
    g.fillCircle(w / 2 + 2, 14.5, 1.1);
    g.fillStyle(0x2a1a18, 1); // the helm: a wide brim + crown
    g.fillRoundedRect(w / 2 - 10, 8, 20, 4, 2);
    g.fillRoundedRect(w / 2 - 6, 4, 12, 5, 2);
    g.fillStyle(0xe8c05a, 1); // the maedate crest dot
    g.fillCircle(w / 2, 6, 1.8);
    // The katana's saya at the left hip (dark sheath, gold fittings).
    g.fillStyle(0x1c1210, 1);
    const sx = 7;
    g.fillRect(sx - 1, h - 34, 3, 20);
    g.fillStyle(0xe8c05a, 1);
    g.fillRect(sx - 1, h - 32, 3, 2); // koiguchi
    g.fillRect(sx - 1, h - 18, 3, 2); // kojiri
    g.generateTexture(SAMURAI_TEXTURE_KEY, w, h);
    g.destroy();
  }

  /** Draw the Lhasa MONK avatar (saffron-and-ochre robe, shaved head, prayer
   *  beads) as a generated texture — a CODE-DRAWN PLACEHOLDER (a real sprite
   *  PNG drops in later via the sprite override under this same key). Same
   *  footprint as the other figures. */
  private static ensureMonkTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists(MONK_TEXTURE_KEY)) return;
    const w = WIDTH;
    const h = HEIGHT;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    // Dark outline + the saffron robe body.
    g.fillStyle(0x3a2410, 1);
    g.fillRoundedRect(4, 8, w - 8, h - 10, 9);
    g.fillStyle(0xe8a03a, 1); // saffron robe
    g.fillRoundedRect(6, 10, w - 12, h - 14, 7);
    // The ochre over-robe draped across one shoulder (the other arm bare).
    g.fillStyle(0xb0621e, 1);
    g.fillRect(6, 20, (w - 12) * 0.55, h - 26);
    g.fillRect(6, 16, 8, 8); // the shoulder fold
    // Robe hem line.
    g.fillStyle(0x8a4a16, 1);
    g.fillRect(8, h - 9, w - 16, 2);
    // Prayer beads: a short arc of dark dots across the chest.
    g.fillStyle(0x4a2a18, 1);
    g.fillCircle(w / 2 - 6, 24, 1.4);
    g.fillCircle(w / 2 - 2, 26, 1.4);
    g.fillCircle(w / 2 + 2, 26, 1.4);
    g.fillCircle(w / 2 + 6, 24, 1.4);
    // Shaved head (no helm, no hair) + calm eyes.
    g.fillStyle(0xd8a878, 1);
    g.fillCircle(w / 2, 13, 6);
    g.fillStyle(0x2a1a10, 1);
    g.fillCircle(w / 2 - 2.2, 14, 1);
    g.fillCircle(w / 2 + 2.2, 14, 1);
    // A faint chi-green wrist wrap on the bare arm (the class accent).
    g.fillStyle(0xa8ffd0, 1);
    g.fillRect(w - 11, 34, 4, 2.4);
    g.generateTexture(MONK_TEXTURE_KEY, w, h);
    g.destroy();
  }

  /** Draw the Dubai ASSASSIN avatar (charcoal hooded cloak, shadowed face, a
   *  sash of throwing knives) as a generated texture — a CODE-DRAWN PLACEHOLDER
   *  (a real sprite PNG drops in later via the sprite override under this same
   *  key). Same footprint as the other figures. */
  private static ensureAssassinTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists(ASSASSIN_TEXTURE_KEY)) return;
    const w = WIDTH;
    const h = HEIGHT;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    // Dark outline + the charcoal cloak body.
    g.fillStyle(0x0e0c12, 1);
    g.fillRoundedRect(4, 8, w - 8, h - 10, 9);
    g.fillStyle(0x2a2632, 1); // charcoal cloak
    g.fillRoundedRect(6, 10, w - 12, h - 14, 7);
    // The cloak's inner shadow-split (it hangs open over darker underlayers).
    g.fillStyle(0x1a1722, 1);
    g.fillRect(w / 2 - 3, 22, 6, h - 32);
    // The hood: a peaked cowl swallowing most of the face.
    g.fillStyle(0x211d2a, 1);
    g.fillTriangle(w / 2 - 10, 18, w / 2 + 10, 18, w / 2, 2);
    g.fillRoundedRect(w / 2 - 10, 8, 20, 10, 4);
    // What shows of the face: a shadowed slit + pale grey eyes.
    g.fillStyle(0x0e0c12, 1);
    g.fillRect(w / 2 - 7, 12, 14, 5);
    g.fillStyle(0xb8c0d0, 1);
    g.fillCircle(w / 2 - 3, 14.5, 1.1);
    g.fillCircle(w / 2 + 3, 14.5, 1.1);
    // A knife sash across the chest: three slim steel glints.
    g.fillStyle(0x3a3644, 1);
    g.fillRect(8, 24, w - 16, 4);
    g.fillStyle(0xc8d0e0, 1);
    g.fillRect(11, 24.8, 2, 2.4);
    g.fillRect(16, 24.8, 2, 2.4);
    g.fillRect(21, 24.8, 2, 2.4);
    // A dagger at the hip (dark grip, pale edge).
    g.fillStyle(0x0e0c12, 1);
    g.fillRect(6, h - 26, 3, 12);
    g.fillStyle(0xc8d0e0, 1);
    g.fillRect(6.8, h - 24, 1.4, 8);
    g.generateTexture(ASSASSIN_TEXTURE_KEY, w, h);
    g.destroy();
  }

  /** Draw the Rome PRIEST avatar (cream cassock, gold stole, tonsured head, a
   *  small raised light) as a generated texture — a CODE-DRAWN PLACEHOLDER (a
   *  real sprite PNG drops in later via the sprite override under this same
   *  key). Same footprint as the other figures. */
  private static ensurePriestTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists(PRIEST_TEXTURE_KEY)) return;
    const w = WIDTH;
    const h = HEIGHT;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    // Dark outline + the cream cassock body.
    g.fillStyle(0x2a2418, 1);
    g.fillRoundedRect(4, 8, w - 8, h - 10, 9);
    g.fillStyle(0xe8e0c8, 1); // cream cassock
    g.fillRoundedRect(6, 10, w - 12, h - 14, 7);
    // The gold stole: two bands falling from the shoulders to the hem.
    g.fillStyle(0xd8b03a, 1);
    g.fillRect(w / 2 - 8, 20, 4, h - 30);
    g.fillRect(w / 2 + 4, 20, 4, h - 30);
    // Cassock hem line.
    g.fillStyle(0xb8a878, 1);
    g.fillRect(8, h - 9, w - 16, 2);
    // Tonsured head: a pale crown fringe around a bare pate + calm eyes.
    g.fillStyle(0xd8b090, 1); // face
    g.fillCircle(w / 2, 13, 6);
    g.fillStyle(0x8a7a5a, 1); // the fringe
    g.fillRect(w / 2 - 6.5, 8.5, 13, 2.4);
    g.fillStyle(0x2a2418, 1); // eyes
    g.fillCircle(w / 2 - 2.2, 14.5, 1);
    g.fillCircle(w / 2 + 2.2, 14.5, 1);
    // A small raised light at one hand (the honest Light, held plainly).
    g.fillStyle(0xffe9a8, 1);
    g.fillCircle(w - 8, 26, 2.6);
    g.fillStyle(0xfff8e0, 1);
    g.fillCircle(w - 8, 26, 1.2);
    g.generateTexture(PRIEST_TEXTURE_KEY, w, h);
    g.destroy();
  }

  /** Draw the Mexico City SAVAGE avatar (bronze skin, jaguar-pelt mantle, red
   *  war paint, an obsidian-edged club) as a generated texture — a CODE-DRAWN
   *  PLACEHOLDER (a real sprite PNG drops in later via the sprite override
   *  under this same key). Same footprint as the other figures. */
  private static ensureSavageTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists(SAVAGE_TEXTURE_KEY)) return;
    const w = WIDTH;
    const h = HEIGHT;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    // Dark outline + bare bronze torso.
    g.fillStyle(0x2a140c, 1);
    g.fillRoundedRect(4, 8, w - 8, h - 10, 9);
    g.fillStyle(0xa8623a, 1); // bronze skin
    g.fillRoundedRect(6, 10, w - 12, h - 14, 7);
    // The jaguar-pelt mantle across one shoulder (sun-gold with dark rosettes).
    g.fillStyle(0xe8a03a, 1);
    g.fillRect(6, 18, (w - 12) * 0.5, 12);
    g.fillStyle(0x5a3a14, 1);
    g.fillCircle(10, 22, 1.4);
    g.fillCircle(15, 26, 1.4);
    g.fillCircle(12, 28, 1.2);
    // A hide kilt at the waist.
    g.fillStyle(0x8a5a2a, 1);
    g.fillRect(8, h - 20, w - 16, 10);
    // Head: tied dark hair + red war paint across the eyes.
    g.fillStyle(0xb8724a, 1); // face
    g.fillCircle(w / 2, 13, 6);
    g.fillStyle(0x1a0e08, 1); // hair knot
    g.fillRoundedRect(w / 2 - 6, 5, 12, 5, 2);
    g.fillRect(w / 2 + 4, 3, 3, 5);
    g.fillStyle(0xd04a3a, 1); // the paint stripe
    g.fillRect(w / 2 - 6.5, 12.5, 13, 2.6);
    g.fillStyle(0x1a0e08, 1); // eyes inside the stripe
    g.fillCircle(w / 2 - 2.4, 13.8, 1);
    g.fillCircle(w / 2 + 2.4, 13.8, 1);
    // The macuahuitl at the hip: a dark club edged with pale obsidian teeth.
    g.fillStyle(0x3a2410, 1);
    g.fillRect(5, h - 32, 4, 18);
    g.fillStyle(0xd8d8e0, 1);
    g.fillRect(4.2, h - 30, 1.6, 3);
    g.fillRect(4.2, h - 25, 1.6, 3);
    g.fillRect(4.2, h - 20, 1.6, 3);
    g.generateTexture(SAVAGE_TEXTURE_KEY, w, h);
    g.destroy();
  }

  /** Draw the Sydney HUNTER avatar (weathered bush coat, slouch hat, the bow
   *  across the back, cleansed-green trim) as a generated texture — a CODE-DRAWN
   *  PLACEHOLDER (a real sprite PNG drops in later via the sprite override
   *  under this same key). Same footprint as the other figures. */
  private static ensureHunterTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists(HUNTER_TEXTURE_KEY)) return;
    const w = WIDTH;
    const h = HEIGHT;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    // Dark outline + the long weathered bush coat.
    g.fillStyle(0x14200c, 1);
    g.fillRoundedRect(4, 8, w - 8, h - 10, 8);
    g.fillStyle(0x4a5a34, 1); // olive-drab coat
    g.fillRoundedRect(6, 10, w - 12, h - 14, 6);
    g.fillStyle(0x38482a, 1); // coat shadow panel
    g.fillRect(w / 2 - 2, 16, 4, h - 28);
    // The bow across the back: a pale arc past the left shoulder + string.
    g.lineStyle(2.4, 0xd8c88a, 1);
    g.beginPath();
    g.arc(w / 2 - 9, h / 2 - 2, 15, Math.PI * 0.75, Math.PI * 1.6);
    g.strokePath();
    g.lineStyle(1, 0xe8e2c8, 0.9);
    g.lineBetween(w / 2 - 20, h / 2 + 9, w / 2 - 7, h / 2 - 17);
    // A leather quiver strap across the chest + green trim.
    g.fillStyle(0x6a4a24, 1);
    g.fillRect(8, 18, w - 16, 4);
    g.fillStyle(0xa0c86a, 1); // the cleansed-green trim (bond colors)
    g.fillRect(8, 22, w - 16, 2);
    // Head under the slouch hat: tanned face, the wide brim, a dented crown.
    g.fillStyle(0xc89a6a, 1); // face
    g.fillCircle(w / 2, 14, 5.5);
    g.fillStyle(0x14200c, 1); // eyes
    g.fillCircle(w / 2 - 2.2, 14.5, 1);
    g.fillCircle(w / 2 + 2.2, 14.5, 1);
    g.fillStyle(0x3a2c14, 1); // hat brim (wide)
    g.fillRoundedRect(w / 2 - 10, 9, 20, 4, 2);
    g.fillStyle(0x4a3820, 1); // crown
    g.fillRoundedRect(w / 2 - 6, 3, 12, 7, 3);
    g.fillStyle(0xa0c86a, 1); // hat band
    g.fillRect(w / 2 - 6, 8, 12, 2);
    // Boots under the coat hem.
    g.fillStyle(0x2a1e10, 1);
    g.fillRoundedRect(9, h - 8, 6, 5, 2);
    g.fillRoundedRect(w - 15, h - 8, 6, 5, 2);
    g.generateTexture(HUNTER_TEXTURE_KEY, w, h);
    g.destroy();
  }

  /** Draw the Bali SUNDIAN avatar (sea-green robes over bronze skin, a coral
   *  crown, the trident, pearl trim) as a generated texture — a CODE-DRAWN
   *  PLACEHOLDER (a real sprite PNG drops in later via the sprite override
   *  under this same key). Same footprint as the other figures. */
  private static ensureSundianTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists(SUNDIAN_TEXTURE_KEY)) return;
    const w = WIDTH;
    const h = HEIGHT;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    // Dark outline + the flowing sea-green robe.
    g.fillStyle(0x06202a, 1);
    g.fillRoundedRect(4, 8, w - 8, h - 10, 8);
    g.fillStyle(0x1a6a70, 1); // deep sea-green robe
    g.fillRoundedRect(6, 10, w - 12, h - 14, 6);
    g.fillStyle(0x35b0a8, 1); // the tide-line panel
    g.fillRoundedRect(w / 2 - 3, 18, 6, h - 30, 3);
    // Wave hem at the robe's foot.
    g.fillStyle(0x7ad8d0, 0.9);
    g.fillCircle(10, h - 6, 3);
    g.fillCircle(16, h - 5, 3);
    g.fillCircle(22, h - 6, 3);
    // Pearl trim across the chest.
    g.fillStyle(0xe8e2d8, 1);
    g.fillCircle(10, 21, 1.6);
    g.fillCircle(w / 2, 21, 1.6);
    g.fillCircle(w - 10, 21, 1.6);
    // Head: bronze face under the CORAL CROWN.
    g.fillStyle(0xb8825a, 1); // face
    g.fillCircle(w / 2, 14, 5.5);
    g.fillStyle(0x06202a, 1); // eyes
    g.fillCircle(w / 2 - 2.2, 14.5, 1);
    g.fillCircle(w / 2 + 2.2, 14.5, 1);
    g.fillStyle(0xe08a7a, 1); // the coral crown: band + branching points
    g.fillRoundedRect(w / 2 - 7, 7, 14, 4, 2);
    g.fillTriangle(w / 2 - 6, 8, w / 2 - 3, 8, w / 2 - 4.5, 2);
    g.fillTriangle(w / 2 - 1.5, 8, w / 2 + 1.5, 8, w / 2, 1);
    g.fillTriangle(w / 2 + 3, 8, w / 2 + 6, 8, w / 2 + 4.5, 2);
    // The trident at the side: a pale shaft with three tines.
    g.fillStyle(0xd8d8c8, 1);
    g.fillRect(5, 12, 2.4, h - 22);
    g.fillRect(2.5, 12, 1.8, 7);
    g.fillRect(5.3, 10, 1.8, 9);
    g.fillRect(8.1, 12, 1.8, 7);
    g.generateTexture(SUNDIAN_TEXTURE_KEY, w, h);
    g.destroy();
  }
}

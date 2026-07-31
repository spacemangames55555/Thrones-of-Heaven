/**
 * CLASS AVATAR TEXTURE KEYS — the single source for classId → figure texture
 * key (Pass 8). Player.setClassSkin resolves through this table, and the
 * asset-manifest scanner reads the SAME table, so the manifest can never
 * drift from what the game actually renders. Data-only (no Phaser import) so
 * Node tooling bundles it directly.
 *
 * CANON notes carried from Player.ts: the Blacksmith wears the default
 * 'player-figure' (the gold soul/herald); Mage is NOT the Wizard; the
 * Sundian displays for classId 'atlantean'.
 */
export const FIGURE_KEY_FOR_CLASS: Record<string, string> = {
  blacksmith: 'player-figure', // gold soul/herald (the default figure)
  wizard: 'wizard-figure', // Egyptian sorcerer
  necromancer: 'necro-figure', // Slavic death-sorcerer
  druid: 'druid-figure', // Seattle wild-warden
  mage: 'mage-figure', // Moscow reality-surgeon — NOT the Wizard (canon)
  bard: 'bard-figure', // London memory-keeper
  witchdoctor: 'witchdoctor-figure', // Kinshasa spirit-speaker
  samurai: 'samurai-figure', // Kyoto blade
  monk: 'monk-figure', // Lhasa ascetic
  assassin: 'assassin-figure', // Dubai knife-in-the-dark
  priest: 'priest-figure', // Rome keeper of the Light
  savage: 'savage-figure', // Mexico City blood-and-sun bruiser
  hunter: 'hunter-figure', // Sydney beast-bonded tracker
  atlantean: 'sundian-figure', // Bali drowned sovereign (displays 'Sundian')
};

/** The default figure key (unknown class ids fall back to the Blacksmith look). */
export const DEFAULT_FIGURE_KEY = 'player-figure';

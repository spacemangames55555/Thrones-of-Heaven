// Region-champion instances. Future regions append; never edit shipped entries.
export const CHAMPION_SPECS: Record<string, {
  name: string; domain: 'Physical' | 'Mental' | 'Spiritual';
  move: 'charge' | 'summon-adds' | 'channel-beam' | 'aoe-slam';
}> = {
  'cam-02-vesuvian-herald':    { name: 'The Vesuvian Herald',    domain: 'Spiritual', move: 'aoe-slam' },
  'kyi-01-river-gate-tyrant':  { name: 'The River Gate Tyrant',  domain: 'Mental',    move: 'channel-beam' },
  'alp-01-pass-warden':        { name: 'The Pass Warden',        domain: 'Physical',  move: 'charge' },
  'bel-02-confluence-warlord': { name: 'The Confluence Warlord', domain: 'Physical',  move: 'summon-adds' },
  // ── AFRICA — the Rift march (append-only) ──
  'nub-01-kushite-sentinel': { name: 'The Kushite Sentinel', domain: 'Spiritual', move: 'aoe-slam' },
  'itu-02-canopy-king':      { name: 'The Canopy King',      domain: 'Mental',    move: 'summon-adds' },
  'ser-02-rift-warden':      { name: 'The Rift Warden',      domain: 'Physical',  move: 'charge' },
  // ── ASIA — the Kunlun march (append-only) ──
  'cht-02-plateau-stormer': { name: 'The Plateau Stormer', domain: 'Physical',  move: 'charge' },
  'gor-01-gorge-witch':     { name: 'The Gorge Witch',     domain: 'Mental',    move: 'channel-beam' },
  'ang-02-temple-warden':   { name: 'The Temple Warden',   domain: 'Spiritual', move: 'summon-adds' },
  // ── BABEL / ULURU / TEOTIHUACAN — the final three (append-only) ──
  'mar-01-reed-king':            { name: 'The Reed King',            domain: 'Mental',    move: 'summon-adds' },
  'red-01-track-warden':         { name: 'The Track Warden',         domain: 'Physical',  move: 'charge' },
  'yuc-01-serpent-of-the-steps': { name: 'The Serpent of the Steps', domain: 'Spiritual', move: 'aoe-slam' },
};
// Note: all four signature moves are deliberately exercised exactly once in Europe.

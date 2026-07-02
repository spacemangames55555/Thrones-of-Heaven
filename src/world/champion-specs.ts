// Region-champion instances. Future regions append; never edit shipped entries.
export const CHAMPION_SPECS: Record<string, {
  name: string; domain: 'Physical' | 'Mental' | 'Spiritual';
  move: 'charge' | 'summon-adds' | 'channel-beam' | 'aoe-slam';
}> = {
  'cam-02-vesuvian-herald':    { name: 'The Vesuvian Herald',    domain: 'Spiritual', move: 'aoe-slam' },
  'kyi-01-river-gate-tyrant':  { name: 'The River Gate Tyrant',  domain: 'Mental',    move: 'channel-beam' },
  'alp-01-pass-warden':        { name: 'The Pass Warden',        domain: 'Physical',  move: 'charge' },
  'bel-02-confluence-warlord': { name: 'The Confluence Warlord', domain: 'Physical',  move: 'summon-adds' },
};
// Note: all four signature moves are deliberately exercised exactly once in Europe.

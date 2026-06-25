// main.js — UI wiring for Airhorn Hero (soundboard + Frenzy game).
import { AirhornSynth, STYLE_LIST } from './audio.js';
import { FrenzyGame } from './game.js';

const synth = new AirhornSynth();
let muted = false;

// Pad colors cycle through a punchy palette.
const PAD_COLORS = [
  'linear-gradient(135deg,#ff3b3b,#ff7b3b)',
  'linear-gradient(135deg,#7b3bff,#ff3bd0)',
  'linear-gradient(135deg,#1f9bff,#2bd4d4)',
  'linear-gradient(135deg,#2bd47b,#a6ff2b)',
  'linear-gradient(135deg,#ffb020,#ff5c8a)',
  'linear-gradient(135deg,#ff2b6e,#7b3bff)',
];

/* ---------------- tabs ---------------- */
const tabs = document.querySelectorAll('.tab');
const views = { board: document.getElementById('view-board'), game: document.getElementById('view-game') };
tabs.forEach((t) => {
  t.addEventListener('click', () => {
    tabs.forEach((x) => x.classList.toggle('is-active', x === t));
    const id = t.dataset.tab;
    Object.entries(views).forEach(([k, v]) => v.classList.toggle('is-active', k === id));
    if (id !== 'game') { game.stop(); showOverlay(); }
    synth.unlock(); // first interaction primes audio
  });
});

/* ---------------- soundboard ---------------- */
const padGrid = document.getElementById('pad-grid');
STYLE_LIST.forEach((style, i) => {
  const pad = document.createElement('button');
  pad.className = 'pad';
  pad.style.background = PAD_COLORS[i % PAD_COLORS.length];
  pad.innerHTML = `<span class="pad-emoji">${style.emoji}</span><span class="pad-label">${style.label}</span>`;

  let voiceId = null;
  const down = (e) => {
    e.preventDefault();
    if (muted) return;
    pad.classList.add('is-down');
    voiceId = synth.start(style.id);
  };
  const up = () => {
    pad.classList.remove('is-down');
    if (voiceId != null) { synth.stop(voiceId); voiceId = null; }
  };
  pad.addEventListener('pointerdown', down);
  pad.addEventListener('pointerup', up);
  pad.addEventListener('pointerleave', up);
  pad.addEventListener('pointercancel', up);
  padGrid.appendChild(pad);
});

/* ---------------- frenzy game ---------------- */
let selectedStyle = 'classic';
const el = {
  score: document.getElementById('g-score'),
  combo: document.getElementById('g-combo'),
  time: document.getElementById('g-time'),
  high: document.getElementById('g-high'),
  rep: document.getElementById('g-rep'),
  grid: document.getElementById('game-grid'),
  overlay: document.getElementById('game-overlay'),
  ovTitle: document.getElementById('ov-title'),
  ovText: document.getElementById('ov-text'),
  ovStart: document.getElementById('ov-start'),
  styleRow: document.getElementById('game-style'),
};

// build the 9 game cells
const cellEls = [];
for (let i = 0; i < 9; i++) {
  const c = document.createElement('button');
  c.className = 'cell';
  c.innerHTML = '<span class="horn">📢</span>';
  c.addEventListener('pointerdown', (e) => { e.preventDefault(); game.tap(i); });
  el.grid.appendChild(c);
  cellEls.push(c);
}

// style chips in the start overlay
STYLE_LIST.forEach((style) => {
  const chip = document.createElement('button');
  chip.className = 'style-chip' + (style.id === selectedStyle ? ' is-active' : '');
  chip.textContent = `${style.emoji} ${style.label}`;
  chip.addEventListener('click', () => {
    selectedStyle = style.id;
    game.setStyle(style.id);
    document.querySelectorAll('.style-chip').forEach((x) => x.classList.toggle('is-active', x === chip));
    synth.blast(style.id, { combo: 0 }); // preview
  });
  el.styleRow.appendChild(chip);
});

function render(s) {
  el.score.textContent = s.score;
  el.combo.textContent = s.combo + '×';
  el.combo.classList.toggle('hot', s.combo >= 3);
  el.time.textContent = Math.ceil(s.timeLeft / 1000);
  el.high.textContent = s.highScore;
  el.rep.style.width = (s.rep / s.maxRep * 100) + '%';
  el.rep.style.background = s.rep < 30
    ? 'linear-gradient(90deg,#ff3b3b,#ff5c8a)'
    : 'linear-gradient(90deg,#2bd47b,#ffb020)';

  s.cells.forEach((cell, i) => {
    cellEls[i].classList.toggle('up', cell.active);
    cellEls[i].classList.toggle('flash', cell.flash > 0);
  });

  if (s.over) showGameOver(s);
}

function showOverlay() {
  el.ovTitle.textContent = 'AIRHORN FRENZY';
  el.ovText.textContent = "Tap the horns before they drop. Chain hits to crank the pitch and your multiplier. Don't let your REP hit zero.";
  el.ovStart.textContent = 'START';
  el.overlay.classList.add('is-active');
}

function showGameOver(s) {
  el.ovTitle.textContent = s.isHigh ? '🏆 NEW HIGH SCORE!' : (s.won ? "TIME'S UP!" : 'REP DRAINED');
  el.ovText.textContent = `Score ${s.score} · Best combo ${s.bestCombo}× · High ${s.highScore}`;
  el.ovStart.textContent = 'PLAY AGAIN';
  el.overlay.classList.add('is-active');
}

const game = new FrenzyGame({ synth, style: selectedStyle, onState: render });

el.ovStart.addEventListener('click', () => {
  synth.unlock();
  el.overlay.classList.remove('is-active');
  game.start();
});

/* ---------------- mute ---------------- */
const muteBtn = document.getElementById('mute');
muteBtn.addEventListener('click', () => {
  muted = !muted;
  muteBtn.textContent = muted ? '🔇' : '🔊';
  if (synth.master) synth.master.gain.value = muted ? 0 : 0.9;
  if (muted) synth.stopAll();
});

/* ---------------- prevent iOS rubber-banding / zoom ---------------- */
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('touchmove', (e) => { if (e.scale && e.scale !== 1) e.preventDefault(); }, { passive: false });

// initialise high score display
render({
  score: 0, combo: 0, timeLeft: 30000, highScore: game.highScore,
  rep: 100, maxRep: 100, cells: game.cells, bestCombo: 0,
});

/* ---------------- service worker (PWA / offline) ---------------- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

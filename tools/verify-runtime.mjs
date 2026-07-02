// RUNTIME VERIFICATION GATE (npm run verify:runtime) — part of the pipeline's
// Definition of Done for any change touching live code paths.
//
// Boots the REAL built game headlessly (428x926, the target phone viewport)
// and fails on the classes of bug tsc/build/smoke cannot see:
//   • any page error during boot or scene creation (the class-announcement
//     crash was exactly this: create() threw only at runtime),
//   • a fresh start that auto-activates a quest it shouldn't (any class),
//   • the Europe sparse world failing to register/render its built chunks,
//   • zone gates missing or a gate crossing not landing,
//   • world travel (Europe <-> Earth) breaking.
//
// Self-contained: builds nothing (run `npm run build` first — `npm run verify`
// chains it), starts its own preview server on :4174, exits nonzero on any
// failure. Requires the window.__game handle exported by src/main.ts.
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';

const PORT = 4174;
const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const results = [];
const pageErrors = [];
const ok = (name, pass, detail = '') => {
  results.push(pass);
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
};

// 1) Preview server (killed on exit).
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
const kill = () => {
  try {
    server.kill();
  } catch {
    /* already gone */
  }
};
process.on('exit', kill);
await new Promise((r) => setTimeout(r, 2500));

let browser;
try {
  browser = await chromium.launch({
    executablePath: EXE,
    headless: true,
    args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage({ viewport: { width: 428, height: 926 } });
  await page.addInitScript(() => {
    Object.defineProperty(document, 'hidden', { get: () => false });
    Object.defineProperty(document, 'visibilityState', { get: () => 'visible' });
  });
  page.on('pageerror', (e) => pageErrors.push(e.message));

  async function newGame(classId) {
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
    await page.waitForFunction(() => !!window.__game && window.__game.scene.isActive('TitleScene'), { timeout: 25000 });
    await page.evaluate(() => localStorage.clear());
    await page.evaluate((cid) => window.__game.scene.getScene('TitleScene').scene.start('MainScene', { mode: 'new', classId: cid }), classId);
    await page.waitForFunction(() => window.__game.scene.isActive('MainScene'), { timeout: 25000 });
    await page.waitForTimeout(1500);
    if (await page.evaluate(() => window.__game.scene.isActive('FirstSkillScene'))) {
      await page.mouse.click(214, 462);
      await page.waitForTimeout(600);
    }
  }

  // 2) Every playable class boots to a clean fresh start (nothing auto-starts —
  //    this is the guard against generated home-city chains hijacking openings).
  for (const cls of ['blacksmith', 'wizard', 'necromancer']) {
    await newGame(cls);
    const s = await page.evaluate(() => {
      const ms = window.__game.scene.getScene('MainScene');
      return { world: ms.activeWorld, active: ms.chain.activeQuest?.id ?? null };
    });
    ok(`fresh start (${cls}): Earth, no auto-started quest`, s.world === 'earth' && s.active === null, `world=${s.world} active=${s.active}`);
  }

  // 3) The Europe sparse world (when built zones exist): travel, chunks, gates.
  const hasEurope = await page.evaluate(() => !!window.__game.scene.getScene('MainScene').worlds['europe']);
  if (hasEurope) {
    await page.evaluate(() => window.__game.scene.getScene('MainScene').devTravelEurope());
    await page.waitForTimeout(2200);
    const r = await page.evaluate(() => {
      const ms = window.__game.scene.getScene('MainScene');
      return {
        world: ms.activeWorld,
        chunks: ms.europeColliders.length,
        onChunk: ms.activeMap().terrainAtWorld(ms.player.x, ms.player.y) !== null,
        gates: ms.europeGates.length,
      };
    });
    ok('Europe: travel lands on a rendered chunk', r.world === 'europe' && r.chunks >= 1 && r.onChunk, `chunks=${r.chunks}`);
    ok('Europe: gates come in pairs (both directions)', r.gates % 2 === 0, `${r.gates} gates`);
    if (r.gates >= 2) {
      const crossed = await page.evaluate(async () => {
        const ms = window.__game.scene.getScene('MainScene');
        const g = ms.europeGates[0];
        ms.player.sprite.body.reset(g.x, g.y + 20);
        await new Promise((res) => setTimeout(res, 600));
        if (!ms.cityGateButton.isVisible) return { shown: false };
        ms.cityGateAction?.();
        await new Promise((res) => setTimeout(res, 1600));
        return { shown: true, d: Math.hypot(ms.player.x - g.dest.x, ms.player.y - g.dest.y) };
      });
      ok('Europe: a real gate crossing lands', crossed.shown && crossed.d < 8, crossed.shown ? `d=${crossed.d.toFixed(1)}` : 'button never appeared');
    }
    await page.evaluate(() => window.__game.scene.getScene('MainScene').devTravelEarth());
    await page.waitForTimeout(2000);
    ok('Europe → Earth return works', (await page.evaluate(() => window.__game.scene.getScene('MainScene').activeWorld)) === 'earth');
  } else {
    console.log('info  no europe world registered — skipping Europe checks');
  }

  // 4) THE GATE: zero page errors across everything above.
  ok('zero page errors during boot + travel', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));
} finally {
  await browser?.close();
  kill();
}

const passed = results.filter(Boolean).length;
console.log(`\n${passed}/${results.length} runtime checks passed`);
if (passed !== results.length) process.exit(1);

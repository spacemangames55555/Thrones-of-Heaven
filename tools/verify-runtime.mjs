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
// HARNESS CONTRACT (hardening pass): every check ESTABLISHES its own
// preconditions — alive, healed, god-mode shield, known location/quest state —
// via window.__ready() / window.__ensureEscort() before acting, and asserts
// its setup LOUDLY: a check whose setup fails must FAIL the gate, never
// silently skip or vacuously pass. (A debuff-seed that no-op'd on a dead
// player, and Europe checks skipping when the world failed to register, were
// exactly this class of rot.)
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

  // HARNESS HELPERS (the precondition contract). __ready(): revive + heal +
  // god-mode absorb shield — checks test SYSTEMS, not the player's survival;
  // an unnoticed mid-check death corrupts everything after it (the respawn
  // relocates the player and correctly resets encounters). __ensureEscort():
  // (re)establish a live escort run for a beat regardless of what earlier
  // checks left behind. Defined AFTER the last page navigation.
  await page.evaluate(() => {
    window.__ready = () => {
      const ms = window.__game.scene.getScene('MainScene');
      if (ms.playerDead) ms.respawnPlayer();
      ms.playerHealth.full();
      ms.playerHealth.shield = 1e9;
      return ms;
    };
    window.__ensureEscort = async (beatId) => {
      const ms = window.__ready();
      if (!ms.escort || ms.escort.beatId !== beatId || ms.chain.activeQuest?.id !== beatId) {
        ms.devJumpToQuest(beatId);
        ms.playerHealth.shield = 1e9; // re-arm past the jump's heal path
        await new Promise((r) => setTimeout(r, 2600)); // travel + chunk activation + spawn
      }
      return ms;
    };
  });

  // 3) The Europe sparse world: travel, chunks, gates. Europe SHIPPED — if the
  // world failed to register, that is a loud FAIL, never a silent skip.
  const hasEurope = await page.evaluate(() => !!window.__game.scene.getScene('MainScene').worlds['europe']);
  ok('Europe: sparse world registered (permanent since the region shipped)', hasEurope, hasEurope ? '25 built zones expected' : 'setupEurope registered no world — every Europe check below is unrunnable');
  if (hasEurope) {
    await page.evaluate(() => window.__game.scene.getScene('MainScene').devTravelEurope());
    await page.waitForTimeout(2200);
    const r = await page.evaluate(() => {
      const ms = window.__game.scene.getScene('MainScene');
      return {
        world: ms.activeWorld,
        chunks: ms.regionColliders.length,
        onChunk: ms.activeMap().terrainAtWorld(ms.player.x, ms.player.y) !== null,
        gates: ms.regionGates.length,
      };
    });
    ok('Europe: travel lands on a rendered chunk', r.world === 'europe' && r.chunks >= 1 && r.onChunk, `chunks=${r.chunks}`);
    ok('Europe: gates exist and come in pairs (both directions)', r.gates >= 2 && r.gates % 2 === 0, `${r.gates} gates`);
    // A real gate crossing — runs UNCONDITIONALLY (no gates = a loud fail here too).
    const crossed = await page.evaluate(async () => {
      const ms = window.__ready();
      const g = ms.regionGates[0];
      if (!g) return { shown: false, reason: 'no gates registered' };
      ms.player.sprite.body.reset(g.x, g.y + 20);
      await new Promise((res) => setTimeout(res, 600));
      if (!ms.cityGateButton.isVisible) return { shown: false, reason: 'button never appeared' };
      ms.cityGateAction?.();
      await new Promise((res) => setTimeout(res, 1600));
      return { shown: true, d: Math.hypot(ms.player.x - g.dest.x, ms.player.y - g.dest.y) };
    });
    ok('Europe: a real gate crossing lands', crossed.shown && crossed.d < 8, crossed.shown ? `d=${crossed.d.toFixed(1)}` : crossed.reason);

    // 3b. PER-CHUNK SPAWNS: standing in a chunk materializes its packs (self-
    // establishing: teleports to zone 1's chunk rather than trusting the
    // crossing above to have left the player anywhere useful)...
    const liveAt = await page.evaluate(async () => {
      const ms = window.__ready();
      const z = ms.regionSpawnZones[0];
      if (!z) return -1;
      ms.player.sprite.body.reset(z.center.x, z.center.y + 200);
      await new Promise((res) => setTimeout(res, 900));
      return ms.regionLiveCount();
    });
    ok('Europe: entering a chunk materializes its spawns', liveAt > 0, `${liveAt} live in zone 1`);
    // ...and leaving despawns them (teleport deep into the void, past hysteresis).
    const liveAfterLeave = await page.evaluate(async () => {
      const ms = window.__ready();
      ms.player.sprite.body.reset(ms.player.x + 6000, ms.player.y + 6000);
      await new Promise((res) => setTimeout(res, 900));
      return ms.regionLiveCount();
    });
    ok('Europe: leaving a chunk despawns/pools its enemies', liveAfterLeave === 0, `${liveAfterLeave} live after leaving`);

    // 3c. KILL OBJECTIVE: jump to a clear beat, kill its family, quest completes.
    const clear = await page.evaluate(async () => {
      const ms = window.__ready();
      ms.devJumpToQuest('rom-02-catacomb-vermin'); // clear: corrupted-wildlife in Rome
      ms.playerHealth.shield = 1e9; // re-arm past the jump's heal path
      await new Promise((res) => setTimeout(res, 1200)); // chunk activates + packs spawn
      const wildlife = ms.regionLive.filter((rec) => rec.family === 'corrupted-wildlife' && rec.entity.isAlive);
      for (const rec of wildlife.slice(0, 5)) rec.entity.takeHit(99999);
      await new Promise((res) => setTimeout(res, 900)); // death sweep + trigger
      return { spawned: wildlife.length, status: ms.chain.status('rom-02-catacomb-vermin') };
    });
    ok('Europe: kills increment the active clear objective to completion', clear.spawned >= 5 && clear.status === 'complete', `spawned=${clear.spawned} status=${clear.status}`);

    // 3d. ENTITY CAP during a multi-chunk crossing (rome → campania → apulia).
    const capRun = await page.evaluate(async () => {
      const ms = window.__ready();
      let peak = 0;
      const zones = ms.regionSpawnZones.slice(0, 3);
      for (const z of zones) {
        ms.player.sprite.body.reset(z.center.x, z.center.y + 200);
        for (let i = 0; i < 8; i++) {
          await new Promise((res) => setTimeout(res, 120));
          peak = Math.max(peak, ms.regionLiveCount());
        }
      }
      return { zones: zones.length, peak };
    });
    ok(`Europe: live-enemy cap holds across a 3-chunk crossing (peak ${capRun.peak})`, capRun.zones === 3 && capRun.peak > 0 && capRun.peak <= 48, `zones=${capRun.zones} peak=${capRun.peak} cap=48`);

    // 3e. VEIL-AMBUSHER: spawns hidden (invisible, OUT of the townsfolk combat
    // list → untargetable) and only reveals when the player enters the radius.
    const amb = await page.evaluate(async () => {
      const ms = window.__ready();
      // Reset: hop into the void so every zone despawns, then approach fresh.
      ms.player.sprite.body.reset(ms.player.x + 9000, ms.player.y + 9000);
      await new Promise((res) => setTimeout(res, 700));
      const z = ms.regionSpawnZones.find((s) => s.points.some((p) => p.family === 'veil-ambushers'));
      if (!z) return { found: false };
      const pt = z.points.find((p) => p.family === 'veil-ambushers');
      // Land near the marker but OUTSIDE the 140px trigger (homes ring ≤100px from it).
      ms.player.sprite.body.reset(pt.x + 420, pt.y);
      await new Promise((res) => setTimeout(res, 900)); // zone activates, pack spawns hidden
      const recs = ms.regionAmbushers.filter((a) => Math.hypot(a.home.x - pt.x, a.home.y - pt.y) < 200);
      const hiddenBefore = recs.length > 0 && recs.every((a) => a.state === 'hidden' && !a.t.sprite.visible);
      const targetableBefore = recs.some((a) => ms.townsfolk.includes(a.t));
      ms.player.sprite.body.reset(pt.x, pt.y); // step inside the trigger radius
      await new Promise((res) => setTimeout(res, 600));
      const revealed = recs.some((a) => a.state === 'burst' && a.t.sprite.visible && ms.townsfolk.includes(a.t));
      return { found: true, spawned: recs.length, hiddenBefore, targetableBefore, revealed };
    });
    ok(
      'veil-ambusher: hidden + untargetable until the trigger radius, then reveals',
      amb.found && amb.hiddenBefore && !amb.targetableBefore && amb.revealed,
      amb.found ? `spawned=${amb.spawned} hidden=${amb.hiddenBefore} preTargetable=${amb.targetableBefore} revealed=${amb.revealed}` : 'no ambusher zone found',
    );

    // 3f. HOLLOWED-BRUTE: pack size respects the hard 1–2 cap (per spawn point).
    const brutes = await page.evaluate(async () => {
      const ms = window.__ready();
      ms.player.sprite.body.reset(ms.player.x + 9000, ms.player.y + 9000); // despawn all
      await new Promise((res) => setTimeout(res, 700));
      const z = ms.regionSpawnZones.find((s) => s.points.some((p) => p.family === 'hollowed-brutes'));
      if (!z) return { found: false };
      ms.player.sprite.body.reset(z.center.x, z.center.y + 100);
      await new Promise((res) => setTimeout(res, 900)); // zone activates, packs spawn
      const pts = z.points.filter((p) => p.family === 'hollowed-brutes');
      const perPack = pts.map(
        (p) => ms.regionLive.filter((rec) => rec.family === 'hollowed-brutes' && rec.entity.isAlive && Math.hypot(rec.entity.x - p.x, rec.entity.y - p.y) < 170).length,
      );
      return { found: true, perPack };
    });
    ok(
      'hollowed-brute: every pack spawns 1–2, never more',
      brutes.found && brutes.perPack.length > 0 && brutes.perPack.every((n) => n >= 1 && n <= 2),
      brutes.found ? `packs=[${brutes.perPack.join(',')}]` : 'no brute zone found',
    );

    // 3g. REGION CHAMPION (the boss engine): warping to a boss beat spawns the
    // zone's champion with the spec'd name, domain tint and tier-scaled stats
    // (alp-01 = The Pass Warden: Physical red, tier 3 → 600·3² = 5400 HP).
    const champ = await page.evaluate(async () => {
      const ms = window.__ready();
      ms.devJumpToQuest('alp-01-pass-warden');
      ms.playerHealth.shield = 1e9; // re-arm past the jump's heal path
      await new Promise((res) => setTimeout(res, 2600)); // travel fade + chunk activation + spawn
      const b = ms.championBoss;
      if (!b) return { spawned: false };
      return { spawned: true, name: b.name, tint: b.def.sprite.tint, hp: b.health.max };
    });
    ok(
      'champion: boss-beat warp spawns it with spec name + domain tint + tier stats',
      champ.spawned && champ.name === 'The Pass Warden' && champ.tint === 0xe04a3a && champ.hp === 5400,
      champ.spawned ? `name=${champ.name} tint=0x${champ.tint.toString(16)} hp=${champ.hp}` : 'no champion spawned',
    );

    // ...its ONE signature move (charge) fires within a bounded window once engaged...
    const move = await page.evaluate(async () => {
      const ms = window.__ready();
      const b = ms.championBoss;
      if (!b) return { fired: false };
      const anchor = ms.regionBossAnchors[ms.championZoneId];
      ms.player.sprite.body.reset(anchor.x + 120, anchor.y); // inside activation, outside melee
      const t0 = Date.now();
      let fired = false;
      while (Date.now() - t0 < 9000) {
        ms.playerHealth.full();
        ms.playerHealth.shield = 1e9;
        if (b.pending || b.charge) {
          fired = true;
          break;
        }
        await new Promise((res) => setTimeout(res, 90));
      }
      return { fired, active: b.isActive };
    });
    ok('champion: signature move fires within a bounded window', move.fired && move.active, `fired=${move.fired} active=${move.active}`);

    // ...and a programmatic defeat completes the boss beat.
    const defeat = await page.evaluate(async () => {
      const ms = window.__ready();
      const b = ms.championBoss;
      if (!b) return { done: false };
      b.takeHit(9999999);
      await new Promise((res) => setTimeout(res, 800));
      return { done: true, status: ms.chain.status('alp-01-pass-warden'), cleared: ms.championBoss === undefined };
    });
    ok(
      'champion: programmatic defeat completes the boss beat',
      defeat.done && defeat.status === 'complete' && defeat.cleared,
      defeat.done ? `status=${defeat.status} cleared=${defeat.cleared}` : 'no champion to defeat',
    );

    // 3h. ESCORT (one implementation, eight beats): warping to an escort beat
    // spawns a convoy near the player and it walks its route. apu-01 is the
    // target on purpose: apulia's families include veil-ambushers, so this
    // also proves the escort-proximity hook arms.
    const esc = await page.evaluate(async () => {
      const ms = await window.__ensureEscort('apu-01-pilgrim-escort');
      const e = ms.escort;
      if (!e) return { spawned: false };
      const near = Math.hypot(e.npcSprite.x - ms.player.x, e.npcSprite.y - ms.player.y);
      const x0 = e.npcSprite.x;
      const y0 = e.npcSprite.y;
      await new Promise((res) => setTimeout(res, 1100));
      const moved = Math.hypot(e.npcSprite.x - x0, e.npcSprite.y - y0);
      return { spawned: true, near, moved, hooked: e.hasAmbushers, status: ms.chain.status('apu-01-pilgrim-escort') };
    });
    ok(
      'escort: beat warp spawns the convoy near the player and it moves',
      esc.spawned && esc.near < 400 && esc.moved > 30 && esc.hooked && esc.status === 'active',
      esc.spawned ? `near=${esc.near.toFixed(0)}px moved=${esc.moved.toFixed(0)}px escortHookArmed=${esc.hooked}` : 'no convoy spawned',
    );

    // ...a scripted convoy death resets the run for a clean retry (fresh
    // full-HP convoy, beat still active — no permanent failure state)...
    const escReset = await page.evaluate(async () => {
      const ms = await window.__ensureEscort('apu-01-pilgrim-escort');
      const e = ms.escort;
      if (!e) return { had: false };
      const oldSprite = e.npcSprite;
      e.npcHealth.damage(1e9); // scripted convoy death
      await new Promise((res) => setTimeout(res, 500));
      const despawned = ms.escort === undefined;
      await new Promise((res) => setTimeout(res, 3400)); // past the retry breather
      const fresh = !!ms.escort && ms.escort.npcSprite !== oldSprite && ms.escort.npcHealth.current === ms.escort.npcHealth.max;
      return { had: true, despawned, fresh, status: ms.chain.status('apu-01-pilgrim-escort') };
    });
    ok(
      'escort: scripted convoy death resets the run for a clean retry',
      escReset.had && escReset.despawned && escReset.fresh && escReset.status === 'active',
      escReset.had ? `despawned=${escReset.despawned} freshConvoy=${escReset.fresh} status=${escReset.status}` : 'no active escort to kill',
    );

    // ...and the convoy reaching the endpoint completes the beat.
    const escDone = await page.evaluate(async () => {
      const ms = await window.__ensureEscort('apu-01-pilgrim-escort');
      const e = ms.escort;
      if (!e) return { had: false };
      e.npcSprite.body.reset(e.end.x - 70, e.end.y); // walk the last stretch in
      const t0 = Date.now();
      while (Date.now() - t0 < 7000) {
        ms.playerHealth.shield = 1e9;
        if (ms.chain.status('apu-01-pilgrim-escort') === 'complete') break;
        await new Promise((res) => setTimeout(res, 120));
      }
      return { had: true, status: ms.chain.status('apu-01-pilgrim-escort'), cleaned: ms.escort === undefined };
    });
    ok(
      'escort: convoy arrival completes the beat (and the run cleans up)',
      escDone.had && escDone.status === 'complete' && escDone.cleaned,
      escDone.had ? `status=${escDone.status} cleaned=${escDone.cleaned}` : 'no active escort to finish',
    );

    // 3i. WORLD-RESIDENT PAUSE: an enemy resides in the world whose X-band holds
    // it. Standing in Europe, ZERO foreign residents may tick and ZERO foreign
    // bodies may be enabled; entering a world resumes exactly its own residents.
    // Uses applyWorldSwap directly — the single funnel every travel path shares.
    const pause = await page.evaluate(async () => {
      const ms = window.__ready();
      const bands = Object.entries(ms.worlds).map(([id, w]) => ({ id, x0: w.map.bounds.x, x1: w.map.bounds.x + w.map.bounds.width }));
      const homeOf = (x) => bands.find((b) => x >= b.x0 && x <= b.x1)?.id ?? 'void';
      const arrays = () => [...ms.townsfolk, ...ms.angels, ...ms.demons, ...ms.swarmers, ...ms.cherubs, ...ms.guardians, ...ms.bosses, ms.sasquatch].filter((e) => e && e.isAlive);
      const sample = async () => {
        const updated = new Set();
        const wrapped = [];
        for (const e of arrays()) {
          const proto = Object.getPrototypeOf(e);
          if (proto.__diagWrapped || typeof proto.update !== 'function') continue;
          const orig = proto.update;
          proto.update = function (...args) {
            updated.add(this);
            return orig.apply(this, args);
          };
          proto.__diagWrapped = true;
          wrapped.push([proto, orig]);
        }
        await new Promise((r) => setTimeout(r, 300)); // several frames
        for (const [p, o] of wrapped) {
          p.update = o;
          delete p.__diagWrapped;
        }
        const live = arrays();
        return {
          world: ms.activeWorld,
          foreignTicking: live.filter((e) => updated.has(e) && homeOf(e.sprite.x) !== ms.activeWorld).length,
          foreignBodies: live.filter((e) => e.sprite?.body?.enable && homeOf(e.sprite.x) !== ms.activeWorld).length,
          localTicking: live.filter((e) => updated.has(e) && homeOf(e.sprite.x) === ms.activeWorld).length,
        };
      };
      const inEurope = await sample();
      ms.applyWorldSwap('heaven', ms.worlds['heaven'].defaultArrival);
      await new Promise((r) => setTimeout(r, 400));
      const inHeaven = await sample();
      ms.applyWorldSwap('hell', ms.worlds['hell'].defaultArrival);
      await new Promise((r) => setTimeout(r, 400));
      const inHell = await sample();
      ms.applyWorldSwap('europe', ms.worlds['europe'].defaultArrival);
      await new Promise((r) => setTimeout(r, 400));
      const backEurope = await sample();
      return { inEurope, inHeaven, inHell, backEurope };
    });
    ok(
      'world-resident pause: in Europe, zero foreign residents tick + zero foreign bodies enabled',
      pause.inEurope.world === 'europe' && pause.inEurope.foreignTicking === 0 && pause.inEurope.foreignBodies === 0,
      JSON.stringify(pause.inEurope),
    );
    ok(
      'world-resident pause: Heaven entry resumes Michael + the cherubs (and only them)',
      pause.inHeaven.world === 'heaven' && pause.inHeaven.localTicking >= 7 && pause.inHeaven.foreignTicking === 0 && pause.inHeaven.foreignBodies === 0,
      JSON.stringify(pause.inHeaven),
    );
    ok(
      'world-resident pause: Hell entry resumes the demons + the Sin (and only them)',
      pause.inHell.world === 'hell' && pause.inHell.localTicking >= 7 && pause.inHell.foreignTicking === 0 && pause.inHell.foreignBodies === 0,
      JSON.stringify(pause.inHell),
    );
    ok(
      'world-resident pause: returning to Europe re-pauses everyone else',
      pause.backEurope.world === 'europe' && pause.backEurope.foreignTicking === 0 && pause.backEurope.foreignBodies === 0,
      JSON.stringify(pause.backEurope),
    );

    // 3j. STATUS EFFECTS DON'T CROSS WORLDS: take a real tagged caster hit while
    // still in Europe (slow + weaken + an active DoT stack), then travel to Earth
    // — the player must ARRIVE with zero Europe debuffs (clearDots rides every
    // applyWorldSwap, the same path as reset/load/death).
    const seeded = await page.evaluate(async () => {
      const ms = window.__ready(); // alive + healed: a dead player ignores hits by design
      ms.onProjectileHitPlayer(3, 'caster-bolt'); // the same entry point a live bolt uses
      await new Promise((res) => setTimeout(res, 250)); // a control-effects frame → the slow applies
      return { stacks: ms.casterDotStacks.length, slow: ms.player.slowFactor, weakened: ms.time.now < ms.casterWeakenUntil };
    });
    await page.evaluate(() => window.__game.scene.getScene('MainScene').devTravelEarth());
    await page.waitForTimeout(2000);
    const afterEarth = await page.evaluate(() => {
      const ms = window.__game.scene.getScene('MainScene');
      return {
        world: ms.activeWorld,
        live: ms.regionLiveCount(),
        stacks: ms.casterDotStacks.length,
        slow: ms.player.slowFactor,
        weakened: ms.time.now < ms.casterWeakenUntil,
      };
    });
    ok('Europe → Earth return works (and despawns all packs)', afterEarth.world === 'earth' && afterEarth.live === 0, `live=${afterEarth.live}`);
    ok(
      'world travel clears player debuffs: an active DoT does not cross to Earth',
      seeded.stacks > 0 && seeded.slow < 1 && seeded.weakened && afterEarth.stacks === 0 && afterEarth.slow === 1 && !afterEarth.weakened,
      `before: stacks=${seeded.stacks} slow=${seeded.slow} weakened=${seeded.weakened} → after: stacks=${afterEarth.stacks} slow=${afterEarth.slow} weakened=${afterEarth.weakened}`,
    );
  }

  // 3k. DARK-CASTER: a REAL bolt from a live caster lands and applies its full
  // debuff set (move slow + incoming-damage weaken + a stacking-DoT stack).
  // Runs on Earth (the caster is a world-agnostic angel variant).
  const caster = await page.evaluate(async () => {
    const ms = window.__ready(); // alive + shielded: debuffs apply regardless of absorbed damage
    const spot = ms.activeMap().nearestWalkableWorld(ms.player.x + 220, ms.player.y);
    ms.spawnAngel('darkcaster', spot.x, spot.y);
    const t0 = Date.now();
    while (Date.now() - t0 < 9000) {
      await new Promise((res) => setTimeout(res, 250));
      if (ms.player.slowFactor < 1 && ms.casterDotStacks.length > 0) break;
    }
    return {
      slow: ms.player.slowFactor,
      stacks: ms.casterDotStacks.length,
      weakened: ms.time.now < ms.casterWeakenUntil,
      alive: !ms.playerDead,
    };
  });
  ok(
    'dark-caster: a real bolt applies slow + weaken + a DoT stack to its target',
    caster.slow < 1 && caster.stacks > 0 && caster.weakened && caster.alive,
    `slow=${caster.slow} stacks=${caster.stacks} weakened=${caster.weakened}`,
  );

  // 3l. AFRICA RESIDENCY: the X-band residency rule must cover the NEW world —
  // verified, not assumed. An entity relocated into Africa's band stops
  // ticking while the player is elsewhere, resumes on Africa entry, and is
  // fully re-paused (tick + body) on leaving.
  const africaPause = await page.evaluate(async () => {
    const ms = window.__ready();
    if (!ms.worlds['africa']) return { registered: false };
    const spot = ms.activeMap().nearestWalkableWorld(ms.player.x + 260, ms.player.y);
    const a = ms.spawnAngel('darkcaster', spot.x, spot.y); // born on Earth (spawn needs a dense layer)
    const dest = ms.worlds['africa'].defaultArrival;
    // Release the world-bounds clamp first — Earth's physics bounds would snap
    // the body back to Earth's edge on the next step, keeping it an Earth resident.
    a.sprite.setCollideWorldBounds(false);
    a.sprite.body.reset(dest.x + 150, dest.y); // relocate: an AFRICA resident by X-band
    const sample = async () => {
      const proto = Object.getPrototypeOf(a);
      const orig = proto.update;
      let ticked = false;
      proto.update = function (...args) {
        if (this === a) ticked = true;
        return orig.apply(this, args);
      };
      await new Promise((res) => setTimeout(res, 300));
      proto.update = orig;
      return ticked;
    };
    const tickedFromEarth = await sample();
    ms.applyWorldSwap('africa', dest);
    await new Promise((res) => setTimeout(res, 300));
    const tickedInAfrica = await sample();
    const bodyInAfrica = a.sprite.body.enable;
    ms.applyWorldSwap('earth', ms.worlds['earth'].defaultArrival);
    await new Promise((res) => setTimeout(res, 300));
    const tickedAfterLeave = await sample();
    const bodyAfterLeave = a.sprite.body.enable;
    a.destroy();
    return { registered: true, tickedFromEarth, tickedInAfrica, bodyInAfrica, tickedAfterLeave, bodyAfterLeave };
  });
  ok(
    'africa: X-band residency pauses its residents elsewhere and resumes on entry',
    africaPause.registered && !africaPause.tickedFromEarth && africaPause.tickedInAfrica && africaPause.bodyInAfrica && !africaPause.tickedAfterLeave && !africaPause.bodyAfterLeave,
    JSON.stringify(africaPause),
  );

  // 3m. CROSS-WORLD GATE (Egypt ↔ Africa): the first manifest-driven gate pair
  // — the Nile-exit pad on the Egypt map crosses to the Luxor anchor and back.
  const xgate = await page.evaluate(async () => {
    const ms = window.__ready();
    // The CROSS-WORLD pair specifically: the pad that SITS in Egypt and leads
    // to Africa, and the pad that SITS in Africa and leads to Egypt. (Internal
    // Africa gates also carry destWorld 'africa' — position disambiguates.)
    const inWorld = (g, id) => {
      const b = ms.worlds[id].map.bounds;
      return g.x >= b.x && g.x <= b.x + b.width;
    };
    const toAfrica = ms.regionGates.find((g) => g.destWorld === 'africa' && inWorld(g, 'egypt'));
    const toEgypt = ms.regionGates.find((g) => g.destWorld === 'egypt' && inWorld(g, 'africa'));
    if (!toAfrica || !toEgypt) return { found: false };
    ms.applyWorldSwap('egypt', { x: toAfrica.x, y: toAfrica.y + 10 }); // stand on the Egypt pad
    await new Promise((res) => setTimeout(res, 1600)); // past the world-transition cooldown
    if (!ms.cityGateButton.isVisible) return { found: true, shown: false, step: 'egypt pad button never appeared' };
    ms.cityGateAction?.();
    await new Promise((res) => setTimeout(res, 1800)); // fade travel
    const inAfrica = ms.activeWorld === 'africa';
    const dA = Math.hypot(ms.player.x - toAfrica.dest.x, ms.player.y - toAfrica.dest.y);
    ms.player.sprite.body.reset(toEgypt.x, toEgypt.y + 10); // stand on the Africa-side gate
    await new Promise((res) => setTimeout(res, 1600));
    if (!ms.cityGateButton.isVisible) return { found: true, shown: false, step: 'africa gate button never appeared', inAfrica, dA };
    ms.cityGateAction?.();
    await new Promise((res) => setTimeout(res, 1800));
    const backEgypt = ms.activeWorld === 'egypt';
    const dE = Math.hypot(ms.player.x - toEgypt.dest.x, ms.player.y - toEgypt.dest.y);
    return { found: true, shown: true, inAfrica, dA: +dA.toFixed(1), backEgypt, dE: +dE.toFixed(1) };
  });
  ok(
    'cross-world gate: the Egypt ↔ Africa crossing lands both ways',
    xgate.found && xgate.shown && xgate.inAfrica && xgate.dA < 8 && xgate.backEgypt && xgate.dE < 8,
    JSON.stringify(xgate),
  );

  // 3n. GROUND LAYER (sparse worlds): the continents are real — biome ground
  // renders under Rome AND mid-void, the cell cap holds at every zoom, water
  // blocks the void where land ends, FPS at ground zoom stays within tolerance
  // of the pre-ground baseline (~57 headless), and dense hand-built worlds
  // have NO ground layer.
  const groundRun = await page.evaluate(async () => {
    const ms = window.__ready();
    const game = window.__game;
    ms.devTravelEurope();
    await new Promise((res) => setTimeout(res, 2400));
    const gl = ms.groundLayers.get('europe');
    if (!gl) return { has: false };
    const rome = { cells: gl.cellsDrawn, cls: gl.classAtWorld(ms.player.x, ms.player.y) };
    // Mid-void: hop inland NE of Rome (land void, no chunk beneath).
    ms.player.sprite.body.reset(ms.player.x + 5000, ms.player.y - 5000);
    await new Promise((res) => setTimeout(res, 600));
    const midVoid = { cells: gl.cellsDrawn, offChunk: ms.activeMap().terrainAtWorld(ms.player.x, ms.player.y) === null };
    // Water blocking: scan west from Rome's arrival for the Tyrrhenian coast.
    const romeArrival = ms.regionZoneArrivals['rome-eternal-seat'];
    let landX = null;
    let waterX = null;
    for (let i = 1; i <= 80 && waterX === null; i++) {
      const x = romeArrival.x - i * 400;
      if (gl.classAtWorld(x, romeArrival.y) === 0) {
        waterX = x;
        landX = x + 400;
      }
    }
    const waterBlocks = waterX !== null && ms.activeMap().isBlockedAtWorld(waterX, romeArrival.y) === true && ms.activeMap().isBlockedAtWorld(landX, romeArrival.y) === false;
    // Cell cap at full zoom-out (the whole continent in frame).
    ms.zoomControls.target = ms.zoomControls.outLimit;
    await new Promise((res) => setTimeout(res, 1800));
    const zoomedOutCells = gl.cellsDrawn;
    ms.zoomControls.target = 1;
    await new Promise((res) => setTimeout(res, 1500));
    // FPS at ground zoom, standing at Rome — SELF-RELATIVE baseline: the same
    // frames with the ground layer hidden vs shown (robust to session depth
    // and headless-GPU variance, unlike an absolute number).
    ms.player.sprite.body.reset(romeArrival.x, romeArrival.y);
    gl.g.setVisible(false);
    await new Promise((res) => setTimeout(res, 2800));
    const fpsBaseline = +game.loop.actualFps.toFixed(1);
    gl.g.setVisible(true);
    await new Promise((res) => setTimeout(res, 2800));
    const fpsGround = +game.loop.actualFps.toFixed(1);
    const denseClean = ['earth', 'egypt', 'heaven', 'hell', 'city-faiyum'].every((id) => !ms.groundLayers.has(id));
    return { has: true, rome, midVoid, coastFound: waterX !== null, waterBlocks, groundCells: gl.cellsDrawn, zoomedOutCells, fpsBaseline, fpsGround, denseClean };
  });
  ok('ground: biome land renders under Rome', groundRun.has && groundRun.rome.cells > 0 && groundRun.rome.cls > 0, groundRun.has ? `cells=${groundRun.rome.cells} class=${groundRun.rome.cls}` : 'no europe ground layer');
  ok('ground: still renders mid-void (no chunk beneath)', groundRun.has && groundRun.midVoid.cells > 0 && groundRun.midVoid.offChunk, groundRun.has ? JSON.stringify(groundRun.midVoid) : '');
  ok(
    'ground: the cell cap holds at ground zoom AND full zoom-out',
    groundRun.has && groundRun.groundCells > 0 && groundRun.groundCells <= 9000 && groundRun.zoomedOutCells > 0 && groundRun.zoomedOutCells <= 9000,
    `ground=${groundRun.groundCells} zoomedOut=${groundRun.zoomedOutCells} cap=9000`,
  );
  ok('ground: water is impassable void ground (the Tyrrhenian coast blocks)', groundRun.has && groundRun.coastFound && groundRun.waterBlocks, `coastFound=${groundRun.coastFound} blocks=${groundRun.waterBlocks}`);
  ok(
    'ground: FPS at ground zoom within tolerance of the no-ground baseline',
    groundRun.has && groundRun.fpsGround >= groundRun.fpsBaseline * 0.8,
    `ground=${groundRun.fpsGround} baseline=${groundRun.fpsBaseline} (tolerance ≥ 80%)`,
  );
  ok('ground: dense hand-built worlds have NO ground layer', groundRun.has && groundRun.denseClean, 'earth/egypt/heaven/hell/faiyum clean');

  // 3o. CAIRO ACT I (the Wizard's home chain, live in the hand-built Egypt
  // world): cai-01..04 complete END TO END via real play actions — the
  // Keeper's proximity talk, five delta-wolf kills, the rot-site walk-in, the
  // gate-boss kill. Setup mirrors a fresh Wizard start (chain wiped + class
  // announced — the same state the fresh-start checks prove clean); Faiyum and
  // the Egypt terrain must be intact afterwards (the binding is additive-only).
  const cairo = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((res) => setTimeout(res, t));
    ms.devClassOverride = 'Wizard'; // the chain is Wizard-gated (Wizard ≠ Mage, canon)
    ms.announcePlayerClass();
    // Fresh-chain precondition: earlier checks leave auto-activated beats live,
    // and accept() refuses while ANY quest is active. A wiped chain is exactly
    // the fresh-start state; nothing auto-starts from it (cai-01 is manual).
    ms.chain.load({ completed: [], activeId: null, activeObjective: 0 });
    ms.applyWorldSwap('egypt', ms.worlds['egypt'].defaultArrival);
    await wait(1700);
    // cai-01 — stand before the Keeper; the talk button must offer itself.
    ms.player.sprite.body.reset(ms.cairoMentorPos.x + 50, ms.cairoMentorPos.y);
    await wait(500);
    const mentorButton = ms.cairoMentorButton.isVisible;
    ms.cairoMentorTalk();
    await wait(300);
    const s1 = ms.chain.status('cai-01-mentor');
    // cai-02 — five REAL delta-wolf deaths, swept through the shared clear path.
    const wolves = ms.cairoLive.filter((r) => !r.bossBeatId && r.entity.isAlive).slice(0, 5);
    for (const w of wolves) w.entity.takeHit(999999);
    await wait(700);
    const s2 = ms.chain.status('cai-02-first-blood');
    // cai-03 — walk onto the rot site on the river road.
    ms.player.sprite.body.reset(ms.cairoDiscoveryPos.x, ms.cairoDiscoveryPos.y);
    await wait(700);
    const s3 = ms.chain.status('cai-03-discovery');
    // cai-04 — fell the boosted scout at the city gates.
    const boss = ms.cairoLive.find((r) => r.bossBeatId && r.entity.isAlive);
    if (boss) boss.entity.takeHit(999999);
    await wait(700);
    const s4 = ms.chain.status('cai-04-first-evil');
    // Additive-only proof: Faiyum still registered, the Egypt terrain still real.
    const faiyumIntact = !!ms.cityRuntimes['city-faiyum'] && !!ms.worlds['city-faiyum'];
    const egyptIntact = ms.egyptMap.terrainAtWorld(ms.egyptArrivalPos.x, ms.egyptArrivalPos.y) !== null;
    ms.devClassOverride = null;
    ms.announcePlayerClass();
    return { mentorButton, wolves: wolves.length, s1, s2, s3, s4, faiyumIntact, egyptIntact };
  });
  ok(
    'cairo act i: cai-01..04 complete end to end by hand in the Egypt world',
    cairo.mentorButton && cairo.wolves === 5 && cairo.s1 === 'complete' && cairo.s2 === 'complete' && cairo.s3 === 'complete' && cairo.s4 === 'complete' && cairo.faiyumIntact && cairo.egyptIntact,
    JSON.stringify(cairo),
  );

  // 4) THE GATE: zero page errors across everything above.
  ok('zero page errors during boot + travel', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));
} finally {
  await browser?.close();
  kill();
}

const passed = results.filter(Boolean).length;
console.log(`\n${passed}/${results.length} runtime checks passed`);
if (passed !== results.length) process.exit(1);

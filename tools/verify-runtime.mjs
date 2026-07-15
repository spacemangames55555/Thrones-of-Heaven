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
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
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
  // HARNESS HELPERS registered on EVERY navigation (init script), so checks that
  // run mid-loop (fresh sessions) can use them too. The post-loop evaluate below
  // re-defines the same helpers — identical behavior, kept for readability.
  await page.addInitScript(() => {
    window.__ready = () => {
      const ms = window.__game.scene.getScene('MainScene');
      if (ms.playerDead) ms.respawnPlayer();
      ms.playerHealth.full();
      ms.playerHealth.shield = 1e9;
      return ms;
    };
    window.__quietSpot = () => {
      const ms = window.__ready();
      for (let i = 1; i <= 40; i++) {
        const x = ms.player.x + (i % 2 ? 1 : -1) * i * 380;
        const y = ms.player.y + ((i % 3) - 1) * 320;
        const w = ms.activeMap().nearestWalkableWorld(x, y);
        if (w && ms.combatEnemiesInRange(w.x, w.y, 800).length === 0) {
          ms.player.sprite.body.reset(w.x, w.y);
          return true;
        }
      }
      return false;
    };
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

  // 1b. THE SELECT SCREEN IS THE REAL DOOR (permanent): the fresh-start loop below
  // starts classes PROGRAMMATICALLY, so a missing select card could ship while every
  // check passed (exactly how the Druid card went missing from the live deploy).
  // This check drives the REAL UI: the select screen must list exactly one card per
  // REGISTERED class, and CLICKING each card must start MainScene as that class.
  const registeredIds = await (async () => {
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
    await page.waitForFunction(() => !!window.__game && window.__game.scene.isActive('TitleScene'), { timeout: 25000 });
    return page.evaluate(() => Object.keys(window.__game.scene.getScene('MainScene').classSkillsAll));
  })();
  const startedIds = [];
  let selectCards = -1;
  for (let i = 0; i < registeredIds.length; i++) {
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
    await page.waitForFunction(() => !!window.__game && window.__game.scene.isActive('TitleScene'), { timeout: 25000 });
    await page.evaluate(() => {
      localStorage.clear();
      window.__game.scene.getScene('TitleScene').scene.start('CharacterSelectScene');
    });
    await page.waitForTimeout(600);
    const cards = await page.evaluate(() => {
      const sc = window.__game.scene.getScene('CharacterSelectScene');
      return sc.children.list
        .filter((o) => o.type === 'Rectangle' && o.input && o.input.enabled)
        .map((r) => ({ x: r.x, y: r.y + r.displayHeight / 2 }))
        .sort((a, b) => a.y - b.y);
    });
    selectCards = cards.length;
    if (i >= cards.length) break; // fewer cards than classes → the assert below fails loudly
    await page.mouse.click(cards[i].x, cards[i].y); // the REAL door: a pointer tap on the card
    await page.waitForFunction(() => window.__game.scene.isActive('MainScene'), { timeout: 25000 });
    await page.waitForTimeout(1200);
    startedIds.push(await page.evaluate(() => window.__game.scene.getScene('MainScene').classId));
  }
  ok(
    'select screen: one card per registered class; each card CLICK starts its class (real UI path)',
    selectCards === registeredIds.length && startedIds.length === registeredIds.length && registeredIds.every((id) => startedIds.includes(id)),
    `cards=${selectCards} registered=[${registeredIds.join(',')}] started=[${startedIds.join(',')}]`,
  );

  // 1c. PRE-RULING SAVE LOADS UNCHANGED (permanent): a v12 save (a Necromancer
  // mid-WA, from before the class-home-starts ruling) must load EXACTLY where it
  // was — never relocated to the class home. Crafted from a real session's save
  // with its version wound back, then loaded through the real 'continue' path.
  const preRuling = await (async () => {
    await newGame('necromancer');
    const staged = await page.evaluate(() => {
      const ms = window.__game.scene.getScene('MainScene');
      // Stand mid-WA on Earth (the pre-ruling life), then write a REAL save.
      const spawn = ms.worlds['earth'].defaultArrival;
      const spot = ms.worlds['earth'].map.nearestWalkableWorld(spawn.x + 400, spawn.y + 120);
      ms.applyWorldSwap('earth', spot);
      ms.writeSave();
      const raw = JSON.parse(localStorage.getItem('toh_save'));
      raw.saveVersion = 12; // wind back: this save predates the ruling
      localStorage.setItem('toh_save', JSON.stringify(raw));
      return spot;
    });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
    await page.waitForFunction(() => !!window.__game && window.__game.scene.isActive('TitleScene'), { timeout: 25000 });
    await page.evaluate(() => window.__game.scene.getScene('TitleScene').scene.start('MainScene', { mode: 'continue' }));
    await page.waitForFunction(() => window.__game.scene.isActive('MainScene'), { timeout: 25000 });
    await page.waitForTimeout(1500);
    return page.evaluate((spot) => {
      const ms = window.__game.scene.getScene('MainScene');
      return { world: ms.activeWorld, classId: ms.classId, d: Math.hypot(ms.player.x - spot.x, ms.player.y - spot.y) };
    }, staged);
  })();
  ok(
    'pre-ruling save: a v12 Necromancer mid-WA loads exactly where it was (never relocated)',
    preRuling.world === 'earth' && preRuling.classId === 'necromancer' && preRuling.d < 8,
    JSON.stringify(preRuling),
  );

  // 2) CLASS HOME STARTS (Casey's ruling) + the fresh-start guard: every playable
  //    class fresh-starts at its correct HOME (world + beside the mentor), the
  //    home opener is AVAILABLE (manual — nothing auto-starts) and acceptable
  //    immediately through the real mentor/giver UI path. The Druid keeps the
  //    UNCHANGED WA start. Druid runs LAST: the WA-opening check below plays on
  //    in ITS session.
  const HOMES = {
    blacksmith: { world: 'globe', zone: 'munich-anvil-hold', opener: 'mun-01-mentor', kind: 'region' },
    wizard: { world: 'egypt', zone: 'cairo-nile-crown', opener: 'cai-01-mentor', kind: 'cairo' },
    necromancer: { world: 'globe', zone: 'murmansk-bone-harbor', opener: 'mur-01-mentor', kind: 'region' },
    mage: { world: 'globe', zone: 'moscow-crystal-court', opener: 'mos-01-mentor', kind: 'region' },
    druid: { world: 'earth', zone: null, opener: 'honest-days-work', kind: 'earth' },
  };
  for (const cls of ['blacksmith', 'wizard', 'necromancer', 'mage', 'druid']) {
    await newGame(cls);
    const home = HOMES[cls];
    const s = await page.evaluate(
      async ({ home }) => {
        const ms = window.__game.scene.getScene('MainScene');
        const wait = (t) => new Promise((r) => setTimeout(r, t));
        ms.playerHealth.shield = 1e9; // home-city packs may engage during the check
        const out = { world: ms.activeWorld, active: ms.chain.activeQuest?.id ?? null };
        if (home.kind === 'region') {
          const m = ms.regionMentors.find((x) => x.zoneId === home.zone);
          out.mentorDist = m ? Math.hypot(m.pos.x - ms.player.x, m.pos.y - ms.player.y) : -1;
          out.openerBefore = ms.chain.status(home.opener);
          if (m) {
            ms.player.sprite.body.reset(m.pos.x + 40, m.pos.y); // step up to the elder
            await wait(500);
            out.button = ms.mentorButton.isVisible;
            ms.regionMentorTalk(); // the button's real handler (accept + complete)
            await wait(300);
            out.openerAfter = ms.chain.status(home.opener);
          }
        } else if (home.kind === 'cairo') {
          out.mentorDist = Math.hypot(ms.cairoMentorPos.x - ms.player.x, ms.cairoMentorPos.y - ms.player.y);
          out.openerBefore = ms.chain.status(home.opener);
          ms.player.sprite.body.reset(ms.cairoMentorPos.x + 50, ms.cairoMentorPos.y);
          await wait(500);
          out.button = ms.cairoMentorButton.isVisible;
          ms.cairoMentorTalk(); // the Keeper's real handler
          await wait(300);
          out.openerAfter = ms.chain.status(home.opener);
        } else {
          // 'earth' (the Druid): the UNCHANGED WA start — at the Enumclaw town
          // spawn with the Act I opener's giver in sight, quest offered on talk.
          out.spawnDist = Math.hypot(ms.town.spawn.x - ms.player.x, ms.town.spawn.y - ms.player.y);
          const giver = ms.questGivers.find((g) => g.questIds.includes(home.opener));
          const gp = giver ? giver.pos() : null;
          out.mentorDist = gp ? Math.hypot(gp.x - ms.player.x, gp.y - ms.player.y) : -1;
          out.openerBefore = ms.chain.status(home.opener);
          if (giver) ms.openQuestGiverDialogue(giver); // the giver's real dialogue path
        }
        return out;
      },
      { home },
    );
    if (home.kind === 'earth') {
      // Tap through the offer dialogue (taps advance/close; accept fires on close).
      for (let i = 0; i < 10; i++) {
        await page.waitForTimeout(280);
        if (!(await page.evaluate(() => window.__game.scene.getScene('MainScene').dialogue.isOpen()))) break;
        await page.mouse.click(214, 520);
      }
      s.openerAfter = await page.evaluate((id) => window.__game.scene.getScene('MainScene').chain.status(id), home.opener);
      s.button = true; // the giver dialogue IS the earth path's interaction proof
    }
    const openerDone = home.kind === 'earth' ? s.openerAfter === 'active' : s.openerAfter === 'complete';
    const atHome = home.kind === 'earth' ? s.spawnDist < 8 : true;
    ok(
      `home start (${cls}): lands at ${home.world} home beside the mentor; opener manual + immediately acceptable`,
      s.world === home.world && s.active === null && atHome && s.mentorDist >= 0 && s.mentorDist < 400 && s.openerBefore === 'available' && s.button === true && openerDone,
      JSON.stringify(s),
    );

    // 2m. EVERY MAGE COMMIT-1 EXTENSION THROUGH A REAL MAGE SKILL, in the live
    // Mage session: Wormhole Rift (teleport + origin portal), Crystal Strike →
    // Crystal Shatter (stacks banked then detonated), Entangled Chains (binding),
    // and Arcane Missiles (seeking bolts hit a foe 90° off the firing line).
    if (cls === 'mage') {
      const mageKit = await page.evaluate(async () => {
        const ms = window.__ready();
        const wait = (t) => new Promise((r) => setTimeout(r, t));
        if (!window.__quietSpot()) return { setup: 'no quiet spot' };
        const spawnAt = (dx, dy) => {
          const w = ms.activeMap().nearestWalkableWorld(ms.player.x + dx, ms.player.y + dy);
          return ms.spawnAngel('darkcaster', w.x, w.y);
        };
        // Wormhole Rift: move + a portal hazard left at the origin.
        const from = { x: ms.player.x, y: ms.player.y };
        ms.player.facingX = 1;
        ms.player.facingY = 0;
        ms.runActiveSkill('mage_wormhole');
        const wormMoved = Math.hypot(ms.player.x - from.x, ms.player.y - from.y);
        const h = ms.spellHazards[ms.spellHazards.length - 1];
        const portal = h ? Math.hypot(h.x - from.x, h.y - from.y) < 5 : false;
        // Crystal Strike banks a stack; Crystal Shatter detonates it.
        const a = spawnAt(60, 0);
        await wait(200);
        ms.player.facingX = a.x >= ms.player.x ? 1 : -1;
        ms.player.facingY = 0;
        ms.runActiveSkill('mage_crystal_strike');
        await wait(100);
        const stacks = ms.crystallize.get(a) ?? 0;
        const hpA = a.health.current;
        ms.runActiveSkill('mage_shatter');
        await wait(100);
        const shattered = hpA - a.health.current > 0 && !ms.crystallize.has(a);
        // Entangled Chains binds the cluster.
        const b = spawnAt(140, 60);
        const c = spawnAt(140, -60);
        await wait(200);
        ms.runActiveSkill('mage_entangle');
        const bound = ms.entangled ? ms.entangled.members.length : 0;
        ms.clearEntangle();
        a.destroy();
        b.destroy();
        c.destroy();
        // Arcane Missiles: a lone foe due NORTH, fired due EAST — homing must connect.
        const wN = ms.activeMap().nearestWalkableWorld(ms.player.x, ms.player.y - 220);
        const foe = ms.spawnAngel('darkcaster', wN.x, wN.y);
        await wait(200);
        ms.player.facingX = 1;
        ms.player.facingY = 0;
        const hp0 = foe.health.current;
        ms.runActiveSkill('mage_missiles');
        const t0 = Date.now();
        let drop = 0;
        while (Date.now() - t0 < 2500) {
          await wait(120);
          drop = hp0 - foe.health.current;
          if (drop > 0) break;
        }
        foe.destroy();
        ms.crystallize.clear();
        ms.playerHealth.full();
        return { setup: 'ok', wormMoved, portal, stacks, shattered, bound, drop };
      });
      ok(
        'mage: every framework extension fires through a real Mage skill',
        mageKit.setup === 'ok' && mageKit.wormMoved > 120 && mageKit.portal && mageKit.stacks === 1 && mageKit.shattered && mageKit.bound >= 2 && mageKit.drop > 0,
        JSON.stringify(mageKit),
      );

      // 2n. MAGE POLISH (permanent): Encapsulation is a TOGGLE (no timer; the exit
      // cast is never cooldown-gated; the bonus tracks the state), and the strike
      // primitive spawns exactly ONE pooled swing arc per pulse with its cap held
      // under rapid Flurry spam. Runs through the REAL activation path (unlock →
      // activateSkill), in the live Mage session.
      const polish = await page.evaluate(async () => {
        const ms = window.__ready();
        const wait = (t) => new Promise((r) => setTimeout(r, t));
        const defs = ms.classSkillsAll['mage'].skills;
        ms.skills.awardPoints(2);
        ms.skills.unlock(defs.find((d) => d.id === 'mage_cb_shard'));
        ms.skills.unlock(defs.find((d) => d.id === 'mage_cb_encapsulation'));
        const dmg0 = ms.combinedSkillMods().damageMult ?? 0;
        ms.activateSkill('mage_cb_encapsulation'); // ENTER via the real button path
        const entry = ms.skillTimed.find((t) => t.id === 'mage_cb_encapsulation');
        const noTimer = !!entry && !Number.isFinite(entry.endsAt);
        const dmgOn = (ms.combinedSkillMods().damageMult ?? 0) - dmg0;
        await wait(400); // must NOT expire on its own
        const stillOn = ms.skillTimed.some((t) => t.id === 'mage_cb_encapsulation');
        ms.activateSkill('mage_cb_encapsulation'); // EXIT — allowed despite the entry cooldown
        const off = !ms.skillTimed.some((t) => t.id === 'mage_cb_encapsulation');
        const dmgOff = (ms.combinedSkillMods().damageMult ?? 0) - dmg0;
        // SWING FX: exactly one arc per strike pulse; the pool cap holds under spam.
        const t1 = ms.swingFx.spawnedTotal;
        ms.runComposedSteps([{ p: 'strike', at: 'front', range: 70, damageRaw: 1, tint: 0xbfe0ff }]);
        const single = ms.swingFx.spawnedTotal - t1;
        const t2 = ms.swingFx.spawnedTotal;
        ms.runActiveSkill('mage_crystal_flurry'); // 3 pulses (0/130/260ms)
        await wait(600);
        const perPulse = ms.swingFx.spawnedTotal - t2;
        for (let i = 0; i < 20; i++) ms.runActiveSkill('mage_crystal_flurry'); // 60 arcs requested at once
        await wait(700);
        const capHeld = ms.swingFx.size <= 16 && ms.swingFx.activeCount <= 16;
        return { noTimer, dmgOn: +dmgOn.toFixed(2), stillOn, off, dmgOff: +dmgOff.toFixed(2), single, perPulse, poolSize: ms.swingFx.size, capHeld };
      });
      ok(
        'mage polish: Encapsulation toggles on/off with no timer; its bonus tracks the state',
        polish.noTimer && polish.dmgOn === 0.35 && polish.stillOn && polish.off && polish.dmgOff === 0,
        JSON.stringify(polish),
      );
      ok(
        'mage polish: one pooled swing arc per strike pulse; the FX cap holds under Flurry spam',
        polish.single === 1 && polish.perPulse === 3 && polish.capHeld,
        JSON.stringify(polish),
      );
    }
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
    // __quietSpot(): relocate the player to a walkable spot with NO combat enemy
    // within 800px — the shared isolation precondition for the combat-primitive checks.
    window.__quietSpot = () => {
      const ms = window.__ready();
      for (let i = 1; i <= 40; i++) {
        const x = ms.player.x + (i % 2 ? 1 : -1) * i * 380;
        const y = ms.player.y + ((i % 3) - 1) * 320;
        const w = ms.activeMap().nearestWalkableWorld(x, y);
        if (w && ms.combatEnemiesInRange(w.x, w.y, 800).length === 0) {
          ms.player.sprite.body.reset(w.x, w.y);
          return true;
        }
      }
      return false;
    };
  });

  // 2b. THE WA OPENING PLAYS FOR A REAL DRUID: the fresh-start loop above ended on a
  // live Druid run whose forced first pick (the probe's card click) chose one of the
  // three tree openers. The pick must be unlocked + equipped (needsFirstSkill now
  // false), and THE PICKED SKILL must win the opening Sasquatch fight through the
  // real activation path.
  const druidOpening = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    const classId = ms.classId;
    const needs = ms.skills.needsFirstSkill();
    const starter = ms.skills.loadout().filter(Boolean)[0] ?? null;
    const openers = ['dru_tap_mantis', 'dru_res_lye', 'dru_wk_chill']; // the three tier-0 damaging actives
    const starterDef = ms.classSkillsAll['druid'].skills.find((d) => d.id === starter);
    const action = starterDef && starterDef.effect.kind === 'active' ? starterDef.effect.action : null;
    const sas = ms.sasquatch;
    if (!sas || !sas.isAlive || !action) return { classId, needs, starter, fought: false };
    ms.player.sprite.body.reset(sas.x - 50, sas.y); // stand beside it, facing right
    ms.player.facingX = 1;
    ms.player.facingY = 0;
    let casts = 0;
    while (sas.isAlive && casts < 40) {
      ms.runActiveSkill(action); // whichever opener was picked (cooldown bypassed; same code path)
      casts++;
      await wait(220); // flurry pulses / bolt travel
      ms.playerHealth.full();
      ms.playerHealth.shield = 1e9;
    }
    return { classId, needs, starter, isOpener: openers.includes(starter), fought: true, casts, defeated: !sas.isAlive };
  });
  ok(
    'druid: WA opening plays — the forced first pick wins the Sasquatch fight',
    druidOpening.classId === 'druid' && druidOpening.needs === false && druidOpening.isOpener === true && druidOpening.fought && druidOpening.defeated,
    JSON.stringify(druidOpening),
  );

  // 2c. EVERY COMMIT-1 EXTENSION THROUGH A REAL DRUID SKILL: stealth (Snow Leopard),
  // the dual-use bolt (Lye, heal path), both friendly zones (Sage Burn mobile +
  // Healing Spores static), chain (Lightning Strike across two foes), the pair
  // summon (Chimpanzee Pair) and the untargetable timed summons (Scavengers).
  const druidKit = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!window.__quietSpot()) return { setup: 'no quiet spot' };
    // Stealth via the real skill.
    ms.runActiveSkill('dru_stealth');
    const stealth = ms.playerStealthActive;
    ms.breakPlayerStealth();
    // Lye's heal path (no enemy in range → mend self).
    ms.playerHealth.current = Math.max(1, ms.playerHealth.max - 50);
    const hp0 = ms.playerHealth.current;
    ms.runActiveSkill('dru_lye');
    const lyeHealed = ms.playerHealth.current - hp0;
    // Both friendly-zone variants.
    ms.runActiveSkill('dru_sage_burn'); // mobile (follows)
    ms.runActiveSkill('dru_spores'); // static
    const zones = ms.friendlyZones.map((z) => z.follow);
    // Chain via Lightning Strike across two real foes.
    const w1 = ms.activeMap().nearestWalkableWorld(ms.player.x + 150, ms.player.y);
    const f1 = ms.spawnAngel('darkcaster', w1.x, w1.y);
    const w2 = ms.activeMap().nearestWalkableWorld(ms.player.x + 300, ms.player.y);
    const f2 = ms.spawnAngel('darkcaster', w2.x, w2.y);
    await wait(250);
    const h1 = f1.health.current;
    const h2 = f2.health.current;
    ms.runActiveSkill('dru_lightning');
    await wait(150);
    const chainPrims = ms.lastComposedPrimitives.join(',');
    const chained = h1 - f1.health.current > 0 && h2 - f2.health.current > 0;
    f1.destroy();
    f2.destroy();
    // Summon variants via the real skills.
    ms.summons.clear();
    ms.runActiveSkill('dru_chimp_pair');
    const chimps = ms.summons.list.filter((s) => s.config.key === 'druid_chimpanzee').length;
    ms.runActiveSkill('dru_scavengers');
    const scavs = ms.summons.list.filter((s) => s.config.key === 'druid_scavenger');
    const scavengers = scavs.length;
    const scavUntargetable = scavs.length > 0 && scavs.every((s) => !s.drawsAggro);
    // Clean up everything this check armed.
    ms.summons.clear();
    ms.clearFriendlyZones();
    ms.breakPlayerStealth();
    ms.playerHealth.full();
    return { setup: 'ok', stealth, lyeHealed, zones, chainPrims, chained, chimps, scavengers, scavUntargetable };
  });
  ok(
    'druid: every framework extension fires through a real Druid skill',
    druidKit.setup === 'ok' &&
      druidKit.stealth &&
      druidKit.lyeHealed === 24 &&
      JSON.stringify(druidKit.zones) === '[true,false]' &&
      druidKit.chainPrims === 'chain' &&
      druidKit.chained &&
      druidKit.chimps === 2 &&
      druidKit.scavengers === 3 &&
      druidKit.scavUntargetable,
    JSON.stringify(druidKit),
  );

  // 3) The GLOBE sparse world (Europe + Africa consolidated at true Earth
  // positions): travel, chunks, gates. The region SHIPPED — if the world
  // failed to register, that is a loud FAIL, never a silent skip.
  const hasGlobe = await page.evaluate(() => !!window.__game.scene.getScene('MainScene').worlds['globe']);
  ok('globe: sparse world registered (permanent since the consolidation)', hasGlobe, hasGlobe ? '37 built zones expected' : 'setupGlobe registered no world — every globe check below is unrunnable');
  if (hasGlobe) {
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
    ok('globe: travel lands on a rendered chunk (Rome)', r.world === 'globe' && r.chunks >= 1 && r.onChunk, `chunks=${r.chunks}`);
    ok('globe: gates exist and come in pairs (both directions)', r.gates >= 2 && r.gates % 2 === 0, `${r.gates} gates`);
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
    ok('globe: a real gate crossing lands', crossed.shown && crossed.d < 8, crossed.shown ? `d=${crossed.d.toFixed(1)}` : crossed.reason);

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
    ok('globe: entering a chunk materializes its spawns', liveAt > 0, `${liveAt} live in zone 1`);
    // ...and leaving despawns them (teleport deep into the void, past hysteresis).
    const liveAfterLeave = await page.evaluate(async () => {
      const ms = window.__ready();
      ms.player.sprite.body.reset(ms.player.x + 6000, ms.player.y + 6000);
      await new Promise((res) => setTimeout(res, 900));
      return ms.regionLiveCount();
    });
    ok('globe: leaving a chunk despawns/pools its enemies', liveAfterLeave === 0, `${liveAfterLeave} live after leaving`);

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
    ok('globe: kills increment the active clear objective to completion', clear.spawned >= 5 && clear.status === 'complete', `spawned=${clear.spawned} status=${clear.status}`);

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
    ok(`globe: live-enemy cap holds across a 3-chunk crossing (peak ${capRun.peak})`, capRun.zones === 3 && capRun.peak > 0 && capRun.peak <= 48, `zones=${capRun.zones} peak=${capRun.peak} cap=48`);

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
    // it. Standing in the globe world, ZERO foreign residents may tick and ZERO
    // foreign bodies may be enabled; entering a world resumes exactly its own
    // residents. applyWorldSwap directly — the funnel every travel path shares.
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
      const inGlobe = await sample();
      ms.applyWorldSwap('heaven', ms.worlds['heaven'].defaultArrival);
      await new Promise((r) => setTimeout(r, 400));
      const inHeaven = await sample();
      ms.applyWorldSwap('hell', ms.worlds['hell'].defaultArrival);
      await new Promise((r) => setTimeout(r, 400));
      const inHell = await sample();
      ms.applyWorldSwap('globe', ms.worlds['globe'].defaultArrival);
      await new Promise((r) => setTimeout(r, 400));
      const backGlobe = await sample();
      return { inGlobe, inHeaven, inHell, backGlobe };
    });
    ok(
      'world-resident pause: in the globe world, zero foreign residents tick + zero foreign bodies enabled',
      pause.inGlobe.world === 'globe' && pause.inGlobe.foreignTicking === 0 && pause.inGlobe.foreignBodies === 0,
      JSON.stringify(pause.inGlobe),
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
      'world-resident pause: returning to the globe world re-pauses everyone else',
      pause.backGlobe.world === 'globe' && pause.backGlobe.foreignTicking === 0 && pause.backGlobe.foreignBodies === 0,
      JSON.stringify(pause.backGlobe),
    );

    // 3j. STATUS EFFECTS DON'T CROSS WORLDS: take a real tagged caster hit while
    // still in the globe world (slow + weaken + an active DoT stack), then travel
    // to Earth — the player must ARRIVE with zero debuffs (clearDots rides every
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
    ok('globe → Earth return works (and despawns all packs)', afterEarth.world === 'earth' && afterEarth.live === 0, `live=${afterEarth.live}`);
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

  // 3l. GLOBE RESIDENCY: the X-band residency rule must cover the consolidated
  // world — verified, not assumed. An entity relocated into the globe's band
  // stops ticking while the player is elsewhere, resumes on globe entry, and
  // is fully re-paused (tick + body) on leaving.
  const africaPause = await page.evaluate(async () => {
    const ms = window.__ready();
    if (!ms.worlds['globe']) return { registered: false };
    const spot = ms.activeMap().nearestWalkableWorld(ms.player.x + 260, ms.player.y);
    const a = ms.spawnAngel('darkcaster', spot.x, spot.y); // born on Earth (spawn needs a dense layer)
    const dest = ms.worlds['globe'].defaultArrival;
    // Release the world-bounds clamp first — Earth's physics bounds would snap
    // the body back to Earth's edge on the next step, keeping it an Earth resident.
    a.sprite.setCollideWorldBounds(false);
    a.sprite.body.reset(dest.x + 150, dest.y); // relocate: a GLOBE resident by X-band
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
    ms.applyWorldSwap('globe', dest);
    await new Promise((res) => setTimeout(res, 300));
    const tickedInGlobe = await sample();
    const bodyInGlobe = a.sprite.body.enable;
    ms.applyWorldSwap('earth', ms.worlds['earth'].defaultArrival);
    await new Promise((res) => setTimeout(res, 300));
    const tickedAfterLeave = await sample();
    const bodyAfterLeave = a.sprite.body.enable;
    a.destroy();
    return { registered: true, tickedFromEarth, tickedInGlobe, bodyInGlobe, tickedAfterLeave, bodyAfterLeave };
  });
  ok(
    'globe: X-band residency pauses its residents elsewhere and resumes on entry',
    africaPause.registered && !africaPause.tickedFromEarth && africaPause.tickedInGlobe && africaPause.bodyInGlobe && !africaPause.tickedAfterLeave && !africaPause.bodyAfterLeave,
    JSON.stringify(africaPause),
  );

  // 3m. CROSS-WORLD GATE (Egypt ↔ Luxor): the manifest-driven gate pair — the
  // Nile-exit pad on the Egypt map crosses to Luxor's TRUE globe position and
  // back, landing ~0 px from each dest.
  const xgate = await page.evaluate(async () => {
    const ms = window.__ready();
    // The CROSS-WORLD pair specifically: the pad that SITS in Egypt and leads
    // to the globe, and the pad that SITS in the globe and leads to Egypt.
    // (Internal globe gates also carry destWorld 'globe' — position picks.)
    const inWorld = (g, id) => {
      const b = ms.worlds[id].map.bounds;
      return g.x >= b.x && g.x <= b.x + b.width;
    };
    const toGlobe = ms.regionGates.find((g) => g.destWorld === 'globe' && inWorld(g, 'egypt'));
    const toEgypt = ms.regionGates.find((g) => g.destWorld === 'egypt' && inWorld(g, 'globe'));
    if (!toGlobe || !toEgypt) return { found: false };
    ms.applyWorldSwap('egypt', { x: toGlobe.x, y: toGlobe.y + 10 }); // stand on the Egypt pad
    await new Promise((res) => setTimeout(res, 1600)); // past the world-transition cooldown
    if (!ms.cityGateButton.isVisible) return { found: true, shown: false, step: 'egypt pad button never appeared' };
    ms.cityGateAction?.();
    await new Promise((res) => setTimeout(res, 1800)); // fade travel
    const inGlobe = ms.activeWorld === 'globe';
    const dA = Math.hypot(ms.player.x - toGlobe.dest.x, ms.player.y - toGlobe.dest.y);
    ms.player.sprite.body.reset(toEgypt.x, toEgypt.y + 10); // stand on the globe-side gate
    await new Promise((res) => setTimeout(res, 1600));
    if (!ms.cityGateButton.isVisible) return { found: true, shown: false, step: 'globe gate button never appeared', inGlobe, dA };
    ms.cityGateAction?.();
    await new Promise((res) => setTimeout(res, 1800));
    const backEgypt = ms.activeWorld === 'egypt';
    const dE = Math.hypot(ms.player.x - toEgypt.dest.x, ms.player.y - toEgypt.dest.y);
    return { found: true, shown: true, inGlobe, dA: +dA.toFixed(1), backEgypt, dE: +dE.toFixed(1) };
  });
  ok(
    'cross-world gate: the Egypt ↔ Luxor crossing lands both ways at ~0 px',
    xgate.found && xgate.shown && xgate.inGlobe && xgate.dA < 8 && xgate.backEgypt && xgate.dE < 8,
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
    ms.devTravelEurope(); // → the globe world, landing at Rome
    await new Promise((res) => setTimeout(res, 2400));
    const gl = ms.groundLayers.get('globe');
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
    // Cell cap at full zoom-out (the whole PLANET in frame).
    ms.zoomControls.target = ms.zoomControls.outLimit;
    await new Promise((res) => setTimeout(res, 1800));
    const zoomedOutCells = gl.cellsDrawn;
    // TRUE frame rate over a window, by counting rAF ticks — the loop's
    // smoothed actualFps converges over many seconds after a scene-cost
    // change, so a before/after pair of reads compares two points on the
    // convergence curve, not the toggled cost (a probe showed it decaying
    // 24→8 with the ground hidden the whole time).
    const fpsOver = (msWin) =>
      new Promise((resolve) => {
        let frames = 0;
        const t0 = performance.now();
        const tick = () => {
          frames++;
          const dt = performance.now() - t0;
          if (dt >= msWin) resolve(+((frames * 1000) / dt).toFixed(1));
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    // FPS at CONTINENT zoom (still fully zoomed out): ground hidden vs shown.
    gl.setVisible(false);
    await new Promise((res) => setTimeout(res, 800));
    const fpsContinentBase = await fpsOver(2500);
    gl.setVisible(true);
    await new Promise((res) => setTimeout(res, 800));
    const fpsContinentGround = await fpsOver(2500);
    ms.zoomControls.target = 1;
    await new Promise((res) => setTimeout(res, 1500));
    // FPS at ground zoom, standing at Rome — SELF-RELATIVE baseline: the same
    // frames with the ground layer hidden vs shown (robust to session depth
    // and headless-GPU variance, unlike an absolute number), measured by rAF
    // counting like the continent pair above.
    ms.player.sprite.body.reset(romeArrival.x, romeArrival.y);
    gl.setVisible(false);
    await new Promise((res) => setTimeout(res, 800));
    const fpsBaseline = await fpsOver(2500);
    gl.setVisible(true);
    await new Promise((res) => setTimeout(res, 800));
    const fpsGround = await fpsOver(2500);
    const denseClean = ['earth', 'egypt', 'heaven', 'hell', 'city-faiyum'].every((id) => !ms.groundLayers.has(id));
    return { has: true, rome, midVoid, coastFound: waterX !== null, waterBlocks, groundCells: gl.cellsDrawn, zoomedOutCells, fpsBaseline, fpsGround, fpsContinentBase, fpsContinentGround, denseClean };
  });
  ok('ground: biome land renders under Rome', groundRun.has && groundRun.rome.cells > 0 && groundRun.rome.cls > 0, groundRun.has ? `cells=${groundRun.rome.cells} class=${groundRun.rome.cls}` : 'no globe ground layer');
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
  ok(
    'ground: FPS at CONTINENT zoom within tolerance of the no-ground baseline',
    groundRun.has && groundRun.fpsContinentGround >= groundRun.fpsContinentBase * 0.8,
    `ground=${groundRun.fpsContinentGround} baseline=${groundRun.fpsContinentBase} (tolerance ≥ 80%)`,
  );

  // 3n2. TRUE POSITIONS (the consolidation's core claim): Rome AND Luxor sit at
  // their real manifest lat/lng through the ONE globe calibration, with real
  // land rendered beneath, and a Levant/Anatolia land bridge of walkable void
  // ground joins the two regions — ground continuity, no gate needed.
  const globePos = await page.evaluate(() => {
    const ms = window.__ready();
    const o = ms.worlds['globe'].map.bounds;
    const px = (lat, lng) => ({ x: o.x + (lng + 180) * 2426, y: o.y + (85 - lat) * 2453 }); // the globe calibration
    const gl = ms.groundLayers.get('globe');
    const at = (zoneId, lat, lng) => {
      const z = ms.regionSpawnZones.find((s) => s.zoneId === zoneId);
      if (!z) return { d: -1, cls: -1 };
      const e = px(lat, lng);
      return { d: +Math.hypot(z.center.x - e.x, z.center.y - e.y).toFixed(1), cls: gl.classAtWorld(z.center.x, z.center.y) };
    };
    const rome = at('rome-eternal-seat', 41.9, 12.5); // the manifest anchors
    const luxor = at('luxor-valley-of-kings', 25.69, 32.64);
    // The land bridge: Ankara → Gaziantep → Amman, all walkable land void.
    const bridge = [
      [39.93, 32.85],
      [37.07, 37.38],
      [31.95, 35.93],
    ].map(([lat, lng]) => {
      const p = px(lat, lng);
      return { cls: gl.classAtWorld(p.x, p.y), blocked: ms.worlds['globe'].map.isBlockedAtWorld(p.x, p.y), offChunk: ms.worlds['globe'].map.terrainAtWorld(p.x, p.y) === null };
    });
    return { rome, luxor, bridge };
  });
  ok('globe: Rome renders at its true planet position', globePos.rome.d >= 0 && globePos.rome.d < 2 && globePos.rome.cls > 0, JSON.stringify(globePos.rome));
  ok('globe: Luxor renders at its true planet position', globePos.luxor.d >= 0 && globePos.luxor.d < 2 && globePos.luxor.cls > 0, JSON.stringify(globePos.luxor));
  ok(
    'globe: a Levant/Anatolia land bridge of walkable ground joins the regions',
    globePos.bridge.every((b) => b.cls > 0 && !b.blocked && b.offChunk),
    JSON.stringify(globePos.bridge),
  );

  // 3n3. THE REMOVED WORLDS ARE GONE: nothing at runtime registers or routes to
  // 'europe'/'africa', and no LIVE source line references the ids — the v12
  // save migration (src/save) and explanatory comments are the only allowed
  // remnants.
  const oldRefs = await page.evaluate(() => {
    const ms = window.__game.scene.getScene('MainScene');
    const dead = ['europe', 'africa'];
    return {
      worlds: dead.filter((id) => !!ms.worlds[id]),
      grounds: dead.filter((id) => ms.groundLayers.has(id)),
      gates: ms.regionGates.filter((g) => dead.includes(g.destWorld)).length,
      colliders: ms.regionColliders.filter((rc) => dead.includes(rc.worldId)).length,
      regionIds: dead.filter((id) => ms.regionWorldIds.has(id)),
    };
  });
  const srcHits = (() => {
    const files = [];
    const walk = (dir) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (e.name.endsWith('.ts')) files.push(p);
      }
    };
    walk('src');
    const hits = [];
    for (const f of files) {
      if (f.includes('save')) continue; // the migration references the removed ids on purpose
      const lines = readFileSync(f, 'utf8').split('\n');
      lines.forEach((ln, i) => {
        const t = ln.trim();
        if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return; // prose, not code
        if (/'(europe|africa)'|"(europe|africa)"/.test(ln)) hits.push(`${f}:${i + 1}`);
      });
    }
    return hits;
  })();
  ok(
    'globe: zero references to the removed europe/africa worlds remain (runtime + source)',
    oldRefs.worlds.length === 0 && oldRefs.grounds.length === 0 && oldRefs.gates === 0 && oldRefs.colliders === 0 && oldRefs.regionIds.length === 0 && srcHits.length === 0,
    JSON.stringify({ ...oldRefs, srcHits: srcHits.slice(0, 5) }),
  );

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

  // 3p. GENERIC BEAT COMPLETION — one full home chain per continent plays END
  // TO END by real actions: mentor talk (proximity button + the same handler),
  // five real kills, the story-marker walk-in, the elite-boss kill. All three
  // chains share the mentor→clear→story→boss shape.
  const playHomeChain = (params) =>
    page.evaluate(async ({ className, zoneId, ids }) => {
      const ms = window.__ready();
      const wait = (t) => new Promise((r) => setTimeout(r, t));
      ms.devClassOverride = className;
      ms.announcePlayerClass();
      ms.chain.load({ completed: [], activeId: null, activeObjective: 0 }); // the verified-clean fresh-start state
      ms.applyWorldSwap('globe', ms.regionZoneArrivals[zoneId]);
      ms.playerHealth.shield = 1e9; // re-arm past the swap's debuff clear
      await wait(1700); // transition + chunk activation + packs
      // 1) the mentor: stand beside the elder; the button must offer itself.
      const m = ms.regionMentors.find((x) => x.zoneId === zoneId);
      if (!m) return { step: 'no mentor registered' };
      ms.player.sprite.body.reset(m.pos.x + 40, m.pos.y);
      await wait(500);
      const btn = ms.mentorButton.isVisible;
      ms.regionMentorTalk();
      await wait(300);
      const s1 = ms.chain.status(ids[0]);
      // 2) the clear: five REAL wildlife kills inside the zone.
      const prey = ms.regionLive.filter((r) => r.zoneId === zoneId && r.family === 'corrupted-wildlife' && r.entity.isAlive).slice(0, 5);
      for (const r of prey) r.entity.takeHit(999999);
      await wait(800);
      const s2 = ms.chain.status(ids[1]);
      // 3) the discovery: walk onto the story marker.
      await wait(400); // marker spawns once the beat is active
      const mk = ms.beatMarker;
      if (mk) ms.player.sprite.body.reset(mk.pos.x, mk.pos.y);
      await wait(600);
      const s3 = ms.chain.status(ids[2]);
      // 4) the first evil: fell the elite at the boss anchor.
      await wait(700); // elite spawns (beat active + chunk active)
      const el = ms.beatElite;
      if (el) el.entity.takeHit(999999);
      await wait(700);
      const s4 = ms.chain.status(ids[3]);
      ms.devClassOverride = null;
      ms.announcePlayerClass();
      return { btn, prey: prey.length, marker: !!mk, elite: !!el, s1, s2, s3, s4 };
    }, params);
  for (const chain of [
    { name: 'Europe (Rome, Priest)', className: 'Priest', zoneId: 'rome-eternal-seat', ids: ['rom-01-mentor', 'rom-02-catacomb-vermin', 'rom-03-reliquary-rot', 'rom-04-appian-gate'] },
    { name: 'Africa (Kinshasa, Witch Doctor)', className: 'Witch Doctor', zoneId: 'kinshasa-river-drum', ids: ['kin-01-mentor', 'kin-02-first-blood', 'kin-03-discovery', 'kin-04-first-evil'] },
    { name: 'Asia (Lhasa, Monk)', className: 'Monk', zoneId: 'lhasa-prayer-citadel', ids: ['lha-01-mentor', 'lha-02-first-blood', 'lha-03-discovery', 'lha-04-first-evil'] },
  ]) {
    const r = await playHomeChain(chain);
    ok(
      `home chain end to end by hand: ${chain.name}`,
      r.btn && r.prey === 5 && r.marker && r.elite && r.s1 === 'complete' && r.s2 === 'complete' && r.s3 === 'complete' && r.s4 === 'complete',
      JSON.stringify(r),
    );
  }

  // 3q. HAND-AUTHORED MARCH BEAT: as-01 (Azazel's Asia arrival) completes via
  // its marker with the HAND_AUTHORED_TODO placeholder intact — structure
  // playable, prose still the designer's to write.
  const march = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    ms.devJumpToQuest('as-01-azazel-welcome');
    ms.playerHealth.shield = 1e9;
    await wait(2600); // travel + chunk activation + the marker
    const mk = ms.beatMarker;
    if (!mk || mk.beatId !== 'as-01-azazel-welcome') return { marker: false };
    ms.player.sprite.body.reset(mk.pos.x, mk.pos.y);
    await wait(600);
    const banner = ms.banner.text;
    const def = ms.chain.get('as-01-azazel-welcome');
    return {
      marker: true,
      status: ms.chain.status('as-01-azazel-welcome'),
      bannerTodo: banner.includes('HAND_AUTHORED_TODO: as-01-azazel-welcome'),
      defTodo: def.npcInactiveLines[0].includes('HAND_AUTHORED_TODO'),
    };
  });
  ok(
    'march beat: as-01 completes via its marker with the TODO placeholder intact',
    march.marker && march.status === 'complete' && march.bannerTodo && march.defTodo,
    JSON.stringify(march),
  );

  // 3r. FETCH PICKUPS: set-02 (Passage West) completes by collecting all three
  // glowing pickups with real walks.
  const fetchRun = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    ms.devJumpToQuest('set-02-passage-west');
    ms.playerHealth.shield = 1e9;
    await wait(2600);
    const pk = ms.beatPickups;
    if (!pk || pk.beatId !== 'set-02-passage-west') return { pickups: 0 };
    const spots = pk.items.map((i) => ({ x: i.x, y: i.y }));
    for (const s of spots) {
      ms.player.sprite.body.reset(s.x, s.y);
      await wait(400);
    }
    return { pickups: spots.length, status: ms.chain.status('set-02-passage-west') };
  });
  ok('fetch beat: set-02 completes by collecting all three pickups', fetchRun.pickups === 3 && fetchRun.status === 'complete', JSON.stringify(fetchRun));

  // 3t. 64PX ART PATH + SPRITE DROP-IN: the MECHANISM, without shipping art.
  // A synthetic 64px master must composite into EXACTLY its terrain's atlas
  // cell (center lands, neighbor cell untouched — the seam contract), and a
  // synthetic sprite override must mint a texture of exactly the canonical
  // size. Both restore/clean up, so the run stays visually unchanged.
  const artPath = await page.evaluate(() => {
    const ms = window.__ready();
    // Synthetic 64px master: magenta with a green center dot (a detail marker
    // that must survive the half-scale fit into the 32px cell).
    const cvs = ms.textures.createCanvas('test-64-master', 64, 64);
    const c = cvs.context;
    c.fillStyle = '#ff00ff';
    c.fillRect(0, 0, 64, 64);
    c.fillStyle = '#00ff00';
    c.beginPath();
    c.arc(32, 32, 8, 0, Math.PI * 2);
    c.fill();
    cvs.refresh();
    const atlas = ms.textures.get('terrain-atlas');
    const ctx = atlas.context;
    const cell = ms.artOverrides.drawIntoAtlasCell(ms, 'steppe', 'test-64-master');
    if (!cell) return { cell: false };
    const before = ctx.getImageData(cell.ox, cell.oy, 32, 32); // (captured AFTER draw — restore uses the snapshot below)
    const center = [...ctx.getImageData(cell.ox + 16, cell.oy + 16, 1, 1).data];
    const corner = [...ctx.getImageData(cell.ox + 2, cell.oy + 2, 1, 1).data];
    const neighbor = [...ctx.getImageData(cell.ox + 32 + 16, cell.oy + 16, 1, 1).data];
    void before;
    // RESTORE: re-fit the terrain's own 32px art (steppe ships real art) so the
    // atlas is pixel-identical to a normal boot for everything after this.
    const restored = ms.artOverrides.drawIntoAtlasCell(ms, 'steppe', 'tile-steppe') !== null;
    const back = [...ctx.getImageData(cell.ox + 16, cell.oy + 16, 1, 1).data];
    // SPRITE DROP-IN: the same synthetic source fitted to a canonical size
    // under a throwaway key.
    const ok = ms.artOverrides.applySpriteOverride(ms, 'test-sprite-override', 28, 40, 'test-64-master');
    const spr = ok ? ms.textures.get('test-sprite-override').getSourceImage() : null;
    const sprSize = spr ? [spr.width, spr.height] : null;
    ms.textures.remove('test-sprite-override');
    ms.textures.remove('test-64-master');
    return { cell: true, center, corner, neighbor, restored, back, sprOk: ok, sprSize };
  });
  const magenta = (p) => p && p[0] > 200 && p[1] < 60 && p[2] > 200;
  const green = (p) => p && p[1] > 200 && p[0] < 60;
  ok(
    '64px art path: a 64px master composites into exactly its atlas cell (seam intact, restore clean)',
    artPath.cell && green(artPath.center) && magenta(artPath.corner) && !magenta(artPath.neighbor) && artPath.restored && !green(artPath.back),
    JSON.stringify(artPath),
  );
  ok(
    'sprite drop-in: an override mints the canonical key at the canonical size',
    artPath.sprOk === true && Array.isArray(artPath.sprSize) && artPath.sprSize[0] === 28 && artPath.sprSize[1] === 40,
    `applied=${artPath.sprOk} size=${JSON.stringify(artPath.sprSize)}`,
  );

  // 3u. SKILL FRAMEWORK (composed-action schema): EVERY skill in every tree of
  // every class executes without error through its real runtime seam, and each
  // COMPOSED action produces exactly its declared primitives. Direct calls
  // bypass only cooldown/energy — the same code paths real activation uses.
  const skillSweep = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    const out = { total: 0, composed: 0, bespokeActive: 0, other: 0, passive: 0, mismatches: [], errors: [] };
    for (const cls of Object.keys(ms.classSkillsAll)) {
      for (const def of ms.classSkillsAll[cls].skills) {
        const e = def.effect;
        out.total++;
        try {
          if (e.kind === 'active' && e.compose) {
            ms.runComposedSteps(e.compose);
            out.composed++;
            const want = e.compose.map((s) => s.p).join(',');
            const got = ms.lastComposedPrimitives.join(',');
            if (want !== got) out.mismatches.push(`${def.id}: ran [${got}] declared [${want}]`);
          } else if (e.kind === 'active') {
            ms.runActiveSkill(e.action);
            out.bespokeActive++;
          } else if (e.kind === 'buff' || e.kind === 'transformation') {
            ms.startTimedSkill(def.id, 60, e.stats, e.tint, e.kind === 'transformation' ? { auraDamage: e.auraDamage, auraRadius: e.auraRadius } : {});
            out.other++;
          } else if (e.kind === 'debuff') {
            ms.runDebuffSkill(e.radius);
            out.other++;
          } else if (e.kind === 'channel') {
            ms.tryStartChannel(def.id, e); // no-target path is its own valid branch
            out.other++;
          } else if (e.kind === 'stacking_dot') {
            const t = ms.nearestEnemy(ms.player.x, ms.player.y, e.range);
            if (t) ms.addStackingDot(t, def.id, e.dmgPerTick, e.tickMs, e.durationMs, e.maxStacks, e.color ?? 0x9a6cff);
            out.other++;
          } else {
            out.passive++; // stat-only: aggregated by recompute, nothing to execute
          }
        } catch (err) {
          out.errors.push(`${def.id}: ${err.message}`);
        }
        await wait(25);
      }
    }
    // Clean up everything the sweep armed: timed forms expire now, summons (and
    // their long pet buffs — the Druid oils run 5 minutes), friendly zones,
    // stealth and DoTs clear, vitals restore — the page-error gate watches the tail.
    for (const t of ms.skillTimed) t.endsAt = 0;
    ms.summons.clear();
    ms.summons.clearBuffs();
    ms.clearFriendlyZones();
    ms.breakPlayerStealth();
    ms.clearEntangle();
    ms.crystallize.clear();
    ms.clearDots();
    ms.playerHealth.full();
    ms.energy.full();
    await wait(500);
    return out;
  });
  ok(
    'skill framework: every skill in every tree executes; composed actions match their declared primitives',
    skillSweep.errors.length === 0 && skillSweep.mismatches.length === 0 && skillSweep.composed === 69 && skillSweep.total >= 150,
    `total=${skillSweep.total} composed=${skillSweep.composed} bespokeActive=${skillSweep.bespokeActive} timed/other=${skillSweep.other} passive=${skillSweep.passive}` +
      (skillSweep.errors.length ? ` ERRORS=${JSON.stringify(skillSweep.errors.slice(0, 3))}` : '') +
      (skillSweep.mismatches.length ? ` MISMATCH=${JSON.stringify(skillSweep.mismatches.slice(0, 3))}` : ''),
  );

  // 3v. DRUID FRAMEWORK EXTENSIONS (permanent): the composable primitives +
  // summon variants Commit 1 added, each exercised through its real runtime
  // seam. Each check establishes its own preconditions (a QUIET walkable spot
  // via the shared __quietSpot helper, freshly-spawned targets) and fails
  // loudly when setup fails.

  // 3v-1. CHAIN-BOUNCE: one cast hits the nearest enemy then arcs to two more,
  // never re-hitting, with strictly falling damage per jump.
  const chainRun = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!window.__quietSpot()) return { setup: 'no quiet spot' };
    const spawnAt = (d) => {
      const w = ms.activeMap().nearestWalkableWorld(ms.player.x + d, ms.player.y);
      return ms.spawnAngel('darkcaster', w.x, w.y);
    };
    const targets = [spawnAt(140), spawnAt(300), spawnAt(460)];
    await wait(200);
    const hp0 = targets.map((t) => t.health.current);
    ms.runComposedSteps([{ p: 'chain', range: 320, jumps: 2, jumpRange: 260, damage: 30, falloff: 0.5, tint: 0x88ff88 }]);
    await wait(150);
    const drops = targets.map((t, i) => hp0[i] - t.health.current);
    const prims = ms.lastComposedPrimitives.join(',');
    for (const t of targets) t.destroy();
    return { setup: 'ok', drops, prims };
  });
  ok(
    'druid ext — chain: one cast arcs across three enemies with falling damage',
    chainRun.setup === 'ok' && chainRun.prims === 'chain' && chainRun.drops.every((d) => d > 0) && chainRun.drops[0] > chainRun.drops[1] && chainRun.drops[1] > chainRun.drops[2],
    JSON.stringify(chainRun),
  );

  // 3v-2. DUAL-USE BOLT: with NO enemy in range it MENDS (the most-injured summon
  // in heal range, else the caster); with an enemy in range it damages it.
  const dualRun = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!window.__quietSpot()) return { setup: 'no quiet spot' };
    const step = { p: 'dualbolt', range: 320, damage: 24, speed: 620, radius: 10, heal: 30, healRange: 260, tint: 0x9ad8a0 };
    // (a) self-heal: injured player, no enemy, no summon.
    ms.summons.clear();
    ms.playerHealth.current = Math.max(1, ms.playerHealth.max - 60);
    const before = ms.playerHealth.current;
    ms.runComposedSteps([step]);
    const selfHealed = ms.playerHealth.current - before;
    // (b) summon-heal: an injured summon in range outranks the (also injured) player.
    const cfg = { key: 'gate_test_tank', name: 'Gate Tank', behavior: 'tank', maxHP: 100, durationMs: 20000, aggroRadius: 150, followRange: 150, moveTilesPerSec: 5, bodyRadius: 12, tint: 0x88cc88, drawsAggro: true, aggroPriority: 2 };
    const [tank] = ms.summonAlliedUnits(cfg, 1, 1);
    tank.takeHit(40);
    const tankBefore = tank.health.current;
    ms.playerHealth.current = Math.max(1, ms.playerHealth.max - 60);
    const playerBefore = ms.playerHealth.current;
    ms.runComposedSteps([step]);
    const tankHealed = tank.health.current - tankBefore;
    const playerUntouched = ms.playerHealth.current === playerBefore;
    // (c) damage: an enemy in range gets the bolt instead (flight time allowed).
    const w = ms.activeMap().nearestWalkableWorld(ms.player.x + 180, ms.player.y);
    const foe = ms.spawnAngel('darkcaster', w.x, w.y);
    await wait(200);
    const foe0 = foe.health.current;
    ms.runComposedSteps([step]);
    await wait(700);
    const foeDrop = foe0 - foe.health.current;
    foe.destroy();
    ms.summons.clear();
    ms.playerHealth.full();
    return { setup: 'ok', selfHealed, tankHealed, playerUntouched, foeDrop };
  });
  ok(
    'druid ext — dual-use bolt: heals self, prefers an injured summon, damages an enemy in range',
    dualRun.setup === 'ok' && dualRun.selfHealed === 30 && dualRun.tankHealed === 30 && dualRun.playerUntouched && dualRun.foeDrop > 0,
    JSON.stringify(dualRun),
  );

  // 3v-3. FRIENDLY ZONE (STATIC): heals the player + a summon standing in it on
  // ticks, stays where it was cast, and stops healing once the player leaves.
  const staticZone = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!window.__quietSpot()) return { setup: 'no quiet spot' };
    ms.summons.clear();
    const cfg = { key: 'gate_test_tank', name: 'Gate Tank', behavior: 'tank', maxHP: 100, durationMs: 20000, aggroRadius: 150, followRange: 150, moveTilesPerSec: 5, bodyRadius: 12, tint: 0x88cc88, drawsAggro: true, aggroPriority: 2 };
    const [tank] = ms.summonAlliedUnits(cfg, 1, 1);
    tank.takeHit(50);
    const tankBefore = tank.health.current;
    ms.playerHealth.current = Math.max(1, ms.playerHealth.max - 80);
    const before = ms.playerHealth.current;
    ms.runComposedSteps([{ p: 'friendzone', radius: 140, healPerTick: 10, tickMs: 200, durationMs: 3000 }]);
    const z = ms.friendlyZones[ms.friendlyZones.length - 1];
    const placedAt = { x: z.x, y: z.y, follow: z.follow };
    await wait(900);
    const healed = ms.playerHealth.current - before;
    const tankHealed = tank.health.current - tankBefore;
    // Leave the zone: the center must NOT follow, and healing must stop.
    ms.player.sprite.body.reset(ms.player.x + 600, ms.player.y);
    await wait(300);
    const stayed = Math.hypot(z.x - placedAt.x, z.y - placedAt.y) < 1;
    const outside = ms.playerHealth.current;
    await wait(600);
    const healedOutside = ms.playerHealth.current - outside;
    ms.summons.clear();
    ms.playerHealth.full();
    return { setup: 'ok', follow: placedAt.follow, healed, tankHealed, stayed, healedOutside };
  });
  ok(
    'druid ext — static friendly zone: heals player + summon on ticks, holds position, stops outside',
    staticZone.setup === 'ok' && staticZone.follow === false && staticZone.healed >= 30 && staticZone.tankHealed >= 30 && staticZone.stayed && staticZone.healedOutside === 0,
    JSON.stringify(staticZone),
  );

  // 3v-4. FRIENDLY ZONE (MOBILE): the follow variant tracks the caster and keeps
  // healing on the move, then expires cleanly (list emptied, FX gone).
  const mobileZone = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!window.__quietSpot()) return { setup: 'no quiet spot' };
    ms.playerHealth.current = Math.max(1, ms.playerHealth.max - 80);
    const before = ms.playerHealth.current;
    ms.runComposedSteps([{ p: 'friendzone', follow: true, radius: 120, healPerTick: 8, tickMs: 200, durationMs: 2200 }]);
    const z = ms.friendlyZones[ms.friendlyZones.length - 1];
    ms.player.sprite.body.reset(ms.player.x + 500, ms.player.y + 300);
    await wait(400);
    const tracked = Math.hypot(z.x - ms.player.x, z.y - ms.player.y) < 40;
    await wait(600);
    const healedMoving = ms.playerHealth.current - before;
    await wait(1600); // past durationMs → the zone must be pruned
    const expired = ms.friendlyZones.length === 0;
    ms.playerHealth.full();
    return { setup: 'ok', tracked, healedMoving, expired };
  });
  ok(
    'druid ext — mobile friendly zone: follows the caster, heals on the move, expires cleanly',
    mobileZone.setup === 'ok' && mobileZone.tracked && mobileZone.healedMoving >= 24 && mobileZone.expired,
    JSON.stringify(mobileZone),
  );

  // 3v-5. PLAYER STEALTH: an enemy chasing the player stops targeting them the
  // moment stealth starts (aggro wiped, no fall-through to the player), and an
  // ATTACK breaks it (targeting resumes).
  const stealthRun = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!window.__quietSpot()) return { setup: 'no quiet spot' };
    const w = ms.activeMap().nearestWalkableWorld(ms.player.x + 160, ms.player.y);
    const foe = ms.spawnAngel('darkcaster', w.x, w.y);
    await wait(250);
    const tgt = () => ms.enemyAggroTarget(foe, foe.x, foe.y);
    const t0 = tgt();
    const targetsPlayerBefore = Math.hypot(t0.x - ms.player.x, t0.y - ms.player.y) < 4;
    ms.runComposedSteps([{ p: 'stealth', durationMs: 8000 }]);
    const t1 = tgt();
    const ignoredDuring = Math.hypot(t1.x - foe.x, t1.y - foe.y) < 4 && !(Math.hypot(t1.x - ms.player.x, t1.y - ms.player.y) < 4);
    const activeDuring = ms.playerStealthActive;
    // Attacking breaks it: any offensive composed step.
    ms.runComposedSteps([{ p: 'strike', at: 'self', radius: 90, damageRaw: 1, tint: 0xffffff }]);
    const brokeOnAttack = !ms.playerStealthActive && ms.player.sprite.alpha === 1;
    await wait(450); // past the aggro re-eval interval
    const t2 = tgt();
    const targetsPlayerAfter = Math.hypot(t2.x - ms.player.x, t2.y - ms.player.y) < 4;
    foe.destroy();
    return { setup: 'ok', targetsPlayerBefore, ignoredDuring, activeDuring, brokeOnAttack, targetsPlayerAfter };
  });
  ok(
    'druid ext — stealth: removes the player from enemy targeting, breaks on attack',
    stealthRun.setup === 'ok' && stealthRun.targetsPlayerBefore && stealthRun.ignoredDuring && stealthRun.activeDuring && stealthRun.brokeOnAttack && stealthRun.targetsPlayerAfter,
    JSON.stringify(stealthRun),
  );

  // 3v-6. SUMMON VARIANTS: (pair) ONE cast spawns TWO live linked units of one
  // type; (untargetable timed) a drawsAggro:false attacker is invisible to the
  // aggro hierarchy AND bolt interception, lands its low chip damage on a real
  // enemy, and auto-expires at its overridden duration.
  const variantRun = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!window.__quietSpot()) return { setup: 'no quiet spot' };
    ms.summons.clear();
    // PAIR: one cast → two live units of the same type, side by side.
    const pairCfg = { key: 'gate_test_pair', name: 'Gate Pair', behavior: 'tank', maxHP: 60, durationMs: 15000, aggroRadius: 150, followRange: 150, moveTilesPerSec: 5, bodyRadius: 12, tint: 0x88cc88, drawsAggro: true, aggroPriority: 2 };
    const pair = ms.summonAlliedUnits(pairCfg, 2, 2);
    const pairAlive = pair.length === 2 && pair.every((s) => s.isAlive) && ms.summons.list.filter((s) => s.config.key === 'gate_test_pair').length === 2;
    const apart = pair.length === 2 ? Math.hypot(pair[0].x - pair[1].x, pair[0].y - pair[1].y) : 0;
    ms.summons.clear();
    // UNTARGETABLE TIMED: drawsAggro=false + a duration override + chip damage.
    const chipCfg = {
      key: 'gate_test_chip', name: 'Gate Chip', behavior: 'attacker', maxHP: 30, durationMs: 60000,
      aggroRadius: 0, followRange: 150, moveTilesPerSec: 6, bodyRadius: 12, tint: 0xcccc66,
      drawsAggro: false, aggroPriority: 1, attackDamage: 4, attackCooldownMs: 350, attackRange: 70, seekRange: 320, leashRange: 600,
    };
    const [chip] = ms.summonAlliedUnits(chipCfg, 1, 1, 1600);
    const untargetable = ms.summons.aggroSummonNear(chip.x, chip.y) === null && ms.summons.summonAt(chip.x, chip.y, 60) === null;
    const w = ms.activeMap().nearestWalkableWorld(ms.player.x + 120, ms.player.y);
    const foe = ms.spawnAngel('darkcaster', w.x, w.y);
    await wait(300);
    const foe0 = foe.health.current;
    await wait(900); // the chip attacker closes + swings at least once
    const chipped = foe0 - foe.health.current;
    const foeTarget = ms.enemyAggroTarget(foe, foe.x, foe.y);
    const foeIgnoresChip = !(Math.hypot(foeTarget.x - chip.x, foeTarget.y - chip.y) < 4);
    await wait(700); // past the 1600ms override → expired + pruned
    const expired = !ms.summons.list.some((s) => s.config.key === 'gate_test_chip');
    foe.destroy();
    ms.summons.clear();
    return { setup: 'ok', pairAlive, apart, untargetable, chipped, foeIgnoresChip, expired };
  });
  ok(
    'druid ext — summon variants: pair spawns two; untargetable timed unit chips, is ignored, expires',
    variantRun.setup === 'ok' && variantRun.pairAlive && variantRun.apart > 20 && variantRun.untargetable && variantRun.chipped > 0 && variantRun.foeIgnoresChip && variantRun.expired,
    JSON.stringify(variantRun),
  );

  // 3x. MAGE FRAMEWORK EXTENSIONS (permanent): entangled chains, crystallize +
  // shatter, the wormhole composite, and seeking bolts — each exercised through
  // its real runtime seam from an isolated spot (loud setup failures).

  // 3x-1. ENTANGLED CHAINS: bind three foes; damage to one is SHARED to the others,
  // a stun on one stuns all; unbinding stops the sharing.
  const entangleRun = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!window.__quietSpot()) return { setup: 'no quiet spot' };
    const spawnAt = (dx, dy) => {
      const w = ms.activeMap().nearestWalkableWorld(ms.player.x + dx, ms.player.y + dy);
      return ms.spawnAngel('darkcaster', w.x, w.y);
    };
    const a = spawnAt(120, 0);
    const b = spawnAt(200, 80);
    const c = spawnAt(200, -80);
    await wait(200);
    const bound = ms.entangleNearby(ms.player.x, ms.player.y, 320, 3, 0.5, 6000);
    const hp0 = [a, b, c].map((e) => e.health.current);
    a.takeHit(40); // direct hit on ONE bound member
    await wait(100);
    const drops = [a, b, c].map((e, i) => hp0[i] - e.health.current);
    const shared = drops[0] > 0 && drops[1] > 0 && drops[2] > 0 && drops[1] < drops[0] && drops[2] < drops[0];
    // Control share: stun a small ring around A only → B must be stunned too.
    ms.stunEnemiesInRange(a.x, a.y, 40, 800);
    const stunShared = ms.stunnedEnemies.has(b) && ms.stunnedEnemies.has(c);
    // Unbind: damage no longer shares.
    ms.clearEntangle();
    const b1 = b.health.current;
    a.takeHit(30);
    await wait(100);
    const afterClear = b1 - b.health.current;
    for (const e of [a, b, c]) e.destroy();
    return { setup: 'ok', bound, drops, shared, stunShared, afterClear };
  });
  ok(
    'mage ext — entangled chains: damage + stuns shared across the binding; unbind stops it',
    entangleRun.setup === 'ok' && entangleRun.bound === 3 && entangleRun.shared && entangleRun.stunShared && entangleRun.afterClear === 0,
    JSON.stringify(entangleRun),
  );

  // 3x-2. CRYSTALLIZE + SHATTER: the strike rider applies stacks (capped), Shatter
  // consumes EXACTLY the stacks in radius (per-stack damage; out-of-radius stacks stay).
  const crysRun = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!window.__quietSpot()) return { setup: 'no quiet spot' };
    const wA = ms.activeMap().nearestWalkableWorld(ms.player.x + 130, ms.player.y);
    const a = ms.spawnAngel('darkcaster', wA.x, wA.y);
    const wB = ms.activeMap().nearestWalkableWorld(ms.player.x + 640, ms.player.y);
    const b = ms.spawnAngel('darkcaster', wB.x, wB.y);
    await wait(200);
    // The RIDER: a strike around the player crystallizes what it hits (B is out of reach).
    ms.runComposedSteps([{ p: 'strike', at: 'self', radius: 200, damageRaw: 1, tint: 0xbfe0ff, crystallize: 2 }]);
    const riderStacks = ms.crystallize.get(a) ?? 0;
    ms.addCrystallize(a, 10, 6); // cap check: 2 + 10 → clamped to 6
    ms.addCrystallize(b, 3, 6); // stacks OUTSIDE the coming shatter radius
    const capped = ms.crystallize.get(a) ?? 0;
    const hpA = a.health.current;
    const res = ms.shatterCrystallize(ms.player.x, ms.player.y, 300, 10);
    await wait(100);
    const dropA = hpA - a.health.current;
    const out = {
      setup: 'ok', riderStacks, capped, res,
      dropA,
      aCleared: !ms.crystallize.has(a),
      bKept: ms.crystallize.get(b) === 3,
    };
    a.destroy();
    b.destroy();
    ms.crystallize.clear();
    return out;
  });
  ok(
    'mage ext — crystallize/shatter: rider applies, cap holds, shatter consumes exactly the stacks in radius',
    crysRun.setup === 'ok' && crysRun.riderStacks === 2 && crysRun.capped === 6 && crysRun.res.hit === 1 && crysRun.res.stacks === 6 && crysRun.dropA >= 40 && crysRun.aCleared && crysRun.bKept,
    JSON.stringify(crysRun),
  );

  // 3x-3. WORMHOLE COMPOSITE: [hazard at self, teleport] moves the player and leaves
  // a damaging portal at the ORIGIN that ticks on an enemy standing in it.
  const wormRun = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!window.__quietSpot()) return { setup: 'no quiet spot' };
    const from = { x: ms.player.x, y: ms.player.y };
    ms.player.facingX = 1;
    ms.player.facingY = 0;
    ms.runComposedSteps([
      { p: 'hazard', at: 'self', radius: 90, tickDamage: 8, tickMs: 250, durationMs: 2500, fill: 0x8a5cff, stroke: 0xc09aff },
      { p: 'teleport', distance: 220 },
    ]);
    const moved = Math.hypot(ms.player.x - from.x, ms.player.y - from.y);
    const h = ms.spellHazards[ms.spellHazards.length - 1];
    const portalAtOrigin = h ? Math.hypot(h.x - from.x, h.y - from.y) < 5 : false;
    const w = ms.activeMap().nearestWalkableWorld(from.x, from.y);
    const foe = ms.spawnAngel('darkcaster', w.x, w.y);
    await wait(150);
    const hp0 = foe.health.current;
    await wait(800); // several portal ticks
    const ticked = hp0 - foe.health.current;
    foe.destroy();
    return { setup: 'ok', moved, portalAtOrigin, ticked };
  });
  ok(
    'mage ext — wormhole: teleports the player, the origin portal damages what stands in it',
    wormRun.setup === 'ok' && wormRun.moved > 120 && wormRun.portalAtOrigin && wormRun.ticked > 0,
    JSON.stringify(wormRun),
  );

  // 3x-4. SEEKING BOLT: fired 90° AWAY from the only enemy, the bolt curves in and
  // still hits it (a straight bolt at that angle could never connect).
  const seekRun = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!window.__quietSpot()) return { setup: 'no quiet spot' };
    const w = ms.activeMap().nearestWalkableWorld(ms.player.x, ms.player.y - 220);
    const foe = ms.spawnAngel('darkcaster', w.x, w.y); // due NORTH of the player
    await wait(200);
    ms.player.facingX = 1; // fire due EAST — 90° off the target
    ms.player.facingY = 0;
    const hp0 = foe.health.current;
    ms.runComposedSteps([{ p: 'bolt', damage: 16, speed: 420, range: 600, radius: 9, tint: 0xc09aff, seek: true }]);
    const t0 = Date.now();
    let drop = 0;
    while (Date.now() - t0 < 2500) {
      await wait(120);
      drop = hp0 - foe.health.current;
      if (drop > 0) break;
    }
    foe.destroy();
    return { setup: 'ok', drop };
  });
  ok('mage ext — seeking bolt: fired 90° off-target, it curves in and hits', seekRun.setup === 'ok' && seekRun.drop > 0, JSON.stringify(seekRun));

  // 3z. BARD FRAMEWORK EXTENSIONS (permanent): confusion, echo, the conditional
  // finisher, rotating bolt riders, the melee strike-chain, and the combo
  // ultimate — each through its real runtime seam from an isolated spot.

  // 3z-1. CONFUSION: a confused enemy pursues its nearest FELLOW (aggro redirected),
  // chips at it when adjacent, and the effect wears off cleanly.
  const confRun = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!window.__quietSpot()) return { setup: 'no quiet spot' };
    const spawnAt = (dx, dy) => {
      const w = ms.activeMap().nearestWalkableWorld(ms.player.x + dx, ms.player.y + dy);
      return ms.spawnAngel('darkcaster', w.x, w.y);
    };
    const a = spawnAt(120, 0);
    const b = spawnAt(170, 0); // the fellow, standing beside A
    await wait(200);
    ms.stunEnemiesInRange(ms.player.x + 145, ms.player.y, 220, 2600); // hold both in place (kiting-proof)
    const confused = ms.confuseNearestEnemy(ms.player.x, ms.player.y, 200, 1, 1600, 9, 300);
    const entry = ms.confused.get(a);
    const targetsFellow = !!entry && entry.target === b;
    const t1 = ms.enemyAggroTarget(a, a.x, a.y);
    const aggroOnFellow = Math.hypot(t1.x - b.x, t1.y - b.y) < 4;
    const hpB = b.health.current;
    await wait(900); // adjacent → chip hits land on the fellow
    const chipped = hpB - b.health.current;
    await wait(1000); // past durationMs → wears off cleanly
    const woreOff = !ms.confused.has(a);
    const t2 = ms.enemyAggroTarget(a, a.x, a.y);
    const backToPlayer = Math.hypot(t2.x - ms.player.x, t2.y - ms.player.y) < 4;
    a.destroy();
    b.destroy();
    return { setup: 'ok', confused, targetsFellow, aggroOnFellow, chipped, woreOff, backToPlayer };
  });
  ok(
    'bard ext — confusion: aggro redirects onto the nearest fellow, chips it, wears off cleanly',
    confRun.setup === 'ok' && confRun.confused && confRun.targetsFellow && confRun.aggroOnFellow && confRun.chipped > 0 && confRun.woreOff && confRun.backToPlayer,
    JSON.stringify(confRun),
  );

  // 3z-2. ECHO: an armed echo repeats a strike after the delay at echoPct strength;
  // disarmed, nothing repeats.
  const echoRun = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!window.__quietSpot()) return { setup: 'no quiet spot' };
    const w = ms.activeMap().nearestWalkableWorld(ms.player.x + 60, ms.player.y);
    const a = ms.spawnAngel('darkcaster', w.x, w.y);
    await wait(200);
    ms.stunEnemiesInRange(a.x, a.y, 40, 3000); // hold it in place so the delayed echo lands
    ms.setEcho(0.5, 300);
    const hp0 = a.health.current;
    ms.player.facingX = 1;
    ms.player.facingY = 0;
    ms.runComposedSteps([{ p: 'strike', at: 'front', range: 80, damageRaw: 20, tint: 0xd8c8ff }]);
    await wait(120);
    const initial = hp0 - a.health.current;
    await wait(500); // past the 300ms echo delay
    const total = hp0 - a.health.current;
    ms.setEcho(0);
    const hp1 = a.health.current;
    ms.runComposedSteps([{ p: 'strike', at: 'front', range: 80, damageRaw: 20, tint: 0xd8c8ff }]);
    await wait(500);
    const disarmed = hp1 - a.health.current;
    a.destroy();
    return { setup: 'ok', initial, total, disarmed };
  });
  ok(
    'bard ext — echo: a delayed second hit at echoPct; nothing repeats once disarmed',
    echoRun.setup === 'ok' && echoRun.initial === 20 && echoRun.total === 30 && echoRun.disarmed === 20,
    JSON.stringify(echoRun),
  );

  // 3z-3. CONDITIONAL FINISHER: a stunned/slowed target takes damage × bonusMult;
  // an unafflicted one takes base damage.
  const finRun = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!window.__quietSpot()) return { setup: 'no quiet spot' };
    const spawnAt = (dx, dy) => {
      const w = ms.activeMap().nearestWalkableWorld(ms.player.x + dx, ms.player.y + dy);
      return ms.spawnAngel('darkcaster', w.x, w.y);
    };
    const stunned = spawnAt(80, 60);
    const fresh = spawnAt(80, -60);
    await wait(200);
    ms.stunEnemiesInRange(stunned.x, stunned.y, 30, 1500); // afflict ONE
    const h1 = stunned.health.current;
    const h2 = fresh.health.current;
    const res = ms.finisherHitAll(ms.player.x, ms.player.y, 200, 15, 2);
    await wait(100);
    const dropStunned = h1 - stunned.health.current;
    const dropFresh = h2 - fresh.health.current;
    stunned.destroy();
    fresh.destroy();
    return { setup: 'ok', res, dropStunned, dropFresh };
  });
  ok(
    'bard ext — conditional finisher: double damage to the stunned target, base to the fresh one',
    finRun.setup === 'ok' && finRun.res.hit === 2 && finRun.res.bonus === 1 && finRun.dropStunned === 30 && finRun.dropFresh === 15,
    JSON.stringify(finRun),
  );

  // 3z-4. ROTATING RIDERS: a composed multi-bolt whose bolts carry DIFFERENT
  // impact riders — the struck enemy ends up stunned AND slowed.
  const riderRun = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!window.__quietSpot()) return { setup: 'no quiet spot' };
    const w = ms.activeMap().nearestWalkableWorld(ms.player.x + 200, ms.player.y);
    const a = ms.spawnAngel('darkcaster', w.x, w.y);
    await wait(200);
    ms.player.facingX = a.x >= ms.player.x ? 1 : -1;
    ms.player.facingY = 0;
    const hp0 = a.health.current;
    ms.runComposedSteps([
      { p: 'bolt', damage: 8, speed: 520, range: 320, radius: 9, tint: 0xd8c8ff, onHit: { stunMs: 1200 } },
      { p: 'bolt', damage: 8, speed: 520, range: 320, radius: 9, tint: 0xb8e8ff, onHit: { slowFactor: 0.5, slowMs: 2000 } },
    ]);
    await wait(700); // flight + impacts
    const hit = hp0 - a.health.current > 0;
    const stunnedApplied = ms.stunnedEnemies.has(a);
    const slowApplied = ms.slowedEnemies.has(a);
    a.destroy();
    return { setup: 'ok', hit, stunnedApplied, slowApplied };
  });
  ok(
    'bard ext — rotating riders: each bolt lands its own rider (stun from one, slow from the other)',
    riderRun.setup === 'ok' && riderRun.hit && riderRun.stunnedApplied && riderRun.slowApplied,
    JSON.stringify(riderRun),
  );

  // 3z-5. MELEE STRIKE-CHAIN: a melee-range chain leaps through three foes with
  // falloff and sweeps one swing crescent per hop.
  const meleeChain = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!window.__quietSpot()) return { setup: 'no quiet spot' };
    const spawnAt = (dx) => {
      const w = ms.activeMap().nearestWalkableWorld(ms.player.x + dx, ms.player.y);
      return ms.spawnAngel('darkcaster', w.x, w.y);
    };
    const foes = [spawnAt(70), spawnAt(180), spawnAt(290)];
    await wait(200);
    // Casters KITE: pin the line — stun, then hard-place at the exact melee spacing.
    ms.stunEnemiesInRange(ms.player.x + 180, ms.player.y, 400, 2500);
    foes.forEach((f, i) => f.sprite.body.reset(ms.player.x + 70 + i * 110, ms.player.y));
    ms.player.facingX = 1;
    ms.player.facingY = 0;
    const hp0 = foes.map((f) => f.health.current);
    const swings0 = ms.swingFx.spawnedTotal;
    ms.runComposedSteps([{ p: 'chain', range: 90, jumps: 2, jumpRange: 140, damage: 24, falloff: 0.5, tint: 0xd8c8ff, swingFx: true }]);
    await wait(150);
    const drops = foes.map((f, i) => hp0[i] - f.health.current);
    const swings = ms.swingFx.spawnedTotal - swings0;
    for (const f of foes) f.destroy();
    return { setup: 'ok', drops, swings };
  });
  ok(
    'bard ext — strike-chain: a melee hit leaps through three foes with falloff, one crescent per hop',
    meleeChain.setup === 'ok' && meleeChain.drops.every((d) => d > 0) && meleeChain.drops[0] > meleeChain.drops[1] && meleeChain.drops[1] > meleeChain.drops[2] && meleeChain.swings === 3,
    JSON.stringify(meleeChain),
  );

  // 3z-6. COMBO ULTIMATE: entering the state lands MULTIPLE auto-chained strikes
  // with no further input while its buff runs, then the state ends on time.
  const comboRun = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!window.__quietSpot()) return { setup: 'no quiet spot' };
    const w = ms.activeMap().nearestWalkableWorld(ms.player.x + 60, ms.player.y);
    const a = ms.spawnAngel('darkcaster', w.x, w.y);
    await wait(200);
    // Casters KITE: pin the target in melee reach for the whole combo window.
    ms.stunEnemiesInRange(a.x, a.y, 400, 3000);
    a.sprite.body.reset(ms.player.x + 60, ms.player.y);
    const hp0 = a.health.current;
    const swings0 = ms.swingFx.spawnedTotal;
    ms.startComboUltimate('gate_combo_test', { durationMs: 1400, intervalMs: 300, range: 120, damage: 10, jumps: 1, jumpRange: 140, falloff: 0.5, tint: 0xd8c8ff, stats: { damageMult: 0.2 } });
    const buffOn = ms.skillTimed.some((t) => t.id === 'gate_combo_test');
    await wait(1000);
    const midHits = ms.swingFx.spawnedTotal - swings0;
    await wait(900); // past durationMs → the state must end
    const ended = ms.comboUltimate === null;
    const totalDrop = hp0 - a.health.current;
    const finalHits = ms.swingFx.spawnedTotal - swings0;
    await wait(300);
    const noMore = ms.swingFx.spawnedTotal - swings0 === finalHits;
    for (const t of ms.skillTimed) t.endsAt = 0; // clean the test buff
    a.destroy();
    return { setup: 'ok', buffOn, midHits, totalDrop, ended, noMore };
  });
  ok(
    'bard ext — combo ultimate: rapid auto-chained strikes + a buff, ending on time',
    comboRun.setup === 'ok' && comboRun.buffOn && comboRun.midHits >= 3 && comboRun.totalDrop > 0 && comboRun.ended && comboRun.noMore,
    JSON.stringify(comboRun),
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

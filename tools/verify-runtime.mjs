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
    bard: { world: 'globe', zone: 'london-grey-chorus', opener: 'lon-01-mentor', kind: 'region' },
    witchdoctor: { world: 'globe', zone: 'kinshasa-river-drum', opener: 'kin-01-mentor', kind: 'region' },
    samurai: { world: 'globe', zone: 'kyoto-thousand-gates', opener: 'kyo-01-mentor', kind: 'region' },
    monk: { world: 'globe', zone: 'lhasa-prayer-citadel', opener: 'lha-01-mentor', kind: 'region' },
    assassin: { world: 'globe', zone: 'dubai-glass-souk', opener: 'dub-01-mentor', kind: 'region' },
    priest: { world: 'globe', zone: 'rome-eternal-seat', opener: 'rom-01-mentor', kind: 'region' },
    savage: { world: 'globe', zone: 'mexico-lake-crown', opener: 'mex-01-mentor', kind: 'region' },
    hunter: { world: 'globe', zone: 'sydney-harbour-watch', opener: 'syd-01-mentor', kind: 'region' },
    druid: { world: 'earth', zone: null, opener: 'honest-days-work', kind: 'earth' },
  };
  for (const cls of ['blacksmith', 'wizard', 'necromancer', 'mage', 'bard', 'witchdoctor', 'samurai', 'monk', 'assassin', 'priest', 'savage', 'hunter', 'druid']) {
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

    // 2n. REAL NECROMANCER ART (the first shipped 8-way sprite drop-in): all
    // eight rotation frames + the canonical key minted at the canonical 32×48,
    // and the avatar TURNS with its real movement facing (east / north / a
    // diagonal / south each select their frame through setDirection).
    if (cls === 'necromancer') {
      const necroArt = await page.evaluate(() => {
        const ms = window.__ready();
        const dirs = ['south', 'south-east', 'east', 'north-east', 'north', 'north-west', 'west', 'south-west'];
        const frames = dirs.every((d) => ms.textures.exists(`necro-figure-${d}`));
        const base = ms.textures.get('necro-figure').getSourceImage();
        const keyAt = (x, y) => {
          ms.player.setDirection(x, y);
          return ms.player.sprite.texture.key;
        };
        const east = keyAt(1, 0);
        const north = keyAt(0, -1);
        const diag = keyAt(1, 1);
        const south = keyAt(0, 1);
        ms.player.setDirection(0, 0); // stop — facing (and the frame) stay put
        return { applied: ms.spriteOverridesApplied, frames, size: [base.width, base.height], east, north, diag, south };
      });
      ok(
        'necromancer art: the 8-way sprite drop-in applied at canonical size and the avatar turns with its facing',
        necroArt.applied >= 1 &&
          necroArt.frames &&
          necroArt.size[0] === 32 &&
          necroArt.size[1] === 48 &&
          necroArt.east === 'necro-figure-east' &&
          necroArt.north === 'necro-figure-north' &&
          necroArt.diag === 'necro-figure-south-east' &&
          necroArt.south === 'necro-figure-south',
        JSON.stringify(necroArt),
      );
    }

    // A class WITHOUT rotation art keeps its single code-drawn texture no
    // matter how it moves (the fallback half of the 8-way contract).
    if (cls === 'blacksmith') {
      const singleTex = await page.evaluate(() => {
        const ms = window.__ready();
        ms.player.setDirection(1, 0);
        const k1 = ms.player.sprite.texture.key;
        ms.player.setDirection(0, -1);
        const k2 = ms.player.sprite.texture.key;
        ms.player.setDirection(0, 0);
        return { k1, k2 };
      });
      ok(
        'sprite fallback: a class without rotation art keeps its single texture while moving',
        singleTex.k1 === 'player-figure' && singleTex.k2 === 'player-figure',
        JSON.stringify(singleTex),
      );
    }

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

    // 2o. BARD RANGE DOCTRINE (Casey's ruling, permanent): Battle Resonance's
    // offense is MELEE ONLY — no projectiles, no ranged placements (Piercing
    // Whistle's SHORT cone is the sanctioned reach concession). Songs/Sonic
    // offense is RANGED — every damaging active projects or places at range
    // (Resonance Pulse's self-burst is the sanctioned peel; Sonic Surge and
    // Wall of Sound count as placements — the trail/wall lands away from the
    // Bard). Checked BOTH as data (the skill definitions) and LIVE (no Battle
    // skill ever puts a bolt in flight; Power Chord does).
    if (cls === 'bard') {
      const doctrine = await page.evaluate(async () => {
        const ms = window.__ready();
        const wait = (t) => new Promise((r) => setTimeout(r, t));
        if (!window.__quietSpot()) return { setup: 'no quiet spot' };
        const defs = ms.classSkillsAll['bard'].skills;
        const nonDamaging = ['bard_hum', 'bard_rally', 'bard_harmonics', 'bard_freq_shield', 'bard_amplify', 'bard_distortion'];
        const placements = ['bard_wall', 'bard_surge']; // ranged by placement (wall cells / dash trail)
        const violations = [];
        for (const d of defs) {
          const e = d.effect;
          if (e.kind !== 'active') continue;
          const steps = e.compose ?? [];
          if (d.tree === 'bard_battle') {
            if (steps.some((s) => s.p === 'bolt' || s.p === 'hazard' || s.at === 'ahead')) violations.push(`${d.id}: ranged step in the melee tree`);
            for (const s of steps) {
              if (s.p === 'cone' && s.range > 120) violations.push(`${d.id}: long cone in the melee tree`);
              if (s.p === 'chain' && s.range > 100) violations.push(`${d.id}: ranged chain in the melee tree`);
              if (s.p === 'strike' && s.at === 'front' && (s.range ?? 0) > 100) violations.push(`${d.id}: long strike in the melee tree`);
            }
          } else {
            if (nonDamaging.includes(e.action) || d.id === 'bard_sc_pulse') continue; // utility / the sanctioned peel
            const damaging = placements.includes(e.action) || steps.some((s) => (s.damage ?? 0) > 0 || (s.damageRaw ?? 0) > 0 || (s.damageMult ?? 0) > 0);
            const ranged =
              placements.includes(e.action) ||
              steps.some(
                (s) => s.p === 'bolt' || (s.at === 'ahead' && (s.range ?? s.placeAhead ?? 0) >= 180) || (s.p === 'cone' && s.range >= 200) || (s.p === 'chain' && s.range >= 300) || (s.p === 'hazard' && (s.placeAhead ?? 0) >= 180),
              );
            if (damaging && !ranged) violations.push(`${d.id}: melee resolution in a ranged tree`);
          }
        }
        // LIVE half: fire every Battle damaging active in an EMPTY field and watch
        // the projectile system — nothing may take flight (Heavy Swing's delayed
        // blow and War Song's opening beats are inside each window).
        let battleBolts = 0;
        for (const action of ['bard_mosh', 'bard_cascade', 'bard_whistle', 'bard_heavy_swing', 'bard_stage_dive', 'bard_coda', 'bard_war_song']) {
          ms.runActiveSkill(action);
          const t0 = Date.now();
          while (Date.now() - t0 < 750) {
            battleBolts = Math.max(battleBolts, ms.projectiles.count);
            await wait(80);
          }
        }
        ms.comboUltimate = null;
        for (const t of ms.skillTimed) if (t.id === 'bard_bt_war_song') t.endsAt = 0;
        // The CONTRAST: a Sonic skill genuinely projects.
        ms.player.facingX = 1;
        ms.player.facingY = 0;
        ms.runActiveSkill('bard_power_chord');
        const chordBolts = ms.projectiles.count;
        await wait(900); // let the chord land/expire before the next check
        return { setup: 'ok', violations, battleBolts, chordBolts };
      });
      ok(
        'bard range doctrine: Battle is melee-only (no projectile, ever); Songs/Sonic damage projects or places at range',
        doctrine.setup === 'ok' && doctrine.violations.length === 0 && doctrine.battleBolts === 0 && doctrine.chordBolts >= 1,
        JSON.stringify(doctrine),
      );

      // 2p. EVERY BARD COMMIT-1 EXTENSION THROUGH A REAL BARD SKILL, in the live
      // Bard session: Sonic Distortion (confusion), Coda (conditional finisher),
      // Pentatonic Overload (rotating riders), Resonance Cascade (strike-chain),
      // War Song (combo ultimate), and Sonic Echoes (armed by the REAL unlock,
      // repeating a real Dissonant Symphony hit with no further input).
      const bardKit = await page.evaluate(async () => {
        const ms = window.__ready();
        const wait = (t) => new Promise((r) => setTimeout(r, t));
        if (!window.__quietSpot()) return { setup: 'no quiet spot' };
        const spawnAt = (dx, dy) => {
          const w = ms.activeMap().nearestWalkableWorld(ms.player.x + dx, ms.player.y + dy);
          return ms.spawnAngel('darkcaster', w.x, w.y);
        };
        // SONIC DISTORTION → confusion (an 80% chance skill: retry a few beats).
        const a = spawnAt(120, 0);
        const b = spawnAt(170, 0);
        await wait(200);
        ms.stunEnemiesInRange(ms.player.x + 145, ms.player.y, 220, 2600); // pin the pair (kiting-proof)
        let turned = false;
        for (let i = 0; i < 6 && !turned; i++) {
          ms.runActiveSkill('bard_distortion');
          turned = ms.confused.size > 0;
        }
        ms.confused.clear();
        a.destroy();
        b.destroy();
        // CODA → the conditional finisher: ×2.5 into the stunned target.
        const stunned = spawnAt(80, 60);
        const fresh = spawnAt(80, -60);
        await wait(200);
        ms.stunEnemiesInRange(stunned.x, stunned.y, 30, 1500); // afflict ONE
        stunned.sprite.body.reset(ms.player.x + 80, ms.player.y + 60);
        fresh.sprite.body.reset(ms.player.x + 80, ms.player.y - 60);
        const h1 = stunned.health.current;
        const h2 = fresh.health.current;
        ms.runActiveSkill('bard_coda');
        await wait(100);
        // NOTE: the ×2.5 blow can EXCEED the darkcaster's max HP — death clamps the
        // drop, so assert "clearly amplified", not the exact multiplier (3z-3 owns that).
        const codaRatio = (h1 - stunned.health.current) / Math.max(0.001, h2 - fresh.health.current);
        stunned.destroy();
        fresh.destroy();
        // PENTATONIC OVERLOAD → rotating riders: one cast, DIFFERENT riders land —
        // damage + the slow bolt + the weaken bolt. (The stun bolt is racy to observe:
        // the knockback bolt's own 200ms mini-stun can overwrite its timer — 3z-4
        // owns per-rider exactness.)
        const c = spawnAt(200, 0);
        await wait(200);
        ms.player.facingX = c.x >= ms.player.x ? 1 : -1;
        ms.player.facingY = 0;
        const hpC = c.health.current;
        ms.runActiveSkill('bard_pentatonic');
        await wait(700); // flight + impacts
        const riders = { hit: hpC - c.health.current > 0, slow: ms.slowedEnemies.has(c), weaken: ms.time.now < ms.poisonWeakenUntil && ms.poisonWeakenFactor > 0 };
        ms.poisonWeakenUntil = 0;
        ms.poisonWeakenFactor = 0;
        c.destroy();
        // RESONANCE CASCADE → the melee strike-chain: three foes, falloff, a crescent per hop.
        const foes = [spawnAt(70, 0), spawnAt(180, 0), spawnAt(290, 0)];
        await wait(200);
        ms.stunEnemiesInRange(ms.player.x + 180, ms.player.y, 400, 2500); // casters kite: pin the line
        foes.forEach((f, i) => f.sprite.body.reset(ms.player.x + 70 + i * 110, ms.player.y));
        ms.player.facingX = 1;
        ms.player.facingY = 0;
        const hp0 = foes.map((f) => f.health.current);
        const swings0 = ms.swingFx.spawnedTotal;
        ms.runActiveSkill('bard_cascade');
        await wait(150);
        const drops = foes.map((f, i) => hp0[i] - f.health.current);
        const cascade = { falls: drops.every((d) => d > 0) && drops[0] > drops[1] && drops[1] > drops[2], swings: ms.swingFx.spawnedTotal - swings0 };
        for (const f of foes) f.destroy();
        // WAR SONG → the combo ultimate: the buff runs and strikes auto-chain on the beat.
        const w1 = spawnAt(60, 0);
        await wait(200);
        ms.stunEnemiesInRange(w1.x, w1.y, 400, 3000);
        w1.sprite.body.reset(ms.player.x + 60, ms.player.y); // pin in melee reach for the beats
        const hpW = w1.health.current;
        const swingsW = ms.swingFx.spawnedTotal;
        ms.runActiveSkill('bard_war_song');
        const warBuff = ms.skillTimed.some((t) => t.id === 'bard_bt_war_song');
        await wait(1600); // ~3 beats at 450ms
        const war = { buff: warBuff, beats: ms.swingFx.spawnedTotal - swingsW, drop: hpW - w1.health.current };
        ms.comboUltimate = null;
        for (const t of ms.skillTimed) if (t.id === 'bard_bt_war_song') t.endsAt = 0;
        w1.destroy();
        // SONIC ECHOES → the echo extension, armed by the REAL unlock path.
        const defs = ms.classSkillsAll['bard'].skills;
        ms.skills.awardPoints(3);
        for (const id of ['bard_sc_blast', 'bard_sc_pulse', 'bard_sc_echoes']) {
          if (!ms.skills.isUnlocked(id)) ms.skills.unlock(defs.find((d) => d.id === id));
        }
        const echoArmed = Math.abs(ms.echoPct - 0.35) < 1e-6;
        const e1 = spawnAt(200, 0);
        await wait(200);
        ms.stunEnemiesInRange(e1.x, e1.y, 40, 2500); // hold it so the delayed echo lands
        e1.sprite.body.reset(ms.player.x + 200, ms.player.y);
        ms.player.facingX = 1;
        ms.player.facingY = 0;
        const hpE = e1.health.current;
        ms.runActiveSkill('bard_dissonant');
        await wait(150);
        const echoInitial = hpE - e1.health.current;
        await wait(650); // past the 380ms echo delay
        const echoTotal = hpE - e1.health.current;
        e1.destroy();
        ms.confused.clear();
        ms.playerHealth.full();
        return { setup: 'ok', turned, codaRatio: +codaRatio.toFixed(2), riders, cascade, war, echoArmed, echoInitial, echoTotal };
      });
      ok(
        'bard: every framework extension fires through a real Bard skill',
        bardKit.setup === 'ok' &&
          bardKit.turned &&
          bardKit.codaRatio > 1.8 &&
          bardKit.riders.hit &&
          bardKit.riders.weaken &&
          bardKit.riders.slow &&
          bardKit.cascade.falls &&
          bardKit.cascade.swings === 3 &&
          bardKit.war.buff &&
          bardKit.war.beats >= 2 &&
          bardKit.war.drop > 0 &&
          bardKit.echoArmed &&
          bardKit.echoInitial > 0 &&
          bardKit.echoTotal > bardKit.echoInitial,
        JSON.stringify(bardKit),
      );
    }

    // 2q. EVERY WITCH DOCTOR EXTENSION THROUGH A REAL SKILL, in the live Witch
    // Doctor session: Voodoo Doll (bind + the mirror % measured on a live target),
    // Shadow Stitch armed by the REAL unlock path (the splash hits a neighbor),
    // Spirit Projection (the decoy draws real aggro), and Spirit Split (both
    // halves run). Plus the DECAY-TINT check: every Alchemy of Decay skill
    // declares its decayDomain and its declared FX tints carry the SHIPPED domain
    // colors (red/blue/violet). Cosmetic only — no combat-triangle mechanics.
    if (cls === 'witchdoctor') {
      const wdKit = await page.evaluate(async () => {
        const ms = window.__ready();
        const wait = (t) => new Promise((r) => setTimeout(r, t));
        if (!window.__quietSpot()) return { setup: 'no quiet spot' };
        ms.summons.clear();
        const spawnAt = (dx, dy) => {
          const w = ms.activeMap().nearestWalkableWorld(ms.player.x + dx, ms.player.y + dy);
          return ms.spawnAngel('darkcaster', w.x, w.y);
        };
        // VOODOO DOLL (the real skill): bind a FAR pinned target (inside the
        // skill's 340px cast range, far beyond any melee reach) — the cast hits,
        // then a strike on the doll mirrors exactly mirrorPct (0.6 × raw 20 = 12).
        const a = spawnAt(300, 0);
        await wait(200);
        ms.stunEnemiesInRange(a.x, a.y, 40, 9000);
        ms.player.facingX = 1;
        ms.player.facingY = 0;
        const hp0 = a.health.current;
        ms.runActiveSkill('wd_doll');
        const initial = hp0 - a.health.current;
        const bound = !!ms.voodoo && ms.voodoo.target === a;
        ms.runComposedSteps([{ p: 'strike', at: 'front', range: 70, damageRaw: 20, tint: 0xc9a05a }]);
        await wait(120);
        const mirrored = hp0 - a.health.current - initial;
        // SHADOW STITCH through the REAL unlock path (doll → … → stitch), then the
        // mirror splashes the bound target's neighbor at stitchPct.
        const defs = ms.classSkillsAll['witchdoctor'].skills;
        ms.skills.awardPoints(6);
        for (const id of ['wd_vd_doll', 'wd_vd_decoy', 'wd_vd_vision', 'wd_vd_shackles', 'wd_vd_hex', 'wd_vd_stitch']) {
          if (!ms.skills.isUnlocked(id)) ms.skills.unlock(defs.find((d) => d.id === id));
        }
        const stitchArmed = !!ms.voodooStitch;
        const b = spawnAt(440, 50);
        await wait(200);
        ms.stunEnemiesInRange(b.x, b.y, 40, 6000);
        b.sprite.body.reset(a.x + 60, a.y + 30);
        const hpA = a.health.current;
        const hpB = b.health.current;
        ms.runComposedSteps([{ p: 'strike', at: 'front', range: 70, damageRaw: 20, tint: 0xc9a05a }]);
        await wait(120);
        const stitch = { toTarget: hpA - a.health.current, toNeighbor: hpB - b.health.current };
        b.destroy();
        // SPIRIT PROJECTION (the real skill): the decoy draws a real enemy's aggro.
        const e = spawnAt(-150, 0);
        await wait(200);
        ms.stunEnemiesInRange(e.x, e.y, 40, 6000);
        ms.runActiveSkill('wd_decoy');
        const decoy = ms.summons.list.find((s) => s.config.key === 'wd_decoy') ?? null;
        await wait(700); // past the aggro re-eval interval
        const t1 = ms.enemyAggroTarget(e, e.x, e.y);
        const decoyDraws = decoy ? Math.hypot(t1.x - decoy.x, t1.y - decoy.y) < 60 : false;
        e.destroy();
        ms.summons.clearKey('wd_decoy');
        // SPIRIT SPLIT (the real skill): the decoy walks + the doll auto-pulses
        // into the (still pinned, still bound) target with no strike.
        ms.stunEnemiesInRange(a.x, a.y, 40, 6000);
        const hpS = a.health.current;
        ms.runActiveSkill('wd_spirit_split');
        const splitOn = ms.spiritSplit !== null && ms.summons.list.some((s) => s.config.key === 'wd_decoy');
        await wait(1600); // ~2 pulses at 700ms
        const pulsed = hpS - a.health.current;
        ms.spiritSplit = null;
        a.destroy();
        ms.summons.clear();
        ms.voodoo = null;
        ms.playerHealth.full();
        return { setup: 'ok', bound, initial, mirrored, stitchArmed, stitch, decoyDraws, splitOn, pulsed };
      });
      ok(
        'witchdoctor: doll mirror % + stitch splash + decoy aggro + spirit split, each through the real skill',
        wdKit.setup === 'ok' &&
          wdKit.bound &&
          wdKit.initial > 0 &&
          wdKit.mirrored === 12 &&
          wdKit.stitchArmed &&
          wdKit.stitch.toTarget === 12 &&
          wdKit.stitch.toNeighbor === 6 &&
          wdKit.decoyDraws &&
          wdKit.splitOn &&
          wdKit.pulsed > 0,
        JSON.stringify(wdKit),
      );

      // 2r. DECAY DOMAINS (Casey's ruling, permanent — COSMETIC ONLY): all ten
      // Alchemy of Decay skills declare a decayDomain, and every DECLARED FX tint
      // (compose tints/strokes/DoT colors + buff/transformation tints) carries its
      // domain's SHIPPED color. Bespoke casts without declared data (Brew's ring,
      // the Nova's tri-tint) draw their rings from DOMAIN_TINT in their dispatcher
      // cases — by construction, they cannot drift from canon.
      const decay = await page.evaluate(() => {
        const ms = window.__game.scene.getScene('MainScene');
        const DOMAIN = { physical: 0xe04a3a, mental: 0x3a6de0, spiritual: 0x9a4ae0 }; // the shipped canon (enemy-roster)
        const skills = ms.classSkillsAll['witchdoctor'].skills.filter((d) => d.tree === 'wd_decay');
        const missing = skills.filter((d) => !d.decayDomain).map((d) => d.id);
        const bad = [];
        for (const d of skills) {
          if (!d.decayDomain || d.decayDomain === 'all') continue;
          const want = DOMAIN[d.decayDomain];
          const tints = [];
          const e = d.effect;
          if (e.tint !== undefined) tints.push(e.tint);
          for (const st of e.compose ?? []) {
            for (const k of ['tint', 'stroke']) if (st[k] !== undefined) tints.push(st[k]);
            if (st.dot?.color !== undefined) tints.push(st.dot.color);
          }
          if (tints.length > 0 && !tints.includes(want)) bad.push(`${d.id}: declared tints miss the ${d.decayDomain} color`);
        }
        const allDomains = skills.filter((d) => d.decayDomain === 'all').map((d) => d.id);
        return { count: skills.length, missing, bad, allDomains };
      });
      ok(
        'witchdoctor decay domains: all 10 Alchemy skills declare a domain; declared FX tints carry the shipped colors',
        decay.count === 10 && decay.missing.length === 0 && decay.bad.length === 0 && decay.allDomains.length === 2,
        JSON.stringify(decay),
      );
    }

    // 2s. EVERY SAMURAI EXTENSION THROUGH A REAL SKILL, in the live Samurai
    // session: Parry (the real skill's window negates a live wolf's hit and the
    // riposte lands), Iaijutsu (its multiplier MEASURED against the same real
    // strike unbuffed), stance exclusivity (the three real toggles through the
    // real activation path), and Perfect Form (auto-parrying a real pack while
    // the blade keeps swinging).
    if (cls === 'samurai') {
      const samKit = await page.evaluate(async () => {
        const ms = window.__ready();
        const wait = (t) => new Promise((r) => setTimeout(r, t));
        if (!window.__quietSpot()) return { setup: 'no quiet spot' };
        // PARRY through the real skill: the window negates a live wolf's hit.
        ms.playerHealth.shield = 0;
        ms.playerHealth.full();
        const wolf = ms.spawnTownsfolk(ms.player.x + 60, ms.player.y, null, 'wolf');
        await wait(200);
        const hp0 = ms.playerHealth.current;
        const wolfHp0 = wolf.health.current;
        const count0 = ms.parryCount;
        ms.runActiveSkill('sam_parry');
        const windowOpen = ms.parry !== null;
        ms.onTownsfolkHitPlayer(wolf); // the wolf's REAL melee hit path
        const parry = { windowOpen, negated: ms.playerHealth.current === hp0, riposte: wolfHp0 - wolf.health.current, counted: ms.parryCount === count0 + 1 };
        if (wolf.isAlive) wolf.takeHit(1e9);
        ms.playerHealth.shield = 1e9;
        // IAIJUTSU: the SAME real strike measured unbuffed, then sheathed — the
        // ratio is the multiplier (2.5), the hit stuns, the buff consumes.
        const w = ms.activeMap().nearestWalkableWorld(ms.player.x + 60, ms.player.y);
        const a = ms.spawnAngel('darkcaster', w.x, w.y);
        await wait(200);
        a.sprite.body.reset(ms.player.x + 60, ms.player.y);
        ms.player.facingX = 1;
        ms.player.facingY = 0;
        const b0 = a.health.current;
        ms.runActiveSkill('sam_first_cut');
        await wait(100);
        const base = b0 - a.health.current;
        a.destroy();
        // The sheathed measurement lands on a FRESH foe (2.5× First Cut would
        // overkill what the base measurement already wounded).
        const a2 = ms.spawnAngel('darkcaster', w.x, w.y);
        await wait(200);
        a2.sprite.body.reset(ms.player.x + 60, ms.player.y);
        ms.runActiveSkill('sam_iaijutsu');
        const b1 = a2.health.current;
        ms.runActiveSkill('sam_first_cut');
        await wait(100);
        const iai = { base, sheathed: b1 - a2.health.current, stunned: ms.stunnedEnemies.has(a2), consumed: ms.iaijutsu === null };
        a2.destroy();
        // STANCE EXCLUSIVITY through the REAL activation path (unlock → activateSkill):
        // entering each stance exits the previous; re-casting the active one exits it.
        const defs = ms.classSkillsAll['samurai'].skills;
        ms.skills.awardPoints(4);
        for (const id of ['sam_st_guard_break', 'sam_st_water', 'sam_st_stone', 'sam_st_fire']) {
          if (!ms.skills.isUnlocked(id)) ms.skills.unlock(defs.find((d) => d.id === id));
        }
        const active = () => ['sam_st_water', 'sam_st_stone', 'sam_st_fire'].filter((id) => ms.skillTimed.some((t) => t.id === id));
        ms.activateSkill('sam_st_water');
        const s1 = active();
        ms.activateSkill('sam_st_stone');
        const s2 = active();
        ms.activateSkill('sam_st_fire');
        const s3 = active();
        ms.activateSkill('sam_st_fire'); // toggle OFF — no stance remains
        const s4 = active();
        const stances = { s1: s1.join(','), s2: s2.join(','), s3: s3.join(','), s4: s4.join(',') };
        // PERFECT FORM under a REAL pack: three wolves' hits all auto-parry while
        // the blade keeps swinging freely.
        ms.playerHealth.shield = 0;
        ms.playerHealth.full();
        const pack = [0, 1, 2].map((i) => ms.spawnTownsfolk(ms.player.x + 50 + i * 30, ms.player.y + (i - 1) * 40, null, 'wolf'));
        await wait(250);
        const countP = ms.parryCount;
        ms.runActiveSkill('sam_perfect_form');
        const formBuff = ms.skillTimed.some((t) => t.id === 'sam_st_perfect');
        // Per-hit SYNCHRONOUS deltas: each parried wolf hit must remove exactly 0
        // HP (a stray ranged enemy wandering in mid-wait can't pollute this).
        let taken = 0;
        for (const p of pack) {
          const before = ms.playerHealth.current;
          ms.onTownsfolkHitPlayer(p); // each wolf's REAL hit, auto-parried
          taken += before - ms.playerHealth.current;
          ms.runActiveSkill('sam_first_cut'); // the player never stops acting
          await wait(120);
        }
        const form = { formBuff, untouched: taken === 0, parries: ms.parryCount - countP };
        ms.perfectFormUntil = 0;
        for (const t of ms.skillTimed) t.endsAt = 0;
        for (const p of pack) if (p.isAlive) p.takeHit(1e9);
        ms.playerHealth.full();
        ms.playerHealth.shield = 1e9;
        return { setup: 'ok', parry, iai, stances, form };
      });
      ok(
        'samurai: parry vs a live wolf + iaijutsu ratio + stance exclusivity + perfect form, each through the real skill',
        samKit.setup === 'ok' &&
          samKit.parry.windowOpen &&
          samKit.parry.negated &&
          samKit.parry.riposte > 0 &&
          samKit.parry.counted &&
          samKit.iai.base > 0 &&
          Math.abs(samKit.iai.sheathed / samKit.iai.base - 2.5) < 0.05 &&
          samKit.iai.stunned &&
          samKit.iai.consumed &&
          samKit.stances.s1 === 'sam_st_water' &&
          samKit.stances.s2 === 'sam_st_stone' &&
          samKit.stances.s3 === 'sam_st_fire' &&
          samKit.stances.s4 === '' &&
          samKit.form.formBuff &&
          samKit.form.untouched &&
          samKit.form.parries === 3,
        JSON.stringify(samKit),
      );
    }

    // 2t. EVERY MONK EXTENSION THROUGH A REAL MONK SKILL, in the live Monk
    // session: Deflect (the real skill turns aside a live caster's bolt AND a
    // live wolf's bite), Astral Projection (the real decoy), Chi Explosion
    // (measured BOTH ways — the foe wounded, the caster + decoy mended in one
    // cast), Prayer Wheel (ticking, then FOLLOWING the moving caster), and
    // Life Infusion through the REAL unlock chain + activation path — including
    // the ALLY-RULE whiff refund (no ally → cooldown + Chi returned).
    if (cls === 'monk') {
      const monkKit = await page.evaluate(async () => {
        const ms = window.__ready();
        const wait = (t) => new Promise((r) => setTimeout(r, t));
        if (!window.__quietSpot()) return { setup: 'no quiet spot' };
        ms.summons.clear();
        const spawnAt = (dx, dy) => {
          const w = ms.activeMap().nearestWalkableWorld(ms.player.x + dx, ms.player.y + dy);
          return ms.spawnAngel('darkcaster', w.x, w.y);
        };
        // DEFLECT through the real skill vs a live caster's bolt: negated + a
        // half-scaled riposte on the nearest foe + the window consumed.
        const a = spawnAt(80, 0);
        await wait(200);
        ms.stunEnemiesInRange(a.x, a.y, 40, 9000); // pin the caster (no stray bolts)
        ms.playerHealth.shield = 0;
        ms.playerHealth.full();
        const hp0 = ms.playerHealth.current;
        const aHp0 = a.health.current;
        ms.runActiveSkill('monk_deflect');
        const windowOpen = ms.parry !== null && ms.parry.deflectProjectiles === true;
        ms.onProjectileHitPlayer(10); // the REAL ranged damage path
        const boltDeflect = { windowOpen, negated: ms.playerHealth.current === hp0, riposte: aHp0 - a.health.current, consumed: ms.parry === null };
        // The SAME real skill vs a live wolf's bite (the melee half).
        const wolf = ms.spawnTownsfolk(ms.player.x + 60, ms.player.y, null, 'wolf');
        await wait(200);
        const wHp0 = wolf.health.current;
        const hp1 = ms.playerHealth.current;
        ms.runActiveSkill('monk_deflect');
        ms.onTownsfolkHitPlayer(wolf); // the wolf's REAL melee hit path
        const biteDeflect = { negated: ms.playerHealth.current === hp1, riposte: wHp0 - wolf.health.current };
        if (wolf.isAlive) wolf.takeHit(1e9);
        // ASTRAL PROJECTION through the real skill: the spirit-self stands.
        ms.runActiveSkill('monk_astral');
        await wait(150);
        const decoy = ms.summons.list.find((u) => u.isAlive) ?? null;
        // CHI EXPLOSION measured BOTH ways in ONE cast: the pinned foe drops,
        // the wounded caster AND the wounded decoy both mend.
        const c = spawnAt(90, 40);
        await wait(200);
        ms.stunEnemiesInRange(c.x, c.y, 40, 9000);
        c.sprite.body.reset(ms.player.x + 80, ms.player.y + 40); // inside the nova
        let explosion = { foe: 0, self: 0, decoy: 0 };
        if (decoy) {
          decoy.sprite.body.reset(ms.player.x - 70, ms.player.y); // inside the heal
          decoy.health.current -= 20;
          ms.playerHealth.current -= 30;
          const cHp0 = c.health.current;
          const pHp0 = ms.playerHealth.current;
          const dHp0 = decoy.health.current;
          ms.runActiveSkill('monk_explosion');
          await wait(120);
          explosion = { foe: cHp0 - c.health.current, self: ms.playerHealth.current - pHp0, decoy: decoy.health.current - dHp0 };
        }
        // PRAYER WHEEL through the real skill: ticks beside the first foe, then
        // FOLLOWS the caster to a second foe far away.
        ms.playerHealth.full();
        const b = spawnAt(460, 0);
        await wait(150);
        ms.stunEnemiesInRange(b.x, b.y, 40, 9000);
        const aHp1 = a.health.current;
        ms.runActiveSkill('monk_wheel');
        await wait(900);
        const nearTicks = aHp1 - a.health.current;
        ms.player.sprite.body.reset(b.x - 60, b.y); // walk away — the wheel comes along
        const bHp0 = b.health.current;
        await wait(900);
        const followTicks = bHp0 - b.health.current;
        ms.pulseRing = null;
        // LIFE INFUSION through the REAL unlock chain + activation path: unlock
        // the Chi tree down to it, cast it at the wounded decoy, then verify the
        // ALLY-RULE refund when no ally stands.
        const defs = ms.classSkillsAll['monk'].skills;
        ms.skills.awardPoints(10);
        for (const id of ['monk_ch_wave', 'monk_ch_focus', 'monk_ch_soothe', 'monk_ch_tranquil', 'monk_ch_touch', 'monk_ch_aura', 'monk_ch_acupuncture', 'monk_ch_infusion']) {
          if (!ms.skills.isUnlocked(id)) ms.skills.unlock(defs.find((d) => d.id === id));
        }
        let infusion = { healed: 0, paid: 0, spentChi: 0, onCooldown: false };
        if (decoy) {
          ms.playerHealth.full();
          ms.energy.full();
          decoy.health.current = Math.max(1, decoy.health.max - 40);
          const dHp1 = decoy.health.current;
          const pHp1 = ms.playerHealth.current;
          const e0 = ms.energy.current;
          ms.activateSkill('monk_ch_infusion'); // the REAL activation path
          infusion = {
            healed: decoy.health.current - dHp1,
            paid: pHp1 - ms.playerHealth.current,
            spentChi: e0 - ms.energy.current,
            onCooldown: (ms.skillCooldownUntil['monk_ch_infusion'] ?? 0) > ms.time.now,
          };
        }
        // The WHIFF REFUND: no ally → the cast costs neither cooldown nor Chi.
        ms.summons.clear();
        ms.skillCooldownUntil['monk_ch_infusion'] = 0;
        ms.playerHealth.full();
        ms.energy.full();
        const e1 = ms.energy.current;
        const pHp2 = ms.playerHealth.current;
        ms.activateSkill('monk_ch_infusion');
        const whiff = {
          cooldownRefunded: (ms.skillCooldownUntil['monk_ch_infusion'] ?? 0) === 0,
          chiRefunded: ms.energy.current === e1,
          hpUntouched: ms.playerHealth.current === pHp2,
        };
        a.destroy();
        b.destroy();
        c.destroy();
        ms.playerHealth.full();
        ms.playerHealth.shield = 1e9;
        return { setup: 'ok', boltDeflect, biteDeflect, decoyAlive: decoy !== null, explosion, nearTicks, followTicks, infusion, whiff };
      });
      ok(
        'monk: deflect vs a live bolt + bite, chi explosion both ways, prayer wheel on the move, life infusion + whiff refund — each through the real skill',
        monkKit.setup === 'ok' &&
          monkKit.boltDeflect.windowOpen &&
          monkKit.boltDeflect.negated &&
          monkKit.boltDeflect.riposte > 0 &&
          monkKit.boltDeflect.consumed &&
          monkKit.biteDeflect.negated &&
          monkKit.biteDeflect.riposte > 0 &&
          monkKit.decoyAlive &&
          monkKit.explosion.foe > 0 &&
          monkKit.explosion.self > 0 &&
          monkKit.explosion.decoy > 0 &&
          monkKit.nearTicks > 0 &&
          monkKit.followTicks > 0 &&
          monkKit.infusion.healed > 0 &&
          monkKit.infusion.paid > 0 &&
          monkKit.infusion.spentChi > 0 &&
          monkKit.infusion.onCooldown &&
          monkKit.whiff.cooldownRefunded &&
          monkKit.whiff.chiRefunded &&
          monkKit.whiff.hpUntouched,
        JSON.stringify(monkKit),
      );
    }

    // 2u. EVERY ASSASSIN EXTENSION THROUGH A REAL ASSASSIN SKILL, in the live
    // Assassin session: Blade Trap (the real skill's device kills a live wolf
    // while the player stands far apart), the stealth bonus (Silent Blade
    // measured stealthed vs unstealthed), Ambush (whiff-refunded unhidden
    // through the REAL unlock + activation path; devastating from stealth),
    // Shadow Dance (three real strikes, stealth intact), and Trick Shot
    // (ricocheting through a real pack with falloff).
    if (cls === 'assassin') {
      const asnKit = await page.evaluate(async () => {
        const ms = window.__ready();
        const wait = (t) => new Promise((r) => setTimeout(r, t));
        if (!window.__quietSpot()) return { setup: 'no quiet spot' };
        const spawnAt = (dx, dy) => {
          const w = ms.activeMap().nearestWalkableWorld(ms.player.x + dx, ms.player.y + dy);
          return ms.spawnAngel('darkcaster', w.x, w.y);
        };
        // BLADE TRAP through the real skill: place it, walk AWAY, and let a live
        // wolf spring it — the snap kills while the player stands apart.
        ms.player.facingX = 1;
        ms.player.facingY = 0;
        ms.runActiveSkill('asn_blade_trap');
        const trap = ms.traps[0] ?? null;
        const tx = trap ? trap.x : 0;
        const ty = trap ? trap.y : 0;
        const w0 = ms.activeMap().nearestWalkableWorld(ms.player.x - 320, ms.player.y);
        ms.player.sprite.body.reset(w0.x, w0.y); // stand apart
        await wait(900); // the device arms
        const wolf = ms.spawnTownsfolk(tx, ty, null, 'wolf'); // it steps in
        await wait(600);
        const bladeTrap = {
          placed: trap !== null,
          apart: Math.hypot(ms.player.x - tx, ms.player.y - ty) > 250,
          wolfDead: !wolf.isAlive,
          consumed: ms.traps.length === 0,
        };
        if (wolf.isAlive) wolf.takeHit(1e9);
        // STEALTH BONUS through the real skill: Silent Blade unstealthed, then
        // the SAME skill from stealth on a FRESH foe — the ratio is the bonus.
        const hitWith = async (action) => {
          const f = spawnAt(80, 0);
          await wait(200);
          ms.stunEnemiesInRange(f.x, f.y, 60, 30000);
          f.sprite.body.reset(ms.player.x + 60, ms.player.y);
          ms.player.facingX = 1;
          ms.player.facingY = 0;
          const hp0 = f.health.current;
          ms.runActiveSkill(action);
          await wait(120);
          const drop = hp0 - f.health.current;
          f.destroy();
          return drop;
        };
        const baseDrop = await hitWith('asn_silent_blade');
        ms.startPlayerStealth(6000);
        const stealthDrop = await hitWith('asn_silent_blade');
        const rider = { baseDrop, stealthDrop, ratio: stealthDrop / baseDrop, broke: !ms.playerStealthActive };
        // AMBUSH through the REAL unlock + activation path: unhidden it whiffs
        // and refunds (cooldown + energy); from stealth it lands the payoff.
        const defs = ms.classSkillsAll['assassin'].skills;
        ms.skills.awardPoints(4);
        for (const id of ['asn_sh_silent', 'asn_sh_cloak', 'asn_sh_ambush']) {
          if (!ms.skills.isUnlocked(id)) ms.skills.unlock(defs.find((d) => d.id === id));
        }
        ms.breakPlayerStealth();
        ms.energy.full();
        const e0 = ms.energy.current;
        ms.activateSkill('asn_sh_ambush'); // unhidden → the moment passes unspent
        const whiff = { cooldownRefunded: (ms.skillCooldownUntil['asn_sh_ambush'] ?? 0) === 0, energyRefunded: ms.energy.current === e0 };
        ms.startPlayerStealth(6000);
        const ambushDrop = await hitWith('asn_ambush');
        const ambush = { ...whiff, drop: ambushDrop, consumedStealth: !ms.playerStealthActive };
        // SHADOW DANCE through the real skill: three Silent Blades on fresh
        // foes — every one carries the bonus and stealth holds throughout.
        ms.runActiveSkill('asn_shadow_dance');
        const danceOn = ms.playerStealthActive;
        const danceDrops = [];
        for (let i = 0; i < 3; i++) danceDrops.push(await hitWith('asn_silent_blade'));
        const dance = { danceOn, drops: danceDrops, stillHidden: ms.playerStealthActive };
        ms.shadowDanceUntil = 0;
        ms.breakPlayerStealth();
        // TRICK SHOT through a real pack: three pinned foes in a line — the
        // ricochet reaches all three, losing edge per bounce.
        const p1 = spawnAt(90, 0);
        const p2 = spawnAt(190, 40);
        const p3 = spawnAt(290, -30);
        await wait(250);
        for (const f of [p1, p2, p3]) ms.stunEnemiesInRange(f.x, f.y, 60, 30000);
        const hps = [p1, p2, p3].map((f) => f.health.current);
        ms.runActiveSkill('asn_trick');
        await wait(200);
        const drops = [p1, p2, p3].map((f, i) => hps[i] - f.health.current).sort((a, b) => b - a);
        const trick = { hitAll: drops.every((d) => d > 0), falloff: drops[0] > drops[1] && drops[1] > drops[2] };
        p1.destroy();
        p2.destroy();
        p3.destroy();
        ms.playerHealth.full();
        ms.playerHealth.shield = 1e9;
        return { setup: 'ok', bladeTrap, rider, ambush, dance, trick };
      });
      ok(
        'assassin: blade trap kills a live wolf from apart, ambush whiff-refunds unhidden + lands from stealth, shadow dance holds, trick shot ricochets a real pack',
        asnKit.setup === 'ok' &&
          asnKit.bladeTrap.placed &&
          asnKit.bladeTrap.apart &&
          asnKit.bladeTrap.wolfDead &&
          asnKit.bladeTrap.consumed &&
          asnKit.rider.baseDrop > 0 &&
          Math.abs(asnKit.rider.ratio - 1.8) < 0.05 &&
          asnKit.rider.broke &&
          asnKit.ambush.cooldownRefunded &&
          asnKit.ambush.energyRefunded &&
          asnKit.ambush.drop > asnKit.rider.baseDrop * 2 &&
          asnKit.ambush.consumedStealth &&
          asnKit.dance.danceOn &&
          asnKit.dance.drops.every((d) => asnKit.rider.baseDrop > 0 && Math.abs(d / asnKit.rider.baseDrop - 1.8) < 0.05) &&
          asnKit.dance.stillHidden &&
          asnKit.trick.hitAll &&
          asnKit.trick.falloff,
        JSON.stringify(asnKit),
      );
    }

    // 2v. EVERY PRIEST EXTENSION THROUGH A REAL PRIEST SKILL, in the live
    // Priest session: Shield of Faith (the real skill wraps the solo caster and
    // a live wolf's bite is absorbed whole), Beacon of Light (ONE channel
    // measured healing the wounded caster AND burning the pinned foe in the
    // beam), and Divine Intervention (through the REAL unlock + activation
    // path: party-dormant, it whiff-refunds cooldown, Faith and life).
    if (cls === 'priest') {
      const prsKit = await page.evaluate(async () => {
        const ms = window.__ready();
        const wait = (t) => new Promise((r) => setTimeout(r, t));
        if (!window.__quietSpot()) return { setup: 'no quiet spot' };
        ms.summons.clear();
        ms.clearDots();
        // SHIELD OF FAITH through the real skill: solo → the caster; the bite
        // meets the light, not the flesh.
        ms.playerHealth.shield = 0;
        ms.playerHealth.full();
        ms.runActiveSkill('prs_shield_faith');
        const shielded = ms.playerHealth.shield;
        const wolf = ms.spawnTownsfolk(ms.player.x + 60, ms.player.y, null, 'wolf');
        await wait(200);
        const hp0 = ms.playerHealth.current;
        ms.onTownsfolkHitPlayer(wolf); // the wolf's REAL melee hit path
        const faith = { shielded, untouched: ms.playerHealth.current === hp0, spent: ms.playerHealth.shield < shielded };
        if (wolf.isAlive) wolf.takeHit(1e9);
        ms.playerHealth.shield = 0;
        // BEACON OF LIGHT through the real skill: one channel, both halves.
        const w = ms.activeMap().nearestWalkableWorld(ms.player.x + 140, ms.player.y);
        const foe = ms.spawnAngel('darkcaster', w.x, w.y);
        await wait(200);
        ms.stunEnemiesInRange(foe.x, foe.y, 60, 30000);
        foe.sprite.body.reset(ms.player.x + 140, ms.player.y);
        ms.player.facingX = 1;
        ms.player.facingY = 0;
        ms.playerHealth.full();
        ms.playerHealth.current -= 40;
        const pHp0 = ms.playerHealth.current;
        const fHp0 = foe.health.current;
        ms.runActiveSkill('prs_beacon');
        const started = ms.dualChannel !== null;
        await wait(1300);
        const beacon = { started, healed: ms.playerHealth.current - pHp0, burned: fHp0 - foe.health.current };
        foe.destroy();
        // DIVINE INTERVENTION through the REAL unlock + activation path:
        // party-dormant, the whiff refunds cooldown + Faith, and the life
        // price is never taken.
        const defs = ms.classSkillsAll['priest'].skills;
        ms.skills.awardPoints(10);
        for (const id of ['prs_li_ray', 'prs_li_shield', 'prs_li_retribution', 'prs_li_embrace', 'prs_li_radiant', 'prs_li_barrier', 'prs_li_fortress', 'prs_li_blessing', 'prs_li_intervention']) {
          if (!ms.skills.isUnlocked(id)) ms.skills.unlock(defs.find((d) => d.id === id));
        }
        ms.energy.full();
        ms.playerHealth.full();
        const e0 = ms.energy.current;
        const h0 = ms.playerHealth.current;
        ms.activateSkill('prs_li_intervention');
        const intervene = {
          cooldownRefunded: (ms.skillCooldownUntil['prs_li_intervention'] ?? 0) === 0,
          faithRefunded: ms.energy.current === e0,
          lifeUnspent: ms.playerHealth.current === h0,
        };
        ms.clearPriestState();
        ms.playerHealth.full();
        ms.playerHealth.shield = 1e9;
        return { setup: 'ok', faith, beacon, intervene };
      });
      ok(
        'priest: shield of faith absorbs a live bite, beacon of light heals + burns in one channel, divine intervention whiff-refunds — each through the real skill',
        prsKit.setup === 'ok' &&
          prsKit.faith.shielded === 40 &&
          prsKit.faith.untouched &&
          prsKit.faith.spent &&
          prsKit.beacon.started &&
          prsKit.beacon.healed >= 10 &&
          prsKit.beacon.burned >= 12 &&
          prsKit.intervene.cooldownRefunded &&
          prsKit.intervene.faithRefunded &&
          prsKit.intervene.lifeUnspent,
        JSON.stringify(prsKit),
      );
    }

    // 2w. EVERY SAVAGE EXTENSION THROUGH A REAL SAVAGE SKILL, in the live
    // Savage session: Savage Leap (the real skill jumps + slams + downs a live
    // foe), Crimson Nova through the REAL unlock + activation path (blood paid
    // at full health; the rite REFUSES + refunds at low blood), Headtaker (the
    // execute measured both ways in one swing), Warrior's Momentum (the real
    // keyed passive grows four real slashes), and the Jaguar + Pack Bond.
    if (cls === 'savage') {
      const savKit = await page.evaluate(async () => {
        const ms = window.__ready();
        const wait = (t) => new Promise((r) => setTimeout(r, t));
        if (!window.__quietSpot()) return { setup: 'no quiet spot' };
        ms.summons.clear();
        const spawnAt = (dx, dy) => {
          const w = ms.activeMap().nearestWalkableWorld(ms.player.x + dx, ms.player.y + dy);
          return ms.spawnAngel('darkcaster', w.x, w.y);
        };
        const defs = ms.classSkillsAll['savage'].skills;
        ms.skills.awardPoints(12);
        const unlock = (ids) => {
          for (const id of ids) if (!ms.skills.isUnlocked(id)) ms.skills.unlock(defs.find((d) => d.id === id));
        };
        // SAVAGE LEAP through the real skill: jump 220, slam, knockdown.
        const a = spawnAt(220, 0);
        await wait(250);
        const from = { x: ms.player.x, y: ms.player.y };
        ms.player.facingX = 1;
        ms.player.facingY = 0;
        a.sprite.body.reset(from.x + 220, from.y);
        const aHp0 = a.health.current;
        ms.runActiveSkill('sav_leap');
        const leap = { moved: Math.hypot(ms.player.x - from.x, ms.player.y - from.y), hit: aHp0 - a.health.current > 0, down: (ms.stunnedEnemies.get(a) ?? 0) > ms.time.now };
        a.destroy();
        // CRIMSON NOVA through the REAL unlock + activation path: the blood is
        // paid at full health; at low blood the rite refuses and refunds.
        unlock(['sav_br_spike', 'sav_br_veins', 'sav_br_crimson']);
        const b = spawnAt(90, 0);
        await wait(200);
        ms.stunEnemiesInRange(b.x, b.y, 60, 30000);
        b.sprite.body.reset(ms.player.x + 90, ms.player.y);
        ms.playerHealth.shield = 0;
        ms.playerHealth.full();
        ms.energy.full();
        const hp0 = ms.playerHealth.current;
        const bHp0 = b.health.current;
        ms.activateSkill('sav_br_crimson');
        // Read SYNCHRONOUSLY: the blood price + nova both resolve inside the
        // cast — an async window here let an in-flight dark-caster bolt land
        // on the player and bend the measured 15 (the old rare flake).
        const paidCast = { bloodPaid: hp0 - ms.playerHealth.current === 15, novaLanded: bHp0 - b.health.current > 0 };
        await wait(120);
        ms.skillCooldownUntil['sav_br_crimson'] = 0;
        ms.energy.full();
        ms.playerHealth.current = 10; // too thin for the 15-blood rite
        const e0 = ms.energy.current;
        const bHp1 = b.health.current;
        ms.activateSkill('sav_br_crimson');
        const refusal = {
          refused: ms.playerHealth.current === 10 && b.health.current === bHp1,
          cooldownRefunded: (ms.skillCooldownUntil['sav_br_crimson'] ?? 0) === 0,
          energyRefunded: ms.energy.current === e0,
        };
        ms.playerHealth.full();
        ms.playerHealth.shield = 1e9;
        // HEADTAKER through the real skill: one swing, both verdicts — the bled
        // foe under the 35% line is KILLED OUTRIGHT (the ×2 overkills what
        // little it had), the healthy one beside it takes exactly the base.
        const c = spawnAt(70, 40);
        await wait(200);
        for (const f of [b, c]) ms.stunEnemiesInRange(f.x, f.y, 60, 30000);
        b.sprite.body.reset(ms.player.x + 60, ms.player.y + 30);
        c.sprite.body.reset(ms.player.x + 60, ms.player.y - 30);
        b.health.current = Math.floor(b.health.max * 0.3);
        const cHp0 = c.health.current;
        ms.player.facingX = 1;
        ms.player.facingY = 0;
        ms.runActiveSkill('sav_headtaker');
        await wait(100);
        const execute = { lowKilled: !b.isAlive, healthyDrop: cHp0 - c.health.current, healthySurvived: c.isAlive };
        b.destroy();
        c.destroy();
        // BLOOD SCENT through the real keyed passive (Casey's re-spec): one
        // swing over TWO foes — the BLEEDING one takes ×1.2, the clean one the
        // base — measured synchronously off the same cast.
        unlock(['sav_jg_lunge', 'sav_jg_snarl', 'sav_jg_jaguar', 'sav_jg_hide', 'sav_jg_hunt', 'sav_jg_pack']);
        ms.recomputeSkillEffects();
        const scentArmed = ms.bloodScentBonus > 0;
        const s1 = spawnAt(70, 30);
        const s2 = spawnAt(70, -30);
        await wait(200);
        for (const f of [s1, s2]) ms.stunEnemiesInRange(f.x, f.y, 60, 30000);
        s1.sprite.body.reset(ms.player.x + 60, ms.player.y + 26);
        s2.sprite.body.reset(ms.player.x + 60, ms.player.y - 26);
        ms.addDot(s1, 1, 800, 5000, 0xd04a3a); // a token bleed marks the wounded one
        ms.player.facingX = 1;
        ms.player.facingY = 0;
        const s1Hp0 = s1.health.current;
        const s2Hp0 = s2.health.current;
        ms.runActiveSkill('sav_slash');
        const scent = { armed: scentArmed, bleedDrop: s1Hp0 - s1.health.current, cleanDrop: s2Hp0 - s2.health.current };
        s1.destroy();
        s2.destroy();
        // JAGUAR SPIRIT through the REAL activation path (Casey's swap): the
        // FORM's stats go live, a real strike rakes the jaguar's bleed, and NO
        // summon machinery remains reachable from the Savage.
        ms.energy.full();
        ms.activateSkill('sav_jg_jaguar');
        const formOn = ms.skillTimed.some((t) => t.id === 'sav_jg_jaguar');
        const mods = ms.combinedSkillMods();
        const f1 = spawnAt(70, 0);
        await wait(200);
        ms.stunEnemiesInRange(f1.x, f1.y, 60, 30000);
        f1.sprite.body.reset(ms.player.x + 60, ms.player.y);
        ms.player.facingX = 1;
        ms.player.facingY = 0;
        const f1Hp0 = f1.health.current;
        ms.runActiveSkill('sav_slash');
        const jaguarDefs = {
          formKind: defs.find((d) => d.id === 'sav_jg_jaguar').effect.kind,
          scentKind: defs.find((d) => d.id === 'sav_jg_pack').effect.kind,
        };
        const form = {
          on: formOn,
          statsLive: (mods.attackSpeedMult ?? 0) >= 0.25 && (mods.moveSpeedMult ?? 0) >= 0.15,
          struck: f1Hp0 - f1.health.current > 0,
          bleedRaked: ms.dots.some((d) => d.target === f1),
          noSummons: ms.summons.list.length === 0,
          formKind: jaguarDefs.formKind,
          scentKind: jaguarDefs.scentKind,
        };
        f1.destroy();
        // WARRIOR'S MOMENTUM through the real keyed passive: four real slashes,
        // each on a FRESH live foe (no overkill caps), each drop harder than
        // the last as the stacks build.
        unlock(['sav_ob_slash', 'sav_ob_jagged', 'sav_ob_momentum']);
        ms.recomputeSkillEffects(); // the keyed passive arms the frenzy
        const armed = ms.frenzy !== null;
        const drops = [];
        for (let i = 0; i < 4; i++) {
          const foe = spawnAt(80, 0);
          await wait(200);
          ms.stunEnemiesInRange(foe.x, foe.y, 60, 30000);
          foe.sprite.body.reset(ms.player.x + 60, ms.player.y);
          ms.player.facingX = 1;
          ms.player.facingY = 0;
          const before = foe.health.current;
          ms.runActiveSkill('sav_slash');
          await wait(120);
          drops.push(before - foe.health.current);
          foe.destroy();
        }
        const momentum = { armed, drops, stacks: ms.frenzy ? ms.frenzy.stacks : 0, growing: drops[0] < drops[1] && drops[1] < drops[2] && drops[2] < drops[3], ratio: drops[3] / drops[0] };
        ms.playerHealth.full();
        ms.playerHealth.shield = 1e9;
        return { setup: 'ok', leap, paidCast, refusal, execute, scent, form, momentum };
      });
      ok(
        'savage: leap-slam, blood-priced nova (paid + refused), the headtaker execute, blood scent vs a bleeder, the jaguar form (stats + raked bleed, no summons), momentum growth — each through the real skill',
        savKit.setup === 'ok' &&
          savKit.leap.moved > 140 &&
          savKit.leap.hit &&
          savKit.leap.down &&
          savKit.paidCast.bloodPaid &&
          savKit.paidCast.novaLanded &&
          savKit.refusal.refused &&
          savKit.refusal.cooldownRefunded &&
          savKit.refusal.energyRefunded &&
          savKit.execute.lowKilled &&
          savKit.execute.healthyDrop === 20 &&
          savKit.execute.healthySurvived &&
          savKit.scent.armed &&
          savKit.scent.cleanDrop > 0 &&
          Math.abs(savKit.scent.bleedDrop / savKit.scent.cleanDrop - 1.2) < 0.05 &&
          savKit.form.on &&
          savKit.form.statsLive &&
          savKit.form.struck &&
          savKit.form.bleedRaked &&
          savKit.form.noSummons &&
          savKit.form.formKind === 'transformation' &&
          savKit.form.scentKind === 'passive' &&
          savKit.momentum.armed &&
          savKit.momentum.growing &&
          savKit.momentum.ratio >= 1.15 &&
          savKit.momentum.stacks >= 3,
        JSON.stringify(savKit),
      );

      // 2w2. THE CASCADE through the REAL activation path (Casey's concept):
      // three loops of Slash → Jagged Wound → Brutal Cleave — the measured
      // A-strike RISES and its cooldown SHRINKS per completed trio, the HUD pip
      // shows the rank, a wrong-order cast drops everything (measured back at
      // base), a non-cascade skill is untouched at rank, and the flags exist
      // ONLY on Savage skills roster-wide.
      const cascade = await page.evaluate(async () => {
        const ms = window.__ready();
        const wait = (t) => new Promise((r) => setTimeout(r, t));
        if (!window.__quietSpot()) return { setup: 'no quiet spot' };
        const defs = ms.classSkillsAll['savage'].skills;
        ms.skills.awardPoints(6);
        for (const id of ['sav_ob_slash', 'sav_ob_jagged', 'sav_ob_momentum', 'sav_ob_leap', 'sav_ob_cleave', 'sav_br_spike']) {
          if (!ms.skills.isUnlocked(id)) ms.skills.unlock(defs.find((d) => d.id === id));
        }
        // Isolate the cascade's own ramp: end any timed form (attack speed
        // bends cooldowns) and disarm the frenzy (its ramp bends damage).
        for (const t of ms.skillTimed) t.endsAt = 0;
        await wait(150); // the expiry sweep prunes + recomputes
        ms.disarmFrenzy();
        ms.cascadeRank = 0;
        ms.cascadeNextStep = 1;
        ms.cascadeWindowUntil = 0;
        const cast = (id) => {
          if (ms.frenzy) { ms.frenzy.stacks = 0; ms.frenzy.until = 0; } // kills mid-check level up → recompute re-arms momentum; zeroed so the ramp is the CASCADE'S alone
          ms.skillCooldownUntil[id] = 0;
          ms.energy.full();
          ms.activateSkill(id);
        };
        const aDrops = [];
        const aCds = [];
        const ranks = [];
        for (let loop = 0; loop < 3; loop++) {
          const w = ms.activeMap().nearestWalkableWorld(ms.player.x + 80, ms.player.y);
          const foe = ms.spawnAngel('darkcaster', w.x, w.y);
          await wait(200);
          ms.stunEnemiesInRange(foe.x, foe.y, 60, 30000);
          foe.sprite.body.reset(ms.player.x + 60, ms.player.y);
          ms.player.facingX = 1;
          ms.player.facingY = 0;
          ranks.push(ms.cascadeRank);
          const before = foe.health.current;
          cast('sav_ob_slash');
          aDrops.push(before - foe.health.current);
          aCds.push(ms.skillCooldownDur['sav_ob_slash']);
          await wait(120);
          cast('sav_ob_jagged');
          await wait(120);
          cast('sav_ob_cleave');
          await wait(120);
          foe.destroy();
        }
        const rankAfter = ms.cascadeRank;
        const pip = { visible: ms.skillBar.cascadeLabel.visible, text: ms.skillBar.cascadeLabel.text };
        // NON-CASCADE at rank: Blood Spike's cooldown stays its base.
        cast('sav_br_spike');
        const spikeCd = ms.skillCooldownDur['sav_br_spike'];
        // BREAK: A then C out of order — every rank drops; the next A is base.
        cast('sav_ob_slash');
        await wait(80);
        cast('sav_ob_cleave'); // expected step 2 — the pattern breaks
        const rankAfterBreak = ms.cascadeRank;
        const pipHidden = ms.skillBar.cascadeLabel.visible === false;
        const w2 = ms.activeMap().nearestWalkableWorld(ms.player.x + 80, ms.player.y);
        const f2 = ms.spawnAngel('darkcaster', w2.x, w2.y);
        await wait(200);
        ms.stunEnemiesInRange(f2.x, f2.y, 60, 30000);
        f2.sprite.body.reset(ms.player.x + 60, ms.player.y);
        ms.player.facingX = 1;
        ms.player.facingY = 0;
        const before2 = f2.health.current;
        cast('sav_ob_slash');
        const resetDrop = before2 - f2.health.current;
        const resetCd = ms.skillCooldownDur['sav_ob_slash'];
        f2.destroy();
        // FLAG SCAN: cascadeStep lives ONLY on Savage skills, roster-wide.
        let foreign = 0;
        for (const cls2 of Object.keys(ms.classSkillsAll)) {
          if (cls2 === 'savage') continue;
          for (const d of ms.classSkillsAll[cls2].skills) if (d.effect.cascadeStep !== undefined) foreign++;
        }
        ms.playerHealth.full();
        ms.playerHealth.shield = 1e9;
        return { setup: 'ok', ranks, aDrops, aCds, rankAfter, pip, spikeCd, rankAfterBreak, pipHidden, resetDrop, resetCd, foreign };
      });
      ok(
        'savage cascade: slash→jagged→cleave ×3 ramps damage + shrinks cooldowns rank by rank; the pip shows; a broken pattern resets to base; non-cascade + every other class untouched',
        cascade.setup === 'ok' &&
          cascade.ranks[0] === 0 &&
          cascade.ranks[1] === 1 &&
          cascade.ranks[2] === 2 &&
          cascade.aDrops[0] === 19 &&
          cascade.aDrops[0] < cascade.aDrops[1] &&
          cascade.aDrops[1] < cascade.aDrops[2] &&
          cascade.aCds[0] === 2000 &&
          cascade.aCds[1] === 1840 &&
          cascade.aCds[2] === 1680 &&
          cascade.rankAfter === 3 &&
          cascade.pip.visible &&
          cascade.pip.text.includes('CASCADE') &&
          cascade.spikeCd === 2200 &&
          cascade.rankAfterBreak === 0 &&
          cascade.pipHidden &&
          cascade.resetDrop === 19 &&
          cascade.resetCd === 2000 &&
          cascade.foreign === 0,
        JSON.stringify(cascade),
      );
    }

    // 2x. EVERY HUNTER EXTENSION THROUGH A REAL HUNTER SKILL, in the live
    // Hunter session at Sydney: TAME through the real unlock + activation path
    // (whittles walk a live wolf to the line, the conversion bonds it; the
    // dark-caster refusal refunds cooldown AND energy), the COMMANDS (Focus
    // Prey pins the pack on the mark, Scatter the Pack spreads the horde),
    // the MODES (Beast Horde ⇄ Great Beast through their real casts, the
    // re-cast toggling back to the base companion), and BOOMERANG (the
    // returning throw's second cut measured on the flight home).
    if (cls === 'hunter') {
      const hunKit = await page.evaluate(async () => {
        const ms = window.__ready();
        const wait = (t) => new Promise((r) => setTimeout(r, t));
        if (!window.__quietSpot()) return { setup: 'no quiet spot' };
        ms.summons.clear();
        ms.clearHunterState(true);
        const defs = ms.classSkillsAll['hunter'].skills;
        ms.skills.awardPoints(30);
        const unlock = (ids) => {
          for (const id of ids) if (!ms.skills.isUnlocked(id)) ms.skills.unlock(defs.find((d) => d.id === id));
        };
        const cast = (id) => {
          ms.skillCooldownUntil[id] = 0;
          ms.energy.full();
          ms.activateSkill(id);
        };
        // TAME through the real skill: whittle → cleanse on a live wolf.
        unlock(['hun_bc_tame']);
        const ws = ms.activeMap().nearestWalkableWorld(ms.player.x + 60, ms.player.y);
        const wolf = ms.spawnTownsfolk(ws.x, ws.y, null, 'wolf');
        await wait(200);
        ms.stunEnemiesInRange(wolf.x, wolf.y, 90, 30000);
        wolf.sprite.body.reset(ms.player.x + 60, ms.player.y);
        let casts = 0;
        let aliveAfterFirst = false;
        for (let i = 0; i < 6 && ms.hunterPets().length === 0; i++) {
          cast('hun_bc_tame');
          casts++;
          if (i === 0) aliveAfterFirst = wolf.isAlive;
          await wait(80);
        }
        const tame = { casts, aliveAfterFirst, wolfGone: !wolf.isAlive, bond: !!ms.hunterBond, pets: ms.hunterPets().length };
        // REFUSAL through the real skill: the dark-caster refunds cooldown + energy.
        const rs = ms.activeMap().nearestWalkableWorld(ms.player.x + 60, ms.player.y);
        const foe = ms.spawnAngel('darkcaster', rs.x, rs.y);
        await wait(200);
        ms.stunEnemiesInRange(foe.x, foe.y, 90, 30000);
        foe.sprite.body.reset(ms.player.x + 60, ms.player.y);
        ms.energy.full();
        const e0 = ms.energy.current;
        const fHp0 = foe.health.current;
        ms.skillCooldownUntil['hun_bc_tame'] = 0;
        ms.activateSkill('hun_bc_tame');
        const refusal = {
          unharmed: foe.health.current === fHp0,
          cooldownRefunded: (ms.skillCooldownUntil['hun_bc_tame'] ?? 0) === 0,
          energyRefunded: ms.energy.current === e0,
          bondKept: !!ms.hunterBond,
        };
        // FOCUS PREY through the real skill: the mark eats the swings; the
        // bystander beside it bleeds nothing.
        unlock(['hun_bc_pack', 'hun_bc_focus', 'hun_bc_scatter', 'hun_bc_great', 'hun_bc_horde']);
        ms.recomputeSkillEffects();
        const f2s = ms.activeMap().nearestWalkableWorld(ms.player.x + 70, ms.player.y + 90);
        const foe2 = ms.spawnAngel('darkcaster', f2s.x, f2s.y);
        await wait(200);
        for (const f of [foe, foe2]) {
          ms.stunEnemiesInRange(f.x, f.y, 90, 30000);
          f.health.max = 800;
          f.health.current = 800;
        }
        foe.sprite.body.reset(ms.player.x + 70, ms.player.y);
        foe2.sprite.body.reset(ms.player.x + 70, ms.player.y + 90);
        const m0 = foe.health.current;
        const b0 = foe2.health.current;
        cast('hun_bc_focus');
        const focusSet = !!ms.hunterFocus && ms.hunterFocus.target === foe;
        await wait(1500);
        const focus = { focusSet, markHit: m0 - foe.health.current > 0, bystanderClean: foe2.health.current === b0 };
        // MODES through the real casts: horde (3 strikers), SCATTER spreads
        // them (both foes bleed), great (one magnet tank), toggle-exit back.
        cast('hun_bc_horde');
        const horde = ms.hunterPets();
        const modeHorde = horde.length === 3 && horde.every((p) => p.config.key === 'hunter_horde');
        const s1 = foe.health.current;
        const s2 = foe2.health.current;
        cast('hun_bc_scatter');
        const scatterSet = ms.hunterScatterUntil > ms.time.now;
        await wait(1800);
        const scatter = { scatterSet, spread: foe.health.current < s1 && foe2.health.current < s2 };
        cast('hun_bc_great');
        const great = ms.hunterPets();
        const modeGreat = great.length === 1 && great[0].config.key === 'hunter_great' && great[0].aggroPriority === 3;
        cast('hun_bc_great'); // the re-cast: exit the mode → the base companion
        const base = ms.hunterPets();
        const modeExit = base.length === 1 && base[0].config.key === 'hunter_companion';
        foe.destroy();
        foe2.destroy();
        // BOOMERANG through the real skill: the out-leg cut measured first, the
        // return-leg cut doubling it on the flight home.
        unlock(['hun_mk_steady', 'hun_mk_aim', 'hun_mk_multi', 'hun_mk_cripple', 'hun_mk_hawk', 'hun_mk_net', 'hun_mk_trueshot', 'hun_mk_boomerang']);
        ms.recomputeSkillEffects();
        ms.clearHunterPets(); // bench the beast — the boomerang's cuts alone
        const bs = ms.activeMap().nearestWalkableWorld(ms.player.x + 120, ms.player.y);
        const tgt = ms.spawnAngel('darkcaster', bs.x, bs.y);
        await wait(200);
        ms.stunEnemiesInRange(tgt.x, tgt.y, 90, 30000);
        tgt.sprite.body.reset(ms.player.x + 120, ms.player.y);
        tgt.health.max = 800;
        tgt.health.current = 800;
        ms.player.facingX = 1;
        ms.player.facingY = 0;
        const t0 = tgt.health.current;
        cast('hun_mk_boomerang');
        await wait(350); // past the out-leg hit, before the apex turn returns
        const outDrop = t0 - tgt.health.current;
        await wait(1050); // the flight home crosses it again
        const totalDrop = t0 - tgt.health.current;
        const boomerang = { outDrop, totalDrop, doubled: outDrop > 0 && totalDrop === outDrop * 2 };
        tgt.destroy();
        ms.clearHunterState(true);
        ms.playerHealth.full();
        ms.playerHealth.shield = 1e9;
        return { setup: 'ok', tame, refusal, focus, modeHorde, scatter, modeGreat, modeExit, boomerang };
      });
      ok(
        'hunter: tame whittles then cleanses a live wolf through the real skill; the dark-caster refusal refunds cooldown + energy, the bond untouched',
        hunKit.setup === 'ok' &&
          hunKit.tame.casts >= 2 &&
          hunKit.tame.aliveAfterFirst &&
          hunKit.tame.wolfGone &&
          hunKit.tame.bond &&
          hunKit.tame.pets === 1 &&
          hunKit.refusal.unharmed &&
          hunKit.refusal.cooldownRefunded &&
          hunKit.refusal.energyRefunded &&
          hunKit.refusal.bondKept,
        JSON.stringify({ tame: hunKit.tame, refusal: hunKit.refusal }),
      );
      ok(
        'hunter: Focus Prey pins the beast on the mark (bystander clean); Scatter the Pack spreads the horde (both foes bleed) — real casts',
        hunKit.setup === 'ok' && hunKit.focus.focusSet && hunKit.focus.markHit && hunKit.focus.bystanderClean && hunKit.scatter.scatterSet && hunKit.scatter.spread,
        JSON.stringify({ focus: hunKit.focus, scatter: hunKit.scatter }),
      );
      ok(
        'hunter: Beast Horde → Great Beast → re-cast exits to the base companion — one expression at a time, through the real casts',
        hunKit.setup === 'ok' && hunKit.modeHorde && hunKit.modeGreat && hunKit.modeExit,
        JSON.stringify({ modeHorde: hunKit.modeHorde, modeGreat: hunKit.modeGreat, modeExit: hunKit.modeExit }),
      );
      ok(
        'hunter: Boomerang through the real skill — the return leg doubles the out-leg cut on the same foe',
        hunKit.setup === 'ok' && hunKit.boomerang.doubled,
        JSON.stringify(hunKit.boomerang),
      );

      // 2x2. THE STANDALONE PROMISE — a Hunter with ZERO Beast Control points
      // wins a REAL fight (live foes, no shield, no pins) through Marksmanship
      // alone, and another through Wild Frenzy alone. Fresh session each.
      await newGame('hunter');
      const marksAlone = await page.evaluate(async () => {
        const ms = window.__ready();
        const wait = (t) => new Promise((r) => setTimeout(r, t));
        if (!window.__quietSpot()) return { setup: 'no quiet spot' };
        const defs = ms.classSkillsAll['hunter'].skills;
        ms.skills.awardPoints(6);
        for (const id of ['hun_mk_steady', 'hun_mk_aim', 'hun_mk_multi']) {
          if (!ms.skills.isUnlocked(id)) ms.skills.unlock(defs.find((d) => d.id === id));
        }
        ms.recomputeSkillEffects();
        const beastPoints = defs.filter((d) => d.tree === 'hun_beast' && ms.skills.isUnlocked(d.id)).length;
        const w1 = ms.activeMap().nearestWalkableWorld(ms.player.x + 130, ms.player.y);
        const w2 = ms.activeMap().nearestWalkableWorld(ms.player.x + 150, ms.player.y + 60);
        const f1 = ms.spawnAngel('darkcaster', w1.x, w1.y);
        const f2 = ms.spawnAngel('darkcaster', w2.x, w2.y);
        ms.playerHealth.full();
        ms.playerHealth.shield = 0; // a REAL fight — no god-mode
        const deadline = Date.now() + 14000;
        while ((f1.isAlive || f2.isAlive) && ms.playerHealth.current > 0 && Date.now() < deadline) {
          const foe = [f1, f2].find((f) => f.isAlive);
          const a = Math.atan2(foe.y - ms.player.y, foe.x - ms.player.x);
          ms.player.facingX = Math.cos(a);
          ms.player.facingY = Math.sin(a);
          ms.energy.full();
          ms.skillCooldownUntil['hun_mk_steady'] = 0;
          ms.skillCooldownUntil['hun_mk_multi'] = 0;
          ms.activateSkill('hun_mk_steady');
          ms.activateSkill('hun_mk_multi');
          await wait(280);
        }
        const out = { setup: 'ok', beastPoints, won: !f1.isAlive && !f2.isAlive && ms.playerHealth.current > 0, hpLeft: Math.round(ms.playerHealth.current), pets: ms.hunterPets().length, bond: !!ms.hunterBond };
        f1.destroy();
        f2.destroy();
        ms.playerHealth.full();
        ms.playerHealth.shield = 1e9;
        return out;
      });
      ok(
        'standalone promise (Marksmanship): zero Beast Control points, no beast, no shield — two live dark-casters shot down, the Hunter standing',
        marksAlone.setup === 'ok' && marksAlone.beastPoints === 0 && marksAlone.pets === 0 && !marksAlone.bond && marksAlone.won,
        JSON.stringify(marksAlone),
      );

      await newGame('hunter');
      const wildAlone = await page.evaluate(async () => {
        const ms = window.__ready();
        const wait = (t) => new Promise((r) => setTimeout(r, t));
        if (!window.__quietSpot()) return { setup: 'no quiet spot' };
        const defs = ms.classSkillsAll['hunter'].skills;
        ms.skills.awardPoints(6);
        for (const id of ['hun_wf_swipe', 'hun_wf_twin']) {
          if (!ms.skills.isUnlocked(id)) ms.skills.unlock(defs.find((d) => d.id === id));
        }
        ms.recomputeSkillEffects();
        const beastPoints = defs.filter((d) => d.tree === 'hun_beast' && ms.skills.isUnlocked(d.id)).length;
        const pack = [];
        for (const [dx, dy] of [[150, 0], [150, 50], [150, -50]]) {
          const w = ms.activeMap().nearestWalkableWorld(ms.player.x + dx, ms.player.y + dy);
          pack.push(ms.spawnTownsfolk(w.x, w.y, null, 'wolf'));
        }
        ms.playerHealth.full();
        ms.playerHealth.shield = 0; // a REAL fight — the pack charges, the knives answer
        const deadline = Date.now() + 14000;
        while (pack.some((p) => p.isAlive) && ms.playerHealth.current > 0 && Date.now() < deadline) {
          const foe = pack.find((p) => p.isAlive);
          const a = Math.atan2(foe.y - ms.player.y, foe.x - ms.player.x);
          ms.player.facingX = Math.cos(a);
          ms.player.facingY = Math.sin(a);
          ms.energy.full();
          ms.skillCooldownUntil['hun_wf_swipe'] = 0;
          ms.skillCooldownUntil['hun_wf_twin'] = 0;
          ms.activateSkill('hun_wf_swipe');
          ms.activateSkill('hun_wf_twin');
          await wait(260);
        }
        const out = { setup: 'ok', beastPoints, won: pack.every((p) => !p.isAlive) && ms.playerHealth.current > 0, hpLeft: Math.round(ms.playerHealth.current), pets: ms.hunterPets().length, bond: !!ms.hunterBond };
        for (const p of pack) p.destroy();
        ms.playerHealth.full();
        ms.playerHealth.shield = 1e9;
        return out;
      });
      ok(
        'standalone promise (Wild Frenzy): zero Beast Control points, no beast, no shield — the charging wolf pack cut down at knife range, the Hunter standing',
        wildAlone.setup === 'ok' && wildAlone.beastPoints === 0 && wildAlone.pets === 0 && !wildAlone.bond && wildAlone.won,
        JSON.stringify(wildAlone),
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

  // 3n1b. ORIENTATION FPS PARITY (permanent): the SAME spot (Rome arrival,
  // ground zoom) must render within 15% frame time in BOTH orientations.
  // Render cost is symmetric by design — swapped dimensions are the same pixel
  // count, the ground window and chunk activation are view-derived (profiled
  // 2026-07: 25.6 portrait vs 26.1 landscape fps, 8 ground cells + 45 live
  // enemies in both) — this gate keeps it that way.
  const orientFps = () =>
    page.evaluate(async () => {
      const ms = window.__ready();
      const gl = ms.groundLayers.get('globe');
      await new Promise((r) => setTimeout(r, 900)); // settle after the resize
      const fps = await new Promise((resolve) => {
        let frames = 0;
        const t0 = performance.now();
        const tick = () => {
          frames++;
          const dt = performance.now() - t0;
          if (dt >= 2500) resolve(+((frames * 1000) / dt).toFixed(1));
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
      return { fps, cells: gl.cellsDrawn, enemies: ms.combatEnemies().length };
    });
  const orientPortrait = await orientFps();
  await page.setViewportSize({ width: 926, height: 428 });
  const orientLandscape = await orientFps();
  await page.setViewportSize({ width: 428, height: 926 });
  await page.waitForTimeout(600);
  ok(
    'ground: landscape frame time within 15% of portrait at the same spot (Rome, ground zoom)',
    orientLandscape.fps >= orientPortrait.fps * 0.85,
    `portrait=${JSON.stringify(orientPortrait)} landscape=${JSON.stringify(orientLandscape)} (tolerance ≥ 85%)`,
  );

  // 3n1c. DEATH RESPAWN = NEAREST SAFE POINT (permanent). Old rule: every death
  // teleported to Earth's town-spawn COORDINATES in whatever world you were in —
  // mid-void in the globe. New rule per world kind:
  //   sparse (globe) → the nearest zone settlement arrival to where you fell;
  //   dense (earth/egypt) → the nearest existing spawn/entry point.
  // Death itself (banner, resets, summons cleared) is unchanged.
  const dieHere = () =>
    page.evaluate(async () => {
      const ms = window.__ready();
      const from = { x: ms.player.x, y: ms.player.y };
      ms.playerHealth.shield = 0;
      ms.playerHealth.current = 1;
      ms.onProjectileHitPlayer(10); // a real lethal hit → the real death funnel
      await new Promise((r) => setTimeout(r, 2300)); // banner (1500ms) + respawn
      return { from, world: ms.activeWorld, x: ms.player.x, y: ms.player.y, alive: !ms.playerDead };
    });
  // (1) Mid-spine in the GLOBE: stand well outside Rome, between settlements.
  const globeDeath = await (async () => {
    await page.evaluate(() => {
      const ms = window.__ready();
      const rome = ms.regionZoneArrivals['rome-eternal-seat'];
      ms.player.sprite.body.reset(rome.x + 2600, rome.y - 2200); // mid-void, off any settlement
    });
    const d = await dieHere();
    return page.evaluate(
      ({ d }) => {
        const ms = window.__game.scene.getScene('MainScene');
        let nearest = null;
        let bestD = Infinity;
        for (const id of Object.keys(ms.regionZoneArrivals)) {
          const a = ms.regionZoneArrivals[id];
          const dist = Math.hypot(a.x - d.from.x, a.y - d.from.y);
          if (dist < bestD) {
            bestD = dist;
            nearest = { id, ...a };
          }
        }
        return {
          ...d,
          nearestZone: nearest.id,
          atNearest: Math.hypot(d.x - nearest.x, d.y - nearest.y) < 10,
          movedAcrossWorld: Math.hypot(d.x - d.from.x, d.y - d.from.y) > 60000, // the old-rule symptom
        };
      },
      { d },
    );
  })();
  ok(
    'death respawn (globe): a mid-spine death respawns at the NEAREST settlement arrival, never across the world',
    globeDeath.world === 'globe' && globeDeath.alive && globeDeath.atNearest && !globeDeath.movedAcrossWorld,
    JSON.stringify(globeDeath),
  );
  // (2) EARTH: die away from town → the nearest of town spawn / world entry.
  const earthDeath = await (async () => {
    await page.evaluate(() => {
      const ms = window.__ready();
      const spot = ms.worlds['earth'].map.nearestWalkableWorld(ms.town.spawn.x + 2400, ms.town.spawn.y + 900);
      ms.applyWorldSwap('earth', spot);
    });
    await page.waitForTimeout(900);
    const d = await dieHere();
    return page.evaluate(
      ({ d }) => {
        const ms = window.__game.scene.getScene('MainScene');
        const cands = [ms.worlds['earth'].defaultArrival, ms.town.spawn];
        const nearest = cands.reduce((a, b) => (Math.hypot(a.x - d.from.x, a.y - d.from.y) <= Math.hypot(b.x - d.from.x, b.y - d.from.y) ? a : b));
        return { ...d, atNearest: Math.hypot(d.x - nearest.x, d.y - nearest.y) < 10 };
      },
      { d },
    );
  })();
  ok('death respawn (earth): a sensible local point — the nearest of town spawn / world entry', earthDeath.world === 'earth' && earthDeath.alive && earthDeath.atNearest, JSON.stringify(earthDeath));
  // (3) EGYPT: die away from the entry → back at the world entry.
  const egyptDeath = await (async () => {
    await page.evaluate(() => {
      const ms = window.__ready();
      const entry = ms.worlds['egypt'].defaultArrival;
      const spot = ms.worlds['egypt'].map.nearestWalkableWorld(entry.x + 1800, entry.y + 700);
      ms.applyWorldSwap('egypt', spot);
    });
    await page.waitForTimeout(900);
    const d = await dieHere();
    return page.evaluate(
      ({ d }) => {
        const ms = window.__game.scene.getScene('MainScene');
        const entry = ms.worlds['egypt'].defaultArrival;
        return { ...d, atEntry: Math.hypot(d.x - entry.x, d.y - entry.y) < 10 };
      },
      { d },
    );
  })();
  ok('death respawn (egypt): a sensible local point — the world entry', egyptDeath.world === 'egypt' && egyptDeath.alive && egyptDeath.atEntry, JSON.stringify(egyptDeath));
  // Back to the globe at Rome for whatever follows (the pre-check state).
  await page.evaluate(async () => {
    const ms = window.__ready();
    ms.devTravelEurope();
    await new Promise((r) => setTimeout(r, 2400));
  });

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
    ms.confused.clear();
    ms.comboUltimate = null;
    ms.harmonicCharges = 0;
    ms.setEcho(0);
    ms.voodoo = null;
    ms.allyBond = null;
    ms.spiritSplit = null;
    ms.parry = null;
    ms.perfectFormUntil = 0;
    ms.iaijutsu = null;
    ms.pulseRing = null;
    ms.empoweredStrikes = null;
    ms.clearTraps(); // devices + shadow-dance/vanish state (assassin)
    ms.clearPriestState(); // ally-shields + the dual channel (priest)
    ms.darkVulnUntil = 0;
    ms.clearDots();
    ms.playerHealth.full();
    ms.energy.full();
    await wait(500);
    return out;
  });
  ok(
    'skill framework: every skill in every tree executes; composed actions match their declared primitives',
    skillSweep.errors.length === 0 && skillSweep.mismatches.length === 0 && skillSweep.composed === 165 && skillSweep.total >= 420,
    `total=${skillSweep.total} composed=${skillSweep.composed} bespokeActive=${skillSweep.bespokeActive} timed/other=${skillSweep.other} passive=${skillSweep.passive}` +
      (skillSweep.errors.length ? ` ERRORS=${JSON.stringify(skillSweep.errors.slice(0, 3))}` : '') +
      (skillSweep.mismatches.length ? ` MISMATCH=${JSON.stringify(skillSweep.mismatches.slice(0, 3))}` : ''),
  );

  // 3u2. NAME-COLLISION GUARD (permanent, roster-wide): no two SKILLS anywhere
  // in the game share a display name. The Wizard's live Divine Incantations
  // names (Healing Light / Divine Shield / Resurrection / Holy Radiance /
  // Pillar of Judgment) are the standing risk as holy-flavored classes ship —
  // this guards the Priest's roster today and every future class after it.
  const nameClash = await page.evaluate(() => {
    const ms = window.__game.scene.getScene('MainScene');
    const seen = new Map();
    const dupes = [];
    for (const cls of Object.keys(ms.classSkillsAll)) {
      for (const def of ms.classSkillsAll[cls].skills) {
        if (seen.has(def.name)) dupes.push(`'${def.name}' (${seen.get(def.name)} vs ${cls})`);
        else seen.set(def.name, cls);
      }
    }
    return { classes: Object.keys(ms.classSkillsAll).length, names: seen.size, dupes };
  });
  ok(
    'name-collision guard: no two skills anywhere in the roster share a display name',
    nameClash.dupes.length === 0 && nameClash.names >= 330,
    `classes=${nameClash.classes} uniqueNames=${nameClash.names}${nameClash.dupes.length ? ' DUPES=' + JSON.stringify(nameClash.dupes.slice(0, 5)) : ''}`,
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

  // 3ab. WITCH DOCTOR FRAMEWORK EXTENSIONS (permanent): the voodoo doll system
  // (bind + mirror % + the three upgrade hooks + despawn/re-bind), the spirit
  // decoy, the ally-bond damage share, and the Spirit Split composite — each
  // through its real runtime seam from an isolated spot.

  // 3ab-1. DOLL BIND + MIRROR %: the cast deals its initial spirit damage and
  // binds; a melee strike landing ON THE DOLL mirrors exactly mirrorPct to the
  // bound target far away; a broken bind mirrors nothing.
  const dollRun = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!window.__quietSpot()) return { setup: 'no quiet spot' };
    ms.summons.clear();
    const w = ms.activeMap().nearestWalkableWorld(ms.player.x + 420, ms.player.y);
    const a = ms.spawnAngel('darkcaster', w.x, w.y);
    await wait(200);
    ms.stunEnemiesInRange(a.x, a.y, 40, 8000); // pin FAR away (mirror is rangeless)
    ms.player.facingX = 1;
    ms.player.facingY = 0;
    const hp0 = a.health.current;
    const bound = ms.castVoodooDoll(600, 15, 8000, 0.5);
    const initial = hp0 - a.health.current;
    const doll = ms.voodoo?.doll ?? null;
    const dollNear = doll ? Math.hypot(doll.x - ms.player.x, doll.y - ms.player.y) < 120 : false;
    const farNow = Math.hypot(a.x - ms.player.x, a.y - ms.player.y);
    ms.runComposedSteps([{ p: 'strike', at: 'front', range: 70, damageRaw: 20, tint: 0xc9a05a }]); // lands on the doll
    await wait(120);
    const mirrored = hp0 - a.health.current - initial;
    // Break the bind (destroy the doll) → the next strike mirrors NOTHING.
    ms.summons.clearKey('wd_doll');
    await wait(250); // update() prunes the broken bind
    const unbound = ms.voodoo === null;
    const hp1 = a.health.current;
    ms.runComposedSteps([{ p: 'strike', at: 'front', range: 70, damageRaw: 20, tint: 0xc9a05a }]);
    await wait(120);
    const afterBreak = hp1 - a.health.current;
    a.destroy();
    ms.summons.clear();
    ms.voodoo = null;
    return { setup: 'ok', bound, initial, dollNear, farNow, mirrored, unbound, afterBreak };
  });
  ok(
    'wd ext — voodoo doll: cast binds + hits; a strike on the doll mirrors exactly mirrorPct at range; a broken bind mirrors nothing',
    dollRun.setup === 'ok' && dollRun.bound && dollRun.initial === 15 && dollRun.dollNear && dollRun.farNow > 300 && dollRun.mirrored === 10 && dollRun.unbound && dollRun.afterBreak === 0,
    JSON.stringify(dollRun),
  );

  // 3ab-2. UPGRADE HOOKS: STITCH SPLASH (the mirror splashes to the target's
  // neighbor), REFLECT (a contact hit on the doll bites the striker back), and
  // SPIRIT ASSAULT (periodic defense-bypassing ticks while bound) — each armed
  // by its flag exactly as the owned-skill wiring arms it.
  const hooksRun = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!window.__quietSpot()) return { setup: 'no quiet spot' };
    ms.summons.clear();
    const spawnAt = (dx, dy) => {
      const w = ms.activeMap().nearestWalkableWorld(ms.player.x + dx, ms.player.y + dy);
      return ms.spawnAngel('darkcaster', w.x, w.y);
    };
    const a = spawnAt(400, 0); // the bound target
    const b = spawnAt(460, 40); // its neighbor (stitch food)
    await wait(200);
    ms.stunEnemiesInRange(ms.player.x + 430, ms.player.y, 220, 9000); // pin the pair
    a.sprite.body.reset(ms.player.x + 400, ms.player.y);
    b.sprite.body.reset(ms.player.x + 460, ms.player.y + 40);
    ms.player.facingX = 1;
    ms.player.facingY = 0;
    ms.castVoodooDoll(600, 0, 9000, 0.5);
    const boundA = ms.voodoo?.target === a;
    ms.voodooStitch = { radius: 140, pct: 0.5 }; // arm STITCH (as the owned skill would)
    const hpA = a.health.current;
    const hpB = b.health.current;
    ms.runComposedSteps([{ p: 'strike', at: 'front', range: 70, damageRaw: 20, tint: 0xc9a05a }]);
    await wait(120);
    const mirrorA = hpA - a.health.current; // 20 × 0.5
    const stitchB = hpB - b.health.current; // mirror × 0.5
    ms.voodooStitch = null;
    // REFLECT: a striker adjacent to the doll lands a contact hit through the REAL
    // enemy-contact seam; the doll soaks it and bites back.
    ms.voodooReflectDamage = 12;
    const doll = ms.voodoo.doll;
    const c = spawnAt(40, 60);
    await wait(200);
    ms.stunEnemiesInRange(c.x, c.y, 40, 6000);
    c.sprite.body.reset(doll.x + 20, doll.y);
    const dollHp0 = doll.health.current;
    const hpC = c.health.current;
    const soaked = ms.redirectContactToSummon(c.x, c.y, 10); // the seam enemy contact uses
    await wait(100);
    const reflect = { soaked, dollTook: dollHp0 - doll.health.current, bite: hpC - c.health.current };
    ms.voodooReflectDamage = 0;
    c.destroy();
    // SPIRIT ASSAULT: armed → periodic ticks land on the bound target with no input.
    ms.voodooAssault = { damage: 6, tickMs: 400, nextAt: 0 };
    const hpA2 = a.health.current;
    await wait(1000); // ~2-3 ticks
    const assaultTicks = hpA2 - a.health.current;
    ms.voodooAssault = null;
    a.destroy();
    b.destroy();
    ms.summons.clear();
    ms.voodoo = null;
    return { setup: 'ok', boundA, mirrorA, stitchB, reflect, assaultTicks };
  });
  ok(
    'wd ext — doll upgrades: stitch splashes the neighbor; a contact hit on the doll reflects; spirit assault ticks while bound',
    hooksRun.setup === 'ok' &&
      hooksRun.boundA &&
      hooksRun.mirrorA === 10 &&
      hooksRun.stitchB === 5 &&
      hooksRun.reflect.soaked &&
      hooksRun.reflect.dollTook === 10 &&
      hooksRun.reflect.bite === 12 &&
      hooksRun.assaultTicks >= 12,
    JSON.stringify(hooksRun),
  );

  // 3ab-3. DESPAWN ON TARGET DEATH + RE-CAST RE-BINDS: killing the bound target
  // removes the doll; a fresh cast binds the next enemy.
  const rebindRun = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!window.__quietSpot()) return { setup: 'no quiet spot' };
    ms.summons.clear();
    const spawnAt = (dx) => {
      const w = ms.activeMap().nearestWalkableWorld(ms.player.x + dx, ms.player.y);
      return ms.spawnAngel('darkcaster', w.x, w.y);
    };
    const a = spawnAt(120);
    await wait(200);
    ms.stunEnemiesInRange(a.x, a.y, 40, 6000);
    ms.castVoodooDoll(400, 0, 8000, 0.5);
    const boundFirst = ms.voodoo?.target === a;
    a.takeHit(1e9); // the bound target dies
    await wait(300); // update() prunes: the doll despawns with its target
    const dollGone = ms.voodoo === null && !ms.summons.list.some((s) => s.config.key === 'wd_doll');
    const b = spawnAt(140);
    await wait(200);
    ms.stunEnemiesInRange(b.x, b.y, 40, 6000);
    const recast = ms.castVoodooDoll(400, 0, 8000, 0.5);
    const boundSecond = ms.voodoo?.target === b && ms.summons.list.some((s) => s.config.key === 'wd_doll');
    a.destroy();
    b.destroy();
    ms.summons.clear();
    ms.voodoo = null;
    return { setup: 'ok', boundFirst, dollGone, recast, boundSecond };
  });
  ok(
    'wd ext — bind lifecycle: the doll despawns when its target dies; a re-cast re-binds fresh',
    rebindRun.setup === 'ok' && rebindRun.boundFirst && rebindRun.dollGone && rebindRun.recast && rebindRun.boundSecond,
    JSON.stringify(rebindRun),
  );

  // 3ab-4. SPIRIT DECOY: magnet-tier aggro (a real enemy retargets onto it),
  // attacks nothing, has HP, expires — aggro falls back to the player after.
  const decoyRun = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!window.__quietSpot()) return { setup: 'no quiet spot' };
    ms.summons.clear();
    const w = ms.activeMap().nearestWalkableWorld(ms.player.x + 150, ms.player.y);
    const e = ms.spawnAngel('darkcaster', w.x, w.y);
    await wait(200);
    ms.stunEnemiesInRange(e.x, e.y, 40, 8000); // hold it so distance stays stable
    const t0 = ms.enemyAggroTarget(e, e.x, e.y);
    const onPlayerBefore = Math.hypot(t0.x - ms.player.x, t0.y - ms.player.y) < 8;
    const d = ms.spawnSpiritDecoy(1600); // short-lived for the expiry half
    const passive = d.config.behavior === 'tank' && d.config.attackDamage === undefined && d.health.max > 0;
    await wait(700); // past the aggro re-eval interval
    const t1 = ms.enemyAggroTarget(e, e.x, e.y);
    const onDecoy = Math.hypot(t1.x - d.x, t1.y - d.y) < 60;
    await wait(1400); // past the decoy's lifespan
    const expired = !ms.summons.list.some((s) => s.config.key === 'wd_decoy');
    await wait(600); // next re-eval → back to the player
    const t2 = ms.enemyAggroTarget(e, e.x, e.y);
    const backToPlayer = Math.hypot(t2.x - ms.player.x, t2.y - ms.player.y) < 8;
    e.destroy();
    ms.summons.clear();
    return { setup: 'ok', onPlayerBefore, passive, onDecoy, expired, backToPlayer };
  });
  ok(
    'wd ext — spirit decoy: draws real aggro at magnet tier, attacks nothing, expires; aggro falls back',
    decoyRun.setup === 'ok' && decoyRun.onPlayerBefore && decoyRun.passive && decoyRun.onDecoy && decoyRun.expired && decoyRun.backToPlayer,
    JSON.stringify(decoyRun),
  );

  // 3ab-5. ALLY-BOND: while bonded, sharePct of a player hit lands on the live
  // summon instead (the player pool takes only the remainder); unbonded hits land whole.
  const bondRun = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!window.__quietSpot()) return { setup: 'no quiet spot' };
    ms.summons.clear();
    ms.voodoo = null;
    const d = ms.spawnSpiritDecoy(20000); // the bond's other half
    await wait(100);
    ms.startAllyBond(0.4, 5000);
    const dHp0 = d.health.current;
    const shield0 = ms.playerHealth.shield;
    ms.playerHealth.damage(20); // the REAL player-damage path (redirect runs inside)
    const shared = dHp0 - d.health.current; // 20 × 0.4
    const playerTook = shield0 - ms.playerHealth.shield; // the remainder (god-shield absorbs it)
    ms.allyBond = null; // bond ends → hits land whole again
    const dHp1 = d.health.current;
    const shield1 = ms.playerHealth.shield;
    ms.playerHealth.damage(20);
    const sharedAfter = dHp1 - d.health.current;
    const playerTookAfter = shield1 - ms.playerHealth.shield;
    ms.summons.clear();
    ms.playerHealth.shield = 1e9;
    return { setup: 'ok', shared, playerTook, sharedAfter, playerTookAfter };
  });
  // NOTE: assert the RATIOS, not raw numbers — the session's player may carry an
  // incoming-damage multiplier, which scales both halves identically.
  ok(
    'wd ext — ally-bond: the share lands on the summon, the player takes the remainder; whole again once it ends',
    bondRun.setup === 'ok' &&
      bondRun.playerTookAfter > 0 &&
      Math.abs(bondRun.shared - bondRun.playerTookAfter * 0.4) < 0.01 &&
      Math.abs(bondRun.playerTook - bondRun.playerTookAfter * 0.6) < 0.01 &&
      bondRun.sharedAfter === 0,
    JSON.stringify(bondRun),
  );

  // 3ab-6. SPIRIT SPLIT (composite): the decoy walks while the doll auto-mirrors
  // pulses on its cadence with NO player strike; the state ends on time.
  const splitRun = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!window.__quietSpot()) return { setup: 'no quiet spot' };
    ms.summons.clear();
    const w = ms.activeMap().nearestWalkableWorld(ms.player.x + 380, ms.player.y);
    const a = ms.spawnAngel('darkcaster', w.x, w.y);
    await wait(200);
    ms.stunEnemiesInRange(a.x, a.y, 40, 9000);
    ms.player.facingX = 1;
    ms.player.facingY = 0;
    ms.castVoodooDoll(600, 0, 9000, 0.5);
    const hp0 = a.health.current;
    ms.startSpiritSplit(1700, 400, 10);
    const decoyWalks = ms.summons.list.some((s) => s.config.key === 'wd_decoy');
    await wait(2000); // pulses at ~400/800/1200/1600, then the window closes
    const pulsed = hp0 - a.health.current;
    const ended = ms.spiritSplit === null;
    const hp1 = a.health.current;
    await wait(600);
    const noMore = hp1 - a.health.current === 0;
    a.destroy();
    ms.summons.clear();
    ms.voodoo = null;
    return { setup: 'ok', decoyWalks, pulsed, ended, noMore };
  });
  ok(
    'wd ext — spirit split: both halves run — the decoy walks while the doll auto-pulses; ends on time',
    splitRun.setup === 'ok' && splitRun.decoyWalks && splitRun.pulsed >= 30 && splitRun.ended && splitRun.noMore,
    JSON.stringify(splitRun),
  );

  // 3ae. SAMURAI FRAMEWORK EXTENSIONS (permanent): parry/riposte (+ its two
  // upgrade hooks), the Iaijutsu count-1 consume-buff, and dash-and-fire — each
  // through its real runtime seam. Melee hits are driven through the REAL enemy
  // melee handler (a live wolf's hit path); ranged through the projectile path.

  // 3ae-1. PARRY: a real wolf melee hit inside the window is fully negated and
  // the riposte lands; an EXPIRED window takes the hit normally; a RANGED hit
  // passes through an open window untouched (melee only).
  const parryRun = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!window.__quietSpot()) return { setup: 'no quiet spot' };
    ms.playerHealth.shield = 0; // observe real HP (restored at the end)
    ms.playerHealth.full();
    const wolf = ms.spawnTownsfolk(ms.player.x + 60, ms.player.y, null, 'wolf');
    await wait(200);
    // NOTE: wolves are squishy (15 HP) — the riposte numbers here stay SMALL so
    // the same live wolf survives every phase (a fresh one arrives for the
    // Counterstrike phase to be safe).
    const hp0 = ms.playerHealth.current;
    const wolfHp0 = wolf.health.current;
    const count0 = ms.parryCount;
    ms.openParryWindow(800, 4);
    ms.onTownsfolkHitPlayer(wolf); // the REAL wolf-melee seam
    const negated = ms.playerHealth.current === hp0;
    const riposte = wolfHp0 - wolf.health.current;
    const consumed = ms.parry === null && ms.parryCount === count0 + 1;
    // EXPIRED window → the hit lands normally, no riposte.
    ms.openParryWindow(120, 4);
    await wait(400);
    const hp1 = ms.playerHealth.current;
    const wolfHp1 = wolf.health.current;
    ms.onTownsfolkHitPlayer(wolf);
    const expiredTook = hp1 - ms.playerHealth.current;
    const expiredNoRiposte = wolf.health.current === wolfHp1;
    // RANGED passes through an OPEN window (melee only) — and the window survives.
    ms.playerHealth.full();
    ms.openParryWindow(800, 4);
    const hp2 = ms.playerHealth.current;
    ms.onProjectileHitPlayer(10);
    const rangedTook = hp2 - ms.playerHealth.current;
    const windowSurvived = ms.parry !== null;
    ms.parry = null;
    wolf.takeHit(1e9);
    // COUNTERSTRIKE hooks (armed exactly as the owned skill arms them): riposte
    // bonus + a Resolve/energy refund on the successful parry — on a FRESH wolf.
    const wolf2 = ms.spawnTownsfolk(ms.player.x + 60, ms.player.y, null, 'wolf');
    await wait(200);
    ms.parryRiposteBonus = 10;
    ms.parryRefundEnergy = 8;
    ms.energy.current = 40;
    const wolfHp2 = wolf2.health.current;
    ms.openParryWindow(800, 4);
    ms.onTownsfolkHitPlayer(wolf2);
    const counter = { riposte: wolfHp2 - wolf2.health.current, energy: ms.energy.current };
    ms.parryRiposteBonus = 0;
    ms.parryRefundEnergy = 0;
    wolf2.takeHit(1e9);
    ms.playerHealth.full();
    ms.playerHealth.shield = 1e9;
    return { setup: 'ok', negated, riposte, consumed, expiredTook, expiredNoRiposte, rangedTook, windowSurvived, counter };
  });
  ok(
    'samurai ext — parry: negates a real wolf hit + ripostes; expired window takes it; ranged passes through; Counterstrike bonus + refund',
    parryRun.setup === 'ok' &&
      parryRun.negated &&
      parryRun.riposte === 4 &&
      parryRun.consumed &&
      parryRun.expiredTook > 0 &&
      parryRun.expiredNoRiposte &&
      parryRun.rangedTook > 0 &&
      parryRun.windowSurvived &&
      parryRun.counter.riposte === 14 &&
      parryRun.counter.energy === 48,
    JSON.stringify(parryRun),
  );

  // 3ae-2. IAIJUTSU: the armed sheathe multiplies EXACTLY ONE strike (and stuns
  // what it hits), then consumes; a lapsed buff clears without effect.
  const iaiRun = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!window.__quietSpot()) return { setup: 'no quiet spot' };
    const w = ms.activeMap().nearestWalkableWorld(ms.player.x + 60, ms.player.y);
    const a = ms.spawnAngel('darkcaster', w.x, w.y);
    await wait(200);
    a.sprite.body.reset(ms.player.x + 60, ms.player.y);
    ms.player.facingX = 1;
    ms.player.facingY = 0;
    ms.armIaijutsu(1500, 3, 800);
    const hp0 = a.health.current;
    ms.runComposedSteps([{ p: 'strike', at: 'front', range: 70, damageRaw: 10, tint: 0xffe9a8 }]);
    await wait(100);
    const first = hp0 - a.health.current; // 10 × 3
    const stunned = ms.stunnedEnemies.has(a);
    const consumed = ms.iaijutsu === null;
    const hp1 = a.health.current;
    ms.runComposedSteps([{ p: 'strike', at: 'front', range: 70, damageRaw: 10, tint: 0xffe9a8 }]);
    await wait(100);
    const second = hp1 - a.health.current; // back to base
    // A LAPSED sheathe clears without effect.
    ms.armIaijutsu(100, 3, 800);
    await wait(300);
    const hp2 = a.health.current;
    ms.runComposedSteps([{ p: 'strike', at: 'front', range: 70, damageRaw: 10, tint: 0xffe9a8 }]);
    await wait(100);
    const lapsed = { drop: hp2 - a.health.current, cleared: ms.iaijutsu === null };
    a.destroy();
    return { setup: 'ok', first, stunned, consumed, second, lapsed };
  });
  ok(
    'samurai ext — iaijutsu: exactly one strike multiplied (×3) + stun, then consumed; a lapsed sheathe clears cleanly',
    iaiRun.setup === 'ok' && iaiRun.first === 30 && iaiRun.stunned && iaiRun.consumed && iaiRun.second === 10 && iaiRun.lapsed.drop === 10 && iaiRun.lapsed.cleared,
    JSON.stringify(iaiRun),
  );

  // 3ae-3. PERFECT FORM: every incoming melee hit auto-parries (multiple, from a
  // real wolf's hit path) WHILE the player strikes freely; the state ends on time.
  const formRun = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!window.__quietSpot()) return { setup: 'no quiet spot' };
    ms.playerHealth.shield = 0;
    ms.playerHealth.full();
    const wolf = ms.spawnTownsfolk(ms.player.x + 60, ms.player.y, null, 'wolf');
    await wait(200);
    const hp0 = ms.playerHealth.current;
    const wolfHp0 = wolf.health.current;
    const count0 = ms.parryCount;
    ms.player.facingX = 1;
    ms.player.facingY = 0;
    ms.startPerfectForm(2000, 2); // small riposte: the 15 HP wolf must survive all three
    // Per-hit SYNCHRONOUS deltas: each parried hit must remove exactly 0 HP (a
    // stray ranged enemy wandering in mid-wait can't pollute the measurement).
    let taken = 0;
    for (let i = 0; i < 3; i++) {
      wolf.sprite.body.reset(ms.player.x + 60, ms.player.y);
      const before = ms.playerHealth.current;
      ms.onTownsfolkHitPlayer(wolf); // real melee hits, auto-parried
      taken += before - ms.playerHealth.current;
      if (i < 2) ms.runComposedSteps([{ p: 'strike', at: 'front', range: 70, damageRaw: 2, tint: 0xffe9a8 }]); // acting freely
      await wait(120);
    }
    const untouched = taken === 0;
    const parries = ms.parryCount - count0;
    const wolfDrop = wolfHp0 - wolf.health.current; // 3 ripostes ×2 + 2 free strikes ×2
    await wait(1800); // past the window
    const hp1 = ms.playerHealth.current;
    ms.onTownsfolkHitPlayer(wolf);
    const afterEnds = hp1 - ms.playerHealth.current;
    wolf.takeHit(1e9);
    ms.playerHealth.full();
    ms.playerHealth.shield = 1e9;
    return { setup: 'ok', untouched, parries, wolfDrop, afterEnds };
  });
  ok(
    'samurai ext — perfect form: multiple real melee hits auto-parried while striking freely; the state ends on time',
    formRun.setup === 'ok' && formRun.untouched && formRun.parries === 3 && formRun.wolfDrop === 10 && formRun.afterEnds > 0,
    JSON.stringify(formRun),
  );

  // 3ae-4. DASH-AND-FIRE: the charge moves the player while the mid-dash bolt
  // flies ahead and lands on a target downrange (the Surge composite pattern
  // with a projectile).
  const dashRun = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!window.__quietSpot()) return { setup: 'no quiet spot' };
    const w = ms.activeMap().nearestWalkableWorld(ms.player.x + 320, ms.player.y);
    const a = ms.spawnAngel('darkcaster', w.x, w.y);
    await wait(200);
    ms.stunEnemiesInRange(a.x, a.y, 40, 4000);
    ms.player.facingX = 1;
    ms.player.facingY = 0;
    const from = { x: ms.player.x, y: ms.player.y };
    const hp0 = a.health.current;
    ms.dashAndFire({ distance: 200, damage: 0, knockdownMs: 0 }, { p: 'bolt', damage: 12, speed: 520, range: 420, radius: 9, tint: 0xd8e8ff }, 120);
    await wait(1000); // dash + bolt flight
    const moved = Math.hypot(ms.player.x - from.x, ms.player.y - from.y);
    const drop = hp0 - a.health.current;
    a.destroy();
    return { setup: 'ok', moved, drop };
  });
  ok(
    'samurai ext — dash-and-fire: the dash carries the player while the mid-dash bolt lands downrange',
    dashRun.setup === 'ok' && dashRun.moved > 120 && dashRun.drop === 12,
    JSON.stringify(dashRun),
  );

  // 3ah. MONK FRAMEWORK EXTENSIONS (permanent): the DEFLECT parry config (melee
  // AND projectiles, distinct riposte scaling, Samurai config untouched), the
  // dual ring (damage + heal in one cast, decoy included), the mobile damage
  // pulse ring, and the ally rule (HP-cost transfer heals the decoy; a cast
  // with no ally whiffs gracefully).
  const monkExt = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!window.__quietSpot()) return { setup: 'no quiet spot' };
    ms.summons.clear();
    const spawnAt = (dx, dy) => {
      const w = ms.activeMap().nearestWalkableWorld(ms.player.x + dx, ms.player.y + dy);
      return ms.spawnAngel('darkcaster', w.x, w.y);
    };
    // DEFLECT vs a projectile: half-scaled riposte snaps back at the nearest foe.
    const a = spawnAt(80, 0);
    await wait(200);
    ms.stunEnemiesInRange(a.x, a.y, 40, 9000);
    ms.playerHealth.shield = 0;
    ms.playerHealth.full();
    const hp0 = ms.playerHealth.current;
    const aHp0 = a.health.current;
    ms.openParryWindow(800, 20, { deflectProjectiles: true, projectileRiposteMult: 0.5 });
    ms.onProjectileHitPlayer(10); // the REAL ranged damage path
    const deflect = { negated: ms.playerHealth.current === hp0, riposte: aHp0 - a.health.current, consumed: ms.parry === null };
    // The SAME config vs melee: full riposte (distinct scaling) through the wolf seam.
    const wolf = ms.spawnTownsfolk(ms.player.x + 60, ms.player.y, null, 'wolf');
    await wait(200);
    const wHp0 = wolf.health.current;
    const hp1 = ms.playerHealth.current;
    ms.openParryWindow(800, 6, { deflectProjectiles: true, projectileRiposteMult: 0.5 });
    ms.onTownsfolkHitPlayer(wolf);
    const meleeHalf = { negated: ms.playerHealth.current === hp1, riposte: wHp0 - wolf.health.current };
    wolf.takeHit(1e9);
    // The SAMURAI config (no opts) stays MELEE-ONLY: the bolt passes through and
    // the window survives for the melee hit it was opened for.
    ms.playerHealth.full();
    const hp2 = ms.playerHealth.current;
    ms.openParryWindow(800, 20);
    ms.onProjectileHitPlayer(10);
    const samuraiUntouched = { boltTook: hp2 - ms.playerHealth.current, windowSurvived: ms.parry !== null };
    ms.parry = null;
    // DUAL RING: one cast damages the pinned foe AND heals the caster + the decoy.
    const decoy = ms.spawnSpiritDecoy(20000);
    await wait(150);
    decoy.health.current -= 20;
    ms.playerHealth.current = ms.playerHealth.max - 30;
    const dHp0 = decoy.health.current;
    const pHp0 = ms.playerHealth.current;
    const aHp1 = a.health.current;
    decoy.sprite.body.reset(ms.player.x - 60, ms.player.y);
    ms.runComposedSteps([
      { p: 'strike', at: 'self', radius: 120, damageRaw: 15, tint: 0xffd8a0 },
      { p: 'heal', amount: 12, radius: 120 },
    ]);
    await wait(120);
    const dual = { foe: aHp1 - a.health.current, self: ms.playerHealth.current - pHp0, decoy: decoy.health.current - dHp0 };
    // MOBILE PULSE RING: ticks here, then FOLLOWS to a second foe far away.
    ms.startPulseRing(2600, 350, 130, 10);
    const aHp2 = a.health.current;
    await wait(800);
    const nearTicks = aHp2 - a.health.current;
    const b = spawnAt(420, 0);
    await wait(150);
    ms.stunEnemiesInRange(b.x, b.y, 40, 6000);
    ms.player.sprite.body.reset(b.x - 60, b.y); // walk away — the ring must come along
    const bHp0 = b.health.current;
    await wait(800);
    const followTicks = bHp0 - b.health.current;
    await wait(1300);
    const ringEnded = ms.pulseRing === null;
    // ALLY RULE: the HP-cost transfer heals the decoy; with no ally it whiffs gracefully.
    ms.playerHealth.full();
    decoy.health.current = Math.max(1, decoy.health.max - 40);
    const dHp1 = decoy.health.current;
    const pHp1 = ms.playerHealth.current;
    const gave = ms.transferHealToAlly(500, 15, 25);
    const infusion = { gave, decoyHealed: decoy.health.current - dHp1, playerPaid: pHp1 - ms.playerHealth.current };
    ms.summons.clear();
    const whiffed = ms.transferHealToAlly(500, 15, 25) === false; // no ally → graceful false
    a.destroy();
    b.destroy();
    ms.playerHealth.full();
    ms.playerHealth.shield = 1e9;
    return { setup: 'ok', deflect, meleeHalf, samuraiUntouched, dual, nearTicks, followTicks, ringEnded, infusion, whiffed };
  });
  ok(
    'monk ext — deflect: turns aside a real bolt (half riposte) AND a real wolf bite (full); the samurai config stays melee-only',
    monkExt.setup === 'ok' &&
      monkExt.deflect.negated &&
      monkExt.deflect.riposte === 10 &&
      monkExt.deflect.consumed &&
      monkExt.meleeHalf.negated &&
      monkExt.meleeHalf.riposte === 6 &&
      monkExt.samuraiUntouched.boltTook > 0 &&
      monkExt.samuraiUntouched.windowSurvived,
    JSON.stringify({ deflect: monkExt.deflect, meleeHalf: monkExt.meleeHalf, samurai: monkExt.samuraiUntouched }),
  );
  ok(
    'monk ext — dual ring: one cast damages the live enemy and heals the caster + the decoy',
    monkExt.setup === 'ok' && monkExt.dual.foe === 15 && monkExt.dual.self === 12 && monkExt.dual.decoy === 12,
    JSON.stringify(monkExt.dual),
  );
  ok(
    'monk ext — pulse ring: ticks in place, FOLLOWS the caster to a second foe, ends on time',
    monkExt.setup === 'ok' && monkExt.nearTicks >= 10 && monkExt.followTicks >= 10 && monkExt.ringEnded,
    JSON.stringify({ near: monkExt.nearTicks, follow: monkExt.followTicks, ended: monkExt.ringEnded }),
  );
  ok(
    'monk ext — ally rule: the HP-cost transfer heals the decoy; with no ally it whiffs gracefully (no crash)',
    monkExt.setup === 'ok' && monkExt.infusion.gave && monkExt.infusion.decoyHealed === 25 && monkExt.infusion.playerPaid === 15 && monkExt.whiffed,
    JSON.stringify(monkExt.infusion),
  );

  // 3ai. ASSASSIN FRAMEWORK EXTENSIONS (permanent): the TRAP SYSTEM lifecycle
  // (place APART → arm → spring on a REAL enemy → payload → consumed; the cap;
  // Remote Detonation; Minefield; expiry), the STEALTH-BONUS strike rider
  // (measured against the SAME strike unstealthed), SHADOW DANCE (striking
  // stays hidden), and VANISH (instant re-stealth + the untargetable breath) —
  // every phase through the live runtime seams.
  const assassinExt = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!window.__quietSpot()) return { setup: 'no quiet spot' };
    const spawnAt = (dx, dy) => {
      const w = ms.activeMap().nearestWalkableWorld(ms.player.x + dx, ms.player.y + dy);
      return ms.spawnAngel('darkcaster', w.x, w.y);
    };
    const px0 = ms.player.x;
    const py0 = ms.player.y;
    // TRAP LIFECYCLE: the device is placed 220px away (the player stands apart),
    // stays INERT while arming, then springs on the pinned foe inside its radius.
    const a = spawnAt(220, 0);
    await wait(200);
    ms.stunEnemiesInRange(a.x, a.y, 60, 30000);
    a.sprite.body.reset(px0 + 220, py0);
    const aHp0 = a.health.current;
    ms.placeTrap(a.x, a.y, { armDelayMs: 600, lifetimeMs: 8000, triggerRadius: 80, payload: { burstDamage: 10, burstRadius: 90 } });
    const placed = ms.traps.length === 1;
    await wait(250);
    const inert = ms.traps.length === 1 && a.health.current === aHp0; // arming ≠ armed
    await wait(700);
    const lifecycle = { placed, inert, payloadLanded: aHp0 - a.health.current > 0, consumed: ms.traps.length === 0, apart: Math.hypot(ms.player.x - a.x, ms.player.y - a.y) > 150 };
    // THE CAP: cap+1 capped placements leave exactly trapCap devices (oldest recycled).
    const cap = ms.trapCap;
    for (let i = 0; i <= cap; i++) ms.placeTrap(px0 - 260 - i * 34, py0 + 120, { armDelayMs: 100, lifetimeMs: 9000, triggerRadius: 40, payload: { burstDamage: 5 } });
    const capHeld = ms.traps.length === cap;
    await wait(250); // all armed
    const detFiredFar = ms.detonateArmedTraps(); // REMOTE DETONATION consumes them all
    const detCleared = ms.traps.length === 0;
    // REMOTE DETONATION lands its payload: a foe OUTSIDE the trigger radius but
    // INSIDE the burst radius is only hurt when the device is fired by hand.
    const b = spawnAt(320, 60);
    await wait(200);
    ms.stunEnemiesInRange(b.x, b.y, 60, 30000);
    ms.placeTrap(b.x - 60, b.y, { armDelayMs: 100, lifetimeMs: 9000, triggerRadius: 40, payload: { burstDamage: 8, burstRadius: 120 } });
    await wait(300);
    const bHp0 = b.health.current;
    const notSprung = ms.traps.length === 1 && b.health.current === bHp0;
    const detFiredNear = ms.detonateArmedTraps();
    const remote = { fired: detFiredFar + detFiredNear, notSprung, landed: bHp0 - b.health.current > 0, cleared: detCleared && ms.traps.length === 0 };
    // MINEFIELD seeds N devices UNCAPPED; untriggered devices EXPIRE clean.
    ms.placeMinefield(px0 - 420, py0 - 200, 6, 120, { armDelayMs: 5000, lifetimeMs: 700, triggerRadius: 40, payload: { burstDamage: 5 } });
    const seeded = ms.traps.length === 6;
    await wait(1000);
    const minefield = { seeded, expired: ms.traps.length === 0 };
    // STEALTH-BONUS rider: the SAME raw-damage strike, unstealthed then stealthed —
    // the ratio IS the bonus, and the stealthed cast breaks stealth.
    const c = spawnAt(80, 0);
    await wait(200);
    ms.stunEnemiesInRange(c.x, c.y, 60, 30000);
    c.sprite.body.reset(px0 + 80, py0);
    ms.player.facingX = 1;
    ms.player.facingY = 0;
    // damageRaw 4 keeps the 55-HP foe alive through all five measured strikes (4+8+3×8=36).
    const strike = [{ p: 'strike', at: 'front', range: 95, damageRaw: 4, stealthBonus: 2, tint: 0x9a9ab8 }];
    const cHp0 = c.health.current;
    ms.runComposedSteps(strike);
    await wait(120);
    const baseDrop = cHp0 - c.health.current;
    ms.startPlayerStealth(6000);
    const cHp1 = c.health.current;
    ms.runComposedSteps(strike);
    await wait(120);
    const rider = { baseDrop, stealthDrop: cHp1 - c.health.current, broke: !ms.playerStealthActive };
    // SHADOW DANCE: three strikes in the state — every one boosted, stealth INTACT.
    ms.startShadowDance(5000);
    const danceOn = ms.playerStealthActive;
    const danceDrops = [];
    for (let i = 0; i < 3; i++) {
      const before = c.health.current;
      ms.runComposedSteps(strike);
      await wait(120);
      danceDrops.push(before - c.health.current);
    }
    const dance = { danceOn, drops: danceDrops, stillHidden: ms.playerStealthActive };
    ms.shadowDanceUntil = 0;
    ms.breakPlayerStealth();
    // VANISH: the instant mid-combat re-stealth + the breath where a REAL bolt
    // seam and a REAL wolf bite both meet empty shadow — and the breath ENDS.
    const wolf = ms.spawnTownsfolk(px0 + 60, py0, null, 'wolf');
    await wait(200);
    ms.playerHealth.shield = 0;
    ms.playerHealth.full();
    ms.vanish(4000, 900);
    const hidden = ms.playerStealthActive;
    let hp = ms.playerHealth.current;
    ms.onProjectileHitPlayer(15);
    const boltPassed = ms.playerHealth.current === hp;
    hp = ms.playerHealth.current;
    ms.onTownsfolkHitPlayer(wolf);
    const bitePassed = ms.playerHealth.current === hp;
    await wait(1000); // the breath ends (stealth itself continues)
    hp = ms.playerHealth.current;
    ms.onProjectileHitPlayer(10);
    const graceEnded = ms.playerHealth.current < hp;
    const vanish = { hidden, boltPassed, bitePassed, graceEnded, stillStealthed: ms.playerStealthActive };
    ms.breakPlayerStealth();
    if (wolf.isAlive) wolf.takeHit(1e9);
    a.destroy();
    b.destroy();
    c.destroy();
    ms.playerHealth.full();
    ms.playerHealth.shield = 1e9;
    return { setup: 'ok', lifecycle, cap, capHeld, remote, minefield, rider, dance, vanish };
  });
  ok(
    'assassin ext — trap lifecycle: placed apart, inert while arming, springs on a real enemy, payload lands, device consumed',
    assassinExt.setup === 'ok' && assassinExt.lifecycle.placed && assassinExt.lifecycle.inert && assassinExt.lifecycle.payloadLanded && assassinExt.lifecycle.consumed && assassinExt.lifecycle.apart,
    JSON.stringify(assassinExt.lifecycle),
  );
  ok(
    'assassin ext — cap + remote detonation: the cap recycles the oldest; detonation fires every armed device (payload included)',
    assassinExt.setup === 'ok' && assassinExt.capHeld && assassinExt.remote.fired === assassinExt.cap + 1 && assassinExt.remote.notSprung && assassinExt.remote.landed && assassinExt.remote.cleared,
    `cap=${assassinExt.cap} ${JSON.stringify(assassinExt.remote)}`,
  );
  ok(
    'assassin ext — minefield + expiry: six devices seeded past the cap; untriggered devices expire clean',
    assassinExt.setup === 'ok' && assassinExt.minefield.seeded && assassinExt.minefield.expired,
    JSON.stringify(assassinExt.minefield),
  );
  ok(
    'assassin ext — stealth bonus: the same strike lands ×2 from stealth, and the cast breaks stealth',
    assassinExt.setup === 'ok' && assassinExt.rider.baseDrop > 0 && Math.abs(assassinExt.rider.stealthDrop / assassinExt.rider.baseDrop - 2) < 0.05 && assassinExt.rider.broke,
    JSON.stringify(assassinExt.rider),
  );
  ok(
    'assassin ext — shadow dance: three strikes, every one boosted, stealth intact throughout',
    assassinExt.setup === 'ok' && assassinExt.dance.danceOn && assassinExt.dance.drops.length === 3 && assassinExt.dance.drops.every((d) => assassinExt.rider.baseDrop > 0 && Math.abs(d / assassinExt.rider.baseDrop - 2) < 0.05) && assassinExt.dance.stillHidden,
    JSON.stringify(assassinExt.dance),
  );
  ok(
    'assassin ext — vanish: instant mid-combat re-stealth; a real bolt and a real bite pass through the breath, which then ends',
    assassinExt.setup === 'ok' && assassinExt.vanish.hidden && assassinExt.vanish.boltPassed && assassinExt.vanish.bitePassed && assassinExt.vanish.graceEnded && assassinExt.vanish.stillStealthed,
    JSON.stringify(assassinExt.vanish),
  );

  // 3aj. PRIEST FRAMEWORK EXTENSIONS (permanent): the TARGETED ALLY-SHIELD
  // (solo → self, absorbing a REAL wolf bite + the harm-immunity breath; with a
  // decoy out → the decoy's pool absorbs, then expires), the DUAL CHANNEL (one
  // cast measured healing the caster AND damaging the pinned foe it crosses),
  // and the party-dormant REVIVE hook (no fallen friendly exists today).
  const priestExt = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!window.__quietSpot()) return { setup: 'no quiet spot' };
    ms.summons.clear();
    ms.clearDots(); // zero the caster-affliction state so the immunity assert is exact
    // SOLO ALLY-SHIELD: self is the valid target; a real wolf bite is absorbed
    // whole, and the immunity breath blocks the caster-bolt afflictions.
    ms.playerHealth.shield = 0;
    ms.playerHealth.full();
    const who = ms.allyShield(300, 30, 5000, 2000);
    const selfShielded = who === 'self' && ms.playerHealth.shield === 30;
    const wolf = ms.spawnTownsfolk(ms.player.x + 60, ms.player.y, null, 'wolf');
    await wait(200);
    const hp0 = ms.playerHealth.current;
    ms.onTownsfolkHitPlayer(wolf); // the wolf's REAL melee hit path
    const absorbed = { untouched: ms.playerHealth.current === hp0, shieldSpent: ms.playerHealth.shield < 30 };
    ms.onProjectileHitPlayer(5, 'caster-bolt'); // the REAL afflicting bolt path
    const immune = ms.casterSlowUntil === 0 && ms.casterDotStacks.length === 0;
    if (wolf.isAlive) wolf.takeHit(1e9);
    ms.playerHealth.shield = 0;
    // DECOY ALLY-SHIELD: the nearest friendly takes the pool; it absorbs and EXPIRES.
    const decoy = ms.spawnSpiritDecoy(20000);
    await wait(150);
    const who2 = ms.allyShield(300, 20, 900, 0);
    const decoyShielded = who2 === 'summon' && decoy.health.shield === 20;
    const dHp0 = decoy.health.current;
    decoy.health.damage(12);
    const decoyAbsorbed = decoy.health.current === dHp0 && decoy.health.shield === 8;
    await wait(1100);
    const decoyExpired = decoy.health.shield === 0;
    ms.summons.clear();
    // DUAL CHANNEL: one cast, both halves measured — the wounded caster heals
    // while the pinned foe standing in the beam burns.
    const w = ms.activeMap().nearestWalkableWorld(ms.player.x + 140, ms.player.y);
    const foe = ms.spawnAngel('darkcaster', w.x, w.y);
    await wait(200);
    ms.stunEnemiesInRange(foe.x, foe.y, 60, 30000);
    foe.sprite.body.reset(ms.player.x + 140, ms.player.y);
    ms.player.facingX = 1;
    ms.player.facingY = 0;
    ms.playerHealth.shield = 0;
    ms.playerHealth.full();
    ms.playerHealth.current -= 40;
    const pHp0 = ms.playerHealth.current;
    const fHp0 = foe.health.current;
    ms.startDualChannel(1600, 300, 6, 7, 240, 56);
    const started = ms.dualChannel !== null;
    await wait(1100);
    const midHeal = ms.playerHealth.current - pHp0;
    const midBurn = fHp0 - foe.health.current;
    await wait(900);
    const dual = { started, healed: midHeal, burned: midBurn, ended: ms.dualChannel === null };
    foe.destroy();
    // THE DORMANT REVIVE HOOK: no party exists — there is never a fallen friendly.
    const reviveWhiffs = ms.reviveFallenAlly() === false;
    ms.playerHealth.full();
    ms.playerHealth.shield = 1e9;
    return { setup: 'ok', selfShielded, absorbed, immune, decoyShielded, decoyAbsorbed, decoyExpired, dual, reviveWhiffs };
  });
  ok(
    'priest ext — ally-shield: solo it wraps the caster (a real bite absorbed + afflictions blocked); with a decoy out the decoy takes the pool, absorbs, expires',
    priestExt.setup === 'ok' && priestExt.selfShielded && priestExt.absorbed.untouched && priestExt.absorbed.shieldSpent && priestExt.immune && priestExt.decoyShielded && priestExt.decoyAbsorbed && priestExt.decoyExpired,
    JSON.stringify({ selfShielded: priestExt.selfShielded, absorbed: priestExt.absorbed, immune: priestExt.immune, decoyShielded: priestExt.decoyShielded, decoyAbsorbed: priestExt.decoyAbsorbed, decoyExpired: priestExt.decoyExpired }),
  );
  ok(
    'priest ext — dual channel: one cast heals the wounded caster AND burns the foe in the beam, then ends on time',
    priestExt.setup === 'ok' && priestExt.dual.started && priestExt.dual.healed >= 12 && priestExt.dual.burned >= 14 && priestExt.dual.ended,
    JSON.stringify(priestExt.dual),
  );
  ok(
    'priest ext — revive hook: party-dormant, it finds no fallen friendly (the skill whiff-refunds through the ally rule)',
    priestExt.setup === 'ok' && priestExt.reviveWhiffs,
    `reviveWhiffs=${priestExt.reviveWhiffs}`,
  );

  // 3ak. SAVAGE FRAMEWORK EXTENSIONS (permanent): FRENZY momentum (stacks build
  // per damaging frame, every damage path scales, silence drops them), the
  // LEAP-SLAM (an aimed jump landing an AoE + knockdown on a live pack), the
  // BLOOD PRICE (health-paid casting that refuses gracefully at low blood), and
  // the HP-THRESHOLD EXECUTE (the low-health finisher measured both ways).
  const savageExt = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!window.__quietSpot()) return { setup: 'no quiet spot' };
    const spawnAt = (dx, dy) => {
      const w = ms.activeMap().nearestWalkableWorld(ms.player.x + dx, ms.player.y + dy);
      return ms.spawnAngel('darkcaster', w.x, w.y);
    };
    // FRENZY: baseline strike at zero stacks, three more to build momentum —
    // the fourth swing lands ×(1 + 3×0.1); silence then drops every stack.
    const a = spawnAt(80, 0);
    await wait(200);
    ms.stunEnemiesInRange(a.x, a.y, 60, 30000);
    a.sprite.body.reset(ms.player.x + 60, ms.player.y);
    ms.player.facingX = 1;
    ms.player.facingY = 0;
    ms.armFrenzy(0.1, 5, 1200);
    const strike = [{ p: 'strike', at: 'front', range: 90, damage: 10, tint: 0xff8a5a }];
    const drops = [];
    for (let i = 0; i < 4; i++) {
      const before = a.health.current;
      ms.runComposedSteps(strike);
      await wait(120);
      drops.push(before - a.health.current);
    }
    const stacksAfter = ms.frenzy.stacks;
    await wait(1500); // silence — the momentum bleeds away
    const frenzy = { drops, stacksAfter, decayed: ms.frenzy.stacks === 0 };
    ms.disarmFrenzy();
    a.destroy();
    // LEAP-SLAM: two pinned foes 220px out — the jump lands among them, the
    // slam wounds and KNOCKS DOWN both, and the player has actually moved.
    const b = spawnAt(220, 30);
    const c = spawnAt(220, -30);
    await wait(200);
    const from = { x: ms.player.x, y: ms.player.y };
    ms.player.facingX = 1;
    ms.player.facingY = 0;
    // Place both foes at the landing point and slam IN THE SAME TICK — no
    // placement stun, so the knockdown measured is the slam's own.
    b.sprite.body.reset(from.x + 220, from.y + 35);
    c.sprite.body.reset(from.x + 220, from.y - 35);
    const bHp0 = b.health.current;
    const cHp0 = c.health.current;
    ms.leapSlam(220, 100, 12, 900);
    const now = ms.time.now;
    const leap = {
      moved: Math.hypot(ms.player.x - from.x, ms.player.y - from.y),
      bothHit: bHp0 - b.health.current > 0 && cHp0 - c.health.current > 0,
      bothDown: (ms.stunnedEnemies.get(b) ?? 0) > now && (ms.stunnedEnemies.get(c) ?? 0) > now,
    };
    b.destroy();
    c.destroy();
    // BLOOD PRICE: a willing cut bypasses the shield; too little blood refuses.
    ms.playerHealth.shield = 500;
    ms.playerHealth.full();
    const hpFull = ms.playerHealth.current;
    const paid = ms.payBloodPrice(20);
    const price = { paid, hpCut: hpFull - ms.playerHealth.current, shieldIntact: ms.playerHealth.shield === 500 };
    ms.playerHealth.current = 15;
    const refused = ms.payBloodPrice(20) === false && ms.playerHealth.current === 15;
    ms.playerHealth.full();
    ms.playerHealth.shield = 1e9;
    // EXECUTE: two pinned foes — one bled below the threshold takes ×2, the
    // healthy one beside it takes the ordinary blow.
    const d = spawnAt(70, 40);
    const e2 = spawnAt(70, -40);
    await wait(200);
    for (const f of [d, e2]) ms.stunEnemiesInRange(f.x, f.y, 60, 30000);
    // Bleed one to just under the 0.35 line with enough HP LEFT to survive the
    // doubled blow (an overkill-capped drop would understate the ×2).
    d.health.current = Math.floor(d.health.max * 0.34);
    const dHp0 = d.health.current;
    const eHp0 = e2.health.current;
    const res = ms.executeHitAll(ms.player.x + 70, ms.player.y, 90, 8, 0.35, 2);
    const execute = { res, lowDrop: dHp0 - d.health.current, healthyDrop: eHp0 - e2.health.current };
    d.destroy();
    e2.destroy();
    ms.playerHealth.full();
    ms.playerHealth.shield = 1e9;
    return { setup: 'ok', frenzy, leap, price, refused, execute };
  });
  ok(
    'savage ext — frenzy: stacks build per bloody frame, the fourth swing lands ×1.3, silence drops them',
    savageExt.setup === 'ok' &&
      savageExt.frenzy.drops[0] === 10 &&
      savageExt.frenzy.drops[3] === 13 &&
      savageExt.frenzy.stacksAfter === 4 &&
      savageExt.frenzy.decayed,
    JSON.stringify(savageExt.frenzy),
  );
  ok(
    'savage ext — leap-slam: the aimed jump moves the player and the slam wounds + knocks down the live pack',
    savageExt.setup === 'ok' && savageExt.leap.moved > 140 && savageExt.leap.bothHit && savageExt.leap.bothDown,
    JSON.stringify(savageExt.leap),
  );
  ok(
    'savage ext — blood price: the willing cut bypasses shields; too little blood refuses gracefully',
    savageExt.setup === 'ok' && savageExt.price.paid && savageExt.price.hpCut === 20 && savageExt.price.shieldIntact && savageExt.refused,
    JSON.stringify({ price: savageExt.price, refused: savageExt.refused }),
  );
  ok(
    'savage ext — execute: the bled foe below the line takes ×2, the healthy one beside it takes the ordinary blow',
    savageExt.setup === 'ok' && savageExt.execute.res.hit === 2 && savageExt.execute.res.executed === 1 && savageExt.execute.lowDrop === 16 && savageExt.execute.healthyDrop === 8,
    JSON.stringify(savageExt.execute),
  );

  // 3al. HUNTER FRAMEWORK EXTENSIONS (permanent): TAME capture-and-cleanse
  // (whittle above the health line, CONVERT at/below it, corrupted-wildlife
  // ONLY — every other family refuses with a refund; the conversion is not a
  // kill), THE BOND's persistence (saved on the character, re-manifests on
  // load; death = mend cooldown + Tame recall, never loss), the PET MODES
  // (Great Beast / Beast Horde, one expression at a time), the PET COMMANDS
  // (FOCUS one mark / SCATTER spread), and the RETURNING BOLT (out AND back).
  const hunterExt = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!window.__quietSpot()) return { setup: 'no quiet spot' };
    const walk = (dx, dy) => ms.activeMap().nearestWalkableWorld(ms.player.x + dx, ms.player.y + dy);
    const tame = { range: 160, whittleDamage: 4, thresholdPct: 0.5 };

    // Mode swap WITHOUT a bond refuses through the ally rule (refund).
    ms.actionWhiffed = false;
    const noBondWhiff = ms.setHunterPetMode('great') === false && ms.actionWhiffed === true;
    ms.actionWhiffed = false;

    // FAMILY GATE: an angel (dark-caster) refuses — lore feedback, full refund, no bond.
    const aSpot = walk(70, 0);
    const angel = ms.spawnAngel('darkcaster', aSpot.x, aSpot.y);
    await wait(150);
    ms.stunEnemiesInRange(angel.x, angel.y, 90, 30000);
    angel.sprite.body.reset(ms.player.x + 60, ms.player.y);
    const refusedKind = ms.hunterTame(tame);
    const refused = refusedKind === 'refused' && ms.actionWhiffed === true && !ms.hunterBond;
    ms.actionWhiffed = false;
    angel.destroy();

    // WHITTLE → CLEANSE on a live wolf (15 HP): 4-damage whittles walk it to the
    // 50% line (15 → 11 → 7), then the SAME cast converts. No XP — not a kill.
    const wSpot = walk(60, 0);
    const wolf = ms.spawnTownsfolk(wSpot.x, wSpot.y, null, 'wolf');
    await wait(150);
    ms.stunEnemiesInRange(wolf.x, wolf.y, 90, 30000);
    wolf.sprite.body.reset(ms.player.x + 60, ms.player.y);
    const xp0 = ms.progression.currentXP;
    const kinds = [];
    for (let i = 0; i < 6 && kinds[kinds.length - 1] !== 'tamed'; i++) {
      kinds.push(ms.hunterTame(tame));
      await wait(60);
    }
    const tamed = {
      kinds,
      wolfGone: !wolf.isAlive,
      bond: !!ms.hunterBond,
      pets: ms.hunterPets().length,
      key: ms.hunterPets()[0]?.config.key,
      xpDelta: ms.progression.currentXP - xp0,
    };

    // PERSISTENCE: the bond survives a save/load round trip and the companion
    // re-manifests, world in place (world travel runs this same respawn seam).
    const snap = ms.serialize();
    const savedFlag = snap.player.hunterBonded === true;
    ms.applySave(snap);
    await wait(250);
    const persisted = { savedFlag, bondBack: !!ms.hunterBond, petBack: ms.hunterPets().length === 1 };

    // DEATH: the pet falls → despawn + mend cooldown, the bond ENDURES; the Tame
    // recall whiffs (refunding) while mending, then brings the beast back.
    ms.hunterPets()[0].takeHit(100000);
    await wait(250); // the manager prunes the corpse (fires the death hook)
    const afterDeath = {
      pets: ms.hunterPets().length,
      bondKept: !!ms.hunterBond,
      mending: !!ms.hunterBond && ms.hunterBond.deathUntil > ms.time.now,
    };
    ms.actionWhiffed = false;
    const mendWhiff = ms.hunterTame(tame) === 'whiff' && ms.actionWhiffed === true;
    ms.actionWhiffed = false;
    ms.hunterBond.deathUntil = 0; // the mend passes
    const recalled = ms.hunterTame(tame) === 'resummon' && ms.hunterPets().length === 1;

    // PET MODES: Great Beast = ONE magnet-tier tank; Beast Horde = THREE minion
    // strikers; stance-exclusive (never both); exiting returns the base beast.
    const okGreat = ms.setHunterPetMode('great');
    const great = ms.hunterPets();
    const modeGreat = okGreat && great.length === 1 && great[0].config.key === 'hunter_great' && great[0].aggroPriority === 3;
    const okHorde = ms.setHunterPetMode('horde');
    const horde = ms.hunterPets();
    const modeHorde =
      okHorde && horde.length === 3 && horde.every((p) => p.config.key === 'hunter_horde') && ms.summons.list.every((p) => p.config.key !== 'hunter_great');
    const okBase = ms.setHunterPetMode('companion');
    const base = ms.hunterPets();
    const modeBack = okBase && base.length === 1 && base[0].config.key === 'hunter_companion';

    // FOCUS: two pinned foes — the mark eats the swings, the bystander bleeds
    // nothing. (Spawned beyond the pet's seek range, pinned, then placed + the
    // command given in the SAME tick so nothing swings early.)
    const f1 = ms.spawnAngel('darkcaster', walk(420, 0).x, walk(420, 0).y);
    const f2 = ms.spawnAngel('darkcaster', walk(420, 90).x, walk(420, 90).y);
    await wait(150);
    for (const f of [f1, f2]) {
      ms.stunEnemiesInRange(f.x, f.y, 90, 30000);
      f.health.max = 500;
      f.health.current = 500; // nobody dies mid-measurement
    }
    f1.sprite.body.reset(ms.player.x + 70, ms.player.y);
    f2.sprite.body.reset(ms.player.x + 70, ms.player.y + 90);
    const f1hp0 = f1.health.current;
    const f2hp0 = f2.health.current;
    const focusOk = ms.hunterFocusCommand(200, 4000);
    await wait(1600);
    const focus = { focusOk, markHit: f1hp0 - f1.health.current > 0, bystanderClean: f2.health.current === f2hp0 };

    // SCATTER: the horde spreads — three beasts, two pinned foes, BOTH bleed.
    ms.setHunterPetMode('horde');
    const s1hp0 = f1.health.current;
    const s2hp0 = f2.health.current;
    const scatterOk = ms.hunterScatterCommand(4000);
    await wait(1800);
    const scatter = { scatterOk, spread: f1.health.current < s1hp0 && f2.health.current < s2hp0 };
    f1.destroy();
    f2.destroy();

    // RETURNING BOLT: bench the pets (no interference), pin one tough foe at
    // 120px, throw a 260px boomerang — it cuts the foe going OUT and BACK, then
    // lands home (no live player bolts left).
    ms.clearHunterPets();
    const foe = ms.spawnAngel('darkcaster', walk(120, 0).x, walk(120, 0).y);
    await wait(150);
    ms.stunEnemiesInRange(foe.x, foe.y, 90, 30000);
    foe.sprite.body.reset(ms.player.x + 120, ms.player.y);
    foe.health.max = 500;
    foe.health.current = 500;
    const bHp0 = foe.health.current;
    ms.projectiles.spawn({ x: ms.player.x, y: ms.player.y, dirX: 1, dirY: 0, speed: 520, damage: 9, maxRange: 260, faction: 'player', color: 0xa0c86a, radius: 9, returning: true });
    await wait(1400);
    const boomerang = {
      hits: Math.round((bHp0 - foe.health.current) / 9),
      settled: ms.projectiles.pool.filter((b) => b.active && b.faction === 'player').length === 0,
    };
    foe.destroy();
    ms.clearHunterState(true); // leave no bond behind for later checks
    ms.playerHealth.full();
    ms.playerHealth.shield = 1e9;
    return { setup: 'ok', noBondWhiff, refused, tamed, persisted, afterDeath, mendWhiff, recalled, modeGreat, modeHorde, modeBack, focus, scatter, boomerang };
  });
  ok(
    'hunter ext — tame family gate: the dark-caster refuses ("chose its corruption"), the cast refunds, no bond forms',
    hunterExt.setup === 'ok' && hunterExt.refused,
    JSON.stringify({ refused: hunterExt.refused }),
  );
  ok(
    'hunter ext — tame whittle→cleanse: whittles walk the wolf to the line, the conversion cast bonds it (no XP — not a kill), the companion stands',
    hunterExt.setup === 'ok' &&
      hunterExt.tamed.kinds.length >= 2 &&
      hunterExt.tamed.kinds[hunterExt.tamed.kinds.length - 1] === 'tamed' &&
      hunterExt.tamed.kinds.every((k) => k === 'whittle' || k === 'tamed') &&
      hunterExt.tamed.kinds.filter((k) => k === 'tamed').length === 1 &&
      hunterExt.tamed.wolfGone &&
      hunterExt.tamed.bond &&
      hunterExt.tamed.pets === 1 &&
      hunterExt.tamed.key === 'hunter_companion' &&
      hunterExt.tamed.xpDelta === 0,
    JSON.stringify(hunterExt.tamed),
  );
  ok(
    'hunter ext — bond persistence: the bond serializes on the character and the companion re-manifests after the load',
    hunterExt.setup === 'ok' && hunterExt.persisted.savedFlag && hunterExt.persisted.bondBack && hunterExt.persisted.petBack,
    JSON.stringify(hunterExt.persisted),
  );
  ok(
    'hunter ext — death is never loss: the fallen pet despawns into a mend cooldown (recall whiffs + refunds), then Tame recalls the beast',
    hunterExt.setup === 'ok' &&
      hunterExt.afterDeath.pets === 0 &&
      hunterExt.afterDeath.bondKept &&
      hunterExt.afterDeath.mending &&
      hunterExt.mendWhiff &&
      hunterExt.recalled,
    JSON.stringify({ afterDeath: hunterExt.afterDeath, mendWhiff: hunterExt.mendWhiff, recalled: hunterExt.recalled }),
  );
  ok(
    'hunter ext — pet modes: Great Beast = one magnet tank, Beast Horde = three strikers, stance-exclusive, exit returns the base beast (no bond = whiff)',
    hunterExt.setup === 'ok' && hunterExt.noBondWhiff && hunterExt.modeGreat && hunterExt.modeHorde && hunterExt.modeBack,
    JSON.stringify({ noBondWhiff: hunterExt.noBondWhiff, modeGreat: hunterExt.modeGreat, modeHorde: hunterExt.modeHorde, modeBack: hunterExt.modeBack }),
  );
  ok(
    'hunter ext — FOCUS: every swing lands on the one marked foe; the bystander beside it bleeds nothing',
    hunterExt.setup === 'ok' && hunterExt.focus.focusOk && hunterExt.focus.markHit && hunterExt.focus.bystanderClean,
    JSON.stringify(hunterExt.focus),
  );
  ok(
    'hunter ext — SCATTER: the horde spreads across DIFFERENT targets — both pinned foes bleed',
    hunterExt.setup === 'ok' && hunterExt.scatter.scatterOk && hunterExt.scatter.spread,
    JSON.stringify(hunterExt.scatter),
  );
  ok(
    'hunter ext — returning bolt: the boomerang cuts the foe going OUT and again coming BACK, then lands home',
    hunterExt.setup === 'ok' && hunterExt.boomerang.hits === 2 && hunterExt.boomerang.settled,
    JSON.stringify(hunterExt.boomerang),
  );

  // 3am. SUNDIAN FRAMEWORK EXTENSIONS (permanent): THE TIDE (two phases on a
  // real pack — pulled IN with damage, held, then blasted OUT with damage),
  // DRENCH + DEPTH CRUSH (its own stack ledger with a per-stack slow; the
  // crush consumes exactly the drench while the Mage's crystallize ledger on
  // the SAME enemy is untouched), the REGALIA (one worn aura at a time,
  // attunement scales it, the DROWNED CROWN runs all three empowered), and
  // the CANON RENAME ('Sundian' gates Bali's chain; 'Atlantean' is deprecated
  // and gates nothing; every other canon entry unmoved).
  const sundianExt = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    if (!window.__quietSpot()) return { setup: 'no quiet spot' };
    const walk = (dx, dy) => ms.activeMap().nearestWalkableWorld(ms.player.x + dx, ms.player.y + dy);

    // THE TIDE: a pack of two around a point 150 ahead — phase one gathers
    // them at the point (both wounded), phase two throws them back out
    // (both wounded again), and the tide state runs 1 → 2 → drained.
    const tp = walk(150, 0);
    const t1 = ms.spawnAngel('darkcaster', walk(150 + 170, 40).x, walk(150 + 170, 40).y);
    const t2 = ms.spawnAngel('darkcaster', walk(150 - 170, -40).x, walk(150 - 170, -40).y);
    await wait(200);
    for (const f of [t1, t2]) {
      f.health.max = 500;
      f.health.current = 500;
      f.sprite.body.reset(f.x, f.y);
    }
    const d0 = [t1, t2].map((f) => Math.hypot(f.x - tp.x, f.y - tp.y));
    const hp0 = [t1, t2].map((f) => f.health.current);
    ms.tidePulse(tp.x, tp.y, { pullRadius: 260, pullDistance: 150, minGap: 36, pullDamage: 8, phaseGapMs: 600, blastRadius: 220, blastDamage: 10, blastKnockback: 160 });
    const phase1 = ms.tide ? ms.tide.phase : 0;
    const d1 = [t1, t2].map((f) => Math.hypot(f.x - tp.x, f.y - tp.y));
    const hp1 = [t1, t2].map((f) => f.health.current);
    await wait(950); // through the reversal
    const d2 = [t1, t2].map((f) => Math.hypot(f.x - tp.x, f.y - tp.y));
    const hp2 = [t1, t2].map((f) => f.health.current);
    const tide = {
      phase1,
      pulledIn: d1[0] < d0[0] - 60 && d1[1] < d0[1] - 60,
      pullWounds: hp0[0] - hp1[0] === 8 && hp0[1] - hp1[1] === 8,
      blastedOut: d2[0] > d1[0] + 60 && d2[1] > d1[1] + 60,
      blastWounds: hp1[0] - hp2[0] === 10 && hp1[1] - hp2[1] === 10,
      drained: ms.tide === null,
    };
    t1.destroy();
    t2.destroy();

    // DRENCH + DEPTH CRUSH vs the crystallize ledger on the SAME enemy: three
    // drench stacks slow it per stack; four crystallize stacks sit beside them;
    // the crush consumes EXACTLY the drench (damage per stack × 3) and the
    // crystallize ledger + an out-of-radius drench survive; Shatter still
    // consumes its own four afterwards (byte-identical machinery).
    const w1 = ms.spawnTownsfolk(walk(70, 0).x, walk(70, 0).y, null, 'wolf');
    const w2 = ms.spawnTownsfolk(walk(70, 400).x, walk(70, 400).y, null, 'wolf');
    await wait(200);
    for (const w of [w1, w2]) {
      ms.stunEnemiesInRange(w.x, w.y, 90, 30000);
      w.health.max = 200;
      w.health.current = 200;
    }
    w1.sprite.body.reset(ms.player.x + 70, ms.player.y);
    ms.addDrench(w1, 2, 6, 0.1, 8000);
    const twoStacks = ms.drench.get(w1) === 2;
    const slowAtTwo = ms.slowedEnemies.get(w1)?.factor;
    ms.addDrench(w1, 1, 6, 0.1, 8000);
    const threeStacks = ms.drench.get(w1) === 3;
    const slowAtThree = ms.slowedEnemies.get(w1)?.factor;
    ms.addDrench(w2, 2, 6, 0.1, 8000); // out of the crush radius — must survive
    ms.addCrystallize(w1, 4, 6); // the Mage's ledger on the SAME enemy
    const w1hp0 = w1.health.current;
    const crush = ms.crushDrench(w1.x, w1.y, 140, 5);
    const crushed = {
      res: crush,
      drop: w1hp0 - w1.health.current,
      drenchGone: !ms.drench.has(w1),
      farDrenchKept: ms.drench.get(w2) === 2,
      crystalUntouched: ms.crystallize.get(w1) === 4,
    };
    const w1hp1 = w1.health.current;
    const shatter = ms.shatterCrystallize(w1.x, w1.y, 140, 5);
    const shattered = { res: shatter, drop: w1hp1 - w1.health.current, ledgerEmpty: !ms.crystallize.has(w1) };
    w1.destroy();
    w2.destroy();
    ms.drench.delete(w2);

    // REGALIA: one worn aura at a time — each donning EXCLUDES the last; the
    // attunement multiplier scales a re-donned jewel; the DROWNED CROWN runs
    // all three at once, empowered, then the reign ends bare-headed.
    const base = ms.combinedSkillMods();
    ms.wearRegalia('pearl', { regenPerSec: 3 });
    const pearl = { worn: ms.regaliaWorn, regen: ms.combinedSkillMods().regenPerSec - (base.regenPerSec ?? 0) };
    ms.wearRegalia('coral', { reflectPct: 0.25 });
    const afterCoral = ms.combinedSkillMods();
    const coral = { worn: ms.regaliaWorn, reflect: afterCoral.reflectPct - (base.reflectPct ?? 0), pearlOff: (afterCoral.regenPerSec ?? 0) === (base.regenPerSec ?? 0) };
    ms.wearRegalia('abyssal', { damageMult: 0.2 });
    const afterAbyssal = ms.combinedSkillMods();
    const abyssal = { worn: ms.regaliaWorn, damage: afterAbyssal.damageMult - (base.damageMult ?? 0), coralOff: (afterAbyssal.reflectPct ?? 0) === (base.reflectPct ?? 0) };
    ms.regaliaAttunementMult = 1.5;
    ms.wearRegalia('abyssal', { damageMult: 0.2 });
    const attuned = Math.abs(ms.combinedSkillMods().damageMult - (base.damageMult ?? 0) - 0.3) < 1e-6;
    ms.regaliaAttunementMult = 1;
    ms.wearDrownedCrown(900, { regenPerSec: 3, reflectPct: 0.25, damageMult: 0.2 }, 1.5);
    const cm = ms.combinedSkillMods();
    const crown = {
      on: ms.drownedCrownOn,
      wornCleared: ms.regaliaWorn === null,
      allThree:
        Math.abs(cm.regenPerSec - (base.regenPerSec ?? 0) - 4.5) < 1e-6 &&
        Math.abs(cm.reflectPct - (base.reflectPct ?? 0) - 0.375) < 1e-6 &&
        Math.abs(cm.damageMult - (base.damageMult ?? 0) - 0.3) < 1e-6,
    };
    await wait(1100); // the reign ends
    const after = ms.combinedSkillMods();
    const reignOver = !ms.drownedCrownOn && ms.regaliaWorn === null && (after.damageMult ?? 0) === (base.damageMult ?? 0);

    // THE RENAME: 'Sundian' gates Bali's home chain; the deprecated 'Atlantean'
    // gates nothing; a neighbor entry (Hunter/Sydney) is unmoved either way.
    const chainClass0 = ms.chain.playerClass ?? null;
    ms.chain.setPlayerClass('Sundian');
    const baliForSundian = ms.chain.status('bal-01-mentor');
    const sydneyForSundian = ms.chain.status('syd-01-mentor');
    ms.chain.setPlayerClass('Atlantean');
    const baliForAtlantean = ms.chain.status('bal-01-mentor');
    ms.chain.setPlayerClass('Hunter');
    const baliForHunter = ms.chain.status('bal-01-mentor');
    const sydneyForHunter = ms.chain.status('syd-01-mentor');
    if (chainClass0) ms.chain.setPlayerClass(chainClass0);
    else ms.announcePlayerClass();
    const rename = { baliForSundian, baliForAtlantean, baliForHunter, sydneyForSundian, sydneyForHunter };

    ms.playerHealth.full();
    ms.playerHealth.shield = 1e9;
    return { setup: 'ok', tide, twoStacks, slowAtTwo, threeStacks, slowAtThree, crushed, shattered, pearl, coral, abyssal, attuned, crown, reignOver, rename };
  });
  ok(
    'sundian ext — the tide: phase one gathers the pack at the point (wounded), phase two reverses and throws them out (wounded again), then drains',
    sundianExt.setup === 'ok' &&
      sundianExt.tide.phase1 === 1 &&
      sundianExt.tide.pulledIn &&
      sundianExt.tide.pullWounds &&
      sundianExt.tide.blastedOut &&
      sundianExt.tide.blastWounds &&
      sundianExt.tide.drained,
    JSON.stringify(sundianExt.tide),
  );
  ok(
    'sundian ext — drench slows per stack and Depth Crush consumes EXACTLY the drench; the crystallize ledger on the same enemy is untouched and Shatter still consumes its own',
    sundianExt.setup === 'ok' &&
      sundianExt.twoStacks &&
      Math.abs(sundianExt.slowAtTwo - 0.8) < 1e-6 &&
      sundianExt.threeStacks &&
      Math.abs(sundianExt.slowAtThree - 0.7) < 1e-6 &&
      sundianExt.crushed.res.hit === 1 &&
      sundianExt.crushed.res.stacks === 3 &&
      sundianExt.crushed.drop === 15 &&
      sundianExt.crushed.drenchGone &&
      sundianExt.crushed.farDrenchKept &&
      sundianExt.crushed.crystalUntouched &&
      sundianExt.shattered.res.stacks === 4 &&
      sundianExt.shattered.drop === 20 &&
      sundianExt.shattered.ledgerEmpty,
    JSON.stringify({ crushed: sundianExt.crushed, shattered: sundianExt.shattered }),
  );
  ok(
    'sundian ext — regalia: one worn aura at a time (each donning excludes the last), attunement scales the jewel, the Drowned Crown runs all three empowered then ends bare-headed',
    sundianExt.setup === 'ok' &&
      sundianExt.pearl.worn === 'pearl' &&
      sundianExt.pearl.regen === 3 &&
      sundianExt.coral.worn === 'coral' &&
      Math.abs(sundianExt.coral.reflect - 0.25) < 1e-6 &&
      sundianExt.coral.pearlOff &&
      sundianExt.abyssal.worn === 'abyssal' &&
      Math.abs(sundianExt.abyssal.damage - 0.2) < 1e-6 &&
      sundianExt.abyssal.coralOff &&
      sundianExt.attuned &&
      sundianExt.crown.on &&
      sundianExt.crown.wornCleared &&
      sundianExt.crown.allThree &&
      sundianExt.reignOver,
    JSON.stringify({ pearl: sundianExt.pearl, coral: sundianExt.coral, abyssal: sundianExt.abyssal, attuned: sundianExt.attuned, crown: sundianExt.crown, reignOver: sundianExt.reignOver }),
  );
  ok(
    "sundian ext — the rename: 'Sundian' gates Bali's chain, the deprecated 'Atlantean' gates nothing, and Sydney's entry is unmoved",
    sundianExt.setup === 'ok' &&
      sundianExt.rename.baliForSundian === 'available' &&
      sundianExt.rename.baliForAtlantean === 'locked' &&
      sundianExt.rename.baliForHunter === 'locked' &&
      sundianExt.rename.sydneyForSundian === 'locked' &&
      sundianExt.rename.sydneyForHunter === 'available',
    JSON.stringify(sundianExt.rename),
  );

  // 3aa. SKILL TREE UX (Casey's spec, permanent) — driven by REAL taps on the real
  // screen: instant spend (no confirmation window) respects locks and points with
  // shake/toast feedback; the name-bar "Add" button round-trips through the hotkey
  // picker into a slot; press-and-hold shows the description WITHOUT spending; and
  // the forced first pick still completes through the real picker.
  await newGame('blacksmith'); // newGame CLICKS the FirstSkillScene card — the real picker path
  const firstPick = await page.evaluate(() => {
    const ms = window.__game.scene.getScene('MainScene');
    const st = ms.getSkillState();
    return { pickerOpen: window.__game.scene.isActive('FirstSkillScene'), castable: st.activatableUnlocked().length, slot0: st.loadout()[0] ?? null };
  });
  ok(
    'skill tree ux: the forced first pick still completes through the real picker',
    !firstPick.pickerOpen && firstPick.castable >= 1 && firstPick.slot0 !== null,
    JSON.stringify(firstPick),
  );

  // Open the tree UI (the real launch path: pauses MainScene under it), then read
  // tree 0's rendered rows. Row i's bar center = listTop(134) + 8 + i*50 + 22.
  const rows = await page.evaluate(() => {
    const ms = window.__game.scene.getScene('MainScene');
    ms.openSkillTree();
    const st = ms.getSkillState();
    const cls = ms.classSkillsAll[st.activeClass];
    const treeId = cls.trees[0].id;
    const nodes = cls.skills.filter((s) => s.tree === treeId).sort((a, b) => a.tier - b.tier);
    const out = [];
    const drawn = new Set();
    for (const d of nodes) {
      if (d.branch) {
        if (drawn.has(d.branch.group)) continue;
        drawn.add(d.branch.group);
      }
      out.push(d.id);
    }
    ms.skills.awardPoints(1);
    const iBuy = out.findIndex((id) => st.canUnlock(cls.skills.find((s) => s.id === id)).ok);
    return { ids: out, iBuy, points: st.unspentPoints };
  });
  await page.waitForTimeout(400);
  const rowY = (i) => 134 + 8 + i * 50 + 22;

  // (a) INSTANT SPEND: one real tap on an affordable row unlocks it on the spot — no window.
  await page.mouse.click(214, rowY(rows.iBuy));
  await page.waitForTimeout(300);
  const spend = await page.evaluate(
    ({ rows }) => {
      const ms = window.__game.scene.getScene('MainScene');
      const sts = window.__game.scene.getScene('SkillTreeScene');
      const st = ms.getSkillState();
      sts.lastReject = '';
      return { unlocked: st.isUnlocked(rows.ids[rows.iBuy]), points: st.unspentPoints, modal: !!sts.popup || !!sts.readPopup };
    },
    { rows },
  );
  // (b) NO POINTS: same tap on the next (now prereq-met) row spends nothing + explains why.
  await page.mouse.click(214, rowY(rows.iBuy + 1));
  await page.waitForTimeout(250);
  const broke = await page.evaluate(
    ({ rows }) => {
      const ms = window.__game.scene.getScene('MainScene');
      const sts = window.__game.scene.getScene('SkillTreeScene');
      const st = ms.getSkillState();
      const out = { unlocked: st.isUnlocked(rows.ids[rows.iBuy + 1]), points: st.unspentPoints, reject: sts.lastReject };
      ms.skills.awardPoints(1); // arm the LOCKED case: a point in hand, prereq unmet
      sts.lastReject = '';
      return out;
    },
    { rows },
  );
  // (c) LOCKED: with a point in hand, tapping a row two tiers ahead spends nothing.
  await page.mouse.click(214, rowY(rows.iBuy + 3));
  await page.waitForTimeout(250);
  const locked = await page.evaluate(
    ({ rows }) => {
      const ms = window.__game.scene.getScene('MainScene');
      const sts = window.__game.scene.getScene('SkillTreeScene');
      const st = ms.getSkillState();
      return { unlocked: st.isUnlocked(rows.ids[rows.iBuy + 3]), points: st.unspentPoints, reject: sts.lastReject };
    },
    { rows },
  );
  ok(
    'skill tree ux: instant spend — an affordable tap unlocks instantly; no-points and locked taps spend nothing and say why',
    rows.iBuy >= 0 &&
      spend.unlocked &&
      spend.points === 0 &&
      !spend.modal &&
      !broke.unlocked &&
      broke.points === 0 &&
      broke.reject.length > 0 &&
      !locked.unlocked &&
      locked.points === 1 &&
      locked.reject.length > 0,
    JSON.stringify({ rows: rows.iBuy, spend, broke, locked }),
  );

  // (d) HOLD TO READ on a LOCKED row: the description shows at HOLD_MS while held,
  // the release dismisses it, and NOTHING was spent by the completed hold.
  await page.mouse.move(214, rowY(rows.iBuy + 3));
  await page.mouse.down();
  await page.waitForTimeout(3500); // well past HOLD_MS (2000) — headless frames can lag under suite load
  const held = await page.evaluate(
    ({ rows }) => {
      const ms = window.__game.scene.getScene('MainScene');
      const sts = window.__game.scene.getScene('SkillTreeScene');
      return { reading: !!sts.readPopup, unlocked: ms.getSkillState().isUnlocked(rows.ids[rows.iBuy + 3]), points: ms.getSkillState().unspentPoints };
    },
    { rows },
  );
  await page.mouse.up();
  await page.waitForTimeout(250);
  const released = await page.evaluate(
    ({ rows }) => {
      const ms = window.__game.scene.getScene('MainScene');
      const sts = window.__game.scene.getScene('SkillTreeScene');
      return { reading: !!sts.readPopup, unlocked: ms.getSkillState().isUnlocked(rows.ids[rows.iBuy + 3]), points: ms.getSkillState().unspentPoints };
    },
    { rows },
  );
  ok(
    'skill tree ux: hold-to-read shows the description on a locked skill and its release never spends',
    held.reading && !held.unlocked && held.points === 1 && !released.reading && !released.unlocked && released.points === 1,
    JSON.stringify({ held, released }),
  );

  // (e) ADD → HOTKEY PICKER → SLOT: row 0 is always an owned castable (the tier-0
  // opener — picked or bought above). Tap its name-bar Add button (right side of
  // the bar), then tap slot 3 in the picker; the skill must land there.
  await page.mouse.click(366, rowY(0)); // the Add button: cx + nodeW/2 - 38 = 366
  await page.waitForTimeout(300);
  const pickerState = await page.evaluate(() => {
    const sts = window.__game.scene.getScene('SkillTreeScene');
    const p = sts.pickerSlotCenter(2);
    return { open: !!sts.popup, slotX: p.x, slotY: p.y };
  });
  if (pickerState.open) await page.mouse.click(pickerState.slotX, pickerState.slotY);
  await page.waitForTimeout(300);
  const added = await page.evaluate(
    ({ rows }) => {
      const ms = window.__game.scene.getScene('MainScene');
      const sts = window.__game.scene.getScene('SkillTreeScene');
      const st = ms.getSkillState();
      const out = { closed: !sts.popup, slotOf: st.slotIndexOf(rows.ids[0]) };
      sts.close(); // resume MainScene for whatever runs after
      return out;
    },
    { rows },
  );
  ok(
    'skill tree ux: the name-bar Add button opens the hotkey picker and a slot tap assigns the skill there',
    pickerState.open && added.closed && added.slotOf === 2,
    JSON.stringify({ pickerState, added }),
  );

  // 3ac. LANDSCAPE / ORIENTATION (permanent): the game boots + the HUD lays out
  // sanely at BOTH 428×926 and 926×428 — every VISIBLE INTERACTIVE HUD element
  // fully on screen, no two overlapping, the UI camera matched to the canvas —
  // and a mid-session orientation flip preserves game state (and the camera's
  // zoom: landscape simply sees wider). Runs in the live session left by the
  // checks above; the viewport is restored to portrait at the end.
  const hudSanity = () =>
    page.evaluate(() => {
      const g = window.__game;
      const w = g.scale.width;
      const h = g.scale.height;
      const ms = g.scene.getScene('MainScene');
      const rects = [];
      for (const o of ms.children.list) {
        if (!o.input || !o.input.enabled || !o.visible) continue;
        if (o.scrollFactorX !== 0) continue; // HUD only — world-space buttons scroll
        const b = o.getBounds();
        rects.push({ x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) });
      }
      const off = rects.filter((r) => r.x < -1 || r.y < -1 || r.x + r.w > w + 1 || r.y + r.h > h + 1);
      const overlaps = [];
      for (let i = 0; i < rects.length; i++) {
        for (let j = i + 1; j < rects.length; j++) {
          const a = rects[i];
          const b = rects[j];
          const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
          const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
          if (ox > 2 && oy > 2) overlaps.push(`${JSON.stringify(a)}~${JSON.stringify(b)}`);
        }
      }
      return { w, h, buttons: rects.length, off: off.length, overlaps: overlaps.slice(0, 3), overlapCount: overlaps.length, uiCamW: ms.uiCamera.width, uiCamH: ms.uiCamera.height, zoom: ms.cameras.main.zoom };
    });

  const before = await page.evaluate(() => {
    const ms = window.__ready();
    return { classId: ms.classId, world: ms.activeWorld, x: ms.player.x, y: ms.player.y, hp: ms.playerHealth.current, points: ms.skills.unspentPoints, zoom: ms.cameras.main.zoom };
  });
  const portraitHud = await hudSanity();
  await page.setViewportSize({ width: 926, height: 428 }); // ROTATE mid-session
  await page.waitForTimeout(700); // main.ts applySize → scale.resize → every layout handler
  const landscapeHud = await hudSanity();
  const after = await page.evaluate(() => {
    const ms = window.__game.scene.getScene('MainScene');
    return { active: window.__game.scene.isActive('MainScene') || window.__game.scene.isPaused('MainScene'), classId: ms.classId, world: ms.activeWorld, x: ms.player.x, y: ms.player.y, hp: ms.playerHealth.current, points: ms.skills.unspentPoints, zoom: ms.cameras.main.zoom };
  });
  ok(
    'orientation: portrait HUD sane (all buttons on-screen, none overlapping, UI camera matched)',
    portraitHud.w === 428 && portraitHud.buttons > 0 && portraitHud.off === 0 && portraitHud.overlapCount === 0 && portraitHud.uiCamW === 428 && portraitHud.uiCamH === 926,
    JSON.stringify(portraitHud),
  );
  ok(
    'orientation: landscape HUD sane at 926×428 — same buttons, on-screen, no overlaps, canvas + UI camera resized',
    landscapeHud.w === 926 && landscapeHud.h === 428 && landscapeHud.buttons === portraitHud.buttons && landscapeHud.off === 0 && landscapeHud.overlapCount === 0 && landscapeHud.uiCamW === 926 && landscapeHud.uiCamH === 428,
    JSON.stringify(landscapeHud),
  );
  ok(
    'orientation: a mid-session flip preserves game state (class/world/position/HP/points) and the camera zoom',
    after.active && after.classId === before.classId && after.world === before.world && after.x === before.x && after.y === before.y && after.hp === before.hp && after.points === before.points && after.zoom === before.zoom,
    JSON.stringify({ before, after }),
  );

  // The overlay screens must lay out sanely in landscape too: the select screen
  // flows into columns (every card fully on screen), and the skill tree flows its
  // ten rows into two columns (every node bar fully on screen).
  const landscapeMenus = await (async () => {
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
    await page.waitForFunction(() => !!window.__game && window.__game.scene.isActive('TitleScene'), { timeout: 25000 });
    await page.evaluate(() => {
      localStorage.clear();
      window.__game.scene.getScene('TitleScene').scene.start('CharacterSelectScene');
    });
    await page.waitForTimeout(600);
    const select = await page.evaluate(() => {
      const g = window.__game;
      const sc = g.scene.getScene('CharacterSelectScene');
      const cards = sc.children.list.filter((o) => o.type === 'Rectangle' && o.input && o.input.enabled);
      const off = cards.filter((r) => {
        const b = r.getBounds();
        return b.x < -1 || b.y < -1 || b.x + b.width > g.scale.width + 1 || b.y + b.height > g.scale.height + 1;
      });
      // One card per REGISTERED class — the count tracks the roster automatically.
      const registered = Object.keys(g.scene.getScene('MainScene').classSkillsAll).length;
      return { w: g.scale.width, cards: cards.length, registered, off: off.length };
    });
    // Into a run (top-left card = blacksmith) → open the skill tree in landscape.
    await page.evaluate(() => window.__game.scene.getScene('CharacterSelectScene').scene.start('MainScene', { mode: 'new', classId: 'blacksmith' }));
    await page.waitForFunction(() => window.__game.scene.isActive('MainScene'), { timeout: 25000 });
    await page.waitForTimeout(1500);
    if (await page.evaluate(() => window.__game.scene.isActive('FirstSkillScene'))) {
      // The picker's cards are landscape-laid too; click the FIRST card's live position.
      const first = await page.evaluate(() => {
        const sc = window.__game.scene.getScene('FirstSkillScene');
        const card = sc.children.list.filter((o) => o.type === 'Rectangle' && o.input && o.input.enabled).sort((a, b) => a.y - b.y)[0];
        const b = card.getBounds();
        return { x: b.centerX, y: b.centerY };
      });
      await page.mouse.click(first.x, first.y);
      await page.waitForTimeout(600);
    }
    await page.evaluate(() => window.__game.scene.getScene('MainScene').openSkillTree());
    await page.waitForTimeout(500);
    const tree = await page.evaluate(() => {
      const g = window.__game;
      const sts = g.scene.getScene('SkillTreeScene');
      // The node list + tabs live inside Containers — walk them for every bar.
      const all = [];
      const walk = (list) => {
        for (const o of list) {
          if (o.type === 'Container') walk(o.list);
          else all.push(o);
        }
      };
      walk(sts.children.list);
      const bars = all.filter((o) => o.type === 'Rectangle' && o.input && o.input.enabled);
      const off = bars.filter((r) => {
        const b = r.getBounds();
        return b.x < -1 || b.y < -1 || b.x + b.width > g.scale.width + 1 || b.y + b.height > g.scale.height + 1;
      });
      return { bars: bars.length, off: off.length };
    });
    await page.evaluate(() => window.__game.scene.getScene('SkillTreeScene').close()); // leave no menu open behind
    return { select, tree };
  })();
  ok(
    'orientation: the select screen + skill tree lay out fully on screen in landscape (column flow)',
    landscapeMenus.select.w === 926 && landscapeMenus.select.cards === landscapeMenus.select.registered && landscapeMenus.select.off === 0 && landscapeMenus.tree.bars >= 16 && landscapeMenus.tree.off === 0,
    JSON.stringify(landscapeMenus),
  );
  await page.setViewportSize({ width: 428, height: 926 }); // restore portrait for anything after
  await page.waitForTimeout(500);

  // 3ad. PWA STANDALONE (permanent): the manifest + icons are SERVED and VALID —
  // standalone display, any orientation, dark theme, real PNGs at their declared
  // sizes — the page carries the iOS standalone meta + viewport-fit=cover, and a
  // save exported as a portable code imports back BYTE-IDENTICALLY (with junk
  // codes rejected without touching the slot).
  const pwa = await page.evaluate(async () => {
    const out = { pngs: [] };
    const mf = await fetch('/manifest.webmanifest');
    out.manifestOk = mf.ok;
    const m = await mf.json();
    out.name = m.name;
    out.display = m.display;
    out.orientation = m.orientation;
    out.start = m.start_url;
    out.theme = m.theme_color;
    for (const icon of m.icons ?? []) {
      const r = await fetch(icon.src);
      const buf = new Uint8Array(await r.arrayBuffer());
      const sig = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
      const w = (buf[16] << 24) | (buf[17] << 16) | (buf[18] << 8) | buf[19]; // IHDR width
      out.pngs.push({ ok: r.ok, sig, w, declared: icon.sizes });
    }
    const html = await (await fetch('/')).text();
    out.meta = ['apple-mobile-web-app-capable', 'apple-mobile-web-app-status-bar-style', 'apple-touch-icon', 'viewport-fit=cover', 'rel="manifest"'].every((k) => html.includes(k));
    return out;
  });
  ok(
    'pwa: manifest + icons served and valid (standalone, any orientation, real PNGs at declared sizes); iOS meta present',
    pwa.manifestOk &&
      pwa.name === 'Thrones of Heaven' &&
      pwa.display === 'standalone' &&
      pwa.orientation === 'any' &&
      pwa.start === '/' &&
      pwa.theme === '#0b1a2b' &&
      pwa.pngs.length === 3 &&
      pwa.pngs.every((p) => p.ok && p.sig && p.declared.startsWith(`${p.w}x`)) &&
      pwa.meta,
    JSON.stringify(pwa),
  );

  const saveCode = await page.evaluate(() => {
    const ms = window.__ready();
    const code = ms.exportSaveCode(); // writes the save, encodes the slot, tries the clipboard
    const raw = localStorage.getItem('toh_save');
    localStorage.setItem('toh_save', '{"saveVersion":0,"clobbered":true}'); // wreck the slot
    const imported = ms.importSaveCode(code ?? '');
    const back = localStorage.getItem('toh_save');
    const junk = ms.importSaveCode('TOH1.!!!not-base64!!!') || ms.importSaveCode('hello world');
    return {
      hasCode: !!code && code.startsWith('TOH1.'),
      bytes: raw?.length ?? 0,
      imported,
      identical: back !== null && back === raw,
      junkRejected: !junk,
      slotIntact: localStorage.getItem('toh_save') === raw,
    };
  });
  ok(
    'pwa: export→import round-trips the save byte-identically; junk codes rejected without touching the slot',
    saveCode.hasCode && saveCode.bytes > 100 && saveCode.imported && saveCode.identical && saveCode.junkRejected && saveCode.slotIntact,
    JSON.stringify(saveCode),
  );

  // 3af. RESIZE ISOLATION + PICKER CLASS INTEGRITY (permanent — the regression
  // gate). Root cause being guarded: overlay scenes used to leave restart-on-
  // resize listeners on the GLOBAL ScaleManager after closing, so iOS URL-bar
  // viewport resizes (which fire constantly WITHOUT rotation) re-opened closed
  // overlays — including the forced first-skill picker — and accumulated
  // listeners on every restart (the progressive slowdown).

  // (a) THE STORM: 20 consecutive MEANINGFUL resize events with no menu open →
  // zero overlay restarts, zero listener growth, stable frame time.
  const storm = await page.evaluate(async () => {
    const g = window.__game;
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    const overlays = ['FirstSkillScene', 'SkillTreeScene', 'PauseScene', 'CharacterSelectScene', 'TitleScene'];
    // PRECONDITION: no menu open — stop any overlay a prior check left behind.
    for (const k of overlays) if (g.scene.isActive(k) || g.scene.isPaused(k)) g.scene.getScene(k).scene.stop();
    if (g.scene.isPaused('MainScene')) g.scene.getScene('MainScene').scene.resume();
    window.__ready();
    await wait(300);
    const listeners0 = g.scale.listenerCount('resize');
    await wait(600);
    const fps0 = g.loop.actualFps;
    let overlayActivations = 0;
    const seen = new Set();
    for (let i = 0; i < 20; i++) {
      g.scale.resize(428, i % 2 ? 880 : 926); // the URL-bar collapse shape (±46px, no rotation)
      await wait(70);
      const act = overlays.filter((k) => g.scene.isActive(k));
      if (act.length > 0) overlayActivations++;
      for (const k of act) seen.add(k);
    }
    g.scale.resize(428, 926);
    await wait(600);
    const fps1 = g.loop.actualFps;
    const listeners1 = g.scale.listenerCount('resize');
    return { listeners0, listeners1, overlayActivations, seen: [...seen], fps0: +fps0.toFixed(1), fps1: +fps1.toFixed(1) };
  });
  ok(
    'resize isolation: a 20-event resize storm re-opens nothing, grows no listeners, keeps frame time stable',
    storm.overlayActivations === 0 && storm.listeners1 === storm.listeners0 && storm.fps1 > storm.fps0 * 0.6,
    JSON.stringify(storm),
  );

  // (b) THE PICKER'S CONTRACT: a zombie restart on a character WITH spent points
  // self-closes without touching state — even with the long-lived
  // SkillState.activeClass field poisoned to another class (the stale read that
  // produced the wizard picker on a witch doctor); the poison is HEALED.
  const pickerGate = await page.evaluate(async () => {
    const ms = window.__ready();
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    const spent = ms.skills.unlockedIds(ms.classId).length;
    ms.skills.activeClass = 'wizard'; // the poisoned stale field (the reported bug)
    window.__game.scene.getScene('FirstSkillScene').scene.restart(); // the zombie path
    await wait(400);
    return {
      spent,
      pickerOpen: window.__game.scene.isActive('FirstSkillScene'),
      mainRunning: window.__game.scene.isActive('MainScene'),
      healedClass: ms.skills.activeClass,
      liveClass: ms.classId,
      shownClass: window.__game.scene.getScene('FirstSkillScene').shownClass,
    };
  });
  ok(
    'picker contract: never appears for a character with spent points; a poisoned stale class is healed to the live one',
    pickerGate.spent > 0 && !pickerGate.pickerOpen && pickerGate.mainRunning && pickerGate.healedClass === pickerGate.liveClass && pickerGate.shownClass === null,
    JSON.stringify(pickerGate),
  );

  // (c) SAVE INTEGRITY: a contaminated save (foreign skills recorded under the
  // wrong class — what a mis-shown picker left behind) is HEALED on load: the
  // foreign ids are stripped and their points refunded; legal unlocks untouched.
  const heal = await page.evaluate(() => {
    const ms = window.__ready();
    const before = ms.skills.toJSON();
    const contaminated = JSON.parse(JSON.stringify(before));
    contaminated.unlockedByClass['witchdoctor'] = ['wiz_fireball', 'wd_vd_doll']; // one foreign, one legal
    (contaminated.unlockedByClass[ms.classId] ??= []).push('sam_bl_first'); // foreign in the live class too
    const points0 = contaminated.unspentPoints;
    ms.skills.load(contaminated);
    const out = {
      stripped: ms.skills.lastSanitize.stripped,
      refunded: ms.skills.lastSanitize.refunded,
      points: ms.skills.unspentPoints,
      points0,
      wdLegalKept: ms.skills.isUnlocked('wd_vd_doll', 'witchdoctor'),
      wdForeignGone: !ms.skills.isUnlocked('wiz_fireball', 'witchdoctor'),
      liveForeignGone: !ms.skills.unlockedIds(ms.classId).includes('sam_bl_first'),
    };
    ms.skills.load(before); // restore the session's real state
    return out;
  });
  ok(
    'save integrity: foreign skills are stripped on load with their points refunded; legal unlocks untouched',
    heal.stripped.length === 2 && heal.refunded === 2 && heal.points === heal.points0 + 2 && heal.wdLegalKept && heal.wdForeignGone && heal.liveForeignGone,
    JSON.stringify(heal),
  );

  // (d) SAVES ROUND-TRIP BYTE-IDENTICALLY THROUGH ROTATIONS: rotating writes
  // nothing to the slot and changes nothing that serializes.
  const rotSave = await (async () => {
    const s0 = await page.evaluate(() => {
      const ms = window.__ready();
      ms.requestSave();
      return localStorage.getItem('toh_save');
    });
    await page.setViewportSize({ width: 926, height: 428 });
    await page.waitForTimeout(600);
    const midRotation = await page.evaluate(() => localStorage.getItem('toh_save'));
    await page.setViewportSize({ width: 428, height: 926 });
    await page.waitForTimeout(600);
    const after = await page.evaluate(() => {
      const ms = window.__game.scene.getScene('MainScene');
      const slotUntouched = localStorage.getItem('toh_save');
      ms.requestSave(); // a fresh save AFTER the rotations
      const rewritten = JSON.parse(localStorage.getItem('toh_save'));
      return { slotUntouched, skills: JSON.stringify(rewritten.skills ?? rewritten.skillState ?? null) };
    });
    const base = JSON.parse(s0);
    return {
      slotStableThroughRotation: midRotation === s0 && after.slotUntouched === s0,
      skillsIdentical: after.skills === JSON.stringify(base.skills ?? base.skillState ?? null),
    };
  })();
  ok(
    'rotation save integrity: rotating touches nothing in the slot; a post-rotation save carries identical skill state',
    rotSave.slotStableThroughRotation && rotSave.skillsIdentical,
    JSON.stringify(rotSave),
  );

  // (e) WHEN SHOWN, THE PICKER'S CLASS IS THE LIVE CHARACTER'S: a genuinely
  // fresh character opens the picker for exactly its own class.
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__game && window.__game.scene.isActive('TitleScene'), { timeout: 25000 });
  await page.evaluate(() => {
    localStorage.clear();
    window.__game.scene.getScene('TitleScene').scene.start('MainScene', { mode: 'new', classId: 'witchdoctor' });
  });
  await page.waitForFunction(() => window.__game.scene.isActive('FirstSkillScene'), { timeout: 25000 });
  await page.waitForTimeout(400);
  const freshPicker = await page.evaluate(() => {
    const ms = window.__game.scene.getScene('MainScene');
    const fs = window.__game.scene.getScene('FirstSkillScene');
    return { liveClass: ms.classId, shownClass: fs.shownClass, needs: ms.skills.needsFirstSkill(ms.classId) };
  });
  ok(
    'picker class: a fresh character sees exactly its own class in the forced picker',
    freshPicker.needs && freshPicker.liveClass === 'witchdoctor' && freshPicker.shownClass === 'witchdoctor',
    JSON.stringify(freshPicker),
  );
  // Complete the pick through the real card so the session ends playable.
  const card = await page.evaluate(() => {
    const fs = window.__game.scene.getScene('FirstSkillScene');
    const c = fs.children.list.filter((o) => o.type === 'Rectangle' && o.input && o.input.enabled && o.width < 400).sort((a, b) => a.y - b.y)[0];
    const b = c.getBounds();
    return { x: b.centerX, y: b.centerY };
  });
  await page.mouse.click(card.x, card.y);
  await page.waitForTimeout(600);

  // 4) THE GATE: zero page errors across everything above.
  ok('zero page errors during boot + travel', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));
} finally {
  await browser?.close();
  kill();
}

const passed = results.filter(Boolean).length;
console.log(`\n${passed}/${results.length} runtime checks passed`);
if (passed !== results.length) process.exit(1);

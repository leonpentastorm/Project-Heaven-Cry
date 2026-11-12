// The effects sweep (Leon, 11 Nov 2026: "we really need to go do tests on this for every weapon"). In the Proving
// Ground's Effect testing room, every weapon in data/weapons.json does every technique it can use (each property line
// it has, and its plain attacks) on the Target dummy, and the effects layer's own trace (window.__phcFxTrace, written by
// apps/web/src/game/fx/dom.ts trace()) says what was drawn and heard, and when. Each case is then judged:
//   1. the projectile or swing fits the weapon: no bullet tracer or muzzle flash from a launcher, a grenade, a bow or
//      a blade; a gun's report only from a gun; a thrown weapon is seen thrown;
//   2. what follows from a landing (the blast, the hit, the number, the HP bar, the wounds around it) never starts
//      before the projectile arrives;
//   3. the shot or swing is seen before its damage, and a gun's report comes with its muzzle flash;
//   4. no page errors.
// Part 1 plays a few named cases at the player's real speed (the ones Leon reported); Part 2 plays the whole table at
// the test pace (game/combatSpeed.ts 'test', about 25 times faster: the order of things is the same, the tolerances are
// scaled). Then: aiming a blast into the fog never names, counts or marks a unit the squad can't see; and a Sigil
// caster's glyphs stay drawn through an opportunity attack.
//
//   npm run e2e -- fx-sweep                         everything (a few minutes)
//   ONLY='smetanita_thumper' npm run e2e -- fx-sweep      cases whose name (weapon · technique · line) matches the regex
//   REAL=1 ONLY='thumper.*lob' npm run e2e -- fx-sweep    the matching cases at real speed
//   SWEEP_LOG=1 …                                   one line for every case, and every refusal's reason
//   SWEEP_TRACE=1 …                                 keep every case's trace in the report (else only the failing ones')
//   PARTS=real,table,fog,glyphs  which parts to run · JOBS=3  how many pages play the table at once
// One line per failing case, then the counts. The full report: .check/e2e/fx-sweep.json. Exit code 1 on any failure.
import { readFileSync, writeFileSync, appendFileSync, mkdirSync } from 'fs';
import { chromium, player, click, BASE, pause } from './lib.mjs';

const ROOT = new URL('../../../', import.meta.url).pathname;
const WEAPONS = JSON.parse(readFileSync(ROOT + 'data/weapons.json', 'utf8')).items;
const TECHS = JSON.parse(readFileSync(ROOT + 'data/techniques.json', 'utf8')).items;
const ONLY = process.env.ONLY ? new RegExp(process.env.ONLY) : null, REAL = !!process.env.REAL, LOG = !!process.env.SWEEP_LOG;
const PARTS = (process.env.PARTS || 'real,table,fog,glyphs').split(','), JOBS = Number(process.env.JOBS) || 3;
let failed = 0;
// How far it has got, as it goes (the runner prints a suite's lines only when it ends): .check/e2e/fx-sweep.progress
const PROGRESS = ROOT + '.check/e2e/fx-sweep.progress', T0 = Date.now();
try { mkdirSync(ROOT + '.check/e2e', { recursive: true }); writeFileSync(PROGRESS, ''); } catch { /* */ }
const note = (line) => { try { appendFileSync(PROGRESS, Math.round((Date.now() - T0) / 1000) + 's ' + line + '\n'); } catch { /* */ } };
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) { failed++; process.exitCode = 1; } };

// ---------- the table ----------
const propsOf = (w) => (w.phys && w.phys.props) || [];
const systemOf = (w) => (w.phys && w.phys.system) || (/melee|unarmed/.test(w.category) ? 'melee' : 'ranged');
/** Every case for a weapon: its plain attacks, then each technique of its system that its properties don't rule out,
 *  once for each property line the weapon has (the engine refuses what the weapon can't do: that is counted, not failed). */
function casesOf(w) {
  const out = [], sys = systemOf(w), props = propsOf(w), thrown = w.category === 'thrown';
  const add = (t, line, what) => out.push({ weapon: w.id, t, line: line || null, name: w.id + ' · ' + t + (line ? ' · ' + line : ''), ...what });
  if (thrown) add('throw!', null, { plain: 'throw' });
  else if (sys === 'melee') add('attack', null, { plain: 'melee' });
  else { add('attack', null, { plain: 'shot' }); for (const m of ['burst', 'auto']) if ((w.modes || []).includes(m)) add('attack:' + m, null, { plain: m }); }
  for (const t of TECHS) {
    if (t.system !== sys || t.group === 'answer') continue;
    if ((t.not_with || []).some((p) => props.includes(p))) continue;
    const lines = (t.lines || []).map((l) => l.props.find((p) => props.includes(p))).filter(Boolean);
    if (!lines.length) add(t.id, null, { tech: t }); else for (const l of [...new Set(lines)]) add(t.id, l, { tech: t });
  }
  return out;
}
const ALL = WEAPONS.flatMap(casesOf).filter((c) => !ONLY || ONLY.test(c.name));
/** The cases Leon reported, and one of each kind of weapon, at real speed. */
const REAL_CASES = ['smetanita_thumper · suppress · heavy', 'smetanita_thumper · lob · blast', 'smetanita_thumper · lob · arc', 'smetanita_thumper · attack', 'hellraiser_service_rifle · suppress · auto',
  'hellraiser_lmg · suppress · heavy', 'service_pistol · attack', 'lumeri_scattergun · attack', 'recurve_bow · attack', 'breacher_tube · attack', 'purifier_flamer · attack', 'frag_grenade · lob · blast',
  'frag_grenade · throw!', 'sabre · attack', 'maul · attack', 'combat_knife · throw · thrown', 'hellraiser_service_rifle · attack:burst', 'decrkm_smg · mag_dump · auto', 'hellraiser_rotary · rake · auto'];

// ---------- the room ----------
const ref = (k) => { const [x, y] = k.split(',').map(Number); return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[x] + (y + 1); };
async function openGround(browser, speed) {
  const p = await player(browser, 'host');
  await p.context().addInitScript((s) => { try { if (s) localStorage.setItem('phc.combatSpeed', s); else localStorage.removeItem('phc.combatSpeed'); } catch { /* */ } }, speed);
  p.fxErrors = []; p.on('pageerror', (e) => p.fxErrors.push(String(e.message || e)));
  await p.goto(BASE); await click(p, 'PROVING GROUND', { timeout: 90000 });
  const nm = p.getByPlaceholder('Leon');
  await Promise.race([nm.waitFor({ timeout: 20000 }).catch(() => {}), p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 20000 }).catch(() => {})]);
  if (await nm.count()) { await nm.fill('Leon'); await click(p, 'Solo ›'); }
  await p.waitForFunction(() => window.__phc.getState().game?.sandbox?.state === 'ready', null, { timeout: 30000 });
  // the driver: act (the engine's refusal as a string), wait for the effects queue to run dry, and one case
  await p.evaluate(() => {
    const st = () => window.__phc.getState().game, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    // (the game never throws a refusal: it shows it as a toast; that toast is the engine's reason)
    const act = (a) => { const was = window.__phc.getState().toast; try { window.__phc.act(a); } catch (e) { return String(e.message || e); } const t = window.__phc.getState().toast; return t && t !== was && !t.ok ? String(t.text) : null; };
    const stream = () => { const g = st(); return g && g.combat ? 'cb|' + g.code + '|' + g.combat.name + '|' + (g.combat.log[0] || '') : null; };
    /** The fight's effects have all played (every event taken up and played, no timer waiting), then `settle` ms more
     *  for the handlers' own later steps (an impact after its flight). */
    const idle = async (settle, max = 20000) => {
      const t0 = performance.now(); let quiet = 0;
      for (;;) {
        await sleep(8);
        const g = st(), cb = g && g.combat, d = window.__phcFxDebug(), k = stream();
        const top = cb && cb.fx && cb.fx.length ? cb.fx[cb.fx.length - 1].n : 0;
        const done = !cb || !top || ((d.playedTo[k] || 0) >= top && d.timers === 0 && d.queueEndIn <= 0 && !d.heldBehindGate);
        quiet = done ? quiet + 1 : 0;
        if (quiet >= 2) break;
        if (performance.now() - t0 > max) return false;
      }
      await sleep(settle); return true;
    };
    const dist = (a, b) => { const [ax, ay] = a.split(',').map(Number), [bx, by] = b.split(',').map(Number); return Math.max(Math.abs(ax - bx), Math.abs(ay - by)); };
    const who = () => { const cb = st().combat; return cb && st().phase === 'combat' ? { cb, me: cb.units.find((u) => u.side === 'pc'), dummy: cb.units.find((u) => u.side === 'foe' && !u.dead) } : {}; };
    /** Stand where the case needs: beside the dummy for a blade, 4 tiles off for anything else (the AP comes back after
     *  every action, so a long walk is a few moves). False: no way there (the room is entered again). */
    /** Does the squad see the dummy (as the screen draws it: its tile names it and isn't out of sight)? */
    const sees = () => {
      const { dummy } = who(); if (!dummy) return false;
      const [x, y] = dummy.pos.split(',').map(Number), r = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[x] + (y + 1) + ' ';
      const b = [...document.querySelectorAll('button.phc-tok[aria-label]')].find((el) => el.getAttribute('aria-label').startsWith(r)), l = b ? b.getAttribute('aria-label') : '';
      return l.includes(dummy.name) && !/out of sight/.test(l);
    };
    const inPlace = (kind) => { const { me, dummy } = who(); if (!me || !dummy) return false; const d = dist(me.pos, dummy.pos); return (kind === 'melee' ? d === 1 : kind === 'near' ? d === 2 || d === 3 : d >= 3 && d <= 5) && sees(); };
    const station = async (kind, quick) => {
      const { cb, me, dummy } = who(); if (!cb || !me || !dummy) return false;
      if (inPlace(kind)) return true;
      const [dx, dy] = dummy.pos.split(',').map(Number);
      const want = kind === 'melee' ? [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1]] : kind === 'near' ? [[-3, 0], [3, 0], [-2, 0], [2, 0], [0, -3], [0, 3], [0, -2], [0, 2], [-2, -2], [2, 2], [-2, 2], [2, -2]] : [[-4, 0], [4, 0], [0, -4], [0, 4], [-3, 0], [3, 0], [0, -3], [0, 3], [-4, 1], [-4, -1], [4, 1], [4, -1], [-3, -3], [3, 3], [-3, 3], [3, -3], [-5, 0], [5, 0]];
      for (const [ox, oy] of want) {
        const x = dx + ox, y = dy + oy, k = x + ',' + y; if (x < 0 || y < 0 || x >= cb.map.w || y >= cb.map.h) continue;
        // (a long walk is a few moves: the AP comes back after each)
        for (let i = 0; i < 4 && who().me.pos !== k; i++) if (act({ type: 'combat/move', unitId: me.id, to: k })) break;
        if (who().me.pos !== k) continue;
        await idle(quick);
        if (inPlace(kind)) return true;
      }
      return false;
    };
    /** A spotlight cut-in (a crit) still on screen: skip it. */
    const cut = () => { if (document.querySelector('[data-phc-cutin]')) document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); };
    window.__sweep = { st, act, idle, sleep,
      /** One weapon's cases, from index `from`: each { name, plain?, tech?: { id, aim, pressed }, line? }. Returns the
       *  results so far and, when the room has to be entered again (nowhere to stand, the fight ended), where to go on. */
      async weapon(job) {
        const out = [], { charId, weapon, thrown, melee, settle, mag, heatLimit } = job, quick = Math.min(settle, 120);
        /** The weapon in the main hand (a Throw leaves it on the ground: another is handed over); a grenade carried. */
        const hold = () => {
          const u = who().me; if (!u) return 'no fight';
          // (a fighter's grenades are counted when the fight begins: out of them, the room is entered again with more)
          if (thrown) { if (((u.throwables || {})[weapon] || 0) < 1) return 'restock'; if (u.weapon !== 'service_pistol') act({ type: 'sandbox/give', charId, item: 'service_pistol', qty: 1, equip: true }); return null; }
          if (u.weapon === weapon) return null;
          const e = weapon === 'fists' ? act({ type: 'sandbox/unequip', charId, slot: 'main' }) : act({ type: 'sandbox/give', charId, item: weapon, qty: 1, equip: true });
          return e ? 'give: ' + e : who().me.weapon === weapon ? null : 'not in hand (' + who().me.weapon + ')';
        };
        const far = thrown ? 'near' : melee ? 'melee' : 'far';
        for (let i = job.from; i < job.cases.length; i++) {
          const c = job.cases[i], r = { name: c.name }, t = c.tech;
          const h = hold(); if (h === 'restock') return { out, again: i, restock: true }; if (h) { r.refused = h; out.push(r); continue; }
          if (!(await station(far, quick))) return { out, again: i, stuck: true };
          let { me, dummy } = who();
          // a technique that draws: the weapon goes back in the pack first, and the technique names it there
          let item = thrown ? weapon : undefined;
          if (t && t.stowed && !thrown) {
            const e = act({ type: 'sandbox/unequip', charId, slot: 'main' }), pack = st().characters[charId].pack || [];
            let at = -1; pack.forEach((x, k) => { if (x.weapon === weapon && !x.mags && x.qty > 0) at = k; });
            if (e || at < 0) { r.refused = 'could not stow it' + (e ? ': ' + e : ''); out.push(r); continue; }
            item = at;
          }
          const aim = t ? String(t.aim || '') : '', [mx, my] = me.pos.split(',').map(Number);
          const side = [[0, 1], [0, -1], [-1, 0], [1, 0]].map(([ox, oy]) => (mx + ox) + ',' + (my + oy)).find((q) => q !== dummy.pos && !/-/.test(q)) || me.pos;
          let action;
          if (c.plain === 'throw') action = { type: 'combat/throw', unitId: me.id, item: weapon, tile: c.placed ? side : dummy.pos };
          else if (c.plain) action = { type: 'combat/attack', unitId: me.id, targetId: dummy.id, mode: c.plain };
          else {
            const moves = t.id === 'sidestep' || t.id === 'shift'; // a step of your own: beside you, not onto the dummy
            action = { type: 'combat/technique', unitId: me.id, id: t.id, hand: 'main', ...(item != null ? { item } : {}), ...(c.line ? { line: c.line } : {}), ...(t.opt ? { opt: t.opt } : {}),
              ...(/enemy/.test(aim) ? { targetId: dummy.id } : {}), ...(/tile/.test(aim) ? { tile: moves || /enemy/.test(aim) ? side : dummy.pos } : {}) };
          }
          // a new turn for a blade (an Opener is the first technique of a turn, a Finisher the last) and for a Take (one
          // a turn): the dummy never acts, so ending the turn comes straight back
          if (melee || (t && t.group === 'take')) {
            act({ type: 'combat/end-turn', unitId: me.id });
            for (let k = 0; k < 200; k++) { const cb = st().combat; if (!cb || cb.order[cb.turn] === me.id) break; await sleep(10); }
            await idle(0); ({ me, dummy } = who()); if (!me || !dummy) return { out, again: i, stuck: true };
          }
          // only what the case needs is topped up (every action redraws the whole screen): rounds, a jam, Heat near the
          // limit, Momentum for a blade, Pressure on the dummy for a Take
          me = who().me;
          if (me.jammed || (mag != null && !thrown && (me.ammo || 0) < Math.min(mag, c.rounds || 1)) || (heatLimit && (me.heat || 0) >= heatLimit - 2) || me.hp < me.maxHp / 2) act({ type: 'sandbox/refill', charId });
          if (melee && ((me.res && me.res.momentum) || 0) < 3) act({ type: 'sandbox/meter', unitId: me.id, momentum: 3 });
          if (t && t.pressed && (dummy.pressure || 0) < 2) act({ type: 'sandbox/meter', unitId: dummy.id, pressure: 3 });
          await idle(0);
          window.__phcFxTrace = [];
          const t0 = performance.now(); let err = act(action);
          // a weapon that must be rested: go prone, and try again (it stays down for the rest of this weapon's cases)
          if (err && /Brace it first/.test(err) && !who().me.prone && !act({ type: 'combat/prone', unitId: me.id })) { await idle(0); window.__phcFxTrace = []; err = act(action); }
          if (err) { window.__phcFxTrace = null; r.refused = err; out.push(r); continue; }
          const fin = await idle(settle); cut();
          r.trace = window.__phcFxTrace.map((x) => ({ ...x, t: Math.round((x.t - t0) * 100) / 100, rt: Math.round((x.rt - t0) * 10) / 10 })); window.__phcFxTrace = null; r.stalled = !fin;
          out.push(r);
          if (!who().dummy) return { out, again: i + 1 };
        }
        const u = who().me; if (u && u.prone) act({ type: 'combat/prone', unitId: u.id });
        return { out };
      } };
  });
  const A = (a) => p.evaluate((a) => window.__sweep.act(a), a);
  const G = () => p.evaluate(() => { const g = window.__phc.getState().game, cb = g.combat; return { phase: g.phase, chars: Object.keys(g.characters), units: cb ? cb.units.map((u) => ({ id: u.id, side: u.side, pos: u.pos, charId: u.charId, weapon: u.weapon, name: u.name, hp: u.hp, dead: !!u.dead, downed: !!u.downed })) : [], map: cb ? { w: cb.map.w, h: cb.map.h } : null }; });
  return { p, A, G };
}
/** Into the Effect testing room (from the gearing-up screen), skills at 10 and every technique ready. */
async function enterRoom(R, first) {
  const { p, A } = R;
  const charId = (await R.G()).chars[0];
  if (first) { await A({ type: 'sandbox/skills', charId, points: 10 }); await A({ type: 'sandbox/technique', charId, id: 'all', ready: true }); }
  const e = await A({ type: 'sandbox/fxtest' }); if (e) throw new Error('the Effect testing room refused: ' + e);
  await p.waitForFunction(() => window.__phc.getState().game?.phase === 'combat', null, { timeout: 30000 });
  await p.waitForSelector('button.phc-tok[aria-label]', { timeout: 30000 });
  await p.evaluate(() => window.__sweep.idle(300, 15000));
  return charId;
}
/** Play the cases on one page. speed: null (the player's default) or 'test'. */
async function sweep(browser, cases, speed) {
  const R = await openGround(browser, speed), { p, A } = R, fast = speed === 'test';
  const settle = fast ? 70 : 1500, tol = fast ? 0.5 : 40, k = fast ? 0.04 : 1 / 0.85, clock = !fast;
  let charId = await enterRoom(R, true), resets = 0;
  const results = [];
  /** Leave the room and enter it again (the ground cleared, the fighters as their sheets say; `gear`: an action while gearing up). */
  const reset = async (gear) => { resets++; await A({ type: 'sandbox/stop' }); await pause(p, fast ? 150 : 700); if (gear) await A(gear); charId = await enterRoom(R, false); };
  for (const id of [...new Set(cases.map((c) => c.weapon))]) {
    const w = WEAPONS.find((x) => x.id === id), mine = cases.filter((c) => c.weapon === id);
    const job = { charId, weapon: id, thrown: w.category === 'thrown', melee: systemOf(w) === 'melee', settle, from: 0, mag: w.magazine ?? null, heatLimit: w.heat_limit || 0,
      cases: mine.map((c) => ({ name: c.name, plain: c.plain || null, line: c.line, placed: (w.properties || []).includes('placed'), rounds: c.plain === 'burst' ? 3 : c.plain === 'auto' ? 10 : c.tech && typeof c.tech.rounds === 'number' ? c.tech.rounds : 1,
        tech: c.tech ? { id: c.tech.id, aim: c.tech.aim, group: c.tech.group, pressed: !!(c.tech.needs && c.tech.needs.pressed), stowed: !!(c.tech.needs && c.tech.needs.stowed), opt: OPTS[c.tech.id] || null } : null })) };
    const got = []; let restocks = 0;
    for (let tries = 0; job.from < mine.length && tries < 14; tries++) {
      let r;
      try { r = await p.evaluate((job) => window.__sweep.weapon(job), { ...job, charId }); }
      catch (e) { r = { out: [{ name: mine[job.from + 0].name, fails: ['the script failed: ' + String(e.message || e).split('\n')[0].slice(0, 160)] }], again: job.from + 1 }; }
      got.push(...r.out);
      if (r.again == null) break;
      // the room is entered again; a case that had nowhere to stand twice running is given up
      if (r.stuck && r.again === job.from && !r.out.length) { got.push({ name: mine[r.again].name, refused: 'no place to stand' }); job.from = r.again + 1; } else job.from = r.again;
      if (r.restock && ++restocks > 8) { got.push({ name: mine[r.again].name, refused: 'out of them' }); job.from = r.again + 1; }
      await reset(r.restock ? { type: 'sandbox/give', charId, item: id, qty: 3 } : null);
    }
    // after a grenade: a few turns go by (the dummy never acts) so the smoke clears and the flash wears off, and the
    // fighter is patched up, so the next weapon starts on clear ground with clear eyes
    if (job.thrown) { await reset(); await p.evaluate(async (charId) => { const S = window.__sweep, me = () => S.st().combat.units.find((u) => u.side === 'pc'); for (let i = 0; i < 5; i++) { S.act({ type: 'combat/end-turn', unitId: me().id }); for (let k = 0; k < 100; k++) { const cb = S.st().combat; if (cb.order[cb.turn] === me().id) break; await S.sleep(10); } } S.act({ type: 'sandbox/refill', charId }); await S.idle(100); }, charId); }
    note((fast ? 'table ' : 'real ') + id + ': ' + got.filter((x) => x.trace).length + ' played, ' + got.filter((x) => x.refused).length + ' refused, ' + resets + ' resets so far');
    for (const c of mine) {
      const r = got.find((x) => x.name === c.name) || { name: c.name, refused: 'not reached' };
      const res = { name: c.name, weapon: c.weapon, t: c.t, line: c.line, refused: r.refused, trace: r.trace, fails: r.fails };
      if (r.trace) {
        res.fails = judge(c, w, r.trace, { tol, k, clock });
        // the real-speed part is judged on the plan as well as on the clock (the plan is the same on any machine)
        if (clock) for (const f of judge(c, w, r.trace, { tol, k, clock: false })) if (!res.fails.includes(f)) res.fails.push(f + ' (by the plan)');
        if (r.stalled) res.fails.push('the effects queue never ran dry');
      }
      results.push(res);
      if (LOG) console.log((res.refused ? 'n/a  ' : res.fails && res.fails.length ? 'bad  ' : 'good ') + c.name + (res.refused ? ' — ' + res.refused : res.fails && res.fails.length ? ' — ' + res.fails.join('; ') : ' — ' + summary(res.trace)));
    }
  }
  const errors = p.fxErrors.slice();
  await p.context().close();
  return { results, errors, resets };
}
/** A technique's choice, where it must be told one (Called Shot's part). */
const OPTS = { called_shot: 'leg' };
const summary = (tr) => tr.filter((e) => e.w === 'ev').map((e) => e.k + (e.id ? ':' + e.id : '')).join(' ') + ' | ' + [...new Set(tr.filter((e) => e.w === 'proj').map((e) => e.look))].join(',');

// ---------- the judge ----------
const GUN_SOUND = /^(gun_|auto_|burst_)/;
/** What is wrong with a case's trace (an empty list: nothing). tol: ms of slack on this page's clock; k: its pace. */
function judge(c, w, tr0, { tol, k, clock }) {
  // the table judges the plan (t: the same on any machine); the real-speed part judges the clock (rt: what was seen)
  // WALL CLOCK, on purpose, in the real-speed part: what the player saw, and when. Its slack is 40 ms plus the most any
  // step of THIS case ran behind its own plan (rt - t): about nothing on an idle machine, and exactly what a busy one
  // cost. Two steps planned 40 ms apart can run 300 ms apart when the machine is busy between them; that is the
  // machine, and the plan (judged beside it, above) still has to be right to the millisecond.
  if (clock) tol += Math.max(0, ...tr0.map((e) => (e.rt || 0) - (e.t || 0)));
  const tr = clock ? tr0.map((e) => ({ ...e, t: e.rt })) : tr0;
  const bad = [], say = (s) => { if (!bad.includes(s)) bad.push(s); };
  const props = propsOf(w), melee = systemOf(w) === 'melee', cat = w.category;
  const evs = tr.filter((e) => e.w === 'ev').sort((a, b) => a.n - b.n), of = (n, ...ws) => tr.filter((e) => e.n === n && ws.includes(e.w));
  const ms = (x) => Math.round(x / k) + ' ms';
  // a weapon thrown by hand in this case (Throw, a Thrown Flurry): its flight is a throw, never a shot
  const byHand = cat === 'thrown' || evs.some((e) => e.k === 'shot' && e.thrown);
  // 1. the kind fits the weapon
  const launcher = !!w.explosive || props.includes('blast') || props.includes('arc') || cat === 'thrown';
  const noGun = launcher || melee || cat === 'bow' || byHand;
  const shotsOfIt = evs.filter((e) => (e.k === 'shot' || e.k === 'volley' || e.k === 'melee') && e.weapon === w.id).map((e) => e.n);
  const drawn = tr.filter((e) => shotsOfIt.includes(e.n));
  if (noGun) {
    const tracer = drawn.find((e) => e.w === 'proj' && (e.look === 'bullet' || e.look === 'pellets'));
    if (tracer) say('a bullet tracer (' + tracer.look + ') from ' + (launcher ? 'a launcher or grenade' : melee ? 'a melee weapon' : 'a bow'));
    const gun = drawn.find((e) => e.w === 'sfx' && GUN_SOUND.test(e.s)); if (gun) say('a gun\'s report (' + gun.s + ')');
  }
  if (melee || cat === 'bow' || cat === 'thrown' || props.includes('arc') || byHand) { if (drawn.some((e) => e.w === 'muzzle')) say('a muzzle flash'); }
  if (melee && !byHand && evs.some((e) => e.k === 'shot' && e.weapon === w.id && !e.thrown)) say('a melee weapon played a shot');
  for (const s of evs.filter((e) => e.k === 'shot' && (e.cat === 'thrown' || e.thrown))) {
    const flies = of(s.n, 'proj').some((e) => e.look === 'lob') || tr.some((e) => e.w === 'throw');
    if (!flies) say('a thrown weapon with no throw drawn');
  }
  // 2 and 3, shot by shot
  const starts = /^(shot|melee|technique|volley|move|turn|overwatch|watch_fire)$/;
  for (let i = 0; i < evs.length; i++) {
    const s = evs[i]; if (s.k !== 'shot' && s.k !== 'melee') continue;
    // what shows the shot or swing: a flash, a projectile, an arc, a flamer's gout, or (a weapon thrown by hand) its
    // flight, which its technique's own beat draws
    const launch = [...of(s.n, 'muzzle', 'proj', 'swing', 'throw'), ...of(s.n, 'burst').filter((e) => /^(flame|slash)/.test(e.name)), ...(s.thrown ? tr.filter((e) => e.w === 'throw') : [])].sort((a, b) => a.t - b.t)[0], projs = of(s.n, 'proj');
    const first = projs[0], lead = first ? projs.filter((x) => x.t - first.t <= tol) : [];
    const arrives = first ? Math.min(...lead.map((x) => x.t + x.ms)) : null;
    // (a hit's number is drawn with its impact; a "−2" on its own is a technique's penalty, not damage)
    const dmg = of(s.n, 'impact', 'boom', 'hp').sort((a, b) => a.t - b.t);
    if (!launch && (dmg.length || s.hit)) say('a ' + s.k + ' with nothing drawn for it');
    if (launch && dmg.length && dmg[0].t < launch.t - Math.min(1, tol)) say('damage (' + dmg[0].w + ') ' + ms(launch.t - dmg[0].t) + ' before the ' + (s.k === 'melee' ? 'swing' : 'shot'));
    if (arrives != null) {
      const early = dmg.find((e) => e.t < arrives - tol);
      if (early) say('its ' + (early.w === 'boom' ? 'blast' : early.w === 'hp' ? 'HP change' : 'hit and its number') + ' ' + ms(arrives - early.t) + ' before the ' + first.look + ' lands');
      for (let j = i + 1; j < evs.length && !starts.test(evs[j].k); j++) {
        const f = evs[j]; if (!/^(hurt|explode|object|down)$/.test(f.k)) continue;
        if (f.t < arrives - tol) say('the ' + f.k + ' after it ' + ms(arrives - f.t) + ' before the ' + first.look + ' lands');
      }
    }
    // the wounds that follow never come before the shot or swing is seen
    if (launch) for (let j = i + 1; j < evs.length && !starts.test(evs[j].k); j++) if (evs[j].k === 'hurt' && evs[j].t < launch.t - Math.min(1, tol)) say('a wound ' + ms(launch.t - evs[j].t) + ' before the ' + (s.k === 'melee' ? 'swing' : 'shot'));
  }
  // 3. a gun's report comes with its flash: the first of each, no more than a short beat apart
  const report = tr.filter((e) => e.w === 'sfx' && GUN_SOUND.test(e.s)).map((e) => e.t).sort((a, b) => a - b)[0];
  const flashT = tr.filter((e) => e.w === 'muzzle' || e.w === 'proj').map((e) => e.t).sort((a, b) => a - b)[0];
  if (report != null && flashT == null) say('a gun\'s report with no shot drawn');
  if (report != null && flashT != null && Math.abs(flashT - report) > 200 * k + tol) say('the report ' + ms(Math.abs(flashT - report)) + (report < flashT ? ' before' : ' after') + ' the muzzle flash');
  // Suppress (Leon: "plays the sound and damage way before the shoot VFX"): three rounds are drawn; a gun's rattle starts
  // with the first muzzle flash, and the hit comes with the last round to leave, never before it
  if (c.t === 'suppress') for (const sh of evs.filter((e) => e.k === 'shot' && e.tech === 'suppress')) {
    const fly = of(sh.n, 'proj'), hit = of(sh.n, 'impact')[0], flame = of(sh.n, 'burst').some((e) => /^flame/.test(e.name));
    if (!flame && fly.length && fly.length < 3) say('Suppress drew ' + fly.length + ' of its 3 rounds');
    if (hit && fly.length && hit.t < Math.max(...fly.map((e) => e.t)) - tol) say('the hit ' + ms(Math.max(...fly.map((e) => e.t)) - hit.t) + ' before the last round of the burst leaves');
    if (report != null && flashT != null && Math.abs(flashT - report) > 40 * k + tol) say('Suppress\'s report ' + ms(Math.abs(flashT - report)) + (report < flashT ? ' before' : ' after') + ' its first muzzle flash');
  }
  return bad;
}

// ---------- run ----------
const browser = await chromium.launch();
const report = { parts: {} };
const tally = (label, out) => {
  const played = out.results.filter((r) => !r.refused), bad = played.filter((r) => r.fails && r.fails.length), refused = out.results.filter((r) => r.refused);
  for (const r of bad) console.log('FAIL ' + label + ' · ' + r.name + ' — ' + r.fails.join('; '));
  failed += bad.length; if (bad.length) process.exitCode = 1;
  const why = {}; for (const r of refused) { const m = r.refused.replace(/\d+/g, 'N'); why[m] = (why[m] || 0) + 1; }
  console.log((bad.length ? 'FAIL ' : 'ok   ') + label + ': ' + out.results.length + ' cases · ' + played.length + ' played · ' + refused.length + ' refused by the rules · ' + bad.length + ' failing' + (out.resets ? ' · ' + out.resets + ' room resets' : ''));
  if (LOG) for (const [m, n] of Object.entries(why).sort((a, b) => b[1] - a[1])) console.log('       refused ×' + n + ': ' + m);
  ok(label + ': no page errors' + (out.errors.length ? ': ' + out.errors.join(' | ').slice(0, 300) : ''), out.errors.length === 0);
  return { cases: out.results.length, played: played.length, refused: refused.length, failing: bad.map((r) => ({ name: r.name, fails: r.fails })), refusals: why, results: out.results.map((r) => ({ name: r.name, refused: r.refused, fails: r.fails, trace: (r.fails && r.fails.length) || process.env.SWEEP_TRACE ? r.trace : undefined })) };
};
if (REAL) report.parts.real = tally('real speed', await sweep(browser, ALL, null));
else {
  if (PARTS.includes('real')) { const cs = ALL.filter((c) => REAL_CASES.includes(c.name)); if (cs.length) report.parts.real = tally('real speed', await sweep(browser, cs, null)); }
  if (PARTS.includes('table')) {
    // the table on a few pages at once (each its own room), the weapons dealt round: the judging reads the plan's clock, so a busy machine changes nothing
    const ids = [...new Set(ALL.map((c) => c.weapon))], lanes = Array.from({ length: Math.max(1, Math.min(JOBS, ids.length)) }, () => []);
    ids.forEach((id, i) => lanes[i % lanes.length].push(id));
    const outs = await Promise.all(lanes.map((l) => sweep(browser, ALL.filter((c) => l.includes(c.weapon)), 'test')));
    const byName = new Map(outs.flatMap((o) => o.results).map((r) => [r.name, r]));
    report.parts.table = tally('every weapon × every technique', { results: ALL.map((c) => byName.get(c.name)).filter(Boolean), errors: outs.flatMap((o) => o.errors), resets: outs.reduce((t, o) => t + o.resets, 0) });
  }
}
// ---------- fog: a blast aimed into it never tells of who stands there ----------
// (Leon, 11 Nov 2026: "selecting the area for this technique in fog where there are enemies you can't see also reveals
// them".) Two hostiles out of sight beside a tile in sight, two in plain sight elsewhere; the Thumper's Lob (Blast) is
// aimed at each place on the real screen. In sight: both are marked and named (so the check can see a mark when there
// is one). In the fog: no mark, no name, no count.
async function fogPart() {
  const R = await openGround(browser, 'test'), { p, A } = R;
  const charId = (await R.G()).chars[0];
  await A({ type: 'sandbox/skills', charId, points: 10 }); await A({ type: 'sandbox/technique', charId, id: 'all', ready: true });
  await A({ type: 'sandbox/give', charId, item: 'smetanita_thumper', equip: true });
  await A({ type: 'sandbox/ai', on: false }); await A({ type: 'sandbox/fight' });
  await p.waitForFunction(() => window.__phc.getState().game?.phase === 'combat', null, { timeout: 30000 });
  await p.waitForSelector('button.phc-tok[aria-label]', { timeout: 30000 });
  await p.evaluate(() => window.__sweep.idle(400, 15000));
  await A({ type: 'sandbox/clear' }); await pause(p, 300);
  const tiles = () => p.evaluate(() => [...document.querySelectorAll('button.phc-tok[aria-label]')].map((b) => b.getAttribute('aria-label')));
  const xy = (r) => [r.charCodeAt(0) - 65, Number(r.slice(1)) - 1], d = (a, b) => { const [ax, ay] = xy(a), [bx, by] = xy(b); return Math.max(Math.abs(ax - bx), Math.abs(ay - by)); };
  const read = async () => { const ls = await tiles(), open = ls.filter((l) => / · open( |$)/.test(l)); return { all: ls, fog: open.filter((l) => /out of sight/.test(l)).map((l) => l.split(' ')[0]), seen: open.filter((l) => !/out of sight/.test(l)).map((l) => l.split(' ')[0]) }; };
  const me = (await R.G()).units.find((u) => u.side === 'pc'), meRef = ref(me.pos);
  let T = await read();
  ok('fog: the ground has tiles in sight and out of it (' + T.seen.length + ' / ' + T.fog.length + ')', T.seen.length > 10 && T.fog.length > 10);
  // a tile in sight, 4 to 12 tiles off, with two free tiles out of sight beside it
  let aim = null, lurk = [];
  for (const t of T.seen.filter((t) => d(t, meRef) >= 4 && d(t, meRef) <= 12).sort((a, b) => d(a, meRef) - d(b, meRef))) {
    const near = T.fog.filter((f) => d(f, t) === 1); if (near.length < 2) continue;
    await A({ type: 'sandbox/clear' });
    const e1 = await A({ type: 'sandbox/spawn', tier: 'elite', weapon: 'fists', at: near[0], name: 'Fog lurker' }), e2 = await A({ type: 'sandbox/spawn', tier: 'elite', weapon: 'fists', at: near[1], name: 'Fog lurker' });
    if (e1 || e2) continue;
    await pause(p, 250);
    const now = await read();
    if (now.all.some((l) => /Fog lurker/.test(l)) || !now.seen.includes(t)) continue; // one of them is in sight after all, or the tile isn't
    aim = t; lurk = near.slice(0, 2); T = now; break;
  }
  ok('fog: two hostiles stand out of sight (' + lurk.join(', ') + ') beside a tile in sight (' + aim + ')', !!aim);
  if (!aim) { await p.context().close(); return; }
  // two in plain sight, away from the first place
  let aim2 = null;
  for (const t of T.seen.filter((t) => d(t, meRef) >= 3 && d(t, meRef) <= 10 && d(t, aim) >= 6).sort((a, b) => d(a, meRef) - d(b, meRef))) {
    const near = T.seen.filter((f) => d(f, t) === 1 && f !== meRef && d(f, meRef) > 2); if (near.length < 2) continue;
    const e1 = await A({ type: 'sandbox/spawn', tier: 'elite', weapon: 'fists', at: near[0], name: 'Plain sight' }), e2 = await A({ type: 'sandbox/spawn', tier: 'elite', weapon: 'fists', at: near[1], name: 'Plain sight' });
    if (!e1 && !e2) { aim2 = t; break; }
  }
  await p.evaluate(() => window.__sweep.idle(300, 8000));
  ok('fog: two hostiles stand in plain sight beside ' + aim2, !!aim2 && (await tiles()).filter((l) => /Plain sight/.test(l)).length === 2);
  // the real screen: Attack tab, the weapon's techniques, Lob, its Blast line, then the tile
  const tools = p.locator('aside[aria-label="Proving Ground tools"]').first();
  if (await tools.count()) await tools.getByRole('button', { name: /^Close the tools/ }).first().click().catch(() => {});
  await p.waitForFunction(() => { const dk = document.querySelector('.phc-cb-dock'); return !!dk && !dk.getAttribute('data-lock'); }, null, { timeout: 30000 }).catch(() => {});
  await p.locator('#phc-tab-attack').click(); await pause(p, 200);
  await p.locator('[role="tabpanel"] [data-act="tpad:main"]').first().click(); await pause(p, 250);
  await p.locator('[data-tech-pad] [data-word="lob"]').first().click(); await pause(p, 250);
  const blast = p.locator('.phc-cb-dock').getByRole('button', { name: /blast/i }).first();
  if (await blast.count()) { await blast.click(); await pause(p, 200); }
  const shown = () => p.evaluate(() => {
    const marks = [...document.querySelectorAll('button.phc-tok [title$=": affected"]')].map((m) => m.closest('button.phc-tok').getAttribute('aria-label').split(' ')[0] + ' ' + m.getAttribute('title'));
    const dock = (document.querySelector('.phc-cb-dock') || document.body).innerText || '';
    const attrs = [...document.querySelectorAll('button.phc-tok, button.phc-tok *')].map((e) => (e.getAttribute('title') || '') + ' ' + (e.getAttribute('aria-label') || '')).join(' ');
    return { marks, card: (dock.match(/Fog lurker/g) || []).length, plain: (dock.match(/Plain sight/g) || []).length, onTiles: /Fog lurker/.test(attrs), covered: document.querySelectorAll('button.phc-tok[aria-label*="it covers this tile"]').length };
  });
  const base = await shown();
  const clickTile = async (r) => { await p.locator('button.phc-tok[aria-label^="' + r + ' "]').first().click({ force: true }); await pause(p, 350); };
  await clickTile(aim2); const seenAim = await shown();
  ok('fog: aimed in sight, the blast is drawn (' + seenAim.covered + ' tiles) and both hostiles in it are marked (' + seenAim.marks.join(' | ') + ') and named', seenAim.covered > 4 && seenAim.marks.length === 2 && seenAim.plain > base.plain);
  await clickTile(aim); const fogAim = await shown();
  ok('fog: aimed at the fog\'s edge, the blast is drawn (' + fogAim.covered + ' tiles)', fogAim.covered > 4);
  ok('fog: …no unit out of sight is marked (' + (fogAim.marks.join(' | ') || 'none') + ')', fogAim.marks.length === 0);
  ok('fog: …or named or counted on the card (' + fogAim.card + ' mentions, ' + base.card + ' before aiming) or on any tile', fogAim.card === base.card && !fogAim.onTiles);
  ok('fog: no page errors' + (p.fxErrors.length ? ': ' + p.fxErrors.join(' | ').slice(0, 300) : ''), p.fxErrors.length === 0);
  await p.context().close();
}

// ---------- glyphs: a Sigil caster's glyphs stay drawn through an opportunity attack ----------
// (Leon, 11 Nov 2026: "attack of opportunity on a Sigilist that has placed their sigil down and moved to another space
// looks like it erases the sigil display".) A Line of two glyphs, the caster beside an enemy, then it walks away over
// its own glyphs and takes the opportunity attack: at every moment each glyph in the fight is drawn on its tile.
async function glyphPart() {
  const R = await openGround(browser, null), { p, A } = R;
  const charId = (await R.G()).chars[0];
  for (const a of [{ type: 'sandbox/kit', charId, kind: 'sigil' }, { type: 'sandbox/skill', charId, skill: 'brain_power', points: 3 }, { type: 'sandbox/give', charId, item: 'evoker_blade', equip: true },
    { type: 'sandbox/give', charId, item: 'standard_core', qty: 3 }, { type: 'sandbox/learn', charId, word: 'fire' }, { type: 'sandbox/learn', charId, word: 'seek' }, { type: 'sandbox/ai', on: false }, { type: 'sandbox/fight' }]) await A(a);
  await p.waitForFunction(() => window.__phc.getState().game?.phase === 'combat', null, { timeout: 30000 });
  await p.waitForSelector('button.phc-tok[aria-label]', { timeout: 30000 });
  await p.evaluate(() => window.__sweep.idle(600, 15000));
  await A({ type: 'sandbox/clear' });
  const me = (await R.G()).units.find((u) => u.side === 'pc'), [x, y] = me.pos.split(',').map(Number), K = (dx) => (x + dx) + ',' + y;
  const e0 = await A({ type: 'sandbox/spawn', tier: 'elite', weapon: 'sabre', at: ref(K(3)), name: 'Reacher' });
  const snap = () => p.evaluate(() => {
    const cb = window.__phc.getState().game.combat; if (!cb) return null;
    const refOf = (k) => { const [x, y] = k.split(',').map(Number); return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[x] + (y + 1); };
    const eff = (el) => { let o = 1; for (let e = el; e && e !== document.body; e = e.parentElement) { const cs = getComputedStyle(e); o *= +cs.opacity; if (cs.visibility === 'hidden' || cs.display === 'none') o = 0; } return o; };
    const drawn = [...document.querySelectorAll('button.phc-tok[aria-label]')].flatMap((b) => [...b.querySelectorAll('img')].filter((i) => /rounds?\)/.test(i.title || '') && eff(i) > 0.9 && i.getBoundingClientRect().width > 8).map(() => b.getAttribute('aria-label').split(' ')[0]));
    return { state: (cb.glyphs || []).map((g) => refOf(g.pos)).sort().join(' '), drawn: drawn.sort().join(' '), log: cb.log.slice(-4).map((l) => (typeof l === 'string' ? l : l.text)).join(' | ') };
  });
  const steps = [['draws FIRE', { type: 'combat/draw', unitId: me.id, word: 'fire', tile: ref(K(0)) }], ['steps on', { type: 'combat/move', unitId: me.id, to: K(1) }], ['draws SEEK', { type: 'combat/draw', unitId: me.id, word: 'seek', tile: ref(K(1)) }],
    ['steps beside the enemy', { type: 'combat/move', unitId: me.id, to: K(2) }], ['ends the turn', { type: 'combat/end-turn', unitId: me.id }]];
  const errs = [e0]; for (const [, a] of steps) { errs.push(await A(a)); await p.evaluate(() => window.__sweep.idle(250, 15000)); }
  const before = await snap();
  ok('glyphs: a Line of two is on the ground and drawn (' + before.state + ' / ' + before.drawn + ')' + (errs.filter(Boolean).length ? ' · ' + errs.filter(Boolean).join(' · ') : ''), before.state.split(' ').length === 2 && before.drawn === before.state);
  const eMove = await A({ type: 'combat/move', unitId: me.id, to: K(-1) });
  const gone = []; let last = before;
  for (const t0 = Date.now(); Date.now() - t0 < 4500;) { const s = await snap(); if (s) { last = s; if (s.drawn !== s.state) gone.push((Date.now() - t0) + ' ms: in the fight ' + s.state + ', drawn ' + (s.drawn || 'none')); } await pause(p, 35); }
  ok('glyphs: walking away drew an opportunity attack (' + last.log.slice(0, 200) + ')' + (eMove ? ' · ' + eMove : ''), /opportunity attack/.test(last.log));
  ok('glyphs: through the attack and after it, every glyph in the fight stays drawn' + (gone.length ? ' — ' + gone.slice(0, 3).join('; ') : ' (' + last.drawn + ')'), gone.length === 0 && last.state.split(' ').length === 2);
  ok('glyphs: no page errors' + (p.fxErrors.length ? ': ' + p.fxErrors.join(' | ').slice(0, 300) : ''), p.fxErrors.length === 0);
  await p.context().close();
}
note('table done'); if (!ONLY && PARTS.includes('fog')) await fogPart();
note('fog done');
if (!ONLY && PARTS.includes('glyphs')) await glyphPart();
try { mkdirSync(ROOT + '.check/e2e', { recursive: true }); writeFileSync(ROOT + '.check/e2e/fx-sweep.json', JSON.stringify(report, null, 1)); } catch { /* */ }
await browser.close();
console.log(failed ? failed + ' FAILING' : 'ALL GOOD');

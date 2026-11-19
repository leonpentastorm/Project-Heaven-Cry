// The co-op stall hunt (docs/design/handoffs/0.32-COOP.md; the stall of docs/design/handoffs/coop-stall.md): two-player
// fights through the real room link, one after another, each in a new room (a new seed: the room's code), with every
// hop of the guest's actions stamped (apps/web/src/game/net.ts hop): guest sent, relay received (the room's own stamp),
// host received, host applied, view sent, guest received, guest drew. A fight that stands still for 45 s is a stall:
// both screens' books are printed and the run is red.
// Each run plays one way, by its number: plain; fast (the guest acts the moment its panel opens, no pause); reconnect
// (the guest refreshes in the middle of its own turn, an attack picked and not confirmed); background (the host's tab
// goes out of sight while the guest plays, and comes back for its own turns).
// Opt-in: one run by default (in the `anim` group: it measures time); RUNS=40 for the hunt, WAYS=fast,reconnect to pick,
// JOB=n to number a process when several run at once. The last line is the hop table (median and worst per hop, ms).
// Run: BASE=http://127.0.0.1:8787 RUNS=40 node apps/web/e2e/coop-loop.mjs
import { chromium, player, click, BASE, hostAs, pickAction, settle, lockIn } from './lib.mjs';
import { writeFileSync, mkdirSync } from 'fs';

const RUNS = Number(process.env.RUNS || 1), JOB = Number(process.env.JOB || 0);
const WAYS = (process.env.WAYS || 'plain,fast,reconnect,background').split(',');
const log = (...a) => console.log(...a);
let failed = 0;
const check = (ok, what) => { log((ok ? 'ok    ' : 'FAIL  ') + what); if (!ok) failed++; };

async function create(page, name, family) {
  await click(page, 'Create a character');
  await page.getByPlaceholder('What the squad calls you').fill(name);
  await page.locator('main button[aria-pressed]').first().click();
  await click(page, 'Next ›');
  if (family) await page.getByRole('tab', { name: family, exact: true }).click();
  await page.locator('button', { hasText: /^Use .* ›$/ }).first().click();
  await click(page, 'Next ›'); await click(page, 'Next ›'); await click(page, 'Next ›');
  await click(page, 'Next ›');
  await lockIn(page);
  await page.waitForSelector('text=✓ LOCKED IN');
}
const books = (p) => p.evaluate(() => { const s = window.__phc.getState(), g = s.game, cb = g && g.combat, dock = document.querySelector('.phc-cb-dock');
  return { screen: s.screen, v: g && g.v, round: cb && cb.round, turn: cb && cb.turn, unit: cb && cb.order[cb.turn], over: !!(cb && cb.over),
    lock: dock && dock.getAttribute('data-lock'), fx: window.__phcFxDebug && window.__phcFxDebug(), net: window.__phc.net && window.__phc.net() }; });
const myTurn = (p) => p.evaluate(() => { const s = window.__phc.getState(), g = s.game, cb = g && g.combat; if (!cb || cb.over) return cb && cb.over ? 'over' : 'none';
  const u = cb.units.find((x) => x.id === cb.order[cb.turn]); return (u && u.charId && g.characters[u.charId].owner === s.me.id ? 'mine' : 'other') + ':' + g.v; });
const hide = (p, on) => p.evaluate((on) => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => on }); Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (on ? 'hidden' : 'visible') }); document.dispatchEvent(new Event('visibilitychange')); }, on);
const hopsOn = (p) => p.addInitScript(() => { window.__phcHops = []; });
const hopsOf = (p) => p.evaluate(() => window.__phcHops || []).catch(() => []);

/** One guest action's hops, from both pages' stamps: by its nonce to the version it made, then that version's view. */
function chains(hostHops, guestHops, guestPid) {
  const out = [];
  for (const s of guestHops.filter((h) => h.dir === 'out' && h.t === 'act' && h.nonce)) {
    const hin = hostHops.find((h) => h.dir === 'in' && h.t === 'act' && h.nonce === s.nonce), ap = hostHops.find((h) => h.dir === 'applied' && h.nonce === s.nonce);
    if (!hin || !ap) continue; // refused (an error goes back), or lost with a reload
    const vs = hostHops.find((h) => h.dir === 'out' && h.t === 'view' && h.pid === guestPid && h.v === ap.v && h.at >= ap.at);
    const gin = guestHops.find((h) => h.dir === 'in' && h.t === 'view' && h.v >= ap.v && h.at >= s.at), dr = gin && guestHops.find((h) => h.dir === 'drawn' && h.v === gin.v && h.at >= gin.at);
    out.push({ relay: hin.rt ? hin.rt - s.at : null, toHost: hin.at - s.at, apply: ap.at - hin.at, send: vs ? vs.at - ap.at : null,
      toGuest: vs && gin ? gin.at - vs.at : null, draw: gin && dr ? dr.at - gin.at : null, total: dr ? dr.at - s.at : gin ? gin.at - s.at : null });
  }
  return out;
}

async function fight(run, way) {
  const t0 = Date.now(), browser = await chromium.launch();
  const host = await player(browser, 'host', { campaigns: ['m813'] }), guest = await player(browser, 'guest');
  await hopsOn(host); await hopsOn(guest);
  let stalled = false, acts = 0, guestActs = 0, reloads = 0, hides = 0, res = null;
  const hops = { host: [], guest: [] };
  try {
    await hostAs(host, 'Leon');
    await host.waitForSelector('text=The squad');
    const code = (await host.locator('text=/ROOM [A-Z0-9]{6}/').first().textContent()).match(/ROOM ([A-Z0-9]{6})/)[1];
    await create(host, 'MPAT', null);
    await guest.goto(BASE + '/?room=' + code); await guest.getByPlaceholder('Leon').fill('Mai'); await click(guest, 'Join ›');
    await guest.waitForSelector('text=The squad');
    await create(guest, 'Ninety-Two', 'Guns and hunters');
    await settle(host, 600);
    await host.evaluate(() => window.__phc.setNarrator({ scripted: true }));
    await click(host, 'Start session');
    await host.waitForSelector('text=The rear pad', { timeout: 30000 });
    await guest.waitForSelector('text=Outpost-813\'s rear landing pad', { timeout: 30000 });
    await host.getByLabel('What do you do?').fill('I walk up the ramp.'); await click(host, 'Send', { exact: true }); await click(host, 'End turn', { exact: true });
    await guest.getByLabel('What do you do?').fill('I cover him.'); await click(guest, 'Send', { exact: true }); await click(guest, 'End turn', { exact: true });
    await host.waitForSelector('text=CLICK TO ROLL', { timeout: 30000 });
    await settle(host, 300);
    if (!(await host.locator('div[aria-label="Dice table"]').count())) await host.locator('button', { hasText: 'Get Keel to lower the ramp.' }).click();
    await click(host, /Throw/);
    await host.waitForSelector('text=/SUCCESS|FAILURE|COMPLICATION/');
    await click(host, 'Continue', { exact: true });
    await guest.waitForFunction(() => { const g = window.__phc.getState().game; return !!(g && g.combat); }, null, { timeout: 30000 });
    const guestPid = await guest.evaluate(() => window.__phc.getState().me.id);
    let lastKey = '', lastChange = Date.now(), hostHidden = false, reloadedThisTurn = '';
    for (let i = 0; i < 4000; i++) {
      const raw = [await myTurn(host), await myTurn(guest)], states = raw.map((x) => x.split(':')[0]);
      if (states.includes('over')) break;
      if (raw.join() !== lastKey) { lastKey = raw.join(); lastChange = Date.now(); }
      if (Date.now() - lastChange > 45000) { stalled = true; log('STALL run ' + run + ' (' + way + ') at loop', i, lastKey, 'after', acts, 'actions'); log('HOST', JSON.stringify(await books(host))); log('GUEST', JSON.stringify(await books(guest))); break; }
      // background: the host's tab is out of sight whenever it is not the host's turn
      if (way === 'background') { const want = states[0] !== 'mine'; if (want !== hostHidden) { await hide(host, want); hostHidden = want; if (want) hides++; } }
      for (const [k, p] of [[0, host], [1, guest]]) {
        if (states[k] !== 'mine') continue;
        if (!(await p.locator('text=ACTION POINTS').count())) { await settle(p, 120); continue; }
        if (await p.evaluate(() => { const d = document.querySelector('.phc-cb-dock'); return d ? d.getAttribute('data-lock') || '' : 'none'; })) continue;
        const fast = way === 'fast' && k === 1;
        await pickAction(p, /^(Shot|Strike)/, { timeout: 2000 }).catch(() => {});
        // reconnect: once in each of the guest's turns (by version), the guest refreshes with the attack picked
        if (way === 'reconnect' && k === 1 && reloadedThisTurn !== raw[1] && acts % 2 === 0) {
          reloadedThisTurn = raw[1]; reloads++;
          await guest.reload(); await guest.waitForFunction(() => { const g = window.__phc.getState().game; return !!(g && g.combat); }, null, { timeout: 60000 }).catch(() => {});
          continue;
        }
        const conf = p.getByRole('button', { name: 'Confirm', exact: true });
        try { if (await conf.isEnabled({ timeout: 30000 })) await conf.click({ timeout: 30000 }); else await p.getByRole('button', { name: 'End turn', exact: true }).click({ timeout: 30000 }); acts++; if (k === 1) guestActs++; }
        catch (e) { log('      a click did not land (' + p.pname + '): ' + String(e.message).split('\n')[0]); }
        if (!fast) await settle(p, 60);
      }
      if (way !== 'fast') await settle(host, 60);
    }
    if (hostHidden) await hide(host, false);
    const end = [await books(host), await books(guest)];
    if (!stalled && end[0].over && !end[1].over) await guest.waitForFunction(() => { const cb = window.__phc.getState().game.combat; return !cb || cb.over; }, null, { timeout: 30000 }).catch(() => {});
    const gOver = await guest.evaluate(() => { const cb = window.__phc.getState().game.combat; return !cb || !!cb.over; });
    hops.host = await hopsOf(host); hops.guest = await hopsOf(guest);
    res = { run, way, code, stalled, over: end[0].over && gOver, acts, guestActs, reloads, hides, secs: Math.round((Date.now() - t0) / 1000), chains: chains(hops.host, hops.guest, guestPid),
      settled: [end[0].fx && end[0].fx.settled, end[1].fx && end[1].fx.settled], resyncs: end[1].net && end[1].net.resyncs };
    const errs = [...host.errors, ...guest.errors].filter((e) => !/WebSocket|ERR_INTERNET_DISCONNECTED|Failed to load resource|net::/.test(e));
    res.errors = errs.slice(0, 3);
  } catch (e) { res = { run, way, error: String(e && e.message || e).split('\n')[0], secs: Math.round((Date.now() - t0) / 1000) }; }
  finally { await browser.close(); }
  return res;
}

const q = (xs, p) => { const s = xs.filter((x) => x != null).sort((a, b) => a - b); return s.length ? Math.round(s[Math.min(s.length - 1, Math.floor(p * (s.length - 1) + 0.5))]) : null; };
const results = [];
for (let r = 0; r < RUNS; r++) {
  const way = WAYS[(r + JOB) % WAYS.length], res = await fight(JOB * 1000 + r, way);
  results.push(res);
  log('run ' + res.run + ' ' + way + ': ' + (res.error ? 'ERROR ' + res.error : (res.stalled ? 'STALL' : 'no stall') + ', ' + (res.over ? 'ended on both screens' : 'NOT ended') + ', ' + res.acts + ' actions (' + res.guestActs + ' by the guest), '
    + res.reloads + ' refreshes, ' + res.hides + ' hides, ' + res.secs + ' s, resyncs ' + res.resyncs + ', settled ' + res.settled + (res.errors.length ? ', page errors ' + JSON.stringify(res.errors).slice(0, 300) : '')));
}
const all = results.flatMap((r) => r.chains || []), HOPS = ['relay', 'toHost', 'apply', 'send', 'toGuest', 'draw', 'total'];
const table = Object.fromEntries(HOPS.map((h) => [h, { median: q(all.map((c) => c[h]), 0.5), p95: q(all.map((c) => c[h]), 0.95), worst: q(all.map((c) => c[h]), 1), n: all.filter((c) => c[h] != null).length }]));
if (process.env.HOPS_OUT) { mkdirSync(process.env.HOPS_OUT, { recursive: true }); writeFileSync(process.env.HOPS_OUT + '/job' + JOB + '.json', JSON.stringify({ results, all }), 'utf8'); }
const ran = results.filter((r) => !r.error);
check(ran.length === results.length, ran.length + ' of ' + results.length + ' runs reached the fight and played it' + (ran.length < results.length ? ': ' + results.filter((r) => r.error).map((r) => r.run + ' ' + r.error).join(' | ').slice(0, 400) : ''));
check(!ran.some((r) => r.stalled), 'no fight stood still for 45 s (' + ran.filter((r) => r.stalled).length + ' stalls in ' + ran.length + ' fights)');
check(ran.every((r) => r.over), 'every fight ended on both screens');
check(all.length > 0, all.length + ' guest actions timed end to end');
check(ran.every((r) => !r.errors.length), 'no page errors');
log('HOPS ' + JSON.stringify(table));
log(failed ? 'RESULT FAIL (' + failed + ')' : 'RESULT OK');
process.exit(failed ? (ran.some((r) => r.stalled) ? 2 : 1) : 0);

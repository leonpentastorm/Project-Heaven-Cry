// A two-player fight must never stand still (docs/design/handoffs/coop-stall.md). Three parts:
//  A. the room relay alone (plain sockets, no browser): a player's old socket that never answers its close must not stop
//     the views reaching the new one; a guest's check-in (`sync`) reaches the host, and with the host away the room
//     answers it from the last view it kept;
//  B. two browsers in a fight: the guest loses the views of a host action (dropped on the wire), and catches up by its
//     own check-in, with nothing else happening in the room;
//  C. the fight is then played to its end, each player acting only when their action panel is unlocked, as a player
//     must. MODE picks what disturbs it on the way: `plain` (nothing), `hide` (a tab goes out of sight and comes back),
//     `offline` (the guest's network drops and returns), `reload` (the guest refreshes), `lossy` (views dropped at
//     random). 45 s without the game moving is a stall: the script prints both screens' books and exits 2.
// Run: BASE=http://127.0.0.1:8787 MODE=plain node apps/web/e2e/coop-stall.mjs   (PARTS=A, PARTS=BC to run a part)
import net from 'net';
import crypto from 'crypto';
import { chromium, player, click, BASE, hostAs, pickAction, settle } from './lib.mjs';

const MODE = process.env.MODE || 'plain', PARTS = process.env.PARTS || 'ABC';
const log = (...a) => console.log(...a);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failed = 0;
const check = (ok, what) => { log((ok ? 'ok    ' : 'FAIL  ') + what); if (!ok) failed++; };

// ---------- A. the relay ----------
async function relay() {
  const u = new URL(BASE), wsBase = (u.protocol === 'https:' ? 'wss://' : 'ws://') + u.host;
  const code = 'ZZ' + Array.from(crypto.randomBytes(4), (b) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join('');
  const open = (q) => new Promise((res, rej) => { const ws = new WebSocket(`${wsBase}/room/${code}/ws?${q}`); ws.got = []; ws.onmessage = (e) => ws.got.push(JSON.parse(e.data)); ws.onopen = () => res(ws); ws.onerror = () => rej(new Error('socket error: ' + q)); });
  const host = await open('pid=h1&name=H&role=host&token=t1');
  // A player who has gone without a word: the handshake, then it never reads again (so it never answers a close).
  let dead = null;
  if (u.protocol === 'http:') {
    dead = await new Promise((res) => { const s = net.connect(Number(u.port) || 80, u.hostname, () => s.write(`GET /room/${code}/ws?pid=g1&name=G&role=guest HTTP/1.1\r\nHost: ${u.host}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${crypto.randomBytes(16).toString('base64')}\r\nSec-WebSocket-Version: 13\r\n\r\n`)); s.once('data', () => { s.pause(); res(s); }); });
    await wait(300);
  } else log('      (a silent socket needs plain http: skipped on ' + u.protocol + ')');
  const guest = await open('pid=g1&name=G&role=guest'); // the same player again: the room closes the old socket, which never answers
  await wait(300);
  for (let v = 1; v <= 3; v++) { host.send(JSON.stringify({ t: 'view', pid: 'g1', state: { v, code } })); await wait(150); }
  const views = () => guest.got.filter((m) => m.t === 'view').map((m) => m.state.v);
  check(views().join() === '1,2,3', 'a silent old socket does not stop the views reaching the new one (got ' + views().join() + ')');
  guest.send(JSON.stringify({ t: 'act', action: { type: 'x' }, nonce: 'n1' })); await wait(200);
  check(host.got.some((m) => m.t === 'act' && m.from === 'g1'), 'the guest\'s action reaches the host');
  guest.send(JSON.stringify({ t: 'sync', v: 2 })); await wait(200);
  const sy = host.got.find((m) => m.t === 'sync');
  check(!!sy && sy.from === 'g1' && sy.v === 2, 'the guest\'s check-in reaches the host with its version');
  host.send(JSON.stringify({ t: 'view', pid: 'g1', state: { v: 4, code }, resync: true })); await wait(200);
  check(guest.got.some((m) => m.t === 'view' && m.resync && m.state.v === 4), 'the host\'s answer arrives marked as a resync');
  host.close(); await wait(300);
  guest.got.length = 0;
  guest.send(JSON.stringify({ t: 'sync', v: 4 })); await wait(200);
  check(!guest.got.some((m) => m.t === 'view'), 'host away, the guest up to date: the room sends nothing');
  guest.send(JSON.stringify({ t: 'sync', v: 3 })); await wait(200);
  check(guest.got.some((m) => m.t === 'view' && m.resync && m.state.v === 4), 'host away, the guest behind: the room sends the view it kept');
  guest.close(); dead?.destroy();
}

// ---------- B and C. two browsers ----------
async function create(page, name, family, kit) {
  await click(page, 'Create a character');
  await page.getByPlaceholder('What the squad calls you').fill(name);
  await page.locator('main button[aria-pressed]').first().click();
  await click(page, 'Next ›');
  if (family) await page.getByRole('tab', { name: family, exact: true }).click();
  await page.locator('button', { hasText: /^Use .* ›$/ }).first().click();
  await click(page, 'Next ›'); await click(page, 'Next ›'); await click(page, 'Next ›');
  await page.locator('button', { hasText: kit }).first().click();
  await click(page, 'Next ›');
  await click(page, 'Lock in and bring to the room');
  await page.waitForSelector('text=✓ LOCKED IN');
}
/** Everything a stalled screen can say about itself (the two debug hooks: window.__phc.net(), window.__phcFxDebug()). */
const books = (p) => p.evaluate(() => { const s = window.__phc.getState(), g = s.game, cb = g && g.combat, fx = (cb && cb.fx) || [], dock = document.querySelector('.phc-cb-dock');
  return { screen: s.screen, phase: g && g.phase, v: g && g.v, round: cb && cb.round, turn: cb && cb.turn, unit: cb && cb.order[cb.turn], over: !!(cb && cb.over), fxFirst: fx[0] && fx[0].n, fxLast: fx.length ? fx[fx.length - 1].n : 0,
    turnsInFx: fx.filter((e) => e.k === 'turn').map((e) => e.n + ':' + e.unit), lock: dock && dock.getAttribute('data-lock'), lockMsg: (document.querySelector('.phc-cb-lockmsg') || {}).textContent || '',
    fx: window.__phcFxDebug && window.__phcFxDebug(), net: window.__phc.net && window.__phc.net(), cutIn: !!document.querySelector('[data-phc-cutin]') }; });
const myTurn = (p) => p.evaluate(() => { const s = window.__phc.getState(), g = s.game, cb = g && g.combat; if (!cb || cb.over) return cb && cb.over ? 'over' : 'none';
  const u = cb.units.find((x) => x.id === cb.order[cb.turn]); return (u && u.charId && g.characters[u.charId].owner === s.me.id ? 'mine' : 'other') + ':' + g.v; });
const hide = (p, on) => p.evaluate((on) => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => on }); Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (on ? 'hidden' : 'visible') }); document.dispatchEvent(new Event('visibilitychange')); }, on);

async function browsers() {
  const t0 = Date.now(), browser = await chromium.launch();
  const host = await player(browser, 'host'), guest = await player(browser, 'guest');
  // The guest's link runs through a tap: views from the room can be dropped on the way (a lost message).
  const tap = { drop: false, lossy: 0, dropped: 0 };
  await guest.routeWebSocket(/\/room\/[A-Z0-9]{6}\/ws/, (ws) => { const server = ws.connectToServer();
    ws.onMessage((m) => server.send(m));
    server.onMessage((m) => { if (typeof m === 'string' && m.startsWith('{"t":"view"') && !m.includes('"resync":true') && (tap.drop || Math.random() < tap.lossy)) { tap.dropped++; return; } ws.send(m); }); });
  try {
    await hostAs(host, 'Leon');
    await host.waitForSelector('text=The squad');
    const code = (await host.locator('text=/ROOM [A-Z0-9]{6}/').first().textContent()).match(/ROOM ([A-Z0-9]{6})/)[1];
    log('room', code, 'mode', MODE);
    await create(host, 'MPAT', null, 'Field medic');
    await guest.goto(BASE + '/?room=' + code); await guest.getByPlaceholder('Leon').fill('Mai'); await click(guest, 'Join ›');
    await guest.waitForSelector('text=The squad');
    await create(guest, 'Ninety-Two', 'Guns and hunters', 'Line soldier');
    await settle(host, 800);
    await host.evaluate(() => window.__phc.setNarrator({ scripted: true }));
    await click(host, 'Start session');
    await host.waitForSelector('text=The rear pad', { timeout: 15000 });
    await guest.waitForSelector('text=Outpost-813\'s rear landing pad', { timeout: 15000 });
    await host.getByLabel('What do you do?').fill('I walk up the ramp with 4-Ten on my shoulders.'); await click(host, 'Send', { exact: true }); await click(host, 'End turn', { exact: true });
    await guest.getByLabel('What do you do?').fill('I cover him from the wreck line.'); await click(guest, 'Send', { exact: true }); await click(guest, 'End turn', { exact: true });
    await host.waitForSelector('text=CLICK TO ROLL', { timeout: 15000 });
    await settle(host, 300);
    if (!(await host.locator('div[aria-label="Dice table"]').count())) await host.locator('button', { hasText: 'Get Keel to lower the ramp.' }).click();
    await click(host, /Throw/);
    await host.waitForSelector('text=/SUCCESS|FAILURE|COMPLICATION/');
    await click(host, 'Continue', { exact: true });
    await host.waitForSelector('text=Initiative', { timeout: 10000 }).catch(() => {});
    await guest.waitForFunction(() => { const g = window.__phc.getState().game; return !!(g && g.combat); }, null, { timeout: 15000 });

    // ----- B. a lost view -----
    if (PARTS.includes('B')) {
      const v = (p) => p.evaluate(() => window.__phc.getState().game.v);
      await guest.waitForFunction((hv) => window.__phc.getState().game.v >= hv, await v(host), { timeout: 15000 });
      const before = await guest.evaluate(() => window.__phc.net().resyncs);
      tap.drop = true;
      await host.evaluate(() => { const s = window.__phc.getState(), c = Object.values(s.game.characters).find((x) => x.owner === s.me.id); window.__phc.act({ type: 'combat/say', charId: c.id, text: 'Eyes up.' }); });
      const hv = await v(host);
      // the tap drops the view of that action; only an answer to the guest's own check-in gets through (within 5 s)
      const ok = await guest.waitForFunction((hv) => window.__phc.getState().game.v >= hv, hv, { timeout: 15000 }).then(() => true, () => false);
      tap.drop = false;
      const n = await guest.evaluate(() => window.__phc.net());
      check(tap.dropped > 0, 'the view of the host\'s line was lost on the way (' + tap.dropped + ' dropped)');
      check(ok && n.resyncs > before, 'the guest caught up by its own check-in, nothing else happening in the room (host v' + hv + ', guest v' + n.v + ', resyncs ' + n.resyncs + ')');
      check(await guest.evaluate(() => JSON.stringify(window.__phc.getState().game).includes('Eyes up.')), 'the lost line is in the guest\'s game');
    }

    // ----- C. the fight to its end -----
    let stalled = false, acts = 0, attacks = 0, stress = 0;
    if (PARTS.includes('C')) {
      if (MODE === 'lossy') tap.lossy = 0.35;
      let lastKey = '', lastChange = Date.now();
      for (let i = 0; i < 3000; i++) {
        const raw = [await myTurn(host), await myTurn(guest)], states = raw.map((x) => x.split(':')[0]);
        if (states.includes('over')) break;
        if (raw.join() !== lastKey) { lastKey = raw.join(); lastChange = Date.now(); }
        if (Date.now() - lastChange > 45000) { stalled = true; log('STALL at loop', i, lastKey, 'after', acts, 'actions'); log('HOST', JSON.stringify(await books(host))); log('GUEST', JSON.stringify(await books(guest))); break; }
        for (const [k, p] of [[0, host], [1, guest]]) {
          if (states[k] !== 'mine') continue;
          if (!(await p.locator('text=ACTION POINTS').count())) { await settle(p, 200); continue; }
          // As a player: the action panel greys out while the other turns play, and takes no click until it is back.
          if (await p.evaluate(() => { const d = document.querySelector('.phc-cb-dock'); return d ? d.getAttribute('data-lock') || '' : 'none'; })) continue;
          await pickAction(p, /^(Shot|Strike)/, { timeout: 2000 }).catch(() => {});
          const conf = p.getByRole('button', { name: 'Confirm', exact: true });
          try { if (await conf.isEnabled({ timeout: 15000 })) { await conf.click({ timeout: 15000 }); attacks++; } else await p.getByRole('button', { name: 'End turn', exact: true }).click({ timeout: 15000 }); acts++; } catch (e) { log('      a click did not land (' + p.pname + '): ' + String(e.message).split('\n')[0]); }
          await settle(p, 60);
          // a long fight is not a stall: say once what it looks like (who is left, how far apart)
          if (acts === 40) log('      a long fight: ' + attacks + ' attacks in 40 actions · ' + JSON.stringify(await host.evaluate(() => { const cb = window.__phc.getState().game.combat; return { round: cb.round, units: cb.units.map((u) => u.name + ' ' + u.side + ' ' + u.pos + ' hp ' + u.hp + (u.dead ? ' dead' : u.downed ? ' downed' : '')) }; })));
          if (MODE === 'hide' && acts % 3 === 1) { const q = stress++ % 2 ? host : guest; await hide(q, true); await settle(q, 700 + (stress % 3) * 900); await hide(q, false); }
          if (MODE === 'offline' && acts % 4 === 1) { stress++; await guest.context().setOffline(true); await settle(guest, 1500 + (stress % 3) * 1500); await guest.context().setOffline(false); }
          if (MODE === 'reload' && acts % 5 === 2) { stress++; await guest.reload(); await guest.waitForFunction(() => { const g = window.__phc.getState().game; return !!(g && g.combat); }, null, { timeout: 20000 }).catch(() => {}); }
        }
        await settle(host, 80);
      }
      tap.lossy = 0;
      const end = [await books(host), await books(guest)];
      // the fight's last view may itself have been dropped: the guest's check-in brings it
      if (!stalled && end[0].over && !end[1].over) await guest.waitForFunction(() => { const cb = window.__phc.getState().game.combat; return !cb || cb.over; }, null, { timeout: 15000 }).catch(() => {});
      const gOver = await guest.evaluate(() => { const cb = window.__phc.getState().game.combat; return !cb || !!cb.over; });
      check(!stalled, 'the fight never stood still for 45 s');
      check(end[0].over && gOver, 'the fight ended on both screens (' + acts + ' actions, ' + stress + ' disturbances, ' + tap.dropped + ' views dropped, ' + Math.round((Date.now() - t0) / 1000) + ' s)');
      const fxEnd = [end[0].fx, (await books(guest)).fx];
      log('      the guest\'s view at the end: ' + (await guest.evaluate(() => JSON.stringify(window.__phc.getState().game).length)) + ' characters (the room drops a message over 2,000,000)');
      log('      screens settled by the way out: host ' + (fxEnd[0] ? fxEnd[0].settled : '?') + ', guest ' + (fxEnd[1] ? fxEnd[1].settled : '?') + '; guest resyncs ' + (await guest.evaluate(() => window.__phc.net().resyncs)));
      if (!stalled && !(end[0].over && gOver)) { log('HOST', JSON.stringify(end[0])); log('GUEST', JSON.stringify(await books(guest))); }
      if (stalled) failed = Math.max(failed, 1), process.exitCode = 2;
    }
    const errs = [...host.errors, ...guest.errors].filter((e) => !/WebSocket|ERR_INTERNET_DISCONNECTED|Failed to load resource|net::/.test(e));
    check(!errs.length, 'no page errors' + (errs.length ? ': ' + JSON.stringify(errs).slice(0, 600) : ''));
  } finally { await browser.close(); }
}

if (PARTS.includes('A')) await relay();
if (/[BC]/.test(PARTS)) await browsers();
log(failed ? 'RESULT FAIL (' + failed + ')' : 'RESULT OK');
process.exit(process.exitCode || (failed ? 1 : 0));

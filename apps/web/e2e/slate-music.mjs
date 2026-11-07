// The combat OST in the Proving Ground with two players (host + guest): a plain wave plays Gunline, a boss plays Heaven
// Falls, half the party Downed plays Last Rounds (both browsers show it), the squad is gearing up between fights with
// no fight music, and leaving the Proving Ground puts both players back on the room screen (not the title).
import { chromium, player, click, BASE, OUT, hostAs } from './lib.mjs';
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const browser = await chromium.launch();
const host = await player(browser, 'host'), guest = await player(browser, 'guest');
host.on('dialog', (d) => d.accept());
const fetched = []; host.on('response', (r) => { if (/\/music\/[a-z-]+\.mp3/.test(r.url())) fetched.push(r.url().split('/').pop() + ' ' + r.status()); }); guest.on('dialog', (d) => d.accept());
const act = (p, a) => p.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
const G = (p) => p.evaluate(() => window.__phc.getState().game);
async function create(page, name) {
  await click(page, 'Create a character');
  await page.getByPlaceholder('What the squad calls you').fill(name);
  await page.locator('main button[aria-pressed]').first().click();
  await click(page, 'Next ›'); await page.locator('button', { hasText: /^Use .* ›$/ }).first().click();
  await click(page, 'Next ›'); await click(page, 'Next ›'); await page.locator('button', { hasText: 'Line soldier' }).first().click(); await click(page, 'Next ›');
  await click(page, 'Lock in and bring to the room'); await page.waitForSelector('text=✓ LOCKED IN', { timeout: 10000 });
}
const music = (p) => p.locator('button[aria-label^="Music:"]').getAttribute('aria-label', { timeout: 500 }).catch(() => null);
const ostNow = (p) => p.evaluate(() => window.__phcOst?.now?.() ?? null);
const waitMusic = async (p, re, ms = 8000) => { const t = Date.now(); let m; while (Date.now() - t < ms) { m = await music(p); if (re.test(m || '')) return m; await p.waitForTimeout(250); } return m; };

await hostAs(host, 'Leon'); await host.waitForSelector('text=The squad', { timeout: 90000 });
const code = (await host.locator('text=/ROOM [A-Z0-9]{6}/').first().textContent()).match(/ROOM ([A-Z0-9]{6})/)[1];
await create(host, 'Anvil');
await guest.goto(BASE + '/?room=' + code); await guest.getByPlaceholder('Leon').fill('Mai'); await click(guest, 'Join ›', { timeout: 90000 });
await guest.waitForSelector('text=The squad'); await create(guest, 'Reed');
await host.waitForTimeout(600);
await host.getByRole('button', { name: /Proving Ground/ }).first().click();
await host.waitForFunction(() => window.__phc.getState().game?.sandbox?.state === 'ready', null, { timeout: 10000 });
await guest.waitForFunction(() => window.__phc.getState().game?.sandbox?.state === 'ready', null, { timeout: 10000 });
ok('both are gearing up on the map: host ' + await host.evaluate(() => window.__phc.getState().screen) + ', guest ' + await guest.evaluate(() => window.__phc.getState().screen),
  (await host.evaluate(() => window.__phc.getState().screen)) === 'main' && (await guest.evaluate(() => window.__phc.getState().screen)) === 'main');
ok('no fight music while gearing up: ' + await music(host), !/Gunline|Heaven Falls|Last Rounds/.test((await music(host)) || ''));
await act(host, { type: 'sandbox/ai', on: false });
// 1. a plain wave: Gunline (the NOW PLAYING card shows for 5 s after the change: watch for it from the start)
const cardSeen = host.locator('[role="status"]', { hasText: '♪ NOW PLAYING' }).filter({ hasText: 'Gunline' }).first().waitFor({ state: 'visible', timeout: 12000 }).then(() => true, () => false);
await act(host, { type: 'sandbox/fight' });
await host.waitForFunction(() => window.__phc.getState().screen === 'combat', null, { timeout: 10000 });
const m1 = await waitMusic(host, /Gunline/); const m1g = await waitMusic(guest, /Gunline/);
ok('wave 1 plays Gunline (host: ' + m1 + ', guest: ' + m1g + ')', /Gunline by Project Heaven Cry OST/.test(m1 || '') && /Gunline/.test(m1g || ''));
await host.waitForTimeout(400);
await host.screenshot({ path: OUT + 'slate-music-gunline.png' });
ok('the NOW PLAYING card named Gunline', await cardSeen);
// 2. stop, a boss on the map, fight: Heaven Falls
ok('stop the fight: ' + (await act(host, { type: 'sandbox/stop' }) || 'ok'), true);
await host.waitForFunction(() => window.__phc.getState().game.phase === 'story', null, { timeout: 8000 });
await act(host, { type: 'sandbox/clear' });
let err = null;
for (const at of ['M6', 'L6', 'N6', 'M8', 'L8', 'K6']) { err = await act(host, { type: 'sandbox/spawn', tier: 'boss', weapon: 'drifter_revolver', at }); if (!err) break; }
ok('a boss stands on the map' + (err ? ': ' + err : ''), !err);
await act(host, { type: 'sandbox/fight' });
await host.waitForFunction(() => window.__phc.getState().game.phase === 'combat', null, { timeout: 8000 });
const m2 = await waitMusic(host, /Heaven Falls/), m2g = await waitMusic(guest, /Heaven Falls/);
ok('a boss fight plays Heaven Falls (host: ' + m2 + ', guest: ' + m2g + ')', /Heaven Falls/.test(m2 || '') && /Heaven Falls/.test(m2g || ''));
await host.screenshot({ path: OUT + 'slate-music-heaven-falls.png' });
// 3. half the party Downed: Last Rounds. Friendly fire from whoever is up on the other PC until it drops.
for (let i = 0; i < 400; i++) {
  const g = await G(host), cb = g.combat; if (!cb || cb.over) break;
  const byName = (n) => cb.units.find((u) => u.side === 'pc' && g.characters[u.charId]?.name === n);
  const reed = byName('Reed'), anvil = byName('Anvil');
  if (reed.downed || reed.dead) break;
  const cur = cb.units.find((u) => u.id === cb.order[cb.turn]);
  if (!cur || cur.side !== 'pc') { await host.waitForTimeout(120); continue; }
  const who = cur.id === reed.id ? guest : host;
  let e = 'pass';
  if (cur.id === anvil.id && cur.ap >= 2) {
    if (cur.jammed) e = await act(who, { type: 'combat/clear', unitId: cur.id });
    else if (cur.ammo <= 0) e = await act(who, { type: 'combat/reload', unitId: cur.id });
    else e = await act(who, { type: 'combat/attack', unitId: cur.id, targetId: reed.id, mode: 'shot' });
  }
  if (e) await act(who, { type: 'combat/end-turn', unitId: cur.id });
  await host.waitForTimeout(40);
}
const g3 = await G(host); const reed3 = g3.combat.units.find((u) => u.side === 'pc' && g3.characters[u.charId]?.name === 'Reed');
ok('Reed is Downed by friendly fire (downed ' + reed3.downed + ', hp ' + reed3.hp + ')', reed3.downed || reed3.dead);
const m3 = await waitMusic(host, /Last Rounds/), m3g = await waitMusic(guest, /Last Rounds/);
ok('half the party down plays Last Rounds (host: ' + m3 + ', guest: ' + m3g + ')', /Last Rounds/.test(m3 || '') && /Last Rounds/.test(m3g || ''));
await host.waitForTimeout(500);
await host.screenshot({ path: OUT + 'slate-music-last-rounds.png' });
ok('the three OST files were fetched: ' + [...new Set(fetched)].join(', '), ['gunline', 'heaven-falls', 'last-rounds'].every((n) => fetched.some((f) => f.startsWith(n + '.mp3') && /20[06]$/.test(f))));
// 4. leave: both on the room screen
await act(host, { type: 'sandbox/stop' });
await host.waitForFunction(() => window.__phc.getState().game.phase === 'story', null, { timeout: 8000 });
await host.waitForTimeout(400);
const leave = host.getByRole('button', { name: 'Leave', exact: true });
if (await leave.count()) await leave.first().click(); else await host.evaluate(() => window.__phc.act({ type: 'sandbox/end' }));
await host.waitForFunction(() => window.__phc.getState().screen === 'room', null, { timeout: 8000 }).catch(() => {});
await guest.waitForFunction(() => window.__phc.getState().screen === 'room', null, { timeout: 8000 }).catch(() => {});
const hs = await host.evaluate(() => window.__phc.getState().screen), gs = await guest.evaluate(() => window.__phc.getState().screen);
ok('leaving the Proving Ground: host on ' + hs + ', guest on ' + gs, hs === 'room' && gs === 'room');
ok('the squad is the room\'s again: ' + Object.values((await G(host)).characters).map((c) => c.name).join(', '), Object.values((await G(host)).characters).length === 2);
await host.screenshot({ path: OUT + 'slate-music-room-host.png' }); await guest.screenshot({ path: OUT + 'slate-music-room-guest.png' });
// The room has no Music button (the lobby shows none), and the OST voice must be gone in both browsers.
ok('the room shows no Music button', (await host.locator('button[aria-label^="Music:"]').count()) === 0 && (await guest.locator('button[aria-label^="Music:"]').count()) === 0);
ok('the hook that reads the OST is there: ' + await host.evaluate(() => typeof window.__phcOst?.now), (await host.evaluate(() => typeof window.__phcOst?.now)) === 'function');
const quiet = async (p) => { const t = Date.now(); let n; while (Date.now() - t < 4000) { n = await ostNow(p); if (!n) return null; await p.waitForTimeout(200); } return n; };
const o4 = await quiet(host), o4g = await quiet(guest);
ok('no fight music back in the room (OST host: ' + (o4 || 'silent') + ', guest: ' + (o4g || 'silent') + ')', !o4 && !o4g);
ok('no page errors' + ([...host.errors, ...guest.errors].length ? ': ' + [...host.errors, ...guest.errors].join(' | ') : ''), ![...host.errors, ...guest.errors].length);
await browser.close();

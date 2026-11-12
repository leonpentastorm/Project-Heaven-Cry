// The combat OST in the Proving Ground with two players (host + guest): gearing up plays Gearing Up, a plain wave plays
// the fight's song (one of the pool of nine, the same in both browsers), the next plain fight another one, a boss plays
// Heaven Falls, half the party Downed plays Last Rounds (both browsers show it), Gearing Up is back between fights,
// and leaving the Proving Ground puts both players back on the room screen (not the title). The same alone from the
// title, and the song holding through a reload: music-pool.mjs.
import { chromium, player, click, BASE, OUT, hostAs, autoConfirm, pause } from './lib.mjs';
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const browser = await chromium.launch();
const host = await player(browser, 'host'), guest = await player(browser, 'guest');
await autoConfirm(host);
const fetched = []; host.on('response', (r) => { if (/\/music\/[a-z-]+\.mp3/.test(r.url())) fetched.push(r.url().split('/').pop() + ' ' + r.status()); }); guest.on('dialog', (d) => d.accept());
const act = (p, a) => p.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
const G = (p) => p.evaluate(() => window.__phc.getState().game);
async function create(page, name) {
  await click(page, 'Create a character');
  await page.getByPlaceholder('What the squad calls you').fill(name);
  await page.locator('main button[aria-pressed]').first().click();
  await click(page, 'Next ›'); await page.locator('button', { hasText: /^Use .* ›$/ }).first().click();
  await click(page, 'Next ›'); await click(page, 'Next ›'); await click(page, 'Next ›'); await page.locator('button', { hasText: 'Line soldier' }).first().click(); await click(page, 'Next ›');
  await click(page, 'Lock in and bring to the room'); await page.waitForSelector('text=✓ LOCKED IN', { timeout: 15000 });
}
const music = (p) => p.locator('button[aria-label^="Music:"]').getAttribute('aria-label', { timeout: 500 }).catch(() => null);
const ostNow = (p) => p.evaluate(() => window.__phcOst?.now?.() ?? null);
const POOL = { gunline: 'Gunline', brass_on_the_floor: 'Brass on the Floor', danger_close: 'Danger Close', flank_left: 'Flank Left', held_breath: 'Held Breath', hold_the_line: 'Hold the Line', line_of_four: 'Line of Four', mag_check: 'Mag Check', suppressing_fire: 'Suppressing Fire' };
const waitOst = async (p, id, ms = 8000) => { const t = Date.now(); let o; while (Date.now() - t < ms) { o = await ostNow(p); if (o === id) return o; await pause(p, 200); } return o; };
const waitMusic = async (p, re, ms = 8000) => { const t = Date.now(); let m; while (Date.now() - t < ms) { m = await music(p); if (re.test(m || '')) return m; await pause(p, 250); } return m; };

await hostAs(host, 'Leon'); await host.waitForSelector('text=The squad', { timeout: 90000 });
const code = (await host.locator('text=/ROOM [A-Z0-9]{6}/').first().textContent()).match(/ROOM ([A-Z0-9]{6})/)[1];
await create(host, 'Anvil');
await guest.goto(BASE + '/?room=' + code); await guest.getByPlaceholder('Leon').fill('Mai'); await click(guest, 'Join ›', { timeout: 90000 });
await guest.waitForSelector('text=The squad'); await create(guest, 'Reed');
await pause(host, 600);
await host.getByRole('button', { name: /Proving Ground/ }).first().click();
await host.waitForFunction(() => window.__phc.getState().game?.sandbox?.state === 'ready', null, { timeout: 15000 });
await guest.waitForFunction(() => window.__phc.getState().game?.sandbox?.state === 'ready', null, { timeout: 15000 });
ok('both are gearing up on the map: host ' + await host.evaluate(() => window.__phc.getState().screen) + ', guest ' + await guest.evaluate(() => window.__phc.getState().screen),
  (await host.evaluate(() => window.__phc.getState().screen)) === 'main' && (await guest.evaluate(() => window.__phc.getState().screen)) === 'main');
// 0. gearing up: Gearing Up, in both browsers (the label, and the track each page's player holds)
{ const m0 = await waitMusic(host, /Gearing Up/), m0g = await waitMusic(guest, /Gearing Up/);
  ok('gearing up plays Gearing Up (host: ' + m0 + ', guest: ' + m0g + ')', /Gearing Up by Project Heaven Cry OST/.test(m0 || '') && /Gearing Up by Project Heaven Cry OST/.test(m0g || ''));
  ok('both pages hold the gearing-up track (host: ' + await waitOst(host, 'gearing_up') + ', guest: ' + await waitOst(guest, 'gearing_up') + ')', (await ostNow(host)) === 'gearing_up' && (await ostNow(guest)) === 'gearing_up'); }
await host.screenshot({ path: OUT + 'slate-music-gearing-up.png' });
await act(host, { type: 'sandbox/ai', on: false });
// 1. a plain wave: the fight's song, one of the pool (the NOW PLAYING card shows for 5 s after the change: watch for it from the start)
const cardSeen = host.locator('[role="status"]', { hasText: '♪ NOW PLAYING' }).filter({ hasText: new RegExp(Object.values(POOL).join('|')) }).first().waitFor({ state: 'visible', timeout: 15000 }).then(() => true, () => false);
await act(host, { type: 'sandbox/fight' });
await host.waitForFunction(() => window.__phc.getState().screen === 'combat', null, { timeout: 15000 });
const song1 = (await G(host)).combat.song, title1 = POOL[song1], re1 = new RegExp('^Music: ' + title1 + ' by Project Heaven Cry OST');
ok('wave 1 has a song of the pool: ' + song1 + ' (the guest\'s state: ' + (await G(guest)).combat?.song + ')', !!title1 && (await G(guest)).combat?.song === song1);
const m1 = await waitMusic(host, re1); const m1g = await waitMusic(guest, re1);
ok('wave 1 plays ' + title1 + ' in both browsers (host: ' + m1 + ', guest: ' + m1g + ')', re1.test(m1 || '') && re1.test(m1g || ''));
ok('both pages hold that track (host: ' + await waitOst(host, song1) + ', guest: ' + await waitOst(guest, song1) + ')', (await ostNow(host)) === song1 && (await ostNow(guest)) === song1);
await pause(host, 400);
await host.screenshot({ path: OUT + 'slate-music-fight-song.png' });
ok('the NOW PLAYING card named the fight\'s song', await cardSeen);
// 1b. stop: Gearing Up is back; the next plain fight plays another song of the pool
ok('stop the fight: ' + (await act(host, { type: 'sandbox/stop' }) || 'ok'), true);
await host.waitForFunction(() => window.__phc.getState().game.phase === 'story', null, { timeout: 15000 });
{ const b = await waitMusic(host, /Gearing Up/), bg = await waitMusic(guest, /Gearing Up/);
  ok('between fights Gearing Up is back (host: ' + b + ', guest: ' + bg + ')', /Gearing Up/.test(b || '') && /Gearing Up/.test(bg || '') && (await waitOst(host, 'gearing_up')) === 'gearing_up'); }
await act(host, { type: 'sandbox/fight' });
await host.waitForFunction(() => window.__phc.getState().game.phase === 'combat' && !!window.__phc.getState().game.combat?.song, null, { timeout: 15000 });
{ const song2 = (await G(host)).combat.song, re2 = new RegExp('^Music: ' + POOL[song2] + ' by Project Heaven Cry OST');
  const m = await waitMusic(host, re2), mg = await waitMusic(guest, re2);
  ok('the second fight plays another song of the pool: ' + song2 + ' after ' + song1 + ' (host: ' + m + ', guest: ' + mg + ')', !!POOL[song2] && song2 !== song1 && re2.test(m || '') && re2.test(mg || '')); }
// 2. stop, a boss on the map, fight: Heaven Falls
ok('stop the fight: ' + (await act(host, { type: 'sandbox/stop' }) || 'ok'), true);
await host.waitForFunction(() => window.__phc.getState().game.phase === 'story', null, { timeout: 15000 });
await act(host, { type: 'sandbox/clear' });
let err = null;
for (const at of ['M6', 'L6', 'N6', 'M8', 'L8', 'K6']) { err = await act(host, { type: 'sandbox/spawn', tier: 'boss', weapon: 'drifter_revolver', at }); if (!err) break; }
ok('a boss stands on the map' + (err ? ': ' + err : ''), !err);
await act(host, { type: 'sandbox/fight' });
await host.waitForFunction(() => window.__phc.getState().game.phase === 'combat' && !!window.__phc.getState().game.combat?.song, null, { timeout: 15000 });
// Rules 1.16 (the 26 × 26 ground: the sides start 10 to 14 tiles apart): that boss begins in the fog of war, and until
// the party has seen it neither the track nor its label gives it away (packages/engine/src/music.ts fightTheme).
const bossSeen = () => host.evaluate(() => { const cb = window.__phc.getState().game.combat; return !!cb && cb.units.some((u) => u.side === 'foe' && u.tier === 'boss' && !u.dead && (cb.sighted || []).includes(u.id)); });
if (!(await bossSeen())) {
  const mf = await waitMusic(host, /by Project Heaven Cry OST/), mfg = await waitMusic(guest, /by Project Heaven Cry OST/);
  ok('a boss still in the fog gives nothing away: the fight plays a song of the pool (host: ' + mf + ', guest: ' + mfg + ')', !!mf && !!mfg && !/Heaven Falls|boss/i.test(mf + mfg));
  // Then the party sees one: a boss placed beside the host's fighter (the tools, mid-fight).
  const beside = await host.evaluate(() => { const g = window.__phc.getState().game, cb = g.combat, m = cb.map, me = cb.units.find((u) => u.side === 'pc' && !u.dead), [x, y] = me.pos.split(',').map(Number);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1], [2, 0], [-2, 0], [0, 2], [0, -2]]) {
      const k = (x + dx) + ',' + (y + dy); if (x + dx < 0 || y + dy < 0 || x + dx >= m.w || y + dy >= m.h) continue;
      if ((m.solid || []).includes(k) || cb.units.some((u) => !u.dead && u.pos === k) || (cb.objects || []).some((o) => o.pos === k)) continue;
      return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[x + dx] + (y + dy + 1); } return null; });
  const e2 = beside ? await act(host, { type: 'sandbox/spawn', tier: 'boss', weapon: 'fists', at: beside }) : 'no free tile';
  const seenNow = await host.waitForFunction(() => { const cb = window.__phc.getState().game.combat; return cb.units.some((u) => u.side === 'foe' && u.tier === 'boss' && (cb.sighted || []).includes(u.id)); }, null, { timeout: 15000 }).then(() => true, () => false);
  ok('a boss steps into the party\'s sight (' + (e2 || 'placed at ' + beside) + ')', !e2 && seenNow);
}
const m2 = await waitMusic(host, /Heaven Falls/), m2g = await waitMusic(guest, /Heaven Falls/);
ok('a boss fight plays Heaven Falls (host: ' + m2 + ', guest: ' + m2g + ')', /Heaven Falls/.test(m2 || '') && /Heaven Falls/.test(m2g || ''));
// The label never gives away a hostile the party hasn't seen: "Fight: a boss" only once the boss is in cb.sighted.
{ const g2 = await G(host), seen = g2.combat.units.some((u) => u.side === 'foe' && u.tier === 'boss' && (g2.combat.sighted || []).includes(u.id));
  const card = async (p) => (await p.locator('[role="status"]', { hasText: '♪ NOW PLAYING' }).filter({ hasText: 'Heaven Falls' }).first().textContent({ timeout: 3000 }).catch(() => '')) || '';
  const ch = await card(host), cg = await card(guest);
  ok('the card names the boss only once the party has seen it (seen ' + seen + '; host: ' + ch + ' | guest: ' + cg + ')', ch && cg && (seen ? /Fight: a boss/.test(ch) && /Fight: a boss/.test(cg) : !/boss/.test(ch + cg))); }
await host.screenshot({ path: OUT + 'slate-music-heaven-falls.png' });
// 3. half the party Downed: Last Rounds. Friendly fire from whoever is up on the other PC until it drops.
for (let i = 0; i < 400; i++) {
  const g = await G(host), cb = g.combat; if (!cb || cb.over) break;
  const byName = (n) => cb.units.find((u) => u.side === 'pc' && g.characters[u.charId]?.name === n);
  const reed = byName('Reed'), anvil = byName('Anvil');
  if (reed.downed || reed.dead) break;
  const cur = cb.units.find((u) => u.id === cb.order[cb.turn]);
  if (!cur || cur.side !== 'pc') { await pause(host, 120); continue; }
  const who = cur.id === reed.id ? guest : host;
  let e = 'pass';
  if (cur.id === anvil.id && cur.ap >= 2) {
    if (cur.jammed) e = await act(who, { type: 'combat/clear', unitId: cur.id });
    else if (cur.ammo <= 0) e = await act(who, { type: 'combat/reload', unitId: cur.id });
    else e = await act(who, { type: 'combat/attack', unitId: cur.id, targetId: reed.id, mode: 'shot' });
  }
  if (e) await act(who, { type: 'combat/end-turn', unitId: cur.id });
  await pause(host, 40);
}
const g3 = await G(host); const reed3 = g3.combat.units.find((u) => u.side === 'pc' && g3.characters[u.charId]?.name === 'Reed');
ok('Reed is Downed by friendly fire (downed ' + reed3.downed + ', hp ' + reed3.hp + ')', reed3.downed || reed3.dead);
const m3 = await waitMusic(host, /Last Rounds/), m3g = await waitMusic(guest, /Last Rounds/);
ok('half the party down plays Last Rounds (host: ' + m3 + ', guest: ' + m3g + ')', /Last Rounds/.test(m3 || '') && /Last Rounds/.test(m3g || ''));
await pause(host, 500);
await host.screenshot({ path: OUT + 'slate-music-last-rounds.png' });
ok('the OST files were fetched: ' + [...new Set(fetched)].join(', '), ['gearing-up', song1.replace(/_/g, '-'), 'heaven-falls', 'last-rounds'].every((n) => fetched.some((f) => f.startsWith(n + '.mp3') && /20[06]$/.test(f))));
// 4. leave: both on the room screen
await act(host, { type: 'sandbox/stop' });
await host.waitForFunction(() => window.__phc.getState().game.phase === 'story', null, { timeout: 15000 });
await pause(host, 400);
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
const quiet = async (p) => { const t = Date.now(); let n; while (Date.now() - t < 4000) { n = await ostNow(p); if (!n) return null; await pause(p, 200); } return n; };
const o4 = await quiet(host), o4g = await quiet(guest);
ok('no fight music back in the room (OST host: ' + (o4 || 'silent') + ', guest: ' + (o4g || 'silent') + ')', !o4 && !o4g);
ok('no page errors' + ([...host.errors, ...guest.errors].length ? ': ' + [...host.errors, ...guest.errors].join(' | ') : ''), ![...host.errors, ...guest.errors].length);
await browser.close();

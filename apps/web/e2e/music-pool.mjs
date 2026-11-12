// The fight's song and Gearing Up (spec: Music) in the Proving Ground, alone from the title: Gearing Up plays (and is
// the track the page's player holds) while the squad is gearing up; a fight plays one of the pool's nine songs, the
// same one for the whole fight (a reload of the page keeps it); stopping the fight brings Gearing Up back; the next
// fight plays another song of the pool, and so does every one after it; the Credits page lists all nine new tracks.
// Screenshots land in e2e/shots/music-pool-*.png.
import { chromium, player, click, BASE, OUT, autoConfirm, settle } from './lib.mjs';
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const POOL = { gunline: 'Gunline', brass_on_the_floor: 'Brass on the Floor', danger_close: 'Danger Close', flank_left: 'Flank Left', held_breath: 'Held Breath', hold_the_line: 'Hold the Line', line_of_four: 'Line of Four', mag_check: 'Mag Check', suppressing_fire: 'Suppressing Fire' };
const NEW = [...Object.values(POOL).filter((t) => t !== 'Gunline'), 'Gearing Up'];
const browser = await chromium.launch();
const p = await player(browser, 'host');
await autoConfirm(p);
const fetched = []; p.on('response', (r) => { if (/\/music\/[a-z-]+\.mp3/.test(r.url())) fetched.push(r.url().split('/').pop() + ' ' + r.status()); });
const act = (a) => p.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
const G = () => p.evaluate(() => window.__phc.getState().game);
const label = () => p.locator('button[aria-label^="Music:"]').getAttribute('aria-label', { timeout: 500 }).catch(() => null);
const ostNow = () => p.evaluate(() => window.__phcOst?.now?.() ?? null);
/** Wait until the Music button names `title` and the page's player holds the track `id`. */
const playing = async (title, id, ms = 10000) => { const t = Date.now(); let m, o; while (Date.now() - t < ms) { m = await label(); o = await ostNow(); if ((m || '').includes(title + ' by Project Heaven Cry OST') && o === id) return { m, o, ok: true }; await settle(p, 200); } return { m, o, ok: false }; };

// 0. The Credits page (on the title) lists the nine new tracks, and never the book-keeping "(ingame)".
await p.goto(BASE);
await click(p, 'CREDITS', { exact: true }).catch(() => {});
await p.getByRole('heading', { name: 'Credits' }).waitFor({ timeout: 20000 }).catch(() => {});
await settle(p, 300);
const creditsText = await p.locator('body').innerText();
ok('the Credits page lists all nine new tracks' + (NEW.every((t) => creditsText.includes(t + ' (')) ? '' : ': missing ' + NEW.filter((t) => !creditsText.includes(t + ' (')).join(', ')), NEW.every((t) => creditsText.includes(t + ' (')));
ok('no "(ingame)" anywhere on it', !/ingame/i.test(creditsText));
await p.screenshot({ path: OUT + 'music-pool-credits.png' });
await p.goto(BASE);

// 1. From the title, alone: gearing up plays Gearing Up
await click(p, 'PROVING GROUND');
const nm = p.getByPlaceholder('Leon');
await Promise.race([nm.waitFor({ timeout: 20000 }).catch(() => {}), p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 20000 }).catch(() => {})]);
if (await nm.count()) { await nm.fill('Leon'); await click(p, 'Solo ›'); }
await p.waitForFunction(() => window.__phc.getState().game?.sandbox?.state === 'ready', null, { timeout: 30000 });
await p.mouse.move(1430, 990);
let g = await G();
ok('alone in the Proving Ground, gearing up (phase ' + g.phase + ', standalone ' + !!g.sandbox.standalone + ')', g.phase === 'story' && !g.combat && !!g.sandbox.standalone);
let r = await playing('Gearing Up', 'gearing_up');
ok('gearing up plays Gearing Up (button: ' + r.m + '; player: ' + r.o + ')', r.ok);
// The panel names it and why.
await p.locator('button[aria-label^="Music:"]').click();
const panel = p.locator('[role="dialog"][aria-label="Music"]');
const panelText = await panel.innerText().catch(() => '');
ok('the music panel names Gearing Up, the OST and "Proving Ground: gearing up"', /Gearing Up/.test(panelText) && /Project Heaven Cry OST/.test(panelText) && /Proving Ground: gearing up/.test(panelText));
await p.screenshot({ path: OUT + 'music-pool-gearing-up.png' });
await p.locator('button[aria-label^="Music:"]').click();
await act({ type: 'sandbox/ai', on: false });

// 2. A fight plays one of the pool; it is that fight's song to the end
const fight = async (n) => {
  const e = await act({ type: 'sandbox/fight' }); if (e) ok('fight ' + n + ' starts: ' + e, false);
  await p.waitForFunction(() => window.__phc.getState().game?.phase === 'combat' && !!window.__phc.getState().game.combat?.song, null, { timeout: 30000 });
  const g = await G(), song = g.combat.song, title = POOL[song];
  ok('fight ' + n + ': the engine picked a song of the pool (' + song + ')', !!title);
  const r = await playing(title || '?', song);
  ok('fight ' + n + ' plays ' + title + ' (button: ' + r.m + '; player: ' + r.o + ')', r.ok);
  return song;
};
const stop = async () => {
  await act({ type: 'sandbox/stop' });
  await p.waitForFunction(() => window.__phc.getState().game?.phase === 'story', null, { timeout: 30000 });
  const r = await playing('Gearing Up', 'gearing_up');
  ok('the fight over, Gearing Up is back (button: ' + r.m + '; player: ' + r.o + ')', r.ok);
};
const s1 = await fight(1);
await p.screenshot({ path: OUT + 'music-pool-fight-1.png' });
// The song holds while the fight goes on: turns pass, and the pick is still the same in the state and in the player.
for (let i = 0; i < 3; i++) { const g = await G(), cb = g.combat; if (!cb || cb.over) break; const cur = cb.units.find((u) => u.id === cb.order[cb.turn]); if (cur?.side === 'pc') await act({ type: 'combat/end-turn', unitId: cur.id }); await settle(p, 300); }
g = await G();
ok('turns later it is the same song (state ' + g.combat?.song + ', player ' + await ostNow() + ')', g.combat?.song === s1 && (await ostNow()) === s1);
// A reload of the page (a reconnect): the same fight, the same song.
await p.reload();
await p.waitForFunction(() => window.__phc?.getState().game?.phase === 'combat', null, { timeout: 30000 }).catch(() => {});
g = await G();
ok('after a reload the fight still has its song (' + g?.combat?.song + ')', g?.combat?.song === s1);
// The browser starts sound again only after a click, and a click is heard only once the fight's screen is drawn again
// (the state is back before the screen is: a click sent then went to an empty page, and no song ever started).
await p.waitForFunction(() => window.__phc?.getState().screen === 'combat' && !!document.querySelector('.phc-grid button.phc-tok') && !!document.querySelector('button[aria-label^="Music:"]'), null, { timeout: 60000 }).catch(() => {});
for (let i = 0; i < 3; i++) { await p.mouse.click(700, 500).catch(() => {}); r = await playing(POOL[s1], s1, 12000); if (r.ok) break; }
ok('and the page plays it again (button: ' + r.m + '; player: ' + r.o + ')', r.ok);
await stop();

// 3. The next fights: each another song than the one before
const songs = [s1];
for (let n = 2; n <= 5; n++) { const s = await fight(n); ok('fight ' + n + ' (' + s + ') differs from fight ' + (n - 1) + ' (' + songs[songs.length - 1] + ')', s !== songs[songs.length - 1]); songs.push(s); await stop(); }
ok('the songs played: ' + songs.join(', '), new Set(songs).size >= 2);
const want = ['gearing-up', ...new Set(songs.map((s) => s.replace(/_/g, '-')))];
ok('their files were fetched: ' + [...new Set(fetched)].join(', '), want.every((n) => fetched.some((f) => f.startsWith(n + '.mp3') && /20[06]$/.test(f))));
ok('no page errors' + (p.errors.length ? ': ' + p.errors.join(' | ') : ''), !p.errors.length);
await browser.close();

// The title screen (docs/design/title-screen.md): press any key, the menu, Wick runs to the hovered item, a press
// plays Wick's hello and slides on, Escape comes back, and reduce motion turns the running off.
import { chromium, OUT, BASE, pause, titleHoverDuringHello, watch, watchedGone } from './lib.mjs';
const SHOTS = process.env.SHOTS || OUT;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage(), errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/Permissions policy/.test(m.text())) errors.push(m.text()); });
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };

await page.goto(BASE);
await page.waitForSelector('text=PRESS ANY KEY', { timeout: 90000 });
ok('no header bar on the title', await page.locator('header').count() === 0);
await page.screenshot({ path: SHOTS + '/title-press.png' });
await page.keyboard.press('Space');
await page.waitForSelector('nav[aria-label="Main menu"] button', { timeout: 30000 });
await pause(page, 600);
const labels = await page.locator('nav[aria-label="Main menu"] [data-item] .phc-label').allTextContents();
ok('menu: ' + labels.join(' / '), labels.includes('NEW GAME') && labels.includes('JOIN A FRIEND') && labels.includes('CHARACTERS') && labels.includes('SETTINGS') && labels.includes('CREDITS'));
// Classes 3.0 step 10b: M813 is off the menu, so the Proving Ground is the first thing offered (after CONTINUE, when
// there is a room to continue), and nothing on the title names M813.
const firstPlay = labels.filter((l) => l !== 'CONTINUE')[0];
ok('the first thing offered is the Proving Ground (' + firstPlay + '), before NEW GAME', firstPlay === 'PROVING GROUND' && labels.indexOf('PROVING GROUND') < labels.indexOf('NEW GAME'));
const menuText = (await page.locator('nav[aria-label="Main menu"]').textContent()) || '';
ok('the menu names no M813', !/M813|Last Ship/i.test(menuText));
await page.screenshot({ path: SHOTS + '/title-menu.png' });
const wickTop = () => page.locator('.phc-wick').evaluate((el) => parseFloat(el.style.top));
const t0 = await wickTop();
await page.mouse.move(700, 450);
// (Wick runs for a third of a second: a watcher in the page notes it, started before the pointer moves; lib.mjs watch())
await watch(page, 'run', '.phc-wick.run');
await page.getByRole('button', { name: 'SETTINGS', exact: true }).hover();
const ran = await watchedGone(page, 'run', 30000);
ok('Wick runs while moving to the hovered item (' + (ran && ran.ms) + ' ms)', !!ran && ran.up != null);
await page.waitForFunction((t) => parseFloat(document.querySelector('.phc-wick').style.top) > t, t0, { timeout: 30000 }).catch(() => {});
ok('Wick arrives beside SETTINGS', (await wickTop()) > t0);
await page.screenshot({ path: SHOTS + '/title-menu.png' });
await page.keyboard.press('ArrowUp');
await pause(page, 400);
ok('arrow keys move the selection', (await page.locator('.phc-item.on .phc-label').textContent()) !== 'SETTINGS');
// hover keeps working on other rows while Wick says hello (the press still opens the pressed row): lib.mjs
// titleHoverDuringHello presses, moves the pointer and watches from inside the page (the hello lasts under a second).
const hl = await titleHoverDuringHello(page), rows = hl.seen || {};
ok('the press shows Wick saying hello (bubble ' + rows.bubble + ')', rows.bubble === 1);
await page.screenshot({ path: SHOTS + '/title-hello.png' }).catch(() => {});
ok('hover during hello highlights another row (' + JSON.stringify(rows) + ')', rows.on === 'settings' && rows.pressed === 'chars');
await page.waitForSelector('text=Your characters', { timeout: 30000 });
ok('then the Characters screen slides in', true);
await page.screenshot({ path: SHOTS + '/title-characters.png' });
await page.keyboard.press('Escape');
await page.waitForSelector('nav[aria-label="Main menu"]', { timeout: 30000 });
ok('Escape comes back to the menu', await page.locator('text=Your characters').count() === 0);
await page.getByRole('button', { name: 'CREDITS', exact: true }).click();
await page.waitForSelector('text=Shadows and Dust', { timeout: 30000 });
ok('credits list the music', true);
await page.keyboard.press('Escape');
// reduce motion: no running
await page.getByRole('button', { name: 'SETTINGS', exact: true }).click();
// Settings is the shared body (game/settings.tsx, UI pass): Reduce motion is on its Display tab.
await page.getByRole('tab', { name: 'Display' }).click();
await page.getByLabel('Reduce motion (no parallax, no running)').check();
await page.keyboard.press('Escape');
await pause(page, 300);
await page.getByRole('button', { name: 'CREDITS', exact: true }).hover();
await pause(page, 60);
ok('reduce motion: Wick does not run', await page.locator('.phc-wick.run').count() === 0);
// a ?room= link opens straight on Join
const p2 = await ctx.newPage(); await p2.goto(BASE + '/?room=ABC123'); await p2.waitForSelector('text=PRESS ANY KEY', { timeout: 90000 }); await p2.keyboard.press('Enter'); // (90 s: a fresh page's first screen took over 30 s beside other suites, load 35)
await p2.waitForSelector('text=Join a friend', { timeout: 30000 });
ok('a room link opens on Join with the code filled', (await p2.getByPlaceholder('ROOM CODE').inputValue()) === 'ABC123');
await p2.setViewportSize({ width: 390, height: 844 }); await p2.keyboard.press('Escape'); await pause(p2, 500);
await p2.screenshot({ path: SHOTS + '/title-phone.png' });
// Classes 3.0 step 10b: NEW GAME's room offers no M813 and does not start on it (the Narrator's own start instead).
{
  const c3 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await c3.addInitScript(() => { try { sessionStorage.setItem('phc.pressedAnyKey', '1'); localStorage.setItem('phc.tips', '["*"]'); } catch { /* */ } });
  const p3 = await c3.newPage(); await p3.goto(BASE);
  await p3.getByRole('button', { name: 'NEW GAME', exact: true }).first().waitFor({ timeout: 90000 });
  await p3.getByRole('button', { name: 'NEW GAME', exact: true }).first().click();
  await p3.getByPlaceholder('Leon').fill('Leon');
  await p3.getByRole('button', { name: 'Open a room ›' }).first().click();
  await p3.waitForFunction(() => window.__phc?.getState().screen === 'room', null, { timeout: 60000 });
  const start = await p3.evaluate(() => window.__phc.getState().game.settings.start);
  const roomText = (await p3.locator('#root').textContent()) || '';
  ok('a new room starts on ' + start + ', not M813, and its start list names no M813', start !== 'm813' && !/M813|The Last Ship Out/.test(roomText));
  await p3.screenshot({ path: SHOTS + '/title-room-no-m813.png' });
  await c3.close();
}
// The title comes up at once (title-screen.md section 8; it took 14 to 25 s on the live site, waiting for about 880
// images): on a cold cache with the network slowed (every picture held 800 ms, plus a slow link), the main menu answers
// a click within 5 s, before the art has finished loading; the title's own layers then land and the rest keeps coming.
{
  const c4 = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await c4.addInitScript(() => { try { sessionStorage.setItem('phc.pressedAnyKey', '1'); localStorage.setItem('phc.tips', '["*"]'); } catch { /* */ } });
  const p4 = await c4.newPage(), cdp = await c4.newCDPSession(p4);
  await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 60, downloadThroughput: (40 * 1024 * 1024) / 8, uploadThroughput: (5 * 1024 * 1024) / 8 });
  await p4.route(/\/assets\/[^/?]+\.(webp|png|jpe?g)(\?.*)?$/, async (r) => { await new Promise((res) => setTimeout(res, 800)); await r.continue().catch(() => {}); });
  const t0 = Date.now();
  await p4.goto(BASE, { waitUntil: 'commit' });
  const btn = p4.getByRole('button', { name: 'NEW GAME', exact: true }).first();
  await btn.waitFor({ timeout: 60000 }).catch(() => {});
  const clickable = await btn.click({ trial: true, timeout: 60000 }).then(() => true, () => false), ms = Date.now() - t0;
  const pre = await p4.evaluate(() => ({ ...(window.__phcPreload || {}) }));
  ok('cold cache, slow network: the main menu answers a click in ' + ms + ' ms (5,000 or less)', clickable && ms <= 5000);
  ok("… before the title's own art has loaded (" + pre.done + ' of ' + (pre.first || 0) + ' pictures in)', pre.first > 0 && pre.done < pre.first);
  await pause(p4, 600); await p4.screenshot({ path: SHOTS + '/title-cold.png' }); // (once the menu has slid in)
  const landed = await p4.waitForFunction(() => { const im = [...document.querySelectorAll('img.phc-layer-img')]; return im.length > 0 && im.every((x) => x.complete && x.naturalWidth > 0); }, null, { timeout: 30000 }).then(() => true, () => false);
  ok('the title\'s own layers land and swap in', landed);
  // The roadmap's preloader: nothing else before the page has loaded, then only the next screens' art (the lobby's and
  // creation's), never the whole library (3,000 files).
  await p4.waitForFunction(() => window.__phcPreload?.ready && window.__phcPreload.done > window.__phcPreload.first, null, { timeout: 30000 }).catch(() => {});
  const later = await p4.evaluate(() => ({ ...(window.__phcPreload || {}) }));
  ok("after the page has loaded, the next screens' art loads behind the title (" + pre.done + ' then ' + later.done + ')', later.ready && later.done > pre.done);
  ok("… only the next screens' art (" + later.rest + ' files queued, not the whole library)', later.rest > 0 && later.rest < 800);
  await c4.close();
}
console.log('errors', errors);
await browser.close();

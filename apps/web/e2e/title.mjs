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
await page.waitForSelector('text=PRESS ANY KEY');
ok('no header bar on the title', await page.locator('header').count() === 0);
await page.screenshot({ path: SHOTS + '/title-press.png' });
await page.keyboard.press('Space');
await page.waitForSelector('nav[aria-label="Main menu"] button', { timeout: 30000 });
await pause(page, 600);
const labels = await page.locator('nav[aria-label="Main menu"] [data-item] .phc-label').allTextContents();
ok('menu: ' + labels.join(' / '), labels.includes('NEW GAME') && labels.includes('JOIN A FRIEND') && labels.includes('CHARACTERS') && labels.includes('SETTINGS') && labels.includes('CREDITS'));
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
const p2 = await ctx.newPage(); await p2.goto(BASE + '/?room=ABC123'); await p2.waitForSelector('text=PRESS ANY KEY'); await p2.keyboard.press('Enter');
await p2.waitForSelector('text=Join a friend', { timeout: 30000 });
ok('a room link opens on Join with the code filled', (await p2.getByPlaceholder('ROOM CODE').inputValue()) === 'ABC123');
await p2.setViewportSize({ width: 390, height: 844 }); await p2.keyboard.press('Escape'); await pause(p2, 500);
await p2.screenshot({ path: SHOTS + '/title-phone.png' });
console.log('errors', errors);
await browser.close();

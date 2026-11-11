// The combat map's size (Proving Ground fight, no Narrator; the map is 26 x 26 since rules 1.16). The default is the
// usual size: the tiles are as big as a 16 x 11 map's were when it was fitted to the window, at 1280×720, 1600×900,
// 1920×1080 and 2560×1440 (bigger on big screens, never pushing the action zone below its minimum), and the map
// scrolls inside its window (the camera: apps/web/e2e/camera.mjs). − / + / 100% / Usual size, the − and + keys and
// Ctrl + wheel over the map; a size the player picked is kept after a reload. Screenshots with SHOTS=dir: mapzoom-*.png.
import { chromium, click, BASE } from './lib.mjs';
const browser = await chromium.launch();
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const SHOTS = process.env.SHOTS;
const act = (p, a) => p.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);

const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
await ctx.addInitScript(() => { try { localStorage.setItem('phc.voice', JSON.stringify({ auto: false })); localStorage.setItem('phc.tips', '["*"]'); sessionStorage.setItem('phc.pressedAnyKey', '1'); } catch { /* */ } });
const p = await ctx.newPage();
const errors = []; p.on('pageerror', (e) => errors.push(e.message));
await p.goto(BASE);
await click(p, 'PROVING GROUND', { timeout: 90000 });
const nm = p.getByPlaceholder('Leon');
await Promise.race([nm.waitFor({ timeout: 8000 }).catch(() => {}), p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 8000 }).catch(() => {})]);
if (await nm.count()) { await nm.fill('Leon'); await click(p, 'Solo ›'); }
await p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 15000 });
await act(p, { type: 'sandbox/ai', on: false });
await act(p, { type: 'sandbox/fight' });
await p.waitForFunction(() => window.__phc.getState().screen === 'combat', null, { timeout: 15000 });
await p.waitForTimeout(2200);
const calm = async () => { for (let i = 0; i < 4 && (await p.locator('[data-phc-cutin]').count()); i++) { await p.keyboard.press('Escape'); await p.waitForTimeout(450); } };
await calm();

const zoom = () => p.evaluate(() => Number(getComputedStyle(document.querySelector('.phc-grid')).zoom) || 1);
const pct = () => p.locator('.phc-mz-pct').textContent();
const state = () => p.evaluate(() => { const g = document.querySelector('.phc-grid').getBoundingClientRect(), z = document.querySelector('.phc-cb-left').getBoundingClientRect(), a = document.querySelector('.phc-cb-aside')?.getBoundingClientRect(), s = document.querySelector('.phc-grid-scroll'), sr = s.getBoundingClientRect(), t = document.querySelector('.phc-grid button.phc-tok').getBoundingClientRect();
  return { gridW: g.width, gridH: g.height, viewBottom: sr.bottom, viewW: s.clientWidth, viewH: s.clientHeight, scrolls: s.scrollWidth > s.clientWidth && s.scrollHeight > s.clientHeight, tile: t.width, zoneW: z.width, asideW: a ? a.width : 0, vh: innerHeight, pageScroll: document.documentElement.scrollHeight - innerHeight }; });
const autoBtn = () => p.locator('.phc-mapzoom .phc-mz-auto');
// What a 16 x 11 map fitted to this room came to (the size players know): the map's window is that many tiles.
const tilesShown = (s) => [s.viewW / (s.tile * 48 / 46), s.viewH / (s.tile * 48 / 46)];

// 1. The usual size at four resolutions: the tiles a 16 x 11 map had; the 26 x 26 map scrolls in its window.
ok('the toolbar is there, Usual size on', (await autoBtn().getAttribute('aria-pressed')) === 'true');
const seen = [];
for (const [w, h] of [[1280, 720], [1600, 900], [1920, 1080], [2560, 1440]]) {
  await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(700);
  const z = await zoom(), s = await state(); seen.push(z);
  const [tw, th] = tilesShown(s);
  ok(`the usual size at ${w}×${h}: ${Math.round(z * 100)}% (a tile ${s.tile.toFixed(0)} px); the map's window shows ${tw.toFixed(1)} × ${th.toFixed(1)} tiles and fits the window height, the map scrolls in it, the action zone keeps ${Math.round(s.asideW)} px`,
    s.viewBottom <= h + 1 && s.asideW >= 400 && s.pageScroll <= 1 && s.scrolls && tw >= 10.5 && tw <= 18.5 && th >= 10.5 && th <= 14);
  if (SHOTS) await p.screenshot({ path: SHOTS + `/mapzoom-auto-${w}.png` });
}
ok('bigger screens get a bigger map: ' + seen.map((z) => Math.round(z * 100) + '%').join(' → '), seen.every((z, i) => i === 0 || z >= seen[i - 1]) && seen[3] > 1.2);

// 2. Manual: + and −, 100%, the keys, Ctrl + wheel.
await p.setViewportSize({ width: 1600, height: 900 }); await p.waitForTimeout(700);
const auto0 = await zoom();
await p.getByRole('button', { name: 'Bigger map' }).click(); await p.waitForTimeout(300);
const z1 = await zoom();
ok(`+ from the usual size (${Math.round(auto0 * 100)}%) steps up to ${Math.round(z1 * 100)}% and switches to your own size`, z1 > auto0 && (await autoBtn().getAttribute('aria-pressed')) === 'false' && (await pct()) === Math.round(z1 * 100) + '%');
await p.getByRole('button', { name: 'Smaller map' }).click(); await p.getByRole('button', { name: 'Smaller map' }).click(); await p.waitForTimeout(300);
ok('− twice steps down', (await zoom()) < z1);
await p.locator('.phc-mz-pct').click(); await p.waitForTimeout(300);
ok('the percentage button sets 100%', (await zoom()) === 1 && (await pct()) === '100%');
await p.mouse.click(5, 300); await p.keyboard.press('+'); await p.keyboard.press('+'); await p.waitForTimeout(300);
ok('the + key: 125%', (await pct()) === '125%');
await p.keyboard.press('-'); await p.waitForTimeout(300);
ok('the − key: 110%', (await pct()) === '110%');
const gr = await p.locator('.phc-grid-scroll').boundingBox();
await p.mouse.move(gr.x + 200, gr.y + 200); await p.keyboard.down('Control'); await p.mouse.wheel(0, -100); await p.waitForTimeout(150); await p.keyboard.up('Control'); await p.waitForTimeout(300);
ok('Ctrl + wheel up over the map: 125%', (await pct()) === '125%');

// 3. Big manual size: the map scrolls inside its zone, the action zone keeps its room, the page doesn't scroll.
for (let i = 0; i < 8; i++) await p.keyboard.press('+');
await p.waitForTimeout(500);
const big = await state();
ok('at 250% the map is bigger than its zone and scrolls inside it (page scroll ' + big.pageScroll + ')', (await pct()) === '250%' && big.gridW > big.zoneW && big.asideW >= 400 && big.pageScroll <= 1
  && big.scrolls && big.viewBottom <= big.vh + 1);
ok('+ is disabled at the maximum', await p.getByRole('button', { name: 'Bigger map' }).isDisabled());
if (SHOTS) await p.screenshot({ path: SHOTS + '/mapzoom-250.png' });

// 4. Kept after a reload; Auto again.
await p.keyboard.press('-'); await p.waitForTimeout(200);
await p.reload();
await p.waitForFunction(() => window.__phc.getState().screen === 'combat' && !!document.querySelector('.phc-mapzoom'), null, { timeout: 20000 });
await p.waitForTimeout(1500); await calm();
ok('after a reload the size is kept: ' + (await pct()), (await pct()) === '225%');
await autoBtn().click(); await p.waitForTimeout(500);
ok('Usual size again (' + (await pct()) + ') clears the preference', Math.abs((await zoom()) - auto0) < 0.02 && await p.evaluate(() => localStorage.getItem('phc.mapZoom') === null));

// 5. With the splitter: Auto follows the zone's width.
const split = await p.locator('.phc-cb-split').boundingBox();
const before = await zoom();
await p.mouse.move(split.x + 6, split.y + 200); await p.mouse.down(); await p.mouse.move(split.x - 220, split.y + 200, { steps: 10 }); await p.mouse.up(); await p.waitForTimeout(600);
const narrowed = await state();
ok(`narrowing the map zone with the splitter narrows the map's window and never grows the tiles (${Math.round(before * 100)}% → ${Math.round((await zoom()) * 100)}%, window ${narrowed.viewW} px wide)`, (await zoom()) <= before && narrowed.viewW < big.zoneW && narrowed.asideW >= 400);
await p.evaluate(() => localStorage.removeItem('phc.combatLayout'));
console.log('errors', errors);
await browser.close();

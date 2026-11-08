// The combat map's size (Proving Ground fight, no Narrator): Auto fits the map at 1280×720, 1600×900, 1920×1080 and
// 2560×1440 (growing past 100% on big screens, never pushing the action zone below its minimum); − / + / 100% / Auto,
// the − and + keys and Ctrl + wheel over the map; a manual size kept after a reload, and the map scrolling inside its
// zone when it is bigger. Screenshots with SHOTS=dir: mapzoom-*.png.
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
if (await nm.count()) { await nm.fill('Leon'); await click(p, 'To the Proving Ground ›'); }
await p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 15000 });
await act(p, { type: 'sandbox/ai', on: false });
await act(p, { type: 'sandbox/fight' });
await p.waitForFunction(() => window.__phc.getState().screen === 'combat', null, { timeout: 15000 });
await p.waitForTimeout(2200);
const calm = async () => { for (let i = 0; i < 4 && (await p.locator('[data-phc-cutin]').count()); i++) { await p.keyboard.press('Escape'); await p.waitForTimeout(450); } };
await calm();

const zoom = () => p.evaluate(() => Number(getComputedStyle(document.querySelector('.phc-grid')).zoom) || 1);
const pct = () => p.locator('.phc-mz-pct').textContent();
const state = () => p.evaluate(() => { const g = document.querySelector('.phc-grid').getBoundingClientRect(), z = document.querySelector('.phc-cb-left').getBoundingClientRect(), a = document.querySelector('.phc-cb-aside')?.getBoundingClientRect();
  return { gridW: g.width, gridH: g.height, gridBottom: g.bottom, zoneW: z.width, asideW: a ? a.width : 0, vh: innerHeight, pageScroll: document.documentElement.scrollHeight - innerHeight }; });

// 1. Auto at four resolutions: the map fits its zone, bigger screens get a bigger map.
ok('the toolbar is there, Auto on', (await p.locator('.phc-mapzoom button', { hasText: 'Auto' }).getAttribute('aria-pressed')) === 'true');
const seen = [];
for (const [w, h] of [[1280, 720], [1600, 900], [1920, 1080], [2560, 1440]]) {
  await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(700);
  const z = await zoom(), s = await state(); seen.push(z);
  ok(`Auto at ${w}×${h}: ${Math.round(z * 100)}%; the map fits the window height, the action zone keeps ${Math.round(s.asideW)} px`, s.gridBottom <= h + 1 && s.asideW >= 400 && s.pageScroll <= 1);
  if (SHOTS) await p.screenshot({ path: SHOTS + `/mapzoom-auto-${w}.png` });
}
ok('bigger screens get a bigger map: ' + seen.map((z) => Math.round(z * 100) + '%').join(' → '), seen.every((z, i) => i === 0 || z >= seen[i - 1]) && seen[3] > 1.2);

// 2. Manual: + and −, 100%, the keys, Ctrl + wheel.
await p.setViewportSize({ width: 1600, height: 900 }); await p.waitForTimeout(700);
const auto0 = await zoom();
await p.getByRole('button', { name: 'Bigger map' }).click(); await p.waitForTimeout(300);
const z1 = await zoom();
ok(`+ from Auto (${Math.round(auto0 * 100)}%) steps up to ${Math.round(z1 * 100)}% and switches to manual`, z1 > auto0 && (await p.locator('.phc-mapzoom button', { hasText: 'Auto' }).getAttribute('aria-pressed')) === 'false' && (await pct()) === Math.round(z1 * 100) + '%');
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
  && await p.evaluate(() => { const s = document.querySelector('.phc-grid-scroll'), l = document.querySelector('.phc-cb-left'); return s.scrollWidth > s.clientWidth && l.scrollHeight > l.clientHeight; }));
ok('+ is disabled at the maximum', await p.getByRole('button', { name: 'Bigger map' }).isDisabled());
if (SHOTS) await p.screenshot({ path: SHOTS + '/mapzoom-250.png' });

// 4. Kept after a reload; Auto again.
await p.keyboard.press('-'); await p.waitForTimeout(200);
await p.reload();
await p.waitForFunction(() => window.__phc.getState().screen === 'combat' && !!document.querySelector('.phc-mapzoom'), null, { timeout: 20000 });
await p.waitForTimeout(1500); await calm();
ok('after a reload the size is kept: ' + (await pct()), (await pct()) === '225%');
await p.getByRole('button', { name: /Auto/ }).click(); await p.waitForTimeout(500);
ok('Auto again fits the map (' + (await pct()) + ') and clears the preference', Math.abs((await zoom()) - auto0) < 0.02 && await p.evaluate(() => localStorage.getItem('phc.mapZoom') === null));

// 5. With the splitter: Auto follows the zone's width.
const split = await p.locator('.phc-cb-split').boundingBox();
const before = await zoom();
await p.mouse.move(split.x + 6, split.y + 200); await p.mouse.down(); await p.mouse.move(split.x - 220, split.y + 200, { steps: 10 }); await p.mouse.up(); await p.waitForTimeout(600);
ok(`narrowing the map zone with the splitter shrinks the Auto map (${Math.round(before * 100)}% → ${Math.round((await zoom()) * 100)}%)`, (await zoom()) < before);
await p.evaluate(() => localStorage.removeItem('phc.combatLayout'));
console.log('errors', errors);
await browser.close();

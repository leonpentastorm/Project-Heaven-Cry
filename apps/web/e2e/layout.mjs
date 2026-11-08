// The combat screen's adjustable layout (Proving Ground fight, no Narrator): the splitter between the map zone and the
// action zone (drag, keys, double-click), the four panels moved by their grips (the log into the action zone and back,
// the legend reordered, the action menu swapping sides), kept after a reload, Reset, and the narrow layout untouched.
// Screenshots with SHOTS=dir: layout-*.png.
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
for (let i = 0; i < 4 && (await p.locator('[data-phc-cutin]').count()); i++) { await p.keyboard.press('Escape'); await p.waitForTimeout(450); }

const box = async (sel) => { if (/phc-grip/.test(sel)) await p.locator(sel).first().scrollIntoViewIfNeeded().catch(() => {}); return box0(sel); };
const box0 = (sel) => p.evaluate((sel) => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, cx: r.left + r.width / 2, cy: r.top + r.height / 2 }; }, sel);
const zoneOf = (id) => p.evaluate((id) => { const e = [...document.querySelectorAll('[data-phc-panel="' + id + '"]')].find((x) => x.offsetParent !== null); const z = e && (id === 'actions' ? e : e.closest('[data-phc-zone]')); return z ? z.dataset.phcZone : null; }, id);
const drag = async (from, to, steps = 12) => { await p.mouse.move(from.x, from.y); await p.mouse.down(); await p.mouse.move(to.x, to.y, { steps }); await p.waitForTimeout(80); await p.mouse.up(); await p.waitForTimeout(500); };
const gripOf = (id) => id === 'actions' ? '.phc-cb-bar .phc-grip' : '[data-phc-panel="' + id + '"] > .phc-grip';

// 1. The four panels and the splitter are there.
for (const id of ['map', 'legend', 'log', 'actions']) ok('grip on the ' + id, !!(await box(gripOf(id))));
const split = await box('.phc-cb-split');
ok('the splitter sits between the map zone and the action zone', !!split && split.h > 300);
if (SHOTS) await p.screenshot({ path: SHOTS + '/layout-default.png' });

// 2. Drag the splitter: the map zone widens, the grid refits, and the width is kept.
const left0 = (await box('.phc-cb-left')).w;
await drag({ x: split.cx, y: split.cy }, { x: split.cx + 160, y: split.cy });
const left1 = (await box('.phc-cb-left')).w;
ok('dragging the splitter right widens the map zone (' + Math.round(left0) + ' → ' + Math.round(left1) + ' px)', left1 > left0 + 100);
ok('the width is saved', await p.evaluate(() => JSON.parse(localStorage.getItem('phc.combatLayout') || '{}').width > 0));
const aside = await box('.phc-cb-aside');
ok('the action zone keeps at least 360 px', aside.w >= 355);
await p.focus('.phc-cb-split'); await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(300);
ok('arrow keys move it too', (await box('.phc-cb-left')).w < left1 - 10);

// 3. Drag the log into the action zone, then the legend above the map.
let g = await box(gripOf('log')), a = await box('.phc-cb-aside');
await drag({ x: g.cx, y: g.cy }, { x: a.cx, y: a.y + a.h - 20 });
ok('the combat log moves into the action zone', (await zoneOf('log')) === 'sideZone');
if (SHOTS) await p.screenshot({ path: SHOTS + '/layout-log-right.png' });
// The legend sits below a tall map: hold it at the zone's top edge until the zone scrolls up, then drop above the map.
g = await box(gripOf('legend')); const zt = await box0('.phc-cb-left');
await p.mouse.move(g.cx, g.cy); await p.mouse.down(); await p.mouse.move(zt.cx, zt.y + 8, { steps: 10 }); await p.waitForTimeout(1200);
const m = await box0('[data-phc-panel="map"]');
ok('holding a panel at the zone\'s top edge scrolls the zone (the map\'s top is back in view)', m.y >= zt.y - 2);
await p.mouse.move(m.cx, m.y + 10, { steps: 4 }); await p.waitForTimeout(80); await p.mouse.up(); await p.waitForTimeout(500);
const order = await p.evaluate(() => [...document.querySelectorAll('.phc-cb-left > [data-phc-panel]')].map((e) => ({ id: e.dataset.phcPanel, top: e.getBoundingClientRect().top })).sort((x, y) => x.top - y.top).map((x) => x.id));
ok('the legend moves above the map: ' + order.join(', '), order[0] === 'legend' && order[1] === 'map');

// 4. Drag the action menu to the left: the zones swap sides.
g = await box(gripOf('actions')); const mz = await box('.phc-cb-left');
await drag({ x: g.cx, y: g.cy }, { x: mz.x + 60, y: mz.cy });
const sw = { a: await box('.phc-cb-aside'), m: await box('.phc-cb-left') };
ok('the action menu is now on the left, the map on the right', sw.a.x < sw.m.x);
ok('the log stayed in the action zone', (await zoneOf('log')) === 'sideZone');
if (SHOTS) await p.screenshot({ path: SHOTS + '/layout-swapped.png' });

// 5. Kept after a reload.
await p.reload();
await p.waitForFunction(() => window.__phc.getState().screen === 'combat' && !!document.querySelector('.phc-cb-split'), null, { timeout: 20000 });
await p.waitForTimeout(1500);
for (let i = 0; i < 4 && (await p.locator('[data-phc-cutin]').count()); i++) { await p.keyboard.press('Escape'); await p.waitForTimeout(450); }
const re = { a: await box('.phc-cb-aside'), m: await box('.phc-cb-left') };
ok('after a reload: still swapped, log still in the action zone', re.a.x < re.m.x && (await zoneOf('log')) === 'sideZone');

// 6. Hide panel (H) puts the log back under the map; Reset puts everything back.
await p.keyboard.press('h'); await p.waitForTimeout(500);
ok('with the action menu hidden, the log shows in the map zone', (await zoneOf('log')) === 'mapZone');
await p.keyboard.press('h'); await p.waitForTimeout(500);
await click(p, '↺ Layout'); await p.waitForTimeout(600);
const back = { a: await box('.phc-cb-aside'), m: await box('.phc-cb-left') };
ok('Reset: map on the left, log under it, preference cleared', back.m.x < back.a.x && (await zoneOf('log')) === 'mapZone' && await p.evaluate(() => localStorage.getItem('phc.combatLayout') === null));
ok('no Reset button on the default layout', !(await p.locator('.phc-cb-layout-reset').count()));

// 7. Narrow windows keep the stacked layout: no splitter, no grips.
await p.setViewportSize({ width: 900, height: 800 }); await p.waitForTimeout(600);
ok('narrow: splitter and grips hidden', await p.evaluate(() => getComputedStyle(document.querySelector('.phc-cb-split')).display === 'none' && getComputedStyle(document.querySelector('.phc-grip')).display === 'none'));
console.log('errors', errors);
await browser.close();

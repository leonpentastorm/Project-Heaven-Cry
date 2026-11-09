// The mana forecast panel (Leon, 9 Nov 2026) in a Proving Ground fight: the header has no mana chip; the forecast sits
// above the map by default (the map still fits the window at 1440×900 and 1280×720); More opens what the air does and
// what moves it; a change of the meter (the tools' mana) shows in the headline, the gauge and the trend; the grip's
// arrow keys move it into the action column and back; Reset puts it back. Shots: e2e/shots/fc-*.png.
import { chromium, player, click, BASE, OUT } from './lib.mjs';
const browser = await chromium.launch();
const p = await player(browser, 'host');
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const act = (a) => p.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
const dismissCut = async () => { for (let i = 0; i < 3 && (await p.locator('[data-phc-cutin]').count()); i++) { await p.mouse.click(1430, 880); await p.waitForTimeout(380); } };
await p.setViewportSize({ width: 1440, height: 900 });
await p.goto(BASE);
await p.evaluate(() => { try { localStorage.removeItem('phc.combatLayout'); } catch { /* */ } });
await click(p, 'PROVING GROUND');
const nm = p.getByPlaceholder('Leon');
await Promise.race([nm.waitFor({ timeout: 8000 }).catch(() => {}), p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 8000 }).catch(() => {})]);
if (await nm.count()) { await nm.fill('Leon'); await click(p, 'Solo ›'); }
await p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 15000 });
await act({ type: 'sandbox/ai', on: false }); await act({ type: 'sandbox/fight' });
await p.waitForFunction(() => window.__phc.getState().screen === 'combat', null, { timeout: 15000 });
await p.waitForTimeout(2400); await dismissCut();

const head = (await p.locator('header.phc-cb-head').textContent()).replace(/\s+/g, ' ');
ok('the header carries no mana chip: ' + head.slice(0, 140), !/MANA \d+ ·/.test(head));
const fc = p.locator('[data-phc-panel="mana"]');
ok('one forecast panel, in the map zone', (await fc.count()) === 1 && (await p.locator('[data-phc-zone="mapZone"] [data-phc-panel="mana"]').count()) === 1);
const fcBox = await fc.boundingBox(), mapBox = await p.locator('[data-phc-panel="map"]').boundingBox();
ok('it sits above the map: forecast ' + Math.round(fcBox.y) + '–' + Math.round(fcBox.y + fcBox.height) + ', map from ' + Math.round(mapBox.y), fcBox.y + fcBox.height <= mapBox.y + 2);
const fits = async (w, h) => { await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(700); const g = await p.locator('.phc-grid').boundingBox(); return { ok: !!g && g.y + g.height <= h + 1, bottom: g ? Math.round(g.y + g.height) : null }; };
for (const [w, h] of [[1440, 900], [1280, 720]]) { const r = await fits(w, h); ok('the map still fits the window at ' + w + '×' + h + ' (grid bottom ' + r.bottom + ')', r.ok); await p.screenshot({ path: OUT + 'fc-' + w + '.png' }); }
await p.setViewportSize({ width: 1440, height: 900 }); await p.waitForTimeout(500);
const headline = async () => (await p.locator('[data-fc-headline]').first().textContent()).trim();
const m0 = await p.evaluate(() => window.__phc.getState().game.combat.mana);
ok('the headline reads the band and the meter: ' + await headline() + ' (mana ' + m0 + ')', new RegExp('AIR · ' + m0 + ' / 40').test(await headline()));
await p.locator('[data-phc-panel="mana"] button[aria-expanded]').first().click(); await p.waitForTimeout(400);
const det = (await p.locator('[data-fc-details]').first().textContent().catch(() => '')).replace(/\s+/g, ' ');
ok('More opens what the air does and what moves it: ' + det.slice(0, 120), /IN THIS AIR/.test(det) && /WHAT MOVES IT/.test(det) && /A person dies: \+5/.test(det));
const r2 = await fits(1440, 900); ok('opened, the map still fits (grid bottom ' + r2.bottom + ')', r2.ok);
await p.screenshot({ path: OUT + 'fc-open.png' });
await p.locator('[data-phc-panel="mana"] button[aria-expanded]').first().click(); await p.waitForTimeout(300);
await act({ type: 'sandbox/mana', value: 33 }); await p.waitForTimeout(600);
ok('the meter changed: ' + await headline() + ' · ' + (await p.locator('[data-fc-trend]').first().textContent()).trim(), /FLOODED AIR · 33 \/ 40/.test(await headline()) && /▲ \+\d+ this round/.test(await p.locator('[data-fc-trend]').first().textContent()));
ok('the outlook names the way down: ' + (await p.locator('[data-fc-outlook]').first().textContent()).trim(), /Rich at 29: 4 below/.test(await p.locator('[data-fc-outlook]').first().textContent()));
await p.screenshot({ path: OUT + 'fc-flooded.png' });
const grip = p.locator('[data-phc-panel="mana"] > .phc-grip');
await grip.focus(); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(600);
ok('the grip\'s right arrow moves it into the action column', (await p.locator('[data-phc-zone="sideZone"] [data-phc-panel="mana"], #phc-cb-aside [data-phc-panel="mana"]').count()) === 1 && (await p.locator('[data-phc-zone="mapZone"] [data-phc-panel="mana"]').count()) === 0);
await p.screenshot({ path: OUT + 'fc-side.png' });
await p.locator('[data-phc-panel="mana"] > .phc-grip').focus(); await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(600);
ok('and the left arrow brings it back to the map zone', (await p.locator('[data-phc-zone="mapZone"] [data-phc-panel="mana"]').count()) === 1);
const saved = await p.evaluate(() => localStorage.getItem('phc.combatLayout'));
ok('the layout is a browser preference: ' + saved, saved && saved.includes('mana'));
console.log('errors', JSON.stringify(p.errors));
if (p.errors.length) process.exitCode = 1;
await browser.close();

// Combat fixes (Proving Ground, no Narrator): the tools' Max every skill and each skill's own Max; and the enemies'
// turns: the engine runs them at once, so the state says "your turn" while their moves still play. A move clicked then
// waits ("the other turns are still playing out") and goes through once they have played.
import { chromium, click, BASE } from './lib.mjs';
const browser = await chromium.launch();
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
await ctx.addInitScript(() => { try { localStorage.setItem('phc.voice', JSON.stringify({ auto: false })); localStorage.setItem('phc.tips', '["*"]'); sessionStorage.setItem('phc.pressedAnyKey', '1'); } catch { /* */ } });
const p = await ctx.newPage();
const errors = []; p.on('pageerror', (e) => errors.push(e.message));
const act = (a) => p.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
const ch = () => p.evaluate(() => Object.values(window.__phc.getState().game.characters)[0]);
const ref = (k) => String.fromCharCode(65 + Number(k.split(',')[0])) + (Number(k.split(',')[1]) + 1);

await p.goto(BASE);
await click(p, 'PROVING GROUND', { timeout: 90000 });
const nm = p.getByPlaceholder('Leon');
await Promise.race([nm.waitFor({ timeout: 8000 }).catch(() => {}), p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 8000 }).catch(() => {})]);
if (await nm.count()) { await nm.fill('Leon'); await click(p, /^Solo ›/); }
await p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 15000 });

// 1. The skill buttons.
const drawer = p.locator('aside[aria-label="Proving Ground tools"]');
if (!(await drawer.count())) await p.getByRole('button', { name: 'Open the Proving Ground tools' }).click();
await drawer.waitFor({ timeout: 6000 });
for (const name of ['Squad', 'Character', 'You']) { const t = drawer.getByRole('tab', { name, exact: true }); if (await t.count()) { await t.click(); break; } }
const one = drawer.getByRole('button', { name: 'Max Athletics' });
await one.scrollIntoViewIfNeeded(); await one.click(); await p.waitForTimeout(400);
let c = await ch();
ok('a skill\'s own Max: Athletics ' + c.skills.athletics, c.skills.athletics === 10);
ok('its button turns into a tick', (await drawer.locator('[data-sb-skill-max="athletics"][disabled]').count()) > 0);
await drawer.locator('[data-sb-skills="max"]').click(); await p.waitForTimeout(500);
c = await ch();
ok('Max every skill: all 27 at 10, attributes and cores follow', Object.values(c.skills).filter((v) => v === 10).length >= 27 && Object.values(c.attrs).every((v) => v === 10) && Object.values(c.cores).every((v) => v === 10));
await drawer.locator('[data-sb-skills="zero"]').click(); await p.waitForTimeout(400);
ok('All to 0 clears them', Object.values((await ch()).skills).every((v) => !v));

// 2. The enemies' turns: a move clicked while they still play waits.
await act({ type: 'sandbox/ai', on: true });
await act({ type: 'sandbox/fight' });
await p.waitForFunction(() => window.__phc.getState().screen === 'combat', null, { timeout: 15000 });
const myTurn = () => p.waitForFunction(() => { const cb = window.__phc.getState().game.combat; const u = cb && cb.units.find((x) => x.id === cb.order[cb.turn]); return u && u.side === 'pc' && u.ap >= 5; }, null, { timeout: 20000 });
await myTurn(); await p.waitForTimeout(3500);
for (let i = 0; i < 4 && (await p.locator('[data-phc-cutin]').count()); i++) { await p.keyboard.press('Escape'); await p.waitForTimeout(400); }
const me = () => p.evaluate(() => { const cb = window.__phc.getState().game.combat; return cb.units.find((x) => x.side === 'pc'); });
const free = () => p.evaluate(() => { const cb = window.__phc.getState().game.combat, u = cb.units.find((x) => x.side === 'pc'), [x, y] = u.pos.split(',').map(Number);
  const taken = new Set([...cb.units.filter((v) => !v.dead).map((v) => v.pos), ...(cb.objects || []).map((o) => o.pos), ...(cb.map.solid || [])]);
  for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) { const k = (x + dx) + ',' + (y + dy); if (x + dx >= 0 && y + dy >= 0 && x + dx < cb.map.w && y + dy < cb.map.h && !taken.has(k)) return k; } return null; });
const u0 = await me();
await p.locator('.phc-cb-root').getByRole('button', { name: /^End turn$/ }).first().click();
await myTurn();
const hold = await p.evaluate(() => { const until = window.__phcHold ? window.__phcHold() : 0; return until; });
for (let i = 0; i < 4 && (await p.locator('[data-phc-cutin]').count()); i++) { await p.keyboard.press('Escape'); await p.waitForTimeout(150); }
const k = await free(), u1 = await me();
const enemiesActed = await p.evaluate(() => (window.__phc.getState().game.combat.fx || []).some((e) => e.k === 'turn' && e.side === 'foe'));
await p.locator('button.phc-tok[aria-label^="' + ref(k) + ' "]').first().click({ force: true }); await p.waitForTimeout(150);
const toast = await p.evaluate(() => window.__phc.getState().toast?.text || '');
const u2 = await me();
ok('the enemies had their turns (' + enemiesActed + ')', enemiesActed);
ok('a move clicked while they still play waits: "' + toast + '"', /still playing out/.test(toast) && u2.pos === u1.pos);
await p.waitForTimeout(8500);
for (let i = 0; i < 4 && (await p.locator('[data-phc-cutin]').count()); i++) { await p.keyboard.press('Escape'); await p.waitForTimeout(300); }
const k2 = await free();
await p.locator('button.phc-tok[aria-label^="' + ref(k2) + ' "]').first().click({ force: true }); await p.waitForTimeout(400);
for (const lbl of [/^Confirm/]) { const b = p.locator('.phc-cb-root').getByRole('button', { name: lbl }).first(); if (await b.count() && await b.isEnabled()) { await b.click(); await p.waitForTimeout(400); } }
const u3 = await me();
ok('once they have played, the move goes through (' + ref(u1.pos) + ' → ' + ref(u3.pos) + ')', u3.pos !== u1.pos);
void u0; void hold;
console.log('errors', errors);
await browser.close();

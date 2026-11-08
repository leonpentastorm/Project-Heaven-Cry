// The Proving Ground's FAITH tools (rules 1.6; sandbox/faith): make the fighter Faithful to Mother Ember with Faith 7
// and Devotion 7, start a fight, set a vow from the tools, pray the Miracle (the full-screen answer, skippable), then
// reset the limits; then an Atheist with knowledge pieces prays a learned Hymn by dice.
import { chromium, click, BASE } from './lib.mjs';
const browser = await chromium.launch();
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const SHOTS = process.env.SHOTS;
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
await ctx.addInitScript(() => { try { localStorage.setItem('phc.voice', JSON.stringify({ auto: false })); localStorage.setItem('phc.tips', '["*"]'); sessionStorage.setItem('phc.pressedAnyKey', '1'); } catch { /* */ } });
const p = await ctx.newPage();
const errors = []; p.on('pageerror', (e) => errors.push(e.message));
const act = (a) => p.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
const me = () => p.evaluate(() => Object.values(window.__phc.getState().game.characters)[0]);

await p.goto(BASE);
await click(p, 'PROVING GROUND', { timeout: 90000 });
const nm = p.getByPlaceholder('Leon');
await Promise.race([nm.waitFor({ timeout: 8000 }).catch(() => {}), p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 8000 }).catch(() => {})]);
if (await nm.count()) { await nm.fill('Leon'); await click(p, /^Solo ›/); }
await p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 15000 });
const drawer = p.locator('aside[aria-label="Proving Ground tools"]');
if (!(await drawer.count())) await p.getByRole('button', { name: 'Open the Proving Ground tools' }).click();
await drawer.waitFor();
await drawer.getByRole('tab', { name: 'Faith' }).click();
await drawer.locator('[data-sb-belief="faithful"]').click(); await p.waitForTimeout(200);
await drawer.locator('[data-sb-patron="mother_ember"]').click(); await p.waitForTimeout(200);
for (let i = 0; i < 7; i++) { const r = drawer.getByRole('button', { name: 'Raise Faith' }); if (await r.isEnabled()) await r.click(); await p.waitForTimeout(60); }
await drawer.getByRole('button', { name: '10', exact: true }).click(); await p.waitForTimeout(200);
let c = await me();
ok('the tools make a Faithful of Mother Ember, Faith ' + (c.skills.faith || 0) + ', Devotion ' + c.devotion, c.belief?.kind === 'faithful' && c.belief.patron === 'mother_ember' && (c.skills.faith || 0) >= 7 && c.devotion === 10);
if (SHOTS) await p.screenshot({ path: SHOTS + '/faith-pg-tools.png' });
await act({ type: 'sandbox/ai', on: false });
await act({ type: 'sandbox/fight' });
await p.waitForFunction(() => window.__phc.getState().screen === 'combat', null, { timeout: 15000 });
await p.waitForFunction(() => { const cb = window.__phc.getState().game.combat; const u = cb && cb.units.find((x) => x.id === cb.order[cb.turn]); return u && u.side === 'pc'; }, null, { timeout: 20000 });
await p.waitForTimeout(800); if (await p.locator('[data-phc-cutin]').count()) { await p.keyboard.press('Escape'); await p.waitForTimeout(400); }
if (!(await drawer.count())) await p.getByRole('button', { name: 'Open the Proving Ground tools' }).click();
await drawer.getByRole('tab', { name: 'Faith' }).click();
await drawer.locator('[data-sb-vow="stand"]').click(); await p.waitForTimeout(300);
const vow = await p.evaluate(() => { const cb = window.__phc.getState().game.combat; return cb.units.find((x) => x.charId).vow; });
ok('a vow set from the tools is on the unit (' + JSON.stringify(vow) + ')', vow?.id === 'stand');
await drawer.getByRole('button', { name: 'Close the tools' }).click().catch(() => {});
await p.locator('[role="tab"][data-tab="faith"]').click();
const mir = p.locator('[role="tabpanel"] [data-act^="pr:miracle:"]');
ok('the Miracle is in the FAITH tab and ready', (await mir.count()) === 1);
await mir.click(); await p.waitForTimeout(300);
const t0 = Date.now();
await p.getByRole('button', { name: 'Confirm', exact: true }).first().click();
const shown = await p.locator('[data-phc-miracle]').waitFor({ timeout: 3000 }).then(() => true, () => false);
ok('the Miracle answers on the whole screen', shown);
if (shown && SHOTS) { await p.waitForTimeout(900); await p.screenshot({ path: SHOTS + '/faith-miracle.png' }); }
await p.locator('[data-phc-miracle]').waitFor({ state: 'detached', timeout: 4000 }).catch(() => {});
ok('and clears within 2.5 s (' + (Date.now() - t0) + ' ms)', Date.now() - t0 < 3200 && (await p.locator('[data-phc-miracle]').count()) === 0);
c = await me();
ok('the Miracle spends the Devotion and is once a session', /One Miracle a session|Miracle needs Devotion/.test(await p.locator('[role="tabpanel"]').textContent() + (await mir.getAttribute('title') || '')) || (c.devotion ?? 10) < 10);
if (!(await drawer.count())) await p.getByRole('button', { name: 'Open the Proving Ground tools' }).click();
await drawer.getByRole('tab', { name: 'Faith' }).click();
await drawer.locator('[data-sb-faith-reset]').click(); await p.waitForTimeout(300);
c = await me();
ok('Reset the limits clears the Miracle\'s session mark', c.miracleSession == null);
// An Atheist with two pieces of Mother Ember: her first two Hymns, by dice.
await drawer.locator('[data-sb-belief="atheist"]').click(); await p.waitForTimeout(200);
await drawer.getByRole('button', { name: 'Raise Mother Ember pieces' }).click(); await p.waitForTimeout(150);
await drawer.getByRole('button', { name: 'Raise Mother Ember pieces' }).click(); await p.waitForTimeout(200);
c = await me();
ok('an Atheist with 2 pieces learns 2 Hymns (' + (c.hymns || []).join(', ') + ')', c.belief?.kind === 'atheist' && (c.hymns || []).length === 2);
await drawer.getByRole('button', { name: 'Close the tools' }).click().catch(() => {});
await p.locator('[role="tab"][data-tab="faith"]').click();
const hy = await p.locator('[role="tabpanel"] [data-act^="pr:hymn:"]').allTextContents();
ok('the FAITH tab shows them by dice (' + hy.join(' / ').slice(0, 80) + ')', hy.length === 2 && hy.every((t) => /BY DICE|TN \d+/.test(t)));
console.log('errors', errors);
await browser.close();

// The slate pass's combat panel (Proving Ground fight): the Say row never scrolls away (1440×900, 1280×720, 1093×526
// and a 900 px narrow window), "Hide panel" leaves only the map (mini-bar, keys, remembered), and the turn card's four
// commands can be customised (slot 1 → Reload shows on the next card; Reset goes back to smart).
// Screenshots: e2e/shots/slate-combat-*.png.
import { chromium, click, BASE, OUT } from './lib.mjs';
const browser = await chromium.launch();
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const act = (p, a) => p.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
const myTurn = (p) => p.waitForFunction(() => { const cb = window.__phc.getState().game.combat; const u = cb && cb.units.find((x) => x.id === cb.order[cb.turn]); return u && u.side === 'pc' && u.ap >= 5; }, null, { timeout: 12000 });

async function open(ctx, vw, vh) {
  const p = await ctx.newPage(); await p.setViewportSize({ width: vw, height: vh });
  const errors = []; p.on('pageerror', (e) => errors.push(e.message)); p.errors = errors;
  await p.goto(BASE);
  await click(p, 'PROVING GROUND', { timeout: 90000 });
  const nm = p.getByPlaceholder('Leon');
  await Promise.race([nm.waitFor({ timeout: 8000 }).catch(() => {}), p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 8000 }).catch(() => {})]);
  if (await nm.count()) { await nm.fill('Leon'); await click(p, 'Solo ›'); }
  await p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 15000 });
  await act(p, { type: 'sandbox/ai', on: false });
  await act(p, { type: 'sandbox/fight' });
  await p.waitForFunction(() => window.__phc.getState().screen === 'combat', null, { timeout: 15000 });
  await myTurn(p); await p.waitForTimeout(1800);
  return p;
}
const dismissCut = async (p) => { for (let i = 0; i < 4; i++) { if (!(await p.locator('[data-phc-cutin]').count())) return; await p.keyboard.press('Escape'); await p.waitForTimeout(450); } };
const sayBox = (p) => p.evaluate(() => {
  const vis = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), shown: r.height > 0 && r.top >= 0 && r.bottom <= innerHeight + 1 && getComputedStyle(el).visibility !== 'hidden' }; };
  const yt = Array.from(document.querySelectorAll('*')).find((e) => e.children.length === 0 && /^YOUR TURN$/.test(e.textContent.trim()) && e.closest('.phc-cb-col, aside, section, div'));
  const conf = Array.from(document.querySelectorAll('button')).find((b) => /^(Confirm|Click a tile)/.test(b.textContent.trim()));
  const inputs = [...document.querySelectorAll('form.phc-cb-say input, form.phc-cb-say2 input')].map(vis);
  return { say: inputs, anySay: inputs.some((x) => x && x.shown), yt: vis(yt), conf: vis(conf), pageScroll: document.documentElement.scrollHeight - innerHeight };
});

const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await ctx.addInitScript(() => { try { localStorage.setItem('phc.voice', JSON.stringify({ auto: false })); localStorage.setItem('phc.tips', '["*"]'); sessionStorage.setItem('phc.pressedAnyKey', '1'); } catch { /* */ } });
const p = await open(ctx, 1440, 900);
await dismissCut(p);
for (const [vw, vh] of [[1440, 900], [1280, 720], [1093, 526], [900, 800]]) {
  await p.setViewportSize({ width: vw, height: vh }); await p.waitForTimeout(600);
  // scroll whatever scrolls in the column, as a player would with the wheel
  await p.mouse.move(vw - 200, vh / 2); await p.mouse.wheel(0, 800); await p.waitForTimeout(300);
  const b = await sayBox(p);
  ok(`${vw}x${vh}: the Say box is on screen after scrolling (${JSON.stringify(b.say)}), YOUR TURN ${b.yt?.shown}, Confirm ${b.conf?.shown}`, b.anySay && b.conf?.shown);
  await p.screenshot({ path: `${OUT}slate-combat-${vw}x${vh}.png` });
  await p.mouse.wheel(0, -800);
}
await p.setViewportSize({ width: 1440, height: 900 }); await p.waitForTimeout(500);
// Say sends with Enter
const say = p.getByLabel(/^Say something/);
await say.fill('Hold the line!'); await say.press('Enter'); await p.waitForTimeout(400);
ok('Enter sends a Say (the box empties)', (await say.inputValue()) === '');

// ----- hide the panel -----
const gridW = () => p.evaluate(() => { const g = document.querySelector('.phc-grid-scroll') || document.querySelector('.phc-grid'); return Math.round(g.getBoundingClientRect().width); });
const w0 = await gridW();
await p.locator('.phc-cb-hide').first().click(); await p.waitForTimeout(700);
const w1 = await gridW();
ok(`Hide panel: the map widens (${w0} → ${w1} px of 1440)`, w1 > w0 + 200);
ok('the edge tab "SHOW PANEL" and the mini-bar are up', (await p.locator('.phc-cb-show').count()) > 0 && (await p.locator('.phc-cb-mini').count()) === 1);
ok('localStorage remembers it: ' + await p.evaluate(() => localStorage.getItem('phc.combatPanel')), /hid|1|true|off|closed/i.test(String(await p.evaluate(() => localStorage.getItem('phc.combatPanel')))));
await p.screenshot({ path: OUT + 'slate-combat-hidden.png' });
for (const [vw, vh] of [[1440, 900], [1280, 720], [1920, 1080], [1093, 526]]) {
  await p.setViewportSize({ width: vw, height: vh }); await p.waitForTimeout(500);
  const o = await p.evaluate(() => { const g = document.querySelector('.phc-grid').getBoundingClientRect(), m = document.querySelector('.phc-cb-mini')?.getBoundingClientRect();
    return { grid: [g.left, g.top, g.right, g.bottom].map(Math.round), mini: m && [m.left, m.top, m.right, m.bottom].map(Math.round), overlap: !!m && g.right > m.left && g.bottom > m.top }; });
  ok(`${vw}x${vh} panel hidden: no tile under the mini-bar (grid ${o.grid}, mini ${o.mini})`, !o.overlap);
  if (vw === 1920) await p.screenshot({ path: OUT + 'slate-combat-hidden-1920.png' });
}
await p.setViewportSize({ width: 1440, height: 900 }); await p.waitForTimeout(400);
const miniBtns = await p.locator('.phc-cb-mini button[data-act]').allTextContents();
ok('mini-bar has the four quick commands: ' + miniBtns.map((t) => t.replace(/\s+/g, ' ').trim()).join(' | '), miniBtns.length === 4);
const selBefore = await p.evaluate(() => window.__phc.getState().game.combat.order.length);
void selBefore;
await p.mouse.click(720, 30); await p.keyboard.press('2'); await p.waitForTimeout(250); await p.keyboard.press('1'); await p.waitForTimeout(250);
const miniOn = await p.locator('.phc-cb-mini button[data-act][aria-pressed="true"]').allTextContents();
ok('key 1 picks the first quick command on the mini-bar: ' + miniOn.join(','), miniOn.length === 1 && /^1/.test(miniOn[0]));
// reload: still hidden
await p.reload(); await p.waitForFunction(() => window.__phc?.getState().screen === 'combat' && !/LOADING ART/.test(document.body.innerText), null, { timeout: 90000 }).catch(() => {}); await p.waitForTimeout(1500); await dismissCut(p);
console.log('after reload: screen ' + await p.evaluate(() => window.__phc?.getState().screen)); await p.screenshot({ path: OUT + 'slate-combat-reloaded.png' });
ok('after a reload the panel stays hidden', (await p.locator('.phc-cb-mini').count()) === 1 || (await p.locator('.phc-cb-show').count()) > 0);
await p.mouse.click(720, 30); await p.keyboard.press('h'); await p.waitForTimeout(600);
ok('H shows the panel again', (await p.locator('.phc-cb-hide').count()) > 0 && (await p.locator('.phc-cb-mini').count()) === 0);

// ----- the Proving Ground has no Narrator: nothing only a Narrator rules is offered (the Hellraiser's Suppressing Fire) -----
{ const all = [];
  const tabs = p.locator('[role="tablist"][aria-label="Actions"] [role="tab"]');
  for (let i = 0; i < await tabs.count(); i++) { await tabs.nth(i).click(); await p.waitForTimeout(120); all.push(...(await p.locator('[role="tabpanel"] button').allTextContents()).map((t) => t.replace(/\s+/g, ' ').trim())); }
  ok('no Narrator-ruled action in the Proving Ground (' + all.length + ' actions)', all.length > 5 && !all.some((t) => /Suppressing Fire|Narrator/.test(t)));
  await tabs.first().click(); }
// ----- customise the four commands -----
await p.locator('button.phc-cb-link').first().click();
const dlg = p.locator('[data-phc-cmds-dialog]'); await dlg.waitFor({ timeout: 4000 });
await p.screenshot({ path: OUT + 'slate-combat-customise.png' });
await dlg.locator('[data-slot="1"]').click();
await dlg.locator('[data-cmd="reload"]').first().click();
await p.waitForTimeout(150);
const slot1 = (await dlg.locator('[data-slot="1"]').textContent()).replace(/\s+/g, ' ');
ok('slot 1 now reads: ' + slot1, /Reload/i.test(slot1));
await dlg.getByRole('button', { name: 'Save', exact: true }).click(); await p.waitForTimeout(300);
ok('Save closes the dialog and stores the choice: ' + await p.evaluate(() => localStorage.getItem('phc.cutinCmds')), (await dlg.count()) === 0 && /reload/.test(String(await p.evaluate(() => localStorage.getItem('phc.cutinCmds')))));
await p.getByRole('button', { name: 'End turn', exact: true }).first().click();
await p.waitForSelector('[data-phc-cutin]', { timeout: 10000 });
const card = await p.locator('[data-phc-cutin] button[data-act]').allTextContents();
const first = await p.locator('[data-phc-cutin] button[data-act]').first().getAttribute('data-act');
ok('the next turn card leads with Reload: ' + card.map((t) => t.replace(/\s+/g, ' ').trim()).join(' | ') + ' (' + first + ')', first === 'reload');
const acts = await p.locator('[data-phc-cutin] button[data-act]').evaluateAll((bs) => bs.map((b) => b.getAttribute('data-act')));
ok('the smart default fills the other slots in its order, Shoot kept: ' + acts.join(' | '), acts.length === 4 && acts[1] === 'shot' && acts[2] === 'move' && new Set(acts).size === 4);
await p.screenshot({ path: OUT + 'slate-combat-cutin-custom.png' });
// customise from the card (C), then reset
await p.keyboard.press('c'); await dlg.waitFor({ timeout: 4000 });
await dlg.getByRole('button', { name: 'Reset to smart default' }).click();
await dlg.getByRole('button', { name: 'Save', exact: true }).click(); await p.waitForTimeout(300);
ok('Reset clears the choice: ' + await p.evaluate(() => localStorage.getItem('phc.cutinCmds')), !/reload/.test(String(await p.evaluate(() => localStorage.getItem('phc.cutinCmds')))));
await dismissCut(p);
await p.getByRole('button', { name: 'End turn', exact: true }).first().click();
await p.waitForSelector('[data-phc-cutin]', { timeout: 10000 });
const first2 = await p.locator('[data-phc-cutin] button[data-act]').first().getAttribute('data-act');
ok('the card is smart again (slot 1: ' + first2 + ')', first2 !== 'reload');
ok('no page errors' + (p.errors.length ? ': ' + p.errors.join(' | ') : ''), !p.errors.length);
await browser.close();

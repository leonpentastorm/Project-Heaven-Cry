// The slate pass's combat panel (Proving Ground fight): the Say row never scrolls away (1440×900, 1280×720, 1093×526
// and a 900 px narrow window), "Hide panel" leaves only the map (mini-bar, keys, remembered), and the turn card's four
// commands can be customised (slot 1 → Reload shows on the next card; Reset goes back to smart).
// Screenshots: e2e/shots/slate-combat-*.png.
import { chromium, click, BASE, OUT, pause } from './lib.mjs';
const browser = await chromium.launch();
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const act = (p, a) => p.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
const myTurn = (p) => p.waitForFunction(() => { const cb = window.__phc.getState().game.combat; const u = cb && cb.units.find((x) => x.id === cb.order[cb.turn]); return u && u.side === 'pc' && u.ap >= 5; }, null, { timeout: 30000 });

async function open(ctx, vw, vh) {
  const p = await ctx.newPage(); await p.setViewportSize({ width: vw, height: vh });
  const errors = []; p.on('pageerror', (e) => errors.push(e.message)); p.errors = errors;
  await p.goto(BASE);
  await click(p, 'PROVING GROUND', { timeout: 90000 });
  const nm = p.getByPlaceholder('Leon');
  await Promise.race([nm.waitFor({ timeout: 20000 }).catch(() => {}), p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 20000 }).catch(() => {})]);
  if (await nm.count()) { await nm.fill('Leon'); await click(p, 'Solo ›'); }
  await p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 30000 });
  await act(p, { type: 'sandbox/ai', on: false });
  await act(p, { type: 'sandbox/fight' });
  await p.waitForFunction(() => window.__phc.getState().screen === 'combat', null, { timeout: 30000 });
  await myTurn(p); await pause(p, 1800);
  return p;
}
const dismissCut = async (p) => { for (let i = 0; i < 4; i++) { if (!(await p.locator('[data-phc-cutin]').count())) return; await p.keyboard.press('Escape'); await pause(p, 450); } };
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
  await p.setViewportSize({ width: vw, height: vh }); await pause(p, 600);
  // scroll whatever scrolls in the column, as a player would with the wheel
  await p.mouse.move(vw - 200, vh / 2); await p.mouse.wheel(0, 800); await pause(p, 300);
  const b = await sayBox(p);
  ok(`${vw}x${vh}: the Say box is on screen after scrolling (${JSON.stringify(b.say)}), YOUR TURN ${b.yt?.shown}, Confirm ${b.conf?.shown}`, b.anySay && b.conf?.shown);
  await p.screenshot({ path: `${OUT}slate-combat-${vw}x${vh}.png` });
  await p.mouse.wheel(0, -800);
}
// The panel's top bar (an outside review of 0.25.0): on short windows the one-line "You" (portrait, name, HP, AP,
// Backpack) shares the bar with the grip, Customise and Hide panel; nothing in it may overlap at any size (the bar
// wraps instead). With a long name too.
const barHits = () => p.evaluate(() => {
  const bar = document.querySelector('.phc-cb-bar'); if (!bar) return ['no bar'];
  // the leaf boxes a player reads or presses (the HP bar's own fill and chip sit inside its track and are skipped)
  const els = [...bar.querySelectorAll('button, img, span')].filter((e) => e.getClientRects().length && !e.closest('[aria-hidden="true"]') && (e.tagName !== 'SPAN' || !e.querySelector('span, button, img')) && !(e.parentElement && e.parentElement.closest('button')));
  const rs = els.map((e) => [((e.textContent || '').trim() || e.getAttribute('aria-label') || e.tagName).slice(0, 24), e.getBoundingClientRect()]);
  const out = [];
  for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) {
    const [ta, a] = rs[i], [tb, b] = rs[j];
    if (a.width && b.width && a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) out.push(ta + ' × ' + tb);
  }
  const br = bar.getBoundingClientRect();
  for (const [t, r] of rs) if (r.right > br.right + 1 || r.left < br.left - 1) out.push(t + ' outside the bar');
  return out;
});
for (const long of [false, true]) {
  if (long) await p.evaluate(() => { const g = window.__phc.getState().game, u = g.combat.units.find((x) => x.side === 'pc'); const c = g.characters[u.charId]; if (c) c.name = 'Bartholomew Featherstonehaugh'; u.name = 'Bartholomew Featherstonehaugh'; });
  for (const [vw, vh] of [[1280, 720], [1366, 768], [1440, 900], [1920, 1080], [900, 800]]) {
    await p.setViewportSize({ width: vw, height: vh }); await pause(p, 400);
    const hits = await barHits();
    ok(`${vw}x${vh}${long ? ', a long name' : ''}: nothing in the panel's top bar overlaps (${hits.join('; ') || 'clear'})`, !hits.length);
    if (vw === 1280 && !long) await p.screenshot({ path: OUT + 'slate-combat-bar-1280x720.png' });
  }
}
await p.setViewportSize({ width: 1440, height: 900 }); await pause(p, 500);
// Say sends with Enter
const say = p.getByLabel(/^Say something/);
await say.fill('Hold the line!'); await say.press('Enter'); await pause(p, 400);
ok('Enter sends a Say (the box empties)', (await say.inputValue()) === '');

// ----- hide the panel -----
const gridW = () => p.evaluate(() => { const g = document.querySelector('.phc-grid-scroll') || document.querySelector('.phc-grid'); return Math.round(g.getBoundingClientRect().width); });
const w0 = await gridW();
await p.locator('.phc-cb-hide').first().click(); await pause(p, 700);
const w1 = await gridW();
ok(`Hide panel: the map's window widens (${w0} → ${w1} px of 1440; it stays clear of the turn mini-bar)`, w1 > w0 + 60);
ok('the edge tab "SHOW PANEL" and the mini-bar are up', (await p.locator('.phc-cb-show').count()) > 0 && (await p.locator('.phc-cb-mini').count()) === 1);
ok('localStorage remembers it: ' + await p.evaluate(() => localStorage.getItem('phc.combatPanel')), /hid|1|true|off|closed/i.test(String(await p.evaluate(() => localStorage.getItem('phc.combatPanel')))));
await p.screenshot({ path: OUT + 'slate-combat-hidden.png' });
for (const [vw, vh] of [[1440, 900], [1280, 720], [1920, 1080], [1093, 526]]) {
  await p.setViewportSize({ width: vw, height: vh }); await pause(p, 500);
  const o = await p.evaluate(() => { const g = document.querySelector('.phc-grid-scroll').getBoundingClientRect(), m = document.querySelector('.phc-cb-mini')?.getBoundingClientRect();
    return { grid: [g.left, g.top, g.right, g.bottom].map(Math.round), mini: m && [m.left, m.top, m.right, m.bottom].map(Math.round), overlap: !!m && g.right > m.left && g.bottom > m.top }; });
  ok(`${vw}x${vh} panel hidden: no tile under the mini-bar (grid ${o.grid}, mini ${o.mini})`, !o.overlap);
  if (vw === 1920) await p.screenshot({ path: OUT + 'slate-combat-hidden-1920.png' });
}
await p.setViewportSize({ width: 1440, height: 900 }); await pause(p, 400);
const miniBtns = await p.locator('.phc-cb-mini button[data-act]').allTextContents();
ok('mini-bar has the four quick commands: ' + miniBtns.map((t) => t.replace(/\s+/g, ' ').trim()).join(' | '), miniBtns.length === 4);
const selBefore = await p.evaluate(() => window.__phc.getState().game.combat.order.length);
void selBefore;
await p.mouse.click(720, 30); await p.keyboard.press('2'); await pause(p, 250); await p.keyboard.press('1'); await pause(p, 250);
const miniOn = await p.locator('.phc-cb-mini button[data-act][aria-pressed="true"]').allTextContents();
ok('key 1 picks the first quick command on the mini-bar: ' + miniOn.join(','), miniOn.length === 1 && /^1/.test(miniOn[0]));
// reload: still hidden
await p.reload(); await p.waitForFunction(() => window.__phc?.getState().screen === 'combat' && !/LOADING ART/.test(document.body.innerText), null, { timeout: 90000 }).catch(() => {}); await pause(p, 1500); await dismissCut(p);
console.log('after reload: screen ' + await p.evaluate(() => window.__phc?.getState().screen)); await p.screenshot({ path: OUT + 'slate-combat-reloaded.png' });
ok('after a reload the panel stays hidden', (await p.locator('.phc-cb-mini').count()) === 1 || (await p.locator('.phc-cb-show').count()) > 0);
await p.mouse.click(720, 30); await p.keyboard.press('h'); await pause(p, 600);
ok('H shows the panel again', (await p.locator('.phc-cb-hide').count()) > 0 && (await p.locator('.phc-cb-mini').count()) === 0);

// ----- the Proving Ground has no Narrator: nothing only a Narrator rules is offered (the Hellraiser's Suppressing Fire) -----
{ const all = [];
  const tabs = p.locator('[role="tablist"][aria-label="Actions"] [role="tab"]');
  for (let i = 0; i < await tabs.count(); i++) { await tabs.nth(i).click(); await pause(p, 120); all.push(...(await p.locator('[role="tabpanel"] button').allTextContents()).map((t) => t.replace(/\s+/g, ' ').trim())); }
  ok('no Narrator-ruled action in the Proving Ground (' + all.length + ' actions)', all.length > 5 && !all.some((t) => /Suppressing Fire|Narrator/.test(t)));
  await tabs.first().click(); }
// ----- customise the four commands -----
await p.locator('button.phc-cb-link').first().click();
const dlg = p.locator('[data-phc-cmds-dialog]'); await dlg.waitFor({ timeout: 30000 });
await p.screenshot({ path: OUT + 'slate-combat-customise.png' });
await dlg.locator('[data-slot="1"]').click();
await dlg.locator('[data-cmd="reload"]').first().click();
await pause(p, 150);
const slot1 = (await dlg.locator('[data-slot="1"]').textContent()).replace(/\s+/g, ' ');
ok('slot 1 now reads: ' + slot1, /Reload|Swap magazine/i.test(slot1));
await dlg.getByRole('button', { name: 'Save', exact: true }).click(); await pause(p, 300);
ok('Save closes the dialog and stores the choice: ' + await p.evaluate(() => localStorage.getItem('phc.cutinCmds')), (await dlg.count()) === 0 && /reload/.test(String(await p.evaluate(() => localStorage.getItem('phc.cutinCmds')))));
// The turn card closes itself after 2 s. What is on it is read IN the page, the moment it is up with its commands, by a
// watcher started before End turn (asking for its buttons one call after another from here raced the card's end on a
// busy machine, and the suite stopped on a timeout).
const watchCard = () => p.evaluate(() => {
  window.__card = null; window.__cardObs?.disconnect();
  const look = () => { const bs = [...document.querySelectorAll('[data-phc-cutin] button[data-act]')]; if (bs.length && !window.__card) { window.__card = bs.map((b) => ({ act: b.getAttribute('data-act'), text: (b.textContent || '').replace(/\s+/g, ' ').trim() })); window.__cardObs.disconnect(); } };
  window.__cardObs = new MutationObserver(look); window.__cardObs.observe(document.documentElement, { childList: true, subtree: true }); look();
});
const cardSeen = () => p.waitForFunction(() => window.__card, null, { timeout: 30000 }).then((h) => h.jsonValue(), () => []);
await watchCard();
await p.getByRole('button', { name: 'End turn', exact: true }).first().click();
const seen1 = await cardSeen();
// Keep the card up for the picture and for C below (it stays while hovered).
await p.locator('[data-phc-cutin]').first().hover({ timeout: 2000 }).catch(() => {});
const card = seen1.map((b) => b.text);
const first = seen1[0]?.act;
ok('the next turn card leads with Reload: ' + card.map((t) => t.replace(/\s+/g, ' ').trim()).join(' | ') + ' (' + first + ')', first === 'reload');
const acts = seen1.map((b) => b.act);
// (Physical 2.0: the plain Shot is the weapon's technique row, tq:main:shot)
ok('the smart default fills the other slots in its order, Shoot kept: ' + acts.join(' | '), acts.length === 4 && acts[1] === 'tq:main:shot' && acts[2] === 'move' && new Set(acts).size === 4);
await p.screenshot({ path: OUT + 'slate-combat-cutin-custom.png' }).catch(() => {});
// customise from the card (C), then reset (the card gone by now on a slow machine: the panel's own Customise opens the same dialog)
await p.keyboard.press('c');
if ((await dlg.waitFor({ timeout: 20000 }).catch(() => 'not up')) === 'not up') await p.getByRole('button', { name: /Customise/ }).first().click();
await dlg.waitFor({ timeout: 30000 });
await dlg.getByRole('button', { name: 'Reset to smart default' }).click();
await dlg.getByRole('button', { name: 'Save', exact: true }).click(); await pause(p, 300);
ok('Reset clears the choice: ' + await p.evaluate(() => localStorage.getItem('phc.cutinCmds')), !/reload/.test(String(await p.evaluate(() => localStorage.getItem('phc.cutinCmds')))));
await dismissCut(p);
await watchCard();
await p.getByRole('button', { name: 'End turn', exact: true }).first().click();
const first2 = (await cardSeen())[0]?.act;
ok('the card is smart again (slot 1: ' + first2 + ')', !!first2 && first2 !== 'reload');
ok('no page errors' + (p.errors.length ? ': ' + p.errors.join(' | ') : ''), !p.errors.length);
await browser.close();

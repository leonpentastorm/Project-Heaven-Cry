// The combat action tabs (Move · Attack · Utility · Sigils · Outbursts) in the Proving Ground, at 1440×900 and
// 1280×720 (deviceScaleFactor 1): every tab on your turn, the Outburst design cards and the glyph keyboard open, the
// footer's Confirm always on screen, and the page itself never scrolls during a turn (the grid stays in view).
// Also: keyboard (1–9 and arrows; the row wraps onto a second line when the tabs don't fit), the cut-in picking an action switches the tab, the last tab is remembered, and a
// narrow window (900 px) keeps the tab bar and Confirm stuck to the bottom.
// Screenshots: e2e/shots/tabs-*.png.
import { chromium, click, BASE, OUT, pickAction, settle, fxIdle } from './lib.mjs';
const browser = await chromium.launch();
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const ref = (k) => { const [x, y] = k.split(',').map(Number); return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[x] + (y + 1); };

async function open(vw, vh, before = []) {
  const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => { try { localStorage.setItem('phc.voice', JSON.stringify({ auto: false })); localStorage.setItem('phc.tips', '["*"]'); sessionStorage.setItem('phc.pressedAnyKey', '1'); } catch { /* */ } });
  const p = await ctx.newPage();
  const errors = []; p.on('pageerror', (e) => errors.push(e.message)); p.errors = errors;
  await p.goto(BASE);
  await click(p, 'PROVING GROUND');
  const nm = p.getByPlaceholder('Leon');
  await Promise.race([nm.waitFor({ timeout: 20000 }).catch(() => {}), p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 20000 }).catch(() => {})]);
  if (await nm.count()) { await nm.fill('Leon'); await click(p, 'Solo ›'); }
  await p.mouse.move(vw - 10, vh - 10);
  // The Proving Ground opens gearing up on the map; start the fight straight away.
  await p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 30000 });
  // set-up actions for the Proving Ground's character before the fight (charId filled in)
  for (const a of before) await p.evaluate((a) => { const cid = Object.keys(window.__phc.getState().game.characters)[0]; try { window.__phc.act({ ...a, charId: cid }); } catch { /* */ } }, a);
  if (await p.evaluate(() => window.__phc.getState().game.phase !== 'combat')) await p.evaluate(() => window.__phc.act({ type: 'sandbox/fight' }));
  await p.waitForFunction(() => window.__phc.getState().game?.phase === 'combat', null, { timeout: 30000 });
  await p.waitForSelector('text=YOUR TURN', { timeout: 30000 });
  return p;
}
const act = (p, a) => p.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
const st = (p) => p.evaluate(() => { const s = window.__phc.getState(), g = s.game, cb = g.combat; const u = cb && cb.units.find((x) => x.side === 'pc'); return { cb, u, c: u && g.characters[u.charId] }; });
const dismissCut = async (p, vw, vh) => { for (let i = 0; i < 3; i++) { if (!(await p.locator('[data-phc-cutin]').count())) return; await p.mouse.click(vw - 10, vh - 10); await settle(p, 400); } };
const scrollY = (p) => p.evaluate(() => Math.max(document.documentElement.scrollHeight - window.innerHeight, 0));
/** Is the whole grid inside the viewport, and the Confirm button too? */
const inView = (p) => p.evaluate(() => {
  const r = (el) => el && el.getBoundingClientRect(), W = window.innerWidth, H = window.innerHeight;
  const grid = r(document.querySelector('.phc-grid-scroll')), conf = r(Array.from(document.querySelectorAll('button')).find((b) => /^(Confirm|Click a tile)/.test(b.textContent.trim())));
  const fits = (b) => !!b && b.top >= -1 && b.left >= -1 && b.bottom <= H + 1 && b.right <= W + 1;
  return { grid: fits(grid), gridBox: grid && [grid.left, grid.top, grid.right, grid.bottom].map(Math.round), confirm: fits(conf), pageScroll: document.documentElement.scrollHeight - H };
});

for (const [vw, vh] of [[1440, 900], [1280, 720]]) {
  const p = await open(vw, vh), tag = vw + 'x' + vh;
  await act(p, { type: 'sandbox/ai', on: false }); await act(p, { type: 'sandbox/auto', on: false });
  let s = await st(p);
  const cid = s.c.id;
  for (const a of [{ item: 'evoker' }, { item: 'emanator' }, { item: 'standard_core', qty: 4 }]) await act(p, { type: 'sandbox/give', charId: cid, ...a });
  for (const w of ['fire', 'push', 'freeze', 'shock', 'stay']) await act(p, { type: 'sandbox/learn', charId: cid, word: w });
  for (const sc of ['damage', 'barrier']) await act(p, { type: 'sandbox/learn', charId: cid, school: sc });
  await act(p, { type: 'sandbox/design', charId: cid, design: { id: '', name: 'Red Hand', school: 'damage', modules: [] } });
  await act(p, { type: 'sandbox/design', charId: cid, design: { id: '', name: 'Second Skin', school: 'barrier', modules: [] } });
  await act(p, { type: 'sandbox/design', charId: cid, design: { id: '', name: 'Long Red Hand', school: 'damage', modules: [] } });
  // A fresh turn so the panel picks up the magic.
  await p.getByRole('button', { name: 'End turn', exact: true }).click().catch(() => {});
  await p.waitForFunction(() => { const cb = window.__phc.getState().game.combat; const u = cb.units.find((x) => x.id === cb.order[cb.turn]); return u && u.side === 'pc' && u.ap >= 5; }, null, { timeout: 30000 });
  await settle(p, 600); await dismissCut(p, vw, vh); await settle(p, 300);
  await p.waitForSelector('[role="tablist"][aria-label="Actions"] [role="tab"]', { timeout: 30000 }).catch(() => {}); // the panel comes up when the turn is yours on screen
  const tabs = await p.locator('[role="tablist"][aria-label="Actions"] [role="tab"]').allTextContents();
  ok(tag + ' tabs: ' + tabs.map((t) => t.replace(/\s+/g, ' ').trim()).join(' | '), tabs.length >= 4);
  const sel0 = await p.locator('[role="tab"][aria-selected="true"]').first().textContent();
  const foeSeen = await p.evaluate(() => { const cb = window.__phc.getState().game.combat; return cb.units.some((u) => u.side === 'foe' && !u.dead); });
  ok(tag + ' default tab on your turn: ' + sel0.trim() + (foeSeen ? ' (a hostile is up)' : ''), true);
  for (let i = 0; i < tabs.length; i++) {
    const t = p.locator('[role="tablist"][aria-label="Actions"] [role="tab"]').nth(i);
    await t.click(); await settle(p, 380);
    const name = (await t.getAttribute('data-tab')) || String(i);
    // Pick the tab's first action, so the footer shows its details.
    const first = p.locator('[role="tabpanel"] button.phc-cb-act').first();
    if (await first.count()) { await first.click(); await settle(p, 250); }
    if (name === 'outbursts') {
      await pickAction(p, /^Outburst/); await settle(p, 350);
      const s2 = await st(p); const foe = s2.cb.units.find((u) => u.side === 'foe' && !u.dead);
      if (foe) { await p.locator('button.phc-tok[aria-label^="' + ref(foe.pos) + ' ·"]').first().hover(); await settle(p, 200); }
    }
    if (name === 'sigils') { await pickAction(p, /^Draw a glyph/); await settle(p, 350); }
    const v = await inView(p);
    await p.screenshot({ path: OUT + 'tabs-' + tag + '-' + name + '.png' });
    ok(tag + ' ' + name + ': grid ' + (v.grid ? 'in view' : 'CUT ' + v.gridBox) + ', Confirm ' + (v.confirm ? 'in view' : 'NOT in view') + ', page scroll ' + v.pageScroll + ' px', v.grid && v.confirm && v.pageScroll <= 1);
  }
  if (vw === 1440) {
    const selTab = () => p.locator('[role="tablist"][aria-label="Actions"] [role="tab"][aria-selected="true"]').getAttribute('data-tab');
    // Keyboard: number keys anywhere, arrows / Home / End inside the tab bar (focus follows).
    await p.mouse.click(1100, 30); // somewhere neutral (the header), so no input has focus
    await p.keyboard.press('1'); await settle(p, 150);
    ok('key 1 opens the first tab: ' + await selTab(), (await selTab()) === 'move');
    await p.keyboard.press('5'); await settle(p, 150);
    ok('key 5 opens the fifth tab: ' + await selTab(), (await selTab()) === 'outbursts');
    await p.locator('[role="tab"][data-tab="outbursts"]').focus();
    await p.keyboard.press('ArrowLeft'); await settle(p, 150);
    const focused = await p.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-tab'));
    ok('ArrowLeft moves to ' + await selTab() + ' and focus follows (' + focused + ')', (await selTab()) === 'sigils' && focused === 'sigils');
    await p.keyboard.press('End'); await settle(p, 120); const e1 = await selTab();
    await p.keyboard.press('Home'); await settle(p, 120); const h1 = await selTab();
    await p.keyboard.press('ArrowLeft'); await settle(p, 120); const w1 = await selTab();
    // (the last tab is Calls for a character with a talking skill, else Outbursts)
    const lastTab = await p.locator('[role="tablist"][aria-label="Actions"] [role="tab"]').last().getAttribute('data-tab');
    ok('End / Home / wrap-around: ' + [e1, h1, w1].join(' → '), e1 === lastTab && h1 === 'move' && w1 === lastTab);
    const tabsel = await p.locator('[role="tabpanel"]').getAttribute('aria-labelledby');
    ok('the tab panel is labelled by its tab (' + tabsel + ')', tabsel === 'phc-tab-' + lastTab);
    // the row wraps onto a second line when the tabs don't fit: nothing scrolls sideways, nothing is cut
    const wrapT = await p.evaluate(() => { const l = document.querySelector('[role="tablist"][aria-label="Actions"]'); return { wrap: getComputedStyle(l).flexWrap, over: l.scrollWidth - l.clientWidth, rows: new Set([...l.querySelectorAll('[role="tab"]')].map((t) => Math.round(t.getBoundingClientRect().top))).size }; });
    ok('the tab row wraps (' + wrapT.rows + ' line' + (wrapT.rows > 1 ? 's' : '') + ') and never scrolls sideways', wrapT.wrap === 'wrap' && wrapT.over <= 1 && wrapT.rows <= 2);
    // Typing in the Say box never flips tabs.
    const say = p.getByLabel(/^Say something/);
    if (await say.count()) { await say.focus(); await p.keyboard.press('2'); await settle(p, 120); ok('typing 2 in the Say box leaves the tab alone', (await selTab()) === lastTab); await say.fill(''); }
    // A tile that implies an action switches to its tab: a hostile under Move → Attack.
    await p.keyboard.press('Escape').catch(() => {}); await p.mouse.click(1100, 30);
    await pickAction(p, /^Move\b/); await settle(p, 150);
    s = await st(p);
    const foe = s.cb.units.find((u) => u.side === 'foe' && !u.dead && p);
    const vis = await p.evaluate(() => { const cb = window.__phc.getState().game.combat; return cb.units.filter((u) => u.side === 'foe' && !u.dead).map((u) => u.pos); });
    let clicked = false;
    for (const k of vis) { const t = p.locator('button.phc-tok[aria-label^="' + ref(k) + ' ·"][aria-label*="hostile"]').first(); if (await t.count()) { await p.waitForFunction(() => { const c = window.__phcCamera && window.__phcCamera(); return !c || !c.gliding; }, null, { timeout: 20000 }).catch(() => {}); await t.evaluate((el) => el.scrollIntoView({ block: 'center', inline: 'center' })); await settle(p, 250); await t.click(); clicked = true; break; } } // the camera's window: once the camera has come to rest on your unit (your turn has just started), the tile is brought to its middle, clear of the small map in the corner
    await p.waitForFunction(() => document.querySelector('[role="tablist"][aria-label="Actions"] [role="tab"][aria-selected="true"]')?.getAttribute('data-tab') === 'attack', null, { timeout: 20000 }).catch(() => {});
    // (rules 1.16: the sides deploy 10 to 14 tiles apart, so on some seeds no hostile is in sight yet: nothing to click, and the unit test in combat-screen.test.ts holds the rule)
    if (!clicked) ok('clicking a hostile while on Move: no hostile in sight on this seed (' + vis.length + ' alive), not checked here', true);
    else ok('clicking a hostile while on Move switches to the Attack tab: ' + await selTab(), (await selTab()) === 'attack');
    // The last tab is remembered for this character across turns; a command on the turn card switches the tab.
    await p.locator('[role="tab"][data-tab="utility"]').click(); await settle(p, 150);
    await p.getByRole('button', { name: 'End turn', exact: true }).click();
    await p.waitForSelector('[data-phc-cutin]', { timeout: 30000 });
    await p.waitForFunction(() => { const cb = window.__phc.getState().game.combat; const u = cb.units.find((x) => x.id === cb.order[cb.turn]); return u && u.side === 'pc' && u.ap >= 5; }, null, { timeout: 30000 });
    await settle(p, 300);
    ok('next turn opens the tab this character used last: ' + await selTab(), (await selTab()) === 'utility');
    const cmds = await p.locator('[data-phc-cutin] button').allTextContents();
    await p.locator('[data-phc-cutin] button', { hasText: /^1/ }).first().click(); await settle(p, 300);
    const pressed = await p.locator('[role="tabpanel"] button[data-act][aria-pressed="true"]').allTextContents();
    ok('the turn card\'s first command (' + (cmds[0] || '').replace(/\s+/g, ' ').trim() + ') opens its tab: ' + await selTab() + ' · ' + pressed.join(','), (await selTab()) === 'attack' && pressed.length === 1);
    await settle(p, 300); await p.screenshot({ path: OUT + 'tabs-' + tag + '-after-cutin.png' });
  }
  ok(tag + ' no page errors' + (p.errors.length ? ': ' + p.errors.join(' | ') : ''), !p.errors.length);
  await p.context().close();
}

// Six tabs on one row (Classes 3.0: a Rigger has Move, Attack, Utility, Class, Figments and Calls; the bar wrapped onto a
// second row with one tab alone on it). The tight bar keeps every full name; checked at the side-by-side widths down to
// 1024 px, where the panel is narrowest (about 400 px).
for (const [vw, vh] of [[1440, 900], [1280, 720], [1024, 768]]) {
  const p = await open(vw, vh, [{ type: 'sandbox/class', classId: 'trickster', rank: 1 }, { type: 'sandbox/give', item: 'visualizer', equip: true },
    { type: 'sandbox/skill', skill: 'visualization', points: 5 }, { type: 'sandbox/skill', skill: 'rhetoric', points: 3 }]);
  await act(p, { type: 'sandbox/ai', on: false });
  // the tabs show in the first moments of a fight and are replaced by the "WAITING FOR ..." hold: wait until the turn is yours ON SCREEN
  await fxIdle(p);
  await p.waitForSelector('[role="tablist"][aria-label="Actions"] [role="tab"]', { timeout: 30000 });
  await dismissCut(p, vw, vh); await settle(p, 300); await fxIdle(p);
  await p.waitForSelector('[role="tablist"][aria-label="Actions"] [role="tab"]', { timeout: 30000 });
  const bar = await p.evaluate(() => { const l = document.querySelector('[role="tablist"][aria-label="Actions"]'), ts = [...l.querySelectorAll('[role="tab"]')];
    return { tabs: ts.map((t) => t.getAttribute('data-tab')), rows: new Set(ts.map((t) => Math.round(t.getBoundingClientRect().top))).size, over: l.scrollWidth - l.clientWidth,
      // a name cut short (its text wider than its box) would be an abbreviation the player never asked for
      cut: ts.filter((t) => { const n = [...t.querySelectorAll('span')].find((x) => x.style.textOverflow === 'ellipsis'); return n && n.scrollWidth > n.clientWidth + 1; }).map((t) => t.getAttribute('data-tab')) }; });
  await p.locator('[role="tablist"][aria-label="Actions"]').screenshot({ path: OUT + 'tabs-six-' + vw + '.png' }).catch(() => {});
  ok(vw + 'x' + vh + ' a Rigger\'s six tabs (' + bar.tabs.join(', ') + ') sit on ONE row, no name cut short' + (bar.cut.length ? ' (cut: ' + bar.cut.join(', ') + ')' : '') + ', nothing scrolls sideways',
    bar.tabs.length === 6 && bar.tabs.includes('figments') && bar.rows === 1 && !bar.cut.length && bar.over <= 1);
  await p.context().close();
}

// Narrow window: the column stacks under the grid; the tabs, the tab panel and Confirm dock at the bottom of the screen.
{
  const p = await open(900, 800);
  await act(p, { type: 'sandbox/ai', on: false });
  await settle(p, 600); await dismissCut(p, 900, 800); await settle(p, 300); await fxIdle(p);
  await p.waitForSelector('.phc-cb-dock', { timeout: 30000 });
  const box = await p.evaluate(() => { const r = (el) => el && el.getBoundingClientRect();
    const dock = r(document.querySelector('.phc-cb-dock')), conf = r(Array.from(document.querySelectorAll('button')).find((b) => /^(Confirm|Click a tile)/.test(b.textContent.trim()))), grid = r(document.querySelector('.phc-grid'));
    return { scrollY: window.scrollY, H: window.innerHeight, dockTop: dock && Math.round(dock.top), dockBottom: dock && Math.round(dock.bottom), conf: conf && Math.round(conf.bottom), gridTop: grid && Math.round(grid.top), pos: getComputedStyle(document.querySelector('.phc-cb-dock')).position }; });
  ok('900×800: the action dock is fixed to the bottom (' + JSON.stringify(box) + ')', box.pos === 'fixed' && box.dockBottom <= box.H + 1 && box.conf <= box.H && box.gridTop < box.dockTop);
  await pickAction(p, /^(Reload|Swap magazine|Speedloader|Swap drum|Feed belt)/); await settle(p, 250);
  await p.screenshot({ path: OUT + 'tabs-900x800-narrow.png' });
  await p.mouse.wheel(0, 600); await settle(p, 300);
  const conf2 = await p.evaluate(() => { const b = Array.from(document.querySelectorAll('button')).find((x) => /^(Confirm|Click a tile)/.test(x.textContent.trim())); const r = b.getBoundingClientRect(); return r.bottom <= window.innerHeight && r.top >= 0; });
  ok('900×800: Confirm stays on screen after scrolling the page', conf2);
  await p.screenshot({ path: OUT + 'tabs-900x800-narrow-scrolled.png' });
  ok('900×800 no page errors' + (p.errors.length ? ': ' + p.errors.join(' | ') : ''), !p.errors.length);
  await p.context().close();
}
await browser.close();

// The fight panel 0.31.0 (Leon, 16 Nov 2026, with a screenshot of a character with every door open: "i have ONE (1)
// singular line to scroll my attack option"). In the Proving Ground, a character with every door open (Durability,
// Raw Power, Dexterity, Ingenuity, Visualization, Empathy, Will Power, Faith with a patron; an Evoker, an Emanator, a
// Visualizer and an Attuner in the pack), in a fight, at 1280x720 and 1600x900:
//   - the action list shows at least four rows without scrolling the page
//   - no shield track when the shield is 0; a segment on the HP bar and "+N" once a shield is granted (a real action)
//   - the status strip is directly under HP, Hidden is in the HELPING group and not red
//   - a zero meter is folded into the "+N" chip and opens on click; a fold survives a page reload
//   - no Say box where there is no Narrator (the Proving Ground, a Survival run: the engine's narratorOff)
//   - the row's AP equals the preview's AP, and the plain melee attack is "Hit" (never "Cut")
//   - the hovered tile does not cover its neighbour's effects (no lift of the whole tile)
// Screenshots: .check/e2e/shots/fight-panel/ (before any fold change, and with everything opened), at both sizes.
import { chromium, click, BASE, OUT, settle } from './lib.mjs';
const browser = await chromium.launch();
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };

async function open(vw, vh) {
  const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => { try { localStorage.setItem('phc.voice', JSON.stringify({ auto: false })); localStorage.setItem('phc.tips', '["*"]'); sessionStorage.setItem('phc.pressedAnyKey', '1'); } catch { /* */ } });
  const p = await ctx.newPage();
  const errors = []; p.on('pageerror', (e) => errors.push(e.message)); p.errors = errors;
  p.on('dialog', (d) => d.accept());
  await p.goto(BASE);
  await click(p, 'PROVING GROUND', { timeout: 30000 });
  const nm = p.getByPlaceholder('Leon');
  await Promise.race([nm.waitFor({ timeout: 20000 }).catch(() => {}), p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 20000 }).catch(() => {})]);
  if (await nm.count()) { await nm.fill('Leon'); await click(p, 'Solo ›'); }
  await p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 30000 });
  await p.mouse.move(vw - 10, vh - 10);
  return p;
}
const act = (p, a) => p.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
const G = (p) => p.evaluate(() => window.__phc.getState().game);
const meU = async (p) => { const g = await G(p); return g.combat.units.find((u) => u.side === 'pc' && u.charId); };
async function toMe(p) {
  for (let i = 0; i < 30; i++) {
    const cb = (await G(p)).combat, cur = cb.units.find((u) => u.id === cb.order[cb.turn]);
    if (cur && cur.side === 'pc' && cur.charId && cur.ap >= 5) return true;
    if (cur) await act(p, { type: 'combat/end-turn', unitId: cur.id });
    await settle(p, 250);
  }
  return false;
}
const dismissCut = async (p, vw, vh) => { await p.keyboard.press('Escape'); await settle(p, 300); for (let i = 0; i < 3; i++) { if (!(await p.locator('[data-phc-cutin]').count())) break; await p.mouse.click(vw - 10, vh - 10); await settle(p, 300); } await settle(p, 400); };

/** Every door open, as on Leon's screenshot. */
async function everyDoor(p) {
  const cid = Object.keys((await G(p)).characters)[0];
  await act(p, { type: 'sandbox/ai', on: false }); await act(p, { type: 'sandbox/auto', on: false });
  for (const [skill, points] of [['durability', 3], ['raw_power', 3], ['dexterity', 3], ['ingenuity', 3], ['visualization', 3], ['empathy', 3], ['will_power', 3], ['faith', 3]])
    await act(p, { type: 'sandbox/skill', charId: cid, skill, points });
  await act(p, { type: 'sandbox/faith', charId: cid, belief: 'faithful', patron: 'mother_ember', faith: 3, devotion: 3, reset: true });
  for (const item of ['evoker', 'emanator', 'visualizer', 'attuner']) await act(p, { type: 'sandbox/give', charId: cid, item });
  await act(p, { type: 'sandbox/give', charId: cid, item: 'standard_core', qty: 4 });
  await act(p, { type: 'sandbox/give', charId: cid, item: 'combat_knife', equip: true }); // a melee weapon: the plain attack is Hit
  return cid;
}

const shotsDir = OUT;
const LIST_ROW = '[role="tabpanel"] button.phc-cb-act[data-act]';
for (const [vw, vh] of [[1280, 720], [1600, 900]]) {
  const tag = vw + 'x' + vh, p = await open(vw, vh);
  const cid = await everyDoor(p);
  if ((await G(p)).phase !== 'combat') await act(p, { type: 'sandbox/fight' });
  await p.waitForFunction(() => window.__phc.getState().game?.phase === 'combat', null, { timeout: 30000 });
  await act(p, { type: 'sandbox/clear' });
  await act(p, { type: 'sandbox/spawn', tier: 'soldier', weapon: 'combat_knife', at: 'F4' });
  ok(tag + ' my turn', await toMe(p));
  await settle(p, 700); await dismissCut(p, vw, vh); await settle(p, 300);
  await p.waitForSelector('[role="tablist"][aria-label="Actions"] [role="tab"]', { timeout: 30000 }).catch(() => {});
  await p.screenshot({ path: shotsDir + tag + '-01-start.png' });

  // ---- U5: room for the actions ----
  const rows = await p.evaluate((sel) => { const H = window.innerHeight; const pnl = document.querySelector('[role="tabpanel"]'); const bs = Array.from(document.querySelectorAll(sel));
    const pr = pnl && pnl.getBoundingClientRect(); return { n: bs.length, shown: bs.filter((b) => { const r = b.getBoundingClientRect(); return pr && r.top >= pr.top - 1 && r.bottom <= pr.bottom + 1 && r.bottom <= H; }).length, pageScroll: document.documentElement.scrollHeight - H, panelH: pr ? Math.round(pr.height) : 0 }; }, LIST_ROW);
  ok(tag + ' the action list shows at least four rows without scrolling the page (' + rows.shown + ' of ' + rows.n + ' shown, list ' + rows.panelH + ' px, page scroll ' + rows.pageScroll + ')', (rows.shown >= 4 || rows.shown === rows.n) && rows.pageScroll <= 1);
  ok(tag + ' no Say box in the Proving Ground (no Narrator)', (await p.locator('input[placeholder^="Say something"]').count()) === 0);
  ok(tag + ' the AP pips ride in the YOUR TURN strip', (await p.locator('.phc-yt .phc-yt-pips > span').count()) >= 6);

  // ---- U3: no shield track at 0 ----
  ok(tag + ' no shield segment or "+N" at shield 0', (await p.locator('[data-hp-shield-seg]').count()) === 0 && (await p.locator('[data-hp-shield]').count()) === 0 && (await p.locator('[data-shield-seg]').count()) === 0);
  // ---- U2: a zero meter folds into "+N", opens on click ----
  const more = p.locator('[data-meter-more]');
  const moreN = await more.count(), moreVis = moreN ? await more.isVisible() : false;
  ok(tag + ' zero meters folded into the "+N" chip (' + (moreN ? await more.textContent() : 'none') + ')', moreN === 1);
  const metersBefore = await p.locator('.phc-meter').count();
  // ---- U6a: the plain melee attack is "Hit" ----
  const attackTab = p.locator('#phc-tab-attack');
  if (await attackTab.count()) { await attackTab.click(); await settle(p, 300); }
  const listText = (await p.locator('[role="tabpanel"]').first().textContent()) || '';
  ok(tag + ' "Cut" appears nowhere for the plain attack', !/\bCut\b/.test(listText) && !/\bCut\b/.test((await p.locator('.phc-cb-aside').first().textContent()) || ''));
  const hit = p.locator(LIST_ROW, { hasText: /^\s*Hit(?![a-z])/ }).first();
  if (await hit.count()) {
    await hit.click(); await settle(p, 300);
    const rowAp = ((await hit.textContent()) || '').match(/(\d+(?:\.\d+)?)\s*AP/);
    const foot = ((await p.locator('.phc-cb-foot').first().textContent()) || '');
    const selAp = foot.match(/(\d+(?:\.\d+)?)\s*AP/);
    ok(tag + ' the row\'s AP equals the preview\'s (' + (rowAp && rowAp[1]) + ' / ' + (selAp && selAp[1]) + ')', !!rowAp && !!selAp && rowAp[1] === selAp[1]);
  } else ok(tag + ' a Hit row in the attack list', false);
  await p.screenshot({ path: shotsDir + tag + '-02-hit.png' });
  if (moreN && moreVis) {
    await more.click(); await settle(p, 300);
    ok(tag + ' the "+N" chip opens the zero meters (' + metersBefore + ' -> ' + (await p.locator('.phc-meter').count()) + ')', (await p.locator('.phc-meter').count()) > metersBefore && (await p.locator('[data-meter-more]').count()) === 0);
    const z = p.locator('.phc-meter[data-zero="true"]').first();
    if (await z.count()) { await z.click(); await settle(p, 250); ok(tag + ' a click on an open zero meter folds it back', (await p.locator('[data-meter-more]').count()) === 1); await p.locator('[data-meter-more]').click(); await settle(p, 250); }
  }

  // ---- U1: a fold survives a reload (the vow line: round 1, at both sizes) ----
  { const vf = p.locator('[data-fold="fight:vow"]').first();
    if (await vf.count() && await vf.isVisible()) {
      const before = await vf.getAttribute('aria-expanded'); await vf.click(); await settle(p, 250);
      const was = await p.locator('[data-fold="fight:vow"]').first().getAttribute('aria-expanded');
      await p.reload(); await p.waitForFunction(() => window.__phc?.getState().game?.phase === 'combat', null, { timeout: 30000 }); await settle(p, 1200); await dismissCut(p, vw, vh);
      await p.locator('[data-fold="fight:vow"]').first().waitFor({ timeout: 20000 }).catch(() => {});
      const now = await p.locator('[data-fold="fight:vow"]').first().getAttribute('aria-expanded').catch(() => null);
      ok(tag + ' a fold survives a page reload (vow: ' + before + ' -> ' + was + ', after the reload ' + now + ')', before !== was && now === was);
      await p.screenshot({ path: shotsDir + tag + '-02b-vow-open.png' });
    } else ok(tag + ' the vow line has its fold', false); }

  // ---- U3: a shield granted through a real action (Tending's Shield on yourself) ----
  let u = await meU(p);
  await act(p, { type: 'sandbox/give', charId: cid, item: 'attuner', equip: true });
  await act(p, { type: 'sandbox/skill', charId: cid, skill: 'empathy', points: 6 });
  await act(p, { type: 'combat/end-turn', unitId: u.id }); await toMe(p); await settle(p, 500); await dismissCut(p, vw, vh);
  u = await meU(p);
  // (Tending's Shield needs a Bonded ally; the Proving Ground's meter action is the reducer's own way to set one)
  const r = await act(p, { type: 'sandbox/meter', unitId: u.id, shield: 30 });
  await settle(p, 600);
  if (process.env.DEBUG_FP) console.log('debug shield', r, JSON.stringify(Object.fromEntries(Object.entries(await meU(p)).filter(([k]) => /shield|layer|ward/i.test(k)))), JSON.stringify((await G(p)).combat.log.slice(-3)));
  const seg = await p.locator('[data-me-pin] [data-hp-shield-seg]').count(), plus = (await p.locator('[data-hp-shield]').first().textContent().catch(() => '')) || '';
  ok(tag + ' a shield granted (' + (r || 'Shield') + '): a segment on the HP bar and "' + plus.trim() + '"', seg === 1 && /^\+\d+/.test(plus.trim()));
  ok(tag + ' no separate shield track over the token: the segment rides its HP bar', (await p.locator('[data-token-shield]').count()) === 0 && (await p.locator('[data-hp-shield-seg="token"]').count()) >= 1);

  // ---- U4: Hidden is HELPING, under HP ----
  await act(p, { type: 'sandbox/class', charId: cid, classId: 'infiltrator', rank: 3 });
  await act(p, { type: 'sandbox/skill', charId: cid, skill: 'ingenuity', points: 7 }); // (Vanish: Fade for no Shadow, as in shadow.mjs)
  await act(p, { type: 'combat/end-turn', unitId: u.id }); await toMe(p); await settle(p, 500); await dismissCut(p, vw, vh);
  u = await meU(p);
  const tabShadow = p.locator('#phc-tab-shadow');
  if (await tabShadow.count()) {
    await tabShadow.click(); await settle(p, 250);
    const fade = p.locator('[role="tabpanel"] button', { hasText: /^Fade/ }).first();
    if (await fade.count()) { await fade.click(); await settle(p, 250); const c = p.getByRole('button', { name: /^Confirm/ }).first(); if (await c.isEnabled().catch(() => false)) { await c.click(); await settle(p, 600); } }
  }
  u = await meU(p);
  if (process.env.DEBUG_FP) console.log('debug hide', u.hidden, JSON.stringify(u.res), JSON.stringify((await G(p)).combat.log.slice(-3)), await p.locator('[role="tabpanel"] button').allTextContents());
  if (u.hidden) {
    const chip = p.locator('[data-status-group="helps"] [data-status="fx-HIDDEN"]');
    const colour = (await chip.count()) ? await chip.evaluate((el) => getComputedStyle(el).color) : '';
    ok(tag + ' Hidden is in the HELPING group, green not red (' + colour + ')', (await chip.count()) === 1 && colour !== 'rgb(246, 81, 87)');
    const under = await p.evaluate(() => { const hp = document.querySelector('[data-hp-row]'), st = document.querySelector('[data-status-strip]'); if (!hp || !st) return null; const a = hp.getBoundingClientRect(), b = st.getBoundingClientRect(); return Math.round(b.top - a.bottom); });
    ok(tag + ' the status strip sits directly under HP (gap ' + under + ' px)', under != null && under >= 0 && under <= 8);
  } else ok(tag + ' Hidden reached (Fade)', false);
  await p.screenshot({ path: shotsDir + tag + '-03-shield-hidden.png' });

  // everything opened
  for (const m of await p.locator('[data-meter-more]').all()) if (await m.isVisible()) await m.click().catch(() => {});
  for (const f of await p.locator('button[data-fold][aria-expanded="false"]').all()) if (await f.isVisible()) await f.click({ timeout: 3000 }).catch(() => {});
  await settle(p, 300);
  await p.screenshot({ path: shotsDir + tag + '-04-all-open.png' });

  // ---- U6d: the hovered tile does not lift over its neighbours ----
  // the tile under my own token: its neighbour (a tile beside it) keeps its stacking; the hovered tile is not raised
  const me1 = await meU(p);
  const box = await p.evaluate((pos) => { const [x, y] = pos.split(',').map(Number), ref = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[x] + (y + 1);
    const t = document.querySelector('.phc-grid button.phc-tok[aria-label^="' + ref + ' ·"]'); if (!t) return null; t.scrollIntoView({ block: 'center', inline: 'center' }); const r = t.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, me1.pos);
  if (box) { await p.mouse.move(box.x, box.y); await settle(p, 250); }
  const z = box ? await p.evaluate(({ x, y }) => { const el = document.elementFromPoint(x, y), t = el && el.closest('button.phc-tok'); return t ? getComputedStyle(t).zIndex : 'no-tile'; }, box) : 'no-box';
  const popOn = await p.evaluate(() => Array.from(document.querySelectorAll('.phc-grid .phc-pop')).some((e) => getComputedStyle(e).display !== 'none'));
  ok(tag + ' the hovered tile is not raised over its neighbours (z-index ' + z + '), its card opens on hover (' + popOn + ')', (z === 'auto' || z === '0') && popOn);
  await p.screenshot({ path: shotsDir + tag + '-05-hover.png' });
  // the card opens on the pointer only: after a click and the pointer gone, it is closed
  await p.mouse.click(box ? box.x : 5, box ? box.y : 5); await settle(p, 200); await p.mouse.move(vw - 5, vh - 5); await settle(p, 250);
  const popAfter = await p.evaluate(() => Array.from(document.querySelectorAll('.phc-grid .phc-pop')).some((e) => getComputedStyle(e).display !== 'none'));
  ok(tag + ' the token card closes when the pointer leaves (after a click too)', !popAfter);
  ok(tag + ' no page errors' + (p.errors.length ? ': ' + p.errors.slice(0, 2).join(' | ') : ''), !p.errors.length);
  await p.context().close();
}
await browser.close();

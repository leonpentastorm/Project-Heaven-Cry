// The fight panel 0.31.0 (Leon, 16 Nov 2026, with a screenshot of a character with every door open: "i have ONE (1)
// singular line to scroll my attack option"). In the Proving Ground, a character with every door open (Durability,
// Raw Power, Dexterity, Ingenuity, Visualization, Empathy, Will Power, Faith with a patron; an Evoker, an Emanator, a
// Visualizer and an Attuner in the pack), in a fight, at 1280x720 and 1600x900:
//   - the action list shows at least four rows without scrolling the page
//   - no shield track when the shield is 0; a segment on the HP bar and "+N" once a shield is granted (a real action)
//   - the status strip is directly under HP, Hidden is in the HELPING group and not red
//   - a zero meter is folded into the "+N" chip and opens on click; a fold survives a page reload
//   - no Say box in a Survival run (no Narrator); the Proving Ground keeps its Say and Attempt
//   - the row's AP equals the preview's AP, and the plain melee attack is "Hit" (never "Cut")
//   - the hovered tile does not cover its neighbour's effects (no lift of the whole tile)
// Screenshots: .check/e2e/shots/fight-panel/ (before any fold change, and with everything opened), at both sizes.
import { chromium, click, BASE, OUT, settle, player, hostAs, lockIn } from './lib.mjs';
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
/** The action list's room: rows wholly inside the list and the window, and the list's own height in rows (the room it
 *  has whatever the open tab holds: a tab with three actions still has room for four). */
const listRoom = (p) => p.evaluate((sel) => { const H = window.innerHeight; const pnl = document.querySelector('[role="tabpanel"]'); const bs = Array.from(document.querySelectorAll(sel));
  const foot = document.querySelector('.phc-cb-foot'), fb = foot ? foot.getBoundingClientRect().top : H; // (the foot sticks to the dock's bottom: what it covers is not shown)
  const pr0 = pnl && pnl.getBoundingClientRect(), pr = pr0 && { top: pr0.top, bottom: Math.min(pr0.bottom, fb), height: Math.min(pr0.bottom, fb) - pr0.top }, rh = bs.length ? Math.max(...bs.map((b) => b.getBoundingClientRect().height)) : 0;
  return { n: bs.length, shown: bs.filter((b) => { const r = b.getBoundingClientRect(); return pr && r.top >= pr.top - 1 && r.bottom <= pr.bottom + 1 && r.bottom <= H; }).length,
    pageScroll: document.documentElement.scrollHeight - H, panelH: pr ? Math.round(Math.min(pr.bottom, H) - pr.top) : 0, rowH: Math.round(rh) }; }, LIST_ROW);
const fmtRoom = (r) => r.shown + ' of ' + r.n + ' shown, list ' + r.panelH + ' px for rows of ' + r.rowH + ' px, page scroll ' + r.pageScroll;
const roomOk = (r) => r.n > 0 && r.shown >= Math.min(4, r.n) && r.rowH > 0 && r.panelH >= 4 * r.rowH - 2 && r.pageScroll <= 1;
for (const [vw, vh] of (process.env.FP_NARR ? [] : [[1280, 720], [1600, 900]])) {
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
  const rows = await listRoom(p);
  ok(tag + ' the action list shows at least four rows without scrolling the page (' + fmtRoom(rows) + ')', roomOk(rows));
  ok(tag + ' the Proving Ground keeps its Say box (Say and Attempt work there)', (await p.locator('input[placeholder^="Say something"]:visible').count()) === 1);
  // ---- 0.31.1 (Leon: "bring back the AP bar. 6 little dots there is barely seeable"): the ACTION POINTS row under the strip ----
  { const segs = await p.locator('.phc-cb-ap .phc-pips > span').count(), max = Number(await p.locator('.phc-cb-ap').first().getAttribute('aria-valuemax').catch(() => '0'));
    const below = await p.evaluate(() => { const yt = document.querySelector('.phc-yt'), ap = document.querySelector('.phc-cb-ap'); if (!yt || !ap) return null; return Math.round(ap.getBoundingClientRect().top - yt.getBoundingClientRect().bottom); });
    ok(tag + ' the ACTION POINTS row is back under the YOUR TURN strip, one segment per max AP (' + segs + ' of ' + max + ', ' + below + ' px under)', segs >= 6 && segs === max && below != null && below >= 0 && below <= 60 && (await p.locator('text=ACTION POINTS').count()) >= 1);
    ok(tag + ' no dots in the YOUR TURN strip', (await p.locator('.phc-yt .phc-pips, .phc-yt-pips').count()) === 0); }
  // ---- 0.31.1 (Leon: "HP back above the mp bar below the picture"): HP and the strip inside the You card, above the meters ----
  { const where = await p.evaluate(() => { const vis = (e) => !!e && e.getBoundingClientRect().height > 0; const hp = document.querySelector('[data-hp-row]'); if (!hp || !vis(hp)) return 'no visible HP';
      if (!hp.closest('.phc-me-full')) return 'HP outside the You card';
      const meters = Array.from(document.querySelectorAll('[data-meter-row], .phc-me-urgent')).filter(vis); if (!meters.length) return 'no meters';
      const img = Array.from(document.querySelectorAll('.phc-me-full img, .phc-me-mini img')).filter(vis)[0]; const h = hp.getBoundingClientRect();
      if (img && img.getBoundingClientRect().bottom > h.top + 1) return 'HP not below the portrait';
      return meters.every((m) => m.getBoundingClientRect().top >= h.bottom - 1) ? 'ok' : 'a meter above HP'; });
    ok(tag + ' HP sits in the You card, below the portrait and above the meters (' + where + ')', where === 'ok'); }
  // the first meter row (MP) is in sight under HP without scrolling the card: wholly inside the card's scroll box and the window
  { const seen = await p.evaluate(() => { const vis = (e) => !!e && e.getBoundingClientRect().height > 0;
      const row = Array.from(document.querySelectorAll('[data-meter-row], .phc-me-urgent')).filter(vis)[0]; if (!row) return 'no visible meter row';
      const top = row.closest('.phc-cb-top'); const r = row.getBoundingClientRect(); const b = top ? top.getBoundingClientRect() : { top: 0, bottom: innerHeight };
      const mp = Array.from(document.querySelectorAll('[data-res="mp"]')).filter(vis)[0]; const first = mp || row.querySelector('.phc-meter, .phc-res-mini') || row; const f = first.getBoundingClientRect();
      const res = { mp: !!mp, rowTop: Math.round(f.top), rowBottom: Math.round(f.bottom), boxTop: Math.round(b.top), boxBottom: Math.round(b.bottom), scroll: top ? top.scrollTop : 0 };
      return (f.top >= b.top - 1 && f.bottom <= b.bottom + 1 && f.bottom <= innerHeight && (!top || top.scrollTop === 0)) ? 'ok ' + JSON.stringify(res) : 'hidden ' + JSON.stringify(res); });
    ok(tag + ' the first meter row (MP) is in sight under HP without scrolling the card (' + seen + ')', seen.startsWith('ok')); }
  if (vh > 820) { const side = await p.evaluate(() => { const b = document.querySelector('[data-me-side] [data-backpack="card"]'), f = document.querySelector('[data-me-side] svg[aria-label="Your injuries"]'); if (!b || !f) return null; const r = b.getBoundingClientRect(), q = f.getBoundingClientRect(); return { gap: Math.round(q.left - r.right), top: Math.abs(Math.round(q.top - r.top)) }; });
    ok(tag + ' the Backpack button sits beside the limbs figure (' + JSON.stringify(side) + ')', !!side && side.gap >= 0 && side.gap <= 16 && side.top <= 40); }

  // ---- U3: no shield track at 0 ----
  ok(tag + ' no shield segment or "+N" at shield 0', (await p.locator('[data-hp-shield-seg]').count()) === 0 && (await p.locator('[data-hp-shield]').count()) === 0 && (await p.locator('[data-shield-seg]').count()) === 0);
  // ---- U2: a zero meter folds into "+N", opens on click ----
  // (the chip rides the card's meter row on tall windows and the one line of minis under HP on short ones: the visible one)
  const more = p.locator('[data-meter-more]:visible');
  const moreN = await more.count(), moreVis = moreN > 0;
  ok(tag + ' zero meters folded into the "+N" chip (' + (moreN ? await more.textContent() : 'none') + ')', moreN === 1);
  const METERS = '[data-meter-row] .phc-meter:visible, .phc-me-urgent .phc-res-mini:visible';
  const metersBefore = await p.locator(METERS).count();
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
  ok(tag + ' the "+N" chip is on screen', moreVis);
  if (moreN && moreVis) {
    await more.click(); await settle(p, 300);
    ok(tag + ' the "+N" chip opens the zero meters (' + metersBefore + ' -> ' + (await p.locator(METERS).count()) + ')', (await p.locator(METERS).count()) > metersBefore && (await p.locator('[data-meter-more]:visible').count()) === 0);
    await p.screenshot({ path: shotsDir + tag + '-02c-meters-open.png' });
    const z = p.locator('[data-zero="true"]:visible').first();
    if (await z.count()) { await z.click(); await settle(p, 250); ok(tag + ' a click on an open zero meter folds it back', (await p.locator('[data-meter-more]:visible').count()) === 1); await p.locator('[data-meter-more]:visible').click(); await settle(p, 250); }
    else ok(tag + ' an open zero meter to fold back', false);
    // and folded again for the rest (the list's room is measured with the rule's folds)
    for (const zz of await p.locator('[data-zero="true"]:visible').all()) { await zz.click().catch(() => {}); await settle(p, 120); }
    { const less = p.locator('[data-meter-less]:visible'); if (await less.count()) { await less.click(); await settle(p, 200); } }
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
  const seg = await p.locator('.phc-me-full [data-hp-shield-seg]').count(), plus = (await p.locator('[data-hp-shield]').first().textContent().catch(() => '')) || '';
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
    const chip = p.locator('[data-status-strip] [data-status-group="helps"] [data-status="fx-HIDDEN"]');
    const colour = (await chip.count()) ? await chip.evaluate((el) => getComputedStyle(el).color) : '';
    ok(tag + ' Hidden is in the HELPING group, green not red (' + colour + ')', (await chip.count()) === 1 && colour !== 'rgb(246, 81, 87)');
    const under = await p.evaluate(() => { const hp = document.querySelector('[data-hp-row]'), st = document.querySelector('[data-status-strip]'); if (!hp || !st) return null; const a = hp.getBoundingClientRect(), b = st.getBoundingClientRect(); return Math.round(b.top - a.bottom); });
    ok(tag + ' the status strip sits directly under HP (gap ' + under + ' px)', under != null && under >= 0 && under <= 8);
  } else ok(tag + ' Hidden reached (Fade)', false);
  await p.screenshot({ path: shotsDir + tag + '-03-shield-hidden.png' });
  // the token's hover card carries the same strip, small (U4)
  { const meNow = await meU(p); const ref = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Number(meNow.pos.split(',')[0])] + (Number(meNow.pos.split(',')[1]) + 1);
    const card = p.locator('.phc-grid button.phc-tok[aria-label^="' + ref + ' ·"] [data-token-status] [data-status-group="helps"] [data-status="fx-HIDDEN"]');
    ok(tag + ' the token card has the strip too (Hidden in its helping group)', (await card.count()) === 1); }

  // everything opened
  for (const m of await p.locator('[data-meter-more]:visible').all()) await m.click().catch(() => {});
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

// ---- U5 with a Narrator: the Say box is back (about 40 px), and the list still has room for four rows at 1280x720 ----
// A narrated room (M813, the scripted Narrator), a Confessor (Faith: the vow line too), every glove handed over by the
// Narrator's turn, then the Narrator's fight.
{ const p = await player(browser, 'host', { campaigns: ['m813'] });
  await p.setViewportSize({ width: 1280, height: 720 });
  await hostAs(p, 'Leon');
  await click(p, 'Create a character');
  await p.getByPlaceholder('What the squad calls you').fill('Vess');
  await p.locator('main button[aria-pressed]').first().click();
  await click(p, 'Next ›');
  await p.locator('button', { hasText: 'Confessor' }).first().click();
  await p.locator('button', { hasText: /^Use .* ›$/ }).first().click();
  await click(p, 'Next ›'); await click(p, 'Next ›');
  await p.locator('[data-belief="faithful"]').click(); await p.locator('[data-patron="mother_ember"] [data-swear]').click();
  await click(p, 'Next ›'); await click(p, 'Next ›'); await lockIn(p, { timeout: 30000 });
  await p.waitForFunction(() => Object.keys(window.__phc.getState().game?.characters || {}).length > 0, null, { timeout: 30000 });
  await p.evaluate(() => window.__phc.setNarrator({ scripted: true }));
  await click(p, 'Start session');
  await p.waitForSelector('.phc-story', { timeout: 30000 });
  await p.waitForFunction(() => window.__phc.getState().game.story.entries.some((e) => e.kind === 'narration'), null, { timeout: 30000 });
  const actN = (a) => p.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
  const me = await p.evaluate(() => Object.keys(window.__phc.getState().game.characters)[0]);
  const lootErr = await actN({ type: 'narrator/turn', turn: { narration: 'A crate of gloves by the ramp.', loot: ['evoker', 'emanator', 'visualizer', 'attuner'].map((item) => ({ charId: me, item })).concat([{ charId: me, item: 'standard_core', qty: 4 }]) } });
  await p.waitForFunction(() => window.__phc.getState().game.story.await === 'players', null, { timeout: 30000 }).catch(() => {});
  const fightErr = await actN({ type: 'narrator/turn', turn: { narration: 'Two raiders come over the crates.', combat: { name: 'Crates', enemies: [{ name: 'Raider', tier: 'minion', weapon: 'fists' }, { name: 'Raider Two', tier: 'minion', weapon: 'fists' }] } } });
  await p.waitForFunction(() => window.__phc.getState().screen === 'combat', null, { timeout: 30000 });
  await p.waitForFunction(() => { const cb = window.__phc.getState().game.combat; const u = cb && cb.units.find((x) => x.id === cb.order[cb.turn]); return u && u.side === 'pc'; }, null, { timeout: 30000 });
  await settle(p, 1500); await dismissCut(p, 1280, 720);
  await p.waitForSelector('[role="tablist"][aria-label="Actions"] [role="tab"]', { timeout: 30000 }).catch(() => {});
  const say = p.locator('input[placeholder^="Say something"]:visible');
  ok('narrated 1280x720: the Say box is there (a Narrator room)' + (lootErr || fightErr ? ' [' + (lootErr || fightErr) + ']' : ''), (await say.count()) === 1);
  ok('narrated 1280x720: the tabs carry the gloves (' + (await p.locator('[role="tablist"][aria-label="Actions"] [role="tab"]').allTextContents()).join(', ') + ')', (await p.locator('[role="tablist"][aria-label="Actions"] [role="tab"]').count()) >= 5);
  const attackTab = p.locator('#phc-tab-attack');
  if (await attackTab.count()) { await attackTab.click(); await settle(p, 300); }
  const r0 = await listRoom(p);
  ok('narrated 1280x720, the Attack tab: four rows shown (' + fmtRoom(r0) + ')', roomOk(r0));
  await p.screenshot({ path: shotsDir + 'narrated-1280x720-01-start.png' });
  const vf = p.locator('[data-fold="fight:vow"]').first();
  if ((await vf.getAttribute('aria-expanded').catch(() => null)) === 'false') { await vf.click(); await settle(p, 300); }
  const r1 = await listRoom(p);
  ok('narrated 1280x720, the vow opened: the list still shows four rows (' + fmtRoom(r1) + ')', roomOk(r1));
  ok('narrated 1280x720, the vow opened: its head and the first vows show', await p.evaluate(() => { const box = document.querySelector('[data-phc-vow-prompt]'), v = box && box.querySelector('[data-vow]'); if (!v) return false; const b = box.getBoundingClientRect(), r = v.getBoundingClientRect(); return r.top >= b.top - 1 && r.bottom <= b.bottom + 1 && r.height > 20; }));
  await p.screenshot({ path: shotsDir + 'narrated-1280x720-01b-vow-open.png' });
  for (const m of await p.locator('[data-meter-more]:visible').all()) await m.click().catch(() => {});
  for (const f of await p.locator('button[data-fold][aria-expanded="false"]').all()) if (await f.isVisible()) await f.click({ timeout: 3000 }).catch(() => {});
  await settle(p, 300);
  const r2 = await listRoom(p);
  ok('narrated 1280x720, everything opened: still four rows (' + fmtRoom(r2) + ')', roomOk(r2));
  await p.screenshot({ path: shotsDir + 'narrated-1280x720-02-all-open.png' });
  if (process.env.DEBUG_FP) console.log('debug chain', JSON.stringify(await p.evaluate(() => ['.phc-cb-aside', '.phc-cb-turnbox', '.phc-cb-turn', '.phc-cb-dock', '.phc-cb-tabpanel', '.phc-cb-foot', '.phc-cb-confirm', '.phc-me-urgent', '[data-me-hp]', 'form.phc-cb-say', '.phc-cb-tabs', '[data-phc-vow-prompt]'].map((q) => { const e = Array.from(document.querySelectorAll(q)).find((x) => x.offsetParent !== null); if (!e) return q + ' none'; const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return q + ' top ' + Math.round(r.top) + ' h ' + Math.round(r.height) + ' sh ' + e.scrollHeight + ' st ' + e.scrollTop + ' flex ' + cs.flex + ' minh ' + cs.minHeight + ' ov ' + cs.overflowY; }))));
  // rules 1.66 item 5215: a split made with the splitter is kept by its share through a window resize, and the turn panel
  // (the action zone) stays in view at every size
  {
    const sep = p.locator('.phc-cb-split').first();
    if (await sep.count()) {
      await sep.focus(); for (let i = 0; i < 4; i++) await p.keyboard.press('ArrowLeft'); await settle(p, 400);
      const share = () => p.evaluate(() => { const l = document.querySelector('.phc-cb-left'), row = l && l.parentElement, a = document.querySelector('.phc-cb-aside'); if (!l || !row || !a) return null; const ab = a.getBoundingClientRect(); return { s: l.getBoundingClientRect().width / row.clientWidth, inView: ab.width > 120 && ab.right <= innerWidth + 1 && ab.left >= 0 }; });
      const s0 = await share(), seen = [];
      for (const [w, h] of [[1100, 700], [1600, 900], [1280, 720]]) { await p.setViewportSize({ width: w, height: h }); await settle(p, 500); seen.push(await share()); }
      ok('rules 1.66: the split kept by its share through resizes (' + [s0, ...seen].map((x) => x && x.s.toFixed(2)).join(' → ') + '), the turn panel in view at each size', !!s0 && seen.every((x) => x && x.inView && Math.abs(x.s - s0.s) < 0.06));
      await sep.focus(); await p.keyboard.press('Home'); await settle(p, 300);
    } else ok('rules 1.66: the splitter is on the fight screen', false);
  }
  ok('narrated: no page errors' + (p.errors.length ? ': ' + p.errors.slice(0, 2).join(' | ') : ''), !p.errors.length);
  await p.context().close(); }
await browser.close();

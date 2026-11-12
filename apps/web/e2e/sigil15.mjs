// Sigil 1.5 (rules 1.10) end to end, through real buttons where the game has them:
//  (d) a sigil mark cut into the wall on the area map, Investigated (Acuity or Rumination): the word is copied, study
//      rises, the panel says so, and the Investigate sound is served;
//  (a) two Lines drawn side by side (the stroke picker's "new Line"), each Evoked as its own spell (touching glyphs no
//      longer poison a Line);
//  (b) a crossing: with Brain Power below Mastered no junction is offered; the Proving Ground's "Junctions for
//      everyone here" switch turns them on; a glyph joins two strokes and both Lines carry on through it; Evoke offers
//      both Lines and one is fired;
//  (c) a team fight (two browsers): Team B draws a glyph, Team A Analyzes that fighter and copies the word (study rises).
// The Proving Ground, Enemy AI off. Screenshots (deviceScaleFactor 1): e2e/shots/sigil15e-*.png, or SHOTS=dir.
import { chromium, player, click, BASE, OUT as OUT0, pickAction, pause } from './lib.mjs';
const OUT = process.env.SHOTS ? process.env.SHOTS.replace(/\/?$/, '/') : OUT0;
const browser = await chromium.launch();
const p = await player(browser, 'host');
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const ref = (k) => { const [x, y] = k.split(',').map(Number); return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[x] + (y + 1); };
const K = (x, y) => x + ',' + y;
const xy = (k) => k.split(',').map(Number);
const cheb = (a, b) => { const [ax, ay] = xy(a), [bx, by] = xy(b); return Math.max(Math.abs(ax - bx), Math.abs(ay - by)); };
const sfxHeard = new Map(); // the sound files the browser fetched, and their status
const watchSfx = (pg) => pg.on('response', (r) => { const m = /\/sfx\/cb\/(sg_[a-z]+)\.ogg/.exec(r.url()); if (m) sfxHeard.set(m[1], r.status()); });
watchSfx(p);
const dismissCut = async (pg = p) => { if (await pg.locator('[data-phc-cutin]').count()) { await pg.mouse.click(1430, 990); await pause(pg, 380); } };
const snap = async (n, pg = p) => { await dismissCut(pg); return pg.screenshot({ path: OUT + 'sigil15e-' + n + '.png' }); };
const actOn = (pg, a) => pg.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
const act = (a) => actOn(p, a);
const must = async (a, what, pg = p) => { const e = await actOn(pg, a); if (e) console.log('  ' + (what || a.type) + ': ' + e); return e; };
const G = (pg = p) => pg.evaluate(() => window.__phc.getState().game);
const st = () => p.evaluate(() => { const s = window.__phc.getState(), g = s.game, cb = g.combat; const u = cb && cb.units.find((x) => x.side === 'pc'); return { g, cb, u }; });
const tok = (k, pg = p) => pg.locator('button.phc-tok[aria-label^="' + ref(k) + ' ·"]').first();
const idle = (pg = p) => pg.waitForFunction(() => !window.__phcHold || performance.now() >= window.__phcHold(), null, { timeout: 12000 }).catch(() => {});
const drawer = p.locator('aside[aria-label="Proving Ground tools"]');
const openTools = async () => { if (!(await drawer.count())) await p.getByRole('button', { name: 'Open the Proving Ground tools' }).click(); await drawer.waitFor(); };
const closeTools = async () => { if (await drawer.count()) { await drawer.getByRole('button', { name: 'Close the tools' }).click(); await drawer.waitFor({ state: 'detached' }).catch(() => {}); } };
const growth = async (cid, pg = p) => (await G(pg)).characters[cid].sigilGrowth || { study: 0, toStudy: [] };

async function newRound() {
  await idle(); await dismissCut();
  const r0 = (await st()).cb.round;
  await p.getByRole('button', { name: 'End turn', exact: true }).click();
  await p.waitForFunction((r0) => { const cb = window.__phc.getState().game.combat; const u = cb.units.find((x) => x.id === cb.order[cb.turn]); return cb.round > r0 && u && u.side === 'pc' && u.ap >= 5; }, r0, { timeout: 30000 });
  await p.waitForSelector('[data-phc-cutin]', { timeout: 1800 }).catch(() => {}); await dismissCut(); await idle();
}
const ensureAp = async (n) => { if ((await st()).u.ap < n) await newRound(); };
const moveTo = async (k) => { const s = await st(); if (s.u.pos === k) return null; await ensureAp(3); const e = await must({ type: 'combat/move', unitId: s.u.id, to: k }, 'move to ' + ref(k)); await pause(p, 250); await idle(); return e; };
const glyphs = async () => (await st()).cb.glyphs || [];
const glyphAt = async (k) => (await glyphs()).find((g) => g.pos === k);
/** Pick Draw (once) and a word on the glyph keyboard. */
async function word(w) {
  await dismissCut();
  const key = p.locator('[data-glyph-keyboard] button[data-word="' + w + '"]').first();
  if (!(await key.count())) { await pickAction(p, /^Draw a glyph/); await pause(p, 200); }
  await key.click(); await pause(p, 150);
}
const putDraw = () => p.locator('[role="tabpanel"]').getByRole('button', { name: /^Draw a glyph/ }).first().click().catch(() => {});
const picker = async () => (await p.locator('[data-stroke-picker] button').allTextContents()).map((t) => t.trim());
const note = async () => ((await p.locator('.phc-cb-seltext').first().getAttribute('title').catch(() => '')) || '').trim();
const pick = async (re) => { await p.locator('[data-stroke-picker] button', { hasText: re }).first().click(); await pause(p, 150); };
/** Draw the picked word on your own tile (a click on it). */
async function drawHere() { await ensureAp(2); const s = await st(); await tok(s.u.pos).click(); await pause(p, 300); await idle(); }
const topUp = () => must({ type: 'sandbox/refill', charId: cid }, 'refill');
const panelText = async (label) => ((await p.locator('[aria-label="' + label + '"]').first().textContent().catch(() => '')) || '').replace(/\s+/g, ' ');
/** Evoke: pick Evoke (if it isn't), then a glyph of the Line on the grid. */
async function startEvoke(tile) {
  await dismissCut();
  const evBtn = p.locator('[role="tabpanel"]').getByRole('button', { name: /^Evoke/ }).first();
  if (!((await evBtn.count()) && (await evBtn.getAttribute('aria-pressed')) === 'true')) { await pickAction(p, /^Evoke/); await pause(p, 150); }
  const again = p.getByRole('button', { name: '‹ Pick another pattern' }).first();
  if (await again.count()) { await again.click(); await pause(p, 150); }
  await tok(tile).click(); await pause(p, 300);
}
/** Aim at a unit's tile and Confirm; returns the new log lines and fx events. */
async function fireAt(k) {
  const s0 = await st(), l0 = s0.cb.log.length, n0 = s0.cb.fxSeq || 0;
  await tok(k).click(); await pause(p, 250);
  const b = p.getByRole('button', { name: /^Confirm/ }).first();
  const en = await b.isEnabled().catch(() => false);
  if (en) await b.click(); else console.log('  confirm is disabled: ' + ((await b.textContent().catch(() => '')) || '').trim() + ' · ' + (await note()));
  await pause(p, 700); await idle();
  const s = await st();
  return { en, log: s.cb.log.slice(l0), fx: (s.cb.fx || []).filter((e) => e.n > n0) };
}

// ---------- the Proving Ground, Solo; a Mage with an Evoker, Brain Power 7 (not Mastered: no Junctions of its own) ----------
await p.goto(BASE);
await click(p, 'PROVING GROUND');
const nm = p.getByPlaceholder('Leon');
await Promise.race([nm.waitFor({ timeout: 8000 }).catch(() => {}), p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 8000 }).catch(() => {})]);
if (await nm.count()) { await nm.fill('Leon'); await click(p, 'Solo ›'); }
await p.mouse.move(1430, 990);
await p.waitForFunction(() => window.__phc.getState().game?.sandbox?.state === 'ready', null, { timeout: 30000 });
let g = await G();
const cid = Object.values(g.characters)[0].id;
await must({ type: 'sandbox/clear' });
await must({ type: 'sandbox/ai', on: false }); await must({ type: 'sandbox/auto', on: false });
await must({ type: 'sandbox/junctions', on: false });
await must({ type: 'sandbox/give', charId: cid, item: 'service_pistol', equip: true }, 'a pistol');
await must({ type: 'sandbox/kit', charId: cid, kind: 'sigil' });
await must({ type: 'sandbox/level', charId: cid, level: 10 });
await must({ type: 'sandbox/class', charId: cid, classId: 'mage' }, 'Mage');
await must({ type: 'sandbox/give', charId: cid, item: 'standard_core', qty: 3 }, 'cores');
await must({ type: 'sandbox/skill', charId: cid, skill: 'brain_power', points: 7 });
await must({ type: 'sandbox/skill', charId: cid, skill: 'analysis', points: 10 }); // Investigate: +9
await must({ type: 'sandbox/skill', charId: cid, skill: 'athletics', points: 9 });
for (const w of ['fire', 'seek', 'spark', 'arc', 'spread']) await must({ type: 'sandbox/learn', charId: cid, word: w }, 'learn ' + w);
for (const w of ['pull', 'shock']) if ((await G()).characters[cid].sigils.includes(w)) await must({ type: 'sandbox/forget', charId: cid, word: w }, 'forget ' + w);

// ---------- (d) a sigil mark cut into the wall, on the area map: Investigate copies its word ----------
g = await G();
const me0 = g.story.positions[cid], zm = await p.evaluate(() => { const g = window.__phc.getState().game; return g.story.map || null; });
const solidSet = new Set((zm && zm.solid) || []);
const taken = new Set([...Object.values(g.story.positions), ...(g.story.objects || []).map((o) => o.pos), ...(g.story.npcs || []).map((n) => n.pos)]);
const [mx, my] = xy(me0);
const around = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]].map(([dx, dy]) => K(mx + dx, my + dy)).filter((k) => !taken.has(k) && !solidSet.has(k));
const byWall = (k) => { const [x, y] = xy(k); return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => solidSet.has(K(x + dx, y + dy))); };
around.sort((a, b) => (byWall(b) ? 1 : 0) - (byWall(a) ? 1 : 0));
await openTools();
await drawer.getByRole('tab', { name: 'Magic' }).click(); await pause(p, 200);
const tools = drawer.locator('section[aria-label="Sigil growth tools"]');
await tools.scrollIntoViewIfNeeded();
await tools.getByLabel('Mark word').selectOption('pull');
await tools.getByLabel('Mark age').selectOption('fresh');
await tools.getByLabel('Mark damage').selectOption('intact');
let mark = null;
for (const k of around) {
  await tools.getByLabel('Tile for the mark').fill(ref(k));
  await tools.locator('[data-sb-mark-place]').click(); await pause(p, 200);
  g = await G(); mark = (g.story.objects || []).find((o) => o.kind === 'sigil_mark' && o.pos === k); if (mark) break;
}
ok('a sigil mark placed by the tools at ' + (mark ? ref(mark.pos) + (byWall(mark.pos) ? ' (against the wall)' : '') : '?') + ', TN ' + (mark && mark.approaches[0].tn), !!mark && mark.word === 'pull' && mark.approaches[0].tn === 8);
await closeTools();
const area = p.locator('div[role="dialog"][aria-label="Area map"]');
const openArea = async () => { if (!(await area.count())) await p.getByRole('button', { name: 'Area map', exact: true }).first().click(); await area.waitFor(); await pause(p, 250); };
await openArea();
const cell = area.locator('button.phc-tok[aria-label^="' + ref(mark.pos) + ' "], button.phc-tok[aria-label^="' + ref(mark.pos) + ':"]').first();
ok('the carved mark is on the area map', (await cell.locator('img[data-sigil-mark]').count()) === 1);
const study0 = (await growth(cid)).study || 0;
await cell.click(); await pause(p, 400);
const dlg = p.locator('div[role="dialog"][aria-label="Sigil mark"]');
await dlg.waitFor({ timeout: 4000 }).catch(() => {});
ok('the mark panel: unread, Investigate with Acuity or Rumination (the skill is Acuity since Skeleton 2.0)', /An unread word/.test(await p.locator('[data-mark-panel]').innerText().catch(() => '')) && (await dlg.getByText('Acuity or Rumination').count()) > 0);
await snap('01-mark-panel');
const tryBtn = dlg.getByRole('button', { name: /Try this · 2 AP|Try it · 2 AP/ }).first();
ok('Investigate can be tried', await tryBtn.isEnabled().catch(() => false));
const fx0 = (await G()).story.fxSeq || 0;
await tryBtn.click(); await pause(p, 600);
const roll = p.getByRole('button', { name: /^Roll/ }).first();
if (await roll.count()) { await roll.click().catch(() => {}); await pause(p, 2500); }
for (const t of ['Continue', 'Done', 'Close']) { const b = p.locator('[aria-label="Dice"] button', { hasText: t }).first(); if (await b.count()) { await b.click().catch(() => {}); await pause(p, 300); } }
g = await G();
const tr = g.story.objects.find((o) => o.id === mark.id).approaches[0].tries.find((t) => t.charId === cid);
const gr = g.characters[cid].sigilGrowth || {};
console.log('  investigate:', tr ? (tr.ok ? 'success ' + tr.total : 'fail ' + tr.total) : 'no try');
const apFx = (g.story.fx || []).find((e) => e.n > fx0 && e.k === 'approach');
if (tr && tr.ok) {
  const learned = (g.characters[cid].sigils || []).includes('pull');
  ok('Investigate succeeded: PULL ' + (learned ? 'learned (a critical)' : 'copied, study ' + study0 + ' → ' + gr.study), learned || ((gr.toStudy || []).includes('pull') && gr.study === study0 + 3));
  ok('the approach effect plays the Investigate sound (' + (apFx && apFx.effect) + ')', !!apFx && /^(copied|learned) /.test(apFx.effect || ''));
  if (!(await dlg.count())) { await openArea(); await cell.click(); await pause(p, 400); }
  const out = await p.locator('[data-mark-outcome]').innerText().catch(() => '');
  ok('the panel says it (' + out.trim() + ')', /Copied: PULL|PULL is yours/.test(out));
  await snap('02-mark-copied');
} else ok('Investigate succeeds at +9 against TN 8 (a natural 1 fails: ' + (tr ? tr.total : '?') + ')', false);
// Close what is open with its own Close button (the mark's panel, then the area map): the tools' Start button is under
// them. (This pressed Escape twice; neither panel answers Escape, and the mark's panel stayed over the tools.)
for (const d of [dlg, area]) if (await d.count()) { await d.getByRole('button', { name: 'Close', exact: true }).first().click(); await d.waitFor({ state: 'detached', timeout: 15000 }).catch(() => {}); }
ok('Close closes the mark\'s panel and the area map', (await dlg.count()) === 0 && (await area.count()) === 0);

// ---------- the fight ----------
await openTools();
await drawer.getByRole('button', { name: /^⚔ Start the fight/ }).first().click();
await p.mouse.move(1430, 990);
await p.waitForFunction(() => window.__phc.getState().game?.phase === 'combat', null, { timeout: 30000 });
await p.waitForFunction(() => window.__phc.getState().screen === 'combat', null, { timeout: 8000 }).catch(() => {});
await must({ type: 'sandbox/clear' });
for (let i = 0; i < 20; i++) { const s = await st(); const cur = s.cb.units.find((u) => u.id === s.cb.order[s.cb.turn]); if (cur?.side === 'pc') break; await pause(p, 300); }
await pause(p, 2300); await dismissCut();
let s = await st();
ok('Brain Power 7: ' + s.u.mg?.maxWords + ' words a spell', (s.u.mg?.maxWords || 0) >= 3);
// Two free rows of 3 tiles side by side, with room east for the targets and a row above for the crossing.
const m = s.cb.map, bad = new Set([...(m.solid || []), ...(m.cover || []), ...(m.full || []), ...(m.difficult || []), ...(s.cb.objects || []).map((o) => o.pos), ...s.cb.units.filter((u) => !u.dead && u.id !== s.u.id).map((u) => u.pos)]);
let lane = null;
const freeK = (k) => { const [x, yy] = xy(k); return x >= 0 && yy >= 0 && x < m.w && yy < m.h && !bad.has(k); };
const eastFree = (x0, yy) => { for (let x = x0 + 5; x < Math.min(m.w, x0 + 9); x++) if (freeK(K(x, yy))) return K(x, yy); return null; };
for (const y of [5, 6, 4, 7, 3, 8, 2, 9, 1]) for (let x0 = 0; x0 + 4 <= m.w && !lane; x0++) {
  let good = true; for (let dx = 0; dx < 4 && good; dx++) for (const dy of [-1, 0, 1]) if (!freeK(K(x0 + dx, y + dy))) good = false;
  if (good && eastFree(x0, y) && eastFree(x0, y + 1)) lane = { x0, y };
}
ok('found two free rows', !!lane);
const { x0, y } = lane;
console.log('  rows at', ref(K(x0, y)), ref(K(x0, y + 1)));
const T1 = eastFree(x0, y), T2 = eastFree(x0, y + 1);
for (const k of [T1, T2]) await must({ type: 'sandbox/spawn', tier: 'boss', weapon: 'fists', at: ref(k) }, 'a target at ' + ref(k));
await pause(p, 300);

// ---------- (a) two Lines side by side, each Evoked ----------
const A1 = K(x0, y), A2 = K(x0 + 1, y), B1 = K(x0, y + 1), B2 = K(x0 + 1, y + 1);
await topUp();
await moveTo(A2); await word('seek'); await drawHere();
await moveTo(A1); await word('fire'); await drawHere();
ok('FIRE · SEEK: one stroke', (await glyphAt(A1))?.strokeId && (await glyphAt(A1)).strokeId === (await glyphAt(A2))?.strokeId);
await moveTo(B2); await word('spark');
let pk = await picker();
// SEEK's Line already runs east-west: a glyph under it can't extend it (a Line is straight), so it starts its own.
ok('SPARK under SEEK starts its own Line, no picker (' + pk.join(' | ') + '): "' + await note() + '"', !pk.length && /starts a new Line/.test(await note()));
await drawHere();
await moveTo(B1); await word('arc');
pk = await picker();
ok('ARC beside SPARK: extends SPARK or a new Line, no junction below Brain Power Mastered (' + pk.join(' | ') + ')', pk.some((t) => /extends SPARK/.test(t)) && pk.some((t) => /new Line/.test(t)) && !pk.some((t) => /junction|FIRE|SEEK/.test(t)));
await pick(/extends SPARK/);
ok('ARC joins SPARK: "' + await note() + '"', /SPARK · ARC|ARC · SPARK/.test(await note()));
await drawHere();
const sidA = (await glyphAt(A1))?.strokeId, sidB = (await glyphAt(B1))?.strokeId;
ok('two Lines side by side, touching, each its own stroke', !!sidA && !!sidB && sidA !== sidB && (await glyphAt(B2))?.strokeId === sidB);
await putDraw();
await snap('03-two-lines');
await topUp(); await ensureAp(4);
// The FIRE · SEEK Line, from its west end (we stand on FIRE): it fires east along the Line at the first target.
await moveTo(A1); await topUp();
await startEvoke(A2);
const lineA = await panelText('The Line');
ok('Evoke: FIRE · SEEK is a spell (' + lineA.slice(0, 80) + ')', /FIRE/.test(lineA) && /SEEK/.test(lineA) && !/SPARK|ARC/.test(lineA) && /✓ A spell/.test(lineA));
let r = await fireAt(T1);
ok('FIRE · SEEK Evoked: ' + r.log.filter((l) => /evokes/.test(l)).join(' ').slice(0, 120), r.log.some((l) => /evokes/.test(l)) && r.fx.some((e) => e.k === 'evoke'));
await snap('04-evoke-a');
ok('its glyphs are spent, SPARK · ARC stands', !(await glyphAt(A1)) && !(await glyphAt(A2)) && !!(await glyphAt(B1)) && !!(await glyphAt(B2)));
await topUp(); await ensureAp(4); await topUp();
await moveTo(B1);
await startEvoke(B2);
const lineB = await panelText('The Line');
ok('Evoke: SPARK · ARC is a spell (' + lineB.slice(0, 80) + ')', /SPARK/.test(lineB) && /ARC/.test(lineB) && !/\bFIRE\b/.test(lineB) && /✓ A spell/.test(lineB));
r = await fireAt(T2);
ok('SPARK · ARC Evoked: ' + r.log.filter((l) => /evokes/.test(l)).join(' ').slice(0, 120), r.log.some((l) => /evokes/.test(l)) && r.fx.some((e) => e.k === 'evoke'));
await snap('05-evoke-b');

// ---------- (b) a crossing: the Junctions switch, one glyph in two strokes ----------
// FIRE west of J and SPARK south of J; SPREAD at J joins both; then SEEK east of J and ARC north of J carry each Line on.
await newRound(); await topUp();
const F = K(x0 + 1, y), J = K(x0 + 2, y), S = K(x0 + 2, y + 1), E = K(x0 + 3, y), N = K(x0 + 2, y - 1);
await moveTo(F); await word('fire'); await drawHere();
await moveTo(S); await word('spark');
pk = await picker();
if (pk.some((t) => /new Line/.test(t))) await pick(/^\s*(✓ )?new Line\s*$/);
await drawHere();
ok('FIRE and SPARK: two strokes', (await glyphAt(F))?.strokeId !== (await glyphAt(S))?.strokeId);
await moveTo(J); await word('spread');
pk = await picker();
ok('Junctions off: no junction offered at J (' + pk.join(' | ') + ')', !pk.some((t) => /junction/.test(t)));
await openTools();
await drawer.getByRole('tab', { name: 'Magic' }).click(); await pause(p, 200);
const jBox = drawer.locator('[data-sb-junctions] input');
await jBox.scrollIntoViewIfNeeded(); await jBox.check(); await pause(p, 250);
ok('the switch: Junctions for everyone here', (await G()).sandbox.junctions === true);
await snap('06-junctions-switch');
await closeTools();
await word('spread');
pk = await picker();
const jOpt = pk.find((t) => /junction: (FIRE \+ SPARK|SPARK \+ FIRE)/.test(t));
ok('Junctions on: the picker offers FIRE + SPARK (' + pk.join(' | ') + ')', !!jOpt);
if (jOpt) await pick(/junction: (FIRE \+ SPARK|SPARK \+ FIRE)/);
ok('the junction preview: "' + await note() + '"', /a junction/.test(await note()));
await snap('07-junction-picker');
await drawHere();
const jg = await glyphAt(J);
ok('SPREAD lies in two strokes', !!jg && !!jg.strokeId2 && jg.strokeId2 !== jg.strokeId);
await moveTo(E); await word('seek');
pk = await picker(); { const o = pk.find((t) => /extends FIRE/.test(t)); if (o && !/^✓/.test(o)) await pick(/extends FIRE/); }
ok('SEEK carries FIRE\'s Line on through J: "' + await note() + '"', /FIRE · SPREAD · SEEK/.test(await note()));
await drawHere();
await moveTo(N); await word('arc');
pk = await picker(); { const o = pk.find((t) => /extends SPARK/.test(t)); if (o && !/^✓/.test(o)) await pick(/extends SPARK/); }
ok('ARC carries SPARK\'s Line on through J: "' + await note() + '"', /SPARK · SPREAD · ARC/.test(await note()));
await drawHere();
const g5 = await glyphs(), sOf = (k) => { const x = g5.find((q) => q.pos === k); return x ? [x.strokeId, x.strokeId2].filter(Boolean) : []; };
ok('a crossing: J is in the middle of both Lines', sOf(F)[0] === sOf(E)[0] && sOf(S)[0] === sOf(N)[0] && sOf(J).includes(sOf(F)[0]) && sOf(J).includes(sOf(S)[0]) && sOf(F)[0] !== sOf(S)[0]);
await putDraw();
await tok(J).hover(); await pause(p, 250);
const jt = ((await p.locator('[data-stroke-tip]').first().textContent().catch(() => '')) || '').trim();
ok('hovering J names both Lines: "' + jt + '"', /FIRE · SPREAD · SEEK/.test(jt) && /SPARK · SPREAD · ARC/.test(jt));
await snap('08-crossing');
await topUp(); await ensureAp(4); await topUp();
await moveTo(K(x0, y));
await startEvoke(J);
const jp = await p.locator('[data-junction-pick] button').allTextContents();
ok('Evoke on the crossing offers both Lines: ' + jp.map((t) => t.trim()).join(' | '), jp.length === 2);
const fireBtn = p.locator('[data-junction-pick] button', { hasText: /FIRE/ }).first();
if (await fireBtn.count()) { await fireBtn.click(); await pause(p, 250); }
const lineJ = await panelText('The Line');
ok('the FIRE Line through the crossing is a spell (' + lineJ.slice(0, 90) + ')', /FIRE/.test(lineJ) && /SPREAD/.test(lineJ) && /SEEK/.test(lineJ) && /✓ A spell/.test(lineJ));
r = await fireAt(T1);
ok('Evoked through the crossing: ' + r.log.filter((l) => /evokes/.test(l)).join(' ').slice(0, 140), r.log.some((l) => /evokes/.test(l)));
await snap('09-crossing-evoked');
ok('sounds served: ' + [...sfxHeard].map(([k, v]) => k + ' ' + v).filter((x) => /sg_(join|study|inflect)/.test(x)).join(', '), sfxHeard.get('sg_join') === 200 && sfxHeard.get('sg_study') === 200 && sfxHeard.get('sg_inflect') === 200);
ok('no page errors (solo)', p.errors.length === 0); if (p.errors.length) console.log(p.errors.slice(0, 5).join('\n'));
await p.context().close();

// ---------- (c) a team fight: Team B draws a glyph; Team A Analyzes that fighter and copies the word ----------
const host = await player(browser, 'hostA'), ona = await player(browser, 'onaB');
for (const q of [host, ona]) q.on('dialog', (d) => d.accept());
await host.goto(BASE);
await click(host, 'PROVING GROUND', { timeout: 30000 });
await host.getByPlaceholder('Leon').fill('Leon');
await click(host, 'With friends ›');
await host.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 30000 });
const invite = host.locator('div[role="dialog"][aria-label="Invite friends"]');
await invite.waitFor({ timeout: 30000 });
const code = (await G(host)).code;
await invite.getByRole('button', { name: 'Gear up ›' }).click();
await ona.goto(BASE + '/?room=' + code);
await ona.getByPlaceholder('Leon').fill('Ona');
await click(ona, 'Join ›');
await ona.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 30000 });
const onaId = await ona.evaluate(() => window.__phc.getState().me.id), hostId = await host.evaluate(() => window.__phc.getState().me.id);
await host.waitForFunction((id) => Object.values(window.__phc.getState().game.characters).some((c) => c.owner === id), onaId, { timeout: 30000 });
await must({ type: 'sandbox/clear' }, 'clear', host);
await must({ type: 'sandbox/settings', mode: 'teams' }, 'teams', host);
await ona.waitForFunction(() => window.__phc.getState().game.sandbox.mode === 'teams', null, { timeout: 30000 });
g = await G(host);
const hc = Object.values(g.characters).find((c) => c.owner === hostId), oc = Object.values(g.characters).find((c) => c.owner === onaId);
ok('Team A: Leon, Team B: Ona', g.sandbox.team[hostId] === 'A' && g.sandbox.team[onaId] === 'B');
for (const [pg, c] of [[host, hc], [ona, oc]]) {
  await must({ type: 'sandbox/give', charId: c.id, item: 'service_pistol', equip: true }, 'pistol', pg);
  await must({ type: 'sandbox/kit', charId: c.id, kind: 'sigil' }, 'kit', pg);
  await must({ type: 'sandbox/skill', charId: c.id, skill: 'athletics', points: 9 }, 'athletics', pg);
}
await must({ type: 'sandbox/learn', charId: oc.id, word: 'shock' }, 'Ona learns SHOCK', ona);
if ((await G(host)).characters[hc.id].sigils.includes('shock')) await must({ type: 'sandbox/forget', charId: hc.id, word: 'shock' }, 'forget', host);
await must({ type: 'sandbox/fight' }, 'fight', host);
await host.waitForFunction(() => window.__phc.getState().game.phase === 'combat' && window.__phc.getState().screen === 'combat', null, { timeout: 30000 });
await ona.waitForFunction(() => window.__phc.getState().screen === 'combat', null, { timeout: 30000 });
const hostStudy0 = (await growth(hc.id, host)).study || 0;
let drew = false, analyzed = false, gr2 = null;
const turnOf = async () => { const g = await G(host); const cb = g.combat; return { g, cb, cur: cb.units.find((u) => u.id === cb.order[cb.turn]) }; };
for (let i = 0; i < 30 && !analyzed; i++) {
  await idle(host); await idle(ona);
  const { cb, cur } = await turnOf();
  if (!cur) { await pause(host, 300); continue; }
  const mine = cur.charId === hc.id, hu = cb.units.find((u) => u.charId === hc.id), ou = cb.units.find((u) => u.charId === oc.id);
  if (!mine) {
    if (!drew) {
      // Ona walks within 3 tiles of Leon, onto open floor, and draws SHOCK on her tile.
      const mm = cb.map, block = new Set([...(mm.solid || []), ...(mm.cover || []), ...(mm.full || []), ...(cb.objects || []).map((o) => o.pos), ...cb.units.filter((u) => !u.dead).map((u) => u.pos)]);
      const near = []; for (let x = 0; x < mm.w; x++) for (let yy = 0; yy < mm.h; yy++) { const k = K(x, yy); if (!block.has(k) && cheb(k, hu.pos) >= 2 && cheb(k, hu.pos) <= 3) near.push(k); }
      near.sort((a, b) => cheb(a, ou.pos) - cheb(b, ou.pos));
      for (const k of near.slice(0, 12)) { const e = await actOn(ona, { type: 'combat/move', unitId: ou.id, to: k }); if (!e) break; }
      await pause(ona, 400); await idle(ona);
      const e = await must({ type: 'combat/draw', unitId: ou.id, word: 'shock' }, 'Ona draws SHOCK', ona);
      drew = !e;
      const pos = (await G(host)).combat.units.find((u) => u.charId === oc.id).pos;
      console.log('  Ona at ' + ref(pos) + ', ' + cheb(pos, hu.pos) + ' tiles from Leon; drew: ' + drew);
    }
    await dismissCut(ona); await must({ type: 'combat/end-turn', unitId: ou.id }, 'Ona ends her turn', ona);
    await pause(host, 600); continue;
  }
  if (!drew) { await dismissCut(host); await must({ type: 'combat/end-turn', unitId: hu.id }, 'Leon waits', host); await pause(host, 600); continue; }
  // Leon's turn, the glyph on the ground: Analyze Ona through the action menu.
  await host.waitForSelector('[data-phc-cutin]', { timeout: 1800 }).catch(() => {}); await dismissCut(host); await idle(host);
  const theirGlyph = (cb.glyphs || []).find((q) => q.word === 'shock');
  ok('Team B\'s SHOCK glyph is on the ground, hostile to Leon (' + (theirGlyph && theirGlyph.side) + ')', !!theirGlyph && theirGlyph.side === 'foe');
  await pickAction(host, /^Analyze/); await pause(host, 200);
  await tok(ou.pos, host).click(); await pause(host, 250);
  await snap('10-analyze-target', host);
  const cb2 = host.getByRole('button', { name: /^Confirm/ }).first();
  const en = await cb2.isEnabled().catch(() => false);
  if (en) await cb2.click(); else console.log('  analyze confirm disabled: ' + ((await cb2.textContent().catch(() => '')) || ''));
  await pause(host, 800); await idle(host);
  gr2 = await growth(hc.id, host); analyzed = true;
  await snap('11-analyzed', host);
}
ok('Leon Analyzed Ona and copied SHOCK: study ' + hostStudy0 + ' → ' + (gr2 && gr2.study) + ', to study: ' + ((gr2 && gr2.toStudy) || []).join(' '), !!gr2 && (gr2.toStudy || []).includes('shock') && gr2.study > hostStudy0);
const lg = (await G(host)).combat.log.filter((l) => /copies SHOCK/.test(l));
ok('the log says it: ' + (lg[0] || '').slice(0, 120), lg.length > 0);
ok('no page errors (team fight)', host.errors.length === 0 && ona.errors.length === 0); if (host.errors.length || ona.errors.length) console.log([...host.errors, ...ona.errors].slice(0, 5).join('\n'));
await browser.close();

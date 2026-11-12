// Sigil 1.5 strokes (rules 1.10) in a real browser, the Proving Ground as a Mage (Solo, Enemy AI off; Brain Power
// Mastered, so Junctions are on): two Lines drawn side by side with the glyph keyboard's stroke picker ("extends FIRE",
// "new Line"), the dashed joining line of the preview, the faint joins on the grid (no join between the two rows), the
// hovered stroke lit and named, each Line Evoked on its own reading (touching glyphs no longer poison), and a junction
// drawn with both of its joins. Screenshots (deviceScaleFactor 1): e2e/shots/sigil15-*.png, or SHOTS=dir.
import { chromium, player, click, BASE, OUT as OUT0, pickAction, pause } from './lib.mjs';
const OUT = process.env.SHOTS ? process.env.SHOTS.replace(/\/?$/, '/') : OUT0;
const browser = await chromium.launch();
const p = await player(browser, 'host');
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const dismissCut = async () => { if (await p.locator('[data-phc-cutin]').count()) { await p.mouse.click(1430, 990); await pause(p, 380); } };
const snap = async (n) => { await dismissCut(); return p.screenshot({ path: OUT + 'sigil15-' + n + '.png' }); };
const ref = (k) => { const [x, y] = k.split(',').map(Number); return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[x] + (y + 1); };
const K = (x, y) => x + ',' + y;
const act = (a) => p.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
const must = async (a, what) => { const e = await act(a); if (e) console.log('  ' + (what || a.type) + ': ' + e); return e; };
const st = () => p.evaluate(() => { const s = window.__phc.getState(), g = s.game, cb = g.combat; const u = cb && cb.units.find((x) => x.side === 'pc'); return { g, cb, u }; });
const tok = (k) => p.locator('button.phc-tok[aria-label^="' + ref(k) + ' ·"]').first();
const idle = () => p.waitForFunction(() => !window.__phcHold || performance.now() >= window.__phcHold(), null, { timeout: 12000 }).catch(() => {});
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
const sidAt = async (k) => (await glyphs()).find((g) => g.pos === k)?.strokeId;
/** Pick Draw (once) and a word on the keyboard. */
async function word(w) {
  await dismissCut();
  const key = p.locator('[data-glyph-keyboard] button[data-word="' + w + '"]').first();
  if (!(await key.count())) { await pickAction(p, /^Draw a glyph/); await pause(p, 200); }
  await key.click(); await pause(p, 150);
}
const picker = async () => (await p.locator('[data-stroke-picker] button').allTextContents()).map((t) => t.trim());
const note = async () => ((await p.locator('.phc-cb-seltext').first().getAttribute('title').catch(() => '')) || '').trim();
const pick = async (label) => { const re = new RegExp('^\\s*(✓ )?' + label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$'); await p.locator('[data-stroke-picker] button', { hasText: re }).first().click(); await pause(p, 150); };
async function drawHere() { await ensureAp(2); const s = await st(); await tok(s.u.pos).click(); await pause(p, 300); await idle(); }

// ---------- the Proving Ground, Solo; a Mage with an Evoker and four words ----------
await p.goto(BASE);
await click(p, 'PROVING GROUND');
const nm = p.getByPlaceholder('Leon');
await Promise.race([nm.waitFor({ timeout: 8000 }).catch(() => {}), p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 8000 }).catch(() => {})]);
if (await nm.count()) { await nm.fill('Leon'); await click(p, 'Solo ›'); }
await p.mouse.move(1430, 990);
await p.waitForFunction(() => window.__phc.getState().game?.sandbox?.state === 'ready', null, { timeout: 30000 });
let s = await st();
const cid = Object.values(s.g.characters)[0].id;
await must({ type: 'sandbox/ai', on: false }); await must({ type: 'sandbox/auto', on: false });
await must({ type: 'sandbox/give', charId: cid, item: 'service_pistol', equip: true }, 'a pistol');
await must({ type: 'sandbox/kit', charId: cid, kind: 'sigil' });
await must({ type: 'sandbox/level', charId: cid, level: 10 });
await must({ type: 'sandbox/class', charId: cid, classId: 'mage' }, 'Mage');
await must({ type: 'sandbox/give', charId: cid, item: 'standard_core', qty: 3 }, 'cores');
await must({ type: 'sandbox/skill', charId: cid, skill: 'brain_power', points: 10 }); // Mastered: Junctions
await must({ type: 'sandbox/skill', charId: cid, skill: 'athletics', points: 9 });
for (const w of ['fire', 'seek', 'spark', 'arc', 'spread']) await must({ type: 'sandbox/learn', charId: cid, word: w }, 'learn ' + w);
s = await st();
ok('a Mage: ' + s.g.characters[cid].classId, s.g.characters[cid].classId === 'mage');
await p.getByRole('button', { name: /^⚔ Start the fight/ }).first().click();
await p.mouse.move(1430, 990);
await p.waitForFunction(() => window.__phc.getState().game?.phase === 'combat', null, { timeout: 30000 });
await p.waitForFunction(() => window.__phc.getState().screen === 'combat', null, { timeout: 8000 }).catch(() => {});
await must({ type: 'sandbox/clear' });
for (let i = 0; i < 20; i++) { s = await st(); const cur = s.cb.units.find((u) => u.id === s.cb.order[s.cb.turn]); if (cur?.side === 'pc') break; await pause(p, 300); }
await pause(p, 2300); await dismissCut();
// A far boss so the wave never ends.
await must({ type: 'sandbox/spawn', tier: 'boss', weapon: 'fists', at: 'P1' }, 'far boss');
// Two free rows of four, side by side.
s = await st();
const m = s.cb.map, bad = new Set([...(m.solid || []), ...(m.cover || []), ...(m.full || []), ...(m.difficult || []), ...(s.cb.objects || []).map((o) => o.pos), ...s.cb.units.filter((u) => !u.dead && u.id !== s.u.id).map((u) => u.pos)]);
let lane = null;
for (const y of [5, 6, 4, 7, 3, 8, 2]) for (let x0 = 1; x0 + 4 <= m.w && !lane; x0++) { let good = true; for (let dx = 0; dx < 4 && good; dx++) for (const dy of [-1, 0, 1]) if (bad.has(K(x0 + dx, y + dy))) good = false; if (good) lane = { x0, y }; }
ok('found two free rows', !!lane);
const { x0, y } = lane, A = K(x0, y), B = K(x0 + 1, y), C = K(x0, y + 1), D = K(x0 + 1, y + 1), J = K(x0 + 2, y), Up = K(x0 + 2, y - 1);
console.log('  rows at', ref(A), ref(C));

// ---------- 1. FIRE alone: no picker, it starts a new Line ----------
await moveTo(A); await word('fire');
ok('nothing near: no picker; "' + await note() + '"', (await p.locator('[data-stroke-picker]').count()) === 0 && /it starts a new Line/.test(await note()));
await drawHere();
ok('FIRE drawn', (await glyphs()).some((g) => g.pos === A && g.word === 'fire'));

// ---------- 2. SPARK below it: the picker; pick new Line ----------
await moveTo(C); await word('spark');
let pk = await picker();
ok('picker next to FIRE: ' + pk.join(' | '), pk.join('|') === '✓ extends FIRE|new Line|junction: FIRE + new Line');
ok('preview names the stroke: "' + await note() + '"', /extends the Line: FIRE · SPARK/.test(await note()));
ok('the dashed joining line is on the grid', (await p.locator('[data-stroke-join]').count()) >= 2);
await snap('1-picker-default');
await pick('new Line');
pk = await picker();
ok('new Line picked: ' + pk.join(' | ') + ' · "' + await note() + '"', pk.includes('✓ new Line') && /starts a new Line/.test(await note()));
ok('no joining line now', (await p.locator('[data-stroke-join]').count()) === 0);
await snap('2-picker-new-line');
await drawHere();
ok('SPARK is its own stroke', (await sidAt(C)) && (await sidAt(C)) !== (await sidAt(A)));

// ---------- 3. SEEK beside FIRE (picked), ARC beside SPARK (the default) ----------
await moveTo(B); await word('seek');
pk = await picker();
ok('two strokes offered: ' + pk.join(' | '), pk.includes('extends FIRE') && pk.includes('✓ extends SPARK') && pk.includes('new Line'));
await pick('extends FIRE');
ok('picked FIRE: "' + await note() + '"', /FIRE · SEEK/.test(await note()));
await snap('3-picker-two-strokes');
await drawHere();
await moveTo(D); await word('arc');
pk = await picker();
ok('ARC defaults to SPARK\'s Line: ' + pk.join(' | '), pk.includes('✓ extends SPARK'));
await snap('4-preview-arc');
await drawHere();
ok('two Lines side by side: FIRE·SEEK and SPARK·ARC', (await sidAt(A)) === (await sidAt(B)) && (await sidAt(C)) === (await sidAt(D)) && (await sidAt(A)) !== (await sidAt(C)));
ok('the grid joins each Line: ' + await p.locator('[data-stroke-join]').count() + ' join marks', (await p.locator('[data-stroke-join]').count()) === 4);

// ---------- 4. hover lights a stroke and names its words ----------
await moveTo(K(x0 + 3, y + 1));
await p.locator('[role="tabpanel"]').getByRole('button', { name: /^Draw a glyph/ }).first().click().catch(() => {}); // put Draw down
await tok(A).hover(); await pause(p, 250);
const tip = ((await p.locator('[data-stroke-tip]').first().textContent().catch(() => '')) || '').trim();
ok('hovered FIRE: "' + tip + '", ' + await p.locator('[data-stroke-hot]').count() + ' tiles lit', tip === 'FIRE · SEEK' && (await p.locator('[data-stroke-hot]').count()) === 2);
await snap('5-hover-fire-seek');
await tok(D).hover(); await pause(p, 250);
ok('hovered ARC: SPARK · ARC', ((await p.locator('[data-stroke-tip]').first().textContent().catch(() => '')) || '').trim() === 'SPARK · ARC');
await snap('6-hover-spark-arc');

// ---------- 5. Evoke reads each Line on its own ----------
await pickAction(p, /^Evoke/); await pause(p, 200);
await tok(A).click(); await pause(p, 300);
const line = ((await p.locator('[aria-label="The Line"]').first().textContent().catch(() => '')) || '').replace(/\s+/g, ' ');
ok('Evoke panel: FIRE · SEEK is a spell (' + line.slice(0, 90) + ')', /FIRE/.test(line) && /SEEK/.test(line) && !/SPARK/.test(line) && /✓ A spell/.test(line));
await snap('7-evoke-fire-seek');
await p.getByRole('button', { name: '‹ Pick another pattern' }).first().click().catch(() => {}); await pause(p, 150);
await tok(C).click(); await pause(p, 300);
const line2 = ((await p.locator('[aria-label="The Line"]').first().textContent().catch(() => '')) || '').replace(/\s+/g, ' ');
ok('Evoke panel: SPARK · ARC is a spell', /SPARK/.test(line2) && /ARC/.test(line2) && !/FIRE/.test(line2) && /✓ A spell/.test(line2));
await p.getByRole('button', { name: '‹ Pick another pattern' }).first().click().catch(() => {});
await pickAction(p, /^Evoke/).catch(() => {});

// ---------- 6. a junction: SPREAD at the end of FIRE·SEEK, also starting a new Line; then SEEK up from it ----------
await moveTo(J); await word('spread');
pk = await picker();
ok('junction offered: ' + pk.join(' | '), pk.includes('junction: FIRE·SEEK + new Line'));
await pick('junction: FIRE·SEEK + new Line');
ok('junction preview: "' + await note() + '"', /a junction/.test(await note()));
await snap('8-junction-picker');
await drawHere();
await moveTo(Up); await word('seek');
ok('SEEK extends the junction\'s new Line by default: ' + (await picker()).join(' | ') + ' · "' + await note() + '"', /SPREAD · SEEK/.test(await note()));
await drawHere();
const jg = (await glyphs()).find((g) => g.pos === J);
ok('the junction glyph lies in two strokes', !!jg && !!jg.strokeId2 && jg.strokeId2 !== jg.strokeId);
await moveTo(K(x0 + 3, y + 1));
await p.locator('[role="tabpanel"]').getByRole('button', { name: /^Draw a glyph/ }).first().click().catch(() => {});
await tok(J).hover(); await pause(p, 250);
const jt = ((await p.locator('[data-stroke-tip]').first().textContent().catch(() => '')) || '').trim();
ok('hovered junction names both Lines: "' + jt + '"', jt === 'FIRE · SEEK · SPREAD / SPREAD · SEEK');
await snap('9-junction-hover');
await pickAction(p, /^Evoke/); await pause(p, 200);
await tok(J).click(); await pause(p, 300);
const jp = await p.locator('[data-junction-pick] button').allTextContents();
ok('Evoke on the junction offers both Lines: ' + jp.join(' | '), jp.length === 2);
await snap('10-junction-evoke');
ok('no page errors', p.errors.length === 0); if (p.errors.length) console.log(p.errors.slice(0, 5).join('\n'));
await browser.close();

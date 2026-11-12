// Sigil magic, rules 1.4, in a real browser (the Proving Ground, Solo, Enemy AI off unless a step turns it on):
//  1. a 3-glyph Line FIRE · SEEK · SPREAD walked on your own tiles with the glyph keyboard; Evoke: the Line panel, the
//     facing arrows on the tiles you can stand on, the tinted area, a hovered target with its burst tiles and the
//     affected units with numbers; Confirm, and the FX;
//  2. a CHAIN spell's numbered jumps; 3. a WAIT trap an enemy springs; 4. a WATCH turret firing; 5. RAISE walls and
//  6. NULL wiping them; 7. STEP blink; 8. KIN's fizzle warning; 9. an enemy Sigil caster casting at you.
// Screenshots (deviceScaleFactor 1) land in e2e/shots/sigil14-*.png.
import { chromium, player, click, BASE, OUT, pickAction, pause } from './lib.mjs';
const browser = await chromium.launch();
const p = await player(browser, 'host');
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const snap = async (n) => { await dismissCut(); return p.screenshot({ path: OUT + 'sigil14-' + n + '.png' }); };
const ref = (k) => { const [x, y] = k.split(',').map(Number); return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[x] + (y + 1); };
const K = (x, y) => x + ',' + y;
const xy = (k) => k.split(',').map(Number);
const act = (a) => p.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
const st = () => p.evaluate(() => { const s = window.__phc.getState(), g = s.game, cb = g.combat; const u = cb && cb.units.find((x) => x.side === 'pc'); return { g, cb, u, c: u && g.characters[u.charId], toast: s.toast }; });
const tok = (k) => p.locator('button.phc-tok[aria-label^="' + ref(k) + ' ·"]').first();
const fxCount = () => p.evaluate(() => document.querySelector('.phc-fx-layer')?.childElementCount || 0);
const dismissCut = async () => { if (await p.locator('[data-phc-cutin]').count()) { await p.mouse.click(1430, 990); await pause(p, 380); } };
const pickAct = async (re) => { await dismissCut(); await pickAction(p, re); await pause(p, 150); };
const confirmBtn = () => p.getByRole('button', { name: /^Confirm/ }).first();
const panelText = async (label) => ((await p.locator('[aria-label="' + label + '"]').first().textContent().catch(() => '')) || '').replace(/\s+/g, ' ');
const logSince = async (n) => (await st()).cb.log.slice(n);
const fxSince = async (n) => (await st()).cb.fx.filter((e) => e.n > n);
const fxSeq = async () => (await st()).cb.fxSeq || 0;
const must = async (a, what) => { const e = await act(a); if (e) console.log('  ' + (what || a.type) + ': ' + e); return e; };
/** Enemy AI off: ending the turn hands it straight back with full AP (and runs the round: fields, traps, turrets). */
const idleOn = (pg) => pg.waitForFunction(() => !window.__phcHold || performance.now() >= window.__phcHold(), null, { timeout: 12000 }).catch(() => {});
async function newRound() {
  await idleOn(p); await dismissCut();
  const r0 = (await st()).cb.round;
  await p.getByRole('button', { name: 'End turn', exact: true }).click();
  await p.waitForFunction((r0) => { const cb = window.__phc.getState().game.combat; const u = cb.units.find((x) => x.id === cb.order[cb.turn]); return cb.round > r0 && u && u.side === 'pc' && u.ap >= 5; }, r0, { timeout: 30000 });
  await p.waitForSelector('[data-phc-cutin]', { timeout: 1800 }).catch(() => {}); await dismissCut(); await idleOn(p);
}
const ensureAp = async (n) => { if ((await st()).u.ap < n) await newRound(); };
const moveTo = async (k) => { const s = await st(); if (s.u.pos === k) return null; await ensureAp(2); return must({ type: 'combat/move', unitId: s.u.id, to: k }, 'move to ' + ref(k)); };
/** Walk a Line through the engine: step onto each tile and draw its word there (rules 1.4: your own tile only). */
async function walkLine(words, tiles) {
  for (let i = 0; i < words.length; i++) {
    await moveTo(tiles[i]); await ensureAp(2);
    const s = await st(); const e = await must({ type: 'combat/draw', unitId: s.u.id, word: words[i], tile: ref(tiles[i]) }, 'draw ' + words[i]);
    if (e) return e;
  }
  return null;
}
/** Free, standable tiles (no wall, cover, object, glyph or creature). */
const freeSet = () => p.evaluate(() => {
  const cb = window.__phc.getState().game.combat, m = cb.map, out = [];
  const bad = new Set([...(m.solid || []), ...(m.cover || []), ...(m.full || []), ...(m.difficult || []), ...(cb.objects || []).map((o) => o.pos), ...cb.units.filter((u) => !u.dead).map((u) => u.pos), ...(cb.glyphs || []).map((g) => g.pos)]);
  for (let x = 0; x < m.w; x++) for (let y = 0; y < m.h; y++) { const k = x + ',' + y; if (!bad.has(k)) out.push(k); }
  return out;
});
/** A row with n free tiles in a row from x0 (and some room above and below at the far end, for bursts). */
async function findLane(n) {
  const free = new Set(await freeSet()), m = (await st()).cb.map, me = (await st()).u.pos;
  const okAt = (x, y) => free.has(K(x, y)) || K(x, y) === me;
  for (const y of [7, 5, 6, 4, 8, 3, 9, 2, 10, 1]) for (let x0 = 0; x0 + n <= m.w; x0++) {
    let good = true; for (let i = 0; i < n && good; i++) good = okAt(x0 + i, y);
    if (good) return { x0, y };
  }
  return null;
}
/** A free tile next to k (for a second unit in a burst). */
const nextTo = async (k) => { const free = new Set(await freeSet()), [x, y] = xy(k); return [[1, 1], [1, -1], [0, 1], [0, -1], [-1, 1], [-1, -1]].map(([dx, dy]) => K(x + dx, y + dy)).find((t) => free.has(t)); };
/** A free tile at least 2 from every tile given (off the Line). */
const awayFrom = async (ks, near) => { const free = await freeSet(), [nx, ny] = xy(near); return free.filter((t) => ks.every((k) => Math.max(Math.abs(xy(t)[0] - xy(k)[0]), Math.abs(xy(t)[1] - xy(k)[1])) >= 2)).sort((a, b) => (Math.abs(xy(a)[0] - nx) + Math.abs(xy(a)[1] - ny)) - (Math.abs(xy(b)[0] - nx) + Math.abs(xy(b)[1] - ny)))[0]; };
/** Clear the field and spawn drill units (bosses, so nothing dies and ends the wave) where asked; plus one far off. */
async function field(tiles, o = {}) {
  await must({ type: 'sandbox/clear' });
  const out = [];
  for (const k of tiles) { const e = await must({ type: 'sandbox/spawn', tier: o.tier || 'soldier', weapon: o.weapon || 'fists', at: ref(k), ...(o.caster ? { caster: o.caster } : {}) }, 'spawn at ' + ref(k)); if (!e) out.push(k); }
  // One boss far off in a corner, so a kill never ends the wave.
  const free = await freeSet(), far = ['15,0', '15,11', '0,11', '0,0', '14,0', '15,1'].find((k) => free.includes(k));
  if (far && !o.alone) await must({ type: 'sandbox/spawn', tier: 'boss', weapon: 'fists', at: ref(far) }, 'far boss');
  await pause(p, 250);
  const s = await st();
  return out.map((k) => s.cb.units.find((u) => u.pos === k && u.side === 'foe' && !u.dead)).filter(Boolean);
}
/** Clear the field, then find a lane of n free tiles. */
const clearLane = async (n) => { await must({ type: 'sandbox/clear' }); return findLane(n); };
const unitAt = async (k) => (await st()).cb.units.find((u) => u.pos === k && !u.dead);
/** Pick Evoke, then a glyph of the Line on the grid (it selects the pattern). */
async function startEvoke(glyphTile) {
  await dismissCut();
  // Evoke may still be the picked action (a second press would put it down): press it only when it isn't.
  const evBtn = p.locator('[role="tabpanel"]').getByRole('button', { name: /^Evoke/ }).first();
  if (!((await evBtn.count()) && (await evBtn.getAttribute('aria-pressed')) === 'true')) await pickAct(/^Evoke/);
  // A Line picked earlier stays picked: drop it first, so this click picks the new one.
  const again = p.getByRole('button', { name: '‹ Pick another pattern' }).first();
  if (await again.count()) { await again.click(); await pause(p, 150); }
  await tok(glyphTile).click(); await pause(p, 250);
}
/** Confirm, then catch the effects layer at a few moments. */
async function confirmAndCatch(name, at = [120, 320, 650]) {
  const n0 = await fxSeq(), l0 = (await st()).cb.log.length;
  const b = confirmBtn(); const en = await b.isEnabled().catch(() => false);
  if (en) await b.click(); else console.log('  confirm is disabled: ' + (await b.textContent().catch(() => '')));
  let peak = 0, t = 0;
  for (const ms of at) { await pause(p, Math.max(0, ms - t)); t = ms; peak = Math.max(peak, await fxCount()); await snap(name + '-' + ms); }
  return { en, peak, events: await fxSince(n0), log: await logSince(l0) };
}

// ---------- 0. The Proving Ground, Solo; the Recruit gets an Evoker, cores and the words ----------
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
// A focus counts only in a hand (item 630): the Recruit's rifle fills both, so a one-handed pistol first, then the kit's
// Evoker goes into the off hand.
await must({ type: 'sandbox/give', charId: cid, item: 'service_pistol', equip: true }, 'a pistol');
await must({ type: 'sandbox/kit', charId: cid, kind: 'sigil' });
await must({ type: 'sandbox/level', charId: cid, level: 10 });
await must({ type: 'sandbox/give', charId: cid, item: 'standard_core', qty: 2 }, 'cores');
await must({ type: 'sandbox/skill', charId: cid, skill: 'brain_power', points: 10 }); // Intelligence 10: 4 words a spell, +9 to hit
await must({ type: 'sandbox/skill', charId: cid, skill: 'athletics', points: 9 }); // Agility 9: 5 tiles an AP
for (const w of ['fire', 'seek', 'spread', 'shock', 'chain', 'spark', 'wait', 'watch', 'raise', 'null', 'step', 'condense', 'mend', 'kin'])
  await must({ type: 'sandbox/learn', charId: cid, word: w }, 'learn ' + w);
s = await st();
const ch = s.g.characters[cid];
ok('the Recruit has an Evoker and the words: ' + (ch.sigils || []).join(' '), (ch.pack || []).concat(ch.offHand ? [ch.offHand] : []).some((x) => (x.item || x.id) === 'evoker') && ['fire', 'seek', 'chain', 'wait', 'watch', 'raise', 'null', 'step', 'kin'].every((w) => ch.sigils.includes(w)));
await p.getByRole('button', { name: /^⚔ Start the fight/ }).first().click();
await p.mouse.move(1430, 990);
await p.waitForFunction(() => window.__phc.getState().game?.phase === 'combat', null, { timeout: 30000 });
await p.waitForFunction(() => window.__phc.getState().screen === 'combat', null, { timeout: 8000 }).catch(() => {});
await must({ type: 'sandbox/clear' });
for (let i = 0; i < 20; i++) { s = await st(); const cur = s.cb.units.find((u) => u.id === s.cb.order[s.cb.turn]); if (cur?.side === 'pc') break; await pause(p, 300); }
await pause(p, 2300); await dismissCut();
s = await st();
console.log('  me', ref(s.u.pos), 'AP', s.u.ap, 'mg', JSON.stringify({ words: s.u.mg?.words, maxWords: s.u.mg?.maxWords, charge: s.u.mg?.charge, flux: s.u.mg?.flux }));
ok('in the fight with an Evoker: ' + s.u.mg?.maxWords + ' words a spell, ' + s.u.mg?.charge + ' charge', !!s.u.mg?.evoker && s.u.mg.maxWords >= 4);
const topUp = async () => { const s = await st(); if ((s.u.mg?.charge || 0) < 10) { await must({ type: 'sandbox/give', charId: cid, item: 'standard_core', qty: 1 }, 'a core'); await ensureAp(2); } if (((await st()).u.mg?.charge || 0) < 10) await must({ type: 'combat/core', unitId: (await st()).u.id }, 'swap core'); if ((s.u.mg?.flux || 0) >= 5) { await ensureAp(2); await must({ type: 'combat/vent', unitId: (await st()).u.id }, 'vent'); } };

// ---------- 1. FIRE · SEEK · SPREAD: walk the Line with the glyph keyboard, then Evoke it from its end ----------
let lane = await clearLane(11);
ok('an open lane for the Line: ' + (lane && ref(K(lane.x0, lane.y)) + '…'), !!lane);
const L = (dx, dy = 0) => K(lane.x0 + dx, lane.y + dy);
const second = await nextTo(L(8));
const [t1, t2] = await field([L(8), second]);
ok('two drill units stand down the lane at ' + [L(8), second].map(ref).join(', '), !!t1 && !!t2);
await moveTo(L(4)); await ensureAp(5);
// FIRE from the keyboard on our own tile
await pickAct(/^Draw a glyph/);
await p.waitForSelector('div[aria-label="Glyph keyboard"]');
const key = (w) => p.locator('div[aria-label="Glyph keyboard"] button', { hasText: new RegExp('^\\s*' + w) }).first();
await key('FIRE').click(); await pause(p, 150);
const kbFire = ((await key('FIRE').textContent()) || '').replace(/\s+/g, ' ');
ok('the keyboard shows the word\'s cost and effect: ' + kbFire, /ch · \d AP\s*starts/.test(kbFire));
// The keyboard is split into labelled rows by Sigil 1.4 word group, in order (empty groups left out), and fits its column.
const ROW_ORDER = ['ELEMENTS', 'AFFLICTIONS', 'BOONS', 'WORKINGS', 'REACH', 'DELIVERY', 'BURST', 'FILTER'];
const kb = await p.evaluate(() => { const pad = document.querySelector('div[aria-label="Glyph keyboard"]');
  const rows = [...pad.querySelectorAll('[data-word-row]')].map((r) => ({ label: (r.querySelector('span[aria-hidden]')?.textContent || '').trim(), words: [...r.querySelectorAll('button[data-word]')].map((b) => b.dataset.word) }));
  const box = pad.getBoundingClientRect(), keys = [...pad.querySelectorAll('button[data-word]')];
  return { rows, over: pad.scrollWidth > pad.clientWidth + 1 || keys.some((b) => { const r = b.getBoundingClientRect(); return r.right > box.right + 1 || r.left < box.left - 1; }) }; });
ok('the keyboard rows, in order: ' + kb.rows.map((r) => r.label + ' ' + r.words.join('/')).join(' · '), kb.rows.length >= 5 && kb.rows.every((r) => r.words.length > 0) && kb.rows.map((r) => r.label).join() === ROW_ORDER.filter((l) => kb.rows.some((r) => r.label === l)).join());
ok('FIRE, SHOCK and SPARK sit in ELEMENTS; SEEK in REACH; KIN in FILTER', ['fire', 'shock', 'spark'].every((w) => kb.rows.find((r) => r.label === 'ELEMENTS')?.words.includes(w)) && kb.rows.find((r) => r.label === 'REACH')?.words.includes('seek') && kb.rows.find((r) => r.label === 'FILTER')?.words.includes('kin'));
ok('no key runs past the keyboard\'s edge (rows wrap)', !kb.over);
// Arrow keys: Right steps to the next key, Down drops to the row below, Home and End go to the ends.
await key('FIRE').focus();
const focused = () => p.evaluate(() => document.activeElement?.dataset?.word || '');
const flat = kb.rows.flatMap((r) => r.words);
await p.keyboard.press('ArrowRight'); const fRight = await focused();
await p.keyboard.press('Home'); await p.keyboard.press('ArrowDown'); const fDown = await focused();
await p.keyboard.press('End'); const fEnd = await focused();
const rowOf = (w) => kb.rows.findIndex((r) => r.words.includes(w));
ok('arrow keys move through the keys: Right ' + fRight + ', Down ' + fDown + ', End ' + fEnd, fRight === flat[1] && (rowOf(fDown) === 1 || (rowOf(fDown) === 0 && flat.indexOf(fDown) > 0)) && fEnd === flat[flat.length - 1]);
await p.screenshot({ path: OUT + 'sigil14-01b-keyboard-rows.png' });
await tok(L(4)).hover(); await pause(p, 150); await snap('01-keyboard');
await tok(L(4)).click(); await pause(p, 300);
// Our own tile now holds FIRE: every key is refused, and says why on the key, in its tooltip and its aria label.
const refused = await p.evaluate(() => { const b = [...document.querySelectorAll('div[aria-label="Glyph keyboard"] button[data-word]')]; return b.length ? b.map((x) => ({ off: x.getAttribute('aria-disabled'), text: (x.textContent || '').replace(/\s+/g, ' '), title: x.title, aria: x.getAttribute('aria-label') })) : null; });
if (refused) ok('on a tile with a glyph every key says "tile taken": ' + refused[0].text + ' | ' + refused[0].aria, refused.every((k) => k.off === 'true' && /tile taken/.test(k.text) && /One glyph per tile/.test(k.title) && /can't draw now/.test(k.aria)));
await moveTo(L(3));
await pickAct(/^Draw a glyph/).catch(() => {});
await key('SEEK').click(); await pause(p, 150);
const kbSeek = ((await key('SEEK').textContent()) || '').replace(/\s+/g, ' ');
ok('SEEK one step on extends the Line: ' + kbSeek, /extends/.test(kbSeek));
await tok(L(3)).click(); await pause(p, 300);
await moveTo(L(2));
await pickAct(/^Draw a glyph/).catch(() => {});
await key('SPREAD').click(); await pause(p, 150);
await tok(L(2)).click(); await pause(p, 300);
s = await st();
ok('a 3-glyph Line on our own tiles: ' + (s.cb.glyphs || []).map((g) => g.word.toUpperCase() + '@' + ref(g.pos)).join(' '), ['fire', 'seek', 'spread'].every((w, i) => (s.cb.glyphs || []).some((g) => g.word === w && g.pos === L(4 - i))));
await snap('02-line-drawn');
// Step off (two tiles from any glyph): Evoke shows where to stand, with facing arrows
await moveTo(await awayFrom([L(2), L(3), L(4)], L(3, 2)));
await topUp();
await startEvoke(L(3));
const linePanel = await panelText('The Line');
ok('the Line panel: ' + linePanel.slice(0, 160), /LINE OF 3/.test(linePanel) && /FIRE/.test(linePanel) && /SEEK/.test(linePanel) && /SPREAD/.test(linePanel) && /✓/.test(linePanel));
const arrowTiles = await p.evaluate(() => [...document.querySelectorAll('button.phc-tok')].filter((b) => /[→←↑↓↗↘↙↖]/.test(b.textContent || '')).length);
const standLbl = (await tok(L(1)).getAttribute('aria-label')) || '';
ok('tiles you can Evoke from carry a facing arrow (' + arrowTiles + ' tiles; ' + ref(L(1)) + ': ' + standLbl.slice(0, 80) + ')', arrowTiles > 0);
await snap('03-stand-arrows');
// Back onto the Line's end: it fires east, along the Line, toward the targets
await moveTo(L(2)); await pause(p, 300);
let lp = await panelText('The Line');
if (!/FIRES/.test(lp)) { await startEvoke(L(3)); lp = await panelText('The Line'); }
ok('from the end it fires along the Line: ' + lp.slice(0, 60), /FIRES →/.test(lp));
const tinted = await p.evaluate(() => [...document.querySelectorAll('button.phc-tok')].filter((b) => /79, 200, 223|8BDEEE|4FC8DF/i.test(b.getAttribute('style') || '') || /79, 200, 223/.test((b.querySelector('[style]')?.getAttribute('style')) || '')).length);
console.log('  tinted-looking tiles:', tinted);
await snap('04-area');
await tok(t1.pos).hover(); await pause(p, 350);
const t1Lbl = (await tok(t1.pos).getAttribute('aria-label')) || '', t2Lbl = (await tok(t2.pos).getAttribute('aria-label')) || '';
const aff = await panelText('Who it affects');
ok('hovering the target: its numbers on the tile (' + t1Lbl.replace(/^.*?·/, '').slice(0, 70) + ')', /−\d+ HP/.test(t1Lbl));
ok('the burst catches the second unit too (' + t2Lbl.replace(/^.*?·/, '').slice(0, 70) + ')', /−\d+ HP/.test(t2Lbl));
ok('who it affects, with numbers: ' + aff.slice(0, 160), /ENEMY/.test(aff) && /\d+ HP|−\d+/.test(aff));
await snap('05-hover-burst');
await tok(t1.pos).click(); await pause(p, 250);
const hp1 = [(await unitAt(t1.pos)).hp, (await unitAt(t2.pos)).hp];
let r = await confirmAndCatch('06-evoke-fx');
s = await st();
const dealt = [hp1[0] - s.cb.units.find((u) => u.id === t1.id).hp, hp1[1] - s.cb.units.find((u) => u.id === t2.id).hp];
ok('Evoke: ' + r.log.filter((l) => /evokes/.test(l)).join(' ').slice(0, 150), r.log.some((l) => /evokes FIRE · SEEK · SPREAD|evokes SPREAD · SEEK · FIRE|evokes/.test(l)));
ok('both units are rolled at (' + dealt.join(', ') + ' damage)', [t1, t2].every((t) => r.log.join(' ').includes(t.name)));
ok('the FX play (' + r.events.map((e) => e.k + (e.element ? ':' + e.element : '')).join(' ') + ' · peak ' + r.peak + ' nodes)', r.events.some((e) => e.k === 'evoke') && r.peak > 0);
ok('the glyphs are spent', !(s.cb.glyphs || []).some((g) => [L(2), L(3), L(4)].includes(g.pos)));

// ---------- 2. CHAIN: SHOCK · SEEK · CHAIN · CHAIN, the jumps numbered ----------
await newRound(); await topUp();
lane = await clearLane(13);
const [c1, c2, c3] = await field([L(8), L(10), L(12)]);
ok('three drill units in a row for the chain', !!c1 && !!c2 && !!c3);
let chained = false;
for (let attempt = 0; attempt < 3 && !chained; attempt++) {
  if (attempt) { await newRound(); await topUp(); await field([L(8), L(10), L(12)]); }
  await walkLine(['shock', 'seek', 'chain', 'chain'], [L(5), L(4), L(3), L(2)]);
  await topUp(); await ensureAp(3);
  await startEvoke(L(3));
  if (process.env.DBG) { await snap('dbg-chain-' + attempt); const s = await st(); console.log('  dbg', ref(s.u.pos), 'AP', s.u.ap, (s.cb.glyphs || []).map((g) => g.word + '@' + ref(g.pos)).join(' '), '|', await panelText('The Line')); }
  await tok(L(8)).hover(); await pause(p, 350);
  const chainMarks = await p.evaluate((ks) => ks.map((k) => { const [x, y] = k.split(',').map(Number); const r = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[x] + (y + 1); const b = document.querySelector('button.phc-tok[aria-label^="' + r + ' ·"]'); return (b?.textContent || '').replace(/\s+/g, ' '); }), [L(10), L(12)]);
  const affC = await panelText('Who it affects');
  console.log('  chain tiles:', chainMarks.join(' || '), '· affects:', affC.slice(0, 220));
  if (!attempt) {
    ok('the hover shows the chain: who it jumps to, with the multipliers', /×0\.75|×0\.56|jump/i.test(affC + chainMarks.join(' ')));
    await snap('07-chain-hover');
  }
  await tok(L(8)).click(); await pause(p, 200);
  r = await confirmAndCatch('08-chain-fx' + (attempt ? '-' + attempt : ''), [150, 400, 800]);
  chained = r.events.some((e) => e.k === 'chain');
  console.log('  CHAIN attempt ' + (attempt + 1) + ': ' + r.events.map((e) => e.k).join(' ') + ' · ' + r.log.join(' ').slice(0, 260));
}
ok('CHAIN: the spell jumps on (chain fx with numbered jumps)', chained);

// ---------- 3. WAIT: a hidden trap set on a unit's tile; it goes off when that unit starts its turn ----------
await newRound(); await topUp();
lane = await clearLane(11);
const [w1] = await field([L(8)]);
await walkLine(['spark', 'seek', 'wait'], [L(4), L(3), L(2)]);
await topUp(); await ensureAp(3);
await startEvoke(L(3));
await tok(w1.pos).click(); await pause(p, 250);
r = await confirmAndCatch('09-trap-set', [150, 450]);
s = await st();
ok('a trap waits at ' + ref(w1.pos) + ': ' + r.log.join(' ').slice(0, 160), (s.cb.zones || []).some((z) => z.kind === 'trap' && z.tiles.includes(w1.pos)));
const trapLegend = await p.locator('text=/Your trap/').count();
ok('the trap shows on our grid and legend', trapLegend > 0 || /⧗/.test((await tok(w1.pos).textContent()) || ''));
await snap('10-trap-on-grid');
const hpW = (await unitAt(w1.pos)).hp, n0 = await fxSeq();
await newRound();
s = await st();
const sprung = (await fxSince(n0)).filter((e) => e.k === 'trap_sprung');
ok('the drill unit sets it off on its turn (' + (hpW - s.cb.units.find((u) => u.id === w1.id).hp) + ' damage): ' + s.cb.log.filter((l) => /sets off/.test(l)).slice(-1)[0], sprung.length === 1 && !(s.cb.zones || []).some((z) => z.kind === 'trap'));
await snap('11-trap-sprung');

// ---------- 4. WATCH: a turret that shoots at the start of our turns ----------
await topUp();
lane = await clearLane(11);
const [tw] = await field([L(10)]);

await walkLine(['spark', 'seek', 'watch'], [L(4), L(3), L(2)]);
await topUp(); await ensureAp(3);
await startEvoke(L(3));
await tok(L(7)).click(); await pause(p, 250);
r = await confirmAndCatch('12-turret-placed', [150, 500]);
s = await st();
ok('a turret stands at ' + ref(L(7)) + ': ' + r.log.join(' ').slice(0, 150), (s.cb.zones || []).some((z) => z.kind === 'turret'));
const hpT = (await unitAt(tw.pos)).hp, n1 = await fxSeq();
await dismissCut();
await p.getByRole('button', { name: 'End turn', exact: true }).click();
await p.waitForFunction((n1) => (window.__phc.getState().game.combat.fx || []).some((e) => e.n > n1 && e.k === 'turret_shot'), n1, { timeout: 15000 }).catch(() => {});
await pause(p, 250); await snap('13-turret-shot');
await p.waitForFunction(() => { const cb = window.__phc.getState().game.combat; const u = cb.units.find((x) => x.id === cb.order[cb.turn]); return u && u.side === 'pc'; }, null, { timeout: 30000 });
await p.waitForSelector('[data-phc-cutin]', { timeout: 1800 }).catch(() => {}); await dismissCut();
s = await st();
const shots = (await fxSince(n1)).filter((e) => e.k === 'turret_shot');
ok('the turret fires at the start of our turn (' + shots.length + ' shot, ' + (hpT - s.cb.units.find((u) => u.id === tw.id).hp) + ' damage)', shots.length >= 1);
await snap('14-turret-after');

// ---------- 5. RAISE · SEEK · SPREAD: a fortress of walls; 6. NULL · SEEK · SPREAD wipes them ----------
await topUp();
lane = await clearLane(11);
await field([K(15, 0)].filter(Boolean)); // one far off so the wave stays on
await walkLine(['raise', 'seek', 'spread'], [L(4), L(3), L(2)]);
await topUp(); await ensureAp(3);
await startEvoke(L(3));
await tok(L(8)).click(); await pause(p, 250);
r = await confirmAndCatch('15-raise', [150, 450, 900]);
s = await st();
const walls = (s.cb.objects || []).filter((o) => o.kind === 'sigil_wall');
ok('RAISE stands ' + walls.length + ' walls around ' + ref(L(8)) + ' (' + r.events.map((e) => e.k).join(' ') + ')', walls.length >= 10 && r.events.some((e) => e.k === 'wall_raised'));
await newRound(); await topUp();
await walkLine(['null', 'seek', 'spread'], [L(4), L(3), L(2)]);
await topUp(); await ensureAp(3);
await startEvoke(L(3));
const nearWall = walls.map((o) => o.pos).filter((k) => xy(k)[1] === lane.y).sort((a, b) => xy(a)[0] - xy(b)[0])[0] || L(7);
await tok(nearWall).hover(); await pause(p, 250); await snap('16-null-aim');
await tok(nearWall).click(); await pause(p, 250);
r = await confirmAndCatch('17-null', [150, 450, 900]);
s = await st();
const left = (s.cb.objects || []).filter((o) => o.kind === 'sigil_wall').length;
ok('NULL wipes walls (' + walls.length + ' → ' + left + '; ' + r.events.filter((e) => e.k === 'null_wave').map((e) => 'removed ' + e.removed).join('') + ')', left < walls.length && r.events.some((e) => e.k === 'null_wave'));

// ---------- 7. STEP · CONDENSE: a blink ----------
await newRound(); await topUp();
lane = await clearLane(8);
await walkLine(['step', 'condense'], [L(3), L(2)]);
await topUp(); await ensureAp(3);
s = await st(); const from = s.u.pos;
await startEvoke(L(3));
await tok(from).click(); await pause(p, 250); // aim at ourselves
const dest = (await freeSet()).filter((k) => { const [x, y] = xy(k), [fx, fy] = xy(from); return Math.max(Math.abs(x - fx), Math.abs(y - fy)) === 3; })[0];
await tok(dest).hover(); await pause(p, 200);
await snap('18-step-dest');
await tok(dest).click(); await pause(p, 250);
r = await confirmAndCatch('19-blink', [120, 300, 600]);
s = await st();
ok('STEP blinks us ' + ref(from) + ' → ' + ref(s.u.pos) + ' (' + r.events.map((e) => e.k).join(' ') + ')', s.u.pos === dest && r.events.some((e) => e.k === 'blink'));

// ---------- 8. KIN: MEND · KIN on yourself spares you; the panel warns it fizzles ----------
await newRound(); await topUp();
lane = await clearLane(8);
await walkLine(['mend', 'kin'], [L(3), L(2)]);
await ensureAp(3);
await startEvoke(L(3));
s = await st();
await tok(s.u.pos).click(); await pause(p, 300);
const kinPanel = await panelText('The Line'), warn = await p.locator('[aria-label="The Line"] [role="alert"]').first().textContent().catch(() => '');
ok('the KIN fizzle warning: ' + (warn || kinPanel.slice(-120)), /fizzle/i.test(warn || kinPanel));
await snap('20-kin-fizzle');
await p.getByRole('button', { name: '‹ Pick another pattern' }).first().click().catch(() => {});
await must({ type: 'combat/scuff', unitId: s.u.id }, 'scuff');

// ---------- 9. An enemy Sigil caster casts at you ----------
await newRound(); await topUp();
s = await st();
const [mx, my] = xy(s.u.pos);
const casterAt = (await freeSet()).filter((k) => { const [x, y] = xy(k); const d = Math.max(Math.abs(x - mx), Math.abs(y - my)); return d >= 4 && d <= 6; }).sort((a, b) => Math.abs(xy(a)[1] - my) - Math.abs(xy(b)[1] - my))[0];
const [adept] = await field([casterAt], { tier: 'soldier', caster: 'sigil_adept', weapon: '' });
ok('a Sigil adept enters at ' + ref(casterAt) + ' with ' + (adept?.mg?.words || []).map((w) => w.toUpperCase()).join(' '), !!adept && (adept.mg?.words || []).length >= 3);
await must({ type: 'sandbox/ai', on: true });
let cast = false, hpMe = (await st()).u.hp;
for (let i = 0; i < 4 && !cast; i++) {
  const l0 = (await st()).cb.log.length, n2 = await fxSeq();
  await dismissCut();
  await p.getByRole('button', { name: 'End turn', exact: true }).click();
  await p.waitForFunction((n2) => (window.__phc.getState().game.combat.fx || []).some((e) => e.n > n2 && e.k === 'evoke' && e.side === 'foe'), n2, { timeout: 30000 }).then(async () => { await pause(p, 260); await snap('21-enemy-cast-' + i); }, () => {});
  await p.waitForFunction(() => { const cb = window.__phc.getState().game.combat; if (cb.over) return true; const u = cb.units.find((x) => x.id === cb.order[cb.turn]); return u && u.side === 'pc'; }, null, { timeout: 30000 });
  const lines = await logSince(l0);
  console.log('  enemy turn ' + (i + 1) + ':', lines.filter((l) => /Sigil adept/.test(l)).join(' | ').slice(0, 300));
  cast = lines.some((l) => /Sigil adept.*evokes/.test(l));
  if (!cast) { await must({ type: 'sandbox/refill', charId: cid }); }
}
s = await st();
ok('the enemy caster draws and Evokes a spell at us', cast);
await pause(p, 300); await snap('22-enemy-cast-after');
await must({ type: 'sandbox/ai', on: false });

console.log('  page errors:', JSON.stringify(p.errors));
if (p.errors.length) process.exitCode = 1;
await browser.close();

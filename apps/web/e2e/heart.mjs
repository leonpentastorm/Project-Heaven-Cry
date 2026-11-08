// Outburst 2.0 player UI (rules 1.5, game/heartView.ts) in a real browser: the Proving Ground, Solo, Enemy AI off. An
// Emanator with a Fire Burst and a Storm Lance: the Outbursts tab's design cards (shape icon and line), Begin from the
// card, Pump to stage 3 from the HEART panel, the Release preview of the Burst over two drill units (the hatched area,
// both marked with their numbers), the release itself; a Storm Lance snap preview; then the MAGIC tab workshop with two
// schools (the second school's own option row, tone and shape chips, the verdict).
// Screenshots (deviceScaleFactor 1) land in e2e/shots/heart-*.png.
import { chromium, player, click, BASE, OUT } from './lib.mjs';
const browser = await chromium.launch();
const p = await player(browser, 'host');
await p.context().browser(); // deviceScaleFactor 1 (lib.mjs default)
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const ref = (k) => { const [x, y] = k.split(',').map(Number); return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[x] + (y + 1); };
const act = (a) => p.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
const must = async (a, what) => { const e = await act(a); if (e) console.log('  ' + (what || a.type) + ': ' + e); return e; };
const st = () => p.evaluate(() => { const s = window.__phc.getState(), g = s.game, cb = g.combat; const u = cb && cb.units.find((x) => x.side === 'pc'); return { g, cb, u }; });
const dismissCut = async () => { if (await p.locator('[data-phc-cutin]').count()) { await p.mouse.click(1430, 990); await p.waitForTimeout(380); } };
const snap = async (n) => { await dismissCut(); await p.screenshot({ path: OUT + 'heart-' + n + '.png' }); };
const fxCount = () => p.evaluate(() => document.querySelector('.phc-fx-layer')?.childElementCount || 0);
const hearts = () => p.evaluate(() => [...document.querySelectorAll('.phc-fx-layer [data-heart]')].map((n) => ({ stage: n.dataset.heart, aura: n.dataset.aura, watch: !!n.dataset.watch })));
const fxSince = async (n) => (await st()).cb.fx.filter((e) => e.n > n).map((e) => e.k);
const seq = async () => (await st()).cb.fxSeq || 0;
async function newRound() {
  await dismissCut();
  const r0 = (await st()).cb.round;
  await p.getByRole('button', { name: 'End turn', exact: true }).click();
  await p.waitForFunction((r0) => { const cb = window.__phc.getState().game.combat; const u = cb.units.find((x) => x.id === cb.order[cb.turn]); return cb.round > r0 && u && u.side === 'pc' && u.ap >= 5; }, r0, { timeout: 15000 });
  await p.waitForSelector('[data-phc-cutin]', { timeout: 1800 }).catch(() => {}); await dismissCut();
}
const ensureAp = async (n) => { if ((await st()).u.ap < n) await newRound(); };

await p.goto(BASE);
await click(p, 'PROVING GROUND');
const nm = p.getByPlaceholder('Leon');
await Promise.race([nm.waitFor({ timeout: 8000 }).catch(() => {}), p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 8000 }).catch(() => {})]);
if (await nm.count()) { await nm.fill('Leon'); await click(p, 'Solo ›'); }
await p.mouse.move(1430, 990);
await p.waitForFunction(() => window.__phc.getState().game?.sandbox?.state === 'ready', null, { timeout: 15000 });
let s = await st();
const cid = Object.values(s.g.characters)[0].id;
await must({ type: 'sandbox/ai', on: false }); await must({ type: 'sandbox/auto', on: false });
await must({ type: 'sandbox/kit', charId: cid, kind: 'soul' });
await must({ type: 'sandbox/level', charId: cid, level: 10 });
for (const sk of ['will_power', 'empathy', 'visualization']) await must({ type: 'sandbox/skill', charId: cid, skill: sk, points: 8 }, 'skill ' + sk);
for (const x of [{ school: 'damage' }, { school: 'control' }, { school: 'buff' }, { tone: 'fire' }, { tone: 'storm' }, { module: 'burst' }, { module: 'lance' }, { module: 'wave' }, { module: 'size' }]) await must({ type: 'sandbox/learn', charId: cid, ...x }, 'learn ' + JSON.stringify(x));
await must({ type: 'sandbox/design', charId: cid, design: { id: 'fb', name: 'Heartfire', school: 'damage', modules: ['burst'], tone: 'fire' } }, 'design fire burst');
await must({ type: 'sandbox/design', charId: cid, design: { id: 'sl', name: 'Stormlance', school: 'damage', modules: ['lance'], tone: 'storm' } }, 'design storm lance');
s = await st();
console.log('  designs', JSON.stringify(s.g.characters[cid].outbursts?.map((d) => [d.id, d.name, d.modules, d.tone])));
await p.getByRole('button', { name: /^⚔ Start the fight/ }).first().click();
await p.mouse.move(1430, 990);
await p.waitForFunction(() => window.__phc.getState().game?.phase === 'combat', null, { timeout: 15000 });
await p.waitForFunction(() => window.__phc.getState().screen === 'combat', null, { timeout: 8000 }).catch(() => {});
await must({ type: 'sandbox/clear' });
for (let i = 0; i < 20; i++) { s = await st(); const cur = s.cb.units.find((u) => u.id === s.cb.order[s.cb.turn]); if (cur?.side === 'pc') break; await p.waitForTimeout(300); }
await p.waitForTimeout(2300); await dismissCut();
s = await st();
// Stand near the middle of the map, with three free tiles to the right (so the effects aren't cut by the edge).
const spot = await p.evaluate(() => {
  const cb = window.__phc.getState().game.combat, m = cb.map;
  const bad = new Set([...(m.solid || []), ...(m.cover || []), ...(m.full || []), ...(m.difficult || []), ...(cb.objects || []).map((o) => o.pos), ...cb.units.filter((u) => !u.dead).map((u) => u.pos)]);
  const free = (x, y) => x >= 0 && y >= 0 && x < m.w && y < m.h && !bad.has(x + ',' + y);
  const c = [Math.floor(m.w / 2) - 2, Math.floor(m.h / 2)]; let best = null, bd = 1e9;
  for (let x = 1; x < m.w - 4; x++) for (let y = 1; y < m.h - 2; y++) { if (![0, 1, 2, 3].every((d) => free(x + d, y)) || !free(x + 3, y + 1)) continue; const d = Math.abs(x - c[0]) + Math.abs(y - c[1]); if (d < bd) { bd = d; best = x + ',' + y; } }
  return best;
});
if (spot && spot !== s.u.pos) { await must({ type: 'sandbox/skill', charId: cid, skill: 'athletics', points: 9 }); for (let i = 0; i < 4 && (await st()).u.pos !== spot; i++) { await ensureAp(2); await must({ type: 'combat/move', unitId: (await st()).u.id, to: spot }, 'move to ' + ref(spot)); await p.waitForTimeout(900); } }
await must({ type: 'sandbox/refill', charId: cid }); await p.waitForTimeout(300);
s = await st();
const me = s.u.pos, [mx, my] = me.split(',').map(Number), mapW = s.cb.map.w;
const dir = mx + 4 < mapW ? 1 : -1, foeAt = (mx + 3 * dir) + ',' + my, foe2 = (mx + 3 * dir) + ',' + (my + 1);
await must({ type: 'sandbox/spawn', tier: 'boss', weapon: 'fists', at: ref(foeAt) }, 'spawn foe');
await must({ type: 'sandbox/spawn', tier: 'soldier', weapon: 'fists', at: ref(foe2) }, 'spawn foe 2');
await must({ type: 'sandbox/refill', charId: cid });
await p.waitForTimeout(600);
s = await st();
const designs = s.u.mg?.designs || [];
console.log('  me', ref(me), 'AP', s.u.ap, 'MP', s.u.mg?.mp, 'strain', s.u.mg?.strain + '/' + s.u.mg?.strainLimit, 'designs', designs.map((d) => d.id + ':' + (d.tone || 'raw') + ':' + d.modules.join('+')).join(' '));
const did = (re) => (designs.find((d) => re.test(d.name)) || designs[0])?.id;


const tab = async (name) => { await p.locator('[role="tablist"][aria-label="Actions"] [role="tab"]', { hasText: name }).first().click(); await p.waitForTimeout(250); };
const tileOf = (k) => p.locator('.phc-grid button.phc-tok').nth((() => { const [x, y] = k.split(',').map(Number); return y * mapW + x; })());

// ---------- 1. the Outbursts tab: design cards, Begin from the card ----------
await dismissCut(); await tab('Outbursts');
await p.locator('[role="tabpanel"] [data-act="outburst"]').click(); await p.waitForTimeout(300);
const cards = await p.locator('[aria-label="Your Outbursts"] button[aria-pressed]').allTextContents();
ok('design cards carry the shape line: ' + JSON.stringify(cards.map((t) => t.replace(/\s+/g, ' ').slice(0, 90))), cards.some((t) => /BURST · radius 1 · reach \d+ · Fire/.test(t)) && cards.some((t) => /LANCE · line 4, pierces/.test(t)));
await p.locator('[aria-label="Your Outbursts"] button', { hasText: 'Heartfire' }).first().click(); await p.waitForTimeout(200);
await snap('1-cards');
await p.locator('[aria-label="Begin or snap"] button', { hasText: 'Begin' }).click(); await p.waitForTimeout(700);
s = await st(); ok('Begin from the card holds it at stage 0: ' + JSON.stringify(s.u.mg?.held), s.u.mg?.held?.stage === 0);

// ---------- 2. the HEART panel: Pump to stage 3 ----------
await dismissCut();
ok('the HEART panel is at the top of the tab', await p.locator('.phc-heart-panel').count() > 0);
for (let i = 1; i <= 3; i++) {
  s = await st(); if (s.u.ap < 1 && !(s.u.mg.freePumps > 0)) { await newRound(); await tab('Outbursts'); }
  s = await st(); if ((s.u.mg?.held?.stage || 0) >= 3) break;
  const b = p.locator('.phc-heart-panel button[data-hact="pump"]');
  await b.click(); await p.waitForTimeout(500);
}
s = await st(); ok('pumped to stage 3: ' + JSON.stringify(s.u.mg?.held) + ' AP ' + s.u.ap, (s.u.mg?.held?.stage || 0) >= 3);
await snap('2-heart');

// ---------- 3. the Release preview of the Burst over the two drill units ----------
await ensureAp(1); await tab('Outbursts');
await p.locator('.phc-heart-panel button[data-hact="release"]').click(); await p.waitForTimeout(250);
await tileOf(foeAt).hover(); await p.waitForTimeout(400);
const chips = await p.locator('.phc-grid .phc-plan[title]').evaluateAll((ns) => ns.map((n) => n.textContent));
ok('both drill units marked with their numbers: ' + JSON.stringify(chips), chips.filter((t) => /^ENEMY −\d+/.test(t)).length >= 2);
await snap('3-burst-preview');
await tileOf(foeAt).click(); await p.waitForTimeout(250);
const hp0 = (await st()).cb.units.filter((u) => u.side === 'foe').map((u) => u.hp);
await p.getByRole('button', { name: 'Confirm', exact: true }).click(); await p.waitForTimeout(1600);
s = await st(); const hp1 = s.cb.units.filter((u) => u.side === 'foe').map((u) => u.hp);
ok('released: nothing held, both hurt ' + JSON.stringify(hp0) + ' → ' + JSON.stringify(hp1), !s.u.mg?.held && hp1.filter((h, i) => h < hp0[i]).length >= 2);
await snap('4-released');

// ---------- 4. a Storm Lance snap preview (a line, not a bolt) ----------
await must({ type: 'sandbox/refill', charId: cid }); await p.waitForTimeout(400); await ensureAp(3); await tab('Outbursts');
await p.locator('[role="tabpanel"] [data-act="outburst"]').click(); await p.waitForTimeout(200);
await p.locator('[aria-label="Your Outbursts"] button', { hasText: 'Stormlance' }).first().click();
await p.locator('[aria-label="Begin or snap"] button', { hasText: 'Snap' }).click(); await p.waitForTimeout(200);
await tileOf(foeAt).hover(); await p.waitForTimeout(400);
await snap('5-lance-preview');

// ---------- 5. the MAGIC tab workshop with two schools (out of the fight) ----------
await must({ type: 'sandbox/stop' }); await p.waitForTimeout(1200);
await p.waitForFunction(() => window.__phc.getState().game?.phase !== 'combat', null, { timeout: 8000 }).catch(() => {});
await p.waitForTimeout(800);
const magicTab = p.getByRole('tab', { name: 'MAGIC' }).first();
if (await magicTab.count()) await magicTab.click(); else await click(p, 'MAGIC');
await p.waitForTimeout(400);
await p.getByRole('button', { name: '+ NEW DESIGN' }).first().click().catch(async () => { await p.getByRole('button', { name: 'Edit' }).first().click(); });
await p.waitForTimeout(300);
const ws = p.locator('[aria-label="Outburst workshop"]');
await ws.locator('[aria-label="Second school"] button', { hasText: 'Control' }).first().click().catch(() => {});
await ws.locator('[aria-label="Tone"] button', { hasText: 'Fire' }).first().click().catch(() => {});
await ws.locator('[aria-label="Shape"] button', { hasText: 'Wave' }).first().click().catch(() => {});
await p.waitForTimeout(300);
await ws.scrollIntoViewIfNeeded();
const verdict = await ws.locator('[aria-label="Verdict"]').textContent().catch(() => '');
ok('the workshop verdict shows both effects: ' + verdict, /then Push/.test(verdict || ''));
await ws.screenshot({ path: OUT + 'heart-6-workshop.png' });
await snap('7-sheet');
console.log(p.errors.length ? 'errors:\n  ' + p.errors.join('\n  ') : 'no page errors');
if (p.errors.length) process.exitCode = 1;
await browser.close();

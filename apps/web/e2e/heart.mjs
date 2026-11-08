// Outburst 2.0 player UI (rules 1.5, game/heartView.ts) in a real browser, in the Proving Ground (Enemy AI off unless a
// step needs a foe to act). Part A, solo, an Emanator + Evoker ('both' kit) with a Fire Burst and a Storm Lance:
//   1. the Outbursts tab's design cards (shape icon and line); Begin and Snap in the tab footer (never scrolled away);
//   2. Begin from the footer, Pump ×3 from the HEART panel (the FX layer draws each Pump; the heart over the token);
//      the panel is compact: every button (Let go and Overwatch included) visible without scrolling, at 1440×1000;
//   3. Steady (the next turn's swell doesn't come);
//   4. the Release preview of the Burst over two drill units, and the release; a Storm Lance snap preview;
//   5. Let go; Feed a glyph (a FIRE glyph on your own tile: +1 stage);
//   6. Heart Overwatch, triggered by an enemy walking into reach (AI on for its turn);
//   7. a Mana Short at the limit (Flooded air, snap casts until a Begin goes 3 over: Stunned, the held one goes wild);
//   8. an enemy Heart adept casting at you (AI on: it Begins, Pumps and Releases);
//   9. the MAGIC tab workshop with two schools (out of the fight).
// Part A2: a Storm Hand: Charges from melee hits, then Discharge with a SHOCK infusion (the element's FX).
// Part B, two browsers (With friends): two Soul casters snap-cast in the same round: the second release carries
// Resonance (+0.2 on the multiplier), shown in the aim preview first.
// Screenshots (deviceScaleFactor 1, 1440×1000) land in e2e/shots/heart-*.png.
import { chromium, player, click, BASE, OUT } from './lib.mjs';
const browser = await chromium.launch();
const p = await player(browser, 'host');
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const ref = (k) => { const [x, y] = k.split(',').map(Number); return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[x] + (y + 1); };
const actOn = (pg, a) => pg.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
const act = (a) => actOn(p, a);
const must = async (a, what) => { const e = await act(a); if (e) console.log('  ' + (what || a.type) + ': ' + e); return e; };
const stOn = (pg) => pg.evaluate(() => { const s = window.__phc.getState(), g = s.game, cb = g.combat, me = s.me && s.me.id; const u = cb && cb.units.find((x) => x.side === 'pc' && x.charId && g.characters[x.charId] && g.characters[x.charId].owner === me) || (cb && cb.units.find((x) => x.side === 'pc')); return { g, cb, u }; });
const st = () => stOn(p);
const dismissCutOn = async (pg) => { for (let i = 0; i < 3 && (await pg.locator('[data-phc-cutin]').count()); i++) { await pg.mouse.click(1430, 990); await pg.waitForTimeout(380); } };
const dismissCut = () => dismissCutOn(p);
const snap = async (n, pg = p) => { await dismissCutOn(pg); await pg.screenshot({ path: OUT + 'heart-' + n + '.png' }); };
const fxCount = () => p.evaluate(() => document.querySelector('.phc-fx-layer')?.childElementCount || 0);
const hearts = (pg = p) => pg.evaluate(() => [...document.querySelectorAll('.phc-fx-layer [data-heart]')].map((n) => ({ stage: n.dataset.heart, aura: n.dataset.aura, watch: !!n.dataset.watch })));
const seq = async () => (await st()).cb.fxSeq || 0;
const fxSince = async (n) => (await st()).cb.fx.filter((e) => e.n > n);
const kinds = (list) => list.map((e) => e.k);
const ourTurn = () => p.evaluate(() => { const s = window.__phc.getState(), cb = s.game.combat; const u = cb && cb.units.find((x) => x.id === cb.order[cb.turn]); return !!u && u.side === 'pc'; });
async function newRound() {
  await dismissCut();
  const r0 = (await st()).cb.round;
  await p.getByRole('button', { name: 'End turn', exact: true }).click();
  await p.waitForFunction((r0) => { const cb = window.__phc.getState().game.combat; const u = cb.units.find((x) => x.id === cb.order[cb.turn]); return cb.round > r0 && u && u.side === 'pc' && (u.ap >= 5 || u.conds?.stunned > 0); }, r0, { timeout: 25000 });
  await p.waitForSelector('[data-phc-cutin]', { timeout: 1800 }).catch(() => {}); await dismissCut();
}
const ensureAp = async (n) => { if ((await st()).u.ap < n) await newRound(); };
const tab = async (name, pg = p) => { await pg.locator('[role="tablist"][aria-label="Actions"] [role="tab"]', { hasText: name }).first().click(); await pg.waitForTimeout(250); };
let mapW = 16;
const tileOf = (k, pg = p) => pg.locator('.phc-grid button.phc-tok').nth((() => { const [x, y] = k.split(',').map(Number); return y * mapW + x; })());
const inView = async (loc, box) => { const b = await loc.boundingBox(); return !!b && b.y >= box.y - 1 && b.y + b.height <= box.y + box.height + 1 && b.y + b.height <= 1000; };

let cid = '';
/** A fresh Proving Ground (from the title's Solo), the build's steps, the fight (its wave cleared), on our turn, standing
 *  near the middle of the map with free tiles toward `dir`. */
async function build(steps) {
  let g = (await st()).g;
  if (g.sandbox) { await act({ type: 'sandbox/end' }); await p.waitForFunction(() => !window.__phc.getState().game.sandbox, null, { timeout: 8000 }); }
  await act({ type: 'sandbox/start', standalone: true });
  await p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 8000 });
  g = (await st()).g; cid = Object.values(g.characters)[0].id;
  await must({ type: 'sandbox/ai', on: false }); await must({ type: 'sandbox/auto', on: false });
  for (const a of steps) await must({ ...a, charId: cid }, a.type + ' ' + JSON.stringify(a).slice(0, 80));
  await must({ type: 'sandbox/fight' });
  await p.waitForFunction(() => { const g = window.__phc.getState().game; return g.phase === 'combat' && g.combat; }, null, { timeout: 10000 });
  await p.waitForFunction(() => window.__phc.getState().screen === 'combat', null, { timeout: 8000 }).catch(() => {});
  await must({ type: 'sandbox/clear' });
  await p.waitForTimeout(2300); await dismissCut();
  let s = await st(); mapW = s.cb.map.w;
  const spot = await p.evaluate(() => {
    const cb = window.__phc.getState().game.combat, m = cb.map;
    const bad = new Set([...(m.solid || []), ...(m.cover || []), ...(m.full || []), ...(m.difficult || []), ...(cb.objects || []).map((o) => o.pos), ...cb.units.filter((u) => !u.dead).map((u) => u.pos)]);
    const free = (x, y) => x >= 0 && y >= 0 && x < m.w && y < m.h && !bad.has(x + ',' + y);
    const c = [Math.floor(m.w / 2) - 3, Math.floor(m.h / 2)]; let best = null, bd = 1e9;
    for (let x = 1; x < m.w - 8; x++) for (let y = 1; y < m.h - 2; y++) { if (![0, 1, 2, 3, 4, 5, 6, 7].every((d) => free(x + d, y)) || !free(x + 3, y + 1) || !free(x + 4, y + 1)) continue; const d = Math.abs(x - c[0]) + Math.abs(y - c[1]); if (d < bd) { bd = d; best = x + ',' + y; } }
    return best;
  });
  if (spot && spot !== s.u.pos) { await must({ type: 'sandbox/skill', charId: cid, skill: 'athletics', points: 9 }); for (let i = 0; i < 4 && (await st()).u.pos !== spot; i++) { await must({ type: 'sandbox/refill', charId: cid }); await must({ type: 'combat/move', unitId: (await st()).u.id, to: ref(spot) }, 'move to ' + ref(spot)); await p.waitForTimeout(900); } }
  await must({ type: 'sandbox/refill', charId: cid }); await p.waitForTimeout(300);
  s = await st();
  return s.u.pos;
}
const at = (me, d, dy = 0) => { const [x, y] = me.split(',').map(Number); return (x + d) + ',' + (y + dy); };
const spawn = (tier, k, extra = {}) => must({ type: 'sandbox/spawn', tier, weapon: extra.weapon ?? 'fists', at: ref(k), ...extra }, 'spawn ' + tier + ' at ' + ref(k));

await p.goto(BASE);
await click(p, 'PROVING GROUND');
const nm = p.getByPlaceholder('Leon');
await Promise.race([nm.waitFor({ timeout: 8000 }).catch(() => {}), p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 8000 }).catch(() => {})]);
if (await nm.count()) { await nm.fill('Leon'); await click(p, 'Solo ›'); }
await p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 15000 });
await p.mouse.move(1430, 990);

// =============================================================== Part A: one Soul caster (with an Evoker for Feed)
const SOUL_STEPS = [{ type: 'sandbox/kit', kind: 'both' }, { type: 'sandbox/level', level: 10 },
  ...['will_power', 'empathy', 'visualization'].map((sk) => ({ type: 'sandbox/skill', skill: sk, points: 8 })),
  ...[{ school: 'damage' }, { school: 'control' }, { school: 'buff' }, { tone: 'fire' }, { tone: 'storm' }, { module: 'burst' }, { module: 'lance' }, { module: 'wave' }, { module: 'size' }].map((x) => ({ type: 'sandbox/learn', ...x })),
  { type: 'sandbox/design', design: { id: 'fb', name: 'Heartfire', school: 'damage', modules: ['burst'], tone: 'fire' } },
  { type: 'sandbox/design', design: { id: 'sl', name: 'Stormlance', school: 'damage', modules: ['lance'], tone: 'storm' } }];
let me = await build(SOUL_STEPS);
let s = await st();
const foeAt = at(me, 3), foe2 = at(me, 3, 1);
await spawn('boss', foeAt); await spawn('soldier', foe2);
await must({ type: 'sandbox/refill', charId: cid }); await p.waitForTimeout(600);
s = await st();
const designs = s.u.mg?.designs || [];
const did = (re) => (designs.find((d) => re.test(d.name)) || designs[0])?.id;
console.log('  me', ref(me), 'AP', s.u.ap, 'MP', s.u.mg?.mp, 'strain', s.u.mg?.strain + '/' + s.u.mg?.strainLimit, 'designs', designs.map((d) => d.id + ':' + d.name + ':' + (d.tone || 'raw') + ':' + d.modules.join('+')).join(' '));

// ---------- 1. the Outbursts tab: design cards; Begin and Snap in the footer ----------
await dismissCut(); await tab('Outbursts');
await p.locator('[role="tabpanel"] [data-act="outburst"]').click(); await p.waitForTimeout(300);
const cards = await p.locator('[aria-label="Your Outbursts"] button[aria-pressed]').allTextContents();
ok('design cards carry the shape line: ' + JSON.stringify(cards.map((t) => t.replace(/\s+/g, ' ').slice(0, 70))), cards.some((t) => /BURST · radius 1 · reach \d+ · Fire/.test(t)) && cards.some((t) => /LANCE · line 4 from you, pierces · Storm/.test(t)) && !cards.some((t) => /LANCE[^·]*·[^·]*· reach/.test(t)));
await p.locator('[aria-label="Your Outbursts"] button', { hasText: 'Heartfire' }).first().click(); await p.waitForTimeout(250);
const beginBtn = p.locator('.phc-cb-foot [aria-label="Begin or snap"] button', { hasText: 'Begin' });
ok('Begin and Snap sit in the tab footer, on screen, after picking a card: ' + (await beginBtn.textContent().catch(() => '')), await beginBtn.count() === 1 && await inView(beginBtn, { y: 0, height: 1000 }));
await snap('1-cards');
await beginBtn.click(); await p.waitForTimeout(700);
s = await st(); ok('Begin from the footer holds Heartfire at stage 0: ' + JSON.stringify(s.u.mg?.held), s.u.mg?.held?.stage === 0 && s.u.mg.held.design === did(/Heartfire/));

// ---------- 2. Pump ×3 from the HEART panel, with FX ----------
await dismissCut();
ok('the HEART panel is at the top of the tab', await p.locator('.phc-heart-panel').count() > 0);
for (let i = 1; i <= 3; i++) {
  s = await st(); if (s.u.ap < 1 && !(s.u.mg.freePumps > 0)) { await newRound(); await tab('Outbursts'); }
  const n0 = await seq();
  await p.locator('.phc-heart-panel button[data-hact="pump"]').click(); await p.waitForTimeout(220);
  const nodes = await fxCount(), k = kinds(await fxSince(n0)), h = await hearts();
  ok('Pump ' + i + ': fx ' + k.join(' ') + ', ' + nodes + ' nodes on the layer, heart ' + JSON.stringify(h), k.includes('pump') && nodes > 0 && h.some((x) => x.aura === 'fire'));
  await p.waitForTimeout(500);
}
s = await st(); ok('pumped to stage 3: ' + JSON.stringify(s.u.mg?.held) + ' AP ' + s.u.ap, (s.u.mg?.held?.stage || 0) >= 3);
// The compact panel: every button in view inside the tab panel (no scrolling for Let go or Overwatch).
const tp = await p.locator('[role="tabpanel"]').boundingBox();
const hbs = p.locator('.phc-heart-panel button[data-hact]'); const hn = await hbs.count(); let vis = 0;
for (let i = 0; i < hn; i++) if (await inView(hbs.nth(i), tp)) vis++;
const tops = await hbs.evaluateAll((ns) => ns.map((n) => Math.round(n.getBoundingClientRect().top))); const rows = tops.filter((t, i) => !tops.slice(0, i).some((u) => Math.abs(u - t) < 8)).length;
ok('the HEART panel is compact: ' + vis + ' / ' + hn + ' buttons in view, in ' + rows + ' rows (tops ' + tops.join(',') + ')', hn >= 5 && vis === hn && rows === 2);
await snap('2-heart');

// ---------- 3. Steady: the next turn holds the stage ----------
await ensureAp(1); await tab('Outbursts');
const stg = (await st()).u.mg.held.stage;
await p.locator('.phc-heart-panel button[data-hact="steady"]').click(); await p.waitForTimeout(400);
s = await st(); ok('Steady: the heart is steadied (' + JSON.stringify(s.u.mg.held) + ')', !!s.u.mg.held?.steady);
await snap('3-steady');
await newRound(); s = await st();
ok('the steadied heart held at stage ' + stg + ' over the turn (now ' + s.u.mg.held?.stage + ')', s.u.mg.held?.stage === stg && s.cb.log.some((l) => /steadied heart holds/.test(l)));

// ---------- 4. the Release preview of the Burst over the two drill units, and the release ----------
await ensureAp(1); await tab('Outbursts');
await p.locator('.phc-heart-panel button[data-hact="release"]').click(); await p.waitForTimeout(250);
await tileOf(foeAt).hover(); await p.waitForTimeout(400);
const chips = await p.locator('.phc-grid .phc-plan[title]').evaluateAll((ns) => ns.map((n) => n.textContent));
ok('both drill units marked with their numbers: ' + JSON.stringify(chips), chips.filter((t) => /^ENEMY −\d+/.test(t)).length >= 2);
await snap('4-burst-preview');
await tileOf(foeAt).click(); await p.waitForTimeout(250);
const hp0 = (await st()).cb.units.filter((u) => u.side === 'foe').map((u) => u.hp);
let n0 = await seq();
await p.getByRole('button', { name: 'Confirm', exact: true }).click(); await p.waitForTimeout(500);
await snap('5-release');
await p.waitForTimeout(1100);
s = await st(); const hp1 = s.cb.units.filter((u) => u.side === 'foe').map((u) => u.hp);
ok('released (fx ' + kinds(await fxSince(n0)).join(' ') + '): nothing held, both hurt ' + JSON.stringify(hp0) + ' → ' + JSON.stringify(hp1), !s.u.mg?.held && hp1.filter((h, i) => h < hp0[i]).length >= 2 && kinds(await fxSince(n0)).includes('release'));

// a Storm Lance snap preview (a line from you, not a bolt)
await must({ type: 'sandbox/refill', charId: cid }); await p.waitForTimeout(400); await tab('Outbursts');
await p.locator('[role="tabpanel"] [data-act="outburst"]').click(); await p.waitForTimeout(200);
await p.locator('[aria-label="Your Outbursts"] button', { hasText: 'Stormlance' }).first().click();
await p.locator('.phc-cb-foot [aria-label="Begin or snap"] button', { hasText: 'Snap' }).click(); await p.waitForTimeout(200);
await tileOf(foeAt).hover(); await p.waitForTimeout(400);
await snap('6-lance-preview');
await p.keyboard.press('Escape').catch(() => {});

// ---------- 5. Let go; Feed a glyph ----------
await must({ type: 'sandbox/refill', charId: cid }); await p.waitForTimeout(300); s = await st();
await must({ type: 'combat/outburst', unitId: s.u.id, design: did(/Heartfire/), hold: true }, 'begin (let go)'); await p.waitForTimeout(900);
await tab('Outbursts'); n0 = await seq();
await p.locator('.phc-heart-panel button[data-hact="letgo"]').click(); await p.waitForTimeout(350);
s = await st(); ok('Let go from the panel: nothing held, fx ' + kinds(await fxSince(n0)).join(' '), !s.u.mg?.held && kinds(await fxSince(n0)).includes('letgo'));
await snap('7-letgo');
await p.waitForTimeout(900);
await must({ type: 'sandbox/refill', charId: cid }); await p.waitForTimeout(300); s = await st();
const word = (s.u.mg.words || []).includes('fire') ? 'fire' : (s.u.mg.words || [])[0];
await must({ type: 'combat/draw', unitId: s.u.id, word, tile: ref(s.u.pos) }, 'draw ' + word);
await must({ type: 'combat/outburst', unitId: s.u.id, design: did(/Heartfire/), hold: true }, 'begin (feed)'); await p.waitForTimeout(900);
await tab('Outbursts');
const feedBtn = p.locator('.phc-heart-panel button[data-hact="feed"]');
ok('a glyph on your tile: Feed shows on the HEART panel (' + word + ')', await feedBtn.count() === 1);
n0 = await seq();
await feedBtn.click().catch(() => {}); await p.waitForTimeout(300);
s = await st(); ok('Feed: the glyph is eaten, stage ' + s.u.mg.held?.stage + ', fx ' + kinds(await fxSince(n0)).join(' '), s.u.mg.held?.stage === 1 && kinds(await fxSince(n0)).includes('feed') && !(s.cb.glyphs || []).some((x) => x.pos === s.u.pos));
await snap('8-feed');
await must({ type: 'combat/letgo', unitId: s.u.id }); await p.waitForTimeout(800);

// ---------- 6. Heart Overwatch, triggered by an enemy walking in ----------
await must({ type: 'sandbox/clear' }); await p.waitForTimeout(300);
const walker = at(me, 7);
await spawn('soldier', walker); await must({ type: 'sandbox/refill', charId: cid }); await p.waitForTimeout(400);
s = await st();
await must({ type: 'combat/outburst', unitId: s.u.id, design: did(/Heartfire/), hold: true }, 'begin (watch)'); await p.waitForTimeout(800);
await tab('Outbursts');
await p.locator('.phc-heart-panel button[data-hact="heartwatch"]').click(); await p.waitForTimeout(500);
s = await st(); ok('Overwatch armed from the panel: ' + JSON.stringify(s.u.mg.held), !!s.u.mg.held?.watch && (await hearts()).some((h) => h.watch));
await snap('9-watch');
await must({ type: 'sandbox/ai', on: true });
n0 = await seq(); const foeHp = (await st()).cb.units.find((u) => u.side === 'foe').hp;
await newRound();
s = await st(); const ow = (await fxSince(n0)).filter((e) => e.k === 'heart_overwatch' || (e.k === 'release' && e.reaction));
ok('the enemy walked into reach and drew the release (fx ' + ow.map((e) => e.k).join(' ') + '; log: ' + (s.cb.log.find((l) => /Heart Overwatch/.test(l)) || '').slice(0, 90) + ')', ow.length > 0 && !s.u.mg.held && s.cb.units.find((u) => u.side === 'foe').hp < foeHp);
await must({ type: 'sandbox/ai', on: false });
await snap('10-overwatch');

// ---------- 7. a Mana Short at the limit ----------
// Flooded air (Begin +2 Strain): cheap Soul Bolt snaps (3 AP each) across turns, no refill (a refill rebuilds the
// fighter fresh, Strain 0); the last step a Begin that goes 3 over the limit: Stunned, and the held one goes wild.
await must({ type: 'sandbox/clear' }); await spawn('boss', foeAt); await must({ type: 'sandbox/mana', value: 40 });
await must({ type: 'sandbox/refill', charId: cid }); await p.waitForTimeout(300);
let shortFx = null;
for (let i = 0; i < 14 && !shortFx; i++) {
  s = await st(); const m = s.u.mg;
  if (s.u.ap < 2 || (m.strain + 2 < m.strainLimit + 3 && s.u.ap < 3)) { await newRound(); continue; }
  if (m.held) { await must({ type: 'combat/letgo', unitId: s.u.id }); await p.waitForTimeout(200); }
  await must({ type: 'sandbox/mana', value: 40 }); // every Begin draws the meter down: keep the air Flooded (+2 Strain)
  n0 = await seq();
  const into = m.strain + 2 >= m.strainLimit + 3;
  const err = into ? await must({ type: 'combat/outburst', unitId: s.u.id, design: did(/Heartfire/), hold: true }, 'begin into the short')
    : await must({ type: 'combat/outburst', unitId: s.u.id, design: did(/Soul Bolt/), aim: ref(foeAt) }, 'snap ' + i);
  console.log('  ' + (into ? 'begin' : 'snap') + ' at strain ' + m.strain + (err ? ' → ' + err : ''));
  await p.waitForTimeout(250);
  shortFx = (await fxSince(n0)).find((e) => e.k === 'short') || null;
  console.log('  strain', (await st()).u.mg.strain + '/' + m.strainLimit, 'AP', (await st()).u.ap, 'MP', (await st()).u.mg.mp);
}
await p.waitForTimeout(150); await snap('11-short');
s = await st();
if (!shortFx) console.log('  log tail', JSON.stringify(s.cb.log.slice(-8)), 'fx', JSON.stringify(s.cb.fx.slice(-8).map((e) => [e.n, e.k])), 'seq', s.cb.fxSeq, 'held', JSON.stringify(s.u.mg.held), 'conds', JSON.stringify(s.u.conds));
ok('MANA SHORT at 3 over the limit: ' + JSON.stringify(shortFx) + ' · ' + (s.cb.log.find((l) => /MANA SHORT/.test(l)) || '').slice(0, 100), !!shortFx && shortFx.held && s.cb.log.some((l) => /MANA SHORT/.test(l)) && (s.u.conds?.stunned || 0) > 0);
console.log('  (Pure Heart, Will Power Mastery 2, refused the first short: ' + s.cb.log.some((l) => /Pure Heart/.test(l)) + ')');
await p.waitForTimeout(1200);
await must({ type: 'sandbox/mana', value: 15 });

// ---------- 8. an enemy Heart adept casts at you ----------
await must({ type: 'sandbox/clear' }); await must({ type: 'sandbox/refill', charId: cid });
await spawn('soldier', at(me, 4), { weapon: '', caster: 'heart_adept' });
await must({ type: 'sandbox/ai', on: true });
const myHp = (await st()).u.hp; let adeptRel = null, sawHeld = false;
for (let r = 0; r < 4 && !adeptRel; r++) {
  n0 = await seq(); await newRound(); s = await st();
  const foe = s.cb.units.find((u) => u.side === 'foe');
  if (foe?.mg?.held && !sawHeld) { sawHeld = true; await snap('12-adept-holding'); console.log('  adept holds', JSON.stringify(foe.mg.held)); }
  adeptRel = (await fxSince(n0)).find((e) => e.k === 'release' && e.unit === foe?.id) || null;
}
s = await st();
ok('the Heart adept Begins and releases at you (' + (adeptRel ? adeptRel.form + ' stage ' + adeptRel.stage : 'none') + '; HP ' + myHp + ' → ' + s.u.hp + '; log: ' + (s.cb.log.filter((l) => /Heart adept/.test(l) && /releases/.test(l)).pop() || '').slice(0, 90) + ')', !!adeptRel);
await snap('13-adept-release');
await must({ type: 'sandbox/ai', on: false });

// ---------- 9. the MAGIC tab workshop with two schools (out of the fight) ----------
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
ok('the workshop verdict: a Wave reads "cone 3 from you" (no separate reach) and both effects: ' + verdict.slice(0, 120), /then Push/.test(verdict || '') && /cone 3 from you/.test(verdict || '') && !/WAVE[^.]*reach/.test(verdict || ''));
await ws.screenshot({ path: OUT + 'heart-14-workshop.png' });

// =============================================================== Part A2: a Storm Hand's Discharge
me = await build([{ type: 'sandbox/unequip', slot: 'main' }, { type: 'sandbox/class', classId: 'storm_hand' }, { type: 'sandbox/kit', kind: 'soul' }]);
// The infusion is chosen out of combat (once per rest): stop, infuse with SHOCK on the area map, fight again.
await must({ type: 'sandbox/stop' }); await p.waitForTimeout(800);
const inf = await act({ type: 'world/act', charId: cid, act: 'perk', id: 'storm_hand.gauntlet_infusion', actionId: 'infuse', choice: 'shock' });
if (inf) console.log('  infuse (world/act): ' + inf + (await act({ type: 'world/act', charId: cid, act: 'perk', id: 'class:storm_hand.gauntlet_infusion', actionId: 'infuse', choice: 'shock' }) || ' → ok with the class: prefix'));
s = await st(); const infused = s.g.characters[cid].state?.['class:storm_hand.gauntlet_infusion']?.element;
ok('Gauntlet Infusion: SHOCK (' + infused + ')', infused === 'shock');
await must({ type: 'sandbox/fight' });
await p.waitForFunction(() => window.__phc.getState().game.phase === 'combat', null, { timeout: 10000 });
await must({ type: 'sandbox/clear' }); await p.waitForTimeout(2000); await dismissCut();
s = await st(); me = s.u.pos;
const free1 = await p.evaluate((me) => { const cb = window.__phc.getState().game.combat, m = cb.map, [x, y] = me.split(',').map(Number);
  const bad = new Set([...(m.solid || []), ...(m.cover || []), ...(m.full || []), ...(cb.objects || []).map((o) => o.pos), ...cb.units.filter((u) => !u.dead).map((u) => u.pos)]);
  const ok = (k) => { const [a, b] = k.split(',').map(Number); return a >= 0 && b >= 0 && a < m.w && b < m.h && !bad.has(k); };
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const t = (x + dx) + ',' + (y + dy), n = (x + 2 * dx + (dy ? 1 : 0)) + ',' + (y + 2 * dy + (dx ? 1 : 0)), n2 = (x + 2 * dx) + ',' + (y + 2 * dy); if (ok(t) && ok(n2)) return [t, n2, ok(n) ? n : null]; }
  return null; }, me);
ok('room for a target next to you and a foe behind it: ' + JSON.stringify(free1), !!free1);
if (free1) {
  await spawn('elite', free1[0]); await spawn('minion', free1[1]);
  s = await st(); const tgt = s.cb.units.find((u) => u.side === 'foe' && u.pos === free1[0]);
  const resOf = async () => (await st()).u.res?.charges || 0;
  // No refill from here: a refill rebuilds the fighter, Charges gone.
  const apFor = async () => { s = await st(); if (s.u.ap < 2) await newRound(); };
  for (let i = 0; i < 10 && (await resOf()) < 2; i++) { await apFor(); await must({ type: 'combat/attack', unitId: (await st()).u.id, targetId: tgt.id, mode: 'melee', mods: [] }, 'punch ' + i); await p.waitForTimeout(500); }
  const ch = await resOf(); ok('Charged by Battle: ' + ch + ' Charge from melee hits', ch >= 2);
  let dfx = null;
  for (let i = 0; i < 6 && !dfx; i++) {
    await apFor(); await p.waitForTimeout(600); await dismissCut(); n0 = await seq();
    await must({ type: 'combat/attack', unitId: (await st()).u.id, targetId: tgt.id, mode: 'melee', mods: ['class:storm_hand.discharge#discharge'] }, 'discharge ' + i);
    await p.waitForTimeout(140);
    dfx = (await fxSince(n0)).find((e) => e.k === 'explode' && e.what === 'discharge') || null;
    if (dfx) await p.screenshot({ path: OUT + 'heart-15-discharge.png' });
  }
  const layer = await p.evaluate(() => [...document.querySelectorAll('.phc-fx-layer *')].map((n) => n.getAttribute('data-element') || n.getAttribute('data-fx') || '').filter(Boolean).slice(0, 12));
  ok('Discharge with the SHOCK element (fx ' + JSON.stringify(dfx) + '; layer ' + JSON.stringify(layer) + '; ' + ((await st()).cb.log.find((l) => /discharges/.test(l)) || '').slice(0, 90) + ')', !!dfx && dfx.element === 'shock' && (await fxCount()) > 0);
  await p.waitForTimeout(1200);
}
console.log(p.errors.length ? 'errors (A):\n  ' + p.errors.join('\n  ') : 'no page errors (A)');
if (p.errors.length) process.exitCode = 1;

// =============================================================== Part B: Resonance, two players in one room
const host = await player(browser, 'host2'), mai = await player(browser, 'mai');
for (const pg of [host, mai]) pg.on('dialog', (d) => d.accept());
await host.goto(BASE);
await click(host, 'PROVING GROUND', { timeout: 20000 });
await host.getByPlaceholder('Leon').fill('Leon');
await click(host, 'With friends ›');
await host.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 15000 });
const invite = host.locator('div[role="dialog"][aria-label="Invite friends"]');
await invite.waitFor({ timeout: 6000 });
const code = (await stOn(host)).g.code;
await invite.getByRole('button', { name: 'Gear up ›' }).click();
await mai.goto(BASE);
await click(mai, 'JOIN A FRIEND', { timeout: 20000 });
await mai.getByPlaceholder('Leon').fill('Mai');
await mai.getByPlaceholder('ROOM CODE').fill(code);
await click(mai, 'Join ›');
await mai.waitForFunction(() => !!window.__phc.getState().game?.sandbox && window.__phc.getState().screen === 'main', null, { timeout: 15000 });
const ids = { host: await host.evaluate(() => window.__phc.getState().me.id), mai: await mai.evaluate(() => window.__phc.getState().me.id) };
let G2 = (await stOn(host)).g;
const charOf = (who) => Object.values(G2.characters).find((c) => c.owner === ids[who]);
for (const [who, pg] of [['host', host], ['mai', mai]]) {
  await pg.waitForFunction((id) => Object.values(window.__phc.getState().game.characters).some((c) => c.owner === id), ids[who], { timeout: 10000 });
  G2 = (await stOn(pg)).g; const c = charOf(who);
  for (const a of [{ type: 'sandbox/kit', kind: 'soul' }, { type: 'sandbox/level', level: 6 }, { type: 'sandbox/skill', skill: 'will_power', points: 6 }]) { const e = await actOn(pg, { ...a, charId: c.id }); if (e) console.log('  ' + who + ' ' + a.type + ': ' + e); }
}
await actOn(host, { type: 'sandbox/ai', on: false }); await actOn(host, { type: 'sandbox/auto', on: false });
await mai.waitForTimeout(600);
const e0 = await actOn(host, { type: 'sandbox/fight' }); if (e0) console.log('  fight: ' + e0);
for (const pg of [host, mai]) await pg.waitForFunction(() => window.__phc.getState().game.phase === 'combat', null, { timeout: 15000 });
await actOn(host, { type: 'sandbox/clear' }); await host.waitForTimeout(1500);
let cb = (await stOn(host)).cb;
const pcs = cb.units.filter((u) => u.side === 'pc');
// A boss within Soul Bolt reach (4) of both casters, on a free tile.
const both = await host.evaluate((pcs) => { const cb = window.__phc.getState().game.combat, m = cb.map;
  const bad = new Set([...(m.solid || []), ...(m.cover || []), ...(m.full || []), ...(cb.objects || []).map((o) => o.pos), ...cb.units.filter((u) => !u.dead).map((u) => u.pos)]);
  const d = (a, b) => { const [x1, y1] = a.split(',').map(Number), [x2, y2] = b.split(',').map(Number); return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2)); };
  let best = null; for (let x = 0; x < m.w; x++) for (let y = 0; y < m.h; y++) { const k = x + ',' + y; if (bad.has(k)) continue; const ds = pcs.map((p) => d(p, k)); if (Math.max(...ds) <= 3 && Math.min(...ds) >= 2 && (!best || Math.max(...ds) < best[1])) best = [k, Math.max(...ds)]; }
  return best && best[0]; }, pcs.map((u) => u.pos));
ok('a boss tile within reach of both casters: ' + both, !!both);
mapW = cb.map.w;
await actOn(host, { type: 'sandbox/spawn', tier: 'boss', weapon: 'fists', at: ref(both) });
await actOn(host, { type: 'sandbox/refill' }); await host.waitForTimeout(800);
const ownerPage = async (u) => { const g = (await stOn(host)).g; return g.characters[u.charId]?.owner === ids.mai ? mai : host; };
const cur = async () => { const c = (await stOn(host)).cb; return { cb: c, u: c.units.find((x) => x.id === c.order[c.turn]) }; };
// Bring the turn to the first caster in this round's order.
const firstPc = () => cb.order.find((id) => cb.units.find((u) => u.id === id)?.side === 'pc');
for (let i = 0; i < 12; i++) { const { cb: c, u } = await cur(); cb = c; if (u && u.id === firstPc()) break; if (u) await actOn(await ownerPage(u), { type: 'combat/end-turn', unitId: u.id }); await host.waitForTimeout(300); }
let { u: u1 } = await cur(); const pg1 = await ownerPage(u1);
const d1 = u1.mg.designs.find((d) => d.school === 'damage');
await actOn(pg1, { type: 'sandbox/refill', charId: u1.charId }); await pg1.waitForTimeout(300);
let e1 = await actOn(pg1, { type: 'combat/outburst', unitId: u1.id, design: d1.id, aim: ref(both) });
ok('the first caster (' + u1.name + ') snap-casts at the boss' + (e1 ? ': ' + e1 : ''), !e1);
await pg1.waitForTimeout(900);
await actOn(pg1, { type: 'combat/end-turn', unitId: u1.id }); await host.waitForTimeout(800);
for (let i = 0; i < 6; i++) { const { u } = await cur(); if (u && u.side === 'pc' && u.id !== u1.id) break; if (u && u.side !== 'pc') await actOn(host, { type: 'combat/end-turn', unitId: u.id }).catch(() => {}); await host.waitForTimeout(400); }
const { cb: cb2, u: u2 } = await cur(); const pg2 = await ownerPage(u2);
ok('the second caster (' + u2.name + ') acts in the same round (' + cb2.round + ')', u2.side === 'pc' && u2.id !== u1.id && cb2.round === cb.round);
await actOn(pg2, { type: 'sandbox/refill', charId: u2.charId }); await pg2.waitForTimeout(1500); await dismissCutOn(pg2);
// The aim preview carries the Resonance line before the cast.
await tab('Outbursts', pg2);
await pg2.locator('[role="tabpanel"] [data-act="outburst"]').click(); await pg2.waitForTimeout(250);
const d2 = u2.mg.designs.find((d) => d.school === 'damage');
await pg2.locator('[aria-label="Your Outbursts"] button', { hasText: d2.name }).first().click(); await pg2.waitForTimeout(200);
await pg2.locator('.phc-cb-foot [aria-label="Begin or snap"] button', { hasText: 'Snap' }).click(); await pg2.waitForTimeout(200);
await tileOf(both, pg2).hover(); await pg2.waitForTimeout(450);
const plan2 = await pg2.evaluate(() => document.body.innerText.match(/Resonance[^\n]*/)?.[0] || '');
await snap('16-resonance-preview', pg2);
await tileOf(both, pg2).click(); await pg2.waitForTimeout(250);
const before = (await stOn(host)).cb.fxSeq || 0;
await pg2.getByRole('button', { name: 'Confirm', exact: true }).click(); await pg2.waitForTimeout(400);
await snap('17-resonance', pg2);
const rel2 = (await stOn(host)).cb.fx.filter((e) => e.n > before);
const r2 = rel2.find((e) => e.k === 'release'), rz = rel2.find((e) => e.k === 'resonance');
ok('Resonance: the second release reads +' + (r2 && r2.resonance) + ' on the multiplier (×' + (r2 && r2.mult) + '), fx ' + kinds(rel2).join(' ') + '; preview: ' + plan2, !!r2 && r2.resonance > 0 && !!rz);
for (const pg of [host, mai]) if (pg.errors.length) { console.log('errors (' + pg.pname + '):\n  ' + pg.errors.join('\n  ')); process.exitCode = 1; }
await browser.close();

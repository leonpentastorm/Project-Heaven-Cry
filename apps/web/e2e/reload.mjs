// The reload card (fx/reload.ts; Leon, 9 Nov 2026: "there is absolutely no way you can see a reload animation right
// now the way it's drawn, especially if you are standing on a tile with a pile of loot"). In a Proving Ground fight
// (Solo, Enemy AI off), real reloads made while standing on a pile: the card pops up over the unit, on top of the grid
// and the pile (what is at its centre is the card), shows the magazine and the round count that ends at what the gun
// holds; a SPEED reload's old magazine falls out of the bottom toward the unit (the pile's count goes up) and a
// TACTICAL reload's slides into the pack glyph (the pile's count stays): two different cards. Then, played by hand:
// a pump gun's rounds fed one by one (the count ticking), a revolver's cylinder, both guns (two columns), the off hand
// alone, reduced motion (a still card with the end count), and the combat speed (Normal holds it longer than Fast).
// Shots for Leon (deviceScaleFactor 2): shots/combat-polish/reload-*.png.
import { chromium, player, click, BASE, OUT } from './lib.mjs';
process.env.DSF = process.env.DSF || '2';
const browser = await chromium.launch();
const p = await player(browser, 'host');
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const act = (a) => p.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
const G = () => p.evaluate(() => window.__phc.getState().game);
const DIR = OUT + 'combat-polish/';
await p.setViewportSize({ width: 1440, height: 1000 });
await p.goto(BASE);
await click(p, 'PROVING GROUND');
const nm = p.getByPlaceholder('Leon');
await Promise.race([nm.waitFor({ timeout: 8000 }).catch(() => {}), p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 8000 }).catch(() => {})]);
if (await nm.count()) { await nm.fill('Leon'); await click(p, 'Solo ›'); }
await p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 15000 });
await act({ type: 'sandbox/ai', on: false }); await act({ type: 'sandbox/fight' });
await p.waitForFunction(() => window.__phc.getState().screen === 'combat', null, { timeout: 15000 });
await p.waitForTimeout(2400);
for (let i = 0; i < 3 && (await p.locator('[data-phc-cutin]').count()); i++) { await p.mouse.click(1430, 990); await p.waitForTimeout(380); }
await p.mouse.move(1430, 990);
let g = await G();
const me = g.combat.units.find((u) => u.side === 'pc' && !u.dead);
const ref = (k) => { const [x, y] = k.split(',').map(Number); return String.fromCharCode(65 + x) + (y + 1); };
const R = ref(me.pos);
const mine = (g) => g.combat.units.find((u) => u.id === me.id);
const pileCount = (g) => ((g.combat.objects || []).find((o) => o.kind === 'pile' && o.pos === me.pos)?.items || []).length;
const myTurn = async () => {
  await p.waitForFunction((id) => { const cb = window.__phc.getState().game.combat; const u = cb && cb.units.find((x) => x.id === cb.order[cb.turn]); return !!u && u.id === id && u.ap >= 6; }, me.id, { timeout: 15000 });
  await p.waitForFunction(() => performance.now() > window.__phcHold(), null, { timeout: 15000 });
};
const burn = async () => { for (const k of ['5,4', '3,8', '3,2', '3,3', '11,9']) { const e = await act({ type: 'combat/shoot-cover', unitId: me.id, tile: k }); if (!e) return true; } return false; };
const settle = () => p.waitForFunction(() => !document.querySelector('[data-fx="reload"]'), null, { timeout: 8000 }).catch(() => {});
/** Start something (a game action, or an effect by hand) and sample the reload card every step ms: its box, its mode
 *  and title, the count, the old magazine's centre, the pack and pile glyphs, and (once, at probeAt ms) what is on top
 *  at the card's centre and at its old magazine's. */
const watch = (start, ms = 2200, step = 30, probeAt = 260) => p.evaluate(async ({ start, ms, step, probeAt }) => {
  const seen = [], t0 = performance.now(); let probe = null;
  if (start.act) window.__phc.act(start.act); else window.__phcFx.playFx(start.fx);
  const rc = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, l: r.left, t: r.top, r: r.right, b: r.bottom }; };
  while (performance.now() - t0 < ms) {
    const card = document.querySelector('[data-fx="reload"]');
    if (card) {
      const t = Math.round(performance.now() - t0), old = card.querySelector('[data-reload-old]');
      seen.push({ t, box: rc(card), mode: card.getAttribute('data-reload-mode'), title: card.querySelector('[data-reload-title]')?.textContent, op: Number(getComputedStyle(card).opacity),
        counts: [...card.querySelectorAll('[data-reload-count]')].map((c) => c.textContent), done: card.querySelectorAll('[data-reload-done]').length,
        guns: [...card.querySelectorAll('[data-reload-gun]')].map((c) => c.getAttribute('data-reload-gun')),
        old: old ? { ...rc(old), op: Number(getComputedStyle(old).opacity), out: old.getAttribute('data-reload-old') } : null,
        pack: rc(card.querySelector('[data-reload-pack]')), drop: rc(card.querySelector('[data-reload-drop]')), badge: card.querySelector('[data-reload-badge]')?.textContent || '',
        rounds: card.querySelectorAll('[data-reload-piece^="round"]').length, pieces: card.querySelectorAll('[data-reload-piece]').length });
      if (!probe && t >= probeAt) {
        // the layer takes no clicks; for the probe the card does, so elementFromPoint can say what is on top
        card.style.pointerEvents = 'auto';
        const b = card.getBoundingClientRect(), hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height * 0.45);
        const o = card.querySelector('[data-reload-old]'), ob = o && o.getBoundingClientRect(), hitOld = ob ? document.elementFromPoint(ob.left + ob.width / 2, ob.top + ob.height / 2) : null;
        probe = { onTop: !!hit && card.contains(hit), what: hit ? hit.tagName + '.' + String(hit.className || '').slice(0, 30) : 'none', oldOnTop: hitOld ? card.contains(hitOld) : null, z: getComputedStyle(card).zIndex,
          layerZ: getComputedStyle(card.closest('.phc-fx-layer')).zIndex };
        card.style.pointerEvents = 'none';
      }
    }
    await new Promise((res) => setTimeout(res, step));
  }
  return { seen, probe };
}, { start, ms, step, probeAt });
const pileGlyph = async () => p.evaluate((R) => { const b = [...document.querySelectorAll('.phc-grid button.phc-tok[aria-label]')].find((el) => { const l = el.getAttribute('aria-label') || ''; return l.startsWith(R) && !/[0-9A-Za-z]/.test(l.charAt(R.length)); });
  const pg = b && b.querySelector('[data-pile]'); if (!pg) return null; const r = pg.getBoundingClientRect(), t = b.getBoundingClientRect(); return { t: r.top, b: r.bottom, l: r.left, r: r.right, n: pg.getAttribute('data-pile'), tile: { x: t.left + t.width / 2, y: t.top + t.height / 2, s: t.width } }; }, R);
const shotCard = async (name, box) => { const pad = 40; await p.screenshot({ path: DIR + name + '.png', clip: { x: Math.max(0, box.l - pad), y: Math.max(0, box.t - pad), width: box.r - box.l + pad * 2, height: box.b - box.t + pad * 2 + 70 } }); };

// 1. A first speed reload puts a pile on the tile; the next turn the Recruit reloads standing on it.
ok('a round spent', await burn()); await p.waitForTimeout(900);
await act({ type: 'combat/reload', unitId: me.id }); await p.waitForTimeout(400); await settle();
g = await G(); ok('the first speed reload left a pile on ' + R + ' (' + pileCount(g) + ')', pileCount(g) === 1);
await act({ type: 'combat/end-turn', unitId: me.id }); await myTurn();
ok('a round spent', await burn()); await p.waitForTimeout(1200);
const pg0 = await pileGlyph();
ok('the pile is drawn on the Recruit\'s tile (' + JSON.stringify(pg0 && pg0.n) + ')', !!pg0);

// 2. SPEED reload on the pile.
let w = await watch({ act: { type: 'combat/reload', unitId: me.id } });
let s = w.seen; g = await G();
ok('a speed reload shows the reload card (' + s.length + ' samples)', s.length > 10);
ok('it says SPEED RELOAD (' + s[0]?.title + ', mode ' + s[0]?.mode + ')', s[0]?.title === 'SPEED RELOAD' && s[0]?.mode === 'speed');
ok('it is on top: the card is what is at its centre (' + w.probe?.what + '; card z ' + w.probe?.z + ' on the layer at z ' + w.probe?.layerZ + ')', !!w.probe?.onTop);
const vis = s.filter((x) => x.op > 0.95)[0];
ok('it sits above the unit and the pile glyph, clear of them (card bottom ' + Math.round(vis?.box.b) + ', pile glyph top ' + Math.round(pg0.t) + ')', vis && vis.box.b <= pg0.t);
ok('it is big enough to read at a glance (' + Math.round(vis.box.r - vis.box.l) + ' × ' + Math.round(vis.box.b - vis.box.t) + ' px, the tile is ' + Math.round(pg0.tile.s) + ')', vis.box.r - vis.box.l >= pg0.tile.s * 2 && vis.box.b - vis.box.t >= pg0.tile.s * 1.8);
const oldS = s.filter((x) => x.old && x.old.op > 0.3);
ok('the old magazine falls out of the bottom toward the unit (' + Math.round(oldS[0]?.old.y) + ' → ' + Math.round(oldS.at(-1)?.old.y) + ', unit at ' + Math.round(pg0.tile.y) + ')', oldS.length > 2 && oldS.at(-1).old.y - oldS[0].old.y > pg0.tile.s * 0.8 && oldS.at(-1).old.y > vis.box.b - 10);
ok('a falling magazine is drawn over the grid too (on top at its centre: ' + w.probe?.oldOnTop + ')', w.probe?.oldOnTop !== false);
ok('the speed card marks the pile, not the pack (drop glyph ' + !!s[0].drop + ', pack glyph ' + !!s[0].pack + ', badge ' + s.at(-1).badge + ')', !!s[0].drop && !s[0].pack);
const cs = s.map((x) => x.counts[0]); const lastCount = s.filter((x) => x.done).at(-1)?.counts[0] || '';
ok('the count shows what was left, empties, then runs up to what the gun holds: ' + [...new Set(cs)].join(' ') + ' (the gun: ' + mine(g).ammo + ')', cs[0] !== '0/24' && cs.includes('0/24') && lastCount.startsWith(mine(g).ammo + '/') && new Set(cs).size >= 5);
ok('the pile on the tile now holds the dropped magazine too (' + pileCount(g) + ')', pileCount(g) === 2);
await p.waitForTimeout(100);
await act({ type: 'combat/end-turn', unitId: me.id }); await settle(); await myTurn();
ok('a round spent', await burn()); await p.waitForTimeout(1200);

// 3. TACTICAL reload on the same pile.
w = await watch({ act: { type: 'combat/reload', unitId: me.id, tactical: true } });
s = w.seen; g = await G();
ok('a tactical reload shows its card: TACTICAL RELOAD (' + s[0]?.title + ', mode ' + s[0]?.mode + ')', s[0]?.title === 'TACTICAL RELOAD' && s[0]?.mode === 'tactical');
ok('on top as well (' + w.probe?.what + ')', !!w.probe?.onTop);
ok('the tactical card has the pack glyph and no drop arrow', !!s[0].pack && !s[0].drop);
// (measured once the card has popped in: it grows from its pointer, so its glyphs move while it does)
const steady = s.filter((x) => x.t > 230), pk = steady[0].pack, oldT = steady.filter((x) => x.old && x.old.op > 0.3);
ok('the old magazine slides into the pack (' + Math.round(oldT[0]?.old.x) + ',' + Math.round(oldT[0]?.old.y) + ' → ' + Math.round(oldT.at(-1)?.old.x) + ',' + Math.round(oldT.at(-1)?.old.y) + '; the pack at ' + Math.round(pk.x) + ',' + Math.round(pk.y) + ')',
  oldT.length > 2 && oldT.at(-1).old.x > oldT[0].old.x + 8 && Math.hypot(oldT.at(-1).old.x - pk.x, oldT.at(-1).old.y - pk.y) < Math.hypot(oldT[0].old.x - pk.x, oldT[0].old.y - pk.y) * 0.6 && oldT.every((x) => x.old.y < s[0].box.b));
ok('the pack keeps a +1 (' + s.at(-1).badge + ')', s.at(-1).badge === '+1');
const lastT = s.filter((x) => x.done).at(-1)?.counts[0] || '';
ok('the count ends at what the gun holds (' + lastT + ', the gun ' + mine(g).ammo + ')', lastT.startsWith(mine(g).ammo + '/'));
ok('nothing went into the pile (still ' + pileCount(g) + ')', pileCount(g) === 2);
ok('speed and tactical draw different cards (titles, glyphs, where the old one goes)', s[0].title !== 'SPEED RELOAD' && !!pk);
await settle();

// 4. The pictures for Leon: each caught mid-way and at the end, at deviceScaleFactor 2.
const fx = (o) => ({ k: 'reload', unit: me.id, at: me.pos, dur: 1200, ...o });
const catchAt = async (name, ev, times) => {
  await p.evaluate((ev) => window.__phcFx.playFx(ev), ev);
  const t0 = Date.now(); let box = null;
  for (const [t, tag] of times) {
    const left = t - (Date.now() - t0); if (left > 0) await p.waitForTimeout(left);
    box = box || await p.evaluate(() => { const c = document.querySelector('[data-fx="reload"]'); if (!c) return null; const r = c.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; });
    if (box) await shotCard('reload-' + name + '-' + tag, box);
  }
  await settle();
};
await catchAt('speed', fx({ weapon: 'hellraiser_service_rifle', cat: 'rifle', how: 'mag', left: 7, ammo: 24, cap: 24 }), [[330, '1-drop'], [1250, '2-full']]);
await catchAt('tactical', fx({ weapon: 'hellraiser_service_rifle', cat: 'rifle', how: 'mag', left: 7, ammo: 24, cap: 24, tactical: true }), [[300, '1-pack'], [1250, '2-full']]);
await catchAt('pump', fx({ weapon: 'lumeri_scattergun', cat: 'shotgun', how: 'loose', rounds: 4, ammo: 6, cap: 6, dur: 1400 }), [[700, '1-feeding'], [1500, '2-full']]);
await catchAt('revolver', fx({ weapon: 'drifter_revolver', cat: 'revolver', how: 'mag', left: 1, ammo: 6, cap: 6 }), [[700, '1'], [1250, '2-full']]);
await catchAt('both', fx({ weapon: 'service_pistol', cat: 'pistol', how: 'mag', left: 0, ammo: 12, cap: 12, off: { weapon: 'service_pistol', cat: 'pistol', how: 'mag', left: 3, ammo: 12, cap: 12 } }), [[1250, 'full']]);

// 5. Loose rounds tick one by one; a revolver's cylinder; both guns; the off hand alone.
w = await watch({ fx: fx({ weapon: 'lumeri_scattergun', cat: 'shotgun', how: 'loose', rounds: 4, ammo: 6, cap: 6, dur: 1400 }) }, 2000);
s = w.seen; const pumpCounts = [...new Set(s.map((x) => x.counts[0]))];
ok('a pump gun takes its shells one by one, the count ticking: ' + pumpCounts.join(' '), pumpCounts.join(' ').startsWith('2/6 3/6 4/6 5/6 6/6') && s[0].title === 'LOADING' && !s[0].drop && !s[0].pack);
ok('…a round in the row for each (' + s.at(-1).rounds + ' of 6)', s.filter((x) => x.done).at(-1)?.rounds === 6);
await settle();
w = await watch({ fx: fx({ weapon: 'drifter_revolver', cat: 'revolver', how: 'mag', left: 1, ammo: 6, cap: 6 }) }, 2000);
ok('a revolver\'s speedloader: SPEED RELOAD, the count to 6/6 (' + w.seen.filter((x) => x.done).at(-1)?.counts[0] + ')', w.seen[0]?.title === 'SPEED RELOAD' && /^6\/6/.test(w.seen.filter((x) => x.done).at(-1)?.counts[0] || ''));
await settle();
w = await watch({ fx: fx({ weapon: 'service_pistol', cat: 'pistol', how: 'mag', left: 0, ammo: 12, cap: 12, off: { weapon: 'service_pistol', cat: 'pistol', how: 'mag', left: 3, ammo: 12, cap: 12, tactical: true }, tactical: true }) }, 2000);
ok('both guns: two columns, MAIN and OFF, each to 12/12 (' + JSON.stringify(w.seen.at(-1)?.guns) + ' ' + JSON.stringify(w.seen.filter((x) => x.done === 2).at(-1)?.counts) + ')', JSON.stringify(w.seen.at(-1)?.guns) === '["main","off"]' && w.seen.some((x) => x.done === 2));
await settle();
w = await watch({ fx: fx({ weapon: 'service_pistol', cat: 'pistol', how: 'mag', hand: 'off', left: 2, ammo: 12, cap: 12 }) }, 1600);
ok('the off hand alone: one column, the off one', JSON.stringify(w.seen.at(-1)?.guns) === '["off"]');
await settle();

// 6. The combat speed: at Normal the card's count fills later than at Fast (× ~1.18).
const doneAt = async () => { const r = await watch({ fx: fx({ weapon: 'hellraiser_service_rifle', cat: 'rifle', how: 'mag', left: 7, ammo: 24, cap: 24 }) }, 2000, 15); await settle(); return r.seen.find((x) => x.done)?.t; };
await p.evaluate(() => window.__phcCombatSpeed.set('fast')); const fast = await doneAt();
await p.evaluate(() => window.__phcCombatSpeed.set('normal')); const normal = await doneAt();
ok('Normal speed is slower than Fast (count full at ' + normal + ' ms vs ' + fast + ' ms)', normal > fast * 1.08 && normal < fast * 1.35);

// 7. Reduced motion: a still card, the end count at once, no magazine moving.
await p.emulateMedia({ reducedMotion: 'reduce' });
w = await watch({ fx: fx({ weapon: 'hellraiser_service_rifle', cat: 'rifle', how: 'mag', left: 7, ammo: 24, cap: 24, tactical: true }) }, 900);
ok('reduced motion: the card still shows, its count already 24/24 and no old magazine moving (' + w.seen[0]?.counts[0] + ')', w.seen.length > 3 && /^24\/24/.test(w.seen[0].counts[0]) && w.seen.every((x) => !x.old) && !!w.seen[0].pack && w.seen[0].badge === '+1');
await settle(); await p.emulateMedia({ reducedMotion: 'no-preference' });

await p.waitForTimeout(600);
ok('no reload card left on the layer afterwards', (await p.locator('[data-fx="reload"]').count()) === 0);
ok('no page errors', p.errors.length === 0);
if (p.errors.length) console.log(p.errors);
await browser.close();

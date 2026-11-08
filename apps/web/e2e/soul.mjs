// Outburst 2.0 effects (rules 1.5, game/fx/soul.ts) in a real browser: the Proving Ground, Solo, Enemy AI off. An
// Emanator Begins a Fire Burst, Pumps three times (a screenshot at each stage: the ring, the glow, the stage-4 edge),
// the held heart stands over the token (glow by stage, the fire aura, then Heart Overwatch's eye), and Releases at an
// enemy (the bloom). Then a Storm Lance and a Raw Wave for the other forms, and Let go.
// Screenshots (deviceScaleFactor 1) land in e2e/shots/soul-*.png.
import { chromium, player, click, BASE, OUT } from './lib.mjs';
const browser = await chromium.launch();
const p = await player(browser, 'host');
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const ref = (k) => { const [x, y] = k.split(',').map(Number); return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[x] + (y + 1); };
const act = (a) => p.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
const must = async (a, what) => { const e = await act(a); if (e) console.log('  ' + (what || a.type) + ': ' + e); return e; };
const st = () => p.evaluate(() => { const s = window.__phc.getState(), g = s.game, cb = g.combat; const u = cb && cb.units.find((x) => x.side === 'pc'); return { g, cb, u }; });
const dismissCut = async () => { if (await p.locator('[data-phc-cutin]').count()) { await p.mouse.click(1430, 990); await p.waitForTimeout(380); } };
const snap = async (n) => { await dismissCut(); await p.screenshot({ path: OUT + 'soul-' + n + '.png' }); };
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
for (const sk of []) await must({ type: 'sandbox/skill', charId: cid, skill: sk, points: 8 }, 'skill ' + sk);
for (const x of [{ school: 'damage' }, { tone: 'fire' }, { tone: 'storm' }, { module: 'burst' }, { module: 'lance' }, { module: 'wave' }]) await must({ type: 'sandbox/learn', charId: cid, ...x }, 'learn ' + JSON.stringify(x));
await must({ type: 'sandbox/design', charId: cid, design: { id: 'fb', name: 'Heartfire', school: 'damage', modules: ['burst'], tone: 'fire' } }, 'design fire burst');
await must({ type: 'sandbox/design', charId: cid, design: { id: 'sl', name: 'Stormlance', school: 'damage', modules: ['lance'], tone: 'storm' } }, 'design storm lance');
await must({ type: 'sandbox/design', charId: cid, design: { id: 'rw', name: 'Raw Wave', school: 'damage', modules: ['wave'] } }, 'design raw wave');
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

// PROBE=dir: play single effects by hand at frozen moments (all animations paused), then stop.
if (process.env.PROBE) {
  const D = process.env.PROBE, uid = s.u.id, tgt = foeAt, area = [foeAt, (mx + 3 * dir) + ',' + (my - 1), foe2, (mx + 4 * dir) + ',' + my, (mx + 2 * dir) + ',' + my];
  const line = [1, 2, 3, 4].map((d) => (mx + d * dir) + ',' + my);
  const cone = [(mx + dir) + ',' + my, (mx + 2 * dir) + ',' + my, (mx + 2 * dir) + ',' + (my - 1), (mx + 2 * dir) + ',' + (my + 1), (mx + 3 * dir) + ',' + my, (mx + 3 * dir) + ',' + (my - 1), (mx + 3 * dir) + ',' + (my + 1)];
  const ring8 = [-1, 0, 1].flatMap((dx) => [-1, 0, 1].map((dy) => (mx + dx) + ',' + (my + dy))).filter((k) => k !== me);
  const R = (form, tone, element, stage, area) => ({ k: 'release', unit: uid, at: me, to: form === 'aura' ? me : tgt, form, tone, element, stage, area, targets: [] });
  const probes = [
    ['begin', { k: 'outburst', unit: uid, at: me, tone: 'fire', element: 'fire', hold: true, stage: 0 }, [300, 700]],
    ['pump1', { k: 'pump', unit: uid, at: me, stage: 1, mult: 1, tone: 'fire' }, [120, 300]],
    ['pump4', { k: 'pump', unit: uid, at: me, stage: 4, mult: 2.2, max: true, tone: 'fire' }, [120, 300]],
    ['pumpfree', { k: 'pump', unit: uid, at: me, stage: 2, mult: 1.4, free: true, tone: 'raw' }, [200]],
    ['burst-fire4', R('burst', 'fire', 'fire', 4, area), [420, 600, 900]],
    ['burst-raw2', R('burst', 'raw', null, 2, area), [450, 800]],
    ['bolt-frost3', R('bolt', 'frost', 'freeze', 3, [tgt]), [260, 500]],
    ['wave-acid3', R('wave', 'acid', 'acid', 3, cone), [250, 500]],
    ['aura-stone3', R('aura', 'stone', 'stone', 3, ring8), [200, 450]],
    ['lance-storm4', R('lance', 'storm', 'shock', 4, line), [200, 450]],
    ['gale-burst3', R('burst', 'gale', 'gale', 3, area), [500]],
    ['overwatch', { k: 'heart_overwatch', unit: uid, at: me, target: 't', to: tgt, stage: 2, tone: 'fire' }, [120]],
    ['short', { k: 'short', unit: uid, at: me, held: false, tone: 'raw', strain: 9, limit: 6 }, [400, 1200]],
    ['burn', { k: 'burn', unit: uid, at: me, over: 1, dmg: 8 }, [150]],
    ['letgo', { k: 'letgo', unit: uid, at: me, stage: 2, by: 2 }, [400, 900]],
    ['feed', { k: 'feed', unit: uid, at: me, word: 'fire', stage: 2, mult: 1.4 }, [250, 600]],
    ['discharge', { k: 'explode', at: tgt, radius: 1, what: 'discharge', element: 'shock', charges: 3, shake: true }, [150, 400]],
    ['charge', { k: 'charge', unit: uid, at: me, charges: 2 }, [300]],
    ['x-frag', { k: 'explode', at: tgt, radius: 1 }, [200]],
    ['x-sigilfire', { k: 'field', id: 'zz', tiles: [tgt], words: ['fire', 'stay'], element: 'fire', side: 'pc', rounds: 1 }, [150]],
  ];
  const clip = { x: Math.max(0, 0), y: 150, width: 840, height: 620 };
  for (const [name, ev, times] of probes.filter((x) => !process.env.ONLY || process.env.ONLY.split(',').includes(x[0]))) {
    for (const t of times) {
      await p.evaluate((ev) => window.__phcFx.playFx(ev), ev);
      await p.waitForTimeout(t);
      await p.evaluate(() => document.getAnimations().forEach((a) => { try { a.pause(); } catch {} }));
      await p.screenshot({ path: D + '/' + name + '-' + t + '.png', clip });
      if (process.env.DUMP && name === process.env.DUMP) console.log(name, t, JSON.stringify(await p.evaluate(() => [...document.querySelector('.phc-fx-layer').children].map((b) => { const c = b.firstElementChild, cs = c && getComputedStyle(c), bs = getComputedStyle(b); return [b.style.width, bs.opacity, bs.transform.slice(0, 40), bs.mixBlendMode, c && c.tagName, cs && (cs.maskImage || cs.webkitMaskImage || '').slice(0, 40), cs && cs.backgroundColor]; }).slice(0, 40))));
      await p.evaluate(() => document.getAnimations().forEach((a) => { try { a.play(); } catch {} }));
      await p.waitForTimeout(1600);
    }
  }
  await browser.close(); process.exit(0);
}

// ---------- 1. Begin a Fire Burst and hold it ----------
let n0 = await seq();
await must({ type: 'combat/outburst', unitId: s.u.id, design: did(/Heartfire/), hold: true }, 'begin');
await p.waitForTimeout(450); await snap('1-begin'); const peakBegin = await fxCount();
ok('Begin: the breath in draws on the layer (' + peakBegin + ' nodes); events ' + (await fxSince(n0)).join(' '), peakBegin > 3);
await p.waitForTimeout(900);
ok('the held heart stands over the token: ' + JSON.stringify(await hearts()), (await hearts()).some((h) => h.aura === 'fire' && h.stage === '0'));

// ---------- 2. Pump ×3: the ring and glow rise with the stage ----------
for (let i = 1; i <= 3; i++) {
  await ensureAp(1); s = await st();
  n0 = await seq();
  const e = await must({ type: 'combat/pump', unitId: s.u.id }, 'pump ' + i);
  await p.waitForTimeout(240); await snap('2-pump' + i);
  const k = await fxSince(n0), h = await hearts();
  ok('Pump ' + i + ': ' + k.join(' ') + ' · heart ' + JSON.stringify(h), !e && k.includes('pump'));
  await p.waitForTimeout(800);
}
await snap('3-held');
s = await st(); console.log('  held', JSON.stringify(s.u.mg?.held), 'strain', s.u.mg?.strain + '/' + s.u.mg?.strainLimit);
// To stage 4 (the edge throb), if it isn't there yet.
if ((s.u.mg?.held?.stage || 0) < 4) { await ensureAp(1); s = await st(); await must({ type: 'combat/pump', unitId: s.u.id }, 'pump 4'); await p.waitForTimeout(200); await snap('4-stage4'); await p.waitForTimeout(800); }
// Heart Overwatch armed: the eye ring.
s = await st(); await must({ type: 'combat/heartwatch', unitId: s.u.id, on: true }, 'watch');
await p.waitForTimeout(700); await snap('5-watch');
ok('Heart Overwatch shows the eye: ' + JSON.stringify(await hearts()), (await hearts()).some((h) => h.watch));
await must({ type: 'combat/heartwatch', unitId: s.u.id, on: false }, 'unwatch');

// ---------- 3. Release the Fire Burst at the enemy ----------
await ensureAp(1); s = await st(); n0 = await seq();
await must({ type: 'combat/release', unitId: s.u.id, aim: ref(foeAt) }, 'release');
if (process.env.FRAMES) { const t0 = Date.now(); for (let i = 0; i < 14; i++) await p.screenshot({ path: process.env.FRAMES + '/rel-' + String(i).padStart(2, '0') + '-' + (Date.now() - t0) + '.png', clip: { x: 100, y: 280, width: 620, height: 420 } }); }
else for (const ms of [150, 420, 800]) { await p.waitForTimeout(ms === 150 ? 150 : ms - 150); await snap('6-release-' + ms); }
ok('Release: ' + (await fxSince(n0)).join(' '), (await fxSince(n0)).includes('release'));
await p.waitForTimeout(1500);
ok('the heart is gone after the release', !(await hearts()).length);

// ---------- 4. A Storm Lance (snap cast at stage 0 after one pump) and a Raw Wave ----------
for (const [re, name] of [[/Stormlance/, 'lance'], [/Raw Wave/, 'wave']]) {
  await must({ type: 'sandbox/refill', charId: cid }); await ensureAp(4); s = await st();
  await must({ type: 'combat/outburst', unitId: s.u.id, design: did(re), hold: true }, 'begin ' + name);
  await p.waitForTimeout(900); await must({ type: 'combat/pump', unitId: s.u.id }, 'pump ' + name); await p.waitForTimeout(700);
  if (name === 'lance') await snap('7-storm-held');
  n0 = await seq(); await must({ type: 'combat/release', unitId: s.u.id, aim: ref(foeAt) }, 'release ' + name);
  await p.waitForTimeout(300); await snap('8-' + name);
  ok(name + ': ' + (await fxSince(n0)).join(' '), (await fxSince(n0)).includes('release'));
  await p.waitForTimeout(1600);
}
// ---------- 5. Let go ----------
await must({ type: 'sandbox/refill', charId: cid }); await ensureAp(3); s = await st();
await must({ type: 'combat/outburst', unitId: s.u.id, design: did(/Heartfire/), hold: true }, 'begin again'); await p.waitForTimeout(1000);
n0 = await seq(); await must({ type: 'combat/letgo', unitId: s.u.id }, 'let go'); await p.waitForTimeout(350); await snap('9-letgo');
ok('Let go: ' + (await fxSince(n0)).join(' '), (await fxSince(n0)).includes('letgo'));
const errs = await p.evaluate(() => (window.__phcErrors || []).slice(-5));
if (errs.length) console.log('  page errors', JSON.stringify(errs));
await browser.close();

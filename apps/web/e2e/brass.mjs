// What weapons throw off (fx/brass.ts; Leon, 9 Nov 2026), in a Proving Ground fight: a shot's casing comes out from
// behind the shooter's portrait (clipped where the portrait covers it) and lands behind the shooter, away from the
// target; a pump gun's hull comes a beat after the shot; a bow's arrow is drawn from behind and swung to the front
// before the shot flies; a reload's magazine drops straight down and is gone when it lands; a tactical reload drops none
// (the reload card puts it in the pack); a revolver's brass drops and fresh rounds go in; a double barrel kicks both
// hulls out behind; an Evoker throws out its spent core, the way opposite its last Evoke. Shots: e2e/shots/brass-*.png.
import { chromium, player, click, BASE, OUT, pause } from './lib.mjs';
const browser = await chromium.launch();
const p = await player(browser, 'host');
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const act = (a) => p.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
await p.setViewportSize({ width: 1440, height: 900 });
await p.goto(BASE);
await click(p, 'PROVING GROUND');
const nm = p.getByPlaceholder('Leon');
await Promise.race([nm.waitFor({ timeout: 20000 }).catch(() => {}), p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 20000 }).catch(() => {})]);
if (await nm.count()) { await nm.fill('Leon'); await click(p, 'Solo ›'); }
await p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 30000 });
await act({ type: 'sandbox/ai', on: false }); await act({ type: 'sandbox/fight' });
await p.waitForFunction(() => window.__phc.getState().screen === 'combat', null, { timeout: 30000 });
await pause(p, 2400);
for (let i = 0; i < 3 && (await p.locator('[data-phc-cutin]').count()); i++) { await p.mouse.click(1430, 880); await pause(p, 380); }
await pause(p, 1200);

const me = await p.evaluate(() => { const cb = window.__phc.getState().game.combat; const u = cb.units.find((x) => x.side === 'pc' && !x.dead); return { id: u.id, pos: u.pos }; });
const [mx, my] = me.pos.split(',').map(Number);
// the portrait on screen
const tok = await p.evaluate((k) => { const [x, y] = k.split(',').map(Number); const ref = String.fromCharCode(65 + x) + (y + 1);
  const b = [...document.querySelectorAll('button.phc-tok[aria-label]')].find((el) => { const l = el.getAttribute('aria-label') || ''; return l.startsWith(ref) && !/[0-9A-Za-z]/.test(l.charAt(ref.length)); });
  const img = [...b.children].find((c) => /z-index:\s*2/.test(c.getAttribute('style') || '')); const r = img.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }; }, me.pos);
/** Play an effect and sample the pieces (tag, centre on screen, opacity, the clip on their box) every step ms. */
const watchOnce = (ev, ms = 1600, step = 40) => p.evaluate(async ({ ev, ms, step }) => {
  const seen = [], t0 = performance.now(); let n = 0;
  window.__phcFx.playFx(ev);
  // (for `ms`, and then for as long as a piece is still on the layer, to four times that: a busy machine runs the
  // effect's timers late, and a window counted in milliseconds alone closed before the piece had landed)
  while (performance.now() - t0 < ms || (document.querySelector('[data-fx-piece]') && performance.now() - t0 < ms * 4)) {
    for (const el of document.querySelectorAll('[data-fx-piece]')) {
      const r = el.getBoundingClientRect(), box = el.parentElement;
      // (`late`: how far this loop's own timers have fallen behind by now: what a busy machine has cost every timer on the page)
      seen.push({ t: Math.round(performance.now() - t0), late: Math.max(0, Math.round(performance.now() - t0 - n * step)), tag: el.getAttribute('data-fx-piece'), x: r.left + r.width / 2, y: r.top + r.height / 2, h: r.height, op: Number(getComputedStyle(el).opacity), clip: getComputedStyle(box).clipPath || '' });
    }
    await new Promise((res) => setTimeout(res, step)); n++;
  }
  return seen;
}, { ev, ms, step });
/** watchOnce, played again (three times at most) when the sampler in the page was starved: two samples in a row more than
 *  150 ms apart, where the step is 20 to 40 ms. A busy machine does that, and then the samples skip the very part of the
 *  flight a check looks at (seen: a bow's arrow sampled once, before it swung to the front). The checks stay as they
 *  are; they are only given a run in which the page had the time to look. */
const starved = (s) => { const ts = [...new Set(s.map((x) => x.t))].sort((a, b) => a - b); return ts.some((t, i) => i > 0 && t - ts[i - 1] > 150); };
const watch = async (ev, ms, step) => { let s = []; for (let i = 0; i < 3; i++) { s = await watchOnce(ev, ms, step); if (!starved(s)) break; await p.waitForFunction(() => !document.querySelector('[data-fx-piece]'), null, { timeout: 20000 }).catch(() => {}); } return s; };
const by = (s, tag) => s.filter((x) => x.tag === tag);
const shot = (weapon, cat, to) => ({ k: 'shot', unit: me.id, target: null, from: me.pos, to, weapon, cat, mode: 'shot', hit: true, dmg: 5 });
const right = (mx + 4) + ',' + my, up = mx + ',' + Math.max(0, my - 4);

// 1. A pistol shot to the right: the casing starts behind the portrait (its box cut where the portrait is) and lands left.
let s = await watch(shot('service_pistol', 'pistol', right), 1300);
let c = by(s, 'shell:pistol');
ok('a pistol shot throws a casing (' + c.length + ' samples)', c.length > 5);
ok('it comes out from behind the portrait: its box is cut out where the portrait is (' + (c[0]?.clip || '').slice(0, 40) + '…)', /evenodd/.test(c[0]?.clip || ''));
const last = c.filter((x) => x.op > 0.5).pop();
ok('the target is to the right, so it lands to the left, behind the shooter (' + Math.round(last?.x - tok.x) + ' px)', last && last.x < tok.x - tok.w * 0.4);
await p.screenshot({ path: OUT + 'brass-pistol.png', clip: { x: Math.max(0, tok.x - 120), y: Math.max(0, tok.y - 100), width: 260, height: 200 } });
// 2. A shot straight up: the casing lands below (behind is the opposite of the aim, not just left or right).
s = await watch(shot('service_pistol', 'pistol', up), 1300); c = by(s, 'shell:pistol');
const lastUp = c.filter((x) => x.op > 0.5).pop();
ok('shooting up, it lands below the shooter (' + Math.round(lastUp?.y - tok.y) + ' px)', lastUp && lastUp.y > tok.y + tok.h * 0.4);
// 3. A pump gun: the hull comes a beat after the shot.
s = await watch(shot('lumeri_scattergun', 'shotgun', right), 1300); c = by(s, 'shell:hull');
ok('a pump gun\'s hull comes out after the pump (first seen at ' + c[0]?.t + ' ms)', c.length && c[0].t >= 150);
// 4. A bow: the arrow is drawn from behind (first on the side away from the target), then the shot flies.
s = await watch(shot('longbow', 'bow', right), 900, 25); c = by(s, 'arrow');
ok('a bow draws an arrow first (' + c.length + ' samples, first at ' + Math.round((c[0]?.x ?? 0) - tok.x) + ' px)', c.length > 4 && c[0].x <= tok.x + 2);
const front = c.filter((x) => x.op > 0.5 && x.t > 350).pop();
ok('…and swings it to the front, toward the target (' + Math.round((front?.x ?? 0) - tok.x) + ' px)', front && front.x > tok.x + tok.w * 0.2);
// 5. A magazine reload: it drops straight down and is gone the moment it lands.
s = await watch({ k: 'reload', unit: me.id, at: me.pos, weapon: 'legion_bullpup', cat: 'rifle', how: 'mag', dur: 1200 }, 1200, 20); c = by(s, 'mag:curved_mag');
const xs = c.map((x) => x.x), ys = c.map((x) => x.y);
ok('a reload drops the magazine (' + c.length + ' samples)', c.length > 3);
ok('straight down: it hardly moves sideways (' + Math.round(Math.max(...xs) - Math.min(...xs)) + ' px) and falls (' + Math.round(Math.max(...ys) - Math.min(...ys)) + ' px)', Math.max(...xs) - Math.min(...xs) < tok.w * 0.25 && Math.max(...ys) - Math.min(...ys) > tok.h * 0.3);
const seenTill = c.filter((x) => x.op > 0.05).pop()?.t;
// WALL CLOCK, on purpose: the magazine is gone when it lands, a third of the way into the reload, not at its end (1200 ms).
// Under 800 ms on an idle machine; on a busy one every timer on the page runs late, the effect's and this sampler's
// alike, so the sampler's own lateness at that moment is taken off first.
const lateBy = c.filter((x) => x.op > 0.05).pop()?.late || 0;
ok('it is gone once it lands (last visible at ' + seenTill + ' ms, of a 1200 ms reload; the page\'s timers were ' + lateBy + ' ms late by then)', seenTill - lateBy < 800);
await p.evaluate((ev) => window.__phcFx.playFx(ev), { k: 'reload', unit: me.id, at: me.pos, weapon: 'legion_bullpup', cat: 'rifle', how: 'mag', dur: 1200 });
await pause(p, 330); await p.screenshot({ path: OUT + 'brass-mag.png', clip: { x: Math.max(0, tok.x - 120), y: Math.max(0, tok.y - 100), width: 260, height: 200 } });
await pause(p, 1500);
// 6. Tactical: nothing drops under the portrait (the reload card slides the old magazine into its pack; review, 9 Nov
//    2026: a magazine falling under the token read as a speed reload).
s = await watch({ k: 'reload', unit: me.id, at: me.pos, weapon: 'legion_bullpup', cat: 'rifle', how: 'mag', dur: 1200, tactical: true }, 1300, 30); c = by(s, 'mag:curved_mag');
ok('a tactical reload drops no magazine under the portrait (' + c.length + ' samples)', c.length === 0);
// 7. A revolver: its brass drops, then fresh rounds go in; no magazine.
s = await watch({ k: 'reload', unit: me.id, at: me.pos, weapon: 'drifter_revolver', cat: 'revolver', how: 'mag', dur: 1200 }, 1500);
ok('a revolver dumps its brass (' + new Set(by(s, 'shell:pistol').map((x) => x.t)).size + ' samples) and loads fresh rounds (' + by(s, 'round:pistol').length + '), no magazine',
  by(s, 'shell:pistol').length > 3 && by(s, 'round:pistol').length > 3 && !s.some((x) => /^mag:/.test(x.tag)));
// 8. A double barrel: both hulls kicked out behind (the shooter last aimed right: they go left), two fresh ones in.
s = await watch({ k: 'reload', unit: me.id, at: me.pos, weapon: 'coach_gun', cat: 'shotgun', how: 'loose', rounds: 2, dur: 1400 }, 1500); c = by(s, 'shell:hull');
const hullEnd = c.filter((x) => x.op > 0.5).pop();
ok('a double barrel kicks its hulls out behind (' + Math.round((hullEnd?.x ?? 0) - tok.x) + ' px) and takes two fresh ones (' + by(s, 'round:hull').length + ' samples)', hullEnd && hullEnd.x < tok.x - tok.w * 0.3 && by(s, 'round:hull').length > 2);
// 9. An Evoker after an Evoke to the right: the spent core goes left.
await p.evaluate((u) => window.__phcFx.playFx({ k: 'evoke', unit: u.id, at: u.pos, shape: 'line', tiles: [], dir: [1, 0], element: 'fire', missiles: [] }), me);
await pause(p, 900);
s = await watch({ k: 'core', unit: me.id, at: me.pos, dur: 1000, focus: 'evoker' }, 1500); c = by(s, 'core:evoker');
const coreEnd = c.filter((x) => x.op > 0.5).pop();
ok('the Evoker throws its spent core out behind, away from its last Evoke (' + Math.round((coreEnd?.x ?? 0) - tok.x) + ' px)', coreEnd && coreEnd.x < tok.x - tok.w * 0.4);
s = await watch({ k: 'core', unit: me.id, at: me.pos, dur: 1000, focus: 'grand_staff' }, 600);
ok('a grand staff throws its orb', by(s, 'core:staff').length > 2);
await pause(p, 1500);
// 10. A character's Burst (rules 1.18: three rounds, two rolls): three rounds in rhythm and three casings, not two
//     (Leon, 12 Nov 2026). The engine's volley says the round with no roll (`loose`); the queue puts it on the last roll.
//     Since 13 Nov 2026 (no tracer lines; "change the effect for shots to a bullet hole"): bullet holes drawn = rounds
//     that hit, one after another; casings = rounds spent. Both rolls hit here: three holes, in rhythm.
const burst = await p.evaluate(async ({ id, pos, to }) => {
  window.__phcFxTrace = [];
  const n = 900000 + Math.floor(Math.random() * 1000), W = { unit: id, from: pos, to, weapon: 'hellraiser_service_rifle', cat: 'rifle', target: null };
  window.__phcFx.queueFx([
    { k: 'technique', n, unit: id, id: 'burst', group: 'fire', system: 'ranged', target: null, at: pos, weapon: W.weapon },
    { k: 'volley', n: n + 1, ...W, mode: 'burst', shots: 3, loose: 1 },
    { k: 'shot', n: n + 2, ...W, mode: 'shot', hit: true, crit: false, fumble: false, dmg: 0, killed: false, tech: 'burst', vi: 0, chain: true },
    { k: 'shot', n: n + 3, ...W, mode: 'shot', hit: true, crit: false, fumble: false, dmg: 0, killed: false, tech: 'burst', vi: 1, chain: true, step: -4 },
  ], 'e2e-brass-burst');
  // wait for the queue to play out (its own state, not a fixed time: a busy machine runs the timers late), at most 20 s
  const idle = () => { const d = window.__phcFxDebug?.(); return !d || !(d.timers > 0 || d.queueEndIn > 0 || d.heldBehindGate); };
  for (let t0 = performance.now(); performance.now() - t0 < 20000;) { await new Promise((r) => setTimeout(r, 100)); if (performance.now() - t0 > 600 && idle()) break; }
  const T = window.__phcFxTrace; window.__phcFxTrace = undefined;
  const holes = T.filter((x) => x.w === 'hole');
  // the rhythm is judged on the plan (t: when each hole was due, the same on any machine), not on the wall clock (rt),
  // where a busy machine bunches late timers together (8 ms apart beside other suites)
  return { rounds: T.filter((x) => x.w === 'round').length, shells: T.filter((x) => x.w === 'shell').length, holes: holes.length, kinds: [...new Set(holes.map((x) => x.kind))], at: holes.map((x) => Math.round(x.t)) };
}, { id: me.id, pos: me.pos, to: right });
ok('a character\'s Burst fires three rounds for its two rolls (' + burst.rounds + ') and throws three casings (' + burst.shells + ')', burst.rounds === 3 && burst.shells === 3);
const gaps = burst.at.slice(1).map((t, i) => t - burst.at[i]);
ok('…and its three hits leave three bullet holes (' + burst.holes + ', ' + burst.kinds.join(',') + '), one after another (' + gaps.join(', ') + ' ms apart)', burst.holes === 3 && burst.kinds.join() === 'hole' && gaps.every((g) => g > 20));
await pause(p, 1200);
ok('nothing left on the layer afterwards', (await p.locator('[data-fx-piece]').count()) === 0);
ok('no page errors', p.errors.length === 0);
if (p.errors.length) console.log(p.errors);
await browser.close();

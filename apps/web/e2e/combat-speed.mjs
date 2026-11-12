// The combat speed (game/combatSpeed.ts; Leon, 9 Nov 2026: "reduce all animation, pop up UI speed in battle by about
// 15% … the cut in popup for crit barely shows long enough for me to even read the text"), in a Proving Ground fight:
//  1. the default is Normal (× 1/0.85 ≈ 1.176), and the hook (window.__phcCombatTempo) says a fight is on;
//  2. an effect's real animations (document.getAnimations) and the queue's beats are × 1.176 at Normal and as written at
//     Fast, switched live (no reload), once by setCombatSpeed and once by localStorage + the 'phc:combat-speed' event;
//  3. a real crit (the host's next d20 set to a natural 20) at each speed: the short cut-in's words are fully on screen
//     at least CRIT_READ_MS (1.6 s at Fast, ≈ 1.88 s at Normal; measured on the page), its length follows the speed, and
//     the shot after it plays at the spotlight's own slow-mo on top (400 ms ÷ 0.85 × the speed).
// Screens at deviceScaleFactor 1 in e2e/shots/combat-speed-*.png (DSF=2 SHOTS=<dir> for sharper copies in <dir>).
import { chromium, player, click, BASE, OUT, pause, fxIdle } from './lib.mjs';
const SHOTS = process.env.SHOTS;
const browser = await chromium.launch();
const p = await player(browser, 'host');
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const snap = (n) => p.screenshot({ path: (SHOTS ? SHOTS + '/' : OUT) + 'combat-speed-' + n + '.png' });
const act = (a) => p.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
const tempo = () => p.evaluate(() => window.__phcCombatTempo());
const settle = async () => { await p.waitForFunction(() => (window.__phcHold?.() || 0) <= performance.now() + 5 && !window.__phcCutin?.showing, null, { timeout: 15000 }).catch(() => {}); await pause(p, 150); };
const ref = (k) => { const [x, y] = k.split(',').map(Number); return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[x] + (y + 1); };
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const MULT = 1 / 0.85, READ = 1600;
// The engine's dice (packages/engine/src/rng.ts): a state whose next d20 is a natural 20.
function next(r) { let t = (r.state = (r.state + 0x6d2b79f5) | 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
const nat20 = (skip = 0) => { for (let s = 1; s < 1e7; s++) { const r = { state: s }; if (1 + Math.floor(next(r) * 20) === 20 && skip-- <= 0) return s; } return 1; };

await p.setViewportSize({ width: 1440, height: 900 });
await p.goto(BASE);
await click(p, 'PROVING GROUND');
const nm = p.getByPlaceholder('Leon');
await Promise.race([nm.waitFor({ timeout: 8000 }).catch(() => {}), p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 8000 }).catch(() => {})]);
if (await nm.count()) { await nm.fill('Leon'); await click(p, 'Solo ›'); }
await p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 15000 });
const meChar = await p.evaluate(() => { const g = window.__phc.getState().game, me = window.__phc.getState().me.id; return Object.values(g.characters).find((c) => c.owner === me).id; });
await act({ type: 'sandbox/give', charId: meChar, item: 'hellraiser_service_rifle', equip: true });
// before the fight: no fight, so the pace is 1 whatever the setting
const pre = await tempo();
ok('outside a fight the pace is 1 (speed ' + pre.speed + ', pace ' + pre.pace + ')', pre.pace === 1 && pre.battle === false);
await act({ type: 'sandbox/ai', on: false }); await act({ type: 'sandbox/fight' });
await p.waitForFunction(() => window.__phc.getState().screen === 'combat', null, { timeout: 15000 });
await pause(p, 2400);
for (let i = 0; i < 3 && (await p.locator('[data-phc-cutin]').count()); i++) { await p.mouse.click(1430, 880); await pause(p, 380); }
await settle();

// 1. The default.
let t = await tempo();
ok('the default is Normal: × ' + t.mult.toFixed(4) + ', in a fight, pace ' + t.pace.toFixed(4), t.speed === 'normal' && near(t.mult, MULT, 1e-6) && t.battle === true && near(t.pace, MULT, 1e-6));
ok('the combat screen\'s CSS pace follows (--phc-k ' + await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--phc-k')) + ')',
  near(Number(await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--phc-k'))), MULT, 1e-3));

// 2. An effect's real animations, and the queue's beats, at each speed (switched live).
const me = await p.evaluate(() => { const cb = window.__phc.getState().game.combat; const u = cb.units.find((x) => x.side === 'pc' && !x.dead); return { id: u.id, pos: u.pos }; });
/** Play a hurt float on the fighter and read the animations it started (their durations as the browser has them). */
const durations = () => p.evaluate((pos) => {
  const before = new Set(document.getAnimations());
  window.__phcFx.playFx({ k: 'hurt', unit: null, at: pos, amount: 7, dmg: 7 });
  const fresh = document.getAnimations().filter((a) => !before.has(a) && a.effect && a.effect.target && a.effect.target.closest && a.effect.target.closest('.phc-fx-layer'));
  return fresh.map((a) => Number(a.effect.getTiming().duration)).filter((d) => d > 0).sort((a, b) => b - a);
}, me.pos);
/** Queue a shot then a float through the effects queue and read the gap the hook logged between them. */
const beatGap = async () => { const n0 = 900000 + Math.floor(Math.random() * 1000);
  await p.evaluate(([pos, n0]) => window.__phcFx.queueFx([{ n: n0, k: 'shot', unit: null, from: pos, to: pos, weapon: 'service_pistol', cat: 'pistol', hit: false }, { n: n0 + 1, k: 'mana', delta: 0 }], 'speedtest'), [me.pos, n0]);
  // (until the queue's own log has played both: not a number of milliseconds)
  await p.waitForFunction((n) => window.__phcCombatTempo().fx.some((x) => x.n === n), n0 + 1, { timeout: 20000 }).catch(() => {});
  const fx = (await tempo()).fx, a = fx.find((x) => x.n === n0), b = fx.find((x) => x.n === n0 + 1);
  return { beat: a ? a.beat : 0, gap: a && b ? b.at - a.at : 0 };
};
await p.evaluate(() => window.__phcCombatSpeed.set('normal'));
const dN = await durations(); await pause(p, 1500); const bN = await beatGap();
await p.evaluate(() => window.__phcCombatSpeed.set('fast'));
t = await tempo();
ok('setCombatSpeed(\'fast\') applies at once: pace ' + t.pace, t.speed === 'fast' && t.pace === 1);
const dF = await durations(); await pause(p, 1500); const bF = await beatGap();
// by localStorage and the event (what another tab or the settings screen may do)
await p.evaluate(() => { localStorage.setItem('phc.combatSpeed', 'normal'); window.dispatchEvent(new CustomEvent('phc:combat-speed')); });
t = await tempo();
ok('localStorage + \'phc:combat-speed\' switches it back to Normal live (pace ' + t.pace.toFixed(4) + ')', t.speed === 'normal' && near(t.pace, MULT, 1e-6));
const dN2 = await durations(); await pause(p, 1500);
ok('a hurt float\'s animations at Fast: ' + dF.map(Math.round).join(', ') + ' ms', dF.length > 0 && dF[0] >= 900);
ok('at Normal each one is × 1.176: ' + dN.map(Math.round).join(', ') + ' ms (ratio ' + (dN[0] / dF[0]).toFixed(4) + ')', dN.length === dF.length && dN.every((d, i) => near(d / dF[i], MULT, 0.002)));
ok('and again after the event switch (ratio ' + (dN2[0] / dF[0]).toFixed(4) + ')', dN2.length === dF.length && near(dN2[0] / dF[0], MULT, 0.002));
// The settings cog in the header (game/settings.tsx, Combat tab) drives the same tempo, live, mid-fight.
{
  const cssK = () => p.evaluate(() => Number(getComputedStyle(document.documentElement).getPropertyValue('--phc-k')));
  await p.locator('header').first().getByRole('button', { name: 'Settings', exact: true }).click();
  const set = p.locator('div[role="dialog"][aria-label="Settings"]'); await set.waitFor({ timeout: 15000 });
  await set.getByRole('tab', { name: 'Combat' }).click();
  await set.locator('button[data-phc-speed="fast"]').click();
  t = await tempo(); const kF = await cssK();
  ok('the cog\'s Combat speed → Fast plays the fight at once at pace ' + t.pace + ' (--phc-k ' + kF + '), pressed: ' + await set.locator('button[data-phc-speed="fast"]').getAttribute('aria-pressed'),
    t.speed === 'fast' && t.pace === 1 && kF === 1 && (await set.locator('button[data-phc-speed="fast"]').getAttribute('aria-pressed')) === 'true');
  const dC = await durations(); await pause(p, 1500);
  ok('a hurt float after the cog\'s Fast: ' + dC.map(Math.round).join(', ') + ' ms (= Fast)', dC.length === dF.length && near(dC[0], dF[0], 2));
  await set.locator('button[data-phc-speed="normal"]').click();
  t = await tempo();
  ok('the cog\'s Normal brings it back (pace ' + t.pace.toFixed(4) + ', --phc-k ' + await cssK() + ')', t.speed === 'normal' && near(t.pace, MULT, 1e-6) && near(await cssK(), MULT, 1e-3));
  await p.keyboard.press('Escape'); await pause(p, 300);
  ok('Escape closes Settings', (await set.count()) === 0);
}
ok('the queue\'s beat for a shot: ' + bF.beat + ' ms at Fast, ' + bN.beat + ' at Normal (gap measured ' + bF.gap + ' / ' + bN.gap + ' ms)', // (the beats are the PLAN and are compared exactly; the gaps are the wall clock, and a busy machine only ever makes a gap
  // longer, so each is held to its lower bound; comparing the two gaps with each other compared two runs' luck)
  bF.beat === 400 && near(bN.beat, 400 * MULT, 1) && bN.gap >= 455 && bF.gap >= 385);

// 3. A real crit at each speed: the cut-in's words on screen long enough to read.
const freeBeside = (pos) => p.evaluate((pos) => { const cb = window.__phc.getState().game.combat, m = cb.map, [x, y] = pos.split(',').map(Number);
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1], [2, 0], [-2, 0], [0, 2], [0, -2]]) {
    const k = (x + dx) + ',' + (y + dy); if (x + dx < 0 || y + dy < 0 || x + dx >= m.w || y + dy >= m.h) continue;
    if ((m.solid || []).includes(k) || cb.units.some((u) => !u.dead && u.pos === k) || (cb.objects || []).some((o) => o.pos === k)) continue; return k; } return null; }, pos);
const cur = () => p.evaluate(() => { const cb = window.__phc.getState().game.combat; return cb && cb.units.find((x) => x.id === cb.order[cb.turn]); });
async function myTurn() { for (let i = 0; i < 40; i++) { const u = await cur(); if (u && u.side === 'pc') return u; if (u) await act({ type: 'combat/end-turn', unitId: u.id }).catch(() => {}); await pause(p, 300); } return null; }
{ await settle(); const u = await myTurn(); const k = u && await freeBeside(u.pos); const e = k ? await act({ type: 'sandbox/spawn', tier: 'soldier', weapon: 'fists', at: ref(k), name: 'Rook' }) : 'no free tile'; ok('a sturdy trooper (Rook) beside the recruit (' + (e || ref(k)) + ')', !e); }
let skip = 0;
/** One crit on Rook at this speed; returns its cut-in log and the words' time fully visible, measured on the page. */
async function crit(speed) {
  await p.evaluate((s) => window.__phcCombatSpeed.set(s), speed);
  for (let tries = 0; tries < 8; tries++) {
    await settle();
    const u = await myTurn(); if (!u) return null;
    if (u.ap < 3) { await act({ type: 'combat/end-turn', unitId: u.id }); continue; }
    const tid = await p.evaluate(() => { const cb = window.__phc.getState().game.combat; const b = cb.units.find((x) => x.name === 'Rook' && !x.dead); if (!b) return null; b.hp = b.maxHp = 999; b.armour = 0; return b.id; });
    if (!tid) return null;
    const nb = await p.evaluate(() => (window.__phcCutins || []).length);
    await p.evaluate((s) => { window.__phc.getState().game.rng.state = s; }, nat20(skip++));
    // the watcher: when the words are fully on screen (opacity 1), sampled every frame until the cut-in has gone.
    // `gap` is the longest wait between two frames while it watched: a sample can only see the words LATE (the first
    // full frame) and lose them EARLY (the last one), each by at most one gap, so the true time is between `full` and
    // `full` + 2 × gap. On an idle machine gap is 16 ms; on a busy one it is what makes the measurement honest.
    const watch = p.evaluate(() => new Promise((res) => {
      const t0 = performance.now(); let first = 0, last = 0, seen = false, prev = 0, gap = 0;
      const tick = () => {
        const el = document.querySelector('[data-phc-spotlight="crit"] [data-phc-spotlight-words], [data-phc-spotlight="crit"] [data-phc-spotlight-plate]');
        const now = performance.now();
        if (seen && prev) gap = Math.max(gap, now - prev);
        prev = now;
        if (el) { seen = true; if (Number(getComputedStyle(el).opacity) >= 0.99) { if (!first) first = now; last = now; } }
        if ((seen && !el) || now - t0 > 30000) return res({ first, last, gap: Math.round(gap), full: last && first ? Math.round(last - first) : 0 });
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }));
    const err = await act({ type: 'combat/attack', unitId: u.id, targetId: tid, mode: 'shot' });
    if (err) { await watch.catch(() => {}); await act({ type: 'combat/end-turn', unitId: u.id }); continue; }
    const isCrit = await p.evaluate((uid) => (window.__phc.getState().game.combat.fx || []).slice(-12).some((e) => e.k === 'spotlight' && e.kind === 'crit'), u.id);
    if (!isCrit) { await watch.catch(() => {}); continue; }
    await p.locator('[data-phc-spotlight="crit"] [data-phc-spotlight-words]').first().waitFor({ timeout: 3000 }).catch(() => {});
    await pause(p, 500); await snap('crit-' + speed);
    const w = await watch;
    // (the hold let go, then everything queued behind the cut-in played: the slowed shot is in the page's record by then)
    await settle(); await fxIdle(p, 30000); await pause(p, 200);
    const log = (await p.evaluate(() => (window.__phcCutins || []).map((x) => ({ ...x, slowed: [...x.slowed] })))).slice(nb).find((x) => x.kind === 'crit');
    return log ? { log, w } : null;
  }
  return null;
}
const cF = await crit('fast'), cN = await crit('normal');
ok('a crit at Fast and at Normal', !!cF && !!cN);
if (cF && cN) {
  const len = (c) => c.log.end - c.log.at, words = (c) => c.log.outAt - c.log.textIn;
  // WALL CLOCK, on purpose: that the words stay long enough to READ is the thing under test. Two readings: the page's own
  // record of when the words came in and went out (never shorter than planned: a timer does not fire early), and the
  // frames sampled above, which may under-read by two frame gaps and are given exactly that much room and no more.
  ok('Fast: the words fully on screen ' + cF.w.full + ' ms measured (longest frame gap ' + cF.w.gap + ' ms; planned ' + words(cF) + '; at least ' + READ + ')', cF.w.full + 2 * cF.w.gap >= READ - 60 && words(cF) >= READ);
  ok('Normal: the words fully on screen ' + cN.w.full + ' ms measured (longest frame gap ' + cN.w.gap + ' ms; planned ' + words(cN) + '; at least ' + Math.round(READ * MULT) + ')', cN.w.full + 2 * cN.w.gap >= READ * MULT - 60 && words(cN) >= Math.round(READ * MULT) - 1);
  // (the PLANNED lengths are in the ratio of the speeds, exactly; the lengths as they ran are never shorter than planned,
  // and not longer than twice the plan and a second: a busy machine runs late, never early)
  const ranAsPlanned = (c) => len(c) >= c.log.ms - 5 && len(c) <= c.log.ms * 2 + 1000;
  ok('the cut-in lasts ' + len(cF) + ' ms at Fast and ' + len(cN) + ' at Normal (planned ' + cF.log.ms + ' / ' + cN.log.ms + '; × ' + (cN.log.ms / cF.log.ms).toFixed(3) + ')',
    near(cN.log.ms / cF.log.ms, MULT, 0.002) && ranAsPlanned(cF) && ranAsPlanned(cN));
  const shF = cF.log.slowed.find((x) => x.k === 'shot'), shN = cN.log.slowed.find((x) => x.k === 'shot');
  ok('the shot after it stacks the slow-mo on the speed: ' + (shF && shF.beat) + ' ms at Fast (400 ÷ 0.85), ' + (shN && shN.beat) + ' at Normal (× 1.176)',
    !!shF && !!shN && near(shF.beat, 400 / 0.85, 2) && near(shN.beat, 400 / 0.85 * MULT, 2));
}
await p.evaluate(() => window.__phcCombatSpeed.set('normal'));
const errs = p.errors.filter((e) => !/Failed to load resource|favicon|net::ERR/.test(e));
ok('no page errors (' + errs.slice(0, 3).join(' | ') + ')', errs.length === 0);
await browser.close();

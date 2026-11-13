// The map-hover performance probe (docs/design/handoffs/map-hover-performance.md). NOT a pass/fail suite: it measures.
// It opens the Proving Ground's fight on the 26 x 26 map with a wave on it (enemy AI off) and records the page's own
// requestAnimationFrame deltas while:
//   a  the camera glides (Home from a far corner) with the pointer OFF the map
//   b  the same glide with the pointer RESTING on the map
//   c  your unit walks five tiles while the pointer sweeps across the tiles
//   d  the pointer sweeps across the tiles with nothing moving
// For each: mean and worst frame time (ms), frames over 16.7 ms and over 33 ms, how many tiles the browser said the
// pointer entered, and how many times the combat screen rendered. Then the same at 4x CPU throttling.
//
//   node tools/perf/map_hover_probe.mjs --base http://127.0.0.1:8793 [--runs 3] [--rates 1,4] [--profile out.json]
//
// --profile writes a CPU profile (Chrome DevTools format) of scenario c at the last rate: open it in DevTools'
// Performance panel, or read the summary it prints (the heaviest functions by self time).
// Needs a built game served at --base (npm run build; wrangler dev on a port of your own: see the hand-off).
import { createRequire } from 'module';
import { writeFileSync } from 'fs';
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const { chromium } = require('playwright');

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const BASE = opt('--base', 'http://127.0.0.1:8787');
const RUNS = Number(opt('--runs', '3'));
const RATES = opt('--rates', '1,4').split(',').map(Number);
const PROFILE = opt('--profile', '');
const ONLY = opt('--only', 'abcd');

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await ctx.addInitScript(() => { try { localStorage.setItem('phc.voice', JSON.stringify({ auto: false })); localStorage.setItem('phc.tips', '["*"]'); sessionStorage.setItem('phc.pressedAnyKey', '1'); localStorage.setItem('phc.music', JSON.stringify({ on: false })); } catch { /* */ } });
const p = await ctx.newPage();
const cdp = await ctx.newCDPSession(p);
const pause = (ms) => p.evaluate((ms) => new Promise((r) => setTimeout(r, ms)), ms);
const act = (a) => p.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
const G = () => p.evaluate(() => window.__phc.getState().game);
const settle = () => p.waitForFunction(() => { const c = window.__phcCamera(); return !!c && !c.gliding; }, null, { timeout: 20000, polling: 30 }).catch(() => {});
const fxIdle = () => p.waitForFunction(() => { const d = window.__phcFxDebug?.(); return !d || !(d.timers > 0 || d.queueEndIn > 0 || d.heldBehindGate); }, null, { timeout: 20000, polling: 30 }).catch(() => {});

await p.goto(BASE);
await p.getByRole('button', { name: 'PROVING GROUND' }).first().click({ timeout: 90000 });
const nm = p.getByPlaceholder('Leon');
await Promise.race([nm.waitFor({ timeout: 20000 }).catch(() => {}), p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 20000 }).catch(() => {})]);
if (await nm.count()) { await nm.fill('Leon'); await p.getByRole('button', { name: 'Solo ›' }).first().click(); }
await p.waitForFunction(() => window.__phc.getState().game?.sandbox?.state === 'ready', null, { timeout: 30000 });
let g = await G(); const cid = Object.keys(g.characters)[0];
await act({ type: 'sandbox/skill', charId: cid, skill: 'agility', points: 1 });
await act({ type: 'sandbox/ai', on: false });
await act({ type: 'sandbox/fight' });
await p.waitForFunction(() => window.__phc.getState().screen === 'combat', null, { timeout: 30000 });
await pause(2600);
for (let i = 0; i < 4 && (await p.locator('[data-phc-cutin]').count()); i++) { await p.keyboard.press('Escape'); await pause(450); }
// twelve enemy units, spread around the map (a spawn on a wall or a crate is refused: the next tile is tried)
const FOES = Number(opt('--foes', '12'));
const foes = async () => (await G()).combat.units.filter((u) => u.side === 'foe' && !u.dead).length;
for (let y = 2; y < 25 && (await foes()) < FOES; y += 3) for (let x = 2; x < 25 && (await foes()) < FOES; x += 4) await act({ type: 'sandbox/spawn', tier: 'soldier', weapon: 'hellraiser_service_rifle', at: (x + (y % 2)) + ',' + y });
const added = await foes();
await fxIdle(); await settle(); await pause(800);
g = await G();

console.log(`map ${g.combat.map.w} x ${g.combat.map.h}, ${g.combat.units.filter((u) => !u.dead).length} units on it (${added} added), DOM nodes in the grid: ${await p.evaluate(() => document.querySelector('.phc-grid').getElementsByTagName('*').length)}`);

// ---------- the recorder (in the page) ----------
await p.evaluate(() => {
  const R = (window.__probe = { on: false, frames: [], last: 0, enters: 0, renders: 0 });
  const loop = (t) => { if (R.on) { if (R.last) R.frames.push(t - R.last); R.last = t; } requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
  // a tile "entered" the way React's onMouseEnter hears it: a mouseover whose target is in a new tile
  let cur = null;
  document.addEventListener('mouseover', (e) => { if (!R.on) return; const t = e.target && e.target.closest && e.target.closest('.phc-grid button.phc-tok'); if (t && t !== cur) { cur = t; R.enters++; } }, true);
  // a render of the combat screen: the grid's subtree is touched by React (attribute or child changes on its tiles)
  const grid = document.querySelector('.phc-grid');
  new MutationObserver((l) => { if (R.on) R.renders += l.length; }).observe(grid, { subtree: true, attributes: true, childList: true, characterData: true });
  // the main thread's own work, frame by frame (Long Animation Frames: every frame over 50 ms, split into script, the
  // forced layout inside scripts, and the frame's own style and layout): what the page did, apart from the raster
  R.loaf = [];
  try { new PerformanceObserver((l) => { if (R.on) for (const e of l.getEntries()) R.loaf.push(e); }).observe({ type: 'long-animation-frame', buffered: false }); } catch { /* */ }
});
const start = () => p.evaluate(() => { const R = window.__probe; R.frames = []; R.last = 0; R.enters = 0; R.renders = 0; R.loaf = []; R.c0 = window.__phcRenderCount || 0; R.on = true; });
const stop = () => p.evaluate(() => { const R = window.__probe; R.on = false;
  const sum = (f) => R.loaf.reduce((a, e) => a + f(e), 0);
  const script = sum((e) => e.scripts.reduce((a, s) => a + s.duration, 0)), forced = sum((e) => e.scripts.reduce((a, s) => a + (s.forcedStyleAndLayoutDuration || 0), 0));
  const layout = sum((e) => e.styleAndLayoutStart ? e.startTime + e.duration - e.styleAndLayoutStart : 0);
  // who spent the scripts' time and their forced layouts (the invoker: an event, a frame callback, a timer)
  const by = {}; for (const e of R.loaf) for (const s of e.scripts) { const k = (s.invokerType || '') + ' ' + (s.invoker || '').slice(0, 60) + ' ' + (s.sourceFunctionName || ''); const o = (by[k] ||= { ms: 0, forced: 0, n: 0 }); o.ms += s.duration; o.forced += s.forcedStyleAndLayoutDuration || 0; o.n++; }
  const top = Object.entries(by).sort((a, b) => b[1].ms - a[1].ms).slice(0, 6).map(([k, v]) => Math.round(v.ms) + ' ms (' + Math.round(v.forced) + ' forced, ' + v.n + 'x) ' + k);
  return { frames: R.frames, enters: R.enters, mutations: R.renders, renders: (window.__phcRenderCount || 0) - R.c0, loaf: { n: R.loaf.length, ms: sum((e) => e.duration), script, forced, layout }, top }; });
const stats = (r) => {
  const f = r.frames.slice(1); // (the first delta straddles the start)
  const n = f.length || 1, mean = f.reduce((a, b) => a + b, 0) / n;
  return { n: f.length, mean: +mean.toFixed(1), worst: +Math.max(0, ...f).toFixed(1), over16: f.filter((x) => x > 16.7 * 1.05).length, over33: f.filter((x) => x > 33.4).length, enters: r.enters, mutations: r.mutations, renders: r.renders, loaf: r.loaf };
};

// ---------- the scenarios ----------
const box = await p.evaluate(() => { const r = document.querySelector('.phc-grid-scroll').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
const mid = { x: box.x + box.w / 2, y: box.y + box.h / 2 };
const OFF = { x: 4, y: 880 };
const farAway = async () => { await p.mouse.move(OFF.x, OFF.y); for (let i = 0; i < 6; i++) { await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowDown'); } await settle(); await pause(250); };
const sweep = async (ms) => {
  // back and forth across the middle of the map, a tile about every 30 ms (a quick but ordinary hand)
  const t0 = Date.now(); let dir = 1, x = box.x + 40;
  while (Date.now() - t0 < ms) {
    const nx = dir > 0 ? box.x + box.w - 60 : box.x + 40;
    await p.mouse.move(nx, mid.y + (dir > 0 ? 20 : -20), { steps: 14 });
    dir = -dir; x = nx;
  }
};
async function glide(pointerOnMap) {
  await farAway();
  if (pointerOnMap) await p.mouse.move(mid.x, mid.y);
  await pause(150);
  await start();
  await p.keyboard.press('Home');
  await p.waitForFunction(() => window.__phcCamera().gliding, null, { timeout: 3000, polling: 10 }).catch(() => {});
  await settle(); await pause(100);
  const r = await stop();
  await p.mouse.move(OFF.x, OFF.y);
  return r;
}
let walkFlip = 1;
async function walk() {
  await p.mouse.move(OFF.x, OFF.y); await p.keyboard.press('Home'); await settle();
  g = await G();
  const me = g.combat.units.find((u) => u.side === 'pc'); const [mx, my] = me.pos.split(',').map(Number);
  await act({ type: 'sandbox/refill', charId: cid });
  // five tiles along the row, alternately right and left, to a free tile
  let to = null;
  for (let d = 5; d >= 2 && !to; d--) { const k = (mx + walkFlip * d) + ',' + my; if (mx + walkFlip * d >= 0 && mx + walkFlip * d < 26 && !g.combat.units.some((u) => u.pos === k && !u.dead)) to = k; }
  walkFlip = -walkFlip;
  await p.mouse.move(mid.x, mid.y);
  await start();
  const err = await act({ type: 'combat/move', unitId: me.id, to });
  const sw = sweep(1800);
  await sw; await fxIdle(); await settle(); await pause(100);
  const r = await stop();
  await p.mouse.move(OFF.x, OFF.y);
  if (err) r.err = err;
  return r;
}
async function still() {
  await p.mouse.move(OFF.x, OFF.y); await settle(); await pause(200);
  await p.mouse.move(mid.x, mid.y);
  await start(); await sweep(1800); await pause(100);
  const r = await stop(); await p.mouse.move(OFF.x, OFF.y); return r;
}
const SC = { a: ['a  glide, pointer off the map', () => glide(false)], b: ['b  glide, pointer resting on the map', () => glide(true)], c: ['c  unit walks, pointer sweeping', walk], d: ['d  pointer sweeping, nothing moving', still] };
const out = {};
for (const rate of RATES) {
  await cdp.send('Emulation.setCPUThrottlingRate', { rate });
  for (const s of ONLY.split('')) {
    const all = [];
    for (let i = 0; i < RUNS; i++) all.push(await SC[s][1]());
    const add = (f) => all.reduce((a, r) => a + f(r), 0);
    const merged = { frames: all.flatMap((r) => r.frames.slice(1)), enters: add((r) => r.enters), mutations: add((r) => r.mutations), renders: add((r) => r.renders),
      loaf: { n: add((r) => r.loaf.n), ms: Math.round(add((r) => r.loaf.ms)), script: Math.round(add((r) => r.loaf.script)), forced: Math.round(add((r) => r.loaf.forced)), layout: Math.round(add((r) => r.loaf.layout)) } };
    merged.frames.unshift(0);
    const st = stats(merged); out[rate + 'x ' + s] = st;
    if (process.env.TOP) for (const r of all) for (const l of r.top || []) console.log('      ' + l);
    console.log(`${rate}x  ${SC[s][0].padEnd(40)} frames ${String(st.n).padStart(4)}  mean ${String(st.mean).padStart(5)} ms  worst ${String(st.worst).padStart(6)} ms  >16.7 ${String(st.over16).padStart(4)}  >33 ${String(st.over33).padStart(4)}  tiles entered ${st.enters}  screen renders ${st.renders}  grid mutations ${st.mutations}  | long frames ${st.loaf.n}: ${st.loaf.ms} ms (script ${st.loaf.script}, forced layout ${st.loaf.forced}, style+layout ${st.loaf.layout})${all.some((r) => r.err) ? '  (move refused: ' + all.find((r) => r.err).err + ')' : ''}`);
  }
}
if (PROFILE) {
  const which = opt('--profile-scenario', 'c');
  await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
  await cdp.send('Profiler.start');
  for (let i = 0; i < 2; i++) await SC[which][1]();
  const { profile } = await cdp.send('Profiler.stop');
  writeFileSync(PROFILE, JSON.stringify(profile));
  // self time by function (url:line)
  const self = new Map(), byId = new Map(profile.nodes.map((n) => [n.id, n]));
  const dt = profile.timeDeltas; let total = 0;
  profile.samples.forEach((id, i) => { const n = byId.get(id), f = n.callFrame, key = (f.functionName || '(anon)') + ' ' + (f.url.split('/').pop() || '') + ':' + f.lineNumber; const d = dt[i] || 0; total += d; self.set(key, (self.get(key) || 0) + d); });
  const top = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30);
  console.log(`\nprofile of scenario ${which} (self time, ${(total / 1000).toFixed(0)} ms sampled):`);
  for (const [k, v] of top) console.log(`  ${(v / total * 100).toFixed(1).padStart(5)}%  ${k}`);
}
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
console.log(JSON.stringify(out));
await browser.close();

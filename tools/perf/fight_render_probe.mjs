// The fight screen's render-cost probe (the outside code review's performance work). NOT a pass/fail suite: it counts.
// It opens the Proving Ground's fight with a wave on it (enemy AI off), then, for each scenario, counts how many times
// each part of the page rendered (window.__phcRenders: the app shell and every overlay App.tsx draws; the combat screen
// itself: window.__phcRenderCount; the map's memo items: window.__phcMemoWhy) and the main thread's script time
// (CDP Performance.getMetrics ScriptDuration):
//   toast   five store changes that are not the game (a toast each): the screen must render, the overlays need not
//   hover   the pointer sweeps across the map (the screen's own state; the store does not change)
//   move    your unit walks to a tile five times (five game changes and their effects)
//   enemy   the enemy AI on, End turn, until it is your turn again (the most game changes in a row)
//
//   node tools/perf/fight_render_probe.mjs --base http://127.0.0.1:8802 [--foes 8] [--rate 1]
//
// Needs a built game served at --base (python tools/e2e.py serves one; or npm run build and wrangler dev).
import { createRequire } from 'module';
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const { chromium } = require('playwright');

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const BASE = opt('--base', 'http://127.0.0.1:8787');
const RATE = Number(opt('--rate', '1'));
const FOES = Number(opt('--foes', '8'));

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await ctx.addInitScript(() => { try { localStorage.setItem('phc.voice', JSON.stringify({ auto: false })); localStorage.setItem('phc.tips', '["*"]'); sessionStorage.setItem('phc.pressedAnyKey', '1'); localStorage.setItem('phc.combatSpeed', '4'); } catch { /* */ } });
const p = await ctx.newPage();
const cdp = await ctx.newCDPSession(p);
await cdp.send('Performance.enable');
const pause = (ms) => p.evaluate((ms) => new Promise((r) => setTimeout(r, ms)), ms);
const act = (a) => p.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
const G = () => p.evaluate(() => window.__phc.getState().game);
const fxIdle = () => p.waitForFunction(() => { const d = window.__phcFxDebug?.(); return !d || !(d.timers > 0 || d.queueEndIn > 0 || d.heldBehindGate); }, null, { timeout: 30000, polling: 50 }).catch(() => {});

await p.goto(BASE);
await p.getByRole('button', { name: 'PROVING GROUND' }).first().click({ timeout: 90000 });
const nm = p.getByPlaceholder('Leon');
await Promise.race([nm.waitFor({ timeout: 20000 }).catch(() => {}), p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 20000 }).catch(() => {})]);
if (await nm.count()) { await nm.fill('Leon'); await p.getByRole('button', { name: 'Solo ›' }).first().click(); }
await p.waitForFunction(() => window.__phc.getState().game?.sandbox?.state === 'ready', null, { timeout: 30000 });
let g = await G(); const cid = Object.keys(g.characters)[0];
await act({ type: 'sandbox/ai', on: false });
await act({ type: 'sandbox/fight' });
await p.waitForFunction(() => window.__phc.getState().screen === 'combat', null, { timeout: 30000 });
await pause(2600);
for (let i = 0; i < 4 && (await p.locator('[data-phc-cutin]').count()); i++) { await p.keyboard.press('Escape'); await pause(450); }
const foes = async () => (await G()).combat.units.filter((u) => u.side === 'foe' && !u.dead).length;
for (let y = 2; y < 25 && (await foes()) < FOES; y += 3) for (let x = 2; x < 25 && (await foes()) < FOES; x += 4) await act({ type: 'sandbox/spawn', tier: 'soldier', weapon: 'hellraiser_service_rifle', at: x + ',' + y });
await fxIdle(); await pause(800);

const metric = async () => { const { metrics } = await cdp.send('Performance.getMetrics'); return (metrics.find((m) => m.name === 'ScriptDuration')?.value || 0) * 1000; };
const snap = () => p.evaluate(() => ({ parts: { ...(window.__phcRenders || {}) }, screen: window.__phcRenderCount || 0, screenMs: window.__phcRenderMs || 0, items: window.__phcMemoWhy ? window.__phcMemoWhy().renders : 0 }));
// --profile toast|hover|move|enemy: a CPU profile of that scenario while it is measured, the heaviest functions by self
// and total time (build with --minify false for readable names: npx vite build --minify false).
const PROF = opt('--profile', '');
async function profiled(run) {
  await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 200 }); await cdp.send('Profiler.start');
  const n = await run();
  const { profile } = await cdp.send('Profiler.stop');
  const byId = new Map(profile.nodes.map((x) => [x.id, x])), parent = new Map();
  for (const x of profile.nodes) for (const c of x.children || []) parent.set(c, x.id);
  const name = (x) => (x.callFrame.functionName || '(anon)') + ' ' + (x.callFrame.url.split('/').pop() || '') + ':' + x.callFrame.lineNumber;
  const self = new Map(), total = new Map();
  profile.samples.forEach((id, i) => { const d = profile.timeDeltas[i] || 0; const x = byId.get(id); self.set(name(x), (self.get(name(x)) || 0) + d);
    const seen = new Set(); for (let y = id; y != null; y = parent.get(y)) { const k = name(byId.get(y)); if (seen.has(k)) continue; seen.add(k); total.set(k, (total.get(k) || 0) + d); } });
  const top = (m) => [...m.entries()].filter(([k]) => !/^\((idle|root|program)\)/.test(k)).sort((a, b) => b[1] - a[1]).slice(0, 40).map(([k, v]) => (v / 1000).toFixed(0).padStart(6) + ' ms  ' + k).join('\n');
  console.log('self:\n' + top(self) + '\ntotal:\n' + top(total));
  return n;
}
async function measure(name, run) {
  const s0 = await snap(), m0 = await metric();
  const n = PROF === name ? await profiled(run) : await run();
  const s1 = await snap(), m1 = await metric();
  const parts = {}; for (const k of new Set([...Object.keys(s0.parts), ...Object.keys(s1.parts)])) { const d = (s1.parts[k] || 0) - (s0.parts[k] || 0); if (d) parts[k] = d; }
  const over = Object.entries(parts).filter(([k]) => k !== 'App').reduce((a, [, v]) => a + v, 0);
  const r = { scenario: name, events: n, app: parts.App || 0, screen: s1.screen - s0.screen, screenMs: Math.round(s1.screenMs - s0.screenMs), overlays: over, items: s1.items - s0.items, scriptMs: Math.round(m1 - m0), parts };
  console.log(`${name.padEnd(6)} events ${String(n).padStart(3)}  app ${String(r.app).padStart(4)}  screen ${String(r.screen).padStart(4)} (${String(r.screenMs).padStart(5)} ms)  overlay renders ${String(over).padStart(5)}  map items ${String(r.items).padStart(6)}  script ${String(r.scriptMs).padStart(6)} ms`);
  return r;
}
await cdp.send('Emulation.setCPUThrottlingRate', { rate: RATE });
const out = [];
out.push(await measure('toast', async () => { for (let i = 0; i < 5; i++) { await p.evaluate((i) => window.__phc.toast?.('Probe ' + i, true), i); await pause(120); } return 5; }));
const box = await p.evaluate(() => { const r = document.querySelector('.phc-grid-scroll').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
out.push(await measure('hover', async () => { for (let k = 0; k < 4; k++) await p.mouse.move(k % 2 ? box.x + 40 : box.x + box.w - 60, box.y + box.h / 2 + (k % 2 ? 20 : -20), { steps: 20 }); await p.mouse.move(4, 880); return 80; }));
out.push(await measure('move', async () => {
  let n = 0;
  for (let i = 0; i < 5; i++) {
    g = await G(); const me = g.combat.units.find((u) => u.side === 'pc'); const [mx, my] = me.pos.split(',').map(Number);
    await act({ type: 'sandbox/refill', charId: cid });
    const dir = i % 2 ? -1 : 1; let to = null;
    for (let d = 3; d >= 1 && !to; d--) { const k = (mx + dir * d) + ',' + my; if (mx + dir * d >= 0 && mx + dir * d < 26 && !g.combat.units.some((u) => u.pos === k && !u.dead)) to = k; }
    if (to && !(await act({ type: 'combat/move', unitId: me.id, to }))) n++;
    await fxIdle(); await pause(100);
  }
  return n;
}));
out.push(await measure('enemy', async () => {
  await act({ type: 'sandbox/ai', on: true });
  const v0 = (await G()).v;
  g = await G(); const me = g.combat.units.find((u) => u.side === 'pc');
  await act({ type: 'combat/end-turn', unitId: me.id });
  await p.waitForFunction((id) => { const c = window.__phc.getState().game?.combat; return !c || c.over || (c.order?.[c.turn] === id); }, me.id, { timeout: 60000, polling: 100 }).catch(() => {});
  await fxIdle(); await pause(300);
  return (await G()).v - v0;
}));
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
console.log(JSON.stringify(out));
await browser.close();

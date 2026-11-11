import { chromium, click, BASE } from './lib.mjs';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await ctx.addInitScript(() => { try { localStorage.setItem('phc.voice', JSON.stringify({ auto: false })); localStorage.setItem('phc.tips', '["*"]'); sessionStorage.setItem('phc.pressedAnyKey', '1'); } catch { } });
const p = await ctx.newPage(); const act = (a) => p.evaluate((a) => window.__phc.act(a), a); const G = () => p.evaluate(() => window.__phc.getState().game);
const ref = (k) => { const [x, y] = k.split(',').map(Number); return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[x] + (y + 1); };
await p.goto(BASE); await click(p, 'PROVING GROUND', { timeout: 90000 }); const nm = p.getByPlaceholder('Leon'); await nm.waitFor({ timeout: 8000 }).catch(() => {}); if (await nm.count()) { await nm.fill('Leon'); await click(p, 'Solo ›'); }
await p.waitForFunction(() => window.__phc.getState().game?.sandbox?.state === 'ready', null, { timeout: 15000 });
let g = await G(); const cid = Object.keys(g.characters)[0];
await act({ type: 'sandbox/skill', charId: cid, skill: 'durability', points: 10 }); await act({ type: 'sandbox/level', charId: cid, level: 12 }); await act({ type: 'sandbox/ai', on: false }); await act({ type: 'sandbox/fight' });
await p.waitForFunction(() => window.__phc.getState().screen === 'combat', null, { timeout: 15000 }); await p.waitForTimeout(3000); for (let i = 0; i < 3; i++) { await p.keyboard.press('Escape'); await p.waitForTimeout(300); }
await act({ type: 'sandbox/clear' }); await act({ type: 'sandbox/ai', on: true });
g = await G(); const me = g.combat.units.find((u) => u.side === 'pc'), [x, y] = me.pos.split(',').map(Number);
for (const [dx, dy] of [[3, 0], [3, 2], [3, -2], [5, 1], [5, -1]]) await act({ type: 'sandbox/spawn', tier: 'soldier', weapon: 'hellraiser_service_rifle', at: ref((x + dx) + ',' + (y + dy)) });
await p.waitForTimeout(800);
const cdp = await ctx.newCDPSession(p); await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 500 }); await cdp.send('Profiler.start');
await p.evaluate((id) => window.__phc.act({ type: 'combat/end-turn', unitId: id }), me.id); await p.waitForTimeout(600);
const { profile } = await cdp.send('Profiler.stop');
const self = new Map(); const dt = profile.timeDeltas, byId = new Map(profile.nodes.map((n) => [n.id, n]));
profile.samples.forEach((id, i) => { const n = byId.get(id), k = n.callFrame.functionName + ' ' + (n.callFrame.url.split('/').pop() || '') + ':' + n.callFrame.lineNumber; self.set(k, (self.get(k) || 0) + (dt[i] || 0) / 1000); });
console.log([...self].sort((a, b) => b[1] - a[1]).slice(0, 28).map(([k, v]) => v.toFixed(0).padStart(5) + ' ms  ' + k).join('\n'));
await browser.close();

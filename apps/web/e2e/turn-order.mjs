// A long enemy phase (Leon, 11 Nov 2026): every hostile's moves play in full and in order, the player's HP falls when a
// hit plays (never ahead of it), and YOUR TURN comes only after the last hostile effect has played.
import { chromium, player, click, BASE } from './lib.mjs';
const browser = await chromium.launch(); const p = await player(browser, 'host');
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const errors = []; p.on('pageerror', (e) => errors.push(String(e.message || e)));
const G = () => p.evaluate(() => window.__phc.getState().game);
const act = (a) => p.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
const ref = (k) => { const [x, y] = k.split(',').map(Number); return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[x] + (y + 1); };
await p.goto(BASE); await click(p, 'PROVING GROUND');
const nm = p.getByPlaceholder('Leon');
await Promise.race([nm.waitFor({ timeout: 8000 }).catch(() => {}), p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 8000 }).catch(() => {})]);
if (await nm.count()) { await nm.fill('Leon'); await click(p, 'Solo ›'); }
await p.waitForFunction(() => window.__phc.getState().game?.sandbox?.state === 'ready', null, { timeout: 15000 });
let g = await G(); const cid = Object.keys(g.characters)[0];
await act({ type: 'sandbox/skill', charId: cid, skill: 'durability', points: 10 }); await act({ type: 'sandbox/level', charId: cid, level: 12 });
await act({ type: 'sandbox/fight' });
await p.waitForFunction(() => window.__phc.getState().game?.phase === 'combat', null, { timeout: 15000 });
await p.waitForSelector('text=YOUR TURN', { timeout: 15000 }); await p.waitForTimeout(1800);
for (let i = 0; i < 3; i++) { if (await p.locator('[data-phc-cutin]').count()) { await p.mouse.click(1430, 990); await p.waitForTimeout(350); } }
await act({ type: 'sandbox/clear' }); await act({ type: 'sandbox/ai', on: true });
g = await G(); const me = g.combat.units.find((u) => u.side === 'pc'), [x, y] = me.pos.split(',').map(Number);
// five soldiers with rifles in a ring a few tiles off: a long hostile phase
for (const [dx, dy] of [[3, 0], [3, 2], [3, -2], [5, 1], [5, -1]]) await act({ type: 'sandbox/spawn', tier: 'soldier', weapon: 'hellraiser_service_rifle', at: ref((x + dx) + ',' + (y + dy)), level: 1 }); // level 1 against a level 12: the squad must live through the phase (rules 1.15 enemies scale by level)
g = await G(); ok('the hostiles stand ready (' + g.combat.units.filter((u) => u.side === 'foe' && !u.dead).length + ')', g.combat.units.filter((u) => u.side === 'foe' && !u.dead).length >= 4);
await p.waitForTimeout(600);
const res = await p.evaluate(async (meId) => {
  const t0 = performance.now(), fx = [], rows = [];
  const on = (ev) => { const d = ev.detail; if (d && d.n) fx.push({ t: Math.round(performance.now() - t0), n: d.n, k: d.k, unit: d.unit, target: d.target, hp: d.hp ? d.hp[meId] : null }); };
  window.addEventListener('phc-fx', on);
  let bannerAt = null; const onTurn = (ev) => { if (ev.detail && ev.detail.mine && bannerAt == null && fx.some((e) => e.k === 'turn' && e.unit !== meId)) bannerAt = Math.round(performance.now() - t0); };
  /* a banner left over from the set-up (before any hostile's turn) doesn't count */ window.addEventListener('phc:turn-shown', onTurn);
  const st0 = window.__phc.getState().game.combat.units.find((u) => u.id === meId).hp;
  window.__phc.act({ type: 'combat/end-turn', unitId: meId });
  let mineAt = null, lastState = null;
  while (performance.now() - t0 < 90000) {
    const s = window.__phc.getState().game.combat, u = s.units.find((v) => v.id === meId);
    const card = document.querySelector('.phc-me-mini'), lab = card ? card.getAttribute('aria-label') || '' : '', m = /HP (\d+)/.exec(lab), shown = m ? Number(m[1]) : null;
    const yt = document.querySelector('.phc-yt'), banner = bannerAt != null, panelMine = !!yt && yt.getBoundingClientRect().width > 0;
    const logN = document.querySelectorAll('.phc-cb-logscroll > *').length;
    const row = { t: Math.round(performance.now() - t0), real: u.hp, shown, logN, your: !!banner, panelMine, turn: s.order[s.turn] };
    const key = JSON.stringify([row.real, row.shown, row.logN, row.your, row.panelMine]); if (key !== lastState) { rows.push(row); lastState = key; }
    if (banner && mineAt == null) { mineAt = bannerAt; }
    if (mineAt != null && performance.now() - t0 > mineAt + 1500) break;
    await new Promise((r) => setTimeout(r, 50));
  }
  window.removeEventListener('phc-fx', on); window.removeEventListener('phc:turn-shown', onTurn);
  return { st0, fx, rows, mineAt, total: window.__phc.getState().game.combat.log.length };
}, me.id);
const foeFx = res.fx.filter((e) => e.k !== 'turn' || true), lastHostile = res.fx.filter((e) => e.k === 'shot' || e.k === 'hurt' || e.k === 'move').at(-1);
const turns = res.fx.filter((e) => e.k === 'turn');
console.log('note ' + res.fx.length + ' effects over ' + (res.fx.at(-1)?.t || 0) + ' ms; turn banners at ' + turns.map((e) => e.unit + '@' + e.t).join(' ') + '; YOUR TURN shown at ' + res.mineAt + ' ms; last hostile effect at ' + (lastHostile && lastHostile.t));
ok('the hostile phase takes its time (' + (res.fx.at(-1)?.t || 0) + ' ms of effects)', (res.fx.at(-1)?.t || 0) > 4000);
ok('every effect plays in order (' + res.fx.length + ')', res.fx.every((e, i) => i === 0 || e.n > res.fx[i - 1].n));
ok('YOUR TURN comes after the last hostile effect (' + res.mineAt + ' ≥ ' + (lastHostile && lastHostile.t) + ')', res.mineAt != null && !!lastHostile && res.mineAt >= lastHostile.t);
// HP on the card never runs ahead of the hits: at any moment, shown ≥ the HP after the hits that have played so far
const hits = res.fx.filter((e) => e.hp);
let ahead = null; for (const r of res.rows) { if (r.shown == null) continue; const played = hits.filter((h) => h.t <= r.t + 300).at(-1); const floor = played ? played.hp[1] : res.st0; if (r.shown < floor) { ahead = { row: r, floor }; break; } }
ok('the HP shown never falls before its hit plays' + (ahead ? ' (' + JSON.stringify(ahead) + ')' : '') + '; real HP fell at once to ' + res.rows[1]?.real + ', shown started at ' + res.rows[0]?.shown, !ahead && hits.length > 0);
// (From the first hostile shot, wound or walk on: the panel leaves about a quarter of a second after the first
// hostile's banner, which on the 26 x 26 map's heavier screen lands at 290 to 360 ms after End turn; the fixed 300 ms
// this check allowed before sat right on that edge and failed every other run. No hostile act plays before 500 ms.)
{ const firstAct = res.fx.find((e) => e.k === 'shot' || e.k === 'hurt' || e.k === 'move');
  const early = res.rows.find((r) => r.panelMine && lastHostile && firstAct && r.t < lastHostile.t && r.t >= firstAct.t);
  ok('the YOUR TURN panel is not up while hostile effects still play' + (early ? ' (up at ' + early.t + ' ms)' : ''), !early); }
ok('the HP shown ends on the real HP (' + res.rows.at(-1)?.shown + ' = ' + res.rows.at(-1)?.real + ')', res.rows.at(-1)?.shown === res.rows.at(-1)?.real);
const logSteps = new Set(res.rows.map((r) => r.logN)).size;
ok('the log fills in steps as the effects play (' + logSteps + ' steps)', logSteps >= 4);
ok('no page errors: ' + errors.join(' | ').slice(0, 300), errors.length === 0);
if (process.env.DEBUG) console.log(JSON.stringify(res.rows).slice(0, 3000));
await browser.close();

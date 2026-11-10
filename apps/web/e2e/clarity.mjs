// Combat clarity (0.16; Leon, 9 Nov 2026): the floating ♪ / ◈ buttons slide to a tab and back and never show together
// out; in a Proving Ground fight a hostile walking out of the fog walks in from the fog edge (not popping in) with one
// gentle "!", a Hidden hostile is revealed with its shimmer, and an Overwatch shot is its own beat: the mover stops on
// the tile it is shot on, OVERWATCH shows over the watcher, the shot plays, and the turn hold (window.__phcHold) lets go.
// Runs at Normal and at Fast combat speed. SHOTS=<dir>: frame sequences of each moment (deviceScaleFactor 1).
import { chromium, player, click, BASE, autoConfirm } from './lib.mjs';
import fs from 'fs';
const SHOTS = process.env.SHOTS || '';
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const browser = await chromium.launch();

/** Frames: n screenshots, gap ms apart (a screenshot itself takes a while: the gaps are rough). */
async function frames(p, name, n, gap, clip) {
  if (!SHOTS) return;
  for (let i = 0; i < n; i++) { await p.screenshot({ path: SHOTS + '/' + name + '-' + String(i).padStart(2, '0') + '.png', ...(clip ? { clip } : {}) }); if (gap) await p.waitForTimeout(gap); }
}
/** Frames while the other turns play (until the turn hold lets go): a burst of frames from each moment worth seeing
 *  (a walk out of the fog, a reveal, a sprung Overwatch), of the grid only. */
async function framesWhile(p, name, max = 400) {
  if (!SHOTS) return;
  const clip = { x: 30, y: 280, width: 900, height: 700 };
  let done = 0, seq = 0;
  for (let i = 0; i < max; i++) {
    const m = await p.evaluate(() => (window.__clarMarks || []).slice()).catch(() => []);
    if (m.length > done) {
      const mk = m[done]; done = m.length; seq++;
      for (let f = 0; f < 9; f++) await p.screenshot({ path: SHOTS + '/' + name + '-' + seq + '-' + mk + '-' + f + '.png', clip, timeout: 5000 }).catch(() => {});
      continue;
    }
    if (i > 4 && await p.evaluate(() => (window.__phcHold ? window.__phcHold() <= performance.now() : true))) break;
    await p.waitForTimeout(25);
  }
}
/** Watch the effects layer: every walker, "!", tag and floating word added, with when (performance.now()). */
const WATCH = () => {
  const out = (window.__clar = { walkers: [], bangs: [], tags: [], words: [] });
  const seen = new WeakSet();
  const look = (n) => {
    if (!(n instanceof HTMLElement) || seen.has(n)) return; seen.add(n);
    const t = performance.now();
    const w = n.matches('[data-phc-walker]') ? n : null;
    if (w) { let ops = []; try { ops = w.getAnimations().flatMap((a) => a.effect.getKeyframes().map((k) => k.opacity)).filter((x) => x !== undefined); } catch { /* */ } out.walkers.push({ unit: w.getAttribute('data-phc-walker'), t, ops: ops.map(Number) }); }
    const b = n.querySelector('[data-phc-bang]') || (n.matches('[data-phc-bang]') ? n : null); if (b) out.bangs.push({ t, kind: b.getAttribute('data-phc-bang'), x: n.getBoundingClientRect().left, y: n.getBoundingClientRect().top });
    const tg = n.querySelector('[data-phc-tag]'); if (tg) out.tags.push({ t, text: tg.getAttribute('data-phc-tag'), walkers: [...document.querySelectorAll('[data-phc-walker]')].map((x) => x.getAttribute('data-phc-walker')) });
    const tx = (n.textContent || '').trim(); if (/^(REVEALED|HIDDEN)$/.test(tx)) out.words.push({ t, text: tx });
  };
  window.__clarMarks = [];
  window.addEventListener('phc-fx', (ev) => { const e = ev.detail || {}; const k = e.k === 'move' && e.sight && /^0+1/.test(e.sight.pc || '') ? 'fogwalk' : e.k === 'sight' && e.how === 'reveal' ? 'reveal' : e.k === 'sight' && e.how === 'lost' ? 'lost' : e.k === 'overwatch' ? 'overwatch' : ''; if (k) window.__clarMarks.push(k); });
  const layer = document.querySelector('.phc-fx-layer');
  new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) look(n); }).observe(layer, { childList: true, subtree: true });
};
const holdFree = (p, ms = 20000) => p.waitForFunction(() => (window.__phcHold ? window.__phcHold() <= performance.now() : true), null, { timeout: ms }).then(() => true, () => false);

async function run(speed) {
  const p = await player(browser, 'host-' + speed);
  await p.addInitScript((s) => { try { localStorage.setItem('phc.combatSpeed', s); localStorage.setItem('phc.e2e', '1'); } catch { /* */ } }, speed); // phc.e2e: the sight hooks (fx/sight.ts)
  await autoConfirm(p);
  const G = () => p.evaluate(() => window.__phc.getState().game);
  const act = (a) => p.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
  const ref = (k) => { const [x, y] = k.split(',').map(Number); return 'ABCDEFGHIJKLMNOP'[x] + (y + 1); };
  console.log('--- combat speed: ' + speed);
  await p.goto(BASE);
  await click(p, 'PROVING GROUND');
  const nm = p.getByPlaceholder('Leon');
  await Promise.race([nm.waitFor({ timeout: 8000 }).catch(() => {}), p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 8000 }).catch(() => {})]);
  if (await nm.count()) { await nm.fill('Leon'); await click(p, 'Solo ›'); }
  await p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 15000 });
  await p.waitForSelector('[data-phc-float="music"]', { timeout: 15000 });
  ok('combat speed is ' + speed, (await p.evaluate(() => window.__phcCombatSpeed.get())) === speed);

  // (a) The floating buttons: tucked to a tab at rest, out when the pointer comes near; one out hides the other.
  const place = (k) => p.locator('[data-phc-float="' + k + '"]').getAttribute('data-phc-float-place');
  const ty = (k) => p.locator('[data-phc-float="' + k + '"]').evaluate((b) => new DOMMatrix(getComputedStyle(b).transform).m42);
  if (speed === 'normal') {
    await p.mouse.move(900, 300); await p.waitForTimeout(500);
    ok('at rest both are tucked to a tab (' + await place('music') + ' ' + Math.round(await ty('music')) + ' px, ' + await place('memory') + ')', (await place('music')) === 'tucked' && (await place('memory')) === 'tucked' && (await ty('music')) > 20);
    const vis = await p.locator('[data-phc-float="music"]').evaluate((b) => { const r = b.getBoundingClientRect(); return Math.round(innerHeight - r.top); });
    ok('…a tab still shows at the edge (' + vis + ' px)', vis >= 12 && vis <= 30);
    await frames(p, 'buttons-rest', 1, 0, { x: 0, y: 860, width: 420, height: 140 });
    await p.mouse.move(60, 900);
    const fr = frames(p, 'buttons-slide', 5, 30, { x: 0, y: 860, width: 420, height: 140 });
    await p.waitForTimeout(400); await fr;
    ok('the pointer near: they slide out (' + await place('music') + ', ' + Math.round(await ty('music')) + ' px)', (await place('music')) === 'out' && Math.abs(await ty('music')) < 1);
    const mb = await p.locator('[data-phc-float="music"]').boundingBox();
    await p.mouse.move(mb.x + mb.width / 2, mb.y + mb.height / 2); await p.waitForTimeout(450);
    ok('hovering ♪ shows the song and the ◈ slides away (' + await place('memory') + ')', (await place('memory')) === 'away' && Number(await p.locator('[data-phc-float="memory"]').evaluate((b) => getComputedStyle(b).opacity)) < 0.05);
    await frames(p, 'buttons-music-out', 1, 0, { x: 0, y: 860, width: 420, height: 140 });
    await p.locator('[data-phc-float="music"]').click(); await p.waitForTimeout(400);
    ok('the music panel open: the ◈ stays away', (await p.locator('div[role="dialog"][aria-label="Music"][aria-hidden="false"]').count()) === 1 && (await place('memory')) === 'away');
    await frames(p, 'buttons-music-panel', 1, 0);
    await p.locator('[data-phc-float="music"]').click(); await p.mouse.move(300, 700); await p.mouse.move(60, 900); await p.waitForTimeout(450);
    ok('closed: the ◈ is back', (await place('memory')) === 'out');
    await p.locator('[data-phc-float="memory"]').click(); await p.waitForTimeout(450);
    ok('the memory open: its dialog shows and the ♪ is away, its panel shut', (await p.locator('div[role="dialog"][aria-label="The Narrator\'s memory"]').count()) === 1 && (await place('music')) === 'away' && (await p.locator('div[role="dialog"][aria-label="Music"][aria-hidden="false"]').count()) === 0);
    await frames(p, 'buttons-memory-open', 1, 0);
    await p.getByRole('button', { name: 'Close', exact: true }).first().click(); await p.waitForTimeout(400);
    await p.mouse.move(900, 300); await p.waitForTimeout(500);
    ok('closed again, both tuck away at rest', (await place('music')) === 'tucked' && (await place('memory')) === 'tucked');
  }

  // Set the stage while gearing up: a Hidden hostile right next to the recruit (the reveal), then the fight.
  let g = await G();
  const me = Object.values(g.characters)[0], at = g.story.positions[me.id], [x, y] = at.split(',').map(Number);
  const taken = new Set([...Object.values(g.story.positions), ...(g.story.npcs || []).map((n) => n.pos)]);
  const next = [[1, 0], [1, 1], [1, -1], [0, 1], [0, -1]].map(([dx, dy]) => (x + dx) + ',' + (y + dy)).find((k) => !taken.has(k) && +k.split(',')[1] >= 0);
  ok('placed a Hidden hostile at ' + ref(next), (await act({ type: 'sandbox/npc', name: 'Lurker', side: 'hostile', tier: 'minion', weapon: 'fists', at: ref(next), hidden: true })) === null);
  await p.evaluate(() => { window.__phc.go && 0; });
  await p.evaluate(WATCH);
  const t0 = await p.evaluate(() => performance.now());
  ok('the fight starts', (await act({ type: 'sandbox/fight' })) === null);
  await p.waitForFunction(() => window.__phc.getState().screen === 'combat', null, { timeout: 10000 });
  // The opening: the drill units walk in from the far side, some of it in the blockhouse's shadow.
  // The opening waits for the combat-in transition, then plays (the turn hold counts from then).
  await p.waitForFunction(() => !document.querySelector('.phc-combat-in') && (window.__phcCombatTempo().fx || []).length > 0, null, { timeout: 8000 }).catch(() => {});
  const fr1 = framesWhile(p, 'fog-' + speed);
  ok('the opening plays out (hold lets go)', await holdFree(p));
  await fr1;
  await p.waitForTimeout(600);
  if (process.env.DEBUG) console.log('played:', JSON.stringify((await p.evaluate(() => window.__phcCombatTempo().fx)).map((x) => x.n + x.k)), 'fx:', JSON.stringify((await G()).combat.fx.map((e) => e.n + e.k + (e.sight ? e.sight.pc : ''))));
  let c = await p.evaluate(() => ({ clar: window.__clar, sight: window.__phcSight }));
  g = await G();
  const opening = (g.combat.fx || []).filter((e) => e.k === 'move' && e.sight && /^0+1/.test(e.sight.pc));
  const enters = c.sight.filter((s) => s.kind === 'enter' && s.at > t0);
  console.log('     the opening: out of the fog: ' + (opening.map((e) => e.unit + ' ' + e.sight.pc).join(', ') || 'nobody this time'));
  ok('…and the screen saw them enter (' + enters.map((s) => s.unit + '@' + ref(s.tile)).join(', ') + ')', opening.every((e) => enters.some((s) => s.unit === e.unit)));
  const w1 = c.clar.walkers.filter((w) => opening.some((e) => e.unit === w.unit));
  ok('they walked in, see-through at the fog edge (' + w1.map((w) => w.unit + ' ' + w.ops.join('')).join(', ') + ')', opening.every((e) => w1.some((w) => w.unit === e.unit && w.ops[0] === 0 && w.ops.at(-1) === 1)));
  const bangsBy = new Map(); for (const s of c.sight.filter((s) => s.bang && s.at > t0)) bangsBy.set(s.unit, (bangsBy.get(s.unit) || 0) + 1);
  ok('one "!" each (' + [...bangsBy].map(([u, n]) => u + '×' + n).join(', ') + '), red ink for a hostile', [...bangsBy.values()].every((n) => n === 1) && c.clar.bangs.every((b) => b.kind === 'hostile') && bangsBy.size === c.clar.bangs.length);

  // (c) The Lurker: still Hidden, or its own turn gave it away (an attack from hiding is a reveal too).
  const lurker = g.combat.units.find((u) => u.name === 'Lurker');
  let me2 = g.combat.units.find((u) => u.side === 'pc');
  // (d) Overwatch: the recruit holds a shot, then ends the turn; a drill unit walking in its sight draws it.
  for (let i = 0; i < 30 && g.combat.order[g.combat.turn] !== me2.id; i++) { await p.waitForTimeout(250); g = await G(); }
  await holdFree(p);
  ok('the recruit\'s turn', g.combat.order[g.combat.turn] === me2.id);
  // (b) again, made sure of: a knife drone dropped into the nearest shadow the recruit can't see (it has to walk out).
  const shade = await p.evaluate(() => [...document.querySelectorAll('button.phc-tok[aria-label]')].map((b) => b.getAttribute('aria-label')).filter((l) => /· open/.test(l) && /out of sight/.test(l)).map((l) => l.split(' ')[0]));
  const toKey = (r) => ('ABCDEFGHIJKLMNOP'.indexOf(r[0])) + ',' + (Number(r.slice(1)) - 1), d = (k) => Math.max(Math.abs(+k.split(',')[0] - +me2.pos.split(',')[0]), Math.abs(+k.split(',')[1] - +me2.pos.split(',')[1]));
  const spot = shade.map(toKey).filter((k) => d(k) >= 3).sort((a, b) => d(a) - d(b))[0];
  if (spot) ok('a knife drone waits in the shadow at ' + ref(spot), (await act({ type: 'sandbox/spawn', tier: 'minion', weapon: 'combat_knife', at: ref(spot), name: 'Shade' })) === null);
  await p.waitForTimeout(300);
  const owErr = await act({ type: 'combat/overwatch', unitId: me2.id, mode: 'shot' });
  ok('the recruit holds a shot on overwatch' + (owErr ? ' (' + owErr + ')' : ''), owErr === null);
  await holdFree(p); await p.waitForTimeout(400);
  const t1 = await p.evaluate(() => performance.now());
  const fr2 = framesWhile(p, 'turn2-' + speed);
  ok('end turn', (await act({ type: 'combat/end-turn', unitId: me2.id })) === null);
  ok('the enemies\' turns play out and the hold lets go', await holdFree(p, 30000));
  await fr2;
  await p.waitForTimeout(600);
  c = await p.evaluate(() => ({ clar: window.__clar, sight: window.__phcSight, ow: window.__phcOverwatch }));
  g = await G();
  if (process.env.DEBUG) console.log((g.combat.fx || []).filter((e) => ['move', 'overwatch', 'shot', 'sight', 'turn', 'down'].includes(e.k)).map((e) => e.n + ' ' + e.k + ' ' + (e.unit || '') + ' ' + (e.path ? e.path.map(ref).join('>') : e.at ? ref(e.at) : '') + (e.sight ? ' ' + e.sight.pc : '') + (e.how ? ' ' + e.how : '')).join('\n'));
  const outOfFog2 = (g.combat.fx || []).filter((e) => e.k === 'move' && e.sight && /^0+1/.test(e.sight.pc) && e.n > (opening.at(-1)?.n || 0));
  const enters2 = c.sight.filter((s) => s.kind === 'enter' && s.at > t1);
  ok('turn 2: walked out of the fog (' + outOfFog2.map((e) => e.unit + ' ' + e.sight.pc).join(', ') + ') and seen to (' + enters2.map((s) => s.unit + '@' + ref(s.tile) + (s.bang ? '!' : '')).join(', ') + ')', outOfFog2.every((e) => enters2.some((s) => s.unit === e.unit)) && (opening.length + outOfFog2.length) > 0);
  const w2 = c.clar.walkers.filter((w) => w.t > t1 && outOfFog2.some((e) => e.unit === w.unit));
  ok('…walking in from the fog edge (' + w2.map((w) => w.unit + ' ' + w.ops.join('')).join(', ') + ')', outOfFog2.every((e) => w2.some((w) => w.unit === e.unit && w.ops[0] === 0)) && (w1.length + w2.length) > 0);
  const b2 = new Map(); for (const s of enters2.filter((s) => s.bang)) b2.set(s.unit, (b2.get(s.unit) || 0) + 1);
  ok('…one "!" each', [...b2.values()].every((n) => n === 1));
  const rv = c.sight.find((s) => s.unit === lurker.id && s.kind === 'reveal');
  const rvFx = (g.combat.fx || []).find((e) => e.k === 'sight' && e.unit === lurker.id && e.how === 'reveal');
  // A reveal in the opening (the Lurker's own attack from hiding) may have left the fight's last 40 events by now.
  ok('the Lurker is revealed with its shimmer: "!" and REVEALED (' + (rv ? ref(rv.tile) : 'none') + (rv && !rvFx ? ', in the opening' : '') + ')', !!rv && (!!rvFx || rv.at < t1) && c.clar.words.some((w) => w.text === 'REVEALED') && !!rv.bang);
  const owFx = (g.combat.fx || []).find((e) => e.k === 'overwatch');
  if (!owFx) ok('an Overwatch was sprung (no drill unit walked into the shot this time)', false);
  else {
    const note = c.ow.find((o) => o.at > t1);
    ok('the Overwatch beat played (' + (note ? note.watcher + ' at ' + note.target + ' on ' + ref(note.tile) + ')' : 'none'), !!note && note.tile === owFx.at);
    const tag = c.clar.tags.find((t) => t.text === 'OVERWATCH' && t.t > t1);
    const downThere = (g.combat.fx || []).some((e) => e.k === 'down' && e.unit === owFx.target && e.at === owFx.at);
    ok('OVERWATCH over the watcher, and the mover stopped on the tile (' + (tag ? 'walkers then: ' + tag.walkers.join(',') : 'no tag') + (downThere ? ', it went down there' : '') + ')', !!tag && (tag.walkers.includes(owFx.target) || downThere));
    const ix = g.combat.fx.indexOf(owFx), nextShot = g.combat.fx.slice(ix + 1).find((e) => e.k === 'shot');
    ok('the shot follows at that tile', !!nextShot && nextShot.to === owFx.at);
  }
  ok('no errors on the page (' + p.errors.slice(0, 3).join(' | ') + ')', p.errors.length === 0);
  await p.context().close();
}

await run('normal');
await run('fast');
await browser.close();

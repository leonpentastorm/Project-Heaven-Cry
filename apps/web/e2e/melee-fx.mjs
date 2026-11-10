// The melee technique effects on screen (fx/melee-techniques.ts; docs/design/handoffs/physical-2.0-A-FX.md), in the
// Proving Ground with the enemy AI off (on only for the two Answers): every technique is used for real through
// combat/technique, and its beat must draw its own element over the grid (data-melee-fx) and be recorded by the test hook
// window.__phcMeleeFx [{ id, kind, at, drawn }]. A technique whose dice didn't give the beat (a miss, a save made) is
// tried again on a fresh turn. The lasting states (a Bind's link, a weapon left in a nailed unit, a raised Guard) must
// stand on the layer (data-melee-mark). Frames for every technique go to SHOTS (deviceScaleFactor 1).
//   node apps/web/e2e/melee-fx.mjs            SHOTS=/some/dir to put the frames elsewhere
import { chromium, player, BASE, OUT } from './lib.mjs';
import { mkdirSync } from 'node:fs';
const SHOTS = (process.env.SHOTS || OUT + 'melee-fx/').replace(/\/?$/, '/');
mkdirSync(SHOTS, { recursive: true });
const browser = await chromium.launch();
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const note = (label) => console.log('note ' + label);

const p = await player(browser, 'host'); // deviceScaleFactor 1 (DSF unset)
await p.setViewportSize({ width: 1440, height: 900 });
const errors = p.errors; p.on('dialog', (d) => d.accept());
const G = () => p.evaluate(() => window.__phc.getState().game);
const act = (a) => p.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
const ref = (k) => { const [x, y] = k.split(',').map(Number); return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[x] + (y + 1); };
const K = (x, y) => x + ',' + y;
const XY = (k) => k.split(',').map(Number);

await p.goto(BASE);
await p.getByRole('button', { name: 'PROVING GROUND' }).first().click();
const nm = p.getByPlaceholder('Leon');
await Promise.race([nm.waitFor({ timeout: 8000 }).catch(() => {}), p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 8000 }).catch(() => {})]);
if (await nm.count()) { await nm.fill('Leon'); await p.getByRole('button', { name: 'Solo ›' }).first().click(); }
await p.waitForFunction(() => window.__phc.getState().game?.sandbox?.state === 'ready', null, { timeout: 15000 });
let g = await G();
const cid = Object.keys(g.characters)[0];
await act({ type: 'sandbox/ai', on: false });
for (const sk of ['athletics', 'dexterity', 'raw_power', 'endurance', 'agility']) await act({ type: 'sandbox/skill', charId: cid, skill: sk, points: 10 });
await act({ type: 'sandbox/technique', charId: cid, id: 'all', ready: true });
await act({ type: 'sandbox/give', charId: cid, item: 'sabre', equip: true });
await act({ type: 'sandbox/fight' });
await p.waitForFunction(() => window.__phc.getState().game?.phase === 'combat', null, { timeout: 15000 });
await p.waitForFunction(() => window.__phc.getState().screen === 'combat', null, { timeout: 8000 }).catch(() => {});

const me = async () => (await G()).combat.units.find((u) => u.charId === cid);
const idle = () => p.waitForFunction(() => (window.__phcHold ? window.__phcHold() : 0) <= performance.now() + 30, null, { timeout: 15000 }).catch(() => {});
const myTurn = () => p.waitForFunction((id) => { const cb = window.__phc.getState().game?.combat; const u = cb && cb.units.find((x) => x.id === cb.order[cb.turn]); return !!u && u.charId === id && u.ap >= 6; }, cid, { timeout: 45000 }).catch(() => {});
const dismissCut = async () => { for (let i = 0; i < 3 && (await p.locator('[data-phc-cutin]').count()); i++) { await p.mouse.click(1430, 890); await p.waitForTimeout(350); } };
const closeTools = async () => { const tools = p.locator('aside[aria-label="Proving Ground tools"]').first(); if (await tools.count()) await tools.getByRole('button', { name: /^Close the tools/ }).first().click().catch(() => {}); };
/** A fresh turn with a full 6 AP on a clear field (a fight cleared ends: another starts). */
async function freshTurn() {
  await act({ type: 'sandbox/refill', charId: cid }); await act({ type: 'sandbox/clear' }); await p.waitForTimeout(250);
  let gg = await G();
  if (gg.phase !== 'combat' || gg.combat?.over) {
    await p.waitForTimeout(1200); await act({ type: 'sandbox/fight' });
    await p.waitForFunction(() => window.__phc.getState().game?.phase === 'combat' && !window.__phc.getState().game.combat.over, null, { timeout: 15000 });
    await p.waitForFunction(() => window.__phc.getState().screen === 'combat', null, { timeout: 8000 }).catch(() => {});
    await act({ type: 'sandbox/clear' });
  } else { const u = await me(); if (u && (u.ap < 6 || gg.combat.order[gg.combat.turn] !== u.id || u.tech?.guard?.on)) { await act({ type: 'combat/end-turn', unitId: u.id }); } }
  await myTurn(); await idle(); await p.waitForTimeout(300); await dismissCut(); await closeTools();
  gg = await G();
  // a Bind or a Guard left from the last case is gone at the turn's start; a nail goes with the cleared units
  return gg;
}
const free = (gg, k) => { const [x, y] = XY(k); return x >= 0 && y >= 0 && x < gg.combat.map.w && y < gg.combat.map.h && !gg.combat.map.solid.includes(k) && !(gg.combat.objects || []).some((o) => o.kind !== 'pile' && o.pos === k || o.at === k || (o.tiles || []).includes(k)) && !gg.combat.units.some((u) => !u.dead && u.pos === k); };
/** Spawn a drill unit exactly on a tile (null when the engine put it elsewhere or refused). */
async function spawnAt(k, tier = 'minion', weapon = 'fists') {
  const before = new Set((await G()).combat.units.map((u) => u.id));
  await act({ type: 'sandbox/spawn', tier, weapon, at: ref(k) }); await p.waitForTimeout(250);
  const nu = (await G()).combat.units.find((u) => !before.has(u.id)); return nu && nu.pos === k ? nu : nu || null;
}
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
/** A direction from the user where every listed offset (in steps along it and across it) is a free tile. */
function pickDir(gg, at, offsets) {
  const [x, y] = XY(at);
  for (const [dx, dy] of DIRS) {
    const tiles = offsets.map(([a, c]) => K(x + dx * a - dy * c, y + dy * a + dx * c));
    if (tiles.every((k) => free(gg, k))) return { d: [dx, dy], tiles };
  }
  return null;
}
const records = () => p.evaluate(() => (window.__phcMeleeFx || []).slice());
/** Wait for this technique's beat to draw its element; take frames of it. */
const pickDirWhy = (gg, at, offsets) => DIRS.map(([dx, dy]) => { const [x, y] = XY(at); return offsets.map(([a, c]) => K(x + dx * a - dy * c, y + dy * a + dx * c)).filter((k) => !free(gg, k)).map(ref).join(' '); });
async function catchBeat(id, kind, tag, since, shotName, delays = [60, 200]) {
  let el = false, drawn = false;
  const t0 = Date.now();
  while (Date.now() - t0 < 6000) {
    if (!el && (await p.locator('[data-melee-fx^="' + tag + '"]').count())) {
      el = true;
      for (let i = 0; i < delays.length; i++) { await p.waitForTimeout(i ? delays[i] - delays[i - 1] : delays[0]); await p.screenshot({ path: SHOTS + shotName + '-' + (i + 1) + '.png' }); }
    }
    const r = (await records()).filter((x) => x.at >= since && x.id === id && x.kind === kind);
    if (r.length) { drawn = r.some((x) => x.drawn); if (el || !drawn) break; }
    await p.waitForTimeout(25);
  }
  return { el, drawn };
}
const now = () => p.evaluate(() => Math.round(performance.now()));
const mfxSince = async (n0) => ((await G()).combat.fx || []).filter((e) => e.n > n0 && e.k === 'melee_fx' && !e.refused);
/** A standing mark comes only once the queue has played its beat (review fix): wait for it, then check it rose after
 *  the beat (the hook records 'mark:<kind>' when the layer adds it). */
async function markAfter(kind, beat, t0, label) {
  const has = await p.locator('[data-melee-mark="' + kind + '"]').first().waitFor({ timeout: 6000 }).then(() => true).catch(() => false);
  const r = (await records()).filter((x) => x.at >= t0), b = r.find((x) => x.kind === beat && x.drawn), m = r.find((x) => x.kind === 'mark:' + kind);
  ok(label + ' (the mark rose after its beat: beat ' + (b ? b.at - t0 : '?') + ' ms, mark ' + (m ? m.at - t0 : '?') + ' ms)', has && !!b && !!m && m.at >= b.at);
  return has;
}
/** The movement beat played with its move, not after it: the effects log (combat speed hook) has the melee_fx no later
 *  than the first shove, stance or move of the use. */
async function ledMove(n0, lead, label) {
  const fx = await p.evaluate(() => (window.__phcCombatTempo ? window.__phcCombatTempo().fx : []));
  const use = fx.filter((x) => x.n > n0), mf = use.find((x) => x.k === 'melee_fx'), mv = use.find((x) => lead.includes(x.k));
  ok(label + ' plays over its move (beat at ' + (mf ? mf.at : '?') + ', ' + (mv ? mv.k : 'move') + ' at ' + (mv ? mv.at : '?') + ')', !!mf && !!mv && mf.at <= mv.at);
}
const lastN = async () => { const f = (await G()).combat.fx || []; return f.length ? f[f.length - 1].n : 0; };

/**
 * One technique: set up on a fresh turn (setup returns the action's args, or null when the ground won't do), use it,
 * and catch its beat; tried again (a fresh turn) when the dice didn't give the beat.
 */
async function tryTech(c) {
  for (let i = 0; i < (c.tries || 8); i++) {
    const gg = await freshTurn(); const u = await me();
    await act({ type: 'sandbox/give', charId: cid, item: c.weapon, equip: c.equip !== false }); await p.waitForTimeout(200);
    const args = await c.setup(gg, u); if (!args) { note(c.id + ': no room for the set-up here (at ' + ref(u.pos) + '; blocked: ' + JSON.stringify(pickDirWhy(await G(), u.pos, [[1, 0], [2, 0], [3, 0], [4, 0]])) + ')'); continue; }
    if (c.momentum) { await act({ type: 'sandbox/meter', unitId: u.id, momentum: c.momentum }); await p.waitForTimeout(150); }
    await idle();
    const n0 = await lastN(), t0 = await now();
    const err = await act({ type: 'combat/technique', unitId: u.id, id: c.id, ...args });
    if (err) { note(c.id + ': ' + err); continue; }
    if (c.after) await c.after(u, args);
    const got = (await mfxSince(n0)).filter((e) => e.beat === c.kind);
    if (!got.length) { note(c.id + ': no ' + c.kind + ' beat this time (the dice); again'); await idle(); continue; }
    const r = await catchBeat(c.id, c.rec || c.kind, c.tag || c.kind, t0, c.shot || c.id, c.delays);
    if (!(r.el && r.drawn) && i < (c.tries || 8) - 1) { note(c.id + ': beat not caught (' + JSON.stringify(r) + ', ' + JSON.stringify((await records()).filter((x) => x.at >= t0)) + '); again'); await idle(); continue; }
    ok(c.label + ': its ' + c.kind + ' beat draws [data-melee-fx="' + (c.tag || c.kind) + '"] and is recorded drawn', r.el && r.drawn);
    if (c.lead) await ledMove(n0, c.lead, '…' + c.label);
    if (c.check) await c.check(u, args, t0);
    await idle();
    return true;
  }
  ok(c.label + ': the beat came within ' + (c.tries || 8) + ' tries', false);
  return false;
}
const adj = (gg, u, offs) => pickDir(gg, u.pos, offs);
const CASES = [
  { id: 'sweep', kind: 'arc', weapon: 'sabre', label: 'Sweep', async setup(gg, u) { const d = adj(gg, u, [[1, 0], [1, 1], [1, -1]]); if (!d) return null; await spawnAt(d.tiles[0], 'elite'); await spawnAt(d.tiles[1], 'elite'); return { tile: d.tiles[0] }; } }, // elites: a strike that ends the fight plays only its last moments
  { id: 'cleave', kind: 'arc', tag: 'cleave', weapon: 'sabre', momentum: 2, label: 'Cleave', async setup(gg, u) { const d = adj(gg, u, [[1, 0], [1, 1], [0, 1]]); if (!d) return null; const a = await spawnAt(d.tiles[0], 'elite'); await spawnAt(d.tiles[1], 'elite'); await spawnAt(d.tiles[2], 'elite'); return a ? { targetId: a.id } : null; } },
  { id: 'throw', kind: 'throw', weapon: 'combat_knife', label: 'Throw (the knife\'s icon flies to its pile)', delays: [40, 140, 320], async setup(gg, u) { const d = adj(gg, u, [[1, 0], [2, 0], [3, 0]]); if (!d) return null; const a = await spawnAt(d.tiles[2], 'elite'); return a ? { targetId: a.id } : null; } },
  { id: 'bind', kind: 'bind', weapon: 'sabre', label: 'Bind (the link snaps, then stands)', async setup(gg, u) { const d = adj(gg, u, [[1, 0], [-1, 0]]); if (!d) return null; const a = await spawnAt(d.tiles[0], 'elite'); return a ? { targetId: a.id } : null; },
    async check(u, args, t0) { await idle(); if (await markAfter('bind', 'bind', t0, '…the Bind stands on the layer while it holds')) ok('…one link', (await p.locator('[data-melee-mark="bind"]').count()) === 1); await p.screenshot({ path: SHOTS + 'bind-standing.png' }); } },
  { id: 'throw_down', kind: 'slam', tag: 'slam', weapon: 'sabre', label: 'Throw Down (slam on the landing tile)', delays: [40, 160, 320], momentum: 2,
    async setup(gg, u) { const d = adj(gg, u, [[1, 0], [0, 1], [1, 1]]); if (!d) return null; const a = await spawnAt(d.tiles[0], 'elite'); if (!a) return null;
      const e = await act({ type: 'combat/technique', unitId: u.id, id: 'bind', targetId: a.id }); if (e) return null; await idle(); await p.waitForTimeout(200);
      await act({ type: 'sandbox/meter', unitId: u.id, momentum: 2 }); return { targetId: a.id, tile: ref(d.tiles[1]) }; } },
  { id: 'shove', kind: 'force', lead: ['shove'], weapon: 'sabre', label: 'Shove (the skid along its path)', async setup(gg, u) { const d = adj(gg, u, [[1, 0], [2, 0], [3, 0]]); if (!d) return null; const a = await spawnAt(d.tiles[0]); return a ? { targetId: a.id } : null; } },
  { id: 'drag', kind: 'force', weapon: 'sabre', shot: 'drag', label: 'Drag (a swap: two crossing arrows)', async setup(gg, u) { const d = adj(gg, u, [[1, 0]]); if (!d) return null; const a = await spawnAt(d.tiles[0]); return a ? { targetId: a.id, opt: 'swap' } : null; } },
  { id: 'bash', kind: 'force', lead: ['shove'], weapon: 'maul', shot: 'bash-push', label: 'Bash, Heavy (the push)', tries: 10 /* a hit and a failed Body save */, async setup(gg, u) { const d = adj(gg, u, [[1, 0], [2, 0], [3, 0]]); if (!d) return null; const a = await spawnAt(d.tiles[0], 'elite'); return a ? { targetId: a.id, opt: 'push', line: 'heavy' } : null; } },
  { id: 'trip', kind: 'fall', lead: ['stance', 'stopped'], weapon: 'sabre', label: 'Trip (the fall to Prone)', async setup(gg, u) { const d = adj(gg, u, [[1, 0]]); if (!d) return null; const a = await spawnAt(d.tiles[0]); return a ? { targetId: a.id } : null; } },
  { id: 'charge', kind: 'charge', weapon: 'sabre', label: 'Charge (the dash trail along the run)', delays: [80, 260], async setup(gg, u) { const d = adj(gg, u, [[1, 0], [2, 0], [3, 0], [4, 0]]); if (!d) return null; const a = await spawnAt(d.tiles[3], 'elite'); return a ? { targetId: a.id } : null; } },
  { id: 'run_through', kind: 'pin', weapon: 'lance', momentum: 2, label: 'Run Through, Reach, left in (the thrust and the pin)', tries: 6, async setup(gg, u) { const d = adj(gg, u, [[1, 0], [2, 0]]); if (!d) return null; const a = await spawnAt(d.tiles[0], 'elite'); return a ? { targetId: a.id, line: 'reach', opt: 'leave' } : null; },
    async check(u, args, t0) { await idle(); const t = (await G()).combat.units.find((x) => x.id === args.targetId);
      if (t?.nailed?.weapon) { await markAfter('nailed', 'pin', t0, '…the lance stands in the nailed unit on the layer'); ok('…drawn as the weapon\'s icon', (await p.locator('[data-melee-mark="nailed"] image').count()) >= 1); await p.screenshot({ path: SHOTS + 'nailed-standing.png' }); } else note('the target wasn\'t left nailed (killed or freed)'); } },
  { id: 'feint', kind: 'feint', weapon: 'sabre', label: 'Feint (brackets on the target, or NOT FOOLED)', async setup(gg, u) { const d = adj(gg, u, [[1, 0]]); if (!d) return null; const a = await spawnAt(d.tiles[0], 'elite'); return a ? { targetId: a.id } : null; },
    async check(u, args, t0) { const e = (await G()).combat.fx.filter((x) => x.k === 'melee_fx' && x.beat === 'feint').pop(); if (e?.ok) await markAfter('feint', 'feint', t0, '…the Feint\'s brackets stand on its target'); else note('not fooled: no standing mark'); } },
  { id: 'guard', kind: 'guard', weapon: 'sabre', label: 'Guard (the raised guard)', async setup(gg, u) { const d = adj(gg, u, [[2, 0]]); if (!d) return null; await spawnAt(d.tiles[0], 'elite'); return {}; },
    async check(u, args, t0) { await idle(); if (await markAfter('guard', 'guard', t0, '…the guard stays raised on the layer')) ok('…one guard', (await p.locator('[data-melee-mark="guard"]').count()) === 1); await p.screenshot({ path: SHOTS + 'guard-standing.png' }); } },
  { id: 'sidestep', kind: 'sidestep', lead: ['move'], weapon: 'maul', label: 'Sidestep (the quick step)', async setup(gg, u) { const d = adj(gg, u, [[1, 0], [1, 1], [0, 1]]); if (!d) return null; const a = await spawnAt(d.tiles[0], 'elite'); return a ? { targetId: a.id, tile: ref(d.tiles[2]) } : null; } },
  { id: 'half_sword', kind: 'thrust', weapon: 'sabre', label: 'Half-Sword (the narrow thrust)', async setup(gg, u) { const d = adj(gg, u, [[1, 0]]); if (!d) return null; const a = await spawnAt(d.tiles[0], 'elite'); return a ? { targetId: a.id } : null; } },
  { id: 'sunder', kind: 'sunder', weapon: 'maul', label: 'Sunder (armour chips off)', tries: 6, async setup(gg, u) { const d = adj(gg, u, [[1, 0]]); if (!d) return null; const a = await spawnAt(d.tiles[0], 'boss', 'sabre'); return a ? { targetId: a.id } : null; } },
  { id: 'flurry', kind: 'flurry', weapon: 'sabre', label: 'Flurry (quick cuts)', async setup(gg, u) { const d = adj(gg, u, [[1, 0]]); if (!d) return null; const a = await spawnAt(d.tiles[0], 'boss'); return a ? { targetId: a.id } : null; } },
  { id: 'flurry', kind: 'flurry', tag: 'throw', shot: 'flurry-thrown', weapon: 'throwing_knives', label: 'Flurry, Thrown (each throw flies the weapon; no cuts at range)', rec: 'flurry-throw', delays: [40, 160, 320],
    async setup(gg, u) { const d = adj(gg, u, [[1, 0], [2, 0], [3, 0]]); if (!d) return null; const a = await spawnAt(d.tiles[2], 'boss'); return a ? { targetId: a.id, line: 'thrown' } : null; },
    async check(u, args, t0) { const r = (await records()).filter((x) => x.at >= t0); ok('…the thrown shots flew the weapon (' + r.filter((x) => x.kind === 'flurry-throw').length + ')', r.some((x) => x.kind === 'flurry-throw' && x.drawn)); ok('…no sword cuts drawn on the target at range', !r.some((x) => x.kind === 'flurry' && x.drawn)); } },
  { id: 'draw_cut', kind: 'draw', weapon: 'sabre', equip: false, label: 'Draw Cut (the draw flash)', async setup(gg, u) {
    await act({ type: 'sandbox/give', charId: cid, item: 'combat_knife', equip: true }); await p.waitForTimeout(150);
    const d = adj(gg, u, [[1, 0]]); if (!d) return null; const a = await spawnAt(d.tiles[0], 'boss'); const pack = (await G()).characters[cid].pack || [];
    const item = pack.findIndex((x) => x.weapon === 'sabre'); return a && item >= 0 ? { targetId: a.id, item } : null; } },
  { id: 'ambush', kind: 'ambush', weapon: 'sabre', label: 'Ambush (from hiding)', tries: 3, async setup(gg, u) { const d = adj(gg, u, [[1, 0]]); if (!d) return null;
    const e = await act({ type: 'combat/hide', unitId: u.id }); if (e) { note('hide: ' + e); return null; } await idle();
    const a = await spawnAt(d.tiles[0], 'boss'); return a ? { targetId: a.id } : null; } },
  { id: 'break', kind: 'break', weapon: 'maul', momentum: 2, label: 'Break (the shattering beat)', tries: 6, async setup(gg, u) { const d = adj(gg, u, [[1, 0]]); if (!d) return null; const a = await spawnAt(d.tiles[0], 'elite'); return a ? { targetId: a.id, line: 'blunt' } : null; } },
];
// warm up: the fight's opening (the wave banner, the first turns) plays out before the first case
await freshTurn(); await p.waitForTimeout(2500); await idle();
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null; // ONLY=sweep,charge,parry: a few cases
for (const c of CASES) if (!ONLY || ONLY.includes(c.id)) await tryTech(c);

// ---------- the Answers, on the enemy's turn (the AI on): an enemy walks into reach (Keep Back); one already beside you
// swings (Parry; a Keep Back would have spent the one reaction a round, so it is a separate round) ----------
async function answerCase(label, kind, dist, tries = 5) {
  for (let i = 0; i < tries; i++) {
    const gg = await freshTurn(); const u = await me();
    await act({ type: 'sandbox/give', charId: cid, item: 'sabre', equip: true });
    const d = adj(gg, u, dist === 1 ? [[1, 0]] : [[1, 0], [2, 0], [3, 0]]); if (!d) continue;
    await spawnAt(d.tiles[dist === 1 ? 0 : 2], 'elite', 'sabre');
    const t0 = await now();
    await act({ type: 'sandbox/ai', on: true });
    await act({ type: 'combat/end-turn', unitId: u.id });
    let el = false; const t1 = Date.now();
    while (Date.now() - t1 < 9000) {
      if (!el && (await p.locator('[data-melee-fx^="' + kind + '"]').count())) { el = true; await p.waitForTimeout(70); await p.screenshot({ path: SHOTS + label.toLowerCase().replace(/ /g, '_') + '-1.png' }); await p.waitForTimeout(150); await p.screenshot({ path: SHOTS + label.toLowerCase().replace(/ /g, '_') + '-2.png' }); }
      const r = (await records()).filter((x) => x.at >= t0 && x.kind === kind);
      if (el && r.some((x) => x.drawn)) break;
      await p.waitForTimeout(25);
    }
    await act({ type: 'sandbox/ai', on: false });
    await myTurn(); await idle();
    if (el) { ok(label + ': its ' + kind + ' beat draws on the enemy\'s turn', true); return; }
    note(label + ': no ' + kind + ' beat this round (the dice); again');
  }
  ok(label + ': the beat came within ' + tries + ' rounds', false);
}
if (!ONLY || ONLY.includes('keep_back')) await answerCase('Keep Back', 'halt', 3, 8);
if (!ONLY || ONLY.includes('parry')) await answerCase('Parry', 'parry', 1, 8);

// ---------- the hook and the budget ----------
const recs = await records();
ok('the test hook recorded every beat it played (' + new Set(recs.map((r) => r.kind)).size + ' kinds)', recs.length > 0 && recs.every((r) => typeof r.at === 'number' && r.id && r.kind));
ok('no page errors', !errors.length);
if (errors.length) console.log(errors.slice(0, 5));
await browser.close();

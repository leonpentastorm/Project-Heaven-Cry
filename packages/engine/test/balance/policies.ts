// @ts-nocheck (a measuring tool; see balance-sim.test.ts)
// The balance pass, instrument 1: THE POLICIES. How a reference build plays its turn. A policy is asked, again and
// again during one turn, "what do you do next?" and answers with ONE action for the real reducer (or null: end the
// turn). It decides from the engine's own previews only (previewAttack, previewTechnique, techniquePad,
// previewOutburst / previewPump / previewOutburstPlan, planEvoke, previewPrayer, callPad, paths): the same numbers a
// player's cards show. It never rolls a die, never looks at the seed, and never reads what a player's side can't see.
//
// What each policy does, exactly (the report repeats this for Leon in plain words):
//   plain      the weapon's plain attack (Shot or Cut) at the target with the best expected damage; when none can be
//              attacked: reload if empty, clear a jam, brace a weapon that asks it, else walk the cheapest way to a tile
//              it can attack from (else as close as the AP allows).
//   optimised  every ready technique on the pad that aims at an enemy, and the plain attack, against every enemy it can
//              see: expected damage of each (hit chance × damage after armour, criticals counted) ÷ its AP; the best one
//              is used; repeat until the AP runs out. It does NOT value conditions, pushes, Pressure, set-ups or
//              anything that deals no damage by itself, does not use Watches or Answers by choice (Answers fire by
//              themselves), and looks one action ahead only.
//   peak       the same list, but it takes the single biggest expected hit it can afford (not the best per AP), so the
//              dearest move is used whenever its price is met. With a melee weapon the Finisher is held until Momentum
//              is full (from round 6: 3 or more), and only plain attacks are made until then (each hit gives 1).
//   tank       optimised, but it keeps Guard up: the last AP of a turn goes to the Guard technique or Brace.
//   sigil      draws the strongest damage Line its words, glyph cap, charge and Flux allow (walking away from the
//              target, one glyph a tile), over as many turns as it takes, then Evokes it at the best target; the pistol
//              when it can do nothing else.
//   outburst   Begin the damage design, Pump while the AP and the Strain limit allow, Release at the best target;
//              Begin again with what is left. peak: Pumps with its best feeling and holds for stage 4.
//   faith      the highest Hymn that deals damage, whenever the engine allows it; plain attacks between. peak: the
//              Miracle when the engine allows it.
//   calls      Rally, Spot, Brief, Threaten, in that order, each when the engine allows it, at most 2 Calls a turn; then
//              the sidearm. Rally and Brief go to the ally with the hardest-hitting weapon.
import {
  previewAttack, previewTechnique, techniquePad, paths, apForTiles, dist, alive, WEAPON, isMelee, bindGame,
  previewOutburst, previewPump, previewOutburstPlan, heartReach, planEvoke, glyphCost, glyphApOf, groundCap, freeTile, dir8, SIGIL,
  previewPrayer, patronOf, callPad, previewCall, lineOfSight, standable, TECHNIQUE, FEELING,
} from '../../src';

export type StepKind = 'attack' | 'technique' | 'move' | 'reload' | 'setup' | 'spell' | 'prayer' | 'call' | 'other';
export interface Step { action: any; kind: StepKind; label: string; /** a move that is paid over several actions (a Line, an Outburst): where it starts and ends */ seq?: 'start' | 'part' | 'end' }
export interface Ctx { g: any; cb: any; u: any; c: any; foes: any[]; allies: any[]; memo: Record<string, any>; banned: Set<string>; peak: boolean }
export type Policy = (x: Ctx) => Step | null;

const W = <T>(g: any, f: () => T): T => { const was = bindGame(g); try { return f(); } finally { bindGame(was); } };
const keyOf = (s: Step) => JSON.stringify(s.action);
const allowed = (x: Ctx, s: Step | null) => (s && !x.banned.has(keyOf(s)) ? s : null);

/** Expected damage of one attack preview: hit chance × damage after armour, the critical's extra counted. */
export function expected(pv: any, critChance = 0.05): number {
  if (!pv || !pv.ok || !pv.dmg) return 0;
  const hit = Math.max(1, Math.floor(pv.dmg.total) - pv.dmg.armour), crit = Math.max(1, Math.floor(pv.dmg.total * pv.dmg.crit) - pv.dmg.armour);
  const p = pv.pct / 100, pc = Math.min(p, critChance);
  return (p - pc) * hit + pc * crit;
}
const plainMode = (u: any) => (isMelee(WEAPON[u.weapon]) ? 'melee' : 'shot');

interface Cand { step: Step; value: number; ap: number }
function plainCands(x: Ctx): { cands: Cand[]; whys: string[] } {
  const mode = plainMode(x.u), cands: Cand[] = [], whys: string[] = [];
  for (const t of x.foes) {
    const pv = W(x.g, () => previewAttack(x.cb, x.u, t, mode));
    if (pv.ok) cands.push({ step: { action: { type: 'combat/attack', targetId: t.id, mode }, kind: 'attack', label: 'plain ' + (mode === 'melee' ? 'cut' : 'shot') + ' (' + x.u.weapon + ')' }, value: expected(pv), ap: pv.ap });
    else whys.push(pv.why || '');
  }
  return { cands, whys };
}
function techCands(x: Ctx): Cand[] {
  const out: Cand[] = [];
  const pad = W(x.g, () => techniquePad(x.cb, x.u, 'main', x.g)).flatMap((g: any) => g.entries);
  for (const e of pad) {
    const aim = String(e.aim || '');
    if (!e.ok || !e.built || e.plain || e.group === 'answer' || e.group === 'watch' || !(aim.includes('enemy') || aim === 'tile')) continue;
    for (const t of x.foes) {
      // what the player would pick on the card: the target (or its tile), and for a technique that asks a choice, each choice in turn
      for (const opt of [undefined, 'head', 'arm', 'leg']) {
        const args: any = { targetId: t.id, ...(aim.includes('tile') ? { tile: t.pos } : {}), ...(opt ? { opt } : {}) };
        let pv: any; try { pv = W(x.g, () => previewTechnique(x.cb, x.u, e.id, args, x.g)); } catch { break; }
        if (!pv.ok && !opt && /Call the shot|Pick|Choose/i.test(pv.why || '')) continue;
        if (!pv.ok || pv.ap > x.u.ap) { if (!opt) break; continue; }
        const value = (pv.attacks || []).filter((a: any) => x.foes.some((f) => f.id === a.target)).reduce((n: number, a: any) => n + expected(a.pv, e.id === 'aimed_shot' ? 0.1 : 0.05), 0);
        if (value > 0) out.push({ step: { action: { type: 'combat/technique', id: e.id, ...args }, kind: 'technique', label: e.name + (opt ? ' (' + opt + ')' : '') }, value, ap: pv.ap });
        if (!opt) break;
      }
    }
  }
  return out;
}
const best = (x: Ctx, cands: Cand[], score: (c: Cand) => number): Cand | null => {
  let b: Cand | null = null;
  for (const c of cands) { if (x.banned.has(keyOf(c.step)) || c.ap > x.u.ap) continue; if (!b || score(c) > score(b) + 1e-9 || (Math.abs(score(c) - score(b)) < 1e-9 && c.value > b.value)) b = c; }
  return b;
};

/** When nothing can be attacked: fix the weapon, or walk. */
function fixOrMove(x: Ctx, whys: string[], canFrom?: (k: string, apLeft: number) => boolean): Step | null {
  const u = x.u, w = whys.join(' | ');
  if (/Empty/i.test(w)) { const s = allowed(x, { action: { type: 'combat/reload' }, kind: 'reload', label: 'reload' }); if (s) return s; }
  if (/jammed/i.test(w)) { const s = allowed(x, { action: { type: 'combat/clear' }, kind: 'reload', label: 'clear a jam' }); if (s) return s; }
  if (/Brace it first/i.test(w)) { const s = allowed(x, { action: { type: 'combat/brace' }, kind: 'setup', label: 'brace' }); if (s) return s; }
  if (/Broken/i.test(w)) { const s = allowed(x, { action: { type: 'combat/repair' }, kind: 'reload', label: 'field repair' }); if (s) return s; }
  if (u.ap < 1 || !x.foes.length) return null;
  // A target it could attack from here with a full turn's AP: only the AP is short. It stays where it is (a player does
  // not walk out of position with the last AP of a turn).
  if (!canFrom) { const a0 = u.ap; u.ap = 9; try { if (x.foes.some((t) => W(x.g, () => previewAttack(x.cb, u, t, plainMode(u))).ok)) return null; } finally { u.ap = a0; } }
  const mode = plainMode(u), near = [...x.foes].sort((a, b) => dist(u.pos, a.pos) - dist(u.pos, b.pos))[0];
  const test = canFrom || ((k: string, apLeft: number) => x.foes.some((t) => {
    const p0 = u.pos, a0 = u.ap; u.pos = k; u.ap = apLeft;
    try { return W(x.g, () => previewAttack(x.cb, u, t, mode)).ok; } finally { u.pos = p0; u.ap = a0; }
  }));
  return moveTo(x, test, near);
}
/** The cheapest reachable tile the test accepts; else the reachable tile nearest the target. */
function moveTo(x: Ctx, test: (k: string, apLeft: number) => boolean, near: any, o: { pre?: (k: string) => boolean; noClose?: boolean; label?: string } = {}): Step | null {
  const u = x.u, P = W(x.g, () => paths(x.cb, u.pos, u.id)), taken = new Set(x.cb.units.filter((v: any) => v.id !== u.id && !v.dead).map((v: any) => v.pos));
  const tiles = Object.entries(P.dist as Record<string, number>).filter(([k, n]) => k !== u.pos && n > 0 && !taken.has(k)).map(([k, n]) => ({ k, n, ap: apForTiles(n, u.bank || 0, u.movement) })).filter((t) => t.ap <= u.ap)
    .sort((a, b) => a.ap - b.ap || a.n - b.n || dist(a.k, near.pos) - dist(b.k, near.pos));
  const melee = isMelee(WEAPON[u.weapon]);
  let tries = 0;
  for (const t of tiles) {
    if (melee && dist(t.k, near.pos) > 2 && !x.foes.some((f) => dist(t.k, f.pos) <= 2)) continue;
    if (o.pre && !o.pre(t.k)) continue;
    if (++tries > 70) break;
    if (test(t.k, u.ap - t.ap)) { const s = allowed(x, { action: { type: 'combat/move', to: t.k }, kind: 'move', label: 'move' }); if (s) return s; }
  }
  // nothing to attack from this turn: get as close as the AP allows (the fewest tiles that get closest)
  if (o.noClose) return null;
  const d0 = dist(u.pos, near.pos); let bestT: any = null;
  for (const t of tiles) { const d = dist(t.k, near.pos); if (d >= d0) continue; if (!bestT || d < bestT.d || (d === bestT.d && t.n < bestT.n)) bestT = { ...t, d }; }
  return bestT ? allowed(x, { action: { type: 'combat/move', to: bestT.k }, kind: 'move', label: 'move' }) : null;
}

// ---------- the physical policies ----------
export const plain: Policy = (x) => {
  const { cands, whys } = plainCands(x), b = best(x, cands, (c) => c.value);
  if (b) return b.step;
  if (cands.length) return null; // it could attack, but not with the AP left
  return fixOrMove(x, whys);
};
export const optimised: Policy = (x) => {
  const p = plainCands(x); let cands = [...p.cands, ...techCands(x)];
  // The peak with a melee weapon: the Finisher is the dearest move and its price is Momentum. It is held until Momentum
  // is full (from round 6: with 3 or more), and until then only plain attacks are made (each hit gives 1 Momentum).
  const mom = x.u.res?.momentum ?? 0, momMax = x.u.resMax?.momentum ?? 0;
  if (x.peak && momMax && isMelee(WEAPON[x.u.weapon])) {
    const isFin = (c: Cand) => TECHNIQUE[c.step.action.id]?.group === 'finisher', fin = cands.filter(isFin);
    if (fin.length && (mom >= momMax || (x.cb.round >= 6 && mom >= 3))) cands = fin;
    else { const pl = cands.filter((c) => c.step.kind === 'attack'); cands = pl.length ? pl : cands.filter((c) => !isFin(c)); }
  }
  const b = best(x, cands, x.peak ? (c) => c.value : (c) => c.value / Math.max(0.5, c.ap));
  if (b) return b.step;
  if (cands.some((c) => !x.banned.has(keyOf(c.step)))) return null;
  return fixOrMove(x, p.whys);
};
export const tank: Policy = (x) => {
  const u = x.u, g = u.res?.guard ?? 0, gMax = u.resMax?.guard ?? 0;
  const guardStep = (): Step | null => {
    if (!(gMax > 0) || g >= gMax || u.ap < 1) return null;
    const pad = W(x.g, () => [...techniquePad(x.cb, u, 'main', x.g), ...techniquePad(x.cb, u, 'off', x.g)]).flatMap((gr: any) => gr.entries);
    for (const id of ['raise_shield', 'guard']) { const e = pad.find((q: any) => q.id === id && q.ok && q.ap <= u.ap); if (e) { const s = allowed(x, { action: { type: 'combat/technique', id }, kind: 'setup', label: e.name }); if (s) return s; } }
    return u.braced ? null : allowed(x, { action: { type: 'combat/brace' }, kind: 'setup', label: 'brace (Guard)' });
  };
  const p = plainCands(x), cands = [...p.cands, ...techCands(x)], b = best(x, cands, (c) => c.value / Math.max(0.5, c.ap));
  if (b && (g >= gMax || !(gMax > 0) || u.ap - b.ap >= 1)) return b.step;
  // Nothing to attack from here: walk first and keep the last AP for Guard (a tank does not raise its shield and then
  // spend the turn walking with what is left).
  if (!b && !cands.length && u.ap > 1) { const keep = gMax > 0 && g < gMax ? 1 : 0; u.ap -= keep; let mv: Step | null = null; try { mv = fixOrMove(x, p.whys); } finally { u.ap += keep; } if (mv) return mv; }
  const gs = guardStep(); if (gs) return gs;
  if (b) return b.step;
  if (cands.some((c) => !x.banned.has(keyOf(c.step)))) return null;
  return fixOrMove(x, p.whys);
};

// ---------- Sigil (rules 1.4): a Line drawn away from the target, Evoked back at it ----------
const DIRS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
const stepK = (k: string, d: number[], n = 1) => { const [a, b] = k.split(',').map(Number); return (a + d[0] * n) + ',' + (b + d[1] * n); };
const rot = (d: number[], n: number) => DIRS[(DIRS.findIndex((q) => q[0] === d[0] && q[1] === d[1]) + n + 8) % 8];
const dmgOf = (w: string) => Number((SIGIL[w] as any)?.damage) || 0;
/** The damage Lines a caster's words can make, strongest first: [words, the spell's number before multipliers]. */
export function sigilLines(words: string[], max: number): { words: string[]; est: number }[] {
  const el = words.filter((w) => dmgOf(w) > 0).sort((a, b) => dmgOf(b) - dmgOf(a)), has = (w: string) => words.includes(w), out: { words: string[]; est: number }[] = [];
  if (!el.length || !has('seek')) return out;
  const e1 = el[0], e2 = el[1], n = Math.min(4, max);
  if (n >= 2) out.push({ words: [e1, 'seek'], est: dmgOf(e1) });
  if (n >= 3 && has('condense')) out.push({ words: [e1, 'condense', 'seek'], est: dmgOf(e1) * 1.5 });
  if (n >= 3 && e2) out.push({ words: [e1, e2, 'seek'], est: dmgOf(e1) + dmgOf(e2) / 2 });
  if (n >= 4 && has('condense') && e2) out.push({ words: [e1, e2, 'condense', 'seek'], est: (dmgOf(e1) + dmgOf(e2) / 2) * 1.5 });
  if (n >= 4 && has('condense')) out.push({ words: [e1, 'condense', 'condense', 'seek'], est: dmgOf(e1) * 2 * 0.9 });
  return out.sort((a, b) => b.est - a.est);
}
export const sigil: Policy = (x) => {
  const u = x.u, m = u.mg, M = x.memo;
  const pistol = () => { const p = plainCands(x), b = best(x, p.cands, (c) => c.value); return b ? b.step : null; };
  if (!m || !m.evoker || !(m.words || []).length) return plain(x);
  const mine = (k: string) => (x.cb.glyphs || []).some((gl: any) => gl.pos === k && gl.side === u.side);
  let plan = M.plan;
  if (plan && plan.tiles.slice(0, plan.i).some((k: string) => !mine(k))) plan = M.plan = null; // a glyph faded or was scuffed: start over
  // 1. a finished Line: Evoke it at the best target
  if (plan && plan.i >= plan.words.length) {
    let bestA: any = null, whyNot = '';
    for (const t of x.foes) {
      const pv = W(x.g, () => planEvoke(x.cb, u, plan.tiles[0], t.pos)); if (!pv.ok || pv.fizzle) { whyNot += ' ' + (pv.why || ''); continue; }
      const v = (pv.affected || []).filter((a: any) => !a.ally).reduce((n: number, a: any) => n + (a.roll ? a.dmgAfterArmour * a.roll.pct / 100 : a.dmgAfterArmour), 0);
      if (v > 0 && (!bestA || v > bestA.v) && (pv.ap ?? 1) <= u.ap) bestA = { v, aim: t.pos, tile: plan.tiles[0] };
    }
    if (bestA) { const s = allowed(x, { action: { type: 'combat/evoke', tile: bestA.tile, aim: bestA.aim }, kind: 'spell', label: 'Evoke ' + plan.words.join('·').toUpperCase(), seq: 'end' }); if (s) { M.evoking = plan; return s; } }
    if (/charge|core/i.test(whyNot) && m.cores > 0) { const s = allowed(x, { action: { type: 'combat/core' }, kind: 'setup', label: 'swap the core', seq: 'part' }); return s; }
    if (u.ap < 1) return null;
    // no target in its area (they moved): wait one turn for one to come into it, then give the Line up
    plan.waited = (plan.waited || 0) + (M.waitStamp === x.cb.round ? 0 : 1); M.waitStamp = x.cb.round;
    if (plan.waited > 1) M.plan = null;
    return pistol();
  }
  // 2. a Line in progress: step, draw
  if (plan) {
    const k = plan.tiles[plan.i];
    if (u.pos !== k) {
      if (apForTiles(1, u.bank || 0, u.movement) > u.ap) return null; // the next step waits for next turn; the Line stays
      const s = allowed(x, { action: { type: 'combat/move', to: k }, kind: 'setup', label: 'walk the Line', seq: 'part' }); if (s) return s;
      M.plan = null; return pistol(); // the way is blocked: give the Line up
    }
    const w = plan.words[plan.i], gc = W(x.g, () => glyphCost(x.cb, u, w, true, u.pos));
    if (((gc.charge || 0) > m.charge || (gc.fail && /charge|core/i.test(gc.fail))) && m.cores > 0) { const s = allowed(x, { action: { type: 'combat/core' }, kind: 'setup', label: 'swap the core', seq: 'part' }); return s; } // refused for AP: the Line waits for the next turn
    if (m.flux + (gc.flux || 1) > 6) { const s = allowed(x, { action: { type: 'combat/vent' }, kind: 'setup', label: 'vent Flux', seq: 'part' }); if (s) return s; }
    if (gc.fail) { M.plan = null; return pistol(); }
    if (gc.ap > u.ap) return null; // the next glyph waits for next turn
    const s = allowed(x, { action: { type: 'combat/draw', word: w, tile: u.pos, stroke: plan.i ? plan.sid || undefined : 'new' }, kind: 'setup', label: 'draw ' + w.toUpperCase(), seq: plan.i ? 'part' : 'start' });
    if (!s) { M.plan = null; return pistol(); }
    M.drawing = true; return s;
  }
  // 3. no Line: choose one (the strongest it can pay for; the best per AP unless playing the peak), and where to walk it
  if (!x.foes.length) return null;
  const tgt = [...x.foes].sort((a, b) => dist(u.pos, a.pos) - dist(u.pos, b.pos))[0];
  const stepAp = apForTiles(1, 0, u.movement), gAp = W(x.g, () => glyphApOf(u)), cap = Math.min(m.maxWords || 2, W(x.g, () => groundCap(u, x.cb)));
  const lines = sigilLines(m.words, cap).filter((l) => {
    const charge = l.words.reduce((n, w) => n + (Number((SIGIL[w] as any)?.charge) || 1), 0) + Math.max(1, l.words.length - (m.coreSave || 0));
    return charge <= m.charge + m.cores * 10;
  }).map((l) => ({ ...l, ap: l.words.length * gAp + (l.words.length - 1) * stepAp + 1 }));
  if (!lines.length) return plain(x);
  const line = lines.sort((a, b) => (x.peak ? b.est - a.est : b.est / b.ap - a.est / a.ap) || b.est - a.est)[0];
  const range = 8 + (m.rangeBonus || 0), n = line.words.length;
  // the Line is walked away from the target (and the two directions beside that), each tile free and unmarked
  // The spell fires from the last glyph back along the Line, in lanes as wide as the Line. So the first glyph goes on a
  // tile in a straight row, column or diagonal with the target, and the Line is walked straight away from it.
  const fit = (k: string): string[] | null => {
    const [kx, ky] = k.split(',').map(Number), [tx, ty] = tgt.pos.split(',').map(Number), dx = kx - tx, dy = ky - ty;
    if ((!dx && !dy) || !(dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy))) return null;
    const d = [Math.sign(dx), Math.sign(dy)], tiles = [k];
    if ((x.cb.glyphs || []).some((gl: any) => gl.pos === k)) return null;
    for (let i = 1; i < n; i++) { const q = stepK(k, d, i); if (!standable(x.cb.map, q) || !W(x.g, () => freeTile(x.cb, q, u)) || (x.cb.glyphs || []).some((gl: any) => gl.pos === q)) return null; tiles.push(q); }
    return tiles;
  };
  const here = fit(u.pos);
  if (here && dist(u.pos, tgt.pos) <= range - 1 && W(x.g, () => lineOfSight(x.cb, u.pos, tgt.pos))) { M.plan = { words: line.words, tiles: here, i: 0, sid: null, est: line.est }; return sigil(x); }
  { const inReach = dist(u.pos, tgt.pos) <= range - 1;
    const s = moveTo(x, (k) => W(x.g, () => lineOfSight(x.cb, k, tgt.pos)), tgt, { pre: (k) => dist(k, tgt.pos) <= range - 1 && dist(k, tgt.pos) >= 3 && !!fit(k), noClose: inReach });
    if (s && M.roomMove !== x.cb.round) { M.roomMove = x.cb.round; return s; } }
  return pistol();
};
/** Called by the runner after each action a Sigil policy took: the Line's progress. */
export function sigilAfter(x: Ctx, step: Step, ok: boolean) {
  const M = x.memo, plan = M.plan;
  if (step.action.type === 'combat/draw' && plan) {
    M.drawing = false;
    if (ok) { const gl = (x.cb.glyphs || []).filter((q: any) => q.pos === plan.tiles[plan.i] && q.side === x.u.side).pop(); if (!plan.i) plan.sid = gl?.strokeId || null; plan.i++; } else M.plan = null;
  }
  if (step.action.type === 'combat/evoke') { M.plan = null; M.evoking = null; }
}

// ---------- Outburst (rules 1.5 / 1.8): Begin, Pump, Release ----------
export const outburst: Policy = (x) => {
  const u = x.u, m = u.mg;
  if (!m || !(m.designs || []).length) return plain(x);
  const shoot = () => { const p = plainCands(x), b = best(x, p.cands, (c) => c.value); return b ? b.step : null; };
  const d = m.held ? m.designs.find((q: any) => q.id === m.held.design) : m.designs.find((q: any) => q.school === 'damage' && !q.modules.includes('inverse')) || null;
  if (!d) return plain(x);
  const reach = W(x.g, () => heartReach(m, d));
  const tgt = [...x.foes].sort((a, b) => dist(u.pos, a.pos) - dist(u.pos, b.pos))[0]; if (!tgt) return null;
  if (!m.held) {
    const pv = W(x.g, () => previewOutburst(x.cb, u, d.id, undefined, false));
    if (!pv.ok) {
      if (/MP/.test(pv.why || '') && u.ap >= 1) { const s = allowed(x, { action: { type: 'combat/syphon' }, kind: 'setup', label: 'Syphon' }); if (s) return s; }
      return shoot();
    }
    if (m.strain + pv.strain > m.strainLimit) return shoot(); // the heart needs a turn
    if (dist(u.pos, tgt.pos) > reach && x.memo.walked !== x.cb.round) { x.memo.walked = x.cb.round; const s = moveTo(x, (k, apLeft) => dist(k, tgt.pos) <= reach && apLeft >= pv.ap && W(x.g, () => lineOfSight(x.cb, k, tgt.pos)), tgt); if (s) return s; }
    return allowed(x, { action: { type: 'combat/outburst', design: d.id, hold: true }, kind: 'setup', label: 'Begin ' + d.name, seq: 'start' });
  }
  // holding: the best release now
  let rel: any = null;
  for (const t of x.foes) {
    const pl = W(x.g, () => previewOutburstPlan(x.cb, u, 'held', t.pos)); if (!pl.ok) continue;
    const v = (pl.affected || []).filter((a: any) => a.enemy).reduce((n: number, a: any) => n + (a.roll ? a.dmgAfterArmour * a.roll.pct / 100 : a.dmgAfterArmour), 0);
    if (v > 0 && (!rel || v > rel.v)) rel = { v, aim: t.pos, ap: pl.ap };
  }
  // a Pump, when the AP still pays for the Release after it and the Strain stays inside the limit (the peak accepts a burn, never a Mana Short)
  if (m.held.stage < 4) {
    let feel: string | null = null;
    if (x.peak) { let bm = 0; for (const f of [null, ...(m.feelings || [])]) { const pp = W(x.g, () => previewPump(x.cb, u, f)); if (pp.ok && pp.mult > bm + 1e-9) { bm = pp.mult; feel = f; } } }
    const pp = W(x.g, () => previewPump(x.cb, u, feel));
    if (pp.ok && u.ap - pp.ap >= 1) {
      const after = W(x.g, () => previewOutburstPlan(x.cb, u, 'held', rel?.aim || tgt.pos, { stage: pp.stage }));
      const safe = !after.shortWarning && (x.peak ? after.strainAfter <= after.strainLimit + 1 : !(after.burnWarning > 0));
      if (safe || !after.ok) { const s = allowed(x, { action: { type: 'combat/pump', ...(feel ? { feeling: feel } : {}) }, kind: 'setup', label: feel ? 'Pump (' + (FEELING[feel]?.name || feel) + ')' : 'Pump', seq: 'part' }); if (s && (safe || !rel)) return s; }
    }
  }
  // the peak holds for stage 4 (it swells a stage at the start of each turn) while the Strain allows one more turn of holding
  const holdOn = x.peak && m.held.stage < 4 && m.strain + 1 <= m.strainLimit;
  if (rel && rel.ap <= u.ap && !holdOn) { const s = allowed(x, { action: { type: 'combat/release', aim: rel.aim }, kind: 'spell', label: 'Release ' + d.name + ' (stage ' + m.held.stage + ')', seq: 'end' }); if (s) return s; }
  if (!rel && dist(u.pos, tgt.pos) > reach) { const s = moveTo(x, (k, apLeft) => dist(k, tgt.pos) <= reach && apLeft >= 1 && W(x.g, () => lineOfSight(x.cb, k, tgt.pos)), tgt); if (s) return s; }
  return null; // hold it: it swells at the start of the next turn
};

// ---------- Faith (rules 1.6): the damaging Hymn, then the weapon ----------
export const faith: Policy = (x) => {
  const p = W(x.g, () => patronOf(x.c));
  if (p && x.u.ap >= 3) {
    const tries: { kind: string; id: string; label: string }[] = [];
    if (x.peak && p.miracle) tries.push({ kind: 'miracle', id: p.miracle.id, label: 'Miracle: ' + (p.miracle.name || p.name) });
    for (const h of [...(p.hymns || [])].reverse()) if (/damage/i.test(h.text || '')) tries.push({ kind: 'hymn', id: p.id + '.' + h.id, label: 'Hymn: ' + h.name });
    const tgts = [...x.foes].sort((a, b) => dist(x.u.pos, a.pos) - dist(x.u.pos, b.pos)); // the nearest first (an enemy's HP is not on a player's card without Analyze)
    for (const t of tries) for (const tg of tgts) {
      const pv = W(x.g, () => previewPrayer(x.g, x.c.id, t.kind as any, t.id, { targetId: tg.id, tile: tg.pos }));
      if (!pv.ok || pv.mode !== 'standing') continue; // by standing only: it never asks above its Devotion, never prays by dice
      const s = allowed(x, { action: { type: 'combat/pray', kind: t.kind, id: t.id, targetId: tg.id, tile: tg.pos }, kind: 'prayer', label: t.label });
      if (s) return s;
    }
  }
  return plain(x);
};

// ---------- Calls (rules 1.13): a fixed order of the Calls that help a squad deal or avoid damage ----------
/** The Calls the leader makes, in this order, at most CALLS_A_TURN a turn; then the sidearm. Each is checked with the
 * engine's previewCall. Rally and Brief go to the ally holding the hardest-hitting weapon (then the next one); Spot and
 * Threaten to the nearest enemy in reach. Order, Cue, Warn, Name It and Taunt are not made (too situational). */
export const CALLS_A_TURN = 2;
const weaponDmg = (v: any) => { const d = (WEAPON[v.weapon] as any)?.damage; return typeof d === 'number' ? d : typeof d === 'object' && d ? Math.max(...Object.values(d).map(Number).filter(Number.isFinite), 0) : 20; };
export const calls: Policy = (x) => {
  const u = x.u, used = (x.memo.calls ||= {}), stamp = x.cb.round + ':' + x.cb.turn;
  if (used.t !== stamp) { used.t = stamp; used.ids = []; }
  if (used.ids.length < CALLS_A_TURN) {
    const pad = W(x.g, () => callPad(x.cb, u, x.g)), allies = [...x.allies].sort((a, b) => weaponDmg(b) - weaponDmg(a)), foes = [...x.foes].sort((a, b) => dist(u.pos, a.pos) - dist(u.pos, b.pos));
    for (const id of ['call.rally', 'call.spot', 'call.brief', 'call.threaten']) {
      const e = pad.find((q: any) => q.id === id); if (!e || !e.ok || e.ap > u.ap || used.ids.includes(id)) continue;
      if (id === 'call.spot' && !allies.length) continue; // the mark is for an ally: alone it does nothing
      for (const t of e.kind === 'hindering' ? foes : allies) {
        let pv: any; try { pv = W(x.g, () => previewCall(x.cb, u, id, { targetId: t.id }, x.g)); } catch { continue; }
        if (!pv.ok) continue;
        const s = allowed(x, { action: { type: 'combat/call', id, targetId: t.id }, kind: 'call', label: 'Call: ' + e.name });
        if (s) { used.ids.push(id); return s; }
      }
    }
  }
  return plain(x);
};

export const POLICIES: Record<string, Policy> = { plain, optimised, tank, sigil, outburst, faith, calls };
/** What the policies do not play (the report prints this list as it stands). */
export const NOT_PLAYED = [
  'Reaction choices: a reaction window offered to a player is declined; Answers, Interpose, Duck and Roll and the other automatic reactions still fire by themselves.',
  'Guarding Momentum: the melee builds never spend 1 AP on the Guard technique to keep their Momentum when hit (the tank guards for Guard points only).',
  'Watches and Overwatch (holding a shot or a blow for the enemy\'s turn).',
  'Perk and class actions with a button (Earthbreaker, Judgement Day, Shove, Litany, On My Mark, Clean Draw, The Twin Pays, Eye of the Storm, Unstoppable…): none is pressed. Everything a perk or class move does by itself is in the numbers.',
  'Anything valued for what it is not damage: conditions, pushes, Pressure, set-ups, Analyze, Hide, cover-seeking, stims and healing, shields, throwing grenades, swapping weapons, picking things up.',
  'Echo rerolls, Overreach, vows and rites.',
  'Dual wielding and off-hand guns (parked: section 9 of the balance pass).',
  'Sigil: only single-target damage Lines with SEEK (no Bursts, fields, traps, turrets, Afflictions, Boons or Workings), finished from the last glyph drawn; no study or word mastery during a fight. It always draws its strongest Line and does not ration cores: when the kit\'s spare cores are gone it is left with its pistol.',
  'Outburst: only the starting Damage design (Heart Bolt); no second school, no modules learned by practice, no tone, no Feed, Steady, Let go, Crystallise or Heart Overwatch.',
  'Faith: only the patron\'s damaging Hymn (and the Miracle on the peak turn); no Whispers, no support Hymns, no interventions asked for.',
  'Calls: only Rally, Spot, Brief and Threaten, in a fixed order, 2 a turn; no Order, Cue, Warn, Name It or Taunt, no Calls as reactions. Alone, a leader has only Threaten.',
];

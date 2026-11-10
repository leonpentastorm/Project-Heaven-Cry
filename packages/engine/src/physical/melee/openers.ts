// Physical 2.0, melee Openers: the first melee technique of a turn. Lunge is the lead's reference; the melee lane builds
// Charge, Feint, Draw Cut and Ambush here.
import { technique, strike, approach, stepUser, standingAt, stop, save, setUp, cond, landed, momentumOf, onHook, turnStamp, techState, techStateOf } from './shared';
import { canStrike, linesFor, techniqueAp, usable } from '../core';
import { weaponProps, PHYS_RULES } from '../data';
import { moveUnit, paths, apForTiles, xy, key, alive, emitFx, type Unit } from '../../combat';
import { ambushReady, reveal } from '../../tactics';
import { charOfUnit } from '../../effects/hooks';
import { WEAPON } from '../../data';
import { drawable, drawInto, asDrawn } from './draw';
import type { Tech } from './shared';

// 1. Lunge: step 1 tile toward the target, then strike; the step draws no opportunity attack.
//    Point: +2 to hit. Reach: the step may be 2 tiles. Heavy: on a hit the target is pushed 1 tile.
technique({
  id: 'lunge',
  run(t) {
    const tgt = t.tgt; if (!tgt) return 'Pick a target.';
    const p = t.line('point', 'reach', 'heavy');
    const step = approach(t, tgt, p === 'reach' ? t.num('reach_step', 2) : t.num('step', 1));
    if (step === false) return 'Too far to lunge.';
    const hit = () => strike(t, { extra: p === 'point' ? t.num('point_hit', 2) : 0 });
    if (t.preview) { const r = step ? (stepUser(t, step.route), standingAt(t, step.to, hit)) : hit(); if (p === 'heavy' && r.ok) t.note('On a hit: pushed ' + t.num('heavy_push', 1) + '.'); return r.ok ? null : r.why || 'Can\'t attack that.'; }
    if (step) stepUser(t, step.route);
    const r = hit(); if (!r.ok) return null; // the step was taken; the strike couldn't follow (the log says why)
    if (r.hit && !r.killed && p === 'heavy') stop(t, tgt, 'push', { tiles: t.num('heavy_push', 1), save: false });
    return null;
  },
  ai: (t) => (t.tgt ? 6 : 0),
});

// ---------- Charge's run-up ----------
// The straight line a unit has walked this turn, tile by tile (any walk: a move, a sprint, a technique's step). Kept on
// the unit as Charge's technique state, so it is saved with the fight. A forced move ends it.
interface Run { t: string; dx: number; dy: number; n: number; at: string }
const canCharge = (u: Unit) => usable(null, u, 'main').some((x) => x.id === 'charge') || (!!u.offWeapon && usable(null, u, 'off').some((x) => x.id === 'charge'));
onHook('move_step', (ctx: any, cb) => {
  const u: Unit | undefined = ctx?.u; if (!u || ctx.preview || !cb) return;
  if (ctx.forced) { if (u.tech?.charge?.run) delete u.tech.charge.run; return; }
  if (!canCharge(u)) return;
  const [fx, fy] = xy(ctx.from), [ax, ay] = xy(ctx.at), dx = Math.sign(ax - fx), dy = Math.sign(ay - fy), stamp = turnStamp(cb);
  const st = techState(u, 'charge'), r: Run | undefined = st.run;
  st.run = r && r.t === stamp && r.at === ctx.from && r.dx === dx && r.dy === dy ? { ...r, n: r.n + 1, at: ctx.at } : { t: stamp, dx, dy, n: 1, at: ctx.at };
});
/** The run already walked this turn that ends where the user stands (null: none). */
const runSoFar = (t: Tech): Run | null => { const r: Run | undefined = techStateOf(t.u, 'charge').run; return r && r.t === turnStamp(t.cb) && r.at === t.u.pos ? r : null; };
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
interface RunPlan { route: string[]; to: string; tiles: number; ap: number }
/** The ways to finish a charge: stand still after a run of 3 or more, or run on in a straight line to a tile the target
 * can be struck from. Each with its tiles in the straight line (what was walked before, in the same direction, counts),
 * and the AP of the run (a walk, at the user's movement). args.tile names the run's end. */
function runPlans(t: Tech, target: Unit, baseAp: number): RunPlan[] {
  const u = t.u, prior = runSoFar(t), out: RunPlan[] = [], P = paths(t.cb, u.pos, u.id), [ux, uy] = xy(u.pos);
  const reach = (k: string) => standingAt(t, k, () => canStrike(t, target));
  if (prior && reach(u.pos)) out.push({ route: [], to: u.pos, tiles: prior.n, ap: 0 });
  for (const [dx, dy] of DIRS) {
    const route: string[] = [];
    for (let i = 1; ; i++) {
      const k = key(ux + dx * i, uy + dy * i), [kx, ky] = xy(k);
      if (kx < 0 || ky < 0 || kx >= t.cb.map.w || ky >= t.cb.map.h || P.dist[k] !== i) break; // a straight line, tile by tile
      const ap = apForTiles(i, u.bank || 0, u.movement); if (baseAp + ap > u.ap) break;
      route.push(k);
      const tiles = i + (prior && prior.dx === dx && prior.dy === dy ? prior.n : 0);
      if (reach(k)) out.push({ route: [...route], to: k, tiles, ap });
    }
  }
  return out;
}

// 2. Charge: after moving 3 or more tiles in a straight line this turn, strike at +10% damage per tile moved, up to
//    +50%. Point: ignores 5 armour. Blunt or Heavy: the target makes a Body save or falls Prone. Reach: you strike
//    before it can take its Overwatch or Keep Back.
//    Reading: the run may be part of Charge (a walk in a straight line at the walk's own AP, then the strike), or walked
//    before it this turn; both count. With Reach, the target's held shot and Keep Back don't fire at the run.
let PREEMPT: { by: string; target: string } | null = null; // only while Charge's own run is being walked (never saved)
onHook('reaction_window', (ctx: any) => {
  if (!PREEMPT || ctx.cancel || !ctx.reactor || !ctx.mover) return;
  if (ctx.reactor.id !== PREEMPT.target || ctx.mover.id !== PREEMPT.by) return;
  if (ctx.kind === 'overwatch' || ctx.kind === 'watch' || (ctx.kind === 'answer' && ctx.id === 'keep_back')) ctx.cancel = true;
});
technique({
  id: 'charge',
  run(t) {
    const tgt = t.tgt; if (!tgt) return 'Pick a target.';
    const minRun = t.num('min_run', 3), cap = t.num('max_pct', 50), per = t.num('per_tile_pct', 10);
    // in the action the technique's own AP is already paid
    let plans = runPlans(t, tgt, t.preview ? t.pv.ap : 0).filter((x) => x.tiles >= minRun);
    if (t.args.tile && t.args.tile !== t.u.pos) plans = plans.filter((x) => x.to === t.args.tile);
    if (!plans.length) return t.args.tile && t.args.tile !== t.u.pos ? 'Charge needs a straight run of ' + minRun + ' tiles ending where you can strike ' + tgt.name + '.' : 'No straight run of ' + minRun + ' tiles to ' + tgt.name + '.';
    // the most bonus; then the least AP; then the nearest tile to the target
    const pct = (x: RunPlan) => Math.min(cap, x.tiles * per), [tx, ty] = xy(tgt.pos), far = (k: string) => { const [x, y] = xy(k); return Math.hypot(x - tx, y - ty); };
    const plan = [...plans].sort((a, b) => pct(b) - pct(a) || a.ap - b.ap || far(a.to) - far(b.to) || (a.to < b.to ? -1 : 1))[0];
    const p = t.line('point', 'blunt', 'heavy', 'reach'), bonus = pct(plan);
    const hit = () => strike(t, { mult: 1 + bonus / 100, ignoreArmour: p === 'point' ? t.num('point_armour', 5) : undefined, label: 'Charge, ' + plan.tiles + ' tiles' });
    const prone = p === 'blunt' || p === 'heavy';
    if (t.preview) {
      t.pv.ap += plan.ap; if (plan.ap) t.note('The run: ' + plan.route.length + ' tiles in a straight line, ' + plan.ap + ' AP.');
      if (plan.route.length) stepUser(t, plan.route);
      const r = plan.route.length ? standingAt(t, plan.to, hit) : hit();
      if (!r.ok) return r.why || 'Can\'t attack that.';
      if (prone) { t.note('On a hit: ' + tgt.name + ' makes a Body save or falls Prone.'); save(t, tgt, ['body']); }
      if (p === 'reach' && plan.route.length) t.note(tgt.name + ' can\'t take its held shot or Keep Back at your run.');
      return null;
    }
    if (plan.route.length) {
      const P = { dist: {} as Record<string, number>, prev: {} as Record<string, string> };
      plan.route.forEach((k, i) => { P.dist[k] = i + 1; P.prev[k] = i ? plan.route[i - 1] : t.u.pos; });
      PREEMPT = p === 'reach' ? { by: t.u.id, target: tgt.id } : null;
      let err: string | null;
      try { err = moveUnit(t.cb, t.u, plan.to, t.rng, 'move', { via: P }); } finally { PREEMPT = null; }
      if (err) return err; // refused before anything moved: the technique's AP comes back
      if (!alive(t.u) || t.u.pos !== plan.to) return null; // the run was cut short: no strike (the log says why)
    }
    const r = hit(); if (!r.ok) return null;
    if (r.hit && !r.killed && prone && alive(tgt)) stop(t, tgt, 'prone', { save: ['body'] });
    return null;
  },
  ai: (t) => (t.tgt ? 6 : 0),
});

// 3. Feint: no damage. The target makes a Brain save against your Brain debuff strength. If it fails, your next
//    technique against it this turn has +3 to hit and it can't use an Answer. Counts as a hit for Momentum when it
//    works. Light: the save is at −2. Hook: on a failed save its weapon is also lowered (1 AP to raise).
technique({
  id: 'feint',
  check(t) {
    if (!t.tgt) return 'Pick a target.';
    if (t.tgt.side === t.u.side) return 'Feint at an enemy.';
    if (!canStrike(t, t.tgt)) return 'Out of reach: ' + t.tgt.name + ' must be within your weapon\'s reach.';
    return null;
  },
  run(t) {
    const tgt = t.tgt!, p = t.line('light', 'hook');
    const tnAdd = ((t.u as any).dbf?.brain || 0) + (p === 'light' ? t.num('light_save', 2) : 0);
    if (t.preview) t.note('No damage. ' + tgt.name + ' makes a Brain save; if it fails:');
    if (save(t, tgt, 'brain', tnAdd)) { t.cb.log.push(tgt.name + ' isn\'t fooled by the feint.'); return null; } // it saw through: nothing more
    setUp(t, tgt, { hit: t.num('hit', 3), noAnswer: true, label: 'Feint' });
    if (p === 'hook') cond(t, tgt, 'lowered');
    landed(t);
    return null;
  },
  ai: (t) => (t.tgt && momentumOf(t.u) < 2 ? 3 : 0),
});

// 4. Draw Cut: draw this weapon from the pack or a sheath and strike in one action. Only if you started the turn with
//    it stowed. Edge: Bleeding on a hit. Light: if the target hasn't acted this fight, it counts as an ambush.
//    Reading: the hand holds what it holds when the turn starts (fists, or another melee weapon); args.item names the
//    pack entry (its index or weapon id; else the first melee weapon there). The cost is the drawn weapon's attack −1,
//    and the lines are the drawn weapon's.
onHook('turn_start', (ctx: any, cb) => {
  const u: Unit | undefined = ctx?.u; if (!u || !u.charId || u.companion || !cb) return;
  const c = charOfUnit(u); if (!c || !((c as any).phys?.ready?.melee || []).includes('draw_cut')) return;
  techState(u, 'draw_cut').start = { t: turnStamp(cb), main: u.weapon, off: u.offWeapon || null };
});
/** Has this unit had a turn in this fight? */
const hasActed = (cb: Tech['cb'], v: Unit) => cb.round > 1 || cb.order.indexOf(v.id) < cb.turn;
technique({
  id: 'draw_cut',
  check(t) {
    if (!t.c || t.u.companion) return 'Only a character draws from a pack.';
    if (!t.tgt) return 'Pick a target.';
    return null;
  },
  run(t) {
    const tgt = t.tgt!, d = drawable(t); if (typeof d === 'string') return d;
    const start = techStateOf(t.u, 'draw_cut').start;
    if (start && start.t === turnStamp(t.cb) && (start.main === d.wid || start.off === d.wid)) return 'You had it in hand this turn: Draw Cut needs it stowed since the start of your turn.';
    const ap = techniqueAp(t.def, d.wid, t.args.line), extra = ap - t.pv.ap;
    if (t.preview ? t.u.ap < ap : t.u.ap < extra) return 'Needs ' + ap + ' AP.';
    const lf = linesFor(t.def, d.wid, t.args.line, t.u), props = weaponProps(d.wid);
    const p = lf.main ? (['edge', 'light'].find((x) => lf.main!.props.includes(x) && props.includes(x)) || null) : null;
    // an ambush the engine doesn't already give (it does from Hidden): its multiplier and criticals, named on the card
    const amb = p === 'light' && !hasActed(t.cb, tgt) && !ambushReady(t.u);
    const opts = { mult: amb ? t.u.ambushMult || 1.5 : 1, critMin: amb ? 19 : undefined, label: amb ? 'ambush (Draw Cut)' : 'Draw Cut' };
    if (t.preview) {
      t.pv.ap = ap; t.note('Draws the ' + WEAPON[d.wid].name + ' from the pack.');
      const r = asDrawn(t, d.idx, () => strike(t, { ...opts, mult: ambushReady(t.u) ? t.u.ambushMult || 1.5 : opts.mult }));
      if (typeof r === 'string') return r;
      if (!r.ok) return r.why || 'Can\'t attack that.';
      if (p === 'edge') t.note('On a hit: ' + tgt.name + ' is Bleeding.');
      return null;
    }
    const err = drawInto(t, d.idx); if (err) return err; // refused before anything changed
    t.u.ap -= extra; t.pv.ap = ap;
    const r = strike(t, opts); if (!r.ok) return null; // drawn; the strike couldn't follow (the log says why)
    if (r.hit && !r.killed && p === 'edge' && alive(tgt)) cond(t, tgt, 'bleeding');
    return null;
  },
  ai: () => 0, // enemies carry no pack
});

// 5. Ambush: only from Hidden: strike with the Ambush multiplier (today's rule), and gain 2 Momentum instead of 1.
//    Point: crits on 18–20. Bare: no damage, the target is Grappled and Silenced for 1 round instead.
//    Reading: the engine's ambush (the first attack of each Hidden entry) gives the multiplier and criticals on 19–20;
//    when it is already spent, Ambush applies the same itself. Bare rolls nothing: the grab lands within reach.
technique({
  id: 'ambush',
  check(t) { if (!t.tgt) return 'Pick a target.'; if (t.tgt.side === t.u.side) return 'Ambush an enemy.'; return null; },
  run(t) {
    const tgt = t.tgt!, p = t.line('point', 'bare'), gain = t.num('momentum', 2);
    if (p === 'bare') {
      if (!canStrike(t, tgt)) return 'Walk up to them first.';
      if (t.preview) { cond(t, tgt, 'grappled', t.num('bare_rounds', 1)); cond(t, tgt, 'silenced', t.num('bare_rounds', 1)); t.note('No damage.'); landed(t, gain); return null; }
      t.u.ambushUsed = t.u.hideEntry || 1;
      emitFx(t.cb, 'melee', { unit: t.u.id, target: tgt.id, from: t.u.pos, to: tgt.pos, weapon: t.weaponId, cat: 'unarmed', mode: 'grapple', hit: true, crit: false, fumble: false, dmg: 0, killed: false });
      cond(t, tgt, 'grappled', t.num('bare_rounds', 1)); cond(t, tgt, 'silenced', t.num('bare_rounds', 1));
      const rv = reveal(t.cb, t.u, 'attacked'); if (rv) t.cb.log.push(t.u.name + rv.replace(/^ · /, ': ') + '.');
      landed(t, gain);
      return null;
    }
    const ready = ambushReady(t.u), mult = t.u.ambushMult || 1.5;
    // from a fresh Hidden entry the engine applies the multiplier itself (its preview doesn't show it: the card adds it)
    const r = strike(t, { mult: ready && !t.preview ? 1 : mult, critMin: p === 'point' ? t.num('point_crit_min', 18) : ready ? undefined : 19, label: 'ambush' });
    if (!r.ok) return r.why || 'Can\'t attack that.';
    if (t.preview) { const max = t.u.resMax?.momentum ?? PHYS_RULES.momentum.max, now = momentumOf(t.u); t.pv.momentum = { now, after: Math.min(max, now + gain) }; t.note('On a hit: +' + gain + ' Momentum.'); return null; }
    if (r.hit) landed(t, gain - 1); // the hit gave the first
    return null;
  },
  ai: (t) => (t.tgt && t.u.hidden ? 8 : 0),
});

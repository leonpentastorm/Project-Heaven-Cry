// Physical 2.0, melee Openers: the first melee technique of a turn. Lunge is the lead's reference; the melee lane builds
// Charge, Feint, Draw Cut and Ambush here.
import { technique, strike, approach, stepUser, stepBlock, standingAt, stop, save, setUp, cond, landed, momentumOf, onHook, turnStamp, techState, techStateOf, meleeFx, fxMark, movedSince, fallFx, refuseFx } from './shared';
import { canStrike } from '../core';
import { PHYS_RULES } from '../data';
import { moveUnit, paths, apForTiles, xy, key, alive, emitFx, type Unit } from '../../combat';
import { ambushReady, reveal } from '../../tactics';
import type { Tech } from './shared';

// 1. Lunge: step 1 tile toward the target, then strike; the step draws no opportunity attack.
//    Point: +2 to hit. Reach: the step may be 2 tiles. Heavy: on a hit the target is pushed 1 tile.
technique({
  id: 'lunge',
  run(t) {
    const tgt = t.tgt; if (!tgt) return 'Pick a target.';
    const p = t.line('point', 'reach', 'heavy');
    const step = approach(t, tgt, p === 'reach' ? t.num('reach_step', 2) : t.num('step', 1));
    if (step === false) return stepBlock(t) || 'Too far to lunge.';
    const hit = () => strike(t, { extra: p === 'point' ? t.num('point_hit', 2) : 0 });
    if (t.preview) { const r = step ? (stepUser(t, step.route), standingAt(t, step.to, hit)) : hit(); if (p === 'heavy' && r.ok) t.note('On a hit: pushed ' + t.num('heavy_push', 1) + '.'); return r.ok ? null : r.why || 'Can\'t attack that.'; }
    if (step) stepUser(t, step.route);
    const r = hit(); if (!r.ok) return null; // the step was taken; the strike couldn't follow (the log says why)
    if (r.hit && !r.killed && r.target && p === 'heavy') { // r.target: the unit really struck
      const mk = fxMark(t); stop(t, r.target, 'push', { tiles: t.num('heavy_push', 1), save: false });
      const path = movedSince(t, r.target.id, mk); if (path.length > 1) meleeFx(t, 'force', { target: r.target.id, path, how: 'push' });
    }
    return null;
  },
  ai: (t) => (t.tgt ? 6 : 0),
});

// ---------- Charge's run-up ----------
// The straight line a unit has walked this turn, tile by tile (any walk: a move, a sprint, a technique's step). Kept on
// the unit as Charge's technique state, so it is saved with the fight. A forced move ends it. Every unit's run is kept,
// whatever it held while walking: the text asks only that the run was made this turn, so a weapon drawn after the walk
// can still Charge (usability is checked when Charge is used).
interface Run { t: string; dx: number; dy: number; n: number; at: string }
onHook('move_step', (ctx: any, cb) => {
  const u: Unit | undefined = ctx?.u; if (!u || ctx.preview || !cb) return;
  if (ctx.forced) { if (u.tech?.charge?.run) delete u.tech.charge.run; return; }
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
    // a named tile is where the run ends: the user's own tile means "strike from here after the run already walked"
    if (t.args.tile) plans = plans.filter((x) => x.to === t.args.tile);
    if (!plans.length) return t.args.tile ? 'Charge needs a straight run of ' + minRun + ' tiles ending where you can strike ' + tgt.name + '.' : 'No straight run of ' + minRun + ' tiles to ' + tgt.name + '.';
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
    const fx = meleeFx(t, 'charge', { route: [t.u.pos, ...plan.route], tiles: plan.tiles, target: tgt.id });
    if (plan.route.length) {
      const P = { dist: {} as Record<string, number>, prev: {} as Record<string, string> };
      plan.route.forEach((k, i) => { P.dist[k] = i + 1; P.prev[k] = i ? plan.route[i - 1] : t.u.pos; });
      PREEMPT = p === 'reach' ? { by: t.u.id, target: tgt.id } : null;
      let err: string | null;
      try { err = moveUnit(t.cb, t.u, plan.to, t.rng, 'move', { via: P }); } finally { PREEMPT = null; }
      if (err) { refuseFx(fx); return err; } // refused before anything moved: the technique's AP comes back
      if (!alive(t.u) || t.u.pos !== plan.to) return null; // the run was cut short: no strike (the log says why)
    }
    const r = hit(); if (!r.ok) return null;
    const v = r.target || tgt; // the unit really struck (a redirect): the rider follows it
    if (r.hit && !r.killed && prone && alive(v)) { const was = !!v.prone; stop(t, v, 'prone', { save: ['body'] }); fallFx(t, v, was); }
    return null;
  },
  ai: (t) => (t.tgt ? 6 : 0),
});

// 3. Feint: no damage. The target makes a Brain save against the strength of the skill your weapon hits with. If it fails, your next
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
    // save() adds the user's strength with the skill the weapon hits with (rules 1.13), as for every technique's save
    const tnAdd = p === 'light' ? t.num('light_save', 2) : 0;
    if (t.preview) t.note('No damage. ' + tgt.name + ' makes a Brain save; if it fails:');
    if (save(t, tgt, 'brain', tnAdd)) { t.cb.log.push(tgt.name + ' isn\'t fooled by the feint.'); meleeFx(t, 'feint', { target: tgt.id, to: tgt.pos, ok: false }); return null; } // it saw through: nothing more
    meleeFx(t, 'feint', { target: tgt.id, to: tgt.pos, ok: true, lowered: p === 'hook' });
    setUp(t, tgt, { hit: t.num('hit', 3), noAnswer: true, label: 'Feint' });
    if (p === 'hook') cond(t, tgt, 'lowered');
    landed(t);
    return null;
  },
  ai: (t) => (t.tgt && momentumOf(t.u) < 2 ? 3 : 0),
});

// 4. Draw Cut: draw this weapon from the pack or a sheath and strike in one action. Only if you started the turn with
//    it stowed. Edge: Bleeding on a hit. Light: if the target hasn't acted this fight, it counts as an ambush.
//    Reading: the core draws it (needs.stowed: args.item names the pack entry; the technique is checked and previewed
//    as if held, then drawn free through the reducer's own gear change), so t.w and the lines are the drawn weapon's
//    and the cost is its attack −1 (data ap.add). "Stowed since the start of the turn": it was in neither hand when the
//    turn began (a turn_start listener records the hands).
onHook('turn_start', (ctx: any, cb) => {
  const u: Unit | undefined = ctx?.u; if (!u || !u.charId || u.companion || !cb) return;
  techState(u, 'draw_cut').start = { t: turnStamp(cb), main: u.weapon, off: u.offWeapon || null };
});
/** Has this unit had a turn in this fight? */
const hasActed = (cb: Tech['cb'], v: Unit) => cb.round > 1 || cb.order.indexOf(v.id) < cb.turn;
technique({
  id: 'draw_cut',
  check(t) {
    if (!t.tgt) return 'Pick a target.';
    const start = techStateOf(t.u, 'draw_cut').start;
    // in the run the hand holds it now (just drawn): compare with what the hands held when the turn began
    if (start && start.t === turnStamp(t.cb) && (start.main === t.weaponId || start.off === t.weaponId))
      return 'You had it in hand this turn: Draw Cut needs it stowed since the start of your turn.';
    return null;
  },
  run(t) {
    const tgt = t.tgt!, p = t.line('edge', 'light');
    // Light: the engine's own ambush (its multiplier, criticals on 19-20, and everything that reads an ambush)
    const amb = p === 'light' && !hasActed(t.cb, tgt);
    const opts = { ambush: amb, label: 'Draw Cut' };
    if (t.preview) {
      t.note('Draws the ' + t.w.name + ' from the pack.');
      const r = strike(t, { ...opts, ambush: amb || ambushReady(t.u) }); // from Hidden the engine ambushes anyway: the card shows it
      if (!r.ok) return r.why || 'Can\'t attack that.';
      if (p === 'edge') t.note('On a hit: ' + tgt.name + ' is Bleeding.');
      return null;
    }
    meleeFx(t, 'draw', { target: tgt.id, to: tgt.pos, weapon: t.weaponId });
    const r = strike(t, opts); if (!r.ok) return null; // drawn; the strike couldn't follow (the log says why)
    const v = r.target || tgt;
    if (r.hit && !r.killed && p === 'edge' && alive(v)) cond(t, v, 'bleeding');
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
      meleeFx(t, 'ambush', { target: tgt.id, to: tgt.pos, fromHidden: !!t.u.hidden, bare: true });
      emitFx(t.cb, 'melee', { unit: t.u.id, target: tgt.id, from: t.u.pos, to: tgt.pos, weapon: t.weaponId, cat: 'unarmed', mode: 'grapple', hit: true, crit: false, fumble: false, dmg: 0, killed: false });
      cond(t, tgt, 'grappled', t.num('bare_rounds', 1)); cond(t, tgt, 'silenced', t.num('bare_rounds', 1));
      const rv = reveal(t.cb, t.u, 'attacked'); if (rv) t.cb.log.push(t.u.name + rv.replace(/^ · /, ': ') + '.');
      landed(t, gain);
      return null;
    }
    const fx = meleeFx(t, 'ambush', { target: tgt.id, to: tgt.pos, fromHidden: !!t.u.hidden, bare: false });
    // the engine's own ambush, also when this Hidden entry's is already spent (only a fresh one is used up)
    const r = strike(t, { ambush: true, critMin: p === 'point' ? t.num('point_crit_min', 18) : undefined, label: 'ambush' });
    if (!r.ok) { refuseFx(fx); return r.why || 'Can\'t attack that.'; }
    if (t.preview) { const max = t.u.resMax?.momentum ?? PHYS_RULES.momentum.max, now = momentumOf(t.u); t.pv.momentum = { now, after: Math.min(max, now + gain) }; t.note('On a hit: +' + gain + ' Momentum.'); return null; }
    if (r.hit) landed(t, gain - 1); // the hit gave the first
    return null;
  },
  ai: (t) => (t.tgt && t.u.hidden ? 8 : 0),
});

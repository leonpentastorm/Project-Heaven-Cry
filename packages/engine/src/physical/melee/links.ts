// Physical 2.0, melee Links: 1 AP moves that set up the next technique. They never deal damage and never end the chain
// (the core charges the 1 AP). Sidestep, Guard, Shove, Trip and Drag.
//
// Readings (the result note lists them):
//   - A Link that works on an enemy (Shove, Trip, Drag: its save failed) gives Momentum through landed(). Sidestep and
//     Guard act on nobody and give none; they still count as the last technique, so the next one earns the variety bonus.
//   - Shove, Trip and Drag act on an enemy; Shove at 1 tile (Reach: 2), Trip and Drag within the weapon's reach (2 with
//     a Reach weapon, else 1).
//   - Shove keeps today's push-or-Prone, but its roll is the stop save (Guts or Athletics against rules.stop_tn), as
//     every push goes through stop(). "Body save" (Trip, Drag, Guard with Reach) is the Body family save.
//   - Sidestep's mark is kept on the user (u.tech.sidestep), not in the shared set-up slot, so a Feint's mark survives
//     it. It is spent by the next Strike against that enemy this turn (every roll of that one Strike).
import { technique, landed, holdMomentum, save, cond, stop, forceMove, stepUser, stepsWithin, chainOf, turnStamp, pressureFilter, onHook, type Tech } from './shared';
import { strikingWith } from '../core';
import { PHYS_RULES } from '../data';
import { type Combat, type Unit, alive, dist, xy, key, moveBlockers, moveBlock, moveFx, emitFx, triggerOverwatch, refOf } from '../../combat';
import { ITEM } from '../../data';
import { emit, charOfUnit } from '../../effects/hooks';
import { immune } from '../../effects/core';
import { unitSave } from '../../magic';
import { resOf } from '../../tactics';
import { d20, type Rng } from '../../rng';

// ---------- small helpers ----------
/** The weapon's melee reach for a Link: 2 with a Reach weapon, else 1. */
const reachOf = (t: Tech) => (t.holds('reach') ? 2 : 1);
/** An enemy to work on: refuses in plain words, or null. */
function enemyCheck(t: Tech, verb: string): string | null {
  const tgt = t.tgt; if (!tgt) return 'Pick a target.';
  if (tgt === t.u) return 'You can\'t ' + verb + ' yourself.';
  if (tgt.side === t.u.side) return verb[0].toUpperCase() + verb.slice(1) + ' an enemy, not an ally.';
  if (!alive(tgt)) return tgt.name + ' is out of the fight.';
  return null;
}
/** Is a tile free to stand on (on the map, not blocked, nobody there but `mover`)? */
const freeTile = (cb: Combat, k: string, mover: Unit | null, blocked = moveBlockers(cb)) => {
  const [x, y] = xy(k); return x >= 0 && y >= 0 && x < cb.map.w && y < cb.map.h && !blocked.has(k) && !cb.units.some((v) => v !== mover && !v.dead && v.pos === k);
};
/** The tile one step from `at` directly away from `from` (null when they share a tile). */
function awayFrom(from: string, at: string): string | null {
  const [ox, oy] = xy(from), [x, y] = xy(at), sx = Math.sign(x - ox), sy = Math.sign(y - oy);
  return sx || sy ? key(x + sx, y + sy) : null;
}
/** The Defense a carried shield gives (its defense_bonus), for "ignores a carried shield". 0 without one. */
function shieldBonus(u: Unit): number {
  const c = u.companion ? null : charOfUnit(u), it: any = c?.offHand ? (ITEM as any)[c.offHand.id] : null;
  if (!it || it.category !== 'shield') return 0;
  return (it.effects || []).filter((e: any) => e.op === 'defense_bonus' && typeof e.value === 'number').reduce((n: number, e: any) => n + e.value, 0);
}
/** A Body save outside a technique's own use (Guard with Reach, on the mover's step): the core's save, with the hook's dice. */
function bodySave(cb: Combat, rng: Rng, who: Unit, against: string, tnAdd = 0): boolean {
  const tn = (PHYS_RULES.stop_tn || 12) + tnAdd, bonus = unitSave(who, 'body'), r = d20(rng), ok = r === 20 || (r !== 1 && r + bonus >= tn);
  cb.log.push(who.name + (ok ? ' saves' : ' fails the save') + ' against ' + against + ' (body ' + (r + bonus) + ' vs ' + tn + ').');
  return ok;
}

// ---------- 15. Sidestep ----------
// Move 1 tile to another tile next to the same enemy. No opportunity attack. Your next Strike against it this turn
// ignores a carried shield and counts as flanking. Light: 2 tiles.
/** The enemy to step around: the one named, or the only enemy next to the user. */
function sidestepFoe(t: Tech): Unit | null {
  if (t.tgt) return t.tgt;
  const near = t.cb.units.filter((v) => v.side !== t.u.side && alive(v) && dist(v.pos, t.u.pos) <= 1);
  return near.length === 1 ? near[0] : null;
}
/** Where the step goes: args.tile if it works, else the tile next to the enemy farthest round from where the user stands. */
function sidestepTo(t: Tech, foe: Unit): { to: string; route: string[] } | null {
  const n = t.line('light') ? t.num('light_tiles', 2) : t.num('tiles', 1);
  const ok = stepsWithin(t, n).filter((s) => dist(s.to, foe.pos) <= 1);
  if (t.args.tile) return ok.find((s) => s.to === t.args.tile) || null;
  return [...ok].sort((a, b) => dist(b.to, t.u.pos) - dist(a.to, t.u.pos) || (a.to < b.to ? -1 : 1))[0] || null;
}
technique({
  id: 'sidestep',
  check(t) {
    const blk = moveBlock(t.u); if (blk) return blk;
    const foe = sidestepFoe(t); if (!foe) return t.cb.units.some((v) => v.side !== t.u.side && alive(v) && dist(v.pos, t.u.pos) <= 1) ? 'Pick the enemy to step around.' : 'Stand next to an enemy to sidestep around it.';
    if (foe.side === t.u.side) return 'Sidestep around an enemy, not an ally.';
    if (!alive(foe)) return foe.name + ' is out of the fight.';
    if (dist(foe.pos, t.u.pos) > 1) return 'You must be next to ' + foe.name + '.';
    if (!sidestepTo(t, foe)) return t.args.tile ? 'You can\'t step there: pick a free tile next to ' + foe.name + ' within ' + (t.line('light') ? t.num('light_tiles', 2) : t.num('tiles', 1)) + '.' : 'No free tile next to ' + foe.name + ' to step to.';
    return null;
  },
  run(t) {
    const foe = sidestepFoe(t)!, step = sidestepTo(t, foe)!;
    const sh = shieldBonus(foe);
    if (t.preview) {
      stepUser(t, step.route);
      t.note('No opportunity attack. Your next Strike against ' + foe.name + ' this turn ignores a carried shield' + (sh ? ' (+' + sh + ' to hit)' : '') + ' and counts as flanking.');
      return null;
    }
    stepUser(t, step.route);
    if (alive(t.u) && alive(foe) && dist(t.u.pos, foe.pos) <= 1) Object.assign(t.state(), { t: turnStamp(t.cb), target: foe.id, n: null });
    return null;
  },
  ai: () => 0,
});
/** The Sidestep mark this attack uses, if any: the attacker's next Strike against that enemy this turn. */
function sidestepMark(cb: Combat, att: Unit, tgt: Unit): Record<string, any> | null {
  const s = (att as any).tech?.sidestep; if (!s || s.t !== turnStamp(cb) || s.target !== tgt?.id) return null;
  const a = strikingWith(att); if (!a || a.def.group !== 'strike' || a.def.system !== 'melee') return null;
  return s.n == null || s.n === chainOf(cb, att).n ? s : null; // spent by the first Strike that rolls (all of its rolls)
}
onHook('attack_preview', (ctx: any, cb) => {
  if (!ctx.att || !ctx.tgt) return;
  if (sidestepMark(cb, ctx.att, ctx.tgt)) {
    const sh = shieldBonus(ctx.tgt); if (sh) ctx.terms.push({ v: sh, label: 'Sidestep: shield ignored' });
    ctx.ignoreCover = true; // flanking: the target's cover doesn't count
  }
});
onHook('attack_roll', (ctx: any, cb) => { if (ctx.att && ctx.tgt) { const s = sidestepMark(cb, ctx.att, ctx.tgt); if (s && s.n == null) s.n = chainOf(cb, ctx.att).n; } });

// ---------- 16. Guard ----------
// +2 Defense against melee until your next turn, and your Momentum doesn't drop at the end of this turn. Reach: enemies
// must make a Body save to step next to you. Heavy: the +2 also applies to ranged attacks from the front.
// The front is the way the user faced when it took Guard: toward args.tile if named, else toward the nearest enemy.
const guardOf = (u: Unit): Record<string, any> | null => { const g = (u as any).tech?.guard; return g?.on ? g : null; };
/** The front: within 67.5° of the facing (three of the eight directions, as a riot shield's front). */
const FRONT_COS = Math.cos((67.5 * Math.PI) / 180);
function inFront(g: Record<string, any>, from: string, at: string): boolean {
  const [fx, fy] = g.front || [0, 0]; if (!fx && !fy) return false;
  const [x, y] = xy(at), [ax, ay] = xy(from), dx = ax - x, dy = ay - y, l = Math.hypot(dx, dy) * Math.hypot(fx, fy);
  return l > 0 && (dx * fx + dy * fy) / l >= FRONT_COS - 1e-9;
}
technique({
  id: 'guard',
  check(t) { return guardOf(t.u) && guardOf(t.u)!.t === turnStamp(t.cb) ? 'You are already on Guard.' : null; },
  run(t) {
    const p = t.line('reach', 'heavy'), def = t.num('defense', 2);
    const foes = t.cb.units.filter((v) => v.side !== t.u.side && alive(v)).sort((a, b) => dist(a.pos, t.u.pos) - dist(b.pos, t.u.pos) || (a.id < b.id ? -1 : 1));
    const face = t.args.tile && t.args.tile !== t.u.pos ? t.args.tile : foes[0]?.pos || null;
    const [ux, uy] = xy(t.u.pos), front = face ? (() => { const [x, y] = xy(face); return [x - ux, y - uy]; })() : [0, 0];
    if (t.preview) {
      t.note('+' + def + ' Defense against melee until your next turn' + (p === 'heavy' ? ', and against ranged attacks from the front' : '') + '. Your Momentum doesn\'t drop at the end of this turn.');
      if (p === 'reach') t.note('Enemies must make a Body save to step next to you.');
      return null;
    }
    Object.assign(t.state(), { on: true, t: turnStamp(t.cb), def, reach: p === 'reach', heavy: p === 'heavy', front });
    holdMomentum(t);
    t.cb.log.push(t.u.name + ' is on Guard (+' + def + ' Defense against melee' + (p === 'heavy' ? ' and shots from the front' : '') + ').');
    return null;
  },
  ai: (t) => (t.u.ap <= 1 && t.cb.units.some((v) => v.side !== t.u.side && alive(v) && dist(v.pos, t.u.pos) <= 2) ? 4 : 0),
});
onHook('turn_start_pre', (ctx: any) => { const g = ctx.u && (ctx.u as any).tech?.guard; if (g?.on) delete g.on; }); // until your next turn
onHook('attack_preview', (ctx: any) => {
  const tgt: Unit = ctx.tgt, att: Unit = ctx.att; if (!tgt || !att || att.side === tgt.side) return;
  const g = guardOf(tgt); if (!g) return;
  if (ctx.melee || (g.heavy && inFront(g, att.pos, tgt.pos))) ctx.terms.push({ v: -(g.def || 0), label: 'Guard' });
});
// Reach: an enemy stepping next to a guard makes a Body save; on a failure it stops on the tile it came from. Forced
// moves are not steps.
onHook('move_step', (ctx: any, cb) => {
  const m: Unit = ctx.u; if (!m || ctx.forced || ctx.how === 'forced' || !ctx.rng || !alive(m) || ctx.stop) return;
  for (const h of cb.units) {
    const g = guardOf(h); if (!g?.reach || h.side === m.side || !alive(h) || dist(h.pos, ctx.at) > 1 || dist(h.pos, ctx.from) <= 1) continue;
    if (bodySave(cb, ctx.rng, m, h.name + '\'s Guard')) continue;
    m.pos = ctx.from; ctx.stop = 'guard';
    cb.log.push(m.name + ' can\'t get past ' + h.name + '\'s guard and stops at ' + refOf(m.pos) + '.');
    return;
  }
});
// The Defender (the ranged proposal, section 6): Pressure comes off its Guard first, each point that would land costing
// 1 Guard instead, with no reaction, while it has any.
pressureFilter((cb, target, n) => {
  if (target.resMax?.guard == null) return n;
  const g = resOf(target, 'guard'), take = Math.min(g, n); if (!take) return n;
  target.res!.guard = g - take;
  cb.log.push(target.name + ' takes ' + take + ' Pressure on Guard (' + (g - take) + ' Guard left).');
  return n - take;
});

// ---------- 17. Shove ----------
// Today's Shove (push 1 tile, or Prone if blocked), at 1 AP as a Link. It gives Momentum when it works.
// Blunt or Heavy: 2 tiles. Reach: from 2 tiles away.
function shoveLine(t: Tech) { const p = t.line('blunt', 'heavy', 'reach'); return { p, range: p === 'reach' ? t.num('reach_range', 2) : t.num('range', 1), tiles: p === 'blunt' || p === 'heavy' ? t.num('heavy_tiles', 2) : t.num('tiles', 1) }; }
technique({
  id: 'shove',
  check(t) {
    const e = enemyCheck(t, 'shove'); if (e) return e;
    const { range } = shoveLine(t), tgt = t.tgt!;
    if (dist(t.u.pos, tgt.pos) > range) return range > 1 ? 'Shove someone within ' + range + ' tiles.' : 'Shove someone next to you.';
    const to = awayFrom(t.u.pos, tgt.pos);
    if ((!to || !freeTile(t.cb, to, tgt)) && tgt.prone) return tgt.name + ' is already Prone and has nowhere to go.';
    return null;
  },
  run(t) {
    const tgt = t.tgt!, { tiles } = shoveLine(t);
    const im = immune({ u: tgt }, 'shove'); if (im) { t.note(tgt.name + ' doesn\'t budge (' + im + ').'); return null; }
    const to = awayFrom(t.u.pos, tgt.pos), blocked = !to || !freeTile(t.cb, to, tgt);
    if (t.preview && !blocked) forceMove(t, tgt, 'away', tiles); // where the push would leave it
    const ok = stop(t, tgt, blocked ? 'prone' : 'push', { tiles });
    if (ok) landed(t);
    return null;
  },
  ai: (t) => (t.tgt && t.tgt.side !== t.u.side && dist(t.u.pos, t.tgt.pos) <= 1 ? 3 : 0),
});

// ---------- 18. Trip ----------
// The target makes a Body save or falls Prone. Hook or Reach: the save is at −2. Bare: you may go Prone with it and it
// is Grappled (args.opt 'grapple').
technique({
  id: 'trip',
  check(t) {
    const e = enemyCheck(t, 'trip'); if (e) return e;
    const tgt = t.tgt!, r = reachOf(t);
    if (dist(t.u.pos, tgt.pos) > r) return r > 1 ? 'Trip someone within ' + r + ' tiles.' : 'Trip someone next to you.';
    if (tgt.prone) return tgt.name + ' is already Prone.';
    if (t.args.opt === 'grapple' && (t.line('hook', 'reach', 'bare') !== 'bare' || dist(t.u.pos, tgt.pos) > 1)) return 'Going down with it needs a Bare weapon and the target next to you.';
    return null;
  },
  run(t) {
    const tgt = t.tgt!, p = t.line('hook', 'reach', 'bare'), harder = p === 'hook' || p === 'reach' ? t.num('save_penalty', 2) : 0;
    const grapple = p === 'bare' && t.args.opt === 'grapple';
    if (t.preview && p === 'bare' && !grapple) t.note('Bare: you may go Prone with it, and then it is Grappled.');
    const ok = stop(t, tgt, 'prone', { save: ['body'], tnAdd: harder });
    if (!ok) return null;
    landed(t);
    if (grapple) {
      if (t.preview) t.note('You go Prone with it.');
      else if (!t.u.prone) { t.u.prone = true; t.u.braced = false; emitFx(t.cb, 'stance', { unit: t.u.id, at: t.u.pos, what: 'prone' }); t.cb.log.push(t.u.name + ' goes down with ' + tgt.name + '.'); }
      cond(t, tgt, 'grappled');
    }
    return null;
  },
  ai: (t) => (t.tgt && t.tgt.side !== t.u.side && !t.tgt.prone && dist(t.u.pos, t.tgt.pos) <= reachOf(t) ? 4 : 0),
});

// ---------- 19. Drag ----------
// Pull an adjacent or reached target 1 tile toward you, or swap tiles with it (Body save). Hook: 2 tiles, and from 2
// tiles away with Reach. Bare: you may move 1 tile and bring it with you.
// args.opt: 'pull' (the default when it can be pulled), 'swap' (the default next to you), 'carry' (Bare; args.tile is
// the user's step, next to the user).
function dragPlan(t: Tech): { how: 'pull' | 'swap' | 'carry'; why?: string } {
  const tgt = t.tgt!, near = dist(t.u.pos, tgt.pos) <= 1, opt = t.args.opt;
  const how = opt === 'swap' || opt === 'carry' || opt === 'pull' ? opt : near ? 'swap' : 'pull';
  if (how === 'pull') {
    const [ux, uy] = xy(t.u.pos), [x, y] = xy(tgt.pos), to = key(x - Math.sign(x - ux), y - Math.sign(y - uy));
    if (near || to === t.u.pos) return { how, why: 'It is already next to you: swap tiles with it' + (t.line('hook', 'bare') === 'bare' ? ', or take it with you' : '') + '.' };
    if (!freeTile(t.cb, to, tgt)) return { how, why: 'Something is in the way.' };
  }
  if (how === 'swap' && !near) return { how, why: 'Swap tiles with someone next to you.' };
  if (how === 'carry') {
    if (t.line('hook', 'bare') !== 'bare') return { how, why: 'Taking it with you needs a Bare weapon.' };
    if (!near) return { how, why: 'Take someone next to you.' };
    const blk = moveBlock(t.u); if (blk) return { how, why: blk };
    if (!t.args.tile || dist(t.args.tile, t.u.pos) !== 1 || !freeTile(t.cb, t.args.tile, t.u)) return { how, why: 'Pick a free tile next to you to step to.' };
  }
  return { how };
}
/** Swap the user and the target, as a forced move for it and a step for the user (held shots see both). */
function swap(t: Tech, tgt: Unit): boolean {
  const cb = t.cb, u = t.u, a = u.pos, b = tgt.pos;
  if (t.preview) { (t.pv.moves ||= []).push({ unit: tgt.id, to: a }, { unit: u.id, to: b }); return true; }
  const fm: any = emit(cb, 'forced_move', { u: tgt, by: u, tiles: 1, to: a, how: 'drag', cancel: false, cb, rng: t.rng });
  if (fm.cancel) { cb.log.push(tgt.name + ' holds firm.'); return false; }
  tgt.pos = a; u.pos = b; tgt.braced = false; u.braced = false; u.moved = true;
  emitFx(cb, 'shove', { unit: u.id, target: tgt.id, from: b, to: a, ok: true }); moveFx(cb, u, [a, b], 'drag');
  cb.log.push(u.name + ' and ' + tgt.name + ' swap places (' + t.def.name + ').');
  emit(cb, 'move_step', { u: tgt, from: b, at: a, i: 0, route: [b, a], how: 'forced', stop: false, cb, rng: t.rng, forced: true });
  if (alive(tgt)) triggerOverwatch(cb, t.rng, tgt);
  if (alive(u)) { emit(cb, 'move_step', { u, from: a, at: b, i: 0, route: [b], how: 'drag', stop: false, cb, rng: t.rng, technique: t.def.id }); if (alive(u) && !u.hidden) triggerOverwatch(cb, t.rng, u, [a, b]); }
  return true;
}
technique({
  id: 'drag',
  check(t) {
    const e = enemyCheck(t, 'drag'); if (e) return e;
    const r = reachOf(t); if (dist(t.u.pos, t.tgt!.pos) > r) return r > 1 ? 'Drag someone within ' + r + ' tiles.' : 'Drag someone next to you.';
    return dragPlan(t).why || null;
  },
  run(t) {
    const tgt = t.tgt!, { how } = dragPlan(t), p = t.line('hook', 'bare');
    if (save(t, tgt, ['body'])) return null; // it holds firm: no Momentum
    let worked = false;
    if (how === 'pull') worked = forceMove(t, tgt, 'toward', p === 'hook' ? t.num('hook_tiles', 2) : t.num('tiles', 1)) > 0;
    else if (how === 'swap') worked = swap(t, tgt);
    else {
      const from = t.u.pos, to = t.args.tile!, [fx, fy] = xy(from), [x, y] = xy(to), [tx, ty] = xy(tgt.pos);
      const keep = key(tx + x - fx, ty + y - fy), dest = keep !== to && freeTile(t.cb, keep, tgt) ? keep : from; // beside you as it was, else where you stood
      if (t.preview) { stepUser(t, [to]); (t.pv.moves ||= []).push({ unit: tgt.id, to: dest }); worked = true; }
      else if (stepUser(t, [to]) && alive(t.u) && alive(tgt)) worked = forceMove(t, tgt, dest, 1) > 0;
    }
    if (worked) landed(t);
    else if (!t.preview) t.cb.log.push(tgt.name + ' doesn\'t move.');
    return null;
  },
  ai: () => 0,
});

// Calls (rules 1.13): the nine handlers, one per gamma skill. Each reads its step's numbers from data/calls.json and
// describes itself in a preview (t.preview) without changing anything. What a Call leaves standing (a mark on a unit)
// is kept and used up by rules.ts, on real events only.
import { type Unit, alive, dist, paths, moveBlock, moveUnit, reload, reloadRefused, toggleProne, pickUp, objectsOf, unitSees, key, xy } from '../combat';
import { WEAPON } from '../data';
import { magazineSize } from '../character';
import { pileAt } from '../containers';
import { charOfUnit } from '../effects/hooks';
import { condOn, endCond, applyCond } from '../magic';
import { canReact, useReaction, maxReactions, setThreaten } from '../tactics';
import { lowerPressureOf, pressureOf, isSuppressed, isPressed } from '../physical/pressure';
import type { Combat } from '../combat';
import type { Rng } from '../rng';
import type { Call } from './types';
import { CALL } from './data';
import { call, callMarks, callLevel, giveAp, hinder } from './core';

const plural = (n: number, w: string) => n + ' ' + w + (n === 1 ? '' : 's');

// ---------- Order (Authority): an ally does one thing now, on their reaction, for none of their AP ----------
const THINGS = ['reload', 'stand', 'pickup', 'move'] as const;
type Thing = (typeof THINGS)[number];
const THING_WORDS: Record<Thing, string> = { reload: 'reload', stand: 'stand up', pickup: 'pick up', move: 'move' };
const orderThings = (t: Call): string[] => String(t.args.opt || '').split('+').map((x) => x.trim()).filter(Boolean);
/** The tiles an Order moves an ally: their Movement (what 1 AP walks them), at least 1. */
export const orderMoveTiles = (u: Unit): number => Math.max(1, Math.floor(u.movement));
/** The pile an ordered ally would pick up from: under them, else the first next to them (by tile key). */
function pileNear(cb: Combat, u: Unit): string | null {
  const objs = objectsOf(cb), [x, y] = xy(u.pos);
  const tiles = [u.pos]; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) tiles.push(key(x + dx, y + dy));
  for (const k of tiles) { const p = pileAt(objs, k); if (p && !p.hidden && p.items?.length) return k; }
  return null;
}
/** Why this ally can't do this thing on an order (null: it can). `stood`: an earlier thing of the same order stands them up. */
function thingWhy(t: Call, th: Thing, stood: boolean): string | null {
  const a = t.tgt, cb = t.cb;
  if (th === 'reload') {
    const w = WEAPON[a.weapon]; if (!w || w.magazine == null) return a.name + ' has nothing to reload.';
    const no = reloadRefused(a, a.weapon, cb); if (no) return no;
    if (w.reload === 'magazine' && a.ammo >= (magazineSize(w.id, a.mods) ?? w.magazine) && !a.jammed) return a.name + '\'s weapon is already full.';
    return null;
  }
  if (th === 'stand') return a.prone ? null : a.name + ' isn\'t prone.';
  if (th === 'pickup') return !a.charId ? 'Only a character picks things up.' : pileNear(cb, a) ? null : 'Nothing for ' + a.name + ' to pick up there.';
  if (!t.num('move')) return 'Ordering a move needs 3 points of Authority.';
  if (!t.args.tile) return 'Pick the tile ' + a.name + ' moves to.';
  const was = a.prone; if (stood) a.prone = false; // read as if the stand-up before it had happened (put back at once)
  const blk = moveBlock(a); a.prone = was; if (blk) return a.name + ': ' + blk;
  const d = paths(cb, a.pos, a.id).dist[t.args.tile];
  if (d === undefined || d < 1) return a.name + ' can\'t reach that tile.';
  if (d > orderMoveTiles(a)) return 'Too far: ' + a.name + ' moves ' + plural(orderMoveTiles(a), 'tile') + ' on an order.';
  return null;
}
/** Do one ordered thing for none of the ally's AP: the engine's own action, with its cost lent and taken back. */
function doThing(t: Call, th: Thing): string | null {
  const a = t.tgt, cb = t.cb;
  if (th === 'reload') return reload(cb, a, { free: true });
  if (th === 'move') return moveUnit(cb, a, t.args.tile!, t.rng, 'move', { free: true, oa: true, shortest: true });
  const before = a.ap; a.ap = before + 10;
  const err = th === 'stand' ? toggleProne(cb, a) : pickUp(cb, a, pileNear(cb, a) || a.pos, null, charOfUnit(a));
  a.ap = Math.max(before, a.ap - 10); // what the action cost is waived; AP an item gave on it is kept
  return err;
}
call({
  id: 'call.order',
  check(t) {
    const a = t.tgt, th = orderThings(t), max = t.num('things', 1);
    if (!th.length) return 'Pick what to order: ' + THINGS.filter((x) => x !== 'move' || t.num('move')).map((x) => THING_WORDS[x]).join(', ') + '.';
    if (th.some((x) => !(THINGS as readonly string[]).includes(x))) return 'An Order is to reload, stand up, pick up or move. Never to attack.';
    if (new Set(th).size !== th.length) return 'Order two different things.';
    if (th.length > max) return max > 1 ? 'An Order is two things at most.' : 'One thing an Order (two from 7 points of Authority).';
    if (condOn(a, 'stunned')) return a.name + ' is Stunned and can\'t follow an order.';
    if (!canReact(t.cb, a)) return a.name + ' has no reaction left to act on.';
    let stood = false;
    for (const x of th as Thing[]) { const no = thingWhy(t, x, stood); if (no) return no; if (x === 'stand') stood = true; }
    return null;
  },
  run(t) {
    const a = t.tgt, th = orderThings(t) as Thing[];
    if (t.preview) {
      t.note(a.name + ' will ' + th.map((x) => THING_WORDS[x]).join(', then ') + ' now, on their reaction, for none of their AP.');
      if (th.includes('move') && t.args.tile) (t.pv.moves ||= []).push({ unit: a.id, to: t.args.tile });
      return null;
    }
    const first = doThing(t, th[0]); if (first) return first; // refused before anything changed: the Call isn't spent
    useReaction(t.cb, a);
    for (const x of th.slice(1)) { if (!alive(a)) break; const no = doThing(t, x); if (no) t.note(a.name + ' can\'t ' + THING_WORDS[x] + ': ' + no); }
    t.note(a.name + ' acts on their reaction, for none of their AP.');
    return null;
  },
});

// ---------- Rally (Charisma): AP, and Pressure shed ----------
call({
  id: 'call.rally',
  run(t) {
    const n = t.num('ap', 1), shed = t.num('pressure');
    giveAp(t, n);
    if (shed && pressureOf(t.tgt) > 0) { if (t.preview) t.note(t.tgt.name + ' sheds ' + shed + ' Pressure.'); else lowerPressureOf(t.cb, t.tgt, shed, 'Rally', t.u); }
    return null;
  },
  // an officer steadies a soldier who is Pressed (from step 2 it sheds a pip too)
  ai(t) { return t.tgt !== t.u && isPressed(t.tgt) ? 6 + (t.num('pressure') ? 0.5 : 0) : 0; },
});

// ---------- Brief (Eloquence): the next actions cost less ----------
call({
  id: 'call.brief',
  run(t) {
    const cuts = [t.num('first', 1), t.num('second')].filter((n) => n > 0);
    if (t.preview) { t.note(t.tgt.name + '\'s next ' + (cuts.length > 1 ? 'two actions cost ' + cuts.join(' and ') + ' AP less' : 'action costs ' + cuts[0] + ' AP less') + ', until the end of their next turn.'); return null; }
    callMarks(t.tgt).brief = { by: t.u.id, side: t.u.side, cuts };
    return null;
  },
});

// ---------- Name It (Lore Master): cancels AP the unit would lose next turn ----------
call({
  id: 'call.name_it',
  run(t) {
    const all = !!t.num('all'), n = all ? 99 : t.num('cancel', 1), ends = !!t.num('ends_fear');
    const fears = ends ? ['shaken', 'fear'].filter((c) => condOn(t.tgt, c)) : [];
    if (t.preview) {
      t.note((all ? 'All the AP ' : 'Up to ' + n + ' AP ') + t.tgt.name + ' would lose at the start of their next turn is cancelled.');
      if (fears.length) t.note('Ends ' + fears.map((c) => (c === 'fear' ? 'Afraid' : 'Shaken')).join(' and ') + ' on ' + t.tgt.name + '.');
      return null;
    }
    const m = callMarks(t.tgt); m.cancel = { by: t.u.id, side: t.u.side, n: Math.max(m.cancel?.n || 0, n) };
    for (const c of fears) { endCond(t.tgt, c, t.cb); t.note(t.tgt.name + ' is no longer ' + (c === 'fear' ? 'Afraid' : 'Shaken') + '.'); }
    return null;
  },
});

// ---------- Cue (Reaction Speed): a second reaction; from step 2 it may be a step now; at step 3 the order ----------
call({
  id: 'call.cue',
  check(t) {
    const a = t.tgt;
    if (condOn(a, 'stunned')) return a.name + ' is Stunned and can\'t take a cue.';
    if (condOn(a, 'suppressed') || isSuppressed(a)) return a.name + ' is Suppressed: there is no reaction to add to.';
    if (maxReactions(a, t.cb) <= 0) return a.name + ' has no reaction this round to add to.';
    if (t.args.tile) {
      if (!t.num('step')) return 'A cued step needs 3 points of Reaction Speed.';
      const blk = moveBlock(a); if (blk) return a.name + ': ' + blk;
      if (paths(t.cb, a.pos, a.id).dist[t.args.tile] !== 1) return 'The cued step is 1 tile, to a free tile next to ' + a.name + '.';
    }
    return null;
  },
  run(t) {
    const a = t.tgt, cb = t.cb, tile = t.args.tile;
    // step 3: an ally still to act this round acts straight after the speaker (only on the speaker's own turn)
    const mine = !cb.window && cb.order[cb.turn] === t.u.id && !t.react, at = cb.order.indexOf(a.id, cb.turn + 1);
    const jump = !!t.num('order') && mine && at > cb.turn + 1;
    if (t.preview) {
      if (tile) { t.note(a.name + ' steps to the named tile now, on the extra reaction (free, no opportunity attack).'); (t.pv.moves ||= []).push({ unit: a.id, to: tile }); }
      else t.note(a.name + ' has one more reaction until the start of your next turn.');
      if (jump) t.note(a.name + ' acts straight after you this round.');
      return null;
    }
    if (tile) { const no = moveUnit(cb, a, tile, t.rng, 'move', { free: true, shortest: true, part: true }); if (no) return no; t.note(a.name + ' steps on the cue.'); }
    else callMarks(a).cue = { by: t.u.id, side: t.u.side, r: cb.round };
    if (jump) {
      (cb as any).callOrder ||= [...cb.order]; // put back when the round ends (rules.ts)
      cb.order.splice(at, 1); cb.order.splice(cb.turn + 1, 0, a.id);
      t.note(a.name + ' acts straight after ' + t.u.name + ' this round.');
    }
    return null;
  },
});

// ---------- Spot (Vigilance): the next ally's attack on it ignores cover; step 2: not Hidden to them; step 3: two, +1 ----------
call({
  id: 'call.spot',
  seesHidden(t) { return !!t.num('unhide') && unitSees(t.cb, t.u, t.tgt.pos); },
  run(t) {
    const left = t.num('allies', 1), hit = t.num('hit'), unhide = !!t.num('unhide');
    if (t.preview) {
      t.note('The next ' + (left > 1 ? left + ' allies' : 'ally') + ' to attack ' + t.tgt.name + ' ' + (left > 1 ? 'ignore' : 'ignores') + ' its cover' + (hit ? ', at +' + hit + ' to hit' : '') + (unhide ? '; it isn\'t Hidden to them' : '') + '. Until the start of your next turn.');
      return null;
    }
    callMarks(t.tgt).spot = { by: t.u.id, side: t.u.side, r: t.cb.round, left, users: [], live: null, hit, unhide };
    return null;
  },
});

// ---------- Warn (Senses): a step before the next attack on them; step 3: that attack at −2 ----------
call({
  id: 'call.warn',
  check(t) {
    if (!t.args.tile) return null;
    const d = paths(t.cb, t.tgt.pos, t.tgt.id).dist[t.args.tile];
    return d === undefined || d < 1 || d > t.num('tiles', 1) ? 'The named tile must be within ' + plural(t.num('tiles', 1), 'step') + ' of ' + t.tgt.name + '.' : null;
  },
  run(t) {
    const tiles = t.num('tiles', 1), hit = t.num('hit');
    if (t.preview) {
      t.note('Before the next attack on ' + t.tgt.name + ', they step up to ' + plural(tiles, 'tile') + ' clear' + (t.args.tile ? ' (to the named tile)' : '') + (hit ? '; that attack is at ' + hit + ' to hit' : '') + '. Until the start of your next turn.');
      return null;
    }
    callMarks(t.tgt).warn = { by: t.u.id, side: t.u.side, r: t.cb.round, tiles, hit, ...(t.args.tile ? { to: t.args.tile } : {}) };
    return null;
  },
});

// ---------- Threaten (Intimidation): a Heart save, or Shaken and AP lost next turn ----------
/** What a Threaten that landed does beyond Shaken: AP lost on the target's next turn, and from step 2 it can't move
 * toward the speaker on that turn. Returns the words for the log. */
function threatened(cb: Combat, u: Unit, tgt: Unit, apLoss: number, noApproach: boolean): string {
  const m = callMarks(tgt);
  if (apLoss > 0) m.apLoss = { by: u.id, side: u.side, n: Math.max(m.apLoss?.n || 0, apLoss) };
  if (noApproach) m.cowed = { by: u.id, side: u.side, ...(!cb.window && cb.order[cb.turn] === tgt.id ? { fresh: true } : {}) };
  return (apLoss > 0 ? '−' + apLoss + ' AP on its next turn' : '') + (noApproach ? (apLoss > 0 ? ', and ' : '') + 'it can\'t move toward ' + u.name + ' on that turn' : '');
}
call({
  id: 'call.threaten',
  run(t) {
    const apLoss = t.num('ap_loss', 1), noApproach = !!t.num('no_approach');
    if (t.preview) { hinder(t, 'shaken'); t.note('On a failed save: Shaken, −' + apLoss + ' AP on its next turn' + (noApproach ? ', and it can\'t move toward you on that turn' : '') + '.'); return null; }
    if (hinder(t, 'shaken')) t.note(t.tgt.name + ': ' + threatened(t.cb, t.u, t.tgt, apLoss, noApproach) + '.');
    return null;
  },
  // an officer leans on the fighter who is hurting its side most: one that isn't Shaken yet and is still above half HP
  ai(t) { return !condOn(t.tgt, 'shaken') && t.tgt.hp > t.tgt.maxHp / 2 ? 6 + t.tgt.hp / Math.max(1, t.tgt.maxHp) * 0.5 : 0; },
});
// combat/parley kind 'threaten' is the Threaten Call's effect (tactics.ts keeps the action, its 2 AP, its 8 tiles and
// the 'parley' hook Crowd-Pleaser listens on): the same Heart save, Shaken, and the AP loss of the speaker's step (a
// speaker with no Intimidation speaks at step 1). It counts as the target's hindering Call of the round.
setThreaten({
  refuse(cb, u, tgt) { const m = tgt.call?.hindered; return m && m.r === cb.round ? tgt.name + ' has already been hindered by a Call this round.' : null; },
  run(cb: Combat, rng: Rng, u: Unit, tgt: Unit, tnAdd: number, via?: string) {
    const def = CALL['call.threaten'], lv = Math.max(1, callLevel(u, def)), st = def.steps[Math.max(0, def.steps.filter((s) => lv >= s.at).length - 1)];
    callMarks(tgt).hindered = { r: cb.round, id: def.id, side: u.side };
    const at0 = tgt.condAt?.shaken;
    let out = applyCond(cb, rng, u, tgt, 'shaken', undefined, 'heart', { tnAdd, via: via || def.skill });
    if (condOn(tgt, 'shaken') && tgt.condAt?.shaken !== at0) out += ' · ' + threatened(cb, u, tgt, st.numbers.ap_loss ?? 1, !!st.numbers.no_approach);
    return out;
  },
});

// ---------- Taunt (Insinuation): a Heart save, or its next attack must go at you; steps 2 and 3: at +1, +2 AP ----------
call({
  id: 'call.taunt',
  run(t) {
    const more = t.num('attack_ap');
    if (t.preview) { hinder(t, 'taunted'); t.note('On a failed save: Taunted, its next attack must go at you' + (more ? ', and costs it ' + more + ' AP more' : '') + '.'); return null; }
    if (hinder(t, 'taunted')) { if (more) { callMarks(t.tgt).tauntAp = { by: t.u.id, side: t.u.side, n: more }; t.note(t.tgt.name + '\'s attack on ' + t.u.name + ' costs it ' + more + ' AP more.'); } }
    return null;
  },
  // a champion pulls a fighter off a wounded ally of its own
  ai(t) {
    if (condOn(t.tgt, 'taunted') || dist(t.u.pos, t.tgt.pos) > 6) return 0;
    const hurt = t.cb.units.some((v) => v !== t.u && v.side === t.u.side && alive(v) && v.hp <= v.maxHp / 2 && dist(v.pos, t.tgt.pos) <= 6);
    return hurt && t.u.hp > t.u.maxHp / 2 ? 6.5 : 0;
  },
});

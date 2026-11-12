// Skeleton 2.0 (rules 1.13), the perk and unlock pass: the items that were replaced or became passives.
//   Raw Power 3 · Heavy Hands      a melee technique's push moves its target 1 tile further
//   Raw Power 5 · Follow Through   a Finisher that takes its target out leaves you 1 Momentum
//   Breaching Strike I/II (perk)   a target pushed up against a wall or another enemy takes the hit again at half
//   Iron Grip I/II (perk)          replaces Grapple: riders on a target you have Bound or Grappled
//   Both Hands I/II (perk)         replaces Origami Hands: blade in one hand, gun in the other
//   Dexterity 5 · Quick Draw       the first attack of a fight with a weapon drawn for it costs no AP
//   Improvisation 5 · Tuned        the weapon in your main hand never jams and never breaks
//   Camaraderie 3 · Hand-Off       once a round an adjacent ally uses your Defense against one attack
//   Composure 5 · Stand Still      until you first act in a fight: −2 to hit you, and the first miss gives a free attack
// Every number here is PROVISIONAL (spec section 14).
//
// Wired in physical/core.ts: Heavy Hands (forceMove asks 'push_tiles'), Quick Draw (apFor names its technique in
// 'attack_preview'), Iron Grip II (finisherNeed asks 'momentum_needed:<id>'), and Breaching Strike against a push that
// is blocked at once (forceMove calls slam through setSlam, below).
import { register, stateOf, applyDamage, emit, has, tierOf, type Holder } from '../effects';
import { onHook, charOfUnit } from '../effects/hooks';
import { landed } from '../effects/output';
import { type Combat, type Unit, key, xy, dist, alive, moveBlockers, emitFx, attackDamage, checkOver, previewAttack, resolveAttack, isMelee } from '../combat';
import { WEAPON } from '../data';
import { resGain, resOf } from '../tactics';
import { condSource } from '../magic';
import { die } from '../rng';
import { TECHNIQUE } from '../physical/data';
import { strikingWith, ensureMomentum, turnStamp, setSlam } from '../physical/core';
import { overworld, say } from '../kit';

const tierII = (h: Holder) => h.tier === 'II';
/** An item's per-fight state, read without creating it (previews and stat queries change nothing). */
const peek = (h: Holder): Record<string, any> => (h.u?.ps?.[h.key] as any) || {};
/** Does `u` hold `t`: Grappled by it, or Bound by it (physical/melee: Bind's state, Throw Down's own test). */
export const holds = (u: Unit, t: Unit): boolean => alive(t) && dist(u.pos, t.pos) <= 1 && (condSource(t, 'grappled') === u.id || u.tech?.bind?.target === t.id);
const heldOf = (cb: Combat, u: Unit): Unit[] => cb.units.filter((t) => t !== u && holds(u, t));
/** +1 Momentum for a unit with a melee weapon in a hand, shown on its meter. Returns what it gained. */
function giveMomentum(cb: Combat, u: Unit, silent = false): number {
  ensureMomentum(u); const was = resOf(u, 'momentum'), got = resGain(u, 'momentum', 1);
  if (got && !silent) emitFx(cb, 'momentum', { unit: u.id, now: resOf(u, 'momentum'), was });
  return got;
}

// ---------- Raw Power · Heavy Hands (Mastery 1) ----------
// A melee technique of yours that pushes moves its target 1 tile further: the answer to the core's 'push_tiles' query
// (W1), so the technique's card, its preview and the push itself agree.
register({ id: 'raw_power.3', kind: 'skill', claims: 'all', stat: (_h, stat, ctx) => (stat === 'push_tiles' && ctx?.system === 'melee' ? 1 : 0), brief: () => null });

// =====================================================================================================================
// Breaching Strike (Raw Power; a passive since rules 1.13, name kept). When one of your melee techniques pushes a target
// and a wall, a solid object or another enemy of yours stops it, it takes the hit again at half: half of the damage of
// the hit that pushed it (a push with no hit of its own, Shove: half a plain blow with the weapon in hand). II: the
// enemy it was pushed into takes the same. The core moves a pushed unit tile by tile and emits 'forced_move' for each
// tile it takes ({u, by, to, how: the technique}) and nothing for a blocked one, so the push is followed here and
// settled when the action is done: the target was moved, and the tile beyond it, the same way, is blocked (W4).
// =====================================================================================================================
const NOT_A_PUSH = new Set(['drag', 'throw_down', 'iron_grip']);
interface Push { from: string; to: string }
const BREACH = 'breaching_strike';
onHook('forced_move', (ctx: any) => {
  const by: Unit | undefined = ctx.by, t: Unit | undefined = ctx.u; if (!by || !t || ctx.cancel || !ctx.to || NOT_A_PUSH.has(ctx.how)) return;
  if (TECHNIQUE[ctx.how]?.system !== 'melee' || dist(by.pos, ctx.to) <= dist(by.pos, t.pos)) return; // a melee technique, moving it away
  if (!has(by, BREACH)) return;
  (((by as any)._push ||= {}) as Record<string, Push>)[t.id] = { from: t.pos, to: ctx.to };
});
onHook('on_hit', (ctx: any) => { const a: Unit = ctx.att; if (ctx.melee && a && has(a, BREACH)) ((a as any)._hit ||= {})[ctx.tgt.id] = ctx.dmg; });
onHook('action_done', (_ctx: any, cb) => {
  for (const by of [...cb.units]) {
    const pushes = (by as any)._push as Record<string, Push> | undefined, hits = ((by as any)._hit || {}) as Record<string, number>;
    delete (by as any)._push; delete (by as any)._hit;
    if (!pushes || !alive(by) || cb.over) continue;
    for (const [id, p] of Object.entries(pushes)) {
      const t = cb.units.find((x) => x.id === id); if (!t || !alive(t) || t.pos !== p.to || !alive(by)) continue;
      const [fx, fy] = xy(p.from), [tx, ty] = xy(p.to), b = blockerAt(cb, key(tx + Math.sign(tx - fx), ty + Math.sign(ty - fy)), t);
      if (b) { slam(cb, by, t, b, hits[id]); checkOver(cb); }
    }
  }
});
/** What stands on a tile for a pushed unit: 'wall' (off the map, a solid tile, a blocking object), a unit, or null. */
function blockerAt(cb: Combat, k: string, mover: Unit): 'wall' | Unit | null {
  const [x, y] = xy(k); if (x < 0 || y < 0 || x >= cb.map.w || y >= cb.map.h || moveBlockers(cb).has(k)) return 'wall';
  return cb.units.find((v) => v !== mover && !v.dead && v.pos === k) || null;
}
/** Breaching Strike: `t`, pushed by `by`, is stopped by a wall or by the unit `into`. Half the hit again (II: the enemy
 * it hit takes the same). Nothing for a holder without the perk, or when `into` is on the pusher's side. */
export function slam(cb: Combat, by: Unit, t: Unit, into: 'wall' | Unit, hit?: number): void {
  const tier = tierOf(by, BREACH); if (!tier || (into !== 'wall' && into.side === by.side)) return;
  let base = hit;
  if (base == null) { const d = attackDamage(cb, by, t, 'melee', by.companion ? null : charOfUnit(by), { preview: true }); base = landed(d.total, d.armour); }
  const dmg = Math.max(1, Math.floor(base / 2)), src: any = { by, type: 'weapon', melee: true, mode: 'melee', shield: true, credit: 'all' };
  const r = applyDamage(cb, t, dmg, src);
  emitFx(cb, 'perk', { unit: by.id, target: t.id, from: by.pos, to: t.pos, id: BREACH });
  say(cb, t.name + ' is slammed into ' + (into === 'wall' ? 'the wall' : into.name) + ' (Breaching Strike): ' + r.amount + ' damage' + (r.killed ? ' · down' : '') + '.');
  if (tier === 'II' && into !== 'wall' && alive(into)) { const r2 = applyDamage(cb, into, dmg, { ...src }); say(cb, into.name + ' takes the same (Breaching Strike II): ' + r2.amount + ' damage' + (r2.killed ? ' · down' : '') + '.'); }
}
// The core's call for a push that a wall or a body stops (physical/core.ts forceMove): the hit that pushed it is this
// action's hit on it, and the push is settled here, so the end of the action doesn't count it a second time.
setSlam((cb, by, t, into, how) => {
  if (NOT_A_PUSH.has(how) || !has(by, BREACH)) return;
  const hit = ((by as any)._hit as Record<string, number> | undefined)?.[t.id];
  if ((by as any)._push) delete (by as any)._push[t.id];
  slam(cb, by, t, into, hit);
});
register({ id: BREACH, claims: 'all', brief: () => null });

// ---------- Raw Power · Follow Through (Mastery 2) ----------
// A Finisher that takes its target out (an enemy dropped or killed during it) leaves you 1 Momentum: given when the
// action is done, after the Finisher has spent the meter.
register({
  id: 'raw_power.5', kind: 'skill', claims: 'all',
  on: {
    on_downed: (ctx, h) => { if (h.u && ctx.by === h.u && ctx.ownTurn && ctx.victim?.side !== h.u.side) stateOf(h).out = true; },
    turn_start: (ctx, h) => { if (ctx.u === h.u && peek(h).out) stateOf(h).out = false; },
    action_done: (ctx, h) => {
      if (ctx.u !== h.u || !h.u || !h.cb) return; const st = stateOf(h), out = st.out; st.out = false;
      if (!out || ctx.a?.type !== 'combat/technique' || TECHNIQUE[ctx.a.id]?.group !== 'finisher' || !alive(h.u)) return;
      if (giveMomentum(h.cb, h.u)) say(h.cb, h.u.name + ' follows through: 1 Momentum kept (Follow Through).');
    },
  },
  brief: () => null,
});

// =====================================================================================================================
// Iron Grip (Raw Power; replaces Grapple). A target you hold is one you have Grappled (Bind with bare hands, Trip's
// Bare line) or Bound (Bind with a weapon).
// I: it can't use Answers or reactions (every reaction window it would take is cancelled); an attack aimed at you has
//    a 50% chance to land on it instead (the old Grapple II); when you walk, it comes with you, into the tile you leave
//    (a forced move for it: held shots see it, and what can't be moved stays, which ends the hold as before).
// II: each of your melee techniques that hits it gives you 1 Momentum (once a technique; not a Finisher, which ends the
//    hold), and Throw Down on it needs no Momentum.
//    The second half is the answer to the core's 'momentum_needed:throw_down' query (W3): −99 while you hold someone.
// PROVISIONAL (spec 14): the proposal's tier II read "earns the variety bonus", which the Momentum rework removed; this
// is its reading under the new rule.
// =====================================================================================================================
register({
  id: 'iron_grip', claims: 'all',
  stat: (h, stat) => (stat === 'technique:grapple' ? 1 : stat === 'momentum_needed:throw_down' && tierII(h) && h.u && h.cb && heldOf(h.cb, h.u).length ? -99 : 0),
  on: {
    reaction_window: (ctx, h) => {
      const r: Unit | undefined = ctx.reactor; if (!h.u || !r || ctx.cancel || !alive(h.u) || !holds(h.u, r)) return;
      ctx.cancel = true; say(h.cb, r.name + ' can\'t react in ' + h.u.name + '\'s grip (Iron Grip).');
    },
    attack_target: (ctx, h) => {
      if (ctx.tgt !== h.u || !h.cb || !h.u || !alive(h.u)) return;
      const cap = heldOf(h.cb, h.u)[0]; if (!cap || ctx.att === cap || ctx.att.side === h.u.side) return;
      const r = ctx.rng || h.g?.rng; if (!r) return;
      const roll = die(r, 100); if (roll > 50) return;
      ctx.tgt = cap; say(h.cb, 'The blow aimed at ' + h.u.name + ' finds ' + cap.name + ' instead (Iron Grip, d100 ' + roll + ').');
    },
    // the walk is priced before a tile is taken: who is held now is who is dragged
    move_cost: (ctx, h) => { if (ctx.u === h.u && h.u && h.cb && !overworld(h.cb)) stateOf(h).drag = heldOf(h.cb, h.u).map((x) => x.id); },
    move_step: (ctx, h) => {
      const u = h.u, cb = h.cb; if (!u || !cb || ctx.u !== u || ctx.forced || ctx.how === 'drag' || !ctx.from) return;
      const ids: string[] = peek(h).drag || []; if (!ids.length) return;
      const t = cb.units.find((x) => ids.includes(x.id) && alive(x) && dist(x.pos, ctx.from) <= 1 && x.pos !== ctx.from);
      if (!t || t.nailed || cb.units.some((v) => !v.dead && v.pos === ctx.from)) return;
      const fm: any = emit(cb, 'forced_move', { u: t, by: u, tiles: 1, to: ctx.from, how: 'iron_grip', cancel: false, cb, rng: ctx.rng }); if (fm.cancel) return;
      const was = t.pos; t.pos = ctx.from; t.braced = false;
      emitFx(cb, 'shove', { unit: u.id, target: t.id, from: was, to: t.pos, ok: true });
      say(cb, u.name + ' drags ' + t.name + ' along (Iron Grip).');
      emit(cb, 'move_step', { u: t, from: was, at: t.pos, i: 0, route: [was, t.pos], how: 'forced', stop: false, cb, rng: ctx.rng, forced: true });
    },
    moved: (ctx, h) => { if (ctx.u === h.u) stateOf(h).drag = []; },
    on_hit: (ctx, h) => {
      const u = h.u, cb = h.cb; if (!tierII(h) || !u || !cb || ctx.att !== u || !ctx.melee || !holds(u, ctx.tgt)) return;
      const t: any = strikingWith(u); if (t?.def.group === 'finisher') return;
      if (t) { if (t._ironGrip) return; t._ironGrip = true; }
      // inside a technique the core shows the meter itself once the strike is done
      if (giveMomentum(cb, u, !!t)) say(cb, u.name + ' works the held ' + ctx.tgt.name + ': +1 Momentum (Iron Grip).');
    },
  },
  brief: () => null,
});

// =====================================================================================================================
// Both Hands (Dexterity; replaces Origami Hands). I: after one of your melee techniques hits, your next shot that turn
// has no Recoil. II: and after one of your shots hits, you gain 1 Momentum, once a turn (you need a melee weapon in a
// hand to have the meter). PROVISIONAL (spec 14): the proposal's second half read "counts as different for Momentum",
// the variety bonus the Momentum rework removed; this is its reading under the new rule. A thrown weapon is neither.
// =====================================================================================================================
register({
  id: 'both_hands', claims: 'all',
  on: {
    attack_preview: (ctx, h) => { if (ctx.att === h.u && h.cb && !ctx.melee && ctx.mode !== 'thrown' && peek(h).calm === turnStamp(h.cb)) ctx.noRecoil = true; },
    on_hit: (ctx, h) => {
      const u = h.u, cb = h.cb; if (!u || !cb || ctx.att !== u || ctx.mode === 'thrown') return; const st = stateOf(h), now = turnStamp(cb);
      if (ctx.melee) { st.calm = now; return; }
      st.calm = null; // this shot was the "next shot"
      if (!tierII(h) || st.gave === now) return;
      if (giveMomentum(cb, u)) { st.gave = now; say(cb, u.name + ' follows the shot in: +1 Momentum (Both Hands).'); }
    },
    on_miss: (ctx, h) => { if (ctx.att === h.u && !ctx.melee && ctx.mode !== 'thrown') stateOf(h).calm = null; },
  },
  brief: () => null,
});

// ---------- Dexterity · Quick Draw (Mastery 2) ----------
// Once per combat, the first attack you make with a weapon you draw for it (a technique that draws: Draw Cut, Snap
// Shot) costs 0 AP. The cost is zeroed where the core asks for a technique's AP ('attack_preview' with the technique's
// id, W2), so the card, the check and the charge agree; it is used up when such a technique has been used.
const draws = (id: any) => !!TECHNIQUE[id]?.needs?.stowed;
register({
  id: 'dexterity.5', kind: 'skill', claims: 'all',
  on: {
    attack_preview: (ctx, h) => { if (ctx.att === h.u && h.cb && !overworld(h.cb) && draws(ctx.tech) && !peek(h).drawn) ctx.ap = 0; },
    action_done: (ctx, h) => {
      const u = h.u, cb = h.cb, a = ctx.a; if (!u || !cb || ctx.u !== u || a?.type !== 'combat/technique' || overworld(cb) || !draws(a.id)) return;
      const st = stateOf(h); if (st.drawn) return; st.drawn = true;
      say(cb, u.name + ' had it out before anyone saw (Quick Draw).');
    },
  },
  brief: () => null,
});

// ---------- Improvisation · Tuned (Mastery 2) ----------
// The weapon in your main hand never jams and never breaks (PROVISIONAL reading of "the weapon you maintain", spec 14).
// The engine asks 'never_jams' wherever a shot, a natural 1 or Heat would jam the gun (combat.ts neverJams), so the
// attack's own line never says it jammed. Wear has no hook, so it is put right as soon as the attack is over: it stops
// at 1 point of Durability (the weapon is never broken). A jam from anywhere else (a spell, a class move) is cleared at
// once here. The +10% damage went.
function tune(h: Holder) {
  const u = h.u; if (!u) return;
  if (u.jammed) { u.jammed = false; say(h.cb, u.name + '\'s weapon doesn\'t jam (Tuned).'); }
  if (u.maxDur && (u.dur ?? u.maxDur) < 1) u.dur = 1;
}
register({
  id: 'proficiency.5', kind: 'skill', claims: 'all',
  stat: (_h, stat) => (stat === 'never_jams' ? 1 : 0),
  on: {
    on_hit: (ctx, h) => { if (ctx.att === h.u) tune(h); },
    on_miss: (ctx, h) => { if (ctx.att === h.u) tune(h); },
    volley_end: (ctx, h) => { if (ctx.u === h.u) tune(h); },
    action_done: (ctx, h) => { if (ctx.u === h.u) tune(h); },
    turn_start: (ctx, h) => { if (ctx.u === h.u) tune(h); },
  },
  brief: () => null,
});

// ---------- Camaraderie · Hand-Off (Mastery 1) ----------
// Once per round, when an ally next to you is attacked by an enemy, they use your Defense in place of their own if
// yours is higher (within 3 tiles with Many Hands). It is spent by the attack's roll, never by a preview. With several
// holders, the first in unit order lends.
const handOffReach = (u: Unit) => (has(u, 'many_hands') ? 3 : 1);
function lends(h: Holder, ctx: any): number {
  const u = h.u, t: Unit = ctx.tgt, cb = h.cb; if (!u || !cb || !t || overworld(cb) || t === u || t.side !== u.side || ctx.att?.side === u.side) return 0;
  if (!alive(u) || dist(u.pos, t.pos) > handOffReach(u) || peek(h).round === cb.round) return 0;
  return Math.max(0, u.def - t.def);
}
register({
  id: 'camaraderie.3', kind: 'skill', claims: 'all',
  on: {
    attack_preview: (ctx, h) => { if (ctx.volleyCost || ctx._handOff) return; const n = lends(h, ctx); if (n > 0) { ctx._handOff = true; ctx.terms.push({ v: -n, label: 'Hand-Off (' + h.u!.name + '\'s Defense)' }); } },
    attack_roll: (ctx, h) => { if (ctx._handOff) return; if (lends(h, ctx) > 0) { ctx._handOff = true; stateOf(h).round = h.cb!.round; say(h.cb, ctx.tgt.name + ' is covered by ' + h.u!.name + ' (Hand-Off): ' + h.u!.name + '\'s Defense against this attack.'); } },
  },
  brief: () => null,
});

// ---------- Composure · Stand Still (Mastery 2) ----------
// The original, restored (Leon, 10 Nov 2026: Composure is a beta again, and this is a defence): until you first act in
// a combat, enemies attacking you are at −2 to hit, and the first one to miss gives you a free attack on it, once a
// combat, if your weapon reaches. A Call is not "acting".
const NOT_ACTING = new Set(['combat/call', 'combat/end-turn', 'combat/decline']);
register({
  id: 'composure.5', kind: 'skill', claims: 'all', noDefaultActions: true, // the free attack is taken by the engine on the miss: no button
  on: {
    attack_preview: (ctx, h) => { if (h.u && ctx.tgt === h.u && ctx.att.side !== h.u.side && !ctx.volleyCost && !peek(h).acted && !ctx.terms.some((x: any) => x.label === 'Stand Still')) ctx.terms.push({ v: -2, label: 'Stand Still' }); },
    on_miss: (ctx, h) => {
      const u = h.u, a: Unit | undefined = ctx.att; if (!u || ctx.tgt !== u || !a || a.side === u.side || !alive(u) || !alive(a)) return;
      const s = stateOf(h); if (s.acted || s.countered) return;
      const mode = isMelee(WEAPON[u.weapon]) ? 'melee' : 'shot', pv = previewAttack(ctx.cb, u, a, mode as any, { free: true }); if (!pv.ok) return;
      s.countered = true; ctx.cb.log.push(u.name + ' stood still, and answers the miss.');
      resolveAttack(ctx.cb, ctx.rng || { state: ((ctx.cb.round || 1) * 7919 + (ctx.cb.log.length || 1)) >>> 0 }, u, a, mode as any, charOfUnit(u), { free: true }); checkOver(ctx.cb);
    },
    action_done: (ctx, h) => { if (ctx.u === h.u && h.cb && !overworld(h.cb) && !NOT_ACTING.has(ctx.a?.type)) stateOf(h).acted = true; },
  },
  brief: () => null,
});

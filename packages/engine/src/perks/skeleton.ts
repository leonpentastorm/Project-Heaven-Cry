// Skeleton 2.0 (rules 1.13), the perk and unlock pass: the items that were replaced or became passives.
//   Iron Grip I/II (perk)          a held target can't react (rules 1.56); II: a melee technique's push goes further
//                                  (Heavy Hands, rules 1.73 item 5804; Follow Through is the Breaker's Measured Blow, data)
//   Improvisation 5 · Tuned        the weapon in your main hand never jams and never breaks
//   Camaraderie 3 · Hand-Off       once a round an adjacent ally uses your Defense against one attack
//   Composure 5 · Stand Still      until you first act in a fight: −2 to hit you, and the first miss gives a free attack
// Every number here is PROVISIONAL (spec section 14).
//
// Wired in physical/core.ts: Iron Grip II's push (forceMove asks 'push_tiles').
import { register, stateOf, has, type Holder } from '../effects';
import { charOfUnit } from '../effects/hooks';
import { type Combat, type Unit, dist, alive, checkOver, previewAttack, resolveAttack, isMelee } from '../combat';
import { WEAPON } from '../data';
import { condSource } from '../magic';
import { num } from '../effects/num';
import { overworld, say } from '../kit';

const tierII = (h: Holder) => h.tier === 'II';
/** An item's per-fight state, read without creating it (previews and stat queries change nothing). */
const peek = (h: Holder): Record<string, any> => (h.u?.ps?.[h.key] as any) || {};
/** Does `u` hold `t`: Grappled by it, or Bound by it (physical/melee: Bind's state, Throw Down's own test). */
export const holds = (u: Unit, t: Unit): boolean => alive(t) && dist(u.pos, t.pos) <= 1 && (condSource(t, 'grappled') === u.id || u.tech?.bind?.target === t.id);
const heldOf = (cb: Combat, u: Unit): Unit[] => cb.units.filter((t) => t !== u && holds(u, t));

// Keep Swinging (Raw Power; `breaching_strike`): written in data only since rules 1.56 (Balance 2.0; data/perks.json).
// Breaching Strike's wall-slam is in docs/design/move-pool.md.

// =====================================================================================================================
// Iron Grip (Raw Power; rules 1.56, Balance 2.0; rules 1.73 item 5804). A target you hold is one you have Grappled (Bind
// with bare hands, Trip's Bare line) or Bound (Bind with a weapon). This handler keeps the two parts the item ops have no
// piece for: the forbid (a held target's every reaction window is cancelled) and Tier II's longer push (Heavy Hands: the
// answer to the core's 'push_tiles' for a melee technique, its tiles the tier's `numbers.push_tiles`), so the
// technique's card, its preview and the push agree. Grapple itself is Raw Power 2's (skills.json, stat technique:grapple).
// Its damage step is data (data/perks.json, effects 1). The old redirect, drag and Tier II's Momentum went
// (docs/design/move-pool.md). Pressure Point and Keep Their Heads Down (Dexterity; `both_hands`, `running_reload`) are
// data only.
// =====================================================================================================================
register({
  id: 'iron_grip', claims: ['forbid'],
  stat: (h, stat, ctx) => (stat === 'push_tiles' && ctx?.system === 'melee' ? num(h, 'push_tiles') : 0),
  on: {
    reaction_window: (ctx, h) => {
      const r: Unit | undefined = ctx.reactor; if (!h.u || !r || ctx.cancel || !alive(h.u) || !holds(h.u, r)) return;
      ctx.cancel = true; say(h.cb, r.name + ' can\'t react in ' + h.u.name + '\'s grip (Iron Grip).');
    },
  },
  brief: () => null,
});

// Quick Draw (once a fight, the first attack with a weapon drawn for it costs no AP) is data since rules 1.73 item 5852:
// Speed Load II (perks.json speed_load), a cost_mod on the attack's preview and its use on the roll.

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
      s.countered = true; say(ctx.cb, u.name + ' stood still, and answers the miss.');
      resolveAttack(ctx.cb, ctx.rng || { state: ((ctx.cb.round || 1) * 7919 + (ctx.cb.log.length || 1)) >>> 0 }, u, a, mode as any, charOfUnit(u), { free: true }); checkOver(ctx.cb);
    },
    action_done: (ctx, h) => { if (ctx.u === h.u && h.cb && !overworld(h.cb) && !NOT_ACTING.has(ctx.a?.type)) stateOf(h).acted = true; },
  },
  brief: () => null,
});

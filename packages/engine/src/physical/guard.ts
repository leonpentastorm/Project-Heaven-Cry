// Rules 1.13, Durability's door (docs/design/proposals/2026-11-nine-doors.md, section 19; numbers provisional, in
// techniques.json rules.guard). Guard is a pool for anyone with Durability (character.ts classResources: its size is
// the Durability points, 5 at most; the Defender keeps its own, the larger of the two).
//   gained   by the Guard technique (melee/links.ts): 1, +1 for each Durability point above 1, +1 with a shield in the
//            off hand; and by Brace (combat.ts brace, through braceHook): a flat 2, 3 with a shield (core.ts guardGain)
//   soaks    each point takes 10 off a damaging hit, as many points as the hit needs but the last one (kept for a
//            reaction, unless the hit would take the unit down), on the damage that would reach HP: after armour,
//            after every other reduction, and after the unit's shield (the listener below)
//   Pressure comes off Guard first, 1 Guard a point (the pressureFilter in melee/links.ts)
//   Interpose (Durability 3): an Answer everyone with the points has (below)
//   Momentum a hit on a unit holding Guard points costs none (rules.ts reads ctx.guard0)
// The Defender's class moves are untouched: a unit that holds the Defender's Reactive Plate spends its Guard through
// the plate and its policy (this soak stands aside), and one that holds the Defender's Brace Interposes by the class
// move and its policy (the general Interpose stands aside).
import { say, type Combat, type Unit, alive, dist, emitFx, fxFell, attackDamage, rollInjury, braceHook } from '../combat';
import { onHook, emit, charOfUnit, statQuery, holdersOf } from '../effects/hooks';
import { stateOf } from '../effects/index';
import { effNum } from '../effects/num';
import { feedOf, showFeedNumber } from '../effects/feed';
import { applyDamage, shieldTotal } from '../effects/damage';
import { landed } from '../effects/output';
import { PHYS_RULES } from './data';
import { technique, answer, guardOf, guardMax, guardGain, guardSoak, addGuard, spendGuard, holds } from './core';
import { NOT_A_HIT } from './rules';
import { shieldOf } from './core';
import { isShieldId } from '../character';
import { withOffHand } from '../combat';
import { setGrantBlow } from '../effects/output';
import { spentOf } from '../effects/cost';
import { doorOfResource, biteAt, cashSumOf, keepsOf } from '../door';

const G = (): Record<string, number> => PHYS_RULES.guard; // every number checked present at load (physical/core.ts GUARD_NUMBERS)
const DEF_PLATE = 'class:defender.reactive_plate', DEF_BRACE = 'class:defender.brace';

// ---------- gained by Brace ----------
braceHook.gain = (u: Unit) => guardGain(u, 'brace');
braceHook.f = (cb: Combat, u: Unit) => {
  const got = addGuard(cb, u, guardGain(u, 'brace'));
  if (got) say(cb, '  +' + got + ' Guard (' + guardOf(u) + '/' + guardMax(u) + ').');
};

// ---------- how a unit's Guard soaks (0.30.0: the one copy) ----------
/** How this unit's Guard soaks a blow. Read by the soak below, the Defender's Reactive Plate (classes/i.ts) and the
 *  shield display (screenViews.ts shieldsView), so the screen says what the damage path does. */
export interface GuardSoakPlan {
  /** 'before': every plate it needs, in the 'reduce' phase, before any shield (the Defender's Reactive Plate);
   *  'after': what the shields leave (Durability's Guard) */
  phase: 'before' | 'after';
  /** the damage one plate takes off */
  per: number;
  /** the plates kept back (for a reaction) */
  keep: number;
  /** the kept plates are spent too when what gets through would drop the unit */
  keepUnlessDrop: boolean;
  /** which blows it meets: 'hits' (never the unit's own harm nor a condition's tick) or 'all' */
  meets: 'hits' | 'all';
  /** the plates a blow of `reach` damage spends on a unit holding `have` plates and `hp` HP, and the damage they take off */
  spend(reach: number, have: number, hp: number): { k: number; cut: number };
}
/** A Reactive Plate's soak a plate: its own stat x Pain Threshold's feed (rules 1.60 item 4604: the feed reaches every
 *  plate, the Bulwark's too). The one copy: the soak below, the Guard meter (core.ts physView, through guardSoakOf) and
 *  the door tab (the plate_soak number, below) read it. `x` a unit or a character (the tab reads a sheet). */
const plateSoakOf = (plate: any, x: any): number => Math.max(1, Math.round(effNum(plate, 'stat_mod') * feedOf(x, 'plate_soak')));
/** The door tab's number for Pain Threshold's feed: what one plate soaks now (the plate's, for a Reactive Plate holder). */
showFeedNumber('plate_soak', (x) => { const plate = x ? holdersOf(x.pos !== undefined ? { u: x } : { c: x }).find((h) => h.key === DEF_PLATE) : null; return plate ? plateSoakOf(plate, x) : guardSoak(x); });
/** How this unit's Guard soaks a blow; null when it has no pool or its soak is switched off (the plate's policy 'off'). */
export function guardSoakOf(u: Unit): GuardSoakPlan | null {
  if (u.resMax?.guard == null) return null;
  const plate = holdersOf({ u }).find((h) => h.key === DEF_PLATE);
  let per: number, keep: number, keepUnlessDrop: boolean;
  if (plate) {
    // the plate's own number (its stat_mod) and its policy (set for the fight by its 0-AP actions; default: spend what it takes)
    const pol = stateOf(plate).policy || 'auto'; if (pol === 'off') return null;
    per = plateSoakOf(plate, u); keep = pol === 'keep1' ? 1 : 0; keepUnlessDrop = false;
  } else { per = guardSoak(u); keep = G().keep_back; keepUnlessDrop = true; }
  return { phase: plate ? 'before' : 'after', per, keep, keepUnlessDrop, meets: plate ? 'all' : 'hits',
    spend(reach, have, hp) {
      const needs = Math.ceil(Math.max(0, reach) / per);
      let k = Math.min(Math.max(0, have - keep), needs);
      // the kept plates go too when what gets through would take the unit down (Durability's Guard only)
      if (keepUnlessDrop && reach - k * per >= hp) k = Math.min(have, needs);
      return { k: Math.max(0, k), cut: Math.max(0, Math.min(reach, k * per)) };
    } };
}

// ---------- the soak ----------
// A hit: anything that takes HP but a condition's own tick and the harm a unit does itself (the same line the Momentum
// rule draws). The 'shield' phase is the last one before the shield takes its share, so what is left over after the
// shield is what would reach HP; a source the shield doesn't answer (a hazard, a trap) is soaked in 'reduce'. Global
// listeners run after every item, so a Parry, a perk's cut and the Defender's plate have all had their say.
onHook('damage_in', (ctx: any, cb) => {
  const u: Unit = ctx.t; if (!u || !(ctx.dmg > 0) || u.dead || u.downed) return;
  const shielded = ctx.src?.shield !== false;
  if (ctx.phase !== (shielded ? 'shield' : 'reduce')) return;
  if (u.resMax?.guard == null || guardOf(u) < 1) return;
  if (ctx.self || NOT_A_HIT.has(ctx.src?.type)) return;
  const plan = guardSoakOf(u); if (!plan || plan.phase !== 'after') return; // the Defender's plate spends this unit's Guard before the shields, by its own policy
  const reach = Math.floor(ctx.dmg) - (shielded ? shieldTotal(u) : 0); if (reach <= 0) return; // after every shield, the layers too (0.30.0: a Ward was once soaked by Guard first)
  // 1 point is kept back for a reaction (Interpose, Shield Wall, Shrug It Off), unless what gets through would take
  // the unit down: then every point the hit needs is spent (the lead's tuning, 10 Nov 2026; provisional, keep_back).
  const { k, cut } = plan.spend(reach, guardOf(u), u.hp);
  if (k < 1) return;
  spendGuard(cb, u, k, 'soak', cut); ctx.dmg = Math.floor(ctx.dmg) - cut; ctx.guardSoaked = (ctx.guardSoaked || 0) + cut;
  say(cb, u.name + '\'s Guard takes ' + cut + ' of it (' + k + ' Guard, ' + guardOf(u) + ' left).');
});

// ---------- Interpose ----------
// An ally next to you is hit by an attack: spend 1 Guard and your reaction and take the hit instead. The damage is
// worked out again against you (your armour applies), then your own shield and what Guard you have left soak it. The
// attack's critical injury follows the hit to you. A hit is a weapon attack by an enemy, as the Defender's Interpose
// reads it. Switched off like any Answer (the character's Answer list).
let interposing = false;
/** The ally an Interpose just covered: the same attack's injury follows the hit. */
let covered: { t: string; me: string } | null = null;
technique({
  id: 'interpose',
  run: () => 'Interpose is a reaction: it fires when an ally next to you is hit.',
  react: {
    damage_in(ctx, t) {
      const me = t.u, cb = t.cb, v: Unit = ctx.t, src = ctx.src, cost = t.num('guard_cost', G().interpose_cost);
      if (ctx.phase !== 'reduce' || interposing || !(ctx.dmg > 0) || !v || v === me || v.side !== me.side || v.dead || v.downed) return;
      if (src?.type !== 'weapon' || !src.by || src.by.side === v.side) return;
      if (!alive(me) || dist(me.pos, v.pos) > t.num('reach', 1) || guardOf(me) < cost) return;
      if (holds(me, DEF_BRACE)) return; // the Defender Interposes by its class move, with that move's policy
      if (statQuery({ u: v }, 'prey_lock', { by: src.by }).add > 0) return; // a blow that stays on its prey (Rabbit's Foot)
      answer(t, src.by, () => {
        spendGuard(cb, me, cost);
        const d = attackDamage(cb, src.by, me, src.mode || 'shot', charOfUnit(src.by), { crit: !!src.crit, preview: true, ambush: !!src.ambush });
        // A share of this blow already moved by an item's redirect (Close Guard, Share a Hit; ctx.movedTo, effects/triggers.ts)
        // is not taken twice. What others took comes off the blow in proportion; what this protector took itself is part of
        // the blow it now takes whole: worked out once against its own armour, less the share it already has. So the two
        // compose: never less than Interpose alone, never more than the blow (rules 1.56 Guard 2.0, the review's item 3).
        const mine = Number(ctx.movedTo?.[me.id]) || 0, others = Math.max(0, (Number(ctx.moved) || 0) - mine), whole = (Number(ctx.moved) || 0) + ctx.dmg;
        const dmg = Math.max(0, Math.floor(landed(d.total, d.armour) * (whole > 0 ? 1 - others / whole : 1)) - mine);
        ctx.dmg = 0;
        interposing = true; let r; try { r = applyDamage(cb, me, dmg, { ...src, shield: true, interposed: true } as any); } finally { interposing = false; }
        emitFx(cb, 'shove', { unit: me.id, target: v.id, from: me.pos, to: me.pos, ok: true, interpose: true });
        say(cb, me.name + ' interposes for ' + v.name + ' (' + cost + ' Guard) and takes ' + r.amount + ' damage' + (me.hp === 0 ? ' · Downed' : '') + '.');
        emit(cb, 'protect_act', { u: me, how: 'interpose', t: v, cb }); // the patrons' protect tag (item 600)
        if (me.hp === 0) fxFell(cb, me);
        covered = { t: v.id, me: me.id };
      });
    },
  },
  ai: () => 0,
});
onHook('injury', (ctx: any, cb) => {
  const ip = covered; if (!ip || ctx.t?.id !== ip.t || ctx.cancel) return; covered = null;
  const me = cb.units.find((x) => x.id === ip.me); if (!me) return;
  ctx.cancel = true;
  if (!me.dead && !me.downed) say(cb, 'The blow\'s injury lands on ' + me.name + ' (Interpose)' + rollInjury(ctx.rng, me, cb, ctx.by || null) + '.');
});
onHook('on_hit', () => { covered = null; });
onHook('on_miss', () => { covered = null; });

// ---------- the plates' weight: a grant's no-roll blow (rules 1.98 item 8350, ruling 73; Slam) ----------
// The grant's `blow` row (skills.json): the units of `weight` the action spent (the cost site's spend, cash:<res>) give the
// faced foe's blow one plate's soak before Pain Threshold's feed x the door's Bite x S(n) (body.json cashouts.slam:
// 1 + plate x Bite x S(n) / plain); ring_base x S(n) rounded down more foes beside the user take the plain blow, at most
// most_foes in all (slam_ring: Cleave's count). The blow is the shield's (in either hand), else the main hand's weapon:
// its damage with no roll and no Margins (combat.ts attackDamage), against the foe's armour. The beta's point 10 keeps
// its units after (Pain Threshold 10: a Slam keeps 1 plate; door.ts keepsOf).
/** One no-roll weapon blow of this unit at a foe, with a flat weight added before armour; the damage dealt. */
export function plainBlow(cb: Combat, u: Unit, v: Unit, weight: number, label: string): number {
  const c = charOfUnit(u), sh = shieldOf(u), off = !!sh && !isShieldId(u.weapon);
  const work = () => attackDamage(cb, u, v, 'melee', c, { preview: true, margins: 0 });
  const d = off ? withOffHand(u, work, { id: sh!, preview: true }) : work();
  const dmg = landed(d.total + Math.max(0, weight), d.armour);
  const r = applyDamage(cb, v, dmg, { ...d.src, shield: true } as any);
  say(cb, '  ' + label + ': ' + v.name + ' takes ' + r.amount + (weight > 0 ? ' (the plates\' weight ' + Math.round(weight) + ')' : '') + (v.dead ? ' · killed' : v.hp === 0 ? ' · Downed' : '') + '.');
  if (v.hp === 0 || v.dead) fxFell(cb, v);
  return r.amount;
}
setGrantBlow((cb, u, blow, args, name) => {
  const res = String(blow.weight || ''), l = doorOfResource(res); if (!l) return;
  const c = charOfUnit(u), n = typeof blow.units === 'number' ? blow.units : spentOf(u, res), S = cashSumOf(res, n); // units: a fixed count (Retort's one plate), else what the action spent
  const weight = res === 'guard' ? guardSoak(u, false) * biteAt(c?.skills as any, l) * S : 0;
  const foes = cb.units.filter((v) => v.side !== u.side && alive(v) && dist(v.pos, u.pos) <= 1);
  const named = args.targetId ? cb.units.find((v) => v.id === args.targetId && alive(v) && (typeof blow.units === 'number' || dist(v.pos, u.pos) <= 1)) : null; // an op's target (Retort's striker) wherever it stands; a grant's, beside the user
  const faced = named || foes[0]; if (!faced) return;
  const most = Math.max(1, Math.min(Number(blow.most_foes) || 1, 1 + Math.floor((Number(blow.ring_base) || 0) * S + 1e-9)));
  const label = name + ', ' + n + (n === 1 ? ' plate' : ' plates');
  for (const v of [faced, ...foes.filter((x) => x !== faced)].slice(0, most)) if (alive(v)) plainBlow(cb, u, v, v === faced ? weight : 0, label);
  const keep = typeof blow.units === 'number' ? 0 : Math.min(n, keepsOf(c?.skills as any, res)); if (keep) addGuard(cb, u, keep);
});

// Physical 2.0, melee Strikes, second half: Hamstring (11), Bind (12), Half-Sword (13) and Throw (14). The first half
// (Cut, Sweep, Bash, Sunder, Flurry) is in strikes.ts. Every number is read with t.num(key, fallback) (placeholders).
//
// Standing rules kept here, as listeners on the fight's hooks (state on the units, plain JSON, saved with the fight):
//   Bind: the binder holds u.tech.bind = { target, pen } until the start of its next turn, or until either of them is
//     moved out of reach. The Bound unit attacks anyone but the binder at −pen; a walk of its own that would leave the
//     binder's reach needs a Body save (failed: the walk stops before the first tile out of reach). The binder can't use
//     Reach while binding.
//   Hamstring with Point: the target's u.tech.hamstring = { lame } (the Slowed it was given): no Sprint or Disengage
//     while that Slowed lasts.
//   Throw: Dexterity replaces the weapon's skill on the roll, and the weapon goes to the pile on the target's tile.
import { technique, strike, loseWeaponInto, takeWeapon, save, cond, stop, landed, techState, techStateOf, onHook, setUpBonus, spendSetUp, turnStamp, meleeFx, fallFx, refuseFx } from './shared';
import type { Tech } from './shared';
import { canStrike, loseWeapon, techSaveTn, techVia, saveOutside } from '../core';
import { type Combat, type Unit, alive, dist, lineOfSight, refOf, weaponDamage, dropToPile, hurtUnit } from '../../combat';
import { WEAPON } from '../../data';
import { throwRangeOf } from '../../tactics';
import { condOn, unitSave } from '../../magic';
import { boundGame } from '../../effects/hooks';
import { type Rng } from '../../rng';
import { apFor } from '../../effects/cost';

// ---------- 11. Hamstring ----------
// Strike at ×0.7. The target makes a Body save or is Slowed 2 rounds. Edge: no save. Hook: Prone instead of Slowed.
// Point: it also can't Sprint or Disengage while Slowed.
technique({
  id: 'hamstring',
  run(t) {
    const tgt = t.tgt; if (!tgt) return 'Pick a target.';
    const p = t.line('edge', 'hook', 'point');
    const r = strike(t, { mult: t.num('damage_mult', 0.7) });
    if (!r.ok) return r.why || 'Can\'t attack that.';
    if (t.preview) t.note('On a hit:');
    const v = r.target || tgt; // the unit really struck (a redirect): the riders follow it
    if (!t.preview && (!r.hit || r.killed || !alive(v))) return null;
    if (p === 'hook') { const was = !!v.prone; stop(t, v, 'prone', { save: ['body'] }); fallFx(t, v, was); return null; }
    if (p !== 'edge' && save(t, v, 'body')) return null;
    const took = cond(t, v, 'slowed', t.num('slow_rounds', 2));
    if (p === 'point') {
      if (t.preview) t.note(v.name + ' can\'t Sprint or Disengage while Slowed.');
      else if (took && condOn(v, 'slowed')) techState(v, 'hamstring').lame = v.condAt?.slowed ?? true;
    }
    return null;
  },
  ai: (t) => (!t.tgt ? 0 : condOn(t.tgt, 'slowed') || t.tgt.prone ? 3 : 5),
});
/** Hamstrung with Point: no Sprint or Disengage while the Slowed it was given lasts. */
export function lame(u: Unit): boolean {
  const s = techStateOf(u, 'hamstring'); if (!s.lame || !condOn(u, 'slowed')) return false;
  return s.lame === true || s.lame === u.condAt?.slowed;
}

// ---------- 12. Bind ----------
// No damage. Lock the target's weapon with yours: until your next turn it attacks anyone but you at −2 and can't move
// away without a Body save. You can't use Reach while binding. Hook: Brain save or it is Disarmed. Bare: it is Grappled
// (today's grapple rules). Heavy: the −2 becomes −4.
technique({
  id: 'bind',
  run(t) {
    const tgt = t.tgt; if (!tgt) return 'Pick a target.';
    if (tgt.side === t.u.side) return 'Bind an enemy.';
    if (!alive(tgt)) return tgt.name + ' is out of the fight.';
    if (dist(t.u.pos, tgt.pos) > t.num('range', 1)) return 'Bind needs a target next to you (no Reach while binding).';
    if (!canStrike(t, tgt)) return 'You can\'t reach ' + tgt.name + ' now.';
    const p = t.line('hook', 'bare', 'heavy');
    // Flurry's Bare mark: Bind rolls nothing, so the +1 goes on the save it forces (the grapple's, or Hook's Brain save)
    const su = setUpBonus(t, tgt); if (su && (p === 'bare' || p === 'hook')) { t.note('Flurry: the save is ' + su + ' harder.'); spendSetUp(t); }
    const harder = p === 'bare' || p === 'hook' ? su : 0;
    if (p === 'bare') { // today's Grapple: a Body save, then held until it breaks free
      if (condOn(tgt, 'grappled')) return tgt.name + ' is already held.';
      if (cond(t, tgt, 'grappled', undefined, { save: true, tnAdd: harder || undefined }) && (t.preview || condOn(tgt, 'grappled'))) meleeFx(t, 'bind', { target: tgt.id, to: tgt.pos, kind: 'grapple' });
      return null;
    }
    const pen = p === 'heavy' ? t.num('heavy_penalty', 4) : t.num('penalty', 2);
    t.note(tgt.name + ' is Bound until your next turn: −' + pen + ' to attack anyone but you, and a Body save to move away. You can\'t use Reach while binding.');
    if (!t.preview) Object.assign(t.state(), { target: tgt.id, pen, r: t.cb.round, via: techVia(t) });
    meleeFx(t, 'bind', { target: tgt.id, to: tgt.pos, kind: 'bind', pen });
    if (p === 'hook' && !save(t, tgt, 'brain', harder)) cond(t, tgt, 'disarmed');
    return null;
  },
  ai: (t) => (t.tgt && dist(t.u.pos, t.tgt.pos) <= 1 && !condOn(t.tgt, 'grappled') ? 4 : 0),
});
/** The Bind a unit holds, if it still stands: the target and the penalty. */
export function bindOf(cb: Combat, by: Unit): { target: Unit; pen: number } | null {
  const s = techStateOf(by, 'bind'); if (!s.target || !alive(by)) return null;
  const tgt = cb.units.find((x) => x.id === s.target);
  if (!tgt || !alive(tgt) || dist(by.pos, tgt.pos) > 1) return null;
  return { target: tgt, pen: s.pen ?? 2 };
}
/** Has `by` Bound `target` (Throw Down's "a target you have Bound")? */
export const isBoundBy = (cb: Combat, target: Unit, by: Unit): boolean => bindOf(cb, by)?.target.id === target.id;
/** Who holds a Bind on this unit, if anyone. */
export const binderOf = (cb: Combat, target: Unit): Unit | null => cb.units.find((b) => b.id !== target.id && bindOf(cb, b)?.target.id === target.id) || null;
const endBind = (cb: Combat, b: Unit, why: string) => {
  const s = b.tech?.bind; if (!s?.target) return;
  const tg = cb.units.find((x) => x.id === s.target); delete s.target; delete s.pen;
  if (why && tg) cb.log.push(b.name + '\'s bind on ' + tg.name + ' breaks (' + why + ').');
};
// "Until your next turn."
onHook('turn_start_pre', (ctx: any, cb) => { if (ctx.u?.tech?.bind?.target) endBind(cb, ctx.u, ''); });
// Either of them moved out of reach (a walk, a push, a step inside a technique): the bind ends.
onHook('move_step', (ctx: any, cb) => {
  const m: Unit | undefined = ctx.u; if (!m) return;
  for (const b of cb.units) {
    const s = b.tech?.bind; if (!s?.target || (b.id !== m.id && s.target !== m.id)) continue;
    const tg = cb.units.find((x) => x.id === s.target);
    if (!tg || dist(b.pos, tg.pos) > 1) endBind(cb, b, 'moved apart');
  }
});
// The Bound unit's attacks at anyone but the binder; the binder's Reach (a thrown weapon isn't Reach).
onHook('attack_preview', (ctx: any, cb) => {
  const att: Unit | undefined = ctx.att; if (!att) return;
  if (ctx.melee && bindOf(cb, att)) ctx.reach = Math.min(ctx.reach, 1);
  const b = binderOf(cb, att); if (b && ctx.tgt && ctx.tgt.id !== b.id) ctx.terms.push({ v: -bindOf(cb, b)!.pen, label: 'Bound by ' + b.name });
});
// A walk of the unit's own (moveUnit prices it here, before a tile is walked).
onHook('move_cost', (ctx: any, cb) => {
  const u: Unit | undefined = ctx.u; if (!u) return;
  // Hamstring with Point: no Sprint or Disengage. move_cost can't refuse in words, so the price is put out of reach
  // (a request for the lead: a refusal field on move_cost).
  if ((ctx.how === 'sprint' || ctx.how === 'disengage') && lame(u)) { ctx.ap = Math.max(ctx.ap, apFor(cb, u, { type: 'combat/move', how: ctx.how }) + 1); return; }
  const b = binderOf(cb, u); if (!b) return;
  const route: string[] = ctx.route || [], i = route.findIndex((k) => dist(k, b.pos) > 1); if (i < 0) return;
  // one save a turn: a failed save stands for the rest of the Bound unit's turn (a refused walk costs nothing, so it
  // can't be tried again for a fresh roll)
  const s = techState(b, 'bind'), stamp = turnStamp(cb), failed = s.failed === stamp + ':' + u.id;
  const rng = boundGame()?.rng;
  if (!failed && rng && saveOutside(cb, rng, b, u, 'the bind', techSaveTn(b, s.via || 'raw_power'), s.via || 'raw_power')) return; // it breaks away; the step out of reach ends the bind
  if (!failed) s.failed = stamp + ':' + u.id;
  route.length = i; // the walk the engine takes is this route: it stops before the first tile out of reach
  cb.log.push(u.name + ' is Bound by ' + b.name + ' and can\'t move away.');
  // Nothing left to walk: the move is refused, not paid for (move_cost can't refuse in words, so the price is put out
  // of reach, as Hamstring does; request 4). A walk that keeps some tiles goes ahead as far as it can.
  if (!route.length) ctx.ap = Math.max(ctx.ap, apFor(cb, u, { type: 'combat/move', how: ctx.how }) + 1);
});

// ---------- 13. Half-Sword ----------
// A short, driven thrust: ×0.8 damage, ignores 10 armour. Point: ignores all armour. Heavy: full damage. Bare or Blunt:
// not available (the core refuses it through the data's not_with).
technique({
  id: 'half_sword',
  check: (t) => (t.holds('bare') ? 'Not available with a bare weapon.' : t.holds('blunt') ? 'Not available with a blunt weapon.' : null),
  run(t) {
    if (!t.tgt) return 'Pick a target.';
    const p = t.line('point', 'heavy');
    const fx = meleeFx(t, 'thrust', { target: t.tgt.id, to: t.tgt.pos, point: p === 'point' });
    const r = strike(t, { mult: p === 'heavy' ? 1 : t.num('damage_mult', 0.8), ignoreArmour: p === 'point' ? true : t.num('armour_ignore', 10), label: 'Half-Sword' });
    if (!r.ok) { refuseFx(fx); return r.why || 'Can\'t attack that.'; }
    t.note(p === 'point' ? 'Ignores all armour.' : 'Ignores ' + t.num('armour_ignore', 10) + ' armour.');
    return null;
  },
  ai: (t) => (!t.tgt ? 0 : (t.tgt.armour || 0) >= t.num('armour_ignore', 10) / 2 ? 7 : 4),
});

// ---------- 14. Throw ----------
/** Weapons that are part of the body: nothing to throw. */
const NATURAL = new Set(['fists', 'beast_bite']);
// Throw the weapon at a target in throwing range (Dexterity to hit). It lands in the pile on the target's tile.
// Thrown: no penalty and full damage. Without Thrown: −2 to hit, ×0.7. Heavy: the target makes a Body save or is
// knocked Prone.
technique({
  id: 'throw',
  // Only a weapon that is part of the body has nothing to throw; knuckledusters or a gauntlet can be thrown (×0.7, −2).
  check: (t) => (NATURAL.has(t.weaponId) ? 'Nothing to throw: your hands are bare.' : null),
  run(t) {
    const tgt = t.tgt; if (!tgt) return 'Pick a target.';
    if (tgt.id === t.u.id) return 'Pick someone else.';
    const range = throwRangeOf(t.u);
    if (dist(t.u.pos, tgt.pos) > range) return 'Out of throwing range (' + range + ' tiles).';
    if (!lineOfSight(t.cb, t.u.pos, tgt.pos)) return 'No line of sight to throw.';
    // "Without Thrown" reads the weapon, not the chosen line: a throwing weapon never takes the penalty.
    const p = t.line('thrown', 'heavy'), thrown = t.holds('thrown');
    const fx = meleeFx(t, 'throw', { from: t.u.pos, to: tgt.pos, target: tgt.id, weapon: t.weaponId });
    // the core's thrown strike: a ranged attack at throwing range (sight, cover), aimed with Dexterity, Pressure on a
    // hit; then the weapon leaves the hand for the pile on the target's tile
    const r = strike(t, { thrown: true, extra: thrown ? 0 : -t.num('unthrown_hit', 2), mult: thrown ? 1 : t.num('unthrown_mult', 0.7), label: thrown ? 'Throw' : 'Throw (not a throwing weapon)' });
    if (!r.ok) { refuseFx(fx); return r.why || 'Can\'t throw at that.'; }
    const v = r.target || tgt;
    if (fx && v !== tgt) Object.assign(fx, { to: v.pos, target: v.id }); // a redirected throw flies to (and lands by) the unit really struck
    if (p === 'heavy' && (t.preview ? (t.note('On a hit:'), true) : r.hit && !r.killed && alive(v))) { const was = !!v.prone; stop(t, v, 'prone', { save: ['body'] }); fallFx(t, v, was); }
    // A hit leaves the weapon in the target (Leon, 10 Nov 2026): it falls when the target does, or comes back with Pull Out
    // from next to it. A miss, or a throw that fells the target, lands on its tile as before.
    if (t.preview) { t.note('On a hit the weapon stays in the target: Pull Out from next to it brings it back (1 AP), or it falls when the target does. On a miss it lands at ' + refOf(v.pos) + '.'); return null; }
    if (r.hit && !r.killed && alive(v)) loseWeaponInto(t, v); else loseWeapon(t, v.pos);
    return null;
  },
  ai: (t) => (t.tgt && t.holds('thrown') && dist(t.u.pos, t.tgt.pos) > 1 ? 4 : 0),
});

// ---------- 28. Pull Out (free; Leon, 10 Nov 2026) ----------
// Next to a unit with a thrown weapon stuck in it: wrench it out. The weapon comes straight back into a free hand, the
// target takes half the weapon's damage (armour counts) and Bleeds. No roll. 1 AP. It neither gives nor spends Momentum.
const stuckFor = (t: any, v: any) => { const l: any[] = v?.stuck || []; return l.find((x) => x.by === t.u.id) || l[0] || null; };
technique({
  id: 'pull_out',
  check(t) {
    const v = t.tgt; if (!v) return 'Pick the one your weapon is stuck in.';
    if (!stuckFor(t, v)) return 'No weapon is stuck in ' + v.name + '.';
    if (dist(t.u.pos, v.pos) > 1) return 'Stand next to ' + v.name + ' to pull the weapon out.';
    const mainFree = t.u.weapon === 'fists' || !WEAPON[t.u.weapon];
    if (!mainFree && t.u.offWeapon) return 'Free a hand first.';
    return null;
  },
  run(t) {
    const v = t.tgt!, e = stuckFor(t, v), w = WEAPON[e.weapon];
    const dmg = Math.max(1, Math.round(weaponDamage(w, 1, t.c?.skills.raw_power || 0) * t.num('damage_pct', 50) / 100));
    if (t.preview) { t.note('The ' + w.name.toLowerCase() + ' comes back to your hand. ' + v.name + ' takes ' + dmg + ' (before armour) and is Bleeding. No roll.'); return null; }
    v.stuck = (v.stuck || []).filter((x: any) => x !== e); if (!v.stuck!.length) delete v.stuck;
    if (!takeWeapon(t.cb, t.u, e.weapon, e.item)) dropToPile(t.cb, t.u.pos, [e.item || { id: e.weapon, name: w.name, qty: 1, kind: 'weapon', weapon: e.weapon } as any], 'drop');
    meleeFx(t, 'throw', { from: v.pos, to: t.u.pos, target: v.id, weapon: e.weapon, back: true });
    t.cb.log.push('  ' + t.u.name + ' wrenches the ' + w.name.toLowerCase() + ' out of ' + v.name + hurtUnit(v, dmg, false, t.cb, 'weapon', t.u) + '.');
    if (alive(v)) cond(t, v, 'bleeding');
    return null;
  },
  ai: () => 0,
});

// ---------- 33. Grapple (a Link; given by the perk Iron Grip; Leon, 10 Nov 2026: "grapple move to the technique column") ----------
// Grab an enemy next to you: a Body save or it is Grappled until it breaks free. No damage, no Momentum spent. With any
// weapon in hand (it is the free hand, or the arm, that holds).
technique({
  id: 'grapple',
  check(t) {
    const v = t.tgt; if (!v) return 'Pick an enemy next to you.';
    if (v.side === t.u.side) return 'Grapple an enemy.';
    if (dist(t.u.pos, v.pos) > 1) return 'Stand next to ' + v.name + ' to grab it.';
    if (condOn(v, 'grappled')) return v.name + ' is already held.';
    return null;
  },
  run(t) {
    const v = t.tgt!;
    if (cond(t, v, 'grappled', undefined, { save: true }) && (t.preview || condOn(v, 'grappled'))) meleeFx(t, 'bind', { target: v.id, to: v.pos, kind: 'grapple' });
    return null;
  },
  ai: () => 0,
});

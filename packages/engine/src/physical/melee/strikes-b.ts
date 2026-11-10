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
import { technique, strike, save, cond, stop, landed, techState, techStateOf, onHook } from './shared';
import type { Tech } from './shared';
import { canStrike, strikingWith } from '../core';
import { PHYS_RULES } from '../data';
import { type Combat, type Unit, alive, dist, lineOfSight, dropToPile, unitFromCharacter, refOf } from '../../combat';
import { throwRangeOf } from '../../tactics';
import { condOn, unitSave } from '../../magic';
import { handEntry, emptyHand, mod, type PackItem } from '../../character';
import { WEAPON } from '../../data';
import { boundGame } from '../../effects/hooks';
import { d20, type Rng } from '../../rng';

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
    if (!t.preview && (!r.hit || r.killed || !alive(tgt))) return null;
    if (p === 'hook') { stop(t, tgt, 'prone', { save: ['body'] }); return null; }
    if (p !== 'edge' && save(t, tgt, 'body')) return null;
    const took = cond(t, tgt, 'slowed', t.num('slow_rounds', 2));
    if (p === 'point') {
      if (t.preview) t.note(tgt.name + ' can\'t Sprint or Disengage while Slowed.');
      else if (took && condOn(tgt, 'slowed')) techState(tgt, 'hamstring').lame = tgt.condAt?.slowed ?? true;
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
    if (p === 'bare') { // today's Grapple: a Body save, then held until it breaks free
      if (condOn(tgt, 'grappled')) return tgt.name + ' is already held.';
      if (cond(t, tgt, 'grappled', undefined, { save: true }) && (t.preview || condOn(tgt, 'grappled'))) landed(t);
      return null;
    }
    const pen = p === 'heavy' ? t.num('heavy_penalty', 4) : t.num('penalty', 2);
    t.note(tgt.name + ' is Bound until your next turn: −' + pen + ' to attack anyone but you, and a Body save to move away. You can\'t use Reach while binding.');
    if (!t.preview) Object.assign(t.state(), { target: tgt.id, pen, r: t.cb.round });
    if (p === 'hook' && !save(t, tgt, 'brain')) cond(t, tgt, 'disarmed');
    landed(t);
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
  if (ctx.melee && strikingWith(att)?.def.id !== 'throw' && bindOf(cb, att)) ctx.reach = Math.min(ctx.reach, 1);
  const b = binderOf(cb, att); if (b && ctx.tgt && ctx.tgt.id !== b.id) ctx.terms.push({ v: -bindOf(cb, b)!.pen, label: 'Bound by ' + b.name });
});
/** A Body save against the stop TN, rolled outside a technique (the Bound unit tries to walk away). */
function bodySave(cb: Combat, rng: Rng, u: Unit, why: string): boolean {
  const tn = PHYS_RULES.stop_tn || 12, bonus = unitSave(u, 'body'), r = d20(rng), ok = r === 20 || (r !== 1 && r + bonus >= tn);
  cb.log.push(u.name + (ok ? ' saves' : ' fails the save') + ' against ' + why + ' (body ' + (r + bonus) + ' vs ' + tn + ').');
  return ok;
}
// A walk of the unit's own (moveUnit prices it here, before a tile is walked).
onHook('move_cost', (ctx: any, cb) => {
  const u: Unit | undefined = ctx.u; if (!u) return;
  // Hamstring with Point: no Sprint or Disengage. move_cost can't refuse in words, so the price is put out of reach
  // (a request for the lead: a refusal field on move_cost).
  if ((ctx.how === 'sprint' || ctx.how === 'disengage') && lame(u)) { ctx.ap = Math.max(ctx.ap, u.ap + 1); return; }
  const b = binderOf(cb, u); if (!b) return;
  const route: string[] = ctx.route || [], i = route.findIndex((k) => dist(k, b.pos) > 1); if (i < 0) return;
  const rng = boundGame()?.rng;
  if (rng && bodySave(cb, rng, u, 'the bind')) return; // it breaks away; the step out of reach ends the bind
  route.length = i; // the walk the engine takes is this route: it stops before the first tile out of reach
  cb.log.push(u.name + ' is Bound by ' + b.name + ' and can\'t move away.');
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
    const r = strike(t, { mult: p === 'heavy' ? 1 : t.num('damage_mult', 0.8), ignoreArmour: p === 'point' ? true : t.num('armour_ignore', 10), label: 'Half-Sword' });
    if (!r.ok) return r.why || 'Can\'t attack that.';
    t.note(p === 'point' ? 'Ignores all armour.' : 'Ignores ' + t.num('armour_ignore', 10) + ' armour.');
    return null;
  },
  ai: (t) => (!t.tgt ? 0 : (t.tgt.armour || 0) >= t.num('armour_ignore', 10) / 2 ? 7 : 4),
});

// ---------- 14. Throw ----------
// Throw the weapon at a target in throwing range (Dexterity to hit). It lands in the pile on the target's tile.
// Thrown: no penalty and full damage. Without Thrown: −2 to hit, ×0.7. Heavy: the target makes a Body save or is
// knocked Prone.
technique({
  id: 'throw',
  check: (t) => (t.holds('bare') ? 'Nothing to throw: your hands are bare.' : null),
  run(t) {
    const tgt = t.tgt; if (!tgt) return 'Pick a target.';
    if (tgt.id === t.u.id) return 'Pick someone else.';
    const range = throwRangeOf(t.u);
    if (dist(t.u.pos, tgt.pos) > range) return 'Out of throwing range (' + range + ' tiles).';
    if (!lineOfSight(t.cb, t.u.pos, tgt.pos)) return 'No line of sight to throw.';
    // "Without Thrown" reads the weapon, not the chosen line: a throwing weapon never takes the penalty.
    const p = t.line('thrown', 'heavy'), thrown = t.holds('thrown');
    const r = strike(t, { reach: range, extra: thrown ? 0 : -t.num('unthrown_hit', 2), mult: thrown ? 1 : t.num('unthrown_mult', 0.7), label: thrown ? 'Throw' : 'Throw (not a throwing weapon)' });
    if (!r.ok) return r.why || 'Can\'t throw at that.';
    if (p === 'heavy' && (t.preview ? (t.note('On a hit:'), true) : r.hit && !r.killed && alive(tgt))) stop(t, tgt, 'prone', { save: ['body'] });
    t.note('The ' + t.w.name.toLowerCase() + ' lands in the pile on ' + refOf(tgt.pos) + (t.hand === 'main' ? '; your hand is empty after.' : '; that hand is empty after.'));
    if (!t.preview) letGo(t, tgt.pos);
    return null;
  },
  ai: (t) => (t.tgt && t.holds('thrown') && dist(t.u.pos, t.tgt.pos) > 1 ? 4 : 0),
});
/** Dexterity's modifier for a thrown roll: the character's skill, a PC unit's points; null for an enemy (it keeps its attack). */
const dexOf = (t: Tech): number | null => (t.c ? mod((t.c.skills as any).dexterity || 0) : t.u.dexterity != null ? mod(t.u.dexterity) : null);
onHook('attack_preview', (ctx: any) => {
  const t = ctx.att && strikingWith(ctx.att); if (!t || t.def.id !== 'throw') return;
  const dex = dexOf(t); if (dex == null) return;
  const v = dex - (ctx.att.attack ?? 0); if (v) ctx.terms.push({ v, label: 'Dexterity, not the weapon\'s skill' });
});
const MAIN_KEYS = ['weapon', 'ammo', 'attack', 'dmgMult', 'dur', 'maxDur', 'mods', 'ammoType', 'unarmedBonus'] as const;
const OFF_KEYS = ['offWeapon', 'offAmmo', 'offAmmoType'] as const;
/** The thrown weapon leaves the hand for the pile on a tile; the hand is empty after (the main hand holds fists). */
function letGo(t: Tech, at: string): void {
  const u = t.u, c = t.c, id = t.weaponId;
  let e: PackItem | null = null;
  if (c) {
    if (t.hand === 'main' && u.maxDur) c.weaponState = { ...(c.weaponState || {}), dur: u.dur }; // the wear of this fight goes with it
    e = handEntry(c, t.hand); emptyHand(c, t.hand);
    const fresh = unitFromCharacter(c, u.pos, { state: t.rng.state }) as any, x = u as any;
    for (const k of t.hand === 'main' ? MAIN_KEYS : OFF_KEYS) { if (fresh[k] === undefined) delete x[k]; else x[k] = JSON.parse(JSON.stringify(fresh[k])); }
  } else if (t.hand === 'off') { delete u.offWeapon; delete u.offAmmo; }
  else { u.weapon = 'fists'; u.ammo = 0; u.maxDur = 0; u.mods = []; }
  u.jammed = t.hand === 'main' ? false : u.jammed;
  dropToPile(t.cb, at, [e || ({ id, name: WEAPON[id]?.name || id, qty: 1, kind: 'weapon', weapon: id } as PackItem)], 'drop');
}

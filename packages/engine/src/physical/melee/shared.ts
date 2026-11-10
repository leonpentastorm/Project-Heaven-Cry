// Physical 2.0, melee: what every melee handler file imports. The core is ../core; nothing here is a rule.
export { technique, strike, canStrike, loseWeapon, loseWeaponInto, takeWeapon, stowedOf,  landed, spendMomentum, holdMomentum, momentumOf, setUp, save, cond, stop, forceMove, stepUser, stepBlock, stepsWithin, standingAt, approach, answer, canAnswer, addPressure, lowerPressure, chainOf, techState, techStateOf, turnStamp } from '../core';
export { pressureOf, isPressed, isSuppressed, pressureFilter } from '../pressure';
export { onHook } from '../../effects/hooks';
export type { Tech, TechHandler, StrikeResult } from '../types';

import type { Tech as T_ } from '../types';
import type { Unit as U_ } from '../../combat';
import { turnStamp as ts_ } from '../core';
/** The user's set-up mark against this target this turn, if it is for this technique (Flurry's Bare line marks Bind and
 * Throw Down): its bonus, else 0. Reading changes nothing. */
export function setUpBonus(t: T_, target: U_): number {
  const su = (t.u as any).setUp;
  return su && su.t === ts_(t.cb) && su.target === target.id && (!su.only || su.only.includes(t.def.id)) ? su.hit || 0 : 0;
}
/** Spend the user's set-up mark (a technique that reads it without striking the target, so the core doesn't spend it). */
export function spendSetUp(t: T_): void { if (!t.preview) delete (t.u as any).setUp; }

// ---------- melee_fx: what a technique did, for the effects (docs/design/handoffs/physical-2.0-A-FX.md) ----------
import { emitFx as emit_, sideSeesUnit as sees_, type FxEvent as Fx_ } from '../../combat';
/** The beats a melee technique's effect can play (one per use, plus at most one `fall`). */
export type MeleeBeat = 'arc' | 'throw' | 'bind' | 'slam' | 'force' | 'fall' | 'parry' | 'pin' | 'feint'
  | 'guard' | 'sidestep' | 'halt' | 'thrust' | 'sunder' | 'flurry' | 'draw' | 'ambush' | 'break' | 'charge';
/** Emit the technique's effect event: { k: 'melee_fx', unit, id, beat, at, ...data, seen }. A preview emits nothing.
 * seen: does each side see the user as it happens (stamped now, as turn and stance are); a view keeps only its own. It
 * carries no rule and nothing reads it back. Every position in data is a tile key, every unit an id. */
export function meleeFx(t: T_, beat: MeleeBeat, data: Record<string, any> = {}): Fx_ | null {
  if (t.preview) return null;
  const u = t.u;
  return emit_(t.cb, 'melee_fx', { unit: u.id, id: t.def.id, beat, at: u.pos, ...data, seen: { pc: sees_(t.cb, 'pc', u) ? 1 : 0, foe: sees_(t.cb, 'foe', u) ? 1 : 0 } });
}
/** The fx sequence number now: a handler remembers it before a forced move to read the move's real path after it. */
export const fxMark = (t: T_): number => t.cb.fxSeq || 0;
/** The tiles a unit was really moved through since the mark (the core's per-tile shove events): [from, …each tile].
 * Empty when it didn't move. */
export function movedSince(t: T_, unitId: string, mark: number): string[] {
  const steps = (t.cb.fx || []).filter((e) => e.n > mark && e.k === 'shove' && e.ok && e.target === unitId && e.from !== e.to);
  return steps.length ? [steps[0].from, ...steps.map((e) => e.to)] : [];
}
/** After a stop that may have knocked a unit Prone: the fall beat when it really went down now. */
export function fallFx(t: T_, v: U_, wasProne: boolean): void { if (!t.preview && v.prone && !wasProne) meleeFx(t, 'fall', { target: v.id, to: v.pos }); }
/** A beat emitted before the strike that then refused: marked refused (as the core marks its technique event), so the
 * client plays nothing for it. */
export function refuseFx(ev: Fx_ | null): void { if (ev) (ev as any).refused = true; }
/** After a multi-strike technique's strikes (Sweep, Cleave, Flurry): the last event of its use, so the client marks only
 * the strikes of this use as quick (fx/melee-techniques.ts quickStrikes), never a later plain attack in the same batch. */
export function upto(t: T_, ev: Fx_ | null): void { if (ev && !t.preview) (ev as any).upto = t.cb.fxSeq || 0; }

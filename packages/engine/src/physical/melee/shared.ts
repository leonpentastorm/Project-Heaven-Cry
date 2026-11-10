// Physical 2.0, melee: what every melee handler file imports. The core is ../core; nothing here is a rule.
export { technique, strike, canStrike, loseWeapon, stowedOf,  landed, spendMomentum, holdMomentum, momentumOf, setUp, save, cond, stop, forceMove, stepUser, stepBlock, stepsWithin, standingAt, approach, answer, canAnswer, addPressure, lowerPressure, chainOf, techState, techStateOf, turnStamp } from '../core';
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

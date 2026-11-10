// Physical 2.0, ranged: what every ranged handler file imports. The core is ../core; nothing here is a rule.
export { technique, strike, canStrike, setUp, save, cond, stop, forceMove, stepUser, stepsWithin, standingAt, approach, holdWatch, endWatch, fireWatch, spendRounds, addPressure, lowerPressure, wasSuppressed, hitByAlly, techState, techStateOf, turnStamp } from '../core';
// added by the ranged lane: Snap Shot's swap; the round a strike loads (Load Special) and the weapon it is made with; the quiver's arrow per strike and the arrows spendRounds burns
export { swapIn, strikingWith, strikeRound, type StrikeRound, strikeWrap, roundsSpent } from '../core';
export { pressureOf, pressureState, isPressed, isSuppressed, addPressureTo, lowerPressureOf, pressureFilter } from '../pressure';
export { pressureDecay, atCover, flanksCover, coveredUnseen } from '../rules';
export { TECHNIQUE } from '../data';
export { onHook } from '../../effects/hooks';
export type { Tech, TechHandler, StrikeResult, WatchSpec } from '../types';

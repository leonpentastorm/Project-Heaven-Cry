// Physical 2.0, ranged: what every ranged handler file imports. The core is ../core; nothing here is a rule.
export { technique, strike, canStrike, setUp, save, cond, stop, forceMove, stepUser, stepsWithin, standingAt, approach, holdWatch, endWatch, fireWatch, spendRounds, addPressure, lowerPressure, wasSuppressed, hitByAlly, techState, techStateOf, turnStamp, swapIn } from '../core';
export { strikingWith, strikeRound, type StrikeRound } from '../core'; // sets.ts: Load Special's chambered round, Brace's Suppress line
export { pressureOf, pressureState, isPressed, isSuppressed, addPressureTo, lowerPressureOf, pressureFilter } from '../pressure';
export { pressureDecay, atCover, flanksCover, coveredUnseen } from '../rules';
export { onHook } from '../../effects/hooks';
export type { Tech, TechHandler, StrikeResult, WatchSpec } from '../types';

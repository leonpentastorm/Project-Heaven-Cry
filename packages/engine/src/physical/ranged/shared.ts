// Physical 2.0, ranged: what every ranged handler file imports. The core is ../core; nothing here is a rule.
export { technique, strike, canStrike, loseWeapon, stowedOf,  setUp, save, cond, stop, forceMove, stepUser, stepBlock, stepsWithin, standingAt, approach, holdWatch, endWatch, fireWatch, spendRounds, addPressure, lowerPressure, wasSuppressed, hitByAlly, techState, techStateOf, turnStamp } from '../core';
// added by the ranged lane: the technique a unit is striking with; the rounds a technique uses (Load Special's chambered round, the quiver's arrows)
export { strikingWith, strikeRound, type StrikeRound } from '../core';
// the effects events the ranged effects key on: an event kept to its unit's side while the other side can't see it
export { ownSideOnly } from '../core';
export { pressureOf, pressureState, isPressed, isSuppressed, addPressureTo, lowerPressureOf, pressureFilter } from '../pressure';
export { pressureDecay } from '../rules';
export { atCover, flanksCover, coveredUnseen, hitPressure } from '../pressure';
export { TECHNIQUE } from '../data';
export { onHook } from '../../effects/hooks';
export type { Tech, TechHandler, StrikeResult, WatchSpec } from '../types';

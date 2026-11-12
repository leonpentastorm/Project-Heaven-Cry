export * from './data';
export * from './rng';
export * from './character';
export * from './combat';
export * from './game';
export * from './objects';
export * from './campaign';
export { MAP_LIMITS, MAP_LAYOUTS, readLayout, expandZone, sizeProblem, startGap, deployEnemy, nearestFree } from './maplayout';
export * from './music';
export * from './spotlight';
export * from './glossary';
export * from './memory';
export * from './magic';
export * from './tactics';
export * from './effects';
export * from './missions';
export * from './ai-sigil';
export * from './ai-soul';
export * from './illusion';
export * from './faith';
export * from './world';
export * from './hazards';
export * from './sigilgrowth';
export * from './containers';
export * from './deeds';
export * from './gear';
export * from './loot';
export * from './feelings';
// Physical 2.0 (rules 1.12): the technique systems. `phys` holds everything; the names the client uses are also top-level.
export * as phys from './physical';
export { previewTechnique, useTechnique, techniquePad, packPad, stowedOf, physView, type PackPad, techniqueAp, linesFor, offHome, momentumOf, handlerOf as techniqueHandler, NOT_BUILT as TECHNIQUE_NOT_BUILT } from './physical/core';
export { TECHNIQUES, TECHNIQUE, PHYS_RULES, PHYS_REV, weaponPhys, weaponProps, weaponSystem, weaponTeaches, hitsWith, scalesWith, propText, groupsOf, groupName, physOf, knownTechniques, readyCap, readyTechniques, readyError,
  drillOf, drillMark, drillMarks, picksOwed, pickable, drillMult, defaultTechniques, startingTechniqueSlots, startingTechniqueChoices, startingTechniquesError, type CharPhys, type WeaponPhys } from './physical/data';
export { pressureOf, pressureState, pressureCap, isPressed, isSuppressed, type PressState } from './physical/pressure';
export type { TechSystem, TechGroup, TechLine, TechDef, TechArgs, TechPreview, PadEntry, PadGroup, HeldWatch, WatchSpec } from './physical/types';
// Calls (rules 1.13, Skeleton 2.0): the nine gamma skills' speech actions. `calls` holds everything; the names the client uses are also top-level.
export * as calls from './calls';
export { call, previewCall, useCall, callPad, callLevel, callAp, callTn, callView, callHandler, aiCallScore } from './calls/core';
export { CALLS, CALL, CALL_RULES, callOfSkill, callRangeAt, callStepAt, type CallRules } from './calls/data';
export { aiCall } from './calls/ai';
export type { CallDef, CallArgs, CallPreview, CallPadEntry, CallHandler, CallMarks, CallKind, CallAim, CallStep } from './calls/types';
// The client's boundary (engine review 4): the basic actions as rows with the engine's cost and reason, where a move may
// end and an attack reaches (actions.ts); the one dry run that owns the copy, the bound game and the fog (preview.ts).
export { ACTIONS, ACTION, basicActions, basicCost, reloadBothRows, loadPlan, moveAp, moveOptions, reachOf, reachTiles, pullFreeTargets, pileInReach, type ActionDef, type BasicAction, type ActionCtx, type MoveOptions, type Reach, type ReachWhat } from './actions';
export { preview, dryRun, previewAction, withGame, copyFight, shadowGame, fightSeenBy, previewSeenBy, fightWith, type PreviewOpts, type DryRun, type ActionVerdict } from './preview';
// The perk card in a fight (rules 1.14; engine review 4, finding 9): each held item's shelf, trigger and state, as facts.
export { perkCards, shelfOf, cardText, cardTrigger, coreWired, PERK_CARDS, LOG_LOOKBACK, type PerkCard, type ShelfId, type CardState } from './perkcard';
export * from './kit';
export * from './rolls';
// Engine foundations 2: the unit states' setters (Braced, Staggered, Downed, Nailed). The raw flag writes are not exported: applyCond / endCond (magic.ts) are the door.
export { setBraced, stagger, clearStagger, setDowned, setNailed, startHidden, asStanding } from './unitstate';

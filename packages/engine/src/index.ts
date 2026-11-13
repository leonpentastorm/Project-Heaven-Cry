export { resolveTexts, renderText, fmtNumber } from './datatext';
export * from './data';
export * from './rng';
export * from './character';
export * from './combat';
export * from './game';
export * from './objects';
export * from './campaign';
export { MAP_LIMITS, MAP_LAYOUTS, readLayout, expandZone, sizeProblem, startGap, deployEnemy, nearestFree } from './maplayout';
export * from './music';
export { fogFight, fightSight, isUnseenId, UNSEEN, UNSEEN_NAME, type FightFog } from './fog';
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
export * from './run/map';
export * from './feelings';
export * from './run/state';
export * from './run/encounter';
export * from './run/rewards';
export * from './run/power';
export * from './run/progress';
export * from './credits';
export * from './gearpreview';
export * from './run/shop';
export * from './run/shopview';
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
export { ACTIONS, ACTION, basicActions, basicCost, reloadBothRows, reloadOffRows, offHandRows, loadPlan, moveAp, moveOptions, reachOf, reachTiles, pullFreeTargets, pileInReach, type ActionDef, type BasicAction, type ActionCtx, type MoveOptions, type Reach, type ReachWhat } from './actions';
export { preview, dryRun, previewAction, withGame, copyFight, shadowGame, fightSeenBy, previewSeenBy, fightWith, type PreviewOpts, type DryRun, type ActionVerdict } from './preview';
// The perk card in a fight (rules 1.14; engine review 4, finding 9): each held item's shelf, trigger and state, as facts.
export { perkCards, shelfOf, cardText, cardTrigger, coreWired, PERK_CARDS, LOG_LOOKBACK, type PerkCard, type ShelfId, type CardState } from './perkcard';
export * from './kit';
export * from './rolls';
export * from './screenViews';
// Engine foundations 2: the unit states' setters (Braced, Staggered, Downed, Nailed). The raw flag writes are not exported: applyCond / endCond (magic.ts) are the door.
export { setBraced, stagger, clearStagger, setDowned, setNailed, startHidden, asStanding } from './unitstate';
// Classes 3.0 P9: owned units (owned.ts): the doors that make, unmake and order them, and a test's run-time blocks.
export { spawnOwned, unmakeOwned, ownedBy, runOwned, orderable, ownedVerbs, addOwnedBlocks, clearOwnedBlocks, ownerOf as ownerOfUnit } from './owned';
// Classes 3.0 step 8 (rules 1.34): Figments and the Visualizer (figments.ts).
export * from './figments';
// Action descriptors (engine review 4, finding 3): one description of every action a unit can take, one preview, one send.
export { actionsFor, previewDescriptor, sendDescriptor, registerActions, nextStep, stepOn, GROUP_ORDER, isLegacyUnit, TQ, TPAD, TWATCH, techId, parseTechId, TECH_OPTIONS, techOpt, techHelp, techParts, ORDER_THINGS, orderMax,
  PR, prayId, parsePrayId, oddsPct, prayOdds, PK, perkId, parsePerkId, perkCost, perkState, perkText,
  type ActionDescriptor, type TechParts, type DescGroup, type PickStep, type PickKind, type PickOption, type Picks, type DescCost, type DescriptorPreview, type PreviewLine, type GridMarks, type ActionSystem, type DescCtx } from './descriptors';

// The effect runtime's public API (plan 2.1-2.7). Lanes import from here: '../effects'.
//
//   register({ id, kind?, claims?, narrator?, priority?, stat?, on?, checkMod?, actions?, toggles?, brief? })
//   emit(cb, hook, ctx) / emitStory(g, hook, ctx, chars?)       hook payloads: see effects/hooks.ts and the emit sites
//   holdersOf / holderOf / has / tierOf                          who holds what
//   statQuery(x, stat, ctx) → { add, mult }; skillRollMod; checkQuery
//   uses(h).left / take / used / refund (per_turn … per_campaign)
//   grantPerkAp / bankAp / apDebt / pushAp                       the +3 cap and the 2..9 clamp
//   applyDamage / healUnit / grantShield                         the damage chokepoint and its phases
//   note(h, text) / pendRuling                                   the Narrator fallback
//   perkActionsFor / previewPerkAction / runPerkAction / togglesFor / modOn / armedOf / openWindow / windowStep
//   coverageReport / coverageGaps / verdictOf / verdictFor
import type { Character } from '../character';
import type { Combat, Unit } from '../combat';
import { holdersOf } from './hooks';
import { keyOf } from './collect';

export * from './types';
export { register, emit, emitStory, anyOn, holdersOf, holderOf, statQuery, checkQuery, genericEffects, bindGame, boundGame, handlerOf, registered, ownerOf, heldOfChar, heldOfUnit, charOfUnit, setRankRule, _unregisterAll, _snapshotRegistry, _restoreRegistry, type Owner, type GenericOp, registerGeneric, genericOf } from './hooks';
export { itemInfo, itemsOf, effectsOfHeld, allItems, perkEffects, keyOf as itemKey, splitKey, classMove, classMoveKeys, ADVANCED, BASE_CLASS, advancedActive, _setAdvancedLive, _setRevision2Classes, revision2Classes, REV2_CLASSES, SKILL_ITEMS, skillItemsOf, type Held } from './collect';
export { uses, scopeOf, stampOf, usesLabel, sessionN, restN, dayOf } from './uses';
export { turnAp, grantPerkAp, bankAp, apDebt, pushAp, refusedGift, AP_BASE, AP_MAX, AP_MIN, PERK_AP_CAP, AP_DEBT_CAP, type ApLine } from './ap';
export { applyDamage, healUnit, grantShield, hostileSrc, PAST_SHIELDS, pastShields, type DamageSrc, type DamageResult } from './damage';
// the one formula (output.ts): amounts, armour, the one way in (the stacking rule is re-exported by tactics.ts, as before)
export { PROFILES, PAIRS, profileOf, pairOf, statTerm, statOf, levelFactor, levelOf, openAmount, closeAmount, amountOf, armourAgainst, landed, deal, mend, term,
  type Profile, type Pair, type AmountSpec, type AmountCtx, type Amount, type AmountKind, type ArmourKind, type DealSpec, type DealCtx, type DealResult } from './output';
export { MENDING, mendFactor, mendFactorOf, noteTended, tendedLately, TEND_ROUNDS, TEND_NOTICE, MEDIC, TRIAGE_HEAL, TRIAGE_REST_MULT, STIM_HEAL, RALLY_HEAL, FIELD_REPAIR_HEAL, kitHeal } from './mending';
// amount blocks (step a6): the numbers items deal, heal and shield with, from their data
export { itemAmount, amountMult, amountBlock, amountSpecOf, amountHome, type AmountBlock } from './amounts';
export { note, noteFight, pendRuling, rulingsPrompt, briefOf, narratorPart, gapsOf, noteFallbacks, postStory, setStoryPoster } from './narrator';
export { perkActionsFor, perkInfoFor, previewPerkAction, runPerkAction, togglesFor, modOn, armedOf, disarm, openWindow, windowStep, closeWindow, actionDefs, defaultActions, apFromData, type PerkActionEntry, type PerkInfoEntry, type ToggleEntry, type WindowEntry } from './actions';
export { coverageReport, coverageGaps, coverageOf, verdictOf, verdictFor, coverageSummary, type CoverageRow, type Verdict } from './coverage';
export { skillRollMod, actionAp, immune, forbids, xpAfter, itemWords, wordCostMods, wearing, contextHolds, pushAway, TAG_VOCAB } from './core';
export { gainEcho, ECHO_MAX } from './echo';

/** Does this unit or character hold the item (an id or key)? */
export const has = (x: Unit | Character | null | undefined, idOrKey: string): boolean => !!tierOf(x, idOrKey);
/** The tier it is held at ('I', 'II', 'mastered', 'trait', a class rank…), or null. */
export function tierOf(x: Unit | Character | null | undefined, idOrKey: string): string | null {
  if (!x) return null;
  const key = keyOf(idOrKey), isUnit = 'side' in (x as any);
  const h = holdersOf(isUnit ? { u: x as Unit } : { c: x as Character }).find((y) => y.key === key);
  return h ? h.tier : null;
}
/** Per-fight state for an item on its unit (on the overworld, kept on g.story.ps[charId], since units are rebuilt every action). */
export function stateOf(h: { key: string; u?: Unit | null; c?: Character | null; cb?: Combat | null; g?: any }): Record<string, any> {
  const ow = !!h.cb && (h.cb.overworld || h.cb.name === 'overworld');
  if (h.u && !ow) return ((h.u.ps ||= {})[h.key] ||= {});
  const id = h.c?.id || h.u?.charId, g = h.g;
  if (id && g?.story) { const ps = ((g.story.ps ||= {})[id] ||= {}); return ((ps.items ||= {})[h.key] ||= {}); }
  return h.u ? ((h.u.ps ||= {})[h.key] ||= {}) : {};
}
export * from './stats';

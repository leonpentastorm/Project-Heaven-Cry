// Story mode, ported from design/canvas-build/main.logic.js. Everything the prototype faked now comes from the game:
// the sheet is your character, the stream is the session, voices and Overreach are the engine's private entries,
// the dice table rolls the checks the Narrator called (the engine rolls; Echo rerolls), and Send speaks in turn.
import { resourcesOf, resView, RES_CSS } from '../game/resources';
import { DCLogic } from '../dc/runtime';
import { D, ATTR, SK, IMG, mod, checkMod, fmt, tabNavIndex, epccgVals, lightboxVals, zoomer, epBtnStyle, masteredVals, bodyFigure, SLOT_PARTS, tokenVals, effectsOf, ART, ART_BIG, zoneOf, spriteOf, tileBg, spriteStyle, epRgba,
  ensureMotionCss, ensureStyle, motionRoot, closeAnim, modalCls } from './shared';
import { SKILL, PERK, WEAPON, MAPS, CLASS, maxHp, maxMp, xpForLevel, defense, initiativeBonus, movement, healingMult, classRank, pendingPerkSteps, ARMOUR, KITS, packOf, mainHandSide, injuryText, itemKg, carriedKg, carryLimit, loadedOf, ITEM, overweightKg, weaponDurOf, maxDurOf, RARITY, coverOf, difficultOf, magsOf, WEAPONS, zoneMap, positionsOf, refOf, notesAt, visibility, defaultObjects, kindOf, coverKind, blocksMove, isDifficult, SKILL as SKILLS_BY_ID, TN_LADDER , STAGE_MULT , DESIGN_TEMPLATES, soulPicksLeft, gatedBy, FEELINGS } from '@engine';
import { practiceView, feelingCodex, moduleGroups } from '../game/feelingsView';
import { startOf } from '../game/starts';
import { voiceState, speak, stopVoice, coreVoice, voiceChip, voicePrefs } from '../game/voice';
import { designBan, portraitFor, npcsOf, apLeft, ROUND_AP, ENEMY, attackApCost, isMelee, isPersonObj, songStateOf, musicTraitOf, gearEffects, paths, apForTiles, previewAttack, lineOfSight, effectiveRange, routeHazards, PICKUP_AP } from '@engine';
import { act, getState, go, polishText, retryNarrator, saveNow, toast } from '../game/store';
import { openReport, openSpend } from '../game/report';
import { derivedLines } from '../game/derived';
import { perkEntries, storyPerkEntries, parsePk, pkId, pkCost, pkText, classOf, pickChoice, reloadItems, reloadBothItems, RELOAD_TAC, RELOAD2_TAC } from '../game/commands';
import { pickerFor, buildArgs, draftsOf, designSlotView, pickInDraft, cleanDesign, OPT_LABEL, optValue } from '../game/actionPickers';
import { previewPerkAction, bindGame, phys } from '@engine';
import { weaponActions, verdictFor, ADVANCED, collectionOf, COMPANION_KINDS, REST_INFO } from '@engine';
import { usesLine, emblemOf, classMoves as classMovesOf, advancedMoves, attributeProgress, classLabel, heldClassId } from '../game/classView';
import { castFight, castMany, npcFace, npcTags, takenCards } from '../game/cast';
import { SIGIL, SCHOOL, MODULE, maxSigilWords, wordsKnownCap, evoChargeNow, coresCarried, hasEvoker, hasEmanator, carriesEvoker, carriesEmanator, focusHand, FOCUS_IDS, NEEDS_EVOKER, NEEDS_EMANATOR, mpNow, strainLimit, moduleSlots, readyDesigns, glyphAp, soulCostSaving, soulCastAp, soulRangeBonus,
  magicOf, designCost, designAp, designRange, manaBand, MANA_START, FLUX_MAX, CORE_CHARGE, storyCb, previewEvoke, previewOutburst, spellTargets, dist, standable, condName,
  vent as mgVent, swapCore as mgSwapCore, scuff as mgScuff, syphon as mgSyphon, crystallise as mgCrystallise, drawGlyph, releaseOutburst, glyphApOf } from '@engine';
import { glyphUri, scratchUri, heartUri, joinUri, starUri, SIGIL_INK, SOUL_INK } from '../game/glyphs';
import { gearIconUri } from '../game/gearIcons';
import { glyphKeyNav } from '../game/glyphKeys';
import { drawStrip, wordRows, wordClassName, patternPanel, evokeView, evokeClick, placedView, placedLegend, mergeTiles, glyphMark, strokeButtons, strokeLayer, wordMasteryChips, readableAt, traceMark } from '../game/sigilView';
import { openMissionBoard } from '../game/missionBoard';
import { questGroups } from '../game/missionView';
import { echoView, echoMax } from '../game/echoView';
import { storyForecastVals } from '../game/manaForecast';
import { askConfirm, askText } from '../game/dialog';
import { shellVals, narratorVals } from './shell';
import { designInfo, reachWords, designCards, designVerdict, heartPanel, heartVals, aimOverlay, idleOverlay, noOverlay, overlayTileStyle, markChipStyle, markChipText, toneChips, toneInk, formIconUri, isShape, FORM_NAME } from '../game/heartView';
import { oocOf, SECOND_SCHOOL, TONE } from '@engine';
import { faithTabVals, patronLineCard, faithEventCard } from './faithTab';
import { armsTabVals } from './armsTab';
import { STORY_PANELS, STORY_PANEL_NAME, STORY_PANELS_CSS, readStoryPanels, saveStoryPanels, isDefaultOrder, startStoryDrag, keyMoveStoryPanel, squadMinHeight, SQUAD_SEATS, SQUAD_ROW_PX, SQUAD_GAP_PX } from '../game/storyPanels';
/** A weapon's line on the GEAR tab (Physical 2.0): its properties and the technique it teaches (drill replaced the
 *  old weapon skill and mastery). */
const armsLine = (wid) => { const pr = phys.weaponProps(wid), t = phys.weaponTeaches(wid); return [pr.length ? pr.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(', ') : '', t && phys.TECHNIQUE[t] ? 'teaches ' + phys.TECHNIQUE[t].name : ''].filter(Boolean).join(' · '); };
import { NOT_PERSON, faceOf, kindBadge, worldLayer, markVals, talkVals, hazardVals, approachRows, hereVals, carriedRows, loadLine, nearItems, putDownTiles, isCacheV, holdsText, rawApproach,
  pilesIn, pileRows, pileTake, pickupLabel, pickupWhy, toggleUntick, crossesText, pileTipStyle, CROSS_STYLE, CROSS_CHIP_STYLE } from '../game/worldView';
import { approachOptions, sigilGrowthView } from '@engine';
import { groupedSection, sigilWordGroups } from '../game/workshopGroups';
const WORN_SLOT = { head: 'head', head_accessory: 'headAcc', inner_torso: 'inner', lower_torso: 'lower', legs: 'legs', hands: 'hands', footwear: 'feet' };
const SLOT_TO_WORN = Object.fromEntries(Object.entries(WORN_SLOT).map(([a, b]) => [b, a]));
ensureMotionCss(); // the slide/pop classes (shared.js MOTION_CSS)
// Main-screen extras: the dice verdict lands after the die does; the area map's planning marks breathe a little.
ensureStyle('phc-resources', RES_CSS);
ensureStyle('phc-story-panels', STORY_PANELS_CSS); // the right column's movable modules (game/storyPanels.ts)
// The UI pass (docs/design/ui-pass-shell.md 3, 4): Echo's flare when one is gained or spent, a new quest row's white
// flash, and the minimap kept short enough that the quest board keeps its room on a short window.
ensureStyle('phc-play-pass', '@keyframes phcEchoGain{0%{transform:rotate(45deg) scale(.4);box-shadow:0 0 0 0 #FFFFFF}45%{transform:rotate(45deg) scale(1.5);box-shadow:0 0 14px 4px #FFFFFF}100%{transform:rotate(45deg) scale(1)}}'
  + '@keyframes phcEchoSpend{0%{transform:rotate(45deg) scale(1.4);background:#FFFFFF;box-shadow:0 0 12px 3px #FFFFFF}100%{transform:rotate(45deg) scale(1)}}'
  + '.phc-echo-gain{animation:phcEchoGain .9s ease-out both}.phc-echo-spend{animation:phcEchoSpend .9s ease-out both}'
  + '@keyframes phcEchoRow{0%,100%{background:transparent}30%{background:rgba(255,255,255,.14)}}[data-phc-echo].phc-echo-row-flare{animation:phcEchoRow 1.1s ease-out}'
  + '@keyframes phcQNew{0%{background:rgba(255,255,255,.22)}100%{background:transparent}}.phc-q-new{animation:phcQNew 1.6s ease-out}'
  + '[data-phc-echo]:hover,[data-phc-echo]:focus-visible{background:rgba(255,255,255,.06)!important}'
  // Only while the quest board is there: the Proving Ground has none, and its loop is "click the map" (the minimap stays).
  + '@media (max-height:760px){.phc-right-col:has([data-quest-board]) .phc-mini-box{display:none!important}}'
  + '@media (prefers-reduced-motion:reduce){.phc-echo-gain,.phc-echo-spend,.phc-q-new,[data-phc-echo].phc-echo-row-flare{animation:none}}');
/** The quest board's fold (per group) and grouping, remembered on this computer. */
const QFOLD = 'phc.questFold';
const readFold = () => { try { return JSON.parse(localStorage.getItem(QFOLD) || '{}') || {}; } catch { return {}; } };
// Quest rows seen, per room and grouping (a new one flashes white once; the first render of a room, or of a grouping,
// only learns what is there, so entering a second room never flashes its whole board).
const QSEEN = new Map();
ensureStyle('phc-main-motion', '.phc-dice-verdict{animation:phcMRise .3s ease-out .75s both}'
  + '@keyframes phcPlanPulse{0%,100%{opacity:.75}50%{opacity:1}}.phc-plan-target{animation:phcPlanPulse 1.4s ease-in-out infinite}'
  + '.phc-rm .phc-die{animation:phcMFadeIn .2s ease-out both!important}.phc-rm .phc-dice-verdict{animation:phcMFadeIn .15s ease-out .2s both}.phc-rm .phc-plan-target{animation:none}');
// The planning overlays on the area map (as on the combat grid): the path you'd walk, and an attack's reach in red.
const ARROWS = { '1,0': '→', '-1,0': '←', '0,1': '↓', '0,-1': '↑', '1,1': '↘', '-1,1': '↙', '1,-1': '↗', '-1,-1': '↖' };
const RANGE_RED = '#F65157';

const TABLES = [['felt', 'Field felt', '#1F4D3A', '#123526'], ['oak', 'Mess-hall oak', '#5B3A22', '#3D2716'], ['velvet', 'Lumeri velvet', '#4A1830', '#2E0F1E'],
  ['slate', 'Outpost slate', '#2B3138', '#1B2026'], ['hull', 'Ship hull', '#3A3F47', '#5B6270'], ['void', 'Black-hole glass', '#0B0F1E', '#AE9BFF']];
const SKINS = [['ivory', 'Ivory', '#EFE6D2', '#8C7B5A', '#1A1A1A'], ['obsidian', 'Obsidian', '#15171C', '#6B7280', '#E7EBF3'], ['brass', 'Brass', '#C9A25A', '#6B4F1F', '#1A1208'],
  ['glass', 'Sigil glass', '#173640', '#8BDEEE', '#E7EBF3'], ['bone', 'Bone', '#D9CBB0', '#7A6A4F', '#3A2E20'], ['blood', 'Oil-red', '#7A1121', '#F65157', '#FFFFFF']];
const ARMOUR_NAMES = ['No armour', 'Light (Class I)', 'Medium (Class II)', 'Heavy (Class III)', 'Assault (Class IV)', 'Juggernaut (Class V)'];
const ROMAN = ['0', 'I', 'II', 'III', 'IV', 'V'];
const SLOTS = [['main', 'MAIN HAND'], ['off', 'OFF HAND'], ['head', 'HEAD'], ['headAcc', 'HEAD ACC.'], ['outer', 'OUTER TORSO'], ['inner', 'INNER TORSO'], ['lower', 'LOWER TORSO'],
  ['legs', 'LEGS'], ['hands', 'HANDS'], ['feet', 'FOOTWEAR'], ['veil', 'VEIL'], ['pack', 'BACKPACK']];
const KIND = { weapon: 'WEAPON', ammo: 'AMMO', med: 'MED', tool: 'TOOL', focus: 'FOCUS', food: 'FOOD', loot: 'LOOT', plot: 'PLOT ITEM' };
const REGIONS = [['OUTPOST-813', 'Barracks, infirmary, comms', 6, 8, 30, 30], ['SHIELD LINE', 'Where the five squads held', 40, 6, 40, 22], ['WRECK FIELD', '100 infantry robots, most still', 6, 44, 34, 40],
  ['ENGINEERS’ SHIP', 'Platinum hold, sealed hatch', 74, 34, 22, 20], ['B813', 'The black hole, overhead', 72, 76, 24, 18]];
const TRAIT = {}; D.traits.forEach((t) => { TRAIT[t.id] = t; });
const PERK_ICON = {};
D.skills.forEach((s) => { s.ep.perks.forEach((p) => { PERK_ICON[p.id] = p.icon; }); PERK_ICON[s.ep.mastered.id] = s.ep.mastered.icon; s.ep.combos.forEach((c) => { PERK_ICON[c.id] = c.icon; }); });
D.ults.forEach((u) => { PERK_ICON[u.id] = u.icon; });
const side0 = (c) => (c ? mainHandSide(c) : 'right');
const pref = (k, d) => { try { return localStorage.getItem('phc.' + k) || d; } catch { return d; } };
const savePref = (k, v) => { try { localStorage.setItem('phc.' + k, v); } catch { /* */ } };

// ---------- magic (spec: Mana, rules 1.2): the MAGIC tab ----------
// Sigils are Mind cyan and square; Outbursts are Soul violet warming to gold (docs/design/magic-presentation.md). Never mixed.
const SIG_CYAN = '#4FC8DF', SOUL_VIOLET = '#AE9BFF', MP_BLUE = '#5C9EFF';
const WORD_CLASS = { subject_element: 'SUBJECT · ELEMENT', subject_affliction: 'SUBJECT · AFFLICTION', subject_boon: 'SUBJECT · BOON', subject_working: 'SUBJECT · WORKING', reach: 'REACH', delivery: 'DELIVERY', burst: 'BURST', filter: 'FILTER' };
/** Sigil words on the MAGIC tab in grammar order (rules 1.4): Subjects, Reach, Delivery, Burst, Filter. */
const WORD_ORDER = Object.keys(WORD_CLASS);
// OPT_LABEL and optValue (a school's options) come from game/actionPickers, shared with the twin's design picker.
const optLabel = (school, v) => { const o = (SCHOOL[school]?.options || []).find((x) => optValue(x) === v); return o ? OPT_LABEL[o] || o : v; };
const signed = (n) => (n > 0 ? '+' + n : n < 0 ? '−' + Math.abs(n) : '0');
const chipStyle = (ink, on) => 'display: inline-flex; align-items: center; gap: 4px; min-height: 28px; padding: 0 10px; border-radius: 999px; font-family: inherit; font-size: 11px; font-weight: 700; cursor: pointer; border: 1px solid ' + ink + '; '
  + (on ? 'background: ' + epRgba(ink, 0.2) + '; color: #E7EBF3' : 'background: transparent; color: ' + ink);
/** What the character's magic is doing now: in a fight, its unit; on the story map, the story's magic state. */
function magicNow(g, c) {
  const inFight = g.phase === 'combat' && !!g.combat, cu = inFight && c ? g.combat.units.find((u) => u.charId === c.id) : null, SM = (c && (g.story.magic || {})[c.id]) || {};
  const mana = inFight ? g.combat.mana ?? MANA_START : g.story.mana ?? MANA_START;
  return { inFight, cu, mana, band: manaBand(mana), flux: cu?.mg ? cu.mg.flux : SM.flux || 0, strain: cu?.mg ? cu.mg.strain : SM.strain || 0, held: (cu?.mg ? cu.mg.held : SM.held) || null,
    conds: (cu ? cu.conds : SM.conds) || {}, shield: (cu ? cu.shield : SM.shield) || 0,
    charge: cu?.mg ? cu.mg.charge : c ? evoChargeNow(c) : 0, cores: cu?.mg ? cu.mg.cores || 0 : c ? coresCarried(c) : 0, /* Swap core loads only mg.cores; crystallised ones join after the fight */ mp: cu?.mg ? Math.round(cu.mg.mp) : c ? mpNow(c) : 0 };
}
/** Try an engine magic action on a throwaway copy of the story map's fight: the engine's refusal (or null) and the
 *  unit afterwards. The UI learns reasons and costs from the engine without computing a rule itself. */
function dryMagic(cbx, uid, fn) {
  const units = cbx.units.map((x) => ({ ...x, conds: x.conds ? { ...x.conds } : x.conds, mg: x.mg ? { ...x.mg, held: x.mg.held ? { ...x.mg.held } : null } : x.mg }));
  const c = { ...cbx, units, log: [], notes: [], fx: [], glyphs: [...(cbx.glyphs || [])], zones: (cbx.zones || []).map((z) => ({ ...z, hit: { ...(z.hit || {}) } })) };
  const u = units.find((x) => x.id === uid);
  let err = null;
  try { err = u ? fn(c, u, { state: 1 }) : 'No unit.'; } catch (e) { err = String((e && e.message) || e); }
  return { err, u };
}
/** Story and log lines about magic take their family's ink (paired with a ✧ or ♥ mark in the stream). */
const SIG_LINE = /draws [A-Z]+ at|evokes [A-Z]|scuffs out|vents \d+ Flux|loads a fresh core|OVERLOAD|Sigil word|fades? at /, SOUL_LINE = /Outburst|releases [^:]+:|lets .+ go \(|syphons \d+ MP|crystallises a mana core|MANA SHORT|holds the Strain/;
const magicInk = (t) => (SIG_LINE.test(t || '') ? SIGIL_INK : SOUL_LINE.test(t || '') ? SOUL_INK : '');
const bandName = (b) => b.id.charAt(0).toUpperCase() + b.id.slice(1);
const soulM = (c) => magicOf(c) || { costSave: soulCostSaving(c), soulAp: soulCastAp(c), soulRange: soulRangeBonus(c) };
/** Where a focus is, in words (spec: Hands 2): a hand, or the pack where it counts for nothing. */
const handWord = (at) => (at === 'main' ? 'in your main hand' : at === 'off' ? 'in your off hand' : at === 'pack' ? 'in the pack (not in hand)' : 'none');
/** Which focus an item is, if any. */
const focusKindOf = (id) => (FOCUS_IDS.evoker.includes(id) ? 'evoker' : FOCUS_IDS.emanator.includes(id) ? 'emanator' : null);
function magicVals(self, g, c) {
  const S = self.state, set = (p) => self.setState({ mgDraft: { ...self.state.mgDraft, ...p } });
  const none = { has: false, empty: true, emptyText: '', showSigil: false, showSoul: false, st: { pick: { groups: [] }, toStudy: [] }, sig: { ws: { groups: [] }, words: [], stats: [] }, soul: { ws: { groups: [] }, designs: [], stats: [] }, b: { open: false, schools: [], schools2: [], options: [], modules: [] }, learn: { ally: [], plates: [] } };
  if (!c) return { ...none, emptyText: 'You have no character in this session.' };
  const words = c.sigils || [], designs = c.outbursts || [], known = c.soulKnown || { schools: [], modules: [] }, evo = hasEvoker(c), ema = hasEmanator(c);
  // A focus counts only in a hand (spec: Hands 2, item 630); carried, it keeps its store (charge, MP), so the sheet shows it.
  const evoC = carriesEvoker(c), emaC = carriesEmanator(c), evoAt = focusHand(c, 'evoker'), emaAt = focusHand(c, 'emanator');
  const N = magicNow(g, c), fight = N.inFight, mana = N.mana, m = soulM(c);
  const showSigil = words.length > 0 || evoC, showSoul = designs.length > 0 || known.schools.length > 0 || known.modules.length > 0 || emaC || !!N.held;
  // Sigils: the words known, as glyph cards (click for the Grand form), in the five word groups (rules 1.10: each card
  // shows its use count, a hollow star once Practised, a filled one once Mastered, and its inflection, greyed until earned).
  const GV = sigilGrowthView(c), useOf = Object.fromEntries(GV.words.map((x) => [x.word, x]));
  const rerender = () => self.setState({ wsTick: (self.state.wsTick || 0) + 1 });
  const TIER = { new: 'NEW', practised: 'PRACTISED', mastered: 'MASTERED' };
  const wordCard = (id) => { const w = SIGIL[id], open = S.mgWord === id, u = useOf[id] || { uses: 0, tier: 'new', practisedAt: 10, masteredAt: 30, inflection: null }, on = !!(u.inflection && u.inflection.unlocked);
    const nextAt = u.tier === 'new' ? u.practisedAt : u.masteredAt;
    return { key: id, img: glyphUri(id, SIGIL_INK, { glow: true }), word: w.word, cls: WORD_CLASS[w.class] || '', charge: 'CHARGE ' + w.charge, text: w.text, title: w.grand ? 'Grand form (Grand Sigilist): ' + w.grand : '',
      open: open ? 'true' : 'false', toggle: () => self.setState({ mgWord: open ? null : id }), hasGrand: open && !!w.grand, grand: w.grand || '', hint: w.grand ? (open ? '▾' : '▸') : '',
      star: starUri(u.tier), starAlt: TIER[u.tier], tierText: TIER[u.tier] + ' · ' + u.uses + (u.uses === 1 ? ' USE' : ' USES') + (u.tier === 'mastered' ? '' : ' / ' + nextAt),
      tierStyle: 'font-size: 10px; font-weight: 700; letter-spacing: 0.12em; color: ' + (u.tier === 'new' ? '#7F8BA1' : SIGIL_INK),
      hasInfl: !!u.inflection, inflText: u.inflection ? (on ? 'INFLECTION ON · ' : 'AT ' + u.masteredAt + ' USES · ') + u.inflection.text : '',
      inflStyle: 'font-size: 11px; line-height: 1.4; padding: 3px 6px; border-radius: 6px; ' + (on ? 'color: #E7EBF3; background: rgba(139, 222, 238, 0.08); border: 1px solid ' + SIGIL_INK : 'color: #7F8BA1; border: 1px dashed #2E3A50'),
      style: 'display: grid; grid-template-columns: 40px minmax(0, 1fr); gap: 4px 10px; align-items: start; width: 100%; padding: 8px 10px; border-radius: 10px; text-align: left; font-family: inherit; color: inherit; cursor: pointer; background: #10151F; border: 1px solid ' + (open ? SIG_CYAN : '#232D3F') + '; border-left: 3px solid ' + SIG_CYAN }; };
  const known0 = words.filter((id) => SIGIL[id]);
  const sigWs = groupedSection('magic.sigil', sigilWordGroups(known0, (x) => x).map((gr) => ({ ...gr, items: gr.items.map(wordCard) })), { ink: SIG_CYAN, rerender });
  const wordCards = sigWs.groups.flatMap((gr) => gr.items);
  // Study (rules 1.10.2): the bar from the last threshold to the next, the picks waiting, and the chooser.
  const room = GV.known < GV.cap, canPick = GV.pending > 0 && room, canFree = GV.free > 0, picking = S.mgLearn && !fight && ((S.mgLearn === 'pick' && canPick) || (S.mgLearn === 'free' && canFree)) ? S.mgLearn : null;
  if (S.mgLearn && !picking) queueMicrotask(() => self.setState({ mgLearn: null }));
  const span = Math.max(1, GV.next - GV.prev), into = Math.max(0, Math.min(span, GV.study - GV.prev));
  const copiedSet = new Set(GV.toStudy);
  const pickItem = (id) => { const w = SIGIL[id]; return { key: id, word: w.word, img: glyphUri(id, SIGIL_INK), copied: copiedSet.has(id), title: w.text, aria: 'Learn ' + w.word + (copiedSet.has(id) ? ' (copied)' : ''),
    pick: () => { act({ type: 'sigil/learn', charId: c.id, word: id, ...(picking === 'free' ? { free: true } : {}) }); self.setState({ mgLearn: null }); },
    style: chipStyle(SIG_CYAN, copiedSet.has(id)) + '; display: inline-flex; align-items: center; gap: 4px; min-height: 30px' }; };
  const pickWs = groupedSection('magic.learn', [{ key: 'copied', label: 'Copied', items: GV.toStudy.filter((x) => SIGIL[x]) }, ...sigilWordGroups(GV.learnable.filter((x) => !copiedSet.has(x)), (x) => x)].map((gr) => ({ ...gr, items: gr.items.map(pickItem) })), { ink: SIG_CYAN, rerender });
  const studyWhy = fight ? 'Learn words after the fight.' : GV.pending > 0 && !room ? 'A pick is banked: you know ' + GV.known + ' words, the most Brain Power allows (' + GV.cap + ').' : '';
  const st = { text: GV.study + ' STUDY', next: 'NEXT WORD AT ' + GV.next, fill: 'height: 100%; width: ' + Math.round(into / span * 100) + '%; background: ' + SIGIL_INK, meterNow: String(into), meterMax: String(span),
    line: 'Study comes from Evoking (more for longer Lines and for striking an enemy), copying glyphs and marks, and Mastery.' + (GV.pending ? ' ' + GV.pending + (GV.pending === 1 ? ' pick waits.' : ' picks wait.') : ''),
    canLearn: canPick && !fight, learnLabel: picking === 'pick' ? 'Close' : 'Learn a word', openPick: () => self.setState({ mgLearn: picking === 'pick' ? null : 'pick' }),
    canFree: canFree && !fight, freeLabel: picking === 'free' ? 'Close' : 'Take a free word (' + GV.free + ')', openFree: () => self.setState({ mgLearn: picking === 'free' ? null : 'free' }),
    why: studyWhy, hasWhy: !!studyWhy, picking: !!picking, pickHead: picking === 'free' ? 'A FREE WORD (MASTERY): IT IGNORES THE CAP' : 'LEARN A WORD · ' + GV.known + ' / ' + GV.cap + ' KNOWN', pick: pickWs,
    hasToStudy: GV.toStudy.length > 0, toStudy: GV.toStudy.filter((x) => SIGIL[x]).map((id) => ({ key: id, word: SIGIL[id].word, img: glyphUri(id, SIGIL_INK), title: SIGIL[id].text })) };
  const sigStats = [['Max Sigil words (longest Line; glyphs on the ground at once)', String(maxSigilWords(c))], ...(c.sigilFree ? [['Free words owed (old words retired in rules 1.4)', String(c.sigilFree)]] : []), ['Known words', words.length + ' / ' + wordsKnownCap(c)], ['Evoker', handWord(evoAt)], ['Evoker charge', evoC ? N.charge + ' / ' + CORE_CHARGE : '—'],
    ['Spare cores', String(N.cores)], ['Flux', N.flux + ' / ' + FLUX_MAX + (N.flux >= FLUX_MAX - 1 ? ' · vent soon' : '')], ['Glyph AP', String(glyphAp(c))]].map(([k, v]) => ({ k, v }));
  // Outbursts: MP, Strain, the designs ready, and the heart workshop.
  const mpMax = maxMp(c), mpPct = Math.round(N.mp / Math.max(1, mpMax) * 100);
  const designCards = designs.map((d) => { const cost = designCost(m, d, mana), held = !!(N.held && N.held.design === d.id), di = designInfo(m, d, mana);
    return { key: d.id, name: d.name, icon: di.icon, shapeLine: di.line, shapeStyle: 'font-size: 11px; font-weight: 700; letter-spacing: 0.04em; color: ' + di.ink, schools: di.schools, schools0: [d.school, d.school2].filter(Boolean).map((x) => SCHOOL[x]?.name || x).join(' + ') + (d.option ? ' · ' + optLabel(d.school, d.option) : ''),
      mods: d.modules.map((x) => ({ key: x, label: (MODULE[x]?.name || x) + ' ' + signed(MODULE[x]?.cost || 0), title: MODULE[x]?.text || '', style: 'padding: 1px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; border: 1px solid ' + epRgba(SOUL_VIOLET, 0.6) + '; color: ' + SOUL_VIOLET })),
      hasMods: d.modules.length > 0, line: cost + ' MP · ' + designAp(m, d) + ' AP · ' + reachWords(m, d), held, heldText: held ? 'HELD · STAGE ' + N.held.stage : '', heart: heartUri(held ? N.held.stage : 1),
      edit: () => self.setState({ mgDraft: { id: d.id, name: d.name, school: d.school, school2: d.school2 || '', modules: [...d.modules], option: d.option || '', option2: d.option2 || '', tone: d.tone || 'raw' }, mgSaved: null }),
      forget: () => { if (held) return toast('Release ' + d.name + ' first: a held Outburst can\'t be forgotten.'); askConfirm({ title: 'Forget the design ' + d.name + '?', body: 'You can design it again later.', confirm: 'Forget it', danger: true }).then((ok) => { if (ok) act({ type: 'magic/forget', charId: c.id, designId: d.id }); }); },
      locked: fight, noForget: fight || held, forgetTitle: held ? 'You are holding it: release it first.' : fight ? 'After the fight.' : 'Forget this design to make room.',
      style: 'display: flex; flex-direction: column; gap: 6px; padding: 10px; border-radius: 10px; background: #10151F; border: 1px solid ' + (held ? SOUL_VIOLET : '#232D3F') + '; border-left: 3px solid ' + SOUL_VIOLET }; });
  const soulStats = [['Emanator', handWord(emaAt)], ['Strain now', N.strain + ' / ' + strainLimit(c) + ' (the limit; past it, a Mana Short)'], ['Ready designs', designs.length + ' / ' + readyDesigns(c)], ['Module slots', String(moduleSlots(c))],
    ['Air', 'MANA ' + mana + ' · ' + bandName(N.band) + (N.band.soul_cost_mult !== 1 ? ' (costs ×' + N.band.soul_cost_mult + ')' : '')]].map(([k, v]) => ({ k, v }));
  // The builder: a school, its option, modules up to the slots, a name. The engine checks everything again on Save.
  const B = S.mgDraft, slots = moduleSlots(c), two = (c.skills.will_power || 0) >= SECOND_SCHOOL.fromWill;
  // Close once the save lands: the designs changed, or the game moved on with no refusal since Save (an unchanged
  // design saves to the same thing, so a content diff alone would leave the builder open).
  const stNow = getState(), refused = !!(stNow.toast && !stNow.toast.ok && stNow.toast.at >= (S.mgSavedAt || 0));
  if (B && S.mgSaved != null && (JSON.stringify(c.outbursts || []) !== S.mgSaved || (stNow.game !== S.mgSavedGame && !refused))) queueMicrotask(() => self.setState({ mgDraft: null, mgSaved: null, mgSavedGame: null }));
  const opts = B ? (SCHOOL[B.school]?.options || []) : [];
  const opts2 = B && B.school2 ? (SCHOOL[B.school2]?.options || []) : [];
  const draftD = B && B.school ? { id: B.id || '', name: B.name, school: B.school, ...(B.school2 ? { school2: B.school2 } : {}), modules: B.modules, ...(B.option ? { option: B.option } : {}), ...(B.school2 && B.option2 ? { option2: B.option2 } : {}), ...(B.tone && B.tone !== 'raw' ? { tone: B.tone } : {}) } : null;
  // Rules 1.5: a tone (Raw default; the first one free at Lore Master 1, rules 1.8), one shape (Size only with a shape), the rest.
  const kTones = known.tones || [], vis = c.skills.lore_master || 0, shapeOn = B ? B.modules.find((x) => isShape(x)) || null : null;
  const verdict = draftD ? designVerdict(m, draftD, mana) : null;
  const b = B ? {
    open: true, title: B.id ? 'EDIT ' + (B.name || 'DESIGN').toUpperCase() : 'NEW OUTBURST DESIGN', name: B.name, onName: (e) => set({ name: e.target.value.slice(0, 40) }),
    school: B.school, onSchool: (e) => { const sc = e.target.value, o = SCHOOL[sc]?.options || []; set({ school: sc, option: o.length ? optValue(o[0]) : '', ...(self.state.mgDraft.school2 === sc ? { school2: '', option2: '' } : {}) }); },
    schools: known.schools.map((x) => ({ key: x, value: x, label: SCHOOL[x]?.name || x })), schoolText: SCHOOL[B.school]?.text || '',
    twoHead: 'SECOND SCHOOL · A RIDER AT ' + Math.round(SECOND_SCHOOL.strength * 100) + '% (WILL POWER ' + SECOND_SCHOOL.fromWill + ', +' + SECOND_SCHOOL.cost + ' MP)',
    two: two && known.schools.length > 1, noTwo: !two || known.schools.length < 2, noTwoText: !two ? 'A second school needs Will Power ' + SECOND_SCHOOL.fromWill + '.' : 'Learn a second school first (a teacher).',
    schools2: [{ id: '', label: 'None' }, ...known.schools.filter((x) => x !== B.school).map((x) => ({ id: x, label: SCHOOL[x]?.name || x }))].map((o) => { const on = (B.school2 || '') === o.id;
      return { key: o.id || 'none', label: o.label, pressed: on ? 'true' : 'false', title: o.id ? SCHOOL[o.id]?.text || '' : 'One school only.', style: chipStyle(SOUL_VIOLET, on),
        pick: () => { const o2 = SCHOOL[o.id]?.options || []; set({ school2: o.id, option2: o2.length ? optValue(o2[0]) : '' }); } }; }),
    hasOptions2: opts2.length > 0, options2: opts2.map((o) => { const v = optValue(o), on = B.option2 === v; return { key: o, label: OPT_LABEL[o] || o, pressed: on ? 'true' : 'false', pick: () => set({ option2: v }), style: chipStyle(SOUL_VIOLET, on) }; }),
    tones: toneChips(kTones, vis).map((t) => { const on = (B.tone || 'raw') === t.id, can = t.known || t.free;
      return { key: t.id, label: t.name + (t.free ? ' · free' : ''), pressed: on ? 'true' : 'false', locked: !can, title: t.text + (can ? '' : ' Not learned yet (a teacher or a plate).') + (t.free ? ' Your first tone is free at Lore Master 1: learned with this design.' : ''),
        pick: () => { if (can) set({ tone: t.id }); }, style: chipStyle(t.ink, on) + (can ? '' : '; opacity: 0.4; cursor: default') }; }),
    shapes: [{ id: '', name: 'Bolt' }, ...known.modules.filter((x) => isShape(x)).map((x) => ({ id: x, name: MODULE[x]?.name || x }))].map((x) => { const on = (shapeOn || '') === x.id, full = !on && !!x.id && !shapeOn && B.modules.length >= slots;
      return { key: x.id || 'bolt', label: x.name + (x.id ? ' ' + signed(MODULE[x.id]?.cost || 0) : ''), icon: formIconUri(x.id || 'bolt', toneInk(B.tone)), pressed: on ? 'true' : 'false', locked: full, title: x.id ? MODULE[x.id]?.text || '' : 'One target (the default; no module).',
        pick: () => { if (full) return; const rest = self.state.mgDraft.modules.filter((y) => !isShape(y)); set({ modules: x.id ? [...rest, x.id] : rest.filter((y) => y !== 'size') }); }, style: chipStyle(SOUL_VIOLET, on) + (full ? '; opacity: 0.45; cursor: default' : '') }; }),
    slotsText: 'MODULES · ' + B.modules.length + ' / ' + slots + ' (Will Power; the shape takes one)', noModules: !known.modules.filter((x) => !isShape(x)).length,
    modules: known.modules.filter((x) => !isShape(x)).map((x) => { const on = B.modules.includes(x), full = !on && B.modules.length >= slots, noShape = x === 'size' && !shapeOn && !on, lock = full || noShape;
      return { key: x, label: (MODULE[x]?.name || x) + ' ' + signed(MODULE[x]?.cost || 0), title: (MODULE[x]?.text || '') + (noShape ? ' Size needs a shape.' : ''), pressed: on ? 'true' : 'false', locked: lock,
        pick: () => set({ modules: on ? self.state.mgDraft.modules.filter((y) => y !== x) : [...self.state.mgDraft.modules, x] }), style: chipStyle(SOUL_VIOLET, on) + (lock ? '; opacity: 0.45; cursor: default' : '') }; }),
    verdictEffects: verdict ? verdict.effects : '', verdictRider: verdict ? verdict.rider : '', verdictLine: verdict ? verdict.line : '', verdictIcon: draftD ? designInfo(m, draftD, mana).icon : formIconUri('bolt'),
    cost: draftD ? designCost(m, draftD, mana) + ' MP · Begin ' + designAp(m, draftD) + ' AP, Pump 1 AP a stage, Release 1 AP (Snap: 3 AP ×' + STAGE_MULT[0] + ') · in ' + bandName(N.band) + ' air' : 'Pick a school.',
    cantSave: !draftD || fight, save: () => { if (!draftD) return; self.setState({ mgSaved: JSON.stringify(c.outbursts || []), mgSavedGame: getState().game, mgSavedAt: Date.now() }); act({ type: 'magic/design', charId: c.id, design: draftD }); },
    cancel: () => self.setState({ mgDraft: null, mgSaved: null }), saveLabel: B.id ? 'Save changes' : 'Save design',
  } : none.b;
  const canNew = !fight && !designBan(c) && known.schools.length > 0 && designs.length < readyDesigns(c);
  // Learning: from an ally who knows it, or from a Sigil plate in the pack. One new thing a scene.
  const learnedNow = c.learnedScene === g.story.scene.n, learnLocked = fight || learnedNow;
  const teach = new Map(), addT = (kind, id, label, who) => { const k = kind + ':' + id; if (!teach.has(k)) teach.set(k, { kind, id, label, who: [] }); teach.get(k).who.push(who); };
  for (const x of Object.values(g.characters)) { if (x.id === c.id || x.dead) continue;
    (x.sigils || []).forEach((w) => { if (!words.includes(w) && SIGIL[w]) addT('word', w, SIGIL[w].word, x.name); });
    (x.soulKnown?.schools || []).forEach((s) => { if (!known.schools.includes(s) && SCHOOL[s]) addT('school', s, SCHOOL[s].name + ' school', x.name); });
    (x.soulKnown?.modules || []).forEach((s) => { if (!known.modules.includes(s) && MODULE[s]) addT('module', s, MODULE[s].name + ' module', x.name); });
    (x.soulKnown?.tones || []).forEach((s) => { if (!(known.tones || []).includes(s) && TONE[s] && s !== 'raw') addT('tone', s, TONE[s].name + ' tone', x.name); }); }
  const ally = [...teach.values()].map((t) => ({ key: t.kind + t.id, label: t.label, sub: 'from ' + t.who.join(' or '), isWord: t.kind === 'word', img: t.kind === 'word' ? glyphUri(t.id, SIGIL_INK) : heartUri(1), locked: learnLocked,
    title: t.kind === 'word' ? SIGIL[t.id].text : t.kind === 'school' ? SCHOOL[t.id].text : t.kind === 'tone' ? TONE[t.id].text || '' : MODULE[t.id].text,
    go: () => act({ type: 'magic/learn', charId: c.id, [t.kind]: t.id, from: 'ally' }),
    style: chipStyle(t.kind === 'word' ? SIG_CYAN : SOUL_VIOLET, false) + '; min-height: 36px; border-radius: 10px' + (learnLocked ? '; opacity: 0.5; cursor: default' : '') }));
  const plates = packOf(c).filter((x) => (x.item || x.id) === 'sigil_plate').map((x, i) => { const w = (x.note || '').toLowerCase(), def = SIGIL[w];
    return { key: 'p' + i + w, title: def ? def.text || '' : 'The word is too worn to read.', label: 'Read the plate: ' + (def ? def.word : (x.note || 'an unknown word')), sub: '×' + x.qty + (def && words.includes(w) ? ' · known already' : ''), img: def ? glyphUri(w, SIGIL_INK) : scratchUri(), locked: learnLocked || !def,
      go: () => act({ type: 'magic/learn', charId: c.id, word: w, from: 'plate' }), style: chipStyle(SIG_CYAN, false) + '; min-height: 36px; border-radius: 10px' + (learnLocked || !def ? '; opacity: 0.5; cursor: default' : '') }; });
  // Heart plates (rules 1.5 section 5): one Outburst lesson each, a tone, a school or a module (the pack note).
  const heartPlates = packOf(c).filter((x) => (x.item || x.id) === 'heart_plate').map((x, i) => {
    const id = String(x.note || '').toLowerCase().replace(/^(tone|school|module)\s*:\s*/, '').replace(/\s+(tone|school|module)$/, '').trim().replace(/\s+/g, '_');
    const kind = TONE[id] && id !== 'raw' ? 'tone' : SCHOOL[id] ? 'school' : MODULE[id] ? 'module' : '';
    const def = kind === 'tone' ? TONE[id] : kind === 'school' ? SCHOOL[id] : kind === 'module' ? MODULE[id] : null;
    const have = kind === 'tone' ? (known.tones || []).includes(id) : kind === 'school' ? known.schools.includes(id) : kind === 'module' ? known.modules.includes(id) : false;
    const off = learnLocked || !def || have;
    return { key: 'h' + i + id, label: 'Read the Heart plate: ' + (def ? def.name + ' ' + kind : (x.note || 'an unreadable lesson')), sub: '×' + x.qty + (have ? ' · known already' : ''), isWord: false, img: heartUri(1), locked: off,
      title: def ? def.text || '' : 'The lesson is too worn to read.',
      go: () => { if (!off) act({ type: 'magic/learn', charId: c.id, [kind]: id, from: 'plate' }); }, style: chipStyle(SOUL_VIOLET, false) + '; min-height: 36px; border-radius: 10px' + (off ? '; opacity: 0.5; cursor: default' : '') }; });
  plates.push(...heartPlates);
  // Rules 1.8 (Outburst 4.0): the codex, collapsible and grouped (feelings; modules by gate skill, the advanced classes'
  // locked), practice and its picks, and the starting templates as one-click designs.
  const pv = showSoul ? practiceView(c) : null, left = pv ? soulPicksLeft(c) : { practice: 0, mastered: [] };
  const designRoom = designs.length < readyDesigns(c) && !fight && !designBan(c);
  const viaFor = (id) => (left.practice > 0 ? 'practice' : left.mastered.find((sk) => gatedBy(sk).includes(id)) || null);
  const codex = {
    feltCount: (c.feelings || []).length + ' / ' + FEELINGS.length + ' FELT',
    feelings: feelingCodex(c).map((f) => ({ key: f.id, name: f.name, icon: f.icon, line: f.known ? f.step + ' · ' + f.effect : f.trigger, sub: f.known ? f.residue : '', known: f.known,
      title: f.name + (f.known ? '' : ' (not felt yet)') + ': ' + f.effect + ' ' + f.residue + ' ' + f.trigger,
      style: 'display: grid; grid-template-columns: 24px minmax(0, 1fr); gap: 1px 8px; align-items: start; padding: 6px 8px; border-radius: 8px; background: #10151F; border: 1px solid ' + (f.known ? epRgba(f.ink, 0.55) : '#1C2536') + (f.known ? '' : '; opacity: 0.65'),
      nameStyle: 'font-size: 12px; font-weight: 700; color: ' + (f.known ? f.ink : '#A3AEC2') })),
    groups: moduleGroups(c).map((gr) => ({ key: gr.key, label: gr.label.toUpperCase() + ' · ' + gr.blurb, count: gr.modules.filter((x) => x.known).length + ' / ' + gr.modules.length,
      modules: gr.modules.map((md) => { const via = !md.known && md.ok ? viaFor(md.id) : null;
        return { key: md.id, known: md.known, name: md.name, icon: md.icon, state: md.known ? '✓ KNOWN' : md.locked ? 'LOCKED · ' + (md.why || 'its class') : md.ok ? (md.gate ? md.gate + ' · learnable' : 'learnable') : '✕ ' + md.why.replace(/\.$/, ''),
          title: md.name + ' (' + (md.cost >= 0 ? '+' : '−') + Math.abs(md.cost) + ' MP): ' + md.text, canPick: !!via && !fight, pickLabel: via === 'practice' ? 'Pick (practice)' : via ? 'Pick (Mastered ' + (SKILL[via]?.name || via) + ')' : '',
          pick: () => { if (via) act({ type: 'magic/pick', charId: c.id, module: md.id, via }); },
          style: 'display: grid; grid-template-columns: 22px minmax(0, 1fr) auto; gap: 1px 8px; align-items: center; padding: 5px 8px; border-radius: 8px; background: #10151F; border: 1px solid ' + (md.known ? '#3A2E5C' : '#1C2536') + (md.known || md.ok ? '' : '; opacity: 0.6'),
          stateStyle: 'grid-column: 2; font-size: 10px; font-weight: 700; letter-spacing: 0.06em; color: ' + (md.known ? '#6FEA77' : md.ok ? '#C9D3E3' : '#A3AEC2') }; }) })),
    hasPractice: !!pv, practiceText: pv ? pv.text : '', practiceHint: pv ? pv.hint + (left.mastered.length ? ' · free picks from Mastered ' + left.mastered.map((sk) => SKILL[sk]?.name || sk).join(', ') : '') : '',
    practiceFill: 'height: 100%; width: ' + (pv ? pv.pct : 0) + '%; background: #AE9BFF',
    templates: DESIGN_TEMPLATES().map((t) => { const ok = designRoom && (known.schools || []).includes(t.school) && (t.modules || []).every((x) => (known.modules || []).includes(x));
      return { key: t.id, name: t.name, text: t.text || '', icon: formIconUri((t.modules || []).find((x) => isShape(x)) || 'bolt'), off: !ok,
        title: ok ? 'Add ' + t.name + ' to your ready designs.' : fight ? 'After the fight.' : !designRoom ? 'No room: forget a design first.' : 'You need its school and modules first.',
        add: () => { if (ok) act({ type: 'magic/design', charId: c.id, design: { id: '', name: t.name, school: t.school, modules: [...(t.modules || [])], ...(t.option ? { option: t.option } : {}) } }); } }; }),
  };
  // The Outburst section in the shared workshop (workshopGroups.tsx; Outburst 4.0 spec section 8): the designs, then
  // 4.0's codex (templates, feelings, modules by gate skill, each gate a group of its own), every header collapsible and
  // remembered in this browser like the Sigil word groups. The practice bar stays above the groups, like the study bar.
  const gates = groupedSection('magic.soul.modules', codex.groups.map((gr) => ({ key: gr.key, label: gr.label, items: gr.modules, count: gr.count, dflt: false })), { ink: '#C9D3E3', rerender });
  const soulWs = groupedSection('magic.soul', [
    { key: 'designs', label: 'Designs', n: designCards.length, items: [...designCards.map((d) => ({ ...d, isDesign: true })), { key: 'new', isNew: true }] },
    { key: 'templates', label: 'Templates · one-click designs', n: codex.templates.length, dflt: false, items: [{ key: 'templates', isTemplates: true }] },
    { key: 'feelings', label: 'Feelings', count: codex.feltCount, dflt: false, items: [{ key: 'feelings', isFeelings: true }] },
    { key: 'modules', label: 'Modules · by gate skill', count: codex.groups.reduce((n, gr) => n + gr.modules.filter((x) => x.known).length, 0) + ' / ' + codex.groups.reduce((n, gr) => n + gr.modules.length, 0), dflt: false, items: [{ key: 'gates', isGates: true, gates }] },
  ], { ink: SOUL_VIOLET, rerender });
  const anyMagic = showSigil || showSoul;
  return {
    has: anyMagic, empty: !anyMagic, emptyText: 'No magic yet: Sigil words come from Brain Power, Outbursts from Will Power, or a teacher.',
    showSigil, showSoul, noEvoker: words.length > 0 && !evo, noEvokerText: evoC ? '⚠ ' + NEEDS_EVOKER + ' Yours is in the pack: it keeps its charge, but you can\'t draw until you hold it (GEAR: the off hand).' : '⚠ No Evoker carried: you know the words but can\'t draw them until you hold one.',
    st, sig: { ws: sigWs, words: wordCards, stats: sigStats, noWords: !wordCards.length, head: 'SIGILS · MIND · ' + words.length + (words.length === 1 ? ' WORD' : ' WORDS') },
    soul: { ws: soulWs, designs: designCards, noDesigns: !designs.length, stats: soulStats, ema: emaC, noEma: !ema, noEmaText: emaC ? NEEDS_EMANATOR + ' Yours is in the pack: it keeps its MP, but an Outburst pulls from the air instead, at +2 Strain a cast, and Syphon waits (GEAR: the off hand).' : 'No Emanator carried: an Outburst pulls from the air instead of your MP, at +2 Strain a cast.',
      mpText: N.mp + ' / ' + mpMax + ' MP', mpFill: 'height: 100%; width: ' + Math.max(0, Math.min(100, mpPct)) + '%; background: ' + MP_BLUE,
      held: !!N.held, heldText: N.held ? 'HOLDING ' + ((designs.find((d) => d.id === N.held.design) || {}).name || 'an Outburst').toUpperCase() + ' · STAGE ' + N.held.stage + ' · it grows each round, and strains the heart, until you release it' : '', heldImg: heartUri(N.held ? N.held.stage : 1),
      head: 'OUTBURSTS · SOUL · ' + designs.length + (designs.length === 1 ? ' DESIGN' : ' DESIGNS'), canNew, newDesign: () => self.setState({ mgDraft: { id: null, name: '', school: known.schools[0], school2: '', option2: '', tone: 'raw', modules: [], option: optValue((SCHOOL[known.schools[0]]?.options || [''])[0] || '') }, mgSaved: null }),
      newWhy: fight ? 'Design Outbursts after the fight.' : !known.schools.length ? 'Learn a school first (Will Power, or a teacher).' : designs.length >= readyDesigns(c) ? 'You keep ' + readyDesigns(c) + ' designs ready (' + SKILL.will_power.name + '): forget one to make room.' : '',
      knownText: 'Schools: ' + (known.schools.map((x) => SCHOOL[x]?.name || x).join(', ') || 'none') + ' · Tones: Raw' + (known.tones || []).map((x) => ', ' + (TONE[x]?.name || x)).join('') + ' · Modules: ' + (known.modules.map((x) => MODULE[x]?.name || x).join(', ') || 'none') },
    codex, b, learn: { ally, plates, hasAlly: ally.length > 0, hasPlates: plates.length > 0, any: ally.length + plates.length > 0, locked: learnLocked,
      why: fight ? 'Learn after the fight.' : learnedNow ? 'One new thing a scene: it takes a rest to sink in.' : 'One new thing a scene. Words: ' + words.length + ' / ' + wordsKnownCap(c) + ' known.' },
  };
}

export class MainLogic extends DCLogic {
  constructor(props) {
    super(props);
    this.state = { tab: 'skills', core: 'body', sel: null, draft: '', rawDraft: '', polished: false, polishing: false, pickRoll: false, dice: null, custom: false, area: false, table: pref('table', 'felt'), skin: pref('skin', 'ivory') };
  }

  /** The area map: open it (the header's Area map button, the M key), or close it if it is open. A key press never
   *  opens it over another dialog. */
  toggleArea(fromButton) {
    if (this.state.area) { if (!fromButton) closeAnim(this, 'area', () => this.setState({ area: false, wTarget: null })); return; }
    if (!fromButton && typeof document !== 'undefined' && document.querySelector('[role="dialog"][aria-modal="true"]')) return;
    this.setState({ area: true, shNarr: false });
  }
  /** The right column's four modules (game/storyPanels.ts): each one's place (CSS order), its grip's handlers, the
   *  reset link, and the player card's styles. `seats`: how many the player card keeps room for (four players and the
   *  Narrator; four in the Proving Ground, which has no Narrator). The order is this browser's, not the game's. */
  panelVals(seats) {
    const order = this._rp || (this._rp = readStoryPanels());
    const set = (o, focus) => { this._rp = o; saveStoryPanels(o); this.setState({});
      // the keyboard stays on the grip it moved
      if (focus && typeof requestAnimationFrame !== 'undefined') requestAnimationFrame(() => { const b = document.querySelector('[data-rp-grip="' + focus + '"]'); if (b) b.focus(); }); };
    const o = {}, grip = {}, gripKey = {};
    STORY_PANELS.forEach((id) => { o[id] = order.indexOf(id);
      grip[id] = (e) => startStoryDrag(e.nativeEvent || e, id, this._rp, (n) => set(n));
      gripKey[id] = (e) => { const n = keyMoveStoryPanel(e.key, id, this._rp); if (n) { e.preventDefault(); set(n, id); } }; });
    const last = order[order.length - 1] === 'squad';
    return { o, grip, gripKey, custom: !isDefaultOrder(order), reset: () => set([...STORY_PANELS]), names: STORY_PANEL_NAME,
      // Last in the column (its first place), the player card sticks to the bottom so End turn is always in reach;
      // moved up, it sits in the flow like the others.
      squadStyle: 'order: ' + o.squad + '; flex: none; display: flex; flex-direction: column; gap: 8px; background: #0A0D13; '
        + (last ? 'margin-top: auto; position: sticky; bottom: -14px; z-index: 2; padding: 10px 0 0; border-top: 1px solid #232D3F' : 'padding: 10px 0; border-top: 1px solid #232D3F; border-bottom: 1px solid #232D3F'),
      // Two seats a row; the rows for every seat are kept even when fewer sit (the card never grows or clips mid-game).
      seatsStyle: 'display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); grid-auto-rows: ' + SQUAD_ROW_PX + 'px; gap: ' + SQUAD_GAP_PX + 'px 10px; align-items: center; min-height: ' + squadMinHeight(seats) + 'px' };
  }
  renderVals() {
    const S = this.state, st = getState(), g = st.game, me = st.me.id, isHost = st.role === 'host';
    if (!g) return { ...lightboxVals(this), ...epccgVals(this), stream: [], order: [], tabs: [], coreTabs: [], sheetSkills: [], bars: [], barsA: [], barsB: [], echoV: { has: false, pips: [], sections: [] }, qb: { has: false, groups: [] }, sfc: { has: false, gauge: [], effects: [], movers: [] }, rp: { o: {}, grip: {}, gripKey: {} }, pc: {} };
    const mine = Object.values(g.characters).filter((c) => c.owner === me);
    const c = mine.find((x) => x.id === S.sel) || mine[0] || null;
    const P = (id) => (c ? c.skills[id] || 0 : 0), A = (id) => (c ? c.attrs[id] || 1 : 1);
    const playerOf = (pid) => g.players.find((p) => p.id === pid) || { name: '?', initials: '?', color: '#A3AEC2' };
    const myColor = playerOf(me).color;

    // ---------- the sheet ----------
    const echo = c ? c.echo : 0;
    // Echo's row (UI pass 4): a change flares the diamond for a moment, and a gain says where it came from.
    // Only a real change counts: every one of your characters is tracked each render (switching the sheet to another
    // character is not a gain), a rewind (a reroll vote: the story got shorter) is not a gain, and the reason is read
    // only from story entries that arrived since the last render (review of the UI pass).
    const eKey = c ? c.id : '', was = (this._echoWas || {})[eKey];
    const ents = g.story.entries || [], lastSeenId = this._entLast, rewound = this._entN != null && ents.length < this._entN;
    if (c && was != null && was !== echo && !rewound) {
      this._echoFx = { id: eKey, dir: echo > was ? 'up' : 'down', at: Date.now() };
      if (echo > was) {
        const at = lastSeenId ? ents.findIndex((e) => e.id === lastSeenId) : -1, from = at >= 0 ? at + 1 : Math.max(0, ents.length - 1);
        const why = ents.slice(from).reverse().find((e) => e.charId === c.id && /\+1 ECHO/.test(e.head || '')), sk = why ? why.head.split(' · ')[0].toLowerCase().replace(/^./, (x) => x.toUpperCase()) : '';
        setTimeout(() => toast('◆ +' + (echo - was) + ' ECHO · ' + (sk ? 'you indulged ' + sk : c.name + ' now holds ' + echo + ' / ' + echoMax()), true), 0);
      }
    }
    this._echoWas = Object.fromEntries(Object.values(g.characters).filter((x) => x.owner === me).map((x) => [x.id, x.echo]));
    this._entN = ents.length; this._entLast = ents.length ? ents[ents.length - 1].id : null;
    const eFx = this._echoFx && this._echoFx.id === eKey && Date.now() - this._echoFx.at < 1400 ? this._echoFx.dir : '';
    const echoV = c ? { ...echoView(echo, eFx), open: !!S.echoOpen, expanded: S.echoOpen ? 'true' : 'false', glyph: S.echoOpen ? '×' : '?', cls: eFx ? 'phc-echo-row-flare' : '',
      toggle: () => this.setState({ echoOpen: !this.state.echoOpen }) } : { has: false, pips: [], sections: [] };
    const hpMax = c ? maxHp(c) : 1, mpMax = c ? maxMp(c) : 1, mpNowV = c ? magicNow(g, c).mp : 0, ema = !!c && carriesEmanator(c), emaHeld = !!c && hasEmanator(c), next = c ? xpForLevel(c.level + 1) : 1, prevXp = c ? xpForLevel(c.level) : 0;
    const bars = c ? [['HP', '#F65157', Math.round(c.hp / hpMax * 100), c.hp + ' / ' + hpMax], ['MP', '#5C9EFF', ema ? Math.round(mpNowV / Math.max(1, mpMax) * 100) : 0, ema ? mpNowV + ' / ' + mpMax + (emaHeld ? '' : ' · in the pack') : 'no Emanator'],
      ['XP', '#A3AEC2', c.level >= 20 ? 100 : Math.round((c.xp - prevXp) / Math.max(1, next - prevXp) * 100), c.xp.toLocaleString() + ' / ' + next.toLocaleString()]]
      .map(([label, col, pct, text]) => ({ label, text, labelStyle: 'font-size: 11px; font-weight: 700; letter-spacing: 0.1em; color: ' + col, fill: 'width: ' + Math.max(0, Math.min(100, pct)) + '%; height: 100%; background: ' + col })) : [];
    const barsA = bars.filter((b) => b.label !== 'XP'), barsB = bars.filter((b) => b.label === 'XP');
    const TAB_IDS = ['skills', 'status', 'perks', 'gear', 'arms', 'magic', 'faith'], tabDir = (to, from) => (TAB_IDS.indexOf(to) < TAB_IDS.indexOf(from) ? 'l' : 'r');
    // The sheet's tabs wrap onto a second line when the seven don't fit (never squeezed, never scrolled sideways); each
    // tab carries its own frame, so the open one's mark stays with it on either line. Arrow keys follow the order on
    // screen (Left and Right along the lines, Up and Down between them), Home and End the first and last.
    const openTab = (id, focus) => { if (this.state.tab !== id) this.setState({ tab: id, tabDir: tabDir(id, this.state.tab), tip: null, gearMenu: null });
      if (focus && typeof document !== 'undefined') { const el = document.getElementById('phc-sheet-tab-' + id); if (el) el.focus(); } };
    const tabs = [['skills', 'SKILLS'], ['status', 'STATUS'], ['perks', 'PERKS'], ['gear', 'GEAR'], ['arms', 'ARMS'], ['magic', 'MAGIC'], ['faith', 'FAITH']].map(([id, label], i) => ({ key: id, id: 'phc-sheet-tab-' + id, label, pick: () => openTab(id), selected: S.tab === id ? 'true' : 'false', tabindex: S.tab === id ? '0' : '-1',
      onKey: (e) => { const j = tabNavIndex(e, TAB_IDS.length, TAB_IDS.indexOf(this.state.tab)); if (j < 0) return; e.preventDefault(); openTab(TAB_IDS[j], true); },
      style: 'flex: 1 0 auto; box-sizing: border-box; min-height: 36px; padding: 0 12px; border-radius: 8px; font-family: inherit; font-size: 12px; font-weight: 700; letter-spacing: 0.06em; white-space: nowrap; cursor: pointer; ' + (S.tab === id ? 'border: 1px solid #E7EBF3; border-bottom: 3px solid #E7EBF3; background: #1C2536; color: #E7EBF3' : 'border: 1px solid #232D3F; border-bottom: 3px solid #232D3F; background: transparent; color: #A3AEC2') }));
    const CORES = ['body', 'mind', 'soul'];
    const coreTabs = CORES.map((k) => ({ label: k.toUpperCase(), pick: () => { if (this.state.core !== k) this.setState({ core: k, coreDir: CORES.indexOf(k) < CORES.indexOf(this.state.core) ? 'l' : 'r' }); }, pressed: S.core === k ? 'true' : 'false',
      style: 'flex: 1; min-height: 36px; border-radius: 8px; font-family: inherit; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; cursor: pointer; color: ' + D.core[k] + '; ' + (S.core === k ? 'border: 1px solid ' + D.core[k] + '; background: #1C2536' : 'border: 1px solid #232D3F; background: transparent') }));
    const asked = (c && g.story.scene.asked[c.id]) || [];
    // Ask shows only on skills whose voice has something to say in this scene (a hook not yet revealed to this character:
    // the view carries the skill names, never the hooks); the other trained skills are Silent (Leon, combat feel v1).
    const voiced = (c && (g.story.scene.voiced || {})[c.id]) || [];
    const sheetSkills = D.skills.filter((s) => s.core === S.core).map((s) => {
      const p = P(s.id), m = checkMod(s.id, p), ink = ATTR[s.attr].ink, done = asked.includes(s.id), off = !c || p === 0 || g.phase !== 'story', silent = !done && !off && !voiced.includes(s.id);
      return { key: s.id, zoom: zoomer(this, s.img, s.name, 'skill'), img: s.img, name: s.name, attr: ATTR[s.attr].name, pts: p, mod: fmt(m), help: () => this.setState({ epccg: s.id }), helpStyle: epBtnStyle(ink),
        ask: () => act({ type: 'voice/ask', charId: c.id, skill: s.id }), noAsk: done || off || silent, askLabel: done ? 'Asked' : silent || off ? 'Silent' : 'Ask',
        askTitle: done ? 'Asked once this scene.' : silent ? 'Nothing to say about this right now.' : off ? (p === 0 ? 'No points: no voice yet.' : g.phase !== 'story' ? 'Ask a skill out of combat.' : '') : 'It has something to say. Ask it (once this scene).',
        rowCls: 'phc-m-tab-' + (S.coreDir || 'r'),
        nameStyle: 'font-size: 14px; font-weight: 700; color: ' + (p ? ink : '#A3AEC2'), modStyle: 'font-size: 13px; text-align: right; color: ' + (p ? '#E7EBF3' : '#7F8BA1'),
        askStyle: 'min-height: 32px; border-radius: 6px; font-family: inherit; font-size: 12px; font-weight: 600; cursor: pointer; ' + (silent || (off && !done) ? 'border: 1px dashed #232D3F; background: transparent; color: #5B6577; font-style: italic' : done ? 'border: 1px solid #232D3F; background: transparent; color: #7F8BA1' : 'border: 1px solid ' + ink + '; background: ' + epRgba(ink, 0.14) + '; color: ' + ink) };
    });
    const au = P('authority'), lead = au >= 5 ? 'Command' : au >= 3 ? 'Platoon' : au >= 1 ? 'Squad' : 'Unfit';
    const w = c ? WEAPON[c.weapon] : null;
    // The derived lines: the engine's numbers, each with the attribute and skill behind it (game/derived.ts).
    const status = c ? [...derivedLines(c).filter((r) => r.key !== 'hp' && r.key !== 'mp').map((r) => ({ key: r.key, k: r.k, v: r.v, from: r.from, hasFrom: true })),
      { key: 'lead', k: 'Leadership', v: lead, from: SKILL.authority.name, hasFrom: true }, { key: 'karma', k: 'Karma', v: '0 · Neutral', from: '', hasFrom: false }] : [];
    const rep = [{ k: 'Factions', v: 'No standing yet' }];
    const inj = c ? c.injuries || [] : [];
    const statusFig = bodyFigure({ injuries: inj, mainSide: side0(c) });
    const ow = c ? overweightKg(c) : 0;
    const injuries = [...inj.map((i, n) => ({ key: n, where: ((i.side ? i.side + ' ' : '') + i.loc).toUpperCase() + ' · INJURED', what: injuryText[i.loc] })),
      ...(ow > 0 ? [{ key: 'ow', where: 'OVERBURDENED', what: ow + ' kg over your carry limit: −' + Math.ceil(ow / 5) + ' Movement and no Sprint until you drop something.' }] : [])];
    // Who runs each item (engine effects/coverage.ts): "Engine runs it", "Narrator rules it" or "Both", always in words.
    const BADGE_INK = { engine: '#E7EBF3', both: '#C9D3E3', narrator: '#A3AEC2' };
    const badgeStyleOf = (v) => 'padding: 1px 8px; border-radius: 999px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.04em; border: 1px ' + (v === 'narrator' ? 'dashed' : 'solid') + ' ' + BADGE_INK[v] + '; color: ' + BADGE_INK[v];
    const badgeOf = (key, tier) => { const v = verdictFor(key, tier); return { badge: v.label, badgeStyle: badgeStyleOf(v.verdict) }; };
    // Uses left (game/classView.ts usesLine): this fight, scene, session or rest, from the engine's own counters.
    const usesOf = (key, tier) => { const u = c ? usesLine(g, c, key, tier) : ''; return { uses: u, hasUses: !!u }; };
    const traits = c ? c.traits.map((id) => TRAIT[id]).filter(Boolean).map((t) => ({ key: t.id, name: t.name, icon: t.icon, text: t.up[0] || t.flavour, zoom: zoomer(this, t.icon, t.name, 'icon'), ...badgeOf('trait:' + t.id), ...usesOf('trait:' + t.id) })) : [];
    const perks = c ? c.perks.map((x) => { const p = PERK[x.id], sk = p.skills[0], ink = sk ? ATTR[SK[sk].attr].ink : '#FFFFFF', icon = PERK_ICON[x.id] || IMG['wick-mind-without-fog'];
      const text = p.tiers ? (x.tier === 'II' ? p.tiers.II.text : p.tiers.I.text) : p.text;
      return { key: x.id, zoom: zoomer(this, icon, p.name, 'perk'), name: p.name, icon, text: text.charAt(0).toUpperCase() + text.slice(1),
        tier: x.tier === 'I' || x.tier === 'II' ? 'TIER ' + x.tier : x.tier.toUpperCase(), chip: p.skills.map((s) => SKILL[s].name).join(' + ') || 'Ultimate',
        chipStyle: 'padding: 1px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; border: 1px solid ' + ink + '; color: ' + ink, ...badgeOf('perk:' + x.id, x.tier), ...usesOf('perk:' + x.id, x.tier) }; }) : [];
    // The class and its moves (spec: Classes; game/classView.ts): every rank's move, held or locked with what it takes,
    // who runs it and the uses left, under the emblem, the rank and the class attribute's progress (II at 5, III at 8).
    const klass = c ? classOf(c) : null, clsEm = emblemOf(heldClassId(c));
    const moveCard = (m) => ({ ...m, rank: m.rank + (m.ap ? ' · ' + m.ap : '') + (m.earned ? '' : ' · LOCKED: ' + m.unlock), locked: !m.earned, badgeStyle: badgeStyleOf(m.verdict), hasUses: !!m.uses,
      style: 'display: flex; flex-direction: column; gap: 3px; padding: 8px 10px; border-radius: 10px; background: #10151F; border: 1px solid ' + (m.earned ? clsEm.ink : '#232D3F') + (m.earned ? '' : '; opacity: 0.55') });
    const classMoves = !c ? [] : [...(c.classId ? classMovesOf(g, c, c.classId) : []), ...(c.advancedClass ? advancedMoves(g, c, c.advancedClass) : [])].map(moveCard);
    const clsSig = c && c.classId ? attributeProgress(c, c.classId) : null;
    const classHead = klass ? { name: classLabel(c).toUpperCase(), icon: klass.icon, ink: klass.ink, sig: clsSig ? clsSig.attributeName + ' ' + clsSig.total + ' · ' + clsSig.nextLine : '',
      bar: clsSig ? 'height: 100%; border-radius: 99px; background: ' + klass.ink + '; width: ' + clsSig.pct + '%' : '' } : null;
    const top = c ? Object.entries(c.skills).filter(([, p]) => p > 0 && p < 10).sort((a, b) => b[1] - a[1])[0] : null;
    const mp = top ? masteredVals(this, SK[top[0]].ep.mastered, ATTR[SK[top[0]].attr].ink, SK[top[0]].name, top[1]) : {};
    // Gear: the body figure, the slot list beside it, and the backpack rig.
    const kitDef = c ? KITS[c.kit] || KITS.medic : null, side = c ? mainHandSide(c) : 'right';
    const ws = c ? c.weaponState || {} : {}, wd = c ? weaponDurOf(c) : 0, wmax = c ? maxDurOf(c.weapon, ws.rarity) : 0;
    const wear = (d, m) => (m ? (d <= 0 ? 'BROKEN' : d <= m * 0.25 ? 'worn ' + d + '/' + m : 'durability ' + d + '/' + m) : '');
    const worn = c ? { main: [(ws.name || (w.name === WEAPON[kitDef.weapon]?.name && kitDef.weaponName ? kitDef.weaponName : w.name)) + (ws.rarity && ws.rarity !== 'standard' ? ' · ' + ws.rarity.toUpperCase() : ''),
        [(typeof w.damage === 'number' ? w.damage + ' dmg' : 'damage varies') + (typeof w.range_tiles === 'number' ? ' · ' + w.range_tiles + ' tiles' : '') + (w.magazine ? ' · ' + loadedOf(c) + '/' + w.magazine + ' loaded' : ''), wear(wd, wmax),
          (ws.mods || []).map((m) => ITEM[m]?.name).filter(Boolean).join(', '), armsLine(c.weapon)].filter(Boolean).join(' · ')],
      outer: c.armourClass ? [kitDef.armourName + ' (Class ' + ROMAN[c.armourClass] + ')', 'Armour ' + (ARMOUR[c.armourClass]?.value || 0)] : null,
      off: c.offHand ? [WEAPON[c.offHand.id]?.name || ITEM[c.offHand.id]?.name || c.offHand.id, WEAPON[c.offHand.id] ? 'Paired attacks · ' + armsLine(c.offHand.id) : (ITEM[c.offHand.id]?.text || '').slice(0, 80)] : null } : {};
    if (c) for (const [slot, id] of Object.entries(c.worn || {})) if (WORN_SLOT[slot]) worn[WORN_SLOT[slot]] = [ITEM[id]?.name || id, (ITEM[id]?.text || '').replace(/^[^:]+: /, '')];
    const pack = c ? [...(c.stims ? [{ id: 'stim', item: 'stim_injector', name: 'Stim injector', qty: c.stims, kind: 'med', note: 'Heals 30 × Healing given; stabilises the Downed; stops Bleeding' }] : []), ...packOf(c),
      ...(c.essence ? [{ id: 'eoe', item: 'essence_of_experience', name: 'Essence of Experience', qty: c.essence, kind: 'loot', note: 'Sells for 300' }] : [])] : [];
    worn.pack = c ? ['Pack', pack.length + (pack.length === 1 ? ' item' : ' items')] : null;
    const hotParts = S.hotSlot ? (S.hotSlot === 'main' ? [side === 'left' ? 'lHand' : 'rHand'] : SLOT_PARTS[S.hotSlot] || []) : [];
    const wornParts = Object.keys(worn).filter((k) => worn[k]).flatMap((k) => (k === 'main' ? [side === 'left' ? 'lHand' : 'rHand'] : SLOT_PARTS[k] || []));
    const gearFig = bodyFigure({ worn: wornParts, hot: hotParts, mainSide: side, weapon: !!c, injuries: [] });
    // Rules 1.9 (Gear in a fight): in a fight gear changes cost AP and go through the fight's own checks, from the
    // backpack on the combat screen (1 AP a hand); the sheet only points there.
    const gearLocked = g.phase === 'combat', IN_FIGHT = 'In a fight: use the backpack on the combat screen (1 AP a hand).';
    const slots = SLOTS.map(([id, label]) => { const x = worn[id], removable = !!x && (id === 'off' || !!SLOT_TO_WORN[id]);
      return { key: id, label, name: x ? x[0] : '—', note: x ? x[1] : '', canRemove: removable && !gearLocked, remove: () => act({ type: 'gear/unequip', charId: c.id, slot: id === 'off' ? 'off' : SLOT_TO_WORN[id] }), hover: () => this.setState({ hotSlot: id }), leave: () => this.setState({ hotSlot: null }),
        style: 'display: grid; grid-template-columns: 78px minmax(0, 1fr); gap: 2px 8px; padding: 4px 6px; border-radius: 6px; font-size: 12px; ' + (S.hotSlot === id ? 'background: #1C2536' : '') ,
        nameStyle: 'font-weight: ' + (x ? '600; color: #E7EBF3' : '400; color: #5B6577') }; });
    const kg = (x) => (Math.round(x * 1000) / 1000) + ' kg';
    // Magazines show as separate lines: full, part-loaded (each count) and empty (spec: Magazines and rounds are inventory).
    const rig = pack.flatMap((it, ri) => {
      if (!it.mags) { const pi0 = ri - (c && c.stims ? 1 : 0), pi = c && pi0 >= 0 && pi0 < packOf(c).length && it.id !== 'eoe' && it.id !== 'stim' ? pi0 : -1, def = ITEM[it.item || it.id] || {}, wdef = it.weapon ? WEAPON[it.weapon] : null, acts = [];
        if (pi >= 0 && !gearLocked) {
          if (wdef && it.kind === 'weapon') { acts.push({ key: 'm', label: 'Main hand', go: () => act({ type: 'gear/equip', charId: c.id, idx: pi, to: 'main' }) }); if (wdef.hands === '1H') acts.push({ key: 'o', label: 'Off hand', go: () => act({ type: 'gear/equip', charId: c.id, idx: pi, to: 'off' }) }); }
          else if (def.slot === 'off_hand') acts.push({ key: 'o', label: 'Off hand', go: () => act({ type: 'gear/equip', charId: c.id, idx: pi, to: 'off' }) });
          else if (def.category === 'armour') acts.push({ key: 'w', label: 'Wear', go: () => act({ type: 'gear/equip', charId: c.id, idx: pi, to: 'worn' }) });
          else if (def.category === 'mod') acts.push({ key: 'f', label: 'Fit', go: () => act({ type: 'gear/mod', charId: c.id, idx: pi }) });
          else if (it.kind === 'plot') { // a plot item: hand it to someone in the party, or drop it
            Object.values(g.characters).filter((x) => x.id !== c.id && !x.dead).forEach((x) => acts.push({ key: 'g' + x.id, label: 'Give to ' + x.name, go: () => act({ type: 'gear/give', charId: c.id, idx: pi, to: x.id }) }));
            acts.push({ key: 'd', label: 'Drop', go: () => act({ type: 'gear/drop', charId: c.id, idx: pi }) }); }
        }
        const tag = wdef ? 'WEAPON' : def.category === 'armour' ? 'ARMOUR' : def.category === 'mod' ? 'MOD' : def.slot === 'off_hand' ? 'OFF HAND' : KIND[it.kind] || 'ITEM';
        return [{ key: it.id + ':' + pi, tag, name: it.name + (it.rarity && it.rarity !== 'standard' ? ' · ' + it.rarity.toUpperCase() : ''), qty: '×' + it.qty, kg: kg(itemKg(it)),
          note: (focusKindOf(it.weapon || it.item || it.id) ? 'In the pack: it counts only in a hand (Off hand). ' : '') + (wdef ? [(typeof wdef.damage === 'number' ? wdef.damage + ' dmg' : ''), wdef.hands, armsLine(wdef.id)].filter(Boolean).join(' · ') : it.kind === 'plot' ? it.text || 'From the story.' : it.note || def.text || ''), acts, hasActs: acts.length > 0, src: it }]; }
      const cap = WEAPON[it.weapon]?.magazine || 0, by = {};
      it.mags.forEach((n) => { by[n] = (by[n] || 0) + 1; });
      return Object.keys(by).map(Number).sort((a, b) => b - a).map((n) => ({ key: it.id + ':' + n, tag: n ? 'AMMO' : 'EMPTY', name: it.name + (n === cap ? ' (full)' : n ? ' (' + n + '/' + cap + ')' : ' (empty)'),
        qty: '×' + by[n], kg: kg(itemKg({ ...it, mags: Array(by[n]).fill(n) })), note: n ? by[n] * n + ' rounds' : 'Load it from loose rounds', acts: [], hasActs: false, src: it }));
    });
    const canLoad = !!c && packOf(c).some((m) => m.mags && m.mags.some((n) => n < (WEAPON[m.weapon]?.magazine || 0)) && packOf(c).some((r) => r.calibre && r.calibre === WEAPON[m.weapon]?.ammo && r.qty > 0));
    const KG = c ? carriedKg(c) : { total: 0, weapon: 0, armour: 0, pack: 0 }, lim = c ? carryLimit(c) : 0, over = KG.total > lim;
    const gear = [];
    // ---------- Gear: hands as panels, the body's slots by name, the backpack; hover for details, click for actions ----------
    const RW = (r) => (r && r !== 'standard' ? r.charAt(0).toUpperCase() + r.slice(1) : 'Standard');
    const marks = (r) => '◆'.repeat(RARITY[r || 'standard']?.marks || 0);
    // Painted art when there is some; else the item's monoline icon (weapons, armour, shields: gearIcons.ts); else a glyph.
    const artOf = (id) => IMG['weapon-' + id] || IMG['item-' + id] || gearIconUri(id);
    const glyphOf = (id) => { const wd = WEAPON[id], it = ITEM[id] || {}; if (wd) return ({ pistol: '⌐', revolver: '⌐', smg: '╤', rifle: '═', shotgun: '╦', heavy: '▬', bow: ')', light_melee: '†', heavy_melee: '⚒', unarmed: '✊', thrown: '●', mana: '✧' })[wd.category] || '⚔';
      return it.category === 'shield' ? '⛉' : it.category === 'light' ? '✦' : it.category === 'armour' ? '▣' : it.category === 'mod' ? '⚙' : '▪'; };
    const tips = {};
    const colIds = c ? collectionOf(c) : []; // Gun Nut's collection (spec 14 item 369): tagged on its guns' tooltips
    const weaponTip = (id, st = {}) => { const wd = WEAPON[id]; if (!wd) return null; const r = st.rarity || 'standard', m = maxDurOf(id, r), d = st.dur ?? m;
      return { title: st.name || wd.name, sub: (RW(r) + ' ' + marks(r)).trim() + ' · ' + (wd.hands || '') + ' · ' + wd.category.replace('_', ' '), img: artOf(id), glyph: glyphOf(id),
        lines: [colIds.includes(id) ? 'Collection (Gun Nut): parting with it takes a Dexterity check.' : '', (typeof wd.damage === 'number' ? wd.damage : typeof wd.damage === 'object' && wd.damage ? Object.values(wd.damage).join(' / ') : wd.damage) + ' damage' + (typeof wd.range_tiles === 'number' && wd.range_tiles > 1 ? ' · ' + wd.range_tiles + ' tiles' : '') + (wd.magazine ? ' · ' + wd.magazine + ' rounds' + (wd.ammo ? ' (' + wd.ammo + ')' : '') : ''),
          m ? 'Durability ' + d + ' / ' + m + (d <= 0 ? ' · BROKEN' : d <= m * 0.25 ? ' · worn' : '') : '', (st.mods || []).length ? 'Mods: ' + st.mods.map((x) => ITEM[x]?.name || x).join(', ') : '', wd.mod_slots && wd.mod_slots.length ? 'Mod slots: ' + wd.mod_slots.join(', ') : '',
          armsLine(id), wd.requires ? 'Needs ' + Object.entries(wd.requires).map(([k, v]) => SK[k]?.name + ' ' + v).join(', ') : '',
          wd.weight_kg + ' kg · ' + Math.round((wd.price_credits || 0) * (RARITY[r]?.price || 1)) + ' credits'].filter(Boolean), lore: wd.lore || '' }; };
    const itemTip = (id, extra = {}) => { const it = ITEM[id]; if (!it) return null;
      return { title: it.name, sub: (it.slot ? it.slot.replace('_', ' ') : it.category || 'item'), img: artOf(id), glyph: glyphOf(id), lines: [it.text, it.weight_kg + ' kg' + (it.price_credits ? ' · ' + it.price_credits + ' credits' : '')].filter(Boolean), lore: '', ...extra }; };
    // Tooltips sit in a fixed layer at the screen's root (no column clips them): beside the hovered row, flipped left
    // when there's no room on the right, and growing down from the row in the top half of the screen, up from it below.
    const tipHandlers = (key) => ({ hover: (e) => { const r = e.currentTarget.getBoundingClientRect(), W = window.innerWidth, H = window.innerHeight;
      const x = r.right + 270 > W ? Math.max(8, Math.min(W - 268, r.left - 268)) : r.right + 8, up = r.top > H / 2;
      if (!this.state.tip || this.state.tip.key !== key) this.setState({ tip: { key, x, ...(up ? { b: Math.max(8, H - r.bottom) } : { y: Math.max(8, r.top) }) } }); }, leave: () => this.setState({ tip: null }) });
    const menuFor = (key) => ({ open: S.gearMenu === key, toggle: () => this.setState({ gearMenu: S.gearMenu === key ? null : key, tip: null }) });
    const pk = c ? packOf(c) : [];
    const cand = (pred, label, to) => pk.map((it, i) => ({ it, i })).filter(({ it }) => pred(it)).map(({ it, i }) => ({ key: to + i, label: label + ' ' + it.name, go: () => { act({ type: 'gear/equip', charId: c.id, idx: i, to }); this.setState({ gearMenu: null }); } }));
    const mainSide = c ? mainHandSide(c) : 'right';
    const handCard = (which) => {
      if (!c) return null;
      const isMain = which === 'main', id = isMain ? c.weapon : c.offHand?.id, st = isMain ? c.weaponState || {} : c.offHand || {};
      const key = 'hand-' + which; tips[key] = id ? (weaponTip(id, st) || itemTip(id)) : { title: 'Empty', sub: isMain ? 'main hand' : 'off hand', lines: [isMain ? 'Your main-hand weapon.' : 'Hold a one-handed weapon, a shield, a torch, a flare or a focus here.'], glyph: '·', img: '', lore: '' };
      const twoHanded = !isMain && WEAPON[c.weapon]?.hands === '2H';
      const acts = gearLocked ? [] : isMain ? cand((it) => it.kind === 'weapon' && it.weapon && WEAPON[it.weapon], 'Equip', 'main')
        : twoHanded ? [] : [...(c.offHand ? [{ key: 'off-x', label: 'Take off', go: () => { act({ type: 'gear/unequip', charId: c.id, slot: 'off' }); this.setState({ gearMenu: null }); } }] : []),
          ...cand((it) => (it.weapon && WEAPON[it.weapon]?.hands === '1H') || ITEM[it.item || it.id]?.slot === 'off_hand', 'Hold', 'off')];
      const r = st.rarity || 'standard';
      const fk = id && !twoHanded ? focusKindOf(id) : null; // the focus this hand holds (it counts only in a hand)
      return { key, side: ((isMain ? mainSide : mainSide === 'right' ? 'left' : 'right') + ' hand').toUpperCase(), tag: (isMain ? 'MAIN' : 'OFF') + (fk ? ' · ' + fk.toUpperCase() : ''), name: twoHanded ? 'Both hands: ' + (WEAPON[c.weapon]?.name || '') : id ? tips[key].title : 'Empty',
        img: id ? artOf(id) : '', hasImg: !!(id && artOf(id)), noImg: !(id && artOf(id)), glyph: twoHanded ? '═' : id ? glyphOf(id) : '·', marks: id ? marks(r) : '', rarity: id ? RW(r) : '',
        frameStyle: 'position: relative; display: grid; place-items: center; width: 100%; aspect-ratio: 1; border-radius: 10px; background: #0D1119; border: ' + (id ? (RARITY[r]?.marks ? 2 + RARITY[r].marks : 1) + 'px solid ' + (RARITY[r]?.marks ? '#E7EBF3' : '#3B475D') : '1px dashed #3B475D') + '; font-size: 40px; color: #5B6577; cursor: pointer',
        nameStyle: 'font-size: 13px; font-weight: 700; color: ' + (id || twoHanded ? '#E7EBF3' : '#5B6577'), ...tipHandlers(key), ...menuFor(key), acts, hasActs: acts.length > 0, noActs: !acts.length,
        noActText: gearLocked ? IN_FIGHT : twoHanded ? 'Your weapon needs both hands.' : 'Nothing in the pack fits here.' };
    };
    const hands = c ? (mainSide === 'right' ? [handCard('main'), handCard('off')] : [handCard('off'), handCard('main')]) : [];
    const bodySlots = SLOTS.filter(([id]) => !['main', 'off', 'pack'].includes(id)).map(([id, label]) => {
      const x = worn[id], wslot = SLOT_TO_WORN[id], wid = wslot && c?.worn?.[wslot], key = 'slot-' + id;
      tips[key] = wid ? itemTip(wid) : id === 'outer' && c && c.armourClass ? { title: x[0], sub: 'outer torso · Armour Class', glyph: '▣', img: '', lines: ['Armour ' + (ARMOUR[c.armourClass]?.value || 0) + ' against every hit.', 'Sets your Armour Class.'], lore: '' } : { title: 'Empty', sub: label.toLowerCase(), glyph: '·', img: '', lines: [id === 'veil' ? 'The Veil: a special equipment type; its rules aren\'t written yet.' : 'Wear a piece here from your backpack.'], lore: '' };
      const acts = gearLocked || !wslot ? [] : [...(wid ? [{ key: key + '-x', label: 'Take off', go: () => { act({ type: 'gear/unequip', charId: c.id, slot: wslot }); this.setState({ gearMenu: null }); } }] : []), ...cand((it) => ITEM[it.item || it.id]?.slot === wslot, 'Wear', 'worn')];
      const icon = gearIconUri(wid);
      return { key, label, name: x ? x[0] : '—', icon, hasIcon: !!icon, ...tipHandlers(key), ...menuFor(key), acts, hasActs: acts.length > 0, noActs: !acts.length, noActText: gearLocked ? IN_FIGHT : id === 'outer' ? 'Armour Class comes from your kit for now.' : 'Nothing in the pack fits here.',
        hover2: () => this.setState({ hotSlot: id }),
        style: 'display: grid; grid-template-columns: 78px minmax(0, 1fr); gap: 2px 8px; align-items: center; padding: 5px 6px; border-radius: 6px; font-size: 12px; cursor: pointer; width: 100%; text-align: left; color: inherit; font: inherit; border: 0; background: ' + (S.hotSlot === id || S.gearMenu === key ? '#1C2536' : 'transparent'),
        nameStyle: 'font-weight: ' + (x ? '600; color: #E7EBF3' : '400; color: #5B6577') };
    });
    // (backpack rows: hover for details, click for actions)
    const rigView = rig.map((r) => { const key = 'rig-' + r.key, it = r.src || {}, id = it.item || it.id;
      tips[key] = (it.weapon && it.kind === 'weapon' ? weaponTip(it.weapon, it) : null) || (ITEM[id] && !it.mags && !it.calibre ? itemTip(id) : null) || { title: r.name, sub: r.tag.toLowerCase(), glyph: it.mags ? '▮' : it.calibre ? '⁝' : it.kind === 'plot' ? '◈' : '▪', img: '', lines: [r.note, r.kg].filter(Boolean), lore: '' };
      const acts = [...r.acts.map((a) => ({ ...a, go: () => { a.go(); this.setState({ gearMenu: null }); } })), ...((it.mags || it.calibre) && canLoad && !gearLocked ? [{ key: 'load', label: 'Load magazines', go: () => { act({ type: 'gear/load', charId: c.id }); this.setState({ gearMenu: null }); } }] : [])];
      return { ...r, ...tipHandlers(key), ...menuFor(key), acts, hasActs: acts.length > 0, noActs: !acts.length, noActText: gearLocked ? IN_FIGHT : 'Nothing to do with it here yet.',
        img: tips[key].img, hasImg: !!tips[key].img, noImg: !tips[key].img, glyph: tips[key].glyph,
        style: 'display: grid; grid-template-columns: 30px minmax(0, 1fr) auto; gap: 2px 8px; align-items: center; padding: 6px 8px; border-radius: 8px; cursor: pointer; font-size: 12px; background: ' + (S.gearMenu === key ? '#1C2536' : '#0D1119') + '; border: 1px solid #1C2536' }; });
    // Plot items (the Narrator's story things) get their own group under the backpack.
    const plotView = rigView.filter((r) => r.src && r.src.kind === 'plot'), packView = rigView.filter((r) => !(r.src && r.src.kind === 'plot'));
    const TIP = S.tip && tips[S.tip.key];
    const tipCard = TIP ? { ...TIP, lines: TIP.lines.map((t, i) => ({ key: i, t })), hasImg: !!TIP.img, noImg: !TIP.img, hasLore: !!TIP.lore,
      style: 'position: fixed; z-index: 40; left: ' + S.tip.x + 'px; ' + (S.tip.b != null ? 'bottom: ' + S.tip.b + 'px; max-height: calc(100vh - ' + (S.tip.b + 8) + 'px)' : 'top: ' + S.tip.y + 'px; max-height: calc(100vh - ' + ((S.tip.y || 0) + 8) + 'px)') + '; overflow: hidden; box-sizing: border-box; width: 260px; display: flex; flex-direction: column; gap: 6px; padding: 12px; border-radius: 12px; background: #10151F; border: 1px solid #3B475D; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6); pointer-events: none' } : null;

    const kit = c ? (D.kits.find((k) => k.id === c.kit) || {}).name : '';
    const I = (c && c.identity) || {};
    const bio = c ? [['Origin', c.origin], ['Kit', kit], ['Gender', I.gender], ['Blood type', I.blood], ['Main hand', I.hand], ['Association', I.association], ['Favourite song', I.songTitle ? I.songTitle + (I.songArtist ? ' · ' + I.songArtist : '') : I.song], ['Last dream', I.dream], ['History', I.history]]
      .filter(([, v]) => v).map(([k, v]) => ({ k, v })) : [];
    const lvlUp = c && (c.unspent.skill + c.unspent.attr + c.unspent.core > 0 || (c.level >= 3 && !c.classId) || pendingPerkSteps(c).length > 0);
    const pc = c ? { name: c.name, img: c.portrait, line1: [I.association, c.origin].filter(Boolean).join(' · ') || c.origin,
      line2: 'Level ' + c.level + ' · ' + (c.classId ? classLabel(c) : 'No class yet') + (c.dead ? ' · DEAD' : ''), hasCls: !!c.classId, clsIcon: emblemOf(heldClassId(c)).icon } : { name: 'Spectating', img: IMG['wick-welcome'], line1: 'You have no character in this session.', line2: '', hasCls: false, clsIcon: '' };
    const myChars = mine.map((x) => ({ key: x.id, name: x.name, pick: () => this.setState({ sel: x.id }), pressed: x.id === (c && c.id) ? 'true' : 'false',
      style: 'min-height: 32px; padding: 0 10px; border-radius: 8px; font-family: inherit; font-size: 12px; font-weight: 700; cursor: pointer; ' + (x.id === (c && c.id) ? 'border: 1px solid #E7EBF3; background: #1C2536; color: #E7EBF3' : 'border: 1px solid #232D3F; background: transparent; color: #A3AEC2') }));

    // ---------- the story stream ----------
    const st0 = startOf(g);
    // The zone's banner when the campaign has one (spec: Campaigns, art), else the campaign's card art.
    const zone0 = zoneOf(g), banner = zone0?.art?.banner;
    const heroImg = ART(banner) || IMG[st0.art] || ART(st0.art) || IMG['world-pilot'];
    // The Proving Ground is no campaign: its own banner, no campaign art (the zone's banner if it ever gets one), no scene title.
    const SB = !!g.sandbox;
    const hero = SB ? { zoom: banner ? zoomer(this, ART_BIG(banner), zone0.name, 'world') : () => {}, img: ART(banner) || '', hasImg: !!banner, noImg: !banner, title: 'Practice fights · no Narrator', kicker: 'THE PROVING GROUND',
        imgStyle: 'width: 100%; height: 260px; object-fit: cover; object-position: center 45%; display: block' }
      : { zoom: zoomer(this, ART_BIG(banner) || ART_BIG(st0.art) || heroImg, (zone0 ? zone0.name : st0.title) + (banner ? '' : ' · ' + st0.artNote), 'world'), img: heroImg, hasImg: true, noImg: false, title: g.story.scene.title || st0.title, kicker: st0.kicker + (zone0 ? ' · ' + zone0.name.toUpperCase() : ''), imgStyle: 'width: 100%; height: 260px; object-fit: cover; object-position: ' + (banner ? 'center 45%' : st0.focus) + '; display: block' };
    const charOf = (id) => g.characters[id];
    // The Narrator's voice (spec: The Narrator's voice): a line waiting for its voice, and everything after it, stays hidden.
    const VS = voiceState(), heldAt = g.story.entries.findIndex((x) => VS.held.includes(x.id));
    const shown = heldAt >= 0 ? g.story.entries.slice(0, heldAt) : g.story.entries;
    const readFor = (e, voice) => ({ read: () => (VS.speaking === e.id ? stopVoice() : speak(e.id, e.text, voice)), readIcon: VS.speaking === e.id ? '■' : '🔊', readLabel: VS.speaking === e.id ? 'Stop reading' : 'Read aloud',
      readStyle: 'flex: none; min-height: 28px; min-width: 28px; padding: 0 8px; border-radius: 999px; border: 1px solid ' + (VS.speaking === e.id ? '#FFFFFF' : '#2E3A50') + '; background: transparent; color: ' + (VS.speaking === e.id ? '#FFFFFF' : '#A3AEC2') + '; font-family: inherit; font-size: 12px; cursor: pointer; align-self: flex-start' });
    // New entries slide up as they arrive; what was already there when the screen opened doesn't move.
    if (!this._seenIds || this._seenCode !== g.code) { this._seenIds = new Set(g.story.entries.map((x) => x.id)); this._seenCode = g.code; }
    const stream = [...shown.slice(-150).map((e) => {
      const base = { key: e.id, cls: this._seenIds.has(e.id) ? '' : 'phc-m-rise', text: e.text, head: e.head || '', isScene: false, isNarration: false, isPlayer: false, isVoice: false, isCheck: false, isNote: false, isArt: false, isGathering: false, paras: [] };
      // Out of character (spec: OOC, missions and end states): a player's question and the Narrator's plain answer, muted and labelled.
      if (e.kind === 'ooc') { const nar = !e.who; return { ...base, isOoc: true, head: nar ? 'NARRATOR · OOC' : e.head || 'OOC',
        oocStyle: 'margin: 0; display: flex; flex-direction: column; gap: 4px; padding: 8px 12px; border-radius: 8px; background: ' + (nar ? '#10151F' : 'transparent') + '; border: 1px ' + (nar ? 'solid #2E3A50' : 'dashed #2E3A50'),
        oocHeadStyle: 'font-size: 11px; font-weight: 700; letter-spacing: 0.16em; color: ' + (nar ? '#E7EBF3' : '#A3AEC2'), oocTextStyle: 'font-size: 14px; line-height: 1.5; color: ' + (nar ? '#E7EBF3' : '#A3AEC2') }; }
      // A patron's answer (Blessing 2.0): the mark, the name and the line, edged in the patron's accent.
      const pl = patronLineCard(e); if (pl) return { ...base, isPatron: true, ...pl };
      // A pact, a switch, a grudge or apostasy (Faith 2.2, spec 2.5): a small portrait beside the card; a grudge's greyed.
      const fe = faithEventCard(e); if (fe) return { ...base, isFaithEvent: true, ...fe };
      if (e.kind === 'scene') return { ...base, isScene: true, text: e.text.toUpperCase() };
      if (e.kind === 'art') return { ...base, isArt: true, img: ART(e.art), zoom: zoomer(this, ART_BIG(e.art), e.text, 'world') };
      if (e.kind === 'narration') {
        // Rerolls and edits (spec: Rerolls and edits): players suggest, the host starts a vote, everyone must agree.
        const V = g.votes || { turns: [], open: null }, canReroll = V.turns.includes(e.id) && !e.rerolled, busyVote = !!(V.open && V.open.status === 'open');
        const ask = (kind, then) => askText({ title: kind === 'reroll' ? (isHost ? 'Vote to reroll' : 'Suggest a reroll') : (isHost ? 'Vote to reword' : 'Suggest rewording'),
          body: kind === 'reroll' ? 'What should the Narrator do differently? Everyone must agree before the turn is undone.' : 'How should it be reworded? Only the words change, never what happened.',
          placeholder: kind === 'reroll' ? 'Optional: a note for the Narrator' : 'Optional: what to change', multiline: true, optional: true, maxLength: 400,
          confirm: isHost ? 'Start the vote' : 'Suggest it' }).then((note) => { if (note !== null) then(note); });
        const undoText = () => { const i = g.story.entries.findIndex((x) => x.id === e.id), after = g.story.entries.slice(i + 1); const pl = after.filter((x) => x.kind === 'player').length, ck = after.filter((x) => x.kind === 'check').length, fights = after.filter((x) => x.kind === 'combat' && /^Combat: /.test(x.text)).map((x) => x.text.replace(/^Combat: /, ''));
          return [pl ? pl + (pl === 1 ? ' player action' : ' player actions') : '', ck ? ck + (ck === 1 ? ' roll' : ' rolls') : '', fights.length ? 'the fight ' + fights.join(', ') : ''].filter(Boolean).join(', ') || 'nothing after it'; };
        const voteActs = e.rerolled || !c ? [] : isHost
          ? [...(canReroll ? [{ key: 'r', label: '⟲ Vote to reroll', title: 'Everyone must agree. Undoes this turn and everything after it.', go: () => { if (busyVote) return toast('A vote is already under way.'); ask('reroll', (n) => act({ type: 'vote/start', kind: 'reroll', entryId: e.id, note: n, undo: undoText() })); } }] : []),
             { key: 'e', label: '✎ Vote to reword', title: 'Everyone must agree. Only the words change.', go: () => { if (busyVote) return toast('A vote is already under way.'); ask('edit', (n) => act({ type: 'vote/start', kind: 'edit', entryId: e.id, note: n })); } }]
          : [...(canReroll ? [{ key: 'r', label: '⟲ Suggest reroll', title: 'The host can put it to a vote.', go: () => ask('reroll', (n) => { act({ type: 'vote/suggest', kind: 'reroll', entryId: e.id, note: n }); toast('Suggested to the host.', true); }) }] : []),
             { key: 'e', label: '✎ Suggest rewording', title: 'The host can put it to a vote.', go: () => ask('edit', (n) => { act({ type: 'vote/suggest', kind: 'edit', entryId: e.id, note: n }); toast('Suggested to the host.', true); }) }];
        return { ...base, ...readFor(e), isNarration: true, paras: e.text.split(/\n\s*\n/).map((t) => ({ text: t.trim() })).filter((x) => x.text),
          wrapStyle: 'display: flex; flex-direction: column; gap: 12px' + (e.rerolled ? '; opacity: 0.45' : ''), pStyle: "margin: 0; font-family: 'Spectral', serif; font-size: 18px; line-height: 1.7; color: #DCE2EC" + (e.rerolled ? '; text-decoration: line-through' : ''),
          hasTag: !!(e.rerolled || e.original), tag: e.rerolled ? 'REROLLED BY VOTE' : '✎ REWORDED BY VOTE', tagStyle: 'font-size: 11px; font-weight: 700; letter-spacing: 0.14em; color: #A3AEC2',
          voteActs, hasVoteActs: voteActs.length > 0 };
      }
      if (e.kind === 'player') {
        // Engine action lines start with the name the header already shows ("Recruit asks…"): don't say it twice.
        if (e.head && typeof e.text === 'string' && e.text.startsWith(e.head + ' ')) base.text = e.text.slice(e.head.length + 1).replace(/^./, (c) => c.toUpperCase());
        const p = playerOf(e.who), first = Object.values(g.characters).find((x) => x.owner === e.who);
        return { ...base, isPlayer: true, roll: !!e.roll, img: first ? first.portrait : IMG['wick-welcome'], nameStyle: 'color: ' + p.color + '; font-weight: 600',
          imgStyle: 'width: 40px; height: 40px; object-fit: cover; border-radius: 50%; background: #000; flex: none; border: 2px solid ' + p.color };
      }
      if (e.kind === 'voice' || e.kind === 'overreach') {
        const s = SK[e.skill] || D.skills[0], ink = ATTR[s.attr].ink, ch = charOf(e.charId);
        return { ...base, ...readFor(e, coreVoice(SKILL[e.skill]?.core)), isVoice: true, img: s.img, zoom: zoomer(this, s.img, s.name, 'skill'), head: (mine.length > 1 && ch ? ch.name.toUpperCase() + ' · ' : '') + e.head, headStyle: 'font-size: 12px; font-weight: 700; letter-spacing: 0.16em; color: ' + ink,
          style: 'display: flex; gap: 14px; align-items: flex-start; padding: 14px 16px; border-radius: 12px; background: #10151F; border: 1px solid #232D3F; border-left: 3px solid ' + ink };
      }
      if (e.kind === 'check') return { ...base, isCheck: true, headStyle: 'font-weight: 700; letter-spacing: 0.06em; color: ' + (e.ok ? '#6FEA77' : '#A3AEC2') };
      // An action on the area map reads as an action, not a footnote: a shot is red-edged.
      if (e.act) { const mk = magicInk(e.text), hit = !mk && /\b(fires|shoots|aimed shot|strikes|smashes|attacks|hits|misses)\b/.test(e.text); // a spell that hits is still a spell
        return { ...base, isNote: true, text: (hit ? '⚔ ' : mk === SIGIL_INK ? '✧ ' : mk === SOUL_INK ? '♥ ' : '› ') + e.text, noteStyle: 'margin: 0; padding: 6px 10px; border-radius: 6px; background: #10151F; border-left: 3px solid ' + (hit ? '#F65157' : mk || '#E7EBF3') + '; font-size: 14px; line-height: 1.5; color: #E7EBF3' }; }
      return { ...base, isNote: true, noteStyle: 'margin: 0; font-size: 13px; line-height: 1.5; color: ' + (e.kind === 'xp' ? '#FFFFFF' : e.kind === 'combat' ? '#F65157' : '#A3AEC2') };
    }), ...(heldAt >= 0 ? [{ key: 'gathering', cls: 'phc-m-rise', text: 'The Narrator gathers their voice…' + (VS.status === 'loading' && VS.progress < 100 ? ' (preparing the voice on this device, once: ' + VS.progress + '%)' : ''), isGathering: true, paras: [] }] : [])];
    const busy = g.narrator.busy, err = g.narrator.error;
    const pushes = g.overreach.filter((o) => !o.choice && charOf(o.charId)?.owner === me).map((o) => {
      const s = SK[o.skill], ink = ATTR[s.attr].ink, cost = (charOf(o.charId).skills[o.skill] || 0) >= 10 ? 2 : 1, cons = SKILL[o.skill]?.overreach?.consequence;
      return { key: o.id, img: s.img, zoom: zoomer(this, s.img, s.name, 'skill'), head: s.name.toUpperCase() + ' PUSHES · OVERREACH · ONLY YOU SEE THIS', headStyle: 'font-size: 12px; font-weight: 700; letter-spacing: 0.16em; color: ' + ink,
        text: o.push, consequence: cons ? 'If you indulge: ' + cons : '', indulge: () => act({ type: 'overreach/choose', id: o.id, choice: 'indulge' }), resist: () => act({ type: 'overreach/choose', id: o.id, choice: 'resist' }),
        cantResist: charOf(o.charId).echo < cost, resistLabel: 'Resist · −' + cost + ' Echo' };
    });

    // ---------- checks the Narrator called, and the dice table ----------
    const myChecks = g.checks.filter((k) => !k.done && charOf(k.charId)?.owner === me);
    const label = (tn) => ({ 8: 'Easy', 12: 'Standard', 16: 'Hard', 20: 'Heroic' }[tn] || 'TN');
    // as the engine's rollCheck: a gamma counts its full points on a check; a save rolls the plain modifier (rules 1.13)
    const comboOf = (ch, ids, save) => { const mods = ids.map((i) => (save ? mod(ch.skills[i] || 0) : checkMod(i, ch.skills[i] || 0))), low = Math.min(...mods), lowIx = mods.indexOf(low);
      const bonus = ids.filter((i, k) => k !== lowIx && (ch.skills[i] || 0) > 0).length * 2; return { low, bonus, total: low + bonus, lowId: ids[lowIx] }; };
    // The bar above the chat is for checks the Narrator calls; a point of interest's attempt is rolled in its own popup.
    const actions = myChecks.filter((k) => !k.poi).map((k) => { const ch = charOf(k.charId), cb = comboOf(ch, k.skills, k.kind === 'save'), ink = ATTR[SK[k.skills[0]].attr].ink;
      return { key: k.id, title: (mine.length > 1 ? ch.name + ': ' : '') + k.stakes, tag: k.skills.map((i) => SK[i].name.toUpperCase()).join(' + ') + ' · ' + label(k.tn).toUpperCase() + ' ' + k.tn + ' · ' + fmt(cb.total) + (k.roll ? ' · ROLLED' : ''),
        roll: () => this.setState({ dice: k.id }), tagStyle: 'font-size: 11px; letter-spacing: 0.08em; color: ' + ink,
        style: 'display: flex; flex-direction: column; align-items: flex-start; gap: 2px; min-height: 52px; padding: 8px 12px; border-radius: 10px; border: 1px solid ' + ink + '; background: #10151F; color: #E7EBF3; font-family: inherit; font-size: 14px; text-align: left; cursor: pointer' }; });
    // An Echo reroll settles the check at once (the reroll stands), so the table must not close on 'done': it stays open
    // on a rerolled check, replays the throw and shows the new result until the player presses Continue. The last check
    // shown is kept, so the table survives the round clearing its checks while the player is still looking at it.
    const keepOpen = (k) => !!(k && k.roll && k.roll.rerolled);
    // Someone else's check opens here only once its owner has thrown (everyone then watches the same roll land, and an
    // Echo reroll replays for all); until then the others get a quiet "Waiting for … to roll …" line, not the table.
    // A thrown check stays open for a watcher who saw it, even once its owner accepts, until they close it.
    const watchCk = !S.dice ? g.checks.find((k) => k.roll && (!k.done || S.watchSeen === k.id) && charOf(k.charId) && charOf(k.charId).owner !== me && !(S.dismissed || {})['k' + k.id]) : null;
    const waitRolls = g.checks.filter((k) => !k.done && !k.roll && charOf(k.charId) && charOf(k.charId).owner !== me).map((k) => ({ key: 'w' + k.id,
      text: 'Waiting for ' + charOf(k.charId).name + ' to roll ' + k.skills.map((i) => SK[i]?.name || i).join(' + ') + (k.poi ? '' : ' (TN ' + k.tn + ')') + '…' }));
    // My own Narrator check pops the table up once (the bar above the chat reopens it after a close).
    if (!S.dice) { const nk = myChecks.find((k) => !k.poi && !k.roll && !(S.autoOpened || {})[k.id]); if (nk) queueMicrotask(() => { if (!this.state.dice) this.setState({ dice: nk.id, autoOpened: { ...(this.state.autoOpened || {}), [nk.id]: true } }); }); }
    const ownCk = S.dice ? g.checks.find((k) => k.id === S.dice) || (S.diceSnap && S.diceSnap.id === S.dice && (keepOpen(S.diceSnap) || (S.closing || {}).dice) ? S.diceSnap : null) : null;
    const ck = S.dice ? ownCk : watchCk;
    if (S.dice && !(S.closing || {}).dice && (!ownCk || (ownCk.done && !keepOpen(ownCk)))) queueMicrotask(() => { if (!(this.state.closing || {}).dice) this.setState({ dice: null }); });
    if (ck && ck.roll) this.state.diceSnap = ck; // a cache, not a render input of its own
    if (ck && !S.dice && ck.roll && S.watchSeen !== ck.id) this.state.watchSeen = ck.id;
    const diceOwner = ck ? playerOf(charOf(ck.charId)?.owner) : null, watching = !!(ck && !S.dice);
    let roll = { kicker: '', head: '', headStyle: '', pre: '', die: '', math: '', verdict: '', verdictStyle: '', after: '' };
    if (ck) {
      const ch = charOf(ck.charId), cb = comboOf(ch, ck.skills, ck.kind === 'save'), ink = ATTR[SK[ck.skills[0]].attr].ink, r = ck.roll;
      roll = { kicker: 'THE NARRATOR CALLS FOR A CHECK · ' + ch.name.toUpperCase(), head: ck.skills.map((i) => SK[i].name.toUpperCase()).join(' + ') + ' · ' + label(ck.tn).toUpperCase() + ' ' + ck.tn, headStyle: 'font-size: 18px; font-weight: 700; letter-spacing: 0.14em; color: ' + ink,
        pre: ck.skills.length > 1 ? 'Lowest ' + fmt(cb.low) + ' (' + SK[cb.lowId].name + ') + ' + cb.bonus + ' for trained partners = ' + fmt(cb.total) + ' vs TN ' + ck.tn + ' · ' + ck.stakes : 'd20 ' + fmt(cb.total) + ' (' + SK[ck.skills[0]].name + ' ' + (ch.skills[ck.skills[0]] || 0) + ') vs TN ' + ck.tn + ' · ' + ck.stakes,
        die: r ? r.die : '', math: r ? (r.rerolled ? 'Echo reroll (was ' + r.first + ') · ' : '') + 'd20 ' + r.die + ' ' + fmt(r.mod) + ((ck.mods || []).length ? ' (incl. ' + ck.mods.map((x) => fmt(x.add) + ' ' + x.label).join(', ') + ')' : '') + ' = ' + r.total + '  vs  TN ' + ck.tn : '',
        after: !r ? '' : r.rerolled ? 'The reroll stands.' : watching ? '' : (charOf(ck.charId)?.echo || 0) >= 1 && !r.ok ? 'Not this time. You have ' + charOf(ck.charId).echo + ' Echo: spend 1 to throw again (the reroll stands).' : !r.ok ? 'No Echo left to throw again.' : '',
        verdict: r ? (r.crit ? '★ CRITICAL SUCCESS' : r.fumble ? '⚠ COMPLICATION' : r.ok ? '✓ SUCCESS' : '✕ FAILURE') : '',
        verdictStyle: 'font-size: 28px; font-weight: 700; letter-spacing: 0.14em; color: ' + (r && r.fumble ? '#F65157' : r && r.ok ? '#6FEA77' : '#A3AEC2') };
    }
    const T = TABLES.find((t) => t[0] === S.table) || TABLES[0], K = SKINS.find((k) => k[0] === S.skin) || SKINS[0];
    const opt = (on) => 'display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 8px 4px; border-radius: 8px; font-family: inherit; font-size: 11px; color: #E7EBF3; cursor: pointer; ' + (on ? 'border: 1px solid #E7EBF3; background: #1C2536' : 'border: 1px solid #232D3F; background: transparent');
    const tables = TABLES.map(([id, name, c1, c2]) => ({ name, pick: () => { savePref('table', id); this.setState({ table: id }); }, pressed: S.table === id ? 'true' : 'false', style: opt(S.table === id), swatch: 'width: 40px; height: 26px; border-radius: 6px; background: ' + c1 + '; border: 3px solid ' + c2 }));
    const skins = SKINS.map(([id, name, face, edge]) => ({ name, pick: () => { savePref('skin', id); this.setState({ skin: id }); }, pressed: S.skin === id ? 'true' : 'false', style: opt(S.skin === id), swatch: 'width: 24px; height: 24px; transform: rotate(45deg); background: ' + face + '; border: 2px solid ' + edge }));
    const rolled = !!(ck && ck.roll);

    // ---------- speaking order ----------
    const speakers = g.players.filter((p) => Object.values(g.characters).some((x) => x.owner === p.id && !x.dead));
    const waitingOn = speakers.filter((p) => g.story.spoken[p.id] == null);
    const order = [...speakers.map((p) => { const chs = Object.values(g.characters).filter((x) => x.owner === p.id), spoke = g.story.spoken[p.id] != null, now = g.story.await === 'players' && !spoke;
      return { key: p.id, img: chs[0]?.portrait || IMG['wick-welcome'], name: chs.map((x) => x.name).join(' & ') + (p.id === me ? ' (you)' : ''), player: p.initials + ' · ' + p.name.toUpperCase() + (p.online ? '' : ' · AWAY'),
        playerStyle: 'font-size: 11px; font-weight: 700; letter-spacing: 0.12em; color: ' + p.color, imgStyle: 'width: 36px; height: 36px; border-radius: 50%; object-fit: cover; background: #000; border: 2px solid ' + p.color,
        state: (() => { const done = spoke && chs.filter((x) => !x.dead).every((x) => (g.story.ended || {})[x.id] || apLeft(g, x) <= 0), apTxt = chs.filter((x) => !x.dead).map((x) => apLeft(g, x)).join('/') + ' AP';
          return g.story.await !== 'players' ? (spoke ? '✓ DONE' : 'WAITING') : done ? '✓ DONE' : (spoke ? 'SPOKE · ' : 'ACTING · ') + apTxt; })(),
        stateStyle: 'font-size: 11px; font-weight: 700; letter-spacing: 0.1em; color: ' + (spoke ? '#6FEA77' : now ? '#FFFFFF' : '#A3AEC2'), zoom: zoomer(this, chs[0]?.portrait, chs[0]?.name, 'portrait') }; }),
      ...(SB ? [] : [{ key: 'narrator', img: IMG['wick-narrator-placeholder'], name: 'Narrator', player: 'AI', playerStyle: 'font-size: 11px; letter-spacing: 0.12em; color: #A3AEC2', imgStyle: 'width: 36px; height: 36px; border-radius: 50%; object-fit: cover; background: #000; border: 2px solid #232D3F',
        state: busy ? 'THINKING…' : err ? 'STUCK' : 'AFTER ALL', stateStyle: 'font-size: 11px; font-weight: 700; letter-spacing: 0.1em; color: ' + (busy ? '#FFFFFF' : err ? '#F65157' : '#A3AEC2'), zoom: zoomer(this, IMG['wick-narrator-placeholder'], 'The Narrator', 'portrait') }])];
    const iSpoke = g.story.spoken[me] != null;
    const cantSpeak = !c || c.dead || g.phase !== 'story' || g.story.await !== 'players' || iSpoke || !!g.sandbox;
    const why = !c ? 'You have no character in this session.' : g.phase !== 'story' ? 'A fight is on: go to Combat.' : g.sandbox ? 'The Proving Ground has no Narrator: gear up with the tools, move freely on the map, then start the fight.' : busy ? 'The Narrator is answering…' : err ? 'The Narrator is stuck; the host can retry.'
      : g.story.await === 'rolls' ? 'Waiting for the checks to be rolled.' : g.story.await === 'choices' ? 'Waiting for an Overreach choice.' : g.story.await === 'narrator' ? 'The Narrator is about to answer…'
      : c && (g.story.ended || {})[c.id] ? 'Turn ended. Waiting for the others.' : iSpoke ? 'You spoke. Use your ' + apLeft(g, c) + ' AP on the area map, or End turn.' : 'Your turn: ' + (c ? apLeft(g, c) : 0) + ' AP and one Say. Open the area map to act; End turn when done.';

    // ---------- the zone: the story's map (or the fight's), with grid references (spec: Grid references) ----------
    const cb = castFight(g, g.combat, ART), inFight = g.phase === 'combat', taken = takenCards(g), map = inFight && cb ? cb.map : zoneMap(g);
    const pos = inFight ? {} : positionsOf({ ...g, story: { ...g.story, positions: { ...(g.story.positions || {}) } } });
    const seenNow = inFight && cb ? visibility(cb, 'pc').seen : null;
    const units = inFight ? cb.units.filter((u) => !(u.dead && u.side === 'foe') && (u.side === 'pc' || seenNow.has(u.id)))
      : Object.values(g.characters).filter((x) => !x.dead && pos[x.id]).map((x) => ({ id: 'pc-' + x.id, side: 'pc', charId: x.id, name: x.name, short: x.name.slice(0, 2).toUpperCase(), img: x.portrait,
        pos: pos[x.id], hp: x.hp, maxHp: maxHp(x), movement: movement(x), ap: 0, injuries: x.injuries || [], downed: false, dead: false }))
        .concat((() => { const ns = npcsOf({ ...g, story: { ...g.story } }).filter((n) => !n.hidden);
          // World Play 1.7: every token shows its face (its avatar, or the engine's pick by kind). People are cast from the
          // player-card pool only when a player holds that card; robots, drones and machines keep their own art; beasts badge only.
          const faces = castMany(g, ns.filter((n) => !NOT_PERSON.has(n.kind || 'human')).map((n) => ({ key: n.id, current: ART(n.portrait || faceOf(g, n)) || null, tags: npcTags(n.name, n.tier, n.weapon) })), taken);
          return ns.map((n) => ({ id: n.id, side: 'foe', npc: n, kind: n.kind || 'human', name: n.name, short: n.name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase(), img: NOT_PERSON.has(n.kind || 'human') ? ART(faceOf(g, n)) || '' : faces.get(n.id) || '',
          pos: n.pos, hp: ENEMY[n.tier]?.hp || 30, maxHp: ENEMY[n.tier]?.hp || 30, analyzedBy: n.analyzed ? 'party' : undefined, injuries: [], downed: false, dead: false })); })());
    // Drones stand on the area map as tokens of their own (Drone Handler): the engine places them (positionsOf).
    if (!inFight) for (const x of Object.values(g.characters)) for (const k of x.companions || []) { const id = 'cp-' + x.id + '-' + k.id; if ((k.kind === 'drone' || k.kind === 'beast' || k.kind === 'twin') && pos[id] && !x.dead) { const mx = k.kind === 'twin' ? (k.maxHp || k.hp || 1) : (COMPANION_KINDS[k.kind]?.hp ?? 30); units.push({ id, side: 'pc', companion: k.kind, ctrl: x.id, name: k.kind === 'twin' ? 'The twin' : k.name || (k.kind === 'beast' ? 'Beast' : 'Drone'), short: k.kind === 'twin' ? 'TW' : k.kind === 'beast' ? 'BE' : 'DR', img: k.kind === 'twin' ? (k.img || '') : '', pos: pos[id], hp: k.hp ?? mx, maxHp: mx, ap: 0, injuries: [], downed: false, dead: false }); } }
    const tok = {}; units.forEach((u) => { tok[u.pos] = u; });
    const objs = (inFight && cb ? cb.objects : g.story.objects) || defaultObjects(map), objAt = {};
    objs.forEach((o) => { if (o.kind !== 'pile' && (!objAt[o.pos] || kindOf(o).blocks_move)) objAt[o.pos] = o; }); // a pile draws as its own layer (worldLayer)
    const cov = {}; objs.forEach((o) => { const k = coverKind(o); if (k) cov[o.pos] = { kind: k }; });
    const solid = new Set(map.solid), diff = new Set([...map.difficult, ...objs.filter(isDifficult).map((o) => o.pos)]);
    const interesting = (o) => o && (o.approaches.length || isCacheV(o) || ['poi', 'door', 'barricade', 'container', 'terminal', 'exit', 'trap', 'hole'].includes(o.kind));
    const mapArt = ART(zoneOf(g)?.art?.map);
    const cellBg = (k) => (mapArt
      ? tileBg(mapArt, k, map.w, map.h, solid.has(k) ? 'rgba(10, 13, 19, 0.55)' : diff.has(k) ? 'rgba(22, 28, 40, 0.3)' : 'rgba(10, 13, 19, 0.08)')
      : solid.has(k) ? '#1C2536' : cov[k] ? (cov[k].kind === 'full' ? '#6B5430' : '#4A3A20') : diff.has(k) ? '#232D3F' : '#0D1119');
    const mover = c && !c.dead && !inFight && g.phase === 'story' ? c : null;
    const W = S.wAct || 'move', TARGETED = ['shot', 'aimed', 'melee', 'analyze', 'stim'];
    // This round's paths, in each player's colour (spec: Overworld rounds): everyone sees where everyone went.
    const trailAt = {}; if (!inFight) for (const [cid, ks] of Object.entries(g.story.trail || {})) { const col = playerOf(charOf(cid)?.owner)?.color || '#FFFFFF'; ks.forEach((k) => { trailAt[k] = col; }); }
    const moveTo = (k) => () => { if (!mover) return toast(inFight ? 'A fight is on: move on the combat grid.' : 'You have no character to move.'); act({ type: 'story/move', charId: mover.id, to: k }); };
    // ---------- magic on the area map (spec: Mana; Sigils rules 1.4): glyphs, placed magic, held hearts, and the spell actions ----------
    const MN = magicNow(g, c), myWords = c ? (c.sigils || []).filter((w) => SIGIL[w]) : [], myDesigns = c ? c.outbursts || [] : [];
    const evoW = !!c && hasEvoker(c), emaW = !!c && hasEmanator(c), hasMagic = !!c && (myWords.length > 0 || myDesigns.length > 0 || !!MN.held || evoW || emaW);
    const HEART_W = ['pump', 'steady', 'letgo', 'feed', 'heartwatch'], MAGIC_W = ['draw', 'evoke', 'scuff', 'vent', 'core', 'outburst', 'release', 'syphon', 'crystallise', ...HEART_W], M_INSTANT = ['scuff', 'vent', 'core', 'syphon', 'crystallise'], isMagicW = MAGIC_W.includes(W);
    const sameMap = !g.story.glyphMap || g.story.glyphMap === map.id;
    const GLY = inFight ? g.combat?.glyphs || [] : sameMap ? g.story.glyphs || [] : [], ZON = inFight ? g.combat?.zones || [] : sameMap ? g.story.zones || [] : [];
    const glAt = {}; GLY.forEach((x) => { (glAt[x.pos] ||= []).push(x); });
    // Rules 1.10: scuffed glyphs' traces (2 rounds), faint on the map; Analyze aimed at one (or at a hostile glyph) reads it.
    const TRC = inFight ? g.combat?.traces || [] : sameMap ? g.story.traces || [] : [], trAt = {}; TRC.forEach((x) => { (trAt[x.pos] ||= []).push(x); });
    const readT = S.wTarget && S.wTarget.startsWith('read:') ? S.wTarget.slice(5) : null;
    const heldOf = (u) => (u.side !== 'pc' ? null : inFight ? (g.combat?.units.find((x) => x.id === u.id)?.mg?.held || null) : (g.story.magic || {})[u.charId]?.held || null);
    // The story map as a throwaway fight, for the engine's previews (built only when a spell is being lined up).
    let scbMemo; const scb = () => { if (scbMemo === undefined) { try { scbMemo = storyCb({ ...g, story: { ...g.story, positions: { ...(g.story.positions || {}) } } }); } catch { scbMemo = null; } } return scbMemo; };
    const sU = (x) => (x && c ? x.units.find((u) => u.charId === c.id) || null : null);
    // My drone on the area map (Drone Handler): its own unit, with its AP left this round.
    const myComp = (kind) => { if (inFight || !c) return null; const x = scb(); return x ? x.units.find((u) => u.companion === kind && u.ctrl === c.id) || null : null; };
    const myDrone = () => myComp('drone'), myBeast = () => myComp('beast'), myTwin = () => myComp('twin');
    const mHi = { pattern: new Set(), aim: null, reach: new Set(), reachCol: '' };
    // Placed magic the party can see (fields tinted by element, your traps, spotted ones, turrets, RAISE walls, smoke, light).
    const placedW = ZON.length || (inFight && cb) ? (() => { try { const x = inFight ? cb : scb(); return x ? placedView(x, 'pc') : null; } catch { return null; } })() : null;
    let mHint = '', mReady = false, mLabel = 'Confirm', drawInfo = null, drawStroke = null, drawAll = [], evW = null, mHz = noOverlay(), wHp = null, wCards = [];
    const knowsW = (w) => !!(c && (c.sigils || []).includes(w));
    const myAt = c ? pos[c.id] : null, mOpen = !!(S.area && mover && isMagicW && !inFight);
    const wordSel = S.wWord && myWords.includes(S.wWord) ? S.wWord : myWords[0] || null, designSel = myDesigns.find((d) => d.id === S.wDesign) || myDesigns[0] || null;
    const touches = (cbx, ids) => { const ns = ids.map((id) => cbx.units.find((x) => x.id === id)).filter(Boolean), foe = ns.find((x) => x.side === 'foe');
      return (ns.length ? ' Touches ' + ns.map((x) => x.name).join(', ') + '.' : '') + (foe ? ' ' + foe.name + ' is a person on the map: this starts a fight.' : ''); };
    const reachAround = (r, col, from = myAt) => { if (!from) return; mHi.reachCol = col; for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) { const k = x + ',' + y; if (dist(from, k) <= r && standable(map, k)) mHi.reach.add(k); } };
    // Words of a hostile pattern show only if this character can read them (as on the tiles).
    const readW = (x) => x.side === 'pc' || !!(c && (c.sigils || []).includes(x.word));
    if (mOpen) {
      const cbx = scb(), u = sU(cbx);
      if (!cbx || !u) mHint = 'Magic can\'t be lined up here right now.';
      else if (W === 'draw') {
        // Rules 1.4: on your own tile only; the engine says the cost and whether it starts, extends or breaks a Line.
        if (myAt) { mHi.reach.add(myAt); mHi.reachCol = SIG_CYAN; }
        const was = bindGame(g), strip = (() => { try { return drawStrip(cbx, u, S.wStroke); } finally { bindGame(was); } })(); drawAll = strip.words; drawStroke = strip.stroke; const dw = wordSel ? drawAll.find((x) => x.id === wordSel) : null; drawInfo = dw;
        mHint = !dw ? (myWords.length ? 'Pick a word.' : 'You know no Sigil words yet: learn one from an ally or a Sigil plate.') : !dw.ok ? 'Draw ' + dw.word + ': ' + dw.why
          : 'Click your own tile (' + refOf(myAt) + ') to draw ' + dw.word + ' (' + dw.cost.charge + ' charge, ' + dw.cost.ap + ' AP): it ' + dw.effectText + '.' + (dw.fades ? ' ' + dw.fades + ' fades (your cap).' : '')
            + ' The Evoker holds ' + MN.charge + ' charge. A spell is a straight Line of 2–4 glyphs: step to the next tile and draw again.' + (dw.overload ? ' WARNING: this glyph overloads your Evoker.' : '');
      } else if (W === 'evoke') {
        // Rules 1.4: the Line, where to stand (arrows), the tinted area, the hovered delivery and who it affects.
        if (!S.wTile || !glAt[S.wTile]) { const hp = S.hoverTile && glAt[S.hoverTile] ? patternPanel(cbx, S.hoverTile, u, knowsW) : null; mHint = 'Click a glyph of a Line.' + (hp ? ' ' + hp.text : ''); }
        else {
          evW = evokeView(cbx, u, S.wTile, S.wEvc || {}, S.hoverTile, knowsW);
          const foe = evW.affected.map((a) => cbx.units.find((x) => x.id === a.unit)).find((x) => x && x.side === 'foe' && !/SPARED|SKIPPED/.test((evW.affected.find((a) => a.unit === x.id) || {}).tag || ''));
          mReady = evW.ok; mLabel = evW.ok ? 'Evoke · ' + evW.ap + ' AP · ' + evW.charge + ' charge' : 'Confirm';
          mHint = (evW.pattern ? evW.pattern.text + ' ' : '') + (evW.facing && evW.stage !== 'stand' ? 'Fires ' + evW.facing + '. ' : '') + evW.hint + (evW.fizzle ? ' ' + evW.fizzleText : '')
            + (evW.affected.length ? ' ' + evW.affected.map((a) => a.name + ' (' + a.tag.toLowerCase() + ': ' + a.text + ')').join('; ') + '.' : '') + (foe ? ' ' + foe.name + ' is a person on the map: this starts a fight.' : '');
        }
      } else if (W === 'outburst') {
        // Rules 1.5 (game/heartView.ts): Begin (hold at stage 0) or Snap (Begin and Release at once, aimed). The overlay
        // is the engine's plan: reach ring, the tinted shape, everyone affected with their numbers.
        wCards = designCards(cbx, u);
        const card = designSel ? wCards.find((x) => x.id === designSel.id) : null, snap = S.wObMode === 'snap';
        if (!designSel) mHint = 'You have no designs ready: make one on the MAGIC tab.';
        else if (u.mg && u.mg.held) mHint = 'You are holding an Outburst: Pump, Release or Let it go.';
        else if (!snap) { mHz = { ...aimOverlay(cbx, u, designSel.id, null), mode: 'idle', area: new Set(), marks: new Map(), chip: '' };
          mReady = !!(card && card.canBegin); mLabel = 'Begin · ' + (card ? card.beginAp : 2) + ' AP';
          mHint = card ? (card.canBegin ? 'Begin ' + designSel.name + ' (' + card.line + '): it holds at stage 0; Pump it up and Release it. ' + card.costText + '.' : designSel.name + ': ' + card.beginWhy) : 'Not now.'; }
        else { const at = S.wAim || S.hoverTile || null, ov = aimOverlay(cbx, u, designSel.id, at), pl = aimOverlay(cbx, u, designSel.id, S.wAim).plan; mHz = ov;
          const aura = card && card.form === 'aura';
          mReady = !!(pl && pl.ok && (S.wAim || aura)); mLabel = 'Snap · ' + (pl && pl.ap ? pl.ap : card ? card.snapAp : 3) + ' AP';
          mHint = mReady ? designSel.name + (aura ? ' all around you. ' : ' at ' + refOf(S.wAim) + '. ') + (ov.summary.join(' ') || 'Nobody is there.') + (pl.affected || []).filter((x) => x.enemy).map((x) => ' ' + x.name + ' is a person on the map: this starts a fight.').slice(0, 1).join('')
            : !S.wAim && !aura ? 'Snap ' + designSel.name + ' (' + (card ? card.line : '') + '): hover to preview, click a tile to aim.' : designSel.name + ': ' + ((pl && pl.why) || 'not now.'); }
      } else if (W === 'release') {
        wHp = MN.held ? heartPanel(cbx, u) : null;
        if (!wHp) mHint = 'Nothing held.';
        else { const aura = wHp.form === 'aura', at = S.wAim || S.hoverTile || null, ov = aimOverlay(cbx, u, 'held', at), pl = aimOverlay(cbx, u, 'held', S.wAim).plan; mHz = ov;
          mReady = !!(pl && pl.ok && (S.wAim || aura)); mLabel = 'Release · ' + (pl && pl.ap ? pl.ap : 1) + ' AP';
          mHint = mReady ? 'Release ' + wHp.name + ' at stage ' + wHp.stage + ' (×' + wHp.mult + ')' + (aura ? ' all around you. ' : ' at ' + refOf(S.wAim) + '. ') + (ov.summary.join(' ') || 'Nobody is there.') + (pl.affected || []).filter((x) => x.enemy).map((x) => ' ' + x.name + ' is a person on the map: this starts a fight.').slice(0, 1).join('')
            : !S.wAim && !aura ? 'Click a tile to release ' + wHp.name + ' (' + wHp.shape + ', stage ' + wHp.stage + ').' : 'Release ' + wHp.name + ': ' + ((pl && pl.why) || 'not now.'); }
      } else if (HEART_W.includes(W)) {
        wHp = heartPanel(cbx, u); mHz = idleOverlay(cbx, u);
        const B = wHp ? { pump: wHp.pump, steady: wHp.steadyBtn, letgo: wHp.letgo, feed: wHp.feed, heartwatch: wHp.watchBtn }[W] : null;
        mReady = !!(B && B.ok); mLabel = (B ? B.label + ' · ' + B.cost : 'Confirm');
        mHint = !wHp ? 'You hold no Outburst.' : B.ok ? B.title : B.label + ': ' + B.why;
      } else if (M_INSTANT.includes(W)) {
        const run = { scuff: mgScuff, vent: mgVent, core: mgSwapCore, syphon: mgSyphon, crystallise: mgCrystallise }[W], why = dryMagic(cbx, u.id, (cc, uu) => run(cc, uu)).err;
        const say = { scuff: 'Wipe out the glyphs on your own tile (1 AP).', vent: 'Let ' + MN.flux + ' Flux out of the Evoker into the air (1 AP): it thickens the mana.', core: 'Load a fresh core: charge back to ' + CORE_CHARGE + ' (2 AP, ' + MN.cores + ' spare).',
          syphon: 'Pull MP from the air (1 AP): about ' + Math.round(MN.band.syphon_mp * (u.mg?.syphon || 1)) + ' MP in ' + bandName(MN.band) + ' air; the air thins by 2.', crystallise: 'Crystallise a mana core out of the air (3 AP): needs mana 10 or more, and drops it by 10.' }[W];
        mHint = say + (why ? ' Not now: ' + why : ''); mReady = !why; mLabel = { scuff: 'Scuff', vent: 'Vent Flux', core: 'Swap core', syphon: 'Syphon', crystallise: 'Crystallise' }[W] + ' · ' + { scuff: 1, vent: 1, core: 2, syphon: 1, crystallise: 3 }[W] + ' AP';
      }
    }
    const WMw = mOpen && W === 'draw' ? wordMasteryChips(c) : {}; // rules 1.10: use counts and stars on the keys
    const wMagic = {
      showWords: !!(mOpen && W === 'draw' && myWords.length), showDesigns: !!(mOpen && W === 'outburst' && myDesigns.length),
      words: myWords.map((w) => { const on = w === wordSel, def = SIGIL[w], dw = drawAll.find((x) => x.id === w), off = !!(dw && !dw.ok), wm = WMw[w];
        return { key: w, img: glyphUri(w, off ? '#7F8BA1' : SIGIL_INK, { glow: on && !off }), word: def.word, charge: String(def.charge), sub: off ? def.charge + ' ch' : def.charge + ' charge', hint: off ? dw.hint : '',
          title: (dw ? dw.title : def.word + ' · ' + def.text) + (wm ? ' · ' + wm.text : ''), pressed: on ? 'true' : 'false', disabled: off ? 'true' : 'false', onKey: glyphKeyNav,
          hasUses: !!wm, uses: wm ? String(wm.uses) : '', hasStar: !!(wm && wm.hasStar), star: wm ? wm.star : '', starAlt: wm ? wm.starAlt : '',
          aria: def.word + ', ' + (wordClassName(w) || 'word') + ', ' + (off ? 'can\'t draw now: ' + dw.why : def.charge + ' charge') + (wm ? '; ' + wm.text : ''),
          pick: () => this.setState({ wWord: w }), style: 'display: flex; flex-direction: column; align-items: center; gap: 2px; width: 66px; padding: 4px 2px; border-radius: 8px; font-family: inherit; font-size: 9px; font-weight: 700; letter-spacing: 0.04em; cursor: pointer; color: ' + (off ? '#A3AEC2' : on ? '#E7EBF3' : SIG_CYAN) + '; border: 1px ' + (off && !on ? 'dashed #2A3A48' : 'solid ' + (on ? SIG_CYAN : '#232D3F')) + '; background: ' + (on ? epRgba(SIG_CYAN, 0.16) : '#10151F') + (off ? '; opacity: 0.8' : '') }; }),
      designs: wCards.map((d) => { const on = designSel && d.id === designSel.id; return { key: d.id, name: d.name, sub: d.line, icon: d.icon, title: d.title + ' ' + d.costText + '.', subStyle: 'font-size: 10px; font-weight: 700; color: ' + d.ink,
        pressed: on ? 'true' : 'false', pick: () => this.setState({ wDesign: d.id, wAim: null }), style: 'display: grid; grid-template-columns: 24px minmax(0, 1fr); gap: 0 8px; align-items: center; width: 100%; padding: 6px 10px; border-radius: 8px; text-align: left; font-family: inherit; font-size: 12px; font-weight: 700; cursor: pointer; color: #E7EBF3; border: 1px solid ' + (on ? d.ink : '#232D3F') + '; background: ' + (on ? epRgba(SOUL_VIOLET, 0.14) : '#10151F') + (d.canBegin ? '' : '; opacity: 0.6') }; }),
      modes: [['begin', '♥ Begin and hold'], ['snap', 'Snap it now (×' + STAGE_MULT[0] + ')']].map(([id, label]) => { const on = (S.wObMode === 'snap' ? 'snap' : 'begin') === id; return { key: id, label, pressed: on ? 'true' : 'false', pick: () => this.setState({ wObMode: id, wAim: null }),
        style: 'flex: 1; min-height: 32px; border-radius: 8px; font-family: inherit; font-size: 12px; font-weight: 700; cursor: pointer; color: ' + (on ? '#E7EBF3' : SOUL_VIOLET) + '; border: 1px solid ' + SOUL_VIOLET + '; background: ' + (on ? epRgba(SOUL_VIOLET, 0.2) : 'transparent') }; }),
      showHeart: !!(mOpen && wHp && (W === 'release' || HEART_W.includes(W))),
      hv: heartVals(wHp, (id) => { if (id === 'release') return this.setState({ wAct: 'release', wAim: null });
        // Rules 1.8: a feeling pump ('pump:<feeling>') and Revert Pump run as world acts too.
        if (id.startsWith('pump:')) return act({ type: 'world/act', charId: c.id, act: 'pump', feeling: id.slice(5) });
        act({ type: 'world/act', charId: c.id, act: id, ...(id === 'heartwatch' ? { on: !(MN.held && MN.held.watch) } : {}) }); if (id === 'letgo') this.setState({ wAct: 'outburst' }); },
        { open: !!S.wFeelOpen, query: S.wFeelQ || '', toggle: () => this.setState({ wFeelOpen: !S.wFeelOpen }), search: (e) => this.setState({ wFeelQ: e && e.target ? e.target.value : String(e || '') }) }),
    };
    // Rules 1.10 Junctions (item 920): on a junction's tile, pick which of its two Lines to Evoke (as on the combat pad).
    const wJx = mOpen && W === 'evoke' && evW && (evW.junction || []).length > 1 ? evW.junction : [];
    wMagic.hasJunction = wJx.length > 0;
    wMagic.junctionBtns = wJx.map((j) => ({ key: j.key, label: (j.on ? '✓ ' : '') + j.label, title: 'Evoke the Line ' + j.label + ' from this junction', pressed: j.on ? 'true' : 'false', pick: () => this.setState({ wEvc: { stroke: j.key }, wAim: null }),
      style: 'min-height: 26px; padding: 0 8px; border-radius: 6px; font-family: inherit; font-size: 10px; font-weight: 700; letter-spacing: 0.06em; cursor: pointer; ' + (j.on ? 'border: 1px solid ' + SIG_CYAN + '; background: ' + epRgba(SIG_CYAN, 0.16) + '; color: #E7EBF3' : 'border: 1px solid #232D3F; background: #10151F; color: ' + SIG_CYAN) }));
    wMagic.wordRows = wordRows(wMagic.words, (w) => w.key).map((r) => ({ key: r.key, label: r.label.toUpperCase(), aria: r.label + ' words', words: r.items }));
    // Rules 1.10: the stroke picker for the word picked (as on the combat glyph keyboard), and what the glyph makes.
    const wSbs = wMagic.showWords ? strokeButtons(drawInfo) : [];
    wMagic.hasStrokes = wSbs.length > 0;
    wMagic.strokeNote = drawInfo && drawInfo.ok && drawInfo.effectText ? 'This glyph ' + drawInfo.effectText + '.' : drawInfo && !drawInfo.ok && wSbs.length ? drawInfo.why || '' : '';
    wMagic.hasStrokeNote = !!(wMagic.showWords && wMagic.strokeNote);
    wMagic.strokeBtns = wSbs.map((b) => ({ key: b.key, label: (b.on ? '✓ ' : '') + b.label, title: b.title, pressed: b.on ? 'true' : 'false', pick: () => this.setState({ wStroke: b.key }),
      style: 'min-height: 26px; padding: 0 8px; border-radius: 6px; font-family: inherit; font-size: 10px; font-weight: 700; letter-spacing: 0.06em; cursor: pointer; '
        + (b.on ? 'border: 1px solid ' + SIG_CYAN + '; background: ' + epRgba(SIG_CYAN, 0.16) + '; color: #E7EBF3' : b.ok ? 'border: 1px solid #232D3F; background: #10151F; color: ' + SIG_CYAN : 'border: 1px dashed #2A3A48; background: transparent; color: #A3AEC2') }));
    // The stroke layer on the map (rules 1.10): faint joins, the hovered stroke lit and named, the draw's dashed preview.
    const SLw = strokeLayer(GLY, { side: 'pc', hover: S.area ? S.hoverTile : null, knows: knowsW, preview: mOpen && W === 'draw' && drawInfo && drawInfo.ok ? [drawInfo.joins, drawInfo.joins2] : [] });
    const magicClick = (k) => {
      if (W === 'draw') { if (!wordSel) return toast('You know no words.'); act({ type: 'world/act', charId: mover.id, act: 'draw', word: wordSel, tile: k, ...(drawStroke ? { stroke: drawStroke } : {}) }); if (S.wStroke) this.setState({ wStroke: null }); return; }
      if (W === 'evoke') {
        const cbx = scb(), u = sU(cbx);
        const v = S.wTile && cbx && u && glAt[S.wTile] ? evokeView(cbx, u, S.wTile, S.wEvc || {}, null, knowsW) : null;
        const r = evokeClick(v, cbx || { glyphs: GLY }, u, k, S.wEvc || {});
        if (r.pattern !== undefined) return this.setState({ wTile: r.pattern, wEvc: {} });
        if (r.choice) return this.setState({ wEvc: r.choice });
        return toast(r.toast || 'Click a glyph of a Line.');
      }
      if (W === 'outburst') return this.setState({ wAim: k, wObMode: 'snap' }); // a tile click means a snap at it
      if (W === 'release') return this.setState({ wAim: k });
      // A heart move (Pump, Steady, Let go, Feed, Heart Overwatch) needs no tile: a stray click never spends it (as on
      // the combat grid); it goes through Confirm or the HEART panel.
      if (HEART_W.includes(W)) return toast('No tile needed: use the HEART panel or Confirm.');
      return toast('No tile needed: Confirm.');
    };
    const magicConfirm = () => {
      const base = { type: 'world/act', charId: c.id, act: W };
      if (W === 'evoke') { const cbx = scb(), u = sU(cbx), v = cbx && u && S.wTile ? evokeView(cbx, u, S.wTile, S.wEvc || {}, null, knowsW) : null; if (v && v.payload) act({ ...base, ...v.payload }); }
      else if (W === 'outburst') act(S.wObMode === 'snap' ? { ...base, design: designSel.id, hold: false, aim: S.wAim || myAt } : { ...base, design: designSel.id, hold: true });
      else if (W === 'release') act({ ...base, ...(S.wAim ? { aim: S.wAim } : {}) });
      else if (W === 'heartwatch') act({ ...base, on: !(MN.held && MN.held.watch) });
      else act(base);
      this.setState({ wTile: null, wAim: null, wEvc: null, ...(W === 'outburst' ? { wObMode: 'begin', wAct: S.wObMode === 'snap' ? W : 'pump' } : W === 'release' || W === 'letgo' ? { wAct: 'outburst' } : {}) });
      if (getState().game?.phase === 'combat') { this.setState({ area: false }); go('combat'); }
    };
    // ---------- planning on the area map, as on the combat grid (Leon, combat feel v1) ----------
    // Move, Sprint and Sneak show the tiles you can reach this round (dashed) and, on hover, the path and its AP cost.
    // Shot, Aimed shot and Melee show the weapon's reach as a red grid around you: targets in it are outlined in red, the
    // rest dimmed, and hovering one shows the engine's hit chance and AP. All of it comes from the engine (paths,
    // apForTiles, previewAttack, lineOfSight) on the story map as a throwaway fight; nothing here is a rule of its own.
    const plan = { reach: new Set(), route: {}, hv: null, cost: '', red: new Map(), tgt: {}, info: '', isMove: false, isAtk: false, cross: new Set(), pile: null };
    const arrowsOf = (rr, from) => { rr.forEach((k, i) => { const p = i ? rr[i - 1] : from, [ax, ay] = p.split(',').map(Number), [bx, by] = k.split(',').map(Number); plan.route[p] = ARROWS[(bx - ax) + ',' + (by - ay)]; }); };
    const planOn = !!(S.area && mover && mover.hp > 0 && myAt && g.story.await === 'players' && !(g.story.ended || {})[mover.id]);
    if (planOn && (['move', 'sprint', 'sneak', 'drone', 'beast', 'twin'].includes(W) || ['shot', 'aimed', 'melee'].includes(W))) {
      const cbx = scb(), u = W === 'drone' ? myDrone() : W === 'beast' ? myBeast() : W === 'twin' ? myTwin() : sU(cbx);
      if (cbx && u && ['move', 'sprint', 'sneak', 'drone', 'beast', 'twin'].includes(W)) {
        plan.isMove = true;
        if (!u.prone) {
          const P = paths(cbx, u.pos, u.id), mvv = u.movement;
          const costOf = (k) => (W === 'sprint' ? 2 : apForTiles(P.dist[k], 0, mvv) + (W === 'sneak' ? P.dist[k] : 0));
          for (const k of Object.keys(P.dist)) { if (k === u.pos || (W === 'sprint' && (u.noSprint || P.dist[k] > Math.floor(3 * mvv)))) continue; if (costOf(k) <= u.ap) plan.reach.add(k); }
          const hv = S.hoverTile && plan.reach.has(S.hoverTile) ? S.hoverTile : null;
          // Rules 1.9 (item 683): the route the click takes goes around revealed hazards when it can (movePaths); the
          // preview marks every revealed hazard tile it still crosses, and says so.
          if (hv) { const rh = routeHazards(cbx, u, hv, W === 'sprint' ? 'sprint' : W === 'sneak' ? 'sneak' : 'move'), tl = rh ? rh.tiles : P.dist[hv], cst = W === 'sprint' ? 2 : apForTiles(tl, 0, mvv) + (W === 'sneak' ? tl : 0), ct = crossesText(rh && rh.crosses);
            plan.hv = hv; plan.cost = '−' + cst + ' AP · ' + tl + (tl === 1 ? ' tile' : ' tiles') + (ct ? ' · ⚠ HAZARD' : '');
            plan.info = (W === 'sprint' ? 'Sprint' : W === 'sneak' ? 'Sneak' : W === 'drone' ? 'The drone flies' : W === 'beast' ? 'The beast pads' : W === 'twin' ? 'The twin steps' : 'Move') + ' to ' + refOf(hv) + ': ' + tl + (tl === 1 ? ' tile' : ' tiles') + ', ' + cst + ' AP (' + u.ap + ' left).'
              + (ct ? ' ' + ct : rh && tl > P.dist[hv] ? ' The path goes around the revealed hazards (' + (tl - P.dist[hv]) + (tl - P.dist[hv] === 1 ? ' tile' : ' tiles') + ' longer).' : '');
            if (rh) { arrowsOf(rh.route, u.pos); for (const x of rh.crosses) plan.cross.add(x.tile); }
            else for (let k = hv, n = 0; P.prev[k] && k !== u.pos && n < 400; n++) { const p = P.prev[k], [ax, ay] = p.split(',').map(Number), [bx, by] = k.split(',').map(Number); plan.route[p] = ARROWS[(bx - ax) + ',' + (by - ay)]; k = p; } }
        }
      } else if (cbx && u) {
        plan.isAtk = true;
        const mode = W, w0 = WEAPON[u.weapon] || WEAPON.fists, melee = isMelee(w0) || mode === 'melee', useW = mode === 'melee' && !isMelee(w0) ? WEAPON.fists : w0, fx = (w0.grants && w0.grants.effect) || {};
        // The reach the engine allows (previewAttack): melee 1 (2 for reach weapons); a gun out to three range bands (four with an optic).
        const memoKey = g.v + '|' + mode + '|' + u.pos + '|' + u.weapon;
        if (!this._redMemo || this._redMemo.key !== memoKey) {
          const reachM = useW.properties?.includes('reach_2') || useW.id === 'lance' || (useW === w0 && fx.op === 'reach') ? (fx.op === 'reach' && useW === w0 ? fx.value : 2) : 1;
          const optic = (u.mods || []).includes('mod_red_dot') || ((u.mods || []).includes('mod_scope') && mode === 'aimed') ? 1 : 0;
          const maxR = melee ? reachM : effectiveRange(useW) * (3 + optic), red = new Map(), bandW = melee ? 0 : effectiveRange(useW);
          // By range band: the first band reads strongest, the far ones fade (−2 to hit per band past the first).
          for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) { const k = x + ',' + y; if (k === u.pos || solid.has(k)) continue; const d = dist(u.pos, k); if (d <= maxR && (melee || lineOfSight(cbx, u.pos, k))) red.set(k, bandW ? Math.max(0, Math.ceil(d / bandW) - 1) : 0); }
          this._redMemo = { key: memoKey, red };
        }
        plan.red = this._redMemo.red;
        // Who could be hit: people (and allies: friendly fire) and objects with something to break.
        for (const du of units) { if (du.charId === mover.id || du.dead || du.companion) continue; const tu = cbx.units.find((x) => x.id === du.id); if (!tu) continue;
          const pv = previewAttack(cbx, u, tu, mode); plan.tgt[du.pos] = { name: du.name, inRange: plan.red.has(du.pos), pv }; }
        for (const o of objs) { if (o.hidden || plan.tgt[o.pos] || !((o.hp != null && o.hp > 0) || isPersonObj(g, o))) continue; plan.tgt[o.pos] = { name: o.name, inRange: plan.red.has(o.pos), pv: null }; }
        const ht = S.hoverTile && plan.tgt[S.hoverTile];
        const pvText = (t) => (!t ? '' : t.pv ? (t.pv.ok ? 'Hit ' + t.pv.pct + '% · need ' + t.pv.need + ' (you roll d20 ' + fmt(t.pv.toHit) + ') · ' + t.pv.ap + ' AP' + (t.pv.rangePenalty ? ' · range ' + t.pv.rangePenalty : '') + (t.pv.cover ? ' · behind half cover −5' : '') : t.pv.why) : t.inRange ? 'In reach: ' + attackApCost(useW, melee ? 'melee' : mode === 'aimed' ? 'aimed' : 'shot') + ' AP.' : 'Out of reach.');
        if (ht) { plan.hv = S.hoverTile; plan.cost = ht.pv && ht.pv.ok ? ht.pv.pct + '% · ' + ht.pv.ap + ' AP' : ht.inRange ? 'IN REACH' : 'OUT OF REACH'; plan.info = ht.name + ': ' + pvText(ht); }
        plan.selText = (k) => pvText(plan.tgt[k]);
        plan.reachText = (melee ? 'Melee reach' : (useW.name || 'Weapon') + ' reach') + ': ' + (melee ? (plan.red.size ? 'the tiles next to you' : 'none') : 'up to ' + Math.round(effectiveRange(useW) * (3 + ((u.mods || []).includes('mod_red_dot') || ((u.mods || []).includes('mod_scope') && mode === 'aimed') ? 1 : 0))) + ' tiles in sight (−2 to hit per range band past ' + effectiveRange(useW) + ')') + '.';
      }
    }
    // Rules 1.9: Pick up on the area map. The clicked pile (or the one in reach, your own tile first) opens its checklist; a
    // pile out of reach shows the way there and the revealed hazards it crosses. The view holds only piles the party sees.
    const pilesW = !inFight ? pilesIn(objs) : new Map(), pileNear = myAt ? [...pilesW.values()].filter((o) => dist(myAt, o.pos) <= 1).sort((a, b) => dist(myAt, a.pos) - dist(myAt, b.pos)) : [];
    const wPick = W === 'pickup' && mover ? (S.wTile && pilesW.get(S.wTile)) || pileNear[0] || null : null;
    const wUntick = wPick && S.wUntick && S.wUntick.tile === wPick.pos ? S.wUntick.keys : [];
    const wPickWhy = wPick ? pickupWhy(myAt, wPick, c ? apLeft(g, c) : 0, wUntick) : 'Nothing on the ground next to you.';
    if (wPick && planOn && dist(myAt, wPick.pos) > 1) { const cbx = scb(), u = sU(cbx), rh = cbx && u ? routeHazards(cbx, u, wPick.pos) : null; if (rh) { arrowsOf(rh.route, u.pos); for (const x of rh.crosses) plan.cross.add(x.tile); plan.pile = rh; } }
    // World Play 1.7 on the map (game/worldView.ts): hazards per tile (no hidden ones: the view drops them), safe-path tiles,
    // objective and hint markers, caches with their count, and the free tiles for a Put down being placed.
    const WLs = { big: worldLayer(g, true, c ? c.id : undefined), small: worldLayer(g, false, c ? c.id : undefined) };
    const pdOn = !!(S.putDown && c && !inFight && (c.carried || []).some((x) => x.npc.id === S.putDown)), pdSet = pdOn ? new Set(putDownTiles(g, c.id)) : new Set();
    if (S.putDown && !pdOn) queueMicrotask(() => this.setState({ putDown: null }));
    const sgTiles = evW ? mergeTiles((placedW && placedW.tiles) || {}, evW.tiles) : (placedW && placedW.tiles) || {};
    const cellsFor = (labels, onClick) => {
      const out = [], lab = (key, text) => ({ key, isLabel: true, isTile: false, text, style: 'display: grid; place-items: center; font-size: 10px; font-weight: 700; letter-spacing: 0.06em; color: #7F8BA1' });
      if (labels) { out.push(lab('h-', '')); for (let x = 0; x < map.w; x++) out.push(lab('h' + x, refOf(x + ',0').replace(/\d+$/, ''))); }
      for (let y = 0; y < map.h; y++) {
        if (labels) out.push(lab('r' + y, String(y + 1)));
        for (let x = 0; x < map.w; x++) { const k = x + ',' + y, u = tok[k], p = u && u.side === 'pc' ? playerOf(charOf(u.charId)?.owner) : null, ref = refOf(k), note = notesAt(map, k)[0] || '', o = objAt[k];
          const what = solid.has(k) ? 'blocked' : o && o.kind !== 'crate' && o.kind !== 'pillar' ? o.name + (o.hp != null ? ' (' + o.hp + '/' + o.max + ' HP)' : '') + (o.locked ? ', locked' : o.open ? ', open' : '') + (o.approaches.length ? ', ' + o.approaches.length + ' approaches' : '') : cov[k] ? cov[k].kind + ' cover' : diff.has(k) ? 'slow ground' : 'open';
          const spr = o ? spriteOf(g, o) : '';
          const wc = (labels ? WLs.big : WLs.small).cells.get(k) || {}, kb = u && u.npc ? kindBadge(u.kind, labels) : null, pdHere = labels && pdSet.has(k);
          const wWhat = (wc.hz ? ' · ' + wc.hz.title : '') + (wc.mark ? ' · ' + wc.mark.title.replace(/\n/g, ' · ') : '') + (wc.cache ? ' · ' + wc.cache.title : '') + (wc.pile ? ' · ' + wc.pile.title.replace(/:\n/, ': ').replace(/\n/g, ', ') : '') + (labels && plan.cross.has(k) ? ' · your path crosses this hazard' : '') + (u && u.npc ? ' · ' + (kb && kb.title ? kb.title.toLowerCase() : 'person') + ' · click to talk' : '') + (pdHere ? ' · put them down here' : '');
          const gl = glAt[k] || [], held = u ? heldOf(u) : null, sgT = sgTiles[k];
          const sgDim = labels && evW && evW.area.size > 0 && evW.stage !== 'stand' && !evW.area.has(k) && !evW.pickable.has(k) && !evW.stepTo.has(k) && !evW.orderTo.has(k) && k !== myAt;
          const sgLayer = [sgT && sgT.layer, sgDim ? 'background: rgba(5, 7, 11, 0.5)' : ''].filter(Boolean).join('; ');
          const tr = trAt[k] || [], mWhat = (gl.length ? ' · glyphs: ' + gl.map((x) => glyphMark(x, 'pc', knowsW).title).join(', ') : '') + (tr.length ? ' · ' + tr.map((x) => traceMark(x, knowsW).title).join(', ') : '') + (sgT && sgT.note ? ' · ' + sgT.note : '') + (held ? ' · holding an Outburst, stage ' + held.stage : '');
          const mStyle = !labels ? '' : (mHi.pattern.has(k) ? '; outline: 2px solid ' + SIG_CYAN + '; outline-offset: -2px' : mHi.aim === k ? '; outline: 2px solid #FFFFFF; outline-offset: -2px' : '') + (mHi.reach.has(k) ? '; box-shadow: inset 0 0 0 2px ' + epRgba(mHi.reachCol, 0.45) : '');
          const glyph = o && !u && !spr && !wc.cache && !wc.sigil && !(cov[k] && (o.kind === 'crate' || o.kind === 'pillar')) ? kindOf(o).glyph : '';
          const hzU = labels && u && mHz.on ? mHz.marks.get(u.id) : null, hzL = labels && mHz.on ? overlayTileStyle(mHz, k) : '';
          // The planning layer (area map only): reachable tiles and the path; an attack's red reach and its targets.
          const pT = labels && plan.isAtk ? plan.tgt[k] : null, inRed = labels && plan.isAtk && plan.red.has(k), canGo = labels && plan.isMove && plan.reach.has(k) && !u;
          const planStyle = !labels ? '' : wPick && wPick.pos === k ? 'border: 2px solid #FFFFFF; background: rgba(255, 255, 255, 0.2)' : W === 'pickup' && pileNear.some((o) => o.pos === k) ? 'border: 1px dashed rgba(231, 235, 243, 0.8); background: rgba(231, 235, 243, 0.1)' : plan.hv === k && plan.isMove ? 'border: 2px solid #FFFFFF; background: rgba(255, 255, 255, 0.28)'
            : plan.route[k] && k !== myAt ? 'border: 1px dashed rgba(231, 235, 243, 0.8); background: rgba(255, 255, 255, 0.2)'
            : canGo ? 'border: 1px dashed rgba(231, 235, 243, 0.55); background: rgba(231, 235, 243, 0.08)'
            : inRed ? 'border: 1px dashed ' + epRgba(RANGE_RED, [0.9, 0.55, 0.35, 0.25][Math.min(3, plan.red.get(k) || 0)]) + '; background: ' + epRgba(RANGE_RED, plan.hv === k ? 0.3 : [0.2, 0.11, 0.06, 0.04][Math.min(3, plan.red.get(k) || 0)]) : '';
          const tgtMark = !pT ? '' : pT.inRange ? (S.wTarget && u && u.id === S.wTarget ? '' : '; outline: 2px solid ' + RANGE_RED + '; outline-offset: -2px') : '; filter: grayscale(0.7) brightness(0.55)';
          out.push({ key: k, cls: 'phc-tok' + (pT && pT.inRange ? ' phc-plan-target' : ''),
            hasHzd: !!wc.hz, hzdLayer: wc.hz ? wc.hz.layer : '', hzdGlyph: wc.hz ? wc.hz.glyph : '', hzdGlyphStyle: wc.hz ? wc.hz.glyphStyle : '', hzdKind: wc.hz ? wc.hz.kind + (wc.hz.safe ? ' safe' : '') : '',
            hasMk: !!wc.mark, mkText: wc.mark ? wc.mark.text : '', mkStyle: wc.mark ? wc.mark.style : '', hasMkChip: labels && !!wc.mark && !u, mkChip: wc.mark ? wc.mark.chip : '', mkChipStyle: wc.mark ? wc.mark.chipStyle : '',
            hasSigMark: !!wc.sigil && !u, sigMark: wc.sigil ? wc.sigil.src : '', sigMarkStyle: wc.sigil ? wc.sigil.style : '', hasCache: !!wc.cache && !u, hasCacheGlyph: !!wc.cache && !u && !spr, cacheGlyph: wc.cache ? wc.cache.glyph : '', cacheStyle: wc.cache ? wc.cache.style : '', cacheChip: wc.cache ? wc.cache.chip : '', cacheChipStyle: wc.cache ? wc.cache.chipStyle : '',
            hasKind: !!(kb && kb.has), kindText: kb ? kb.text : '', kindStyle: kb ? kb.style : '', kindTitle: kb ? kb.title : '',
            hasPile: !!wc.pile, pileStyle: wc.pile ? wc.pile.style : '', pileIconStyle: wc.pile ? wc.pile.iconStyle : '', pileCount: wc.pile ? wc.pile.count : '', pileCountStyle: wc.pile ? wc.pile.countStyle : '',
            hasPileTip: labels && !!wc.pile && S.hoverTile === k, pileTip: wc.pile ? wc.pile.tip : '', pileRows: wc.pile ? wc.pile.tipRows : [], pileTipStyle: wc.pile ? pileTipStyle(wc.pile, x, y, map.w) : '',
            hasCross: labels && plan.cross.has(k), crossStyle: CROSS_STYLE, crossChipStyle: CROSS_CHIP_STYLE,
            hasPd: pdHere, pdStyle: 'position: absolute; inset: 1px; z-index: 6; pointer-events: none; box-sizing: border-box; border-radius: 2px; border: 2px dashed #FFFFFF; background: rgba(255, 255, 255, 0.16)',
            hasHzL: !!hzL || !!hzU, hzLayer: hzU ? 'position: absolute; inset: 0; z-index: 2; border-radius: 2px; pointer-events: none; box-sizing: border-box; border: 3px solid ' + hzU.ink + '; box-shadow: 0 0 8px ' + hzU.ink : hzL,
            hasHz: !!hzU, hzText: hzU ? markChipText(hzU) : '', hzStyle: hzU ? markChipStyle(hzU) : '', hzTitle: hzU ? hzU.title : '',
            hasHzChip: labels && mHz.on && mHz.mode === 'aim' && !!mHz.chip && mHz.aim === k, hzChip: mHz.chip,
            hasPlan: !!planStyle, planStyle: 'position: absolute; inset: 0; z-index: 1; pointer-events: none; box-sizing: border-box; border-radius: 2px; ' + planStyle,
            hasArrow: labels && !!plan.route[k] && k !== myAt, arrow: plan.route[k] || '', hasCost: labels && plan.hv === k && !!plan.cost, cost: plan.cost,
            costStyle: 'position: absolute; left: 50%; top: -12px; transform: translateX(-50%); z-index: 6; padding: 2px 6px; border-radius: 6px; font-size: 11px; font-weight: 700; white-space: nowrap; pointer-events: none; '
              + (plan.isAtk ? 'background: ' + RANGE_RED + '; color: #0A0D13' : 'background: #FFFFFF; color: #0A0D13'), isLabel: false, isTile: true, has: !!u, glyph, hasGlyph: !!glyph, hasSprite: !!spr, sprite: spr, spriteStyle: o ? spriteStyle(o) : '', glyphStyle: 'position: absolute; inset: 0; display: grid; place-items: center; font-size: ' + (labels ? 18 : 9) + 'px; line-height: 1; color: ' + (o && (o.approaches.some((a) => !a.tries.length) || o.kind === 'poi') && !o.resolved ? '#FFFFFF' : o && (kindOf(o).hazard || o.kind === 'trap') ? '#F65157' : '#C9D3E3'),
            click: labels && pdOn ? onClick(k) : u && u.npc && labels && W === 'move' ? () => openTalk(u.id) : interesting(o) && labels && W === 'move' ? () => openObj(o) : onClick(k), hover: () => { if (this.state.hoverTile !== k) this.setState({ hoverTile: k }); },
            t: u ? tokenVals(u, { ref, ally: u.side === 'pc', player: p ? p.initials + ' · ' + p.name.toUpperCase() : u.npc ? u.npc.side.toUpperCase() + ' · ' + u.npc.tier.toUpperCase() : '', color: p ? p.color : u.npc && u.npc.side === 'neutral' ? '#A3AEC2' : '#F65157', inFight, right: x >= map.w / 2, up: y >= map.h / 2 }) : null,
            hasTrail: !!trailAt[k] && !u, trailStyle: trailAt[k] ? 'position: absolute; left: 50%; top: 50%; width: ' + (labels ? 10 : 5) + 'px; height: ' + (labels ? 10 : 5) + 'px; margin: -' + (labels ? 5 : 2.5) + 'px 0 0 -' + (labels ? 5 : 2.5) + 'px; border-radius: 50%; z-index: 2; pointer-events: none; background: ' + trailAt[k] + '; box-shadow: 0 0 0 2px rgba(5, 7, 11, 0.6)' : '',
            picked: S.wTarget && u && u.id === S.wTarget,
            hasJoin: labels && !!(SLw.tiles[k] && SLw.tiles[k].length), join: labels && SLw.tiles[k] ? joinUri(SLw.tiles[k], { size: 100, pad: 60, anchor: [25, 25], pitch: 104 }) : '',
            hasStrokeHot: labels && SLw.hot.has(k), hasStrokeTip: labels && k === S.hoverTile && !!SLw.hotText, strokeTip: SLw.hotText, strokeTipStyle: 'position: absolute; top: -17px; ' + (x >= map.w / 2 ? 'right: 0' : 'left: 0') + '; z-index: 7; padding: 1px 6px; border-radius: 6px; font-size: 10px; font-weight: 700; letter-spacing: 0.06em; white-space: nowrap; pointer-events: none; background: #0B1519; color: #8BDEEE; border: 1px solid #8BDEEE',
            glyphs: gl.slice(0, 2).map((x, i) => { const ours = x.side === 'pc';
              return { key: x.id, src: glyphMark(x, 'pc', knowsW).src,
                style: 'position: absolute; z-index: 3; width: 44%; height: 44%; pointer-events: none; ' + (i ? 'right: 3%; bottom: 3%' : 'left: 3%; top: 3%') + (ours ? '; filter: drop-shadow(0 0 2px ' + SIG_CYAN + ')' : '; opacity: 0.7') }; })
              .concat(gl.length < 2 ? tr.slice(0, 2 - gl.length).map((x, i) => ({ key: 'tr-' + x.id, src: traceMark(x, knowsW).src, // a trace: faint, where a glyph would sit
                style: 'position: absolute; z-index: 3; width: 44%; height: 44%; pointer-events: none; opacity: 0.45; ' + (i + gl.length ? 'right: 3%; bottom: 3%' : 'left: 3%; top: 3%') })) : []),
            hasZone: !!sgLayer, zoneStyle: 'position: absolute; inset: 0; z-index: 1; pointer-events: none; box-sizing: border-box; ' + sgLayer,
            hasSg: labels && !!(sgT && sgT.marks.length), sg: labels && sgT ? sgT.marks : [],
            hasHeart: !!held, heart: held ? heartUri(held.stage) : '', heartStyle: 'position: absolute; z-index: 4; right: -6%; top: -6%; width: 40%; height: 40%; pointer-events: none; filter: drop-shadow(0 0 3px ' + SOUL_VIOLET + ')',
            label: ref + (u ? ': ' + u.name : '') + ' · ' + what + (note ? ' · ' + note : '') + mWhat + wWhat, title: u ? '' : ref + ' · ' + what + mWhat + wWhat + (note ? '\n' + note : ''),
            style: 'position: relative; display: block; aspect-ratio: 1; padding: 0; border: 0; border-radius: 1px; cursor: ' + (mover && !u && !solid.has(k) && !cov[k] ? 'pointer' : 'default') + '; background: ' + (u && !mapArt ? '#0D1119' : cellBg(k)) + ((S.wTarget && u && u.id === S.wTarget) || (S.wTarget && !u && o && S.wTarget === 'obj:' + o.id) || (readT && readT === k) ? '; outline: 2px solid #FFFFFF; outline-offset: -2px' : '') + mStyle + tgtMark });
        }
      }
      return out;
    };
    // ---------- points of interest: the panel (like an event with choices) and what's nearby ----------
    const myPos = c ? pos[c.id] : null;
    const near = !inFight && myPos ? objs.filter((o) => !o.hidden && interesting(o) && Math.max(Math.abs(+o.pos.split(',')[0] - +myPos.split(',')[0]), Math.abs(+o.pos.split(',')[1] - +myPos.split(',')[1])) <= 1) : [];
    const nearby = near.map((o) => ({ key: o.id, label: kindOf(o).glyph + ' ' + o.name + ' · ' + refOf(o.pos) + (o.approaches.length ? ' · ' + o.approaches.length + ' approaches' : ''), open: () => openObj(o) }));
    // The shared spotlight (spec: Overworld rounds): a point of interest someone else opened shows for everyone, read-only,
    // with what they hover, unless this player closed it. Opening or hovering your own sends it to the party.
    const F = !inFight ? g.story.focus : null, fChar = F ? charOf(F.charId) : null, fMine = !!(fChar && fChar.owner === me);
    const spectating = !S.objPanel && !!(F && F.objId && !fMine && !(S.dismissed || {})['f' + F.seq]);
    const P0 = S.objPanel ? objs.find((o) => o.id === S.objPanel && !o.hidden) : spectating ? objs.find((o) => o.id === F.objId && !o.hidden) : null;
    if (S.objPanel && !P0) queueMicrotask(() => this.setState({ objPanel: null }));
    // World Play 1.7 panels: a person's Talk panel (click their token or a Talk button) and a hazard's ways through.
    const openTalk = (id) => { this.setState({ wp: { t: 'npc', id } }); };
    const openHazard = (id) => { this.setState({ wp: { t: 'hazard', id } }); };
    const openObj = (o) => { this.setState({ objPanel: o.id }); if (c && !inFight && g.phase === 'story') act({ type: 'story/focus', charId: c.id, objId: o.id }); };
    const fOwner = fChar ? playerOf(fChar.owner) : null;
    const isNear = !!(P0 && near.includes(P0));
    // An unfinished attempt of mine always has its dice open (it survives a reload or a remount; the table can't close before the roll).
    if (!S.dice) { const pk = myChecks.find((k) => k.poi && (!S.awaitPoi || k.poi.objId === S.awaitPoi)) || myChecks.find((k) => k.poi); if (pk) queueMicrotask(() => this.setState({ dice: pk.id, awaitPoi: null })); }
    const myTurn = !!c && !c.dead && g.phase === 'story' && g.story.await === 'players' && !(g.story.ended || {})[c.id] && !g.checks.some((k) => !k.done && k.poi && charOf(k.charId)?.owner === me);
    const tnWord = (tn) => ({ 8: 'Easy', 12: 'Standard', 16: 'Hard', 20: 'Heroic' }[tn] || 'TN');
    const poiWhy = spectating ? '' : !c ? 'You have no character here.' : g.phase !== 'story' ? 'After the fight.' : !isNear ? 'Walk up to it first.' : g.story.await !== 'players' ? 'Wait for the round to open.' : (g.story.ended || {})[c.id] ? 'You ended your turn this round.' : apLeft(g, c) < 1 ? 'No AP left this round.' : '';
    const P0own = P0 && (P0.portrait || (isPersonObj(g, P0) ? portraitFor(g, P0.name) : null)), P0face = P0 && isPersonObj(g, P0) ? npcFace(g, P0.npcId || P0.id, ART(P0own) || null, npcTags(P0.name), takenCards(g)) : P0 && ART(P0.portrait);
    const objPanel = P0 ? { hasPic: !!(P0face || spriteOf(g, P0)), pic: P0face || spriteOf(g, P0), zoomPic: zoomer(this, (P0face && P0face !== ART(P0own) ? P0face : ART_BIG(P0own)) || spriteOf(g, P0), P0.name, 'portrait'), name: P0.name, kicker: kindOf(P0).name.toUpperCase() + ' · ' + refOf(P0.pos) + (P0.hp != null ? ' · ' + P0.hp + '/' + P0.max + ' HP' : '') + (P0.locked ? ' · LOCKED' : P0.open ? ' · OPEN' : '') + (P0.resolved ? ' · DEALT WITH' : ''),
      text: P0.text || kindOf(P0).text, rules: P0.text ? kindOf(P0).text : '', hasRules: !!P0.text, why: poiWhy, hasWhy: !!poiWhy,
      approaches: P0.approaches.map((a, i) => { const tried = c && a.tries.some((t) => t.charId === c.id && t.scene === g.story.scene.n), ink = a.skills[0] && SK[a.skills[0]] ? ATTR[SK[a.skills[0]].attr].ink : '#FFFFFF';
        const either = a.pick === 'best' && a.skills.length > 1; // rules 1.10 sigil marks: the better of the skills, not a combo
        const best = c ? (() => { const mods = a.skills.map((s) => checkMod(s, c.skills[s] || 0)); if (either) return Math.max(...mods); const low = Math.min(...mods), li = mods.indexOf(low); return low + 2 * a.skills.filter((s, j) => j !== li && (c.skills[s] || 0) > 0).length; })() : 0;
        return { key: i, label: a.label, stakes: a.stakes, skills: (either ? [a.skills.join('|')] : a.skills).map((s0) => { const s = s0.split('|')[0]; return { key: s0, name: s0.split('|').map((x) => (SK[x] ? SK[x].name : x)).join(' or '), style: 'padding: 1px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; border: 1px solid ' + (SK[s] ? ATTR[SK[s].attr].ink : '#A3AEC2') + '; color: ' + (SK[s] ? ATTR[SK[s].attr].ink : '#A3AEC2') }; }),
          tn: tnWord(a.tn).toUpperCase() + ' ' + a.tn + (c ? ' · YOU ROLL d20 ' + fmt(best) : '') + (a.success ? ' · SUCCESS: ' + ({ remove: 'CLEARS IT', open: 'OPENS IT', reveal: 'REVEALS', disarm: 'DISARMS', study: 'COPIES THE WORD', loot: 'LOOTS IT', advance: 'DONE', safe: 'SAFE PATH' }[a.success] || a.success.toUpperCase()) : ''),
          tries: a.tries.map((t, j) => ({ key: j, text: (t.ok ? '✓ ' : '✕ ') + t.name + ' · ' + t.total, style: 'font-size: 11px; font-weight: 700; color: ' + (t.ok ? '#6FEA77' : '#A3AEC2') })), hasTries: a.tries.length > 0,
          cant: spectating || !myTurn || !isNear || !!tried || !!P0.resolved || apLeft(g, c) < 2, label2: tried ? 'Tried this scene' : 'Try this · 2 AP',
          hover: () => { if (!spectating && c && F && fMine && F.hover !== i) act({ type: 'story/focus', charId: c.id, objId: P0.id, hover: i }); },
          go: () => { act({ type: 'poi/try', charId: c.id, objId: P0.id, idx: i }); this.setState({ awaitPoi: P0.id }); },
          style: 'display: flex; flex-direction: column; gap: 6px; padding: 12px; border-radius: 10px; background: ' + (F && F.objId === P0.id && F.hover === i ? '#1C2536' : '#0D1119') + '; border: 1px solid ' + (F && F.objId === P0.id && F.hover === i ? (fOwner?.color || '#FFFFFF') : '#232D3F') + '; border-left: 3px solid ' + ink }; }),
      ...(() => { const pk = myChecks.find((k) => k.poi && k.poi.objId === P0.id); return { hasPending: !!pk, pendingLabel: pk ? '🎲 Roll it: ' + pk.stakes : '', rollPending: () => pk && this.setState({ dice: pk.id }) }; })(),
      noApproaches: !P0.approaches.length, cantExamine: spectating || !(myTurn && isNear) || apLeft(g, c) < 1,
      spectating, turnBanner: spectating && fChar ? fChar.name.toUpperCase() + '\'S TURN' : '', turnSub: spectating && fOwner ? fOwner.name + ' is looking at this. Close it to wait for the story to tell you what they do.' : '',
      turnBannerStyle: 'padding: 14px 18px; border-radius: 12px; text-align: center; font-size: 30px; font-weight: 700; letter-spacing: 0.16em; color: #0A0D13; background: ' + (fOwner?.color || '#FFFFFF'),
      examine: () => { act({ type: 'poi/examine', charId: c.id, objId: P0.id }); closeAnim(this, 'obj', () => this.setState({ objPanel: null })); },
      isExit: !!P0.to, cantTravel: spectating || !(myTurn && isNear) || apLeft(g, c) < 1, travel: () => { act({ type: 'poi/travel', charId: c.id, objId: P0.id }); closeAnim(this, 'obj', () => this.setState({ objPanel: null })); },
      isDoor: !!kindOf(P0).door, doorLabel: P0.open ? 'Close it' : 'Open it', cantDoor: spectating || !isNear || !!P0.locked || g.phase !== 'story' || !myTurn, door: () => act({ type: 'story/door', charId: c.id, objId: P0.id }),
      canWalk: !spectating && !!mover && !isNear, walk: () => { const [ox, oy] = P0.pos.split(',').map(Number), taken = new Set(Object.values(pos)); let best = null, bd = 1e9;
        for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) { const k = (ox + dx) + ',' + (oy + dy), d = myPos ? Math.abs(ox + dx - +myPos.split(',')[0]) + Math.abs(oy + dy - +myPos.split(',')[1]) : 0;
          if ((dx || dy || !kindOf(P0).blocks_move) && ox + dx >= 0 && oy + dy >= 0 && ox + dx < map.w && oy + dy < map.h && !solid.has(k) && !objs.some((o) => o.pos === k && blocksMove(o)) && !taken.has(k) && d < bd) { bd = d; best = k; } }
        if (best) act({ type: 'story/move', charId: mover.id, to: best }); else toast('No free tile next to it.'); },
      close: () => { if (spectating) { const seq = F.seq; return closeAnim(this, 'obj', () => this.setState({ dismissed: { ...(this.state.dismissed || {}), ['f' + seq]: true } })); }
        closeAnim(this, 'obj', () => { this.setState({ objPanel: null }); if (fMine) act({ type: 'story/unfocus' }); }); } } : null;
    // ---------- World Play 1.7: the panels (Talk, a hazard's ways through, an object's odds), near you, HERE, carried ----------
    const inkOf = (sk) => (SK[sk] ? ATTR[SK[sk].attr].ink : '#A3AEC2');
    const wBusy = !c ? 'You have no character here.' : c.dead || c.hp <= 0 ? c.name + ' can\'t act now.' : g.phase !== 'story' ? 'After the fight.' : g.story.await !== 'players' ? 'Wait for the round to open.'
      : (g.story.ended || {})[c.id] ? 'You ended your turn this round.' : g.checks.some((k) => !k.done && k.poi && k.charId === c.id) ? 'Roll your check first.' : '';
    if (objPanel && P0) {
      const rows = approachRows(g, P0.id, approachOptions(g, P0.id, c ? c.id : undefined), inkOf, '');
      objPanel.approaches = objPanel.approaches.filter((a) => !(P0.approaches[a.key] || {}).gone).map((a) => { const r = rows.find((x) => x.idx === a.key);
        return { ...a, odds: r ? r.odds : '', hasOdds: !!(r && r.hasOdds), oddsStyle: r ? r.oddsStyle : '', success: r ? r.success : '', fail: r ? r.fail : '', hasFail: !!(r && r.fail),
          label2: a.cant && r && r.hasWhy && !spectating ? (r.tried ? 'Tried' : a.label2) : a.label2, why: r && r.hasWhy && !r.tried ? r.why : '', hasWhy2: !!(r && r.hasWhy && !r.tried && a.cant) }; });
      const cv = isCacheV(P0), n = P0.itemCount ?? (P0.items || []).length;
      const mk = markVals(g, P0, c ? c.id : undefined); objPanel.isMark = !!mk; objPanel.mark = mk || {}; if (mk) objPanel.hasRules = false; // the mark section says the rule, with its numbers
      objPanel.isCache = cv; objPanel.holds = cv ? holdsText(n, P0.searched) : '';
      const sWhy = !cv ? '' : P0.searched || !n ? 'Nothing left.' : P0.locked ? 'Locked: open it with a way in first.' : spectating ? '' : !isNear ? 'Walk up to it first.' : wBusy || (apLeft(g, c) < 1 ? 'No AP left.' : '');
      objPanel.cantSearch = !cv || !!sWhy || spectating; objPanel.searchWhy = sWhy; objPanel.hasSearchWhy = !!sWhy && !spectating;
      objPanel.search = () => { if (c) act({ type: 'world/act', charId: c.id, act: 'search', objId: P0.id }); };
    }
    const tryRow = (r, targetId, kind) => ({ ...r, go: () => { if (!c) return;
      if (r.kind === 'ask') act({ type: 'talk/ask', charId: c.id, npcId: targetId, what: r.what });
      else if (kind === 'npc') { act({ type: 'talk/try', charId: c.id, npcId: targetId, idx: r.idx }); this.setState({ awaitPoi: targetId }); }
      else { act({ type: 'poi/try', charId: c.id, objId: targetId, idx: r.idx }); this.setState({ awaitPoi: targetId }); } } });
    const wpS = !inFight ? S.wp : null, wpT = wpS && wpS.t === 'npc' ? talkVals(g, wpS.id, c ? c.id : undefined, ART, inkOf, wBusy) : null, wpH = wpS && wpS.t === 'hazard' ? hazardVals(g, wpS.id, c ? c.id : undefined, inkOf, wBusy) : null;
    if (S.wp && !wpT && !wpH) queueMicrotask(() => this.setState({ wp: null }));
    const wpClose = () => closeAnim(this, 'wp', () => this.setState({ wp: null }));
    const wpPend = (() => { const id = wpT ? wpT.id : wpH ? wpH.id : null, pk = id ? myChecks.find((k) => k.poi && k.poi.objId === id) : null; return { hasPending: !!pk, pendingLabel: pk ? '🎲 Roll it: ' + pk.stakes : '', rollPending: () => pk && this.setState({ dice: pk.id }) }; })();
    const wp = wpT ? { open: true, isNpc: true, isHazard: false, name: wpT.name, kicker: wpT.kicker, hasImg: wpT.hasImg, img: wpT.img, noImg: !wpT.hasImg, badge: wpT.badge, glyph: '', glyphStyle: '', text: '', hasText: false,
        lines: [...(wpT.hasWants ? [{ key: 'w', text: wpT.wants }] : []), ...(wpT.hasHint ? [{ key: 'h', text: wpT.hint + ' (marked on the map)' }] : [])], rows: wpT.rows.map((r) => tryRow(r, wpT.id, 'npc')), none: wpT.none,
        noneText: 'Nothing to ask them right now. Type to them in the story instead.', canCarry: wpT.canCarry, cantCarry: !wpT.canCarry, hasCarry: wpT.canCarry || !!wpT.carryWhy, carryWhy: wpT.carryWhy, carryLabel: 'Carry ' + wpT.name + ' · 1 AP',
        carry: () => { if (c) act({ type: 'world/act', charId: c.id, act: 'carry', targetId: wpT.id }); wpClose(); }, head: 'TALK', ...wpPend, close: wpClose,
        zoom: zoomer(this, wpT.img, wpT.name, 'portrait'), sideStyle: wpT.sideStyle }
      : wpH ? { open: true, isNpc: false, isHazard: true, name: wpH.name, kicker: wpH.kicker, hasImg: false, img: '', noImg: false, badge: '', glyph: wpH.glyph, glyphStyle: wpH.glyphStyle, text: wpH.text, hasText: !!wpH.text,
        lines: [{ key: 'hit', text: wpH.hit }], rows: wpH.rows.map((r) => tryRow(r, wpH.id, 'hazard')), none: !wpH.hasRows, noneText: 'No way through known.', canCarry: false, cantCarry: true, hasCarry: false, carryWhy: '', carryLabel: '', carry: () => {}, head: 'WAYS THROUGH', ...wpPend, close: wpClose, zoom: () => {}, sideStyle: '' }
      : { open: false, rows: [], lines: [] };
    // Near you: people to talk to and carry, caches to search, hazards in sight, and the points of interest next to you.
    const nearW = nearItems(g, c && !inFight ? c.id : undefined, wBusy).map((x) => ({ key: x.key, label: x.label, sub: x.sub, hasSub: !!x.sub, off: x.off, title: x.why || x.label, style: x.style + (x.off ? '; opacity: 0.55; cursor: default' : ''),
      open: () => { if (x.off) return toast(x.why); if (!c) return;
        if (x.kind === 'npc') openTalk(x.id); else if (x.kind === 'hazard') openHazard(x.id);
        else if (x.kind === 'carry') act({ type: 'world/act', charId: c.id, act: 'carry', targetId: x.id });
        else if (x.kind === 'cache') act({ type: 'world/act', charId: c.id, act: 'search', objId: x.id });
        else if (x.kind === 'pile') { const o = (objs || []).find((y) => y.id === x.id); this.setState({ area: true, wAct: 'pickup', wTile: o ? o.pos : null, wTarget: null, wAim: null, wEvc: null }); } } }));
    const nearAll = [...nearW, ...nearby.filter((n) => !nearW.some((w) => w.key === 's' + n.key)).map((n) => ({ ...n, sub: '', hasSub: false, off: false, title: n.label, style: 'display: flex; flex-direction: column; align-items: flex-start; gap: 1px; width: 100%; min-height: 38px; padding: 6px 10px; border-radius: 8px; border: 1px solid #FFFFFF; background: transparent; color: #E7EBF3; font-family: inherit; font-size: 13px; text-align: left; cursor: pointer' }))];
    const here = !inFight ? hereVals(g) : { has: false, zone: '', day: '', rows: [] };
    const carried = carriedRows(c, ART).map((r) => ({ ...r, noImg: !r.hasImg, cantPut: !!wBusy || inFight || (c && apLeft(g, c) < 1), putWhy: inFight ? 'After the fight.' : wBusy || (c && apLeft(g, c) < 1 ? 'Needs 1 AP.' : ''),
      put: () => this.setState({ putDown: r.id, area: true, wAct: 'move' }), putNear: () => { if (c) act({ type: 'world/act', charId: c.id, act: 'put_down', targetId: r.id }); } }));
    const LL = loadLine(c);
    const pdHint = pdOn ? 'Put ' + ((c.carried || []).find((x) => x.npc.id === S.putDown)?.npc.name || 'them') + ' down: click a dashed tile next to you (1 AP).' + (pdSet.size ? '' : ' No free tile next to you.') : '';
    const mini = cellsFor(false, () => () => this.setState({ area: true }));
    const worldClick = (k) => () => {
      if (!mover) return toast(inFight ? 'A fight is on: act on the combat grid.' : 'You have no character to act with.');
      const u = tok[k];
      // Put down (World Play 1.7): the free tiles next to you are dashed; a click there puts the carried creature down.
      if (pdOn) { if (!pdSet.has(k)) return toast('Pick a free tile next to you (dashed white).'); act({ type: 'world/act', charId: c.id, act: 'put_down', targetId: S.putDown, to: k }); return this.setState({ putDown: null }); }
      if (isMagicW) return magicClick(k);
      if (pkTargeted) { if (!u || u.charId === mover.id) return toast('Click someone else.'); if (wPkE.target === 'ally' && u.side !== 'pc') return toast('Click an ally.'); return this.setState({ wTarget: u.id }); }
      if (pkTile) return this.setState({ wTile: k });
      if (W === 'pickup') { if (!pilesW.has(k)) return toast('Click a pile: the stack with a count.'); return this.setState({ wTile: k }); }
      if (pkObj) { const o = objAt[k]; if (!o || o.hidden) return toast('Click an object on the map.'); return this.setState({ wTarget: 'obj:' + o.id }); }
      if (TARGETED.includes(W)) {
        // Anyone and anything is a target (spec: Anyone is a target): people, allies, points of interest, objects.
        const attacking = ['shot', 'aimed', 'melee'].includes(W), o = objAt[k];
        if (W === 'stim') { if (!u || u.side !== 'pc') return toast('Click an ally.'); return this.setState({ wTarget: u.id }); }
        if (u && u.charId === mover.id) return toast('Pick someone else.');
        if (W === 'analyze') { if (!u || u.side !== 'foe') { if (readableAt(GLY, TRC, k, 'pc', (w) => !!(mover.sigils || []).includes(w), mover.id).length) return this.setState({ wTarget: 'read:' + k }); return toast('Click a person or enemy on the map, or a glyph or trace to read.'); } return this.setState({ wTarget: u.id }); }
        if (attacking && u) return this.setState({ wTarget: u.id });
        if (attacking && o && !o.hidden) { if (o.dead) return toast(o.name + ' is dead.'); return this.setState({ wTarget: 'obj:' + o.id }); }
        return toast('Click a person, an ally or an object.');
      }
      if (['move', 'sprint', 'sneak'].includes(W)) act({ type: 'world/act', charId: mover.id, act: 'move', to: k, how: W });
      if (W === 'drone') { const d = myDrone(); if (!d) return toast('Your drone is gone: rebuild it out of a fight.'); act({ type: 'world/act', charId: mover.id, act: 'move', to: k, how: 'move', unit: d.id }); }
      if (W === 'beast') { const b = myBeast(); if (!b) return toast('Your beast is gone.'); act({ type: 'world/act', charId: mover.id, act: 'move', to: k, how: 'move', unit: b.id }); }
      if (W === 'twin') { const t = myTwin(); if (!t) return toast('The twin isn\'t here: call it from the Class tab.'); act({ type: 'world/act', charId: mover.id, act: 'move', to: k, how: 'move', unit: t.id }); }
    };
    const areaCells = cellsFor(true, worldClick);
    // ---------- buffs and debuffs (the Status tab) ----------
    const fxList = (() => {
      if (!c) return [];
      const out = [], add = (name, text, bad) => out.push({ key: name + out.length, name, text, mark: bad ? '▼' : '▲',
        style: 'display: flex; flex-direction: column; gap: 2px; padding: 6px 8px; border-radius: 8px; border: 1px solid ' + (bad ? '#F65157' : '#2F6B3A') + '; background: ' + (bad ? 'rgba(246, 81, 87, 0.08)' : 'rgba(111, 234, 119, 0.06)'),
        headStyle: 'font-size: 11px; font-weight: 700; letter-spacing: 0.1em; color: ' + (bad ? '#F65157' : '#6FEA77') });
      const cu = inFight && cb ? cb.units.find((u) => u.charId === c.id) : null;
      if (cu) {
        effectsOf(cu).forEach(([n, t]) => add(n, t, !/WEAK POINT/.test(n)));
        if (cu.prone) add('PRONE', 'Harder to hit from range, easier up close; standing up costs 1 AP.', true);
        if (cu.braced) add('BRACED', 'Weapon set: steadier fire until you move.', false);
        if (cu.overwatch) add('OVERWATCH', 'Holding a shot for the first enemy that moves in sight.', false);
      } else {
        if (c.hp <= 0 && !c.dead) add('DOWNED', 'Can\'t act until an ally\'s stim or the Narrator gets you up.' + (c.downedFails ? ' Death saves failed: ' + c.downedFails + ' / 3.' : ''), true);
        (c.injuries || []).forEach((i) => add(((i.side ? i.side + ' ' : '') + i.loc).toUpperCase() + ' INJURED', injuryText[i.loc] || 'Injured.', true));
        if (ow > 0) add('OVERBURDENED', ow + ' kg over your carry limit: −' + Math.ceil(ow / 5) + ' Movement and no Sprint until you drop something.', true);
      }
      if ((g.story.sneak || {})[c.id] && !inFight) add((g.story.hidden || {})[c.id] ? 'HIDDEN' : 'SNEAKING · SEEN', (g.story.hidden || {})[c.id] ? 'Sneaking and unseen: an attack from here is an ambush.' : 'Sneaking, but a hostile has seen you. Move normally and sneak again to hide.', !(g.story.hidden || {})[c.id]);
      // Magic: conditions with rounds left, a shield, a held Outburst (spec: Conditions and saves).
      const MN = magicNow(g, c);
      for (const [id, n] of Object.entries(MN.conds)) if (n > 0) add(condName(id).toUpperCase(), n + (n === 1 ? ' round' : ' rounds') + ' left.', !['guarded', 'inspired'].includes(id));
      if (MN.shield > 0) add('SHIELD ' + MN.shield, 'Soaks up the next ' + MN.shield + ' damage.', false);
      if (MN.held) add('HOLDING AN OUTBURST', 'Stage ' + MN.held.stage + ': it grows each round (and adds Strain) until you release it.', false);
      if (MN.strain > 0) add('STRAIN ' + MN.strain + ' / ' + strainLimit(c), 'Past the limit, the heart shorts out. It eases by 1 after a round without casting and resets after a fight.', MN.strain >= strainLimit(c));
      const ss = songStateOf(g, c), mt = musicTraitOf(c);
      if (ss === 'on') add('SONG · ' + mt.name.toUpperCase(), String((mt.upsides || [])[0] || '+1 while your song plays.'), false);
      if (ss === 'off') add('SILENCE · ' + mt.name.toUpperCase(), String((mt.downsides || [])[0] || '−1: silent too long.'), true);
      const GEAR_FX = { dark_sight: ['NIGHT SIGHT', 'Darkness doesn\'t halve your sight.'], light: ['LIGHT', 'You light the tiles around you.'], armour_bonus: ['ARMOUR', '+{v} armour against every hit.'], defense_bonus: ['GUARD', '+{v} Defense.'],
        movement_bonus: ['QUICK', '+{v} Movement.'], carry_bonus: ['PACK', '+{v} kg carry.'], hazard_immune: ['SEALED', 'Immune to {h} hazards.'], ignore_difficult: ['SURE-FOOTED', 'Rough ground costs no extra.'], unarmed_damage_bonus: ['HEAVY HANDS', '+{v} unarmed damage.'] };
      for (const e of gearEffects(c)) { const d = GEAR_FX[e.op]; if (d) add(d[0], d[1].replace('{v}', e.value).replace('{h}', e.hazard || ''), false); }
      return out;
    })();
    // The overworld action panel (spec: Overworld rounds): the combat actions, the same AP, on the story's map.
    const wW = c ? WEAPON[c.weapon] : null, wMelee = wW ? isMelee(wW) : false, apNow = c ? apLeft(g, c) : 0, mv = c ? movement(c) : 1;
    const sneaking = !!(c && (g.story.sneak || {})[c.id]), hiddenNow = sneaking && !!(g.story.hidden || {})[c.id];
    const tgtObj = S.wTarget && S.wTarget.startsWith('obj:') ? objs.find((o) => o.id === S.wTarget.slice(4)) : null;
    const tgt = S.wTarget ? (tgtObj ? { id: S.wTarget, name: tgtObj.name, obj: tgtObj, side: 'obj', person: isPersonObj(g, tgtObj) } : units.find((u) => u.id === S.wTarget)) : null;
    // Weapon-granted and item actions come from the engine (plan 2.9, 2.7): what the weapon grants, and perk, trait and
    // class actions usable on the map (scope 'world'), each with the engine's reason when it can't be used now.
    const wu = c && !inFight && mover ? sU(scb()) : null;
    const wWa = wu ? weaponActions(wu) : null, wWA = (id) => (wWa ? wWa.find((x) => x.id === id) : null);
    const wPk = wu ? perkEntries(g, scb(), wu, c, 'world') : [], wPkSel = parsePk(W), wPkE = wPkSel ? wPk.find((e) => e.id === wPkSel.id && e.actionId === wPkSel.actionId) || null : null;
    const wKlass = classOf(c);
    // Rules 1.9: a magazine gun's two reloads (speed: the magazine drops into the pile here; tactical: it goes in the pack) at the engine's costs.
    const W_UTIL = wWa ? [...reloadItems(wu), ...['load', 'clear', 'repair'].map((id) => wWA(id)).filter(Boolean).map((a) => [a.id, a.label, a.ap + ' AP']), ...reloadBothItems(wu)].map((a) => [a[0], a[1], String(a[2]).replace(/ · the \w+ drops?$/, ' · drops').replace(/ · the \w+ goe?s? in your pack$/, ' · to your pack')]) // the narrow panel: short words (the hint says the rest)
      : [['reload', 'Reload', '2 AP'], ['load', 'Load a magazine', 'AP by rounds'], ['clear', 'Clear a jam', '2 AP'], ['repair', 'Field Repair', '2 AP']];
    const W_ITEMS = [
      ['MOVEMENT', [['move', 'Move', '1 AP / ' + mv + (mv === 1 ? ' tile' : ' tiles')], ['sprint', 'Sprint', '2 AP · ' + Math.floor(3 * mv) + ' tiles'], ['sneak', 'Sneak', '+1 AP a tile'],
        ...(myDrone() ? [['drone', 'Move the drone', myDrone().ap + ' AP left']] : []), ...(myBeast() ? [['beast', 'Move the beast', myBeast().ap + ' AP left']] : []), ...(myTwin() ? [['twin', 'Move the twin', myTwin().ap + ' AP left']] : [])]],
      ['ATTACK & DEFEND', [...(wW && !wMelee ? [['shot', 'Shot', attackApCost(wW, 'shot') + ' AP'], ['aimed', 'Aimed shot', attackApCost(wW, 'aimed') + ' AP']] : []), ['melee', wMelee ? 'Strike' : wW && wW.id !== 'fists' ? 'Strike (weapon\'s butt)' : 'Strike (bare hand)', (wW && wMelee ? attackApCost(wW, 'melee') : 2) + ' AP'], ['analyze', 'Analyze', '2 AP']]],
      ['UTILITY', [...W_UTIL, ['pickup', 'Pick up', PICKUP_AP + ' AP'], ['stim', 'Stim an ally', '1–2 AP'], ['prone', 'Drop prone / stand', '1 AP']]],
      ...(wPk.some((e) => e.tab === 'perks') ? [['PERKS & TRAITS', wPk.filter((e) => e.tab === 'perks').map((e) => [pkId(e), e.label, pkCost(e)])]] : []),
      ...(wPk.some((e) => e.tab === 'class') ? [['CLASS · ' + (wKlass ? wKlass.name.toUpperCase() : 'MOVES'), wPk.filter((e) => e.tab === 'class').map((e) => [pkId(e), e.label, pkCost(e)]), wKlass ? wKlass.ink : null]] : []),
      // Magic, only for those who have it: Sigils in cyan, Outbursts in violet (never mixed).
      ...(hasMagic && (myWords.length || evoW) ? [['MAGIC · SIGILS', [['draw', 'Draw a glyph', glyphAp(c) + ' AP'], ['evoke', 'Evoke', '1 AP'], ['scuff', 'Scuff', '1 AP'], ['vent', 'Vent Flux', '1 AP'], ['core', 'Swap core', '2 AP']], SIG_CYAN]] : []),
      ...(hasMagic && (myDesigns.length || MN.held || emaW) ? [['MAGIC · OUTBURSTS', [...(myDesigns.length && !MN.held ? [['outburst', 'Outburst', 'Begin ' + (() => { const aps = myDesigns.map((d) => (d.modules || []).includes('swift') ? 1 : 2), lo = Math.min(...aps), hi = Math.max(...aps); return (lo === hi ? lo : lo + '–' + hi); })() + ' · Snap +1']] : []),
        ...(MN.held ? (() => { const x = scb(), uu = sU(x), hp0 = x && uu ? heartPanel(x, uu) : null; return [['pump', 'Pump · stage ' + MN.held.stage, hp0 ? hp0.pump.cost : '1 AP'], ['release', 'Release', hp0 ? hp0.release.cost : '1 AP'], ['steady', 'Steady the heart', '1 AP'], ['letgo', 'Let it go' + (hp0 && hp0.letgo.strainOff ? ' · −' + hp0.letgo.strainOff + ' Strain' : ''), 'free'],
          ...(hp0 && hp0.feedShow ? [['feed', 'Feed the glyph', '1 AP']] : []), ['heartwatch', MN.held.watch ? 'Heart Overwatch · armed' : 'Heart Overwatch', 'free']]; })() : []),
        ...(emaW ? [['syphon', 'Syphon', '1 AP'], ['crystallise', 'Crystallise', '3 AP']] : [])], SOUL_VIOLET]] : []),
    ];
    const canAct = !!mover && mover.hp > 0 && g.story.await === 'players' && !(g.story.ended || {})[c.id];
    const wGroups = W_ITEMS.map(([name, items, ink]) => ({ name, style: 'margin-top: 4px; font-size: 11px; font-weight: 700; letter-spacing: 0.16em; color: ' + (ink || '#A3AEC2'), items: items.map(([id, label, cost]) => ({ key: id, name: label, cost, locked: !canAct, pressed: W === id ? 'true' : 'false',
      pick: () => this.setState({ wAct: id, wTarget: null, wTile: null, wAim: null, wEvc: null }),
      style: 'display: flex; justify-content: space-between; align-items: center; gap: 8px; min-height: 36px; padding: 0 10px; border-radius: 8px; font-family: inherit; font-size: 13px; cursor: pointer; color: #E7EBF3; ' + (W === id ? 'border: 1px solid #E7EBF3; background: #1C2536' : 'border: 1px solid #232D3F; background: #10151F') })) }));
    const pkTargeted = !!wPkE && ['unit', 'enemy', 'ally', 'npc'].includes(wPkE.target);
    const pkTile = !!wPkE && wPkE.target === 'tile', pkObj = !!wPkE && wPkE.target === 'object';
    const wDet = wPkE && S.wDetailFor === W ? String(S.wDetail || '').trim() : '';
    const isAttack = ['shot', 'aimed', 'melee'].includes(W), instant = ['reload', RELOAD_TAC, 'reload2', RELOAD2_TAC, 'load', 'clear', 'repair', 'prone'].includes(W) || (!!wPkE && !pkTargeted && !pkTile && !pkObj && !wPkE.why);
    const wHint = wPkE && mover && canAct ? (wPkE.why ? wPkE.why : (pkTargeted ? (tgt ? 'Target: ' + tgt.name + '. ' : wPkE.target === 'ally' ? 'Click an ally. ' : 'Click someone on the map. ') : pkTile ? (S.wTile ? 'Tile ' + refOf(S.wTile) + '. ' : 'Click a tile. ') : pkObj ? (tgt && tgt.obj ? 'Target: ' + tgt.name + '. ' : 'Click an object. ') : '') + pkText(wPkE) + ' Confirm to use it.') : !mover ? 'You have no character to act with.' : mover.hp <= 0 ? mover.name + ' is Downed: an ally\'s stim' + (SB ? '' : ', or the Narrator,') + ' gets them up. End turn when ready.' : !canAct ? (g.story.await !== 'players' ? 'Wait for the round to open.' : 'Your turn is over this round.')
      : W === 'drone' ? 'Click an open tile: the drone flies there on its own AP (3 a round). The Narrator says what it sees.'
      : W === 'beast' ? 'Click an open tile: the beast goes there on its own AP (4 a round). Other orders out of a fight are Empathy checks the Narrator calls.'
      : W === 'twin' ? 'Click an open tile: the twin goes there on its own AP (4 a round), never more than 6 tiles from you.'
      : ['move', 'sprint', 'sneak'].includes(W) ? 'Click an open tile.' + (W === 'sneak' ? ' Sneaking hides you until a hostile notices you (Ingenuity to stay hidden).' : '')
      : isMagicW ? mHint
      : W === 'analyze' && readT ? 'Read ' + readableAt(GLY, TRC, readT, 'pc', knowsW, c && c.id).map((x) => (knowsW(x.word) ? x.word.toUpperCase() : 'the') + (x.trace ? ' trace' : ' glyph')).join(' and ') + ' at ' + refOf(readT) + ' (2 AP): +2 study for each, and the word goes on your known-to-study list.'
      : TARGETED.includes(W) ? (tgt ? (W === 'stim' ? 'Stim ' + tgt.name + '.' : W === 'analyze' ? 'Read ' + tgt.name + ': its HP and armour, for everyone.' : (tgt.obj ? 'Attack ' + (tgt.person ? tgt.name + ': a person; this starts a fight.' : 'the ' + tgt.name.toLowerCase() + (tgt.obj.hp != null ? ' (' + tgt.obj.hp + ' HP).' : ': the Narrator rules what happens.')) : tgt.side === 'pc' ? 'FRIENDLY FIRE: you are attacking ' + tgt.name + '. It resolves on the map; no fight starts. Confirm if you mean it.' : 'Attack ' + tgt.name + ': this starts a fight. ' + (hiddenNow ? 'You are hidden: an ambush, your turn first' + ' (from its front: Ingenuity first).' : 'You are seen: you act from round 2.'))) : W === 'stim' ? 'Click an adjacent ally.' : 'Click a person or enemy on the map.')
      : W === 'pickup' ? (!wPick ? (pilesW.size ? 'Nothing on the ground next to you. Click a pile (the stack with a count) to see the way there.' : 'Nothing on the ground in sight.')
        : dist(myAt, wPick.pos) > 1 ? 'The pile at ' + refOf(wPick.pos) + ' is ' + dist(myAt, wPick.pos) + ' tiles away: walk next to it first. ' + (crossesText(plan.pile && plan.pile.crosses) || 'The way there crosses no known hazard.')
        : wPickWhy || pickupLabel(wPick, wUntick) + ' from ' + (wPick.pos === myAt ? 'your tile' : refOf(wPick.pos)) + '. Untick what to leave on the ground.')
      : 'Confirm to ' + ({ reload: wWA('reload') && wWA('reload').tactical ? 'speed-reload: the magazine in the gun drops into the pile here' : 'reload', [RELOAD_TAC]: 'reload tactically: the magazine in the gun goes back in your pack', reload2: 'reload both guns', [RELOAD2_TAC]: 'reload both guns tactically', load: 'load loose rounds into a magazine', clear: 'clear a jam', repair: 'repair your weapon', prone: (c && c.prone ? 'stand up' : 'drop prone') }[W]) + '.';
    // The area map's pick for an on-map perk action (Called Shot's head / arm / leg, a Keystone's word): chips from the
    // engine's options, never typed. An off-map action picked here opens its own panel (wPanel, below).
    const wDetailVals = (() => {
      if (!wPkE || !(pkTargeted || pkTile || pkObj) || !(wPkE.options || []).length) return { wHasDetail: false, wDetailOpts: [], wHasDetailOpts: false };
      const multi = (wPkE.pickMulti || 1) > 1, chosen = new Set(String(wDet ? pickChoice(wPkE, wDet) : '').split(' ').filter(Boolean)), setDet = (v) => this.setState({ wDetail: v, wDetailFor: W });
      const opts = (wPkE.options || []).map((o) => ({ key: o.id, label: o.label, pressed: chosen.has(o.id) ? 'true' : 'false',
        pick: () => { if (!multi) return setDet(chosen.has(o.id) ? '' : o.label); const now = [...chosen], next = chosen.has(o.id) ? now.filter((x) => x !== o.id) : [...now, o.id].slice(-(wPkE.pickMulti || 1)); setDet(next.map((id) => (wPkE.options.find((p) => p.id === id) || { label: id }).label).join(' ')); },
        style: 'min-height: 30px; padding: 0 10px; border-radius: 999px; font-family: inherit; font-size: 12px; font-weight: 700; cursor: pointer; ' + (chosen.has(o.id) ? 'border: 1px solid #FFFFFF; background: #1C2536; color: #FFFFFF' : 'border: 1px solid #2E3A50; background: transparent; color: #A3AEC2') }));
      return { wHasDetail: true, wDetailLabel: wPkE.pickLabel || 'Pick', wDetailOpts: opts, wHasDetailOpts: opts.length > 0 };
    })();
    const tgtPos = tgt ? (tgt.obj ? tgt.obj.pos : tgt.pos) : null, tgtOdds = isAttack && tgtPos && plan.selText ? plan.selText(tgtPos) : '';
    const wHintFull = wHint + (tgtOdds ? ' ' + tgtOdds : '');
    // The Pick up checklist (rules 1.9): every entry ticked to start; untick what to leave.
    const wPileVals = (() => {
      if (!wPick || !canAct) return { has: false, rows: [] };
      const rows = pileRows(wPick, wUntick), tile = wPick.pos, far = dist(myAt, tile) > 1, setKeys = (keys) => this.setState({ wUntick: { tile, keys } });
      return { has: true, head: 'THE PILE AT ' + refOf(tile) + ' · ' + rows.length + (rows.length === 1 ? ' THING' : ' THINGS') + (far ? ' · OUT OF REACH' : ''),
        rows: rows.map((r) => ({ ...r, off: far, icon: far ? r.iconOff : r.icon, toggle: () => setKeys(toggleUntick(wUntick, r.key)) })), all: () => setKeys([]), none: () => setKeys(rows.map((r) => r.key)) };
    })();
    const wConfirm = () => { if (!c) return; if (isMagicW) return magicConfirm();
      if (wPkE && wPanel) return wPanel.confirm();
      if (wPkE) { if (pkTargeted && !tgt) return; if (pkTile && !S.wTile) return toast('Click a tile first.'); if (pkObj && !(tgt && tgt.obj)) return toast('Click an object first.');
        act({ type: 'world/act', charId: c.id, act: 'perk', id: wPkE.id, actionId: wPkE.actionId, ...(pkTargeted && tgt ? { targetId: tgt.npc ? tgt.id : tgt.charId || tgt.id } : {}), ...(pkTile ? { tile: S.wTile } : {}), ...(pkObj && tgt && tgt.obj ? { objId: tgt.obj.id } : {}), ...(wDet ? { choice: pickChoice(wPkE, wDet) } : {}) });
        if (wDet) this.setState({ wDetail: '' }); return; }
      if (W === 'pickup') { if (!wPick || wPickWhy) return; const take = pileTake(wPick, wUntick); act({ type: 'world/act', charId: c.id, act: 'pickup', tile: wPick.pos, ...(take ? { take } : {}) }); return this.setState({ wUntick: null, wTile: null }); }
      if (W === RELOAD_TAC || W === 'reload2' || W === RELOAD2_TAC) return act({ type: 'world/act', charId: c.id, act: 'reload', ...(W === RELOAD_TAC || W === RELOAD2_TAC ? { tactical: true } : {}), ...(W === 'reload2' || W === RELOAD2_TAC ? { hand: 'both' } : {}) });
      if (W === 'analyze' && readT) { act({ type: 'world/act', charId: c.id, act: 'read', tile: readT }); return this.setState({ wTarget: null }); } if (TARGETED.includes(W)) { if (!tgt) return; const fight = isAttack && tgt.side !== 'pc' && (!tgt.obj || tgt.person);
        act({ type: 'world/act', charId: c.id, act: isAttack ? 'attack' : W, mode: isAttack ? W : undefined, ...(tgt.obj ? { objId: tgt.obj.id } : { targetId: tgt.npc ? tgt.id : tgt.charId }) }); this.setState({ wTarget: null, ...(fight ? { area: false } : {}) }); if (fight && getState().game.phase === 'combat') go('combat'); return; } if (instant) act({ type: 'world/act', charId: c.id, act: W }); };
    const regions = [];
    const storyPk = g.phase === 'story' && c && !c.dead ? storyPerkEntries(g, c) : [];
    // ---------- story and area-map uses of perks, traits and class moves, on their sheet cards ----------
    // The story's (story/perk) and the area map's that the story doesn't take (world/act perk); the Proving Ground has no
    // story, so only the area map's there. Each shows the engine's reason when it can't be used now ("Used until the next rest").
    const usablePk = !c || c.dead || g.phase !== 'story' ? [] : SB ? wPk.map((e) => ({ e, how: 'world' }))
      : [...storyPk.map((e) => ({ e, how: 'story' })), ...wPk.filter((e) => !(e.scope || []).includes('story')).map((e) => ({ e, how: 'world' }))];
    const ON_MAP = ['unit', 'enemy', 'ally', 'tile', 'object'];
    const runPk = (e, how, args) => { if (!c) return;
      act(how === 'world' ? { type: 'world/act', charId: c.id, act: 'perk', id: e.id, actionId: e.actionId, ...args } : { type: 'story/perk', charId: c.id, id: e.id, actionId: e.actionId, ...args });
      this.setState({ pkOpen: null, pkForm: null, ...(S.wAct && parsePk(S.wAct) ? { wAct: null } : {}) }); };
    /** The engine's verdict on the action with these args (the same truth the reducer uses). */
    const pvOf = (e, how, args) => { const was = bindGame(g);
      try { return how === 'world' ? previewPerkAction({ u: wu, c, cb: scb(), g }, e.id, { ...args, actionId: e.actionId }, 'world') : previewPerkAction({ c, g }, e.id, { ...args, actionId: e.actionId }, 'story'); }
      catch (err) { return { ok: false, why: String((err && err.message) || err), lines: [] }; } finally { bindGame(was); } };
    const verbOf = (e) => (/^[a-z]+$/.test(e.actionId) ? e.actionId.charAt(0).toUpperCase() + e.actionId.slice(1) : e.label);
    const pkBtn = (on, off) => 'min-height: 30px; padding: 0 12px; border-radius: 999px; font-family: inherit; font-size: 12px; font-weight: 700; cursor: ' + (off ? 'default; opacity: 0.45; ' : 'pointer; ') + (on ? 'border: 1px solid #FFFFFF; background: #1C2536; color: #FFFFFF' : 'border: 1px solid #2E3A50; background: #10151F; color: #E7EBF3');
    const soulChip = (on, off) => chipStyle(SOUL_VIOLET, on) + (off ? '; opacity: 0.45; cursor: default' : '');
    /** One action's button and, when open, its picker (game/actionPickers.ts): chips from the engine's data, the party,
     *  the people on the map, a Soul design builder, and a prose box only where the action needs words; the engine's
     *  verdict; Confirm. where: 'card', 'strip' or 'area' (the area map's panel, open while the action is picked). */
    const pkView = ({ e, how }, where) => {
      const key = where + ':' + pkId(e), open = where === 'area' || S.pkOpen === key;
      const why = e.why || (how === 'world' && !SB && !canAct ? (g.story.await !== 'players' ? 'Wait for the round to open.' : 'Your turn is over this round.') : null);
      const onMap = ON_MAP.includes(e.target), px = { g, c, how }, P = onMap ? null : pickerFor(e, px), needs = !!P;
      const formV = () => (this.state.pkForm && this.state.pkForm.key === key ? this.state.pkForm.v : {});
      const V = open ? formV() : {}, setV = (patch) => this.setState({ pkForm: { key, v: { ...formV(), ...patch } } });
      const single = !!P && !P.build && P.fields.length === 1 && P.fields[0].kind === 'chips' && P.fields[0].key === 'choice' && P.fields[0].options.length <= 12;
      const fields = open && P ? P.fields.map((f) => {
        if (f.kind === 'chips') {
          const ids = Array.isArray(V[f.key]) ? V[f.key] : [], multi = f.multi || 1;
          const opts = f.options.map((o) => { const on = ids.includes(o.id), pv = single && !why ? pvOf(e, how, { choice: o.id }) : null, off = !!(pv && !pv.ok && !on);
            return { key: o.id, label: o.label, title: off ? pv.why : o.title || '', pressed: on ? 'true' : 'false', locked: off, style: pkBtn(on, off),
              pick: () => { if (off) return toast(pv.why); const now = Array.isArray(formV()[f.key]) ? formV()[f.key] : []; setV({ [f.key]: now.includes(o.id) ? now.filter((y) => y !== o.id) : multi > 1 ? [...now, o.id].slice(-multi) : [o.id] }); } }; });
          return { key: f.key, head: f.head + (multi > 1 ? ' (up to ' + multi + ')' : ''), isChips: true, opts, isEmpty: !opts.length, emptyText: f.empty || 'Nothing to pick.', isProse: false, isDesigns: false, slots: [] };
        }
        if (f.kind === 'prose') return { key: f.key, head: f.head, isChips: false, opts: [], isEmpty: false, isProse: true, isDesigns: false, slots: [], text: V[f.key] || '', holder: f.holder, max: f.max || 240, onText: (ev) => setV({ [f.key]: ev.target.value }) };
        // A Soul design builder (the MAGIC tab's workshop rules, 1.5: a school and its option, a second school on the same
        // side with its own option at Will Power 5, a tone, one shape, modules up to the slots; the verdict with both effects).
        const ds = draftsOf(V[f.key], f.n), mana = g.story.mana ?? MANA_START;
        const upd = (i, what, id) => { const cur = draftsOf(formV()[f.key], f.n).map((d) => ({ ...d, modules: [...d.modules] })); cur[i] = pickInDraft(c, cur[i], what, id, f.extra); setV({ [f.key]: cur }); };
        const slots = ds.map((d, i) => { const sv = designSlotView(c, d, f.extra), dd = d.school ? { id: 'draft', ...cleanDesign(d) } : null, vd = dd ? designVerdict(soulM(c), dd, mana) : null;
          return { key: 's' + i, head: (f.n > 1 ? f.head + ' ' + (i + 1) : f.head).toUpperCase(),
            schools: sv.schools.map((o) => ({ key: o.id, label: o.label, title: o.title, pressed: d.school === o.id ? 'true' : 'false', locked: false, style: soulChip(d.school === o.id), pick: () => upd(i, 'school', o.id) })),
            noSchools: !sv.schools.length, hasSchools2: sv.schools2.length > 0, schools2: sv.schools2.map((o) => ({ key: o.id, label: '+ ' + o.label, title: 'A second school (Will Power 5): a rider at half, on the same side as the first', pressed: d.school2 === o.id ? 'true' : 'false', locked: false, style: soulChip(d.school2 === o.id), pick: () => upd(i, 'school2', o.id) })),
            hasOptions: sv.options.length > 0, options: sv.options.map((o) => ({ key: o.id, label: o.label, title: '', pressed: d.option === o.id ? 'true' : 'false', locked: false, style: soulChip(d.option === o.id), pick: () => upd(i, 'option', o.id) })),
            hasOptions2: sv.options2.length > 0, options2: sv.options2.map((o) => ({ key: o.id, label: o.label, title: 'The second school\'s option (half strength)', pressed: d.option2 === o.id ? 'true' : 'false', locked: false, style: soulChip(d.option2 === o.id), pick: () => upd(i, 'option2', o.id) })),
            hasTones: sv.tones.length > 1, tones: sv.tones.map((t) => { const on = (d.tone || 'raw') === t.id; return { key: t.id, label: t.label, title: t.title, pressed: on ? 'true' : 'false', locked: !t.can, style: soulChip(on, !t.can), pick: () => (t.can ? upd(i, 'tone', t.id) : toast('Learn the ' + t.label + ' tone first (a teacher or a plate).')) }; }),
            hasShapes: sv.shapes.length > 1, shapes: sv.shapes.map((o) => { const on = sv.shape === o.id; return { key: o.id || 'bolt', label: o.label + (o.id ? ' ' + signed(o.cost) : ''), title: o.title, pressed: on ? 'true' : 'false', locked: o.off, style: soulChip(on, o.off), pick: () => upd(i, 'shape', o.id) }; }),
            modsHead: 'MODULES · ' + d.modules.length + ' / ' + sv.slots + (sv.shape ? ' (the shape takes one)' : ''), hasModules: sv.modules.length > 0,
            modules: sv.modules.map((o) => { const on = d.modules.includes(o.id); return { key: o.id, label: o.label + ' ' + signed(o.cost), title: o.title, pressed: on ? 'true' : 'false', locked: o.off, style: soulChip(on, o.off), pick: () => (o.off && /Size needs/.test(o.title) ? toast('Size needs a shape.') : upd(i, 'module', o.id)) }; }),
            name: d.name || '', onName: (ev) => upd(i, 'name', ev.target.value), nameHolder: 'Name (optional)',
            cost: dd ? designCost(soulM(c), dd, mana) + ' MP · ' + designAp(soulM(c), dd) + ' AP · ' + reachWords(soulM(c), dd) : 'Pick a school.',
            hasVerdict: !!vd, effects: vd ? vd.effects : '', rider: vd ? vd.rider : '' }; });
        return { key: f.key, head: '', isChips: false, opts: [], isEmpty: false, isProse: false, isDesigns: true, slots };
      }) : [];
      const built = open && P ? buildArgs(P, V, px) : null, pv = built && typeof built !== 'string' && !why ? pvOf(e, how, built) : null;
      const ready = !!pv && pv.ok, line = pv ? (pv.ok ? (pv.lines || []).join(' ') : pv.why || 'Not now.') : typeof built === 'string' ? built : '';
      const chosen = open && P ? P.fields.filter((f) => f.kind === 'chips').flatMap((f) => (Array.isArray(V[f.key]) ? V[f.key] : []).map((id) => (f.options.find((o) => o.id === id) || { label: id }).label)) : [];
      return { key, label: verbOf(e) + (onMap ? ' on the map…' : needs ? '…' : ''), aria: e.label + (needs ? ': choose, then confirm' : ''), title: (why ? why + ' · ' : '') + pkText(e), off: !!why, why: why || '', hasWhy: !!why, open: open && !why && needs, needs,
        click: () => { if (why) return toast(why); if (onMap) return this.setState({ area: true, wAct: pkId(e), wTarget: null, wTile: null, wAim: null }); if (needs) return this.setState({ pkOpen: S.pkOpen === key ? null : key, pkForm: null }); runPk(e, how, {}); },
        style: 'min-height: 30px; padding: 0 12px; border-radius: 8px; font-family: inherit; font-size: 12px; font-weight: 700; cursor: pointer; ' + (why ? 'border: 1px dashed #2E3A50; background: transparent; color: #7F8BA1' : open ? 'border: 1px solid #FFFFFF; background: #1C2536; color: #FFFFFF' : 'border: 1px solid #FFFFFF; background: transparent; color: #FFFFFF'),
        pickHead: P ? P.head : '', hint: P ? P.hint || '' : '', hasHint: !!(P && P.hint), warn: P ? P.warn || '' : '', hasWarn: !!(P && P.warn), fields, opts: (fields.find((f) => f.isChips) || { opts: [] }).opts, hasOpts: !!(P && P.fields.some((f) => f.kind === 'chips')),
        verdict: line, hasVerdict: !!line, verdictStyle: 'font-size: 12px; line-height: 1.4; color: ' + (ready ? '#6FEA77' : '#A3AEC2'),
        confirm: () => { if (typeof built === 'string') return toast(built); if (!ready) return toast(line || 'Not now.'); runPk(e, how, built); },
        cantConfirm: !ready, confirmLabel: ready ? 'Confirm' + (chosen.length ? ' · ' + chosen.join(' · ').toUpperCase().slice(0, 40) : '') : 'Confirm',
        cancel: () => this.setState({ pkOpen: null, pkForm: null, ...(where === 'area' ? { wAct: null } : {}) }) };
    };
    const actsOf = (key) => { const L = usablePk.filter((x) => x.e.id === key).map((x) => pkView(x, 'card')); return { acts: L, hasActs: L.length > 0 }; };
    for (const k of perks) Object.assign(k, actsOf('perk:' + k.key));
    for (const t of traits) Object.assign(t, actsOf('trait:' + t.key));
    for (const m of classMoves) Object.assign(m, m.locked ? { acts: [], hasActs: false } : actsOf(m.key));
    // The Perks strip: the same actions; one with a pick opens its chips under the strip.
    const stripPk = usablePk.map((x) => ({ x, v: pkView(x, 'strip') })), stripOpen = stripPk.find((y) => y.v.open);
    // The area map: an off-map action picked from its list (Manifest the twin, a prose action) opens its picker there.
    const wPanelV = wPkE && !ON_MAP.includes(wPkE.target) ? pkView({ e: wPkE, how: 'world' }, 'area') : null, wPanel = wPanelV && wPanelV.needs ? wPanelV : null;
    // ---------- rest (spec: Rest): the host calls it, a player asks for it (the Narrator can grant one too) ----------
    const restWhy = g.phase === 'lobby' ? 'The session hasn\'t started.' : g.phase !== 'story' ? 'No resting in a fight: win it, or get out of it, first.' : !isHost && g.story.await !== 'players' ? 'Wait for the round to open.' : !isHost && !c ? 'You have no character to ask with.' : '';
    const restVals = { restLabel: isHost ? 'Rest…' : 'Ask for a rest…', restOff: !!restWhy, restTitle: restWhy || (isHost ? 'Call a short or a long rest for the party, or start the next session' : 'Ask the Narrator for a rest: your request goes in the story'),
      restOpen: !!S.restOpen && !restWhy, toggleRest: () => this.setState({ restOpen: !S.restOpen }), restPressed: S.restOpen ? 'true' : 'false',
      restOpts: ['short', 'long'].map((k) => ({ key: k, label: (isHost ? '' : 'Ask for a ') + (k === 'short' ? (isHost ? 'Short rest' : 'short rest') : (isHost ? 'Long rest' : 'long rest')), text: REST_INFO[k] + '.',
        pick: () => { if (isHost) act({ type: 'rest', kind: k }); else act({ type: 'story/ask-rest', charId: c.id, kind: k }); this.setState({ restOpen: false }); } }))
        // Rules 1.6.1 (item 721): the host ends the session here and the next one starts in the same room.
        .concat(isHost && !g.sandbox ? [{ key: 'session', label: 'Next session', text: 'End session ' + (g.sessionN || 1) + ' and start session ' + ((g.sessionN || 1) + 1) + ': everyone recovers as after a long rest (not a day), Echo is back to 1, and once-a-session things start over (rites, the Miracle, the faith caps, grudges).',
          pick: () => { act({ type: 'session/next' }); this.setState({ restOpen: false }); } }] : []) };
    const u = g.narrator.usage, host = playerOf(g.hostId);

    return {
      ...epccgVals(this), ...lightboxVals(this), code: g.code, withNarrator: !SB, report: openReport,
      // The header (UI pass): the shell's cluster (room, Save, ⚙, ⚑, Leave), the Narrator chip and its menu, and the
      // Area map / Back to the fight button (screens/shell.js).
      ...shellVals(this, 'main'), ...narratorVals(this, g, { openArea: () => this.toggleArea(true) }),
      isHost, toCombat: () => { if (g.combat) go('combat'); }, noCombat: !g.combat,
      narrError: !!err, narrErrorText: (err || '') + (isHost ? '' : ' Ask ' + host.name + ' to retry.'),
      thinking: busy, thinkingText: 'The Narrator is writing…', narratorImg: IMG['wick-narrator-placeholder'],
      echoV, barsA, barsB, echo, pc, multi: mine.length > 1, myChars, bars, tabs, coreTabs, sheetSkills, tabSkills: S.tab === 'skills', tabStatus: S.tab === 'status', tabPerks: S.tab === 'perks', tabGear: S.tab === 'gear', tabBio: S.tab === 'bio', tabMagic: S.tab === 'magic', mg: magicVals(this, g, c), tabArms: S.tab === 'arms', ar: S.tab === 'arms' ? armsTabVals(this, g, c) : { has: false }, tabFaith: S.tab === 'faith', fa: S.tab === 'faith' ? faithTabVals(this, g, c) : { has: false },
      zoomPc: () => this.setState({ card: true }), cardOpen: !!S.card && !!c, closeCard: () => closeAnim(this, 'card', () => this.setState({ card: false })), cardCls: modalCls(this, 'card'), zoomPcBig: zoomer(this, pc.img, pc.name, 'portrait'),
      fx: fxList, noFx: !fxList.length, canLevel: !!lvlUp, toLevelUp: () => go('levelup', { levelupChar: c.id }), levelLabel: c && c.level >= 3 && !c.classId ? '★ Earn your class' : 'Level up · spend points',
      status, rep, statusFig, injuries, noInjuries: !injuries.length, hpLine: c ? c.hp + ' / ' + hpMax + ' HP' + (c.dead ? ' · DEAD' : '') : '', traits, noTraits: !traits.length, perks, noPerks: !perks.length, classMoves, hasClass: !!classHead, classHead: classHead || {}, mp, hasMp: !!top, gear, gearFig, slots, rig, hands, bodySlots, rigView: packView, plotView, hasPlot: plotView.length > 0, tipOpen: !!tipCard, tipCard: tipCard || { lines: [] }, noRig: !packView.length, backpackImg: '',
      canLoad, cantLoad: !canLoad || g.phase === 'combat', loadMags: () => act({ type: 'gear/load', charId: c.id }),
      load: c ? 'Carrying ' + KG.total + ' kg of ' + lim + ' kg' + (over ? ' · OVER THE LIMIT' : '') + ' (weapon ' + kg(KG.weapon) + ', armour ' + kg(KG.armour) + ', pack ' + kg(KG.pack) + ')' : '', loadStyle: 'font-size: 12px; color: ' + (over ? '#F65157' : '#A3AEC2'), eoe: { locked: true, why: 'Cracking needs Mastery 2 in Brain Power with an Evoker, or Will Power with an Emanator.' },  bio,
      hero, stream, pushes,
      hasChecks: actions.length > 0, actions, waitRolls, hasWaitRolls: waitRolls.length > 0,
      dice: !!ck, roll, diceCls: modalCls(this, 'dice'),
      closeDice: () => { const id = ck && ck.id; if (watching) return closeAnim(this, 'dice', () => this.setState({ dismissed: { ...(this.state.dismissed || {}), ['k' + id]: true } }));
        const accept = !!(ck && ck.roll && !ck.done); closeAnim(this, 'dice', () => { if (this.state.dice === id) this.setState({ dice: null }); }); if (accept) act({ type: 'check/accept', checkId: id }); },
      watching, canThrow: !!ck && !rolled && !watching, handText: watching ? 'In ' + (charOf(ck.charId)?.name || 'their') + '\'s hand' : 'In your hand', closeLabel: watching ? 'Close' : 'Done',
      diceBanner: watching ? (charOf(ck.charId)?.name || '').toUpperCase() + '\'S ROLL' : '', diceBannerStyle: 'padding: 12px 18px; border-radius: 12px; text-align: center; font-size: 30px; font-weight: 700; letter-spacing: 0.16em; color: #0A0D13; background: ' + (diceOwner?.color || '#FFFFFF'),
      watchClose: () => { const id = ck ? ck.id : ''; closeAnim(this, 'dice', () => this.setState({ dismissed: { ...(this.state.dismissed || {}), ['k' + id]: true } })); },
      waiting: !!ck && !rolled, rolled, rolledA: rolled && !ck.roll.rerolled, rolledB: rolled && ck.roll.rerolled,
      throwDie: () => act({ type: 'check/roll', checkId: ck.id }), reroll: () => act({ type: 'check/reroll', checkId: ck.id }),
      noReroll: watching || !ck || !ck.roll || ck.roll.rerolled || ck.done || (charOf(ck.charId)?.echo || 0) < 1,
      // Offer the reroll loudly on a failure you can still reroll; once rerolled, the button says so.
      rerollLabel: ck && ck.roll && ck.roll.rerolled ? '◆ Echo spent · the reroll stands' : '◆ Spend 1 Echo · throw again' + (ck && !watching ? ' (' + (charOf(ck.charId)?.echo || 0) + ' left)' : ''),
      rerollStyle: 'min-height: 46px; padding: 0 16px; border-radius: 10px; font-family: inherit; font-weight: 700; cursor: pointer; ' + (ck && ck.roll && !ck.roll.ok && !ck.roll.rerolled && !watching && (charOf(ck.charId)?.echo || 0) >= 1
        ? 'border: 0; background: #FFFFFF; color: #0A0D13; box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.18)' : 'border: 1px solid #FFFFFF; background: transparent; color: #FFFFFF'),
      continueLabel: watching ? 'Close' : 'Continue', hasAfter: !!roll.after,
      tables, skins, skin: { face: K[2], edge: K[3], ink: K[4] }, tableName: T[1].toUpperCase(),
      tableStyle: 'position: relative; height: 300px; border-radius: 16px; overflow: hidden; background: ' + T[2] + '; border: 10px solid ' + T[3] + '; box-shadow: inset 0 0 60px rgba(0, 0, 0, 0.55)',
      custom: S.custom, toggleCustom: () => this.setState({ custom: !S.custom }), customPressed: S.custom ? 'true' : 'false', customLabel: S.custom ? 'Done' : 'Customise',
      draft: S.draft, onDraft: (e) => this.setState({ draft: e.target.value, polished: false }), placeholder: cantSpeak ? why : 'Say or do something… (' + (c ? c.name : '') + ')',
      polishLabel: S.polishing ? 'Polishing…' : S.polished ? 'Undo polish' : 'Polish with AI', cantPolish: !isHost || S.polishing || cantSpeak, polishTitle: isHost ? 'Rewrite your words as in-world prose (a small Haiku call on your key)' : 'Only the host\'s key can polish',
      polish: async () => {
        if (S.polished) return this.setState({ draft: S.rawDraft, polished: false });
        const text = S.draft.trim(); if (!text) return;
        this.setState({ polishing: true });
        try { const out = await polishText(text, c ? c.name : ''); this.setState({ rawDraft: text, draft: out, polished: true, polishing: false }); }
        catch (e2) { this.setState({ polishing: false }); toast(String(e2.message || e2)); }
      },
      send: () => { const text = (this.state.draft || '').trim(); if (!text) return toast('Say something first, or Pass.'); const ooc = !!this.state.ooc || oocOf(text).ooc; act({ type: 'story/speak', text, ...(ooc ? { ooc: true } : { roll: this.state.pickRoll }) }); this.setState({ draft: '', polished: false, ooc: false }); },
      // OOC (a question to the Narrator out of character): it doesn't use the Say or the turn, so it works between turns too.
      oocOn: !!S.ooc, oocPressed: S.ooc ? 'true' : 'false', toggleOoc: () => this.setState({ ooc: !S.ooc }),
      oocStyle: 'min-height: 32px; padding: 0 12px; border-radius: 999px; font-family: inherit; font-size: 12px; font-weight: 700; letter-spacing: 0.12em; cursor: pointer; ' + (S.ooc ? 'border: 1px solid #E7EBF3; background: #1C2536; color: #E7EBF3' : 'border: 1px solid #2E3A50; background: transparent; color: #A3AEC2'),
      inputOff: cantSpeak && !(S.ooc && c && g.phase !== 'lobby'), sendLabel: S.ooc ? 'Ask OOC' : 'Send',
      inputHolder: S.ooc ? 'Ask the Narrator out of character (doesn\'t use your turn)…' : cantSpeak ? why : 'Say or do something… (' + (c ? c.name : '') + ')',
      // The quest board (UI pass 3.3): always open in the right column, grouped by Area or by Quest, each group foldable
      // (remembered), its own scrollbar; the old board stays one click away as Full board ⤢ (missionBoard.tsx).
      qb: (() => { const by = (S.qGroup || pref('questGroup', 'area')) === 'quest' ? 'quest' : 'area';
        const Q = questGroups(g, by), fold = { ...readFold(), ...(S.qFold || {}) };
        const setBy = (v) => { savePref('questGroup', v); this.setState({ qGroup: v }); };
        const tog = (on) => 'min-height: 24px; padding: 0 7px; border: 0; font-family: inherit; font-size: 11px; font-weight: 700; letter-spacing: 0.06em; cursor: pointer; ' + (on ? 'background: #E7EBF3; color: #0A0D13' : 'background: transparent; color: #A3AEC2');
        const qk = (g.code || '') + '|' + by, fresh = !QSEEN.has(qk); if (fresh) QSEEN.set(qk, new Set()); const seen = QSEEN.get(qk);
        const groups = Q.groups.map((gr) => { const f = fold[by + ':' + gr.key] ?? gr.folded;
          return { key: gr.key, title: gr.title, label: gr.title + ' · ' + gr.count, sub: gr.sub, hasSub: !!gr.sub && !f, count: gr.count, open: !f, expanded: f ? 'false' : 'true', glyph: f ? '▸' : '▾',
            ink: gr.key === 'here' ? '#FFFFFF' : gr.key === 'failed' ? '#F65157' : gr.key === 'done' || gr.key === 'past' ? '#A3AEC2' : '#E7EBF3',
            toggle: () => { const nf = { ...readFold(), [by + ':' + gr.key]: !f }; try { localStorage.setItem(QFOLD, JSON.stringify(nf)); } catch { /* */ } this.setState({ qFold: nf }); },
            rows: gr.rows.map((r) => { const isNew = !fresh && !seen.has(r.key) && r.status === 'open'; seen.add(r.key);
              return { ...r, cls: isNew ? 'phc-q-new' : '', hasMission: !!r.mission, hereTag: by === 'quest' && r.here, hasDetail: !!r.detail && r.status === 'open',
                hasWhere: !!r.where, whereText: r.markers.length ? (r.here ? '' : r.where.replace(/◆.*$/, '')) : r.where,
                markers: r.markers.map((m) => ({ ref: m.ref, go: () => this.setState({ area: true, hoverTile: m.tile }) })),
                steps: r.steps.map((t, i) => ({ key: r.key + i, text: t })),
                markStyle: 'font-size: 13px; font-weight: 700; color: ' + (r.status === 'done' ? '#6FEA77' : r.status === 'failed' ? '#F65157' : '#FFFFFF'),
                textStyle: 'font-size: 13px; line-height: 1.35; font-weight: ' + (r.status === 'open' ? 700 : 400) + '; color: ' + (r.status === 'open' ? '#E7EBF3' : '#A3AEC2') + (r.status === 'failed' ? '; text-decoration: line-through' : '') }; }) }; });
        return { has: Q.has, countText: Q.complete ? '· DONE' : '· ' + Q.open, countTitle: Q.complete ? 'The campaign is complete' : Q.open + ' open objective' + (Q.open === 1 ? '' : 's') + ' and side jobs', groups, empty: !groups.length,
          hasStatus: Q.choosing || Q.complete, status: Q.complete ? 'The campaign is complete.' : 'What comes next is still open: the story decides.',
          byArea: () => setBy('area'), byQuest: () => setBy('quest'), areaPressed: by === 'area' ? 'true' : 'false', questPressed: by === 'quest' ? 'true' : 'false',
          areaStyle: tog(by === 'area'), questStyle: tog(by === 'quest'), full: () => openMissionBoard() }; })(),
      // The mana forecast outside fights (UI pass 5): the fight's panel, fed by the story's meter, round and zone.
      sfc: storyForecastVals(g, !!S.fcOpen, () => this.setState({ fcOpen: !this.state.fcOpen })),
      // The Perks strip (plan 3): story uses of perks, traits and class moves. Every input is a button: an action that
      // needs a pick (chips, a squadmate, someone on the map, a design) or words opens its own panel under the strip.
      // Never the Say box, never a shared detail field. The Proving Ground runs these as area-map actions.
      get hasStoryPerks() { return this.storyPerks.length > 0; }, ...restVals,
      stripOpen: !!stripOpen, stripPick: stripOpen ? stripOpen.v : { fields: [], opts: [] },
      storyPerks: stripPk.map(({ x: { e }, v }) => ({ key: pkId(e), label: e.label + (v.needs ? '…' : '') + (e.uses.label ? ' · ' + e.uses.label : ''), title: (v.why ? v.why + ' · ' : '') + pkText(e), off: !!v.why,
        pick: () => v.click(),
        style: 'min-height: 32px; padding: 0 12px; border-radius: 999px; font-family: inherit; font-size: 12px; font-weight: 700; cursor: pointer; border: 1px solid ' + (v.open ? '#FFFFFF' : '#2E3A50') + '; background: #10151F; color: #E7EBF3' + (v.why ? '; opacity: 0.45' : '') })),
      cantSpeak, turnText: why, turnStyle: 'font-size: 13px; color: ' + (cantSpeak ? '#A3AEC2' : myColor),
      pass: () => act({ type: 'story/pass' }),
      endTurn: () => { if (c) act({ type: 'world/act', charId: c.id, act: 'end' }); if (this.state.area) closeAnim(this, 'area', () => this.setState({ area: false, wTarget: null })); else this.setState({ wTarget: null }); },
      cantEnd: !c || c.dead || g.phase !== 'story' || g.story.await !== 'players' || !!(g.story.ended || {})[c.id],
      apText: c && g.phase === 'story' ? 'AP ' + apLeft(g, c) + ' / ' + ROUND_AP : '', apSub: SB ? 'a full turn on the area map' : 'one Say and a full turn of AP',
      skipRest: () => waitingOn.forEach((p) => act({ type: 'story/skip', playerId: p.id })), cantSkip: !isHost || g.story.await !== 'players' || !waitingOn.length,
      pickRoll: S.pickRoll, togglePick: () => this.setState({ pickRoll: !S.pickRoll }),
      zoneLabel: 'ZONE · ' + map.name.toUpperCase(), zoneShort: map.name.toUpperCase(), hasZoneNote: inFight || !!cb, zoneAria: inFight ? 'Open the combat zone' : 'Combat zone',
      zoneStyle: 'display: block; width: 100%; box-sizing: border-box; padding: 6px; border-radius: 10px; background: #05070B; border: 1px solid ' + (inFight ? '#F65157' : '#232D3F'),
      // Kept short (UI pass 3.2): its height is capped by the window's, so the quest board below keeps its room.
      miniGrid: 'display: grid; grid-template-columns: repeat(' + map.w + ', minmax(0, 1fr)); gap: 1px; margin: 0 auto; width: min(100%, calc(clamp(96px, 16vh, 200px) * ' + (map.w / map.h).toFixed(3) + '))',
      objPanelOpen: !!objPanel, objPanel: objPanel || { approaches: [] }, nearby: nearAll, hasNearby: nearAll.length > 0, nearHead: 'NEAR YOU · ' + nearAll.length, hasDay: !!here.day && !inFight,
      wpOpen: !!wp.open, wp, wpCls: modalCls(this, 'wp'), here, hasHere: here.has, carried, hasCarried: carried.length > 0, carryLoad: LL.text, carryLoadStyle: 'font-size: 12px; font-weight: 700; line-height: 1.4; color: ' + (LL.over ? '#F65157' : '#A3AEC2'),
      worldLegend: WLs.big.legend, hasWorldLegend: WLs.big.legend.length > 0, pdOn, pdHint, cancelPd: () => this.setState({ putDown: null }),
      areaMagic: { has: GLY.length + ZON.length > 0 || Object.values(g.story.magic || {}).some((x) => x && x.held), legend: [
        ...(GLY.some((x) => x.side === 'pc') ? [{ key: 'g', img: glyphUri('fire', SIGIL_INK), swatch: '', text: 'Squad glyph' }] : []), ...(GLY.some((x) => x.side !== 'pc') ? [{ key: 'f', img: scratchUri('#F65157'), swatch: '', text: 'Enemy glyph' }] : []),
        ...placedLegend((placedW && placedW.kinds) || new Set(), false).map((l) => ({ key: l.key, img: l.img || '', swatch: l.box || '', text: l.name })),
        ...(Object.values(g.story.magic || {}).some((x) => x && x.held) ? [{ key: 'h', img: heartUri(2), swatch: '', text: 'Holding an Outburst' }] : [])] },
      wGroups, wHint: wHintFull, ...wDetailVals, wPanelOpen: !!wPanel && !wPkE.why, wPanel: wPanel || { fields: [], opts: [] }, wHasConfirm: !wPanel && canAct && (isMagicW ? mReady : instant || (W === 'pickup' && !!wPick && !wPickWhy) || (pkTile && !!S.wTile && !wPkE.why) || ((TARGETED.includes(W) || pkTargeted || pkObj) && !!tgt && !(wPkE && wPkE.why)) || (W === 'analyze' && !!readT)), wConfirm, wMagic, wPile: wPileVals, wConfirmLabel: isMagicW ? mLabel : W === 'pickup' && wPick ? pickupLabel(wPick, wUntick) : isAttack ? (tgt && tgt.side === 'pc' ? 'Attack ' + tgt.name + ' (friendly fire)' : tgt && tgt.obj && !tgt.person ? 'Attack it' : 'Attack · starts the fight') : 'Confirm',
      wHead: c ? c.name.toUpperCase() : '', /* AP shows once: the AP bar in the status box */ wStatus: sneaking ? (hiddenNow ? 'Sneaking · hidden' : 'Sneaking · seen') : 'In the open',
      wStatusStyle: 'font-size: 12px; font-weight: 700; letter-spacing: 0.1em; color: ' + (hiddenNow ? '#6FEA77' : sneaking ? '#F65157' : '#A3AEC2'),
      areaCells, hereText: (() => { const k = S.hoverTile; if (!k || !areaCells.some((c) => c.key === k)) return 'Hover a tile to see what is there.';
        const cell = areaCells.find((c) => c.key === k); return (plan.info && plan.hv === k ? plan.info + ' · ' : '') + cell.label; })(),
      areaHint: pdOn ? pdHint : mOpen && mHint ? mHint : plan.isAtk ? (plan.reachText || '') + ' Red: in reach. Hover a target for the odds.' : plan.isMove ? 'Dashed tiles are in reach this round: hover one for the path and its AP, click to go.' : mover ? 'Click an open tile to move ' + mover.name + ' there. Hover any tile for what is at it.' : 'Hover any tile for what is at it.',
      areaGrid: 'display: grid; grid-template-columns: 18px repeat(' + map.w + ', minmax(0, 1fr)); gap: 2px; margin: 0 auto; width: min(100%, calc((100vh - 260px) * ' + ((map.w + 0.4) / (map.h + 0.4)).toFixed(3) + '))',
      areaTitle: 'AREA MAP · ' + (SB ? 'PROVING GROUND' : st0.short.toUpperCase() + ' · ' + map.name.toUpperCase()), inFight,
      hud: (() => { if (!c) return { has: false, bars: [], res: resView([]), magic: [] };
        const ap = apNow;
        // HP and AP as bars; everything you spend below them (game/resources.ts: the same block as the combat You card).
        const hb = bars.filter((b) => b.label !== 'XP' && b.label !== 'MP').map((b) => ({ ...b, labelStyle: b.labelStyle.replace('font-size: 11px', 'font-size: 13px') })).concat([{ label: 'AP', text: ap + ' / ' + ROUND_AP, labelStyle: 'font-size: 13px; font-weight: 700; letter-spacing: 0.1em; color: #FFFFFF', fill: 'width: ' + Math.round(ap / ROUND_AP * 100) + '%; height: 100%; background: #FFFFFF' }]);
        const ml = [{ key: 'mana', text: 'MANA ' + MN.mana + ' · ' + bandName(MN.band), style: 'font-size: 12px; font-weight: 700; letter-spacing: 0.1em; color: #A3AEC2' }];
        return { has: true, bars: hb, res: resView(resourcesOf(MN.cu || null, c, g)), magic: ml }; })(),
      ...(() => { const E = g.story.entries; let from = E.length; while (from > 0 && E[from - 1].kind !== 'narration') from--;
        const L = E.slice(from).filter((e) => e.act || e.kind === 'check' || (e.kind === 'system' && !e.ooc && /hidden|spots|Downed|stim|learns the|Outburst module|school of Outbursts|alarm|Revealed|wants:|picks up|puts .+ down|drops|search|sets off|hazard|safe path|trigger|ambush|appears|told|marker| gets | no longer has /i.test(e.text))).slice(-12).map((e) => ({ key: e.id, text: (e.head ? e.head + ' · ' : '') + e.text,
          style: 'font-size: 12px; line-height: 1.4; color: ' + (magicInk(e.text) || (e.act && /\b(fires|shoots|aimed shot|strikes|smashes|attacks)\b/.test(e.text) ? '#F6A3A6' : e.kind === 'check' ? (e.ok ? '#6FEA77' : '#A3AEC2') : '#E7EBF3')) }));
        return { areaLog: L, noAreaLog: !L.length }; })(),
      areaNote: inFight ? 'Fight on: round ' + cb.round + '. Tokens show where everyone stands.' : 'Grid references: columns A–' + refOf((map.w - 1) + ',0').replace(/\d+$/, '') + ', rows 1–' + map.h + (SB ? '. Click a tile to move there.' : '. Tell the Narrator "I move to C7", or click a tile.'),
      zoneNote: inFight ? 'COMBAT ZONE · ENTER ›' : cb ? 'LAST FIGHT · ' + (cb.over === 'win' ? 'WON' : cb.over === 'extracted' ? 'EXTRACTED' : 'LOST') + ' · VIEW ›' : 'NO FIGHT YET · HOVER A TOKEN',
      zoneNoteStyle: 'display: block; padding-top: 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.12em; color: ' + (inFight ? '#F65157' : '#A3AEC2'),
      mini, regions, area: S.area, openArea: () => this.setState({ area: true }), closeArea: () => closeAnim(this, 'area', () => this.setState({ area: false, wTarget: null })), order,
      orderTitle: SB ? 'SQUAD' : 'SPEAKING ORDER',
      rp: this.panelVals(SB ? 4 : SQUAD_SEATS),
      orderNote: SB ? 'Each round: a full turn of AP on the area map, then End turn. Gear up with the tools; start the fight from the map or the tools.' : 'Each round: one Say and a full turn of AP (act on the area map). When everyone has ended their turn, the Narrator answers what needs it.',
      endTitle: 'Done for this round: your AP (and your Say, if unused). ' + (SB ? 'Each round: a full turn of AP on the area map, then End turn.' : 'When everyone has ended their turn, the Narrator answers what needs it.'),
      areaCls: modalCls(this, 'area'), objCls: modalCls(this, 'obj'), rootCls: 'phc-play ' + motionRoot(), tabCls: 'phc-m-tab-' + (S.tabDir || 'r'),
      tipCls: 'phc-m-tip', levelCls: 'phc-m-pop',
    };
  }
}

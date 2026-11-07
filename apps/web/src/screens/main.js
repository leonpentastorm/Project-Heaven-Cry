// Story mode, ported from design/canvas-build/main.logic.js. Everything the prototype faked now comes from the game:
// the sheet is your character, the stream is the session, voices and Overreach are the engine's private entries,
// the dice table rolls the checks the Narrator called (the engine rolls; Echo rerolls), and Send speaks in turn.
import { DCLogic } from '../dc/runtime';
import { D, ATTR, SK, IMG, mod, fmt, epccgVals, lightboxVals, zoomer, epBtnStyle, masteredVals, bodyFigure, SLOT_PARTS, tokenVals, effectsOf, ART, ART_BIG, zoneOf, spriteOf, tileBg, spriteStyle, epRgba,
  ensureMotionCss, ensureStyle, motionRoot, closeAnim, modalCls } from './shared';
import { SKILL, PERK, WEAPON, MAPS, CLASS, maxHp, maxMp, xpForLevel, defense, initiativeBonus, movement, healingMult, classRank, pendingPerkSteps, ARMOUR, KITS, packOf, mainHandSide, injuryText, itemKg, carriedKg, carryLimit, loadedOf, ITEM, overweightKg, weaponDurOf, maxDurOf, RARITY, coverOf, difficultOf, magsOf, WEAPONS, zoneMap, positionsOf, refOf, notesAt, visibility, defaultObjects, kindOf, coverKind, blocksMove, isDifficult, SKILL as SKILLS_BY_ID, TN_LADDER } from '@engine';
import { startOf } from '../game/starts';
import { voiceState, speak, stopVoice, CORE_VOICE } from '../game/voice';
import { designBan, portraitFor, npcsOf, apLeft, ROUND_AP, ENEMY, attackApCost, isMelee, isPersonObj, songStateOf, musicTraitOf, gearEffects, paths, apForTiles, previewAttack, lineOfSight, effectiveRange } from '@engine';
import { act, getState, go, polishText, retryNarrator, saveNow, toast } from '../game/store';
import { openReport, openSpend } from '../game/report';
import { perkEntries, storyPerkEntries, parsePk, pkId, pkCost, pkText, classOf, pickChoice, wantsDetail } from '../game/commands';
import { weaponActions, verdictFor, ADVANCED, collectionOf, COMPANION_KINDS } from '@engine';
import { usesLine, emblemOf, classMoves as classMovesOf, advancedMoves, signatureOf, classLabel } from '../game/classView';
import { castFight, castMany, npcFace, npcTags, takenCards } from '../game/cast';
import { SIGIL, SCHOOL, MODULE, maxSigilWords, wordsKnownCap, evoChargeNow, coresCarried, hasEvoker, hasEmanator, mpNow, strainLimit, moduleSlots, readyDesigns, glyphAp, soulCostSaving, soulCastAp, soulRangeBonus,
  magicOf, designCost, designAp, designRange, manaBand, MANA_START, FLUX_MAX, CORE_CHARGE, storyCb, previewEvoke, previewOutburst, spellTargets, dist, standable, condName,
  vent as mgVent, swapCore as mgSwapCore, scuff as mgScuff, syphon as mgSyphon, crystallise as mgCrystallise, drawGlyph, releaseOutburst, glyphApOf } from '@engine';
import { glyphUri, scratchUri, heartUri, SIGIL_INK, SOUL_INK } from '../game/glyphs';
import { drawStrip, patternPanel, evokeView, evokeClick, placedView, placedLegend, mergeTiles, glyphMark } from '../game/sigilView';
import { openMissionBoard } from '../game/missionBoard';
import { missionsButton } from '../game/missionView';
import { oocOf } from '@engine';
const WORN_SLOT = { head: 'head', head_accessory: 'headAcc', inner_torso: 'inner', lower_torso: 'lower', legs: 'legs', hands: 'hands', footwear: 'feet' };
const SLOT_TO_WORN = Object.fromEntries(Object.entries(WORN_SLOT).map(([a, b]) => [b, a]));
ensureMotionCss(); // the slide/pop classes (shared.js MOTION_CSS)
// Main-screen extras: the dice verdict lands after the die does; the area map's planning marks breathe a little.
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
const OPT_LABEL = { to_hit_2: '+2 to hit', defense_2: '+2 Defense', heal_30: 'Heal 30', push_3: 'Push 3 tiles', pull_3: 'Pull 3 tiles', pinned: 'Pinned', slowed: 'Slowed',
  fear: 'Afraid', shaken: 'Shaken', confused: 'Confused', left_brain_debuff: 'Left Brain Debuff', right_brain_debuff: 'Right Brain Debuff' };
/** The option value the engine reads on release (data 'push_3' → 'push', 'to_hit_2' → 'hit'). */
const optValue = (o) => o.replace(/^to_/, '').replace(/_\d+$/, '');
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
    charge: cu?.mg ? cu.mg.charge : c ? evoChargeNow(c) : 0, cores: cu?.mg ? cu.mg.cores + (cu.mg.coresMade || 0) : c ? coresCarried(c) : 0, mp: cu?.mg ? Math.round(cu.mg.mp) : c ? mpNow(c) : 0 };
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
function magicVals(self, g, c) {
  const S = self.state, set = (p) => self.setState({ mgDraft: { ...self.state.mgDraft, ...p } });
  const none = { has: false, empty: true, emptyText: '', showSigil: false, showSoul: false, sig: { words: [], stats: [] }, soul: { designs: [], stats: [] }, b: { open: false, schools: [], schools2: [], options: [], modules: [] }, learn: { ally: [], plates: [] } };
  if (!c) return { ...none, emptyText: 'You have no character in this session.' };
  const words = c.sigils || [], designs = c.outbursts || [], known = c.soulKnown || { schools: [], modules: [] }, evo = hasEvoker(c), ema = hasEmanator(c);
  const N = magicNow(g, c), fight = N.inFight, mana = N.mana, m = soulM(c);
  const showSigil = words.length > 0 || evo, showSoul = designs.length > 0 || known.schools.length > 0 || known.modules.length > 0 || ema || !!N.held;
  // Sigils: the words known, as glyph cards (click for the Grand form).
  const wordCards = words.filter((id) => SIGIL[id]).sort((a, b) => WORD_ORDER.indexOf(SIGIL[a].class) - WORD_ORDER.indexOf(SIGIL[b].class)).map((id) => { const w = SIGIL[id], open = S.mgWord === id;
    return { key: id, img: glyphUri(id, SIGIL_INK, { glow: true }), word: w.word, cls: WORD_CLASS[w.class] || '', charge: 'CHARGE ' + w.charge, text: w.text, title: w.grand ? 'Grand form (Grand Sigilist): ' + w.grand : '',
      open: open ? 'true' : 'false', toggle: () => self.setState({ mgWord: open ? null : id }), hasGrand: open && !!w.grand, grand: w.grand || '', hint: w.grand ? (open ? '▾' : '▸') : '',
      style: 'display: grid; grid-template-columns: 40px minmax(0, 1fr); gap: 4px 10px; align-items: start; width: 100%; padding: 8px 10px; border-radius: 10px; text-align: left; font-family: inherit; color: inherit; cursor: pointer; background: #10151F; border: 1px solid ' + (open ? SIG_CYAN : '#232D3F') + '; border-left: 3px solid ' + SIG_CYAN }; });
  const sigStats = [['Max Sigil words (longest Line; glyphs on the ground at once)', String(maxSigilWords(c))], ...(c.sigilFree ? [['Free words owed (old words retired in rules 1.4)', String(c.sigilFree)]] : []), ['Known words', words.length + ' / ' + wordsKnownCap(c)], ['Evoker charge', evo ? N.charge + ' / ' + CORE_CHARGE : '—'],
    ['Spare cores', String(N.cores)], ['Flux', N.flux + ' / ' + FLUX_MAX + (N.flux >= FLUX_MAX - 1 ? ' · vent soon' : '')], ['Glyph AP', String(glyphAp(c))]].map(([k, v]) => ({ k, v }));
  // Outbursts: MP, Strain, the designs ready, and the heart workshop.
  const mpMax = maxMp(c), mpPct = Math.round(N.mp / Math.max(1, mpMax) * 100);
  const designCards = designs.map((d) => { const cost = designCost(m, d, mana), held = !!(N.held && N.held.design === d.id);
    return { key: d.id, name: d.name, schools: [d.school, d.school2].filter(Boolean).map((x) => SCHOOL[x]?.name || x).join(' + ') + (d.option ? ' · ' + optLabel(d.school, d.option) : ''),
      mods: d.modules.map((x) => ({ key: x, label: (MODULE[x]?.name || x) + ' ' + signed(MODULE[x]?.cost || 0), title: MODULE[x]?.text || '', style: 'padding: 1px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; border: 1px solid ' + epRgba(SOUL_VIOLET, 0.6) + '; color: ' + SOUL_VIOLET })),
      hasMods: d.modules.length > 0, line: cost + ' MP · ' + designAp(m, d) + ' AP · reach ' + designRange(m, d) + ' tiles', held, heldText: held ? 'HELD · STAGE ' + N.held.stage : '', heart: heartUri(held ? N.held.stage : 1),
      edit: () => self.setState({ mgDraft: { id: d.id, name: d.name, school: d.school, school2: d.school2 || '', modules: [...d.modules], option: d.option || '' }, mgSaved: null }),
      forget: () => { if (held) return toast('Release ' + d.name + ' first: a held Outburst can\'t be forgotten.'); if (window.confirm('Forget the design ' + d.name + '? You can design it again later.')) act({ type: 'magic/forget', charId: c.id, designId: d.id }); },
      locked: fight, noForget: fight || held, forgetTitle: held ? 'You are holding it: release it first.' : fight ? 'After the fight.' : 'Forget this design to make room.',
      style: 'display: flex; flex-direction: column; gap: 6px; padding: 10px; border-radius: 10px; background: #10151F; border: 1px solid ' + (held ? SOUL_VIOLET : '#232D3F') + '; border-left: 3px solid ' + SOUL_VIOLET }; });
  const soulStats = [['Strain now', N.strain + ' / ' + strainLimit(c) + ' (the limit; past it, a Mana Short)'], ['Ready designs', designs.length + ' / ' + readyDesigns(c)], ['Module slots', String(moduleSlots(c))],
    ['Air', 'MANA ' + mana + ' · ' + bandName(N.band) + (N.band.soul_cost_mult !== 1 ? ' (costs ×' + N.band.soul_cost_mult + ')' : '')]].map(([k, v]) => ({ k, v }));
  // The builder: a school, its option, modules up to the slots, a name. The engine checks everything again on Save.
  const B = S.mgDraft, slots = moduleSlots(c), two = (c.skills.will_power || 0) >= 5;
  // Close once the save lands: the designs changed, or the game moved on with no refusal since Save (an unchanged
  // design saves to the same thing, so a content diff alone would leave the builder open).
  const stNow = getState(), refused = !!(stNow.toast && !stNow.toast.ok && stNow.toast.at >= (S.mgSavedAt || 0));
  if (B && S.mgSaved != null && (JSON.stringify(c.outbursts || []) !== S.mgSaved || (stNow.game !== S.mgSavedGame && !refused))) queueMicrotask(() => self.setState({ mgDraft: null, mgSaved: null, mgSavedGame: null }));
  const opts = B ? (SCHOOL[B.school]?.options || []) : [];
  const draftD = B && B.school ? { id: B.id || '', name: B.name, school: B.school, ...(B.school2 ? { school2: B.school2 } : {}), modules: B.modules, ...(B.option ? { option: B.option } : {}) } : null;
  const b = B ? {
    open: true, title: B.id ? 'EDIT ' + (B.name || 'DESIGN').toUpperCase() : 'NEW OUTBURST DESIGN', name: B.name, onName: (e) => set({ name: e.target.value.slice(0, 40) }),
    school: B.school, onSchool: (e) => { const sc = e.target.value, o = SCHOOL[sc]?.options || []; set({ school: sc, option: o.length ? optValue(o[0]) : '' }); },
    schools: known.schools.map((x) => ({ key: x, value: x, label: SCHOOL[x]?.name || x })), schoolText: SCHOOL[B.school]?.text || '',
    two: two && known.schools.length > 1, school2: B.school2 || '', onSchool2: (e) => set({ school2: e.target.value }),
    schools2: [{ key: '-', value: '', label: 'None' }, ...known.schools.filter((x) => x !== B.school).map((x) => ({ key: x, value: x, label: SCHOOL[x]?.name || x }))],
    hasOptions: opts.length > 0, options: opts.map((o) => { const v = optValue(o), on = B.option === v; return { key: o, label: OPT_LABEL[o] || o, pressed: on ? 'true' : 'false', pick: () => set({ option: v }), style: chipStyle(SOUL_VIOLET, on) }; }),
    slotsText: 'MODULES · ' + B.modules.length + ' / ' + slots + ' (Will Power)', noModules: !known.modules.length,
    modules: known.modules.map((x) => { const on = B.modules.includes(x), full = !on && B.modules.length >= slots;
      return { key: x, label: (MODULE[x]?.name || x) + ' ' + signed(MODULE[x]?.cost || 0), title: MODULE[x]?.text || '', pressed: on ? 'true' : 'false', locked: full,
        pick: () => set({ modules: on ? self.state.mgDraft.modules.filter((y) => y !== x) : [...self.state.mgDraft.modules, x] }), style: chipStyle(SOUL_VIOLET, on) + (full ? '; opacity: 0.45; cursor: default' : '') }; }),
    cost: draftD ? designCost(m, draftD, mana) + ' MP · ' + designAp(m, draftD) + ' AP · reach ' + designRange(m, draftD) + ' tiles (in ' + bandName(N.band) + ' air)' : 'Pick a school.',
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
    (x.soulKnown?.modules || []).forEach((s) => { if (!known.modules.includes(s) && MODULE[s]) addT('module', s, MODULE[s].name + ' module', x.name); }); }
  const ally = [...teach.values()].map((t) => ({ key: t.kind + t.id, label: t.label, sub: 'from ' + t.who.join(' or '), isWord: t.kind === 'word', img: t.kind === 'word' ? glyphUri(t.id, SIGIL_INK) : heartUri(1), locked: learnLocked,
    title: t.kind === 'word' ? SIGIL[t.id].text : t.kind === 'school' ? SCHOOL[t.id].text : MODULE[t.id].text,
    go: () => act({ type: 'magic/learn', charId: c.id, [t.kind]: t.id, from: 'ally' }),
    style: chipStyle(t.kind === 'word' ? SIG_CYAN : SOUL_VIOLET, false) + '; min-height: 36px; border-radius: 10px' + (learnLocked ? '; opacity: 0.5; cursor: default' : '') }));
  const plates = packOf(c).filter((x) => (x.item || x.id) === 'sigil_plate').map((x, i) => { const w = (x.note || '').toLowerCase(), def = SIGIL[w];
    return { key: 'p' + i + w, label: 'Read the plate: ' + (def ? def.word : (x.note || 'an unknown word')), sub: '×' + x.qty + (def && words.includes(w) ? ' · known already' : ''), img: def ? glyphUri(w, SIGIL_INK) : scratchUri(), locked: learnLocked || !def,
      go: () => act({ type: 'magic/learn', charId: c.id, word: w, from: 'plate' }), style: chipStyle(SIG_CYAN, false) + '; min-height: 36px; border-radius: 10px' + (learnLocked || !def ? '; opacity: 0.5; cursor: default' : '') }; });
  const anyMagic = showSigil || showSoul;
  return {
    has: anyMagic, empty: !anyMagic, emptyText: 'No magic yet: Sigil words come from Brain Power, Outbursts from Will Power, or a teacher.',
    showSigil, showSoul, noEvoker: words.length > 0 && !evo, noEvokerText: '⚠ No Evoker carried: you know the words but can\'t draw them until you hold one.',
    sig: { words: wordCards, stats: sigStats, noWords: !wordCards.length, head: 'SIGILS · MIND · ' + words.length + (words.length === 1 ? ' WORD' : ' WORDS') },
    soul: { designs: designCards, noDesigns: !designs.length, stats: soulStats, ema, noEma: !ema, noEmaText: 'No Emanator carried: an Outburst pulls from the air instead of your MP, at +2 Strain a cast.',
      mpText: N.mp + ' / ' + mpMax + ' MP', mpFill: 'height: 100%; width: ' + Math.max(0, Math.min(100, mpPct)) + '%; background: ' + MP_BLUE,
      held: !!N.held, heldText: N.held ? 'HOLDING ' + ((designs.find((d) => d.id === N.held.design) || {}).name || 'an Outburst').toUpperCase() + ' · STAGE ' + N.held.stage + ' · it grows each round, and strains the heart, until you release it' : '', heldImg: heartUri(N.held ? N.held.stage : 1),
      head: 'OUTBURSTS · SOUL · ' + designs.length + (designs.length === 1 ? ' DESIGN' : ' DESIGNS'), canNew, newDesign: () => self.setState({ mgDraft: { id: null, name: '', school: known.schools[0], school2: '', modules: [], option: optValue((SCHOOL[known.schools[0]]?.options || [''])[0] || '') }, mgSaved: null }),
      newWhy: fight ? 'Design Outbursts after the fight.' : !known.schools.length ? 'Learn a school first (Will Power, or a teacher).' : designs.length >= readyDesigns(c) ? 'You keep ' + readyDesigns(c) + ' designs ready (Empathy): forget one to make room.' : '',
      knownText: 'Schools: ' + (known.schools.map((x) => SCHOOL[x]?.name || x).join(', ') || 'none') + ' · Modules: ' + (known.modules.map((x) => MODULE[x]?.name || x).join(', ') || 'none') },
    b, learn: { ally, plates, hasAlly: ally.length > 0, hasPlates: plates.length > 0, any: ally.length + plates.length > 0, locked: learnLocked,
      why: fight ? 'Learn after the fight.' : learnedNow ? 'One new thing a scene: it takes a rest to sink in.' : 'One new thing a scene. Words: ' + words.length + ' / ' + wordsKnownCap(c) + ' known.' },
  };
}

export class MainLogic extends DCLogic {
  constructor(props) {
    super(props);
    this.state = { tab: 'skills', core: 'body', sel: null, draft: '', rawDraft: '', polished: false, polishing: false, pickRoll: false, dice: null, custom: false, area: false, table: pref('table', 'felt'), skin: pref('skin', 'ivory') };
  }

  renderVals() {
    const S = this.state, st = getState(), g = st.game, me = st.me.id, isHost = st.role === 'host';
    if (!g) return { ...lightboxVals(this), ...epccgVals(this), stream: [], order: [], tabs: [], coreTabs: [], sheetSkills: [], bars: [], echoPips: [], pc: {} };
    const mine = Object.values(g.characters).filter((c) => c.owner === me);
    const c = mine.find((x) => x.id === S.sel) || mine[0] || null;
    const P = (id) => (c ? c.skills[id] || 0 : 0), A = (id) => (c ? c.attrs[id] || 1 : 1);
    const playerOf = (pid) => g.players.find((p) => p.id === pid) || { name: '?', initials: '?', color: '#A3AEC2' };
    const myColor = playerOf(me).color;

    // ---------- the sheet ----------
    const echo = c ? c.echo : 0;
    const echoPips = [0, 1, 2].map((i) => ({ style: 'width: 12px; height: 12px; transform: rotate(45deg); box-sizing: border-box; ' + (i < echo ? 'background: #FFFFFF' : 'border: 1px solid #FFFFFF') }));
    const hpMax = c ? maxHp(c) : 1, mpMax = c ? maxMp(c) : 1, mpNowV = c ? magicNow(g, c).mp : 0, ema = !!c && hasEmanator(c), next = c ? xpForLevel(c.level + 1) : 1, prevXp = c ? xpForLevel(c.level) : 0;
    const bars = c ? [['HP', '#F65157', Math.round(c.hp / hpMax * 100), c.hp + ' / ' + hpMax], ['MP', '#5C9EFF', ema ? Math.round(mpNowV / Math.max(1, mpMax) * 100) : 0, ema ? mpNowV + ' / ' + mpMax : 'no Emanator'],
      ['XP', '#A3AEC2', c.level >= 20 ? 100 : Math.round((c.xp - prevXp) / Math.max(1, next - prevXp) * 100), c.xp.toLocaleString() + ' / ' + next.toLocaleString()]]
      .map(([label, col, pct, text]) => ({ label, text, labelStyle: 'font-size: 11px; font-weight: 700; letter-spacing: 0.1em; color: ' + col, fill: 'width: ' + Math.max(0, Math.min(100, pct)) + '%; height: 100%; background: ' + col })) : [];
    const TAB_IDS = ['skills', 'status', 'perks', 'gear', 'magic'], tabDir = (to, from) => (TAB_IDS.indexOf(to) < TAB_IDS.indexOf(from) ? 'l' : 'r');
    const tabs = [['skills', 'SKILLS'], ['status', 'STATUS'], ['perks', 'PERKS'], ['gear', 'GEAR'], ['magic', 'MAGIC']].map(([id, label]) => ({ label, pick: () => { if (this.state.tab !== id) this.setState({ tab: id, tabDir: tabDir(id, this.state.tab), tip: null, gearMenu: null }); }, selected: S.tab === id ? 'true' : 'false',
      style: 'flex: 1 1 auto; min-height: 38px; padding: 0 8px; border-radius: 8px; font-family: inherit; font-size: 11px; font-weight: 700; letter-spacing: 0.04em; white-space: nowrap; cursor: pointer; ' + (S.tab === id ? 'border: 1px solid #E7EBF3; background: #1C2536; color: #E7EBF3' : 'border: 1px solid #232D3F; background: transparent; color: #A3AEC2') }));
    const CORES = ['body', 'mind', 'soul'];
    const coreTabs = CORES.map((k) => ({ label: k.toUpperCase(), pick: () => { if (this.state.core !== k) this.setState({ core: k, coreDir: CORES.indexOf(k) < CORES.indexOf(this.state.core) ? 'l' : 'r' }); }, pressed: S.core === k ? 'true' : 'false',
      style: 'flex: 1; min-height: 36px; border-radius: 8px; font-family: inherit; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; cursor: pointer; color: ' + D.core[k] + '; ' + (S.core === k ? 'border: 1px solid ' + D.core[k] + '; background: #1C2536' : 'border: 1px solid #232D3F; background: transparent') }));
    const asked = (c && g.story.scene.asked[c.id]) || [];
    // Ask shows only on skills whose voice has something to say in this scene (a hook not yet revealed to this character:
    // the view carries the skill names, never the hooks); the other trained skills are Silent (Leon, combat feel v1).
    const voiced = (c && (g.story.scene.voiced || {})[c.id]) || [];
    const sheetSkills = D.skills.filter((s) => s.core === S.core).map((s) => {
      const p = P(s.id), m = mod(p), ink = ATTR[s.attr].ink, done = asked.includes(s.id), off = !c || p === 0 || g.phase !== 'story', silent = !done && !off && !voiced.includes(s.id);
      return { key: s.id, zoom: zoomer(this, s.img, s.name, 'skill'), img: s.img, name: s.name, attr: ATTR[s.attr].name, pts: p, mod: fmt(m), help: () => this.setState({ epccg: s.id }), helpStyle: epBtnStyle(ink),
        ask: () => act({ type: 'voice/ask', charId: c.id, skill: s.id }), noAsk: done || off || silent, askLabel: done ? 'Asked' : silent || off ? 'Silent' : 'Ask',
        askTitle: done ? 'Asked once this scene.' : silent ? 'Nothing to say about this right now.' : off ? (p === 0 ? 'No points: no voice yet.' : g.phase !== 'story' ? 'Ask a skill out of combat.' : '') : 'It has something to say. Ask it (once this scene).',
        rowCls: 'phc-m-tab-' + (S.coreDir || 'r'),
        nameStyle: 'font-size: 14px; font-weight: 700; color: ' + (p ? ink : '#A3AEC2'), modStyle: 'font-size: 13px; text-align: right; color: ' + (p ? '#E7EBF3' : '#7F8BA1'),
        askStyle: 'min-height: 32px; border-radius: 6px; font-family: inherit; font-size: 12px; font-weight: 600; cursor: pointer; ' + (silent || (off && !done) ? 'border: 1px dashed #232D3F; background: transparent; color: #5B6577; font-style: italic' : done ? 'border: 1px solid #232D3F; background: transparent; color: #7F8BA1' : 'border: 1px solid ' + ink + '; background: ' + epRgba(ink, 0.14) + '; color: ' + ink) };
    });
    const au = P('authority'), lead = au >= 5 ? 'Command' : au >= 3 ? 'Platoon' : au >= 1 ? 'Squad' : 'Unfit';
    const w = c ? WEAPON[c.weapon] : null;
    const status = c ? [['Defense', String(defense(c))], ['Initiative', fmt(initiativeBonus(c))], ['Movement', movement(c) + ' tiles per AP'], ['Vision', (12 + 2 * (A('perception') - 1)) + ' tiles'],
      ['Healing given', '×' + (Math.round(healingMult(c) * 100) / 100)], ['Carry', (20 + 5 * (A('strength') - 1)) + ' kg'], ['Body save', fmt(mod(P('guts')))], ['Brain save', fmt(mod(P('charisma')))],
      ['Heart save', fmt(mod(P('composure')))], ['Cores', 'B' + c.cores.body + ' · M' + c.cores.mind + ' · S' + c.cores.soul], ['Leadership', lead], ['Karma', '0 · Neutral']].map(([k, v]) => ({ k, v })) : [];
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
    // who runs it and the uses left, under the emblem, the rank and the signature progress.
    const klass = c ? classOf(c) : null, clsEm = emblemOf(c && (c.advancedClass || c.classId));
    const moveCard = (m) => ({ ...m, rank: m.rank + (m.ap ? ' · ' + m.ap : '') + (m.earned ? '' : ' · LOCKED: ' + m.unlock), locked: !m.earned, badgeStyle: badgeStyleOf(m.verdict), hasUses: !!m.uses,
      style: 'display: flex; flex-direction: column; gap: 3px; padding: 8px 10px; border-radius: 10px; background: #10151F; border: 1px solid ' + (m.earned ? clsEm.ink : '#232D3F') + (m.earned ? '' : '; opacity: 0.55') });
    const classMoves = !c ? [] : [...(c.classId ? classMovesOf(g, c, c.classId) : []), ...(c.advancedClass ? advancedMoves(g, c, c.advancedClass) : [])].map(moveCard);
    const clsSig = c && c.classId ? signatureOf(c, c.classId) : null;
    const classHead = klass ? { name: classLabel(c).toUpperCase(), icon: klass.icon, ink: klass.ink, sig: clsSig ? 'Signature ' + clsSig.total + ' (' + clsSig.skills.map((s) => s.name + ' ' + s.pts).join(', ') + ') · ' + clsSig.nextLine : '',
      bar: clsSig ? 'height: 100%; border-radius: 99px; background: ' + klass.ink + '; width: ' + clsSig.pct + '%' : '' } : null;
    const top = c ? Object.entries(c.skills).filter(([, p]) => p > 0 && p < 10).sort((a, b) => b[1] - a[1])[0] : null;
    const mp = top ? masteredVals(this, SK[top[0]].ep.mastered, ATTR[SK[top[0]].attr].ink, SK[top[0]].name, top[1]) : {};
    // Gear: the body figure, the slot list beside it, and the backpack rig.
    const kitDef = c ? KITS[c.kit] || KITS.medic : null, side = c ? mainHandSide(c) : 'right';
    const ws = c ? c.weaponState || {} : {}, wd = c ? weaponDurOf(c) : 0, wmax = c ? maxDurOf(c.weapon, ws.rarity) : 0;
    const wear = (d, m) => (m ? (d <= 0 ? 'BROKEN' : d <= m * 0.25 ? 'worn ' + d + '/' + m : 'durability ' + d + '/' + m) : '');
    const worn = c ? { main: [(ws.name || (w.name === WEAPON[kitDef.weapon]?.name && kitDef.weaponName ? kitDef.weaponName : w.name)) + (ws.rarity && ws.rarity !== 'standard' ? ' · ' + ws.rarity.toUpperCase() : ''),
        [(typeof w.damage === 'number' ? w.damage + ' dmg' : 'damage varies') + (typeof w.range_tiles === 'number' ? ' · ' + w.range_tiles + ' tiles' : '') + (w.magazine ? ' · ' + loadedOf(c) + '/' + w.magazine + ' loaded' : ''), wear(wd, wmax),
          (ws.mods || []).map((m) => ITEM[m]?.name).filter(Boolean).join(', '), w.grants ? 'Skill: ' + w.grants.name : ''].filter(Boolean).join(' · ')],
      outer: c.armourClass ? [kitDef.armourName + ' (Class ' + ROMAN[c.armourClass] + ')', 'Armour ' + (ARMOUR[c.armourClass]?.value || 0)] : null,
      off: c.offHand ? [WEAPON[c.offHand.id]?.name || ITEM[c.offHand.id]?.name || c.offHand.id, WEAPON[c.offHand.id] ? 'Paired attacks · ' + (WEAPON[c.offHand.id].grants?.name || '') : (ITEM[c.offHand.id]?.text || '').slice(0, 80)] : null } : {};
    if (c) for (const [slot, id] of Object.entries(c.worn || {})) if (WORN_SLOT[slot]) worn[WORN_SLOT[slot]] = [ITEM[id]?.name || id, (ITEM[id]?.text || '').replace(/^[^:]+: /, '')];
    const pack = c ? [...(c.stims ? [{ id: 'stim', item: 'stim_injector', name: 'Stim injector', qty: c.stims, kind: 'med', note: 'Heals 30 × Healing given; stabilises the Downed; stops Bleeding' }] : []), ...packOf(c),
      ...(c.essence ? [{ id: 'eoe', item: 'essence_of_experience', name: 'Essence of Experience', qty: c.essence, kind: 'loot', note: 'Sells for 300' }] : [])] : [];
    worn.pack = c ? ['Pack', pack.length + (pack.length === 1 ? ' item' : ' items')] : null;
    const hotParts = S.hotSlot ? (S.hotSlot === 'main' ? [side === 'left' ? 'lHand' : 'rHand'] : SLOT_PARTS[S.hotSlot] || []) : [];
    const wornParts = Object.keys(worn).filter((k) => worn[k]).flatMap((k) => (k === 'main' ? [side === 'left' ? 'lHand' : 'rHand'] : SLOT_PARTS[k] || []));
    const gearFig = bodyFigure({ worn: wornParts, hot: hotParts, mainSide: side, weapon: !!c, injuries: [] });
    const gearLocked = g.phase === 'combat';
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
          note: wdef ? [(typeof wdef.damage === 'number' ? wdef.damage + ' dmg' : ''), wdef.hands, wdef.grants ? wdef.grants.name + ': ' + wdef.grants.text : ''].filter(Boolean).join(' · ') : it.kind === 'plot' ? it.text || 'From the story.' : it.note || def.text || '', acts, hasActs: acts.length > 0, src: it }]; }
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
    const artOf = (id) => IMG['weapon-' + id] || IMG['item-' + id] || '';
    const glyphOf = (id) => { const wd = WEAPON[id], it = ITEM[id] || {}; if (wd) return ({ pistol: '⌐', revolver: '⌐', smg: '╤', rifle: '═', shotgun: '╦', heavy: '▬', bow: ')', light_melee: '†', heavy_melee: '⚒', unarmed: '✊', thrown: '●', mana: '✧' })[wd.category] || '⚔';
      return it.category === 'shield' ? '⛉' : it.category === 'light' ? '✦' : it.category === 'armour' ? '▣' : it.category === 'mod' ? '⚙' : '▪'; };
    const tips = {};
    const colIds = c ? collectionOf(c) : []; // Gun Nut's collection (spec 14 item 369): tagged on its guns' tooltips
    const weaponTip = (id, st = {}) => { const wd = WEAPON[id]; if (!wd) return null; const r = st.rarity || 'standard', m = maxDurOf(id, r), d = st.dur ?? m;
      return { title: st.name || wd.name, sub: (RW(r) + ' ' + marks(r)).trim() + ' · ' + (wd.hands || '') + ' · ' + wd.category.replace('_', ' '), img: artOf(id), glyph: glyphOf(id),
        lines: [colIds.includes(id) ? 'Collection (Gun Nut): parting with it takes a Dexterity check.' : '', (typeof wd.damage === 'number' ? wd.damage : typeof wd.damage === 'object' && wd.damage ? Object.values(wd.damage).join(' / ') : wd.damage) + ' damage' + (typeof wd.range_tiles === 'number' && wd.range_tiles > 1 ? ' · ' + wd.range_tiles + ' tiles' : '') + (wd.magazine ? ' · ' + wd.magazine + ' rounds' + (wd.ammo ? ' (' + wd.ammo + ')' : '') : ''),
          m ? 'Durability ' + d + ' / ' + m + (d <= 0 ? ' · BROKEN' : d <= m * 0.25 ? ' · worn' : '') : '', (st.mods || []).length ? 'Mods: ' + st.mods.map((x) => ITEM[x]?.name || x).join(', ') : '', wd.mod_slots && wd.mod_slots.length ? 'Mod slots: ' + wd.mod_slots.join(', ') : '',
          wd.grants ? wd.grants.name + ': ' + wd.grants.text : '', wd.requires ? 'Needs ' + Object.entries(wd.requires).map(([k, v]) => SK[k]?.name + ' ' + v).join(', ') : '',
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
      return { key, side: ((isMain ? mainSide : mainSide === 'right' ? 'left' : 'right') + ' hand').toUpperCase(), tag: isMain ? 'MAIN' : 'OFF', name: twoHanded ? 'Both hands: ' + (WEAPON[c.weapon]?.name || '') : id ? tips[key].title : 'Empty',
        img: id ? artOf(id) : '', hasImg: !!(id && artOf(id)), noImg: !(id && artOf(id)), glyph: twoHanded ? '═' : id ? glyphOf(id) : '·', marks: id ? marks(r) : '', rarity: id ? RW(r) : '',
        frameStyle: 'position: relative; display: grid; place-items: center; width: 100%; aspect-ratio: 1; border-radius: 10px; background: #0D1119; border: ' + (id ? (RARITY[r]?.marks ? 2 + RARITY[r].marks : 1) + 'px solid ' + (RARITY[r]?.marks ? '#E7EBF3' : '#3B475D') : '1px dashed #3B475D') + '; font-size: 40px; color: #5B6577; cursor: pointer',
        nameStyle: 'font-size: 13px; font-weight: 700; color: ' + (id || twoHanded ? '#E7EBF3' : '#5B6577'), ...tipHandlers(key), ...menuFor(key), acts, hasActs: acts.length > 0, noActs: !acts.length,
        noActText: gearLocked ? 'Change gear after the fight.' : twoHanded ? 'Your weapon needs both hands.' : 'Nothing in the pack fits here.' };
    };
    const hands = c ? (mainSide === 'right' ? [handCard('main'), handCard('off')] : [handCard('off'), handCard('main')]) : [];
    const bodySlots = SLOTS.filter(([id]) => !['main', 'off', 'pack'].includes(id)).map(([id, label]) => {
      const x = worn[id], wslot = SLOT_TO_WORN[id], wid = wslot && c?.worn?.[wslot], key = 'slot-' + id;
      tips[key] = wid ? itemTip(wid) : id === 'outer' && c && c.armourClass ? { title: x[0], sub: 'outer torso · Armour Class', glyph: '▣', img: '', lines: ['Armour ' + (ARMOUR[c.armourClass]?.value || 0) + ' against every hit.', 'Sets your Armour Class.'], lore: '' } : { title: 'Empty', sub: label.toLowerCase(), glyph: '·', img: '', lines: [id === 'veil' ? 'The Veil: a special equipment type; its rules aren\'t written yet.' : 'Wear a piece here from your backpack.'], lore: '' };
      const acts = gearLocked || !wslot ? [] : [...(wid ? [{ key: key + '-x', label: 'Take off', go: () => { act({ type: 'gear/unequip', charId: c.id, slot: wslot }); this.setState({ gearMenu: null }); } }] : []), ...cand((it) => ITEM[it.item || it.id]?.slot === wslot, 'Wear', 'worn')];
      return { key, label, name: x ? x[0] : '—', ...tipHandlers(key), ...menuFor(key), acts, hasActs: acts.length > 0, noActs: !acts.length, noActText: gearLocked ? 'Change gear after the fight.' : id === 'outer' ? 'Armour Class comes from your kit for now.' : 'Nothing in the pack fits here.',
        hover2: () => this.setState({ hotSlot: id }),
        style: 'display: grid; grid-template-columns: 78px minmax(0, 1fr); gap: 2px 8px; align-items: center; padding: 5px 6px; border-radius: 6px; font-size: 12px; cursor: pointer; width: 100%; text-align: left; color: inherit; font: inherit; border: 0; background: ' + (S.hotSlot === id || S.gearMenu === key ? '#1C2536' : 'transparent'),
        nameStyle: 'font-weight: ' + (x ? '600; color: #E7EBF3' : '400; color: #5B6577') };
    });
    // (backpack rows: hover for details, click for actions)
    const rigView = rig.map((r) => { const key = 'rig-' + r.key, it = r.src || {}, id = it.item || it.id;
      tips[key] = (it.weapon && it.kind === 'weapon' ? weaponTip(it.weapon, it) : null) || (ITEM[id] && !it.mags && !it.calibre ? itemTip(id) : null) || { title: r.name, sub: r.tag.toLowerCase(), glyph: it.mags ? '▮' : it.calibre ? '⁝' : it.kind === 'plot' ? '◈' : '▪', img: '', lines: [r.note, r.kg].filter(Boolean), lore: '' };
      const acts = [...r.acts.map((a) => ({ ...a, go: () => { a.go(); this.setState({ gearMenu: null }); } })), ...((it.mags || it.calibre) && canLoad && !gearLocked ? [{ key: 'load', label: 'Load magazines', go: () => { act({ type: 'gear/load', charId: c.id }); this.setState({ gearMenu: null }); } }] : [])];
      return { ...r, ...tipHandlers(key), ...menuFor(key), acts, hasActs: acts.length > 0, noActs: !acts.length, noActText: gearLocked ? 'Change gear after the fight.' : 'Nothing to do with it here yet.',
        img: tips[key].img, hasImg: !!tips[key].img, noImg: !tips[key].img, glyph: tips[key].glyph,
        style: 'display: grid; grid-template-columns: 30px minmax(0, 1fr) auto; gap: 2px 8px; align-items: center; padding: 6px 8px; border-radius: 8px; cursor: pointer; font-size: 12px; background: ' + (S.gearMenu === key ? '#1C2536' : '#0D1119') + '; border: 1px solid #1C2536' }; });
    // Plot items (the Narrator's story things) get their own group under the backpack.
    const plotView = rigView.filter((r) => r.src && r.src.kind === 'plot'), packView = rigView.filter((r) => !(r.src && r.src.kind === 'plot'));
    const TIP = S.tip && tips[S.tip.key];
    const tipCard = TIP ? { ...TIP, lines: TIP.lines.map((t, i) => ({ key: i, t })), hasImg: !!TIP.img, noImg: !TIP.img, hasLore: !!TIP.lore,
      style: 'position: fixed; z-index: 40; left: ' + S.tip.x + 'px; ' + (S.tip.b != null ? 'bottom: ' + S.tip.b + 'px; max-height: calc(100vh - ' + (S.tip.b + 8) + 'px)' : 'top: ' + S.tip.y + 'px; max-height: calc(100vh - ' + ((S.tip.y || 0) + 8) + 'px)') + '; overflow: hidden; box-sizing: border-box; width: 260px; display: flex; flex-direction: column; gap: 6px; padding: 12px; border-radius: 12px; background: #10151F; border: 1px solid #3B475D; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6); pointer-events: none' } : null;

    const lvlOf = (k) => { let l = D.wm.levels[0]; D.wm.levels.forEach((x) => { if (k >= x.kills) l = x; }); return l; };
    const mastery = c ? Object.entries(c.weaponKills).filter(([, k]) => k > 0).map(([fid, kills]) => {
      const fam = D.wm.families.find((f) => f.id === fid) || { name: fid }, lv = lvlOf(kills), nx = D.wm.levels[lv.level + 1];
      const pk = D.wm.perks.filter((p) => p.family === fid && p.mastery_level <= lv.level).map((p) => p.name);
      return { key: fid, name: fam.name, level: 'L' + lv.level + ' ' + lv.name, kills: kills + (kills === 1 ? ' kill' : ' kills') + (nx ? ' · ' + nx.name + ' at ' + nx.kills : ''),
        bonus: '+' + (lv.attack_bonus || 0) + ' to hit', perk: pk.length ? 'Perk: ' + pk.join(', ') : 'Perk at ' + D.wm.levels[1].kills + ' kills',
        fill: 'height: 100%; border-radius: 99px; background: #E7EBF3; width: ' + (nx ? Math.round((kills - lv.kills) / (nx.kills - lv.kills) * 100) : 100) + '%' };
    }) : [];
    const kit = c ? (D.kits.find((k) => k.id === c.kit) || {}).name : '';
    const I = (c && c.identity) || {};
    const bio = c ? [['Origin', c.origin], ['Kit', kit], ['Gender', I.gender], ['Blood type', I.blood], ['Main hand', I.hand], ['Association', I.association], ['Favourite song', I.songTitle ? I.songTitle + (I.songArtist ? ' · ' + I.songArtist : '') : I.song], ['Last dream', I.dream], ['History', I.history]]
      .filter(([, v]) => v).map(([k, v]) => ({ k, v })) : [];
    const lvlUp = c && (c.unspent.skill + c.unspent.attr + c.unspent.core > 0 || (c.level >= 3 && !c.classId) || pendingPerkSteps(c).length > 0);
    const pc = c ? { name: c.name, img: c.portrait, line1: [I.association, c.origin].filter(Boolean).join(' · ') || c.origin,
      line2: 'Level ' + c.level + ' · ' + (c.classId ? classLabel(c) : 'No class yet') + (c.dead ? ' · DEAD' : ''), hasCls: !!c.classId, clsIcon: emblemOf(c.advancedClass || c.classId).icon } : { name: 'Spectating', img: IMG['wick-welcome'], line1: 'You have no character in this session.', line2: '', hasCls: false, clsIcon: '' };
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
      if (e.kind === 'scene') return { ...base, isScene: true, text: e.text.toUpperCase() };
      if (e.kind === 'art') return { ...base, isArt: true, img: ART(e.art), zoom: zoomer(this, ART_BIG(e.art), e.text, 'world') };
      if (e.kind === 'narration') {
        // Rerolls and edits (spec: Rerolls and edits): players suggest, the host starts a vote, everyone must agree.
        const V = g.votes || { turns: [], open: null }, canReroll = V.turns.includes(e.id) && !e.rerolled, busyVote = !!(V.open && V.open.status === 'open');
        const ask = (kind) => { const note = window.prompt(kind === 'reroll' ? 'What should the Narrator do differently? (optional)' : 'How should it be reworded? Only the words change, never what happened.', ''); if (note === null) return null; return note; };
        const undoText = () => { const i = g.story.entries.findIndex((x) => x.id === e.id), after = g.story.entries.slice(i + 1); const pl = after.filter((x) => x.kind === 'player').length, ck = after.filter((x) => x.kind === 'check').length, fights = after.filter((x) => x.kind === 'combat' && /^Combat: /.test(x.text)).map((x) => x.text.replace(/^Combat: /, ''));
          return [pl ? pl + (pl === 1 ? ' player action' : ' player actions') : '', ck ? ck + (ck === 1 ? ' roll' : ' rolls') : '', fights.length ? 'the fight ' + fights.join(', ') : ''].filter(Boolean).join(', ') || 'nothing after it'; };
        const voteActs = e.rerolled || !c ? [] : isHost
          ? [...(canReroll ? [{ key: 'r', label: '⟲ Vote to reroll', title: 'Everyone must agree. Undoes this turn and everything after it.', go: () => { if (busyVote) return toast('A vote is already under way.'); const n = ask('reroll'); if (n !== null) act({ type: 'vote/start', kind: 'reroll', entryId: e.id, note: n, undo: undoText() }); } }] : []),
             { key: 'e', label: '✎ Vote to reword', title: 'Everyone must agree. Only the words change.', go: () => { if (busyVote) return toast('A vote is already under way.'); const n = ask('edit'); if (n !== null) act({ type: 'vote/start', kind: 'edit', entryId: e.id, note: n }); } }]
          : [...(canReroll ? [{ key: 'r', label: '⟲ Suggest reroll', title: 'The host can put it to a vote.', go: () => { const n = ask('reroll'); if (n !== null) { act({ type: 'vote/suggest', kind: 'reroll', entryId: e.id, note: n }); toast('Suggested to the host.', true); } } }] : []),
             { key: 'e', label: '✎ Suggest rewording', title: 'The host can put it to a vote.', go: () => { const n = ask('edit'); if (n !== null) { act({ type: 'vote/suggest', kind: 'edit', entryId: e.id, note: n }); toast('Suggested to the host.', true); } } }];
        return { ...base, ...readFor(e), isNarration: true, paras: e.text.split(/\n\s*\n/).map((t) => ({ text: t.trim() })).filter((x) => x.text),
          wrapStyle: 'display: flex; flex-direction: column; gap: 12px' + (e.rerolled ? '; opacity: 0.45' : ''), pStyle: "margin: 0; font-family: 'Spectral', serif; font-size: 18px; line-height: 1.7; color: #DCE2EC" + (e.rerolled ? '; text-decoration: line-through' : ''),
          hasTag: !!(e.rerolled || e.original), tag: e.rerolled ? 'REROLLED BY VOTE' : '✎ REWORDED BY VOTE', tagStyle: 'font-size: 11px; font-weight: 700; letter-spacing: 0.14em; color: #A3AEC2',
          voteActs, hasVoteActs: voteActs.length > 0 };
      }
      if (e.kind === 'player') {
        const p = playerOf(e.who), first = Object.values(g.characters).find((x) => x.owner === e.who);
        return { ...base, isPlayer: true, roll: !!e.roll, img: first ? first.portrait : IMG['wick-welcome'], nameStyle: 'color: ' + p.color + '; font-weight: 600',
          imgStyle: 'width: 40px; height: 40px; object-fit: cover; border-radius: 50%; background: #000; flex: none; border: 2px solid ' + p.color };
      }
      if (e.kind === 'voice' || e.kind === 'overreach') {
        const s = SK[e.skill] || D.skills[0], ink = ATTR[s.attr].ink, ch = charOf(e.charId);
        return { ...base, ...readFor(e, CORE_VOICE[SKILL[e.skill]?.core] || undefined), isVoice: true, img: s.img, zoom: zoomer(this, s.img, s.name, 'skill'), head: (mine.length > 1 && ch ? ch.name.toUpperCase() + ' · ' : '') + e.head, headStyle: 'font-size: 12px; font-weight: 700; letter-spacing: 0.16em; color: ' + ink,
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
    const comboOf = (ch, ids) => { const mods = ids.map((i) => mod(ch.skills[i] || 0)), low = Math.min(...mods), lowIx = mods.indexOf(low);
      const bonus = ids.filter((i, k) => k !== lowIx && (ch.skills[i] || 0) > 0).length * 2; return { low, bonus, total: low + bonus, lowId: ids[lowIx] }; };
    // The bar above the chat is for checks the Narrator calls; a point of interest's attempt is rolled in its own popup.
    const actions = myChecks.filter((k) => !k.poi).map((k) => { const ch = charOf(k.charId), cb = comboOf(ch, k.skills), ink = ATTR[SK[k.skills[0]].attr].ink;
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
      const ch = charOf(ck.charId), cb = comboOf(ch, ck.skills), ink = ATTR[SK[ck.skills[0]].attr].ink, r = ck.roll;
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
        .concat((() => { const ns = npcsOf({ ...g, story: { ...g.story } }).filter((n) => !n.hidden), faces = castMany(g, ns.map((n) => ({ key: n.id, current: ART(n.portrait) || null, tags: npcTags(n.name, n.tier, n.weapon) })), taken); return ns.map((n) => ({ id: n.id, side: 'foe', npc: n, name: n.name, short: n.name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase(), img: faces.get(n.id) || '',
          pos: n.pos, hp: ENEMY[n.tier]?.hp || 30, maxHp: ENEMY[n.tier]?.hp || 30, analyzedBy: n.analyzed ? 'party' : undefined, injuries: [], downed: false, dead: false })); })());
    // Drones stand on the area map as tokens of their own (Drone Handler): the engine places them (positionsOf).
    if (!inFight) for (const x of Object.values(g.characters)) for (const k of x.companions || []) { const id = 'cp-' + x.id + '-' + k.id; if ((k.kind === 'drone' || k.kind === 'beast' || k.kind === 'twin') && pos[id] && !x.dead) { const mx = k.kind === 'twin' ? (k.maxHp || k.hp || 1) : (COMPANION_KINDS[k.kind]?.hp ?? 30); units.push({ id, side: 'pc', companion: k.kind, ctrl: x.id, name: k.kind === 'twin' ? 'The twin' : k.name || (k.kind === 'beast' ? 'Beast' : 'Drone'), short: k.kind === 'twin' ? 'TW' : k.kind === 'beast' ? 'BE' : 'DR', img: k.kind === 'twin' ? (k.img || '') : '', pos: pos[id], hp: k.hp ?? mx, maxHp: mx, ap: 0, injuries: [], downed: false, dead: false }); } }
    const tok = {}; units.forEach((u) => { tok[u.pos] = u; });
    const objs = (inFight && cb ? cb.objects : g.story.objects) || defaultObjects(map), objAt = {};
    objs.forEach((o) => { if (!objAt[o.pos] || kindOf(o).blocks_move) objAt[o.pos] = o; });
    const cov = {}; objs.forEach((o) => { const k = coverKind(o); if (k) cov[o.pos] = { kind: k }; });
    const solid = new Set(map.solid), diff = new Set([...map.difficult, ...objs.filter(isDifficult).map((o) => o.pos)]);
    const interesting = (o) => o && (o.approaches.length || ['poi', 'door', 'barricade', 'container', 'terminal', 'exit', 'trap', 'hole'].includes(o.kind));
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
    const MAGIC_W = ['draw', 'evoke', 'scuff', 'vent', 'core', 'outburst', 'release', 'syphon', 'crystallise'], M_INSTANT = ['scuff', 'vent', 'core', 'syphon', 'crystallise'], isMagicW = MAGIC_W.includes(W);
    const sameMap = !g.story.glyphMap || g.story.glyphMap === map.id;
    const GLY = inFight ? g.combat?.glyphs || [] : sameMap ? g.story.glyphs || [] : [], ZON = inFight ? g.combat?.zones || [] : sameMap ? g.story.zones || [] : [];
    const glAt = {}; GLY.forEach((x) => { (glAt[x.pos] ||= []).push(x); });
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
    let mHint = '', mReady = false, mLabel = 'Confirm', drawInfo = null, evW = null;
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
        const dw = wordSel ? drawStrip(cbx, u).words.find((x) => x.id === wordSel) : null; drawInfo = dw;
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
        if (!designSel) mHint = 'You have no designs ready: make one on the MAGIC tab.';
        else {
          const hold = !!S.wHold, pv = previewOutburst(cbx, u, designSel.id, S.wAim || undefined, !hold);
          if (!hold) { reachAround(pv.range || designRange(u.mg || soulM(c), designSel), SOUL_VIOLET); if (S.wAim) mHi.aim = S.wAim; }
          const costs = pv.ok || pv.cost || pv.ap ? pv.cost + ' MP · ' + pv.ap + ' AP · +' + pv.strain + ' Strain' : ''; // an early refusal comes back with no costs
          if (pv.ok) { mReady = true; mLabel = (hold ? 'Begin and hold · ' : 'Let it go · ') + pv.ap + ' AP';
            mHint = (hold ? 'Begin ' + designSel.name + ' and hold it: it grows each round (and strains the heart) until you Release it for 1 AP. ' : designSel.name + ' at ' + refOf(S.wAim) + '. ') + costs + '.'
              + (hold ? '' : touches(cbx, spellTargets(cbx, u, 'outburst', undefined, S.wAim, designSel.id))); }
          else mHint = designSel.name + (costs ? ' (' + costs + ')' : '') + ': ' + (pv.why === 'Pick a target tile.' ? 'click a tile within ' + pv.range + ' tiles to aim, or switch to Hold.' : pv.why || 'not now.');
        }
      } else if (W === 'release') {
        const d = MN.held && myDesigns.find((x) => x.id === MN.held.design), r = d ? designRange(u.mg || soulM(c), d) : 0;
        if (!d) mHint = 'Nothing held.';
        else { reachAround(r, SOUL_VIOLET); if (S.wAim) mHi.aim = S.wAim;
          const why = dryMagic(cbx, u.id, (cc, uu, rng) => releaseOutburst(cc, rng, uu, S.wAim || undefined)).err;
          if (!S.wAim && (!why || why === 'Pick a target tile.')) mHint = 'Click a tile within ' + r + ' tiles to release ' + d.name + ' (stage ' + MN.held.stage + ', 1 AP).';
          else if (why) mHint = 'Release ' + d.name + ': ' + why;
          else { mReady = true; mLabel = 'Release · 1 AP'; mHint = 'Release ' + d.name + ' at ' + refOf(S.wAim) + ' (stage ' + MN.held.stage + ').' + touches(cbx, spellTargets(cbx, u, 'release', undefined, S.wAim)); } }
      } else if (M_INSTANT.includes(W)) {
        const run = { scuff: mgScuff, vent: mgVent, core: mgSwapCore, syphon: mgSyphon, crystallise: mgCrystallise }[W], why = dryMagic(cbx, u.id, (cc, uu) => run(cc, uu)).err;
        const say = { scuff: 'Wipe out the glyphs on your own tile (1 AP).', vent: 'Let ' + MN.flux + ' Flux out of the Evoker into the air (1 AP): it thickens the mana.', core: 'Load a fresh core: charge back to ' + CORE_CHARGE + ' (2 AP, ' + MN.cores + ' spare).',
          syphon: 'Pull MP from the air (1 AP): about ' + Math.round(MN.band.syphon_mp * (u.mg?.syphon || 1)) + ' MP in ' + bandName(MN.band) + ' air; the air thins by 2.', crystallise: 'Crystallise a mana core out of the air (3 AP): needs mana 10 or more, and drops it by 10.' }[W];
        mHint = say + (why ? ' Not now: ' + why : ''); mReady = !why; mLabel = { scuff: 'Scuff', vent: 'Vent Flux', core: 'Swap core', syphon: 'Syphon', crystallise: 'Crystallise' }[W] + ' · ' + { scuff: 1, vent: 1, core: 2, syphon: 1, crystallise: 3 }[W] + ' AP';
      }
    }
    const wMagic = {
      showWords: !!(mOpen && W === 'draw' && myWords.length), showDesigns: !!(mOpen && W === 'outburst' && myDesigns.length),
      words: myWords.map((w) => { const on = w === wordSel, def = SIGIL[w]; return { key: w, img: glyphUri(w, SIGIL_INK, { glow: on }), word: def.word, charge: String(def.charge), title: on && drawInfo ? drawInfo.title : def.word + ' · ' + def.text, pressed: on ? 'true' : 'false',
        pick: () => this.setState({ wWord: w }), style: 'display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 4px 2px; border-radius: 8px; font-family: inherit; font-size: 9px; font-weight: 700; letter-spacing: 0.04em; cursor: pointer; color: ' + (on ? '#E7EBF3' : SIG_CYAN) + '; border: 1px solid ' + (on ? SIG_CYAN : '#232D3F') + '; background: ' + (on ? epRgba(SIG_CYAN, 0.16) : '#10151F') }; }),
      designs: myDesigns.map((d) => { const on = designSel && d.id === designSel.id; return { key: d.id, name: d.name, sub: [d.school, d.school2].filter(Boolean).map((x) => SCHOOL[x]?.name || x).join(' + ') + (d.modules.length ? ' · ' + d.modules.map((x) => MODULE[x]?.name || x).join(', ') : ''),
        pressed: on ? 'true' : 'false', pick: () => this.setState({ wDesign: d.id, wAim: null }), style: 'display: flex; flex-direction: column; align-items: flex-start; gap: 1px; width: 100%; padding: 6px 10px; border-radius: 8px; text-align: left; font-family: inherit; font-size: 12px; font-weight: 700; cursor: pointer; color: #E7EBF3; border: 1px solid ' + (on ? SOUL_VIOLET : '#232D3F') + '; background: ' + (on ? epRgba(SOUL_VIOLET, 0.14) : '#10151F') }; }),
      holdLabel: S.wHold ? 'Hold it (release later)' : 'Let it go now', holdPressed: S.wHold ? 'true' : 'false', toggleHold: () => this.setState({ wHold: !this.state.wHold, wAim: null }),
      holdStyle: 'min-height: 32px; border-radius: 8px; font-family: inherit; font-size: 12px; font-weight: 700; cursor: pointer; color: ' + SOUL_VIOLET + '; border: 1px solid ' + SOUL_VIOLET + '; background: ' + (S.wHold ? epRgba(SOUL_VIOLET, 0.16) : 'transparent'),
    };
    const magicClick = (k) => {
      if (W === 'draw') { if (!wordSel) return toast('You know no words.'); act({ type: 'world/act', charId: mover.id, act: 'draw', word: wordSel, tile: k }); return; }
      if (W === 'evoke') {
        const cbx = scb(), u = sU(cbx);
        const v = S.wTile && cbx && u && glAt[S.wTile] ? evokeView(cbx, u, S.wTile, S.wEvc || {}, null, knowsW) : null;
        const r = evokeClick(v, cbx || { glyphs: GLY }, u, k, S.wEvc || {});
        if (r.pattern !== undefined) return this.setState({ wTile: r.pattern, wEvc: {} });
        if (r.choice) return this.setState({ wEvc: r.choice });
        return toast(r.toast || 'Click a glyph of a Line.');
      }
      if (W === 'outburst') { if (S.wHold) return toast('Holding needs no target: Confirm to begin.'); return this.setState({ wAim: k }); }
      if (W === 'release') return this.setState({ wAim: k });
      return toast('No tile needed: Confirm.');
    };
    const magicConfirm = () => {
      const base = { type: 'world/act', charId: c.id, act: W };
      if (W === 'evoke') { const cbx = scb(), u = sU(cbx), v = cbx && u && S.wTile ? evokeView(cbx, u, S.wTile, S.wEvc || {}, null, knowsW) : null; if (v && v.payload) act({ ...base, ...v.payload }); }
      else if (W === 'outburst') act({ ...base, design: designSel.id, hold: !!S.wHold, ...(!S.wHold && S.wAim ? { aim: S.wAim } : {}) });
      else if (W === 'release') act({ ...base, aim: S.wAim });
      else act(base);
      this.setState({ wTile: null, wAim: null, wEvc: null });
      if (getState().game?.phase === 'combat') { this.setState({ area: false }); go('combat'); }
    };
    // ---------- planning on the area map, as on the combat grid (Leon, combat feel v1) ----------
    // Move, Sprint and Sneak show the tiles you can reach this round (dashed) and, on hover, the path and its AP cost.
    // Shot, Aimed shot and Melee show the weapon's reach as a red grid around you: targets in it are outlined in red, the
    // rest dimmed, and hovering one shows the engine's hit chance and AP. All of it comes from the engine (paths,
    // apForTiles, previewAttack, lineOfSight) on the story map as a throwaway fight; nothing here is a rule of its own.
    const plan = { reach: new Set(), route: {}, hv: null, cost: '', red: new Map(), tgt: {}, info: '', isMove: false, isAtk: false };
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
          if (hv) { plan.hv = hv; plan.cost = '−' + costOf(hv) + ' AP · ' + P.dist[hv] + (P.dist[hv] === 1 ? ' tile' : ' tiles');
            plan.info = (W === 'sprint' ? 'Sprint' : W === 'sneak' ? 'Sneak' : W === 'drone' ? 'The drone flies' : W === 'beast' ? 'The beast pads' : W === 'twin' ? 'The twin steps' : 'Move') + ' to ' + refOf(hv) + ': ' + P.dist[hv] + (P.dist[hv] === 1 ? ' tile' : ' tiles') + ', ' + costOf(hv) + ' AP (' + u.ap + ' left).';
            for (let k = hv, n = 0; P.prev[k] && k !== u.pos && n < 400; n++) { const p = P.prev[k], [ax, ay] = p.split(',').map(Number), [bx, by] = k.split(',').map(Number); plan.route[p] = ARROWS[(bx - ax) + ',' + (by - ay)]; k = p; } }
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
    const sgTiles = evW ? mergeTiles((placedW && placedW.tiles) || {}, evW.tiles) : (placedW && placedW.tiles) || {};
    const cellsFor = (labels, onClick) => {
      const out = [], lab = (key, text) => ({ key, isLabel: true, isTile: false, text, style: 'display: grid; place-items: center; font-size: 10px; font-weight: 700; letter-spacing: 0.06em; color: #7F8BA1' });
      if (labels) { out.push(lab('h-', '')); for (let x = 0; x < map.w; x++) out.push(lab('h' + x, refOf(x + ',0').replace(/\d+$/, ''))); }
      for (let y = 0; y < map.h; y++) {
        if (labels) out.push(lab('r' + y, String(y + 1)));
        for (let x = 0; x < map.w; x++) { const k = x + ',' + y, u = tok[k], p = u && u.side === 'pc' ? playerOf(charOf(u.charId)?.owner) : null, ref = refOf(k), note = notesAt(map, k)[0] || '', o = objAt[k];
          const what = solid.has(k) ? 'blocked' : o && o.kind !== 'crate' && o.kind !== 'pillar' ? o.name + (o.hp != null ? ' (' + o.hp + '/' + o.max + ' HP)' : '') + (o.locked ? ', locked' : o.open ? ', open' : '') + (o.approaches.length ? ', ' + o.approaches.length + ' approaches' : '') : cov[k] ? cov[k].kind + ' cover' : diff.has(k) ? 'slow ground' : 'open';
          const spr = o ? spriteOf(g, o) : '';
          const gl = glAt[k] || [], held = u ? heldOf(u) : null, sgT = sgTiles[k];
          const sgDim = labels && evW && evW.area.size > 0 && evW.stage !== 'stand' && !evW.area.has(k) && !evW.pickable.has(k) && !evW.stepTo.has(k) && !evW.orderTo.has(k) && k !== myAt;
          const sgLayer = [sgT && sgT.layer, sgDim ? 'background: rgba(5, 7, 11, 0.5)' : ''].filter(Boolean).join('; ');
          const mWhat = (gl.length ? ' · glyphs: ' + gl.map((x) => glyphMark(x, 'pc', knowsW).title).join(', ') : '') + (sgT && sgT.note ? ' · ' + sgT.note : '') + (held ? ' · holding an Outburst, stage ' + held.stage : '');
          const mStyle = !labels ? '' : (mHi.pattern.has(k) ? '; outline: 2px solid ' + SIG_CYAN + '; outline-offset: -2px' : mHi.aim === k ? '; outline: 2px solid #FFFFFF; outline-offset: -2px' : '') + (mHi.reach.has(k) ? '; box-shadow: inset 0 0 0 2px ' + epRgba(mHi.reachCol, 0.45) : '');
          const glyph = o && !u && !spr && !(cov[k] && (o.kind === 'crate' || o.kind === 'pillar')) ? kindOf(o).glyph : '';
          // The planning layer (area map only): reachable tiles and the path; an attack's red reach and its targets.
          const pT = labels && plan.isAtk ? plan.tgt[k] : null, inRed = labels && plan.isAtk && plan.red.has(k), canGo = labels && plan.isMove && plan.reach.has(k) && !u;
          const planStyle = !labels ? '' : plan.hv === k && plan.isMove ? 'border: 2px solid #FFFFFF; background: rgba(255, 255, 255, 0.28)'
            : plan.route[k] && k !== myAt ? 'border: 1px dashed rgba(231, 235, 243, 0.8); background: rgba(255, 255, 255, 0.2)'
            : canGo ? 'border: 1px dashed rgba(231, 235, 243, 0.55); background: rgba(231, 235, 243, 0.08)'
            : inRed ? 'border: 1px dashed ' + epRgba(RANGE_RED, [0.9, 0.55, 0.35, 0.25][Math.min(3, plan.red.get(k) || 0)]) + '; background: ' + epRgba(RANGE_RED, plan.hv === k ? 0.3 : [0.2, 0.11, 0.06, 0.04][Math.min(3, plan.red.get(k) || 0)]) : '';
          const tgtMark = !pT ? '' : pT.inRange ? (S.wTarget && u && u.id === S.wTarget ? '' : '; outline: 2px solid ' + RANGE_RED + '; outline-offset: -2px') : '; filter: grayscale(0.7) brightness(0.55)';
          out.push({ key: k, cls: 'phc-tok' + (pT && pT.inRange ? ' phc-plan-target' : ''),
            hasPlan: !!planStyle, planStyle: 'position: absolute; inset: 0; z-index: 1; pointer-events: none; box-sizing: border-box; border-radius: 2px; ' + planStyle,
            hasArrow: labels && !!plan.route[k] && k !== myAt, arrow: plan.route[k] || '', hasCost: labels && plan.hv === k && !!plan.cost, cost: plan.cost,
            costStyle: 'position: absolute; left: 50%; top: -12px; transform: translateX(-50%); z-index: 6; padding: 2px 6px; border-radius: 6px; font-size: 11px; font-weight: 700; white-space: nowrap; pointer-events: none; '
              + (plan.isAtk ? 'background: ' + RANGE_RED + '; color: #0A0D13' : 'background: #FFFFFF; color: #0A0D13'), isLabel: false, isTile: true, has: !!u, glyph, hasGlyph: !!glyph, hasSprite: !!spr, sprite: spr, spriteStyle: o ? spriteStyle(o) : '', glyphStyle: 'position: absolute; inset: 0; display: grid; place-items: center; font-size: ' + (labels ? 18 : 9) + 'px; line-height: 1; color: ' + (o && (o.approaches.some((a) => !a.tries.length) || o.kind === 'poi') && !o.resolved ? '#FFFFFF' : o && (kindOf(o).hazard || o.kind === 'trap') ? '#F65157' : '#C9D3E3'),
            click: interesting(o) && labels && W === 'move' ? () => openObj(o) : onClick(k), hover: () => { if (this.state.hoverTile !== k) this.setState({ hoverTile: k }); },
            t: u ? tokenVals(u, { ref, ally: u.side === 'pc', player: p ? p.initials + ' · ' + p.name.toUpperCase() : u.npc ? u.npc.side.toUpperCase() + ' · ' + u.npc.tier.toUpperCase() : '', color: p ? p.color : u.npc && u.npc.side === 'neutral' ? '#A3AEC2' : '#F65157', inFight, right: x >= map.w / 2, up: y >= map.h / 2 }) : null,
            hasTrail: !!trailAt[k] && !u, trailStyle: trailAt[k] ? 'position: absolute; left: 50%; top: 50%; width: ' + (labels ? 10 : 5) + 'px; height: ' + (labels ? 10 : 5) + 'px; margin: -' + (labels ? 5 : 2.5) + 'px 0 0 -' + (labels ? 5 : 2.5) + 'px; border-radius: 50%; z-index: 2; pointer-events: none; background: ' + trailAt[k] + '; box-shadow: 0 0 0 2px rgba(5, 7, 11, 0.6)' : '',
            picked: S.wTarget && u && u.id === S.wTarget,
            glyphs: gl.slice(0, 2).map((x, i) => { const ours = x.side === 'pc';
              return { key: x.id, src: glyphMark(x, 'pc', knowsW).src,
                style: 'position: absolute; z-index: 3; width: 44%; height: 44%; pointer-events: none; ' + (i ? 'right: 3%; bottom: 3%' : 'left: 3%; top: 3%') + (ours ? '; filter: drop-shadow(0 0 2px ' + SIG_CYAN + ')' : '; opacity: 0.7') }; }),
            hasZone: !!sgLayer, zoneStyle: 'position: absolute; inset: 0; z-index: 1; pointer-events: none; box-sizing: border-box; ' + sgLayer,
            hasSg: labels && !!(sgT && sgT.marks.length), sg: labels && sgT ? sgT.marks : [],
            hasHeart: !!held, heart: held ? heartUri(held.stage) : '', heartStyle: 'position: absolute; z-index: 4; right: -6%; top: -6%; width: 40%; height: 40%; pointer-events: none; filter: drop-shadow(0 0 3px ' + SOUL_VIOLET + ')',
            label: ref + (u ? ': ' + u.name : '') + ' · ' + what + (note ? ' · ' + note : '') + mWhat, title: u ? '' : ref + ' · ' + what + mWhat + (note ? '\n' + note : ''),
            style: 'position: relative; display: block; aspect-ratio: 1; padding: 0; border: 0; border-radius: 1px; cursor: ' + (mover && !u && !solid.has(k) && !cov[k] ? 'pointer' : 'default') + '; background: ' + (u && !mapArt ? '#0D1119' : cellBg(k)) + ((S.wTarget && u && u.id === S.wTarget) || (S.wTarget && !u && o && S.wTarget === 'obj:' + o.id) ? '; outline: 2px solid #FFFFFF; outline-offset: -2px' : '') + mStyle + tgtMark });
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
        const best = c ? (() => { const mods = a.skills.map((s) => mod(c.skills[s] || 0)), low = Math.min(...mods), li = mods.indexOf(low); return low + 2 * a.skills.filter((s, j) => j !== li && (c.skills[s] || 0) > 0).length; })() : 0;
        return { key: i, label: a.label, stakes: a.stakes, skills: a.skills.map((s) => ({ key: s, name: SK[s] ? SK[s].name : s, style: 'padding: 1px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; border: 1px solid ' + (SK[s] ? ATTR[SK[s].attr].ink : '#A3AEC2') + '; color: ' + (SK[s] ? ATTR[SK[s].attr].ink : '#A3AEC2') })),
          tn: tnWord(a.tn).toUpperCase() + ' ' + a.tn + (c ? ' · YOU ROLL d20 ' + fmt(best) : '') + (a.success ? ' · SUCCESS: ' + ({ remove: 'CLEARS IT', open: 'OPENS IT', reveal: 'REVEALS', disarm: 'DISARMS' }[a.success]) : ''),
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
    const mini = cellsFor(false, () => () => this.setState({ area: true }));
    const worldClick = (k) => () => {
      if (!mover) return toast(inFight ? 'A fight is on: act on the combat grid.' : 'You have no character to act with.');
      const u = tok[k];
      if (isMagicW) return magicClick(k);
      if (pkTargeted) { if (!u || u.charId === mover.id) return toast('Click someone else.'); if (wPkE.target === 'ally' && u.side !== 'pc') return toast('Click an ally.'); return this.setState({ wTarget: u.id }); }
      if (pkTile) return this.setState({ wTile: k });
      if (pkObj) { const o = objAt[k]; if (!o || o.hidden) return toast('Click an object on the map.'); return this.setState({ wTarget: 'obj:' + o.id }); }
      if (TARGETED.includes(W)) {
        // Anyone and anything is a target (spec: Anyone is a target): people, allies, points of interest, objects.
        const attacking = ['shot', 'aimed', 'melee'].includes(W), o = objAt[k];
        if (W === 'stim') { if (!u || u.side !== 'pc') return toast('Click an ally.'); return this.setState({ wTarget: u.id }); }
        if (u && u.charId === mover.id) return toast('Pick someone else.');
        if (W === 'analyze') { if (!u || u.side !== 'foe') return toast('Click a person or enemy on the map.'); return this.setState({ wTarget: u.id }); }
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
    const W_UTIL = wWa ? ['reload', 'load', 'clear', 'repair'].map((id) => wWA(id)).filter(Boolean).map((a) => [a.id, a.label, a.ap + ' AP']) : [['reload', 'Reload', '2 AP'], ['load', 'Load a magazine', 'AP by rounds'], ['clear', 'Clear a jam', '2 AP'], ['repair', 'Field Repair', '2 AP']];
    const W_ITEMS = [
      ['MOVEMENT', [['move', 'Move', '1 AP / ' + mv + (mv === 1 ? ' tile' : ' tiles')], ['sprint', 'Sprint', '2 AP · ' + Math.floor(3 * mv) + ' tiles'], ['sneak', 'Sneak', '+1 AP a tile'],
        ...(myDrone() ? [['drone', 'Move the drone', myDrone().ap + ' AP left']] : []), ...(myBeast() ? [['beast', 'Move the beast', myBeast().ap + ' AP left']] : []), ...(myTwin() ? [['twin', 'Move the twin', myTwin().ap + ' AP left']] : [])]],
      ['ATTACK & DEFEND', [...(wW && !wMelee ? [['shot', 'Shot', attackApCost(wW, 'shot') + ' AP'], ['aimed', 'Aimed shot', attackApCost(wW, 'aimed') + ' AP']] : []), ['melee', wMelee ? 'Strike' : 'Melee (fists)', (wW && wMelee ? attackApCost(wW, 'melee') : 2) + ' AP'], ['analyze', 'Analyze', '2 AP']]],
      ['UTILITY', [...W_UTIL, ['stim', 'Stim an ally', '1–2 AP'], ['prone', 'Drop prone / stand', '1 AP']]],
      ...(wPk.some((e) => e.tab === 'perks') ? [['PERKS & TRAITS', wPk.filter((e) => e.tab === 'perks').map((e) => [pkId(e), e.label, pkCost(e)])]] : []),
      ...(wPk.some((e) => e.tab === 'class') ? [['CLASS · ' + (wKlass ? wKlass.name.toUpperCase() : 'MOVES'), wPk.filter((e) => e.tab === 'class').map((e) => [pkId(e), e.label, pkCost(e)]), wKlass ? wKlass.ink : null]] : []),
      // Magic, only for those who have it: Sigils in cyan, Outbursts in violet (never mixed).
      ...(hasMagic && (myWords.length || evoW) ? [['MAGIC · SIGILS', [['draw', 'Draw a glyph', glyphAp(c) + ' AP'], ['evoke', 'Evoke', '1 AP'], ['scuff', 'Scuff', '1 AP'], ['vent', 'Vent Flux', '1 AP'], ['core', 'Swap core', '2 AP']], SIG_CYAN]] : []),
      ...(hasMagic && (myDesigns.length || MN.held || emaW) ? [['MAGIC · OUTBURSTS', [...(myDesigns.length ? [['outburst', 'Outburst', (() => { const mm = soulM(c), aps = myDesigns.map((d) => designAp(mm, d)), lo = Math.min(...aps), hi = Math.max(...aps); return (lo === hi ? lo : lo + '–' + hi) + ' AP'; })()]] : []),
        ...(MN.held ? [['release', 'Release', '1 AP']] : []), ...(emaW ? [['syphon', 'Syphon', '1 AP'], ['crystallise', 'Crystallise', '3 AP']] : [])], SOUL_VIOLET]] : []),
    ];
    const canAct = !!mover && mover.hp > 0 && g.story.await === 'players' && !(g.story.ended || {})[c.id];
    const wGroups = W_ITEMS.map(([name, items, ink]) => ({ name, style: 'margin-top: 4px; font-size: 11px; font-weight: 700; letter-spacing: 0.16em; color: ' + (ink || '#A3AEC2'), items: items.map(([id, label, cost]) => ({ key: id, name: label, cost, locked: !canAct, pressed: W === id ? 'true' : 'false',
      pick: () => this.setState({ wAct: id, wTarget: null, wTile: null, wAim: null, wEvc: null }),
      style: 'display: flex; justify-content: space-between; align-items: center; gap: 8px; min-height: 36px; padding: 0 10px; border-radius: 8px; font-family: inherit; font-size: 13px; cursor: pointer; color: #E7EBF3; ' + (W === id ? 'border: 1px solid #E7EBF3; background: #1C2536' : 'border: 1px solid #232D3F; background: #10151F') })) }));
    const pkTargeted = !!wPkE && ['unit', 'enemy', 'ally', 'npc'].includes(wPkE.target);
    const pkTile = !!wPkE && wPkE.target === 'tile', pkObj = !!wPkE && wPkE.target === 'object';
    const wDet = wPkE && S.wDetailFor === W ? String(S.wDetail || '').trim() : '';
    const isAttack = ['shot', 'aimed', 'melee'].includes(W), instant = ['reload', 'load', 'clear', 'repair', 'prone'].includes(W) || (!!wPkE && !pkTargeted && !pkTile && !pkObj && !wPkE.why);
    const wHint = wPkE && mover && canAct ? (wPkE.why ? wPkE.why : (pkTargeted ? (tgt ? 'Target: ' + tgt.name + '. ' : wPkE.target === 'ally' ? 'Click an ally. ' : 'Click someone on the map. ') : pkTile ? (S.wTile ? 'Tile ' + refOf(S.wTile) + '. ' : 'Click a tile. ') : pkObj ? (tgt && tgt.obj ? 'Target: ' + tgt.name + '. ' : 'Click an object. ') : '') + pkText(wPkE) + ' Confirm to use it.') : !mover ? 'You have no character to act with.' : mover.hp <= 0 ? mover.name + ' is Downed: an ally\'s stim' + (SB ? '' : ', or the Narrator,') + ' gets them up. End turn when ready.' : !canAct ? (g.story.await !== 'players' ? 'Wait for the round to open.' : 'Your turn is over this round.')
      : W === 'drone' ? 'Click an open tile: the drone flies there on its own AP (3 a round). The Narrator says what it sees.'
      : W === 'beast' ? 'Click an open tile: the beast goes there on its own AP (4 a round). Other orders out of a fight are Empathy checks the Narrator calls.'
      : W === 'twin' ? 'Click an open tile: the twin goes there on its own AP (4 a round), never more than 6 tiles from you.'
      : ['move', 'sprint', 'sneak'].includes(W) ? 'Click an open tile.' + (W === 'sneak' ? ' Sneaking hides you until a hostile notices you (Ingenuity to stay hidden).' : '')
      : isMagicW ? mHint
      : TARGETED.includes(W) ? (tgt ? (W === 'stim' ? 'Stim ' + tgt.name + '.' : W === 'analyze' ? 'Read ' + tgt.name + ': its HP and armour, for everyone.' : (tgt.obj ? 'Attack ' + (tgt.person ? tgt.name + ': a person; this starts a fight.' : 'the ' + tgt.name.toLowerCase() + (tgt.obj.hp != null ? ' (' + tgt.obj.hp + ' HP).' : ': the Narrator rules what happens.')) : tgt.side === 'pc' ? 'FRIENDLY FIRE: you are attacking ' + tgt.name + '. It resolves on the map; no fight starts. Confirm if you mean it.' : 'Attack ' + tgt.name + ': this starts a fight. ' + (hiddenNow ? 'You are hidden: an ambush, your turn first' + ' (from its front: Ingenuity first).' : 'You are seen: you act from round 2.'))) : W === 'stim' ? 'Click an adjacent ally.' : 'Click a person or enemy on the map.')
      : 'Confirm to ' + ({ reload: 'reload', load: 'load loose rounds into a magazine', clear: 'clear a jam', repair: 'repair your weapon', prone: (c && c.prone ? 'stand up' : 'drop prone') }[W]) + '.';
    // The area map's detail field for a perk action (a pick, words, a name): chips from the engine's options, or typed.
    const wDetailVals = (() => {
      if (!wPkE || !wantsDetail(wPkE, null)) return { wHasDetail: false, wDetailOpts: [], wHasDetailOpts: false };
      const multi = (wPkE.pickMulti || 1) > 1, chosen = new Set(String(wDet ? pickChoice(wPkE, wDet) : '').split(' ').filter(Boolean)), setDet = (v) => this.setState({ wDetail: v, wDetailFor: W });
      const opts = (wPkE.options || []).map((o) => ({ key: o.id, label: o.label, pressed: chosen.has(o.id) ? 'true' : 'false',
        pick: () => { if (!multi) return setDet(chosen.has(o.id) ? '' : o.label); const now = [...chosen], next = chosen.has(o.id) ? now.filter((x) => x !== o.id) : [...now, o.id].slice(-(wPkE.pickMulti || 1)); setDet(next.map((id) => (wPkE.options.find((p) => p.id === id) || { label: id }).label).join(' ')); },
        style: 'min-height: 30px; padding: 0 10px; border-radius: 999px; font-family: inherit; font-size: 12px; font-weight: 700; cursor: pointer; ' + (chosen.has(o.id) ? 'border: 1px solid #FFFFFF; background: #1C2536; color: #FFFFFF' : 'border: 1px solid #2E3A50; background: transparent; color: #A3AEC2') }));
      return { wHasDetail: true, wDetail: wDet, onWDetail: (e) => setDet(e.target.value), wDetailLabel: wPkE.pickLabel || (wPkE.target === 'text' ? 'What you say or do' : 'Detail: a word, a name, a pick'), wDetailOpts: opts, wHasDetailOpts: opts.length > 0 };
    })();
    const tgtPos = tgt ? (tgt.obj ? tgt.obj.pos : tgt.pos) : null, tgtOdds = isAttack && tgtPos && plan.selText ? plan.selText(tgtPos) : '';
    const wHintFull = wHint + (tgtOdds ? ' ' + tgtOdds : '');
    const wConfirm = () => { if (!c) return; if (isMagicW) return magicConfirm();
      if (wPkE) { if (pkTargeted && !tgt) return; if (pkTile && !S.wTile) return toast('Click a tile first.'); if (pkObj && !(tgt && tgt.obj)) return toast('Click an object first.');
        act({ type: 'world/act', charId: c.id, act: 'perk', id: wPkE.id, actionId: wPkE.actionId, ...(pkTargeted && tgt ? { targetId: tgt.npc ? tgt.id : tgt.charId || tgt.id } : {}), ...(pkTile ? { tile: S.wTile } : {}), ...(pkObj && tgt && tgt.obj ? { objId: tgt.obj.id } : {}), ...(wDet ? { text: wDet, npc: wDet, choice: pickChoice(wPkE, wDet) } : {}) });
        if (wDet) this.setState({ wDetail: '' }); return; } if (TARGETED.includes(W)) { if (!tgt) return; const fight = isAttack && tgt.side !== 'pc' && (!tgt.obj || tgt.person);
        act({ type: 'world/act', charId: c.id, act: isAttack ? 'attack' : W, mode: isAttack ? W : undefined, ...(tgt.obj ? { objId: tgt.obj.id } : { targetId: tgt.npc ? tgt.id : tgt.charId }) }); this.setState({ wTarget: null, ...(fight ? { area: false } : {}) }); if (fight && getState().game.phase === 'combat') go('combat'); return; } if (instant) act({ type: 'world/act', charId: c.id, act: W }); };
    const regions = [];
    const storyPk = g.phase === 'story' && c && !c.dead ? storyPerkEntries(g, c) : [];
    const u = g.narrator.usage, host = playerOf(g.hostId);

    return {
      ...epccgVals(this), ...lightboxVals(this), code: g.code, roomText: 'ROOM ' + g.code + (SB ? '' : ' · '), withNarrator: !SB, report: openReport, spend: openSpend, costText: (u.calls ? '$' + u.costUsd.toFixed(2) + ' · ' + u.calls + ' Narrator turn' + (u.calls === 1 ? '' : 's') : 'no Narrator turns yet'),
      toRoom: () => go('room'), isHost, save: () => saveNow(), saveLabel: st.savedAt && Date.now() - st.savedAt < 4000 ? 'Saved ✓' : 'Save', toCombat: () => { if (g.combat) go('combat'); }, noCombat: !g.combat,
      narrChip: SB ? 'PROVING GROUND · ' + g.players.length + (g.players.length === 1 ? ' PLAYER' : ' PLAYERS') : 'AI NARRATOR · ' + (busy ? 'THINKING…' : err ? 'STUCK' : isHost ? 'YOUR KEY' : host.name.toUpperCase() + '’S KEY'),
      narrChipStyle: 'padding: 6px 12px; border-radius: 999px; border: 1px solid ' + (err ? '#F65157' : '#232D3F') + '; font-size: 12px; color: ' + (err ? '#F65157' : busy ? '#FFFFFF' : '#A3AEC2'),
      narrError: !!err, narrErrorText: (err || '') + (isHost ? '' : ' Ask ' + host.name + ' to retry.'), retry: () => (isHost ? retryNarrator() : toast('Only the host can retry the Narrator.')), retryLabel: isHost ? 'Retry' : 'Host retries',
      thinking: busy, thinkingText: 'The Narrator is writing…', narratorImg: IMG['wick-narrator-placeholder'],
      echoPips, echo, pc, multi: mine.length > 1, myChars, bars, tabs, coreTabs, sheetSkills, tabSkills: S.tab === 'skills', tabStatus: S.tab === 'status', tabPerks: S.tab === 'perks', tabGear: S.tab === 'gear', tabBio: S.tab === 'bio', tabMagic: S.tab === 'magic', mg: magicVals(this, g, c),
      zoomPc: () => this.setState({ card: true }), cardOpen: !!S.card && !!c, closeCard: () => closeAnim(this, 'card', () => this.setState({ card: false })), cardCls: modalCls(this, 'card'), zoomPcBig: zoomer(this, pc.img, pc.name, 'portrait'),
      fx: fxList, noFx: !fxList.length, canLevel: !!lvlUp, toLevelUp: () => go('levelup', { levelupChar: c.id }), levelLabel: c && c.level >= 3 && !c.classId ? '★ Earn your class' : 'Level up · spend points',
      status, rep, statusFig, injuries, noInjuries: !injuries.length, hpLine: c ? c.hp + ' / ' + hpMax + ' HP' + (c.dead ? ' · DEAD' : '') : '', traits, noTraits: !traits.length, perks, noPerks: !perks.length, classMoves, hasClass: !!classHead, classHead: classHead || {}, mp, hasMp: !!top, gear, gearFig, slots, rig, hands, bodySlots, rigView: packView, plotView, hasPlot: plotView.length > 0, tipOpen: !!tipCard, tipCard: tipCard || { lines: [] }, noRig: !packView.length, backpackImg: '',
      canLoad, cantLoad: !canLoad || g.phase === 'combat', loadMags: () => act({ type: 'gear/load', charId: c.id }),
      load: c ? 'Carrying ' + KG.total + ' kg of ' + lim + ' kg' + (over ? ' · OVER THE LIMIT' : '') + ' (weapon ' + kg(KG.weapon) + ', armour ' + kg(KG.armour) + ', pack ' + kg(KG.pack) + ')' : '', loadStyle: 'font-size: 12px; color: ' + (over ? '#F65157' : '#A3AEC2'), eoe: { locked: true, why: 'Cracking needs Mastery 2 in Brain Power with an Evoker, or Will Power with an Emanator.' }, mastery, noMastery: !mastery.length, bio,
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
      // The mission board (missionBoard.tsx): the header button, with the count of open objectives.
      ...(() => { const mb = missionsButton(g); return { hasMissions: !!mb, missionsLabel: mb ? mb.label : '', missionsTitle: mb ? mb.title : '', openMissions: () => openMissionBoard(),
        missionsStyle: 'min-height: 34px; padding: 0 12px; border-radius: 8px; border: 1px solid ' + (mb && mb.count ? '#FFFFFF' : '#2E3A50') + '; background: transparent; color: ' + (mb && mb.count ? '#FFFFFF' : '#A3AEC2') + '; font-family: inherit; font-size: 12px; font-weight: 700; letter-spacing: 0.14em; cursor: pointer' }; })(),
      // The Perks strip (plan 3): story uses of perks, traits and class moves. Text-taking ones use what is in the Say box.
      get hasStoryPerks() { return this.storyPerks.length > 0; },
      pkDetail: S.pkDetail || '', onPkDetail: (e) => this.setState({ pkDetail: e.target.value }),
      pkDetailOpts: [...new Set(storyPk.flatMap((e) => (e.options || []).map((o) => o.label)))].map((l) => ({ key: l, value: l })),
      // The Say box is the text (what you say or do); the Perks detail field is the pick (a name, a squadmate, a γ skill,
      // words): it rides as npc and as choice (an option's id when it names one).
      storyPerks: storyPk.map((e) => ({ key: pkId(e), label: e.label + (e.uses.label ? ' · ' + e.uses.label : ''), title: (e.why ? e.why + ' · ' : '') + pkText(e) + (e.target === 'text' ? ' (uses the text in the Say box)' : e.target === 'npc' ? ' (name them in the Perks detail field, or the Say box)' : '') + (e.pickLabel ? ' · Detail: ' + e.pickLabel : '') + (e.options && e.options.length ? ' (' + e.options.map((o) => o.label).join(', ') + ')' : ''), off: !!e.why,
        pick: () => { const text = (this.state.draft || '').trim(), det = String(this.state.pkDetail || '').trim();
          if (e.target === 'text' && !text) return toast('Write it in the Say box first, then press ' + e.label + '.');
          if (e.options && e.options.length && !det) return toast((e.pickLabel || 'Pick one') + ': type it in the Perks detail field (' + e.options.map((o) => o.label).join(', ') + ').');
          act({ type: 'story/perk', charId: c.id, id: e.id, actionId: e.actionId, ...(text ? { text } : {}), ...(det ? { npc: det, choice: pickChoice(e, det) } : {}) });
          if (['text', 'npc'].includes(e.target) && text) this.setState({ draft: '', polished: false }); if (det) this.setState({ pkDetail: '' }); },
        style: 'min-height: 32px; padding: 0 12px; border-radius: 999px; font-family: inherit; font-size: 12px; font-weight: 700; cursor: pointer; border: 1px solid #2E3A50; background: #10151F; color: #E7EBF3' + (e.why ? '; opacity: 0.45' : '') })),
      cantSpeak, turnText: why, turnStyle: 'font-size: 13px; color: ' + (cantSpeak ? '#A3AEC2' : myColor),
      pass: () => act({ type: 'story/pass' }),
      endTurn: () => { if (c) act({ type: 'world/act', charId: c.id, act: 'end' }); if (this.state.area) closeAnim(this, 'area', () => this.setState({ area: false, wTarget: null })); else this.setState({ wTarget: null }); },
      cantEnd: !c || c.dead || g.phase !== 'story' || g.story.await !== 'players' || !!(g.story.ended || {})[c.id],
      apText: c && g.phase === 'story' ? 'AP ' + apLeft(g, c) + ' / ' + ROUND_AP : '',
      skipRest: () => waitingOn.forEach((p) => act({ type: 'story/skip', playerId: p.id })), cantSkip: !isHost || g.story.await !== 'players' || !waitingOn.length,
      pickRoll: S.pickRoll, togglePick: () => this.setState({ pickRoll: !S.pickRoll }),
      zoneLabel: 'ZONE · ' + map.name.toUpperCase(), zoneAria: inFight ? 'Open the combat zone' : 'Combat zone',
      zoneStyle: 'display: block; width: 100%; box-sizing: border-box; padding: 6px; border-radius: 10px; background: #05070B; border: 1px solid ' + (inFight ? '#F65157' : '#232D3F'),
      miniGrid: 'display: grid; grid-template-columns: repeat(' + map.w + ', minmax(0, 1fr)); gap: 1px',
      objPanelOpen: !!objPanel, objPanel: objPanel || { approaches: [] }, nearby, hasNearby: nearby.length > 0,
      areaMagic: { has: GLY.length + ZON.length > 0 || Object.values(g.story.magic || {}).some((x) => x && x.held), legend: [
        ...(GLY.some((x) => x.side === 'pc') ? [{ key: 'g', img: glyphUri('fire', SIGIL_INK), swatch: '', text: 'Squad glyph' }] : []), ...(GLY.some((x) => x.side !== 'pc') ? [{ key: 'f', img: scratchUri('#F65157'), swatch: '', text: 'Enemy glyph' }] : []),
        ...placedLegend((placedW && placedW.kinds) || new Set(), false).map((l) => ({ key: l.key, img: l.img || '', swatch: l.box || '', text: l.name })),
        ...(Object.values(g.story.magic || {}).some((x) => x && x.held) ? [{ key: 'h', img: heartUri(2), swatch: '', text: 'Holding an Outburst' }] : [])] },
      wGroups, wHint: wHintFull, ...wDetailVals, wHasConfirm: canAct && (isMagicW ? mReady : instant || (pkTile && !!S.wTile && !wPkE.why) || ((TARGETED.includes(W) || pkTargeted || pkObj) && !!tgt && !(wPkE && wPkE.why))), wConfirm, wMagic, wConfirmLabel: isMagicW ? mLabel : isAttack ? (tgt && tgt.side === 'pc' ? 'Attack ' + tgt.name + ' (friendly fire)' : tgt && tgt.obj && !tgt.person ? 'Attack it' : 'Attack · starts the fight') : 'Confirm',
      wHead: c ? c.name.toUpperCase() + ' · AP ' + apNow + ' / ' + ROUND_AP : '', wStatus: sneaking ? (hiddenNow ? 'Sneaking · hidden' : 'Sneaking · seen') : 'In the open',
      wStatusStyle: 'font-size: 12px; font-weight: 700; letter-spacing: 0.1em; color: ' + (hiddenNow ? '#6FEA77' : sneaking ? '#F65157' : '#A3AEC2'),
      wPips: Array.from({ length: ROUND_AP }, (_, i) => ({ key: i, style: 'flex: 1; height: 8px; border-radius: 3px; background: ' + (i < apNow ? '#FFFFFF' : '#232D3F') })),
      areaCells, hereText: (() => { const k = S.hoverTile; if (!k || !areaCells.some((c) => c.key === k)) return 'Hover a tile to see what is there.';
        const cell = areaCells.find((c) => c.key === k); return (plan.info && plan.hv === k ? plan.info + ' · ' : '') + cell.label; })(),
      areaHint: mOpen && mHint ? mHint : plan.isAtk ? (plan.reachText || '') + ' Red: in reach. Hover a target for the odds.' : plan.isMove ? 'Dashed tiles are in reach this round: hover one for the path and its AP, click to go.' : mover ? 'Click an open tile to move ' + mover.name + ' there. Hover any tile for what is at it.' : 'Hover any tile for what is at it.',
      areaGrid: 'display: grid; grid-template-columns: 18px repeat(' + map.w + ', minmax(0, 1fr)); gap: 2px; margin: 0 auto; width: min(100%, calc((100vh - 260px) * ' + ((map.w + 0.4) / (map.h + 0.4)).toFixed(3) + '))',
      areaTitle: 'AREA MAP · ' + (SB ? 'PROVING GROUND' : st0.short.toUpperCase() + ' · ' + map.name.toUpperCase()), inFight,
      hud: (() => { if (!c) return { has: false, bars: [], ammo: '', ammoStyle: '', magic: [] };
        const w = WEAPON[c.weapon], ap = inFight ? 0 : apLeft(g, c), spare = (packOf(c).find((it) => it.weapon === c.weapon && it.mags) || { mags: [] }).mags.length, loaded = loadedOf(c);
        const hb = bars.filter((b) => b.label !== 'XP').concat(inFight ? [] : [{ label: 'AP', text: ap + ' / ' + ROUND_AP, labelStyle: 'font-size: 11px; font-weight: 700; letter-spacing: 0.1em; color: #FFFFFF', fill: 'width: ' + Math.round(ap / ROUND_AP * 100) + '%; height: 100%; background: #FFFFFF' }]);
        const ammo = !w ? 'No weapon' : w.magazine ? (w.name || c.weapon) + ' · ' + loaded + ' / ' + w.magazine + ' loaded · ' + spare + ' spare' + (loaded <= 0 ? ' · EMPTY: reload (2 AP)' : '') : (w.name || c.weapon);
        // Magic: Evoker charge and Flux (cyan), Strain and a held Outburst (violet), when there's anything to say; the air's mana always.
        const ml = [];
        if (myWords.length || hasEvoker(c)) ml.push({ key: 'sig', text: 'EVOKER ' + (hasEvoker(c) ? MN.charge + ' / ' + CORE_CHARGE + ' charge · ' + MN.cores + ' spare' : 'not carried') + (MN.flux ? ' · FLUX ' + MN.flux + ' / ' + FLUX_MAX : ''), style: 'font-size: 11px; font-weight: 700; letter-spacing: 0.06em; color: ' + (MN.flux >= FLUX_MAX - 1 ? '#F65157' : SIG_CYAN) });
        if (MN.strain || MN.held) ml.push({ key: 'soul', text: (MN.strain ? 'STRAIN ' + MN.strain + ' / ' + strainLimit(c) : '') + (MN.strain && MN.held ? ' · ' : '') + (MN.held ? '♥ HOLDING · STAGE ' + MN.held.stage : ''), style: 'font-size: 11px; font-weight: 700; letter-spacing: 0.06em; color: ' + (MN.strain >= strainLimit(c) ? '#F65157' : SOUL_VIOLET) });
        ml.push({ key: 'mana', text: 'MANA ' + MN.mana + ' · ' + bandName(MN.band), style: 'font-size: 11px; font-weight: 700; letter-spacing: 0.1em; color: #A3AEC2' });
        return { has: true, bars: hb, ammo, ammoStyle: 'font-size: 12px; font-weight: 700; letter-spacing: 0.04em; color: ' + (w && w.magazine && loaded <= 0 ? '#F65157' : '#E7EBF3'), magic: ml }; })(),
      ...(() => { const E = g.story.entries; let from = E.length; while (from > 0 && E[from - 1].kind !== 'narration') from--;
        const L = E.slice(from).filter((e) => e.act || e.kind === 'check' || (e.kind === 'system' && /hidden|spots|Downed|stim|learns the|Outburst module|school of Outbursts/i.test(e.text))).slice(-12).map((e) => ({ key: e.id, text: (e.head ? e.head + ' · ' : '') + e.text,
          style: 'font-size: 12px; line-height: 1.4; color: ' + (magicInk(e.text) || (e.act && /\b(fires|shoots|aimed shot|strikes|smashes|attacks)\b/.test(e.text) ? '#F6A3A6' : e.kind === 'check' ? (e.ok ? '#6FEA77' : '#A3AEC2') : '#E7EBF3')) }));
        return { areaLog: L, noAreaLog: !L.length }; })(),
      areaNote: inFight ? 'Fight on: round ' + cb.round + '. Tokens show where everyone stands.' : 'Grid references: columns A–' + refOf((map.w - 1) + ',0').replace(/\d+$/, '') + ', rows 1–' + map.h + (SB ? '. Click a tile to move there.' : '. Tell the Narrator "I move to C7", or click a tile.'),
      zoneNote: inFight ? 'COMBAT ZONE · ENTER ›' : cb ? 'LAST FIGHT · ' + (cb.over === 'win' ? 'WON' : cb.over === 'extracted' ? 'EXTRACTED' : 'LOST') + ' · VIEW ›' : 'NO FIGHT YET · HOVER A TOKEN',
      zoneNoteStyle: 'display: block; padding-top: 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.12em; color: ' + (inFight ? '#F65157' : '#A3AEC2'),
      mini, regions, area: S.area, openArea: () => this.setState({ area: true }), closeArea: () => closeAnim(this, 'area', () => this.setState({ area: false, wTarget: null })), order,
      orderTitle: SB ? 'SQUAD' : 'SPEAKING ORDER',
      orderNote: SB ? 'Each round: a full turn of AP on the area map, then End turn. Gear up with the tools; start the fight from the map or the tools.' : 'Each round: one Say and a full turn of AP (act on the area map). When everyone has ended their turn, the Narrator answers what needs it.',
      areaCls: modalCls(this, 'area'), objCls: modalCls(this, 'obj'), rootCls: 'phc-play ' + motionRoot(), tabCls: 'phc-m-tab-' + (S.tabDir || 'r'),
      tipCls: 'phc-m-tip', levelCls: 'phc-m-pop',
    };
  }
}

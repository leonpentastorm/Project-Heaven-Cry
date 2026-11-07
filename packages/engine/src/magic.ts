// Magic (spec: Mana, rules 1.2). Sigils are words drawn as glyphs onto tiles; a spell is the words plus the shape they
// make (Stack, Line, Ring), fired with Evoke. Outbursts are held in the heart, grow each turn and are released when
// the caster chooses. The ambient mana meter, conditions with saves, shields and standing wall zones live here too.
// Everything is deterministic: rolls come from the rng passed in.
import { SIGIL, SCHOOL, MODULE, MANA_BANDS, SKILL, type SigilDef } from './data';
import {
  type Character, type OutburstDesign, mod, maxMp, healingMult, packOf,
  sigilMult, soulMult, elementalMult, maxSigilWords, glyphAp, sigilCoreSaving, sigilRangeBonus, sigilDurationBonus,
  soulCastAp, soulCostSaving, soulRangeBonus, syphonMult, strainLimit, saveBonus, debuffStrength, hasEvoker, hasEmanator, coresCarried, mpNow, evoChargeNow,
} from './character';
import { type Combat, type Unit, dist, lineOfSight, standable, refOf, coverTileFor, emitFx, fxFell } from './combat';
import { type Rng, d20, die } from './rng';
import { emit } from './effects/hooks';
import { applyDamage, healUnit, grantShield } from './effects/damage';
import { itemWords, wordCostMods } from './effects/core';

type Fam = 'body' | 'brain' | 'heart';
export interface Glyph { id: string; word: string; pos: string; by: string; side: 'pc' | 'foe'; left: number; who: string }
export interface Zone { id: string; kind: 'wall' | 'veil' | 'light' | 'scramble'; tiles: string[]; words: string[]; by: string; side: 'pc' | 'foe'; left: number; mult: number; who: string; hit?: Record<string, number> }
/** A unit's magic: what it knows and carries, and its running state. */
export interface MagicUnit {
  words: string[]; designs: OutburstDesign[]; evoker: boolean; emanator: boolean;
  charge: number; cores: number; coresMade: number; flux: number; lockRound?: number;
  mp: number; mpMax: number; strain: number; held: { design: string; stage: number; cost: number } | null; cast: boolean;
  brain: number; will: number; sigilMult: number; soulMult: number; elemMult: number; healMult: number;
  maxWords: number; glyphAp: number; coreSave: number; rangeBonus: number; durBonus: number;
  soulAp: number; costSave: number; soulRange: number; syphon: number; strainLimit: number;
  saves: Record<Fam, number>; debuff: Record<Fam, number>;
  /** Items' changes to a word's charge (word_cost), by word. */
  wordCost?: Record<string, number>;
}

export const MANA_START = 15;
export const FLUX_MAX = 6;
export const CORE_CHARGE = 10;
/** Line range by length (Leon: two-tile lines were too cheap). */
export const LINE_RANGE: Record<number, number> = { 2: 4, 3: 8, 4: 12 };
export const PUSH_RANGE = 8;
export const SOUL_REACH = 4;
export const SPELL_AP = { evoke: 1, scuff: 1, vent: 1, core: 2, release: 1, syphon: 1, crystallise: 3 };
/** Conditions (spec: Conditions and saves; rules 1.3 shared subsystems). rounds counts the bearer's turn ends (a
 * condition put on you during your own turn doesn't lose a round at that turn's end); noTick: it lasts until something
 * ends it (Burning until put out, Grappled until you break free, Disarmed until you recover the weapon); boon: no save;
 * noSave: a state or a condition from a hit. 99 rounds means "until ended". */
interface CondDef { name: string; fam: Fam; rounds: number; boon?: boolean; noTick?: boolean; noSave?: boolean; text: string }
const CONDS: Record<string, CondDef> = {
  slowed: { name: 'Slowed', fam: 'body', rounds: 2, text: 'Half Movement.' },
  pinned: { name: 'Pinned', fam: 'body', rounds: 1, text: 'Can\'t move; −2 to hit. Until the end of your next turn.' },
  blinded: { name: 'Blinded', fam: 'body', rounds: 1, text: '−4 to hit; you see only adjacent tiles.' },
  burning: { name: 'Burning', fam: 'body', rounds: 99, noTick: true, text: '10 damage at the start of each turn until someone spends 1 AP to put it out.' },
  weakened: { name: 'Weakened', fam: 'body', rounds: 2, text: '−25% damage dealt.' },
  nausea: { name: 'Nausea', fam: 'body', rounds: 2, text: '−1 AP.' },
  stunned: { name: 'Stunned', fam: 'body', rounds: 1, text: 'Lose your next turn.' },
  grappled: { name: 'Grappled', fam: 'body', rounds: 99, noTick: true, text: 'Held: you can\'t move; −2 to attacks against anyone but the grappler. Break free: 2 AP, opposed Raw Power or Athletics.' },
  suppressed: { name: 'Suppressed', fam: 'body', rounds: 1, text: '−1 AP; no reactions.' },
  augment_offline: { name: 'Augment Offline', fam: 'body', rounds: 99, noTick: true, noSave: true, text: 'One augment gives nothing until repaired.' },
  confused: { name: 'Confused', fam: 'brain', rounds: 1, text: 'Each attack has a 50% chance to go at someone at random.' },
  ldebuff: { name: 'Left Brain Debuff', fam: 'brain', rounds: 2, text: '−2 on Mind skill rolls; Sigils cost +1 AP.' },
  rdebuff: { name: 'Right Brain Debuff', fam: 'brain', rounds: 2, text: '−2 on Expression and Soul skill rolls; Soul spells cost +20% MP.' },
  silenced: { name: 'Silenced', fam: 'brain', rounds: 1, text: 'No Sigils, Outbursts or prayers.' },
  puppeted: { name: 'Puppeted', fam: 'brain', rounds: 1, text: 'The caster\'s player runs your next turn (no self-harm).' },
  shaken: { name: 'Shaken', fam: 'heart', rounds: 3, text: '−2 on Heart saves and social checks.' },
  fear: { name: 'Afraid', fam: 'heart', rounds: 2, text: 'Can\'t move toward or attack the source; −2 to hit anyone else.' },
  taunted: { name: 'Taunted', fam: 'heart', rounds: 1, text: 'Your next attack must go at the one who taunted you, if you can see them.' },
  commanded: { name: 'Commanded', fam: 'heart', rounds: 1, text: 'You obey one short order on your next turn.' },
  disarmed: { name: 'Disarmed', fam: 'heart', rounds: 99, noTick: true, text: 'Your weapon is down: no attacks with it until you recover it (2 AP).' },
  lowered: { name: 'Weapon lowered', fam: 'heart', rounds: 99, noTick: true, text: 'Your weapon is lowered: raise it (1 AP) to attack with it.' },
  marked: { name: 'Marked', fam: 'body', rounds: 99, noTick: true, noSave: true, text: 'The marker\'s squad gets +1 to hit you; you can\'t become Hidden.' },
  guarded: { name: 'Guarded (+2 Defense)', fam: 'body', rounds: 2, boon: true, text: '+2 Defense.' },
  inspired: { name: 'Inspired (+2 to hit)', fam: 'heart', rounds: 2, boon: true, text: '+2 to hit.' },
  withdrawing: { name: 'Withdrawing (+2 Defense)', fam: 'body', rounds: 1, boon: true, text: '+2 Defense until your next turn ends.' },
  emplaced: { name: 'Emplaced', fam: 'body', rounds: 99, noTick: true, boon: true, text: '+2 to attacks with the weapon; Recoil halved; moving ends it.' },
  last_turn: { name: 'Last Turn', fam: 'body', rounds: 1, boon: true, text: 'Still standing on borrowed time.' },
  witnessed: { name: 'Witnessed', fam: 'heart', rounds: 1, boon: true, text: 'Your patron is watching: on-theme actions +2, off-theme ones cost 1 Devotion (the Narrator judges).' },
};
/** Data and older ids for the same conditions (conditions.json uses the long names). */
const ALIAS: Record<string, string> = { left_brain_debuff: 'ldebuff', right_brain_debuff: 'rdebuff', afraid: 'fear', stun: 'stunned', braced: 'emplaced' };
/** Conditions kept as unit flags rather than in u.conds (applyCond sets them). */
const FLAG_CONDS = new Set(['dazed', 'prone', 'bleeding', 'hidden', 'injured']);
export const condId = (id: string) => ALIAS[id] || id;
export const condName = (id: string) => CONDS[condId(id)]?.name || ({ dazed: 'Dazed', prone: 'Prone', bleeding: 'Bleeding', hidden: 'Hidden' } as Record<string, string>)[id] || id;
export const condText = (id: string) => CONDS[condId(id)]?.text || '';
/** Is this a condition the engine knows, and which save family it belongs to. */
export const isCondition = (id: string) => !!CONDS[condId(id)] || FLAG_CONDS.has(id);
export const condFamily = (id: string): Fam | undefined => CONDS[condId(id)]?.fam || (FLAG_CONDS.has(id) && id !== 'hidden' ? 'body' : undefined);
/** familyOf: the same, under the plan's name. */
export const familyOf = condFamily;
export const isBoon = (id: string) => !!CONDS[condId(id)]?.boon || id === 'hidden';
/** Every condition id the engine runs (for the validator, the wiki and lanes). */
export const CONDITION_IDS = [...Object.keys(CONDS), ...FLAG_CONDS];
const BOOST = new Set(Object.keys(CONDS).filter((k) => CONDS[k].boon));

// ---------- the meter ----------
export const manaBand = (m: number) => MANA_BANDS.find((b) => m >= b.min && m <= b.max) || MANA_BANDS[1];
export const manaOf = (cb: Combat) => (cb.mana ??= MANA_START);
export function shiftMana(cb: Combat, by: number, why?: string) {
  const was = manaOf(cb), now = Math.max(0, Math.min(40, was + by)); cb.mana = now;
  const a = manaBand(was).id, b = manaBand(now).id;
  if (a !== b) emitFx(cb, 'mana', { band: b, mana: now });
  if (a !== b) cb.log.push('The air turns ' + b.toUpperCase() + ' (mana ' + now + ')' + (why ? ': ' + why : '') + '.');
}
/** Deaths release bots (spec: the meter): +5 a person, +2 a robot. Called once per turn; each death counts once. */
export function noteDeaths(cb: Combat) {
  const seen = new Set(cb.deadSeen || []);
  for (const u of cb.units) if (u.dead && !seen.has(u.id)) { seen.add(u.id); shiftMana(cb, ['robot', 'machine', 'turret', 'drone'].includes(u.kind || '') || /drone|robot|automaton|\bbot\b|turret/i.test(u.name) ? 2 : 5, u.name + ' fell'); }
  cb.deadSeen = [...seen];
}

// ---------- units ----------
export function magicOf(c: Character): MagicUnit | undefined {
  const words = [...new Set([...(c.sigils || []), ...itemWords(c)])], designs = c.outbursts || [], evoker = hasEvoker(c), emanator = hasEmanator(c);
  if (!words.length && !designs.length && !evoker && !emanator) return undefined;
  return {
    words: [...words], designs: designs.map((d) => ({ ...d, modules: [...d.modules] })), evoker, emanator,
    charge: evoChargeNow(c), cores: coresCarried(c), coresMade: 0, flux: 0, mp: mpNow(c), mpMax: maxMp(c), strain: 0, held: null, cast: false,
    brain: mod(c.skills.brain_power || 0), will: mod(c.skills.will_power || 0), sigilMult: sigilMult(c), soulMult: soulMult(c), elemMult: elementalMult(c), healMult: healingMult(c),
    maxWords: maxSigilWords(c), glyphAp: glyphAp(c), coreSave: sigilCoreSaving(c), rangeBonus: sigilRangeBonus(c), durBonus: sigilDurationBonus(c),
    soulAp: soulCastAp(c), costSave: soulCostSaving(c), soulRange: soulRangeBonus(c), syphon: syphonMult(c), strainLimit: strainLimit(c),
    saves: { body: saveBonus(c, 'body'), brain: saveBonus(c, 'brain'), heart: saveBonus(c, 'heart') },
    debuff: { body: debuffStrength(c, 'body'), brain: debuffStrength(c, 'brain'), heart: debuffStrength(c, 'heart') },
    ...(() => { const wc = wordCostMods(c); return Object.keys(wc).length ? { wordCost: wc } : {}; })(),
  };
}
/** Write a unit's magic back to its character (after a fight, or after an overworld action). */
export function magicToCharacter(c: Character, u: Unit) {
  const m = u.mg; if (!m) return;
  if (m.emanator) c.mp = Math.max(0, Math.min(m.mpMax, Math.round(m.mp)));
  if (m.evoker) c.evoCharge = m.charge;
  const had = coresCarried(c), want = m.cores + m.coresMade;
  if (want !== had) {
    let left = had - want; // positive: cores spent; negative: cores made
    const pack = packOf(c).map((x) => ({ ...x }));
    if (left > 0) for (const it of pack) { if ((it.item || it.id) !== 'standard_core' || !left) continue; const n = Math.min(left, it.qty); it.qty -= n; left -= n; }
    else { const it = pack.find((x) => (x.item || x.id) === 'standard_core'); if (it) it.qty += -left; else pack.push({ id: 'standard_core', item: 'standard_core', name: 'Standard mana core', qty: -left, kind: 'ammo' }); }
    c.pack = pack.filter((x) => x.qty > 0 || x.mags);
    m.cores = want; m.coresMade = 0;
  }
}
/** Saves (spec: Conditions and saves): a PC's d20 + mod(Guts | Charisma | Composure) + items, from the unit (u.sv,
 * fixed when the unit is built, so every PC has it, casters or not); enemies by tier (+0 / +1 / +2 / +3). Shaken is −2
 * on Heart saves. unitSave is the one collector (lanes add through 'cond_apply' saveAdd or stat 'save_<family>'). */
const TIER_SAVE: Record<string, number> = { minion: 0, soldier: 1, elite: 2, boss: 3 };
const TIER_DEBUFF: Record<string, number> = { minion: 0, soldier: 1, elite: 2, boss: 2 };
export function unitSave(u: Unit, fam: Fam): number {
  const base = u.sv ? u.sv[fam] : u.mg ? u.mg.saves[fam] : TIER_SAVE[u.tier || 'minion'] ?? 0;
  return base + (fam === 'heart' && condOn(u, 'shaken') ? -2 : 0) + (fam === 'brain' ? condSkillMod(u, 'charisma') : fam === 'heart' ? condSkillMod(u, 'composure') : 0);
}
/** Conditions on skill rolls (spec): Left Brain Debuff −2 on Mind skills, Right Brain Debuff −2 on Expression and Soul
 * skills. Reaches every d20 that uses the skill (attacks, Sigil and Soul strikes, saves). */
export function condSkillMod(u: Unit, skill: string): number {
  const s = SKILL[skill]; if (!s) return 0;
  return (condOn(u, 'ldebuff') && s.core === 'mind' ? -2 : 0) + (condOn(u, 'rdebuff') && (s.core === 'soul' || s.attribute === 'expression') ? -2 : 0);
}
export function unitDebuff(u: Unit, fam: Fam): number { return u.dbf ? u.dbf[fam] : u.mg ? u.mg.debuff[fam] : TIER_DEBUFF[u.tier || 'minion'] ?? 0; }
const saveOf = unitSave;
const debuffOf = unitDebuff;
export const condOn = (u: Unit, id: string) => !!(u.conds && u.conds[condId(id)] > 0);
/** Who put a condition on a unit (its unit id), if anyone. */
export const condSource = (u: Unit, id: string): string | null => (condOn(u, id) && u.condBy?.[condId(id)]) || null;
/** The order or variant a condition carries (Commanded's order). */
export const condArg = (u: Unit, id: string): string | null => (condOn(u, id) && u.condArg?.[condId(id)]) || null;
/** To-hit change from the attacker's conditions (spec: Conditions): Pinned −2, Blinded −4, Afraid −2 against anyone but
 * the source, Grappled −2 against anyone but the grappler, Inspired +2. With a target, the target's Marked adds +1 for
 * the marker's squad. Shaken and Confused no longer touch the roll (spec). */
export function condHit(u: Unit, tgt?: Unit | null, cb?: Combat | null): number {
  let n = 0;
  if (condOn(u, 'pinned')) n -= 2;
  if (condOn(u, 'blinded')) n -= 4;
  if (condOn(u, 'fear') && (!tgt || condSource(u, 'fear') !== tgt.id)) n -= 2;
  if (condOn(u, 'grappled') && (!tgt || condSource(u, 'grappled') !== tgt.id)) n -= 2;
  if (condOn(u, 'inspired')) n += 2;
  if (tgt && condOn(tgt, 'marked')) { const by = condSource(tgt, 'marked'), m = by && cb ? cb.units.find((x) => x.id === by) : null; if (!by || !cb || (m && m.side === u.side)) n += 1; }
  return n;
}
/** The body-family debuffs a unit carries now (Shrug It Off, Iron Stomach…), and any family's. */
export const debuffsOf = (u: Unit, fam?: Fam) => [...Object.keys(u.conds || {}).filter((id) => condOn(u, id) && !isBoon(id) && (!fam || CONDS[id]?.fam === fam)),
  ...(!fam || fam === 'body' ? [...(u.bleed ? ['bleeding'] : []), ...(u.dazedNext ? ['dazed'] : []), ...(u.prone ? ['prone'] : [])] : [])];
export const bodyDebuffs = (u: Unit) => debuffsOf(u, 'body');

// ---------- conditions, shields, harm ----------
export interface CondOpts { /** No save (a hit's rider, a perk that says so). */ skipSave?: boolean; tnAdd?: number; /** Commanded's order, a variant. */ arg?: string }
/** Apply a condition: the target saves (d20 + its save) against 12 + the caster's debuff strength (spec: Conditions
 * and saves). Boons (Guarded, Inspired…) and states need no save. No stacking: a second dose resets to the longer
 * duration. The source is kept (u.condBy) for Fear, Taunted, Grappled, Marked and kill credit. */
export function applyCond(cb: Combat, rng: Rng, by: Unit | null, t: Unit, id0: string, rounds?: number, fam?: Fam, opts: CondOpts = {}): string {
  const id = condId(id0);
  if (FLAG_CONDS.has(id)) return flagCond(cb, rng, by, t, id, rounds, opts);
  const def = CONDS[id]; if (!def || t.dead) return '';
  // Items first: 'cond_apply' {by, t, id, fam, rounds, skipSave, cancel, why, tnAdd, saveAdd} (an immunity cancels it,
  // a perk may skip the save, change the rounds or the save's TN).
  const ca: any = emit(cb, 'cond_apply', { by, t, id, fam: fam || def.fam, rounds: rounds || def.rounds, skipSave: !!opts.skipSave, cancel: false, why: '', tnAdd: opts.tnAdd || 0, saveAdd: 0, arg: opts.arg, cb, rng });
  if (ca.cancel) { emitFx(cb, 'cond', { target: t.id, at: t.pos, id, resisted: true }); return ' · ' + t.name + ' is untouched' + (ca.why ? ' (' + ca.why + ')' : ''); }
  const f: Fam = ca.fam || fam || def.fam;
  if (!BOOST.has(id) && !def.noSave && !ca.skipSave) {
    const r = d20(rng), m = saveOf(t, f) + (ca.saveAdd || 0), tn = 12 + (by ? debuffOf(by, f) : 0) + (ca.tnAdd || 0), ok = r === 20 || (r !== 1 && r + m >= tn);
    if (ok) { emitFx(cb, 'cond', { target: t.id, at: t.pos, id, resisted: true }); return ' · ' + t.name + ' resists (' + f + ' save ' + (r + m) + ' vs ' + tn + ')'; }
  }
  if (id === 'marked' && t.hidden) { t.hidden = false; delete t.hideEntry; }
  const n = ca.rounds || rounds || def.rounds, had = condOn(t, id);
  emitFx(cb, 'cond', { target: t.id, at: t.pos, id });
  (t.conds ||= {})[id] = def.noTick && !rounds ? 99 : Math.max(had ? t.conds[id] || 0 : 0, n);
  if (by) (t.condBy ||= {})[id] = by.id; else if (t.condBy) delete t.condBy[id];
  if (ca.arg ?? opts.arg) (t.condArg ||= {})[id] = String(ca.arg ?? opts.arg);
  // Put on during the bearer's own turn: that turn's end doesn't count (rounds are the bearer's turn ends after this one).
  const onOwnTurn = cb.order?.[cb.turn] === t.id && !cb.window && !cb.overworld;
  if (onOwnTurn) { const fr = (t.condFresh ||= []); if (!fr.includes(id)) fr.push(id); }
  if (!had) {
    if (id === 'slowed') { t.baseMove ??= t.movement; t.movement = t.baseMove / 2; }
    if (id === 'blinded') { t.baseVision ??= t.vision || 12; t.vision = 1; }
    if (id === 'guarded' || id === 'withdrawing') t.def += 2;
    if (id === 'grappled' || id === 'stunned') { t.overwatch = null; }
  }
  emit(cb, 'cond_landed', { by, t, id, rounds: n, cb, rng }); // 'cond_landed' {by, t, id, rounds}: after it takes hold
  return ' · ' + t.name + ' is ' + def.name + (def.noTick && !rounds ? '' : ' (' + n + ' round' + (n === 1 ? '' : 's') + ')');
}
/** Conditions the engine keeps as unit flags: Dazed (−2 AP next turn), Prone, Bleeding (3 rounds; a hit's rider, no
 * save), Hidden (see combat.ts hide), Injured (a d6 location, no resistance). */
function flagCond(cb: Combat, rng: Rng, by: Unit | null, t: Unit, id: string, rounds: number | undefined, opts: CondOpts): string {
  if (t.dead) return '';
  const fam: Fam = 'body', noSave = id === 'bleeding' || id === 'injured' || id === 'hidden' || id === 'prone';
  const ca: any = emit(cb, 'cond_apply', { by, t, id, fam, rounds: rounds || 1, skipSave: noSave || !!opts.skipSave, cancel: false, why: '', tnAdd: opts.tnAdd || 0, saveAdd: 0, cb, rng });
  if (ca.cancel) return ' · ' + t.name + ' is untouched' + (ca.why ? ' (' + ca.why + ')' : '');
  if (!ca.skipSave) { const r = d20(rng), m = saveOf(t, fam) + (ca.saveAdd || 0), tn = 12 + (by ? debuffOf(by, fam) : 0) + (ca.tnAdd || 0);
    if (r === 20 || (r !== 1 && r + m >= tn)) return ' · ' + t.name + ' resists (body save ' + (r + m) + ' vs ' + tn + ')'; }
  if (id === 'dazed') { t.dazedNext = 1; emit(cb, 'cond_landed', { by, t, id, rounds: 1, cb, rng }); return ' · ' + t.name + ' is Dazed'; }
  if (id === 'prone') { t.prone = true; t.braced = false; emit(cb, 'cond_landed', { by, t, id, rounds: 0, cb, rng }); return ' · ' + t.name + ' is knocked prone'; }
  if (id === 'bleeding') { t.bleed = Math.max(t.bleed || 0, ca.rounds || 3); if (by) t.lastHitBy = by.id; emit(cb, 'cond_landed', { by, t, id, rounds: t.bleed, cb, rng }); return ' · ' + t.name + ' is Bleeding'; }
  if (id === 'hidden') { if (condOn(t, 'marked')) return ' · ' + t.name + ' is Marked and can\'t hide'; t.hidden = true; t.hideEntry = (t.hideEntry || 0) + 1; return ' · ' + t.name + ' is Hidden'; }
  if (id === 'injured') { const inj = injureUnit(rng, t); emit(cb, 'cond_landed', { by, t, id, rounds: 0, cb, rng }); return inj; }
  return '';
}
/** An injury with no resistance roll (the Injured condition): the same d6 table as a critical's (spec: Injuries). */
function injureUnit(rng: Rng, t: Unit): string {
  const d = die(rng, 6), inj = t.injuries || (t.injuries = []);
  if (d === 1) { t.dazedNext = 1; return ' · INJURY (d6 1): head, Dazed'; }
  if (d <= 3) { t.bleed = 3; return ' · INJURY (d6 ' + d + '): torso, Bleeding'; }
  const side: 'left' | 'right' = die(rng, 2) === 1 ? 'left' : 'right';
  if (d === 4) { inj.push({ loc: 'arm', side }); return ' · INJURY (d6 4): ' + side + ' arm'; }
  if (!inj.some((i) => i.loc === 'leg')) t.movement = Math.max(0.5, t.movement / 2);
  inj.push({ loc: 'leg', side }); return ' · INJURY (d6 ' + d + '): ' + side + ' leg';
}
/** End a condition now (its effects undone). 'cond_end' {u, id} when a fight is given. */
export function endCond(u: Unit, id: string, cb?: Combat) {
  id = condId(id);
  if (id === 'hidden') { u.hidden = false; return; }
  if (id === 'prone') { u.prone = false; return; }
  if (id === 'bleeding') { u.bleed = 0; return; }
  if (id === 'dazed') { u.dazedNext = 0; return; }
  if (!u.conds || !(id in u.conds)) return;
  endCondRaw(u, id); if (cb) emit(cb, 'cond_end', { u, id, cb });
}
function endCondRaw(u: Unit, id: string) {
  if (id === 'slowed' && u.baseMove != null) { u.movement = u.baseMove; delete u.baseMove; }
  if (id === 'blinded' && u.baseVision != null) { u.vision = u.baseVision; delete u.baseVision; }
  if (id === 'guarded' || id === 'withdrawing') u.def -= 2;
  delete u.conds![id];
  if (u.condBy) delete u.condBy[id];
  if (u.condArg) delete u.condArg[id];
  if (u.condFresh) u.condFresh = u.condFresh.filter((x) => x !== id);
}
/** The end of a unit's turn (spec: Conditions tick at the end of the bearer's turn, rules 1.3): every timed condition
 * loses a round, except one put on during this same turn; at 0 it ends. Grappled ends if the grappler is gone or no
 * longer adjacent; Taunted when the taunter is down. */
export function condTurnEnd(cb: Combat, u: Unit) {
  if (u.dead || !u.conds) return;
  const fresh = new Set(u.condFresh || []); u.condFresh = [];
  for (const id of Object.keys(u.conds)) {
    const def = CONDS[id]; if (!def) continue;
    if (def.noTick && u.conds[id] >= 99) continue;
    if (fresh.has(id)) continue;
    u.conds[id]--;
    if (u.conds[id] <= 0) { endCond(u, id, cb); cb.log.push(u.name + ' is no longer ' + condName(id) + '.'); }
  }
}
/** Conditions whose source is gone end (Grappled when the grappler is down or not adjacent; Taunted, Fear and Marked
 * when the source is dead). Called before a unit acts. */
export function condSourcesCheck(cb: Combat, u: Unit) {
  for (const id of ['grappled', 'taunted', 'fear', 'commanded', 'puppeted']) {
    if (!condOn(u, id)) continue;
    const by = condSource(u, id), s = by ? cb.units.find((x) => x.id === by) : null;
    const gone = !!by && (!s || s.dead || (id !== 'fear' && s.downed) || (id === 'grappled' && Math.max(...s.pos.split(',').map((v, i) => Math.abs(+v - +u.pos.split(',')[i]))) > 1));
    if (gone) { endCond(u, id, cb); cb.log.push(u.name + ' is no longer ' + condName(id) + '.'); }
  }
}
/** Damage from magic (or a wall zone): the shield first, then armour (Sigil damage takes full armour, Elemental half,
 * Soul none), then HP, Downed or dead, kill credit. A held Outburst may slip. Returns a log suffix. */
/** Why the next harm() hurts, for the effects layer only (burn, short, overload, wall); reset after each call. */
let hurtWhy = '';
const harmFor = (why: string, f: () => string) => { hurtWhy = why; try { return f(); } finally { hurtWhy = ''; } };
export function harm(cb: Combat, rng: Rng, att: Unit | null, t: Unit, raw: number, type: 'sigil' | 'elemental' | 'soul' | 'true' | 'physical', dmgType?: string): string {
  if (t.dead) return '';
  let dmg = Math.floor(raw), out = '';
  const arm = type === 'sigil' || type === 'physical' ? t.armour : type === 'elemental' ? Math.floor(t.armour / 2) : 0;
  dmg = Math.max(1, dmg - arm);
  const r = applyDamage(cb, t, dmg, { by: att, type: hurtWhy || type, dmgType: dmgType || (type === 'true' ? 'true' : type), shield: true, credit: 'hp' } as any);
  if (r.shielded) { out += ' (' + r.shielded + ' on the shield)'; emitFx(cb, 'shield', { target: t.id, at: t.pos, absorbed: r.shielded }); }
  if (r.downedHit) { emitFx(cb, 'hurt', { target: t.id, at: t.pos, dmg: 0, why: hurtWhy || type, killed: t.dead }); if (t.dead) fxFell(cb, t); return ' · ' + t.name + ' takes a hit while Downed' + (t.dead ? ' and dies' : ''); }
  if (r.shielded && r.amount <= 0) return ' · ' + t.name + "'s shield takes it" + out;
  if (r.prevented || r.amount <= 0) return ' · ' + t.name + ' takes no damage' + out;
  dmg = r.amount;
  const killed = r.killed;
  emitFx(cb, 'hurt', { target: t.id, at: t.pos, dmg, why: hurtWhy || type, killed }); if (killed) fxFell(cb, t);
  out = ' · ' + dmg + ' damage to ' + t.name + out + (t.hp === 0 ? (t.side === 'foe' ? ', down for good' : ', Downed') : '');
  if (!t.dead && !t.downed && t.mg?.held) out += slip(cb, rng, t, dmg);
  return out;
}
export function heal(t: Unit, n: number, cb?: Combat, by: Unit | null = null): string {
  if (t.dead) return '';
  // The air's Healing given multiplier (spec: the meter bands) applies to magical healing.
  const r = healUnit(cb || null, t, n * (cb ? manaBand(manaOf(cb)).healing_given_mult ?? 1 : 1), by, 'soul');
  if (r.revived) { if (cb) emitFx(cb, 'heal', { target: t.id, at: t.pos, amount: t.hp, revive: true }); return ' · ' + t.name + ' is back up at ' + t.hp + ' HP'; }
  if (cb) emitFx(cb, 'heal', { target: t.id, at: t.pos, amount: r.restored }); return ' · ' + t.name + ' heals ' + r.restored;
}
function shove(cb: Combat, t: Unit, from: string, n: number): string {
  if (t.dead || n === 0) return '';
  const was = t.pos;
  const [fx, fy] = from.split(',').map(Number); let [x, y] = t.pos.split(',').map(Number);
  let dx = Math.sign(x - fx), dy = Math.sign(y - fy); if (n < 0) { dx = -dx; dy = -dy; } if (!dx && !dy) return '';
  let moved = 0;
  for (let i = 0; i < Math.abs(n); i++) {
    const k = (x + dx) + ',' + (y + dy);
    if (!standable(cb.map, k) || cb.units.some((u) => u !== t && !u.dead && u.pos === k) || (cb.objects || []).some((o) => o.pos === k && /barricade|pillar|door|crate/.test(o.kind) && !o.open)) break;
    x += dx; y += dy; moved++;
  }
  if (!moved) return '';
  t.pos = x + ',' + y; emitFx(cb, 'shove', { target: t.id, from: was, to: t.pos, ok: true, magic: true }); return ' · ' + t.name + (n > 0 ? ' is thrown' : ' is dragged') + ' to ' + refOf(t.pos);
}

// ---------- turns ----------
/** Start of a unit's turn: conditions tick (Burning burns), a held Outburst grows and strains the heart, Strain eases
 * after a turn with no cast, wall zones bite whoever starts inside. */
export function magicTurnStart(cb: Combat, rng: Rng, u: Unit) {
  if (u.dead) return;
  noteDeaths(cb);
  // Burning burns at the start of each turn (spec: 10, until put out; it ignores armour). Timed conditions tick at the
  // end of the bearer's turn (condTurnEnd, rules 1.3).
  if (condOn(u, 'burning') && !u.downed) { const by = condSource(u, 'burning'); cb.log.push(u.name + ' burns' + harmFor('burn', () => harm(cb, rng, by ? cb.units.find((x) => x.id === by) || null : null, u, 10, 'true', 'fire'))); }
  const m = u.mg;
  if (m && !u.downed) {
    if (m.held) {
      if (m.held.stage < 4) { m.held.stage++; emitFx(cb, 'grow', { unit: u.id, at: u.pos, stage: m.held.stage }); cb.log.push(u.name + "'s Outburst grows to stage " + m.held.stage + ' (×' + stageMult(m.held.stage) + ').'); }
      addStrain(cb, rng, u, manaBand(manaOf(cb)).id === 'flooded' ? 2 : 1, 'holding');
    } else if (!m.cast && m.strain > 0) m.strain--;
    m.cast = false;
  }
  for (const z of cb.zones || []) if (z.kind === 'wall' && z.tiles.includes(u.pos)) zoneBite(cb, rng, z, u);
}
/** Once per round: glyphs and zones run down. */
export function magicRoundTick(cb: Combat) {
  for (const g of cb.glyphs || []) g.left--;
  const gone = (cb.glyphs || []).filter((g) => g.left <= 0); if (gone.length) cb.log.push(gone.map((g) => g.word.toUpperCase()).join(', ') + ' fade' + (gone.length === 1 ? 's' : '') + ' at ' + [...new Set(gone.map((g) => refOf(g.pos)))].join(', ') + '.');
  cb.glyphs = (cb.glyphs || []).filter((g) => g.left > 0);
  for (const z of cb.zones || []) z.left--;
  cb.zones = (cb.zones || []).filter((z) => z.left > 0);
}
/** Moving into a wall zone. */
export function zoneEnter(cb: Combat, rng: Rng, u: Unit, k: string) { for (const z of cb.zones || []) if (z.kind === 'wall' && z.tiles.includes(k)) zoneBite(cb, rng, z, u); }
function zoneBite(cb: Combat, rng: Rng, z: Zone, u: Unit) {
  if (u.dead || ((z.hit ||= {})[u.id] === cb.round)) return;
  z.hit[u.id] = cb.round;
  const by = cb.units.find((x) => x.id === z.by) || null; let line = '';
  hurtWhy = 'wall';
  try { for (const w of z.words) line += subjectEffect(cb, rng, by, u, SIGIL[w], z.mult, by?.mg?.sigilMult || 1, by?.mg?.elemMult || 1, true, z.tiles[0]); } finally { hurtWhy = ''; }
  if (line) cb.log.push(u.name + ' crosses the ' + z.words.map((w) => w.toUpperCase()).join('·') + ' wall' + line + '.');
}
/** Sight blockers and light from magic (VEIL smoke, LIGHT). */
export const veilTiles = (cb: Combat) => (cb.zones || []).filter((z) => z.kind === 'veil').flatMap((z) => z.tiles);
export const magicLit = (cb: Combat, k: string) => (cb.zones || []).some((z) => z.kind === 'light' && z.tiles.includes(k));

// ---------- Sigils ----------
const canCast = (u: Unit, cb: Combat): string | null => (u.dead || u.downed ? 'Downed.' : condOn(u, 'silenced') ? 'Silenced: no magic this round.' : null);
function sigilReady(cb: Combat, u: Unit): string | null {
  const m = u.mg; if (!m || !m.evoker) return 'You need an Evoker for Sigils.';
  if (m.lockRound != null && cb.round <= m.lockRound) return 'Your Evoker is locked after an overload until next round.';
  return canCast(u, cb);
}
export const glyphApOf = (u: Unit) => (u.mg?.glyphAp || 1) + (condOn(u, 'ldebuff') ? 1 : 0);
/** Draw one glyph (spec: Sigils, 1): own tile or adjacent, 2 per tile, the word's charge, Glyph AP, 1 Flux. */
export function drawGlyph(cb: Combat, rng: Rng, u: Unit, word: string, tile: string): string | null {
  const e = sigilReady(cb, u); if (e) return e;
  const m = u.mg!, w = SIGIL[word]; if (!w) return 'No such word.';
  if (!m.words.includes(word)) return 'You don\'t know ' + w.word + '.';
  if (dist(u.pos, tile) > 1) return 'Draw on your own tile or one next to you.';
  if (!standable(cb.map, tile)) return 'Nothing can be drawn there.';
  if ((cb.glyphs || []).filter((g) => g.pos === tile).length >= 2) return 'A tile holds at most 2 glyphs.';
  const gc = glyphCost(cb, u, word);
  const ap = gc.ap; if (u.ap < ap) return 'Needs ' + ap + ' AP.';
  if (m.charge < gc.charge) return 'Not enough charge in the core (' + m.charge + ' left, ' + w.word + ' needs ' + gc.charge + '): swap a core (2 AP).';
  u.ap = Math.round((u.ap - ap) * 10) / 10; m.charge -= gc.charge;
  const g: Glyph = { id: 'gl' + (cb.glyphSeq = (cb.glyphSeq || 0) + 1), word, pos: tile, by: u.id, side: u.side, left: 2 + m.durBonus, who: u.name };
  cb.glyphs = [...(cb.glyphs || []), g];
  emitFx(cb, 'draw', { unit: u.id, at: u.pos, tile, word, side: u.side });
  // Only so many glyphs of yours on the ground: the oldest fades.
  const mine = cb.glyphs.filter((x) => x.by === u.id);
  let faded = '';
  if (mine.length > m.maxWords) { const old = mine[0]; cb.glyphs = cb.glyphs.filter((x) => x !== old); faded = ' (' + old.word.toUpperCase() + ' at ' + refOf(old.pos) + ' fades: ' + m.maxWords + ' glyphs at most)'; }
  cb.log.push(u.name + ' draws ' + w.word + ' at ' + refOf(tile) + ' (' + gc.charge + ' charge, ' + ap + ' AP)' + faded + '.' + (gc.flux ? flux(cb, rng, u, gc.flux) : ''));
  return null;
}
/** A glyph's price for this unit: 'glyph_cost' {u, word, ap, charge, flux, preview} (mutable), after word_cost items. */
export function glyphCost(cb: Combat, u: Unit, word: string, preview = false): { ap: number; charge: number; flux: number } {
  const w = SIGIL[word], base = { u, word, ap: glyphApOf(u) + ((cb.zones || []).some((z) => z.kind === 'scramble' && z.tiles.includes(u.pos)) ? 1 : 0), charge: Math.max(0, (w?.charge || 0) + (u.mg?.wordCost?.[word] || 0)), flux: 1, preview, cb };
  const c: any = emit(cb, 'glyph_cost', base);
  return { ap: Math.max(0, Math.round(c.ap * 10) / 10), charge: Math.max(0, Math.round(c.charge)), flux: Math.max(0, c.flux) };
}
function flux(cb: Combat, rng: Rng, u: Unit, n: number): string {
  const m = u.mg!; m.flux += n;
  if (m.flux <= FLUX_MAX) return '';
  const over = m.flux - FLUX_MAX, all = m.flux; m.flux = 0; m.lockRound = cb.round;
  emitFx(cb, 'overload', { unit: u.id, at: u.pos }); shiftMana(cb, all, 'an Evoker overloads');
  return ' OVERLOAD: the Evoker bursts' + harmFor('overload', () => harm(cb, rng, null, u, 10 * over, 'true')) + ', locked until next round';
}
export function vent(cb: Combat, u: Unit): string | null {
  const m = u.mg; if (!m || !m.evoker) return 'You need an Evoker.';
  if (u.ap < SPELL_AP.vent) return 'Needs 1 AP.'; if (!m.flux) return 'No Flux to vent.';
  u.ap -= SPELL_AP.vent; const n = m.flux; m.flux = 0; emitFx(cb, 'vent', { unit: u.id, at: u.pos, flux: n }); cb.log.push(u.name + ' vents ' + n + ' Flux into the air.'); shiftMana(cb, n, 'vented Flux');
  return null;
}
export function swapCore(cb: Combat, u: Unit): string | null {
  const m = u.mg; if (!m || !m.evoker) return 'You need an Evoker.';
  if (u.ap < SPELL_AP.core) return 'Needs 2 AP.'; if (m.cores < 1) return 'No spare cores.';
  u.ap -= SPELL_AP.core; m.cores--; m.charge = CORE_CHARGE; emitFx(cb, 'core', { unit: u.id, at: u.pos, dur: 1000 }); cb.log.push(u.name + ' loads a fresh core into the Evoker (' + CORE_CHARGE + ' charge).');
  return null;
}
/** Scuff (1 AP): wipe the glyphs on the tile you stand on. */
export function scuff(cb: Combat, u: Unit): string | null {
  const here = (cb.glyphs || []).filter((g) => g.pos === u.pos); if (!here.length) return 'No glyphs under you.';
  if (u.ap < SPELL_AP.scuff) return 'Needs 1 AP.';
  u.ap -= SPELL_AP.scuff; cb.glyphs = (cb.glyphs || []).filter((g) => g.pos !== u.pos); emitFx(cb, 'scuff', { unit: u.id, at: u.pos });
  cb.log.push(u.name + ' scuffs out ' + here.map((g) => g.word.toUpperCase()).join(' and ') + ' at ' + refOf(u.pos) + '.');
  return null;
}

export interface Pattern { shape: 'stack' | 'line' | 'ring'; tiles: string[]; glyphs: Glyph[]; words: string[]; centre?: string; near?: string; far?: string; dir?: [number, number]; side: 'pc' | 'foe' }
const xy = (k: string) => k.split(',').map(Number) as [number, number];
/** The pattern a glyph belongs to: its connected glyph tiles (same side) as a Stack, a Line or a Ring. */
export function findPattern(cb: Combat, tile: string, from?: string): Pattern | string {
  const start = (cb.glyphs || []).find((g) => g.pos === tile); if (!start) return 'No glyph there.';
  const side = start.side, at = new Map<string, Glyph[]>();
  for (const g of cb.glyphs || []) if (g.side === side) at.set(g.pos, [...(at.get(g.pos) || []), g]);
  const comp: string[] = [], todo = [tile];
  while (todo.length) { const k = todo.pop()!; if (comp.includes(k)) continue; comp.push(k); if (comp.length > 4) return 'Too many glyphs touch here: a pattern is 2 to 4 tiles.';
    for (const n of at.keys()) if (!comp.includes(n) && dist(n, k) === 1) todo.push(n); }
  const glyphs = comp.flatMap((k) => at.get(k)!), words = glyphs.map((g) => g.word), base = { tiles: comp, glyphs, words, side };
  if (comp.length === 1) return glyphs.length >= 2 ? { shape: 'stack', ...base } : 'One glyph alone is no spell: draw a second on the same tile, or a row.';
  // A Line: every tile on one straight row of consecutive tiles.
  const pts = comp.map(xy);
  for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]] as [number, number][]) {
    const sorted = [...pts].sort((a, b) => (a[0] * dx + a[1] * dy) - (b[0] * dx + b[1] * dy));
    const ok = sorted.every((p, i) => i === 0 || (p[0] - sorted[i - 1][0] === dx && p[1] - sorted[i - 1][1] === dy));
    if (ok) {
      const A = sorted[0].join(','), Z = sorted[sorted.length - 1].join(',');
      const near = from && dist(from, Z) < dist(from, A) ? Z : A, far = near === A ? Z : A;
      const d: [number, number] = near === A ? [dx, dy] : [-dx, -dy];
      return { shape: 'line', ...base, near, far, dir: d };
    }
  }
  // A Ring: 3–4 tiles all touching one empty centre tile.
  if (comp.length >= 3) {
    const [x0, y0] = pts[0];
    for (let cx = x0 - 2; cx <= x0 + 2; cx++) for (let cy = y0 - 2; cy <= y0 + 2; cy++) {
      const c = cx + ',' + cy; if (comp.includes(c) || !standable(cb.map, c)) continue;
      if (comp.every((k) => dist(k, c) === 1)) return { shape: 'ring', ...base, centre: c };
    }
  }
  return 'Those glyphs make no shape: a Stack (2 on a tile), a Line (a straight row) or a Ring (around one tile).';
}
const cls = (w: string) => SIGIL[w]?.class || '';
export function grammarError(words: string[], maxWords: number): string | null {
  if (words.length > maxWords) return 'Too many words for you: ' + words.length + ' of at most ' + maxWords + '.';
  if (!words.some((w) => /^subject/.test(cls(w)))) return 'A spell needs a Subject: an element or an effect.';
  if (!words.some((w) => cls(w) === 'form' || cls(w) === 'motion')) return 'A spell needs a Form or a Motion word too.';
  return null;
}
export const evokeCharge = (p: Pattern, u: Unit) => Math.max(1, p.glyphs.length - (u.mg?.coreSave || 0));
/** Where a pattern's spell goes, given the caster's aim. Returns the impact tile, the targets and the source tile. */
function spellPath(cb: Combat, u: Unit, p: Pattern, aim: string | undefined): { impact: string | null; targets: Unit[]; src: string; why?: string; cone?: boolean } {
  const has = (w: string) => p.words.includes(w), live = (k: string) => cb.units.find((x) => x.pos === k && !x.dead);
  const within = (k: string, r: number) => cb.units.filter((x) => !x.dead && dist(x.pos, k) <= r);
  if (p.shape === 'ring') return { impact: p.centre!, src: p.centre!, targets: has('return') || p.words.every((w) => cls(w) !== 'subject_element' && !['bind', 'blind', 'slow', 'muddle', 'dread', 'silence'].includes(w)) ? [live(p.centre!)].filter(Boolean) as Unit[] : within(p.centre!, 1) };
  if (p.shape === 'line') {
    const range = (LINE_RANGE[p.tiles.length] || 4) + (u.mg?.rangeBonus || 0), [dx, dy] = p.dir!;
    let [x, y] = xy(p.far!), impact: string | null = null, last = p.far!;
    if (has('spread')) { // a cone from the far end
      const t = cb.units.filter((v) => { if (v.dead) return false; const [vx, vy] = xy(v.pos), [fx, fy] = xy(p.far!), ax = vx - fx, ay = vy - fy, l = Math.hypot(ax, ay); return l > 0 && l <= 3.5 && (ax * dx + ay * dy) / (l * Math.hypot(dx, dy)) >= 0.7; });
      return { impact: p.far!, src: p.far!, targets: t, cone: true };
    }
    for (let i = 1; i <= range; i++) {
      x += dx; y += dy; const k = x + ',' + y;
      if (!standable(cb.map, k) && !(cb.map.cover.includes(k) && has('seek'))) break;
      last = k; const v = live(k); if (v) { impact = k; break; }
    }
    return { impact: impact || last, src: p.far!, targets: impact ? [live(impact)!] : [] };
  }
  // Stack: an adjacent tile, or with PUSH out to 8 + range bonus with sight.
  const s = p.tiles[0], reach = has('push') ? PUSH_RANGE + (u.mg?.rangeBonus || 0) : 1;
  if (!aim) return { impact: null, src: s, targets: [], why: has('push') ? 'Pick a tile within ' + reach + ' of the stack.' : 'Pick a tile next to the stack.' };
  if (dist(s, aim) > reach) return { impact: null, src: s, targets: [], why: 'Out of reach: ' + reach + ' tile' + (reach === 1 ? '' : 's') + ' from the stack.' };
  if (aim !== s && !has('seek') && !lineOfSight(cb, s, aim)) return { impact: null, src: s, targets: [], why: 'The stack has no line of sight there.' };
  return { impact: aim, src: s, targets: has('spread') ? within(aim, 2) : [live(aim)].filter(Boolean) as Unit[] };
}
/** One Subject's effect on one target. Damage rolls Brain Power against Defense (walls hit automatically at half). */
function subjectEffect(cb: Combat, rng: Rng, by: Unit | null, t: Unit, w: SigilDef | undefined, mult: number, sm: number, em: number, auto: boolean, src: string, opts: { seek?: boolean } = {}): string {
  if (!w || t.dead) return '';
  if (w.class === 'subject_element') {
    let roll = 0, crit = false;
    if (!auto && by) {
      const r = d20(rng), cover = !opts.seek && w.id !== 'shock' && coverTileFor(cb, src, t.pos) ? 5 : 0, tot = r + (by.mg?.brain ?? 0) + (by.sk?.brain_power ?? 0) + condSkillMod(by, 'brain_power') + condHit(by, t, cb) - cover;
      crit = r === 20; roll = r;
      if (r === 1 || (!crit && tot < t.def)) { emitFx(cb, 'miss', { unit: by.id, target: t.id, at: t.pos, by: 'sigil', element: w.id }); return ' · ' + w.word + ' misses ' + t.name + ' (d20 ' + r + ' → ' + tot + ' vs ' + t.def + (cover ? ', cover' : '') + ')'; }
    }
    const dmg = (w.damage || 0) * mult * sm * (w.damage_type === 'elemental' ? em : 1) * (crit ? 2 : 1);
    let line = ' · ' + w.word + (roll ? ' hits (d20 ' + roll + (crit ? ', CRITICAL' : '') + ')' : '') + harm(cb, rng, by, t, dmg, w.damage_type === 'elemental' ? 'elemental' : 'sigil');
    if (!t.dead && w.id === 'fire' && crit) line += applyCond(cb, rng, by, t, 'burning');
    if (!t.dead && w.id === 'freeze') line += applyCond(cb, rng, by, t, 'slowed');
    if (!t.dead && w.id === 'gale') line += shove(cb, t, src, w.push_tiles || 2);
    return line;
  }
  switch (w.id) {
    case 'ward': { const s = grantShield(cb, t, 30 * sm * mult, by); return ' · ' + t.name + ' is warded (' + s + ' shield)'; }
    case 'mend': return heal(t, 25 * sm * mult * (by?.mg?.healMult || 1), cb);
    case 'bind': return applyCond(cb, rng, by, t, 'pinned');
    case 'blind': return applyCond(cb, rng, by, t, 'blinded');
    case 'slow': return applyCond(cb, rng, by, t, 'slowed');
    case 'muddle': return applyCond(cb, rng, by, t, 'ldebuff');
    case 'dread': return applyCond(cb, rng, by, t, 'shaken');
    case 'silence': return applyCond(cb, rng, by, t, 'silenced');
  }
  return '';
}
const around = (k: string, r: number) => { const [x, y] = xy(k), out: string[] = []; for (let i = -r; i <= r; i++) for (let j = -r; j <= r; j++) out.push((x + i) + ',' + (y + j)); return out; };
export interface EvokePreview { ok: boolean; why?: string; pattern?: Pattern; charge: number; ap: number; targets: string[]; impact?: string | null; range?: number; needsAim: boolean }
export function previewEvoke(cb: Combat, u: Unit, tile: string, aim?: string): EvokePreview {
  const no = (why: string, extra: Partial<EvokePreview> = {}): EvokePreview => ({ ok: false, why, charge: 0, ap: SPELL_AP.evoke, targets: [], needsAim: false, ...extra });
  const e = sigilReady(cb, u); if (e) return no(e);
  const p = findPattern(cb, tile, u.pos); if (typeof p === 'string') return no(p);
  const ge = grammarError(p.words, Math.max(u.mg!.maxWords, p.words.length > u.mg!.maxWords ? 0 : 0) || u.mg!.maxWords); if (ge) return no(ge, { pattern: p });
  if (p.side !== u.side && !p.words.every((w) => u.mg!.words.includes(w))) return no('You can\'t read all of those words.', { pattern: p });
  const touch = p.shape === 'line' ? dist(u.pos, p.near!) <= 1 : p.tiles.some((k) => dist(u.pos, k) <= 1);
  if (!touch) return no(p.shape === 'line' ? 'Stand behind the near end of the line to fire it.' : 'Stand on or next to the pattern.', { pattern: p });
  // 'evoke_cost' {u, pattern, ap, charge, preview} (mutable): items change what firing costs.
  const ec: any = emit(cb, 'evoke_cost', { u, pattern: p, ap: SPELL_AP.evoke, charge: evokeCharge(p, u), preview: true, cb });
  const charge = Math.max(0, ec.charge), eap = Math.max(0, ec.ap); if (u.mg!.charge < charge) return no('Firing needs ' + charge + ' charge (' + u.mg!.charge + ' left): swap a core.', { pattern: p, charge });
  if (u.ap < eap) return no('Needs ' + eap + ' AP.', { pattern: p, charge });
  const needsAim = p.shape === 'stack';
  if (p.words.includes('stay')) return { ok: true, pattern: p, charge, ap: eap, targets: [], impact: null, needsAim: false };
  const path = spellPath(cb, u, p, aim);
  if (path.why) return { ok: false, why: path.why, pattern: p, charge, ap: eap, targets: [], needsAim, range: p.words.includes('push') ? PUSH_RANGE + (u.mg!.rangeBonus || 0) : 1 };
  return { ok: true, pattern: p, charge, ap: eap, targets: path.targets.map((t) => t.id), impact: path.impact, needsAim, range: p.shape === 'line' ? (LINE_RANGE[p.tiles.length] || 4) + u.mg!.rangeBonus : undefined };
}
/** Evoke (spec: Sigils, 6): fire the pattern at that tile. */
export function evoke(cb: Combat, rng: Rng, u: Unit, tile: string, aim?: string): string | null {
  const pv = previewEvoke(cb, u, tile, aim); if (!pv.ok) return pv.why || 'Can\'t fire that.';
  const p = pv.pattern!, m = u.mg!, has = (w: string) => p.words.includes(w), name = p.words.map((w) => w.toUpperCase()).join(' · ');
  u.ap -= pv.ap; m.charge -= pv.charge; m.cast = true;
  const subjects = p.words.filter((w) => /^subject/.test(cls(w)));
  const head = u.name + ' evokes ' + name + ' (' + p.shape + (p.shape === 'line' ? ' of ' + p.tiles.length : '') + ', ' + pv.charge + ' charge)';
  // STAY: the pattern stands as a wall (Line), a zone at the centre (Ring) or on the tile (Stack); the glyphs remain.
  if (has('stay')) {
    const tiles = p.shape === 'line' ? p.tiles : p.shape === 'ring' ? [p.centre!] : p.tiles;
    const left = Math.max(...p.glyphs.map((g) => g.left));
    const veil = subjects.includes('veil'), light = subjects.includes('light');
    emitFx(cb, 'evoke', { unit: u.id, at: u.pos, shape: p.shape, tiles: p.tiles, src: p.shape === 'line' ? p.far : p.centre || p.tiles[0], impact: null, targets: [], words: p.words, element: subjects[0] || null, stay: true, side: u.side });
    cb.zones = [...(cb.zones || []), { id: 'z' + (cb.glyphSeq = (cb.glyphSeq || 0) + 1), kind: veil ? 'veil' : light ? 'light' : 'wall', tiles: veil ? tiles.flatMap((k) => around(k, 1)) : light ? tiles.flatMap((k) => around(k, 4)) : tiles, words: subjects, by: u.id, side: u.side, left, mult: 0.5, who: u.name }];
    cb.log.push(head + ': it stands' + (veil ? ' as smoke' : light ? ' as light' : ' as a wall') + ' at ' + tiles.map(refOf).join(', ') + ' for ' + left + ' round' + (left === 1 ? '' : 's') + '.');
    return null;
  }
  const path = spellPath(cb, u, p, aim);
  emitFx(cb, 'evoke', { unit: u.id, at: u.pos, shape: p.shape, tiles: p.tiles, src: path.src, impact: path.impact, targets: path.targets.map((t) => t.id), targetAt: path.targets.map((t) => t.pos), words: p.words, element: subjects[0] || null, cone: !!path.cone, side: u.side });
  const formMult = path.cone ? 0.6 : has('spread') ? 0.6 : p.shape === 'ring' ? 0.8 : 1;
  let line = '';
  const hitAll = (targets: Unit[], src: string) => {
    for (const t of targets) {
      if (has('pull')) line += shove(cb, t, p.shape === 'line' ? p.near! : p.centre || p.tiles[0], -3);
      for (const w of subjects) line += subjectEffect(cb, rng, u, t, SIGIL[w], formMult, m.sigilMult, m.elemMult, false, src, { seek: has('seek') });
    }
  };
  // Area words land on the tile even with nobody there.
  if (path.impact && subjects.includes('veil')) { cb.zones = [...(cb.zones || []), { id: 'z' + (cb.glyphSeq = (cb.glyphSeq || 0) + 1), kind: 'veil', tiles: around(path.impact, 1), words: ['veil'], by: u.id, side: u.side, left: 2 + m.durBonus, mult: 1, who: u.name }]; line += ' · smoke-bots fill ' + refOf(path.impact); }
  if (path.impact && subjects.includes('light')) { cb.zones = [...(cb.zones || []), { id: 'z' + (cb.glyphSeq = (cb.glyphSeq || 0) + 1), kind: 'light', tiles: around(path.impact, 4), words: ['light'], by: u.id, side: u.side, left: 99, mult: 1, who: u.name }]; line += ' · light floods around ' + refOf(path.impact); }
  hitAll(path.targets, path.src);
  if (!path.targets.length && !line) line = ' · it strikes ' + (path.impact ? refOf(path.impact) : 'nothing') + ' and finds no one';
  if (has('twice')) {
    const first = path.targets[0], second = cb.units.filter((v) => !v.dead && v.side !== u.side && v !== first && dist(v.pos, path.impact || u.pos) <= 6 && lineOfSight(cb, path.impact || u.pos, v.pos)).sort((a, b) => dist(a.pos, path.impact || u.pos) - dist(b.pos, path.impact || u.pos))[0];
    if (second) { line += ' · TWICE:'; hitAll([second], path.impact || path.src); }
  }
  // The glyphs fade as the spell fires.
  const used = new Set(p.glyphs.map((g) => g.id)); cb.glyphs = (cb.glyphs || []).filter((g) => !used.has(g.id));
  cb.log.push(head + line + '.');
  return null;
}

// ---------- Outbursts ----------
export const stageMult = (stage: number) => 1 + 0.5 * (stage - 1);
export function designCost(m: MagicUnit, d: OutburstDesign, mana: number): number {
  const base = (SCHOOL[d.school]?.base_cost || 20) + (d.school2 ? 20 : 0) + d.modules.reduce((t, x) => t + (MODULE[x]?.cost || 0), 0);
  return Math.max(5, Math.round(base * manaBand(mana).soul_cost_mult * (1 - m.costSave)));
}
export const designAp = (m: MagicUnit, d: OutburstDesign) => Math.max(1, m.soulAp - (d.modules.includes('swift') ? 1 : 0));
export const designRange = (m: MagicUnit, d: OutburstDesign) => (d.modules.includes('move') ? 8 : SOUL_REACH) + m.soulRange;
function addStrain(cb: Combat, rng: Rng, u: Unit, n: number, why: string) {
  const m = u.mg!; m.strain += n;
  if (m.strain > m.strainLimit) manaShort(cb, rng, u);
}
/** The Mana Short (spec: Soul magic, 5): d20 + Will Power vs 10 + 2 × the excess. A natural 1 bursts the heart: Downed,
 * never dead (Leon). A failure hurts and stuns, and anything held releases wild. */
function manaShort(cb: Combat, rng: Rng, u: Unit) {
  const m = u.mg!, over = m.strain - m.strainLimit, r = d20(rng), tn = 10 + 2 * over, tot = r + m.will;
  emitFx(cb, 'short', { unit: u.id, at: u.pos, burst: r === 1, held: r !== 20 && (r === 1 || tot < tn) });
  if (r === 1) {
    applyDamage(cb, u, u.hp, { type: 'short', shield: false, credit: 'none' }); if (u.hp === 0) fxFell(cb, u);
    cb.log.push('MANA SHORT: ' + u.name + "'s heart bursts (d20 1 vs " + tn + '): ' + (u.side === 'foe' ? 'dead' : 'Downed') + '.');
    m.held = null; return;
  }
  if (r !== 20 && tot < tn) {
    cb.log.push('MANA SHORT: ' + u.name + ' (d20 ' + r + ' → ' + tot + ' vs ' + tn + ')' + harmFor('short', () => harm(cb, rng, null, u, 15 * m.strain, 'true')) + ', Stunned.');
    if (!u.dead && !u.downed) applyCond(cb, rng, null, u, 'stunned', 1, undefined, { skipSave: true }); // spec: Stunned loses the next turn (rules 1.3)
    if (m.held && !u.dead && !u.downed) wildRelease(cb, rng, u);
  } else cb.log.push(u.name + ' holds the Strain together (d20 ' + r + ' → ' + tot + ' vs ' + tn + ').');
}
function slip(cb: Combat, rng: Rng, u: Unit, dmg: number): string {
  const r = d20(rng), tn = 10 + Math.floor(dmg / 10), tot = r + (u.mg?.will || 0);
  if (r === 20 || (r !== 1 && tot >= tn)) return ' · ' + u.name + ' keeps hold of the Outburst';
  return ' · the Outburst slips' + (wildRelease(cb, rng, u) ? '' : '');
}
function wildRelease(cb: Combat, rng: Rng, u: Unit): boolean {
  const m = u.mg!, d = m.designs.find((x) => x.id === m.held?.design); if (!d) { m.held = null; return false; }
  const near = cb.units.filter((v) => !v.dead && v !== u && dist(v.pos, u.pos) <= designRange(m, d));
  if (!near.length) { emitFx(cb, 'release', { unit: u.id, at: u.pos, to: u.pos, school: d.school, stage: m.held?.stage || 1, wild: true, area: 0, targets: [], air: true }); cb.log.push(u.name + "'s Outburst bursts into the air."); m.held = null; return true; }
  const t = near[die(rng, near.length) - 1];
  cb.log.push(u.name + "'s Outburst releases wild at " + t.name + '.');
  releaseAt(cb, rng, u, d, t.pos, true);
  return true;
}
export interface OutburstPreview { ok: boolean; why?: string; cost: number; ap: number; range: number; strain: number; stage: number; hp?: number }
export function previewOutburst(cb: Combat, u: Unit, designId: string, aim?: string, release = true): OutburstPreview {
  const m = u.mg, no = (why: string): OutburstPreview => ({ ok: false, why, cost: 0, ap: 0, range: 0, strain: 0, stage: 1 });
  if (!m) return no('You have no Outbursts.');
  const e = canCast(u, cb); if (e) return no(e);
  if (m.held) return no('You are already holding an Outburst: release it first.');
  const d = m.designs.find((x) => x.id === designId); if (!d) return no('No such design.');
  // 'outburst_cost' {u, design, mp, ap, range, strain, hp, release, preview} (mutable): items change the price
  // (pay HP instead of MP, a free cast, more reach). hp > 0 is taken from the caster's HP when the cast is paid.
  const oc: any = emit(cb, 'outburst_cost', { u, design: d, mp: designCost(m, d, manaOf(cb)) * (condOn(u, 'rdebuff') ? 1.2 : 1), ap: designAp(m, d), range: designRange(m, d), strain: (manaBand(manaOf(cb)).id === 'flooded' ? 2 : 1) + (m.emanator ? 0 : 2), hp: 0, release, preview: true, cb });
  const cost = Math.max(0, Math.round(oc.mp)), ap = Math.max(0, oc.ap), range = oc.range, strain = Math.max(0, oc.strain), hp = Math.max(0, Math.round(oc.hp || 0));
  if (hp && u.hp <= hp) return { ok: false, why: 'Paying ' + hp + ' HP would drop you.', cost, ap, range, strain, stage: 1, hp };
  if (u.ap < ap) return { ok: false, why: 'Needs ' + ap + ' AP.', cost, ap, range, strain, stage: 1, hp };
  if (m.emanator && m.mp < cost) return { ok: false, why: 'Needs ' + cost + ' MP (' + m.mp + '): Syphon first.', cost, ap, range, strain, stage: 1, hp };
  if (release) { const why = aimError(cb, u, d, aim, range); if (why) return { ok: false, why, cost, ap, range, strain, stage: 1, hp }; }
  return { ok: true, cost, ap, range, strain, stage: 1, hp };
}
function aimError(cb: Combat, u: Unit, d: OutburstDesign, aim?: string, range?: number): string | null {
  if (!aim) return 'Pick a target tile.';
  const r = range ?? designRange(u.mg!, d);
  if (dist(u.pos, aim) > r) return 'Out of reach (' + r + ' tiles).';
  if (!d.modules.includes('ether') && !d.modules.includes('teleport') && aim !== u.pos && !lineOfSight(cb, u.pos, aim)) return 'No line of sight.';
  return null;
}
/** Begin an Outburst (spec: Soul magic, 1-2): pay MP, take Strain, hold it, or release it at once (free). */
export function beginOutburst(cb: Combat, rng: Rng, u: Unit, designId: string, aim: string | undefined, hold: boolean): string | null {
  const pv = previewOutburst(cb, u, designId, aim, !hold); if (!pv.ok) return pv.why || 'Can\'t.';
  const m = u.mg!, d = m.designs.find((x) => x.id === designId)!;
  u.ap -= pv.ap; if (m.emanator) m.mp -= pv.cost; m.cast = true;
  if (pv.hp) applyDamage(cb, u, pv.hp, { by: u, type: 'heart', shield: false, credit: 'none' });
  emit(cb, 'outburst_begin', { u, design: d, hold, cost: pv.cost, hp: pv.hp || 0, cb, rng }); // 'outburst_begin' {u, design, hold, cost, hp}
  shiftMana(cb, -Math.ceil(pv.cost / 10));
  m.held = { design: d.id, stage: 1, cost: pv.cost };
  emitFx(cb, 'outburst', { unit: u.id, at: u.pos, design: d.id, school: d.school, hold, stage: 1 });
  cb.log.push(u.name + (hold ? ' begins ' + d.name + ' and holds it: the heart glows' : ' lets ' + d.name + ' go') + ' (' + pv.cost + ' MP' + (m.emanator ? '' : ' from the air') + ').');
  addStrain(cb, rng, u, pv.strain, 'cast');
  if (!hold && m.held && !u.dead && !u.downed) releaseAt(cb, rng, u, d, aim!, false);
  return null;
}
/** Release a held Outburst (1 AP). */
export function releaseOutburst(cb: Combat, rng: Rng, u: Unit, aim?: string): string | null {
  const m = u.mg; if (!m || !m.held) return 'Nothing held.';
  const e = canCast(u, cb); if (e) return e;
  const d = m.designs.find((x) => x.id === m.held!.design); if (!d) { m.held = null; return 'That design is gone.'; }
  if (u.ap < SPELL_AP.release) return 'Needs 1 AP.';
  const why = aimError(cb, u, d, aim); if (why) return why;
  u.ap -= SPELL_AP.release; m.cast = true;
  releaseAt(cb, rng, u, d, aim!, false);
  return null;
}
function releaseAt(cb: Combat, rng: Rng, u: Unit, d: OutburstDesign, aim: string, wild: boolean) {
  const m = u.mg!, stage = m.held?.stage || 1, has = (x: string) => d.modules.includes(x);
  // 'outburst_release' {u, design, stage, aim, wild, mult} (mult multiplies the stage multiplier).
  const orl: any = emit(cb, 'outburst_release', { u, design: d, stage, aim, wild, mult: 1, cb, rng }); const sm = stageMult(stage) * (orl.mult || 1);
  m.held = null;
  const range = designRange(m, d);
  if (has('random') && !wild) { const pool = cb.units.filter((v) => !v.dead && v !== u && dist(v.pos, u.pos) <= range); if (pool.length) aim = pool[die(rng, pool.length) - 1].pos; }
  const radius = has('rain') ? 2 : 0, size = has('size') ? 1 : 0, area = radius + size;
  let targets = area ? cb.units.filter((v) => !v.dead && dist(v.pos, aim) <= area) : cb.units.filter((v) => !v.dead && v.pos === aim);
  emitFx(cb, 'release', { unit: u.id, at: u.pos, to: aim, school: d.school, option: d.option || null, stage, wild, area, targets: targets.map((t) => t.id) });
  const line: string[] = [];
  // A design with two schools (Twin Souls, plan 2.8-19) runs both at release, the second school after the first.
  const schools = [d.school, ...(d.school2 && d.school2 !== d.school ? [d.school2] : [])];
  const one = (t: Unit, f: number) => { for (const school of schools) { if (t.dead) break; oneSchool(t, f, school); } };
  const oneSchool = (t: Unit, f: number, school: string) => {
    if (school === 'damage') {
      const base = (SCHOOL.damage.damage || 25) * m.soulMult * sm * f * (has('rain') ? 0.6 : 1) * (has('at_once') ? 0.5 : 1);
      if (has('inverse') && t.side === u.side) { const s = grantShield(cb, t, base, u); line.push(t.name + ' is shielded (' + s + ')'); return; }
      if (!has('at_once')) {
        const r = d20(rng), cover = !has('homing') && coverTileFor(cb, u.pos, t.pos) ? 5 : 0, tot = r + m.will + (u.sk?.will_power ?? 0) + condSkillMod(u, 'will_power') + (has('homing') ? 2 : 0) + condHit(u, t, cb) - cover;
        if (r === 1 || (r !== 20 && tot < t.def)) { emitFx(cb, 'miss', { unit: u.id, target: t.id, at: t.pos, by: 'soul' }); line.push('misses ' + t.name + ' (d20 ' + r + ' → ' + tot + ' vs ' + t.def + ')'); return; }
        line.push('hits ' + t.name + ' (d20 ' + r + (r === 20 ? ', CRITICAL' : '') + ')' + harm(cb, rng, u, t, base * (r === 20 ? 2 : 1), 'soul'));
      } else line.push(harm(cb, rng, u, t, base, 'soul').replace(/^ · /, ''));
    } else if (school === 'buff') {
      const opt = d.option || 'heal';
      if (opt === 'defense') line.push(applyCond(cb, rng, u, t, 'guarded', 2 + (has('time') ? 2 : 0)).replace(/^ · /, ''));
      else if (opt === 'hit') line.push(applyCond(cb, rng, u, t, 'inspired', 2 + (has('time') ? 2 : 0)).replace(/^ · /, ''));
      else line.push(heal(t, 30 * m.healMult * sm * f, cb, u).replace(/^ · /, ''));
    } else if (school === 'control') {
      const opt = d.option || 'push';
      if (opt === 'push' || opt === 'pull') { const r = d20(rng), ok = r === 20 || (r !== 1 && r + saveOf(t, 'body') >= 12 + m.debuff.body); line.push(ok ? t.name + ' holds its ground (Body save)' : (shove(cb, t, u.pos, opt === 'push' ? 3 : -3).replace(/^ · /, '') || t.name + ' can\'t be moved')); }
      else line.push(applyCond(cb, rng, u, t, opt === 'pinned' ? 'pinned' : 'slowed', 2 + (has('time') ? 2 : 0)).replace(/^ · /, ''));
    } else if (school === 'status') {
      const opt = d.option || 'shaken', id = opt === 'left_brain_debuff' ? 'ldebuff' : opt === 'right_brain_debuff' ? 'rdebuff' : opt;
      line.push(applyCond(cb, rng, u, t, id, 2 + (has('time') ? 2 : 0), has('left') ? 'brain' : has('right') ? 'heart' : undefined).replace(/^ · /, ''));
    }
  };
  for (const t of targets) one(t, 1);
  if (!targets.length) line.push('nobody at ' + refOf(aim));
  if (has('duplicate') || has('bounce')) {
    const t0 = targets[0], next = cb.units.filter((v) => !v.dead && v !== u && v !== t0 && v.side !== u.side && dist(v.pos, aim) <= 3)[0];
    if (next) { line.push(has('duplicate') ? 'a second copy finds ' + next.name : 'it bounces to ' + next.name); one(next, has('bounce') ? 0.5 : 1); }
  }
  const narr = d.modules.filter((x) => ['periodic', 'proximity', 'expire', 'mastery', 'teleport'].includes(x));
  if (narr.length) (cb.notes ||= []).push(u.name + "'s Outburst " + d.name + ' carries ' + narr.join(', ') + ': rule what it does.');
  cb.log.push(u.name + ' releases ' + d.name + (stage > 1 ? ' at stage ' + stage + ' (×' + sm + ')' : '') + (wild ? ' (wild)' : '') + ': ' + line.filter(Boolean).join(' · ') + '.');
}
/** Syphon (1 AP): MP from the air by the band, × the Syphon bonus; the meter drops 2. */
export function syphon(cb: Combat, u: Unit): string | null {
  const m = u.mg; if (!m || !m.emanator) return 'You need an Emanator to Syphon.';
  if (u.ap < SPELL_AP.syphon) return 'Needs 1 AP.'; if (m.mp >= m.mpMax) return 'Your Emanator is full.';
  u.ap -= SPELL_AP.syphon; const gain = Math.round(manaBand(manaOf(cb)).syphon_mp * m.syphon), was = m.mp; m.mp = Math.min(m.mpMax, m.mp + gain);
  emitFx(cb, 'syphon', { unit: u.id, at: u.pos, mp: m.mp - was }); shiftMana(cb, -2); cb.log.push(u.name + ' syphons ' + (m.mp - was) + ' MP from the air (' + m.mp + '/' + m.mpMax + ').');
  return null;
}
/** Crystallise (3 AP, the meter at 10+): the meter drops 10 and you make one standard core. */
export function crystallise(cb: Combat, u: Unit): string | null {
  const m = u.mg; if (!m || !m.emanator) return 'You need an Emanator to Crystallise.';
  if (u.ap < SPELL_AP.crystallise) return 'Needs 3 AP.'; if (manaOf(cb) < 10) return 'The air is too thin (mana ' + manaOf(cb) + ', needs 10).';
  u.ap -= SPELL_AP.crystallise; m.coresMade++; emitFx(cb, 'crystallise', { unit: u.id, at: u.pos, dur: 1400 }); shiftMana(cb, -10); cb.log.push(u.name + ' crystallises a mana core from the air.');
  return null;
}
/** Enemies scuff a player's glyph they stand on (spec: Sigils, 4). */
export function enemyScuff(cb: Combat, u: Unit): boolean {
  if (u.ap < SPELL_AP.scuff || !(cb.glyphs || []).some((g) => g.pos === u.pos && g.side !== u.side)) return false;
  return !scuff(cb, u);
}
export const glyphsAt = (cb: Combat, k: string) => (cb.glyphs || []).filter((g) => g.pos === k);
/** Who a spell would affect, hit or miss (used to decide whether a spell on the story map starts a fight). */
export function spellTargets(cb: Combat, u: Unit, act: string, tile?: string, aim?: string, designId?: string): string[] {
  if (act === 'evoke') return tile ? previewEvoke(cb, u, tile, aim).targets : [];
  const m = u.mg; if (!m || !aim) return [];
  const d = m.designs.find((x) => x.id === (act === 'release' ? m.held?.design : designId)); if (!d) return [];
  const area = (d.modules.includes('rain') ? 2 : 0) + (d.modules.includes('size') ? 1 : 0);
  return cb.units.filter((v) => !v.dead && (area ? dist(v.pos, aim) <= area : v.pos === aim)).map((v) => v.id);
}

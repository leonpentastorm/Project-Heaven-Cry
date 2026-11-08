// Magic (spec: Mana; Sigils rules 1.4, Soul rules 1.2). Sigils are words drawn as glyphs onto tiles (sigil.ts: the Line,
// the facing rule, Reach, Delivery, Burst, KIN), fired with Evoke. Outbursts are held in the heart, grow each turn and are released when
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
import { itemWords, wordCostMods, immune, actionAp } from './effects/core';

type Fam = 'body' | 'brain' | 'heart';
/** A glyph on a tile. v: the rules revision it was drawn under (14 = rules 1.4; a glyph without it is from 1.2). */
export interface Glyph { id: string; word: string; pos: string; by: string; side: 'pc' | 'foe'; left: number; who: string; v?: number }
/** Placed magic and other standing zones. Sigil 1.4: 'field' (STAY), 'trap' (WAIT; hidden from the other side until
 * spotted), 'turret' (WATCH; hp, def), 'veil' (smoke), 'light'. 'wall' is a 1.2 standing wall (read as a field).
 * Class and gadget zones (scramble, seal, sanctuary, grand…) use the same shape. */
export interface Zone { id: string; kind: 'field' | 'trap' | 'turret' | 'wall' | 'veil' | 'light' | 'scramble'; tiles: string[]; words: string[]; by: string; side: 'pc' | 'foe'; left: number; mult: number; who: string; hit?: Record<string, number>;
  /** field (item 422): the creatures it has ever affected (they take ×mult after), and its first-time multiplier. */
  ever?: Record<string, boolean>; first?: number;
  /** field: the Burst multiplier per tile; trap/turret: hidden, the sides that spotted it, triggers left, hp, def; element. */
  tileMult?: Record<string, number>; hidden?: boolean; spotted?: string[]; triggers?: number; hp?: number; def?: number; element?: string | null; kin?: boolean; dir?: [number, number]; reachMult?: number }
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
  commanded: { name: 'Commanded', fam: 'heart', rounds: 1, text: 'You obey one short order on your next turn (halt, kneel, drop your weapon, or move up to 3 tiles).' },
  corroded: { name: 'Corroded', fam: 'body', rounds: 3, text: '5 damage at the start of each turn; Defense −2. A Body save at the end of each of your turns ends it.' },
  disarmed: { name: 'Disarmed', fam: 'heart', rounds: 99, noTick: true, text: 'Your weapon is down: no attacks with it until you recover it (2 AP).' },
  lowered: { name: 'Weapon lowered', fam: 'heart', rounds: 99, noTick: true, text: 'Your weapon is lowered: raise it (1 AP) to attack with it.' },
  marked: { name: 'Marked', fam: 'body', rounds: 99, noTick: true, noSave: true, text: 'The marker\'s squad gets +1 to hit you; you can\'t become Hidden.' },
  guarded: { name: 'Guarded (+2 Defense)', fam: 'body', rounds: 2, boon: true, text: '+2 Defense.' },
  inspired: { name: 'Inspired (+2 to hit)', fam: 'heart', rounds: 2, boon: true, text: '+2 to hit.' },
  withdrawing: { name: 'Withdrawing (+2 Defense)', fam: 'body', rounds: 1, boon: true, text: '+2 Defense until your next turn ends.' },
  emplaced: { name: 'Emplaced', fam: 'body', rounds: 99, noTick: true, boon: true, text: '+2 to attacks with the weapon; Recoil halved; moving ends it.' },
  last_turn: { name: 'Last Turn', fam: 'body', rounds: 1, boon: true, text: 'Still standing on borrowed time.' },
  quickened: { name: 'Quickened', fam: 'body', rounds: 99, noTick: true, boon: true, text: '+2 AP on your next turn (within the ceiling of 9).' },
  sharpened: { name: 'Sharpened', fam: 'body', rounds: 1, boon: true, text: 'Your next attack: +3 to hit and ×1.25 damage (until that attack, or the end of your next turn).' },
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
  if (condOn(u, 'sharpened')) n += 3; // SHARPEN (rules 1.4): spent on the next attack
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
  // The log shows every save, failed ones too (spec: Sigils 9, Afterwards: "every target, roll, save and number").
  let saved = '';
  if (!BOOST.has(id) && !def.noSave && !ca.skipSave) {
    const r = d20(rng), m = saveOf(t, f) + (ca.saveAdd || 0), tn = 12 + (by ? debuffOf(by, f) : 0) + (ca.tnAdd || 0), ok = r === 20 || (r !== 1 && r + m >= tn);
    if (ok) { emitFx(cb, 'cond', { target: t.id, at: t.pos, id, resisted: true }); return ' · ' + t.name + ' resists (' + f + ' save ' + (r + m) + ' vs ' + tn + ')'; }
    saved = f + ' save ' + (r + m) + ' vs ' + tn + (r === 1 ? ', natural 1' : '');
  }
  if (id === 'marked' && t.hidden) { t.hidden = false; delete t.hideEntry; }
  const n = ca.rounds || rounds || def.rounds, had = condOn(t, id);
  emitFx(cb, 'cond', { target: t.id, at: t.pos, id, ...(FX_ELEMENT ? { element: FX_ELEMENT } : {}) });
  (t.condAt ||= {})[id] = (cb.condSeq = (cb.condSeq || 0) + 1); // CLEANSE ends the newest
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
    if (id === 'corroded') t.def -= 2;
    if (id === 'grappled' || id === 'stunned') { t.overwatch = null; }
  }
  emit(cb, 'cond_landed', { by, t, id, rounds: n, cb, rng }); // 'cond_landed' {by, t, id, rounds}: after it takes hold
  const dur = def.noTick && !rounds ? '' : n + ' round' + (n === 1 ? '' : 's');
  return ' · ' + t.name + ' is ' + def.name + (dur || saved ? ' (' + [dur, saved].filter(Boolean).join('; ') + ')' : '');
}
/** Conditions the engine keeps as unit flags: Dazed (−2 AP next turn), Prone, Bleeding (3 rounds; a hit's rider, no
 * save), Hidden (see combat.ts hide), Injured (a d6 location, no resistance). */
function flagCond(cb: Combat, rng: Rng, by: Unit | null, t: Unit, id: string, rounds: number | undefined, opts: CondOpts): string {
  if (t.dead) return '';
  const fam: Fam = 'body', noSave = id === 'bleeding' || id === 'injured' || id === 'hidden' || id === 'prone';
  const ca: any = emit(cb, 'cond_apply', { by, t, id, fam, rounds: rounds || 1, skipSave: noSave || !!opts.skipSave, cancel: false, why: '', tnAdd: opts.tnAdd || 0, saveAdd: 0, cb, rng });
  if (ca.cancel) return ' · ' + t.name + ' is untouched' + (ca.why ? ' (' + ca.why + ')' : '');
  let saved = '';
  if (!ca.skipSave) { const r = d20(rng), m = saveOf(t, fam) + (ca.saveAdd || 0), tn = 12 + (by ? debuffOf(by, fam) : 0) + (ca.tnAdd || 0);
    if (r === 20 || (r !== 1 && r + m >= tn)) return ' · ' + t.name + ' resists (body save ' + (r + m) + ' vs ' + tn + ')';
    saved = ' (body save ' + (r + m) + ' vs ' + tn + (r === 1 ? ', natural 1' : '') + ')'; }
  if (id === 'dazed' || id === 'prone' || id === 'bleeding') (t.condAt ||= {})[id] = (cb.condSeq = (cb.condSeq || 0) + 1);
  if (id === 'dazed') { t.dazedNext = 1; emit(cb, 'cond_landed', { by, t, id, rounds: 1, cb, rng }); return ' · ' + t.name + ' is Dazed' + saved; }
  if (id === 'prone') { t.prone = true; t.braced = false; emit(cb, 'cond_landed', { by, t, id, rounds: 0, cb, rng }); return ' · ' + t.name + ' is knocked prone' + saved; }
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
  if (id === 'corroded') u.def += 2;
  delete u.conds![id];
  if (u.condAt) delete u.condAt[id];
  if (u.condBy) delete u.condBy[id];
  if (u.condArg) delete u.condArg[id];
  if (u.condFresh) u.condFresh = u.condFresh.filter((x) => x !== id);
}
/** The end of a unit's turn (spec: Conditions tick at the end of the bearer's turn, rules 1.3): every timed condition
 * loses a round, except one put on during this same turn; at 0 it ends. Grappled ends if the grappler is gone or no
 * longer adjacent; Taunted when the taunter is down. */
export function condTurnEnd(cb: Combat, u: Unit, rng?: Rng | null) {
  if (u.dead) return;
  // MASK (rules 1.4): Hidden for 2 of the bearer's turn ends, or until it attacks (then it is no longer Hidden).
  if (u.maskLeft) { if (!u.hidden) delete u.maskLeft; else if (u.maskFresh) u.maskFresh = false; else if (--u.maskLeft <= 0) { delete u.maskLeft; u.hidden = false; for (const side of Object.keys(cb.lastSeen || {})) delete cb.lastSeen![side][u.id]; emitFx(cb, 'mask', { target: u.id, at: u.pos, fade: true }); cb.log.push(u.name + "'s MASK fades: no longer Hidden."); } }
  if (!u.conds) return;
  const fresh = new Set(u.condFresh || []); u.condFresh = [];
  // Corroded (rules 1.4): a Body save at the end of each of the bearer's turns ends it early (against 12 + the caster's
  // Body debuff strength). Not on the turn it landed.
  if (condOn(u, 'corroded') && !fresh.has('corroded') && rng) {
    const by = condSource(u, 'corroded'), src = by ? cb.units.find((x) => x.id === by) : null, r = d20(rng), m = saveOf(u, 'body'), tn = 12 + (src ? debuffOf(src, 'body') : 0);
    if (r === 20 || (r !== 1 && r + m >= tn)) { endCond(u, 'corroded', cb); cb.log.push(u.name + ' scrubs off the acid (body save ' + (r + m) + ' vs ' + tn + ').'); }
  }
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
  // 'damage_out' for spells (hooks gap A4/F3): the same hook attacks use, before armour, so "+X% against this target"
  // and the caster's own multipliers reach Sigil, Elemental and Soul damage. ctx.spell is true and ctx.mode 'spell';
  // weapon-only handlers check ctx.src.type === 'weapon'. Hazards (burn, short, overload, wall) and blows with no
  // attacker skip it.
  if (att && !hurtWhy) {
    const src: any = { by: att, type, dmgType: dmgType || type, spell: true, ...(SPELL_FROM ? { from: SPELL_FROM } : {}) };
    const ctx: any = { att, tgt: t, mode: 'spell', melee: false, spell: true, src, base: dmg, add: 0, mults: [], vs: [] as any[], crit: false, preview: false, cb, mods: cb.mods || [] };
    if (t.weakPoint && att.side === 'pc') ctx.vs.push({ v: 0.15, label: 'Weak Point' }); // the squad's +15% (spec), spells too
    emit(cb, 'damage_out', ctx);
    const vsSum = ctx.vs.reduce((a: number, x: any) => a + x.v, 0); // tactics.ts stackDamage: target bonuses add, capped at +100%
    dmg = Math.floor(Math.max(0, dmg + ctx.add) * ctx.mults.reduce((a: number, m: any) => a * m.v, 1) * (1 + Math.min(1, Math.max(-0.9, vsSum))));
  }
  const arm = type === 'sigil' || type === 'physical' ? t.armour : type === 'elemental' ? Math.floor(t.armour / 2) : 0;
  dmg = Math.max(1, dmg - arm);
  const r = applyDamage(cb, t, dmg, { by: att, type: hurtWhy || type, dmgType: dmgType || (type === 'true' ? 'true' : type), shield: true, credit: 'hp', ...(SPELL && att ? { spellMp: SPELL.mp, spellWords: SPELL.words } : {}), ...(SPELL_FROM ? { from: SPELL_FROM } : {}) } as any);
  if (r.shielded) { out += ' (' + r.shielded + ' on the shield)'; emitFx(cb, 'shield', { target: t.id, at: t.pos, absorbed: r.shielded }); }
  if (r.downedHit) { emitFx(cb, 'hurt', { target: t.id, at: t.pos, dmg: 0, why: hurtWhy || type, killed: t.dead }); if (t.dead) fxFell(cb, t); return ' · ' + t.name + ' takes a hit while Downed' + (t.dead ? ' and dies' : ''); }
  if (r.shielded && r.amount <= 0) return ' · ' + t.name + "'s shield takes it" + out;
  if (r.prevented || r.amount <= 0) return ' · ' + t.name + ' takes no damage' + out;
  dmg = r.amount;
  const killed = r.killed;
  emitFx(cb, 'hurt', { target: t.id, at: t.pos, dmg, why: hurtWhy || type, killed, ...(FX_ELEMENT ? { element: FX_ELEMENT } : {}) }); if (killed) fxFell(cb, t);
  out = ' · ' + dmg + ' damage to ' + t.name + out + (t.hp === 0 ? (t.side === 'foe' ? ', down for good' : ', Downed') : '');
  if (!t.dead && !t.downed && t.mg?.held) out += slip(cb, rng, t, dmg);
  return out;
}
export function heal(t: Unit, n: number, cb?: Combat, by: Unit | null = null, kind = 'soul'): string {
  if (t.dead) return '';
  // The air's Healing given multiplier (spec: the meter bands) applies to magical healing.
  const r = healUnit(cb || null, t, n * (cb ? manaBand(manaOf(cb)).healing_given_mult ?? 1 : 1), by, kind);
  if (r.revived) { if (cb) emitFx(cb, 'heal', { target: t.id, at: t.pos, amount: t.hp, revive: true }); return ' · ' + t.name + ' is back up at ' + t.hp + ' HP'; }
  if (cb) emitFx(cb, 'heal', { target: t.id, at: t.pos, amount: r.restored }); return ' · ' + t.name + ' heals ' + r.restored;
}
/** Magic forced movement (GALE, PULL, Control push and pull): knockback immunity and the 'forced_move' hook
 * {u, by, tiles, how: 'magic', cancel} can stop it (hooks gap A3). */
export function magicShove(cb: Combat, t: Unit, from: string, n: number, by: Unit | null = null): string {
  if (t.dead || n === 0) return '';
  { const im = immune({ u: t }, 'knockback'); if (im) return ' · ' + t.name + ' holds its ground (' + im + ')'; }
  { const fm: any = emit(cb, 'forced_move', { u: t, by, tiles: Math.abs(n), how: 'magic', pull: n < 0, cancel: false, cb }); if (fm.cancel) return ' · ' + t.name + ' holds its ground';
    if (fm.tiles !== Math.abs(n)) n = Math.sign(n) * Math.max(0, Math.round(fm.tiles)); } // an item may change the distance (Heart Surge doubles it)
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
  t.pos = x + ',' + y; emitFx(cb, 'shove', { target: t.id, from: was, to: t.pos, ok: true, magic: true, ...(n < 0 ? { pull: true } : {}) }); return ' · ' + t.name + (n > 0 ? ' is thrown' : ' is dragged') + ' to ' + refOf(t.pos);
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
      // 'outburst_hold' {u, strain} (mutable): the Strain of holding one more turn (hooks gap D7).
      const oh: any = emit(cb, 'outburst_hold', { u, strain: manaBand(manaOf(cb)).id === 'flooded' ? 2 : 1, cb });
      if (oh.strain > 0) addStrain(cb, rng, u, oh.strain, 'holding');
    } else if (!m.cast && m.strain > 0) m.strain--;
    m.cast = false;
  }
  sigilTurnStart(cb, rng, u); // Quickened, Corroded, fields and traps underfoot, the unit's turrets (rules 1.4)
}
/** Once per round: glyphs, fields, traps, turrets, smoke and RAISE walls run down (sigil.ts). */
export function magicRoundTick(cb: Combat) { sigilRoundTick(cb); }
/** Moving onto a tile: fields bite and traps go off (sigil.ts sigilEnter). */
export function zoneEnter(cb: Combat, rng: Rng, u: Unit, k: string): boolean { return sigilEnter(cb, rng, u, k); }
/** Sight blockers and light from magic (VEIL smoke, LIGHT). */
export const veilTiles = (cb: Combat) => (cb.zones || []).filter((z) => z.kind === 'veil').flatMap((z) => z.tiles);
export const magicLit = (cb: Combat, k: string) => (cb.zones || []).some((z) => z.kind === 'light' && z.tiles.includes(k));

// ---------- Sigils (rules 1.4: sigil.ts) ----------
// The Sigil words, shapes, the facing rule, Evoke and what stays live in sigil.ts (and the pure word grammar in
// sigilwords.ts); they are re-exported here so callers keep importing them from './magic'.
export {
  drawGlyph, previewDraw, glyphCost, glyphApOf, glyphsPerTile, groundCap, sigilReady, scuff, findPattern, grammarError, evokeCharge, previewEvoke, planEvoke,
  evoke, evokeOrigins, facingFrom, patternAt, placedMagic, secretFrom, glyphsAt, compileSpell, spellRange, boltPath, burstTiles, dir8,
  strikeTurret, destroyPlaced, sigilEnter, sigilTurnStart, sigilRoundTick, sigilSpot, migrateSigil, migrateStorySigil, migrateWords, startingWordsError,
  enemyCast, enemyAvoidMagic, enemyMagic, evokeTargets, evokeMarks, enemyDefaultWords, ENEMY_MAX_WORDS, newestCondition, cleanseList, turretAim, freeTile, MAX_GLYPHS, SIGIL_REV,
  STARTING_DEFAULT, SIGIL_GRAMMAR, SIGIL_ELEMENTS, type Pattern, type Spell, type EvokePreview, type EvokeOpts, type MissilePlan, type Affected, type Facing, type DrawPreview,
} from './sigil';
import { previewEvoke as previewEvokeS, scuff as scuffS, sigilTurnStart, sigilRoundTick, sigilEnter } from './sigil';
/** The element of the spell resolving now, carried on its damage, miss and condition fx events (the FX layer reads it). */
let FX_ELEMENT: string | null = null;
/** Where a Sigil spell's damage comes from (the missile's origin: a Line glyph, SEEK's far glyph, a chain's last target,
 * a turret's tile; SENSE and fields: the target's own tile), carried on the damage source as src.from so items that
 * read the line of fire (Bulwark) trace it from there, not from the caster (item 488). */
let SPELL_FROM: string | null = null;
export function withSpellFrom<T>(from: string | null, f: () => T): T { const was = SPELL_FROM; SPELL_FROM = from; try { return f(); } finally { SPELL_FROM = was; } }
export function withElement<T>(el: string | null, f: () => T): T { const was = FX_ELEMENT; FX_ELEMENT = el; try { return f(); } finally { FX_ELEMENT = was; } }
/** Run f with the Sigil spell's glyph count known to the damage it deals (Drink It In: 10 per Sigil word). */
export function magicSpellWords<T>(n: number, f: () => T): T { const was = SPELL; SPELL = { words: n }; try { return f(); } finally { SPELL = was; } }
/** Add Flux; past the limit the Evoker overloads (exported for class moves: hooks gap I8/K1). */
export function flux(cb: Combat, rng: Rng, u: Unit, n: number): string {
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
/** Enemies scuff a glyph of the other side they stand on (spec: Sigils, Drawing 7). */
export function enemyScuff(cb: Combat, u: Unit): boolean {
  if (u.ap < SPELL_AP.scuff || !(cb.glyphs || []).some((g) => g.pos === u.pos && g.side !== u.side && !(g as any).keystone)) return false;
  return !scuffS(cb, u);
}
/** The spell being cast now, for the damage it deals (Drink It In gains the real MP cost or 10 per Sigil word). */
let SPELL: { mp?: number; words?: number } | null = null;

const canCast = (u: Unit, cb: Combat): string | null => (void cb, u.dead || u.downed ? 'Downed.' : condOn(u, 'silenced') ? 'Silenced: no magic this round.' : null);
// ---------- Outbursts ----------
export const stageMult = (stage: number) => 1 + 0.5 * (stage - 1);
export function designCost(m: MagicUnit, d: OutburstDesign, mana: number): number {
  const base = (SCHOOL[d.school]?.base_cost || 20) + (d.school2 ? 20 : 0) + d.modules.reduce((t, x) => t + (MODULE[x]?.cost || 0), 0);
  return Math.max(5, Math.round(base * manaBand(mana).soul_cost_mult * (1 - m.costSave)));
}
export const designAp = (m: MagicUnit, d: OutburstDesign) => Math.max(1, m.soulAp - (d.modules.includes('swift') ? 1 : 0));
export const designRange = (m: MagicUnit, d: OutburstDesign) => (d.modules.includes('move') ? 8 : SOUL_REACH) + m.soulRange;
/** Add Strain; past the limit the heart shorts ('strain' {u, n, why, limit} may change n or limit: hooks gap K6). */
export function addStrain(cb: Combat, rng: Rng, u: Unit, n: number, why: string) {
  const sc: any = emit(cb, 'strain', { u, n, why, limit: u.mg!.strainLimit, cb }); n = Math.max(0, sc.n);
  const m = u.mg!; m.strain += n;
  if (sc.limit !== m.strainLimit) { if (m.strain > sc.limit) manaShort(cb, rng, u); return; }
  if (m.strain > m.strainLimit) manaShort(cb, rng, u);
}
/** The Mana Short (spec: Soul magic, 5): d20 + Will Power vs 10 + 2 × the excess. A natural 1 bursts the heart: Downed,
 * never dead (Leon). A failure hurts and stuns, and anything held releases wild. */
export function manaShort(cb: Combat, rng: Rng, u: Unit) {
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
export function wildRelease(cb: Combat, rng: Rng, u: Unit): boolean {
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
  const oc: any = emit(cb, 'outburst_cost', { u, design: d, mp: designCost(m, d, manaOf(cb)) * (condOn(u, 'rdebuff') ? 1.2 : 1), ap: designAp(m, d), range: designRange(m, d), strain: (manaBand(manaOf(cb)).id === 'flooded' ? 2 : 1) + (m.emanator ? 0 : 2), hp: 0, release, preview: true, fail: '', cb });
  if (oc.fail) return no(oc.fail);
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
  // 'release_cost' {u, design, ap, range, fail} (mutable): items change a held release's price or reach (hooks gap D4).
  const rc: any = emit(cb, 'release_cost', { u, design: d, ap: SPELL_AP.release, range: designRange(m, d), fail: '', cb });
  if (rc.fail) return rc.fail;
  const rap = Math.max(0, rc.ap); if (u.ap < rap) return 'Needs ' + rap + ' AP.';
  const why = aimError(cb, u, d, aim, rc.range); if (why) return why;
  u.ap -= rap; m.cast = true;
  releaseAt(cb, rng, u, d, aim!, false);
  return null;
}
function releaseAt(cb: Combat, rng: Rng, u: Unit, d: OutburstDesign, aim: string, wild: boolean) {
  const was = SPELL; SPELL = { mp: u.mg?.held?.cost ?? (u.mg ? designCost(u.mg, d, manaOf(cb)) : 0) }; try { releaseAtInner(cb, rng, u, d, aim, wild); } finally { SPELL = was; }
}
function releaseAtInner(cb: Combat, rng: Rng, u: Unit, d: OutburstDesign, aim: string, wild: boolean) {
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
        const r = d20(rng), cover = !has('homing') && coverTileFor(cb, u.pos, t.pos) ? 5 : 0, tot = r + m.will + (u.sk?.will_power ?? 0) + condSkillMod(u, 'will_power') + (has('homing') ? 2 : 0) + condHit(u, t, cb) - cover + (emit(cb, 'spell_roll', { u, t, die: r, add: 0, kind: 'soul', cb }) as any).add;
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
      if (opt === 'push' || opt === 'pull') {
        // The Body save goes through 'cond_apply' (id 'shoved', fam body) so save bonuses and immunities reach it (hooks gap D10).
        const ca: any = emit(cb, 'cond_apply', { by: u, t, id: 'shoved', fam: 'body', rounds: 0, skipSave: false, cancel: false, why: '', tnAdd: 0, saveAdd: 0, cb, rng });
        if (ca.cancel) { line.push(t.name + ' can\'t be moved' + (ca.why ? ' (' + ca.why + ')' : '')); return; }
        const r = d20(rng), ok = !ca.skipSave && (r === 20 || (r !== 1 && r + saveOf(t, 'body') + (ca.saveAdd || 0) >= 12 + m.debuff.body + (ca.tnAdd || 0)));
        line.push(ok ? t.name + ' holds its ground (Body save)' : (magicShove(cb, t, u.pos, opt === 'push' ? 3 : -3, u).replace(/^ · /, '') || t.name + ' can\'t be moved'));
      }
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
  const cap = actionAp({ u }, 'crystallise', SPELL_AP.crystallise).ap; // items price it (hooks gap D8)
  if (u.ap < cap) return 'Needs ' + cap + ' AP.'; if (manaOf(cb) < 10) return 'The air is too thin (mana ' + manaOf(cb) + ', needs 10).';
  u.ap -= cap; m.coresMade++; emitFx(cb, 'crystallise', { unit: u.id, at: u.pos, dur: 1400 }); shiftMana(cb, -10); cb.log.push(u.name + ' crystallises a mana core from the air.');
  return null;
}
/** Who a spell would affect, hit or miss (used to decide whether a spell on the story map starts a fight). */
export function spellTargets(cb: Combat, u: Unit, act: string, tile?: string, aim?: string, designId?: string): string[] {
  if (act === 'evoke') return tile ? previewEvokeS(cb, u, tile, aim).targets : [];
  const m = u.mg; if (!m || !aim) return [];
  const d = m.designs.find((x) => x.id === (act === 'release' ? m.held?.design : designId)); if (!d) return [];
  const area = (d.modules.includes('rain') ? 2 : 0) + (d.modules.includes('size') ? 1 : 0);
  return cb.units.filter((v) => !v.dead && (area ? dist(v.pos, aim) <= area : v.pos === aim)).map((v) => v.id);
}

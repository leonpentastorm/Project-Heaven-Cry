// Magic (spec: Mana; Sigils rules 1.4, Soul rules 1.5: Outburst 2.0). Sigils are words drawn as glyphs onto tiles (sigil.ts: the Line,
// the facing rule, Reach, Delivery, Burst, KIN), fired with Evoke. Outbursts are held in the heart, grow each turn and are released when
// the caster chooses. The ambient mana meter, conditions with saves, shields and standing wall zones live here too.
// Everything is deterministic: rolls come from the rng passed in.
import { SIGIL, SCHOOL, MODULE, MANA_BANDS, SKILL, TONE, SOUL_RULES, SOUL_REV, type SigilDef, type ToneRider } from './data';
import {
  type Character, type OutburstDesign, mod, maxMp, healingMult, packOf,
  sigilMult, soulMult, elementalMult, maxSigilWords, glyphAp, sigilCoreSaving, sigilRangeBonus, sigilDurationBonus,
  soulCastAp, soulCostSaving, soulRangeBonus, syphonMult, strainLimit, saveBonus, debuffStrength, hasEvoker, hasEmanator, carriesEvoker, carriesEmanator, NEEDS_EVOKER, NEEDS_EMANATOR, coresCarried, mpNow, evoChargeNow, freePumps, migrateDesign, schoolSide,
} from './character';
import { type Combat, type Unit, dist, lineOfSight, standable, refOf, coverTileFor, emitFx, fxFell } from './combat';
import { type Rng, d20, die } from './rng';
import { emit, boundGame, statQuery } from './effects/hooks';
import { applyDamage, healUnit, grantShield, tendHook } from './effects/damage';
import { canReact, useReaction } from './tactics';
import { makeObject } from './objects';
import { itemWords, wordCostMods, immune, actionAp } from './effects/core';

type Fam = 'body' | 'brain' | 'heart';
/** A glyph on a tile. v: the rules revision it was drawn under (14 = rules 1.4; a glyph without it is from 1.2). */
/** A glyph on the ground. strokeId (rules 1.9, Sigil 1.5): the stroke it was drawn into (sigil.ts strokeRuns); a glyph
 * without one is an old 1.4 glyph, read by the touching-group rule until it fades. */
export interface Glyph { id: string; word: string; pos: string; by: string; side: 'pc' | 'foe'; left: number; who: string; v?: number; strokeId?: string }
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
  mp: number; mpMax: number; strain: number; held: HeldOutburst | null;
  /** Rules 1.5: this turn the heart was worked (Begin, Pump or Feed; class casts set it too): no stillness at the turn's end. */
  cast: boolean;
  /** Free Pumps left this round and per round (Empathy 3: 1, 7: 2); the calming ways used this turn; Strain owed on the next Begin. */
  freePumps?: number; freePumpsMax?: number; calmFight?: boolean; calmTend?: boolean; debt?: number;
  brain: number; will: number; sigilMult: number; soulMult: number; elemMult: number; healMult: number;
  maxWords: number; glyphAp: number; coreSave: number; rangeBonus: number; durBonus: number;
  /** Begin's AP (2; the 1.2 'Soul cast AP' name). */ soulAp: number; costSave: number; soulRange: number; syphon: number; strainLimit: number;
  saves: Record<Fam, number>; debuff: Record<Fam, number>;
  /** Items' changes to a word's charge (word_cost), by word. */
  wordCost?: Record<string, number>;
}

export const MANA_START = 15;
export const FLUX_MAX = 6;
export const CORE_CHARGE = 10;
export const SOUL_REACH = 4;
export const SPELL_AP = { evoke: 1, scuff: 1, vent: 1, core: 2, begin: 2, pump: 1, release: 1, steady: 1, feed: 1, syphon: 1, crystallise: 3 };
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
  witnessed: { name: 'Witnessed', fam: 'heart', rounds: 1, boon: true, text: 'Your patron is watching (rules 1.6): attack rolls carrying a tag your patron likes +2; taboo actions cost double Devotion.' },
  smitten: { name: 'Smitten', fam: 'heart', rounds: 1, text: 'You can\'t attack the one who smote you, or the allies linked to them (Sweet Nothings).' },
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
  // A focus counts only in a hand (spec: Hands 2; item 630); one in the pack keeps its charge or MP for later.
  const words = [...new Set([...(c.sigils || []), ...itemWords(c)])], designs = c.outbursts || [], evoker = hasEvoker(c), emanator = hasEmanator(c);
  if (!words.length && !designs.length && !carriesEvoker(c) && !carriesEmanator(c)) return undefined;
  return {
    words: [...words], designs: designs.map((d) => migrateDesign({ ...d, modules: [...(d.modules || [])] })), evoker, emanator,
    charge: evoChargeNow(c), cores: coresCarried(c), coresMade: 0, flux: 0, mp: mpNow(c), mpMax: maxMp(c), strain: 0, held: null, cast: false, freePumps: freePumps(c), freePumpsMax: freePumps(c),
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
  // What the focus stores goes home with it, held or carried (a focus put away mid-fight keeps its charge and MP).
  if (m.emanator || carriesEmanator(c)) c.mp = Math.max(0, Math.min(m.mpMax, Math.round(m.mp)));
  if (m.evoker || carriesEvoker(c)) c.evoCharge = m.charge;
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
/** Is a condition a boon (Guarded, Inspired, Witnessed…)? (Unravel ends them; rules 1.6.) */
export const condIsBoon = (id: string) => !!CONDS[condId(id)]?.boon;
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
 * Soul none; armour overrides it: a Stone Outburst counts it in full), then HP, Downed or dead, kill credit. */
/** Why the next harm() hurts, for the effects layer only (burn, short, overload, wall); reset after each call. */
let hurtWhy = '';
const harmFor = (why: string, f: () => string) => { hurtWhy = why; try { return f(); } finally { hurtWhy = ''; } };
/** Run f as the strain burn / short (exported for class moves that hurt the heart). */
export { harmFor };
export function harm(cb: Combat, rng: Rng, att: Unit | null, t: Unit, raw: number, type: 'sigil' | 'elemental' | 'soul' | 'true' | 'physical', dmgType?: string, armour?: 'none' | 'half' | 'full'): string {
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
  const ak = armour || (type === 'sigil' || type === 'physical' ? 'full' : type === 'elemental' ? 'half' : 'none'), arm = ak === 'full' ? t.armour : ak === 'half' ? Math.floor(t.armour / 2) : 0;
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
  void rng; // rules 1.5: a held Outburst no longer slips when you are hurt (the Strain is the risk)
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
/** Start of a unit's turn: Burning burns, the heart's turn start (rules 1.5: Strain −1, a held Outburst swells and
 * strains, an elemental one leaks onto adjacent enemies), fields bite whoever starts inside. */
export function magicTurnStart(cb: Combat, rng: Rng, u: Unit) {
  if (u.dead) return;
  noteDeaths(cb);
  // Burning burns at the start of each turn (spec: 10, until put out; it ignores armour). Timed conditions tick at the
  // end of the bearer's turn (condTurnEnd, rules 1.3).
  if (condOn(u, 'burning') && !u.downed) { const by = condSource(u, 'burning'); cb.log.push(u.name + ' burns' + harmFor('burn', () => harm(cb, rng, by ? cb.units.find((x) => x.id === by) || null : null, u, 10, 'true', 'fire'))); }
  if (u.mg && !u.downed) heartTurnStart(cb, rng, u); // rules 1.5: Strain −1, the swell, the aura, free Pumps
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
  strokeRuns, strokeOf, strokeOfGlyph, strokesAt, strokePick, strokeCandidates, tidyStrokes, glyphDrawer, type Stroke, type StrokeOption,
} from './sigil';
import { previewEvoke as previewEvokeS, scuff as scuffS, sigilTurnStart, sigilRoundTick, sigilEnter, dir8 } from './sigil';
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
/** Vent's and a core swap's AP (1 and 2), through the items (stat 'ap_cost:vent' / 'ap_cost:swap_core': the Mage's
 * Bleed the Flux and Core Change, Class Roster Rev 3). The UI and the enemy planner read these. */
export const ventAp = (u: Unit) => actionAp({ u }, 'vent', SPELL_AP.vent).ap;
export const coreAp = (u: Unit) => actionAp({ u }, 'swap_core', SPELL_AP.core).ap;
/** Vent (1 AP): all the Flux goes into the air. 'vent' {u, flux, extra} (extra mutable: more goes into the air with it,
 * Bleed the Flux) after the Flux is gone. */
export function vent(cb: Combat, u: Unit): string | null {
  const m = u.mg; if (!m || !m.evoker) return NEEDS_EVOKER;
  const ap = ventAp(u);
  if (u.ap < ap) return 'Needs ' + ap + ' AP.'; if (!m.flux) return 'No Flux to vent.';
  u.ap -= ap; const n = m.flux; m.flux = 0;
  const vc: any = emit(cb, 'vent', { u, flux: n, extra: 0, cb });
  const all = n + Math.max(0, vc.extra || 0);
  emitFx(cb, 'vent', { unit: u.id, at: u.pos, flux: all }); cb.log.push(u.name + ' vents ' + n + ' Flux into the air' + (all > n ? ' (' + (all - n) + ' more with it)' : '') + (ap !== SPELL_AP.vent ? ' (' + ap + ' AP)' : '') + '.'); shiftMana(cb, all, 'vented Flux');
  return null;
}
export function swapCore(cb: Combat, u: Unit): string | null {
  const m = u.mg; if (!m || !m.evoker) return NEEDS_EVOKER;
  const ap = coreAp(u);
  if (u.ap < ap) return 'Needs ' + ap + ' AP.'; if (m.cores < 1) return 'No spare cores.';
  u.ap -= ap; m.cores--; m.charge = CORE_CHARGE; emitFx(cb, 'core', { unit: u.id, at: u.pos, dur: 1000 }); cb.log.push(u.name + ' loads a fresh core into the Evoker (' + CORE_CHARGE + ' charge).');
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
// ---------- Outbursts (rules 1.5: Outburst 2.0, the heart) ----------
// Begin (2 AP, Swift 1) opens a ready design at stage 0 (+1 Strain); Pump (1 AP; Empathy gives free ones each round)
// adds a stage up to 4; Release (1 AP) fires it at the stage reached. Held past your turn it swells (+1 stage, +1 Strain)
// at your next turn start. Over the Strain limit the heart burns (8 true a point at your turn end); 3 over is an
// automatic Mana Short. Strain falls by 1 at every turn start and through the five calming ways. Every number is
// provisional (spec 14, items 492 on). Data: soul_modules.json (cycle, strain, tones, forms, retired).
const SR: any = SOUL_RULES;
const CYC = SR.cycle || {};
/** The stage multipliers (rules 1.5): stage 0 ×0.6, 1 ×1, 2 ×1.4, 3 ×1.8, 4 ×2.2. */
export const STAGE_MULT: number[] = CYC.stage_mult || [0.6, 1, 1.4, 1.8, 2.2];
export const MAX_STAGE: number = CYC.max_stage ?? 4;
export const stageMult = (stage: number) => STAGE_MULT[Math.max(0, Math.min(MAX_STAGE, Math.round(stage)))] ?? 1;
export const SOUL_AP = { begin: CYC.begin_ap ?? 2, swiftBegin: CYC.swift_begin_ap ?? 1, pump: CYC.pump_ap ?? 1, release: CYC.release_ap ?? 1, steady: CYC.steady_ap ?? 1, feed: CYC.feed_ap ?? 1 };
export const STRAIN_BURN: number = SR.strain?.burn_per_point ?? 8;
export const SHORT_AT_OVER: number = SR.strain?.short_at_over ?? 3;
export const AURA_TICK: number = SR.aura?.tick_damage ?? 5;
export const RESONANCE_BONUS: number = SR.resonance?.bonus ?? 0.2;
/** Resonance's ceiling per release (Leon 8 Nov 2026): +0.4 in total, however many allies released before you. */
export const RESONANCE_MAX: number = SR.resonance?.max_bonus ?? 0.4;
export const SECOND_SCHOOL = { fromWill: SR.second_school?.from_will_power ?? 5, strength: SR.second_school?.strength ?? 0.5, cost: SR.second_school?.cost ?? 10 };
export const SOUL_DAMAGE: number = SR.damage?.base ?? SCHOOL.damage?.damage ?? 20;
export type OutburstForm = 'bolt' | 'wave' | 'burst' | 'aura' | 'lance';
export const FORMS: OutburstForm[] = ['bolt', 'wave', 'burst', 'aura', 'lance'];
/** The held Outburst (rules 1.5). v: 15 (a 1.2 hold has none and is read as it is: its stage 1–4 keeps its number). */
export interface HeldOutburst { design: string; stage: number; cost: number; tone?: string; form?: OutburstForm; watch?: boolean; steady?: boolean; turns?: number; v?: number;
  /** The Strain the swells have cost so far (Let it go gives back no more than this; an old hold without it: its stage). */
  paid?: number }
/** Read any held Outburst (an old save's included) in the 1.5 shape. */
export function migrateHeld(h: any, d?: OutburstDesign): HeldOutburst | null {
  if (!h || !h.design) return null;
  const dd = d ? migrateDesign(d) : null;
  return { ...h, stage: Math.max(0, Math.min(MAX_STAGE, Math.round(h.stage ?? 1))), cost: h.cost || 0, tone: h.tone || dd?.tone || 'raw', form: h.form || (dd ? formOf(dd) : 'bolt'), v: SOUL_REV };
}
/** A design's shape: its form module, or a Bolt. */
export const formOf = (d: OutburstDesign): OutburstForm => (d.modules.find((m) => (MODULE[m] as any)?.form) as OutburstForm) || 'bolt';
/** A design's tone: 'raw' or an element tone (soul_modules.json tones). */
export const toneOf = (d: OutburstDesign): string => (d.tone && TONE[d.tone] ? d.tone : 'raw');
/** The Sigil 1.4 element id behind a tone (sigils.json elements): fire, shock, freeze, stone, gale, acid; null for Raw. */
export const toneElement = (tone: string): string | null => TONE[tone]?.element ?? null;
const findDesign = (m: MagicUnit, id?: string | null): OutburstDesign | null => { const d = id ? m.designs.find((x) => x.id === id) : null; return d ? migrateDesign(d) : null; };
/** The heart of a unit, made safe for a 1.2 save (fills what 1.5 added). */
function heart(u: Unit): MagicUnit | undefined {
  const m = u.mg; if (!m) return m;
  if (m.held && m.held.v !== SOUL_REV) m.held = migrateHeld(m.held, m.designs.find((x) => x.id === m.held!.design));
  if (m.freePumpsMax == null) {
    // A fight saved under 1.2: its unit's free Pumps and Soul multiplier from the character (1.5's numbers).
    const c = u.charId ? boundGame()?.characters?.[u.charId] : null;
    m.freePumpsMax = c ? freePumps(c) : 0; if (c) m.soulMult = soulMult(c);
  }
  if (m.freePumps == null) m.freePumps = m.freePumpsMax;
  return m;
}
const flooded = (cb: Combat) => manaBand(manaOf(cb)).id === 'flooded';
/** The riders' stage shift from the air (rules 1.5): Flooded +1, Thin −1. */
export const riderShift = (cb: Combat) => { const b = manaBand(manaOf(cb)).id; return b === 'flooded' ? (SR.stage_shift?.flooded ?? 1) : b === 'thin' ? (SR.stage_shift?.thin ?? -1) : 0; };
/** The stage a tone's riders read at, for a release at `stage` (0 to 4). */
export const riderStage = (cb: Combat, stage: number) => Math.max(0, Math.min(MAX_STAGE, stage + riderShift(cb)));
/** Stages a release's tone riders count above its own (stat 'rider_stage', asked with {cb, release: true}: the
 * Channeler's Eye of the Storm). Not for a wild release or a Heart Overwatch reaction (off the caster's own turn). */
export const riderBonus = (cb: Combat, u: Unit, off: boolean) => (off || (!u.charId && !u.held) ? 0 : Math.max(0, Math.floor(statQuery({ u, cb }, 'rider_stage', { cb, release: true }).add)));
/** A tone's riders at a stage (after the air's shift), and their words. */
export function toneRiders(tone: string, stage: number): { text: string; riders: ToneRider[] } {
  const t = TONE[tone]; if (!t || !t.element || stage <= 0) return { text: t && t.element ? 'No rider at stage 0.' : 'No rider.', riders: [] };
  return t.stages[String(Math.min(MAX_STAGE, stage))] || { text: '', riders: [] };
}
export function designCost(m: MagicUnit, d0: OutburstDesign, mana: number): number {
  const d = migrateDesign(d0);
  const base = (SCHOOL[d.school]?.base_cost || 20) + (d.school2 ? SECOND_SCHOOL.cost : 0) + d.modules.reduce((t, x) => t + (MODULE[x]?.cost || 0), 0) + (TONE[toneOf(d)]?.cost || 0);
  return Math.max(5, Math.round(base * manaBand(mana).soul_cost_mult * (1 - m.costSave)));
}
/** Begin's AP: 2, Swift 1 (rules 1.5). */
export const designAp = (m: MagicUnit, d: OutburstDesign) => { void m; return d.modules.includes('swift') ? SOUL_AP.swiftBegin : SOUL_AP.begin; };
/** A Bolt's or Burst's reach: 4 tiles (Far: 8) + the Soul range bonus. */
export const designRange = (m: MagicUnit, d: OutburstDesign) => (d.modules.includes('move') ? (MODULE.move?.range_tiles || 8) : SOUL_REACH) + m.soulRange;
const sized = (d: OutburstDesign) => (d.modules.includes('size') ? (MODULE.size as any)?.area_plus ?? 1 : 0);
/** A shape's size: Wave's and Lance's length, Burst's and Aura's radius (Size +1; Lance +2). */
export function formSize(d: OutburstDesign): number {
  const f = formOf(d), a: any = f === 'bolt' ? null : (MODULE[f] as any)?.area;
  if (!a) return 0;
  return (a.length ?? a.radius ?? 1) + sized(d) * (f === 'lance' ? 2 : 1);
}
/** How far the heart reaches for Heart Overwatch and the aim: Bolt and Burst their range, Wave and Lance their length,
 * Aura its radius. */
export function heartReach(m: MagicUnit, d: OutburstDesign): number { const f = formOf(d); return f === 'bolt' || f === 'burst' ? designRange(m, d) : formSize(d); }
const XY = (k: string) => k.split(',').map(Number) as [number, number];
const onGrid = (cb: Combat, k: string) => { const [x, y] = XY(k); return x >= 0 && y >= 0 && x < (cb.map as any).w && y < (cb.map as any).h; };
/** The tiles a release covers (spec: rules 1.5, Shapes): Bolt the aim; Wave a cone from the caster toward the aim
 * (within its length, about 45 degrees: the flamer's and Sigil's cone test); Burst a radius around the aim; Aura a
 * radius around the caster (its own tile left out); Lance a straight 8-direction line from the caster, walls stop it. */
export function outburstArea(cb: Combat, u: Unit, d: OutburstDesign, aim: string): string[] {
  const f = formOf(d), n = formSize(d), ether = d.modules.includes('ether'), out: string[] = [];
  const seen = (k: string, from: string) => ether || k === from || lineOfSight(cb, from, k);
  if (f === 'bolt') return [aim];
  const [cx, cy] = XY(u.pos);
  if (f === 'burst' || f === 'aura') {
    const c = f === 'burst' ? aim : u.pos, [ax, ay] = XY(c);
    for (let x = ax - n; x <= ax + n; x++) for (let y = ay - n; y <= ay + n; y++) { const k = x + ',' + y; if (!onGrid(cb, k) || !standable(cb.map, k) && !cb.units.some((v) => v.pos === k)) continue; if (f === 'aura' && k === u.pos) continue; if (seen(k, c)) out.push(k); }
    return out;
  }
  if (f === 'wave') {
    const [tx, ty] = XY(aim), dx = tx - cx, dy = ty - cy, dl = Math.hypot(dx, dy) || 1;
    for (let x = cx - n; x <= cx + n; x++) for (let y = cy - n; y <= cy + n; y++) {
      const k = x + ',' + y, ax = x - cx, ay = y - cy, l = Math.hypot(ax, ay);
      if (!l || l > n + 0.5 || (ax * dx + ay * dy) / (l * dl) < 0.7 || !onGrid(cb, k)) continue;
      if (seen(k, u.pos)) out.push(k);
    }
    return out;
  }
  // Lance: n tiles straight on (8 directions), through creatures, stopped by what stops a walk (walls).
  const [sx, sy] = dir8(u.pos, aim);
  for (let i = 1; i <= n; i++) { const k = (cx + sx * i) + ',' + (cy + sy * i); if (!onGrid(cb, k)) break; if (!standable(cb.map, k) && !ether) break; out.push(k); }
  return out;
}
const hostileSchool = (s?: string) => s === 'damage' || s === 'control' || s === 'status';
/** Who a release touches: the units in its area. Buff reaches allies only (the caster too, in an Aura or a Bolt at its
 * own tile); the other schools reach everyone but the caster (friendly fire, as the old Rain); Inverse damage reaches
 * allies only. */
function affectedBy(cb: Combat, u: Unit, d: OutburstDesign, tiles: string[]): Unit[] {
  const set = new Set(tiles), buff = d.school === 'buff', inv = d.modules.includes('inverse') && d.school === 'damage';
  const onArea = cb.units.filter((v) => !v.dead && (set.has(v.pos) || (buff && formOf(d) === 'aura' && v === u)));
  return onArea.filter((v) => (buff || inv ? v.side === u.side : v !== u));
}
function aimError(cb: Combat, u: Unit, d: OutburstDesign, aim?: string, range?: number): string | null {
  const f = formOf(d);
  if (f === 'aura') return null;
  if (!aim) return 'Pick a target tile.';
  if (f === 'wave' || f === 'lance') return aim === u.pos ? 'Pick a direction (a tile away from you).' : null;
  const r = range ?? designRange(u.mg!, d);
  if (dist(u.pos, aim) > r) return 'Out of reach (' + r + ' tiles).';
  if (!d.modules.includes('ether') && aim !== u.pos && !lineOfSight(cb, u.pos, aim)) return 'No line of sight.';
  return null;
}
const onTurn = (cb: Combat, u: Unit) => !!cb.overworld || cb.order?.[cb.turn] === u.id || cb.window?.queue?.[0]?.unitId === u.id;

// ----- Strain, the burn and the Mana Short -----
/** Add Strain (rules 1.5). 'strain' {u, n, why, limit} may change n or the limit (hooks gap K6); 'strain_change'
 * {u, from, to, why, limit} after. At 3 over the limit the heart shorts, automatically. Returns a log suffix. */
export function addStrain(cb: Combat, rng: Rng, u: Unit, n: number, why: string): string {
  const m = heart(u); if (!m) return '';
  const sc: any = emit(cb, 'strain', { u, n, why, limit: m.strainLimit, cb }); n = Math.max(0, sc.n);
  if (!n) return '';
  const was = m.strain; m.strain += n;
  const limit = sc.limit ?? m.strainLimit;
  emit(cb, 'strain_change', { u, from: was, to: m.strain, why, limit, cb });
  emitFx(cb, 'strain', { unit: u.id, at: u.pos, strain: m.strain, limit, by: n, why, over: Math.max(0, m.strain - limit) });
  if (m.strain - limit >= SHORT_AT_OVER && !u.dead && !u.downed) return manaShort(cb, rng, u, limit);
  return '';
}
/** Strain down (a calming way): never below 0. 'strain_change' after. */
function easeStrain(cb: Combat, u: Unit, n: number, way: string): number {
  const m = heart(u); if (!m || n <= 0 || m.strain <= 0) return 0;
  const was = m.strain; m.strain = Math.max(0, m.strain - n);
  emit(cb, 'strain_change', { u, from: was, to: m.strain, why: way, limit: m.strainLimit, cb });
  return was - m.strain;
}
/** Calming the heart (rules 1.5, section 3): way 'turn' (every turn start), 'still', 'fight', 'tend', 'letgo', 'steady'.
 * fx 'calm' {unit, at, way, by, strain}. */
function calm(cb: Combat, u: Unit, n: number, way: string, quiet = false): number {
  const d = easeStrain(cb, u, n, way); if (!d) return 0;
  emitFx(cb, 'calm', { unit: u.id, at: u.pos, way, by: d, strain: u.mg!.strain });
  if (!quiet) cb.log.push(u.name + "'s heart calms (" + ({ still: 'a still turn', fight: 'fighting it out', tend: 'tending an ally', letgo: 'let go', steady: 'steadied', turn: 'a new turn' } as Record<string, string>)[way] + '): Strain ' + u.mg!.strain + '/' + u.mg!.strainLimit + '.');
  return d;
}
/** Fighting it out: the first weapon attack of a caster's own turn (melee or shot) eases 1 Strain (combat.ts calls it). */
export function calmFight(cb: Combat, u: Unit) {
  const m = heart(u); if (!m || m.calmFight || !onTurn(cb, u)) return;
  m.calmFight = true; if (m.strain > 0) calm(cb, u, 1, 'fight'); // the first attack of the turn, Strain or not
}
/** Tending others: the first heal, stim, shield or cleanse a caster gives an ally on its own turn eases 1 Strain. */
export function calmTend(cb: Combat | null, by: Unit | null, t: Unit) {
  if (!cb || !by || by === t || by.side !== t.side) return;
  const m = heart(by); if (!m || m.calmTend || !onTurn(cb, by)) return;
  m.calmTend = true; if (m.strain > 0) calm(cb, by, 1, 'tend'); // the first tending of the turn, Strain or not
}
tendHook.f = calmTend;
/** The Mana Short (rules 1.5): automatic at 3 over the limit, no roll. Stunned for a turn; a held Outburst goes off wild
 * (a random creature within reach) and its element's stage-1 rider lands on your own tile; then Strain falls to the
 * limit (the heart has emptied: PROVISIONAL). fx 'short' {unit, at, held, tone, strain}. */
export function manaShort(cb: Combat, rng: Rng, u: Unit, limit?: number): string {
  const m = heart(u)!, lim = limit ?? m.strainLimit, held = m.held, tone = held?.tone || 'raw';
  emitFx(cb, 'short', { unit: u.id, at: u.pos, held: !!held, tone, element: toneElement(tone), strain: m.strain, limit: lim });
  cb.log.push('MANA SHORT: ' + u.name + "'s heart stops (Strain " + m.strain + '/' + lim + '): Stunned' + (held ? ', and the held Outburst goes off wild' : '') + '.');
  if (!u.dead && !u.downed) applyCond(cb, rng, null, u, 'stunned', 1, undefined, { skipSave: true });
  if (held && !u.dead) {
    wildRelease(cb, rng, u);
    // Its element's stage-1 rider on your own tile (conditions only: a push from your own tile has no way to go).
    for (const r of toneRiders(tone, 1).riders) if (r.rider === 'cond' && r.condition && !u.dead) cb.log.push(u.name + ' takes the backlash' + applyCond(cb, rng, null, u, r.condition, r.rounds, undefined, { skipSave: !r.save }));
  }
  const was = m.strain; m.strain = Math.min(m.strain, lim);
  if (was !== m.strain) emit(cb, 'strain_change', { u, from: was, to: m.strain, why: 'short', limit: lim, cb });
  return ' · MANA SHORT';
}
/** The end of a caster's turn (rules 1.5): each point over the limit burns 8 true (it Downs, never kills: a foe is
 * subdued); then a turn with no Begin, Pump or Feed calms 1 (stillness), but only with nothing held: holding is not
 * stillness (Leon 8 Nov 2026), so an idle held turn nets 0 (+1 swell, −1 turn start). fx 'burn' {unit, at, over, dmg}. */
export function magicTurnEnd(cb: Combat, rng: Rng | null, u: Unit) {
  const m = heart(u); if (!m || u.dead) return;
  // The Short is a state (rules 1.5: automatic at 3 over): a limit that fell this turn (Heart's Own) is checked here.
  if (rng && m.strain - m.strainLimit >= SHORT_AT_OVER && !u.downed) cb.log.push(u.name + "'s heart is 3 over its limit" + manaShort(cb, rng, u) + '.');
  const over = m.strain - m.strainLimit;
  if (over > 0 && !u.downed) {
    const r = applyDamage(cb, u, STRAIN_BURN * over, { type: 'strain', dmgType: 'true', shield: false, credit: 'none', nonlethal: true } as any);
    emitFx(cb, 'burn', { unit: u.id, at: u.pos, over, dmg: r.dealt });
    emitFx(cb, 'hurt', { target: u.id, at: u.pos, dmg: r.dealt, why: 'strain', killed: false }); if (u.hp === 0) fxFell(cb, u);
    cb.log.push(u.name + "'s heart burns: " + r.dealt + ' damage (' + over + ' over the Strain limit)' + (u.hp === 0 ? ', ' + (u.side === 'foe' ? 'out of the fight' : 'Downed') : '') + '.');
  }
  if (!m.cast && !m.held && m.strain > 0) calm(cb, u, 1, 'still');
}

// ----- the cycle -----
export interface OutburstPreview { ok: boolean; why?: string; cost: number; ap: number; range: number; strain: number; stage: number; hp?: number;
  /** A snap cast's multiplier from items (Heart Surge's snap: ×1, not ×0.6), 1 when none. */ relMult?: number }
/** The Begin's price (and, with release, the snap cast's: Begin + Release at stage 0). Kept for class moves. */
export function previewOutburst(cb: Combat, u: Unit, designId: string, aim?: string, release = true): OutburstPreview {
  const m = u.mg ? heart(u) : undefined, no = (why: string): OutburstPreview => ({ ok: false, why, cost: 0, ap: 0, range: 0, strain: 0, stage: 0 });
  if (!m) return no('You have no Outbursts.');
  const e = canCast(u, cb); if (e) return no(e);
  if (m.held) return no('You are holding an Outburst: release it or let it go first.');
  const d = findDesign(m, designId); if (!d) return no('No such design.');
  // 'outburst_cost' {u, design, mp, ap, range, strain, hp, release, preview} (mutable): items change the Begin's price
  // (pay HP instead of MP, a free cast, more reach). ap is the Begin's; a snap cast adds the Release (1 AP).
  const oc: any = emit(cb, 'outburst_cost', { u, design: d, mp: designCost(m, d, manaOf(cb)) * (condOn(u, 'rdebuff') ? 1.2 : 1), ap: designAp(m, d), range: designRange(m, d), strain: (flooded(cb) ? CYC.flooded_strain ?? 2 : CYC.begin_strain ?? 1) + (m.emanator ? 0 : CYC.no_emanator_strain ?? 2), hp: 0, release, preview: true, fail: '', relMult: 1, cb });
  if (oc.fail) return no(oc.fail);
  const cost = Math.max(0, Math.round(oc.mp)), ap = Math.max(0, oc.ap) + (release ? SOUL_AP.release : 0), range = oc.range, strain = Math.max(0, oc.strain), hp = Math.max(0, Math.round(oc.hp || 0));
  if (hp && u.hp <= hp) return { ok: false, why: 'Paying ' + hp + ' HP would drop you.', cost, ap, range, strain, stage: 0, hp };
  if (u.ap < ap) return { ok: false, why: 'Needs ' + ap + ' AP.', cost, ap, range, strain, stage: 0, hp };
  if (m.emanator && m.mp < cost) return { ok: false, why: 'Needs ' + cost + ' MP (' + m.mp + '): Syphon first.', cost, ap, range, strain, stage: 0, hp };
  const relMult = release ? oc.relMult || 1 : 1;
  if (release) { const why = aimError(cb, u, d, aim, range); if (why) return { ok: false, why, cost, ap, range, strain, stage: 0, hp, relMult }; }
  return { ok: true, cost, ap, range, strain, stage: 0, hp, relMult };
}
export interface BeginOpts { /** Heart Overwatch on from the start. */ watch?: boolean }
/** Begin (rules 1.5): pay MP, +1 Strain (2 Flooded; +2 from the air without an Emanator), hold the design at stage 0.
 * hold false is a snap cast: Begin and Release at once (3 AP, ×0.6), as class moves and old callers use it.
 * fx 'outburst' {unit, at, design, school, form, tone, element, stage: 0, hold, watch}. */
export function beginOutburst(cb: Combat, rng: Rng, u: Unit, designId: string, aim: string | undefined, hold: boolean, opts: BeginOpts = {}): string | null {
  const pv = previewOutburst(cb, u, designId, aim, !hold); if (!pv.ok) return pv.why || 'Can\'t.';
  const m = heart(u)!, d = findDesign(m, designId)!;
  u.ap -= pv.ap - (hold ? 0 : SOUL_AP.release); if (m.emanator) m.mp -= pv.cost; m.cast = true;
  if (pv.hp) applyDamage(cb, u, pv.hp, { by: u, type: 'heart', shield: false, credit: 'none' });
  emit(cb, 'outburst_begin', { u, design: d, hold, cost: pv.cost, hp: pv.hp || 0, stage: 0, cb, rng }); // 'outburst_begin' {u, design, hold, cost, hp, stage}
  shiftMana(cb, -Math.ceil(pv.cost / 10));
  m.held = { design: d.id, stage: 0, cost: pv.cost, tone: toneOf(d), form: formOf(d), turns: 0, paid: 0, v: SOUL_REV, ...(opts.watch ? { watch: true } : {}) };
  emitFx(cb, 'outburst', { unit: u.id, at: u.pos, design: d.id, school: d.school, form: formOf(d), tone: toneOf(d), element: toneElement(toneOf(d)), hold, stage: 0, watch: !!opts.watch });
  cb.log.push(u.name + ' begins ' + d.name + ' (' + pv.cost + ' MP' + (m.emanator ? '' : ' from the air') + ', ' + (pv.ap - (hold ? 0 : SOUL_AP.release)) + ' AP): the heart lights.');
  addStrain(cb, rng, u, pv.strain + (m.debt || 0), 'begin'); m.debt = 0;
  if (!hold && m.held && !u.dead && !u.downed) { u.ap -= SOUL_AP.release; releaseAt(cb, rng, u, d, aim!, false); }
  return null;
}
export interface PumpPreview { ok: boolean; why?: string; ap: number; free: boolean; stage: number; mult: number }
/** A Pump's price: 1 AP, or free while the round's free Pumps last (Empathy 3: 1; 7: 2). 'outburst_pump' {u, design,
 * stage, ap, free, fail, preview} (mutable) lets items change it. */
export function previewPump(cb: Combat, u: Unit): PumpPreview {
  const m = u.mg ? heart(u) : undefined, no = (why: string): PumpPreview => ({ ok: false, why, ap: 0, free: false, stage: m?.held?.stage ?? 0, mult: stageMult(m?.held?.stage ?? 0) });
  if (!m || !m.held) return no('You hold no Outburst: Begin one first.');
  const e = canCast(u, cb); if (e) return no(e);
  if (m.held.stage >= MAX_STAGE) return no('The heart is full (stage ' + MAX_STAGE + '): release it.');
  const d = findDesign(m, m.held.design); if (!d) return no('That design is gone.');
  const free = (m.freePumps || 0) > 0;
  const op: any = emit(cb, 'outburst_pump', { u, design: d, stage: m.held.stage, ap: free ? 0 : SOUL_AP.pump, free, fail: '', preview: true, cb });
  if (op.fail) return no(op.fail);
  const ap = Math.max(0, op.ap);
  if (u.ap < ap) return { ok: false, why: 'Needs ' + ap + ' AP.', ap, free, stage: m.held.stage, mult: stageMult(m.held.stage) };
  return { ok: true, ap, free: !!op.free && ap === 0, stage: m.held.stage + 1, mult: stageMult(m.held.stage + 1) };
}
/** Pump (rules 1.5): +1 stage (to 4). fx 'pump' {unit, at, stage, mult, free, max}: the heartbeat, rising with the stage. */
export function pumpOutburst(cb: Combat, rng: Rng, u: Unit): string | null {
  const pv = previewPump(cb, u); if (!pv.ok) return pv.why || 'Can\'t.';
  const m = heart(u)!, h = m.held!, d = findDesign(m, h.design)!;
  u.ap -= pv.ap; if (pv.free) m.freePumps = Math.max(0, (m.freePumps || 0) - 1); m.cast = true;
  h.stage = Math.min(MAX_STAGE, h.stage + 1);
  emit(cb, 'outburst_pump', { u, design: d, stage: h.stage, ap: pv.ap, free: pv.free, fail: '', preview: false, cb, rng });
  emitFx(cb, 'pump', { unit: u.id, at: u.pos, stage: h.stage, mult: stageMult(h.stage), free: pv.free, max: h.stage >= MAX_STAGE, tone: h.tone || 'raw' });
  cb.log.push(u.name + ' pumps the heart: ' + d.name + ' at stage ' + h.stage + ' (×' + stageMult(h.stage) + ')' + (pv.free ? ', a free Pump (Empathy)' : '') + '.');
  return null;
}
/** The AP of n Pumps of design d from stage0 (the preview's and the AI's): the round's free Pumps first, then 1 AP each;
 * the first Pump that still costs AP goes through 'outburst_pump' (preview), so items that price it (Shape) count.
 * Toggles that change a Pump's stages (Overdraw) are not planned. */
export function pumpsAp(cb: Combat, u: Unit, d: OutburstDesign, n: number, stage0: number): number {
  const m = u.mg!; let ap = 0, free = m.freePumps || 0, hooked = false;
  for (let i = 0; i < n; i++) {
    if (free > 0) { free--; continue; }
    if (!hooked) { hooked = true; const op: any = emit(cb, 'outburst_pump', { u, design: d, stage: stage0 + i, ap: SOUL_AP.pump, free: false, fail: '', preview: true, cb }); ap += Math.max(0, op.ap); continue; }
    ap += SOUL_AP.pump;
  }
  return ap;
}
/** Release a held Outburst (1 AP) at the stage reached. 'release_cost' {u, design, ap, range, fail} (hooks gap D4). */
export function releaseOutburst(cb: Combat, rng: Rng, u: Unit, aim?: string): string | null {
  const m = u.mg ? heart(u) : undefined; if (!m || !m.held) return 'Nothing held.';
  const e = canCast(u, cb); if (e) return e;
  const d = findDesign(m, m.held.design); if (!d) { m.held = null; return 'That design is gone.'; }
  // Checked on a preview first: the real 'release_cost' may spend a use (Heart Surge raises the stage), so a refused
  // release must not reach it.
  const pc: any = emit(cb, 'release_cost', { u, design: d, ap: SOUL_AP.release, range: designRange(m, d), fail: '', preview: true, cb });
  if (pc.fail) return pc.fail;
  const pap = Math.max(0, pc.ap); if (u.ap < pap) return 'Needs ' + pap + ' AP.';
  const why = aimError(cb, u, d, aim, pc.range); if (why) return why;
  const rc: any = emit(cb, 'release_cost', { u, design: d, ap: SOUL_AP.release, range: designRange(m, d), fail: '', cb });
  u.ap -= Math.min(u.ap, Math.max(0, rc.ap));
  releaseAt(cb, rng, u, d, formOf(d) === 'aura' ? u.pos : aim!, false);
  return null;
}
/** Let it go (rules 1.5, calming 4): free, on your turn. The held Outburst is dropped; Strain falls by its stage, but
 * never by more than the Strain its swells cost (item 541: stages bought with AP or free Pumps give nothing back, or
 * Pump-then-let-go would be a vent); the meter +1. fx 'letgo' {unit, at, stage, by}. */
export function letGo(cb: Combat, u: Unit): string | null {
  const m = u.mg ? heart(u) : undefined; if (!m || !m.held) return 'Nothing held.';
  if (!onTurn(cb, u)) return 'On your own turn.';
  const st = m.held.stage, back = Math.min(st, m.held.paid ?? st), d = findDesign(m, m.held.design); m.held = null;
  const by = easeStrain(cb, u, back, 'letgo');
  emitFx(cb, 'letgo', { unit: u.id, at: u.pos, stage: st, by, strain: m.strain });
  if (by) emitFx(cb, 'calm', { unit: u.id, at: u.pos, way: 'letgo', by, strain: m.strain });
  cb.log.push(u.name + ' lets ' + (d ? d.name : 'the Outburst') + ' go: a violet sigh (Strain −' + by + ', ' + m.strain + '/' + m.strainLimit + ').');
  shiftMana(cb, 1, 'a heart let go');
  return null;
}
/** Steady the heart (rules 1.5, calming 5; Leon 8 Nov 2026): 1 AP, only while holding: −1 Strain, and the held Outburst
 * doesn't swell at the start of your next turn. fx 'steady' {unit, at, by, strain, stage}. */
export function steadyHeart(cb: Combat, u: Unit): string | null {
  const m = u.mg ? heart(u) : undefined; if (!m || !m.held) return 'Steady the heart only while holding an Outburst.';
  if (u.dead || u.downed) return 'Downed.';
  if (m.held.steady) return 'The heart is already steadied this turn.';
  if (u.ap < SOUL_AP.steady) return 'Needs ' + SOUL_AP.steady + ' AP.';
  u.ap -= SOUL_AP.steady; m.held.steady = true;
  const by = easeStrain(cb, u, 1, 'steady');
  emitFx(cb, 'steady', { unit: u.id, at: u.pos, by, strain: m.strain, stage: m.held.stage });
  if (by) emitFx(cb, 'calm', { unit: u.id, at: u.pos, way: 'steady', by, strain: m.strain });
  cb.log.push(u.name + ' steadies the heart: the glow cools (Strain ' + m.strain + '/' + m.strainLimit + '; no swell next turn).');
  return null;
}
/** Feeding (rules 1.5): 1 AP, absorb a glyph on your own tile into the held Outburst: +1 stage; the glyph is gone (a
 * Keystone can't be eaten). fx 'feed' {unit, at, word, stage}. */
export function feedOutburst(cb: Combat, u: Unit): string | null {
  const m = u.mg ? heart(u) : undefined; if (!m || !m.held) return 'You hold no Outburst to feed.';
  const e = canCast(u, cb); if (e) return e;
  if (m.held.stage >= MAX_STAGE) return 'The heart is full (stage ' + MAX_STAGE + ').';
  const g = (cb.glyphs || []).find((x) => x.pos === u.pos && !(x as any).keystone); if (!g) return 'No glyph on your tile to feed it.';
  if (u.ap < SOUL_AP.feed) return 'Needs ' + SOUL_AP.feed + ' AP.';
  u.ap -= SOUL_AP.feed; m.cast = true;
  cb.glyphs = (cb.glyphs || []).filter((x) => x !== g);
  m.held.stage++;
  emitFx(cb, 'feed', { unit: u.id, at: u.pos, word: g.word, glyph: g.id, stage: m.held.stage, mult: stageMult(m.held.stage) });
  cb.log.push(u.name + ' feeds the ' + g.word.toUpperCase() + ' glyph to the heart: stage ' + m.held.stage + ' (×' + stageMult(m.held.stage) + ').');
  return null;
}
/** Heart Overwatch on or off (free): while on and holding, the first enemy to enter the design's reach draws the release
 * as your reaction. fx 'hold' {unit, at, stage, watch}. */
export function setHeartWatch(cb: Combat, u: Unit, on = true): string | null {
  const m = u.mg ? heart(u) : undefined; if (!m || !m.held) return 'You hold no Outburst.';
  if (on) m.held.watch = true; else delete m.held.watch;
  emitFx(cb, 'hold', { unit: u.id, at: u.pos, stage: m.held.stage, tone: m.held.tone || 'raw', form: m.held.form || 'bolt', watch: on });
  cb.log.push(u.name + (on ? ' watches with the heart: the first enemy into reach draws the release.' : ' stops watching with the heart.'));
  return null;
}
/** Heart Overwatch (rules 1.5): called at each step of a walk. A watching holder releases at an enemy that has just
 * entered its reach (in sight, unless Ether), as its reaction. fx 'heart_overwatch' {unit, at, target, stage}. */
export function heartOverwatch(cb: Combat, rng: Rng, mover: Unit, from: string) {
  if (mover.dead || mover.downed || mover.hidden) return;
  for (const h of cb.units) {
    const m = h.mg; if (!m?.held?.watch || h.side === mover.side || h.dead || h.downed || h.surrendered || !canReact(cb, h)) continue;
    if (canCast(h, cb)) continue;
    const d = findDesign(heart(h)!, m.held.design); if (!d) continue;
    const r = heartReach(m, d);
    if (dist(h.pos, mover.pos) > r || dist(h.pos, from) <= r) continue;
    if (!d.modules.includes('ether') && !lineOfSight(cb, h.pos, mover.pos)) continue;
    const rw: any = emit(cb, 'reaction_window', { reactor: h, mover, kind: 'heart_overwatch', cancel: false, at: mover.pos, cb, rng }); if (rw.cancel) continue;
    useReaction(cb, h);
    emitFx(cb, 'heart_overwatch', { unit: h.id, at: h.pos, target: mover.id, to: mover.pos, stage: m.held.stage, tone: m.held.tone || 'raw' });
    cb.log.push(h.name + ' gasps and lets the heart go at ' + mover.name + ' (Heart Overwatch).');
    releaseAt(cb, rng, h, d, formOf(d) === 'aura' ? h.pos : mover.pos, false, true);
    if (mover.dead || mover.downed) return;
  }
}
/** A wild release (the Mana Short): a random creature within reach, or into the air. */
export function wildRelease(cb: Combat, rng: Rng, u: Unit): boolean {
  const m = heart(u)!, d = findDesign(m, m.held?.design); if (!d) { m.held = null; return false; }
  const near = cb.units.filter((v) => !v.dead && v !== u && dist(v.pos, u.pos) <= Math.max(1, heartReach(m, d)));
  if (!near.length) { emitFx(cb, 'release', { unit: u.id, at: u.pos, to: u.pos, school: d.school, form: formOf(d), tone: toneOf(d), element: toneElement(toneOf(d)), stage: m.held?.stage ?? 0, wild: true, area: [], targets: [], air: true }); cb.log.push(u.name + "'s Outburst bursts into the air."); m.held = null; return true; }
  const t = near[die(rng, near.length) - 1];
  cb.log.push(u.name + "'s Outburst releases wild at " + t.name + '.');
  releaseAt(cb, rng, u, d, formOf(d) === 'aura' ? u.pos : t.pos, true);
  return true;
}

// ----- what a release does -----
const OPT_COND: Record<string, string> = { left_brain_debuff: 'ldebuff', right_brain_debuff: 'rdebuff' };
const optOf = (school: string, o?: string) => o || ({ buff: 'heal', control: 'push', status: 'shaken' } as Record<string, string>)[school] || '';
/** The second school's rider strength (rules 1.5): half. */
const half = SECOND_SCHOOL.strength;
/** A design's second school, when it may ride (a different school, on the same side as the first), else null. */
const secondOf = (d: OutburstDesign) => (d.school2 && d.school2 !== d.school && schoolSide(d.school, d.modules) === schoolSide(d.school2, d.modules) ? d.school2 : null);
interface Hit { landed: boolean; crit: boolean; line: string }
function rollFor(cb: Combat, u: Unit, d: OutburstDesign, t: Unit, ignoreCover: boolean) {
  const homing = d.modules.includes('homing'), cover = !homing && !ignoreCover && coverTileFor(cb, u.pos, t.pos) ? 5 : 0;
  const bonus = u.mg!.will + (u.sk?.will_power ?? 0) + condSkillMod(u, 'will_power') + (homing ? 2 : 0) + condHit(u, t, cb) - cover;
  return { bonus, cover: !!cover, need: t.def, pct: Math.max(5, Math.min(95, (21 - (t.def - bonus)) * 5)) };
}
const rolls = (d: OutburstDesign) => (formOf(d) === 'bolt' || formOf(d) === 'lance') && !d.modules.includes('at_once');
const formMult = (d: OutburstDesign) => { const f = formOf(d); return f === 'bolt' ? 1 : (MODULE[f] as any)?.damage_mult ?? 1; };
/** The damage one school deals at a multiplier before armour (rules 1.5): 20 × Soul multiplier × stage × shape. */
export const outburstDamage = (m: MagicUnit, d: OutburstDesign, sm: number) => SOUL_DAMAGE * m.soulMult * sm * formMult(d) * (d.modules.includes('at_once') ? 0.5 : 1);
const armourKind = (tone: string, rs: number): 'none' | 'half' | 'full' => tone === 'raw' ? 'none' : toneRiders(tone, rs).riders.some((r) => r.rider === 'armour_full') ? 'full' : 'half';
const bonusDmg = (tone: string, rs: number) => toneRiders(tone, rs).riders.filter((r) => r.rider === 'bonus_damage').reduce((a, r) => a + (r.value || 0), 0);
const harmType = (tone: string): 'soul' | 'elemental' => (tone === 'raw' ? 'soul' : 'elemental');
/** Apply one school to one creature (primary at strength 1; the second school's rider at half). */
function schoolOn(cb: Combat, rng: Rng, u: Unit, d: OutburstDesign, t: Unit, school: string, option: string | undefined, sm: number, f: number, primary: boolean, rs: number, tone: string, out: string[]): Hit {
  const m = u.mg!, has = (x: string) => d.modules.includes(x), extra = has('time') ? (MODULE.time as any)?.extra_rounds ?? 2 : 0;
  const rounds = (n: number) => Math.max(1, Math.floor((n + extra) * f));
  if (school === 'damage') {
    const base = outburstDamage(m, d, sm) * f;
    if (has('inverse')) { if (t.side !== u.side) return { landed: false, crit: false, line: '' }; const s = grantShield(cb, t, base, u); out.push(t.name + ' is shielded (' + s + ')'); return { landed: true, crit: false, line: '' }; }
    const ign = toneRiders(tone, rs).riders.some((r) => r.rider === 'ignore_cover');
    let crit = false;
    if (primary && rolls(d)) {
      const r = d20(rng), rf = rollFor(cb, u, d, t, ign), tot = r + rf.bonus + (emit(cb, 'spell_roll', { u, t, die: r, add: 0, kind: 'soul', cb }) as any).add;
      if (r === 1 || (r !== 20 && tot < t.def)) { emitFx(cb, 'miss', { unit: u.id, target: t.id, at: t.pos, by: 'soul' }); out.push('misses ' + t.name + ' (d20 ' + r + ' → ' + tot + ' vs ' + t.def + ')'); return { landed: false, crit: false, line: '' }; }
      crit = r === 20; out.push('hits ' + t.name + ' (d20 ' + r + (crit ? ', CRITICAL' : '') + ')' + withElement(toneElement(tone), () => harm(cb, rng, u, t, base * (crit ? 2 : 1) + bonusDmg(tone, rs), harmType(tone), TONE[tone]?.damage_type, armourKind(tone, rs))));
    } else out.push((primary ? '' : 'and ') + withElement(toneElement(tone), () => harm(cb, rng, u, t, base + (primary ? bonusDmg(tone, rs) : 0), harmType(tone), TONE[tone]?.damage_type, armourKind(tone, rs))).replace(/^ · /, ''));
    return { landed: true, crit, line: '' };
  }
  const opt = optOf(school, option);
  if (school === 'buff') {
    if (t.side !== u.side) return { landed: false, crit: false, line: '' };
    if (opt === 'defense') out.push(applyCond(cb, rng, u, t, 'guarded', rounds(2)).replace(/^ · /, ''));
    else if (opt === 'hit') out.push(applyCond(cb, rng, u, t, 'inspired', rounds(2)).replace(/^ · /, ''));
    else out.push(heal(t, ((SCHOOL.buff as any)?.heal ?? 30) * m.healMult * sm * f, cb, u).replace(/^ · /, ''));
    return { landed: true, crit: false, line: '' };
  }
  if (school === 'control') {
    if (opt === 'push' || opt === 'pull') {
      const ca: any = emit(cb, 'cond_apply', { by: u, t, id: 'shoved', fam: 'body', rounds: 0, skipSave: false, cancel: false, why: '', tnAdd: 0, saveAdd: 0, cb, rng });
      if (ca.cancel) { out.push(t.name + ' can\'t be moved' + (ca.why ? ' (' + ca.why + ')' : '')); return { landed: false, crit: false, line: '' }; }
      const r = d20(rng), ok = !ca.skipSave && (r === 20 || (r !== 1 && r + saveOf(t, 'body') + (ca.saveAdd || 0) >= 12 + m.debuff.body + (ca.tnAdd || 0)));
      const n = Math.max(1, Math.floor(((SCHOOL.control as any)?.push_tiles ?? 3) * f));
      out.push(ok ? t.name + ' holds its ground (Body save)' : (magicShove(cb, t, u.pos, opt === 'push' ? n : -n, u).replace(/^ · /, '') || t.name + ' can\'t be moved'));
      return { landed: !ok, crit: false, line: '' }; // a saved push has not landed: it carries no rider (item 505)
    }
    // A condition lands when it takes hold (cb.condSeq moves only then): one resisted or cancelled carries no rider.
    const seq = cb.condSeq || 0;
    out.push(applyCond(cb, rng, u, t, opt === 'pinned' ? 'pinned' : 'slowed', rounds(2)).replace(/^ · /, ''));
    return { landed: (cb.condSeq || 0) !== seq, crit: false, line: '' };
  }
  if (school === 'status') {
    const seq = cb.condSeq || 0;
    out.push(applyCond(cb, rng, u, t, OPT_COND[opt] || opt, rounds(2), has('left') ? 'brain' : has('right') ? 'heart' : undefined).replace(/^ · /, ''));
    return { landed: (cb.condSeq || 0) !== seq, crit: false, line: '' };
  }
  return { landed: false, crit: false, line: '' };
}
/** A tone's riders on one creature it reached (rules 1.5, Elements): conditions, pushes, fire on the ground, rubble.
 * Exported for Storm Hand's Infusion and Discharge (the element's stage-N rider on a melee hit). */
export function applyToneRiders(cb: Combat, rng: Rng, by: Unit | null, t: Unit, tone: string, stage: number, from?: string, skip: string[] = []): string {
  let out = ''; const at0 = t.pos; // where it struck (the pushes around it read from there, not from where the push left it)
  for (const r of toneRiders(tone, stage).riders) {
    if (t.dead || skip.includes(r.rider)) continue;
    if (r.rider === 'cond' && r.condition) {
      const s = applyCond(cb, rng, by, t, r.condition, r.rounds, undefined, { skipSave: !r.save, ...(r.deep ? { arg: 'deep' } : {}) }); out += s;
      if (r.deep && condOn(t, 'corroded') && !(t as any).acidDeep) { (t as any).acidDeep = true; t.def -= 2; out += ' (Defense −2 more)'; }
    } else if (r.rider === 'spread' && r.condition) {
      for (const v of cb.units) if (v !== t && !v.dead && (!by || v.side !== by.side) && dist(v.pos, t.pos) <= (r.radius || 1)) out += applyCond(cb, rng, by, v, r.condition, r.rounds, undefined, { skipSave: !r.save });
    } else if (r.rider === 'ground' && r.object) {
      if (!(cb.objects ||= []).some((o) => o.pos === t.pos && o.kind === r.object)) { cb.objects.push(makeObject('sf_' + t.pos.replace(',', '_') + '_' + cb.round, r.object, t.pos)); out += ' · the ground under ' + t.name + ' burns'; }
    } else if (r.rider === 'ground_around' && r.object) {
      const [x, y] = XY(t.pos); let n = 0;
      for (let dx = -(r.radius || 1); dx <= (r.radius || 1); dx++) for (let dy = -(r.radius || 1); dy <= (r.radius || 1); dy++) {
        const k = (x + dx) + ',' + (y + dy); if (k === t.pos || !onGrid(cb, k) || !standable(cb.map, k) || cb.units.some((v) => !v.dead && v.pos === k) || (cb.objects || []).some((o) => o.pos === k)) continue;
        cb.objects!.push(makeObject('sr_' + k.replace(',', '_') + '_' + cb.round, r.object, k)); n++;
      }
      if (n) out += ' · rubble rises around ' + t.name;
    } else if (r.rider === 'push' && r.tiles) {
      out += magicShove(cb, t, from && from !== t.pos ? from : by?.pos || t.pos, r.tiles, by);
    } else if (r.rider === 'push_around' && r.tiles) {
      for (const v of [...cb.units]) if (v !== t && v !== by && !v.dead && dist(v.pos, at0) <= (r.radius || 1)) out += magicShove(cb, v, at0, r.tiles, by);
    }
  }
  return out;
}
/** Resonance (rules 1.5): this release's bonus on the stage multiplier, +0.2 for each other ally who released this
 * round, capped at +0.4 in total per release (Leon 8 Nov 2026). The players' side only (rules 1.5 follow-up): player
 * characters and the units fighting for them (companions, the Twinbound twin) resonate with their own side; enemies
 * never give or get it, so the enemy AI's previews never count it either (`resonates`). */
/** Whether a unit resonates (rules 1.5, item 549): a player character, or a unit fighting for one (a companion, the
 * Twinbound twin: `ctrl` names its character), on whichever side it stands. Enemies (no character behind them) never
 * do. In a Proving Ground team fight Team B's player characters stand on side 'foe' and still resonate with their own
 * side, so both teams get the same rule. */
export const resonates = (u: Unit): boolean => !!(u.charId || u.ctrl);
export function resonanceFor(cb: Combat, u: Unit): { bonus: number; with: string[] } {
  const r = (cb as any).soulRel as { round: number; by: { id: string; side: string }[] } | undefined;
  if (!resonates(u) || !r || r.round !== cb.round) return { bonus: 0, with: [] };
  const w = [...new Set(r.by.filter((x) => x.side === u.side && x.id !== u.id).map((x) => x.id))];
  return { bonus: Math.min(RESONANCE_MAX, Math.round(RESONANCE_BONUS * w.length * 100) / 100), with: w };
}
function noteRelease(cb: Combat, u: Unit) {
  if (!resonates(u)) return; // enemies don't resonate (resonanceFor)
  const c: any = cb; if (!c.soulRel || c.soulRel.round !== cb.round) c.soulRel = { round: cb.round, by: [] };
  c.soulRel.by.push({ id: u.id, side: u.side });
}
function releaseAt(cb: Combat, rng: Rng, u: Unit, d: OutburstDesign, aim: string, wild: boolean, reaction = false) {
  const was = SPELL; SPELL = { mp: u.mg?.held?.cost ?? (u.mg ? designCost(u.mg, d, manaOf(cb)) : 0) }; try { releaseAtInner(cb, rng, u, d, aim, wild, reaction); } finally { SPELL = was; }
}
function releaseAtInner(cb: Combat, rng: Rng, u: Unit, d: OutburstDesign, aim: string, wild: boolean, reaction: boolean) {
  const m = heart(u)!, stage = m.held?.stage ?? 0, tone = toneOf(d), form = formOf(d), has = (x: string) => d.modules.includes(x);
  // 'outburst_release' {u, design, stage, aim, wild, mult, form, tone, reaction} (mult multiplies the stage multiplier).
  const orl: any = emit(cb, 'outburst_release', { u, design: d, stage, aim, wild, mult: 1, form, tone, reaction, cb, rng });
  const res = wild ? { bonus: 0, with: [] as string[] } : resonanceFor(cb, u);
  const sm = (stageMult(stage) + res.bonus) * (orl.mult || 1), rs = riderStage(cb, stage + riderBonus(cb, u, reaction || wild));
  const heldWas = m.held ? { ...m.held } : null;
  m.held = null;
  if (has('random') && !wild) { const pool = cb.units.filter((v) => !v.dead && v !== u && dist(v.pos, u.pos) <= heartReach(m, d)); if (pool.length) aim = pool[die(rng, pool.length) - 1].pos; }
  const tiles = outburstArea(cb, u, d, aim), targets = affectedBy(cb, u, d, tiles);
  if (!wild) noteRelease(cb, u);
  if (res.with.length) emitFx(cb, 'resonance', { unit: u.id, at: u.pos, with: res.with, bonus: res.bonus });
  emitFx(cb, 'release', { unit: u.id, at: u.pos, to: aim, design: d.id, school: d.school, school2: d.school2 || null, option: d.option || null, form, tone, element: toneElement(tone), stage, mult: Math.round(sm * 100) / 100,
    riderStage: rs, wild, reaction, resonance: res.bonus, area: tiles, targets: targets.map((t) => t.id) });
  const line: string[] = [], hitFoes: Unit[] = [], hits: Unit[] = [];
  // The second school rides only where it works on the same side as the first (rules 1.5, 4.2; the workshop refuses
  // the rest): a Buff design's heal never carries a push, a Status or damage onto the ally it healed.
  const s2 = secondOf(d);
  for (const t of targets) {
    if (t.dead) continue;
    const h = schoolOn(cb, rng, u, d, t, d.school, d.option, sm, 1, true, rs, tone, line);
    if (h.landed) hits.push(t);
    if (!h.landed || t.dead) continue;
    if (s2) schoolOn(cb, rng, u, d, t, s2, d.option2, sm, half, false, rs, tone, line);
    if (tone !== 'raw' && t.side !== u.side && !t.dead) { const rr = applyToneRiders(cb, rng, u, t, tone, rs, form === 'burst' ? aim : u.pos, ['armour_full', 'bonus_damage', 'ignore_cover', 'chain']); if (rr) line.push(rr.replace(/^ · /, '')); hitFoes.push(t); }
  }
  // Storm's chains: from the first enemy hit, to the nearest other enemies within range, at half (no roll).
  const ch = toneRiders(tone, rs).riders.find((r) => r.rider === 'chain');
  if (ch && hitFoes.length && d.school === 'damage') {
    let from = hitFoes[0]; const done = new Set(targets.map((t) => t.id)); done.add(u.id);
    for (let i = 0; i < (ch.n || 1); i++) {
      const next = cb.units.filter((v) => !v.dead && !done.has(v.id) && v.side !== u.side && dist(v.pos, from.pos) <= (ch.range || 2)).sort((a, b) => dist(a.pos, from.pos) - dist(b.pos, from.pos))[0];
      if (!next) break; done.add(next.id);
      emitFx(cb, 'chain', { unit: u.id, from: from.pos, to: next.pos, target: next.id, element: toneElement(tone) });
      line.push('it chains to ' + next.name + withElement(toneElement(tone), () => harm(cb, rng, u, next, outburstDamage(m, d, sm) * (ch.mult ?? 0.5), harmType(tone), TONE[tone]?.damage_type, armourKind(tone, rs))));
      const sh = toneRiders(tone, rs).riders.filter((r) => r.rider === 'cond'); for (const r of sh) if (!next.dead) line.push(applyCond(cb, rng, u, next, r.condition!, r.rounds, undefined, { skipSave: !r.save }).replace(/^ · /, ''));
      from = next;
    }
  }
  if (!targets.length) line.push('nobody ' + (form === 'bolt' ? 'at ' + refOf(aim) : 'in the ' + form));
  cb.log.push(u.name + ' releases ' + d.name + ' (' + form.toUpperCase() + (tone !== 'raw' ? ' · ' + TONE[tone].name : '') + ') at stage ' + stage + ' (×' + Math.round(sm * 100) / 100 + (res.bonus ? ', resonance +' + res.bonus.toFixed(1) : '') + ')' + (wild ? ' (wild)' : '') + (reaction ? ' (Heart Overwatch)' : '') + ': ' + line.filter(Boolean).join(' · ') + '.');
  // 'outburst_after' {u, design, held, stage, aim, mult, riderStage, form, tone, area, targets, hits, wild, reaction}:
  // after the primary hit, the second school, the tone's riders and the chains have landed (Twin Souls' third school,
  // Storm Front's arcs). `held` is the Outburst as it was held (null on a wild release with nothing held); `targets`
  // are everyone the area took in, `hits` those the primary school landed on (a missed roll is not a hit).
  emit(cb, 'outburst_after', { u, design: d, held: heldWas, stage, aim, mult: sm, riderStage: rs, form, tone, area: tiles, targets, hits, wild, reaction, cb, rng });
}
/** The held heart at a turn start (rules 1.5): Strain −1 (always), the swell (+1 stage and +1 Strain, +2 Flooded,
 * unless steadied), the elemental aura's tick on adjacent enemies, the round's free Pumps back, and 'held_turn_start'
 * {u, held, cb, rng} for items. */
function heartTurnStart(cb: Combat, rng: Rng, u: Unit) {
  const m = heart(u); if (!m) return;
  m.freePumps = m.freePumpsMax || 0; m.calmFight = false; m.calmTend = false;
  if (m.strain > 0) calm(cb, u, 1, 'turn', true);
  const h = m.held; if (!h) { m.cast = false; return; }
  const d = findDesign(m, h.design); if (!d) { m.held = null; m.cast = false; return; }
  h.turns = (h.turns || 0) + 1;
  if (h.steady) { delete h.steady; cb.log.push(u.name + "'s steadied heart holds at stage " + h.stage + '.'); }
  else {
    if (h.stage < MAX_STAGE) { h.stage++; emitFx(cb, 'swell', { unit: u.id, at: u.pos, stage: h.stage, mult: stageMult(h.stage), tone: h.tone || 'raw' }); cb.log.push(u.name + "'s held Outburst swells to stage " + h.stage + ' (×' + stageMult(h.stage) + ').'); }
    // 'outburst_hold' {u, strain} (mutable): the Strain of holding one more turn (hooks gap D7).
    const oh: any = emit(cb, 'outburst_hold', { u, strain: flooded(cb) ? CYC.flooded_strain ?? 2 : CYC.swell_strain ?? 1, cb });
    if (oh.strain > 0) { if (h.paid != null) h.paid += oh.strain; addStrain(cb, rng, u, oh.strain, 'holding'); }
  }
  m.cast = false;
  if (!m.held || u.dead || u.downed) return;
  // The aura: an elemental heart leaks onto adjacent enemies (5 Elemental + the stage-1 rider, shifted by the air).
  const tone = h.tone || 'raw';
  if (tone !== 'raw') {
    const rs = riderStage(cb, 1), near = cb.units.filter((v) => !v.dead && v.side !== u.side && !v.surrendered && dist(v.pos, u.pos) <= (SR.aura?.radius ?? 1));
    if (near.length) emitFx(cb, 'aura_tick', { unit: u.id, at: u.pos, tone, element: toneElement(tone), targets: near.map((v) => v.id), riderStage: rs });
    for (const v of near) { const s = withElement(toneElement(tone), () => harm(cb, rng, u, v, AURA_TICK + bonusDmg(tone, rs), 'elemental', TONE[tone]?.damage_type, armourKind(tone, rs))) + applyToneRiders(cb, rng, u, v, tone, rs, u.pos, ['armour_full', 'bonus_damage', 'ignore_cover', 'chain']); cb.log.push(u.name + "'s held " + TONE[tone].name + ' leaks' + s + '.'); }
  }
  emitFx(cb, 'hold', { unit: u.id, at: u.pos, stage: m.held?.stage ?? 0, tone, form: m.held?.form || 'bolt', watch: !!m.held?.watch });
  emit(cb, 'held_turn_start', { u, held: m.held, cb, rng });
}

// ----- the preview (rules 1.5: the same standard as Sigil 1.4's) -----
export interface OutburstAffected {
  unit: string; name: string; at: string; ally: boolean; enemy: boolean; self: boolean;
  /** Expected numbers after the multipliers and armour (damage), and heals and shields. */
  dmg: number; dmgAfterArmour: number; heal: number; shield: number;
  roll: { bonus: number; need: number; pct: number; cover: boolean } | null;
  saves: { cond: string; fam: Fam; tn: number }[];
  /** The tone's rider on this creature at this stage, in words ('' when none), and the second school's rider. */
  rider: string; second: string;
  /** How the release reaches it (rules 1.5 section 7: everyone affected): 'area' (in the tinted area), 'chain'
   * (Storm's chain), 'spread' (Fire's stage-4 spread), 'push' (Gale's stage-4 push of everyone within 1), 'arc' (an
   * item's arc: Storm Front). Those past the area take effect only if the primary lands. */
  via: 'area' | 'chain' | 'spread' | 'push' | 'arc';
}
export interface OutburstPlan {
  ok: boolean; why?: string;
  /** AP and MP of what is planned: from a design, Begin + Release (snap); from the held one, the Release. */
  ap: number; mp: number; strain: number; strainAfter: number; strainLimit: number;
  /** The Strain over the limit after it (each point burns 8 at the turn's end) and whether it would short (3 over). */
  burnWarning: number; shortWarning: boolean;
  stage: number; mult: number; riderStage: number; form: OutburstForm; tone: string; element: string | null;
  design?: string; school?: string; school2?: string | null;
  reach: number; reachTiles: string[]; area: string[]; affected: OutburstAffected[];
  resonance: boolean; resonanceBonus: number; riderText: string; needsAim: boolean;
}
/** The full preview (rules 1.5, section 7): what a snap cast of a design, or a release of the held Outburst, would do
 * at its stage (or at opts.stage: "if I pump twice"): AP, MP, Strain after and the warnings, the multiplier, the reach
 * ring, the tinted area, everyone affected with their expected numbers, saves and this stage's rider, resonance. */
export function previewOutburstPlan(cb: Combat, u: Unit, src: string | 'held', aim?: string, opts: { stage?: number; mods?: string[] } = {}): OutburstPlan {
  // The toggles on the action being planned (Heart Surge, Verse…) are read as the real action reads them (cb.mods).
  if (!opts.mods) return planInner(cb, u, src, aim, opts);
  const c: any = cb, had = 'mods' in c, was = c.mods; c.mods = opts.mods;
  try { return planInner(cb, u, src, aim, opts); } finally { if (had) c.mods = was; else delete c.mods; }
}
function planInner(cb: Combat, u: Unit, src: string | 'held', aim: string | undefined, opts: { stage?: number }): OutburstPlan {
  const m = u.mg ? heart(u) : undefined;
  const no = (why: string, extra: Partial<OutburstPlan> = {}): OutburstPlan => ({ ok: false, why, ap: 0, mp: 0, strain: 0, strainAfter: m?.strain ?? 0, strainLimit: m?.strainLimit ?? 0, burnWarning: 0, shortWarning: false, stage: 0, mult: stageMult(0), riderStage: 0,
    form: 'bolt', tone: 'raw', element: null, reach: 0, reachTiles: [], area: [], affected: [], resonance: false, resonanceBonus: 0, riderText: '', needsAim: true, ...extra });
  if (!m) return no('You have no Outbursts.');
  // 'held' previews the held Outburst; a design id (even the held design's) previews a fresh snap of that design.
  const held = src === 'held';
  const d = findDesign(m, src === 'held' ? m.held?.design : src); if (!d) return no(src === 'held' ? 'Nothing held.' : 'No such design.');
  const form = formOf(d), tone = toneOf(d), stage0 = held && m.held ? m.held.stage : 0;
  let stage = Math.max(0, Math.min(MAX_STAGE, opts.stage ?? stage0)), itemMult = 1;
  const res = resonanceFor(cb, u);
  let ap = 0, mp = 0, strain = 0, range = designRange(m, d), why: string | undefined;
  if (held && m.held) {
    const e = canCast(u, cb); if (e) why = e;
    // 'release_cost' (preview) {…, surge}: an item that raises the release's stage says so (Heart Surge: true below
    // stage 4; past it, the multiplier to use).
    const rc: any = emit(cb, 'release_cost', { u, design: d, ap: SOUL_AP.release, range: designRange(m, d), fail: '', preview: true, surge: 0, cb });
    ap = Math.max(0, rc.ap) + pumpsAp(cb, u, d, Math.max(0, stage - stage0), stage0); range = rc.range;
    if (rc.fail) why ||= rc.fail; else if (u.ap < ap) why ||= 'Needs ' + ap + ' AP.';
    if (!why) why = aimError(cb, u, d, form === 'aura' ? u.pos : aim, rc.range) || undefined;
    if (rc.surge) { if (stage < MAX_STAGE) stage++; else itemMult = typeof rc.surge === 'number' ? rc.surge / stageMult(MAX_STAGE) : 1; }
  } else {
    const pv = previewOutburst(cb, u, d.id, form === 'aura' ? u.pos : aim, true);
    ap = pv.ap + pumpsAp(cb, u, d, stage, 0); mp = pv.cost; strain = pv.strain + (m.debt || 0); if (pv.range) range = pv.range;
    if (!stage) itemMult = pv.relMult || 1; // a snap cast's item multiplier (Heart Surge's snap)
    if (!pv.ok) why = pv.why; else if (u.ap < ap) why = 'Needs ' + ap + ' AP.';
  }
  const sm = (stageMult(stage) + res.bonus) * itemMult, rs = riderStage(cb, stage + riderBonus(cb, u, false));
  // The reach ring is the range the aim check uses (items' changes included): Bolt and Burst; the shapes their size.
  const reach = form === 'bolt' || form === 'burst' ? range : heartReach(m, d);
  const reachTiles: string[] = []; { const [x, y] = XY(u.pos); for (let i = x - reach; i <= x + reach; i++) for (let j = y - reach; j <= y + reach; j++) { const k = i + ',' + j; if (onGrid(cb, k) && k !== u.pos && standable(cb.map, k)) reachTiles.push(k); } }
  const strainAfter = m.strain + strain, over = strainAfter - m.strainLimit;
  const at = form === 'aura' ? u.pos : aim;
  const base: Partial<OutburstPlan> = { ap, mp, strain, strainAfter, strainLimit: m.strainLimit, burnWarning: Math.max(0, over) * STRAIN_BURN, shortWarning: over >= SHORT_AT_OVER, stage, mult: Math.round(sm * 100) / 100, riderStage: rs, form, tone, element: toneElement(tone),
    design: d.id, school: d.school, school2: d.school2 || null, reach, reachTiles, resonance: res.with.length > 0, resonanceBonus: res.bonus, riderText: tone === 'raw' ? 'Raw: Soul damage, armour ignored; no rider.' : TONE[tone].name + ' at stage ' + rs + ': ' + toneRiders(tone, rs).text, needsAim: form !== 'aura' };
  if (!at) return no(why || 'Pick a target tile.', base);
  const area = outburstArea(cb, u, d, at), targets = affectedBy(cb, u, d, area);
  const affected: OutburstAffected[] = targets.map((t) => {
    const a: OutburstAffected = { unit: t.id, name: t.name, at: t.pos, ally: t.side === u.side && t !== u, enemy: t.side !== u.side, self: t === u, dmg: 0, dmgAfterArmour: 0, heal: 0, shield: 0, roll: null, saves: [], rider: '', second: '', via: 'area' };
    const one = (school: string, option: string | undefined, f: number, primary: boolean) => {
      if (school === 'damage') {
        const raw = outburstDamage(m, d, sm) * f;
        if (d.modules.includes('inverse')) { if (t.side === u.side) a.shield += Math.floor(raw); return; }
        // Floored as harm() floors it, so the chip reads the engine's number.
        const n = Math.floor(raw + (primary ? bonusDmg(tone, rs) : 0)), ak = armourKind(tone, rs), arm = ak === 'full' ? t.armour : ak === 'half' ? Math.floor(t.armour / 2) : 0;
        a.dmg += n; a.dmgAfterArmour += Math.max(1, n - arm);
        if (primary && rolls(d)) a.roll = rollFor(cb, u, d, t, toneRiders(tone, rs).riders.some((r) => r.rider === 'ignore_cover'));
      } else if (school === 'buff') { if (optOf('buff', option) === 'heal' && t.side === u.side) a.heal += Math.floor(((SCHOOL.buff as any)?.heal ?? 30) * m.healMult * sm * f * (manaBand(manaOf(cb)).healing_given_mult ?? 1)); }
      else if (school === 'control') { const o = optOf('control', option); a.saves.push({ cond: o === 'push' || o === 'pull' ? o : o, fam: 'body', tn: 12 + m.debuff.body }); }
      else if (school === 'status') { const o = optOf('status', option), fam: Fam = d.modules.includes('left') ? 'brain' : d.modules.includes('right') ? 'heart' : (condFamily(OPT_COND[o] || o) || 'heart'); a.saves.push({ cond: OPT_COND[o] || o, fam, tn: 12 + m.debuff[fam] }); }
    };
    one(d.school, d.option, 1, true);
    if (secondOf(d)) { one(d.school2!, d.option2, half, false); a.second = (SCHOOL[d.school2!]?.name || d.school2) + ' (' + optOf(d.school2!, d.option2) + ') at half'; }
    if (tone !== 'raw' && t.side !== u.side) { a.rider = toneRiders(tone, rs).text; for (const r of toneRiders(tone, rs).riders) if (r.rider === 'cond' && r.save && r.condition) { const fam = condFamily(r.condition) || 'body'; a.saves.push({ cond: r.condition, fam, tn: 12 + m.debuff[fam] }); } }
    return a;
  });
  // Everyone else the release would reach past its area (section 7): Storm's chains, Fire's stage-4 spread, Gale's
  // stage-4 push of everyone within 1, then items' own reach ('outburst_plan' {u, design, stage, mult, riderStage, aim,
  // area, targets, affected, cb}: Storm Front pushes its arcs).
  const listed = new Set(affected.map((a) => a.unit)), add = (a: OutburstAffected) => { if (listed.has(a.unit)) return; listed.add(a.unit); affected.push(a); };
  const riders = toneRiders(tone, rs).riders, foesHit = targets.filter((t) => t.side !== u.side), ch = riders.find((r) => r.rider === 'chain');
  if (ch && foesHit.length && d.school === 'damage') {
    let from = foesHit[0]; const done = new Set(targets.map((t) => t.id)); done.add(u.id);
    for (let i = 0; i < (ch.n || 1); i++) {
      const next = cb.units.filter((v) => !v.dead && !done.has(v.id) && v.side !== u.side && dist(v.pos, from.pos) <= (ch.range || 2)).sort((x, y) => dist(x.pos, from.pos) - dist(y.pos, from.pos))[0];
      if (!next) break; done.add(next.id);
      add(planStrike(cb, u, d, next, sm, rs, { f: ch.mult ?? 0.5, roll: false, bonus: false, riders: riders.filter((r) => r.rider === 'cond'), via: 'chain', note: 'Storm chains from ' + from.name + ' at half' }));
      from = next;
    }
  }
  const spread = riders.find((r) => r.rider === 'spread'), pushAll = riders.find((r) => r.rider === 'push_around');
  if (tone !== 'raw') for (const t of foesHit) {
    if (spread?.condition) for (const v of cb.units) if (v !== t && !v.dead && v.side !== u.side && dist(v.pos, t.pos) <= (spread.radius || 1))
      add({ ...blankAffected(u, v, 'spread'), rider: condName(spread.condition) + (spread.rounds ? ' ' + spread.rounds + ' rounds' : '') + ' (spreads from ' + t.name + ')', saves: spread.save ? [{ cond: spread.condition, fam: (condFamily(spread.condition) || 'body') as Fam, tn: 12 + m.debuff[(condFamily(spread.condition) || 'body') as Fam] }] : [] });
    if (pushAll) for (const v of cb.units) if (v !== t && v !== u && !v.dead && dist(v.pos, t.pos) <= (pushAll.radius || 1))
      add({ ...blankAffected(u, v, 'push'), rider: 'pushed ' + pushAll.tiles + ' tiles away from ' + t.name + ' (' + TONE[tone].name + ')' });
  }
  emit(cb, 'outburst_plan', { u, design: d, stage, mult: sm, riderStage: rs, aim: at, area, targets, affected, add, preview: true, cb });
  return { ...(base as OutburstPlan), ok: !why, ...(why ? { why } : {}), area, affected };
}
function blankAffected(u: Unit, t: Unit, via: OutburstAffected['via']): OutburstAffected {
  return { unit: t.id, name: t.name, at: t.pos, ally: t.side === u.side && t !== u, enemy: t.side !== u.side, self: t === u, dmg: 0, dmgAfterArmour: 0, heal: 0, shield: 0, roll: null, saves: [], rider: '', second: '', via };
}
/** One creature a release strikes past its area, as the preview shows it (a chain, an item's arc): the design's damage
 * at the multiplier × f (+ the tone's bonus damage when bonus), its roll when roll, and the given riders' saves. */
export function planStrike(cb: Combat, u: Unit, d: OutburstDesign, t: Unit, sm: number, rs: number, o: { f?: number; roll?: boolean; bonus?: boolean; riders?: ToneRider[]; via?: OutburstAffected['via']; note?: string } = {}): OutburstAffected {
  const m = u.mg!, tone = toneOf(d), a = blankAffected(u, t, o.via || 'arc');
  const n = Math.floor(outburstDamage(m, d, sm) * (o.f ?? 1) + (o.bonus ? bonusDmg(tone, rs) : 0)), ak = armourKind(tone, rs), arm = ak === 'full' ? t.armour : ak === 'half' ? Math.floor(t.armour / 2) : 0;
  a.dmg = n; a.dmgAfterArmour = Math.max(1, n - arm);
  if (o.roll) a.roll = rollFor(cb, u, d, t, toneRiders(tone, rs).riders.some((r) => r.rider === 'ignore_cover'));
  const rr = o.riders ?? (tone !== 'raw' ? toneRiders(tone, rs).riders : []);
  for (const r of rr) if (r.rider === 'cond' && r.save && r.condition) { const fam = (condFamily(r.condition) || 'body') as Fam; a.saves.push({ cond: r.condition, fam, tn: 12 + m.debuff[fam] }); }
  a.rider = [o.note, tone !== 'raw' && rr.length ? (o.riders ? rr.map((r) => r.condition ? condName(r.condition) : '').filter(Boolean).join(', ') : toneRiders(tone, rs).text) : ''].filter(Boolean).join(' · ');
  return a;
}
/** Syphon (1 AP): MP from the air by the band, × the Syphon bonus; the meter drops 2. */
export function syphon(cb: Combat, u: Unit): string | null {
  const m = u.mg; if (!m || !m.emanator) return NEEDS_EMANATOR;
  if (u.ap < SPELL_AP.syphon) return 'Needs 1 AP.'; if (m.mp >= m.mpMax) return 'Your Emanator is full.';
  u.ap -= SPELL_AP.syphon; const gain = Math.round(manaBand(manaOf(cb)).syphon_mp * m.syphon), was = m.mp; m.mp = Math.min(m.mpMax, m.mp + gain);
  emitFx(cb, 'syphon', { unit: u.id, at: u.pos, mp: m.mp - was }); shiftMana(cb, -2); cb.log.push(u.name + ' syphons ' + (m.mp - was) + ' MP from the air (' + m.mp + '/' + m.mpMax + ').');
  return null;
}
/** Crystallise (3 AP, the meter at 10+): the meter drops 10 and you make one standard core. */
export function crystallise(cb: Combat, u: Unit): string | null {
  const m = u.mg; if (!m || !m.emanator) return NEEDS_EMANATOR;
  const cap = actionAp({ u }, 'crystallise', SPELL_AP.crystallise).ap; // items price it (hooks gap D8)
  if (u.ap < cap) return 'Needs ' + cap + ' AP.'; if (manaOf(cb) < 10) return 'The air is too thin (mana ' + manaOf(cb) + ', needs 10).';
  u.ap -= cap; m.coresMade++; emitFx(cb, 'crystallise', { unit: u.id, at: u.pos, dur: 1400 }); shiftMana(cb, -10); cb.log.push(u.name + ' crystallises a mana core from the air.');
  return null;
}
/** Who a spell would affect, hit or miss (used to decide whether a spell on the story map starts a fight). */
export function spellTargets(cb: Combat, u: Unit, act: string, tile?: string, aim?: string, designId?: string): string[] {
  if (act === 'evoke') return tile ? previewEvokeS(cb, u, tile, aim).targets : [];
  const m = u.mg; if (!m) return [];
  const d = findDesign(m, act === 'release' ? m.held?.design : designId); if (!d) return [];
  const at = formOf(d) === 'aura' ? u.pos : aim; if (!at) return [];
  return affectedBy(cb, u, d, outburstArea(cb, u, d, at)).map((v) => v.id);
}

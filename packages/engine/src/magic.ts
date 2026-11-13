// Magic (spec: Mana; Sigils rules 1.4, Soul rules 1.5: Outburst 2.0). Sigils are words drawn as glyphs onto tiles (sigil.ts: the Line,
// the facing rule, Reach, Delivery, Burst, KIN), fired with Evoke. Outbursts are held in the heart, grow each turn and are released when
// the caster chooses. The ambient mana meter, conditions with saves, shields and standing wall zones live here too.
// Everything is deterministic: rolls come from the rng passed in.
import figmentsJ from '../../../data/figments.json';
import { SIGIL, SCHOOL, MODULE, MANA_BANDS, SKILL, TONE, SOUL_RULES, SOUL_REV, WEAPON, type SigilDef, type ToneRider } from './data';
import {
  type Character, type OutburstDesign, mod, maxMp, healingMult, packOf,
  sigilMult, soulMult, elementalMult, maxSigilWords, glyphAp, sigilCoreSaving, sigilRangeBonus, sigilDurationBonus,
  soulCastAp, soulCostSaving, soulRangeBonus, syphonMult, strainLimit, swellFree, saveBonus, strengthTable, hasEvoker, hasEmanator, carriesEvoker, carriesEmanator, carriesVisualizer, hasVisualizer, NEEDS_EVOKER, NEEDS_EMANATOR, coresCarried, mpNow, evoChargeNow, freePumps, migrateDesign, schoolSide,
} from './character';
import { say, type Combat, type Unit, dist, lineOfSight, standable, refOf, coverTileFor, emitFx, fxFell, noteCrit , dropNailed, dropStuck, rollInjury, displace, swapUnits, stepEvent } from './combat';
import { type Rng, die } from './rng';
import { CONDS, condId, condMods, FLAG_CONDS, UNTIL, type CondDef } from './condtable';
import { rawBleed, rawDazed, rawProne, rawHidden } from './unitstate';
import { rollSave, rollD20, judge, rollFx, SAVE_TN, tierSave, tierStrength, type RollResult, toHitAdd } from './rolls';
import { emit, boundGame, statQuery, onHook, charOfUnit } from './effects/hooks';
import { FEELING, PLAIN_STEP, ONCE_EACH, RESIDUE_ROUNDS, feelDelta, feelingStep, strongestFeeling, residueAt, residueReaches, residueStand, residueFlag, lastHurtBy, SOUL_PRACTICE } from './feelings';
import { apDebt } from './effects/ap';
import { canSurrender, surrender, deathMana } from './tactics';
import { applyDamage, healUnit, grantShield, tendHook } from './effects/damage';
import { itemAmount, amountMult } from './effects/amounts';
import { mendFactor, MENDING, flatLevelOf } from './effects/mending';
import { deal, mend, amountOf, term, armourAgainst, levelFactor, statOf, type Term } from './effects/output';
import { canReact, react, loseReactions, dropHeldShot } from './tactics';
import { makeObject } from './objects';
import { rollDeathDrops } from './loot';
import { itemWords, wordCostMods, immune } from './effects/core';
import { price, priced, costOf, whyNot, canPay, pay, refund, apFor } from './effects/cost';
import { masteredWords } from './sigilgrowth';
import { tilesIn, rngOf } from './kit';

type Fam = 'body' | 'brain' | 'heart';
/** A glyph on a tile. v: the rules revision it was drawn under (14 = rules 1.4; a glyph without it is from 1.2). */
/** A glyph on the ground. strokeId (rules 1.10, Sigil 1.5): the stroke it was drawn into (sigil.ts strokeRuns); a glyph
 * without one is an old 1.4 glyph, read by the touching-group rule until it fades. */
export interface Glyph { id: string; word: string; pos: string; by: string; side: 'pc' | 'foe'; left: number; who: string; v?: number; strokeId?: string;
  /** Rules 1.10 Junctions (Brain Power Mastered): the second stroke a crossing glyph belongs to. */
  strokeId2?: string;
  /** Rules 1.10: the characters who have copied this glyph's word (Read, or Analyzing its drawer): once each. */
  copiedBy?: string[] }
/** Rules 1.10: what a scuffed glyph leaves for a while (its word can still be read and copied); not a glyph. */
export interface Trace { id: string; word: string; pos: string; side: 'pc' | 'foe'; by: string; who: string; left: number; copiedBy?: string[] }
/** Placed magic and other standing zones. Sigil 1.4: 'field' (STAY), 'trap' (WAIT; hidden from the other side until
 * spotted), 'turret' (WATCH; hp, def), 'veil' (smoke), 'light'. 'wall' is a 1.2 standing wall (read as a field).
 * Class and gadget zones (scramble, seal, sanctuary, grand…) use the same shape. */
export interface Zone { id: string; kind: 'field' | 'trap' | 'turret' | 'wall' | 'veil' | 'light' | 'scramble' | DataZoneKind; tiles: string[]; words: string[]; by: string; side: 'pc' | 'foe'; left: number; mult: number; who: string; hit?: Record<string, number>;
  /** Classes 3.0 P10: what the zone has left to give (the op that reads it spends it: a `damage_mult` with `pool` takes
   * its prevented damage from it); at 0 the zone ends. */ pool?: number;
  /** field (item 422): the creatures it has ever affected (they take ×mult after), and its first-time multiplier. */
  ever?: Record<string, boolean>; first?: number;
  /** field: the Burst multiplier per tile; trap/turret: hidden, the sides that spotted it, triggers left, hp, def; element. */
  tileMult?: Record<string, number>; hidden?: boolean; spotted?: string[]; triggers?: number; hp?: number; def?: number; element?: string | null; kin?: boolean; dir?: [number, number]; reachMult?: number }
// ---------- zones from data (Classes 3.0 P10) ----------
/** The kinds of zone data may lay (op `zone`; predicates self_in_zone, target_in_zone): a closed list, one a user. */
export const DATA_ZONE_KINDS = ['sanctuary'] as const;
/** A kind of zone data may lay. */
export type DataZoneKind = (typeof DATA_ZONE_KINDS)[number];
/** THE door that lays a zone a unit owns on the fight (the op `zone`, a class move's own action): its id is the fight's
 * next glyph serial; it runs down with the others (sigilRoundTick: `rounds`) and ends at 0 or when its pool is spent. */
export function makeZone(cb: Combat, by: Unit, o: { kind: Zone['kind']; tiles: string[]; rounds: number; mult?: number; words?: string[]; pool?: number }): Zone {
  const z: Zone = { id: 'z' + (cb.glyphSeq = (cb.glyphSeq || 0) + 1), kind: o.kind, tiles: o.tiles, words: o.words || [String(o.kind)], by: by.id, side: by.side as 'pc' | 'foe', left: o.rounds, mult: o.mult ?? 1, who: by.name, ...(o.pool != null ? { pool: o.pool } : {}) };
  cb.zones = [...(cb.zones || []), z];
  return z;
}
/** The zones of a kind a tile lies in, by their owner's relation to a unit (self: its own; side: its side's; any). */
export function zonesAt(cb: Combat, tile: string, kind: string, owner: 'self' | 'side' | 'any' = 'any', to?: Unit | null): Zone[] {
  return (cb.zones || []).filter((z) => z.kind === kind && z.tiles.includes(tile) && (owner === 'any' || !to ? true : owner === 'self' ? z.by === to.id : z.side === to.side));
}
/** End zones (a holder's of a kind): returns how many ended. */
export function endZones(cb: Combat, pick: (z: Zone) => boolean): number { const was = (cb.zones || []).length; cb.zones = (cb.zones || []).filter((z) => !pick(z)); return was - cb.zones.length; }
/** A unit's magic: what it knows and carries, and its running state. */
export interface MagicUnit {
  words: string[]; designs: OutburstDesign[]; evoker: boolean; emanator: boolean;
  charge: number; cores: number; coresMade: number; flux: number; lockRound?: number;
  /** rules 1.34: the Visualizer (in hand, carried), its core's charge, Visualization points */ visualizer?: boolean; vcarry?: boolean; vcharge?: number; vchargeMax?: number; vis?: number;
  mp: number; mpMax: number; strain: number; held: HeldOutburst | null;
  /** Rules 1.5: this turn the heart was worked (Begin, Pump or Feed; class casts set it too): no stillness at the turn's end. */
  cast: boolean;
  /** Free Pumps left this round and per round (Empathy 3: 1; rules 1.19: no second from Empathy 7); the calming ways used this turn; Strain owed on the next Begin. */
  freePumps?: number; freePumpsMax?: number; calmFight?: boolean; calmTend?: boolean; debt?: number;
  /** Rules 1.19: the free stages taken this turn (a character takes FREE_PER_TURN at most, whatever gives them); from
   * Empathy 7 a swell adds no Strain. */
  freeUsed?: number; swellFree?: boolean;
  /** Rules 1.8: the feelings this unit can pour in; the fight's free first Pump spent; this turn's pumps (Revert Pump). */
  feelings?: string[]; firstUsed?: boolean; pumps?: PumpRec[];
  brain: number; will: number; sigilMult: number; soulMult: number; elemMult: number; healMult: number;
  /** Rules 1.17: the Damage school's base for this heart (a character's; unset on an enemy: the enemy base). */ soulBase?: number;
  /** Rules 1.20: the level factor on what this caster heals and shields (a character's; unset on an enemy: ×1). */ mend?: number;
  /** Rules 1.26 (the re-fit): the Stat term of this caster's Sigil boons (MEND, WARD) and Soul shields (Inverse, Shell): the landed
   * profiles sigil_mend and soul_mend (a heal or a shield always lands, so it keeps a slope); unset (an enemy, a test's hand-made heart): the Sigil or Soul multiplier. */
  sigilBoon?: number; soulBoon?: number;
  /** Rules 1.26 (the re-fit): the level factor on what this caster deals (output.level.deal; a character's; unset on an enemy, whose level is in its tier: ×1). */ deal?: number;
  maxWords: number; glyphAp: number; coreSave: number; rangeBonus: number; durBonus: number;
  /** Begin's AP (2; the 1.2 'Soul cast AP' name). */ soulAp: number; costSave: number; soulRange: number; syphon: number; strainLimit: number;
  saves: Record<Fam, number>; /** Debuff strength by delivering skill (a PC's table; an enemy caster's tier number is under '*'). */ debuff: Record<string, number>;
  /** Items' changes to a word's charge (word_cost), by word. */
  wordCost?: Record<string, number>;
  /** Rules 1.10: the character's Mastered words (30 uses): their inflections are on in the spells this unit Evokes. */
  inflect?: string[];
}

/** One pump this turn, for Revert Pump (rules 1.8, item 808): the stage before, the AP paid, the free Pump it used, the
 * feeling poured in and the Strain it added. */
export interface PumpRec { design: string; stage0: number; ap: number; free: 'first' | 'empathy' | 'item' | null; feeling?: string; strain: number; felt0: number; /** the stages this pump added (Revert takes back only these, not a Feed's after it) */ added?: number; /** what an item added to the multiplier with this pump (Shape, rules 1.19) */ plus?: number; /** rules 1.24: the MP this pump took (Revert gives it back) */ mp?: number }
export const MANA_START = 15;
export const FLUX_MAX = 6;
export const CORE_CHARGE = 10;
/** rules 1.34: a Visualizer's core (figments.json visualizer.charge). */
export const VIS_CHARGE: number = (figmentsJ as any).visualizer?.charge ?? CORE_CHARGE;
export const SOUL_REACH = 4;
// THE CONDITION TABLE is data/conditions.json, read by condtable.ts (engine foundations 2): names, families, saves,
// durations and numbers. `rounds` counts the bearer's turn ends (a condition put on you during your own turn doesn't
// lose a round at that turn's end); noTick: it lasts until something ends it (99 rounds); boon: no save, no family;
// noSave: a state, or a condition from a hit.
/** The story conditions that come into a fight (and that a failed approach on the area map puts on the scene) in
 * their combat form. ONE list (review bug 11: game.ts and world.ts each kept one, and they differed). */
export const STORY_CARRY = new Set(['shaken', 'fear', 'ldebuff', 'rdebuff', 'left_brain_debuff', 'right_brain_debuff', 'weakened', 'nausea', 'injured', 'augment_offline', 'bleeding']);
export { condId, condMods, condDef, CONDITION_NAMES, CONDITION_ROWS, type CondDef, type CondMods } from './condtable';
/** A condition's own rounds (conditions data), for durations an item lengthens. */
export const condRoundsOf = (id: string): number | undefined => CONDS[condId(id)]?.rounds;
export const condName = (id: string) => CONDS[condId(id)]?.name || id;
export const condText = (id: string) => CONDS[condId(id)]?.text || '';
/** Is this a condition applyCond puts on (a unit state, Braced or Downed, is not: it has its own setter). */
export const isCondition = (id: string) => { const d = CONDS[condId(id)]; return !!d && d.engine !== 'state'; };
/** The save family of a debuff (a boon and a state have none). */
export const condFamily = (id: string): Fam | undefined => CONDS[condId(id)]?.fam;
/** familyOf: the same, under the plan's name. */
export const familyOf = condFamily;
export const isBoon = (id: string) => !!CONDS[condId(id)]?.boon;
/** Every condition id the engine runs (for the validator, the wiki and lanes). */
export const CONDITION_IDS = Object.keys(CONDS).filter((k) => CONDS[k].engine !== 'state');

// ---------- the meter ----------
export const manaBand = (m: number) => MANA_BANDS.find((b) => m >= b.min && m <= b.max) || MANA_BANDS[1];
export const manaOf = (cb: Combat) => (cb.mana ??= MANA_START);
export function shiftMana(cb: Combat, by: number, why?: string) {
  const was = manaOf(cb), now = Math.max(0, Math.min(40, was + by)); cb.mana = now;
  const a = manaBand(was).id, b = manaBand(now).id;
  if (a !== b) emitFx(cb, 'mana', { band: b, mana: now });
  if (a !== b) say(cb, 'The air turns ' + b.toUpperCase() + ' (mana ' + now + ')' + (why ? ': ' + why : '') + '.');
}
/** Deaths release bots (spec: the meter): +5 a person, +3 a beast, +2 a robot. Called once per turn; each death counts once. Rules
 * 1.9: the same sweep rolls each death's drops (loot.ts) on the fight's dice, so it happens exactly once per death; the
 * area map's throwaway fight rolls none (item 697). */
export function noteDeaths(cb: Combat, rng?: Rng) {
  for (const u of cb.units) if (u.stuck && (u.surrendered || u.dead || u.downed)) dropStuck(cb, u); // a thrown weapon falls where its target falls
  for (const u of cb.units) if (u.nailed && u.surrendered) dropNailed(cb, u); // rules 1.12: a unit that gave up (or was subdued, or lifted out) lets go of a weapon left in it
  const seen = new Set(cb.deadSeen || []);
  for (const u of cb.units) if (u.dead && !seen.has(u.id)) {
    seen.add(u.id); cb.deadSeen = [...seen];
    shiftMana(cb, deathMana(u), u.name + ' fell');
    dropNailed(cb, u); // rules 1.12: a weapon left in it falls where it fell
    if (rng && !cb.overworld) rollDeathDrops(cb, rng, u);
  }
  cb.deadSeen = [...seen];
}

// ---------- units ----------
export function magicOf(c: Character): MagicUnit | undefined {
  // A focus counts only in a hand (spec: Hands 2; item 630); one in the pack keeps its charge or MP for later.
  const words = [...new Set([...(c.sigils || []), ...itemWords(c)])], designs = c.outbursts || [], evoker = hasEvoker(c), emanator = hasEmanator(c);
  if (!words.length && !designs.length && !carriesEvoker(c) && !carriesEmanator(c) && !carriesVisualizer(c)) return undefined;
  return {
    words: [...words], designs: designs.map((d) => migrateDesign({ ...d, modules: [...(d.modules || [])] })), evoker, emanator, feelings: [...(c.feelings || [])],
    charge: evoChargeNow(c), cores: coresCarried(c), coresMade: 0, flux: 0, mp: mpNow(c), mpMax: maxMp(c), strain: 0, held: null, cast: false, freePumps: freePumps(c), freePumpsMax: freePumps(c), freeUsed: 0, swellFree: swellFree(c),
    brain: mod(c.skills.brain_power || 0), will: mod(c.skills.will_power || 0), sigilMult: sigilMult(c), soulMult: soulMult(c), sigilBoon: statOf('sigil_mend', c), soulBoon: statOf('soul_mend', c), soulBase: SOUL_DAMAGE, mend: mendFactor(c.level), deal: levelFactor('deal', c.level), elemMult: elementalMult(c), healMult: healingMult(c),
    maxWords: maxSigilWords(c), glyphAp: glyphAp(c), coreSave: sigilCoreSaving(c), rangeBonus: sigilRangeBonus(c), durBonus: sigilDurationBonus(c),
    soulAp: soulCastAp(c), costSave: soulCostSaving(c), soulRange: soulRangeBonus(c), syphon: syphonMult(c), strainLimit: strainLimit(c),
    saves: { body: saveBonus(c, 'body'), brain: saveBonus(c, 'brain'), heart: saveBonus(c, 'heart') },
    debuff: strengthTable(c),
    // rules 1.34: the Visualizer (Figments' focus): in hand, carried, its own core's charge; the door's points
    ...(carriesVisualizer(c) ? { visualizer: hasVisualizer(c), vcarry: true, vcharge: Math.max(0, Math.min(VIS_CHARGE, c.visCharge ?? VIS_CHARGE)), vchargeMax: VIS_CHARGE, vis: c.skills.visualization || 0 } : {}),
    ...(() => { const wc = wordCostMods(c); return Object.keys(wc).length ? { wordCost: wc } : {}; })(),
    ...(() => { const mw = masteredWords(c); return mw.length ? { inflect: mw } : {}; })(),
  };
}
/** Write a unit's magic back to its character (after a fight, or after an overworld action). */
export function magicToCharacter(c: Character, u: Unit) {
  const m = u.mg; if (!m) return;
  // What the focus stores goes home with it, held or carried (a focus put away mid-fight keeps its charge and MP).
  if (m.emanator || carriesEmanator(c)) c.mp = Math.max(0, Math.min(m.mpMax, Math.round(m.mp)));
  if (m.evoker || carriesEvoker(c)) c.evoCharge = m.charge;
  if (m.vcarry) c.visCharge = m.vcharge ?? VIS_CHARGE;
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
/** Saves (spec: Conditions and saves): a PC's d20 + mod(Guts | Rumination | Composure) + items, from the unit (u.sv,
 * fixed when the unit is built, so every PC has it, casters or not); enemies by tier (+0 / +1 / +2 / +3). Shaken is −2
 * on Heart saves. unitSave is the one collector (lanes add through 'cond_apply' saveAdd or stat 'save_<family>'). */
/** Is a condition a boon (Guarded, Inspired, Witnessed…)? (Unravel ends them; rules 1.6.) */
export const condIsBoon = isBoon;
export function unitSave(u: Unit, fam: Fam): number {
  const base = u.sv ? u.sv[fam] : u.mg ? u.mg.saves[fam] : tierSave(u.tier);
  return base + condSaveMod(u, fam) + (fam === 'brain' ? condSkillMod(u, 'rumination') : fam === 'heart' ? condSkillMod(u, 'composure') : 0) /* rules 1.13: the Brain save's skill is Rumination, so only the Left Brain Debuff lowers it */ + residueStand(liveCb(), u, 'save')
    + ((u as any).call?.saves?.n || 0); // Name It (a Call, rules 1.13): + on every save until the speaker's next turn
}
/** The save family of a condition (null: it has none). */
export const condFam = (id: string): Fam | null => (CONDS[condId(id)]?.fam as Fam) || null;
/** A fresh save against a condition already on a unit (Name It, step 2): against 12 + the strength of what delivered
 * it. Ends the condition on a success. Returns the line for the log, or '' when there was nothing to roll. */
export function freshSave(cb: Combat, rng: Rng, u: Unit, id: string): string {
  const fam = condFam(id); if (!fam || !condOn(u, id)) return '';
  const by = condSource(u, id), src = by ? cb.units.find((x) => x.id === by) || null : null, via = (u.condVia as any)?.[condId(id)] || 'raw_power';
  const sv = saveAgainst(cb, rng, src, u, fam, condId(id), { via }), ok = sv.ok; if (ok) endCond(u, id, cb);
  return u.name + (ok ? ' shakes off ' : ' can\'t shake off ') + (CONDS[condId(id)]?.name || id) + ' (' + sv.text + ')';
}
/** Conditions on skill rolls (spec): Left Brain Debuff −2 on Mind skills, Right Brain Debuff −2 on Expression and Soul
 * skills. Reaches every d20 that uses the skill (attacks, Sigil and Soul strikes, saves). */
export function condSkillMod(u: Unit, skill: string): number {
  const s = SKILL[skill]; if (!s || !u.conds) return 0;
  // the row's `skill_mod_tag` effects: one condition counts once, whichever of its tags the skill carries
  let n = 0;
  for (const id of Object.keys(u.conds)) { if (!(u.conds[id] > 0)) continue; const hit = CONDS[id]?.mods.skills?.find((m) => m.tag === 'core:' + s.core || m.tag === 'attr:' + s.attribute); if (hit) n += hit.value; }
  return n;
}
/** Debuff strength by source (rules 1.13, Skeleton 2.0): how hard a unit's condition is to save against is the
 * modifier of the skill that DELIVERED it (`via`), floor 0: a melee blow Raw Power, a shot or a throw Dexterity, traps
 * and poison Ingenuity, a Sigil Brain Power, an Outburst Will Power, songs and tending Empathy, a Blessing Faith, words
 * the gamma that spoke. A unit with no sheet (an enemy) reads its tier whatever the source. A PC with no source named
 * reads 0 (STRICT_VIA makes that loud in tests). */
export const STRICT_VIA = { on: false };
let VIA: { u: Unit | null; via: string; str?: number } | null = null;
/** Everything `by` applies inside `fn` is delivered by `via` (one subsystem call: an Evoke, a release, a prayer, a
 * technique). Keyed to the unit, so another unit's reaction inside the call doesn't inherit it. */
export function withVia<T>(by: Unit | null | undefined, via: string, fn: () => T, str?: number): T {
  const was = VIA, u = by || null;
  // A strength fixed earlier (a zone, residue, a stored spell: read when it was laid) carries into a nested call of the same source.
  VIA = { u, via, ...(str != null ? { str } : was && was.u === u && was.via === via && was.str != null ? { str: was.str } : {}) };
  try { return fn(); } finally { VIA = was; }
}
/** The source skill in force for a unit: the one named, else the ambient one. */
export const viaOf = (by: Unit | null | undefined, via?: string | null): string | undefined => via || (VIA && VIA.u === (by || null) ? VIA.via : undefined);
/** The strength a condition from `by` is saved against: a fixed one in force (a zone's, residue's), else the unit's by source. */
export const strengthFor = (by: Unit | null | undefined, via?: string | null): number => (!via && VIA && VIA.u === (by || null) && VIA.str != null ? VIA.str : unitStrength(by, via));
export function unitStrength(u: Unit | null | undefined, via?: string | null): number {
  if (!u) return 0;
  const tbl = u.dbf || u.mg?.debuff;
  if (!tbl) return tierStrength(u.tier);
  if ('*' in tbl) return tbl['*'];
  const v = viaOf(u, via);
  if (!v) { if (STRICT_VIA.on) throw new Error('A condition from ' + u.name + ' names no source skill.'); return 0; }
  return tbl[v] ?? 0;
}
const saveOf = unitSave;
/** What a unit's conditions do to its saves of a family (Shaken: Heart −2; the row's `stat_mod save_<family>`). */
export function condSaveMod(u: Unit, fam: Fam): number { let n = 0; for (const id of Object.keys(u.conds || {})) if (u.conds![id] > 0) n += CONDS[id]?.mods.save?.[fam] || 0; return n; }
/** The TN of a save against something `by` did: 12 (rolls.ts SAVE_TN) + the strength of the skill that delivered it
 * (`via`; `str`: a strength fixed when it was laid, a zone's or a residue's). */
export const saveTn = (by: Unit | null | undefined, via?: string | null, str?: number): number => SAVE_TN + (str ?? strengthFor(by, via));
/** THE USUAL SAVE: `target` saves with its family save against what `by` did, at saveTn(by, via). `id` is what is
 * saved against (a condition id, or a word: 'shoved', 'stop', 'hymn'). Returns the result (`ok`: it resists; `text`:
 * the sentence). o.tn replaces the TN outright (a hazard's own); o.tnAdd is harder (+) or easier (−); o.adv rolls two
 * dice. Every item that changes saves is asked (rolls.ts rollSave). */
export function saveAgainst(cb: Combat, rng: Rng, by: Unit | null, target: Unit, fam: Fam, id: string, o: { via?: string | null; str?: number; tn?: number; tnAdd?: number; adv?: boolean; fx?: boolean } = {}): RollResult {
  return rollSave(cb, rng, { by, target, fam, id, via: viaOf(by, o.via), tn: o.tn ?? saveTn(by, o.via, o.str), mod: unitSave(target, fam), ...(o.tnAdd ? { tnAdd: o.tnAdd } : {}), ...(o.adv ? { adv: true } : {}), ...(o.fx === false ? { fx: false } : {}) });
}
/** Does the unit have this condition now? */
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
  // the rows' `attack_mod` effects, by what each applies to (condtable.ts HitContext)
  for (const id of Object.keys(u.conds || {})) {
    if (!(u.conds![id] > 0)) continue; const h = CONDS[id]?.mods.hit; if (!h) continue;
    n += (h.own_attacks || 0) + (h.next_attack || 0); // SHARPEN and Hope are spent on the next attack
    if (h.not_vs_source && (!tgt || condSource(u, id) !== tgt.id)) n += h.not_vs_source;
    if (h.vs_source && tgt && condSource(u, id) === tgt.id) n += h.vs_source;
  }
  if (tgt && condOn(tgt, 'marked')) { const by = condSource(tgt, 'marked'), m = by && cb ? cb.units.find((x) => x.id === by) : null; if (!by || !cb || (m && m.side === u.side)) n += condMods('marked').hit?.marker_squad_vs_self || 0; }
  // Rules 1.8: residue underfoot (Joy +1, Shame −1, Contempt −2 to attacks; Belonging's +1 Defense on the target's tile).
  const lc = cb || liveCb();
  n += residueStand(lc, u, 'roll') + residueStand(lc, u, 'attack');
  if (tgt) n -= residueStand(lc, tgt, 'defense');
  return n;
}
/** The body-family debuffs a unit carries now (Shrug It Off, Iron Stomach…), and any family's. */
export const debuffsOf = (u: Unit, fam?: Fam) => [...Object.keys(u.conds || {}).filter((id) => condOn(u, id) && !isBoon(id) && (!fam || CONDS[id]?.fam === fam)),
  ...(!fam || fam === 'body' ? [...(u.bleed ? ['bleeding'] : []), ...(u.dazedNext ? ['dazed'] : []), ...(u.prone ? ['prone'] : [])] : [])];
export const bodyDebuffs = (u: Unit) => debuffsOf(u, 'body');

// ---------- conditions, shields, harm ----------
// THE CONDITION BLOCK (engine foundations 2). Everything that puts a condition on a unit, changes it or takes it off
// goes through the functions between here and condSourcesCheck:
//   applyCond(cb, rng, by, target, id, rounds?, fam?, opts)   put it on (items asked, the save, no stacking)
//   endCond(target, id, cb?)                                   take it off (its numbers undone)
//   setCondRounds / restoreConds / clearConds / condsAside     the few other writes there are
//   setProne(cb, u, on) / hide: tactics.ts                     what a unit does to ITSELF by choice
//   condTurnEnd (durations) / bleedTick, dazeSpent (turn start)   the clock
// No other file writes u.conds, u.bleed, u.dazedNext, u.prone or u.hidden (test/lint-conditions.test.ts).
export interface CondOpts { /** No save (a hit's rider, a perk that says so). */ skipSave?: boolean; tnAdd?: number; /** Commanded's order, a variant. */ arg?: string;
  /** The skill that delivered it (rules 1.13: its strength sets the TN). */ via?: string; /** A strength fixed earlier (residue, a zone, a stored spell): used as it is. */ str?: number;
  /** Hidden only: the same Hidden entry as before (no new ambush). */ sameEntry?: boolean;
  /** Called once the condition has taken hold, just before 'cond_landed' is told (a move logs its own line here, so
   * that what reacts to the landing (Shrug It Off) reads after it). Never stored. */ onLand?: () => void }
/** The second door of an immunity (the first is the 'cond_apply' hook): the `immune:<id>` query, and for Bleeding the
 * data's own word for it ('bleed'). Sets ca.cancel. Both doors are asked for every condition, whoever applies it. */
/** The condition took hold: the caller's onLand, then 'cond_landed' {by, t, id, rounds}. */
function landed(cb: Combat, opts: CondOpts, ctx: any) { opts.onLand?.(); emit(cb, 'cond_landed', ctx); }
function askImmune(ca: any, t: Unit, id: string, fam?: Fam) {
  if (ca.cancel) return;
  const im = immune({ u: t }, id, fam) || (id === 'bleeding' ? immune({ u: t }, 'bleed') : null);
  if (im) { ca.cancel = true; if (!ca.why && im !== 'perk') ca.why = im; }
}
/** Apply a condition: the target saves (d20 + its save) against 12 + the source's strength with the skill that delivered it (opts.via, or the call it runs inside: withVia; rules 1.13) (spec: Conditions
 * and saves). Boons (Guarded, Inspired…) and states need no save. No stacking: a second dose resets to the longer
 * duration. The source is kept (u.condBy) for Fear, Taunted, Grappled, Marked and kill credit. */
export function applyCond(cb: Combat, rng: Rng, by: Unit | null, t: Unit, id0: string, rounds?: number, fam?: Fam, opts: CondOpts = {}): string {
  const id = condId(id0), def = CONDS[id];
  if (!def || def.engine === 'state' || t.dead) return ''; // a unit state (Braced, Downed) has its own setter: unitstate.ts
  if (def.engine === 'flag') return flagCond(cb, rng, by, t, def, rounds, opts);
  // Items first: 'cond_apply' {by, t, id, fam, rounds, skipSave, cancel, why, tnAdd, saveAdd} (an immunity cancels it,
  // a perk may skip the save, change the rounds or the save's TN).
  const via = viaOf(by, opts.via);
  const ca: any = emit(cb, 'cond_apply', { by, t, id, fam: fam || def.fam, rounds: rounds || def.rounds, skipSave: !!opts.skipSave, cancel: false, why: '', tnAdd: opts.tnAdd || 0, saveAdd: 0, arg: opts.arg, via, cb, rng });
  askImmune(ca, t, id, ca.fam);
  if (ca.cancel) { emitFx(cb, 'cond', { target: t.id, at: t.pos, id, resisted: true }); return ' · ' + t.name + ' is untouched' + (ca.why ? ' (' + ca.why + ')' : ''); }
  const f: Fam = ca.fam || fam || def.fam || 'body';
  // The log shows every save, failed ones too (spec: Sigils 9, Afterwards: "every target, roll, save and number").
  let saved = '';
  // Defiance poured in: every save against the release is DEFY_PEN harder (rules 1.19; rules 1.8 had no save at all, NOSAVE_BY); Defiance's "your next save passes".
  if (NOSAVE_BY && by === NOSAVE_BY && t !== by) { if (DEFY_PEN > 0) ca.tnAdd = (ca.tnAdd || 0) + DEFY_PEN; else ca.skipSave = true; } // rules 1.19: 4 harder to resist (it was: no save)
  if (!def.boon && !def.noSave && !ca.skipSave) {
    // the one save (rolls.ts): 'cond_apply' was fired above, so its context is handed over (ca). Defiance's "your next save passes" is settled there.
    const sv = rollSave(cb, rng, { by, target: t, fam: f, id, via, tn: saveTn(by, opts.via, opts.str), mod: saveOf(t, f), ca });
    if (sv.ok) { emitFx(cb, 'cond', { target: t.id, at: t.pos, id, resisted: true }); if (sv.skipped) return ' · ' + t.name + ' ' + sv.text; emit(cb, 'cond_resisted', { by, t, id, cb }); return ' · ' + t.name + ' resists (' + sv.text + ')'; }
    saved = sv.skipped ? '' : sv.text;
  }
  if (id === 'marked' && t.hidden) { rawHidden(cb, t, false); delete t.hideEntry; (cb.sightWhy ||= {})[t.id] = 'reveal'; }
  const n = ca.rounds || rounds || def.rounds, had = condOn(t, id);
  emitFx(cb, 'cond', { target: t.id, at: t.pos, id, ...(FX_ELEMENT ? { element: FX_ELEMENT } : {}) });
  (t.condAt ||= {})[id] = (cb.condSeq = (cb.condSeq || 0) + 1); // CLEANSE ends the newest
  (t.conds ||= {})[id] = def.noTick && !rounds ? UNTIL : Math.max(had ? t.conds[id] || 0 : 0, n);
  if (by) (t.condBy ||= {})[id] = by.id; else if (t.condBy) delete t.condBy[id];
  if (via) (t.condVia ||= {})[id] = via; else if (t.condVia) delete t.condVia[id];
  if (ca.arg ?? opts.arg) (t.condArg ||= {})[id] = String(ca.arg ?? opts.arg);
  // Put on during the bearer's own turn: that turn's end doesn't count (rounds are the bearer's turn ends after this one).
  const onOwnTurn = cb.order?.[cb.turn] === t.id && !cb.window && !cb.overworld;
  if (onOwnTurn) { const fr = (t.condFresh ||= []); if (!fr.includes(id)) fr.push(id); }
  if (!had) {
    condNumbers(t, def, true);
    if (id === 'grappled' || id === 'stunned') { dropHeldShot(cb, t, id); }
  }
  landed(cb, opts, { by, t, id, rounds: n, cb, rng }); // 'cond_landed' {by, t, id, rounds}: after it takes hold
  const dur = def.noTick && !rounds ? '' : n + ' round' + (n === 1 ? '' : 's');
  return ' · ' + t.name + ' is ' + def.name + (dur || saved ? ' (' + [dur, saved].filter(Boolean).join('; ') + ')' : '');
}
/** The numbers a table condition puts on its bearer while it lasts (the row's Defense, Movement and vision; condtable.ts
 * CondMods), on and off. Every other number of a condition is read where it is used (condHit, condSaveMod, turnAp…). */
function condNumbers(u: Unit, def: CondDef, on: boolean) {
  const m = def.mods;
  if (m.moveMult != null) { if (on) { u.baseMove ??= u.movement; u.movement = u.baseMove * m.moveMult; } else if (u.baseMove != null) { u.movement = u.baseMove; delete u.baseMove; } }
  if (m.vision != null) { if (on) { u.baseVision ??= u.vision || 12; u.vision = m.vision; } else if (u.baseVision != null) { u.vision = u.baseVision; delete u.baseVision; } }
  if (m.defense) u.def += on ? m.defense : -m.defense;
}
/** Conditions the engine keeps as unit flags (conditions.json `engine: "flag"`): Dazed (−2 AP next turn), Prone,
 * Bleeding (3 rounds; a hit's rider, no save), Hidden (tactics.ts hide is the unit's own action), Injured (the injury
 * table: combat.ts rollInjury). The same door as every condition: 'cond_apply', both immunity doors, the save,
 * 'cond_landed'. */
function flagCond(cb: Combat, rng: Rng, by: Unit | null, t: Unit, def: CondDef, rounds: number | undefined, opts: CondOpts): string {
  const id = def.key, fam: Fam = def.fam || 'body';
  const via = viaOf(by, opts.via);
  const ca: any = emit(cb, 'cond_apply', { by, t, id, fam, rounds: rounds || (def.noTick ? 1 : def.rounds), skipSave: !!def.noSave || !!opts.skipSave, cancel: false, why: '', tnAdd: opts.tnAdd || 0, saveAdd: 0, via, cb, rng });
  askImmune(ca, t, id, def.fam);
  if (ca.cancel) return ' · ' + t.name + ' is untouched' + (ca.why ? ' (' + ca.why + ')' : '');
  let saved = '';
  if (!ca.skipSave) { const sv = rollSave(cb, rng, { by, target: t, fam, id, via, tn: saveTn(by, opts.via, opts.str), mod: saveOf(t, fam), ca });
    if (sv.ok) return ' · ' + t.name + (sv.skipped ? ' ' + sv.text : ' resists (' + sv.text + ')');
    saved = sv.skipped ? '' : ' (' + sv.text + ')'; }
  if (id === 'dazed' || id === 'prone' || id === 'bleeding') (t.condAt ||= {})[id] = (cb.condSeq = (cb.condSeq || 0) + 1);
  if (id === 'dazed') { rawDazed(t, 1); landed(cb, opts, { by, t, id, rounds: 1, cb, rng }); return ' · ' + t.name + ' is Dazed' + saved; }
  if (id === 'prone') { rawProne(t, true); landed(cb, opts, { by, t, id, rounds: 0, cb, rng }); return ' · ' + t.name + ' is knocked prone' + saved; }
  if (id === 'bleeding') { rawBleed(t, Math.max(t.bleed || 0, ca.rounds || def.rounds)); if (by) t.lastHitBy = by.id; landed(cb, opts, { by, t, id, rounds: t.bleed, cb, rng }); return ' · ' + t.name + ' is Bleeding'; }
  if (id === 'hidden') { if (condOn(t, 'marked')) return ' · ' + t.name + ' is Marked and can\'t hide'; if (t.hidden) return ''; rawHidden(cb, t, true, { entry: !opts.sameEntry }); (cb.sightWhy ||= {})[t.id] = 'hide'; landed(cb, opts, { by, t, id, rounds: 0, cb, rng }); return ' · ' + t.name + ' is Hidden'; }
  if (id === 'injured') { const inj = rollInjury(rng, t, cb, by); landed(cb, opts, { by, t, id, rounds: 0, cb, rng }); return inj; }
  return '';
}
/** Prone by the unit's own choice (it drops, it kneels on an order, it stands): no item is asked and nobody saves.
 * Knocking someone Prone is applyCond(…, 'prone'), and it ends Braced. Dropping Prone by choice keeps a weapon's Brace
 * (spec, Brace: "while braced (or prone)"; the old toggleProne); kneeling on an order and going down with a thrown body
 * end it (`endBrace: true`, as their old code did). */
export function setProne(cb: Combat | null, u: Unit, on: boolean, o: { endBrace?: boolean } = {}) {
  rawProne(u, on, !!o.endBrace);
  if (on && cb) (u.condAt ||= {}).prone = (cb.condSeq = (cb.condSeq || 0) + 1); else if (!on && u.condAt) delete u.condAt.prone;
}
/** End a condition now (its effects undone). 'cond_end' {u, id} when a fight is given. */
export function endCond(u: Unit, id: string, cb?: Combat | null) {
  id = condId(id);
  const def = CONDS[id];
  if (def?.engine === 'flag') {
    if (id === 'hidden') { if (u.hidden && cb) (cb.sightWhy ||= {})[u.id] = 'reveal'; rawHidden(cb, u, false); }
    else if (id === 'prone') rawProne(u, false);
    else if (id === 'bleeding') rawBleed(u, 0);
    else if (id === 'dazed') rawDazed(u, 0);
    if (u.condAt) delete u.condAt[id];
    return;
  }
  if (!u.conds || !(id in u.conds)) return;
  endCondRaw(u, id); if (cb) emit(cb, 'cond_end', { u, id, cb });
}
function endCondRaw(u: Unit, id: string) {
  if (CONDS[id]) condNumbers(u, CONDS[id], false);
  delete u.conds![id];
  if (u.condAt) delete u.condAt[id];
  if (u.condBy) delete u.condBy[id];
  if (u.condVia) delete u.condVia[id];
  if (u.condArg) delete u.condArg[id];
  if (u.condFresh) u.condFresh = u.condFresh.filter((x) => x !== id);
}
/** Change the rounds left of a condition a unit already has (an item halves it, lengthens it, lets it smoulder).
 * `fresh`: it was changed during the bearer's own turn, so that turn's end doesn't count. Nothing if it isn't on. */
export function setCondRounds(u: Unit, id0: string, rounds: number, o: { fresh?: boolean; cb?: Combat | null; /** null: drop the variant it carried */ arg?: string | null } = {}) {
  const id = condId(id0); if (!u.conds || !(id in u.conds)) return;
  if (rounds <= 0) { endCond(u, id, o.cb); return; }
  u.conds[id] = rounds;
  if (o.arg === null) { if (u.condArg) delete u.condArg[id]; } else if (o.arg != null) (u.condArg ||= {})[id] = o.arg;
  if (o.fresh) { const fr = (u.condFresh ||= []); if (!fr.includes(id)) fr.push(id); }
}
/** A condition is no longer "put on this turn" (its next turn end counts): an item that makes this turn count. */
export function condNotFresh(u: Unit, id0: string) { const id = condId(id0); if (u.condFresh) { u.condFresh = u.condFresh.filter((x) => x !== id); if (!u.condFresh.length) delete u.condFresh; } }
/** Put back conditions a unit carried before (a fight that picks the story's magic state up again): no save, no hook,
 * the longer of what it has and what it carried, and each condition's numbers applied once. */
export function restoreConds(u: Unit, conds: Record<string, number>, by?: Record<string, string>, via?: Record<string, string>, arg?: Record<string, string>) {
  for (const [k, n] of Object.entries(conds || {})) {
    const id = condId(k), def = CONDS[id]; if (!def || def.engine !== 'table' || !(n > 0)) continue;
    const had = condOn(u, id);
    (u.conds ||= {})[id] = Math.max(had ? u.conds[id] : 0, n);
    if (!had) condNumbers(u, def, true);
    if (by?.[k]) (u.condBy ||= {})[id] = by[k]; if (via?.[k]) (u.condVia ||= {})[id] = via[k]; if (arg?.[k]) (u.condArg ||= {})[id] = arg[k];
  }
}
/** Every condition off a unit, each one's numbers undone (it is lifted out of the fight and put back whole). */
export function clearConds(u: Unit, cb?: Combat | null) {
  for (const id of Object.keys(u.conds || {})) endCondRaw(u, id);
  u.conds = {}; for (const id of FLAG_CONDS) if (id !== 'injured') endCond(u, id, cb);
}
/** Set some conditions aside for a moment (the unit is read as if it did not have them: a draw ends Disarmed).
 * Returns the function that puts them back exactly as they were. Nothing is ended and no item is told. */
export function condsAside(u: Unit, ids: string[]): () => void {
  const kept: Record<string, number> = {};
  for (const id0 of ids) { const id = condId(id0); if (u.conds && u.conds[id] != null) { kept[id] = u.conds[id]; delete u.conds[id]; } }
  return () => { for (const [id, n] of Object.entries(kept)) (u.conds ||= {})[id] = n; };
}
/** Slip out of sight again on the same Hidden entry (no new ambush): Shadow Step, Silent Kill, smoke. The items are
 * asked as for any condition, and a Marked unit can't. Returns whether the unit is Hidden now. */
export function hideAgain(cb: Combat, rng: Rng, u: Unit, by: Unit | null = null): boolean { applyCond(cb, rng, by, u, 'hidden', undefined, undefined, { sameEntry: true }); return !!u.hidden; }
/** THE CLOCK, turn start (combat.ts beginTurn): Dazed has cost its AP and is spent. */
export function dazeSpent(u: Unit) { rawDazed(u, 0); if (u.condAt) delete u.condAt.dazed; }
/** THE CLOCK, turn start: Bleeding bites (the tick is the row's amount) and loses a round; its rounds are its bites.
 * Kill credit to whoever opened the wound. Returns true when the bearer went down from it. */
export function bleedTick(cb: Combat, u: Unit): boolean {
  if (!u.bleed || u.dead || u.downed) return false;
  rawBleed(u, u.bleed - 1);
  const by = u.lastHitBy ? cb.units.find((x) => x.id === u.lastHitBy) || null : null; // kill credit: whoever opened the wound
  const r = applyDamage(cb, u, Math.floor(itemAmount('condition:bleeding', 'tick', [term(flatLevelOf(by, cb), 'level')])), { type: 'bleed', by, shield: false, credit: 'hp' });
  emitFx(cb, 'hurt', { target: u.id, at: u.pos, dmg: r.dealt, why: 'bleed', killed: u.hp === 0 }); if (u.hp === 0) fxFell(cb, u);
  say(cb, u.name + ' bleeds: ' + r.dealt + ' damage' + (u.hp === 0 ? (u.side === 'foe' ? ' · down for good' : ' · Downed') : ''));
  if (u.hp === 0) { rawBleed(u, 0); return true; }
  if (!u.bleed && u.condAt) delete u.condAt.bleeding;
  return false;
}
/** THE CLOCK, turn end (spec: Conditions tick at the end of the bearer's turn, rules 1.3): every timed condition
 * loses a round, except one put on during this same turn; at 0 it ends. Grappled ends if the grappler is gone or no
 * longer adjacent; Taunted when the taunter is down. */
export function condTurnEnd(cb: Combat, u: Unit, rng?: Rng | null) {
  if (u.dead) return;
  // MASK (rules 1.4): Hidden for 2 of the bearer's turn ends, or until it attacks (then it is no longer Hidden).
  if (u.maskLeft) { if (!u.hidden) delete u.maskLeft; else if (u.maskFresh) u.maskFresh = false; else if (--u.maskLeft <= 0) { delete u.maskLeft; rawHidden(cb, u, false); (cb.sightWhy ||= {})[u.id] = 'reveal'; emitFx(cb, 'mask', { target: u.id, at: u.pos, fade: true }); say(cb, u.name + "'s MASK fades: no longer Hidden."); } }
  if (!u.conds) return;
  const fresh = new Set(u.condFresh || []); u.condFresh = [];
  // Corroded (rules 1.4): a Body save at the end of each of the bearer's turns ends it early (against 12 + the strength of the
  // skill that delivered it, kept in condVia). Not on the turn it landed.
  if (condOn(u, 'corroded') && !fresh.has('corroded') && rng) {
    const by = condSource(u, 'corroded'), src = by ? cb.units.find((x) => x.id === by) || null : null, sv = saveAgainst(cb, rng, src, u, 'body', 'corroded', { via: u.condVia?.corroded || 'brain_power' });
    if (sv.ok) { endCond(u, 'corroded', cb); say(cb, u.name + ' scrubs off the acid (' + sv.text + ').'); }
  }
  for (const id of Object.keys(u.conds)) {
    const def = CONDS[id]; if (!def) continue;
    if (def.noTick && u.conds[id] >= UNTIL) continue;
    if (fresh.has(id)) continue;
    u.conds[id]--;
    if (u.conds[id] <= 0) { endCond(u, id, cb); say(cb, u.name + ' is no longer ' + condName(id) + '.'); }
  }
}
/** Conditions whose source is gone end (Grappled when the grappler is down or not adjacent; Taunted, Fear, Commanded and Puppeted
 * when the source is dead). Called before a unit acts. */
export function condSourcesCheck(cb: Combat, u: Unit) {
  for (const id of ['grappled', 'taunted', 'fear', 'commanded', 'puppeted']) {
    if (!condOn(u, id)) continue;
    const by = condSource(u, id), s = by ? cb.units.find((x) => x.id === by) : null;
    const gone = !!by && (!s || s.dead || (id !== 'fear' && s.downed) || (id === 'grappled' && Math.max(...s.pos.split(',').map((v, i) => Math.abs(+v - +u.pos.split(',')[i]))) > 1));
    if (gone) { endCond(u, id, cb); say(cb, u.name + ' is no longer ' + condName(id) + '.'); }
  }
}
/** Damage from magic (or a wall zone): the shield first, then armour (Sigil damage takes full armour, Elemental half,
 * Soul none; armour overrides it: a Stone Outburst counts it in full), then HP, Downed or dead, kill credit. */
/** Why the next harm() hurts, for the effects layer only (burn, short, overload, wall); reset after each call. */
let hurtWhy = '';
const harmFor = (why: string, f: () => string) => { hurtWhy = why; try { return f(); } finally { hurtWhy = ''; } };
/** Run f as the strain burn / short (exported for class moves that hurt the heart). */
export { harmFor };
/** A spell's amount handed to harm with its terms open (step a7, leak 3): the base and the caster's own multipliers
 * (Stat, the Line, the stage, the critical…), so that what an item ADDS on 'damage_out' goes in beside the base and is
 * multiplied by all of them, as a weapon's always was. `plus`: a rider's flat amount on the same hit (a tone's bonus
 * damage: after the multipliers). `round`: how it is made whole ('round': a Sigil part; default: floored). */
export interface SpellAmount { base: number; mults: Term[]; plus?: number; round?: 'floor' | 'round' }
export function harm(cb: Combat, rng: Rng, att: Unit | null, t: Unit, raw: number | SpellAmount, type: 'sigil' | 'elemental' | 'soul' | 'true' | 'physical', dmgType?: string, armour?: 'none' | 'half' | 'full'): string {
  if (t.dead) return '';
  const am: SpellAmount = typeof raw === 'number' ? { base: Math.floor(raw), mults: [] } : raw;
  let dmg = 0, out = '';
  // The one way in (effects/output.ts deal). A Line, an Outburst and a prayer hand their amount in with its terms open
  // (SpellAmount); a finished number (a flat source: a tick, a class move's own number) is its own base.
  // 'damage_out' for spells (hooks gap A4/F3): the same hook attacks use, before armour, so "+X% against this target"
  // and the caster's own multipliers reach Sigil, Elemental and Soul damage. ctx.spell is true and ctx.mode 'spell';
  // weapon-only handlers check ctx.src.type === 'weapon'. Hazards (burn, short, overload, wall) and blows with no
  // attacker skip it. Armour by the damage's type (Sigil and physical full, Elemental half, Soul and true none)
  // unless the caller says otherwise; then the sink.
  const ak = armour || (type === 'sigil' || type === 'physical' ? 'full' : type === 'elemental' ? 'half' : 'none');
  const r = deal(cb, att, t, { kind: 'damage', base: am.base, ...(am.plus ? { plus: am.plus } : {}), ...(am.round ? { round: am.round } : {}), armour: ak, hook: !!att && !hurtWhy }, {
    mults: am.mults, hookCtx: { mode: 'spell', spell: true, src: { by: att, type, dmgType: dmgType || type, spell: true, ...(SPELL_FROM ? { from: SPELL_FROM } : {}) } },
    src: { by: att, type: hurtWhy || type, dmgType: dmgType || (type === 'true' ? 'true' : type), shield: true, credit: 'hp', ...(SPELL && att ? { spellMp: SPELL.mp, spellWords: SPELL.words } : {}), ...(SPELL_FROM ? { from: SPELL_FROM } : {}), ...(NONLETHAL_BY && att === NONLETHAL_BY ? { nonlethal: true } : {}) } as any });
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
  // (step a5: the one heal path, effects/output.ts mend; the air's band is the heal's own named multiplier)
  const r = mend(cb || null, by, t, { kind: 'heal', base: n, round: 'none' }, { mults: [term(cb ? manaBand(manaOf(cb)).healing_given_mult ?? 1 : 1, 'the air')], healKind: kind });
  if (r.revived) { if (cb) emitFx(cb, 'heal', { target: t.id, at: t.pos, amount: t.hp, revive: true }); return ' · ' + t.name + ' is back up at ' + t.hp + ' HP'; }
  if (cb) emitFx(cb, 'heal', { target: t.id, at: t.pos, amount: r.restored }); return ' · ' + t.name + ' heals ' + r.restored;
}
/** Magic forced movement (GALE, PULL, Control push and pull): knockback immunity and the 'forced_move' hook
 * {u, by, tiles, how: 'magic', cancel} can stop it (hooks gap A3). */
export function magicShove(cb: Combat, t: Unit, from: string, n: number, by: Unit | null = null, rng?: Rng | null): string {
  if (t.dead || n === 0) return '';
  // the one forced move (combat.ts displace): Nailed, the knockback immunity and the 'forced_move' hook (which may change the distance: Heart Surge doubles it) are asked there
  const mv = displace(cb, rng, t, n > 0 ? { away: from, tiles: n } : { toward: from, tiles: -n }, { by, how: n > 0 ? 'push' : 'pull', source: 'magic', fx: { magic: true } });
  if (mv.stoppedBy === 'immune' || mv.stoppedBy === 'held' || mv.stoppedBy === 'nailed') return ' · ' + t.name + ' holds its ground' + (mv.why ? ' (' + mv.why + ')' : '');
  return mv.moved ? ' · ' + t.name + (n > 0 ? ' is thrown' : ' is dragged') + ' to ' + refOf(t.pos) + mv.text : '';
}

// ---------- turns ----------
/** Start of a unit's turn: Burning burns, the heart's turn start (rules 1.5: Strain −1, a held Outburst swells and
 * strains, an elemental one leaks onto adjacent enemies), fields bite whoever starts inside. */
export function magicTurnStart(cb: Combat, rng: Rng, u: Unit) {
  if (u.dead) return;
  noteDeaths(cb, rng);
  // Burning burns at the start of each turn (spec: 10, until put out; it ignores armour). Timed conditions tick at the
  // end of the bearer's turn (condTurnEnd, rules 1.3).
  if (condOn(u, 'burning') && !u.downed) { const by = condSource(u, 'burning'); say(cb, u.name + ' burns' + harmFor('burn', () => harm(cb, rng, by ? cb.units.find((x) => x.id === by) || null : null, u, Math.floor(itemAmount('condition:burning', 'tick', [term(flatLevelOf(by ? cb.units.find((x) => x.id === by) || null : null, cb), 'level')])), 'true', 'fire'))); }
  if (u.mg && !u.downed) heartTurnStart(cb, rng, u); // rules 1.5: Strain −1, the swell, the aura, free Pumps
  feelTurnStart(cb, rng, u); // rules 1.8: residue underfoot, fuses, Linger
  sigilTurnStart(cb, rng, u); // Quickened, Corroded, fields and traps underfoot, the unit's turrets (rules 1.4)
}
/** Once per round: glyphs, fields, traps, turrets, smoke and RAISE walls run down (sigil.ts). */
export function magicRoundTick(cb: Combat) { sigilRoundTick(cb); }
/** Moving onto a tile: fields bite and traps go off (sigil.ts sigilEnter). */
export function zoneEnter(cb: Combat, rng: Rng, u: Unit, k: string): boolean { const stop = sigilEnter(cb, rng, u, k); if (!u.dead && u.pos === k) feelEnter(cb, rng, u, k); return stop || u.pos !== k; }
// A STEP landing (sigil.ts) enters its tile the same way a walk does, residue included.
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
  enemyCast, enemyAvoidMagic, enemyMagic, evokeTargets, evokeMarks, enemyDefaultWords, ENEMY_MAX_WORDS, newestCondition, cleanseList, turretAim, MAX_GLYPHS, SIGIL_REV,
  STARTING_DEFAULT, SIGIL_GRAMMAR, SIGIL_ELEMENTS, type Pattern, type Spell, type EvokePreview, type EvokeOpts, type MissilePlan, type Affected, type Facing, type DrawPreview,
  evokeGrowth, strokeRuns, strokeOf, strokeOfGlyph, strokesOfGlyph, strokesAt, strokePick, strokeCandidates, tidyStrokes, fadePattern, glyphDrawer, junctionsFor, JUNCTION, type Stroke, type StrokeOption,
  lineMult, LINE_MULT, lineMultFor, spellCritMult, spellGapToHit, lineGuards, capParts, SIGIL_CAP, SIGIL_CAP_CRIT,
} from './sigil';
import { previewEvoke as previewEvokeS, scuff as scuffS, sigilTurnStart, sigilRoundTick, sigilEnter, dir8, tidyStrokes as tidyStrokesS, spellCritMult, spellGapToHit } from './sigil';
import { work } from './kit';
/** The element of the spell resolving now, carried on its damage, miss and condition fx events (the FX layer reads it). */
let FX_ELEMENT: string | null = null;
/** Where a Sigil spell's damage comes from (the missile's origin: a Line glyph, SEEK's far glyph, a chain's last target,
 * a turret's tile; SENSE and fields: the target's own tile), carried on the damage source as src.from so items that
 * read the line of fire (Stonewall) trace it from there, not from the caster (item 488). */
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
  return ' OVERLOAD: the Evoker bursts' + harmFor('overload', () => harm(cb, rng, null, u, itemAmount('rule:flux_overload', 'damage', [], { flux_over: over }), 'true')) + ', locked until next round';
}
/** Vent's and a core swap's AP (1 and 2), through the items (stat 'ap_cost:vent' / 'ap_cost:swap_core': the Mage's
 * Bleed the Flux and Core Change, Class Roster Rev 3). The UI and the enemy planner read these. */
export const ventAp = (u: Unit, cb?: Combat | null) => price({ cb, u }, 'vent').ap;
export const coreAp = (u: Unit, cb?: Combat | null) => price({ cb, u }, 'swap_core').ap;
/** Vent (1 AP): all the Flux goes into the air. 'vent' {u, flux, extra} (extra mutable: more goes into the air with it,
 * Bleed the Flux) after the Flux is gone. */
export function vent(cb: Combat, u: Unit): string | null {
  const m = u.mg; if (!m || !m.evoker) return NEEDS_EVOKER;
  const ap = ventAp(u, cb);
  { const no = whyNot(cb, u, ap); if (no) return no; } if (!m.flux) return 'No Flux to vent.';
  pay(cb, u, ap); const n = m.flux; m.flux = 0;
  const vc: any = emit(cb, 'vent', { u, flux: n, extra: 0, cb });
  const all = n + Math.max(0, vc.extra || 0);
  emitFx(cb, 'vent', { unit: u.id, at: u.pos, flux: all }); say(cb, u.name + ' vents ' + n + ' Flux into the air' + (all > n ? ' (' + (all - n) + ' more with it)' : '') + (ap !== SPELL_AP.vent ? ' (' + ap + ' AP)' : '') + '.'); shiftMana(cb, all, 'vented Flux');
  return null;
}
export function swapCore(cb: Combat, u: Unit): string | null {
  const m = u.mg; if (!m || !m.evoker) return NEEDS_EVOKER;
  const ap = coreAp(u, cb);
  { const no = whyNot(cb, u, ap); if (no) return no; } if (m.cores < 1) return 'No spare cores.';
  // focus: which Evoker throws out the spent core (an Evoker blade, a grand staff, else the off-hand Evoker), for the picture
  const focus = [u.weapon, u.offWeapon].find((id) => id && ((WEAPON as any)[id]?.properties || []).includes('counts_as_evoker')) || 'evoker';
  pay(cb, u, ap); m.cores--; m.charge = CORE_CHARGE; emitFx(cb, 'core', { unit: u.id, at: u.pos, dur: 1000, focus }); say(cb, u.name + ' loads a fresh core into the Evoker (' + CORE_CHARGE + ' charge).');
  return null;
}
/** Enemies scuff a glyph of the other side they stand on (spec: Sigils, Drawing 7). */
export function enemyScuff(cb: Combat, u: Unit): boolean {
  if (!canPay(cb, u, SPELL_AP.scuff) || !(cb.glyphs || []).some((g) => g.pos === u.pos && g.side !== u.side && !(g as any).keystone)) return false;
  return !scuffS(cb, u);
}
/** The spell being cast now, for the damage it deals (Drink It In gains the real MP cost or 10 per Sigil word). */
let SPELL: { mp?: number; words?: number } | null = null;

/** Rules 1.8 release state: whose release is harder to save against (Defiance: rules 1.19), whose damage Downs instead of killing (Mercy). */
let NOSAVE_BY: Unit | null = null, NONLETHAL_BY: Unit | null = null;
/** Rules 1.19, Defiance: what its Release adds to every save's TN (0: the old rule, no save at all). */
const DEFY_PEN: number = Number((FEELING.defiance?.pour as any)?.save_penalty || 0);
/** Rules 1.8: the release in flight's sure hit (Calm) and cover ignored (Calm, Ricochet's bank shot). */
let REL: { calm: boolean; ignoreCover: boolean; /** rules 1.19: the lowest roll that is a critical (Joy: 18) */ critFrom?: number; /** the stage the schools read */ stage?: number;
  /** the same school and way twice (shelved): the first copy's rounds, half again */ deepen?: boolean; /** Control's Swap: done once a Release */ swapped?: boolean } | null = null;
/** The live fight (for residue under a unit when a rule is asked without one: saves). */
const liveCb = (): Combat | null => boundGame()?.combat || null;
const canCast = (u: Unit, cb: Combat): string | null => (void cb, u.dead || u.downed ? 'Downed.' : condOn(u, 'silenced') ? 'Silenced: no magic this round.' : null);
// ---------- Outbursts (rules 1.5: Outburst 2.0, the heart) ----------
// Begin (2 AP, Swift 1) opens a ready design at stage 0 (+1 Strain); Pump (1 AP; Empathy gives free ones each round)
// adds a stage up to 4; Release (1 AP) fires it at the stage reached. Held past your turn it swells (+1 stage, +1 Strain)
// at your next turn start. Over the Strain limit the heart burns (8 true a point at your turn end); 3 over is an
// automatic Mana Short. Strain falls by 1 at every turn start and through the five calming ways. Every number is
// provisional (spec 14, items 492 on). Data: soul_modules.json (cycle, strain, tones, forms, retired).
const SR: any = SOUL_RULES;
const CYC = SR.cycle || {};
/** The stage multipliers (rules 1.19): stage 0 ×0.8, then +0.2 a stage: ×1.0, ×1.2, ×1.4, ×1.6 (rules 1.17: +0.4 a stage). */
export const STAGE_MULT: number[] = CYC.stage_mult || [0.8, 1.0, 1.2, 1.4, 1.6];
export const MAX_STAGE: number = CYC.max_stage ?? 4;
export const stageMult = (stage: number) => STAGE_MULT[Math.max(0, Math.min(MAX_STAGE, Math.round(stage)))] ?? 1;
export const SOUL_AP = { begin: CYC.begin_ap ?? 2, swiftBegin: CYC.swift_begin_ap ?? 1, pump: CYC.pump_ap ?? 1, release: CYC.release_ap ?? 1, steady: CYC.steady_ap ?? 1, feed: CYC.feed_ap ?? 1 };
/** Magic's verbs before items (data/actions.json `costs`; the heart's are SOUL_AP's, from the Outburst cycle's data). */
export const SPELL_AP = { evoke: costOf('evoke'), scuff: costOf('scuff'), vent: costOf('vent'), core: costOf('swap_core'), begin: SOUL_AP.begin, pump: SOUL_AP.pump, release: SOUL_AP.release, steady: SOUL_AP.steady, feed: SOUL_AP.feed, syphon: costOf('syphon'), crystallise: costOf('crystallise') };
export const STRAIN_BURN: number = SR.strain?.burn_per_point ?? 8;
export const SHORT_AT_OVER: number = SR.strain?.short_at_over ?? 3;
export const AURA_TICK: number = SR.aura?.tick_damage ?? 5;
export const RESONANCE_BONUS: number = SR.resonance?.bonus ?? 0.2;
/** Resonance's ceiling per release (Leon 8 Nov 2026): +0.4 in total, however many allies released before you. */
export const RESONANCE_MAX: number = SR.resonance?.max_bonus ?? 0.4;
export const SECOND_SCHOOL = { fromWill: SR.second_school?.from_will_power ?? 5, strength: SR.second_school?.strength ?? 0.5, cost: SR.second_school?.cost ?? 10 };
/** The Damage school's base (rules 1.19: a character's 40, an enemy caster's 24; rules 1.17 had 28 and 18), so that with the new
 * stage table its Outbursts deal what the enemy table was fitted with. A unit's heart carries its own (`soulBase`). */
export const SOUL_DAMAGE: number = SR.damage?.base ?? SCHOOL.damage?.damage ?? 40; // the fallback is rules 1.19's base (it said the rules 1.5 20)
export const SOUL_DAMAGE_ENEMY: number = SR.damage?.enemy_base ?? SOUL_DAMAGE;
/** Rules 1.19: a character takes one free stage a turn at most (the fight's first Pump, Empathy's, Shape's, a fed
 * feeling, Heart Overload II's stage 1), whatever gives it. Enemy casters keep their own free Pumps (the enemy table
 * was fitted with them). Overdraw's second stage is not free: it has its own price. */
export const FREE_PER_TURN: number = CYC.free_pumps_per_turn ?? 1;
const capped = (u?: Unit | null) => !!u?.charId && !u.companion;
/** Is this turn's free stage still there for this unit? (Always, for a unit the cap doesn't bind.) */
export const freeStageLeft = (u: Unit): boolean => !capped(u) || (u.mg?.freeUsed || 0) < FREE_PER_TURN;
/** Take this turn's free stage (an item that gives one calls this); false when it is gone. */
export function takeFreeStage(u: Unit): boolean { if (!freeStageLeft(u)) return false; if (u.mg && capped(u)) u.mg.freeUsed = (u.mg.freeUsed || 0) + 1; return true; }
/** The stage riders of Control, Status and the Buff boons (rules 1.19; soul_modules.json stage_riders). */
const SRD: any = SR.stage_riders || {};
export const stageSaveTn = (stage: number) => Math.floor(Math.max(0, stage) / 2) * (SRD.save_tn_per_2_stages ?? 0);
export const stageRounds = (stage: number) => (SRD.extra_round_at != null && stage >= SRD.extra_round_at ? 1 : 0);
export const stageTiles = (stage: number) => ((SRD.extra_tile_at as number[]) || []).filter((s) => stage >= s).length;
export const stageBoonRounds = (stage: number) => ((SRD.boon_round_at as number[]) || []).filter((s) => stage >= s).length;
/** The Damage school's ways to strike (rules 1.19; soul_modules.json damage.modes): the multiplier on one target. */
const DMODE: any = SR.damage?.modes || {};
export function damageModeMult(option: string | undefined, t?: Unit | null): number {
  const md = option ? DMODE[option] : null; if (!md) return 1;
  if (md.mult_low != null && t && t.maxHp > 0 && t.hp <= t.maxHp * (md.low_hp ?? 0.5)) return md.mult_low;
  return md.mult ?? 1;
}
/** A Pump's AP before free Pumps and items: 1. Two prices measured for rules 1.19 and not adopted are kept as data
 * switches, both off (cycle.feeling_pump_ap_extra: a feeling Pump costs more; cycle.pump_ap_after_second: every paid
 * Pump after the second in a turn costs this). */
export function pumpBaseAp(m: MagicUnit | undefined, feeling?: string | null, paidBefore?: number): number {
  const paid = paidBefore ?? (m?.pumps || []).filter((r) => r.ap > 0).length;
  return (CYC.pump_ap_after_second != null && paid >= 2 ? Number(CYC.pump_ap_after_second) : SOUL_AP.pump) + (feeling ? Number(CYC.feeling_pump_ap_extra || 0) : 0);
}
/** Rules 1.24 (items 1342 to 1347; PROVISIONAL): a Pump costs MP as well as AP: a tenth of what the Begin cost, for
 * each stage it reaches (`cycle.pump_mp.share_per_stage`: 10%, 20%, 30%, 40%; a full heart from stage 0 costs the
 * Begin's price again). It reads the price the Begin really paid (the hold's `cost`), so the air's band, Insight, a
 * Right Brain Debuff and every item that changes a design's price (Beloved, Fed, Storm Front, a Seal) are in it already,
 * and a Begin that cost no MP (The Twin Pays, Heart Overload paid in blood) pumps for none. 1 MP at least when the Begin
 * cost any. Whatever pays the Pump's AP (1 AP, the turn's free Pump, Shape, a fed feeling), the MP is owed. Only a
 * character's own heart with an Emanator in a hand pays it: a heart that draws on the air (no Emanator in hand: the
 * Begin's +2 Strain is its price), a companion's (the Twin) and an enemy caster's Pump as before. Stages that are not
 * Pumps (the swell, a fed glyph, Heart Overload II's stage, Heart Surge) cost no MP. A Pump's MP does not move the meter. */
const PUMP_MP: any = CYC.pump_mp || {};
export const PUMP_MP_SHARE: number = Number(PUMP_MP.share_per_stage ?? 0.1);
/** Does this unit's heart pay MP for a Pump? */
export const paysPumpMp = (u: Unit | null | undefined): boolean => !!u && capped(u) && !!u.mg?.emanator && PUMP_MP_SHARE > 0;
/** The MP of a Pump that takes an Outburst from `stage0` up `stages` stages (1; Overdraw: 2), for this unit.
 * `begin` is the Begin's price (the held Outburst's, unless given: a plan from a design); `mult` what items say
 * ('outburst_pump' mpMult). 0 for a heart that pays none. */
export function pumpMp(u: Unit, stage0: number, stages = 1, mult = 1, begin?: number): number {
  if (!paysPumpMp(u) || stages <= 0) return 0;
  const cost = Math.max(0, begin ?? u.mg!.held?.cost ?? 0); if (cost <= 0) return 0;
  let n = 0; for (let s = stage0 + 1; s <= Math.min(MAX_STAGE, stage0 + stages); s++) n += s;
  return n <= 0 ? 0 : Math.max(1, Math.round(cost * PUMP_MP_SHARE * n * Math.max(0, mult)));
}
/** The MP of n plain Pumps from stage0, one stage each (the plan's "if I pump twice", the policies' sums). */
export function pumpsMp(u: Unit, n: number, stage0: number, begin?: number): number { let t = 0; for (let i = 0; i < n; i++) t += pumpMp(u, stage0 + i, 1, 1, begin); return t; }
export type OutburstForm = 'bolt' | 'wave' | 'burst' | 'aura' | 'lance';
export const FORMS: OutburstForm[] = ['bolt', 'wave', 'burst', 'aura', 'lance'];
/** The held Outburst (rules 1.5). v: 15 (a 1.2 hold has none and is read as it is: its stage 1–4 keeps its number). */
export interface HeldOutburst { design: string; stage: number; cost: number; tone?: string; form?: OutburstForm; watch?: boolean; steady?: boolean; turns?: number; v?: number;
  /** The Strain the swells have cost so far (Let it go gives back no more than this; an old hold without it: its stage). */
  paid?: number;
  /** Rules 1.8: the feelings poured in, in order (one per feeling pump); the Strain this hold has added (Begin, swells,
   * feelings: Relief gives it back); Quiet's running raw total (the hold's Strain is halved, rounded down). */
  felt?: string[]; strainIn?: number; quietRaw?: number;
  /** Rules 1.19: what items have added to this hold's multiplier (Shape's +0.1 on the turn's free Pump), and the round Shape last did. */
  plus?: number; shapeAt?: number;
  /** Rules 1.24: the MP its Pumps have taken so far (with `cost`, the spell's whole price). */
  pumpMp?: number;
  /** The stage each feeling filled (parallel to felt), for the stage bar's coloured segments. */
  feltAt?: number[] }
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
  if (m.soulBase == null && u.charId && !u.companion) m.soulBase = SOUL_DAMAGE; // a fight saved before rules 1.17
  if (m.mend == null && u.charId && !u.companion) m.mend = mendFactor(u.level); // a fight saved before rules 1.20
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
export function formSize(d: OutburstDesign, stage?: number): number {
  const f = formOf(d), a: any = f === 'bolt' ? null : (MODULE[f] as any)?.area;
  if (!a) return 0;
  // Bloom (rules 1.8): a Burst or Aura +1 radius a stage reached.
  const bloom = d.modules.includes('bloom') && (f === 'burst' || f === 'aura') ? ((MODULE.bloom as any)?.radius_per_stage ?? 1) * Math.max(0, stage ?? 0) : 0;
  return (a.length ?? a.radius ?? 1) + sized(d) * (f === 'lance' ? 2 : 1) + bloom;
}
/** How far the heart reaches for Heart Overwatch and the aim: Bolt and Burst their range, Wave and Lance their length,
 * Aura its radius. */
export function heartReach(m: MagicUnit, d: OutburstDesign): number { const f = formOf(d); return f === 'bolt' || f === 'burst' ? designRange(m, d) : formSize(d); }
const XY = (k: string) => k.split(',').map(Number) as [number, number];
const onGrid = (cb: Combat, k: string) => { const [x, y] = XY(k); return x >= 0 && y >= 0 && x < (cb.map as any).w && y < (cb.map as any).h; };
/** The tiles a release covers (spec: rules 1.5, Shapes): Bolt the aim; Wave a cone from the caster toward the aim
 * (within its length, about 45 degrees: the flamer's and Sigil's cone test); Burst a radius around the aim; Aura a
 * radius around the caster (its own tile left out); Lance a straight 8-direction line from the caster, walls stop it. */
export function outburstArea(cb: Combat, u: Unit, d: OutburstDesign, aim: string, stage?: number): string[] {
  const f = formOf(d), n = formSize(d, stage ?? u.mg?.held?.stage), ether = d.modules.includes('ether'), out: string[] = [];
  const seen = (k: string, from: string) => ether || k === from || lineOfSight(cb, from, k);
  if (f === 'bolt') return [aim];
  const [cx, cy] = XY(u.pos);
  if (f === 'burst' || f === 'aura') {
    const c = f === 'burst' ? aim : u.pos;
    // the shape is the kit's; what is left out is this spell's own: ground nobody can stand on (unless somebody does), and what the centre can't see
    for (const k of tilesIn(cb, f === 'burst' ? { shape: 'burst', at: c, r: n } : { shape: 'aura', at: c, r: n })) { if (!standable(cb.map, k) && !cb.units.some((v) => v.pos === k)) continue; if (seen(k, c)) out.push(k); }
    return out;
  }
  if (f === 'wave') {
    for (const k of tilesIn(cb, { shape: 'cone', from: u.pos, toward: aim, n })) if (seen(k, u.pos)) out.push(k);
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
  if (!d.modules.includes('ether') && aim !== u.pos && !lineOfSight(cb, u.pos, aim) && !bankShot(cb, d, aim)) return 'No line of sight.';
  return null;
}
/** Ricochet (rules 1.8): a Bolt with a wall or cover tile within 2 of the aim banks off it (no sight needed, half cover ignored). */
function bankShot(cb: Combat, d: OutburstDesign, aim: string): boolean {
  if (!d.modules.includes('ricochet') || formOf(d) !== 'bolt') return false;
  const r = (MODULE.ricochet as any)?.bank_radius ?? 2, [ax, ay] = XY(aim), mp: any = cb.map;
  const solid = new Set([...(mp.solid || []), ...(mp.cover || []), ...(mp.full || [])]);
  for (let x = ax - r; x <= ax + r; x++) for (let y = ay - r; y <= ay + r; y++) if (solid.has(x + ',' + y)) return true;
  return false;
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
/** Strain from the held Outburst itself (rules 1.8: the Begin, the swell, a feeling): Quiet halves the hold's total,
 * rounded down; strainIn keeps what was really added (Relief). Returns the log suffix. */
function holdStrain(cb: Combat, rng: Rng, u: Unit, n: number, why: string): { line: string; added: number } {
  const m = heart(u); if (!m) return { line: '', added: 0 };
  const h = m.held, d = h ? findDesign(m, h.design) : null;
  if (h && n > 0 && d?.modules.includes('quiet')) { const raw = (h.quietRaw || 0) + n, by = Math.floor(raw / 2) - Math.floor((h.quietRaw || 0) / 2); h.quietRaw = raw; n = by; }
  // Always through addStrain, even at 0: its 'strain' hook is where items act on the Begin (Overflow sets the stage there).
  const was = m.strain, line = addStrain(cb, rng, u, n, why), added = Math.max(0, m.strain - was);
  if (h && m.held === h) h.strainIn = (h.strainIn || 0) + added;
  return { line, added };
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
  if (!quiet) say(cb, u.name + "'s heart calms (" + ({ still: 'a still turn', fight: 'fighting it out', tend: 'tending an ally', letgo: 'let go', steady: 'steadied', turn: 'a new turn' } as Record<string, string>)[way] + '): Strain ' + u.mg!.strain + '/' + u.mg!.strainLimit + '.');
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
  say(cb, 'MANA SHORT: ' + u.name + "'s heart stops (Strain " + m.strain + '/' + lim + '): Stunned' + (held ? ', and the held Outburst goes off wild' : '') + '.');
  if (!u.dead && !u.downed) applyCond(cb, rng, null, u, 'stunned', 1, undefined, { skipSave: true });
  if (held && !u.dead) {
    wildRelease(cb, rng, u);
    // Its element's stage-1 rider on your own tile (conditions only: a push from your own tile has no way to go).
    for (const r of toneRiders(tone, 1).riders) if (r.rider === 'cond' && r.condition && !u.dead) say(cb, u.name + ' takes the backlash' + applyCond(cb, rng, null, u, r.condition, r.rounds, undefined, { skipSave: !r.save }));
  }
  const was = m.strain; m.strain = Math.min(m.strain, lim); m.pumps = [];
  if (was !== m.strain) emit(cb, 'strain_change', { u, from: was, to: m.strain, why: 'short', limit: lim, cb });
  return ' · MANA SHORT';
}
/** The end of a caster's turn (rules 1.5): each point over the limit burns 8 true (it Downs, never kills: a foe is
 * subdued); then a turn with no Begin, Pump or Feed calms 1 (stillness), but only with nothing held: holding is not
 * stillness (Leon 8 Nov 2026), so an idle held turn nets 0 (+1 swell, −1 turn start). fx 'burn' {unit, at, over, dmg}. */
export function magicTurnEnd(cb: Combat, rng: Rng | null, u: Unit) {
  const m = heart(u); if (!m || u.dead) return;
  // The Short is a state (rules 1.5: automatic at 3 over): a limit that fell this turn (Heart's Own) is checked here.
  if (rng && m.strain - m.strainLimit >= SHORT_AT_OVER && !u.downed) say(cb, u.name + "'s heart is 3 over its limit" + manaShort(cb, rng, u) + '.');
  const over = m.strain - m.strainLimit;
  if (over > 0 && !u.downed) {
    const r = applyDamage(cb, u, STRAIN_BURN * over, { type: 'strain', dmgType: 'true', shield: false, credit: 'none', nonlethal: true } as any);
    emitFx(cb, 'burn', { unit: u.id, at: u.pos, over, dmg: r.dealt });
    emitFx(cb, 'hurt', { target: u.id, at: u.pos, dmg: r.dealt, why: 'strain', killed: false }); if (u.hp === 0) fxFell(cb, u);
    say(cb, u.name + "'s heart burns: " + r.dealt + ' damage (' + over + ' over the Strain limit)' + (u.hp === 0 ? ', ' + (u.side === 'foe' ? 'out of the fight' : 'Downed') : '') + '.');
  }
  if (!m.cast && !m.held && m.strain > 0) calm(cb, u, 1, 'still');
}

// ----- the cycle -----
export interface OutburstPreview { ok: boolean; why?: string; cost: number; ap: number; range: number; strain: number; stage: number; hp?: number;
  /** A snap cast's multiplier from items (Heart Surge's snap: stage 1's ×1.0, not stage 0's ×0.8), 1 when none. */ relMult?: number;
  /** What items say about that multiplier, for the preview ("Resonance +10%"; rules 1.14). */ relNotes?: string[];
  /** The part of relMult that holds at any stage (the Resonance perk), for a plan with Pumps in it; 1 when none. */ relAll?: number }
/** The Begin's price (and, with release, the snap cast's: Begin + Release at stage 0). Kept for class moves. */
export function previewOutburst(cb: Combat, u: Unit, designId: string, aim?: string, release = true): OutburstPreview {
  const m = u.mg ? heart(u) : undefined, no = (why: string): OutburstPreview => ({ ok: false, why, cost: 0, ap: 0, range: 0, strain: 0, stage: 0 });
  if (!m) return no('You have no Outbursts.');
  const e = canCast(u, cb); if (e) return no(e);
  if (m.held) return no('You are holding an Outburst: release it or let it go first.');
  const d = findDesign(m, designId); if (!d) return no('No such design.');
  // 'outburst_cost' {u, design, mp, ap, range, strain, hp, release, preview} (mutable): items change the Begin's price
  // (pay HP instead of MP, a free cast, more reach). ap is the Begin's; a snap cast adds the Release (1 AP).
  const oc: any = emit(cb, 'outburst_cost', { u, design: d, mp: designCost(m, d, manaOf(cb)) * (condOn(u, 'rdebuff') ? condMods('rdebuff').soulCostMult ?? 1 : 1), ap: designAp(m, d), range: designRange(m, d), strain: (flooded(cb) ? CYC.flooded_strain ?? 2 : CYC.begin_strain ?? 1) + (m.emanator ? 0 : CYC.no_emanator_strain ?? 2), hp: 0, release, preview: true, fail: '', relMult: 1, relAll: 1, relNotes: [] as string[], cb });
  if (oc.fail) return no(oc.fail);
  const cost = Math.max(0, Math.round(oc.mp)), ap = priced({ cb, u }, 'begin', Math.max(0, oc.ap), undefined, { design: d.id }).ap + (release ? SOUL_AP.release : 0), range = oc.range, strain = Math.max(0, oc.strain), hp = Math.max(0, Math.round(oc.hp || 0));
  if (hp && u.hp <= hp) return { ok: false, why: 'Paying ' + hp + ' HP would drop you.', cost, ap, range, strain, stage: 0, hp };
  { const no = whyNot(cb, u, ap); if (no) return { ok: false, why: no, cost, ap, range, strain, stage: 0, hp }; }
  if (m.emanator && m.mp < cost) return { ok: false, why: 'Needs ' + cost + ' MP (' + m.mp + '): Syphon first.', cost, ap, range, strain, stage: 0, hp };
  const relMult = release ? oc.relMult || 1 : 1, relAll = release ? oc.relAll || 1 : 1, relNotes: string[] = release ? oc.relNotes || [] : [];
  if (release) { const why = aimError(cb, u, d, aim, range); if (why) return { ok: false, why, cost, ap, range, strain, stage: 0, hp, relMult, relAll, relNotes }; }
  return { ok: true, cost, ap, range, strain, stage: 0, hp, relMult, relAll, relNotes };
}
export interface BeginOpts { /** Heart Overwatch on from the start. */ watch?: boolean }
/** Begin (rules 1.5): pay MP, +1 Strain (2 Flooded; +2 from the air without an Emanator), hold the design at stage 0.
 * hold false is a snap cast: Begin and Release at once (3 AP, stage 0: ×0.8), as class moves and old callers use it.
 * fx 'outburst' {unit, at, design, school, form, tone, element, stage: 0, hold, watch}. */
export function beginOutburst(cb: Combat, rng: Rng, u: Unit, designId: string, aim: string | undefined, hold: boolean, opts: BeginOpts = {}): string | null {
  const pv = previewOutburst(cb, u, designId, aim, !hold); if (!pv.ok) return pv.why || 'Can\'t.';
  const m = heart(u)!, d = findDesign(m, designId)!;
  pay(cb, u, pv.ap - (hold ? 0 : SOUL_AP.release)); if (m.emanator) m.mp -= pv.cost; m.cast = true;
  if (pv.hp) applyDamage(cb, u, pv.hp, { by: u, type: 'heart', shield: false, credit: 'none' });
  emit(cb, 'outburst_begin', { u, design: d, hold, cost: pv.cost, hp: pv.hp || 0, stage: 0, cb, rng }); // 'outburst_begin' {u, design, hold, cost, hp, stage}
  shiftMana(cb, -Math.ceil(pv.cost / 10));
  m.held = { design: d.id, stage: 0, cost: pv.cost, tone: toneOf(d), form: formOf(d), turns: 0, paid: 0, v: SOUL_REV, ...(opts.watch ? { watch: true } : {}) };
  emitFx(cb, 'outburst', { unit: u.id, at: u.pos, design: d.id, school: d.school, form: formOf(d), tone: toneOf(d), element: toneElement(toneOf(d)), hold, stage: 0, watch: !!opts.watch });
  say(cb, u.name + ' begins ' + d.name + ' (' + pv.cost + ' MP' + (m.emanator ? '' : ' from the air') + ', ' + (pv.ap - (hold ? 0 : SOUL_AP.release)) + ' AP): the heart lights.');
  holdStrain(cb, rng, u, pv.strain + (m.debt || 0), 'begin'); m.debt = 0; m.pumps = [];
  if (!hold && m.held && !u.dead && !u.downed) { pay(cb, u, SOUL_AP.release); releaseAt(cb, rng, u, d, aim!, false); }
  return null;
}
export interface PumpPreview { ok: boolean; why?: string; ap: number; free: boolean; stage: number; mult: number;
  /** Rules 1.24: the MP this Pump takes (0 for a heart that pays none: drawing on the air, a companion, an enemy). */ mp: number;
  /** Rules 1.8: the feeling poured in (if any), its step, and the free Pump this one uses ('first' of the fight, Empathy's). */
  feeling?: string; step?: number; freeKind?: 'first' | 'empathy' | 'item' | null;
  /** What an item says about this Pump, for its card (Overdraw: the stages it adds and its Strain; rules 1.14). */ note?: string }
/** Is the fight's free first Pump still there (rules 1.8, item 814)? Not on the area map (no fight). */
const firstFree = (cb: Combat, m: MagicUnit, u?: Unit | null) => !cb.overworld && !m.firstUsed && !!u?.charId && !u.companion && ((SOUL_RULES as any).cycle?.first_pump_free ?? true);
/** The held Outburst's multiplier now (rules 1.8, item 804): the stage table's plus (step − the plain step, 0.2 since rules 1.19) for each feeling pump.
 * With a target, Spite reads it (whoever last hurt you). */
export function heldMult(cb: Combat | null, u: Unit, h: { stage: number; felt?: string[]; design?: string; plus?: number } | null | undefined, t?: Unit | null): number {
  if (!h) return stageMult(0);
  const d = h.design && u.mg ? findDesign(u.mg, h.design) : null; // Calm's multiplier on a Release that rolls (rules 1.17: ×0.75; none since rules 1.19)
  return Math.round((stageMult(h.stage) + feelDelta(cb, u, h.felt, h.stage, t) + ((h as any).plus || 0)) * calmMult(d, h.felt) * 100) / 100;
}
/** A Pump's price: 1 AP, or free while the fight's first free Pump or the turn's one free Pump lasts (Empathy 3; rules 1.19: never two).
 * 'outburst_pump' {u, design, stage, ap, free, fail, preview, feeling, stages, note} (mutable) lets items change it.
 * Rules 1.8: a feeling pump pours in a feeling you know (`feeling`). On the preview, `stages` is how many stages the
 * Pump will add (1; Overdraw says 2, and adds its second stage itself on the real Pump) and `note` a line for its card. */
export function previewPump(cb: Combat, u: Unit, feeling?: string | null): PumpPreview {
  const m = u.mg ? heart(u) : undefined, no = (why: string): PumpPreview => ({ ok: false, why, ap: 0, mp: 0, free: false, stage: m?.held?.stage ?? 0, mult: heldMult(cb, u, m?.held) });
  if (!m || !m.held) return no('You hold no Outburst: Begin one first.');
  const e = canCast(u, cb); if (e) return no(e);
  if (m.held.stage >= MAX_STAGE) return no('The heart is full (stage ' + MAX_STAGE + '): release it.');
  const d = findDesign(m, m.held.design); if (!d) return no('That design is gone.');
  if (feeling) { if (!FEELING[feeling]) return no('No such feeling.'); if (!(m.feelings || []).includes(feeling)) return no('You haven\'t felt ' + FEELING[feeling].name + ' yet.');
    // Rules 1.17: a feeling marked `once` (Abandon) goes into an Outburst once.
    // Rules 1.19: each feeling goes into an Outburst once.
    if ((ONCE_EACH || (FEELING[feeling].pour as any)?.once) && (m.held.felt || []).includes(feeling)) return no(FEELING[feeling].name + ' is already in this Outburst: once is all it takes.'); }
  // Rules 1.19: one free stage a turn (`capLeft`); items that give a free Pump read it (Shape).
  const capLeft = freeStageLeft(u), first = capLeft && firstFree(cb, m, u), emp = capLeft && (m.freePumps || 0) > 0, free = first || emp;
  const op: any = emit(cb, 'outburst_pump', { u, design: d, stage: m.held.stage, ap: free ? 0 : pumpBaseAp(m, feeling), free, capLeft, fail: '', preview: true, feeling: feeling || null, stages: 1, note: '', mpMult: 1, cb });
  if (op.fail) return no(op.fail);
  const ap = priced({ cb, u }, 'pump', Math.max(0, op.ap), undefined, { feeling: feeling || null }).ap, next = { design: m.held.design, stage: Math.min(MAX_STAGE, m.held.stage + Math.max(1, Math.round(op.stages || 1))), felt: [...(m.held.felt || []), ...(feeling ? [feeling] : [])], plus: (m.held.plus || 0) + (op.plus || 0) };
  const step = feeling ? feelingStep(cb, u, feeling, next.stage) : PLAIN_STEP;
  // Rules 1.24: the MP of the stages this Pump adds (the engine's own number: the HEART panel shows it before the click).
  const mp = pumpMp(u, m.held.stage, next.stage - m.held.stage, op.mpMult ?? 1);
  { const n0 = whyNot(cb, u, ap); if (n0) return { ok: false, why: n0, ap, mp, free, stage: m.held.stage, mult: heldMult(cb, u, m.held), ...(feeling ? { feeling, step } : {}) }; }
  if (mp > m.mp) return { ok: false, why: 'A Pump to stage ' + next.stage + ' needs ' + mp + ' MP (' + Math.floor(m.mp) + '): Syphon first, or Release what you hold.', ap, mp, free, stage: m.held.stage, mult: heldMult(cb, u, m.held), ...(feeling ? { feeling, step } : {}) };
  const isFree = !!op.free && ap === 0, freeKind = !isFree ? (ap === 0 ? 'item' : null) : first ? 'first' : emp ? 'empathy' : 'item';
  return { ok: true, ap, mp, free: isFree, stage: next.stage, mult: heldMult(cb, u, next), ...(feeling ? { feeling, step } : {}), freeKind: ap === 0 ? freeKind : null, ...(op.note ? { note: String(op.note) } : {}) };
}
/** Pump (rules 1.5; 1.8 feelings): +1 stage (to 4), plain or with a feeling. fx 'pump' {unit, at, stage, mult, free, max,
 * tone, feeling, family, step, does}: the heartbeat, rising with the stage; a feeling's colour and glyph. */
export function pumpOutburst(cb: Combat, rng: Rng, u: Unit, feeling?: string | null): string | null {
  const pv = previewPump(cb, u, feeling); if (!pv.ok) return pv.why || 'Can\'t.';
  const m = heart(u)!, h = m.held!, d = findDesign(m, h.design)!;
  const rec: PumpRec = { design: h.design, stage0: h.stage, ap: pv.ap, free: pv.freeKind || null, strain: 0, felt0: (h.felt || []).length, ...(feeling ? { feeling } : {}) };
  pay(cb, u, pv.ap); m.cast = true;
  if (pv.freeKind === 'first') m.firstUsed = true; else if (pv.freeKind === 'empathy') m.freePumps = Math.max(0, (m.freePumps || 0) - 1);
  if (pv.freeKind && capped(u)) m.freeUsed = (m.freeUsed || 0) + 1; // rules 1.19: this turn's free stage is taken
  const plus0 = h.plus || 0;
  h.stage = Math.min(MAX_STAGE, h.stage + 1);
  if (feeling) { (h.felt ||= []).push(feeling); (h.feltAt ||= []).push(h.stage); }
  emit(cb, 'outburst_pump', { u, design: d, stage: h.stage, ap: pv.ap, free: pv.free, freeKind: pv.freeKind || null, fail: '', preview: false, feeling: feeling || null, cb, rng });
  rec.added = h.stage - rec.stage0; if ((h.plus || 0) !== plus0) rec.plus = Math.round(((h.plus || 0) - plus0) * 100) / 100;
  // Rules 1.24: the MP of the stages it really added (Overdraw's second stage is in by now), never more than the preview said.
  const paid = Math.min(pv.mp, Math.max(0, m.mp), rec.added === pv.stage - rec.stage0 ? pv.mp : pumpMp(u, rec.stage0, rec.added));
  if (paid > 0) { m.mp -= paid; rec.mp = paid; h.pumpMp = (h.pumpMp || 0) + paid; }
  const f = feeling ? FEELING[feeling] : null, mult = heldMult(cb, u, h);
  emitFx(cb, 'pump', { unit: u.id, at: u.pos, stage: h.stage, mult, free: pv.free, max: h.stage >= MAX_STAGE, tone: h.tone || 'raw', ...(paid ? { mp: paid } : {}), ...(f ? { feeling: f.id, family: f.family, step: pv.step, does: feelingWord(d, f.id) } : {}) });
  say(cb, u.name + ' pumps the heart' + (f ? ' with ' + f.name : '') + ': ' + d.name + ' at stage ' + h.stage + ' (×' + mult + ')' + (pv.freeKind === 'first' ? ', the fight\'s free first Pump' : pv.freeKind === 'empathy' ? ', a free Pump (Empathy)' : pv.free ? ', a free Pump' : '') + (paid ? ', ' + paid + ' MP' : '') + '.');
  (m.pumps ||= []).push(rec);
  // A feeling's own Strain (Rage +1, Abandon +2), with the hold's (Quiet halves it).
  const fs = Number((f?.pour as any)?.strain || 0);
  if (fs > 0 && m.held === h) { const r = holdStrain(cb, rng, u, fs, 'feeling'); rec.strain = r.added; if (!m.held) m.pumps = []; }
  return null;
}
/** The word a feeling shows on the multiplier counter when it changes what the spell does (rules 1.8 section 7). */
export function feelingWord(d: OutburstDesign, id: string): string | null {
  const hostile = d.school !== 'buff' && !(d.school === 'damage' && d.modules.includes('inverse'));
  return ({ love: hostile ? 'now HEALS' : 'heals more', joy: 'crits on 18+', calm: 'rolls TWICE', fear: 'throws you BACK', cruelty: 'now BLEEDS', mercy: 'now SPARES', defiance: 'hard to RESIST', dread: 'steals REACTIONS', awe: 'now STAGGERS', longing: 'reaches FURTHER', contempt: 'now SCORNS', guilt: 'draws their FIRE', jealousy: 'now STEALS', wonder: 'now REVEALS', hope: 'now CLEANSES', relief: 'eases STRAIN', shame: 'now HURTS YOU', pride: 'wants a KILL' } as Record<string, string>)[id] || null;
}
/** Revert Pump (rules 1.8, item 808; 0 AP): undo your last pump this turn: the stage, the feeling, the AP paid, the free
 * Pump it used and the Strain it added. fx 'revert' {unit, at, stage, mult, feeling}. */
export function revertPump(cb: Combat, u: Unit): string | null {
  const m = u.mg ? heart(u) : undefined; if (!m || !m.held) return 'Nothing held.';
  if (!onTurn(cb, u)) return 'On your own turn.';
  const r = (m.pumps || []).at(-1); if (!r || r.design !== m.held.design) return 'No pump to undo this turn.';
  m.pumps!.pop();
  const h = m.held; h.stage = r.added != null ? Math.max(0, h.stage - r.added) : r.stage0; if (h.felt) h.felt = h.felt.slice(0, r.felt0); if (h.feltAt) h.feltAt = h.feltAt.slice(0, r.felt0);
  refund(cb, u, r.ap);
  if (r.mp) { m.mp = Math.min(m.mpMax, m.mp + r.mp); h.pumpMp = Math.max(0, (h.pumpMp || 0) - r.mp); } // rules 1.24: the Pump's MP comes back
  if (r.free === 'first') m.firstUsed = false; else if (r.free === 'empathy') m.freePumps = Math.min(m.freePumpsMax || 0, (m.freePumps || 0) + 1);
  if (r.free && capped(u)) m.freeUsed = Math.max(0, (m.freeUsed || 0) - 1);
  if (r.plus) { h.plus = Math.round(((h.plus || 0) - r.plus) * 100) / 100; delete h.shapeAt; }
  if (r.strain > 0) { const back = easeStrain(cb, u, r.strain, 'revert'); h.strainIn = Math.max(0, (h.strainIn || 0) - back); }
  const mult = heldMult(cb, u, h);
  emitFx(cb, 'revert', { unit: u.id, at: u.pos, stage: h.stage, mult, ...(r.feeling ? { feeling: r.feeling } : {}) });
  say(cb, u.name + ' takes the pump back' + (r.feeling ? ' (' + FEELING[r.feeling].name + ')' : '') + ': stage ' + h.stage + ' (×' + mult + ').');
  return null;
}
/** The AP of n Pumps of design d from stage0 (the preview's and the AI's): the round's free Pumps first, then 1 AP each;
 * the first Pump that still costs AP goes through 'outburst_pump' (preview), so items that price it (Shape) count.
 * Toggles that change a Pump's stages (Overdraw) are not planned. */
export function pumpsAp(cb: Combat, u: Unit, d: OutburstDesign, n: number, stage0: number): number {
  const m = u.mg!; let ap = 0, hooked = false, paid = (m.pumps || []).filter((r) => r.ap > 0).length;
  // Rules 1.19: one free stage a turn for a character, whatever gives it.
  let free = (m.freePumps || 0) + (firstFree(cb, m, u) ? 1 : 0); if (capped(u)) free = Math.min(free, Math.max(0, FREE_PER_TURN - (m.freeUsed || 0)));
  let capLeft = freeStageLeft(u);
  for (let i = 0; i < n; i++) {
    if (free > 0) { free--; capLeft = !capped(u); continue; }
    if (!hooked) { hooked = true; const op: any = emit(cb, 'outburst_pump', { u, design: d, stage: stage0 + i, ap: pumpBaseAp(m, null, paid), free: false, capLeft, fail: '', preview: true, cb }); ap += Math.max(0, op.ap); if (op.ap > 0) paid++; continue; }
    ap += pumpBaseAp(m, null, paid); paid++;
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
  const longing = (m.held.felt || []).includes('longing') ? (FEELING.longing?.pour as any)?.reach ?? 2 : 0;
  const pc: any = emit(cb, 'release_cost', { u, design: d, ap: SOUL_AP.release, range: designRange(m, d) + longing, fail: '', preview: true, cb });
  if (pc.fail) return pc.fail;
  const pap = priced({ cb, u }, 'release', Math.max(0, pc.ap)).ap; { const no = whyNot(cb, u, pap); if (no) return no; }
  const why = aimError(cb, u, d, aim, pc.range); if (why) return why;
  const rc: any = emit(cb, 'release_cost', { u, design: d, ap: SOUL_AP.release, range: designRange(m, d), fail: '', cb });
  pay(cb, u, Math.min(apFor(cb, u), priced({ cb, u }, 'release', Math.max(0, rc.ap)).ap));
  releaseAt(cb, rng, u, d, formOf(d) === 'aura' ? u.pos : aim!, false);
  return null;
}
/** Let it go (rules 1.5, calming 4): free, on your turn. The held Outburst is dropped; Strain falls by its stage, but
 * never by more than the Strain its swells cost (item 541: stages bought with AP or free Pumps give nothing back, or
 * Pump-then-let-go would be a vent); the meter +1. fx 'letgo' {unit, at, stage, by}. */
export function letGo(cb: Combat, u: Unit): string | null {
  const m = u.mg ? heart(u) : undefined; if (!m || !m.held) return 'Nothing held.';
  if (!onTurn(cb, u)) return 'On your own turn.';
  const st = m.held.stage, back = Math.min(st, m.held.paid ?? st), d = findDesign(m, m.held.design); m.held = null; m.pumps = [];
  const by = easeStrain(cb, u, back, 'letgo');
  emitFx(cb, 'letgo', { unit: u.id, at: u.pos, stage: st, by, strain: m.strain });
  if (by) emitFx(cb, 'calm', { unit: u.id, at: u.pos, way: 'letgo', by, strain: m.strain });
  say(cb, u.name + ' lets ' + (d ? d.name : 'the Outburst') + ' go: a violet sigh (Strain −' + by + ', ' + m.strain + '/' + m.strainLimit + ').');
  shiftMana(cb, 1, 'a heart let go');
  return null;
}
/** Steady the heart (rules 1.5, calming 5; Leon 8 Nov 2026): 1 AP, only while holding: −1 Strain, and the held Outburst
 * doesn't swell at the start of your next turn. fx 'steady' {unit, at, by, strain, stage}. */
export function steadyHeart(cb: Combat, u: Unit): string | null {
  const m = u.mg ? heart(u) : undefined; if (!m || !m.held) return 'Steady the heart only while holding an Outburst.';
  if (u.dead || u.downed) return 'Downed.';
  if (m.held.steady) return 'The heart is already steadied this turn.';
  const ap = price({ cb, u }, 'steady', SOUL_AP.steady).ap; { const no = whyNot(cb, u, ap); if (no) return no; }
  pay(cb, u, ap); m.held.steady = true; (m as any).steadied = true; // rules 1.8: Calm's trigger
  const by = easeStrain(cb, u, 1, 'steady');
  emitFx(cb, 'steady', { unit: u.id, at: u.pos, by, strain: m.strain, stage: m.held.stage });
  if (by) emitFx(cb, 'calm', { unit: u.id, at: u.pos, way: 'steady', by, strain: m.strain });
  say(cb, u.name + ' steadies the heart: the glow cools (Strain ' + m.strain + '/' + m.strainLimit + '; no swell next turn).');
  return null;
}
/** Feeding (rules 1.5): 1 AP, absorb a glyph on your own tile into the held Outburst: +1 stage; the glyph is gone (a
 * Keystone can't be eaten). fx 'feed' {unit, at, word, stage}. */
export function feedOutburst(cb: Combat, u: Unit): string | null {
  const m = u.mg ? heart(u) : undefined; if (!m || !m.held) return 'You hold no Outburst to feed.';
  const e = canCast(u, cb); if (e) return e;
  if (m.held.stage >= MAX_STAGE) return 'The heart is full (stage ' + MAX_STAGE + ').';
  const g = (cb.glyphs || []).find((x) => x.pos === u.pos && !(x as any).keystone); if (!g) return 'No glyph on your tile to feed it.';
  const ap = price({ cb, u }, 'feed', SOUL_AP.feed).ap; { const no = whyNot(cb, u, ap); if (no) return no; }
  pay(cb, u, ap); m.cast = true;
  cb.glyphs = (cb.glyphs || []).filter((x) => x !== g); tidyStrokesS(cb.glyphs); // rules 1.10 (item 903): a fed middle glyph splits its stroke
  m.held.stage++;
  emitFx(cb, 'feed', { unit: u.id, at: u.pos, word: g.word, glyph: g.id, stage: m.held.stage, mult: stageMult(m.held.stage) });
  say(cb, u.name + ' feeds the ' + g.word.toUpperCase() + ' glyph to the heart: stage ' + m.held.stage + ' (×' + stageMult(m.held.stage) + ').');
  return null;
}
/** Heart Overwatch on or off (free): while on and holding, the first enemy to enter the design's reach draws the release
 * as your reaction. fx 'hold' {unit, at, stage, watch}. */
export function setHeartWatch(cb: Combat, u: Unit, on = true): string | null {
  const m = u.mg ? heart(u) : undefined; if (!m || !m.held) return 'You hold no Outburst.';
  if (on) m.held.watch = true; else delete m.held.watch;
  emitFx(cb, 'hold', { unit: u.id, at: u.pos, stage: m.held.stage, tone: m.held.tone || 'raw', form: m.held.form || 'bolt', watch: on });
  say(cb, u.name + (on ? ' watches with the heart: the first enemy into reach draws the release.' : ' stops watching with the heart.'));
  return null;
}
/** Heart Overwatch (rules 1.5): called at each step of a walk. A watching holder releases at an enemy that has just
 * entered its reach (in sight, unless Ether), as its reaction. fx 'heart_overwatch' {unit, at, target, stage}. */
export function heartOverwatch(cb: Combat, rng: Rng, mover: Unit, from: string) {
  if (mover.dead || mover.downed || mover.hidden) return;
  for (const h of cb.units) {
    const m = h.mg; if (!m?.held?.watch || h.side === mover.side || h.dead || h.downed || h.surrendered || !canReact(cb, h, 'attack')) continue;
    if (canCast(h, cb)) continue;
    const d = findDesign(heart(h)!, m.held.design); if (!d) continue;
    const r = heartReach(m, d);
    if (dist(h.pos, mover.pos) > r || dist(h.pos, from) <= r) continue;
    if (!d.modules.includes('ether') && !lineOfSight(cb, h.pos, mover.pos)) continue;
    if (!react(cb, h, { kind: 'attack', event: stepEvent(mover), window: { kind: 'heart_overwatch', mover, at: mover.pos, rng } }, () => {
      emitFx(cb, 'heart_overwatch', { unit: h.id, at: h.pos, target: mover.id, to: mover.pos, stage: m.held!.stage, tone: m.held!.tone || 'raw' });
      say(cb, h.name + ' gasps and lets the heart go at ' + mover.name + ' (Heart Overwatch).');
      releaseAt(cb, rng, h, d, formOf(d) === 'aura' ? h.pos : mover.pos, false, true);
    })) continue;
    if (mover.dead || mover.downed) return;
  }
}
/** A wild release (the Mana Short): a random creature within reach, or into the air. */
export function wildRelease(cb: Combat, rng: Rng, u: Unit): boolean {
  const m = heart(u)!, d = findDesign(m, m.held?.design); if (!d) { m.held = null; return false; }
  const near = cb.units.filter((v) => !v.dead && v !== u && dist(v.pos, u.pos) <= Math.max(1, heartReach(m, d)));
  if (!near.length) { emitFx(cb, 'release', { unit: u.id, at: u.pos, to: u.pos, school: d.school, form: formOf(d), tone: toneOf(d), element: toneElement(toneOf(d)), stage: m.held?.stage ?? 0, wild: true, area: [], targets: [], air: true }); say(cb, u.name + "'s Outburst bursts into the air."); m.held = null; return true; }
  const t = near[die(rng, near.length) - 1];
  say(cb, u.name + "'s Outburst releases wild at " + t.name + '.');
  releaseAt(cb, rng, u, d, formOf(d) === 'aura' ? u.pos : t.pos, true);
  return true;
}

// ----- what a release does -----
const OPT_COND: Record<string, string> = { left_brain_debuff: 'ldebuff', right_brain_debuff: 'rdebuff' };
const optOf = (school: string, o?: string) => o || ({ buff: 'heal', control: 'push', status: 'shaken' } as Record<string, string>)[school] || '';
/** The second school's rider strength (rules 1.5): half. */
const half = SECOND_SCHOOL.strength;
/** A design's second school, when it may ride (a different school, on the same side as the first), else null. */
/** Rules 1.19: a design's own school a second time is carried too (shelved: nobody can build one; character.ts sameSchoolError). */
const secondOf = (d: OutburstDesign) => (d.school2 && schoolSide(d.school, d.modules) === schoolSide(d.school2, d.modules) ? d.school2 : null);
/** The same school and the same way twice: the second copy deepens the first. */
const sameWayTwice = (d: OutburstDesign) => !!d.school2 && d.school2 === d.school && optOf(d.school, d.option) === optOf(d.school2, d.option2);
interface Hit { landed: boolean; crit: boolean; line: string }
function rollFor(cb: Combat, u: Unit, d: OutburstDesign, t: Unit, ignoreCover: boolean) {
  const homing = d.modules.includes('homing'), cover = !homing && !ignoreCover && coverTileFor(cb, u.pos, t.pos) ? 5 : 0;
  const bonus = u.mg!.will + (u.sk?.will_power ?? 0) + condSkillMod(u, 'will_power') + (homing ? 2 : 0) + condHit(u, t, cb) - cover + spellGapToHit(cb, u, t) + toHitAdd(cb, u, t, 'soul'); // rules 1.17: a spell reads the level gap; the one hook of every roll to hit (rolls.ts)
  const one = Math.max(5, Math.min(95, (21 - (t.def - bonus)) * 5));
  return { bonus, cover: !!cover, need: t.def, pct: one, one };
}
/** Calm (rules 1.19): the chance that the better of two rolls lands. */
export const twiceBetter = (pct: number) => Math.round((1 - (1 - pct / 100) ** 2) * 1000) / 10;
const rolls = (d: OutburstDesign) => (formOf(d) === 'bolt' || formOf(d) === 'lance') && !d.modules.includes('at_once');
const formMult = (d: OutburstDesign) => { const f = formOf(d); return f === 'bolt' ? 1 : (MODULE[f] as any)?.damage_mult ?? 1; };
/** The damage one school deals at a multiplier before armour (rules 1.5): the base (40, an enemy caster's 24: rules 1.19) × Soul multiplier × stage × shape. */
// On the one formula (effects/output.ts; step a4): an Outburst's amount is its base (the Damage school's, Buff's heal,
// Inverse's or Shell's shield: soul_modules.json) × the Stat term (the heart's own cached Soul multiplier or Healing
// given) × its own named multipliers, each from data, in the order they always multiplied:
//   stage     the stage table with the feelings' steps, the residue and resonance added (cycle.stage_mult, feelings.json)
//   shape     the shape's damage multiplier (a module's damage_mult), or a boon's area share (buff.area_mult, split.boon_mult)
//   at once   At Once (its damage_mult)
//   level     the level factor of rules 1.20 (heals and shields; the heart's cached m.mend)
//   share     Love's share of the Buff heal
// The number is left raw: the caller adds the way of striking, a second school's half, the critical and the tone's
// riders, and harm floors it (as before).
const soulAmount = (kind: 'damage' | 'heal' | 'shield', base: number, mults: { v: number; label: string }[]): number =>
  amountOf({ kind, base, profile: kind === 'heal' ? 'mend' : 'soul', round: 'none' }, null, { level: null, mults }).raw;
export const outburstDamage = (m: MagicUnit, d: OutburstDesign, sm: number) => { const a = outburstTerms(m, d, sm); return soulAmount('damage', a.base, a.mults); };
/** The same amount with its terms open, as harm takes it (step a7: what an item adds goes in beside the base). */
export const outburstTerms = (m: MagicUnit, d: OutburstDesign, sm: number): SpellAmount => ({ base: m.soulBase ?? SOUL_DAMAGE_ENEMY, mults: [term(m.soulMult, 'stat: soul'), term(m.deal ?? 1, 'level'), term(sm, 'stage'), term(formMult(d), 'shape'), term(d.modules.includes('at_once') ? (MODULE.at_once as any)?.damage_mult ?? 0.8 : 1, 'at once')] });
// ---------- rules 1.20: what an Outburst heals and shields with ----------
// Their own bases, never the Damage base (moving one must not move the other): the Buff school's `heal`, Inverse's and
// Shell's `shield` (soul_modules.json). A character's grow with its level (mendFactor). In an area shape a heal or a
// flipped shield gives each ally `area_mult` (×0.4) in place of the shape's damage multiplier. An enemy caster keeps
// the numbers the enemy table was fitted with (`heal_enemy`; Inverse and Shell as a share of its damage).
const ofChar = (m: MagicUnit) => m.soulBase != null || m.mend != null;
const mendOf = (m: MagicUnit) => m.mend ?? 1;
export const BUFF_HEAL: number = (SCHOOL.buff as any)?.heal ?? 7;
export const BUFF_HEAL_ENEMY: number = (SCHOOL.buff as any)?.heal_enemy ?? 30;
export const BOON_AREA: number = (SCHOOL.buff as any)?.area_mult ?? MENDING.area_share ?? 0.4;
/** Rules 1.23: a Split heal or shield is divided: the Bolt and its split each give this much (two allies: ×1.6 in all, the area band). */
export const SPLIT_BOON: number = (MODULE.split as any)?.boon_mult ?? 0.8;
const boonArea = (m: MagicUnit, d?: OutburstDesign | null) => (!d || !ofChar(m) ? 1 : formOf(d) !== 'bolt' ? BOON_AREA : d.modules.includes('split') ? SPLIT_BOON : 1);
/** The Buff school's heal on one ally at a multiplier (before the air's Healing given and what the target receives). */
export const outburstHeal = (m: MagicUnit, d: OutburstDesign | null | undefined, sm: number) => soulAmount('heal', ofChar(m) ? BUFF_HEAL : BUFF_HEAL_ENEMY, [term(m.healMult, 'stat: healing given'), term(sm, 'stage'), term(mendOf(m), 'level'), term(boonArea(m, d), 'shape')]);
/** Inverse: the shield a flipped Damage Outburst gives one ally. */
export const inverseShield = (m: MagicUnit, d: OutburstDesign, sm: number) => ofChar(m) ? soulAmount('shield', (MODULE.inverse as any)?.shield ?? 10, [term(m.soulBoon ?? m.soulMult, 'stat: soul'), term(sm, 'stage'), term(mendOf(m), 'level'), term(boonArea(m, d), 'shape')]) : outburstDamage(m, d, sm) * ((MODULE.inverse as any)?.shield_mult_enemy ?? 0.7);
/** Shell: the shield a Release leaves on its caster. */
export const shellShield = (m: MagicUnit, d: OutburstDesign, sm: number) => ofChar(m) ? soulAmount('shield', (MODULE.shell as any)?.shield ?? 4, [term(m.soulBoon ?? m.soulMult, 'stat: soul'), term(sm, 'stage'), term(mendOf(m), 'level')]) : outburstDamage(m, d, sm) * ((MODULE.shell as any)?.shield_of_power_enemy ?? 0.35);
/** Love's heal: a share of what the Buff school would heal at this multiplier (in the shape, or the lone share). */
export const loveHeal = (m: MagicUnit, d: OutburstDesign, sm: number, lone = false, area = false) => soulAmount('heal', ofChar(m) ? BUFF_HEAL : BUFF_HEAL_ENEMY, [term(m.healMult, 'stat: healing given'), term(sm, 'stage'), term(mendOf(m), 'level'), term(area ? boonArea(m, d) : 1, 'shape'), term(lone ? (FEELING.love?.pour as any)?.lone_heal_share ?? 0.15 : (FEELING.love?.pour as any)?.heal_share ?? 0.25, 'share')]);
/** Calm's multiplier on the whole Release (rules 1.17: ×0.75). Rules 1.19: none (Calm steps −0.4 instead); kept for data that sets `release_mult`. */
export const calmMult = (d: OutburstDesign | null | undefined, felt?: string[] | null): number => (d && (felt || []).includes('calm') && rolls(d) ? (FEELING.calm?.pour as any)?.release_mult ?? 1 : 1);
const armourKind = (tone: string, rs: number): 'none' | 'half' | 'full' => tone === 'raw' ? 'none' : toneRiders(tone, rs).riders.some((r) => r.rider === 'armour_full') ? 'full' : 'half';
const bonusDmg = (tone: string, rs: number) => toneRiders(tone, rs).riders.filter((r) => r.rider === 'bonus_damage').reduce((a, r) => a + (r.value || 0), 0);
const harmType = (tone: string): 'soul' | 'elemental' => (tone === 'raw' ? 'soul' : 'elemental');
/** Apply one school to one creature (primary at strength 1; the second school's rider at half). */
function schoolOn(cb: Combat, rng: Rng, u: Unit, d: OutburstDesign, t: Unit, school: string, option: string | undefined, sm: number, f: number, primary: boolean, rs: number, tone: string, out: string[]): Hit {
  const m = u.mg!, has = (x: string) => d.modules.includes(x), extra = has('time') ? (MODULE.time as any)?.extra_rounds ?? 2 : 0;
  // Rules 1.19: Control, Status and the Buff boons read the stage (longer, harder to resist); the same school and way
  // twice (shelved) makes the first copy's rounds half again as long.
  const stage = REL?.stage ?? 0, deep = primary && REL?.deepen ? 1.5 : 1, tnUp = stageSaveTn(stage);
  const rounds = (n: number) => Math.max(1, Math.floor((n + extra) * f * deep));
  if (school === 'damage') {
    const mode = has('inverse') ? undefined : option, md: any = mode ? DMODE[mode] : null;
    // (its terms open: the school's amount, a second school's share, the way it strikes, the critical; the tone's bonus rides after them)
    const oa = outburstTerms(m, d, sm), strike = (crit: number, plus: number): SpellAmount => ({ base: oa.base, mults: [...oa.mults, term(f, 'share'), term(damageModeMult(mode, t), 'way'), term(crit, 'critical')], ...(plus ? { plus } : {}) });
    if (has('inverse')) { if (t.side !== u.side) return { landed: false, crit: false, line: '' }; const s = grantShield(cb, t, inverseShield(m, d, sm) * f, u); out.push(t.name + ' is shielded (' + s + ')'); return { landed: true, crit: false, line: '' }; }
    const ign = toneRiders(tone, rs).riders.some((r) => r.rider === 'ignore_cover');
    let crit = false; const hp0 = t.hp;
    if (primary && rolls(d) && REL?.calm && (FEELING.calm?.pour as any)?.no_miss) out.push('strikes ' + t.name + ' (Calm: no roll)' + withElement(toneElement(tone), () => harm(cb, rng, u, t, strike(1, bonusDmg(tone, rs)), harmType(tone), TONE[tone]?.damage_type, armourKind(tone, rs))));
    else if (primary && rolls(d)) {
      // Calm (rules 1.19): two rolls, the better kept, and no critical. Joy: a critical from 18 up, when it hits.
      const adv = !!REL?.calm, rd = rollD20(rng, { adv }), r1 = rd.dice[0], r2 = rd.dice[1] || 0, r = rd.die, rf = rollFor(cb, u, d, t, ign || !!REL?.ignoreCover), sr = judge('roll', rd, rf.bonus + (emit(cb, 'spell_roll', { u, t, die: r, add: 0, kind: 'soul', cb }) as any).add, t.def), tot = sr.total;
      const rolled = adv ? 'd20 ' + r1 + ' and ' + r2 + ', Calm keeps ' + r : 'd20 ' + r;
      rollFx(cb, sr, u, { why: 'soul' });
      if (!sr.ok) { emitFx(cb, 'miss', { unit: u.id, target: t.id, at: t.pos, by: 'soul' }); out.push('misses ' + t.name + ' (' + rolled + ' → ' + tot + ' vs ' + t.def + ')'); return { landed: false, crit: false, line: '' }; }
      crit = !adv && r >= (REL?.critFrom ?? 20); out.push('hits ' + t.name + ' (' + rolled + (crit ? ', CRITICAL' : '') + ')' + withElement(toneElement(tone), () => harm(cb, rng, u, t, strike(crit ? spellCritMult(cb, u, t) : 1, bonusDmg(tone, rs)), harmType(tone), TONE[tone]?.damage_type, armourKind(tone, rs))));
      if (crit) noteCrit(cb, u, t, 'outburst'); // the spotlight's crit (decision 113): presentation only
    } else out.push((primary ? '' : 'and ') + withElement(toneElement(tone), () => harm(cb, rng, u, t, strike(1, primary ? bonusDmg(tone, rs) : 0), harmType(tone), TONE[tone]?.damage_type, armourKind(tone, rs))).replace(/^ · /, ''));
    // The ways to strike (rules 1.19): Brand marks the target for your side; Drain heals you for a share of the HP taken.
    if (md?.condition && !t.dead && t.side !== u.side) out.push(applyCond(cb, rng, u, t, md.condition, undefined, undefined, { skipSave: true }).replace(/^ · /, ''));
    if (md?.heal_of_damage && !u.dead && t.side !== u.side) { const took = Math.max(0, hp0 - t.hp); if (took > 0 && u.hp < u.maxHp) out.push(heal(u, took * md.heal_of_damage * f, cb, u).replace(/^ · /, '') + ' (Drain)'); }
    return { landed: true, crit, line: '' };
  }
  const opt = optOf(school, option);
  if (school === 'buff') {
    if (t.side !== u.side) return { landed: false, crit: false, line: '' };
    if (opt === 'defense') out.push(applyCond(cb, rng, u, t, 'guarded', rounds(2 + stageBoonRounds(stage))).replace(/^ · /, ''));
    else if (opt === 'hit') out.push(applyCond(cb, rng, u, t, 'inspired', rounds(2 + stageBoonRounds(stage))).replace(/^ · /, ''));
    else out.push(heal(t, outburstHeal(m, d, sm) * f, cb, u).replace(/^ · /, ''));
    return { landed: true, crit: false, line: '' };
  }
  if (school === 'control') {
    if (opt === 'push' || opt === 'pull' || opt === 'swap') {
      if (opt === 'swap' && (REL?.swapped || formOf(d) !== 'bolt')) return { landed: false, crit: false, line: '' }; // one trade a Release, a Bolt's
      const ally = t.side === u.side;
      const ca: any = emit(cb, 'cond_apply', { by: u, t, id: 'shoved', fam: 'body', rounds: 0, skipSave: false, cancel: false, why: '', tnAdd: 0, saveAdd: 0, cb, rng });
      if (ca.cancel) { out.push(t.name + ' can\'t be moved' + (ca.why ? ' (' + ca.why + ')' : '')); return { landed: false, crit: false, line: '' }; }
      const pen = NOSAVE_BY === u ? DEFY_PEN : 0, noSave = ca.skipSave || (NOSAVE_BY === u && !DEFY_PEN) || (opt === 'swap' && ally);
      const sv = noSave ? null : rollSave(cb, rng, { by: u, target: t, fam: 'body', id: 'shoved', via: 'will_power', tn: saveTn(u, 'will_power') + tnUp + pen, mod: saveOf(t, 'body'), ca }), ok = !!sv?.ok;
      if (opt === 'swap') {
        if (ok) { out.push(t.name + ' holds its ground (Body save)'); return { landed: false, crit: false, line: '' }; }
        const a = u.pos, b = t.pos;
        const sw = swapUnits(cb, rng, u, t, { by: u, source: 'magic', willing: ally ? [u, t] : [u], drawn: () => { emitFx(cb, 'shove', { target: t.id, from: b, to: a, ok: true, magic: true, swap: true }); emitFx(cb, 'shove', { target: u.id, from: a, to: b, ok: true, magic: true, swap: true }); } });
        if (!sw.ok) { out.push(t.name + ' can\'t be moved' + (sw.why ? ' (' + sw.why + ')' : '')); return { landed: false, crit: false, line: '' }; }
        if (REL) REL.swapped = true;
        out.push(u.name + ' and ' + t.name + ' trade places' + sw.text); return { landed: true, crit: false, line: '' };
      }
      const n = Math.max(1, Math.floor((((SCHOOL.control as any)?.push_tiles ?? 3) + stageTiles(stage)) * f));
      out.push(ok ? t.name + ' holds its ground (Body save)' : (magicShove(cb, t, u.pos, opt === 'push' ? n : -n, u).replace(/^ · /, '') || t.name + ' can\'t be moved'));
      return { landed: !ok, crit: false, line: '' }; // a saved push has not landed: it carries no rider (item 505)
    }
    // A condition lands when it takes hold (cb.condSeq moves only then): one resisted or cancelled carries no rider.
    const seq = cb.condSeq || 0;
    out.push(applyCond(cb, rng, u, t, opt === 'pinned' ? 'pinned' : 'slowed', rounds(2 + stageRounds(stage)), undefined, { tnAdd: tnUp }).replace(/^ · /, ''));
    return { landed: (cb.condSeq || 0) !== seq, crit: false, line: '' };
  }
  if (school === 'status') {
    const seq = cb.condSeq || 0, id = OPT_COND[opt] || opt;
    out.push(applyCond(cb, rng, u, t, id, rounds((id === 'silenced' ? 1 : 2) + stageRounds(stage)), has('left') ? 'brain' : has('right') ? 'heart' : undefined, { tnAdd: tnUp }).replace(/^ · /, ''));
    return { landed: (cb.condSeq || 0) !== seq, crit: false, line: '' };
  }
  return { landed: false, crit: false, line: '' };
}
/** A tone's riders on one creature it reached (rules 1.5, Elements): conditions, pushes, fire on the ground, rubble.
 * Exported for Storm Hand's Infusion and Discharge (the element's stage-N rider on a melee hit). */
export function applyToneRiders(cb: Combat, rng: Rng, by: Unit | null, t: Unit, tone: string, stage: number, from?: string, skip: string[] = []): string {
  // A tone's riders are an Outburst's (Will Power), on a weapon hit too (rules 1.13).
  return withVia(by, 'will_power', () => toneRidersInner(cb, rng, by, t, tone, stage, from, skip));
}
function toneRidersInner(cb: Combat, rng: Rng, by: Unit | null, t: Unit, tone: string, stage: number, from: string | undefined, skip: string[]): string {
  let out = ''; const at0 = t.pos; // where it struck (the pushes around it read from there, not from where the push left it)
  for (const r of toneRiders(tone, stage).riders) {
    // what an element does AROUND the creature it struck still happens when the strike killed it (fire spreads and the
    // ground burns, rubble rises, the gale throws the others); only what it does TO that creature is lost with it
    if (skip.includes(r.rider) || (t.dead && !['spread', 'ground', 'ground_around', 'push_around'].includes(r.rider))) continue;
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
  const was = SPELL; SPELL = { mp: u.mg?.held ? (u.mg.held.cost || 0) + (u.mg.held.pumpMp || 0) : u.mg ? designCost(u.mg, d, manaOf(cb)) : 0 }; try { withVia(u, 'will_power', () => releaseAtInner(cb, rng, u, d, aim, wild, reaction)); } finally { SPELL = was; }
}
function releaseAtInner(cb: Combat, rng: Rng, u: Unit, d: OutburstDesign, aim: string, wild: boolean, reaction: boolean) {
  const m = heart(u)!, stage = m.held?.stage ?? 0, tone = toneOf(d), form = formOf(d), has = (x: string) => d.modules.includes(x);
  const felt = [...(m.held?.felt || [])], F = new Set(felt), FP = (id: string): any => FEELING[id]?.pour || {};
  // 'outburst_release' {u, design, stage, aim, wild, mult, form, tone, reaction, felt} (mult multiplies the stage multiplier).
  // A Fuse going off doesn't fire it again: it fired when the Fuse was set (the player's action, where items such as
  // Heart Surge and Fusion add to it), and the multiplier it gave then is kept on the fuse.
  const fz = (d as any).__fused;
  const orl: any = fz ? { mult: (d as any).__fuseMult ?? 1 } : emit(cb, 'outburst_release', { u, design: d, stage, aim, wild, mult: 1, form, tone, reaction, felt, cb, rng });
  const res = wild ? { bonus: 0, with: [] as string[] } : resonanceFor(cb, u);
  // Rules 1.8 (item 804): the table's step, plus (step − the plain step) for each feeling pump; Quiet ×0.8. Spite reads per target.
  const quiet = has('quiet') ? (MODULE.quiet as any)?.damage_mult ?? 0.8 : 1;
  const plus = m.held?.plus || 0; // rules 1.19: what items added to this hold (Shape)
  const om = (orl.mult || 1) * quiet * calmMult(d, felt), smOf = (t?: Unit | null) => Math.max(0, (stageMult(stage) + feelDelta(cb, u, felt, stage, t) + plus + res.bonus) * om);
  const sm = smOf(null), rs = riderStage(cb, stage + riderBonus(cb, u, reaction || wild));
  const heldWas = m.held ? { ...m.held } : null;
  m.held = null; m.pumps = [];
  if (has('random') && !wild) { const pool = cb.units.filter((v) => !v.dead && v !== u && dist(v.pos, u.pos) <= heartReach(m, d)); if (pool.length) aim = pool[die(rng, pool.length) - 1].pos; }
  // Fuse (rules 1.8): it lands and waits, going off at your next turn start or when a creature steps into its area.
  if (has('fuse') && !wild && !fz) {
    const tiles = outburstArea(cb, u, d, aim, stage);
    (cb.zones ||= []).push({ id: 'fz' + (cb.glyphSeq = (cb.glyphSeq || 0) + 1), kind: 'fuse' as any, tiles, words: [], by: u.id, side: u.side, left: 99, mult: 1, who: u.name, fuse: { design: d.id, held: heldWas, aim, mult: orl.mult || 1 } } as any);
    emitFx(cb, 'fuse', { unit: u.id, at: u.pos, to: aim, tiles, tone, element: toneElement(tone), stage });
    say(cb, u.name + ' sets ' + d.name + ' to wait at ' + refOf(aim) + ' (Fuse): it goes off at ' + u.name + "'s next turn, or when someone steps in.");
    return;
  }
  const tiles = outburstArea(cb, u, d, aim, stage);
  let targets = affectedBy(cb, u, d, tiles);
  const hostile = d.school !== 'buff' && !(d.school === 'damage' && has('inverse'));
  // Love on a hostile design: the allies inside are healed, not harmed (rules 1.8, section 3.2).
  const loved = F.has('love') && hostile ? targets.filter((t) => t.side === u.side) : [];
  if (loved.length) targets = targets.filter((t) => !loved.includes(t));
  // Split (rules 1.8): a Bolt also takes the nearest other creature within 2 of the aim that the school reaches.
  if (has('split') && form === 'bolt') { const pool = cb.units.filter((v) => !v.dead && !targets.includes(v) && v !== u && dist(v.pos, aim) <= 2 && (hostile ? v.side !== u.side || !F.has('love') : v.side === u.side)).sort((a, b) => dist(a.pos, aim) - dist(b.pos, aim)); if (pool[0]) targets.push(pool[0]); }
  if (!wild) { noteRelease(cb, u); if (F.has('belonging')) noteRelease(cb, u); } // Belonging counts twice for allies' Resonance
  if (res.with.length) emitFx(cb, 'resonance', { unit: u.id, at: u.pos, with: res.with, bonus: res.bonus });
  // Silent (rules 1.8): a hostile release reveals a Hidden caster, as a harmful Sigil does; Silent keeps you hidden.
  if (u.hidden && hostile && !has('silent') && !wild) { endCond(u, 'hidden', cb); say(cb, u.name + ' is revealed (released an Outburst).'); emit(cb, 'spotted', { u, why: 'released an Outburst', cb }); }
  const does = felt.map((f) => feelingWord(d, f)).filter(Boolean);
  emitFx(cb, 'release', { unit: u.id, at: u.pos, to: aim, design: d.id, school: d.school, school2: d.school2 || null, option: d.option || null, form, tone, element: toneElement(tone), stage, mult: Math.round(sm * 100) / 100,
    riderStage: rs, wild, reaction, resonance: res.bonus, area: tiles, targets: [...targets, ...loved].map((t) => t.id), felt, ...(does.length ? { does: [...new Set(does)] } : {}) });
  const line: string[] = [], hitFoes: Unit[] = [], hits: Unit[] = [];
  const s2 = secondOf(d);
  const was = { ns: NOSAVE_BY, nl: NONLETHAL_BY, rel: REL };
  NOSAVE_BY = F.has('defiance') ? u : null; NONLETHAL_BY = F.has('mercy') ? u : null;
  const condWay = (s: string, o?: string) => s === 'status' || (s === 'buff' && optOf(s, o) !== 'heal') || (s === 'control' && ['pinned', 'slowed'].includes(optOf(s, o)));
  const deepen = sameWayTwice(d) && condWay(d.school, d.option);
  REL = { calm: F.has('calm'), ignoreCover: (F.has('calm') && !!FP('calm').ignore_cover) || bankShot(cb, d, aim), critFrom: F.has('joy') ? FP('joy').crit_from ?? 20 : 20, stage, deepen };
  try {
    // Volley: 3 small bolts (each rolls, ×0.4 each); Return: each target struck twice.
    const strikes = has('volley') && form === 'bolt' ? (MODULE.volley as any)?.bolts ?? 3 : has('return') && (form === 'bolt' || form === 'lance') ? 2 : 1;
    const per = has('volley') && form === 'bolt' ? (MODULE.volley as any)?.bolt_mult ?? 0.4 : 1;
    for (const t of targets) {
      if (t.dead) continue;
      let landed = false;
      // Return (rules 1.17): the second hit is at ×0.3 (it was a second full hit).
      const back = has('return') && !(has('volley') && form === 'bolt') ? (MODULE.return as any)?.second_mult ?? 1 : 1;
      for (let i = 0; i < strikes && !t.dead; i++) { const h = schoolOn(cb, rng, u, d, t, d.school, d.option, smOf(t) * per * (i > 0 ? back : 1), 1, true, rs, tone, line); landed ||= h.landed; }
      if (landed) hits.push(t);
      // a hit that kills still chains (Storm leaps from where it struck: live 0.22.0 lost the chain on a kill, and the preview showed it)
      if (landed && t.dead && tone !== 'raw' && t.side !== u.side) { const rr = applyToneRiders(cb, rng, u, t, tone, rs, form === 'burst' ? aim : u.pos, ['armour_full', 'bonus_damage', 'ignore_cover', 'chain']); if (rr) line.push(rr.replace(/^ · /, '')); hitFoes.push(t); }
      if (!landed || t.dead) continue;
      if (s2 && !deepen) schoolOn(cb, rng, u, d, t, s2, d.option2, smOf(t), half, false, rs, tone, line);
      if (tone !== 'raw' && t.side !== u.side && !t.dead) { const rr = applyToneRiders(cb, rng, u, t, tone, rs, form === 'burst' ? aim : u.pos, ['armour_full', 'bonus_damage', 'ignore_cover', 'chain']); if (rr) line.push(rr.replace(/^ · /, '')); hitFoes.push(t); }
      if (t.side !== u.side && !t.dead) { const fl = pourOn(cb, rng, u, d, t, F, aim); if (fl) line.push(fl.replace(/^ · /, '')); }
    }
    // Love: the allies inside are healed for a quarter of what the Buff school would heal there (rules 1.20; loveHeal).
    for (const a of loved) if (!a.dead) line.push(heal(a, loveHeal(m, d, sm), cb, u).replace(/^ · /, '') + ' (Love)');
    // Love with no ally in the shape (rules 1.17): the most wounded ally within the design's reach, or you, heals the lone share (0.15 of the Buff heal: rules 1.20).
    if (F.has('love') && hostile && !loved.length) { const a = loneLove(cb, u, m, d); if (a) line.push(heal(a, loveHeal(m, d, sm, true), cb, u).replace(/^ · /, '') + ' (Love)'); }
    if (F.has('love') && !hostile) for (const a of hits) if (!a.dead && a.side === u.side) line.push(heal(a, loveHeal(m, d, sm, false, true), cb, u).replace(/^ · /, '') + ' (Love)');
    // Storm's chains: from the first enemy hit, to the nearest other enemies within range, at half (no roll).
    const ch = toneRiders(tone, rs).riders.find((r) => r.rider === 'chain');
    const chainFrom = (n: number, range: number, mult: number, why: string, withRiders: boolean) => {
      let from = hitFoes[0]; const done = new Set([...targets, ...loved].map((t) => t.id)); done.add(u.id);
      for (let i = 0; i < n && from; i++) {
        const next = cb.units.filter((v) => !v.dead && !done.has(v.id) && v.side !== u.side && dist(v.pos, from.pos) <= range).sort((a, b) => dist(a.pos, from.pos) - dist(b.pos, from.pos))[0];
        if (!next) break; done.add(next.id);
        emitFx(cb, 'chain', { unit: u.id, from: from.pos, to: next.pos, target: next.id, element: toneElement(tone), ...(why ? { feeling: why } : {}) });
        line.push('it chains to ' + next.name + (why ? ' (' + FEELING[why].name + ')' : '') + withElement(toneElement(tone), () => harm(cb, rng, u, next, ((a: SpellAmount): SpellAmount => ({ base: a.base, mults: [...a.mults, term(mult, 'chain')] }))(outburstTerms(m, d, smOf(next))), harmType(tone), TONE[tone]?.damage_type, armourKind(tone, rs))));
        if (withRiders) { const sh = toneRiders(tone, rs).riders.filter((r) => r.rider === 'cond'); for (const r of sh) if (!next.dead) line.push(applyCond(cb, rng, u, next, r.condition!, r.rounds, undefined, { skipSave: !r.save }).replace(/^ · /, '')); }
        if (F.has('love')) for (const a of cb.units.filter((v) => !v.dead && v.side === u.side && dist(v.pos, next.pos) <= 1)) line.push(heal(a, loveHeal(m, d, sm) * amountMult('feeling:love', 'heal', 'along_the_chain'), cb, u).replace(/^ · /, '') + ' (Love, along the chain)');
        hitFoes.push(next); from = next;
      }
    };
    if (ch && hitFoes.length && d.school === 'damage') chainFrom(ch.n || 1, ch.range || 2, ch.mult ?? 0.5, '', true);
    // Joy chained in rules 1.8 to 1.17 (what Storm and Split do); rules 1.19: it widens the critical (schoolOn). The
    // chain stays for data that still sets `chain`.
    if (!FP('joy').chain) { /* rules 1.19 */ }
    else if (F.has('joy') && hitFoes.length && hostile) chainFrom(FP('joy').chain ?? 1, FP('joy').range ?? 2, FP('joy').mult ?? 0.5, 'joy', false);
    else if (F.has('joy') && hits.some((t) => t.side !== u.side) && hostile) { hitFoes.push(...hits.filter((t) => t.side !== u.side)); chainFrom(FP('joy').chain ?? 1, FP('joy').range ?? 2, FP('joy').mult ?? 0.5, 'joy', false); }
  } finally { NOSAVE_BY = was.ns; NONLETHAL_BY = was.nl; REL = was.rel; }
  // After the strike: feelings that touch you and your side, and the modules that do.
  line.push(...pourAfter(cb, rng, u, d, F, felt, stage, tiles, hits, heldWas, sm, aim, wild));
  if (!targets.length && !loved.length) line.push('nobody ' + (form === 'bolt' ? 'at ' + refOf(aim) : 'in the ' + form));
  const fn = felt.length ? ' with ' + [...new Set(felt)].map((f) => FEELING[f]?.name + (felt.filter((x) => x === f).length > 1 ? ' ×' + felt.filter((x) => x === f).length : '')).join(', ') : '';
  say(cb, u.name + ' releases ' + d.name + ' (' + form.toUpperCase() + (tone !== 'raw' ? ' · ' + TONE[tone].name : '') + ')' + fn + ' at stage ' + stage + ' (×' + Math.round(sm * 100) / 100 + (res.bonus ? ', resonance +' + res.bonus.toFixed(1) : '') + ')' + (wild ? ' (wild)' : '') + (reaction ? ' (Heart Overwatch)' : '') + ': ' + line.filter(Boolean).join(' · ') + '.');
  // Residue: the strongest feeling poured in, on every tile the release covered, for 2 rounds (rules 1.8, item 807).
  const top = strongestFeeling(felt);
  if (top && FEELING[top].residue.kind !== 'none' && tiles.length) placeResidue(cb, u, top, form === 'aura' ? tiles : tiles.length ? tiles : [aim]);
  // Practice (rules 1.8 section 5): 1, +1 per stage past 1, +1 per feeling; none for a wild release.
  if (!wild) gainPractice(cb, u, 1 + Math.max(0, stage - 1) + felt.length);
  // 'outburst_after' {u, design, held, stage, aim, mult, riderStage, form, tone, area, targets, hits, wild, reaction, felt}:
  // after the primary hit, the second school, the tone's riders and the chains have landed (Twin Souls' third school,
  // Storm Front's arcs). `held` is the Outburst as it was held (null on a wild release with nothing held); `targets`
  // are everyone the area took in, `hits` those the primary school landed on (a missed roll is not a hit).
  emit(cb, 'outburst_after', { u, design: d, held: heldWas, stage, aim, mult: sm, riderStage: rs, form, tone, area: tiles, targets, hits, wild, reaction, felt, cb, rng });
}
/** The most wounded ally within `reach` of the caster (self counted when `self`), or null when nobody is hurt. */
function woundedAlly(cb: Combat, u: Unit, reach: number, self: boolean): Unit | null {
  return cb.units.filter((v) => !v.dead && v.side === u.side && (self || v !== u) && v.hp < v.maxHp && (v === u || dist(v.pos, u.pos) <= reach)).sort((a, b) => (b.maxHp - b.hp) - (a.maxHp - a.hp) || (a === u ? 1 : 0) - (b === u ? 1 : 0))[0] || null;
}
const loneLove = (cb: Combat, u: Unit, m: MagicUnit, d: OutburstDesign): Unit | null => woundedAlly(cb, u, heartReach(m, d), true);
/** What a feeling does to one creature the primary landed on (rules 1.8; enemies of the caster). Once per feeling. */
function pourOn(cb: Combat, rng: Rng, u: Unit, d: OutburstDesign, t: Unit, F: Set<string>, aim: string): string {
  let out = ''; const FP = (id: string): any => FEELING[id]?.pour || {}, has = (x: string) => d.modules.includes(x);
  // Rules 1.19: Grief no longer Slows (Control and Frost do) and Fear no longer pushes and Shakes (Control, Gale and
  // Status do); the old behaviour stays for data that still names a condition.
  if (F.has('grief') && !t.dead && FP('grief').condition) out += applyCond(cb, rng, u, t, FP('grief').condition, FP('grief').rounds ?? 2);
  if (F.has('fear') && !t.dead && FP('fear').condition) { out += magicShove(cb, t, formOf(d) === 'burst' ? aim : u.pos, FP('fear').push ?? 1, u); out += applyCond(cb, rng, u, t, FP('fear').condition, FP('fear').rounds ?? 2); }
  // Guilt (rules 1.19): targets hit are Taunted (Heart save): their next attack must be at you.
  if (F.has('guilt') && !t.dead && FP('guilt').condition) out += applyCond(cb, rng, u, t, FP('guilt').condition, FP('guilt').rounds ?? 1, undefined, { skipSave: !FP('guilt').save });
  if (F.has('cruelty') && !t.dead) {
    out += applyCond(cb, rng, u, t, 'bleeding', undefined, undefined, { skipSave: true });
    const v = cb.units.filter((x) => x !== t && !x.dead && x.side === t.side && dist(x.pos, t.pos) <= 1).sort((a, b) => dist(a.pos, t.pos) - dist(b.pos, t.pos))[0];
    if (v) out += applyCond(cb, rng, u, v, 'bleeding', undefined, undefined, { skipSave: true });
  }
  if (F.has('dread') && !t.dead) { loseReactions(cb, t, 'all'); dropHeldShot(cb, t, 'Dread'); out += ' · ' + t.name + ' loses its reaction (Dread)'; }
  if (F.has('awe') && !t.dead) { apDebt(t, FP('awe').ap_loss ?? 1); out += ' · ' + t.name + ' will lose ' + (FP('awe').ap_loss ?? 1) + ' AP (Awe)'; }
  if (F.has('longing') && !t.dead && FP('longing').pull) out += magicShove(cb, t, u.pos, -FP('longing').pull, u); // rules 1.19: reach only (Lure and Control pull)
  if (F.has('contempt') && !t.dead) out += applyCond(cb, rng, u, t, 'scorned', FP('contempt').rounds ?? 2, undefined, { skipSave: true });
  if (F.has('mercy') && !t.dead && !t.surrendered && t.hp > 0 && t.hp <= t.maxHp * (FP('mercy').surrender_at ?? 0.25) && canSurrender(t)) {
    t.surrenderTried = true;
    const sv = saveAgainst(cb, rng, u, t, 'heart', 'surrender', { via: 'will_power', tnAdd: NOSAVE_BY === u ? DEFY_PEN : 0 }), held = (NOSAVE_BY !== u || DEFY_PEN > 0) && sv.ok;
    out += held ? ' · ' + t.name + ' won\'t yield (' + sv.text + ')' : surrender(cb, t, u, 'Mercy');
  }
  // Modules that ride a landed hit (rules 1.8): Anchor pins, Lure pulls.
  if (has('anchor') && !t.dead) out += applyCond(cb, rng, u, t, 'pinned', (MODULE.anchor as any)?.rounds ?? 1);
  if (has('lure') && !t.dead) out += magicShove(cb, t, u.pos, -((MODULE.lure as any)?.pull ?? 2), u);
  return out;
}
/** After the strike (rules 1.8): Hope, Guilt, Shame, Jealousy, Wonder, Relief, Defiance's next save; Shell, Thread,
 * Linger. Returns log parts. */
function pourAfter(cb: Combat, rng: Rng, u: Unit, d: OutburstDesign, F: Set<string>, felt: string[], stage: number, tiles: string[], hits: Unit[], held: HeldOutburst | null, sm: number, aim?: string, wild = false): string[] {
  const out: string[] = [], m = u.mg!, FP = (id: string): any => FEELING[id]?.pour || {}, has = (x: string) => d.modules.includes(x), set = new Set(tiles);
  const clean = (x: string) => x.replace(/^ · /, '');
  if (F.has('hope')) for (const a of cb.units.filter((v) => !v.dead && v.side === u.side && (v === u || set.has(v.pos)))) {
    // Rules 1.19: one harmful condition each, the newest first (it was: Afraid and Shaken off, and Hopeful +2, which is Inspired's job).
    if (FP('hope').cleanse_any) { for (let i = 0; i < FP('hope').cleanse_any; i++) { const c = debuffsOf(a).sort((x, y) => (a.condAt?.[y] || 0) - (a.condAt?.[x] || 0))[0]; if (!c) break; endCond(a, c, cb); out.push(a.name + ' shakes off ' + condName(c) + ' (Hope)'); } continue; }
    for (const c of FP('hope').cleanse || ['fear', 'shaken']) if (condOn(a, c)) { endCond(a, c, cb); out.push(a.name + ' shakes off ' + condName(c)); }
    out.push(clean(applyCond(cb, rng, u, a, 'hopeful', FP('hope').rounds ?? 2, undefined, { skipSave: true })));
  }
  // Guilt healed in rules 1.8 to 1.17 (what Buff and Love do); rules 1.19: it Taunts (pourOn). The heal stays for data that still sets it.
  if (F.has('guilt') && FP('guilt').heal_per_stage) { const id = (u as any).feelHurtAlly, a = (id ? cb.units.find((v) => v.id === id && !v.dead) : null) || woundedAlly(cb, u, heartReach(m, d), false); if (a) out.push(clean(heal(a, FP('guilt').heal_per_stage * Math.max(1, stage), cb, u)) + ' (Guilt)'); out.push(u.name + ' pays' + harmFor('guilt', () => harm(cb, rng, null, u, FP('guilt').self_damage ?? 0, 'true'))); }
  // Fear (rules 1.19): the Release throws you back from where you aimed it. Forced movement: nobody reacts to it.
  if (F.has('fear') && FP('fear').recoil && !u.dead && !u.downed) { const from = aim && aim !== u.pos ? aim : hits.find((v) => v.pos !== u.pos)?.pos; if (from) { const s = magicShove(cb, u, from, FP('fear').recoil, null); if (s) out.push(clean(s) + ' (Fear)'); } }
  // Pride (rules 1.19): a Release that takes nobody down costs 2 Strain after it (the data's strain_unless_down).
  if (F.has('pride') && FP('pride').strain_unless_down && !wild && !u.dead && !hits.some((v) => v.side !== u.side && (v.dead || v.downed || v.hp <= 0 || v.surrendered))) { const s = addStrain(cb, rng, u, FP('pride').strain_unless_down, 'pride'); out.push(u.name + '\'s pride stings (+' + FP('pride').strain_unless_down + ' Strain)' + s); }
  // Shame (rules 1.17): each Shame poured in costs its own damage (it was 5 once, however many).
  if (F.has('shame') && !u.dead) out.push(u.name + ' pays' + harmFor('shame', () => harm(cb, rng, null, u, (FP('shame').self_damage ?? 0) * (FP('shame').per_pour ? felt.filter((x) => x === 'shame').length : 1), 'true')));
  if (F.has('jealousy')) { const t = hits.find((v) => v.side !== u.side); if (t) { const boon = Object.keys(t.conds || {}).find((c) => condOn(t, c) && isBoon(c) && c !== 'hidden'); if (boon) { const n = t.conds![boon]; endCond(t, boon, cb); restoreConds(u, { [boon]: Math.min(n, 3) }); out.push(u.name + ' steals ' + condName(boon) + ' from ' + t.name + ' (Jealousy)'); } else if ((t.shield || 0) > 0) { const n = t.shield!; t.shield = 0; out.push(clean(grantShield(cb, u, n, u) + '') + ' ' + u.name + ' steals ' + t.name + "'s shield (Jealousy)"); } } }
  if (F.has('wonder')) {
    for (const v of cb.units) if (v.hidden && v.side !== u.side && set.has(v.pos)) { endCond(v, 'hidden', cb); out.push(v.name + ' is revealed (Wonder)'); }
    for (const z of cb.zones || []) { const zz: any = z; if (z.side !== u.side && (z.kind === 'trap' || (z.kind === 'turret' && zz.hidden)) && z.tiles.some((k) => set.has(k)) && !(zz.spotted ||= []).includes(u.side)) { zz.spotted.push(u.side); emitFx(cb, 'trap_spotted', { id: z.id, tile: z.tiles[0], by: u.id, side: u.side, only: u.side, kind: z.kind }); out.push('a trap shows at ' + refOf(z.tiles[0]) + ' (Wonder)'); } }
    for (const h of (cb.hazards || []) as any[]) if (h.hidden && h.tiles.some((k: string) => set.has(k))) { h.hidden = false; emitFx(cb, 'hazard_spotted', { id: h.id, kind: h.kind, at: h.tiles[0], tiles: [...h.tiles], by: u.id, how: 'wonder' }); out.push('a hazard shows (Wonder)'); }
  }
  // Relief (rules 1.19): Relief poured in takes 2 Strain off (the data's strain_back; rules 1.17 had 1).
  if (F.has('relief')) { const n = FP('relief').strain_back != null ? FP('relief').strain_back * felt.filter((x) => x === 'relief').length : held?.strainIn || 0, back = n > 0 ? easeStrain(cb, u, n, 'relief') : 0; if (back) out.push(u.name + "'s Strain −" + back + ' (Relief)'); }
  if (F.has('defiance')) (u as any).feelSaveNext = true;
  // Modules after the release (rules 1.8): Shell shields you; Thread links two allies; Linger leaves a field.
  if (has('shell') && !u.dead) { const sh = grantShield(cb, u, shellShield(m, d, sm), u); out.push(u.name + ' is shelled (' + sh + ')'); }
  if (has('thread') && d.school === 'buff') { const two = hits.filter((v) => v.side === u.side && !v.dead).slice(0, 2); if (two.length === 2) { (two[0] as any).thread = two[1].id; (two[1] as any).thread = two[0].id; emitFx(cb, 'thread', { unit: u.id, a: two[0].id, b: two[1].id }); out.push(two[0].name + ' and ' + two[1].name + ' are threaded'); } }
  if (has('linger') && tiles.length && !(d.school === 'damage' && has('inverse'))) { /* an Inverse Damage design strikes nobody: no damaging field (item 1510) */ (cb.zones ||= []).push({ id: 'lz' + (cb.glyphSeq = (cb.glyphSeq || 0) + 1), kind: 'linger' as any, tiles: [...tiles], words: [], by: u.id, side: u.side, left: (MODULE.linger as any)?.rounds ?? 2, mult: 1, who: u.name, element: toneElement(toneOf(d)), linger: { school: d.school, tone: toneOf(d), hostile: d.school !== 'buff' } } as any); emitFx(cb, 'linger', { unit: u.id, tiles, tone: toneOf(d), element: toneElement(toneOf(d)) }); }
  void felt;
  return out.filter(Boolean);
}
/** Residue (rules 1.8, item 807): a zone of the feeling on the tiles, for 2 rounds; it replaces older residue on them. */
function placeResidue(cb: Combat, u: Unit, feeling: string, tiles: string[]) {
  const set = new Set(tiles);
  for (const z of cb.zones || []) if ((z.kind as string) === 'residue') z.tiles = z.tiles.filter((k) => !set.has(k));
  cb.zones = (cb.zones || []).filter((z) => (z.kind as string) !== 'residue' || z.tiles.length);
  const f = FEELING[feeling];
  cb.zones.push({ id: 'rz' + (cb.glyphSeq = (cb.glyphSeq || 0) + 1), kind: 'residue' as any, tiles: [...set], words: [], by: u.id, side: u.side, left: RESIDUE_ROUNDS, mult: 1, who: u.name, feeling, residueKind: f.residue.kind, str: unitStrength(u, 'will_power') } as any);
  emitFx(cb, 'residue', { unit: u.id, tiles: [...set], feeling, family: f.family, kind: f.residue.kind, side: u.side, rounds: RESIDUE_ROUNDS });
  say(cb, f.name + ' lingers on ' + set.size + ' tile' + (set.size === 1 ? '' : 's') + ' (' + f.residue.text.replace(/\.$/, '') + ', ' + RESIDUE_ROUNDS + ' rounds).');
}
/** Practice (rules 1.8): kept on the character. fx 'practice' {unit, gain, total}. */
let PRACTICE_HELD = 0;
/** Run fn with practice held back (a fused Evoke releases once per creature it covers but practises once: perks/d.ts),
 * then grant `after` practice once (0 for none). */
export function practiceOnce<T>(cb: Combat, u: Unit, fn: () => T, after: () => number): T {
  PRACTICE_HELD++; let r: T; try { r = fn(); } finally { PRACTICE_HELD--; }
  gainPractice(cb, u, after()); return r;
}
function gainPractice(cb: Combat, u: Unit, n: number) {
  if ((cb as any).dry || PRACTICE_HELD) return; // the area map's dry run (game.ts): only the real release practises
  const c = charOfUnit(u); if (!c || n <= 0 || u.companion) return;
  c.soulPractice = (c.soulPractice || 0) + n;
  emitFx(cb, 'practice', { unit: u.id, gain: n, total: c.soulPractice });
}
/** Residue on a creature's tile at the start of its turn, or as it steps in (rules 1.8, item 807). */
export function residueTick(cb: Combat, rng: Rng, u: Unit, when: 'turn' | 'entry') {
  if (u.dead) return;
  const z = residueAt(cb, u.pos); if (!z || !residueReaches(z, u)) return;
  const f = FEELING[z.feeling], r: any = f.residue, w: string = r.when || '';
  if (!(w === when || (w === 'turn_entry'))) { if (when === 'turn' && f.id === 'wonder') { /* below */ } else return; }
  const by = cb.units.find((x) => x.id === z.by) || null, line: string[] = [];
  if (r.damage) { if (r.only === 'last_hurt') { if (by && lastHurtBy(by) === u.id) line.push(harmFor('residue', () => harm(cb, rng, null, u, r.damage, 'soul'))); } else line.push(harmFor('residue', () => harm(cb, rng, null, u, r.damage, 'soul'))); }
  if (r.heal && !u.downed) line.push(heal(u, r.heal, cb, null));
  // Residue reads the strength stored when it was laid (rules 1.13), whatever became of its caster.
  const rs: CondOpts = { via: 'will_power', str: (z as any).str ?? unitStrength(by, 'will_power') };
  if (r.condition) line.push(applyCond(cb, rng, by, u, r.condition, r.rounds, undefined, { skipSave: !r.save, ...rs }));
  if (r.random) { const pick = r.random[die(rng, r.random.length) - 1]; line.push(applyCond(cb, rng, by, u, pick, r.rounds ?? 1, undefined, { skipSave: true, via: 'will_power' })); }
  if (r.strain && u.mg && r.strain < 0) { const n = easeStrain(cb, u, -r.strain, 'residue'); if (n) line.push(' · ' + u.name + "'s Strain −" + n); }
  if (r.reveal_radius) for (const v of cb.units) if (v.hidden && v.side !== u.side && dist(v.pos, u.pos) <= r.reveal_radius) { endCond(v, 'hidden', cb); line.push(' · ' + v.name + ' is revealed'); }
  const txt = line.filter(Boolean).join('');
  if (txt) { emitFx(cb, 'residue_tick', { unit: u.id, at: u.pos, feeling: f.id, kind: r.kind, when }); say(cb, f.name + ' residue at ' + refOf(u.pos) + ' (' + u.name + ')' + txt + '.'); }
}
/** A Fuse going off (its caster's turn start, or someone stepping in): the release it held. */
function fuseGo(cb: Combat, rng: Rng, z: any, why: string) {
  cb.zones = (cb.zones || []).filter((x) => x !== z);
  const u = cb.units.find((x) => x.id === z.by); if (!u || u.dead || u.downed || !u.mg) { say(cb, 'A fuse fizzles out.'); return; }
  const m = heart(u)!, d = findDesign(m, z.fuse.design); if (!d) return;
  const keep = m.held; m.held = z.fuse.held ? { ...z.fuse.held } : null;
  say(cb, u.name + "'s fused " + d.name + ' goes off (' + why + ').');
  const dd: any = { ...d, __fused: true, __fuseMult: z.fuse.mult ?? 1 };
  try { releaseAt(cb, rng, u, dd, z.fuse.aim, false); } finally { m.held = keep; }
}
/** Rules 1.8 at a turn start: residue underfoot, a caster's fuses, Linger fields. Every unit. */
export function feelTurnStart(cb: Combat, rng: Rng, u: Unit) {
  for (const z of [...(cb.zones || [])] as any[]) if (z.kind === 'fuse' && z.by === u.id) fuseGo(cb, rng, z, 'its time');
  for (const z of [...(cb.zones || [])] as any[]) if (z.kind === 'linger' && z.tiles.includes(u.pos) && !u.dead) {
    const by = cb.units.find((x) => x.id === z.by) || null, tick = (MODULE.linger as any)?.tick ?? 5;
    if (z.linger.hostile && u.side !== z.side) say(cb, z.who + "'s lingering Outburst" + harmFor('linger', () => harm(cb, rng, by, u, tick, z.linger.tone === 'raw' ? 'soul' : 'elemental', TONE[z.linger.tone]?.damage_type, z.linger.tone === 'raw' ? 'none' : 'half')) + (z.linger.tone !== 'raw' ? applyToneRiders(cb, rng, by, u, z.linger.tone, 1, z.tiles[0], ['armour_full', 'bonus_damage', 'ignore_cover', 'chain']) : '') + '.');
    else if (!z.linger.hostile && u.side === z.side && !u.downed) say(cb, z.who + "'s lingering Outburst" + heal(u, tick, cb, by) + '.');
  }
  residueTick(cb, rng, u, 'turn');
}
/** Rules 1.8 as a creature steps onto a tile: residue's on-entry effects; a Fuse whose area it entered goes off. */
export function feelEnter(cb: Combat, rng: Rng, u: Unit, k: string) {
  const fz = (cb.zones || []).find((z: any) => z.kind === 'fuse' && z.tiles.includes(k)) as any;
  if (fz && !u.dead) fuseGo(cb, rng, fz, u.name + ' stepped in');
  residueTick(cb, rng, u, 'entry');
}
/** The held heart at a turn start (rules 1.5): Strain −1 (always), the swell (+1 stage and +1 Strain, +2 Flooded,
 * unless steadied), the elemental aura's tick on adjacent enemies, the round's free Pumps back, and 'held_turn_start'
 * {u, held, cb, rng} for items. */
function heartTurnStart(cb: Combat, rng: Rng, u: Unit) {
  const m = heart(u); if (!m) return;
  m.freePumps = m.freePumpsMax || 0; m.freeUsed = 0; m.calmFight = false; m.calmTend = false; m.pumps = [];
  if (m.strain > 0) calm(cb, u, 1, 'turn', true);
  const h = m.held; if (!h) { m.cast = false; return; }
  const d = findDesign(m, h.design); if (!d) { m.held = null; m.cast = false; return; }
  h.turns = (h.turns || 0) + 1;
  if (h.steady) { delete h.steady; say(cb, u.name + "'s steadied heart holds at stage " + h.stage + '.'); }
  else {
    if (h.stage < MAX_STAGE) { h.stage++; emitFx(cb, 'swell', { unit: u.id, at: u.pos, stage: h.stage, mult: stageMult(h.stage), tone: h.tone || 'raw' }); say(cb, u.name + "'s held Outburst swells to stage " + h.stage + ' (×' + stageMult(h.stage) + ').'); }
    // 'outburst_hold' {u, strain} (mutable): the Strain of holding one more turn (hooks gap D7).
    // Rules 1.19: from Empathy 7 a swell adds no Strain.
    const oh: any = emit(cb, 'outburst_hold', { u, strain: m.swellFree ? 0 : flooded(cb) ? CYC.flooded_strain ?? 2 : CYC.swell_strain ?? 1, cb });
    if (oh.strain > 0) { const r = holdStrain(cb, rng, u, oh.strain, 'holding'); if (h.paid != null) h.paid += r.added; }
  }
  m.cast = false;
  if (!m.held || u.dead || u.downed) return;
  // The aura: an elemental heart leaks onto adjacent enemies (5 Elemental + the stage-1 rider, shifted by the air).
  const tone = h.tone || 'raw';
  if (tone !== 'raw') {
    const rs = riderStage(cb, 1), near = cb.units.filter((v) => !v.dead && v.side !== u.side && !v.surrendered && dist(v.pos, u.pos) <= (SR.aura?.radius ?? 1));
    if (near.length) emitFx(cb, 'aura_tick', { unit: u.id, at: u.pos, tone, element: toneElement(tone), targets: near.map((v) => v.id), riderStage: rs });
    for (const v of near) { const s = withElement(toneElement(tone), () => harm(cb, rng, u, v, AURA_TICK + bonusDmg(tone, rs), 'elemental', TONE[tone]?.damage_type, armourKind(tone, rs))) + applyToneRiders(cb, rng, u, v, tone, rs, u.pos, ['armour_full', 'bonus_damage', 'ignore_cover', 'chain']); say(cb, u.name + "'s held " + TONE[tone].name + ' leaks' + s + '.'); }
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
  /** Rules 1.8: the feelings held, the words for what they change ("now HEALS"), and the residue the release would leave. */
  felt?: string[]; does?: string[]; residue?: { feeling: string; kind: string; text: string; tiles: string[] };
  /** AP and MP of what is planned: from a design, Begin + Release (snap); from the held one, the Release. */
  ap: number; mp: number; strain: number; strainAfter: number; strainLimit: number;
  /** The Strain over the limit after it (each point burns 8 at the turn's end) and whether it would short (3 over). */
  burnWarning: number; shortWarning: boolean;
  stage: number; mult: number; riderStage: number; form: OutburstForm; tone: string; element: string | null;
  design?: string; school?: string; school2?: string | null;
  reach: number; reachTiles: string[]; area: string[]; affected: OutburstAffected[];
  resonance: boolean; resonanceBonus: number; riderText: string; needsAim: boolean;
  /** What items add to the multiplier, in words ("Resonance +10%": the perk, rules 1.14); already inside `mult`. */
  multNotes?: string[];
}
/** The full preview (rules 1.5, section 7): what a snap cast of a design, or a release of the held Outburst, would do
 * at its stage (or at opts.stage: "if I pump twice"): AP, MP, Strain after and the warnings, the multiplier, the reach
 * ring, the tinted area, everyone affected with their expected numbers, saves and this stage's rider, resonance. */
export function previewOutburstPlan(cb: Combat, u: Unit, src: string | 'held', aim?: string, opts: { stage?: number; mods?: string[] } = {}): OutburstPlan {
  work('outburstPlan');
  // The toggles on the action being planned (Heart Surge, Verse…) are read as the real action reads them (cb.mods).
  if (!opts.mods) return planInner(cb, u, src, aim, opts);
  // (on the fight with the switches set: a copy of its top level, so the fight a screen holds is never written)
  return planInner({ ...cb, mods: [...opts.mods] }, u, src, aim, opts);
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
  let stage = Math.max(0, Math.min(MAX_STAGE, opts.stage ?? stage0)), itemMult = 1, multNotes: string[] = [];
  const res = resonanceFor(cb, u);
  let ap = 0, mp = 0, strain = 0, range = designRange(m, d), why: string | undefined;
  if (held && m.held) {
    const e = canCast(u, cb); if (e) why = e;
    // 'release_cost' (preview) {…, surge, mult, notes}: an item that raises the release's stage says so (Heart Surge:
    // true below stage 4; past it, the multiplier to use); one that multiplies the release ('outburst_release' mult)
    // says by how much in `mult`, with a line for the preview in `notes` (the Resonance perk, rules 1.14).
    const longing = (m.held.felt || []).includes('longing') ? (FEELING.longing?.pour as any)?.reach ?? 2 : 0; // rules 1.8
    const rc: any = emit(cb, 'release_cost', { u, design: d, ap: SOUL_AP.release, range: designRange(m, d) + longing, fail: '', preview: true, surge: 0, mult: 1, notes: [] as string[], cb });
    ap = Math.max(0, rc.ap) + pumpsAp(cb, u, d, Math.max(0, stage - stage0), stage0); range = rc.range;
    mp = pumpsMp(u, Math.max(0, stage - stage0), stage0); // rules 1.24: the Pumps still to make cost MP
    if (rc.fail) why ||= rc.fail; else if (!canPay(cb, u, ap)) why ||= whyNot(cb, u, ap)!; else if (mp > m.mp) why ||= 'The Pumps need ' + mp + ' MP (' + Math.floor(m.mp) + ').';
    if (!why) why = aimError(cb, u, d, form === 'aura' ? u.pos : aim, rc.range) || undefined;
    if (rc.surge) { if (stage < MAX_STAGE) stage++; else itemMult = typeof rc.surge === 'number' ? rc.surge / stageMult(MAX_STAGE) : 1; }
    itemMult *= rc.mult || 1; multNotes = rc.notes || [];
  } else {
    const pv = previewOutburst(cb, u, d.id, form === 'aura' ? u.pos : aim, true);
    ap = pv.ap + pumpsAp(cb, u, d, stage, 0); mp = pv.cost + (pv.hp ? 0 : pumpsMp(u, stage, 0, pv.cost)); strain = pv.strain + (m.debt || 0); if (pv.range) range = pv.range;
    // a snap cast's item multiplier (Heart Surge's snap); with Pumps planned, only what holds at any stage (Resonance)
    itemMult = stage ? pv.relAll || 1 : pv.relMult || 1; multNotes = pv.relNotes || [];
    if (!pv.ok) why = pv.why; else if (!canPay(cb, u, ap)) why = whyNot(cb, u, ap)!; else if (m.emanator && !pv.hp && mp > m.mp) why = 'Needs ' + mp + ' MP (' + Math.floor(m.mp) + ') with its Pumps: Syphon first.';
  }
  // Rules 1.8: the held feelings' steps (Spite per target, below), Quiet ×0.8.
  const felt = held && m.held ? [...(m.held.felt || [])] : [], F = new Set(felt), quiet = d.modules.includes('quiet') ? (MODULE.quiet as any)?.damage_mult ?? 0.8 : 1;
  const smOf = (t?: Unit | null) => (stageMult(stage) + feelDelta(cb, u, felt, stage, t) + (held && m.held ? m.held.plus || 0 : 0) + res.bonus) * itemMult * quiet * calmMult(d, felt);
  const sm = smOf(null), rs = riderStage(cb, stage + riderBonus(cb, u, false));
  // The reach ring is the range the aim check uses (items' changes included): Bolt and Burst; the shapes their size.
  const reach = form === 'bolt' || form === 'burst' ? range : heartReach(m, d);
  const reachTiles: string[] = []; { const [x, y] = XY(u.pos); for (let i = x - reach; i <= x + reach; i++) for (let j = y - reach; j <= y + reach; j++) { const k = i + ',' + j; if (onGrid(cb, k) && k !== u.pos && standable(cb.map, k)) reachTiles.push(k); } }
  const strainAfter = m.strain + strain, over = strainAfter - m.strainLimit;
  const at = form === 'aura' ? u.pos : aim;
  const base: Partial<OutburstPlan> = { ap, mp, strain, strainAfter, strainLimit: m.strainLimit, burnWarning: Math.max(0, over) * STRAIN_BURN, shortWarning: over >= SHORT_AT_OVER, stage, mult: Math.round(sm * 100) / 100, riderStage: rs, form, tone, element: toneElement(tone),
    design: d.id, school: d.school, school2: d.school2 || null, reach, reachTiles, resonance: res.with.length > 0, resonanceBonus: res.bonus, riderText: tone === 'raw' ? 'Raw: Soul damage, armour ignored; no rider.' : TONE[tone].name + ' at stage ' + rs + ': ' + toneRiders(tone, rs).text, needsAim: form !== 'aura', ...(multNotes.length ? { multNotes } : {}) };
  // Rules 1.8: the feelings held and the words for what they change, with or without an aim.
  if (felt.length) { base.felt = felt; base.does = [...new Set(felt.map((x) => feelingWord(d, x)).filter(Boolean) as string[])]; }
  if (!at) return no(why || 'Pick a target tile.', base);
  const area = outburstArea(cb, u, d, at, stage), targets = affectedBy(cb, u, d, area);
  const hostile = d.school !== 'buff' && !(d.school === 'damage' && d.modules.includes('inverse'));
  const defy = F.has('defiance') ? DEFY_PEN : 0; // rules 1.19: Defiance makes every save of the Release harder
  const strikes = d.modules.includes('volley') && form === 'bolt' ? ((MODULE.volley as any)?.bolts ?? 3) * ((MODULE.volley as any)?.bolt_mult ?? 0.4) : d.modules.includes('return') && (form === 'bolt' || form === 'lance') ? 1 + ((MODULE.return as any)?.second_mult ?? 1) : 1;
  const affected: OutburstAffected[] = targets.map((t) => {
    const smT = smOf(t);
    const a: OutburstAffected = { unit: t.id, name: t.name, at: t.pos, ally: t.side === u.side && t !== u, enemy: t.side !== u.side, self: t === u, dmg: 0, dmgAfterArmour: 0, heal: 0, shield: 0, roll: null, saves: [], rider: '', second: '', via: 'area' };
    const one = (school: string, option: string | undefined, f: number, primary: boolean) => {
      if (school === 'damage') {
        // Love on a hostile design (rules 1.8): an ally inside is healed (a quarter of the Buff heal: rules 1.20), not harmed.
        if (F.has('love') && hostile && t.side === u.side) { if (primary) a.heal += Math.floor(loveHeal(m, d, sm) * (manaBand(manaOf(cb)).healing_given_mult ?? 1)); return; }
        const raw = outburstDamage(m, d, smT) * f * (primary ? strikes : 1) * (d.modules.includes('inverse') ? 1 : damageModeMult(option, t)); // rules 1.19: the way it strikes
        if (d.modules.includes('inverse')) { if (t.side === u.side) { a.shield += Math.floor(inverseShield(m, d, smT) * f); if (primary && F.has('love')) a.heal += Math.floor(loveHeal(m, d, sm, false, true) * (manaBand(manaOf(cb)).healing_given_mult ?? 1)); } return; }
        // Floored as harm() floors it, so the chip reads the engine's number.
        const n = Math.floor(raw + (primary ? bonusDmg(tone, rs) : 0)), ak = armourKind(tone, rs), arm = armourAgainst(t, ak);
        a.dmg += n; a.dmgAfterArmour += Math.max(1, n - arm);
        if (primary && rolls(d) && !(F.has('calm') && (FEELING.calm?.pour as any)?.no_miss)) { a.roll = rollFor(cb, u, d, t, toneRiders(tone, rs).riders.some((r) => r.rider === 'ignore_cover') || bankShot(cb, d, at)); if (F.has('calm')) a.roll.pct = twiceBetter(a.roll.pct); } // Calm (rules 1.19): the better of two rolls
      } else if (school === 'buff') { if (optOf('buff', option) === 'heal' && t.side === u.side) a.heal += Math.floor((outburstHeal(m, d, sm) * f + (primary && F.has('love') ? loveHeal(m, d, sm, false, true) : 0)) * (manaBand(manaOf(cb)).healing_given_mult ?? 1)); }
      else if (school === 'control') { const o = optOf('control', option); if (!(o === 'swap' && t.side === u.side)) a.saves.push({ cond: o, fam: 'body', tn: saveTn(u, 'will_power') + stageSaveTn(stage) + defy }); }
      else if (school === 'status') { const o = optOf('status', option), fam: Fam = d.modules.includes('left') ? 'brain' : d.modules.includes('right') ? 'heart' : (condFamily(OPT_COND[o] || o) || 'heart'); a.saves.push({ cond: OPT_COND[o] || o, fam, tn: saveTn(u, 'will_power') + stageSaveTn(stage) + defy }); }
    };
    one(d.school, d.option, 1, true);
    if (secondOf(d) && !(sameWayTwice(d) && d.school !== 'damage' && !(d.school === 'buff' && optOf('buff', d.option) === 'heal') && !['push', 'pull', 'swap'].includes(optOf(d.school, d.option)))) { one(d.school2!, d.option2, half, false); a.second = (SCHOOL[d.school2!]?.name || d.school2) + ' (' + optOf(d.school2!, d.option2) + ') at half'; }
    if (tone !== 'raw' && t.side !== u.side) { a.rider = toneRiders(tone, rs).text; for (const r of toneRiders(tone, rs).riders) if (r.rider === 'cond' && r.save && r.condition) { const fam = condFamily(r.condition) || 'body'; a.saves.push({ cond: r.condition, fam, tn: saveTn(u, 'will_power') }); } }
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
      add({ ...blankAffected(u, v, 'spread'), rider: condName(spread.condition) + (spread.rounds ? ' ' + spread.rounds + ' rounds' : '') + ' (spreads from ' + t.name + ')', saves: spread.save ? [{ cond: spread.condition, fam: (condFamily(spread.condition) || 'body') as Fam, tn: saveTn(u, 'will_power') }] : [] });
    if (pushAll) for (const v of cb.units) if (v !== t && v !== u && !v.dead && dist(v.pos, t.pos) <= (pushAll.radius || 1))
      add({ ...blankAffected(u, v, 'push'), rider: 'pushed ' + pushAll.tiles + ' tiles away from ' + t.name + ' (' + TONE[tone].name + ')' });
  }
  // Love with no ally in the shape (rules 1.17): who it heals instead, and by how much.
  if (F.has('love') && hostile && !targets.some((t) => t.side === u.side)) { const a = loneLove(cb, u, m, d); if (a) add({ ...blankAffected(u, a, 'area'), heal: Math.floor(loveHeal(m, d, sm, true) * (manaBand(manaOf(cb)).healing_given_mult ?? 1)), rider: 'healed by Love' }); }
  emit(cb, 'outburst_plan', { u, design: d, stage, mult: sm, riderStage: rs, aim: at, area, targets, affected, add, preview: true, cb });
  // Rules 1.8: where the residue of the strongest feeling would lie.
  const top = strongestFeeling(felt);
  const res18 = top && FEELING[top].residue.kind !== 'none' ? { residue: { feeling: top, kind: FEELING[top].residue.kind, text: FEELING[top].residue.text, tiles: form === 'bolt' ? [at] : area } } : {};
  return { ...(base as OutburstPlan), ok: !why, ...(why ? { why } : {}), area, affected, ...res18 };
}
function blankAffected(u: Unit, t: Unit, via: OutburstAffected['via']): OutburstAffected {
  return { unit: t.id, name: t.name, at: t.pos, ally: t.side === u.side && t !== u, enemy: t.side !== u.side, self: t === u, dmg: 0, dmgAfterArmour: 0, heal: 0, shield: 0, roll: null, saves: [], rider: '', second: '', via };
}
/** One creature a release strikes past its area, as the preview shows it (a chain, an item's arc): the design's damage
 * at the multiplier × f (+ the tone's bonus damage when bonus), its roll when roll, and the given riders' saves. */
export function planStrike(cb: Combat, u: Unit, d: OutburstDesign, t: Unit, sm: number, rs: number, o: { f?: number; roll?: boolean; bonus?: boolean; riders?: ToneRider[]; via?: OutburstAffected['via']; note?: string } = {}): OutburstAffected {
  const m = u.mg!, tone = toneOf(d), a = blankAffected(u, t, o.via || 'arc');
  const n = Math.floor(outburstDamage(m, d, sm) * (o.f ?? 1) + (o.bonus ? bonusDmg(tone, rs) : 0)), ak = armourKind(tone, rs), arm = armourAgainst(t, ak);
  a.dmg = n; a.dmgAfterArmour = Math.max(1, n - arm);
  if (o.roll) a.roll = rollFor(cb, u, d, t, toneRiders(tone, rs).riders.some((r) => r.rider === 'ignore_cover'));
  const rr = o.riders ?? (tone !== 'raw' ? toneRiders(tone, rs).riders : []);
  for (const r of rr) if (r.rider === 'cond' && r.save && r.condition) { const fam = (condFamily(r.condition) || 'body') as Fam; a.saves.push({ cond: r.condition, fam, tn: saveTn(u, 'will_power') }); }
  a.rider = [o.note, tone !== 'raw' && rr.length ? (o.riders ? rr.map((r) => r.condition ? condName(r.condition) : '').filter(Boolean).join(', ') : toneRiders(tone, rs).text) : ''].filter(Boolean).join(' · ');
  return a;
}
/** Syphon (1 AP): MP from the air by the band, × the Syphon bonus; the meter drops 2. */
export function syphon(cb: Combat, u: Unit): string | null {
  const m = u.mg; if (!m || !m.emanator) return NEEDS_EMANATOR;
  const ap = price({ cb, u }, 'syphon').ap; { const no = whyNot(cb, u, ap); if (no) return no; } if (m.mp >= m.mpMax) return 'Your Emanator is full.';
  pay(cb, u, ap); const gain = Math.round(manaBand(manaOf(cb)).syphon_mp * m.syphon), was = m.mp; m.mp = Math.min(m.mpMax, m.mp + gain);
  emitFx(cb, 'syphon', { unit: u.id, at: u.pos, mp: m.mp - was }); shiftMana(cb, -2); say(cb, u.name + ' syphons ' + (m.mp - was) + ' MP from the air (' + m.mp + '/' + m.mpMax + ').');
  return null;
}
/** Crystallise (3 AP, the meter at 10+): the meter drops 10 and you make one standard core. */
export function crystallise(cb: Combat, u: Unit): string | null {
  const m = u.mg; if (!m || !m.emanator) return NEEDS_EMANATOR;
  const cap = price({ cb, u }, 'crystallise').ap; // items price it (hooks gap D8)
  { const no = whyNot(cb, u, cap); if (no) return no; } if (manaOf(cb) < 10) return 'The air is too thin (mana ' + manaOf(cb) + ', needs 10).';
  pay(cb, u, cap); m.coresMade++; emitFx(cb, 'crystallise', { unit: u.id, at: u.pos, dur: 1400 }); shiftMana(cb, -10); say(cb, u.name + ' crystallises a mana core from the air.');
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

// ---------- rules 1.8 hooks: Hopeful spent, Thread, residue's standing effects ----------
const spendHope = (u: Unit | null | undefined, cb: Combat) => { if (u && condOn(u, 'hopeful')) endCond(u, 'hopeful', cb); };
onHook('on_hit', (ctx, cb) => spendHope(ctx.att, cb));
onHook('on_miss', (ctx, cb) => spendHope(ctx.att, cb));
onHook('spell_roll', (ctx, cb) => spendHope(ctx.u, cb));
onHook('heal_given', (ctx, cb) => {
  const t: Unit = ctx.t, id = (t as any)?.thread; if (!t || !id || !(ctx.n > 0) || ctx.threaded) return;
  const o = cb.units.find((v) => v.id === id); delete (t as any).thread; if (o) delete (o as any).thread;
  if (o && !o.dead) { const r = healUnit(cb, o, ctx.n, ctx.by || null, 'thread'); emitFx(cb, 'heal', { target: o.id, at: o.pos, amount: r.restored }); say(cb, o.name + ' heals ' + r.restored + ' along the thread.'); }
});
onHook('death_save', (ctx, cb) => { if (residueFlag(cb, ctx.u, 'stabilise')) ctx.add = (ctx.add || 0) + 20; });
onHook('cond_apply', (ctx, cb) => { if ((ctx.id === 'fear' || ctx.id === 'afraid') && residueFlag(cb, ctx.t, 'immune') === 'fear') { ctx.cancel = true; ctx.why = 'Defiance underfoot'; } });

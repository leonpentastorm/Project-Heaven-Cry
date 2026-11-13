// AMOUNT BLOCKS (step a6 of the damage-formula migration; docs/design/proposals/2026-11-unified-damage.md 2.5).
// Every number an item deals, heals or shields with lives in the item's DATA, as a named block:
//
//   "amounts": { "<name>": { "kind": "damage" | "heal" | "shield", "base": 10,
//                            "per": [{ "of": "improvisation", "value": 3 }],      per-point parts that add to the base
//                            "profile": "flat",                                   data/rules.json output.profiles
//                            "type": "elemental", "armour": "half",               how it lands (documentation for the sink's caller)
//                            "mults": { "arc": 0.5 },                             the item's own named multipliers
//                            "provisional": true } }
//
// and the engine reads it through ONE helper, itemAmount(key, name, own multipliers): the block's base (with its
// per-point parts) × the multipliers the caller names, in the order it lists them, on the one formula
// (effects/output.ts amountOf, the 'chain' order: what these sites always did, so no number moved). The Stat term is
// handed in by the caller from the unit (its cached multiplier), as everywhere in stage (a).
//
// Where a block lives, by its key:
//   perk:<id>            perks.json items[id].amounts
//   trait:<id>           traits.json items[id].amounts
//   class:<cls>.<move>   classes.json: the move's amounts (a base class's own move, the move pool, an advanced class)
//   skill:<id>.<points>  skills.json items[id].unlocks[points].amounts
//   condition:<id>       conditions.json items[id].amounts
//   word:<id>            sigils.json items[id].amounts
//   feeling:<id>         feelings.json: the feeling's amounts
//   patron:<id>.<prayer> patrons.json: a Hymn's or Miracle's amounts ("whisper.<id>" for the shared Whispers)
//   rule:<name>          rules.json output.amounts[name] (what belongs to no item: the Flux overload, a second school's heal)
//
// A block that is not there is a bug in the data, never a silent 0: itemAmount throws, the validator
// (tools/validate.py) checks every block's shape, and test/amount-literals.test.ts checks that every (key, name) the
// engine's source asks for exists and that no new numeric literal is passed to a damage, heal or shield sink.
import '../datatext'; // fills the texts' {=placeholders} before any data is read
import { PERK, TRAITS, SKILL, RULES, SIGIL } from '../data';
import { CONDITION_ROWS } from '../condtable';
import feelingsJ from '../../../../data/feelings.json';
import patronsJ from '../../../../data/patrons.json';
import { classMove, rawItem } from './collect';
import { amountOf, type AmountSpec, type Term } from './output';

/** An item's `amounts` block as data writes it (data/CONVENTIONS.md "Amount blocks"): kind, base, per, profile, type, armour, mults. */
export interface AmountBlock {
  kind: 'damage' | 'heal' | 'shield'; base: number; per?: { of: string; value: number }[]; profile?: string;
  type?: string; armour?: 'full' | 'half' | 'none'; mults?: Record<string, number>; provisional?: boolean; text?: string;
  /** Classes 3.0 step 5 (rules 1.31): the damage's element tag (its dmgType: lightning…), when it is not its type. */ element?: string;
  /** The heal's kind for heal_in (tending, prayer…), passed by the item op mend (Classes 3.0 batch row). */ heal_kind?: string;
  /** The percent gate (heal and shield: effects/output.ts mendGate): at least this share of the target's max HP; gate_hp: the max HP it counts up to (null: all of it). */ min_pct?: number; gate_hp?: number | null;
}
const TRAIT_BY: Record<string, any> = Object.fromEntries((TRAITS as any[]).map((t) => [t.id, t]));
const COND_BY: Record<string, any> = Object.fromEntries(CONDITION_ROWS.map((c) => [c.id, c]));
const FEELING_BY: Record<string, any> = Object.fromEntries((((feelingsJ as any).items || (feelingsJ as any).feelings || []) as any[]).map((f) => [f.id, f]));
const PATRON_BY: Record<string, any> = Object.fromEntries(((patronsJ as any).items as any[]).map((p) => [p.id, p]));
/** The data object a key names (see the head of this file), or null. */
export function amountHome(key: string): any | null {
  const i = key.indexOf(':'), kind = key.slice(0, i), id = key.slice(i + 1);
  if (kind === 'perk') return (PERK as any)[id] || null;
  if (kind === 'trait') return TRAIT_BY[id] || null;
  if (kind === 'class') { const [cls, mv] = id.split('.'); return classMove(cls, mv)?.move || null; }
  if (kind === 'skill') { const [sid, lvl] = id.split('.'); return (SKILL as any)[sid]?.unlocks?.[lvl] || null; }
  if (kind === 'condition') return COND_BY[id] || null;
  if (kind === 'verb' || kind === 'relic') return rawItem(key); // a door verb (rules 1.33: Tending's amounts) or a relic
  if (kind === 'word') return (SIGIL as any)[id] || null;
  if (kind === 'feeling') return FEELING_BY[id] || null;
  if (kind === 'patron') {
    const [pid, pr] = id.split('.');
    if (pid === 'whisper') return ((patronsJ as any).whispers || []).find((w: any) => w.id === pr) || null;
    const p = PATRON_BY[pid]; if (!p) return null;
    return (p.hymns || []).find((h: any) => h.id === pr) || (p.miracle?.id === pr ? p.miracle : null) || (pr === 'intervention' ? p.intervention : null) || null;
  }
  if (kind === 'rule') return { amounts: (RULES as any).output?.amounts?.[id] || {} };
  return null;
}
const cache = new Map<string, AmountBlock>();
/** An item's amount block by name. Throws when the data has none (a bug in the data: never a silent 0). */
export function amountBlock(key: string, name: string): AmountBlock {
  const ck = key + '#' + name, hit = cache.get(ck); if (hit) return hit;
  const b = amountHome(key)?.amounts?.[name];
  if (!b || typeof b.base !== 'number') throw new Error('No amount block "' + name + '" on ' + key + ' (data: every number an item deals, heals or shields with is an `amounts` entry).');
  cache.set(ck, b); return b;
}
/** The block as the formula's spec (chain order; left raw: the sink floors it, as these sites always did). */
export function amountSpecOf(key: string, name: string): AmountSpec {
  const b = amountBlock(key, name);
  return { kind: b.kind, base: b.base, ...(b.per ? { per: b.per } : {}), ...(b.profile ? { profile: b.profile } : {}), round: 'none', ...(b.provisional ? { provisional: true } : {}) };
}
/** THE ONE HELPER: an item's amount from its data block, × the multipliers the caller names (in that order: the Stat
 * term from the unit first where the item has one). `counts` feeds the block's per-point parts. Raw (not floored). */
export function itemAmount(key: string, name: string, own: Term[] = [], counts?: Record<string, number>): number {
  return amountOf(amountSpecOf(key, name), null, { level: null, mults: own, ...(counts ? { counts } : {}) }).raw;
}
// ---------------------------------------------------------------------------------------------- number blocks (P3)
/** A NUMBER BLOCK (Classes 3.0 P3, docs/design/rev4-primitives.md): any numeric field of an item op (and a number a
 * handler reads from its data) may be a plain number or
 *   { "base": 1, "per": [{ "of": "res:shadow", "value": 0.15 }, { "of": "event:ambush", "value": 0.5 }], "min": 0, "max": 2 }
 * = base + Σ value × source(of), held between min and max. What `of` names (effects/triggers.ts sourceOf): res:<id> (the
 * holder's resource now), event:<field> (the trigger's payload: amount, over, ambush…), self:<field> / actor:<field> /
 * target:<field> (a unit's field such as max_hp, or 1 / 0 for a condition id), or a plain name the caller counts. */
export interface NumberBlock { base: number; per?: { of: string; value: number }[]; min?: number; max?: number;
  /** Rules 1.33 (a door's ladder): each step adds its value once its source reaches `at` ({of: "skill:empathy", at: 6,
   * value: 3}: Bond's reach 6, 9 from Empathy 6). */ steps?: { of: string; at: number; value: number }[] }
/** Is this a number block (and not an amount block, which has a `kind`)? */
export const isNumberBlock = (x: any): x is NumberBlock => !!x && typeof x === 'object' && !Array.isArray(x) && typeof x.base === 'number' && !('kind' in x);
/** A number block's value (a plain number is itself): base + Σ value × source(of), between min and max. `src` answers
 * each `of` (a handler: its counts; the item-op runner: sourceOf). Anything else (null, a word) is NaN: the caller's bug. */
export function numberOf(x: number | NumberBlock, src: (of: string) => number = () => 0): number {
  if (typeof x === 'number') return x;
  if (!isNumberBlock(x)) return NaN;
  let v = (x.per || []).reduce((t, p) => t + p.value * (src(p.of) || 0), x.base);
  for (const st of x.steps || []) if ((src(st.of) || 0) >= st.at) v += st.value;
  if (typeof x.min === 'number') v = Math.max(x.min, v);
  if (typeof x.max === 'number') v = Math.min(x.max, v);
  return v;
}
/** One of a block's own named multipliers (data `mults`). Throws when the data has none. */
export function amountMult(key: string, name: string, mult: string): number {
  const v = amountBlock(key, name).mults?.[mult];
  if (typeof v !== 'number') throw new Error('No multiplier "' + mult + '" in amount block "' + name + '" on ' + key + '.');
  return v;
}

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
import { PERK, TRAITS, SKILL, RULES, SIGIL } from '../data';
import conditionsJ from '../../../../data/conditions.json';
import feelingsJ from '../../../../data/feelings.json';
import patronsJ from '../../../../data/patrons.json';
import { classMove } from './collect';
import { amountOf, type AmountSpec, type Term } from './output';

export interface AmountBlock {
  kind: 'damage' | 'heal' | 'shield'; base: number; per?: { of: string; value: number }[]; profile?: string;
  type?: string; armour?: 'full' | 'half' | 'none'; mults?: Record<string, number>; provisional?: boolean; text?: string;
}
const TRAIT_BY: Record<string, any> = Object.fromEntries((TRAITS as any[]).map((t) => [t.id, t]));
const COND_BY: Record<string, any> = Object.fromEntries(((conditionsJ as any).items as any[]).map((c) => [c.id, c]));
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
/** One of a block's own named multipliers (data `mults`). Throws when the data has none. */
export function amountMult(key: string, name: string, mult: string): number {
  const v = amountBlock(key, name).mults?.[mult];
  if (typeof v !== 'number') throw new Error('No multiplier "' + mult + '" in amount block "' + name + '" on ' + key + '.');
  return v;
}

// AN ITEM'S OWN NUMBERS (engine foundations 3; engine review 1, F5 "for what stays bespoke: num(h, key)").
// A lane handler that is not data yet still reads every number it uses from its item's data, never from a literal:
//
//   "numbers": { "cut": 0.2, "less": 25 }          on the item (perks.json, traits.json, a class move in classes.json)
//   "tiers": { "II": { "numbers": { "cut": 0.3 } } }   a perk's tier overrides the item's numbers for that tier
//
//   num(h, 'cut')        the number for the tier the holder has; THROWS when the data has none (never a silent 0)
//
// test/lint-item-ops.test.ts checks that every num(h, '<key>') a handler asks for is in its item's data (at some tier),
// and tools/validate.py that every `numbers` value is a number. A number that is an amount of damage, healing or a
// shield is an amount block (effects/amounts.ts itemAmount), not a `numbers` entry.
import '../datatext';
import { rawItem } from './collect';

/** The item's number `key` at the holder's tier (a perk's tier block first, then the item's own). */
export function num(h: { key: string; tier?: string | null }, key: string): number {
  const it = rawItem(h.key);
  const v = (h.tier && it?.tiers?.[h.tier]?.numbers?.[key]) ?? it?.numbers?.[key];
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error(h.key + (h.tier ? '@' + h.tier : '') + ': num("' + key + '") is not in its data (add it to the item\'s `numbers`)');
  return v;
}

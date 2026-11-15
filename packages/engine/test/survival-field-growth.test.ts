// Rules 1.55 item 42: the counted items are data. (The field's growth, harm and fight-screen tests of 0.28.2 are in
// survival-field-fight.test.ts since 0.28.3: the field is the fight itself, rules 1.55 items 61 to 67.)
import { describe, expect, it } from 'vitest';
import { COUNTED } from '../src';
import itemsJ from '../../../data/items.json';

describe('rules 1.55 item 31 (rules 1.56, the 0.28.2 merge): the counted items are data', () => {
  it('COUNTED is items.json `counts_into`, row by row', () => {
    const rows = (itemsJ as any).items.filter((x: any) => x.counts_into);
    expect(rows.length).toBeGreaterThan(0);
    expect((itemsJ as any).items.some((x: any) => 'counted' in x)).toBe(false);
    expect({ ...COUNTED }).toEqual(Object.fromEntries(rows.map((x: any) => [x.id, x.counts_into.count])));
  });
});

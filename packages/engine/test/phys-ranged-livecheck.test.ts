// Physical 2.0 ranged: fixes from the live check in the real game (10 Nov 2026).
import { describe, it, expect } from 'vitest';
import { damageObject, pluralName } from '../src/combat';
import { makeObject } from '../src/objects';

const cbWith = (name: string, hp: number) => ({ objects: [makeObject('o1', 'low_wall', '3,3', { name, hp, max: hp } as any)], units: [], fx: [], fxSeq: 0, log: [], round: 1, map: { w: 8, h: 8 } } as any);

describe('cover in the log: the verb agrees with the name', () => {
  it('pure: plural names', () => {
    for (const n of ['sandbags', 'crates', 'barrels']) expect(pluralName(n)).toBe(true);
    for (const n of ['low wall', 'rubble', 'glass', 'cactus', 'chassis', 'crate']) expect(pluralName(n)).toBe(false);
  });
  it('"the sandbags break into rubble", "the sandbags take 10"; "the low wall breaks"', () => {
    expect(damageObject(cbWith('Sandbags', 30), '3,3', 10)).toBe(' · the sandbags take 10 (20/30)');
    expect(damageObject(cbWith('Sandbags', 30), '3,3', 40)).toBe(' · the sandbags break into rubble');
    expect(damageObject(cbWith('Low wall', 30), '3,3', 40)).toBe(' · the low wall breaks into rubble');
  });
});

// The Sigil damage balance pass (docs/design/balance-targets.md; spec items 587-590): Elemental power on the Physical
// slope, Sigil and Elemental bonuses added (not multiplied), one main element per spell. (The 350 / 500 targets of 8 Nov were withdrawn as a cap by rules 1.17 and as a line by rules 1.94.)
import { describe, expect, it } from 'vitest';
import './helpers/grammar-only'; // rules 1.17: the Line multiplier is off here (these tests pin the grammar's own numbers)
import { elementalMult, sigilMult, SIGIL, type Character } from '../src';
import { sigilPower, sigilParts, capParts } from '../src/sigil';
import { PROFILES } from '../src';

const maxed = { sigilMult: 1 + 0.1 * 9 + 0.1 * 10, elemMult: 1 + 0.1 * 9 + 0.05 * 10 }; // Intelligence 10, Brain Power 10, Expression 10, Visualization 10

describe('Sigil balance', () => {
  it('Elemental power adds to Sigil power instead of multiplying; since rules 1.26 neither has a slope (a Line rolls: skill buys accuracy, level buys damage)', () => {
    const c = { attrs: { expression: 10, intelligence: 10 }, skills: { visualization: 10, brain_power: 10 }, perks: [], traits: [] } as unknown as Character;
    expect(elementalMult(c)).toBe(PROFILES.elemental.k); expect(sigilMult(c)).toBe(PROFILES.sigil.k);
    expect(sigilPower(maxed, 'elemental')).toBeCloseTo(1 + 1.9 + 1.4); expect(sigilPower(maxed, 'sigil')).toBeCloseTo(2.9);
    expect(sigilPower(null, 'elemental')).toBe(1);
  });
  it('one main element: the strongest damaging glyph in full, every other one at half', () => {
    expect(sigilParts(['fire', 'condense'])).toEqual([{ w: 'fire', type: 'elemental', n: 30 }]);
    expect(sigilParts(['fire', 'shock', 'stone'])).toEqual([{ w: 'stone', type: 'sigil', n: 35 }, { w: 'fire', type: 'elemental', n: 30 }]);
    expect(sigilParts(['fire', 'fire', 'fire']).reduce((n, p) => n + p.n, 0)).toBe(60);
  });
  it('rules 1.17: nothing is scaled down to 350 a hit or 500 on a critical (no cap)', () => {
    expect(capParts([200, 100], false)).toEqual([200, 100]);
    expect(capParts([400, 300], false)).toEqual([400, 300]); expect(capParts([800, 200], true)).toEqual([800, 200]);
  });
});

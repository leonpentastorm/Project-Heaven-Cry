// The Sigil damage balance pass (docs/design/balance-targets.md; spec items 556-559): Elemental power on the Physical
// slope, Sigil and Elemental bonuses added (not multiplied), one main element per spell, and the 350 / 500 ceilings.
import { describe, expect, it } from 'vitest';
import { elementalMult, sigilMult, SIGIL, type Character } from '../src';
import { sigilPower, sigilParts, capParts, SIGIL_CAP, SIGIL_CAP_CRIT } from '../src/sigil';

const maxed = { sigilMult: 1 + 0.1 * 9 + 0.1 * 10, elemMult: 1 + 0.1 * 9 + 0.05 * 10 }; // Intelligence 10, Brain Power 10, Expression 10, Visualization 10

describe('Sigil balance', () => {
  it('Elemental power follows the Physical slope, and adds to Sigil power instead of multiplying', () => {
    const c = { attrs: { expression: 10, intelligence: 10 }, skills: { visualization: 10, brain_power: 10 }, perks: [], traits: [] } as unknown as Character;
    expect(elementalMult(c)).toBeCloseTo(2.4); expect(sigilMult(c)).toBeCloseTo(2.9);
    expect(sigilPower(maxed, 'elemental')).toBeCloseTo(1 + 1.9 + 1.4); expect(sigilPower(maxed, 'sigil')).toBeCloseTo(2.9);
    expect(sigilPower(null, 'elemental')).toBe(1);
  });
  it('one main element: the strongest damaging glyph in full, every other one at half', () => {
    expect(sigilParts(['fire', 'condense'])).toEqual([{ w: 'fire', type: 'elemental', n: 30 }]);
    expect(sigilParts(['fire', 'shock', 'stone'])).toEqual([{ w: 'stone', type: 'sigil', n: 35 }, { w: 'fire', type: 'elemental', n: 30 }]);
    expect(sigilParts(['fire', 'fire', 'fire']).reduce((n, p) => n + p.n, 0)).toBe(60);
  });
  it('the ceilings: 350 a hit, 500 on a critical, parts scaled down together', () => {
    expect(capParts([200, 100], false)).toEqual([200, 100]);
    expect(capParts([400, 300], false)).toEqual([200, 150]); expect(capParts([800, 200], true)).toEqual([400, 100]);
    expect(SIGIL_CAP).toBe(350); expect(SIGIL_CAP_CRIT).toBe(500);
  });
  it('a fully built caster\'s strongest single-target spell, before the ceiling, stays near it (was about 1,200)', () => {
    // Every 4-glyph Line of damage words with CONDENSE (×1.5, the biggest single-target Burst), repeats at ×0.9 each.
    const dmgWords = Object.values(SIGIL).filter((w: any) => w.damage).map((w: any) => w.id as string);
    let best = 0, bestLine = '';
    for (const a of dmgWords) for (const b of dmgWords) for (const c of dmgWords) {
      const words = [a, b, c], repeats = words.length - new Set(words).size, m = 1.5 * Math.pow(0.9, repeats);
      const raw = sigilParts(words).reduce((n, p) => n + p.n * m * sigilPower(maxed, p.type), 0);
      if (raw > best) { best = raw; bestLine = words.join('·') + '·condense'; }
    }
    expect(best).toBeLessThan(SIGIL_CAP * 1.3); // the ceiling trims only the extreme Lines
    expect(best).toBeGreaterThan(200); void bestLine;
  });
});

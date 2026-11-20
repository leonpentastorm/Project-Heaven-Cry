// @ts-nocheck (a measuring tool)
// THE ATHLETICS SWITCH MEASURE (0.33 balance lane; rules 1.82 item 7011, shipped OFF): the defence guard's idle pair
// (defence-measure.test.ts "the idle pair is not back at 4.8 rounds": first Down at most 4.2 rounds) and the mender pair,
// with Athletics' Defense from its second point (as shipped) and from its first (the switch, set in memory and put back).
//   ATH_MEASURE=1 ATH_N=40 npx vitest run --root packages/engine test/balance/ath-measure.test.ts --silent=false
import { describe, it, expect } from 'vitest';
import { pairFire, pairLine, PAIRS } from './defence-measure';
import { SKILL } from '../../src';

const env = (globalThis as any).process?.env || {};
const N = Math.max(1, Number(env.ATH_N) || 40);
describe.runIf(env.ATH_MEASURE)('Athletics\' Defense from the first point, measured', () => {
  it('plays the guard pairs at defense_from 2 and 1', () => {
    const num: any = (SKILL as any).athletics.per_point.numbers, was = num.defense_from; let errors = 0;
    try {
      for (const from of [2, 1]) {
        num.defense_from = from;
        for (const [what, lv] of [['idle', 6], ['mender', 6]] as const) {
          const r = pairFire(what, PAIRS[what].seconds, lv, 2, N); errors += r.errors;
          (globalThis as any).console.log('defense_from ' + from + ' · ' + pairLine(r));
        }
      }
    } finally { num.defense_from = was; }
    expect(errors).toBe(0);
  }, 6 * 3600_000);
});

// The costs tables of engine foundations 2 (test/golden/costs.ts): what every action takes and gives, action by action.
// The pad: every basic action, Call, Sigil and Outburst action and technique through the reducer.
import { describe, it } from 'vitest';
import { goldenCosts } from './golden/costs';

describe("golden costs tables: the pad", () => {
  for (const s of ['pad']) it(s, () => { goldenCosts(s); }, 240000);
});

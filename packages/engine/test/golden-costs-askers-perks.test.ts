// The costs tables of engine foundations 2 (test/golden/costs.ts): what every action takes and gives, action by action.
// The pad for every holder of a perk that changes a cost or gives AP.
import { describe, it } from 'vitest';
import { goldenCosts } from './golden/costs';

describe("golden costs tables: the perks that change a cost", () => {
  for (const s of ['askers-perks']) it(s, () => { goldenCosts(s); }, 240000);
});

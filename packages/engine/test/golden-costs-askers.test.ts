// The costs tables of engine foundations 2 (test/golden/costs.ts): what every action takes and gives, action by action.
// The pad for every holder of a trait or a class that changes a cost or gives AP.
import { describe, it } from 'vitest';
import { goldenCosts } from './golden/costs';

describe("golden costs tables: the traits and classes that change a cost", () => {
  for (const s of ['askers-traits', 'askers-classes']) it(s, () => { goldenCosts(s); }, 240000);
});

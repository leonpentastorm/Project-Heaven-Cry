// The costs tables of engine foundations 2 (test/golden/costs.ts): what every action takes and gives, action by action.
// Every item's own action, read as what it takes and gives.
import { describe, it } from 'vitest';
import { goldenCosts } from './golden/costs';

describe("golden costs tables: the items' actions", () => {
  for (const s of ['items-perks', 'items-traits-classes', 'items-shelved']) it(s, () => { goldenCosts(s); }, 240000);
});

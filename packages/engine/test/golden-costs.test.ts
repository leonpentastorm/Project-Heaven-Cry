// The costs tables of engine foundations 2 (test/golden/costs.ts): what every action takes and gives, action by action.
// The damage tables' own actions, read as what they take and give.
import { describe, it } from 'vitest';
import { goldenCosts } from './golden/costs';

describe("golden costs tables: the damage tables' actions", () => {
  for (const s of ['techniques', 'sigil', 'outburst', 'faith', 'special', 'flat', 'weapons']) it(s, () => { goldenCosts(s); }, 240000);
});

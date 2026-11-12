// The costs tables added by the review of engine foundations 2 (test/golden/costs.ts: credit, foes, cooldowns): every
// action under a Brief and an Encore, an enemy's turn with every gun, and when each cooldown comes back.
// Recorded on the engine before the costs refactor; the lines that moved since are listed in the hand-off
// (docs/design/handoffs/engine-foundations-2-costs.md, "Problems found in review and what was done").
import { describe, it } from 'vitest';
import { goldenCosts } from './golden/costs';

describe("golden costs tables: credit (Brief, Encore), enemy turns, cooldowns", () => {
  for (const s of ['credit', 'foes', 'cooldowns']) it(s, () => { goldenCosts(s); }, 900000);
});

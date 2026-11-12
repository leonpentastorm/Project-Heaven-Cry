// The golden tables of the damage-formula migration (docs/design/proposals/2026-11-unified-damage.md, stage (a), step
// a0): what the engine produces and what lands, action by action, exact, against test/golden/*.json. The actions are
// listed in test/golden/record.ts, the way they are read in test/golden/harness.ts, how to record in
// test/golden/compare.ts (GOLDEN_RECORD=1, on purpose only). Split over several files so that they run side by side.
import { describe, it } from 'vitest';
import { golden } from './golden/compare';

describe('golden tables: the techniques', () => {
  it('techniques', () => { golden('techniques'); }, 60000);
});

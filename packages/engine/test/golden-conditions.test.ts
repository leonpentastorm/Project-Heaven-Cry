// The conditions table of engine foundations 2 (test/golden/conds.ts): every condition on every tier and on a
// character, through its whole life (apply, stack, tick, cleanse, end), from each kind of source, with immunities and
// with every item that changes it. State lines never move without a ruling; the words are re-recorded when a sentence
// changes (GOLDEN_RECORD=log npm test -w @phc/engine -- golden-conditions).
import { describe, it } from 'vitest';
import { goldenPair } from './golden/rules';
import { recordConditions } from './golden/conds';

describe('golden table: conditions (every condition, every tier, every kind of source)', () => {
  it('conditions', () => { const { state, log } = recordConditions(); goldenPair('conditions', state, log); }, 600000);
});

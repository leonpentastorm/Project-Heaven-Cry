// The rules tables of engine foundations 1 (test/golden/rules.ts): what the dice and the rules did, action by action,
// for the same actions as the damage tables. State lines never move without a ruling; the words are re-recorded when
// the one roll sentence changes (GOLDEN_RECORD=log).
import { describe, it } from 'vitest';
import { goldenRules, goldenPair } from './golden/rules';
import { recordMoves } from './golden/moves';

describe('golden rules tables: dice, conditions and tiles', () => {
  for (const s of ['techniques', 'sigil', 'outburst', 'faith', 'items-perks', 'items-traits-classes', 'special', 'flat', 'weapons', 'enemies']) it(s, () => { goldenRules(s); }, 240000);
});

describe('golden table: forced movement (every mover against every case)', () => {
  it('moves', () => { const { state, log } = recordMoves(); goldenPair('moves', state, log); }, 240000);
});

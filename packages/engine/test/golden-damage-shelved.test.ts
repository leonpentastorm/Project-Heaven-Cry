// The golden tables of the damage-formula migration, step a6 (docs/design/handoffs/unified-damage-stage-a.md): the
// numbers that were written in TypeScript and now live in data, recorded BEFORE they were moved. `items-shelved` holds
// the shelved class moves (the 21 advanced classes and the Revision 2 ranks, with the tests' own switches on);
// `literals` holds the system's own flat numbers (the Flux overload, the Strain burn and the Mana Short, the aura).
// How a line is read: test/golden/harness.ts. To record on purpose: GOLDEN_RECORD=1 (test/golden/compare.ts).
import { describe, it } from 'vitest';
import { golden } from './golden/compare';

describe('golden tables: the shelved moves and the literals', () => {
  it('items-shelved', () => { golden('items-shelved'); }, 120000);
  it('literals', () => { golden('literals'); }, 60000);
});

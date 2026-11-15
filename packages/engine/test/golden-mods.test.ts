// The mods pins (build plan 0.29, section 4.1 "P1 pins"; ENGINE-GUIDE rule 3 "Pin, then move"): what every weapon mod of
// data does TODAY, through the reducer, with and without it fitted on a weapon it fits (same seed, same dice); the fit in
// each mode; a mod on an off-hand gun and on a pack line; the extended magazine's spares; the suppressor on each ranged
// attack kind; melee damage across Strength and Agility. Today's behaviour, not a ruling: test/golden/mods.ts's header
// names the pins the plan moves on purpose. Record on purpose only: GOLDEN_RECORD=1 npm test -w @phc/engine -- golden-mods
import { describe, it } from 'vitest';
import { goldenPair } from './golden/rules';
import { recordMods } from './golden/mods';

describe('golden table: weapon mods today (P1 pins)', () => {
  it('every mod, the fits, the hands, the spares, melee across the attributes', () => { const { state, log } = recordMods(); goldenPair('mods', state, log); }, 600000);
});

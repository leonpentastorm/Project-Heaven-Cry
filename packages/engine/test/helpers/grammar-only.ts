// Rules 1.17 added the Line multiplier (a character's Line ×1.7, ×1.75 or ×1.8 damage by its length; sigils.json
// grammar.line_mult). The Sigil rules tests written before it pin the grammar's own numbers (the words, Reach, Burst,
// Delivery, repeats, the Sigil and Elemental multipliers), which did not change. A test file that imports this module
// has the Line multiplier switched off (×1) so those numbers read as the spec's sections 1 to 10 give them; the
// multiplier itself, the critical and the Elite guard are pinned in rules117-magic.test.ts. Vitest loads every test
// file in its own module graph, so this reaches no other file.
import { LINE_MULT } from '../../src/sigilwords';
for (const k of Object.keys(LINE_MULT)) LINE_MULT[k] = 1;

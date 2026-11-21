// Rules 1.17 added the Line multiplier, and rules 1.100 (item 8371) made it the Sigil door's cash-out (Brain Power's Bite x
// S(n) on its length; skills.json brain_power door_ladder). The Sigil rules tests written before it pin the grammar's own
// numbers (the words, Reach, Burst, Delivery, repeats, the Sigil and Elemental multipliers). A test file that imports
// this module has the Line's cash-out switched off (x1: the door's Bite read as 0, which sigil.ts lineCash reads as a
// plain hit) so those numbers read as the spec's sections 1 to 10 give them; the cash-out itself is pinned in
// door-sigils.test.ts and rules117-magic.test.ts. Vitest loads every test file in its own module graph, so this reaches
// no other file.
import { SKILL } from '../../src/data';
for (const r of ((SKILL as any).brain_power?.door_ladder?.rows || []) as any[]) if (typeof r.bite === 'number') r.bite = 0;

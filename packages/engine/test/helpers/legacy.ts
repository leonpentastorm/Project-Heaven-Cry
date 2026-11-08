// Class Roster Revision 3 (8 Nov 2026) replaced the 13 Revision 2 base classes and shelved every advanced class. The
// pool moves' and the advanced moves' handlers stay in the engine, and so do their tests: a test file written for the
// Revision 2 classes calls useRevision2Classes() once at its top, which turns on the two test-only switches for that
// file (each test file runs in its own worker):
//   - _setRevision2Classes(true): a class id resolves to its Revision 2 moves (by origin and old rank; signature 13 / 18);
//   - _setAdvancedLive(true): an advanced class a character holds gives its moves, as before the shelving.
// Never on in play. Tests of the Revision 3 rules (test/classes-rev3.test.ts) leave both off.
import { afterAll, beforeAll } from 'vitest';
import { _setAdvancedLive, _setRevision2Classes, REV2_CLASSES } from '../../src';

export function useRevision2Classes() {
  beforeAll(() => { _setRevision2Classes(true); _setAdvancedLive(true); });
  afterAll(() => { _setRevision2Classes(false); _setAdvancedLive(null); });
}
/** A Revision 2 class's signature skills (tests build ranks from them). */
export const SIG = (id: string): string[] => REV2_CLASSES[id]?.signature || [];

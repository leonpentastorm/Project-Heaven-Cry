// A character's belief and patron (rules 1.6), in a module with no global hooks: faith.ts (which places its hooks as it
// loads) and the item-op predicate `patron` (effects/triggers.ts, loaded earlier) read the one copy (Classes 3.0 step 1b,
// the step 1a review's finding 15).
import './datatext'; // fills the texts' {=placeholders} before any data is read
import patronsJ from '../../../data/patrons.json';
import type { Character, Belief } from './character';
import { PATRON as LEGACY_PATRON } from './tactics';

/** The patrons (rules 1.6 shape; tactics.ts PATRON is the same list with the old `blessings` alias = hymns). */
export const FAITH_PATRONS: any[] = (patronsJ as any).items || [];
/** The patrons by id. */
export const FAITH_PATRON: Record<string, any> = Object.fromEntries(FAITH_PATRONS.map((p) => [p.id, p]));
/** A patron by id: patrons.json, or one added to tactics.ts PATRON at run time (old-shape patrons: blessings = Hymns). */
export const patronById = (id: string | null | undefined): any | null => (id ? FAITH_PATRON[id] || LEGACY_PATRON[id] || null : null);
/** A character's belief. Old saves (no belief): a pact makes them Faithful to that patron, else Atheist (spec 1.6 §1). */
export function beliefOf(c: Character): Belief {
  if (c.belief?.kind === 'faithful' && patronById(c.belief.patron)) return c.belief;
  if (c.belief?.kind === 'atheist') return c.belief;
  return c.patron && patronById(c.patron) ? { kind: 'faithful', patron: c.patron } : { kind: 'atheist' };
}
/** The id of the patron a character is Faithful to, or null (an Atheist, no character). */
export const patronIdOf = (c: Character | null | undefined): string | null => { if (!c) return null; const b = beliefOf(c); return b.kind === 'faithful' ? b.patron : null; };

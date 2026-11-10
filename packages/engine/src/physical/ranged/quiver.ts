// Physical 2.0, ranged: the quiver (Leon: a quiver gets its own loading menu, and a bow can't be reloaded in a fight).
// The ranged lane builds this file: loadQuiver(c, weaponId, load) for the phys/quiver action (the reducer calls it
// through quiverLoader below), the arrow each shot names, and the refusal of a reload in a fight.
import type { Character } from '../../character';

type Loader = (c: Character, weaponId: string, load: Record<string, number>) => string | null;
let LOADER: Loader | null = null;
/** The ranged lane registers its loadQuiver here; the phys/quiver action runs it. */
export const quiverLoader = (f: Loader) => { LOADER = f; };
export const loadQuiverWith = (c: Character, weaponId: string, load: Record<string, number>): string | null => (LOADER ? LOADER(c, weaponId, load) : 'The quiver isn\'t built yet.');

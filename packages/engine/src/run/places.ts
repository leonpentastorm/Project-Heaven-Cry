// WHICH NODES OPEN AS A FULL-SCREEN PLACE (rules 1.46): each place's tabs and the one "is a place open" test. A leaf
// module (types only), so the music (music.ts) and the place's view (placeview.ts) read the same test without an import
// cycle.
import type { RunOption } from './progress';
import type { RunState } from './state';

/** A place's tab: its id, its word, and the option groups it holds (the Give tab holds none: it draws `giveView`). */
export interface PlaceTabV { id: string; label: string; groups: RunOption['group'][] }
/** The tabs each place shows (the Give tab last on every one). */
export const TABS: Record<string, PlaceTabV[]> = {
  forge: [{ id: 'upgrade', label: 'Repair and upgrade', groups: ['grade', 'relic', 'repair'] }, { id: 'stock', label: 'Mods and armour', groups: ['forge', 'mod'] }, { id: 'fit', label: 'Armour fitting', groups: ['fit'] }],
  training: [{ id: 'train', label: 'Training', groups: ['train'] }],
  rest: [{ id: 'train', label: 'Small training', groups: ['train'] }],
  shrine: [{ id: 'shrine', label: 'Blessings', groups: ['shrine'] }],
  event: [{ id: 'trade', label: 'Trades', groups: ['trade'] }],
};
/** The node kinds that open as a full-screen place (the shop has its own view, shopview.ts). */
export const PLACE_KINDS = Object.keys(TABS);
/** Is the party standing at a place that opens full screen (its visit open, on the map, not a pick waiting)? */
export const placeOpen = (g: { run?: RunState | null }): boolean => { const r = g.run; if (!r || r.state !== 'map' || !r.visit || r.visit.node !== r.at) return false; return PLACE_KINDS.includes(r.visit.kind); };

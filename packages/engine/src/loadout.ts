// GEAR BY MODE (rules 1.52; Leon, 14 Nov 2026: "remove the kit then, we give people stuff base on the mode").
//
// Creation makes a PERSON: a sheet with no kit becomes a bare character (`c.bare`: bare fists, no armour, an empty
// pack; character.ts BARE_KIT). What it carries is given by the mode when play starts, from data/modes.json `loadout`:
//   camp   Survival (and the roguelike): the character builds a loadout at the camp before node 1 (run/loadout.ts);
//   kit    a campaign: the campaign's own `loadout`, else the mode's: one of the old creation kits (character.ts KITS),
//          chosen by the door skill with most points. The Proving Ground gives the same to a bare character.
// A character that already carries gear (an old draft's kit, a campaign save) is never stripped here: only a bare one is
// geared. `stripGear` (the camp's start) keeps what traits give and plot items.
import './datatext';
import modesJ from '../../../data/modes.json';
import { ITEM, TRAITS } from './data';
import { type Character, type PackItem, KITS, armourCap, startCollection, grantStartItems } from './character';

/** A mode's (or a campaign's) fixed loadout (data/modes.json campaign `loadout`): a kit by id, or by the door skill. */
export interface KitLoadout { kind?: 'kit'; kit?: string; by_door?: Record<string, string>; default?: string }
const MODE_ROWS: any[] = (modesJ as any).items || [];
/** The loadout block of a mode (data/modes.json items[].loadout), or null. */
export const modeLoadout = (mode: string): { kind: 'camp' | 'kit' } & KitLoadout | null => MODE_ROWS.find((m) => m.id === mode)?.loadout || null;
/** The fixed loadout a campaign gives: the campaign's own (its json's `loadout`), else the Campaign mode's. */
export const campaignLoadout = (campaign?: { loadout?: KitLoadout } | null): KitLoadout => campaign?.loadout || (modeLoadout('campaign') as KitLoadout) || { default: 'soldier' };
/** The kit a fixed loadout gives this character: its `kit`, else the door skill with most points among `by_door` (a
 * tie to the first listed; 0 points never counts), else `default`. */
export function kitFor(c: Pick<Character, 'skills'>, l: KitLoadout): string {
  if (l.kit && KITS[l.kit]) return l.kit;
  let best: string | null = null, top = 0;
  for (const [sk, kit] of Object.entries(l.by_door || {})) { const p = c.skills?.[sk] || 0; if (p > top && KITS[kit]) { top = p; best = kit; } }
  return best || (l.default && KITS[l.default] ? l.default : 'soldier');
}
/** What traits give a character to carry (op start_item): kept when gear is stripped. */
const traitItems = (c: Character): Set<string> => {
  const out = new Set<string>(['musek_blestor']);
  for (const t of c.traits || []) for (const e of ((TRAITS.find((x) => x.id === t) as any)?.effects || [])) if (e?.op === 'start_item' && e.item) out.add(e.item);
  return out;
};
/** Take every piece of gear off a character (the camp's start: Survival gives by mode): bare fists, no armour, no
 * stims, nothing in the off hand; the pack keeps plot items and what traits give, and worn pieces traits give. */
export function stripGear(c: Character): void {
  const keep = traitItems(c);
  c.weapon = 'fists'; c.offHand = null; c.armourClass = 0; c.stims = 0; delete c.loaded; delete (c as any).loadedType; delete (c as any).mainState; delete c.quivers;
  c.pack = (c.pack || []).filter((x: PackItem) => x.kind === 'plot' || keep.has(x.item || x.id)).map((x) => ({ ...x }));
  c.worn = Object.fromEntries(Object.entries(c.worn || {}).filter(([, id]) => keep.has(id)));
}
/** Give a character a kit (KITS) as creation used to: the hand, the off hand, the armour class (a trait's cap holds),
 * stims, the pack; what it already holds from traits stays. Clears `bare`. */
export function giveKit(c: Character, kitId: string): void {
  const kit = KITS[kitId] || KITS.soldier, had = (c.pack || []).map((x) => ({ ...x }));
  c.kit = kitId; c.weapon = kit.weapon; c.armourClass = kit.armourClass; c.stims = kit.stims;
  c.offHand = kit.offHand ? { id: kit.offHand } : null;
  c.pack = [...kit.pack.map((x) => ({ ...x })), ...had.filter((x) => !kit.pack.some((k) => k.id === x.id))];
  { const cap = armourCap(c); if (cap != null && c.armourClass > cap) { (c.state ||= {}).armourDropped = c.armourClass; c.armourClass = cap; } }
  delete c.loaded; delete c.bare;
  grantStartItems(c); startCollection(c);
}
/** Gear a BARE character from a fixed loadout (a campaign's, the Proving Ground's). Returns true when it gave. */
export function gearIfBare(c: Character, l: KitLoadout): boolean {
  if (!c.bare) return false;
  giveKit(c, kitFor(c, l)); return true;
}
/** The id of an item a pack entry holds (weapons and foci by their own ids). */
export const entryId = (x: PackItem): string => x.weapon || x.item || x.id;
/** True when the id is a focus (data items.json `focus`). */
export const isFocus = (id: string): boolean => !!(ITEM[id] as any)?.focus;

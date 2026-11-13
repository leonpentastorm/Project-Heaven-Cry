// The Attack tab in areas (Leon, live 0.23.0, 12 Nov 2026): each weapon's own actions in that weapon's area (its shots
// and techniques, its reload, its unjam, attacking an object with it). With two weapons: main hand, off hand, then Both
// (what uses both hands, Reload both among them); with one weapon, one area and no Both. What belongs to no one weapon
// (Shove, Brace, Hold a shot) comes last. The area is the engine descriptor's `hand` (descriptors.ts), never a name.
import type { ActionItem } from './commands';
import type { WeaponBlock } from './techView';

export type Area = 'main' | 'off' | 'both' | 'other';
const RANK: Record<Area, number> = { main: 0, off: 1, both: 2, other: 3 };
/** The area a row belongs to: its descriptor's hand, or 'other'. */
export const areaOf = (it: ActionItem): Area => ((it[5] && it[5].hand) || 'other') as Area;
/** The Attack tab's rows in area order (stable: each area keeps the engine's order). Any other tab, or a tab whose rows
 *  name no hand (a unit with the old rows), as it is. */
export function areaOrder(tab: string, items: ActionItem[]): ActionItem[] {
  if (tab !== 'attack') return subOrder(items);
  if (!items.some((it) => areaOf(it) !== 'other')) return items;
  return items.map((it, i) => ({ it, i })).sort((a, b) => RANK[areaOf(a.it)] - RANK[areaOf(b.it)] || a.i - b.i).map((x) => x.it);
}
const PIP_GUARD = 'width: 8px; height: 11px; border-radius: 2px 2px 5px 5px; box-sizing: border-box; ';
const PIP_MOMENTUM = 'width: 9px; height: 9px; border-radius: 2px; transform: rotate(45deg); ';
/** An area's header: its name, and with a weapon block its icon and meter (Momentum pips, Guard, rounds and Heat). */
export function areaHead(hand: Area, name: string, b?: WeaponBlock | null) {
  const pips = b ? b.pips.map((p) => ({ key: p.key, on: p.on ? 'true' : 'false', style: b.meterKind === 'guard' ? PIP_GUARD + (p.on ? 'background: #E7EBF3' : 'border: 1px solid #5B6577') : PIP_MOMENTUM + (p.on ? 'background: #F68A38' : 'border: 1px solid #5B6577') })) : [];
  // One fact, one place (Leon, live 0.24.0: "status effect, heat and such duplicated again"): rounds loaded, Heat (one
  // value the guns pool), Momentum and Guard are the unit panel's resource rows, with their rules in the hover card;
  // a weapon's header names the weapon and says only what is that gun's alone and stops it: JAMMED.
  void pips;
  const jammed = !!(b && hand !== 'both' && b.jammed);
  return { hand, name, icon: b && hand !== 'both' ? b.icon : '', hasIcon: !!(b && hand !== 'both' && b.icon), meter: '', hint: '', hasHint: false, pips: [] as typeof pips, hasPips: false, pipKind: (b && b.meterKind) || '',
    jammed, jamTip: jammed ? 'This gun is jammed: it can\'t fire until cleared (Clear jam).' : '',
    face: { show: false, unit: '', img: '', hasImg: false, noImg: false, text: '', style: '', imgStyle: '' } };
}

/** A row's group inside its tab (Classes 3.0 step 10): its descriptor's `sub` ('Whispers', 'Hymns'; Shadow's Slip, Mark,
 *  Work, Break; Tending's Bond, Heal, Help), or ''. */
export const subOf = (it: ActionItem): string => (it[5] && it[5].sub) || '';
/** Any tab but Attack: the rows gathered by their group, each group where its first row stood (stable: the engine's order
 *  inside a group). The Chaplain's Ward, listed after the prayers, joins the Whispers. A tab with no groups, as it is. */
export function subOrder(items: ActionItem[]): ActionItem[] {
  if (!items.some((it) => subOf(it))) return items;
  const first = new Map<string, number>(); items.forEach((it, i) => { if (!first.has(subOf(it))) first.set(subOf(it), i); });
  return items.map((it, i) => ({ it, i })).sort((a, b) => first.get(subOf(a.it))! - first.get(subOf(b.it))! || a.i - b.i).map((x) => x.it);
}
/** A group's header over its first row (the Attack tab's area header, with no weapon). */
export const subHead = (name: string) => areaHead('other', name.toUpperCase());

/** A held Figment's group header on the Figments tab (figments-spec.md section 9: "the portrait in each Figment's group
 *  header"): the Figment's face as its map token shows it, so the row and the token read as one thing. Its portrait when
 *  the catalog has one (faceOf: `art/portraits/figments/`, ART-REQUESTS C6, not painted yet), else the token's own badge:
 *  its short name in a dashed round chip in its owner's colour (the ring the map draws round it). */
export function figmentHead(sub: string, look: { unit: string; img: string; short: string; ink: string }) {
  const h = subHead(sub);
  h.face = { show: true, unit: look.unit, img: look.img, hasImg: !!look.img, noImg: !look.img, text: look.short,
    style: 'flex: none; display: grid; place-items: center; width: 26px; height: 26px; box-sizing: border-box; border-radius: 50%; overflow: hidden; font-size: 9.5px; font-weight: 700; letter-spacing: 0; color: ' + look.ink + '; border: 2px ' + (look.img ? 'solid' : 'dashed') + ' ' + look.ink + '; background: #0A0D13',
    imgStyle: 'width: 100%; height: 100%; object-fit: cover' };
  return h;
}

// Figment line icons (rules 1.34; Leon, the 0.28.2 playtest: "there isn't even a special icon for each summon"). One
// monoline SVG a row, art/icons/figments/<icon>.svg, where <icon> is the row's own `icon` in data/figments.json (the five
// forms, the Scrap Turret, the Picture verb), catalogued in art/catalog.json `figment_icons` (tools/validate_art.py
// checks both). The line-icon rule is art/style-guide/weapon-icons.md: a 64 box, a 2-unit currentColor stroke, no fill.
//
// Which icon a thing shows is always its data row's field, looked up through the engine (figmentLookOf: a form, the
// turret, an item); no id is named here. Adding a form with an icon needs no code: the file and the row's field.
import { figmentLookOf, FIG } from '@engine';
import ASSETS from './assets.json';

const FILES = import.meta.glob('../../../../art/icons/figments/*.svg', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const ICONS: Record<string, string> = {};
for (const [path, svg] of Object.entries(FILES)) ICONS[path.slice(path.lastIndexOf('/') + 1, -'.svg'.length)] = svg.trim();

/** The Figments' ink (Expression, rules 1.34) and the light line drawn on a dark plate (a token, a chip). */
export const FIG_INK = '#5394AC';
export const FIG_LINE = '#CFE6F0';
/** The icon's SVG markup for a catalog icon id (a row's `icon`), or null. */
export const figmentIcon = (icon: string | null | undefined): string | null => (icon && Object.prototype.hasOwnProperty.call(ICONS, icon) ? ICONS[icon] : null);
/** Every icon id with a file (the tests check each row's `icon` is one). */
export const FIGMENT_ICON_IDS: readonly string[] = Object.keys(ICONS).sort();

const URIS = new Map<string, string>();
/** The icon as an <img> source (a data URI: an <img> can't read CSS colour, so the ink goes into the markup). plate: a
 *  dark disc behind it with room round the line (a map token, a face chip); '' for a bare line on the panel. */
export function figmentIconUri(icon: string | null | undefined, ink: string = FIG_LINE, o: { plate?: string } = {}): string {
  const svg = figmentIcon(icon); if (!svg) return '';
  const key = icon + '|' + ink + '|' + (o.plate || ''), hit = URIS.get(key); if (hit) return hit;
  let body = svg.replace(/<!--[\s\S]*?-->/g, '').replace(/\s+/g, ' ').replace(/currentColor/g, ink);
  // a plate: the same drawing inside a wider box (12 units of room each side) over a filled disc
  if (o.plate) body = body.replace('viewBox="0 0 64 64"', 'viewBox="-12 -12 88 88"').replace(/(<svg[^>]*>)/, '$1<circle cx="32" cy="32" r="44" fill="' + o.plate + '" stroke="none"/>');
  const uri = 'data:image/svg+xml,' + encodeURIComponent(body);
  URIS.set(key, uri); return uri;
}

/** The row a unit was made from (a Figment's form, a Scrap Turret), by its own record: its form, else its companion id. */
const rowIdOf = (u: any): string | null => (u && u.owned ? u.figment?.form || u.companion || null : null);
/** A unit's Figment icon id ('' when it is no Figment or turret, or its row names none). */
export const figmentIconOfUnit = (u: any): string => figmentLookOf(rowIdOf(u))?.icon || '';
/** A Figment's face where a portrait would be (its token, its group header, the target and turn cards): its icon on a
 *  dark plate; '' for any other unit (the screens then show its initials as before). */
export const figmentFaceOf = (u: any): string => figmentIconUri(figmentIconOfUnit(u), FIG_LINE, { plate: '#0A0D13' });

/** A fight log line's Figment chip: the icon of the first Figment named in it as a whole word (by the names it had in
 *  this fight: a design's name, else its form's), or ''. figs: [{name, icon}] of the Figments seen this fight. */
export function figmentLogIcon(text: string, figs: readonly { name: string; icon: string }[]): string {
  let best: { at: number; icon: string } | null = null;
  for (const f of figs) {
    if (!f.name || !f.icon) continue;
    const m = new RegExp('(^|[^A-Za-z])' + f.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![A-Za-z])').exec(text);
    if (m && (!best || m.index < best.at)) best = { at: m.index, icon: f.icon };
  }
  return best ? figmentIconUri(best.icon, FIG_LINE) : '';
}

/** The delivered white-ink picture of a Figment order or trait (Items 2.0 item 21: art/icons/figments/order-<id>.png and
 *  trait-<id>.png, built by tools/build_web_assets.py under their file stem): an order row's `icon` (order-draw-fire) or a
 *  trait's id (kindling -> trait-kindling). '' when there is none; the form icons are the line SVGs above, not these. */
export const figmentPng = (icon: string | null | undefined, trait = false): string => {
  const key = trait && icon ? 'trait-' + icon : icon || '', A = ASSETS as Record<string, string>;
  return /^(order|trait)-/.test(key) && Object.prototype.hasOwnProperty.call(A, key) ? A[key] : '';
};

/** A Figment order row's picture by its action key (`ow:<unit id>:<verb>`, the engine's owned-unit rows): the verb's
 *  row in data/figments.json `verbs` names its `icon` (order-draw-fire), drawn through figmentPng; '' for any other
 *  key or a verb with no picture. No verb id is named here. */
export const figmentOrderIcon = (actionKey: string | null | undefined): string => {
  const m = /^ow:[^:]+:(.+)$/.exec(actionKey || ''); if (!m) return '';
  const row = ((FIG as any).verbs as any[] || []).find((v) => v.id === m[1]);
  return row?.icon ? figmentPng(row.icon) : '';
};

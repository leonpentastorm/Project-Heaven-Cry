// Weapon and armour icons (art/style-guide/weapon-icons.md; the working spec is art/icons/weapons/README.md): one monoline SVG
// per item, art/icons/weapons/<id>.svg for every weapon in data/weapons.json, art/icons/armour/<id>.svg for every
// armour piece in data/items.json and every shield (rules 1.57: a weapons.json row; its icon keeps its id and folder), and art/icons/focus/<id>.svg for the magic foci (the Evoker and the
// Emanator, both gloves at base: Leon, 10 Nov 2026). A 64 × 64 box, a 2-unit `currentColor` stroke, no fill: the screen sets
// the colour (white ink on the panel, or an attribute's ink).
//
// The files are bundled as markup (Vite's raw import, the way narrator/context.ts reads docs/lore), so a screen can drop
// the string straight into the DOM and tint it with CSS `color`. Adding an icon needs no code change: put the file in
// the folder, named by the item's id.
import ASSETS from './assets.json';
import { WEAPON, ITEM, SPECIAL_ROUND_ITEM } from '@engine';
const FILES = import.meta.glob('../../../../art/icons/{weapons,armour,focus}/*.svg', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

const ICONS: Record<string, string> = {};
for (const [path, svg] of Object.entries(FILES)) {
  const id = path.slice(path.lastIndexOf('/') + 1, -'.svg'.length);
  ICONS[id] = svg.trim();
}

/** Rules 1.56 (L4): a variant's row names its base (`variant_of`, made at load from data/variants.json); a variant with
 * no picture of its own shows its base's. '' for anything else. */
const variantBase = (id: string): string => String((WEAPON as any)[id]?.variant_of || (ITEM as any)[id]?.variant_of || '');
/** The icon's SVG markup for a weapon, armour or shield id (a variant: its base's when it has none), or null when the item has no icon. */
export function gearIcon(id: string | null | undefined): string | null {
  if (!id) return null;
  if (Object.prototype.hasOwnProperty.call(ICONS, id)) return ICONS[id];
  const b = variantBase(id); return b ? gearIcon(b) : null;
}

/** Whether the item has an icon. */
export const hasGearIcon = (id: string | null | undefined): boolean => gearIcon(id) !== null;

/** Every id with an icon (weapons and armour together). */
export const GEAR_ICON_IDS: readonly string[] = Object.keys(ICONS).sort();

// ---------- painted (Heavenprint) icons: art/style-guide/gear-icons.md ----------
// The artist's painted gear icons (art/icons/gear, the catalog's `gear` map) are built by `npm run assets`
// (tools/build_web_assets.py) as gear-<item id> (64 px) and gear-<item id>-lg (256 px) in assets.json. A painted icon is
// full colour: never tinted or masked (paintedStyle is for white-ink icons), so the ink below does not reach it. Derived
// gear with no item id: loose rounds by calibre (rounds-<calibre>, roundsGearId); a gun's magazine and the body armour
// of an Armour Class answer to the engine's own ids, mag:<weapon> and armour:<class> (the catalog's `data_ids`;
// magGearId, torsoGearId); they have no monoline icon. gearIconUri takes every one of these ids as the engine gives it.
let ART: Record<string, string> = ASSETS as Record<string, string>;
/** Tests only: use this asset map instead of assets.json (null restores it). */
export function setGearArt(map: Record<string, string> | null): void { ART = map || (ASSETS as Record<string, string>); }
const own = (k: string): string => (Object.prototype.hasOwnProperty.call(ART, k) ? ART[k] : '');
/** The painted icon's URL for an item (or derived gear) id, '' when it has none. large: the 256 px size. */
const paintedGear = (id: string, large: boolean): string => (large && own('gear-' + id + '-lg')) || own('gear-' + id);
/** Whether the item has a painted icon (it is then drawn as it is: full colour, no ink). */
export const hasPaintedGear = (id: string | null | undefined): boolean => !!id && (derivedGear(id) !== id ? hasPaintedGear(derivedGear(id))
  : !!paintedGear(id, false) || (!Object.prototype.hasOwnProperty.call(ICONS, id) && !!variantBase(id) && hasPaintedGear(variantBase(id))));

const slug = (s: string) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
/** The gear id of a calibre's loose rounds ('.32 decrkm' -> 'rounds-32_decrkm', '40 mm grenade' -> 'rounds-40mm_grenade').
 * A special round (rules 1.56: `type`, an `ammo_type` of data/items.json) shows its own item's picture when it has one
 * ('ammo_hollow_point'), else its calibre's plain rounds. */
export function roundsGearId(calibre: string | null | undefined, type?: string | null): string {
  const sp: any = type ? (SPECIAL_ROUND_ITEM as any)[type] : null;
  if (sp && (paintedGear(sp.id, false) || gearIcon(sp.id))) return sp.id;
  if (!calibre) return '';
  const want = slug(calibre), k = Object.keys(ART).find((x) => x.startsWith('gear-rounds-') && !x.endsWith('-lg') && slug(x.slice('gear-rounds-'.length)) === want);
  return k ? k.slice('gear-'.length) : '';
}
/** The gear id of a rounds id of the engine (`rounds:<calibre>` or, rules 1.56, `rounds:<calibre>:<type>`). */
export function roundsIdGear(id: string): string {
  const m = /^rounds:([^:]+)(?::(.+))?$/.exec(id || ''); return m ? roundsGearId(m[1], m[2] || null) : '';
}
/** The gear id of a gun's magazine: the engine's own id, `mag:<weapon>` (the shop's, the camp's, the rewards' and the
 *  pack's), when a painted magazine answers to it (art/catalog.json: a `mag-*` gear entry's `data_ids`, built into
 *  assets.json by tools/build_web_assets.py); a variant with none of its own: its base's; '' for a gun with none drawn. */
export function magGearId(weaponId: string | null | undefined): string {
  if (!weaponId) return '';
  if (own('gear-mag:' + weaponId)) return 'mag:' + weaponId;
  const b = variantBase(weaponId); return b ? magGearId(b) : '';
}
/** The gear id of the torso armour of an Armour Class (1 to 5): the engine's own id, `armour:<class>`, when a painted
 *  torso answers to it (the catalog's `data_ids`, as magGearId); '' for none. */
export function torsoGearId(armourClass: number | null | undefined): string {
  return armourClass && own('gear-armour:' + armourClass) ? 'armour:' + armourClass : '';
}
/** The engine's derived ids, to the gear id their picture is under: `rounds:<calibre>[:<type>]` (roundsIdGear),
 *  `mag:<weapon>[:<rounds>]` (magGearId: an empty magazine, `mag:<weapon>:0`, is the same picture), `armour:<class>`
 *  (torsoGearId). Any other id is its own. */
function derivedGear(id: string): string {
  if (id.startsWith('rounds:')) return roundsIdGear(id);
  const m = /^mag:([^:]+)/.exec(id); if (m) return magGearId(m[1]);
  const a = /^armour:(\d+)$/.exec(id); if (a) return torsoGearId(Number(a[1]));
  return id;
}

/** The id a pack entry's picture is drawn from: a magazine `mag:<weapon>` (not its gun), loose rounds
 *  `rounds:<calibre>[:<type>]`, else its weapon, item or own id. gearIconUri takes it as it is. */
export function packGearId(it: { id?: string; weapon?: string; item?: string; mags?: unknown; calibre?: string; ammoType?: string | null } | null | undefined): string {
  if (!it) return '';
  if (it.mags && it.weapon) return 'mag:' + it.weapon;
  if (it.calibre) return 'rounds:' + it.calibre + (it.ammoType ? ':' + it.ammoType : '');
  return it.weapon || it.item || it.id || '';
}

// ---------- as an image (the template runtime takes text holes only: an <img> with a data URI, as glyphUri does) ----------
/** The ink on a panel (the UI's text white) and on a row that can't be used now (muted). */
export const GEAR_INK = '#E7EBF3';
export const GEAR_INK_OFF = '#7F8BA1';
const URIS = new Map<string, string>();
/** The ONE resolver for an item's picture: the painted icon when the item has one (its URL; `large` for a box over
 *  32 px), else the monoline icon as a data URI drawn in one ink (an <img> can't read CSS `color`, so the ink goes into
 *  the markup), else '' (the screen then draws nothing in the slot). `line`: the monoline icon only, for effects and small
 *  tinted marks (Sunder's weapon strike, the reload chip), where Leon's rule keeps the line art (gearLineUri). */
export function gearIconUri(id: string | null | undefined, ink: string = GEAR_INK, opts: { line?: boolean; large?: boolean } = {}): string {
  if (!id) return '';
  const d = derivedGear(id); if (d !== id) return gearIconUri(d, ink, opts); // a rounds, magazine or body-armour id: its picture's (none: '')
  if (!opts.line) { const p = paintedGear(id, !!opts.large); if (p) return p; }
  const vb = Object.prototype.hasOwnProperty.call(ICONS, id) ? '' : variantBase(id);
  if (vb) return gearIconUri(vb, ink, opts); // a variant with no picture of its own: its base's (painted first)
  const svg = gearIcon(id);
  if (!svg) return '';
  const key = id + '|' + ink, hit = URIS.get(key);
  if (hit) return hit;
  const uri = 'data:image/svg+xml,' + encodeURIComponent(svg.replace(/<!--[\s\S]*?-->/g, '').replace(/\s+/g, ' ').replace(/currentColor/g, ink));
  URIS.set(key, uri);
  return uri;
}
/** The monoline icon only (effects and small tinted marks): gearIconUri with `line`. */
export const gearLineUri = (id: string | null | undefined, ink: string = GEAR_INK): string => gearIconUri(id, ink, { line: true });

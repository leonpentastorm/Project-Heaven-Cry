// Weapon and armour icons (art/style-guide/weapon-icons.md; the working spec is art/icons/weapons/README.md): one monoline SVG
// per item, art/icons/weapons/<id>.svg for every weapon in data/weapons.json, art/icons/armour/<id>.svg for every
// armour piece and shield in data/items.json, and art/icons/focus/<id>.svg for the magic foci (the Evoker and the
// Emanator, both gloves at base: Leon, 10 Nov 2026). A 64 × 64 box, a 2-unit `currentColor` stroke, no fill: the screen sets
// the colour (white ink on the panel, or an attribute's ink).
//
// The files are bundled as markup (Vite's raw import, the way narrator/context.ts reads docs/lore), so a screen can drop
// the string straight into the DOM and tint it with CSS `color`. Adding an icon needs no code change: put the file in
// the folder, named by the item's id.
const FILES = import.meta.glob('../../../../art/icons/{weapons,armour,focus}/*.svg', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

const ICONS: Record<string, string> = {};
for (const [path, svg] of Object.entries(FILES)) {
  const id = path.slice(path.lastIndexOf('/') + 1, -'.svg'.length);
  ICONS[id] = svg.trim();
}

/** The icon's SVG markup for a weapon, armour or shield id, or null when the item has no icon. */
export function gearIcon(id: string | null | undefined): string | null {
  return (id && Object.prototype.hasOwnProperty.call(ICONS, id) && ICONS[id]) || null;
}

/** Whether the item has an icon. */
export const hasGearIcon = (id: string | null | undefined): boolean => gearIcon(id) !== null;

/** Every id with an icon (weapons and armour together). */
export const GEAR_ICON_IDS: readonly string[] = Object.keys(ICONS).sort();

// ---------- as an image (the template runtime takes text holes only: an <img> with a data URI, as glyphUri does) ----------
/** The ink on a panel (the UI's text white) and on a row that can't be used now (muted). */
export const GEAR_INK = '#E7EBF3';
export const GEAR_INK_OFF = '#7F8BA1';
const URIS = new Map<string, string>();
/** The icon as a data URI drawn in one ink (an <img> can't read CSS `color`, so the ink goes into the markup), or ''
 *  when the item has no icon: the screen then draws nothing in the slot. */
export function gearIconUri(id: string | null | undefined, ink: string = GEAR_INK): string {
  const svg = gearIcon(id);
  if (!svg) return '';
  const key = id + '|' + ink, hit = URIS.get(key);
  if (hit) return hit;
  const uri = 'data:image/svg+xml,' + encodeURIComponent(svg.replace(/<!--[\s\S]*?-->/g, '').replace(/\s+/g, ' ').replace(/currentColor/g, ink));
  URIS.set(key, uri);
  return uri;
}

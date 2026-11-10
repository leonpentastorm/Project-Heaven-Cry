// Weapon and armour icons (docs/design/weapon-art.md; the working spec is art/icons/weapons/README.md): one monoline SVG
// per item, art/icons/weapons/<id>.svg for every weapon in data/weapons.json and art/icons/armour/<id>.svg for every
// armour piece and shield in data/items.json. A 64 × 64 box, a 2-unit `currentColor` stroke, no fill: the screen sets
// the colour (white ink on the panel, or an attribute's ink).
//
// The files are bundled as markup (Vite's raw import, the way narrator/context.ts reads docs/lore), so a screen can drop
// the string straight into the DOM and tint it with CSS `color`. Adding an icon needs no code change: put the file in
// the folder, named by the item's id.
const FILES = import.meta.glob('../../../../art/icons/{weapons,armour}/*.svg', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

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

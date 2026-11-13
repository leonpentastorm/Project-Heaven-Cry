// Weapon and armour icons (art/style-guide/weapon-icons.md; the working spec is art/icons/weapons/README.md): one monoline SVG
// per item, art/icons/weapons/<id>.svg for every weapon in data/weapons.json, art/icons/armour/<id>.svg for every
// armour piece and shield in data/items.json, and art/icons/focus/<id>.svg for the magic foci (the Evoker and the
// Emanator, both gloves at base: Leon, 10 Nov 2026). A 64 × 64 box, a 2-unit `currentColor` stroke, no fill: the screen sets
// the colour (white ink on the panel, or an attribute's ink).
//
// The files are bundled as markup (Vite's raw import, the way narrator/context.ts reads docs/lore), so a screen can drop
// the string straight into the DOM and tint it with CSS `color`. Adding an icon needs no code change: put the file in
// the folder, named by the item's id.
import ASSETS from './assets.json';
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

// ---------- painted (Heavenprint) icons: art/style-guide/gear-icons.md ----------
// The artist's painted gear icons (art/icons/gear, the catalog's `gear` map) are built by `npm run assets`
// (tools/build_web_assets.py) as gear-<item id> (64 px) and gear-<item id>-lg (256 px) in assets.json. A painted icon is
// full colour: never tinted or masked (paintedStyle is for white-ink icons), so the ink below does not reach it. Derived
// gear with no item id has a gear id of its own: rounds-<calibre>, mag-<family>, armour-torso_class<N>_<name>
// (roundsGearId, magGearId, torsoGearId); they have no monoline icon.
let ART: Record<string, string> = ASSETS as Record<string, string>;
/** Tests only: use this asset map instead of assets.json (null restores it). */
export function setGearArt(map: Record<string, string> | null): void { ART = map || (ASSETS as Record<string, string>); }
const own = (k: string): string => (Object.prototype.hasOwnProperty.call(ART, k) ? ART[k] : '');
/** The painted icon's URL for an item (or derived gear) id, '' when it has none. large: the 256 px size. */
const paintedGear = (id: string, large: boolean): string => (large && own('gear-' + id + '-lg')) || own('gear-' + id);
/** Whether the item has a painted icon (it is then drawn as it is: full colour, no ink). */
export const hasPaintedGear = (id: string | null | undefined): boolean => !!id && !!paintedGear(id, false);

const slug = (s: string) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
/** The gear id of a calibre's loose rounds ('.32 decrkm' -> 'rounds-32_decrkm', '40 mm grenade' -> 'rounds-40mm_grenade'). */
export function roundsGearId(calibre: string | null | undefined): string {
  if (!calibre) return '';
  const want = slug(calibre), k = Object.keys(ART).find((x) => x.startsWith('gear-rounds-') && !x.endsWith('-lg') && slug(x.slice('gear-rounds-'.length)) === want);
  return k ? k.slice('gear-'.length) : '';
}
/** Which painted magazine each gun's magazines are (the art brief's "drawn for" lists; a gun not listed has none yet). */
export const MAG_ART: Record<string, string> = {
  service_pistol: 'pistol_32', decrkm_autopistol: 'pistol_32', spellslinger_pistol: 'pistol_32',
  decrkm_smg: 'smg_32', whisper_smg: 'smg_32', legion_pdw: 'smg_32', mandestra_drum_gun: 'drum_32',
  hellraiser_service_rifle: 'rifle', adamantile_battle_rifle: 'rifle', ccec_marksman_rifle: 'rifle', legion_bullpup: 'rifle',
  blackpoint_700: 'blackpoint_700', drifter_revolver: 'speedloader_revolver', frontier_hand_cannon: 'speedloader_50',
  hellraiser_lmg: 'belt', hellraiser_rotary: 'belt',
};
/** The gear id of a gun's magazine ('mag-pistol_32'), '' for a gun with none drawn. */
export const magGearId = (weaponId: string | null | undefined): string => (weaponId && Object.prototype.hasOwnProperty.call(MAG_ART, weaponId) ? 'mag-' + MAG_ART[weaponId] : '');
/** The gear id of the torso armour of an Armour Class (1 to 5), '' for none. */
export function torsoGearId(armourClass: number | null | undefined): string {
  if (!armourClass) return '';
  const k = Object.keys(ART).find((x) => x.startsWith('gear-armour-torso_class' + armourClass + '_') && !x.endsWith('-lg'));
  return k ? k.slice('gear-'.length) : '';
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
  if (!opts.line) { const p = paintedGear(id, !!opts.large); if (p) return p; }
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

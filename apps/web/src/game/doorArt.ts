// The nine doors art (the 17 Nov 2026 delivery; art/catalog.json move_icons, technique_icons, shadow_icons,
// tending_icons, condition_icons, door_emblems, class_portraits, camp_icons): one small resolver per family, beside
// gearIcons.ts (gear) and faithArt.ts (prayers). `npm run assets` (tools/build_web_assets.py) builds every delivered
// picture under its catalog id AND under the family's prefix + the DATA's own id (the catalog entry's `data_ids`, else
// its catalog id's stem): so a screen asks by the id it already holds and no id is typed here. Each returns the URL or
// '' (the screen then draws what it drew before: the text, the glyph). White ink on transparency: never tinted.
import ASSETS from './assets.json';
import { parseTechId, parsePerkId } from '@engine';

let A: Record<string, string> = ASSETS as Record<string, string>;
/** Tests only: use this asset map instead of assets.json (null restores it). */
export function setDoorArt(map: Record<string, string> | null): void { A = map || (ASSETS as Record<string, string>); }
const own = (k: string): string => (Object.prototype.hasOwnProperty.call(A, k) ? A[k] : '');
const by = (prefix: string) => (id: string | null | undefined, large = false): string => (!id ? '' : (large && own(prefix + id + '-lg')) || own(prefix + id));

/** The large copy of a built picture (the enlarged view): its assets.json key's '-lg' twin, else the picture itself. */
export function bigOf(src: string): string {
  for (const k in A) if (A[k] === src) return (!k.endsWith('-lg') && own(k + '-lg')) || src;
  return src;
}
/** A technique's icon, by its data/techniques.json id ('cleave', 'run_through'). */
export const techIconOf = by('tech-');
/** A condition's icon, by its data/conditions.json id ('bleeding', 'off_balance'). */
export const condIconOf = by('cond-');
/** A door's emblem, by its door's alpha skill id (skills.json: 'durability' is Guard's door). */
export const doorEmblemOf = by('door-');
/** A class's portrait (4:5), by its data/classes.json id ('defender'); large: the 800 x 1000 copy. */
export const classPortraitOf = by('class-');
/** A Survival place card's picture (place_icons, the after-0.30 delivery), by its option's key ('study', 'rite') or,
 *  for a Crossroads trade, the trade's id before the option's own part ('ev.offbooks:2' -> 'ev.offbooks'). */
export function placeIconOf(optionKey: string | null | undefined, large = false): string {
  if (!optionKey) return '';
  return by('place-')(optionKey, large) || by('place-')(optionKey.split(':')[0], large);
}
/** A mark of the interface (interface_icons icon-<group>-<word>): the status strip's groups ('status', 'helps'), a map
 *  hazard ('hazard', 'fire'), a Sigil zone ('zone', 'trap'), a resource, a tone. '' when not delivered. */
export function uiMarkOf(group: string, word: string | null | undefined, large = false): string {
  return word ? by('icon-' + group + '-')(word, large) : '';
}
/** A camp step's sign, by the checklist's key ('weapon', 'focus', 'budget', 'boon', 'ready'). */
export const campStepIconOf = by('camp-step-');

/** An item's own icon among the action families (a class move, a door step, a door verb): by its item key
 *  ('class:defender.brace', 'verb:shadow.tag', 'skill:durability.1'), the action's own first when the item has several
 *  ('skill:durability.1#guard_slam'), or a core action's id ('hide'). */
export function moveIconOf(itemKey: string | null | undefined, actionId?: string | null): string {
  if (!itemKey) return '';
  for (const p of ['move-', 'shadow-', 'tend-']) { const u = (actionId && own(p + itemKey + '#' + actionId)) || own(p + itemKey); if (u) return u; }
  return '';
}

/** An action row's icon, by the row's action id as the engine's descriptors name it: a technique (`tq:<hand>:<id>`),
 *  a class move, door step or verb (`pk:<item key>#<action>`), or a core action ('hide'). '' for any other row. */
export function actionIconOf(actionId: string | null | undefined): string {
  if (!actionId) return '';
  const t = parseTechId(actionId); if (t) return techIconOf(t.id);
  const p = parsePerkId(actionId); if (p) return moveIconOf(p.id, p.actionId);
  return own('move-' + actionId); // a core action a door's tab also lists (Hide on SHADOW: its catalog id's stem)
}

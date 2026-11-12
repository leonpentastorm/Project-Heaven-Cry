// Texts read their numbers (12 Nov 2026). A number in a data item's text is a {placeholder} naming the item's own
// field ("+{=effects.1.value} to hit"), and this module fills them in, in place, when the data is first loaded: every
// file that imports a data/*.json imports this one first, so no code ever sees an unfilled text. The same rules are in
// tools/text_numbers.py (the validator, and the web's protodata.json); test/datatext.test.ts holds the two equal.
//   {=path}         keys and list indexes joined by dots, from the item (the nearest enclosing object with an id);
//                   a leading dot starts at the object that holds the text
//   {=path|format}  abs, signed, pct (0.25 -> 25), more (1.25 -> 25), less (0.75 -> 25)
import callsJ from '../../../data/calls.json';
import classesJ from '../../../data/classes.json';
import conditionsJ from '../../../data/conditions.json';
import enemiesJ from '../../../data/enemies.json';
import feelingsJ from '../../../data/feelings.json';
import itemsJ from '../../../data/items.json';
import objectsJ from '../../../data/objects.json';
import patronsJ from '../../../data/patrons.json';
import perksJ from '../../../data/perks.json';
import rulesJ from '../../../data/rules.json';
import sigilsJ from '../../../data/sigils.json';
import skillsJ from '../../../data/skills.json';
import soulJ from '../../../data/soul_modules.json';
import techniquesJ from '../../../data/techniques.json';
import traitsJ from '../../../data/traits.json';
import weaponsJ from '../../../data/weapons.json';
import worldJ from '../../../data/world_play.json';

const PH = /\{=(\.?[A-Za-z0-9_$]+(?:\.[A-Za-z0-9_$]+)*)(?:\|([a-z]+))?\}/g;
const FORMATS = ['', 'abs', 'signed', 'pct', 'more', 'less'];

/** A number as a text shows it: rounded to 4 places, no trailing zeros, a true minus sign. */
export function fmtNumber(v: number, how = ''): string {
  if (how === 'pct') v = v * 100; else if (how === 'more') v = (v - 1) * 100; else if (how === 'less') v = (1 - v) * 100; else if (how === 'abs') v = Math.abs(v);
  const r = Math.round(v * 1e4) / 1e4, a = Math.abs(r);
  const s = Number.isInteger(a) ? String(a) : a.toFixed(4).replace(/0+$/, '');
  return r < 0 ? '−' + s : how === 'signed' ? '+' + s : s;
}
function lookup(root: any, path: string): any {
  let node = root;
  for (const part of path.split('.')) { if (node == null || typeof node !== 'object') return undefined; node = Array.isArray(node) ? node[Number(part)] : node[part]; }
  return node;
}
/** One text with its placeholders filled from the item (a leading dot: from the object that holds the text). A
 * placeholder that does not resolve to a number is left as it is (the validator refuses the data before it ships). */
export function renderText(text: string, item: any, holder: any): string {
  return text.replace(PH, (all, path: string, how = '') => {
    if (!FORMATS.includes(how)) return all;
    const v = path.startsWith('.') ? lookup(holder, path.slice(1)) : lookup(item, path);
    return typeof v === 'number' && Number.isFinite(v) ? fmtNumber(v, how) : all;
  });
}
const hasId = (o: any) => o && typeof o === 'object' && !Array.isArray(o) && (typeof o.id === 'string' || typeof o.id === 'number');
function fillItem(node: any, item: any, top: boolean) {
  if (!node || typeof node !== 'object') return;
  if (!top && hasId(node)) return; // an item of its own: walk() reaches it
  for (const k of Object.keys(node)) {
    const v = node[k];
    if (typeof v === 'string') { if (v.includes('{=')) node[k] = renderText(v, item, node); } else fillItem(v, item, false);
  }
}
function walk(node: any) {
  if (!node || typeof node !== 'object') return;
  if (hasId(node)) fillItem(node, node, true);
  for (const k of Object.keys(node)) walk(node[k]);
}
/** Fill every placeholder under a parsed data file, in place. Filling twice changes nothing. */
export function resolveTexts<T>(root: T): T { walk(root); return root; }

for (const j of [callsJ, classesJ, conditionsJ, enemiesJ, feelingsJ, itemsJ, objectsJ, patronsJ, perksJ, rulesJ, sigilsJ, skillsJ, soulJ, techniquesJ, traitsJ, weaponsJ, worldJ]) resolveTexts(j);

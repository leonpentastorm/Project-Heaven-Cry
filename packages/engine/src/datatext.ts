// Texts read their numbers (12 Nov 2026). A number in a data item's text is a {placeholder} naming the item's own
// field ("+{=effects.1.value} to hit"), and this module fills them in, in place, when the data is first loaded: every
// file that imports a data/*.json imports this one first, so no code ever sees an unfilled text. The same rules are in
// tools/text_numbers.py (the validator, and the web's protodata.json); test/datatext.test.ts holds the two equal.
//   {=path}         keys and list indexes joined by dots, from the item (the nearest enclosing object with an id);
//                   a leading dot starts at the object that holds the text
//   {=path|format}  abs, signed, pct (0.25 -> 25), more (1.25 -> 25), less (0.75 -> 25)
import actionsJ from '../../../data/actions.json';
import callsJ from '../../../data/calls.json';
import classesJ from '../../../data/classes.json';
import conditionsJ from '../../../data/conditions.json';
import enemiesJ from '../../../data/enemies.json';
import feelingsJ from '../../../data/feelings.json';
import figmentsJ from '../../../data/figments.json';
import tendingJ from '../../../data/tending.json';
import shadowJ from '../../../data/shadow.json';
import pressureJ from '../../../data/pressure.json';
import forksJ from '../../../data/forks.json';
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
import survivalJ from '../../../data/survival.json';

// ---------------------------------------------------------------------------------------------- number blocks
// (the type and its one evaluation, moved here from effects/amounts.ts by rules 1.70 item 5547 so a text that binds a
// block fills from the same function; amounts.ts re-exports them; the head comment there says what a block is)
export interface NumberBlock { base: number; per?: { of: string; value: number }[]; min?: number; max?: number;
  /** Rules 1.33 (a door's ladder): each step adds its value once its source reaches `at` ({of: "skill:empathy", at: 6,
   * value: 3}: Bond's reach 6, 9 from Empathy 6). */ steps?: { of: string; at: number; value: number }[] }
/** Is this a number block (and not an amount block, which has a `kind`)? */
export const isNumberBlock = (x: any): x is NumberBlock => !!x && typeof x === 'object' && !Array.isArray(x) && typeof x.base === 'number' && !('kind' in x);
/** A number block's value (a plain number is itself): base + Σ value × source(of), between min and max. `src` answers
 * each `of` (a handler: its counts; the item-op runner: sourceOf). Anything else (null, a word) is NaN: the caller's bug. */
export function numberOf(x: number | NumberBlock, src: (of: string) => number = () => 0): number {
  if (typeof x === 'number') return x;
  if (!isNumberBlock(x)) return NaN;
  let v = (x.per || []).reduce((t, p) => t + p.value * (src(p.of) || 0), x.base);
  for (const st of x.steps || []) if ((src(st.of) || 0) >= st.at) v += st.value;
  if (typeof x.min === 'number') v = Math.max(x.min, v);
  if (typeof x.max === 'number') v = Math.min(x.max, v);
  return v;
}
// the data a reference's namespace reads (dataRef below)
const REF_ROOTS: Record<string, () => any> = { tech_rule: () => (techniquesJ as any).rules, rule: () => rulesJ, cond: () => CONDS_BY_ID() };
let condsById: Record<string, any> | null = null;
const CONDS_BY_ID = () => (condsById ||= Object.fromEntries(((conditionsJ as any).items || []).map((c: any) => [c.id, c])));
/** Rules 1.70 item 5547 (P6): THE resolver of a data reference a number block may name, a value that belongs to no item
 * (or to another file's row): `tech_rule:<path>`, a number of techniques.json `rules` (Cover Them's Guard cost reads
 * tech_rule:guard.interpose_cost); `rule:<path>`, a number of rules.json (the Shadow gains' shared limit reads
 * rule:shadow.door_gains_per_turn); `cond:<id>.<path>`, a number of a conditions.json row (Read Them's card reads
 * cond:read_them.effects.0.value). NaN for anything else (the validator refuses a reference that does not resolve).
 * effects/triggers.ts sourceOf and the texts below read it; tools/text_numbers.py data_ref is its Python twin. */
export function dataRef(of: string): number {
  const i = of.indexOf(':'), ns = of.slice(0, i), path = of.slice(i + 1), root = REF_ROOTS[ns];
  if (!root) return NaN;
  const v = lookup(root(), path); return typeof v === 'number' ? v : NaN;
}
/** A number block that reads only data references (dataRef), worked out; null for any other block (it waits on a fight). */
const blockOfRefs = (v: any): number | null => (isNumberBlock(v) && !(v.steps || []).length && (v.per || []).every((p) => p.of.slice(0, p.of.indexOf(':')) in REF_ROOTS) ? numberOf(v, dataRef) : null);

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
    const raw = path.startsWith('.') ? lookup(holder, path.slice(1)) : lookup(item, path), v = typeof raw === 'number' ? raw : blockOfRefs(raw); // rules 1.70 item 5547: a block of data references
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

for (const j of [actionsJ, callsJ, classesJ, conditionsJ, enemiesJ, feelingsJ, itemsJ, objectsJ, patronsJ, perksJ, rulesJ, sigilsJ, skillsJ, soulJ, techniquesJ, traitsJ, weaponsJ, worldJ, tendingJ, figmentsJ, shadowJ, pressureJ, forksJ, survivalJ]) resolveTexts(j); // (shadow.json: its verbs' texts showed {=…} on the hover card until Classes 3.0 step 10)

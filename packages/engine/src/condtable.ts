// THE CONDITION TABLE (engine foundations 2, review finding F4). data/conditions.json is the table: this file is its
// ONE loader. Nothing else in the engine imports that file, and no condition's name, family, duration or number is
// written in TypeScript. To add a condition, add a row to the data (data/CONVENTIONS.md, "Conditions") and call
// applyCond with its id; tools/validate.py checks the fields read here, and test/lint-conditions.test.ts fails on a
// condition id used in code that the data does not have (and on a row nothing uses).
//
// How the engine runs a row (`engine`):
//   table   kept in u.conds[key] with its rounds left; put on by applyCond, ended by endCond (magic.ts)
//   flag    a field of the unit (Bleeding u.bleed, Dazed u.dazedNext, Prone u.prone, Hidden u.hidden, Injured
//           u.injuries), written only by applyCond and endCond
//   state   a unit state with its own rule and its own setter (Braced, Overwatch, Downed: unitstate.ts); applyCond
//           does not put it on
// DURATIONS ARE IN ONE UNIT: `rounds` counts the ends of the bearer's own turns (a condition put on during the
// bearer's own turn doesn't lose a round at that turn's end). `until` lasts until its rule ends it (UNTIL, 99).
import './datatext'; // fills the texts' {=placeholders} before any data is read
import conditionsJ from '../../../data/conditions.json';
import type { Fam } from './rolls';

/** "Until something ends it", in rounds (a table condition with this many never ticks). */
export const UNTIL = 99;
/** How a condition is run: by its table row, as a flag only, or as a unit state (unitstate.ts). */
export type CondEngine = 'table' | 'flag' | 'state';
/** What a to-hit change applies to (the `context` of an `attack_mod` effect). */
export type HitContext = 'own_attacks' | 'next_attack' | 'not_vs_source' | 'vs_source' | 'marker_squad_vs_self' | 'melee_vs_self' | 'ranged_vs_self';
/** The numbers of a condition the engine applies, read from the row's `effects`. */
export interface CondMods {
  /** Defense (Guarded +2, Corroded −2). */ defense?: number; /** × Movement (Slowed 0.5). */ moveMult?: number; /** tiles seen (Blinded 1). */ vision?: number;
  /** AP on the bearer's turn (Nausea −1, Dazed −2, Quickened +2). */ ap?: number; /** on saves of a family (Shaken: heart −2). */ save?: Partial<Record<Fam, number>>;
  /** × damage dealt (Weakened 0.75). */ dealtMult?: number; /** × the next attack's damage (Sharpened 1.25). */ nextAttackMult?: number;
  /** AP added to drawing and Evoking (Left Brain Debuff +1). */ sigilAp?: number; /** × the MP of Soul spells (Right Brain Debuff 1.2). */ soulCostMult?: number;
  /** on d20s with a skill of this tag ('core:mind', 'core:soul', 'attr:expression'). */ skills?: { tag: string; value: number }[];
  /** to hit, by what it applies to. */ hit?: Partial<Record<HitContext, number>>;
  /** the reaction kinds it forbids (a `forbid` of action `reaction`, with its `kinds`; none named: 'all'). Rules 1.28. */ noReact?: string[] | 'all';
}
/** One condition as the engine reads its data/conditions.json row. */
export interface CondDef {
  /** the data's id */ id: string; /** the name it is stored under (u.conds[key]; the id unless the row says otherwise) */ key: string;
  /** the word in "X is <name>" (the row's label, else its name) */ name: string; /** the row's own name */ title: string; text: string;
  /** the save family (debuffs only: a boon or a state has none) */ fam?: Fam; /** rounds (UNTIL: until its rule ends it) */ rounds: number;
  boon?: boolean; /** it never ticks */ noTick?: boolean; /** nobody saves against it */ noSave?: boolean; engine: CondEngine; until?: string; mods: CondMods;
}

const HIT_CONTEXTS: HitContext[] = ['own_attacks', 'next_attack', 'not_vs_source', 'vs_source', 'marker_squad_vs_self', 'melee_vs_self', 'ranged_vs_self'];
function modsOf(row: any): CondMods {
  const m: CondMods = {};
  for (const e of (row.effects || []) as any[]) {
    if (e.op === 'stat_mod' && typeof e.value === 'number' && !e.when) {
      if (e.stat === 'defense') m.defense = e.value; else if (e.stat === 'move_mult') m.moveMult = e.value; else if (e.stat === 'vision') m.vision = e.value;
      else if (e.stat === 'ap') m.ap = e.value; else if (e.stat === 'damage_dealt_pct') m.dealtMult = 1 + e.value / 100;
      else if (e.stat === 'sigil_ap') m.sigilAp = e.value; else if (e.stat === 'soul_cost_pct') m.soulCostMult = 1 + e.value / 100;
      else if (/^save_(body|brain|heart)$/.test(e.stat)) (m.save ||= {})[e.stat.slice(5) as Fam] = e.value;
    }
    if (e.op === 'skill_mod_tag' && typeof e.value === 'number') (m.skills ||= []).push({ tag: e.tag, value: e.value });
    if (e.op === 'attack_mod' && typeof e.value === 'number' && HIT_CONTEXTS.includes(e.context || 'own_attacks')) (m.hit ||= {})[(e.context || 'own_attacks') as HitContext] = e.value;
    if (e.op === 'damage_mult' && typeof e.value === 'number' && e.context === 'next_attack') m.nextAttackMult = e.value;
    if (e.op === 'forbid' && e.action === 'reaction') m.noReact = Array.isArray(e.kinds) && e.kinds.length ? [...e.kinds] : 'all';
  }
  return m;
}
/** The rows as the data has them (the wiki and the amounts read these; nothing else loads the file). */
export const CONDITION_ROWS: any[] = (conditionsJ as any).items;
/** The table, by storage key. */
export const CONDS: Record<string, CondDef> = {};
/** Every other name a condition answers to (its data id when the key differs, its aliases) → its key. */
const ALIAS: Record<string, string> = {};
/** Read one row into the table (the loader, and addConditionRows). */
function loadRow(row: any): void {
  const key: string = row.key || row.id, until: string | undefined = row.duration?.until;
  if (!['table', 'flag', 'state'].includes(row.engine)) throw new Error('conditions.json: ' + row.id + ' has no `engine` (table, flag or state).');
  if (!until && !(row.duration?.rounds > 0)) throw new Error('conditions.json: ' + row.id + ' needs duration.rounds or duration.until.');
  const fam = ['body', 'brain', 'heart'].includes(row.family) && !row.boon ? (row.family as Fam) : undefined;
  if (row.save && !fam) throw new Error('conditions.json: ' + row.id + ' has a save and no family.');
  CONDS[key] = { id: row.id, key, name: row.label || row.name, title: row.name, text: row.text || '', ...(fam ? { fam } : {}), rounds: until ? UNTIL : row.duration.rounds,
    ...(row.boon ? { boon: true } : {}), ...(until ? { noTick: true, until } : {}), ...(row.save ? {} : { noSave: true }), engine: row.engine, mods: modsOf(row) };
  if (key !== row.id) ALIAS[row.id] = key;
  for (const a of (row.aliases || []) as string[]) ALIAS[a] = key;
}
for (const row of CONDITION_ROWS) loadRow(row);
/** A number that changes whenever rows are added or taken away (an index over the rows keys on it). */
export let condRowsVersion = 0;
const ADDED: any[] = [];
/** Add condition rows at run time, written as data/conditions.json rows (a relic's own condition, a test's fixture):
 * the same loader reads them; they run as items like any row (Classes 3.0 P4). Never a row of the data file's ids. */
export function addConditionRows(rows: any[]): void {
  for (const row of rows) { if (CONDS[row.key || row.id] && !ADDED.includes(row)) throw new Error('conditions: ' + row.id + ' is already a row'); loadRow(row); CONDITION_ROWS.push(row); ADDED.push(row); }
  condRowsVersion++;
}
/** Take every added row away again. */
export function clearAddedConditions(): void {
  for (const row of ADDED.splice(0)) { const key = row.key || row.id; delete CONDS[key]; delete ALIAS[row.id]; for (const a of row.aliases || []) delete ALIAS[a]; const i = CONDITION_ROWS.indexOf(row); if (i >= 0) CONDITION_ROWS.splice(i, 1); }
  condRowsVersion++;
}
/** A condition's storage key from any of its names (an unknown id comes back as it is). */
export const condId = (id: string): string => ALIAS[id] || id;
/** A condition's row, by any of its names. */
export const condDef = (id: string): CondDef | undefined => CONDS[condId(id)];
/** The numbers of a condition (an empty object for one that has none). */
export const condMods = (id: string): CondMods => CONDS[condId(id)]?.mods || {};
/** Every name the engine answers to: keys, data ids and aliases (the lint reads it). */
export const CONDITION_NAMES: string[] = [...new Set([...Object.keys(CONDS), ...Object.keys(ALIAS)])];
/** The conditions kept as unit flags, and the unit states. */
export const FLAG_CONDS = new Set(Object.values(CONDS).filter((d) => d.engine === 'flag').map((d) => d.key));
/** The conditions that are unit states (set through unitstate.ts, never written by hand). */
export const STATE_CONDS = new Set(Object.values(CONDS).filter((d) => d.engine === 'state').map((d) => d.key));

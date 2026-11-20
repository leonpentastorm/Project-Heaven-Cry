// ITEM TAGS (rules 1.91 items 7900 to 7903, 7910, 7917, 7919, 7920; Items 2.0 stage A, primitive N1). An item's tags
// are `kind:value` strings of the closed list of kinds in data/rules.json `item_tag_kinds`; general code asks for tags,
// never for an id. This file is the one reader: `itemTags` (one item, or one instance: its grade is the instance's) and
// `itemsWith` (the rows whose tags answer a query, in table order: weapons first, then items). The families
// (data/families.json) are read here too: a row's family is its `family`, its base's for a variant, or its own id.
// Nothing here prices, deals or rolls; `rolled` asks credits.ts priceOf, the one price.
import './datatext'; // fills the texts' {=placeholders} before any data is read
import familiesJ from '../../../data/families.json';
import { WEAPON, ITEM, RULES, ARMOUR_CLASSES } from './data';
import { priceOf } from './credits';
import type { Rarity } from './character';

/** One form of a family (data/families.json): its id and, for a weapon family, the technique it lends and teaches. */
export interface FamilyForm { id: string; teaches?: string }
/** A family row (data/families.json): its maker line, its forms, its Weapon Art slot (null in this pass). */
export interface FamilyDef { id: string; name: string; line: string; form_kind: string; forms: FamilyForm[]; weapon_art: null }
export const FAMILIES: FamilyDef[] = (familiesJ as any).items;
export const FAMILY: Record<string, FamilyDef> = Object.fromEntries(FAMILIES.map((f) => [f.id, f]));
/** The closed list of tag kinds (rules.json item_tag_kinds). */
export const ITEM_TAG_KINDS: string[] = ((RULES as any).item_tag_kinds || []).map((k: any) => k.id);
if (!ITEM_TAG_KINDS.length) throw new Error('data/rules.json item_tag_kinds is missing (rules 1.91 item 7900)');
/** The slots of the slot table (rules.json equipment_slots.table): what a `slot:` tag may name. */
const SLOT_IDS = new Set<string>((((RULES as any).equipment_slots?.table || []) as any[]).map((r) => r.id));
const ARMOUR_SLOT: string = (RULES as any).equipment_slots?.armour_class_from || 'torso_outer';

/** A row by id: a weapon row, an item row, or body armour's class row (`armour:<n>`), or null. */
function rowOf(id: string): any | null {
  const w: any = WEAPON[id] || (ITEM as any)[id]; if (w) return w;
  const a = /^armour:(\d+)$/.exec(id); return a ? ARMOUR_CLASSES[Number(a[1])] || null : null;
}
/** A row's family (rules 1.91 item 7902): its `family`; a variant's base's; else its own id (a row with no family is
 * its own family). */
export function itemFamilyOf(id: string): string {
  const r = rowOf(id); if (!r) return id;
  return r.family || (r.variant_of ? itemFamilyOf(r.variant_of) : id);
}
/** The family form a row is (its family's row of its `form`), or null (no family, or no such form). */
export function familyForm(id: string): FamilyForm | null {
  const r = rowOf(id), f = r?.family ? FAMILY[r.family] : null;
  return (f && f.forms.find((x) => x.id === r.form)) || null;
}
/** A unique's fixed grade (rules 1.91 item 7917): a unique variants line's `rarity`, written to the instance at every
 * grant and pool; null for every other row (an ordinary variant's grade is its price grade only). */
export const fixedGradeOf = (id: string | null | undefined): Rarity | null => {
  const r: any = id ? rowOf(id) : null; return r?.unique ? ((r.variant_grade || 'standard') as Rarity) : null;
};
/** The grade an instance of `id` is given or holds: a unique's fixed grade, else `rarity`, else Standard. */
export const gradeFor = (id: string, rarity?: Rarity | null): Rarity => fixedGradeOf(id) || rarity || 'standard';

const ROW_TAGS = new WeakMap<object, string[]>();
/** The row's own tags (everything but the grade), kept per row object. */
function rowTags(id: string, r: any): string[] {
  const hit = ROW_TAGS.get(r); if (hit) return hit;
  const armour = /^armour:\d+$/.test(id), out: string[] = [];
  const kind = armour ? 'armour' : r.category; if (kind) out.push('kind:' + kind);
  out.push('family:' + itemFamilyOf(id));
  for (const k of ['form', 'line', 'pattern']) if (typeof r[k] === 'string' && r[k]) out.push(k + ':' + r[k]);
  const slot = armour ? ARMOUR_SLOT : SLOT_IDS.has(r.slot) ? r.slot : WEAPON[id] ? 'main_hand' : null; if (slot) out.push('slot:' + slot);
  for (const t of (r.tags || []) as string[]) out.push('role:' + t);
  if (r.unique) out.push('unique:true');
  ROW_TAGS.set(r, out); return out;
}
/** An item's tags (rules 1.91 item 7900): kind, family, form, line, pattern, grade (the instance's; Standard with
 * none), slot, role and unique, as `kind:value` strings. An id that is no row has none. */
export function itemTags(id: string | null | undefined, inst?: { rarity?: Rarity | null } | null): string[] {
  const r = id ? rowOf(id) : null; if (!r) return [];
  return [...rowTags(id!, r), 'grade:' + gradeFor(id!, inst?.rarity)];
}
/** Does the item (or instance) carry this tag? */
export const hasTag = (id: string | null | undefined, tag: string, inst?: { rarity?: Rarity | null } | null): boolean => itemTags(id, inst).includes(tag);
/** The value of one tag kind on an item (its first), or null: `tagOf('sabre', 'kind')` is 'light_melee'. */
export const tagOf = (id: string | null | undefined, kind: string): string | null => { const t = itemTags(id).find((x) => x.startsWith(kind + ':')); return t ? t.slice(kind.length + 1) : null; };

/** A query of `itemsWith`: every tag of `all`, at least one of `any` (when given), none of `none`; `from` one table;
 * `rolled`: only rows a pool may roll (priced, and no variant: a variant, a unique included, is never rolled). */
export interface ItemQuery { all?: string[]; any?: string[]; none?: string[]; from?: 'weapons' | 'items'; rolled?: boolean }
/** Does an item answer the query (its row's tags; a Standard instance)? */
export function tagsAnswer(id: string, q: ItemQuery): boolean {
  const t = itemTags(id); if (!t.length) return false;
  if (q.rolled && (priceOf(id) == null || (rowOf(id) as any)?.variant_of)) return false;
  return (q.all || []).every((x) => t.includes(x)) && (!q.any || q.any.some((x) => t.includes(x))) && !(q.none || []).some((x) => t.includes(x));
}
/** The ids of the weapon and item rows that answer the query, in table order (weapons first, then items not also a
 * weapon). The one way a pool lists what it may hold (rules 1.91 item 7920). */
export function itemsWith(q: ItemQuery): string[] {
  const ids = [...(q.from !== 'items' ? Object.keys(WEAPON) : []), ...(q.from !== 'weapons' ? Object.keys(ITEM).filter((id) => q.from === 'items' || !WEAPON[id]) : [])];
  return ids.filter((id) => tagsAnswer(id, q));
}

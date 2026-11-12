// Drop tables (rules revision 1.9, World Play 1.1; docs/design/world-play-1.1-spec.md section 4; spec 14 items
// 691–700). The engine rolls every drop, on the fight's seeded dice, once per death (noteDeaths, the one sweep that sees
// every death), and puts it in the pile on the tile where the enemy died (containers.ts through dropToPile).
// Three layers, the most specific winning: the engine's defaults (data/loot_tables.json), a campaign's own tables and
// `drops` on its zone people and encounter enemies, and the Narrator's `drops` on combat.enemies[] and npcs[].
import './datatext'; // fills the texts' {=placeholders} before any data is read
import ltJ from '../../../data/loot_tables.json';
import { WEAPON, ITEM, CALIBRE_NAME, SIGIL, TONE, SCHOOL, MODULE } from './data';
import { type PackItem, type Rarity, maxDurOf, plotItem, roundsOf, moduleShelved } from './character';
import { lootToPack, magItem, itemLabel } from './containers';
import { say, type Combat, type Unit, dropToPile } from './combat';
import { type Rng, next, die } from './rng';

/** One thing a drop list or a table can give: an id in the loot shape (a weapon, an item, `mag:<weapon>`,
 * `rounds:<calibre>`, `personal` for a personal effect, anything else a plot item), a qty or a [min, max] range, a
 * chance (drops lists only; absent: certain) or a weight (tables only). */
export interface DropEntry { item: string; qty?: number | [number, number]; chance?: number; weight?: number; rarity?: string; name?: string; text?: string; note?: string }
/** What one enemy drops beyond its weapon and magazines: a table to roll, and a list of its own. */
export interface Drops { table?: string; items?: DropEntry[] }
/** A weighted table (`none`: the weight of nothing). */
export interface LootTable { id: string; name?: string; text?: string; none?: number; entries: DropEntry[] }

const L: any = ltJ;
/** The drop rules (PROVISIONAL, items 691–700). */
export const LOOT: {
  caps: Record<string, number>; worn_durability: { min: number; max: number }; spare_mags_max: number; inline_max: number; natural_weapons: string[];
  rolls_by_tier: Record<string, number>; kind_tables: Record<string, string>; caster_table: string; boss_table: string; personal_items: { name: string; text: string }[];
} = L;
/** The engine's own tables, by id. */
export const LOOT_TABLES: Record<string, LootTable> = Object.fromEntries((L.items as LootTable[]).map((t) => [t.id, t]));

const RARITIES = ['standard', 'fine', 'masterwork', 'relic', 'celestial'];
const calibreOk = (s: string) => Object.keys(CALIBRE_NAME).some((k) => k.toLowerCase() === s.toLowerCase() || CALIBRE_NAME[k].toLowerCase() === s.toLowerCase());
/** An id the engine knows as a thing (not a plot item): a weapon, an item, a magazine for a magazine weapon, rounds of a
 * calibre, a personal effect. */
export function knownDropId(id: string): boolean {
  if (WEAPON[id] || ITEM[id] || id === 'personal') return true;
  const m = /^mag:(.+)$/i.exec(id); if (m) return !!WEAPON[m[1]] && WEAPON[m[1]].magazine != null;
  const r = /^rounds:(.+)$/i.exec(id); if (r) return calibreOk(r[1]);
  return false;
}
const ammoId = (id: string) => /^(mag|rounds):/i.test(id);
/** A qty as written: a number or a [min, max] range, both within 1–20 (for magazines and rounds, 0–120: rounds). */
function cleanQty(q: any, id: string): number | [number, number] | undefined {
  const lo = ammoId(id) ? 0 : 1, hi = ammoId(id) ? 120 : 20, clamp = (n: number) => Math.max(lo, Math.min(hi, Math.round(n)));
  if (Array.isArray(q) && q.length === 2 && q.every((n) => Number.isFinite(Number(n)))) { const a = clamp(Number(q[0])), b = clamp(Number(q[1])); return a === b ? a : [Math.min(a, b), Math.max(a, b)]; }
  if (q != null && Number.isFinite(Number(q))) return clamp(Number(q));
  return undefined;
}
function cleanEntry(e: any, weighted: boolean): DropEntry | null {
  if (!e || typeof e !== 'object') return null;
  // A plot item as loot[] writes it (item "", a name and a line of text) is kept: it drops as that plot item (item 698).
  const raw = typeof e.item === 'string' ? e.item.trim() : '', named = typeof e.name === 'string' && !!e.name.trim();
  if (!raw && !named) return null;
  const item = raw.slice(0, 60), out: DropEntry = { item };
  const q = cleanQty(e.qty, item); if (q !== undefined) out.qty = q;
  if (weighted) { const w = Number(e.weight); if (!(w > 0)) return null; out.weight = w; }
  else if (e.chance != null && Number.isFinite(Number(e.chance))) out.chance = Math.max(0, Math.min(1, Number(e.chance)));
  if (RARITIES.includes(e.rarity)) out.rarity = e.rarity;
  if (typeof e.name === 'string' && e.name.trim()) out.name = e.name.trim().slice(0, 60);
  if (typeof e.text === 'string' && e.text.trim()) out.text = e.text.trim().slice(0, 200);
  if (typeof e.note === 'string' && e.note.trim()) out.note = e.note.trim().slice(0, 40);
  return out;
}
/** A campaign's tables, cleaned (entries with a bad weight or no id are left out). */
export function cleanTables(list: any): LootTable[] {
  if (!Array.isArray(list)) return [];
  return list.filter((t) => t && typeof t === 'object' && typeof t.id === 'string' && t.id).slice(0, 40).map((t) => ({
    id: String(t.id).slice(0, 40), ...(t.name ? { name: String(t.name).slice(0, 60) } : {}), none: Math.max(0, Number(t.none) || 0),
    entries: (Array.isArray(t.entries) ? t.entries : []).map((e: any) => cleanEntry(e, true)).filter(Boolean).slice(0, 40) as DropEntry[],
  }));
}
/** A `drops` value, cleaned (item 698). max: the most entries a list keeps (the Narrator's inline_max, 4; a campaign's
 * none). tables: the campaign's own, besides the engine's. An unknown table is ignored; a value that named only an
 * unknown table gives undefined (the layer under it stands), while `{}` or an empty list means "no rolled drops". */
export function cleanDrops(d: any, o: { max?: number; tables?: LootTable[] } = {}): Drops | undefined {
  if (!d || typeof d !== 'object' || Array.isArray(d)) return undefined;
  const known = (id: string) => !!LOOT_TABLES[id] || !!o.tables?.some((t) => t.id === id);
  const out: Drops = {};
  if (typeof d.table === 'string' && known(d.table)) out.table = d.table;
  if (Array.isArray(d.items)) out.items = d.items.slice(0, o.max ?? LOOT.inline_max).map((e: any) => cleanEntry(e, false)).filter(Boolean) as DropEntry[];
  if (d.table != null && !out.table && !Array.isArray(d.items)) return undefined;
  return out;
}

// ---------- rolling ----------
const tablesOf = (cb: Combat): Record<string, LootTable> => ({ ...LOOT_TABLES, ...Object.fromEntries((cb.lootTables || []).map((t) => [t.id, t])) });
const rollQty = (rng: Rng, q: DropEntry['qty']) => (Array.isArray(q) ? q[0] + die(rng, q[1] - q[0] + 1) - 1 : q);
/** One roll on a table: an entry by weight, or nothing. */
function rollTable(rng: Rng, t: LootTable | undefined): DropEntry | null {
  if (!t) return null;
  const total = (t.none || 0) + t.entries.reduce((s, e) => s + (e.weight || 0), 0); if (total <= 0) return null;
  let r = next(rng) * total - (t.none || 0); if (r < 0) return null;
  for (const e of t.entries) { r -= e.weight || 0; if (r < 0) return e; }
  return t.entries[t.entries.length - 1] || null;
}
/** What a dropped plate teaches when its entry names nothing (item 692): a Sigil plate one Sigil word, a Heart plate
 * one tone (not Raw), school or module, evenly, on the fight's dice. A plate always drops readable. */
export function rollPlateNote(rng: Rng, item: string): string {
  const pick = (l: string[]) => (l.length ? l[die(rng, l.length) - 1] : '');
  if (item === 'sigil_plate') return pick(Object.keys(SIGIL).sort());
  if (item === 'heart_plate') {
    const l = [...Object.keys(TONE).filter((t) => t !== 'raw').sort().map((t) => 'tone: ' + t), ...Object.keys(SCHOOL).sort().map((t) => 'school: ' + t), ...Object.keys(MODULE).filter((t) => !moduleShelved(t)).sort().map((t) => 'module: ' + t)]; // shelved modules (rules 1.8, Outburst 4.0) never roll
    return pick(l);
  }
  return '';
}
/** An entry as pack items, its qty rolled (a personal effect is one of the data's list, evenly; a plate with no note
 * rolls its lesson, one a plate). */
function entryPacks(rng: Rng, e: DropEntry): PackItem[] {
  const qty = rollQty(rng, e.qty);
  if (e.item === 'personal') { const list = LOOT.personal_items; if (!list.length) return []; const p = list[die(rng, list.length) - 1]; return [plotItem(e.name || p.name, e.text || p.text, 1)]; }
  if ((e.item === 'sigil_plate' || e.item === 'heart_plate') && !e.note) {
    const n = Math.max(1, Math.min(20, Math.round(Number(qty) || 1)));
    return Array.from({ length: n }, () => lootToPack({ item: e.item, qty: 1, name: e.name, text: e.text, note: rollPlateNote(rng, e.item) })).flat();
  }
  return lootToPack({ item: e.item, qty: qty ?? undefined, rarity: e.rarity, name: e.name, text: e.text, note: e.note });
}
/** Who drops anything (item 697): an enemy that died as an enemy; never a surrendered or subdued one, a companion, a
 * player's own fighter or a Twin. */
export const dropsLoot = (u: Unit) => u.side === 'foe' && !u.charId && !u.companion && !u.ctrl && !u.surrendered && !u.subdued && !(u.tags || []).includes('twin');
const isCaster = (u: Unit) => !!(u.mg && (u.mg.evoker || u.mg.emanator));
/** The table an enemy rolls by default (item 692): a caster's, else its kind's. */
export const defaultTable = (u: Unit) => (isCaster(u) ? LOOT.caster_table : LOOT.kind_tables[u.kind || 'human'] || LOOT.kind_tables.human);

/** What always drops (item 694): the weapon, worn, with the rounds in it; the 2 fullest spare magazines with rounds
 * left; for a weapon loaded round by round, its loose rounds (at most 2 loads). Natural weapons drop nothing. */
export function alwaysDrops(rng: Rng, u: Unit): PackItem[] {
  const w = WEAPON[u.weapon], out: PackItem[] = [];
  if (!w || LOOT.natural_weapons.includes(w.id)) return out;
  if (w.category === 'thrown') { out.push({ id: w.id, name: w.name, qty: 1, kind: 'weapon', weapon: w.id }); return out; }
  const rarity: Rarity = 'standard', max = maxDurOf(w.id, rarity);
  const lo = Math.round(LOOT.worn_durability.min * 100), hi = Math.round(LOOT.worn_durability.max * 100), pct = lo + die(rng, hi - lo + 1) - 1;
  const loaded = w.magazine != null ? Math.max(0, Math.round(u.ammo || 0)) : undefined;
  out.push({ id: w.id, name: w.name, qty: 1, kind: 'weapon', weapon: w.id, ...(max ? { dur: Math.max(1, Math.round(max * pct / 100)) } : {}), ...(loaded != null ? { loaded } : {}), ...(loaded && u.ammoType ? { ammoType: u.ammoType } : {}) });
  if (w.reload === 'magazine' && u.mags?.length) {
    const spares = u.mags.map((n, i) => ({ n, t: u.magTypes?.[i] ?? null, i })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n || a.i - b.i).slice(0, LOOT.spare_mags_max);
    for (const s of spares) out.push(magItem(w.id, s.n, s.t));
  } else if (w.reload === 'loose' && w.ammo && (u.loose || 0) > 0) out.push(roundsOf(w.ammo, Math.min(u.loose!, LOOT.spare_mags_max * (w.magazine || 0))));
  return out;
}
/** The drop line's label for one thing (item 700). */
function dropLabel(it: PackItem, worn: boolean): string {
  if (it.mags && it.weapon) return 'magazine ' + it.mags[0] + '/' + (WEAPON[it.weapon]?.magazine || 0);
  if (it.kind === 'weapon' && worn) return it.name.replace(/ \(.*\)$/, '') + ' (worn)';
  return itemLabel(it);
}

/** One death's drops (items 691–700), rolled now on `rng` and put in the pile on the death tile. Called once per death
 * by noteDeaths. Returns what dropped. */
export function rollDeathDrops(cb: Combat, rng: Rng, u: Unit): PackItem[] {
  if (!dropsLoot(u)) return [];
  const tables = tablesOf(cb), always = alwaysDrops(rng, u), given: PackItem[] = [], rolled: PackItem[][] = [], extra: PackItem[] = [];
  const rolls = LOOT.rolls_by_tier[u.tier || 'minion'] ?? 1, d = u.drops;
  const roll = (t: LootTable | undefined) => { for (let i = 0; i < rolls; i++) { const e = rollTable(rng, t); if (e) rolled.push(entryPacks(rng, e)); } };
  if (d) {
    if (d.table) roll(tables[d.table]);
    for (const e of d.items || []) { const c = e.chance ?? 1; if (c >= 1) given.push(...entryPacks(rng, e)); else if (next(rng) < c) rolled.push(entryPacks(rng, e)); }
  } else roll(tables[defaultTable(u)]);
  // The cap (item 695): rolled items a fight, in the order enemies die; what is past it is not made.
  const cap = LOOT.caps[cb.difficulty] ?? LOOT.caps.standard;
  for (const r of rolled) {
    if (!r.length) continue;
    if ((cb.lootRolled || 0) >= cap) { (cb.lootLog ||= []).push('Loot cap reached (' + cap + ' a ' + cb.difficulty + ' fight): ' + u.name + "'s " + r.map((x) => dropLabel(x, false)).join(', ') + ' not dropped.'); continue; }
    cb.lootRolled = (cb.lootRolled || 0) + 1; extra.push(...r);
  }
  // A boss always drops one notable thing, outside the cap (item 696).
  const notable = u.tier === 'boss' ? rollTable(rng, tables[LOOT.boss_table]) : null;
  const list = [...always, ...given, ...extra, ...(notable ? entryPacks(rng, notable) : [])].filter((x) => x && (x.qty > 0 || x.mags?.length));
  if (!list.length) return [];
  dropToPile(cb, u.pos, list, 'death');
  const line = u.name + ' drops: ' + list.map((x, i) => dropLabel(x, i < always.length)).join(', ') + '.';
  say(cb, line);
  // Players' views keep the contents only while the tile is in sight (world.ts pileFog; review fix: the log told what
  // lay on a fogged tile). The host's state and the end-of-fight report keep the full line.
  (cb.dropLines ||= []).push({ line, at: u.pos, name: u.name }); if (cb.dropLines.length > 40) cb.dropLines.splice(0, cb.dropLines.length - 40);
  return list;
}

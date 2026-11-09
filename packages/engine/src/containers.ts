// Containers (rules revision 1.8, World Play 1.1; docs/design/world-play-1.1-spec.md): one module for everything that
// holds things on a map tile. A cache is closed (players see how many things it holds until it is searched); a pile is
// open (whoever can see the tile sees what is in it). A pile is a map object of kind `pile`, one per tile, whose entries
// are exact pack items (a magazine keeps its rounds and type, a weapon its rarity, wear and mods). Piles live with the
// map (story objects, zone stashes, a fight's objects), so they survive fights, travel and saves. Pure functions: the
// callers pass the live object list and the character's pack; nothing here rolls dice.
import wpJ from '../../../data/world_play.json';
import { WEAPON, ITEM, CALIBRE_NAME } from './data';
import { type PackItem, type Character, magsOf, roundsOf, plotItem, maxDurOf } from './character';
import { type MapObject, type CacheItem, makeObject } from './objects';

const WP: any = wpJ;
/** The pile limits (PROVISIONAL, spec 14 items 671–683). */
export const PILE: { max_entries: number; narrator_entries_per_turn: number; narrator_items_per_pile: number; rounds_max: number; route_slack_tiles: number; tactical_reload_extra_ap: number } = WP.pile;
/** Picking up costs this much AP on every map (item 674). */
export const PICKUP_AP: number = WP.ap.pickup;

// ---------- what a container is ----------
export const isPile = (o: MapObject) => o.kind === 'pile';
/** A closed container (rules 1.7): the cache kind, or anything else the Narrator gave items (never a pile). */
export const isCache = (o: MapObject) => !isPile(o) && (o.kind === 'cache' || (o.items != null && !!o.items.length));
/** One pile per tile, so the tile names it (item 671). */
export const pileId = (tile: string) => 'pile-' + tile.replace(',', '-');
export const pileAt = (objs: MapObject[], tile: string) => objs.find((o) => isPile(o) && o.pos === tile);

// ---------- labels ----------
const TYPE_NAME: Record<string, string> = { armor_piercing: 'armour-piercing', hollow_point: 'hollow-point', incendiary: 'incendiary', enhanced: 'Enhanced' };
const typeName = (t?: string | null) => (t ? ' (' + (TYPE_NAME[t] || t.replace(/_/g, ' ')) + ')' : '');
/** A calibre's name as loose rounds read: ".32 Decrkm", "Rifle rounds", "Shell" (a name that is only a gun's kind gets
 * "rounds"; review fix: "30 × Rifle"). */
export const calName = (cal: string) => { const n = CALIBRE_NAME[cal] || cal; return /^[.\d]/.test(n) || /(shell|arrow|bolt|rocket|grenade|canister|charge)$/i.test(n) ? n : n + ' rounds'; };
/** One line for a pack item on the ground: "Rifle magazine 7/24", "38 × .32 Decrkm", "Service pistol (fine)". */
export function itemLabel(it: PackItem): string {
  if (it.mags && it.weapon) {
    const cap = WEAPON[it.weapon]?.magazine || 0, base = it.name || magsOf(it.weapon, 0).name;
    if (it.mags.length === 1) return base + ' ' + it.mags[0] + '/' + cap + typeName(it.magTypes?.[0]);
    return it.mags.length + ' × ' + base + ' (' + it.mags.map((n) => n + '/' + cap).join(', ') + ')';
  }
  if (it.calibre && !it.mags) return it.qty + ' × ' + calName(it.calibre) + typeName(it.ammoType);
  // A weapon says the rounds in it and its wear (review fix: a dead enemy's gun read only its name).
  const w = it.kind === 'weapon' && !isThrown(it) ? WEAPON[it.weapon || it.id] : null, max = w ? maxDurOf(w.id, (it.rarity || 'standard') as any) : 0;
  const loaded = w && w.magazine != null && w.category !== 'thrown' ? (it.loaded ?? 0) + '/' + w.magazine + ' loaded' + (it.loaded && it.ammoType ? typeName(it.ammoType).replace(/^ \((.*)\)$/, ' $1') : '') : '';
  const wear = w && it.dur != null && max > 0 && it.dur < max ? 'worn ' + Math.round((100 * it.dur) / max) + '%' : '';
  const extra = [it.rarity && it.rarity !== 'standard' ? it.rarity : '', it.note ? it.note.toUpperCase() : ''].filter(Boolean).join(', '), state = [loaded, wear].filter(Boolean).join(' · ');
  return (it.qty > 1 ? it.qty + ' × ' : '') + it.name + (extra ? ' (' + extra + ')' : '') + (state ? ' · ' + state : '');
}

// ---------- merging ----------
const isThrown = (it: PackItem) => WEAPON[it.weapon || it.id]?.category === 'thrown';
/** Plain things merge their qty (item 673): no magazine, no rarity above standard, no wear or mods, and a weapon only
 * when it is thrown (grenades stack). */
export const stackable = (it: PackItem) => !it.mags && !it.calibre && it.dur == null && !(it.mods || []).length && (!it.rarity || it.rarity === 'standard') && it.loaded == null && (it.kind !== 'weapon' || isThrown(it));
const stackKey = (it: PackItem) => [it.kind, it.id, it.item || '', it.name, it.note || '', it.text || ''].join('|');
const sameRounds = (a: PackItem, b: PackItem) => !!a.calibre && !a.mags && a.calibre === b.calibre && (a.ammoType || null) === (b.ammoType || null);
const copy = (it: PackItem): PackItem => JSON.parse(JSON.stringify(it));
/** One magazine as a pack item (its rounds and type). */
export function magItem(weapon: string, rounds: number, type: string | null = null): PackItem {
  return { ...magsOf(weapon, 0), qty: 1, mags: [Math.max(0, Math.round(rounds))], ...(type ? { magTypes: [type] } : {}) };
}
/** A pack item split into what a pile holds: one entry per magazine. */
function splitMags(it: PackItem): PackItem[] {
  if (!it.mags || it.mags.length <= 1) return [{ ...copy(it), ...(it.mags ? { qty: it.mags.length } : {}) }];
  return it.mags.map((n, i) => magItem(it.weapon!, n, it.magTypes?.[i] ?? null));
}
/** Add one thing to a pack (the pack array is changed in place): magazines join that weapon's spares, rounds their
 * calibre's stack, plain things their stack; everything else is its own entry. */
export function packAdd(pack: PackItem[], it0: PackItem): PackItem[] {
  const it = copy(it0);
  if (it.mags && it.weapon) {
    const ex = pack.find((x) => x.weapon === it.weapon && x.mags);
    if (!ex) { pack.push({ ...it, qty: it.mags.length }); return pack; }
    const had = ex.mags!.length; ex.mags = [...ex.mags!, ...it.mags]; ex.qty = ex.mags.length;
    if (ex.magTypes || it.magTypes) ex.magTypes = [...Array.from({ length: had }, (_, i) => ex.magTypes?.[i] ?? null), ...it.mags.map((_, i) => it.magTypes?.[i] ?? null)];
    return pack;
  }
  const ex = it.calibre ? pack.find((x) => sameRounds(x, it)) : stackable(it) ? pack.find((x) => stackable(x) && stackKey(x) === stackKey(it)) : undefined;
  if (ex) { ex.qty += it.qty; if (it.text && !ex.text) ex.text = it.text; } else pack.push(it);
  return pack;
}

// ---------- piles ----------
const entryOf = (o: MapObject, it: PackItem): CacheItem => ({ item: it.id, qty: it.mags ? it.mags.length : it.qty, name: itemLabel(it), pack: it, key: 'e' + (o.seq = (o.seq || 0) + 1) });
/** Add one thing to a pile, merging as the rules say (item 673). */
function pileAdd(o: MapObject, it: PackItem) {
  const items = (o.items ||= []);
  for (const x of splitMags(it)) {
    const ex = x.calibre && !x.mags ? items.find((e) => e.pack && sameRounds(e.pack, x)) : stackable(x) ? items.find((e) => e.pack && stackable(e.pack) && stackKey(e.pack) === stackKey(x)) : undefined;
    if (ex) { ex.pack!.qty += x.qty; ex.qty = ex.pack!.qty; ex.name = itemLabel(ex.pack!); } else items.push(entryOf(o, x));
  }
}
const emptyMag = (e: CacheItem) => !!e.pack?.mags && e.pack.mags.every((n) => n <= 0);
/** Over the cap: lose the oldest junk first (item 672): empty magazines, then anything that is neither a weapon nor a
 * plot item, then the oldest. Returns the labels lost. */
function capPile(o: MapObject): string[] {
  const items = o.items || [], lost: string[] = [];
  while (items.length > PILE.max_entries) {
    let i = items.findIndex(emptyMag);
    if (i < 0) i = items.findIndex((e) => e.pack?.kind !== 'weapon' && e.pack?.kind !== 'plot');
    if (i < 0) i = 0;
    lost.push(items.splice(i, 1)[0].name || '');
  }
  return lost;
}
/** Drop things onto a tile: into its pile (made when there is none). `objs` is the live object list (a fight's
 * objects, the story's). A drop onto a hidden pile reveals it, unless the drop itself is hidden (the Narrator's
 * hidden pile; keepHidden: leave a hidden pile hidden). Returns the pile and what the cap threw away. */
export function dropOnTile(objs: MapObject[], tile: string, list: PackItem[], o: { hidden?: boolean; keepHidden?: boolean } = {}): { pile: MapObject; lost: string[] } {
  let p = pileAt(objs, tile);
  if (!p) { p = makeObject(pileId(tile), 'pile', tile, { items: [] }); if (o.hidden) p.hidden = true; objs.push(p); }
  else if (p.hidden && !o.hidden && !o.keepHidden) p.hidden = false;
  for (const it of list) if (it && (it.qty > 0 || it.mags?.length)) pileAdd(p, it);
  return { pile: p, lost: capPile(p) };
}
/** The entries a pick-up names: entry keys or indices; nothing named means everything. */
export function selectEntries(p: MapObject, take?: (string | number)[] | null): CacheItem[] {
  const items = p.items || [];
  if (!Array.isArray(take) || !take.length) return [...items];
  return items.filter((e, i) => take.some((t) => (typeof t === 'number' ? t === i : t === e.key || String(t) === String(i))));
}
/** Take these entries out of the pile; an empty pile leaves the map (the list is changed in place). */
export function takeEntries(objs: MapObject[], p: MapObject, sel: CacheItem[]) {
  p.items = (p.items || []).filter((e) => !sel.includes(e));
  if (!p.items.length) { const i = objs.indexOf(p); if (i >= 0) objs.splice(i, 1); }
}
/** An entry as a pack item (a pile's own entries are exact; a loot-shaped one is converted). */
export const entryPack = (e: CacheItem): PackItem[] => (e.pack ? [copy(e.pack)] : lootToPack(e));
/** What a player sees of a pile: its entries, one line each (key for the pick-up checklist). */
export function pileEntries(o: MapObject): { key: string; label: string; item: string; qty: number; kind: string }[] {
  return (o.items || []).map((e, i) => ({ key: e.key || String(i), label: e.name || itemLabel(entryPack(e)[0]), item: e.item, qty: e.qty, kind: e.pack?.kind || 'loot' }));
}

// ---------- the loot shape as pack items ----------
const calibreId = (s: string) => Object.keys(CALIBRE_NAME).find((k) => k.toLowerCase() === s.toLowerCase() || CALIBRE_NAME[k].toLowerCase() === s.toLowerCase());
/** Things the character keeps as counts, not pack entries (rules 1.8 review fix): a stim injector joins c.stims (what
 * combat/stim spends) and an Essence of Experience joins c.essence. True when it was counted. */
export function intoCounts(c: Character, it: PackItem): boolean {
  if (it.kind === 'plot' || it.mags) return false;
  const id = it.item || it.id;
  if (id === 'stim_injector') { c.stims = (c.stims || 0) + it.qty; return true; }
  if (id === 'essence_of_experience') { c.essence = (c.essence || 0) + it.qty; return true; }
  return false;
}
/** One loot-shaped entry ({item, qty, rarity, name, text, note}) as pack items (items 681, 682): a weapon (at most 3),
 * an item, `mag:<weapon>` (one magazine; qty is its rounds, 1 or none for a full one, 0 for an empty one; a weapon
 * loaded round by round gives its rounds loose), `rounds:<calibre>` (at most 120), and anything else a plot item. */
export function lootToPack(l: { item?: string; qty?: number; rarity?: string; name?: string; text?: string; note?: string }): PackItem[] {
  if (!l || typeof l !== 'object') return [];
  const id = String(l.item || '').trim(), label = String(l.name || '').trim().slice(0, 60), q = Number(l.qty);
  const n = Math.max(1, Math.min(20, Math.round(Math.abs(q) || 1)));
  const rarity = ['standard', 'fine', 'masterwork', 'relic', 'celestial'].includes(l.rarity || '') ? (l.rarity as any) : 'standard';
  const m = /^mag:(.+)$/i.exec(id), r = /^rounds:(.+)$/i.exec(id);
  if (m && WEAPON[m[1]] && WEAPON[m[1]].magazine != null) {
    const w = WEAPON[m[1]], cap = w.magazine || 0, rounds = !Number.isFinite(q) || q === 1 ? cap : Math.max(0, Math.min(cap, Math.round(q)));
    if (w.reload === 'loose' && w.ammo) return rounds > 0 ? [roundsOf(w.ammo, rounds)] : [];
    if (w.reload === 'magazine') return [magItem(w.id, rounds)];
  }
  if (r && calibreId(r[1])) return [roundsOf(calibreId(r[1])!, Math.max(1, Math.min(PILE.rounds_max, Math.round(Math.abs(q) || 1))))];
  if (WEAPON[id] && !m && !r) {
    const name = label || WEAPON[id].name;
    if (WEAPON[id].category === 'thrown') return [{ id, name, qty: n, kind: 'weapon', weapon: id }];
    return Array.from({ length: Math.min(n, 3) }, () => ({ id, name, qty: 1, kind: 'weapon' as const, weapon: id, ...(rarity !== 'standard' ? { rarity } : {}) }));
  }
  if (ITEM[id]) {
    const note = String(l.note || '').trim().slice(0, 40);
    return [{ id, item: id, name: label || ITEM[id].name, qty: n, kind: (ITEM[id] as any).category === 'consumable' ? 'med' : id === 'standard_core' ? 'ammo' : 'tool', ...(note ? { note } : {}) }];
  }
  const name = label || id.replace(/^plot:/, '').replace(/^(mag|rounds):/i, '').replace(/_/g, ' ').trim(); if (!name) return [];
  return [plotItem(name, l.text || '', n)];
}

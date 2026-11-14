// THE CAMP'S LOADOUT (rules 1.52; Leon, 14 Nov 2026: "Survival will give you one low level melee, one low level gun, a
// bow, one of the 4 focus and a budget ... a character going out with armor will lack in many other things"; corrected
// the same day: "only one weapon" and "1 weapon for free, take anything else with cost from the shop menu").
//
// `run/start` opens the camp (`g.run.state` 'loadout'): every character is stripped (loadout.ts stripGear: Survival
// gives by mode) and builds its loadout: ONE free weapon of `loadout.weapons` (a melee weapon, a gun or a bow), ONE free
// focus of `loadout.focuses` (either may be declined), and the budget spent on the shop's own menu (the counter's
// shelves, run/shop.ts counterLines, and the camp's fixed `stock`) at `priceOf`. The loadout is kept as picks
// (`g.run.loadout[charId]`) and the character's gear is REBUILT from them after every change, so a removal is exact and
// a refusal changes nothing. What the budget does not spend is the character's purse. Everyone marks Ready
// (`run/ready`); the host's close starts the run for everyone, an untouched loadout taking the Recommended one.
import '../datatext';
import svJ from '../../../../data/survival.json';
import { WEAPON, ITEM, SKILL, ARMOUR_CLASSES } from '../data';
import { type Character, type PackItem, packOf, twoHands, armourCap, armourGateWhy, requiresWhy, carriedKg, carryLimit } from '../character';
import { packAdd, intoCounts, itemLabel } from '../containers';
import { type GearPreview, gearPreview } from '../gearpreview';
import { meBlock, type MeV } from './shopview';
import { priceOf } from '../credits';
import { counterLines, lineGoods, SHOP_DATA } from './shop';
import { magazineWorth } from './rewards';
import { stripGear } from '../loadout';
import type { RunState } from './state';

const SV: any = svJ;
/** The camp's numbers (`survival.json loadout`, PROVISIONAL). */
export const LOADOUT: {
  budget: number; weapons: Record<'melee' | 'gun' | 'bow', string[]>; gun: { loaded: number; spare: number }; bow: { spare: number };
  focuses: string[]; focus_with: Record<string, { id: string; qty: number }[]>; counter: { skip: string[] }; stock: { ids: string[] }; max_qty: number;
  recommended: { focus_by_door: Record<string, string>; weapon: { when?: 'focus'; skill?: string; over?: string; id: string }[]; buys: Record<string, string[]>; fill: string };
} = SV.loadout;
/** The free weapons by group, in the screen's order. */
export const FREE_GROUPS: { id: 'melee' | 'gun' | 'bow'; name: string; ids: string[] }[] = [
  { id: 'melee', name: 'Melee', ids: LOADOUT.weapons.melee }, { id: 'gun', name: 'Guns', ids: LOADOUT.weapons.gun }, { id: 'bow', name: 'Bows', ids: LOADOUT.weapons.bow }];
const FREE = new Set(Object.values(LOADOUT.weapons).flat());

/** One character's loadout at the camp: the free weapon and focus (null: declined or not yet picked), what is taken
 * from the menu (line key to how many, in the order taken), and what it carried from traits when stripped. */
export interface LoadoutPick { weapon: string | null; focus: string | null; take: Record<string, number>; base: { pack: PackItem[]; worn: Record<string, string> }; touched?: boolean }
/** A line of the camp's menu: the shop's counter lines (every shelf but `counter.skip`) and the fixed stock. */
export interface LoadoutLine { key: string; id: string; per: number; shelf: string; shelfName: string; price: number }

const SHELF_NAME: Record<string, string> = Object.fromEntries(SHOP_DATA.always.map((s) => [s.shelf, s.name]));
/** The menu for this character as it stands (the counter's gun lines follow the guns it carries). */
export function loadoutLines(c: Character): LoadoutLine[] {
  const out: LoadoutLine[] = [];
  for (const l of counterLines([c])) if (!LOADOUT.counter.skip.includes(l.shelf) && !l.res) out.push({ key: l.key, id: l.id, per: l.per, shelf: l.shelf, shelfName: SHELF_NAME[l.shelf] || l.shelf, price: (priceOf(l.id) || 0) * l.per });
  for (const id of LOADOUT.stock.ids) { const p = priceOf(id); if (p != null) out.push({ key: 'stock:' + id, id, per: 1, shelf: 'stock', shelfName: 'Gear', price: p }); }
  return out;
}
const nameOf = (id: string): string => { const a = /^armour:(\d)$/.exec(id); if (a) return 'Class ' + a[1] + ' body armour'; return (WEAPON[id] as any)?.name || (ITEM[id] as any)?.name || id; };
const focusEntry = (id: string): PackItem => ({ id, item: id, name: ITEM[id]?.name || id, qty: 1, kind: 'focus' });
/** What the budget has spent on these picks (the menu's prices x how many). */
export function loadoutSpent(c: Character, p: LoadoutPick): number {
  const lines = loadoutLines(c); return Object.entries(p.take).reduce((t, [k, q]) => t + (lines.find((l) => l.key === k)?.price || 0) * q, 0);
}

/** Rebuild a character's gear from its picks (on the character itself). Returns the refusal in words (the character is
 * then half-built: callers rebuild on a copy), or null. Lines the menu no longer has (ammunition for a gun put back)
 * are dropped from `p.take`. */
function rebuild(c: Character, p: LoadoutPick): string | null {
  c.weapon = 'fists'; c.offHand = null; c.armourClass = 0; c.stims = 0; delete c.loaded;
  c.pack = p.base.pack.map((x) => ({ ...x })); c.worn = { ...p.base.worn };
  const pack = c.pack, add = (its: PackItem[]) => { for (const it of its) if (!intoCounts(c, it)) packAdd(pack, it); };
  if (p.weapon) {
    const w: any = WEAPON[p.weapon]; c.weapon = p.weapon;
    if (w?.magazine != null && w.ammo) { c.loaded = w.magazine; const spare = w.category === 'bow' ? LOADOUT.bow.spare : LOADOUT.gun.spare; for (let i = 0; i < spare; i++) add(magazineWorth(p.weapon)); }
  }
  if (p.focus) {
    if (twoHands(c, c.weapon)) add([focusEntry(p.focus)]); else c.offHand = { id: p.focus };
    for (const x of LOADOUT.focus_with[p.focus] || []) add(lineGoods(x.id, x.qty));
  }
  let spent = 0;
  // the gear shelf first (a second gun brings its own ammunition lines), then the counter
  const keys = Object.keys(p.take).sort((a, b) => Number(!a.startsWith('stock:')) - Number(!b.startsWith('stock:')));
  for (const k of keys) {
    const q = p.take[k], l = loadoutLines(c).find((x) => x.key === k);
    if (!l) { delete p.take[k]; continue; }
    spent += l.price * q;
    const ac = /^armour:(\d)$/.exec(l.id), it: any = ITEM[l.id];
    if (ac) {
      const n = Number(ac[1]), cap = armourCap(c);
      if (q > 1 || c.armourClass) return 'Body armour is one piece: take one class.';
      if (cap != null && n > cap) return c.name + ' can wear Class ' + cap + ' at most.';
      const g = armourGateWhy(c, n); if (g) return g;
      c.armourClass = n;
    } else if (it?.category === 'armour' && it.slot) {
      if (q > 1) return nameOf(l.id) + ': one is worn at a time.';
      if (c.worn![it.slot]) return 'The ' + it.slot.replace(/_/g, ' ') + ' slot already has ' + nameOf(c.worn![it.slot]) + '.';
      c.worn![it.slot] = l.id;
    } else if (it?.focus) { for (let i = 0; i < q; i++) add([focusEntry(l.id)]); }
    else add(lineGoods(l.id, l.per * q));
  }
  if (spent > LOADOUT.budget) return 'Over the budget by ' + (spent - LOADOUT.budget) + ' credits (' + spent + ' of ' + LOADOUT.budget + ').';
  const kg = carriedKg(c).total, lim = carryLimit(c);
  if (kg > lim) return 'Too heavy: ' + c.name + ' would carry ' + kg + ' kg of ' + lim + ' kg.';
  c.credits = LOADOUT.budget - spent;
  return null;
}
const GEAR_KEYS = ['weapon', 'offHand', 'armourClass', 'stims', 'pack', 'worn', 'loaded', 'credits'] as const;
/** Rebuild on a copy; when it holds, copy the gear into the character. The refusal in words, or null. */
function commit(c: Character, p: LoadoutPick): string | null {
  const t: Character = JSON.parse(JSON.stringify(c)), q: LoadoutPick = JSON.parse(JSON.stringify(p));
  const no = rebuild(t, q); if (no) return no;
  for (const k of GEAR_KEYS) { if ((t as any)[k] === undefined) delete (c as any)[k]; else (c as any)[k] = (t as any)[k]; }
  p.take = q.take; return null;
}

/** Open the camp (run/start): every character stripped, an empty loadout each, the budget in its purse. */
export function openCamp(r: RunState, chars: Character[]): void {
  r.loadout = {}; r.state = 'loadout'; r.ready = {};
  for (const c of chars) {
    stripGear(c);
    const p: LoadoutPick = { weapon: null, focus: null, take: {}, base: { pack: packOf(c).map((x) => ({ ...x })), worn: { ...(c.worn || {}) } } };
    r.loadout[c.id] = p; commit(c, p);
  }
}
/** The camp's actions (`run/loadout`): pick the free weapon or focus (id null: none), take or put back a menu line
 * (qty signed), the Recommended loadout, or clear. */
export type LoadoutAction = { charId: string } & ({ op: 'pick'; slot: 'weapon' | 'focus'; id: string | null } | { op: 'take'; key: string; qty?: number } | { op: 'recommended' } | { op: 'clear' });
interface G { run?: RunState | null; characters: Record<string, Character>; players: { id: string; name: string; online: boolean }[]; hostId: string }

/** Why `by` can't change this character's loadout now, or null. */
function whoProblem(g: G, by: string, charId: string): string | null {
  if (g.run?.state !== 'loadout' || !g.run.loadout) return 'The camp is closed: loadouts are made before node 1.';
  const c = g.characters[charId]; if (!c || !g.run.loadout[charId]) return 'No such character at the camp.';
  if (c.owner !== by) return 'Only ' + c.name + '\'s player makes ' + c.name + '\'s loadout.';
  if (g.run.ready[by]) return c.name + ' is marked ready: take the mark back to change the loadout.';
  return null;
}
/** Apply a camp action. Returns the line for the log, or the refusal in words (nothing changes). */
export function loadoutAction(g: G, by: string, a: LoadoutAction): { ok: string } | { no: string } {
  const no = whoProblem(g, by, a.charId); if (no) return { no };
  const c = g.characters[a.charId], p = g.run!.loadout![a.charId], next: LoadoutPick = JSON.parse(JSON.stringify(p));
  let text: string;
  if (a.op === 'pick') {
    if (a.slot === 'weapon') {
      if (a.id != null && !FREE.has(a.id)) return { no: 'The free weapon is one of the camp\'s list: ' + [...FREE].map(nameOf).join(', ') + '.' };
      const rq = a.id ? requiresWhy(c, (WEAPON[a.id] as any)?.requires) : null; if (rq) return { no: nameOf(a.id!) + ': ' + rq };
      next.weapon = a.id; text = a.id ? c.name + ' takes the ' + nameOf(a.id) + ' (free).' : c.name + ' goes without a free weapon.';
    } else {
      if (a.id != null && !LOADOUT.focuses.includes(a.id)) return { no: 'The free focus is one of: ' + LOADOUT.focuses.map(nameOf).join(', ') + '.' };
      next.focus = a.id; text = a.id ? c.name + ' takes the ' + nameOf(a.id) + ' (free).' : c.name + ' goes without a focus.';
    }
  } else if (a.op === 'take') {
    const q = Math.round(Number(a.qty ?? 1)); if (!q) return { no: 'Take or put back at least one.' };
    const l = loadoutLines(c).find((x) => x.key === a.key); if (!l && q > 0) return { no: 'The camp doesn\'t stock that.' };
    const now = (next.take[a.key] || 0) + q;
    if (now < 0) return { no: c.name + ' has none of that to put back.' };
    if (now > LOADOUT.max_qty) return { no: 'At most ' + LOADOUT.max_qty + ' of a line.' };
    if (now) next.take[a.key] = now; else delete next.take[a.key];
    text = c.name + (q > 0 ? ' takes ' : ' puts back ') + Math.abs(q) + ' × ' + nameOf(l?.id || a.key) + '.';
  } else if (a.op === 'recommended') { const r = recommendedPick(c, p.base); next.weapon = r.weapon; next.focus = r.focus; next.take = r.take; text = c.name + ' takes the recommended loadout.'; }
  else { next.weapon = null; next.focus = null; next.take = {}; text = c.name + ' empties the loadout.'; }
  next.touched = true;
  const err = commit(c, next); if (err) return { no: err };
  g.run!.loadout![a.charId] = next;
  return { ok: text };
}

/** The Recommended loadout for a character (data `recommended`): the focus of its door skill with most points; the first
 * weapon row that fits; its profile's buys while the budget pays; then its weapon's cheapest ammunition while it pays. */
export function recommendedPick(c: Character, base: LoadoutPick['base']): Pick<LoadoutPick, 'weapon' | 'focus' | 'take'> {
  const R = LOADOUT.recommended, sk = (s: string) => c.skills?.[s] || 0;
  let focus: string | null = null, top = 0;
  for (const [door, f] of Object.entries(R.focus_by_door)) if (sk(door) > top) { top = sk(door); focus = f; }
  const row = R.weapon.find((w) => (w.when === 'focus' ? !!focus : w.skill ? sk(w.skill) > sk(w.over || '') : true));
  const p: LoadoutPick = { weapon: row?.id || null, focus, take: {}, base };
  const t: Character = JSON.parse(JSON.stringify(c));
  const tryTake = (key: string): boolean => { const q: LoadoutPick = JSON.parse(JSON.stringify(p)); q.take[key] = (q.take[key] || 0) + 1; if (q.take[key] > LOADOUT.max_qty || rebuild(t, q)) return false; p.take = q.take; return true; };
  rebuild(t, p);
  const fuel = focus ? (ITEM[focus] as any)?.focus?.fuel : null, w: any = p.weapon ? WEAPON[p.weapon] : null;
  const profile = fuel === 'core' ? 'core' : fuel ? 'mp' : w?.ammo ? 'gun' : 'melee';
  for (const id of R.buys[profile] || []) { const l = loadoutLines(t).find((x) => x.id === id || x.key === id); if (l) tryTake(l.key); }
  if (R.fill === 'ammo' && w?.ammo) {
    const ammo = loadoutLines(t).filter((l) => l.id === 'rounds:' + w.ammo || l.id === 'mag:' + p.weapon).sort((a, b) => a.price - b.price)[0];
    if (ammo) for (let i = 0; i < LOADOUT.max_qty && tryTake(ammo.key); i++) { /* while the budget pays */ }
  }
  return { weapon: p.weapon, focus: p.focus, take: p.take };
}

/** Mark Ready at the camp (`run/ready`), or take the mark back; the host's `close` starts the run for everyone (an
 * untouched loadout takes the Recommended one). Returns whether the camp closed now. */
export function campReady(g: G, by: string, o: { close?: boolean; undo?: boolean } = {}): { closed: boolean } | { no: string } {
  const r = g.run; if (r?.state !== 'loadout' || !r.loadout) return { no: 'The camp is closed.' };
  if (!g.players.some((p) => p.id === by)) return { no: 'Only a player in the room marks ready.' };
  if (o.close && by !== g.hostId) return { no: 'Only the host starts the run for everyone: mark Ready.' };
  if (o.undo) { const rest = { ...r.ready }; delete rest[by]; r.ready = rest; return { closed: false }; }
  r.ready = { ...r.ready, [by]: true };
  const on = g.players.filter((p) => p.online);
  if (!o.close && on.some((p) => !r.ready[p.id])) return { closed: false };
  for (const [id, p] of Object.entries(r.loadout)) {
    const c = g.characters[id]; if (!c || p.touched) continue;
    const rec = recommendedPick(c, p.base), next = { ...p, ...rec }; if (!commit(c, next)) r.loadout[id] = next;
  }
  for (const c of Object.values(g.characters)) delete c.bare;
  r.loadout = null; r.ready = {};
  return { closed: true };
}
/** Who is still making a loadout (connected players with no Ready mark), by name. */
export const campWaiting = (g: G): string[] => (g.run?.state === 'loadout' ? g.players.filter((p) => p.online && !g.run!.ready[p.id]).map((p) => p.name) : []);

// ---------------------------------------------------------------------------------------------- the camp's view
/** A card of the camp's screen: a free pick or a menu line, with the engine's gear preview numbers, its price (0 for a
 * free pick), how many are taken, and the reason one more can't be taken (null: it can). */
export interface LoadoutCardV { key: string; id: string; name: string; group: string; price: number; per: number; taken: number; picked: boolean; why: string | null; preview: GearPreview; text: string }
/** One line of the Carrying panel: what it is, its weight, and the action that puts it back (null: it comes with a pick). */
export interface CarryRowV { group: string; label: string; kg: number; free: boolean; put: { type: 'run/loadout'; [k: string]: unknown } | null }
/** The camp's screen for one player (their own character, or `charId`). */
export interface LoadoutViewV {
  me: MeV; skills: { id: string; name: string; points: number; attribute: string }[]; armourClass: number; armourName: string;
  budget: number; spent: number; left: number;
  weapon: { id: string; name: string; cards: LoadoutCardV[] }[]; focus: LoadoutCardV[]; weaponPick: string | null; focusPick: string | null;
  shelves: { shelf: string; name: string; cards: LoadoutCardV[] }[];
  carrying: CarryRowV[];
  party: { id: string; charName: string; initials: string; color: string; ready: boolean; online: boolean; mine: boolean }[];
  ready: boolean; isHost: boolean; waiting: string[]; seed: string;
}
/** The skills a loadout reads (the weapons' skills, the doors, the armour gate). */
const GEAR_SKILLS = ['dexterity', 'raw_power', 'brain_power', 'visualization', 'will_power', 'empathy', 'pain_threshold'];
const STEER: Record<string, string> = { guns: 'Ammunition', calibres: 'Ammunition', special: 'Ammunition', thrown: 'Thrown', cores: 'Mana and parts', supplies: 'Medicine and supplies', stock: 'Gear' };
const SHELF_ORDER = ['guns', 'calibres', 'special', 'thrown', 'cores', 'supplies', 'stock'];
/** The camp's view for player `me`; null when the camp is closed or they have no character there. */
export function loadoutView(g: G, me: string, charId?: string | null): LoadoutViewV | null {
  const r = g.run; if (r?.state !== 'loadout' || !r.loadout) return null;
  const c = (charId && g.characters[charId]) || Object.values(g.characters).find((x) => x.owner === me && r.loadout![x.id]) || null;
  if (!c || !r.loadout[c.id]) return null;
  const p = r.loadout[c.id], mine = c.owner === me, locked = !!r.ready[c.owner];
  /** Why this change can't be made (a trial on a copy, as the reducer would), or null. */
  const why = (edit: (q: LoadoutPick) => void): string | null => {
    if (!mine) return 'Only ' + c.name + '\'s player makes ' + c.name + '\'s loadout.';
    if (locked) return 'Marked ready: take the mark back to change it.';
    const t: Character = JSON.parse(JSON.stringify(c)), q: LoadoutPick = JSON.parse(JSON.stringify(p)); edit(q); return rebuild(t, q);
  };
  const preview = (id: string): GearPreview => {
    const a = /^armour:(\d)$/.exec(id);
    if (a) { const k = ARMOUR_CLASSES[Number(a[1])]; return { id, name: 'Class ' + a[1] + ' body armour (' + (k?.name || '') + ')', kind: 'armour', rarity: 'standard', category: 'Body armour', traits: [], text: 'Worn on the torso. One class at a time.',
      lines: [{ key: 'armour', label: 'Armour', value: String(k?.value ?? 0), num: k?.value ?? 0, better: 'higher' }, { key: 'kg', label: 'Weight', value: (k?.weight_kg ?? 0) + ' kg', num: k?.weight_kg ?? 0, better: 'lower' }] }; }
    return gearPreview(c, { id, rarity: 'standard' });
  };
  const pickCard = (slot: 'weapon' | 'focus', id: string, group: string): LoadoutCardV => { const pv = preview(id), on = p[slot] === id;
    return { key: slot + ':' + id, id, name: pv.name, group, price: 0, per: 1, taken: on ? 1 : 0, picked: on, why: on ? null : why((q) => { q[slot] = id; }), preview: pv, text: pv.text }; };
  const lines = loadoutLines(c), shelves: LoadoutViewV['shelves'] = [];
  for (const sh of SHELF_ORDER) {
    const ls = lines.filter((l) => l.shelf === sh); if (!ls.length) continue;
    const name = sh === 'stock' ? 'Gear' : (SHOP_DATA.always.find((s) => s.shelf === sh)?.name || sh);
    shelves.push({ shelf: sh, name, cards: ls.map((l) => { const pv = preview(l.id), n = p.take[l.key] || 0;
      return { key: l.key, id: l.id, name: pv.name, group: STEER[sh] || name, price: l.price, per: l.per, taken: n, picked: n > 0,
        why: n >= LOADOUT.max_qty ? 'At most ' + LOADOUT.max_qty + ' of a line.' : why((q) => { q.take[l.key] = n + 1; }), preview: pv, text: pv.text }; }) });
  }
  // the Carrying panel: the free picks, then what was taken (by line, put back one at a time), then the pack as it is
  const carrying: CarryRowV[] = [];
  const kgOf = (it: PackItem) => Math.round(carriedKg({ ...c, pack: [it], stims: 0, essence: 0, carried: [] } as Character).pack * 100) / 100;
  if (p.weapon) carrying.push({ group: 'Free', label: nameOf(p.weapon) + ' · free weapon', kg: (WEAPON[p.weapon] as any)?.weight_kg || 0, free: true, put: { type: 'run/loadout', charId: c.id, op: 'pick', slot: 'weapon', id: null } });
  if (p.focus) carrying.push({ group: 'Free', label: nameOf(p.focus) + ' · free focus', kg: (ITEM[p.focus] as any)?.weight_kg || 0, free: true, put: { type: 'run/loadout', charId: c.id, op: 'pick', slot: 'focus', id: null } });
  for (const [k, n] of Object.entries(p.take)) { const l = lines.find((x) => x.key === k); if (!l) continue;
    carrying.push({ group: 'Bought', label: (n > 1 ? n + ' × ' : '') + nameOf(l.id) + (l.per > 1 ? ' (' + l.per * n + ')' : '') + ' · ' + l.price * n + ' cr', kg: 0, free: false, put: { type: 'run/loadout', charId: c.id, op: 'take', key: k, qty: -1 } }); }
  for (const it of packOf(c)) carrying.push({ group: 'In the pack', label: itemLabel(it), kg: kgOf(it), free: true, put: null });
  if (c.stims) carrying.push({ group: 'In the pack', label: c.stims + ' × Stim injector', kg: Math.round(c.stims * ((ITEM.stim_injector as any)?.weight_kg || 0) * 100) / 100, free: true, put: null });
  const spent = loadoutSpent(c, p), chars = Object.values(g.characters), owner = (pid: string) => chars.find((x) => x.owner === pid) || null;
  return {
    me: meBlock(c), skills: GEAR_SKILLS.map((id) => ({ id, name: SKILL[id]?.name || id, points: c.skills?.[id] || 0, attribute: (SKILL[id] as any)?.attribute || '' })),
    armourClass: c.armourClass || 0, armourName: ARMOUR_CLASSES[c.armourClass || 0]?.name || 'None',
    budget: LOADOUT.budget, spent, left: LOADOUT.budget - spent,
    weapon: FREE_GROUPS.map((gr) => ({ id: gr.id, name: gr.name, cards: gr.ids.map((id) => pickCard('weapon', id, gr.name)) })), focus: LOADOUT.focuses.map((id) => pickCard('focus', id, 'Focus')),
    weaponPick: p.weapon, focusPick: p.focus, shelves, carrying,
    party: g.players.map((pl: any) => ({ id: pl.id, charName: owner(pl.id)?.name || pl.name, initials: pl.initials || '?', color: pl.color || '#A3AEC2', ready: !!r.ready[pl.id], online: pl.online, mine: pl.id === me })),
    ready: !!r.ready[me], isHost: me === g.hostId, waiting: campWaiting(g), seed: r.seed,
  };
}

// THE SHOP'S VIEW (rules 1.42; survival-spec section 8.3). Everything the full-screen shop draws, for one player looking
// at one character: the face and its line, the counter's shelves, today's gear, the services shelf, the sell list, the
// purse, hands and pack, the party's ready marks and the visit's log. Every price, quantity, number and reason comes from
// here (priceOf, the gear preview, the reducer's own refusals: `buyProblem`, `sellProblem`); the client builds none.
import { WEAPON, ITEM, SKILL } from '../data';
import { type Character, type Rarity, packOf, carriedKg, carryLimit, kindOfDoor, classResources } from '../character';
import { itemLabel } from '../containers';
import { creditsOf } from '../credits';
import { type GearPreview, gearPreview, rarityWord, rarityMarks } from '../gearpreview';
import { SETTING } from './encounter';
import { relicRow } from './power';
import { runSetting, type RunState } from './state';
import { type ServiceCard, type ShopState, FACES, SHOP_DATA, counterLines, linePrice, buyProblem, sellProblem, sellValue, shopOf, shopServices, restockRoom } from './shop';

/** One card on a shelf: what it is, its grade, what it is for (the door's attribute for its ink), its numbers (the gear
 * preview), the price of one purchase and how many that gives, and the reason it can't be bought now (null: it can). */
export interface ShopCardV { key: string; id: string; name: string; rarity: Rarity; rarityWord: string; marks: number; forLine: string; attr: string | null; doorWord: string | null;
  price: number; per: number; qtyMax: number; preview: GearPreview; why: string | null; sold: string | null; rare: boolean; text: string;
  /** For quantities 1 to qtyMax: what that many purchases cost, and the reason that many can't be bought (null: it can). */
  totals: number[]; whys: (string | null)[] }
/** One line of the Sell tab: the pack entry, how many, what it sells for (all of it), and why not. */
export interface SellRowV { idx: number; id: string; label: string; rarity: Rarity; qty: number; value: number | null; why: string | null; ask: string | null; kg: number }
/** The full-screen shop for one player and one character (spec 8.3). */
export interface ShopViewV {
  kind: 'shop' | 'forge'; setting: string;
  face: { id: string; name: string; role: string; portrait: string; portraitPending: boolean; fallback: string | null; backdrop: string; backdropPending: boolean; backdropFallback: string | null; line: string; lineKind: string };
  me: MeV | null;
  shelves: { shelf: string; name: string; cards: ShopCardV[] }[];
  gear: ShopCardV[]; services: ServiceCard[]; sell: SellRowV[];
  party: { id: string; charId: string | null; name: string; charName: string; initials: string; color: string; ready: boolean; online: boolean; mine: boolean }[];
  log: string[]; isHost: boolean; ready: boolean; waiting: string[];
}
interface G { run?: RunState | null; characters: Record<string, Character>; players: { id: string; name: string; initials?: string; color?: string; online: boolean }[]; hostId: string }

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const DOOR_ATTR: Record<string, string> = Object.fromEntries(Object.values(SKILL).map((s: any) => [s.id, s.attribute]));
/** "Rifle · your weapon", "Focus · Sigil (your door)", "Rounds · rifle": what a thing is for, and the door's attribute. */
function forOf(c: Character | null, id: string, pv: GearPreview): { line: string; attr: string | null; door: string | null } {
  const it: any = ITEM[id], w: any = WEAPON[id];
  if (it?.focus) { const door = it.focus.door as string, mine = !!c && (c.skills[door] || 0) > 0;
    return { line: 'Focus · ' + cap(kindOfDoor(door) || door) + (mine ? ' · your door' : ''), attr: DOOR_ATTR[door] || null, door: SKILL[door]?.name || door }; }
  if (w && c) { const same = WEAPON[c.weapon]?.category === w.category; return { line: pv.category + (c.weapon === id ? ' · your weapon' : same ? ' · your kind' : ''), attr: null, door: null }; }
  return { line: pv.category, attr: null, door: null };
}
/** The "you" panel of a full-screen place (the shop's, the Forge's, every safe node's): name, level, purse, portrait,
 * hands and worn, the armour class, the pack with each line's weight and the carry limit. */
export interface MeV { id: string; name: string; level: number; credits: number; portrait: string; hand: string; handRarity: Rarity; off: string | null; worn: { slot: string; name: string }[]; armourClass: number;
  pack: { label: string; kg: number }[]; kg: number; limit: number }
/** The "you" panel for a character (rules 1.42; shared by every full-screen place since rules 1.46). */
export function meBlock(c: Character): MeV {
  const kg = carriedKg(c);
  return { id: c.id, name: c.name, level: c.level, credits: creditsOf(c), portrait: c.portrait || '', hand: (WEAPON[c.weapon] as any)?.name || (ITEM[c.weapon] as any)?.name || c.weapon, handRarity: (c.weaponState?.rarity || 'standard') as Rarity,
    off: c.offHand ? ((WEAPON[c.offHand.id] as any)?.name || (ITEM[c.offHand.id] as any)?.name || c.offHand.id) + (c.offHand.rarity && c.offHand.rarity !== 'standard' ? ' (' + c.offHand.rarity + ')' : '') : null,
    worn: Object.entries(c.worn || {}).map(([slot, id]) => ({ slot: cap(slot.replace(/_/g, ' ')), name: (ITEM[id] as any)?.name || id })), armourClass: c.armourClass || 0,
    pack: packOf(c).map((it) => ({ label: itemLabel(it) + (it.prop ? ' · ' + (relicRow(it.prop)?.name || it.prop) : ''), kg: Math.round(carriedKg({ ...c, pack: [it], stims: 0, essence: 0, carried: [] } as Character).pack * 100) / 100 })),
    kg: kg.total, limit: carryLimit(c) };
}
/** The shop's view for player `me` (their own character, or `charId` when they have several); null when no shop is open. */
export function shopView(g: G, me: string, charId?: string | null): ShopViewV | null {
  const sh: ShopState | null = shopOf(g); if (!sh) return null;
  const r = g.run!, f = FACES.find((x) => x.id === sh.face), chars = Object.values(g.characters);
  const c = (charId && g.characters[charId]) || chars.find((x) => x.owner === me) || null;
  const card = (key: string, id: string, rarity: Rarity, price: number, per: number, why: string | null, o: { sold?: string | null; rare?: boolean; qtyMax?: number; name?: string } = {}): ShopCardV => {
    const pv = c ? gearPreview(c, { id, rarity }) : gearPreview(chars[0], { id, rarity }), fo = forOf(c, id, pv);
    return { key, id, name: o.name || pv.name, rarity, rarityWord: rarityWord(rarity), marks: rarityMarks(rarity), forLine: fo.line, attr: fo.attr, doorWord: fo.door,
      price, per, qtyMax: o.qtyMax ?? 1, preview: pv, why, sold: o.sold ?? null, rare: !!o.rare, text: pv.text,
      totals: Array.from({ length: o.qtyMax ?? 1 }, (_, i) => price * (i + 1)), whys: Array.from({ length: o.qtyMax ?? 1 }, (_, i) => (i ? ask(key, i + 1) : why)) };
  };
  const ask = (key: string, qty = 1) => (c ? buyProblem(g as any, c.owner, { charId: c.id, key, qty }) : 'Bring a character to buy.');
  const lines = counterLines(chars);
  const shelves = SHOP_DATA.always.map((s) => ({ shelf: s.shelf, name: s.name, cards: lines.filter((l) => l.shelf === s.shelf && (!l.res || !c || classResources(c).some((x) => x.id === l.res && x.persist)))
    .map((l) => l.res ? card(l.key, 'restock:' + l.res, 'standard', linePrice(l), 1, ask(l.key), { name: 'Restock: ' + l.res.replace(/_/g, ' '), qtyMax: Math.max(1, Math.min(SHOP_DATA.max_qty, c ? restockRoom(c, l.res) : 1)) })
      : card(l.key, l.id, 'standard', linePrice(l), l.per, ask(l.key), { qtyMax: SHOP_DATA.max_qty })) })).filter((s) => s.cards.length);
  const gear = sh.stock.map((p) => card(p.key, p.id, p.rarity, p.price, 1, p.sold ? 'Sold to ' + (g.characters[p.sold]?.name || 'another') + '.' : ask(p.key), { sold: p.sold ? (g.characters[p.sold]?.name || null) : null, rare: !!p.rare }));
  const services = c ? shopServices(sh.kind).flatMap((s) => s.cards(g, c, sh)) : [];
  const sell: SellRowV[] = c ? packOf(c).map((it, idx) => {
    const v = sellValue(it), why = sellProblem(g as any, c.owner, { charId: c.id, idx }), id = it.weapon || it.item || it.id;
    const graded = (it.rarity && it.rarity !== 'standard') || (it.mods || []).length;
    return { idx, id, label: itemLabel(it), rarity: (it.rarity || 'standard') as Rarity, qty: it.mags ? it.mags.length : it.qty, value: v, why,
      ask: graded && v != null ? 'Sell the ' + itemLabel(it) + ((it.mods || []).length ? ' and its ' + (it.mods || []).length + ' mod' + ((it.mods || []).length === 1 ? '' : 's') : '') + ' for ' + v + '?' : null,
      kg: Math.round((carriedKg({ ...c, pack: [it], stims: 0, essence: 0, carried: [] } as Character).pack) * 100) / 100 };
  }) : [];
  const owner = (pid: string) => chars.find((x) => x.owner === pid) || null;
  const party = g.players.map((p) => ({ id: p.id, charId: owner(p.id)?.id || null, name: p.name, charName: owner(p.id)?.name || p.name, initials: p.initials || '?', color: p.color || '#A3AEC2', ready: !!r.ready[p.id], online: p.online, mine: p.id === me }));
  return {
    kind: sh.kind, setting: SETTING[runSetting(r)]?.name || runSetting(r),
    face: { id: f?.id || '', name: f?.name || 'The shop', role: f?.role || 'Shopkeeper', portrait: f?.portrait || '', portraitPending: !!f?.portrait_pending, fallback: f?.fallback ?? null, backdrop: f?.backdrop || '', backdropPending: !!f?.backdrop_pending, backdropFallback: f?.backdrop_fallback ?? null, line: sh.line.text, lineKind: sh.line.kind },
    me: c ? meBlock(c) : null,
    shelves, gear, services, sell, party, log: sh.log, isHost: me === g.hostId, ready: !!r.ready[me],
    waiting: g.players.filter((p) => p.online && !r.ready[p.id]).map((p) => p.name),
  };
}

// THE SHOP (rules 1.42; docs/design/survival-spec.md rules 25 to 27, sections 3.4 and 8.3; Survival build step 4).
//
// A shop node opens a full-screen shop: its face (the setting's shopkeeper, `survival.json faces`), the counter (always
// stocked, never sold out, at the fixed price of credits.ts `priceOf`), today's rolled gear (shared by the party: the
// first buyer takes it, the others see "Sold to <name>"), selling at `sell_rate`, the restock of persistent class
// resources, and the services shelf (`registerShopService`: the grade step of build step 4a plugs in there). Each
// character pays from its own purse (credits.ts). The party leaves when every connected player is ready, or when the
// host closes it (`run/leave`). Everything is a `run/*` action through the one reducer (game.ts runAction calls
// `shopAction`); the stock comes from the run's seed through its own stream (`rngFor`), never the fight's dice.
import '../datatext';
import svJ from '../../../../data/survival.json';
import { WEAPON, ITEM } from '../data';
import { type Character, type PackItem, type Rarity, packOf, roundsOf, classResources, drawnWeapon, QUIVER_ITEM } from '../character';
import { lootToPack, packAdd, intoCounts, itemLabel } from '../containers';
import { priceOf, creditsOf, payCredits, earnCredits, ROUND_PRICE, emptyMagPrice } from '../credits';
import { rollTable } from '../loot';
import { rngFor, die } from '../rng';
import { gunsOf, priceBand, cappedRarity, pickedItem } from './rewards';
import type { RunState } from './state';

const SV: any = svJ;
/** The shop's numbers (`survival.json shop`): the counter's shelves, the rolled stock, the restock price. */
export const SHOP_DATA: { always: { shelf: string; name: string; ids: { id: string; per: number }[] }[]; max_qty: number; stock: any; restock_price: number } = SV.shop;
/** The share of an item's price a sale pays (`survival.json sell_rate.rate`, spec rule 27). */
export const SELL_RATE: number = SV.sell_rate.rate;
/** A face of a safe node (spec section 3.4): its name, role, art ids and fallbacks, stock bias and price, and lines. */
export interface Face { id: string; name: string; role: string; node: string; settings: string[]; portrait: string; portrait_pending?: boolean; fallback: string | null; fallback_patron?: boolean;
  backdrop: string; backdrop_pending?: boolean; backdrop_fallback: string | null; bias: Record<string, number>; price: number; lines: Record<FaceLine, string[]> }
/** The kinds of line a face says (data `lines`). */
export type FaceLine = 'greet' | 'bought' | 'cant_afford' | 'sold' | 'sold_to' | 'gave' | 'leave';
/** Every face (`survival.json faces.items`). */
export const FACES: Face[] = SV.faces.items;
/** The face of a node kind on a setting (the shop's keeper of that setting; the armourer, sergeant, medic everywhere). */
export const faceFor = (node: string, setting: string): Face | undefined => FACES.find((f) => f.node === node && f.settings.includes(setting)) || FACES.find((f) => f.node === node);

/** One piece of a visit's rolled stock: shared, first buyer takes it (`sold`: the buyer's character id). */
export interface ShopPiece { key: string; id: string; rarity: Rarity; price: number; rare?: boolean; sold?: string | null }
/** A shop (or, later, a Forge) open at the node the party stands on (`g.run.shop`). */
export interface ShopState {
  /** The node it stands on and its kind ('shop'; build step 4a opens a 'forge' in the same frame). */
  node: string; kind: 'shop' | 'forge';
  /** The face behind the counter (`FACES` id). */
  face: string;
  /** Today's rolled pieces (rule 25), shared by the party. */
  stock: ShopPiece[];
  /** The face's current line, and how many it has said (each new line is the next from its stream). */
  line: { kind: FaceLine; text: string; to?: string | null }; said: number;
  /** The visit's log, newest first ("Ha bought 2 stims"). */
  log: string[];
}

const RARITIES: Rarity[] = ['standard', 'fine', 'masterwork', 'relic', 'celestial'];
const nameOf = (id: string): string => (WEAPON[id] as any)?.name || (ITEM[id] as any)?.name || id;
const isFocusItem = (id: string) => !!(ITEM[id] as any)?.focus;
/** A piece's tags for a face's bias: weapon, melee, thrown, focus, mana, item, core, mod. */
function tagsOf(id: string): string[] {
  const w: any = WEAPON[id], it: any = ITEM[id];
  if (w) return ['weapon', ...(/melee|unarmed/.test(w.category) ? ['melee'] : []), ...(w.category === 'thrown' ? ['thrown'] : []), ...(w.category === 'mana' ? ['mana'] : [])];
  if (it?.focus) return ['focus', 'weapon'];
  return ['item', ...(id === 'standard_core' ? ['core'] : []), ...(it?.category === 'mod' ? ['mod'] : [])];
}
const biasOf = (face: Face | undefined, id: string) => tagsOf(id).reduce((t, k) => t * (face?.bias?.[k] ?? 1), 1);
/** The rarity table of the rolled stock at a stage (the last row whose `from_stage` it reaches). */
const rarityRow = (stage: number): Record<string, number> => { const rows: any[] = SHOP_DATA.stock.rarity; let r = rows[0]; for (const x of rows) if (stage >= x.from_stage) r = x; const { from_stage: _f, ...w } = r; void _f; return w; };
const rollRarity = (rng: ReturnType<typeof rngFor>, table: Record<string, number>, stage: number): Rarity =>
  cappedRarity(((rollTable(rng, { id: 'rarity', entries: Object.entries(table).map(([item, weight]) => ({ item, weight: Number(weight) })) } as any)?.item) || 'standard') as Rarity, stage);
/** The weapons and foci a shop may roll (priced, not thrown: those are the counter's). */
const GEAR_POOL: string[] = [...Object.keys(WEAPON).filter((id) => (WEAPON[id] as any).category !== 'thrown'), ...Object.keys(ITEM).filter(isFocusItem)].filter((id) => priceOf(id) != null).sort();
/** The items a shop may roll (`stock.item_categories`; priced; never on the counter already). */
const ITEM_POOL = (): string[] => { const counter = new Set(SHOP_DATA.always.flatMap((s) => s.ids.map((x) => x.id)));
  return Object.keys(ITEM).filter((id) => (SHOP_DATA.stock.item_categories as string[]).includes((ITEM[id] as any).category) && !isFocusItem(id) && !counter.has(id) && priceOf(id) != null).sort(); };
/** Today's rolled stock at a shop node (rule 25): `weapons` weapons and foci and `items` items within the depth's price
 * band, `rare` pieces in the band x `rare_band` at `rare_rarity`, every rarity capped by the stage's ceiling, the face's
 * bias weighting the picks and its `price` the prices. From `rngFor(seed, node + '#shop')`. */
export function rollStock(seed: string, node: { id: string; depth: number }, stage: number, face?: Face): ShopPiece[] {
  const rng = rngFor(seed, node.id + '#shop'), S = SHOP_DATA.stock, band = priceBand('fight', node.depth, stage), out: ShopPiece[] = [];
  const pick = (pool: string[], max: number): string | null => {
    const l = pool.filter((id) => (priceOf(id) || Infinity) <= max && !out.some((p) => p.id === id)); if (!l.length) return null;
    return (rollTable(rng, { id: 'shop', entries: l.map((item) => ({ item, weight: biasOf(face, item) })) } as any)?.item as string) || l[die(rng, l.length) - 1];
  };
  const add = (id: string | null, rarity: Rarity, rare = false) => { if (!id) return; out.push({ key: 's' + out.length, id, rarity, price: Math.round((priceOf(id, rarity) || 0) * (face?.price ?? 1)), ...(rare ? { rare: true } : {}) }); };
  for (let i = 0; i < S.weapons; i++) add(pick(GEAR_POOL, band), rollRarity(rng, rarityRow(stage), stage));
  const items = ITEM_POOL(); for (let i = 0; i < S.items; i++) add(pick(items, band), 'standard');
  for (let i = 0; i < S.rare; i++) { const r = rollRarity(rng, S.rare_rarity, stage); add(pick(GEAR_POOL, band * S.rare_band), RARITIES.indexOf(r) < 1 ? cappedRarity('fine', stage) : r, true); }
  return out;
}

/** One line of the counter (always stocked): its key, the id it sells, how many one purchase gives, its shelf. */
export interface CounterLine { key: string; id: string; per: number; shelf: string; res?: string }
/** The counter as it stands for this party (rule 25): every listed shelf, the magazines or rounds of every gun a
 * character carries (shelf `guns`, first), and a restock line for each persistent class resource (shelf `restock`). */
export function counterLines(chars: Character[]): CounterLine[] {
  const out: CounterLine[] = [], seen = new Set<string>();
  const put = (l: CounterLine) => { if (seen.has(l.key)) return; seen.add(l.key); out.push(l); };
  for (const s of SHOP_DATA.always) {
    if (s.shelf === 'guns') {
      // rules 1.53: a party with an archer finds a plain quiver on the counter (every archer may carry two)
      for (const c of chars) if ((drawnWeapon(c.weapon) || packOf(c).some((x) => !!x.weapon && drawnWeapon(x.weapon))) && priceOf(QUIVER_ITEM) != null) put({ key: 'quiver', id: QUIVER_ITEM, per: 1, shelf: 'guns' });
      for (const c of chars) for (const g of gunsOf(c)) { const w: any = WEAPON[g];
        if (w.reload === 'magazine' && priceOf('mag:' + g) != null) put({ key: 'mag:' + g, id: 'mag:' + g, per: 1, shelf: 'guns' });
        else if (ROUND_PRICE[w.ammo]) put({ key: 'guns:rounds:' + w.ammo, id: 'rounds:' + w.ammo, per: w.magazine || 1, shelf: 'guns' }); }
    } else if (s.shelf === 'restock') {
      for (const c of chars) for (const r of classResources(c)) if (r.persist) put({ key: 'restock:' + r.id, id: 'restock:' + r.id, per: 1, shelf: 'restock', res: r.id });
    } else for (const x of s.ids) if (priceOf(x.id) != null) put({ key: x.id, id: x.id, per: x.per, shelf: s.shelf });
  }
  return out;
}
/** What one purchase of a counter line costs (the price of one unit x `per`; a restock point at `restock_price`). */
export const linePrice = (l: CounterLine): number => (l.res ? SHOP_DATA.restock_price : (priceOf(l.id) || 0) * l.per);
/** "Short 240 credits." or null: the words a card shows when the purse can't pay. */
export const shortOf = (c: Character, n: number): string | null => (creditsOf(c) >= n ? null : 'Short ' + (n - creditsOf(c)) + ' credits.');
/** What a restock line can still take for this character (its maximum less what it holds), or 0. */
export function restockRoom(c: Character, res: string): number { const r = classResources(c).find((x) => x.id === res && x.persist); return r ? Math.max(0, r.max - (c.res?.[res] ?? 0)) : 0; }

/** What a pack entry sells for (rule 27): `rate` of its price at its own rarity with its mods; loose rounds and
 * magazines at the counter's prices; for `qty` of a stack (magazines: that many of the entry's). Null: it can't be sold. */
export function sellValue(it: PackItem, qty = it.mags ? 1 : it.qty): number | null {
  if (it.kind === 'plot') return null;
  let each: number | null;
  if (it.mags) { const e = emptyMagPrice(it.weapon || ''), rp = ROUND_PRICE[(WEAPON[it.weapon || ''] as any)?.ammo] || 0; if (e == null) return null;
    const take = it.mags.slice(0, Math.max(1, qty)); return Math.floor(take.reduce((t, n) => t + e + n * rp, 0) * SELL_RATE); }
  else if (it.calibre) each = ROUND_PRICE[it.calibre] || null;
  else each = priceOf(it.weapon || it.item || it.id, (it.rarity || 'standard') as Rarity, it.mods || []);
  return each == null ? null : Math.floor(each * Math.max(1, qty) * SELL_RATE);
}

// ---------- the services shelf (the seam for build step 4a) ----------
/** A card of the services shelf: what it is, its price here (null: none), the engine's reason it can't be taken (null:
 * it can), the numbers that change (the gear preview's lines), and the action the client sends to take it. */
export interface ServiceCard { key: string; title: string; id?: string; rarity?: Rarity; price: number | null; why: string | null; note?: string; lines: { label: string; before: string; after: string }[]; action: { type: string; [k: string]: unknown };
  /** the service that listed it (shopView fills it: the screen heads its shelf by it) */ service?: string;
  /** rules 1.50: a repair card's wear, now and full, and its state (character.ts wearAt) */ wear?: { now: number; max: number; state: 'sound' | 'worn' | 'broken' } }
/** A service a shop or Forge lists (rule 37's grade step: build step 4a's `run/upgrade` registers one): its id, the tab
 * it shows on, the node kinds it serves, and its cards for one character. */
export interface ShopService { id: string; tab: 'upgrade' | 'services'; kinds: ('shop' | 'forge')[]; cards: (g: { run?: RunState | null; characters: Record<string, Character> }, c: Character, shop: ShopState) => ServiceCard[] }
const SERVICES: ShopService[] = [];
/** Add a service to the shop's (and the Forge's) services shelf (spec 8.3 "Upgrade"). Re-registering an id replaces it. */
export function registerShopService(s: ShopService): void { const i = SERVICES.findIndex((x) => x.id === s.id); if (i >= 0) SERVICES.splice(i, 1, s); else SERVICES.push(s); }
/** The services registered for a node kind (in registration order). */
export const shopServices = (kind: 'shop' | 'forge'): ShopService[] => SERVICES.filter((s) => s.kinds.includes(kind));

// ---------- the reducer's half (game.ts runAction calls these; they never throw, they answer in words) ----------
interface G { run?: RunState | null; characters: Record<string, Character>; players: { id: string; name: string; online: boolean }[]; hostId: string }
/** The shop open at the party's node, or null. */
export const shopOf = (g: { run?: RunState | null }): ShopState | null => ((g.run?.state === 'shop' && g.run.shop) ? g.run.shop as ShopState : null);
/** The face's next line of a kind (from the visit's own stream, so a replay says the same). */
function sayLine(r: RunState, sh: ShopState, kind: FaceLine, to: string | null = null) {
  const f = FACES.find((x) => x.id === sh.face), l = f?.lines?.[kind] || []; if (!l.length) return;
  const i = die(rngFor(r.seed, sh.node + '#line#' + sh.said), l.length) - 1;
  sh.line = { kind, text: l[i], to }; sh.said++;
}
const logLine = (sh: ShopState, text: string) => { sh.log = [text, ...sh.log].slice(0, 8); };
/** Rules 1.46: a line in the open shop's log, and its face's line of that kind (a give seen, a grade step bought). */
export function shopSays(g: { run?: RunState | null }, kind: FaceLine, text: string): void { const sh = shopOf(g); if (!sh) return; sayLine(g.run!, sh, kind); logLine(sh, text); }
/** Open the shop at a node (rule 25): its face, today's stock, the greet line; the run waits in the shop. */
export function openShop(r: RunState, node: { id: string; depth: number }, setting: string): ShopState {
  const face = faceFor('shop', setting);
  const sh: ShopState = { node: node.id, kind: 'shop', face: face?.id || '', stock: rollStock(r.seed, node, r.stage, face), line: { kind: 'greet', text: '' }, said: 0, log: [] };
  sayLine(r, sh, 'greet');
  r.shop = sh; r.state = 'shop'; r.ready = {};
  return sh;
}
/** Why `by` can't act for this character in the shop now, in words, or null. */
function whoProblem(g: G, by: string, charId: string): string | null {
  if (!shopOf(g)) return 'No shop is open here.';
  const c = g.characters[charId]; if (!c) return 'No such character.';
  if (c.owner !== by) return 'Only ' + c.name + '\'s player spends ' + c.name + '\'s credits.';
  return null;
}
const qtyOf = (q: unknown) => Math.round(Number(q ?? 1));
/** Why this purchase can't be made, in words, or null (rules 25, 26: the counter, the rolled stock, the purse). */
export function buyProblem(g: G, by: string, a: { charId: string; key: string; qty?: number }): string | null {
  const no = whoProblem(g, by, a.charId); if (no) return no;
  const sh = shopOf(g)!, c = g.characters[a.charId], q = qtyOf(a.qty);
  if (!(q >= 1 && q <= SHOP_DATA.max_qty)) return 'Buy 1 to ' + SHOP_DATA.max_qty + ' at a time.';
  const piece = sh.stock.find((p) => p.key === a.key);
  if (piece) {
    if (piece.sold) return 'Sold to ' + (g.characters[piece.sold]?.name || 'another') + '.';
    if (q !== 1) return 'One of a kind: buy it once.';
    return shortOf(c, piece.price);
  }
  const l = counterLines(Object.values(g.characters)).find((x) => x.key === a.key); if (!l) return 'The shop doesn\'t sell that.';
  if (l.res) { const room = restockRoom(c, l.res); if (!room) return c.name + ' has no ' + l.res.replace(/_/g, ' ') + ' to restock.'; if (q > room) return c.name + ' has room for ' + room + ' more.'; }
  return shortOf(c, linePrice(l) * q);
}
/** Make a purchase (rules 25, 26): the credits out of the buyer's own purse, the goods into its pack (a stim and an
 * Essence into their counts, a restock into the resource); a rolled piece is marked sold to the buyer. Returns the
 * log line, or the refusal in words (nothing changes). */
export function buy(g: G, by: string, a: { charId: string; key: string; qty?: number }): { ok: string } | { no: string } {
  const no = buyProblem(g, by, a); if (no) { const sh = shopOf(g); if (sh && /^Short/.test(no)) sayLine(g.run!, sh, 'cant_afford', a.charId); return { no }; }
  const sh = shopOf(g)!, c = g.characters[a.charId], q = qtyOf(a.qty), piece = sh.stock.find((p) => p.key === a.key);
  const pack = packOf(c).map((x) => ({ ...x }));
  const into = (its: PackItem[]) => { for (const it of its) if (!intoCounts(c, it)) packAdd(pack, it); };
  let what: string;
  if (piece) {
    const err = payCredits(c, piece.price); if (err) return { no: err };
    into(pickedItem({ id: piece.id, rarity: piece.rarity, price: piece.price }));
    sh.stock = sh.stock.map((p) => (p.key === piece.key ? { ...p, sold: c.id } : p));
    what = 'the ' + (piece.rarity !== 'standard' ? piece.rarity[0].toUpperCase() + piece.rarity.slice(1) + ' ' : '') + nameOf(piece.id);
  } else {
    const l = counterLines(Object.values(g.characters)).find((x) => x.key === a.key)!;
    const err = payCredits(c, linePrice(l) * q); if (err) return { no: err };
    if (l.res) { c.res = { ...(c.res || {}), [l.res]: (c.res?.[l.res] ?? 0) + q }; what = q + ' ' + l.res.replace(/_/g, ' '); }
    else {
      const n = l.per * q, r = /^rounds:(.+)$/.exec(l.id), m = /^mag:(.+)$/.exec(l.id);
      const got: PackItem[] = r ? [roundsOf(r[1], n)] : m ? Array.from({ length: n }, () => lootToPack({ item: l.id })).flat()
        : (WEAPON[l.id] as any) ? Array.from({ length: n }, () => lootToPack({ item: l.id })).flat()
        : lootToPack({ item: l.id }).map((it) => ({ ...it, qty: n }));
      into(got);
      what = got.length === 1 ? itemLabel(got[0]) : n + ' × ' + itemLabel(got[0]);
    }
  }
  c.pack = pack;
  sayLine(g.run!, sh, 'bought', c.id);
  const text = c.name + ' bought ' + what; logLine(sh, text);
  return { ok: text };
}
/** Why this sale can't be made, in words, or null (rule 27). */
export function sellProblem(g: G, by: string, a: { charId: string; idx: number; qty?: number }): string | null {
  const no = whoProblem(g, by, a.charId); if (no) return no;
  const c = g.characters[a.charId], it = packOf(c)[a.idx]; if (!it) return 'Nothing there in ' + c.name + '\'s pack.';
  const q = qtyOf(a.qty ?? (it.mags ? 1 : it.qty)), most = it.mags ? it.mags.length : it.qty;
  if (!(q >= 1 && q <= most)) return 'Sell 1 to ' + most + ' of those.';
  const v = sellValue(it, q); if (v == null) return itemLabel(it) + ' can\'t be sold.';
  if (v <= 0) return itemLabel(it) + ' is worth less than a credit here.';
  return null;
}
/** Sell `qty` of a pack entry (rule 27): out of the pack, `sellValue` into the seller's purse. The log line or the refusal. */
export function sell(g: G, by: string, a: { charId: string; idx: number; qty?: number }): { ok: string } | { no: string } {
  const no = sellProblem(g, by, a); if (no) return { no };
  const sh = shopOf(g)!, c = g.characters[a.charId], pack = packOf(c).map((x) => ({ ...x })), it = pack[a.idx];
  const q = qtyOf(a.qty ?? (it.mags ? 1 : it.qty)), v = sellValue(it, q)!, label = itemLabel(it);
  if (it.mags) { const left = it.mags.slice(q); if (left.length) pack[a.idx] = { ...it, mags: left, qty: 1, ...(it.magTypes ? { magTypes: it.magTypes.slice(q) } : {}) }; else pack.splice(a.idx, 1); }
  else if (it.qty > q) pack[a.idx] = { ...it, qty: it.qty - q }; else pack.splice(a.idx, 1);
  c.pack = pack; earnCredits(c, v);
  sayLine(g.run!, sh, 'sold', c.id);
  const text = c.name + ' sold ' + (q > 1 && !it.calibre ? q + ' × ' : '') + label + ' for ' + v + ' credits'; logLine(sh, text);
  return { ok: text };
}
/** A player's "Ready to leave", or the host's close (rule 11, spec 8.3). Returns true when the party leaves now. */
export function leaveShop(g: G, by: string, close = false): { left: boolean; line?: string } | { no: string } {
  const r = g.run, sh = shopOf(g); if (!r || !sh) return { no: 'No shop is open here.' };
  if (!g.players.some((p) => p.id === by)) return { no: 'Only a player in the room leaves the shop.' };
  if (close && by !== g.hostId) return { no: 'Only the host closes the shop for everyone: mark Ready to leave.' };
  r.ready = { ...r.ready, [by]: true };
  const on = g.players.filter((p) => p.online);
  if (!close && on.some((p) => !r.ready[p.id])) return { left: false };
  sayLine(r, sh, 'leave');
  const f = FACES.find((x) => x.id === sh.face), line = f ? f.name + ': "' + sh.line.text + '"' : undefined;
  r.shop = null; r.state = 'map'; r.ready = {};
  return { left: true, line };
}
/** Who is still browsing (connected players with no Ready mark), by name. */
export const shopWaiting = (g: G): string[] => (shopOf(g) ? g.players.filter((p) => p.online && !g.run!.ready[p.id]).map((p) => p.name) : []);

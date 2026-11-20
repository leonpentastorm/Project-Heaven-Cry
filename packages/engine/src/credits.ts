// CREDITS AND PRICES (rules 1.41; survival-spec section 4.2 items 1 and 4). One purse per character (`c.credits`), and
// one door to price a thing at a rarity. A Survival run pays every reward into the character's own purse (rule 47);
// the shop, the Forge and the trades of later steps pay out of it through `payCredits`, whose refusal is in words.
// General: a campaign's rewards and a roguelike's missions use the same purse. (The shelved advanced class in
// classes/j.ts keeps its own class-state credits; it moves here when it returns.)
import { WEAPON, ITEM, RULES, ARMOUR_CLASSES, armourClassRowOf } from './data';
import { RARITY, GRADES, type Character, type Rarity, roundsIdOf, SPECIAL_ROUND_ITEM, SPECIAL_CALIBRES } from './character';
/** The grades in order (rules.json rarity `order`, rules 1.91 item 7905): what a variant's own grade is compared against. */
const rarityOrder = (): string[] => GRADES;

/** The credits a character holds (0 when it has never had any). */
export const creditsOf = (c: { credits?: number } | null | undefined): number => Math.max(0, Math.floor(Number(c?.credits) || 0));
/** Pay credits INTO a character's purse (a reward, a sale, a give). Whole credits only; a negative or empty amount adds
 * nothing. Returns what was added. */
export function earnCredits(c: Character, n: number): number {
  const add = Math.max(0, Math.round(Number(n) || 0)); if (!add) return 0;
  c.credits = creditsOf(c) + add; return add;
}
/** Why a character can't pay `n` credits, in words, or null when it can. */
export function cantPay(c: Character, n: number): string | null {
  const need = Math.max(0, Math.round(Number(n) || 0)), have = creditsOf(c);
  return have >= need ? null : c.name + ' is ' + (need - have) + ' credits short.';
}
/** Take `n` credits out of a character's purse. Returns null when paid, else the refusal in words (nothing is taken). */
export function payCredits(c: Character, n: number): string | null {
  const no = cantPay(c, n); if (no) return no;
  c.credits = creditsOf(c) - Math.max(0, Math.round(Number(n) || 0)); return null;
}
const WR: any = RULES.weapons_rules || {};
/** Credits a round of each calibre costs (Core Rules, Ammo and calibres; `rules.json weapons_rules.calibres[].price_credits`). */
export const ROUND_PRICE: Record<string, number> = Object.fromEntries((WR.calibres || []).map((c: any) => [c.id, Number(c.price_credits) || 0]));
/** An empty magazine's price for a gun (rules 1.42; `weapons_rules.magazine_prices`: by reload unit, then category), or
 * null for a gun loaded round by round. */
export function emptyMagPrice(weaponId: string): number | null {
  const w: any = WEAPON[weaponId], t = WR.magazine_prices || {}; if (!w || w.reload !== 'magazine' || w.magazine == null) return null;
  return Number(t.by_unit?.[w.reload_unit] ?? t.by_category?.[w.category] ?? t.default) || 0;
}
/** Rules 1.56 (L2): one special round of a calibre: its type's `price_mult` (SPECIAL_ROUND_ITEM) x that calibre's round
 * (a calibre of `special_round_price.calibres`), or null (no such round is made or sold). */
function specialRoundPrice(cal: string, type: string, o: { sale?: boolean } = {}): number | null {
  const it = SPECIAL_ROUND_ITEM[type], rp = ROUND_PRICE[cal] || 0;
  return it && (o.sale ? it.sell !== false : it.stock !== false) && it.built !== false && rp > 0 && SPECIAL_CALIBRES.includes(cal) ? Number(it.price_mult) * rp : null;
}
/** What a weapon or an item costs at a rarity (its `price_credits` x `rules.json rarity.<r>.price`), with its fitted mods
 * at their own price; or null when it has no price (a plot item, a natural weapon, `stock: false` things). Also prices
 * the counter's shapes (rules 1.42): `rounds:<calibre>` (one round), `mag:<weapon>` (one full magazine: the empty
 * magazine and its rounds), `rounds:<calibre>:<type>` (a special round: `price_mult` x that calibre's round, rules 1.56)
 * and a bare special-round item (the same, at the reference calibre). The one price door: shop,
 * sale, picks, loot value. `o.sale` (rules 1.55 item 55): the price a SALE starts from: `stock: false` (never
 * bought) does not stop it, `sell: false` (never sold) does. */
export function priceOf(id: string, rarity: Rarity = 'standard', mods: readonly string[] = [], o: { sale?: boolean } = {}): number | null {
  const r = roundsIdOf(id); if (r) return r.type ? specialRoundPrice(r.calibre, r.type, o) : ROUND_PRICE[r.calibre] > 0 ? ROUND_PRICE[r.calibre] : null;
  // rules 1.52: body armour of a class (`armour:<class>`) at the class's own price (rules.json combat armor.classes)
  const ac = armourClassRowOf(id); if (ac || /^armour:\d+$/.test(id)) { const p = Number(ac?.price_credits); return p > 0 ? Math.round(p * (RARITY[rarity]?.price ?? 1)) : null; } // rules 1.93 item 8113: the one reader
  // rules 1.55: `mag:<weapon>:<rounds>` is a magazine holding that many rounds (`:0` an empty one), the same formula
  const m = /^mag:([^:]+)(?::(\d+))?$/.exec(id);
  if (m) { const w: any = WEAPON[m[1]], e = emptyMagPrice(m[1]), rp = w ? ROUND_PRICE[w.ammo] : 0; if (e == null || !rp) return null;
    const cap = w.magazine || 0, n = m[2] != null ? Math.min(cap, Number(m[2])) : cap; return e + rp * n; }
  // rules 1.55: a row the engine does not run yet (`built: false`) has no price, so no stock, reward, loot or camp pool that
  // asks for a price (every one does) can hold it
  const def: any = WEAPON[id] || ITEM[id]; if (!def || def.built === false || (o.sale ? def.sell === false : def.stock === false)) return null;
  let p = Number(def.price_credits);
  if ((!Number.isFinite(p) || p <= 0) && Number(def.price_mult) > 0) p = specialRoundPrice(WR.special_round_price?.calibre, def.ammo_type, o) ?? NaN;
  // rules 1.56 L4: a variant (data/variants.json) is its base's price x (1 + its modifiers' worth / 100), and never under
  // its own grade (a direct upgrade comes at a rarer grade and costs more)
  if (def.variant_of) { p = p * (1 + Number(def.variant_worth || 0) / 100); const order = rarityOrder(); if (order.indexOf(def.variant_grade) > order.indexOf(rarity)) rarity = def.variant_grade; }
  if (!Number.isFinite(p) || p <= 0) return null;
  const base = Math.round(p * (RARITY[rarity]?.price ?? 1));
  return base + mods.reduce((t, x) => t + (priceOf(x, 'standard', [], o) || 0), 0);
}

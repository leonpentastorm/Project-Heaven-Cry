// CREDITS AND PRICES (rules 1.41; survival-spec section 4.2 items 1 and 4). One purse per character (`c.credits`), and
// one door to price a thing at a rarity. A Survival run pays every reward into the character's own purse (rule 47);
// the shop, the Forge and the trades of later steps pay out of it through `payCredits`, whose refusal is in words.
// General: a campaign's rewards and a roguelike's missions use the same purse. (The shelved advanced class in
// classes/j.ts keeps its own class-state credits; it moves here when it returns.)
import { WEAPON, ITEM, RULES } from './data';
import { RARITY, type Character, type Rarity } from './character';

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
/** What a weapon or an item costs at a rarity (its `price_credits` x `rules.json rarity.<r>.price`), with its fitted mods
 * at their own price; or null when it has no price (a plot item, a natural weapon, `stock: false` things). Also prices
 * the counter's shapes (rules 1.42): `rounds:<calibre>` (one round), `mag:<weapon>` (one full magazine: the empty
 * magazine and its rounds) and a special round (`price_mult` x the reference calibre's round). The one price door: shop,
 * sale, picks, loot value. */
export function priceOf(id: string, rarity: Rarity = 'standard', mods: readonly string[] = []): number | null {
  const r = /^rounds:(.+)$/.exec(id); if (r) return ROUND_PRICE[r[1]] > 0 ? ROUND_PRICE[r[1]] : null;
  const m = /^mag:(.+)$/.exec(id);
  if (m) { const w: any = WEAPON[m[1]], e = emptyMagPrice(m[1]), rp = w ? ROUND_PRICE[w.ammo] : 0; return e == null || !rp ? null : e + rp * (w.magazine || 0); }
  const def: any = WEAPON[id] || ITEM[id]; if (!def || def.stock === false) return null;
  let p = Number(def.price_credits);
  if ((!Number.isFinite(p) || p <= 0) && Number(def.price_mult) > 0) p = Number(def.price_mult) * (ROUND_PRICE[WR.special_round_price?.calibre] || 0);
  if (!Number.isFinite(p) || p <= 0) return null;
  const base = Math.round(p * (RARITY[rarity]?.price ?? 1));
  return base + mods.reduce((t, x) => t + (priceOf(x) || 0), 0);
}

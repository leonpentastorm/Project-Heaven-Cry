// CREDITS AND PRICES (rules 1.41; survival-spec section 4.2 items 1 and 4). One purse per character (`c.credits`), and
// one door to price a thing at a rarity. A Survival run pays every reward into the character's own purse (rule 47);
// the shop, the Forge and the trades of later steps pay out of it through `payCredits`, whose refusal is in words.
// General: a campaign's rewards and a roguelike's missions use the same purse. (The shelved advanced class in
// classes/j.ts keeps its own class-state credits; it moves here when it returns.)
import { WEAPON, ITEM } from './data';
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
  return have >= need ? null : c.name + ' is short ' + (need - have) + ' credits (has ' + have + ', needs ' + need + ').';
}
/** Take `n` credits out of a character's purse. Returns null when paid, else the refusal in words (nothing is taken). */
export function payCredits(c: Character, n: number): string | null {
  const no = cantPay(c, n); if (no) return no;
  c.credits = creditsOf(c) - Math.max(0, Math.round(Number(n) || 0)); return null;
}
/** What a weapon or an item costs at a rarity (its `price_credits` x `rules.json rarity.<r>.price`), or null when it has
 * no price (a plot item, a natural weapon, `stock: false` things). The one price door: shop, sale, picks, loot value. */
export function priceOf(id: string, rarity: Rarity = 'standard'): number | null {
  const def: any = WEAPON[id] || ITEM[id]; if (!def) return null;
  const p = Number(def.price_credits); if (!Number.isFinite(p) || p <= 0 || def.stock === false) return null;
  return Math.round(p * (RARITY[rarity]?.price ?? 1));
}

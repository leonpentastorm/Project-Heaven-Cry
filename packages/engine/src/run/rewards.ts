// WHAT A NODE GIVES (rules 1.41; docs/design/survival-spec.md rules 14, 23 and 26, section 3.1; Survival build step 3).
// Pure: the amounts of XP and credits a node pays each character, the ammunition pack, and the weapon pick of three
// (rolled from the run's seed through a named stream, never the fight's dice). The run reducer (game.ts, `run/*`) pays
// them through the engine's doors: `giveXp`, `earnCredits` (credits.ts), `packAdd` with `lootToPack`.
import '../datatext';
import svJ from '../../../../data/survival.json';
import { WEAPON, ITEM } from '../data';
import { type Character, type PackItem, type Rarity, FOCUS_IDS, FOCUS_DOOR, holds, packOf, kindOfDoor, roundsOf } from '../character';
import { lootToPack } from '../containers';
import { priceOf } from '../credits';
import { rollTable } from '../loot';
import { rngFor, die } from '../rng';
import { ENC_BUDGET, type FightKind } from './encounter';
import type { RunOffer, RunWeapon } from './state';
import { capRoom, rollProps, worthOf } from './power';
import { statQuery } from '../effects/hooks';

const SV: any = svJ;
/** What each kind of node without a fight says on its panel (`survival.json nodes`; the shop, Forge, training ground,
 * shrine and Crossroads until build steps 4 and 4a). */
export const NODE_TEXT: Record<string, string> = SV.nodes;
/** The path map's hover card for each kind of node (`survival.json tips`; the gate has its own). */
export const NODE_TIP: Record<string, string> = SV.tips;
/** The node kinds that pay: the fights, and a cache. */
export type PayKind = FightKind | 'cache';
const mult = (o: { elite: number; boss: number; cache: number }, k: PayKind) => (k === 'elite' || k === 'gate' ? o.elite : k === 'boss' ? o.boss : k === 'cache' ? o.cache : 1);
const stageXp = (s: number) => { const l: number[] = ENC_BUDGET.stage.xp; return l[Math.max(0, Math.min(l.length - 1, s - 1))]; };
/** XP each character takes at a node (section 3.1): f(d) = base + per_depth x (d - 1), x the kind, x the stage's. */
export const nodeXp = (k: PayKind, depth: number, stage: number): number =>
  Math.round((SV.xp.base + SV.xp.per_depth * (depth - 1)) * mult(SV.xp, k) * stageXp(stage));
/** Credits each character takes at a node (section 3.1, 11.1): c(d) = base + per_depth x d, x the kind, x the stage's. */
export const nodeCredits = (k: PayKind, depth: number, stage: number): number =>
  Math.round((SV.credits.base + SV.credits.per_depth * depth) * mult(SV.credits, k) * (1 + ENC_BUDGET.stage.credits * (Math.max(1, stage) - 1)));
/** The ammunition pack's count at a node (rule 23): magazines' worth for each gun. */
export const packCount = (k: PayKind): number => (k === 'gate' ? SV.ammo_pack.elite : SV.ammo_pack[k] ?? SV.ammo_pack.fight);

/** Is this a gun (a weapon with a magazine and a calibre)? Thrown things and blades are not. */
const isGun = (id: string) => { const w: any = WEAPON[id]; return !!w && w.magazine != null && !!w.ammo && w.category !== 'thrown'; };
/** The guns a character carries, one entry each (in hand, off hand, pack). */
export function gunsOf(c: Character): string[] {
  const out: string[] = [];
  if (isGun(c.weapon)) out.push(c.weapon);
  if (c.offHand && isGun(c.offHand.id)) out.push(c.offHand.id);
  for (const it of packOf(c)) if (it.kind === 'weapon' && it.weapon && isGun(it.weapon)) for (let i = 0; i < Math.max(1, it.qty || 1); i++) out.push(it.weapon);
  return out;
}
/** A magazine's worth for one gun (rule 23): a full magazine, or a magazine's capacity of loose rounds. */
export function magazineWorth(id: string): PackItem[] {
  const w: any = WEAPON[id]; if (!w) return [];
  return w.reload === 'loose' ? [roundsOf(w.ammo, w.magazine || 0)] : lootToPack({ item: 'mag:' + id });
}
/** The ammunition pack (rule 23): `n` magazines' worth for every gun carried, and the cores for a Sigil or Visualizer
 * focus carried. The pack items, in order (the caller adds them with packAdd). */
export function ammoPack(c: Character, n: number, guns: string[] = gunsOf(c)): PackItem[] {
  const out: PackItem[] = [], m = ammoMult(c), mags = Math.round(n * m), coreN = Math.round(SV.ammo_pack.cores * m);
  for (const id of guns) for (let i = 0; i < mags; i++) out.push(...magazineWorth(id));
  const cores = (SV.ammo_pack.core_doors as string[]).some((k) => holds(c, { slot: 'person', door: k }));
  if (cores && coreN > 0) out.push(...lootToPack({ item: 'standard_core', qty: coreN }));
  return out;
}
/** Rules 1.44: the ammunition pack's multiplier for this character (the stat `run_ammo`, which its relics answer:
 * Bandolier), on its magazines and its cores. */
export const ammoMult = (c: Character): number => statQuery({ c }, 'run_ammo').mult;
/** Rules 1.44: a node's credits as this character takes them (the stat `run_credits`, which its relics answer: Tithe). */
export const creditsFor = (c: Character, credits: number): number => Math.round(credits * statQuery({ c }, 'run_credits').mult);

const RARITIES: Rarity[] = ['standard', 'fine', 'masterwork', 'relic', 'celestial'];
/** The weapons and foci a pick can offer (rule 26): every weapon and focus with a price, no thrown things. */
const PICKABLE: string[] = [...Object.keys(WEAPON).filter((id) => (WEAPON[id] as any).category !== 'thrown'), ...Object.keys(ITEM).filter((id) => (ITEM[id] as any).focus)]
  .filter((id) => priceOf(id) != null);
const categoryOf = (id: string): string => (WEAPON[id] as any)?.category || ((ITEM[id] as any)?.focus ? 'focus' : 'item');
/** The highest price a pick may roll at a node (rule 26), on the standard price. */
export const priceBand = (k: PayKind, depth: number, stage: number): number => {
  const b = SV.rewards.price_band; return (b.base + b.per_depth * depth + b.per_stage * (Math.max(1, stage) - 1)) * (k === 'elite' || k === 'gate' ? b.elite : k === 'boss' ? b.boss : 1);
};
/** The highest grade a stage reaches (rule 26, rules 1.43): `rewards.ceiling` by stage (stage 1 Fine, stage 2
 * Masterwork, from stage 3 Relic): what its picks give and what its shops and Forges grade to. */
export const stageCeiling = (stage: number): Rarity => SV.rewards.ceiling[Math.max(0, Math.min(SV.rewards.ceiling.length - 1, stage - 1))];
/** A rolled rarity capped by the stage's ceiling (rule 26): a Celestial roll is a Relic (Celestial is a Relic and a
 * quirk, and no quirk is in data yet). A Relic takes its named property in weaponOffer (rules 1.43). */
export function cappedRarity(r: Rarity, stage: number): Rarity {
  const ceil = stageCeiling(stage);
  const out: Rarity = r === 'celestial' ? 'relic' : r;
  return RARITIES.indexOf(out) > RARITIES.indexOf(ceil) ? ceil : out;
}
/** The door a character leans on (rule 28's preselection): the focus kind whose door skill has the most points (1 or
 * more), else null. */
export function doorOf(c: Character): string | null {
  let best: string | null = null, top = 0;
  for (const [k, sk] of Object.entries(FOCUS_DOOR)) { const n = c.skills[sk] || 0; if (n > top) { top = n; best = k; } }
  return best;
}
/** The weapon pick at a node (rule 26): `offer` weapons within the price band, the first for the character's own door
 * (a focus of its kind) or the category of the weapon in its hand, the rest any; each at a rolled rarity capped by the
 * stage; or credits instead at instead_rate of the cheapest offer's price. From `rngFor(seed, node + '#pick#' + id)`. */
export function weaponOffer(c: Character, node: { id: string; depth: number }, k: PayKind, stage: number, seed: string, o: { rarity?: 'fight' | 'elite' | 'boss'; ammo?: number } = {}): RunOffer {
  const rng = rngFor(seed, node.id + '#pick#' + c.id), band = priceBand(o.rarity === 'elite' && k === 'fight' ? 'elite' : k, node.depth, stage);
  const fits = PICKABLE.filter((id) => (priceOf(id) || Infinity) <= band);
  const door = doorOf(c), dk = door ? kindOfDoor(door) : null;
  const own = [...(dk ? fits.filter((id) => FOCUS_IDS[dk].includes(id)) : []), ...fits.filter((id) => categoryOf(id) === categoryOf(c.weapon))];
  const take = (list: string[], have: string[]) => { const l = list.filter((id) => !have.includes(id)); return l.length ? l[die(rng, l.length) - 1] : null; };
  const ids: string[] = [];
  const first = take(own.length ? own : fits, ids); if (first) ids.push(first);
  while (ids.length < SV.rewards.offer) { const x = take(fits, ids); if (!x) break; ids.push(x); }
  const table = SV.rewards.rarity[o.rarity || (k === 'gate' ? 'elite' : k === 'cache' ? 'fight' : k)];
  let room = capRoom(c);
  const weapons: RunWeapon[] = ids.map((id) => {
    const rolled = (rollTable(rng, { id: 'rarity', entries: Object.entries(table).map(([r, w]) => ({ item: r, weight: Number(w) })) })?.item || 'standard') as Rarity;
    let rarity = cappedRarity(rolled, stage), prop: string | undefined;
    // rules 1.43 (rule 26): a Relic comes with its named property rolled, worth on the cap; none that fits: Masterwork
    if (rarity === 'relic') { prop = rollProps(rng, id, room, 1)[0]; if (prop) room -= worthOf(prop); else rarity = 'masterwork'; }
    return { id, rarity, price: priceOf(id, rarity) || 0, ...(prop ? { prop } : {}) };
  });
  const cheapest = weapons.length ? Math.min(...weapons.map((w) => w.price)) : 0;
  return { node: node.id, weapons, instead: Math.round(cheapest * SV.rewards.instead_rate), ammo: o.ammo ?? packCount(k) };
}
/** A picked weapon or focus as it goes into the pack (rarity kept, rule 26; a focus glove as a focus, as the creation
 * kits and the Proving Ground's give pack one). */
export const pickedItem = (w: RunWeapon): PackItem[] => lootToPack({ item: w.id, rarity: w.rarity })
  .map((it) => ((ITEM[w.id] as any)?.focus ? { ...it, kind: 'focus' as const, ...(w.rarity !== 'standard' ? { rarity: w.rarity } : {}) } : it))
  .map((it) => (w.prop ? { ...it, prop: w.prop } : it)); // rules 1.43: a Relic's property goes with it

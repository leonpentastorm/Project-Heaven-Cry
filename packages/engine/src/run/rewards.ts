// WHAT A NODE GIVES (rules 1.41; docs/design/survival-spec.md rules 14, 23 and 26, section 3.1; Survival build step 3).
// Pure: the amounts of XP and credits a node pays each character, the ammunition pack, and the weapon pick of three
// (rolled from the run's seed through a named stream, never the fight's dice). The run reducer (game.ts, `run/*`) pays
// them through the engine's doors: `giveXp`, `earnCredits` (credits.ts), `packAdd` with `lootToPack`.
import '../datatext';
import svJ from '../../../../data/survival.json';
import { WEAPON, ITEM } from '../data';
import { type Character, type PackItem, type Rarity, FOCUS_IDS, FOCUS_DOOR, holds, packOf, kindOfDoor, roundsOf, drawnWeapon, QUIVER_ITEM, maxMp, coresCarried, evoChargeNow, carriesVisualizer } from '../character';
import { CORE_CHARGE, VIS_CHARGE } from '../magic';
import { lootToPack } from '../containers';
import { priceOf } from '../credits';
import { rollTable, defaultTable, type Drops, type DropEntry } from '../loot';
import type { Unit } from '../combat';
import { rngFor, die, next, type Rng } from '../rng';
import { ENC_BUDGET, VAULT, type FightKind } from './encounter';
import type { RunOffer, RunWeapon } from './state';
import { capRoom, rollProps, worthOf } from './power';
import { statQuery } from '../effects/hooks';

const SV: any = svJ;
/** What each kind of node without a fight says on its panel (`survival.json nodes`; the shop, Forge, training ground,
 * shrine and Crossroads until build steps 4 and 4a). */
export const NODE_TEXT: Record<string, string> = SV.nodes;
/** The path map's hover card for each kind of node (`survival.json tips`; the gate has its own). */
export const NODE_TIP: Record<string, string> = SV.tips;
/** The node kinds that pay: the fights, a cache, and (rules 1.48) the vault's chest. */
export type PayKind = FightKind | 'cache' | 'vault';
/** A kind's multiplier in a table of them (the gate pays as an Elite; a kind the table does not name, x 1). */
const mult = (o: Record<string, number>, k: PayKind) => (k === 'gate' ? o.elite : k === 'fight' ? 1 : o[k] ?? 1);
const stageXp = (s: number) => { const l: number[] = ENC_BUDGET.stage.xp; return l[Math.max(0, Math.min(l.length - 1, s - 1))]; };
/** XP each character takes at a node (section 3.1): f(d) = base + per_depth x (d - 1), x the kind, x the stage's. */
export const nodeXp = (k: PayKind, depth: number, stage: number): number =>
  Math.round((SV.xp.base + SV.xp.per_depth * (depth - 1)) * mult(SV.xp, k) * stageXp(stage));
/** Credits each character takes at a node (section 3.1, 11.1): c(d) = base + per_depth x d, x the kind, x the stage's. */
export const nodeCredits = (k: PayKind, depth: number, stage: number): number =>
  Math.round((SV.credits.base + SV.credits.per_depth * depth) * mult(SV.credits, k) * (1 + ENC_BUDGET.stage.credits * (Math.max(1, stage) - 1)));
type PackN = { mags: number; supply: number };
const packPart = (t: Record<string, number>, k: PayKind): number => (k === 'gate' ? t.elite : t[k] ?? t.fight);
/** The supply pack's counts at a node (rule 23; rules 1.55, the lead's ruling): `mags`, the magazines' worth for each
 * gun, and `supply`, the n of the burnt cores back and the MP share (`ammo_pack.mags`, `ammo_pack.supply` by kind; the
 * gate reads the Elite's). */
export const packCount = (k: PayKind): PackN => ({ mags: packPart(SV.ammo_pack.mags, k), supply: packPart(SV.ammo_pack.supply, k) });
/** Rules 1.48: the grade of the vault's weapon in a stage: `vault.grade_up` above the stage's pick ceiling, at most
 * `vault.grade_max` (stage 1 Masterwork, from stage 2 Relic). */
export const vaultGrade = (stage: number): Rarity => {
  const v = VAULT, i = Math.min(RARITIES.indexOf(stageCeiling(stage)) + v.grade_up, RARITIES.indexOf(v.grade_max as Rarity));
  return RARITIES[Math.max(0, i)];
};

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
  const w: any = WEAPON[id]; if (!w || w.magazine == null || !w.ammo || w.category === 'thrown') return []; // rules 1.42: a blade or a thrown thing has no magazine (it gave a stray plot item)
  return w.reload === 'loose' ? [roundsOf(w.ammo, w.magazine || 0)] : lootToPack({ item: 'mag:' + id });
}
/** The supply pack (rule 23; rules 1.51, spec rule 52): `n` magazines' worth for every gun carried (x the stat
 * `run_ammo`: Bandolier), and for a character carrying an Evoker or a Visualizer (`ammo_pack.core_doors`) cores: after a
 * fight the spare cores it burnt (`burnt`, whole cores taken from its pack in the fight: none burnt, none back), at most
 * `ammo_pack.cores_max` x n; at a cache or the vault's chest (`burnt` left out) `ammo_pack.cores` x n. The cores are x
 * the stat `run_supply` (Deep Satchel). The pack items, in order (the caller adds them with packAdd); the MP share is
 * `supplyMp`. */
export function ammoPack(c: Character, count: number | PackN, guns: string[] = gunsOf(c), burnt?: number): PackItem[] {
  const pn = typeof count === 'number' ? { mags: count, supply: count } : count, n = pn.supply;
  const out: PackItem[] = [], mags = Math.round(pn.mags * ammoMult(c));
  for (const id of guns) for (let i = 0; i < mags; i++) out.push(...magazineWorth(id));
  const base = burnt == null ? SV.ammo_pack.cores * n : Math.min(SV.ammo_pack.cores_max * n, Math.max(0, burnt));
  const coreN = Math.round(base * supplyMult(c));
  const cores = (SV.ammo_pack.core_doors as string[]).some((k) => holds(c, { slot: 'person', door: k }));
  if (cores && coreN > 0) out.push(...lootToPack({ item: 'standard_core', qty: coreN }));
  return out;
}
/** Rules 1.51 (spec rule 52 c): the MP a character takes back with the supply pack: `ammo_pack.mp_share` x n x the stat
 * `run_supply` (Deep Satchel) of its max MP, rounded, for a character carrying an MP focus of `ammo_pack.mp_doors`; else
 * 0. The caller adds it, never above the max. */
export function supplyMp(c: Character, count: number | PackN): number {
  const n = typeof count === 'number' ? count : count.supply;
  const mp = (SV.ammo_pack.mp_doors as string[]).some((k) => holds(c, { slot: 'person', door: k }));
  return mp ? Math.round(SV.ammo_pack.mp_share * n * supplyMult(c) * maxMp(c)) : 0;
}
/** Rules 1.51 (spec rule 52 b): the Sigil and Figment charge a character holds: its spare cores x a core's charge, and
 * the loaded charge of each Evoker and Visualizer it carries. (Shown on the run's screens; the supply pack counts cores.) */
export const chargeHeld = (c: Character): number => coresCarried(c) * CORE_CHARGE + evoChargeNow(c) + (carriesVisualizer(c) ? Math.max(0, Math.min(VIS_CHARGE, c.visCharge ?? VIS_CHARGE)) : 0);
/** Rules 1.51 (spec rule 52 b; the review): the spare cores burnt in a fight, from two counts of the cores carried
 * (coresCarried) as it began and as it ended: never below 0, never more than were held as it began. The core loaded in a
 * focus is not counted until it is swapped out (a Rest fills it). */
export const coresBurnt = (before: number, after: number): number => Math.max(0, Math.min(before, before - after));
/** Rules 1.44: the supply pack's magazines multiplier for this character (the stat `run_ammo`, which its relics answer:
 * Bandolier). */
export const ammoMult = (c: Character): number => statQuery({ c }, 'run_ammo').mult;
/** Rules 1.51 (the review): the supply pack's cores and MP multiplier (the stat `run_supply`: Deep Satchel). */
export const supplyMult = (c: Character): number => statQuery({ c }, 'run_supply').mult;
/** Rules 1.44: a node's credits as this character takes them (the stat `run_credits`, which its relics answer: Tithe). */
export const creditsFor = (c: Character, credits: number): number => Math.round(credits * statQuery({ c }, 'run_credits').mult);

const RARITIES: Rarity[] = ['standard', 'fine', 'masterwork', 'relic', 'celestial'];
/** The weapons and foci a pick can offer (rule 26): every weapon and focus with a price, no thrown things. */
const PICKABLE: string[] = [...Object.keys(WEAPON).filter((id) => (WEAPON[id] as any).category !== 'thrown'), ...Object.keys(ITEM).filter((id) => (ITEM[id] as any).focus)]
  .filter((id) => priceOf(id) != null);
const categoryOf = (id: string): string => (WEAPON[id] as any)?.category || ((ITEM[id] as any)?.focus ? 'focus' : 'item');
/** The highest price a pick may roll at a node (rule 26), on the standard price. */
export const priceBand = (k: PayKind, depth: number, stage: number): number => {
  const b = SV.rewards.price_band; return (b.base + b.per_depth * depth + b.per_stage * (Math.max(1, stage) - 1)) * mult(b, k);
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
/** Where a pick is made (rules 1.54, `rewards.offer` by where): a node kind that pays, or a sealed crate. */
type OfferWhere = PayKind | 'crate';
/** Rules 1.54 item 2 (spec R7): how many weapons a pick holds where it is made (`rewards.offer`; the gate reads the
 * Elite's, as every table does). */
const offerSize = (w: OfferWhere): number => { const t = SV.rewards.offer; return t[w === 'gate' ? 'elite' : w] ?? t.fight; };
/** Rules 1.54 item 4 (Core Rules item 4107), rules 1.55 items 23 and 24: the Materials card at a node of depth d: each
 * of `rewards.materials.items` with `per_credits` at ceil(C / per_credits), C an ordinary fight's credits there
 * (nodeCredits) x `materials.mult` by the kind (the gate reads the Elite's); an item with `by` only where its row names
 * the kind: with its `chance` (absent: certain), a qty in its [min, max], from the pick's own stream. None where
 * `rewards.materials.at` does not name it (the vault's chest, a sealed crate). */
function materialsCard(w: OfferWhere, k: PayKind, depth: number, stage: number, rng: Rng): { item: string; n: number }[] | null {
  const m = SV.rewards.materials, key = w === 'gate' ? 'elite' : w; if (!m || !(m.at as string[]).includes(key)) return null;
  const C = nodeCredits('fight', depth, stage) * mult(m.mult || {}, k);
  return (m.items as { item: string; per_credits?: number; by?: Record<string, { chance?: number; qty: [number, number] }> }[]).map((x) => {
    if (x.per_credits) return { item: x.item, n: Math.ceil(C / x.per_credits) };
    const row = x.by?.[key]; if (!row || (row.chance != null && !(next(rng) < row.chance))) return { item: x.item, n: 0 };
    return { item: x.item, n: row.qty[0] + die(rng, row.qty[1] - row.qty[0] + 1) - 1 };
  }).filter((x) => x.n > 0);
}
/** Rules 1.55 item 21: does a pick hold the One-weapon card: `rewards.weapon_card` by where it is made (absent: always),
 * rolled once for the node from `rngFor(seed, node + '#weapon-card')`, so every player sees the same. */
const weaponCard = (w: OfferWhere, node: string, seed: string): boolean => {
  const p = SV.rewards.weapon_card?.[w === 'gate' ? 'elite' : w]; return p == null || p >= 1 || next(rngFor(seed, node + '#weapon-card')) < p;
};
/** Rules 1.54 item 3 (spec R8): what a foe of a Survival fight drops: the loot door's flag off (no weapon, magazines,
 * loose rounds or Boss's notable thing), its kind's table rolled as before, and given materials (`survival.json drops`):
 * `gun` for a gun, `by_table` by its table (a caster's, a machine's). */
export function runFoeDrops(u: Unit): Drops {
  const D = SV.drops, table = defaultTable(u); // rules 1.55 item 26: `kind_table` false: the kind's table is not rolled
  return { gear: false, ...(D.kind_table === false ? {} : { table }), items: [...(isGun(u.weapon) ? D.gun : []), ...(D.by_table[table] || [])].map((e: DropEntry) => ({ ...e })) };
}
/** The pick at a node (rule 26; rules 1.54 item 2): `offerSize(where)` weapons within the price band, the first for the
 * character's own door (a focus of its kind) or the category of the weapon in its hand, the rest any; each at a rolled
 * rarity capped by the stage; and where it is offered, the Materials card for the node's credits. From
 * `rngFor(seed, node + '#pick#' + id)`. */
export function weaponOffer(c: Character, node: { id: string; depth: number }, k: PayKind, stage: number, seed: string, o: { /** a row of `rewards.rarity` (a sealed crate's own) */ rarity?: string; /** the price band's kind (a trade's `band`) */ band?: PayKind; ammo?: number; /** rules 1.48: every weapon at this grade (the vault's chest), not rolled */ grade?: Rarity; /** rules 1.54: where it is made when not the node's kind (a sealed crate) */ where?: OfferWhere } = {}): RunOffer {
  const where: OfferWhere = o.where || k;
  const rng = rngFor(seed, node.id + '#pick#' + c.id), band = priceBand(o.band || k, node.depth, stage);
  // rules 1.53: a character who carries a Drawn weapon may be offered a quiver, and it counts as an offer for its door
  const archer = drawnWeapon(c.weapon) || packOf(c).some((x) => !!x.weapon && drawnWeapon(x.weapon)), quiver = archer && (priceOf(QUIVER_ITEM) || Infinity) <= band ? [QUIVER_ITEM] : [];
  const fits = [...PICKABLE.filter((id) => (priceOf(id) || Infinity) <= band), ...quiver];
  const door = doorOf(c), dk = door ? kindOfDoor(door) : null;
  const own = [...(dk ? fits.filter((id) => FOCUS_IDS[dk].includes(id)) : []), ...fits.filter((id) => categoryOf(id) === categoryOf(c.weapon)), ...quiver];
  const take = (list: string[], have: string[]) => { const l = list.filter((id) => !have.includes(id)); return l.length ? l[die(rng, l.length) - 1] : null; };
  const ids: string[] = [], size = weaponCard(where, node.id, seed) ? offerSize(where) : 0; // rules 1.55 item 21
  const first = size ? take(own.length ? own : fits, ids) : null; if (first) ids.push(first);
  while (ids.length < size) { const x = take(fits, ids); if (!x) break; ids.push(x); }
  const table = SV.rewards.rarity[o.rarity || (k === 'gate' || k === 'vault_guard' ? 'elite' : k === 'cache' || k === 'vault' ? 'fight' : k)];
  let room = capRoom(c);
  const weapons: RunWeapon[] = ids.map((id) => {
    const rolled = o.grade || (rollTable(rng, { id: 'rarity', entries: Object.entries(table).map(([r, w]) => ({ item: r, weight: Number(w) })) })?.item || 'standard') as Rarity;
    let rarity = o.grade || cappedRarity(rolled, stage), prop: string | undefined;
    // rules 1.43 (rule 26): a Relic comes with its named property rolled, worth on the cap; none that fits: Masterwork
    if (rarity === 'relic' && id !== QUIVER_ITEM) { prop = rollProps(rng, id, room, 1)[0]; if (prop) room -= worthOf(prop); else rarity = 'masterwork'; }
    return { id, rarity, price: priceOf(id, rarity) || 0, ...(prop ? { prop } : {}) };
  });
  const materials = materialsCard(where, k, node.depth, stage, rng);
  return { node: node.id, weapons, ...(materials ? { materials } : {}), ammo: o.ammo ?? packCount(k).mags };
}
/** A picked weapon or focus as it goes into the pack (rarity kept, rule 26; a focus glove's line kind is the one rule's,
 * packKindOf, through lootToPack). */
export const pickedItem = (w: RunWeapon): PackItem[] => {
  const gun = isGun(w.id) && !drawnWeapon(w.id), out = lootToPack({ item: w.id, rarity: w.rarity })
    .map((it) => ((ITEM[w.id] as any)?.focus && w.rarity !== 'standard' ? { ...it, rarity: w.rarity } : it))
    .map((it) => (w.prop ? { ...it, prop: w.prop } : it)) // rules 1.43: a Relic's property goes with it
    .map((it) => (gun && it.weapon === w.id ? { ...it, loaded: (WEAPON[w.id] as any).magazine } : it));
  // rules 1.55 (the lead's ruling): a gun taken from a pick or bought comes loaded and with `rewards.gun_spare`
  // magazine's worth (a loose-loaded gun: that many loads of loose rounds), the same for a pick and a shop
  if (gun) for (let i = 0; i < (SV.rewards.gun_spare ?? 0); i++) out.push(...magazineWorth(w.id));
  return out;
};

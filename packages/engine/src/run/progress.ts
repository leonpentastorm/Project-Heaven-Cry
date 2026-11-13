// IN-RUN PROGRESSION (rules 1.43; docs/design/survival-spec.md section 11, rules 37 to 46; Survival build step 4a).
// What the safe nodes give that lasts: the grade step at a shop or a Forge (`run/upgrade`, rules 37, 38, 43), the
// Forge's mods and worn pieces and its armour fitting (`run/forge`, `run/fit`, rule 44), the rest's small training and
// the training ground's big one (`run/train`, rules 39, 45), the shrine's rite, piece or token (`run/shrine`, rule 46),
// the Crossroads' trades (`run/trade`, rule 42), and the Elites' and caches' armour-or-item picks (`run/take`, rule 41).
// Every gain lands through the engine's own doors: `setGrade` (the grade, a Relic's property), `payCredits` /
// `earnCredits` / `priceOf` (credits.ts), `addDrill`, `addStudy`, `addPractice`, `shiftDevotion`, `grantPiece`, the
// relic items of run/power.ts (`c.relics`), `lootToPack` / `packAdd`; every refusal is in words. One problem function
// per action answers both the reducer (it refuses with it) and the screen (`runOptions`: each option with its price
// and the engine's reason), so the client builds no price, legality or choice.
import '../datatext';
import svJ from '../../../../data/survival.json';
import { WEAPON, ITEM } from '../data';
import { type Character, type Rarity, type GearWhere, gearAt, setGrade, packOf, maxHp, maxDurOf, armourCap, armourGateWhy } from '../character';
import { payCredits, earnCredits, cantPay, priceOf } from '../credits';
import { addDrill } from '../physical/data';
import { addStudy } from '../sigilgrowth';
import { addPractice } from '../magic';
import { shiftDevotion, grantPiece, DEVOTION_XP } from '../faith';
import { beliefOf, FAITH_PATRONS, FAITH_PATRON } from '../belief';
import { lootToPack, packAdd } from '../containers';
import { rngFor, die } from '../rng';
import { type RunState, type RunVisit, type RunLasting, type RunStock, runNode, runSetting } from './state';
import { SETTING } from './encounter';
import { stageCeiling, weaponOffer } from './rewards';
import { relicRow, rollProps, capRoom, capProblem, boonsFor, graftOf, worthOf, BOON_CAP, runWorth } from './power';
import type { GameState } from '../game';

const SV: any = svJ;
/** The grade ladder (survival.json grade_up): prices, the places and their factors, the Relic's place and stage, the chit. */
export const GRADE_UP: { price: Record<'fine' | 'masterwork' | 'relic', number>; places: Record<GradePlace, number>; relic_at: GradePlace; per_visit: number; relic_from_stage: number; relic_offer: number; cut_rate: number; chit: string } = SV.grade_up;
/** Where a grade step is bought: a shop (full price) or a Forge (its factor; the only place for the Relic step). */
export type GradePlace = 'shop' | 'forge';
/** The rest's small training and the training ground's big one (survival.json train, training). */
export const TRAIN: { drill: number; study: number; practice: number; devotion: number } = SV.train;
export const TRAINING: { drill: number; study: number; practice: number; extra_price: number; most: number } = SV.training;
/** The shrine's numbers (survival.json shrine). */
export const SHRINE: { token_max_worth: number; tokens_per_stage: number } = SV.shrine;
/** The armour-or-item picks (survival.json lasting). */
export const LASTING: { offer: number; min: number; fill: string[]; chit_gate: number; chit_from_stage: number; chit_odds: number } = SV.lasting;
/** The Crossroads' trades (survival.json trades). */
export const TRADES: { offer: number; items: TradeRow[] } = SV.trades;
/** One trade (rule 42): `do` names what it takes and gives; its numbers are its own fields. */
export interface TradeRow { id: string; name: string; do: 'grade' | 'drill' | 'crate' | 'wayside' | 'graft' | 'salvage'; text: string; [k: string]: any }
const TRADE: Record<string, TradeRow> = Object.fromEntries(TRADES.items.map((t) => [t.id, t]));
/** The Forge's stock size and the armour fitting's prices (survival.json forge, armour_fit). */
const FORGE_SLOTS: number = SV.forge.slots, FIT: Record<string, number> = SV.armour_fit.price;
const LADDER: Rarity[] = ['standard', 'fine', 'masterwork', 'relic'];
const GRADE_WORD: Record<string, string> = { standard: 'Standard', fine: 'Fine', masterwork: 'Masterwork', relic: 'Relic', celestial: 'Celestial' };
const nameOf = (id: string) => (WEAPON[id] as any)?.name || (ITEM[id] as any)?.name || id;

/** The actions of this file (the run reducer hands them here; game.ts Action lists them). */
export type ProgressAction =
  | { type: 'run/upgrade'; charId: string; where: GearWhere; place: GradePlace; chit?: boolean; prop?: string }
  | { type: 'run/forge'; charId: string; slot: number } | { type: 'run/fit'; charId: string }
  | { type: 'run/train'; charId: string; train: 'drill' | 'study' | 'practice' | 'devotion'; weapon?: string }
  | { type: 'run/shrine'; charId: string; choice: 'rite' | 'piece' | 'token' }
  | { type: 'run/trade'; charId: string; trade: string; where?: GearWhere; weapon?: string; train?: 'devotion' | 'study' | 'practice'; pick?: number }
  | { type: 'run/take'; charId: string; choice: number | 'none' };
/** Where the reducer writes a line of the log (game.ts push). */
export type Say = (text: string, charId?: string, head?: string) => void;

// ---------------------------------------------------------------------------------------------- the visit
/** The safe node the party stands on, and its visit, or null (a fight node, the run elsewhere). */
function here(g: GameState): { r: RunState; n: NonNullable<ReturnType<typeof runNode>>; v: RunVisit } | null {
  const r = g.run; if (!r || (r.state !== 'map' && r.state !== 'reward')) return null;
  const n = runNode(r, r.at), v = r.visit; if (!n || !v || v.node !== n.id) return null;
  return { r, n, v };
}
const notHere = (want: string) => 'You are not at ' + want + ': walk to one on the map.';
/** Rules 1.43: a visit begins as the party enters a safe node; the Forge rolls its stock, the Crossroads its trades, the
 * shrine its patron, each from the run's seed through the node's own stream (rule 12). */
export function openVisit(g: GameState, n: { id: string; kind: string }): RunVisit {
  const r = g.run!, v: RunVisit = { node: n.id, kind: n.kind, steps: {}, did: {} };
  if (n.kind === 'forge') v.stock = forgeStock(g, rngFor(r.seed, n.id + '#forge'));
  if (n.kind === 'event') { const rng = rngFor(r.seed, n.id + '#trades'), pool = TRADES.items.map((t) => t.id); v.trades = []; while (v.trades.length < TRADES.offer && pool.length) v.trades.push(pool.splice(die(rng, pool.length) - 1, 1)[0]); }
  if (n.kind === 'shrine') { const rng = rngFor(r.seed, n.id + '#shrine'); v.patron = FAITH_PATRONS[die(rng, FAITH_PATRONS.length) - 1].id; }
  return v;
}
/** Who may act for a character: its player, or the host (for an away player, as with picks). */
const mayAct = (g: GameState, c: Character, by: string) => (c.owner === by || by === g.hostId ? null : 'Only ' + c.name + '\'s player acts for ' + c.name + ' (or the host, for an away player).');
const setVisit = (r: RunState, v: RunVisit, patch: Partial<RunVisit>) => { r.visit = { ...v, ...patch }; };
const bump = (m: Record<string, number>, id: string) => ({ ...m, [id]: (m[id] || 0) + 1 });
const marksOf = (r: RunState, c: Character, what: string) => (r.marks?.[c.id] || []).filter((m) => m === what + '@' + r.stage).length;
const mark = (r: RunState, c: Character, what: string) => { r.marks = { ...(r.marks || {}), [c.id]: [...(r.marks?.[c.id] || []), what + '@' + r.stage] }; };

// ---------------------------------------------------------------------------------------------- the grade step
/** The grade a step reaches from this one (Standard, Fine, Masterwork, Relic), or null past the Relic (Celestial is
 * never sold, rule 38). */
export const nextGrade = (r: Rarity): Rarity | null => { const i = LADDER.indexOf(r); return i < 0 || i >= LADDER.length - 1 ? null : LADDER[i + 1]; };
/** What a grade step to `to` costs at a place (rule 37): the ladder's price x the place's factor; the Relic step its own
 * price (rule 38: the Forge's factor does not apply). */
export const gradePrice = (to: Rarity, place: GradePlace): number => (to === 'relic' ? GRADE_UP.price.relic : Math.round((GRADE_UP.price as any)[to] * GRADE_UP.places[place]));
const chitAt = (c: Character) => packOf(c).findIndex((x) => (x.item || x.id) === GRADE_UP.chit && x.qty > 0);
/** The three named properties a Relic step offers for the instance at `where` (rule 38): fitting it and the cap, from
 * the node's stream for this character and this weapon. */
export function relicChoices(g: GameState, c: Character, where: GearWhere): string[] {
  const r = g.run, it = gearAt(c, where); if (!r || !it) return [];
  return rollProps(rngFor(r.seed, (r.at || '') + '#relic#' + c.id + '#' + it.id), it.id, capRoom(c), GRADE_UP.relic_offer);
}
/** Why this grade step can't be taken now, in words, or null (rules 37, 38, 43). */
export function upgradeProblem(g: GameState, c: Character, a: { where: GearWhere; place: GradePlace; chit?: boolean; prop?: string }): string | null {
  const h = here(g); if (!h) return notHere('a shop or a Forge');
  if (!(a.place in GRADE_UP.places)) return 'A grade step is bought at a shop or a Forge.';
  if (h.n.kind !== a.place) return 'This is not a ' + (a.place === 'forge' ? 'Forge' : 'shop') + '.';
  const it = gearAt(c, a.where); if (!it) return 'There is no weapon or focus there to grade.';
  if ((WEAPON[it.id] as any)?.category === 'thrown') return 'A thrown thing is not graded.';
  const to = nextGrade(it.rarity); if (!to) return 'The ' + GRADE_WORD[it.rarity] + ' ' + nameOf(it.id) + ' is graded as far as anyone sells: Celestial is never for sale.';
  const ceil = stageCeiling(h.r.stage);
  if (LADDER.indexOf(to) > LADDER.indexOf(ceil)) return to === 'relic' ? 'The Relic step opens in stage ' + GRADE_UP.relic_from_stage + '.' : 'Stage ' + h.r.stage + ' grades to ' + GRADE_WORD[ceil] + ' at most: ' + GRADE_WORD[to] + ' comes in a later stage.';
  if (to === 'relic' && a.place !== GRADE_UP.relic_at) return 'The Relic step is the Forge\'s.';
  if ((h.v.steps[c.id] || 0) >= GRADE_UP.per_visit) return 'One grade step a visit: ' + c.name + ' has had it here.';
  if (to === 'relic') {
    if (a.chit) return 'A chit pays a Fine or Masterwork step, not the Relic.';
    const offer = relicChoices(g, c, a.where);
    if (!offer.length) return 'No named property fits the ' + nameOf(it.id) + ' inside ' + c.name + '\'s cap (' + runWorth(c) + ' of ' + BOON_CAP + ' used).';
    if (!a.prop) return 'Pick one of the three named properties.';
    if (!offer.includes(a.prop)) return 'That property is not one of the three offered for the ' + nameOf(it.id) + '.';
  }
  if (a.chit) return chitAt(c) < 0 ? c.name + ' has no armourer\'s chit.' : null;
  return cantPay(c, gradePrice(to, a.place));
}
function doUpgrade(g: GameState, c: Character, a: Extract<ProgressAction, { type: 'run/upgrade' }>, say: Say): string | null {
  const no = upgradeProblem(g, c, a); if (no) return no;
  const h = here(g)!, it = gearAt(c, a.where)!, to = nextGrade(it.rarity)!, price = gradePrice(to, a.place);
  if (a.chit) { const pack = packOf(c).map((x) => ({ ...x })), i = chitAt(c); if (pack[i].qty > 1) pack[i].qty--; else pack.splice(i, 1); c.pack = pack; }
  else payCredits(c, price);
  const err = setGrade(c, a.where, to, to === 'relic' ? a.prop : undefined); if (err) return err;
  setVisit(h.r, h.v, { steps: bump(h.v.steps, c.id) });
  say(c.name + '\'s ' + nameOf(it.id) + ' is ' + GRADE_WORD[to] + ' now' + (to === 'relic' ? ', ' + relicRow(a.prop!)!.name + ' (' + worthOf(a.prop!) + ' of the run\'s ' + BOON_CAP + ')' : '') + (a.chit ? ': paid with an armourer\'s chit.' : ': ' + price + ' credits.'), c.id);
  return null;
}

// ---------------------------------------------------------------------------------------------- the Forge
/** The mods and worn pieces that would last for this character (rule 41): a mod for a slot its main weapon has free, a
 * worn piece better (dearer) than the one it wears in that slot (or for an empty slot); priced ones only. */
export function lastingFor(c: Character): string[] {
  const w: any = WEAPON[c.weapon], used = new Set((c.weaponState?.mods || []).map((m) => (ITEM[m] as any)?.mod_slot));
  const free = ((w?.mod_slots || []) as string[]).filter((s) => !used.has(s));
  const out: string[] = [];
  for (const it of Object.values(ITEM) as any[]) {
    if (priceOf(it.id) == null) continue;
    if (it.category === 'mod' && free.includes(it.mod_slot)) out.push(it.id);
    if (it.category === 'armour' && it.slot) { const worn = c.worn?.[it.slot]; if (!worn || (priceOf(it.id) || 0) > (priceOf(worn) || 0)) out.push(it.id); }
  }
  return out;
}
function forgeStock(g: GameState, rng: ReturnType<typeof rngFor>): RunStock[] {
  const chars = Object.values(g.characters).filter((c) => !c.dead);
  const want = [...new Set(chars.flatMap((c) => lastingFor(c)))];
  const any = (Object.values(ITEM) as any[]).filter((it) => (it.category === 'mod' || (it.category === 'armour' && it.slot)) && priceOf(it.id) != null).map((it) => it.id);
  const out: string[] = [];
  for (const pool of [want, any.filter((id) => !want.includes(id))]) { const p = [...pool]; while (out.length < FORGE_SLOTS && p.length) out.push(p.splice(die(rng, p.length) - 1, 1)[0]); }
  return out.map((id) => ({ id, price: priceOf(id) || 0 }));
}
/** Why this character can't buy the Forge's stock line `slot` now, or null (rule 44: shared stock, first buyer). */
export function forgeProblem(g: GameState, c: Character, slot: number): string | null {
  const h = here(g); if (!h || h.n.kind !== 'forge') return notHere('a Forge');
  const s = h.v.stock?.[slot]; if (!s) return 'No such piece at the Forge.';
  if (s.sold) return 'Sold to ' + (g.characters[s.sold]?.name || 'someone') + '.';
  return cantPay(c, s.price);
}
/** The next armour class the Forge fits for this character, and why it can't now (rule 44), or null when none is next. */
export function fitOf(g: GameState, c: Character): { cls: number; price: number; why: string | null } | null {
  const next = (c.armourClass || 0) + 1, price = FIT[String(next)];
  if (price == null) return null;
  const h = here(g), cap = armourCap(c);
  const why = !h || h.n.kind !== 'forge' ? notHere('a Forge') : cap != null && next > cap ? c.name + ' can wear Class ' + cap + ' at most.' : armourGateWhy(c, next) || cantPay(c, price);
  return { cls: next, price, why };
}

// ---------------------------------------------------------------------------------------------- trainings
const carriedWeapons = (c: Character): string[] => [...new Set([c.weapon, c.offHand?.id || '', ...packOf(c).filter((x) => x.kind === 'weapon').map((x) => x.weapon || x.id)])]
  .filter((id) => !!WEAPON[id] && id !== 'fists' && (WEAPON[id] as any).category !== 'thrown');
/** Why a character can take this kind of training (or the wayside's gift) at all, or null: drill needs a weapon it
 * carries, study a Sigil user, practice an Outburst user, Devotion the Faithful (rules 39, 42, 45). */
function trainKindProblem(c: Character, kind: string, weapon?: string): string | null {
  if (kind === 'drill') return weapon && carriedWeapons(c).includes(weapon) ? null : 'Name a weapon ' + c.name + ' carries to drill with.';
  if (kind === 'study') return (c.skills.brain_power || 0) > 0 ? null : 'Study is for a Sigil user (Brain Power 1 or more).';
  if (kind === 'practice') return (c.skills.will_power || 0) > 0 ? null : 'Practice is for an Outburst user (Will Power 1 or more).';
  if (kind === 'devotion') return beliefOf(c).kind === 'faithful' ? null : c.name + ' is an Atheist: there is no Devotion to raise.';
  return 'No such training.';
}
/** What a training gives: drill, study, practice or Devotion through its own door; the lines for the log. */
function trainDo(g: GameState, c: Character, kind: string, n: number, why: string, weapon?: string): string[] {
  if (kind === 'drill') { const d = addDrill(c, weapon!, n); return [c.name + ' drills with the ' + nameOf(weapon!) + ' (+' + d.add + ', ' + why + '): drill ' + d.total + (d.mark ? ', mark ' + d.mark + ' reached' : '') + (d.learned ? '; a technique is learned' : '') + '.']; }
  if (kind === 'study') { const l = addStudy(c, n, why); return l.length ? l : [c.name + ' studies the Sigil words (+' + n + ', ' + why + ').']; }
  if (kind === 'practice') return [addPractice(c, n, why)];
  shiftDevotion(g, null, c, n, why); return [];
}
/** Why this training can't be taken now, or null (rule 39 at a rest: one small one; rule 45 at a training ground: one
 * big one free, a second for its price). */
export function trainProblem(g: GameState, c: Character, a: { train: string; weapon?: string }): string | null {
  const h = here(g); if (!h || (h.n.kind !== 'rest' && h.n.kind !== 'training')) return notHere('a rest or a training ground');
  const done = h.v.did[c.id] || 0;
  if (h.n.kind === 'rest' && done >= 1) return 'One small training at a rest: ' + c.name + ' has taken it.';
  if (h.n.kind === 'training') {
    if (a.train === 'devotion') return 'Devotion is the shrine\'s, not the sergeant\'s.';
    if (done >= TRAINING.most) return c.name + ' has trained as much as the yard allows this visit.';
  }
  return trainKindProblem(c, a.train, a.weapon) || (h.n.kind === 'training' && done >= 1 ? cantPay(c, TRAINING.extra_price) : null);
}
/** What a training costs now: the training ground's second (its extra price), else nothing. */
export function trainPrice(g: GameState, c: Character): number { const h = here(g); return h?.n.kind === 'training' && (h.v.did[c.id] || 0) >= 1 ? TRAINING.extra_price : 0; }

// ---------------------------------------------------------------------------------------------- the shrine
/** The shrine's token for this character (rule 46): one boon of the tile's pool, small enough and inside its cap, from
 * the node's stream; null when none fits. */
export function tokenFor(g: GameState, c: Character): string | null {
  const r = g.run!, pool = SETTING[runSetting(r)]?.pool || '', can = boonsFor(c, pool, SHRINE.token_max_worth);
  return can.length ? can[die(rngFor(r.seed, (r.at || '') + '#token#' + c.id), can.length) - 1].id : null;
}
/** Why this shrine offer can't be taken now, or null (rule 46). */
export function shrineProblem(g: GameState, c: Character, choice: string): string | null {
  const h = here(g); if (!h || h.n.kind !== 'shrine') return notHere('a shrine');
  if (h.v.did[c.id]) return 'One offer at a shrine: ' + c.name + ' has taken it.';
  const faithful = beliefOf(c).kind === 'faithful', p = FAITH_PATRON[h.v.patron || ''];
  if (choice === 'rite') return faithful ? null : c.name + ' is an Atheist: the rite is kept by the faithful (a piece of lore, or the token).';
  if (choice === 'piece') return faithful ? 'A piece of lore is for the faithless: ' + c.name + ' keeps the rite.' : (c.faithPieces?.[p?.id] || 0) >= 3 ? c.name + ' already knows all three of ' + p?.name + '\'s Hymns.' : null;
  if (choice === 'token') {
    if (marksOf(h.r, c, 'token') >= SHRINE.tokens_per_stage) return 'One token a stage: ' + c.name + ' has had it.';
    return tokenFor(g, c) ? null : 'The shrine has no token for ' + c.name + ': nothing in this tile\'s pool is small enough to fit the cap.';
  }
  return 'No such offer at a shrine.';
}

// ---------------------------------------------------------------------------------------------- the Crossroads
/** The graft the Crossroads offers this character (rule 42): a boon of the tile's pool inside its cap, from the node's
 * stream; null when none fits. */
export function graftFor(g: GameState, c: Character): string | null {
  const r = g.run!, can = boonsFor(c, SETTING[runSetting(r)]?.pool || '');
  return can.length ? graftOf(can[die(rngFor(r.seed, (r.at || '') + '#graft#' + c.id), can.length) - 1].id) : null;
}
/** What a trade costs in credits for this character and its pick (0 when it costs something else). */
export function tradePrice(c: Character, a: { trade: string; where?: GearWhere }): number {
  const t = TRADE[a.trade]; if (!t) return 0;
  if (t.do === 'crate') return t.price;
  if (t.do === 'grade') { const it = a.where != null ? gearAt(c, a.where) : null, to = it ? nextGrade(it.rarity) : null; return to && to !== 'relic' ? Math.round((GRADE_UP.price as any)[to] * t.cut_rate) : 0; }
  return 0;
}
/** What a salvage pays for a pack line (rule 42): its price at its own grade x the trade's rate, or null (unpriced). */
export function salvageWorth(c: Character, pick: number, rate: number): number | null {
  const it = packOf(c)[pick]; if (!it || it.kind === 'plot' || it.mags || it.calibre || it.kind === 'ammo') return null;
  const p = priceOf(it.weapon || it.item || it.id, it.rarity || 'standard'); return p == null ? null : Math.round(p * rate);
}
/** Why this trade can't be taken now, or null (rule 42: one trade a character, or walk on). */
export function tradeProblem(g: GameState, c: Character, a: { trade: string; where?: GearWhere; weapon?: string; train?: string; pick?: number }): string | null {
  const h = here(g); if (!h || h.n.kind !== 'event') return notHere('a crossroads');
  const t = TRADE[a.trade]; if (!t || !(h.v.trades || []).includes(t.id)) return 'That trade is not offered here.';
  if (h.v.did[c.id]) return 'One trade each at a crossroads: ' + c.name + ' has made one.';
  switch (t.do) {
    case 'grade': {
      const it = a.where != null ? gearAt(c, a.where) : null; if (!it) return 'Pick a weapon ' + c.name + ' carries.';
      if (!maxDurOf(it.id, it.rarity)) return 'The off-books armourer works on weapons with wear to pay in: a focus has none.';
      const to = nextGrade(it.rarity); if (!to || to === 'relic') return 'The off-books armourer grades to Fine or Masterwork only.';
      const ceil = stageCeiling(h.r.stage); if (LADDER.indexOf(to) > LADDER.indexOf(ceil)) return 'Stage ' + h.r.stage + ' grades to ' + GRADE_WORD[ceil] + ' at most.';
      return cantPay(c, tradePrice(c, a));
    }
    case 'drill': { const k = trainKindProblem(c, 'drill', a.weapon); if (k) return k; return Math.floor(c.hp * t.hp_share) < 1 ? c.name + ' has too little HP left to spar.' : null; }
    case 'crate': return cantPay(c, t.price);
    case 'wayside': {
      if (marksOf(h.r, c, 'wayside') >= t.per_stage) return 'The wayside shrine gives once a stage: ' + c.name + ' has had it.';
      return a.train === 'devotion' || a.train === 'study' || a.train === 'practice' ? trainKindProblem(c, a.train) : 'The wayside shrine gives Devotion, study or practice.';
    }
    case 'graft': return graftFor(g, c) ? null : 'Nothing here fits ' + c.name + '\'s cap.';
    case 'salvage': return a.pick == null || salvageWorth(c, a.pick, t.rate) == null ? 'Pick a weapon or item from the pack with a price (rounds and magazines sell at a shop).' : null;
  }
  return 'No such trade.';
}

// ---------------------------------------------------------------------------------------------- lasting picks
/** An armour-or-item pick of three (rules 41, 43): at least `lasting.min` lasting things for this character (a mod for a
 * free slot, a better worn piece), the rest from `fill`; the gate's holds an armourer's chit in its stage, an Elite from
 * chit_from_stage may roll one. From `rngFor(seed, node + '#lasting#' + character)`. */
export function lastingOffer(c: Character, node: { id: string; gate?: boolean; kind: string }, stage: number, seed: string): RunLasting {
  const rng = rngFor(seed, node.id + '#lasting#' + c.id), out: { id: string; lasting: boolean }[] = [];
  const chit = (node.gate && stage <= LASTING.chit_gate) || (node.kind === 'elite' && !node.gate && stage >= LASTING.chit_from_stage && die(rng, LASTING.chit_odds) === 1);
  if (chit) out.push({ id: GRADE_UP.chit, lasting: true });
  const pool = lastingFor(c);
  while (out.length < LASTING.offer && out.filter((x) => x.lasting).length < LASTING.min + (chit ? 1 : 0) && pool.length) out.push({ id: pool.splice(die(rng, pool.length) - 1, 1)[0], lasting: true });
  const fill = [...LASTING.fill];
  while (out.length < LASTING.offer && fill.length) out.push({ id: fill.splice(die(rng, fill.length) - 1, 1)[0], lasting: false });
  return { node: node.id, items: out };
}

// ---------------------------------------------------------------------------------------------- the reducer's door
/** Rules 1.43: one `run/*` action of this file through the one reducer (game.ts runAction hands it here). Returns null
 * when done, else the refusal in words (nothing has changed). */
export function progressAction(g: GameState, a: ProgressAction, by: string, say: Say): string | null {
  const c = g.characters[a.charId]; if (!c) return 'No such character.';
  const who = mayAct(g, c, by); if (who) return who;
  const r = g.run; if (!r) return 'No run is under way.';
  switch (a.type) {
    case 'run/upgrade': return doUpgrade(g, c, a, say);
    case 'run/forge': {
      const no = forgeProblem(g, c, a.slot); if (no) return no;
      const h = here(g)!, s = h.v.stock![a.slot];
      payCredits(c, s.price);
      const pack = packOf(c).map((x) => ({ ...x })); for (const it of lootToPack({ item: s.id })) packAdd(pack, it); c.pack = pack;
      setVisit(h.r, h.v, { stock: h.v.stock!.map((x, i) => (i === a.slot ? { ...x, sold: c.id } : x)) });
      say(c.name + ' buys the ' + nameOf(s.id) + ' from the armourer: ' + s.price + ' credits.', c.id); return null;
    }
    case 'run/fit': {
      const f = fitOf(g, c); if (!f) return c.name + ' wears the heaviest class the Forge fits.'; if (f.why) return f.why;
      payCredits(c, f.price); c.armourClass = f.cls;
      say(c.name + ' is fitted for armour class ' + f.cls + ': ' + f.price + ' credits.', c.id); return null;
    }
    case 'run/train': {
      const no = trainProblem(g, c, a); if (no) return no;
      const h = here(g)!, price = trainPrice(g, c), big = h.n.kind === 'training', amounts: any = big ? TRAINING : TRAIN;
      if (price) payCredits(c, price);
      setVisit(h.r, h.v, { did: bump(h.v.did, c.id) });
      for (const l of trainDo(g, c, a.train, amounts[a.train], big ? 'the training ground' + (price ? ', ' + price + ' credits' : '') : 'a rest', a.weapon)) say(l, c.id);
      return null;
    }
    case 'run/shrine': {
      const no = shrineProblem(g, c, a.choice); if (no) return no;
      const h = here(g)!, p = FAITH_PATRON[h.v.patron!];
      if (a.choice === 'piece') { const err = grantPiece(g, c, p.id, 'a shrine of ' + p.name); if (err) return err; }
      if (a.choice === 'rite') shiftDevotion(g, null, c, DEVOTION_XP.rite, 'a rite kept at a shrine of ' + p.name);
      if (a.choice === 'token') { const id = tokenFor(g, c)!; c.relics = [...(c.relics || []), id]; mark(h.r, c, 'token'); say(c.name + ' takes ' + p.name + '\'s token: ' + relicRow(id)!.name + ' (' + worthOf(id) + ' of the run\'s ' + BOON_CAP + ').', c.id); }
      setVisit(h.r, h.v, { did: bump(h.v.did, c.id) });
      return null;
    }
    case 'run/trade': {
      const no = tradeProblem(g, c, a); if (no) return no;
      const h = here(g)!, t = TRADE[a.trade];
      setVisit(h.r, h.v, { did: bump(h.v.did, c.id) });
      switch (t.do) {
        case 'grade': { const it = gearAt(c, a.where!)!, to = nextGrade(it.rarity)!, price = tradePrice(c, a); payCredits(c, price); setGrade(c, a.where!, to, undefined, { durShare: t.dur_share }); say(c.name + '\'s ' + nameOf(it.id) + ' comes back ' + GRADE_WORD[to] + ' and worn, off the books: ' + price + ' credits.', c.id); break; }
        case 'drill': { const cost = Math.floor(c.hp * t.hp_share); c.hp -= cost; say(c.name + ' spars hard and pays ' + cost + ' HP.', c.id); for (const l of trainDo(g, c, 'drill', t.drill, 'a hard sparring', a.weapon)) say(l, c.id); break; }
        case 'crate': { payCredits(c, t.price); h.r.offers = { ...(h.r.offers || {}), [c.id]: weaponOffer(c, { id: h.n.id + '#crate', depth: h.n.depth }, 'fight', h.r.stage, h.r.seed, { rarity: t.rarity, ammo: 0 }) }; h.r.state = 'reward'; say(c.name + ' pays ' + t.price + ' credits for a sealed crate: three weapons inside.', c.id); break; }
        case 'wayside': { mark(h.r, c, 'wayside'); for (const l of trainDo(g, c, a.train!, t[a.train!], 'a wayside shrine')) say(l, c.id); break; }
        case 'graft': { const id = graftFor(g, c)!; c.relics = [...(c.relics || []), id]; c.hp = Math.min(c.hp, maxHp(c)); say(c.name + ' takes a back-room graft: ' + relicRow(id)!.name + ' (' + worthOf(id) + ' of the run\'s ' + BOON_CAP + '); max HP ' + maxHp(c) + '.', c.id); break; }
        case 'salvage': { const n = salvageWorth(c, a.pick!, t.rate)!, pack = packOf(c).map((x) => ({ ...x })), it = pack[a.pick!]; if (it.qty > 1) it.qty--; else pack.splice(a.pick!, 1); c.pack = pack; earnCredits(c, n); say(c.name + ' sells the ' + it.name + ' to a salvage buyer: ' + n + ' credits.', c.id); break; }
      }
      return null;
    }
    case 'run/take': {
      const l = r.lasting?.[c.id]; if (r.state !== 'reward' || !l) return 'There is nothing to pick for that character now.';
      if (a.choice !== 'none') {
        const x = l.items[Number(a.choice)]; if (!x) return 'No such thing in the pick.';
        const pack = packOf(c).map((y) => ({ ...y })); for (const it of lootToPack({ item: x.id })) packAdd(pack, it); c.pack = pack;
        say(c.name + ' takes the ' + nameOf(x.id) + '.', c.id);
      } else say(c.name + ' leaves the kit where it lies.', c.id);
      const rest = { ...r.lasting! }; delete rest[c.id]; r.lasting = Object.keys(rest).length ? rest : null;
      return null;
    }
  }
  return 'No such run action.';
}

// ---------------------------------------------------------------------------------------------- the screen's options
/** One choice a safe node offers a character (rules 1.43): its words, its price (credits; 0 for none), the engine's
 * reason it can't be taken (null when it can), and the action to send. The client only draws these. */
export interface RunOption { group: 'grade' | 'relic' | 'forge' | 'fit' | 'train' | 'shrine' | 'trade' | 'lasting'; key: string; label: string; detail: string; price: number; why: string | null; action: ProgressAction }
/** Every choice the node the party stands on offers this character, with prices and reasons (rules 1.43). */
export function runOptions(g: GameState, charId: string): RunOption[] {
  const c = g.characters[charId], h = here(g); if (!c || !h) return [];
  const out: RunOption[] = [], k = h.n.kind, word = (r: Rarity) => GRADE_WORD[r];
  const wheres: GearWhere[] = ['main', 'off', ...packOf(c).map((_, i) => i)];
  if (k === 'shop' || k === 'forge') for (const where of wheres) {
    const it = gearAt(c, where); if (!it || (WEAPON[it.id] as any)?.category === 'thrown') continue;
    const to = nextGrade(it.rarity), at = (typeof where === 'number' ? 'pack' : where === 'main' ? 'main hand' : 'off hand');
    const base = { where, place: k as GradePlace };
    if (to === 'relic' && k === GRADE_UP.relic_at) {
      const props = relicChoices(g, c, where), gate = upgradeProblem(g, c, { ...base, prop: props[0] });
      if (!props.length) out.push({ group: 'relic', key: 'relic:' + where, label: 'The Relic step: ' + nameOf(it.id), detail: at, price: GRADE_UP.price.relic, why: gate || upgradeProblem(g, c, base), action: { type: 'run/upgrade', charId, ...base } });
      for (const p of props) out.push({ group: 'relic', key: 'relic:' + where + ':' + p, label: nameOf(it.id) + ' to Relic, ' + relicRow(p)!.name, detail: relicRow(p)!.text + ' Worth ' + worthOf(p) + ' of ' + BOON_CAP + '; ' + capRoom(c) + ' left.', price: GRADE_UP.price.relic, why: upgradeProblem(g, c, { ...base, prop: p }), action: { type: 'run/upgrade', charId, ...base, prop: p } });
    } else if (to) {
      out.push({ group: 'grade', key: 'grade:' + where, label: nameOf(it.id) + ': ' + word(it.rarity) + ' to ' + word(to), detail: at + (to !== 'relic' && k === 'shop' ? ' · at a Forge: ' + gradePrice(to, 'forge') : ''), price: to === 'relic' ? GRADE_UP.price.relic : gradePrice(to, k as GradePlace), why: upgradeProblem(g, c, base), action: { type: 'run/upgrade', charId, ...base } });
      if (chitAt(c) >= 0 && to !== 'relic') out.push({ group: 'grade', key: 'chit:' + where, label: nameOf(it.id) + ': ' + word(it.rarity) + ' to ' + word(to) + ' with a chit', detail: at, price: 0, why: upgradeProblem(g, c, { ...base, chit: true }), action: { type: 'run/upgrade', charId, ...base, chit: true } });
    }
  }
  if (k === 'forge') {
    (h.v.stock || []).forEach((s, i) => out.push({ group: 'forge', key: 'forge:' + i, label: nameOf(s.id), detail: String((ITEM[s.id] as any)?.text || ''), price: s.price, why: forgeProblem(g, c, i), action: { type: 'run/forge', charId, slot: i } }));
    const f = fitOf(g, c); if (f) out.push({ group: 'fit', key: 'fit', label: 'Armour class ' + c.armourClass + ' to ' + f.cls, detail: 'Fitted by the armourer.', price: f.price, why: f.why, action: { type: 'run/fit', charId } });
  }
  if (k === 'rest' || k === 'training') {
    const am: any = k === 'training' ? TRAINING : TRAIN, price = trainPrice(g, c);
    for (const w of carriedWeapons(c)) out.push({ group: 'train', key: 'drill:' + w, label: 'Drill +' + am.drill + ' with the ' + nameOf(w), detail: 'Drill toward the weapon\'s next mark.', price, why: trainProblem(g, c, { train: 'drill', weapon: w }), action: { type: 'run/train', charId, train: 'drill', weapon: w } });
    out.push({ group: 'train', key: 'study', label: 'Study +' + am.study, detail: 'Toward the next Sigil word.', price, why: trainProblem(g, c, { train: 'study' }), action: { type: 'run/train', charId, train: 'study' } });
    out.push({ group: 'train', key: 'practice', label: 'Practice +' + am.practice, detail: 'Toward the next Outburst module.', price, why: trainProblem(g, c, { train: 'practice' }), action: { type: 'run/train', charId, train: 'practice' } });
    if (k === 'rest') out.push({ group: 'train', key: 'devotion', label: 'Devotion +' + am.devotion + ' XP', detail: 'Prayer by the fire.', price: 0, why: trainProblem(g, c, { train: 'devotion' }), action: { type: 'run/train', charId, train: 'devotion' } });
  }
  if (k === 'shrine') {
    const p = FAITH_PATRON[h.v.patron || ''], tok = tokenFor(g, c);
    out.push({ group: 'shrine', key: 'rite', label: 'Keep a rite: Devotion +' + DEVOTION_XP.rite + ' XP', detail: 'For the faithful.', price: 0, why: shrineProblem(g, c, 'rite'), action: { type: 'run/shrine', charId, choice: 'rite' } });
    out.push({ group: 'shrine', key: 'piece', label: 'A piece of ' + (p?.name || 'the patron') + '\'s lore', detail: 'For the faithless: the next of its Hymns, prayed by dice.', price: 0, why: shrineProblem(g, c, 'piece'), action: { type: 'run/shrine', charId, choice: 'piece' } });
    out.push({ group: 'shrine', key: 'token', label: 'The token' + (tok ? ': ' + relicRow(tok)!.name : ''), detail: tok ? relicRow(tok)!.text + ' Worth ' + worthOf(tok) + ' of ' + BOON_CAP + '; ' + capRoom(c) + ' left.' : 'A small blessing for the run.', price: 0, why: shrineProblem(g, c, 'token'), action: { type: 'run/shrine', charId, choice: 'token' } });
  }
  if (k === 'event') for (const id of h.v.trades || []) {
    const t = TRADE[id];
    const one = (key: string, label: string, extra: Partial<Extract<ProgressAction, { type: 'run/trade' }>>, detail = t.text) => out.push({ group: 'trade', key: id + ':' + key, label, detail, price: tradePrice(c, { trade: id, ...extra }), why: tradeProblem(g, c, { trade: id, ...extra }), action: { type: 'run/trade', charId, trade: id, ...extra } });
    if (t.do === 'grade') for (const where of wheres) { const it = gearAt(c, where); if (it && maxDurOf(it.id, it.rarity) && nextGrade(it.rarity) && nextGrade(it.rarity) !== 'relic') one(String(where), t.name + ': ' + nameOf(it.id) + ' to ' + word(nextGrade(it.rarity)!), { where }); }
    else if (t.do === 'drill') for (const w of carriedWeapons(c)) one(w, t.name + ': drill +' + t.drill + ' with the ' + nameOf(w), { weapon: w });
    else if (t.do === 'wayside') for (const tr of ['devotion', 'study', 'practice'] as const) one(tr, t.name + ': ' + tr + ' +' + t[tr], { train: tr });
    else if (t.do === 'salvage') packOf(c).forEach((it, i) => { const n = salvageWorth(c, i, t.rate); if (n != null) one(String(i), t.name + ': the ' + it.name + ' for ' + n, { pick: i }); });
    else if (t.do === 'graft') { const gid = graftFor(g, c); one('x', t.name + (gid ? ': ' + relicRow(gid)!.name : ''), {}, gid ? relicRow(gid)!.text : t.text); }
    else one('x', t.name, {});
  }
  return out;
}
/** The pick of kit waiting for a character (an Elite's, a cache's), as options to send (rules 1.43, rule 41). */
export function lastingOptions(g: GameState, charId: string): RunOption[] {
  const l = g.run?.lasting?.[charId]; if (!l) return [];
  return [...l.items.map((x, i) => ({ group: 'lasting' as const, key: 'take:' + i, label: nameOf(x.id), detail: String((ITEM[x.id] as any)?.text || (WEAPON[x.id] as any)?.text || ''), price: 0, why: null, action: { type: 'run/take' as const, charId, choice: i } })),
    { group: 'lasting' as const, key: 'take:none', label: 'Leave it', detail: '', price: 0, why: null, action: { type: 'run/take' as const, charId, choice: 'none' as const } }];
}

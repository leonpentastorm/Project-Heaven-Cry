// @ts-nocheck (a measuring tool, like the rest of test/balance)
// SURVIVAL, SIMULATED RUNS (docs/design/survival-spec.md section 5.6 and section 10 row 9; rules 1.49): a party plays a
// whole Survival run through the one reducer, as players would, and the run is measured. Nothing here decides a rule:
// every node, fight, price, pick and gain is the engine's (run/start, run/move, the fights by the balance simulator's
// policies through Rec.fight, run/pick, run/take, run/buy, run/sell, run/repair, run/upgrade, run/forge, run/fit, run/train,
// run/shrine, run/trade, run/boon, run/tile, levelup/*, gear/*). What is the simulator's is only the players' choices:
//
//   points    every level's Skill and Attribute points by the build's plan, the class the rules give at level 3, perk
//             steps by the build's preference (builds.ts spendLevel, the reference builds' own levelling);
//   fights    the build's fight policy (policies.ts; the healer's below), which uses the class's moves where it can;
//   lanes     where the way forks, the lane whose stretch ahead (to its next junction) scores best for the route policy:
//               gear      Elites, Forges and caches first (the vault taken);
//               training  training grounds, shrines and rests first (the vault passed by);
//               safest    rests and shops first, fewest fights (the vault passed by);
//             any of them: a party under 55% HP takes the stretch with the nearest rest;
//   spending  section 11.5, in order, at each shop and Forge: a repair (rules 1.50) of every carried thing that is Worn
//             or Broken (wearState: at the data's worn share or less), when affordable, before anything else (SIM_REPAIR=0
//             turns it off, for the before-and-after); the counter's upkeep (rounds or magazines to 5 magazines'
//             worth for the gun in hand, cores to 4 for a Sigil or Figment user, class restocks); one grade step on the
//             door's item (the gun in hand, else the focus) when affordable, at a Forge if one is still ahead this
//             stage, else at the shop; the next armour class at a Forge in stages 1 and 2; a mod for a free slot, the
//             cheapest first; a worn piece for an empty slot; from stage 3, nothing but upkeep until the Relic step is
//             paid (a Forge). Rests: the small training for its door; training grounds: the big one, a second when the
//             purse holds more than a grade step; shrines: the token when it fits the cap, else the rite, else the piece;
//             Crossroads: the off-books step when it can't afford a step this stage, else walk on.
//   picks     a weapon that is the door's item graded higher (the same id, or the same category at no lower price),
//             taken and put in that hand (the old one sold at the next shop); a gun only for one of the same calibre
//             whose magazine is no smaller (so the ammunition it carries still feeds it); else the credits. An Elite's or cache's
//             kit: a mod for a free slot or a better worn piece, fitted; else nothing. Boons: the most worth that fits.
//
// P2 (build plan 0.29, the lead's rule "no number refitted before the simulator makes and sells materials and uses
// mods"): the players' choices added on 0.28.1's rules, every one through the reducer's own actions:
//   the field   after a won fight each character walks to every pile on the field (world/act move, the engine's
//               own path and AP, free there) and picks it up whole (world/act pickup): its dropped magazines and what
//               the foes left; then everyone marks Leave (cfg.pickup false, SIM_PICKUP=0: it leaves at once, as before);
//   making      whenever no fight is on, every recipe of the make view (makeView, gear/make) whose gives feed what it
//               carries: rounds of a calibre a gun in hand fires, cores for a core user, as many times as it can;
//               loose rounds then go into the magazines (gear/load), and an empty magazine is bought for rounds
//               that have nowhere to go;
//   the maker   at a shop, the ammo maker is bought when it pays: the rounds the materials held and the next ten
//               fights' materials (at this character's own rate so far) would make, at the shop's round price, are
//               worth its price, and the purse keeps a reserve after it;
//   selling     at a shop, before buying: weapons in the pack, magazines and rounds no gun it carries takes,
//               gunpowder and casings without a maker (and none worth buying), mana residue for a character that
//               makes no cores (run/sell, the one sell rule);
//   reloads     speed (the policies' default: the magazine drops, the field brings it back) or tactical for the
//               members whose policy says so (run-policies.ts tactical);
//   the camp    a member may name a free weapon other than the Recommended one (`camp`): the Recommended loadout,
//               then that weapon, then its cheapest ammunition while the budget pays.
// Measured besides (P2): each stop entered (stage, depth, levels, HP, rounds, cores), each fight's template, damage
// dealt as the effects stream says it (uncapped) beside the HP it removed (overkill apart), materials got, made and
// sold, and credits by what they bought.
//
// What a run measures (RunResult): where it ended, every fight (stage, depth, kind, rounds, won, HP and rounds of
// ammunition carried before it), each stage's credits earned and spent, XP and level, grade steps, the vault.
import { apply, reachable, runNode, runOptions, lastingFor, creditsOf, packOf, gearAt, wearAt, WEAPON, ITEM, pendingPerkSteps, maxHp,
  counterLines, linePrice, restockRoom, sellValue, gradePrice, nextGrade, GRADE_UP, relicRow, worthOf, capRoom, boonProblem, BOONS, alive, isStartBoon, lineOf, startOffer,
  dist, standable, zoneMap, makeView, priceOf, ROUND_PRICE, RECIPES, coresCarried, loadoutLines, holds, gearEntry, equip, hasTag, tagOf } from '../../src';
import { fxTaps } from '../../src/fxtap';
import { allPendingDoorPicks } from '../../src/doorpicks';
import { perkActionsFor } from '../../src';
import svJ from '../../../../data/survival.json';
import { RIG } from './run-policies';
import { Rec, type Pc } from '../helpers/replay';
import { survivalRoom, ownerOf } from '../helpers/survival';
import { BUILD, spendLevel } from './builds';
import { POLICIES, outburst, type Policy } from './policies';
import { obHeal } from './heal-measure';

// ---------------------------------------------------------------------------------------------- the healer
/** A Soul healer (the outburst build's sheet; every Soul caster starts with the Mend design): a held Outburst is played
 * out by the policy that began it; else Mend on an ally under the heal policy's threshold, else the Heart Bolt. */
export const healer: Policy = (x) => {
  const m = x.u.mg, held = m?.held ? m.designs.find((q: any) => q.id === m.held.design) : null;
  const rel = (aim: string): any => (x.banned.has(JSON.stringify({ type: 'combat/release', aim })) ? null : { action: { type: 'combat/release', aim }, kind: 'spell', label: 'Release', seq: 'end' });
  // a held Mend whose ally is out of sight goes on the healer itself, not held for ever
  if (held) return held.school === 'buff' ? obHeal(x) || (x.u.ap >= 1 ? rel(x.u.pos) : null) : outburst(x);
  return obHeal(x) || outburst(x);
};
Object.assign(POLICIES, { healer });

// ---------------------------------------------------------------------------------------------- the squads
export type RoutePolicy = 'gear' | 'training' | 'safest' | 'fights';
/** Rules 1.51 (survival-spec 13.7): the levers of the measure, each on unless SIM_LEVERS names the ones on (a comma
 * list; "none" for rules 1.50's run): `policies` the run's caster policies (run-policies.ts), `supply` the supply pack's
 * cores back by what was burnt and its MP share (off: cores_max = cores and mp_share 0, as before), `start` the starting
 * boon (off: taken off again after the camp), `caster` the caster boons after a Boss (off: never picked). Flux to 0
 * after a fight and the charge at a Rest are the engine's and always on. (The review: the camp's free armour, the old
 * `issue` lever, is gone: armour is bought at the camp from the loadout's budget, rules 1.52.) */
export const LEVERS = ['policies', 'supply', 'start', 'caster'];
/** Rules 1.64 (the K5 measure): the story heals used between stops, and the refusals met, under SIM_STORY_HEAL=1. */
export const STORY_HEALS = { n: 0, refused: [] as string[] };
const leversOn = (): Set<string> => { const e = (globalThis as any).process?.env?.SIM_LEVERS; return new Set(e == null || e === '' ? LEVERS : e === 'none' ? [] : String(e).split(',')); };
/** A member of a simulated party: a reference build at level 1, played by its fight policy (or the one named). With
 * the lever `policies` the casters play the run's policies (rules 1.51); without it, rules 1.49's. */
export const MEMBER_OLD: Record<string, Pc> = {
  gunner: { build: 'plain_gun', level: 1, policy: 'gunner' },
  sigil: { build: 'sigil', level: 1 },
  healer: { build: 'outburst', level: 1, policy: 'healer' },
  outburst: { build: 'outburst', level: 1 },
  faith: { build: 'faith', level: 1 },
  rigger: { build: 'rigger', level: 1 },
};
export const MEMBER: Record<string, Pc> = {
  ...MEMBER_OLD,
  // the lead's ruling R4 (16 Nov 2026): the gunner with the dry-gun fallback (run-policies.ts fallback: reload, a weapon
  // from the pack, a pile's rounds or weapon, the fists), as every run policy has it
  gunner: { build: 'plain_gun', level: 1, policy: 'gunnerRun' },
  sigil: { build: 'sigil', level: 1, policy: 'sigilRun' },
  healer: { build: 'outburst', level: 1, policy: 'healerRun' },
  outburst: { build: 'outburst', level: 1, policy: 'outburstRun' },
  rigger: { build: 'rigger', level: 1, policy: 'rigger' },
  // P2 (0.29): the melee build (Raw Power: the Recommended loadout gives it the heavy blade), and the reload pair on a
  // magazine-fed gun (the camp's Recommended rifle loads round by round, so it drops no magazine)
  melee: { build: 'opt_blade', level: 1, policy: 'optimised' },
  // rules 1.56, the Momentum chain 2.0: the Breaker's cell (the melee build: Strength first, so the Breaker at level 3)
  breaker: { build: 'opt_blade', level: 1, policy: 'optimised' },
  smg: { build: 'plain_gun', level: 1, policy: 'gunner', camp: 'decrkm_smg' } as any,
  smgTac: { build: 'plain_gun', level: 1, policy: 'gunnerTac', camp: 'decrkm_smg' } as any,
  // rules 1.56, the unarmed fighter: the melee build with the camp's free fist weapon (the Hand wraps) instead of a blade
  monk: { build: 'opt_blade', level: 1, policy: 'optimised', camp: 'hand_wraps' } as any,
};
/** The parties measured (section 10 row 9: sizes 1, 2 and 4; gunners, casters and a healer; rules 1.51: every caster
 * alone, and a mixed squad). */
export const PARTIES: Record<string, string[]> = {
  solo_gunner: ['gunner'], solo_sigil: ['sigil'], solo_outburst: ['outburst'], solo_healer: ['healer'], solo_rigger: ['rigger'],
  duo: ['gunner', 'healer'],
  four: ['gunner', 'faith', 'sigil', 'healer'],
  four_casters: ['sigil', 'outburst', 'rigger', 'healer'],
  mixed: ['gunner', 'sigil', 'outburst', 'healer'],
  // P2 (0.29): a gunner, a melee and a caster build alone, in twos and in fours; the reload pair
  solo_melee: ['melee'], duo_gunner: ['gunner', 'gunner'], duo_melee: ['melee', 'melee'], duo_sigil: ['sigil', 'sigil'],
  four_gunner: ['gunner', 'gunner', 'gunner', 'gunner'], four_melee: ['melee', 'melee', 'melee', 'melee'], four_sigil: ['sigil', 'sigil', 'sigil', 'sigil'],
  solo_smg: ['smg'], solo_smg_tac: ['smgTac'],
  // rules 1.56, the Momentum chain 2.0: the Breaker alone and beside a gunner
  solo_breaker: ['breaker'], breaker: ['breaker', 'gunner'],
  solo_monk: ['monk'],
};
/** Rules 1.51: the caster boons (survival.json boons with a caster door), left out of the pick without the lever `caster`. */
const CASTER_DOORS = new Set(['brain_power', 'will_power', 'empathy', 'visualization']);
const casterBoon = (id: string) => { const b: any = BOONS.find((q) => q.id === id); return !!b?.doors && b.doors.every((d: string) => CASTER_DOORS.has(d)); };
/** Rules 1.51 (spec 13.6 (5)): the starting boon a simulated player takes: of its main line's cards (run/stage.ts
 * lineOf), the +1 to hit row, else the damage row, else the first; with none of its main line, the first card. */
export function startPick(offer: string[], c: any): number {
  const main = lineOf(c).main, rows = offer.map((id, i) => ({ i, r: relicRow(id) as any })).filter((q) => (q.r?.lines || []).includes(main));
  const has = (q: any, f: (e: any) => boolean) => (q.r?.effects || []).some(f);
  const k = rows.find((q) => has(q, (e) => e.op === 'roll_mod')) || rows.find((q) => has(q, (e) => e.op === 'damage_mult' && e.when === 'dealing')) || rows[0];
  return k ? k.i : 0;
}

// ---------------------------------------------------------------------------------------------- what is measured
export interface FightRow { /** rules 1.51: Pictures the Rigger policy asked for in it */ figs?: number; stage: number; depth: number; kind: string; rounds: number; won: boolean; hpBefore: number; hpAfter: number; ammo: (number | null)[]; dry: number; broken: number; capped?: boolean; /** P2: the encounter's template; damage dealt (the effects stream, uncapped) and HP removed from the foes; standard cores carried by each character before it */ template?: string; dealt?: number; removed?: number; cores?: number[]; ammoAfter?: (number | null)[]; coresAfter?: number[]; /** P2: cores the focus burnt in the fight (its own count, start less end; null: no core focus) */ burnt?: (number | null)[]; /** rules 1.50: the lowest share of full durability among the squad's main-hand weapons before it, and how many were Worn or Broken */ durMin?: number; wornBefore?: number; /** the composed fight: foes, their tiers and levels, the bulk asked and spent, the HP scale */ foes?: string[]; bulk?: [number, number]; pressure?: [number, number]; scaleHp?: number; level?: number; /** rules 1.54: each character's level before it */ lvl?: number[] }
export interface StageRow { stage: number; setting: string; earned: number[]; spent: number[]; /** of earned: the credits taken instead of a weapon pick, and sales */ instead: number[]; sold: number[]; xp: number[]; level: number[]; steps: number[]; grades: string[]; cleared: boolean; nodes: string[]; vault: 'taken' | 'skipped' | 'none'; vaultPick: string | null; rests: number; shops: number; forges: number; /** rules 1.50: repairs bought, and their credits, a character */ repairs?: number[]; repairSpent?: number[];
  /** P2: materials got (picks, field) / made into / sold, a character: {item: n}; rounds and cores made; credits spent by action type; pickups on the field */
  got?: Record<string, number>[]; made?: Record<string, number>[]; soldMat?: Record<string, number>[]; spentOn?: Record<string, number>; earnedOn?: Record<string, number>; makers?: number; pickups?: number; fieldMags?: number }
/** P2: a stop entered (after the move, before what is there): its stage and depth (1 to 15, the Boss at 15), kind, each character's level, the squad's HP share, rounds for the gun in hand and standard cores carried, each character. */
export interface StopRow { stage: number; depth: number; kind: string; lvl: number[]; hp: number; hpEach: number[]; rounds: (number | null)[]; cores: number[] }
export interface RunResult { party: string; route: RoutePolicy; seed: string; how: string; stage: number; depth: number; cleared: number; fights: FightRow[]; stages: StageRow[]; errors: string[]; boons: string[][]; /** rules 1.51: each character's starting boon, and the levers on */ start?: (string | null)[]; levers?: string[]; /** P2 */ stops?: StopRow[]; members?: string[]; camp?: { credits: number[]; rounds: (number | null)[]; cores: number[]; armour: number[] } }

const RANK = ['standard', 'fine', 'masterwork', 'relic', 'celestial'];
const rankOf = (r: string) => RANK.indexOf(r || 'standard');
/** Where a character's door item is: a caster's focus in the off hand, else the gun or blade in the main hand. */
const doorWhere = (c: any): 'main' | 'off' => { const off = c.offHand?.id; return off && hasTag(off, 'kind:focus') ? 'off' : 'main'; };
/** Rounds carried for the gun in the main hand (loaded, in magazines, loose), or null for no magazine gun. */
export function roundsFor(c: any): number | null {
  if (!c) return null; // a character the run no longer holds
  const w: any = WEAPON[c.weapon]; if (!w?.magazine || !w.ammo) return null;
  let n = c.loaded || 0;
  for (const it of packOf(c)) { if (it.mags && it.weapon === c.weapon) n += it.mags.reduce((t: number, q: number) => t + q, 0); else if (w.reload === 'loose' && it.calibre === w.ammo) n += it.qty || 0; } // a magazine gun fires what is in its magazines (loose rounds load into them out of a fight)
  return n;
}
const hpShare = (g: any) => { const cs = Object.values(g.characters) as any[]; return cs.reduce((t, c) => t + Math.max(0, c.hp) / maxHp(c), 0) / cs.length; };

// ---------------------------------------------------------------------------------------------- the map
/** The stretch ahead from a node: it and the nodes after it while the way does not fork (a lane to its next junction). */
function stretch(run: any, id: string): any[] {
  const out: any[] = []; let n = runNode(run, id);
  for (let i = 0; n && i < 15; i++) { out.push(n); if (n.links.length !== 1 || n.kind === 'boss') break; n = runNode(run, n.links[0]); }
  return out;
}
/** Every node still ahead of a node (all routes; the vault's spur left out). */
function ahead(run: any, id: string | null): Set<string> {
  const seen = new Set<string>(), todo = id ? [...(runNode(run, id)?.links || [])] : run.nodes.filter((n: any) => n.depth === 1).map((n: any) => n.id);
  while (todo.length) { const k = todo.pop()!; if (seen.has(k)) continue; seen.add(k); const n = runNode(run, k); if (n && !n.spur) todo.push(...n.links); }
  return seen;
}
const SCORE: Record<RoutePolicy, Record<string, number>> = {
  gear: { elite: 3, forge: 3, cache: 2.5, shop: 1, fight: 1, rest: 0.5, training: 0.3, shrine: 0.3, event: 0.5 },
  training: { training: 3, shrine: 2, rest: 1.5, forge: 1, shop: 0.5, fight: 0.3, event: 0.5, cache: 0.5, elite: -1 },
  safest: { rest: 3, shop: 2, forge: 0.5, cache: 0.5, training: 0.5, shrine: 0.5, event: 0.3, fight: -1, elite: -3 },
  // P2 (0.29): the most-fights route (rules 1.54 item 9, Leon: "if your whole first run you focus on taking as many
  // fight as possible"): fights and Elites first, the vault's guard taken, no detour to a rest when hurt
  fights: { fight: 3, elite: 3, cache: 0.3, shop: 0.2, forge: 0.2, rest: 0.1, training: 0.1, shrine: 0.1, event: 0.1 },
};
/** The node to take where the way forks. */
function chooseNode(g: any, route: RoutePolicy): any {
  const run = g.run, can = reachable(run); if (can.length <= 1) return can[0] || null;
  const hurt = route !== 'fights' && hpShare(g) < 0.55;
  let best: any = null, bestV = -Infinity;
  for (const n of can) {
    if (n.kind === 'vault_guard') { if ((route === 'gear' || route === 'fights') && !hurt) return n; continue; }
    const s = stretch(run, n.id); let v = 0;
    s.forEach((q, i) => { v += (SCORE[route][q.kind] ?? 0) * (1 - i * 0.12); if (hurt && q.kind === 'rest') v += 6 - i; });
    v /= Math.max(1, s.length * 0.5);
    if (v > bestV) { bestV = v; best = n; }
  }
  return best || can[0];
}

// ---------------------------------------------------------------------------------------------- the damage tap
/** P2 (Balance 2.0 section 6 fix 4): damage dealt to the foes as the effects stream reports it (a shot's or blow's
 * damage, a hurt; not cut at the target's last HP), summed while a run's fight is played; set against the HP the foes
 * lost, the rest is overkill. */
// the effect itself is kept (a shot's damage is written on it after it is emitted, as run/tally.ts says) and read when
// the fight is over
const TAP: { on: boolean; evs: any[] } = { on: false, evs: [] };
if (!(fxTaps as any).__survivalRun) { (fxTaps as any).__survivalRun = true; fxTaps.push((_cb: any, ev: any) => { if (TAP.on && ev && ev.target && (ev.k === 'shot' || ev.k === 'melee' || ev.k === 'hurt')) TAP.evs.push(ev); }); }
const tapDealt = (cb: any): number => { const foe = new Set((cb?.units || []).filter((u: any) => u.side !== 'pc' && !u.companion).map((u: any) => u.id));
  return TAP.evs.reduce((t, ev) => t + (foe.has(ev.target) ? ((ev.k === 'hurt' || ev.hit) ? Math.max(0, ev.dmg || 0) : 0) : 0), 0); };
// Rules 1.92 item 8042 (Items 2.0 lane A5): the simulator reads the run's own data and item tags, never an item id. The
// materials are the run's reward materials (survival.json rewards.materials), in their order; the round maker is the tool
// of the recipes that make rounds, and the round materials what they need; the core and its materials are the recipe a
// focus presses (data/recipes.json).
const MATS: string[] = ((svJ as any).rewards.materials.items as any[]).map((x) => x.item);
const ROUND_RECIPE: any = RECIPES.find((q: any) => q.tool.item && q.gives.some((g: any) => String(g.item).startsWith('rounds:')));
const MAKER: string = ROUND_RECIPE.tool.item, ROUND_MATS = new Set<string>(ROUND_RECIPE.needs.map((l: any) => l.item));
const CORE_RECIPE: any = RECIPES.find((q: any) => q.tool.focus), CORE: string = CORE_RECIPE.gives[0].item, CORE_MATS = new Set<string>(CORE_RECIPE.needs.map((l: any) => l.item));
const matsOf = (c: any): Record<string, number> => { const o: Record<string, number> = {}; for (const m of MATS) o[m] = packOf(c).filter((x: any) => (x.item || x.id) === m).reduce((t: number, x: any) => t + (x.qty || 0), 0); return o; };
const addTo = (a: Record<string, number>, b: Record<string, number>, sign = 1) => { for (const [k, v] of Object.entries(b)) if (v) a[k] = (a[k] || 0) + sign * v; };
/** The guns in a character's hands that fire rounds (main, off). */
const gunsHeld = (c: any): string[] => [c.weapon, c.offHand?.id].filter((w: any) => !!w && !!(WEAPON[w] as any)?.ammo);

// ---------------------------------------------------------------------------------------------- the run
export interface RunCfg { /** rules 1.90: how the squad goes into a fight node: 'walk' (default; SIM_ENGAGE) or 'ambush' (always try) */ engage?: 'walk' | 'ambush'; /** P2: walk the field and pick up (default on; SIM_PICKUP=0 off) */ pickup?: boolean; /** P2: make rounds and cores, buy the maker, sell (default on; SIM_MAKE=0 off) */ make?: boolean; party: string; route: RoutePolicy; seed: string; maxStages?: number; maxFightRounds?: number; /** rules 1.50: buy repairs (default on; SIM_REPAIR=0 in the measure turns it off) */ repair?: boolean; /** rules 1.51: the levers on (default: SIM_LEVERS, else all) */ levers?: string[] }
export function simRun(cfg: RunCfg): RunResult {
  const L = cfg.levers ? new Set(cfg.levers) : leversOn(), AP: any = (svJ as any).ammo_pack, was = { cores_max: AP.cores_max, mp_share: AP.mp_share };
  if (!L.has('supply')) { AP.cores_max = AP.cores; AP.mp_share = 0; }
  try { return simRunWith(cfg, L); } finally { AP.cores_max = was.cores_max; AP.mp_share = was.mp_share; }
}
function simRunWith(cfg: RunCfg, L: Set<string>): RunResult {
  const names = PARTIES[cfg.party], M = L.has('policies') ? MEMBER : MEMBER_OLD, pcs: Pc[] = names.map((m) => M[m]), n = pcs.length, maxStages = cfg.maxStages ?? 7;
  const r = new Rec(survivalRoom(cfg.seed, pcs, { test: true }), pcs);
  // every action, the fights' own included, goes through Rec.act: the refusals kept for a stalled fight's report, the
  // credits it moved counted to the stage (earned, of which instead of a pick and sales; or spent)
  const refusals: string[] = []; { const a0 = r.act.bind(r); r.act = (a: any, who?: string) => { const was = st ? credits() : null, e = a0(a, who); if (e) { refusals.push(a.type + (a.id ? ' ' + a.id : '') + ': ' + e); if (refusals.length > 12) refusals.shift(); }
    if (was) credits().forEach((v, i) => { const d = v - was[i]; if (d > 0) { st.earned[i] += d; st.earnedOn![a.type] = (st.earnedOn![a.type] || 0) + d; if (a.type === 'run/pick') st.instead[i] += d; if (a.type === 'run/sell') st.sold[i] += d; } else if (d < 0) { st.spent[i] -= d; const k = a.type === 'run/buy' ? 'run/buy ' + String(a.key).replace(/^(guns:rounds|mag|restock|stock):.*$/, '$1') : a.type; st.spentOn![k] = (st.spentOn![k] || 0) - d; } }); return e; }; }
  const ids = pcs.map((_, i) => 'c' + (i + 1)), C = (id: string) => r.g.characters[id], by = (id: string) => ownerOf(ids.indexOf(id));
  const res: RunResult = { party: cfg.party, route: cfg.route, seed: cfg.seed, how: 'running', stage: 1, depth: 0, cleared: 0, fights: [], stages: [], errors: r.errors, boons: [], levers: [...L], stops: [], members: names };
  const env = (globalThis as any).process?.env || {}, PICKUP = cfg.pickup ?? env.SIM_PICKUP !== '0', MAKE = cfg.make ?? env.SIM_MAKE !== '0';
  const credits = () => ids.map((id) => creditsOf(C(id)));
  let st: StageRow; const stepsAt: Record<string, number> = {};
  const newStage = () => { st = { stage: r.g.run?.stage || 1, setting: r.g.run?.world?.[r.g.run.world.length - 1]?.setting, earned: ids.map(() => 0), spent: ids.map(() => 0), instead: ids.map(() => 0), sold: ids.map(() => 0), xp: [], level: [], steps: ids.map(() => 0), grades: [], cleared: false, nodes: [], vault: 'none', vaultPick: null, rests: 0, shops: 0, forges: 0, repairs: ids.map(() => 0), repairSpent: ids.map(() => 0), got: ids.map(() => ({})), made: ids.map(() => ({})), soldMat: ids.map(() => ({})), spentOn: {}, earnedOn: {}, makers: 0, pickups: 0, fieldMags: 0 }; res.stages.push(st); };
  // rules 1.51, 1.52: the camp's one flow for every member, as a sensible player: the Recommended loadout (Class 1 armour
  // first for every build, casters included), then the starting boon by its line (startPick), then Ready
  r.must({ type: 'run/start', seed: cfg.seed });
  for (const id of ids) {
    r.must({ type: 'run/loadout', charId: id, op: 'recommended' } as any, by(id));
    // P2: a member's own free weapon (`camp`), then its cheapest ammunition while the budget pays
    const camp = (pcs[ids.indexOf(id)] as any).camp;
    if (camp) { r.must({ type: 'run/loadout', charId: id, op: 'pick', slot: 'weapon', id: camp } as any, by(id));
      const w: any = WEAPON[camp];
      for (let k = 0; k < 12; k++) { const l = loadoutLines(C(id), r.g.run.loadout[id].take).filter((q: any) => q.id === 'rounds:' + w.ammo || q.id === 'mag:' + camp).sort((a: any, b: any) => a.price - b.price)[0];
        if (!l || r.act({ type: 'run/loadout', charId: id, op: 'take', key: l.key } as any, by(id))) break; } }
    const offer = startOffer(C(id), cfg.seed); if (offer.length) r.must({ type: 'run/boon', charId: id, choice: startPick(offer, C(id)) }, by(id));
  }
  for (const id of ids) if (r.g.run?.state === 'loadout') r.must({ type: 'run/ready' } as any, by(id));
  // rules 1.59 (the tank measure): a member's `hands` ({main?, off?}: weapon ids) are put in its hands after the camp,
  // outside the reducer (a measure, not a replay: the camp's budget could not buy a second shield), through the sheet's
  // own equip; what was in the hand goes to the pack
  for (const id of ids) { const h = (pcs[ids.indexOf(id)] as any).hands as Record<string, string> | undefined; if (!h) continue;
    for (const to of ['main', 'off'] as const) { const wid = h[to]; if (!wid) continue; const c = C(id), e = gearEntry(wid); if (!e) continue;
      c.pack = [...packOf(c), e]; const no = equip(c, c.pack.length - 1, to); if (no) res.errors.push('hands ' + to + ' ' + wid + ': ' + no); } }
  // rules 1.60 (the beta feeds, measured): a member's `skills` ({id: points}) are set on the sheet after the camp, outside
  // the reducer (a measure, not a replay: Pain Threshold 1 against 7 on the same Living Wall)
  for (const id of ids) { const s = (pcs[ids.indexOf(id)] as any).skills as Record<string, number> | undefined; if (s) C(id).skills = { ...C(id).skills, ...s }; }
  if (!L.has('start')) for (const id of ids) C(id).relics = (C(id).relics || []).filter((x: string) => !isStartBoon(x)); // the lever off: as if there were none (outside the reducer: a measure, not a replay)
  // survival-spec 13.7's forced cell: SIM_START_FORCE names the starting boon every character carries (a measure: so no
  // row dominates its line), put in place of the one picked, outside the reducer
  { const force = (globalThis as any).process?.env?.SIM_START_FORCE;
    if (force && L.has('start')) for (const id of ids) C(id).relics = [...(C(id).relics || []).filter((x: string) => !isStartBoon(x)), force]; }
  res.start = ids.map((id) => (C(id).relics || []).find(isStartBoon) || null);
  res.camp = { credits: ids.map((id) => creditsOf(C(id))), rounds: ids.map((id) => roundsFor(C(id))), cores: ids.map((id) => coresCarried(C(id))), armour: ids.map((id) => C(id).armourClass || 0) };
  newStage();
  // every action through Rec, the credits it moved counted to the stage (earned or spent)
  const act = (a: any, who = 'host') => r.act(a, who);
  const must = (a: any, who = 'host') => { const e = act(a, who); if (e) r.errors.push(a.type + ': ' + e); return e; };
  const opts = (id: string) => runOptions(r.g, id);
  const sell = { pending: {} as Record<string, string[]> };
  const coreUser = (id: string) => ['sigil', 'rigger'].includes(pcs[ids.indexOf(id)].build);
  /** P2: what a character got of the materials, fights won (its rate of materials a fight, for the maker's worth). */
  const gotAll: Record<string, Record<string, number>> = Object.fromEntries(ids.map((id) => [id, {}])), wonN = { n: 0 };
  const noteGot = (id: string, before: Record<string, number>) => { const d: Record<string, number> = {}, now = matsOf(C(id)); for (const m of MATS) if (now[m] > before[m]) d[m] = now[m] - before[m]; addTo(st.got![ids.indexOf(id)], d); addTo(gotAll[id], d); };

  // ---- P2: making (gear/make through the make view): rounds for the guns in hand, cores for a core user
  const makeAll = (id: string) => {
    if (!MAKE) return; const c = C(id); if (!c || c.dead || c.hp <= 0) return;
    const want = new Set([...gunsHeld(c).map((w) => 'rounds:' + (WEAPON[w] as any).ammo), ...(coreUser(id) ? [CORE] : [])]);
    for (const row of makeView(r.g, by(id), id)?.rows || []) {
      if (!(row.most > 0) || row.why || !row.gives.some((q: any) => want.has(q.item))) continue;
      const was = matsOf(C(id));
      if (!act({ ...row.action, times: row.most }, by(id))) { const now = matsOf(C(id)), i = ids.indexOf(id);
        for (const m of MATS) if (was[m] > now[m]) st.made![i][m + ' used'] = (st.made![i][m + ' used'] || 0) + was[m] - now[m];
        for (const q of row.gives) st.made![i][q.item] = (st.made![i][q.item] || 0) + q.n * row.most; }
    }
    act({ type: 'gear/load', charId: id }, by(id));
  };
  /** P2: the ammo maker pays (survival-run.ts header): the rounds the materials held and the next ten fights' would make. */
  const makerPays = (id: string): boolean => {
    const c = C(id), w: any = WEAPON[c.weapon]; if (!w?.ammo) return false;
    const rec = RECIPES.find((q: any) => q.tool.item === MAKER && q.gives.some((g: any) => g.item === 'rounds:' + w.ammo)); if (!rec) return false;
    const have = matsOf(c), times = (m: Record<string, number>) => Math.min(...rec.needs.map((l: any) => (m[l.item] || 0) / l.n));
    const ahead = 10 * times(gotAll[id]) / Math.max(1, wonN.n), give = rec.gives.find((g: any) => g.item === 'rounds:' + w.ammo).n;
    return (Math.floor(times(have)) + ahead) * give * (ROUND_PRICE[w.ammo] || 0) >= (priceOf(MAKER) || Infinity);
  };
  const hasMaker = (id: string) => holds(C(id), { slot: 'person', item: MAKER });
  /** P2: sell what the character cannot use (survival-run.ts header), from the end of the pack so the indices hold. */
  const sellJunk = (id: string) => {
    if (!MAKE) return; const keepMats = hasMaker(id) || makerPays(id), guns = new Set(gunsHeld(C(id))), cals = new Set([...guns].map((w) => (WEAPON[w] as any).ammo));
    for (let i = packOf(C(id)).length - 1; i >= 0; i--) {
      const x: any = packOf(C(id))[i], it = x.item || x.id;
      const junk = (x.weapon && !x.mags && !guns.has(x.weapon) && !hasTag(x.weapon, 'kind:thrown')) || (x.mags && !guns.has(x.weapon)) || (x.calibre && !cals.has(x.calibre))
        || (ROUND_MATS.has(it) && !keepMats) || (CORE_MATS.has(it) && !ROUND_MATS.has(it) && !coreUser(id));
      if (!junk || !(sellValue(x) > 0)) continue;
      const q = x.mags ? x.mags.length : x.qty;
      if (!act({ type: 'run/sell', charId: id, idx: i, qty: q }, by(id)) && MATS.includes(it)) st.soldMat![ids.indexOf(id)][it] = (st.soldMat![ids.indexOf(id)][it] || 0) + q;
    }
  };
  // ---- rules 1.64 items 5000, 5001 (the measure of K5): between stops, a member with the Mender's story Triage or Field
  // Surgeon's Patch uses it on the most hurt squadmate under STORY_HEAL_AT of max HP, through the reducer (story/perk)
  const STORY_HEAL = env.SIM_STORY_HEAL === '1', STORY_HEAL_AT = 0.7;
  const storyHeal = (id: string) => {
    const c = C(id); if (!c || c.dead || c.hp <= 0) return;
    for (const e of perkActionsFor({ c, g: r.g } as any, 'story').filter((q: any) => !q.why && (q.actionId === 'triage_story' || q.actionId === 'patch'))) {
      const t = ids.filter((o) => o !== id && C(o) && !C(o).dead && C(o).hp > 0 && C(o).hp < STORY_HEAL_AT * maxHp(C(o))).sort((a, b) => C(a).hp / maxHp(C(a)) - C(b).hp / maxHp(C(b)))[0];
      if (!t) return;
      const no = act({ type: 'story/perk', charId: id, id: (e as any).id, actionId: (e as any).actionId, choice: t }, by(id)); if (!no) STORY_HEALS.n++; else STORY_HEALS.refused.push(no);
    }
  };
  // ---- P2: the field after a won fight: every pile walked to and picked up whole, then Leave
  const fieldWalk = () => {
    if (!PICKUP) return;
    for (const id of ids) {
      const c = C(id); if (!c || c.dead || c.hp <= 0) continue;
      const before = matsOf(c), magsBefore = packOf(c).filter((x: any) => x.mags).reduce((t: number, x: any) => t + x.mags.length, 0), skip = new Set<string>();
      for (let k = 0; k < 60 && r.g.run?.state === 'field'; k++) {
        const pos = r.g.story.positions?.[id]; if (!pos) break;
        const pile = (r.g.story.objects || []).filter((o: any) => o.kind === 'pile' && !o.hidden && (o.items || []).length && !skip.has(o.id)).sort((a: any, b: any) => dist(pos, a.pos) - dist(pos, b.pos))[0];
        if (!pile) break;
        if (dist(pos, pile.pos) <= 1) { if (act({ type: 'world/act', charId: id, act: 'pickup', objId: pile.id }, by(id))) skip.add(pile.id); else st.pickups!++; continue; }
        // a walk toward it: the free tile nearest it within 6 tiles, the farthest the engine accepts (its own path and AP)
        const map = zoneMap(r.g), taken = new Set(Object.values(r.g.story.positions || {})), [x0, y0] = pos.split(',').map(Number), tiles: string[] = [];
        for (let dx = -6; dx <= 6; dx++) for (let dy = -6; dy <= 6; dy++) { const t = (x0 + dx) + ',' + (y0 + dy); if (t !== pos && standable(map, t) && !taken.has(t)) tiles.push(t); }
        tiles.sort((a, b) => dist(a, pile.pos) - dist(b, pile.pos) || dist(pos, a) - dist(pos, b));
        let moved = false; for (const t of tiles.slice(0, 10)) { if (dist(t, pile.pos) >= dist(pos, pile.pos)) break; if (!act({ type: 'world/act', charId: id, act: 'move', to: t, how: 'move' }, by(id))) { moved = true; break; } }
        if (!moved) skip.add(pile.id);
      }
      noteGot(id, before); st.fieldMags! += Math.max(0, packOf(C(id)).filter((x: any) => x.mags).reduce((t: number, x: any) => t + x.mags.length, 0) - magsBefore);
    }
  };

  const levelUp = () => { for (const id of ids) { const c = C(id), def = BUILD[pcs[ids.indexOf(id)].build];
    if (!(c.unspent?.skill > 0 || c.unspent?.attr > 0 || (c.level >= 3 && !c.classId) || pendingPerkSteps(c).length || allPendingDoorPicks(c).length)) continue;
    try { spendLevel(def, pcs[ids.indexOf(id)].variant || 'normal', () => C(id), (a) => act({ charId: id, ...a }, by(id)), c.level); } catch (e: any) { r.errors.push('levelup ' + id + ': ' + e.message); } } };

  // ---- the door item: grade it (shop or Forge), the pick that grades it
  const gradeHere = (id: string, place: 'shop' | 'forge') => {
    const c = C(id), where = doorWhere(c), it = gearAt(c, where); if (!it) return;
    const to = nextGrade(it.rarity); if (!to) return;
    if (to !== 'relic' && place === 'shop' && [...ahead(r.g.run, r.g.run.at)].some((k) => runNode(r.g.run, k)?.kind === 'forge')) return; // a Forge is still ahead this stage
    const o = opts(id).find((q) => (q.group === 'grade' || q.group === 'relic') && q.action.where === where && !q.why && !q.action.chit) || opts(id).find((q) => q.group === 'grade' && q.action.where === where && !q.why);
    if (o && !must(o.action, by(id))) st.steps[ids.indexOf(id)]++;
  };
  const savingForRelic = (id: string) => { const c = C(id), it = gearAt(c, doorWhere(c)); return r.g.run.stage >= GRADE_UP.relic_from_stage && it && it.rarity === 'masterwork'; };
  const fitBought = (id: string, item: string) => { const c = C(id), i = packOf(c).findIndex((x) => (x.item || x.id) === item); if (i < 0) return;
    if (hasTag(item, 'kind:mod')) { if ((ITEM[item] as any).mod_slot === 'enchantment') act({ type: 'gear/mod', charId: id, idx: i }, by(id)); else { const o = opts(id).find((q) => q.group === 'mod' && !q.why && q.action.type === 'run/fit_mod' && q.action.where == null && !q.action.extra && q.action.idx === i); if (o) act(o.action, by(id)); } } /* rules 1.55: the armourer fits it at a Forge, for a fee; picked elsewhere, it waits in the pack */ else act({ type: 'gear/equip', charId: id, idx: i, to: 'worn' }, by(id)); };

  // ---- repairs (rules 1.50): every carried thing Worn or Broken, the hands first, when affordable
  const repairHere = (id: string) => {
    if (cfg.repair === false) return;
    for (const o of opts(id).filter((q) => q.group === 'repair' && q.wear && q.wear.state !== 'sound' && !q.why)) {
      const was = creditsOf(C(id)); if (must(o.action, by(id))) continue;
      st.repairs![ids.indexOf(id)]++; st.repairSpent![ids.indexOf(id)] += was - creditsOf(C(id));
    }
  };
  // ---- the counter: upkeep first (section 11.5)
  const upkeep = (id: string) => {
    // P2: sell what it cannot use, buy the ammo maker when it pays (a reserve of 60 credits kept), make, and an empty
    // magazine for each magazine's worth of loose rounds with nowhere to go
    sellJunk(id);
    if (MAKE && !hasMaker(id) && makerPays(id)) { const l = counterLines([C(id)]).find((q: any) => q.id === MAKER); if (l && creditsOf(C(id)) >= (priceOf(MAKER) || 0) + 60 && !act({ type: 'run/buy', charId: id, key: l.key, qty: 1 }, by(id))) st.makers!++; }
    makeAll(id);
    { const c = C(id), w: any = WEAPON[c.weapon];
      if (MAKE && w?.reload === 'magazine' && w.ammo) for (let k = 0; k < 4; k++) {
        const loose = packOf(C(id)).filter((x: any) => x.calibre === w.ammo && !x.mags).reduce((t: number, x: any) => t + (x.qty || 0), 0);
        const room = packOf(C(id)).filter((x: any) => x.mags && x.weapon === c.weapon).reduce((t: number, x: any) => t + x.mags.reduce((s: number, q: number) => s + (w.magazine - q), 0), 0);
        if (loose - room < w.magazine) break;
        const l = counterLines([C(id)]).find((q: any) => q.key === 'mag:' + c.weapon + ':0'); if (!l || act({ type: 'run/buy', charId: id, key: l.key, qty: 1 }, by(id))) break;
        act({ type: 'gear/load', charId: id }, by(id));
      } }
    const c = C(id), lines = counterLines([c]), w: any = WEAPON[c.weapon];
    // sell what a better pick replaced
    for (const it of sell.pending[id] || []) { const i = packOf(C(id)).findIndex((x) => (x.weapon || x.item || x.id) === it && !x.mags); if (i >= 0 && sellValue(packOf(C(id))[i]) != null) act({ type: 'run/sell', charId: id, idx: i }, by(id)); }
    sell.pending[id] = [];
    act({ type: 'gear/load', charId: id }, by(id));
    if (w?.magazine && w.ammo) { const line = lines.find((l) => l.key === 'mag:' + c.weapon) || lines.find((l) => l.key === 'guns:rounds:' + w.ammo);
      for (let k = 0; line && k < 16 && (roundsFor(C(id)) ?? 0) < Math.max(5 * w.magazine, 120); k++) if (act({ type: 'run/buy', charId: id, key: line.key, qty: 1 }, by(id))) break; }
    if (coreUser(id)) { const have = () => packOf(C(id)).filter((x) => (x.item || x.id) === CORE).reduce((t, x) => t + x.qty, 0), line = lines.find((l) => l.id === CORE);
      for (let k = 0; line && k < 6 && have() < 4; k++) if (act({ type: 'run/buy', charId: id, key: line.key, qty: 1 }, by(id))) break; }
    for (const l of lines.filter((q) => q.res)) { const room = restockRoom(C(id), l.res!); if (room > 0) act({ type: 'run/buy', charId: id, key: l.key, qty: room }, by(id)); }
  };
  const atShop = () => { st.shops++; for (const id of ids) { repairHere(id); upkeep(id); gradeHere(id, 'shop'); } for (let i = 0; i < n && r.g.run?.state === 'shop'; i++) must({ type: 'run/leave' }, ownerOf(i)); };
  const atForge = () => { st.forges++; for (const id of ids) {
    repairHere(id);
    gradeHere(id, 'forge');
    // rules 1.55: the mods picked since the last Forge, fitted now for the fee (a free slot only, no swap)
    for (let k = 0; k < 8; k++) { const c = C(id), used = new Set((c.weaponState?.mods || []).map((m: string) => (ITEM[m] as any)?.mod_slot));
      const o = opts(id).find((q) => q.group === 'mod' && !q.why && q.action.type === 'run/fit_mod' && q.action.where == null && !q.action.extra && !used.has((ITEM[(packOf(c)[q.action.idx].item || packOf(c)[q.action.idx].id)] as any)?.mod_slot)); if (!o || act(o.action, by(id))) break; }
    if (savingForRelic(id)) continue;
    const fit = opts(id).find((q) => q.group === 'fit' && !q.why); if (fit && r.g.run.stage <= 2) must(fit.action, by(id));
    const want = new Set(lastingFor(C(id)));
    const buy = opts(id).filter((q) => q.group === 'forge' && !q.why && want.has(r.g.run.visit.stock[q.action.slot].id)).sort((a, b) => a.price - b.price);
    for (const q of buy) { const item = r.g.run.visit.stock[q.action.slot].id; if (!lastingFor(C(id)).includes(item)) continue; if (!act(q.action, by(id))) fitBought(id, item); }
  } };
  const trainKind = (id: string, rest: boolean) => { const b = pcs[ids.indexOf(id)].build, p = pcs[ids.indexOf(id)].policy;
    if (b === 'sigil') return 'study'; if (b === 'outburst') return 'practice'; if (rest && b === 'faith') return 'devotion'; return 'drill'; };
  const train = (id: string, big: boolean) => { const k = trainKind(id, !big), c = C(id);
    const o = opts(id).find((q) => q.group === 'train' && q.action.train === k && (k !== 'drill' || q.action.weapon === c.weapon) && !q.why) || opts(id).find((q) => q.group === 'train' && !q.why);
    if (o) must(o.action, by(id));
    if (big) { const it = gearAt(C(id), doorWhere(C(id))), to = it && nextGrade(it.rarity), step = to ? gradePrice(to, 'shop') : 0;
      const o2 = opts(id).find((q) => q.group === 'train' && q.action.train === k && !q.why && q.price > 0); if (o2 && creditsOf(C(id)) > step + o2.price) must(o2.action, by(id)); } };
  const atShrine = (id: string) => { for (const k of ['token', 'rite', 'piece']) { const o = opts(id).find((q) => q.group === 'shrine' && q.key === k && !q.why); if (o) { must(o.action, by(id)); return; } } };
  const atEvent = (id: string) => { const c = C(id), where = doorWhere(c), it = gearAt(c, where); if (!it) return; const to = nextGrade(it.rarity); if (!to || to === 'relic') return;
    if (st.steps[ids.indexOf(id)] > 0 || creditsOf(c) >= gradePrice(to, 'forge')) return;
    const o = opts(id).find((q) => q.group === 'trade' && q.action.where === where && !q.why && /offbooks/.test(q.action.trade)); if (o && !must(o.action, by(id))) st.steps[ids.indexOf(id)]++; };

  // ---- picks
  const better = (c: any, w: any) => { const where = doorWhere(c), it = gearAt(c, where); if (!it) return false;
    if (rankOf(w.rarity) <= rankOf(it.rarity)) return false;
    if (w.id === it.id) return true;
    const a: any = WEAPON[w.id] || ITEM[w.id], b: any = WEAPON[it.id] || ITEM[it.id];
    return !!a && !!b && (tagOf(w.id, 'kind') === tagOf(it.id, 'kind')) && (a.price_credits || 0) >= (b.price_credits || 0) && (a.magazine ?? 0) >= (b.magazine ?? 0) && a.ammo === b.ammo && (where === 'off' ? hasTag(w.id, 'kind:focus') : !!WEAPON[w.id]); };
  const picks = () => {
    const run = r.g.run, vault = runNode(run, run.at)?.kind === 'vault';
    for (const id of ids) { const o = r.g.run.offers?.[id]; if (!o) continue; const c = C(id);
      const k = o.weapons.findIndex((w: any) => better(c, w));
      if (k < 0) { const ch = o.materials?.length ? 'materials' : 0; must({ type: 'run/pick', charId: id, choice: ch }, by(id)); if (vault) st.vaultPick = String(ch); continue; } // rules 1.54: the Materials card (credits instead retired); none at the vault's chest: its first weapon
      const w = o.weapons[k], where = doorWhere(c), old = gearAt(c, where)!.id;
      if (must({ type: 'run/pick', charId: id, choice: k }, by(id))) continue;
      if (vault) st.vaultPick = w.rarity + ' ' + w.id;
      const i = packOf(C(id)).findIndex((x) => (x.weapon || x.item || x.id) === w.id && (x.rarity || 'standard') === w.rarity && !x.mags);
      if (i >= 0 && !act({ type: 'gear/equip', charId: id, idx: i, to: where }, by(id))) (sell.pending[id] ||= []).push(old);
    }
    for (const id of ids) { const l = r.g.run.lasting?.[id]; if (!l) continue; const want = new Set(lastingFor(C(id)));
      const k = l.items.findIndex((x: any) => want.has(x.id));
      if (k < 0) { must({ type: 'run/take', charId: id, choice: 'none' }, by(id)); continue; }
      if (!must({ type: 'run/take', charId: id, choice: k }, by(id))) fitBought(id, l.items[k].id); }
  };

  // ---- the loop
  for (let guard = 0; guard < 3000; guard++) {
    const run = r.g.run; if (!run || run.state === 'over' || r.g.phase === 'lobby') break;
    levelUp();
    if (run.state === 'boon') {
      st.cleared = true; res.cleared = run.stage; st.xp = ids.map((id) => C(id).xp); st.level = ids.map((id) => C(id).level);
      st.grades = ids.map((id) => { const c = C(id), it = gearAt(c, doorWhere(c)); return it ? it.rarity : '-'; });
      if (run.stage >= maxStages) { res.how = 'cap'; res.stage = run.stage; res.depth = 15; break; }
      for (const id of ids) { const offer = run.boons?.[id]; if (!offer) continue;
        const ok = offer.map((b: string, i: number) => ({ b, i })).filter((q: any) => !boonProblem(C(id), offer, q.b) && (L.has('caster') || !casterBoon(q.b))).sort((a: any, b: any) => worthOf(b.b) - worthOf(a.b));
        if (ok.length) must({ type: 'run/boon', charId: id, choice: ok[0].i }, by(id)); }
      continue;
    }
    if (run.state === 'tile') { const t = run.tiles[0].id; for (let i = 0; i < n && r.g.run.state === 'tile'; i++) must({ type: 'run/tile', tile: t }, ownerOf(i)); newStage(); continue; }
    if (run.state === 'field') { fieldWalk(); for (let i = 0; i < n && r.g.run.state === 'field'; i++) must({ type: 'run/leave' }, ownerOf(i)); continue; } // rules 1.55: the field (P2: walked and picked up first)
    if (run.state === 'reward') { const was = ids.map((id) => matsOf(C(id))); picks(); ids.forEach((id, i) => noteGot(id, was[i])); for (const id of ids) makeAll(id); for (const id of ids) act({ type: 'gear/load', charId: id }, by(id)); continue; } // P2: the Materials card counted, then making // loose rounds into the magazines (free out of a fight; a refusal: nothing to load)
    if (run.state === 'shop') { atShop(); continue; }
    if (run.state === 'engage') { must({ type: 'run/engage', how: cfg.engage ?? (env.SIM_ENGAGE === 'ambush' ? 'ambush' : 'walk') }); continue; } // rules 1.90: Walk in (default) or always try the ambush
    if (run.state === 'fight') {
      const node = runNode(run, run.at), hp = hpShare(r.g), ammo = ids.map((id) => roundsFor(C(id)));
      const wears = ids.map((id) => wearAt(C(id), 'main')).filter((w: any) => w && w.max > 0) as any[];
      const durMin = wears.length ? Math.min(...wears.map((w) => w.now / w.max)) : null, wornBefore = wears.filter((w) => w.state !== 'sound').length;
      const pic0 = RIG.pictures, lvl = ids.map((id) => C(id)?.level ?? 0), cores = ids.map((id) => (C(id) ? coresCarried(C(id)) : 0));
      // the cores in the focus (the Evoker's or Visualizer's own count in the fight), at its start and end: the burn, before the supply pack gives any back
      const unitCores = (id: string) => { const u = (r.g.combat?.units || []).find((q: any) => q.charId === id && !q.companion); return u?.mg ? (u.mg.cores ?? 0) + (u.mg.vcores ?? 0) : null; }, cores0 = ids.map(unitCores);
      TAP.on = true; TAP.evs = [];
      try { r.fight(cfg.maxFightRounds ?? 20); } finally { TAP.on = false; }
      const cb = r.g.combat, removed = (cb?.units || []).filter((u: any) => u.side !== 'pc' && !u.companion).reduce((t: number, u: any) => t + Math.max(0, (u.maxHp || 0) - Math.max(0, u.hp)), 0);
      // a fight still on at the round cap: when the squad standing holds more than twice the HP of the foes standing (most
      // often one foe left, hidden, which the fight policies never hunt), it is counted won (the test room's run/skip) and
      // marked capped; else the run ends here, stalled
      const left = (side: string) => (cb?.units || []).filter((u: any) => (side === 'pc' ? u.side === 'pc' : u.side !== 'pc') && !u.companion && !u.dead && !u.downed).reduce((t: number, u: any) => t + Math.max(0, u.hp), 0);
      let capped = false;
      if (cb && !cb.over && !cb.field && r.g.phase === 'combat' && left('pc') > 2 * left('foe')) { capped = true; must({ type: 'run/skip' }); }
      else if (cb && !cb.over && !cb.field && r.g.phase === 'combat') { r.errors.push('a fight did not end in ' + (cfg.maxFightRounds ?? 20) + ' rounds (stage ' + run.stage + ', depth ' + node.depth + '): ' + cb.units.map((u: any) => u.side + ':' + u.name + ' ' + u.hp + 'hp@' + u.pos + (u.hidden ? ' hidden' : '') + (u.dead ? ' dead' : u.downed ? ' down' : '') + (u.side === 'pc' ? ' ammo ' + u.ammo + ' w ' + u.weapon + ' jam ' + u.jammed + ' ap ' + u.ap + ' rounds ' + roundsFor(C(u.charId)) : '')).join('; ') + ' LOG ' + cb.log.slice(-12).join(' / ') + ' REFUSED ' + refusals.join(' / ')); res.how = 'stalled'; res.stage = run.stage; res.depth = node.depth; break; }
      // rules 1.55 item 65: the fight is closed (its fighters written back) when the party leaves its field: the walker
      // leaves at once, before anything is measured
      if (r.g.run?.state === 'field') for (let i = 0; i < n && r.g.run.state === 'field'; i++) must({ type: 'run/leave' }, ownerOf(i));
      const won = r.g.phase !== 'lobby';
      const after = ids.map((id) => roundsFor(C(id)));
      const sf = (r.g.run?.stats?.fights || []).slice(-1)[0] || (r.g.run?.end ? null : null);
      res.fights.push({ ...(sf ? { foes: sf.foes.map((q: any) => q.tier[0] + q.level), bulk: [Math.round(sf.target.bulk * 100) / 100, Math.round(sf.spent.bulk * 100) / 100], pressure: [Math.round(sf.target.pressure * 100) / 100, Math.round(sf.spent.pressure * 100) / 100], scaleHp: sf.scaleHp, level: sf.level } : {}), stage: run.stage, depth: node.depth, kind: node.gate ? 'gate' : node.kind, rounds: cb?.round || 0, won, open: cb?.opening ? (cb.opening.won ? 'won' : cb.opening.free ? 'lost' : 'fumble') : 'walk', hpBefore: hp, hpAfter: won ? hpShare(r.g) : 0, ammo, dry: after.filter((q) => q === 0).length, ...(durMin != null ? { durMin: Math.round(durMin * 1000) / 1000, wornBefore } : {}), broken: (cb?.units || []).filter((u: any) => u.side === 'pc' && u.maxDur && (u.dur ?? 1) <= 0).length, capped, figs: RIG.pictures - pic0, lvl, template: sf?.template, dealt: Math.round(tapDealt(cb)), removed: Math.round(removed), cores, ammoAfter: after, coresAfter: ids.map((id) => (C(id) ? coresCarried(C(id)) : 0)), burnt: ids.map((id, i) => (cores0[i] != null && unitCores(id) != null ? Math.max(0, cores0[i]! - unitCores(id)!) : null)) });
      if (won) wonN.n++;
      if (!won) { res.how = 'lost'; res.stage = run.stage; res.depth = node.depth; break; }
      continue;
    }
    if (run.state === 'map') {
      const here = runNode(run, run.at), v = run.visit;
      if (here && v && v.node === here.id) {
        if (here.kind === 'forge') atForge();
        if (here.kind === 'rest') { st.rests++; for (const id of ids) train(id, false); }
        if (here.kind === 'training') for (const id of ids) train(id, true);
        if (here.kind === 'shrine') for (const id of ids) atShrine(id);
        if (here.kind === 'event') for (const id of ids) atEvent(id);
        if (r.g.run.state !== 'map') continue; // a sealed crate's pick
      }
      const node = chooseNode(r.g, cfg.route); if (!node) { r.errors.push('no node to reach'); break; }
      if (node.kind === 'vault_guard') st.vault = 'taken';
      else if (reachable(run).some((q: any) => q.kind === 'vault_guard')) st.vault = 'skipped';
      st.nodes.push(node.kind + (node.gate ? '*' : ''));
      const marks = reachable(run).length === 1 ? 1 : n;
      for (const id of ids) makeAll(id); // P2: whatever was got since, made before walking on
      if (STORY_HEAL) for (const id of ids) storyHeal(id); // rules 1.64 items 5000 and 5001: the story heals between stops (SIM_STORY_HEAL=1)
      for (let i = 0; i < marks && r.g.run.state === 'map' && r.g.run.at !== node.id; i++) must({ type: 'run/move', node: node.id }, ownerOf(i));
      if (r.g.run?.at === node.id) res.stops!.push({ stage: r.g.run.stage, depth: node.depth, kind: node.gate ? 'gate' : node.kind, lvl: ids.map((id) => C(id)?.level ?? 0), hp: Math.round(hpShare(r.g) * 1000) / 1000,
        hpEach: ids.map((id) => (C(id) ? Math.round(1000 * Math.max(0, C(id).hp) / maxHp(C(id))) / 1000 : 0)), rounds: ids.map((id) => roundsFor(C(id))), cores: ids.map((id) => (C(id) ? coresCarried(C(id)) : 0)) });
      continue;
    }
    r.errors.push('unknown state ' + run.state); break;
  }
  if (res.how === 'running') { const e = r.g.run?.end; res.how = e ? e.how : 'open'; res.stage = r.g.run?.stage; }
  res.boons = ids.map((id) => (C(id).relics || []).slice());
  return res;
}

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
// What a run measures (RunResult): where it ended, every fight (stage, depth, kind, rounds, won, HP and rounds of
// ammunition carried before it), each stage's credits earned and spent, XP and level, grade steps, the vault.
import { apply, reachable, runNode, runOptions, lastingFor, creditsOf, packOf, gearAt, wearAt, WEAPON, ITEM, pendingPerkSteps, maxHp,
  counterLines, linePrice, restockRoom, sellValue, gradePrice, nextGrade, GRADE_UP, relicRow, worthOf, capRoom, boonProblem, BOONS, alive, isStartBoon, lineOf, startOffer } from '../../src';
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
export type RoutePolicy = 'gear' | 'training' | 'safest';
/** Rules 1.51 (survival-spec 13.7): the levers of the measure, each on unless SIM_LEVERS names the ones on (a comma
 * list; "none" for rules 1.50's run): `policies` the run's caster policies (run-policies.ts), `supply` the supply pack's
 * cores back by what was burnt and its MP share (off: cores_max = cores and mp_share 0, as before), `start` the starting
 * boon (off: taken off again after the camp), `caster` the caster boons after a Boss (off: never picked). Flux to 0
 * after a fight and the charge at a Rest are the engine's and always on. (The review: the camp's free armour, the old
 * `issue` lever, is gone: armour is bought at the camp from the loadout's budget, rules 1.52.) */
export const LEVERS = ['policies', 'supply', 'start', 'caster'];
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
  sigil: { build: 'sigil', level: 1, policy: 'sigilRun' },
  healer: { build: 'outburst', level: 1, policy: 'healerRun' },
  outburst: { build: 'outburst', level: 1, policy: 'outburstRun' },
  rigger: { build: 'rigger', level: 1, policy: 'rigger' },
};
/** The parties measured (section 10 row 9: sizes 1, 2 and 4; gunners, casters and a healer; rules 1.51: every caster
 * alone, and a mixed squad). */
export const PARTIES: Record<string, string[]> = {
  solo_gunner: ['gunner'], solo_sigil: ['sigil'], solo_outburst: ['outburst'], solo_healer: ['healer'], solo_rigger: ['rigger'],
  duo: ['gunner', 'healer'],
  four: ['gunner', 'faith', 'sigil', 'healer'],
  four_casters: ['sigil', 'outburst', 'rigger', 'healer'],
  mixed: ['gunner', 'sigil', 'outburst', 'healer'],
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
export interface FightRow { /** rules 1.51: Pictures the Rigger policy asked for in it */ figs?: number; stage: number; depth: number; kind: string; rounds: number; won: boolean; hpBefore: number; hpAfter: number; ammo: (number | null)[]; dry: number; broken: number; capped?: boolean; /** rules 1.50: the lowest share of full durability among the squad's main-hand weapons before it, and how many were Worn or Broken */ durMin?: number; wornBefore?: number; /** the composed fight: foes, their tiers and levels, the bulk asked and spent, the HP scale */ foes?: string[]; bulk?: [number, number]; pressure?: [number, number]; scaleHp?: number; level?: number }
export interface StageRow { stage: number; setting: string; earned: number[]; spent: number[]; /** of earned: the credits taken instead of a weapon pick, and sales */ instead: number[]; sold: number[]; xp: number[]; level: number[]; steps: number[]; grades: string[]; cleared: boolean; nodes: string[]; vault: 'taken' | 'skipped' | 'none'; vaultPick: string | null; rests: number; shops: number; forges: number; /** rules 1.50: repairs bought, and their credits, a character */ repairs?: number[]; repairSpent?: number[] }
export interface RunResult { party: string; route: RoutePolicy; seed: string; how: string; stage: number; depth: number; cleared: number; fights: FightRow[]; stages: StageRow[]; errors: string[]; boons: string[][]; /** rules 1.51: each character's starting boon, and the levers on */ start?: (string | null)[]; levers?: string[] }

const RANK = ['standard', 'fine', 'masterwork', 'relic', 'celestial'];
const rankOf = (r: string) => RANK.indexOf(r || 'standard');
/** Where a character's door item is: a caster's focus in the off hand, else the gun or blade in the main hand. */
const doorWhere = (c: any): 'main' | 'off' => { const off = c.offHand?.id; return off && (ITEM[off] as any)?.category === 'focus' ? 'off' : 'main'; };
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
};
/** The node to take where the way forks. */
function chooseNode(g: any, route: RoutePolicy): any {
  const run = g.run, can = reachable(run); if (can.length <= 1) return can[0] || null;
  const hurt = hpShare(g) < 0.55;
  let best: any = null, bestV = -Infinity;
  for (const n of can) {
    if (n.kind === 'vault_guard') { if (route === 'gear' && !hurt) return n; continue; }
    const s = stretch(run, n.id); let v = 0;
    s.forEach((q, i) => { v += (SCORE[route][q.kind] ?? 0) * (1 - i * 0.12); if (hurt && q.kind === 'rest') v += 6 - i; });
    v /= Math.max(1, s.length * 0.5);
    if (v > bestV) { bestV = v; best = n; }
  }
  return best || can[0];
}

// ---------------------------------------------------------------------------------------------- the run
export interface RunCfg { party: string; route: RoutePolicy; seed: string; maxStages?: number; maxFightRounds?: number; /** rules 1.50: buy repairs (default on; SIM_REPAIR=0 in the measure turns it off) */ repair?: boolean; /** rules 1.51: the levers on (default: SIM_LEVERS, else all) */ levers?: string[] }
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
    if (was) credits().forEach((v, i) => { const d = v - was[i]; if (d > 0) { st.earned[i] += d; if (a.type === 'run/pick') st.instead[i] += d; if (a.type === 'run/sell') st.sold[i] += d; } else st.spent[i] -= d; }); return e; }; }
  const ids = pcs.map((_, i) => 'c' + (i + 1)), C = (id: string) => r.g.characters[id], by = (id: string) => ownerOf(ids.indexOf(id));
  const res: RunResult = { party: cfg.party, route: cfg.route, seed: cfg.seed, how: 'running', stage: 1, depth: 0, cleared: 0, fights: [], stages: [], errors: r.errors, boons: [], levers: [...L] };
  const credits = () => ids.map((id) => creditsOf(C(id)));
  let st: StageRow; const stepsAt: Record<string, number> = {};
  const newStage = () => { st = { stage: r.g.run?.stage || 1, setting: r.g.run?.world?.[r.g.run.world.length - 1]?.setting, earned: ids.map(() => 0), spent: ids.map(() => 0), instead: ids.map(() => 0), sold: ids.map(() => 0), xp: [], level: [], steps: ids.map(() => 0), grades: [], cleared: false, nodes: [], vault: 'none', vaultPick: null, rests: 0, shops: 0, forges: 0, repairs: ids.map(() => 0), repairSpent: ids.map(() => 0) }; res.stages.push(st); };
  // rules 1.51, 1.52: the camp's one flow for every member, as a sensible player: the Recommended loadout (Class 1 armour
  // first for every build, casters included), then the starting boon by its line (startPick), then Ready
  r.must({ type: 'run/start', seed: cfg.seed });
  for (const id of ids) {
    r.must({ type: 'run/loadout', charId: id, op: 'recommended' } as any, by(id));
    const offer = startOffer(C(id), cfg.seed); if (offer.length) r.must({ type: 'run/boon', charId: id, choice: startPick(offer, C(id)) }, by(id));
  }
  for (const id of ids) if (r.g.run?.state === 'loadout') r.must({ type: 'run/ready' } as any, by(id));
  if (!L.has('start')) for (const id of ids) C(id).relics = (C(id).relics || []).filter((x: string) => !isStartBoon(x)); // the lever off: as if there were none (outside the reducer: a measure, not a replay)
  // survival-spec 13.7's forced cell: SIM_START_FORCE names the starting boon every character carries (a measure: so no
  // row dominates its line), put in place of the one picked, outside the reducer
  { const force = (globalThis as any).process?.env?.SIM_START_FORCE;
    if (force && L.has('start')) for (const id of ids) C(id).relics = [...(C(id).relics || []).filter((x: string) => !isStartBoon(x)), force]; }
  res.start = ids.map((id) => (C(id).relics || []).find(isStartBoon) || null);
  newStage();
  // every action through Rec, the credits it moved counted to the stage (earned or spent)
  const act = (a: any, who = 'host') => r.act(a, who);
  const must = (a: any, who = 'host') => { const e = act(a, who); if (e) r.errors.push(a.type + ': ' + e); return e; };
  const opts = (id: string) => runOptions(r.g, id);
  const sell = { pending: {} as Record<string, string[]> };

  const levelUp = () => { for (const id of ids) { const c = C(id), def = BUILD[pcs[ids.indexOf(id)].build];
    if (!(c.unspent?.skill > 0 || c.unspent?.attr > 0 || (c.level >= 3 && !c.classId) || pendingPerkSteps(c).length)) continue;
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
    if ((ITEM[item] as any)?.category === 'mod') act({ type: 'gear/mod', charId: id, idx: i }, by(id)); else act({ type: 'gear/equip', charId: id, idx: i, to: 'worn' }, by(id)); };

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
    const c = C(id), lines = counterLines([c]), w: any = WEAPON[c.weapon];
    // sell what a better pick replaced
    for (const it of sell.pending[id] || []) { const i = packOf(C(id)).findIndex((x) => (x.weapon || x.item || x.id) === it && !x.mags); if (i >= 0 && sellValue(packOf(C(id))[i]) != null) act({ type: 'run/sell', charId: id, idx: i }, by(id)); }
    sell.pending[id] = [];
    act({ type: 'gear/load', charId: id }, by(id));
    if (w?.magazine && w.ammo) { const line = lines.find((l) => l.key === 'mag:' + c.weapon) || lines.find((l) => l.key === 'guns:rounds:' + w.ammo);
      for (let k = 0; line && k < 16 && (roundsFor(C(id)) ?? 0) < Math.max(5 * w.magazine, 120); k++) if (act({ type: 'run/buy', charId: id, key: line.key, qty: 1 }, by(id))) break; }
    const coreUser = ['sigil', 'rigger'].includes(pcs[ids.indexOf(id)].build);
    if (coreUser) { const have = () => packOf(C(id)).filter((x) => (x.item || x.id) === 'standard_core').reduce((t, x) => t + x.qty, 0), line = lines.find((l) => l.id === 'standard_core');
      for (let k = 0; line && k < 6 && have() < 4; k++) if (act({ type: 'run/buy', charId: id, key: line.key, qty: 1 }, by(id))) break; }
    for (const l of lines.filter((q) => q.res)) { const room = restockRoom(C(id), l.res!); if (room > 0) act({ type: 'run/buy', charId: id, key: l.key, qty: room }, by(id)); }
  };
  const atShop = () => { st.shops++; for (const id of ids) { repairHere(id); upkeep(id); gradeHere(id, 'shop'); } for (let i = 0; i < n && r.g.run?.state === 'shop'; i++) must({ type: 'run/leave' }, ownerOf(i)); };
  const atForge = () => { st.forges++; for (const id of ids) {
    repairHere(id);
    gradeHere(id, 'forge');
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
    return !!a && !!b && (a.category === b.category) && (a.price_credits || 0) >= (b.price_credits || 0) && (a.magazine ?? 0) >= (b.magazine ?? 0) && a.ammo === b.ammo && (where === 'off' ? (ITEM[w.id] as any)?.category === 'focus' : !!WEAPON[w.id]); };
  const picks = () => {
    const run = r.g.run, vault = runNode(run, run.at)?.kind === 'vault';
    for (const id of ids) { const o = r.g.run.offers?.[id]; if (!o) continue; const c = C(id);
      const k = o.weapons.findIndex((w: any) => better(c, w));
      if (k < 0) { must({ type: 'run/pick', charId: id, choice: 'credits' }, by(id)); if (vault) st.vaultPick = 'credits'; continue; }
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
    if (run.state === 'reward') { picks(); for (const id of ids) act({ type: 'gear/load', charId: id }, by(id)); continue; } // loose rounds into the magazines (free out of a fight; a refusal: nothing to load)
    if (run.state === 'shop') { atShop(); continue; }
    if (run.state === 'fight') {
      const node = runNode(run, run.at), hp = hpShare(r.g), ammo = ids.map((id) => roundsFor(C(id)));
      const wears = ids.map((id) => wearAt(C(id), 'main')).filter((w: any) => w && w.max > 0) as any[];
      const durMin = wears.length ? Math.min(...wears.map((w) => w.now / w.max)) : null, wornBefore = wears.filter((w) => w.state !== 'sound').length;
      const pic0 = RIG.pictures;
      r.fight(cfg.maxFightRounds ?? 20);
      const cb = r.g.combat;
      // a fight still on at the round cap: when the squad standing holds more than twice the HP of the foes standing (most
      // often one foe left, hidden, which the fight policies never hunt), it is counted won (the test room's run/skip) and
      // marked capped; else the run ends here, stalled
      const left = (side: string) => (cb?.units || []).filter((u: any) => (side === 'pc' ? u.side === 'pc' : u.side !== 'pc') && !u.companion && !u.dead && !u.downed).reduce((t: number, u: any) => t + Math.max(0, u.hp), 0);
      let capped = false;
      if (cb && !cb.over && r.g.phase === 'combat' && left('pc') > 2 * left('foe')) { capped = true; must({ type: 'run/skip' }); }
      else if (cb && !cb.over && r.g.phase === 'combat') { r.errors.push('a fight did not end in ' + (cfg.maxFightRounds ?? 20) + ' rounds (stage ' + run.stage + ', depth ' + node.depth + '): ' + cb.units.map((u: any) => u.side + ':' + u.name + ' ' + u.hp + 'hp@' + u.pos + (u.hidden ? ' hidden' : '') + (u.dead ? ' dead' : u.downed ? ' down' : '') + (u.side === 'pc' ? ' ammo ' + u.ammo + ' w ' + u.weapon + ' jam ' + u.jammed + ' ap ' + u.ap + ' rounds ' + roundsFor(C(u.charId)) : '')).join('; ') + ' LOG ' + cb.log.slice(-12).join(' / ') + ' REFUSED ' + refusals.join(' / ')); res.how = 'stalled'; res.stage = run.stage; res.depth = node.depth; break; }
      const won = r.g.phase !== 'lobby';
      const after = ids.map((id) => roundsFor(C(id)));
      const sf = (r.g.run?.stats?.fights || []).slice(-1)[0] || (r.g.run?.end ? null : null);
      res.fights.push({ ...(sf ? { foes: sf.foes.map((q: any) => q.tier[0] + q.level), bulk: [Math.round(sf.target.bulk * 100) / 100, Math.round(sf.spent.bulk * 100) / 100], pressure: [Math.round(sf.target.pressure * 100) / 100, Math.round(sf.spent.pressure * 100) / 100], scaleHp: sf.scaleHp, level: sf.level } : {}), stage: run.stage, depth: node.depth, kind: node.gate ? 'gate' : node.kind, rounds: cb?.round || 0, won, hpBefore: hp, hpAfter: won ? hpShare(r.g) : 0, ammo, dry: after.filter((q) => q === 0).length, ...(durMin != null ? { durMin: Math.round(durMin * 1000) / 1000, wornBefore } : {}), broken: (cb?.units || []).filter((u: any) => u.side === 'pc' && u.maxDur && (u.dur ?? 1) <= 0).length, capped, figs: RIG.pictures - pic0 });
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
      for (let i = 0; i < marks && r.g.run.state === 'map' && r.g.run.at !== node.id; i++) must({ type: 'run/move', node: node.id }, ownerOf(i));
      continue;
    }
    r.errors.push('unknown state ' + run.state); break;
  }
  if (res.how === 'running') { const e = r.g.run?.end; res.how = e ? e.how : 'open'; res.stage = r.g.run?.stage; }
  res.boons = ids.map((id) => (C(id).relics || []).slice());
  return res;
}

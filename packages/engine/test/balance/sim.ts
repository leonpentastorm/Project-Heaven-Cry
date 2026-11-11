// @ts-nocheck (a measuring tool; see balance-sim.test.ts)
// The balance pass, instrument 1 (docs/design/proposals/2026-11-balance-pass.md, section 3): THE FIGHT SIMULATOR.
// Whole fights through the real reducer (apply), seeded, no browser. The player side is played by a policy
// (policies.ts) that reads the engine's previews; the enemies by the engine's own AI. Everything measured is read from
// the outside: the effects stream every screen already gets (fx taps: shots, blows, hurts, conditions, turns) and the
// units' numbers before and after each action.
//
//   import { runFight, runCell, aggregate } from './sim';
//   const r = runFight({ pcs: [{ build: 'opt_gun', variant: 'normal', level: 9 }], foes: [{ tier: 'elite' }], map: 'open', seed: 'S1' });
//   r.pcs[0].dmg, r.rounds, r.win …            (FightResult, below)
//
// A fight NEVER changes a rule or a number: the maps registered here (sim_open, sim_cover) are test-only tiles.
import { apply, newGame, bindGame, MAPS, WEAPON, TECHNIQUE, alive, previewAttack, previewTechnique, techniquePad, pressureCap, isPressed, isSuppressed, maxHp } from '../../src';
import { fxTaps } from '../../src/fxtap';
import { onHook } from '../../src/effects/hooks';
import { ENEMY, clampEnemyLevel } from '../../src';
import { buildCharacter, BUILD, type Variant } from './builds';
import { POLICIES, sigilAfter, type Ctx, type Step } from './policies';

// ---------- the two test grounds ----------
// Both are the full 26 × 26 (rules 1.16) with the game's own deployment: the squad on F–G, the enemy on T–U, rows
// 11 to 16, the nearest of each 13 tiles apart. sim_open is bare ground (nothing to hide behind: the control);
// sim_cover is the game's real open ground (data/maps.json layouts.open_ground: the broken middle, the two lanes, the
// walls and debris), so a number measured here is measured on the ground a fight is really played on.
const START = { pcStart: [...MAPS.yard.pcStart], foeStart: [...MAPS.yard.foeStart] };
MAPS.sim_open = { id: 'sim_open', name: 'Open ground (simulator)', w: MAPS.yard.w, h: MAPS.yard.h, solid: [], cover: [], full: [], difficult: [], ...START };
MAPS.sim_cover = { ...MAPS.yard, id: 'sim_cover', name: 'Ground with cover (simulator)', notes: [] };
export const MAP_ID = { open: 'sim_open', cover: 'sim_cover' };
/** The weapon each tier carries here: the first one the Proving Ground gives that tier. */
export const TIER_WEAPON: Record<string, string> = { vermin: 'beast_bite', minion: 'service_pistol', soldier: 'hellraiser_service_rifle', elite: 'legion_bullpup', boss: 'hellraiser_lmg' };
export const TIERS = ['minion', 'soldier', 'elite', 'boss'];
/** Every tier, Vermin included (rules 1.15). TIERS stays the four the baseline's tables are built on. */
export const ALL_TIERS = ['vermin', ...TIERS];
/** Rules 1.15: enemies have levels. A fight's enemies are the squad's level (the average, rounded down) unless the spec
 * says otherwise: `level` sets the fight's level outright, `shift` moves it from the squad's (any size: the simulator is
 * not held to the Narrator's −3 to +2), and one foe may carry its own `level`. BALANCE_SIM_SHIFT=<n> shifts every
 * fight of a run that names neither ("+3": every enemy 3 levels above the squad). */
export const ENV_SHIFT = Math.trunc(Number((globalThis as any).process?.env?.BALANCE_SIM_SHIFT) || 0);
export function foeLevel(spec: { pcs: { level: number }[]; level?: number; shift?: number }): number {
  const squad = Math.floor(spec.pcs.reduce((t, p) => t + p.level, 0) / Math.max(1, spec.pcs.length));
  return clampEnemyLevel(spec.level ?? squad + (spec.shift ?? ENV_SHIFT));
}
// THE SHOOTING RANGE (test only): a target with a soldier's Defense and armour and 5,000 HP that never acts. The engine
// asks every item "may this enemy act?" before each enemy action (the hook Between Heartbeats uses); this one answer,
// for this one test-only tier, is "no". Damage a turn is then measured with nothing in the way: no Pressure on the
// shooter, no Momentum lost to hits, nobody going down half-way through a Line. Fights under fire are the sandbags and duels.
ENEMY.sim_range_soldier = { ...ENEMY.soldier, id: 'sim_range_soldier', name: 'Range target (soldier numbers)', hp: 5000 };
TIER_WEAPON.sim_range_soldier = TIER_WEAPON.soldier;
if (!(fxTaps as any).__balanceRange) { (fxTaps as any).__balanceRange = true; onHook('enemy_action_start', (ctx: any) => { if (ctx?.u?.tier === 'sim_range_soldier') { ctx.skip = true; ctx.u.ap = 0; } }); }

export interface PcSpec { build: string; variant: Variant; level: number; policy?: string; peak?: boolean }
export interface FightSpec { pcs: PcSpec[]; foes: { tier: string; weapon?: string; level?: number }[]; map: 'open' | 'cover'; seed: string; maxRounds?: number; /** the fight's level outright */ level?: number; /** levels above (+) or below (−) the squad */ shift?: number }
export const RES = ['momentum', 'guard', 'heat', 'ammo', 'mp', 'strain', 'flux', 'charge', 'cores', 'echo', 'reactions'];
const AP_KINDS = ['attack', 'technique', 'spell', 'prayer', 'call', 'move', 'reload', 'setup', 'other'];
export interface PcResult {
  build: string; variant: string; level: number; policy: string; maxHp: number;
  turns: number; lostTurns: number; lostRun: number; pressedTurns: number; suppressedTurns: number; apStart: number; apOver6: number; apOverWhy: Record<string, number>; apSpent: Record<string, number>; apUnspent: number; turns9: number;
  /** damage dealt as the effects stream reports it (not cut at the target's last HP), and the HP it actually removed */ dmg: number; hpRemoved: number; offTurnDmg: number;
  attacks: number; hits: number; crits: number; critDmg: number; attackDmg: number;
  bigHit: number; bigHitWhat: string; bigHitCrit: boolean;
  turnDmg: number[]; bigAction: { dmg: number; hit: number; what: string; turn: number; price: Record<string, number> } | null;
  taken: number; foeAttacks: number; foeHits: number; downedRound: number | null; shieldTaken: number;
  condsOn: number; condsResisted: number;
  res: Record<string, { earned: number; spent: number; empty: number; capped: number; seen: number; max: number }>;
  actions: Record<string, number>;
}
export interface FightResult {
  spec: FightSpec; win: boolean; over: string | null; rounds: number; timeout: boolean; errors: string[];
  pcs: PcResult[]; pcTurns: number; foeTurns: number; foeLostTurns: number; foeLostRun: number; foePressedTurns: number; foeSuppressedTurns: number; foeCondsOn: number; foeCondsResisted: number;
  kills: { tier: string; hits: number; round: number }[]; firstDmgRound: number | null; log?: string[];
}

// ---------- the effects tap (one for the module; it writes into whichever fight is running) ----------
let SINK: ((cb: any, ev: any) => void) | null = null;
if (!(fxTaps as any).__balance) { (fxTaps as any).__balance = true; fxTaps.push((cb, ev) => { if (SINK) SINK(cb, ev); }); }

const W = <T>(g: any, f: () => T): T => { const was = bindGame(g); try { return f(); } finally { bindGame(was); } };
const resNow = (g: any, u: any): Record<string, number | undefined> => {
  const m = u.mg, c = u.charId ? g.characters[u.charId] : null, w = WEAPON[u.weapon];
  return { momentum: u.resMax?.momentum != null ? u.res?.momentum || 0 : undefined, guard: u.resMax?.guard ? u.res?.guard || 0 : undefined,
    heat: w?.heat_limit ? u.heat || 0 : undefined, ammo: w?.magazine != null && !/melee|unarmed/.test(w.category) ? u.ammo : undefined,
    mp: m?.emanator ? m.mp : undefined, strain: m?.emanator || m?.designs?.length ? m.strain : undefined, flux: m?.evoker ? m.flux : undefined, charge: m?.evoker ? m.charge : undefined, cores: m?.evoker ? m.cores : undefined,
    echo: c ? c.echo : undefined, reactions: u.reactUsed && u.reactUsed.r === g.combat?.round ? u.reactUsed.n : 0 };
};
const resMax = (u: any): Record<string, number> => {
  const m = u.mg, w = WEAPON[u.weapon];
  return { momentum: u.resMax?.momentum ?? 0, guard: u.resMax?.guard ?? 0, heat: w?.heat_limit || 0, ammo: w?.magazine || 0, mp: m?.mpMax || 0, strain: m?.strainLimit || 0, flux: 6, charge: 10, cores: 99, echo: 3, reactions: 1 };
};

/** Start a fight in the story's own way: a room, the characters, a session, the Narrator's turn that opens the combat. */
export function startFight(spec: FightSpec, begin = true) {
  let g = newGame(spec.seed, { id: 'host', name: 'Host' });
  const builds = spec.pcs.map((p) => buildCharacter(p.build, p.variant, p.level));
  builds.forEach((b, i) => { const c = b.c; c.id = 'c' + (i + 1); c.owner = 'host'; c.name = BUILD[spec.pcs[i].build].label + (spec.pcs.length > 1 ? ' ' + (i + 1) : ''); g.characters[c.id] = c; });
  g = apply(g, { type: 'session/start' }, 'host');
  g = apply(g, { type: 'narrator/turn', turn: { narration: 'The test begins.', sceneTitle: 'Simulator' } }, 'host');
  const open = { type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'Simulated fight', map: MAP_ID[spec.map], difficulty: 'standard', level: foeLevel(spec),
    enemies: spec.foes.map((f, i) => ({ name: f.tier[0].toUpperCase() + f.tier.slice(1) + ' ' + (i + 1), tier: f.tier, weapon: f.weapon || TIER_WEAPON[f.tier] || 'service_pistol', no_surrender: true, ...(f.level != null ? { level: f.level } : {}) })) } } };
  if (begin) g = apply(g, open, 'host');
  return { g, builds, open };
}

/** Play one fight to its end (or to maxRounds). */
export function runFight(spec: FightSpec, opts: { log?: boolean } = {}): FightResult {
  const st = startFight(spec, false); let g = st.g; // the fight itself opens below, measured: the enemies that win initiative act inside that step
  const maxRounds = spec.maxRounds || 12, errors: string[] = [];
  const pcIds = spec.pcs.map((_, i) => 'pc-c' + (i + 1));
  const P: Record<string, PcResult> = {}, memo: Record<string, any> = {}, lostNow: Record<string, number> = {};
  pcIds.forEach((id: string, i: number) => { const s = spec.pcs[i], hp = W(g, () => maxHp(g.characters['c' + (i + 1)]));
    P[id] = { build: s.build, variant: s.variant, level: s.level, policy: (s.policy || BUILD[s.build].policy) + (s.peak ? ' (peak)' : ''), maxHp: hp, turns: 0, lostTurns: 0, lostRun: 0, pressedTurns: 0, suppressedTurns: 0, apStart: 0, apOver6: 0, apOverWhy: {}, apSpent: Object.fromEntries(AP_KINDS.map((k) => [k, 0])), apUnspent: 0, turns9: 0,
      dmg: 0, hpRemoved: 0, offTurnDmg: 0, attacks: 0, hits: 0, crits: 0, critDmg: 0, attackDmg: 0, bigHit: 0, bigHitWhat: '', bigHitCrit: false, turnDmg: [], bigAction: null,
      taken: 0, foeAttacks: 0, foeHits: 0, downedRound: null, shieldTaken: 0, condsOn: 0, condsResisted: 0, res: {}, actions: {} };
    memo[id] = {}; });
  const R: FightResult = { spec, win: false, over: null, rounds: 0, timeout: false, errors, pcs: [], pcTurns: 0, foeTurns: 0, foeLostTurns: 0, foeLostRun: 0, foePressedTurns: 0, foeSuppressedTurns: 0, foeCondsOn: 0, foeCondsResisted: 0, kills: [], firstDmgRound: null };
  const hitsOn: Record<string, number> = {}, sideOf: Record<string, string> = {}, tierOf: Record<string, string> = {};
  const seq: Record<string, any> = {}; // a move paid over several actions: its price so far
  let evs: any[] = [], turnsSeen: { unit: string; side: string; ap: number; skip: boolean; round: number; pressed: boolean; suppressed: boolean }[] = [];
  SINK = (cb, ev) => {
    evs.push(ev);
    if (ev.k === 'turn') { const u = cb.units.find((q: any) => q.id === ev.unit); if (u) { let pr = false, su = false; try { pr = !!isPressed(u); su = !!isSuppressed(u); } catch { /* not a unit Pressure applies to */ } turnsSeen.push({ unit: u.id, side: u.side, ap: u.ap, skip: !!u.skipTurn || (u.ap <= 0 && !u.downed), round: cb.round, pressed: pr, suppressed: su }); } }
  };
  const snap = (gg: any) => Object.fromEntries(gg.combat.units.map((u: any) => [u.id, { hp: u.hp, shield: u.shield || 0, ap: u.ap, downed: u.downed, dead: u.dead, res: resNow(gg, u) }]));
  const noteTurns = (gg: any, logFrom: number) => {
    for (const t of turnsSeen) {
      // A fight that is stopped after maxRounds: the turn that opens the round after the last one is announced by the
      // engine (whoever acts first in the order) but never played. It is not a turn of the fight.
      if (t.round > maxRounds) continue;
      if (t.side === 'foe') { R.foeTurns++; if (t.pressed) R.foePressedTurns++; if (t.suppressed) R.foeSuppressedTurns++; if (t.skip) { R.foeLostTurns++; lostNow[t.unit] = (lostNow[t.unit] || 0) + 1; R.foeLostRun = Math.max(R.foeLostRun, lostNow[t.unit]); } else lostNow[t.unit] = 0; continue; }
      const p = P[t.unit]; if (!p) continue;
      const u = gg.combat.units.find((q: any) => q.id === t.unit); if (u && (u.downed || u.dead) && t.ap <= 0) continue; // a Downed turn is a death save, not a turn
      p.turns++; R.pcTurns++; p.apStart += Math.max(0, t.ap); p.turnDmg.push(0); if (t.pressed) p.pressedTurns++; if (t.suppressed) p.suppressedTurns++;
      if (t.skip) { p.lostTurns++; lostNow[t.unit] = (lostNow[t.unit] || 0) + 1; p.lostRun = Math.max(p.lostRun, lostNow[t.unit]); } else lostNow[t.unit] = 0;
      if (t.ap > 6) { p.apOver6 += t.ap - 6; if (t.ap >= 9) p.turns9++;
        const name = u?.name || '', lines = (gg.combat.log || []).slice(logFrom).filter((l: string) => typeof l === 'string' && l.includes(name) && /AP/.test(l) && /\+\s*\d/.test(l));
        for (const l of lines.length ? lines : ['(the log names no source)']) { const k = l.replace(name, '').replace(/\d+/g, 'N').slice(0, 90).trim(); p.apOverWhy[k] = (p.apOverWhy[k] || 0) + 1; } }
      // the resources as the turn opens: empty, or at their cap
      if (u) { const now = resNow(gg, u), mx = resMax(u); for (const k of RES) { if (now[k] === undefined) continue; const r = (p.res[k] ||= { earned: 0, spent: 0, empty: 0, capped: 0, seen: 0, max: mx[k] }); r.seen++; if (now[k] === 0) r.empty++; if (mx[k] > 0 && now[k]! >= mx[k]) r.capped++; } }
    }
    turnsSeen = [];
  };
  /** One action through the reducer, measured. actor: the unit acting (null: the opening). */
  const doAct = (action: any, actor: string | null, step: Step | null): string | null => {
    const before0 = g.combat ? snap(g) : null, logFrom = g.combat ? g.combat.log.length : 0; evs = []; turnsSeen = [];
    let next: any;
    try { next = apply(g, action, 'host'); } catch (e: any) { return String(e?.message || e); }
    g = next; const cb = g.combat; if (!cb) return 'the fight did not start';
    if (!Object.keys(sideOf).length) for (const q of cb.units) { sideOf[q.id] = q.side; tierOf[q.id] = q.tier || ''; }
    const after = snap(g), endTurn = action.type === 'combat/end-turn' || !before0;
    // the step that opens the fight has no "before": everyone came in at full HP, with the meters the fight gave them
    const before = before0 || Object.fromEntries(cb.units.map((q: any) => [q.id, { hp: q.maxHp, shield: 0, ap: 0, downed: false, dead: false, res: after[q.id].res }]));
    // ----- damage, from the effects stream, set against the HP that left
    const inst: { by: string | null; target: string; dmg: number; crit: boolean; what: string; attack: boolean; hit: boolean }[] = [];
    for (const ev of evs) {
      if (ev.k === 'shot' || ev.k === 'melee') inst.push({ by: ev.unit, target: ev.target, dmg: ev.hit ? ev.dmg || 0 : 0, crit: !!ev.crit && !!ev.hit, hit: !!ev.hit, attack: true, what: (TECHNIQUE[ev.tech || ev.technique]?.name || ev.tech || ev.technique || (ev.unit === actor && step && step.kind !== 'attack' ? step.label : null) || (ev.mode === 'melee' ? 'plain cut' : ev.mode === 'aimed' ? 'aimed shot' : 'plain shot')) + ' (' + (WEAPON[ev.weapon]?.name || ev.weapon) + ')' });
      else if (ev.k === 'hurt' && ev.dmg > 0) inst.push({ by: null, target: ev.target, dmg: ev.dmg, crit: false, hit: true, attack: false, what: String(ev.why || 'effect') });
      else if (ev.k === 'cond' && ev.target) { const s = sideOf[ev.target]; if (s === 'foe') { if (ev.resisted) R.foeCondsResisted++; else R.foeCondsOn++; } else if (P[ev.target]) { if (ev.resisted) P[ev.target].condsResisted++; else P[ev.target].condsOn++; } }
    }
    const lost: Record<string, number> = {}; for (const id of Object.keys(after)) lost[id] = Math.max(0, (before[id]?.hp ?? after[id].hp) - after[id].hp);
    const evSum: Record<string, number> = {}; for (const i of inst) evSum[i.target] = (evSum[i.target] || 0) + i.dmg;
    for (const id of Object.keys(lost)) if (lost[id] > (evSum[id] || 0) + 0.5) inst.push({ by: null, target: id, dmg: lost[id] - (evSum[id] || 0), crit: false, hit: true, attack: false, what: 'an effect with no event of its own' });
    // a spell's or a prayer's critical is said in the log, not in the effects stream: the action's biggest hit is marked
    const spellCrit = !!step && (step.kind === 'spell' || step.kind === 'prayer') && (g.combat.log || []).slice(logFrom).some((l: string) => typeof l === 'string' && /CRITICAL/.test(l));
    let actDmg = 0, actHit = 0, actWhat = '';
    const oneSpell: Record<string, { by: string; dmg: number; what: string }> = {}; // a spell's or prayer's damage on one target is one hit, however many parts it lands in
    for (const i of inst) {
      const tSide = sideOf[i.target];
      if (tSide === 'foe') {
        // who gets the credit: the attacker; for a hurt, the unit acting; off its turn, whoever hit the target last
        const tu = cb.units.find((q: any) => q.id === i.target);
        const by = i.by && P[i.by] ? i.by : !i.by && actor && !endTurn && P[actor] ? actor : !i.by && tu?.lastHitBy && P[tu.lastHitBy] ? tu.lastHitBy : i.by ? null : pcIds[0];
        if (!by || !P[by]) continue; const p = P[by];
        const what = (i.attack ? i.what : (by === actor && step ? step.label : i.what)) + (!i.attack && by === actor && spellCrit ? ', critical' : '');
        if (i.attack) { p.attacks++; if (i.hit) { p.hits++; p.attackDmg += i.dmg; } if (i.crit) { p.crits++; p.critDmg += i.dmg; } }
        p.dmg += i.dmg; if (i.dmg > 0) { hitsOn[i.target] = (hitsOn[i.target] || 0) + 1; if (R.firstDmgRound == null) R.firstDmgRound = cb.round; }
        const own = by === actor && !endTurn;
        if (own && !i.attack && step && (step.kind === 'spell' || step.kind === 'prayer')) { const o = (oneSpell[i.target] ||= { by, dmg: 0, what }); o.dmg += i.dmg; }
        else { if (i.dmg > p.bigHit) { p.bigHit = i.dmg; p.bigHitWhat = what + (i.crit ? ', critical' : ''); p.bigHitCrit = i.crit; } if (own && i.dmg > actHit) { actHit = i.dmg; actWhat = what + (i.crit ? ', critical' : ''); } }
        if (own) { actDmg += i.dmg; if (p.turnDmg.length) p.turnDmg[p.turnDmg.length - 1] += i.dmg; }
        else p.offTurnDmg += i.dmg;
      } else if (P[i.target]) {
        const p = P[i.target];
        if (i.attack && i.by && sideOf[i.by] === 'foe') { p.foeAttacks++; if (i.hit) p.foeHits++; }
        if (!i.by || sideOf[i.by] === 'foe' || i.by === i.target) p.taken += i.dmg;
      }
    }
    for (const o of Object.values(oneSpell)) { const p = P[o.by]; if (o.dmg > p.bigHit) { p.bigHit = o.dmg; p.bigHitWhat = o.what; p.bigHitCrit = spellCrit; } if (o.dmg > actHit) { actHit = o.dmg; actWhat = o.what; } }
    // foe attacks that missed carry no damage instance target check above (they are in inst with dmg 0): counted there
    for (const id of Object.keys(lost)) if (sideOf[id] === 'foe' && lost[id] > 0) { const tu = cb.units.find((q: any) => q.id === id); const by = actor && !endTurn && P[actor] ? actor : tu?.lastHitBy && P[tu.lastHitBy] ? tu.lastHitBy : pcIds[0]; if (P[by]) P[by].hpRemoved += lost[id]; }
    for (const id of Object.keys(after)) {
      if (sideOf[id] === 'foe' && after[id].dead && !before[id]?.dead) R.kills.push({ tier: tierOf[id], hits: hitsOn[id] || 0, round: cb.round });
      if (P[id]) { if ((after[id].downed || after[id].dead) && !(before[id]?.downed || before[id]?.dead) && P[id].downedRound == null) P[id].downedRound = cb.round; P[id].shieldTaken += Math.max(0, (before[id]?.shield || 0) - after[id].shield); }
    }
    // ----- resources: what every action and every enemy turn earned and spent
    for (const id of pcIds) { const a = after[id]?.res, b = before[id]?.res; if (!a || !b) continue; const u = cb.units.find((q: any) => q.id === id), mx = resMax(u);
      for (const k of RES) { if (a[k] === undefined || b[k] === undefined) continue; const d = a[k]! - b[k]!; if (!d) continue; const r = (P[id].res[k] ||= { earned: 0, spent: 0, empty: 0, capped: 0, seen: 0, max: mx[k] }); if (d > 0) r.earned += d; else r.spent -= d; } }
    // ----- AP: what this action cost, by kind; and the price of a move paid over several actions
    if (actor && P[actor] && step) {
      const p = P[actor], d = (before[actor]?.ap ?? 0) - (after[actor]?.ap ?? 0);
      if (!endTurn && d > 0) p.apSpent[step.kind] = (p.apSpent[step.kind] || 0) + d;
      p.actions[step.label] = (p.actions[step.label] || 0) + 1;
      const delta: Record<string, number> = { ap: Math.max(0, d) }; for (const k of RES) { const a = after[actor]?.res?.[k], b = before[actor]?.res?.[k]; if (a !== undefined && b !== undefined && b - a) delta[k] = b - a; }
      if (step.seq === 'start' || (step.seq && !seq[actor])) seq[actor] = { price: {}, turn0: p.turns, n: 0 };
      if (step.seq && seq[actor]) { const s = seq[actor]; s.n++; for (const [k, v] of Object.entries(delta)) s.price[k] = (s.price[k] || 0) + v; }
      const price = step.seq === 'end' && seq[actor] ? { ...seq[actor].price, turns: p.turns - seq[actor].turn0 + 1, actions: seq[actor].n } : { ...delta, turns: 1, actions: 1 };
      if (step.seq === 'end') delete seq[actor];
      if (actDmg > 0 && (!p.bigAction || actDmg > p.bigAction.dmg)) p.bigAction = { dmg: actDmg, hit: actHit, what: actWhat || step.label, turn: p.turns, price: Object.fromEntries(Object.entries(price).filter(([, v]) => v)) };
    }
    if (endTurn && actor && P[actor]) P[actor].apUnspent += Math.max(0, before[actor]?.ap ?? 0);
    noteTurns(g, logFrom);
    return null;
  };

  // The opening: the Narrator's turn starts the fight, and the enemies that won initiative act inside it. Measured like any step.
  { const e = doAct(st.open, null, null); if (e) throw new Error('the fight did not start: ' + e); }
  for (let guard = 0; guard < 4000; guard++) {
    const cb = g.combat; if (!cb || cb.over || g.phase !== 'combat') break;
    if (cb.round > maxRounds) { R.timeout = true; break; }
    const uid = cb.window?.queue?.[0]?.unitId ?? cb.order[cb.turn], u = cb.units.find((q: any) => q.id === uid);
    if (!u) break;
    if (cb.window) { const e = doAct({ type: 'combat/decline', unitId: u.id }, u.id, { action: {}, kind: 'other', label: 'decline a reaction' }); if (e) { const e2 = doAct({ type: 'combat/end-turn', unitId: u.id }, u.id, null); if (e2) { errors.push('window: ' + e + ' / ' + e2); break; } } continue; }
    if (!P[u.id]) { // a companion or something the simulator has no policy for: it passes
      const e = doAct({ type: 'combat/end-turn', unitId: u.id }, u.id, null); if (e) { errors.push('stuck on ' + u.name + ': ' + e); break; } continue; }
    const spc = spec.pcs[pcIds.indexOf(u.id)], pol = POLICIES[spc.policy || BUILD[spc.build].policy], banned = new Set<string>();
    let fails = 0;
    for (let n = 0; n < 30; n++) {
      const c2 = g.combat; if (!c2 || c2.over || g.phase !== 'combat') break;
      const me = c2.units.find((q: any) => q.id === u.id);
      if (!me || (c2.window?.queue?.[0]?.unitId ?? c2.order[c2.turn]) !== u.id || c2.window) break;
      if (me.downed || me.dead || me.ap <= 0) break;
      const x: Ctx = { g, cb: c2, u: me, c: g.characters[me.charId], foes: c2.units.filter((q: any) => q.side === 'foe' && alive(q) && !q.hidden), allies: c2.units.filter((q: any) => q.side === 'pc' && q.id !== me.id && alive(q)), memo: memo[u.id], banned, peak: !!spc.peak };
      let step: Step | null = null;
      try { step = pol(x); } catch (e: any) { errors.push('policy ' + (spc.policy || BUILD[spc.build].policy) + ': ' + String(e?.message || e).slice(0, 160)); break; }
      if (!step) break;
      const err = doAct({ unitId: u.id, ...step.action }, u.id, step);
      if (pol === POLICIES.sigil) { const c3 = g.combat; if (c3) sigilAfter({ ...x, g, cb: c3, u: c3.units.find((q: any) => q.id === u.id) }, step, !err); }
      if (err) { banned.add(JSON.stringify(step.action)); if (++fails > 6) break; if (opts.log) (R.log ||= []).push('REFUSED ' + step.label + ': ' + err); }
    }
    const c4 = g.combat;
    if (c4 && !c4.over && g.phase === 'combat' && !c4.window && c4.order[c4.turn] === u.id) { const e = doAct({ type: 'combat/end-turn', unitId: u.id }, u.id, { action: {}, kind: 'other', label: 'end turn' }); if (e) { errors.push('end turn: ' + e); break; } }
  }
  SINK = null;
  const cb = g.combat;
  R.over = cb?.over || null; R.win = R.over === 'win'; R.rounds = Math.min(cb?.round || 0, maxRounds); R.pcs = pcIds.map((id: string) => P[id]);
  if (opts.log) R.log = [...(R.log || []), ...(cb?.log || [])];
  return R;
}

// ---------- adding fights up ----------
export interface Cell {
  key: string; build: string; variant: string; level: number; policy: string; tier: string; map: string; squad: number; foes: number; n: number;
  wins: number; timeouts: number; rounds: number; winRounds: number; errors: number;
  maxHp: number; turns: number; lostTurns: number; lostRun: number; apStart: number; apOver6: number; turns9: number; apSpent: Record<string, number>; apUnspent: number; apOverWhy: Record<string, number>;
  dmg: number; hpRemoved: number; offTurnDmg: number; attacks: number; hits: number; crits: number; critDmg: number; attackDmg: number;
  bigHit: number; bigHitWhat: string; peakTurn: number; peakTurnSum: number; bigAction: any;
  taken: number; foeAttacks: number; foeHits: number; foeTurns: number; downed: number; downedRoundSum: number; shieldTaken: number;
  condsOn: number; condsResisted: number; foeCondsOn: number; foeCondsResisted: number; foeLostTurns: number; foeLostRun: number;
  kills: number; killHits: number; res: Record<string, any>; actions: Record<string, number>;
}
const addInto = (a: Record<string, number>, b: Record<string, number>) => { for (const [k, v] of Object.entries(b || {})) a[k] = (a[k] || 0) + v; };
/** Add one fight's result for one of its characters into a cell (a cell is one row of a table). */
export function addResult(cell: Cell | null, r: FightResult, i = 0, key = ''): Cell {
  const p = r.pcs[i], tier = r.spec.foes[0].tier;
  const c: Cell = cell || { key, build: p.build, variant: p.variant, level: p.level, policy: p.policy, tier, map: r.spec.map, squad: r.spec.pcs.length, foes: r.spec.foes.length, n: 0,
    wins: 0, timeouts: 0, rounds: 0, winRounds: 0, errors: 0, maxHp: p.maxHp, turns: 0, lostTurns: 0, lostRun: 0, apStart: 0, apOver6: 0, turns9: 0, apSpent: {}, apUnspent: 0, apOverWhy: {},
    dmg: 0, hpRemoved: 0, offTurnDmg: 0, attacks: 0, hits: 0, crits: 0, critDmg: 0, attackDmg: 0, bigHit: 0, bigHitWhat: '', peakTurn: 0, peakTurnSum: 0, bigAction: null,
    taken: 0, foeAttacks: 0, foeHits: 0, foeTurns: 0, downed: 0, downedRoundSum: 0, shieldTaken: 0, condsOn: 0, condsResisted: 0, foeCondsOn: 0, foeCondsResisted: 0, foeLostTurns: 0, foeLostRun: 0,
    kills: 0, killHits: 0, res: {}, actions: {}, pressedTurns: 0, suppressedTurns: 0, foePressedTurns: 0, foeSuppressedTurns: 0 };
  c.n++; if (r.win) { c.wins++; c.winRounds += r.rounds; } if (r.timeout) c.timeouts++; c.rounds += r.rounds; c.errors += r.errors.length;
  for (const k of ['turns', 'lostTurns', 'apStart', 'apOver6', 'turns9', 'apUnspent', 'dmg', 'hpRemoved', 'offTurnDmg', 'attacks', 'hits', 'crits', 'critDmg', 'attackDmg', 'taken', 'foeAttacks', 'foeHits', 'shieldTaken', 'condsOn', 'condsResisted', 'pressedTurns', 'suppressedTurns']) c[k] += p[k];
  c.lostRun = Math.max(c.lostRun, p.lostRun); addInto(c.apSpent, p.apSpent); addInto(c.apOverWhy, p.apOverWhy); addInto(c.actions, p.actions);
  if (p.bigHit > c.bigHit) { c.bigHit = p.bigHit; c.bigHitWhat = p.bigHitWhat; }
  const pk = Math.max(0, ...p.turnDmg); c.peakTurn = Math.max(c.peakTurn, pk); c.peakTurnSum += pk;
  // the first four turns on their own: a fight of the target length (4 to 6 rounds), before a limited supply runs out
  c.first4Dmg = (c.first4Dmg || 0) + p.turnDmg.slice(0, 4).reduce((a, b) => a + b, 0); c.first4Turns = (c.first4Turns || 0) + Math.min(4, p.turnDmg.length);
  if (p.bigAction && (!c.bigAction || p.bigAction.dmg > c.bigAction.dmg)) c.bigAction = p.bigAction;
  if (p.downedRound != null) { c.downed++; c.downedRoundSum += p.downedRound; }
  if (i === 0) { c.foeTurns += r.foeTurns; c.foePressedTurns += r.foePressedTurns; c.foeSuppressedTurns += r.foeSuppressedTurns; c.foeCondsOn += r.foeCondsOn; c.foeCondsResisted += r.foeCondsResisted; c.foeLostTurns += r.foeLostTurns; c.foeLostRun = Math.max(c.foeLostRun, r.foeLostRun); for (const k of r.kills) { c.kills++; c.killHits += k.hits; } }
  for (const [k, v] of Object.entries(p.res)) { const t = (c.res[k] ||= { earned: 0, spent: 0, empty: 0, capped: 0, seen: 0, max: v.max }); t.earned += v.earned; t.spent += v.spent; t.empty += v.empty; t.capped += v.capped; t.seen += v.seen; }
  return c;
}
const r1 = (n: number) => Math.round(n * 10) / 10, pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : null);
/** The numbers a table prints, from a cell. */
export function figures(c: Cell) {
  const apAll = Object.values(c.apSpent).reduce((a, b) => a + b, 0), apHit = (c.apSpent.attack || 0) + (c.apSpent.technique || 0) + (c.apSpent.spell || 0) + (c.apSpent.prayer || 0);
  return {
    fights: c.n, winPct: pct(c.wins, c.n), timeoutPct: pct(c.timeouts, c.n), rounds: r1(c.rounds / c.n), roundsToWin: c.wins ? r1(c.winRounds / c.wins) : null,
    hp: c.maxHp, dmgPerTurn: c.turns ? r1(c.dmg / c.turns) : 0, dmgPerTurnFirst4: c.first4Turns ? r1(c.first4Dmg / c.first4Turns) : 0, dmgPerAp: apAll ? r1(c.dmg / apAll) : 0, dmgPerAttackAp: apHit ? r1(c.dmg / apHit) : 0, peakTurn: c.peakTurn, peakTurnAvg: r1(c.peakTurnSum / c.n),
    bigHit: c.bigHit, bigHitWhat: c.bigHitWhat, bigAction: c.bigAction, hitPct: pct(c.hits, c.attacks), critPct: pct(c.crits, c.attacks), critShare: pct(c.critDmg, c.dmg), dmgPerHit: c.hits ? r1(c.attackDmg / c.hits) : null,
    hitsToKill: c.kills ? r1(c.killHits / c.kills) : null, takenPerFoeTurn: c.foeTurns ? r1(c.taken / c.foeTurns) : 0, foeHitPct: pct(c.foeHits, c.foeAttacks), takenPerFoeHit: c.foeHits ? r1(c.taken / c.foeHits) : null,
    foeTurnsToDown: c.taken > 0 && c.foeTurns ? r1(c.maxHp / (c.taken / c.foeTurns)) : null, downedPct: pct(c.downed, c.n), downedRound: c.downed ? r1(c.downedRoundSum / c.downed) : null,
    pressedPct: pct(c.pressedTurns, c.turns), suppressedPct: pct(c.suppressedTurns, c.turns), foePressedPct: pct(c.foePressedTurns, c.foeTurns), foeSuppressedPct: pct(c.foeSuppressedTurns, c.foeTurns),
    lostTurnPct: pct(c.lostTurns, c.turns), lostRun: c.lostRun, foeLostTurnPct: pct(c.foeLostTurns, c.foeTurns), foeLostRun: c.foeLostRun,
    saveMadePct: pct(c.condsResisted, c.condsResisted + c.condsOn), foeSaveMadePct: pct(c.foeCondsResisted, c.foeCondsResisted + c.foeCondsOn), conds: c.condsOn + c.condsResisted, foeConds: c.foeCondsOn + c.foeCondsResisted,
    apPerTurn: c.turns ? r1(c.apStart / c.turns) : 0, apOver6PerTurn: c.turns ? r1(c.apOver6 / c.turns) : 0, turns9Pct: pct(c.turns9, c.turns), apUnspentPerTurn: c.turns ? r1(c.apUnspent / c.turns) : 0,
    apShare: Object.fromEntries(Object.entries(c.apSpent).map(([k, v]) => [k, pct(v, apAll + c.apUnspent) || 0])), apUnspentShare: pct(c.apUnspent, apAll + c.apUnspent) || 0, apOverWhy: c.apOverWhy,
    res: Object.fromEntries(Object.entries(c.res).map(([k, v]: any) => [k, { earnedPerFight: r1(v.earned / c.n), spentPerFight: r1(v.spent / c.n), emptyPct: pct(v.empty, v.seen), cappedPct: pct(v.capped, v.seen), max: v.max }])),
    actions: c.actions, errors: c.errors,
  };
}

/** N seeded fights of one build against one tier; returns the cell. */
export function runCell(pc: PcSpec, tier: string, map: 'open' | 'cover', n: number, o: { foes?: number; tag?: string; maxRounds?: number; level?: number; shift?: number } = {}): Cell {
  let cell: Cell | null = null; const foes = Array(o.foes || 1).fill(0).map(() => ({ tier }));
  const key = [pc.build, pc.variant, pc.level, (pc.policy || BUILD[pc.build].policy) + (pc.peak ? '+peak' : ''), tier, map, o.foes || 1, o.tag || ''].join('|');
  for (let i = 0; i < n; i++) cell = addResult(cell, runFight({ pcs: [pc], foes, map, seed: 'SIM-' + key + '-' + i, maxRounds: o.maxRounds, ...(o.level != null ? { level: o.level } : {}), ...(o.shift != null ? { shift: o.shift } : {}) }), 0, key);
  return cell!;
}

/** A fight in which nothing has happened yet: the character acts first, so no enemy has Pressed, hurt or moved anyone.
 * (The opening of a fight plays the turns of every enemy that won initiative; a preview taken after that is not the
 * card's clean number.) Seeds are tried in turn until the character has won initiative. */
export function freshFight(pc: PcSpec, tier: string, tag = 'PV', lv: { level?: number; shift?: number } = {}) {
  for (let i = 0; i < 400; i++) {
    const st = startFight({ pcs: [pc], foes: [{ tier }], map: 'open', seed: tag + '-' + i, ...lv }), cb = st.g.combat, u = cb.units.find((q: any) => q.side === 'pc'), t = cb.units.find((q: any) => q.side === 'foe');
    if (cb.round === 1 && cb.turn === 0 && cb.order[0] === u.id && u.hp === u.maxHp && t.hp === t.maxHp && !isPressed(u) && !isPressed(t)) return st;
  }
  throw new Error('no seed in 400 gave ' + pc.build + ' the first turn against a ' + tier);
}

/** The engine's own answer for a plain attack by a build on a tier at 4 tiles (guns) or next to it (melee): the
 * sanity check sets the simulator's attack numbers against this. */
export function plainPreview(pc: PcSpec, tier: string, lv: { level?: number; shift?: number } = {}) {
  const { g } = freshFight(pc, tier, 'PV', lv);
  const cb = g.combat, u = cb.units.find((q: any) => q.side === 'pc'), t = cb.units.find((q: any) => q.side === 'foe'), melee = /melee|unarmed/.test(WEAPON[u.weapon].category);
  u.pos = melee ? '6,5' : '3,5'; t.pos = '7,5'; u.ap = 6; u.heat = 0; u.shotsThisTurn = 0;
  const pv = W(g, () => previewAttack(cb, u, t, melee ? 'melee' : 'shot'));
  // the enemy's own plain attack on the character, as if it were its turn (full AP; a weapon that must be braced is braced)
  t.ap = 6; t.heat = 0; t.shotsThisTurn = 0;
  const fmode = /melee|unarmed/.test(WEAPON[t.weapon].category) ? 'melee' : 'shot';
  let back = W(g, () => previewAttack(cb, t, u, fmode));
  if (!back.ok && /Brace/i.test(back.why || '')) { t.braced = true; back = W(g, () => previewAttack(cb, t, u, fmode)); }
  return { ok: pv.ok, why: pv.why, ap: pv.ap, pct: pv.pct, hit: pv.dmg ? Math.max(1, Math.floor(pv.dmg.total) - pv.dmg.armour) : 0, crit: pv.dmg ? Math.max(1, Math.floor(pv.dmg.total * pv.dmg.crit) - pv.dmg.armour) : 0, critMult: pv.dmg?.crit,
    foeLevel: t.level, foeHp: t.maxHp, foeDef: t.def, foeArmour: t.armour, pcHp: u.maxHp, pcDef: u.def, pcArmour: u.armour, guardMax: u.resMax?.guard || 0,
    foe: back.ok && back.dmg ? { pct: back.pct, raw: Math.floor(back.dmg.total), afterArmour: Math.max(1, Math.floor(back.dmg.total) - back.dmg.armour), ap: back.ap } : { why: back.why } };
}

/** The peak on its card (the peak rule, section 10 of the balance pass): a weapon build's dearest technique with its
 * price fully met, read from the engine's own preview. The fight is staged like the Proving Ground's meters: Momentum
 * full, the target next to it (melee) or 4 tiles off (guns) and Pressed as far as Pressure goes, 6 AP. Returns every
 * technique that deals damage there, the biggest hit first. */
export function peakCard(pc: PcSpec, tier = 'boss') {
  const { g } = freshFight(pc, tier, 'PKC');
  const cb = g.combat, u = cb.units.find((q: any) => q.side === 'pc'), t = cb.units.find((q: any) => q.side === 'foe'), melee = /melee|unarmed/.test(WEAPON[u.weapon].category);
  u.pos = melee ? '6,5' : '3,5'; t.pos = '7,5'; u.ap = 6; u.heat = 0; u.shotsThisTurn = 0; cb.turn = cb.order.indexOf(u.id);
  const momMax = u.resMax?.momentum ?? 0; if (momMax) u.res.momentum = momMax;
  t.pressure = W(g, () => pressureCap(t));
  const out: any[] = [];
  for (const e of W(g, () => techniquePad(cb, u, 'main', g)).flatMap((x: any) => x.entries)) {
    if (e.group === 'answer' || e.group === 'watch') continue;
    for (const opt of [undefined, 'head']) {
      let pv: any; try { pv = W(g, () => previewTechnique(cb, u, e.id, { targetId: t.id, tile: t.pos, ...(opt ? { opt } : {}) }, g)); } catch { break; }
      if (!pv.ok) { if (!opt && /Call the shot|Pick|Choose/i.test(pv.why || '')) continue; break; }
      const at = (pv.attacks || []).filter((a: any) => a.target === t.id && a.pv.ok && a.pv.dmg); if (!at.length) break;
      const hit = at.reduce((n: number, a: any) => n + Math.max(1, Math.floor(a.pv.dmg.total) - a.pv.dmg.armour), 0), crit = at.reduce((n: number, a: any) => n + Math.max(1, Math.floor(a.pv.dmg.total * a.pv.dmg.crit) - a.pv.dmg.armour), 0);
      out.push({ id: e.id, name: e.name, group: e.group, ap: pv.ap, rolls: at.length, pct: at[0].pv.pct, hit, crit, momentum: pv.momentum ? pv.momentum.now - pv.momentum.after : 0, momentumMax: momMax, rounds: pv.rounds || 0, needsPressed: !!TECHNIQUE[e.id]?.needs?.pressed, needsMomentum: TECHNIQUE[e.id]?.needs?.momentum || 0 });
      break;
    }
  }
  return out.sort((a, b) => b.hit - a.hit);
}

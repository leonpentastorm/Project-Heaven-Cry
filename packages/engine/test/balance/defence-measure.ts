// @ts-nocheck (a measuring tool; see defence-measure.test.ts)
// THE DEFENCE STEP (rules 1.23; docs/design/handoffs/defence-step.md). Four instruments:
//   fightRow     whole fights of a squad of four against the fit's three fights (standard, elite, boss), on the
//                simulator's 26 × 26 grounds (open, and the game's real ground with cover). Three squads: the fit's own
//                (a Sigil caster in it), one with a second gun in the caster's place, one with the Outburst caster; and
//                a fourth with a dedicated healer, to see what the healer weight of the enemy AI does to a real fight.
//   pairFire     the pair or trio under Soldiers that never fall (the heal pass's "under fire", on its 16 × 11 ground),
//                with the enemy AI's healer weight on or off: how long they last, and who goes Down first.
//   yardFire     the yardstick under fire (rules 1.15: three rounds under two Soldiers) on either ground.
//   medicRows    the medic's kit (Triage, a stim, Rally) as HP, as a percent of one Soldier-turn and per AP, from the
//                engine's own numbers; next to what a magic healer's turn gives per AP.
// A trial enemy table (BALANCE_FIT_TABLE-style JSON, fit.ts useTable) can be laid over the loaded one for a run.
import { runFight, TIER_WEAPON, MAP_ID } from './sim';
import { BUILD, BUILDS, LEVELS } from './builds';
import { POLICIES, plain, type Ctx, type Step, type Policy } from './policies';
import { SOLDIER_TURN, RIFLEMAN_HP, unitOf, stand, inventory } from './heal-measure';
import { ENEMY, bindGame, dist, paths, apForTiles, healingMult, mendFactor, TRIAGE_HEAL, STIM_HEAL, RALLY_HEAL, TRIAGE_REST_MULT } from '../../src';

export const D_LEVELS = LEVELS;
const r1 = (n: number) => Math.round(n * 10) / 10, pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
const W = <T>(g: any, f: () => T): T => { const was = bindGame(g); try { return f(); } finally { bindGame(was); } };
const reg = (def: any) => { if (!BUILD[def.id]) { BUILDS.push(def); BUILD[def.id] = def; } return def.id; };

// ---------- the squads and the fights ----------
export const SQUADS: Record<string, string[]> = {
  sigil: ['opt_gun', 'tank', 'sigil', 'calls'], // the fit's own squad (rules 1.15)
  guns: ['opt_gun', 'tank', 'plain_gun', 'calls'],
  outburst: ['opt_gun', 'tank', 'outburst', 'calls'],
  healer: ['opt_gun', 'tank', 'mender', 'calls'], // a dedicated Soul healer in the caster's place
};
export const FIGHTS: Record<string, string[]> = { standard: ['soldier', 'soldier', 'soldier', 'elite'], elite: ['elite', 'elite', 'soldier', 'soldier'], boss: ['boss', 'soldier', 'soldier'] };
/** Leon's targets (rules 1.15, "The fit"): rounds to win. */
export const TARGET: Record<string, [number, number]> = { standard: [4, 6], elite: [6, 8], boss: [8, 10] };
export interface FightRow { squad: string; fight: string; level: number; map: string; n: number; won: number; rounds: number; anyDown: number; downs: number; timeouts: number; errors: number; downBy: Record<string, number> }
export function fightRow(squad: string, fight: string, level: number, map: 'open' | 'cover', n: number, maxRounds = 20): FightRow {
  let wins = 0, wr = 0, any = 0, downs = 0, to = 0, errors = 0; const downBy: Record<string, number> = {};
  for (let i = 0; i < n; i++) {
    const r = runFight({ pcs: SQUADS[squad].map((b) => ({ build: b, variant: 'normal', level })), foes: FIGHTS[fight].map((t) => ({ tier: t })), map, seed: ['DEF', squad, fight, level, map, i].join('-'), maxRounds });
    if (r.win) { wins++; wr += r.rounds; } if (r.timeout) to++; errors += r.errors.length;
    const d = r.pcs.filter((p) => p.downedRound != null); downs += d.length; if (d.length) any++;
    for (const p of d) downBy[p.build] = (downBy[p.build] || 0) + 1;
  }
  return { squad, fight, level, map, n, won: pct(wins, n), rounds: wins ? r1(wr / wins) : 0, anyDown: pct(any, n), downs: r1(downs / n), timeouts: to, errors, downBy };
}
export const fightLine = (r: FightRow) => r.squad + ' · ' + r.fight + ' L' + r.level + ' ' + r.map + ': ' + r.rounds + ' rounds · won ' + r.won + '% · someone Down in ' + r.anyDown + '% (' + r.downs + ' a fight' + (Object.keys(r.downBy).length ? ': ' + Object.entries(r.downBy).map(([k, v]) => k + ' ' + v).join(', ') : '') + ')' + (r.timeouts ? ' · ' + r.timeouts + ' ran to the stop' : '') + (r.errors ? ' · ERRORS ' + r.errors : '');

// ---------- the medic (a policy for the Soul healer's class moves: no spell is cast) ----------
/** The Soul healer of the heal pass (a Bard: Triage from rank I, Stim Throw from Insight 5 and level 6) with a medic's
 * kit: three stims in the pack (the medic kit's own count) and its Supplies. It never casts. */
reg({ ...BUILD.mender, id: 'medic', label: 'Medic (Bard, no magic)', policy: 'medic', tweak: (c: any) => { c.stims = 3; } });
const allowed = (x: Ctx, s: Step | null) => (s && !x.banned.has(JSON.stringify(s.action)) ? s : null);
/** Triage the most wounded ally (2 AP, next to it, once an ally a turn), then a dose while one is worth it (a thrown
 * stim for a Supply from 4 tiles, or a stim from the pack next to it), then the weapon. opts.doses: the most doses a
 * turn (default 1: supplies are for the fight, not the round); opts.noDoses: Triage only. */
export const medic: Policy = (x) => {
  const u = x.u, o = x.opts || {}, M = x.memo;
  if (M.round !== x.cb.round) { M.round = x.cb.round; M.tri = {}; M.doses = 0; }
  const hurt = x.allies.filter((v: any) => !v.dead && !v.downed && v.hp < v.maxHp - 4).sort((a: any, b: any) => a.hp / a.maxHp - b.hp / b.maxHp), t = hurt[0];
  if (!t) return stand(x);
  const hm = W(x.g, () => healingMult(x.c)) * mendFactor(x.c.level), dose = STIM_HEAL * hm, has = (id: string) => (u.items || u.held || []).some?.((q: any) => (q.key || q.id) === id);
  const maxDoses = o.noDoses ? 0 : o.doses ?? 1, worth = t.maxHp - t.hp >= dose * 0.8;
  if (M.doses < maxDoses && worth && u.ap >= 1 && (u.res?.supplies || 0) > 0 && dist(u.pos, t.pos) <= 4) { const s = allowed(x, { action: { type: 'combat/perk', id: 'class:medic.stim_throw', actionId: 'stim_throw', targetId: t.id }, kind: 'other', label: 'Stim Throw' }); if (s) { M.doses++; return s; } }
  if (dist(u.pos, t.pos) > 1) {
    const P = W(x.g, () => paths(x.cb, u.pos, u.id)), taken = new Set(x.cb.units.filter((v: any) => v.id !== u.id && !v.dead).map((v: any) => v.pos));
    const q = Object.entries(P.dist as Record<string, number>).filter(([k, n]) => k !== u.pos && n > 0 && !taken.has(k) && dist(k, t.pos) <= 1).map(([k, n]) => ({ k, ap: apForTiles(n, u.bank || 0, u.movement) })).filter((v) => v.ap <= u.ap - 1).sort((a, b) => a.ap - b.ap)[0];
    if (q) { const s = allowed(x, { action: { type: 'combat/move', to: q.k }, kind: 'move', label: 'move' }); if (s) return s; }
    return stand(x);
  }
  if (!M.tri[t.id] && u.ap >= 2) { const s = allowed(x, { action: { type: 'combat/perk', id: 'class:medic.triage', actionId: 'triage', targetId: t.id }, kind: 'other', label: 'Triage' }); if (s) { M.tri[t.id] = true; return s; } }
  if (M.doses < maxDoses && worth && u.ap >= 1 && (x.c.stims || 0) > 0) { const s = allowed(x, { action: { type: 'combat/stim', targetId: t.id }, kind: 'other', label: 'Stim' }); if (s) { M.doses++; return s; } }
  void has;
  return stand(x);
};
Object.assign(POLICIES, { medic });

// ---------- the pair (or trio) under fire, with the healer weight on or off ----------
export interface PairRow { what: string; level: number; soldiers: number; n: number; focus: boolean; firstDown: number; neverDown: number; healerFirst: number; firstFirst: number; healerTaken: number; firstTaken: number; casts: number; errors: number }
const FOCUS0: Record<string, number> = {};
/** Turn the enemy AI's healer weight off (the control) or back on, for every tier and sandbag. */
export function healerWeight(on: boolean) { for (const [id, e] of Object.entries(ENEMY) as any) { if (FOCUS0[id] == null) FOCUS0[id] = e.healer_focus || 0; e.healer_focus = on ? FOCUS0[id] : 0; } }
/** `first` (default the plain rifleman, standing and shooting) and the supporters under `soldiers` enemies of `tier`
 * that never fall, `n` fights of at most 10 rounds on the 16 × 11 ground. firstDown: rounds played before anyone went
 * Down (10: nobody did). healerFirst: the share of fights in which a supporter was the first Down. */
export function pairFire(what: string, seconds: { build: string; variant?: string; policy: string; opts?: any }[], level: number, soldiers: number, n: number, o: { tier?: string; first?: string; focus?: boolean; map?: string } = {}): PairRow {
  let first = 0, never = 0, hf = 0, ff = 0, ht = 0, ft = 0, casts = 0, errors = 0, rounds = 0;
  healerWeight(o.focus !== false);
  try {
    for (let i = 0; i < n; i++) {
      const r = runFight({ pcs: [{ build: o.first || 'plain_gun', variant: 'normal', level, policy: o.first && o.first !== 'plain_gun' ? BUILD[o.first].policy : 'stand' }, ...seconds.map((q) => ({ build: q.build, variant: (q.variant || 'normal') as any, level, policy: q.policy, ...(q.opts ? { opts: q.opts } : {}) }))],
        foes: Array(soldiers).fill({ tier: o.tier || 'sim_bag_soldier' }), map: (o.map || 'old') as any, seed: ['HEAL', level, soldiers, i].join('-'), maxRounds: 10 });
      const ds = r.pcs.map((p, k) => ({ k, d: p.downedRound })).filter((q) => q.d != null).sort((a, b) => a.d - b.d), d = ds[0];
      first += d ? d.d - 1 : 10; if (!d) never++; else if (d.k === 0) ff++; else hf++;
      ft += r.pcs[0].taken; ht += r.pcs.slice(1).reduce((t, p) => t + p.taken, 0); rounds += r.rounds; errors += r.errors.length;
      for (const p of r.pcs.slice(1)) casts += Object.entries(p.actions).filter(([k]) => /^(Release|Evoke|Hymn|Whisper|Triage|Stim)/.test(k)).reduce((t, [, v]) => t + (v as number), 0);
    }
  } finally { healerWeight(true); }
  return { what, level, soldiers, n, focus: o.focus !== false, firstDown: r1(first / n), neverDown: pct(never, n), healerFirst: pct(hf, n), firstFirst: pct(ff, n), healerTaken: r1(ht / Math.max(1, rounds)), firstTaken: r1(ft / Math.max(1, rounds)), casts: r1(casts / n), errors };
}
export const pairLine = (r: PairRow) => r.what + ' L' + r.level + ' under ' + r.soldiers + (r.focus ? '' : ' (healer weight OFF)') + ': first Down after ' + r.firstDown + ' rounds · nobody Down in ' + r.neverDown + '% · a supporter first in ' + r.healerFirst + '%, the one they support first in ' + r.firstFirst + '% · taken a round: supporters ' + r.healerTaken + ', the supported ' + r.firstTaken + ' · ' + r.casts + ' heals a fight' + (r.errors ? ' · ERRORS ' + r.errors : '');
/** The rows of the heal pass's two tables (rules 1.20, section 8), by name. */
const S = (build: string, policy: string, opts?: any, variant = 'normal') => ({ build, variant, policy, ...(opts ? { opts } : {}) });
export const PAIRS: Record<string, { label: string; seconds: any[]; first?: string }> = {
  idle: { label: 'standing idle (the control)', seconds: [S('mender', 'idle')] },
  mender: { label: 'a Soul healer (Bard, Empathy first), healing', seconds: [S('mender', 'ob_heal')] },
  channeler: { label: 'the Outburst caster (Channeler), healing', seconds: [S('outburst_s', 'ob_heal')] },
  inverse: { label: 'the Outburst caster, Inverse shields', seconds: [S('outburst_s', 'ob_heal', { design: 'aegis' })] },
  mend2: { label: 'the Sigil caster, MEND · SEEK every turn', seconds: [S('sigil_s', 'sigil_boon', { words: ['mend', 'seek'] })] },
  mend4: { label: 'the Sigil caster, the full MEND Line', seconds: [S('sigil_s', 'sigil_boon', { words: ['mend', 'mend', 'condense', 'seek'] })] },
  medic: { label: 'the medic: Triage every turn and one dose a turn while they last (no magic)', seconds: [S('medic', 'medic')] },
  triage: { label: 'the medic: Triage only', seconds: [S('medic', 'medic', { noDoses: true })] },
  idle2: { label: 'two Soul healers standing idle (the control)', seconds: [S('mender', 'idle'), S('mender', 'idle')] },
  mender2: { label: 'two Soul healers, healing', seconds: [S('mender', 'ob_heal'), S('mender', 'ob_heal')] },
  allin2: { label: 'two all-in Soul healers', seconds: [S('mender', 'ob_heal', undefined, 'allin'), S('mender', 'ob_heal', undefined, 'allin')] },
  pair: { label: 'a Soul healer and an Inverse shielder', seconds: [S('mender', 'ob_heal'), S('outburst_s', 'ob_heal', { design: 'aegis' })] },
  tank: { label: 'the tank and a dedicated Soul healer', seconds: [S('mender', 'ob_heal')], first: 'tank' },
  tankIdle: { label: 'the tank and an idle Soul healer (the control)', seconds: [S('mender', 'idle')], first: 'tank' },
};

// ---------- the yardstick under fire, on either ground ----------
reg({ ...BUILD.plain_gun, id: 'plain_gun_f', label: 'Plain gun (no Duck and Roll)', classId: 'fighter' });
export function yardFire(level: number, n: number, o: { map?: string; build?: string; foes?: string[] } = {}) {
  let taken = 0, ft = 0, lasted = 0, by3 = 0, atk = 0, hits = 0;
  for (let i = 0; i < n; i++) {
    const r = runFight({ pcs: [{ build: o.build || 'plain_gun', variant: 'normal', level }], foes: (o.foes || ['sim_bag_soldier', 'sim_bag_soldier']).map((t) => ({ tier: t })), map: (o.map || 'old') as any, seed: ['FIRE', 'plain_gun', level, 'soldiers', i].join('-'), maxRounds: 10 }), p = r.pcs[0];
    taken += p.taken; ft += r.foeTurns; lasted += p.downedRound != null ? p.downedRound - 1 : 10; if (p.downedRound != null && p.downedRound <= 3) by3++; atk += p.foeAttacks; hits += p.foeHits;
  }
  return { level, map: o.map || 'old', build: o.build || 'plain_gun', lasted: r1(lasted / n), by3: pct(by3, n), perFoeTurn: r1(taken / Math.max(1, ft)), rolls: r1(atk / Math.max(1, ft)), hit: pct(hits, atk) };
}

// ---------- the medic's kit against the yardstick ----------
export interface MedicRow { who: string; level: number; healGiven: number; triage: number; triagePct: number; triagePerAp: number; stim: number; stimPct: number; rally: number; rallyPct: number; triageRest: number; before: { triage: number; triagePct: number; stim: number; stimPct: number }; magicPerAp: number | null }
/** For one giver at one level: what Triage (2 AP), a dose (1 AP) and Rally (2 AP, each ally) restore, as HP and as a
 * percent of one Soldier-turn; before rules 1.23 (20, 30 and 20 × Healing given, no level factor); and what the same
 * character's steady turn of Outburst healing gives per AP (the heal pass's inventory), where it has one. */
export function medicRow(who: string, build: string, variant: string, level: number): MedicRow {
  const { g, c } = unitOf(build, variant, level), hm = W(g, () => healingMult(c)), lf = mendFactor(level), st = SOLDIER_TURN[level];
  const tri = Math.floor(TRIAGE_HEAL * hm * lf), stim = Math.floor(STIM_HEAL * hm * lf), rally = Math.floor(RALLY_HEAL * hm * lf);
  let magic: number | null = null;
  try { const row = inventory(build, variant, level).find((r: any) => /^Buff heal, steady/.test(r.what)); if (row) magic = r1(row.pctNow / 6); } catch { /* no Soul magic */ }
  return { who, level, healGiven: Math.round(hm * 100) / 100, triage: tri, triagePct: pct(tri, st), triagePerAp: r1(pct(tri, st) / 2), stim, stimPct: pct(stim, st), rally, rallyPct: pct(rally, st), triageRest: Math.floor(TRIAGE_HEAL * hm * lf * TRIAGE_REST_MULT),
    before: { triage: Math.floor(20 * hm), triagePct: pct(Math.floor(20 * hm), st), stim: Math.floor(30 * hm), stimPct: pct(Math.floor(30 * hm), st) }, magicPerAp: magic };
}
export const medicLine = (r: MedicRow) => r.who + ' L' + r.level + ' (Healing given ×' + r.healGiven + '): Triage ' + r.triage + ' · ' + r.triagePct + '% (' + r.triagePerAp + '% an AP; before ' + r.before.triage + ' · ' + r.before.triagePct + '%) · a dose ' + r.stim + ' · ' + r.stimPct + '% (before ' + r.before.stim + ' · ' + r.before.stimPct + '%) · Rally ' + r.rally + ' each · ' + r.rallyPct + '% · out of a fight ' + r.triageRest + (r.magicPerAp != null ? ' · the same character\'s steady Outburst heal: ' + r.magicPerAp + '% an AP' : '');
export { SOLDIER_TURN, RIFLEMAN_HP };
void MAP_ID; void TIER_WEAPON; void plain;

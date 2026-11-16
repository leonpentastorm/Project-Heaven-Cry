// @ts-nocheck (a measuring tool, like the rest of test/balance)
// THE PARTY FIT, 0.30 (docs/design/proposals/2026-11-party-fit.md). Why does a party do worse in Survival's stage 1
// than its members alone? Each party plays stage 1 through the run simulator (survival-run.ts simRun, the reducer's own
// actions, the doors' policies of door-policies.ts) and every fight is instrumented on the hook bus during the real
// reducer's actions only (an event on a copy a policy or the enemy AI previews is dropped, as tank-measure.ts does):
//   foes per head, the fight's map size and its spawn distance (each character's distance to the nearest foe at the
//   start), the gun-armed foes, the foes' turns before each character's first (initiative), enemy attacks a round per
//   head, damage taken per head (HP removed), the share of the foes' attacks on the most-attacked character (focus
//   fire), who is Downed first and when, damage and Downs in rounds 1 and 2 (the opening volley), friendly fire (a
//   character's damage to a character), healing given and healing wasted (over a full bar), AP left unspent at the end
//   of a character's turn, rounds a fight.
// The counterfactual LEVERS (the budget's and the map's numbers changed in memory for one measure, never in the data;
// the cooperation wrapper is a policy): `perhead` every party budget term at the solo's per head (pressure, the Elite's
// and Boss's spawn share times N, max foes times N), `focus` every member shoots the party's one focus target when it
// can (the foe lowest on HP), `smallmap` every fight on the solo's map (16 tiles), `duopress` the duo's pressure a head
// at the solo's (pressure_per_char[1] = [0]; nothing else), `revive` a member Downed in a won fight stands up at REVIVE_HP.
import { onHook } from '../../src/effects/hooks';
import { ENC_BUDGET, WEAPON, isMelee, dist } from '../../src';
import svJ from '../../../../data/survival.json';
import { Rec } from '../helpers/replay';
import { simRun, MEMBER, MEMBER_OLD, PARTIES } from './survival-run';
import { POLICIES } from './policies';
import { DOOR_MEMBERS, DOORS } from './door-builds';
import './door-policies';

// ---------------------------------------------------------------------------------------------- the cells
for (const [k, v] of Object.entries(DOOR_MEMBERS)) { (MEMBER as any)[k] = v; (MEMBER_OLD as any)[k] = v; }
export const CELLS: Record<string, string[]> = {};
for (const d of DOORS) { CELLS['solo_' + d] = [d]; CELLS['duo_' + d] = [d, d]; CELLS['quad_' + d] = [d, d, d, d]; }
Object.assign(CELLS, {
  mix_tank_gun: ['bulwark', 'skirmisher'], mix_tank_heal: ['bulwark', 'mender'], mix_gun_heal: ['skirmisher', 'mender'],
  mix_tgh_caster: ['bulwark', 'skirmisher', 'mender', 'sigilist'],
  mix_breaker_channeler: ['breaker', 'channeler'], mix_operative_rigger: ['operative', 'rigger'], mix_chaplain_monk: ['chaplain', 'monk'],
  mix_four_rest: ['breaker', 'operative', 'channeler', 'chaplain'],
  // the fit's added cells (0.30): trios (the trio's budget row was unmeasured) and a second sensible four
  trio_skirmisher: ['skirmisher', 'skirmisher', 'skirmisher'], trio_channeler: ['channeler', 'channeler', 'channeler'], trio_breaker: ['breaker', 'breaker', 'breaker'],
  mix_trio: ['breaker', 'skirmisher', 'mender'], mix_four_b: ['monk', 'skirmisher', 'chaplain', 'channeler'],
});
// the controls: the same sheet played without its door (is the door's policy the problem, or the door?; with the doors'
// dry-gun fallback, door-policies.ts fists, since the lead's review of 16 Nov 2026), and the
// guard's own gunner (plain_gun, normal share: the earlier reports' "solo gunner")
const CONTROL: Record<string, any> = {
  bulwark_plain: { build: 'wall', variant: 'allin', level: 1, policy: 'tankDry' }, operative_gun: { build: 'phantom', variant: 'allin', level: 1, policy: 'gunnerDry' },
  mender_gun: { build: 'heartreader', variant: 'allin', level: 1, policy: 'gunnerDry' }, monk_plain: { build: 'opt_blade', variant: 'allin', level: 1, policy: 'optimisedTac', camp: 'hand_wraps' },
};
for (const [k, v] of Object.entries(CONTROL)) { (MEMBER as any)[k] = v; (MEMBER_OLD as any)[k] = v; }
Object.assign(CELLS, { ctl_bulwark_tank: ['bulwark_plain'], ctl_operative_gun: ['operative_gun'], ctl_mender_gun: ['mender_gun'], ctl_monk_plain: ['monk_plain'], ctl_gunner_normal: ['gunner'] });
Object.assign(PARTIES, CELLS);

// ---------------------------------------------------------------------------------------------- the levers
const SV: any = svJ;
/** Lever `revive`: a character dead in a won fight stands up at this HP in place of the data's run.dead_return_hp (1 when the lever was measured; 50 since the fit, rules 1.57, so the lever is the data's now). */
export const REVIVE_HP = 50;
export function withLever<T>(lever: string | undefined, n: number, f: () => T): T {
  const was = { ret: SV.run.dead_return_hp, p: ENC_BUDGET.pressurePerChar, m: ENC_BUDGET.maxFoes, s: ENC_BUDGET.share, steps: SV.map_size.steps };
  try {
    if (lever === 'perhead') {
      const p1 = was.p[0], m1 = was.m[0], sh = (row: number[]) => row.map((_, i) => row[0] * (i + 1));
      ENC_BUDGET.pressurePerChar = was.p.map(() => p1); ENC_BUDGET.maxFoes = was.m.map((_: number, i: number) => m1 * (i + 1));
      ENC_BUDGET.share = { boss: { hp: sh(was.s.boss.hp), damage: sh(was.s.boss.damage) }, elite: { hp: sh(was.s.elite.hp), damage: sh(was.s.elite.damage) } } as any;
    }
    if (lever === 'duopress') ENC_BUDGET.pressurePerChar = was.p.map((v: number, i: number) => (i === 1 ? was.p[0] : v)); // the duo's pressure a head at the solo's, nothing else
    if (lever === 'revive') SV.run.dead_return_hp = REVIVE_HP;
    if (lever === 'smallmap') SV.map_size.steps = [{ units: 99, size: was.steps[0].size }];
    // lever `set:` (the fit's candidates, in memory only): `set:p=1.3/1.3/1.2/0.9;ret=50;m=4/6/8/10`
    if (lever && lever.startsWith('set:')) for (const kv of lever.slice(4).split(';')) {
      const [k, v] = kv.split('='), arr = v.split('/').map(Number);
      if (k === 'p') ENC_BUDGET.pressurePerChar = arr; if (k === 'm') ENC_BUDGET.maxFoes = arr; if (k === 'ret') SV.run.dead_return_hp = arr[0];
    }
    void n;
    return f();
  } finally { SV.run.dead_return_hp = was.ret; ENC_BUDGET.pressurePerChar = was.p; ENC_BUDGET.maxFoes = was.m; ENC_BUDGET.share = was.s; SV.map_size.steps = was.steps; }
}
/** The cooperation wrapper (lever `focus`): the party's focus target is the visible foe lowest on HP (ties: the first
 * in the fight's order); a member first plays its policy against that foe alone, and only when that gives no attack
 * (it cannot reach it this action) against them all. */
const FOCUS = { on: false };
const focusWrap = (pol: any) => { const w = (x: any) => {
  if (!FOCUS.on || !x.allies.length || x.foes.length < 2) return pol(x);
  const t = [...x.foes].sort((a, b) => a.hp - b.hp || x.cb.order.indexOf(a.id) - x.cb.order.indexOf(b.id))[0];
  const s = pol({ ...x, foes: [t] });
  if (s && (s.kind === 'attack' || s.kind === 'technique' || s.kind === 'spell' || s.kind === 'prayer' || s.kind === 'setup' || s.kind === 'other')) return s;
  return pol(x);
}; (w as any).after = pol.after; return w; };
for (const k of Object.keys(POLICIES)) if (!(POLICIES[k] as any).__focus) { const w = focusWrap(POLICIES[k]); (w as any).__focus = true; POLICIES[k] = w; }

// ---------------------------------------------------------------------------------------------- the instrument
export interface FightStat { kind: string; n: number; foes: number; gunFoes: number; map: number; spawn: number; spawnGun: number; firstTurnFoesBefore: number; rounds: number; won: boolean;
  attacks: number; attacksR12: number; hitsR12: number; dmgTaken: number; dmgR12: number; downs: number; downsR12: number; focus: number; firstDown: string | null; firstDownRound: number | null;
  ff: number; ffHits: number; healed: number; healWasted: number; apLeft: number; turns: number; perChar: { door: string; dmg: number; attacksOn: number; downs: number }[] }
let LIVE: { cb: any; round: number; st: FightStat; ids: Record<string, number> } | null = null;
let PEND: (() => void)[] = []; let ON = false;
const pcOf = (u: any) => u && u.side === 'pc' && !u.companion;
onHook('damage_in', (ctx: any) => {
  if (!ON || ctx.phase !== 'after' || !LIVE) return; const t = ctx.t, by = ctx.src?.by, d = ctx.dealt || 0; if (!pcOf(t) || d <= 0) return;
  PEND.push(() => { const S = LIVE!.st, i = LIVE!.ids[t.charId]; if (by && by.side === 'pc') { if (by !== t) S.ff += d; return; } S.dmgTaken += d; if (LIVE!.round <= 2) S.dmgR12 += d; const k = foeKind(by); (S.by ||= {})[k] = (S.by[k] || 0) + d; if (i != null) S.perChar[i].dmg += d; });
});
onHook('on_hit', (ctx: any) => { if (!ON || !LIVE) return; const a = ctx.att, v = ctx.tgt;
  if (pcOf(v) && a && a.side !== 'pc') PEND.push(() => { const S = LIVE!.st, i = LIVE!.ids[v.charId], k = foeKind(a); S.attacks++; if (LIVE!.round <= 2) { S.attacksR12++; S.hitsR12++; } if (i != null) S.perChar[i].attacksOn++; (S.atk ||= {})[k] = (S.atk[k] || 0) + 1; (S.hit ||= {})[k] = (S.hit[k] || 0) + 1; });
  if (pcOf(v) && pcOf(a) && a !== v) PEND.push(() => { LIVE!.st.ffHits++; }); });
onHook('on_miss', (ctx: any) => { if (!ON || !LIVE) return; const a = ctx.att, v = ctx.tgt;
  if (pcOf(v) && a && a.side !== 'pc') PEND.push(() => { const S = LIVE!.st, i = LIVE!.ids[v.charId], k = foeKind(a); S.attacks++; if (LIVE!.round <= 2) S.attacksR12++; if (i != null) S.perChar[i].attacksOn++; (S.atk ||= {})[k] = (S.atk[k] || 0) + 1; }); });
onHook('on_downed', (ctx: any) => { if (!ON || !LIVE) return; const v = ctx.victim; if (!pcOf(v)) return;
  PEND.push(() => { const S = LIVE!.st, i = LIVE!.ids[v.charId]; S.downs++; if (LIVE!.round <= 2) S.downsR12++; if (i != null) S.perChar[i].downs++; if (!S.firstDown) { S.firstDown = i != null ? S.perChar[i].door : '?'; S.firstDownRound = LIVE!.round; } }); });
onHook('heal_given', (ctx: any) => { if (!ON || !LIVE) return; const t = ctx.t; if (!pcOf(t)) return; PEND.push(() => { LIVE!.st.healed += ctx.n || 0; LIVE!.st.healWasted += ctx.over || 0; }); });

/** Accepted actions a door's characters made, by kind (the policies' audit: does each door play its verbs?). */
export let VERBS: Record<string, Record<string, number>> = {};
const verbKey = (a: any) => a.type.replace('combat/', '') + (a.id ? ':' + a.id : '') + (a.actionId ? '#' + a.actionId : '') + (a.verb ? ':' + a.verb : '') + (a.feeling ? '(' + a.feeling + ')' : '') + (a.mods ? '[' + a.mods.map((m: string) => m.split('#').pop()).join(',') + ']' : '') + (a.kind && a.type === 'combat/pray' ? ':' + a.kind : '');
/** A foe by how it fights: a caster (Sigil or heart), a gun, else melee (or anything else); none: a hazard, a burn. */
const foeKind = (u: any) => (!u ? 'other' : u.caster ? 'caster' : gunArmed(u) ? 'gun' : 'melee');
const gunArmed = (u: any) => { const w: any = WEAPON[u.weapon]; return !!w && !isMelee(w) && !!w.ammo; };
function begin(cb: any, doors: string[]): FightStat {
  const pcs = cb.units.filter(pcOf), foes = cb.units.filter((u: any) => u.side !== 'pc' && !u.companion), guns = foes.filter(gunArmed);
  const near = (u: any, fs: any[]) => (fs.length ? Math.min(...fs.map((f) => dist(u.pos, f.pos))) : 0);
  const order: string[] = cb.order || [];
  const before = pcs.map((u: any) => order.slice(0, Math.max(0, order.indexOf(u.id))).filter((id) => foes.some((f: any) => f.id === id)).length);
  return { kind: '', n: pcs.length, foes: foes.length, gunFoes: guns.length, map: cb.map?.w || 0, spawn: pcs.reduce((t: number, u: any) => t + near(u, foes), 0) / Math.max(1, pcs.length), spawnGun: guns.length ? pcs.reduce((t: number, u: any) => t + near(u, guns), 0) / pcs.length : NaN,
    firstTurnFoesBefore: before.reduce((t: number, x: number) => t + x, 0) / Math.max(1, before.length), rounds: 0, won: false, attacks: 0, attacksR12: 0, hitsR12: 0, dmgTaken: 0, dmgR12: 0, downs: 0, downsR12: 0, focus: 0,
    firstDown: null, firstDownRound: null, ff: 0, ffHits: 0, healed: 0, healWasted: 0, apLeft: 0, turns: 0, perChar: pcs.map((u: any) => ({ door: doors[Number(String(u.charId).slice(1)) - 1] || '?', dmg: 0, attacksOn: 0, downs: 0 })) };
}

export interface PartyRun { cell: string; lever: string; seed: string; cleared: boolean; how: string; depth: number; fights: FightStat[]; lvlBoss: number | null; errors: number }
/** Stage 1 of one party on one seed, every fight instrumented. */
/** How many stages a run may play (PF_STAGES, default 1); `cleared` is still stage 1, `stages` how many were cleared. */
const STAGES = Number(((globalThis as any).process?.env || {}).PF_STAGES || 1);
export function partyRun(cell: string, seed: string, lever = 'none'): PartyRun {
  const doors = PARTIES[cell], n = doors.length, fights: FightStat[] = [];
  const P: any = Rec.prototype, fight0 = P.fight;
  P.fight = function (this: any, ...args: any[]) {
    if (!this.__party) {
      this.__party = true; const a0 = this.act.bind(this);
      this.act = (a: any, who?: string) => {
        const cb0 = this.g.combat;
        if (cb0 && LIVE && LIVE.cb !== cb0 && LIVE.cb?.name === cb0.name) LIVE.cb = cb0;
        if (cb0 && LIVE) { LIVE.round = cb0.round; if (a.type === 'combat/end-turn') { const u = cb0.units.find((q: any) => q.id === a.unitId); if (pcOf(u) && !u.downed && !u.dead) { LIVE.st.apLeft += Math.max(0, u.ap || 0); LIVE.st.turns++; } } }
        PEND = []; ON = !!LIVE; let e; try { e = a0(a, who); } finally { ON = false; }
        if (!e) for (const f of PEND) f(); PEND = [];
        if (!e && cb0 && LIVE && String(a.type).startsWith('combat/') && a.unitId) { const u = cb0.units.find((q: any) => q.id === a.unitId); if (pcOf(u)) { const i = LIVE.ids[u.charId], k = verbKey(a); if (i != null) { const v = (VERBS[LIVE.st.perChar[i].door] ||= {}); v[k] = (v[k] || 0) + 1; } } }
        return e;
      };
    }
    const cb = this.g.combat; if (!cb) return fight0.apply(this, args);
    const st = begin(cb, doors), ids: Record<string, number> = {}; cb.units.filter(pcOf).forEach((u: any, i: number) => { ids[u.charId] = i; });
    LIVE = { cb, round: cb.round, st, ids };
    try { return fight0.apply(this, args); } finally {
      const c2 = this.g.combat; st.rounds = c2?.round || cb.round; st.won = !!(c2 && (c2.field || (c2.over && c2.over !== 'lost'))) || (this.g.phase !== 'lobby' && this.g.run?.state !== 'over');
      const on = st.perChar.map((q) => q.attacksOn); st.focus = st.attacks ? Math.max(...on) / st.attacks : 0;
      fights.push(st); LIVE = null;
    }
  };
  let res: any; VERBS = {};
  try { FOCUS.on = lever === 'focus'; res = withLever(lever, n, () => simRun({ party: cell, route: 'gear', seed, maxStages: STAGES, maxFightRounds: 20 })); }
  finally { P.fight = fight0; FOCUS.on = false; LIVE = null; }
  res.fights.forEach((f: any, i: number) => { if (fights[i]) { fights[i].kind = f.kind; fights[i].won = f.won; fights[i].rounds = f.rounds;
    // HP entering it (the stop's record): the lowest member's share, and the members at 10% or less (a Downed member of a won fight stands up at 1 HP)
    const stop = (res.stops || []).find((q: any) => q.stage === f.stage && q.depth === f.depth); if (stop) { (fights[i] as any).enterMin = Math.min(...stop.hpEach); (fights[i] as any).enterLow = stop.hpEach.filter((h: number) => h <= 0.1).length; } } });
  const boss = res.fights.find((f: any) => f.kind === 'boss');
  return { cell, lever, seed, stages: res.cleared, cleared: res.cleared >= 1, how: res.how, depth: res.depth, fights, lvlBoss: boss?.lvl ? boss.lvl.reduce((t: number, x: number) => t + x, 0) / boss.lvl.length : null, verbs: VERBS, errors: res.errors.length, err: res.errors.slice(0, 2).map((e: string) => e.slice(0, 900)) };
}

// ---------------------------------------------------------------------------------------------- the tables
const mean = (xs: number[]) => { const v = xs.filter((q) => Number.isFinite(q)); return v.length ? v.reduce((t, q) => t + q, 0) / v.length : NaN; };
const f1 = (x: number) => (Number.isFinite(x) ? (Math.round(x * 10) / 10).toString() : '-'), f2 = (x: number) => (Number.isFinite(x) ? (Math.round(x * 100) / 100).toString() : '-'), pc0 = (x: number) => (Number.isFinite(x) ? Math.round(100 * x) + '%' : '-');
/** One cell's numbers (every run of it under one lever). */
export function cellStats(rs: PartyRun[]) {
  const n = rs[0] ? PARTIES[rs[0].cell].length : 1, fs = rs.flatMap((r) => r.fights), clear = rs.filter((r) => r.cleared).length / Math.max(1, rs.length);
  const roundsOf = (k: string[]) => mean(fs.filter((f) => k.includes(f.kind) && f.won).map((f) => f.rounds));
  const dmg = fs.reduce((t, f) => t + f.dmgTaken, 0);
  return { n, runs: rs.length, clear, se: Math.sqrt(clear * (1 - clear) / Math.max(1, rs.length)), fights: mean(rs.map((r) => r.fights.length)),
    rPlain: roundsOf(['fight']), rElite: roundsOf(['elite', 'gate', 'vault_guard']), rBoss: roundsOf(['boss']),
    lost: rs.filter((r) => r.how === 'lost').length, stalled: rs.filter((r) => r.how === 'stalled').length,
    foesHead: mean(fs.map((f) => f.foes / f.n)), gunHead: mean(fs.map((f) => f.gunFoes / f.n)), map: mean(fs.map((f) => f.map)), spawn: mean(fs.map((f) => f.spawn)), spawnGun: mean(fs.map((f) => f.spawnGun)), before: mean(fs.map((f) => f.firstTurnFoesBefore)),
    atkRoundHead: mean(fs.map((f) => f.attacks / Math.max(1, f.rounds) / f.n)), dmgHead: mean(fs.map((f) => f.dmgTaken / f.n)), dmgHeadRound: mean(fs.map((f) => f.dmgTaken / Math.max(1, f.rounds) / f.n)),
    r12dmg: dmg ? fs.reduce((t, f) => t + f.dmgR12, 0) / dmg : NaN, r12downs: (() => { const d = fs.reduce((t, f) => t + f.downs, 0); return d ? fs.reduce((t, f) => t + f.downsR12, 0) / d : NaN; })(),
    r12atkHead: mean(fs.map((f) => f.attacksR12 / f.n)), r12hitPct: (() => { const a = fs.reduce((t, f) => t + f.attacksR12, 0); return a ? fs.reduce((t, f) => t + f.hitsR12, 0) / a : NaN; })(),
    downsFight: mean(fs.map((f) => f.downs)), focus: mean(fs.filter((f) => f.n > 1 && f.attacks > 0).map((f) => f.focus)), ff: mean(fs.map((f) => f.ff)), ffShare: (() => { const a = fs.reduce((t, f) => t + f.ff, 0); return dmg + a ? a / (dmg + a) : NaN; })(),
    healed: mean(fs.map((f) => f.healed)), wasted: (() => { const h = fs.reduce((t, f) => t + f.healed + f.healWasted, 0); return h ? fs.reduce((t, f) => t + f.healWasted, 0) / h : NaN; })(),
    apLeft: (() => { const t = fs.reduce((s, f) => s + f.turns, 0); return t ? fs.reduce((s, f) => s + f.apLeft, 0) / t : NaN; })(), lvlBoss: mean(rs.map((r) => r.lvlBoss ?? NaN)),
    firstDown: (() => { const m: Record<string, number> = {}; for (const f of fs) if (f.firstDown) m[f.firstDown] = (m[f.firstDown] || 0) + 1; return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ' ' + v).join(', '); })() };
}
export function report(all: PartyRun[]): string {
  const last = new Map<string, PartyRun>(); for (const r of all) last.set(r.cell + '|' + r.lever + '|' + r.seed, r); // a later file's run of the same cell, lever and seed replaces it
  const runs = [...last.values()];
  const by = new Map<string, PartyRun[]>(); for (const r of runs) { const k = r.cell + '|' + r.lever; if (!by.has(k)) by.set(k, []); by.get(k)!.push(r); }
  const S = (cell: string, lever = 'none') => (by.has(cell + '|' + lever) ? cellStats(by.get(cell + '|' + lever)!) : null);
  const out: string[] = [], cells = [...new Set(runs.map((r) => r.cell))];
  out.push('| Cell | N | Runs | Clear stage 1 (± SE) | Lost / stalled | Fights | Rounds: plain, Elite, Boss | Foes a head | Gun foes a head | Map | Spawn distance (to a gun) | Foe turns before a character\'s first | Enemy attacks a round a head | Damage taken a head a fight | Same, a round | Rounds 1-2: share of damage, of Downs; attacks a head; hit % | Downs a fight | Focus share | Friendly fire a fight (share) | Healed a fight (wasted) | AP left a turn | Level at the Boss | Downed first |');
  out.push('|' + ' --- |'.repeat(23));
  for (const c of cells) { const s = S(c); if (!s) continue;
    out.push('| ' + c + ' | ' + s.n + ' | ' + s.runs + ' | ' + pc0(s.clear) + ' ± ' + Math.round(100 * s.se) + ' | ' + s.lost + ' / ' + s.stalled + ' | ' + f1(s.fights) + ' | ' + f1(s.rPlain) + ', ' + f1(s.rElite) + ', ' + f1(s.rBoss) + ' | ' + f2(s.foesHead) + ' | ' + f2(s.gunHead) + ' | ' + f1(s.map) + ' | ' + f1(s.spawn) + ' (' + f1(s.spawnGun) + ') | ' + f1(s.before)
      + ' | ' + f2(s.atkRoundHead) + ' | ' + f1(s.dmgHead) + ' | ' + f1(s.dmgHeadRound) + ' | ' + pc0(s.r12dmg) + ', ' + pc0(s.r12downs) + '; ' + f1(s.r12atkHead) + '; ' + pc0(s.r12hitPct) + ' | ' + f2(s.downsFight) + ' | ' + pc0(s.focus) + ' | ' + f1(s.ff) + ' (' + pc0(s.ffShare) + ') | ' + f1(s.healed) + ' (' + pc0(s.wasted) + ') | ' + f1(s.apLeft) + ' | ' + f1(s.lvlBoss) + ' | ' + (s.firstDown || '-') + ' |'); }
  // HP entering the fights: a member who went down in a won fight walks on at 1 HP
  if (runs.some((r) => r.fights.some((f: any) => f.enterMin != null))) {
    out.push('', '| Cell | Fights entered with a member at 10% HP or less | Lost fights entered so | Lost fights entered with everyone above 10% |', '|' + ' --- |'.repeat(4));
    for (const c of cells) { const fs: any[] = (by.get(c + '|none') || []).flatMap((r) => r.fights).filter((f: any) => f.enterMin != null); if (!fs.length) continue;
      const low = fs.filter((f) => f.enterLow > 0), lost = fs.filter((f) => !f.won);
      out.push('| ' + c + ' | ' + pc0(low.length / fs.length) + ' (' + low.length + '/' + fs.length + ') | ' + lost.filter((f) => f.enterLow > 0).length + ' of ' + lost.length + ' | ' + lost.filter((f) => !f.enterLow).length + ' |'); }
  }
  // the foes by how they fight (the opening-volley note): damage share, hit %, attacks a fight a head
  if (runs.some((r) => r.fights.some((f: any) => f.by))) {
    out.push('', '| Cell | Damage taken from guns / melee / casters | Hit %: guns / melee / casters | Attacks a fight a head: guns / melee / casters |', '|' + ' --- |'.repeat(4));
    for (const c of cells) { const fs: any[] = (by.get(c + '|none') || []).flatMap((r) => r.fights).filter((f: any) => f.by); if (!fs.length) continue;
      const sum = (k: string, f: string) => fs.reduce((t, q) => t + ((q[f] || {})[k] || 0), 0), D = ['gun', 'melee', 'caster'], dT = D.reduce((t, k) => t + sum(k, 'by'), 0) || 1, nH = fs.reduce((t, q) => t + q.n, 0) || 1;
      out.push('| ' + c + ' | ' + D.map((k) => pc0(sum(k, 'by') / dT)).join(' / ') + ' | ' + D.map((k) => pc0(sum(k, 'hit') / Math.max(1, sum(k, 'atk')))).join(' / ') + ' | ' + D.map((k) => f1(sum(k, 'atk') / nH)).join(' / ') + ' |'); }
  }
  // the levers against the baseline, and the gap each closes
  const levers = [...new Set(runs.map((r) => r.lever))].filter((l) => l !== 'none');
  if (levers.length) {
    out.push('', '| Cell | Solo reference | Baseline | ' + levers.map((l) => l).join(' | ') + ' |', '|' + ' --- |'.repeat(3 + levers.length));
    const gap: Record<string, number> = {}, got: Record<string, number> = {}; let gapT = 0;
    for (const c of cells) { const b = S(c); if (!b || b.n < 2) continue;
      const solo = mean(PARTIES[c].map((d) => S('solo_' + d)?.clear ?? NaN)); if (!Number.isFinite(solo)) continue; const g = solo - b.clear; gapT += Math.max(0, g);
      const row = levers.map((l) => { const s = S(c, l); if (!s) return '-'; const d = s.clear - b.clear; got[l] = (got[l] || 0) + d; return pc0(s.clear) + ' (' + (d >= 0 ? '+' : '') + Math.round(100 * d) + ')'; });
      out.push('| ' + c + ' | ' + pc0(solo) + ' | ' + pc0(b.clear) + ' | ' + row.join(' | ') + ' |'); void gap; }
    out.push('', 'Gap (solo reference less the party, summed over the party cells where positive): ' + Math.round(100 * gapT) + ' points. Recovered by each lever (summed change): ' + levers.map((l) => l + ' ' + Math.round(100 * (got[l] || 0)) + ' (' + pc0((got[l] || 0) / Math.max(1e-9, gapT)) + ' of the gap)').join(', ') + '.');
  }
  return out.join('\n');
}

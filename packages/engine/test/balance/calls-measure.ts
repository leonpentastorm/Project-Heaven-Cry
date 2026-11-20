// @ts-nocheck (a measuring tool, like the rest of test/balance)
// THE CALLS MEASURE (0.33 balance lane; docs/design/proposals/2026-11-19-attribute-proposals.md sections 2.1 and 2.4).
// What each of the nine Calls is worth at its three steps (1, 4 and 8 points in its skill; rules 1.70 price: 3 AP to
// 4 points, 2 AP from 5, 1 from 9), played through the real reducer (sim.ts runFight): a squad of three (the Calls
// leader at level 3 with the Call's skill set to the points, two plain rifles at level 3) against the standard fight
// (three Soldiers and an Elite) on the ground with cover. The leader makes that one Call once a turn when the engine
// allows it (previewCall), on the best target for it, then fires its sidearm; the control is the same leader firing
// only its sidearm. Per cell: won, rounds when won, HP the squad took a round, HP the two rifles removed a fight.
//   Rally, Brief: the ally holding the hardest-hitting weapon. Order: an ally to reload (only when its gun is not full).
//   Name It, Cue, Warn: that ally too. Spot, Threaten, Taunt: the nearest foe in reach.
// The skill points are set on the finished sheet (a build's tweak: an "as if", like the reference builds' kit), the
// attribute raised to hold them; nothing else of the sheet changes. No number in data is changed here.
import { runFight } from './sim';
import { BUILD, BUILDS } from './builds';
import { FIGHTS } from './defence-measure';
import { POLICIES, plain, type Policy } from './policies';
import { SKILL, WEAPON, callPad, previewCall, dist, bindGame } from '../../src';
import callsJ from '../../../../data/calls.json';

const W = <T>(g: any, f: () => T): T => { const was = bindGame(g); try { return f(); } finally { bindGame(was); } };
const r1 = (n: number) => Math.round(n * 10) / 10;
export const CALL_IDS: string[] = (callsJ as any).items.map((c: any) => c.id);
const CALL_SKILL: Record<string, string> = Object.fromEntries((callsJ as any).items.map((c: any) => [c.id, c.skill]));
const weaponDmg = (v: any) => { const d = (WEAPON[v.weapon] as any)?.damage; return typeof d === 'number' ? d : typeof d === 'object' && d ? Math.max(...Object.values(d).map(Number).filter(Number.isFinite), 0) : 20; };

/** The leader with one skill at `pts` points (its attribute raised to hold them). */
function leader(skill: string, pts: number): string {
  const id = 'calls:' + skill + ':' + pts; if (BUILD[id]) return id;
  const def = { ...BUILD.calls, id, label: 'Calls leader, ' + skill + ' ' + pts, tweak: (c: any) => { const a = SKILL[skill].attribute; c.skills[skill] = pts; c.attrs[a] = Math.max(c.attrs[a] || 1, pts); } };
  BUILDS.push(def); BUILD[id] = def; return id;
}
/** One Call once a turn, then the sidearm. */
function oneCall(id: string): string {
  const name = 'call1:' + id; if (POLICIES[name]) return name;
  const pol: Policy = (x) => {
    const u = x.u, stamp = x.cb.round + ':' + x.cb.turn;
    if (x.memo.called !== stamp) {
      const e = W(x.g, () => callPad(x.cb, u, x.g)).find((q: any) => q.id === id);
      if (e && e.ok && e.ap <= u.ap) {
        const allies = [...x.allies].sort((a, b) => weaponDmg(b) - weaponDmg(a)), foes = [...x.foes].sort((a, b) => dist(u.pos, a.pos) - dist(u.pos, b.pos));
        for (const t of e.kind === 'hindering' ? foes : allies) {
          const args: any = { targetId: t.id };
          if (id === 'call.order') { const w: any = WEAPON[t.weapon]; if (!w || w.magazine == null || (t.ammo ?? 0) >= w.magazine) continue; args.opt = 'reload'; }
          let pv: any; try { pv = W(x.g, () => previewCall(x.cb, u, id, args, x.g)); } catch { continue; }
          if (!pv.ok) continue;
          const a = { type: 'combat/call', id, ...args };
          if (x.banned.has(JSON.stringify(a))) continue;
          x.memo.called = stamp; return { action: a, kind: 'call', label: 'Call: ' + e.name };
        }
      }
    }
    return plain(x);
  };
  POLICIES[name] = pol; return name;
}

export interface CallRow { call: string; pts: number; n: number; won: number; rounds: number; takenRound: number; riflesDealt: number; made: number; errors: number }
export function callRow(id: string | null, pts: number, n: number, level = 3): CallRow {
  const skill = id ? CALL_SKILL[id] : 'authority', b = leader(skill, pts), pol = id ? oneCall(id) : 'plain';
  let won = 0, rounds = 0, taken = 0, rr = 0, dealt = 0, errors = 0, made = 0;
  for (let i = 0; i < n; i++) {
    const r = runFight({ pcs: [{ build: b, variant: 'normal', level, policy: pol }, { build: 'plain_gun', variant: 'normal', level }, { build: 'plain_gun', variant: 'normal', level }],
      foes: FIGHTS.standard.map((t) => ({ tier: t })), map: 'cover', seed: ['CALL033', i].join('-'), maxRounds: 15 });
    errors += r.errors.length; if (r.win) { won++; rounds += r.rounds; }
    rr += Math.max(1, r.rounds); taken += r.pcs.reduce((t: number, p: any) => t + p.taken, 0); dealt += r.pcs[1].hpRemoved + r.pcs[2].hpRemoved; made += Object.entries(r.pcs[0].actions || {}).filter(([k]) => k.startsWith('Call:')).reduce((t, [, v]) => t + Number(v), 0);
  }
  return { call: id || 'none (sidearm only)', pts, n, won: Math.round((won / n) * 100), rounds: won ? r1(rounds / won) : 0, takenRound: r1(taken / rr), riflesDealt: r1(dealt / n), made: r1(made / n), errors };
}
export const CALL_HEAD = '| Call | Points | Won | Rounds (won) | Squad HP taken a round | HP the two rifles removed a fight | Calls made a fight |\n|---|---|---|---|---|---|---|';
export const callLine = (r: CallRow) => '| ' + r.call + ' | ' + r.pts + ' | ' + r.won + '% | ' + r.rounds + ' | ' + r.takenRound + ' | ' + r.riflesDealt + ' | ' + r.made + ' |' + (r.errors ? ' ERRORS ' + r.errors : '');

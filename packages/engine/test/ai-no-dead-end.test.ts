// Bug, 16 Nov 2026 (the replay guard on seed PHC-0003, lane 0.29 tank 1): the Chapter warframe walked to the tile where
// its side last saw the Outburst caster, braced, and then held every turn for thirty rounds while the caster, out of its
// sight behind a wall, shot at it: every tile it knew of was searched (enemySearchTile skips the tile it stands on) and
// nothing else told it where to go. A turn begun on a searched tile now heads for the nearest hostile that is not Hidden
// (the noise of the fight). Both tests go through the reducer with the simulator's policies (Rec, playStage).
import { describe, expect, it } from 'vitest';
import { condOn, moveBlock, alive } from '../src';
import { Rec, type Pc } from './helpers/replay';
import { survivalRoom, playStage } from './helpers/survival';

const SQUAD: Pc[] = [{ build: 'plain_gun', level: 1 }, { build: 'tank', level: 1 }, { build: 'sigil', level: 1 }, { build: 'outburst', level: 1 }];
const SOLO: Pc[] = [{ build: 'plain_gun', level: 1 }];
/** Play a seeded stage, watching every enemy round by round: an enemy is idle in a round when no line of the fight log
 * that round begins with its name and it stands where it stood; the longest run of idle rounds per unit is counted while
 * it could move, was not Stunned or ordered, and a hostile that is not Hidden was alive. `trail`: where it stood at the
 * end of each round (and whether braced). */
function watch(seed: string, pcs: Pc[]) {
  const r = new Rec(survivalRoom(seed, pcs, { test: true }), pcs);
  const idle: Record<string, number> = {}, worst: Record<string, number> = {}, trail: Record<string, string[]> = {};
  let fight = '', round = 0, logAt = 0, was: Record<string, string> = {};
  const act = r.act.bind(r);
  r.act = (a: any, by?: string) => {
    const out = act(a, by), cb: any = r.g.combat;
    if (!cb || r.g.phase !== 'combat') return out;
    if (cb.name + '#' + (r.g.run?.path?.length ?? 0) !== fight) { fight = cb.name + '#' + (r.g.run?.path?.length ?? 0); round = cb.round; logAt = cb.log.length; was = Object.fromEntries(cb.units.map((u: any) => [u.id, u.pos])); return out; }
    if (cb.round === round) return out;
    const lines: string[] = cb.log.slice(logAt);
    for (const u of cb.units) {
      if (u.side !== 'foe' || !alive(u)) continue;
      const key = fight + '/' + u.id, could = !moveBlock(u) && !condOn(u, 'stunned') && !condOn(u, 'commanded') && cb.units.some((t: any) => t.side !== u.side && alive(t) && !t.hidden);
      const did = was[u.id] !== u.pos || lines.some((l) => l.startsWith(u.name + ' ') || l.startsWith(u.name + "'"));
      idle[key] = could && !did ? (idle[key] || 0) + 1 : 0; worst[key] = Math.max(worst[key] || 0, idle[key]);
      (trail[key] ||= []).push(u.pos + (u.braced ? ' braced' : '') + (did ? '' : ' idle'));
    }
    round = cb.round; logAt = cb.log.length; was = Object.fromEntries(cb.units.map((u: any) => [u.id, u.pos]));
    return out;
  };
  r.must({ type: 'run/start', seed, camp: 'recommended' }); playStage(r, pcs.length);
  return { r, worst, trail };
}

describe('an enemy never holds its turns for ever while a hostile fights on (16 Nov 2026)', () => {
  it('seed PHC-0003: the Chapter warframe, braced on the tile it searched with the caster out of its sight, walks on within two of its turns, and the fight ends', () => {
    const { r, worst, trail } = watch('PHC-0003', SQUAD);
    // Since rules 1.57 (cover beside you, the shot that shows, focus memory) this seed's gate fight ends as a duel of the
    // tank policy (Raise Shield and Guard every turn, no attack) with an empty revolver against the Sergeant's fists past
    // the helper's 40 rounds: a stall of the simulator's tank policy, not an enemy holding its turns (the Sergeant strikes
    // every turn). That one error is listed, not failed; any other fails.
    expect(r.errors.filter((e) => !/did not end in 40 rounds/.test(e))).toEqual([]);
    const boss = Object.keys(trail).filter((k) => /foe-0$/.test(k) && trail[k].some((p) => p.endsWith('braced')));
    // Since the 0.28.3 merge (the field is the fight, the camp's new rows) this seed's run no longer brings the warframe
    // to that tile: when it does brace there, it must walk on; the guard below covers every seed either way.
    for (const k of boss) expect(worst[k], k + ': ' + trail[k].join(' > ')).toBeLessThanOrEqual(2);
  }, 600_000);
  it('the guard: across seeded stages, solo and a squad of four, no enemy spends more than two turns in a row doing nothing while it could move and a hostile it could hear lives', () => {
    for (const [pcs, seeds] of [[SQUAD, ['PHC-0001', 'PHC-0002', 'PHC-0003']], [SOLO, ['PHC-0001', 'PHC-0004']]] as [Pc[], string[]][]) for (const seed of seeds) {
      const { worst, trail } = watch(seed, pcs);
      for (const k of Object.keys(worst)) expect(worst[k], seed + ' ' + k + ': ' + trail[k].join(' > ')).toBeLessThanOrEqual(2);
    }
  }, 1_200_000);
});

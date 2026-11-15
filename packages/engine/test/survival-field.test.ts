// Rules 1.55: a won Survival fight's field. After the win the run stands at `field`, and the field is the fight itself,
// still running with no enemies left (rules 1.55 item 61, 0.28.3): the fight's map, its units, its piles (a speed
// reload's dropped magazine among them); the squad walks and picks up with the fight's own actions, no AP taken, no
// turns; everyone marks Leave (run/leave, the shop's vote) or the host closes it, and then the fight ends and the
// rewards are as before. Everything through the reducer.
import { describe, expect, it } from 'vitest';
import { type GameState, apply, RuleError, reachable, nodeXp, runNode, magazineWorth, paths, NO_TURNS } from '../src';
import { survivalRoom, startRun, ownerOf } from './helpers/survival';
import type { Pc } from './helpers/replay';

const DUO: Pc[] = [{ build: 'plain_gun', level: 1 }, { build: 'plain_gun', level: 1 }];
const refused = (g: GameState, a: any, by = 'host') => { try { apply(g, a, by); } catch (e) { expect(e).toBeInstanceOf(RuleError); return (e as Error).message; } throw new Error('expected a refusal: ' + a.type); };
const clone = (g: GameState): GameState => JSON.parse(JSON.stringify(g));
/** Into the first fight, both players marking it. */
function inFight(): GameState {
  let g = clone(startRun(survivalRoom('PHC-FIELD', DUO, { test: true }), 'PHC-FIELD'));
  // a magazine gun in hand (the camp's Recommended rifle loads round by round): the pistol and two spare magazines
  for (const c of Object.values(g.characters)) { c.weapon = 'service_pistol'; c.pack = [...(c.pack || []), ...magazineWorth('service_pistol'), ...magazineWorth('service_pistol')]; }
  const n = reachable(g.run!).find((x) => x.kind === 'fight')!;
  for (let i = 0; i < 2 && g.run!.at !== n.id; i++) g = apply(g, { type: 'run/move', node: n.id }, ownerOf(i));
  expect(g.run!.state).toBe('fight');
  return g;
}
const piles = (g: GameState) => (g.combat!.objects || []).filter((o: any) => o.kind === 'pile' && (o.items || []).length);

describe('rules 1.55: the field after a won Survival fight', () => {
  it('a speed reload\'s magazine lies on the field; a walk and a pickup bring it back with no AP spent and no round; the vote leaves; the pay is as before', () => {
    let g = inFight();
    const cb = g.combat!, u = cb.units.find((x) => x.id === cb.order[cb.turn] && x.charId)!;
    expect(u).toBeTruthy(); // the squad opens the first fight (Agility ties to the players at level 1)
    { const x = clone(g); const v = x.combat!.units.find((y) => y.id === u.id)!; v.ammo = 1; g = x; }
    const owner = g.characters[u.charId!].owner;
    g = apply(g, { type: 'combat/reload', unitId: u.id } as any, owner);
    const dropped = g.combat!.objects!.find((o: any) => o.kind === 'pile' && o.pos === u.pos)!;
    expect(dropped.items!.some((e: any) => e.pack?.mags)).toBe(true);
    g = clone(apply(g, { type: 'run/skip' }, 'host'));
    // the field: the fight itself, still running (its phase, its units where they stood), the magazine's pile on its map
    expect(g.run!.state).toBe('field'); expect(g.phase).toBe('combat'); expect(g.combat!.field).toBe(true); expect(g.combat!.over).toBeNull();
    const me = () => g.combat!.units.find((x) => x.id === u.id)!;
    expect(piles(g).some((o: any) => o.pos === dropped.pos)).toBe(true);
    // the pay is given as the fight is won (as before rules 1.55); the picks wait for the field to be left
    const n = runNode(g.run!, g.run!.at)!; expect(g.characters.c1.xp).toBe(nodeXp('fight', n.depth, 1)); expect(g.run!.offers!.c1).toBeTruthy();
    expect(refused(g, { type: 'run/pick', charId: 'c1', choice: 0 })).toBe('There is nothing to pick for that character now.');
    expect(refused(g, { type: 'run/move', node: g.run!.nodes[0].id })).toBe('Leave the field first: everyone marks Leave, or the host closes it.');
    // a step off the pile and back onto it: the fight's own move, no AP taken, no round
    const at = me().pos, P = paths(g.combat!, at, u.id), taken = new Set(g.combat!.units.filter((x) => !x.dead).map((x) => x.pos));
    const step = Object.keys(P.dist).find((k) => P.dist[k] === 1 && !taken.has(k))!;
    const round = g.combat!.round, ap = me().ap, mags0 = (me().mags || []).length;
    g = apply(g, { type: 'combat/move', unitId: u.id, to: step } as any, owner); expect(me().pos).toBe(step);
    g = apply(g, { type: 'combat/move', unitId: u.id, to: at } as any, owner);
    g = apply(g, { type: 'combat/pickup', unitId: u.id, tile: dropped.pos } as any, owner);
    expect((me().mags || []).length).toBeGreaterThan(mags0); expect(me().ap).toBe(ap); expect(g.combat!.round).toBe(round);
    expect(refused(g, { type: 'combat/end-turn', unitId: u.id } as any, owner)).toBe(NO_TURNS);
    // leaving: one of two ready waits; a guest may not close; both ready: the fight ends, the rewards
    const one = apply(g, { type: 'run/leave' }, 'host');
    expect(one.run!.state).toBe('field'); expect(one.run!.ready).toEqual({ host: true });
    expect(refused(g, { type: 'run/leave', close: true } as any, 'p2')).toMatch(/^Only the host can close the field/);
    const both = apply(one, { type: 'run/leave' }, 'p2');
    expect(both.run!.state).toBe('reward'); expect(both.run!.ready).toEqual({}); expect(both.phase).toBe('story'); expect(both.combat!.over).toBe('win');
    expect(both.characters.c1.xp).toBe(g.characters.c1.xp); expect(both.run!.offers).toEqual(g.run!.offers);
    expect(apply(g, { type: 'run/leave', close: true } as any, 'host').run!.state).toBe('reward'); // the host closes for everyone
    // the picks as before: then back on the path map
    let p = apply(both, { type: 'run/pick', charId: 'c1', choice: 'materials' }, 'host'); p = apply(p, { type: 'run/pick', charId: 'c2', choice: 'materials' }, 'p2');
    expect(p.run!.state).toBe('map');
  });

  it('a field with nothing on it can be left at once; solo it is one Leave', () => {
    let g = startRun(survivalRoom('PHC-FIELD1', [DUO[0]], { test: true }), 'PHC-FIELD1');
    g = apply(g, { type: 'run/move', node: reachable(g.run!).find((x) => x.kind === 'fight')!.id }, 'host');
    const x = clone(g); x.combat!.objects = (x.combat!.objects || []).filter((o: any) => o.kind !== 'pile');
    g = apply(apply(x, { type: 'run/skip' }, 'host'), { type: 'run/leave' }, 'host');
    expect(g.run!.state).toBe('reward');
  });
});

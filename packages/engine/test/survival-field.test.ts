// Rules 1.55: a won Survival fight's field. After the win the run stands at `field`: the fight's map, the squad where it
// stood, the piles as the fight left them (a speed reload's dropped magazine among them); the squad walks and picks up
// with the Proving Ground's free movement (no rounds, AP always full); everyone marks Leave (run/leave, the shop's vote)
// or the host closes it, and then the rewards are as before. Everything through the reducer.
import { describe, expect, it } from 'vitest';
import { type GameState, apply, RuleError, reachable, nodeXp, runNode, standable, zoneMap, magazineWorth } from '../src';
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
const magsIn = (g: GameState, id: string) => (g.characters[id].pack || []).filter((p: any) => p.mags).reduce((t: number, p: any) => t + p.mags.length, 0);
const piles = (g: GameState) => (g.story.objects || []).filter((o: any) => o.kind === 'pile' && (o.items || []).length);

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
    g = apply(g, { type: 'run/skip' }, 'host');
    const packMags = magsIn(g, u.charId!);
    // the field: the map is the fight's, the squad stands where it stood, the magazine's pile is on the area map
    expect(g.run!.state).toBe('field'); expect(g.phase).toBe('story'); expect(zoneMap(g)).toEqual(g.combat!.map);
    const at = g.story.positions![u.charId!]; expect(at).toBe(g.combat!.units.find((x) => x.id === u.id)!.pos);
    const pile = piles(g).find((o: any) => o.pos === dropped.pos)!; expect(pile).toBeTruthy();
    // the pay is given as the fight is won (as before rules 1.55); the picks wait for the field to be left
    const n = runNode(g.run!, g.run!.at)!; expect(g.characters.c1.xp).toBe(nodeXp('fight', n.depth, 1)); expect(g.run!.offers!.c1).toBeTruthy();
    expect(refused(g, { type: 'run/pick', charId: 'c1', choice: 0 })).toBe('There is nothing to pick for that character now.');
    expect(refused(g, { type: 'run/move', node: g.run!.nodes[0].id })).toBe('Leave the field first: everyone marks Leave, or the host closes it.');
    // a step off the pile and back onto it: free movement, no rounds
    const map = zoneMap(g), [x0, y0] = at.split(',').map(Number), taken = new Set(Object.values(g.story.positions!));
    const step = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => (x0 + dx) + ',' + (y0 + dy)).find((k) => standable(map, k) && !taken.has(k) && !(g.story.objects || []).some((o: any) => o.pos === k && o.kind !== 'pile'))!;
    const round = g.story.round;
    g = apply(g, { type: 'world/act', charId: u.charId!, act: 'move', to: step } as any, owner);
    expect(g.story.positions![u.charId!]).toBe(step); expect(g.story.ap).toEqual({}); expect(g.story.round).toBe(round);
    g = apply(g, { type: 'world/act', charId: u.charId!, act: 'pickup', objId: pile.id } as any, owner);
    expect(magsIn(g, u.charId!)).toBeGreaterThan(packMags); expect(g.story.ap).toEqual({}); expect(g.story.round).toBe(round);
    expect(piles(g).some((o: any) => o.id === pile.id)).toBe(false); // the whole pile in one action
    // the story's own actions are not done on the field (rules 1.55 item 30)
    expect(refused(g, { type: 'world/act', charId: u.charId!, act: 'search', objId: 'x' } as any, owner)).toMatch(/^The fight is over: on the field you walk, pick things up and use what you carry/);
    // leaving: one of two ready waits; a guest may not close; both ready: the rewards
    const one = apply(g, { type: 'run/leave' }, 'host');
    expect(one.run!.state).toBe('field'); expect(one.run!.ready).toEqual({ host: true });
    expect(refused(g, { type: 'run/leave', close: true } as any, 'p2')).toMatch(/^Only the host can close the field/);
    const both = apply(one, { type: 'run/leave' }, 'p2');
    expect(both.run!.state).toBe('reward'); expect(both.run!.ready).toEqual({}); expect(both.story.positions).toEqual({});
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

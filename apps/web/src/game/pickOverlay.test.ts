// 0.31.12 lane 2 (owed fix, "the prayer reach boundary"; to-do: "a prayer outlines every tile in sight (heavy)"): the
// one pick overlay draws an action's reach as one shaded region with a line round its boundary only, never an outline on
// every tile. Every tile of the reach still says "in reach" (the hover card, the browser suites).
import { describe, expect, it } from 'vitest';
import { pickTiles, reachEdge } from './pickOverlay';

const marks = (reach: string[]) => ({ reach, choice: new Set<string>(), choiceUnits: new Set<string>(), area: [], targets: [] });
describe('the reach is drawn by its boundary', () => {
  const reach: string[] = []; for (let x = 0; x < 3; x++) for (let y = 0; y < 3; y++) reach.push(x + ',' + y);
  const T = pickTiles({ units: [] }, marks(reach), 'pc', '#D36A90');
  it('a tile inside the reach is shaded with no line; the edge tiles draw only their outer sides', () => {
    expect(T['1,1'].layer).not.toMatch(/box-shadow|outline/);
    expect(T['0,0'].layer.match(/inset/g)!.length).toBe(2); // a corner: two outer sides
    expect(T['1,0'].layer.match(/inset/g)!.length).toBe(1); // an edge: one
    for (const k of reach) { expect(T[k].layer).toContain('background'); expect(T[k].note).toContain('in reach'); expect(T[k].layer).not.toContain('dashed'); }
  });
  it('a lone tile is ringed on all four sides', () => {
    expect(reachEdge('5,5', new Set(['5,5']), '#fff').split('inset').length - 1).toBe(4);
  });
});

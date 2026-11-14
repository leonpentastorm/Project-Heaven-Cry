// @vitest-environment jsdom
// Rules 1.46 / survival-spec 8.3: a safe node opens its place when the squad arrives. The place this browser walked out
// of ('To the path map ›') stays closed for that visit only: node ids repeat from run to run (s<stage>.d<depth>.<i>), so
// a new run with a place at the same id opens it again.
import { describe, expect, it } from 'vitest';
import { apply, type GameState } from '@engine';
import { survivalRoom } from '../../../../packages/engine/test/helpers/survival';
import { closePlace, placeClosed } from './placeMark';

const SOLO = [{ build: 'plain_gun', level: 1 }];
/** A real run from the reducer, its squad arrived at a Forge at `node` (the arrival is the fixture). */
const at = (seed: string, node: string): GameState => { const g = apply(survivalRoom(seed, SOLO as any, { test: true }), { type: 'run/start', seed } as any, 'host');
  return { ...g, run: { ...g.run!, state: 'map', at: node, visit: { node, kind: 'forge' } as any } } as GameState; };

describe('the closed place mark', () => {
  it('closes this visit only: a new run with a place at the same node id opens it', () => {
    const a = at('PHC-0001', 's1.d3.1'), b = at('PHC-0002', 's1.d3.1');
    expect(placeClosed(a.run)).toBe(false);
    closePlace(a.run);
    expect(placeClosed(a.run)).toBe(true);
    expect(placeClosed(b.run)).toBe(false);
  });
});

// No silent HP change (fx/silent.ts): a change the batch draws no number for is marked on the event with the unit's last
// stamp; a unit another event already numbers is left alone.
import { describe, expect, it } from 'vitest';
import { silentBatch } from './silent';

describe('silentBatch', () => {
  it('a share through a Bond (no event of its own) is marked with the net change on the last stamp', () => {
    const evs: any[] = [{ k: 'shot', n: 1, target: 'foe', dmg: 20, hp: { ally: [80, 70] } }, { k: 'hurt', n: 2, target: 'ally', dmg: 10, hp: { med: [50, 45] } }, { k: 'turn', n: 3, hp: { med: [45, 42] } }];
    silentBatch(evs);
    expect(evs[2]._silent).toEqual({ med: -8 });
    expect(evs[0]._silent).toBeUndefined(); expect(evs[1]._silent).toBeUndefined(); // ally is numbered by its hurt
  });
  it('a heal a Miracle gives many at once is marked; a revive (its own UP +N) is not', () => {
    const evs: any[] = [{ k: 'miracle', n: 1, hp: { a: [10, 60], b: [0, 30] } }, { k: 'heal', n: 2, target: 'b', revive: true }];
    silentBatch(evs);
    expect(evs[0]._silent).toEqual({ a: 50 });
  });
});

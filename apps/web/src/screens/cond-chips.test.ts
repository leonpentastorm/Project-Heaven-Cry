// @vitest-environment jsdom
// A condition with no fixed end (the table's UNTIL) shows no count of rounds (0.29.0 playtest: Off Balance from a Slam or
// a Launch read "99 rounds left"): its chip is the name alone and its title says the row's own end (conditions.json ends_on).
import { describe, expect, it } from 'vitest';
import { applyCond, withGame } from '@engine';
import { physFight } from '../../../../packages/engine/test/helpers/physfight';
import { condChips } from './combat';

describe('condition chips', () => {
  it('Off Balance put on with no rounds (as Slam and Launch put it): no "99", the end in words; a timed one keeps its count', () => {
    const f = physFight([{ weapon: 'service_pistol' }], [{ at: 'H5' }]);
    const t = f.unit(f.foe.id);
    withGame(f.g, () => applyCond(f.cb, f.g.rng, f.unit(f.pc.id), t, 'off_balance', undefined, undefined, { skipSave: true } as any));
    const ob = condChips(t, f.g).find((c: any) => c.key === 'c-off_balance')!;
    expect(ob).toBeTruthy();
    expect(ob.k).toBe('OFF BALANCE'); expect(ob.t).not.toMatch(/99|rounds left/); expect(ob.t).toMatch(/Until used at your next turn start\./);
    withGame(f.g, () => applyCond(f.cb, f.g.rng, f.unit(f.pc.id), t, 'guarded', 2, undefined, { skipSave: true } as any));
    const gd = condChips(t, f.g).find((c: any) => c.key === 'c-guarded')!;
    expect(gd.k).toMatch(/· 2$/); expect(gd.t).toMatch(/2 rounds left\./);
  });
});

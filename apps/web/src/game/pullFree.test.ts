import { describe, it, expect } from 'vitest';
import { pullFreeTargets } from './commands';

// rules 1.12: the Utility tab's Pull free row (a nailed player had no way out before it)
describe('pullFreeTargets', () => {
  const u = (id: string, side: string, pos: string, nailed?: any) => ({ id, side, pos, hp: 10, ap: 6, name: id, nailed });
  it('offers the unit itself, an ally next to it, and a weapon left in an enemy next to it', () => {
    const me = u('me', 'pc', '5,5', { ap: 2 }), ally = u('ally', 'pc', '6,5', { ap: 2 }), far = u('far', 'pc', '9,9', { ap: 2 });
    const foeBare = u('f1', 'foe', '4,5', { ap: 2 }), foeLance = u('f2', 'foe', '5,6', { ap: 2, weapon: 'lance' });
    const ids = pullFreeTargets({ units: [me, ally, far, foeBare, foeLance] }, me).map((x) => x.id);
    expect(ids).toEqual(['me', 'ally', 'f2']);
  });
  it('offers nothing when nobody in reach is nailed', () => {
    expect(pullFreeTargets({ units: [u('me', 'pc', '5,5'), u('a', 'pc', '6,5')] }, u('me', 'pc', '5,5'))).toEqual([]);
  });
});

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

import { techAction, parseTech, techOptOf } from './techView';
describe('a technique used with something from the pack', () => {
  it('carries the item in its action id (a pack index as a number, a throwable as its id)', () => {
    expect(parseTech(techAction('main', 'snap_shot', 3))).toEqual({ hand: 'main', id: 'snap_shot', item: 3 });
    expect(parseTech(techAction('main', 'lob', 'frag_grenade'))).toEqual({ hand: 'main', id: 'lob', item: 'frag_grenade' });
    expect(parseTech(techAction('off', 'lunge'))).toEqual({ hand: 'off', id: 'lunge' });
  });
  it('a technique with choices sends the first when none was picked, and nothing for the plain use', () => {
    expect(techOptOf('called_shot', null)).toBe('leg'); expect(techOptOf('called_shot', 'head')).toBe('head');
    expect(techOptOf('run_through', null)).toBeNull(); expect(techOptOf('run_through', 'leave')).toBe('leave'); expect(techOptOf('cut', 'x')).toBeNull();
  });
});

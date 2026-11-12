// The one action flow (game/actionFlow.ts): what the panel shows for the picked action. Found by the first full browser
// run (12 Nov 2026, physical-pack): Called Shot's part chips showed none picked, while Confirm sends LEG.
import { describe, expect, it } from 'vitest';
import { physFight } from '../../../../packages/engine/test/helpers/physfight';
import { flowView } from './actionFlow';

describe('the flow\'s option chips', () => {
  it('a technique\'s choice with nothing picked shows the one Confirm sends: Called Shot\'s LEG', () => {
    const f = physFight([{ weapon: 'service_pistol', known: ['called_shot'] }], [{ at: 'H5' }]);
    f.put(f.pc, 'C5'); const me = f.turn(f.pc);
    const fv = f.bound(() => flowView(f.g, 'host', f.unit(me.id), { action: 'tq:main:called_shot', target: f.foe.id }))!;
    expect(fv).toBeTruthy();
    const on = (v: any) => v.chips.filter((c: any) => c.on).map((c: any) => c.label);
    expect(fv.chips.map((c) => c.label)).toEqual(['LEG', 'ARM', 'HEAD']);
    expect(on(fv)).toEqual(['LEG']);
    expect(fv.pv.why).toBeNull(); expect(fv.action).toMatchObject({ id: 'called_shot', opt: 'leg' });
    // picking HEAD moves the tick, and Confirm sends HEAD
    const head = fv.chips.find((c) => c.label === 'HEAD')!;
    const fv2 = f.bound(() => flowView(f.g, 'host', f.unit(me.id), { action: 'tq:main:called_shot', target: f.foe.id, ...head.pick }))!;
    expect(on(fv2)).toEqual(['HEAD']); expect(fv2.action).toMatchObject({ opt: 'head' });
  });
});

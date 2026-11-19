// Outside playtest 0.31.10, row 1 (docs/design/proposals/2026-11-18-outside-playtest/TRIAGE.md): a stim on yourself in
// a fight, by clicking your own token on the flow and from the Backpack.
import { describe, expect, it } from 'vitest';
import { physFight } from '../../../../packages/engine/test/helpers/physfight';
import { flowView } from './actionFlow';
import { backpackView } from './backpack';

describe('a stim on yourself', () => {
  for (const id of ['stim', 'stim_throw']) it(id + ': a click on your own token picks you, and Confirm sends it', () => {
    const f = physFight([{ weapon: 'service_pistol' }], [{ at: 'H5' }]);
    f.put(f.pc, 'C5'); const me = f.turn(f.pc);
    for (const c of Object.values(f.g.characters) as any[]) c.stims = 2;
    const fv = f.bound(() => flowView(f.g, 'host', f.unit(me.id), { action: id }))!;
    expect(fv).toBeTruthy();
    const patch = fv.click({ id: me.id, side: me.side }, me.pos)!;
    expect(patch).toMatchObject({ target: me.id });
    const fv2 = f.bound(() => flowView(f.g, 'host', f.unit(me.id), { action: id, ...patch }))!;
    expect(fv2.action).toMatchObject({ type: 'combat/stim', targetId: me.id });
  });
});

describe('the Backpack\'s stims', () => {
  it('Use is the engine\'s Stim on yourself, at the reducer\'s price, and it heals you through the reducer', () => {
    const f = physFight([{ weapon: 'service_pistol' }], [{ at: 'H5' }]);
    f.put(f.pc, 'C5'); const me = f.turn(f.pc);
    for (const c of Object.values(f.g.characters) as any[]) c.stims = 2;
    f.unit(me.id).hp = Math.floor(f.unit(me.id).maxHp / 2);
    const bp = backpackView(f.g, f.g.combat, f.unit(me.id), true, '', 'host')!;
    const row = bp.sections.flatMap((s) => s.rows).find((r) => r.key === 'stims')!;
    const use = row.acts.find((a) => a.key === 'stim-self')!;
    expect(use.off).toBe(false);
    expect(use.action).toMatchObject({ type: 'combat/stim', unitId: me.id, targetId: me.id });
    const hp0 = f.unit(me.id).hp, ap0 = f.unit(me.id).ap;
    f.act(use.action);
    expect(f.unit(me.id).hp).toBeGreaterThan(hp0);
    expect(ap0 - f.unit(me.id).ap + ' AP').toBe(use.cost);
    expect((Object.values(f.g.characters)[0] as any).stims).toBe(1);
  });
  it('off your turn Use is greyed with the panel\'s reason', () => {
    const f = physFight([{ weapon: 'service_pistol' }], [{ at: 'H5' }]);
    f.put(f.pc, 'C5'); const me = f.turn(f.pc);
    for (const c of Object.values(f.g.characters) as any[]) c.stims = 2;
    const bp = backpackView(f.g, f.g.combat, f.unit(me.id), false, '', 'host')!;
    const use = bp.sections.flatMap((s) => s.rows).find((r) => r.key === 'stims')!.acts[0];
    expect(use.off).toBe(true); expect(use.why).toBe('Not your turn.');
  });
});

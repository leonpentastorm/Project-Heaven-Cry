// Outside playtest 0.31.10 row 7: the target card's damage is the one the attack deals, with the switches it carries
// (Shadow's Break on a pistol-whip: it showed 12 to 18 and dealt 59 to 86).
// Rules 1.99 item 8361: the Break is the cash-out term (cashFactor of the Shadow spent), the ambush stays its own x1.5.
import { describe, expect, it } from 'vitest';
import { applyCond } from '@engine';
import { physFight, rig } from '../../../../packages/engine/test/helpers/physfight';
import { targetAttackPreview } from './techView';

const BR = 'skill:ingenuity.1#shadow.break';
describe('the target card with Break set', () => {
  it('previews the Break damage the reducer then deals', () => {
    const f = physFight([{ weapon: 'service_pistol', skills: { ingenuity: 7, dexterity: 3 } }], [{ tier: 'soldier', weapon: 'fists' }]);
    f.cb.objects = []; f.put(f.pcs[0], 'C5'); const a = f.cb.units.find((u) => u.side === 'foe')!; f.put(a, 'D5'); a.hp = a.maxHp = 900; a.armour = 0;
    const u = f.turn(f.pcs[0]); f.unit(u.id).res!.shadow = 2;
    f.bound(() => applyCond(f.cb, f.g.rng, f.unit(u.id), f.unit(u.id), 'hidden', 9, undefined, { skipSave: true }));
    const plain: any = f.bound(() => targetAttackPreview(f.g, f.cb, f.unit(u.id), f.unit(a.id), 'melee', [], 'host'));
    const brk: any = f.bound(() => targetAttackPreview(f.g, f.cb, f.unit(u.id), f.unit(a.id), 'melee', [BR], 'host'));
    expect(brk.ok).toBe(true); expect(brk.dmg.mults.some((m: any) => /cash-out/.test(m.label))).toBe(true); expect(brk.dmg.mults.map((m: any) => m.label)).toContain('ambush'); expect(plain.dmg.mults.map((m: any) => m.label)).toContain('ambush');
    rig({ hit: true, die: 12 });
    f.act({ type: 'combat/attack', unitId: u.id, targetId: a.id, mode: 'melee', mods: [BR] } as any); rig(null);
    expect(900 - f.unit(a.id).hp).toBe(Math.floor(brk.dmg.total));
  });
});

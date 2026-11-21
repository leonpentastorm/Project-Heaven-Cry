// Guard 2.0, slice 1 (rules 1.56, Guard 2.0, item 4300): the Guard event the screen draws the plates from. Every change
// to a unit's Guard pool says why (gain, soak, spend, pressure) and, for a soak, how much of the hit it took off; the
// soak's event comes after the attack's own event, so the blow plays first and then the plate that ate it (fx/guard.ts).
// Through the reducer: Brace for Guard, then the enemy's own turn shoots.
import { describe, it, expect, beforeEach } from 'vitest';
import { phys } from '../src';
import { physFight, rig } from './helpers/physfight';

beforeEach(() => rig(null));
function fight(dur: number) {
  const f = physFight([{ weapon: 'sabre', skills: { athletics: 4, raw_power: 6, dexterity: 6, durability: dur } }], [{ tier: 'elite', weapon: 'service_pistol' }]);
  f.cb.objects = [];
  f.put(f.pc, 'C5'); const foe = f.put(f.foe, 'H5'); foe.hp = foe.maxHp = 900;
  f.cb.order = [f.pc.id, ...f.cb.order.filter((id) => id !== f.pc.id)]; f.cb.round = 1; f.turn(f.pc);
  const me = f.unit(f.pc.id); me.hp = me.maxHp; me.armour = 0;
  return f;
}
const guardEvents = (f: ReturnType<typeof fight>) => f.fx('guard').filter((e: any) => e.unit === f.pc.id);

describe('the Guard event says why and how much', () => {
  it('Brace: why gain, no soaked', () => {
    const f = fight(3);
    f.act({ type: 'combat/brace', unitId: f.pc.id } as any);
    const max = f.unit(f.pc.id).resMax!.guard!; // rules 1.97 item 8340: Durability's Reach
    expect(guardEvents(f).at(-1)).toMatchObject({ why: 'gain', was: 0, now: Math.min(max, phys.PHYS_RULES.guard.brace_gain), max });
    expect(guardEvents(f).at(-1).soaked).toBeUndefined();
  });
  it('a hit the Guard eats: why soak, soaked = the damage taken off, after the attack\'s own event', () => {
    const f = fight(5);
    f.act({ type: 'combat/brace', unitId: f.pc.id } as any);
    f.unit(f.pc.id).res!.guard = 5; // a full pool (the soak keeps 1 back)
    rig({ hit: true, die: 12 });
    const from = (f.cb as any).fx.length;
    f.act({ type: 'combat/end-turn', unitId: f.pc.id } as any); // the foe's own turn: it shoots
    const evs = (f.cb as any).fx.slice(from);
    const soak = evs.find((e: any) => e.k === 'guard' && e.unit === f.pc.id && e.why === 'soak');
    expect(soak).toBeTruthy();
    expect(soak.soaked).toBeGreaterThan(0);
    expect(soak.soaked).toBeLessThanOrEqual((soak.was - soak.now) * f.bound(() => phys.guardSoak(f.unit(f.pc.id))));
    const shot = evs.find((e: any) => e.k === 'shot' && e.target === f.pc.id);
    expect(shot).toBeTruthy();
    expect(evs.indexOf(soak)).toBeGreaterThan(evs.indexOf(shot)); // the blow plays first, then the plate that ate it
    expect(f.cb.log.some((l: string) => /Guard takes \d+ of it/.test(l))).toBe(true);
  });
  it('Pressure taken on Guard: why pressure', () => {
    const f = fight(3);
    f.act({ type: 'combat/brace', unitId: f.pc.id } as any);
    f.press(f.pc, 1, f.foe);
    expect(guardEvents(f).at(-1)).toMatchObject({ why: 'pressure', was: 2, now: 1 });
  });
});

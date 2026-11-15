// 0.28.3 (Leon's playtest of 15 Nov 2026: "it always tanks the last shot"): a hit a protection holds at its floor
// reports the damage that landed (0), never the damage it would have done. Played through the reducer: a real Burst.
import { describe, it, expect } from 'vitest';
import { fightWith } from './helpers/perkfight';

describe('a held hit reports what it took', () => {
  it('a Burst at a full-HP Elite of your level: the guard leaves it on 1 HP and the next roll says 0 damage, not the roll\'s number', () => {
    const f = fightWith([{ level: 6, weapon: 'hellraiser_service_rifle' }], [{ tier: 'elite', level: 6 }]);
    const put = (u: any, x: number, y: number) => { u.pos = x + ',' + y; };
    f.turn(f.pc); put(f.pc, 3, 5); put(f.foe, 6, 5); f.pc.attack = 60; f.pc.dmgMult = 500; f.foe.def = 1; f.pc.ap = 9; f.pc.ammo = 30;
    const n0 = f.cb.log.length, fx0 = (f.cb.fx || []).length, hp0 = f.foe.hp;
    f.act({ type: 'combat/attack', unitId: f.pc.id, targetId: f.foe.id, mode: 'burst' } as any);
    expect(f.foe.hp).toBe(1); expect(f.foe.dead).toBeFalsy();
    const shots = (f.cb.fx || []).slice(fx0).filter((e: any) => e.k === 'shot' && e.target === f.foe.id && e.hit);
    expect(shots.length).toBeGreaterThanOrEqual(2);
    // every number shown adds up to the HP the Elite lost
    expect(shots.reduce((t: number, e: any) => t + e.dmg, 0)).toBe(hp0 - 1);
    const held = f.cb.log.slice(n0).filter((l) => / · no damage/.test(l));
    expect(held.length).toBeGreaterThan(0);
    for (const l of held) expect(l).toMatch(/, 0 damage/);
  });
});

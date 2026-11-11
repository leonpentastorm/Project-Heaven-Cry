import { describe, expect, it } from 'vitest';
import { fightWith } from './helpers/perkfight';

/** A screen holds a unit's HP bar until the hit that changes it plays: the engine stamps hp: {unit: [was, now]} on the
 * effect the change follows, and L (the log lines written before it) on every effect. */
describe('effects carry the HP they change', () => {
  it('a shot that hits: the shot effect carries the target\'s HP before and after; every effect carries L', () => {
    for (let k = 0; k < 12; k++) {
      const f = fightWith([{ skills: { dexterity: 9 }, attrs: { agility: 9 } }], [{ tier: 'elite', at: 'F6' }], { seed: 'HPSTAMP' + k });
      f.turn(f.pc); const foe = f.foe, hp0 = foe.hp, n0 = (f.cb.fx || []).at(-1)?.n || 0;
      f.act({ type: 'combat/technique', unitId: f.pc.id, id: 'shot', targetId: foe.id } as any);
      const fresh = (f.cb.fx || []).filter((e) => e.n > n0);
      expect(fresh.every((e) => typeof e.L === 'number')).toBe(true);
      if (f.foe.hp === hp0) continue; // a miss: try the next seed
      const shot = fresh.find((e) => e.k === 'shot')!, stamps = fresh.filter((e) => e.hp && e.hp[foe.id]);
      expect(stamps.length).toBeGreaterThan(0);
      expect(stamps[0].hp[foe.id][0]).toBe(hp0); expect(stamps.at(-1)!.hp[foe.id][1]).toBe(f.foe.hp);
      expect(stamps[0].n).toBeGreaterThanOrEqual(shot.n);
      return;
    }
    throw new Error('no shot hit in 12 seeds');
  });
});

describe('one action keeps every effect it emits', () => {
  it('a hostile phase with more than 40 effects reaches the screens whole; older ones are trimmed before the next action', async () => {
    const { emitFx, trimFx, FX_CAP } = await import('../src');
    const f = fightWith([{}], [{ tier: 'soldier', at: 'F6' }]);
    const cb = f.cb, n0 = (cb.fx || []).at(-1)?.n || 0;
    for (let i = 0; i < FX_CAP + 30; i++) emitFx(cb, 'hurt', { target: f.foe.id, at: f.foe.pos, dmg: 0 });
    expect((cb.fx || []).filter((e) => e.n > n0).length).toBe(FX_CAP + 30);
    trimFx(cb); expect(cb.fx!.length).toBe(FX_CAP);
  });
});

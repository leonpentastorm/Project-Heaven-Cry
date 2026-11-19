// Rules 1.78 (0.32, the leftovers lane): things designed in earlier versions and never built. Each through the reducer
// (a real action), numbers read from the data.
//   item 6601  two Sanctuaries on one tile do not stack (spec item 1908): one side's zones of a kind, the first laid acts
import { describe, expect, it } from 'vitest';
import './helpers/yard16';
import { CLASS_MOVE_POOL, applyDamage, setDevotionXp, devotionThreshold, zonesAt, type Unit, type Action } from '../src';
import { fightWith, withGame, type CharSpec } from './helpers/perkfight';

const CHAP: CharSpec = { name: 'Chaplain', skills: { faith: 6 }, attrs: { virtue: 8 }, level: 12, classId: 'guardian' };
/** Two Chaplains (Faithful, Old Overcast) and a gunner against two soldiers. */
function twoChaplains() {
  const f = fightWith([CHAP, { ...CHAP, name: 'Second' }, { name: 'Gunner' }], [{ at: 'F6' }, { at: 'G6' }], { level: 12 });
  for (const u of f.pcs) { const c = f.g.characters[u.charId!]; c.belief = { kind: 'faithful', patron: 'old_overcast' }; c.patron = 'old_overcast'; setDevotionXp(c, devotionThreshold(6)); c.devotion = 6; }
  const [me, two, gun] = f.pcs, [f0, f1] = f.foes;
  me.pos = '2,5'; two.pos = '4,5'; gun.pos = '3,5'; f0.pos = '8,5'; f1.pos = '9,5';
  for (const u of f.cb.units) { u.hp = u.maxHp; u.conds = {}; u.shield = 0; delete u.shields; }
  for (const u of f.foes) { u.hp = u.maxHp = 2000; }
  return { f, me: me.id, two: two.id, gun: gun.id, foe: f0.id };
}
const perkAs = (f: ReturnType<typeof fightWith>, id: string, item: string, a: any) => f.act({ type: 'combat/perk', unitId: id, id: item, ...a } as Action, 'host');

describe('item 6601: two Sanctuaries on one tile do not stack (spec item 1908)', () => {
  it('a gunner standing in two Chaplains\' Sanctuaries takes half, not a quarter; the first laid acts', () => {
    const h = twoChaplains();
    h.f.turn(h.me); perkAs(h.f, h.me, 'class:guardian.sanctuary', { actionId: 'sanctuary', tile: '2,5' });
    h.f.turn(h.two); perkAs(h.f, h.two, 'class:guardian.sanctuary', { actionId: 'sanctuary', tile: '4,5' });
    expect(zonesAt(h.f.cb, '3,5', 'sanctuary', 'any').length).toBe(2); // both lie on the gunner's tile
    const gun = h.f.unit(h.gun), hp = gun.hp, foe = h.f.unit(h.foe);
    withGame(h.f.g, () => applyDamage(h.f.cb, gun, 9, { by: foe, type: 'weapon', shield: true, credit: 'hp' } as any));
    expect(hp - h.f.unit(h.gun).hp).toBe(Math.ceil(9 * 0.5)); // once halved (the data's 0.5), not twice
    const first = zonesAt(h.f.cb, '3,5', 'sanctuary', 'any').find((z) => z.by === h.me)!, second = zonesAt(h.f.cb, '3,5', 'sanctuary', 'any').find((z) => z.by === h.two)!;
    expect(first.pool).toBeLessThan(second.pool!); // the first laid gave what was prevented; the second gave nothing
    void CLASS_MOVE_POOL; void (null as unknown as Unit);
  });
});

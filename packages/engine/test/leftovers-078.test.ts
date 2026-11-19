// Rules 1.78 (0.32, the leftovers lane): things designed in earlier versions and never built. Each through the reducer
// (a real action), numbers read from the data.
//   item 6601  two Sanctuaries on one tile do not stack (spec item 1908): one side's zones of a kind, the first laid acts
//   item 6602  NULL unmakes a Figment on the tiles it covers (figments-spec rule 12; sigils.json null.dispel)
import { describe, expect, it } from 'vitest';
import './helpers/yard16';
import { CLASS_MOVE_POOL, applyDamage, setDevotionXp, devotionThreshold, zonesAt, type Unit, type Action } from '../src';
import { fightWith, withGame, type CharSpec } from './helpers/perkfight';
import { figFight } from './helpers/figfight';
import { previewEvoke } from '../src';

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

describe('item 6602: NULL unmakes a Figment (figments-spec rule 12)', () => {
  function setup() {
    const f = figFight([{ skills: { visualization: 1 }, weapon: 'service_pistol', forms: [], level: 5 }, { name: 'Ilse', archetype: 'sigilist', kit: 'sigil', visualizer: null, level: 5 }], [{ at: '14,14' }]);
    const [owner, sig] = f.pcs; owner.pos = '3,4'; sig.pos = '2,8';
    let o = f.turn(owner); o.ap = 9; f.picture(o, 'double', '6,8');
    const fig = f.figments(f.unit(owner.id))[0]; expect(fig).toBeTruthy();
    const u = f.turn(sig); u.ap = 9; const m = u.mg!; m.evoker = true; m.words = ['null', 'seek']; m.charge = 30; m.glyphAp = 1; m.maxWords = 4; m.flux = 0; m.rangeBonus = 0;
    f.unit(sig.id).pos = '3,8'; f.act({ type: 'combat/draw', unitId: sig.id, word: 'null', tile: '3,8' } as any);
    f.unit(sig.id).pos = '2,8'; f.act({ type: 'combat/draw', unitId: sig.id, word: 'seek', tile: '2,8' } as any);
    return { f, sig: sig.id, fig: fig.id };
  }
  it("the preview names the Figment among what NULL unmakes; the Evoke takes it out of the fight (anyone's, the caster's own side too)", () => {
    const h = setup();
    const pv = withGame(h.f.g, () => previewEvoke(h.f.cb, h.f.unit(h.sig), '2,8', '6,8'));
    expect(pv.missiles[0].nullHits.map((x: any) => [x.kind, x.id])).toContainEqual(['figment', h.fig]);
    expect(pv.fizzle).toBe(false);
    h.f.act({ type: 'combat/evoke', unitId: h.sig, tile: '2,8', aim: '6,8' } as any);
    expect(h.f.cb.units.some((v) => v.id === h.fig)).toBe(false);
    expect(h.f.cb.log.some((l) => /NULL unmakes .*Double/i.test(l))).toBe(true);
  });
});

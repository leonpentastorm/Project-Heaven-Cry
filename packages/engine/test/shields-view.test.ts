// 0.30.0, the shield display (Leon, 16 Nov 2026): screenViews.ts shieldsView lists a unit's shields in the order a blow
// meets them. The view must say what the damage path does: each case gives shields through the reducer (the Chaplain's
// Ward, a layer), applies a blow through the reducer (a shot), and checks that what the view predicted is what was spent.
import { describe, expect, it } from 'vitest';
import './helpers/yard16';
import { shieldsView, d20, RULES, type Unit, type Action } from '../src';
import { fightWith, type CharSpec } from './helpers/perkfight';
import { clearPrayerLimits } from '../src';

function rngFor(...ns: number[]): number { for (let s = 1; s < 5_000_000; s++) { const r = { state: s }; if (ns.every((n) => d20(r) === n)) return s; } throw new Error('no seed'); }
const L: any = (RULES as any).combat.shield_look;

/** A Chaplain (rank I Ward) next to an ally, on the Chaplain's turn; the ally is the one shielded and shot. */
function scene() {
  const spec: CharSpec = { name: 'Chaplain', skills: { faith: 6 }, attrs: { virtue: 8 }, level: 12, classId: 'guardian' };
  const f = fightWith([spec, { name: 'Gunner' }], [{ at: 'F6' }], { level: 12 });
  const c = f.g.characters[f.pc.charId!]; c.belief = { kind: 'faithful', patron: 'old_overcast' } as any; c.patron = 'old_overcast';
  const [me, a1] = f.pcs; me.pos = '2,5'; a1.pos = '2,7'; f.foes[0].pos = '9,5';
  for (const u of f.cb.units) { u.hp = u.maxHp; u.conds = {}; u.shield = 0; delete u.shields; }
  a1.hp = a1.maxHp = 5000; a1.armour = 0; a1.def = -40;
  f.turn(me);
  const ally = (): Unit => f.unit(a1.id), chap = (): Unit => f.unit(me.id);
  return {
    f, ally, chap,
    ward: () => { f.act({ type: 'combat/perk', unitId: me.id, id: 'class:guardian.ward', actionId: 'ward', targetId: a1.id } as Action, 'host'); clearPrayerLimits(chap()); },
    shoot: () => { f.g.rng.state = rngFor(15, 10, 10, 10); chap().ap = 6; f.act({ type: 'combat/attack', unitId: me.id, targetId: a1.id, mode: 'shot' } as Action, 'host'); },
  };
}
const held = (u: Unit) => (u.shield || 0) + (u.shields || []).reduce((a, l) => a + l.n, 0);

describe('shieldsView: the shields a blow meets, in its order', () => {
  it('lists a Ward (a layer, named by its class move, the Chaplain\'s attribute) before the shield, each with its own line', () => {
    const s = scene(); s.ward(); s.ally().shield = 40;
    const v = shieldsView(s.f.cb, s.ally(), s.chap());
    expect(v.known).toBe(true);
    expect(v.entries.map((e) => [e.kind, e.name, e.order])).toEqual([['layer', 'Ward', 1], ['base', L.base.name, 2]]);
    expect(v.entries[0].attribute).toBe('virtue'); expect(v.entries[0].by).toBe('Chaplain'); expect(v.entries[0].combines).toBe('separate');
    expect(v.entries[1].combines).toBe('replaces'); expect(v.entries[1].attribute).toBeNull();
    expect(v.entries[0].amount! + v.entries[1].amount!).toBe(held(s.ally())); expect(v.all).toBe(held(s.ally())); expect(v.rule).toBe(L.rule);
  });
  it('a blow smaller than the Ward: the Ward alone takes it (the view\'s first entry), the shield and HP are untouched', () => {
    const s = scene(); s.ward(); s.ally().shields![0].n = 4000; s.ally().shield = 40;
    const v = shieldsView(s.f.cb, s.ally(), s.chap()), hp = s.ally().hp;
    s.shoot();
    const after = shieldsView(s.f.cb, s.ally(), s.chap()), took = v.entries[0].amount! - after.entries[0].amount!;
    expect(took).toBeGreaterThan(0);
    expect(after.entries[1]).toMatchObject({ kind: 'base', amount: 40 }); expect(s.ally().hp).toBe(hp);
  });
  it('a blow bigger than every shield: all of them go, in order, and HP loses only what the view said would get through', () => {
    const s = scene(); s.ward(); s.ally().shields![0].n = 3; s.ally().shield = 4;
    const v = shieldsView(s.f.cb, s.ally(), s.chap()), hp = s.ally().hp; expect(v.blow).toBe(7);
    s.shoot();
    const dealt = hp - s.ally().hp; expect(dealt).toBeGreaterThan(0);
    expect(held(s.ally())).toBe(0); expect(shieldsView(s.f.cb, s.ally(), s.chap()).entries).toEqual([]);
    // the same seeded shot on the same scene with no shields: HP lost the blow less exactly what the view said
    const bare = scene(); const hp0 = bare.ally().hp; bare.shoot();
    expect(dealt).toBe(hp0 - bare.ally().hp - v.blow!);
  });
  it('Guard is its own pool after every shield, the Ward too: a blow the Ward holds spends no plate', () => {
    const s = scene(); const a = s.ally(); a.resMax = { ...(a.resMax || {}), guard: 5 }; a.res = { ...(a.res || {}), guard: 3 };
    s.ward(); s.ally().shields![0].n = 4000;
    const v = shieldsView(s.f.cb, s.ally(), s.chap());
    expect(v.guard).toMatchObject({ plates: 3, combines: 'separate pool' }); expect(v.entries.every((e) => e.kind !== ('guard' as any))).toBe(true);
    expect(v.all).toBe(4000 + 3 * v.guard!.soak); expect(v.blow).toBe(4000 + (3 - 1) * v.guard!.soak);
    s.shoot();
    expect(s.ally().res!.guard).toBe(3);
  });
  it('a foe reads by name with a size word, never a number; an Analyzed one reads exactly', () => {
    const s = scene(); const foe = s.f.foes[0]; foe.shield = Math.round(foe.maxHp * 0.3);
    const v = shieldsView(s.f.cb, s.f.unit(foe.id), s.chap());
    expect(v.known).toBe(false); expect(v.entries[0]).toMatchObject({ name: L.base.name, amount: null, size: 'strong' }); expect(v.all).toBeNull(); expect(v.blow).toBeNull();
    s.f.unit(foe.id).analyzedBy = s.chap().id;
    expect(shieldsView(s.f.cb, s.f.unit(foe.id), s.chap()).entries[0].amount).toBe(foe.shield);
  });
});

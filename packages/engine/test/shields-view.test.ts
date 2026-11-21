// 0.30.0, the shield display (Leon, 16 Nov 2026): screenViews.ts shieldsView lists a unit's shields in the order a blow
// meets them. The view must say what the damage path does: each case gives shields through the reducer (the Chaplain's
// Ward, a layer), applies a blow through the reducer (a shot), and checks that what the view predicted is what was spent.
import { describe, expect, it } from 'vitest';
import './helpers/yard16';
import { shieldsView, d20, RULES, CLASS, CLASS_MOVE_POOL, phys, type Unit, type Action } from '../src';
import { guardSoakOf } from '../src/physical/guard';
import { fightWith, type CharSpec } from './helpers/perkfight';
import { clearPrayerLimits, resolveAttack, applyDamage } from '../src';
import { physFight, rig } from './helpers/physfight';

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

  it("Durability's Guard: an ordinary blow meets the shields and every plate but the kept one (the headline); a blow that would drop it, every plate", () => {
    const s = scene(); const a = s.ally(); a.resMax = { ...(a.resMax || {}), guard: 5 }; a.res = { ...(a.res || {}), guard: 3 }; a.shield = 20;
    const v = shieldsView(s.f.cb, s.ally(), s.chap(), String);
    expect(v.guard).toMatchObject({ first: false, keep: 1 }); expect(v.guard!.how.startsWith(L.guard.after)).toBe(true);
    expect(v.absorb).toBe('Stops up to ' + (20 + 2 * v.guard!.soak) + ' of a blow before HP');
    expect(v.absorbDrop).toBe('Stops up to ' + (20 + 3 * v.guard!.soak) + ' of a blow that would take it down');
    expect(v.chip).toBe('+20 SHIELD'); expect(v.vs).toContain(String(20 + 2 * v.guard!.soak));
  });
  it('0.32 B7: one plate, kept back, no shield: the ordinary blow\'s line (a 0) is not said, only what it stops of a blow that would take it down', () => {
    const s = scene(); const a = s.ally(); a.resMax = { ...(a.resMax || {}), guard: 5 }; a.res = { ...(a.res || {}), guard: 1 }; a.shield = 0;
    const v = shieldsView(s.f.cb, s.ally(), s.chap(), String);
    expect(v.blow).toBe(0); expect(v.absorb).toBe(''); expect(v.vs).toBe('');
    expect(v.absorbDrop).toBe('Stops up to ' + v.guard!.soak + ' of a blow that would take it down');
  });
});

// Rules 1.73 item 5837: the Bulwark's rank III is Reforge, not the Reactive Plate (shelved): its plates are the door's,
// met after the shields like anyone's (the plan guardSoakOf reads), and the plate's own spend-first policy is gone.
describe('shieldsView: a rank III Bulwark\'s plates are the door\'s (the Reactive Plate is shelved)', () => {
  const PLATE = 'class:defender.reactive_plate';
  function bulwark() {
    rig(null);
    const f = physFight([{ weapon: 'sabre', classId: 'defender', level: 12, attrs: { endurance: 8 }, skills: { durability: 3, athletics: 4 } }], [{ tier: 'elite' }]);
    f.cb.objects = []; f.put(f.pc, 'C5'); f.put(f.foe, 'D5'); f.turn(f.pc);
    const u = f.unit(f.pc.id); u.hp = u.maxHp; u.armour = 0; u.resMax = { ...(u.resMax || {}), guard: 5 }; u.res = { ...(u.res || {}), guard: 3 }; u.shield = 30;
    return { f, u: () => f.unit(f.pc.id) };
  }
  it('the view: no plate of its own, Reforge held; the Guard line is the door\'s, met after the shields, as the plan says', () => {
    const { f, u } = bulwark(); expect(f.bound(() => phys.holds(u(), PLATE))).toBe(false); expect(f.bound(() => phys.holds(u(), 'class:defender.reforge'))).toBe(true);
    const v = shieldsView(f.cb, u(), null, String), plan = f.bound(() => guardSoakOf(u()));
    expect(v.guard).toMatchObject({ plates: 3, first: false }); expect(v.guard!.how.startsWith(L.guard.after)).toBe(true);
    expect(plan!.phase).not.toBe('before'); expect(v.guard!.soak).toBe(30 /* rules 1.95 (the scale): was plan!.per */);
  });
  it('a 40-damage blow meets the shield first, and no plate line of the Reactive Plate is said', () => {
    const { f, u } = bulwark();
    f.bound(() => applyDamage(f.cb, u(), 40, { type: 'weapon', by: f.unit(f.foe.id) } as any));
    expect(u().shield).toBe(0); expect(f.cb.log.some((l) => /plate hardens/.test(l))).toBe(false);
  });
  it('the plate\'s keep policy is no action any more', () => {
    const { f, u } = bulwark();
    expect(() => f.act({ type: 'combat/perk', unitId: u().id, id: PLATE, actionId: 'plate_keep1' } as Action, 'host')).toThrow();
  });
});

// 0.30.0 (the release merge of the tank rulings and the shield display): a rank III Bulwark (the pool by rank, rules
// 1.59 T5) with a shield in each hand (T4: gains doubled, the soak per plate unchanged) and a Chaplain's Ward on top.
// Rules 1.73 item 5837: no Reactive Plate any more: the Ward is met first, then the door's plates.
describe('shieldsView: a rank III Bulwark with two shields and a Ward, through the reducer', () => {
  const PLATE = 'class:defender.reactive_plate';
  const R = (CLASS as any).defender.resource.max_by_rank as Record<string, number>;
  const perPlate = (): number => (Object.values(CLASS_MOVE_POOL) as any[]).find((m) => m.id === 'reactive_plate' && m.origin === 'defender').effects.find((e: any) => e.op === 'stat_mod').value;
  function tank() {
    rig(null);
    const f = physFight([
      { weapon: 'buckler', classId: 'defender', level: 12, attrs: { endurance: 8 }, skills: { durability: 7, athletics: 4 } },
      { name: 'Chaplain', skills: { faith: 6 }, attrs: { virtue: 8 }, level: 12, classId: 'guardian' },
    ], [{ tier: 'elite' }]);
    f.cb.objects = [];
    const [me, chap] = f.pcs; f.put(me, 'C5'); f.put(chap, 'C7'); f.put(f.foe, 'J5');
    f.char(me).offHand = { id: 'riot_shield' } as any; f.unit(me.id).offItem = 'riot_shield';
    const cc = f.g.characters[chap.charId!]; cc.belief = { kind: 'faithful', patron: 'old_overcast' } as any; cc.patron = 'old_overcast';
    for (const u of f.cb.units) { u.hp = u.maxHp; u.conds = {}; u.shield = 0; delete u.shields; }
    const u = () => f.unit(me.id), c = () => f.unit(chap.id);
    u().armour = 0; u().def = -40; u().hp = u().maxHp = 5000;
    return { f, u, c, me, chap };
  }
  it('the pool is the rank III one, Brace with two shields fills it as the view counts it, and a shot meets the Ward before the plates', () => {
    const { f, u, c, me, chap } = tank();
    expect(f.bound(() => phys.holds(u(), PLATE))).toBe(false);
    expect(u().resMax!.guard).toBe(R['3']);
    // Brace through the reducer, two shields in hand: the view counts the plates the engine gave
    f.turn(me); u().res!.guard = 0; f.act({ type: 'combat/brace', unitId: me.id } as Action, 'host');
    const got = u().res!.guard!; expect(got).toBeGreaterThan(0);
    expect(shieldsView(f.cb, u(), null, String).guard).toMatchObject({ plates: got });
    // full plates, then the Chaplain's Ward on top (the reducer)
    u().res!.guard = u().resMax!.guard!;
    f.turn(chap); f.act({ type: 'combat/perk', unitId: chap.id, id: 'class:guardian.ward', actionId: 'ward', targetId: me.id } as Action, 'host'); clearPrayerLimits(c());
    expect(u().shields?.length).toBe(1); u().shields![0].n = 5;
    const v = shieldsView(f.cb, u(), null, String), full = R['3'];
    expect(v.guard).toMatchObject({ plates: full, first: false });
    expect(v.entries.map((e) => [e.kind, e.name])).toEqual([['layer', 'Ward']]);
    const hp = u().hp; f.g.rng.state = rngFor(15, 10, 10, 10); c().ap = 6;
    f.act({ type: 'combat/attack', unitId: chap.id, targetId: me.id, mode: 'shot' } as Action, 'host');
    const plates = full - (u().res!.guard || 0), wardLost = 5 - (u().shields?.[0]?.n ?? 0);
    if (plates > 0) expect(wardLost).toBe(5); // the Ward goes before any plate
    expect(f.cb.log.some((l) => /plate hardens/.test(l))).toBe(false); void hp;
  });
});

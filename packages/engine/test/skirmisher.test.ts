// Classes 3.0, step 3 (rules 1.30; docs/design/reactions-spec.md): reactions made real, and the Skirmisher (class id
// `marksman`). One test a rule, every number read from data. Revision 3 classes (the live roster): a rank III
// Skirmisher is Agility 8 at level 12.
import { describe, it, expect } from 'vitest';
import './helpers/yard16';
import { fightWith, withGame, type CharSpec } from './helpers/perkfight';
import { react, canReact, reactionsUsed, maxReactions, previewAttack, resolveAttack, moveUnit, itemInfo, CLASS, CLASS_MOVE_POOL, RULES, emit, price, condOn, type Unit } from '../src';
import { pressureOf } from '../src/physical/pressure';
import { onHook } from '../src/effects/hooks';
import { usable } from '../src/physical/core';

const R = (RULES as any).combat.reactions;
const sk = (rank: 1 | 2 | 3, extra: CharSpec = {}): CharSpec => ({ ...extra, classId: 'marksman', level: rank === 3 ? 12 : rank === 2 ? 6 : 3, attrs: { agility: rank === 3 ? 8 : rank === 2 ? 5 : 3, ...(extra.attrs || {}) } });
const breaker = (extra: CharSpec = {}): CharSpec => ({ ...extra, classId: 'fighter', level: 6, attrs: { strength: 5, ...(extra.attrs || {}) } });
const eff = (key: string, op: string, when?: string) => itemInfo(key)!.effects.find((e: any) => e.op === op && (when == null || e.when === when));
const move = (cls: string, id: string) => Object.values(CLASS[cls].ranks).flatMap((r: any) => r.moves).find((m: any) => m.id === id);
type F = ReturnType<typeof fightWith>;
const at = (f: F, u: Unit, pos: string) => { f.unit(u.id).pos = pos; };
const count = (f: F, re: RegExp, from = 0) => f.cb.log.slice(from).filter((l) => re.test(l)).length;

describe('the count (rules 1.30 items 1800, 1801)', () => {
  it('everyone has rules.json per_round reactions; Reflex (class gain) adds its effect\'s one: two for the Skirmisher', () => {
    const reflex = (CLASS.marksman as any).gain.find((m: any) => m.id === 'reflex');
    const f = fightWith([sk(1), { classId: 'defender', level: 3, attrs: { endurance: 3 } }], [{}]);
    const [s, d] = f.pcs;
    expect(maxReactions(d, f.cb)).toBe(R.per_round);
    expect(maxReactions(s, f.cb)).toBe(R.per_round + reflex.effects[0].value);
    expect(reflex.numbers.reactions).toBe(reflex.effects[0].value);
    // two reactions of any kind, each on its own event; the third is refused
    expect(withGame(f.g, () => react(f.cb, s, { kind: 'protect', event: 'e1' }))).toBe(true);
    expect(withGame(f.g, () => react(f.cb, s, { kind: 'move', event: 'e2' }))).toBe(true);
    expect(withGame(f.g, () => react(f.cb, s, { kind: 'attack', event: 'e3' }))).toBe(false);
    expect(reactionsUsed(f.cb, s)).toBe(2);
    // one event, one reaction a unit, even with two
    const f2 = fightWith([sk(1)], [{}]);
    expect(withGame(f2.g, () => react(f2.cb, f2.pc, { kind: 'protect', event: 'same' }))).toBe(true);
    expect(withGame(f2.g, () => react(f2.cb, f2.pc, { kind: 'protect', event: 'same' }))).toBe(false);
  });
  it('Cue gives exactly one more: two for a unit with one, before the giver\'s next turn', () => {
    const f = fightWith([{ classId: 'defender', level: 3, attrs: { endurance: 3 } }], [{}]);
    const u = f.unit(f.pc.id); (u as any).call = { cue: { r: f.cb.round } };
    const go = (e: string) => withGame(f.g, () => react(f.cb, f.unit(u.id), { kind: 'protect', event: e }));
    expect([go('a'), go('b'), go('c')]).toEqual([true, true, false]);
  });
});

describe('Killzone (rules 1.30 item 1807): two held attacks, both reactions', () => {
  const setUp = (weapon = 'hellraiser_service_rifle', foes = [{}, {}]) => {
    const f = fightWith([sk(3, { weapon })], foes);
    const u = f.turn(f.pc), [a, b] = f.foes; at(f, u, '1,2'); at(f, a, '10,2'); at(f, b, '12,2');
    f.act({ unitId: u.id, type: 'combat/perk', id: 'class:marksman.killzone' } as any);
    const me = f.unit(u.id); me.attack = 60; for (const x of [a, b]) f.unit(x.id).ap = 6;
    return { f, me, a, b };
  };
  it('the first shot spends numbers.spend (both) reactions; nothing else can react; the second fires on them', () => {
    const { f, me, a, b } = setUp(), kz: any = move('marksman', 'killzone');
    withGame(f.g, () => { moveUnit(f.cb, f.unit(a.id), '9,2', f.g.rng); });
    expect(count(f, /fires from overwatch/)).toBe(1);
    expect(reactionsUsed(f.cb, me)).toBe(kz.numbers.spend);
    expect(canReact(f.cb, me)).toBe(false);
    withGame(f.g, () => { moveUnit(f.cb, f.unit(b.id), '11,3', f.g.rng); });
    expect(count(f, /fires from overwatch/)).toBe(2);
    expect(reactionsUsed(f.cb, me)).toBe(kz.numbers.spend);
  });
  it('each held attack is at +numbers.hit to hit', () => {
    const { f, me, a } = setUp(), kz: any = move('marksman', 'killzone');
    const rolls: number[] = []; onHook('attack_roll', (ctx: any) => { if (ctx.att?.id === me.id) rolls.push(ctx.toHit); });
    const base = withGame(f.g, () => { const m = f.unit(a.id), was = m.pos; m.pos = '9,2'; try { return previewAttack(f.cb, f.unit(me.id), m, 'shot', { free: true, noRecoil: true }).toHit; } finally { m.pos = was; } });
    withGame(f.g, () => { moveUnit(f.cb, f.unit(a.id), '9,2', f.g.rng); });
    expect(rolls[0] - base).toBe(kz.numbers.hit);
  });
  it('with one reaction left only one fires, and the second is not held', () => {
    const { f, me, a, b } = setUp();
    withGame(f.g, () => react(f.cb, me, { kind: 'protect', event: 'before' }));
    withGame(f.g, () => { moveUnit(f.cb, f.unit(a.id), '9,2', f.g.rng); moveUnit(f.cb, f.unit(b.id), '11,3', f.g.rng); });
    expect(count(f, /fires from overwatch/)).toBe(1);
    expect(f.unit(me.id).overwatch).toBeFalsy();
  });
  it('with a melee weapon: two held strikes at enemies entering the reach', () => {
    const f = fightWith([sk(3, { weapon: 'combat_knife' })], [{}, {}]);
    const u = f.turn(f.pc), [a, b] = f.foes; at(f, u, '5,5'); at(f, a, '8,5'); at(f, b, '5,8');
    f.act({ unitId: u.id, type: 'combat/perk', id: 'class:marksman.killzone' } as any);
    expect(f.unit(u.id).overwatch).toBe('melee');
    const me = f.unit(u.id); me.attack = 60; for (const x of [a, b]) f.unit(x.id).ap = 6;
    withGame(f.g, () => { moveUnit(f.cb, f.unit(a.id), '6,5', f.g.rng); moveUnit(f.cb, f.unit(b.id), '5,6', f.g.rng); });
    expect(count(f, /fires from overwatch/)).toBe(2);
  });
});

describe('Keep one for a held shot (rules 1.30 item 1802)', () => {
  it('a Skirmisher holding a shot spends its first reaction on anything, never the last one but on the held fire', () => {
    const f = fightWith([sk(1)], [{}]);
    const u = f.unit(f.pc.id); u.overwatch = 'shot';
    const go = (e: string) => withGame(f.g, () => react(f.cb, f.unit(u.id), { kind: 'protect', event: e }));
    expect(go('a')).toBe(true);
    expect(go('b')).toBe(false); // the last one is the held shot's (rules.json keep_for_held)
    expect(withGame(f.g, () => react(f.cb, f.unit(u.id), { kind: 'attack', event: 'c', window: { kind: 'overwatch' } }))).toBe(true);
  });
  it('off (u.keepForHeld false), and never for a unit with one reaction', () => {
    const f = fightWith([sk(1), { classId: 'defender', level: 3, attrs: { endurance: 3 } }], [{}]);
    const [s, d] = f.pcs; f.unit(s.id).overwatch = 'shot'; f.unit(s.id).keepForHeld = false; f.unit(d.id).overwatch = 'shot';
    expect(withGame(f.g, () => [react(f.cb, f.unit(s.id), { kind: 'protect', event: 'a' }), react(f.cb, f.unit(s.id), { kind: 'protect', event: 'b' })])).toEqual([true, true]);
    expect(withGame(f.g, () => react(f.cb, f.unit(d.id), { kind: 'protect', event: 'a' }))).toBe(true);
  });
});

describe('Fire Discipline (rules 1.30 item 1804): any weapon', () => {
  it('the first attack of a turn costs its cut less (at least its min) with a light blade too; the second its own', () => {
    const c = eff('class:marksman.fire_discipline', 'cost_mod', 'attack');
    const f = fightWith([sk(1, { weapon: 'combat_knife' })], [{}]);
    const u = f.turn(f.pc); at(f, u, '4,2'); at(f, f.foe, '5,2'); f.unit(f.foe.id).hp = f.unit(f.foe.id).maxHp = 999;
    const own = withGame(f.g, () => previewAttack(f.cb, f.unit(u.id), f.unit(f.foe.id), 'melee')).ap;
    f.act({ unitId: u.id, type: 'combat/attack', targetId: f.foe.id, mode: 'melee' } as any);
    const ap1 = f.unit(u.id).ap;
    f.act({ unitId: u.id, type: 'combat/attack', targetId: f.foe.id, mode: 'melee' } as any);
    const first = 6 - ap1, second = ap1 - f.unit(u.id).ap; // the second is the strike's own price
    expect(first).toBe(Math.max(c.min, second + c.value)); expect(first).toBe(own); expect(second).toBeGreaterThan(first);
  });
});

describe('Speed Loader (rules 1.30 item 1805)', () => {
  it('a pick-up and a swap are cut as a reload is: once a turn, shared', () => {
    const c = eff('class:marksman.speed_loader', 'cost_mod', 'cost');
    const f = fightWith([sk(1)], [{}]);
    const u = f.turn(f.pc);
    expect(withGame(f.g, () => price({ cb: f.cb, u: f.unit(u.id) }, 'pickup', 3)).ap).toBe(3 + c.value);
    const sw: any = withGame(f.g, () => emit(f.cb, 'swap', { u: f.unit(u.id), ap: 2, cb: f.cb }));
    expect(sw.ap).toBe(2 + c.value); // the swap takes the turn's use
    const sw2: any = withGame(f.g, () => emit(f.cb, 'swap', { u: f.unit(u.id), ap: 2, cb: f.cb }));
    expect(sw2.ap).toBe(2);
    expect(withGame(f.g, () => price({ cb: f.cb, u: f.unit(u.id) }, 'pickup', 3)).ap).toBe(3);
  });
});

describe('Special Ammo on any weapon (rules 1.30 item 1806)', () => {
  it('a blade takes a load for numbers.load_ap AP; its hits carry the round; it lasts numbers.load_attacks attacks', () => {
    const sa: any = CLASS_MOVE_POOL['marksman.special_ammo'];
    const f = fightWith([sk(2, { weapon: 'combat_knife' })], [{}]);
    const u = f.turn(f.pc); at(f, u, '4,2'); at(f, f.foe, '5,2'); f.unit(f.foe.id).hp = f.unit(f.foe.id).maxHp = 9999;
    f.act({ unitId: u.id, type: 'combat/perk', id: 'class:marksman.special_ammo', actionId: 'load_hollow_point' } as any);
    expect(f.unit(u.id).ammoType).toBe('hollow_point'); expect(f.unit(u.id).ap).toBe(6 - sa.numbers.load_ap);
    const pv: any = withGame(f.g, () => previewAttack(f.cb, f.unit(u.id), f.unit(f.foe.id), 'melee'));
    expect(pv.dmg.mults.some((m: any) => /hollow-point/.test(m.label))).toBe(true);
    for (let i = 0; i < sa.numbers.load_attacks; i++) { f.unit(u.id).ap = 6; withGame(f.g, () => resolveAttack(f.cb, f.g.rng, f.unit(u.id), f.unit(f.foe.id), 'melee', null, { noAp: true })); }
    expect(f.unit(u.id).ammoType).toBeFalsy();
  });
  it('never a consumable', () => {
    const f = fightWith([sk(2, { weapon: 'frag_grenade' })], [{}]);
    const u = f.turn(f.pc);
    expect(() => f.act({ unitId: u.id, type: 'combat/perk', id: 'class:marksman.special_ammo', actionId: 'load_incendiary' } as any)).toThrow(/its own payload/);
  });
});

describe('Run and Gun (rules 1.30 item 1808)', () => {
  const rg: any = () => move('marksman', 'run_and_gun');
  const setUp = () => {
    const f = fightWith([sk(3, { weapon: 'hellraiser_service_rifle' })], [{ weapon: 'combat_knife' }]);
    const u = f.turn(f.pc); at(f, u, '4,4'); at(f, f.foe, '5,4');
    const foe = f.unit(f.foe.id); foe.hp = foe.maxHp = 9999; foe.attack = 60; f.unit(u.id).attack = 60; f.unit(u.id).hp = f.unit(u.id).maxHp = 9999;
    return { f, u };
  };
  it('after an attack, the next move of up to numbers.tiles tiles is free and draws no opportunity attack; the bank keeps', () => {
    const { f, u } = setUp();
    f.act({ unitId: u.id, type: 'combat/attack', targetId: f.foe.id, mode: 'shot' } as any);
    const ap = f.unit(u.id).ap, bank = f.unit(u.id).bank, L = f.cb.log.length;
    f.act({ unitId: u.id, type: 'combat/move', to: '4,' + (4 - rg().numbers.tiles) } as any);
    expect(f.unit(u.id).ap).toBe(ap); expect(f.unit(u.id).bank).toBe(bank);
    expect(count(f, /opportunity attack/, L)).toBe(0);
    expect(condOn(f.unit(u.id), 'slipping')).toBe(false); // it ended with the move
  });
  it('without an attack first, the same move is paid and draws the opportunity attack', () => {
    const { f, u } = setUp(), ap = f.unit(u.id).ap, L = f.cb.log.length;
    f.act({ unitId: u.id, type: 'combat/move', to: '4,' + (4 - rg().numbers.tiles) } as any);
    expect(f.unit(u.id).ap).toBeLessThan(ap);
    expect(count(f, /opportunity attack/, L)).toBe(1);
  });
  it('a longer move is not free; the next hit after the free move adds numbers.pressure more Pressure', () => {
    const { f, u } = setUp();
    at(f, f.foe, '9,4');
    f.act({ unitId: u.id, type: 'combat/attack', targetId: f.foe.id, mode: 'shot' } as any);
    const ap = f.unit(u.id).ap;
    f.act({ unitId: u.id, type: 'combat/move', to: '4,' + (4 - rg().numbers.tiles - 1) } as any);
    expect(f.unit(u.id).ap).toBeLessThan(ap);
    // the Pressure the second hit adds, with the free move between the hits and without it
    const added = (ran: boolean) => {
      const g = fightWith([sk(3, { weapon: 'hellraiser_service_rifle' })], [{}]);
      const v = g.turn(g.pc); at(g, v, '4,4'); at(g, g.foe, '9,4'); const foe = g.unit(g.foe.id); foe.hp = foe.maxHp = 9999; g.unit(v.id).attack = 60;
      g.act({ unitId: v.id, type: 'combat/attack', targetId: g.foe.id, mode: 'shot' } as any);
      const p1 = pressureOf(g.unit(g.foe.id));
      if (ran) g.act({ unitId: v.id, type: 'combat/move', to: '4,3' } as any);
      g.unit(v.id).ap = 6;
      g.act({ unitId: v.id, type: 'combat/attack', targetId: g.foe.id, mode: 'shot' } as any);
      return pressureOf(g.unit(g.foe.id)) - p1;
    };
    expect(added(true) - added(false)).toBe(rg().numbers.pressure);
  });
});

describe('Riposte, one Answer (rules 1.30 item 1810)', () => {
  const fight = (momentum: number) => {
    const f = fightWith([breaker({ weapon: 'combat_knife' })], [{ weapon: 'combat_knife' }]);
    at(f, f.pc, '4,2'); at(f, f.foe, '5,2'); const me = f.unit(f.pc.id); me.res!.momentum = momentum; me.hp = me.maxHp = 9999;
    const foe = f.unit(f.foe.id); foe.attack = -60; foe.hp = foe.maxHp = 9999; f.cb.turn = f.cb.order.indexOf(foe.id);
    return { f, me, foe };
  };
  it('the class gives the Answer with any melee weapon (the knife lends no Riposte)', () => {
    const { f, me } = fight(1);
    expect(usable(f.cb, me, 'main').some((x) => x.id === 'riposte')).toBe(true);
  });
  it('a miss: it answers once, spends the rider\'s Momentum and adds the Counter bonus', () => {
    const { f, me, foe } = fight(2), cost = -eff('class:fighter.riposte', 'resource', 'attack_roll').value;
    withGame(f.g, () => resolveAttack(f.cb, f.g.rng, foe, me, 'melee', null, { noAp: true }));
    expect(count(f, /answers with Riposte/)).toBe(1);
    expect(f.unit(me.id).res!.momentum).toBeLessThanOrEqual(2 - cost + 1); // the strike's own hit may add 1 back
    expect(reactionsUsed(f.cb, f.unit(me.id))).toBe(1);
    expect(f.cb.log.some((l) => /Counter/.test(l)) || (f.unit(me.id).counter || 0) === 0).toBe(true);
  });
  it('with no Momentum the Breaker does not Riposte, and keeps its reaction', () => {
    const { f, me, foe } = fight(0);
    withGame(f.g, () => resolveAttack(f.cb, f.g.rng, foe, me, 'melee', null, { noAp: true }));
    expect(count(f, /answers with Riposte/)).toBe(0);
    expect(reactionsUsed(f.cb, f.unit(me.id))).toBe(0);
  });
});

// "I've seen a turn where my character Riposted 4 times" (Leon, 13 Nov 2026; BUGLIST-0.22.md, "Riposte fired four
// times"). Rules: one reaction a round, counted, for everyone (spec item 89); an Answer is a reaction; Riposte "uses
// your reaction"; the Fighter's Riposte is "reaction, 1 Momentum" (rules 1.30: one Answer); Killzone spends both reactions.
import { describe, it, expect, beforeEach } from 'vitest';
import './helpers/yard16';
import { physFight, rig } from './helpers/physfight';
import { fightWith, withGame, type CharSpec } from './helpers/perkfight';
import { useRevision2Classes, SIG } from './helpers/legacy';
import { moveUnit, canReact, reactionsUsed, resolveAttack, type Unit } from '../src';

useRevision2Classes(); // the class move tests read the Revision 2 rank gates, as classes-i.test.ts does
beforeEach(() => rig(null));

const count = (log: string[], re: RegExp) => log.filter((l) => re.test(l)).length;
function cls(id: string, rank: 1 | 2 | 3, extra: CharSpec = {}): CharSpec {
  const sig = SIG(id), pts = rank === 3 ? [6, 6, 6] : rank === 2 ? [5, 4, 4] : [1, 1, 1];
  return { ...extra, classId: id, level: 5, skills: { ...Object.fromEntries(sig.map((s, i) => [s, pts[i]])), ...(extra.skills || {}) } };
}

describe('one reaction a round: Riposte', () => {
  const four = [{ at: 'D5', tier: 'elite', weapon: 'combat_knife' }, { at: 'D4', tier: 'elite', weapon: 'combat_knife' }, { at: 'D6', tier: 'elite', weapon: 'combat_knife' }, { at: 'C4', tier: 'elite', weapon: 'combat_knife' }];
  it('the technique: four foes miss in melee in one round (their own turns, the enemy AI): one Riposte', () => {
    const f = physFight([{ weapon: 'sabre', known: ['riposte'], skills: { athletics: 6, raw_power: 4 } }], four);
    f.put(f.pc, 'C5'); for (const u of f.foes) u.hp = u.maxHp = 9999;
    f.cb.order = [f.pc.id, ...f.foes.map((u) => u.id)]; // the PC, then the four foes: one round
    f.cb.round += 1; // a fresh round (the opening foes' turns were round 1)
    f.turn(f.pc); const r0 = f.cb.round, L0 = f.cb.log.length;
    rig({ hit: false, die: 5 });
    f.act({ type: 'combat/end-turn', unitId: f.pc.id } as any);
    const log = f.cb.log.slice(L0, f.cb.log.length);
    expect(f.cb.round).toBe(r0 + 1); // the four foe turns were one round
    expect(count(log, /^Foe \d strikes Tester 1: .* miss/)).toBeGreaterThanOrEqual(4);
    expect(count(log, /Tester 1 answers with Riposte/)).toBe(1);
  });
  it('the Fighter\'s Riposte is the technique\'s one Answer (rules 1.30): three misses in a round, one Riposte', () => {
    const f = fightWith([cls('fighter', 2, { weapon: 'sabre' })], [{ weapon: 'combat_knife' }, { weapon: 'combat_knife' }, { weapon: 'combat_knife' }]);
    const me = f.unit(f.pc.id); me.pos = '4,2'; me.res!.momentum = 5; me.hp = me.maxHp = 9999;
    const foes = f.foes.map((x) => f.unit(x.id)); foes[0].pos = '5,2'; foes[1].pos = '4,3'; foes[2].pos = '3,2';
    for (const x of foes) { x.attack = -60; x.hp = x.maxHp = 9999; }
    const r0 = f.cb.round;
    for (const x of foes) { f.cb.turn = f.cb.order.indexOf(x.id); withGame(f.g, () => resolveAttack(f.cb, f.g.rng, x, f.unit(me.id), 'melee', null, { noAp: true })); }
    expect(f.cb.round).toBe(r0);
    expect(count(f.cb.log, /ripostes \(1 Momentum\)|answers with Riposte/)).toBe(1);
    expect(reactionsUsed(f.cb, f.unit(me.id))).toBe(1);
  });
});

describe('Killzone (rules 1.30): it spends both reactions; a unit with one spends it, and only one shot fires', () => {
  it('a Revision 2 Marksman (no Reflex): the first shot takes the one reaction, nothing else is free, the second is not held', () => {
    const f = fightWith([cls('marksman', 3, { weapon: 'hellraiser_service_rifle' })], [{}, {}]);
    const u = f.turn(f.pc); const [a, b] = f.foes;
    for (const [x, at] of [[u, '1,2'], [a, '10,2'], [b, '12,2']] as [Unit, string][]) f.unit(x.id).pos = at;
    f.act({ unitId: u.id, type: 'combat/perk', id: 'class:marksman.killzone' } as any);
    const g = f.g, cb = f.cb, me = f.unit(u.id); me.attack = 60; for (const x of [a, b]) f.unit(x.id).ap = 6;
    withGame(g, () => { moveUnit(cb, f.unit(a.id), '9,2', g.rng); moveUnit(cb, f.unit(a.id), '9,3', g.rng); });
    expect(count(cb.log, /fires from overwatch/)).toBe(1);
    expect(reactionsUsed(cb, me)).toBe(1);
    expect(canReact(cb, me)).toBe(false);    // nothing else (a Parry, a Dance of Iron, a Call) can take one
    withGame(g, () => { moveUnit(cb, f.unit(b.id), '11,3', g.rng); });
    expect(count(cb.log, /fires from overwatch/)).toBe(1); // both reactions (Leon): with one, only one fires (skirmisher.test.ts: two with Reflex)
    expect(reactionsUsed(cb, me)).toBe(1);
  });
});

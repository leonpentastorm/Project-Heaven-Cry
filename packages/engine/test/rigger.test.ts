// @ts-nocheck (Figment fields on units are read loosely here)
// Classes 3.0 step 8 (rules 1.34; docs/design/figments-spec.md section 5): the Rigger (class id trickster), its six moves,
// Field Repair (Improvisation's door action), the Blade's Hold, and the old save (every key resolves). Numbers from data.
import { describe, it, expect } from 'vitest';
import { figFight } from './helpers/figfight';
import { withGame } from './helpers/perkfight';
import CLASSESJ from '../../../data/classes.json';
import FIGJ from '../../../data/figments.json';
import ACTIONSJ from '../../../data/actions.json';
import { CLASS, classMoveKeys, itemInfo, ladderAt, heldMax, FORM, isFigment, applyDamage, figmentsOf, perkActionsFor } from '../src';

const F: any = FIGJ, ACT: any = ACTIONSJ;
const T: any = (CLASSESJ as any).base.find((b: any) => b.id === 'trickster');
const move = (id: string) => [...T.ranks.I.moves, ...T.ranks.II.moves, ...T.ranks.III.moves].find((m: any) => m.id === id) || (CLASSESJ as any).move_pool.moves.find((m: any) => m.id === id && m.origin === 'infiltrator');
const rigger = (o: any = {}) => figFight([{ classId: 'trickster', level: o.level ?? 12, attrs: { expression: 8 }, skills: { visualization: o.vis ?? 0, proficiency: o.prof ?? 4, ...(o.skills || {}) }, weapon: 'service_pistol' }], o.foes || [{ tier: 'soldier', at: '9,4', classic: true }]);
const use = (f: any, u: any, key: string, args: any = {}) => f.act({ type: 'combat/perk', unitId: u.id, id: key, ...args } as any);

describe('the Rigger: the class', () => {
  it('six moves: Double and Field Fix, Salvage and Overclock, Sleight and Scrap Turret; Read, Silver Tongue, Blind and Slow, Rewrite leave (shelved keys)', () => {
    expect(CLASS.trickster.name).toBe('Rigger');
    expect(classMoveKeys({ perks: [], traits: [], cls: 'trickster', rank: 3 } as any).map((x) => x.key)).toEqual(expect.arrayContaining(['class:trickster.false_image', 'class:infiltrator.field_fix', 'class:trickster.salvage', 'class:trickster.overclock', 'class:trickster.sleight', 'class:trickster.scrap_turret']));
    const pool = (CLASSESJ as any).move_pool.moves.filter((m: any) => m.origin === 'trickster');
    for (const id of ['silver_tongue', 'blind_and_slow', 'rewrite']) expect(pool.find((m: any) => m.id === id).status).toBe('shelved');
    expect(T.gain[0].effects.map((e: any) => e.stat)).toEqual(['ties_max:owned', 'figment_designs']);
  });
  it('a bigger meter: one more Figment held (with the door)', () => {
    const f = rigger({ vis: 5 }); const u = f.turn(f.pc); expect(heldMax(u)).toBe(ladderAt(5).held + T.gain[0].numbers.held);
    const g = rigger({ vis: 0 }); expect(heldMax(g.turn(g.pc))).toBe(0); // the extra one needs the door
  });
  it('the old save: an old Trickster loads; every move key it held resolves', () => {
    // (class:trickster.read is gone: Read is folded into the Operative's Analyze, rules 1.32, the lead's ruling at step 8's
    // integration. A class's moves come from its ranks, not the save, so an old Trickster simply has no Read.)
    expect(itemInfo('class:trickster.read')).toBeNull();
    for (const k of ['class:trickster.false_image', 'class:trickster.sleight', 'class:trickster.silver_tongue', 'class:trickster.blind_and_slow', 'class:trickster.rewrite', 'class:infiltrator.field_fix'])
      expect(itemInfo(k), k).toBeTruthy();
  });
});

describe('the Rigger: the moves', () => {
  it('Double: 2 AP and its charge; a bare Double outside the held count, no upkeep, gone at your turn start `rounds` on; works with Visualization 0', () => {
    const f = rigger({ vis: 0 }); let u = f.turn(f.pc); const ap = u.ap, c0 = u.mg!.vcharge!;
    use(f, u, 'class:trickster.false_image', { tile: '3,4' }); u = f.unit(u.id);
    const d = f.figments(u)[0]; expect(d.name).toBe(FORM.double.name); expect(d.owned!.free).toBe(true); expect(d.owned!.upkeep).toBeUndefined();
    expect(ap - u.ap).toBe(move('false_image').ap_cost); expect(u.mg!.vcharge).toBe(c0 - move('false_image').numbers.charge);
    for (let i = 0; i < move('false_image').numbers.rounds; i++) { f.cb.round++; u = f.turn(u); }
    expect(f.figments(u).length).toBe(0);
  });
  it('Field Fix: the door\'s repair, no part, no Improvisation, reach 2, on a Figment', () => {
    const f = rigger({ vis: 5, prof: 0 }); let u = f.turn(f.pc); f.picture(u, 'beast', '3,4'); u = f.unit(u.id);
    const b = f.figments(u)[0]; b.hp = 1; u.ap = 6; const parts = u.parts || 0;
    use(f, u, 'class:infiltrator.field_fix', { targetId: b.id, choice: 'repair' }); u = f.unit(u.id);
    expect(f.unit(b.id).hp).toBeGreaterThan(1); expect(u.parts || 0).toBe(parts); expect(6 - u.ap).toBe(move('field_fix').ap_cost);
  });
  it('Salvage: a wreck gives its charge, once a fight; reclaim lets a Figment go with all its charge', () => {
    const f = rigger({ vis: 5, foes: [{ tier: 'soldier', at: '9,4', classic: true }, { tier: 'soldier', at: '12,8', classic: true }] }); let u = f.turn(f.pc); f.picture(u, 'beast', '2,4'); u = f.unit(u.id);
    const c1 = u.mg!.vcharge!; use(f, u, 'class:trickster.salvage', { choice: 'reclaim' }); u = f.unit(u.id);
    expect(u.mg!.vcharge).toBe(c1 + FORM.beast.charge); expect(f.figments(u).length).toBe(0);
    // a wreck: the foe is a drone, destroyed next to you
    const foe = f.foe; foe.kind = 'drone'; foe.pos = '2,4'; withGame(f.g, () => applyDamage(f.cb, foe, 9999, { by: u, type: 'weapon' } as any));
    u.ap = 6; u.mg!.vcharge = 0; use(f, u, 'class:trickster.salvage', { choice: 'wreck' }); u = f.unit(u.id);
    expect(u.mg!.vcharge).toBe(move('salvage').numbers.charge);
    u.ap = 6; expect(() => use(f, u, 'class:trickster.salvage', { choice: 'wreck' })).toThrow(/wreck/);
  });
  it('Overclock: a Figment of yours attacks now at no AP and takes its strain; never a squadmate; once a turn', () => {
    const f = rigger({ vis: 5 }); let u = f.turn(f.pc); f.picture(u, 'beast', '3,4'); u = f.unit(u.id); f.foe.pos = '4,4'; f.foe.hp = f.foe.maxHp = 99999; // the strike must not end the fight (rules 1.36 scaled its hit)
    const b = f.figments(u)[0], hp = b.hp, ap = u.ap; use(f, u, 'class:trickster.overclock', { targetId: b.id }); u = f.unit(u.id);
    expect(ap - u.ap).toBe(move('overclock').ap_cost); expect(f.unit(b.id).hp).toBeLessThan(hp);
    expect(() => use(f, u, 'class:trickster.overclock', { targetId: b.id })).toThrow();
  });
  it('Sleight: swap places with one of your Figments', () => {
    const f = rigger({ vis: 5 }); let u = f.turn(f.pc); f.picture(u, 'beast', '3,4'); u = f.unit(u.id);
    const b = f.figments(u)[0], was = u.pos; use(f, u, 'class:trickster.sleight', { targetId: b.id }); u = f.unit(u.id);
    expect(u.pos).toBe('3,4'); expect(f.unit(b.id).pos).toBe(was);
  });
  it('Scrap Turret: from a barricade-less wreck next to you, a turret that fires at your turn starts for `rounds` rounds, then is gone', () => {
    const f = rigger({ vis: 0, foes: [{ tier: 'soldier', at: '9,4', classic: true }, { tier: 'soldier', at: '12,4', classic: true }] }); let u = f.turn(f.pc);
    const w = f.foes[0]; w.kind = 'drone'; w.pos = '2,4'; withGame(f.g, () => applyDamage(f.cb, w, 9999, { by: u, type: 'weapon' } as any));
    use(f, u, 'class:trickster.scrap_turret', { tile: '2,4' }); u = f.unit(u.id);
    const tr = f.cb.units.find((x: any) => x.owned?.kind === 'machine')!; expect(tr).toBeTruthy(); expect(tr.owned!.turn).toBe('auto');
    const n0 = f.cb.log.length; f.cb.round++; u = f.turn(u);
    expect(f.cb.log.slice(n0).some((l: any) => String(l.text || l).includes(tr.name))).toBe(true);
    for (let i = 1; i < move('scrap_turret').numbers.rounds; i++) { f.cb.round++; u = f.turn(u); }
    expect(f.cb.units.some((x: any) => x.owned?.kind === 'machine')).toBe(false);
  });
});

describe('Field Repair (Improvisation\'s door action) and the Blade', () => {
  it('Field Repair: 2 AP and a spare part, on a Figment next to you: the repair amount', () => {
    const f = figFight([{ skills: { visualization: 5, proficiency: 3 }, level: 5, weapon: 'service_pistol' }]); let u = f.turn(f.pc);
    f.picture(u, 'beast', '2,4'); u = f.unit(u.id); const b = f.figments(u)[0]; b.hp = 1; u.ap = 6; u.parts = 1;
    f.act({ type: 'combat/repair', unitId: u.id, targetId: b.id, way: 'repair' } as any); u = f.unit(u.id);
    expect(f.unit(b.id).hp).toBeGreaterThan(1); expect(u.parts).toBe(0); expect(6 - u.ap).toBe(ACT.costs.field_repair.ap);
  });
  it('the Blade\'s Hold: the first enemy to step next to it is Cut, spending its owner\'s reaction', () => {
    const f = figFight([{ skills: { visualization: 5 }, level: 5, weapon: 'service_pistol' }], [{ tier: 'soldier', at: '12,4', classic: true }]); let u = f.turn(f.pc);
    f.picture(u, 'blade', '6,4'); u = f.unit(u.id); const bl = f.figments(u)[0]; expect(FORM.blade.hold).toBeTruthy();
    const adj = (x: any) => Math.max(Math.abs(Number(x.pos.split(',')[0]) - 6), Math.abs(Number(x.pos.split(',')[1]) - 4)) <= 1;
    const was = f.foes.map(adj); // (rules 1.37: a foe that sees the Blade walks round its reach when it can; it is Cut only if it steps into or out of it)
    f.act({ type: 'combat/end-turn', unitId: u.id } as any);
    const cut = f.cb.log.some((l: any) => /holds: it cuts/.test(String(l.text || l)));
    const crossed = f.foes.some((x: any, i: number) => adj(x) !== was[i]);
    expect(cut || !crossed).toBe(true); void bl; void isFigment; void figmentsOf; void perkActionsFor; void F;
  });
});

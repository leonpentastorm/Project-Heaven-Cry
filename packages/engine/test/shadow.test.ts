// Classes 3.0, step 6 (rules 1.32; docs/design/shadow-spec.md): Shadow, Perception's door through Ingenuity, and the
// Operative (class id `infiltrator`). One test a rule of the spec's section 2 and one a verb or move; every number is
// read from data (rules.json shadow, the door item skills.json ingenuity.1, data/shadow.json, classes.json).
import { describe, it, expect } from 'vitest';
import './helpers/yard16';
import { fightWith, withGame, type CharSpec } from './helpers/perkfight';
import { previewAttack, resolveAttack, itemInfo, CLASS, RULES, SKILL, condOn, type Unit } from '../src';
import { resOf } from '../src/tactics';
import { applyCond } from '../src/magic';
import { perkActionsFor } from '../src/effects/actions';
import { allVerbs } from '../src/effects/collect';
import { numberOf, dataRef } from '../src/datatext';
import { doorLadderOf, reachAt, cashFactor } from '../src/door';

const SH: any = (RULES as any).shadow;
const DOOR: any = (SKILL.ingenuity as any).unlocks['1'];
const BREAK: any = DOOR.toggles[0];
const LAD = doorLadderOf('ingenuity')!; // rules 1.99 item 8360: the meter's top is Ingenuity's Reach
const reachOf = (skills: Record<string, number>) => reachAt(skills, LAD);
const VERB = (id: string) => allVerbs().find((v: any) => v.id === id) as any;
const door = (ing: number, extra: CharSpec = {}): CharSpec => ({ ...extra, skills: { ingenuity: ing, ...(extra.skills || {}) }, attrs: { perception: Math.max(ing, 3), ...(extra.attrs || {}) } });
const operative = (ing = 7, extra: CharSpec = {}): CharSpec => ({ ...door(ing, extra), classId: 'infiltrator', level: 12, attrs: { perception: 8, ...(extra.attrs || {}) } });
type F = ReturnType<typeof fightWith>;
const at = (f: F, u: Unit, pos: string) => { f.unit(u.id).pos = pos; };
const hideNow = (f: F, u: Unit) => withGame(f.g, () => applyCond(f.cb, f.g.rng, null, f.unit(u.id), 'hidden', undefined, undefined, { skipSave: true }));
const shadow = (f: F, u: Unit) => resOf(f.unit(u.id), 'shadow');
const setShadow = (f: F, u: Unit, n: number) => { (f.unit(u.id).res ||= {}).shadow = n; };
const endTurn = (f: F, u: Unit) => f.act({ type: 'combat/end-turn', unitId: u.id } as any);
/** Put the first foe on a tile; blind: it sees nothing past the next tile (so the PC is out of view). */
const foeAt = (f: F, pos: string, blind = false) => { const t = f.unit(f.foe.id); t.pos = pos; if (blind) t.vision = 1; return t; };

describe('2.2 the meter', () => {
  it('anyone with Ingenuity has it: the top is Ingenuity Reach on its door ladder (with the family gates); none at 0', () => {
    for (const r of LAD.rows) for (const fam of [{}, r.needs || {}]) {
      const skills = { ingenuity: r.points, ...fam }, f = fightWith([door(r.points, { skills })], [{}]);
      expect(f.unit(f.pc.id).resMax?.shadow).toBe(reachOf(skills));
      expect(shadow(f, f.pc)).toBe(0);
    }
    expect(reachOf({ ingenuity: 10 })).toBeLessThan(reachOf({ ingenuity: 10, analysis: 7, vigilant: 4 })); // ruling 13: the top needs the family
    const f0 = fightWith([{ skills: { ingenuity: 0 } }], [{}]);
    expect(f0.unit(f0.pc.id).resMax?.shadow).toBeUndefined();
  });
  it('the Operative holds the same Reach as anyone (its +1 retired, ruling C16) and starts each fight with operative_start', () => {
    const f = fightWith([operative(7)], [{}]);
    expect(f.unit(f.pc.id).resMax?.shadow).toBe(reachOf({ ingenuity: 7 }));
    expect(SH.operative_cap_add).toBeUndefined();
    expect(shadow(f, f.pc)).toBe(SH.operative_start);
    const tc: any = (CLASS.infiltrator as any).gain.find((m: any) => m.id === 'tradecraft');
    expect(tc.effects[0].value).toBe(SH.operative_start);
  });
});

describe('2.3 gains and 2.4 losses', () => {
  it('a: +1 at your turn\'s end, Hidden, with no attack made', () => {
    const f = fightWith([door(7)], [{}]); foeAt(f, '14,5', true);
    const u = f.turn(f.pc); at(f, u, '1,4'); hideNow(f, u);
    endTurn(f, u);
    expect(shadow(f, u)).toBe(DOOR.effects[0].value);
  });
  it('a: no gain on a turn with an attack (a hit or a miss marks it)', () => {
    const f = fightWith([door(7, { weapon: 'hellraiser_service_rifle' })], [{}]); foeAt(f, '6,4', true);
    const u = f.turn(f.pc); at(f, u, '1,4'); hideNow(f, u);
    withGame(f.g, () => resolveAttack(f.cb, f.g.rng, f.unit(u.id), f.unit(f.foe.id), 'shot', null, { free: true }));
    const was = shadow(f, u); hideNow(f, u); endTurn(f, u);
    expect(shadow(f, u)).toBe(was);
  });
  it('b: +1 once a turn for a move from cover to cover, Hidden, ending out of view', () => {
    const f = fightWith([door(7)], [{}]); foeAt(f, '15,10', true);
    const u = f.turn(f.pc); at(f, u, '4,3'); hideNow(f, u); // 4,3 is next to the wall at 5,3; 4,4 is next to 5,4
    f.act({ type: 'combat/move', unitId: u.id, to: '4,4' } as any);
    expect(shadow(f, u)).toBe(DOOR.effects[1].value);
    f.act({ type: 'combat/move', unitId: u.id, to: '4,3' } as any);
    expect(shadow(f, u)).toBe(DOOR.effects[1].value); // once a turn
  });
  it('f: the door\'s gains stop at door_gains_per_turn a turn (one shared counter)', () => {
    expect(DOOR.effects[0].limit.n).toEqual({ base: 0, per: [{ of: 'rule:shadow.door_gains_per_turn', value: 1 }] }); // the rows read the one number
    expect(numberOf(DOOR.effects[0].limit.n, dataRef)).toBe(SH.door_gains_per_turn);
    for (const i of [0, 1, 2]) expect(DOOR.effects[i].limit).toEqual(DOOR.effects[0].limit);
  });
  it('e: a gain at the cap is lost, not banked', () => {
    const f = fightWith([door(1)], [{}]); foeAt(f, '14,5', true);
    const u = f.turn(f.pc); hideNow(f, u); setShadow(f, u, reachOf({ ingenuity: 1 }));
    endTurn(f, u);
    expect(shadow(f, u)).toBe(reachOf({ ingenuity: 1 }));
  });
  it('2.4 b: −1 at the start of your turn while an enemy sees you', () => {
    const f = fightWith([door(7)], [{}]); foeAt(f, '6,4');
    const u = f.unit(f.pc.id); at(f, u, '1,4'); setShadow(f, u, 2);
    f.turn(u);
    expect(shadow(f, u)).toBe(2 + DOOR.effects[3].value);
  });
  it('2.4 c, d: Downed or the fight\'s end: 0', () => {
    const z = DOOR.effects.filter((e: any) => e.value === 'zero').map((e: any) => e.when);
    expect(z).toEqual(['downed', 'combat_end']);
  });
});

describe('2.5 the Break', () => {
  const ready = (pts = 3, extra: CharSpec = {}) => {
    const f = fightWith([door(7, { weapon: 'hellraiser_service_rifle', ...extra })], [{ tier: 'soldier' }]); foeAt(f, '6,4');
    const u = f.turn(f.pc); at(f, u, '1,4'); hideNow(f, u); setShadow(f, u, pts);
    return { f, u: f.unit(u.id), t: f.unit(f.foe.id) };
  };
  const mods = ['skill:ingenuity.1#' + BREAK.id];
  const mults = (f: F, u: Unit, t: Unit, m: string[]) => withGame(f.g, () => { f.cb.mods = m; try { return previewAttack(f.cb, u, t, 'shot', { ambush: true }).dmg!.mults; } finally { delete f.cb.mods; } });
  // rules 1.99 item 8361: the Break is the door's cash-out: 1 + Bite x S(n) of the Shadow held, at the door's own step,
  // in the hit's cash-out term (the Margins add to it); a fresh ambush is the attack's own multiplier on top (ruling 64)
  it('the cash-out term is cashFactor of the Shadow held; the ambush stays its own multiplier', () => {
    for (const n of [1, 2, 3]) {
      const { f, u, t } = ready(n);
      const off = mults(f, u, t, []), on = mults(f, u, t, mods);
      expect(off.find((m: any) => m.label === 'ambush')?.v).toBe(1 + SH.ambush_bonus);
      expect(on.find((m: any) => m.label === 'ambush')?.v).toBe(1 + SH.ambush_bonus);
      const term = on.find((m: any) => /cash-out/.test(m.label));
      expect(term?.v).toBeCloseTo(cashFactor({ ingenuity: 7 }, 'shadow', n), 6);
    }
    expect(SH.per_point).toBeUndefined(); expect(SH.marked_bonus).toBeUndefined();
  });
  it('against an enemy you Marked: the squad mark (no Break term of its own)', () => {
    const { f, u, t } = ready(3);
    const a = mults(f, u, t, mods).find((m: any) => /cash-out/.test(m.label))?.v;
    withGame(f.g, () => applyCond(f.cb, f.g.rng, u, t, 'marked', undefined, undefined, { skipSave: true }));
    expect(mults(f, u, t, mods).find((m: any) => /cash-out/.test(m.label))?.v).toBeCloseTo(a!, 6);
  });
  it('spent when the action ends, and you are revealed even with a silent weapon', () => {
    const { f, u, t } = ready(2, { weapon: 'hellraiser_service_rifle' });
    f.act({ type: 'combat/attack', unitId: u.id, targetId: t.id, mode: 'shot', mods } as any);
    expect(shadow(f, u)).toBe(0);
    expect(f.unit(u.id).hidden).toBeFalsy();
  });
  it('needs Hidden and at least 1 Shadow: the toggle is greyed otherwise', () => {
    expect(BREAK.if).toEqual({ self_has: ['hidden'], self_has_res: ['shadow'] });
  });
  it('the Ambush without the toggle is the flat 1 + ambush_bonus (no Ingenuity slope)', () => {
    const lo = ready(0, { skills: { ingenuity: 1 } }), hi = ready(0, { skills: { ingenuity: 10 } });
    const a = (x: any) => mults(x.f, x.u, x.t, []).find((m: any) => m.label === 'ambush')?.v;
    expect(a(lo)).toBe(1 + SH.ambush_bonus); expect(a(hi)).toBe(1 + SH.ambush_bonus);
    expect((SKILL.ingenuity as any).per_point.ambush_per_point).toBeUndefined();
  });
});

describe('the verbs (data/shadow.json)', () => {
  // rules 1.74 item 6011: Pick, Disable, Rig and Hijack are the Operative's (a class entry in requires): classes-rev3-moves tests them
  const byPoints = () => allVerbs().filter((x: any) => x.id.startsWith('shadow.') && x.requires.every((r: any) => r.skill === 'ingenuity'));
  it('each opens at its Ingenuity: held by a sheet that meets its requires', () => {
    expect(byPoints().length).toBeGreaterThan(5);
    for (const v of byPoints()) {
      const n = v.requires[0].min;
      const has = (pts: number) => { const f = fightWith([door(pts)], [{}]); return withGame(f.g, () => perkActionsFor({ u: f.unit(f.pc.id), cb: f.cb, g: f.g }, 'combat').some((e) => e.id === 'verb:' + v.id)); };
      expect(has(n)).toBe(true); expect(has(n - 1)).toBe(false);
    }
  });
  it('a verb\'s Shadow cost is at most the Reach at its Ingenuity', () => {
    for (const v of byPoints()) {
      const g: any = v.effects.find((e: any) => e.op === 'grant_action'), cap = reachOf({ ingenuity: Math.max(1, v.requires[0].min) });
      expect(g.res?.shadow ?? 0).toBeLessThanOrEqual(cap);
    }
  });
  it('Open Seam: an unseen enemy is Exposed (its Defense lower)', () => {
    const v = VERB('shadow.open_seam'), g = v.effects[0];
    const f = fightWith([door(v.requires[0].min)], [{}]); const t = foeAt(f, '6,4');
    const u = f.turn(f.pc); at(f, u, '1,4'); hideNow(f, u); setShadow(f, u, 1);
    f.act({ type: 'combat/perk', unitId: u.id, id: 'verb:' + v.id, targetId: t.id } as any);
    expect(condOn(f.unit(t.id), 'exposed')).toBe(true);
    expect(shadow(f, u)).toBe(1 - g.res.shadow);
  });
});

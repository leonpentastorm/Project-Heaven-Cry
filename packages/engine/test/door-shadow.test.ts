// Rules 1.99 (the Shadow door, one lane of the total rebalance; docs/design/handoffs/0.34-REBALANCE-DOOR-shadow.md).
// Every expectation reads the data (skills.json's door ladder, the Break toggle, the beta and gamma rows, rules.json
// shadow) and goes through the reducer (a real combat/attack, combat/hide or call) or the fight's load path.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import './helpers/yard16';
import { fightWith, withGame, type CharSpec } from './helpers/perkfight';
import { addItems, clearAddedItems, applyCond, RULES, SKILL } from '../src';
import { resOf } from '../src/tactics';
import { doorLadderOf, reachAt, cashFactor, keepsOf } from '../src/door';
import { feedStep } from '../src/effects/feed';

const SH: any = (RULES as any).shadow;
const LAD = doorLadderOf('ingenuity')!;
const BREAK: any = (SKILL.ingenuity as any).unlocks['1'].toggles.find((t: any) => t.id === 'shadow.break');
const MODS = ['skill:ingenuity.1#' + BREAK.id];
type F = ReturnType<typeof fightWith>;
const sheet = (skills: Record<string, number>, extra: CharSpec = {}): CharSpec => ({ weapon: 'hellraiser_service_rifle', level: 12, ...extra, skills, attrs: { perception: 8, ...(extra.attrs || {}) } });
const hide = (f: F, id: string) => withGame(f.g, () => applyCond(f.cb, f.g.rng, null, f.unit(id), 'hidden', undefined, undefined, { skipSave: true }));
function ready(skills: Record<string, number>, n: number) {
  const f = fightWith([sheet(skills)], [{ tier: 'soldier', at: 'O10' }]);
  const u = f.turn(f.pc); f.unit(u.id).pos = '1,4'; const t = f.unit(f.foe.id); t.pos = '6,4';
  t.hp = t.maxHp = 999999; t.armour = 0; t.def = -40; t.marginsTaken = -99; /* an unmissable fixture counts no Margins (rules 1.96) */
  hide(f, u.id); (f.unit(u.id).res ||= {}).shadow = n; f.unit(u.id).ap = 9;
  return { f, u: f.unit(u.id), t };
}
const shot = (x: ReturnType<typeof ready>, mods: string[]) => { const hp = x.t.hp; x.f.act({ type: 'combat/attack', unitId: x.u.id, targetId: x.t.id, mode: 'shot', mods } as any); return hp - x.f.unit(x.t.id).hp; };

describe('item 8360: the meter tops at Ingenuity\'s Reach (the family gates of ruling 13)', () => {
  it('the top on the fight\'s load path is reachAt of the sheet, the Operative\'s +1 retired', () => {
    for (const r of LAD.rows) for (const skills of [{ ingenuity: r.points }, { ingenuity: r.points, ...(r.needs || {}) }]) {
      const f = fightWith([sheet(skills)], [{}]);
      expect(f.unit(f.pc.id).resMax?.shadow).toBe(reachAt(skills, LAD));
      const op = fightWith([sheet(skills, { classId: 'infiltrator' } as any)], [{}]);
      expect(op.unit(op.pc.id).resMax?.shadow).toBe(reachAt(skills, LAD));
    }
  });
});

describe('item 8361: the Break is the door\'s cash-out, 1 + Bite x S(n) of the Shadow held, the ambush on top', () => {
  it('a real Break deals the plain ambush shot x cashFactor(n), and spends the meter', () => {
    const skills = { ingenuity: 10, analysis: 7, vigilant: 4 };
    for (const n of [1, 3, reachAt(skills, LAD)]) {
      const plain = shot(ready(skills, n), []), x = ready(skills, n), cash = shot(x, MODS);
      expect(plain).toBeGreaterThan(0);
      expect(Math.abs(cash - plain * cashFactor(skills, 'shadow', n))).toBeLessThanOrEqual(2);
      expect(cash).toBeGreaterThanOrEqual(plain); // ruling 63: never worth less than the plain shot
      expect(resOf(x.f.unit(x.u.id), 'shadow')).toBe(0);
      expect(x.f.unit(x.u.id).hidden).toBeFalsy();
    }
  });
  it('Analysis 10 keeps 1 Shadow and the Break pays for what it spends', () => {
    const skills = { ingenuity: 7, analysis: 10 }, n = reachAt(skills, LAD), keep = keepsOf(skills, 'shadow');
    expect(keep).toBe((SKILL as any).analysis.per_point.numbers.keeps);
    const plain = shot(ready(skills, n), []), x = ready(skills, n), cash = shot(x, MODS);
    expect(Math.abs(cash - plain * cashFactor(skills, 'shadow', n - keep))).toBeLessThanOrEqual(2);
    expect(resOf(x.f.unit(x.u.id), 'shadow')).toBe(keep);
  });
});

describe('item 8362: First Shade is one of the turn\'s gains (ruling 62: at most door_gains_per_turn from every source)', () => {
  beforeAll(() => addItems('relic', [{ id: 'test_shadow_gains', name: 'Gains (test)', text: 'test', effects: [
    { op: 'resource', resource: 'shadow', value: 1, when: 'turn_start', limit: { per: 'per_turn', n: { base: 0, per: [{ of: 'rule:shadow.door_gains_per_turn', value: 1 }] }, shared: 'shadow_gain' } },
    { op: 'resource', resource: 'shadow', value: 1, when: 'turn_start', limit: { per: 'per_turn', n: { base: 0, per: [{ of: 'rule:shadow.door_gains_per_turn', value: 1 }] }, shared: 'shadow_gain' } },
  ] }]));
  afterAll(() => clearAddedItems());
  const firstShade = (relics: string[]) => {
    const f = fightWith([{ ...sheet({ ingenuity: 10, analysis: 7, vigilant: 4 }), relics } as any], [{ at: 'O10' }]);
    const t = f.unit(f.foe.id); t.pos = '15,10'; t.vision = 1; // the foe sees nothing past the next tile
    const u = f.turn(f.pc); f.unit(u.id).pos = '1,1'; (f.unit(u.id).res ||= {}).shadow = 0; f.unit(u.id).ap = 9;
    f.act({ type: 'combat/hide', unitId: u.id } as any);
    return resOf(f.unit(u.id), 'shadow');
  };
  it('with the turn\'s gains spent, the first Hide gives none; with them free, First Shade gives its 1', () => {
    expect(SH.door_gains_per_turn).toBe(2);
    expect(firstShade([])).toBe((SKILL.ingenuity as any).unlocks['1'].effects[9].value);
    expect(firstShade(['test_shadow_gains'])).toBe(0);
  });
});

describe('item 8364: Analysis feeds the search TN from its first point (ruling 20)', () => {
  it('feed_flat whole steps a point, plus the product term', () => {
    const n: any = (SKILL as any).analysis.per_point.numbers;
    for (const [ing, b] of [[1, 1], [10, 10], [5, 3]]) {
      const f = fightWith([sheet({ ingenuity: ing, analysis: b })], [{}]);
      expect(withGame(f.g, () => feedStep(f.unit(f.pc.id), 'spot_tn'))).toBe(Math.round(n.feed_flat * b) + Math.round(n.feed_at_double * n.feed * ing * b));
    }
  });
});

// @ts-nocheck (test fixtures: plain objects)
// 0.32's consolidation review (the final fix pass): each finding's proof, through the reducer or a real blow where the
// game has one. Every number is read from data.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import '../src';
import { addItems, clearAddedItems } from '../src/effects/hooks';
import { price, pay, refund, spend, resLeft } from '../src/effects/cost';
import { fightWith, withGame } from './helpers/perkfight';
import ACTIONSJ from '../../../data/actions.json';

// ---------------------------------------------------------------------------------------------- A1
const A1_RELICS = [
  { id: 'test_mana_rich', name: 'Rich air (test)', text: 'At your turn start: a line if the air holds 25 mana or more.',
    effects: [{ op: 'use', when: 'turn_start', if: { self_res: { mana: { at_least: 25 } } }, say: 'TEST MANA RICH: {self}' }] },
];
beforeAll(() => addItems('relic', A1_RELICS));
afterAll(() => clearAddedItems());

describe('A1: the fight-held resource (mana) reads, refunds and spends on the fight', () => {
  const caster = () => { const f = fightWith([{ name: 'Caster', archetype: 'stormcaller', kit: 'soul', relics: ['test_mana_rich'] }], [{ tier: 'minion' }]); for (const e of f.foes) e.hp = e.maxHp = 99999; return f; };
  it('self_res: {mana} reads the air the unit fights in (a real turn start)', () => {
    const f = caster();
    f.cb.mana = 10; f.turn(f.pc);
    expect(f.cb.log.filter((l: string) => l.startsWith('TEST MANA RICH'))).toEqual([]);
    f.cb.mana = 30; f.turn(f.pc);
    expect(f.cb.log.filter((l: string) => l.startsWith('TEST MANA RICH'))).toEqual(['TEST MANA RICH: Caster']);
  });
  it('a refunded Crystallise gives its mana back to the air; spend draws on the air', () => {
    const f = caster(); f.turn(f.pc); const u = f.unit(f.pc.id); u.ap = 9; f.cb.mana = 20;
    const n = (ACTIONSJ as any).costs.crystallise.mana;
    withGame(f.g, () => {
      const p = price({ cb: f.cb, u }, 'crystallise', { ap: (ACTIONSJ as any).costs.crystallise.ap, res: { mana: n } });
      pay(f.cb, u, p); expect(f.cb.mana).toBe(20 - n);
      refund(f.cb, u, p); expect(f.cb.mana).toBe(20);
      expect(resLeft(u, 'mana', null, f.cb)).toBe(20);
      expect(spend(u, 'mana', 3, null, f.cb)).toBe(true); expect(f.cb.mana).toBe(17);
      expect(spend(u, 'mana', 99, null, f.cb)).toBe(false); expect(f.cb.mana).toBe(17);
    });
  });
});

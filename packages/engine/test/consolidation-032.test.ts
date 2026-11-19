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

// ---------------------------------------------------------------------------------------------- A2
import { resolveAttack, apply, migrateLoaded, PERK } from '../src';
import { condOn } from '../src/magic';
const A2_RELICS = [{ id: 'test_fell', name: 'Fell (test)', text: 'A line when you go down.', effects: [{ op: 'use', when: 'downed', say: 'TEST FELL: {self}' }] }];
beforeAll(() => addItems('relic', A2_RELICS));

describe('A2: borrowed time ends through the one damage door (on_downed, on_kill, the credit)', () => {
  const dropped = (perks: any) => {
    for (let i = 0; i < 30; i++) {
      const f = fightWith([{ skills: { pain_threshold: 5, guts: 5 }, perks, relics: ['test_fell'] }], [{ at: 'C6' }], { seed: 'SS' + i });
      f.foe.pos = '3,5'; f.foe.ap = 6; f.pc.pos = '2,5'; f.pc.hp = 1;
      withGame(f.g, () => resolveAttack(f.cb, f.g.rng, f.unit(f.foe.id), f.unit(f.pc.id), 'shot', null));
      if (f.unit(f.pc.id).lastTurn) return f;
    }
    throw new Error('no hit landed');
  };
  const fell = (f: any) => f.cb.log.filter((l: string) => l.startsWith('TEST FELL'));
  it('Still Standing II: at its turn\'s end the unit falls Downed, the downed trigger speaks, the blow\'s dealer has the credit', () => {
    const f = dropped({ still_standing: 'II' }); const u = f.unit(f.pc.id), kills = f.foe.kills;
    expect(u.lastTurn.by).toBe(f.foe.id); expect(fell(f)).toEqual([]);
    f.turn(u); f.act({ type: 'combat/end-turn', unitId: u.id } as any);
    expect(f.unit(u.id).downed).toBe(true); expect(f.unit(u.id).hp).toBe(0); expect(f.unit(u.id).lastTurn).toBeUndefined();
    expect(fell(f)).toHaveLength(1); expect(f.unit(f.foe.id).kills).toBe(kills + 1);
  });
  it('Bite the Bullet: the death saves run out on its feet (the rule\'s number, from data): it dies through the door, the hitter has the kill', async () => {
    const R: any = (await import('../../../data/rules.json')).default, n = R.combat.downed.death_save.failures_to_die;
    const f = dropped({ bite_the_bullet: 'I' }); const u = f.unit(f.pc.id), kills = f.foe.kills;
    u.saves.fail = n - 1; f.foe.ap = 6;
    for (let i = 0; i < 12 && !f.unit(u.id).dead; i++) { f.foe.ap = 6; withGame(f.g, () => resolveAttack(f.cb, f.g.rng, f.unit(f.foe.id), f.unit(u.id), 'shot', null)); }
    expect(f.unit(u.id).dead).toBe(true); expect(f.cb.log.some((l: string) => l === u.name + ' dies on their feet.')).toBe(true);
    expect(f.cb.log.some((l: string) => l.includes('death-save failure ' + n + '/' + n))).toBe(true);
    expect(fell(f).length).toBeGreaterThan(0); expect(f.unit(f.foe.id).kills).toBeGreaterThan(kills);
  });
  it('a fight saved under the old Bite the Bullet (the marker alone, no state) falls at the unit\'s turn end once loaded', () => {
    const f = dropped({ bite_the_bullet: 'I' }); f.turn(f.pc);
    const old = JSON.parse(JSON.stringify(f.g)), ou = old.combat.units.find((x: any) => x.id === f.pc.id);
    delete ou.lastTurn; (ou.ps ||= {})['perk:bite_the_bullet'] = { lt: { began: true } }; // as the old handler kept it
    expect(condOn(ou, 'last_turn')).toBe(true);
    const over = f.pc.name + "'s Last Turn is over: Downed.";
    const end = (g: any) => apply(g, { type: 'combat/end-turn', unitId: f.pc.id } as any, 'host').combat!.log;
    expect(end(JSON.parse(JSON.stringify(old)))).not.toContain(over); // unmigrated: borrowed time never ends
    const loaded = migrateLoaded(JSON.parse(JSON.stringify(old)));
    expect(loaded.combat!.units.find((x: any) => x.id === f.pc.id)!.lastTurn).toMatchObject({ began: true, hits: (PERK as any).bite_the_bullet.effects.find((e: any) => e.op === 'last_turn').hits });
    const log = end(loaded); expect(log).toContain(over);
  });
});

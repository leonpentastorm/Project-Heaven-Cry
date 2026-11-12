// Step a6 of the damage-formula migration: the generic `deal` and `mend` ops (data/effect_ops.json; effects/core.ts).
// An effect that names an AMOUNT (a block written in the effect, or the name of a block in its item's `amounts`) deals
// damage, heals or shields on the one formula (effects/output.ts), with no code of its own.
import { describe, it, expect } from 'vitest';
import { healingMult, physicalMult, mendFactor, type Unit } from '../src';
import { genericOf } from '../src/effects/hooks';
import { fightWith, withGame } from './helpers/perkfight';

const bag = (u: Unit, hp = 5000) => { u.armour = 0; u.maxHp = hp; u.hp = hp; u.shield = 0; return u; };
describe('the generic deal and mend ops', () => {
  it('deal: the block\'s base × the Stat term of its profile from the holder\'s sheet, through the hook, armour by its type, the sink', () => {
    const f = fightWith([{ skills: { raw_power: 5 }, attrs: { strength: 5 } }, {}], [{}]);
    const [me] = f.pcs, foe = f.foes[0], c = f.g.characters[me.charId!], op = genericOf('deal')!, h: any = { key: 'perk:test', cb: f.cb, u: me, c, g: f.g, info: { name: 'Test' } };
    expect(physicalMult(c)).toBe(1.65);
    withGame(f.g, () => {
      bag(foe); op.run!(h, { op: 'deal', amount: { kind: 'damage', base: 30, profile: 'flat', type: 'true' }, target: 'enemy' }, { targetId: foe.id }, f.g.rng); expect(foe.hp).toBe(5000 - 30);
      bag(foe); op.run!(h, { op: 'deal', amount: { kind: 'damage', base: 30, profile: 'physical', type: 'physical' }, target: 'enemy' }, { targetId: foe.id }, f.g.rng); expect(foe.hp).toBe(5000 - Math.floor(30 * 1.65));
      // armour by the block's type: physical damage meets it in full, Elemental half, true none; a shield takes it first (not true damage)
      bag(foe); foe.armour = 8; op.run!(h, { op: 'deal', amount: { kind: 'damage', base: 30, type: 'physical' }, target: 'enemy' }, { targetId: foe.id }, f.g.rng); expect(foe.hp).toBe(5000 - 22);
      bag(foe); foe.armour = 8; op.run!(h, { op: 'deal', amount: { kind: 'damage', base: 30, type: 'elemental' }, target: 'enemy' }, { targetId: foe.id }, f.g.rng); expect(foe.hp).toBe(5000 - 26);
      bag(foe); foe.armour = 8; foe.shield = 10; op.run!(h, { op: 'deal', amount: { kind: 'damage', base: 30, type: 'soul' }, target: 'enemy' }, { targetId: foe.id }, f.g.rng); expect([foe.hp, foe.shield]).toEqual([5000 - 20, 0]);
      // a block by name, from the item's own data (perk:shrug_it_off has none called 'nothing': the op does nothing rather than guess)
      bag(foe); expect(op.run!({ ...h, key: 'perk:shrug_it_off' }, { op: 'deal', amount: 'nothing', target: 'enemy' }, { targetId: foe.id }, f.g.rng)).toBe(null); expect(foe.hp).toBe(5000);
      bag(foe); op.run!({ ...h, key: 'trait:crawler_blooded' }, { op: 'deal', amount: 'blessing_burn', target: 'enemy' }, { targetId: foe.id }, f.g.rng); expect(foe.hp).toBe(5000 - 10);
    });
  });
  it('mend: a heal through the heal sink, a shield through the shield sink, by the block\'s kind', () => {
    const f = fightWith([{ skills: { empathy: 5 }, attrs: { insight: 5 }, level: 6 }, {}], [{}]);
    const [me, ally] = f.pcs, c = f.g.characters[me.charId!], hg = healingMult(c), op = genericOf('mend')!, h: any = { key: 'perk:test', cb: f.cb, u: me, c, g: f.g, info: { name: 'Test' } };
    bag(ally, 1000); ally.healRecv = 1; ally.shieldRecv = 1;
    withGame(f.g, () => {
      ally.hp = 100; op.run!(h, { op: 'mend', amount: { kind: 'heal', base: 10, profile: 'flat' }, target: 'ally' }, { targetId: ally.id }, f.g.rng); expect(ally.hp).toBe(110);
      ally.hp = 100; op.run!(h, { op: 'mend', amount: { kind: 'heal', base: 10, profile: 'healing' }, target: 'ally' }, { targetId: ally.id }, f.g.rng); expect(ally.hp).toBe(100 + Math.floor(10 * hg));
      // the `mend` profile reads the Level term too (the level factor of rules 1.20, at the giver's level)
      ally.hp = 100; op.run!(h, { op: 'mend', amount: { kind: 'heal', base: 10, profile: 'mend' }, target: 'ally' }, { targetId: ally.id }, f.g.rng); expect(ally.hp).toBe(100 + Math.floor(10 * hg * mendFactor(me.level)));
      ally.shield = 0; op.run!(h, { op: 'mend', amount: { kind: 'shield', base: 12, profile: 'flat' }, target: 'ally' }, { targetId: ally.id }, f.g.rng); expect(ally.shield).toBe(12);
      ally.shield = 0; op.run!({ ...h, key: 'class:guardian.will_shield' }, { op: 'mend', amount: 'shield', target: 'ally' }, { targetId: ally.id }, f.g.rng); expect(ally.shield).toBe(Math.floor(12 * hg * mendFactor(me.level)));
    });
  });
});

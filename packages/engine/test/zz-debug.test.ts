// @ts-nocheck
import { it } from 'vitest';
import { resolveAttack } from '../src';
import { fightWith, withGame } from './helpers/perkfight';
it('dbg', () => {
  const f = fightWith([{ archetype: 'stormcaller', kit: 'soul', skills: { lore_master: 5 }, perks: { rite_in_the_field: 'I' } }], [1,2,3,4,5,6].map((i) => ({ at: 'E' + (5 + i) })));
  f.turn(f.pc);
  for (let i = 0; i < 5; i++) { const foe = f.foes.find((x) => !x.dead); foe.hp = 1; foe.def = -50; f.pc.pos = '2,5'; foe.pos = '3,5';
    withGame(f.g, () => resolveAttack(f.cb, f.g.rng, f.pc, foe, 'shot', null, { noAp: true }));
    console.log('after', i, foe.dead, JSON.stringify(f.pc.ps)); }
  f.cb.mana = 30; const ap = f.pc.ap; f.act({ type: 'combat/crystallise', unitId: f.pc.id }); console.log('ap', ap - f.pc.ap, f.cb.log.slice(-2));
});

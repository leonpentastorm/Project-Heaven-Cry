// The bug sweep of 12 Nov 2026, the client's part (spec section 14, item 1387): a card says the number the data holds.
import { describe, expect, it } from 'vitest';
import { ARCHETYPES, type Sheet, newCharacter, startCombat, stageMult } from '@engine';
import { actionGroups } from './commands';

function fight() {
  const a = ARCHETYPES[0];
  const sheet: Sheet = { name: 'Vale', portrait: '', origin: 'Thousand-Planet frontier', kit: 'medic', traits: [], skills: { ...a.preset, will_power: 6, visualization: 2, empathy: 4 }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} };
  const c: any = newCharacter('c1', 'p1', sheet);
  c.outbursts = [{ id: 'sb', name: 'Soul Bolt', school: 'damage', modules: [] }, { id: 'fb', name: 'Heartfire', school: 'damage', modules: ['burst'], tone: 'fire' }]; c.soulKnown = { schools: ['damage'], modules: ['burst'], tones: ['fire'] };
  const cb: any = startCombat('t', 'yard', [{ c, pos: '1,5' }], [{ name: 'Raider', tier: 'soldier', weapon: 'fists', at: 'E6' }], 'easy', { state: 4 }, []);
  cb.turn = cb.order.indexOf(cb.units.find((x: any) => x.side === 'pc').id);
  const u = cb.units.find((x: any) => x.side === 'pc'); u.ap = 6; u.mg.mp = 400; u.mg.mpMax = 400;
  return { c, cb, u };
}

describe('the Outburst button says the stage 0 multiplier the engine uses', () => {
  it('a Snap fires at stage 0: ×0.8 since rules 1.8 (the text said ×0.6)', () => {
    const { c, cb, u } = fight();
    void c; const ob: any = actionGroups(cb, u, null).find((g: any) => g[3] === 'outbursts')![1].find((x: any) => x[0] === 'outburst');
    expect(ob, 'the Outburst button is there').toBeTruthy();
    expect(stageMult(0)).toBe(0.8);
    expect(ob[3]).toContain('Snap it: Begin and Release in one go for 3 AP, at ×' + stageMult(0) + '.');
    expect(ob[3]).not.toContain('×0.6');
  });
});

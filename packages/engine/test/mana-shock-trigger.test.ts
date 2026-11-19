// Rules 1.69: the item ops trigger `mana_shock` (effects/triggers.ts), on the one hook emitted where a heart enters the
// Mana Shock (magic.ts manaShort, after the Short, Strain still over the limit). Proved through the reducer: a real Pump
// with Rage (+1 Strain when poured) that takes a held heart to 3 over its limit. The listener is a fixture relic (a data
// row with a `say` and a per_combat limit), held by the caster or by its friend.
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { SOUL_RULES, FEELING, type Unit } from '../src';
import { addItems, clearAddedItems } from '../src/effects/hooks';
import { TRIGGERS } from '../src/effects/triggers';
import { fightWith } from './helpers/perkfight';

const OVER: number = (SOUL_RULES as any).strain.short_at_over;
const RAGE: number = (FEELING as any).rage.pour.strain;
const RELIC = {
  id: 'test_on_mana_shock', name: 'On Mana Shock (test)', text: 'Once a fight, on Mana Shock: a line.',
  effects: [{ op: 'use', when: 'mana_shock', limit: { per: 'per_combat', n: 1 }, say: 'TEST SHOCK: {self}' }],
};
beforeAll(() => addItems('relic', [RELIC]));
afterAll(() => clearAddedItems());

/** A Soul caster on its turn (every feeling known, plenty of MP and AP) holding a design, with Strain `under` below the
 * point where the next Strain shorts; its friend holds the relic when `friendHolds`. */
function rig(o: { friendHolds?: boolean; under?: number } = {}) {
  const f = fightWith([{ name: 'Heart', archetype: 'stormcaller', kit: 'soul', relics: o.friendHolds ? [] : [RELIC.id] }, { name: 'Friend', kit: 'soldier', relics: o.friendHolds ? [RELIC.id] : [] }], [{ tier: 'minion' }]);
  for (const e of f.foes) e.hp = e.maxHp = 99999; // the wild Release must not end the fight (its end clears the Shock)
  const u = f.turn(f.pc); u.ap = 60; u.hp = u.maxHp = 2000;
  Object.assign(u.mg!, { emanator: true, mp: 9999, mpMax: 9999, firstUsed: true, freePumps: 0, freePumpsMax: 0, feelings: Object.keys(FEELING) });
  u.mg!.designs.push({ id: 'dz', name: 'Test bolt', school: 'damage', modules: [] } as any);
  f.act({ type: 'combat/outburst', unitId: u.id, design: 'dz', hold: true } as any);
  const me = (): Unit => f.unit(f.pc.id);
  me().mg!.strain = me().mg!.strainLimit + OVER - RAGE - (o.under ?? 0);
  const lines = () => f.cb.log.filter((l) => l.startsWith('TEST SHOCK:'));
  return { f, me, lines, pump: (feeling?: string) => f.act({ type: 'combat/pump', unitId: f.pc.id, ...(feeling ? { feeling } : {}) } as any) };
}

describe('the mana_shock trigger (rules 1.69)', () => {
  it('is in the closed list, on its own hook, the holder its unit', () => {
    expect(TRIGGERS.mana_shock).toMatchObject({ hook: 'mana_shock', self: 'actor' });
  });
  it('a Pump with Rage that takes the heart to the Short fires it once, after the Shock is on', () => {
    const r = rig();
    r.pump('rage');
    expect(r.me().mg!.shock).toBe(true);
    expect(r.lines()).toEqual(['TEST SHOCK: Heart']);
    const log = r.f.cb.log, at = log.findIndex((l) => l.startsWith('TEST SHOCK:'));
    expect(log.slice(0, at).some((l) => /is in Mana Shock|is in .*Strain/.test(l))).toBe(true); // the Shock's line comes first
  });
  it('Strain that stays short of the Short does not fire it', () => {
    const r = rig({ under: 1 });
    r.pump('rage');
    expect(r.me().mg!.shock).toBeFalsy();
    expect(r.lines()).toEqual([]);
  });
  it('a friend\'s relic does not hear the caster\'s Shock (whose event: the unit that enters it)', () => {
    const r = rig({ friendHolds: true });
    r.pump('rage');
    expect(r.me().mg!.shock).toBe(true);
    expect(r.lines()).toEqual([]);
  });
});

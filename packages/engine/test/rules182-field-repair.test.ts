// Rules 1.82 item 7008: Field Repair is Improvisation's fourth perk, the first user of an action gated by a held item
// (effects/actions.ts grantedBy). Through the reducer (combat/repair, the weapon actions' row) and the load door
// (migrateLoaded: an old save at Improvisation 3 is offered the re-pick, Field Repair preselected).
import { describe, expect, it } from 'vitest';
import { actionsFor, migrateLoaded, PERK } from '../src';
import { fightWith } from './helpers/perkfight';

const FR: any = (PERK as any).field_repair, OV: any = (PERK as any).overhaul;
const rig = (o: { pts?: number; perks?: any } = {}) => {
  const f = fightWith([{ skills: { proficiency: o.pts ?? 3 }, perks: o.perks || {} }, { traits: ['factory_made'] }], [{ at: 'O10' }]);
  const [mech, bot] = f.pcs; mech.pos = '3,3'; bot.pos = '3,4'; f.unit(bot.id).hp = 20; f.unit(mech.id).parts = 2; f.turn(mech); f.unit(mech.id).ap = 6;
  return { f, mech, bot };
};
const row = (f: any, id: string) => (actionsFor(f.g, id, 'host') as any[]).find((d) => d.id === 'repair');

describe('rules 1.82 item 7008: Field Repair, a perk', () => {
  it('Improvisation 3 alone no longer repairs: the row and the reducer say the perk is needed', () => {
    const { f, mech, bot } = rig();
    expect(() => f.act({ type: 'combat/repair', unitId: mech.id, targetId: bot.id } as any)).toThrow(/Field Repair perk/);
    expect(f.unit(bot.id).hp).toBe(20);
  });
  it('tier I: the perk repairs at its AP for one spare part', () => {
    const { f, mech, bot } = rig({ perks: { field_repair: 'I' } });
    f.act({ type: 'combat/repair', unitId: mech.id, targetId: bot.id } as any);
    expect(f.unit(bot.id).hp).toBe(20 + FR.amounts.repair.base); expect(f.unit(mech.id).parts).toBe(1);
    expect(f.unit(mech.id).ap).toBe(6 - FR.tiers.I.effects[0].ap);
  });
  it('tier II: no spare part', () => {
    const { f, mech, bot } = rig({ pts: 5, perks: { field_repair: 'II' } });
    f.act({ type: 'combat/repair', unitId: mech.id, targetId: bot.id } as any);
    expect(f.unit(mech.id).parts).toBe(2); expect(f.unit(bot.id).hp).toBeGreaterThan(20);
  });
  it('Overhaul grants it without the perk: at its own AP, twice the durability', () => {
    const { f, mech, bot } = rig({ pts: 10, perks: { overhaul: 'mastered' } });
    f.act({ type: 'combat/repair', unitId: mech.id, targetId: bot.id } as any);
    expect(f.unit(bot.id).hp).toBeGreaterThan(20); expect(f.unit(mech.id).ap).toBe(6 - OV.effects.find((e: any) => e.op === 'action_cost').set);
  });
  it('an old save at Improvisation 3 is offered the re-pick with Field Repair preselected', () => {
    const f = fightWith([{ skills: { proficiency: 3 } }], [{}]);
    const g: any = JSON.parse(JSON.stringify(f.g)); g.combat = null;
    for (const c of Object.values(g.characters) as any[]) { c.perkRev = { proficiency: 1 }; delete c.perkRepick; c.perks = []; }
    const c: any = Object.values(migrateLoaded(g).characters)[0];
    expect(c.perkRepick.proficiency).toEqual([{ id: 'field_repair', tier: 'I' }]); expect(c.perks.some((p: any) => p.id === 'field_repair')).toBe(true);
  });
});

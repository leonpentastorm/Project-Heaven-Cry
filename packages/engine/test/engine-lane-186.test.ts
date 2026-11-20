// Rules 1.86 (0.33, the engine lane): items 7403 onward, every one through the reducer or a real action.
import { describe, expect, it } from 'vitest';
import { PERK, WHISPER, migrateLoaded } from '../src';
import { fxNum } from '../src/faith';
import { fightWith } from './helpers/perkfight';

const FR: any = (PERK as any).field_repair;
describe('rules 1.86 item 7403: a repair goes through the one mend path, and is not a heal', () => {
  const rig = () => {
    const f = fightWith([{ skills: { proficiency: 3 }, perks: { field_repair: 'I' } }, { traits: ['factory_made'] }], [{ at: 'O10' }]);
    const [mech, bot] = f.pcs; mech.pos = '3,3'; bot.pos = '3,4'; f.unit(bot.id).hp = 20; f.unit(mech.id).parts = 2; f.turn(mech); f.unit(mech.id).ap = 6;
    return { f, mech, bot };
  };
  it('the receiver\'s healing-received bonus does not touch a repair (combat/repair)', () => {
    const { f, mech, bot } = rig();
    (f.unit(bot.id) as any).healRecv = 2;
    f.act({ type: 'combat/repair', unitId: mech.id, targetId: bot.id } as any);
    expect(f.unit(bot.id).hp).toBe(20 + FR.amounts.repair.base);
  });
});

describe('rules 1.86 item 7404: a prayer\'s numbers are its own data rows (patrons.json), never typed in faith.ts', () => {
  const holy = () => {
    const f = fightWith([{ name: 'Priest', skills: { faith: 7 } }], [{ at: 'F6' }]);
    const c = f.g.characters[f.pc.charId!]; c.belief = { kind: 'faithful', patron: 'nerukhan' }; c.patron = 'nerukhan'; c.devotion = 3;
    for (const u of f.cb.units) { u.hp = u.maxHp; u.conds = {}; }
    f.turn(f.pc); return f;
  };
  it('Luck gives what its roll_bonus row says (a changed row changes the bonus): through faith/pray', () => {
    const row = (WHISPER as any).luck.effects.find((e: any) => e.op === 'roll_bonus'), was = row.value;
    try {
      row.value = was + 3;
      const f = holy(), n = f.cb.log.length;
      f.act({ type: 'faith/pray', unitId: f.pc.id, kind: 'whisper', id: 'luck' } as any);
      expect((f.unit(f.pc.id) as any).faith?.luck ?? null).toSatisfy((v: any) => v === null || v === was + 3); // answered or not: never the old typed 2
      const said = f.cb.log.slice(n).map((l: any) => (typeof l === 'string' ? l : l.text)).join('\n');
      if (/on the next roll/.test(said)) expect(said).toContain('+' + (was + 3) + ' on the next roll');
    } finally { row.value = was; }
  });
  it('fxNum refuses a row with no number (no silent default)', () => {
    expect(() => fxNum({ id: 'x', effects: [{ op: 'reroll' }] }, 'reroll', 'bonus')).toThrow(/no number bonus/);
  });
});

describe('rules 1.86 item 7405: a Boss and forced moves are one rule (forced_movement.boss_holds; a row\'s boss_tiles)', () => {
  it('no displace row in the data names a Boss by tier: the one rule decides, and only Tug names boss_tiles', () => {
    const rows: any[] = [];
    const walk = (o: any, key: string) => { if (Array.isArray(o)) o.forEach((x) => walk(x, key)); else if (o && typeof o === 'object') { if (o.op === 'displace') rows.push({ key, o }); for (const v of Object.values(o)) walk(v, key); } };
    for (const p of Object.values(PERK) as any[]) walk(p, 'perk:' + p.id);
    expect(rows.filter((r) => JSON.stringify(r.o.if || {}).includes('"boss"')).map((r) => r.key)).toEqual([]);
    expect([...new Set(rows.filter((r) => r.o.boss_tiles != null).map((r) => r.key))]).toEqual(['perk:pull_together']);
  });
});

describe('rules 1.86 item 7407: the load door clears what removed handlers left on old sheets (rules.json stale_state)', () => {
  it('planted, holyBless and Blueprint\'s sketch are gone after a load; other state stays', () => {
    const f = fightWith([{}], [{ at: 'F6' }]);
    const g: any = JSON.parse(JSON.stringify(f.g)), id = f.pc.charId!;
    g.characters[id].state = { planted: [{ npc: 'x', item: 'frag' }], holyBless: { mult: 2 }, keep: 1 };
    g.story.ps = { [id]: { items: { 'perk:blueprint': { sketch: { scene: 1 }, other: 2 } } } };
    const out: any = migrateLoaded(g);
    expect(out.characters[id].state).toEqual({ keep: 1 });
    expect(out.story.ps[id].items['perk:blueprint']).toEqual({ other: 2 });
  });
});


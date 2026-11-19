// Rules 1.73 (Body), the Endurance step (0.32): Challenge at Durability 2, Second Wind II, Tremor II, the Bulwark's Reforge,
// and an old save's Pain Threshold perks mapped (Scar Tissue to Numb, Used to the Pain to Second Wind). Through the
// reducer or the real turn; numbers read from the data. (Numb II, Close Guard and Retort: guard2-slice1.test.ts.)
import { describe, it, expect } from 'vitest';
import './helpers/yard16';
import { physFight, rig } from './helpers/physfight';
import { fightWith, storyWith, withGame } from './helpers/perkfight';
import { actionsFor, previewDescriptor, migrateLoaded, PERK, SKILL, CLASS_MOVE_POOL, type Character, type Action } from '../src';
import classesJ from '../../../data/classes.json';

const P = PERK as Record<string, any>;

describe('Durability 2: Challenge (rules 1.73 item 5822)', () => {
  it('at Durability 2 a Challenge through the reducer costs its AP and Guard; the gate is the door row’s own', () => {
    const ch = (SKILL as any).durability.unlocks['1'].effects.find((e: any) => e.action === 'guard_challenge');
    expect(ch.if.self_skill.durability).toBe(2);
    const f = physFight([{ weapon: 'hellraiser_service_rifle', skills: { durability: 2 } }], [{ at: 'D5', tier: 'soldier' }]);
    f.cb.objects = []; f.put(f.pc, 'C5'); f.put(f.foe, 'D5'); f.turn(f.pc); const u = f.unit(f.pc.id); u.res = { ...(u.res || {}), guard: 2 };
    const ap = u.ap;
    f.act({ type: 'combat/perk', unitId: u.id, id: 'skill:durability.1', actionId: 'guard_challenge', targetId: f.foe.id } as any);
    expect(f.unit(u.id).ap).toBe(ap - ch.ap); expect(f.unit(u.id).res!.guard).toBe(2 - ch.res.guard);
  });
});

describe('Pain Threshold: Second Wind II (rules 1.73 item 5829)', () => {
  it('Tier II heals and gives its Guard, through the reducer', () => {
    const add = P.second_wind.tiers.II.effects[0].effects[1].value;
    const f = fightWith([{ skills: { durability: 4, pain_threshold: 5 }, perks: { second_wind: 'II' } } as any], [{ at: 'O10' }]); const u = f.turn(f.pc);
    f.unit(u.id).hp = 20; f.unit(u.id).res = { ...(f.unit(u.id).res || {}), guard: 0 };
    const d = withGame(f.g, () => actionsFor(f.g, u.id, 'host')).find((x) => x.name === 'Second Wind')!; expect(d).toBeTruthy();
    const pv = withGame(f.g, () => previewDescriptor(f.g, u.id, d.id, {}, 'host'))!; f.act(pv.action!);
    expect(f.unit(u.id).hp).toBe(20 + Math.floor(u.maxHp / 4)); expect(f.unit(u.id).res!.guard).toBe(Math.min(add, f.unit(u.id).resMax!.guard));
  });
});

describe('Senses: Tremor II (rules 1.73 item 5833)', () => {
  it('a fight starts with its Guard on a holder of Tier II; Tier I gives none', () => {
    const add = P.tremor.tiers.II.effects[1].value;
    const two = fightWith([{ skills: { durability: 4, sensory: 5 }, perks: { tremor: 'II' } } as any], [{ at: 'O10' }]);
    const one = fightWith([{ skills: { durability: 4, sensory: 5 }, perks: { tremor: 'I' } } as any], [{ at: 'O10' }]);
    expect(two.pc.res!.guard).toBe(Math.min(add, two.pc.resMax!.guard)); expect(one.pc.res?.guard ?? 0).toBe(0);
    expect(two.cb.log.some((l) => /Tremor/.test(l))).toBe(true);
  });
});

describe('the Bulwark: Reforge (rules 1.73 item 5837)', () => {
  const RF: any = (classesJ as any).base.find((b: any) => b.id === 'defender').ranks.III.moves.find((m: any) => m.id === 'reforge').effects[0];
  it('a rank III Bulwark’s own turn start with 1 Guard or none gives its Guard; with more, nothing; rank II has none', () => {
    const run = (level: number, endurance: number, g: number) => {
      const f = physFight([{ weapon: 'sabre', classId: 'defender', level, attrs: { endurance }, skills: { durability: 4 } } as any], [{ at: 'J5', tier: 'soldier' }]);
      f.cb.objects = []; const u = f.unit(f.pc.id); u.res = { ...(u.res || {}), guard: g };
      f.turn(f.foe); f.unit(u.id).res!.guard = g; f.cb.round += 1;
      f.turn(u); // the Bulwark's turn begins (the turn start the game runs)
      return f.unit(u.id).res!.guard;
    };
    expect(run(12, 8, 0)).toBe(RF.value); expect(run(12, 8, 1)).toBe(1 + RF.value);
    expect(run(12, 8, 3)).toBe(3); expect(run(6, 5, 0)).toBe(0);
    expect((CLASS_MOVE_POOL as any)['defender.reactive_plate'].status).toBe('shelved');
  });
});

describe('an old save’s Pain Threshold and Senses (rules 1.73 items 5826, 5832)', () => {
  it('Scar Tissue II at Pain Threshold 5 becomes Numb II; Used to the Pain I at 3 becomes Second Wind I; a Senses 5 sheet gets Read the Air and Tremor', () => {
    const load = (skills: any, perks: any[]) => {
      const s = storyWith([{ skills }]), id = s.chars[0].id; const old = JSON.parse(JSON.stringify(s.g));
      delete old.characters[id].perkRev; delete old.characters[id].perkRepick; old.characters[id].perks = perks;
      const c: Character = migrateLoaded(old).characters[id]; return (sk: string) => c.perks.filter((x) => P[x.id]?.skills.includes(sk));
    };
    expect(load({ pain_threshold: 5 }, [{ id: 'scar_tissue', tier: 'II' }])('pain_threshold')).toEqual([{ id: 'numb', tier: 'II' }]);
    expect(load({ pain_threshold: 3 }, [{ id: 'used_to_the_pain', tier: 'I' }])('pain_threshold')).toEqual([{ id: 'second_wind', tier: 'I' }]);
    expect(load({ sensory: 5 }, [])('sensory')).toEqual([{ id: 'read_the_air', tier: 'I' }, { id: 'tremor', tier: 'I' }]);
    expect(load({ pain_threshold: 2 }, [{ id: 'scar_tissue', tier: 'I' }])('pain_threshold')).toEqual([]); // under the first step: the removed id is taken off
  });
});

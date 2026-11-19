// Rules 1.73 (Body), the Agility step (0.32): Slide at Dexterity 2, Speed Load (Reaction Speed) cheapening the reload, Catch
// on Athletics, the narrator halves named, and old saves' Athletics and Reaction Speed. Through the reducer; numbers read
// from the data. (Flush Out, Hold the Lane's Near Miss, Break Them's Shaken Nerves: pressure-2.test.ts; Quick Draw as
// Speed Load II: skeleton-perks.test.ts.)
import { describe, it, expect } from 'vitest';
import './helpers/yard16';
import { fightWith, storyWith } from './helpers/perkfight';
import { itemInfo, migrateLoaded, PERK, SKILL, stepsTaken, type Character } from '../src';

const P = PERK as Record<string, any>;

describe('Dexterity 2: Slide (rules 1.73 item 5842)', () => {
  it('at Dexterity 2 Slide is an action through the reducer; at 1 it is refused', () => {
    const slide = itemInfo('verb:pressure.slide')!; expect(slide.effects[0].action).toBe('slide');
    const run = (dex: number) => { const f = fightWith([{ weapon: 'hellraiser_service_rifle', skills: { dexterity: dex } }], [{ at: 'O10' }]); const u = f.turn(f.pc);
      try { f.act({ unitId: u.id, type: 'combat/perk', id: 'verb:pressure.slide' } as any); return true; } catch { return false; } };
    expect(run(2)).toBe(true); expect(run(1)).toBe(false);
  });
});

describe('Reaction Speed: Speed Load I (rules 1.73 item 5852)', () => {
  it('a reload costs its AP less with Speed Load; Dexterity 9 alone gives none', () => {
    const cut = -P.speed_load.tiers.I.effects[0].value;
    const took = (spec: any) => { const f = fightWith([{ weapon: 'hellraiser_service_rifle', ...spec }], [{ at: 'P11' }]); const u = f.turn(f.pc); u.ammo = 3; u.mags = [30, 30]; const ap = f.unit(u.id).ap;
      f.act({ unitId: u.id, type: 'combat/reload' } as any); return ap - f.unit(u.id).ap; };
    const base = took({ skills: { dexterity: 9 } });
    expect(took({ skills: { reaction_speed: 3 }, perks: { speed_load: 'I' } })).toBe(Math.max(1, base - cut));
    expect(base).toBeGreaterThan(Math.max(1, base - cut));
  });
});

describe('Athletics and Reaction Speed: the perks and their homes (rules 1.73 items 5846-5853)', () => {
  it('each skill has four perks of two tiers; Catch is Athletics’; the narrator halves say so in their effects', () => {
    const own = (sk: string) => Object.values(P).filter((p: any) => p.tier === 'acquired' && p.skills[0] === sk).map((p: any) => p.id).sort();
    expect(own('athletics')).toEqual(['catch', 'roll_with_it', 'untouchable', 'wall_run']);
    expect(own('reaction_speed')).toEqual(['cut_in', 'rounding_up', 'shoot_first', 'speed_load']);
    for (const id of ['untouchable', 'shoot_first', 'cut_in']) for (const t of ['I', 'II']) expect(P[id].tiers[t].effects.every((e: any) => e.op === 'narrator'), id).toBe(true);
  });
  it('Catch on an Athletics sheet takes an Athletics step and none of Reaction Speed’s', () => {
    const s = storyWith([{ skills: { athletics: 3, reaction_speed: 3 }, perks: { catch: 'I' } }]); const c = s.g.characters[s.chars[0].id];
    expect(stepsTaken(c, 'athletics')).toBe(1); expect(stepsTaken(c, 'reaction_speed')).toBe(0);
  });
  it('an old save at Athletics 5 and Reaction Speed 5 gets Wall Run (Vault) and Untouchable, Shoot First and Cut In, and one re-pick each', () => {
    const s = storyWith([{ skills: { athletics: 5, reaction_speed: 5 } }]), id = s.chars[0].id; const old = JSON.parse(JSON.stringify(s.g));
    delete old.characters[id].perkRev; delete old.characters[id].perkRepick; old.characters[id].perks = [];
    const c: Character = migrateLoaded(old).characters[id];
    const of = (sk: string) => c.perks.filter((x) => P[x.id]?.skills.includes(sk));
    expect(of('athletics')).toEqual([{ id: 'wall_run', tier: 'I' }, { id: 'untouchable', tier: 'I' }]);
    expect(of('reaction_speed')).toEqual([{ id: 'shoot_first', tier: 'I' }, { id: 'cut_in', tier: 'I' }]);
    expect((SKILL as any).athletics.perk_remap.passives).toEqual({ 3: 'wall_run', 5: 'untouchable' });
  });
});

// @ts-nocheck (reads the repo's old-save fixtures with node:fs, as old-save.test.ts does)
// Rules 1.70 (0.32 step 1): the ladder schedule as data (item 5537), old saves' perk re-pick (item 5538), and an unspent
// Attribute point carried from level 2 to 3 (the brief's H). Every change goes through the reducer (levelup/perk,
// levelup/perk-repick, levelup/raise, narrator/turn) or the load door (migrateLoaded) on the repo's real old saves.
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PERK, PERKS, SKILL, apply, migrateLoaded, ladderSchedule, ladderStepAt, stepsEarned, stepsTaken, pendingPerkSteps, pendingRepicks, levelUpDue, type Character } from '../src';
import { storyWith } from './helpers/perkfight';

const raw = (name: string) => JSON.parse(readFileSync(fileURLToPath(new URL('./fixtures/' + name + '.json', import.meta.url)), 'utf8'));
const SCHED: any = (SKILL as any);

describe('the ladder schedule is one table (rules 1.70 item 5537)', () => {
  it('alpha perk steps 3, 6, 7, 9 and forks 4, 8; beta and gamma perk steps 3, 5, 7, 9; Mastered 10', () => {
    expect(ladderSchedule('durability')).toMatchObject({ perk_steps: [3, 6, 7, 9], forks: [4, 8], mastered: 10 });
    expect(ladderSchedule('pain_threshold')).toMatchObject({ perk_steps: [3, 5, 7, 9], mastered: 10 });
    expect(ladderSchedule('charisma')).toMatchObject({ perk_steps: [3, 5, 7, 9], mastered: 10 });
    expect([5, 6, 8, 10].map((n) => ladderStepAt('durability', n))).toEqual(['', 'M2', 'fork', 'mastered']);
    expect([0, 3, 5, 6, 9, 10].map((n) => stepsEarned(n, 'durability'))).toEqual([0, 1, 1, 2, 4, 4]);
    expect([0, 3, 5, 6, 9].map((n) => stepsEarned(n, 'pain_threshold'))).toEqual([0, 1, 2, 2, 4]);
  });
  it('an alpha at 5 owes one step; at 6 a second; a sheet that took two at 5 (the old schedule) keeps both and owes none until 7', () => {
    const s = storyWith([{ skills: { durability: 5 } }]), id = s.chars[0].id;
    const own = (PERKS as any[]).filter((p) => p.tier === 'acquired' && p.skills.includes('durability')).map((p) => p.id);
    expect(pendingPerkSteps(s.g.characters[id]).find((x) => x.skill === 'durability')?.free).toBe(1);
    s.act({ type: 'levelup/perk', charId: id, perkId: own[0] } as any);
    expect(pendingPerkSteps(s.g.characters[id]).find((x) => x.skill === 'durability')).toBeUndefined();
    expect(() => s.act({ type: 'levelup/perk', charId: id, perkId: own[1] } as any)).toThrow(/No perk step/);
    // an old save: two steps taken at 5
    const old = JSON.parse(JSON.stringify(s.g)); old.characters[id].perks.push({ id: own[1], tier: 'I' });
    const c: Character = migrateLoaded(old).characters[id];
    expect(stepsTaken(c, 'durability')).toBe(2); // nothing lost
    c.skills.durability = 6; expect(pendingPerkSteps(c).find((x) => x.skill === 'durability')).toBeUndefined();
    c.skills.durability = 7; expect(pendingPerkSteps(c).find((x) => x.skill === 'durability')?.free).toBe(1);
  });
  describe('a skill with four perks (the code works for two or four without change; Composure has four since rules 1.75 item 6203)', () => {
    it('composure at 9: four steps among four perks, taken through the reducer, each perk at most II, no step twice', () => {
      const s = storyWith([{ skills: { composure: 9 }, attrs: { determination: 9 } }]), id = s.chars[0].id;
      const pend = () => pendingPerkSteps(s.g.characters[id]).find((x) => x.skill === 'composure');
      expect(pend()?.free).toBe(4);
      expect(pend()!.choices.map((x) => x.id).sort()).toEqual((PERKS as any[]).filter((p) => p.tier === 'acquired' && p.skills.includes('composure')).map((p) => p.id).sort());
      expect(pend()!.choices.length).toBe(4);
      for (const id2 of ['poker_face', 'stand_still', 'poker_face', 'flat_line']) s.act({ type: 'levelup/perk', charId: id, perkId: id2 } as any);
      const c = s.g.characters[id];
      expect(pend()).toBeUndefined(); expect(stepsTaken(c, 'composure')).toBe(4);
      expect(c.perks.filter((x) => x.id === 'poker_face')).toEqual([{ id: 'poker_face', tier: 'II' }]);
    });
  });
});

describe('old saves: the perk re-pick (rules 1.70 item 5538)', () => {
  const PT: any = SKILL.pain_threshold;
  // These tests write their own table on Pain Threshold; the attributes' real tables (rules 1.74 and the other 0.32
  // lanes) are set aside while they run and put back after, so each test sees one table: its own.
  const ALL: any[] = Object.values(SKILL as any); let kept: [any, any][] = [];
  beforeEach(() => { kept = ALL.filter((s) => s.perk_remap).map((s) => [s, s.perk_remap]); for (const [s] of kept) delete s.perk_remap; });
  afterEach(() => { delete PT.perk_remap; for (const [s, t] of kept) s.perk_remap = t; });
  it('with no table, a real old save loads as it was (nothing written)', () => {
    for (const name of ['save-develop-cb40e92-mid-fight', 'save-develop-cb40e92-after-fight', 'save-live-0.22.0-long-mid-fight']) {
      const once = migrateLoaded(raw(name)), again = JSON.stringify(migrateLoaded(JSON.parse(JSON.stringify(once))));
      expect(again).toBe(JSON.stringify(once));
      for (const c of Object.values(once.characters) as Character[]) { expect(c.perkRev).toBeUndefined(); expect(c.perkRepick).toBeUndefined(); }
    }
  });
  it('a table (old perk mapped, the 3-point passive a perk): the save holds the mapped perks within its steps, none lost or doubled, and is offered one re-pick', () => {
    PT.perk_remap = { rev: 1, perks: { used_to_the_pain: 'second_wind' }, passives: { 3: 'close_guard' } };
    const g = migrateLoaded(raw('save-develop-cb40e92-mid-fight'));
    for (const c of Object.values(g.characters) as Character[]) {
      const p = c.skills.pain_threshold || 0;
      expect(c.perkRev).toEqual({ pain_threshold: 1 });
      if (p < ladderSchedule('pain_threshold').perk_steps[0]) { expect(c.perkRepick?.pain_threshold).toBeUndefined(); continue; }
      const mine = c.perks.filter((x) => PERK[x.id]?.skills.includes('pain_threshold'));
      expect(stepsTaken(c, 'pain_threshold')).toBe(Math.min(stepsEarned(p, 'pain_threshold'), 2)); // the mapped perk, then the passive: as far as the steps reach
      expect(new Set(mine.map((x) => x.id)).size).toBe(mine.length); // none doubled
      expect(mine[0].id).toBe('second_wind'); // the old perk first, mapped
      expect(c.perkRepick!.pain_threshold).toEqual(mine);
      expect(pendingRepicks(c).map((x) => x.skill)).toEqual(['pain_threshold']); expect(levelUpDue(c)).toBe(true);
    }
    // a second load changes nothing
    const once = JSON.stringify(g); expect(JSON.stringify(migrateLoaded(JSON.parse(once)))).toBe(once);
  });
  it('the re-pick through the reducer: keep closes it; choose again gives the steps back (preselection marked) and they are taken again', () => {
    PT.perk_remap = { rev: 1, perks: { close_guard: 'second_wind' }, passives: { 3: 'close_guard' } };
    const s = storyWith([{ skills: { pain_threshold: 5 }, perks: { close_guard: 'I' } }]), id = s.chars[0].id;
    const old = JSON.parse(JSON.stringify(s.g)); delete old.characters[id].perkRev;
    let g = migrateLoaded(old); const owner = g.characters[id].owner;
    expect(g.characters[id].perkRepick.pain_threshold).toEqual([{ id: 'second_wind', tier: 'I' }, { id: 'close_guard', tier: 'I' }]);
    const keep = apply(g, { type: 'levelup/perk-repick', charId: id, skill: 'pain_threshold', keep: true } as any, owner);
    expect(pendingRepicks(keep.characters[id])).toEqual([]); expect(stepsTaken(keep.characters[id], 'pain_threshold')).toBe(2);
    g = apply(g, { type: 'levelup/perk-repick', charId: id, skill: 'pain_threshold' } as any, owner);
    let c = g.characters[id];
    expect(stepsTaken(c, 'pain_threshold')).toBe(0); expect(pendingPerkSteps(c).find((x) => x.skill === 'pain_threshold')?.free).toBe(2);
    expect(c.perkPreselect?.pain_threshold?.map((x: any) => x.id)).toEqual(['second_wind', 'close_guard']);
    g = apply(g, { type: 'levelup/perk', charId: id, perkId: 'second_wind' } as any, owner);
    g = apply(g, { type: 'levelup/perk', charId: id, perkId: 'second_wind' } as any, owner);
    c = g.characters[id];
    expect(c.perks.filter((x) => PERK[x.id]?.skills.includes('pain_threshold'))).toEqual([{ id: 'second_wind', tier: 'II' }]);
    expect(c.perkPreselect?.pain_threshold).toBeUndefined(); expect(pendingRepicks(c)).toEqual([]);
    expect(() => apply(g, { type: 'levelup/perk-repick', charId: id, skill: 'pain_threshold' } as any, owner)).toThrow(/No re-pick/);
  });
  it('a sheet made after the table carries its stamp and is offered nothing', () => {
    PT.perk_remap = { rev: 1, perks: {}, passives: {} };
    const s = storyWith([{ skills: { pain_threshold: 5 } }]), c = s.g.characters[s.chars[0].id];
    expect(c.perkRev).toEqual({ pain_threshold: 1 });
    expect(migrateLoaded(JSON.parse(JSON.stringify(s.g))).characters[c.id].perkRepick).toBeUndefined();
  });
});

describe('the Strength step\'s tables (rules 1.73 items 5810, 5815): an old save at Guts 5 and Intimidation 5', () => {
  it('Iron Stomach II becomes Steady II (both steps), no passive past the steps; Intimidation keeps Bone Talk and gets Marrow Talk; one re-pick each', () => {
    const s = storyWith([{ skills: { guts: 5, intimidation: 5 }, perks: { bone_talk: 'I' } }]), id = s.chars[0].id;
    const old = JSON.parse(JSON.stringify(s.g)); delete old.characters[id].perkRev; delete old.characters[id].perkRepick;
    old.characters[id].perks = [{ id: 'iron_stomach', tier: 'II' }, { id: 'bone_talk', tier: 'I' }]; // what a 0.31 save holds
    const c: Character = migrateLoaded(old).characters[id];
    const of = (sk: string) => c.perks.filter((x) => PERK[x.id]?.skills.includes(sk));
    expect(of('guts')).toEqual([{ id: 'steady', tier: 'II' }]); // the mapped perk at its tier fills both steps (the passives do not fit)
    expect(of('intimidation')).toEqual([{ id: 'bone_talk', tier: 'I' }, { id: 'marrow_talk', tier: 'I' }]);
    expect(c.perks.some((x) => x.id === 'iron_stomach')).toBe(false);
    expect(pendingRepicks(c).map((x) => x.skill)).toEqual(expect.arrayContaining(['guts', 'intimidation']));
  });
});

describe('levels (the brief\'s H): an unspent Attribute point carries from level 2 to level 3', () => {
  it('through the Narrator\'s XP and levelup/raise', () => {
    const s = storyWith([{}]), id = s.chars[0].id, c = () => s.g.characters[id];
    const xpTo = (lvl: number) => { for (let i = 0; i < 200 && c().level < lvl; i++) s.act({ type: 'narrator/turn', turn: { narration: 'Work.', xp: [{ source: 'dialogue', charId: id, amount: 25, reason: 'test' }] } } as any); };
    const u0 = { ...c().unspent };
    xpTo(2); expect(c().level).toBe(2);
    expect(c().unspent.attr).toBe(u0.attr + 1);
    xpTo(3); expect(c().level).toBe(3);
    expect(c().unspent.attr).toBe(u0.attr + 1); // level 3 gives none, and the level-2 point is still there
    const a = (Object.keys(c().attrs) as string[]).find((k) => (c().attrs as any)[k] < 7)!, before = (c().attrs as any)[a];
    s.act({ type: 'levelup/raise', charId: id, kind: 'attr', id: a } as any, c().owner);
    expect((c().attrs as any)[a]).toBe(before + 1); expect(c().unspent.attr).toBe(u0.attr);
  });
});
void SCHED;

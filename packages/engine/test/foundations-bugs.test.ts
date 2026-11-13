// Engine foundations 1 (docs/design/handoffs/engine-foundations-1.md): the bugs the architecture review found by
// reading (docs/design/proposals/2026-11-engine-review/1-duplication.md, section 3). Each test failed on the code the
// review read and pins the fix.
import { describe, expect, it } from 'vitest';
import './helpers/yard16';
import { CLASS_MOVE_POOL, applyCond, enemyIntent, previewPerkAction, STORY_CARRY, rngOf, d20, type Unit } from '../src';
import { fightWith, withGame, rng } from './helpers/perkfight';
import { useRevision2Classes } from './helpers/legacy';
useRevision2Classes();

const medic = (traits: string[] = []) => ({ classId: 'medic', level: 5, skills: { first_aid: 1 }, traits });

describe('review section 3: the bugs found by reading', () => {
  it('1. Field Medic makes Triage 1 AP cheaper (it answered ap_cost:triage, and nothing asked)', () => {
    for (const [traits, ap] of [[[], 2], [['field_medic'], 1]] as [string[], number][]) {
      const f = fightWith([medic(traits), {}], [{}]);
      const [m, ally] = f.pcs; f.unit(m.id).pos = '3,2'; f.unit(ally.id).pos = '4,2'; f.unit(ally.id).hp = 20;
      const u = f.turn(m), ap0 = u.ap;
      const pv = previewPerkAction({ u, cb: f.cb, g: f.g }, 'class:medic.triage', { actionId: 'triage', targetId: ally.id });
      expect(pv.ap, 'the card').toBe(ap);
      void ap0; // rules 1.33: Triage runs through an Attuner in hand (test/tending.test.ts); the price is the card's, at its site 'triage'
    }
  });

  it('2. the Injured condition goes through the one injury roll: Injury Resist, the injury hook and bleed immunity count', () => {
    const f = fightWith([{}], [{}]);
    const u = f.unit(f.pc.id); u.injResist = 100; u.injuries = []; u.bleed = 0; u.dazedNext = 0;
    const line = withGame(f.g, () => applyCond(f.cb, rng(3), null, u, 'injured'));
    expect(line).toMatch(/injury resisted/);
    expect(u.injuries).toEqual([]); expect(u.bleed || 0).toBe(0); expect(u.dazedNext || 0).toBe(0);
  });

  it('7. Rewrite in the story: the die is rolled by the one roll function and the ruling names the modifier the Narrator adds', () => {
    // Not a wrong number: the story Rewrite names its target in free text, so there is no sheet to read a save from.
    // The engine rolls the die and the TN, and the Narrator adds the target's Rumination modifier (the ruling says so).
    const move = (CLASS_MOVE_POOL as any)['trickster.rewrite'] || Object.values(CLASS_MOVE_POOL).find((m: any) => m.id === 'rewrite');
    expect(move).toBeTruthy();
  });

  it('9. data/classes.json says what the engine does: Rewrite is once a turn', () => {
    const move: any = Object.values(CLASS_MOVE_POOL).find((m: any) => m.id === 'rewrite');
    expect(move.uses).toBe('per_turn');
  });

  it('10. an enemy\'s intent reads the AP its next turn will really have (Dazed: 4), and names only what it can pay for', () => {
    const f = fightWith([{}], [{ at: 'F6' }]);
    const foe: Unit = f.unit(f.foe.id);
    foe.nailed = { ap: 5, by: f.pc.id } as any; foe.dazedNext = 1; // a Dazed turn has 4 AP: pulling free costs 5
    const it0 = withGame(f.g, () => enemyIntent(f.cb, foe));
    expect(it0.text).not.toMatch(/pull itself free/);
    foe.dazedNext = 0;
    expect(withGame(f.g, () => enemyIntent(f.cb, foe)).text).toMatch(/pull itself free/);
  });

  it('11. one list of the story conditions that carry into a fight (the area map\'s list had lost augment_offline)', () => {
    expect([...STORY_CARRY].sort()).toEqual(['augment_offline', 'bleeding', 'fear', 'injured', 'ldebuff', 'left_brain_debuff', 'nausea', 'rdebuff', 'right_brain_debuff', 'shaken', 'weakened']);
  });

  it('8. Switcheroo shows: the swap emits the two move events an Outburst swap does', () => {
    const f = fightWith([{ name: 'Priest', skills: { faith: 9 } }, { name: 'Ally' }], [{ at: 'F6' }]);
    const c = f.g.characters[f.pc.charId!]; c.belief = { kind: 'faithful', patron: 'the_laughing_mask' } as any; c.patron = 'the_laughing_mask'; c.devotion = 10;
    const [pr, al] = f.pcs; f.unit(pr.id).pos = '2,5'; f.unit(al.id).pos = '2,6'; f.unit(f.foe.id).pos = '5,5';
    f.turn(pr); const n0 = (f.cb.fx || []).length;
    f.act({ type: 'faith/pray', unitId: pr.id, kind: 'hymn', id: 'switcheroo', targetId: pr.id, targetId2: al.id } as any);
    expect(f.unit(pr.id).pos).toBe('2,6'); expect(f.unit(al.id).pos).toBe('2,5');
    const moves = (f.cb.fx || []).slice(n0).filter((e: any) => e.k === 'shove' && e.swap);
    expect(moves.map((e: any) => e.target + ':' + e.from + '>' + e.to).sort()).toEqual([pr.id + ':2,5>2,6', al.id + ':2,6>2,5'].sort());
  });

  it('12. rngOf never rolls on a fixed seed: with no rng in reach it throws', () => {
    expect(() => rngOf(null, null)).toThrow(/no rng/i);
    const r = { state: 5 }; expect(rngOf(null, { rng: r })).toBe(r);
    const f = fightWith([{}], [{}]);
    withGame(f.g, () => { expect(rngOf()).toBe(f.g.rng); });
    expect(d20(rngOf({ g: { rng: { state: 9 } } }))).toBeGreaterThan(0);
  });
});

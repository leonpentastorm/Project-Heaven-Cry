// The outside playtest of 0.31.10 (docs/design/proposals/2026-11-18-outside-playtest/TRIAGE.md), rows 1 to 8: each
// pinned through the reducer.
import { describe, expect, it } from 'vitest';
import './helpers/yard16';
import { previewDescriptor } from '../src';
import { fightWith, withGame } from './helpers/perkfight';

describe('row 1: a stim on yourself in a fight', () => {
  for (const id of ['stim', 'stim_throw']) it(id + ': your own unit is a choice, and the reducer heals you', () => {
    const f = fightWith([{}], [{ at: 'O10' }]); const u = f.turn(f.pc);
    for (const c of Object.values(f.g.characters)) c.stims = 2;
    f.unit(u.id).hp = Math.floor(u.maxHp / 2);
    const pv0 = withGame(f.g, () => previewDescriptor(f.g, u.id, id, {}, 'host'))!;
    expect(pv0.marks.units.filter((m) => m.tone === 'choice').map((m) => m.id)).toContain(u.id);
    const pv = withGame(f.g, () => previewDescriptor(f.g, u.id, id, { targetId: u.id }, 'host'))!;
    expect(pv.ok).toBe(true);
    const hp0 = f.unit(u.id).hp;
    f.act(pv.action!);
    expect(f.unit(u.id).hp).toBeGreaterThan(hp0);
  });
});

import { newCharacter, levelUpDue, pendingPerkSteps, allPendingDoorPicks, loadoutView, apply } from '../src';
import { survivalRoom, ownerOf } from './helpers/survival';
describe('row 2: perk steps and a fork open at the start are a level-up due', () => {
  const mk = (skills: Record<string, number>) => newCharacter('x', 'host', { name: 'X', portrait: '', origin: '', kit: 'tank', traits: [], skills, attrs: {}, cores: { body: 1, mind: 1, soul: 1 }, identity: {} } as any);
  it('a fork alone (perk steps taken) is a level-up due', () => {
    for (const [skill, n] of [['raw_power', 7], ['durability', 7], ['ingenuity', 7], ['empathy', 7], ['faith', 7]] as const) {
      const c: any = mk({ [skill]: n });
      if (!allPendingDoorPicks(c).length) continue;
      // take every perk step so only the fork is open
      for (let i = 0; i < 9 && pendingPerkSteps(c).length; i++) { const s = pendingPerkSteps(c)[0]; c.perks.push({ id: s.choices[0].id, tier: s.choices[0].tier }); }
      expect(pendingPerkSteps(c), skill).toEqual([]);
      expect(levelUpDue(c), skill).toBe(true);
      return;
    }
    throw new Error('no door with a fork at 7 points');
  });
  it('the camp\'s view says a level-up is due (what Start the run asks about)', () => {
    let g = apply(survivalRoom('PHC-0001', [{ build: 'plain_gun', level: 1 }], { test: true }), { type: 'run/start', seed: 'PHC-0001' }, 'host');
    const c: any = g.characters.c1; c.unspent = { ...c.unspent, skill: 2 };
    const v: any = withGame(g, () => loadoutView(g, ownerOf(0)));
    expect(v.levelUp).toBe(true);
  });
});

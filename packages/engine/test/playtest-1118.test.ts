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

import { previewEvoke } from '../src';
describe('row 3: Evoke never arms yourself with a Line that would only hit you', () => {
  /** A Sigil caster on the end glyph of a SPARK · SEEK Line, a foe standing on the Line's far side. */
  const line = (words: string[]) => {
    const f = fightWith([{ archetype: 'sigilist', kit: 'sigil' }], [{}]);
    f.cb.map = { ...f.cb.map, cover: [], full: [], solid: [] } as any; f.cb.objects = [];
    f.pc.pos = '2,5'; f.foe.pos = '6,5'; f.foe.hp = f.foe.maxHp = 5000;
    const u = f.turn(f.pc); u.ap = 9; const m = u.mg!; m.evoker = true; m.words = [...new Set([...words, 'spark', 'seek'])]; m.charge = 60; m.glyphAp = 1; m.maxWords = 4; m.flux = 0;
    words.forEach((w, i) => { f.pc.pos = (3 - i) + ',5'; f.act({ type: 'combat/draw', unitId: f.pc.id, word: w, tile: (3 - i) + ',5' }); });
    return f;
  };
  it('SPARK · SEEK aimed at your own tile is refused before anything is spent, and your tile is not a pick', () => {
    const f = line(['spark', 'seek']), u = f.unit(f.pc.id), hp0 = u.hp;
    const pv = withGame(f.g, () => previewEvoke(f.cb, u, u.pos, u.pos));
    expect(pv.ok).toBe(false); expect(pv.pickable).not.toContain(u.pos);
    expect(() => f.act({ type: 'combat/evoke', unitId: u.id, tile: u.pos, aim: u.pos } as any)).toThrow();
    expect(f.unit(u.id).hp).toBe(hp0);
    // the foe on the Line is still the pick
    expect(withGame(f.g, () => previewEvoke(f.cb, u, u.pos, '6,5')).ok).toBe(true);
  });
  it('the self-target rule stands where it says so: a Boon, and a Burst centred on you', () => {
    const f = line(['mend', 'condense']), u = f.unit(f.pc.id);
    expect(withGame(f.g, () => previewEvoke(f.cb, u, u.pos, u.pos)).ok).toBe(true);
    const g = line(['spark', 'spread']), v = g.unit(g.pc.id);
    expect(withGame(g.g, () => previewEvoke(g.cb, v, v.pos, v.pos)).pickable).toContain(v.pos);
  });
});

import { actionsFor } from '../src';
describe('row 4: Second Wind (Durability 5) is on the combat bar and heals', () => {
  it('a Durability 5 tank has Second Wind; it heals a quarter of max HP through the reducer, once a fight; the boon of the same name is apart', () => {
    const f = fightWith([{ skills: { durability: 5 } } as any], [{ at: 'O10' }]); const u = f.turn(f.pc);
    const ds = withGame(f.g, () => actionsFor(f.g, u.id, 'host'));
    const d = ds.find((x) => x.name === 'Second Wind')!;
    expect(d).toBeTruthy(); expect(d.available).toBe(true); expect(d.id).not.toMatch(/boon/);
    f.unit(u.id).hp = 20; const ap0 = f.unit(u.id).ap;
    const pv = withGame(f.g, () => previewDescriptor(f.g, u.id, d.id, {}, 'host'))!;
    expect(pv.ok).toBe(true); f.act(pv.action!);
    expect(f.g.combat!.log.at(-1)).toMatch(/Second Wind · Tester 1 heals \d+/); expect(f.unit(u.id).hp).toBe(20 + Math.floor(u.maxHp / 4));
    expect(ap0 - f.unit(u.id).ap).toBe(2);
    const again = withGame(f.g, () => actionsFor(f.g, u.id, 'host')).find((x) => x.id === d.id)!;
    expect(again.available).toBe(false);
  });
});

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

import { resolveAttack, mod } from '../src';
import { physFight, rig } from './helpers/physfight';
describe('row 5: Parry while holding Guard', () => {
  /** A Durability 7 tank (Dexterity 1) with Parry, a maul-wielding Soldier next to it; the foe's blow through resolveAttack. */
  function fight(answers?: string[]) {
    const f = physFight([{ weapon: 'hand_wraps', known: ['parry'], skills: { durability: 7, dexterity: 1, athletics: 0, raw_power: 0 } }], [{ tier: 'soldier', weapon: 'maul' }]);
    f.cb.objects = []; f.put(f.pcs[0], 'C5'); const a = f.cb.units.find((u) => u.side === 'foe')!; f.put(a, 'D5'); a.hp = a.maxHp = 900;
    const t = f.unit(f.pcs[0].id); t.hp = t.maxHp; t.armour = 0; t.res!.guard = 3;
    if (answers) (f.char(f.pcs[0]) as any).phys.answers = answers;
    f.cb.round = 1; rig({ hit: true, die: 12 }); f.turn(a);
    f.bound(() => resolveAttack(f.cb, f.g.rng, f.unit(a.id), f.unit(t.id), 'melee', null, { noAp: true })); rig(null);
    return { f, t: f.unit(t.id), a: f.unit(a.id) };
  }
  it('the parry rolls with Durability (the Guard door), not the weapon skill', () => {
    const { f } = fight(['parry']);
    const line = f.cb.log.find((l) => / parries/.test(l))!;
    expect(line).toBeTruthy();
    const dur = mod(7);
    expect(line).toContain('+' + dur + ' ');
  });
  it('with Parry switched off, Retort answers the blow (the one reaction a unit an event: rules 1.28)', () => {
    const { f, a } = fight(['retort']);
    expect(f.cb.log.some((l) => / parries/.test(l))).toBe(false);
    expect(f.cb.log.join(' ')).toMatch(/Retort/); expect(a.hp).toBeLessThan(900);
  });
});

import { applyCond } from '../src';
describe('row 7: the Break toggle is never shown on when it can\'t be used', () => {
  function hidden(shadow: number) {
    const f = physFight([{ weapon: 'service_pistol', skills: { ingenuity: 7, dexterity: 3 } }], [{ tier: 'soldier', weapon: 'fists' }]);
    f.cb.objects = []; f.put(f.pcs[0], 'C5'); const a = f.cb.units.find((u) => u.side === 'foe')!; f.put(a, 'D5'); a.hp = a.maxHp = 900; a.armour = 0;
    const u = f.turn(f.pcs[0]); f.unit(u.id).res!.shadow = shadow;
    f.bound(() => applyCond(f.cb, f.g.rng, f.unit(u.id), f.unit(u.id), 'hidden', 9, undefined, { skipSave: true }));
    return { f, u: f.unit(u.id), a: f.unit(a.id) };
  }
  it('at 0 Shadow the Break chip is greyed and off, even with the switch left set; at 2 it is on', () => {
    const BR = 'skill:ingenuity.1#shadow.break';
    const z = hidden(0), pv0 = z.f.bound(() => previewDescriptor(z.f.g, z.u.id, 'melee', { targetId: z.a.id, mods: [BR] }, 'host'))!;
    const t0 = pv0.toggles.find((t) => t.id === BR)!; expect(t0.why).toBeTruthy(); expect(t0.on).toBe(false);
    expect((pv0.action as any)?.mods || []).not.toContain(BR);
    const two = hidden(2), pv2 = two.f.bound(() => previewDescriptor(two.f.g, two.u.id, 'melee', { targetId: two.a.id, mods: [BR] }, 'host'))!;
    expect(pv2.toggles.find((t) => t.id === BR)!.on).toBe(true); expect((pv2.action as any)?.mods).toContain(BR);
  });
});

import { figFight } from './helpers/figfight';
import { makeFigment } from '../src/figments';
import { fightTally } from '../src';
describe('row 8: a Figment\'s damage and kills are its owner\'s, and Volatile\'s blast is in the log', () => {
  it('a Volatile Figment destroyed by a foe bursts on the foe beside it: logged, and the tally credits the owner', () => {
    const f = figFight([{ skills: { visualization: 5 }, level: 5 }], [{ at: '12,8' }]);
    const owner = f.pcs[0]; owner.pos = '3,5'; f.cb.tape = [];
    const fig: any = withGame(f.g, () => makeFigment(f.cb, f.g.rng as any, owner, 'beast', ['volatile'], '4,5', { charge: 1 }));
    expect(typeof fig).not.toBe('string');
    const foe = f.foe; foe.pos = '5,5'; foe.hp = 5; foe.armour = 0; fig.hp = 1;
    rig({ hit: true, die: 12 }); f.turn(foe);
    const log0 = f.cb.log.length;
    withGame(f.g, () => resolveAttack(f.cb, f.g.rng, foe, fig, 'melee', null, { noAp: true })); rig(null);
    expect(fig.hp).toBe(0); expect(foe.hp).toBe(0);
    const lines = f.cb.log.slice(log0).join(' | ');
    expect(lines).toContain('Volatile: '); expect(lines).toContain('damage to ' + foe.name);
    const t = fightTally(f.cb.tape as any, f.cb.units, f.cb.round, f.cb);
    expect(t.chars[owner.charId!].dealt).toBeGreaterThan(0); expect(t.chars[owner.charId!].kills).toBe(1);
    expect(t.other.dealt).toBe(0);
  });
});

describe('row 11: Ghost Kill only when no enemy\'s eyes reach you as the attack is made (the victim\'s too)', () => {
  /** An Ingenuity 3 Operative and two minions: the victim next to it (eyes open), the other far off and blind. */
  const fight = (o: { hidden?: boolean; victimBlind?: boolean } = {}) => {
    const f = fightWith([{ weapon: 'hellraiser_service_rifle', skills: { ingenuity: 3 }, attrs: { perception: 3 } }], [{ tier: 'minion' }, { tier: 'minion' }]);
    const t = f.foes[0], w = f.foes[1]; w.pos = '14,8'; w.vision = 1;
    const u = f.turn(f.pc); f.unit(u.id).pos = '1,4'; t.pos = o.hidden ? '3,4' : '2,4';
    if (o.hidden) { t.vision = 1; f.act({ type: 'combat/hide', unitId: u.id } as any); if (!f.unit(u.id).hidden) throw new Error('could not hide'); if (!o.victimBlind) f.unit(t.id).vision = 12; }
    f.unit(t.id).hp = 1; f.unit(u.id).attack = 60;
    return { f, u: f.unit(u.id), t: f.unit(t.id) };
  };
  it('a melee kill in plain sight (the victim sees you; nobody else does) leaves you revealed', () => {
    const { f, u, t } = fight();
    f.act({ type: 'combat/attack', unitId: u.id, targetId: t.id, mode: 'melee' } as any);
    expect(f.unit(t.id).hp).toBeLessThanOrEqual(0);
    expect(f.unit(u.id).hidden).toBeFalsy(); expect(f.cb.log.some((l: string) => /Ghost Kill/.test(l))).toBe(false);
  });
  it('from Hidden, with the victim\'s eyes on your tile, no Ghost Kill; with no eyes on you at all, Ghost Kill', () => {
    const seen = fight({ hidden: true });
    seen.f.act({ type: 'combat/attack', unitId: seen.u.id, targetId: seen.t.id, mode: 'shot' } as any);
    expect(seen.f.unit(seen.t.id).hp).toBeLessThanOrEqual(0); expect(seen.f.unit(seen.u.id).hidden).toBeFalsy();
    const dark = fight({ hidden: true, victimBlind: true });
    dark.f.act({ type: 'combat/attack', unitId: dark.u.id, targetId: dark.t.id, mode: 'shot' } as any);
    expect(dark.f.unit(dark.t.id).hp).toBeLessThanOrEqual(0); expect(dark.f.unit(dark.u.id).hidden).toBe(true);
  });
});

import survivalJ from '../../../data/survival.json';
describe('row 12: the Primed boon starts the door\'s meter a step up (Momentum too)', () => {
  const PRIMED: any = (survivalJ as any).boons.find((b: any) => b.id === 'boon.primed');
  const step = (res: string) => PRIMED.effects.find((e: any) => e.resource === res).value;
  it('a Raw Power character starts the fight with the door\'s Momentum plus Primed\'s step; Guard and Shadow likewise', () => {
    for (const [skill, res] of [['raw_power', 'momentum'], ['durability', 'guard'], ['ingenuity', 'shadow']] as const) {
      const sk = { durability: 0, raw_power: 0, ingenuity: 0, [skill]: 3 };
      // a melee weapon: Momentum is a meter of a unit that holds one
      const plain = fightWith([{ kit: 'soldier', weapon: 'maul', skills: sk } as any], [{ tier: 'soldier', at: 'O10' }]);
      const primed = fightWith([{ kit: 'soldier', weapon: 'maul', relics: ['boon.primed'], skills: sk } as any], [{ tier: 'soldier', at: 'O10' }]);
      const a = plain.turn(plain.pc), b = primed.turn(primed.pc);
      expect(((primed.unit(b.id) as any).res?.[res] ?? 0) - ((plain.unit(a.id) as any).res?.[res] ?? 0), res).toBe(step(res));
      // once a fight: a second turn adds nothing more
      if (res === 'momentum') { const m = (primed.unit(b.id) as any).res.momentum; primed.act({ type: 'combat/end-turn', unitId: b.id } as any); primed.turn(primed.pc); expect((primed.unit(b.id) as any).res.momentum).toBeLessThanOrEqual(m); }
    }
  });
});

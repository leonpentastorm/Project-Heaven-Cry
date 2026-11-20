// Rules 1.73 (Body), the Strength step (0.32): Raw Power's ladder (Grapple at 2, Throw Down at 5), Guts' and
// Intimidation's four perks (Unflinching, Point Man, Marrow Talk, Stare Down), and Headlong against the Breaker's
// Charge Carries. Every test goes through the reducer or the one attack path; the numbers are read from the data.
import { describe, it, expect, beforeEach } from 'vitest';
import './helpers/yard16';
import { physFight, rig } from './helpers/physfight';
import { withGame } from './helpers/perkfight';
import { applyCond, condOn, resolveAttack, previewAttack, PERK, SKILL, type Unit } from '../src';
import forksJ from '../../../data/forks.json';
import classesJ from '../../../data/classes.json';

beforeEach(() => rig(null));
type F = ReturnType<typeof physFight>;
const P = PERK as Record<string, any>;
const FK: Record<string, any> = Object.fromEntries((forksJ as any).items.map((x: any) => [x.id, x]));
const big = (f: F, u: Unit) => { const x = f.unit(u.id); x.hp = x.maxHp = 9999; return x; };

describe('Raw Power 5: Throw Down with any melee weapon (rules 1.73 item 5803)', () => {
  it('a sabre at Raw Power 5 has Throw Down on the pad; at 4 it does not; on a held foe it lands through the reducer', () => {
    const mk = (pts: number) => { const f = physFight([{ weapon: 'sabre', skills: { raw_power: pts } }], [{ at: 'D7', tier: 'soldier' }]); f.cb.objects = []; f.put(f.pc, 'C7'); f.put(f.foe, 'D7'); f.turn(f.pc); return f; };
    const ids = (f: F) => f.pad().flatMap((g: any) => g.entries.map((e: any) => e.id));
    expect((SKILL as any).raw_power.unlocks['5'].effects[0]).toMatchObject({ op: 'stat_mod', stat: 'technique:throw_down' });
    const yes = mk(5), no = mk(4);
    expect(ids(yes)).toContain('throw_down'); expect(ids(no)).not.toContain('throw_down');
    const foe = big(yes, yes.foe); withGame(yes.g, () => applyCond(yes.cb, yes.g.rng, yes.unit(yes.pc.id), foe, 'grappled', undefined, undefined, { skipSave: true }));
    yes.momentum(yes.pc, 3); rig({ hit: true, die: 12 });
    expect(yes.tech('throw_down', { targetId: foe.id, tile: yes.tile('D8') })).toBeNull();
    expect(yes.unit(foe.id).prone).toBe(true); expect(yes.momentum(yes.pc)).toBe(0);
  });
});

describe('Guts: Unflinching (rules 1.73 item 5813)', () => {
  const blow = (tier: string | null, m: number, mode: 'melee' | 'shot') => {
    const f = physFight([{ weapon: 'sabre', skills: { guts: 5 }, ...(tier ? { perks: { unflinching: tier } } : {}) }], [{ at: 'D7', tier: 'soldier', weapon: mode === 'melee' ? 'sabre' : 'service_pistol' }]);
    f.cb.objects = []; f.put(f.pc, 'C7'); f.put(f.foe, 'D7'); f.momentum(f.pc, m);
    f.cb.turn = f.cb.order.indexOf(f.foe.id); f.unit(f.foe.id).ap = 6;
    const pv = withGame(f.g, () => previewAttack(f.cb, f.unit(f.foe.id), f.unit(f.pc.id), mode));
    return (pv.terms || []).filter((t: any) => /Unflinching/.test(t.label)).reduce((n: number, t: any) => n + t.v, 0);
  };
  const v = P.unflinching.tiers.I.effects[0].value, need = P.unflinching.tiers.I.effects[0].if.self_res.momentum.at_least;
  it('I: at the Momentum it names, a melee attack on you is at its value to hit; under it, or a shot, nothing', () => {
    expect(blow('I', need, 'melee')).toBe(v); expect(blow('I', need - 1, 'melee')).toBe(0); expect(blow('I', need, 'shot')).toBe(0); expect(blow(null, need, 'melee')).toBe(0);
  });
  it('II: shots too', () => { expect(blow('II', need, 'shot')).toBe(P.unflinching.tiers.II.effects[0].value); expect(blow('II', need, 'melee')).toBe(P.unflinching.tiers.II.effects[0].value); });
});

describe('Guts: Point Man II (rules 1.73 item 5812)', () => {
  it('an ally within reach has the bonus on a Heart save; one farther, or without the perk, does not (the save through applyCond)', () => {
    const PM = P.point_man.tiers.II.effects[1];
    const mod = (tier: string | null, at: string) => {
      const f = physFight([{ weapon: 'sabre', skills: { guts: 5 }, ...(tier ? { perks: { point_man: tier } } : {}) }, { name: 'Mate', weapon: 'sabre' }], [{ at: 'J7', tier: 'soldier' }]);
      f.cb.objects = []; f.put(f.pcs[0], 'C7'); f.put(f.pcs[1], at);
      const line = withGame(f.g, () => applyCond(f.cb, f.g.rng, f.unit(f.foe.id), f.unit(f.pcs[1].id), 'shaken'));
      const m = /heart save d20 \d+ ([+−-]\d+)/.exec(line); expect(m, line).not.toBeNull(); return Number(m![1].replace('−', '-'));
    };
    const near = mod('II', 'D7'), far = mod('II', 'J3'), none = mod(null, 'D7'), one = mod('I', 'D7');
    expect(near - none).toBe(PM.value); expect(far).toBe(none); expect(one).toBe(none);
  });
});

describe('Intimidation: Marrow Talk II and Stare Down (rules 1.73 items 5814, 5815)', () => {
  it('Marrow Talk II: a foe that saves against your Threaten is still Shaken for its rounds; without it, not', () => {
    const run = (tier: string | null) => {
      const f = physFight([{ weapon: 'sabre', skills: { intimidation: 5 }, ...(tier ? { perks: { marrow_talk: tier } } : {}) }], [{ at: 'E7', tier: 'soldier' }]);
      f.cb.objects = []; f.put(f.pc, 'C7'); f.put(f.foe, 'E7'); f.turn(f.pc); f.unit(f.pc.id).ap = 9;
      f.unit(f.foe.id).sv = { body: 50, brain: 50, heart: 50 } as any; // it saves
      f.act({ type: 'combat/call', unitId: f.pc.id, id: 'call.threaten', targetId: f.foe.id } as any);
      return condOn(f.unit(f.foe.id), 'shaken');
    };
    expect(run('II')).toBe(true); expect(run('I')).toBe(false); expect(run(null)).toBe(false);
  });
  it('Stare Down: when the fight starts the nearest foe that sees you saves or is Stunned (it loses its first turn); II also Shakes it', () => {
    const run = (tier: string | null) => {
      const f = physFight([{ weapon: 'sabre', skills: { intimidation: 5 }, ...(tier ? { perks: { stare_down: tier } } : {}) }], [{ at: 'E7', tier: 'soldier' }]);
      const foe = f.unit(f.foe.id); return { stunned: condOn(foe, 'stunned'), shaken: condOn(foe, 'shaken'), said: f.cb.log.some((l: any) => /Stare Down|stares .* down/.test(String(l))) };
    };
    const none = run(null); expect(none.stunned || none.said).toBe(false);
    const one = run('I'); expect(one.said).toBe(true);
    const two = run('II'); expect(two.said).toBe(true); expect(two.shaken).toBe(true);
  });
});

describe('Headlong against the Breaker’s Charge Carries (rules 1.73 item 5807)', () => {
  it('a Breaker’s Charge paid by Headlong builds nothing; the same Charge paid in AP builds Charge Carries’ Momentum', () => {
    const CC = (classesJ as any).base.find((b: any) => b.id === 'fighter').gain.find((g: any) => g.id === 'charge_carries').effects[0].value;
    const run = (picks: string[], m: number) => {
      const f = physFight([{ weapon: 'sabre', known: ['charge'], skills: { raw_power: 8, athletics: 4 }, attrs: { strength: 8 }, level: 12, classId: 'fighter', picks } as any], [{ at: '9,4', tier: 'boss' }]); f.cb.objects = [];
      const u = f.turn(f.pc); f.put(u, '5,4'); f.put(f.foe, '9,4'); big(f, f.foe); f.unit(u.id).ap = 9; f.unit(u.id).openerUsed = true; f.momentum(u, m); rig({ hit: true, die: 12 });
      expect(f.tech('charge', { targetId: f.foe.id })).toBeNull(); return f.momentum(f.unit(u.id));
    };
    // both close in first (Barrel In's rule for a Breaker who moved toward its foe: not the Charge's own build, so Headlong
    // leaves it); the Headlong Charge then pays its Momentum and Charge Carries builds nothing on it
    const paid = run(['fork.momentum.headlong'], 2), plain = run(['fork.momentum.spill'], 2);
    expect(plain - paid).toBe(-FK['fork.momentum.headlong'].effects[1].and[0].value + CC);
  });
});

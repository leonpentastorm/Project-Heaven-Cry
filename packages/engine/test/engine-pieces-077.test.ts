// @ts-nocheck (test fixtures: plain objects)
// Rules 1.77 (0.32, the engine pieces): the pieces the lead approved from the lanes' "needs a primitive" list, and the
// rules each unlocked. Every rule goes through the reducer (the helpers' fight, a real action) or a real blow; every
// number is read from data.
import { describe, it, expect } from 'vitest';
import { PERK, condOn, actionsFor, previewAttack, saveAgainst, resolveAttack } from '../src';
import { fightWith, withGame } from './helpers/perkfight';
import { applyCond } from '../src/magic';
import { resOf } from '../src/tactics';
import { makeObject } from '../src/objects';
import { allVerbs } from '../src/effects/collect';

const tierFx = (id: string, t: string) => (PERK as any)[id].tiers[t].effects;

describe('targets.if (item 6500): Five Stars II reaches the rank-and-file only', () => {
  it('a soldier can be Shaken by Five Stars II; an Elite and a Boss never are', () => {
    expect(tierFx('five_stars', 'II')[1].targets.if.target_not_tier).toEqual(['elite', 'boss']);
    const shakenOf = (tier: string) => { let n = 0; for (let i = 0; i < 8; i++) { const f = fightWith([{ skills: { authority: 9 }, perks: { five_stars: 'II' } }], [{ at: 'F6', tier }], { seed: 'FS' + i }); if (condOn(f.foe, 'shaken')) n++; } return n; };
    expect(shakenOf('soldier')).toBeGreaterThan(0);
    expect(shakenOf('elite')).toBe(0);
    expect(shakenOf('boss')).toBe(0);
  });
});

describe("grant_action tab (item 6501): the Tending verbs on Camaraderie's perks sit on the TEND tab", () => {
  it('Settle and Soothe (Steady Hands II) and Tug and Guide (Pull Together II) are TEND rows, not Perks rows', () => {
    const f = fightWith([{ skills: { empathy: 5, camaraderie: 9 }, perks: { steady_hands: 'II', pull_together: 'II' } }], [{ at: 'F6' }]);
    const rows = actionsFor(f.g, f.pc.id, null);
    for (const name of ['Settle', 'Soothe', 'Tug', 'Guide']) { const d: any = rows.find((x: any) => x.name.startsWith(name)); expect(d, name).toBeTruthy(); expect(d.group, name).toBe('tend'); }
  });
});

describe('acted carries the Call id (item 6502): Read Intent reads a Spot from the action itself', () => {
  it('a Spot on a foe Reads it; another Call at the same foe does not; Read Intent holds no mark on the price', () => {
    const fx = (PERK as any).read_intent.tiers.I.effects; expect(fx.some((e: any) => e.op === 'mark')).toBe(false);
    const call = (id: string) => {
      const f = fightWith([{ skills: { vigilant: 10, intimidation: 5 }, perks: { read_intent: 'I' } }], [{ at: 'E6' }]);
      const u = f.turn(f.pc); u.ap = 9; const n = f.cb.log.length;
      f.act({ type: 'combat/call', unitId: u.id, id, targetId: f.foe.id } as any);
      return { said: f.cb.log.length > n, read: condOn(f.foe, 'read') };
    };
    expect(call('call.spot')).toEqual({ said: true, read: true });
    const other = call('call.threaten'); expect(other.said).toBe(true); expect(other.read).toBe(false);
  });
});

describe('the action\'s target on cond_apply (item 6503): Called Out spares the named foe the Challenge\'s roll', () => {
  it('the Bulwark\'s Challenge: the named foe is Taunted with no save rolled; the other foe in reach rolls its save', () => {
    for (let i = 0; i < 4; i++) {
      const f = fightWith([{ name: 'Tank', skills: { durability: 3 }, attrs: { endurance: 3 }, level: 3, weapon: 'sabre', classId: 'defender' }], [{ at: 'F6' }, { at: 'G6' }], { seed: 'CO' + i });
      const [named, other] = f.foes; f.pc.pos = '4,2'; named.pos = '5,2'; other.pos = '6,2';
      const me = f.turn(f.pc); me.res!.guard = 2;
      f.act({ type: 'combat/perk', unitId: me.id, id: 'skill:durability.1', actionId: 'guard_challenge', targetId: named.id } as any);
      const line = f.cb.log.find((l: string) => /issues a challenge/.test(l))!;
      expect(condOn(f.unit(named.id), 'taunted')).toBe(true);
      const part = (n: string) => line.split(' · ').find((x: string) => x.startsWith(n)) || '';
      expect(part(named.name)).not.toMatch(/save d20/); expect(part(other.name)).toMatch(/save d20/);
      expect(f.cb.log.some((l: string) => /calls out .*no save/.test(l))).toBe(true);
    }
  });
});

describe("a shared limit and the negated resource bound (item 6504): Stalk under the door's two gains, refused at a full meter", () => {
  const STALK = () => (allVerbs() as any[]).find((v) => v.id === 'shadow.stalk');
  const sneak = () => {
    const f = fightWith([{ skills: { ingenuity: 5 }, attrs: { perception: 5 } }], [{}]);
    f.cb.objects = [makeObject('c1', 'crate', '1,4'), makeObject('c2', 'crate', '3,4')]; const foe = f.unit(f.foe.id); foe.pos = '14,9'; foe.vision = 1;
    const u = f.turn(f.pc); f.unit(u.id).pos = '1,5'; f.unit(u.id).ap = 9;
    withGame(f.g, () => applyCond(f.cb, f.g.rng, null, f.unit(u.id), 'hidden', undefined, undefined, { skipSave: true }));
    (f.unit(u.id).res ||= {}).shadow = 0;
    return { f, id: u.id };
  };
  const stalk = (f: any, id: string) => f.act({ type: 'combat/perk', unitId: id, id: 'verb:shadow.stalk' } as any);
  it('refused at a full meter, in words, nothing paid', () => {
    const { f, id } = sneak(); const u = f.unit(id); u.res.shadow = u.resMax.shadow; const ap = u.ap;
    expect(() => stalk(f, id)).toThrow(/full/); expect(f.unit(id).ap).toBe(ap);
  });
  it('Stalk and a cover-to-cover move fill the two a turn: the turn ended Hidden gives no third', () => {
    const cap = STALK().effects[0].effects[0].limit.n;
    const { f, id } = sneak(); stalk(f, id); expect(resOf(f.unit(id), 'shadow')).toBe(1);
    f.act({ type: 'combat/move', unitId: id, to: '2,5' } as any); expect(resOf(f.unit(id), 'shadow')).toBe(cap);
    f.act({ type: 'combat/end-turn', unitId: id } as any); expect(resOf(f.unit(id), 'shadow')).toBe(cap);
    // the same turn without Stalk: the turn ended Hidden is the second gain
    const b = sneak(); b.f.act({ type: 'combat/move', unitId: b.id, to: '2,5' } as any); b.f.act({ type: 'combat/end-turn', unitId: b.id } as any);
    expect(resOf(b.f.unit(b.id), 'shadow')).toBe(cap);
  });
});

describe('Fear reads a stat (item 6505): Steady I', () => {
  const afraid = (perks: any) => {
    const f = fightWith([{ skills: { guts: 5 }, perks }], [{ at: 'H6' }]);
    const u = f.turn(f.pc); u.pos = '2,5'; u.ap = 9; f.foe.pos = '6,5';
    withGame(f.g, () => applyCond(f.cb, f.g.rng, f.foe, f.unit(u.id), 'fear', 3, undefined, { skipSave: true }));
    return { f, id: u.id };
  };
  it('without it, Fear refuses an attack on its source and a step toward it; with Steady I both go, and the to-hit penalty stays', () => {
    const a = afraid({}); expect(condOn(a.f.unit(a.id), 'fear')).toBe(true);
    expect(() => a.f.act({ type: 'combat/attack', unitId: a.id, targetId: a.f.foe.id, mode: 'shot' } as any)).toThrow(/Afraid/);
    expect(() => a.f.act({ type: 'combat/move', unitId: a.id, to: '3,5' } as any)).toThrow(/Afraid/);
    const b = afraid({ steady: 'I' }); expect(condOn(b.f.unit(b.id), 'fear')).toBe(true);
    const pv = (f: any, id: string) => withGame(f.g, () => previewAttack(f.cb, f.unit(id), f.foe, 'shot'));
    expect(pv(b.f, b.id).ok).toBe(true);
    b.f.act({ type: 'combat/move', unitId: b.id, to: '3,5' } as any); expect(b.f.unit(b.id).pos).toBe('3,5');
    b.f.act({ type: 'combat/attack', unitId: b.id, targetId: b.f.foe.id, mode: 'shot' } as any);
    expect(b.f.cb.log.some((l: string) => /Afraid/.test(l))).toBe(false);
  });
});

describe('a save may roll with another skill (item 6506): Point Man I', () => {
  it('an ally within reach rolls its Fear save with the holder’s Guts; out of reach, or without the perk, its own save', () => {
    const rw = (PERK as any).point_man.tiers.I.effects[0]; expect(rw.op).toBe('roll_with'); expect(rw.skill).toBe('guts');
    const labels = (near: boolean, perk: boolean) => { const f = fightWith([{ name: 'Point', skills: { guts: 9 }, ...(perk ? { perks: { point_man: 'I' } } : {}) }, { name: 'Friend' }], [{ at: 'H6' }]);
      const [pm, fr] = f.pcs; f.unit(pm.id).pos = '2,5'; f.unit(fr.id).pos = near ? '3,5' : '14,1';
      const r = withGame(f.g, () => saveAgainst(f.cb, f.g.rng, f.foe, f.unit(fr.id), 'heart', 'fear'));
      return r.parts.map((x: any) => x.label).join(' '); };
    expect(labels(true, true)).toMatch(/Guts \(Point Man\)/);
    expect(labels(false, true)).not.toMatch(/Guts/);
    expect(labels(true, false)).not.toMatch(/Guts/);
  });
});

describe('a roll kept from two dice (item 6507): Untouchable I and II', () => {
  const swing = (tier: string | null, armourClass: number) => {
    let kept = 0, both = 0;
    for (let i = 0; i < 12; i++) {
      const f = fightWith([{ skills: { athletics: 9 }, armourClass, ...(tier ? { perks: { untouchable: tier } } : {}) }], [{ at: 'C6' }], { seed: 'UT' + i });
      f.foe.pos = '3,5'; f.foe.ap = 6; f.pc.pos = '2,5'; const n = f.cb.log.length;
      withGame(f.g, () => resolveAttack(f.cb, f.g.rng, f.unit(f.foe.id), f.unit(f.pc.id), 'shot', null));
      const lines = f.cb.log.slice(n) as string[], two = lines.map((l) => /d20 (\d+) and (\d+), the worse stands/.exec(l)).find((m) => m), shot = lines.map((l) => /fires at .*: d20 (\d+) /.exec(l)).find((m) => m);
      if (two) { both++; if (shot && +shot[1] === Math.min(+two[1], +two[2])) kept++; }
    }
    return { both, kept };
  };
  it('no torso armour: every attack on you rolls two dice and the worse stands (I); Light armour: I gives none, II does', () => {
    const r1 = swing('I', 0); expect(r1.both).toBe(12); expect(r1.kept).toBe(12);
    expect(swing('I', 1).both).toBe(0);
    const r2 = swing('II', 1); expect(r2.both).toBe(12); expect(r2.kept).toBe(12);
    expect(swing('II', 2).both).toBe(0);
    expect(swing(null, 0).both).toBe(0);
  });
});

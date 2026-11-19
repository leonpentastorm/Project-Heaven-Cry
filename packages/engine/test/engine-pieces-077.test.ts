// @ts-nocheck (test fixtures: plain objects)
// Rules 1.77 (0.32, the engine pieces): the pieces the lead approved from the lanes' "needs a primitive" list, and the
// rules each unlocked. Every rule goes through the reducer (the helpers' fight, a real action) or a real blow; every
// number is read from data.
import { describe, it, expect } from 'vitest';
import { PERK, condOn, actionsFor, previewAttack, saveAgainst, resolveAttack, rollInjury } from '../src';
import { fightWith, withGame } from './helpers/perkfight';
import { applyCond } from '../src/magic';
import { resOf } from '../src/tactics';
import { makeObject } from '../src/objects';
import { allVerbs } from '../src/effects/collect';
import CONDS from '../../../data/conditions.json';

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

describe('one more turn at 0 HP (item 6508): Still Standing, and Bite the Bullet on the same op', () => {
  const dropped = (perks: any) => {
    for (let i = 0; i < 30; i++) {
      const f = fightWith([{ skills: { pain_threshold: 5, guts: 5 }, perks }], [{ at: 'C6' }], { seed: 'SS' + i });
      f.foe.pos = '3,5'; f.foe.ap = 6; f.pc.pos = '2,5'; f.pc.hp = 1;
      withGame(f.g, () => resolveAttack(f.cb, f.g.rng, f.unit(f.foe.id), f.unit(f.pc.id), 'shot', null));
      if (f.unit(f.pc.id).lastTurn || f.unit(f.pc.id).downed) return f;
    }
    throw new Error('no hit landed');
  };
  it('Still Standing II: the blow leaves you on 1 HP; your next turn has its AP; at its end you fall Downed', () => {
    const ap = (PERK as any).still_standing.tiers.II.effects[0].turn_ap;
    const f = dropped({ still_standing: 'II' }); const u = f.unit(f.pc.id);
    expect(u.downed).toBeFalsy(); expect(u.hp).toBe(1); expect(condOn(u, 'last_turn')).toBe(true);
    expect(f.turn(u).ap).toBe(ap);
    f.act({ type: 'combat/end-turn', unitId: u.id } as any);
    expect(f.unit(u.id).downed).toBe(true); expect(f.unit(u.id).lastTurn).toBeUndefined();
  });
  it('without the perk the blow drops you; Bite the Bullet keeps its own rule (hits are death-save failures)', () => {
    expect(dropped({}).unit(dropped({}).pc.id).downed).toBe(true);
    const f = dropped({ bite_the_bullet: 'I' }); const u = f.unit(f.pc.id);
    expect(u.lastTurn).toMatchObject({ hits: 'death_save' }); expect(u.hp).toBe(1);
    const n = f.cb.log.length; f.foe.ap = 6;
    for (let i = 0; i < 6 && !f.cb.log.slice(n).some((l: string) => /borrowed time/.test(l)); i++) { f.foe.ap = 6; withGame(f.g, () => resolveAttack(f.cb, f.g.rng, f.unit(f.foe.id), f.unit(u.id), 'shot', null)); }
    expect(f.cb.log.slice(n).some((l: string) => /borrowed time: death-save failure/.test(l))).toBe(true); expect(f.unit(u.id).hp).toBe(1);
  });
});

describe('the sheet reads its number blocks through the one resolver (item 6509)', () => {
  it('strainLimit and readyDesigns move with the skill a block names, and character.ts resolves no skill: itself', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync(new URL('../src/character.ts', import.meta.url), 'utf8');
    expect(src).not.toMatch(/of\.startsWith\('skill:'\)/);
    const { strainLimit, readyDesigns } = await import('../src');
    const f = fightWith([{ skills: { composure: 0, lore_master: 0 } }], [{}]); const c = f.g.characters[f.pc.charId!];
    const s0 = strainLimit(c), r0 = readyDesigns(c); c.skills.composure = 8; c.skills.lore_master = 10;
    expect(strainLimit(c)).toBeGreaterThan(s0); expect(readyDesigns(c)).toBeGreaterThan(r0);
  });
});

describe('a fight-start registration (item 6510): the Primed boon gives its Momentum at combat_start again', () => {
  it('the meter exists and holds the start plus the step before any turn is taken; the Primed row is combat_start', async () => {
    const SV: any = (await import('../../../data/survival.json')).default;
    const P = SV.boons.find((b: any) => b.id === 'boon.primed'), row = P.effects.find((e: any) => e.resource === 'momentum');
    expect(row.when).toBe('combat_start'); expect(row.limit).toBeUndefined();
    const sk = { raw_power: 3 };
    const plain = fightWith([{ kit: 'soldier', weapon: 'maul', skills: sk } as any], [{ tier: 'soldier', at: 'O10' }]);
    const primed = fightWith([{ kit: 'soldier', weapon: 'maul', relics: ['boon.primed'], skills: sk } as any], [{ tier: 'soldier', at: 'O10' }]);
    expect((primed.pc as any).res.momentum - (plain.pc as any).res.momentum).toBe(row.value);
  });
});

describe('a to-hit term carries its source label (item 6511): the fight shows standing defensive modifiers', () => {
  const monk = (armourClass: number) => { const f = fightWith([{ archetype: 'monk', weapon: 'hand_wraps', offHand: null, armourClass } as any], [{ at: 'F6' }]); return f; };
  it('the monk’s token card reads Open guard from the one reader; the enemy’s attack preview at it names the same term; in Medium, neither', async () => {
    const { standingModsFor } = await import('../src');
    const light = monk(1), og = (light.g as any) && standingModsFor(light.g, light.pc.id);
    expect(og).toEqual([{ v: -2, label: 'Open guard', src: 'relic:open_hand' }]); // src: rules 1.78 item 6613 (its picture)
    light.unit(light.foe.id).ap = 6; const pv = withGame(light.g, () => previewAttack(light.cb, light.unit(light.foe.id), light.unit(light.pc.id), 'shot'));
    expect((pv.terms || []).some((t: any) => t.label === 'Open guard' && t.v === -2)).toBe(true);
    const med = monk(2); expect(standingModsFor(med.g, med.pc.id)).toEqual([]);
    expect(standingModsFor(light.g, light.foe.id)).toEqual([]);
  });
});

describe('a resource held by the fight (item 6512): Crystallise draws on the air through the price; Rite in the Field takes nothing', () => {
  const crystal = (tier: string | null, kills: number, mana = 20) => {
    const f = fightWith([{ archetype: 'stormcaller', kit: 'soul', skills: { lore_master: 5 }, ...(tier ? { perks: { rite_in_the_field: tier } } : {}) } as any], Array.from({ length: kills + 1 }, (_, i) => ({ at: 'E' + (6 + i) })));
    for (let i = 0; i < kills; i++) { const foe = f.foes.find((x: any) => !x.dead && !x.downed)!; foe.hp = 1; foe.def = -50; f.unit(f.pc.id).pos = '2,5'; foe.pos = '3,5'; f.unit(f.pc.id).ap = 9;
      for (let n = 0; n < 9 && !f.unit(foe.id).dead; n++, f.unit(f.pc.id).jammed = false) withGame(f.g, () => resolveAttack(f.cb, f.g.rng, f.unit(f.pc.id), f.unit(foe.id), 'shot', null, { noAp: true }));
      f.unit(foe.id).pos = '12,' + (2 + i); }
    f.turn(f.pc); f.pc.ap = 9; f.cb.mana = mana; const cores = f.pc.mg!.coresMade;
    let err = ''; try { f.act({ type: 'combat/crystallise', unitId: f.pc.id } as any); } catch (e: any) { err = String(e.message || e); }
    return { took: mana - (f.cb.mana as number), made: f.pc.mg!.coresMade - cores, err };
  };
  it('plain: it takes the price’s mana from the air; thin air refuses it in the old words; Rite II’s free one takes none', async () => {
    const A: any = (await import('../../../data/actions.json')).default, n = A.costs.crystallise.mana;
    expect(crystal(null, 0)).toEqual({ took: n, made: 1, err: '' });
    expect(crystal(null, 0, n - 1).err).toBe('The air is too thin (mana ' + (n - 1) + ', needs ' + n + ').');
    expect(crystal('II', 3)).toEqual({ took: 0, made: 1, err: '' });
    expect(crystal('II', 3, 0)).toEqual({ took: 0, made: 1, err: '' });
  });
});

describe('Numb I reads the limb injuries the engine carries (item 6513)', () => {
  const hurt = (perk: boolean) => {
    const f = fightWith([{ skills: { pain_threshold: 5 }, ...(perk ? { perks: { numb: 'I' } } : {}) }], [{ at: 'H6' }]);
    const u = f.unit(f.pc.id), mv = u.movement;
    withGame(f.g, () => { rollInjury(f.g.rng, u, f.cb, f.foe, { loc: 'arm' }); });
    f.turn(f.pc); f.unit(f.pc.id).ap = 9;
    const pv = withGame(f.g, () => previewAttack(f.cb, f.unit(f.pc.id), f.unit(f.foe.id), 'shot'));
    const arm = (pv.terms || []).find((t: any) => t.label === 'injured arm');
    withGame(f.g, () => { rollInjury(f.g.rng, f.unit(f.pc.id), f.cb, f.foe, { loc: 'leg' }); });
    return { arm: arm ? arm.v : 0, halved: f.unit(f.pc.id).movement < mv };
  };
  it('without Numb an injured arm is -2 to hit and a leg halves Movement; with Numb I the first limb (the arm) holds nothing back, the second (the leg) does', () => {
    expect(hurt(false)).toEqual({ arm: -2, halved: true });
    expect(hurt(true)).toEqual({ arm: 0, halved: true });
  });
});

describe("reveal what: kit (item 6514): Shadow's Case", () => {
  it('Case on an enemy that cannot see you: Cased, its kit read out for your side only, a Lift on it 1 AP cheaper', async () => {
    const { kitSeenFor } = await import('../src');
    const f = fightWith([{ skills: { ingenuity: 3 }, attrs: { perception: 3 } }], [{}]);
    f.cb.objects = []; const foe = f.unit(f.foe.id); foe.pos = '6,5'; foe.vision = 1;
    const u = f.turn(f.pc); f.unit(u.id).pos = '2,5'; f.unit(u.id).ap = 9;
    withGame(f.g, () => applyCond(f.cb, f.g.rng, null, f.unit(u.id), 'hidden', undefined, undefined, { skipSave: true }));
    expect(kitSeenFor(f.g, foe.id, 'pc')).toBeNull();
    const ap = f.unit(u.id).ap; f.act({ type: 'combat/perk', unitId: u.id, id: 'verb:shadow.case', targetId: foe.id } as any);
    expect(f.unit(u.id).ap).toBe(ap - (allVerbs() as any[]).find((v) => v.id === 'shadow.case').effects[0].ap);
    expect(condOn(f.unit(foe.id), 'cased')).toBe(true);
    const k = kitSeenFor(f.g, foe.id, 'pc')!; expect(k.weapon).toBeTruthy(); expect(typeof k.armour).toBe('number');
    expect(kitSeenFor(f.g, foe.id, 'foe')).toBeNull();
    f.unit(u.id).pos = '5,5'; f.unit(u.id).ap = 9; const before = f.unit(u.id).ap;
    f.act({ type: 'combat/perk', unitId: u.id, id: 'verb:shadow.lift', targetId: foe.id } as any);
    const liftAp = (allVerbs() as any[]).find((v) => v.id === 'shadow.lift').effects[0].ap, cut = (CONDS as any).items.find((r: any) => r.id === 'cased').effects[1].value;
    expect(before - f.unit(u.id).ap).toBe(liftAp + cut);
  });
});

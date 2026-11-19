// Rules 1.74 (Mind), Perception: Ingenuity's forks, Acuity's and Vigilance's new perks, the old saves' remap. Every number
// is read from data (forks.json, perks.json, conditions.json, actions.json, skills.json); every change goes through the
// reducer (combat/perk, combat/analyze, combat/call, door/pick) or the load door (migrateLoaded).
import { describe, it, expect } from 'vitest';
import './helpers/yard16';
import { fightWith, withGame, type CharSpec } from './helpers/perkfight';
import { PERK, SKILL, condOn, migrateLoaded, pendingRepicks, type Unit } from '../src';
import { resOf, spotHidden } from '../src/tactics';
import { applyCond } from '../src/magic';
import { unitSees } from '../src/combat';
import { allVerbs } from '../src/effects/collect';
import { perkActionsFor } from '../src/effects/actions';
import forksJ from '../../../data/forks.json';
import actionsJ from '../../../data/actions.json';
import condJ from '../../../data/conditions.json';

const FORK = (id: string): any => (forksJ as any).items.find((x: any) => x.id === id);
const VERB = (id: string): any => allVerbs().find((v: any) => v.id === id);
const ANALYZE_AP: number = (actionsJ as any).items.find((x: any) => x.id === 'analyze').ap;
const door = (ing: number, extra: CharSpec = {}): CharSpec => ({ ...extra, skills: { ingenuity: ing, ...(extra.skills || {}) }, attrs: { perception: Math.max(ing, 3), ...(extra.attrs || {}) } });
type F = ReturnType<typeof fightWith>;
const at = (f: F, u: Unit, pos: string) => { f.unit(u.id).pos = pos; return f.unit(u.id); };
const hideNow = (f: F, u: Unit) => withGame(f.g, () => applyCond(f.cb, f.g.rng, null, f.unit(u.id), 'hidden', undefined, undefined, { skipSave: true }));
const setShadow = (f: F, u: Unit, n: number) => { (f.unit(u.id).res ||= {}).shadow = n; };
const shadow = (f: F, u: Unit) => resOf(f.unit(u.id), 'shadow');
const use = (f: F, u: Unit, id: string, a: any = {}) => f.act({ type: 'combat/perk', unitId: u.id, id, ...a } as any);

describe('Ingenuity: the ladder (rules 1.74 item 6000)', () => {
  it('Lift and Decoy open at 2, Cut the Strap at 6, Open Seam at 7, Timing at 9; Plant, Foul the Action, Vault and Read Intent are no verbs', () => {
    const has = (id: string, pts: number) => { const f = fightWith([door(pts)], [{}]); return withGame(f.g, () => perkActionsFor({ u: f.unit(f.pc.id), cb: f.cb, g: f.g }, 'combat').some((e: any) => e.id === 'verb:' + id)); };
    for (const [id, n] of [['shadow.lift', 2], ['shadow.decoy', 2], ['shadow.cut_strap', 6], ['shadow.open_seam', 7], ['shadow.timing', 9]] as const) {
      expect(VERB(id).requires[0].min, id).toBe(n); expect(has(id, n), id).toBe(true); expect(has(id, n - 1), id).toBe(false);
    }
    for (const id of ['shadow.plant', 'shadow.foul', 'shadow.vault', 'shadow.read_intent']) expect(VERB(id), id).toBeUndefined();
  });
});

describe('Ingenuity: the forks (rules 1.74 item 6003)', () => {
  it('Light Fingers: Lift costs less; an unseen Lift gives Shadow, once a turn', () => {
    const lf = FORK('fork.shadow.light_fingers');
    const lift = (picks: string[]) => {
      const f = fightWith([door(4, { picks })], [{}, {}]); const [a, b] = f.foes; at(f, a, '2,4'); at(f, b, '1,5');
      f.unit(a.id).vision = 1; f.unit(b.id).vision = 1; f.unit(a.id).mags = [10, 10]; f.unit(b.id).mags = [10, 10];
      const u = f.turn(f.pc); at(f, u, '1,4'); hideNow(f, u); setShadow(f, u, 0);
      const ap0 = f.unit(u.id).ap; use(f, u, 'verb:shadow.lift', { targetId: a.id }); const cost = ap0 - f.unit(u.id).ap; const s1 = shadow(f, u);
      use(f, u, 'verb:shadow.lift', { targetId: b.id });
      return { cost, s1, s2: shadow(f, u) };
    };
    const plain = lift([]), fingers = lift(['fork.shadow.light_fingers']);
    expect(plain.cost).toBe(VERB('shadow.lift').effects[0].ap);
    expect(fingers.cost).toBe(Math.max(lf.effects[0].min, plain.cost + lf.effects[0].value));
    expect(plain.s1).toBe(0); expect(fingers.s1).toBe(lf.effects[1].value);
    expect(fingers.s2).toBe(fingers.s1); // once a turn
  });
  it('Lend the Dark: an ally no enemy sees becomes Hidden for its AP and Shadow, once a turn; an ally in sight is refused', () => {
    const g = FORK('fork.shadow.lend_the_dark').effects[0];
    const f = fightWith([door(4, { picks: ['fork.shadow.lend_the_dark'] }), {}, {}], [{}]); const e = at(f, f.foe, '14,9'); e.vision = 1;
    const [u, a, b] = f.pcs; at(f, a, '3,4'); at(f, b, '4,4'); f.turn(u); at(f, u, '1,4'); setShadow(f, u, 2);
    const ap0 = f.unit(u.id).ap;
    use(f, f.unit(u.id), 'verb:fork.shadow.lend_the_dark', { targetId: a.id });
    expect(f.unit(a.id).hidden).toBe(true); expect(f.unit(u.id).ap).toBe(ap0 - g.ap); expect(shadow(f, u)).toBe(2 - g.res.shadow);
    expect(() => use(f, f.unit(u.id), 'verb:fork.shadow.lend_the_dark', { targetId: b.id })).toThrow(); // once a turn
    const h = fightWith([door(4, { picks: ['fork.shadow.lend_the_dark'] }), {}], [{}]); const [v, c] = h.pcs; h.turn(v); at(h, v, '1,4'); at(h, c, '3,4'); at(h, h.foe, '5,4'); setShadow(h, v, 2);
    expect(() => use(h, h.unit(v.id), 'verb:fork.shadow.lend_the_dark', { targetId: c.id })).toThrow(/can see/);
  });
  it('Lightkiller: once a fight, for its AP and Shadow, you are Dimmed: foes must stand closer to see you (seen_range)', () => {
    const g = FORK('fork.shadow.lightkiller').effects[0], dim = (condJ as any).items.find((x: any) => x.id === 'dimmed');
    const f = fightWith([door(8, { picks: ['fork.shadow.lend_the_dark', 'fork.shadow.lightkiller'] })], [{}]);
    const u = f.turn(f.pc); setShadow(f, u, 3); const ap0 = f.unit(u.id).ap;
    // the foe's eyes, asked as the game asks them (unitSees with the looked-at unit): at the edge of 12 less Dimmed's
    f.cb.objects = []; at(f, u, '1,4'); const foe = f.unit(f.foe.id); foe.vision = 12; at(f, foe, (1 + 12 + dim.effects[0].value + 1) + ',4');
    const seen = () => unitSees(f.cb, f.unit(foe.id), f.unit(u.id).pos, undefined, f.unit(u.id));
    expect(seen()).toBe(true);
    use(f, u, 'verb:fork.shadow.lightkiller');
    expect(condOn(f.unit(u.id), 'dimmed')).toBe(true); expect(f.unit(u.id).conds!.dimmed).toBe(g.effects[0].rounds);
    expect(dim.effects[0].value).toBeLessThan(0); expect(seen()).toBe(false);
    expect(f.unit(u.id).ap).toBe(ap0 - g.ap); expect(shadow(f, u)).toBe(3 - g.res.shadow);
    expect(() => use(f, f.unit(u.id), 'verb:fork.shadow.lightkiller')).toThrow(); // once a fight
  });
});

describe('Acuity: the perks (rules 1.74 items 6004, 6005)', () => {
  const analyzeCost = (perks: any) => {
    const f = fightWith([{ skills: { analysis: 5 }, perks }], [{}, {}]); const [a, b] = f.foes; at(f, a, '4,4'); at(f, b, '4,6');
    const u = f.turn(f.pc); at(f, u, '1,4');
    const ap0 = f.unit(u.id).ap; f.act({ type: 'combat/analyze', unitId: u.id, targetId: a.id } as any); const first = ap0 - f.unit(u.id).ap;
    const ap1 = f.unit(u.id).ap; f.act({ type: 'combat/analyze', unitId: u.id, targetId: b.id } as any);
    return [first, ap1 - f.unit(u.id).ap];
  };
  it('Analyze is its data price for everyone (the points gate went); Quick Read I cuts it; II makes the first of a fight free', () => {
    const qr = PERK.quick_read as any;
    expect(analyzeCost({})).toEqual([ANALYZE_AP, ANALYZE_AP]);
    expect(analyzeCost({ quick_read: 'I' })).toEqual([ANALYZE_AP + qr.tiers.I.effects[0].value, ANALYZE_AP + qr.tiers.I.effects[0].value]);
    expect(analyzeCost({ quick_read: 'II' })).toEqual([qr.tiers.II.effects[1].set, ANALYZE_AP + qr.tiers.II.effects[0].value]);
  });
  it('Still Breath I: a foe rolling to spot you beside cover rolls lower by the row', () => {
    const sb = (PERK.still_breath as any).tiers.I.effects[0];
    const total = (perks: any) => {
      const f = fightWith([door(3, { skills: { analysis: 3 }, perks })], [{}], { seed: 'SB' }); const t = at(f, f.foe, '6,4');
      at(f, f.pc, '4,3'); hideNow(f, f.pc); // 4,3 is next to the crate at 5,3 (yard16)
      const n = f.cb.log.length; withGame(f.g, () => spotHidden(f.cb, f.g.rng, f.unit(t.id)));
      const line = f.cb.log.slice(n).find((l) => /looks for/.test(l)) || ''; const m = line.match(/= (−?-?\d+)/); return m ? Number(m[1].replace('−', '-')) : NaN;
    };
    const plain = total({}), still = total({ still_breath: 'I' });
    expect(Number.isFinite(plain)).toBe(true); expect(still).toBe(plain + sb.value);
  });
});

describe('Vigilance: Read Intent (rules 1.74 item 6009)', () => {
  it('II: a Spot on an enemy that cannot see you gives Shadow, once a turn; I gives none', () => {
    const ri = (PERK.read_intent as any).tiers.II.effects[3];
    const spot = (tier: string) => {
      const f = fightWith([{ skills: { vigilant: 10 }, perks: { read_intent: tier } }], [{}, {}]); const [a, b] = f.foes; at(f, a, '6,4').vision = 1; at(f, b, '6,6').vision = 1;
      const u = f.turn(f.pc); at(f, u, '1,4'); setShadow(f, u, 0);
      f.act({ type: 'combat/call', unitId: u.id, id: 'call.spot', targetId: a.id } as any); const s1 = shadow(f, u);
      f.act({ type: 'combat/call', unitId: u.id, id: 'call.spot', targetId: b.id } as any);
      return { s1, s2: shadow(f, u), read: condOn(f.unit(a.id), 'read') };
    };
    expect(spot('I')).toEqual({ s1: 0, s2: 0, read: true });
    expect(spot('II')).toEqual({ s1: ri.value, s2: ri.value, read: true });
  });
});

describe('old saves (rules 1.74 item 6010; rules 1.70 item 5538)', () => {
  it('Acuity 5 and Vigilance 5: the old passives are preselected perks, a Detective\'s Eye moves with its perk to Vigilance, one re-pick each', () => {
    const f = fightWith([{ skills: { analysis: 5, vigilant: 5 }, attrs: { perception: 5 }, perks: { detectives_eye: 'I' } }], [{}]);
    const g: any = JSON.parse(JSON.stringify(f.g)); g.combat = null;
    // a save from before the Perception tables: only these two skills' stamps go (the other lanes' tables, Reaction Speed's
    // among them, are not this test's)
    for (const c of Object.values(g.characters) as any[]) { delete c.perkRev.analysis; delete c.perkRev.vigilant; delete c.perkRepick; }
    const c: any = Object.values(migrateLoaded(g).characters)[0];
    expect(c.perkRepick.analysis).toEqual([{ id: 'quick_read', tier: 'I' }, { id: 'read_them', tier: 'I' }]);
    expect(c.perkRepick.vigilant).toEqual([{ id: 'detectives_eye', tier: 'I' }, { id: 'eyes_in_the_back', tier: 'I' }]);
    expect(pendingRepicks(c).map((x: any) => x.skill).sort()).toEqual(['analysis', 'vigilant']);
    expect((SKILL as any).analysis.perk_remap.passives).toEqual({ 3: 'quick_read', 5: 'read_them' });
  });
});

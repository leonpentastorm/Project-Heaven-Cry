// Classes 3.0, step 6, integration (rules 1.32 section 3, items 1970 to 1976): the seven verbs built once the main line
// gave a verb a tile to aim at (step 5's reach.tile): Decoy, Vault, Pick, Douse, Rig (shadow.json), Close Quarters and
// Shadow Run (Ingenuity's unlocks 3 and 7). Every number is read from data.
import { describe, it, expect } from 'vitest';
import './helpers/yard16';
import { fightWith, withGame, type CharSpec } from './helpers/perkfight';
import { SKILL, type Unit } from '../src';
import { resOf, spotHidden } from '../src/tactics';
import { applyCond } from '../src/magic';
import { objectsOf, displace } from '../src/combat';
import { makeObject } from '../src/objects';
import { allVerbs } from '../src/effects/collect';
import { perkActionsFor } from '../src/effects/actions';

const VERB = (id: string) => allVerbs().find((v: any) => v.id === id) as any;
const G = (id: string) => VERB(id).effects[0];
const UNLOCK: any = (SKILL.ingenuity as any).unlocks;
const door = (ing: number, extra: CharSpec = {}): CharSpec => ({ ...extra, skills: { ingenuity: ing, ...(extra.skills || {}) }, attrs: { perception: Math.max(ing, 3), ...(extra.attrs || {}) } });
type F = ReturnType<typeof fightWith>;
const at = (f: F, u: Unit, pos: string) => { f.unit(u.id).pos = pos; };
const hideNow = (f: F, u: Unit) => withGame(f.g, () => applyCond(f.cb, f.g.rng, null, f.unit(u.id), 'hidden', undefined, undefined, { skipSave: true }));
const setShadow = (f: F, u: Unit, n: number) => { (f.unit(u.id).res ||= {}).shadow = n; };
const foeAt = (f: F, pos: string, blind = false) => { const t = f.unit(f.foe.id); t.pos = pos; if (blind) t.vision = 1; return t; };
const use = (f: F, u: Unit, id: string, tile: string) => f.act({ type: 'combat/perk', unitId: u.id, id: 'verb:' + id, tile } as any);
const put = (f: F, kind: string, pos: string, extra: any = {}) => { objectsOf(f.cb).push(makeObject('t' + kind + pos, kind, pos, extra)); };
const setup = (ing: number, pos = '1,4', foePos = '14,5') => {
  const f = fightWith([door(ing)], [{}]); foeAt(f, foePos, true);
  const u = f.turn(f.pc); at(f, u, pos); hideNow(f, u); setShadow(f, u, 3); return { f, u: f.unit(f.pc.id) };
};

describe('the verbs aimed at a tile (reach.tile)', () => {
  it('each shows on the SHADOW tab at its Ingenuity, from data', () => {
    for (const id of ['shadow.decoy', 'shadow.vault', 'shadow.pick', 'shadow.douse', 'shadow.rig']) {
      const min = VERB(id).requires[0].min;
      const tabOf = (pts: number) => { const f = fightWith([door(pts)], [{}]); return withGame(f.g, () => perkActionsFor({ u: f.unit(f.pc.id), cb: f.cb, g: f.g }, 'combat').find((e) => e.itemId === id || e.id === 'verb:' + id)); };
      expect(tabOf(min)?.tab, id).toBe('shadow');
      expect(tabOf(min)?.target, id).toBe('tile');
      expect(tabOf(min - 1), id).toBeUndefined();
    }
  });
  it('Decoy: every enemy side now places you on the tile (its searchers go there); refused past its reach', () => {
    const { f, u } = setup(3);
    use(f, u, 'shadow.decoy', '3,4');
    expect(f.cb.lastSeen?.foe?.[u.id]).toBe('3,4');
    expect(resOf(f.unit(u.id), 'shadow')).toBe(3 - G('shadow.decoy').res.shadow);
    const far = '1,' + (4 + G('shadow.decoy').reach.tiles + 1);
    expect(() => use(f, u, 'shadow.decoy', far)).toThrow(/Out of range/);
  });
  it('Vault: across a tile of half cover to the free tile beyond; refused with nothing to cross', () => {
    const { f, u } = setup(5, '4,3'); // the crate at 5,3 (yard16 half cover)
    expect(() => use(f, u, 'shadow.vault', '4,5')).toThrow(/Nothing to cross/);
    const ap = f.unit(u.id).ap;
    use(f, u, 'shadow.vault', '6,3');
    expect(f.unit(u.id).pos).toBe('6,3');
    expect(f.unit(u.id).ap).toBe(ap - G('shadow.vault').ap);
  });
  it('Pick: a closed door next to you opens; picked again it shuts and locks; no door, refused', () => {
    const { f, u } = setup(5); put(f, 'door', '2,4');
    expect(() => use(f, u, 'shadow.pick', '1,5')).toThrow(/No door/);
    const door = (): any => objectsOf(f.cb).find((o) => o.pos === '2,4');
    use(f, u, 'shadow.pick', '2,4');
    expect(door().open).toBe(true);
    use(f, u, 'shadow.pick', '2,4');
    expect(door().open).toBe(false); expect(door().locked).toBe(true);
  });
  it('Douse: a lamp within reach goes out (its HP to 0); a lamp is what it needs', () => {
    const { f, u } = setup(5); put(f, 'lamp', '2,5');
    use(f, u, 'shadow.douse', '2,5');
    expect(objectsOf(f.cb).some((o) => o.pos === '2,5' && o.kind === 'lamp')).toBe(false);
    expect(() => use(f, u, 'shadow.douse', '2,4')).toThrow(/No lamp/);
  });
  it('Rig: a trap of your side next to you, its damage the amount block; one at a time; an enemy that steps on it is hurt', () => {
    const { f, u } = setup(7);
    use(f, u, 'shadow.rig', '2,4');
    const traps = () => objectsOf(f.cb).filter((o: any) => o.kind === 'trap' && o.owner === u.id) as any[];
    expect(traps().length).toBe(1);
    expect(traps()[0].side).toBe(u.side);
    expect(traps()[0].damage).toBeGreaterThanOrEqual(VERB('shadow.rig').amounts.rig.base);
    use(f, u, 'shadow.rig', '1,5');
    expect(traps().map((o) => o.pos)).toEqual(['1,5']); // the old one goes
    expect(() => use(f, u, 'shadow.rig', '1,5')).toThrow(/No room/); // a trap is there
    const t = f.unit(f.foe.id), hp = t.hp;
    withGame(f.g, () => displace(f.cb, f.g.rng, t, { tile: '1,5' }, { by: null, how: 'teleport', willing: true, source: 'test' }));
    expect(f.unit(f.foe.id).hp).toBeLessThan(hp);
  });
});

describe('the passives on Ingenuity\'s unlocks', () => {
  it('Close Quarters (Ingenuity 3): an enemy next to you rolls to spot you instead of finding you outright', () => {
    const cq = UNLOCK['3'].effects.find((e: any) => e.op === 'close_roll');
    expect(cq.value).toBeGreaterThan(0);
    let found3 = 0, found1 = 0;
    for (let i = 0; i < 40; i++) {
      for (const [ing, inc] of [[3, () => found3++], [1, () => found1++]] as const) {
        const f = fightWith([door(ing)], [{}], { seed: 'CQ' + i }); const t = foeAt(f, '2,4');
        at(f, f.pc, '1,4'); hideNow(f, f.pc);
        withGame(f.g, () => spotHidden(f.cb, f.g.rng, f.unit(t.id)));
        if (!f.unit(f.pc.id).hidden) inc();
      }
    }
    expect(found1).toBe(40); // without it: found outright, every time
    expect(found3).toBeLessThan(40); // with it: a roll, which sometimes fails
  });
  it('Shadow Run (Ingenuity 7): once a turn a Hidden move from cover to cover costs less, at least its floor', () => {
    const sr = UNLOCK['7'].effects.find((e: any) => e.op === 'cost_mod');
    const run = (ing: number) => {
      const f = fightWith([door(ing, { attrs: { agility: 1 } })], [{}]); foeAt(f, '15,10', true); // Agility 1: a tile an AP
      const u = f.turn(f.pc); at(f, u, '4,3'); hideNow(f, u); // 4,3 is next to the crate at 5,3; 4,5 next to 5,4: two tiles
      const ap0 = f.unit(u.id).ap; f.act({ type: 'combat/move', unitId: u.id, to: '4,5' } as any);
      const ap1 = f.unit(u.id).ap; f.unit(u.id).ap = ap0; f.act({ type: 'combat/move', unitId: u.id, to: '4,3' } as any);
      return [ap0 - ap1, ap0 - f.unit(u.id).ap];
    };
    const [plain] = run(5), [first, second] = run(7);
    expect(plain).toBeGreaterThan(sr.min);
    expect(first).toBe(Math.max(sr.min, plain + sr.value));
    expect(second).toBe(plain); // once a turn
  });
});

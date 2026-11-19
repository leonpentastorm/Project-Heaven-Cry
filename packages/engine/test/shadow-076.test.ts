// Rules 1.76 (Shadow): dark maps in Survival, Douse on a dark map, Prone's seen range through the one sight range, Stalk.
// Every number is read from data; every rule through the reducer (run/move into a fight, combat/prone, combat/hide,
// combat/perk, combat/end-turn).
import { describe, it, expect } from 'vitest';
import './helpers/yard16';
import { fightWith, withGame, type CharSpec } from './helpers/perkfight';
import { type GameState, apply, reachable, litAt, unitSees, actionsFor } from '../src';
import { survivalRoom, startRun, ownerOf } from './helpers/survival';
import { encounterMap } from '../src/run/encounter';
import { rngFor } from '../src/rng';
import { resOf, spotHidden } from '../src/tactics';
import { applyCond } from '../src/magic';
import { objectsOf } from '../src/combat';
import { makeObject } from '../src/objects';
import { allVerbs } from '../src/effects/collect';
import SV from '../../../data/survival.json';
import CONDS from '../../../data/conditions.json';

const SETTINGS: any[] = (SV as any).settings;
const PRONE_SEEN: number = ((CONDS as any).items.find((c: any) => c.id === 'prone').effects.find((e: any) => e.stat === 'seen_range')).value;
const VERB = (id: string) => allVerbs().find((v: any) => v.id === id) as any;

describe('dark maps (rules 1.76 item 6400)', () => {
  it('the data: shrine, works and rim are dark; ahoc, city and field are lit', () => {
    const dark = SETTINGS.filter((s) => s.layout.dark).map((s) => s.id).sort();
    expect(dark).toEqual(['rim', 'shrine', 'works']);
  });
  it('stage 1 (the AHOC base) is lit: a Survival fight entered by run/move is no dark map', () => {
    const seed = 'DARK-1';
    let g: GameState = startRun(survivalRoom(seed, [{ build: 'plain_gun', level: 1 }] as any, { test: true }), seed);
    const n: any = reachable(g.run!).find((x) => x.kind === 'fight');
    g = apply(g, { type: 'run/move', node: n.id } as any, ownerOf(0));
    expect(SETTINGS.find((x) => x.id === n.setting).layout.dark).toBeFalsy();
    expect(!!g.combat!.map.dark).toBe(false);
  });
  it('the fight map of every setting (encounterMap, the map maker of the run) is dark exactly when its layout says', () => {
    for (const st of SETTINGS) for (let s = 1; s <= 4; s++) {
      const m: any = encounterMap('n' + s, 5, [], rngFor('dark-' + s, st.id + '#map'), { setting: st.id, template: 'firing_line' });
      expect(!!m.dark, st.id).toBe(!!st.layout.dark);
    }
  });
});

const door = (ing: number, extra: CharSpec = {}): CharSpec => ({ ...extra, skills: { ingenuity: ing, ...(extra.skills || {}) }, attrs: { perception: Math.max(ing, 3), ...(extra.attrs || {}) } });
type F = ReturnType<typeof fightWith>;
const hideNow = (f: F, id: string) => withGame(f.g, () => applyCond(f.cb, f.g.rng, null, f.unit(id), 'hidden', undefined, undefined, { skipSave: true }));

describe('Douse on a dark map (rules 1.76 item 6401)', () => {
  it('the lamp goes out through the verb and its tiles go dark: an enemy that saw the tile now does not', () => {
    const f = fightWith([door(5)], [{}]);
    f.cb.objects = []; f.cb.map = { ...f.cb.map, dark: true }; // (a copy: the map def is shared)
    const foe = f.unit(f.foe.id); foe.pos = '10,5'; foe.vision = 12;
    objectsOf(f.cb).push(makeObject('tlamp', 'lamp', '3,5', {}));
    const u = f.turn(f.pc); f.unit(u.id).pos = '1,5'; hideNow(f, u.id);
    // 9 tiles off: lit, the foe's eyes reach it (12); dark, half (6) do not
    expect(litAt(f.cb, '1,5')).toBe(true);
    expect(unitSees(f.cb, f.unit(foe.id), '1,5', undefined, f.unit(u.id))).toBe(true);
    f.act({ type: 'combat/perk', unitId: u.id, id: 'verb:shadow.douse', tile: '3,5' } as any);
    expect(objectsOf(f.cb).some((o) => o.kind === 'lamp' && o.pos === '3,5')).toBe(false);
    expect(litAt(f.cb, '1,5')).toBe(false);
    expect(unitSees(f.cb, f.unit(foe.id), '1,5', undefined, f.unit(u.id))).toBe(false);
  });
  it('the verb names its object by a data word (widening it is one data change)', () => {
    const g = VERB('shadow.douse').effects[0];
    expect(g.reach.object).toBe(g.effects[0].has);
  });
});

describe('Prone lowers the range you are seen at (rules 1.76 items 6402, 6403)', () => {
  /** A PC on open ground `d` tiles from a soldier; drop Prone (or not), then Hide, both through the reducer. */
  function hideAt(d: number, prone: boolean) {
    const f = fightWith([{ name: 'Sneak' }], [{ tier: 'soldier', at: '14,5' }]);
    f.cb.objects = []; const foe = f.unit(f.foe.id); foe.pos = (2 + d) + ',5';
    const u = f.turn(f.pc); f.unit(u.id).pos = '2,5'; f.unit(u.id).ap = 6;
    if (prone) f.act({ type: 'combat/prone', unitId: u.id } as any);
    let err: string | null = null;
    try { f.act({ type: 'combat/hide', unitId: u.id } as any); } catch (e: any) { err = String(e?.message || e); }
    return { f, err, hidden: !!f.unit(u.id).hidden, prone: !!f.unit(u.id).prone };
  }
  it('the data: Prone carries seen_range, a negative number', () => { expect(PRONE_SEEN).toBeLessThan(0); });
  it('standing at the edge of the foe\'s eyes it is seen and cannot Hide; Prone there, it is out of reach and Hides', () => {
    const d = 12 + PRONE_SEEN + 1; // inside the foe's 12, outside 12 less Prone's
    const up = hideAt(d, false), down = hideAt(d, true);
    expect(up.hidden).toBe(false); expect(up.err).toBeTruthy();
    expect(down.prone).toBe(true); expect(down.err).toBeNull(); expect(down.hidden).toBe(true);
  });
  it('Prone within the lowered reach is still seen', () => {
    const r = hideAt(12 + PRONE_SEEN - 1, true);
    expect(r.prone).toBe(true); expect(r.hidden).toBe(false);
  });
  it('the foe\'s spot roll at the end of its turn reaches a Prone hider only within the lowered range (spotHidden)', () => {
    const d = 12 + PRONE_SEEN + 1;
    for (const prone of [false, true]) {
      const f = fightWith([{ name: 'Sneak' }], [{ tier: 'soldier', at: '14,5' }]);
      f.cb.objects = []; const foe = f.unit(f.foe.id); foe.pos = (2 + d) + ',5';
      const u = f.unit(f.pc.id); u.pos = '2,5'; u.prone = prone; hideNow(f, u.id); u.stealth = -40; // any roll finds it, if it is looked for
      withGame(f.g, () => spotHidden(f.cb, f.g.rng, f.unit(foe.id))); // as the end of the foe's turn does (tactics.ts)
      const looked = f.cb.log.some((l: string) => /looks for Sneak/.test(l));
      expect(looked, 'prone ' + prone).toBe(!prone);
    }
  });
});

describe('Stalk (rules 1.76 item 6405)', () => {
  const G = () => VERB('shadow.stalk').effects[0];
  it('from Hidden: its AP, +1 Shadow, once a turn; refused when seen', () => {
    const f = fightWith([door(VERB('shadow.stalk').requires[0].min)], [{}]);
    f.cb.objects = []; const foe = f.unit(f.foe.id); foe.pos = '14,5'; foe.vision = 1;
    const u = f.turn(f.pc); f.unit(u.id).pos = '1,5'; f.unit(u.id).ap = 6;
    expect(() => f.act({ type: 'combat/perk', unitId: u.id, id: 'verb:shadow.stalk' } as any)).toThrow(/Hidden/);
    hideNow(f, u.id); (f.unit(u.id).res ||= {}).shadow = 0;
    const ap = f.unit(u.id).ap;
    f.act({ type: 'combat/perk', unitId: u.id, id: 'verb:shadow.stalk' } as any);
    expect(f.unit(u.id).ap).toBe(ap - G().ap);
    expect(resOf(f.unit(u.id), 'shadow')).toBe(G().effects[0].value);
    expect(() => f.act({ type: 'combat/perk', unitId: u.id, id: 'verb:shadow.stalk' } as any)).toThrow();
  });
});

describe('the shadow sightline (rules 1.76 item 6404): Hide\'s row carries who would see you on each tile', () => {
  const watchOf = (f: F, id: string): Record<string, string[]> => (actionsFor(f.g, id, null).find((d: any) => d.id === 'hide') as any)?.watch || {};
  function two() {
    const f = fightWith([{ name: 'Sneak' }], [{ tier: 'soldier', at: '14,2' }, { tier: 'soldier', at: '14,8' }]);
    f.cb.objects = []; const [a, b] = f.foes; f.unit(a.id).pos = '12,2'; f.unit(b.id).pos = '12,8';
    const u = f.turn(f.pc); f.unit(u.id).pos = '2,5'; f.unit(u.id).ap = 6;
    return { f, u: f.unit(u.id), a: f.unit(a.id), b: f.unit(b.id) };
  }
  it('each listed tile names exactly the enemies whose eyes reach you there (Hide\'s own test); your own tile names who sees you now', () => {
    const { f, u, a, b } = two(), w = watchOf(f, u.id);
    expect(Object.keys(w).length).toBeGreaterThan(0);
    for (let y = 0; y < f.cb.map.h; y++) for (let x = 0; x < f.cb.map.w; x++) {
      const k = x + ',' + y, want = [a, b].filter((v) => unitSees(f.cb, v, k, undefined, u)).map((v) => v.id);
      expect(w[k] || [], k).toEqual(want);
    }
    const hide: any = actionsFor(f.g, u.id, null).find((d: any) => d.id === 'hide');
    expect(w[u.pos] || []).toEqual(hide.eyes);
  });
  it('on a dark map a foe's watched tiles shrink (the one sight range)', () => {
    const { f, u, a } = two();
    const lit = Object.keys(watchOf(f, u.id)).filter((k) => (watchOf(f, u.id)[k] || []).includes(a.id)).length;
    f.cb.map = { ...f.cb.map, dark: true };
    const dark = Object.keys(watchOf(f, u.id)).filter((k) => (watchOf(f, u.id)[k] || []).includes(a.id)).length;
    expect(dark).toBeLessThan(lit);
  });
  it('Prone (combat/prone) shrinks every foe\'s watched tiles for you', () => {
    const { f, u } = two();
    const before = Object.keys(watchOf(f, u.id)).length;
    f.act({ type: 'combat/prone', unitId: u.id } as any);
    expect(Object.keys(watchOf(f, u.id)).length).toBeLessThan(before);
  });
  it('an enemy the side does not see is never in it (the fog: a Hidden foe)', () => {
    const { f, u, b } = two();
    withGame(f.g, () => applyCond(f.cb, f.g.rng, null, f.unit(b.id), 'hidden', undefined, undefined, { skipSave: true }));
    for (const ids of Object.values(watchOf(f, u.id))) expect(ids).not.toContain(b.id);
  });
});

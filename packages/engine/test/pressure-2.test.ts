// Pressure 2.0 (rules 1.56, "Pressure 2.0 (the Skirmisher)"; docs/design/proposals/2026-11-pressure-2.0.md): the
// Skirmisher's Gain (Fire and Move, Relocated, Break Them) and Dexterity's door (Slide, Near Miss, Shaken Nerves, Flush
// Out). Every rule goes through the reducer (a real action); every number is read from data.
import { describe, it, expect } from 'vitest';
import './helpers/yard16';
import { fightWith, withGame, type CharSpec } from './helpers/perkfight';
import { CLASS, SKILL, condOn, itemInfo, moveUnit, type Unit } from '../src';
import { pressureOf } from '../src/physical/pressure';
import { physView } from '../src/physical/core';
import { onHook } from '../src/effects/hooks';
import { PHYS_RULES } from '../src/physical/data';

type F = ReturnType<typeof fightWith>;
const gain = (id: string): any => (CLASS.marksman as any).gain.find((m: any) => m.id === id);
const door: any = () => (SKILL as any).dexterity.unlocks['1'];
const slide: any = () => itemInfo('verb:pressure.slide')!.effects[0];
const sk = (extra: CharSpec = {}): CharSpec => ({ weapon: 'hellraiser_service_rifle', ...extra, classId: 'marksman', level: 3, attrs: { agility: 3, ...(extra.attrs || {}) } });
const gunner = (extra: CharSpec = {}): CharSpec => ({ weapon: 'hellraiser_service_rifle', ...extra, classId: 'fighter', level: 3, attrs: { strength: 3, ...(extra.attrs || {}) } });
const at = (f: F, u: Unit, pos: string) => { f.unit(u.id).pos = pos; };
const count = (f: F, re: RegExp, from = 0) => f.cb.log.slice(from).filter((l) => re.test(l)).length;
const big = (f: F, u: Unit) => { const x = f.unit(u.id); x.hp = x.maxHp = 9999; };
function setUp(spec: CharSpec, foePos = '9,4') {
  const f = fightWith([spec], [{ weapon: 'combat_knife' }]);
  const u = f.turn(f.pc); at(f, u, '4,4'); at(f, f.foe, foePos); big(f, u); big(f, f.foe);
  // Rout and Flush known and readied (the character's own list, as the camp's Ready screen sets it)
  const c: any = f.g.characters[(f.unit(u.id) as any).charId]; c.phys = { known: ['rout', 'flush'], ready: { melee: [], ranged: ['rout', 'flush'] }, drill: {}, picked: {}, quiver: {}, rev: 0 };
  return { f, u };
}
const cool = (f: F, u: Unit) => { const x: any = f.unit(u.id); x.heat = 0; x.ap = 6; };
const shoot = (f: F, u: Unit, mode = 'shot') => f.act({ unitId: u.id, type: 'combat/attack', targetId: f.foe.id, mode } as any);

describe('Fire and Move (Skirmisher Gain)', () => {
  it('after a ranged attack, a move of path_tiles_at_most tiles costs no AP, once a turn; a gunner of another class pays', () => {
    const fm = gain('fire_and_move'), n = fm.effects[1].if.path_tiles_at_most;
    for (const [spec, free] of [[sk(), true], [gunner(), false]] as const) {
      const { f, u } = setUp(spec); f.unit(u.id).attack = 60;
      shoot(f, u); const ap = f.unit(u.id).ap;
      f.act({ unitId: u.id, type: 'combat/move', to: '4,' + (4 - n) } as any);
      expect(f.unit(u.id).ap === ap).toBe(free);
      if (free) { // once a turn
        shoot(f, u); const ap2 = f.unit(u.id).ap;
        f.act({ unitId: u.id, type: 'combat/move', to: '4,' + (4 - 2 * n) } as any);
        expect(f.unit(u.id).ap).toBeLessThan(ap2);
      }
    }
  });
  it('without a shot first the step is paid; a longer move is paid', () => {
    const { f, u } = setUp(sk()), ap = f.unit(u.id).ap;
    f.act({ unitId: u.id, type: 'combat/move', to: '4,3' } as any);
    expect(f.unit(u.id).ap).toBeLessThan(ap);
    const g = setUp(sk()); shoot(g.f, g.u); const ap2 = g.f.unit(g.u.id).ap;
    g.f.act({ unitId: g.u.id, type: 'combat/move', to: '4,1' } as any);
    expect(g.f.unit(g.u.id).ap).toBeLessThan(ap2);
  });
  it('the free step draws no opportunity attack (Slipping), and it is not Run and Gun (a rank I Skirmisher has no Run and Gun)', () => {
    const { f, u } = setUp(sk(), '5,4'); f.unit(f.foe.id).attack = 60;
    expect(itemInfo('class:marksman.run_and_gun')).toBeTruthy();
    shoot(f, u); const L = f.cb.log.length;
    f.act({ unitId: u.id, type: 'combat/move', to: '3,4' } as any);
    expect(count(f, /opportunity attack/, L)).toBe(0);
    expect(condOn(f.unit(u.id), 'slipping')).toBe(false);
  });
});

describe('Relocated (Skirmisher Gain)', () => {
  it('the first ranged attack after a move on your turn has the relocated term (+effects.1.value), the next one not', () => {
    const r = gain('relocated'), { f, u } = setUp(sk()), terms: number[] = [];
    onHook('attack_roll', (ctx: any) => { if (ctx.att?.id === u.id) terms.push(ctx.toHit); });
    f.unit(u.id).attack = 0;
    shoot(f, u); cool(f, u);
    f.act({ unitId: u.id, type: 'combat/move', to: '4,3' } as any); cool(f, u);
    shoot(f, u); cool(f, u);
    shoot(f, u);
    expect(terms.length).toBe(3);
    // the shot after the move is closer by one tile (range terms may move it); compare the third (same tile, no flag)
    expect(terms[1] - terms[2]).toBe(r.effects[1].value);
  });
  it('a hit after a move adds effects.2.value more Pressure than one without', () => {
    const r = gain('relocated');
    const added = (moved: boolean) => {
      const { f, u } = setUp(sk()); f.unit(u.id).attack = 60;
      if (moved) { f.act({ unitId: u.id, type: 'combat/move', to: '4,3' } as any); f.unit(u.id).ap = 6; at(f, f.unit(u.id), '4,4'); }
      const p0 = pressureOf(f.unit(f.foe.id)); shoot(f, u);
      return pressureOf(f.unit(f.foe.id)) - p0;
    };
    expect(added(true) - added(false)).toBe(r.effects[2].value);
  });
});

describe('Break Them (Skirmisher Gain): Rout costs less', () => {
  it('a Skirmisher\'s Rout on a Pressed foe costs effects.0.value less AP than a Breaker\'s', () => {
    const bt = gain('break_them');
    const cost = (spec: CharSpec) => {
      const { f, u } = setUp(spec); (f.unit(f.foe.id) as any).pressure = PHYS_RULES.pressure.pressed;
      const ap = f.unit(u.id).ap;
      f.act({ unitId: u.id, type: 'combat/technique', id: 'rout', targetId: f.foe.id } as any);
      return ap - f.unit(u.id).ap;
    };
    // a rank I Skirmisher also has Fire Discipline (a 3 AP technique, once a turn, effects.1.value): both cuts, to the floor
    const fd = itemInfo('class:marksman.fire_discipline')!.effects[1];
    const a = cost(sk()), b = cost(gunner());
    expect(b).toBeGreaterThan(0);
    expect(a).toBe(Math.max(bt.effects[0].min, b + bt.effects[0].value + fd.value));
  });
});

describe('Dexterity\'s door (skills.json dexterity.unlocks.1)', () => {
  it('Slide: 1 action a turn, sheds the slider\'s own Pressure, even with no cover in reach', () => {
    const g = slide(), { f, u } = setUp(sk()); (f.unit(u.id) as any).pressure = 2;
    const ap = f.unit(u.id).ap;
    f.act({ unitId: u.id, type: 'combat/perk', id: 'verb:pressure.slide' } as any);
    expect(ap - f.unit(u.id).ap).toBe(g.ap);
    expect(pressureOf(f.unit(u.id))).toBe(2 + g.effects[2].value);
    expect(() => f.act({ unitId: u.id, type: 'combat/perk', id: 'verb:pressure.slide' } as any)).toThrow(); // once a turn
  });
  it('Near Miss (Dexterity 3): a held shot that misses still adds value Pressure, once a turn for each target; below 3 none; a plain shot misses with none', () => {
    const d = door(), need = d.effects[0].if.self_skill.dexterity;
    const held = (dex: number) => {
      const { f, u } = setUp(sk({ skills: { dexterity: dex } }), '10,4'); f.unit(u.id).attack = -60;
      f.act({ unitId: u.id, type: 'combat/technique', id: 'overwatch' } as any);
      const L = f.cb.log.length; f.turn(f.foe); f.unit(f.foe.id).ap = 6;
      withGame(f.g, () => moveUnit(f.cb, f.unit(f.foe.id), '9,4', f.g.rng));
      return { fired: count(f, /overwatch/i, L), p: pressureOf(f.unit(f.foe.id)), lines: count(f, /near miss/, L) };
    };
    const a = held(need), b = held(need - 1);
    expect(a.fired).toBeGreaterThan(0);
    // the fixed seed's held round goes wide (a natural 20 would hit: the near-miss line is the rule)
    expect(a.lines).toBe(1); expect(b.lines).toBe(0); expect(a.p - b.p).toBe(d.effects[0].value);
    const { f, u } = setUp(sk({ skills: { dexterity: need } })); f.unit(u.id).attack = -60; const L = f.cb.log.length;
    shoot(f, u); expect(count(f, /near miss/, L)).toBe(0);
  });
  it('Shaken Nerves (Dexterity 3): a real Rout\'s save TN rises by the pips, at most value.max', () => {
    const d = door(), sn = d.effects[1].value;
    const tn = (dex: number, pips: number) => {
      const { f, u } = setUp(sk({ skills: { dexterity: dex } })); (f.unit(f.foe.id) as any).pressure = pips;
      let seen = 0; onHook('save', (ctx: any) => { if (ctx.by?.id === u.id) seen = ctx.tnAdd || 0; });
      f.act({ unitId: u.id, type: 'combat/technique', id: 'rout', targetId: f.foe.id } as any);
      return seen;
    };
    expect(tn(3, 2) - tn(2, 2)).toBe(Math.min(sn.max, 2 * sn.per[0].value));
    expect(tn(3, 4) - tn(2, 4)).toBe(sn.max);
  });
  it('Flush Out (Dexterity 5): a Flush makes its target save or be Afraid (fear) of the shooter; then on its turn it does not close in or attack', () => {
    const d = door(), need = d.effects[2].if.self_skill.dexterity;
    const { f, u } = setUp(sk({ skills: { dexterity: need } }), '6,4');
    f.unit(f.foe.id).ap = 6; (f.unit(f.foe.id) as any).saves = undefined;
    let feared = false;
    for (let i = 0; i < 8 && !feared; i++) { // a save can pass: Flush again until it fails (the dice are the fight's)
      f.unit(u.id).ap = 6;
      f.act({ unitId: u.id, type: 'combat/technique', id: 'flush', targetId: f.foe.id } as any);
      feared = condOn(f.unit(f.foe.id), 'fear');
    }
    expect(feared).toBe(true);
    const hp = f.unit(u.id).hp, was = f.unit(f.foe.id).pos;
    f.act({ unitId: u.id, type: 'combat/end-turn' } as any);
    // the foe's turn ran (enemy AI): no hit on the Skirmisher, and it is no closer
    const dd = (a: string, b: string) => { const [ax, ay] = a.split(',').map(Number), [bx, by] = b.split(',').map(Number); return Math.max(Math.abs(ax - bx), Math.abs(ay - by)); };
    expect(f.unit(u.id).hp).toBe(hp);
    expect(dd(f.unit(f.foe.id).pos, f.unit(u.id).pos)).toBeGreaterThanOrEqual(dd(was, '4,4'));
  });
  it('below Dexterity 5 a Flush gives no fear', () => {
    const d = door(), need = d.effects[2].if.self_skill.dexterity;
    const { f, u } = setUp(sk({ skills: { dexterity: need - 1 } }), '6,4');
    for (let i = 0; i < 4; i++) { f.unit(u.id).ap = 6; f.act({ unitId: u.id, type: 'combat/technique', id: 'flush', targetId: f.foe.id } as any); }
    expect(condOn(f.unit(f.foe.id), 'fear')).toBe(false);
  });
});

describe('the states are data (rules.pressure.states)', () => {
  it('the view\'s word, line and cost come from the state rows; the hint is Dexterity\'s door_line', () => {
    const { f } = setUp(sk());
    for (const s of ['pressed', 'suppressed', 'broken']) {
      (f.unit(f.foe.id) as any).pressure = PHYS_RULES.pressure[s];
      const v: any = withGame(f.g, () => physView(f.cb, f.unit(f.foe.id), 'pc', f.g));
      expect(v.pressure.word).toBe(PHYS_RULES.pressure.states[s].word);
      expect(v.pressure.says).toBe(PHYS_RULES.pressure.states[s].says);
      expect(v.pressure.cost).toBe(PHYS_RULES.pressure.states[s].text);
      expect(v.pressure.cost).not.toMatch(/\{=/);
      expect(v.pressure.hint).toBe((SKILL as any).dexterity.door_line);
    }
  });
});

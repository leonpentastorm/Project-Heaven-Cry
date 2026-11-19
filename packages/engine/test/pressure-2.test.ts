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
  // rules 1.73 items 5855, 5856, 5843: Near Miss is Hold the Lane's row, Shaken Nerves Break Them's (the Skirmisher's), and the
  // Flush rider and its blade twin are one verb, Flush Out (pressure.json, Dexterity 5)
  it('Near Miss (Hold the Lane, the Skirmisher): a held shot that misses still adds value Pressure; another class\'s none; a plain shot misses with none', () => {
    const nm = (CLASS.marksman as any).ranks.I.moves.find((m: any) => m.id === 'speed_loader').effects.find((e: any) => e.label === 'Hold the Lane');
    const held = (spec: CharSpec) => {
      const { f, u } = setUp(spec, '10,4'); f.unit(u.id).attack = -60;
      f.act({ unitId: u.id, type: 'combat/technique', id: 'overwatch' } as any);
      const L = f.cb.log.length; f.turn(f.foe); f.unit(f.foe.id).ap = 6;
      withGame(f.g, () => moveUnit(f.cb, f.unit(f.foe.id), '9,4', f.g.rng));
      return { fired: count(f, /overwatch/i, L), p: pressureOf(f.unit(f.foe.id)), lines: count(f, /near miss/, L) };
    };
    const a = held(sk({ skills: { dexterity: 6 } })), b = held(gunner({ skills: { dexterity: 6 } }));
    expect(a.fired).toBeGreaterThan(0);
    expect(a.lines).toBe(1); expect(b.lines).toBe(0); expect(a.p - b.p).toBe(nm.value);
    const { f, u } = setUp(sk({ skills: { dexterity: 6 } })); f.unit(u.id).attack = -60; const L = f.cb.log.length;
    shoot(f, u); expect(count(f, /near miss/, L)).toBe(0);
  });
  it('Shaken Nerves (Break Them, the Skirmisher): a real Rout\'s save TN rises by the pips, at most value.max; another class\'s does not', () => {
    const sn = gain('break_them').effects.find((e: any) => e.label === 'Break Them').value;
    const tn = (spec: CharSpec, pips: number) => {
      const { f, u } = setUp(spec); (f.unit(f.foe.id) as any).pressure = pips;
      let seen = 0; onHook('save', (ctx: any) => { if (ctx.by?.id === u.id) seen = ctx.tnAdd || 0; });
      f.act({ unitId: u.id, type: 'combat/technique', id: 'rout', targetId: f.foe.id } as any);
      return seen;
    };
    expect(tn(sk({ skills: { dexterity: 3 } }), 2) - tn(gunner({ skills: { dexterity: 3 } }), 2)).toBe(Math.min(sn.max, 2 * sn.per[0].value));
    expect(tn(sk({ skills: { dexterity: 3 } }), 4) - tn(gunner({ skills: { dexterity: 3 } }), 4)).toBe(sn.max);
  });
  it('Flush Out (Dexterity 5, a verb): a Pressed foe saves or is Afraid of the shooter, loses the Take\'s Pressure; then on its turn it does not close in or attack', () => {
    const fo = itemInfo('verb:pressure.flush_out')!.effects[0];
    const { f, u } = setUp(sk({ skills: { dexterity: 5 } }), '6,4');
    f.unit(f.foe.id).ap = 6; (f.unit(f.foe.id) as any).sv = { body: 0, brain: 0, heart: -50 }; (f.unit(f.foe.id) as any).pressure = fo.reach.if.target_res.pressure.at_least;
    const ap = f.unit(u.id).ap;
    f.act({ unitId: u.id, type: 'combat/perk', id: 'verb:pressure.flush_out', targetId: f.foe.id } as any);
    expect(ap - f.unit(u.id).ap).toBe(fo.ap); expect(condOn(f.unit(f.foe.id), 'fear')).toBe(true);
    expect(pressureOf(f.unit(f.foe.id))).toBeLessThan(fo.reach.if.target_res.pressure.at_least);
    const hp = f.unit(u.id).hp, was = f.unit(f.foe.id).pos;
    f.act({ unitId: u.id, type: 'combat/end-turn' } as any);
    const dd = (a: string, b: string) => { const [ax, ay] = a.split(',').map(Number), [bx, by] = b.split(',').map(Number); return Math.max(Math.abs(ax - bx), Math.abs(ay - by)); };
    expect(f.unit(u.id).hp).toBe(hp);
    expect(dd(f.unit(f.foe.id).pos, f.unit(u.id).pos)).toBeGreaterThanOrEqual(dd(was, '4,4'));
  });
  it('Flush Out is refused below Dexterity 5, on a foe not Pressed enough, and on an Elite; the Flush technique alone gives no fear', () => {
    const fo = itemInfo('verb:pressure.flush_out')!.effects[0], need = fo.reach.if.target_res.pressure.at_least;
    const low = setUp(sk({ skills: { dexterity: 4 } }), '6,4'); (low.f.unit(low.f.foe.id) as any).pressure = need;
    expect(() => low.f.act({ unitId: low.u.id, type: 'combat/perk', id: 'verb:pressure.flush_out', targetId: low.f.foe.id } as any)).toThrow();
    for (let i = 0; i < 4; i++) { low.f.unit(low.u.id).ap = 6; low.f.act({ unitId: low.u.id, type: 'combat/technique', id: 'flush', targetId: low.f.foe.id } as any); }
    expect(condOn(low.f.unit(low.f.foe.id), 'fear')).toBe(false);
    const calm = setUp(sk({ skills: { dexterity: 5 } }), '6,4'); (calm.f.unit(calm.f.foe.id) as any).pressure = need - 1;
    expect(() => calm.f.act({ unitId: calm.u.id, type: 'combat/perk', id: 'verb:pressure.flush_out', targetId: calm.f.foe.id } as any)).toThrow();
    const f = fightWith([sk({ skills: { dexterity: 5 } })], [{ weapon: 'combat_knife', tier: 'elite' }]); const u = f.turn(f.pc); at(f, u, '4,4'); at(f, f.foe, '6,4'); (f.unit(f.foe.id) as any).pressure = need;
    expect(() => f.act({ unitId: u.id, type: 'combat/perk', id: 'verb:pressure.flush_out', targetId: f.foe.id } as any)).toThrow();
  });
});

describe('the states are data (rules.pressure.states)', () => {
  it('the view\'s word, line and cost come from the state rows; the door is named in data (rules.pressure.door), its line is the client\'s (doorView)', () => {
    const { f } = setUp(sk());
    for (const s of ['pressed', 'suppressed', 'broken']) {
      (f.unit(f.foe.id) as any).pressure = PHYS_RULES.pressure[s];
      const v: any = withGame(f.g, () => physView(f.cb, f.unit(f.foe.id), 'pc', f.g));
      expect(v.pressure.word).toBe(PHYS_RULES.pressure.states[s].word);
      expect(v.pressure.says).toBe(PHYS_RULES.pressure.states[s].says);
      expect(v.pressure.cost).toBe(PHYS_RULES.pressure.states[s].text);
      expect(v.pressure.cost).not.toMatch(/\{=/);
      expect((SKILL as any)[PHYS_RULES.pressure.door].door_line).toBeTruthy();
      expect(v.pressure.hint).toBeUndefined(); // the door line is the client's (apps/web doorView.ts), not the engine's
    }
  });
});

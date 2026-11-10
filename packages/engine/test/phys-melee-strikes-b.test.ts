// Physical 2.0 (rules 1.12), melee Strikes, second half: Hamstring (11), Bind (12), Half-Sword (13), Throw (14).
import { describe, it, expect, beforeEach } from 'vitest';
import { phys, resolveAttack } from '../src';
import { pileAt } from '../src/containers';
import * as SB from '../src/physical/melee/strikes-b';
import { physFight, rig } from './helpers/physfight';
import { d20 } from '../src/rng';

const MINE = ['hamstring', 'bind', 'half_sword', 'throw'];
beforeEach(() => rig(null));

type F = ReturnType<typeof physFight>;
/** A save this unit always fails (but a natural 20) or always makes (but a natural 1). */
// An rng state whose next eight d20s are neither a 1 nor a 20, so a save of ±99 always goes the way the test wants.
const CALM = (() => { for (let s = 1; ; s++) { const r = { state: s }; if (Array.from({ length: 8 }, () => d20(r)).every((n) => n > 1 && n < 20)) return s; } })();
const calm = (f: F) => { f.g.rng.state = CALM; };
const saves = (f: F, u: { id: string }, n: number) => { f.unit(u.id).sv = { body: n, brain: n, heart: n } as any; calm(f); };
const weak = (f: F, u: { id: string }) => saves(f, u, -99);
const strong = (f: F, u: { id: string }) => saves(f, u, 99);
const fight = (weapon: string, o: { skills?: Record<string, number>; foes?: { at: string; tier?: string; weapon?: string }[]; two?: boolean; off?: string } = {}) => {
  const pc = { weapon, known: MINE, skills: { athletics: 6, raw_power: 4, ...(o.skills || {}) }, ...(o.off ? { off: o.off } : {}) };
  const f = physFight(o.two ? [pc, { weapon: 'sabre' }] : [pc], o.foes || [{ at: 'D5', tier: 'elite', weapon: 'service_pistol' }]);
  f.put(f.pc, 'C5'); if (o.two) f.put(f.pcs[1], 'D6');
  (o.foes || [{ at: 'D5' }]).forEach((x, i) => f.put(f.foes[i], x.at));
  f.turn(f.pc); return f;
};
const cutDmg = (f: F, id = f.foe.id) => f.pv('cut', { targetId: id }).attacks[0].pv.dmg!;
const hasMult = (pv: phys.TechPreview, v: number) => pv.attacks[0].pv.dmg!.mults.some((m) => Math.abs(m.v - v) < 1e-9);
const hpLost = (pv: phys.TechPreview) => { const d = pv.attacks[0].pv.dmg!; return Math.max(1, Math.floor(d.total) - d.armour); };

describe('the slice is built', () => {
  it('every one of the four has a handler, and the pad shows none as not built', () => {
    for (const id of MINE) expect(phys.handlerOf(id), id).toBeTruthy();
    const f = fight('sabre');
    for (const e of f.pad().flatMap((g) => g.entries).filter((e) => MINE.includes(e.id))) expect(e.built, e.id).toBe(true);
  });
  it('a preview changes nothing, for each of them', () => {
    for (const w of ['sabre', 'war_axe', 'fists', 'combat_knife', 'maul', 'kemizuchi_duelling_blade']) {
      const f = fight(w); const before = JSON.stringify(f.g);
      for (const id of MINE) f.pv(id, { targetId: f.foe.id });
      expect(JSON.stringify(f.g), w).toBe(before);
    }
  });
});

describe('Hamstring', () => {
  it('base: a strike at ×0.7, then a Body save or Slowed 2 rounds', () => {
    const f = fight('maul'); weak(f, f.foe);
    const pv = f.pv('hamstring', { targetId: f.foe.id });
    expect(pv.ok).toBe(true); expect(pv.ap).toBe(3); expect(hasMult(pv, 0.7)).toBe(true);
    expect(pv.attacks[0].pv.dmg!.total).toBeCloseTo(cutDmg(f).total * 0.7, 5);
    expect(pv.saves).toEqual([{ unit: f.foe.id, skills: ['body'], tn: 12 }]);
    expect(pv.notes.some((n) => /slowed 2 rounds/.test(n))).toBe(true);
    rig({ hit: true, die: 12 }); const hp = f.foe.hp;
    expect(f.tech('hamstring', { targetId: f.foe.id })).toBeNull();
    expect(hp - f.foe.hp).toBe(hpLost(pv)); // the preview's damage is what the action did
    expect(f.foe.conds?.slowed).toBe(2); expect(f.pc.ap).toBe(3);
    const g = fight('maul'); strong(g, g.foe); rig({ hit: true, die: 12 });
    g.tech('hamstring', { targetId: g.foe.id }); expect(g.foe.conds?.slowed || 0).toBe(0);
    const m = fight('maul'); weak(m, m.foe); rig({ hit: false, die: 3 });
    m.tech('hamstring', { targetId: m.foe.id }); expect(m.foe.conds?.slowed || 0).toBe(0); // a miss: no rider
  });
  it('Edge: no save', () => {
    const f = fight('sabre'); strong(f, f.foe);
    const pv = f.pv('hamstring', { targetId: f.foe.id }); expect(pv.saves || []).toEqual([]); expect(pv.ap).toBe(2);
    rig({ hit: true, die: 12 }); f.tech('hamstring', { targetId: f.foe.id }); expect(f.foe.conds?.slowed).toBe(2);
  });
  it('Hook: Prone instead of Slowed (the Body save stands); the player picks Hook or Edge on a war axe', () => {
    const f = fight('war_axe'); weak(f, f.foe);
    const pad = f.pad().flatMap((g) => g.entries).find((e) => e.id === 'hamstring')!; expect(pad.choices?.map((c) => c.prop).sort()).toEqual(['edge', 'hook']);
    const pv = f.pv('hamstring', { targetId: f.foe.id, line: 'hook' }); expect(pv.saves?.[0].skills).toEqual(['body']);
    expect(pv.notes.some((n) => /prone/.test(n))).toBe(true);
    rig({ hit: true, die: 12 }); f.tech('hamstring', { targetId: f.foe.id, line: 'hook' });
    expect(f.foe.prone).toBe(true); expect(f.foe.conds?.slowed || 0).toBe(0);
    const g = fight('war_axe'); strong(g, g.foe); rig({ hit: true, die: 12 });
    g.tech('hamstring', { targetId: g.foe.id, line: 'edge' }); expect(g.foe.conds?.slowed).toBe(2); expect(g.foe.prone).toBeFalsy();
    const s = fight('war_axe'); strong(s, s.foe); rig({ hit: true, die: 12 });
    s.tech('hamstring', { targetId: s.foe.id, line: 'hook' }); expect(s.foe.prone).toBeFalsy(); // it saved
  });
  it('Point: no Sprint or Disengage while Slowed; without Point, Sprint still works', () => {
    const f = fight('kemizuchi_duelling_blade'); weak(f, f.foe);
    expect(f.pv('hamstring', { targetId: f.foe.id }).notes.some((n) => /can't Sprint or Disengage/.test(n))).toBe(true);
    rig({ hit: true, die: 12 }); f.tech('hamstring', { targetId: f.foe.id }); expect(f.foe.conds?.slowed).toBe(2);
    f.turn(f.foe); const pos = f.foe.pos;
    expect(f.walk(f.foe, 'E5', 'sprint')).toMatch(/AP/); expect(f.walk(f.foe, 'E5', 'disengage')).toMatch(/AP/);
    expect(f.unit(f.foe.id).pos).toBe(pos);
    expect(f.walk(f.foe, 'E5')).toBeNull(); // an ordinary walk is fine
    const g = fight('ork_machete'); rig({ hit: true, die: 12 }); g.tech('hamstring', { targetId: g.foe.id }); expect(g.foe.conds?.slowed).toBe(2);
    g.turn(g.foe); expect(g.walk(g.foe, 'E5', 'sprint')).toBeNull();
  });
  it('refusals: no target, out of reach; nothing is spent', () => {
    const f = fight('sabre', { foes: [{ at: 'H5' }] });
    expect(f.tech('hamstring')).toMatch(/Pick a target/);
    expect(f.tech('hamstring', { targetId: f.foe.id })).toMatch(/reach/);
    expect(f.pc.ap).toBe(6);
  });
  it('Momentum: +1 a hit, +1 more after a different technique, none extra for a repeat', () => {
    const f = fight('sabre'); rig({ hit: true, die: 12 });
    const pv = f.pv('hamstring', { targetId: f.foe.id }); expect(pv.momentum).toEqual({ now: 0, after: 1 });
    f.tech('hamstring', { targetId: f.foe.id }); expect(f.momentum(f.pc)).toBe(1);
    f.tech('hamstring', { targetId: f.foe.id }); expect(f.momentum(f.pc)).toBe(2);   // a repeat: +1 only
    f.unit(f.pc.id).ap = 6; f.tech('cut', { targetId: f.foe.id }); f.momentum(f.pc, 0);
    const pv2 = f.pv('hamstring', { targetId: f.foe.id }); expect(pv2.momentum).toEqual({ now: 0, after: 2 });
    f.tech('hamstring', { targetId: f.foe.id }); expect(f.momentum(f.pc)).toBe(2);   // after Cut: +2
  });
  it('a melee stop ignores Stopped once (the core keeps it for ranged techniques)', () => {
    const f = fight('war_axe'); weak(f, f.foe); f.unit(f.foe.id).stopped = 1;
    rig({ hit: true, die: 12 }); f.tech('hamstring', { targetId: f.foe.id, line: 'hook' }); expect(f.foe.prone).toBe(true);
  });
});

describe('Bind', () => {
  it('base: no damage, Momentum as a hit; the Bound unit attacks anyone but you at −2', () => {
    const f = fight('sabre', { two: true }); const hp = f.foe.hp;
    const pv = f.pv('bind', { targetId: f.foe.id }); expect(pv.ok).toBe(true); expect(pv.attacks).toEqual([]); expect(pv.momentum).toEqual({ now: 0, after: 1 });
    expect(pv.notes.some((n) => /Bound until your next turn: −2/.test(n))).toBe(true);
    expect(f.tech('bind', { targetId: f.foe.id })).toBeNull();
    expect(f.foe.hp).toBe(hp); expect(f.momentum(f.pc)).toBe(1); expect(f.pc.ap).toBe(4);
    expect(f.bound(() => SB.isBoundBy(f.cb, f.foe, f.pc))).toBe(true);
    f.turn(f.foe);
    const other = f.bound(() => phys.previewTechnique(f.cb, f.foe, 'shot', { targetId: f.pcs[1].id }));
    expect(other.attacks[0].pv.terms!.find((x) => /Bound/.test(x.label))?.v).toBe(-2);
    const me = f.bound(() => phys.previewTechnique(f.cb, f.foe, 'shot', { targetId: f.pc.id }));
    expect(me.attacks[0].pv.terms!.some((x) => /Bound/.test(x.label))).toBe(false);
  });
  it('the Bound unit needs a Body save to move away: failed, it stays; made, it goes and the bind ends', () => {
    const f = fight('sabre'); f.tech('bind', { targetId: f.foe.id }); weak(f, f.foe);
    f.turn(f.foe); calm(f); const pos = f.foe.pos; f.walk(f.foe, 'G5');
    expect(f.unit(f.foe.id).pos).toBe(pos); expect(f.cb.log.some((l) => /can't move away/.test(l))).toBe(true);
    const g = fight('sabre'); g.tech('bind', { targetId: g.foe.id }); strong(g, g.foe);
    g.turn(g.foe); calm(g); expect(g.walk(g.foe, 'G5')).toBeNull(); expect(g.unit(g.foe.id).pos).toBe(g.tile('G5'));
    expect(g.bound(() => SB.binderOf(g.cb, g.foe))).toBeNull(); expect(g.pc.tech?.bind?.target).toBeUndefined();
  });
  it('a step that stays next to the binder needs no save', () => {
    const f = fight('sabre'); f.tech('bind', { targetId: f.foe.id }); weak(f, f.foe);
    f.turn(f.foe); expect(f.walk(f.foe, 'D6')).toBeNull(); expect(f.unit(f.foe.id).pos).toBe(f.tile('D6'));
    expect(f.bound(() => SB.isBoundBy(f.cb, f.foe, f.pc))).toBe(true);
  });
  it('it lasts until your next turn, and ends when you move apart', () => {
    const f = fight('sabre'); f.tech('bind', { targetId: f.foe.id }); f.turn(f.foe); f.turn(f.pc);
    expect(f.bound(() => SB.binderOf(f.cb, f.foe))).toBeNull();
    const g = fight('sabre'); g.tech('bind', { targetId: g.foe.id }); g.walk(g.pc, 'A5');
    expect(g.bound(() => SB.binderOf(g.cb, g.foe))).toBeNull(); expect(g.cb.log.some((l) => /bind .* breaks/.test(l))).toBe(true);
  });
  it('no Reach while binding: a lance binds only next to you, then its strikes reach 1 tile; Heavy makes it −4', () => {
    const f = fight('lance', { foes: [{ at: 'D5' }, { at: 'E5' }] });
    expect(f.pv('cut', { targetId: f.foes[1].id }).ok).toBe(true); // a lance reaches 2
    expect(f.tech('bind', { targetId: f.foes[1].id })).toMatch(/next to you/);
    expect(f.pv('bind', { targetId: f.foes[0].id }).notes.some((n) => /−4/.test(n))).toBe(true);
    expect(f.tech('bind', { targetId: f.foes[0].id })).toBeNull(); expect(f.pc.tech?.bind?.pen).toBe(4);
    expect(f.pv('cut', { targetId: f.foes[1].id }).ok).toBe(false);
    expect(f.pv('cut', { targetId: f.foes[0].id }).ok).toBe(true);
  });
  it('Hook: a Brain save or it is Disarmed', () => {
    const f = fight('hatchet'); weak(f, f.foe);
    expect(f.pv('bind', { targetId: f.foe.id }).saves?.[0].skills).toEqual(['brain']);
    f.tech('bind', { targetId: f.foe.id }); expect(f.foe.conds?.disarmed).toBeGreaterThan(0);
    const g = fight('hatchet'); strong(g, g.foe); g.tech('bind', { targetId: g.foe.id }); expect(g.foe.conds?.disarmed || 0).toBe(0);
    expect(g.bound(() => SB.isBoundBy(g.cb, g.foe, g.pc))).toBe(true); // Bound either way
    const n = fight('sabre'); expect(n.pv('bind', { targetId: n.foe.id }).saves || []).toEqual([]);
  });
  it('Bare: it is Grappled instead (today\'s grapple), and only Momentum when it takes', () => {
    const f = fight('fists'); weak(f, f.foe);
    expect(f.tech('bind', { targetId: f.foe.id })).toBeNull();
    expect(f.foe.conds?.grappled).toBeGreaterThan(0); expect(f.foe.condBy?.grappled).toBe(f.pc.id); expect(f.pc.tech?.bind?.target).toBeUndefined();
    expect(f.momentum(f.pc)).toBe(1);
    expect(f.tech('bind', { targetId: f.foe.id })).toMatch(/already held/);
    const g = fight('fists'); strong(g, g.foe); g.tech('bind', { targetId: g.foe.id }); expect(g.foe.conds?.grappled || 0).toBe(0); expect(g.momentum(g.pc)).toBe(0);
  });
  it('refusals: no target, an ally, too far; nothing is spent', () => {
    const f = fight('sabre', { two: true, foes: [{ at: 'H5' }] });
    expect(f.tech('bind')).toMatch(/Pick a target/);
    expect(f.tech('bind', { targetId: f.pcs[1].id })).toMatch(/an enemy/);
    expect(f.tech('bind', { targetId: f.foe.id })).toMatch(/next to you/);
    expect(f.pc.ap).toBe(6);
  });
  it('Momentum: the variety bonus after another technique', () => {
    const f = fight('sabre'); rig({ hit: true, die: 12 }); f.tech('cut', { targetId: f.foe.id }); expect(f.momentum(f.pc)).toBe(1);
    expect(f.tech('bind', { targetId: f.foe.id })).toBeNull(); expect(f.momentum(f.pc)).toBe(3);
  });
  it('a real attack by the Bound unit at someone else takes the −2', () => {
    const f = fight('sabre', { two: true }); f.tech('bind', { targetId: f.foe.id }); f.turn(f.foe);
    const pv = f.bound(() => phys.previewTechnique(f.cb, f.foe, 'shot', { targetId: f.pcs[1].id }));
    rig({ die: 10 }); const r = f.bound(() => resolveAttack(f.cb, f.g.rng, f.foe, f.pcs[1], 'shot', null, { noAp: true }));
    expect(r.total).toBe(10 + pv.attacks[0].pv.toHit);
  });
});

describe('Half-Sword', () => {
  const armoured = (f: F, n: number) => { f.unit(f.foe.id).armour = n; };
  it('base: ×0.8 damage and 10 armour ignored; the armour comes back after', () => {
    const f = fight('sabre'); armoured(f, 15);
    const pv = f.pv('half_sword', { targetId: f.foe.id }), d = pv.attacks[0].pv.dmg!;
    expect(pv.ap).toBe(2); expect(hasMult(pv, 0.8)).toBe(true); expect(d.armour).toBe(5); expect(cutDmg(f).armour).toBe(15);
    rig({ hit: true, die: 12 }); const hp = f.foe.hp;
    expect(f.tech('half_sword', { targetId: f.foe.id })).toBeNull();
    expect(hp - f.foe.hp).toBe(hpLost(pv)); expect(f.foe.armour).toBe(15);
  });
  it('Point: all armour; Heavy: full damage; a weapon with both lets the player pick', () => {
    const p = fight('kemizuchi_duelling_blade'); armoured(p, 15);
    const pp = p.pv('half_sword', { targetId: p.foe.id }); expect(pp.attacks[0].pv.dmg!.armour).toBe(0); expect(hasMult(pp, 0.8)).toBe(true);
    const h = fight('ork_machete'); armoured(h, 15);
    const hp = h.pv('half_sword', { targetId: h.foe.id }); expect(hp.ap).toBe(3); expect(hp.attacks[0].pv.dmg!.armour).toBe(5);
    expect(hp.attacks[0].pv.dmg!.total).toBeCloseTo(cutDmg(h).total, 5);
    const b = fight('adamantile_greatsword'); armoured(b, 15);
    expect(b.pv('half_sword', { targetId: b.foe.id, line: 'point' }).attacks[0].pv.dmg!.armour).toBe(0);
    const bh = b.pv('half_sword', { targetId: b.foe.id, line: 'heavy' }); expect(bh.attacks[0].pv.dmg!.armour).toBe(5); expect(hasMult(bh, 0.8)).toBe(false);
  });
  it('Bare or Blunt: not available, with the reason; nothing is spent', () => {
    const m = fight('maul'); expect(m.tech('half_sword', { targetId: m.foe.id })).toMatch(/Not available with a blunt weapon/); expect(m.pc.ap).toBe(6);
    const f = fight('fists'); expect(f.tech('half_sword', { targetId: f.foe.id })).toMatch(/Not available with a bare weapon/);
    expect(m.pad().flatMap((g) => g.entries).find((e) => e.id === 'half_sword')?.ok).toBe(false);
    const k = fight('knuckledusters'); expect(k.tech('half_sword', { targetId: k.foe.id })).toMatch(/Not available/);
  });
  it('refusals: no target, out of reach', () => {
    const f = fight('sabre', { foes: [{ at: 'H5' }] });
    expect(f.tech('half_sword')).toMatch(/Pick a target/); expect(f.tech('half_sword', { targetId: f.foe.id })).toMatch(/reach/);
  });
  it('Momentum: +1, +1 more after Hamstring, and a repeat earns only the hit', () => {
    const f = fight('sabre'); rig({ hit: true, die: 12 });
    f.tech('hamstring', { targetId: f.foe.id }); f.tech('half_sword', { targetId: f.foe.id }); expect(f.momentum(f.pc)).toBe(3);
    const g = fight('sabre'); rig({ hit: true, die: 12 });
    g.tech('half_sword', { targetId: g.foe.id }); g.tech('half_sword', { targetId: g.foe.id }); expect(g.momentum(g.pc)).toBe(2);
  });
});

describe('Throw', () => {
  const far = { foes: [{ at: 'G5', tier: 'elite' }] };
  it('Thrown: Dexterity to hit, no penalty, full damage; the knife lands in the pile on the target\'s tile', () => {
    const f = fight('combat_knife', { ...far, skills: { dexterity: 8, athletics: 2 } });
    const pv = f.pv('throw', { targetId: f.foe.id }); expect(pv.ok).toBe(true); expect(pv.ap).toBe(2);
    const terms = pv.attacks[0].pv.terms!;
    expect(terms.find((x) => /Dexterity/.test(x.label))?.v).toBe(7 - 1); // Dexterity 8 (+7) in place of Athletics 2 (+1)
    expect(terms.some((x) => x.v < 0 && /Throw/.test(x.label))).toBe(false); expect(pv.attacks[0].pv.dmg!.mults.some((m) => /Throw/.test(m.label))).toBe(false);
    expect(pv.notes.some((n) => /lands in the pile on G5/.test(n))).toBe(true);
    rig({ hit: true, die: 12 }); const hp = f.foe.hp;
    expect(f.tech('throw', { targetId: f.foe.id })).toBeNull();
    expect(hp - f.foe.hp).toBe(hpLost(pv)); expect(f.momentum(f.pc)).toBe(1); expect(f.pc.ap).toBe(4);
    expect(f.pc.weapon).toBe('fists'); expect(f.char(f.pc).weapon).toBe('fists');
    const pile = pileAt(f.cb.objects || [], f.foe.pos)!; expect(pile.items!.some((x: any) => (x.item || x.pack?.weapon) === 'combat_knife')).toBe(true);
  });
  it('without Thrown: −2 to hit and ×0.7; a miss still leaves the weapon in the pile', () => {
    const f = fight('sabre', far);
    const pv = f.pv('throw', { targetId: f.foe.id }); expect(pv.attacks[0].pv.terms!.find((x) => /not a throwing weapon/.test(x.label))?.v).toBe(-2); expect(hasMult(pv, 0.7)).toBe(true);
    rig({ hit: false, die: 3 }); const hp = f.foe.hp; expect(f.tech('throw', { targetId: f.foe.id })).toBeNull();
    expect(f.foe.hp).toBe(hp); expect(f.momentum(f.pc)).toBe(0);
    expect(pileAt(f.cb.objects || [], f.foe.pos)!.items!.some((x: any) => (x.item || x.pack?.weapon) === 'sabre')).toBe(true);
    expect(f.pc.weapon).toBe('fists');
  });
  it('Heavy: a Body save or knocked Prone', () => {
    const f = fight('ork_machete', far); weak(f, f.foe);
    expect(f.pv('throw', { targetId: f.foe.id }).saves?.[0].skills).toEqual(['body']);
    rig({ hit: true, die: 12 }); f.tech('throw', { targetId: f.foe.id }); expect(f.foe.prone).toBe(true);
    const g = fight('ork_machete', far); strong(g, g.foe); rig({ hit: true, die: 12 }); g.tech('throw', { targetId: g.foe.id }); expect(g.foe.prone).toBeFalsy();
    const k = fight('combat_knife', far); expect(k.pv('throw', { targetId: k.foe.id }).saves || []).toEqual([]);
  });
  it('the off hand: only that hand empties', () => {
    const f = fight('sabre', { ...far, off: 'combat_knife' }); rig({ hit: true, die: 12 });
    expect(f.tech('throw', { targetId: f.foe.id, hand: 'off' })).toBeNull();
    expect(f.pc.offWeapon).toBeFalsy(); expect(f.pc.weapon).toBe('sabre'); expect(f.char(f.pc).offHand).toBeNull();
    expect(pileAt(f.cb.objects || [], f.foe.pos)!.items!.some((x: any) => (x.item || x.pack?.weapon) === 'combat_knife')).toBe(true);
  });
  it('refusals: no target, out of throwing range, bare hands; nothing is spent', () => {
    const f = fight('combat_knife', { foes: [{ at: 'P5' }] });
    expect(f.tech('throw')).toMatch(/Pick a target/);
    expect(f.tech('throw', { targetId: f.foe.id })).toMatch(/Out of throwing range/); expect(f.pc.ap).toBe(6); expect(f.pc.weapon).toBe('combat_knife');
    const b = fight('fists'); expect(b.tech('throw', { targetId: b.foe.id })).toMatch(/hands are bare/);
  });
  it('preview equals the action with the same seed', () => {
    const f = fight('hatchet', far); rig({ die: 14 });
    const pv = f.pv('throw', { targetId: f.foe.id }), need = pv.attacks[0].pv.need, toHit = pv.attacks[0].pv.toHit;
    const hp = f.foe.hp; f.tech('throw', { targetId: f.foe.id });
    if (14 + toHit >= need) expect(hp - f.foe.hp).toBe(hpLost(pv)); else expect(f.foe.hp).toBe(hp);
  });
});

// Physical 2.0 (rules 1.12), the melee Links: Sidestep, Guard, Shove, Trip and Drag.
import { describe, it, expect, beforeEach } from 'vitest';
import { phys, previewAttack, type Unit } from '../src';
import { condOn } from '../src/magic';
import { d20 } from '../src/rng';
import { physFight, rig } from './helpers/physfight';

beforeEach(() => rig(null));
const LINKS = ['sidestep', 'guard', 'shove', 'trip', 'drag'];
type F = ReturnType<typeof physFight>;
/** A unit that fails (weak) or makes (strong) every save but on a natural 20 / 1. */
const saves = (f: F, u: Unit, n: number) => { const x = f.unit(u.id); x.sv = { body: n, brain: n, heart: n }; x.attack = n; quiet(f); };
/** Set the game's dice so the next d20s are not natural 1s or 20s (a natural 20 always saves). */
function quiet(f: F) { for (let s = f.g.rng.state; ; s++) { const r = { state: s }; if ([0, 1, 2, 3].every(() => { const d = d20(r); return d > 1 && d < 20; })) { f.g.rng.state = s; return; } } }
const weak = (f: F, u: Unit) => saves(f, u, -50), strong = (f: F, u: Unit) => { saves(f, u, 50); f.unit(u.id).strength = 50; };
/** Shove is today's opposed roll (Strength and Raw Power): a weak target, and a PC that always wins it but on a natural 1. */
const weakShove = (f: F, u: Unit) => { weak(f, u); f.unit(u.id).strength = -50; f.unit(f.pc.id).strength = 20; };
/** A fight: the PC with a weapon on C7, a soldier on D7 (next to it), the PC's turn. */
function fight(weapon: string, o: { foes?: { at: string; weapon?: string }[]; pcs?: any[]; known?: string[] } = {}) {
  const f = physFight([{ weapon, known: o.known || LINKS, skills: { athletics: 4, raw_power: 4 } }, ...(o.pcs || [])], (o.foes || [{ at: 'D7' }]).map((x) => ({ tier: 'soldier', ...x })));
  f.put(f.pc, 'C7'); (o.foes || [{ at: 'D7' }]).forEach((x, i) => f.put(f.foes[i], x.at)); f.turn(f.pc);
  return f;
}
const at = (f: F, u: Unit) => f.unit(u.id).pos;
const unchanged = (f: F, fn: () => void) => { const before = JSON.stringify(f.g); fn(); expect(JSON.stringify(f.g)).toBe(before); };

describe('the Links are built', () => {
  it('every Link has a handler, and the pad shows none as not built', () => {
    for (const id of LINKS) expect(phys.handlerOf(id), id).toBeTruthy();
    const f = fight('sabre'); const e = f.pad().flatMap((g) => g.entries).filter((x) => LINKS.includes(x.id));
    expect(e.map((x) => x.id).sort()).toEqual([...LINKS].sort());
    for (const x of e) { expect(x.built).toBe(true); expect(x.ap).toBe(1); expect(x.group).toBe('link'); }
  });
});

describe('Sidestep (15)', () => {
  it('moves 1 tile to another tile next to the same enemy, for 1 AP, with no opportunity attack and no Momentum', () => {
    const f = fight('maul', { foes: [{ at: 'D7' }, { at: 'B7' }] });
    const pv = f.pv('sidestep', { targetId: f.foe.id, tile: f.tile('D6') });
    expect(pv.ok).toBe(true); expect(pv.ap).toBe(1); expect(pv.moves).toEqual([{ unit: f.pc.id, to: f.tile('D6') }]);
    unchanged(f, () => f.pv('sidestep', { targetId: f.foe.id, tile: f.tile('D6') }));
    expect(f.tech('sidestep', { targetId: f.foe.id, tile: f.tile('D6') })).toBeNull();
    expect(at(f, f.pc)).toBe(f.tile('D6')); expect(f.pc.ap).toBe(5); expect(f.momentum(f.pc)).toBe(0);
    expect(f.foes[1].reactUsed?.n || 0).toBe(0); // B7 saw the PC leave its reach: no opportunity attack
  });
  it('is 1 tile without Light and 2 with it', () => {
    const f = fight('maul'); expect(f.tech('sidestep', { targetId: f.foe.id, tile: f.tile('E7') })).toMatch(/can't step there/);
    expect(f.pc.ap).toBe(6);
    const g = fight('sabre'); expect(g.tech('sidestep', { targetId: g.foe.id, tile: g.tile('E7') })).toBeNull(); expect(at(g, g.pc)).toBe(g.tile('E7'));
  });
  it('refuses away from an enemy, onto a tile not next to it, and when the user can\'t move', () => {
    const f = fight('maul'); f.put(f.pc, 'A7'); expect(f.tech('sidestep', { tile: f.tile('A6') })).toMatch(/Stand next to an enemy/);
    expect(f.tech('sidestep', { targetId: f.foe.id, tile: f.tile('A6') })).toMatch(/must be next to/);
    const g = fight('maul'); expect(g.tech('sidestep', { targetId: g.foe.id, tile: g.tile('B7') })).toMatch(/can't step there/);
    const h = fight('maul'); h.unit(h.pc.id).prone = true; expect(h.tech('sidestep', { targetId: h.foe.id, tile: h.tile('D6') })).toMatch(/Stand up/);
    expect(h.pc.ap).toBe(6);
  });
  it('the next Strike against it this turn ignores a carried shield; it is spent by that Strike', () => {
    // a second PC on the other side, holding a riot shield (+2 Defense)
    const f = fight('sabre', { pcs: [{ weapon: 'sabre' }], foes: [{ at: 'H9' }] });
    const s = f.pcs[1]; f.char(s).offHand = { id: 'riot_shield' } as any; f.unit(s.id).side = 'foe'; f.put(s, 'D7');
    rig({ hit: true, die: 12 });
    const term = (pv: any) => pv.attacks[0].pv.terms.find((x: any) => x.label === 'Sidestep: shield ignored');
    expect(term(f.pv('cut', { targetId: s.id }))).toBeUndefined();
    expect(f.tech('sidestep', { targetId: s.id, tile: f.tile('D6') })).toBeNull();
    expect(term(f.pv('cut', { targetId: s.id }))?.v).toBe(2);
    expect(f.tech('cut', { targetId: s.id })).toBeNull();
    expect(f.momentum(f.pc)).toBe(2); // the hit, and +1: Cut differs from the last technique (Sidestep)
    expect(term(f.pv('cut', { targetId: s.id }))).toBeUndefined(); // spent
  });
  it('a held Watch sees the step', () => {
    const f = physFight([{ weapon: 'maul', known: LINKS }], [{ at: 'D7', weapon: 'hellraiser_service_rifle' }]); f.put(f.pc, 'C7'); f.put(f.foe, 'D7');
    f.turn(f.foe); expect(f.use(f.foe, 'overwatch')).toBeNull(); f.turn(f.pc); rig({ hit: true, die: 12 }); const hp = f.pc.hp;
    expect(f.tech('sidestep', { targetId: f.foe.id, tile: f.tile('D6') })).toBeNull();
    expect(f.foe.watch).toBeUndefined(); expect(f.pc.hp).toBeLessThan(hp);
  });
});

describe('Guard (16)', () => {
  const swing = (f: F, a: Unit, d: Unit, mode: 'melee' | 'shot' = 'melee') => f.bound(() => previewAttack(f.cb, f.unit(a.id), f.unit(d.id), mode, { free: true }));
  const guardTerm = (pv: any) => pv.terms?.find((x: any) => x.label === 'Guard')?.v;
  it('+2 Defense against melee until your next turn, for 1 AP; not against shots without Heavy', () => {
    const f = fight('sabre', { foes: [{ at: 'D7', weapon: 'sabre' }, { at: 'H7' }] });
    expect(f.tech('guard')).toBeNull(); expect(f.pc.ap).toBe(5);
    expect(guardTerm(swing(f, f.foes[0], f.pc))).toBe(-2);
    expect(guardTerm(swing(f, f.foes[1], f.pc, 'shot'))).toBeUndefined();
    expect(f.tech('guard')).toMatch(/already on Guard/);
    f.pass(); f.turn(f.foes[0]); expect(guardTerm(swing(f, f.foes[0], f.pc))).toBe(-2); // still on through the enemy's turn
    f.turn(f.pc); expect(guardTerm(swing(f, f.foes[0], f.pc))).toBeUndefined();      // ends at your next turn
  });
  it('Momentum doesn\'t drop at the end of the turn', () => {
    const f = fight('sabre'); f.momentum(f.pc, 2); f.tech('guard'); f.pass(); expect(f.momentum(f.pc)).toBe(2);
    const g = fight('sabre'); g.momentum(g.pc, 2); g.pass(); expect(g.momentum(g.pc)).toBe(0); // no melee technique: it drops
  });
  it('gives no Momentum itself, and the next technique earns the variety bonus', () => {
    const f = fight('sabre'); rig({ hit: true, die: 12 });
    f.tech('guard'); expect(f.momentum(f.pc)).toBe(0);
    f.tech('cut', { targetId: f.foe.id }); expect(f.momentum(f.pc)).toBe(2);
  });
  it('Heavy: the +2 also applies to shots from the front, not from behind', () => {
    const f = fight('maul', { foes: [{ at: 'H7' }, { at: 'A7' }] });
    expect(f.pv('guard', { tile: f.tile('H7') }).notes.join(' ')).toMatch(/from the front/);
    f.tech('guard', { tile: f.tile('H7') });
    expect(guardTerm(swing(f, f.foes[0], f.pc, 'shot'))).toBe(-2); expect(guardTerm(swing(f, f.foes[1], f.pc, 'shot'))).toBeUndefined();
    const g = fight('sabre', { foes: [{ at: 'H7' }] }); g.tech('guard', { tile: g.tile('H7') }); expect(guardTerm(swing(g, g.foe, g.pc, 'shot'))).toBeUndefined();
  });
  it('Reach: an enemy stepping next to you makes a Body save or stops where it came from', () => {
    const f = fight('bot_thread_banner', { foes: [{ at: 'G7', weapon: 'sabre' }] });
    f.tech('guard'); f.turn(f.foe); weak(f, f.foe);
    expect(f.walk(f.foe, 'D7')).toBeNull(); expect(at(f, f.foe)).toBe(f.tile('E7'));
    expect(f.cb.log.some((l) => /can't get past/.test(l))).toBe(true);
    const g = fight('bot_thread_banner', { foes: [{ at: 'G7', weapon: 'sabre' }] }); g.tech('guard'); g.turn(g.foe); strong(g, g.foe);
    g.walk(g.foe, 'D7'); expect(at(g, g.foe)).toBe(g.tile('D7'));
    const h = fight('sabre', { foes: [{ at: 'G7', weapon: 'sabre' }] }); h.tech('guard'); h.turn(h.foe); weak(h, h.foe);
    h.walk(h.foe, 'D7'); expect(at(h, h.foe)).toBe(h.tile('D7')); // no Reach line: no save
  });
  it('a preview changes nothing', () => {
    const f = fight('maul'); unchanged(f, () => f.pv('guard'));
    const pv = f.pv('guard'); expect(pv.ok).toBe(true); expect(pv.ap).toBe(1); expect(pv.momentum).toEqual({ now: 0, after: 0 });
  });
  it('the Defender takes Pressure on its Guard first', () => {
    const f = physFight([{ weapon: 'sabre', classId: 'defender' }], [{ at: 'H7' }]); f.turn(f.pc);
    const u = f.unit(f.pc.id); expect(u.resMax?.guard).toBeGreaterThan(0); u.res!.guard = 2;
    expect(f.press(f.pc, 3, f.foe)).toBe(1); expect(f.unit(f.pc.id).res!.guard).toBe(0);
  });
});

describe('Shove (17)', () => {
  it('pushes 1 tile on a failed save, for 1 AP, and gives Momentum', () => {
    const f = fight('sabre'); weakShove(f, f.foe);
    const pv = f.pv('shove', { targetId: f.foe.id });
    expect(pv.ok).toBe(true); expect(pv.ap).toBe(1); expect(pv.moves).toEqual([{ unit: f.foe.id, to: f.tile('E7') }]);
    expect(pv.saves?.[0]).toMatchObject({ unit: f.foe.id, skills: ['raw_power', 'athletics'], tn: 10 }); expect(pv.momentum).toEqual({ now: 0, after: 1 });
    unchanged(f, () => f.pv('shove', { targetId: f.foe.id }));
    expect(f.tech('shove', { targetId: f.foe.id })).toBeNull();
    expect(at(f, f.foe)).toBe(pv.moves![0].to); expect(f.pc.ap).toBe(5); expect(f.momentum(f.pc)).toBe(pv.momentum!.after);
  });
  it('a save holds it: no move, no Momentum, the AP is spent', () => {
    const f = fight('sabre'); strong(f, f.foe);
    expect(f.tech('shove', { targetId: f.foe.id })).toBeNull(); expect(at(f, f.foe)).toBe(f.tile('D7')); expect(f.momentum(f.pc)).toBe(0); expect(f.pc.ap).toBe(5);
  });
  it('blocked, it falls Prone', () => {
    const f = fight('sabre', { foes: [{ at: 'D7' }, { at: 'E7' }] }); weakShove(f, f.foes[0]);
    expect(f.pv('shove', { targetId: f.foes[0].id }).notes.join(' ')).toMatch(/prone/);
    f.tech('shove', { targetId: f.foes[0].id }); expect(at(f, f.foes[0])).toBe(f.tile('D7')); expect(f.unit(f.foes[0].id).prone).toBe(true);
    expect(f.tech('shove', { targetId: f.foes[0].id })).toMatch(/already Prone/);
  });
  it('Blunt or Heavy: 2 tiles; without: 1', () => {
    const f = fight('maul'); weakShove(f, f.foe); f.tech('shove', { targetId: f.foe.id }); expect(at(f, f.foe)).toBe(f.tile('F7'));
    const g = fight('knuckledusters'); weakShove(g, g.foe); g.tech('shove', { targetId: g.foe.id }); expect(at(g, g.foe)).toBe(g.tile('F7'));
    const h = fight('kemizuchi_duelling_blade'); weakShove(h, h.foe); h.tech('shove', { targetId: h.foe.id }); expect(at(h, h.foe)).toBe(h.tile('E7'));
  });
  it('Reach: from 2 tiles away (the line is picked when two apply); without it, next to you only', () => {
    const f = fight('bot_thread_banner', { foes: [{ at: 'E7' }] }); weakShove(f, f.foe);
    expect(f.tech('shove', { targetId: f.foe.id, line: 'blunt' })).toMatch(/next to you/);
    expect(f.tech('shove', { targetId: f.foe.id, line: 'reach' })).toBeNull(); expect(at(f, f.foe)).toBe(f.tile('F7'));
    const g = fight('sabre', { foes: [{ at: 'E7' }] }); expect(g.tech('shove', { targetId: g.foe.id })).toMatch(/next to you/); expect(g.pc.ap).toBe(6);
  });
  it('refuses an ally, no target, and the dead', () => {
    const f = fight('sabre', { pcs: [{ weapon: 'sabre' }] }); f.put(f.pcs[1], 'C8');
    expect(f.tech('shove', { targetId: f.pcs[1].id })).toMatch(/not an ally/);
    expect(f.tech('shove')).toMatch(/Pick a target/);
    f.unit(f.foe.id).dead = true; expect(f.tech('shove', { targetId: f.foe.id })).toMatch(/out of the fight|Pick a target|Pick someone else/);
  });
  it('Momentum: the variety bonus after another technique; a repeat earns only its own 1', () => {
    const f = fight('sabre', { foes: [{ at: 'D7' }, { at: 'D8' }] }); weakShove(f, f.foes[0]); weakShove(f, f.foes[1]); rig({ hit: true, die: 12 });
    f.tech('cut', { targetId: f.foes[1].id }); expect(f.momentum(f.pc)).toBe(1);
    f.tech('shove', { targetId: f.foes[0].id }); expect(f.momentum(f.pc)).toBe(3);
    f.momentum(f.pc, 0); f.tech('shove', { targetId: f.foes[1].id }); expect(f.momentum(f.pc)).toBe(1); // Shove after Shove
  });
  it('a moved enemy sets off a held Watch', () => {
    const f = fight('sabre', { pcs: [{ weapon: 'hellraiser_service_rifle' }] }); f.put(f.pcs[1], 'C10'); weakShove(f, f.foe);
    f.turn(f.pcs[1]); expect(f.tech('overwatch')).toBeNull(); f.turn(f.pc); rig({ hit: true, die: 12 }); const hp = f.foe.hp;
    f.tech('shove', { targetId: f.foe.id });
    expect(f.unit(f.pcs[1].id).watch).toBeUndefined(); expect(f.unit(f.foe.id).hp).toBeLessThan(hp);
  });
  it('a Deny lane halts the push (a ranged Stopped once); a melee push is not bound by Stopped once', () => {
    const f = fight('maul', { pcs: [{ weapon: 'ccec_marksman_rifle', known: ['deny'] }] }); f.put(f.pcs[1], 'C10'); weakShove(f, f.foe);
    f.turn(f.pcs[1]); expect(f.tech('deny', { tile: 'E7' })).toBeNull(); f.turn(f.pc); rig({ hit: true, die: 12 });
    f.tech('shove', { targetId: f.foe.id });
    expect(at(f, f.foe)).toBe(f.tile('E7')); // 2 tiles, halted on the first by Deny
    expect(f.unit(f.foe.id).stopped).toBeGreaterThan(0);
    f.put(f.pc, 'D7'); expect(f.tech('shove', { targetId: f.foe.id })).toBeNull(); expect(at(f, f.foe)).toBe(f.tile('G7'));
  });
});

describe('Trip (18)', () => {
  it('a failed Body save: Prone, Momentum, 1 AP', () => {
    const f = fight('sabre'); weak(f, f.foe);
    const pv = f.pv('trip', { targetId: f.foe.id }); expect(pv.ok).toBe(true); expect(pv.saves?.[0]).toMatchObject({ skills: ['body'], tn: 12 }); expect(pv.momentum?.after).toBe(1);
    unchanged(f, () => f.pv('trip', { targetId: f.foe.id }));
    expect(f.tech('trip', { targetId: f.foe.id })).toBeNull(); expect(f.unit(f.foe.id).prone).toBe(true); expect(f.momentum(f.pc)).toBe(1); expect(f.pc.ap).toBe(5);
    expect(f.tech('trip', { targetId: f.foe.id })).toMatch(/already Prone/);
  });
  it('a save: nothing, no Momentum', () => {
    const f = fight('sabre'); strong(f, f.foe); f.tech('trip', { targetId: f.foe.id }); expect(f.unit(f.foe.id).prone).toBeFalsy(); expect(f.momentum(f.pc)).toBe(0);
  });
  it('Hook or Reach: the save is at −2; without either, at the plain TN', () => {
    expect(fight('war_axe').pv('trip', { targetId: '' }).ok).toBe(false);
    const f = fight('war_axe'); expect(f.pv('trip', { targetId: f.foe.id }).saves?.[0].tn).toBe(14);
    const g = fight('glaive', { foes: [{ at: 'E7' }] }); expect(g.pv('trip', { targetId: g.foe.id, line: 'reach' }).saves?.[0].tn).toBe(14); // and from 2 tiles with a Reach weapon
    const h = fight('maul'); expect(h.pv('trip', { targetId: h.foe.id }).saves?.[0].tn).toBe(12);
  });
  it('Bare: you may go Prone with it, and then it is Grappled', () => {
    const f = fight('fists'); weak(f, f.foe);
    expect(f.pv('trip', { targetId: f.foe.id }).notes.join(' ')).toMatch(/may go Prone/);
    expect(f.tech('trip', { targetId: f.foe.id, opt: 'grapple' })).toBeNull();
    expect(f.unit(f.foe.id).prone).toBe(true); expect(f.unit(f.pc.id).prone).toBe(true); expect(condOn(f.unit(f.foe.id), 'grappled')).toBe(true);
    const g = fight('fists'); weak(g, g.foe); g.tech('trip', { targetId: g.foe.id }); expect(g.unit(g.pc.id).prone).toBeFalsy(); expect(condOn(g.unit(g.foe.id), 'grappled')).toBe(false);
    const h = fight('sabre'); expect(h.tech('trip', { targetId: h.foe.id, opt: 'grapple' })).toMatch(/Bare/);
  });
  it('refuses out of reach and an ally', () => {
    const f = fight('sabre', { foes: [{ at: 'E7' }], pcs: [{ weapon: 'sabre' }] }); f.put(f.pcs[1], 'C8');
    expect(f.tech('trip', { targetId: f.foe.id })).toMatch(/next to you/); expect(f.tech('trip', { targetId: f.pcs[1].id })).toMatch(/not an ally/);
    expect(f.pc.ap).toBe(6);
  });
});

describe('Drag (19)', () => {
  it('pulls a reached target 1 tile toward you on a failed Body save, and gives Momentum', () => {
    const f = fight('bot_thread_banner', { foes: [{ at: 'E7' }] }); weak(f, f.foe);
    const pv = f.pv('drag', { targetId: f.foe.id }); expect(pv.ok).toBe(true); expect(pv.moves).toEqual([{ unit: f.foe.id, to: f.tile('D7') }]); expect(pv.saves?.[0].skills).toEqual(['body']);
    unchanged(f, () => f.pv('drag', { targetId: f.foe.id }));
    expect(f.tech('drag', { targetId: f.foe.id })).toBeNull(); expect(at(f, f.foe)).toBe(f.tile('D7')); expect(f.momentum(f.pc)).toBe(1); expect(f.pc.ap).toBe(5);
  });
  it('next to you it swaps tiles; a pull there is refused', () => {
    const f = fight('sabre'); weak(f, f.foe);
    expect(f.tech('drag', { targetId: f.foe.id, opt: 'pull' })).toMatch(/already next to you/);
    const pv = f.pv('drag', { targetId: f.foe.id }); expect(pv.moves).toEqual([{ unit: f.foe.id, to: f.tile('C7') }, { unit: f.pc.id, to: f.tile('D7') }]);
    expect(f.tech('drag', { targetId: f.foe.id })).toBeNull(); expect(at(f, f.foe)).toBe(f.tile('C7')); expect(at(f, f.pc)).toBe(f.tile('D7')); expect(f.momentum(f.pc)).toBe(1);
  });
  it('a save holds it', () => {
    const f = fight('sabre'); strong(f, f.foe); f.tech('drag', { targetId: f.foe.id }); expect(at(f, f.foe)).toBe(f.tile('D7')); expect(f.momentum(f.pc)).toBe(0);
  });
  it('Hook: 2 tiles (with Reach, from 2 tiles away); it stops beside you', () => {
    const f = fight('glaive', { foes: [{ at: 'E7' }] }); weak(f, f.foe);
    const pv = f.pv('drag', { targetId: f.foe.id, line: 'hook' }); expect(pv.moves).toEqual([{ unit: f.foe.id, to: f.tile('D7') }]);
    f.tech('drag', { targetId: f.foe.id, line: 'hook' }); expect(at(f, f.foe)).toBe(f.tile('D7'));
    const g = fight('war_axe', { foes: [{ at: 'E7' }] }); expect(g.tech('drag', { targetId: g.foe.id })).toMatch(/next to you/); // Hook alone: no reach
  });
  it('Bare: you may move 1 tile and bring it with you', () => {
    const f = fight('fists'); weak(f, f.foe);
    const pv = f.pv('drag', { targetId: f.foe.id, opt: 'carry', tile: f.tile('C6') }); expect(pv.moves).toEqual([{ unit: f.pc.id, to: f.tile('C6') }, { unit: f.foe.id, to: f.tile('D6') }]);
    expect(f.tech('drag', { targetId: f.foe.id, opt: 'carry', tile: f.tile('C6') })).toBeNull();
    expect(at(f, f.pc)).toBe(f.tile('C6')); expect(at(f, f.foe)).toBe(f.tile('D6'));
    const g = fight('fists'); weak(g, g.foe); g.tech('drag', { targetId: g.foe.id, opt: 'carry', tile: g.tile('B7') });
    expect(at(g, g.pc)).toBe(g.tile('B7')); expect(at(g, g.foe)).toBe(g.tile('C7'));
    const h = fight('sabre'); expect(h.tech('drag', { targetId: h.foe.id, opt: 'carry', tile: h.tile('C6') })).toMatch(/Bare/);
    const k = fight('fists'); expect(k.tech('drag', { targetId: k.foe.id, opt: 'carry' })).toMatch(/Pick a free tile/);
  });
  it('refuses out of reach and an ally', () => {
    const f = fight('sabre', { foes: [{ at: 'E7' }], pcs: [{ weapon: 'sabre' }] }); f.put(f.pcs[1], 'C8');
    expect(f.tech('drag', { targetId: f.foe.id })).toMatch(/next to you/); expect(f.tech('drag', { targetId: f.pcs[1].id })).toMatch(/not an ally/); expect(f.pc.ap).toBe(6);
  });
  it('a pulled enemy sets off a held Watch', () => {
    const f = fight('bot_thread_banner', { foes: [{ at: 'E7' }], pcs: [{ weapon: 'hellraiser_service_rifle' }] }); f.put(f.pcs[1], 'C10'); weak(f, f.foe);
    f.turn(f.pcs[1]); f.tech('overwatch'); f.turn(f.pc); rig({ hit: true, die: 12 }); const hp = f.foe.hp;
    f.tech('drag', { targetId: f.foe.id }); expect(f.unit(f.pcs[1].id).watch).toBeUndefined(); expect(f.unit(f.foe.id).hp).toBeLessThan(hp);
  });
});

describe('every Link: preview and run agree, and a preview changes nothing', () => {
  it('with the same seed, the preview\'s moves and Momentum are what the action does', () => {
    const cases: [string, string, any, string?][] = [['sidestep', 'sabre', { tile: 'D6' }], ['shove', 'maul', {}], ['trip', 'sabre', {}], ['drag', 'sabre', {}], ['guard', 'sabre', {}]];
    for (const [id, w, a] of cases) {
      const f = fight(w); if (id === 'shove') weakShove(f, f.foe); else weak(f, f.foe); const args = { targetId: f.foe.id, ...a, ...(a.tile ? { tile: f.tile(a.tile) } : {}) };
      const before = JSON.stringify(f.g); const pv = f.pv(id, args); expect(JSON.stringify(f.g), id).toBe(before);
      expect(pv.ok, id).toBe(true);
      expect(f.tech(id, args), id).toBeNull();
      for (const m of pv.moves || []) expect(at(f, f.unit(m.unit)), id).toBe(m.to);
      expect(f.momentum(f.pc), id).toBe(pv.momentum!.after); expect(f.pc.ap, id).toBe(6 - pv.ap);
    }
  });
});

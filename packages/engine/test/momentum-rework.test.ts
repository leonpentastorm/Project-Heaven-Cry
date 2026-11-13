// The Momentum rework (Leon, 10 Nov 2026; docs/design/proposals/2026-11-nine-doors.md section 20; spec "Melee:
// Momentum and the chain"). One block per rule:
//   1. only the plain melee attack gives Momentum (+1 on a hit)
//   2. a Strike and an Opener spend 1 each and are refused without it; Cut, Pull Out, Links and Answers spend none
//   3. a fight starts with 1; the first Opener of a fight is free
//   4. walking costs 1 a tile (a walk, a Sprint, a Disengage); never a forced move, a Link's move or a technique's own step
//   5. a damaging hit costs 1, unless guarding (the Guard technique, a Parry that wins, Guard points)
//   6. no variety bonus          7. no technique gives Momentum by its text, but Parry's Light line
//   8. it carries from turn to turn   9. the maximums stand   10. enemies plan with it   11. the card shows it
import { describe, it, expect, beforeEach } from 'vitest';
import './helpers/yard16'; // the 16 × 11 practice square these tests name tiles on
import { phys, resolveAttack, startCombat, type Unit } from '../src';
import { physFight, rig } from './helpers/physfight';

beforeEach(() => rig(null));

const SK = { athletics: 6, raw_power: 6, dexterity: 6 };
const NEEDS = 'Needs 1 Momentum: land a plain attack first.';
type F = ReturnType<typeof fight>;
/** One PC on C5 with the techniques named, foes where given (default one next to it on D5), the PC's turn first, clear
 * ground, nobody hurt, the PC's Momentum set (default 1, as a fight starts) and no Opener used yet. */
function fight(weapon: string, known: string[], o: { foes?: { at: string; weapon?: string }[]; m?: number; off?: string } = {}) {
  const foes = o.foes || [{ at: 'D5' }];
  const f = physFight([{ weapon, known, skills: SK, ...(o.off ? { off: o.off } : {}) }], foes.map((x) => ({ tier: 'elite', ...x })));
  f.cb.objects = [];
  f.put(f.pc, 'C5'); foes.forEach((x, i) => { const u = f.put(f.foes[i], x.at); u.hp = u.maxHp = 900; });
  f.cb.order = [f.pc.id, ...f.cb.order.filter((id) => id !== f.pc.id)]; f.cb.round = 1;
  f.turn(f.pc);
  for (const u of f.cb.units) { delete u.openerUsed; delete (u as any).reactUsed; delete (u as any).uses?.['reaction|reaction']; if (u.side === 'pc') u.hp = u.maxHp; }
  f.momentum(f.pc, o.m ?? 1);
  return f;
}
const weak = (u: Unit) => { u.sv = { body: -50, brain: -50, heart: -50 } as any; u.strength = -50; };
/** The foe swings at (or shoots) the PC outside any turn cost; returns the HP it took. */
const hitPc = (f: F, mode: 'melee' | 'shot' = 'melee', by = f.foe) => { const hp = f.pc.hp; f.bound(() => resolveAttack(f.cb, f.g.rng, f.unit(by.id), f.pc, mode, null, { noAp: true })); return hp - f.pc.hp; };

describe('1. only the plain melee attack gives Momentum', () => {
  it('Cut: +1 on a hit, none on a miss; with fists too', () => {
    const f = fight('sabre', [], { m: 0 }); rig({ hit: true, die: 12 });
    expect(f.tech('cut', { targetId: f.foe.id })).toBeNull(); expect(f.momentum(f.pc)).toBe(1);
    rig({ hit: false, die: 5 }); expect(f.tech('cut', { targetId: f.foe.id })).toBeNull(); expect(f.momentum(f.pc)).toBe(1);
    const g = fight('fists', [], { m: 0 }); rig({ hit: true, die: 12 });
    expect(g.tech('cut', { targetId: g.foe.id })).toBeNull(); expect(g.momentum(g.pc)).toBe(1);
  });
  it('the old attack action\'s melee swing: +1 on a hit', () => {
    const f = fight('sabre', [], { m: 0 }); rig({ hit: true, die: 12 });
    f.act({ type: 'combat/attack', unitId: f.pc.id, targetId: f.foe.id, mode: 'melee' } as any);
    expect(f.momentum(f.pc)).toBe(1);
  });
  it('no other technique\'s hit gives any: an Opener, a Strike, a strike of many hits, a thrown one, an Answer', () => {
    const f = fight('sabre', ['lunge', 'bash', 'flurry'], { m: 3 }); rig({ hit: true, die: 12 }); f.pc.ap = 9;
    expect(f.tech('lunge', { targetId: f.foe.id })).toBeNull(); expect(f.momentum(f.pc)).toBe(3); // free (the first Opener), and nothing gained
    f.momentum(f.pc, 2);
    expect(f.tech('bash', { targetId: f.foe.id })).toBeNull(); expect(f.momentum(f.pc)).toBe(1);   // −1, and nothing for the hit
    expect(f.tech('flurry', { targetId: f.foe.id })).toBeNull(); expect(f.momentum(f.pc)).toBe(0); // three hits: −1 only
    const t = fight('combat_knife', ['throw'], { foes: [{ at: 'F5' }], m: 2 }); rig({ hit: true, die: 12 });
    expect(t.tech('throw', { targetId: t.foe.id })).toBeNull(); expect(t.momentum(t.pc)).toBe(1);
    const r = fight('sabre', ['riposte'], { m: 0 }); r.turn(r.foe); r.foe.attack = -100; rig({ die: 15 }); // the foe's 15 misses, the Riposte's 15 hits
    const hp = r.foe.hp; hitPc(r);
    expect(r.cb.log.some((l) => /answers with Riposte/.test(l))).toBe(true); expect(r.foe.hp).toBeLessThan(hp); expect(r.momentum(r.pc)).toBe(0);
  });
});

describe('2. a Strike and an Opener spend 1 Momentum', () => {
  it('a Strike: 1 when used, refused at 0 in the given words, nothing spent on the refusal', () => {
    const f = fight('sabre', ['bash'], { m: 1 }); rig({ hit: false, die: 5 });
    expect(f.tech('bash', { targetId: f.foe.id })).toBeNull(); expect(f.momentum(f.pc)).toBe(0); // spent on a miss too
    const ap = f.pc.ap;
    expect(f.tech('bash', { targetId: f.foe.id })).toBe(NEEDS); expect(f.pc.ap).toBe(ap);
    expect(f.pv('bash', { targetId: f.foe.id })).toMatchObject({ ok: false, why: NEEDS });
    expect(f.pad().flatMap((g) => g.entries).find((e) => e.id === 'bash')).toMatchObject({ ok: false, why: NEEDS });
  });
  it('a handler\'s own refusal gives the Momentum back with the AP', () => {
    const f = fight('sabre', ['bash'], { foes: [{ at: 'H5' }], m: 1 });
    expect(f.tech('bash', { targetId: f.foe.id })).toMatch(/reach/); expect(f.momentum(f.pc)).toBe(1); expect(f.pc.ap).toBe(6);
  });
  it('Cut and Pull Out are free and spend none; Links and Answers spend none', () => {
    for (const id of ['cut', 'pull_out', 'sidestep', 'guard', 'shove', 'trip', 'drag', 'parry', 'riposte', 'keep_back']) expect(phys.momentumCost({} as Unit, phys.TECHNIQUE[id]), id).toBe(0);
    for (const id of phys.TECHNIQUES.filter((d) => d.system === 'melee' && d.group === 'strike' && !d.free && d.id !== 'shield_bash' /* 1 Guard in its place */).map((d) => d.id)) expect(phys.momentumCost({} as Unit, phys.TECHNIQUE[id]), id).toBe(1);
    for (const d of phys.TECHNIQUES.filter((x) => x.system === 'ranged')) expect(phys.momentumCost({ openerUsed: true } as Unit, d), d.id).toBe(0);
    const f = fight('sabre', ['sidestep', 'guard', 'shove', 'trip'], { m: 0 }); weak(f.foe); f.pc.strength = 20; rig({ hit: true, die: 12 });
    expect(f.tech('guard')).toBeNull(); expect(f.tech('trip', { targetId: f.foe.id })).toBeNull();
    expect(f.tech('sidestep', { targetId: f.foe.id, tile: f.tile('D4') })).toBeNull();
    expect(f.momentum(f.pc)).toBe(0);
    expect(f.tech('cut', { targetId: f.foe.id })).toBeNull(); expect(f.momentum(f.pc)).toBe(1); // usable at 0, and it gives the 1
  });
  it('a Finisher is unchanged: it needs 2, spends all and ends the chain', () => {
    const f = fight('sabre', ['coup'], { m: 1 }); rig({ hit: true, die: 12 });
    expect(f.tech('coup', { targetId: f.foe.id })).toMatch(/Needs Momentum 2/);
    f.momentum(f.pc, 3); expect(f.pv('coup', { targetId: f.foe.id }).momentum).toEqual({ now: 3, after: 0 });
    expect(f.tech('coup', { targetId: f.foe.id })).toBeNull(); expect(f.momentum(f.pc)).toBe(0);
    expect(f.tech('cut', { targetId: f.foe.id })).toMatch(/chain has ended/);
  });
  it('both hands: one technique, 1 Momentum', () => {
    const f = fight('sabre', ['bash'], { m: 2, off: 'combat_knife' }); rig({ hit: true, die: 12 });
    expect(f.tech('bash', { targetId: f.foe.id, hand: 'both' })).toBeNull();
    expect(f.fx('melee').filter((e: any) => e.unit === f.pc.id).length).toBe(2); expect(f.momentum(f.pc)).toBe(1);
  });
});

describe('3. a fight starts with 1 Momentum; the first Opener of a fight is free', () => {
  it('every unit with the meter starts at 1; a unit with no melee weapon has no meter', () => {
    const f = fight('sabre', []);
    const cb = f.bound(() => startCombat('Start', 'yard16', [{ c: f.char(f.pc) }], [{ name: 'Blade', tier: 'elite', weapon: 'sabre' }, { name: 'Gun', tier: 'elite', weapon: 'service_pistol' }], 'standard', { state: 5 }));
    const pc = cb.units.find((u) => u.side === 'pc')!, blade = cb.units.find((u) => u.name === 'Blade')!, gun = cb.units.find((u) => u.name === 'Gun')!;
    expect(pc.res?.momentum).toBe(1); expect(pc.resMax?.momentum).toBe(3);
    expect(blade.res?.momentum).toBe(1); expect(gun.resMax?.momentum).toBeUndefined();
    expect(phys.PHYS_RULES.momentum.start).toBe(1);
  });
  it('the first Opener costs none; the second costs 1 and is refused without it', () => {
    const f = fight('sabre', ['lunge'], { m: 0 }); rig({ hit: true, die: 12 });
    expect(f.pv('lunge', { targetId: f.foe.id }).momentum).toEqual({ now: 0, after: 0 });
    expect(f.tech('lunge', { targetId: f.foe.id })).toBeNull(); expect(f.momentum(f.pc)).toBe(0); expect(f.pc.openerUsed).toBe(true);
    f.cb.round += 1; f.turn(f.pc); // the next turn
    expect(f.tech('lunge', { targetId: f.foe.id })).toBe(NEEDS);
    f.momentum(f.pc, 2); expect(f.pv('lunge', { targetId: f.foe.id }).momentum).toEqual({ now: 2, after: 1 });
    expect(f.tech('lunge', { targetId: f.foe.id })).toBeNull(); expect(f.momentum(f.pc)).toBe(1);
  });
  it('an Opener the handler refuses doesn\'t use the free one up', () => {
    const f = fight('sabre', ['lunge'], { foes: [{ at: 'H5' }], m: 0 });
    expect(f.tech('lunge', { targetId: f.foe.id })).toMatch(/Too far/); expect(f.pc.openerUsed).toBeUndefined();
  });
});

describe('4. walking costs Momentum', () => {
  const far = { foes: [{ at: 'H8' }] };
  it('a walk: −1 a tile (2 tiles drop 2); never below 0', () => {
    const f = fight('sabre', [], { ...far, m: 3 });
    expect(f.walk(f.pc, 'C3')).toBeNull(); expect(f.momentum(f.pc)).toBe(1);
    expect(f.walk(f.pc, 'C1')).toBeNull(); expect(f.momentum(f.pc)).toBe(0);
  });
  it('a Sprint and a Disengage cost the same', () => {
    const f = fight('sabre', [], { ...far, m: 3 });
    expect(f.walk(f.pc, 'C3', 'sprint')).toBeNull(); expect(f.momentum(f.pc)).toBe(1);
    const g = fight('sabre', [], { m: 3 });
    expect(g.walk(g.pc, 'B5', 'disengage')).toBeNull(); expect(g.momentum(g.pc)).toBe(2);
  });
  it('a forced move costs none (a Shove\'s push)', () => {
    const f = fight('sabre', ['shove'], { foes: [{ at: 'D5', weapon: 'sabre' }] }); weak(f.foe); f.pc.strength = 20;
    f.momentum(f.foe, 2); rig({ die: 15 });
    expect(f.tech('shove', { targetId: f.foe.id })).toBeNull();
    expect(f.foe.pos).toBe(f.tile('F5')); expect(f.momentum(f.foe)).toBe(2);
  });
  it('a Link\'s own move costs none: Sidestep, and Drag\'s step', () => {
    const f = fight('sabre', ['sidestep', 'drag'], { m: 2 }); weak(f.foe);
    expect(f.tech('sidestep', { targetId: f.foe.id, tile: f.tile('D4') })).toBeNull(); expect(f.pc.pos).toBe(f.tile('D4')); expect(f.momentum(f.pc)).toBe(2);
    const at = f.pc.pos; expect(f.tech('drag', { targetId: f.foe.id })).toBeNull(); expect(f.pc.pos).not.toBe(at); expect(f.momentum(f.pc)).toBe(2); // the swap moved both
  });
  it('a technique\'s own step or run costs none: Lunge\'s step, Charge\'s run', () => {
    const f = fight('sabre', ['lunge'], { m: 2 }); f.put(f.pc, 'B5'); rig({ hit: true, die: 12 });
    expect(f.tech('lunge', { targetId: f.foe.id })).toBeNull(); expect(f.pc.pos).toBe(f.tile('C5')); expect(f.momentum(f.pc)).toBe(2);
    const c = fight('sabre', ['charge'], { foes: [{ at: 'F5' }], m: 2 }); c.put(c.pc, 'A5'); rig({ hit: true, die: 12 });
    expect(c.tech('charge', { targetId: c.foe.id })).toBeNull(); expect(c.pc.pos).toBe(c.tile('E5')); expect(c.momentum(c.pc)).toBe(2);
    // but a run walked before the Charge is a walk
    const w = fight('sabre', ['charge'], { foes: [{ at: 'F5' }], m: 3 }); w.put(w.pc, 'A5');
    expect(w.walk(w.pc, 'D5')).toBeNull(); expect(w.momentum(w.pc)).toBe(0);
  });
});

describe('5. being hit costs Momentum', () => {
  it('a damaging hit: −1, melee or ranged; a miss costs none', () => {
    const f = fight('sabre', [], { m: 3 }); f.turn(f.foe); rig({ hit: true, die: 12 });
    expect(hitPc(f)).toBeGreaterThan(0); expect(f.momentum(f.pc)).toBe(2);
    expect(hitPc(f, 'shot')).toBeGreaterThan(0); expect(f.momentum(f.pc)).toBe(1);
    rig({ hit: false, die: 5 }); expect(hitPc(f)).toBe(0); expect(f.momentum(f.pc)).toBe(1);
  });
  it('not while the Guard technique is up; again once it has ended', () => {
    const f = fight('sabre', ['guard'], { m: 2 }); expect(f.tech('guard')).toBeNull();
    expect(f.pv('guard').ok).toBe(false); // already on Guard
    f.pass(); f.turn(f.foe); rig({ hit: true, die: 12 });
    expect(hitPc(f)).toBeGreaterThan(0); expect(hitPc(f, 'shot')).toBeGreaterThan(0); expect(f.momentum(f.pc)).toBe(2);
    f.turn(f.pc); f.pass(); f.turn(f.foe); // the Guard ended at the PC's turn start
    expect(hitPc(f)).toBeGreaterThan(0); expect(f.momentum(f.pc)).toBe(1);
  });
  it('the Guard card says so', () => {
    const f = fight('sabre', ['guard']);
    expect(f.pv('guard').notes.join(' ')).toMatch(/Your Momentum doesn't drop when you are hit\./);
    expect(phys.TECHNIQUE.guard.text).toMatch(/doesn't drop when you are hit/);
  });
  it('not for a hit that was Parried; a lost Parry costs the 1', () => {
    const f = fight('maul', ['parry'], { foes: [{ at: 'D5', weapon: 'sabre' }], m: 2 }); f.turn(f.foe); f.foe.attack = -40; rig({ hit: true, die: 10 });
    expect(hitPc(f)).toBeGreaterThan(0); expect(f.cb.log.some((l) => /the hit is halved/.test(l))).toBe(true); expect(f.momentum(f.pc)).toBe(2);
    const g = fight('maul', ['parry'], { foes: [{ at: 'D5', weapon: 'sabre' }], m: 2 }); g.turn(g.foe); g.foe.attack = 100; rig({ hit: true, die: 10 });
    expect(hitPc(g)).toBeGreaterThan(0); expect(g.cb.log.some((l) => /it gets through/.test(l))).toBe(true); expect(g.momentum(g.pc)).toBe(1);
  });
  it('not while the unit holds Guard points', () => {
    const f = fight('sabre', [], { m: 2 }); f.pc.resMax!.guard = 5; f.pc.res!.guard = 2; f.turn(f.foe); rig({ hit: true, die: 12 });
    hitPc(f); expect(f.pc.res!.guard).toBe(1); expect(f.momentum(f.pc)).toBe(2); // a point soaked part of the hit: the Momentum stays
    expect(hitPc(f)).toBeGreaterThan(0); expect(f.pc.res!.guard).toBe(1); expect(f.momentum(f.pc)).toBe(1); // the kept point soaks nothing: it protects nothing
  });
});

describe('6. the variety bonus is gone', () => {
  it('no number, and a different technique next earns nothing extra', () => {
    expect(phys.PHYS_RULES.momentum.variety_bonus).toBeUndefined();
    const f = fight('sabre', ['sidestep'], { m: 0 }); rig({ hit: true, die: 12 });
    f.tech('sidestep', { targetId: f.foe.id, tile: f.tile('D4') });
    expect(f.pv('cut', { targetId: f.foe.id }).momentum).toEqual({ now: 0, after: 1 });
    f.tech('cut', { targetId: f.foe.id }); expect(f.momentum(f.pc)).toBe(1);
    expect(f.bound(() => phys.physView(f.cb, f.pc, 'pc')).momentum!.hint).not.toMatch(/\+1 more/);
  });
});

describe('7. no technique gives Momentum by its text, but Parry\'s Light line', () => {
  it('Ambush costs none (even after the fight\'s first Opener) and gives none', () => {
    const f = fight('sabre', ['ambush'], { m: 0 }); f.pc.openerUsed = true; f.pc.hidden = true; f.pc.hideEntry = 1; f.pc.ambushUsed = 0; rig({ hit: true, die: 12 });
    expect(phys.momentumCost(f.pc, phys.TECHNIQUE.ambush)).toBe(0);
    expect(f.pv('ambush', { targetId: f.foe.id }).momentum).toEqual({ now: 0, after: 0 });
    expect(f.tech('ambush', { targetId: f.foe.id })).toBeNull(); expect(f.momentum(f.pc)).toBe(0);
    expect(phys.TECHNIQUE.ambush.text).toMatch(/costs no Momentum/);
  });
  it('Feint, Shove, Trip and Drag that work give none; Flurry gives none; no text still promises it', () => {
    const f = fight('sabre', ['feint', 'shove'], { m: 0 }); weak(f.foe); f.pc.strength = 20; rig({ die: 15 });
    expect(f.tech('feint', { targetId: f.foe.id })).toBeNull(); expect(f.pc.setUp).toBeTruthy();
    expect(f.tech('shove', { targetId: f.foe.id })).toBeNull(); expect(f.foe.pos).toBe(f.tile('F5'));
    expect(f.momentum(f.pc)).toBe(0);
    const g = fight('sabre', ['trip', 'drag'], { m: 0 }); weak(g.foe);
    expect(g.tech('drag', { targetId: g.foe.id })).toBeNull(); expect(g.tech('trip', { targetId: g.foe.id })).toBeNull(); // (a natural 20 still saves: either way)
    expect(g.momentum(g.pc)).toBe(0);
    for (const id of ['feint', 'shove', 'flurry', 'pull_out', 'trip', 'drag', 'bind', 'throw']) expect(phys.TECHNIQUE[id].text, id).not.toMatch(/(gives|gain|for) (\d )?Momentum|hit for Momentum/i);
  });
  it('Parry, Light: a won parry still gives 1', () => {
    const f = fight('sabre', ['parry'], { foes: [{ at: 'D5', weapon: 'sabre' }], m: 1 }); f.turn(f.foe); f.foe.attack = -40; rig({ hit: true, die: 10 });
    expect(hitPc(f)).toBeGreaterThan(0); expect(f.momentum(f.pc)).toBe(2);
    expect(phys.TECHNIQUE.parry.lines.find((l) => l.props.includes('light'))!.text).toMatch(/gain 1 Momentum/);
  });
});

describe('8. Momentum carries from turn to turn', () => {
  it('a turn with no attack keeps it, for a player and for an enemy', () => {
    const f = fight('sabre', [], { foes: [{ at: 'D5', weapon: 'sabre' }], m: 2 }); f.momentum(f.foe, 2);
    f.pass(); expect(f.momentum(f.pc)).toBe(2);
    f.turn(f.foe); f.pass(); expect(f.momentum(f.foe)).toBe(2);
    f.turn(f.pc); expect(f.momentum(f.pc)).toBe(2);
  });
});

describe('9. the maximums are unchanged', () => {
  it('3 for everyone (5 for a Fighter, by the data); the plain attack stops at the cap', () => {
    expect(phys.PHYS_RULES.momentum).toMatchObject({ max: 3, fighter_max: 5 });
    const f = fight('sabre', [], { m: 3 }); rig({ hit: true, die: 12 });
    expect(f.pv('cut', { targetId: f.foe.id }).momentum).toEqual({ now: 3, after: 3 });
    f.tech('cut', { targetId: f.foe.id }); expect(f.momentum(f.pc)).toBe(3);
  });
});

describe('10. enemies follow the same rules', () => {
  const foeFight = (techs: string[]) => { const f = fight('sabre', [], { foes: [{ at: 'D5', weapon: 'sabre' }] }); f.turn(f.foe); f.foe.techs = techs; return f; };
  const pick = (f: F) => f.bound(() => phys.aiTechnique(f.cb, f.foe))?.id || null;
  it('an enemy\'s plain swing gives it 1; a hit on it costs it 1', () => {
    const f = foeFight([]); f.momentum(f.foe, 1); rig({ hit: true, die: 12 });
    f.bound(() => resolveAttack(f.cb, f.g.rng, f.foe, f.pc, 'melee', null, { noAp: true })); expect(f.momentum(f.foe)).toBe(2);
    f.turn(f.pc); f.tech('cut', { targetId: f.foe.id }); expect(f.momentum(f.foe)).toBe(1);
  });
  it('the AI never plans a Strike it can\'t pay for, and uses one it can', () => {
    const f = foeFight(['bash']); f.momentum(f.foe, 0);
    expect(pick(f)).toBeNull(); expect(f.use(f.foe, 'bash', { targetId: f.pc.id })).toBe(NEEDS);
    f.momentum(f.foe, 1); expect(pick(f)).toBe('bash');
    rig({ hit: true, die: 12 }); expect(f.use(f.foe, 'bash', { targetId: f.pc.id })).toBeNull(); expect(f.momentum(f.foe)).toBe(0);
  });
  it('the AI takes its free first Opener, and not a second one without Momentum', () => {
    const f = foeFight(['lunge']); f.momentum(f.foe, 0);
    expect(pick(f)).toBe('lunge');
    f.foe.openerUsed = true; expect(pick(f)).toBeNull();
    f.momentum(f.foe, 1); expect(pick(f)).toBe('lunge');
  });
});

describe('11. the card and the hint', () => {
  it('the plain attack shows +1 on a hit; a Strike and a paid Opener show the 1 they spend', () => {
    const f = fight('sabre', ['lunge', 'bash', 'sidestep'], { m: 2 });
    expect(f.pv('cut', { targetId: f.foe.id }).momentum).toEqual({ now: 2, after: 3 });
    expect(f.pv('bash', { targetId: f.foe.id }).momentum).toEqual({ now: 2, after: 1 });
    expect(f.pv('lunge', { targetId: f.foe.id }).momentum).toEqual({ now: 2, after: 2 }); // the free first Opener
    f.pc.openerUsed = true; expect(f.pv('lunge', { targetId: f.foe.id }).momentum).toEqual({ now: 2, after: 1 });
    expect(f.pv('sidestep', { targetId: f.foe.id, tile: f.tile('D4') }).momentum).toEqual({ now: 2, after: 2 });
    const before = JSON.stringify(f.g); f.pv('bash', { targetId: f.foe.id }); expect(JSON.stringify(f.g)).toBe(before); // a preview spends nothing
  });
  it('the meter\'s hint states the rule in plain words', () => {
    const f = fight('sabre', []);
    const m = f.bound(() => phys.physView(f.cb, f.pc, 'pc')).momentum!;
    expect(m).toMatchObject({ now: 1, max: 3 });
    expect(m.hint).toBe('A plain attack that hits gives 1. A Strike or an Opener spends 1; each tile you walk and each hit you take costs 1.');
  });
});

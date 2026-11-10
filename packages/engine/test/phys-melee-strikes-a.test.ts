// Physical 2.0 (rules 1.12), melee Strikes, part A: Sweep (7), Bash (8), Sunder (9), Flurry (10).
import { describe, it, expect, beforeEach } from 'vitest';
import { phys, objectsOf, type Unit, type TechPreview } from '../src';
import { physFight, rig, type PhysSpec } from './helpers/physfight';

const MINE = ['sweep', 'bash', 'sunder', 'flurry'];
beforeEach(() => rig(null));

/** A fight: the PC at C5 with a weapon and these four ready; tough foes (no kills, no injuries) where named. */
function fight(weapon: string, foesAt: string[], o: { pc?: Partial<PhysSpec>; ally?: Partial<PhysSpec>; armour?: number; seed?: string } = {}) {
  const specs: PhysSpec[] = [{ weapon, known: MINE, skills: { athletics: 6, raw_power: 6 }, ...o.pc }];
  if (o.ally) specs.push({ weapon: 'sabre', ...o.ally });
  const f = physFight(specs, foesAt.map((at) => ({ at, tier: 'elite' })), { seed: o.seed || 'STRIKES-A' });
  f.put(f.pc, 'C5');
  f.foes.forEach((v, i) => { f.put(v, foesAt[i]); Object.assign(f.unit(v.id), { hp: 999, maxHp: 999, injResist: 100, ...(o.armour != null ? { armour: o.armour } : {}) }); });
  if (o.ally) { f.put(f.pcs[1], 'C7'); Object.assign(f.unit(f.pcs[1].id), { hp: 999, maxHp: 999, injResist: 100 }); }
  f.turn(f.pc);
  return f;
}
const hp = (f: ReturnType<typeof fight>, u: Unit) => f.unit(u.id).hp;
/** What a preview's hits would deal, roll by roll (no crit): the engine's max(1, floor(total) − armour). */
const dealt = (pv: TechPreview, id: string) => pv.attacks.filter((a) => a.target === id).reduce((n, a) => n + Math.max(1, Math.floor(a.pv.dmg!.total) - a.pv.dmg!.armour), 0);
const label = (pv: TechPreview, i: number, l: string) => pv.attacks[i].pv.terms!.find((t) => t.label === l)?.v;
const melee = (f: ReturnType<typeof fight>) => f.fx('melee').length + f.fx('shot').filter((e: any) => e.thrown).length; // a thrown strike is a shot marked thrown

describe('the four are built', () => {
  it('registered, and the pad shows none of them as not built', () => {
    for (const id of MINE) expect(phys.handlerOf(id), id).toBeTruthy();
    const f = fight('sabre', ['D5']);
    const pad = f.pad().flatMap((g) => g.entries).filter((e) => MINE.includes(e.id));
    expect(pad.map((e) => e.id).sort()).toEqual([...MINE].sort());
    for (const e of pad) { expect(e.built, e.id).toBe(true); expect(e.why, e.id).not.toBe(phys.NOT_BUILT); }
  });
});

describe('Sweep (7)', () => {
  it('base, off its home (a light point blade): the 3-tile arc toward the tile, ×0.7 each, −2, no line; AP is the weapon\'s + 1', () => {
    const f = fight('kemizuchi_duelling_blade', ['D4', 'D5', 'D6', 'B5']);
    const pv = f.pv('sweep', { tile: f.tile('D5') });
    expect(pv.ok).toBe(true); expect(pv.ap).toBe(3);
    expect(pv.attacks.map((a) => a.target).sort()).toEqual([f.foes[0].id, f.foes[1].id, f.foes[2].id].sort()); // not the one behind
    expect(pv.area).toEqual([f.tile('D5'), f.tile('D6'), f.tile('D4')]);
    const cut = f.pv('cut', { targetId: f.foes[1].id }).attacks[0].pv.dmg!.total;
    expect(pv.attacks[0].pv.dmg!.total).toBeCloseTo(cut * 0.7, 1);
    expect(label(pv, 0, 'Sweep off its home weapon')).toBe(-2);
    rig({ hit: true, die: 12 }); const h = f.foes.map((v) => hp(f, v));
    expect(f.tech('sweep', { tile: 'D5' })).toBeNull(); // a map reference works through the reducer
    expect(f.pc.ap).toBe(3); expect(melee(f)).toBe(3);
    f.foes.slice(0, 3).forEach((v, i) => expect(hp(f, v)).toBe(h[i] - dealt(pv, v.id)));
    expect(hp(f, f.foes[3])).toBe(h[3]);
  });
  it('the target picks the direction when no tile is named; refused with no direction, nobody in the arc, or only allies', () => {
    const f = fight('sabre', ['D5']);
    expect(f.pv('sweep', { targetId: f.foe.id }).ok).toBe(true);
    expect(f.tech('sweep')).toMatch(/direction/);
    expect(f.tech('sweep', { tile: 'B5' })).toMatch(/No one to strike/);
    const g = fight('sabre', ['J5'], { ally: {} }); g.put(g.pcs[1], 'D5');
    expect(g.tech('sweep', { tile: 'D5' })).toMatch(/Only allies/);
    expect(g.pc.ap).toBe(6); // nothing spent on a refusal
  });
  it('Reach: the arc is 2 tiles out (a glaive); without Reach the same arc finds nobody', () => {
    const f = fight('glaive', ['E4', 'E5', 'E6']);
    const pv = f.pv('sweep', { tile: f.tile('D5') }); expect(pv.ok).toBe(true); expect(pv.attacks.length).toBe(3);
    expect(pv.area).toEqual([f.tile('E5'), f.tile('E6'), f.tile('E4')]);
    expect(f.pv('sweep', { tile: f.tile('D5'), line: 'heavy' }).why).toMatch(/No one to strike/); // the heavy line chosen instead
    const g = fight('sabre', ['E4', 'E5', 'E6']); expect(g.pv('sweep', { tile: g.tile('D5') }).why).toMatch(/No one to strike/);
  });
  it('Heavy: every adjacent unit, not just the arc; without it only the arc', () => {
    const f = fight('ork_machete', ['B5', 'D5', 'C4']);
    const pv = f.pv('sweep', { tile: f.tile('D5') }); expect(pv.ok).toBe(true); expect(pv.attacks.length).toBe(3); expect(pv.ap).toBe(4);
    expect(f.pv('sweep').ok).toBe(true); // no direction needed
    const g = fight('sabre', ['B5', 'D5', 'C4']); expect(g.pv('sweep', { tile: g.tile('D5') }).attacks.length).toBe(1);
  });
  it('Edge: each one hit bleeds on a critical; without Edge a critical leaves no bleeding from Sweep', () => {
    const f = fight('sabre', ['D4', 'D5']); rig({ hit: true, die: 20 });
    expect(f.tech('sweep', { tile: 'D5' })).toBeNull();
    for (const v of f.foes) expect(f.unit(v.id).bleed, v.name).toBeGreaterThan(0);
    const g = fight('ork_machete', ['D4', 'D5']); rig({ hit: true, die: 20 }); // Heavy is its only line
    expect(g.tech('sweep', { tile: 'D5' })).toBeNull();
    for (const v of g.foes) expect(g.unit(v.id).bleed || 0, v.name).toBe(0);
  });
  it('friendly fire: an ally in the arc is struck too', () => {
    const f = fight('sabre', ['D5'], { ally: {} }); f.put(f.pcs[1], 'D6');
    const pv = f.pv('sweep', { tile: f.tile('D5') }); expect(pv.attacks.map((a) => a.target)).toContain(f.pcs[1].id);
    expect(pv.notes.some((n) => /Allies/.test(n))).toBe(true);
    rig({ hit: true, die: 12 }); const a0 = hp(f, f.pcs[1]);
    expect(f.tech('sweep', { tile: 'D5' })).toBeNull(); expect(hp(f, f.pcs[1])).toBeLessThan(a0);
  });
  it('Momentum: a Strike spends 1, its hits give none, and it is refused at 0; the card shows it', () => {
    const f = fight('sabre', ['D4', 'D5']); rig({ hit: true, die: 12 }); f.momentum(f.pc, 2);
    expect(f.pv('sweep', { tile: f.tile('D5') }).momentum).toEqual({ now: 2, after: 1 });
    expect(f.tech('sweep', { tile: 'D5' })).toBeNull(); expect(f.momentum(f.pc)).toBe(1); // two hits: none gained
    expect(f.tech('sweep', { tile: 'D5' })).toBeNull(); expect(f.momentum(f.pc)).toBe(0); // a repeat spends 1 again
    f.pc.ap = 6; expect(f.tech('sweep', { tile: 'D5' })).toBe('Needs 1 Momentum: land a plain attack first.'); expect(f.pc.ap).toBe(6);
    const g = fight('sabre', ['D4', 'D5']); rig({ hit: true, die: 12 });
    g.momentum(g.pc, 0); g.tech('cut', { targetId: g.foes[0].id }); expect(g.momentum(g.pc)).toBe(1); // the plain attack gives the 1
    expect(g.pv('sweep', { tile: g.tile('D5') }).momentum).toEqual({ now: 1, after: 0 });
    expect(g.tech('sweep', { tile: 'D5' })).toBeNull(); expect(g.momentum(g.pc)).toBe(0); // no bonus for the change
  });
  it('the enemy AI wants it against two or more, and names the direction', () => {
    const f = fight('sabre', ['D4', 'D5']);
    const r: any = f.bound(() => phys.handlerOf('sweep')!.ai!({ cb: f.cb, u: f.pc, tgt: f.foes[0], line: () => 'edge', num: (_k: string, fb = 0) => fb } as any));
    expect(r.score).toBeGreaterThan(5); expect(r.args.tile).toBe(f.tile('D5'));
  });
});

describe('Bash (8)', () => {
  it('base (a sabre): ×0.5, then a Body save or Dazed; AP is the weapon\'s', () => {
    const f = fight('sabre', ['D5']); f.unit(f.foe.id).sv = { body: -50, brain: 0, heart: 0 };
    const pv = f.pv('bash', { targetId: f.foe.id });
    expect(pv.ok).toBe(true); expect(pv.ap).toBe(2); expect(pv.saves).toEqual([{ unit: f.foe.id, skills: ['body'], tn: 12 + 2 }]);
    const cut = f.pv('cut', { targetId: f.foe.id }).attacks[0].pv.dmg!.total;
    expect(pv.attacks[0].pv.dmg!.total).toBeCloseTo(cut * 0.5, 1);
    rig({ hit: true, die: 12 }); const h = hp(f, f.foe);
    expect(f.tech('bash', { targetId: f.foe.id })).toBeNull();
    expect(hp(f, f.foe)).toBe(h - dealt(pv, f.foe.id)); expect(f.unit(f.foe.id).dazedNext).toBe(1); expect(f.pc.ap).toBe(4);
  });
  it('a target that saves is not Dazed; a miss asks no save', () => {
    const f = fight('sabre', ['D5']); f.unit(f.foe.id).sv = { body: 50, brain: 0, heart: 0 }; rig({ hit: true, die: 12 });
    f.tech('bash', { targetId: f.foe.id }); expect(f.unit(f.foe.id).dazedNext || 0).toBe(0);
    const g = fight('sabre', ['D5']); g.unit(g.foe.id).sv = { body: -50, brain: 0, heart: 0 }; rig({ hit: false, die: 5 });
    g.tech('bash', { targetId: g.foe.id }); expect(g.unit(g.foe.id).dazedNext || 0).toBe(0);
    expect(g.cb.log.some((l) => /save against Bash/.test(l))).toBe(false);
  });
  it('Blunt: full damage (a maul); without it ×0.5', () => {
    const f = fight('maul', ['D5']);
    const pv = f.pv('bash', { targetId: f.foe.id }), cut = f.pv('cut', { targetId: f.foe.id }).attacks[0].pv.dmg!.total;
    expect(pv.attacks[0].pv.dmg!.total).toBeCloseTo(cut, 1); expect(pv.ap).toBe(3);
  });
  it('Bare: 1 AP less (fists, knuckledusters with the line chosen); a refusal still costs nothing', () => {
    const f = fight('fists', ['D5']); expect(f.pv('bash', { targetId: f.foe.id }).ap).toBe(1);
    rig({ hit: true, die: 12 }); expect(f.tech('bash', { targetId: f.foe.id })).toBeNull(); expect(f.pc.ap).toBe(5);
    const k = fight('knuckledusters', ['D5']);
    expect(k.pv('bash', { targetId: k.foe.id }).ap).toBe(2);                 // Blunt is the first line: full damage, full cost
    expect(k.pv('bash', { targetId: k.foe.id, line: 'bare' }).ap).toBe(1);
    const cut = k.pv('cut', { targetId: k.foe.id }).attacks[0].pv.dmg!.total;
    expect(k.pv('bash', { targetId: k.foe.id, line: 'bare' }).attacks[0].pv.dmg!.total).toBeCloseTo(cut * 0.5, 1); // only the chosen line applies
    const g = fight('fists', ['J5']); expect(g.tech('bash', { targetId: g.foe.id })).toMatch(/reach/); expect(g.pc.ap).toBe(6);
  });
  it('Heavy: on a failed save, pushed 2 tiles instead of Dazed when the player chooses; a held shot sees the push', () => {
    const f = fight('ork_machete', ['D5'], { ally: { weapon: 'ccec_marksman_rifle', skills: { dexterity: 6 } } });
    f.put(f.pc, 'C9'); f.put(f.foe, 'D9'); f.unit(f.foe.id).sv = { body: -50, brain: 0, heart: 0 };
    f.turn(f.pcs[1]); expect(f.tech('overwatch')).toBeNull(); f.turn(f.pc);
    const pv = f.pv('bash', { targetId: f.foe.id, opt: 'push' }); expect(pv.moves).toEqual([{ unit: f.foe.id, to: f.tile('G9') }]);
    expect(f.pv('bash', { targetId: f.foe.id }).notes.some((n) => /push/.test(n))).toBe(true);
    rig({ hit: true, die: 12 });
    expect(f.tech('bash', { targetId: f.foe.id, opt: 'push' })).toBeNull();
    expect(f.unit(f.foe.id).pos).toBe(f.tile('G9')); expect(f.unit(f.foe.id).dazedNext || 0).toBe(0);
    expect(f.unit(f.pcs[1].id).watch).toBeUndefined(); expect(f.fx('overwatch').length).toBe(1); // the held shot fired at the pushed foe
    const g = fight('ork_machete', ['D5']); g.unit(g.foe.id).sv = { body: -50, brain: 0, heart: 0 }; rig({ hit: true, die: 12 });
    g.tech('bash', { targetId: g.foe.id }); expect(g.unit(g.foe.id).pos).toBe(g.tile('D5')); expect(g.unit(g.foe.id).dazedNext).toBe(1);
    const s = fight('sabre', ['D5']); s.unit(s.foe.id).sv = { body: -50, brain: 0, heart: 0 }; rig({ hit: true, die: 12 });
    s.tech('bash', { targetId: s.foe.id, opt: 'push' }); expect(s.unit(s.foe.id).pos).toBe(s.tile('D5')); // no Heavy: no push
  });
  it('Stopped once is the ranged techniques\' rule: a melee push still moves a target that is Stopped, and sets none', () => {
    const f = fight('ork_machete', ['D5']); f.put(f.pc, 'C9'); f.put(f.foe, 'D9'); f.unit(f.foe.id).sv = { body: -50, brain: 0, heart: 0 }; f.unit(f.foe.id).stopped = 1;
    rig({ hit: true, die: 12 }); f.tech('bash', { targetId: f.foe.id, opt: 'push' });
    expect(f.unit(f.foe.id).pos).toBe(f.tile('G9')); expect(f.unit(f.foe.id).stopped).toBe(1);
  });
});

describe('Sunder (9)', () => {
  it('base (a light point blade): ×0.7; a hit takes 5 armour for the fight, once per target per attacker', () => {
    const f = fight('throwing_knives', ['D5'], { armour: 12 });
    const pv = f.pv('sunder', { targetId: f.foe.id }); expect(pv.ok).toBe(true); expect(pv.ap).toBe(2);
    expect(pv.notes.some((n) => /12 → 7/.test(n))).toBe(true);
    const cut = f.pv('cut', { targetId: f.foe.id }).attacks[0].pv.dmg!.total;
    expect(pv.attacks[0].pv.dmg!.total).toBeCloseTo(cut * 0.7, 1);
    rig({ hit: true, die: 12 }); const h = hp(f, f.foe); f.momentum(f.pc, 2); // two Sunders: 1 Momentum each
    expect(f.tech('sunder', { targetId: f.foe.id })).toBeNull();
    expect(hp(f, f.foe)).toBe(h - dealt(pv, f.foe.id)); expect(f.unit(f.foe.id).armour).toBe(7);
    expect(f.tech('sunder', { targetId: f.foe.id })).toBeNull(); expect(f.unit(f.foe.id).armour).toBe(7); // once per attacker
    f.pass(); f.turn(f.pc); expect(f.unit(f.foe.id).armour).toBe(7); // for the rest of the fight
  });
  it('a miss takes nothing; another attacker may sunder the same target', () => {
    const f = fight('throwing_knives', ['D5'], { armour: 12, ally: { weapon: 'throwing_knives', known: ['sunder'] } }); f.put(f.pcs[1], 'D6');
    f.momentum(f.pc, 2); // two Sunders: 1 Momentum each
    rig({ hit: false, die: 5 }); f.tech('sunder', { targetId: f.foe.id }); expect(f.unit(f.foe.id).armour).toBe(12);
    rig({ hit: true, die: 12 }); f.tech('sunder', { targetId: f.foe.id }); expect(f.unit(f.foe.id).armour).toBe(7);
    f.turn(f.pcs[1]); expect(f.tech('sunder', { targetId: f.foe.id })).toBeNull(); expect(f.unit(f.foe.id).armour).toBe(2);
  });
  it('Blunt or Hook: 10 lower (knuckledusters, a hatchet); never below 0', () => {
    const f = fight('knuckledusters', ['D5'], { armour: 12 }); rig({ hit: true, die: 12 });
    f.tech('sunder', { targetId: f.foe.id }); expect(f.unit(f.foe.id).armour).toBe(2);
    const g = fight('hatchet', ['D5'], { armour: 8 }); rig({ hit: true, die: 12 });
    g.tech('sunder', { targetId: g.foe.id }); expect(g.unit(g.foe.id).armour).toBe(0);
  });
  it('Edge: no armour left, Bleeding instead; with armour left, the ordinary 5; without Edge an unarmoured target only takes the hit', () => {
    const f = fight('sabre', ['D5'], { armour: 0 }); rig({ hit: true, die: 12 });
    expect(f.pv('sunder', { targetId: f.foe.id }).notes.some((n) => /bleeding/i.test(n))).toBe(true);
    f.tech('sunder', { targetId: f.foe.id }); expect(f.unit(f.foe.id).bleed).toBeGreaterThan(0);
    const g = fight('sabre', ['D5'], { armour: 9 }); rig({ hit: true, die: 12 });
    g.tech('sunder', { targetId: g.foe.id }); expect(g.unit(g.foe.id).armour).toBe(4); expect(g.unit(g.foe.id).bleed || 0).toBe(0);
    const h = fight('hatchet', ['D5'], { armour: 0 }); rig({ hit: true, die: 12 }); // Hook is its first line
    h.tech('sunder', { targetId: h.foe.id }); expect(h.unit(h.foe.id).bleed || 0).toBe(0);
    const e = fight('hatchet', ['D5'], { armour: 0 }); rig({ hit: true, die: 12 });
    e.tech('sunder', { targetId: e.foe.id, line: 'edge' }); expect(e.unit(e.foe.id).bleed).toBeGreaterThan(0);
  });
  it('refused out of reach or with no target, at no cost', () => {
    const f = fight('sabre', ['J5']);
    expect(f.tech('sunder', { targetId: f.foe.id })).toMatch(/reach/); expect(f.tech('sunder')).toMatch(/target/); expect(f.pc.ap).toBe(6);
  });
});

describe('Flurry (10)', () => {
  it('base (a machete): two strikes at ×0.6, the second at −1; AP is the weapon\'s + 1; it spends 1 Momentum and its hits give none', () => {
    const f = fight('ork_machete', ['D5']); f.momentum(f.pc, 1);
    const pv = f.pv('flurry', { targetId: f.foe.id }); expect(pv.ok).toBe(true); expect(pv.ap).toBe(4); expect(pv.attacks.length).toBe(2);
    expect(label(pv, 0, 'Flurry')).toBeUndefined(); expect(label(pv, 1, 'Flurry')).toBe(-1);
    const cut = f.pv('cut', { targetId: f.foe.id }).attacks[0].pv.dmg!.total;
    expect(pv.attacks[0].pv.dmg!.total).toBeCloseTo(cut * 0.6, 1);
    expect(pv.momentum).toEqual({ now: 1, after: 0 });
    rig({ hit: true, die: 12 }); const h = hp(f, f.foe);
    expect(f.tech('flurry', { targetId: f.foe.id })).toBeNull();
    expect(melee(f)).toBe(2); expect(hp(f, f.foe)).toBe(h - dealt(pv, f.foe.id)); expect(f.pc.ap).toBe(2); expect(f.momentum(f.pc)).toBe(0);
  });
  it('Light: three strikes (a sabre), each after the first at −1', () => {
    const f = fight('sabre', ['D5']); f.momentum(f.pc, 1); const pv = f.pv('flurry', { targetId: f.foe.id });
    expect(pv.attacks.length).toBe(3); expect(pv.ap).toBe(3); expect(label(pv, 2, 'Flurry')).toBe(-1);
    rig({ hit: true, die: 12 }); f.tech('flurry', { targetId: f.foe.id }); expect(melee(f)).toBe(3); expect(f.momentum(f.pc)).toBe(0); // three hits, no Momentum from them
  });
  it('no variety bonus after a different technique; a repeat spends 1 again; a miss spends it all the same', () => {
    const f = fight('knuckledusters', ['D5']); rig({ hit: true, die: 12 });
    f.tech('cut', { targetId: f.foe.id }); f.momentum(f.pc, 3);
    expect(f.pv('flurry', { targetId: f.foe.id, line: 'bare' }).momentum).toEqual({ now: 3, after: 2 });
    f.tech('flurry', { targetId: f.foe.id, line: 'bare' }); expect(f.momentum(f.pc)).toBe(2);
    const g = fight('knuckledusters', ['D5']); rig({ hit: true, die: 12 }); g.momentum(g.pc, 2);
    g.tech('flurry', { targetId: g.foe.id, line: 'bare' }); expect(g.momentum(g.pc)).toBe(1);
    g.tech('flurry', { targetId: g.foe.id, line: 'bare' }); expect(g.momentum(g.pc)).toBe(0);
    const m = fight('knuckledusters', ['D5']); rig({ hit: false, die: 5 }); m.momentum(m.pc, 1); m.tech('flurry', { targetId: m.foe.id, line: 'bare' }); expect(m.momentum(m.pc)).toBe(0);
  });
  it('Bare: each hit after the first marks the next Bind or Throw Down against the target this turn; without Bare, no mark', () => {
    const f = fight('fists', ['D5']); rig({ hit: true, die: 12 }); f.momentum(f.pc, 1);
    expect(f.tech('flurry', { targetId: f.foe.id })).toBeNull(); // fists: Light is first, so the player picks Bare
    expect(f.pc.setUp).toBeUndefined();
    f.momentum(f.pc, 1); f.pc.ap = 6;
    expect(f.tech('flurry', { targetId: f.foe.id, line: 'bare' })).toBeNull();
    expect(f.pc.setUp).toMatchObject({ target: f.foe.id, hit: 1, only: ['bind', 'throw_down'] });
    expect(f.pv('cut', { targetId: f.foe.id }).attacks[0].pv.terms!.some((t) => t.label === 'Flurry')).toBe(false); // not for a Cut
  });
  it('Thrown: two targets in throwing range; the weapon lands in the pile on the last tile and the hand is empty', () => {
    const f = fight('throwing_knives', ['F5', 'G7']);
    const args = { targetIds: [f.foes[0].id, f.foes[1].id], line: 'thrown' };
    const pv = f.pv('flurry', args); expect(pv.ok).toBe(true); expect(pv.attacks.map((a) => a.target)).toEqual([f.foes[0].id, f.foes[1].id]);
    expect(pv.notes.some((n) => /lands at G7/.test(n))).toBe(true);
    expect(f.pv('flurry', { targetId: f.foes[0].id }).why).toMatch(/reach/); // Light, the first line: no throws
    rig({ hit: true, die: 12 }); const h = f.foes.map((v) => hp(f, v));
    expect(f.tech('flurry', args)).toBeNull();
    f.foes.forEach((v, i) => expect(hp(f, v)).toBe(h[i] - dealt(pv, v.id)));
    expect(f.pc.weapon).toBe('fists'); expect(f.char(f.pc).weapon).toBe('fists');
    const pile = objectsOf(f.cb).find((o) => o.pos === f.tile('G7') && (o as any).items);
    expect(((pile as any)?.items || []).some((it: any) => it.item === 'throwing_knives' && it.pack?.dur != null)).toBe(true);
    const g = fight('throwing_knives', ['L5']); expect(g.tech('flurry', { targetId: g.foe.id, line: 'thrown' })).toMatch(/throwing range/); expect(g.pc.ap).toBe(6);
    expect(g.pc.weapon).toBe('throwing_knives');
  });
  it('refused with no target or out of reach, at no cost', () => {
    const f = fight('sabre', ['J5']); expect(f.tech('flurry')).toMatch(/target/); expect(f.tech('flurry', { targetId: f.foe.id })).toMatch(/reach/); expect(f.pc.ap).toBe(6);
  });
});

describe('preview and run are one path', () => {
  const cases: [string, string, string[], (f: ReturnType<typeof fight>) => any][] = [
    ['sweep', 'sabre', ['D4', 'D5', 'D6'], (f) => ({ tile: f.tile('D5') })],
    ['sweep', 'ork_machete', ['B5', 'D5'], () => ({})],
    ['bash', 'ork_machete', ['D5'], (f) => ({ targetId: f.foe.id, opt: 'push' })],
    ['bash', 'fists', ['D5'], (f) => ({ targetId: f.foe.id })],
    ['sunder', 'knuckledusters', ['D5'], (f) => ({ targetId: f.foe.id })],
    ['flurry', 'sabre', ['D5'], (f) => ({ targetId: f.foe.id })],
    ['flurry', 'throwing_knives', ['F5', 'G7'], (f) => ({ targetIds: f.foes.map((v) => v.id), line: 'thrown' })],
  ];
  for (const [id, weapon, at, args] of cases) it(id + ' with ' + weapon + ': the preview changes nothing, and the action does what it showed', () => {
    const f = fight(weapon, at, { armour: 6 }); f.foes.forEach((v) => (f.unit(v.id).sv = { body: -50, brain: 0, heart: 0 }));
    rig({ hit: true, die: 12 }); const a = args(f);
    const before = JSON.stringify(f.g); const pv = f.pv(id, a); expect(JSON.stringify(f.g)).toBe(before);
    expect(pv.ok).toBe(true);
    const h = f.foes.map((v) => hp(f, v)), ap = f.pc.ap, n0 = melee(f);
    expect(f.tech(id, a)).toBeNull();
    expect(f.pc.ap).toBe(ap - pv.ap);
    expect(melee(f) - n0).toBe(pv.attacks.length);
    expect(f.momentum(f.pc)).toBe(pv.momentum!.after);
    f.foes.forEach((v, i) => expect(hp(f, v), v.name).toBe(h[i] - dealt(pv, v.id)));
    for (const m of pv.moves || []) expect(f.unit(m.unit).pos).toBe(m.to);
  });
  it('the same seed gives the same fight', () => {
    const run = () => { const f = fight('sabre', ['D4', 'D5', 'D6']); f.tech('sweep', { tile: 'D5' }); f.tech('flurry', { targetId: f.foes[1].id }); return JSON.stringify(f.cb.units.map((u) => [u.hp, u.pos, u.res, u.bleed])); };
    expect(run()).toBe(run());
  });
});

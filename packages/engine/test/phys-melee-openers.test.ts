// Physical 2.0 (rules 1.12), melee Openers built by the melee lane: Charge (2), Feint (3), Draw Cut (4), Ambush (5).
import { describe, it, expect, beforeEach } from 'vitest';
import { phys, apForTiles, packOf, type Unit } from '../src';
import { physFight, rig } from './helpers/physfight';

beforeEach(() => rig(null));
const SK = { athletics: 6, raw_power: 4 };
/** A fight with one PC holding a weapon and one foe; the PC's turn, the PC first in the order. */
function fight(weapon: string, known: string[], pcAt: string, foeAt: string, o: { seed?: string } = {}) {
  const f = physFight([{ weapon, known, skills: SK }], [{ at: foeAt, tier: 'elite' }], { seed: o.seed });
  f.cb.objects = []; // the yard's crates: clear ground for straight runs
  f.put(f.pc, pcAt); f.put(f.foe, foeAt); f.cb.order = [f.pc.id, ...f.cb.order.filter((id) => id !== f.pc.id)]; f.cb.round = 1;
  f.foe.hp = f.foe.maxHp = 500; // a hit never ends the fight
  f.turn(f.pc); return f;
}
const state = (f: { g: any }) => JSON.stringify(f.g);
/** The foe's saves: always fails (-30) or always saves (+30) but on a natural 20 or 1. */
const saves = (u: Unit, n: number) => { (u as any).sv = { body: n, brain: n, heart: n }; };
/** The save against Charge was rolled and failed (a natural 20 saves even at −30, a natural 1 fails even at +30). */
const failedSave = (f: { cb: any }, id = 'Charge') => f.cb.log.some((l: string) => l.includes('fails the save against ' + id));
const rolledSave = (f: { cb: any }, id = 'Charge') => f.cb.log.some((l: string) => l.includes('against ' + id + ' ('));
const dmgOf = (pv: phys.TechPreview) => pv.attacks[0].pv.dmg!.total;
/** Cut's card as if the PC stood on a tile. */
const cutFrom = (f: ReturnType<typeof physFight>, ref: string) => f.bound(() => phys.previewTechnique(f.cb, { ...f.pc, pos: f.tile(ref) } as Unit, 'cut', { targetId: f.foe.id }));

describe('Charge (2)', () => {
  it('runs a straight line to the target and strikes at +10% a tile; the run is a walk at its own AP', () => {
    const f = fight('sabre', ['charge'], 'B5', 'F5'); rig({ hit: true, die: 12 });
    const pv = f.pv('charge', { targetId: f.foe.id }); expect(pv.ok).toBe(true);
    const run = apForTiles(3, 0, f.pc.movement);
    expect(pv.ap).toBe(2 + run); expect(pv.moves?.[0].to).toBe(f.tile('E5'));
    const cut = cutFrom(f, 'E5');
    expect(dmgOf(pv)).toBeCloseTo(dmgOf(cut) * 1.3, 5);
    const before = state(f); f.pv('charge', { targetId: f.foe.id }); expect(state(f)).toBe(before); // a preview changes nothing
    const hp = f.foe.hp, a = pv.attacks[0].pv.dmg!;
    expect(f.tech('charge', { targetId: f.foe.id })).toBeNull();
    expect(f.pc.pos).toBe(f.tile('E5')); expect(f.pc.ap).toBe(6 - pv.ap);
    expect(hp - f.foe.hp).toBe(Math.max(1, Math.floor(a.total) - a.armour)); // the card's damage is the action's
    expect(f.momentum(f.pc)).toBe(1); // the 1 the fight began with: the first Opener is free, its own run costs none and its hit gives none
  });
  it('a run walked before it this turn counts; the bonus stops at +50%', () => {
    const f = fight('sabre', ['charge'], 'A5', 'H5');
    expect(f.walk(f.pc, 'D5')).toBeNull(); // 3 tiles
    const pv = f.pv('charge', { targetId: f.foe.id }); expect(pv.ok).toBe(true);
    expect(pv.moves?.[0].to).toBe(f.tile('G5')); // runs on in the same line: 6 tiles in all
    const cut = cutFrom(f, 'G5');
    expect(dmgOf(pv)).toBeCloseTo(dmgOf(cut) * 1.5, 5);
    const g = fight('sabre', ['charge'], 'B5', 'F5'); g.walk(g.pc, 'E5'); // 3 tiles, now in reach: no further run
    const pv2 = g.pv('charge', { targetId: g.foe.id }); expect(pv2.ok).toBe(true); expect(pv2.moves).toBeUndefined(); expect(pv2.ap).toBe(2);
  });
  it('is refused without a straight run of 3, and nothing is spent', () => {
    const f = fight('sabre', ['charge'], 'E5', 'F5');
    expect(f.tech('charge', { targetId: f.foe.id })).toMatch(/straight run of 3/); expect(f.pc.ap).toBe(6);
    const g = fight('sabre', ['charge'], 'B5', 'F5');
    expect(g.tech('charge', { targetId: g.foe.id, tile: g.tile('E6') })).toMatch(/straight run/); // E6 isn't on a straight line from B5
    expect(g.tech('charge')).toMatch(/Pick a target/);
    const h = fight('sabre', ['charge'], 'B5', 'F5'); h.pc.conds = { ...(h.pc.conds || {}), grappled: 1 };
    expect(h.tech('charge', { targetId: h.foe.id })).toMatch(/Grappled/); expect(h.pc.ap).toBe(6); expect(h.pc.pos).toBe(h.tile('B5'));
  });
  it('Point ignores 5 armour; a weapon without it does not', () => {
    const f = fight('kemizuchi_duelling_blade', ['charge'], 'B5', 'F5'); f.foe.armour = 8;
    expect(f.pv('charge', { targetId: f.foe.id }).attacks[0].pv.dmg!.armour).toBe(3);
    const g = fight('sabre', ['charge'], 'B5', 'F5'); g.foe.armour = 8;
    expect(g.pv('charge', { targetId: g.foe.id }).attacks[0].pv.dmg!.armour).toBe(8);
  });
  it('Blunt or Heavy: a Body save or Prone; without it, no save', () => {
    // the machete (Heavy): the maul knocks down by itself today (its old weapon skill), so it can't show the save
    expect(fight('knuckledusters', ['charge'], 'B5', 'F5').pv('charge', { targetId: 'foe-0', line: 'blunt' }).saves?.[0].skills).toEqual(['body']);
    const f = fight('ork_machete', ['charge'], 'B5', 'F5'); saves(f.foe, -30); rig({ hit: true, die: 12 });
    const pv = f.pv('charge', { targetId: f.foe.id }); expect(pv.saves?.[0]).toMatchObject({ unit: f.foe.id, skills: ['body'] });
    expect(f.tech('charge', { targetId: f.foe.id })).toBeNull(); expect(rolledSave(f)).toBe(true); expect(!!f.foe.prone).toBe(failedSave(f));
    const g = fight('ork_machete', ['charge'], 'B5', 'F5', { seed: 'charge-2' }); saves(g.foe, -30); rig({ hit: true, die: 12 });
    g.tech('charge', { targetId: g.foe.id }); expect(rolledSave(g)).toBe(true); expect(!!g.foe.prone).toBe(failedSave(g));
    expect(failedSave(f) || failedSave(g)).toBe(true); // at −30 one of two fails (two natural 20s in a row would be needed)
    const k = fight('ork_machete', ['charge'], 'B5', 'F5'); saves(k.foe, 30); rig({ hit: true, die: 12 });
    k.tech('charge', { targetId: k.foe.id }); expect(!!k.foe.prone).toBe(failedSave(k));
    const h = fight('sabre', ['charge'], 'B5', 'F5'); saves(h.foe, -30); rig({ hit: true, die: 12 });
    expect(h.pv('charge', { targetId: h.foe.id }).saves).toBeUndefined();
    h.tech('charge', { targetId: h.foe.id }); expect(!!h.foe.prone).toBe(false);
  });
  it('Stopped once is a ranged rule: a Stopped target still falls Prone to a melee Charge', () => {
    const f = fight('ork_machete', ['charge'], 'B5', 'F5'); saves(f.foe, -30); rig({ hit: true, die: 12 }); (f.foe as any).stopped = 1;
    f.tech('charge', { targetId: f.foe.id }); expect(rolledSave(f)).toBe(true); expect(!!f.foe.prone).toBe(failedSave(f));
    expect(f.cb.log.some((l) => /can't be stopped again/.test(l))).toBe(false);
  });
  it('a held shot fires at the run; with Reach the target can\'t take it', () => {
    // the foe holds an Overwatch; the lance charges it (Point, the first line) and then with the Reach line
    const setUpWatch = (f: ReturnType<typeof fight>) => { f.turn(f.foe); expect(f.use(f.foe, 'overwatch')).toBeNull(); expect((f.foe as any).watch?.id).toBe('overwatch'); f.turn(f.pc); };
    const f = fight('lance', ['charge'], 'A5', 'G5'); setUpWatch(f); rig({ hit: false, die: 5 });
    expect(f.tech('charge', { targetId: f.foe.id })).toBeNull();
    expect(f.cb.log.some((l) => /fires from overwatch/.test(l))).toBe(true);
    const g = fight('lance', ['charge'], 'A5', 'G5'); setUpWatch(g); rig({ hit: false, die: 5 });
    expect(g.pv('charge', { targetId: g.foe.id, line: 'reach' }).notes.join(' ')).toMatch(/can't take its held shot/);
    expect(g.tech('charge', { targetId: g.foe.id, line: 'reach' })).toBeNull();
    expect(g.cb.log.some((l) => /fires from overwatch/.test(l))).toBe(false);
    expect((g.foe as any).watch?.id).toBe('overwatch'); // still held: it never fired
    expect(g.pc.pos).toBe(g.tile('F5')); // the longest run that ends in the lance's reach: 5 tiles, +50%
  });
});

describe('Feint (3)', () => {
  it('a failed Brain save: no damage, +3 and no Answer on the next technique, no Momentum; 1 AP', () => {
    const f = fight('maul', ['feint'], 'C5', 'D5'); saves(f.foe, -30); const hp = f.foe.hp;
    const pv = f.pv('feint', { targetId: f.foe.id }); expect(pv.ok).toBe(true); expect(pv.ap).toBe(1); expect(pv.attacks.length).toBe(0);
    expect(pv.saves?.[0]).toMatchObject({ unit: f.foe.id, skills: ['brain'], tn: 12 + Math.ceil(((f.pc as any).dbf?.raw_power || 0) / 2) }); // rules 1.13: the skill the maul hits with, halved and rounded up
    expect(pv.momentum).toEqual({ now: 1, after: 1 }); // the fight's first Opener is free, and Feint gives none
    const before = state(f); f.pv('feint', { targetId: f.foe.id }); expect(state(f)).toBe(before);
    expect(f.tech('feint', { targetId: f.foe.id })).toBeNull();
    expect(f.pc.ap).toBe(5); expect(f.foe.hp).toBe(hp); expect(f.momentum(f.pc)).toBe(1);
    const terms = f.pv('cut', { targetId: f.foe.id }).attacks[0].pv.terms!;
    expect(terms.find((x) => x.label === 'Feint')?.v).toBe(3);
    expect(phys.canAnswer(f.cb, f.foe, 'riposte', f.pc)).toBe(false);
    rig({ hit: true, die: 12 }); f.tech('cut', { targetId: f.foe.id });
    expect(f.momentum(f.pc)).toBe(2); // +1 the plain attack's hit; no variety bonus
    expect((f.pc as any).setUp).toBeUndefined(); // spent on that technique
  });
  it('a save that holds: nothing but the AP', () => {
    const f = fight('maul', ['feint'], 'C5', 'D5'); saves(f.foe, 30);
    expect(f.tech('feint', { targetId: f.foe.id })).toBeNull();
    expect(f.pc.ap).toBe(5); expect(f.momentum(f.pc)).toBe(1); expect((f.pc as any).setUp).toBeUndefined();
  });
  it('Light: the save is at −2; Hook: a failed save also lowers its weapon', () => {
    const f = fight('sabre', ['feint'], 'C5', 'D5');
    expect(f.pv('feint', { targetId: f.foe.id }).saves?.[0].tn).toBe(14 + Math.ceil(((f.pc as any).dbf?.dexterity || 0) / 2)); // a sabre hits with Dexterity (half its strength, rounded up)
    const g = fight('hatchet', ['feint'], 'C5', 'D5'); saves(g.foe, -30);
    expect(g.pv('feint', { targetId: g.foe.id, line: 'hook' }).saves?.[0].tn).toBe(12 + Math.ceil(((g.pc as any).dbf?.dexterity || 0) / 2)); // a hatchet too
    expect(g.tech('feint', { targetId: g.foe.id, line: 'hook' })).toBeNull();
    expect(g.foe.conds?.lowered).toBeTruthy();
    const h = fight('sabre', ['feint'], 'C5', 'D5'); saves(h.foe, -30); h.tech('feint', { targetId: h.foe.id });
    expect(h.foe.conds?.lowered).toBeFalsy();
  });
  it('refusals: out of reach, no target, not first; nothing spent', () => {
    const f = fight('sabre', ['feint'], 'A5', 'F5');
    expect(f.tech('feint', { targetId: f.foe.id })).toMatch(/Out of reach/); expect(f.tech('feint')).toMatch(/Pick a target/); expect(f.pc.ap).toBe(6);
    const g = fight('sabre', ['feint'], 'C5', 'D5'); rig({ hit: true, die: 12 }); g.tech('cut', { targetId: g.foe.id });
    expect(g.tech('feint', { targetId: g.foe.id })).toMatch(/Opener/);
  });
  it('the first Opener of a fight is free; a second one next turn spends 1 Momentum and is refused without it', () => {
    const f = fight('maul', ['feint'], 'C5', 'D5'); saves(f.foe, -30);
    f.tech('feint', { targetId: f.foe.id }); expect(f.momentum(f.pc)).toBe(1); // free: the 1 the fight began with is kept
    f.cb.round = 2; f.turn(f.pc); f.momentum(f.pc, 0);
    expect(f.pv('feint', { targetId: f.foe.id })).toMatchObject({ ok: false, why: 'Needs 1 Momentum: land a plain attack first.' });
    expect(f.tech('feint', { targetId: f.foe.id })).toMatch(/Needs 1 Momentum/); expect(f.pc.ap).toBe(6);
    f.momentum(f.pc, 2);
    expect(f.pv('feint', { targetId: f.foe.id }).momentum).toEqual({ now: 2, after: 1 });
    expect(f.tech('feint', { targetId: f.foe.id })).toBeNull(); expect(f.momentum(f.pc)).toBe(1); // spent whether or not the save held
  });
});

describe('Draw Cut (4)', () => {
  /** Fists in hand, the given weapons in the pack, the turn begun after. */
  function drawFight(stowed: string[], foeAt = 'D5', o: { first?: boolean } = {}) {
    const f = physFight([{ weapon: 'fists', known: ['draw_cut'], skills: SK }], [{ at: foeAt, tier: 'elite' }]);
    const c = f.char(f.pc); c.pack = [...packOf(c).filter((x) => !x.weapon || phys.weaponSystem(x.weapon) !== 'melee'), ...stowed.map((w) => ({ id: w, name: w, qty: 1, kind: 'weapon' as const, weapon: w }))];
    f.cb.objects = []; f.put(f.pc, 'C5'); f.put(f.foe, foeAt); f.cb.round = 1;
    f.cb.order = o.first === false ? [...f.cb.order.filter((id) => id !== f.pc.id), f.pc.id] : [f.pc.id, ...f.cb.order.filter((id) => id !== f.pc.id)];
    f.turn(f.pc); return f;
  }
  /** The pack index of a stowed weapon (Draw Cut's args.item). */
  const itemOf = (f: ReturnType<typeof physFight>, wid: string) => packOf(f.char(f.pc)).findIndex((x) => x.weapon === wid);
  const dc = (f: ReturnType<typeof physFight>, wid: string, o: Record<string, any> = {}) => ({ targetId: f.foe.id, item: itemOf(f, wid), ...o });
  it('draws the weapon and strikes with it; the cost is its attack −1', () => {
    const f = drawFight(['maul']); rig({ hit: true, die: 12 });
    const pv = f.pv('draw_cut', dc(f, 'maul')); expect(pv.ok).toBe(true); expect(pv.ap).toBe(2); // the maul: 3 − 1
    const before = state(f); f.pv('draw_cut', dc(f, 'maul')); expect(state(f)).toBe(before);
    expect(f.pc.weapon).toBe('fists');
    expect(f.tech('draw_cut', dc(f, 'maul'))).toBeNull();
    expect(f.pc.weapon).toBe('maul'); expect(f.char(f.pc).weapon).toBe('maul'); expect(f.pc.ap).toBe(4);
    expect(packOf(f.char(f.pc)).some((x) => x.weapon === 'maul')).toBe(false);
    expect(f.momentum(f.pc)).toBe(1);
  });
  it('a gun in the hand: the knife is drawn and the gun goes to the pack', () => {
    const f = physFight([{ weapon: 'hellraiser_service_rifle', known: ['draw_cut'], skills: SK }], [{ at: 'D5', tier: 'elite' }]);
    const c = f.char(f.pc); c.pack = [...packOf(c), { id: 'sabre', name: 'sabre', qty: 1, kind: 'weapon' as const, weapon: 'sabre' }];
    f.cb.objects = []; f.put(f.pc, 'C5'); f.put(f.foe, 'D5'); f.foe.hp = f.foe.maxHp = 500; f.turn(f.pc); rig({ hit: true, die: 12 });
    expect(f.tech('draw_cut', dc(f, 'sabre'))).toBeNull(); expect(f.pc.weapon).toBe('sabre');
    expect(packOf(f.char(f.pc)).some((x) => x.weapon === 'hellraiser_service_rifle')).toBe(true);
  });
  it('the preview\'s numbers are the action\'s', () => {
    const f = drawFight(['maul']); rig({ hit: true, die: 12 }); f.foe.armour = 0;
    const pv = f.pv('draw_cut', dc(f, 'maul')), hp = f.foe.hp;
    f.tech('draw_cut', dc(f, 'maul'));
    expect(hp - f.foe.hp).toBe(Math.max(1, Math.floor(dmgOf(pv))));
  });
  it('Edge: Bleeding on a hit; Light: an ambush on a target that hasn\'t acted; neither on a maul', () => {
    const f = drawFight(['sabre']); rig({ hit: true, die: 12 });
    expect(f.tech('draw_cut', dc(f, 'sabre'))).toBeNull(); expect(f.foe.bleed).toBeGreaterThan(0);
    const g = drawFight(['sabre']), h = drawFight(['sabre'], 'D5', { first: false });
    const amb = g.pv('draw_cut', dc(g, 'sabre', { line: 'light' })), late = h.pv('draw_cut', dc(h, 'sabre', { line: 'light' }));
    expect(dmgOf(amb)).toBeCloseTo(dmgOf(late) * (g.pc.ambushMult || 1.5), 5); // the foe acted first in h
    rig({ hit: true, die: 12 }); g.tech('draw_cut', dc(g, 'sabre', { line: 'light' })); expect(g.foe.bleed || 0).toBe(0); // one line only
    const m = drawFight(['maul']); rig({ hit: true, die: 12 }); m.tech('draw_cut', dc(m, 'maul')); expect(m.foe.bleed || 0).toBe(0);
  });
  it('refusals: no item, not stowed since the turn began, out of reach; nothing spent', () => {
    const f = drawFight([]); expect(f.tech('draw_cut', { targetId: f.foe.id })).toMatch(/Pick the weapon to draw/); expect(f.pc.ap).toBe(6);
    const g = drawFight(['sabre'], 'H5'); expect(g.tech('draw_cut', dc(g, 'sabre'))).toBeTruthy(); expect(g.pc.ap).toBe(6); expect(g.pc.weapon).toBe('fists');
    const h = physFight([{ weapon: 'sabre', known: ['draw_cut'], skills: SK }], [{ at: 'D5' }]); h.put(h.pc, 'C5'); h.put(h.foe, 'D5'); h.turn(h.pc);
    h.act({ type: 'combat/stow', unitId: h.pc.id, slot: 'main' } as any);
    expect(h.pc.weapon).toBe('fists'); const ap = h.pc.ap;
    expect(h.tech('draw_cut', { targetId: h.foe.id, item: packOf(h.char(h.pc)).findIndex((x) => x.weapon === 'sabre') })).toMatch(/stowed since the start/);
    expect(h.pc.weapon).toBe('fists'); expect(h.pc.ap).toBe(ap);
  });
});

describe('Ambush (5)', () => {
  const hide = (u: Unit) => { u.hidden = true; u.hideEntry = 1; u.ambushUsed = 0; };
  it('only from Hidden: the Ambush multiplier; it costs no Momentum and gives none', () => {
    const f = fight('sabre', ['ambush'], 'C5', 'D5'); hide(f.pc); rig({ hit: true, die: 12 });
    const pv = f.pv('ambush', { targetId: f.foe.id }), cut = f.pv('cut', { targetId: f.foe.id });
    expect(dmgOf(pv)).toBeCloseTo(dmgOf(cut) * (f.pc.ambushMult || 1.5), 5); expect(pv.momentum).toEqual({ now: 1, after: 1 }); expect(pv.ap).toBe(2);
    const before = state(f); f.pv('ambush', { targetId: f.foe.id }); expect(state(f)).toBe(before);
    expect(f.tech('ambush', { targetId: f.foe.id })).toBeNull();
    expect(f.momentum(f.pc)).toBe(1); expect(f.pc.ap).toBe(4);
    expect(f.cb.log.some((l) => /AMBUSH/.test(l))).toBe(true);
    const g = fight('sabre', ['ambush'], 'C5', 'D5'); expect(g.tech('ambush', { targetId: g.foe.id })).toMatch(/Hidden/); expect(g.pc.ap).toBe(6);
    const m = fight('sabre', ['ambush'], 'C5', 'D5'); hide(m.pc); rig({ hit: false, die: 5 }); m.tech('ambush', { targetId: m.foe.id }); expect(m.momentum(m.pc)).toBe(1);
  });
  it('the card\'s damage is the action\'s, from a fresh Hidden entry and from one whose ambush is spent', () => {
    for (const spent of [false, true]) {
      const f = fight('sabre', ['ambush'], 'C5', 'D5'); hide(f.pc); if (spent) f.pc.ambushUsed = 1; f.foe.armour = 0; rig({ hit: true, die: 12 });
      const pv = f.pv('ambush', { targetId: f.foe.id }), hp = f.foe.hp;
      expect(dmgOf(pv)).toBeCloseTo(dmgOf(f.pv('cut', { targetId: f.foe.id })) * (f.pc.ambushMult || 1.5), 5);
      expect(f.tech('ambush', { targetId: f.foe.id })).toBeNull();
      expect(hp - f.foe.hp, 'spent ' + spent).toBe(Math.max(1, Math.floor(dmgOf(pv) * (1 - ((f.foe as any).ambushTaken || 0)))));
    }
  });
  it('Point: a critical on 18; without Point, 18 is no critical', () => {
    const f = fight('kemizuchi_duelling_blade', ['ambush'], 'C5', 'D5'); hide(f.pc); rig({ die: 18 });
    f.tech('ambush', { targetId: f.foe.id }); expect(f.cb.log.some((l) => /CRITICAL/.test(l))).toBe(true);
    const g = fight('sabre', ['ambush'], 'C5', 'D5'); hide(g.pc); rig({ die: 18 });
    g.tech('ambush', { targetId: g.foe.id }); expect(g.cb.log.some((l) => /CRITICAL/.test(l))).toBe(false);
  });
  it('Bare: no damage; Grappled and Silenced for 1 round; no Momentum given or spent; the grab reveals you', () => {
    const f = fight('fists', ['ambush'], 'C5', 'D5'); hide(f.pc); const hp = f.foe.hp;
    const pv = f.pv('ambush', { targetId: f.foe.id }); expect(pv.ok).toBe(true); expect(pv.attacks.length).toBe(0); expect(pv.momentum).toEqual({ now: 1, after: 1 });
    expect(f.tech('ambush', { targetId: f.foe.id })).toBeNull();
    expect(f.foe.hp).toBe(hp); expect(f.foe.conds?.grappled).toBe(1); expect(f.foe.conds?.silenced).toBe(1);
    expect(f.momentum(f.pc)).toBe(1); expect(f.pc.hidden).toBe(false);
    const g = fight('fists', ['ambush'], 'A5', 'D5'); hide(g.pc); expect(g.tech('ambush', { targetId: g.foe.id })).toMatch(/Walk up/);
  });
});

describe('the pad', () => {
  it('shows the four Openers as built (Draw Cut on the stowed weapon\'s block)', () => {
    const f = fight('sabre', ['charge', 'feint', 'draw_cut', 'ambush'], 'C5', 'D5');
    const c = f.char(f.pc); c.pack = [...packOf(c), { id: 'knife', name: 'knife', qty: 1, kind: 'weapon' as const, weapon: 'sabre' }];
    const op = f.pad().find((g) => g.group === 'opener')!;
    for (const id of ['charge', 'feint', 'ambush']) expect(op.entries.find((e) => e.id === id)?.built, id).toBe(true);
    const dcE = f.bound(() => phys.packPad(f.cb, f.pc)).flatMap((b) => b.entries).find((e) => e.id === 'draw_cut');
    expect(dcE?.built).toBe(true); expect(dcE?.why).not.toBe(phys.NOT_BUILT);
  });
});

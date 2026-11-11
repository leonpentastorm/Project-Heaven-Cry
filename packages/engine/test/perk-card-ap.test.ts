// The perk card shows the AP an action takes (the perk audit, findings 2 and 3; rules 1.14, "Use now: … its AP").
// Wall Run II's "Wall Run strike" and Company Man's "Call RTC extraction" showed free and took AP.
import { describe, expect, it } from 'vitest';
import { perkActionsFor, attackApCost, WEAPON, type Combat, type Unit } from '../src';
import { fightWith, withGame } from './helpers/perkfight';

const at = (u: Unit, k: string) => { u.pos = k; return u; };
const wallAt = (cb: Combat, x: number) => { cb.map = { ...cb.map, solid: Array.from({ length: cb.map.h }, (_, y) => x + ',' + y) }; };
const entry = (f: any, actionId: string) => withGame(f.g, () => perkActionsFor({ u: f.pc, c: f.g.characters[f.pc.charId], cb: f.cb, g: f.g }, 'combat')).find((e) => e.actionId === actionId)!;

describe('Wall Run strike: the card shows the attack\'s AP', () => {
  it('the card shows the AP of an attack with the weapon in hand, not free, and says the run costs AP on top', () => {
    const f = fightWith([{ perks: { wall_run: 'II' }, weapon: 'hellraiser_service_rifle' }], [{ at: 'H6' }]);
    f.turn(f.pc);
    const e = entry(f, 'wall_strike'), shot = attackApCost(WEAPON[f.pc.weapon], 'shot');
    expect(shot).toBeGreaterThan(0); expect(e.ap).toBe(shot);
    expect(e.text).toMatch(/The AP shown is the attack\. Each tile of the run costs its normal AP on top\./);
  });
  it('it is greyed with the reason when you can\'t pay for the attack', () => {
    const f = fightWith([{ perks: { wall_run: 'II' }, weapon: 'hellraiser_service_rifle' }], [{ at: 'H6' }]);
    f.turn(f.pc); f.pc.ap = 1;
    expect(entry(f, 'wall_strike').why).toBe('Needs ' + attackApCost(WEAPON[f.pc.weapon], 'shot') + ' AP.');
  });
  it('using it takes the attack and the run, once each: the shown AP is not paid twice', () => {
    const f = fightWith([{ perks: { wall_run: 'II' }, weapon: 'hellraiser_service_rifle' }], [{ at: 'H6' }]);
    wallAt(f.cb, 3); at(f.pc, '2,5'); f.foe.def = 1; f.turn(f.pc);
    // the same run and the same shot, paid for one at a time, on a twin fight
    const g = fightWith([{ perks: { wall_run: 'II' }, weapon: 'hellraiser_service_rifle' }], [{ at: 'H6' }]);
    wallAt(g.cb, 3); at(g.pc, '2,5'); g.foe.def = 1; g.turn(g.pc);
    const shown = entry(f, 'wall_strike').ap, before = f.pc.ap;
    f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'wall_run', actionId: 'wall_strike', targetId: f.foe.id, tile: '3,5', choice: '4,5' } as any);
    const took = before - f.pc.ap;
    expect(f.pc.pos).toBe('4,5');
    expect(took).toBeGreaterThanOrEqual(shown); // the attack, and the run on top
    const gBefore = g.pc.ap;
    g.act({ type: 'combat/move', unitId: g.pc.id, to: '4,5' } as any); g.act({ type: 'combat/attack', unitId: g.pc.id, targetId: g.foe.id, mode: 'shot' } as any);
    expect(took).toBeLessThanOrEqual(gBefore - g.pc.ap); // never more than walking there and shooting
  });
});

describe('Wall Run strike: a refusal changes nothing', () => {
  const setup = () => { const f = fightWith([{ perks: { wall_run: 'II' }, weapon: 'hellraiser_service_rifle' }], [{ at: 'H6' }]); wallAt(f.cb, 3); at(f.pc, '2,5'); f.turn(f.pc); return f; };
  it('a strike that can\'t be paid for after the run is refused whole: no AP gone, no step taken, the state untouched', () => {
    const f = setup(), shot = attackApCost(WEAPON[f.pc.weapon], 'shot');
    f.pc.ap = shot; // enough for the card, not for the run on top
    const g0 = f.g, ap0 = f.pc.ap, pos0 = f.pc.pos, hp0 = f.foe.hp;
    expect(() => f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'wall_run', actionId: 'wall_strike', targetId: f.foe.id, tile: '4,5', choice: '5,5' } as any)).toThrow();
    expect(f.g).toBe(g0); expect(f.pc.ap).toBe(ap0); expect(f.pc.pos).toBe(pos0); expect(f.foe.hp).toBe(hp0);
  });
  it('not on your turn, not by another player, and not while Downed', () => {
    const f = fightWith([{ perks: { wall_run: 'II' }, weapon: 'hellraiser_service_rifle' }, { owner: 'p2' }], [{ at: 'H6' }]);
    wallAt(f.cb, 3); at(f.pc, '2,5'); f.turn(f.pc);
    const strike = { type: 'combat/perk', unitId: f.pc.id, id: 'wall_run', actionId: 'wall_strike', targetId: f.foe.id, tile: '3,5', choice: '4,5' } as any;
    expect(() => f.act(strike, 'p2')).toThrow(); // another player's character
    f.turn(f.pcs[1]); const ap = f.pc.ap;
    expect(() => f.act(strike)).toThrow(); expect(f.pc.ap).toBe(ap); // not its turn
    f.turn(f.pc); f.pc.downed = true;
    expect(entry(f, 'wall_strike').why).toBe('Downed.');
    expect(() => f.act(strike)).toThrow();
  });
  it('Tier I has no strike: no card for it', () => {
    const f = fightWith([{ perks: { wall_run: 'I' }, weapon: 'hellraiser_service_rifle' }], [{ at: 'H6' }]); f.turn(f.pc);
    expect(entry(f, 'wall_strike')).toBeUndefined();
  });
});

describe('Call RTC extraction: the card shows the AP it takes', () => {
  it('in a fight the card shows all the AP you have left, and says so', () => {
    const f = fightWith([{ traits: ['company_man'] }], [{ at: 'H6' }]);
    f.turn(f.pc); f.pc.ap = 6;
    expect(entry(f, 'rtc_extraction').ap).toBe(6);
    f.pc.ap = 2;
    const e = entry(f, 'rtc_extraction');
    expect(e.ap).toBe(2); expect(e.why).toBeNull();
    expect(e.text).toMatch(/In a fight it takes all the AP you have left/);
  });
  it('using it takes that AP: none is left', () => {
    const f = fightWith([{ traits: ['company_man'] }], [{ at: 'H6' }]);
    f.turn(f.pc); f.pc.ap = 5;
    f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'trait:company_man', actionId: 'rtc_extraction' } as any);
    expect(f.cb.units.find((u) => u.id === f.pc.id)!.ap).toBe(0);
    expect(f.cb.log.some((l) => /RTC extraction team/.test(l))).toBe(true);
  });
});

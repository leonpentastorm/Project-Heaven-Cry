// Two guns in hand (Hands 5d). Each gun jams on its own: a fumble with the off-hand gun jams that gun, not the main one,
// and a jammed gun never stops the other firing. Clearing is ONE action (Leon's ruling, 13 Nov 2026: "move clear jam to
// Both when dual wielding … we have 2 buttons at 2 places for one thing now"): one Clear jam in the Both area clears
// every jammed gun you hold, for the main hand's price once, and resets the Heat they pool. The retired off-hand row's
// id ('clear-off') still resolves to it, for saved turn-card picks. Shoot an object ("Attack an object") has an
// off-hand row of its own: its rounds, its jam, its range and damage.
import { beforeEach, describe, expect, it } from 'vitest';
import './helpers/yard16';
import { actionsFor, sendDescriptor } from '../src';
import { fightWith } from './helpers/perkfight';
import { WEAPON, heatLimit } from '../src';
import { physFight, rig } from './helpers/physfight';
import { offHand, calm } from './helpers/physfight-ranged';

const twoGuns = () => {
  const f = fightWith([{ archetype: 'deadeye', weapon: 'service_pistol' }], [{ at: 'F6' }]); let u = f.turn(f.pc);
  const v = f.unit(u.id); v.offWeapon = 'service_pistol'; v.offAmmo = 5; v.ammo = 7; v.mags = [12, 12]; u = f.unit(u.id);
  return { f, u };
};
const row = (f: any, u: any, id: string) => actionsFor(f.g, u.id, 'host').find((d) => d.id === id);
/** A barricade on a free tile next to the unit. */
const barricade = (f: any, u: any) => {
  const [x, y] = u.pos.split(',').map(Number), cb = f.g.combat, solid = new Set(cb.map.solid || []);
  const at = [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1]].map(([dx, dy]) => (x + dx) + ',' + (y + dy))
    .find((k) => !solid.has(k) && !cb.units.some((w: any) => w.pos === k) && !(cb.objects || []).some((o: any) => o.pos === k))!;
  cb.objects = [...(cb.objects || []), { id: 'bx', kind: 'barricade', name: 'Barricade', pos: at, hp: 60 }];
  return at;
};


describe('two guns: one Clear jam, in the Both area', () => {
  it('both guns jammed: the one Clear jam clears both for one price, and resets the Heat', () => {
    const { f, u } = twoGuns();
    f.unit(u.id).jammed = true; f.unit(u.id).offJammed = true; f.unit(u.id).heat = 3;
    const rows = actionsFor(f.g, u.id, 'host').filter((d) => /^clear/.test(d.id));
    expect(rows.map((d) => [d.id, d.hand])).toEqual([['clear', 'both']]); // no per-weapon rows
    const c = rows[0]; expect(c.available, c.why || '').toBe(true);
    const ap0 = f.unit(u.id).ap;
    f.act(sendDescriptor(f.g, u.id, 'clear', {}, 'host')!);
    const v = f.unit(u.id);
    expect(v.jammed).toBe(false); expect(v.offJammed).toBeFalsy(); expect(v.heat).toBe(0);
    expect(v.ap).toBe(ap0 - c.cost.ap); // one price
    expect(row(f, u, 'clear')!.why).toBe('Not jammed.');
  });

  it('only the off-hand gun jammed: the one Clear jam is enabled and clears it; the main gun still fires meanwhile', () => {
    const { f, u } = twoGuns();
    f.unit(u.id).offJammed = true; f.unit(u.id).heat = 2;
    expect(row(f, u, 'tq:main:shot')?.why || '').not.toMatch(/Jammed/);
    expect(row(f, u, 'tq:off:shot')?.why || '').toMatch(/Jammed/);
    const c = row(f, u, 'clear')!; expect(c.hand).toBe('both'); expect(c.available, c.why || '').toBe(true);
    f.act(sendDescriptor(f.g, u.id, 'clear', {}, 'host')!);
    expect(f.unit(u.id).offJammed).toBeFalsy(); expect(f.unit(u.id).jammed).toBe(false); expect(f.unit(u.id).heat).toBe(0);
  });

  it('only the main gun jammed: the same action clears it, and the off-hand gun still fires meanwhile', () => {
    const { f, u } = twoGuns();
    f.unit(u.id).jammed = true;
    expect(row(f, u, 'tq:off:shot')?.why || '').not.toMatch(/Jammed/);
    f.act(sendDescriptor(f.g, u.id, 'clear', {}, 'host')!);
    expect(f.unit(u.id).jammed).toBe(false);
  });

  it('an old saved pick of the retired off-hand row resolves to the one Clear jam', () => {
    const { f, u } = twoGuns();
    f.unit(u.id).offJammed = true;
    expect(row(f, u, 'clear-off')).toBeUndefined(); // not listed
    f.act(sendDescriptor(f.g, u.id, 'clear-off', {}, 'host')!);
    expect(f.unit(u.id).offJammed).toBeFalsy();
  });

  it('a jammed off-hand gun refuses its own shots; the main gun still fires', () => {
    const { f, u } = twoGuns();
    f.unit(u.id).offJammed = true;
    const offShot = row(f, u, 'tq:off:shot'), mainShot = row(f, u, 'tq:main:shot');
    expect(offShot?.why || '').toMatch(/Jammed/); expect(mainShot?.why || '').not.toMatch(/Jammed/);
  });

  it('one gun: Clear jam stays in that weapon\'s area, unchanged; no off-hand rows', () => {
    const f = fightWith([{ archetype: 'deadeye', weapon: 'service_pistol' }], [{ at: 'F6' }]); const u = f.turn(f.pc);
    expect(row(f, u, 'clear-off')).toBeUndefined(); expect(row(f, u, 'cover-off')).toBeUndefined();
    expect(row(f, u, 'clear')!.hand).toBe('main'); expect(row(f, u, 'clear')!.why).toBe('Not jammed.');
    f.unit(u.id).jammed = true; f.unit(u.id).heat = 4; const ap0 = f.unit(u.id).ap, c = row(f, u, 'clear')!;
    f.act(sendDescriptor(f.g, u.id, 'clear', {}, 'host')!);
    expect(f.unit(u.id).jammed).toBe(false); expect(f.unit(u.id).heat).toBe(0); expect(f.unit(u.id).ap).toBe(ap0 - c.cost.ap);
  });
});

describe('two guns: Attack an object with the off hand', () => {
  it('spends the off-hand gun\'s round, not the main gun\'s, at the main hand\'s price', () => {
    const { f, u } = twoGuns(); const at = barricade(f, u);
    const main = row(f, u, 'cover')!, off = row(f, u, 'cover-off')!;
    expect(off.hand).toBe('off'); expect(off.available, off.why || '').toBe(true); expect(off.cost.ap).toBe(main.cost.ap);
    const ap0 = f.unit(u.id).ap;
    f.act(sendDescriptor(f.g, u.id, 'cover-off', { tile: at }, 'host')!);
    const v = f.unit(u.id);
    expect(v.offAmmo).toBe(4); expect(v.ammo).toBe(7); expect(v.weapon).toBe('service_pistol'); expect(v.ap).toBe(ap0 - off.cost.ap);
    expect((f.g.combat as any).objects.find((o: any) => o.id === 'bx').hp).toBeLessThan(60);
  });

  it('an empty or jammed off-hand gun can\'t shoot an object', () => {
    const { f, u } = twoGuns(); const at = barricade(f, u);
    f.unit(u.id).offAmmo = 0;
    expect(() => f.act(sendDescriptor(f.g, u.id, 'cover-off', { tile: at }, 'host')!)).toThrow(/Empty/);
    f.unit(u.id).offAmmo = 5; f.unit(u.id).offJammed = true;
    expect(() => f.act(sendDescriptor(f.g, u.id, 'cover-off', { tile: at }, 'host')!)).toThrow(/jammed/);
    expect(f.unit(u.id).offAmmo).toBe(5); expect(f.unit(u.id).ammo).toBe(7);
  });
});

// Leon's ruling, 13 Nov 2026 (Hands 5d): Heat is one value both guns share, but a Heat jam lands on the gun that fired.
// Warning Shot is a Press with no attack roll: its round's Heat (looseRound) and the Press's own +1 both jam.
describe('two guns: a Heat jam lands on the gun that fired', () => {
  const OFF = 'decrkm_autopistol';
  const hot = (hand: 'main' | 'off' | null) => {
    const f = physFight([{ weapon: 'service_pistol', known: ['warning_shot', 'aimed_shot'], skills: { dexterity: 6 } }], [{ at: 'H5', tier: 'elite' }]);
    f.put(f.pc, 'C5'); f.put(f.foe, 'H5'); calm(f); if (hand) offHand(f, OFF); f.turn(f.pc);
    const u = f.unit(f.pc.id); u.heat = heatLimit(u, WEAPON[hand === 'off' ? OFF : 'service_pistol']) - 1;
    return f;
  };
  beforeEach(() => rig(null));

  it('an off-hand technique that overheats jams the off-hand gun; the main gun still fires', () => {
    const f = hot('off');
    expect(f.tech('warning_shot', { hand: 'off', targetId: f.foe.id })).toBeNull();
    const u = f.unit(f.pc.id);
    expect(u.offJammed).toBe(true); expect(u.jammed).toBeFalsy();
    expect(f.pv('aimed_shot', { hand: 'main', targetId: f.foe.id }).why || '').not.toMatch(/Jammed/);
  });

  it('an off-hand shot with a roll that overheats jams the off-hand gun', () => {
    const f = hot('off'); rig({ hit: false, die: 5 });
    expect(f.tech('aimed_shot', { hand: 'off', targetId: f.foe.id })).toBeNull();
    const u = f.unit(f.pc.id);
    expect(u.offJammed).toBe(true); expect(u.jammed).toBeFalsy();
  });

  it('a main-hand technique that overheats jams the main gun, not the off-hand one', () => {
    const f = hot('main');
    expect(f.tech('warning_shot', { hand: 'main', targetId: f.foe.id })).toBeNull();
    const u = f.unit(f.pc.id);
    expect(u.jammed).toBe(true); expect(u.offJammed).toBeFalsy();
  });

  it('one weapon: unchanged, the gun jams', () => {
    const f = hot(null);
    expect(f.tech('warning_shot', { targetId: f.foe.id })).toBeNull();
    expect(f.unit(f.pc.id).jammed).toBe(true); expect(f.unit(f.pc.id).offJammed).toBeFalsy();
  });
});

// Two guns in hand: the off-hand gun has its own Clear jam and its own Shoot an object (lead's call for Leon, after live
// 0.23.0: the off hand had neither, so a jammed off-hand gun could never be cleared). Same AP and rule as the main
// hand's, on the off-hand weapon: its jam, its rounds, its range and damage. A fumble with the off-hand gun jams that
// gun, not the main one.
import { describe, expect, it } from 'vitest';
import './helpers/yard16';
import { actionsFor, sendDescriptor } from '../src';
import { fightWith } from './helpers/perkfight';

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

describe('two guns: the off-hand gun\'s own Clear jam', () => {
  it('a jammed off-hand gun is cleared by the off-hand Clear jam, not by the main hand\'s', () => {
    const { f, u } = twoGuns();
    f.unit(u.id).offJammed = true; f.unit(u.id).heat = 3;
    const main = row(f, u, 'clear')!, off = row(f, u, 'clear-off')!;
    expect(off.hand).toBe('off'); expect(main.hand).toBe('main');
    expect(main.why).toBe('Not jammed.'); // the main gun is fine: its Clear jam does nothing for the other gun
    expect(off.available, off.why || '').toBe(true); expect(off.cost.ap).toBe(main.cost.ap); // the same price
    expect(() => f.act(sendDescriptor(f.g, u.id, 'clear', {}, 'host')!)).toThrow(/Not jammed/); // refused
    expect(f.unit(u.id).offJammed).toBe(true);
    const ap0 = f.unit(u.id).ap;
    f.act(sendDescriptor(f.g, u.id, 'clear-off', {}, 'host')!);
    expect(f.unit(u.id).offJammed).toBeFalsy(); expect(f.unit(u.id).jammed).toBe(false);
    expect(f.unit(u.id).heat).toBe(0); expect(f.unit(u.id).ap).toBe(ap0 - off.cost.ap); // the main hand's rule: Heat resets
    expect(row(f, u, 'clear-off')!.why).toBe('Not jammed.');
  });

  it('a jammed main gun is not cleared by the off-hand Clear jam', () => {
    const { f, u } = twoGuns();
    f.unit(u.id).jammed = true;
    expect(row(f, u, 'clear-off')!.why).toBe('Not jammed.');
    expect(() => f.act(sendDescriptor(f.g, u.id, 'clear-off', {}, 'host')!)).toThrow(/Not jammed/);
    expect(f.unit(u.id).jammed).toBe(true);
  });

  it('a jammed off-hand gun refuses its own shots; the main gun still fires', () => {
    const { f, u } = twoGuns();
    f.unit(u.id).offJammed = true;
    const offShot = row(f, u, 'tq:off:shot'), mainShot = row(f, u, 'tq:main:shot');
    expect(offShot?.why || '').toMatch(/Jammed/); expect(mainShot?.why || '').not.toMatch(/Jammed/);
  });

  it('one gun: no off-hand Clear jam or Shoot an object', () => {
    const f = fightWith([{ archetype: 'deadeye', weapon: 'service_pistol' }], [{ at: 'F6' }]); const u = f.turn(f.pc);
    expect(row(f, u, 'clear-off')).toBeUndefined(); expect(row(f, u, 'cover-off')).toBeUndefined();
  });
});

describe('two guns: Shoot an object with the off hand', () => {
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

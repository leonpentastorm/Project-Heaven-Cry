// Two guns in hand (Leon, live 0.23.0, 12 Nov 2026): each gun that is not full can be reloaded on its own, for its own
// AP, and Reload both is offered while both are not full. Reloading one must not block the other. Before this fix the
// descriptors listed no off-hand reload: once the main gun was reloaded, "reload" said Already full and Reload both
// said "reload the off-hand gun alone", with no row to do that.
// Every row also says which hand it belongs to (the Attack tab's areas: main hand, off hand, both).
import { describe, expect, it } from 'vitest';
import './helpers/yard16';
import { actionsFor, sendDescriptor } from '../src';
import { fightWith } from './helpers/perkfight';

const twoGuns = () => {
  const f = fightWith([{ archetype: 'deadeye', weapon: 'service_pistol' }], [{ at: 'F6' }]); let u = f.turn(f.pc);
  const v = f.unit(u.id); v.offWeapon = 'service_pistol'; v.offAmmo = 3; v.ammo = 2; v.mags = [12, 12, 12, 12]; u = f.unit(u.id);
  return { f, u };
};
const row = (f: any, u: any, id: string) => actionsFor(f.g, u.id, 'host').find((d) => d.id === id);

describe('two guns: reload one, then the other', () => {
  it('each gun has its own reload, and Reload both, while both are not full', () => {
    const { f, u } = twoGuns();
    for (const id of ['reload', 'reload-off', 'reload2']) expect(row(f, u, id)?.available, id).toBe(true);
    expect(row(f, u, 'reload')!.hand).toBe('main'); expect(row(f, u, 'reload-off')!.hand).toBe('off'); expect(row(f, u, 'reload2')!.hand).toBe('both');
  });

  it('after the main gun is reloaded, the off-hand gun can still be reloaded (its own AP), and then neither offers more', () => {
    const { f, u } = twoGuns();
    const ap0 = f.unit(u.id).ap;
    f.act(sendDescriptor(f.g, u.id, 'reload', {}, 'host')!);
    const ap1 = f.unit(u.id).ap; expect(ap1).toBeLessThan(ap0); expect(f.unit(u.id).ammo).toBe(12);
    const off = row(f, u, 'reload-off')!;
    expect(off.available, off.why || '').toBe(true);
    expect(row(f, u, 'reload')!.available).toBe(false); // the main gun is full
    expect(row(f, u, 'reload2')!.available).toBe(false); // both are no longer both empty-ish: the engine's own reason
    f.act(sendDescriptor(f.g, u.id, 'reload-off', {}, 'host')!);
    expect(f.unit(u.id).offAmmo).toBe(12); expect(f.unit(u.id).ap).toBe(ap1 - off.cost.ap);
    expect(row(f, u, 'reload-off')!.why).toBe('Already full.');
  });

  it('the off-hand gun first, then the main one', () => {
    const { f, u } = twoGuns();
    f.act(sendDescriptor(f.g, u.id, 'reload-off', {}, 'host')!);
    expect(f.unit(u.id).offAmmo).toBe(12);
    const main = row(f, u, 'reload')!; expect(main.available, main.why || '').toBe(true);
    f.act(sendDescriptor(f.g, u.id, 'reload', {}, 'host')!);
    expect(f.unit(u.id).ammo).toBe(12);
  });

  it('the tactical off-hand reload keeps the old magazine in the pack', () => {
    const { f, u } = twoGuns();
    const d = row(f, u, 'reload-off-tac')!; expect(d.available, d.why || '').toBe(true); expect(d.cost.ap).toBe(row(f, u, 'reload-off')!.cost.ap + 1);
    const before = f.unit(u.id).mags!.length;
    f.act(sendDescriptor(f.g, u.id, 'reload-off-tac', {}, 'host')!);
    expect(f.unit(u.id).offAmmo).toBe(12); expect(f.unit(u.id).mags!.length).toBe(before);
  });

  it('every weapon row names its hand: techniques, pads, the paired attack and the reloads', () => {
    const { f, u } = twoGuns();
    const list = actionsFor(f.g, u.id, 'host');
    for (const d of list.filter((x) => x.id.startsWith('tq:main:') || x.id === 'tpad:main')) expect(d.hand, d.id).toBe('main');
    for (const d of list.filter((x) => x.id.startsWith('tq:off:') || x.id === 'tpad:off')) expect(d.hand, d.id).toBe('off');
    for (const id of ['paired', 'reload2', 'reload2-tac']) expect(list.find((d) => d.id === id)?.hand, id).toBe('both');
    expect(list.find((d) => d.id === 'cover')?.hand).toBe('main');
    expect(list.find((d) => d.id === 'shove')?.hand).toBeUndefined();
  });

  it('one gun: no off-hand reload row', () => {
    const f = fightWith([{ archetype: 'deadeye', weapon: 'service_pistol' }], [{ at: 'F6' }]); const u = f.turn(f.pc);
    expect(row(f, u, 'reload-off')).toBeUndefined(); expect(row(f, u, 'reload')!.hand).toBe('main');
  });
});

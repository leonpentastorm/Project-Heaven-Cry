// Rules 1.56 (Balance 2.0), the unarmed fighter, slice 1 (docs/design/proposals/2026-11-unarmed.md): bare-hand gloves
// are one weapon family. Every glove row carries the Open Hand (items.json `open_hand`, a modifier item named in the
// row's `variant_mods`), whose data toggles on an attack are the family's forms: Jab, Palm, Sweep, Snatch; Flurry, Trip
// and Grapple come with the Open Hand property (techniques.json `comes_with`, `comes_while`: open-hand-2.test.ts). Everything goes through the reducer: the
// descriptor a player clicks (sendDescriptor with the toggle in its mods), the AP it takes, the blow it lands.
import { describe, it, expect } from 'vitest';
import './helpers/yard16';
import { actionsFor, previewDescriptor, sendDescriptor, archetypeWeapons, RACK, LOADOUT, WEAPON, ITEM } from '../src';
import { fightWith, withGame } from './helpers/perkfight';
import { dice } from './golden/harness';
import { condOn } from '../src/magic';
import { canReact } from '../src/tactics';
import { unitSkill } from '../src/physical/core';

const HIT = { die: 10, hit: true };
/** A monk in these gloves next to one foe, on its turn. */
function monk(weapon = 'hand_wraps', tier = 'soldier') {
  const f = fightWith([{ archetype: 'monk', weapon }], [{ at: 'F6', tier }]);
  const [x, y] = f.foe.pos.split(',').map(Number);
  f.g.combat!.units.find((u) => u.side === 'pc')!.pos = (x - 1) + ',' + y;
  const u = f.turn(f.pc);
  return { f, u };
}
const OH = (form: string) => 'relic:open_hand#' + form;
/** One strike through the descriptor the attack pad sends, with these forms on: what it took and what it did. */
function strike(f: any, u: any, forms: string[], d = HIT) {
  const mods = forms.map(OH), pv = previewDescriptor(f.g, u.id, 'tq:main:cut', { targetId: f.foe.id, mods }, 'host');
  const ap0 = f.unit(u.id).ap, hp0 = f.foe.hp, n0 = ((f.g.combat as any).fx || []).length;
  dice(d, () => f.act(sendDescriptor(f.g, u.id, 'tq:main:cut', { targetId: f.foe.id, mods }, 'host')!));
  const fx = ((f.g.combat as any).fx || []).slice(n0);
  return { cost: pv!.ap, took: ap0 - f.unit(u.id).ap, dmg: hp0 - f.foe.hp, fx, foe: f.foe };
}

describe('the Open Hand: the glove family (rules 1.56, the unarmed fighter)', () => {
  it('every glove row carries the Open Hand; bare fists keep their 10 and carry nothing yet (slice 4)', () => {
    for (const id of ['hand_wraps', 'knuckledusters', 'striking_gloves', 'iron_mitts', 'kemizuchi_strikers', 'hellraiser_servo_fist'])
      expect((WEAPON as any)[id].variant_mods, id).toEqual(['open_hand']);
    expect((WEAPON as any).fists.damage).toBe(6); expect((WEAPON as any).fists.variant_mods).toBeUndefined();
    expect((WEAPON as any).fists.grants).toBeUndefined(); expect((WEAPON as any).knuckledusters.grants).toBeUndefined(); // the narrator ops are retired
    expect((ITEM as any).open_hand.category).toBe('mod'); expect((ITEM as any).open_hand.price_credits).toBeUndefined(); // never stocked
  });

  it('the camp: the unarmed archetype\'s free weapon is the hand wraps (cheapest by price), the rack\'s next one up a glove', () => {
    const a = LOADOUT.archetypes.list.find((x: any) => x.id === 'unarmed')!;
    expect(archetypeWeapons(a)[0]).toBe('hand_wraps');
    const r = RACK.find((x) => x.id === 'unarmed')!; expect(r.free).toBe('hand_wraps'); expect(['knuckledusters', 'striking_gloves']).toContain(r.better);
  });

  it('the forms are chips on the attack, and on nothing a gun holder does', () => {
    const { f, u } = monk();
    const pv = previewDescriptor(f.g, u.id, 'tq:main:cut', { targetId: f.foe.id }, 'host');
    expect(pv!.toggles.filter((t) => t.itemKey === 'relic:open_hand').map((t) => t.label)).toEqual(['Jab', 'Palm', 'Sweep', 'Snatch']);
    const g = fightWith([{ archetype: 'monk', weapon: 'service_pistol' }], [{ at: 'F6' }]); const v = g.turn(g.pc);
    const shot = actionsFor(g.g, v.id, 'host').find((d) => d.toggleOn === 'combat/attack')!;
    expect(previewDescriptor(g.g, v.id, shot.id, { targetId: g.foe.id }, 'host')!.toggles.some((t) => t.itemKey === 'relic:open_hand')).toBe(false);
  });

  it('Jab: one AP less and half the blow; it names itself (stance jab)', () => {
    const a = monk(), plain = strike(a.f, a.u, []);
    const b = monk(), jab = strike(b.f, b.u, ['jab']);
    expect(plain.took).toBe(plain.cost); expect(jab.took).toBe(jab.cost); expect(jab.took).toBe(plain.took - 1);
    expect(jab.dmg).toBeGreaterThan(0); expect(jab.dmg).toBeLessThan(plain.dmg); expect(jab.dmg).toBeLessThanOrEqual(Math.ceil(plain.dmg * 0.5)); // the half is taken before armour
    expect(jab.fx.some((e: any) => e.k === 'stance' && e.what === 'jab' && e.target === a.u.id)).toBe(true);
  });

  // rules 1.60 item 4637 (R19): the Palm Staggers (no reaction of any kind until its next turn, no AP lost) and pushes nobody
  it('Palm: a lighter blow, then the target saves or is Staggered (no reaction until its next turn); nobody is pushed', () => {
    let staggered = 0, saved = 0;
    for (let i = 0; i < 6; i++) {
      const { f, u } = monk(); const at0 = f.foe.pos, r = strike(f, u, ['palm']);
      const c = r.fx.find((e: any) => e.k === 'cond' && e.id === 'staggered'); expect(c, 'a save is rolled').toBeTruthy();
      expect(r.foe.pos).toBe(at0); expect(r.fx.some((e: any) => e.k === 'shove')).toBe(false);
      if (c.resisted) { saved++; expect(canReact(f.cb, f.unit(f.foe.id), 'attack')).toBe(true); } else { staggered++; expect(condOn(f.unit(f.foe.id), 'staggered')).toBe(true); expect(canReact(f.cb, f.unit(f.foe.id), 'protect')).toBe(false); }
      expect(r.fx.some((e: any) => e.k === 'stance' && e.what === 'palm')).toBe(true);
      f.turn(f.foe); expect(condOn(f.unit(f.foe.id), 'staggered')).toBe(false); f.turn(u); // its next turn ends it
    }
    expect(staggered + saved).toBe(6);
  });

  it('Sweep: one AP more, a light blow, and the target is Prone (no save); never a Boss', () => {
    const a = monk(), plain = strike(a.f, a.u, []);
    const b = monk(), sw = strike(b.f, b.u, ['sweep']);
    expect(sw.took).toBe(plain.took + 1); expect(sw.dmg).toBeLessThan(plain.dmg);
    expect(sw.foe.prone).toBe(true); expect(sw.fx.some((e: any) => e.k === 'stance' && e.what === 'swept')).toBe(true);
    const c = monk('hand_wraps', 'boss'), bs = strike(c.f, c.u, ['sweep']);
    expect(bs.foe.prone).toBeFalsy(); expect(bs.fx.some((e: any) => e.what === 'swept')).toBe(false);
  });

  it('Snatch: the target saves or drops its weapon; never a Boss', () => {
    const a = monk(), r = strike(a.f, a.u, ['snatch']);
    expect(r.fx.some((e: any) => e.k === 'cond' && e.id === 'disarmed')).toBe(true);
    const b = monk('hand_wraps', 'boss'), s = strike(b.f, b.u, ['snatch']);
    expect(s.fx.some((e: any) => e.k === 'cond' && e.id === 'disarmed')).toBe(false);
  });

  it('one form a blow (the 0.29.0 playtest: two at once is refused), and one control a turn (the shared limit)', () => {
    const a = monk();
    expect(() => strike(a.f, a.u, ['palm', 'sweep'])).toThrow(/One at a time/);
    const r = strike(a.f, a.u, ['palm']);
    const tries = r.fx.filter((e: any) => (e.k === 'cond' && e.id === 'staggered') || (e.k === 'stance' && e.what === 'swept'));
    expect(tries.length).toBe(1);
    const again = strike(a.f, a.u, ['sweep']); // the same turn: Sweep's Prone waits for the next turn
    expect(again.fx.some((e: any) => e.what === 'swept')).toBe(false);
  });

  it('a form does nothing on a miss but the AP', () => {
    const { f, u } = monk(), r = strike(f, u, ['sweep'], { die: 1, hit: false } as any);
    expect(r.dmg).toBe(0); expect(r.foe.prone).toBeFalsy(); expect(r.took).toBe(r.cost);
  });

  it('Flurry, Trip and Grapple come with every glove (the Open Hand property); not with a blade (bare fists wait for P11)', () => {
    for (const w of ['hand_wraps', 'iron_mitts', 'striking_gloves']) {
      const f = fightWith([{ archetype: 'monk', weapon: w }], [{ at: 'F6' }]); const u = f.turn(f.pc);
      const ids = actionsFor(f.g, u.id, 'host').map((d) => d.id);
      for (const t of ['flurry', 'trip', 'grapple']) expect(ids, w + ' ' + t).toContain('tq:main:' + t);
    }
    const f = fightWith([{ archetype: 'monk', weapon: 'legion_gladius' }], [{ at: 'F6' }]); const u = f.turn(f.pc);
    const ids = actionsFor(f.g, u.id, 'host').map((d) => d.id);
    expect(ids).not.toContain('tq:main:trip');
    // rules 1.73 item 5802: with a blade, Grapple comes only from Raw Power 2 (any melee weapon), never from the family
    expect(ids.includes('tq:main:grapple')).toBe(withGame(f.g, () => unitSkill(u, 'raw_power')) >= 2);
  });

  it('the finesse gloves hit with Dexterity and grow with Agility; the force gloves with Raw Power and Strength', () => {
    for (const id of ['striking_gloves', 'kemizuchi_strikers']) expect((WEAPON as any)[id].phys).toMatchObject({ hits_with: 'dexterity', scales_with: ['agility'] });
    for (const id of ['hand_wraps', 'knuckledusters', 'iron_mitts']) expect((WEAPON as any)[id].phys).toMatchObject({ hits_with: 'raw_power', scales_with: ['strength'] });
  });
});

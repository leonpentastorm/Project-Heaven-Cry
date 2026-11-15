// Rules 1.56 (Balance 2.0), the unarmed fighter, slice 2 (docs/design/proposals/2026-11-unarmed.md): the family is
// gated by what the hands hold (P15: self_holds {hands: {props: [open_hand], only: true}}, the techniques' comes_while),
// and its modifier answers its holder's own defence (P14: with_this on a blow aimed at the holder): Open guard (to hit
// it, in Light armour or none, light gloves only), Sway (an Answer: the first blow a round halved), Counter (Riposte comes
// with the family), Breath (1 AP, once a turn). Everything through the reducer with real actions.
import { describe, it, expect } from 'vitest';
import './helpers/yard16';
import { actionsFor, previewDescriptor, sendDescriptor, previewAttack, resolveAttack } from '../src';
import { usable } from '../src/physical/core';
import { fightWith, withGame } from './helpers/perkfight';
import { dice } from './golden/harness';

const HIT = { die: 10, hit: true };
type Spec = { weapon?: string; offHand?: string | null; armourClass?: number; tier?: string; foeWeapon?: string };
/** A monk next to one foe, on the monk's turn. */
function monk(o: Spec = {}) {
  const f = fightWith([{ archetype: 'monk', weapon: o.weapon || 'hand_wraps', offHand: o.offHand === undefined ? null : o.offHand, armourClass: o.armourClass ?? 1 }],
    [{ at: 'F6', tier: o.tier || 'soldier', weapon: o.foeWeapon }]);
  const [x, y] = f.foe.pos.split(',').map(Number);
  f.g.combat!.units.find((u) => u.side === 'pc')!.pos = (x - 1) + ',' + y;
  const u = f.turn(f.pc);
  return { f, u };
}
const ids = (f: any, u: any) => actionsFor(f.g, u.id, 'host').map((d) => d.id);
const forms = (f: any, u: any, action = 'tq:main:cut') => previewDescriptor(f.g, u.id, action, { targetId: f.foe.id }, 'host')!.toggles.filter((t) => t.itemKey === 'relic:open_hand').map((t) => t.label);
/** The foe's to-hit terms against the monk (the attack's own preview, as the enemy's turn sizes it up). */
const guardTerm = (f: any) => withGame(f.g, () => { f.turn(f.foe); const p = previewAttack(f.cb, f.foe, f.pc, 'shot') as any; if (!p.terms) throw new Error('no preview: ' + p.why); return p.terms.find((t: any) => t.label === 'Open guard')?.v ?? 0; });
/** What the monk may use with its main hand (the pad's and the reactions' one list). */
const canUse = (f: any, u: any) => withGame(f.g, () => usable(f.cb, f.unit(u.id), 'main').map((x) => x.id));

describe('P15: the family is what the hands hold (rules 1.56)', () => {
  it('a glove in the main hand and the off hand empty, or a glove in each: Flurry, Trip, Grapple, Riposte and the forms', () => {
    for (const s of [{}, { offHand: 'hand_wraps' }, { weapon: 'iron_mitts' }] as Spec[]) {
      const { f, u } = monk(s), have = ids(f, u);
      for (const t of ['flurry', 'trip', 'grapple']) expect(have, JSON.stringify(s) + ' ' + t).toContain('tq:main:' + t);
      expect(canUse(f, u), 'Counter: Riposte comes with the family').toContain('riposte');
      expect(forms(f, u)).toEqual(['Jab', 'Palm', 'Sweep', 'Snatch']);
    }
  });
  it('the leak is closed: the emanator gauntlet (a focus), a gun in the other hand: no Flurry, Trip or Grapple, no form chips', () => {
    const a = monk({ weapon: 'emanator_gauntlet' }), ha = ids(a.f, a.u);
    for (const t of ['flurry', 'trip', 'grapple']) expect(ha).not.toContain('tq:main:' + t);
    const b = monk({ weapon: 'service_pistol', offHand: 'hand_wraps' }), hb = ids(b.f, b.u);
    for (const t of ['flurry', 'trip', 'grapple']) { expect(hb).not.toContain('tq:main:' + t); expect(hb).not.toContain('tq:off:' + t); }
    const shot = actionsFor(b.f.g, b.u.id, 'host').find((d) => d.toggleOn === 'combat/attack')!;
    expect(previewDescriptor(b.f.g, b.u.id, shot.id, { targetId: b.f.foe.id }, 'host')!.toggles.some((t) => t.itemKey === 'relic:open_hand')).toBe(false);
    const c = monk({ offHand: 'evoker' }); // a glove with a focus in the other hand
    expect(ids(c.f, c.u)).not.toContain('tq:main:flurry'); expect(forms(c.f, c.u)).toEqual([]);
  });
  it('bare fists, a beast\'s bite, a figment\'s claws: Bare alone brings nothing of the family', () => {
    for (const w of ['fists', 'beast_bite', 'figment_claws']) {
      const { f, u } = monk({ weapon: w }), have = ids(f, u);
      for (const t of ['flurry', 'trip']) expect(have, w + ' ' + t).not.toContain('tq:main:' + t);
    }
  });
  it('an enemy never gains the family by holding a glove (a unit with no character holds nothing)', () => {
    const { f } = monk({ foeWeapon: 'iron_mitts', tier: 'elite' }); const e = f.turn(f.foe);
    const have = ids(f, e); for (const t of ['flurry', 'trip', 'grapple']) expect(have).not.toContain('tq:main:' + t);
  });
});

describe('P14: the Open Hand answers its holder\'s own defence', () => {
  it('Open guard: a blow aimed at the monk in Light armour or none is at the guard\'s value to hit; not in Medium, not with a gun or the servo-fist', () => {
    expect(guardTerm(monk({ armourClass: 1 }).f)).toBe(-2);
    expect(guardTerm(monk({ armourClass: 0 }).f)).toBe(-2);
    expect(guardTerm(monk({ armourClass: 2 }).f)).toBe(0);
    expect(guardTerm(monk({ weapon: 'service_pistol', offHand: 'hand_wraps' }).f)).toBe(0);
    expect(guardTerm(monk({ weapon: 'hellraiser_servo_fist' }).f)).toBe(0); // heavy: its forms, never its guard
  });
  it('Sway: the first blow that lands on the monk in a round is halved (its reaction); the second is not', () => {
    const took = (answers: string[] | null) => {
      const { f } = monk({ armourClass: 0 }); const pc = f.pc;
      if (answers) withGame(f.g, () => ((f.g.characters[pc.charId!] as any).phys = { ...((f.g.characters[pc.charId!] as any).phys || {}), answers }));
      const e = f.turn(f.foe), out: number[] = [];
      // the enemy's own attack (what its turn runs: resolveAttack), twice in one round
      for (let i = 0; i < 2; i++) { const h0 = f.pc.hp; f.unit(e.id).ap = 6; dice({ die: 18, hit: true }, () => withGame(f.g, () => resolveAttack(f.cb, f.g.rng, f.unit(e.id), f.pc, 'shot', null))); out.push(h0 - f.pc.hp); }
      return out;
    };
    const on = took(null), off = took(['riposte']);
    expect(off[0]).toBeGreaterThan(0); expect(on[0]).toBe(Math.floor(off[0] * 0.5) || on[0]);
    expect(on[0]).toBeLessThan(off[0]); expect(on[1]).toBe(off[1]); // once a round
  });
  it('Breath: 1 AP once a turn, ends the newest Body harm and leaves the monk Guarded', () => {
    const { f, u } = monk(); const b = actionsFor(f.g, u.id, 'host').find((d) => d.id === 'pk:relic:open_hand#open_breath')!;
    expect(b, 'Breath is on the pad').toBeTruthy(); expect((b.cost as any).ap).toBe(1);
    const ap0 = f.unit(u.id).ap; expect(f.act(sendDescriptor(f.g, u.id, b.id, {}, 'host')!)).toBeTruthy();
    expect(ap0 - f.unit(u.id).ap).toBe(1); expect(JSON.stringify(f.unit(u.id).conds || {})).toContain('guarded');
    expect(actionsFor(f.g, u.id, 'host').find((d) => d.id === b.id)!.available).toBe(false);
    const g = monk({ weapon: 'service_pistol' }); expect(actionsFor(g.f.g, g.u.id, 'host').some((d) => /open_breath/.test(d.id) && d.available)).toBe(false);
  });
});

describe('the forms\' limits (the reviewer\'s abuse list)', () => {
  const OH = (x: string) => 'relic:open_hand#' + x;
  it('a form rides a plain blow only: Jab on a Flurry changes nothing (one form or one technique an attack)', () => {
    const run = (mods: string[]) => { const { f, u } = monk(); const ap0 = f.unit(u.id).ap, hp0 = f.foe.hp; dice(HIT, () => f.act(sendDescriptor(f.g, u.id, 'tq:main:flurry', { targetId: f.foe.id, mods: mods.map(OH) }, 'host')!)); return { took: ap0 - f.unit(u.id).ap, dmg: hp0 - f.foe.hp }; };
    expect(run(['jab'])).toEqual(run([]));
  });
  it('Jab is a trade, not a free roll: two Jabs (2 AP) deal less than one plain blow (2 AP)', () => {
    const one = (mods: string[]) => { const { f, u } = monk(); const hp0 = f.foe.hp; dice(HIT, () => f.act(sendDescriptor(f.g, u.id, 'tq:main:cut', { targetId: f.foe.id, mods: mods.map(OH) }, 'host')!)); return hp0 - f.foe.hp; };
    expect(2 * one(['jab'])).toBeLessThan(one([]));
  });
  it('Palm pushes a target at most once a turn, and never a Boss', () => {
    const { f, u } = monk({ tier: 'boss' }); const at0 = f.foe.pos;
    for (let i = 0; i < 2; i++) { f.unit(u.id).ap = 6; dice({ die: 15, hit: true }, () => f.act(sendDescriptor(f.g, u.id, 'tq:main:cut', { targetId: f.foe.id, mods: [OH('palm')] }, 'host')!)); }
    expect(f.foe.pos).toBe(at0);
  });
});

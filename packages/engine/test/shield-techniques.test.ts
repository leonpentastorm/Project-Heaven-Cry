// Rules 1.13: a shield's own techniques (docs/design/proposals/2026-11-nine-doors.md, section 20 item 9). They are
// the off hand's while it holds a shield, whatever the main hand holds, and they run on Momentum and Guard:
//   Shield Bash (Strike, 2 AP, 1 Guard in place of 1 Momentum; a hit: +1 Momentum, Body save or pushed 1)
//   Raise Shield (Link, 1 AP: Momentum into Guard 1 for 1; ranged attacks from the front −2 until your next turn)
//   Shield Wall (Answer, 1 Guard: an ally next to you is shot at: −2 to hit and half cover counts)
import { describe, it, expect, beforeEach } from 'vitest';
import { phys, previewAttack, resolveAttack, fireBurst, d20, ITEM, type Unit } from '../src';
import { physFight, rig } from './helpers/physfight';

beforeEach(() => rig(null));
type F = ReturnType<typeof fight>;
/** A PC on C5 with a riot shield in the off hand (and an ally on C4 when asked), a foe on D5 unless placed. */
function fight(o: { weapon?: string; shield?: string | null; dur?: number; guard?: number; m?: number; foeAt?: string; ally?: boolean; known?: string[] } = {}) {
  const sk = { athletics: 4, raw_power: 6, dexterity: 6, durability: o.dur ?? 5 };
  const f = physFight([{ weapon: o.weapon || 'sabre', known: o.known || [], skills: sk }, ...(o.ally ? [{ weapon: 'sabre', skills: { durability: 0 } }] : [])], [{ tier: 'elite' }]);
  f.cb.objects = [];
  f.put(f.pc, 'C5'); if (o.ally) f.put(f.pcs[1], 'C4');
  const sh = o.shield === undefined ? 'riot_shield' : o.shield;
  if (sh) { f.char(f.pc).offHand = { id: sh } as any; f.pc.offItem = sh; }
  const foe = f.put(f.foe, o.foeAt || 'D5'); foe.hp = foe.maxHp = 900;
  f.cb.order = [f.pc.id, ...f.cb.order.filter((id) => id !== f.pc.id)]; f.cb.round = 1;
  f.turn(f.pc);
  for (const u of f.cb.units) { delete u.openerUsed; delete (u as any).reactUsed; if (u.side === 'pc') u.hp = u.maxHp; }
  f.momentum(f.pc, o.m ?? 1); if (f.pc.resMax?.guard != null) f.pc.res!.guard = o.guard ?? 0;
  return f;
}
const guard = (f: F, u: Unit = f.pc) => f.unit(u.id).res?.guard ?? 0;
const weak = (u: Unit) => { u.sv = { body: -50, brain: -50, heart: -50 } as any; };
/** Dice with no natural 20 in the next few rolls (a 20 saves whatever the bonus). */
const no20 = (f: F) => { for (let s = 1; ; s++) { const r = { state: s }; if ([1, 2, 3, 4, 5, 6].every(() => d20(r) !== 20)) { f.g.rng.state = s; return; } } };
/** Tiles the foe was pushed away from D5 (the data says 1; a perk or an unlock of the pusher's may add to a push). */
const pushedEast = (f: F) => Number(f.foe.pos.split(',')[0]) - Number(f.tile('D5').split(',')[0]);
const offIds = (f: F) => f.pad(f.pc, 'off').flatMap((g) => g.entries.map((e) => e.id));

describe('the shield block', () => {
  it('a shield carries the Shield property; the three techniques come with it and are never learned', () => {
    expect((ITEM as any).riot_shield.phys.props).toEqual(['shield']); expect((ITEM as any).buckler.phys.props).toEqual(['shield']); expect((ITEM as any).pavise.phys).toBeUndefined();
    for (const id of ['shield_bash', 'raise_shield', 'shield_wall']) { expect(phys.TECHNIQUE[id].comes_with, id).toEqual(['shield']); expect(phys.TECHNIQUE[id].needs.shield, id).toBe(true); expect(phys.handlerOf(id), id).not.toBeNull(); }
    expect(phys.startingTechniqueChoices('melee').filter((id) => phys.given(phys.TECHNIQUE[id]))).toEqual([]);
    const f = fight(); expect(phys.pickable(f.char(f.pc), 'sabre').filter((id) => phys.given(phys.TECHNIQUE[id]))).toEqual([]);
    expect(phys.PHYS_RULES.props.shield).toBeTruthy();
  });
  for (const weapon of ['sabre', 'service_pistol', 'fists']) it('the off hand\'s pad lists them with ' + weapon + ' in the main hand; the main hand\'s pad doesn\'t', () => {
    const f = fight({ weapon, guard: 1 });
    expect(offIds(f)).toEqual(expect.arrayContaining(['shield_bash', 'raise_shield', 'shield_wall']));
    const main = f.pad(f.pc, 'main').flatMap((g) => g.entries.map((e) => e.id));
    for (const id of ['shield_bash', 'raise_shield', 'shield_wall']) expect(main).not.toContain(id);
    expect(offIds(f)).not.toContain('cut'); // the shield's hand offers nothing else
    // Interpose (Durability 3) is on a pad either way: with the weapon's Answers, or in the shield's block behind a gun
    expect([...main, ...offIds(f)].filter((id) => id === 'interpose')).toEqual(['interpose']);
    expect(f.pad(f.pc, 'off').map((g) => g.group)).toEqual(['strike', 'link', 'answer']);
    expect(f.bound(() => phys.physView(f.cb, f.pc, 'pc')).momentum).toMatchObject({ now: 1 }); // a shield-bearer has the meter, a gun in the main hand too
  });
  it('no shield, a pavise or a torch: no block; with no Guard an Answer that costs it says so', () => {
    expect(offIds(fight({ shield: null }))).toEqual([]); expect(offIds(fight({ shield: 'pavise' }))).toEqual([]); expect(offIds(fight({ shield: 'torch' }))).toEqual([]);
    const f = fight({ guard: 0 });
    expect(f.pad(f.pc, 'off').flatMap((g) => g.entries).find((e) => e.id === 'shield_wall')).toMatchObject({ ok: false, why: 'Needs 1 Guard: Brace or take Guard first.' });
    expect(f.pv('shield_bash', { targetId: f.foe.id })).toMatchObject({ ok: false, why: 'Needs 1 Guard: Brace or take Guard first.' });
    expect(fight({ shield: null }).pv('shield_bash', { targetId: 'x' }).why).toBe('Needs a shield in your off hand.');
  });
});

describe('the unit carries what its off hand holds', () => {
  it('drawing a shield in a fight gives the block (and the +1 Guard gain); putting it away takes it back', () => {
    const f = fight({ shield: null, dur: 2 }); const c = f.char(f.pc);
    c.pack = [...(c.pack || []), { id: 'riot_shield', item: 'riot_shield', name: 'Legion riot shield', qty: 1, kind: 'tool' } as any];
    expect(f.pc.offItem ?? null).toBeNull(); expect(offIds(f)).toEqual([]); expect(f.bound(() => phys.guardGain(f.pc))).toBe(2);
    f.act({ type: 'combat/equip', unitId: f.pc.id, item: 'riot_shield', to: 'off' } as any);
    expect(f.pc.offItem).toBe('riot_shield'); expect(f.bound(() => phys.shieldOf(f.pc))).toBe('riot_shield'); expect(offIds(f)).toContain('shield_bash'); expect(f.bound(() => phys.guardGain(f.pc))).toBe(3);
    f.act({ type: 'combat/stow', unitId: f.pc.id, slot: 'off' } as any);
    expect(f.pc.offItem ?? null).toBeNull(); expect(offIds(f)).toEqual([]);
  });
});

describe('Shield Bash', () => {
  it('2 AP and 1 Guard in place of the Momentum; a hit gives 1 Momentum and pushes on a failed Body save', () => {
    const f = fight({ guard: 2, m: 1 }); weak(f.foe); no20(f); rig({ hit: true, die: 12 });
    const pv = f.pv('shield_bash', { targetId: f.foe.id });
    expect(pv).toMatchObject({ ok: true, ap: 2, guard: { now: 2, after: 1 }, momentum: { now: 1, after: 1 } }); expect(pv.saves![0]).toMatchObject({ unit: f.foe.id, skills: ['body'] });
    expect(pv.attacks[0].pv.dmg!.mults.some((m) => m.label === 'Shield Bash' && m.v === 1.5)).toBe(true);
    expect([guard(f), f.momentum(f.pc), f.pc.ap, f.foe.pos]).toEqual([2, 1, 6, f.tile('D5')]); // the card changed nothing
    const hp = f.foe.hp;
    expect(f.tech('shield_bash', { targetId: f.foe.id })).toBeNull();
    expect(f.pc.ap).toBe(4); expect(guard(f)).toBe(1); expect(f.momentum(f.pc)).toBe(2); expect(f.foe.hp).toBeLessThan(hp); expect(pushedEast(f)).toBeGreaterThanOrEqual(1);
    expect(f.pc.weapon).toBe('sabre'); // the strike was the bare hand behind the shield; the main hand is as it was
  });
  it('a miss: the Guard is spent, no Momentum, no push; with the first Opener unused it is still a Strike', () => {
    const f = fight({ guard: 1, m: 0 }); rig({ hit: false, die: 5 });
    expect(f.tech('shield_bash', { targetId: f.foe.id })).toBeNull();
    expect(guard(f)).toBe(0); expect(f.momentum(f.pc)).toBe(0); expect(f.foe.pos).toBe(f.tile('D5'));
    expect(f.tech('shield_bash', { targetId: f.foe.id })).toBe('Needs 1 Guard: Brace or take Guard first.'); expect(f.pc.ap).toBe(4);
  });
  it('a refusal gives the Guard and the AP back; it is a melee technique of the chain', () => {
    const f = fight({ guard: 1, foeAt: 'H5' });
    expect(f.tech('shield_bash', { targetId: f.foe.id })).toMatch(/reach/); expect(guard(f)).toBe(1); expect(f.pc.ap).toBe(6);
    const c = fight({ guard: 2, known: ['lunge'] }); rig({ hit: true, die: 12 }); c.foe.sv = { body: 50, brain: 50, heart: 50 } as any;
    expect(c.tech('shield_bash', { targetId: c.foe.id })).toBeNull();
    expect(c.tech('lunge', { targetId: c.foe.id })).toBe('An Opener is only the first melee technique of your turn.');
  });
  it('with a gun or nothing in the main hand; it hits with Raw Power', () => {
    for (const weapon of ['service_pistol', 'fists']) {
      const f = fight({ weapon, guard: 1, m: 0 }); weak(f.foe); no20(f); rig({ hit: true, die: 12 });
      const ammo = f.pc.ammo;
      expect(f.pv('shield_bash', { targetId: f.foe.id }).attacks[0].pv.terms!.find((t) => t.label === 'skill')!.v).toBe(5); // Raw Power 6: +5
      expect(f.tech('shield_bash', { targetId: f.foe.id }), weapon).toBeNull();
      expect(f.momentum(f.pc)).toBe(1); expect(f.pc.weapon).toBe(weapon); expect(f.pc.ammo).toBe(ammo); expect(pushedEast(f)).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('Raise Shield', () => {
  it('turns Momentum into Guard 1 for 1: all of it by default, the amount chosen, never past the pool', () => {
    const f = fight({ m: 3, guard: 0 });
    expect(f.pv('raise_shield')).toMatchObject({ ok: true, ap: 1, momentum: { now: 3, after: 0 }, guard: { now: 0, after: 3 } }); expect([f.momentum(f.pc), guard(f)]).toEqual([3, 0]);
    expect(f.tech('raise_shield')).toBeNull(); expect([f.momentum(f.pc), guard(f), f.pc.ap]).toEqual([0, 3, 5]);
    expect(f.tech('raise_shield')).toBe('Your shield is already raised.');
    const one = fight({ m: 3, guard: 0 }); expect(one.pv('raise_shield', { opt: '1' }).guard).toEqual({ now: 0, after: 1 });
    expect(one.tech('raise_shield', { opt: '1' })).toBeNull(); expect([one.momentum(one.pc), guard(one)]).toEqual([2, 1]);
    const full = fight({ m: 3, guard: 4 }); expect(full.tech('raise_shield')).toBeNull(); expect([full.momentum(full.pc), guard(full)]).toEqual([2, 5]);
    const none = fight({ m: 2, dur: 0 }); expect(none.tech('raise_shield')).toBeNull(); expect(none.momentum(none.pc)).toBe(2); // no pool: nothing is turned, the shield is still raised
  });
  it('ranged attacks from the front are at −2 until your next turn; melee and shots from behind are not', () => {
    const f = fight({ m: 0, foeAt: 'G5' });
    const term = (from?: string, mode: 'shot' | 'melee' = 'shot') => { if (from) f.put(f.foe, from); return f.bound(() => previewAttack(f.cb, f.unit(f.foe.id), f.pc, mode, { free: true })).terms!.find((t) => t.label === 'Raised shield')?.v ?? 0; };
    expect(term()).toBe(0);
    expect(f.tech('raise_shield')).toBeNull(); // faces the nearest enemy (east)
    expect(term('G5')).toBe(-2); expect(term('G4')).toBe(-2); expect(term('A5')).toBe(0); expect(term('D5', 'melee')).toBe(0);
    f.put(f.foe, 'G5'); f.turn(f.foe); expect(term()).toBe(-2); // through the enemy's turn
    f.turn(f.pc); expect(term()).toBe(0);
  });
});

describe('Shield Wall', () => {
  const shoot = (f: F, tgt: Unit) => f.bound(() => resolveAttack(f.cb, f.g.rng, f.unit(f.foe.id), f.unit(tgt.id), 'shot', null, { noAp: true }));
  const terms = (f: F, tgt: Unit, mode: 'shot' | 'melee' = 'shot') => f.bound(() => previewAttack(f.cb, f.unit(f.foe.id), f.unit(tgt.id), mode, { free: true })).terms!.map((t) => t.label + ' ' + t.v);
  it('an ally next to you is shot at: 1 Guard and your reaction; the shot is at −2 and half cover counts', () => {
    const f = fight({ ally: true, guard: 2, foeAt: 'G4' }); const ally = f.pcs[1]; f.turn(f.foe);
    const plain = f.bound(() => previewAttack(f.cb, f.unit(f.foe.id), f.unit(ally.id), 'shot', { free: true })).toHit;
    let seen: number | null = null; rig({ die: 10 });
    const r = shoot(f, ally);
    seen = r.total - r.roll;
    expect(seen).toBe(plain - 2 - 5); expect(guard(f)).toBe(1);
    expect(f.cb.log.some((l) => /answers with Shield Wall/.test(l))).toBe(true); expect(f.cb.log.some((l) => /shield covers .* \(1 Guard\): −2 to hit, and half cover counts/.test(l))).toBe(true);
    // the wall was for that attack: the next one is plain (and the reaction is spent)
    expect(terms(f, ally).some((t) => /Shield Wall/.test(t))).toBe(false);
    const r2 = shoot(f, ally); expect(r2.total - r2.roll).toBe(plain); expect(guard(f)).toBe(1);
  });
  it('not for a melee attack, not without Guard, not for the bearer, not from 2 tiles away', () => {
    const m = fight({ ally: true, dur: 2, guard: 2, foeAt: 'D4' }); // Durability 2: no Interpose either
    m.turn(m.foe); rig({ die: 10 });
    m.bound(() => resolveAttack(m.cb, m.g.rng, m.unit(m.foe.id), m.unit(m.pcs[1].id), 'melee', null, { noAp: true })); expect(guard(m)).toBe(2);
    const n = fight({ ally: true, guard: 0, foeAt: 'G4' }); n.turn(n.foe); rig({ die: 10 }); shoot(n, n.pcs[1]); expect(n.cb.log.some((l) => /Shield Wall/.test(l))).toBe(false);
    const me = fight({ ally: true, guard: 2, foeAt: 'G4' }); me.turn(me.foe); rig({ die: 10, hit: false }); shoot(me, me.pc); expect(me.cb.log.some((l) => /Shield Wall/.test(l))).toBe(false);
    const far = fight({ ally: true, guard: 2, foeAt: 'G4' }); far.put(far.pcs[1], 'C3'); far.turn(far.foe); rig({ die: 10 }); shoot(far, far.pcs[1]); expect(guard(far)).toBe(2);
  });
  it('a burst is one attack: every round of it is walled for the one Guard', () => {
    const f = fight({ ally: true, guard: 3, foeAt: 'G4' }); const ally = f.pcs[1]; f.turn(f.foe);
    const foe = f.unit(f.foe.id); foe.weapon = 'hellraiser_service_rifle'; foe.ammo = 30; foe.ap = 9;
    const plain = f.bound(() => previewAttack(f.cb, foe, f.unit(ally.id), 'shot', { free: true })).toHit;
    const rolls: number[] = []; rig({ die: 10 });
    const before = f.cb.log.length;
    expect(f.bound(() => fireBurst(f.cb, f.g.rng, foe, f.unit(ally.id), null))).toBeNull();
    const lines = f.cb.log.slice(before).filter((l) => /fires at/.test(l));
    for (const l of lines) { const m = /d20 10 ([+−])(\d+)/.exec(l); if (m) rolls.push((m[1] === '+' ? 1 : -1) * Number(m[2])); }
    expect(rolls.length).toBeGreaterThanOrEqual(2);
    for (const r of rolls) expect(r).toBeLessThanOrEqual(plain - 7);
    expect(guard(f)).toBe(2); expect(f.cb.log.filter((l) => /answers with Shield Wall/.test(l)).length).toBe(1);
  });
});

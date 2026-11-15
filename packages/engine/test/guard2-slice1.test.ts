// Rules 1.56 Guard 2.0, slice 1 (docs/design/proposals/2026-11-guard-2.0.md items 5, 7, 8, 10, 13, 15): each rule a data
// line of Durability's door (skills.json durability.unlocks.1), run by the generic item ops, proved through the reducer
// (the PC's own actions through f.act; a foe's blow through resolveAttack, as the enemy turn makes it).
import { describe, it, expect, beforeEach } from 'vitest';
import { resolveAttack, SKILL, dist, type Unit } from '../src';
import { physFight, rig } from './helpers/physfight';

beforeEach(() => rig(null));
const DOOR: any = (SKILL as any).durability.unlocks['1'];
const eff = (label: string, op?: string) => DOOR.effects.find((e: any) => e.label === label && (!op || e.op === op));
type F = ReturnType<typeof physFight>;
/** A tank (Durability `dur`) on C5, an optional ally (no Durability) on C6, foes where asked; the tank's turn. */
function fight(dur: number, o: { foes?: { at: string; tier?: string; weapon?: string }[]; ally?: boolean } = {}) {
  const specs: any[] = [{ weapon: 'hellraiser_service_rifle', known: [], skills: { durability: dur, dexterity: 0, athletics: 0, raw_power: 0 } }];
  if (o.ally) specs.push({ weapon: 'hellraiser_service_rifle', known: [], skills: { durability: 0 } });
  const foes = o.foes || [{ at: 'D5' }];
  const f = physFight(specs, foes.map((x) => ({ tier: x.tier || 'soldier', weapon: x.weapon || 'maul' })));
  f.cb.objects = [];
  f.put(f.pcs[0], 'C5'); if (o.ally) f.put(f.pcs[1], 'C6');
  f.cb.units.filter((u) => u.side === 'foe').forEach((u, i) => { f.put(u, foes[i].at); u.hp = u.maxHp = 900; });
  for (const u of f.cb.units) if (u.side === 'pc') { u.hp = u.maxHp; u.armour = 0; }
  f.cb.order = [f.pcs[0].id, ...f.cb.order.filter((id) => id !== f.pcs[0].id)]; f.cb.round = 1; f.turn(f.pcs[0]);
  return f;
}
const tank = (f: F) => f.unit(f.pcs[0].id);
const guard = (f: F, n?: number) => { const x = tank(f); if (n != null) x.res!.guard = n; return x.res?.guard ?? 0; };
const foes = (f: F) => f.cb.units.filter((u) => u.side === 'foe');
/** The foe `i` strikes `who` in melee (the enemy turn's own attack). */
function blow(f: F, who: Unit, o: { crit?: boolean; i?: number } = {}) {
  const a = foes(f)[o.i || 0]; rig(o.crit ? { die: 20 } : { hit: true, die: 12 });
  f.turn(a);
  const r = f.bound(() => resolveAttack(f.cb, f.g.rng, f.unit(a.id), f.unit(who.id), 'melee', null, { noAp: true }));
  rig(null); return r;
}
const moves = (f: F, move: string) => f.fx('guard_move').filter((e: any) => e.move === move);

describe('item 5, Set Against the Blow: a critical on a Guard holder lands as an ordinary hit, with no injury', () => {
  it('the same blow, critical and ordinary, holding the same Guard: the HP lost is the same (to rounding); no injury', () => {
    const lost = (crit: boolean, g: number) => { const f = fight(5); guard(f, g); const t = tank(f), hp = t.hp; blow(f, t, { crit }); return { f, lost: hp - tank(f).hp }; };
    const crit = lost(true, 2), plain = lost(false, 2), bare = lost(true, 0), bareplain = lost(false, 0);
    expect(eff('Set Against the Blow', 'damage_mult')).toMatchObject({ when: 'dealing', replaces: 'critical' });
    expect(Math.abs(crit.lost - plain.lost), crit.f.cb.log.slice(-6).join(' | ') + ' // ' + plain.f.cb.log.slice(-4).join(' | ')).toBe(0);
    expect(bare.lost).toBeGreaterThan(bareplain.lost); // without Guard a critical still bites
    expect(moves(crit.f, 'crit_turned').length).toBe(1);
    expect(crit.f.cb.log.join(' ')).toMatch(/Set Against the Blow/);
    expect(tank(crit.f).injuries?.length || 0).toBe(0);
  });
});

describe('item 5 at Durability 3 (the lead, 16 Nov 2026): a one-point dip buys no critical immunity; the flag lives one blow', () => {
  it('at Durability 2 a critical on a Guard holder still bites; at 3 it is turned, and the flag is gone once the blow has resolved', () => {
    const lost = (dur: number, crit: boolean) => { const f = fight(dur); guard(f, 2); const hp = tank(f).hp; blow(f, tank(f), { crit }); return { f, lost: hp - tank(f).hp }; };
    expect(lost(2, true).lost).toBeGreaterThan(lost(2, false).lost);
    expect(moves(lost(2, true).f, 'crit_turned').length).toBe(0);
    const at3 = lost(3, true);
    expect(at3.lost).toBe(lost(3, false).lost); expect(moves(at3.f, 'crit_turned').length).toBe(1);
    expect((tank(at3.f).ps as any)?.['skill:durability.1']?.flags?.crit_turned).toBeFalsy();
    expect(Object.values((tank(at3.f).ps as any) || {}).some((b: any) => b?.flags?.crit_turned)).toBe(false);
    // a critical that drops the tank rolls no injury (nothing cancels, nothing cleared the flag before): it is gone too
    const down = fight(3); guard(down, 2); tank(down).hp = 5; blow(down, tank(down), { crit: true });
    expect(tank(down).hp).toBe(0); expect(moves(down, 'crit_turned').length).toBe(1);
    expect(Object.values((tank(down).ps as any) || {}).some((b: any) => b?.flags?.crit_turned)).toBe(false);
  });
});

describe('item 8, Close Guard: a quarter of a foe\'s blow on an ally next to the tank comes to the tank', () => {
  it('the ally takes 75%, the tank the rest (soaked by its plates); none without Guard', () => {
    const run = (g: number) => { const f = fight(5, { ally: true, foes: [{ at: 'D6' }] }); guard(f, g); (f.char(f.pcs[0]) as any).phys.answers = ['close_guard']; // Interpose and Retort off: Interpose would take the rest of the blow
      const a = f.unit(f.pcs[1].id), hp = a.hp, th = tank(f).hp; blow(f, a); return { f, ally: hp - f.unit(f.pcs[1].id).hp, tank: th - tank(f).hp }; };
    const off = run(0), on = run(3);
    expect(off.tank).toBe(0);
    const share = eff('Close Guard').share;
    expect(on.ally).toBe(off.ally - Math.floor(off.ally * share));
    expect(moves(on.f, 'close_guard')[0]).toMatchObject({ target: on.f.pcs[0].id, other: on.f.pcs[1].id });
    expect(guard(on.f)).toBeLessThanOrEqual(3);
  });
});

describe('item 8 with Interpose (item 3 of the review): Close Guard and Interpose on one blow compose', () => {
  it('the protector takes no less than Interpose alone and no more than the blow; the ally nothing; armour once', () => {
    // Guard 1: Interpose's price, and nothing left over to soak (keep_back), so the HP lost is the damage that reached it
    const run = (answers: string[] | null, g = 1) => { const f = fight(5, { ally: true, foes: [{ at: 'D6' }] }); guard(f, g); if (answers) (f.char(f.pcs[0]) as any).phys.answers = answers;
      const a = f.unit(f.pcs[1].id), hp = a.hp, th = tank(f).hp; blow(f, a); return { f, ally: hp - f.unit(f.pcs[1].id).hp, tank: th - tank(f).hp }; };
    const bare = run(null, 0), alone = run(['interpose']), both = run(['close_guard', 'interpose']);
    expect(bare.tank).toBe(0); expect(alone.ally).toBe(0); expect(both.ally).toBe(0);
    expect(alone.tank).toBeGreaterThan(0);
    expect(moves(both.f, 'close_guard').length).toBe(1); expect(both.f.cb.log.join(' ')).toMatch(/interposes for/);
    expect(both.tank).toBeGreaterThanOrEqual(alone.tank); expect(both.tank).toBeLessThanOrEqual(bare.ally);
    expect(both.tank).toBe(alone.tank); // the same armour (none) on both: the blow, once, whoever's share it was
    // armour differs: the protector's share from Close Guard (already past the ally's armour) and the rest of the blow
    // worked out again against its own armour: still at least Interpose alone, never more than the blow itself
    const armoured = (who: 0 | 1, answers: string[] | null, g = 1) => { const f = fight(5, { ally: true, foes: [{ at: 'D6' }] }); guard(f, g); if (answers) (f.char(f.pcs[0]) as any).phys.answers = answers; f.unit(f.pcs[who].id).armour = 10;
      const a = f.unit(f.pcs[1].id), hp = a.hp, th = tank(f).hp; blow(f, a); return { ally: hp - f.unit(f.pcs[1].id).hp, tank: th - tank(f).hp }; };
    for (const who of [0, 1] as const) {
      const blowOn = armoured(who, null, 0).ally, ia = armoured(who, ['interpose']).tank, ib = armoured(who, ['close_guard', 'interpose']).tank;
      expect(ib, 'armour on ' + (who ? 'the ally' : 'the protector')).toBeGreaterThanOrEqual(ia);
      expect(ib).toBeLessThanOrEqual(Math.max(blowOn, ia));
    }
  });
});

describe('item 7, Last Plate: once a fight, a blow that would drop the tank leaves it on 1 HP and breaks every plate', () => {
  it('at Durability 5: 1 HP, Guard 0; the second blow drops it; at Durability 3 nothing', () => {
    const f = fight(5); const t = tank(f); t.hp = 3; guard(f, 1);
    blow(f, t);
    expect(tank(f).hp).toBe(eff('Last Plate').value); expect(guard(f)).toBe(0);
    expect(moves(f, 'last_plate').length).toBe(1);
    blow(f, tank(f)); expect(tank(f).hp).toBe(0);
    const g = fight(3); tank(g).hp = 3; guard(g, 1); blow(g, tank(g)); expect(tank(g).hp).toBe(0);
  });
});

describe('item 15, Retort: a melee blow on the tank holding Guard goes back half at the attacker (its reaction, 1 Guard)', () => {
  it('the attacker loses HP, the tank 1 Guard and its reaction; off when the Answer is switched off, and below Durability 3', () => {
    const f = fight(3); guard(f, 3); const a = foes(f)[0], hp = a.hp;
    blow(f, tank(f));
    expect(f.unit(a.id).hp).toBeLessThan(hp);
    expect(moves(f, 'retort')[0]).toMatchObject({ target: f.pcs[0].id, other: a.id });
    expect(f.cb.log.join(' ')).toMatch(/Retort/);
    // the Answer list (phys/answers) switches it off
    const g = fight(3); (g.char(g.pcs[0]) as any).phys.answers = []; guard(g, 3); const b = foes(g)[0], bh = b.hp; // every Answer switched off (the list phys/answers keeps)
    blow(g, tank(g)); expect(g.unit(b.id).hp).toBe(bh);
    const h = fight(2); guard(h, 2); const c = foes(h)[0], ch = c.hp; blow(h, tank(h)); expect(h.unit(c.id).hp).toBe(ch);
  });
});

describe('item 10, Challenge: 1 AP and 1 Guard, foes within 2 save or are Taunted; a Boss answers no challenge', () => {
  it('through the reducer: the price, each foe in reach Taunted or saved, the Boss never Taunted, the far foe untouched', () => {
    const f = fight(3, { foes: [{ at: 'D5' }, { at: 'E5' }, { at: 'C7', tier: 'boss' }, { at: 'K5' }] }); guard(f, 3);
    const ap = tank(f).ap, g = DOOR.effects.find((e: any) => e.action === 'guard_challenge');
    f.act({ type: 'combat/perk', unitId: f.pcs[0].id, id: 'skill:durability.1', actionId: 'guard_challenge' } as any);
    expect(tank(f).ap).toBe(ap - g.ap); expect(guard(f)).toBe(3 - g.res.guard);
    const [a, b, boss, far] = foes(f).map((u) => f.unit(u.id));
    const log = f.cb.log.join(' ');
    for (const u of [a, b]) expect(!!u.conds?.taunted || new RegExp(u.name + '[^.]*(resists|saves|shakes)').test(log), log).toBe(true);
    expect(boss.conds?.taunted).toBeFalsy(); expect(far.conds?.taunted).toBeFalsy();
    expect(moves(f, 'challenge').length).toBe(1);
  });
  it('refused below Durability 3 and with no Guard', () => {
    const f = fight(2); guard(f, 3);
    expect(() => f.act({ type: 'combat/perk', unitId: f.pcs[0].id, id: 'skill:durability.1', actionId: 'guard_challenge' } as any)).toThrow();
    const g = fight(3); guard(g, 0);
    expect(() => g.act({ type: 'combat/perk', unitId: g.pcs[0].id, id: 'skill:durability.1', actionId: 'guard_challenge' } as any)).toThrow();
  });
});

describe('item 10, Challenge and a Boss (item 2 of the review): only the Taunt of Challenge itself misses a Boss', () => {
  it('Challenge does not Taunt a Boss that fails every save; the same tank Taunting by a Call does, as before', () => {
    const f = physFight([{ weapon: 'hellraiser_service_rifle', known: [], skills: { durability: 3, implication: 7, dexterity: 0, athletics: 0, raw_power: 0 } }], [{ tier: 'boss', weapon: 'maul' }]);
    f.cb.objects = []; f.put(f.pcs[0], 'C5'); const boss = f.cb.units.find((u) => u.side === 'foe')!; f.put(boss, 'D5'); boss.hp = boss.maxHp = 900;
    f.cb.order = [f.pcs[0].id, boss.id]; f.cb.round = 1; f.turn(f.pcs[0]);
    guard(f, 3); f.unit(boss.id).sv = { body: -99, brain: -99, heart: -99 };
    f.act({ type: 'combat/perk', unitId: f.pcs[0].id, id: 'skill:durability.1', actionId: 'guard_challenge' } as any);
    expect(f.unit(boss.id).conds?.taunted).toBeFalsy();
    expect((tank(f).ps as any)?.['skill:durability.1']?.flags?.challenge).toBeFalsy(); // the flag lives only while Challenge resolves
    f.act({ type: 'combat/call', unitId: f.pcs[0].id, id: 'call.taunt', targetId: boss.id } as any);
    expect(f.unit(boss.id).conds?.taunted, f.cb.log.slice(-4).join(' | ')).toBeTruthy();
  });
});

describe('item 13, Slam: 2 AP and 2 Guard, every adjacent foe pushed a tile and (failing a Body save) Off Balance', () => {
  it('through the reducer: both adjacent foes now 2 tiles away, the far one untouched, the price paid', () => {
    const f = fight(5, { foes: [{ at: 'D5' }, { at: 'B5' }, { at: 'G5' }] }); guard(f, 3);
    const ap = tank(f).ap, g = DOOR.effects.find((e: any) => e.action === 'guard_slam'), farAt = foes(f)[2].pos;
    f.act({ type: 'combat/perk', unitId: f.pcs[0].id, id: 'skill:durability.1', actionId: 'guard_slam' } as any);
    expect(tank(f).ap).toBe(ap - g.ap); expect(guard(f)).toBe(3 - g.res.guard);
    const [a, b, far] = foes(f).map((u) => f.unit(u.id));
    expect(dist(a.pos, tank(f).pos)).toBe(2); expect(dist(b.pos, tank(f).pos)).toBe(2); expect(far.pos).toBe(farAt);
    expect(moves(f, 'slam').length).toBe(1);
  });
});

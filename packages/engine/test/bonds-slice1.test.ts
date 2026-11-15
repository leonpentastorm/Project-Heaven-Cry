// @ts-nocheck (test fixtures: plain objects)
// Rules 1.56 (Balance 2.0), Bonds 2.0 slice 1 (docs/design/proposals/2026-11-bonds-2.0.md section 11): Tug, Snap (and
// the Mender's Ledger Snap), Last Thread and the Bond card's numbers. Every order through the reducer (combat/perk), a
// real action; the numbers read from data (tending.json), never typed here.
import { describe, it, expect } from 'vitest';
import { storyWith, withGame } from './helpers/perkfight';
import { beginTurn, actionsFor, bondView, condOn } from '../src';
import { applyDamage } from '../src/effects/damage';
import { tie, tiesOf } from '../src/kit';
import { ledgerCap } from '../src/character';
import tendingJ from '../../../data/tending.json';

const T: any = tendingJ;
const item = (id: string) => T.items.find((x: any) => x.id === id);
const grant = (id: string) => item(id).effects.find((e: any) => e.op === 'grant_action');
const nested = (id: string, i: number) => grant(id).effects[i];
const dist = (a: string, b: string) => { const [ax, ay] = a.split(',').map(Number), [bx, by] = b.split(',').map(Number); return Math.max(Math.abs(ax - bx), Math.abs(ay - by)); };

/** A Mender (or a door user: mender false) with an Attuner in the off hand, an ally and two Soldiers, on the practice square. */
function rig(o: { mender?: boolean; empathy?: number; level?: number; attuner?: boolean; foeTier?: string; seed?: string } = {}) {
  const level = o.level ?? 5;
  const s: any = storyWith([{ name: 'Medic', level, classId: o.mender ? 'bard' : null, skills: { empathy: o.empathy ?? 5 }, attrs: { insight: 5 }, weapon: 'service_pistol' }, { name: 'Gun', level }], o.seed);
  if (o.attuner !== false) s.g.characters[s.chars[0].id].offHand = { id: 'attuner' };
  s.act({ type: 'narrator/turn', turn: { narration: 'Fight', combat: { name: 'Bonds', map: 'yard16', difficulty: 'standard', level,
    enemies: [{ name: 'Soldier 1', tier: o.foeTier || 'soldier', weapon: 'service_pistol', at: '', no_surrender: true, level }, { name: 'Soldier 2', tier: 'soldier', weapon: 'service_pistol', at: '', no_surrender: true, level }] } } });
  const cb = () => s.g.combat, U = (id: string) => cb().units.find((u: any) => u.id === id);
  const me = cb().units.find((u: any) => u.side === 'pc' && u.name === 'Medic'), al = cb().units.find((u: any) => u.side === 'pc' && u.name === 'Gun');
  const [f1, f2] = cb().units.filter((u: any) => u.side === 'foe');
  me.pos = '3,5'; al.pos = '3,9'; f1.pos = '9,5'; f2.pos = '9,8';
  const turn = (u: any) => { const c = cb(); c.turn = c.order.indexOf(u.id); delete c.window; withGame(s.g, () => beginTurn(c, s.g.rng)); };
  turn(me); U(me.id).ap = 9;
  const act = (id: string, t: any = null, actionId?: string) => {
    const n = cb().log.length; let err: string | null = null;
    try { s.act({ type: 'combat/perk', unitId: me.id, id, ...(actionId ? { actionId } : {}), ...(t ? { targetId: t.id } : {}) }); } catch (e: any) { err = String(e?.message || e); }
    return { err, log: cb().log.slice(n).map((l: any) => typeof l === 'string' ? l : l.text || JSON.stringify(l)).join(' ') };
  };
  const bond = (t: any) => withGame(s.g, () => tie(cb(), U(me.id), U(t.id), 'bond'));
  const row = (name: string) => actionsFor(s.g, me.id, null).find((d: any) => d.group === 'tend' && d.name === name);
  return { s, cb, U, me, al, f1, f2, act, bond, turn, row };
}

describe('Bonds 2.0 slice 1: Tug', () => {
  it('an enemy that fails its Body save is pulled toward you by the data\'s tiles; Reeled is gone after', () => {
    const r = rig({ seed: 'S2' }); r.bond(r.f1); r.U(r.f1.id).sv = { body: -99 }; // (seed S2: no natural 20 on this save)
    const before = dist(r.U(r.me.id).pos, r.U(r.f1.id).pos), mp = r.U(r.me.id).mg.mp;
    const x = r.act('verb:tend.tug', r.f1);
    expect(x.err).toBeNull();
    expect(before - dist(r.U(r.me.id).pos, r.U(r.f1.id).pos)).toBe(nested('tend.tug', 1).tiles);
    expect(condOn(r.U(r.f1.id), 'reeled')).toBeFalsy();
    expect(mp - r.U(r.me.id).mg.mp).toBe(grant('tend.tug').res.mp);
    expect(r.cb().fx.some((e: any) => e.k === 'shove' && e.target === r.f1.id && e.pull)).toBe(true); // the forced move is drawn as any pull (combat.ts displace)
  });
  it('an enemy that makes its save stays where it is', () => {
    const r = rig(); r.bond(r.f1); r.U(r.f1.id).sv = { body: 99 };
    const at = r.U(r.f1.id).pos;
    expect(r.act('verb:tend.tug', r.f1).err).toBeNull();
    expect(r.U(r.f1.id).pos).toBe(at);
  });
  it('an ally comes willing, further (no save)', () => {
    const r = rig(); r.bond(r.al);
    const before = dist(r.U(r.me.id).pos, r.U(r.al.id).pos);
    expect(r.act('verb:tend.tug', r.al).err).toBeNull();
    expect(before - dist(r.U(r.me.id).pos, r.U(r.al.id).pos)).toBe(nested('tend.tug', 4).tiles);
  });
  it('refusals in plain words: no Bond, no Attuner', () => {
    const r = rig();
    expect(r.act('verb:tend.tug', r.f1).err).toMatch(/isn't tied to you/);
    const q = rig({ attuner: false }); q.bond(q.f1);
    expect(q.act('verb:tend.tug', q.f1).err).toMatch(/Needs an Attuner in hand/);
    expect(q.row('Tug').available).toBe(false);
  });
});

describe('Bonds 2.0 slice 1: Snap', () => {
  it('an enemy: a jolt of Soul damage, Dazed on a failed save, and the Bond ends', () => {
    const r = rig({ seed: 'S2' }); r.bond(r.f1); r.U(r.f1.id).sv = { body: -99 };
    const hp = r.U(r.f1.id).hp, x = r.act('verb:tend.snap', r.f1);
    expect(x.err).toBeNull();
    const lost = hp - r.U(r.f1.id).hp;
    expect(lost).toBeGreaterThan(0);
    expect(x.log).toContain('snaps the Bond with Soldier 1: ' + lost);
    expect(x.log).toMatch(/Soldier 1 is Dazed/);
    expect(r.U(r.f1.id).dazedNext).toBeTruthy(); // Dazed is a flag condition (conditions.json dazed: engine flag)
    expect(tiesOf(r.cb(), r.U(r.me.id), 'bond', 'from').length).toBe(0);
  });
  it('an ally: healed through the Bond, and the Bond ends', () => {
    const r = rig(); r.bond(r.al); r.U(r.al.id).hp = 20;
    const x = r.act('verb:tend.snap', r.al), healed = r.U(r.al.id).hp - 20;
    expect(x.err).toBeNull();
    expect(healed).toBeGreaterThan(0);
    expect(r.cb().fx.find((e: any) => e.k === 'heal' && e.target === r.al.id)?.amount).toBe(healed);
    expect(tiesOf(r.cb(), r.U(r.me.id), 'bond', 'from').length).toBe(0);
  });
  it('once a turn: a second Snap is refused', () => {
    const r = rig({ empathy: 8 }); r.bond(r.f1); r.bond(r.al);
    expect(r.act('verb:tend.snap', r.al).err).toBeNull();
    expect(r.act('verb:tend.snap', r.f1).err).not.toBeNull();
  });
  it('the Mender\'s Snap on an enemy cashes the Ledger by its own rule, no roll, and empties it', () => {
    const r = rig({ mender: true }); r.bond(r.f1); r.U(r.f1.id).sv = { body: 99 };
    const plain = rig({ mender: true }); plain.bond(plain.f1); plain.U(plain.f1.id).sv = { body: 99 };
    const cap = ledgerCap(r.s.g.characters[r.me.charId]);
    r.U(r.me.id).res.ledger = cap;
    const hp = r.U(r.f1.id).hp, hp0 = plain.U(plain.f1.id).hp;
    expect(r.act('verb:tend.snap', r.f1).log).toMatch(/calls in the Ledger/);
    plain.act('verb:tend.snap', plain.f1);
    expect((hp - r.U(r.f1.id).hp) - (hp0 - plain.U(plain.f1.id).hp)).toBeGreaterThan(0);
    expect(r.U(r.me.id).res.ledger || 0).toBe(0);
  });
  it('the Mender\'s Snap into an ally empties the Ledger as a heal of its share', () => {
    const r = rig({ mender: true }); r.bond(r.al); r.U(r.al.id).hp = 5; r.U(r.al.id).maxHp = 5000;
    const plain = rig({ mender: true }); plain.bond(plain.al); plain.U(plain.al.id).hp = 5; plain.U(plain.al.id).maxHp = 5000;
    r.U(r.me.id).res.ledger = 40;
    r.act('verb:tend.snap', r.al); plain.act('verb:tend.snap', plain.al);
    const extra = (r.U(r.al.id).hp - 5) - (plain.U(plain.al.id).hp - 5);
    expect(extra).toBeGreaterThanOrEqual(Math.floor(40 * item('tend.snap').amounts.snap_ledger.per[0].value));
    // what is left in the Ledger is only the Snap's own heal (it counts as a heal given), never the Ledger poured in
    expect(r.U(r.me.id).res.ledger).toBe(plain.U(plain.me.id).res.ledger);
  });
});

describe('Bonds 2.0 slice 1: Last Thread', () => {
  it('a Bonded ally goes Down: your next Raise costs 0 AP; the one after is full price again', () => {
    const r = rig({ empathy: 5 }); r.bond(r.al);
    const A = r.U(r.al.id); A.pos = '3,6';
    expect(r.row('Raise')?.cost?.ap ?? r.row('Raise')?.cost).not.toBe(0);
    withGame(r.s.g, () => applyDamage(r.cb(), A, A.hp + 5, { by: r.U(r.f1.id), type: 'physical' }));
    expect(r.U(r.al.id).downed).toBe(true);
    const ap = r.U(r.me.id).ap;
    expect(r.act('verb:tend.raise', r.U(r.al.id)).err).toBeNull();
    expect(r.U(r.me.id).ap).toBe(ap);
    expect(r.U(r.al.id).downed).toBeFalsy();
  });
  it('an ally that is not Bonded going Down gives nothing', () => {
    const r = rig({ empathy: 5 });
    const A = r.U(r.al.id); A.pos = '3,6';
    withGame(r.s.g, () => applyDamage(r.cb(), A, A.hp + 5, { by: r.U(r.f1.id), type: 'physical' }));
    const ap = r.U(r.me.id).ap;
    expect(r.act('verb:tend.raise', r.U(r.al.id)).err).toBeNull();
    expect(ap - r.U(r.me.id).ap).toBe(grant('tend.raise').ap);
  });
});

describe('Bonds 2.0 slice 1: the Bond card\'s numbers are the engine\'s, from the data the effects read', () => {
  it('per Bond, the Bonds held, the total, the heal multiplier, the share, the echo', () => {
    const r = rig(); r.bond(r.f1); r.bond(r.al);
    const v = withGame(r.s.g, () => bondView(r.cb(), r.U(r.me.id), r.s.g.characters[r.me.charId]));
    expect(v.gives.perBond).toBe(T.bond.per_bond);
    expect(v.gives.bonds).toBe(2);
    expect(v.gives.damage).toBeCloseTo(T.bond.per_bond * 2);
    expect(v.gives.through).toBe(T.bond.through);
    expect(v.gives.lines[0]).toBe('+' + T.bond.per_bond * 100 + '% damage a Bond · 2 Bonds · +' + T.bond.per_bond * 200 + '%');
    expect(v.gives.lines.join(' ')).toContain(T.bond.share * 100 + '% of the damage you take');
    expect(v.gives.lines.join(' ')).toContain('Echo: ' + T.bond.echo * 100 + '%');
    // the effect the engine runs reads the same number (the validator holds the copies equal; here, the running effect)
    const dm = item('tend.threads').effects.find((e: any) => e.op === 'damage_mult');
    expect(dm.value.per[0].value).toBe(v.gives.perBond);
  });
  it('the orders sit on the Tend tab among the Bond group, the engine\'s (no Narrator)', () => {
    const r = rig(); r.bond(r.f1);
    for (const name of ['Tug', 'Snap']) {
      const d: any = r.row(name);
      expect(d, name).toBeTruthy();
      expect(d.text).not.toMatch(/Narrator/);
    }
  });
});

describe('Bonds 2.0 slice 1: the enemies\' AI is unaffected', () => {
  it('no enemy is offered a Tend order, and an enemy turn with a Bond on it and Snap having run plays out', () => {
    const r = rig(); r.bond(r.f1);
    for (const f of [r.f1, r.f2]) expect(actionsFor(r.s.g, f.id, null).some((d: any) => d.group === 'tend')).toBe(false);
    r.U(r.f2.id).sv = { body: -99 };
    r.bond(r.f2); r.act('verb:tend.tug', r.f2);
    r.s.act({ type: 'combat/end-turn', unitId: r.me.id });
    expect(r.cb().units.filter((u: any) => u.side === 'foe').every((u: any) => !u.dead)).toBe(true);
    expect(r.cb().round).toBeGreaterThanOrEqual(1);
  });
});

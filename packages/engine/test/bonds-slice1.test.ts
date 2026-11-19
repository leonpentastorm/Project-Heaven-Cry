// @ts-nocheck (test fixtures: plain objects)
// Rules 1.56 (Balance 2.0), Bonds 2.0 slice 1 (docs/design/proposals/2026-11-bonds-2.0.md section 11): Tug, Snap (and
// the Mender's Ledger Snap), Last Thread and the Bond card's numbers. Every order through the reducer (combat/perk), a
// real action; the numbers read from data (tending.json), never typed here.
import { describe, it, expect } from 'vitest';
import { storyWith, withGame } from './helpers/perkfight';
import { beginTurn, actionsFor, bondView, condOn, active } from '../src';
import { PERK } from '../src';
import { tiesOf } from '../src/kit';
import { ledgerCap } from '../src/character';
import tendingJ from '../../../data/tending.json';

const T: any = tendingJ;
const item = (id: string) => T.items.find((x: any) => x.id === id);
// rules 1.75 item 6213: Tug, Guide, Settle, Soothe and Raise are Camaraderie perks' actions now (their grant_action rows)
const MOVED: Record<string, [string, number]> = { 'tend.tug': ['pull_together', 0], 'tend.guide': ['pull_together', 1], 'tend.settle': ['steady_hands', 0], 'tend.soothe': ['steady_hands', 1], 'tend.raise': ['nobody_left_behind', 2] };
const movedGrant = (id: string) => (PERK as any)[MOVED[id][0]].tiers.II.effects[MOVED[id][1]];
const grant = (id: string) => (MOVED[id] ? movedGrant(id) : item(id).effects.find((e: any) => e.op === 'grant_action'));
const nested = (id: string, i: number) => grant(id).effects[i];
const dist = (a: string, b: string) => { const [ax, ay] = a.split(',').map(Number), [bx, by] = b.split(',').map(Number); return Math.max(Math.abs(ax - bx), Math.abs(ay - by)); };

/** A Mender (or a door user: mender false) with an Attuner in the off hand, an ally and two Soldiers, on the practice square.
 * Every Bond is made by the tend.bond action (0.29 wave-2 review MF4), never tied by hand. */
function rig(o: { mender?: boolean; empathy?: number; level?: number; foeTier?: string; seed?: string } = {}) {
  const level = o.level ?? 5;
  const s: any = storyWith([{ name: 'Medic', level, classId: o.mender ? 'bard' : null, skills: { empathy: o.empathy ?? 5, camaraderie: 5 }, perks: { pull_together: 'II', nobody_left_behind: 'II' }, attrs: { insight: 5 }, weapon: 'service_pistol' }, { name: 'Gun', level }], o.seed);
  s.g.characters[s.chars[0].id].offHand = { id: 'attuner' };
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
  // a Bond through the real action (tend.bond: its reach, its AP, its cap, an enemy's Heart save failed for the test);
  // the Medic's AP and the target's saves are put back after, so each test reads its own order's cost
  const bond = (t: any) => {
    const m = U(me.id), x = U(t.id), ap = m.ap, sv = x.sv; if (x.side === 'foe') x.sv = { ...(sv || {}), heart: -99 };
    const held = () => tiesOf(cb(), U(me.id), 'bond', 'from').some((k: any) => k.to === x.id);
    for (let i = 0; i < 6 && !held(); i++) { U(me.id).ap = 9; expect(act('verb:tend.bond', U(t.id)).err, 'Bond ' + x.name).toBeNull(); } // a natural 20 saves
    expect(held(), 'Bonded to ' + x.name).toBe(true);
    U(me.id).ap = ap; if (sv === undefined) delete U(t.id).sv; else U(t.id).sv = sv;
  };
  const row = (name: string) => actionsFor(s.g, me.id, null).find((d: any) => d.name === name); // rules 1.75: Tug is Pull Together's (the Perks tab), Snap the door's (the Tend tab)
  return { s, cb, U, me, al, f1, f2, act, bond, turn, row };
}

describe('Bonds 2.0 slice 1: Tug', () => {
  it('an enemy that fails its Body save is pulled toward you by the data\'s tiles; Reeled is gone after', () => {
    const r = rig({ seed: 'S2' }); r.bond(r.f1); r.U(r.f1.id).sv = { body: -99 }; // (seed S2: no natural 20 on this save)
    const before = dist(r.U(r.me.id).pos, r.U(r.f1.id).pos), mp = r.U(r.me.id).mg.mp;
    const x = r.act('pull_together', r.f1, 'tend_tug');
    expect(x.err).toBeNull();
    expect(before - dist(r.U(r.me.id).pos, r.U(r.f1.id).pos)).toBe(nested('tend.tug', 1).tiles);
    expect(condOn(r.U(r.f1.id), 'reeled')).toBeFalsy();
    expect(mp - r.U(r.me.id).mg.mp).toBe(grant('tend.tug').res.mp);
    expect(r.cb().fx.some((e: any) => e.k === 'shove' && e.target === r.f1.id && e.pull)).toBe(true); // the forced move is drawn as any pull (combat.ts displace)
  });
  // The 0.29 consolidation (SF1): a Boss holds against every forced move of a player's item but for the items
  // rules.json forced_movement.boss_holds names: Tug, whose own row pulls a Boss its own tiles (effects 2).
  it('a Boss that fails its save is pulled the row\'s Boss tiles: Tug is the one exception to the Boss rule', () => {
    const r = rig({ seed: 'S2', foeTier: 'boss' }); r.bond(r.f1); r.U(r.f1.id).sv = { body: -99 };
    const before = dist(r.U(r.me.id).pos, r.U(r.f1.id).pos);
    expect(r.act('pull_together', r.f1, 'tend_tug').err).toBeNull();
    expect(before - dist(r.U(r.me.id).pos, r.U(r.f1.id).pos)).toBe(nested('tend.tug', 2).tiles);
  });
  it('an enemy that makes its save stays where it is', () => {
    const r = rig(); r.bond(r.f1); r.U(r.f1.id).sv = { body: 99 };
    const at = r.U(r.f1.id).pos;
    expect(r.act('pull_together', r.f1, 'tend_tug').err).toBeNull();
    expect(r.U(r.f1.id).pos).toBe(at);
  });
  it('an ally comes willing, further (no save)', () => {
    const r = rig(); r.bond(r.al);
    const before = dist(r.U(r.me.id).pos, r.U(r.al.id).pos);
    expect(r.act('pull_together', r.al, 'tend_tug').err).toBeNull();
    expect(before - dist(r.U(r.me.id).pos, r.U(r.al.id).pos)).toBe(nested('tend.tug', 4).tiles);
  });
  it('refusals in plain words: no Bond, no Attuner', () => {
    const r = rig();
    expect(r.act('pull_together', r.f1, 'tend_tug').err).toMatch(/isn't tied to you/);
    const q = rig(); q.bond(q.f1); q.s.g.characters[q.me.charId].offHand = null; // Bonded, then the Attuner is out of hand
    expect(q.act('pull_together', q.f1, 'tend_tug').err).toMatch(/Needs an Attuner in hand/);
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
  /** The ally goes Down to the enemies' own turns (combat/end-turn, the hostile phase): it stands beside them with 1 HP and
   * no Defense, the Medic far off and out of their harm; back to the Medic's turn (the ally's own, if any, is ended). */
  const downedByFoes = (r: any) => {
    const A = r.U(r.al.id), M = r.U(r.me.id); A.pos = '8,5'; A.hp = 1; A.def = -50; M.pos = '3,5'; M.maxHp = M.hp = 50000; M.def = 99;
    r.U(r.f1.id).pos = '9,5'; r.U(r.f2.id).pos = '9,6';
    for (let i = 0; i < 12 && !r.U(r.al.id).downed; i++) { const a = active(r.cb()); r.s.act({ type: 'combat/end-turn', unitId: a.id }); }
    expect(r.U(r.al.id).downed, 'the enemies Downed the ally').toBe(true);
    for (let i = 0; i < 12 && active(r.cb())?.id !== r.me.id; i++) r.s.act({ type: 'combat/end-turn', unitId: active(r.cb()).id });
    expect(active(r.cb())?.id).toBe(r.me.id);
  };
  it('a Bonded ally goes Down: your next Raise costs 0 AP; the one after is full price again', () => {
    const r = rig({ empathy: 5 }); r.bond(r.al);
    expect(r.row('Raise')?.cost?.ap ?? r.row('Raise')?.cost).not.toBe(0);
    downedByFoes(r);
    const ap = r.U(r.me.id).ap;
    expect(r.act('nobody_left_behind', r.U(r.al.id), 'tend_raise').err).toBeNull();
    expect(r.U(r.me.id).ap).toBe(ap);
    expect(r.U(r.al.id).downed).toBeFalsy();
  });
  it('an ally that is not Bonded going Down gives nothing', () => {
    const r = rig({ empathy: 5 });
    downedByFoes(r); r.U(r.al.id).pos = '4,5'; // beside the Medic: Raise reaches it without a Bond
    const ap = r.U(r.me.id).ap;
    expect(r.act('nobody_left_behind', r.U(r.al.id), 'tend_raise').err).toBeNull();
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
    r.bond(r.f2); r.act('pull_together', r.f2, 'tend_tug');
    r.s.act({ type: 'combat/end-turn', unitId: r.me.id });
    expect(r.cb().units.filter((u: any) => u.side === 'foe').every((u: any) => !u.dead)).toBe(true);
    expect(r.cb().round).toBeGreaterThanOrEqual(1);
  });
});

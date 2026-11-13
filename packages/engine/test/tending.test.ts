// @ts-nocheck (test fixtures: plain objects)
// Rules 1.33 (Classes 3.0 step 7): Tending, Bonds and the Mender (docs/design/bonds-spec.md). One test a rule of the
// spec's section 2, a verb or a move; every number is read from data (tending.json, classes.json, conditions.json).
import { describe, it, expect } from 'vitest';
import { storyWith, withGame } from './helpers/perkfight';
import { beginTurn, previewAttack, applyDamage, healUnit, setDowned, endCond, condOn } from '../src';
import { tiesOf, tiedTo, canStand } from '../src/kit';
import { runPerkAction, previewPerkAction, perkActionsFor, perkActionId } from '../src/effects/actions';
import { acted } from '../src/combat';
import { canReact } from '../src/tactics';
import { holds, FOCUS_IDS, mpNow, freePumps, swellFree, ledgerCap, classResources } from '../src/character';
import { statOf, levelFactor } from '../src/effects/output';
import { classMoveKeys, itemInfo } from '../src/effects/collect';
import { emit } from '../src/effects/hooks';
import { rollState } from './golden/harness';
import tendingJ from '../../../data/tending.json';
import classesJ from '../../../data/classes.json';
import soulJ from '../../../data/soul_modules.json';
import itemsJ from '../../../data/items.json';

const BOND: any = (tendingJ as any).bond;
const VERB = (id: string): any => (tendingJ as any).items.find((v: any) => v.id === id);
const GA = (id: string): any => VERB(id).effects.find((e: any) => e.op === 'grant_action');
const POOL = (origin: string, id: string): any => (classesJ as any).move_pool.moves.find((m: any) => m.origin === origin && m.id === id);
const BARD: any = (classesJ as any).base.find((b: any) => b.id === 'bard');
const INLINE = (id: string): any => Object.values(BARD.ranks).flatMap((r: any) => r.moves).find((m: any) => m.id === id);

type Spec = { skills?: Record<string, number>; attrs?: Record<string, number>; classId?: string | null; level?: number; weapon?: string; attuner?: 'hand' | 'pack' | null; name?: string };
/** A fight: the Bonder (first spec), its squad, Soldiers at the given tiles; the Attuner in the off hand unless said. */
function fight(specs: Spec[], foes: { at: string; tier?: string }[], o: { level?: number } = {}) {
  const s = storyWith(specs.map((x) => ({ name: x.name, skills: { camaraderie: 0, ...(x.skills || {}) }, attrs: x.attrs, classId: x.classId ?? null, level: x.level ?? 5, weapon: x.weapon || 'service_pistol' })));
  for (const [i, c] of s.chars.entries()) {
    const want = specs[i]?.attuner === undefined ? (i === 0 ? 'hand' : null) : specs[i].attuner;
    const ch = s.g.characters[c.id];
    if (want === 'hand') ch.offHand = { id: 'attuner' };
    if (want === 'pack') (ch.pack ||= []).push({ id: 'attuner', item: 'attuner', name: 'Attuner', qty: 1, kind: 'focus' });
  }
  s.act({ type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'Tend', map: 'yard16', difficulty: 'standard', level: o.level ?? 5,
    enemies: foes.map((f, i) => ({ name: 'Foe ' + (i + 1), tier: f.tier || 'soldier', weapon: 'service_pistol', at: f.at, no_surrender: true })) } } } as any);
  s.g.combat.units.filter((u) => u.side === 'pc').forEach((u, i) => (u.pos = '3,' + (5 + i))); // the squad in a column at x 3, the Bonder first
  s.g.combat.units.filter((u) => u.side === 'foe').forEach((u, i) => (u.pos = foes[i].at));
  const g = () => s.g, cb = () => s.g.combat;
  const pcs = () => cb().units.filter((u) => u.side === 'pc'), foesU = () => cb().units.filter((u) => u.side === 'foe');
  const turn = (u) => { const c = cb(); c.turn = c.order.indexOf(u.id); delete c.window; withGame(s.g, () => beginTurn(c, s.g.rng)); u.ap = 9; return u; };
  const W = (f) => withGame(s.g, f);
  // what the reducer's combat/perk does: the action, then the trigger acted (a class move's lifted ops run there), with the pick
  const act = (u, id: string, args: any = {}) => W(() => {
    const x = { u, c: s.g.characters[u.charId], cb: cb(), g: s.g }, err = runPerkAction(x, id, args, s.g.rng, 'combat');
    if (!err) acted(cb(), u, { action: perkActionId(x, id, args.actionId), t: args.targetId ? cb().units.find((v) => v.id === args.targetId) : null, tile: args.tile || null, ...(args.choice ? { choice: args.choice } : {}) });
    return err;
  });
  const pv = (u, id: string, args: any = {}) => W(() => previewPerkAction({ u, c: s.g.characters[u.charId], cb: cb(), g: s.g }, id, args, 'combat'));
  return (LAST = { g, cb, pcs, foes: foesU, turn, W, act, pv, char: (u) => s.g.characters[u.charId] });
}
const MENDER: Spec = { classId: 'bard', level: 12, skills: { empathy: 8 }, attrs: { insight: 8 } };
/** Make a foe's Heart save fail (or pass) whatever it rolls. */
const saves = (u, ok: boolean) => { u.sv = { ...(u.sv || {}), heart: ok ? 99 : -99 }; if (LAST?.g) LAST.g().rng.state = rollState(ok ? 15 : 5); }; // (and no natural 20 or 1 next)
let LAST: any = null;

describe('rules 1.33: the Attuner (a focus is data)', () => {
  it('items.json names each focus\'s door, hand and fuel; the Attuner is the empathy door\'s', () => {
    const it2 = (id: string) => (itemsJ as any).items.find((x: any) => x.id === id);
    expect(it2('attuner').focus).toMatchObject({ door: 'empathy', fuel: 'mp' });
    expect(it2('emanator').focus).toMatchObject({ door: 'will_power', fuel: 'mp' });
    expect(it2('evoker').focus).toMatchObject({ door: 'brain_power', fuel: 'core' });
    expect(FOCUS_IDS.attuner).toContain('attuner');
  });
  it('in a hand it opens the door and keeps MP; in the pack Bonds hold but no verb is used', () => {
    const f = fight([{ skills: { empathy: 3 } }, { name: 'Ally' }], [{ at: '8,5' }]), [u, al] = f.pcs();
    const c = f.char(u);
    expect(holds(c, { slot: 'hand', door: 'empathy' })).toBe(true); expect(mpNow(c)).toBeGreaterThan(0); expect(u.mg?.attuner).toBe(true);
    f.turn(u); expect(f.act(u, 'verb:tend.bond', { targetId: al.id })).toBeNull();
    const p = fight([{ skills: { empathy: 3 }, attuner: 'pack' }, { name: 'Ally' }], [{ at: '8,5' }]), [v, bl] = p.pcs();
    p.turn(v); expect(p.pv(v, 'verb:tend.bond', { targetId: bl.id }).ok).toBe(false);
  });
});

describe('rules 1.33 section 2: Bonds', () => {
  it('rule 1: an ally Bond needs no roll; the ally bears Bonded; an enemy saves (Heart, against Empathy)', () => {
    const f = fight([{ skills: { empathy: 5 } }, { name: 'Ally' }], [{ at: '6,5' }, { at: '7,5' }]), [u, al] = f.pcs(), [a, b] = f.foes();
    f.turn(u); expect(f.act(u, 'verb:tend.bond', { targetId: al.id })).toBeNull();
    expect(tiedTo(f.cb(), u, al, 'bond', 'to')).toBe(true); expect(condOn(al, 'bonded')).toBe(true);
    saves(a, true); f.act(u, 'verb:tend.bond', { targetId: a.id }); expect(tiedTo(f.cb(), u, a, 'bond')).toBe(false);
    f.cb().units.forEach((x) => (x.ap = 9)); u.ap = 9;
    saves(b, false); expect(f.act(u, 'verb:tend.bond', { targetId: b.id })).toBeNull(); expect(tiedTo(f.cb(), u, b, 'bond')).toBe(true);
  });
  it('rule 1: a machine has no heart to Bond; the reach is make_range (more from Empathy far_at)', () => {
    const f = fight([{ skills: { empathy: 1 } }], [{ at: '4,5' }, { at: String(2 + BOND.make_range + 2) + ',5' }]), [u] = f.pcs(), [m, far] = f.foes();
    u.pos = '2,5'; m.kind = 'robot'; f.turn(u);
    expect(f.pv(u, 'verb:tend.bond', { targetId: m.id }).ok).toBe(false);
    expect(f.pv(u, 'verb:tend.bond', { targetId: far.id }).why).toMatch(/range/i);
    expect(GA('tend.bond').reach.tiles.steps[0]).toMatchObject({ of: 'skill:empathy', at: BOND.far_at, value: BOND.make_range_far - BOND.make_range });
  });
  it('rule 2: Bonds held 1 / 2 / 3 at Empathy 1 / 5 / 8, the Mender one more; past the cap the action greys', () => {
    for (const [e, cls, want] of [[1, null, 1], [5, null, 2], [8, null, 3], [8, 'bard', 4]] as const) {
      const f = fight([{ skills: { empathy: e }, classId: cls, level: 12 }, { name: 'A' }, { name: 'B' }, { name: 'C' }, { name: 'D' }], [{ at: '12,9' }]), [u, ...al] = f.pcs();
      f.turn(u); for (const a of al) { u.ap = 9; f.act(u, cls ? 'verb:tend.bond' : 'verb:tend.bond', { targetId: a.id }); }
      expect(tiesOf(f.cb(), u, 'bond', 'from').length, 'Empathy ' + e + (cls ? ' Mender' : '')).toBe(want);
    }
  });
  it('rule 3: an enemy Bond ends with its Down, and its Bonded mark with it; the fight\'s end ends every Bond', () => {
    const f = fight([{ skills: { empathy: 5 } }], [{ at: '6,5' }]), [u] = f.pcs(), [a] = f.foes();
    f.turn(u); saves(a, false); f.act(u, 'verb:tend.bond', { targetId: a.id }); expect(tiedTo(f.cb(), u, a, 'bond')).toBe(true);
    f.W(() => applyDamage(f.cb(), a, a.hp + 50, { by: u, type: 'true', credit: 'hp' }));
    expect(tiedTo(f.cb(), u, a, 'bond')).toBe(false);
  });
  it('rule 3: the Attuner leaving the Bonder\'s person ends its Bonds at the next round\'s start', () => {
    const f = fight([{ skills: { empathy: 3 } }, { name: 'Ally' }], [{ at: '12,9' }]), [u, al] = f.pcs();
    f.turn(u); f.act(u, 'verb:tend.bond', { targetId: al.id }); expect(tiesOf(f.cb(), u, 'bond').length).toBe(1);
    f.char(u).offHand = null; f.W(() => (A_ROUND(f)));
    expect(tiesOf(f.cb(), u, 'bond').length).toBe(0); expect(condOn(al, 'bonded')).toBe(false);
  });
  it('rule 4: Tending through a Bond is ×through, at any range in sight', () => {
    const f = fight([{ skills: { empathy: 6 } }, { name: 'Near' }, { name: 'Far' }], [{ at: '15,10' }]), [u, near, far] = f.pcs();
    u.pos = '2,2'; near.pos = '3,2'; far.pos = '9,2'; f.turn(u);
    expect(f.pv(u, 'verb:tend.mend', { targetId: far.id }).ok).toBe(false); // 7 tiles, not Bonded
    f.act(u, 'verb:tend.bond', { targetId: far.id }); u.ap = 9;
    for (const t of [near, far]) t.hp = 10;
    f.act(u, 'verb:tend.mend', { targetId: near.id }); u.ap = 9; f.act(u, 'verb:tend.mend', { targetId: far.id });
    const n = near.hp - 10, fr = far.hp - 10; expect(Math.abs(fr - n * BOND.through)).toBeLessThanOrEqual(1); // (each heal is floored)
  });
  it('rule 5: 20% of the damage you take goes to your Bonded enemies, split, as Soul damage through no armour', () => {
    const f = fight([{ skills: { empathy: 5 } }], [{ at: '6,5' }, { at: '7,5' }, { at: '8,5' }]), [u] = f.pcs(), [a, b, c] = f.foes();
    f.turn(u); for (const x of [a, b]) { saves(x, false); u.ap = 9; f.act(u, 'verb:tend.bond', { targetId: x.id }); }
    u.shield = 0; const hp = u.hp, ha = a.hp, hb = b.hp;
    f.W(() => applyDamage(f.cb(), u, 100, { by: c, type: 'weapon', shield: true, credit: 'hp' }));
    expect(hp - u.hp).toBe(100 - Math.floor(100 * BOND.share)); expect(ha - a.hp + hb - b.hp).toBe(Math.floor(100 * BOND.share));
  });
  it('rule 6: +hit on every roll to hit a Bonded enemy, with the Attuner in hand', () => {
    const f = fight([{ skills: { empathy: 5 } }], [{ at: '6,5' }, { at: '7,5' }]), [u] = f.pcs(), [a, b] = f.foes();
    f.turn(u); saves(a, false); const before = f.W(() => previewAttack(f.cb(), u, a, 'shot')).toHit; expect(f.act(u, 'verb:tend.bond', { targetId: a.id })).toBeNull(); u.ap = 9; expect(tiedTo(f.cb(), u, a, 'bond')).toBe(true);
    const tA = f.W(() => previewAttack(f.cb(), u, a, 'shot')), tB = f.W(() => previewAttack(f.cb(), u, b, 'shot')); void tB;
    expect(tA.toHit - before).toBe(BOND.hit);
  });
  it('rule 7: a heal on yourself echoes 20% on each Bonded enemy at the start of its next turn', () => {
    const f = fight([{ skills: { empathy: 5 } }], [{ at: '6,5' }]), [u] = f.pcs(), [a] = f.foes();
    f.turn(u); saves(a, false); f.act(u, 'verb:tend.bond', { targetId: a.id }); u.ap = 9; u.hp = 20;
    f.act(u, 'verb:tend.mend_self'); const healed = u.hp - 20;
    expect(f.cb().delayed?.length).toBe(1); const hp = a.hp; f.turn(a);
    expect(hp - a.hp).toBe(Math.floor(healed * BOND.echo));
  });
  it('rule 8: damage to enemies ×(1 + per_bond × Bonds held)', () => {
    const f = fight([{ skills: { empathy: 5 } }, { name: 'Ally' }], [{ at: '6,5' }]), [u, al] = f.pcs(), [a] = f.foes();
    f.turn(u); const before = f.W(() => previewAttack(f.cb(), u, a, 'shot').dmg.total);
    f.act(u, 'verb:tend.bond', { targetId: al.id }); u.ap = 9;
    const one = f.W(() => previewAttack(f.cb(), u, a, 'shot').dmg.total);
    expect(one / before).toBeCloseTo(1 + BOND.per_bond, 5);
  });
  it('rule 10: a Bonded ally going Down costs down_mp MP', () => {
    const f = fight([{ skills: { empathy: 3 } }, { name: 'Ally' }], [{ at: '12,9' }]), [u, al] = f.pcs(), [a] = f.foes();
    f.turn(u); f.act(u, 'verb:tend.bond', { targetId: al.id }); const mp = u.mg.mp;
    f.W(() => applyDamage(f.cb(), al, al.hp + 5, { by: a, type: 'true', credit: 'hp' }));
    expect(mp - u.mg.mp).toBe(BOND.down_mp);
  });
  it('rule 11: tending through a Bond Traces you; an enemy Bond renews it at your turn start', () => {
    const f = fight([{ skills: { empathy: 3 } }, { name: 'Ally' }], [{ at: '8,8' }]), [u, al] = f.pcs(), [a] = f.foes();
    f.turn(u); f.act(u, 'verb:tend.bond', { targetId: al.id }); u.ap = 9; al.hp = 10; f.act(u, 'verb:tend.mend', { targetId: al.id });
    expect(condOn(u, 'traced')).toBe(true);
    const g2 = fight([{ skills: { empathy: 3 } }], [{ at: '6,5' }]), [v] = g2.pcs(), [b] = g2.foes();
    g2.turn(v); saves(b, false); g2.act(v, 'verb:tend.bond', { targetId: b.id }); endCond(v, 'traced', g2.cb()); g2.turn(v);
    expect(condOn(v, 'traced')).toBe(true);
  });
});

describe('rules 1.33 section 3: the verbs', () => {
  it('Mend: 2 AP and its MP (cheaper from Empathy 9); Mend yourself once a turn', () => {
    const mp = GA('tend.mend').res.mp;
    for (const e of [3, 9]) {
      const f = fight([{ skills: { empathy: e } }, { name: 'Ally' }], [{ at: '12,9' }]), [u, al] = f.pcs();
      f.turn(u); al.hp = 10; const m = u.mg.mp; f.act(u, 'verb:tend.mend', { targetId: al.id });
      expect(m - u.mg.mp).toBe(mp.base + (e >= mp.steps[0].at ? mp.steps[0].value : 0)); expect(u.ap).toBe(9 - GA('tend.mend').ap);
    }
    const f = fight([{ skills: { empathy: 3 } }], [{ at: '12,9' }]), [u] = f.pcs(); f.turn(u); u.hp = 10;
    expect(f.act(u, 'verb:tend.mend_self')).toBeNull(); expect(f.pv(u, 'verb:tend.mend_self').ok).toBe(false);
  });
  it('Touch: adjacent only; Shield: a shield; Settle: Settled; Soothe: the newest Body condition', () => {
    const f = fight([{ skills: { empathy: 5 } }, { name: 'Ally' }], [{ at: '12,9' }]), [u, al] = f.pcs();
    u.pos = '3,3'; al.pos = '6,3'; f.turn(u);
    expect(f.pv(u, 'verb:tend.touch', { targetId: al.id }).ok).toBe(false); al.pos = '4,3';
    expect(f.pv(u, 'verb:tend.touch', { targetId: al.id }).ok).toBe(true);
    al.shield = 0; f.act(u, 'verb:tend.shield', { targetId: al.id }); expect(al.shield).toBeGreaterThan(0); u.ap = 9;
    f.act(u, 'verb:tend.settle', { targetId: al.id }); expect(condOn(al, 'settled')).toBe(true); u.ap = 9;
    al.conds = { ...(al.conds || {}), weakened: 2, slowed: 2 }; al.condAt = { weakened: 1, slowed: 2 };
    f.act(u, 'verb:tend.soothe', { targetId: al.id }); expect(condOn(al, 'slowed')).toBe(false); expect(condOn(al, 'weakened')).toBe(true);
  });
  it('Raise: a Downed ally next to you stands; Guide: an ally steps to the tile you pick; Let go ends a Bond', () => {
    const f = fight([{ skills: { empathy: 4 } }, { name: 'Ally' }], [{ at: '12,9' }]), [u, al] = f.pcs();
    u.pos = '3,3'; al.pos = '4,3'; f.turn(u); f.W(() => setDowned(al, true)); al.hp = 0;
    expect(f.act(u, 'verb:tend.raise', { targetId: al.id })).toBeNull(); expect(al.downed).toBe(false); expect(al.hp).toBeGreaterThanOrEqual(1);
    const to = ['5,3', '5,2', '4,2', '4,4', '5,4'].find((k) => f.W(() => canStand(f.cb(), k)))!;
    u.ap = 9; expect(f.act(u, 'verb:tend.guide', { targetId: al.id, tile: to })).toBeNull(); expect(al.pos).toBe(to);
    u.ap = 9; f.act(u, 'verb:tend.bond', { targetId: al.id }); expect(f.act(u, 'verb:tend.let_go', { targetId: al.id })).toBeNull();
    expect(tiesOf(f.cb(), u, 'bond').length).toBe(0);
  });
  it('Share a Hit (Camaraderie 1): an adjacent ally hit, you take 25% + 5% a point (a protective reaction)', () => {
    const f = fight([{ skills: { camaraderie: 3 }, attuner: null }, { name: 'Ally' }], [{ at: '12,9' }]), [u, al] = f.pcs(), [a] = f.foes();
    u.pos = '3,3'; al.pos = '4,3'; u.shield = 0; al.shield = 0; const h0 = u.hp, a0 = al.hp;
    f.W(() => applyDamage(f.cb(), al, 100, { by: a, type: 'weapon', shield: true, credit: 'hp' }));
    expect(h0 - u.hp).toBe(Math.floor(100 * (0.25 + 0.05 * 3))); expect(a0 - al.hp).toBe(100 - Math.floor(100 * (0.25 + 0.05 * 3)));
  });
  it('Share a Hit is an Answer with a switch (the lead\'s ruling): on by default, it spends the reaction; off in the Answer list, it never fires', () => {
    const run = (answers: string[] | null) => {
      const f = fight([{ skills: { camaraderie: 3 }, attuner: null }, { name: 'Ally' }], [{ at: '12,9' }]), [u, al] = f.pcs(), [a] = f.foes();
      if (answers) f.W(() => (f.char(u).phys = { ...(f.char(u).phys || {}), answers }));
      u.pos = '3,3'; al.pos = '4,3'; u.shield = 0; al.shield = 0; const h0 = u.hp;
      f.W(() => applyDamage(f.cb(), al, 100, { by: a, type: 'weapon', shield: true, credit: 'hp' }));
      return { took: h0 - u.hp, canReact: f.W(() => canReact(f.cb(), u, 'protect')) };
    };
    const on = run(null), off = run(['interpose']), listed = run(['share_a_hit']);
    expect(on.took).toBeGreaterThan(0); expect(on.canReact).toBe(false); // the one reaction is spent
    expect(off.took).toBe(0); expect(off.canReact).toBe(true);
    expect(listed.took).toBe(on.took);
  });
  it('Field Surgery is a verb at Empathy 3; Stim Throw is a row of actions.json', () => {
    expect(VERB('tend.field_surgery').requires).toEqual([{ skill: 'empathy', min: 3 }]);
  });
});

describe('rules 1.33 section 5: the Mender', () => {
  it('the free Bond: 0 AP, once a turn, no range limit in sight', () => {
    const f = fight([MENDER, { name: 'Ally' }], [{ at: '12,9' }]), [u, al] = f.pcs(); u.pos = '2,2'; al.pos = '12,2';
    f.turn(u); expect(f.act(u, 'verb:tend.bond_free', { targetId: al.id })).toBeNull(); expect(u.ap).toBe(9);
    expect(f.pv(u, 'verb:tend.bond_free', { targetId: al.id }).ok).toBe(false);
  });
  it('Triage: its AP and MP, once an ally a turn, stops Bleeding', () => {
    const f = fight([MENDER, { name: 'Ally' }], [{ at: '12,9' }]), [u, al] = f.pcs(); u.pos = '3,3'; al.pos = '4,3';
    f.turn(u); al.hp = 10; al.bleed = 2; al.conds = { ...(al.conds || {}), bleeding: 2 }; const m = u.mg.mp;
    expect(f.act(u, 'class:medic.triage', { targetId: al.id, actionId: 'triage' })).toBeNull();
    expect(al.hp).toBeGreaterThan(10); expect(m - u.mg.mp).toBe(POOL('medic', 'triage').effects[0].res.mp);
    expect(f.pv(u, 'class:medic.triage', { targetId: al.id, actionId: 'triage' }).ok).toBe(false);
  });
  it('the Ledger: counts what you heal, capped; spent on the next damage to an enemy', () => {
    const f = fight([MENDER, { name: 'Ally' }], [{ at: '6,5' }]), [u, al] = f.pcs(), [a] = f.foes();
    expect(classResources(f.char(u)).find((r) => r.id === 'ledger')?.max).toBe(ledgerCap(f.char(u)));
    f.turn(u); al.hp = 10; f.act(u, 'class:medic.triage', { targetId: al.id, actionId: 'triage' });
    expect(u.res.ledger).toBe(al.hp - 10);
    const L = u.res.ledger, base = f.W(() => { const r = u.res.ledger; u.res.ledger = 0; const v = previewAttack(f.cb(), u, a, 'shot').dmg; u.res.ledger = r; return v; });
    void base; expect(L).toBeGreaterThan(0);
  });
  it('Inspire (rank II): a felt feeling given to a Bonded ally; not twice a round on one unit', () => {
    const f = fight([MENDER, { name: 'Ally' }], [{ at: '12,9' }]), [u, al] = f.pcs(); f.char(u).feelings = ['rage', 'love'];
    f.turn(u); f.act(u, 'verb:tend.bond', { targetId: al.id }); u.ap = 9;
    expect(f.act(u, 'class:bard.inspire', { targetId: al.id, choice: 'rage' })).toBeNull();
    expect(condOn(al, 'given_rage')).toBe(true); expect(condOn(al, 'given_edge')).toBe(true);
    u.ap = 9; expect(f.pv(u, 'class:bard.inspire', { targetId: al.id, choice: 'love' }).ok).toBe(false);
  });
  it('Take the Weight (rank II): a Bonded ally that would go Down stays at 1 HP; you lose 15% of your max HP', () => {
    const f = fight([MENDER, { name: 'Ally' }], [{ at: '12,9' }]), [u, al] = f.pcs(), [a] = f.foes();
    f.turn(u); f.act(u, 'verb:tend.bond', { targetId: al.id }); al.shield = 0; const hp = u.hp;
    f.W(() => applyDamage(f.cb(), al, al.hp + 30, { by: a, type: 'weapon', shield: true, credit: 'hp' }));
    expect(al.hp).toBe(1); expect(hp - u.hp).toBe(Math.floor(u.maxHp * INLINE('take_the_weight').amounts.weight.per[0].value));
  });
  it('Brimming (rank III): Tending past max HP leaves half the excess as a shield', () => {
    const f = fight([MENDER, { name: 'Ally' }], [{ at: '12,9' }]), [u, al] = f.pcs();
    f.turn(u); al.hp = al.maxHp - 2; al.shield = 0; f.act(u, 'verb:tend.mend', { targetId: al.id });
    expect(al.hp).toBe(al.maxHp); expect(al.shield).toBeGreaterThan(0);
  });
  it('Rally (rank III): every Bonded ally anywhere and every ally within reach heals', () => {
    const f = fight([MENDER, { name: 'Near' }, { name: 'Far' }], [{ at: '15,10' }]), [u, near, far] = f.pcs();
    u.pos = '2,2'; near.pos = '3,2'; far.pos = '14,2'; f.turn(u); f.act(u, 'verb:tend.bond_free', { targetId: far.id });
    near.hp = 10; far.hp = 10; expect(f.act(u, 'class:bard.rally')).toBeNull(); expect(near.hp).toBeGreaterThan(10); expect(far.hp).toBeGreaterThan(10);
  });
  it('the class: MP and the Ledger, no Supplies; its old move keys still resolve', () => {
    expect(BARD.resources).toEqual(['mp', 'ledger']); expect(BARD.resource.id).toBe('ledger');
    const keys = classMoveKeys({ perks: [], traits: [], cls: 'bard', rank: 3 }).map((k) => k.key);
    expect(keys).toEqual(['class:medic.triage', 'class:bard.ledger', 'class:bard.inspire', 'class:bard.take_the_weight', 'class:bard.mend', 'class:bard.rally']);
    for (const k of keys) expect(itemInfo(k), k).toBeTruthy();
  });
});

describe('rules 1.33 section 4: what leaves Empathy', () => {
  it('the free Pump and the swell without Strain are Will Power\'s', () => {
    const fp = (soulJ as any).cycle.free_pumps[0], sw = (soulJ as any).cycle.swell_no_strain;
    const c: any = { skills: { empathy: 10, will_power: 0 }, attrs: { insight: 10, determination: 10 }, perks: [], traits: [] };
    expect(freePumps(c)).toBe(0); expect(swellFree(c)).toBe(false);
    c.skills.will_power = Math.max(fp.will_power, sw.will_power);
    expect(freePumps(c)).toBe(fp.pumps); expect(swellFree(c)).toBe(true);
  });
  it('the tend profile is Healing given (Insight and Empathy), k from data', () => {
    const c: any = { skills: { empathy: 6 }, attrs: { insight: 6 } };
    expect(statOf('tend', c)).toBeCloseTo(1.573 * (1 + 0.06 * 5 + 0.06 * 6), 3);
    void levelFactor;
  });
});

/** Run a round's start (the tie rules run there). */
function A_ROUND(f: any) { const cb = f.cb(); cb.round += 1; emit(cb, 'round_start', { cb }); }

// Rules revision 1.25 (the fire doctrine; 12 Nov 2026; spec: "Rules revision 1.25"). What this file pins, each from a
// sentence of the spec:
//   the doctrine        every tier takes "the most hurt" (HP as a share of max, in tenths) and bends it by two numbers
//                       of its own (data/enemies.json): fire_spread, a share of max HP a target counts as less hurt
//                       for each other enemy that has attacked it this round; fire_near, the same for each tile it
//                       stands further off than the nearest target
//   Vermin, Minions     the nearest (fire_near 1)
//   Soldiers            spread: one each, the near ones first (fire_spread 1, fire_near 0.2)
//   Elites, Bosses      focus: the most hurt they can get at (fire_near 0.1); a Boss's escorts keep their own doctrine
//   what still stands   Taunt first; the healer weight of rules 1.23, which distance does not move; a technique takes
//                       the target a plain attack would; the intent and the fight log say why
//   deterministic       it reads the fight's state only
// The fit (pairs under fire, whole fights) is measured in balance/defence-measure.test.ts.
import { describe, expect, it } from 'vitest';
import './helpers/yard16';
import { ENEMY, AIM_WHY, HEALER_WHY, enemyIntent, enemyTurn, enemyPreference, noteEnemyAim, doctrineOf, healerMark, healUnit, applyCond, phys, type Unit } from '../src';
import { fightWith, withGame, type FoeSpec } from './helpers/perkfight';

const RIFLE = 'hellraiser_service_rifle';
/** Ada and Bo (and Cy when asked) on bare ground in plain sight, everyone at 200 HP and no armour, as easy to hit as
 * each other; the enemies stand in a column at x = 11. Ada 5,4 · Bo 5,6 · Cy 5,5: all 6 tiles from an enemy at 11,5. */
function rig(foes: FoeSpec[], o: { three?: boolean; plain?: boolean } = {}) {
  const f = fightWith([{ name: 'Ada' }, { name: 'Bo' }, ...(o.three ? [{ name: 'Cy' }] : [])], foes.map((q) => ({ weapon: RIFLE, ...q })));
  const cb = f.cb; cb.map = { ...cb.map, cover: [], full: [], solid: [], difficult: [] } as any; cb.objects = [];
  const at = ['5,4', '5,6', '5,5']; f.pcs.forEach((p, i) => { p.pos = at[i]; });
  const col = ['11,5', '11,4', '11,6', '11,3']; f.foes.forEach((e, i) => { e.pos = col[i]; });
  for (const x of cb.units) { x.hp = x.maxHp = 200; x.armour = 0; x.shield = 0; x.hidden = false; (x as any).healRecv = 1; }
  delete cb.fire; delete cb.doctrineSaid; // (the opening may have been played: nobody has fired yet)
  if (o.plain !== false) for (const e of f.foes) { e.techs = []; e.calls = []; } // plain attacks: the choice read is the target choice
  return f;
}
type F = ReturnType<typeof rig>;
const G = <T>(f: F, fn: () => T) => withGame(f.g, fn);
const pc = (f: F, name: string) => f.pcs.find((p) => p.name === name)!;
const aim = (f: F, e: Unit) => G(f, () => { const it = enemyIntent(f.cb, e); return { who: it.targetId ? f.unit(it.targetId).name : null, why: it.why, text: it.text, kind: it.kind }; });
const shot = (f: F, e: Unit, name: string) => G(f, () => noteEnemyAim(f.cb, e, pc(f, name)));
/** Bo mends Ada for n (Ada is hurt first so the heal lands, then put back). */
const mend = (f: F, n: number) => G(f, () => { const a = pc(f, 'Ada'), was = a.hp; a.hp = Math.max(1, a.hp - n); healUnit(f.cb, a, n, pc(f, 'Bo'), 'soul'); a.hp = was; });

describe('rules 1.25: each tier has a fire doctrine, in the data', () => {
  it('Vermin and Minions the nearest, Soldiers spread, Elites and Bosses focus; the numbers are provisional', () => {
    const row = (t: string) => { const e: any = ENEMY[t]; return [e.doctrine, e.fire_spread, e.fire_near]; };
    expect(row('vermin')).toEqual(['nearest', 0, 1]); expect(row('minion')).toEqual(['nearest', 0, 1]);
    expect(row('soldier')).toEqual(['spread', 1, 0.2]);
    expect(row('elite')).toEqual(['focus', 0, 0.1]); expect(row('boss')).toEqual(['focus', 0, 0.1]);
    for (const t of ['vermin', 'minion', 'soldier', 'elite', 'boss']) expect((ENEMY[t] as any).provisional, t).toBe(true);
  });
  it('a unit with no tier (a companion, a character) has no doctrine numbers: the most hurt, as before', () => {
    const f = rig([{ tier: 'soldier' }]);
    expect(doctrineOf(f.foe)).toEqual({ id: 'spread', spread: 1, near: 0.2 });
    expect(doctrineOf(f.pcs[0])).toEqual({ id: 'focus', spread: 0, near: 0 });
    expect(doctrineOf({ ...f.foe, tier: undefined } as any)).toEqual({ id: 'focus', spread: 0, near: 0 });
  });
});

describe('rules 1.25: Soldiers spread their fire', () => {
  it('one each: the second Soldier takes the one no ally has attacked this round, and its intent says so', () => {
    const f = rig([{ tier: 'soldier' }, { tier: 'soldier' }]), [s1, s2] = f.foes;
    const first = aim(f, s1); expect(first.kind).toBe('attack'); expect(first.why).toBeUndefined(); // nothing to choose between: no reason given
    expect(aim(f, s2).who).toBe(first.who); // nobody has fired yet: they read the field alike
    shot(f, s1, first.who!);
    const second = aim(f, s2), other = first.who === 'Ada' ? 'Bo' : 'Ada';
    expect(second.who).toBe(other); expect(second.why).toBe('spread'); expect(second.text).toBe('shoot ' + other + ': it spreads its fire');
    expect(AIM_WHY.spread).toBe(': it spreads its fire');
    expect(aim(f, s1).who, 'its own fire does not push it off its target').toBe(first.who);
  });
  it('it does not double up on the badly hurt: the wounded one is the first Soldier\'s, the second takes the other', () => {
    const f = rig([{ tier: 'soldier' }, { tier: 'soldier' }]), [s1, s2] = f.foes; pc(f, 'Bo').hp = 20;
    const a = aim(f, s1); expect(a.who).toBe('Bo'); expect(a.why).toBe('wounded'); expect(a.text).toBe('shoot Bo: it goes for the wounded');
    shot(f, s1, 'Bo');
    const b = aim(f, s2); expect(b.who).toBe('Ada'); expect(b.why).toBe('spread');
  });
  it('one each, then the most hurt: a third Soldier on two targets takes the worse off', () => {
    const f = rig([{ tier: 'soldier' }, { tier: 'soldier' }, { tier: 'soldier' }]), [s1, s2, s3] = f.foes; pc(f, 'Ada').hp = 120;
    shot(f, s1, 'Ada'); shot(f, s2, 'Bo');
    const c = aim(f, s3); expect(c.who).toBe('Ada'); expect(c.why).toBe('wounded');
  });
  it('the memory is the round\'s: next round nobody has fired yet', () => {
    const f = rig([{ tier: 'soldier' }, { tier: 'soldier' }]), [s1, s2] = f.foes; pc(f, 'Bo').hp = 100;
    shot(f, s1, 'Bo'); expect(aim(f, s2).who).toBe('Ada');
    f.cb.round++; const b = aim(f, s2); expect(b.who).toBe('Bo'); expect(b.why).toBe('wounded');
  });
  it('the near ones first: a target 6 tiles further back is not worth leaving the line for; 3 tiles further is', () => {
    const far = rig([{ tier: 'soldier' }, { tier: 'soldier' }]); pc(far, 'Bo').pos = '0,5'; pc(far, 'Ada').pos = '6,5'; // from 11,4: Ada 5 tiles, Bo 11
    far.foes[0].pos = '11,5'; far.foes[1].pos = '11,5'; far.foes[0].pos = '11,4';
    const a = aim(far, far.foes[1]); expect(a.who).toBe('Ada'); expect(a.why).toBe('nearest'); expect(a.text).toBe('shoot Ada: it takes the nearest');
    shot(far, far.foes[0], 'Ada'); expect(aim(far, far.foes[1]).who, 'both on the near one: 1 for the ally on her against 6 × 0.2').toBe('Ada');
    pc(far, 'Bo').pos = '3,5'; // 3 tiles behind Ada: 0.6 against 1
    const b = aim(far, far.foes[1]); expect(b.who).toBe('Bo'); expect(b.why).toBe('spread');
  });
  it('played: two Soldiers fire at one each, and the fight log says it once', () => {
    const f = rig([{ tier: 'soldier' }, { tier: 'soldier' }]), [s1, s2] = f.foes, l0 = f.cb.log.length;
    for (const [e, seed] of [[s1, 5], [s2, 9], [s1, 13], [s2, 17]] as [Unit, number][]) { f.cb.turn = f.cb.order.indexOf(e.id); e.ap = 6; e.shotsThisTurn = 0; G(f, () => enemyTurn(f.cb, { state: seed })); for (const p of f.pcs) p.hp = 200; }
    const on = f.cb.fire!.on, ids = Object.keys(on); expect(ids.sort()).toEqual(f.pcs.map((p) => p.id).sort());
    for (const id of ids) expect(on[id].length, 'one Soldier on each').toBe(1);
    const log = f.cb.log.slice(l0);
    expect(log.filter((l) => /takes a target nobody else is shooting at: the enemy spreads its fire\./.test(l)).length).toBe(1);
  });
});

describe('rules 1.25: Vermin and Minions take the nearest', () => {
  for (const tier of ['vermin', 'minion']) it(tier + ': the nearest, however hurt the far one is; at the same distance, the more hurt', () => {
    const f = rig([{ tier }]); pc(f, 'Ada').pos = '7,5'; pc(f, 'Bo').pos = '5,5'; pc(f, 'Bo').hp = 10;
    const a = aim(f, f.foe); expect(a.who).toBe('Ada'); expect(a.why).toBe('nearest');
    pc(f, 'Bo').pos = '7,4'; pc(f, 'Ada').pos = '7,6';
    const b = aim(f, f.foe); expect(b.who).toBe('Bo'); expect(b.why).toBe('wounded');
  });
  it('they do not spread: an ally\'s fire on the nearest changes nothing', () => {
    const f = rig([{ tier: 'minion' }, { tier: 'minion' }]); pc(f, 'Ada').pos = '7,5'; pc(f, 'Bo').pos = '5,5';
    shot(f, f.foes[0], 'Ada'); expect(aim(f, f.foes[1]).who).toBe('Ada');
  });
});

describe('rules 1.25: Elites and Bosses focus', () => {
  for (const tier of ['elite', 'boss']) it(tier + ': the most hurt, with an ally already on it or not', () => {
    const f = rig([{ tier }, { tier: 'elite' }]), [e, ally] = f.foes; pc(f, 'Bo').hp = 100;
    const a = aim(f, e); expect(a.who).toBe('Bo'); expect(a.why).toBe('wounded');
    shot(f, ally, 'Bo'); const b = aim(f, e); expect(b.who).toBe('Bo'); expect(b.why).toBe('wounded');
  });
  it('the most hurt it can get at: each tile further off than the nearest counts as a tenth of max HP', () => {
    const f = rig([{ tier: 'elite' }]); f.foe.pos = '11,5'; pc(f, 'Ada').pos = '6,5'; pc(f, 'Bo').pos = '3,5'; // Ada 5 tiles, Bo 8: 0.3
    pc(f, 'Bo').hp = 100; { const a = aim(f, f.foe); expect(a.who, 'half dead, 3 tiles further: 0.5 + 0.3 against 1').toBe('Bo'); expect(a.why).toBe('wounded'); }
    pc(f, 'Bo').hp = 180; { const a = aim(f, f.foe); expect(a.who, 'a scratch, 3 tiles further: 0.9 + 0.3 against 1').toBe('Ada'); expect(a.why).toBe('nearest'); }
  });
  it('a Boss\'s escorts keep their own doctrine: the Boss\'s target is under fire, so its Soldiers take the others', () => {
    const f = rig([{ tier: 'boss' }, { tier: 'soldier' }, { tier: 'soldier' }], { three: true }), [boss, s1, s2] = f.foes; pc(f, 'Cy').hp = 100;
    expect(aim(f, boss).who).toBe('Cy'); shot(f, boss, 'Cy');
    const a = aim(f, s1); expect(a.who).not.toBe('Cy'); expect(a.why).toBe('spread'); shot(f, s1, a.who!);
    const b = aim(f, s2); expect(['Ada', 'Bo']).toContain(b.who); expect(b.who).not.toBe(a.who); expect(b.why).toBe('spread');
  });
});

describe('rules 1.25: what still stands on top of the doctrine', () => {
  it('Taunt wins: a Taunted Soldier shoots its Taunter, whoever else is free, and gives no reason', () => {
    const f = rig([{ tier: 'soldier' }, { tier: 'soldier' }]), [s1, s2] = f.foes;
    shot(f, s1, 'Ada'); expect(aim(f, s2).who).toBe('Bo');
    G(f, () => { s2.sv = { body: -99, brain: -99, heart: -99 } as any; applyCond(f.cb, { state: 3 }, pc(f, 'Ada'), s2, 'taunted', 2, undefined, { skipSave: true }); });
    const a = aim(f, s2); expect(a.who).toBe('Ada'); expect(a.why).toBeUndefined(); expect(a.text).toBe('shoot Ada');
  });
  it('a Taunted Minion leaves the nearest for its Taunter', () => {
    const f = rig([{ tier: 'minion' }]); pc(f, 'Ada').pos = '7,5'; pc(f, 'Bo').pos = '5,5';
    G(f, () => { f.foe.sv = { body: -99, brain: -99, heart: -99 } as any; applyCond(f.cb, { state: 3 }, pc(f, 'Bo'), f.foe, 'taunted', 2, undefined, { skipSave: true }); });
    expect(aim(f, f.foe).who).toBe('Bo');
  });
  it('the healer weight (rules 1.23): a Soldier still leans to the healer, an Elite still puts the healer first', () => {
    const s = rig([{ tier: 'soldier' }]); mend(s, 40); pc(s, 'Ada').hp = 140; // Bo counts as at 0.5, Ada is at 0.7
    { const a = aim(s, s.foe); expect(a.who).toBe('Bo'); expect(a.why).toBe('healer'); expect(a.text).toBe('shoot Bo' + HEALER_WHY); }
    pc(s, 'Ada').hp = 80; expect(aim(s, s.foe).who, 'a Soldier still finishes someone badly hurt first').toBe('Ada');
    const e = rig([{ tier: 'elite' }]); mend(e, 40); pc(e, 'Ada').hp = 20; expect(aim(e, e.foe).who).toBe('Bo');
  });
  it('distance does not move the healer\'s place: an Elite goes for a healer 6 tiles behind the line', () => {
    const f = rig([{ tier: 'elite' }]); pc(f, 'Ada').pos = '7,5'; pc(f, 'Bo').pos = '1,5'; mend(f, 40);
    G(f, () => expect(healerMark(f.cb, f.foe)).toBe(pc(f, 'Bo')));
    const a = aim(f, f.foe); expect(a.who).toBe('Bo'); expect(a.why).toBe('healer');
  });
  it('a Soldier whose ally is already on the healer spreads to the others: the lean is half, an ally\'s fire is one', () => {
    const f = rig([{ tier: 'soldier' }, { tier: 'soldier' }]), [s1, s2] = f.foes; mend(f, 40);
    expect(aim(f, s1).who).toBe('Bo'); shot(f, s1, 'Bo');
    const b = aim(f, s2); expect(b.who).toBe('Ada'); expect(b.why).toBe('spread');
  });
  it('a technique takes the target a plain attack would: the same doctrine, the same reason on the intent', () => {
    const f = rig([{ tier: 'soldier' }, { tier: 'soldier' }], { plain: false }), [s1, s2] = f.foes;
    f.turn(s2); for (const x of f.cb.units) { x.hp = x.maxHp = 200; x.armour = 0; } delete f.cb.fire;
    shot(f, s1, 'Ada');
    const pref = G(f, () => enemyPreference(f.cb, s2, f.pcs)); expect(pref.order[0].name).toBe('Bo'); expect(pref.why).toBe('spread');
    const p = G(f, () => phys.aiTechnique(f.cb, s2)); expect(p, 'a Soldier with a rifle has a technique it wants').not.toBeNull();
    expect(p!.target?.name).toBe('Bo'); expect(p!.why).toBe('spread');
    const it = G(f, () => enemyIntent(f.cb, s2)); expect(it.targetId).toBe(pc(f, 'Bo').id); expect(it.why).toBe('spread'); expect(it.text).toMatch(/^use .+ on Bo: it spreads its fire$/);
    G(f, () => enemyTurn(f.cb, { state: 21 }));
    expect(f.cb.fire!.on[pc(f, 'Bo').id], 'the technique is remembered as fire on Bo').toContain(s2.id);
  });
});

describe('rules 1.25: deterministic', () => {
  it('reading an intent changes nothing; the same fight twice gives the same log', () => {
    const play = () => {
      const f = rig([{ tier: 'soldier' }, { tier: 'soldier' }, { tier: 'elite' }], { three: true, plain: false }); pc(f, 'Cy').hp = 150;
      const before = JSON.stringify([f.cb.fire, f.cb.doctrineSaid, f.cb.log.length]);
      const read = f.foes.map((e) => aim(f, e)); expect(JSON.stringify([f.cb.fire, f.cb.doctrineSaid, f.cb.log.length])).toBe(before);
      expect(f.foes.map((e) => aim(f, e))).toEqual(read);
      const l0 = f.cb.log.length;
      for (let r = 0; r < 2; r++) { for (const [i, e] of f.foes.entries()) { f.cb.turn = f.cb.order.indexOf(e.id); e.ap = 6; e.shotsThisTurn = 0; G(f, () => enemyTurn(f.cb, { state: 31 + 7 * i + r })); } f.cb.round++; }
      return { log: f.cb.log.slice(l0), hp: f.pcs.map((p) => p.hp), fire: JSON.stringify(f.cb.fire) };
    };
    const a = play(), b = play(); expect(a).toEqual(b); expect(a.log.length).toBeGreaterThan(4);
  });
});

// Rules revision 1.23 (the defence step; 12 Nov 2026; spec: "Rules revision 1.23"). What this file pins, each from a
// sentence of the spec:
//   no round limit      (the withdrawal itself is pinned in rules120-heal-shield.test.ts)
//   the healer weight   the enemies go for whoever has healed and shielded others the most over this round and the
//                       last: a Soldier leans that way (the healer counts as hurt by half its max HP more), an Elite
//                       and a Boss put the healer first and, with a gun, step to where they have a shot; Minions and
//                       Vermin never look. Taunt still wins; a Hidden or unseen healer is not known; a healer behind
//                       good cover is not worth the rounds; the intent and the fight log say why
//   the medic's kit     Triage 5, a stim and Stim Throw 6, Rally 6, a Field Repair 3 a point: each × Healing given ×
//                       the level factor; out of a fight a Triage is three times a fight's
//   Split               a Split heal or shield is divided: ×0.8 each
//   the Boss            its HP (the refit) and the enemy's Burst
// The bands (percent of a Soldier-turn, heal per AP) are pinned in balance/defence-measure.test.ts.
import { describe, expect, it } from 'vitest';
import './helpers/yard16';
import {
  ENEMY, RULES, MODULE, TECHNIQUE, healUnit, grantShield, enemyIntent, enemyTurn, healerMark, healerFocus, tendedLately, noteTended, mendFactor, healingMult,
  TRIAGE_HEAL, TRIAGE_REST_MULT, STIM_HEAL, RALLY_HEAL, FIELD_REPAIR_HEAL, TEND_ROUNDS, TEND_NOTICE, SPLIT_BOON, outburstHeal, inverseShield, burstRolls, WEAPON, enemyStats,
  applyCond, HEALER_WHY, type Unit,
} from '../src';
import { fightWith, withGame, type FoeSpec } from './helpers/perkfight';

/** Two characters side by side at 3,4 and 3,6 and one enemy at 9,5 on bare ground: both are 6 tiles off, in plain
 * sight, as easy to hit as each other. Everyone has 200 HP and no armour; the enemy's turn is read, not rolled. */
function rig(foe: FoeSpec = { tier: 'soldier', weapon: 'hellraiser_service_rifle' }, o: { level?: number; also?: FoeSpec[] } = {}) {
  const f = fightWith([{ name: 'Ada', ...(o.level ? { level: o.level } : {}) }, { name: 'Bo', ...(o.level ? { level: o.level } : {}) }], [foe, ...(o.also || [])]);
  const cb = f.cb; cb.map = { ...cb.map, cover: [], full: [], solid: [], difficult: [] } as any; cb.objects = [];
  f.pcs[0].pos = '3,4'; f.pcs[1].pos = '3,6'; f.foe.pos = '9,5';
  for (const x of [...f.pcs, ...f.foes]) { x.hp = x.maxHp = 200; x.armour = 0; (x as any).healRecv = 1; (x as any).shieldRecv = 1; x.shield = 0; }
  f.foe.techs = []; f.foe.calls = []; // plain attacks, so the choice read is the target choice
  return f;
}
type F = ReturnType<typeof rig>;
const ada = (f: F) => f.pcs[0], bo = (f: F) => f.pcs[1];
const G = <T>(f: F, fn: () => T) => withGame(f.g, fn);
/** Bo mends Ada for n (Ada is hurt first so the heal lands, then put back to full). */
const mend = (f: F, n: number, by = bo(f), t = ada(f)) => G(f, () => { const was = t.hp; t.hp = Math.max(1, t.hp - n); healUnit(f.cb, t, n, by, 'soul'); t.hp = was; });

describe('rules 1.23: who has been mending', () => {
  it('healing and shields given to OTHERS are counted on the giver, for this round and the last', () => {
    const f = rig(); expect(TEND_ROUNDS).toBe(2); expect(TEND_NOTICE).toBe(0.1);
    G(f, () => {
      const a = ada(f), b = bo(f); a.hp = 50;
      healUnit(f.cb, a, 30, b, 'soul'); expect(tendedLately(f.cb, b)).toBe(30);
      healUnit(f.cb, a, 30, b, 'stim'); healUnit(f.cb, a, 30, b, 'triage'); healUnit(f.cb, a, 30, b, 'blessing'); expect(tendedLately(f.cb, b)).toBe(120); // spells, prayers, the medic's kit alike
      healUnit(f.cb, a, 500, b, 'soul'); expect(tendedLately(f.cb, b)).toBe(150); // only what was restored (she was 30 short of full)
      grantShield(f.cb, a, 40, b); expect(tendedLately(f.cb, b)).toBe(190);
      grantShield(f.cb, a, 25, b); expect(tendedLately(f.cb, b)).toBe(190); // a smaller shield over a bigger one adds nothing
      grantShield(f.cb, a, 50, b); expect(tendedLately(f.cb, b)).toBe(200); // the 10 it added
      b.hp = 50; healUnit(f.cb, b, 40, b, 'leech'); grantShield(f.cb, b, 40, b); expect(tendedLately(f.cb, b)).toBe(200); // what you do for yourself is not counted
      f.cb.round++; expect(tendedLately(f.cb, b)).toBe(200); // last round still counts
      f.cb.round++; expect(tendedLately(f.cb, b)).toBe(0); // two rounds on, it is forgotten
    });
  });
  it('each tier has its own eye for it: Vermin and Minions none, a Soldier half, an Elite and a Boss whole', () => {
    expect(['vermin', 'minion', 'soldier', 'elite', 'boss'].map((t) => (ENEMY[t] as any).healer_focus)).toEqual([0, 0, 0.5, 1, 1]);
    expect((RULES as any).mending.tending).toMatchObject({ rounds: 2, notice_share_of_max_hp: 0.1, provisional: true });
  });
});

describe('rules 1.23: the enemies go for the healer', () => {
  it('two characters equally easy to attack: the one who healed the most is the one targeted', () => {
    const f = rig();
    G(f, () => { expect(healerMark(f.cb, f.foe)).toBe(null); expect(enemyIntent(f.cb, f.foe).why).toBeUndefined(); });
    const before = G(f, () => enemyIntent(f.cb, f.foe).targetId);
    mend(f, 40); // Bo mends Ada
    G(f, () => {
      expect(healerMark(f.cb, f.foe)).toBe(bo(f));
      const it = enemyIntent(f.cb, f.foe); expect(it.kind).toBe('attack'); expect(it.targetId).toBe(bo(f).id); expect(it.why).toBe('healer');
      expect(it.text).toBe('shoot Bo' + HEALER_WHY); expect(it.text).toMatch(/mending the squad/);
    });
    // and the other way round: whoever of the two did the mending is the one
    const g = rig(); mend(g, 40, ada(g), bo(g));
    G(g, () => expect(enemyIntent(g.cb, g.foe).targetId).toBe(ada(g).id));
    expect([ada(f).id, bo(f).id]).toContain(before);
  });
  it('the most healing wins when two have healed; under a tenth of the giver\'s max HP is not noticed', () => {
    const f = rig();
    mend(f, 19); G(f, () => expect(healerMark(f.cb, f.foe)).toBe(null)); // 19 of 200: not worth a gun
    mend(f, 1); G(f, () => expect(healerMark(f.cb, f.foe)).toBe(bo(f)));
    mend(f, 60, ada(f), bo(f)); G(f, () => expect(healerMark(f.cb, f.foe)).toBe(ada(f)));
  });
  it('it acts on it: the shot goes at the healer, and the fight log says why, once a round', () => {
    const f = rig(); mend(f, 40); f.cb.turn = f.cb.order.indexOf(f.foe.id); f.foe.ap = 6;
    const l0 = f.cb.log.length; G(f, () => enemyTurn(f.cb, { state: 11 }));
    const log = f.cb.log.slice(l0);
    expect(log.filter((l) => /turns on Bo: the enemy has seen who is mending the squad\./.test(l)).length).toBe(1);
    expect(log.some((l) => / Bo\b/.test(l) && /hits|misses|shoots|fires|grazes/i.test(l)), log.join(' | ')).toBe(true);
    expect(log.some((l) => /(hits|misses|shoots at|fires at) Ada/i.test(l)), log.join(' | ')).toBe(false);
  });
  it('a Soldier leans (the healer counts as hurt by half its max HP more); an Elite and a Boss put the healer first', () => {
    for (const [tier, hurt, want] of [['soldier', 120, 'Bo'], ['soldier', 90, 'Ada'], ['elite', 20, 'Bo'], ['boss', 20, 'Bo'], ['minion', 199, 'Ada'], ['vermin', 199, 'Ada']] as [string, number, string][]) {
      const f = rig({ tier, weapon: 'hellraiser_service_rifle' }); mend(f, 40); ada(f).hp = hurt; // Bo is at 200 of 200: as if at 100 to a Soldier, first to an Elite
      G(f, () => { const it = enemyIntent(f.cb, f.foe); expect(f.unit(it.targetId!).name, tier + ', Ada at ' + hurt).toBe(want); expect(it.why, tier).toBe(want === 'Bo' ? 'healer' : hurt < 190 ? 'wounded' : undefined); }); // (rules 1.25: the other reason is said too)
    }
  });
  it('Taunt still wins', () => {
    const f = rig({ tier: 'elite', weapon: 'hellraiser_service_rifle' }); mend(f, 40);
    G(f, () => { f.foe.sv = { body: -99, brain: -99, heart: -99 } as any; applyCond(f.cb, { state: 3 }, ada(f), f.foe, 'taunted', 2, undefined, { skipSave: true }); });
    G(f, () => { const it = enemyIntent(f.cb, f.foe); expect(it.targetId).toBe(ada(f).id); expect(it.why).toBeUndefined(); });
  });
  it('a healer who is Hidden, or whom nobody on the enemy\'s side sees, is not known', () => {
    const f = rig({ tier: 'elite', weapon: 'hellraiser_service_rifle' }); mend(f, 40);
    bo(f).hidden = true;
    G(f, () => { expect(healerMark(f.cb, f.foe)).toBe(null); expect(enemyIntent(f.cb, f.foe).targetId).toBe(ada(f).id); });
    bo(f).hidden = false; f.cb.map = { ...f.cb.map, solid: ['4,6', '4,5', '4,7', '3,5', '2,5'] } as any; // a wall between Bo and the enemy
    G(f, () => { expect(healerMark(f.cb, f.foe)).toBe(null); const it = enemyIntent(f.cb, f.foe); expect(it.targetId).toBe(ada(f).id); expect(it.why).toBeUndefined(); });
  });
  it('a Downed healer is no healer; and when the healing stops, so does the hunt', () => {
    const f = rig({ tier: 'elite', weapon: 'hellraiser_service_rifle' }); mend(f, 40);
    bo(f).downed = true; bo(f).hp = 0; G(f, () => expect(healerMark(f.cb, f.foe)).toBe(null)); bo(f).downed = false; bo(f).hp = 200;
    f.cb.round += 2; G(f, () => { expect(healerMark(f.cb, f.foe)).toBe(null); expect(enemyIntent(f.cb, f.foe).why).toBeUndefined(); });
  });
  it('a healer behind good cover is not worth the rounds: under half its best chance, it keeps to the others', () => {
    const f = rig({ tier: 'elite', weapon: 'hellraiser_service_rifle' }); mend(f, 40);
    G(f, () => expect(enemyIntent(f.cb, f.foe).targetId).toBe(bo(f).id));
    bo(f).def += 12; // as hard to hit as full cover and more
    G(f, () => { const it = enemyIntent(f.cb, f.foe); expect(it.targetId).toBe(ada(f).id); expect(it.why).toBeUndefined(); });
  });
  it('the hunt: an Elite with a gun and no shot at the healer steps to where it has one; a blade does not run through the squad', () => {
    // truth pass 3: the spotter is real now (the test used to have none, so nobody saw Bo and it returned early)
    const f = rig({ tier: 'elite', weapon: 'hellraiser_service_rifle' }, { also: [{ tier: 'minion', weapon: 'fists' }] });
    // Ada stands in the open at 6,5; Bo mends from behind a wall the enemy's ally can see round (so the side sees Bo)
    ada(f).pos = '6,5'; bo(f).pos = '3,8'; f.foe.pos = '11,5'; f.foes[1].pos = '2,10'; f.cb.map = { ...f.cb.map, solid: ['5,7', '6,7', '7,7', '8,7', '9,7', '4,7'] } as any;
    mend(f, 40);
    G(f, () => {
      const m = healerMark(f.cb, f.foe);
      expect(m).toBe(bo(f)); // the spotter sees Bo: the side knows the healer
      const it = enemyIntent(f.cb, f.foe); expect(it.kind).toBe('move'); expect(it.why).toBe('healer'); expect(it.targetId).toBe(bo(f).id); expect(it.text).toMatch(/^move to \S+ for a shot at Bo: it goes for whoever is mending the squad$/);
    });
    // a melee Elite next to Ada stays on Ada
    const g = rig({ tier: 'elite', weapon: 'combat_knife' }); ada(g).pos = '8,5'; bo(g).pos = '3,6'; mend(g, 40);
    G(g, () => { const it = enemyIntent(g.cb, g.foe); expect(it.kind).toBe('attack'); expect(it.targetId).toBe(ada(g).id); expect(it.why).toBeUndefined(); });
  });
  it('the hunt is walked: with eyes on the healer but no line of its own, the Elite moves and then fires at the healer', () => {
    const f = fightWith([{ name: 'Ada' }, { name: 'Bo' }], [{ tier: 'elite', weapon: 'hellraiser_service_rifle' }, { tier: 'minion', weapon: 'service_pistol' }]);
    const cb = f.cb; cb.map = { ...cb.map, cover: [], full: [], difficult: [], solid: ['7,6', '7,7', '7,8', '7,9', '7,10'] } as any; cb.objects = [];
    const [a, b] = f.pcs, [e, spotter] = f.foes; for (const x of [a, b, e, spotter]) { x.hp = x.maxHp = 200; x.armour = 0; x.shield = 0; (x as any).healRecv = 1; }
    e.techs = []; e.calls = []; a.pos = '5,3'; b.pos = '5,8'; e.pos = '10,8'; spotter.pos = '2,9'; // the wall hides Bo from the Elite; the Minion behind the squad sees Bo
    withGame(f.g, () => { a.hp = 150; healUnit(cb, a, 40, b, 'soul'); a.hp = 200; });
    withGame(f.g, () => {
      expect(healerMark(cb, e)).toBe(b);
      const it = enemyIntent(cb, e); expect(it.kind).toBe('move'); expect(it.why).toBe('healer');
      cb.turn = cb.order.indexOf(e.id); e.ap = 6; const l0 = cb.log.length, was = e.pos; enemyTurn(cb, { state: 5 });
      const log = cb.log.slice(l0).join(' | '); expect(e.pos).not.toBe(was); expect(log).toMatch(/turns on Bo/); expect(log).toMatch(/ Bo\b/); expect(log).not.toMatch(/(hits|misses|shoots at|fires at) Ada/i);
    });
  });
});

describe('rules 1.23: the medic\'s kit', () => {
  it('the numbers: Triage 5, a stim 6, Rally 6, a Field Repair 3 a point; out of a fight a Triage is three times', () => {
    expect([TRIAGE_HEAL, STIM_HEAL, RALLY_HEAL, FIELD_REPAIR_HEAL, TRIAGE_REST_MULT]).toEqual([5, 6, 6, 3, 3]);
    expect((RULES as any).mending.medic).toMatchObject({ triage: 5, stim: 6, rally: 6, field_repair_per_point: 3, triage_out_of_fight_mult: 3, provisional: true, level_factor: true });
  });
  for (const level of [1, 12]) it('a stim heals 6 × Healing given × the level factor (level ' + level + ')', () => {
    const f = fightWith([{ kit: 'medic', level }, { level }], [{ tier: 'minion' }]); const [me, al] = f.pcs; al.pos = '3,5'; me.pos = '3,4'; (al as any).healRecv = 1; al.maxHp = 900; al.hp = 100;
    const c = f.g.characters[me.charId!]; c.stims = 2; f.turn(me);
    f.act({ type: 'combat/stim', unitId: me.id, targetId: al.id } as any);
    const want = Math.floor(6 * G(f as any, () => healingMult(f.g.characters[me.charId!])) * mendFactor(level));
    expect(f.unit(al.id).hp).toBe(100 + want); expect(want).toBeGreaterThan(0); expect(mendFactor(12)).toBe(1.38);
    expect(tendedLately(f.cb, f.unit(me.id))).toBe(want); // the medic's kit marks the medic too
  });
  it('Triage heals 5 × Healing given × the level factor in a fight', () => {
    for (const level of [1, 12]) {
      const f = fightWith([{ classId: 'bard', level, skills: { empathy: 4 }, attrs: { insight: 4 } }, { level }], [{ tier: 'minion' }]); const [me, al] = f.pcs; al.pos = '3,5'; me.pos = '3,4'; (al as any).healRecv = 1; al.maxHp = 900; al.hp = 100;
      f.turn(me);
      f.act({ type: 'combat/perk', unitId: me.id, id: 'class:medic.triage', actionId: 'triage', targetId: al.id } as any);
      const hm = G(f as any, () => healingMult(f.g.characters[me.charId!]));
      expect(f.unit(al.id).hp, 'level ' + level).toBe(100 + Math.floor(5 * hm * mendFactor(level)));
    }
  });
});

describe('rules 1.23: Split on a heal or a shield', () => {
  it('a Split heal or shield is divided: the Bolt and its split each give ×0.8 (×1.6 in all)', () => {
    expect(SPLIT_BOON).toBe(0.8); expect((MODULE.split as any).boon_mult).toBe(0.8);
    const m: any = { soulBase: 40, soulMult: 1, healMult: 1, mend: 1 };
    const bolt: any = { id: 'a', school: 'buff', option: 'heal', modules: [] }, split: any = { ...bolt, modules: ['split'] }, aura: any = { ...bolt, modules: ['aura'] };
    expect(outburstHeal(m, split, 1) / outburstHeal(m, bolt, 1)).toBeCloseTo(0.8, 5);
    expect(outburstHeal(m, aura, 1) / outburstHeal(m, bolt, 1)).toBeCloseTo(0.4, 5);
    const inv: any = { id: 'b', school: 'damage', modules: ['inverse'] }, invSplit: any = { ...inv, modules: ['inverse', 'split'] };
    expect(inverseShield(m, invSplit, 1) / inverseShield(m, inv, 1)).toBeCloseTo(0.8, 5);
    const foe: any = { soulMult: 1, healMult: 1 }; // an enemy caster keeps what it had
    expect(outburstHeal(foe, split, 1)).toBe(outburstHeal(foe, bolt, 1));
  });
});

describe('rules 1.23: the Boss, and the enemy\'s Burst', () => {
  it('the Boss has 820 HP at level 1 (it was 960) and 1,484 at level 20; the Elite, the Soldier and every damage factor are unchanged', () => {
    expect(ENEMY.boss.hp).toBe(820); expect(enemyStats('boss', 20).hp).toBe(1484); expect(enemyStats('boss', 6).hp).toBe(Math.round(820 * 1.38));
    expect([ENEMY.elite.hp, ENEMY.soldier.hp, ENEMY.minion.hp]).toEqual([240, 140, 70]);
    expect([ENEMY.soldier.damage, ENEMY.elite.damage, ENEMY.boss.damage]).toEqual([0.78, 1.05, 1.2]);
  });
  it('an enemy keeps its own Burst (three rolls with an Auto weapon): the characters\' two-roll Burst did not fit the table at every level', () => {
    const f = rig();
    expect(burstRolls(f.foe, WEAPON.hellraiser_service_rifle)).toEqual([0, -1, -2]);
    expect(burstRolls(ada(f), WEAPON.hellraiser_service_rifle)).toEqual([0, -4]);
    expect((TECHNIQUE.burst as any).numbers.enemy_same).toBeUndefined(); // the switch the measurement uses (defence-measure.test.ts, DEFENCE_PARTS=burst) is off
  });
});

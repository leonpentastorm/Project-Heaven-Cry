// Rules 1.98 (the Guard door, one lane of the total rebalance; docs/design/handoffs/0.34-REBALANCE-DOOR-guard.md).
// Every expectation reads the data (skills.json's Slam grant and door ladder, the beta rows) and goes through the
// reducer (a real combat/perk action).
import { describe, it, expect, afterEach } from 'vitest';
import { doorLadderOf, biteAt, cashSumOf, keepsOf } from '../src';
import { SKILL } from '../src/data';
import { CALL } from '../src';
import { guardSoak } from '../src/physical/core';
import { physFight, rig } from './helpers/physfight';
import { resolveAttack } from '../src/combat';

afterEach(() => rig(null));
const SLAM = () => (SKILL as any).durability.unlocks['1'].effects.find((e: any) => e.action === 'guard_slam');

function slamFight(skills: Record<string, number>, plates: number, foes = 4) {
  const at = ['E5', 'C5', 'D4', 'D6', 'C4', 'E4', 'C6', 'E6'].slice(0, foes).map((a, i) => ({ at: a, name: 'F' + i }));
  const f = physFight([{ weapon: 'buckler', skills: { durability: 4, pain_threshold: 0, sensory: 0, ...skills } }], at);
  f.put(f.pc, 'D5'); const me = f.unit(f.pc.id); me.ap = 9; me.resMax!.guard = Math.max(me.resMax!.guard ?? 0, plates); me.res!.guard = plates;
  for (const v of f.foes) { const x = f.unit(v.id); x.hp = x.maxHp = 999999; x.armour = 0; x.conds = {}; }
  return f;
}
const slam = (f: ReturnType<typeof slamFight>, targetId?: string) => f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'skill:durability.1', actionId: 'guard_slam', ...(targetId ? { targetId } : {}) } as any);

describe('Slam (item 8350): a plain shield blow with no roll plus the plates\' weight, on every plate held', () => {
  it('opens at Durability 1 (ruling 34)', () => {
    expect(SLAM().if.self_skill.durability).toBe(doorLadderOf('durability')!.rows[0].points);
  });
  it('the faced foe takes the plain blow plus one plate\'s soak (before the feed) x Bite x S(n); the ring the plain blow', () => {
    for (const n of [1, 3]) {
      const skills = { durability: 4 }, f = slamFight(skills, n), faced = f.foes[1];
      rig({ hit: false }); // no roll: a missed roll changes nothing
      slam(f, faced.id);
      const lost = f.foes.map((v) => 999999 - f.unit(v.id).hp);
      const struck = Math.min(SLAM().blow.most_foes, 1 + Math.floor(SLAM().blow.ring_base * cashSumOf('guard', n)));
      expect(lost.filter((x) => x > 0).length).toBe(Math.min(struck, f.foes.length));
      const plain = lost.find((x, i) => x > 0 && i !== 1)!;
      const weight = f.bound(() => guardSoak(f.unit(f.pc.id), false)) * biteAt(skills, doorLadderOf('durability')!) * cashSumOf('guard', n);
      expect(Math.abs(lost[1] - (plain + weight))).toBeLessThanOrEqual(1);
      expect(f.unit(f.pc.id).res!.guard).toBe(0);
    }
  });
  it('a full Slam is never worth less than the plain blow it replaces (ruling 63), and Pain Threshold 10 keeps a plate', () => {
    const skills = { durability: 4, pain_threshold: 10 }, f = slamFight(skills, 2, 1);
    slam(f);
    expect(999999 - f.unit(f.foes[0].id).hp).toBeGreaterThan(0);
    expect(f.unit(f.pc.id).res!.guard).toBe(keepsOf(skills, 'guard'));
    expect(keepsOf(skills, 'guard')).toBe((SKILL as any).pain_threshold.per_point.numbers.keeps);
  });
  it('with no plate it is refused (at least the row\'s min)', () => {
    const f = slamFight({}, 0, 1);
    expect(() => slam(f)).toThrow();
  });
});

describe('Retort (item 8351): the Bulwark one-plate Slam on the striker', () => {
  it('a melee hit on the wall: 1 plate and the reaction, the striker takes a no-roll blow plus one plate weight', () => {
    const skills = { durability: 7, pain_threshold: 4, dexterity: 1, athletics: 0, raw_power: 0 };
    const f = physFight([{ weapon: 'hand_wraps', skills, classId: 'defender', level: 6, attrs: { endurance: 5 } } as any], [{ tier: 'soldier', weapon: 'maul' }]);
    f.cb.objects = []; f.put(f.pcs[0], 'C5'); const a = f.cb.units.find((u) => u.side === 'foe')!; f.put(a, 'D5'); a.hp = a.maxHp = 999999; a.armour = 0;
    const t = f.unit(f.pcs[0].id); t.hp = t.maxHp; t.armour = 0; t.res!.guard = 3; (f.char(f.pcs[0]) as any).phys.answers = ['retort'];
    f.cb.round = 1; rig({ hit: true, die: 12 }); f.turn(a);
    f.bound(() => resolveAttack(f.cb, f.g.rng, f.unit(a.id), f.unit(t.id), 'melee', null, { noAp: true })); rig(null);
    const weight = Math.round(f.bound(() => guardSoak(f.unit(t.id), false)) * biteAt(skills, doorLadderOf('durability')!) * cashSumOf('guard', 1));
    const line = f.cb.log.find((l) => /plates' weight/.test(l))!;
    expect(line).toContain('Retort'); expect(Number(/weight (\d+)\)/.exec(line)?.[1])).toBe(weight);
    expect(999999 - f.unit(a.id).hp).toBeGreaterThan(weight);
  });
});

describe('Warn feeds the wall, and works alone (item 8352)', () => {
  const warn = (sensory: number, self: boolean) => {
    const f = physFight([{ skills: { sensory, durability: 4, raw_power: 0 } }, {}], [{ weapon: 'sabre' }]);
    f.put(f.pcs[0], '5,2'); f.put(f.pcs[1], '6,2'); f.put(f.foe, '7,2'); f.cb.order = [...f.pcs.map((u) => u.id), f.foe.id];
    const me = f.unit(f.pc.id); me.res!.guard = 0; f.turn(f.pc);
    const who = self ? f.pcs[0] : f.pcs[1];
    if (self) f.put(f.foe, '6,3');
    f.act({ type: 'combat/call', unitId: f.pc.id, id: 'call.warn', targetId: who.id } as any);
    const step = f.unit(who.id).call?.warn?.tiles;
    f.turn(f.foe); rig({ hit: true, die: 12 });
    f.bound(() => resolveAttack(f.cb, f.g.rng, f.unit(f.foe.id), f.unit(who.id), 'melee', null)); rig(null);
    return { f, me: f.unit(f.pc.id), step };
  };
  const feed = (pts: number) => [...(CALL as any)['call.warn'].feeds.steps].reverse().find((x: any) => pts >= x.from)?.value ?? 0;
  it('a Warn that lands gives the speaker plates by its Sensory, up to its Reach', () => {
    for (const pts of [1, 2, 6]) expect(warn(pts, false).me.res!.guard).toBe(Math.min(feed(pts), warn(pts, false).me.resMax!.guard!));
  });
  it('alone, Warn is made on yourself at the step below your own (at least the first)', () => {
    const steps = (CALL as any)['call.warn'].steps, less = (CALL as any)['call.warn'].self_step_less;
    const r = warn(4, true), ally = warn(4, false);
    expect(ally.step).toBe(steps[1].numbers.tiles);
    expect(r.step).toBe(steps[Math.max(0, 1 - less)].numbers.tiles);
  });
});

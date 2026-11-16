// Rules 1.60 (Doors 3.0), slice B: the reshape (the spec's section 4, R1 to R22, with Leon's rulings). Each rule goes
// through the reducer (f.act: a real combat/perk, combat/technique or faith/pray) and reads its numbers from the data.
// The moves re-pointed elsewhere have their own files: Wind-up and Read the Swing (classes-rev3-moves), Keep Swinging
// (alpha-perks-156, momentum-2), Hold the Lane and Run and Gun (skirmisher), Vanish (shadow-operative), Triage's and
// Shield's reach (tending), the Palm (open-hand, boss-holds), Heart Surge (outburst20-classes), the Ward (chaplain),
// the Scrap Sentinel (rigger).
import { describe, it, expect, afterEach } from 'vitest';
import './helpers/yard16';
import { CLASS, CLASS_MOVE_POOL, SKILL, applyCond, condOn, setDevotionXp, devotionThreshold, type Unit, type Action } from '../src';
import { fightWith, withGame, type CharSpec } from './helpers/perkfight';
import { onHook } from '../src/effects/hooks';

let SAVES: 'pass' | 'fail' | null = null;
onHook('save', (ctx: any) => { if (SAVES === 'pass') ctx.pass = true; if (SAVES === 'fail') ctx.fail = true; });
afterEach(() => { SAVES = null; });

type F = ReturnType<typeof fightWith>;
const at = (f: F, u: Unit, pos: string) => { f.unit(u.id).pos = pos; return f.unit(u.id); };

// ============================================================================================ R1: Called Out
describe('Called Out (rules 1.60 item 4619): Challenge names a foe; the Bulwark\'s costs no Guard and its named foe takes it with no save', () => {
  const DOOR: any = (SKILL as any).durability.unlocks['1'], CH = DOOR.effects.find((e: any) => e.action === 'guard_challenge');
  const tank = (bulwark: boolean): CharSpec => ({ name: 'Tank', skills: { durability: 3 }, attrs: { endurance: 3 }, level: 3, weapon: 'sabre', ...(bulwark ? { classId: 'defender' } : {}) });
  const run = (bulwark: boolean, guard: number, tier = 'soldier') => {
    const f = fightWith([tank(bulwark)], [{ at: 'F6', tier }, { at: 'G6' }]);
    const [named, other] = f.foes; const me = at(f, f.pc, '4,2'); at(f, named, '5,2'); at(f, other, '6,2');
    for (const u of f.foes) { f.unit(u.id).hp = f.unit(u.id).maxHp = 900; f.unit(u.id).conds = {}; }
    f.turn(me); f.unit(me.id).res!.guard = guard;
    SAVES = 'pass';
    f.act({ type: 'combat/perk', unitId: me.id, id: 'skill:durability.1', actionId: 'guard_challenge', targetId: named.id } as Action, 'host');
    SAVES = null;
    return { f, me: f.unit(me.id), named: f.unit(named.id), other: f.unit(other.id) };
  };
  it('the named foe must be within the reach (everyone\'s Challenge); a foe out of it is refused, nothing spent', () => {
    expect(CH.reach).toMatchObject({ side: 'foe', sight: true }); expect(CH.reach.tiles).toBe(CH.effects[0].targets.within);
    const f = fightWith([tank(false)], [{ at: 'P11' }]); const me = at(f, f.pc, '4,2'); f.turn(me); f.unit(me.id).res!.guard = 2;
    expect(() => f.act({ type: 'combat/perk', unitId: me.id, id: 'skill:durability.1', actionId: 'guard_challenge', targetId: f.foe.id } as Action, 'host')).toThrow(/Out of range/);
    expect(f.unit(me.id).res!.guard).toBe(2);
  });
  it('anyone: it costs its Guard; every foe in reach saves (all pass here) and is not Taunted, the named one too', () => {
    const r = run(false, 2);
    expect(r.me.res!.guard).toBe(2 - CH.res.guard);
    expect(condOn(r.named, 'taunted')).toBe(false); expect(condOn(r.other, 'taunted')).toBe(false);
  });
  it('the Bulwark: no Guard spent, and the named foe Taunted with no save (the others still save)', () => {
    const r = run(true, 2);
    expect(r.me.res!.guard).toBe(2);
    expect(condOn(r.named, 'taunted')).toBe(true); expect(condOn(r.other, 'taunted')).toBe(false);
    expect(r.f.cb.log.some((l) => /calls out/.test(l))).toBe(true);
  });
  it('the Bulwark with no Guard at all may still Challenge (its price is 0)', () => {
    const r = run(true, 0);
    expect(r.me.res!.guard).toBe(0); expect(condOn(r.named, 'taunted')).toBe(true);
  });
  it('a Boss named is Taunted too, never forced (the Taunted row\'s own rule)', () => {
    const r = run(true, 1, 'boss');
    expect(condOn(r.named, 'taunted')).toBe(true);
  });
  it('Draw Fire\'s id is kept (saves load), now a passive with no action', () => {
    const m: any = CLASS_MOVE_POOL['defender.draw_fire'];
    expect(m.name).toBe('Called Out'); expect(m.effects.some((e: any) => e.op === 'grant_action')).toBe(false);
  });
});

// ============================================================================================ R2: Take the Hit
describe('Durability 3 is a perk step (rules 1.60 item 4620)', () => {
  it('no Take the Hit action; the unlock is the tier-1 perk choice', () => {
    const u: any = (SKILL as any).durability.unlocks['3'];
    expect(u.effects.map((e: any) => e.op)).toEqual(['perk_choice']); expect(u.effects[0].choice).toBe('tier_1');
  });
});

// ============================================================================================ R5: Measured Blow
describe('Measured Blow (rules 1.60 item 4623): once a fight, a door Finisher gives Momentum back', () => {
  const MB: any = CLASS_MOVE_POOL['fighter.finisher'], back = MB.effects[0].value;
  it('a rank III Breaker\'s Coup leaves it the data\'s Momentum, once a fight; a rank I Breaker\'s leaves none', () => {
    const run = (strength: number) => {
      const f = fightWith([{ classId: 'fighter', level: 12, attrs: { strength }, skills: { raw_power: 3 }, weapon: 'sabre' }], [{ at: 'F6' }]);
      const me = at(f, f.pc, '4,2'), foe = at(f, f.foe, '5,2'); foe.hp = foe.maxHp = 5000; foe.def = -40; foe.armour = 0;
      const after: number[] = [];
      for (let i = 0; i < 2; i++) {
        f.cb.round++; f.turn(me); f.unit(me.id).ap = 9; f.unit(me.id).res!.momentum = 4;
        f.act({ type: 'combat/technique', unitId: me.id, id: 'coup', targetId: foe.id } as Action, 'host');
        after.push(f.unit(me.id).res!.momentum!);
      }
      return after;
    };
    expect(run(8)).toEqual([back, 0]); // rank III: once a fight
    expect(run(3)).toEqual([0, 0]);    // rank I: no Measured Blow
  });
});

// ============================================================================================ R17: Deliver the Sinner
describe('Deliver the Sinner (rules 1.60 item 4635): a patron\'s blow deals more to a Marked foe', () => {
  it('Rebuke on a Marked foe deals the unlock\'s bonus more than on one not Marked', () => {
    const bonus = (SKILL as any).faith.unlocks['5'].effects[0].value;
    const run = (marked: boolean) => {
      const f = fightWith([{ name: 'Faithful', skills: { faith: 5 }, attrs: { virtue: 5 }, level: 12 }], [{ at: 'F6' }], { level: 12 });
      const c = f.g.characters[f.pc.charId!]; c.belief = { kind: 'faithful', patron: 'old_overcast' } as any; c.patron = 'old_overcast' as any; setDevotionXp(c, devotionThreshold(6)); c.devotion = 6;
      const me = at(f, f.pc, '2,5'), foe = at(f, f.foe, '6,5'); foe.hp = foe.maxHp = 5000; foe.armour = 0; foe.def = -40;
      if (marked) withGame(f.g, () => applyCond(f.cb, f.g.rng, me, f.unit(foe.id), 'marked', 3, undefined, { skipSave: true }));
      f.turn(me); const hp = f.unit(foe.id).hp;
      f.act({ type: 'faith/pray', unitId: me.id, kind: 'whisper', id: 'rebuke', targetId: foe.id } as Action, 'host');
      return hp - f.unit(foe.id).hp;
    };
    const plain = run(false), more = run(true); 
    expect(plain).toBeGreaterThan(0);
    expect(Math.abs(more - plain * (1 + bonus))).toBeLessThanOrEqual(1);
  });
});

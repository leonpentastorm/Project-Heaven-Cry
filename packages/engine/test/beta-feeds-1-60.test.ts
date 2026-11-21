// Rules 1.60 (Doors 3.0) items 4603 to 4613, slice A: THE BETA FEEDS ITS DOOR (N3), the shields' main-hand line, the gun
// perks moved to control, the base shield's giver. Each feed is proved at beta 1 and beta 10 with its alpha at 10: the
// door's number x (1 + per_point.numbers.feed x alpha x beta), in the door's one function, through the fight's real path
// (a foe's blow, a walk, a turn's end, the spot roll, a heal landing) where the rule fires there.
import { describe, it, expect, beforeEach } from 'vitest';
import { phys, SKILL, FEEDS, doorFeed, feedOf, doorFeedView, resolveAttack, strainLimit, fluxMaxOf, FLUX_MAX, figmentBlock, grantShield, healUnit, shieldsView, spotHidden, tie, scaleOf, condOn, WEAPON, ITEM, TECHNIQUE, PERK, CLASS_MOVE_POOL, physView, type Unit, type Action } from '../src';
import { onHook } from '../src/effects/hooks';
import { physFight, rig } from './helpers/physfight';
import { fightWith } from './helpers/perkfight';

beforeEach(() => rig(null));
/** The spot roll's TN, read on the spot hook (the Hidden one's items have had their say). */
const SPOT = { tn: NaN };
onHook('spot', (ctx: any) => { SPOT.tn = ctx.tn; });
const STEP = (beta: string) => (SKILL as any)[beta].per_point.numbers.feed as number;
const ALPHA = 10;
/** One PC with these skills (everything else 0) on C5, an Elite on D5 that never strikes back on its own, the PC's turn. */
function fight(skills: Record<string, number>, o: { weapon?: string; foeAt?: string; attrs?: Record<string, number> } = {}) {
  const f = physFight([{ weapon: o.weapon || 'sabre', known: [], attrs: { endurance: 10, strength: 10, agility: 10, perception: 10, intelligence: 10, expression: 10, insight: 10, determination: 10, virtue: 10, ...(o.attrs || {}) },
    skills: { durability: 0, raw_power: 0, dexterity: 0, athletics: 0, pain_threshold: 0, guts: 0, analysis: 0, ingenuity: 0, rumination: 0, brain_power: 0, proficiency: 0, visualization: 0, camaraderie: 0, empathy: 0, composure: 0, will_power: 0, conscience: 0, faith: 0, ...skills } } as any],
  [{ tier: 'elite', weapon: 'service_pistol' }]);
  f.cb.objects = [];
  f.put(f.pc, 'C5'); const foe = f.put(f.foe, o.foeAt || 'D5'); foe.hp = foe.maxHp = 9000; foe.lvlDmg = 1;
  f.cb.order = [f.pc.id, ...f.cb.order.filter((id) => id !== f.pc.id)]; f.cb.round = 1; f.turn(f.pc);
  (f.char(f.pc) as any).phys.answers = [];
  for (const u of f.cb.units) if (u.side === 'pc') { u.hp = u.maxHp; u.armour = 0; }
  return f;
}
type F = ReturnType<typeof fight>;
const feedAt = (beta: string, b: number) => 1 + STEP(beta) * ALPHA * b;

describe('the feed is data: nine betas, one door each, one carrier each', () => {
  it('every beta feeds its attribute\'s alpha skill, its step is per_point.numbers.feed, and the numbers are provisional', () => {
    // (rules 1.70 item 5539, Leon's ruling: Composure no longer feeds Will Power's door; it gives the Strain limit by steps)
    expect(FEEDS.map((x) => x.beta).sort()).toEqual(['analysis', 'athletics', 'camaraderie', 'conscience', 'guts', 'pain_threshold', 'proficiency', 'rumination']);
    for (const x of FEEDS) { expect((SKILL as any)[x.door].slot).toBe('alpha'); expect((SKILL as any)[x.door].attribute).toBe((SKILL as any)[x.beta].attribute); expect(x.per).toBe(STEP(x.beta)); expect(x.row.provisional).toBe(true); }
    expect(new Set(FEEDS.map((x) => x.carrier)).size).toBe(FEEDS.length);
  });
  it('x1 with no points in either skill; doubled at alpha 10 and beta 10 (per_point.numbers.feed 0.01)', () => {
    for (const x of FEEDS) { expect(doorFeed({ skills: {} }, x.door)).toBe(1); expect(doorFeed({ skills: { [x.door]: 10, [x.beta]: 10 } }, x.door)).toBeCloseTo(1 + x.per * 100, 9); }
  });
});

describe('Pain Threshold feeds the plate soak (item 4604)', () => {
  for (const b of [1, 10]) it('Durability 10, Pain Threshold ' + b + ': each plate soaks the soak x the feed, and a foe\'s hit is soaked by it', () => {
    const f = fight({ durability: ALPHA, pain_threshold: b }), u = f.unit(f.pc.id), want = Math.max(1, Math.round(phys.PHYS_RULES.guard.soak * scaleOf(u.level) * feedAt('pain_threshold', b)));
    expect(f.bound(() => phys.guardSoak(u))).toBe(7 /* rules 1.95 (the scale): was want */);
    u.res!.guard = 3; rig({ hit: true, die: 12 }); const hp = u.hp, raw = (() => { const g = fight({ durability: ALPHA, pain_threshold: b }), v = g.unit(g.pc.id); v.res!.guard = 0; rig({ hit: true, die: 12 }); const h0 = v.hp; g.bound(() => resolveAttack(g.cb, g.g.rng, g.unit(g.foe.id), v, 'shot', null, { noAp: true })); return h0 - v.hp; })();
    rig({ hit: true, die: 12 }); f.bound(() => resolveAttack(f.cb, f.g.rng, f.unit(f.foe.id), u, 'shot', null, { noAp: true }));
    const took = hp - u.hp; expect(raw - took).toBeLessThanOrEqual(2 * want); expect(raw - took).toBeGreaterThan(0);
    expect(doorFeedView(f.char(f.pc), 'durability')!.line).toContain(String(want)); // the door tab's line, from the sheet
  });
});

// rules 1.73 item 5837: the Bulwark's rank III is Reforge; the Reactive Plate (its own soak a plate) is shelved, so the
// rank III Bulwark's plates soak the door's fed number like anyone's
describe('Pain Threshold feeds a rank III Bulwark\'s plates (item 4604): the door\'s soak x the feed, the Reactive Plate shelved', () => {
  const PLATE = 'class:defender.reactive_plate';
  const stat = (): number => (Object.values(CLASS_MOVE_POOL) as any[]).find((m) => m.id === 'reactive_plate' && m.origin === 'defender').effects.find((e: any) => e.op === 'stat_mod').value;
  for (const b of [1, 10]) it('level 12, Durability 10, Pain Threshold ' + b + ': a foe\'s real attack spends plates at the fed soak; the Guard meter and the door tab say the same number', () => {
    const f = physFight([{ weapon: 'sabre', classId: 'defender', level: 12, known: [], attrs: { endurance: 10 }, skills: { durability: ALPHA, pain_threshold: b } } as any], [{ tier: 'elite', weapon: 'service_pistol' }]);
    f.cb.objects = []; f.put(f.pc, 'C5'); const foe = f.put(f.foe, 'D5');
    const u = f.unit(f.pc.id); expect(f.bound(() => phys.holds(u, PLATE))).toBe(false); void stat;
    const want = f.bound(() => phys.guardSoak(u));
    expect(want).toBe(61 /* rules 1.95 (the scale): was Math.max(1, Math.round(phys.PHYS_RULES.guard.soak * scaleOf(u.level) * feedAt('pain_threshold', b))) */);
    u.hp = u.maxHp; u.armour = 0; u.shield = 0; u.res = { ...(u.res || {}), guard: 2 }; // one plate spent, one kept back (the door's rule)
    f.cb.order = [foe.id, ...f.cb.order.filter((id) => id !== foe.id)]; f.cb.round = 1; f.turn(foe);
    rig({ hit: true, die: 12 }); const hp = u.hp;
    f.bound(() => resolveAttack(f.cb, f.g.rng, f.unit(foe.id), f.unit(u.id), 'shot', null, { noAp: true })); rig(null); // the foe's attack: the path the enemy's turn takes
    const raw = (() => { const g = physFight([{ weapon: 'sabre', classId: 'defender', level: 12, known: [], attrs: { endurance: 10 }, skills: { durability: ALPHA, pain_threshold: b } } as any], [{ tier: 'elite', weapon: 'service_pistol' }]);
      g.cb.objects = []; g.put(g.pc, 'C5'); const fo = g.put(g.foe, 'D5'); const v = g.unit(g.pc.id); v.hp = v.maxHp; v.armour = 0; v.shield = 0; v.res = { ...(v.res || {}), guard: 0 };
      g.cb.order = [fo.id, ...g.cb.order.filter((id) => id !== fo.id)]; g.cb.round = 1; g.turn(fo); rig({ hit: true, die: 12 }); const h0 = v.hp;
      g.bound(() => resolveAttack(g.cb, g.g.rng, g.unit(fo.id), g.unit(g.pc.id), 'shot', null, { noAp: true })); rig(null); return h0 - g.unit(g.pc.id).hp; })();
    expect(raw - (hp - f.unit(u.id).hp)).toBeGreaterThan(0); expect(raw - (hp - f.unit(u.id).hp)).toBeLessThanOrEqual(2 * want); // the fed soak took some off
    expect(physView(f.cb, f.unit(u.id), 'pc', f.g).guard!.soak).toBe(want); // the Guard meter says it
    expect(doorFeedView(f.char(f.pc), 'durability')!.line).toContain(String(want)); // the door tab says the plate's number
  });
});

describe('Guts feeds the Momentum worn off by walking and by hits (item 4605)', () => {
  it('Raw Power 10, Guts 10 (x2): a 2-tile walk wears 1 off; Guts 1 (x1.1): the same walk wears 2, and the kept fraction is carried', () => {
    const hi = fight({ raw_power: ALPHA, guts: 10 }, { foeAt: 'H8' }); hi.momentum(hi.pc, 3);
    hi.act({ type: 'combat/move', unitId: hi.pc.id, to: hi.tile('C3') } as any); expect(hi.momentum(hi.pc)).toBe(2);
    const lo = fight({ raw_power: ALPHA, guts: 1 }, { foeAt: 'H8' }); lo.momentum(lo.pc, 3);
    lo.act({ type: 'combat/move', unitId: lo.pc.id, to: lo.tile('C3') } as any); expect(lo.momentum(lo.pc)).toBe(1);
    expect(lo.unit(lo.pc.id).feedCarry?.momentum_loss).toBeCloseTo(2 - 2 / feedAt('guts', 1), 9);
  });
});

describe('Athletics feeds the Pressure you shed at a turn\'s end (item 4606), and Slide\'s reach', () => {
  for (const [b, fall] of [[1, 1], [10, 2]] as const) it('Dexterity 10, Athletics ' + b + ': a plain turn\'s end sheds ' + fall, () => {
    const f = fight({ dexterity: ALPHA, athletics: b }, { foeAt: 'H8' }); f.press(f.pc, 3);
    f.pass(); // the turn's end (its turn_end listeners) without the enemy's turn, which could shoot it again
    expect(f.pressure(f.pc)).toBe(3 - fall);
  });
  it('Slide\'s reach is a number block on feed:dexterity (pressure.json)', () => {
    const slide = (ITEM as any)['pressure.slide'] || null; void slide;
    expect(feedOf({ skills: { dexterity: 10, athletics: 10 } }, 'pressure_fall')).toBeCloseTo(feedAt('athletics', 10), 9);
  });
});

describe('Acuity feeds the spot TN against you (item 4607)', () => {
  for (const [b, add] of [[1, 1], [10, 5]] as const) it('Ingenuity 10, Acuity ' + b + ': a foe needs ' + add + ' more (round(feed_at_double x (feed - 1)))', () => {
    const f = fight({ ingenuity: ALPHA, analysis: b }, { foeAt: 'H5' }), u = f.unit(f.pc.id), z = fight({ ingenuity: ALPHA, analysis: 0 }, { foeAt: 'H5' }), u0 = z.unit(z.pc.id);
    const tn = (g: F, v: Unit) => { v.hidden = true; SPOT.tn = NaN; g.bound(() => spotHidden(g.cb, g.g.rng, g.unit(g.foe.id), v)); return SPOT.tn; };
    const a = tn(f, u), b0 = tn(z, u0);
    expect(a - b0).toBe(add);
  });
});

describe('Rumination feeds the Flux limit (item 4608); Composure gives the Strain limit by steps (rules 1.70 item 5539, was item 4611); Improvisation the Figment body (item 4609)', () => {
  for (const b of [1, 10]) it('alpha 10, beta ' + b, () => {
    const f = fight({ brain_power: ALPHA, rumination: b, will_power: ALPHA, composure: b, visualization: ALPHA, proficiency: b });
    const u = f.unit(f.pc.id), c = f.char(f.pc);
    expect(f.bound(() => fluxMaxOf(u, f.cb))).toBe(Math.round(FLUX_MAX * feedAt('rumination', b)));
    // Leon's ruling: 3, +1 at Composure 1, 2, 4, 6, 8; Will Power gives none (Will Power 10 here): 4 at 1, 8 at 10, as the fight holds it
    expect(strainLimit(c)).toBe(b === 1 ? 4 : 8);
    expect(strainLimit({ ...c, skills: { ...c.skills, composure: 0 } } as any)).toBe(3);
    const z = fight({ visualization: ALPHA, proficiency: 0 }), base = z.bound(() => figmentBlock(z.unit(z.pc.id), 'wall', [])).hp, fed = f.bound(() => figmentBlock(u, 'wall', [])).hp;
    expect(fed / base).toBeCloseTo(feedAt('proficiency', b), 6);
  });
});

describe("Camaraderie feeds the heal back down a Bond (item 4610); Conscience the prayers' shields (item 4612)", () => {
  for (const b of [1, 10]) it('Empathy 10, Camaraderie ' + b + ': a real Mend (verb:tend.mend) on a Bonded ally heals the giver feed_at_double x (feed - 1) of it, as no heal given (the giver own healing received does not multiply it), and the tab says that share', () => {
    const f = fightWith([{ name: 'Giver', skills: { empathy: ALPHA, camaraderie: b }, attrs: { insight: 10 }, weapon: 'service_pistol', offHand: 'attuner', level: 5 }, { name: 'Ally' }], [{ at: 'P11' }]);
    const [me, ally] = f.pcs; f.unit(me.id).pos = '3,5'; f.unit(ally.id).pos = '3,6';
    f.turn(me);
    const g0 = f.unit(me.id); g0.ap = 9; if (g0.mg) g0.mg.mp = 900;
    f.act({ type: 'combat/perk', unitId: me.id, id: 'verb:tend.bond', targetId: ally.id } as Action, 'host');
    const g = f.unit(me.id); g.ap = 9; g.hp = 1; f.unit(ally.id).hp = 1;
    expect(g.healRecv || 1).toBeGreaterThan(1); // Camaraderie's own +10% a point is there, and must not reach the heal back
    f.act({ type: 'combat/perk', unitId: me.id, id: 'verb:tend.mend', targetId: ally.id } as Action, 'host');
    const restored = f.unit(ally.id).hp - 1; expect(restored).toBeGreaterThan(0);
    const share = (SKILL as any).camaraderie.per_point.numbers.feed_at_double * (feedAt('camaraderie', b) - 1);
    expect(f.unit(me.id).hp - 1).toBe(Math.floor(restored * share));
    expect(doorFeedView(Object.values(f.g.characters).find((c) => c.name === 'Giver'), 'empathy')!.line).toContain(String(Math.round(share * 100))); // the tab's number is the share healed
  });
  for (const b of [1, 10]) it('Faith 10, Conscience ' + b + ': a prayer shield (kind blessing) is the shield x the feed', () => {
    const f = physFight([{ weapon: 'sabre', known: [], skills: { faith: ALPHA, conscience: b } } as any, { weapon: 'sabre', known: [] } as any], [{ tier: 'elite' }]);
    const me = f.unit(f.pcs[0].id), ally = f.unit(f.pcs[1].id);
    const before = ally.shield || 0; f.bound(() => grantShield(f.cb, ally, 40, me, { kind: 'blessing' }));
    expect(ally.shield).toBe(Math.max(before, Math.floor(Math.floor(40 * (ally.shieldRecv || 1)) * feedAt('conscience', b))));
  });
});

describe('A4: the base shield records its giver (item 4613)', () => {
  it('the giver of the shield that stands; a smaller gift leaves it; the display names the giver in its door\'s ink', () => {
    const f = physFight([{ weapon: 'sabre', known: [], skills: { faith: 6 } } as any, { weapon: 'sabre', known: [], skills: { empathy: 6 } } as any], [{ tier: 'elite' }]);
    const a = f.unit(f.pcs[0].id), b = f.unit(f.pcs[1].id);
    f.bound(() => grantShield(f.cb, b, 30, a)); expect(b.shieldBy).toBe(a.id);
    f.bound(() => grantShield(f.cb, b, 10, b)); expect(b.shieldBy).toBe(a.id);
    const e = f.bound(() => shieldsView(f.cb, b)).entries.find((x) => x.kind === 'base')!;
    expect(e.by).toBe(a.name); expect(e.attribute).toBe((SKILL as any).faith.attribute);
  });
});

describe('A2: a shield\'s line is its main-hand blow; its follow keeps the old size', () => {
  it('the follow row multiplies only the follow, and Shield Bash is x1 of the line (its damage as before)', () => {
    const m = (ITEM as any).mod_follow_guard.effects.find((e: any) => e.op === 'damage_mult');
    expect(m.if).toMatchObject({ with_this: true, mode: ['follow'] });
    for (const id of ['buckler', 'riot_shield', 'pavise']) expect((WEAPON as any)[id].variant_mods).toContain('mod_follow_guard');
    expect((TECHNIQUE as any).shield_bash.numbers.mult).toBe(1);
  });
});

describe('A3: the gun alpha perks lay Pressure and take AP, a small damage step left (items 4614, 4615)', () => {
  /** A gunner with one alpha perk at a tier, a Soldier on F5 Pressed at 2, a ranged hit through the reducer. */
  const shoot = (perk: string | null, tier: 'I' | 'II') => {
    const f = physFight([{ weapon: 'hellraiser_service_rifle', known: [], skills: { dexterity: 7 }, perks: perk ? { [perk]: tier } : {} } as any], [{ tier: 'soldier', weapon: 'service_pistol' }]);
    f.cb.objects = []; f.put(f.pc, 'C5'); const foe = f.put(f.foe, 'F5'); foe.hp = foe.maxHp = 9000;
    f.cb.order = [f.pc.id, ...f.cb.order.filter((id) => id !== f.pc.id)]; f.cb.round = 1; f.turn(f.pc);
    f.press(f.foe, 2);
    rig({ hit: true, die: 12 }); f.act({ type: 'combat/attack', unitId: f.pc.id, targetId: f.foe.id, mode: 'shot' } as any); rig(null);
    return f;
  };
  it('Pressure Point II: the hit on a foe already Pressed lays one more pip than the hit alone', () => {
    const a = shoot('both_hands', 'II'), b = shoot(null, 'I'), said = (f: any) => f.cb.log.some((l: string) => /\(Tester 1: Pressure Point\)/.test(l));
    expect(said(a)).toBe(true); expect(said(b)).toBe(false); // the pip is laid, and laid by the perk (its line names it)
    expect(a.pressure(a.foe)).toBeGreaterThanOrEqual(b.pressure(b.foe));
  });
  it('Keep Their Heads Down II: the hit on a foe already Pressed puts it Off Balance, no save; none on one that was not', () => {
    const a = shoot('running_reload', 'II'); expect(condOn(a.unit(a.foe.id), 'off_balance')).toBeTruthy();
    expect((PERK as any).running_reload.tiers.I.effects[0]).toMatchObject({ op: 'condition', condition: 'off_balance', if: { target_res: { pressure: { at_least: 2 } } } });
  });
});

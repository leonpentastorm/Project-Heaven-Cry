// Rules revision 1.19 (the Outburst rework, round 2; 11 Nov 2026; spec: "Rules revision 1.19"). What this file pins,
// each from a sentence of the spec:
//   the table      ×0.8 at stage 0 and +0.2 a stage; the Damage base 36 for a character, 24 for an enemy caster
//   the feelings   every step and cost; each feeling goes into an Outburst once; the two that lower the multiplier
//                  (Calm, Relief) and Awe at +0; no fixed four is the best everywhere
//   the free Pump  one free stage a turn for a character, whatever gives it (the fight's first, Empathy's, Shape's,
//                  Heart Overload II's stage 1); Empathy 7 swells without Strain; Shape's +0.1; enemy casters untouched
//   a Pump's price 1 AP; the two prices measured and not adopted are data switches, off
//   the schools    Control, Status and the Buff boons read the stage; the Damage school's four ways to strike; Swap;
//                  Silenced
//   same school    a design's own school twice is carried by the engine and defined, and nobody can build one
// What the feelings do at the Release is pinned in outburst40.test.ts (the section "feelings poured in").
import { describe, expect, it } from 'vitest';
import './helpers/yard16';
import {
  STAGE_MULT, stageMult, SOUL_DAMAGE, SOUL_DAMAGE_ENEMY, heldMult, previewOutburstPlan, previewPump, pumpBaseAp, FREE_PER_TURN, freeStageLeft,
  FEELINGS, FEELING, PLAIN_STEP, ONCE_EACH, feelingStep, feelingCost, SOUL_RULES, SCHOOL, SOUL_AP, heartMagic, HEART_CASTERS, pumpOutburst,
  freePumps, swellFree, checkOutburstDesign, sameSchoolError, moduleSlots, condOn, stageSaveTn, stageRounds, stageTiles, stageBoonRounds, damageModeMult,
  type Unit, type OutburstDesign,
} from '../src';
import { fightWith, storyWith, withGame, type CharSpec } from './helpers/perkfight';

const SOUL = { archetype: 'stormcaller', kit: 'soul' } as const;
/** A Soul caster at 3,5 on its turn: Soul multiplier 1, base 20 (so the numbers are easy to read), plenty of MP and AP,
 * Strain limit 20, every feeling felt, no free Pump unless the test gives one. Everyone 500 HP, no armour, Defense −99. */
function heart(foes: string[] = ['6,5'], allies: string[] = [], spec: CharSpec = {}, o: { saves?: number } = {}) {
  const f = fightWith([{ ...SOUL, ...spec }, ...allies.map(() => ({ ...SOUL }))], foes.map(() => ({ tier: 'minion' })));
  const cb = f.cb; cb.map = { ...cb.map, cover: [], full: [], solid: [], difficult: [] } as any; cb.objects = []; cb.mana = 15;
  f.pcs.forEach((p, i) => { p.pos = i ? allies[i - 1] : '3,5'; }); f.foes.forEach((e, i) => { e.pos = foes[i]; });
  for (const x of [...f.pcs, ...f.foes]) { x.hp = x.maxHp = 500; x.armour = 0; x.def = -99; x.sv = { body: o.saves ?? -99, brain: o.saves ?? -99, heart: o.saves ?? -99 } as any; x.hidden = false; (x as any).healRecv = 1; }
  for (const p of f.pcs) { Object.assign(p.mg!, { emanator: true, mp: 9999, mpMax: 9999, soulMult: 1, soulBoon: 1, deal: 1, soulBase: 20, healMult: 1, will: 0, soulRange: 0, strain: 0, strainLimit: 20, costSave: 0, freePumps: 0, freePumpsMax: 0, freeUsed: 0, swellFree: false, firstUsed: true, feelings: FEELINGS.map((x) => x.id), debuff: { body: 0, brain: 0, heart: 0 } }); p.sk = {}; p.dbf = {}; }
  const u = f.turn(f.pc); u.ap = 60;
  return f;
}
type F = ReturnType<typeof heart>;
const give = (u: Unit, d: Partial<OutburstDesign> = {}): string => { const id = 'd' + (u.mg!.designs.length + 1); u.mg!.designs.push({ id, name: 'Test ' + id, school: 'damage', modules: ['at_once'], ...d } as OutburstDesign); return id; };
const A = (f: F, a: Record<string, any>) => f.act({ unitId: f.pc.id, ...a } as any);
const begin = (f: F, design: string, o: Record<string, any> = {}) => A(f, { type: 'combat/outburst', design, ...o });
const pump = (f: F, feeling?: string, n = 1) => { for (let i = 0; i < n; i++) A(f, { type: 'combat/pump', ...(feeling ? { feeling } : {}) }); };
const release = (f: F, aim = '6,5') => A(f, { type: 'combat/release', aim });
const me = (f: F) => f.unit(f.pc.id);
const lost = (u: Unit) => 500 - u.hp;
const logHas = (f: F, re: RegExp) => f.cb.log.some((l: string) => re.test(l));
const plan = (f: F, src: string | 'held' = 'held', aim = '6,5') => withGame(f.g, () => previewOutburstPlan(f.cb, me(f), src, aim));

describe('rules 1.19: the stage table and the Damage base', () => {
  it('×0.8 at stage 0, then +0.2 a stage: a plain Pump is +0.2 at every stage', () => {
    expect(STAGE_MULT).toEqual([0.8, 1, 1.2, 1.4, 1.6]); expect(PLAIN_STEP).toBe(0.2);
    for (let s = 1; s <= 4; s++) expect(Math.round((stageMult(s) - stageMult(s - 1)) * 100) / 100).toBe(PLAIN_STEP);
    expect((SOUL_RULES as any).cycle.provisional).toBe(true);
  });
  it('a character\'s Damage base is 31 (rules 1.26, the re-fit: all in on the ceiling, steady 135%, peak 165%; 40 from 12 Nov, 36 before); an enemy caster\'s is 24', () => {
    expect(SOUL_DAMAGE).toBe(31); expect(SOUL_DAMAGE_ENEMY).toBe(24); expect((SOUL_RULES as any).damage.provisional).toBe(true);
    const f = heart(); const foe = f.foe; foe.mg = heartMagic(foe, HEART_CASTERS[0]); expect(foe.mg!.soulBase).toBeUndefined();
  });
});

describe('rules 1.19: the 25 feelings', () => {
  const STEP: Record<string, number> = { rage: 0.5, grief: 0.2, fear: 0.3, love: 0.3, joy: 0.3, calm: -0.4, spite: 0.2, shame: 0.5, pride: 0.6, despair: 0.2, hope: 0.3, mercy: 0.3, cruelty: 0.2, loneliness: 0.2, belonging: 0.2,
    dread: 0.3, awe: 0, longing: 0.3, relief: -0.2, contempt: 0.3, guilt: 0.3, jealousy: 0.3, wonder: 0.3, defiance: 0.2, abandon: 0.8 };
  it('every step is the spec\'s; the costs are Rage 1 Strain, Abandon 2 Strain, Shame 8 HP, Pride 2 Strain after a Release that takes nobody down', () => {
    expect(FEELINGS.length).toBe(25);
    for (const f of FEELINGS) { expect(f.step.base, f.id).toBe(STEP[f.id]); expect((f as any).provisional, f.id).toBe(true); }
    expect(feelingCost('rage')).toEqual({ strain: 1, strainAfter: 0, hp: 0 }); expect(feelingCost('abandon')).toEqual({ strain: 2, strainAfter: 0, hp: 0 });
    expect(feelingCost('shame')).toEqual({ strain: 0, strainAfter: 0, hp: 8 }); expect(feelingCost('pride')).toEqual({ strain: 0, strainAfter: 2, hp: 0 });
    for (const f of FEELINGS) if (!['rage', 'abandon', 'shame', 'pride'].includes(f.id)) expect(feelingCost(f.id), f.id).toEqual({ strain: 0, strainAfter: 0, hp: 0 });
    expect((FEELING.relief.pour as any).strain_back).toBe(2);
  });
  it('a feeling\'s number is visibly bigger than a plain Pump\'s, or it is the price of what the feeling does', () => {
    // the ones that buy the multiplier: at least 2.5 times a plain Pump
    for (const id of ['rage', 'shame', 'pride', 'abandon']) expect(FEELING[id].step.base! / PLAIN_STEP, id).toBeGreaterThanOrEqual(2.5);
    // under a plain Pump: only the three whose effect is strong (the multiplier going down is the price)
    expect(FEELINGS.filter((f) => f.step.base! < PLAIN_STEP).map((f) => f.id).sort()).toEqual(['awe', 'calm', 'relief']);
    expect(FEELINGS.filter((f) => f.step.base! < 0).map((f) => f.id).sort()).toEqual(['calm', 'relief']);
    // the ones that read the moment never fall under a plain Pump and top out at +0.6
    const alone = heart(), crowd = heart(['6,5'], ['3,6', '4,5', '2,5']);
    for (const id of ['grief', 'spite', 'despair', 'loneliness', 'belonging']) for (const fx of [alone, crowd]) for (const hp of [500, 250, 50]) {
      me(fx).hp = hp; const s = feelingStep(fx.cb, me(fx), id, 4, fx.foe); expect(s, id).toBeGreaterThanOrEqual(PLAIN_STEP); expect(s, id).toBeLessThanOrEqual(0.6);
    }
  });
  it('each feeling goes into an Outburst once: "Rage, Rage, Rage, Relief" can\'t be poured', () => {
    expect(ONCE_EACH).toBe(true);
    const f = heart(); const d = give(f.pc); begin(f, d); pump(f, 'rage');
    expect(withGame(f.g, () => previewPump(f.cb, me(f), 'rage'))).toMatchObject({ ok: false }); expect(() => pump(f, 'rage')).toThrow(/once is all it takes/);
    pump(f, 'relief'); expect(() => pump(f, 'relief')).toThrow(/once is all it takes/);
    pump(f); pump(f); expect(me(f).mg!.held!.stage).toBe(4); // plain Pumps are never refused
  });
  it('Calm and Relief take the multiplier DOWN, Awe adds nothing to it: a fourth Pump with one of them is weaker than no fourth Pump', () => {
    const f = heart(); const d = give(f.pc); begin(f, d); pump(f, 'rage'); pump(f, 'love'); pump(f, 'joy'); const three = heldMult(f.cb, me(f), me(f).mg!.held);
    expect(three).toBe(1.9); // 0.8 + 0.5 + 0.3 + 0.3
    for (const [id, m] of [['calm', 1.5], ['relief', 1.7], ['awe', 1.9]] as [string, number][]) expect(withGame(f.g, () => previewPump(f.cb, me(f), id)).mult, id).toBe(m);
    expect(withGame(f.g, () => previewPump(f.cb, me(f))).mult).toBe(2.1); // a plain Pump
  });
  it('no fixed four is the best everywhere: the strongest free four changes with the moment, and Calm only pays against a target that is hard to hit', () => {
    const best = (f: F, t: Unit) => { // the four feelings that cost nothing with the highest multiplier here
      const free = FEELINGS.filter((x) => { const c = feelingCost(x.id); return !c.strain && !c.strainAfter && !c.hp; }).map((x) => ({ id: x.id, s: feelingStep(f.cb, me(f), x.id, 4, t) })).sort((a, b) => b.s - a.s || a.id.localeCompare(b.id));
      return free.filter((x) => x.s > 0.3).map((x) => x.id).sort().join();
    };
    const alone = heart(); const squad = heart(['6,5'], ['3,6', '4,5']); const hurt = heart(); me(hurt).hp = 150; (me(hurt) as any).feelHurtBy = hurt.foe.id; const fallen = heart(['6,5'], ['3,6', '4,5']); fallen.pcs[1].downed = true;
    const sets = [best(alone, alone.foe), best(squad, squad.foe), best(hurt, hurt.foe), best(fallen, fallen.foe)];
    expect(sets).toEqual(['loneliness', 'belonging', 'despair,loneliness,spite', 'grief']); expect(new Set(sets).size).toBe(4);
    // Calm: the better of two rolls at −0.4 (0.6 under a plain Pump). Against 65% it is about even; against 85% it loses; against 40% it wins.
    const withCalm = (p: number) => (0.8 + 0.5 + 0.3 + 0.3 - 0.4) * (1 - (1 - p) ** 2), without = (p: number) => (0.8 + 0.5 + 0.3 + 0.3 + 0.2) * p;
    expect(withCalm(0.85)).toBeLessThan(without(0.85)); expect(withCalm(0.4)).toBeGreaterThan(without(0.4)); expect(Math.abs(withCalm(0.65) / without(0.65) - 1)).toBeLessThan(0.1);
  });
});

describe('rules 1.19: one free Pump a turn', () => {
  it('the table (rules 1.33: Will Power, it was Empathy): 3 gives the free Pump each round; Empathy 7 no longer gives a second, it swells without Strain', () => {
    const s = storyWith([{ ...SOUL }]); const c = s.g.characters[s.chars[0].id];
    for (const [e, n, sw] of [[0, 0, false], [2, 0, false], [3, 1, false], [6, 1, false], [7, 1, true], [10, 1, true]] as [number, number, boolean][]) { c.skills.will_power = e; expect(freePumps(c), 'will power ' + e).toBe(n); expect(swellFree(c), 'will power ' + e).toBe(sw); }
    expect(FREE_PER_TURN).toBe(1);
  });
  it('a character takes one free Pump a turn whatever gives them: the fight\'s first and Empathy\'s don\'t add up; it comes back next turn', () => {
    const f = heart(); const m = me(f).mg!; m.firstUsed = false; m.freePumps = 2; m.freePumpsMax = 2; const d = give(f.pc); begin(f, d); const ap = me(f).ap;
    pump(f); expect(me(f).ap).toBe(ap); expect(me(f).mg!.freeUsed).toBe(1); expect(withGame(f.g, () => freeStageLeft(me(f)))).toBe(false);
    expect(withGame(f.g, () => previewPump(f.cb, me(f)))).toMatchObject({ ok: true, ap: 1, free: false });
    pump(f); pump(f); expect(me(f).ap).toBe(ap - 2); expect(me(f).mg!.freePumps).toBe(2); // Empathy's were never spent: the fight's first Pump was the free one
    // Revert gives the free Pump back
    A(f, { type: 'combat/revert' }); A(f, { type: 'combat/revert' }); A(f, { type: 'combat/revert' }); expect(me(f).ap).toBe(ap); expect(me(f).mg!.freeUsed).toBe(0); expect(me(f).mg!.firstUsed).toBe(false);
    pump(f); A(f, { type: 'combat/letgo' });
    const u = f.turn(f.pc); u.ap = 60; expect(me(f).mg!.freeUsed).toBe(0); begin(f, d); const ap2 = me(f).ap; pump(f); pump(f); expect(me(f).ap).toBe(ap2 - 1);
  });
  it('a full stage 4 inside one turn costs the whole turn: Begin 2, one free Pump, three paid, Release 1', () => {
    const f = heart(); const m = me(f).mg!; m.freePumps = 1; m.freePumpsMax = 1; const d = give(f.pc); me(f).ap = 6;
    expect(plan(f, d).ap).toBe(SOUL_AP.begin + SOUL_AP.release); // a snap
    expect(withGame(f.g, () => previewOutburstPlan(f.cb, me(f), d, '6,5', { stage: 4 })).ap).toBe(2 + 3 + 1);
    begin(f, d); pump(f, undefined, 4); expect(me(f).ap).toBe(1); release(f); expect(me(f).ap).toBe(0);
  });
  it('an enemy caster keeps its own free Pumps (the enemy table was fitted with them)', () => {
    const f = heart(); const foe = f.foe; foe.mg = heartMagic(foe, HEART_CASTERS[0]); Object.assign(foe.mg!, { freePumps: 2, freePumpsMax: 2, mp: 999, strainLimit: 20 }); foe.ap = 6;
    foe.mg!.held = { design: foe.mg!.designs[0].id, stage: 0, cost: 0, v: (me(f).mg as any).held?.v } as any;
    withGame(f.g, () => { expect(pumpOutburst(f.cb, f.g.rng, foe)).toBeNull(); expect(pumpOutburst(f.cb, f.g.rng, foe)).toBeNull(); });
    expect(foe.ap).toBe(6); expect(foe.mg!.held!.stage).toBe(2);
  });
  it('Empathy 7: a held Outburst swells without Strain; below it the swell costs 1', () => {
    const run = (free: boolean) => { const f = heart(); me(f).mg!.swellFree = free; const d = give(f.pc); begin(f, d); const s = me(f).mg!.strain; f.turn(f.pc); return { stage: me(f).mg!.held!.stage, strain: me(f).mg!.strain - s }; };
    expect(run(false)).toEqual({ stage: 1, strain: 0 }); // −1 at the turn start, +1 for the swell
    expect(run(true)).toEqual({ stage: 1, strain: -1 }); // −1 at the turn start, nothing for the swell
  });
  it('Shape (Channeler): the free Pump on a Damage design even without Empathy 3, still one a turn; the free Pump steps +0.1 more', () => {
    const f = heart(['6,5'], [], { classId: 'channeler', level: 5 }); const d = give(f.pc); begin(f, d); const ap = me(f).ap;
    expect(withGame(f.g, () => previewPump(f.cb, me(f)))).toMatchObject({ ok: true, ap: 0, mult: 1.1 });
    pump(f); expect(me(f).ap).toBe(ap); expect(me(f).mg!.held!.plus).toBe(0.1); expect(heldMult(f.cb, me(f), me(f).mg!.held)).toBe(1.1);
    pump(f); expect(me(f).ap).toBe(ap - 1); expect(me(f).mg!.held!.plus).toBe(0.1); // one a turn
    release(f); expect(lost(f.foe)).toBe(Math.floor(20 * 1.3 * 0.8)); // 1.2 + 0.1, At Once ×0.8
    // not on a design that doesn't deal damage
    const g = heart(['6,5'], ['4,5'], { classId: 'channeler', level: 5 }); const b = give(g.pc, { school: 'buff', option: 'heal', modules: [] }); begin(g, b); const ap2 = me(g).ap; pump(g); expect(me(g).ap).toBe(ap2 - 1); expect(me(g).mg!.held!.plus || 0).toBe(0);
  });
  it('Heart Overload II: its free Begin holds at stage 1 only while the turn\'s free stage is still there', () => {
    const AGAIN = 'perk:heart_overload#again';
    const run = (usedFree: boolean) => {
      const f = heart(['6,5'], [], { perks: { heart_overload: 'II' } }); const m = me(f).mg!; if (usedFree) { m.freePumps = 1; m.freePumpsMax = 1; }
      const d = give(f.pc); begin(f, d); pump(f, undefined, 2); release(f); begin(f, d, { hold: true, mods: [AGAIN] }); return me(f).mg!.held!.stage;
    };
    expect(run(false)).toBe(1); expect(run(true)).toBe(0);
  });
});

describe('rules 1.19: what a Pump costs', () => {
  it('1 AP, plain or with a feeling, the first or the fourth of a turn; the two prices that were measured and not adopted are switches in the data, off', () => {
    const C: any = (SOUL_RULES as any).cycle; expect(C.pump_ap).toBe(1); expect(C.feeling_pump_ap_extra).toBe(0); expect(C.pump_ap_after_second).toBeNull();
    expect(pumpBaseAp(undefined, null, 0)).toBe(1); expect(pumpBaseAp(undefined, 'rage', 0)).toBe(1); expect(pumpBaseAp(undefined, null, 3)).toBe(1);
    try { C.pump_ap_after_second = 2; expect(pumpBaseAp(undefined, null, 1)).toBe(1); expect(pumpBaseAp(undefined, null, 2)).toBe(2); C.pump_ap_after_second = null; C.feeling_pump_ap_extra = 1; expect(pumpBaseAp(undefined, 'rage', 0)).toBe(2); expect(pumpBaseAp(undefined, null, 0)).toBe(1); }
    finally { C.pump_ap_after_second = null; C.feeling_pump_ap_extra = 0; }
  });
});

describe('rules 1.19: the schools read the stage and have more inside them', () => {
  it('the stage riders: a save 1 harder every 2 stages; a round longer from stage 3; a push 1 tile longer from stage 2 and 2 at stage 4; boons a round longer at 2 and at 4', () => {
    expect([0, 1, 2, 3, 4].map(stageSaveTn)).toEqual([0, 0, 1, 1, 2]); expect([0, 1, 2, 3, 4].map(stageRounds)).toEqual([0, 0, 0, 1, 1]);
    expect([0, 1, 2, 3, 4].map(stageTiles)).toEqual([0, 0, 1, 1, 2]); expect([0, 1, 2, 3, 4].map(stageBoonRounds)).toEqual([0, 0, 1, 1, 2]);
    expect((SOUL_RULES as any).stage_riders.provisional).toBe(true);
  });
  it('Control: a push is 3 tiles at stage 0, 4 at stage 2, 5 at stage 4; the preview shows the harder save', () => {
    for (const [st, x] of [[0, 9], [2, 10], [4, 11]] as [number, number][]) { const f = heart(); const d = give(f.pc, { school: 'control', option: 'push', modules: [] }); begin(f, d); pump(f, undefined, st); release(f); expect(f.foe.pos, 'stage ' + st).toBe(x + ',5'); }
    const f = heart(); const d = give(f.pc, { school: 'control', option: 'pinned', modules: [] }); begin(f, d); const tn0 = plan(f).affected[0].saves[0].tn; pump(f, undefined, 2); expect(plan(f).affected[0].saves[0].tn).toBe(tn0 + 1); pump(f, undefined, 2); expect(plan(f).affected[0].saves[0].tn).toBe(tn0 + 2);
  });
  it('Status and Control conditions last a round longer from stage 3; Inspired and Guarded 3 rounds from stage 2 and 4 at stage 4', () => {
    const cond = (school: string, option: string, st: number, id: string, ally = false) => { const f = heart(['6,5'], ally ? ['4,5'] : []); const d = give(f.pc, { school, option, modules: [] }); begin(f, d); pump(f, undefined, st); release(f, ally ? '4,5' : '6,5'); return (ally ? f.unit(f.pcs[1].id) : f.foe).conds?.[id] || 0; };
    expect(cond('status', 'shaken', 2, 'shaken')).toBe(2); expect(cond('status', 'shaken', 3, 'shaken')).toBe(3);
    expect(cond('control', 'slowed', 0, 'slowed')).toBe(2); expect(cond('control', 'slowed', 4, 'slowed')).toBe(3);
    expect(cond('buff', 'defense', 1, 'guarded', true)).toBe(2); expect(cond('buff', 'defense', 2, 'guarded', true)).toBe(3); expect(cond('buff', 'hit', 4, 'inspired', true)).toBe(4);
  });
  it('the Damage school\'s ways to strike: Strike (full), Finish (×0.8; ×1.4 at half HP or less), Brand (×0.8 and Marked), Drain (×0.8 and you heal a quarter of the HP taken)', () => {
    expect((SCHOOL.damage as any).options).toEqual(['strike', 'finish', 'brand', 'drain']);
    expect(damageModeMult(undefined)).toBe(1); expect(damageModeMult('strike')).toBe(1); expect(damageModeMult('brand')).toBe(0.8); expect(damageModeMult('drain')).toBe(0.8);
    const hit = (option: string | undefined, o: { foeHp?: number; myHp?: number } = {}) => { const f = heart(); if (o.foeHp) f.foe.hp = o.foeHp; if (o.myHp) me(f).hp = o.myHp; const hp0 = f.foe.hp; const d = give(f.pc, option ? { option } : {}); const pv = plan(f, d).affected[0].dmg; begin(f, d, { aim: '6,5' }); return { f, dmg: hp0 - f.foe.hp, pv }; };
    expect(hit(undefined).dmg).toBe(Math.floor(20 * 0.8 * 0.8)); expect(hit('strike').dmg).toBe(Math.floor(20 * 0.8 * 0.8));
    const fin = hit('finish'), low = hit('finish', { foeHp: 250 }); expect(fin.dmg).toBe(Math.floor(20 * 0.8 * 0.8 * 0.8)); expect(low.dmg).toBe(Math.floor(20 * 0.8 * 0.8 * 1.4)); expect(low.pv).toBe(low.dmg); expect(fin.pv).toBe(fin.dmg);
    const br = hit('brand'); expect(br.dmg).toBe(Math.floor(20 * 0.8 * 0.8 * 0.8)); expect(condOn(br.f.foe, 'marked')).toBe(true); expect(br.f.foe.condBy?.marked).toBe(br.f.pc.id);
    const dr = hit('drain', { myHp: 400 }); expect(dr.dmg).toBe(Math.floor(20 * 0.8 * 0.8 * 0.8)); expect(me(dr.f).hp).toBe(400 + Math.floor(dr.dmg * 0.25)); expect(logHas(dr.f, /\(Drain\)/)).toBe(true);
    expect(condOn(hit('strike').f.foe, 'marked')).toBe(false);
  });
  it('Control can Swap (a Bolt: you and the first creature trade places; an ally doesn\'t resist) and Status can Silence (1 round)', () => {
    expect((SCHOOL.control as any).options).toContain('swap'); expect((SCHOOL.status as any).options).toContain('silenced');
    const f = heart(); const d = give(f.pc, { school: 'control', option: 'swap', modules: [] }); begin(f, d, { aim: '6,5' }); expect(me(f).pos).toBe('6,5'); expect(f.foe.pos).toBe('3,5');
    const sure = heart(['6,5'], [], {}, { saves: 99 }); const d2 = give(sure.pc, { school: 'control', option: 'swap', modules: [] }); begin(sure, d2, { aim: '6,5' }); expect(me(sure).pos).toBe('3,5'); // it saved
    const al = heart(['12,5'], ['5,5'], {}, { saves: 99 }); const d3 = give(al.pc, { school: 'control', option: 'swap', modules: [] }); begin(al, d3, { aim: '5,5' }); expect(me(al).pos).toBe('5,5'); expect(al.unit(al.pcs[1].id).pos).toBe('3,5');
    const s = heart(); const ds = give(s.pc, { school: 'status', option: 'silenced', modules: [] }); begin(s, ds, { aim: '6,5' }); expect(s.foe.conds?.silenced).toBe(1);
  });
  it('every school says what it is for, and what taking it twice would do', () => {
    for (const id of ['damage', 'buff', 'control', 'status']) { const s: any = SCHOOL[id]; expect(s.identity, id).toMatch(/^The school that /); expect(s.stack, id).toMatch(/^Shelved\./); expect(s.text, id).not.toMatch(/item \d|rules \d|section \d/i); }
  });
});

describe('rules 1.19: the same school twice in one design (defined, shelved)', () => {
  it('nobody can build one: the workshop\'s check refuses it for a character who could take any other second school, and so does the Proving Ground', () => {
    expect((SOUL_RULES as any).second_school.same_school).toMatchObject({ shelved: true, provisional: true });
    const s = storyWith([{ ...SOUL, skills: { will_power: 10 } }]); const c = s.g.characters[s.chars[0].id];
    c.soulKnown = { schools: ['damage', 'buff', 'control', 'status'], modules: ['wave', 'move'] } as any; (c.soulKnown as any).sameSchool = true; // even with the flag an advanced class will set
    expect(sameSchoolError(c)).toMatch(/not open yet/);
    for (const school of ['damage', 'buff', 'control', 'status']) expect(checkOutburstDesign(c, { school, school2: school, modules: [] }, moduleSlots(c), 'x'), school).toMatch(/not open yet/);
    expect(typeof checkOutburstDesign(c, { school: 'damage', school2: 'control', option2: 'push', modules: [] }, moduleSlots(c), 'x')).toBe('object'); // a different second school is fine
    expect(() => s.act({ type: 'magic/design', charId: c.id, design: { name: 'Twice', school: 'damage', school2: 'damage', modules: [] } } as any)).toThrow(/not open yet/);
  });
  it('the engine carries one all the same: Damage twice the same way is half again the damage; a second way rides at half', () => {
    const f = heart(); const d = give(f.pc, { school2: 'damage' }); begin(f, d, { aim: '6,5' });
    expect(lost(f.foe)).toBe(Math.floor(20 * 0.8 * 0.8) + Math.floor(20 * 0.8 * 0.8 * 0.5));
    const g = heart(); me(g).hp = 400; me(g).mg!.soulBase = 200; const e = give(g.pc, { school2: 'damage', option2: 'drain' }); begin(g, e, { aim: '6,5' });
    const second = Math.floor(200 * 0.8 * 0.8 * 0.8 * 0.5); expect(lost(g.foe)).toBe(Math.floor(200 * 0.8 * 0.8) + second); expect(me(g).hp).toBe(400 + Math.floor(second * 0.25 * 0.5)); // Strike, then Drain at half (its heal at half too)
  });
  it('a condition twice the same way lasts half again as long (one save, not two); a push twice goes half again as far', () => {
    const f = heart(); const d = give(f.pc, { school: 'status', option: 'shaken', school2: 'status', option2: 'shaken', modules: [] }); begin(f, d, { aim: '6,5' });
    expect(f.foe.conds?.shaken).toBe(3); expect(f.cb.log.join('\n').match(/is Shaken/g)!.length).toBe(1);
    let pushed = false; for (let s = 1; s < 40 && !pushed; s++) { const g = heart(); const e = give(g.pc, { school: 'control', option: 'push', school2: 'control', option2: 'push', modules: [] }); g.g.rng.state = s * 7919; begin(g, e, { aim: '6,5' }); if (/holds its ground/.test(g.cb.log.join('\n'))) continue; expect(g.foe.pos).toBe('10,5'); pushed = true; } expect(pushed).toBe(true); // 3, then 1 more (a natural 20 still saves)
    const h = heart(['6,5'], ['4,5']); const b = give(h.pc, { school: 'buff', option: 'heal', school2: 'buff', option2: 'heal', modules: [] }); h.unit(h.pcs[1].id).hp = 300; begin(h, b, { aim: '4,5' }); expect(h.unit(h.pcs[1].id).hp).toBe(300 + 5 + 2); // 7 × 0.8, then half (rules 1.20)
  });
});

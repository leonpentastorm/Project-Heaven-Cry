// The one formula's module (src/effects/output.ts; docs/design/proposals/2026-11-unified-damage.md, stage (a), step a1).
// What this file pins: the data (profiles, pairs, the Level table; rules 1.26 the re-fit: aimed, landed and flat shapes);
// the Stat term is k x (1 + slopes) of its profile; the stacking rule; an amount's two halves and its two orders;
// the one armour function; deal and mend. That whole actions still produce and land the same numbers is the golden
// tables' job (golden-damage*.test.ts).
import { describe, expect, it } from 'vitest';
import { scaleOf,
  RULES, ENEMY_LEVELS, enemyLevelRow, ARCHETYPES, newCharacter, WEAPON,
  PROFILES, PAIRS, profileOf, pairOf, statTerm, statOf, levelFactor, levelOf, stackDamage, VS_CAP, openAmount, closeAmount, amountOf, armourAgainst, landed, deal, mend,
  physicalMult, weaponMult, sigilMult, soulMult, elementalMult, healingMult, blessingPower, mendFactor, mendFactorOf, hurtUnit, harm,
  type Sheet, type Unit,
} from '../src';
import { onHook } from '../src/effects/hooks';
import { fightWith, withGame } from './helpers/perkfight';

const sheet = (): Sheet => { const a = ARCHETYPES[0]; return { name: 'Tester', portrait: '', origin: 'Central City', kit: 'soldier', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} }; };
const withStats = (attrs: Record<string, number>, skills: Record<string, number>) => { const c = newCharacter('c1', 'p1', sheet()); Object.assign(c.attrs, attrs); Object.assign(c.skills, skills); c.perks = []; c.traits = []; c.classId = null as any; return c; };

describe('the data (rules.json output): the profiles of rules 1.26 (the re-fit)', () => {
  it('three shapes: aimed (no slope, a Level term), landed (0.06 a point, a slope), flat (k 1, the deal column); each k re-pins its system', () => {
    const P = (RULES as any).output.profiles;
    for (const [id, p] of Object.entries(PROFILES)) {
      const shape = P[id].shape;
      expect(['aimed', 'landed', 'flat', undefined], id).toContain(shape);
      if (shape === 'aimed') { expect(p.attr, id).toBe(0); expect(p.skill, id).toBe(0); }
      if (shape === 'landed') { expect(p.attr, id).toBe(0.06); expect(p.skill, id).toBe(0.06); }
      if (shape === 'flat') expect([p.k, p.attr, p.skill, p.level]).toEqual([1, 0, 0, 'deal']);
    }
    // Leon: no damage slope on rolled attacks (skill buys accuracy, level buys damage)
    for (const id of ['weapon', 'sigil', 'soul']) { expect(PROFILES[id].attr + PROFILES[id].skill, id).toBe(0); expect(PROFILES[id].level, id).toBe('deal'); }
    for (const id of ['mend', 'blessing_mend', 'sigil_mend', 'soul_mend']) expect(PROFILES[id].level, id).toBe('mend');
    expect((RULES as any).output.provisional).toBe(true);
  });
  it('the pairs: which Attribute and Skill each Stat term reads (Blessing power reads Virtue since rules 1.26)', () => {
    expect(PAIRS.physical).toEqual({ attrs: ['strength'], skills: ['raw_power'] }); expect(PAIRS.sigil).toEqual({ attrs: ['intelligence'], skills: ['brain_power'] });
    expect(PAIRS.elemental).toEqual({ attrs: ['expression'], skills: ['visualization'] }); expect(PAIRS.soul).toEqual({ attrs: ['determination'], skills: ['will_power'] });
    expect(PAIRS.blessing).toEqual({ attrs: ['virtue'], skills: ['faith'] }); expect(PAIRS.healing).toEqual({ attrs: ['insight'], skills: ['empathy'] });
    expect(pairOf('mend')).toEqual(PAIRS.healing); expect(pairOf('nothing')).toEqual({ attrs: [], skills: [] }); expect(profileOf('nothing')).toEqual({ k: 1, attr: 0, skill: 0, level: null });
  });
  it('Level: `deal` is the old plain rifle (k x deal) x the level scale (rules 1.36: 7.5^((level - 1)/19)); `mend` and `scale` are columns of their own', () => {
    const deal = (RULES as any).output.level.deal as number[]; expect(deal.length).toBe(20); expect(deal[0]).toBe(1);
    for (let l = 2; l <= 20; l++) expect(deal[l - 1], 'level ' + l).toBeGreaterThanOrEqual(deal[l - 2]);
    const old = [1.5, 1.6, 1.65, 1.75, 1.8, 1.9, 1.95, 2.05, 2.1, 2.2, 2.25, 2.35, 2.4, 2.4, 2.4, 2.4, 2.4, 2.4, 2.4, 2.4]; // the plain rifle's weapon multiplier at a normal share, levels 1 to 20, before
    for (let l = 1; l <= 20; l++) { expect(PROFILES.weapon.k * levelFactor('deal', l)).toBeCloseTo(old[l - 1] * scaleOf(l), 3); expect(levelFactor('deal', l)).toBeCloseTo(7.5 ** ((l - 1) / 19), 4); expect(levelFactor('mend', l)).toBe((RULES as any).output.level.mend[l - 1]); expect(mendFactor(l)).toBe(levelFactor('mend', l)); expect(levelOf('mend', l)).toBe(mendFactor(l)); expect(levelOf('weapon', l)).toBe(levelFactor('deal', l)); }
    expect(levelFactor('mend', 1)).toBe(1); expect(levelFactor('scale', 1)).toBe(1); expect(levelFactor('scale', 20)).toBeCloseTo(7.5 / 1.6, 4);
    expect(levelFactor('mend', null)).toBe(1); expect(levelFactor(null, 12)).toBe(1); expect(mendFactor(undefined)).toBe(1);
    for (const p of ['physical', 'elemental', 'blessing', 'healing']) expect(levelOf(p, 20)).toBe(scaleOf(20)); // rules 1.36: the profiles with no column of their own take the scale
  });
  it('an enemy\'s healing and shields take no level factor from here (they grow through its own multipliers)', () => {
    expect(mendFactorOf({ side: 'foe', level: 20 } as Unit)).toBe(1); expect(mendFactorOf({ side: 'pc', level: 12 } as Unit)).toBe(levelFactor('mend', 12)); expect(mendFactorOf(null)).toBe(1);
  });
});

describe('the Stat term: k x (1 + attr x (Attribute - 1) + skill x Skill), read from the profiles', () => {
  const T = (id: string, a: number, k: number) => { const p = PROFILES[id], n = PAIRS[p.pair || id] || { attrs: [], skills: [] }; return (1 + n.attrs.length * p.attr * (a - 1) + n.skills.length * p.skill * k) * p.k; };
  it('every derived multiplier, for every Attribute 1 to 10 and Skill 0 to 10', () => {
    for (let a = 1; a <= 10; a++) for (let k = 0; k <= 10; k++) {
      const c = withStats({ strength: a, intelligence: a, expression: a, determination: a, insight: a, agility: a, virtue: a }, { raw_power: k, brain_power: k, visualization: k, will_power: k, empathy: k, faith: k, dexterity: k });
      expect(physicalMult(c)).toBeCloseTo(T('physical', a, k), 12); expect(sigilMult(c)).toBeCloseTo(T('sigil', a, k), 12); expect(soulMult(c)).toBeCloseTo(T('soul', a, k), 12);
      expect(elementalMult(c)).toBeCloseTo(T('elemental', a, k), 12); expect(healingMult(c)).toBeCloseTo(T('healing', a, k), 12); expect(blessingPower(c)).toBeCloseTo(T('blessing', a, k), 12);
      expect(statOf('sigil', c)).toBe(sigilMult(c)); expect(statOf('mend', c)).toBe(healingMult(c)); expect(statOf('flat', c)).toBe(1);
    }
  });
  it('a weapon\'s multiplier is the aimed profile\'s k for every weapon and every sheet (Leon, rules 1.26: skill buys accuracy, level buys damage)', () => {
    for (const w of Object.values(WEAPON) as any[]) {
      const ph = w.phys; if (!ph) continue;
      const skills: string[] = ph.also_scales?.length ? ph.also_scales : [ph.hits_with];
      const c = withStats(Object.fromEntries((ph.scales_with as string[]).map((x, i) => [x, 4 + i * 3])), Object.fromEntries(skills.map((x, i) => [x, 7 - i * 2])));
      expect(weaponMult(c, w.id), w.id).toBe(PROFILES.weapon.k);
    }
    const c = withStats({ strength: 6 }, { raw_power: 4 }); expect(weaponMult(c, 'no_such_weapon')).toBe(physicalMult(c)); expect(weaponMult(c, null)).toBe(1.7);
  });
  it('k multiplies the whole term', () => {
    expect(statTerm({ k: 1.47, attr: 0, skill: 0.005, level: 'deal' }, [10], [10])).toBe((1 + 0.005 * 10) * 1.47); expect(statTerm({ k: 1, attr: 0.06, skill: 0.06, level: null }, [7], [7])).toBe(1 + 0.06 * 6 + 0.06 * 7);
  });
});

describe('the stacking rule: own multipliers multiply; target bonuses add, are capped, and multiply once', () => {
  it('x1.3 with +50% is x1.95; the bonuses are held between -90% and +100%', () => {
    const T = (...v: number[]) => v.map((x) => ({ v: x, label: 't' }));
    expect(stackDamage(T(1.3, 1.5), [])).toEqual({ mult: 1.3 * 1.5, vsMult: 1, total: 1.3 * 1.5 });
    expect(stackDamage([], T(0.15, 0.3)).vsMult).toBe(1 + (0.15 + 0.3)); expect(stackDamage([], T(0.7, 0.6)).vsMult).toBe(1 + VS_CAP); expect(stackDamage([], T(-0.5, -0.6)).vsMult).toBe(1 + -0.9);
    expect(stackDamage(T(2), T(0.5)).total).toBe(3);
  });
});

describe('an amount: base, per-point parts, flat, Stat, Level, own multipliers, target bonuses', () => {
  it('the base takes its per-point parts; the Stat and Level terms come first; a term of exactly x1 is not listed', () => {
    const c = withStats({ insight: 5 }, { empathy: 3 });
    const a = openAmount({ kind: 'heal', base: 5, profile: 'mend' }, { level: 12 } as Unit, { who: c, mults: [{ v: 0.4, label: 'area share' }, { v: 1, label: 'nothing' }] });
    expect(a.base).toBe(5); expect(a.mults).toEqual([{ v: statOf('mend', c), label: 'mend' }, { v: levelFactor('mend', 12), label: 'level' }, { v: 0.4, label: 'area share' }]);
    expect(openAmount({ kind: 'damage', base: 20, per: [{ of: 'devotion', value: 4 }] }, null, { counts: { devotion: 7 } }).base).toBe(48); // an intervention: 20 + 4 x Devotion
    expect(openAmount({ kind: 'damage', base: 30, profile: 'weapon' }, { level: 9 } as Unit, { stat: { v: 1, label: 'x' } }).mults).toEqual([{ v: levelFactor('deal', 9), label: 'level' }]); // x1 Stat: not listed; the Level term (rules 1.26) is
    expect(openAmount({ kind: 'damage', base: 30, profile: 'weapon' }, { level: 9 } as Unit, { stat: { v: 1.5, label: 'Agility and Dexterity' }, level: null }).mults).toEqual([{ v: 1.5, label: 'Agility and Dexterity' }]);
  });
  it('amountOf: the raw product and its floor, every term named', () => {
    const c = withStats({ intelligence: 6 }, { brain_power: 6 });
    const r = amountOf({ kind: 'damage', base: 30, profile: 'sigil' }, null, { who: c, flat: 2, mults: [{ v: 1.7, label: 'Line' }], vs: [{ v: 0.15, label: 'True Name' }] });
    expect(r.raw).toBe((30 + 2) * statOf('sigil', c) * 1.7 * (1 + 0.15)); expect(r.amount).toBe(Math.floor(r.raw)); expect(r.terms.map((t) => t.label)).toEqual(['sigil', 'Line']); expect(r.vs).toEqual([{ v: 0.15, label: 'True Name' }]); // no level given, no unit: no Level term
  });
  it('one order for everything (step a7, item 1421): the base times each multiplier in turn, then the target bonus', () => {
    const mk = (base: number, ms: number[], v: number) => closeAmount({ spec: { kind: 'damage', base }, base, add: 0, mults: ms.map((x) => ({ v: x, label: 'm' })), vs: [{ v, label: 'v' }] });
    expect(mk(30, [1.5], 0.2).raw).toBe(30 * 1.5 * (1 + 0.2)); expect(mk(30, [1.5], 0.2).amount).toBe(54);
    expect(30 * (1.5 * (1 + 0.2))).toBeLessThan(54); // what a weapon attack did before a7: the multipliers and the target bonus together first, a point lower
    expect(mk(30, [1.5, 1.1, 1.25], 0.15).raw).toBe(30 * 1.5 * 1.1 * 1.25 * (1 + 0.15));
    // the sum (base + what items add) is never under 0 before it is multiplied, for every source
    expect(closeAmount({ spec: { kind: 'damage', base: 10 }, base: 10, add: -50, mults: [{ v: 2, label: 'm' }], vs: [] }).amount).toBe(0);
  });
});

describe('armour: one function', () => {
  const t = (armour: number) => ({ armour } as Unit);
  it('full, half (rounded down), none; ignored outright', () => {
    expect(armourAgainst(t(15))).toBe(15); expect(armourAgainst(t(15), 'full')).toBe(15); expect(armourAgainst(t(15), 'half')).toBe(7); expect(armourAgainst(t(15), 'none')).toBe(0);
    expect(armourAgainst(t(15), 'full', { ignore: true })).toBe(0); expect(armourAgainst(t(15), 'half', { ignore: true })).toBe(0);
  });
  it('the ammunition\'s multiplier, then the pierce; armour is never under 0, for every source (step a7, item 1422)', () => {
    expect(armourAgainst(t(10), 'full', { mult: 2 })).toBe(20); expect(armourAgainst(t(10), 'full', { mult: 2, pierce: 5 })).toBe(15); expect(armourAgainst(t(6), 'full', { pierce: 10 })).toBe(0);
    expect(armourAgainst(t(-4))).toBe(0); expect(armourAgainst(t(-4), 'full')).toBe(0); expect(armourAgainst(t(-5), 'half')).toBe(0); // armour taken below 0 adds no damage
  });
  it('a spell, a blast and a trap on a unit whose armour was taken below 0 land their number, not more', () => {
    const f = fightWith([{}, {}], [{ tier: 'soldier', at: 'F6', classic: true }]), foe = f.foe, [a] = f.pcs; foe.maxHp = 500; foe.shield = 0;
    for (const hit of [() => harm(f.cb, f.g.rng, a, foe, 30, 'sigil'), () => harm(f.cb, f.g.rng, a, foe, 30, 'elemental', 'fire'), () => hurtUnit(foe, 30, false, f.cb, 'explosion', a), () => hurtUnit(foe, 30, false, f.cb, 'trap', null)]) {
      foe.hp = 500; foe.armour = -6; withGame(f.g, hit); expect(foe.hp).toBe(470);
    }
  });
  it('what lands: floor, less armour, never under 1', () => { expect(landed(43.9, 5)).toBe(38); expect(landed(3, 10)).toBe(1); expect(landed(0, 0)).toBe(1); expect(landed(50, -4)).toBe(54); });
});

describe('deal and mend: the one way in', () => {
  const setup = () => { const f = fightWith([{}, {}], [{ tier: 'soldier', at: 'F6', classic: true }]); const foe = f.foe, [a, b] = f.pcs; foe.hp = foe.maxHp = 200; foe.armour = 7; foe.shield = 0; return { f, foe, a, b }; };
  it('amount, armour by the source\'s type, the sink; the result says what was produced, met and sent', () => {
    const { f, foe, a } = setup();
    const r = withGame(f.g, () => deal(f.cb, a, foe, { kind: 'damage', base: 30 }, { src: { type: 'sigil', dmgType: 'sigil', shield: true, credit: 'hp' } }));
    expect([r.produced, r.armour, r.sent, r.dealt]).toEqual([30, 7, 23, 23]); expect(foe.hp).toBe(177);
    const e = withGame(f.g, () => deal(f.cb, a, foe, { kind: 'damage', base: 30 }, { src: { type: 'elemental', dmgType: 'fire', shield: true, credit: 'hp' } })); expect([e.armour, e.sent]).toEqual([3, 27]);
    const s = withGame(f.g, () => deal(f.cb, a, foe, { kind: 'damage', base: 30 }, { src: { type: 'soul', shield: true, credit: 'hp' } })); expect([s.armour, s.sent]).toEqual([0, 30]);
    const o = withGame(f.g, () => deal(f.cb, a, foe, { kind: 'damage', base: 30, armour: 'full' }, { src: { type: 'soul', shield: true, credit: 'hp' } })); expect(o.armour).toBe(7); // the spec overrides the type (a Stone Outburst)
    const i = withGame(f.g, () => deal(f.cb, null, foe, { kind: 'damage', base: 30, armour: 'full' }, { ignoreArmour: true, src: { type: 'hazard', shield: true, credit: 'hp' } })); expect([i.armour, i.sent]).toEqual([0, 30]);
  });
  it('the shield takes it first, as the sink decides (not damage over time, not true damage)', () => {
    const { f, foe, a } = setup(); foe.shield = 10;
    const r = withGame(f.g, () => deal(f.cb, a, foe, { kind: 'damage', base: 30, armour: 'none' }, { src: { type: 'explosion', shield: true, credit: 'hp' } })); expect([r.shielded, r.dealt]).toEqual([10, 20]);
    foe.shield = 10; const t = withGame(f.g, () => deal(f.cb, a, foe, { kind: 'damage', base: 30 }, { src: { type: 'true', dmgType: 'true', shield: true, credit: 'hp' } })); expect([t.shielded, t.dealt]).toEqual([0, 30]);
  });
  it('the damage_out hook speaks only when the spec asks and there is a dealer; what it adds is stacked by the one rule', () => {
    const { f, foe, a } = setup(); const seen: any[] = [];
    let on = true; onHook('damage_out', (ctx: any) => { if (!on || ctx.src?.type !== 'golden-test') return; seen.push([ctx.base, ctx.mode, ctx.spell, ctx.spec?.kind]); ctx.add += 2; ctx.mults.push({ v: 1.5, label: 'x' }); ctx.vs.push({ v: 0.2, label: 'y' }); });
    const src = { type: 'golden-test', shield: true, credit: 'hp' as const };
    const r = withGame(f.g, () => deal(f.cb, a, foe, { kind: 'damage', base: 28, armour: 'none', hook: true }, { src, hookCtx: { mode: 'spell', spell: true } }));
    expect(seen).toEqual([[28, 'spell', true, 'damage']]); expect(r.produced).toBe(Math.floor((28 + 2) * 1.5 * 1.2)); expect(r.produced).toBe(54);
    const st = withGame(f.g, () => deal(f.cb, a, foe, { kind: 'damage', base: 28, armour: 'none', hook: true }, { src })); expect(st.produced).toBe(54); // one order (a7): it was 53 in a weapon attack's order
    withGame(f.g, () => deal(f.cb, a, foe, { kind: 'damage', base: 28, armour: 'none' }, { src })); withGame(f.g, () => deal(f.cb, null, foe, { kind: 'damage', base: 28, armour: 'none', hook: true }, { src }));
    expect(seen.length).toBe(2); on = false;
  });
  it('hurtUnit and harm are deal: the same HP for the same call', () => {
    const { f, foe, a } = setup();
    withGame(f.g, () => hurtUnit(foe, 40.9, false, f.cb, 'explosion', a)); expect(foe.hp).toBe(200 - 33);
    withGame(f.g, () => hurtUnit(foe, 3, false, f.cb, 'trap', null)); expect(foe.hp).toBe(200 - 33 - 1); // never under 1
    withGame(f.g, () => hurtUnit(foe, 25, true, f.cb, 'hazard', null)); expect(foe.hp).toBe(200 - 34 - 25);
    foe.hp = 200; withGame(f.g, () => harm(f.cb, f.g.rng, a, foe, 30.7, 'sigil')); expect(foe.hp).toBe(200 - 23);
    withGame(f.g, () => harm(f.cb, f.g.rng, a, foe, 30, 'elemental', 'fire')); expect(foe.hp).toBe(200 - 23 - 27);
    withGame(f.g, () => harm(f.cb, f.g.rng, null, foe, 10, 'true')); expect(foe.hp).toBe(200 - 50 - 10);
    withGame(f.g, () => harm(f.cb, f.g.rng, a, foe, 30, 'soul', undefined, 'full')); expect(foe.hp).toBe(200 - 60 - 23);
  });
  it('mend: the amount, then the heal sink or the shield sink (the receiver\'s multiplier is the sink\'s)', () => {
    const { f, a, b } = setup(); b.hp = 10; (b as any).healRecv = 1.5; (b as any).shieldRecv = 2; b.shield = 0;
    const c = withStats({ insight: 5 }, { empathy: 3 }); a.level = 12;
    const h = withGame(f.g, () => mend(f.cb, a, b, { kind: 'heal', base: 5, profile: 'mend' }, { who: c, healKind: 'triage' }));
    const want = 5 * statOf('mend', c) * levelFactor('mend', 12); /* in the formula's order: base × Stat × Level */ expect(h.amount).toBe(want); expect(h.restored).toBe(Math.min(b.maxHp - 10, Math.floor(want * 1.5)));
    const s = withGame(f.g, () => mend(f.cb, a, b, { kind: 'shield', base: 6, profile: 'mend' }, { who: c })); expect(s.shield).toBe(Math.floor(6 * (statOf('mend', c) * levelFactor('mend', 12)) * 2)); expect(b.shield).toBe(s.shield);
  });
});

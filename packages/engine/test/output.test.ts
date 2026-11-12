// The one formula's module (src/effects/output.ts; docs/design/proposals/2026-11-unified-damage.md, stage (a), step a1).
// What this file pins: the data (profiles, pairs, the Level table) says what the game did before the module existed;
// the Stat term is the old closed forms to the last place; the stacking rule; an amount's two halves and its two orders;
// the one armour function; deal and mend. That whole actions still produce and land the same numbers is the golden
// tables' job (golden-damage*.test.ts).
import { describe, expect, it } from 'vitest';
import {
  RULES, ENEMY_LEVELS, enemyLevelRow, ARCHETYPES, newCharacter, WEAPON,
  PROFILES, PAIRS, profileOf, pairOf, statTerm, statOf, levelFactor, levelOf, stackDamage, VS_CAP, openAmount, closeAmount, amountOf, armourAgainst, landed, deal, mend,
  physicalMult, weaponMult, sigilMult, soulMult, elementalMult, healingMult, blessingPower, mendFactor, mendFactorOf, hurtUnit, harm,
  type Sheet, type Unit,
} from '../src';
import { onHook } from '../src/effects/hooks';
import { fightWith, withGame } from './helpers/perkfight';

const sheet = (): Sheet => { const a = ARCHETYPES[0]; return { name: 'Tester', portrait: '', origin: 'Central City', kit: 'soldier', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} }; };
const withStats = (attrs: Record<string, number>, skills: Record<string, number>) => { const c = newCharacter('c1', 'p1', sheet()); Object.assign(c.attrs, attrs); Object.assign(c.skills, skills); c.perks = []; c.traits = []; c.classId = null as any; return c; };

describe('the data (rules.json output): today\'s numbers, nothing moved', () => {
  it('one profile a system with the slopes each derived multiplier always had; only `mend` and `blessing_mend` (the heal or shield of a prayer) read a level column', () => {
    const slopes = Object.fromEntries(Object.entries(PROFILES).map(([id, p]) => [id, [p.k, p.attr, p.skill, p.level]]));
    expect(slopes).toEqual({ physical: [1, 0.1, 0.05, null], weapon: [1, 0.1, 0.05, null], sigil: [1, 0.1, 0.1, null], elemental: [1, 0.1, 0.05, null], soul: [1, 0.05, 0.1, null],
      blessing: [1, 0, 0.1, null], healing: [1, 0.1, 0.1, null], mend: [1, 0.1, 0.1, 'mend'], blessing_mend: [1, 0, 0.1, 'mend'], flat: [1, 0, 0, null] });
    expect((RULES as any).output.provisional).toBe(true);
  });
  it('the pairs: which Attribute and Skill each Stat term reads', () => {
    expect(PAIRS.physical).toEqual({ attrs: ['strength'], skills: ['raw_power'] }); expect(PAIRS.sigil).toEqual({ attrs: ['intelligence'], skills: ['brain_power'] });
    expect(PAIRS.elemental).toEqual({ attrs: ['expression'], skills: ['visualization'] }); expect(PAIRS.soul).toEqual({ attrs: ['determination'], skills: ['will_power'] });
    expect(PAIRS.blessing).toEqual({ attrs: [], skills: ['faith'] }); expect(PAIRS.healing).toEqual({ attrs: ['insight'], skills: ['empathy'] });
    expect(pairOf('mend')).toEqual(PAIRS.healing); expect(pairOf('nothing')).toEqual({ attrs: [], skills: [] }); expect(profileOf('nothing')).toEqual({ k: 1, attr: 0, skill: 0, level: null });
  });
  it('Level: `deal` is ×1 at each of the 20 levels; `mend` is the enemy table\'s damage column, read and not copied', () => {
    expect((RULES as any).output.level.deal).toEqual(Array(20).fill(1)); expect((RULES as any).output.level.mend).toBe('enemies.levels.table.damage_mult');
    for (let l = 1; l <= 20; l++) { expect(levelFactor('deal', l)).toBe(1); expect(levelFactor('mend', l)).toBe(enemyLevelRow(l).damage_mult); expect(mendFactor(l)).toBe(levelFactor('mend', l)); expect(levelOf('mend', l)).toBe(mendFactor(l)); }
    expect(levelFactor('mend', 1)).toBe(1); expect(levelFactor('mend', 20)).toBe(ENEMY_LEVELS.table[ENEMY_LEVELS.table.length - 1].damage_mult);
    expect(levelFactor('mend', null)).toBe(1); expect(levelFactor(null, 12)).toBe(1); expect(mendFactor(undefined)).toBe(1);
    for (const p of ['physical', 'weapon', 'sigil', 'elemental', 'soul', 'blessing', 'healing', 'flat']) expect(levelOf(p, 20)).toBe(1);
  });
  it('an enemy\'s healing and shields take no level factor from here (they grow through its own multipliers)', () => {
    expect(mendFactorOf({ side: 'foe', level: 20 } as Unit)).toBe(1); expect(mendFactorOf({ side: 'pc', level: 12 } as Unit)).toBe(enemyLevelRow(12).damage_mult); expect(mendFactorOf(null)).toBe(1);
  });
});

describe('the Stat term is the old closed forms, to the last place', () => {
  it('every derived multiplier, for every Attribute 1 to 10 and Skill 0 to 10', () => {
    for (let a = 1; a <= 10; a++) for (let k = 0; k <= 10; k++) {
      const c = withStats({ strength: a, intelligence: a, expression: a, determination: a, insight: a, agility: a }, { raw_power: k, brain_power: k, visualization: k, will_power: k, empathy: k, faith: k, dexterity: k });
      expect(physicalMult(c)).toBe(1 + 0.1 * (a - 1) + 0.05 * k); expect(statTerm('physical', [a], [k])).toBe(1 + 0.1 * (a - 1) + 0.05 * k);
      expect(sigilMult(c)).toBe(1 + 0.1 * (a - 1) + 0.1 * k); expect(soulMult(c)).toBe(1 + 0.05 * (a - 1) + 0.1 * k);
      expect(elementalMult(c)).toBe(1 + 0.1 * (a - 1) + 0.05 * k); expect(healingMult(c)).toBe(1 + 0.1 * (a - 1) + 0.1 * k); expect(blessingPower(c)).toBe(1 + 0.1 * k);
      expect(statOf('sigil', c)).toBe(sigilMult(c)); expect(statOf('mend', c)).toBe(healingMult(c)); expect(statOf('flat', c)).toBe(1);
    }
  });
  it('a weapon\'s multiplier reads the weapon\'s own pair (each scales_with Attribute; the skill it hits with)', () => {
    for (const w of Object.values(WEAPON) as any[]) {
      const ph = w.phys; if (!ph) continue;
      const skills: string[] = ph.also_scales?.length ? ph.also_scales : [ph.hits_with];
      const c = withStats(Object.fromEntries((ph.scales_with as string[]).map((x, i) => [x, 4 + i * 3])), Object.fromEntries(skills.map((x, i) => [x, 7 - i * 2])));
      const want = 1 + (ph.scales_with as string[]).reduce((t, a) => t + 0.1 * ((c.attrs as any)[a] - 1), 0) + skills.reduce((t, k) => t + 0.05 * (c.skills as any)[k], 0);
      expect(weaponMult(c, w.id)).toBe(want);
    }
    const c = withStats({ strength: 6 }, { raw_power: 4 }); expect(weaponMult(c, 'no_such_weapon')).toBe(physicalMult(c)); expect(weaponMult(c, null)).toBe(1.7);
  });
  it('k multiplies the whole term (×1 everywhere today)', () => {
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
    expect(a.base).toBe(5); expect(a.mults).toEqual([{ v: 1 + 0.1 * 4 + 0.1 * 3, label: 'mend' }, { v: enemyLevelRow(12).damage_mult, label: 'level' }, { v: 0.4, label: 'area share' }]);
    expect(openAmount({ kind: 'damage', base: 20, per: [{ of: 'devotion', value: 4 }] }, null, { counts: { devotion: 7 } }).base).toBe(48); // an intervention: 20 + 4 x Devotion
    expect(openAmount({ kind: 'damage', base: 30, profile: 'weapon' }, { level: 9 } as Unit, { stat: { v: 1, label: 'x' } }).mults).toEqual([]); // x1 Stat, x1 Level: nothing listed
    expect(openAmount({ kind: 'damage', base: 30, profile: 'weapon' }, { level: 9 } as Unit, { stat: { v: 1.5, label: 'Agility and Dexterity' }, level: null }).mults).toEqual([{ v: 1.5, label: 'Agility and Dexterity' }]);
  });
  it('amountOf: the raw product and its floor, every term named', () => {
    const c = withStats({ intelligence: 6 }, { brain_power: 6 });
    const r = amountOf({ kind: 'damage', base: 30, profile: 'sigil' }, null, { who: c, flat: 2, mults: [{ v: 1.7, label: 'Line' }], vs: [{ v: 0.15, label: 'True Name' }] });
    expect(r.raw).toBe((30 + 2) * (1 + 0.1 * 5 + 0.1 * 6) * 1.7 * (1 + 0.15)); expect(r.amount).toBe(Math.floor(r.raw)); expect(r.terms.map((t) => t.label)).toEqual(['sigil', 'Line']); expect(r.vs).toEqual([{ v: 0.15, label: 'True Name' }]);
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
  it('the ammunition\'s multiplier, then the pierce; a weapon attack never meets less than 0', () => {
    expect(armourAgainst(t(10), 'full', { mult: 2 })).toBe(20); expect(armourAgainst(t(10), 'full', { mult: 2, pierce: 5 })).toBe(15); expect(armourAgainst(t(6), 'full', { pierce: 10, floor0: true })).toBe(0);
    expect(armourAgainst(t(6), 'full', { pierce: 10 })).toBe(-4); // not clamped unless asked: only the attack path clamps today
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
    const want = 5 * ((1 + 0.1 * 4 + 0.1 * 3) * enemyLevelRow(12).damage_mult); expect(h.amount).toBe(want); expect(h.restored).toBe(Math.min(b.maxHp - 10, Math.floor(want * 1.5)));
    const s = withGame(f.g, () => mend(f.cb, a, b, { kind: 'shield', base: 6, profile: 'mend' }, { who: c })); expect(s.shield).toBe(Math.floor(6 * ((1 + 0.1 * 4 + 0.1 * 3) * enemyLevelRow(12).damage_mult) * 2)); expect(b.shield).toBe(s.shield);
  });
});

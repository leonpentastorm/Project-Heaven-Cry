// Step a7 of the damage-formula migration (docs/design/handoffs/unified-damage-stage-a.md): the leaks. Each of these
// CHANGES behaviour on purpose (spec items 1421, 1422, 1440 to 1443); the golden tables hold the numbers that moved.
//   1. one order of multiplication (test/output.test.ts)            2. armour never under 0 (test/output.test.ts)
//   3. what an item adds to a spell goes in beside the base, and is multiplied by everything the spell multiplies by
//   4. a blast, a splash, a trap and a thrown item fire 'damage_out' when someone made them (a thrower, a shooter, an
//      owner), marked with their kind, so that an item can speak about them; no item written before does unless it
//      says so (this file pins which do)
import { describe, it, expect } from 'vitest';
import { harm, hurtUnit, closeAmount, openAmount, term, type Unit } from '../src';
import { onHook } from '../src/effects/hooks';
import { fightWith, withGame } from './helpers/perkfight';

const BEND: { on: boolean; add: number; mults: number[]; vs: number[]; seen: any[] } = { on: false, add: 0, mults: [], vs: [], seen: [] };
onHook('damage_out', (ctx: any) => {
  if (!BEND.on) return;
  BEND.seen.push({ mode: ctx.mode, type: ctx.src?.type, base: ctx.base, mults: (ctx.mults || []).map((m: any) => m.v), spell: !!ctx.spell, blast: !!ctx.blast });
  ctx.add += BEND.add; for (const v of BEND.mults) ctx.mults.push({ v, label: 'test' }); for (const v of BEND.vs) ctx.vs.push({ v, label: 'test' });
});
function bend<T>(b: Partial<typeof BEND>, f: () => T): T { Object.assign(BEND, { on: true, add: 0, mults: [], vs: [], seen: [] }, b); try { return f(); } finally { BEND.on = false; } }
const setup = () => { const f = fightWith([{}, {}], [{ tier: 'soldier', at: 'F6', classic: true }]); const foe = f.foe, [a, b] = f.pcs; foe.maxHp = 5000; foe.hp = 5000; foe.armour = 0; foe.shield = 0; return { f, foe, a, b }; };
const hpLost = (foe: Unit, f: () => void) => { foe.hp = 5000; f(); return 5000 - foe.hp; };

describe('a7 (3): what an item adds to a spell goes in beside the base (spec item 1440)', () => {
  it('a spell handed in with its terms open: (base + flat) × every multiplier, then what the item multiplies by, then the target bonus', () => {
    const { f, foe, a } = setup();
    withGame(f.g, () => {
      const open = { base: 30, mults: [term(1.5, 'stat'), term(1.7, 'line')] };
      expect(hpLost(foe, () => harm(f.cb, f.g.rng, a, foe, open, 'soul'))).toBe(Math.floor(30 * 1.5 * 1.7));
      expect(hpLost(foe, () => bend({ add: 10 }, () => harm(f.cb, f.g.rng, a, foe, open, 'soul')))).toBe(Math.floor((30 + 10) * 1.5 * 1.7)); // it was 76 + 10
      expect(hpLost(foe, () => bend({ add: 10, mults: [1.2], vs: [0.15] }, () => harm(f.cb, f.g.rng, a, foe, open, 'soul')))).toBe(Math.floor((30 + 10) * 1.5 * 1.7 * 1.2 * 1.15));
      // the hook sees the spell's own base and multipliers (not a finished number)
      bend({}, () => harm(f.cb, f.g.rng, a, foe, open, 'soul')); expect(BEND.seen[0]).toMatchObject({ mode: 'spell', base: 30, mults: [1.5, 1.7], spell: true });
      // a Sigil part is rounded, once, at the end (it was rounded, then floored after the item's multiplier)
      expect(hpLost(foe, () => bend({ mults: [1.25] }, () => harm(f.cb, f.g.rng, a, foe, { base: 22, mults: [term(1.7, 'line')], round: 'round' }, 'soul')))).toBe(Math.round(22 * 1.7 * 1.25)); // 47 (46.75); it was floor(round(37.4) × 1.25) = 46
      // an item that takes more than the base away leaves nothing to multiply: the hit lands 1
      expect(hpLost(foe, () => bend({ add: -50 }, () => harm(f.cb, f.g.rng, a, foe, open, 'soul')))).toBe(1);
    });
  });
  it('a finished number is its own base, as before: a flat source has no multipliers for the item\'s flat to meet', () => {
    const { f, foe, a } = setup();
    withGame(f.g, () => {
      expect(hpLost(foe, () => bend({ add: 10 }, () => harm(f.cb, f.g.rng, a, foe, 76.9, 'soul')))).toBe(86);
      expect(hpLost(foe, () => bend({ add: 10, mults: [1.5] }, () => harm(f.cb, f.g.rng, a, foe, 76.9, 'soul')))).toBe(Math.floor((76 + 10) * 1.5));
    });
  });
  it('a rider\'s own flat amount (a tone\'s bonus damage) rides after the spell\'s multipliers and before the item\'s', () => {
    const a = openAmount({ kind: 'damage', base: 40, plus: 10 }, null, { mults: [term(1.5, 'stat'), term(1.2, 'stage')] });
    expect(closeAmount(a).raw).toBe(40 * 1.5 * 1.2 + 10);
    a.add = 5; a.mults.push(term(2, 'item')); a.vs.push(term(0.5, 'vs'));
    expect(closeAmount(a).raw).toBe(((40 + 5) * 1.5 * 1.2 + 10) * 2 * 1.5);
    expect(closeAmount(openAmount({ kind: 'damage', base: 40, plus: 10 }, null, {})).raw).toBe(50);
  });
});

describe('a7 (4): a blast, a splash, a trap and a thrown item fire damage_out when someone made them; an item speaks about them only if its data says so (spec item 1441)', () => {
  it('the hook fires with the maker, marked as a blast of its kind; with nobody behind it (a hazard, a map trap) it does not', () => {
    const { f, foe, a } = setup();
    withGame(f.g, () => {
      for (const why of ['explosion', 'trap', 'thrown']) { bend({}, () => hurtUnit(foe, 40, false, f.cb, why, a)); expect(BEND.seen).toEqual([{ mode: 'blast', type: why, base: 40, mults: [], spell: false, blast: true }]); }
      bend({}, () => hurtUnit(foe, 40, false, f.cb, 'explosion', null)); expect(BEND.seen).toEqual([]);
      bend({}, () => hurtUnit(foe, 40, false, f.cb, 'hazard', a)); expect(BEND.seen).toEqual([]);
      bend({}, () => hurtUnit(foe, 40, true, f.cb, 'weapon', a)); expect(BEND.seen).toEqual([]); // a derived weapon hit (the carried round): its attack already spoke
    });
  });
  it('Demolitionist (+30% explosive damage) already reached an explosion credited to it, at the sink: it is not tagged, and not doubled', () => {
    const f = fightWith([{ traits: ['demolitionist'] }, {}], [{ tier: 'soldier', at: 'F6', classic: true }]), foe = f.foe, [a, b] = f.pcs; foe.maxHp = 5000; foe.armour = 0; foe.shield = 0;
    withGame(f.g, () => {
      expect(hpLost(foe, () => hurtUnit(foe, 40, false, f.cb, 'explosion', a))).toBe(52); // as before a7 (perks/c.ts: its own damage_in)
      expect(hpLost(foe, () => hurtUnit(foe, 40, false, f.cb, 'explosion', b))).toBe(40); // somebody else's grenade
      expect(hpLost(foe, () => hurtUnit(foe, 40, false, f.cb, 'trap', a))).toBe(40);
      expect(hpLost(foe, () => hurtUnit(foe, 40, false, f.cb, 'thrown', a))).toBe(40);
      expect(hpLost(foe, () => hurtUnit(foe, 40, false, f.cb, 'explosion', null))).toBe(40);
    });
  });
  it('the items whose text says ALL the damage you deal are tagged `blast`: Pain Eater while Bloodied, Humanity First against a non-human', () => {
    const f = fightWith([{ traits: ['pain_eater', 'humanity_first'] }, {}], [{ tier: 'soldier', at: 'F6', classic: true }]), foe = f.foe, [a] = f.pcs; foe.maxHp = 5000; foe.armour = 0; foe.shield = 0;
    withGame(f.g, () => {
      a.hp = a.maxHp; expect(hpLost(foe, () => hurtUnit(foe, 40, false, f.cb, 'thrown', a))).toBe(40);
      a.hp = Math.floor(a.maxHp / 2) - 1; expect(hpLost(foe, () => hurtUnit(foe, 40, false, f.cb, 'thrown', a))).toBe(60); // Bloodied: ×1.5
      foe.kind = 'robot'; expect(hpLost(foe, () => hurtUnit(foe, 40, false, f.cb, 'explosion', a))).toBe(Math.floor(40 * 1.5 * 1.15)); // and +15% against a non-human
    });
  });
  it('an item that does not say so keeps meaning weapon attacks and spells: nothing moved by itself', () => {
    // Raised by Orks (+20% melee damage, the generic damage_mod op), Southern Fist, Ghost Soldier, Moon Hunter, Augmented: none tagged
    const f = fightWith([{ traits: ['raised_by_orks', 'southern_fist', 'ghost_soldier', 'moon_hunter', 'augmented'] }, {}], [{ tier: 'soldier', at: 'F6', classic: true }]), foe = f.foe, [a] = f.pcs; foe.maxHp = 5000; foe.armour = 0; foe.shield = 0;
    a.hidden = true;
    withGame(f.g, () => { for (const why of ['explosion', 'trap', 'thrown']) expect(hpLost(foe, () => hurtUnit(foe, 40, false, f.cb, why, a))).toBe(40); });
  });
});

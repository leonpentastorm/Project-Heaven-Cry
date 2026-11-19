// Rules 1.70 (0.32 step 1): the six approved primitives, each through the reducer (a real turn start, a real action, a
// real enemy blow through resolveAttack). The listeners are fixture relics (data rows with a `say`), held by the unit.
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { fluxMaxOf, resolveAttack, type Unit } from '../src';
import { addItems, clearAddedItems } from '../src/effects/hooks';
import { RESOURCES, resLimitOf } from '../src/effects/cost';
import { fightWith, withGame } from './helpers/perkfight';

const RELICS = [
  { id: 'test_flux_up', name: 'Flux up (test)', text: 'At your turn start: +1 Flux; then a line if your Flux is at its limit.',
    effects: [{ op: 'resource', when: 'turn_start', resource: 'flux', value: 1 }, { op: 'use', when: 'turn_start', if: { self_res: { flux: { at: 'limit' } } }, say: 'TEST FLUX AT LIMIT: {self}' }] },
  { id: 'test_strain_limit', name: 'Strain at its limit (test)', text: 'At your turn start: a line if your Strain is at its limit.',
    effects: [{ op: 'use', when: 'turn_start', if: { self_res: { strain: { at: 'limit' } } }, say: 'TEST STRAIN AT LIMIT: {self}' }] },
];
beforeAll(() => addItems('relic', RELICS));
afterAll(() => clearAddedItems());

const lines = (f: any, tag: string) => f.cb.log.filter((l: string) => l.startsWith(tag));
function caster(relics: string[]) {
  const f = fightWith([{ name: 'Caster', archetype: 'stormcaller', kit: 'soul', relics }], [{ tier: 'minion' }]);
  for (const e of f.foes) e.hp = e.maxHp = 99999;
  return f;
}

describe('P1: Flux is a resource row (rules 1.70 item 5542)', () => {
  it('is a row of data/actions.json resources with its setter', () => {
    expect(RESOURCES.flux).toMatchObject({ path: 'mg.flux', setter: 'flux' });
  });
  it('an item\'s resource op raises Flux through the one Flux function: past the limit the Evoker overloads', () => {
    const f = caster(['test_flux_up']);
    const max = withGame(f.g, () => fluxMaxOf(f.pc, f.cb));
    f.unit(f.pc.id).mg!.flux = max - 3;
    f.turn(f.pc);
    expect(f.unit(f.pc.id).mg!.flux).toBe(max - 2);
    f.unit(f.pc.id).mg!.flux = max;
    f.turn(f.pc);
    expect(f.unit(f.pc.id).mg!.flux).toBe(0); // the overload empties it
    expect(f.cb.log.some((l: string) => /OVERLOAD/.test(l))).toBe(true);
  });
});

describe('P2: the resource predicate\'s at: "limit" (rules 1.70 item 5543)', () => {
  it('Flux: true at its limit, false under it', () => {
    const f = caster(['test_flux_up']);
    const max = withGame(f.g, () => fluxMaxOf(f.pc, f.cb));
    expect(withGame(f.g, () => resLimitOf(f.pc, 'flux'))).toBe(max);
    f.unit(f.pc.id).mg!.flux = max - 2; f.turn(f.pc);
    expect(lines(f, 'TEST FLUX AT LIMIT')).toEqual([]);
    f.unit(f.pc.id).mg!.flux = max - 1; f.turn(f.pc);
    expect(lines(f, 'TEST FLUX AT LIMIT')).toEqual(['TEST FLUX AT LIMIT: Caster']);
  });
  it('Strain: true at or over the heart\'s limit, false under it', () => {
    const f = caster(['test_strain_limit']);
    const u = (): Unit => f.unit(f.pc.id), lim = u().mg!.strainLimit;
    expect(resLimitOf(u(), 'strain')).toBe(lim);
    // (a turn's start calms the heart by 1 before turn_start: the Strain read is the one after it)
    u().mg!.strain = lim; f.turn(f.pc);
    expect(u().mg!.strain).toBe(lim - 1);
    expect(lines(f, 'TEST STRAIN AT LIMIT')).toEqual([]);
    u().mg!.strain = lim + 1; f.turn(f.pc);
    expect(u().mg!.strain).toBe(lim);
    expect(lines(f, 'TEST STRAIN AT LIMIT')).toHaveLength(1);
    u().mg!.strain = lim + 2; f.turn(f.pc);
    expect(lines(f, 'TEST STRAIN AT LIMIT')).toHaveLength(2); // over it holds too
  });
});

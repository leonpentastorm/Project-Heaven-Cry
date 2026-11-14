// Rules 1.54 (survival-spec section 14, rows R6 to R13): the sheet in a run, materials, making, loot and the shop's
// stock, every case through the one reducer. Numbers are read from data.
import { describe, expect, it } from 'vitest';
import { type GameState, apply, RuleError, packOf } from '../src';
import { survivalRoom, startRun } from './helpers/survival';
import type { Pc } from './helpers/replay';

const DUO: Pc[] = [{ build: 'plain_gun', level: 1 }, { build: 'sigil', level: 1 }];
const refused = (g: GameState, a: any, by = 'host') => { try { apply(g, a, by); } catch (e) { expect(e).toBeInstanceOf(RuleError); return (e as Error).message; } throw new Error('expected a refusal: ' + a.type); };
const started = (pcs: Pc[] = DUO, seed = 'PHC-0001') => startRun(survivalRoom(seed, pcs, { test: true }), seed);

describe('rules 1.54 item 1: the sheet in a run (R6)', () => {
  it('the host\'s rest is refused in a run (RUN_REFUSED named rest/, the type is rest)', () => {
    const g = started();
    expect(g.run!.state).toBe('map');
    expect(refused(g, { type: 'rest', kind: 'long' })).toMatch(/Survival run/);
    expect(refused(g, { type: 'rest', kind: 'short' })).toMatch(/Survival run/);
  });

  it('every gear/* action is refused at the camp, in words naming the character', () => {
    const g = apply(survivalRoom('PHC-0001', DUO), { type: 'run/start', seed: 'PHC-0001' } as any, 'host');
    expect(g.run!.state).toBe('loadout');
    const name = g.characters.c1.name;
    for (const a of [{ type: 'gear/load', charId: 'c1' }, { type: 'gear/equip', charId: 'c1', idx: 0, to: 'main' }, { type: 'gear/unequip', charId: 'c1', slot: 'main' }, { type: 'gear/give', charId: 'c1', to: 'c2', credits: 1 }])
      expect(refused(g, a)).toBe('At the camp, change ' + name + '\'s gear in the loadout.');
    // out of the camp the same action is the gear's own business again
    const m = started();
    expect(packOf(m.characters.c1).length).toBeGreaterThan(0);
    expect(refused(m, { type: 'gear/load', charId: 'c1' })).not.toMatch(/At the camp/);
  });
});

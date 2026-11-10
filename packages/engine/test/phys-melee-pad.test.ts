// Physical 2.0 (rules 1.12), melee: every one of the 27 melee techniques has a handler, and no pad shows one as
// "Not built yet" (the Attack tab's pad for the weapon in hand, and the pack pad for Draw Cut).
import { describe, it, expect } from 'vitest';
import { phys, packOf } from '../src';
import { physFight } from './helpers/physfight';

const MELEE = phys.TECHNIQUES.filter((d) => d.system === 'melee').map((d) => d.id);
/** The 23 the melee lane built (the lead's references are Lunge, Cut, Coup and Riposte). */
const BUILT_HERE = ['charge', 'feint', 'draw_cut', 'ambush', 'sweep', 'bash', 'sunder', 'flurry', 'hamstring', 'bind', 'half_sword', 'throw',
  'sidestep', 'guard', 'shove', 'trip', 'drag', 'cleave', 'break', 'run_through', 'throw_down', 'parry', 'keep_back'];

describe('the melee pad', () => {
  it('there are 28 melee techniques and each has a handler', () => {
    expect(MELEE.length).toBe(28);
    for (const id of BUILT_HERE) expect(MELEE, id).toContain(id);
    for (const id of MELEE) expect(phys.handlerOf(id), id).not.toBeNull();
  });
  for (const weapon of ['sabre', 'maul', 'lance', 'fists', 'war_axe', 'combat_knife']) it('with ' + weapon + ' and every melee technique known, no entry is "not built"', () => {
    const f = physFight([{ weapon, known: MELEE }], [{ at: 'D5' }]); f.put(f.pc, 'C5'); f.turn(f.pc);
    const c = f.char(f.pc); c.pack = [...packOf(c), { id: 'sabre', name: 'sabre', qty: 1, kind: 'weapon' as const, weapon: 'sabre' }];
    const entries = [...f.pad().flatMap((g) => g.entries), ...f.bound(() => phys.packPad(f.cb, f.pc)).flatMap((b) => b.entries)];
    expect(entries.length).toBeGreaterThan(0);
    for (const e of entries) { expect(e.built, e.id).toBe(true); expect(e.why, e.id).not.toBe(phys.NOT_BUILT); }
  });
  it('across those weapons the pads list all 27', () => {
    const seen = new Set<string>();
    for (const weapon of ['sabre', 'maul', 'lance', 'fists', 'war_axe', 'combat_knife', 'kemizuchi_duelling_blade', 'ork_machete', 'knuckledusters', 'throwing_knives', 'glaive']) {
      const f = physFight([{ weapon, known: MELEE }], [{ at: 'D5' }]); f.put(f.pc, 'C5'); f.turn(f.pc);
      const c = f.char(f.pc); c.pack = [...packOf(c), { id: 'sabre', name: 'sabre', qty: 1, kind: 'weapon' as const, weapon: 'sabre' }];
      for (const e of [...f.pad().flatMap((g) => g.entries), ...f.bound(() => phys.packPad(f.cb, f.pc)).flatMap((b) => b.entries)]) seen.add(e.id);
    }
    expect(MELEE.filter((id) => !seen.has(id))).toEqual([]);
  });
});

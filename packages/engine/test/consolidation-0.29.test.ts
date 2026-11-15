// The 0.29 consolidation review's must-fix items (docs/design/proposals/2026-11-consolidation-0.29.md), each through
// the reducer with real actions: a fight started by the Narrator's turn, gear fitted by gear/mod and run/fit_mod.
import { describe, it, expect } from 'vitest';
import { A, pcs } from './golden/harness';
import { modRoom, modFight } from './golden/mods';

describe('M2: one magazine size in every path', () => {
  it('an off-hand gun with an extended magazine starts a fight with the extended magazine', () => {
    const size = A.magazineSize('service_pistol', ['mod_extended_mag'])!;
    expect(size).toBeGreaterThan(A.WEAPON.service_pistol.magazine!);
    const g = modFight({ weapon: 'service_pistol', prep: (x) => { x.characters.c1.offHand = { id: 'service_pistol', loaded: size, mods: ['mod_extended_mag'] }; } });
    expect(pcs(g)[0].offAmmo).toBe(size);
  });
});

describe('M3: one reader of the modifiers on a held instance, with the two-hander rule', () => {
  const flux = (weapon: string) => { const g = modFight({ weapon, prep: (x) => { x.characters.c1.offHand = { id: 'evoker.deep_well' }; } }); return A.fluxMaxOf(pcs(g)[0], g.combat) - A.FLUX_MAX; };
  it('an off-hand focus variant answers its stat beside a one-handed weapon', () => { expect(flux('service_pistol')).toBeGreaterThan(0); });
  it('a two-handed weapon fills both hands: the off-hand variant\'s stat does not answer (as with_this says)', () => { expect(flux('lever_carbine')).toBe(0); });
});

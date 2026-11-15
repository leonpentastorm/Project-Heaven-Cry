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

describe('ruling iii: the reload AP out of a fight is the one cost site with the mods\' item ops, as in a fight', () => {
  it('a quick-release magazine reads 1 AP with no fight at hand, the same as the fight charges', () => {
    const g = modRoom({ weapon: 'hellraiser_service_rifle', mods: ['mod_quick_release'] });
    const unit = { weapon: 'hellraiser_service_rifle', mods: ['mod_quick_release'], charId: 'c1' } as any;
    const f = modFight({ weapon: 'hellraiser_service_rifle', mods: ['mod_quick_release'] });
    const inFight = A.withGame(f, () => A.reloadAp(pcs(f)[0], f.combat));
    expect(inFight).toBe(1);
    expect(A.withGame(g, () => A.reloadAp(unit))).toBe(inFight);
    const bare = modRoom({ weapon: 'hellraiser_service_rifle' });
    expect(A.withGame(bare, () => A.reloadAp({ ...unit, mods: [] }))).toBe(A.WEAPON.hellraiser_service_rifle.reload_ap ?? A.costOf('reload'));
  });
});

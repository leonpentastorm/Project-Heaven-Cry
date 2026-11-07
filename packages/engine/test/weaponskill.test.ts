// Weapon skills that are actions (Fan the Hammer and the like): a volley never rolls a shot the engine would refuse,
// and the action only takes a living target that isn't the shooter.
import { describe, expect, it } from 'vitest';
import { ARCHETYPES, type Sheet, type GameState, newCharacter, newGame, apply, active, startCombat, useWeaponSkill, RuleError, resolveAttack, fireAuto, fireBurst } from '../src';

const sheetFrom = (archId: string, name = 'Test'): Sheet => {
  const a = ARCHETYPES.find((x) => x.id === archId)!;
  return { name, portrait: '', origin: 'Thousand-Planet frontier', kit: 'medic', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} };
};
const fight = () => {
  const c = newCharacter('c1', 'p1', sheetFrom(ARCHETYPES[0].id));
  const cb = startCombat('t', 'yard', [{ c, pos: '1,5' }], [{ name: 'E', tier: 'boss', weapon: 'service_pistol', at: 'D5' }], 'easy', { state: 4 }, []);
  const u = cb.units.find((x) => x.side === 'pc')!, e = cb.units.find((x) => x.side === 'foe')!;
  u.weapon = 'drifter_revolver'; u.ammo = 6; u.ap = 9; e.hp = e.maxHp = 999;
  return { c, cb, u, e };
};

describe('Fan the Hammer', () => {
  it('fires up to three shots at −2, one round each', () => {
    const { c, cb, u, e } = fight(); const n0 = cb.log.length;
    expect(useWeaponSkill(cb, { state: 9 }, u, e, c)).toBeNull();
    const shots = cb.log.slice(n0).filter((l) => / fires at /.test(l));
    expect(shots.length).toBeGreaterThan(0); expect(shots.length).toBeLessThanOrEqual(3);
    expect(u.ap).toBe(6); expect(u.ammo).toBe(6 - shots.length);
    expect(cb.log.slice(n0).some((l) => /NaN|undefined/.test(l))).toBe(false);
  });
  it('stops the volley when the next shot can no longer be taken (here: the gun breaks), never rolling it', () => {
    const { c, cb, u, e } = fight(); u.maxDur = 300; u.dur = 1; const n0 = cb.log.length;
    expect(useWeaponSkill(cb, { state: 9 }, u, e, c)).toBeNull();
    const lines = cb.log.slice(n0);
    expect(lines.filter((l) => / fires at /.test(l)).length).toBe(1);
    expect(lines.some((l) => /Fan the Hammer stops: Broken/.test(l))).toBe(true);
    expect(u.ammo).toBe(5);
  });
  it('refuses yourself or the dead as its target', () => {
    let g: GameState = newGame('ROOM', { id: 'host', name: 'Leon' }, 'fan');
    g = apply(g, { type: 'char/add', sheet: sheetFrom(ARCHETYPES[0].id, 'MPAT') }, 'host');
    g = apply(g, { type: 'session/start' }, 'host');
    const id = Object.keys(g.characters)[0]; (g.characters[id] as any).weapon = 'drifter_revolver';
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'Guns.', combat: { name: 'Pad', difficulty: 'easy', enemies: [{ name: 'Engineer', tier: 'minion', weapon: 'service_pistol' }] } } } as any, 'host');
    const u = active(g.combat!)!;
    expect(u.side).toBe('pc'); // enemies act until a PC is up
    expect(() => apply(g, { type: 'combat/skill', unitId: u.id, targetId: u.id }, 'host')).toThrow(RuleError);
    const foe = g.combat!.units.find((x) => x.side === 'foe')!; foe.dead = true;
    expect(() => apply(g, { type: 'combat/skill', unitId: u.id, targetId: foe.id }, 'host')).toThrow(RuleError);
  });
});

// The root cause behind the Fan the Hammer crash: resolveAttack must never roll against a refused preview (which
// carries need 0, so any roll but a 1 would 'hit'). Full auto and burst both rely on it.
describe('refused shots are never rolled', () => {
  const line = (seed: number) => {
    const c = newCharacter('c1', 'p1', sheetFrom(ARCHETYPES[0].id));
    const cb = startCombat('t', 'yard', [{ c, pos: '1,5' }], [
      { name: 'A', tier: 'boss', weapon: 'fists', at: 'D5' }, { name: 'B', tier: 'boss', weapon: 'fists', at: 'E5' }, { name: 'C', tier: 'boss', weapon: 'fists', at: 'F5' },
    ], 'easy', { state: seed }, []);
    const u = cb.units.find((x) => x.side === 'pc')!, foes = cb.units.filter((x) => x.side === 'foe');
    u.weapon = 'decrkm_smg'; u.ap = 9; u.jammed = false; u.maxDur = 0;
    for (const f of foes) { f.hp = f.maxHp = 999; f.def = 60; f.pos = f.name === 'A' ? '3,5' : f.name === 'B' ? '4,5' : '5,5'; }
    return { c, cb, u, foes };
  };
  it('resolveAttack refuses a shot the preview refuses, spending nothing', () => {
    const { c, cb, u, foes } = line(3); u.ammo = 0; const ap = u.ap, n0 = cb.log.length;
    const r = resolveAttack(cb, { state: 5 }, u, foes[0], 'shot', c, { noAp: true });
    expect(r.refused).toMatch(/Empty/); expect(r.hit).toBe(false); expect(u.ap).toBe(ap); expect(u.ammo).toBe(0);
    expect(cb.log.slice(n0).some((l) => / fires at /.test(l))).toBe(false);
  });
  it('full auto with one round left never lands follow-up shots on def 60', () => {
    let followUps = 0, hits = 0;
    for (let seed = 1; seed < 40; seed++) {
      const { c, cb, u, foes } = line(seed); u.ammo = 1; const n0 = cb.log.length;
      expect(fireAuto(cb, { state: seed * 7 }, u, foes[0], c)).toBeNull();
      const shots = cb.log.slice(n0).filter((l) => / fires at /.test(l));
      expect(shots.length).toBeLessThanOrEqual(1);
      followUps += Math.max(0, shots.length - 1);
      hits += shots.filter((l) => /vs 0/.test(l)).length;
    }
    expect(followUps).toBe(0); expect(hits).toBe(0);
  });
  it('a burst stops when the gun breaks on its first round', () => {
    const { c, cb, u, foes } = line(2); u.ammo = 30; u.maxDur = 300; u.dur = 1; const n0 = cb.log.length;
    expect(fireBurst(cb, { state: 11 }, u, foes[0], c)).toBeNull();
    const lines = cb.log.slice(n0);
    expect(lines.filter((l) => / fires at /.test(l)).length).toBe(1);
    expect(lines.some((l) => /vs 0/.test(l))).toBe(false);
  });
});

// Fan the Hammer when its target dies part-way through the volley, and when that death ends the fight. These were
// the browser suite feel.mjs's two engine checks ("a target died mid-volley (the rest of the volley stopped)", "the
// last volley cleared the wave"); the suite was retired (apps/web/e2e/README.md, "Retired") and they live here, where
// they need no browser. A crash here once took the whole page down mid-fight (see weaponskill.test.ts).
import { describe, expect, it } from 'vitest';
import './helpers/yard16'; // the 16 × 11 practice square these tests name tiles on
import { ARCHETYPES, type Sheet, newCharacter, startCombat, useWeaponSkill } from '../src';

const sheetFrom = (archId: string, name = 'Test'): Sheet => {
  const a = ARCHETYPES.find((x) => x.id === archId)!;
  return { name, portrait: '', origin: 'Thousand-Planet frontier', kit: 'medic', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} };
};
/** A revolver with six rounds, and one hostile three tiles away with a single point of HP: the first hit kills it. */
const fight = (seed: number) => {
  const c = newCharacter('c1', 'p1', sheetFrom(ARCHETYPES[0].id));
  const cb = startCombat('t', 'yard16', [{ c, pos: '1,5' }], [{ name: 'E', tier: 'minion', weapon: 'service_pistol', at: 'D5' }], 'easy', { state: seed }, []);
  const u = cb.units.find((x) => x.side === 'pc')!, e = cb.units.find((x) => x.side === 'foe')!;
  u.weapon = 'drifter_revolver'; u.ammo = 6; u.ap = 9; u.jammed = false; u.maxDur = 0;
  e.hp = e.maxHp = 1; e.armour = 0;
  return { c, cb, u, e };
};

describe('Fan the Hammer on a target that dies mid-volley', () => {
  it('stops at the shot that kills: nothing is fired at the dead, the rounds not fired stay in the gun, the log stays clean', () => {
    let early = 0, kills = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const { c, cb, u, e } = fight(seed); const n0 = cb.log.length, f0 = (cb.fx || []).length;
      expect(useWeaponSkill(cb, { state: seed * 7 }, u, e, c)).toBeNull();
      const lines = cb.log.slice(n0), fired = lines.filter((l) => / fires at /.test(l)).length;
      const shots = (cb.fx || []).slice(f0).filter((x: any) => x.k === 'shot');
      expect(lines.some((l) => /NaN|undefined/.test(l)), 'seed ' + seed).toBe(false);
      expect(fired, 'seed ' + seed).toBeGreaterThan(0);
      expect(fired, 'seed ' + seed).toBeLessThanOrEqual(3);
      expect(u.ammo, 'seed ' + seed + ': one round a shot fired').toBe(6 - fired);
      if (!e.dead) continue;
      kills++;
      // the killing shot is the last one fired
      const killedAt = shots.findIndex((x: any) => x.killed);
      expect(killedAt, 'seed ' + seed + ': the kill is a shot of this volley').toBeGreaterThanOrEqual(0);
      expect(killedAt, 'seed ' + seed + ': no shot after the kill').toBe(shots.length - 1);
      if (shots.length < 3) early++;
    }
    expect(kills).toBeGreaterThan(10);
    expect(early, 'some volleys ended before the third shot because the target was dead').toBeGreaterThan(0);
  });
  it('the volley that kills the last hostile ends the fight, with nothing thrown and nothing rolled afterwards', () => {
    let ended = 0;
    for (let seed = 1; seed <= 60 && ended < 5; seed++) {
      const { c, cb, u, e } = fight(seed);
      expect(() => useWeaponSkill(cb, { state: seed * 7 }, u, e, c)).not.toThrow();
      if (!e.dead) continue;
      ended++;
      expect(cb.units.filter((x) => x.side === 'foe' && !x.dead).length).toBe(0);
      // a second volley at the dead is refused in words, never rolled
      const n1 = cb.log.length; u.ap = 9;
      const again = useWeaponSkill(cb, { state: 3 }, u, e, c);
      expect(cb.log.slice(n1).filter((l) => / fires at /.test(l)).length).toBe(0);
      expect(again === null || typeof again === 'string').toBe(true);
    }
    expect(ended).toBe(5);
  });
});

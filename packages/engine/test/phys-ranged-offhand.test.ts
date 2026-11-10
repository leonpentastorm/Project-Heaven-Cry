// Physical 2.0 (rules 1.12), the ranged techniques from the off hand (hand: 'off'): each one fires the off-hand
// weapon, spends that hand's rounds (the count its preview showed) and leaves the main hand's magazine alone.
import { describe, it, expect, beforeEach } from 'vitest';
import { physFight, rig } from './helpers/physfight';
import { offHand, calm, type PhysF as F } from './helpers/physfight-ranged';

const OFF = 'decrkm_autopistol'; // Quick, Auto, 20 rounds
const IDS = ['shot', 'aimed_shot', 'burst', 'called_shot', 'punch_through', 'rake', 'mag_dump', 'warning_shot', 'suppress', 'dead_centre', 'pin_down', 'stopping_shot', 'last_round'];
const TAKES = ['dead_centre', 'pin_down', 'stopping_shot', 'last_round'];
function fight(): F {
  const f = physFight([{ weapon: 'service_pistol', known: IDS, skills: { dexterity: 6 } }], [{ at: 'H5', tier: 'elite' }]);
  f.put(f.pc, 'C5'); f.put(f.foe, 'H5'); calm(f); offHand(f, OFF); f.turn(f.pc);
  return f;
}
const args = (f: F, id: string) => ({ hand: 'off' as const, targetId: f.foe.id, ...(id === 'called_shot' ? { opt: 'leg' } : {}) });
beforeEach(() => rig(null));

describe('ranged techniques from the off hand', () => {
  for (const id of IDS) {
    it(id + ': spends the off hand\'s rounds as its preview said, and none of the main hand\'s', () => {
      const f = fight(); if (TAKES.includes(id)) f.press(f.foe, 3, f.pc);
      if (id === 'last_round') f.unit(f.pc.id).offAmmo = 1;
      rig({ hit: false, die: 5 }); // a miss: nobody falls, every roll of a volley is made
      const pv = f.pv(id, args(f, id)); expect(pv.ok, id + ': ' + pv.why).toBe(true);
      const off0 = f.unit(f.pc.id).offAmmo!, main0 = f.unit(f.pc.id).ammo, ap0 = f.unit(f.pc.id).ap;
      expect(f.tech(id, args(f, id))).toBeNull();
      const u = f.unit(f.pc.id);
      expect(u.ammo, id + ': the main hand').toBe(main0);
      expect(off0 - u.offAmmo!, id + ': rounds').toBe(id === 'mag_dump' ? off0 : pv.rounds);
      expect(ap0 - u.ap, id + ': AP').toBe(pv.ap);
      expect(u.weapon).toBe('service_pistol'); expect(u.offWeapon).toBe(OFF);
    });
  }
});

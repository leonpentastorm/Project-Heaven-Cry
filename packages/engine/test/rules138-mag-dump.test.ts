// Rules 1.38 (Classes 3.0 step 11; Leon, 13 Nov 2026: "a weapon with 200 rounds loses them all, fires four shots,
// stops"): Mag Dump spends rounds_per_roll rounds a roll, so rounds_per_roll × max_rolls at most, never the whole
// magazine; with fewer left it spends what is left, one roll for every rounds_per_roll rounds or part. The rolls, the
// growing penalty, the AP, the Heat and the Pressure stay as rules 1.18. Every number is read from data.
import { describe, it, expect, beforeEach } from 'vitest';
import { TECHNIQUE, techniquePad } from '../src';
import { fxTaps } from '../src/fxtap';
import { physFight, rig } from './helpers/physfight';
import { calm, type PhysF as F } from './helpers/physfight-ranged';

const N = TECHNIQUE.mag_dump.numbers as Record<string, number>;
const CAP = N.rounds_per_roll * N.max_rolls;
const EV: any[] = [];
fxTaps.push((_cb, ev) => { EV.push(ev); });
beforeEach(() => { rig(null); EV.length = 0; });

function gunner(weapon: string, ammo: number): F {
  const f = physFight([{ weapon, known: ['mag_dump'], skills: { dexterity: 6 } }], [{ at: 'G5', tier: 'elite' }]);
  f.put(f.pc, 'C5'); f.put(f.foe, 'G5'); calm(f);
  f.unit(f.foe.id).hp = 99999; f.unit(f.foe.id).maxHp = 99999;
  f.turn(f.pc); f.pc.heat = 0; f.pc.ammo = ammo; EV.length = 0;
  return f;
}
const shots = (f: F) => EV.filter((e) => e.k === 'shot' && e.unit === f.pc.id).length;
const volley = (f: F) => EV.find((e) => e.k === 'volley' && e.unit === f.pc.id);

describe('rules 1.38: Mag Dump spends rounds_per_roll a roll, never the whole magazine', () => {
  it('the numbers are in data: rounds "up_to", rounds_per_roll and max_rolls', () => {
    expect(TECHNIQUE.mag_dump.rounds).toBe('up_to');
    expect(N.rounds_per_roll).toBeGreaterThan(0);
    expect(N.max_rolls).toBeGreaterThan(0);
  });
  it('a big magazine loses only the cap, and fires max_rolls rolls', () => {
    const f = gunner('hellraiser_service_rifle', CAP * 2); rig({ hit: false, die: 5 });
    expect(f.tech('mag_dump', { targetId: f.foe.id })).toBeNull();
    expect(f.pc.ammo).toBe(CAP);
    expect(shots(f)).toBe(N.max_rolls);
    expect(volley(f)).toMatchObject({ mode: 'dump', shots: CAP, rolls: N.max_rolls }); // casings = rounds spent
  });
  it('fewer than the cap left: one roll for every rounds_per_roll or part, and the magazine is empty', () => {
    const left = N.rounds_per_roll + 2; // a revolver's six: two rolls
    const f = gunner('hellraiser_service_rifle', left); rig({ hit: false, die: 5 });
    expect(f.tech('mag_dump', { targetId: f.foe.id })).toBeNull();
    expect(f.pc.ammo).toBe(0);
    expect(shots(f)).toBe(Math.ceil(left / N.rounds_per_roll));
    expect(volley(f)).toMatchObject({ shots: left });
  });
  it('one round left: one roll, needs only that round', () => {
    const f = gunner('hellraiser_service_rifle', 1); rig({ hit: false, die: 5 });
    expect(f.tech('mag_dump', { targetId: f.foe.id })).toBeNull();
    expect(f.pc.ammo).toBe(0); expect(shots(f)).toBe(1);
  });
  it('the card says up to the cap', () => {
    const f = gunner('drifter_revolver', 6); // the revolver lends it, so its pad shows it
    const e = techniquePad(f.cb, f.pc, 'main').flatMap((g) => g.entries).find((x) => x.id === 'mag_dump') as any;
    expect(e).toMatchObject({ rounds: CAP, upTo: true });
  });
});

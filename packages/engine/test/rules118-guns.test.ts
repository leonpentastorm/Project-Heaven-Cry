// Rules revision 1.18 (balance pass, the guns step): the guns' ceiling. What the spec section says, pinned on the
// engine: a character's Burst is three rounds and two rolls (the second at −4; Quick −3; a braced Heavy weapon −1), 2 Heat
// as before; an enemy's Burst is the one its table was fitted with; Mag Dump is three rolls at most, each −4 more; the
// long rifle's bolt (Shot 3 AP, Aimed Shot 4 AP, +1 AP on every technique that fires it); the weapon numbers.
// The measurements are test/balance/guns-measure.test.ts; the report is docs/design/handoffs/damage-step-guns.md.
import { describe, expect, it } from 'vitest';
import './helpers/yard16';
import { WEAPON, TECHNIQUE, attackApCost, cycleAp, burstRolls, burstCool, techniqueAp, previewAttack, previewTechnique, type Unit } from '../src';
import { fightWith, type CharSpec } from './helpers/perkfight';

type F = ReturnType<typeof fightWith>;
const at = (f: F, u: Unit, pos: string) => { f.unit(u.id).pos = pos; };
const gun = (weapon: string, extra: CharSpec = {}): CharSpec => ({ weapon, level: 5, skills: { dexterity: 4 }, ...extra });
/** A fight with the shooter on its turn, 4 tiles from a target that can't be put down by what follows. */
function range(weapon: string, extra: CharSpec = {}) {
  const f = fightWith([gun(weapon, extra)], [{}]); const u = f.turn(f.pc);
  at(f, u, '2,2'); at(f, f.foe, '6,2'); const t = f.unit(f.foe.id); t.hp = 9999; t.maxHp = 9999; f.unit(u.id).attack = 60;
  return { f, u: f.unit(u.id), t };
}
const shots = (f: F, from: number) => f.cb.log.slice(from).filter((l) => / fires at | shoots /.test(l) && /d20/.test(l));

describe('rules 1.18: the Burst', () => {
  it('the data: two rolls, the second at −4 (Quick −3, Heavy and braced −1); an enemy keeps three rolls at −1 each', () => {
    const n: any = TECHNIQUE.burst.numbers;
    expect(n).toMatchObject({ rolls: 2, later_penalty: 4, quick_penalty: 3, heavy_penalty: 1, auto_heat_cool: 0, enemy_rolls: 3, enemy_step: 1, enemy_heat_cool: 1 });
    expect(TECHNIQUE.burst.rounds).toBe(3); expect((TECHNIQUE.burst.ap as any).value).toBe(3);
  });
  it('a character with an automatic rifle: two rolls (0, −4), three rounds gone, 2 Heat (one a roll)', () => {
    const { f, u, t } = range('hellraiser_service_rifle');
    expect(burstRolls(u, WEAPON.hellraiser_service_rifle)).toEqual([0, -4]);
    const ammo = u.ammo, heat = u.heat, n0 = f.cb.log.length, ap = u.ap;
    f.act({ unitId: u.id, type: 'combat/technique', id: 'burst', targetId: t.id });
    const v = f.unit(u.id);
    expect(shots(f, n0).length).toBe(2);
    expect(ammo - v.ammo).toBe(3); expect(v.heat - heat).toBe(2); expect(ap - v.ap).toBe(3);
  });
  it('the plain burst action is the same Burst', () => {
    const { f, u, t } = range('hellraiser_service_rifle');
    const ammo = u.ammo, heat = u.heat, n0 = f.cb.log.length;
    f.act({ unitId: u.id, type: 'combat/attack', targetId: t.id, mode: 'burst' });
    const v = f.unit(u.id);
    expect(shots(f, n0).length).toBe(2); expect(ammo - v.ammo).toBe(3); expect(v.heat - heat).toBe(2);
  });
  it('a Quick weapon: the second roll at −3; a Heavy weapon: −4 standing, −1 braced', () => {
    const smg = range('decrkm_smg'); expect(burstRolls(smg.u, WEAPON.decrkm_smg)).toEqual([0, -3]);
    const lmg = range('hellraiser_lmg', { skills: { dexterity: 4, raw_power: 4 } });
    expect(burstRolls(lmg.u, WEAPON.hellraiser_lmg)).toEqual([0, -4]);
    lmg.u.braced = true; expect(burstRolls(lmg.u, WEAPON.hellraiser_lmg)).toEqual([0, -1]);
  });
  it('an enemy\'s Burst is the one the enemy table was fitted with: three rolls, each −1 more, and it cools 1', () => {
    const { f } = range('hellraiser_service_rifle'); const foe = f.unit(f.foe.id);
    expect(burstRolls(foe, WEAPON.hellraiser_service_rifle)).toEqual([0, -1, -2]);
    expect(burstCool(foe, true)).toBe(1); expect(burstCool(f.unit(f.pc.id), true)).toBe(0);
  });
  it('the card says so: the preview of a character\'s Burst lists two attacks', () => {
    const { f, u, t } = range('hellraiser_service_rifle');
    const pv = previewTechnique(f.cb, u, 'burst', { targetId: t.id }, f.g);
    expect(pv.ok).toBe(true); expect(pv.attacks.length).toBe(2); expect(pv.rounds).toBe(3);
    expect(pv.attacks[0].pv.toHit - pv.attacks[1].pv.toHit).toBe(4);
  });
});

describe('rules 1.18: Mag Dump and Heavy Bolt', () => {
  it('Mag Dump: three rolls at most, each −4 more than the last', () => {
    expect(TECHNIQUE.mag_dump.numbers).toMatchObject({ max_rolls: 3, step: 4, per_roll: 3, rounds_per_roll: 4 });
  });
  it('Heavy Bolt: +40% damage', () => {
    expect((TECHNIQUE.heavy_bolt.numbers as any).damage_pct).toBe(40);
    expect(TECHNIQUE.heavy_bolt.text).toMatch(/\+40% damage/);
  });
});

describe('rules 1.18: the long rifle\'s bolt', () => {
  it('a Shot costs 3 AP and an Aimed Shot 4; every other gun is as it was', () => {
    expect(cycleAp(WEAPON.long_rifle)).toBe(1);
    expect(attackApCost(WEAPON.long_rifle, 'shot')).toBe(3); expect(attackApCost(WEAPON.long_rifle, 'aimed')).toBe(4);
    for (const id of ['hellraiser_service_rifle', 'lever_carbine', 'ccec_marksman_rifle', 'blackpoint_700', 'service_pistol']) {
      expect(cycleAp(WEAPON[id]), id).toBe(0); expect(attackApCost(WEAPON[id], 'shot'), id).toBe(2); expect(attackApCost(WEAPON[id], 'aimed'), id).toBe(3);
    }
    expect(attackApCost(WEAPON.crossbow, 'shot')).toBe(3); expect(attackApCost(WEAPON.crossbow, 'aimed')).toBe(3); // the crossbow's own rule (item 955) stands
  });
  it('the weapon\'s own costs agree with its bolt (single = 2 + the bolt, aimed = 3 + the bolt)', () => {
    for (const w of Object.values(WEAPON) as any[]) if (w.cycle_ap) { expect(w.ap_cost.single, w.id).toBe(2 + w.cycle_ap); expect(w.ap_cost.aimed, w.id).toBe(3 + w.cycle_ap); }
  });
  it('every technique that fires a round costs 1 AP more with it; a Set does not', () => {
    for (const id of ['shot', 'aimed_shot', 'called_shot', 'dead_centre', 'stopping_shot', 'last_round', 'punch_through', 'crossfire', 'deny'])
      expect(techniqueAp(TECHNIQUE[id], 'long_rifle') - techniqueAp(TECHNIQUE[id], 'lever_carbine'), id).toBe(1);
    for (const id of ['bead', 'spot', 'brace', 'vent', 'shift']) expect(techniqueAp(TECHNIQUE[id], 'long_rifle'), id).toBe(techniqueAp(TECHNIQUE[id], 'lever_carbine'));
    expect(techniqueAp(TECHNIQUE.heavy_bolt, 'crossbow')).toBe(4); // not a bolt-action: no surcharge
  });
  it('in a fight: two Shots a turn, and the card shows 3 AP', () => {
    const { f, u, t } = range('long_rifle');
    expect(previewAttack(f.cb, u, t, 'shot').ap).toBe(3); expect(previewAttack(f.cb, u, t, 'aimed').ap).toBe(4);
    f.act({ unitId: u.id, type: 'combat/attack', targetId: t.id, mode: 'shot' }); expect(f.unit(u.id).ap).toBe(3);
    f.act({ unitId: u.id, type: 'combat/attack', targetId: t.id, mode: 'shot' }); expect(f.unit(u.id).ap).toBe(0);
  });
});

describe('rules 1.18: the weapon numbers', () => {
  it('the guns that were over the ceiling, and the automatic guns whose Burst lost a roll', () => {
    const d = (id: string) => (WEAPON[id] as any).damage;
    expect(d('long_rifle')).toBe(48); expect(d('adamantile_battle_rifle')).toBe(30); expect(d('ccec_marksman_rifle')).toBe(33);
    expect(d('core_rifle')).toBe(29); expect(d('blackpoint_700')).toBe(66); expect(d('frontier_hand_cannon')).toBe(38);
    expect(d('hellraiser_service_rifle')).toBe(30); expect(d('lever_carbine')).toBe(32); expect(d('legion_bullpup')).toBe(28); expect(d('hellraiser_lmg')).toBe(25); // not changed
    expect(d('decrkm_smg')).toBe(19); expect(d('legion_pdw')).toBe(20); expect(d('whisper_smg')).toBe(16); expect(d('mandestra_drum_gun')).toBe(19); expect(d('decrkm_autopistol')).toBe(17);
    expect(d('brigade_auto_shotgun')).toEqual({ within_4: 40, within_8: 24 });
  });
  it('no automatic sidearm out-hits the service pistol with a plain shot, and no rifle at 2 AP a shot is above 33', () => {
    for (const id of ['decrkm_smg', 'legion_pdw', 'whisper_smg', 'mandestra_drum_gun', 'decrkm_autopistol']) expect((WEAPON[id] as any).damage, id).toBeLessThanOrEqual((WEAPON.service_pistol as any).damage);
    for (const w of Object.values(WEAPON) as any[]) if (w.category === 'rifle' && typeof w.damage === 'number' && attackApCost(w, 'shot') === 2) expect(w.damage, w.id).toBeLessThanOrEqual(33);
  });
});

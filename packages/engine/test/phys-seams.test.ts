// Physical 2.0: where the melee lane, the ranged lane and the core meet (the pre-release review's findings).
import { describe, it, expect, beforeEach } from 'vitest';
import { applyCond, objectsOf, heatLimit, WEAPON, phys, secondWeaponWhy } from '../src';
const heatLimitOf = (u: any) => heatLimit(u, WEAPON[u.weapon]);
import { physFight, rig } from './helpers/physfight';
beforeEach(() => rig(null));
const SK = { athletics: 6, raw_power: 4, dexterity: 6 };
const saves = (f: any, u: { id: string }, n: number) => { f.unit(u.id).sv = { body: n, brain: n, heart: n } as any; };
const glaivePiles = (f: any) => objectsOf(f.cb).filter((o: any) => (o.items || []).some((i: any) => /glaive/.test(JSON.stringify(i)))).length;

describe('Physical 2.0 seams', () => {
  it('a Pin Down on a unit that holds a Run Through weapon keeps the weapon in it', () => {
    const f = physFight([{ weapon: 'glaive', known: ['run_through'], skills: SK }, { weapon: 'recurve_bow', known: ['pin_down'], skills: SK }], [{ tier: 'soldier' }], { seed: 'S1' });
    f.put(f.pcs[0], 'C5'); f.put(f.pcs[1], 'C8'); const foe = f.put(f.foe, 'D5'); foe.hp = foe.maxHp = 900; saves(f, f.foe, -50);
    f.turn(f.pcs[0]); f.momentum(f.pcs[0], 3); rig({ hit: true, die: 12 });
    expect(f.tech('run_through', { targetId: f.foe.id, line: 'reach', opt: 'leave' })).toBeNull();
    expect(f.unit(f.foe.id).nailed?.weapon).toBe('glaive');
    f.turn(f.pcs[1]); f.press(f.foe, 2, f.pcs[1]);
    expect(f.tech('pin_down', { targetId: f.foe.id })).toBeNull();
    const n = f.unit(f.foe.id).nailed;
    expect(n?.weapon === 'glaive' || glaivePiles(f) === 1).toBe(true); // still in the target, or on the ground: never gone
  });
  it('a Disarmed unit can\'t use a weapon technique with the weapon it lost (no second glaive)', () => {
    const f = physFight([{ weapon: 'glaive', known: ['run_through', 'sunder'], skills: SK }], [{ tier: 'soldier' }], { seed: 'S2' });
    f.put(f.pc, 'C5'); const foe = f.put(f.foe, 'D5'); foe.hp = foe.maxHp = 900;
    f.turn(f.pc); f.momentum(f.pc, 3); rig({ hit: true, die: 12 });
    f.bound(() => applyCond(f.cb, f.g.rng, null, f.unit(f.pc.id), 'disarmed', undefined, undefined, { skipSave: true } as any));
    const pv = f.pv('run_through', { targetId: f.foe.id, line: 'reach', opt: 'leave' });
    expect(pv.ok).toBe(false); expect(pv.why).toMatch(/Disarmed/);
    expect(f.pv('cut', { targetId: f.foe.id }).ok).toBe(true); // the plain attack still goes, with fists
  });
  it('a lowered weapon doesn\'t stop a fresh one being drawn for Snap Shot', () => {
    const f = physFight([{ weapon: 'service_pistol', known: ['draw_cut', 'snap_shot'], skills: SK }], [{ tier: 'soldier' }], { seed: 'S3' });
    f.put(f.pc, 'C5'); const foe = f.put(f.foe, 'D5'); foe.hp = foe.maxHp = 900;
    const c = f.char(f.pc); c.pack = [...(c.pack || []), { id: 'drifter_revolver', name: 'Rev', qty: 1, kind: 'weapon', weapon: 'drifter_revolver', loaded: 6 } as any];
    f.turn(f.pc); rig({ hit: true, die: 12 });
    f.bound(() => applyCond(f.cb, f.g.rng, null, f.unit(f.pc.id), 'lowered', undefined, undefined, { skipSave: true } as any));
    const ps = f.pv('snap_shot', { targetId: f.foe.id, item: c.pack.length - 1 });
    expect(ps.why || '').not.toMatch(/lowered/);
  });
  it('a nailed unit is not moved by a push', () => {
    const f = physFight([{ weapon: 'glaive', known: ['run_through'], skills: SK }, { weapon: 'maul', known: ['shove'], skills: SK }], [{ tier: 'soldier' }], { seed: 'S4' });
    f.put(f.pcs[0], 'C5'); f.put(f.pcs[1], 'D4'); const foe = f.put(f.foe, 'D5'); foe.hp = foe.maxHp = 900; saves(f, f.foe, -50);
    f.turn(f.pcs[0]); f.momentum(f.pcs[0], 3); rig({ hit: true, die: 12 });
    expect(f.tech('run_through', { targetId: f.foe.id, line: 'reach', opt: 'leave' })).toBeNull();
    f.turn(f.pcs[1]); rig({ hit: true, die: 20 });
    f.tech('shove', { targetId: f.foe.id });
    expect(f.unit(f.foe.id).pos).toBe(foe.pos); expect(f.unit(f.foe.id).nailed).toBeTruthy();
  });
});

// 0.18.1 (Leon's playtest: "they move around in place back and forth"): an enemy with nothing to attack took the best
// OTHER tile every step, so two equal tiles made it pace. Where it stands is now the tile to beat.
import { enemyTurn } from '../src';
import { withGame } from './helpers/perkfight';
describe('the enemy AI does not pace', () => {
  it('an enemy with a line on its target and 1 AP left over stays where it is (it used to shuffle to the next tile and back)', () => {
    for (const seed of ['P1', 'P2', 'P3', 'P4']) {
      const f = physFight([{ weapon: 'sabre', skills: SK }], [{ tier: 'soldier', weapon: 'service_pistol' }], { seed });
      f.put(f.pc, 'C5'); f.put(f.foe, 'H5'); f.unit(f.pc.id).hp = f.unit(f.pc.id).maxHp = 9000;
      for (let r = 0; r < 3; r++) {
        const u = f.unit(f.foe.id); u.techs = []; f.cb.turn = f.cb.order.indexOf(u.id); u.ap = 5; u.ammo = 12; const n0 = (f.cb.fx || []).length;
        withGame(f.g, () => enemyTurn(f.cb, f.g.rng));
        const moves = (f.cb.fx || []).slice(n0).filter((e: any) => e.k === 'move' && e.unit === u.id);
        expect(moves.length, seed + ' round ' + r).toBe(0);
      }
    }
  });
});

describe('rulings of 10 Nov 2026', () => {
  it('a Press\'s own +1 Heat can jam the gun', () => {
    const f = physFight([{ weapon: 'service_rifle', known: ['suppress'], skills: SK }], [{ tier: 'soldier' }], { seed: 'H1' });
    f.put(f.pc, 'C5'); const foe = f.put(f.foe, 'H5'); foe.hp = foe.maxHp = 9000;
    f.turn(f.pc); rig({ hit: true, die: 12 });
    const u = f.unit(f.pc.id), w = (phys as any), lim = 6;
    void w; u.maxDur = 100; u.dur = 100; u.ammo = WEAPON[u.weapon].magazine || 24; u.heat = Math.max(0, (heatLimitOf(u) ?? lim) - 2); // the roll's +1 and the Press's +1: exactly the limit, reached by the Press's own Heat
    expect(f.tech('suppress', { targetId: f.foe.id })).toBeNull();
    const a = f.unit(f.pc.id); expect(a.heat).toBeGreaterThanOrEqual(heatLimitOf(a)); expect(a.jammed).toBe(true);
  });
});

describe('the crossbow (0.18.1)', () => {
  it('a Shot costs 3 AP and loads the next bolt as part of it; with no bolts left it stays empty', () => {
    const f = physFight([{ weapon: 'crossbow', skills: SK }], [{ tier: 'soldier' }], { seed: 'X1' });
    f.put(f.pc, 'C5'); const foe = f.put(f.foe, 'H5'); foe.hp = foe.maxHp = 9000;
    f.turn(f.pc); rig({ hit: true, die: 12 });
    const u = f.unit(f.pc.id); u.maxDur = 100; u.dur = 100; u.ammo = 1; u.mags = []; u.loose = 1;
    expect(f.pv('shot', { targetId: f.foe.id }).ap).toBe(3);
    expect(f.tech('shot', { targetId: f.foe.id })).toBeNull();
    expect([f.unit(f.pc.id).ammo, f.unit(f.pc.id).loose]).toEqual([1, 0]); // the next bolt is on
    expect(f.tech('shot', { targetId: f.foe.id })).toBeNull();
    expect(f.unit(f.pc.id).ammo).toBe(0); // the last one: nothing left to load
  });
  it('Heavy Bolt is its signature: 4 AP, +50% damage through 10 armour', () => {
    expect(WEAPON.crossbow.damage).toBe(55); expect((WEAPON.crossbow as any).phys.teaches).toBe('heavy_bolt');
    const f = physFight([{ weapon: 'crossbow', known: ['heavy_bolt'], skills: SK }], [{ tier: 'soldier' }], { seed: 'X2' });
    f.put(f.pc, 'C5'); const foe = f.put(f.foe, 'H5'); foe.hp = foe.maxHp = 9000; foe.armour = 10;
    f.turn(f.pc); const u = f.unit(f.pc.id); u.maxDur = 100; u.dur = 100; u.ammo = 1;
    const plain = f.pv('shot', { targetId: f.foe.id }), heavy = f.pv('heavy_bolt', { targetId: f.foe.id });
    expect(heavy.ok).toBe(true); expect(heavy.ap).toBe(4);
    expect(heavy.attacks[0].pv.pct).toBeGreaterThan(plain.attacks[0].pv.pct); // Precise: +2
    expect((heavy.attacks[0].pv as any).dmg.total ?? 0).toBeGreaterThan(((plain.attacks[0].pv as any).dmg.total ?? 0) * 1.4);
  });
});

describe('both hands (0.18.1): a technique made with each weapon in turn', () => {
  it('two pistols: Aimed Shot with both, main at −1 and off at −3 (+1 per 3 Dexterity), the dearer cost + 1 AP', () => {
    const f = physFight([{ weapon: 'service_pistol', off: 'service_pistol', skills: { dexterity: 6 } }], [{ tier: 'soldier' }], { seed: 'B1' });
    f.put(f.pc, 'C5'); const foe = f.put(f.foe, 'F5'); foe.hp = foe.maxHp = 9000;
    f.turn(f.pc); rig({ hit: true, die: 12 });
    const u = f.unit(f.pc.id); u.maxDur = 100; u.dur = 100; (u as any).dexterity = 6;
    const one = f.pv('aimed_shot', { targetId: f.foe.id }), two = f.pv('aimed_shot', { targetId: f.foe.id, hand: 'both' } as any);
    expect(two.ok, two.why || '').toBe(true); expect(two.ap).toBe(one.ap + 1); expect(two.attacks.length).toBe(2);
    expect(two.attacks[0].pv.pct).toBeLessThan(one.attacks[0].pv.pct);            // −1
    expect(two.attacks[1].pv.pct).toBeLessThanOrEqual(two.attacks[0].pv.pct);       // off hand: −1 at Dexterity 6
    const ap0 = f.unit(f.pc.id).ap, a0 = f.unit(f.pc.id).ammo, o0 = f.unit(f.pc.id).offAmmo ?? 0;
    expect(f.tech('aimed_shot', { targetId: f.foe.id, hand: 'both' } as any)).toBeNull();
    const a = f.unit(f.pc.id); expect(ap0 - a.ap).toBe(two.ap); expect(a.ammo).toBe(a0 - 1); expect(a.offAmmo).toBe(o0 - 1);
  });
  it('refused with a gun and a blade, and for a technique that isn\'t one weapon at one target', () => {
    const f = physFight([{ weapon: 'sabre', off: 'service_pistol', skills: SK }], [{ tier: 'soldier' }], { seed: 'B2' });
    f.put(f.pc, 'C5'); f.put(f.foe, 'D5'); f.turn(f.pc);
    expect(f.pv('sunder', { targetId: f.foe.id, hand: 'both' } as any).why).toMatch(/two melee weapons/);
    const g2 = physFight([{ weapon: 'sabre', off: 'combat_knife', known: ['sunder', 'coup'], skills: SK }], [{ tier: 'soldier' }], { seed: 'B3' });
    g2.put(g2.pc, 'C5'); g2.put(g2.foe, 'D5'); g2.turn(g2.pc);
    expect(g2.pv('coup', { targetId: g2.foe.id, hand: 'both' } as any).why).toMatch(/one weapon/);
    expect(phys.pairedPad(g2.cb, g2.unit(g2.pc.id), g2.g).map((e) => e.id)).toContain('sunder');
  });
});

describe('two weapons (0.18.1)', () => {
  it('two guns share one Heat pool: the two limits added', () => {
    const f = physFight([{ weapon: 'service_pistol', off: 'service_pistol', skills: SK }], [{ tier: 'soldier' }], { seed: 'HP' });
    const u = f.unit(f.pc.id), one = WEAPON.service_pistol.heat_limit || 0;
    if (one) expect(heatLimit(u, WEAPON.service_pistol)).toBe(one * 2);
    u.offWeapon = null as any; if (one) expect(heatLimit(u, WEAPON.service_pistol)).toBe(one);
  });
  it('the second weapon asks 2 more of its skill', () => {
    const c: any = { skills: { dexterity: 1, raw_power: 5 } };
    expect(secondWeaponWhy(c, 'service_pistol', 'sabre')).toMatch(/Dexterity 2/);
    c.skills.dexterity = 2; expect(secondWeaponWhy(c, 'service_pistol', 'sabre')).toBeNull();
    expect(secondWeaponWhy(c, 'service_pistol', 'fists')).toBeNull(); // one weapon: no second
    expect(secondWeaponWhy(c, 'riot_shield', 'sabre')).toBeNull();    // a shield is not a weapon
  });
});

describe('Throw and Pull Out (0.18.1)', () => {
  it('a thrown weapon that hits stays in the target; Pull Out from next to it brings it back, hurts and bleeds', () => {
    const f = physFight([{ weapon: 'combat_knife', known: ['throw'], skills: SK }], [{ tier: 'soldier' }], { seed: 'T1' });
    f.put(f.pc, 'C5'); const foe = f.put(f.foe, 'F5'); foe.hp = foe.maxHp = 900;
    f.turn(f.pc); rig({ hit: true, die: 12 });
    expect(f.tech('throw', { targetId: f.foe.id })).toBeNull();
    expect(f.unit(f.pc.id).weapon).toBe('fists'); expect((f.unit(f.foe.id).stuck || []).length).toBe(1);
    expect(f.pv('pull_out', { targetId: f.foe.id }).why).toMatch(/Stand next to/);
    f.put(f.pc, 'E5'); const hp0 = f.unit(f.foe.id).hp, ap0 = f.unit(f.pc.id).ap;
    expect(f.tech('pull_out', { targetId: f.foe.id })).toBeNull();
    const me = f.unit(f.pc.id), v = f.unit(f.foe.id);
    expect(me.weapon).toBe('combat_knife'); expect(f.char(f.pc).weapon).toBe('combat_knife'); expect(ap0 - me.ap).toBe(1);
    expect(v.stuck).toBeUndefined(); expect(v.hp).toBeLessThan(hp0); expect(v.bleed || (v.conds as any)?.bleeding).toBeTruthy();
  });
  it('a weapon stuck in a unit falls on its tile when the unit dies', () => {
    const f = physFight([{ weapon: 'combat_knife', known: ['throw'], skills: SK }, { weapon: 'sabre', skills: SK }], [{ tier: 'minion' }], { seed: 'T2' });
    f.put(f.pcs[0], 'C5'); f.put(f.pcs[1], 'E5'); const foe = f.put(f.foe, 'F5'); foe.hp = foe.maxHp = 60;
    f.turn(f.pcs[0]); rig({ hit: true, die: 12 }); expect(f.tech('throw', { targetId: f.foe.id })).toBeNull();
    if (!f.unit(f.foe.id).dead) { f.turn(f.pcs[1]); f.unit(f.foe.id).hp = 1; f.act({ type: 'combat/technique', unitId: f.pcs[1].id, id: 'cut', targetId: f.foe.id } as any); }
    expect(glaivePiles(f)).toBe(0);
    const piles = objectsOf(f.cb).filter((o: any) => (o.items || []).some((i: any) => /combat_knife/.test(JSON.stringify(i)))).length;
    expect(piles).toBe(1);
  });
});

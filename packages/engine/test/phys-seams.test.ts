// Physical 2.0: where the melee lane, the ranged lane and the core meet (the pre-release review's findings).
import { describe, it, expect, beforeEach } from 'vitest';
import { applyCond, objectsOf } from '../src';
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

// Physical 2.0 (rules 1.12): the parts of the core that the reference techniques don't use, proved with stand-in
// handlers registered in this file only (each test file runs in its own worker): a thrown strike, a volley's card, an
// attack a held shot ends before it is made, nailing until AP is spent, the free reload, making another unit run, a
// technique that draws its weapon, and a technique used with a carried grenade.
import { describe, it, expect, beforeEach } from 'vitest';
import { phys, WEAPON, gearEntry, moveUnit, enemyTurn, reload, objectsOf, type Unit } from '../src';
import { physFight, rig } from './helpers/physfight';

const { technique, strike, stop, stepUser, holdWatch, fireWatch, loseWeapon, spendRounds, addPressure } = phys;
beforeEach(() => rig(null));
// Stand-ins: the least each needs to exercise the core. The real ones are the lanes' (melee/, ranged/).
technique({ id: 'throw', run(t) { const r = strike(t, { thrown: true }); if (!r.ok) return r.why || 'no'; loseWeapon(t, (r.target || t.tgt!).pos); return null; } });
technique({ id: 'burst', run(t) { for (let i = 0; i < 3; i++) { const r = strike(t, { extra: -i, volley: true }); if (!r.ok) return i ? null : r.why || 'no'; } return null; } });
technique({ id: 'walking_fire', run(t) { for (let i = 0; i < 2; i++) { const r = strike(t); if (!r.ok) return i ? null : r.why || 'no'; } return null; } });
technique({ id: 'dead_to_rights', run(t) { holdWatch(t, { trigger: 'acts', targetId: t.args.targetId }); return null; },
  react: { attack_target(ctx, t) { if (ctx.att.id !== (t.u.watch as any)?.targetId) return; fireWatch(t, ctx, ctx.att, () => { strike(t, { target: ctx.att }); }); } } });
technique({ id: 'pin_down', run(t) { const r = strike(t); if (!r.ok) return r.why || 'no'; if (r.hit && r.target) stop(t, r.target, 'pinned', { save: false, untilAp: 2 }); return null; } });
technique({ id: 'rout', run(t) {
  const m = t.tgt!, [x, y] = m.pos.split(',').map(Number), [ux] = t.u.pos.split(',').map(Number), dx = Math.sign(x - ux) || 1;
  stepUser(t, [1, 2, 3].map((i) => (x + dx * i) + ',' + y), { unit: m, oa: true }); spendRounds(t, 1); return null; } });
technique({ id: 'draw_cut', run(t) { const r = strike(t); return r.ok ? null : r.why || 'no'; } });
technique({ id: 'snap_shot', run(t) { const r = strike(t, { extra: t.line('quick') ? 0 : -2 }); return r.ok ? null : r.why || 'no'; } });
technique({ id: 'lob', check: (t) => (t.args.tile ? null : 'Name a tile.'), run(t) {
  if (!spendRounds(t, 1)) return 'Nothing to throw.';
  for (const v of t.cb.units) if (v.side !== t.u.side && !v.dead && Math.max(...v.pos.split(',').map((n, i) => Math.abs(Number(n) - Number(t.args.tile!.split(',')[i])))) <= 1) addPressure(t, v, 2, 'the blast');
  return null; } });

describe('a thrown strike', () => {
  const fight = () => { const f = physFight([{ weapon: 'combat_knife', known: ['throw'], skills: { dexterity: 5, athletics: 1 } }], [{ at: 'G5', tier: 'elite' }]); f.put(f.pc, 'C5'); f.put(f.foe, 'G5'); f.turn(f.pc); f.foe.hp = f.foe.maxHp = 999; return f; };
  it('is a ranged attack at throwing range, aimed with Dexterity, that gives Pressure and Momentum and leaves the hand empty', () => {
    const f = fight(); rig({ hit: true, die: 12 });
    const pv = f.pv('throw', { targetId: f.foe.id }); expect(pv.ok).toBe(true);
    expect(pv.attacks[0].pv.terms!.find((x) => x.label === 'skill')!.v).toBe(4); // Dexterity 5, not Athletics 1
    expect(f.pc.attack).toBe(0); // put back after the card
    expect(f.tech('throw', { targetId: f.foe.id })).toBeNull();
    expect(f.pressure(f.foe)).toBe(1); expect(f.momentum(f.pc)).toBe(1); expect(f.pc.shotsThisTurn).toBe(0);
    expect(f.fx('shot').some((e: any) => e.thrown && e.weapon === 'combat_knife')).toBe(true);
    expect(f.pc.weapon).toBe('fists'); expect(f.char(f.pc).weapon).toBe('fists');
    expect(objectsOf(f.cb).some((o: any) => o.pos === f.tile('G5') && (o.items || []).some((i: any) => i.item === 'combat_knife'))).toBe(true);
    expect(pv.attacks[0].pv.cover).toBe(5); // the low wall at F5 is between them: cover counts for a thrown weapon
  });
  it('is refused past throwing range, and nothing is spent', () => {
    const f = fight(); f.put(f.foe, 'O5'); expect(f.pc.throwRange ?? 6).toBeLessThan(12);
    expect(f.tech('throw', { targetId: f.foe.id })).toMatch(/throwing range/); expect(f.pc.weapon).toBe('combat_knife'); expect(f.pc.ap).toBe(6);
  });
});

describe('several rolls in one technique', () => {
  const fight = () => { const f = physFight([{ weapon: 'hellraiser_service_rifle', known: ['burst', 'walking_fire'], skills: { dexterity: 1 } }], [{ at: 'H5', tier: 'elite' }]); f.put(f.pc, 'C5'); f.put(f.foe, 'H5'); f.turn(f.pc); f.foe.hp = f.foe.maxHp = 999; return f; };
  const rolled = (f: any, n: number) => f.cb.log.filter((l: string) => / fires at /.test(l)).slice(-n).map((l: string) => { const m = l.match(/d20 \d+ ([+−])(\d+)/)!; return (m[1] === '+' ? 1 : -1) * Number(m[2]); });
  it('a volley\'s card shows each roll as it will be made (no Recoil between its rounds)', () => {
    const f = fight(); rig({ die: 10 }); const pv = f.pv('burst', { targetId: f.foe.id }); expect(pv.rounds).toBe(3);
    expect(f.tech('burst', { targetId: f.foe.id })).toBeNull(); expect(rolled(f, 3)).toEqual(pv.attacks.map((a) => a.pv.toHit));
  });
  it('separate rolls show the Recoil and Heat the earlier ones add', () => {
    const f = fight(); rig({ die: 10 }); const pv = f.pv('walking_fire', { targetId: f.foe.id });
    expect(pv.attacks[1].pv.toHit).toBeLessThan(pv.attacks[0].pv.toHit);
    expect(f.tech('walking_fire', { targetId: f.foe.id })).toBeNull(); expect(rolled(f, 2)).toEqual(pv.attacks.map((a) => a.pv.toHit));
  });
});

describe('a held shot that lands first', () => {
  it('ends the attack it answers when it takes the attacker out', () => {
    const f = physFight([{ weapon: 'ccec_marksman_rifle', known: ['dead_to_rights'], skills: { dexterity: 6 } }], [{ at: 'H5', tier: 'minion', weapon: 'service_pistol' }, { at: 'N9', tier: 'elite' }]);
    f.put(f.pc, 'C5'); f.put(f.foes[0], 'H5'); f.put(f.foes[1], 'O10'); f.turn(f.pc); f.press(f.foes[0], 2, f.pc);
    expect(f.tech('dead_to_rights', { targetId: f.foes[0].id })).toBeNull();
    f.turn(f.foes[0]); f.unit(f.foes[0].id).hp = 1; rig({ hit: true, die: 12 }); const hp = f.pc.hp;
    f.bound(() => enemyTurn(f.cb, f.g.rng));
    expect(f.foes[0].dead).toBe(true); expect(f.pc.hp).toBe(hp);
    expect(f.cb.log.some((l) => /never comes/.test(l))).toBe(true);
  });
});

describe('nailed in place', () => {
  const fight = () => { const f = physFight([{ weapon: 'recurve_bow', known: ['pin_down'], skills: { dexterity: 6 } }, { weapon: 'sabre' }], [{ at: 'H5', tier: 'elite', weapon: 'sabre' }]); f.put(f.pcs[0], 'C5'); f.put(f.pcs[1], 'C7'); f.put(f.foe, 'H5'); f.turn(f.pcs[0]); f.foe.hp = f.foe.maxHp = 999; f.press(f.foe, 2, f.pcs[0]); return f; };
  it('holds until 2 AP is spent to pull free: the enemy does it on its turn', () => {
    const f = fight(); rig({ hit: true, die: 12 });
    expect(f.tech('pin_down', { targetId: f.foe.id })).toBeNull(); expect(f.foe.nailed).toMatchObject({ ap: 2, id: 'pin_down' });
    f.turn(f.foe); expect(f.bound(() => moveUnit(f.cb, f.foe, f.tile('G5'), f.g.rng))).toMatch(/Nailed/);
    rig(null); f.bound(() => enemyTurn(f.cb, f.g.rng));
    expect(f.foe.nailed).toBeUndefined(); expect(f.cb.log.some((l) => /pulls free \(2 AP\)/.test(l))).toBe(true);
  });
  it('an ally next to you can pull you free (combat/pull-free)', () => {
    const f = fight(); f.put(f.pcs[1], 'C6'); f.unit(f.pcs[0].id).nailed = { by: f.foe.id, id: 'pin_down', ap: 2 };
    expect(f.bound(() => phys.physView(f.cb, f.pcs[0], 'pc')).nailed?.ap).toBe(2);
    f.turn(f.pcs[1]); f.act({ type: 'combat/pull-free', unitId: f.pcs[1].id, targetId: f.pcs[0].id });
    expect(f.pcs[0].nailed).toBeUndefined(); expect(f.pcs[1].ap).toBe(4);
  });
});

describe('small services', () => {
  it('a unit owed a free reload pays nothing for its next speed reload, once', () => {
    const f = physFight([{ weapon: 'service_pistol' }], [{ at: 'H5' }]); f.turn(f.pc); f.pc.ammo = 0; f.pc.mags = [12]; f.pc.freeReload = true;
    expect(f.bound(() => reload(f.cb, f.pc))).toBeNull(); expect(f.pc.ap).toBe(6); expect(f.pc.freeReload).toBeUndefined(); expect(f.pc.ammo).toBeGreaterThan(0);
  });
  it('a technique can make another unit run as its own movement, drawing opportunity attacks', () => {
    const f = physFight([{ weapon: 'frontier_hand_cannon', known: ['rout'], skills: { dexterity: 4 } }, { weapon: 'sabre', skills: { athletics: 5 } }], [{ at: 'H5', tier: 'elite' }]);
    f.put(f.pcs[0], 'C5'); f.put(f.pcs[1], 'H6'); f.put(f.foe, 'H5'); f.turn(f.pcs[0]); f.foe.hp = f.foe.maxHp = 999; f.press(f.foe, 2, f.pcs[0]); rig({ hit: true, die: 12 });
    expect(f.tech('rout', { targetId: f.foe.id })).toBeNull();
    expect(f.foe.pos).toBe(f.tile('K5')); expect(f.foe.hp).toBeLessThan(999); // the swordsman's opportunity attack
    expect(f.cb.log.some((l) => /takes an opportunity attack/.test(l))).toBe(true);
  });
});

describe('a weapon that isn\'t in the hand', () => {
  it('a technique that draws: checked and previewed as if held, then drawn for free and used', () => {
    const f = physFight([{ weapon: 'hellraiser_service_rifle', known: ['draw_cut'], skills: { athletics: 4, dexterity: 2 } }], [{ at: 'D5', tier: 'elite' }]);
    f.put(f.pc, 'C5'); f.put(f.foe, 'D5'); f.turn(f.pc); f.foe.hp = f.foe.maxHp = 999;
    const c = f.char(f.pc); c.pack = [...(c.pack || []), gearEntry('sabre')!]; const item = c.pack.length - 1;
    expect(f.tech('draw_cut', { targetId: f.foe.id })).toMatch(/Pick the weapon to draw/);
    const pad = f.bound(() => phys.packPad(f.cb, f.pc)); expect(pad.find((b) => b.weapon === 'sabre')?.entries.map((e) => e.id)).toEqual(['draw_cut']);
    expect(f.pad().flatMap((g) => g.entries.map((e) => e.id))).not.toContain('draw_cut'); // never with the weapon in the hand
    const pv = f.pv('draw_cut', { targetId: f.foe.id, item }); expect(pv.ok).toBe(true); expect(pv.ap).toBe(1); expect(pv.attacks[0].pv.dmg!.base).toBe(WEAPON.sabre.damage);
    expect(f.pc.weapon).toBe('hellraiser_service_rifle'); // the card changed nothing
    rig({ hit: true, die: 12 }); expect(f.tech('draw_cut', { targetId: f.foe.id, item })).toBeNull();
    expect(f.pc.weapon).toBe('sabre'); expect(f.char(f.pc).weapon).toBe('sabre'); expect(f.pc.ap).toBe(5); expect(f.momentum(f.pc)).toBe(1);
    expect(f.char(f.pc).pack!.some((x) => x.weapon === 'hellraiser_service_rifle')).toBe(true); // the rifle went to the pack
  });
  it('Snap Shot draws a stowed gun; a refused use draws nothing', () => {
    const f = physFight([{ weapon: 'sabre', known: ['snap_shot'], skills: { dexterity: 4 } }], [{ at: 'H5', tier: 'elite' }]); f.put(f.pc, 'C5'); f.put(f.foe, 'H5'); f.turn(f.pc);
    const c = f.char(f.pc); c.pack = [...(c.pack || []), { ...gearEntry('service_pistol')!, loaded: 0 }]; const item = c.pack.length - 1;
    expect(f.tech('snap_shot', { targetId: f.foe.id, item })).toMatch(/Empty/); expect(f.pc.weapon).toBe('sabre');
    f.char(f.pc).pack![item].loaded = 5; rig({ hit: true, die: 12 });
    expect(f.tech('snap_shot', { targetId: f.foe.id, item })).toBeNull(); expect(f.pc.weapon).toBe('service_pistol'); expect(f.pc.ammo).toBe(4);
  });
  it('a carried grenade is the weapon of a technique: its properties, its count, and nothing in the hand changes', () => {
    const f = physFight([{ weapon: 'service_pistol', known: ['lob'], skills: { dexterity: 4 } }], [{ at: 'H5', tier: 'elite' }]); f.put(f.pc, 'C5'); f.put(f.foe, 'H5'); f.turn(f.pc);
    f.pc.throwables = { frag_grenade: 2 }; const ammo = f.pc.ammo;
    const block = f.bound(() => phys.packPad(f.cb, f.pc)).find((b) => b.kind === 'throwable')!;
    expect(block).toMatchObject({ item: 'frag_grenade', count: 2 }); expect(block.entries.map((e) => e.id).sort()).toEqual(['lob', 'rout']); // Rout is lent by the grenade
    expect(block.entries.find((e) => e.id === 'lob')?.choices?.map((x) => x.prop).sort()).toEqual(['arc', 'blast']); // at home with a grenade: the player picks the line
    expect(phys.offHome(phys.TECHNIQUE.lob, 'frag_grenade')).toBe(false);
    const pv = f.pv('lob', { tile: f.tile('H5'), item: 'frag_grenade' }); expect(pv.ok).toBe(true); expect(pv.rounds).toBe(1); expect(pv.pressure?.[0]).toMatchObject({ unit: f.foe.id, after: 2 });
    expect(f.tech('lob', { tile: 'H5', item: 'frag_grenade' })).toBeNull();
    expect(f.pc.throwables).toEqual({ frag_grenade: 1 }); expect(f.pc.weapon).toBe('service_pistol'); expect(f.pc.ammo).toBe(ammo); expect(f.pressure(f.foe)).toBe(2);
    expect(f.tech('lob', { tile: 'H5', item: 'smoke_grenade' })).toMatch(/carry no/);
  });
});

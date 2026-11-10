// Physical 2.0 (rules 1.12), the ranged Sets: Bead, Spot, Brace, Load Special, Shift, Vent and Head Down.
import { describe, it, expect, beforeEach } from 'vitest';
import { phys, packOf, resolveAttack, type Unit, type TechArgs } from '../src';
import { physFight, rig } from './helpers/physfight';
import { unchanged, type PhysF as F } from './helpers/physfight-ranged';

// ---------- helpers (the shared ones are in helpers/physfight-ranged.ts) ----------
/** One gunner (Dexterity 6 unless given) against a soldier, the gunner's turn. */
function gunFight(weapon: string, known: string[], o: { at?: string; foeAt?: string; tier?: string; skills?: Record<string, number>; foeWeapon?: string } = {}) {
  const f = physFight([{ weapon, known, skills: { dexterity: 6, ...(o.skills || {}) } }], [{ at: o.foeAt || 'H5', tier: o.tier || 'soldier', weapon: o.foeWeapon }]);
  f.put(f.pc, o.at || 'C5'); f.put(f.foe, o.foeAt || 'H5'); f.turn(f.pc); return f;
}
/** Two gunners (a spotter and a shooter) against a soldier. */
function squadFight(spotter: string, shooter: string, o: { tier?: string; foeAt?: string } = {}) {
  const f = physFight([{ weapon: spotter, known: ['spot', 'dead_centre'], skills: { dexterity: 6 } }, { weapon: shooter, known: ['dead_centre'], skills: { dexterity: 6 } }], [{ at: o.foeAt || 'H5', tier: o.tier || 'soldier' }]);
  f.put(f.pcs[0], 'C5'); f.put(f.pcs[1], 'C7'); f.put(f.foe, o.foeAt || 'H5'); f.turn(f.pcs[0]); return f;
}
/** Put special rounds in the first PC's pack. */
function give(f: F, type: string, qty: number, u?: Unit) {
  const c = f.char(u || f.pc); c.pack = [...packOf(c), { id: 'ammo_' + type, item: 'ammo_' + type, name: type + ' rounds', qty, kind: 'ammo' } as any];
}
const carriedOf = (f: F, type: string, u?: Unit) => packOf(f.char(u || f.pc)).filter((x) => (x.item || x.id) === 'ammo_' + type).reduce((t, x) => t + x.qty, 0);
const term = (pv: phys.TechPreview, label: string) => { expect(pv.attacks.length, pv.why || '').toBeGreaterThan(0); return pv.attacks[0].pv.terms?.find((t) => t.label === label)?.v; };
/** A Shot's attack preview (a unit whose turn it isn't is given its AP to look with). */
function shotPv(f: F, targetId: string, u?: Unit, args: TechArgs = {}) {
  if (u && !f.unit(u.id).ap) f.unit(u.id).ap = 6;
  const pv = f.pv('shot', { targetId, ...args }, u); expect(pv.ok, pv.why || '').toBe(true); return pv.attacks[0].pv;
}
/** A Shot's whole preview for a unit, with AP to look with. */
function shotTech(f: F, targetId: string, u: Unit) { if (!f.unit(u.id).ap) f.unit(u.id).ap = 6; return f.pv('shot', { targetId }, u); }
/** Make it a unit's turn with the reducer's own technique call (for a second PC). */
function techAs(f: F, u: Unit, id: string, args: TechArgs = {}) { f.turn(u); return f.tech(id, args); }

beforeEach(() => rig(null));

describe('the Sets are built and cost 1 AP with no rounds and no Heat', () => {
  it('every Set has a handler, 1 AP, 0 rounds', () => {
    for (const id of ['bead', 'spot', 'brace', 'load_special', 'shift', 'vent', 'head_down']) {
      expect(phys.handlerOf(id), id).toBeTruthy();
      expect(phys.TECHNIQUE[id].ap, id).toEqual({ base: 'flat', value: 1 }); expect(phys.TECHNIQUE[id].rounds, id).toBe(0);
    }
    const f = gunFight('hellraiser_service_rifle', ['bead', 'spot', 'brace', 'load_special', 'shift', 'vent', 'head_down']);
    const sets = f.pad().find((g) => g.group === 'set')!.entries;
    for (const e of sets) expect(e.built, e.id).toBe(true);
  });
});

describe('Bead (14)', () => {
  it('base: 1 AP, nothing fired; shots at the target ignore one range band, until you move', () => {
    const f = gunFight('service_pistol', ['bead'], { foeAt: 'L5' }); // 9 tiles, range 8: one band, −2
    expect(shotPv(f, f.foe.id).rangePenalty).toBe(-2);
    const a0 = f.pc.ammo, h0 = f.pc.heat;
    expect(f.tech('bead', { targetId: f.foe.id })).toBeNull();
    expect(f.pc.ap).toBe(5); expect(f.pc.ammo).toBe(a0); expect(f.pc.heat).toBe(h0);
    expect(f.pc.tech?.bead?.targetId).toBe(f.foe.id);
    expect(shotPv(f, f.foe.id).rangePenalty + 0).toBe(0);
    expect(term(f.pv('shot', { targetId: f.foe.id }), 'Bead')).toBeUndefined(); // no Precise line on a service pistol
    expect(f.walk(f.pc, 'C6')).toBeNull();
    expect(f.pc.tech?.bead?.targetId).toBeNull();
    expect(shotPv(f, f.foe.id).rangePenalty).toBe(-2);
    expect(f.fx('bead_end').length).toBe(1);
  });
  it('a second band is cut to one, and two marks (Bead and Spot) still ignore only one', () => {
    const f = gunFight('parlour_pistol', ['bead'], { foeAt: 'M5' }); // 10 tiles, range 4: two bands
    expect(shotPv(f, f.foe.id).rangePenalty).toBe(-4);
    f.tech('bead', { targetId: f.foe.id }); expect(shotPv(f, f.foe.id).rangePenalty).toBe(-2);
  });
  it('Precise: +1 to hit it (and only it); without Precise none', () => {
    const f = physFight([{ weapon: 'drifter_revolver', known: ['bead'], skills: { dexterity: 6 } }], [{ at: 'H5' }, { at: 'H7' }]);
    f.put(f.pc, 'C5'); f.turn(f.pc);
    expect(f.tech('bead', { targetId: f.foes[0].id })).toBeNull();
    expect(term(f.pv('shot', { targetId: f.foes[0].id }), 'Bead')).toBe(1);
    expect(term(f.pv('shot', { targetId: f.foes[1].id }), 'Bead')).toBeUndefined();
  });
  it('Heavy: one tile of movement keeps it; the second ends it. Without Heavy one tile ends it', () => {
    const f = gunFight('hellraiser_lmg', ['bead']);
    f.tech('bead', { targetId: f.foe.id });
    f.walk(f.pc, 'C6'); expect(f.pc.tech?.bead?.targetId).toBe(f.foe.id);
    f.walk(f.pc, 'C7'); expect(f.pc.tech?.bead?.targetId).toBeNull();
    const g = gunFight('hellraiser_service_rifle', ['bead']);
    g.tech('bead', { targetId: g.foe.id }); g.walk(g.pc, 'C6'); expect(g.pc.tech?.bead?.targetId).toBeNull();
  });
  it('the target\'s Pressure doesn\'t fall at its turn end while the holder sees it; it does when the holder can\'t', () => {
    const f = gunFight('hellraiser_service_rifle', ['bead']);
    f.press(f.foe, 2, f.pc); f.tech('bead', { targetId: f.foe.id });
    f.turn(f.foe); f.pass(); expect(f.pressure(f.foe)).toBe(2);
    // out of sight behind the pillar (K7): it falls as usual
    const g = gunFight('hellraiser_service_rifle', ['bead'], { at: 'F7', foeAt: 'M7' });
    g.press(g.foe, 2, g.pc); g.tech('bead', { targetId: g.foe.id });
    g.put(g.foe, 'N7'); g.turn(g.foe); g.pass(); expect(g.pressure(g.foe)).toBe(1);
    // no bead: it falls
    const h = gunFight('hellraiser_service_rifle', ['bead']); h.press(h.foe, 2, h.pc); h.turn(h.foe); h.pass(); expect(h.pressure(h.foe)).toBe(1);
  });
  it('naming another ends the first; the new one holds', () => {
    const f = physFight([{ weapon: 'hellraiser_service_rifle', known: ['bead'], skills: { dexterity: 6 } }], [{ at: 'H5' }, { at: 'H7' }]);
    f.put(f.pc, 'C5'); f.turn(f.pc);
    f.tech('bead', { targetId: f.foes[0].id }); f.tech('bead', { targetId: f.foes[1].id });
    expect(f.pc.tech?.bead?.targetId).toBe(f.foes[1].id);
    expect(f.bound(() => [phys.pressureOf(f.foes[0])])).toEqual([0]);
  });
  it('refusals: no target, an ally, unseen, the same target again; nothing is spent', () => {
    const f = physFight([{ weapon: 'hellraiser_service_rifle', known: ['bead'], skills: { dexterity: 6 } }, { weapon: 'service_pistol' }], [{ at: 'H5' }]);
    f.put(f.pcs[0], 'C5'); f.put(f.pcs[1], 'C7'); f.put(f.foe, 'H5'); f.turn(f.pcs[0]);
    expect(f.tech('bead')).toBe('Pick a target.');
    expect(f.tech('bead', { targetId: f.pcs[1].id })).toBe('Bead an enemy.');
    expect(f.pc.ap).toBe(6);
    f.tech('bead', { targetId: f.foe.id }); expect(f.tech('bead', { targetId: f.foe.id })).toMatch(/already have a bead/);
    const g = gunFight('hellraiser_service_rifle', ['bead'], { at: 'F7', foeAt: 'N7' }); // behind the pillar
    expect(g.tech('bead', { targetId: g.foe.id })).toMatch(/can't see/);
  });
  it('the preview changes nothing and says what it does', () => {
    const f = gunFight('drifter_revolver', ['bead']);
    let pv: any; unchanged(f, () => { pv = f.pv('bead', { targetId: f.foe.id }); });
    expect(pv.ok).toBe(true); expect(pv.ap).toBe(1); expect(pv.rounds).toBe(0); expect(pv.attacks).toEqual([]);
    expect(pv.notes.join(' ')).toMatch(/ignore 1 range band, at \+1 to hit/);
  });
  it('an enemy can bead a player (no character behind it); its AI wants a far target more', () => {
    const f = gunFight('service_pistol', [], { foeAt: 'M5', foeWeapon: 'long_rifle' });
    f.foe.techs = ['bead']; f.turn(f.foe);
    const near = f.bound(() => phys.aiScore(f.cb, f.foe, 'bead', { targetId: f.pc.id })).score;
    expect(f.use(f.foe, 'bead', { targetId: f.pc.id })).toBeNull(); expect(f.foe.tech?.bead?.targetId).toBe(f.pc.id);
    expect(f.bound(() => phys.aiScore(f.cb, f.foe, 'bead', { targetId: f.pc.id })).score).toBe(0); // already beaded
    expect(near).toBe(3);
    f.press(f.pc, 1, f.foe); f.foe.tech!.bead.targetId = null;
    expect(f.bound(() => phys.aiScore(f.cb, f.foe, 'bead', { targetId: f.pc.id })).score).toBe(6);
  });
});

describe('Spot (15)', () => {
  it('base: allies (not the spotter) have +1 to hit it until the spotter\'s next turn', () => {
    const f = squadFight('service_pistol', 'service_pistol');
    expect(f.tech('spot', { targetId: f.foe.id })).toBeNull(); expect(f.pc.ap).toBe(5);
    expect(f.foe.tech?.spotted).toMatchObject({ by: f.pcs[0].id, used: false });
    expect(term(shotTech(f, f.foe.id, f.pcs[1]), 'Spotted')).toBe(1);
    expect(term(shotTech(f, f.foe.id, f.pcs[0]), 'Spotted')).toBeUndefined();
    f.turn(f.pcs[0]); expect(f.foe.tech?.spotted).toBeUndefined();
    expect(term(shotTech(f, f.foe.id, f.pcs[1]), 'Spotted')).toBeUndefined();
  });
  it('the first ally to hit it adds +1 Pressure more; the next hit only its own', () => {
    const f = squadFight('service_pistol', 'service_pistol'); rig({ hit: true, die: 12 });
    f.tech('spot', { targetId: f.foe.id });
    expect(techAs(f, f.pcs[1], 'shot', { targetId: f.foe.id })).toBeNull();
    expect(f.pressure(f.foe)).toBe(2); expect(f.foe.tech?.spotted?.used).toBe(true);
    f.cb.round += 1; f.turn(f.pcs[1]); expect(f.tech('shot', { targetId: f.foe.id })).toBeNull(); expect(f.pressure(f.foe)).toBe(3); // a new turn: +1 only
  });
  it('a miss uses nothing; the spotter\'s own hit doesn\'t count', () => {
    const f = squadFight('service_pistol', 'service_pistol');
    f.tech('spot', { targetId: f.foe.id }); rig({ hit: true, die: 12 });
    f.tech('shot', { targetId: f.foe.id }); expect(f.pressure(f.foe)).toBe(1); expect(f.foe.tech?.spotted?.used).toBe(false);
    rig({ hit: false, die: 3 }); techAs(f, f.pcs[1], 'shot', { targetId: f.foe.id }); expect(f.foe.tech?.spotted?.used).toBe(false); expect(f.pressure(f.foe)).toBe(1);
  });
  it('the caps hold: a boss stops at 2, an elite at 3, a player at 3', () => {
    const b = squadFight('service_pistol', 'service_pistol', { tier: 'boss' }); rig({ hit: true, die: 12 });
    b.tech('spot', { targetId: b.foe.id }); techAs(b, b.pcs[1], 'shot', { targetId: b.foe.id }); expect(b.pressure(b.foe)).toBe(2);
    const b2 = squadFight('service_pistol', 'service_pistol', { tier: 'boss' }); rig({ hit: true, die: 12 }); b2.press(b2.foe, 1, b2.pcs[0]);
    b2.tech('spot', { targetId: b2.foe.id }); techAs(b2, b2.pcs[1], 'shot', { targetId: b2.foe.id }); expect(b2.pressure(b2.foe)).toBe(2);
    const e = squadFight('service_pistol', 'service_pistol', { tier: 'elite' }); rig({ hit: true, die: 12 }); e.press(e.foe, 2, e.pcs[0]);
    e.tech('spot', { targetId: e.foe.id }); techAs(e, e.pcs[1], 'shot', { targetId: e.foe.id }); expect(e.pressure(e.foe)).toBe(3);
    // an enemy spotter, an enemy ally's hit on a player at 2: the player stops at 3
    const p = physFight([{ weapon: 'service_pistol' }], [{ at: 'H5' }, { at: 'H7' }]); p.put(p.pc, 'C5'); p.press(p.pc, 2, p.foes[0]);
    p.foes[0].techs = ['spot']; p.turn(p.foes[0]); expect(p.use(p.foes[0], 'spot', { targetId: p.pc.id })).toBeNull();
    p.turn(p.foes[1]); rig({ hit: true, die: 12 }); p.bound(() => resolveAttack(p.cb, p.g.rng, p.foes[1], p.pc, 'shot', null, { noAp: true }));
    expect(p.pressure(p.pc)).toBe(3);
  });
  it('Precise: allies also ignore one range band; without Precise they don\'t', () => {
    const f = squadFight('drifter_revolver', 'service_pistol', { foeAt: 'L6' }); // the shooter at C7: 9 tiles, one band
    expect(shotPv(f, f.foe.id, f.pcs[1]).rangePenalty).toBe(-2);
    f.tech('spot', { targetId: f.foe.id }); expect(shotPv(f, f.foe.id, f.pcs[1]).rangePenalty + 0).toBe(0);
    const g = squadFight('service_pistol', 'service_pistol', { foeAt: 'L6' });
    g.tech('spot', { targetId: g.foe.id }); expect(shotPv(g, g.foe.id, g.pcs[1]).rangePenalty).toBe(-2);
  });
  it('Silent: the target isn\'t told (the event is for the spotter\'s side only); otherwise everyone sees it', () => {
    const f = squadFight('whisper_smg', 'service_pistol'); f.tech('spot', { targetId: f.foe.id });
    expect(f.fx('spot')[0]).toMatchObject({ only: 'pc', hidden: true }); expect(f.foe.tech?.spotted?.hidden).toBe(true);
    const g = squadFight('service_pistol', 'service_pistol'); g.tech('spot', { targetId: g.foe.id });
    expect(g.fx('spot')[0].only).toBeUndefined();
  });
  it('a Take\'s hit adds none and leaves the mark for the next hit', () => {
    const f = squadFight('service_pistol', 'service_pistol', { tier: 'elite' }); rig({ hit: true, die: 12 });
    f.tech('spot', { targetId: f.foe.id }); f.press(f.foe, 3, f.pcs[0]);
    expect(techAs(f, f.pcs[1], 'dead_centre', { targetId: f.foe.id })).toBeNull();
    expect(f.pressure(f.foe)).toBe(1); expect(f.foe.tech?.spotted?.used).toBe(false);
  });
  it('refusals: no target, an ally, no ally to spot for; the preview changes nothing', () => {
    const f = squadFight('service_pistol', 'service_pistol');
    expect(f.tech('spot')).toBe('Pick a target.');
    expect(f.tech('spot', { targetId: f.pcs[1].id })).toBe('Spot an enemy.');
    const solo = gunFight('service_pistol', ['spot']); expect(solo.tech('spot', { targetId: solo.foe.id })).toBe('No one to spot for.');
    let pv: any; unchanged(f, () => { pv = f.pv('spot', { targetId: f.foe.id }); });
    expect(pv.ok).toBe(true); expect(pv.ap).toBe(1); expect(pv.notes[0]).toMatch(/\+1 to hit/);
  });
});

describe('Brace (16)', () => {
  it('base: any weapon resting on half cover braces (Recoil halved); in the open it is refused', () => {
    const f = gunFight('service_pistol', ['brace'], { skills: { dexterity: 0 } });
    expect(f.tech('brace')).toMatch(/half cover/); expect(f.pc.ap).toBe(6);
    f.put(f.pc, 'E4'); // next to the low wall at F4
    f.unit(f.pc.id).shotsThisTurn = 2; expect(term(f.pv('shot', { targetId: f.foe.id }), 'recoil')).toBe(-2);
    expect(f.tech('brace')).toBeNull(); expect(f.pc.braced).toBe(true); expect(f.pc.ap).toBe(5); expect(f.pc.heat).toBe(0);
    expect(term(f.pv('shot', { targetId: f.foe.id }), 'recoil')).toBe(-1);
    expect(f.tech('brace')).toBe('Already braced.');
    f.walk(f.pc, 'D4'); expect(f.pc.braced).toBe(false); // moving ends it (today's rule)
  });
  it('Heavy: braces anywhere and removes its penalties; a heavy weapon unbraced keeps the −2', () => {
    const f = gunFight('hellraiser_lmg', ['brace']);
    expect(term(f.pv('shot', { targetId: f.foe.id }), 'not braced')).toBe(-2);
    let pv: any; unchanged(f, () => { pv = f.pv('brace'); }); expect(pv.notes[0]).toMatch(/penalties are gone/);
    expect(f.tech('brace')).toBeNull();
    expect(term(f.pv('shot', { targetId: f.foe.id }), 'not braced')).toBeUndefined();
    const b = gunFight('blackpoint_700', ['brace']); expect(b.pv('shot', { targetId: b.foe.id }).ok).toBe(false);
    b.tech('brace'); expect(b.pv('shot', { targetId: b.foe.id }).ok).toBe(true);
  });
  it('Auto, Braced: Suppress gives +1 more on its target, hit or miss; unbraced or without Auto it doesn\'t', () => {
    const hit = gunFight('hellraiser_service_rifle', ['brace', 'suppress'], { at: 'E4' }); rig({ hit: true, die: 12 });
    expect(hit.tech('brace')).toBeNull(); expect(hit.tech('suppress', { targetId: hit.foe.id })).toBeNull(); expect(hit.pressure(hit.foe)).toBe(3);
    const miss = gunFight('hellraiser_service_rifle', ['brace', 'suppress'], { at: 'E4' }); rig({ hit: false, die: 3 });
    miss.tech('brace'); miss.tech('suppress', { targetId: miss.foe.id }); expect(miss.pressure(miss.foe)).toBe(2);
    const open = gunFight('hellraiser_service_rifle', ['brace', 'suppress'], { at: 'E4' }); rig({ hit: true, die: 12 });
    open.tech('suppress', { targetId: open.foe.id }); expect(open.pressure(open.foe)).toBe(2);
    const semi = gunFight('lever_carbine', ['brace', 'suppress'], { at: 'E4' }); rig({ hit: true, die: 12 });
    semi.tech('brace'); semi.tech('suppress', { targetId: semi.foe.id }); expect(semi.pressure(semi.foe)).toBe(2);
    // the spill around the target (Auto) is not raised
    const spill = physFight([{ weapon: 'hellraiser_service_rifle', known: ['brace', 'suppress'], skills: { dexterity: 6 } }], [{ at: 'H5' }, { at: 'H6' }]);
    spill.put(spill.pc, 'E4'); spill.put(spill.foes[0], 'H5'); spill.put(spill.foes[1], 'H6'); spill.turn(spill.pc); rig({ hit: true, die: 12 });
    spill.tech('brace'); spill.tech('suppress', { targetId: spill.foes[0].id });
    expect(spill.pressure(spill.foes[0])).toBe(3); expect(spill.pressure(spill.foes[1])).toBe(1);
    // an elite stops at 3 all the same
    const el = gunFight('hellraiser_service_rifle', ['brace', 'suppress'], { at: 'E4', tier: 'elite' }); rig({ hit: true, die: 12 }); el.press(el.foe, 1, el.pc);
    el.tech('brace'); el.tech('suppress', { targetId: el.foe.id }); expect(el.pressure(el.foe)).toBe(3);
  });
  it('enemies: a gun with a penalty unbraced wants it; others don\'t', () => {
    const f = gunFight('service_pistol', [], { foeWeapon: 'hellraiser_lmg' }); f.foe.techs = ['brace']; f.turn(f.foe);
    expect(f.bound(() => phys.aiScore(f.cb, f.foe, 'brace', {})).score).toBe(8);
    const g = gunFight('service_pistol', [], { foeWeapon: 'service_pistol' }); g.foe.techs = ['brace']; g.turn(g.foe);
    expect(g.bound(() => phys.aiScore(g.cb, g.foe, 'brace', {})).score).toBe(0);
  });
});

describe('Load Special (17)', () => {
  it('base: chambers one carried round for the next Fire; the magazine keeps its count', () => {
    const f = gunFight('service_pistol', ['load_special']); give(f, 'hollow_point', 2); rig({ hit: true, die: 12 });
    const a0 = f.pc.ammo;
    let pv: any; unchanged(f, () => { pv = f.pv('load_special', { ammo: 'hollow_point' }); });
    expect(pv.ok).toBe(true); expect(pv.ap).toBe(1); expect(pv.notes[0]).toMatch(/Chambers 1 hollow-point round/);
    expect(f.tech('load_special', { ammo: 'hollow_point' })).toBeNull();
    expect(f.pc.ap).toBe(5); expect(f.pc.ammo).toBe(a0); expect(carriedOf(f, 'hollow_point')).toBe(1);
    expect(f.pc.tech?.load_special).toMatchObject({ type: 'hollow_point', weaponId: 'service_pistol' });
    // the next Fire's card shows the round, and that it doesn't come out of the magazine
    const spv = f.pv('shot', { targetId: f.foe.id });
    expect(spv.rounds).toBe(0); expect(spv.attacks[0].pv.dmg!.mults.some((m) => m.label === 'hollow-point rounds')).toBe(true);
    expect(f.tech('shot', { targetId: f.foe.id })).toBeNull();
    expect(f.pc.ammo).toBe(a0); expect(f.pc.tech?.load_special).toBeUndefined();
    expect(f.cb.log.some((l) => /fires the chambered hollow-point round/.test(l))).toBe(true);
    const after = f.pv('shot', { targetId: f.foe.id }); expect(after.rounds).toBe(1);
    expect(after.attacks[0].pv.dmg!.mults.some((m) => m.label === 'hollow-point rounds')).toBe(false);
    expect(f.pressure(f.foe)).toBe(1); // a hit's ordinary Pressure, as any shot
  });
  it('the preview\'s damage is the shot\'s: the same seed, the same numbers', () => {
    const f = gunFight('service_pistol', ['load_special'], { foeAt: 'E5' }); give(f, 'hollow_point', 1); rig({ hit: true, die: 12 });
    f.foe.armour = 0; f.foe.hp = f.foe.maxHp = 500;
    f.tech('load_special', { ammo: 'hollow_point' });
    const want = Math.floor(f.pv('shot', { targetId: f.foe.id }).attacks[0].pv.dmg!.total), hp = f.foe.hp;
    f.tech('shot', { targetId: f.foe.id }); expect(hp - f.foe.hp).toBe(Math.max(1, want));
  });
  it('the default round is the one carried most; a Press or a Take doesn\'t spend it', () => {
    const f = gunFight('hellraiser_service_rifle', ['load_special', 'suppress']); give(f, 'incendiary', 1); give(f, 'armor_piercing', 3); rig({ hit: false, die: 3 });
    expect(f.tech('load_special')).toBeNull(); expect(f.pc.tech?.load_special?.type).toBe('armor_piercing');
    f.tech('suppress', { targetId: f.foe.id }); expect(f.pc.tech?.load_special?.type).toBe('armor_piercing');
  });
  it('Spread: every target of the Fire gets the round (the flamer\'s cone); one round still', () => {
    // the flamer (Heavy, Spread) with enhanced rounds: each hit releases bots, the cone's included
    const run = (load: boolean) => {
      const f = physFight([{ weapon: 'purifier_flamer', known: ['load_special'], skills: { dexterity: 6 } }], [{ at: 'E5' }, { at: 'F5' }]);
      f.put(f.pc, 'C5'); f.put(f.foes[0], 'D5'); f.put(f.foes[1], 'E5'); f.turn(f.pc); give(f, 'enhanced', 1); rig({ hit: true, die: 12 });
      if (load) expect(f.tech('load_special', { ammo: 'enhanced' })).toBeNull();
      const m0 = f.cb.mana ?? 0, a0 = f.pc.ammo;
      expect(f.tech('shot', { targetId: f.foes[0].id })).toBeNull();
      return { mana: (f.cb.mana ?? 0) - m0, spent: a0 - f.pc.ammo, left: f.pc.tech?.load_special };
    };
    const plain = run(false), loaded = run(true);
    expect(loaded.mana - plain.mana).toBe(2); expect(loaded.left).toBeUndefined();
    expect(loaded.spent).toBe(plain.spent - 1); // the chambered round is extra
  });
  it('refusals: no special rounds, one not carried, standard, already chambered, a Drawn weapon, no rounds at all', () => {
    const f = gunFight('service_pistol', ['load_special']);
    expect(f.tech('load_special')).toBe('You carry no special rounds.');
    give(f, 'hollow_point', 1);
    expect(f.tech('load_special', { ammo: 'incendiary' })).toBe('You carry no incendiary rounds.');
    expect(f.tech('load_special', { ammo: 'standard' })).toMatch(/Pick a special round/);
    expect(f.tech('load_special', { ammo: 'hollow_point' })).toBeNull();
    give(f, 'hollow_point', 1); expect(f.tech('load_special', { ammo: 'hollow_point' })).toMatch(/already chambered/);
    const bow = gunFight('recurve_bow', ['load_special']); expect(bow.tech('load_special')).toMatch(/Not available with a drawn weapon/);
    const nade = gunFight('frag_grenade', ['load_special']); expect(nade.tech('load_special')).toBe('Your weapon takes no rounds.');
    // an enemy carries none, and doesn't want it
    const e = gunFight('service_pistol', []); e.foe.techs = ['load_special']; e.turn(e.foe);
    expect(e.use(e.foe, 'load_special')).toBe('You carry no special rounds.');
    expect(e.bound(() => phys.aiScore(e.cb, e.foe, 'load_special', {})).score).toBe(0);
  });
});

describe('Shift (18)', () => {
  it('base: 1 tile from cover to cover, 1 AP, and a held Watch doesn\'t fire', () => {
    const f = gunFight('hellraiser_service_rifle', ['shift'], { at: 'E4', foeAt: 'L4', foeWeapon: 'hellraiser_service_rifle' });
    f.turn(f.foe); expect(f.use(f.foe, 'overwatch')).toBeNull(); expect(f.foe.watch?.id).toBe('overwatch');
    f.turn(f.pc); rig({ hit: true, die: 12 }); const hp = f.pc.hp;
    let pv: any; unchanged(f, () => { pv = f.pv('shift', { tile: f.tile('E5') }); });
    expect(pv.ok).toBe(true); expect(pv.moves).toEqual([{ unit: f.pc.id, to: f.tile('E5') }]);
    expect(f.tech('shift', { tile: 'E5' })).toBeNull();
    expect(f.pc.pos).toBe(f.tile('E5')); expect(f.pc.ap).toBe(5); expect(f.pc.hp).toBe(hp); expect(f.foe.watch?.id).toBe('overwatch');
    // a plain walk does set it off
    f.walk(f.pc, 'E4'); expect(f.foe.watch).toBeUndefined(); expect(f.pc.hp).toBeLessThan(hp);
  });
  it('the old Overwatch doesn\'t fire either', () => {
    const f = gunFight('hellraiser_service_rifle', ['shift'], { at: 'E4', foeAt: 'L4', foeWeapon: 'hellraiser_service_rifle' });
    f.unit(f.foe.id).overwatch = 'shot'; rig({ hit: true, die: 12 }); const hp = f.pc.hp;
    expect(f.tech('shift', { tile: 'E5' })).toBeNull(); expect(f.pc.hp).toBe(hp); expect(f.foe.overwatch).toBe('shot');
  });
  it('Quick: 2 tiles; without Quick 2 is too far', () => {
    const f = gunFight('service_pistol', ['shift'], { at: 'E4' }); expect(f.tech('shift', { tile: 'E6' })).toBeNull(); expect(f.pc.pos).toBe(f.tile('E6'));
    const g = gunFight('hellraiser_service_rifle', ['shift'], { at: 'E4' }); expect(g.tech('shift', { tile: 'E6' })).toBe('Too far: Shift moves 1 tile.');
  });
  it('Heavy: you stay Braced; without Heavy the move ends it', () => {
    const f = gunFight('hellraiser_lmg', ['shift', 'brace'], { at: 'E4' }); f.tech('brace');
    expect(f.tech('shift', { tile: 'E5' })).toBeNull(); expect(f.pc.braced).toBe(true);
    const g = gunFight('hellraiser_service_rifle', ['shift', 'brace'], { at: 'E4' }); g.tech('brace');
    expect(g.tech('shift', { tile: 'E5' })).toBeNull(); expect(g.pc.braced).toBe(false);
  });
  it('refusals: no tile, not in cover, a tile out of cover, an occupied tile', () => {
    const f = gunFight('hellraiser_service_rifle', ['shift'], { at: 'E4' });
    expect(f.tech('shift')).toBe('Name a tile.');
    expect(f.tech('shift', { tile: 'D3' })).toBe('That tile isn\'t in cover.');
    const g = gunFight('hellraiser_service_rifle', ['shift'], { at: 'C5' }); expect(g.tech('shift', { tile: 'C6' })).toBe('You aren\'t in cover.');
    const h = gunFight('hellraiser_service_rifle', ['shift'], { at: 'E4', foeAt: 'E5' }); expect(h.tech('shift', { tile: 'E5' })).toMatch(/Too far/);
    expect(f.pc.ap).toBe(6);
  });
  it('enemies under fire slide to the covered tile fewer players see', () => {
    const f = gunFight('hellraiser_service_rifle', [], { at: 'C7', foeAt: 'L6' }); // the foe beside the pillar (K7–K8), in sight
    f.foe.techs = ['shift']; f.turn(f.foe);
    expect(f.bound(() => phys.aiScore(f.cb, f.foe, 'shift', {})).score).toBe(0); // no Pressure: no reason
    f.press(f.foe, 1, f.pc);
    const s = f.bound(() => phys.aiScore(f.cb, f.foe, 'shift', {}));
    expect(s).toEqual({ score: 6, args: { tile: f.tile('L7') } }); // behind the pillar from C7
    expect(f.use(f.foe, 'shift', s.args)).toBeNull(); expect(f.foe.pos).toBe(f.tile('L7'));
  });
  it('a Shift ends the user\'s Bead (it is a move); a bead set to null (smoke) is gone', () => {
    const f = gunFight('hellraiser_service_rifle', ['shift', 'bead'], { at: 'E4', foeAt: 'L5' });
    f.tech('bead', { targetId: f.foe.id }); f.tech('shift', { tile: 'E5' }); expect(f.pc.tech?.bead?.targetId).toBeNull();
    const g = gunFight('service_pistol', ['bead'], { foeAt: 'L5' }); g.tech('bead', { targetId: g.foe.id });
    g.unit(g.pc.id).tech!.bead.targetId = null; expect(shotPv(g, g.foe.id).rangePenalty).toBe(-2);
  });
});

describe('Vent (19)', () => {
  it('base: −2 Heat now for 1 AP; Heavy −4; never below 0', () => {
    const f = gunFight('hellraiser_service_rifle', ['vent']); f.unit(f.pc.id).heat = 5;
    let pv: any; unchanged(f, () => { pv = f.pv('vent'); }); expect(pv.notes[0]).toBe('Heat 5 → 3.');
    expect(f.tech('vent')).toBeNull(); expect(f.pc.heat).toBe(3); expect(f.pc.ap).toBe(5);
    const h = gunFight('hellraiser_lmg', ['vent']); h.unit(h.pc.id).heat = 6;
    expect(h.tech('vent')).toBeNull(); expect(h.pc.heat).toBe(2);
    const low = gunFight('hellraiser_service_rifle', ['vent']); low.unit(low.pc.id).heat = 1; low.tech('vent'); expect(low.pc.heat).toBe(0);
  });
  it('refusals: a cool barrel, a weapon without Heat, a Drawn weapon', () => {
    expect(gunFight('hellraiser_service_rifle', ['vent']).tech('vent')).toMatch(/barrel is cool/);
    expect(gunFight('crossbow', ['vent']).tech('vent')).toBe('This weapon doesn\'t heat up.');
    expect(gunFight('longbow', ['vent']).tech('vent')).toMatch(/Not available with a drawn weapon/);
  });
  it('enemies vent when close to the limit', () => {
    const f = gunFight('service_pistol', [], { foeWeapon: 'service_pistol' }); f.foe.techs = ['vent']; f.turn(f.foe);
    f.unit(f.foe.id).heat = 2; expect(f.bound(() => phys.aiScore(f.cb, f.foe, 'vent', {})).score).toBe(0);
    f.unit(f.foe.id).heat = 4; expect(f.bound(() => phys.aiScore(f.cb, f.foe, 'vent', {})).score).toBe(7);
  });
});

describe('Head Down (20)', () => {
  it('base: −1 Pressure from yourself; −2 behind full cover; the preview says the same', () => {
    const f = gunFight('hellraiser_service_rifle', ['head_down']); f.press(f.pc, 3, f.foe);
    let pv: any; unchanged(f, () => { pv = f.pv('head_down'); }); expect(pv.pressure).toEqual([{ unit: f.pc.id, add: -1, after: 2, state: 'pressed' }]);
    expect(f.tech('head_down')).toBeNull(); expect(f.pressure(f.pc)).toBe(pv.pressure[0].after); expect(f.pc.ap).toBe(5);
    const g = gunFight('hellraiser_service_rifle', ['head_down'], { at: 'J7' }); g.press(g.pc, 3, g.foe); // next to the pillar
    const gp = g.pv('head_down'); expect(gp.pressure?.[0].after).toBe(1);
    expect(g.tech('head_down')).toBeNull(); expect(g.pressure(g.pc)).toBe(1);
  });
  it('no Watch this round: every Watch technique and the old Overwatch are refused; a held one ends; next round is fine', () => {
    const f = gunFight('hellraiser_service_rifle', ['head_down', 'deny', 'cover_me', 'dead_to_rights']); f.press(f.pc, 1, f.foe);
    expect(f.tech('overwatch')).toBeNull(); expect(f.pc.watch?.id).toBe('overwatch');
    expect(f.tech('head_down')).toBeNull(); expect(f.pc.watch).toBeUndefined(); expect(f.pressure(f.pc)).toBe(0);
    for (const id of ['overwatch', 'deny', 'cover_me', 'dead_to_rights']) expect(f.tech(id, { tile: 'H5', targetId: f.foe.id, allyId: f.pc.id }), id).toBe('Head down: no held shot this round.');
    expect(() => f.act({ type: 'combat/overwatch', unitId: f.pc.id, mode: 'shot' } as any)).toThrow(/Head down/);
    f.cb.round += 1; f.turn(f.pc); expect(f.tech('overwatch')).toBeNull();
  });
  it('refused with no Pressure on you; an enemy wants it when Pressed', () => {
    expect(gunFight('hellraiser_service_rifle', ['head_down']).tech('head_down')).toBe('You aren\'t under Pressure.');
    const f = gunFight('service_pistol', []); f.foe.techs = ['head_down']; f.turn(f.foe);
    f.press(f.foe, 1, f.pc); expect(f.bound(() => phys.aiScore(f.cb, f.foe, 'head_down', {})).score).toBe(0);
    f.press(f.foe, 2, f.pc); expect(f.bound(() => phys.aiScore(f.cb, f.foe, 'head_down', {})).score).toBe(6);
    expect(f.use(f.foe, 'head_down')).toBeNull(); expect(f.pressure(f.foe)).toBe(1);
  });
});

describe('previews change nothing', () => {
  it('every Set, with and without its arguments', () => {
    const f = squadFight('hellraiser_lmg', 'service_pistol'); give(f, 'hollow_point', 2, f.pcs[0]);
    phys.ensurePhys(f.char(f.pcs[0])).known.push('bead', 'brace', 'load_special', 'shift', 'vent', 'head_down');
    f.press(f.pcs[0], 2, f.foe); f.unit(f.pcs[0].id).heat = 4;
    unchanged(f, () => {
      for (const id of ['bead', 'spot', 'brace', 'load_special', 'shift', 'vent', 'head_down']) { f.pv(id, { targetId: f.foe.id, tile: f.tile('C6'), ammo: 'hollow_point' }); f.pv(id, {}); }
    });
  });
});

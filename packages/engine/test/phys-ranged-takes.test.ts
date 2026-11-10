// Physical 2.0 (rules 1.12), the ranged Takes: Pin Down, Rout, Stopping Shot, Storm and Last Round (Dead Centre is the
// lead's, in phys-core.test.ts). A Take needs a Pressed target, is one a turn, its hit adds no Pressure, and the target
// loses 2 Pressure after it; the Suppressed line reads the target's Pressure when the Take began.
import { describe, it, expect, vi, beforeEach } from 'vitest';
// Saves roll a d20 that the attack rig doesn't reach: D.die forces every d20 (the attack's own is then set by rig()).
// 1 always fails a save, 20 always makes it. The real roll is still drawn, so the seeded stream doesn't move.
const D = vi.hoisted(() => ({ die: null as number | null }));
vi.mock('../src/rng', async (orig) => { const m: any = await orig(); return { ...m, d20: (r: any) => { const v = m.d20(r); return D.die ?? v; } }; });
import { phys, type Unit, type TechPreview } from '../src';
import { physFight, rig, type PhysSpec } from './helpers/physfight';
import { gameText as snap, term, calm } from './helpers/physfight-ranged';

// ---------- helpers (the shared ones are in helpers/physfight-ranged.ts) ----------
const TAKES = ['pin_down', 'rout', 'stopping_shot', 'storm', 'last_round'];
interface Foe { at: string; tier?: string; weapon?: string }
/** A PC (C3 by default, knowing every Take) against foes on row 3 of the yard; extra PCs stand where given. Every
 * meter, condition and HP is reset and it is the first PC's turn. */
function fight(o: { weapon?: string; at?: string; foes?: Foe[]; pcs?: (PhysSpec & { at: string })[] } = {}) {
  const foes = o.foes || [{ at: 'H3' }];
  const f = physFight([{ weapon: o.weapon || 'service_pistol', known: TAKES, skills: { dexterity: 6 } }, ...(o.pcs || [])], foes.map((x) => ({ tier: 'soldier', ...x })));
  f.put(f.pc, o.at || 'C3'); (o.pcs || []).forEach((p, i) => f.put(f.pcs[i + 1], p.at)); foes.forEach((x, i) => f.put(f.foes[i], x.at));
  calm(f); for (const u of f.cb.units) delete u.apDebt;
  f.turn(f.pc); D.die = null; rig(null);
  return f;
}
type F = ReturnType<typeof fight>;
const fails = () => { D.die = 1; };
const saves = () => { D.die = 20; };
const at = (f: F, u: Unit) => f.unit(u.id).pos;
const lastShot = (f: F) => f.fx('shot').slice(-1)[0];
const multOf = (pv: TechPreview, label: string) => pv.attacks[0]?.pv.dmg?.mults.find((t) => t.label === label)?.v;
beforeEach(() => { D.die = null; rig(null); });

describe('the Takes, as the core runs them', () => {
  it('are built, and each is refused against a target that isn\'t Pressed (nothing spent)', () => {
    for (const id of TAKES) expect(phys.handlerOf(id), id).toBeTruthy();
    const f = fight(); f.press(f.foe, 1, f.pc); f.pc.ammo = 1;
    for (const id of TAKES) expect(f.tech(id, { targetId: f.foe.id }), id).toMatch(/isn't Pressed/);
    expect(f.pc.ap).toBe(6); expect(f.pc.ammo).toBe(1);
    expect(f.pad().find((g) => g.group === 'take')!.entries.filter((e) => TAKES.includes(e.id)).every((e) => e.built)).toBe(true);
  });
  it('are one a turn, and the target loses 2 Pressure after, hit or miss; a Take\'s hit adds none', () => {
    const f = fight(); f.press(f.foe, 3, f.pc); rig({ hit: true, die: 12 }); saves();
    expect(f.tech('stopping_shot', { targetId: f.foe.id })).toBeNull(); expect(f.pressure(f.foe)).toBe(1);
    f.press(f.foe, 3, f.pc); expect(f.tech('pin_down', { targetId: f.foe.id })).toMatch(/One Take a turn/);
    const g = fight(); g.press(g.foe, 2, g.pc); rig({ hit: false, die: 3 });
    expect(g.tech('pin_down', { targetId: g.foe.id })).toBeNull(); expect(g.pressure(g.foe)).toBe(0);
  });
  it('the caps: a boss at 2 is Pressed and goes to 0; an elite at 3 to 1; a player at 3 to 1', () => {
    const b = fight({ foes: [{ at: 'H3', tier: 'boss' }] }); expect(b.press(b.foe, 9, b.pc)).toBe(2); rig({ hit: true, die: 12 }); saves();
    expect(b.tech('pin_down', { targetId: b.foe.id })).toBeNull(); expect(b.pressure(b.foe)).toBe(0);
    const e = fight({ foes: [{ at: 'H3', tier: 'elite' }] }); expect(e.press(e.foe, 9, e.pc)).toBe(3); rig({ hit: true, die: 12 }); saves();
    expect(e.tech('stopping_shot', { targetId: e.foe.id })).toBeNull(); expect(e.pressure(e.foe)).toBe(1);
    // an enemy uses a Take on a player
    const p = fight({ foes: [{ at: 'H3', tier: 'elite', weapon: 'service_pistol' }] }); p.foe.techs = ['stopping_shot'];
    expect(p.press(p.pc, 9, p.foe)).toBe(3); p.turn(p.foe); rig({ hit: true, die: 12 }); saves();
    expect(p.use(p.foe, 'stopping_shot', { targetId: p.pc.id })).toBeNull(); expect(p.pressure(p.pc)).toBe(1);
  });
});

describe('Pin Down', () => {
  it('base: 3 AP, a round, ×0.7; a failed save Pins it for a round, and it is Stopped once', () => {
    const f = fight(); f.press(f.foe, 2, f.pc); rig({ hit: true, die: 12 }); fails();
    const before = snap(f), pv = f.pv('pin_down', { targetId: f.foe.id });
    expect(snap(f)).toBe(before);
    expect(pv.ok).toBe(true); expect(pv.ap).toBe(3); expect(pv.rounds).toBe(1);
    expect(multOf(pv, 'Pin Down')).toBe(0.7); expect(pv.saves).toEqual([{ unit: f.foe.id, skills: ['guts', 'athletics'], tn: 12 }]);
    expect(pv.pressure?.find((x) => x.unit === f.foe.id)?.after).toBe(0);
    const a0 = f.pc.ammo, h0 = f.pc.heat;
    expect(f.tech('pin_down', { targetId: f.foe.id })).toBeNull();
    expect(f.pc.ap).toBe(3); expect(f.pc.ammo).toBe(a0 - 1);
    expect(f.foe.conds?.pinned).toBe(1); expect(f.foe.stopped).toBe(1); expect(f.pressure(f.foe)).toBe(0);
    expect(f.foe.apDebt || 0).toBe(0); // no nail without Drawn or Silent
    // Heat as a plain Shot with the same weapon
    const s = fight(); rig({ hit: true, die: 12 }); const sh0 = s.pc.heat; s.tech('shot', { targetId: s.foe.id }); expect(f.pc.heat - h0).toBe(s.pc.heat - sh0);
    // the damage the card showed is the damage dealt (less the armour)
    expect(lastShot(f).dmg).toBe(Math.round(pv.attacks[0].pv.dmg!.total - pv.attacks[0].pv.dmg!.armour));
    // Recoil: the Take's shot had none (the first of the turn) and counts toward the next one's
    expect(term(pv, 0, 'recoil')).toBeUndefined(); expect(f.pc.shotsThisTurn).toBe(1);
    f.pc.dexterity = 0; expect(term(f.pv('shot', { targetId: f.foe.id }), 0, 'recoil')).toBe(-1);
  });
  it('a made save, or a miss, pins nothing (the Pressure still goes)', () => {
    const f = fight(); f.press(f.foe, 2, f.pc); rig({ hit: true, die: 12 }); saves();
    f.tech('pin_down', { targetId: f.foe.id }); expect(f.foe.conds?.pinned).toBeFalsy(); expect(f.foe.stopped).toBeUndefined();
    const g = fight(); g.press(g.foe, 2, g.pc); rig({ hit: false, die: 3 }); fails();
    g.tech('pin_down', { targetId: g.foe.id }); expect(g.foe.conds?.pinned).toBeFalsy(); expect(g.pressure(g.foe)).toBe(0);
  });
  it('Suppressed: the save is at −2', () => {
    const f = fight(); f.press(f.foe, 3, f.pc);
    expect(f.pv('pin_down', { targetId: f.foe.id }).saves?.[0].tn).toBe(14);
  });
  it('Auto: full damage; without it, ×0.7', () => {
    const f = fight({ weapon: 'decrkm_smg' }); f.press(f.foe, 2, f.pc);
    expect(multOf(f.pv('pin_down', { targetId: f.foe.id }), 'Pin Down')).toBeUndefined();
  });
  it('Drawn or Silent: nailed in place until it spends 2 AP: it pays them as its next turn starts, and is then free to move (review fix)', () => {
    for (const weapon of ['parlour_pistol', 'recurve_bow']) {
      const f = fight({ weapon }); f.pc.ammo = 2; f.press(f.foe, 2, f.pc); rig({ hit: true, die: 12 }); fails();
      expect(f.pv('pin_down', { targetId: f.foe.id }).notes.some((n) => /nailed in place until it spends 2 AP/.test(n)), weapon).toBe(true);
      expect(f.tech('pin_down', { targetId: f.foe.id }), weapon).toBeNull();
      expect(f.foe.conds?.pinned, weapon).toBe(1); expect(f.foe.apDebt, weapon).toBe(2);
      expect(f.walk(f.foe, 'H4'), weapon).toMatch(/^Pinned/); // nailed until it pays
      f.turn(f.foe); expect(f.foe.ap, weapon).toBe(4); expect(f.foe.conds?.pinned, weapon).toBeFalsy();
      expect(f.cb.log.some((l) => /tears free of the pin \(2 AP\)/.test(l)), weapon).toBe(true);
      expect(f.walk(f.foe, 'H4'), weapon).toBeNull(); // paid: it moves
    }
    // the base pin holds through the target's whole next turn, with no AP to pay
    const g = fight(); g.press(g.foe, 2, g.pc); rig({ hit: true, die: 12 }); fails(); g.tech('pin_down', { targetId: g.foe.id });
    g.turn(g.foe); expect(g.foe.ap).toBe(6); expect(g.foe.conds?.pinned).toBeTruthy(); expect(g.walk(g.foe, 'H4')).toMatch(/^Pinned/);
  });
  it('Stopped once: a second stop by another gunner fails until the end of the target\'s next turn', () => {
    const f = fight({ pcs: [{ at: 'C5', weapon: 'service_pistol', known: TAKES }] }); f.press(f.foe, 3, f.pc); rig({ hit: true, die: 12 }); fails();
    f.tech('pin_down', { targetId: f.foe.id }); expect(f.foe.stopped).toBe(1);
    f.turn(f.pcs[1]); f.press(f.foe, 3, f.pcs[1]); rig({ hit: true, die: 12 }); fails();
    expect(f.tech('stopping_shot', { targetId: f.foe.id })).toBeNull();
    expect(at(f, f.foe)).toBe(f.tile('H3')); expect(f.foe.apDebt || 0).toBe(0); // not pushed: Stopped once
    expect(f.cb.log.some((l) => /can't be stopped again/.test(l))).toBe(true);
    f.turn(f.foe); f.pass(); expect(f.unit(f.foe.id).stopped).toBeUndefined();
  });
});

describe('Rout', () => {
  it('its round is a shot by today\'s rules: +1 Heat, Recoil for later shots, wear, and the report reveals a Hidden shooter (review fix)', () => {
    const f = fight({ weapon: 'service_pistol' }); f.press(f.foe, 2, f.pc); saves(); f.pc.hidden = true; f.pc.dexterity = 0; const d0 = f.pc.dur ?? 0;
    expect(f.tech('rout', { targetId: f.foe.id })).toBeNull();
    expect(f.pc.heat).toBe(1); // the round's 1 (a Take adds no Press Heat)
    expect(f.pc.shotsThisTurn).toBe(1); expect(f.pc.hidden).toBe(false); if (f.pc.maxDur) expect(f.pc.dur).toBe(d0 - 1);
    expect(f.fx('shot').at(-1)).toMatchObject({ unit: f.pc.id, rout: true });
    expect(term(f.pv('shot', { targetId: f.foe.id }), 0, 'recoil')).toBe(-1);
    const s = fight({ weapon: 'parlour_pistol' }); s.press(s.foe, 2, s.pc); saves(); s.pc.hidden = true;
    expect(s.tech('rout', { targetId: s.foe.id })).toBeNull(); expect(s.pc.hidden).toBe(true); // Silent: no report
  });
  it('base: no damage, a round; a failed Heart save runs it its full move away, with the engine\'s own walk', () => {
    const f = fight({ at: 'A3', foes: [{ at: 'D3' }] }); f.press(f.foe, 2, f.pc); fails();
    const before = snap(f), pv = f.pv('rout', { targetId: f.foe.id });
    expect(snap(f)).toBe(before);
    expect(pv.ok).toBe(true); expect(pv.ap).toBe(3); expect(pv.rounds).toBe(1); expect(pv.attacks).toEqual([]);
    expect(pv.saves).toEqual([{ unit: f.foe.id, skills: ['heart'], tn: 12 }]);
    const to = pv.moves![0].to; expect(pv.moves![0].unit).toBe(f.foe.id);
    const hp = f.foe.hp, a0 = f.pc.ammo, fap = f.foe.ap;
    expect(f.tech('rout', { targetId: f.foe.id })).toBeNull();
    expect(at(f, f.foe)).toBe(to); expect(f.foe.hp).toBe(hp); expect(f.pc.ammo).toBe(a0 - 1); expect(f.pc.ap).toBe(3);
    expect(f.foe.ap).toBe(fap); // the run costs it nothing
    // its full move (a fresh turn's AP of its movement), farther from the user than it stood
    const [x] = to.split(',').map(Number); expect(x - 3).toBe(Math.floor(6 * f.foe.movement)); expect(f.pressure(f.foe)).toBe(0);
    expect(f.cb.log.some((l) => /breaks and runs/.test(l))).toBe(true);
  });
  it('a made save keeps it where it is', () => {
    const f = fight(); f.press(f.foe, 2, f.pc); saves();
    f.tech('rout', { targetId: f.foe.id }); expect(at(f, f.foe)).toBe(f.tile('H3')); expect(f.pressure(f.foe)).toBe(0);
  });
  it('Suppressed: the save is at −3; Loud: −2 more', () => {
    const f = fight(); f.press(f.foe, 3, f.pc); expect(f.pv('rout', { targetId: f.foe.id }).saves?.[0].tn).toBe(15);
    const l = fight({ weapon: 'magistrate_pistol' }); l.press(l.foe, 2, l.pc); expect(l.pv('rout', { targetId: l.foe.id }).saves?.[0].tn).toBe(14);
    l.press(l.foe, 3, l.pc); expect(l.pv('rout', { targetId: l.foe.id }).saves?.[0].tn).toBe(17);
  });
  it('the run draws opportunity attacks and held shots', () => {
    const f = fight({ pcs: [{ at: 'I3', weapon: 'sabre' }, { at: 'C8', weapon: 'service_pistol' }] });
    f.turn(f.pcs[2]); expect(f.use(f.pcs[2], 'overwatch')).toBeNull(); f.turn(f.pc);
    f.press(f.foe, 2, f.pc); rig({ hit: true, die: 12 }); fails();
    const hp = f.foe.hp;
    expect(f.tech('rout', { targetId: f.foe.id })).toBeNull();
    expect(f.cb.log.some((l) => /Tester 2 takes an opportunity attack/.test(l))).toBe(true);
    expect(f.cb.log.some((l) => /Tester 3 fires from overwatch/.test(l))).toBe(true);
    expect(f.foe.hp).toBeLessThan(hp);
  });
  it('a Prone target can\'t run', () => {
    const f = fight(); f.press(f.foe, 2, f.pc); f.foe.prone = true; fails();
    expect(f.pv('rout', { targetId: f.foe.id }).moves).toBeUndefined();
    expect(f.tech('rout', { targetId: f.foe.id })).toBeNull(); expect(at(f, f.foe)).toBe(f.tile('H3'));
    expect(f.cb.log.some((l) => /can't run/.test(l))).toBe(true);
  });
  it('Blast: everyone Pressed in the radius saves or runs, and pays the Take\'s 2; the rest are left alone', () => {
    const f = fight({ weapon: 'smetanita_thumper', foes: [{ at: 'H3' }, { at: 'I4' }, { at: 'H5' }, { at: 'L3' }] });
    const [a, b, c, d] = f.foes; f.press(a, 3, f.pc); f.press(b, 2, f.pc); f.press(d, 3, f.pc); fails();
    const pv = f.pv('rout', { targetId: a.id });
    expect(pv.saves?.map((s) => s.unit)).toEqual([a.id, b.id]); expect(pv.saves?.map((s) => s.tn)).toEqual([15, 12]);
    expect(pv.pressure?.find((x) => x.unit === b.id)?.after).toBe(0);
    expect(f.tech('rout', { targetId: a.id })).toBeNull();
    expect(at(f, a)).not.toBe(f.tile('H3')); expect(at(f, b)).not.toBe(f.tile('I4'));
    expect(at(f, c)).toBe(f.tile('H5')); expect(at(f, d)).toBe(f.tile('L3')); // c isn't Pressed; d is outside the radius
    expect(f.pressure(a)).toBe(1); expect(f.pressure(b)).toBe(0); expect(f.pressure(d)).toBe(3);
    const n = fight({ foes: [{ at: 'H3' }, { at: 'I4' }] }); n.press(n.foes[0], 2, n.pc); n.press(n.foes[1], 2, n.pc);
    expect(n.pv('rout', { targetId: n.foes[0].id }).saves?.length).toBe(1); // no Blast: the target only
  });
});

describe('Stopping Shot', () => {
  it('base: 2 AP, a round; on a hit and a failed save it loses 1 AP next turn and is pushed 1', () => {
    const f = fight(); f.press(f.foe, 2, f.pc); rig({ hit: true, die: 12 }); fails();
    const before = snap(f), pv = f.pv('stopping_shot', { targetId: f.foe.id });
    expect(snap(f)).toBe(before);
    expect(pv.ap).toBe(2); expect(pv.rounds).toBe(1); expect(pv.saves?.[0].tn).toBe(12);
    expect(pv.moves).toEqual([{ unit: f.foe.id, to: f.tile('I3') }]);
    expect(f.tech('stopping_shot', { targetId: f.foe.id })).toBeNull();
    expect(at(f, f.foe)).toBe(f.tile('I3')); expect(f.foe.apDebt).toBe(1); expect(f.foe.prone).toBeFalsy(); expect(f.foe.stopped).toBe(1);
    expect(f.pc.ap).toBe(4); expect(f.pressure(f.foe)).toBe(0);
    f.turn(f.foe); expect(f.foe.ap).toBe(5);
  });
  it('a made save or a miss: nothing', () => {
    const f = fight(); f.press(f.foe, 2, f.pc); rig({ hit: true, die: 12 }); saves();
    f.tech('stopping_shot', { targetId: f.foe.id }); expect(at(f, f.foe)).toBe(f.tile('H3')); expect(f.foe.apDebt || 0).toBe(0);
    const g = fight(); g.press(g.foe, 2, g.pc); rig({ hit: false, die: 3 }); fails();
    g.tech('stopping_shot', { targetId: g.foe.id }); expect(at(g, g.foe)).toBe(g.tile('H3'));
  });
  it('Suppressed: it also falls Prone on a failed save', () => {
    const f = fight(); f.press(f.foe, 3, f.pc); rig({ hit: true, die: 12 }); fails();
    f.tech('stopping_shot', { targetId: f.foe.id }); expect(f.foe.prone).toBe(true); expect(at(f, f.foe)).toBe(f.tile('I3'));
  });
  it('Loud or Heavy: pushed 2', () => {
    for (const weapon of ['magistrate_pistol', 'hellraiser_lmg']) {
      const f = fight({ weapon }); f.press(f.foe, 2, f.pc); rig({ hit: true, die: 12 }); fails();
      expect(f.tech('stopping_shot', { targetId: f.foe.id }), weapon).toBeNull(); expect(at(f, f.foe), weapon).toBe(f.tile('J3'));
    }
  });
  it('Spread: within 4 tiles, pushed 2 and Prone though not Suppressed; farther, the plain push', () => {
    const f = fight({ weapon: 'sawn_off', foes: [{ at: 'G3' }] }); f.press(f.foe, 2, f.pc); rig({ hit: true, die: 12 }); fails();
    expect(f.tech('stopping_shot', { targetId: f.foe.id })).toBeNull(); expect(at(f, f.foe)).toBe(f.tile('I3')); expect(f.foe.prone).toBe(true);
    const g = fight({ weapon: 'sawn_off', foes: [{ at: 'H3' }] }); g.press(g.foe, 2, g.pc); rig({ hit: true, die: 12 }); fails();
    expect(g.tech('stopping_shot', { targetId: g.foe.id })).toBeNull(); expect(at(g, g.foe)).toBe(g.tile('I3')); expect(g.foe.prone).toBeFalsy();
  });
});

describe('Storm', () => {
  it('base: 3 AP, up to 3 tiles toward the target for nothing, then the shot', () => {
    const f = fight({ foes: [{ at: 'L3' }] }); f.press(f.foe, 2, f.pc); rig({ hit: true, die: 12 });
    const before = snap(f), pv = f.pv('storm', { targetId: f.foe.id });
    expect(snap(f)).toBe(before);
    expect(pv.ok).toBe(true); expect(pv.ap).toBe(3); expect(pv.rounds).toBe(1); expect(pv.moves).toEqual([{ unit: f.pc.id, to: f.tile('F3') }]);
    const hp = f.foe.hp;
    expect(f.tech('storm', { targetId: f.foe.id })).toBeNull();
    expect(at(f, f.pc)).toBe(f.tile('F3')); expect(f.pc.ap).toBe(3); expect(f.foe.hp).toBeLessThan(hp);
    expect(lastShot(f).from).toBe(f.tile('F3')); expect(f.pressure(f.foe)).toBe(0); expect(f.pc.moved).toBe(true);
    expect(lastShot(f).dmg).toBe(Math.round(pv.attacks[0].pv.dmg!.total - pv.attacks[0].pv.dmg!.armour));
  });
  it('the target can\'t react to the move; anyone else can', () => {
    // the plain walk sets the target's held shot off
    const w = fight({ foes: [{ at: 'L3' }] }); w.turn(w.foe); expect(w.use(w.foe, 'overwatch')).toBeNull(); w.turn(w.pc); rig({ hit: true, die: 12 });
    w.walk(w.pc, 'F3'); expect(w.cb.log.some((l) => /Foe 1 fires from overwatch/.test(l))).toBe(true);
    const f = fight({ foes: [{ at: 'L3' }, { at: 'J1' }] });
    for (const u of f.foes) { f.turn(u); expect(f.use(u, 'overwatch')).toBeNull(); }
    f.turn(f.pc); f.press(f.foe, 2, f.pc); rig({ hit: true, die: 12 });
    expect(f.tech('storm', { targetId: f.foe.id })).toBeNull();
    expect(f.cb.log.some((l) => /Foe 1 fires from overwatch/.test(l))).toBe(false);
    expect(f.cb.log.some((l) => /Foe 2 fires from overwatch/.test(l))).toBe(true);
  });
  it('a named tile must be within 3 tiles and nearer the target', () => {
    const f = fight({ foes: [{ at: 'L3' }] }); f.press(f.foe, 2, f.pc);
    expect(f.tech('storm', { targetId: f.foe.id, tile: f.tile('H3') })).toMatch(/up to 3 tiles/);
    expect(f.tech('storm', { targetId: f.foe.id, tile: f.tile('A3') })).toMatch(/toward the target/);
    expect(f.pc.ap).toBe(6);
    rig({ hit: true, die: 12 }); expect(f.tech('storm', { targetId: f.foe.id, tile: f.tile('E4') })).toBeNull(); expect(at(f, f.pc)).toBe(f.tile('E4'));
  });
  it('Pinned, it shoots from where it stands; a named tile is refused', () => {
    const f = fight(); f.press(f.foe, 2, f.pc); f.pc.conds = { pinned: 2 };
    const pv = f.pv('storm', { targetId: f.foe.id }); expect(pv.ok).toBe(true); expect(pv.moves).toBeUndefined();
    expect(f.tech('storm', { targetId: f.foe.id, tile: f.tile('E3') })).toMatch(/Pinned/);
  });
  it('Suppressed: the shot is a critical on 18–20', () => {
    const f = fight(); f.press(f.foe, 3, f.pc); rig({ hit: true, die: 18 });
    f.tech('storm', { targetId: f.foe.id }); expect(lastShot(f).crit).toBe(true);
    const g = fight(); g.press(g.foe, 2, g.pc); rig({ hit: true, die: 18 });
    g.tech('storm', { targetId: g.foe.id }); expect(lastShot(g).crit).toBe(false);
  });
  it('Quick: +2 to hit; without it, nothing', () => {
    const f = fight(); f.press(f.foe, 2, f.pc); expect(term(f.pv('storm', { targetId: f.foe.id }), 0, 'Storm')).toBe(2);
    const g = fight({ weapon: 'hellraiser_service_rifle' }); g.press(g.foe, 2, g.pc); expect(term(g.pv('storm', { targetId: g.foe.id }), 0, 'Storm')).toBeUndefined();
  });
  it('Spread: on a hit, a Body save or Prone', () => {
    const f = fight({ weapon: 'sawn_off' }); f.press(f.foe, 2, f.pc); rig({ hit: true, die: 12 }); fails();
    expect(f.pv('storm', { targetId: f.foe.id }).saves).toBeUndefined(); // its first line is Quick: the player picks Spread
    const pv = f.pv('storm', { targetId: f.foe.id, line: 'spread' }); expect(pv.saves).toEqual([{ unit: f.foe.id, skills: ['body'], tn: 12 }]);
    expect(term(pv, 0, 'Storm')).toBeUndefined(); // one line at a time
    expect(f.tech('storm', { targetId: f.foe.id, line: 'spread' })).toBeNull(); expect(f.foe.prone).toBe(true); expect(f.foe.stopped).toBe(1);
    const g = fight({ weapon: 'sawn_off' }); g.press(g.foe, 2, g.pc); rig({ hit: true, die: 12 }); saves();
    g.tech('storm', { targetId: g.foe.id, line: 'spread' }); expect(g.foe.prone).toBeFalsy();
    const s = fight(); s.press(s.foe, 2, s.pc); rig({ hit: true, die: 12 }); fails();
    s.tech('storm', { targetId: s.foe.id }); expect(s.foe.prone).toBeFalsy(); // no Spread, no knock-down
  });
});

describe('Last Round', () => {
  it('only with exactly one round loaded', () => {
    const f = fight(); f.press(f.foe, 2, f.pc);
    expect(f.tech('last_round', { targetId: f.foe.id })).toMatch(/last round/); expect(f.pc.ap).toBe(6);
  });
  it('base: 2 AP, +3 to hit; a kill makes the next speed reload free, once; a tactical one keeps it', () => {
    const f = fight(); f.press(f.foe, 2, f.pc); f.pc.ammo = 1; f.pc.mags = [12, 12, 12];
    const before = snap(f), pv = f.pv('last_round', { targetId: f.foe.id });
    expect(snap(f)).toBe(before);
    expect(pv.ap).toBe(2); expect(pv.rounds).toBe(1); expect(term(pv, 0, 'Last Round')).toBe(3);
    rig({ hit: true, die: 12 }); f.foe.hp = 1;
    expect(f.tech('last_round', { targetId: f.foe.id })).toBeNull();
    expect(f.foe.dead || f.foe.downed).toBe(true); expect(f.pc.ammo).toBe(0); expect(f.pc.freeReload).toBe(true);
  });
  it('the free reload is spent only by the reload that uses it: not a special load, not a reload already free (Resupply) (review fix)', async () => {
    const { emit } = await import('../src/effects/hooks'); const { reload } = await import('../src');
    const f = fight(); f.pc.ammo = 0; f.pc.mags = [12, 12, 12]; f.pc.freeReload = true;
    f.bound(() => emit(f.cb, 'reload', { u: f.unit(f.pc.id), ap: 0, cb: f.cb, special: 'incendiary' })); expect(f.pc.freeReload).toBe(true); // the Marksman's special load
    expect(f.bound(() => reload(f.cb, f.unit(f.pc.id), { free: true }))).toBeNull(); expect(f.pc.ap).toBe(6); expect(f.pc.freeReload).toBe(true); // Resupply
    f.pc.ammo = 0; f.act({ type: 'combat/reload', unitId: f.pc.id } as any); expect(f.pc.ap).toBe(6); expect(f.pc.freeReload).toBeUndefined(); // the speed reload it was for
  });
  it('the free reload: a tactical reload keeps it, the next speed reload uses it, the one after costs again', () => {
    const f = fight(); f.pc.ammo = 0; f.pc.mags = [12, 12, 12]; f.pc.freeReload = true;
    f.act({ type: 'combat/reload', unitId: f.pc.id, tactical: true } as any); expect(f.pc.ap).toBe(3); expect(f.pc.freeReload).toBe(true);
    f.pc.ammo = 0;
    f.act({ type: 'combat/reload', unitId: f.pc.id } as any); expect(f.pc.ap).toBe(3); expect(f.pc.freeReload).toBeUndefined();
    f.pc.ammo = 0; f.act({ type: 'combat/reload', unitId: f.pc.id } as any); expect(f.pc.ap).toBe(1);
  });
  it('no kill, no free reload', () => {
    const f = fight(); f.press(f.foe, 2, f.pc); f.pc.ammo = 1; rig({ hit: true, die: 12 });
    expect(f.tech('last_round', { targetId: f.foe.id })).toBeNull(); expect(f.foe.dead).toBe(false); expect(f.pc.freeReload).toBeUndefined();
  });
  it('Suppressed: its cover doesn\'t count', () => {
    const f = fight({ at: 'C5', foes: [{ at: 'G5' }] }); f.pc.ammo = 1;
    f.press(f.foe, 2, f.pc); expect(f.pv('last_round', { targetId: f.foe.id }).attacks[0].pv.cover).toBe(5);
    f.press(f.foe, 3, f.pc); expect(f.pv('last_round', { targetId: f.foe.id }).attacks[0].pv.cover).toBe(0);
  });
  it('Quick and Precise (a revolver): +50% damage; Quick alone, none', () => {
    const f = fight({ weapon: 'drifter_revolver' }); f.pc.ammo = 1; f.press(f.foe, 2, f.pc); expect(multOf(f.pv('last_round', { targetId: f.foe.id }), 'Last Round')).toBe(1.5);
    const g = fight(); g.pc.ammo = 1; g.press(g.foe, 2, g.pc); expect(multOf(g.pv('last_round', { targetId: g.foe.id }), 'Last Round')).toBeUndefined();
  });
  it('Drawn: the last arrow in the quiver counts', () => {
    // the quiver's real shape (ranged/quiver.ts): arrow type -> count, and u.ammo is always its total
    const f = fight({ weapon: 'recurve_bow' }); f.press(f.foe, 2, f.pc);
    f.pc.ammo = 3; f.pc.quiver = { standard: 2, armor_piercing: 1 }; expect(f.tech('last_round', { targetId: f.foe.id })).toMatch(/last arrow in the quiver/);
    f.pc.ammo = 1; f.pc.quiver = { armor_piercing: 1 }; rig({ hit: true, die: 12 }); expect(f.tech('last_round', { targetId: f.foe.id })).toBeNull();
    expect(f.pc.ammo).toBe(0); expect(f.pc.quiver).toEqual({});
    // a bow can't be reloaded in a fight (the quiver refuses it), so its kill makes no free reload
    const g = fight({ weapon: 'recurve_bow', foes: [{ at: 'H3' }, { at: 'J3' }] }); g.press(g.foe, 2, g.pc); g.pc.ammo = 1; g.pc.quiver = { standard: 1 }; g.foe.hp = 1; rig({ hit: true, die: 12 });
    expect(g.tech('last_round', { targetId: g.foe.id })).toBeNull(); expect(g.foe.dead || g.foe.downed).toBe(true); expect(g.pc.freeReload).toBeUndefined();
    expect(() => g.act({ type: 'combat/reload', unitId: g.pc.id } as any)).toThrow(/quiver is filled before the fight/);
  });
});

describe('the enemy AI', () => {
  it('scores each Take without changing anything', () => {
    const f = fight(); f.press(f.pc, 2, f.foe); const before = snap(f);
    for (const id of TAKES) expect(f.bound(() => phys.aiScore(f.cb, f.foe, id, { targetId: f.pc.id })).score, id).toBeGreaterThan(0);
    expect(snap(f)).toBe(before);
  });
});

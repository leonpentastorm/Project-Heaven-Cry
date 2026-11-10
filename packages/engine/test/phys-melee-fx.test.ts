// Physical 2.0, the melee technique effects (docs/design/handoffs/physical-2.0-A-FX.md): each technique emits one
// melee_fx beat (plus at most one `fall`) with the fields the client draws from; a preview emits none; the user's
// sight is stamped per side and a view keeps only its own side's stamp.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resolveAttack, applyCond, viewFor, type Unit } from '../src';
import { onHook } from '../src/effects/hooks';
import { physFight, rig } from './helpers/physfight';

// While D20.v is set every d20 the engine rolls is that number (saves fail on 2); attack rolls are rigged with rig().
const D20 = vi.hoisted(() => ({ v: null as number | null }));
vi.mock('../src/rng', async (orig) => { const m: any = await orig(); return { ...m, d20: (r: any) => (D20.v != null ? D20.v : m.d20(r)) }; });
beforeEach(() => { rig(null); D20.v = null; });

const SK = { athletics: 6, raw_power: 6, dexterity: 6 };
type F = ReturnType<typeof physFight>;
/** One PC with a weapon on C5, foes where given (default D5), the PC's turn, clear ground, foes hard to kill. */
function fight(weapon: string, known: string[], foes: string[] = ['D5'], m = 0) {
  const f = physFight([{ weapon, known, skills: SK }], foes.map((at) => ({ at, tier: 'soldier' })), { seed: 'MFX1' });
  f.cb.objects = [];
  f.put(f.pc, 'C5'); foes.forEach((at, i) => { const u = f.put(f.foes[i], at); u.hp = u.maxHp = 500; u.sv = { body: -50, brain: -50, heart: -50 } as any; });
  f.cb.order = [f.pc.id, ...f.cb.order.filter((id) => id !== f.pc.id)]; f.cb.round = 1;
  f.turn(f.pc); if (m) f.momentum(f.pc, m);
  return f;
}
const mfx = (f: F) => f.fx('melee_fx').filter((e: any) => !e.refused);
const beats = (f: F) => mfx(f).map((e: any) => e.beat);
/** The technique's own effect events since a mark (the fight's opening may have emitted some). */
const since = (f: F, n: number) => mfx(f).filter((e: any) => e.n > n);
const mark = (f: F) => (f.cb as any).fxSeq || 0;
const one = (f: F, n: number, beat: string) => { const l = since(f, n).filter((e: any) => e.beat === beat); expect(l.length, beat).toBe(1); return l[0]; };
const noPreviewFx = (f: F, id: string, args: any) => { const n = mark(f), before = JSON.stringify(f.g); f.pv(id, args); expect(mark(f)).toBe(n); expect(JSON.stringify(f.g)).toBe(before); };

describe('melee_fx: the shape every beat shares', () => {
  it('unit, technique id, beat, the user\'s tile and a seen stamp; a preview emits nothing', () => {
    const f = fight('sabre', ['sweep'], ['D5', 'D6']); rig({ hit: true, die: 12 });
    noPreviewFx(f, 'sweep', { tile: f.tile('D5') });
    const n = mark(f); expect(f.tech('sweep', { tile: f.tile('D5') })).toBeNull();
    const e = one(f, n, 'arc');
    expect(e).toMatchObject({ k: 'melee_fx', unit: f.pc.id, id: 'sweep', at: f.tile('C5') });
    expect(e.seen).toEqual({ pc: 1, foe: expect.any(Number) });
  });
  it('a view keeps only its own side\'s sight stamp (no hidden info for the other side)', () => {
    const f = fight('sabre', ['guard']); f.tech('guard', {});
    const v = viewFor(f.g, f.g.hostId) as any; const e = (v.combat.fx || []).find((x: any) => x.k === 'melee_fx');
    expect(e).toBeTruthy(); expect(Object.keys(e.seen)).toEqual(['pc']);
    expect(Object.keys(mfx(f)[0].seen).sort()).toEqual(['foe', 'pc']); // the engine keeps both
  });
  it('a hidden user: the other side\'s stamp says it did not see the user', () => {
    const f = fight('sabre', ['ambush']); const u = f.unit(f.pc.id); u.hidden = true; u.hideEntry = 1; u.ambushUsed = 0; rig({ hit: true, die: 12 });
    const n = mark(f); expect(f.tech('ambush', { targetId: f.foe.id })).toBeNull();
    expect(one(f, n, 'ambush')).toMatchObject({ fromHidden: true, bare: false, target: f.foe.id, to: f.tile('D5'), seen: { pc: 1, foe: 0 } });
  });
});

describe('each technique\'s beat', () => {
  it('Sweep: the arc\'s tiles and everyone struck (allies too), once', () => {
    const f = physFight([{ weapon: 'sabre', known: ['sweep'], skills: SK }, { weapon: 'sabre' }], [{ at: 'D5', tier: 'soldier' }], { seed: 'MFX1' });
    f.cb.objects = []; f.put(f.pc, 'C5'); f.put(f.foe, 'D5'); f.put(f.pcs[1], 'D4'); f.foe.hp = f.foe.maxHp = 500; f.turn(f.pc); rig({ hit: true, die: 12 });
    const n = mark(f); expect(f.tech('sweep', { tile: f.tile('D5') })).toBeNull();
    const e = one(f, n, 'arc'); expect(e.tiles).toHaveLength(3); expect(e.struck.sort()).toEqual([f.foe.id, f.pcs[1].id].sort()); expect(e.dir).toEqual([1, 0]);
    // it comes before the strikes it covers
    expect(f.fx('melee').filter((x: any) => x.n > e.n && x.unit === f.pc.id).length).toBe(2);
  });
  it('Cleave: the arc runs from the first target through each extra, in order', () => {
    const f = fight('ork_machete', ['cleave'], ['D5', 'D6'], 2); rig({ hit: true, die: 12 });
    const n = mark(f); expect(f.tech('cleave', { targetId: f.foe.id })).toBeNull();
    const e = one(f, n, 'arc'); expect(e.cleave).toBe(true); expect(e.struck).toEqual([f.foes[0].id, f.foes[1].id]); expect(e.tiles).toEqual([f.tile('D5'), f.tile('D6')]);
  });
  it('Throw: from, to and the weapon; the weapon then lands in the pile on the target\'s tile', () => {
    const f = fight('combat_knife', ['throw'], ['F5']); rig({ hit: true, die: 12 });
    const n = mark(f); expect(f.tech('throw', { targetId: f.foe.id })).toBeNull();
    const e = one(f, n, 'throw'); expect(e).toMatchObject({ from: f.tile('C5'), to: f.tile('F5'), weapon: 'combat_knife', target: f.foe.id });
    // a hit leaves the weapon in the target (0.18.1): no pile yet, it is carried there
    expect((f.unit(f.foe.id).stuck || []).length).toBe(1);
  });
  it('Bind: the link to the target; Bare: a grapple', () => {
    const f = fight('sabre', ['bind']); const n = mark(f); expect(f.tech('bind', { targetId: f.foe.id })).toBeNull();
    expect(one(f, n, 'bind')).toMatchObject({ target: f.foe.id, kind: 'bind', pen: 2 });
    const g = fight('fists', ['bind']); D20.v = 2; const m = mark(g); expect(g.tech('bind', { targetId: g.foe.id })).toBeNull();
    expect(one(g, m, 'bind')).toMatchObject({ target: g.foe.id, kind: 'grapple' });
  });
  it('Throw Down: the real path, the landing tile, and the occupant when it is slammed into someone', () => {
    const f = fight('fists', ['throw_down'], ['D5'], 2);
    f.bound(() => applyCond(f.cb, f.g.rng, f.unit(f.pc.id), f.unit(f.foe.id), 'grappled', undefined, undefined, { skipSave: true }));
    const n = mark(f); expect(f.tech('throw_down', { targetId: f.foe.id, tile: f.tile('C4') })).toBeNull();
    const e = one(f, n, 'slam'); expect(e).toMatchObject({ target: f.foe.id, from: f.tile('D5'), land: f.tile('C4'), occupant: null, prone: true });
    expect(e.path[0]).toBe(f.tile('D5')); expect(e.path[e.path.length - 1]).toBe(f.tile('C4'));
    const g = fight('fists', ['throw_down'], ['D5', 'C4'], 2);
    g.bound(() => applyCond(g.cb, g.g.rng, g.unit(g.pc.id), g.unit(g.foe.id), 'grappled', undefined, undefined, { skipSave: true }));
    const m = mark(g); expect(g.tech('throw_down', { targetId: g.foe.id, tile: g.tile('C4') })).toBeNull();
    expect(one(g, m, 'slam')).toMatchObject({ land: g.tile('C4'), occupant: g.foes[1].id, path: [g.tile('D5')] });
  });
  it('Shove, Drag and Bash\'s push: the real path the target was moved along', () => {
    const f = fight('sabre', ['shove']); f.unit(f.foe.id).strength = -50; f.unit(f.pc.id).strength = 20; D20.v = 10;
    const n = mark(f); expect(f.tech('shove', { targetId: f.foe.id })).toBeNull();
    expect(one(f, n, 'force')).toMatchObject({ target: f.foe.id, path: [f.tile('D5'), f.tile('E5')], how: 'push' });
    const g = fight('sabre', ['drag']); D20.v = 2; const m = mark(g); expect(g.tech('drag', { targetId: g.foe.id, opt: 'swap' })).toBeNull();
    expect(one(g, m, 'force')).toMatchObject({ target: g.foe.id, path: [g.tile('D5'), g.tile('C5')], how: 'swap', user: [g.tile('C5'), g.tile('D5')] });
    const h = fight('maul', ['bash']); D20.v = 2; rig({ hit: true, die: 12 }); const k = mark(h); expect(h.tech('bash', { targetId: h.foe.id, opt: 'push', line: 'heavy' })).toBeNull();
    const e = one(h, k, 'force'); expect(e.path[0]).toBe(h.tile('D5')); expect(e.path.length).toBe(3);
  });
  it('Trip, Charge and Hamstring (Hook): a fall when the target really goes down', () => {
    const f = fight('sabre', ['trip']); D20.v = 2; const n = mark(f); expect(f.tech('trip', { targetId: f.foe.id })).toBeNull();
    expect(one(f, n, 'fall')).toMatchObject({ target: f.foe.id, to: f.tile('D5') });
    const g = fight('sabre', ['trip']); D20.v = 19; g.unit(g.foe.id).sv = { body: 50 } as any; const m = mark(g); g.tech('trip', { targetId: g.foe.id });
    expect(since(g, m).filter((e: any) => e.beat === 'fall')).toHaveLength(0); // it saved: no fall
    const c = fight('maul', ['charge'], ['G5']); c.put(c.pc, 'B5'); D20.v = 2; rig({ hit: true, die: 12 });
    const k = mark(c); expect(c.tech('charge', { targetId: c.foe.id })).toBeNull();
    const ch = one(c, k, 'charge'); expect(ch.route[0]).toBe(c.tile('B5')); expect(ch.route.length).toBeGreaterThanOrEqual(4);
    expect(since(c, k).filter((e: any) => e.beat === 'fall').length).toBeLessThanOrEqual(1); // a maul's hit may already have floored it
  });
  it('Parry: the clash between the attacker and the defender, won or lost', () => {
    const f = fight('sabre', ['parry']); f.turn(f.foe); for (const u of f.cb.units) { delete (u as any).reactUsed; (u as any).reactedRound = undefined; }
    f.foe.attack = -100; rig({ hit: true, die: 10 });
    const n = mark(f); f.bound(() => resolveAttack(f.cb, f.g.rng, f.foe, f.unit(f.pc.id), 'melee', null, { noAp: true }));
    const e = one(f, n, 'parry'); expect(e).toMatchObject({ unit: f.pc.id, from: f.tile('D5'), to: f.tile('C5'), attacker: f.foe.id, ally: null, won: true });
    // after the swing's own melee event
    expect(f.fx('melee').some((x: any) => x.n < e.n && x.n > n)).toBe(true);
  });
  it('Run Through: the thrust line, and the weapon when it is left in', () => {
    const f = fight('lance', ['run_through'], ['D5'], 3); rig({ hit: true, die: 12 });
    const n = mark(f); expect(f.tech('run_through', { targetId: f.foe.id, line: 'reach', opt: 'leave' })).toBeNull();
    const e = one(f, n, 'pin'); expect(e).toMatchObject({ target: f.foe.id, line: [f.tile('C5'), f.tile('D5')], weapon: 'lance' });
    expect(f.unit(f.foe.id).nailed?.weapon).toBe('lance'); // the standing layer reads this
  });
  it('Feint: fooled or not; Guard: the front; Sidestep: from and to; Keep Back: where the mover was held', () => {
    const f = fight('sabre', ['feint']); D20.v = 2; let n = mark(f); expect(f.tech('feint', { targetId: f.foe.id })).toBeNull();
    expect(one(f, n, 'feint')).toMatchObject({ target: f.foe.id, ok: true });
    const f2 = fight('sabre', ['feint']); D20.v = 19; f2.unit(f2.foe.id).sv = { brain: 50 } as any; n = mark(f2); f2.tech('feint', { targetId: f2.foe.id });
    expect(one(f2, n, 'feint').ok).toBe(false);
    const g = fight('sabre', ['guard']); n = mark(g); expect(g.tech('guard', {})).toBeNull();
    expect(one(g, n, 'guard')).toMatchObject({ front: [1, 0], reach: false, heavy: false });
    const s = fight('maul', ['sidestep']); n = mark(s); expect(s.tech('sidestep', { targetId: s.foe.id, tile: s.tile('D6') })).toBeNull();
    expect(one(s, n, 'sidestep')).toMatchObject({ from: s.tile('C5'), to: s.tile('D6'), foe: s.foe.id, at: s.tile('D6') });
    const k = physFight([{ weapon: 'sabre', known: ['keep_back'], skills: SK }], [{ at: 'H5', tier: 'elite', weapon: 'sabre' }]);
    k.put(k.pc, 'D4'); k.put(k.foe, 'H5'); k.turn(k.foe); for (const u of k.cb.units) { delete (u as any).reactUsed; (u as any).reactedRound = undefined; }
    rig({ hit: true, die: 12 }); D20.v = 2; n = mark(k); k.walk(k.foe, 'C4');
    expect(one(k, n, 'halt')).toMatchObject({ unit: k.pc.id, target: k.foe.id, to: k.unit(k.foe.id).pos, reach: 1 });
  });
  it('Half-Sword, Sunder, Flurry, Draw Cut and Break', () => {
    const h = fight('sabre', ['half_sword']); rig({ hit: true, die: 12 }); let n = mark(h); expect(h.tech('half_sword', { targetId: h.foe.id })).toBeNull();
    expect(one(h, n, 'thrust')).toMatchObject({ target: h.foe.id, to: h.tile('D5') });
    const s = fight('maul', ['sunder']); s.unit(s.foe.id).armour = 12; rig({ hit: true, die: 12 }); n = mark(s); expect(s.tech('sunder', { targetId: s.foe.id })).toBeNull();
    expect(one(s, n, 'sunder')).toMatchObject({ target: s.foe.id, was: 12, now: 2, broken: false });
    const fl = fight('sabre', ['flurry']); rig({ hit: true, die: 12 }); n = mark(fl); expect(fl.tech('flurry', { targetId: fl.foe.id })).toBeNull();
    const e = one(fl, n, 'flurry'); expect(e.targets).toEqual([fl.foe.id]); expect(e.n).toBeGreaterThan(n);
    expect(fl.fx('melee').filter((x: any) => x.n > e.n && x.unit === fl.pc.id).length).toBe(e.strikes); // the strikes follow it
    const b = fight('maul', ['break'], ['D5'], 2); rig({ hit: true, die: 12 }); D20.v = 2; n = mark(b); expect(b.tech('break', { targetId: b.foe.id })).toBeNull();
    expect(one(b, n, 'break')).toMatchObject({ target: b.foe.id, stun: 'stunned', armour: true });
  });
  it('at most two melee_fx a use (the beat, and at most one fall)', () => {
    const c = fight('maul', ['charge'], ['G5']); c.put(c.pc, 'B5'); D20.v = 2; rig({ hit: true, die: 12 });
    const n = mark(c); c.tech('charge', { targetId: c.foe.id }); expect(since(c, n).length).toBeLessThanOrEqual(2);
  });
  it('a refused technique leaves no beat to play', () => {
    const f = fight('combat_knife', ['throw'], ['F5']); f.unit(f.pc.id).ap = 0; const n = mark(f);
    expect(f.tech('throw', { targetId: f.foe.id })).toBeTruthy(); expect(since(f, n)).toHaveLength(0);
  });
});

// Review fixes (physical-2.0-A-FX.md section 9): the beats the client can't place right without these fields.
let redirect: string | null = null;
onHook('attack_target', (ctx: any) => { if (redirect && ctx.att.side === 'pc') ctx.tgt = ctx.cb.units.find((x: any) => x.id === redirect); });
describe('melee_fx review fixes', () => {
  it('Sweep, Cleave and Flurry say where their use ends (upto): the last event of the use, so a later plain attack is never quick', () => {
    const f = fight('sabre', ['sweep'], ['D5', 'D6']); rig({ hit: true, die: 12 });
    let n = mark(f); expect(f.tech('sweep', { tile: f.tile('D5') })).toBeNull();
    expect(one(f, n, 'arc').upto).toBe(mark(f));
    const fl = fight('sabre', ['flurry']); rig({ hit: true, die: 12 }); n = mark(fl); expect(fl.tech('flurry', { targetId: fl.foe.id })).toBeNull();
    const e = one(fl, n, 'flurry'); expect(e.upto).toBe(mark(fl));
    // every strike of the use is at or before upto
    expect(fl.fx('melee').filter((x: any) => x.n > e.n && x.unit === fl.pc.id).every((x: any) => x.n <= e.upto)).toBe(true);
  });
  it('Flurry, Thrown: the tile the weapon lands on (the last target thrown at)', () => {
    const f = fight('throwing_knives', ['flurry'], ['F5', 'F6']); rig({ hit: true, die: 12 });
    const n = mark(f); expect(f.tech('flurry', { targetIds: f.foes.map((v) => v.id), line: 'thrown' })).toBeNull();
    const e = one(f, n, 'flurry'); expect(e.thrown).toBe(true); expect([f.tile('F5'), f.tile('F6')]).toContain(e.land);
    expect(f.fx('shot').filter((x: any) => x.n > e.n && x.unit === f.pc.id && x.thrown).length).toBe(e.strikes);
  });
  it('Throw redirected to another unit: the beat flies to (and lands by) the unit really struck', () => {
    const f = fight('combat_knife', ['throw'], ['F5', 'F7']); rig({ hit: true, die: 12 });
    const n = mark(f); redirect = f.foes[1].id;
    try { expect(f.tech('throw', { targetId: f.foes[0].id })).toBeNull(); } finally { redirect = null; }
    expect(one(f, n, 'throw')).toMatchObject({ to: f.tile('F7'), target: f.foes[1].id });
  });
});
export type { Unit };

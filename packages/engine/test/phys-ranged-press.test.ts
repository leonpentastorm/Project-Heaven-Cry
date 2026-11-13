// Physical 2.0 (rules 1.12), ranged Press: Rake, Warning Shot, Flush, Mag Dump and Crossfire (Suppress is in
// phys-core.test.ts). Each technique: the base with a plain weapon, every property line with and without the property,
// every refusal, AP, rounds, Heat, Pressure before and after (misses and the caps), and the preview against the action.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { reactionsUsed } from '../src';
// Saves roll a d20 that the attack rig doesn't reach: D.die forces every d20 (an attack's own is then set by rig()). 1
// always fails a save, 20 always makes it, whatever the seed (review fix: these tests leaned on the seed's next die).
const D = vi.hoisted(() => ({ die: null as number | null }));
vi.mock('../src/rng', async (orig) => { const m: any = await orig(); return { ...m, d20: (r: any) => { const v = m.d20(r); return D.die ?? v; } }; });
import { phys, TECHNIQUE, WEAPON, coverOf, weaponDamage, physicalMult, heatLimit, type Unit } from '../src';
import { onHook } from '../src/effects/hooks';
import { physFight, rig } from './helpers/physfight';
import { unchanged, term } from './helpers/physfight-ranged';

// ---------- helpers (the shared ones are in helpers/physfight-ranged.ts) ----------
const PRESS = ['rake', 'warning_shot', 'flush', 'mag_dump', 'crossfire'];
interface FoeAt { at: string; tier?: string; weapon?: string }
/** A fight with the first PC on `at` (C5) and the foes on their tiles, every meter at 0 and nobody hit yet, on the
 * PC's turn. The fight's opening enemy turns are wiped: positions, Pressure, hits this round, Stopped. */
function fight(weapon: string, foes: FoeAt[] = [{ at: 'H5' }], o: { at?: string; known?: string[]; pc?: any; allies?: any[] } = {}) {
  const f = physFight([{ weapon, known: o.known || PRESS, skills: { dexterity: 6 }, ...o.pc }, ...(o.allies || [])], foes.map((x) => ({ tier: 'soldier', ...x })));
  f.put(f.pc, o.at || 'C5'); foes.forEach((x, i) => f.put(f.foes[i], x.at));
  (o.allies || []).forEach((a, i) => f.put(f.pcs[i + 1], a.at || 'A1'));
  for (const u of f.cb.units) { f.press(u, 0); delete (u as any).hitRound; delete (u as any).pressedThis; delete (u as any).stopped; u.hp = u.maxHp; u.conds = {}; u.prone = false; u.hidden = false; }
  f.turn(f.pc); f.pc.heat = 0;
  return f;
}
type F = ReturnType<typeof fight>;
/** The to-hit totals the log shows for the user's rolls since `from` ("d20 12 +3 = 15"). */
const rolledToHit = (f: F, from: number, who: Unit) => f.cb.log.slice(from).filter((l) => l.startsWith(who.name + ' fires at ') || l.startsWith(who.name + ' takes an aimed shot at ')).map((l) => { const m = / d20 (\d+) ([+−])(\d+) /.exec(l)!; return (m[2] === '−' ? -1 : 1) * Number(m[3]); });
/** The preview's to-hit, roll by roll. */
const pvToHit = (pv: phys.TechPreview) => pv.attacks.filter((a) => a.pv.ok).map((a) => a.pv.toHit);
const pressAfter = (pv: phys.TechPreview, u: Unit) => pv.pressure?.filter((x) => x.unit === u.id).reduce((m, x) => Math.max(m, x.after), 0);
const crateAt = (f: F, ref: string) => coverOf(f.cb)[f.tile(ref)];
// volley_end, as Spray and Pray hears it
const VOLLEY_END: any[] = []; onHook('volley_end', (ctx: any) => { VOLLEY_END.push({ u: ctx.u?.id, mode: ctx.mode, hits: (ctx.hits || []).map((v: Unit) => v.id) }); });
beforeEach(() => { rig(null); VOLLEY_END.length = 0; D.die = null; });

describe('the data and the pad', () => {
  it('all five are built, with their numbers filled in', () => {
    for (const id of PRESS) { expect(phys.handlerOf(id)).not.toBeNull(); expect(Object.keys(phys.TECHNIQUE[id].numbers).length).toBeGreaterThan(0); }
    const f = fight('hellraiser_service_rifle');
    const press = f.pad().find((g) => g.group === 'press')!.entries;
    for (const id of PRESS) expect(press.find((e) => e.id === id)?.built).toBe(true);
  });
});

// ---------- 9. Rake ----------
describe('Rake', () => {
  // three soldiers: two on the line from C5, one 2 tiles off it
  const crowd: FoeAt[] = [{ at: 'H5' }, { at: 'I5' }, { at: 'H7' }];
  it('Auto: today\'s full-auto line for 10 rounds, one roll each at −2, +1 Pressure hit or miss; 4 AP; Heat 4 + 1', () => {
    const f = fight('hellraiser_service_rifle', crowd), [a, b, c] = f.foes;
    const pv = f.pv('rake', { targetId: a.id });
    expect(pv.ok).toBe(true); expect(pv.ap).toBe(4); expect(pv.rounds).toBe(10);
    expect(pv.attacks.map((x) => x.target)).toEqual([a.id, b.id]); // H7 is off the line
    expect(term(pv, 0, 'full auto')).toBe(-2);
    expect(pressAfter(pv, a)).toBe(1); expect(pressAfter(pv, b)).toBe(1); expect(pressAfter(pv, c)).toBe(0);
    rig({ hit: false, die: 5 });
    expect(f.tech('rake', { targetId: a.id })).toBeNull();
    expect(f.pc.ap).toBe(2); expect(f.pc.ammo).toBe(24 - 10);
    expect(f.pc.heat).toBe(2 + (4 - 2) + 1); // the shots' 2, today's 4 − targets, the Press's 1
    expect(f.pressure(a)).toBe(1); expect(f.pressure(b)).toBe(1); expect(f.pressure(c)).toBe(0); // a miss still presses
  });
  it('Auto: one full-auto volley as today (the volley event, chained shots, volley_end for Spray and Pray)', () => {
    const f = fight('hellraiser_service_rifle', crowd), [a, b] = f.foes; rig({ hit: true, die: 12 });
    f.tech('rake', { targetId: a.id });
    const v = f.fx('volley').filter((e: any) => e.unit === f.pc.id); // the opening enemy turns may Suppress (its own volley event)
    expect(f.fx('volley').filter((e: any) => e.unit !== f.pc.id).every((e: any) => e.mode === 'suppress')).toBe(true); expect(v.length).toBe(1); expect(v[0]).toMatchObject({ unit: f.pc.id, target: a.id, mode: 'auto', shots: 10 });
    const shots = f.fx('shot').filter((e: any) => e.unit === f.pc.id); expect(shots.length).toBe(2); expect(shots.every((e: any) => e.chain)).toBe(true);
    expect(VOLLEY_END).toEqual([{ u: f.pc.id, mode: 'auto', hits: [a.id, b.id] }]);
    expect(f.pressure(a)).toBe(1); expect(f.pressure(b)).toBe(1); // its own +1, not the ordinary +1 on top
    expect(f.pc.dur).toBe(f.pc.maxDur! - 2); // today's wear for full auto
  });
  it('Auto: the drum-gun\'s wide spray takes in a target 2 tiles off the line', () => {
    const f = fight('mandestra_drum_gun', crowd, { at: 'E5' }), [a, , c] = f.foes;
    expect(f.pv('rake', { targetId: a.id }).attacks.map((x) => x.target)).toContain(c.id);
    const g = fight('hellraiser_service_rifle', crowd, { at: 'E5' });
    expect(g.pv('rake', { targetId: g.foes[0].id }).attacks.map((x) => x.target)).not.toContain(g.foes[2].id);
  });
  it('Auto: refused with the count when the magazine can\'t pay 10', () => {
    const f = fight('hellraiser_service_rifle', crowd); f.pc.ammo = 8;
    expect(f.tech('rake', { targetId: f.foe.id })).toBe('Needs 10 rounds, 8 loaded.');
    expect(f.pc.ap).toBe(6); expect(f.pc.ammo).toBe(8);
    f.pc.ammo = 4; expect(f.tech('rake', { targetId: f.foe.id })).toBe('Needs 6 rounds, 4 loaded.'); // the core's count first
  });
  it('without Auto: up to 3 targets within 2 tiles of each other, each at −3 (and −2 off its home), +1 Pressure on a hit, 6 rounds', () => {
    const f = fight('service_pistol', [{ at: 'G5' }, { at: 'G6' }, { at: 'H4' }, { at: 'G9' }]), [a, b, c, d] = f.foes;
    const pv = f.pv('rake', { targetId: a.id });
    expect(pv.ok).toBe(true); expect(pv.ap).toBe(4); expect(pv.rounds).toBe(6);
    expect(pv.attacks.map((x) => x.target).sort()).toEqual([a.id, b.id, c.id].sort()); // the nearest two filled in; G9 is too far
    expect(term(pv, 0, 'Rake')).toBe(-3); expect(term(pv, 0, 'Rake off its home weapon')).toBe(-2);
    expect(pv.pressure!.every((x) => x.onHit && x.add === 1)).toBe(true);
    rig({ hit: false, die: 5 });
    expect(f.tech('rake', { targetId: a.id })).toBeNull();
    expect(f.pc.ammo).toBe(12 - 6); expect(f.pc.ap).toBe(2); expect(f.pc.heat).toBe(3 + 1);
    expect([a, b, c, d].map((u) => f.pressure(u))).toEqual([0, 0, 0, 0]); // a miss gives none
    const g = fight('service_pistol', [{ at: 'G5' }, { at: 'G6' }]); rig({ hit: true, die: 12 });
    g.tech('rake', { targetId: g.foes[0].id });
    expect(g.pressure(g.foes[0])).toBe(1); expect(g.pressure(g.foes[1])).toBe(1);
  });
  it('without Auto: named targets are checked (how many, how far apart, enemies)', () => {
    const f = fight('service_pistol', [{ at: 'G5' }, { at: 'G6' }, { at: 'G8' }, { at: 'H5' }, { at: 'H6' }]), [a, b, c, d, e] = f.foes;
    expect(f.tech('rake', { targetId: a.id, targetIds: [a.id, c.id] })).toBe('Rake\'s targets must be within 2 tiles of each other.');
    expect(f.tech('rake', { targetId: a.id, targetIds: [b.id, d.id, e.id] })).toBe('Rake takes up to 3 targets.');
    expect(f.tech('rake', { targetId: a.id, targetIds: [b.id, f.pc.id] })).toBe('Rake\'s targets must be enemies still standing.');
    expect(f.tech('rake', { targetId: f.pc.id })).toMatch(/^Pick /); // the user itself
    expect(f.pc.ap).toBe(6); expect(f.pc.ammo).toBe(12);
    expect(f.pv('rake', { targetId: a.id, targetIds: [b.id] }).attacks.map((x) => x.target)).toEqual([a.id, b.id]);
  });
  it('Spread: the spread is 1 wider (a Spread and Auto weapon, the Spread line chosen); a Spread-only weapon is off its home and gets no line', () => {
    const foes: FoeAt[] = [{ at: 'G5' }, { at: 'G8' }];
    const f = fight('brigade_auto_shotgun', foes), [a, b] = f.foes;
    expect(f.pv('rake', { targetId: a.id, targetIds: [b.id], line: 'spread' }).ok).toBe(true); // 3 apart
    expect(f.pv('rake', { targetId: a.id, targetIds: [b.id], line: 'spread' }).rounds).toBe(6);
    const g = fight('lumeri_scattergun', foes);
    expect(g.tech('rake', { targetId: g.foes[0].id, targetIds: [g.foes[1].id] })).toBe('Rake\'s targets must be within 2 tiles of each other.');
    const h = fight('brigade_auto_shotgun', foes); expect(h.pv('rake', { targetId: h.foes[0].id }).rounds).toBe(10); // Auto by default
  });
  it('the preview\'s rolls are the action\'s, roll by roll (Heat and Recoil included), and a preview changes nothing', () => {
    const f = fight('hellraiser_service_rifle', crowd, { pc: { skills: { dexterity: 0 } } }), a = f.foes[0];
    let pv!: phys.TechPreview; unchanged(f, () => { pv = f.pv('rake', { targetId: a.id }); f.pv('rake', { targetId: a.id, targetIds: [f.foes[1].id] }); });
    rig({ hit: false, die: 5 }); const at = f.cb.log.length;
    f.tech('rake', { targetId: a.id });
    expect(rolledToHit(f, at, f.pc)).toEqual(pvToHit(pv));
    const g = fight('service_pistol', [{ at: 'G5' }, { at: 'G6' }, { at: 'H4' }], { pc: { skills: { dexterity: 0 } } });
    const pv2 = g.pv('rake', { targetId: g.foes[0].id }); rig({ hit: false, die: 5 }); const at2 = g.cb.log.length;
    g.tech('rake', { targetId: g.foes[0].id }); expect(rolledToHit(g, at2, g.pc)).toEqual(pvToHit(pv2));
    expect(new Set(pvToHit(pv2)).size).toBeGreaterThan(1); // Heat grows through the volley (Recoil doesn't: below)
  });
  it('no Recoil inside the volley: Auto (today\'s full auto) and the 3-target Rake alike; the first roll keeps earlier Recoil (review fix)', () => {
    const line: FoeAt[] = [{ at: 'H5' }, { at: 'I5' }, { at: 'J5' }];
    const f = fight('hellraiser_service_rifle', line, { pc: { skills: { dexterity: 0 } } }), a = f.foes[0];
    const pv = f.pv('rake', { targetId: a.id }); expect(pv.attacks.length).toBe(3);
    expect(pv.attacks.map((x) => x.pv.terms!.find((t) => t.label === 'recoil')?.v)).toEqual([undefined, undefined, undefined]);
    rig({ hit: false, die: 5 }); const at = f.cb.log.length; f.tech('rake', { targetId: a.id });
    expect(rolledToHit(f, at, f.pc)).toEqual(pvToHit(pv));
    // the 3-target Rake (the Spread line of a Spread and Auto weapon), after a shot this turn: Recoil on its first roll only
    const g = fight('brigade_auto_shotgun', [{ at: 'G5' }, { at: 'G6' }, { at: 'G7' }], { pc: { skills: { dexterity: 0 } } }); rig({ hit: false, die: 5 });
    g.tech('shot', { targetId: g.foes[2].id }); g.pc.ap = 9;
    const gv = g.pv('rake', { targetId: g.foes[0].id, line: 'spread' }); expect(gv.attacks.length).toBe(3);
    expect(gv.attacks.map((x) => x.pv.terms!.find((t) => t.label === 'recoil')?.v)).toEqual([-1, undefined, undefined]);
    const at2 = g.cb.log.length; g.tech('rake', { targetId: g.foes[0].id, line: 'spread' }); expect(rolledToHit(g, at2, g.pc)).toEqual(pvToHit(gv));
  });
  it('one attack action wears the weapon 1 (the 3-target Rake), or today\'s full auto 2 (review fix)', () => {
    const f = fight('brigade_auto_shotgun', [{ at: 'G5' }, { at: 'G6' }, { at: 'G7' }]); rig({ hit: false, die: 5 }); const d0 = f.pc.dur!;
    expect(f.pc.maxDur).toBeGreaterThan(0);
    f.tech('rake', { targetId: f.foes[0].id, line: 'spread' }); expect(f.pc.dur).toBe(d0 - 1);
    const g = fight('hellraiser_service_rifle', crowd); rig({ hit: false, die: 5 }); const e0 = g.pc.dur!;
    g.tech('rake', { targetId: g.foes[0].id }); expect(g.pc.dur).toBe(e0 - 2);
  });
  it('an enemy wants it on a crowd, not on one target; asking changes nothing', () => {
    const f = fight('hellraiser_service_rifle', [{ at: 'H5', weapon: 'hellraiser_service_rifle' }]);
    f.put(f.pc, 'L5');
    f.turn(f.foe);
    unchanged(f, () => { expect(f.bound(() => phys.aiScore(f.cb, f.foe, 'rake', { targetId: f.pc.id })).score).toBeLessThan(5); });
    const g = fight('hellraiser_service_rifle', crowd);
    expect(g.bound(() => phys.aiScore(g.cb, g.pc, 'rake', { targetId: g.foes[0].id })).score).toBeGreaterThan(5);
  });
});

// ---------- 10. Warning Shot ----------
describe('Warning Shot', () => {
  const nerves = (f: F, heart: number) => { f.foe.sv = { body: 0, brain: 0, heart }; D.die = heart < 0 ? 1 : 20; };
  it('1 AP, 1 round, no attack: a failed Heart save gives +1 Pressure; Heat 1 + 1', () => {
    const f = fight('service_pistol'); nerves(f, -50); const hp = f.foe.hp;
    const pv = f.pv('warning_shot', { targetId: f.foe.id });
    expect(pv.ok).toBe(true); expect(pv.ap).toBe(1); expect(pv.rounds).toBe(1); expect(pv.attacks.length).toBe(0);
    expect(pv.saves).toEqual([{ unit: f.foe.id, skills: ['heart'], tn: 12 + 3 }]); expect(pressAfter(pv, f.foe)).toBe(1);
    expect(f.tech('warning_shot', { targetId: f.foe.id })).toBeNull();
    expect(f.pc.ap).toBe(5); expect(f.pc.ammo).toBe(11); expect(f.pc.heat).toBe(2); expect(f.pc.shotsThisTurn).toBe(1);
    expect(f.foe.hp).toBe(hp); expect(f.pressure(f.foe)).toBe(1);
    expect(f.cb.log.some((l) => /fails the save against Warning Shot .* vs 15[,)]/.test(l))).toBe(true);
  });
  it('a target that keeps its nerve gains nothing', () => {
    const f = fight('service_pistol'); nerves(f, 50);
    expect(f.tech('warning_shot', { targetId: f.foe.id })).toBeNull(); expect(f.pressure(f.foe)).toBe(0);
    expect(f.cb.log.some((l) => /saves against Warning Shot/.test(l))).toBe(true);
  });
  it('Loud: the save is at −2 (TN 14); without Loud it is TN 12', () => {
    const f = fight('magistrate_pistol'); nerves(f, -50);
    expect(f.pv('warning_shot', { targetId: f.foe.id }).saves![0].tn).toBe(14 + 3);
    f.tech('warning_shot', { targetId: f.foe.id }); expect(f.cb.log.some((l) => /Warning Shot \(heart .* vs 17[,)]/.test(l))).toBe(true);
    expect(f.pressure(f.foe)).toBe(1);
  });
  it('Silent: not available; refusals for an ally and a target out of sight', () => {
    const f = fight('parlour_pistol'); expect(f.tech('warning_shot', { targetId: f.foe.id })).toBe('Not available with a silent weapon.');
    const g = fight('service_pistol', [{ at: 'H5' }], { allies: [{ at: 'C7' }] });
    expect(g.tech('warning_shot', { targetId: g.pcs[1].id })).toBe('Pick an enemy.');
    const h = fight('service_pistol', [{ at: 'L7' }], { at: 'J7' }); // the pillar at K7 between them
    expect(h.tech('warning_shot', { targetId: h.foe.id })).toMatch(/^You can't see it|^You can't get a shot at/);
    expect(h.pc.ammo).toBe(12); expect(h.pc.ap).toBe(6);
  });
  it('caps: a boss stops at 2; a player at 3; a preview changes nothing', () => {
    const f = fight('service_pistol', [{ at: 'H5', tier: 'boss' }]); nerves(f, -50); f.press(f.foe, 2, f.pc);
    unchanged(f, () => { expect(pressAfter(f.pv('warning_shot', { targetId: f.foe.id }), f.foe)).toBe(2); });
    f.tech('warning_shot', { targetId: f.foe.id }); expect(f.pressure(f.foe)).toBe(2);
    const g = fight('service_pistol', [{ at: 'H5', weapon: 'service_pistol' }]); g.unit(g.foe.id).techs = ['warning_shot'];
    g.turn(g.foe); g.press(g.pc, 3, g.foe); g.pc.sv = { body: 0, brain: 0, heart: -50 }; D.die = 1;
    expect(g.use(g.foe, 'warning_shot', { targetId: g.pc.id })).toBeNull(); expect(g.pressure(g.pc)).toBe(3);
  });
  it('a Hidden shooter is revealed by the report', () => {
    const f = fight('service_pistol'); nerves(f, -50); f.pc.hidden = true;
    f.tech('warning_shot', { targetId: f.foe.id }); expect(f.pc.hidden).toBe(false);
  });
});

// ---------- 11. Flush ----------
describe('Flush', () => {
  // the foe on G6 stands against the crate at F5, which faces a shot from C6
  it('no roll: the cover takes the weapon\'s damage and the target gains +2; 3 AP, 1 round, Heat 1 + 1', () => {
    const f = fight('service_pistol', [{ at: 'G6' }], { at: 'C6' }), c = f.char(f.pc), hp0 = crateAt(f, 'F5').hp, hp = f.foe.hp;
    const dmg = Math.floor(weaponDamage(WEAPON.service_pistol, 3, c.skills.raw_power || 0) * physicalMult(c));
    const pv = f.pv('flush', { targetId: f.foe.id });
    expect(pv.ok).toBe(true); expect(pv.ap).toBe(3); expect(pv.rounds).toBe(1); expect(pv.attacks.length).toBe(0); expect(pv.area).toEqual([f.tile('F5')]);
    expect(pressAfter(pv, f.foe)).toBe(2); expect(pv.notes.some((n) => n.includes('takes ' + dmg))).toBe(true);
    rig({ hit: false, die: 1 }); // no roll is made: the dice don't matter
    expect(f.tech('flush', { targetId: f.foe.id })).toBeNull();
    expect(crateAt(f, 'F5').hp).toBe(hp0 - dmg); expect(f.foe.hp).toBe(hp);
    expect(f.pressure(f.foe)).toBe(2); expect(f.pc.ap).toBe(3); expect(f.pc.ammo).toBe(11); expect(f.pc.heat).toBe(2);
    expect(f.fx('shot').filter((e: any) => e.unit === f.pc.id && e.object).length).toBe(1);
  });
  it('Spread (or Blast): double damage to the cover; it breaks', () => {
    const f = fight('lumeri_scattergun', [{ at: 'G6' }], { at: 'C6' }), c = f.char(f.pc);
    const dmg = Math.floor(weaponDamage(WEAPON.lumeri_scattergun, 3, c.skills.raw_power || 0) * physicalMult(c) * 2);
    expect(f.pv('flush', { targetId: f.foe.id }).notes.some((n) => n.includes('takes ' + dmg))).toBe(true);
    f.tech('flush', { targetId: f.foe.id }); expect(crateAt(f, 'F5')).toBeUndefined(); // rubble now
    expect(f.pressure(f.foe)).toBe(2);
    const g = fight('smetanita_thumper', [{ at: 'G6' }], { at: 'C6' }), cg = g.char(g.pc);
    expect(g.pv('flush', { targetId: g.foe.id }).notes.some((n) => n.includes('takes ' + Math.floor(weaponDamage(WEAPON.smetanita_thumper, 3, cg.skills.raw_power || 0) * physicalMult(cg) * 2)))).toBe(true);
  });
  it('Arc: the cover is ignored and the target takes half damage with no roll (the thumper picks Arc over Blast)', () => {
    const f = fight('smetanita_thumper', [{ at: 'G6' }], { at: 'C6' }), hp0 = crateAt(f, 'F5').hp, hp = f.foe.hp;
    const shot = f.pv('shot', { targetId: f.foe.id }).attacks[0].pv.dmg!, want = Math.max(1, Math.floor(shot.total * 0.5) - shot.armour);
    const pv = f.pv('flush', { targetId: f.foe.id, line: 'arc' }); expect(pv.ok).toBe(true); expect(pv.area).toBeUndefined();
    expect(pv.notes.some((n) => n.includes('takes ' + want))).toBe(true);
    f.tech('flush', { targetId: f.foe.id, line: 'arc' });
    expect(f.foe.hp).toBe(hp - want); expect(crateAt(f, 'F5').hp).toBe(hp0); expect(f.pressure(f.foe)).toBe(2); // +2, not +3: no ordinary hit
    // a Drawn, Silent, Arc bow: no Heat, and a Hidden archer stays hidden
    const g = fight('longbow', [{ at: 'G6' }], { at: 'C6' }); g.pc.hidden = true; const gh = g.foe.hp;
    expect(g.tech('flush', { targetId: g.foe.id })).toBeNull(); expect(g.foe.hp).toBeLessThan(gh); expect(g.pc.heat).toBe(0); expect(g.pc.hidden).toBe(true);
  });
  it('refusals: no cover facing you, not in cover for Arc, an ally, and nothing is spent', () => {
    const f = fight('service_pistol', [{ at: 'J5' }]);
    expect(f.tech('flush', { targetId: f.foe.id })).toBe(f.foe.name + ' has no cover between you to flush.');
    const g = fight('service_pistol', [{ at: 'G6' }], { at: 'J6' }); // behind the target: the crate doesn't face this shot
    expect(g.tech('flush', { targetId: g.foe.id })).toBe(g.foe.name + ' has no cover between you to flush.');
    const h = fight('smetanita_thumper', [{ at: 'J5' }]); expect(h.tech('flush', { targetId: h.foe.id, line: 'arc' })).toBe(h.foe.name + ' isn\'t in cover.');
    const k = fight('service_pistol', [{ at: 'J5' }], { allies: [{ at: 'G6' }] }); expect(k.tech('flush', { targetId: k.pcs[1].id })).toBe('Pick an enemy.');
    expect(f.pc.ap).toBe(6); expect(f.pc.ammo).toBe(12); expect(f.pc.heat).toBe(0);
  });
  it('Heat at the limit jams the weapon, as a shot does', () => {
    // the round's own Heat reaches the limit (the base adds a Press's +1 after the run, and that +1 jams nothing)
    const f = fight('service_pistol', [{ at: 'G6' }], { at: 'C6' }); f.pc.heat = heatLimit(f.pc, WEAPON.service_pistol) - 1;
    f.tech('flush', { targetId: f.foe.id }); expect(f.pc.jammed).toBe(true);
  });
  it('caps: an elite stops at 3, a boss at 2, a player at 3; a preview changes nothing', () => {
    const e = fight('service_pistol', [{ at: 'G6', tier: 'elite' }], { at: 'C6' }); e.press(e.foe, 2, e.pc);
    unchanged(e, () => { expect(pressAfter(e.pv('flush', { targetId: e.foe.id }), e.foe)).toBe(3); });
    e.tech('flush', { targetId: e.foe.id }); expect(e.pressure(e.foe)).toBe(3);
    const b = fight('service_pistol', [{ at: 'G6', tier: 'boss' }], { at: 'C6' }); b.press(b.foe, 1, b.pc); b.tech('flush', { targetId: b.foe.id }); expect(b.pressure(b.foe)).toBe(2);
    // an enemy flushes a player: the PC on E5 against the crate at F5, the enemy on J5
    const p = fight('service_pistol', [{ at: 'J5', weapon: 'lumeri_scattergun' }], { at: 'E5' }); p.unit(p.foe.id).techs = ['flush'];
    p.turn(p.foe); p.press(p.pc, 2, p.foe);
    expect(p.use(p.foe, 'flush', { targetId: p.pc.id })).toBeNull(); expect(p.pressure(p.pc)).toBe(3);
  });
  it('an enemy wants it on a target in cover that isn\'t Pressed yet', () => {
    const f = fight('lumeri_scattergun', [{ at: 'G6' }], { at: 'C6' });
    expect(f.bound(() => phys.aiScore(f.cb, f.pc, 'flush', { targetId: f.foe.id })).score).toBeGreaterThan(5);
    f.press(f.foe, 2, f.pc); expect(f.bound(() => phys.aiScore(f.cb, f.pc, 'flush', { targetId: f.foe.id })).score).toBe(0);
  });
});

// ---------- 12. Mag Dump ----------
describe('Mag Dump', () => {
  it('empties the weapon: one roll per 3 rounds (at most 3), each at −4 more (rules 1.18); +1 Pressure per hit; Heat to one under the limit; 4 AP', () => {
    const f = fight('service_pistol', [{ at: 'G5', tier: 'elite' }]), lim = heatLimit(f.pc, WEAPON.service_pistol);
    const pv = f.pv('mag_dump', { targetId: f.foe.id });
    expect(pv.ok).toBe(true); expect(pv.ap).toBe(4); expect(pv.rounds).toBe(12); expect(pv.attacks.length).toBe(3);
    expect(pv.attacks.map((a) => term({ attacks: [a] } as any, 0, 'Mag Dump') ?? 0)).toEqual([0, -4, -8]);
    expect(pv.pressure!.every((x) => x.onHit)).toBe(true); expect(pressAfter(pv, f.foe)).toBe(3); // an elite stops at 3
    rig({ hit: false, die: 5 });
    expect(f.tech('mag_dump', { targetId: f.foe.id })).toBeNull();
    expect(f.pc.ammo).toBe(0); expect(f.pc.ap).toBe(2); expect(f.pc.heat).toBe(lim - 1); expect(f.pressure(f.foe)).toBe(0);
    const g = fight('service_pistol', [{ at: 'G5', tier: 'elite' }]); rig({ hit: true, die: 12 }); g.foe.hp = 999; g.foe.maxHp = 999;
    g.tech('mag_dump', { targetId: g.foe.id }); expect(g.pressure(g.foe)).toBe(3);
  });
  it('rolls by what is left: 7 rounds is 2 rolls, 2 rounds is 1, and the whole magazine goes', () => {
    const f = fight('service_pistol'); f.pc.ammo = 7;
    const pv = f.pv('mag_dump', { targetId: f.foe.id }); expect(pv.attacks.length).toBe(2); expect(pv.rounds).toBe(7);
    rig({ hit: false, die: 5 }); f.tech('mag_dump', { targetId: f.foe.id }); expect(f.pc.ammo).toBe(0);
    const g = fight('service_pistol'); g.pc.ammo = 2; expect(g.pv('mag_dump', { targetId: g.foe.id }).attacks.length).toBe(1);
  });
  it('Auto: +1 Pressure per roll, hit or miss', () => {
    const f = fight('hellraiser_service_rifle', [{ at: 'H5' }]);
    const N = TECHNIQUE.mag_dump.numbers as any, cap = N.rounds_per_roll * N.max_rolls; // rules 1.38: 4 rounds a roll, 12 at most
    const pv = f.pv('mag_dump', { targetId: f.foe.id }); expect(pv.rounds).toBe(cap); expect(pv.pressure!.some((x) => x.onHit)).toBe(false);
    rig({ hit: false, die: 5 }); f.tech('mag_dump', { targetId: f.foe.id });
    expect(f.pressure(f.foe)).toBe(3); expect(f.pc.ammo).toBe(24 - cap); expect(f.pc.heat).toBe(heatLimit(f.pc, WEAPON.hellraiser_service_rifle) - 1); // rules 1.18: three rolls
  });
  it('no Recoil on top of its own growing penalty: the step is all that grows (review fix); one wear', () => {
    const f = fight('hellraiser_service_rifle', [{ at: 'H5' }], { pc: { skills: { dexterity: 0 } } }); const d0 = f.pc.dur!;
    const pv = f.pv('mag_dump', { targetId: f.foe.id }); expect(pv.attacks.length).toBe(3);
    expect(pv.attacks.map((a) => a.pv.terms!.find((x) => x.label === 'recoil')?.v)).toEqual([undefined, undefined, undefined]);
    expect(pv.attacks.map((a) => a.pv.terms!.find((x) => x.label === 'Mag Dump')?.v ?? 0)).toEqual([0, -4, -8]);
    rig({ hit: false, die: 5 }); const at = f.cb.log.length; f.tech('mag_dump', { targetId: f.foe.id });
    expect(rolledToHit(f, at, f.pc)).toEqual(pvToHit(pv)); expect(f.pc.dur).toBe(d0 - 1);
    // the revolver's "no growing penalty": a shooter with no Dexterity gets none from Recoil either
    const g = fight('drifter_revolver', [{ at: 'H5' }], { pc: { skills: { dexterity: 0 } } }); const gv = g.pv('mag_dump', { targetId: g.foe.id });
    expect(gv.attacks.length).toBe(2); expect(gv.attacks.map((a) => a.pv.terms!.find((x) => x.label === 'recoil')?.v)).toEqual([undefined, undefined]);
  });
  it('Quick and Precise (a revolver): no growing penalty; Quick alone keeps it', () => {
    const f = fight('drifter_revolver'); const pv = f.pv('mag_dump', { targetId: f.foe.id });
    expect(pv.attacks.length).toBe(2); expect(pv.attacks.map((a) => a.pv.terms!.find((x) => x.label === 'Mag Dump')?.v ?? 0)).toEqual([0, 0]);
    const g = fight('service_pistol'); g.pc.ammo = 6;
    expect(g.pv('mag_dump', { targetId: g.foe.id }).attacks.map((a) => a.pv.terms!.find((x) => x.label === 'Mag Dump')?.v ?? 0)).toEqual([0, -4]);
  });
  it('Spread: both barrels, one roll at double damage within 4 tiles (single damage further off)', () => {
    const f = fight('coach_gun', [{ at: 'E5' }]); f.foe.hp = 999; f.foe.maxHp = 999; const pv = f.pv('mag_dump', { targetId: f.foe.id }), shot = f.pv('shot', { targetId: f.foe.id });
    expect(pv.attacks.length).toBe(1); expect(pv.rounds).toBe(2); expect(pv.attacks[0].pv.dmg!.total).toBeCloseTo(shot.attacks[0].pv.dmg!.total * 2, 5);
    rig({ hit: true, die: 12 }); f.tech('mag_dump', { targetId: f.foe.id }); expect(f.pc.ammo).toBe(0); expect(f.pressure(f.foe)).toBe(1);
    const g = fight('coach_gun', [{ at: 'H5' }]), far = g.pv('mag_dump', { targetId: g.foe.id }), gs = g.pv('shot', { targetId: g.foe.id });
    expect(far.attacks[0].pv.dmg!.total).toBeCloseTo(gs.attacks[0].pv.dmg!.total, 5);
  });
  it('off its home (no Auto, Quick or Spread): −2 to every roll and no line', () => {
    const f = fight('long_rifle'); const pv = f.pv('mag_dump', { targetId: f.foe.id });
    expect(pv.attacks.length).toBe(2); expect(term(pv, 0, 'Mag Dump off its home weapon')).toBe(-2); // rules 1.38: its 5 rounds are one 4 and part of another
  });
  it('Drawn: not available; an empty weapon is refused', () => {
    const f = fight('recurve_bow'); expect(f.tech('mag_dump', { targetId: f.foe.id })).toBe('Not available with a drawn weapon.');
    const g = fight('service_pistol'); g.pc.ammo = 0; expect(g.tech('mag_dump', { targetId: g.foe.id })).toBe('Empty: reload first.');
  });
  it('a target that falls mid-dump takes no more rolls, and the rest of the magazine still goes', () => {
    const f = fight('service_pistol'); f.foe.hp = 1; rig({ hit: true, die: 20 }); const at = f.cb.log.length;
    f.tech('mag_dump', { targetId: f.foe.id }); expect(f.foe.dead).toBe(true);
    expect(rolledToHit(f, at, f.pc).length).toBe(1); expect(f.pc.ammo).toBe(0);
  });
  it('the preview\'s rolls are the action\'s, roll by roll; a preview changes nothing', () => {
    const f = fight('service_pistol', [{ at: 'G5' }], { pc: { skills: { dexterity: 0 } } }); f.foe.hp = 999; f.foe.maxHp = 999;
    let pv!: phys.TechPreview; unchanged(f, () => { pv = f.pv('mag_dump', { targetId: f.foe.id }); });
    rig({ hit: false, die: 5 }); const at = f.cb.log.length;
    f.tech('mag_dump', { targetId: f.foe.id }); expect(rolledToHit(f, at, f.pc)).toEqual(pvToHit(pv));
  });
});

// ---------- 13. Crossfire ----------
describe('Crossfire', () => {
  /** The second PC (the ally) shoots the foe first, then it is the first PC's turn, in the same round. */
  function crossed(weapon: string, foes: FoeAt[] = [{ at: 'H5' }], o: { at?: string; hit?: boolean } = {}) {
    const f = fight(weapon, foes, { at: o.at, allies: [{ at: 'C7', weapon: 'service_pistol', known: [] }] });
    f.foe.hp = 999; f.foe.maxHp = 999; const ally = f.pcs[1]; f.turn(ally); rig({ hit: o.hit ?? true, die: 12 }); f.tech('shot', { targetId: f.foe.id }); rig(null);
    f.turn(f.pc); f.pc.heat = 0; return { f, ally };
  }
  it('needs a target an ally has hit this round', () => {
    const f = fight('service_pistol'); expect(f.tech('crossfire', { targetId: f.foe.id })).toBe('No ally has hit ' + f.foe.name + ' this round.');
    const m = crossed('service_pistol', [{ at: 'H5' }], { hit: false }); expect(m.f.tech('crossfire', { targetId: m.f.foe.id })).toBe('No ally has hit ' + m.f.foe.name + ' this round.');
    expect(f.pc.ap).toBe(6); expect(f.pc.ammo).toBe(12);
  });
  it('the ally\'s hit must be this round, and the user\'s own hit doesn\'t count (review fix: no test pinned either)', () => {
    const { f } = crossed('service_pistol'); f.cb.round += 1; // the ally's hit was last round
    expect(f.tech('crossfire', { targetId: f.foe.id })).toBe('No ally has hit ' + f.foe.name + ' this round.');
    const g = fight('service_pistol'); g.foe.hp = 999; g.foe.maxHp = 999; rig({ hit: true, die: 12 }); g.tech('shot', { targetId: g.foe.id });
    expect(g.foe.hitRound?.[g.pc.id]).toBe(g.cb.round); // only the user hit it
    expect(g.tech('crossfire', { targetId: g.foe.id })).toBe('No ally has hit ' + g.foe.name + ' this round.');
  });
  it('+2 to hit and +1 Pressure on a hit on top of the hit\'s own; 2 AP (3 with the long rifle: its bolt, rules 1.18), 1 round, Heat 1 + 1', () => {
    const { f } = crossed('long_rifle'); expect(f.pressure(f.foe)).toBe(1);
    let pv!: phys.TechPreview; unchanged(f, () => { pv = f.pv('crossfire', { targetId: f.foe.id }); });
    expect(pv.ok).toBe(true); expect(pv.ap).toBe(3); expect(pv.rounds).toBe(1); expect(term(pv, 0, 'Crossfire')).toBe(2);
    expect(crossed('lever_carbine').f.pv('crossfire', { targetId: f.foe.id }).ap).toBe(2);
    expect(pressAfter(pv, f.foe)).toBe(3); expect(pv.pressure![0].onHit).toBe(true);
    rig({ hit: true, die: 12 }); expect(f.tech('crossfire', { targetId: f.foe.id })).toBeNull();
    expect(f.pressure(f.foe)).toBe(3); expect(f.pc.ap).toBe(3); expect(f.pc.ammo).toBe(4); expect(f.pc.heat).toBe(2);
  });
  it('a miss gives nothing extra', () => {
    const { f } = crossed('long_rifle'); rig({ hit: false, die: 5 }); f.tech('crossfire', { targetId: f.foe.id }); expect(f.pressure(f.foe)).toBe(1);
  });
  it('Quick: step 1 tile first, with no opportunity attack; without Quick there is no step', () => {
    const { f } = crossed('service_pistol', [{ at: 'H5' }, { at: 'C6', weapon: 'sabre' }]), sw = f.foes[1], hp = f.pc.hp;
    const pv = f.pv('crossfire', { targetId: f.foe.id, tile: f.tile('C4') }); expect(pv.ok).toBe(true); expect(pv.moves).toEqual([{ unit: f.pc.id, to: f.tile('C4') }]);
    rig({ hit: true, die: 12 }); expect(f.tech('crossfire', { targetId: f.foe.id, tile: f.tile('C4') })).toBeNull();
    expect(f.pc.pos).toBe(f.tile('C4')); expect(f.pc.hp).toBe(hp); expect(reactionsUsed(f.cb, f.unit(sw.id))).toBe(0);
    expect(f.pressure(f.foe)).toBe(3);
    const g = crossed('long_rifle').f; expect(g.tech('crossfire', { targetId: g.foe.id, tile: g.tile('C4') })).toBe('Only a Quick weapon lets you step before the shot.');
    const h = crossed('service_pistol').f; expect(h.tech('crossfire', { targetId: h.foe.id, tile: h.tile('C2') })).toBe('You can\'t step there: one tile, onto free ground.');
    expect(h.pc.pos).toBe(h.tile('C5')); expect(h.pc.ap).toBe(6);
  });
  it('the preview\'s roll is the action\'s; an enemy wants it once an ally has hit', () => {
    const { f } = crossed('long_rifle'); const pv = f.pv('crossfire', { targetId: f.foe.id }); rig({ hit: false, die: 5 }); const at = f.cb.log.length;
    f.tech('crossfire', { targetId: f.foe.id }); expect(rolledToHit(f, at, f.pc)).toEqual(pvToHit(pv));
    const g = crossed('long_rifle').f; expect(g.bound(() => phys.aiScore(g.cb, g.pc, 'crossfire', { targetId: g.foe.id })).score).toBeGreaterThan(5);
    const h = fight('long_rifle'); expect(h.bound(() => phys.aiScore(h.cb, h.pc, 'crossfire', { targetId: h.foe.id })).score).toBe(0);
  });
});

describe('every Press', () => {
  it('a preview of each changes nothing', () => {
    const f = fight('service_pistol', [{ at: 'G5' }, { at: 'G6' }]); f.foe.sv = { body: 0, brain: 0, heart: -50 }; D.die = 1;
    unchanged(f, () => { for (const id of PRESS) f.pv(id, { targetId: f.foe.id, tile: f.tile('C4') }); });
  });
});

// ---------- the core's gates (review fixes) ----------
describe('a grenade named as a technique\'s weapon (the base\'s throwable wield)', () => {
  it('a technique the grenade doesn\'t lend or fit can\'t be used with it, and a gun\'s own technique still needs its rounds (and a jam still stops it)', () => {
    const f = fight('hellraiser_service_rifle'); f.pc.ammo = 1; f.pc.throwables = { frag_grenade: 1 };
    expect(f.tech('suppress', { targetId: f.foe.id })).toBe('Needs 3 rounds, 1 loaded.');
    expect(f.tech('suppress', { targetId: f.foe.id, item: 'frag_grenade' })).toBe('Suppress can\'t be used with that.');
    expect(f.tech('suppress', { targetId: f.foe.id, ammo: 'frag_grenade' })).toBe('Needs 3 rounds, 1 loaded.'); // a round type isn't a grenade
    f.pc.ammo = 0; expect(f.tech('mag_dump', { targetId: f.foe.id })).toBe('Empty: reload first.');
    f.pc.ammo = 24; f.pc.jammed = true;
    expect(f.tech('suppress', { targetId: f.foe.id })).toBe('Jammed: clear it first.');
    expect(f.pc.ap).toBe(6); expect(f.pressure(f.foe)).toBe(0); expect(f.pc.throwables).toEqual({ frag_grenade: 1 });
  });
});

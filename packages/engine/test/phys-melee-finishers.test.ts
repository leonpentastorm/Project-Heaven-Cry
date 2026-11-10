// Physical 2.0 (rules 1.12), the melee Finishers built by the melee lane: Cleave (21), Break (22), Run Through (23) and
// Throw Down (24). Coup (20) is the lead's reference (phys-core.test.ts).
import { describe, it, expect, beforeEach } from 'vitest';
import { phys, applyCond } from '../src';
import { pullFree, moveBlock } from '../src/combat';
import { physFight, rig } from './helpers/physfight';

beforeEach(() => rig(null));
const SK = { athletics: 6, raw_power: 4, dexterity: 6 };
/** A fight: one PC with a weapon at C5 on its turn, the foes where given (default D5), Momentum set. */
function fight(weapon: string, ids: string[], foes: { at: string; tier?: string }[] = [{ at: 'D5' }], m = 3) {
  const f = physFight([{ weapon, known: ids, skills: SK }], foes.map((x) => ({ tier: 'soldier', ...x })), { seed: 'FINISH1' });
  f.put(f.pc, 'C5'); foes.forEach((x, i) => { const u = f.put(f.foes[i], x.at); u.hp = u.maxHp = 500; }); f.turn(f.pc); f.momentum(f.pc, m);
  return f;
}
type F = ReturnType<typeof fight>;
const hpOf = (f: F, i = 0) => f.unit(f.foes[i].id).hp;
/** What a previewed hit does to HP (the engine: at least 1, after armour). */
const dealt = (a: { pv: any }) => Math.max(1, Math.floor(a.pv.dmg.total) - a.pv.dmg.armour);
const terms = (pv: any) => pv.attacks[0].pv.terms as { v: number; label: string }[];
/** Saves always fail (a huge minus) or always pass. */
const saves = (f: F, u: { id: string }, n: number) => { f.unit(u.id).sv = { body: n, brain: n, heart: n } as any; };
const chainEnded = (f: F) => expect(f.tech('cut', { targetId: f.foe.id })).toMatch(/chain has ended/);
const unchanged = (f: F, id: string, args: any) => { const before = JSON.stringify(f.g); f.pv(id, args); expect(JSON.stringify(f.g)).toBe(before); };

describe('Cleave (21)', () => {
  const three = (weapon: string, m = 2) => fight(weapon, ['cleave'], [{ at: 'D5' }, { at: 'D6' }, { at: 'C6' }, { at: 'E5' }], m);
  it('one strike, then one more adjacent enemy per Momentum spent, each at full damage; spends all and ends the chain', () => {
    const f = three('ork_machete', 2); f.unit(f.foes[3].id).pos = f.tile('J9'); // nobody 2 tiles out: Heavy has nothing more
    const pv = f.pv('cleave', { targetId: f.foe.id }); expect(pv.ok).toBe(true);
    expect(pv.attacks[0].target).toBe(f.foes[0].id); expect(pv.attacks.map((a) => a.target).sort()).toEqual([f.foes[0].id, f.foes[1].id, f.foes[2].id].sort());
    const cut = f.pv('cut', { targetId: f.foe.id }).attacks[0].pv.dmg!.total;
    for (const a of pv.attacks) expect(a.pv.dmg!.total).toBeCloseTo(cut, 5);
    expect(pv.momentum).toEqual({ now: 2, after: 0 }); expect(pv.ends).toBe(true); expect(pv.ap).toBe(3);
    rig({ hit: true, die: 12 }); const hp = [0, 1, 2].map((i) => hpOf(f, i));
    expect(f.tech('cleave', { targetId: f.foe.id })).toBeNull();
    [0, 1, 2].forEach((i) => expect(hpOf(f, i)).toBe(hp[i] - dealt(pv.attacks.find((a) => a.target === f.foes[i].id)!))); // preview == run
    expect(f.pc.ap).toBe(3); expect(f.momentum(f.pc)).toBe(0); chainEnded(f);
  });
  it('Momentum 2 against one neighbour strikes two; the player may name the extra targets', () => {
    const f = three('ork_machete', 2);
    const pv = f.pv('cleave', { targetId: f.foe.id, targetIds: [f.foes[2].id] });
    expect(pv.attacks.map((a) => a.target)).toEqual([f.foes[0].id, f.foes[2].id]);
  });
  it('Heavy: the extra targets may be 2 tiles away; without Heavy only adjacent ones', () => {
    const f = three('ork_machete', 3); // heavy is the machete's first line
    expect(f.pv('cleave', { targetId: f.foe.id }).attacks.map((a) => a.target)).toContain(f.foes[3].id);
    const g = three('sabre', 3);
    expect(g.pv('cleave', { targetId: g.foe.id }).attacks.map((a) => a.target)).not.toContain(g.foes[3].id);
    const h = three('ork_machete', 3); // the machete with its Edge line chosen: adjacent only
    expect(h.pv('cleave', { targetId: h.foe.id, line: 'edge' }).attacks.map((a) => a.target)).not.toContain(h.foes[3].id);
  });
  it('Edge: every target hit bleeds; without Edge none does', () => {
    const f = three('sabre', 2); rig({ hit: true, die: 12 });
    expect(f.tech('cleave', { targetId: f.foe.id })).toBeNull();
    [0, 1, 2].forEach((i) => expect(f.unit(f.foes[i].id).bleed).toBeGreaterThan(0));
    const g = three('ork_machete', 2); rig({ hit: true, die: 12 });
    g.tech('cleave', { targetId: g.foe.id }); [0, 1, 2].forEach((i) => expect(g.unit(g.foes[i].id).bleed || 0).toBe(0));
  });
  it('off its home (no Heavy or Edge): −2 to hit and no line', () => {
    const f = three('kemizuchi_duelling_blade', 2);
    expect(terms(f.pv('cleave', { targetId: f.foe.id })).some((x) => x.v === -2 && /off its home/.test(x.label))).toBe(true);
    rig({ hit: true, die: 12 }); f.tech('cleave', { targetId: f.foe.id }); expect(f.unit(f.foe.id).bleed || 0).toBe(0);
    const g = three('sabre', 2); expect(terms(g.pv('cleave', { targetId: g.foe.id })).some((x) => /off its home/.test(x.label))).toBe(false);
  });
  it('refuses without Momentum 2, without a target, on an ally, out of reach; nothing spent', () => {
    const f = three('sabre', 1); expect(f.tech('cleave', { targetId: f.foe.id })).toMatch(/Momentum 2/);
    f.momentum(f.pc, 2);
    expect(f.tech('cleave', {})).toMatch(/Pick a target/);
    const two = physFight([{ weapon: 'sabre', known: ['cleave'], skills: SK }, { weapon: 'sabre' }], [{ at: 'J9' }]);
    two.put(two.pcs[0], 'C5'); two.put(two.pcs[1], 'D5'); two.turn(two.pcs[0]); two.momentum(two.pcs[0], 2);
    expect(two.tech('cleave', { targetId: two.pcs[1].id })).toMatch(/enemy/);
    expect(two.tech('cleave', { targetId: two.foe.id })).toBeTruthy();
    expect(two.unit(two.pcs[0].id).ap).toBe(6); expect(two.momentum(two.pcs[0])).toBe(2);
  });
  it('a miss still spends the Momentum and ends the chain; the variety bonus never applies to a Finisher', () => {
    const f = three('sabre', 0); rig({ hit: true, die: 12 });
    f.tech('cut', { targetId: f.foe.id }); expect(f.momentum(f.pc)).toBe(1);
    f.momentum(f.pc, 2); rig({ hit: false, die: 5 });
    expect(f.tech('cleave', { targetId: f.foe.id })).toBeNull(); expect(f.momentum(f.pc)).toBe(0); chainEnded(f);
  });
  it('a preview changes nothing', () => { const f = three('sabre', 3); unchanged(f, 'cleave', { targetId: f.foe.id }); });
});

describe('Break (22)', () => {
  const one = (weapon: string, tier = 'soldier', m = 3) => { const f = fight(weapon, ['break'], [{ at: 'D5', tier }], m); f.unit(f.foe.id).armour = 4; return f; };
  it('one strike; a Body save at −1 per Momentum spent, failed: Stunned. Spends all, ends the chain', () => {
    const f = one('sabre'); saves(f, f.foe, -50);
    const pv = f.pv('break', { targetId: f.foe.id }); expect(pv.ok).toBe(true);
    expect(pv.saves).toEqual([{ unit: f.foe.id, skills: ['body'], tn: 12 + 3 + 3 }]); /* 12 + Momentum 3 + half of strength 5, rounded up */ expect(pv.momentum).toEqual({ now: 3, after: 0 }); expect(pv.ap).toBe(2);
    rig({ hit: true, die: 12 }); const hp = hpOf(f);
    expect(f.tech('break', { targetId: f.foe.id })).toBeNull();
    expect(hpOf(f)).toBe(hp - dealt(pv.attacks[0])); // preview == run
    expect(f.unit(f.foe.id).conds?.stunned).toBeGreaterThan(0); expect(f.unit(f.foe.id).armour).toBe(4); // no Blunt
    expect(f.unit(f.foe.id).conds?.disarmed || 0).toBe(0); expect(f.momentum(f.pc)).toBe(0); expect(f.pc.ap).toBe(4); chainEnded(f);
  });
  it('a save that passes stops it; a miss rolls no save', () => {
    const f = one('sabre'); saves(f, f.foe, 50); rig({ hit: true, die: 12 });
    f.tech('break', { targetId: f.foe.id }); expect(f.unit(f.foe.id).conds?.stunned || 0).toBe(0);
    const g = one('sabre'); saves(g, g.foe, -50); rig({ hit: false, die: 5 });
    g.tech('break', { targetId: g.foe.id }); expect(g.unit(g.foe.id).conds?.stunned || 0).toBe(0); expect(g.momentum(g.pc)).toBe(0);
  });
  it('a boss is Dazed instead', () => {
    const f = one('sabre', 'boss'); saves(f, f.foe, -50); rig({ hit: true, die: 12 });
    f.tech('break', { targetId: f.foe.id }); expect(f.unit(f.foe.id).dazedNext).toBe(1); expect(f.unit(f.foe.id).conds?.stunned || 0).toBe(0);
  });
  it('Blunt: its armour is also 0, until your next turn', () => {
    const f = one('maul'); saves(f, f.foe, -50); rig({ hit: true, die: 12 });
    expect(f.pv('break', { targetId: f.foe.id }).notes.some((n) => /armour 0/.test(n))).toBe(true);
    expect(f.tech('break', { targetId: f.foe.id })).toBeNull(); expect(f.unit(f.foe.id).armour).toBe(0); expect(f.pc.ap).toBe(3);
    f.turn(f.foe); expect(f.unit(f.foe.id).armour).toBe(0);
    f.cb.round++; f.turn(f.pc); expect(f.unit(f.foe.id).armour).toBe(4);
  });
  it('Hook: it is Disarmed as well; without Hook it isn\'t', () => {
    const f = one('war_axe'); saves(f, f.foe, -50); rig({ hit: true, die: 12 });
    f.tech('break', { targetId: f.foe.id }); expect(f.unit(f.foe.id).conds?.disarmed).toBeGreaterThan(0); expect(f.unit(f.foe.id).conds?.stunned).toBeGreaterThan(0);
    const g = one('maul'); saves(g, g.foe, -50); rig({ hit: true, die: 12 });
    g.tech('break', { targetId: g.foe.id }); expect(g.unit(g.foe.id).conds?.disarmed || 0).toBe(0);
  });
  it('refuses without Momentum 2 or a target; nothing spent', () => {
    const f = one('maul', 'soldier', 1); expect(f.tech('break', { targetId: f.foe.id })).toMatch(/Momentum 2/);
    f.momentum(f.pc, 2); expect(f.tech('break', {})).toMatch(/Pick a target/);
    f.put(f.foe, 'J9'); expect(f.tech('break', { targetId: f.foe.id })).toBeTruthy();
    expect(f.pc.ap).toBe(6); expect(f.momentum(f.pc)).toBe(2);
  });
  it('a preview changes nothing', () => { const f = one('war_axe'); unchanged(f, 'break', { targetId: f.foe.id }); });
});

describe('Run Through (23)', () => {
  const one = (weapon: string, m = 3, foes = [{ at: 'D5' }]) => { const f = fight(weapon, ['run_through'], foes, m); f.foes.forEach((x) => (f.unit(x.id).armour = 4)); return f; };
  it('one strike at +20% per Momentum spent; a hit Pins the target until it spends 2 AP to pull free', () => {
    const f = one('kemizuchi_duelling_blade');
    const pv = f.pv('run_through', { targetId: f.foe.id }), cut = f.pv('cut', { targetId: f.foe.id }).attacks[0].pv.dmg!.total;
    expect(pv.attacks[0].pv.dmg!.total).toBeCloseTo(cut * 1.6, 5); expect(pv.momentum).toEqual({ now: 3, after: 0 }); expect(pv.ends).toBe(true);
    rig({ hit: true, die: 12 }); const hp = hpOf(f);
    expect(f.tech('run_through', { targetId: f.foe.id })).toBeNull();
    expect(hpOf(f)).toBe(hp - dealt(pv.attacks[0])); // preview == run
    expect(f.unit(f.foe.id).nailed).toMatchObject({ by: f.pc.id, id: 'run_through', ap: 2 }); expect(f.momentum(f.pc)).toBe(0); expect(f.pc.ap).toBe(4); chainEnded(f);
    f.turn(f.foe); const foe = f.unit(f.foe.id); expect(moveBlock(foe)).toMatch(/Nailed/);
    expect(pullFree(f.cb, foe)).toBeNull(); // its turn: it pays 2 AP to pull free
    expect(foe.nailed).toBeUndefined(); expect(foe.ap).toBe(4);
  });
  it('a miss pins nothing', () => {
    const f = one('kemizuchi_duelling_blade'); rig({ hit: false, die: 5 });
    f.tech('run_through', { targetId: f.foe.id }); expect(f.unit(f.foe.id).nailed).toBeUndefined(); expect(f.momentum(f.pc)).toBe(0);
  });
  it('Point: ignores armour, and strikes the enemy directly behind at half', () => {
    const f = one('kemizuchi_duelling_blade', 3, [{ at: 'D5' }, { at: 'E5' }]);
    const pv = f.pv('run_through', { targetId: f.foe.id });
    expect(pv.attacks.map((a) => a.target)).toEqual([f.foes[0].id, f.foes[1].id]);
    expect(pv.attacks[0].pv.dmg!.armour).toBe(0); expect(pv.attacks[1].pv.dmg!.total).toBeCloseTo(pv.attacks[0].pv.dmg!.total / 2, 5);
    rig({ hit: true, die: 12 }); const hp1 = hpOf(f, 1);
    f.tech('run_through', { targetId: f.foe.id }); expect(hpOf(f, 1)).toBe(hp1 - dealt(pv.attacks[1]));
    const g = one('bot_thread_banner', 3, [{ at: 'D5' }, { at: 'E5' }]); // Reach, no Point
    const gp = g.pv('run_through', { targetId: g.foe.id }); expect(gp.attacks.length).toBe(1); expect(gp.attacks[0].pv.dmg!.armour).toBe(4);
  });
  it('Reach without Point: −2 to hit; with Point no such penalty', () => {
    const f = one('bot_thread_banner');
    expect(terms(f.pv('run_through', { targetId: f.foe.id })).some((x) => x.v === -2 && /Run Through/.test(x.label) && !/home/.test(x.label))).toBe(true);
    const g = one('lance');
    expect(terms(g.pv('run_through', { targetId: g.foe.id, line: 'reach' })).some((x) => x.v === -2)).toBe(false);
  });
  it('Reach: leave the weapon in. You are unarmed; it drops into the pile on the target\'s tile when pulled free', () => {
    const f = one('lance'); rig({ hit: true, die: 12 });
    expect(f.tech('run_through', { targetId: f.foe.id, line: 'point', opt: 'leave' })).toMatch(/Reach/);
    expect(f.pc.ap).toBe(6); expect(f.momentum(f.pc)).toBe(3);
    expect(f.tech('run_through', { targetId: f.foe.id, line: 'reach', opt: 'leave' })).toBeNull();
    expect(f.pc.weapon).toBe('fists'); expect(f.char(f.pc).weapon).toBe('fists'); expect(f.pc.ap).toBe(3);
    const pileOf = () => (f.cb.objects || []).find((o: any) => o.pos === f.foe.pos && o.kind === 'pile' && /"lance"/.test(JSON.stringify(o.items)));
    expect(f.unit(f.foe.id).nailed).toMatchObject({ weapon: 'lance' }); expect(pileOf()).toBeFalsy(); // it is in the target
    f.turn(f.foe); expect(pullFree(f.cb, f.unit(f.foe.id))).toBeNull(); expect(pileOf()).toBeTruthy();
    const g = one('kemizuchi_duelling_blade'); expect(g.tech('run_through', { targetId: g.foe.id, opt: 'leave' })).toMatch(/Reach/);
  });
  it('off its home (no Point or Reach): −2 to hit, no armour ignored', () => {
    const f = one('sabre'); const pv = f.pv('run_through', { targetId: f.foe.id });
    expect(terms(pv).some((x) => /off its home/.test(x.label))).toBe(true); expect(pv.attacks[0].pv.dmg!.armour).toBe(4);
  });
  it('refuses without Momentum 2; nothing spent', () => {
    const f = one('lance', 1); expect(f.tech('run_through', { targetId: f.foe.id })).toMatch(/Momentum 2/); expect(f.pc.ap).toBe(6);
  });
  it('a preview changes nothing', () => { const f = one('lance', 3, [{ at: 'D5' }, { at: 'E5' }]); unchanged(f, 'run_through', { targetId: f.foe.id, line: 'reach', opt: 'leave' }); });
});

describe('Throw Down (24)', () => {
  const grab = (f: F, by = f.pc, tgt = f.foe) => f.bound(() => applyCond(f.cb, f.g.rng, f.unit(by.id), f.unit(tgt.id), 'grappled', undefined, undefined, { skipSave: true }));
  const one = (weapon: string, foes = [{ at: 'D5' }], m = 3) => fight(weapon, ['throw_down'], foes, m);
  it('only on a target you have Grappled or Bound', () => {
    const f = one('fists'); expect(f.tech('throw_down', { targetId: f.foe.id })).toMatch(/Bound or Grappled/); expect(f.pc.ap).toBe(6);
    expect(f.pv('throw_down', { targetId: f.foe.id }).ok).toBe(false);
    f.unit(f.pc.id).tech = { bind: { target: f.foe.id, pen: 2 } } as any; expect(f.pv('throw_down', { targetId: f.foe.id }).ok).toBe(true);
  });
  it('slams it into a tile next to you: ×1 + 25% per Momentum, Prone, and the grapple ends; Bare needs no roll', () => {
    const f = one('fists'); grab(f);
    const pv = f.pv('throw_down', { targetId: f.foe.id, tile: 'C4' }); expect(pv.ok).toBe(true);
    const cut = f.pv('cut', { targetId: f.foe.id }).attacks[0].pv.dmg!.total;
    expect(pv.attacks[0].pv.dmg!.total).toBeCloseTo(cut * 1.75, 5); expect(pv.attacks[0].pv.pct).toBe(100);
    expect(pv.moves).toEqual([{ unit: f.foe.id, to: f.tile('C4') }]); expect(pv.momentum).toEqual({ now: 3, after: 0 }); expect(pv.ap).toBe(2);
    rig({ die: 1 }); const hp = hpOf(f); // a natural 1: Bare needs no roll
    expect(f.tech('throw_down', { targetId: f.foe.id, tile: 'C4' })).toBeNull();
    const foe = f.unit(f.foe.id);
    expect(foe.hp).toBe(hp - dealt(pv.attacks[0])); expect(foe.pos).toBe(f.tile('C4')); expect(foe.prone).toBe(true);
    expect(foe.conds?.grappled || 0).toBe(0); expect(f.momentum(f.pc)).toBe(0); expect(f.pc.ap).toBe(4); expect(f.pc.stunnedNext || 0).toBe(0); chainEnded(f);
  });
  it('without Bare it rolls: off its home a miss does nothing but spend the Momentum, and the bind holds', () => {
    const f = one('sabre'); f.unit(f.pc.id).tech = { bind: { target: f.foe.id, pen: 2 } } as any;
    expect(terms(f.pv('throw_down', { targetId: f.foe.id })).some((x) => /off its home/.test(x.label))).toBe(true);
    rig({ hit: false, die: 5 });
    expect(f.tech('throw_down', { targetId: f.foe.id, tile: 'C4' })).toBeNull();
    expect(f.foe.pos).toBe(f.tile('D5')); expect(f.foe.prone || false).toBe(false); expect(f.momentum(f.pc)).toBe(0);
    expect((f.pc as any).tech.bind.target).toBe(f.foe.id);
    const g = one('sabre'); g.unit(g.pc.id).tech = { bind: { target: g.foe.id, pen: 2 } } as any; rig({ hit: true, die: 12 });
    g.tech('throw_down', { targetId: g.foe.id }); expect(g.foe.prone).toBe(true); expect((g.pc as any).tech.bind.target).toBeUndefined();
  });
  it('Heavy: you may throw it 2 tiles; without Heavy that is too far', () => {
    const f = one('hellraiser_servo_fist'); grab(f);
    expect(f.tech('throw_down', { targetId: f.foe.id, tile: 'A5', line: 'bare' })).toMatch(/Too far/);
    expect(f.pv('throw_down', { targetId: f.foe.id, tile: 'A5', line: 'heavy' }).ok).toBe(true);
    expect(f.pv('throw_down', { targetId: f.foe.id, tile: 'A5', line: 'heavy' }).ap).toBe(f.pv('cut', { targetId: f.foe.id }).ap);
    rig({ hit: true, die: 12 }); expect(f.tech('throw_down', { targetId: f.foe.id, tile: 'A5', line: 'heavy' })).toBeNull();
    expect(f.unit(f.foe.id).pos).toBe(f.tile('A5'));
    const g = one('fists'); grab(g); expect(g.tech('throw_down', { targetId: g.foe.id, tile: 'A5' })).toMatch(/Too far/); expect(g.pc.ap).toBe(6);
    expect(g.tech('throw_down', { targetId: g.foe.id, tile: 'C5' })).toMatch(/own tile/);
  });
  it('anyone on that tile is struck at half of the slam (Momentum included) and must save or fall Prone', () => {
    const f = one('fists', [{ at: 'D5' }, { at: 'C4' }]); grab(f); saves(f, f.foes[1], -50);
    const pv = f.pv('throw_down', { targetId: f.foe.id, tile: 'C4' });
    expect(pv.attacks.map((a) => a.target)).toEqual([f.foes[0].id, f.foes[1].id]);
    expect(pv.attacks[1].pv.dmg!.total).toBeCloseTo(pv.attacks[0].pv.dmg!.total / 2, 5); // half of the slam, Momentum included
    expect(pv.saves?.map((s) => s.unit)).toEqual([f.foes[1].id]);
    const hp1 = hpOf(f, 1);
    expect(f.tech('throw_down', { targetId: f.foe.id, tile: 'C4' })).toBeNull();
    expect(hpOf(f, 1)).toBe(hp1 - dealt(pv.attacks[1])); expect(f.unit(f.foes[1].id).prone).toBe(true);
    expect(f.unit(f.foe.id).pos).toBe(f.tile('D5')); expect(f.unit(f.foe.id).prone).toBe(true);
    const g = one('fists', [{ at: 'D5' }, { at: 'C4' }]); grab(g); saves(g, g.foes[1], 50);
    g.tech('throw_down', { targetId: g.foe.id, tile: 'C4' }); expect(g.unit(g.foes[1].id).prone || false).toBe(false);
  });
  it('the moved enemy sets off a held Watch on the way', () => {
    const f = physFight([{ weapon: 'fists', known: ['throw_down'], skills: SK }, { weapon: 'ccec_marksman_rifle', known: ['deny'], skills: SK }], [{ at: 'D5', tier: 'elite' }]);
    f.put(f.pcs[0], 'C5'); f.put(f.pcs[1], 'C9'); f.put(f.foe, 'D5');
    f.turn(f.pcs[1]); expect(f.tech('deny', { tile: 'D4' })).toBeNull();
    f.turn(f.pcs[0]); f.momentum(f.pcs[0], 2); grab(f, f.pcs[0]); rig({ hit: true, die: 12 });
    const hp = hpOf(f);
    expect(f.tech('throw_down', { targetId: f.foe.id, tile: 'D4' })).toBeNull();
    expect(f.fx('watch_fire').length).toBe(1); expect(f.unit(f.pcs[1].id).watch).toBeUndefined();
    expect(hpOf(f)).toBeLessThan(hp);
  });
  it('a melee stop is not blocked by Stopped once, and sets none (the core keeps Stopped once for ranged)', () => {
    const f = one('fists'); grab(f); f.unit(f.foe.id).stopped = 1;
    rig({ hit: true, die: 12 }); f.tech('throw_down', { targetId: f.foe.id, tile: 'C4' });
    expect(f.unit(f.foe.id).prone).toBe(true); expect(f.unit(f.foe.id).stopped).toBe(1);
  });
  it('refuses without Momentum 2; nothing spent', () => {
    const f = one('fists', [{ at: 'D5' }], 1); grab(f); expect(f.tech('throw_down', { targetId: f.foe.id })).toMatch(/Momentum 2/); expect(f.pc.ap).toBe(6);
  });
  it('a preview changes nothing', () => {
    const f = one('fists', [{ at: 'D5' }, { at: 'C4' }]); grab(f); unchanged(f, 'throw_down', { targetId: f.foe.id, tile: 'C4' });
    unchanged(f, 'throw_down', { targetId: f.foe.id, tile: 'D4' });
  });
});

describe('the pad', () => {
  it('lists all four as built', () => {
    const f = fight('sabre', ['cleave', 'break', 'run_through', 'throw_down']);
    const e = f.pad().flatMap((g) => g.entries);
    for (const id of ['cleave', 'break', 'run_through', 'throw_down']) expect(e.find((x) => x.id === id)?.built, id).toBe(true);
    expect(phys.handlerOf('throw_down')).toBeTruthy();
  });
});

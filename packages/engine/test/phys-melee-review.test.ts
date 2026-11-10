// Physical 2.0 (rules 1.12), melee lane: regression tests for the review findings fixed in melee/ (one block each).
import { describe, it, expect, beforeEach } from 'vitest';
import { previewAttack, WEAPON, type Unit } from '../src';
import { applyCond } from '../src/magic';
import { onHook } from '../src/effects/hooks';
import { pileAt as pileOf } from '../src/containers';
import { d20 } from '../src/rng';
import { physFight, rig } from './helpers/physfight';

beforeEach(() => { rig(null); redirect = null; });
type F = ReturnType<typeof physFight>;
/** Set the game's dice so the next d20s are not natural 1s or 20s. */
function quiet(f: F) { for (let s = f.g.rng.state; ; s++) { const r = { state: s }; if (Array.from({ length: 8 }, () => d20(r)).every((d) => d > 1 && d < 20)) { f.g.rng.state = s; return; } } }
const saves = (f: F, u: { id: string }, n: number) => { f.unit(u.id).sv = { body: n, brain: n, heart: n } as any; quiet(f); };
const at = (f: F, u: Unit) => f.unit(u.id).pos;
const SK = { athletics: 6, raw_power: 4, dexterity: 6 };
/** Items that redirect an attack (a captive held as a shield, Confused): every PC attack goes to this unit. */
let redirect: string | null = null;
onHook('attack_target', (ctx: any) => { if (redirect && ctx.att.side === 'pc') ctx.tgt = ctx.cb.units.find((x: any) => x.id === redirect); });
const pileAt = (f: F, k: string): string[] => (pileOf(f.cb.objects || [], k)?.items || []).map((x: any) => x.item || x.pack?.weapon || x.id);

describe('Charge', () => {
  const run = () => {
    const f = physFight([{ weapon: 'sabre', known: ['charge'], skills: SK }], [{ at: 'E4', tier: 'elite' }]);
    f.cb.objects = []; f.put(f.pc, 'A5'); f.put(f.foe, 'E4'); f.unit(f.foe.id).hp = f.unit(f.foe.id).maxHp = 500; f.turn(f.pc);
    return f;
  };
  it('naming its own tile strikes from where it stands after the run it walked (no run on)', () => {
    const f = run(); expect(f.walk(f.pc, 'D5')).toBeNull(); const here = at(f, f.pc), ap = f.unit(f.pc.id).ap;
    const pv = f.pv('charge', { targetId: f.foe.id, tile: here }); expect(pv.ok).toBe(true);
    expect(pv.moves || []).toEqual([]); expect(pv.ap).toBe(f.pv('cut', { targetId: f.foe.id }).ap);
    expect(pv.attacks[0].pv.dmg!.total).toBeCloseTo(f.pv('cut', { targetId: f.foe.id }).attacks[0].pv.dmg!.total * 1.3, 5);
    rig({ hit: true, die: 12 }); expect(f.tech('charge', { targetId: f.foe.id, tile: here })).toBeNull();
    expect(at(f, f.pc)).toBe(here); expect(f.unit(f.pc.id).ap).toBe(ap - pv.ap);
  });
  it('its own tile with no run of 3 behind it: refused in words', () => {
    const f = run(); f.put(f.pc, 'D5');
    expect(f.tech('charge', { targetId: f.foe.id, tile: at(f, f.pc) })).toMatch(/straight run of 3/);
  });
  it('a run walked with a weapon that can\'t Charge still counts once a sabre is drawn', () => {
    const rifle = Object.keys(WEAPON).find((k) => /rifle/.test(k) && !(WEAPON as any)[k].melee)!;
    const f = physFight([{ weapon: rifle, known: ['charge'], skills: SK }], [{ at: 'F5', tier: 'elite' }]);
    f.cb.objects = []; f.put(f.pc, 'B5'); f.put(f.foe, 'F5'); f.turn(f.pc);
    expect(f.walk(f.pc, 'E5')).toBeNull(); f.unit(f.pc.id).weapon = 'sabre';
    const pv = f.pv('charge', { targetId: f.foe.id }); expect(pv.ok).toBe(true); expect(pv.moves || []).toEqual([]);
  });
});

describe('Feint: an enemy\'s Brain debuff strength is its tier\'s', () => {
  for (const [tier, tn] of [['minion', 14], ['soldier', 15], ['elite', 16], ['boss', 16]] as const) it(tier, () => {
    const f = physFight([{ weapon: 'sabre' }], [{ at: 'D5', tier, weapon: 'sabre' }]);
    f.put(f.pc, 'C5'); f.put(f.foe, 'D5'); (f.unit(f.foe.id) as any).techs = ['feint']; f.unit(f.foe.id).ap = 6;
    const pv = f.pv('feint', { targetId: f.pc.id }, f.foe); expect(pv.ok).toBe(true);
    expect(pv.saves?.[0]).toMatchObject({ unit: f.pc.id, skills: ['brain'], tn }); // 12 + debuff + 2 (sabre: Light)
  });
});

describe('riders go on the unit really struck (a redirected attack)', () => {
  const mk = (weapon: string, known: string[], m = 0) => {
    const f = physFight([{ weapon, known, skills: SK }], [{ at: 'D5', tier: 'elite' }, { at: 'D6', tier: 'elite' }]);
    f.put(f.pc, 'C5'); f.foes.forEach((x, i) => { f.put(x, i ? 'D6' : 'D5'); Object.assign(f.unit(x.id), { hp: 999, maxHp: 999, armour: 10 }); });
    f.turn(f.pc); f.momentum(f.pc, m); f.foes.forEach((x) => saves(f, x, -99)); rig({ hit: true, die: 12 });
    return f;
  };
  const a = (f: F) => f.unit(f.foes[0].id), b = (f: F) => f.unit(f.foes[1].id);
  const go = (f: F, id: string, args: any = {}) => { redirect = f.foes[1].id; try { expect(f.tech(id, { targetId: f.foes[0].id, ...args })).toBeNull(); } finally { redirect = null; } };
  it('Bash: the struck unit is Dazed, the one picked is untouched', () => {
    const f = mk('sabre', ['bash']); go(f, 'bash');
    expect(a(f).hp).toBe(999); expect(b(f).hp).toBeLessThan(999); expect(b(f).dazedNext || (b(f) as any).conds?.dazed).toBeTruthy(); expect((a(f) as any).conds?.dazed).toBeFalsy();
  });
  it('Sunder: the struck unit\'s armour drops', () => {
    const f = mk('maul', ['sunder']); go(f, 'sunder'); expect(a(f).armour).toBe(10); expect(b(f).armour).toBe(0);
  });
  it('Hamstring: the struck unit is Slowed', () => {
    const f = mk('sabre', ['hamstring']); go(f, 'hamstring', { line: 'edge' });
    expect((b(f) as any).conds?.slowed).toBeTruthy(); expect((a(f) as any).conds?.slowed).toBeFalsy();
  });
  it('Break: the struck unit is Stunned and its armour broken', () => {
    const f = mk('maul', ['break'], 3); go(f, 'break');
    expect((b(f) as any).conds?.stunned).toBeTruthy(); expect(b(f).armour).toBe(0); expect((a(f) as any).conds?.stunned).toBeFalsy(); expect(a(f).armour).toBe(10);
  });
  it('Run Through: the struck unit is nailed', () => {
    const f = mk('kemizuchi_duelling_blade', ['run_through'], 3); go(f, 'run_through');
    expect(b(f).nailed).toBeTruthy(); expect(a(f).nailed).toBeFalsy();
  });
  it('Charge (Blunt): the struck unit makes the save and falls Prone', () => {
    const f = mk('maul', ['charge']); f.put(f.pc, 'A5'); f.unit(f.pc.id).ap = 9;
    expect(f.walk(f.pc, 'C5')).toBeNull(); f.put(f.pc, 'C5'); f.foes.forEach((x) => saves(f, x, -99));
    f.unit(f.pc.id).tech!.charge.run = { ...f.unit(f.pc.id).tech!.charge.run, n: 3, at: f.tile('C5') };
    go(f, 'charge', { tile: f.tile('C5') });
    expect(b(f).prone).toBe(true); expect(a(f).prone).toBeFalsy();
  });
});

describe('Flurry (Bare): the +1 lands on the save the next Bind or Throw Down forces', () => {
  const mk = () => {
    const f = physFight([{ weapon: 'fists', known: ['flurry', 'bind', 'throw_down'], skills: SK }], [{ at: 'D5', tier: 'soldier' }, { at: 'C4', tier: 'soldier' }]);
    f.put(f.pc, 'C5'); f.foes.forEach((x, i) => { f.put(x, i ? 'C4' : 'D5'); Object.assign(f.unit(x.id), { hp: 999, maxHp: 999 }); });
    f.turn(f.pc); f.unit(f.pc.id).ap = 9; rig({ hit: true, die: 12 });
    expect(f.tech('flurry', { targetId: f.foes[0].id, line: 'bare' })).toBeNull(); rig(null);
    expect((f.unit(f.pc.id) as any).setUp).toMatchObject({ target: f.foes[0].id, hit: 1, only: ['bind', 'throw_down'] });
    return f;
  };
  it('Bind (Bare): the grapple save is 1 harder, and the mark is spent', () => {
    const f = mk(); expect(f.pv('bind', { targetId: f.foes[0].id }).notes.join(' ')).toMatch(/Flurry: the save is 1 harder/);
    saves(f, f.foes[0], 50); expect(f.tech('bind', { targetId: f.foes[0].id })).toBeNull();
    // rules 1.13: a bare-handed grapple is saved against 12 + Raw Power strength (Raw Power 4 = 3), and Flurry's +1
    expect(f.cb.log.slice(-3).join(' ')).toMatch(/vs 16\)/); expect((f.unit(f.pc.id) as any).setUp).toBeUndefined();
  });
  it('Throw Down (Bare): the occupant\'s Prone save is 1 harder', () => {
    const f = mk(); f.bound(() => applyCond(f.cb, f.g.rng, f.unit(f.pc.id), f.unit(f.foes[0].id), 'grappled', undefined, undefined, { skipSave: true } as any));
    const pv = f.pv('throw_down', { targetId: f.foes[0].id, tile: f.tile('C4') }); expect(pv.ok).toBe(true);
    expect(pv.saves?.find((s) => s.unit === f.foes[1].id)?.tn).toBe(13 + 3);
  });
});

describe('Bind', () => {
  it('a Bound unit\'s Sprint that can\'t leave is refused, not paid for; the failed save stands for the turn', () => {
    const f = physFight([{ weapon: 'sabre', known: ['bind'], skills: SK }], [{ at: 'D5', tier: 'elite', weapon: 'service_pistol' } as any]);
    f.put(f.pc, 'C5'); f.put(f.foe, 'D5'); f.turn(f.pc); expect(f.tech('bind', { targetId: f.foe.id })).toBeNull();
    f.turn(f.foe); saves(f, f.foe, -99); const ap = f.unit(f.foe.id).ap;
    expect(f.walk(f.foe, 'G5', 'sprint')).toMatch(/Needs/);
    expect(f.unit(f.foe.id).ap).toBe(ap); expect(f.unit(f.foe.id).sprinted).toBeFalsy(); expect(at(f, f.foe)).toBe(f.tile('D5'));
    saves(f, f.foe, 99); const n = f.cb.log.filter((l) => /against the bind/.test(l)).length;
    expect(f.walk(f.foe, 'G5', 'sprint')).toMatch(/Needs/); // no fresh roll this turn
    expect(f.cb.log.filter((l) => /against the bind/.test(l)).length).toBe(n);
  });
});

describe('Throw', () => {
  it('knuckledusters can be thrown (−2, ×0.7) and land in the pile on the target\'s tile; fists can\'t', () => {
    const f = physFight([{ weapon: 'knuckledusters', known: ['throw'], skills: SK }], [{ at: 'E5', tier: 'soldier' }]);
    f.put(f.pc, 'C5'); f.put(f.foe, 'E5'); f.turn(f.pc);
    const pv = f.pv('throw', { targetId: f.foe.id }); expect(pv.ok).toBe(true);
    expect((pv.attacks[0].pv.terms || []).some((t: any) => t.v === -2)).toBe(true);
    rig({ hit: true, die: 12 }); expect(f.tech('throw', { targetId: f.foe.id })).toBeNull();
    expect((f.unit(f.foe.id).stuck || []).map((x: any) => x.weapon)).toContain('knuckledusters'); // a hit: it stays in the target (0.18.1)
    const g = physFight([{ weapon: 'fists', known: ['throw'], skills: SK }], [{ at: 'E5' }]); g.put(g.pc, 'C5'); g.put(g.foe, 'E5'); g.turn(g.pc);
    expect(g.tech('throw', { targetId: g.foe.id })).toMatch(/hands are bare/);
  });
});

describe('Links', () => {
  const fight = (weapon: string, pcs: any[] = [], foes: any[] = [{ at: 'D7' }]) => {
    const f = physFight([{ weapon, known: ['guard', 'shove', 'drag'], skills: { athletics: 4, raw_power: 4 } }, ...pcs], foes.map((x) => ({ tier: 'soldier', ...x })));
    f.put(f.pc, 'C7'); foes.forEach((x, i) => f.put(f.foes[i], x.at)); f.turn(f.pc); return f;
  };
  it('Shove: a push an item cancels (Siege Engine) gives no Momentum', () => {
    const f = fight('sabre', [{ weapon: 'sabre', perks: { siege_engine: 'achieved' } }], [{ at: 'J9' }]);
    const s = f.pcs[1]; f.unit(s.id).side = 'foe'; f.put(s, 'D7'); Object.assign(f.unit(s.id), { strength: -50 }); f.unit(f.pc.id).strength = 20; quiet(f);
    expect(f.tech('shove', { targetId: s.id })).toBeNull();
    expect(at(f, s)).toBe(f.tile('D7')); expect(f.momentum(f.pc)).toBe(0); expect(f.cb.log.join(' ')).toMatch(/holds its ground/);
  });
  it('Shove: today\'s opposed roll; a strong target holds firm, a weak one is pushed', () => {
    const f = fight('sabre'); f.unit(f.foe.id).strength = 50; quiet(f);
    expect(f.tech('shove', { targetId: f.foe.id })).toBeNull(); expect(at(f, f.foe)).toBe(f.tile('D7')); expect(f.cb.log.join(' ')).toMatch(/shoves .* vs 60 · holds firm/);
    const g = fight('sabre'); g.unit(g.foe.id).strength = -50; g.unit(g.pc.id).strength = 20; quiet(g);
    expect(g.tech('shove', { targetId: g.foe.id })).toBeNull(); expect(at(g, g.foe)).toBe(g.tile('E7')); expect(g.momentum(g.pc)).toBe(1);
  });
  it('Guard: +2 Defense against an ally\'s melee too', () => {
    const f = fight('sabre', [{ weapon: 'sabre' }]); f.put(f.pcs[1], 'C8'); expect(f.tech('guard')).toBeNull();
    const pv = f.bound(() => previewAttack(f.cb, f.unit(f.pcs[1].id), f.unit(f.pc.id), 'melee', { free: true }));
    expect((pv.terms || []).some((t: any) => t.label === 'Guard' && t.v === -2)).toBe(true);
  });
  it('Guard (Reach): a mover put back draws no opportunity attack for a reach it never left', () => {
    const f = physFight([{ weapon: 'glaive', known: ['guard'] }, { weapon: 'sabre' }], [{ at: 'E7', tier: 'soldier' }]);
    f.put(f.pc, 'C7'); f.put(f.pcs[1], 'F7'); f.put(f.foe, 'E7'); f.turn(f.pc);
    expect(f.tech('guard', { line: 'reach' })).toBeNull();
    f.turn(f.foe); saves(f, f.foe, -50); const hp = f.unit(f.foe.id).hp; rig({ hit: true, die: 12 });
    f.walk(f.foe, 'D6');
    expect(at(f, f.foe)).toBe(f.tile('E7')); expect(f.unit(f.foe.id).hp).toBe(hp); expect(f.cb.log.join(' ')).not.toMatch(/opportunity attack/);
  });
  it('Drag: a Prone or Grappled user can\'t swap', () => {
    const f = fight('sabre'); f.unit(f.pc.id).prone = true; saves(f, f.foe, -50);
    expect(f.tech('drag', { targetId: f.foe.id })).toMatch(/Stand up/); expect(at(f, f.pc)).toBe(f.tile('C7'));
    const g = fight('sabre'); g.bound(() => applyCond(g.cb, g.g.rng, g.unit(g.foe.id), g.unit(g.pc.id), 'grappled', undefined, undefined, { skipSave: true } as any));
    expect(g.tech('drag', { targetId: g.foe.id })).toMatch(/Grappled/); expect(at(g, g.pc)).toBe(g.tile('C7'));
  });
  it('Drag: a swap next to a Reach Guard never leaves two units on one tile', () => {
    for (let s = 0; s < 10; s++) {
      const f = physFight([{ weapon: 'sabre', known: ['drag'] }], [{ at: 'D5', tier: 'soldier' } as any, { at: 'E6', tier: 'soldier' } as any], { seed: 's' + s });
      f.put(f.pc, 'C5'); f.put(f.foes[0], 'D5'); f.put(f.foes[1], 'E6'); f.turn(f.pc);
      f.unit(f.pc.id).sv = { body: -50, brain: -50, heart: -50 } as any; f.unit(f.foes[0].id).sv = { body: -50, brain: -50, heart: -50 } as any;
      (f.unit(f.foes[1].id) as any).tech = { guard: { on: true, reach: true, def: 2, t: '0.0' } };
      f.tech('drag', { targetId: f.foes[0].id });
      expect(at(f, f.pc), 'seed ' + s).not.toBe(at(f, f.foes[0]));
    }
  });
});

describe('Finishers', () => {
  it('Run Through (Reach, leave): the weapon left in falls into the pile when the target dies', () => {
    const f = physFight([{ weapon: 'lance', known: ['run_through'], skills: SK }, { weapon: 'sabre', known: ['cut'], skills: SK }], [{ at: 'D5', tier: 'soldier' }], { seed: 'FINISH1' });
    f.put(f.pc, 'C5'); f.put(f.pcs[1], 'D6'); const u = f.put(f.foe, 'D5'); u.hp = u.maxHp = 500; f.turn(f.pc); f.momentum(f.pc, 3);
    rig({ hit: true, die: 12 });
    expect(f.tech('run_through', { targetId: f.foe.id, line: 'reach', opt: 'leave' })).toBeNull();
    expect(f.unit(f.foe.id).nailed).toMatchObject({ weapon: 'lance' });
    f.unit(f.foe.id).hp = 1; f.turn(f.pcs[1]); rig({ hit: true, die: 12 }); expect(f.tech('cut', { targetId: f.foe.id })).toBeNull(); // through the reducer, whose death sweep drops it (dropNailed)
    expect(f.unit(f.foe.id).dead).toBe(true);
    expect(pileAt(f, f.tile('D5'))).toContain('lance'); expect(f.unit(f.foe.id).nailed).toBeFalsy();
  });
  it('Break (Blunt) then an ally\'s Sunder: the armour mends to the sundered value', () => {
    const f = physFight([{ weapon: 'maul', known: ['break'], skills: SK }, { weapon: 'war_axe', known: ['sunder'], skills: SK }], [{ at: 'D5', tier: 'soldier' }], { seed: 'FINISH1' });
    f.put(f.pc, 'C5'); f.put(f.pcs[1], 'D6'); const u = f.put(f.foe, 'D5'); u.hp = u.maxHp = 500; u.armour = 12; saves(f, f.foe, -50);
    f.turn(f.pc); f.momentum(f.pc, 3); rig({ hit: true, die: 12 });
    expect(f.tech('break', { targetId: f.foe.id })).toBeNull(); expect(f.unit(f.foe.id).armour).toBe(0);
    f.turn(f.pcs[1]); expect(f.pv('sunder', { targetId: f.foe.id }, f.pcs[1]).notes.join(' ')).toMatch(/12 → 2/);
    expect(f.tech('sunder', { targetId: f.foe.id })).toBeNull(); expect(f.unit(f.foe.id).armour).toBe(0);
    f.cb.round++; f.turn(f.pc); expect(f.unit(f.foe.id).armour).toBe(2);
  });
});

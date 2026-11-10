// Physical 2.0 (rules 1.12): the lead's fixes after the melee lane merged (the requests in
// docs/design/handoffs/physical-2.0-A-RESULT.md and physical-2.0-A-FX.md), and Leon's rulings of 10 Nov 2026 on Run
// Through's weapon (who may pull it out). Drag's Hook ruling is tested in phys-melee-links, Parry's shield in
// phys-melee-answers.
import { describe, it, expect, beforeEach } from 'vitest';
import { phys, TECHNIQUE, previewAttack, pullFree, effectiveArmour, setEffectiveArmour, surrender, noteDeaths, objectsOf, encoreKey, packOf, type Unit } from '../src';
import { onHook } from '../src/effects/hooks';
import { physFight, rig } from './helpers/physfight';

beforeEach(() => { rig(null); HOLD = false; });
const SK = { athletics: 6, raw_power: 4, dexterity: 6 };
type F = ReturnType<typeof physFight>;
/** One PC with a weapon on C5 on its turn, foes where given (default D5), with plenty of HP. */
function fight(weapon: string, known: string[] = [], foes: { at: string; weapon?: string; tier?: string }[] = [{ at: 'D7' }], extra: any[] = []) {
  const f = physFight([{ weapon, known, skills: SK }, ...extra], foes.map((x) => ({ tier: 'soldier', ...x })), { seed: 'LEADFIX' });
  f.put(f.pc, 'C7'); foes.forEach((x, i) => { const u = f.put(f.foes[i], x.at); u.hp = u.maxHp = 900; }); f.turn(f.pc);
  return f;
}
const saves = (f: F, u: Unit, n: number) => { f.unit(u.id).sv = { body: n, brain: n, heart: n } as any; };
const pileHas = (f: F, at: string, wid: string) => objectsOf(f.cb).some((o: any) => o.pos === f.tile(at) && (o.items || []).some((i: any) => i.item === wid));
let HOLD = false;
onHook('forced_move', (ctx: any) => { if (HOLD) ctx.cancel = true; });

describe('Encore and techniques', () => {
  const lend = (f: F, key: string, ap: number) => { const u = f.unit(f.pc.id); u.faith = { ...(u.faith || {}), encore: { key, ap, started: true, round: f.cb.round } } as any; u.ap = 0; };
  it('Shot, Aimed Shot and Cut are the plain attacks they stand for; any other technique is itself', () => {
    expect(encoreKey({ type: 'combat/technique', id: 'shot' })).toBe(encoreKey({ type: 'combat/attack', mode: 'shot' }));
    expect(encoreKey({ type: 'combat/technique', id: 'aimed_shot' })).toBe(encoreKey({ type: 'combat/attack', mode: 'aimed' }));
    expect(encoreKey({ type: 'combat/technique', id: 'cut' })).toBe(encoreKey({ type: 'combat/attack', mode: 'melee' }));
    expect(encoreKey({ type: 'combat/technique', id: 'bash', targetId: 'x' })).toBe('combat/technique:bash');
  });
  it('a plain shot, then Encore: the Shot technique repeats it free, even with no AP', () => {
    const f = fight('service_pistol', [], [{ at: 'H7', tier: 'elite' }]); rig({ hit: true, die: 12 });
    f.act({ type: 'combat/attack', unitId: f.pc.id, targetId: f.foe.id, mode: 'shot' } as any);
    expect((f.pc.faith as any).lastKey).toBe('combat/attack:shot');
    expect(f.tech('shot', { targetId: f.foe.id })).toBeNull(); expect((f.pc.faith as any).lastKey).toBe('combat/attack:shot'); // the technique is remembered as the same action
    lend(f, 'combat/attack:shot', 2);
    expect(f.pv('aimed_shot', { targetId: f.foe.id }).ok).toBe(false); // nothing else is lent
    expect(f.pv('shot', { targetId: f.foe.id }).ok).toBe(true);
    expect(f.pad().flatMap((g) => g.entries).find((e) => e.id === 'shot')?.ok).toBe(true);
    const ammo = f.pc.ammo;
    expect(f.tech('shot', { targetId: f.foe.id })).toBeNull();
    expect(f.pc.ap).toBe(0); expect(f.pc.ammo).toBe(ammo - 1); expect(f.pc.faith?.encore).toBeUndefined();
    expect(f.cb.log.some((l) => /Encore: .* repeats Attack \(shot\), free/.test(l))).toBe(true);
    expect(f.tech('shot', { targetId: f.foe.id })).toMatch(/Needs 2 AP/); // once
  });
  it('a repeated technique (the same id) is lent its AP; a different one is not', () => {
    const f = fight('sabre', ['bash', 'sunder']); rig({ hit: true, die: 12 }); f.momentum(f.pc, 3); // each Strike spends 1 Momentum
    expect(f.tech('bash', { targetId: f.foe.id })).toBeNull(); expect((f.pc.faith as any).lastKey).toBe('combat/technique:bash');
    lend(f, 'combat/technique:bash', 2);
    expect(f.tech('sunder', { targetId: f.foe.id })).toMatch(/Needs 2 AP/); expect(f.pc.faith?.encore).toBeTruthy();
    expect(f.pv('bash', { targetId: f.foe.id }).ok).toBe(true);
    expect(f.tech('bash', { targetId: f.foe.id })).toBeNull(); expect(f.pc.ap).toBe(0); expect(f.pc.faith?.encore).toBeUndefined();
    expect(f.cb.log.some((l) => /Encore: .* repeats Technique \(bash\), free/.test(l))).toBe(true);
  });
});

describe('(a) the later strikes of Sweep, Cleave and Flurry carry the chain flag', () => {
  const chains = (f: F) => f.fx('melee').filter((e: any) => e.unit === f.pc.id).map((e: any) => !!e.chain);
  it('Sweep and Flurry', () => {
    const f = fight('sabre', ['sweep'], [{ at: 'D7' }, { at: 'D6' }, { at: 'D8' }]); rig({ hit: true, die: 12 }); f.momentum(f.pc, 1); // a Strike spends 1 Momentum
    expect(f.tech('sweep', { targetId: f.foes[0].id })).toBeNull(); expect(chains(f)).toEqual([false, true, true]);
    const g = fight('sabre', ['flurry']); rig({ hit: true, die: 12 }); g.momentum(g.pc, 1);
    expect(g.tech('flurry', { targetId: g.foe.id })).toBeNull(); expect(chains(g)).toEqual([false, true, true]); // Light: three strikes
    const h = fight('sabre'); rig({ hit: true, die: 12 }); h.tech('cut', { targetId: h.foe.id }); h.tech('cut', { targetId: h.foe.id });
    expect(chains(h)).toEqual([false, false]); // two Cuts are two attacks
  });
  it('Cleave: the extra targets', () => {
    const f = fight('ork_machete', ['cleave'], [{ at: 'D7' }, { at: 'D8' }]); f.momentum(f.pc, 2); rig({ hit: true, die: 12 });
    expect(f.tech('cleave', { targetId: f.foe.id })).toBeNull(); expect(chains(f)).toEqual([false, true]);
  });
});

describe('2. the melee numbers are in the data', () => {
  it('the fallbacks the handlers used are written under each technique', () => {
    const want: Record<string, Record<string, number>> = {
      charge: { min_run: 3, per_tile_pct: 10, max_pct: 50, point_armour: 5 }, feint: { hit: 3, light_save: 2 }, ambush: { momentum_cost: 0, point_crit_min: 18, bare_rounds: 1 },
      sweep: { mult: 0.7, reach_out: 2 }, bash: { mult: 0.5, heavy_push: 2 }, sunder: { mult: 0.7, lower: 5, blunt_hook_lower: 10 },
      flurry: { mult: 0.6, strikes: 2, light_strikes: 3, later_hit: -1, bare_bonus: 1, thrown_targets: 2 }, hamstring: { damage_mult: 0.7, slow_rounds: 2 },
      bind: { range: 1, penalty: 2, heavy_penalty: 4 }, half_sword: { damage_mult: 0.8, armour_ignore: 10 }, throw: { unthrown_hit: 2, unthrown_mult: 0.7 },
      sidestep: { tiles: 1, light_tiles: 2 }, guard: { defense: 2 }, shove: { range: 1, reach_range: 2, tiles: 1, heavy_tiles: 2 }, trip: { save_penalty: 2 },
      drag: { tiles: 1, hook_tiles: 2, hook_reach: 1 }, cleave: { adjacent: 1, heavy_apart: 2 }, break: { save_per_momentum: 1, stun_rounds: 1, armour_rounds: 1 },
      run_through: { per_momentum_pct: 20, point_behind_pct: 50, reach_no_point_hit: 2, pull_free_ap: 2 }, throw_down: { per_momentum_pct: 25, tiles: 1, heavy_tiles: 2, occupant_pct: 50 },
      parry: { ally_reach: 1, shield_bonus: 2, halve: 0.5, light_momentum: 1 }, keep_back: { reach_base: 1, reach_tiles: 2 },
    };
    for (const [id, nums] of Object.entries(want)) expect(TECHNIQUE[id].numbers, id).toMatchObject(nums);
  });
});

describe('3. Disarmed or a lowered weapon: a melee attack is made with the fists', () => {
  const base = (f: F, mode: 'melee' | 'shot' = 'melee') => f.bound(() => previewAttack(f.cb, f.pc, f.foe, mode, { free: true }));
  for (const c of ['disarmed', 'lowered']) it(c + ' takes the melee weapon out of the attack', () => {
    const f = fight('maul'); const armed = base(f).dmg!.base, bare = (() => { const b = fight('fists'); return base(b).dmg!.base; })();
    expect(armed).toBeGreaterThan(bare);
    f.unit(f.pc.id).conds = { [c]: 2 } as any;
    expect(base(f).ok).toBe(true); expect(base(f).dmg!.base).toBe(bare);
    rig({ hit: true, die: 12 });
    f.act({ type: 'combat/attack', unitId: f.pc.id, targetId: f.foe.id, mode: 'melee' } as any);
    const ev = f.fx('melee').pop(); expect(ev.weapon).toBe('fists'); expect(f.pc.ap).toBe(4); // a fist's 2 AP, not the maul's 3
    expect(!!f.foe.prone).toBe(false); // and the maul's knockdown isn't there to give
    expect(f.tech('cut', { targetId: f.foe.id })).toBeNull(); expect(f.fx('melee').pop().weapon).toBe('fists'); // a technique's strike too
  });
  it('the weapon\'s reach goes with it; a ranged weapon is refused as before', () => {
    const f = fight('lance', [], [{ at: 'E7' }]); expect(base(f).ok).toBe(true);
    f.unit(f.pc.id).conds = { disarmed: 2 } as any; expect(base(f).why).toMatch(/Out of melee reach/);
    const g = fight('service_pistol', [], [{ at: 'D7' }]); g.unit(g.pc.id).conds = { disarmed: 2 } as any;
    expect(base(g, 'shot').why).toMatch(/Disarmed/); expect(base(g, 'melee').ok).toBe(true); // fists, as it always was
  });
});

describe('9. a set-up mark for other techniques is not spent by this one', () => {
  it('a Cut between Flurry (Bare) and Throw Down keeps the mark; a mark with no list is spent', () => {
    const f = fight('sabre'); rig({ hit: true, die: 12 });
    (f.unit(f.pc.id) as any).setUp = { t: phys.turnStamp(f.cb), target: f.foe.id, hit: 1, label: 'Flurry', only: ['bind', 'throw_down'] };
    expect(f.tech('cut', { targetId: f.foe.id })).toBeNull(); expect((f.pc as any).setUp).toMatchObject({ only: ['bind', 'throw_down'] });
    (f.unit(f.pc.id) as any).setUp = { t: phys.turnStamp(f.cb), target: f.foe.id, hit: 1 };
    expect(f.tech('cut', { targetId: f.foe.id })).toBeNull(); expect((f.pc as any).setUp).toBeUndefined();
  });
});

describe('10 and 15. a push through stop()', () => {
  it('the card shows where a push leaves the target, once', () => {
    const f = fight('maul', ['bash', 'shove']); f.unit(f.pc.id).strength = 20;
    const moves = (id: string, args: any) => (f.pv(id, { targetId: f.foe.id, ...args }).moves || []).filter((m) => m.unit === f.foe.id);
    expect(moves('bash', { line: 'heavy', opt: 'push' })).toEqual([{ unit: f.foe.id, to: f.tile('G7') }]);
    expect(moves('shove', {})).toHaveLength(1);
  });
  it('a push that moves nobody is not logged as one, and stop() says it didn\'t take', () => {
    const f = fight('maul', ['lunge']); rig({ hit: true, die: 12 }); HOLD = true;
    expect(f.tech('lunge', { targetId: f.foe.id, line: 'heavy' })).toBeNull();
    expect(f.foe.pos).toBe(f.tile('D7')); expect(f.cb.log.some((l) => /is pushed/.test(l))).toBe(false); expect(f.fx('stopped')).toHaveLength(0);
    HOLD = false; const g = fight('maul', ['lunge']); rig({ hit: true, die: 12 });
    expect(g.tech('lunge', { targetId: g.foe.id, line: 'heavy' })).toBeNull();
    expect(g.foe.pos).toBe(g.tile('F7')); expect(g.cb.log.some((l) => /is pushed \(Lunge\)/.test(l))).toBe(true); expect(g.fx('stopped')).toHaveLength(1);
  });
});

describe('11. a weapon\'s old on-hit grant fires on a plain attack only', () => {
  it('the war axe: Sunder doesn\'t stack with its armour break; Cut and the old attack still break', () => {
    const f = fight('war_axe', ['sunder']); f.unit(f.foe.id).armour = 20; rig({ hit: true, die: 12 });
    expect(f.tech('sunder', { targetId: f.foe.id })).toBeNull(); expect(f.foe.armour).toBe(10); // Sunder's own 10 (Hook), not 15
    const g = fight('war_axe'); g.unit(g.foe.id).armour = 20; rig({ hit: true, die: 12 });
    expect(g.tech('cut', { targetId: g.foe.id })).toBeNull(); expect(g.foe.armour).toBe(15);
    const h = fight('war_axe'); h.unit(h.foe.id).armour = 20; rig({ hit: true, die: 12 });
    h.act({ type: 'combat/attack', unitId: h.pc.id, targetId: h.foe.id, mode: 'melee' } as any); expect(h.foe.armour).toBe(15);
  });
  it('the maul: Charge\'s save decides Prone; a Cut still knocks down', () => {
    const f = fight('maul', ['charge'], [{ at: 'G7' }]); f.put(f.pc, 'B7'); f.turn(f.pc); saves(f, f.foe, 60); rig({ hit: true, die: 12 });
    expect(f.tech('charge', { targetId: f.foe.id })).toBeNull();
    expect(f.cb.log.some((l) => /saves against Charge/.test(l))).toBe(true); expect(!!f.foe.prone).toBe(false);
    const g = fight('maul'); rig({ hit: true, die: 12 }); expect(g.tech('cut', { targetId: g.foe.id })).toBeNull(); expect(g.foe.prone).toBe(true);
  });
  it('the servo fist: no push on a Bash; a push on a Cut', () => {
    const f = fight('hellraiser_servo_fist', ['bash']); saves(f, f.foe, 60); rig({ hit: true, die: 12 });
    expect(f.tech('bash', { targetId: f.foe.id })).toBeNull(); expect(f.foe.pos).toBe(f.tile('D7'));
    const g = fight('hellraiser_servo_fist'); rig({ hit: true, die: 12 }); expect(g.tech('cut', { targetId: g.foe.id })).toBeNull(); expect(g.foe.pos).toBe(g.tile('F7'));
  });
});

describe('12. the test helper\'s off hand', () => {
  it('is on the character as well as the unit', () => {
    const f = physFight([{ weapon: 'sabre', off: 'combat_knife' }]);
    expect(f.pc.offWeapon).toBe('combat_knife'); expect(f.char(f.pc).offHand?.id).toBe('combat_knife');
  });
});

describe('14. a technique\'s ambush is the engine\'s ambush', () => {
  const dmgOf = (pv: any) => pv.attacks[0].pv.dmg.total as number;
  it('Ambush with the Hidden entry\'s ambush already spent: still an ambush, and the entry is not used again', () => {
    const f = fight('sabre', ['ambush']); const u = f.unit(f.pc.id); u.hidden = true; u.hideEntry = 2; u.ambushUsed = 2;
    f.unit(f.foe.id).ambushTaken = 0.5; rig({ hit: true, die: 12 });
    const pv = f.pv('ambush', { targetId: f.foe.id }), cut = f.pv('cut', { targetId: f.foe.id });
    expect(dmgOf(pv)).toBeCloseTo(dmgOf(cut) * (f.pc.ambushMult || 1.5), 5);
    expect(pv.attacks[0].pv.dmg!.mults.some((m) => m.label === 'ambush')).toBe(true);
    const hp = f.foe.hp, full = Math.max(1, Math.floor(dmgOf(pv)) - pv.attacks[0].pv.dmg!.armour);
    expect(f.tech('ambush', { targetId: f.foe.id })).toBeNull();
    expect(f.cb.log.some((l) => /AMBUSH/.test(l))).toBe(true); expect(f.pc.ambushUsed).toBe(2);
    expect(hp - f.foe.hp).toBe(Math.floor(full * 0.5)); // the target's Ambush damage taken reads it
  });
  it('a roll of 19 is a critical on a technique\'s ambush; from a fresh Hidden entry the entry\'s ambush is used', () => {
    const f = fight('sabre', ['ambush']); const u = f.unit(f.pc.id); u.hidden = true; u.hideEntry = 1; u.ambushUsed = 1; rig({ die: 19 });
    expect(f.tech('ambush', { targetId: f.foe.id })).toBeNull(); expect(f.fx('melee').pop().crit).toBe(true);
    const g = fight('sabre', ['ambush']); const v = g.unit(g.pc.id); v.hidden = true; v.hideEntry = 1; v.ambushUsed = 0; rig({ hit: true, die: 12 });
    expect(g.tech('ambush', { targetId: g.foe.id })).toBeNull(); expect(g.pc.ambushUsed).toBe(1);
  });
  it('Draw Cut (Light) on a target that hasn\'t acted', () => {
    const f = physFight([{ weapon: 'fists', known: ['draw_cut'], skills: SK }], [{ at: 'D7', tier: 'elite' }]);
    const c = f.char(f.pc); c.pack = [...packOf(c).filter((x) => !x.weapon), { id: 'sabre', name: 'sabre', qty: 1, kind: 'weapon' as const, weapon: 'sabre' }];
    f.cb.objects = []; f.put(f.pc, 'C7'); f.put(f.foe, 'D7'); f.cb.round = 1; f.cb.order = [f.pc.id, ...f.cb.order.filter((id) => id !== f.pc.id)]; f.turn(f.pc);
    const item = packOf(f.char(f.pc)).findIndex((x) => x.weapon === 'sabre'), args = { targetId: f.foe.id, item, line: 'light' };
    expect(f.pv('draw_cut', args).attacks[0].pv.dmg!.mults.some((m) => m.label === 'ambush')).toBe(true);
    f.unit(f.foe.id).hp = f.unit(f.foe.id).maxHp = 900; rig({ die: 19 });
    expect(f.tech('draw_cut', args)).toBeNull();
    expect(f.cb.log.some((l) => /CRITICAL.*AMBUSH/.test(l))).toBe(true); expect(f.pc.ambushUsed || 0).toBe(0); // not from Hidden: no entry is used
  });
});

describe('17. a weapon left in a nailed unit', () => {
  const nail = (f: F, u: Unit, by: Unit, weapon?: string) => { f.unit(u.id).nailed = { by: by.id, id: 'run_through', ap: 2, ...(weapon ? { weapon } : {}) }; };
  it('falls to the pile when the unit surrenders', () => {
    const f = fight('sabre'); nail(f, f.foe, f.pc, 'lance');
    f.bound(() => { surrender(f.cb, f.unit(f.foe.id), f.pc, 'test'); noteDeaths(f.cb, f.g.rng); });
    expect(f.foe.nailed).toBeUndefined(); expect(pileHas(f, 'D7', 'lance')).toBe(true);
  });
  it('the one who left it pulls it out and has it back in a free hand, as the weapon it was', () => {
    const f = fight('lance', ['run_through']); f.momentum(f.pc, 2); rig({ hit: true, die: 12 });
    const c = f.char(f.pc); c.weaponState = { ...(c.weaponState || {}), rarity: 'masterwork', name: 'Old Faithful' } as any;
    expect(f.tech('run_through', { targetId: f.foe.id, line: 'reach', opt: 'leave' })).toBeNull(); expect(f.pc.weapon).toBe('fists');
    f.cb.round++; f.turn(f.pc); const ap = f.pc.ap;
    f.act({ type: 'combat/pull-free', unitId: f.pc.id, targetId: f.foe.id } as any);
    expect(f.pc.ap).toBe(ap - 2); expect(f.foe.nailed).toBeUndefined();
    expect(f.pc.weapon).toBe('lance'); expect(f.char(f.pc).weapon).toBe('lance'); expect(f.char(f.pc).weaponState).toMatchObject({ rarity: 'masterwork', name: 'Old Faithful' });
    expect(pileHas(f, 'D7', 'lance')).toBe(false); expect(packOf(f.char(f.pc)).some((x) => x.weapon === 'lance')).toBe(false);
    expect(f.cb.log.some((l) => /pulls the lance out of .* and keeps it in hand/.test(l))).toBe(true);
  });
  it('anyone else not on its side takes it into a free hand, or it goes to the pile; the main hand full, the off hand takes it', () => {
    const f = fight('sabre', [], [{ at: 'D7' }], [{ weapon: 'fists' }, { weapon: 'sabre', off: 'combat_knife' }]);
    const [a, b, d] = f.pcs; f.put(b, 'D6'); f.put(d, 'D8'); nail(f, f.foe, a, 'combat_knife');
    f.turn(d); f.act({ type: 'combat/pull-free', unitId: d.id, targetId: f.foe.id } as any, f.char(d).owner); // both hands full
    expect(f.foe.nailed).toBeUndefined(); expect(pileHas(f, 'D7', 'combat_knife')).toBe(true); expect(f.unit(d.id).weapon).toBe('sabre');
    nail(f, f.foe, a, 'combat_knife'); f.turn(b); f.act({ type: 'combat/pull-free', unitId: b.id, targetId: f.foe.id } as any, f.char(b).owner); // an ally of the wielder, bare-handed
    expect(f.unit(b.id).weapon).toBe('combat_knife'); expect(f.char(b).weapon).toBe('combat_knife');
    nail(f, f.foe, b, 'combat_knife'); f.turn(a); f.act({ type: 'combat/pull-free', unitId: a.id, targetId: f.foe.id } as any); // a sabre in the main hand: the off hand
    expect(f.unit(a.id).weapon).toBe('sabre'); expect(f.unit(a.id).offWeapon).toBe('combat_knife'); expect(f.char(a).offHand?.id).toBe('combat_knife');
  });
  it('it must be next to the target; an ally of the target frees it as before (the weapon drops); a nail with no weapon is the target\'s side\'s only', () => {
    const f = fight('sabre', [], [{ at: 'F7' }, { at: 'F6' }]); nail(f, f.foes[0], f.pc, 'lance');
    expect(f.bound(() => pullFree(f.cb, f.unit(f.pc.id), f.unit(f.foes[0].id)))).toMatch(/Stand next to/); expect(f.pc.ap).toBe(6);
    f.turn(f.foes[1]); expect(f.bound(() => pullFree(f.cb, f.unit(f.foes[1].id), f.unit(f.foes[0].id)))).toBeNull();
    expect(f.foes[0].nailed).toBeUndefined(); expect(pileHas(f, 'F7', 'lance')).toBe(true); expect(f.foes[1].weapon).not.toBe('lance');
    const g = fight('fists'); nail(g, g.foe, g.pc);
    expect(g.bound(() => pullFree(g.cb, g.unit(g.pc.id), g.unit(g.foe.id)))).toMatch(/Stand next to an ally/); expect(g.foe.nailed).toBeTruthy(); expect(g.pc.ap).toBe(6);
  });
  it('a unit with no sheet takes it bare-handed', () => {
    const f = fight('sabre', [], [{ at: 'D7', weapon: 'fists' }]); nail(f, f.pc, f.foe, 'lance'); f.turn(f.foe);
    expect(f.bound(() => pullFree(f.cb, f.unit(f.foe.id), f.unit(f.pc.id)))).toBeNull();
    expect(f.foe.weapon).toBe('lance'); expect(f.pc.nailed).toBeUndefined(); expect(pileHas(f, 'C7', 'lance')).toBe(false);
  });
});

describe('18. the armour a unit wears under a Break', () => {
  it('effectiveArmour reads through the Break; a change goes to what the Break gives back', () => {
    const f = fight('sabre'); const v = f.unit(f.foe.id); v.armour = 12;
    expect(effectiveArmour(v)).toBe(12);
    v.tech = { break: { cut: 12, by: f.pc.id, until: f.cb.round + 1 } }; v.armour = 0;
    expect(effectiveArmour(v)).toBe(12);
    setEffectiveArmour(v, 9); expect(v.armour).toBe(0); expect(v.tech.break.cut).toBe(9);
    delete v.tech; setEffectiveArmour(v, 4); expect(v.armour).toBe(4);
  });
  it('the war axe\'s armour break during a Break cuts the armour that comes back', () => {
    const f = fight('war_axe'); const v = f.unit(f.foe.id);
    v.tech = { break: { cut: 12, by: f.pc.id, until: f.cb.round + 1 } }; v.armour = 0; rig({ hit: true, die: 12 });
    expect(f.tech('cut', { targetId: f.foe.id })).toBeNull();
    expect(f.foe.armour).toBe(0); expect(f.foe.tech!.break.cut).toBe(7); expect(f.foe.baseArmour).toBe(12);
    expect(f.cb.log.some((l) => /armour broken \(7\)/.test(l))).toBe(true);
  });
});

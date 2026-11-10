// Physical 2.0 (rules 1.12), the foundation: the data, Momentum, Pressure, the reference techniques (Cut, Lunge, Coup,
// Riposte; Shot, Aimed Shot, Suppress, Dead Centre, Overwatch, Deny), drill, and the actions.
import { describe, it, expect, beforeEach } from 'vitest';
import { phys, WEAPON, TECHNIQUES, TECHNIQUE, PHYS_RULES, resolveAttack, validateSheet, enemyIntent, enemyTurn } from '../src';
import { physFight, rig } from './helpers/physfight';
import { sheetOf } from './helpers/perkfight';

const BUILT = ['cut', 'lunge', 'coup', 'riposte', 'shot', 'aimed_shot', 'suppress', 'dead_centre', 'overwatch', 'deny'];
beforeEach(() => rig(null));

describe('the data', () => {
  it('has 58 techniques, 27 melee and 31 ranged, each in a group of its system', () => {
    expect(TECHNIQUES.length).toBe(58);
    expect(TECHNIQUES.filter((t) => t.system === 'melee').length).toBe(27);
    for (const t of TECHNIQUES) expect(PHYS_RULES.groups[t.system], t.id).toContain(t.group);
    expect(TECHNIQUES.filter((t) => t.free).map((t) => t.id).sort()).toEqual(['aimed_shot', 'cut', 'overwatch', 'shot']);
  });
  it('every weapon has its properties, and what it teaches is a technique of its system', () => {
    for (const w of Object.values(WEAPON)) {
      const p = phys.weaponPhys(w.id); expect((w as any).phys, w.id).toBeTruthy();
      if (p.teaches) expect(TECHNIQUE[p.teaches]?.system, w.id).toBe(p.system);
    }
  });
  it('the reference techniques are built; the rest say so', () => {
    for (const id of BUILT) expect(phys.handlerOf(id), id).toBeTruthy();
  });
});

describe('Momentum and the chain', () => {
  const fight = () => { const f = physFight([{ weapon: 'sabre', known: ['lunge', 'coup', 'riposte'], skills: { athletics: 6, raw_power: 4 } }], [{ at: 'D5', tier: 'elite' }]); f.put(f.pc, 'C5'); f.turn(f.pc); return f; };
  it('everyone holding a melee weapon has Momentum to 3', () => {
    const f = fight(); expect(f.pc.resMax?.momentum).toBe(3); expect(f.momentum(f.pc)).toBe(0);
  });
  it('a hit gives 1; a different technique next gives 1 more; the same one does not', () => {
    const f = fight(); rig({ hit: true, die: 12 });
    expect(f.tech('lunge', { targetId: f.foe.id })).toBeNull(); expect(f.momentum(f.pc)).toBe(1); // the first technique: no variety bonus
    expect(f.tech('cut', { targetId: f.foe.id })).toBeNull(); expect(f.momentum(f.pc)).toBe(3);   // +1, and +1 for the change
    f.momentum(f.pc, 0);
    expect(f.tech('cut', { targetId: f.foe.id })).toBeNull(); expect(f.momentum(f.pc)).toBe(1);   // Cut after Cut: +1 only
  });
  it('a miss gives none', () => {
    const f = fight(); rig({ hit: false, die: 5 });
    f.tech('cut', { targetId: f.foe.id }); expect(f.momentum(f.pc)).toBe(0);
  });
  it('an Opener is only the first technique; a Finisher needs 2, spends all and ends the chain', () => {
    const f = fight(); rig({ hit: true, die: 12 });
    expect(f.tech('coup', { targetId: f.foe.id })).toMatch(/Momentum 2/);
    f.tech('cut', { targetId: f.foe.id });
    expect(f.tech('lunge', { targetId: f.foe.id })).toMatch(/Opener/);
    f.momentum(f.pc, 3);
    const pv = f.pv('coup', { targetId: f.foe.id }); expect(pv.ok).toBe(true); expect(pv.momentum).toEqual({ now: 3, after: 0 }); expect(pv.ends).toBe(true);
    const base = f.pv('cut', { targetId: f.foe.id }).attacks[0].pv.dmg!.total;
    expect(pv.attacks[0].pv.dmg!.total).toBeCloseTo(base * 1.75, 0); // +25% a point
    const ap = f.pc.ap;
    expect(f.tech('coup', { targetId: f.foe.id })).toBeNull(); expect(f.momentum(f.pc)).toBe(0); expect(f.pc.ap).toBe(ap - 2);
    expect(f.tech('cut', { targetId: f.foe.id })).toMatch(/chain has ended/);
  });
  it('Lunge steps a tile to reach, and is refused from too far', () => {
    const f = fight(); f.put(f.pc, 'B5'); rig({ hit: true, die: 12 });
    const pv = f.pv('lunge', { targetId: f.foe.id }); expect(pv.ok).toBe(true); expect(pv.moves?.[0].to).toBe(f.tile('C5'));
    expect(f.pc.pos).toBe(f.tile('B5')); // a preview moves nobody
    expect(f.tech('lunge', { targetId: f.foe.id })).toBeNull(); expect(f.pc.pos).toBe(f.tile('C5'));
    const g = fight(); g.put(g.pc, 'A5'); expect(g.tech('lunge', { targetId: g.foe.id })).toMatch(/Too far/);
    expect(g.pc.ap).toBe(6); // nothing spent on a refusal
  });
  it('Riposte answers a melee miss as the reaction, once a round, and not while Suppressed', () => {
    const f = fight(); const swing = () => f.bound(() => resolveAttack(f.cb, f.g.rng, f.foe, f.pc, 'melee', null, { noAp: true }));
    f.turn(f.foe); rig({ hit: false, die: 5 }); const hp = f.foe.hp;
    swing(); expect(f.cb.log.some((l) => /answers with Riposte/.test(l))).toBe(true);
    expect(f.pc.reactUsed?.n).toBe(1);
    const n = f.cb.log.filter((l) => /answers with Riposte/.test(l)).length; swing();
    expect(f.cb.log.filter((l) => /answers with Riposte/.test(l)).length).toBe(n); // the reaction is spent
    expect(f.foe.hp).toBe(hp); // rigged to miss, the riposte missed too
    const g = fight(); g.press(g.pc, 3, g.foe); g.turn(g.foe); rig({ hit: false, die: 5 });
    g.bound(() => resolveAttack(g.cb, g.g.rng, g.foe, g.pc, 'melee', null, { noAp: true }));
    expect(g.cb.log.some((l) => /answers with Riposte/.test(l))).toBe(false);
  });
});

describe('Pressure', () => {
  const fight = (foe: any = {}, pc: any = {}) => { const f = physFight([{ weapon: 'hellraiser_service_rifle', known: ['suppress', 'dead_centre', 'deny'], skills: { dexterity: 6 }, ...pc }], [{ at: 'H5', tier: 'soldier', ...foe }]); f.put(f.pc, 'C5'); f.turn(f.pc); return f; };
  it('the first ranged hit on a target each turn gives 1; a second gives none', () => {
    const f = fight(); rig({ hit: true, die: 12 });
    expect(f.tech('shot', { targetId: f.foe.id })).toBeNull(); expect(f.pressure(f.foe)).toBe(1);
    expect(f.tech('shot', { targetId: f.foe.id })).toBeNull(); expect(f.pressure(f.foe)).toBe(1);
  });
  it('Shot costs 2 AP and a round; Aimed Shot 3 AP and aims', () => {
    const f = fight(); rig({ hit: true, die: 12 }); const a0 = f.pc.ammo;
    f.tech('shot', { targetId: f.foe.id }); expect(f.pc.ap).toBe(4); expect(f.pc.ammo).toBe(a0 - 1);
    const pv = f.pv('aimed_shot', { targetId: f.foe.id }); expect(pv.ap).toBe(3); expect(pv.rounds).toBe(1);
    expect(pv.attacks[0].pv.terms!.some((t) => t.label === 'aimed' && t.v === 2)).toBe(true);
    expect(pv.attacks[0].pv.terms!.some((t) => t.label === 'Aimed Shot' && t.v === 1)).toBe(true); // Precise: +3 in all
  });
  it('Pressed is −1 to hit with ranged attacks only; the states and caps hold', () => {
    const f = fight();
    expect(f.press(f.foe, 2, f.pc)).toBe(2); expect(phys.pressureState(f.foe)).toBe('pressed');
    expect(f.press(f.foe, 9, f.pc)).toBe(4); expect(phys.pressureState(f.foe)).toBe('broken');
    expect(f.press(f.pc, 9, f.foe)).toBe(3); // a player stops at Suppressed
    const pv = f.pv('shot', { targetId: f.foe.id }); expect(pv.attacks[0].pv.terms!.some((t) => t.label === 'Pressed' && t.v === -1)).toBe(true);
    const e = fight({ tier: 'elite' }); expect(e.press(e.foe, 9, e.pc)).toBe(3);
    const b = fight({ tier: 'boss' }); expect(b.press(b.foe, 9, b.pc)).toBe(2);
    const m = physFight([{ weapon: 'sabre' }], [{ at: 'D5' }]); m.put(m.pc, 'C5'); m.turn(m.pc); m.press(m.pc, 2, m.foe);
    expect(m.pv('cut', { targetId: m.foe.id }).attacks[0].pv.terms!.some((t) => t.label === 'Pressed')).toBe(false);
  });
  it('Suppress burns 3 rounds: a hit is half damage and 2 Pressure, a miss 1; +1 Heat', () => {
    const f = fight(); rig({ hit: true, die: 12 }); const a0 = f.pc.ammo, h0 = f.pc.heat;
    const pv = f.pv('suppress', { targetId: f.foe.id }); expect(pv.ok).toBe(true); expect(pv.ap).toBe(3); expect(pv.rounds).toBe(3);
    expect(pv.pressure?.find((x) => x.unit === f.foe.id)?.after).toBe(2);
    const shot = f.pv('shot', { targetId: f.foe.id }).attacks[0].pv.dmg!.total; expect(pv.attacks[0].pv.dmg!.total).toBeCloseTo(shot / 2, 0);
    expect(f.tech('suppress', { targetId: f.foe.id })).toBeNull();
    expect(f.pc.ammo).toBe(a0 - 3); expect(f.pc.heat).toBe(h0 + 2); expect(f.pc.ap).toBe(3); expect(f.pressure(f.foe)).toBe(2);
    const g = fight(); rig({ hit: false, die: 5 }); g.tech('suppress', { targetId: g.foe.id }); expect(g.pressure(g.foe)).toBe(1);
  });
  it('a Take needs a Pressed target, lowers its Pressure by 2, and is one a turn', () => {
    const f = fight({ tier: 'elite' }); rig({ hit: true, die: 12 });
    expect(f.tech('dead_centre', { targetId: f.foe.id })).toMatch(/isn't Pressed/);
    f.press(f.foe, 3, f.pc);
    const pv = f.pv('dead_centre', { targetId: f.foe.id }); expect(pv.ok).toBe(true); expect(pv.pressure?.[0].after).toBe(1);
    expect(f.tech('dead_centre', { targetId: f.foe.id })).toBeNull(); expect(f.pressure(f.foe)).toBe(1);
    f.press(f.foe, 3, f.pc); expect(f.tech('dead_centre', { targetId: f.foe.id })).toMatch(/One Take a turn/);
  });
  it('Pressure falls by 1 at the end of the unit\'s own turn; an enemy Suppressed loses 1 AP, a player none', () => {
    const f = fight(); f.press(f.foe, 3, f.pc); f.press(f.pc, 3, f.foe);
    f.turn(f.foe); expect(f.foe.ap).toBe(5);
    f.pass(); expect(f.pressure(f.foe)).toBe(2);
    f.turn(f.pc); expect(f.pc.ap).toBe(6);
  });
  it('a kill by a ranged attack spills 1 to enemies within 3 tiles who saw it, and gives drill', () => {
    const f = physFight([{ weapon: 'hellraiser_service_rifle', classId: 'marksman' }], [{ at: 'H5', tier: 'minion' }, { at: 'H6', tier: 'soldier' }, { at: 'N9', tier: 'soldier' }]);
    f.put(f.pc, 'C5'); f.put(f.foes[0], 'H5'); f.put(f.foes[1], 'H6'); f.put(f.foes[2], 'N9'); f.turn(f.pc); rig({ hit: true, die: 20 }); f.foes[0].hp = 1;
    expect(f.tech('shot', { targetId: f.foes[0].id })).toBeNull();
    expect(f.foes[0].dead).toBe(true); expect(f.pressure(f.foes[1])).toBe(1); expect(f.pressure(f.foes[2])).toBe(0);
    expect(phys.drillOf(f.char(f.pc), 'hellraiser_service_rifle')).toBe(5 * 3); // a minion, a martial class
  });
  it('a preview changes nothing', () => {
    const f = fight(); f.press(f.foe, 2, f.pc); const before = JSON.stringify(f.g);
    for (const id of BUILT) { f.pv(id, { targetId: f.foe.id, tile: f.tile('G5') }); }
    expect(JSON.stringify(f.g)).toBe(before);
  });
});

describe('Watches', () => {
  const fight = () => { const f = physFight([{ weapon: 'ccec_marksman_rifle', known: ['deny'], skills: { dexterity: 6 } }], [{ at: 'L5', tier: 'elite', weapon: 'sabre' }]); f.put(f.pc, 'C5'); f.turn(f.pc); return f; };
  it('Overwatch is paid on your turn and fires as the reaction at the first enemy to move in sight', () => {
    const f = fight(); expect(f.tech('overwatch')).toBeNull(); expect(f.pc.ap).toBe(4); expect(f.pc.watch?.id).toBe('overwatch');
    rig({ hit: true, die: 12 }); f.turn(f.foe); const hp = f.foe.hp; f.walk(f.foe, 'J5');
    expect(f.foe.hp).toBeLessThan(hp); expect(f.pc.watch).toBeUndefined(); expect(f.pc.reactUsed?.n).toBe(1);
    expect(f.pressure(f.foe)).toBe(1); // a held shot's hit is a ranged hit
  });
  it('a Watch is refused while Pressed, and becoming Pressed drops it', () => {
    const f = fight(); f.press(f.pc, 2, f.foe); expect(f.tech('overwatch')).toMatch(/Pressed/);
    const g = fight(); g.tech('overwatch'); g.press(g.pc, 2, g.foe); expect(g.pc.watch).toBeUndefined();
  });
  it('Deny fires when an enemy enters the named tile, and a hit stops it there (Stopped once after)', () => {
    const f = fight(); expect(f.tech('deny')).toMatch(/Name a tile/);
    expect(f.tech('deny', { tile: 'J5' })).toBeNull(); expect(f.pc.ap).toBe(4);
    rig({ hit: true, die: 12 }); f.turn(f.foe); f.walk(f.foe, 'H5');
    expect(f.foe.pos).toBe(f.tile('J5')); expect(f.foe.stopped).toBe(2);
    f.pass(); expect(f.unit(f.foe.id).stopped).toBe(1);
  });
  it('the held shot ends at the holder\'s next turn', () => {
    const f = fight(); f.tech('overwatch'); f.turn(f.pc); expect(f.pc.watch).toBeUndefined();
  });
});

describe('ready, picks and creation', () => {
  it('a new character knows the defaults for its skills; the pad lists free, ready and lent techniques', () => {
    const f = physFight([{ weapon: 'sabre', skills: { athletics: 3, dexterity: 0 } }], [{ at: 'D5' }]); f.put(f.pc, 'C5'); f.turn(f.pc);
    const ids = f.pad().flatMap((g) => g.entries.map((e) => e.id));
    expect(ids).toContain('cut'); expect(ids).toContain('lunge'); expect(ids).toContain('riposte'); // free, ready, lent by the sabre
    expect(f.pad().flatMap((g) => g.entries).find((e) => e.id === 'riposte')?.lent).toBe(true);
    expect(f.pad().flatMap((g) => g.entries).find((e) => e.id === 'sidestep')?.why).toBe(phys.NOT_BUILT);
  });
  it('phys/ready sets the ready list within the cap; phys/pick takes a pick a drill mark gave', () => {
    const f = physFight([{ weapon: 'ork_machete', skills: { athletics: 2 } }], [{}]); const c = f.char(f.pc);
    phys.ensurePhys(c).known.push('coup', 'sweep', 'bash');
    f.g.combat!.over = 'win';
    expect(() => f.act({ type: 'phys/ready', charId: c.id, system: 'melee', ids: ['lunge', 'coup', 'sweep', 'bash', 'sidestep'] })).toThrow(/can ready 4/);
    f.act({ type: 'phys/ready', charId: c.id, system: 'melee', ids: ['coup', 'sweep'] });
    expect(phys.readyTechniques(f.char(f.pc), 'melee')).toEqual(['coup', 'sweep']);
    expect(() => f.act({ type: 'phys/pick', charId: c.id, weaponId: 'ork_machete', id: 'feint' })).toThrow(/No pick/);
    phys.addDrill(f.char(f.pc), 'ork_machete', 900); // mark I teaches Cleave; mark II is a pick
    expect(phys.physOf(f.char(f.pc)).known).toContain('cleave'); expect(phys.picksOwed(f.char(f.pc), 'ork_machete')).toBe(1);
    f.act({ type: 'phys/pick', charId: c.id, weaponId: 'ork_machete', id: 'feint' });
    expect(phys.physOf(f.char(f.pc)).known).toContain('feint'); expect(phys.picksOwed(f.char(f.pc), 'ork_machete')).toBe(0);
  });
  it('a sheet\'s starting picks are checked: two of a system it has the skill for, one melee Opener', () => {
    const s: any = { ...sheetOf({ archetype: 'sharpshooter' }) }; expect(validateSheet(s)).toBeNull();
    const melee = (s.skills.raw_power || s.skills.athletics) ? 2 : 0, ranged = s.skills.dexterity ? 2 : 0;
    expect(phys.startingTechniqueSlots(s)).toEqual({ melee, ranged });
    expect(phys.startingTechniquesError({ ...s, skills: { athletics: 2 }, techniques: { melee: ['bash', 'sweep'], ranged: [] } })).toMatch(/Opener/);
    expect(phys.startingTechniquesError({ ...s, skills: { athletics: 2 }, techniques: { melee: ['lunge', 'sweep'], ranged: [] } })).toBeNull();
    expect(phys.startingTechniquesError({ ...s, skills: { athletics: 2 }, techniques: { melee: ['lunge', 'cut'], ranged: [] } })).toMatch(/can't be picked/);
  });
});

describe('enemies', () => {
  it('a soldier with a rifle opens with Suppress, says so when read, and falls back to plain shots', () => {
    const f = physFight([{ weapon: 'sabre' }], [{ at: 'H5', tier: 'soldier', weapon: 'hellraiser_service_rifle' }]); f.put(f.pc, 'C5'); f.put(f.foe, 'H5');
    expect(f.foe.techs).toEqual(['lunge', 'suppress']);
    f.turn(f.foe); rig({ hit: true, die: 12 });
    const before = JSON.stringify(f.cb), it0 = f.bound(() => enemyIntent(f.cb, f.foe));
    expect(it0).toMatchObject({ kind: 'attack', targetId: f.pc.id }); expect(it0.text).toBe('use Suppress on ' + f.pc.name);
    expect(JSON.stringify(f.cb)).toBe(before); // planning changes nothing
    f.bound(() => enemyTurn(f.cb, f.g.rng));
    expect(f.cb.log.some((l) => l === f.foe.name + ' uses Suppress on ' + f.pc.name + '.')).toBe(true);
    expect(f.cb.log.filter((l) => / uses Suppress /.test(l)).length).toBe(1); // then a plain shot with the AP left
    expect(f.pressure(f.pc)).toBe(2);
  });
  it('a minion has no list: it shoots as before', () => {
    const f = physFight([{ weapon: 'sabre' }], [{ at: 'H5', tier: 'minion', weapon: 'hellraiser_service_rifle' }]); f.put(f.pc, 'C5'); f.put(f.foe, 'H5'); f.turn(f.foe);
    expect(f.foe.techs).toBeUndefined(); expect(f.bound(() => enemyIntent(f.cb, f.foe)).text).toMatch(/^shoot /);
  });
  it('an elite swordsman lunges in, and finishes with Coup once it has Momentum', () => {
    const f = physFight([{ weapon: 'sabre' }], [{ at: 'E5', tier: 'elite', weapon: 'sabre' }]); f.put(f.pc, 'C5'); f.put(f.foe, 'E5'); f.turn(f.foe); rig({ hit: true, die: 12 });
    f.pc.hp = f.pc.maxHp = 999;
    f.bound(() => enemyTurn(f.cb, f.g.rng));
    const used = f.cb.log.filter((l) => l.startsWith(f.foe.name + ' uses ')).map((l) => l.split(' uses ')[1].split(' on ')[0]);
    expect(used[0]).toBe('Lunge'); expect(used).toContain('Coup'); expect(f.foe.pos).toBe(f.tile('D5'));
  });
});

describe('what each side sees', () => {
  it('a Silent weapon\'s unseen hit hides its pips from the target\'s side, in the meters and in the room\'s view', async () => {
    const { viewFor } = await import('../src');
    const f = physFight([{ weapon: 'parlour_pistol', skills: { dexterity: 6 } }], [{ at: 'H8', tier: 'soldier' }]); f.put(f.pc, 'D8'); f.put(f.foe, 'H8'); f.turn(f.pc);
    f.pc.hidden = true; rig({ hit: true, die: 12 });
    expect(f.tech('shot', { targetId: f.foe.id })).toBeNull();
    expect(f.pressure(f.foe)).toBe(2); expect(f.foe.pressHidden).toBe(2);
    const mine = f.bound(() => phys.physView(f.cb, f.foe, 'pc')), theirs = f.bound(() => phys.physView(f.cb, f.foe, 'foe'));
    expect(mine.pressure.now).toBe(2); expect(theirs.pressure.now).toBe(0); expect(theirs.pressure.by).toEqual([]);
    expect(viewFor(f.g, 'host').combat!.units.find((u) => u.id === f.foe.id)!.pressure).toBe(2); // the shooter's side sees them
    expect(f.pc.hidden).toBe(true); // a Silent weapon never reveals its user
    f.press(f.pc, 2, f.foe); f.unit(f.pc.id).pressHidden = 2; // the other way round: pips on a player that their side can't see
    const v = viewFor(f.g, 'host').combat!.units.find((u) => u.id === f.pc.id)!; expect(v.pressure).toBeUndefined(); expect(v.pressHidden).toBeUndefined();
  });
});

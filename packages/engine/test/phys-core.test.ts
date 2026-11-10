// Physical 2.0 (rules 1.12), the foundation: the data, Momentum, Pressure, the reference techniques (Cut, Lunge, Coup,
// Riposte; Shot, Aimed Shot, Suppress, Dead Centre, Overwatch, Deny), drill, and the actions.
import { describe, it, expect, beforeEach } from 'vitest';
import { phys, WEAPON, TECHNIQUES, TECHNIQUE, PHYS_RULES, resolveAttack, validateSheet, enemyIntent, enemyTurn } from '../src';
import { physFight, rig } from './helpers/physfight';
import { sheetOf } from './helpers/perkfight';

const BUILT = ['cut', 'lunge', 'coup', 'riposte', 'shot', 'aimed_shot', 'suppress', 'dead_centre', 'overwatch', 'deny'];
beforeEach(() => rig(null));

describe('the data', () => {
  it('has 64 techniques, 32 melee (28 learned, 3 a shield gives, 1 a skill gives) and 32 ranged, each in a group of its system', () => {
    expect(TECHNIQUES.length).toBe(64);
    expect(TECHNIQUES.filter((t) => t.system === 'melee').length).toBe(32);
    expect(TECHNIQUES.filter((t) => t.needs.shield || t.innate).map((t) => t.id).sort()).toEqual(['interpose', 'raise_shield', 'shield_bash', 'shield_wall']);
    for (const t of TECHNIQUES) expect(PHYS_RULES.groups[t.system], t.id).toContain(t.group);
    expect(TECHNIQUES.filter((t) => t.free).map((t) => t.id).sort()).toEqual(['aimed_shot', 'cut', 'overwatch', 'pull_out', 'shot']);
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
    const f = fight(); expect(f.pc.resMax?.momentum).toBe(3); expect(f.momentum(f.pc)).toBe(1); // a fight starts with 1 (the Momentum rework)
  });
  it('only the plain attack\'s hit gives 1; another technique\'s hit gives none, and there is no variety bonus', () => {
    const f = fight(); rig({ hit: true, die: 12 });
    expect(f.tech('lunge', { targetId: f.foe.id })).toBeNull(); expect(f.momentum(f.pc)).toBe(1); // the fight's first Opener is free, and its hit gives none
    expect(f.tech('cut', { targetId: f.foe.id })).toBeNull(); expect(f.momentum(f.pc)).toBe(2);   // +1 for the plain attack, nothing for the change
    f.momentum(f.pc, 0);
    expect(f.tech('cut', { targetId: f.foe.id })).toBeNull(); expect(f.momentum(f.pc)).toBe(1);   // Cut after Cut: +1
  });
  it('a miss gives none', () => {
    const f = fight(); rig({ hit: false, die: 5 });
    f.tech('cut', { targetId: f.foe.id }); expect(f.momentum(f.pc)).toBe(1); // the 1 the fight began with
  });
  it('an Opener is only the first technique; a Finisher needs 2, spends all and ends the chain', () => {
    const f = fight(); rig({ hit: true, die: 12 });
    expect(f.tech('coup', { targetId: f.foe.id })).toMatch(/Momentum 2/);
    f.tech('cut', { targetId: f.foe.id });
    expect(f.tech('lunge', { targetId: f.foe.id })).toMatch(/Opener/);
    f.momentum(f.pc, 3); f.foe.hp = f.foe.maxHp = 999;
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

describe('damage follows what the weapon is aimed with', () => {
  it('a gun and a light blade scale with Agility and Dexterity, a heavy blade with Strength and Raw Power, bare hands with Strength and both alphas', async () => {
    const { weaponMult, weaponMultLabel, newCharacter } = await import('../src');
    const c = newCharacter('c1', 'host', sheetOf({ archetype: 'sharpshooter' }));
    c.attrs = { ...c.attrs, strength: 3, agility: 5 }; c.skills = { ...c.skills, raw_power: 2, athletics: 4, dexterity: 6 }; c.perks = []; c.traits = []; c.classId = null;
    expect(weaponMult(c, 'service_pistol')).toBeCloseTo(1 + 0.4 + 0.3); expect(weaponMultLabel('service_pistol')).toBe('Agility and Dexterity');
    expect(weaponMult(c, 'sabre')).toBeCloseTo(1 + 0.4 + 0.3); expect(weaponMultLabel('sabre')).toBe('Agility and Dexterity'); // rules 1.12, item 953: light blades hit with the alpha
    expect(weaponMult(c, 'maul')).toBeCloseTo(1 + 0.2 + 0.1); expect(weaponMultLabel('maul')).toBe('Strength and Raw Power');
    expect(weaponMult(c, 'fists')).toBeCloseTo(1 + 0.2 + 0.1 + 0.3); expect(weaponMultLabel('fists')).toBe('Strength, Raw Power and Dexterity');
  });
});

describe('ready, picks and creation', () => {
  it('a new character knows the defaults for its skills; the pad lists free, ready and lent techniques', () => {
    const f = physFight([{ weapon: 'sabre', skills: { dexterity: 3 } }], [{ at: 'D5' }]); f.put(f.pc, 'C5'); f.turn(f.pc);
    const ids = f.pad().flatMap((g) => g.entries.map((e) => e.id));
    expect(ids).toContain('cut'); expect(ids).toContain('lunge'); expect(ids).toContain('riposte'); // free, ready, lent by the sabre
    expect(f.pad().flatMap((g) => g.entries).find((e) => e.id === 'riposte')?.lent).toBe(true);
    expect(f.pad().flatMap((g) => g.entries).find((e) => e.id === 'sidestep')?.built).toBe(true); // every melee technique has a handler since lane A
  });
  it('phys/ready sets the ready list within the cap; phys/pick takes a pick a drill mark gave', () => {
    const f = physFight([{ weapon: 'ork_machete', skills: { raw_power: 2, dexterity: 0 } }], [{}]); const c = f.char(f.pc);
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
    const melee = (s.skills.raw_power || s.skills.dexterity) ? 2 : 0, ranged = s.skills.dexterity ? 2 : 0; // the alphas (item 953)
    expect(phys.startingTechniqueSlots(s)).toEqual({ melee, ranged });
    expect(phys.startingTechniquesError({ ...s, skills: { raw_power: 2 }, techniques: { melee: ['bash', 'sweep'], ranged: [] } })).toMatch(/Opener/);
    expect(phys.startingTechniquesError({ ...s, skills: { raw_power: 2 }, techniques: { melee: ['lunge', 'sweep'], ranged: [] } })).toBeNull();
    expect(phys.startingTechniquesError({ ...s, skills: { raw_power: 2 }, techniques: { melee: ['lunge', 'cut'], ranged: [] } })).toMatch(/can't be picked/);
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

describe('review fixes', () => {
  it('a mana arm that is a melee weapon strikes as itself in a technique, not as fists', () => {
    const f = physFight([{ weapon: 'evoker_blade' }], [{ at: 'D5', tier: 'elite' }]); f.put(f.pc, 'C5'); f.put(f.foe, 'D5'); f.turn(f.pc);
    const pv = f.pv('cut', { targetId: f.foe.id }); expect(pv.ok).toBe(true); expect(pv.attacks[0].pv.dmg!.base).toBe(WEAPON.evoker_blade.damage);
    const g = physFight([{ weapon: 'bot_thread_banner' }], [{ at: 'E5', tier: 'elite' }]); g.put(g.pc, 'C5'); g.put(g.foe, 'E5'); g.turn(g.pc);
    expect(g.pv('cut', { targetId: g.foe.id }).ok).toBe(true); // Reach: 2 tiles
  });
  it('a kill gives drill for every weapon that damaged the victim', () => {
    const f = physFight([{ weapon: 'sabre', off: 'service_pistol', skills: { dexterity: 4, athletics: 4 } }], [{ at: 'D5', tier: 'soldier' }]); f.put(f.pc, 'C5'); f.put(f.foe, 'D5'); f.turn(f.pc);
    rig({ hit: true, die: 12 }); f.foe.hp = f.foe.maxHp = 500;
    expect(f.tech('cut', { targetId: f.foe.id })).toBeNull(); f.unit(f.foe.id).hp = 1;
    expect(f.tech('shot', { targetId: f.foe.id, hand: 'off' })).toBeNull(); expect(f.foe.dead).toBe(true);
    expect(phys.physOf(f.char(f.pc)).drill).toEqual({ sabre: 10, service_pistol: 10 });
  });
  it('Riposte keeps the reaction when the attacker is out of reach', () => {
    const f = physFight([{ weapon: 'sabre', known: ['riposte'] }], [{ at: 'E5', tier: 'elite', weapon: 'glaive' }]); f.put(f.pc, 'C5'); f.put(f.foe, 'E5'); f.turn(f.foe);
    rig({ hit: false, die: 5 }); f.bound(() => resolveAttack(f.cb, f.g.rng, f.foe, f.pc, 'melee', null, { noAp: true }));
    expect(f.cb.log.some((l) => /answers with Riposte/.test(l))).toBe(false); expect(f.pc.reactUsed).toBeUndefined();
  });
  it('a Press rolls at the to-hit its card shows, and its extra Heat lands after', () => {
    const f = physFight([{ weapon: 'hellraiser_service_rifle', known: ['suppress'], skills: { dexterity: 6 } }], [{ at: 'H5', tier: 'elite' }]); f.put(f.pc, 'C5'); f.put(f.foe, 'H5'); f.turn(f.pc);
    f.pc.heat = 1; rig({ die: 10 });
    const pv = f.pv('suppress', { targetId: f.foe.id }).attacks[0].pv;
    expect(f.tech('suppress', { targetId: f.foe.id })).toBeNull();
    expect(f.cb.log.some((l) => l.includes('d20 10 ' + (pv.toHit >= 0 ? '+' : '−') + Math.abs(pv.toHit) + ' '))).toBe(true); expect(f.pc.heat).toBe(3);
  });
  it('a line\'s AP change is charged: Bash with bare hands costs 1 less', () => {
    expect(phys.techniqueAp(TECHNIQUE.bash, 'fists')).toBe(phys.techniqueAp(TECHNIQUE.cut, 'fists') - 1);
    expect(phys.techniqueAp(TECHNIQUE.bash, 'maul')).toBe(phys.techniqueAp(TECHNIQUE.cut, 'maul'));
  });
  it('Dead Centre is at home with a bow, and its Drawn line applies', () => {
    expect(phys.offHome(TECHNIQUE.dead_centre, 'longbow')).toBe(false); expect(phys.linesFor(TECHNIQUE.dead_centre, 'longbow').main?.props).toEqual(['drawn']);
  });
});

describe('review fixes, the core', () => {
  it('a strike leaves what the hit itself did to armour (the war axe breaks plate)', () => {
    const f = physFight([{ weapon: 'war_axe', skills: { raw_power: 4 } }], [{ at: 'D5', tier: 'elite' }]); f.put(f.pc, 'C5'); f.put(f.foe, 'D5'); f.turn(f.pc);
    f.foe.hp = f.foe.maxHp = 999; const a0 = f.foe.armour; rig({ hit: true, die: 12 });
    expect(f.tech('cut', { targetId: f.foe.id })).toBeNull(); expect(f.foe.armour).toBeLessThan(a0);
  });
  it('a technique\'s step is the engine\'s own move: a Pinned user doesn\'t lunge out of reach, and a strike in reach still works', async () => {
    const { applyCond } = await import('../src');
    const f = physFight([{ weapon: 'sabre', known: ['lunge'] }], [{ at: 'E5', tier: 'elite' }]); f.put(f.pc, 'C5'); f.put(f.foe, 'E5'); f.turn(f.pc);
    f.bound(() => applyCond(f.cb, f.g.rng, null, f.pc, 'pinned', 1, 'body', { skipSave: true }));
    expect(f.tech('lunge', { targetId: f.foe.id })).toMatch(/Pinned/); expect(f.pc.pos).toBe(f.tile('C5')); expect(f.pc.ap).toBe(6);
    f.put(f.foe, 'D5'); rig({ hit: true, die: 12 }); expect(f.tech('lunge', { targetId: f.foe.id })).toBeNull();
  });
  it('riders follow a redirected strike to the unit really shot at', async () => {
    const { onHook } = await import('../src/effects/hooks');
    const f = physFight([{ weapon: 'hellraiser_service_rifle', known: ['suppress'], skills: { dexterity: 6 } }], [{ at: 'H5', tier: 'elite' }, { at: 'H7', tier: 'elite' }]);
    f.put(f.pc, 'C5'); f.put(f.foes[0], 'H5'); f.put(f.foes[1], 'H7'); f.turn(f.pc); rig({ hit: true, die: 12 });
    const other = f.foes[1].id; let on = true; onHook('attack_target', (ctx: any) => { if (on && ctx.att.side === 'pc') ctx.tgt = ctx.cb.units.find((x: any) => x.id === other); }); // the action's own copy of the fight
    try { expect(f.tech('suppress', { targetId: f.foes[0].id })).toBeNull(); } finally { on = false; }
    expect(f.pressure(f.foes[0])).toBe(0); expect(f.pressure(f.foes[1])).toBe(2);
  });
  it('the weapon-skill multiplier still applies to an attack (dmgMult)', async () => {
    const { attackDamage } = await import('../src');
    const f = physFight([{ weapon: 'sabre' }], [{ at: 'D5', tier: 'elite' }]); f.put(f.pc, 'C5'); f.put(f.foe, 'D5'); f.turn(f.pc);
    const full = f.bound(() => attackDamage(f.cb, f.pc, f.foe, 'melee', f.char(f.pc), { preview: true })).total;
    expect(f.bound(() => attackDamage(f.cb, f.pc, f.foe, 'melee', f.char(f.pc), { preview: true, dmgMult: 0.5 })).total).toBeCloseTo(full / 2);
  });
  it('the screen\'s functions find the character when the game is passed (no game bound)', () => {
    const f = physFight([{ weapon: 'sabre', known: ['lunge', 'coup'] }], [{ at: 'D5', tier: 'elite' }]); f.put(f.pc, 'C5'); f.put(f.foe, 'D5'); f.turn(f.pc);
    const ids = phys.techniquePad(f.cb, f.pc, 'main', f.g).flatMap((g) => g.entries.map((e) => e.id));
    expect(ids).toEqual(expect.arrayContaining(['lunge', 'cut', 'coup', 'riposte']));
    expect(phys.previewTechnique(f.cb, f.pc, 'lunge', { targetId: f.foe.id }, f.g).ok).toBe(true);
    expect(phys.physView(f.cb, f.pc, 'pc', f.g).momentum?.max).toBe(3);
  });
});

describe('review fixes, beside what already exists', () => {
  it('the old Overwatch is refused while Pressed, before any AP is paid; a held melee strike is not a held shot', () => {
    const f = physFight([{ weapon: 'hellraiser_service_rifle' }], [{ at: 'L5', tier: 'elite' }]); f.put(f.pc, 'C5'); f.turn(f.pc); f.press(f.pc, 2, f.foe);
    expect(() => f.act({ type: 'combat/overwatch', unitId: f.pc.id, mode: 'shot' })).toThrow(/Pressed/); expect(f.pc.ap).toBe(6);
    const g = physFight([{ weapon: 'sabre' }], [{ at: 'L5', tier: 'elite' }]); g.put(g.pc, 'C5'); g.turn(g.pc);
    g.act({ type: 'combat/overwatch', unitId: g.pc.id, mode: 'melee' }); g.press(g.pc, 2, g.foe); expect(g.pc.overwatch).toBe('melee');
  });
  it('what knocks out a held shot knocks out a held Watch too (a grapple)', async () => {
    const { applyCond } = await import('../src');
    const f = physFight([{ weapon: 'ccec_marksman_rifle' }], [{ at: 'L5', tier: 'elite' }]); f.put(f.pc, 'C5'); f.turn(f.pc);
    expect(f.tech('overwatch')).toBeNull(); expect(f.pc.watch?.id).toBe('overwatch');
    f.bound(() => applyCond(f.cb, f.g.rng, f.foe, f.pc, 'grappled', 1, 'body', { skipSave: true })); expect(f.pc.watch).toBeUndefined();
    expect(f.fx('watch_end').some((e: any) => e.why === 'grappled')).toBe(true);
  });
  it('a technique\'s AP goes through the items that price an attack (Southern Fist: +1 with a weapon)', () => {
    const f = physFight([{ weapon: 'sabre', traits: ['southern_fist'] }], [{ at: 'D5', tier: 'elite' }]); f.put(f.pc, 'C5'); f.put(f.foe, 'D5'); f.turn(f.pc);
    const ap0 = f.pc.ap; rig({ hit: true, die: 12 });
    expect(f.pv('cut', { targetId: f.foe.id }).ap).toBe(3); expect(f.pad().flatMap((g) => g.entries).find((e) => e.id === 'cut')?.ap).toBe(3);
    expect(f.tech('cut', { targetId: f.foe.id })).toBeNull(); expect(f.pc.ap).toBe(ap0 - 3);
  });
  it('a technique\'s free step doesn\'t use up a first-move perk (Glass Runner)', () => {
    const f = physFight([{ weapon: 'sabre', known: ['lunge'], traits: ['glass_runner'] }], [{ at: 'E5', tier: 'elite' }]); f.put(f.pc, 'C5'); f.put(f.foe, 'E5'); f.turn(f.pc);
    rig({ hit: true, die: 12 }); expect(f.tech('lunge', { targetId: f.foe.id })).toBeNull(); expect(f.pc.pos).toBe(f.tile('D5'));
    expect(f.cb.log.some((l) => /Glass Runner/.test(l))).toBe(false);
  });
  it('a Proving Ground rebuild keeps both meters and what was learned shows at once', async () => {
    const { newGame, apply } = await import('../src');
    let g = newGame('PHYSPG', { id: 'host', name: 'Host' }, 'seed-phys');
    g = apply(g, { type: 'sandbox/start' }, 'host');
    const c = Object.values(g.characters).find((x) => x.owner === 'host')!;
    g = apply(g, { type: 'sandbox/give', charId: c.id, item: 'sabre', equip: true }, 'host');
    g = apply(g, { type: 'sandbox/fight' }, 'host');
    const pc = () => g.combat!.units.find((u) => u.charId === c.id)!;
    g = apply(g, { type: 'sandbox/meter', unitId: pc().id, momentum: 2, pressure: 2 }, 'host');
    expect(pc().res?.momentum).toBe(2); expect(pc().pressure).toBe(2);
    g = apply(g, { type: 'sandbox/technique', charId: c.id, id: 'coup' }, 'host'); // any tool rebuilds the fighter from its character
    expect(pc().resMax?.momentum).toBe(3); expect(pc().res?.momentum).toBe(2); expect(pc().pressure).toBe(2);
    expect(phys.techniquePad(g.combat!, pc(), 'main', g).flatMap((x) => x.entries.map((e) => e.id))).toContain('coup');
    g = apply(g, { type: 'sandbox/drill', charId: c.id, weaponId: 'sabre', amount: 300 }, 'host');
    expect(phys.physOf(g.characters[c.id]).known).toContain('riposte'); // the sabre's signature at mark I
  });
});

// Class Roster Revision 3 review fixes (8 Nov 2026): each test reproduces a reviewed bug and failed before its fix.
import { describe, expect, it } from 'vitest';
import { CLASS, ADVANCED, viewFor, paths, makeObject, resourcesFor, perkActionsFor, bindGame, reload, type Combat, type Unit } from '../src';
import { fightWith, withGame, type CharSpec } from './helpers/perkfight';

const cls = (id: string, n: number, extra: CharSpec = {}): CharSpec => ({ ...extra, classId: id, level: 12, attrs: { [CLASS[id].attribute]: n, ...(extra.attrs || {}) } });
const open = (cb: Combat) => { cb.map = { ...cb.map, cover: [], full: [], solid: [], difficult: [] } as any; cb.objects = []; };

describe('Sleight: the image swap needs the image\'s tile free (spec item 575)', () => {
  it('an enemy standing on the image: refused, nothing spent, nobody shares a tile', () => {
    const f = fightWith([cls('trickster', 8, { archetype: 'sigilist', kit: 'sigil' })], [{ at: 'P11' }]);
    open(f.cb);
    let u = f.turn(f.pc); f.unit(u.id).pos = '2,4'; f.unit(f.foe.id).pos = '12,9';
    f.act({ type: 'combat/perk', unitId: u.id, id: 'class:trickster.false_image', actionId: 'false_image', tile: '4,4' } as any);
    expect(f.cb.images?.length).toBe(1);
    f.unit(f.foe.id).pos = '4,4'; // an enemy walked onto the image (nothing blocks it)
    u = f.unit(u.id); u.ap = 6;
    expect(() => f.act({ type: 'combat/perk', unitId: u.id, id: 'class:trickster.sleight', actionId: 'sleight_image' } as any)).toThrow('Someone stands on your image.');
    expect(f.unit(u.id).pos).toBe('2,4'); expect(f.unit(u.id).ap).toBe(6);
    f.unit(f.foe.id).pos = '12,9'; // it steps off: the swap works (the use wasn't spent)
    f.act({ type: 'combat/perk', unitId: u.id, id: 'class:trickster.sleight', actionId: 'sleight_image' } as any);
    expect(f.unit(u.id).pos).toBe('4,4');
  });
});

describe('a fooled enemy never ends its walk on the False Image (spec item 573)', () => {
  it('a melee foe closes on the image and stops next to it', () => {
    const f = fightWith([cls('trickster', 8, { archetype: 'sigilist', kit: 'sigil' })], [{ at: 'P11', weapon: 'maul' }]);
    open(f.cb);
    const u = f.turn(f.pc); f.unit(u.id).pos = '2,4'; const foe = f.unit(f.foe.id); foe.pos = '9,4'; (foe as any).sv = { body: -50, brain: -50, heart: -50 };
    f.cb.order = [u.id, foe.id];
    f.act({ type: 'combat/perk', unitId: u.id, id: 'class:trickster.false_image', actionId: 'false_image', tile: '6,4' } as any);
    expect(f.cb.images?.[0]?.fooled).toContain(foe.id);
    f.act({ type: 'combat/end-turn', unitId: u.id } as any);
    // It walks next to the image (G5 is the image's tile, 6,4), strikes it (it scatters), then moves on.
    const log = f.cb.log.join('\n');
    expect(log).toMatch(/Foe 1 moves to H4 .*\n.*passes through a False Image/);
    expect(log).not.toMatch(/Foe 1 moves to G5/);
  });
});

describe('Speed Loader: the turn\'s first main-hand reload only (spec item 564)', () => {
  const setup = () => {
    const f = fightWith([cls('marksman', 3)], [{ at: 'P11' }]);
    const u = f.turn(f.pc); f.unit(u.id).weapon = 'service_pistol';
    Object.assign(f.unit(u.id), { offWeapon: 'service_pistol', offAmmo: 0, ammo: 0, mags: [15, 15, 15, 15, 15, 15], ap: 6 });
    return { f, id: u.id };
  };
  it('off-hand reloads pay full price and leave the discount for the main hand', () => {
    const { f, id } = setup();
    const spent: number[] = [];
    for (let i = 0; i < 2; i++) { const b = f.unit(id).ap; f.act({ type: 'combat/reload', unitId: id, hand: 'off' } as any); f.unit(id).offAmmo = 0; spent.push(b - f.unit(id).ap); }
    expect(spent).toEqual([2, 2]);
    const b = f.unit(id).ap; f.act({ type: 'combat/reload', unitId: id } as any);
    expect(b - f.unit(id).ap).toBe(1); // the main hand still gets it
  });
  it('reloading both guns at once (its own 3 AP price) leaves the discount for the next main-hand reload', () => {
    const { f, id } = setup();
    const b0 = f.unit(id).ap; f.act({ type: 'combat/reload', unitId: id, hand: 'both' } as any);
    expect(b0 - f.unit(id).ap).toBe(3);
    f.unit(id).ammo = 0;
    const b = f.unit(id).ap; f.act({ type: 'combat/reload', unitId: id } as any);
    expect(b - f.unit(id).ap).toBe(1);
  });
  it('a refused reload (called by the engine, not through the reducer\'s rollback) spends nothing', () => {
    const { f, id } = setup();
    const u = f.unit(id); u.mags = [0, 0];
    withGame(f.g, () => expect(reload(f.cb, u)).toMatch(/No loaded spare/));
    u.mags = [15];
    const b = u.ap; withGame(f.g, () => expect(reload(f.cb, u)).toBeNull());
    expect(b - u.ap).toBe(1);
  });
});

describe('a Revision 2 class migrating mid-fight', () => {
  it('its units take the new class (held) and the new class\'s resources', () => {
    const f = fightWith([{ classId: 'bard', level: 5, attrs: { insight: 3 } }], [{ at: 'P11' }]);
    const g: any = f.g, c = Object.values(g.characters)[0] as any; c.classId = 'medic'; delete c.classRev;
    const u = g.combat.units.find((x: any) => x.charId === c.id); u.held = { ...u.held, cls: 'medic', rank: 3 }; u.res = { bogus: 2 }; u.resMax = { bogus: 3 };
    f.turn(u.id); f.act({ type: 'player/online', id: 'host', online: true } as any);
    const g2: any = f.g, c2 = g2.characters[c.id], u2 = g2.combat.units.find((x: any) => x.charId === c.id);
    expect(c2.classId).toBe('bard');
    expect(u2.held.cls).toBe('bard'); expect(u2.held.rank).toBe(1);
    const want = resourcesFor(c2);
    expect(u2.resMax || null).toEqual(want ? want.resMax : null);
    expect(u2.res?.bogus).toBeUndefined();
    const was = bindGame(g2);
    try { expect(perkActionsFor({ u: u2, c: c2, cb: g2.combat, g: g2 } as any, 'combat').filter((e: any) => e.tab === 'class').map((e: any) => e.id)).toContain('class:medic.triage'); }
    finally { bindGame(was); }
  });
});

describe('Judgement (spec item 340): 1 Devotion, once per fight, in the data too', () => {
  it('classes.json matches the engine', () => {
    const m: any = ADVANCED.lumeri_templar.moves.find((x: any) => x.id === 'judgement');
    expect(m.uses).toBe('per_combat');
    expect(m.effects.find((e: any) => e.op === 'resource')).toMatchObject({ resource: 'devotion', value: -10, unit: 'xp' }); // rules 1.6.1: 1 Devotion is 10 XP (item 706)
    expect(m.text).toMatch(/1 Devotion/); expect(m.text).not.toMatch(/3 Devotion|scene/);
  });
});

describe('a sabotaged barricade: a way through, not a place to stop (spec item 568)', () => {
  it('a walk crosses it but can\'t end on it', () => {
    const f = fightWith([cls('infiltrator', 8)], [{ at: 'P11' }]);
    open(f.cb);
    const u = f.turn(f.pc); f.unit(u.id).pos = '2,4'; f.unit(f.foe.id).pos = '14,9';
    const b: any = makeObject('bx', 'barricade', '3,4'); b.sabotaged = f.cb.round + 2; f.cb.objects!.push(b);
    const P = paths(f.cb, '2,4', u.id);
    expect(P.dist['3,4']).toBeUndefined(); expect(P.dist['4,4']).toBe(2);
    f.unit(u.id).ap = 6;
    expect(() => f.act({ type: 'combat/move', unitId: u.id, to: '3,4' } as any)).toThrow();
    expect(f.unit(u.id).pos).toBe('2,4');
  });
});

describe('Proving Ground team fights: secrets filtered by the viewer\'s side, then flipped', () => {
  const teams = () => {
    const f = fightWith([cls('infiltrator', 8), cls('trickster', 8, { archetype: 'sigilist', kit: 'sigil' })], [{ at: 'P11' }]);
    const [a, b] = f.pcs;
    f.turn(a); f.act({ type: 'combat/perk', unitId: a.id, id: 'class:infiltrator.sabotage', actionId: 'rig' } as any);
    const g: any = JSON.parse(JSON.stringify(f.g));
    g.sandbox = { mode: 'teams', team: { p2: 'B' }, saved: {} };
    const bu = g.combat.units.find((x: Unit) => x.id === b.id); bu.side = 'foe'; // team B's fighter
    // Team B's own secrets: a rigged tile, a Sigil trap and their fx, and a False Image.
    g.combat.objects.push(makeObject('rigB', 'trap', '9,9', { name: 'Rigged tile', damage: 30, owner: b.id, side: 'foe', rig: 'class:infiltrator.sabotage', hidden: false } as any));
    g.combat.zones = [...(g.combat.zones || []), { id: 'trB', kind: 'trap', side: 'foe', tiles: ['8,8'], spotted: [] }, { id: 'trA', kind: 'trap', side: 'pc', tiles: ['7,7'], spotted: ['foe'] }];
    g.combat.fx = [...(g.combat.fx || []), { k: 'rig', at: '9,9', only: 'foe', seq: 999 }];
    g.combat.images = [{ id: 'imgB', owner: b.id, pos: '5,5', side: 'foe', round: 1, fooled: [] }];
    return { g, aId: a.id };
  };
  it('team B sees its own rig, trap and fx (as its side), not team A\'s', () => {
    const { g } = teams(), v: any = viewFor(g, 'p2');
    const rigs = v.combat.objects.filter((o: any) => o.rig);
    expect(rigs.map((o: any) => [o.pos, o.side])).toEqual([['9,9', 'pc']]);
    expect(v.combat.fx.filter((e: any) => e.k === 'rig').map((e: any) => [e.at, e.only])).toEqual([['9,9', 'pc']]);
    const z = v.combat.zones.filter((x: any) => x.kind === 'trap').map((x: any) => [x.id, x.side, x.spotted]);
    expect(z).toEqual([['trB', 'pc', []], ['trA', 'foe', ['pc']]]);
    expect(v.combat.images.map((i: any) => [i.id, i.side])).toEqual([['imgB', 'pc']]);
  });
  it('team A sees its own rig and fx, not team B\'s; nothing flips', () => {
    const { g } = teams(), v: any = viewFor(g, 'host');
    const rigs = v.combat.objects.filter((o: any) => o.rig);
    expect(rigs.length).toBe(1); expect(rigs[0].side).toBe('pc'); expect(rigs[0].pos).not.toBe('9,9');
    expect(v.combat.fx.filter((e: any) => e.k === 'rig').every((e: any) => e.only === 'pc')).toBe(true);
    expect(v.combat.fx.some((e: any) => e.k === 'rig')).toBe(true);
    expect(v.combat.zones.filter((x: any) => x.kind === 'trap').map((x: any) => x.id)).toEqual(['trA']);
    expect(v.combat.images.map((i: any) => i.side)).toEqual(['foe']);
  });
});

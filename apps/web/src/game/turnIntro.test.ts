// Turn banners and the your-turn cut-in read a real fight: who is up, whose they are, and the four commands.
import { describe, expect, it, vi } from 'vitest';
import { ARCHETYPES, type Sheet, newCharacter, startCombat } from '@engine';

vi.stubGlobal('window', { scrollTo: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => true, location: { search: '', hash: '' } });
vi.stubGlobal('location', { search: '', hash: '' });
const store: Record<string, string> = {};
vi.stubGlobal('localStorage', { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = String(v); }, removeItem: (k: string) => { delete store[k]; } });
vi.stubGlobal('CustomEvent', class { type: string; detail: any; constructor(t: string, o: any) { this.type = t; this.detail = o?.detail; } });
const { _test } = await import('./turnIntro');
const C = await import('./commands');

const sheetFrom = (archId: string, name = 'Test'): Sheet => {
  const a = ARCHETYPES.find((x) => x.id === archId)!;
  return { name, portrait: '', origin: 'Thousand-Planet frontier', kit: 'medic', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} };
};
function game() {
  const c = newCharacter('c1', 'p1', sheetFrom(ARCHETYPES[0].id, 'Vale'));
  const cb = startCombat('t', 'yard', [{ c, pos: '1,5' }], [{ name: 'Raider', tier: 'boss', weapon: 'service_pistol', at: 'D5' }], 'easy', { state: 4 }, []);
  const g: any = { code: 'ROOMA', phase: 'combat', combat: cb, characters: { c1: c }, players: [{ id: 'p1', name: 'Leon', initials: 'LE', color: '#7FD4FF', online: true }, { id: 'p2', name: 'Kim', initials: 'KI', color: '#E3BF51', online: true }], campaign: null, story: { zone: '' } };
  return { g, cb, pc: cb.units.find((x) => x.side === 'pc')!, foe: cb.units.find((x) => x.side === 'foe')! };
}

describe('turn banners', () => {
  it('your own unit reads YOUR TURN, someone else\'s carries their name and colour, a foe reads HOSTILE in red', () => {
    const { g, cb, pc, foe } = game();
    const mine = _test.bannerFor(g, cb, pc.id, 'p1', 1)!;
    expect(mine).toMatchObject({ kicker: 'YOUR TURN', mine: true, foe: false, stripe: '#7FD4FF', name: 'Vale' });
    const theirs = _test.bannerFor(g, cb, pc.id, 'p2', 1)!;
    expect(theirs).toMatchObject({ kicker: 'LEON', kickerColor: '#7FD4FF', mine: false });
    const hostile = _test.bannerFor(g, cb, foe.id, 'p1', 2)!;
    expect(hostile).toMatchObject({ kicker: 'HOSTILE', kickerColor: '#F65157', foe: true, sub: 'ROUND 2' });
    // a hostile in sight is named and its turn may move the view; one out of sight is neither (no focus key is sent)
    expect(hostile.unseen).toBe(false);
    // out of sight, the view holds no such unit (the engine's fog, fog.ts): its turn comes as its opaque mark
    const fogged = { ...cb, units: cb.units.filter((x) => x.id !== foe.id), order: cb.order.map((id, i) => (id === foe.id ? '?' + i : id)) };
    const hidden = _test.bannerFor(g, fogged, '?' + cb.order.indexOf(foe.id), 'p1', 2)!;
    expect(hidden).toMatchObject({ unseen: true, name: 'Unseen hostile', img: '' });
  });
  it('the cut-in shows the unit\'s numbers and four commands with combat.js action ids', () => {
    const { g, cb, pc } = game();
    const c = _test.cutFor(g, cb, pc.id)!;
    expect(c.name).toBe('Vale');
    expect(c.hp).toEqual([pc.hp, pc.maxHp]);
    expect(c.cmds).toHaveLength(4);
    expect(c.cmds.map((x) => x.key)).toEqual(['1', '2', '3', '4']);
    expect(['tq:main:shot', 'tq:main:cut', 'clear']).toContain(c.cmds[0].action); // Physical 2.0: the weapon's plain technique
    expect(c.cmds[1].action).toBe('move');
    pc.jammed = true;
    expect(_test.cutFor(g, cb, pc.id)!.cmds[0].action).toBe('clear');
    pc.downed = true;
    expect(_test.cutFor(g, cb, pc.id)).toBeNull();
  });
  it('effects are given a rough length so enemy banners land with their turns', () => {
    expect(_test.estMs({ k: 'reload', dur: 1200 })).toBe(1200);
    expect(_test.estMs({ k: 'move', path: ['1,1', '2,1', '3,1'] })).toBeGreaterThan(_test.estMs({ k: 'move', path: ['1,1', '2,1'] }));
  });
  it('the card side: Auto by default (the left, the right when the left would cover the unit), or always left or right; kept in this browser', () => {
    expect(C.readCardSide()).toBe('auto');
    expect(C.cardOnRight('auto', () => false)).toBe(false); expect(C.cardOnRight('auto', () => true)).toBe(true);
    C.writeCardSide('right'); expect(store['phc.cutinSide']).toBe('right'); expect(C.readCardSide()).toBe('right');
    expect(C.cardOnRight(C.readCardSide(), () => false)).toBe(true);
    C.writeCardSide('left'); expect(C.cardOnRight(C.readCardSide(), () => true)).toBe(false);
    C.writeCardSide('auto'); expect(store['phc.cutinSide']).toBeUndefined(); expect(C.readCardSide()).toBe('auto');
    store['phc.cutinSide'] = 'sideways'; expect(C.readCardSide()).toBe('auto'); delete store['phc.cutinSide'];
  });
  it('the four commands can be customised per character: picks keep their slots, the smart default fills the rest in its order, a pick that can\'t be used now is greyed with why, one not in the kit falls back', () => {
    const { g, cb, pc } = game();
    const smart = _test.cutFor(g, cb, pc.id)!.cmds.map((x) => x.action);
    expect(C.readPrefs(g, 'c1')).toEqual([null, null, null, null]);
    // Hold a shot first, Analyze fourth; slots 2 and 3 take the smart default in its order, skipping the picks.
    C.writePrefs(g, 'c1', ['twatch', null, null, 'analyze']);
    expect(JSON.parse(store['phc.cutinCmds'])).toEqual({ 'ROOMA:c1': ['twatch', null, null, 'analyze'] });
    // Another room's c1 is another character: it keeps the smart default.
    expect(C.readPrefs({ code: 'ROOMB' }, 'c1')).toEqual([null, null, null, null]);
    let cmds = _test.cutFor(g, cb, pc.id)!.cmds;
    expect(cmds.map((x) => x.key)).toEqual(['1', '2', '3', '4']);
    expect(cmds[0]).toMatchObject({ action: 'twatch', custom: true });
    expect(cmds[3]).toMatchObject({ action: 'analyze', custom: true });
    const rest = smart.filter((a) => a !== 'twatch' && a !== 'analyze');
    expect([cmds[1].action, cmds[2].action]).toEqual(rest.slice(0, 2));
    expect(new Set(cmds.map((x) => x.action)).size).toBe(4);
    // Reload in slot 1: the smart default's Shoot is not lost; it moves along (Reload · Shoot · Move · Hold a shot).
    expect(smart).toEqual(['tq:main:shot', 'move', 'reload', 'twatch']);
    C.writePrefs(g, 'c1', ['reload', null, null, null]);
    expect(_test.cutFor(g, cb, pc.id)!.cmds.map((x) => x.action)).toEqual(['reload', 'tq:main:shot', 'move', 'twatch']);
    expect(_test.cutFor(g, cb, pc.id)!.cmds.map((x) => x.key)).toEqual(['1', '2', '3', '4']);
    // A pick in a later slot: the smart commands before it keep their order around it.
    C.writePrefs(g, 'c1', [null, null, 'tpad:main', null]);
    expect(_test.cutFor(g, cb, pc.id)!.cmds.map((x) => x.action)).toEqual(['tq:main:shot', 'move', 'tpad:main', 'reload']);
    // A pick saved before techniques lands on today's row: Overwatch → Hold a shot, Aimed shot → the plain Shot.
    C.writePrefs(g, 'c1', ['overwatch', 'aimed', null, null]);
    expect(_test.cutFor(g, cb, pc.id)!.cmds.slice(0, 2).map((x) => x.action)).toEqual(['twatch', 'tq:main:shot']);
    // Picks that already cover the smart default: spare actions fill in, never a repeat.
    C.writePrefs(g, 'c1', ['twatch', 'reload', 'move', null]);
    expect(_test.cutFor(g, cb, pc.id)!.cmds.map((x) => x.action)).toEqual(['twatch', 'reload', 'move', 'tq:main:shot']);
    C.writePrefs(g, 'c1', ['twatch', 'analyze', null, null]);
    // Can't be used now: greyed with the reason (no AP left).
    pc.ap = 0;
    cmds = _test.cutFor(g, cb, pc.id)!.cmds;
    expect(cmds[0]).toMatchObject({ action: 'twatch', off: true });
    expect(cmds[0].sub).toMatch(/^Not now: /);
    pc.ap = 6;
    // Not in this unit's kit (no magic): the smart default takes the slot.
    C.writePrefs(g, 'c1', ['evoke', null, null, null]);
    cmds = _test.cutFor(g, cb, pc.id)!.cmds;
    expect(cmds[0].action).toBe(smart[0]);
    expect(cmds[0].custom).toBeUndefined();
    // Every action the panel offers is in the catalogue, with its tab.
    const cat = C.catalogue(cb, pc, g.characters.c1);
    expect(cat.map((e) => e.action)).toEqual(C.actionGroups(cb, pc, g.characters.c1).flatMap((gr) => gr[1].map((x) => x[0])));
    expect(cat.find((e) => e.action === 'move')!.tab).toBe('move');
    // Reset: nothing kept, the smart default again.
    C.writePrefs(g, 'c1', [null, null, null, null]);
    expect(store['phc.cutinCmds']).toBe('{}');
    expect(_test.cutFor(g, cb, pc.id)!.cmds.map((x) => x.action)).toEqual(smart);
  });
  it('the Proving Ground (no Narrator) offers no action only the Narrator can rule; the old weapon-skill row is gone', () => {
    const { g, cb, pc } = game();
    pc.weapon = 'hellraiser_service_rifle'; pc.ammo = 24;
    const all = C.catalogue(cb, pc, g.characters.c1), none = C.catalogue(cb, pc, g.characters.c1, { noNarrator: true });
    // Physical 2.0 (rules 1.12): Suppressing Fire is now the rifle's Suppress technique, in its Techniques pad; the old
    // Narrator-ruled weapon-skill row is gone from both lists.
    expect(all.find((e) => e.action === 'skill')).toBeUndefined();
    expect(all.filter((e) => e.cost === 'Narrator')).toEqual([]);
    expect(none.filter((e) => e.cost === 'Narrator')).toEqual([]);
    expect(C.actionGroups(cb, pc, g.characters.c1, { noNarrator: true }).flatMap((gr) => gr[1]).some((it) => it[2] === 'Narrator')).toBe(false);
    // A pick of the old row stored before: it maps onto the plain Shot, in or out of the Proving Ground.
    C.writePrefs(g, 'c1', ['skill', null, null, null]);
    g.sandbox = { state: 'fighting' };
    expect(_test.cutFor(g, cb, pc.id)!.cmds.map((x) => x.action)).not.toContain('skill');
    delete g.sandbox;
    expect(_test.cutFor(g, cb, pc.id)!.cmds[0]).toMatchObject({ action: 'tq:main:shot', custom: true });
    C.writePrefs(g, 'c1', [null, null, null, null]);
  });
});

describe('the drone\'s commands (spec 14 item 370)', () => {
  it('a drone offers only Move and Shot: no aimed shot, reload, Overwatch or other weapon actions', () => {
    const c = newCharacter('c1', 'p1', sheetFrom(ARCHETYPES[0].id, 'Vale'));
    c.companions = [{ id: 'd1', kind: 'drone', name: 'Pip' }];
    const cb = startCombat('t', 'yard', [{ c, pos: '1,5' }], [{ name: 'Raider', tier: 'boss', weapon: 'service_pistol', at: 'D5' }], 'easy', { state: 4 }, []);
    const drone = cb.units.find((x: any) => x.companion === 'drone')!;
    expect(drone.maxHp).toBe(30);
    const acts = C.actionGroups(cb, drone, null).flatMap(([, items]) => items.map((it) => it[0]));
    expect([...new Set(acts)].sort()).toEqual(['move', 'shot']);
    expect(C.smartCommands(drone).map((x) => x.action)).toEqual(['shot', 'move']);
  });
});

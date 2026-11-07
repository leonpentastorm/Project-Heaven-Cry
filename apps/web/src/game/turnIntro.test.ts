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
  const g: any = { phase: 'combat', combat: cb, characters: { c1: c }, players: [{ id: 'p1', name: 'Leon', initials: 'LE', color: '#7FD4FF', online: true }, { id: 'p2', name: 'Kim', initials: 'KI', color: '#E3BF51', online: true }], campaign: null, story: { zone: '' } };
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
    cb.map.solid = [...cb.map.solid, ...Array.from({ length: cb.map.h }, (_, y) => '2,' + y)];
    const hidden = _test.bannerFor(g, cb, foe.id, 'p1', 2)!;
    expect(hidden).toMatchObject({ unseen: true, name: 'Unseen hostile', img: '' });
  });
  it('the cut-in shows the unit\'s numbers and four commands with combat.js action ids', () => {
    const { g, cb, pc } = game();
    const c = _test.cutFor(g, cb, pc.id)!;
    expect(c.name).toBe('Vale');
    expect(c.hp).toEqual([pc.hp, pc.maxHp]);
    expect(c.cmds).toHaveLength(4);
    expect(c.cmds.map((x) => x.key)).toEqual(['1', '2', '3', '4']);
    expect(['shot', 'melee', 'clear']).toContain(c.cmds[0].action);
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
  it('the four commands can be customised per character: picks win, a pick that can\'t be used now is greyed with why, one not in the kit falls back', () => {
    const { g, cb, pc } = game();
    const smart = _test.cutFor(g, cb, pc.id)!.cmds.map((x) => x.action);
    expect(C.readPrefs('c1')).toEqual([null, null, null, null]);
    // Overwatch first, Analyze fourth; the rest stay smart (and a smart slot never repeats a pick).
    C.writePrefs('c1', ['overwatch', null, null, 'analyze']);
    expect(JSON.parse(store['phc.cutinCmds'])).toEqual({ c1: ['overwatch', null, null, 'analyze'] });
    let cmds = _test.cutFor(g, cb, pc.id)!.cmds;
    expect(cmds.map((x) => x.key)).toEqual(['1', '2', '3', '4']);
    expect(cmds[0]).toMatchObject({ action: 'overwatch', custom: true });
    expect(cmds[3]).toMatchObject({ action: 'analyze', custom: true });
    expect(cmds[1].action).toBe(smart[1]);
    expect(new Set(cmds.map((x) => x.action)).size).toBe(4);
    // Can't be used now: greyed with the reason (no AP left).
    pc.ap = 0;
    cmds = _test.cutFor(g, cb, pc.id)!.cmds;
    expect(cmds[0]).toMatchObject({ action: 'overwatch', off: true });
    expect(cmds[0].sub).toMatch(/^Not now: /);
    pc.ap = 6;
    // Not in this unit's kit (no magic): the smart default takes the slot.
    C.writePrefs('c1', ['evoke', null, null, null]);
    cmds = _test.cutFor(g, cb, pc.id)!.cmds;
    expect(cmds[0].action).toBe(smart[0]);
    expect(cmds[0].custom).toBeUndefined();
    // Every action the panel offers is in the catalogue, with its tab.
    const cat = C.catalogue(cb, pc, g.characters.c1);
    expect(cat.map((e) => e.action)).toEqual(C.actionGroups(cb, pc, g.characters.c1).flatMap((gr) => gr[1].map((x) => x[0])));
    expect(cat.find((e) => e.action === 'move')!.tab).toBe('move');
    // Reset: nothing kept, the smart default again.
    C.writePrefs('c1', [null, null, null, null]);
    expect(store['phc.cutinCmds']).toBe('{}');
    expect(_test.cutFor(g, cb, pc.id)!.cmds.map((x) => x.action)).toEqual(smart);
  });
});

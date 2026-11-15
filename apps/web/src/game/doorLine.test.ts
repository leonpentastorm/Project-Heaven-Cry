// The door line and the first turn's tab (game/doorLine.ts, nine doors audit 0.29): the line is skills.json's, its
// numbers the engine's; the first turn of a fight opens on the top door's tab only when its first row is usable; the
// first-fight tip is mine, on my turn, with that door.
import { describe, expect, it, vi } from 'vitest';
import { SKILL, SIGIL_GRAMMAR } from '@engine';
vi.mock('./store', () => ({ getState: () => ({}), subscribe: () => () => {} }));
import { DOORS, DOOR_TOKENS, doorOfTab, topDoor, firstTurnTab } from './doorLine';
const { DOOR_TIPS, myDoorTurn, TIPS } = await import('./tips');

const groups = (whyDraw: string) => [{ id: 'move', items: [{ key: 'move', why: '' }] }, { id: 'attack', items: [{ key: 'tq:main:shot', why: '' }] }, { id: 'sigils', items: [{ key: 'draw', why: whyDraw }, { key: 'evoke', why: '' }] }];
const sigilist = { skills: { brain_power: 3, hand_eye: 1 } };

describe('the door line', () => {
  it('Sigils: the line from skills.json, its numbers the Sigil grammar\'s (never typed), on the sigils tab', () => {
    const d = doorOfTab('sigils')!;
    expect(d).toMatchObject({ skill: 'brain_power', tab: SKILL.brain_power.door_tab });
    expect(DOOR_TOKENS).toEqual({ line_min: SIGIL_GRAMMAR.min_glyphs, line_max: SIGIL_GRAMMAR.max_glyphs });
    expect(d.line).toBe('Draw words on your own tile in a straight row of ' + SIGIL_GRAMMAR.min_glyphs + ' to ' + SIGIL_GRAMMAR.max_glyphs + ', then Evoke from an end or the side.');
    expect(d.line).not.toMatch(/\{\w+\}/);
    expect(doorOfTab('move')).toBeNull();
  });
  it('the first turn: the top door\'s tab when its first action is usable; else the usual rule (null)', () => {
    const cb = { round: 1 };
    expect(topDoor(sigilist)!.skill).toBe('brain_power');
    expect(firstTurnTab(cb, sigilist, groups(''))).toBe('sigils');
    expect(firstTurnTab(cb, sigilist, groups('Needs an Evoker in hand.'))).toBeNull(); // no Evoker in hand: not this tab
    expect(firstTurnTab({ round: 2 }, sigilist, groups(''))).toBeNull(); // after the first round: the tab used last
    expect(firstTurnTab(cb, { skills: { hand_eye: 4 } }, groups(''))).toBeNull(); // no door with a line
    expect(firstTurnTab(cb, sigilist, groups('').filter((x) => x.id !== 'sigils'))).toBeNull(); // no Sigils tab
    // a read-only row first (the isInfo test) is skipped: the first real row decides
    expect(firstTurnTab(cb, sigilist, [{ id: 'sigils', items: [{ key: 'pki:x', why: '' }, { key: 'draw', why: 'No.' }] }], (k) => k.startsWith('pki:'))).toBeNull();
  });
  it('the tip: one per door with a line, after the COMBAT tip, shown on my turn when my character there has the door', () => {
    expect(DOOR_TIPS.map((t) => t.id)).toEqual(DOORS.map((d) => 'door:' + d.skill));
    const t = DOOR_TIPS.find((x) => x.id === 'door:brain_power')!; expect(t.title).toBe('SIGILS'); expect(t.text).toBe(doorOfTab('sigils')!.line);
    expect(TIPS.findIndex((x) => x.id === 'combat')).toBeLessThan(TIPS.findIndex((x) => x.id === t.id));
    const st = (o: any = {}) => ({ screen: 'combat', me: { id: 'p1' }, game: { characters: { c1: { owner: 'p1', skills: { brain_power: 2 } }, c2: { owner: 'p2', skills: { brain_power: 2 } } },
      combat: { turn: 0, order: ['u1', 'u2'], units: [{ id: 'u1', charId: 'c1' }, { id: 'u2', charId: 'c2' }], ...o } } } as any);
    expect(t.when(st())).toBe(true); expect(myDoorTurn(st(), 'brain_power')).toBe(true);
    expect(t.when(st({ turn: 1 }))).toBe(false); // someone else's turn
    expect(t.when(st({ over: true }))).toBe(false);
    expect(t.when({ ...st(), screen: 'main' })).toBe(false);
    expect(myDoorTurn(st(), 'will_power')).toBe(false); // not my door
  });
});

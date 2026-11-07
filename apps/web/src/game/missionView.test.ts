// The mission board's view logic (spec: OOC, missions and end states): the header button, the board, toasts, end screens.
import { describe, expect, it } from 'vitest';
import { ARCHETYPES, apply, newGame, type GameState, type NarratorTurn } from '@engine';
import { missionsButton, boardView, toastFor, endingView } from './missionView';

const sheet = (name: string): any => { const a = ARCHETYPES[0]; return { name, portrait: 'p.png', origin: 'Thousand-Planet frontier', kit: 'medic', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} }; };
const turn = (g: GameState, t: Partial<NarratorTurn>) => apply(g, { type: 'narrator/turn', turn: { narration: 'On.', ...t } as NarratorTurn }, 'host');
function started() {
  let g = newGame('VIEW1', { id: 'host', name: 'Leon' }, 'view');
  g = apply(g, { type: 'char/add', sheet: sheet('MPAT') }, 'host');
  g = apply(g, { type: 'session/start' }, 'host');
  return turn(g, { sceneTitle: 'The shield line' });
}

describe('the mission board view', () => {
  it('the header button counts open objectives; no button without missions', () => {
    const g = started();
    expect(missionsButton(g)).toEqual({ label: 'MISSIONS · 5', count: 5, title: '5 open objectives' });
    const old = { ...g, story: { ...g.story, missions: undefined } } as GameState;
    expect(missionsButton(old)).toBeNull(); expect(missionsButton(null)).toBeNull();
  });
  it('marks ☐ / ✓ / ✕, optional ones flagged, hidden ones absent, completed missions below', () => {
    let g = started();
    g = turn(g, { missions: [{ mission: 'the_shield_line', status: 'done' }] });
    g = turn(g, { missions: [{ mission: 'the_ramp', objective: 'no_shots', status: 'failed' }] });
    const b = boardView(g);
    expect(b.current[0]).toMatchObject({ title: 'The Ramp', kicker: 'ACT 1 · CURRENT', goal: 'Get the wounded aboard the last ship.' });
    expect(b.current[0].rows.map((r) => r.mark + (r.optional ? '?' : ''))).toEqual(['☐', '☐?', '✕?']);
    expect(b.past.map((m) => m.kicker)).toEqual(['ACT 1 · COMPLETE']);
    expect(b.past[0].rows.every((r) => r.mark === '✓')).toBe(true);
  });
  it('toasts for mission lines only', () => {
    expect(toastFor({ id: 'e1', kind: 'system', mission: 'done', text: '✓ Objective: Get the wounded aboard' })).toEqual({ kicker: '✓ OBJECTIVE', text: 'Get the wounded aboard', tone: 'done' });
    expect(toastFor({ id: 'e2', kind: 'system', mission: 'complete', text: '✓ MISSION COMPLETE: The Ramp' })!.text).toBe('The Ramp');
    expect(toastFor({ id: 'e3', kind: 'system', mission: 'reveal', text: '◆ New objective: Decide' })!.kicker).toBe('◆ NEW OBJECTIVE');
    expect(toastFor({ id: 'e4', kind: 'system', text: 'Round 2.' })).toBeNull();
  });
  it('the act-end card shows once per viewer; the campaign end screen after the epilogue', () => {
    let g = started();
    g = turn(g, { missions: [{ mission: 'the_shield_line', status: 'done' }], xp: [{ charId: 'all', source: 'quest', amount: 120 }] });
    g = turn(g, { missions: [{ mission: 'the_ramp', objective: 'get_aboard', status: 'done' }], missionNext: 'the_crossing' });
    const card = endingView(g, [])!;
    expect(card).toMatchObject({ kind: 'act', title: 'Act 1 · The Last Ship', next: { title: 'The Crossing' } });
    expect(card.kind === 'act' && card.xp).toEqual([{ key: Object.keys(g.characters)[0], text: 'MPAT +120 XP' }]);
    expect(endingView(g, [card.seq])).toBeNull();
    g = turn(g, { missions: [{ mission: 'the_crossing', status: 'done' }] });
    g = turn(g, { missions: [{ mission: 'the_demand', status: 'done' }] });
    expect(endingView(g, [])).toBeNull(); // the epilogue turn hasn't come yet
    g = turn(g, { narration: 'First.\n\nSecond.' });
    const end = endingView(g, [])!;
    expect(end).toMatchObject({ kind: 'campaign', title: 'The Last Ship Out', epilogue: ['First.', 'Second.'] });
    expect(end.kind === 'campaign' && end.cards[0]).toMatchObject({ name: 'MPAT', img: 'p.png', cls: 'No class' });
  });
});

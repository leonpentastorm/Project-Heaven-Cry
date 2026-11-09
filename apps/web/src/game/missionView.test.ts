// The mission board's view logic (spec: OOC, missions and end states): the header button, the board, toasts, end screens.
import { describe, expect, it } from 'vitest';
import { ARCHETYPES, apply, newGame, type GameState, type NarratorTurn } from '@engine';
import { missionsButton, boardView, toastFor, endingView, questGroups } from './missionView';

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
    expect(b.past[0].rows.filter((r) => !r.optional).every((r) => r.mark === '✓')).toBe(true); // an optional one left undone stays open
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
    g = turn(g, { missions: [{ mission: 'the_ramp', objective: 'get_aboard', status: 'done' }], missionNext: 'the_demand' });
    const card = endingView(g, [])!;
    expect(card).toMatchObject({ kind: 'act', title: 'Act 1 · The Last Ship', next: { title: 'The Demand' } });
    expect(card.kind === 'act' && card.xp).toEqual([{ key: Object.keys(g.characters)[0], text: 'MPAT +120 XP' }]);
    expect(endingView(g, [card.seq])).toBeNull();
    g = turn(g, { missions: [{ mission: 'the_demand', status: 'done' }] });
    expect(endingView(g, [])).toBeNull(); // the epilogue turn hasn't come yet
    g = turn(g, { narration: 'First.\n\nSecond.' });
    const end = endingView(g, [])!;
    expect(end).toMatchObject({ kind: 'campaign', title: 'The Last Ship Out', epilogue: ['First.', 'Second.'] });
    expect(end.kind === 'campaign' && end.cards[0]).toMatchObject({ name: 'MPAT', img: 'p.png', cls: 'No class' });
  });
});

describe('the quest board (always open, grouped)', () => {
  it('by Area: here, each other zone, somewhere, side jobs; done and failed folded at the end', () => {
    let g = started();
    expect(questGroups(g).groups.map((x) => x.title + ':' + x.count)).toEqual(['SOMEWHERE:5']);
    g = turn(g, { missions: [{ mission: 'the_shield_line', objective: 'carry_east', status: 'revealed', where: { zone: 'rear_pad' } }, { mission: 'the_shield_line', objective: 'tend_the_line', status: 'revealed', where: { zone: 'shield_line' } }] });
    g = turn(g, { missions: [{ mission: 'the_shield_line', objective: 'reach_nine_nine', status: 'done' }], side: [{ id: 'toolkit', title: 'Keel\'s missing toolkit', text: 'Somewhere on the pad.' }, { id: 'lost', title: 'A lost dog tag', status: 'failed' }] });
    const q = questGroups(g);
    expect(q.groups.map((x) => x.title)).toEqual(['HERE · THE SHIELD LINE', 'IN OUTPOST-813 REAR LANDING PAD', 'SOMEWHERE', 'SIDE JOBS', 'DONE', 'FAILED']);
    expect(q.groups[0].rows.map((r) => r.text)).toEqual(['Tend the wounded on the triage line']);
    expect(q.groups[1].rows[0]).toMatchObject({ text: 'Carry the wounded east to the rear pad', where: 'In Outpost-813 rear landing pad', mark: '☐', here: false });
    expect(q.groups.find((x) => x.key === 'side')!.rows[0]).toMatchObject({ text: 'Keel\'s missing toolkit', detail: 'Somewhere on the pad.', side: true });
    expect(q.groups.filter((x) => x.folded).map((x) => x.key)).toEqual(['done', 'failed']);
    expect(q.groups.find((x) => x.key === 'done')!.rows.map((r) => r.mark + r.text)).toEqual(['✓Report to Sergeant Nine-Nine in the stake line']);
    expect(q.open).toBe(5);
  });
  it('a town full of quests: every side job listed, the open count right', () => {
    let g = started();
    const jobs = (from: number) => Array.from({ length: 12 }, (_, i) => ({ id: 'job' + (from + i), title: 'Job number ' + (from + i) }));
    g = turn(g, { side: jobs(0) }); g = turn(g, { side: jobs(12) });
    const q = questGroups(g);
    expect(q.groups.find((x) => x.key === 'side')!.count).toBe(24);
    expect(q.open).toBe(29);
    expect(q.groups.reduce((n, x) => n + x.count, 0)).toBe(29);
  });
  it('by Quest: one group per current mission with its goal (open rows first), side jobs, then the past folded', () => {
    let g = started();
    g = turn(g, { missions: [{ mission: 'the_shield_line', objective: 'reach_nine_nine', status: 'done' }] });
    let q = questGroups(g, 'quest');
    expect(q.groups[0]).toMatchObject({ title: 'THE SHIELD LINE', sub: 'Get the wounded line to the rear pad before the last ship leaves.', folded: false });
    expect(q.groups[0].rows.map((r) => r.mark)).toEqual(['☐', '☐', '☐', '☐', '✓']);
    expect(q.groups[0].rows.every((r) => r.mission === '')).toBe(true);
    g = turn(g, { missions: [{ mission: 'the_shield_line', status: 'done' }] });
    q = questGroups(g, 'quest');
    expect(q.groups.map((x) => x.title + (x.folded ? ' (folded)' : ''))).toEqual(['THE RAMP', 'PAST (folded)']);
    expect(q.groups[1].rows[0]).toMatchObject({ mark: '✓', text: 'The Shield Line' });
  });
  it('a group that mixes missions names each row\'s mission; no missions, no board', () => {
    let g = started();
    g = turn(g, { missions: [{ mission: 'the_shield_line', status: 'done' }] });
    let done = questGroups(g).groups.find((x) => x.key === 'done')!;
    expect(done.rows.every((r) => r.mission === '')).toBe(true); // one mission only: no label
    g = turn(g, { missions: [{ mission: 'the_ramp', objective: 'get_aboard', status: 'done' }] });
    done = questGroups(g).groups.find((x) => x.key === 'done')!;
    expect(new Set(done.rows.map((r) => r.mission))).toEqual(new Set(['The Shield Line', 'The Ramp']));
    const none = { ...g, story: { ...g.story, missions: undefined } } as GameState;
    expect(questGroups(none).has).toBe(false); expect(questGroups(null).has).toBe(false);
  });
});

// OOC, missions and end states (spec: OOC, missions and end states; src/missions.ts).
import { describe, expect, it } from 'vitest';
import {
  ARCHETYPES, apply, newGame, builtInCampaign, validateCampaign, validateMissions, oocOf, missionBoard, missionBrief, missionsCampaign, actOpening, epilogueJob, missionsOf, memoryOf, applyMemOp, viewFor,
  type GameState, type NarratorTurn, type Sheet,
} from '../src';

const sheet = (name: string): Sheet => { const a = ARCHETYPES[0]; return { name, portrait: '', origin: 'Thousand-Planet frontier', kit: 'medic', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} }; };
const T = (t: Partial<NarratorTurn>): NarratorTurn => ({ narration: 'The wind moves.', ...t } as NarratorTurn);
const turn = (g: GameState, t: Partial<NarratorTurn>) => apply(g, { type: 'narrator/turn', turn: T(t) }, 'host');
/** A started M813 session with two players, the opening told: the room is waiting on the players. */
function started(): GameState {
  let g = newGame('MIS1', { id: 'host', name: 'Host' }, 'missions');
  g = apply(g, { type: 'player/join', id: 'p2', name: 'Kim' }, 'host');
  g = apply(g, { type: 'char/add', sheet: sheet('MPAT') }, 'host');
  g = apply(g, { type: 'char/add', sheet: sheet('Rook') }, 'p2');
  g = apply(g, { type: 'session/start' }, 'host');
  return turn(g, { narration: 'The guns stop.', sceneTitle: 'The shield line' });
}
const done = (mission: string, ...objs: string[]) => objs.map((objective) => ({ mission, objective, status: 'done' as const }));
const last = (g: GameState) => g.story.entries.at(-1)!;

describe('OOC', () => {
  it('detects the markers, any case, and strips them', () => {
    expect(oocOf('[OOC] Quest complete, now what?')).toEqual({ ooc: true, text: 'Quest complete, now what?' });
    expect(oocOf('(OOC: Yeah I\'m kinda confused)')).toEqual({ ooc: true, text: 'Yeah I\'m kinda confused' });
    expect(oocOf('ooc: where do we go')).toEqual({ ooc: true, text: 'where do we go' });
    expect(oocOf('// brb')).toEqual({ ooc: true, text: 'brb' });
    expect(oocOf('[to the narrator] Hey bro what do we do next?').text).toBe('Hey bro what do we do next?');
    expect(oocOf('[To the Narator] typo too').ooc).toBe(true);
    expect(oocOf('I walk to the ramp. (OOC later)').ooc).toBe(false);
    expect(oocOf('Oocyte samples, please').ooc).toBe(false);
  });

  it('an OOC line uses neither the Say nor the turn, and reaches the Narrator in its own block', () => {
    let g = started();
    expect(g.story.await).toBe('players');
    g = apply(g, { type: 'story/speak', text: '[OOC] Quest complete, now what?' }, 'p2');
    expect(g.story.spoken.p2).toBeUndefined();
    expect(last(g)).toMatchObject({ kind: 'ooc', who: 'p2', head: 'OOC · Kim', text: 'Quest complete, now what?', ooc: true });
    expect(g.story.oocAsk).toEqual([expect.objectContaining({ who: 'p2', name: 'Kim', text: 'Quest complete, now what?' })]);
    expect(g.story.needs).toBe(true); // the round's close calls the Narrator, even if nobody speaks in character
    // the toggle works without a marker, and the player can still say something in character
    g = apply(g, { type: 'story/speak', text: 'Is the ship still there?', ooc: true }, 'p2');
    g = apply(g, { type: 'story/speak', text: 'I count the wounded.' }, 'p2');
    expect(g.story.spoken.p2).toBe('I count the wounded.');
    // a player can ask even while the Narrator is answering
    g = apply(g, { type: 'story/speak', text: '(OOC how long is a round?)' }, 'host');
    expect(g.story.oocAsk!.length).toBe(3);
    // OOC lines never go into the transcript (they carry the ooc flag)
    expect(g.story.entries.filter((e) => e.kind === 'ooc').every((e) => e.ooc)).toBe(true);
  });

  it('the Narrator answers in its own box; questions asked mid-call wait for the next turn', () => {
    let g = started();
    g = apply(g, { type: 'story/speak', text: '[OOC] what now?' }, 'p2');
    g.story.await = 'narrator'; g.story.work = { kind: 'round' };
    g = apply(g, { type: 'narrator/begin' }, 'host');
    g = apply(g, { type: 'story/speak', text: '[OOC] and the ramp?' }, 'host'); // after the call began
    g = turn(g, { ooc: 'Your objective: report to Nine-Nine at H5. Then tend the triage line or check no-man\'s-land.' });
    const box = g.story.entries.find((e) => e.kind === 'ooc' && e.head === 'NARRATOR · OOC')!;
    expect(box.text).toMatch(/Nine-Nine/);
    expect(g.story.oocAsk!.map((q) => q.text)).toEqual(['and the ramp?']);
    g.story.await = 'narrator'; g.story.work = { kind: 'round' };
    g = turn(g, { ooc: '' });
    expect(g.story.oocAsk).toBeUndefined();
    expect(g.story.entries.filter((e) => e.head === 'NARRATOR · OOC').length).toBe(1); // an empty answer shows nothing
  });

  it('OOC in a fight goes to the Narrator, not into the fight notes', () => {
    let g = started();
    g = turn(g, { combat: { name: 'Picking at the dead', difficulty: 'easy', enemies: [{ name: 'Scavenger drone', tier: 'minion', weapon: 'service_pistol' }] } });
    expect(g.phase).toBe('combat');
    const me = Object.values(g.characters).find((c) => c.owner === 'p2')!;
    g = apply(g, { type: 'combat/say', charId: me.id, text: '// do we have to win this?' }, 'p2');
    expect(g.combat!.notes || []).toEqual([]);
    expect(g.story.oocAsk!.map((q) => q.text)).toEqual(['do we have to win this?']);
  });
});

describe('missions', () => {
  it('the campaign\'s first mission activates on session start', () => {
    const g = started(), ms = missionsOf(g)!;
    expect(ms.active).toEqual(['the_shield_line']);
    expect(Object.values(ms.objectives.the_shield_line).every((s) => s === 'open')).toBe(true);
    expect(g.story.entries.some((e) => e.mission === 'start' && /The Shield Line/.test(e.text))).toBe(true);
    const b = missionBoard(g);
    expect(b.has).toBe(true); expect(b.open).toBe(5); expect(b.current[0].title).toBe('The Shield Line');
  });

  it('Narrator updates are checked against the campaign: unknown ids and inactive missions are ignored', () => {
    let g = started();
    g = turn(g, { missions: [{ mission: 'nope', objective: 'x', status: 'done' }, { mission: 'the_shield_line', objective: 'nope', status: 'done' }, { mission: 'the_ramp', objective: 'get_aboard', status: 'done' }, { mission: 'the_shield_line', objective: 'reach_nine_nine', status: 'bogus' as any }] });
    const ms = missionsOf(g)!;
    expect(ms.objectives.the_shield_line.reach_nine_nine).toBe('open');
    expect(ms.objectives.the_ramp).toBeUndefined();
    g = turn(g, { missions: done('the_shield_line', 'reach_nine_nine') });
    expect(missionsOf(g)!.objectives.the_shield_line.reach_nine_nine).toBe('done');
    expect(g.story.entries.some((e) => e.mission === 'done' && e.text === '✓ Objective: Report to Sergeant Nine-Nine in the stake line')).toBe(true);
    // a done objective stays done
    g = turn(g, { missions: [{ mission: 'the_shield_line', objective: 'reach_nine_nine', status: 'failed' }] });
    expect(missionsOf(g)!.objectives.the_shield_line.reach_nine_nine).toBe('done');
  });

  it('a mission completes when its required objectives are done, and next activates', () => {
    let g = started();
    g = turn(g, { missions: done('the_shield_line', 'reach_nine_nine', 'tend_the_line', 'first_fight', 'who_stays') });
    expect(missionsOf(g)!.active).toEqual(['the_shield_line']);
    g = turn(g, { missions: done('the_shield_line', 'carry_east') });
    const ms = missionsOf(g)!;
    expect(ms.done).toEqual(['the_shield_line']); expect(ms.active).toEqual(['the_ramp']);
    expect(ms.ending).toBeNull(); // no end state on the tutorial mission
    expect(g.story.entries.some((e) => e.mission === 'complete')).toBe(true);
    const b = missionBoard(g);
    expect(b.current.map((m) => m.id)).toEqual(['the_ramp']); expect(b.past.map((m) => m.id)).toEqual(['the_shield_line']);
    expect(b.current[0].objectives.filter((o) => o.optional).map((o) => o.id)).toEqual(['no_one_left', 'no_shots']);
  });

  it('a mission-level done settles every open required objective; optional ones stay as they are', () => {
    let g = started();
    g = turn(g, { missions: [{ mission: 'the_shield_line', status: 'done' }] });
    expect(missionsOf(g)!.active).toEqual(['the_ramp']);
  });

  function atRamp(): GameState {
    let g = started();
    return turn(g, { missions: [{ mission: 'the_shield_line', status: 'done' }] });
  }

  it('act end: a branch to choose, the MISSION COMPLETE card from the engine\'s records, and the opening note', () => {
    let g = atRamp();
    g = turn(g, { xp: [{ charId: 'all', source: 'quest', amount: 100, reason: 'the ramp' }], memory: [{ op: 'fact', text: 'The medics gave Keel the platinum.', importance: 5 }, { op: 'fact', text: 'A small thing.', importance: 2 }] });
    g = turn(g, { endScene: { summary: 'The ramp: Keel sealed the hatch; the column stayed on the pad.' }, missions: [{ mission: 'the_ramp', objective: 'no_shots', status: 'done' }, { mission: 'the_ramp', objective: 'get_aboard', status: 'failed', note: 'the hatch sealed' }] });
    const ms = missionsOf(g)!;
    expect(ms.failed).toEqual(['the_ramp']); expect(ms.active).toEqual([]);
    expect(ms.choose).toEqual({ from: 'the_ramp', options: ['the_years', 'the_demand'] });
    const e = ms.ending!;
    expect(e).toMatchObject({ kind: 'act', mission: 'the_ramp', title: 'Act 1 · The Last Ship', next: null });
    expect(e.recap.join(' ')).toMatch(/Keel sealed the hatch/);
    expect(e.xp.map((x) => x.xp)).toEqual([100, 100]);
    expect(e.choices).toEqual(['The medics gave Keel the platinum.']);
    expect(e.done).toContain('No shots fired');
    expect(actOpening(g)).toMatch(/not chosen yet/);
    expect(missionBrief(g)).toMatch(/CHOOSE NEXT.*the_years.*the_demand/);
    // the Narrator picks the branch: it activates, the card learns its title, the next turn is told to open it
    g = turn(g, { missionNext: 'the_years' });
    const ms2 = missionsOf(g)!;
    expect(ms2.active).toEqual(['the_years']); expect(ms2.choose).toBeNull();
    expect(ms2.ending!.next).toEqual({ title: 'The Years', goal: expect.stringMatching(/escape craft/) });
    expect(actOpening(g)).toMatch(/^ACT ENDED: open the next mission The Years/);
    // the opening is spent by the Narrator's next turn
    g.story.await = 'narrator'; g.story.work = { kind: 'round' };
    g = turn(g, { narration: 'Years.' });
    expect(actOpening(g)).toBe('');
    // a wrong branch is ignored
    expect(missionsOf(turn(atRamp(), { missionNext: 'the_shield_line' }))!.active).toEqual(['the_ramp']);
  });

  it('hidden objectives stay off the board and out of the open list until revealed', () => {
    let g = atRamp();
    g = turn(g, { missions: [{ mission: 'the_ramp', objective: 'get_aboard', status: 'failed' }], missionNext: 'the_years' });
    expect(missionBoard(g).current[0].objectives.map((o) => o.id)).toEqual(['scavenge', 'rebuild', 'leave']);
    expect(missionBrief(g)).toMatch(/hidden \(Narrator only[^\n]*the_choice/);
    g = turn(g, { missions: [{ mission: 'the_years', objective: 'the_choice', status: 'revealed' }] });
    expect(missionBoard(g).current[0].objectives.map((o) => o.id)).toContain('the_choice');
    expect(g.story.entries.some((e) => e.mission === 'reveal' && /who is rebuilt/.test(e.text))).toBe(true);
    // the board never carries done_when or notes
    expect(JSON.stringify(missionBoard(g))).not.toMatch(/done_when|narrator_notes|K10/);
  });

  it('campaign end: the Narrator gets one last turn, the epilogue, then the save is complete', () => {
    let g = atRamp();
    g = turn(g, { missions: [{ mission: 'the_ramp', objective: 'get_aboard', status: 'done' }], missionNext: 'the_demand' });
    expect(missionsOf(g)!.active).toEqual(['the_demand']);
    g = turn(g, { missions: done('the_demand', 'reach_colonel', 'make_demand', 'the_answer') });
    expect(missionsOf(g)!.ending!.kind).toBe('campaign');
    expect(g.story.await).toBe('narrator'); expect(g.story.work).toEqual({ kind: 'epilogue' });
    expect(epilogueJob(g)).toMatch(/epilogue[\s\S]*Nine-Nine/);
    g = turn(g, { narration: 'Years later, a record.' });
    expect(g.story.complete).toBe(true); expect(g.story.await).toBe('none'); expect(g.story.work).toBeNull();
    expect(missionsOf(g)!.ending!.epilogue).toBe('Years later, a record.');
    expect(missionBoard(g).complete).toBe(true);
    expect(() => apply(g, { type: 'story/speak', text: 'Wait!' }, 'p2')).toThrow(/complete/);
    // OOC still works after the end
    expect(apply(g, { type: 'story/speak', text: '[OOC] gg' }, 'p2').story.entries.at(-1)!.kind).toBe('ooc');
  });

  it('a campaign end during a fight waits for the fight\'s end before the epilogue', () => {
    let g = atRamp();
    g = turn(g, { missions: [{ mission: 'the_ramp', objective: 'get_aboard', status: 'done' }], missionNext: 'the_demand' });
    g = turn(g, { missions: done('the_demand', 'reach_colonel', 'make_demand', 'the_answer'), combat: { name: 'Station security', difficulty: 'hard', enemies: [{ name: 'Security guard', tier: 'soldier', weapon: 'decrkm_smg' }] } });
    expect(g.phase).toBe('combat'); expect(missionsOf(g)!.epilogueDue).toBe(true); expect(g.story.work).toBeNull();
    // the fight ends (as the engine would), the aftermath turn comes, then the epilogue
    g.combat = null; g.phase = 'story'; g.story.await = 'narrator'; g.story.work = { kind: 'combat_end' };
    g = turn(g, { narration: 'Quiet.' });
    expect(g.story.work).toEqual({ kind: 'epilogue' });
  });

  it('side jobs: the Narrator adds and settles them, and can\'t touch main missions through them', () => {
    let g = started();
    g = turn(g, { side: [{ id: 'radio', title: 'Fix the squad radio', text: 'It still has a channel open.' }, { id: 'the_ramp', title: 'Sneaky', status: 'done' }] });
    expect(missionsOf(g)!.side.map((j) => j.id)).toEqual(['radio', 'the_ramp']);
    expect(missionsOf(g)!.active).toEqual(['the_shield_line']); expect(missionsOf(g)!.objectives.the_ramp).toBeUndefined();
    expect(missionBoard(g).open).toBe(5 + 1); // the second one was already done
    g = turn(g, { side: [{ id: 'radio', status: 'done' }] });
    expect(missionsOf(g)!.side[0].status).toBe('done');
    expect(g.story.entries.some((e) => e.text === '✓ Side job: Fix the squad radio')).toBe(true);
  });

  it('the per-turn MISSION block stays small; done_when and notes live in the cached campaign block', () => {
    const g = started(), b = missionBrief(g);
    expect(b).toMatch(/^MISSION/); expect(b).toMatch(/reach_nine_nine Report to Sergeant Nine-Nine/);
    expect(b).not.toMatch(/done when|Done when/);
    expect(b.length / 4).toBeLessThan(110); // M813's longest mission (five objectives) is about 105; the others 40 to 75
    const c = missionsCampaign(g.campaign);
    expect(c).toMatch(/reach_nine_nine: Report to Sergeant Nine-Nine in the stake line. Done when: The medics reach Nine-Nine/);
    expect(c).toMatch(/the_repair_bay \(optional\) \[hidden\]/);
    expect(missionsCampaign({ ...g.campaign, missions: [] } as any)).toBe('');
  });
});

describe('old saves and other campaigns', () => {
  it('a save without missions loads and plays; a refresh starts the board', () => {
    let g = started();
    delete g.story.missions; delete (g.campaign as any).missions;
    g = turn(g, { missions: done('the_shield_line', 'reach_nine_nine'), side: [{ id: 'x', title: 'X' }], missionNext: 'the_ramp', ooc: 'Hi.' });
    expect(g.story.missions).toBeUndefined();
    expect(missionBoard(g)).toMatchObject({ has: false, open: 0 });
    expect(missionBrief(g)).toBe(''); expect(actOpening(g)).toBe('');
    expect(last(g)).toMatchObject({ kind: 'ooc', head: 'NARRATOR · OOC' });
    // the host refreshes the campaign from the built-ins: the board starts at the first mission
    g = apply(g, { type: 'campaign/refresh' }, 'host');
    expect(missionsOf(g)!.active).toEqual(['the_shield_line']);
  });

  it('views carry the board (players see it like the host)', () => {
    const v = viewFor(started(), 'p2');
    expect(missionBoard(v).current[0].id).toBe('the_shield_line');
  });

  it('a campaign without missions has no board', () => {
    let g = newGame('MIS2', { id: 'host', name: 'Host' }, 'm2');
    g.settings.start = 'own';
    g = apply(g, { type: 'char/add', sheet: sheet('A') }, 'host');
    g = apply(g, { type: 'session/start' }, 'host');
    expect(g.story.missions).toBeUndefined();
  });
});

describe('campaign data', () => {
  it('the M813 missions validate, and the data follows the arc', () => {
    const c = builtInCampaign('m813')!;
    expect(validateCampaign(c)).toEqual([]);
    expect(c.missions!.map((m) => m.id)).toEqual(['the_shield_line', 'the_ramp', 'the_years', 'the_demand']);
    expect(c.missions!.find((m) => m.id === 'the_ramp')!.end!.kind).toBe('act');
    expect(c.missions!.find((m) => m.id === 'the_demand')!.end!.kind).toBe('campaign');
  });
  it('every built-in campaign still validates', () => {
    for (const id of ['m813', 'godplot', 'curse', 'summoning', 'own']) expect(validateCampaign(builtInCampaign(id)!)).toEqual([]);
  });
  it('the validator says what is wrong with missions in plain words', () => {
    const c: any = builtInCampaign('m813')!;
    expect(validateMissions({ ...c, missions: 'x' })).toEqual(['missions must be a list.']);
    const bad = JSON.parse(JSON.stringify(c.missions));
    bad[0].next = 'nowhere'; bad[1].objectives = [{ id: 'a', text: 'A', optional: true, done_when: 'x' }]; bad[2].end = { kind: 'saga' }; bad[3].act = 0;
    const errs = validateMissions({ ...c, missions: bad }).join(' | ');
    expect(errs).toMatch(/leads to unknown mission "nowhere"/);
    expect(errs).toMatch(/"the_ramp" needs at least one required objective/);
    expect(errs).toMatch(/end needs kind/);
    expect(errs).toMatch(/"the_demand" needs an act number/);
    expect(validateMissions({ ...c, missions: [{ ...JSON.parse(JSON.stringify(c.missions[3])), next: 'the_demand' }] }).join()).toMatch(/No mission starts the campaign/);
    expect(validateMissions({ ...c, board_npc: { name: 'Quartermaster', zone: 'mars', at: 'B2' } }).join()).toMatch(/unknown zone "mars"/);
  });
  it('a board NPC stands in its zone as a neutral token', () => {
    let g = newGame('MIS3', { id: 'host', name: 'Host' }, 'm3');
    g = apply(g, { type: 'char/add', sheet: sheet('A') }, 'host');
    const c: any = builtInCampaign('m813'); c.board_npc = { name: 'Quartermaster Dace', zone: 'shield_line', at: 'C3' };
    g = apply(g, { type: 'campaign/load', campaign: c }, 'host');
    g = apply(g, { type: 'session/start' }, 'host');
    const zone = g.campaign!.zones.find((z) => z.id === 'shield_line')!;
    expect(zone.npcs!.find((n) => n.name === 'Quartermaster Dace')).toMatchObject({ side: 'neutral', at: 'C3', tags: ['job_board'] });
    expect(missionBrief(g)).toMatch(/job board: Quartermaster Dace/);
  });
});

it('memory facts from before the act stay out of its key choices', () => {
  let g = atRampLocal();
  applyMemOp(g, { op: 'fact', text: 'Old news.', importance: 5 });
  memoryOf(g).facts.at(-1)!.scene = -1;
  g = turn(g, { missions: [{ mission: 'the_ramp', objective: 'get_aboard', status: 'done' }] });
  expect(missionsOf(g)!.ending!.choices).not.toContain('Old news.');
  function atRampLocal() { return turn(started(), { missions: [{ mission: 'the_shield_line', status: 'done' }] }); }
});

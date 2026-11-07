// OOC, missions and end states in the Narrator's context (spec: OOC, missions and end states).
import { describe, expect, it } from 'vitest';
import { ARCHETYPES, apply, newGame, type GameState, type NarratorTurn } from '@engine';
import { RULES_PROMPT, campaignPrompt, turnPrompt, submitTool } from './context';

const sheet = (name: string): any => { const a = ARCHETYPES[0]; return { name, portrait: '', origin: 'Thousand-Planet frontier', kit: 'medic', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} }; };
const turn = (g: GameState, t: Partial<NarratorTurn>) => apply(g, { type: 'narrator/turn', turn: { narration: 'On.', ...t } as NarratorTurn }, 'host');
function started() {
  let g = newGame('CTX1', { id: 'host', name: 'Leon' }, 'ctx');
  g = apply(g, { type: 'player/join', id: 'p2', name: 'Kim' }, 'host');
  g = apply(g, { type: 'char/add', sheet: sheet('MPAT') }, 'host');
  g = apply(g, { type: 'char/add', sheet: sheet('Rook') }, 'p2');
  g = apply(g, { type: 'session/start' }, 'host');
  return turn(g, { sceneTitle: 'The shield line' });
}
const ask = (g: GameState) => { g.story.await = 'narrator'; g.story.work = { kind: 'round' }; return g; };

describe('the Narrator\'s context', () => {
  it('the rules carry the OOC and pacing sections', () => {
    expect(RULES_PROMPT).toMatch(/OUT OF CHARACTER \(OOC\)/);
    expect(RULES_PROMPT).toMatch(/MISSIONS AND PACING/);
    expect(RULES_PROMPT).toMatch(/give options, not answers/);
  });
  it('the cached campaign block carries every mission with done_when; the turn only the live MISSION block', () => {
    const g = ask(started());
    expect(campaignPrompt(g)).toMatch(/MISSIONS \(the players see[\s\S]*get_aboard: Get the wounded aboard\. Done when:/);
    const p = turnPrompt(g);
    expect(p).toMatch(/MISSION \(active; mark objectives in missions\[\] when achieved\):\nthe_shield_line: Get the wounded line/);
    expect(p).not.toMatch(/Done when/);
  });
  it('OOC questions come in their own block, by character name, never in the transcript', () => {
    let g = started();
    g = apply(g, { type: 'story/speak', text: '[OOC] Quest complete, now what?' }, 'p2');
    const p = turnPrompt(ask(g));
    expect(p).toMatch(/OUT-OF-CHARACTER QUESTIONS[^\n]*\n- Rook: Quest complete, now what\?/);
    expect(p.split('RECENT TRANSCRIPT')[1].split('YOUR JOB NOW')[0]).not.toMatch(/Quest complete/);
    expect(p).not.toMatch(/Kim/); // the Narrator never learns a player's name
  });
  it('an act end tells the next turn to open the next mission; the campaign end asks for the epilogue', () => {
    let g = started();
    g = turn(g, { missions: [{ mission: 'the_shield_line', status: 'done' }] });
    g = turn(g, { missions: [{ mission: 'the_ramp', objective: 'get_aboard', status: 'done' }], missionNext: 'the_crossing' });
    expect(turnPrompt(ask(g))).toMatch(/ACT ENDED: open the next mission The Crossing/);
    g = turn(g, { missions: [{ mission: 'the_crossing', status: 'done' }] });
    g = turn(g, { missions: [{ mission: 'the_demand', status: 'done' }] });
    expect(g.story.work).toEqual({ kind: 'epilogue' });
    expect(turnPrompt(g)).toMatch(/YOUR JOB NOW: THE CAMPAIGN HAS ENDED/);
  });
  it('the new tool fields are optional and the tool stays the same all session (the cache holds)', () => {
    let g = started();
    const before = JSON.stringify(submitTool(g));
    const s: any = submitTool(g).input_schema;
    for (const f of ['ooc', 'missions', 'missionNext', 'side']) { expect(s.properties[f]).toBeTruthy(); expect(s.required).not.toContain(f); }
    g = turn(g, { missions: [{ mission: 'the_shield_line', status: 'done' }] });
    expect(JSON.stringify(submitTool(g))).toBe(before);
  });
});

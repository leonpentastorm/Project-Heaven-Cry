// The Narrator's craft: the CRAFT, PACING and MAP IS THE TRUTH blocks, and the engine-side checks after each turn
// (named but unplaced, moved but unmoved, the repeat window). docs/design/handoffs/narrator-craft-HANDOFF.md
import { beforeEach, describe, expect, it } from 'vitest';
import { apply, newGame, ARCHETYPES, npcsOf, type GameState, type NarratorTurn } from '@engine';
import { RULES_PROMPT, CRAFT, PACING, MAP_TRUTH, turnPrompt, submitTool } from './context';
import { rememberTurn, forgetTurns, lastTurnAudit, recentNarrationBlock, namedPeople, movedInProse, repeatedPhrases, repeatedOpeners } from './craft';

const sheet = (name: string): any => { const a = ARCHETYPES[0]; return { name, portrait: '', origin: 'Thousand-Planet frontier', kit: 'medic', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} }; };
function started(): GameState {
  let g = newGame('CRAFT1', { id: 'host', name: 'Host' }, 'craft');
  g = apply(g, { type: 'player/join', id: 'p2', name: 'Guest' }, 'host');
  g = apply(g, { type: 'char/add', sheet: sheet('MPAT') }, 'host');
  g = apply(g, { type: 'char/add', sheet: sheet('Rook') }, 'p2');
  return apply(g, { type: 'session/start' }, 'host');
}
/** A Narrator turn as a provider hands it in: remembered first (on the state it was asked on), then applied. */
const narrate = (g: GameState, t: Partial<NarratorTurn>) => { const turn = { narration: 'On.', ...t } as NarratorTurn; rememberTurn(g, turn); return apply(g, { type: 'narrator/turn', turn }, 'host'); };
const ask = (g: GameState) => { g.story.await = 'narrator'; g.story.work = { kind: 'round' }; return g; };
const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

beforeEach(() => forgetTurns());

describe('the craft blocks in the rules', () => {
  it('CRAFT comes first, then PACING, then the mechanics; the map checklist closes the rules', () => {
    const i = (x: string) => RULES_PROMPT.indexOf(x);
    expect(i('CRAFT (how you tell it)')).toBeGreaterThan(0);
    expect(i('CRAFT (how you tell it)')).toBeLessThan(i('PACING (stage discipline)'));
    expect(i('PACING (stage discipline)')).toBeLessThan(i('THE SPLIT'));
    expect(RULES_PROMPT.trim().endsWith(MAP_TRUTH)).toBe(true);
  });
  it('CRAFT is tight (about 350 words) and says the things Leon asked for', () => {
    expect(words(CRAFT)).toBeLessThan(420);
    for (const x of ['Never recap', 'Never repeat yourself', 'People speak', 'the air is thick with', 'suddenly', 'Never "What do you do?"', '40 to 120 words', '220 at most', 'Bad (M813)', 'Good:']) expect(CRAFT).toContain(x);
    expect(PACING).toMatch(/one beat per turn/); expect(PACING).toMatch(/Never skip a beat, jump time/); expect(PACING).toMatch(/don't advance for them/);
    expect(RULES_PROMPT).not.toMatch(/move the story toward them/);
    expect(RULES_PROMPT).toMatch(/The Unspoken Name/);
  });
  it('the submit_turn tool repeats the map checklist', () => {
    expect(submitTool(started()).description).toContain(MAP_TRUTH);
    expect(MAP_TRUTH).toMatch(/1\. Every person you name or who speaks is on the map/);
  });
});

describe('the repeat window', () => {
  it('the turn carries the last two narrations as RECENT NARRATION, and the transcript points to them', () => {
    let g = started();
    g = narrate(g, { narration: 'One: the guns stop.', sceneTitle: 'The shield line' });
    g = narrate(g, { narration: 'Two: Nine-Nine coughs static.' });
    g = narrate(g, { narration: 'Three: the drones turn.' });
    const p = turnPrompt(ask(g));
    expect(p).toMatch(/RECENT NARRATION \(already said, don't repeat/);
    expect(p).toContain('[1 of 2] Two: Nine-Nine coughs static.'); expect(p).toContain('[2 of 2, your last turn] Three: the drones turn.');
    const tr = p.split('RECENT TRANSCRIPT')[1].split('RECENT NARRATION (already')[0];
    expect(tr).toContain('[Narrator] One: the guns stop.');
    expect(tr).not.toContain('Two: Nine-Nine'); expect(tr.match(/\(in RECENT NARRATION below\)/g)!.length).toBe(2);
  });
  it('phrases and openings repeated across the last three turns are named', () => {
    const t = ['East, the engines climb another half note. MPAT, you crouch.', 'MPAT, you kneel. East, the engines climb again.', 'Rook waits. East, the engines climb another half note.'];
    expect(repeatedPhrases(t)).toContain('east the engines climb');
    expect(repeatedOpeners(t)).toEqual(expect.arrayContaining(['east the', 'mpat you']));
    let g = started();
    for (const n of t) g = narrate(g, { narration: n });
    const b = recentNarrationBlock(g);
    expect(b).toMatch(/REPEATED ACROSS YOUR LAST TURNS \(retire these\): "east the engines climb/);
    expect(b).toMatch(/OPENINGS YOU KEEP USING/);
  });
});

describe('named but unplaced', () => {
  it('a titled name or a quoted speaker with no token is flagged in the next turn', () => {
    let g = started();
    g = narrate(g, { narration: '"Hold the ramp," says Chief Engineer Keel. Corporal Four-Four is still looping its squad number at E7.' });
    const a = lastTurnAudit(g);
    expect(a).toMatch(/^LAST TURN/);
    expect(a).toMatch(/you named Chief Engineer Keel but didn't place them; place them now/);
    expect(a).toMatch(/you named Corporal Four-Four/);
    expect(turnPrompt(ask(g))).toContain('LAST TURN (the map is the truth');
  });
  it('a cast member who acts in the prose needs a token; one placed, a POI named for them, or a name inside dialogue does not', () => {
    let g = started();
    g = narrate(g, { narration: 'Seven-Seven counts out loud. Lantern holds its chest shut. Sergeant Nine-Nine coughs. "Tell the Colonel," he says.',
      npcs: [{ action: 'place', name: 'Lantern', side: 'neutral', tier: 'minion', weapon: 'fists', at: 'L7' }] });
    const a = lastTurnAudit(g);
    expect(a).toMatch(/you named Seven-Seven/);
    expect(a).not.toMatch(/Lantern|Nine-Nine|Colonel/); // placed now; a POI on the shield line; only in dialogue
  });
  it('the characters are never flagged, and a clean turn adds nothing', () => {
    let g = started();
    g = narrate(g, { narration: 'MPAT and Rook stand in the smoke. Sergeant Nine-Nine waits.' });
    expect(lastTurnAudit(g)).toBe('');
    expect(namedPeople(g, 'MPAT nods to Rook.')).toEqual([]);
  });
});

describe('moved but unmoved', () => {
  it('a token that walks in the prose without an npcs[] move is flagged; with one it is not', () => {
    let g = started();
    g = narrate(g, { narration: 'A quiet start.', npcs: [{ action: 'place', name: 'Ilse Varga', side: 'neutral', tier: 'minion', weapon: 'fists', at: 'L7' }] });
    g = narrate(g, { narration: 'Ilse Varga walks to the radio and picks it up.' });
    expect(lastTurnAudit(g)).toMatch(/your prose moved Ilse Varga \("Ilse Varga walks"\) but the map didn't; move them with npcs\[\] move/);
    const id = npcsOf(g).find((n) => n.name === 'Ilse Varga')!.id;
    g = narrate(g, { narration: 'Ilse Varga walks back to the stakes.', npcs: [{ action: 'move', id, at: 'K6' }] });
    expect(lastTurnAudit(g)).toBe('');
  });
  it('a character the prose moves needs moves[] or a move action; a hand that moves is not a person moving', () => {
    let g = started();
    const mpat = Object.values(g.characters).find((c) => c.name === 'MPAT')!;
    g = narrate(g, { narration: 'MPAT, you step over the stakes into no-man\'s-land.' });
    expect(lastTurnAudit(g)).toMatch(/your prose moved MPAT .* move them with moves\[\]/);
    g = narrate(g, { narration: 'MPAT, you step over the stakes.', moves: [{ charId: mpat.id, to: 'F5' }] });
    expect(lastTurnAudit(g)).toBe('');
    expect(movedInProse(g, "Keel's hand moves to his holster.", ['Keel'])).toEqual([]);
  });
  it('without the remembered turn (a reload, a reroll) the movement check stays quiet', () => {
    let g = started();
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'MPAT, you step over the stakes.' } as NarratorTurn }, 'host');
    expect(lastTurnAudit(g)).toBe('');
  });
});

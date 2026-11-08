// The Narrator's per-call size on the M813 opening and a few rounds in (callEstimate, Opus 5.5): the craft blocks must
// keep per-turn growth small (docs/design/handoffs/narrator-craft-HANDOFF.md).
import { describe, expect, it } from 'vitest';
import { apply, newGame, ARCHETYPES, type GameState, type NarratorTurn } from '@engine';
import { callEstimate } from './anthropic';

const sheet = (name: string, a: any): any => ({ name, portrait: '', origin: 'Thousand-Planet frontier', kit: 'medic', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} });
const LONG = 'Smoke lies low over the stakes and the black hole hangs above it like a held breath. '.repeat(9);
export function midSession(): GameState {
  let g = newGame('COST01', { id: 'host', name: 'Host' }, 'cost');
  g = apply(g, { type: 'player/join', id: 'p2', name: 'Guest' }, 'host');
  g = apply(g, { type: 'char/add', sheet: sheet('MPAT', ARCHETYPES[0]) }, 'host');
  g = apply(g, { type: 'char/add', sheet: sheet('Rook', ARCHETYPES[3]) }, 'p2');
  g = apply(g, { type: 'session/start' }, 'host');
  for (let i = 0; i < 4; i++) {
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'Turn ' + i + '. ' + LONG, sceneTitle: i ? '' : 'The shield line' } as NarratorTurn }, 'host');
    g = apply(g, { type: 'story/speak', text: 'I check on Sergeant Nine-Nine and ask what he needs.' }, 'host');
    g = apply(g, { type: 'story/speak', text: 'I kneel by the one that is counting.' }, 'p2');
    g.story.await = 'players'; g.story.spoken = {};
  }
  g.story.await = 'narrator'; g.story.work = { kind: 'round' };
  return g;
}

describe('Narrator call size', () => {
  it('reports the stable and per-turn tokens a few rounds in', () => {
    const e = callEstimate(midSession(), 'claude-opus-5-5');
    console.log('M813 mid-session call (Opus 5.5): stable', e.stable, 'tokens, turn', e.turn, 'tokens; warm $' + e.warmUsd.toFixed(4), 'worst $' + e.worstUsd.toFixed(4));
    expect(e.turn).toBeLessThan(9000);
  });
});

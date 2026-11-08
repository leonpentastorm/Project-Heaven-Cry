// Blessing 2.0 in the Narrator's context: the FAITH rules, each character's faith clause, the faith ops in submit_turn
// (patrons and patronMood are gone), a patron's rites through wiki_lookup, and the cost change (handoff: +238 stable).
import { describe, expect, it } from 'vitest';
import { apply, newGame, ARCHETYPES, type GameState } from '@engine';
import { callEstimate } from './anthropic';
import { RULES_PROMPT, partyPrompt, submitTool, wikiAnswer, faithBrief } from './context';

function party(): GameState {
  let g: GameState = newGame('FC', { id: 'p1', name: 'Host' }, 'long');
  const a: any = ARCHETYPES.find((x: any) => x.id === 'confessor');
  const sheet = (name: string, belief: any) => ({ name, portrait: '', origin: 'Thousand-Planet frontier', kit: 'medic', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, belief });
  g = apply(g, { type: 'char/add', sheet: sheet('Vess', { kind: 'faithful', patron: 'mother_ember' }) as any }, 'p1');
  g = apply(g, { type: 'char/add', sheet: sheet('Kade', { kind: 'atheist' }) as any }, 'p1');
  return apply(g, { type: 'session/start' }, 'p1');
}
describe('the Narrator and faith', () => {
  it('the rules carry a short FAITH block and no patron mood', () => {
    expect(RULES_PROMPT).toMatch(/FAITH \(rules 1\.6\)/);
    expect(RULES_PROMPT).toMatch(/Never write a patron's words/);
    expect(RULES_PROMPT).not.toMatch(/patronMood/);
  });
  it('each character carries a faith clause: belief, Devotion, Faith (and an Atheist with Faith)', () => {
    const g = party(), [v, k] = Object.values(g.characters);
    expect(faithBrief(v)).toBe('faith: Faithful to mother_ember, Devotion 3/10, Faith 4');
    expect(faithBrief(k)).toBe('faith: Atheist, Faith 4');
    expect(partyPrompt(g)).toMatch(/Faithful to mother_ember/);
  });
  it('submit_turn has the faith ops; patrons and patronMood are gone', () => {
    const t = submitTool(party()), P = t.input_schema.properties;
    expect(P.faith).toBeTruthy(); expect(P.patrons).toBeUndefined(); expect(P.patronMood).toBeUndefined();
    expect(JSON.stringify(P.faith)).toMatch(/pact, piece, devotion, rite_kept or apostasy/);
  });
  it('wiki_lookup patron:<id> gives likes, taboos and the rites, saying whose each rite is', () => {
    const w = wikiAnswer(['patron:mother_ember']);
    expect(w).toMatch(/Likes:/); expect(w).toMatch(/Rites/); expect(w).toMatch(/a player button|yours: faith rite_kept/);
  });
  // +1.2k cached tokens for CRAFT, PACING and THE MAP IS THE TRUTH (narrator-craft, Nov 2026): about $0.0002 a warm turn.
  it('the cost stays put (stable about 24k tokens for this party; World Play, rules 1.7, added about 1.5k)', () => {
    const e = callEstimate(party(), 'claude-sonnet-5-5');
    expect(e.stable).toBeLessThan(24400);
  });
});

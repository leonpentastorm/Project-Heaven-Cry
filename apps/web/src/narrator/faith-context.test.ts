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
    expect(RULES_PROMPT).toMatch(/FAITH \(rules 1\.6\.1\)/);
    // Rules 1.6.1: the devotion op moves XP in the Narrator's range, gains capped a session; tags capped by the engine;
    // a pact from another patron is a switch; apostasy has the cooldown; the days field.
    expect(RULES_PROMPT).toMatch(/devotion \(Devotion XP, -6 to \+5, with a reason: a deed the tags miss \+2 to \+5/);
    expect(RULES_PROMPT).toMatch(/gains stop at \+10 a session per character/); expect(RULES_PROMPT).toMatch(/tags, capped/);
    expect(RULES_PROMPT).toMatch(/a switch from another patron/); expect(RULES_PROMPT).toMatch(/no pact for 90 days/);
    expect(RULES_PROMPT).toMatch(/days \(days that pass, 1 to 3650/); expect(RULES_PROMPT).not.toMatch(/±1 or ±2/);
    expect(RULES_PROMPT).toMatch(/Never write a patron's words/);
    // Rules 1.6.2: the Miracle's gate and price, in one clause.
    expect(RULES_PROMPT).toMatch(/Miracles \(Faith 7 and Devotion 10, once a session; each lowers Devotion by 5 levels\)/);
    expect(RULES_PROMPT).not.toMatch(/patronMood/);
    // Rules 1.6.3: Witnessed lasts the fight (the engine runs it; the Narrator only needs to know how long).
    expect(RULES_PROMPT).toMatch(/Witnessed \(from a Hymn until the fight ends or the patron intervenes\)/);
  });
  it('each character carries a faith clause: belief, Devotion, Faith (and an Atheist with Faith)', () => {
    const g = party(), [v, k] = Object.values(g.characters);
    expect(faithBrief(v)).toBe('faith: Faithful to mother_ember, Devotion 3/10 (45 XP), Faith 4');
    expect(faithBrief(k)).toBe('faith: Atheist, Faith 4');
    expect(partyPrompt(g)).toMatch(/Faithful to mother_ember/);
  });
  it('with the game, the clause adds what limits the ops: the Narrator\'s gains used, a grudge, the pact cooldown', () => {
    let g = party(); const [v, k] = Object.values(g.characters);
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'She carries the child out.', faith: [{ charId: v.id, op: 'devotion', delta: 4, reason: 'a deed' }] } } as any, 'p1');
    expect(faithBrief(g.characters[v.id], g)).toMatch(/Devotion 3\/10 \(49 XP\), Faith 4, your devotion gains 4\/10 this session$/);
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'He swears.', faith: [{ charId: k.id, op: 'pact', patron: 'mother_ember' }] } } as any, 'p1');
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'He walks away.', faith: [{ charId: k.id, op: 'apostasy' }] } } as any, 'p1');
    expect(faithBrief(g.characters[k.id], g)).toMatch(/^faith: Atheist, Faith 4.*, no pact for 90 days$/);
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'A month on the road.', days: 30 } } as any, 'p1');
    expect(faithBrief(g.characters[k.id], g)).toMatch(/no pact for 60 days$/);
    // Nerukhan is Jealous: leaving him for another always leaves a grudge.
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'She kneels to the judge.', faith: [{ charId: v.id, op: 'pact', patron: 'nerukhan' }] } } as any, 'p1');
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'She turns to the storm.', faith: [{ charId: v.id, op: 'pact', patron: 'old_overcast' }] } } as any, 'p1');
    expect(faithBrief(g.characters[v.id], g)).toMatch(/^faith: Faithful to old_overcast.*, grudge of nerukhan \(3 more sessions\)$/);
  });
  it('submit_turn has the faith ops; patrons and patronMood are gone', () => {
    const t = submitTool(party()), P = t.input_schema.properties;
    expect(P.faith).toBeTruthy(); expect(P.patrons).toBeUndefined(); expect(P.patronMood).toBeUndefined();
    expect(JSON.stringify(P.faith)).toMatch(/pact, piece, devotion, rite_kept or apostasy/);
    expect(JSON.stringify(P.faith)).toMatch(/devotion: Devotion XP, -6 to 5/); expect(JSON.stringify(P.faith)).not.toMatch(/-2 to 2/);
    expect(P.days).toMatchObject({ type: 'integer' }); expect(P.days.enum).toBeUndefined(); expect(t.input_schema.required).not.toContain('days');
  });
  it('wiki_lookup patron:<id> gives likes, taboos and the rites, saying whose each rite is', () => {
    const w = wikiAnswer(['patron:mother_ember']);
    expect(w).toMatch(/Likes:/); expect(w).toMatch(/Rites/); expect(w).toMatch(/a player button|yours: faith rite_kept/);
  });
  // +1.2k cached tokens for CRAFT, PACING and THE MAP IS THE TRUTH (narrator-craft, Nov 2026): about $0.0002 a warm turn.
  it('the cost stays put (stable about 24k tokens for this party; World Play, rules 1.7, added about 1.5k)', () => {
    const e = callEstimate(party(), 'claude-sonnet-5-5');
    // Outburst 4.0 (rules 1.8) and World Play 1.1 (rules 1.9: piles, ground[], drops) brought it to about 24.6k: cached, so
    // about $0.00005 more a warm turn.
    // Sigil 1.5 / Outburst 4.0 in actions[] (a pump's feeling, a draw's stroke, revert; merge review, 9 Nov 2026) brought
    // it to about 25.04k from 24.98k: the cap moves to 25.1k on purpose.
    // Physical 2.0 (rules 1.12): the WEAPON TECHNIQUES paragraph and each character's ready techniques, about 0.15k:
    // the cap moves to 25.3k on purpose.
    // Legendary Deeds (item 1006): the legends[] field and its line, about 0.07k: the cap moves to 25.4k on purpose.
    // Speaking in a fight (rules 1.14): the FIGHTS line now says speech is free and attempts are answered inside the
    // fight, about 0.07k: the cap moves to 25.5k on purpose.
    // Enemy levels (rules 1.15): the Vermin tier, the level_shift field and its line, about 0.05k after cutting the
    // tier line: the cap moves to 25.6k on purpose.
    // Classes 3.0 (rules 1.29): the longer class names in the class line and the Bulwark's and Breaker's sentences on
    // Brace and Lunge, a few tokens: the cap moves to 25.7k on purpose.
    expect(e.stable).toBeLessThan(25700);
  });
});

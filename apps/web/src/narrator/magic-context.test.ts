// Sigil magic, rules revision 1.4, in the Narrator's context (spec: Mana, "Sigil magic"; The Narrator's wiki): the
// MAGIC section carries the words by group and the grammar in a few lines; the action schema carries the 1.4 Evoke
// options; PARTY CONDITION lists the Sigil magic standing on the map; the wiki answers the details.
import { describe, expect, it } from 'vitest';
import { ARCHETYPES, apply, newGame, positionsOf, SIGIL, type GameState } from '@engine';
import { RULES_PROMPT, turnPrompt, submitTool, wikiAnswer, sigilsOnMap } from './context';

const arch = ARCHETYPES.find((a: any) => a.id === 'sigilist')!;
const sheet = (name: string, sigils: string[]): any => ({ name, portrait: '', origin: 'Central City', kit: 'sigil', traits: [], skills: { ...arch.preset }, attrs: { ...arch.attributes }, cores: { ...arch.cores }, identity: {}, sigils });
function started(): { g: GameState; id: string } {
  let g = newGame('SIG14', { id: 'host', name: 'Leon' }, 'sig14ctx');
  g = apply(g, { type: 'char/add', sheet: sheet('Ilse', ['spark', 'seek']) }, 'host');
  g.characters[Object.keys(g.characters)[0]].sigils!.push('wait'); // learned in play
  g = apply(g, { type: 'session/start' }, 'host');
  g = apply(g, { type: 'narrator/turn', turn: { narration: 'Open.', sceneTitle: 'The yard' } as any }, 'host');
  return { g, id: Object.keys(g.characters)[0] };
}

describe('MAGIC in the rules prompt (1.4)', () => {
  it('lists all 40 words by group, once', () => {
    const line = RULES_PROMPT.split('\n').find((l) => l.startsWith('- Sigil magic'))!;
    for (const w of Object.values(SIGIL) as any[]) expect(line, w.id).toMatch(new RegExp('\\b' + w.word + '\\b'));
    expect(line).toMatch(/Subject FIRE .* MASK; Reach SEEK ARC SENSE RELAY; Delivery STAY .* LEECH; Burst CONDENSE SPREAD PUSH; Filter KIN/);
    expect(RULES_PROMPT).not.toMatch(/- Sigil words: /); // the wiki index no longer repeats the list
  });
  it('the grammar in one line; no 1.2 shapes or words', () => {
    expect(RULES_PROMPT).toMatch(/A spell is a Line of 2 to 4 glyphs: a Subject and another word, at most one Reach word/);
    expect(RULES_PROMPT).toMatch(/from an end it fires along, from beside it across/);
    expect(RULES_PROMPT).toMatch(/unless KIN/);
    expect(RULES_PROMPT).toMatch(/sigil:grammar/);
    expect(RULES_PROMPT).toMatch(/cyan, square, snapping/);
    expect(RULES_PROMPT).not.toMatch(/Ring: around|Stack: 2 on one tile|SHIELD…|RETURN/);
  });
  it('the action schema: draw on your own tile; evoke with aims, dest and a COMMAND order', () => {
    const items = submitTool(started().g).input_schema.properties.actions.items;
    expect(items.properties.word.description).toMatch(/own tile/);
    expect(items.properties.aims.type).toBe('array');
    expect(items.properties.dest.description).toMatch(/STEP/);
    expect(items.properties.order.enum).toEqual(['halt', 'kneel', 'drop', 'move']);
    expect(items.properties.orderTo.type).toBe('string');
  });
  it('the wiki answers a word with its group and the grammar entry', () => {
    const a = wikiAnswer(['sigil:arc', 'sigil:grammar']);
    expect(a).toMatch(/\[sigil:arc\] ARC \(Sigil word, reach;/);
    expect(a).toMatch(/\[sigil:grammar\] How Sigil words make a spell/);
  });
});

describe('Sigils on the map, in PARTY CONDITION', () => {
  it('nothing when nothing stands; glyphs and a trap once drawn and evoked', () => {
    let { g, id } = started();
    expect(sigilsOnMap(g)).toBe('');
    const at = positionsOf(g)[id], [x, y] = at.split(',').map(Number), next = (x + 1) + ',' + y;
    g = apply(g, { type: 'world/act', charId: id, act: 'draw', word: 'spark' }, 'host');
    expect(sigilsOnMap(g)).toMatch(/Ilse's glyphs SPARK [A-Z]+\d+/);
    g = apply(g, { type: 'world/act', charId: id, act: 'move', to: next, how: 'move' }, 'host');
    g = apply(g, { type: 'world/act', charId: id, act: 'draw', word: 'wait' }, 'host');
    g = apply(g, { type: 'world/act', charId: id, act: 'evoke', tile: next, aim: (x - 1) + ',' + y }, 'host'); // a finished Line fires back the way she walked (Touch: 1 tile)
    expect(g.story.zones!.some((z: any) => z.kind === 'trap')).toBe(true);
    expect(sigilsOnMap(g)).toMatch(/Ilse's trap SPARK·WAIT|Ilse's trap WAIT·SPARK/);
    g.story.await = 'narrator'; g.story.work = { kind: 'round' } as any;
    expect(turnPrompt(g)).toMatch(/Sigils on the map: .*trap/);
    (g.story.zones![0] as any).side = 'foe';
    expect(sigilsOnMap(g)).toMatch(/\(unseen by the players\)/);
  });
});

// The Narrator's side of Sigil magic, rules revision 1.4 (spec: The Narrator's wiki; Mana, "Sigil magic"): a wiki entry
// for every one of the 40 words with its group, one grammar entry, teaching new words through the story, and the
// spell actions the Narrator maps from players' words (draw on your own tile, walk, draw again).
import { describe, expect, it } from 'vitest';
import { ARCHETYPES, apply, newGame, positionsOf, wikiLookup, wikiKinds, wikiEntries, SIGIL, type Sheet, type GameState } from '../src';
import sigilsJ from '../../../data/sigils.json';

const WORDS = (sigilsJ as any).items as any[];
const arch = (id: string) => ARCHETYPES.find((a: any) => a.id === id)!;
const sheet = (name: string, extra: Partial<Sheet> = {}): Sheet => { const a = arch('sigilist'); return { name, portrait: '', origin: 'Central City', kit: 'sigil', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {}, ...extra }; };
const room = (seed: string, words = ['spark', 'seek']) => {
  let g: GameState = newGame('ROOM', { id: 'host', name: 'Leon' }, seed);
  g = apply(g, { type: 'char/add', sheet: sheet('Ilse', { sigils: words }) }, 'host');
  g = apply(g, { type: 'session/start' }, 'host');
  g = apply(g, { type: 'narrator/turn', turn: { narration: 'Open.' } as any }, 'host');
  return { g, id: Object.keys(g.characters)[0] };
};

describe('the wiki knows every 1.4 Sigil word', () => {
  it('40 entries, one per word in the data, each naming its group', () => {
    expect(WORDS.length).toBe(40);
    expect(wikiKinds().sigil.sort()).toEqual(WORDS.map((w) => w.id).sort());
    const label: Record<string, RegExp> = { subject: /Subject, (element|affliction|boon|working)/, reach: /reach;/, delivery: /delivery;/, burst: /burst;/, filter: /filter;/ };
    for (const w of WORDS) {
      const e = wikiLookup('sigil:' + w.id)!; expect(e, w.id).toBeTruthy();
      expect(e.name).toBe(w.word); expect(e.text).toMatch(label[w.group]); expect(e.text).toContain(w.text);
    }
  });
  it('element words carry their look and sound; KIN says it takes one copy; the new words are there', () => {
    expect(wikiLookup('sigil:fire')!.text).toContain('Looks: ' + (sigilsJ as any).elements.fire.look);
    expect(wikiLookup('sigil:acid')!.text).toMatch(/Sounds: /);
    expect(wikiLookup('sigil:bind')!.text).not.toMatch(/Looks: /);
    expect(wikiLookup('sigil:kin')!.text).toMatch(/one copy a spell/);
    for (const id of ['acid', 'command', 'quicken', 'sharpen', 'cleanse', 'step', 'mask', 'arc', 'sense', 'relay', 'twice', 'pull', 'wait', 'watch', 'chain', 'leech']) expect(wikiLookup('sigil:' + id), id).toBeTruthy();
    expect(wikiLookup('sigil:return')).toBeNull(); // retired in 1.4
    expect(wikiLookup('sigil:FIRE')!.key).toBe('sigil:fire'); // by name, as the Narrator may write it
  });
  it('sigil:grammar has every word by group and the core rules, and stays out of the word list', () => {
    const e = wikiLookup('sigil:grammar')!;
    for (const w of WORDS) expect(e.text).toContain(w.word);
    expect(e.text).toMatch(/Reach: SEEK, ARC, SENSE, RELAY\./);
    expect(e.text).toMatch(/2 to 4 glyphs/); expect(e.text).toMatch(/own tile/); expect(e.text).toMatch(/along the Line/); expect(e.text).toMatch(/unless KIN/);
    expect(e.text).toMatch(/one of them a Reach word/);
    expect(wikiKinds().sigil).not.toContain('grammar');
    expect(wikiEntries().filter((x) => x.key.startsWith('sigil:')).length).toBe(41);
  });
});

describe('the Narrator teaches 1.4 words (magic[])', () => {
  it('a new word is learned, written as drawn or as an id; a retired or unknown word is not', () => {
    let { g, id } = room('teach14');
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'The old scribe shows her the corrosion stroke.', magic: [{ charId: id, word: 'ACID', reason: 'the old scribe' }] } as any }, 'host');
    expect(g.characters[id].sigils).toContain('acid');
    expect(g.story.entries.some((x) => /learns the Sigil word ACID/.test(x.text))).toBe(true);
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'A plate.', magic: [{ charId: id, word: 'return', reason: 'a plate' }, { charId: id, word: 'shield', reason: 'a plate' }] } as any }, 'host');
    expect(g.characters[id].sigils).not.toContain('return'); expect(g.characters[id].sigils).not.toContain('shield');
    // Rules 1.9 (item 684): a Narrator grant is a bonus source and takes the scene's one new thing. A second word in the
    // same scene is not learned: it goes on the known-to-study list (and the log says so); in a new scene it lands.
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'A turret plate.', magic: [{ charId: id, word: 'watch', reason: 'a plate' }] } as any }, 'host');
    expect(g.characters[id].sigils).not.toContain('watch'); expect((g.characters[id] as any).sigilGrowth.toStudy).toContain('watch');
    expect(g.story.entries.some((x) => /glimpses the Sigil word WATCH .*learned something new this scene already.*known-to-study/.test(x.text))).toBe(true);
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'Later, at the workbench.', sceneTitle: 'The workbench', magic: [{ charId: id, word: 'watch', reason: 'a plate' }] } as any }, 'host');
    expect(g.characters[id].sigils).toContain('watch'); expect(SIGIL.watch.group).toBe('delivery');
    expect((g.characters[id] as any).sigilGrowth.toStudy).not.toContain('watch');
  });
});

describe('the Narrator maps spell words to 1.4 actions', () => {
  it('"I draw SPARK, step east and draw SEEK": draws on the caster\'s own tile each time, a Line on the map', () => {
    let { g, id } = room('draw14');
    const at = positionsOf(g)[id], [x, y] = at.split(',').map(Number), next = (x + 1) + ',' + y;
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'Ilse writes.', actions: [{ charId: id, act: 'draw', word: 'spark' }, { charId: id, act: 'move', to: next }, { charId: id, act: 'draw', word: 'seek' }] } as any }, 'host');
    const mine = (g.story.glyphs || []).filter((gl) => gl.side === 'pc');
    expect(mine.map((gl) => gl.word)).toEqual(['spark', 'seek']);
    expect(mine.map((gl) => gl.pos)).toEqual([at, next]);
  });
  it('a draw on someone else\'s tile is refused and reported, not done', () => {
    let { g, id } = room('draw14b');
    const at = positionsOf(g)[id], [x, y] = at.split(',').map(Number);
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'Ilse writes.', actions: [{ charId: id, act: 'draw', word: 'spark', tile: (x + 3) + ',' + y }] } as any }, 'host');
    expect((g.story.glyphs || []).length).toBe(0);
    expect(g.story.entries.at(-1)!.text).toMatch(/^Ilse can't draw/);
  });
});

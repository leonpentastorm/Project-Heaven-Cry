// @vitest-environment jsdom
// A hostile caster's turn is one engine step (ai-sigil.ts castChoice: draw, walk, draw, Evoke), so the state that
// arrives has its Line gone already. The glyphs must still lie on their tiles on screen from their draw until the Evoke
// plays (fx/play.ts fxShownGlyphs), through the walk and an opportunity attack in between (Leon's playtest of 0.22.0:
// "the sigil next to me on the tile they got Op attack vanish").
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearFx, fxShownGlyphs, shownGlyphs, queueFx, setProcessed } from './play';
import { setLayer } from './dom';

/** The effects of the engine's own run of that turn (packages/engine/test/sigil-oa-glyph.test.ts pins their order). */
const casterTurn = (): any[] => [
  { n: 1, k: 'draw', unit: 'foe-0', at: '6,5', tile: '6,5', word: 'spread', side: 'foe', stroke: 'sgl1', L: 1 },
  { n: 2, k: 'move', unit: 'foe-0', path: ['6,5', '7,5'], L: 2 },
  { n: 3, k: 'melee', unit: 'p1', target: 'foe-0', at: '5,5', to: '6,5', hit: true, L: 3 },
  { n: 4, k: 'draw', unit: 'foe-0', at: '7,5', tile: '7,5', word: 'step', side: 'foe', stroke: 'sgl1', L: 5 },
  { n: 5, k: 'evoke', unit: 'foe-0', at: '7,5', shape: 'line', tiles: ['6,5', '7,5'], words: ['spread', 'step'], side: 'foe', missiles: [], L: 6 },
];
const tilesOf = (l: any[]) => l.map((x) => x.pos).sort().join(' ');

describe('glyphs follow the effects (shownGlyphs)', () => {
  it('a glyph drawn and Evoked in one step shows from its draw until the Evoke plays', () => {
    const fx = casterTurn(), upTo = (done: number) => shownGlyphs(fx, (e) => e.n > done);
    expect(upTo(0)).toEqual([]); // nothing has played: not drawn yet
    expect(tilesOf(upTo(1))).toBe('6,5'); // drawn
    expect(tilesOf(upTo(2))).toBe('6,5'); // the caster walks off it
    expect(tilesOf(upTo(3)), 'the opportunity attack has played: the glyph is still there').toBe('6,5');
    expect(tilesOf(upTo(4))).toBe('6,5 7,5');
    expect(upTo(4).map((x) => [x.word, x.side, x.strokeId])).toEqual([['spread', 'foe', 'sgl1'], ['step', 'foe', 'sgl1']]);
    expect(upTo(5), 'Evoked: used up').toEqual([]);
  });
  it('a fade takes only its own word; a Grand Sigil over the tile takes nothing; an old Line on the tile does not come back', () => {
    const fx: any[] = [
      { n: 1, k: 'draw', tile: '3,3', word: 'fire', side: 'pc' }, { n: 2, k: 'evoke', shape: 'line', tiles: ['3,3', '3,4'] },
      { n: 3, k: 'draw', tile: '3,3', word: 'mend', side: 'pc' }, { n: 4, k: 'evoke', shape: 'grand', tiles: ['3,3'] },
      { n: 5, k: 'glyph_fade', tile: '3,3', word: 'seek' }, { n: 6, k: 'glyph_fade', tile: '3,3', word: 'mend' },
    ];
    expect(shownGlyphs(fx, (e) => e.n > 3).map((x) => x.word)).toEqual(['mend']);
    expect(shownGlyphs(fx, (e) => e.n > 5).map((x) => x.word)).toEqual(['mend']);
    expect(shownGlyphs(fx, (e) => e.n > 6)).toEqual([]);
  });
});

describe('the screen\'s glyphs while a hostile caster\'s turn plays (fxShownGlyphs)', () => {
  beforeEach(() => { vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance', 'Date'] }); clearFx(); const layer = document.createElement('div'); document.body.appendChild(layer); setLayer(layer); });
  afterEach(() => { clearFx(); setLayer(null); document.body.innerHTML = ''; vi.useRealTimers(); vi.restoreAllMocks(); });
  it('the first glyph lies on its tile through the walk and the opportunity attack, and goes with the Evoke', () => {
    const fx = casterTurn(), key = 'cb|ROOM01|Glyphs|The fight begins.';
    // the state after the step: the Line is used up already
    const g: any = { code: 'ROOM01', combat: { name: 'Glyphs', log: ['The fight begins.'], round: 1, turn: 0, order: ['p1'], units: [], glyphs: [], fx, over: false } };
    setProcessed(key, 5); queueFx(fx, key);
    const seen: string[] = [];
    for (let t = 0; t < 30000; t += 50) { const now = tilesOf(fxShownGlyphs(g)); if (seen[seen.length - 1] !== now) seen.push(now); vi.advanceTimersByTime(50); }
    expect(seen[seen.length - 1], 'all played: the state shows').toBe('');
    expect(seen.filter(Boolean)).toEqual(['6,5', '6,5 7,5']); // never gone and back in between
  });
  it('a glyph the state still holds is not shown twice', () => {
    const fx = casterTurn(), key = 'cb|ROOM01|Glyphs2|The fight begins.';
    const g: any = { code: 'ROOM01', combat: { name: 'Glyphs2', log: ['The fight begins.'], round: 1, turn: 0, order: ['p1'], units: [], glyphs: [{ id: 'gl9', word: 'spread', pos: '6,5', side: 'foe' }], fx, over: false } };
    setProcessed(key, 1); queueFx(fx.slice(0, 1), key); vi.advanceTimersByTime(5000); // the draw has played, the rest waits
    expect(fxShownGlyphs(g)).toEqual([]);
  });
});

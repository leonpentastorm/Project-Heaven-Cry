// The area map's Sigils under rules 1.4 (spec: Mana, Sigils 9): Draw goes on your own tile and says whether it starts or
// extends a Line; Evoke reads the Line and says where to stand; the MAGIC tab lists words in grammar order.
import { describe, expect, it, vi } from 'vitest';
import { ARCHETYPES, apply, newGame, viewFor, positionsOf, standable, zoneMap, type GameState, type Sheet } from '@engine';

vi.stubGlobal('window', { scrollTo: () => {}, addEventListener: () => {}, removeEventListener: () => {}, location: { search: '', hash: '' }, innerWidth: 1400, innerHeight: 900 });
vi.stubGlobal('location', { search: '', hash: '' });
let G: GameState;
const view = () => ({ game: viewFor(G, 'host'), me: { id: 'host', name: 'Leon' }, role: 'host', screen: 'main', toast: null, savedAt: 0 });
const doAct = (a: any, by = 'host') => { G = apply(G, a, by); };
vi.mock('../game/store', () => ({ getState: () => view(), act: (a: any) => doAct(a), go: () => {}, toast: () => {}, polishText: async () => '', retryNarrator: () => {}, saveNow: () => {} }));
const { MainLogic } = await import('./main.js');
const sheetFrom = (archId: string, name: string): Sheet => { const a = ARCHETYPES.find((x) => x.id === archId)!;
  return { name, portrait: '', origin: 'Thousand-Planet frontier', kit: 'sigil', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} } as any; };

describe('area map: Sigils (rules 1.4)', () => {
  it('draws on your own tile, then extends the Line from the next tile; Evoke reads the Line', () => {
    G = newGame('ROOM', { id: 'host', name: 'Leon' }, 'seed-sigil');
    doAct({ type: 'char/add', sheet: sheetFrom('sigilist', 'Ilse') }); doAct({ type: 'session/start' }); doAct({ type: 'narrator/begin' });
    doAct({ type: 'narrator/turn', turn: { narration: 'The yard.', sceneTitle: 'Yard' } });
    const c = Object.values(G.characters)[0];
    (G.characters[c.id] as any).sigils = ['fire', 'seek'];
    const L: any = new MainLogic({});
    L.setState({ area: true, wAct: 'draw', wWord: 'fire' });
    let r = L.renderVals();
    const at = positionsOf(G)[c.id];
    expect(r.wHint).toMatch(/^Click your own tile \([A-Z]+\d+\) to draw FIRE \(2 charge, [\d.]+ AP\): it starts a new Line/);
    r.areaCells.find((x: any) => x.key === at).click();
    expect((G.story as any).glyphs.map((g: any) => g.word)).toEqual(['fire']);
    // step to a free neighbour and draw SEEK: it extends the Line
    const map = zoneMap(G), [x, y] = at.split(',').map(Number);
    const next = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => (x + dx) + ',' + (y + dy)).find((k) => standable(map, k) && !Object.values(positionsOf(G)).includes(k))!;
    G.story.positions = { ...(G.story.positions || {}), [c.id]: next };
    L.setState({ wWord: 'seek' }); r = L.renderVals();
    expect(r.wHint).toMatch(/it extends the Line: FIRE · SEEK/);
    r.areaCells.find((x: any) => x.key === next).click();
    expect((G.story as any).glyphs.map((g: any) => g.word)).toEqual(['fire', 'seek']);
    L.setState({ wAct: 'evoke' }); r = L.renderVals();
    r.areaCells.find((x: any) => x.key === at).click();
    r = L.renderVals();
    expect(r.wHint).toMatch(/^Line of 2: FIRE · SEEK\. ✓ A spell: FIRE, a bolt, range 8/);
    expect(r.areaCells.filter((x: any) => x.hasSg).length).toBeGreaterThan(0); // the Line, the Evoke-from arrows or the area
    // the MAGIC tab: words in grammar order, with their 1.4 class
    L.setState({ tab: 'magic' }); r = L.renderVals();
    expect(r.mg.sig.words.map((w: any) => [w.word, w.cls])).toEqual([['FIRE', 'SUBJECT · ELEMENT'], ['SEEK', 'REACH']]);
    expect(r.mg.sig.stats[0].k).toMatch(/^Max Sigil words/);
  });
});

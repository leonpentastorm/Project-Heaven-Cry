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
const { glyphKeyNav } = await import('../game/glyphKeys');
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
  it('the area map\'s draw pad: labelled rows by word group, and a refused key says why in a few words', () => {
    G = newGame('ROOM', { id: 'host', name: 'Leon' }, 'seed-sigil-rows');
    doAct({ type: 'char/add', sheet: sheetFrom('sigilist', 'Ilse') }); doAct({ type: 'session/start' }); doAct({ type: 'narrator/begin' });
    doAct({ type: 'narrator/turn', turn: { narration: 'The yard.', sceneTitle: 'Yard' } });
    const c = Object.values(G.characters)[0];
    (G.characters[c.id] as any).sigils = ['seek', 'spread', 'fire', 'mend'];
    const L: any = new MainLogic({});
    L.setState({ area: true, wAct: 'draw', wWord: 'fire' });
    let r = L.renderVals();
    expect(r.wMagic.showWords).toBe(true);
    expect(r.wMagic.wordRows.map((x: any) => [x.label, x.words.map((w: any) => w.key)])).toEqual([['ELEMENTS', ['fire']], ['BOONS', ['mend']], ['REACH', ['seek']], ['BURST', ['spread']]]);
    expect(r.wMagic.wordRows.map((x: any) => x.aria)).toEqual(['Elements words', 'Boons words', 'Reach words', 'Burst words']);
    const fire = r.wMagic.words.find((w: any) => w.key === 'fire');
    expect(fire).toMatchObject({ disabled: 'false', hint: '', pressed: 'true', sub: '2 charge' }); expect(fire.onKey).toBe(glyphKeyNav);
    expect(fire.aria).toMatch(/^FIRE, Element, 2 charge; 0 uses \/ 10$/);
    r.areaCells.find((x: any) => x.key === positionsOf(G)[c.id]).click(); // FIRE on your own tile: every key is now refused
    L.setState({ wWord: 'seek' }); r = L.renderVals();
    for (const w of r.wMagic.words) {
      expect(w).toMatchObject({ disabled: 'true', hint: 'tile taken' }); expect(w.sub).toMatch(/^\d+ ch$/);
      expect(w.aria).toMatch(/can't draw now: One glyph per tile/); expect(w.title).toMatch(/CAN'T NOW: One glyph per tile/); if (w.key !== 'seek') expect(w.style).toMatch(/dashed/); // the selected key keeps its solid cyan edge
    }
  });
});

describe('area map: Sigil 1.5 review fixes (rules 1.9)', () => {
  it('Analyze aimed at a trace on the map reads it (world/act read); the keyboard shows use counts and stars', () => {
    G = newGame('ROOM', { id: 'host', name: 'Leon' }, 'seed-sigil-read');
    doAct({ type: 'char/add', sheet: sheetFrom('sigilist', 'Ilse') }); doAct({ type: 'session/start' }); doAct({ type: 'narrator/begin' });
    doAct({ type: 'narrator/turn', turn: { narration: 'The yard.', sceneTitle: 'Yard' } });
    const c = Object.values(G.characters)[0]; (G.characters[c.id] as any).sigils = ['fire', 'seek'];
    (G.characters[c.id] as any).sigilGrowth = { study: 0, picksUsed: 0, free: 0, paid: [], toStudy: [], uses: { seek: 12 } };
    const at = positionsOf(G)[c.id], map = zoneMap(G), [x, y] = at.split(',').map(Number);
    const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => (x + dx) + ',' + (y + dy)).find((k) => standable(map, k) && !Object.values(positionsOf(G)).includes(k))!;
    (G.story as any).traces = [{ id: 'tz', word: 'bind', pos: near, side: 'foe', by: 'x', who: 'Someone', left: 2 }];
    const L: any = new MainLogic({});
    L.setState({ area: true, wAct: 'draw', wWord: 'fire' });
    let r = L.renderVals();
    expect(r.wMagic.words.find((w: any) => w.key === 'seek')).toMatchObject({ hasStar: true, starAlt: 'PRACTISED', uses: '12' });
    L.setState({ wAct: 'analyze' }); r = L.renderVals();
    r.areaCells.find((q: any) => q.key === near).click(); r = L.renderVals();
    expect(r.wHint).toMatch(/^Read the trace at /); expect(r.wHasConfirm).toBe(true);
    r.wConfirm();
    expect((G.characters[c.id] as any).sigilGrowth.toStudy).toEqual(['bind']);
  });
  it('a junction on the map offers both of its Lines to Evoke (JUNCTION · EVOKE chips), and the pick rides the payload', () => {
    G = newGame('ROOM', { id: 'host', name: 'Leon' }, 'seed-sigil-jx');
    doAct({ type: 'char/add', sheet: sheetFrom('sigilist', 'Ilse') }); doAct({ type: 'session/start' }); doAct({ type: 'narrator/begin' });
    doAct({ type: 'narrator/turn', turn: { narration: 'The yard.', sceneTitle: 'Yard' } });
    const c = Object.values(G.characters)[0]; (G.characters[c.id] as any).sigils = ['fire', 'seek', 'spark'];
    const at = positionsOf(G)[c.id], [x, y] = at.split(',').map(Number), k = (dx: number, dy: number) => (x + dx) + ',' + (y + dy);
    const gl = (id: string, word: string, pos: string, s1: string, s2?: string) => ({ id, word, pos, by: c.id, side: 'pc', left: 3, who: 'Ilse', v: 14, strokeId: s1, ...(s2 ? { strokeId2: s2 } : {}) });
    (G.story as any).glyphs = [gl('g1', 'fire', k(-1, 0), 'sA'), gl('g2', 'seek', at, 'sA', 'sB'), gl('g3', 'spark', k(0, 1), 'sB')];
    const L: any = new MainLogic({});
    L.setState({ area: true, wAct: 'evoke', wTile: at, wEvc: {} });
    let r = L.renderVals();
    expect(r.wMagic.hasJunction).toBe(true); expect(r.wMagic.junctionBtns.length).toBe(2);
    const other = r.wMagic.junctionBtns.find((b: any) => b.pressed === 'false'); other.pick(); r = L.renderVals();
    expect(L.state.wEvc).toEqual({ stroke: other.key }); expect(r.wMagic.junctionBtns.find((b: any) => b.key === other.key).pressed).toBe('true');
  });
});

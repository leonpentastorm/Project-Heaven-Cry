// Sigil 1.5 strokes on the two maps (rules 1.10, spec 1.10, 5.3): the combat glyph keyboard's stroke picker ("extends
// FIRE", "new Line"), the pick sent with the draw, the faint joins and the hovered stroke's words on the grid; the area
// map does the same with g.story.glyphs.
import { describe, expect, it, vi } from 'vitest';
import { ARCHETYPES, apply, newGame, viewFor, active, positionsOf, standable, zoneMap, type GameState, type Sheet } from '@engine';

vi.stubGlobal('window', { scrollTo: () => {}, addEventListener: () => {}, removeEventListener: () => {}, location: { search: '', hash: '' }, innerWidth: 1400, innerHeight: 900 });
vi.stubGlobal('location', { search: '', hash: '' });
let G: GameState; let snap: any = null; let SCREEN = 'combat';
const view = () => ({ game: viewFor(G, 'host'), me: { id: 'host', name: 'Leon' }, role: 'host', screen: SCREEN, toast: null, savedAt: 0 });
const doAct = (a: any) => { G = apply(G, a, 'host'); snap = view(); };
const sent: any[] = [];
vi.mock('../game/store', () => ({ getState: () => snap || (snap = view()), subscribe: () => () => {}, act: (a: any) => { sent.push(a); try { doAct(a); } catch (e: any) { if (e?.name !== 'RuleError' && e?.constructor?.name !== 'RuleError') throw e; } },
  go: () => {}, toast: () => {}, polishText: async () => '', retryNarrator: () => {}, saveNow: () => {}, poke: () => {} }));
vi.mock('../game/report', async (orig) => ({ ...(await orig() as any), openReport: () => {}, PlaytestTools: () => null }));
const { CombatLogic } = await import('./combat.js');
const { MainLogic } = await import('./main.js');

const sheetFrom = (name: string): Sheet => { const a = ARCHETYPES.find((x) => x.id === 'sigilist')!;
  return { name, portrait: '', origin: 'Thousand-Planet frontier', kit: 'sigil', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} } as any; };
function fight(words: string[]) {
  SCREEN = 'combat'; snap = null; G = newGame('ROOM', { id: 'host', name: 'Leon' }, 'strokes-ui');
  doAct({ type: 'char/add', sheet: sheetFrom('Ilse') }); doAct({ type: 'session/start' }); doAct({ type: 'narrator/begin' });
  doAct({ type: 'narrator/turn', turn: { narration: 'Words.', combat: { name: 'Yard', difficulty: 'easy', enemies: [{ name: 'Engineer', tier: 'minion', weapon: 'service_pistol' }] } } });
  const cb: any = G.combat;
  cb.map = { ...cb.map, w: Math.max(14, cb.map.w), h: Math.max(10, cb.map.h), cover: [], full: [], solid: [], difficult: [], dark: false }; cb.objects = []; cb.glyphs = []; cb.zones = [];
  const u = cb.units.find((x: any) => x.side === 'pc'), e = cb.units.find((x: any) => x.side === 'foe');
  cb.turn = cb.order.indexOf(u.id); if (cb.turn < 0) cb.turn = 0;
  Object.assign(u, { pos: '2,5', ap: 9 }); Object.assign(u.mg, { words: [...words], maxWords: 4, charge: 10, flux: 0, glyphAp: 1 });
  Object.assign(e, { pos: '10,5' });
  snap = view(); expect(active(G.combat!)!.id).toBe(u.id);
  return u;
}
function screen(state: any = {}) { const l: any = new CombatLogic({}); l.setState = (x: any) => { l.state = { ...l.state, ...(typeof x === 'function' ? x(l.state) : x) }; }; l.state = { ...l.state, ...state }; return l; }
const pc = () => (G.combat as any).units.find((x: any) => x.side === 'pc');
const tileOf = (v: any, k: string) => v.tiles.find((t: any) => t.key === k);
const sidAt = (k: string) => (G.combat as any).glyphs.find((g: any) => g.pos === k).strokeId;

describe('combat: the stroke picker and the joins (rules 1.10)', () => {
  it('two Lines side by side: pick "new Line", then each glyph extends the Line picked; the grid joins each row', () => {
    fight(['fire', 'spark', 'seek', 'arc']);
    const l = screen({ action: 'draw', tab: 'sigils', word: 'fire' });
    let v = l.renderVals();
    expect(v.pad.hasStrokes).toBe(false); expect(v.sel.hasStrokes).toBe(false); expect(v.pad.strokeNote).toBe('This glyph starts a new Line.');
    l.magicClick('2,5', pc());
    pc().pos = '2,6'; snap = view(); l.state.word = 'spark'; v = l.renderVals();
    expect(v.sel.hasStrokes).toBe(true); expect(v.sel.strokeBtns.map((b: any) => b.label)).toEqual(['✓ extends FIRE', 'new Line']);
    expect(v.pad.strokeNote).toBe('This glyph extends the Line: FIRE · SPARK.');
    expect(tileOf(v, '2,6').hasJoin).toBe(true); expect(decodeURIComponent(tileOf(v, '2,6').join)).toContain('stroke-dasharray'); // the dashed preview
    v.pad.strokeBtns[1].pick(); v = l.renderVals();
    expect(v.pad.strokeBtns.map((b: any) => b.label)).toEqual(['extends FIRE', '✓ new Line']); expect(v.pad.strokeNote).toBe('This glyph starts a new Line.');
    expect(tileOf(v, '2,6').hasJoin).toBe(false);
    l.magicClick('2,6', pc());
    expect(sent[sent.length - 1]).toMatchObject({ type: 'combat/draw', word: 'spark', stroke: 'new' });
    expect(l.state.stroke).toBe(null); // the pick is used once
    expect(sidAt('2,6')).not.toBe(sidAt('2,5'));
    pc().pos = '3,5'; snap = view(); l.state.word = 'seek'; v = l.renderVals();
    expect(v.pad.strokeBtns.map((b: any) => b.label)).toEqual(['extends FIRE', '✓ extends SPARK', 'new Line']);
    v.pad.strokeBtns[0].pick(); l.renderVals(); l.magicClick('3,5', pc());
    pc().pos = '3,6'; snap = view(); l.state.word = 'arc'; l.renderVals(); l.magicClick('3,6', pc());
    expect(sidAt('3,5')).toBe(sidAt('2,5')); expect(sidAt('3,6')).toBe(sidAt('2,6'));
    l.state.action = 'evoke'; l.state.hover = '3,6'; v = l.renderVals();
    expect(tileOf(v, '2,5').hasJoin && tileOf(v, '3,6').hasJoin).toBe(true);
    expect(tileOf(v, '3,6').hasStrokeTip).toBe(true); expect(tileOf(v, '3,6').strokeTip).toBe('SPARK · ARC');
    expect(tileOf(v, '2,6').hasStrokeHot).toBe(true); expect(tileOf(v, '2,5').hasStrokeHot).toBe(false);
    // Both are real Lines: Evoke reads each on its own (touching glyphs no longer poison it).
    l.magicClick('2,5', pc()); v = l.renderVals();
    expect(v.pad.sgWords.map((w: any) => w.word)).toEqual(['FIRE', 'SEEK']); expect(v.pad.sgVerdict).toMatch(/^✓ A spell/);
  });
});

describe('area map: the stroke picker and the joins (rules 1.10)', () => {
  it('the picker shows on the area map\'s keyboard, the pick rides on world/act draw, and the cells show the joins', () => {
    SCREEN = 'main'; snap = null; G = newGame('ROOM', { id: 'host', name: 'Leon' }, 'strokes-area');
    doAct({ type: 'char/add', sheet: sheetFrom('Ilse') }); doAct({ type: 'session/start' }); doAct({ type: 'narrator/begin' });
    doAct({ type: 'narrator/turn', turn: { narration: 'The yard.', sceneTitle: 'Yard' } });
    const c = Object.values(G.characters)[0]; (G.characters[c.id] as any).sigils = ['fire', 'seek']; snap = view();
    const L: any = new MainLogic({});
    L.setState({ area: true, wAct: 'draw', wWord: 'fire' });
    let r = L.renderVals(); const at = positionsOf(G)[c.id];
    expect(r.wMagic.hasStrokes).toBe(false);
    r.areaCells.find((x: any) => x.key === at).click(); snap = view();
    const map = zoneMap(G), [x, y] = at.split(',').map(Number);
    const next = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => (x + dx) + ',' + (y + dy)).find((k) => standable(map, k) && !Object.values(positionsOf(G)).includes(k))!;
    G.story.positions = { ...(G.story.positions || {}), [c.id]: next }; snap = view();
    L.setState({ wWord: 'seek' }); r = L.renderVals();
    expect(r.wMagic.strokeBtns.map((b: any) => b.label)).toEqual(['✓ extends FIRE', 'new Line']);
    expect(r.wMagic.strokeNote).toBe('This glyph extends the Line: FIRE · SEEK.');
    r.areaCells.find((x: any) => x.key === next).click(); snap = view();
    expect(sent[sent.length - 1]).toMatchObject({ type: 'world/act', act: 'draw', word: 'seek' });
    expect((G.story as any).glyphs.map((g: any) => g.word)).toEqual(['fire', 'seek']);
    L.setState({ wAct: 'evoke', hoverTile: at }); r = L.renderVals();
    const cell = r.areaCells.find((x: any) => x.key === at);
    expect(cell.hasJoin).toBe(true); expect(cell.hasStrokeTip).toBe(true); expect(cell.strokeTip).toBe('FIRE · SEEK');
  });
});

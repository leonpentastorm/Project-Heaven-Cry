// The combat grid draws the glyphs the effects still show (fx/play.ts fxShownGlyphs; game/fx/shown-glyphs.test.ts) on
// top of the state's own: a hostile caster's Line is drawn and Evoked in one engine step, so the state never holds it.
import { describe, expect, it, vi } from 'vitest';
import { ARCHETYPES, apply, newGame, viewFor, type GameState, type Sheet } from '@engine';

vi.stubGlobal('window', { scrollTo: () => {}, addEventListener: () => {}, removeEventListener: () => {}, location: { search: '', hash: '' }, innerWidth: 1400, innerHeight: 900 });
vi.stubGlobal('location', { search: '', hash: '' });
let G: GameState; let snap: any = null;
const view = () => ({ game: viewFor(G, 'host'), me: { id: 'host', name: 'Leon' }, role: 'host', screen: 'combat', toast: null, savedAt: 0 });
const doAct = (a: any) => { G = apply(G, a, 'host'); snap = view(); };
vi.mock('../game/store', () => ({ getState: () => snap || (snap = view()), subscribe: () => () => {}, act: () => {}, go: () => {}, toast: () => {}, polishText: async () => '', retryNarrator: () => {}, saveNow: () => {}, poke: () => {} }));
vi.mock('../game/report', async (orig) => ({ ...(await orig() as any), openReport: () => {}, PlaytestTools: () => null }));
let SHOWN: any[] = [];
vi.mock('../game/fx/play', async (orig) => ({ ...(await orig() as any), fxShownGlyphs: () => SHOWN }));
const { CombatLogic } = await import('./combat.js');

const sheetFrom = (name: string): Sheet => { const a = ARCHETYPES.find((x) => x.id === 'sigilist')!;
  return { name, portrait: '', origin: 'Thousand-Planet frontier', kit: 'sigil', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} } as any; };

describe('combat: glyphs still shown by the effects', () => {
  it('a hostile glyph the state has used up already stays on its tile (in sight) until its Evoke has played', () => {
    G = newGame('ROOM', { id: 'host', name: 'Leon' }, 'shown-glyphs-ui');
    doAct({ type: 'char/add', sheet: sheetFrom('Ilse') }); doAct({ type: 'session/start' }); doAct({ type: 'narrator/begin' });
    doAct({ type: 'narrator/turn', turn: { narration: 'Words.', combat: { name: 'Yard', difficulty: 'easy', enemies: [{ name: 'Adept', tier: 'soldier', weapon: 'combat_knife' }] } } });
    const cb: any = G.combat;
    cb.map = { ...cb.map, w: Math.max(14, cb.map.w), h: Math.max(10, cb.map.h), cover: [], full: [], solid: [], difficult: [], dark: false }; cb.objects = []; cb.glyphs = []; cb.zones = [];
    const u = cb.units.find((x: any) => x.side === 'pc'), e = cb.units.find((x: any) => x.side === 'foe');
    cb.turn = cb.order.indexOf(u.id); u.pos = '2,5'; e.pos = '10,5'; snap = view();
    const l: any = new CombatLogic({}); l.setState = (x: any) => { l.state = { ...l.state, ...(typeof x === 'function' ? x(l.state) : x) }; };
    const tile = () => l.renderVals().tiles.find((t: any) => t.key === '3,5');
    SHOWN = []; expect(tile().hasGlyphs).toBe(false);
    SHOWN = [{ id: 'fx1', word: 'spread', pos: '3,5', by: e.id, side: 'foe', left: 1, shown: true, strokeId: 'sgl1' }];
    const t = tile(); expect(t.hasGlyphs).toBe(true); expect(t.glyphs.map((x: any) => x.key)).toEqual(['fx1']);
    expect((G.combat as any).glyphs).toEqual([]); // the picture only: the rules' glyphs are untouched
    SHOWN = [];
  });
});

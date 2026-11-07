// The combat screen's Sigil tab under rules 1.4 (spec: Mana, Sigils 9): the glyph keyboard draws on your own tile and
// says whether it starts or extends a Line; Evoke shows the Line's panel, where to stand with arrows, the tinted area,
// the hovered bolt and who it hits with numbers; Confirm sends what the preview showed; placed fields show on the grid.
import { describe, expect, it, vi } from 'vitest';
import { ARCHETYPES, apply, newGame, viewFor, active, type GameState, type Sheet } from '@engine';

let G: GameState; const ME = 'host';
let snap: any = null;
const view = () => ({ game: viewFor(G, ME), me: { id: ME, name: 'Leon' }, role: 'host', screen: 'combat', toast: null, savedAt: 0 });
const doAct = (a: any) => { G = apply(G, a, ME); snap = view(); };
vi.mock('../game/store', () => ({ getState: () => snap || (snap = view()), subscribe: () => () => {}, act: (a: any) => { try { doAct(a); } catch (e: any) { if (e?.name !== 'RuleError' && e?.constructor?.name !== 'RuleError') throw e; } },
  go: () => {}, toast: () => {}, polishText: async () => '', retryNarrator: () => {}, saveNow: () => {}, poke: () => {} }));
vi.mock('../game/report', () => ({ openReport: () => {}, PlaytestTools: () => null }));
const { CombatLogic } = await import('./combat.js');

const sheetFrom = (archId: string, name: string): Sheet => { const a = ARCHETYPES.find((x) => x.id === archId)!;
  return { name, portrait: '', origin: 'Thousand-Planet frontier', kit: 'sigil', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} } as any; };
/** A fight on open ground with the caster acting: words given, plenty of AP and charge, one foe in the open. */
function fight(words: string[]) {
  snap = null; G = newGame('ROOM', { id: 'host', name: 'Leon' }, 'sigil-ui');
  doAct({ type: 'char/add', sheet: sheetFrom('sigilist', 'Ilse') }); doAct({ type: 'session/start' }); doAct({ type: 'narrator/begin' });
  doAct({ type: 'narrator/turn', turn: { narration: 'Words.', combat: { name: 'Yard', difficulty: 'easy', enemies: [{ name: 'Engineer', tier: 'minion', weapon: 'service_pistol' }] } } });
  const cb: any = G.combat;
  cb.map = { ...cb.map, w: Math.max(14, cb.map.w), h: Math.max(10, cb.map.h), cover: [], full: [], solid: [], difficult: [], dark: false }; cb.objects = []; cb.glyphs = []; cb.zones = [];
  const u = cb.units.find((x: any) => x.side === 'pc'), e = cb.units.find((x: any) => x.side === 'foe');
  cb.turn = cb.order.indexOf(u.id); if (cb.turn < 0) cb.turn = 0;
  Object.assign(u, { pos: '2,5', ap: 9 }); Object.assign(u.mg, { words: [...words], maxWords: 4, charge: 10, flux: 0, sigilMult: 1, elemMult: 1, healMult: 1, glyphAp: 1, coreSave: 0, rangeBonus: 0, durBonus: 0 }); // the spec's numbers
  Object.assign(e, { pos: '8,5', hp: 300, maxHp: 300, def: -99, armour: 0 });
  snap = view();
  expect(active(G.combat!)!.id).toBe(u.id);
  return { u, e };
}
function screen(state: any = {}) {
  const l: any = new CombatLogic({});
  l.setState = (x: any) => { l.state = { ...l.state, ...(typeof x === 'function' ? x(l.state) : x) }; };
  l.state = { ...l.state, ...state };
  return l;
}
const tileOf = (v: any, k: string) => v.tiles.find((t: any) => t.key === k);
const pc = () => (G.combat as any).units.find((x: any) => x.side === 'pc');

describe('combat screen: Sigils (rules 1.4)', () => {
  it('Draw: the keyboard shows each word\'s cost and effect; your own tile is the one to click', () => {
    fight(['fire', 'seek']);
    const l = screen({ action: 'draw', tab: 'sigils', word: 'fire' });
    let v = l.renderVals();
    const keys = v.pad.wordList;
    expect(keys.find((w: any) => w.key === 'fire').sub).toBe('2 ch · 1 AP · starts');
    expect(v.sel.text).toMatch(/^Click your own tile \(C6\) to draw FIRE: it starts a new Line/);
    l.magicClick('2,5', pc());
    expect((G.combat as any).glyphs.map((g: any) => g.word)).toEqual(['fire']);
    pc().pos = '3,5'; snap = view(); // a step east: SEEK now extends the Line
    l.state.word = 'seek'; v = l.renderVals();
    expect(v.sel.text).toMatch(/it extends the Line: FIRE · SEEK/);
    l.magicClick('3,5', pc());
    expect((G.combat as any).glyphs.map((g: any) => g.word)).toEqual(['fire', 'seek']);
  });
  it('Evoke: the Line panel, where to stand, the area, the hovered bolt, who it hits, then Confirm', () => {
    const { e } = fight(['fire', 'seek']);
    const l = screen({ action: 'draw', tab: 'sigils', word: 'fire' });
    l.renderVals(); l.magicClick('2,5', pc()); pc().pos = '3,5'; snap = view(); l.state.word = 'seek'; l.renderVals(); l.magicClick('3,5', pc());
    // standing on the Line's end: along it, but this end fires back west, away from the foe
    l.state.action = 'evoke'; l.renderVals(); l.magicClick('2,5', pc());
    let v = l.renderVals();
    expect(v.pad.sgShow).toBe(true); expect(v.pad.sgShape).toMatch(/^LINE OF 2/); expect(v.pad.sgWords.map((w: any) => w.word)).toEqual(['FIRE', 'SEEK']);
    expect(v.pad.sgVerdict).toMatch(/^✓ A spell: FIRE, a bolt, range 8/);
    expect(v.sel.text).toMatch(/Fires ← \(along the Line\)/);
    // step behind the west end (B6): it fires east, toward the foe
    pc().pos = '1,5'; snap = view(); l.state.evc = {};
    l.state.hover = '8,5'; v = l.renderVals();
    expect(v.sel.text).toMatch(/Fires → \(along the Line\)/);
    expect(tileOf(v, '5,5').sg.some((m: any) => m.text === '→')).toBe(true); // the bolt path
    expect(tileOf(v, '8,5').label).toMatch(/enemy: −30 HP · 95% to hit/);
    expect(v.pad.sgAffected[0]).toMatchObject({ tag: 'ENEMY', name: 'Engineer' });
    expect(tileOf(v, '12,9').zoneStyle).toMatch(/rgba\(5, 7, 11, 0.5\)/); // outside the area: dimmed
    l.magicClick('8,5', pc()); v = l.renderVals();
    expect(l.state.evc.aims).toEqual(['8,5']); expect(v.sel.text).toMatch(/Confirm to Evoke/);
    const hp0 = e.hp; l.confirm();
    const after = (G.combat as any).units.find((x: any) => x.id === e.id);
    expect(hp0 - after.hp).toBe(30);
  });
  it('a FIRE field stays on the grid tinted by its element, with rounds left', () => {
    fight(['fire', 'stay']);
    const l = screen({ action: 'draw', tab: 'sigils', word: 'fire' });
    l.renderVals(); l.magicClick('2,5', pc()); pc().pos = '3,5'; snap = view(); l.state.word = 'stay'; l.renderVals(); l.magicClick('3,5', pc());
    pc().pos = '1,5'; snap = view();
    l.state.action = 'evoke'; l.renderVals(); l.magicClick('2,5', pc()); l.renderVals(); l.magicClick('4,5', pc());
    l.renderVals(); l.confirm(); l.state.action = 'move'; const v = l.renderVals();
    expect(tileOf(v, '4,5').zoneStyle).toMatch(/246, 138, 56/);
    expect(tileOf(v, '4,5').sg[0].text).toMatch(/^▦\d/);
    expect(tileOf(v, '4,5').label).toMatch(/FIRE · STAY field \(yours\)/);
    expect(v.magicLegend.some((x: any) => /Field/.test(x.name))).toBe(true);
  });
});

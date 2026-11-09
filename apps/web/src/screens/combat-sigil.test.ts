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
  it('Draw: the keyboard is split into labelled rows by word group, in order; empty groups are left out; refused keys say why', () => {
    // known out of order on purpose: the rows put them back in the Sigil 1.4 order
    fight(['kin', 'push', 'seek', 'stay', 'mend', 'fire', 'bind', 'veil', 'freeze']);
    const l = screen({ action: 'draw', tab: 'sigils', word: 'fire' });
    let v = l.renderVals();
    const rows = v.pad.wordRows;
    expect(rows.map((r: any) => r.label)).toEqual(['ELEMENTS', 'AFFLICTIONS', 'BOONS', 'WORKINGS', 'REACH', 'DELIVERY', 'BURST', 'FILTER']);
    expect(rows[0].words.map((w: any) => w.key)).toEqual(['fire', 'freeze']);
    expect(rows.map((r: any) => r.words.length).reduce((a: number, b: number) => a + b, 0)).toBe(9); // every word once
    expect(rows[4]).toMatchObject({ key: 'reach', aria: 'Reach words' });
    // a keyboard with only an Element and a Reach word shows two rows
    fight(['fire', 'seek']); v = screen({ action: 'draw', tab: 'sigils', word: 'fire' }).renderVals();
    expect(v.pad.wordRows.map((r: any) => r.label)).toEqual(['ELEMENTS', 'REACH']);
    // a glyph on your own tile: every key is refused, and each says so in its tooltip, its aria label and a short hint
    fight(['fire', 'seek']); (G.combat as any).glyphs = [{ id: 'gx', word: 'fire', pos: '2,5', by: pc().id, side: 'pc', left: 3, who: 'Ilse', v: 4 }]; snap = view();
    v = screen({ action: 'draw', tab: 'sigils', word: 'seek' }).renderVals();
    const seek = v.pad.wordList.find((w: any) => w.key === 'seek');
    expect(seek.disabled).toBe('true'); expect(seek.sub).toBe('2 ch · tile taken');
    expect(seek.title).toMatch(/CAN'T NOW: One glyph per tile/); expect(seek.aria).toMatch(/^SEEK, Reach, can't draw now: One glyph per tile/);
    // not enough AP: the hint names the AP needed
    fight(['fire']); pc().ap = 0; snap = view();
    v = screen({ action: 'draw', tab: 'sigils', word: 'fire' }).renderVals();
    expect(v.pad.wordList[0].sub).toBe('2 ch · needs 1 AP'); expect(v.pad.wordList[0].disabled).toBe('true');
  });
});

describe('combat screen: Sigil 1.5 review fixes (rules 1.9)', () => {
  it('the glyph keyboard shows each word\'s use count, and a star with its word when Practised or Mastered (spec 3.4, 5.3)', () => {
    fight(['fire', 'seek']); const c: any = G.characters[pc().charId]; c.sigils = ['fire', 'seek']; c.sigilGrowth = { study: 0, picksUsed: 0, free: 0, paid: [], toStudy: [], uses: { fire: 30, seek: 3 } }; snap = view();
    const keys = screen({ action: 'draw', tab: 'sigils', word: 'fire' }).renderVals().pad.wordList;
    const fire = keys.find((w: any) => w.key === 'fire'), seek = keys.find((w: any) => w.key === 'seek');
    expect(fire).toMatchObject({ hasStar: true, starAlt: 'MASTERED', hasUses: true, uses: '30' }); expect(fire.aria).toMatch(/MASTERED · 30 uses \(its inflection is on\)$/);
    expect(seek).toMatchObject({ hasStar: false, hasUses: true, uses: '3' }); expect(seek.title).toMatch(/3 uses \/ 10/);
  });
  it('Analyze aimed at a hostile glyph or a trace reads it (combat/read); traces show faint on their tile', () => {
    const { e } = fight(['fire', 'seek']); const cb: any = G.combat;
    cb.glyphs = [{ id: 'gx', word: 'acid', pos: '4,5', by: e.id, side: 'foe', left: 3, who: 'Engineer', v: 14 }];
    cb.traces = [{ id: 'gy', word: 'bind', pos: '4,6', side: 'foe', by: e.id, who: 'Engineer', left: 2 }]; snap = view();
    const l = screen({ action: 'analyze', tab: 'attack' });
    let v = l.renderVals();
    expect(tileOf(v, '4,6').glyphs.map((x: any) => x.key)).toEqual(['tr-gy']); expect(tileOf(v, '4,6').label).toMatch(/a trace of an unknown word/);
    l.tileClick('4,5'); v = l.renderVals();
    expect(l.state.readTile).toBe('4,5'); expect(v.sel.text).toMatch(/^Read the glyph at E6 \(2 AP\)/);
    l.confirm(null);
    expect((G.characters[pc().charId] as any).sigilGrowth.toStudy).toEqual(['acid']);
    l.state.action = 'analyze'; l.tileClick('4,6'); l.confirm(null);
    expect((G.characters[pc().charId] as any).sigilGrowth.toStudy).toEqual(['acid', 'bind']);
  });
  it('leaving the grid clears the hover (the stroke tip goes); a draw preview\'s join sits above the caster\'s token', () => {
    fight(['fire', 'seek']); (G.combat as any).glyphs = [{ id: 'gx', word: 'fire', pos: '2,5', by: pc().id, side: 'pc', left: 3, who: 'Ilse', v: 14, strokeId: 'sgx' }]; pc().pos = '3,5'; snap = view();
    const l = screen({ action: 'draw', tab: 'sigils', word: 'seek', hover: '2,5' });
    let v = l.renderVals();
    expect(tileOf(v, '2,5').hasStrokeTip).toBe(true); expect(tileOf(v, '3,5').joinStyle).toMatch(/z-index: 4/);
    v.gridLeave(); v = l.renderVals();
    expect(l.state.hover).toBe(null); expect(tileOf(v, '2,5').hasStrokeTip).toBe(false);
  });
});

// Sigil 1.5 strokes on screen (rules 1.9, spec 1.10, 5.2, 5.3): the draw step's stroke picker, the joining line its
// preview shows, the faint joins between a stroke's glyphs (both joins on a junction), the hovered stroke lit with its
// words, and a junction's two Lines offered on Evoke. Every choice comes from the engine's previewDraw / patternAt.
import { describe, expect, it } from 'vitest';
import { ARCHETYPES, MAPS, newCharacter, startCombat, refOf, d20, drawGlyph, type Sheet, type Combat, type Unit, type MapDef } from '@engine';
import { drawStrip, strokeButtons, strokeLayer, evokeView } from './sigilView';
import { joinUri } from './glyphs';

const arch = (id: string) => ARCHETYPES.find((a: any) => a.id === id)!;
const sheet = (name: string): Sheet => { const a = arch('sigilist'); return { name, portrait: '', origin: 'Central City', kit: 'sigil', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} } as Sheet; };
const open = (): MapDef => ({ ...MAPS.yard, w: 20, h: 20, cover: [], full: [], solid: [], difficult: [], pcStart: ['2,5', '2,6', '2,7', '2,8'], foeStart: ['15,5', '15,6', '15,7', '15,8'] });
function seed(n = 16): { state: number } { for (let s = 1; s < 200000; s++) { const r = { state: s }; let ok = true; for (let i = 0; i < n && ok; i++) { const v = d20(r); ok = v > 1 && v < 20; } if (ok) return { state: s }; } throw new Error('no seed'); }
function setup(words: string[]) {
  const c = newCharacter('c1', 'p1', sheet('Ilse'));
  const cb = startCombat('t', open(), [{ c, pos: '2,5' }], [{ name: 'Foe', tier: 'minion', weapon: 'service_pistol', at: refOf('12,5') }], 'easy', { state: 7 }, []) as Combat;
  cb.objects = [];
  const u = cb.units.find((x) => x.charId === 'c1')!;
  Object.assign(u, { ap: 99 }); Object.assign(u.mg!, { words: [...words], maxWords: 4, charge: 999, flux: -99, glyphAp: 1 });
  cb.mana = 15;
  return { cb, u, rng: seed() };
}
const draw = (cb: Combat, rng: any, u: Unit, word: string, at: string, stroke?: string) => { u.pos = at; const e = drawGlyph(cb, rng, u, word, undefined, stroke); if (e) throw new Error(e); };
const sid = (cb: Combat, at: string) => cb.glyphs!.find((g) => g.pos === at)!.strokeId;

describe('the draw step: the stroke picker (spec 1.3, 5.3)', () => {
  it('next to a lone glyph: "extends FIRE" (the default, on) and "new Line"; picking new Line starts one, with no joining line', () => {
    const { cb, u, rng } = setup(['fire', 'spark', 'seek', 'arc']);
    draw(cb, rng, u, 'fire', '2,5'); u.pos = '2,6';
    let s = drawStrip(cb, u), spark = s.words.find((w) => w.id === 'spark')!;
    expect(spark.effect).toBe('extends'); expect(spark.joins).toEqual(['2,5', '2,6']);
    const bs = strokeButtons(spark);
    expect(bs.map((b) => b.label)).toEqual(['extends FIRE', 'new Line']);
    expect(bs[0].on && bs[0].isDefault).toBe(true); expect(bs[1].on).toBe(false);
    s = drawStrip(cb, u, 'new'); spark = s.words.find((w) => w.id === 'spark')!;
    expect(s.stroke).toBe('new'); expect(spark.effect).toBe('starts'); expect(spark.effectText).toBe('starts a new Line'); expect(spark.joins).toEqual([]);
    expect(strokeButtons(spark).find((b) => b.key === 'new')!.on).toBe(true);
    // A pick the tile no longer offers falls back to the default.
    u.pos = '9,9'; expect(drawStrip(cb, u, sid(cb, '2,5')).stroke).toBe(null);
  });
  it('two Lines side by side: each glyph joins only the stroke picked, and the map joins them row by row', () => {
    const { cb, u, rng } = setup(['fire', 'spark', 'seek', 'arc']);
    draw(cb, rng, u, 'fire', '2,5'); draw(cb, rng, u, 'spark', '2,6', 'new');
    u.pos = '3,5';
    const seek = drawStrip(cb, u).words.find((w) => w.id === 'seek')!;
    expect(strokeButtons(seek).map((b) => b.label)).toEqual(['extends FIRE', 'extends SPARK', 'new Line']);
    expect(strokeButtons(seek).find((b) => b.on)!.label).toBe('extends SPARK'); // the stroke you drew into last
    draw(cb, rng, u, 'seek', '3,5', sid(cb, '2,5'));
    draw(cb, rng, u, 'arc', '3,6'); // the default: SPARK's stroke, the only one it can extend
    expect(sid(cb, '3,5')).toBe(sid(cb, '2,5')); expect(sid(cb, '3,6')).toBe(sid(cb, '2,6')); expect(sid(cb, '2,5')).not.toBe(sid(cb, '2,6'));
    const L = strokeLayer(cb.glyphs!, { side: 'pc' });
    expect(L.tiles['2,5']).toEqual([{ d: [1, 0], kind: 'line' }]); expect(L.tiles['3,5']).toEqual([{ d: [-1, 0], kind: 'line' }]);
    expect(L.tiles['2,6']).toEqual([{ d: [1, 0], kind: 'line' }]); // no join down between the two Lines, though they touch
    const H = strokeLayer(cb.glyphs!, { side: 'pc', hover: '3,6' });
    expect([...H.hot].sort()).toEqual(['2,6', '3,6']); expect(H.hotText).toBe('SPARK · ARC');
    expect(H.tiles['2,6']).toEqual([{ d: [1, 0], kind: 'hot' }]); expect(H.tiles['2,5']).toEqual([{ d: [1, 0], kind: 'line' }]);
  });
  it('the preview: the stroke the glyph would make shows as a dashed joining line', () => {
    const { cb, u, rng } = setup(['fire', 'seek', 'spread']);
    draw(cb, rng, u, 'fire', '2,5'); draw(cb, rng, u, 'seek', '3,5'); u.pos = '4,5';
    const sp = drawStrip(cb, u).words.find((w) => w.id === 'spread')!;
    expect(sp.joins).toEqual(['2,5', '3,5', '4,5']); expect(sp.effectText).toBe('extends the Line: FIRE · SEEK · SPREAD');
    const L = strokeLayer(cb.glyphs!, { side: 'pc', preview: [sp.joins, sp.joins2] });
    expect(L.tiles['4,5']).toEqual([{ d: [-1, 0], kind: 'preview' }]);
    expect(L.tiles['3,5'].map((x) => x.kind).sort()).toEqual(['line', 'preview', 'preview']);
  });
  it('hostile strokes join only between tiles you can see, and their unknown words read "?"', () => {
    const { cb, u, rng } = setup(['fire', 'seek']);
    draw(cb, rng, u, 'fire', '2,5'); draw(cb, rng, u, 'seek', '3,5');
    for (const g of cb.glyphs!) g.side = 'foe';
    expect(strokeLayer(cb.glyphs!, { side: 'pc', seen: (k) => k === '2,5' }).tiles['2,5']).toBeUndefined();
    const L = strokeLayer(cb.glyphs!, { side: 'pc', seen: () => true, hover: '2,5', knows: (w) => w === 'seek' });
    expect(L.tiles['2,5']).toEqual([{ d: [1, 0], kind: 'hot' }]); expect(L.hotText).toBe('? · SEEK');
  });
  it('hovering a hostile Line partly in fog lights and names only the glyphs you can see', () => {
    const { cb, u, rng } = setup(['fire', 'seek', 'spread']);
    draw(cb, rng, u, 'fire', '2,5'); draw(cb, rng, u, 'seek', '3,5'); draw(cb, rng, u, 'spread', '4,5');
    for (const g of cb.glyphs!) g.side = 'foe';
    const L = strokeLayer(cb.glyphs!, { side: 'pc', seen: (k) => k === '2,5', hover: '2,5' });
    expect([...L.hot]).toEqual(['2,5']); expect(L.hotText).toBe('?');
  });
  it('an old 1.4 glyph (no strokeId) joins nothing; a lone glyph names itself', () => {
    const { cb, u, rng } = setup(['fire', 'seek']);
    draw(cb, rng, u, 'fire', '2,5'); draw(cb, rng, u, 'seek', '3,5');
    for (const g of cb.glyphs!) delete (g as any).strokeId;
    const L = strokeLayer(cb.glyphs!, { side: 'pc', hover: '2,5' });
    expect(L.tiles).toEqual({}); expect(L.hotText).toBe('FIRE');
    draw(cb, rng, u, 'fire', '9,9');
    expect(strokeLayer(cb.glyphs!, { side: 'pc', hover: '9,9' }).hotText).toBe('FIRE (alone)');
  });
});

describe('junctions on screen (rules 1.9, items 687-690)', () => {
  function junction() {
    const s = setup(['fire', 'seek', 'spark']), { cb, u, rng } = s;
    draw(cb, rng, u, 'fire', '2,5'); draw(cb, rng, u, 'seek', '3,5'); draw(cb, rng, u, 'spark', '3,4', 'new');
    cb.glyphs!.find((g) => g.pos === '3,5')!.strokeId2 = sid(cb, '3,4'); // SEEK lies in both: FIRE·SEEK and SEEK·SPARK
    return s;
  }
  it('a junction glyph shows both joins, and hovering it lights both Lines', () => {
    const { cb } = junction();
    const L = strokeLayer(cb.glyphs!, { side: 'pc', hover: '3,5' });
    expect(L.tiles['3,5'].map((x) => x.d.join(',')).sort()).toEqual(['-1,0', '0,-1']);
    expect([...L.hot].sort()).toEqual(['2,5', '3,4', '3,5']); expect(L.hotText).toBe('FIRE · SEEK / SEEK · SPARK');
  });
  it('Evoke on a junction offers its two Lines; the pick is read and sent', () => {
    const { cb, u } = junction(); u.pos = '1,5';
    const v0 = evokeView(cb, u, '3,5', {}, null, () => true);
    expect(v0.junction.map((j) => j.label)).toEqual(['FIRE · SEEK', 'SEEK · SPARK']); expect(v0.junction[0].on).toBe(true);
    expect(v0.pattern!.words.map((w) => w.word)).toEqual(['FIRE', 'SEEK']);
    const B = v0.junction[1].key, v1 = evokeView(cb, u, '3,5', { stroke: B }, null, () => true);
    expect(v1.junction[1].on).toBe(true); expect(v1.pattern!.words.map((w) => w.word)).toEqual(['SEEK', 'SPARK']);
    u.pos = '3,6'; const v2 = evokeView(cb, u, '3,5', { stroke: B, aims: ['3,6'] }, null, () => true);
    expect(v2.payload && v2.payload.stroke).toBe(B);
  });
});

describe('join marks (game/glyphs.ts)', () => {
  it('one line per join, from the glyph anchor to past half the tile pitch; the preview dashed', () => {
    const svg = decodeURIComponent(joinUri([{ d: [1, 0], kind: 'line' }, { d: [1, 1], kind: 'preview' }], { size: 44, pad: 26, anchor: [9, 9], pitch: 48 }).replace('data:image/svg+xml,', ''));
    expect(svg.match(/<line /g)!.length).toBe(2);
    expect(svg).toContain('x1="9" y1="9" x2="34" y2="9"'); expect(svg).toContain('stroke-dasharray');
    expect(svg).toContain('viewBox="-26 -26 96 96"');
  });
});

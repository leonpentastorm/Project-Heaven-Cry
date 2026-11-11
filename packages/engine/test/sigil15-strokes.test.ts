// Sigil 1.5, strokes (rules revision 1.10; docs/design/sigil-1.5-spec.md section 1; spec: Mana, Drawing a spell, rule 3;
// items 901-905). A Line is what you drew as one: each glyph records its stroke, and touching glyphs of other strokes no
// longer join, poison or block a Line. Every draw, scuff and Evoke here goes through the reducer (apply), the path a
// player's click takes; the enemy AI runs its own turn (enemyTurn), which takes the same engine actions.
import { describe, expect, it } from 'vitest';
import './helpers/yard16'; // the 16 × 11 practice square these tests name tiles on
import {
  d20, enemyMagic, drawGlyph, previewDraw, findPattern, patternAt, strokeOf, strokesAt, strokeRuns, magicRoundTick, migrateSigil, migrateStorySigil, enemyTurn, startCombat, newCharacter,
  ARCHETYPES, MAPS, refOf, SIGIL_REV, apply, newGame, positionsOf,
  type Combat, type Unit, type Glyph, type MapDef, type Sheet, type GameState,
} from '../src';
import { fightWith, withGame } from './helpers/perkfight';

/** A seed whose next n d20 rolls are all 2-19 (no criticals, no natural 1s). */
function calm(n = 40): number { for (let s = 1; s < 2000000; s++) { const r = { state: s }; let ok = true; for (let i = 0; i < n && ok; i++) { const v = d20(r); ok = v > 1 && v < 20; } if (ok) return s; } throw new Error('no seed'); }
const SEED = calm();

/** A Sigil caster at D6 (3,5) on its turn knowing the words given (Max Sigil words 4, a deep core, every multiplier ×1),
 * allies (more PCs) where given, foes where given; everyone 500 HP, no armour, Defense −99, saves −99 (every roll hits).
 * The yard map, cleared (16 × 11). */
function rig(words: string[], foes: string[] = ['14,9'], allies: string[] = []) {
  const f = fightWith([{ archetype: 'sigilist', kit: 'sigil' }, ...allies.map(() => ({ archetype: 'sigilist', kit: 'sigil' }))], foes.map(() => ({ tier: 'minion' })));
  const cb = f.cb; cb.map = { ...cb.map, cover: [], full: [], solid: [], difficult: [] } as any; cb.objects = []; cb.mana = 15;
  f.pcs.forEach((p, i) => { p.pos = i ? allies[i - 1] : '3,5'; });
  f.foes.forEach((e, i) => { e.pos = foes[i]; });
  for (const x of [...f.pcs, ...f.foes]) { x.hp = x.maxHp = 500; x.armour = 0; x.def = -99; x.sv = { body: -99, brain: -99, heart: -99 } as any; x.hidden = false; }
  const u = f.turn(f.pc); arm(u, words);
  for (const a of f.pcs.slice(1)) arm(a, words);
  f.g.rng.state = SEED;
  return f;
}
function arm(u: Unit, words: string[]) {
  u.ap = 60; const m = u.mg!;
  Object.assign(m, { evoker: true, words: [...words], charge: 999, glyphAp: 1, maxWords: 4, flux: -99, sigilMult: 1, elemMult: 1, healMult: 1, rangeBonus: 0, durBonus: 0, coreSave: 0 });
}
type F = ReturnType<typeof rig>;
/** Make it this unit's turn with plenty of AP (its words kept). */
function as(f: F, u: Unit): Unit { const v = f.turn(u); v.ap = 60; return v; }
/** Draw words on tiles through the reducer, the unit stepping onto each first; stroke picks per glyph (undefined: default). */
function draw(f: F, u: Unit, words: string[], tiles: string[], strokes: (string | undefined)[] = []) {
  words.forEach((w, i) => { f.unit(u.id).pos = tiles[i]; f.act({ type: 'combat/draw', unitId: u.id, word: w, tile: tiles[i], ...(strokes[i] !== undefined ? { stroke: strokes[i] } : {}) } as any); });
}
const evoke = (f: F, u: Unit, tile: string, aim: string) => f.act({ type: 'combat/evoke', unitId: u.id, tile, aim } as any);
const wordsAt = (cb: Combat, tile: string) => { const p = findPattern(cb, tile); return typeof p === 'string' ? p : p.words; };
const sidAt = (cb: Combat, tile: string) => (cb.glyphs || []).find((g) => g.pos === tile)?.strokeId;
const evokes = (cb: Combat) => cb.log.filter((l) => / evokes /.test(l));

// ---------------------------------------------------------------------------------------------------------------------
describe('touching no longer poisons (rules 1.10, Drawing 3.4)', () => {
  it('a "+" of two Lines (one across, one down, touching at the corner) and both Evoke; under 1.4 they made one bent group', () => {
    const f = rig(['fire', 'seek', 'spark'], ['8,5', '4,10']);
    const [foe1, foe2] = f.foes;
    draw(f, f.pc, ['fire', 'seek'], ['5,5', '4,5']); // Line A, across: ends on E6 (4,5)
    draw(f, f.pc, ['spark', 'seek'], ['4,7', '4,6']); // Line B, down: its last glyph touches A's end
    expect(sidAt(f.cb, '4,6')).toBe(sidAt(f.cb, '4,7')); expect(sidAt(f.cb, '4,6')).not.toBe(sidAt(f.cb, '4,5'));
    expect(wordsAt(f.cb, '5,5')).toEqual(['fire', 'seek']); expect(wordsAt(f.cb, '4,7')).toEqual(['spark', 'seek']);
    evoke(f, f.pc, '4,6', foe2.pos); // B from its end fires south past SPARK
    expect(f.unit(foe2.id).hp).toBeLessThan(500);
    f.unit(f.pc.id).pos = '4,5'; evoke(f, f.pc, '4,5', foe1.pos); // A from its end fires east past FIRE
    expect(f.unit(foe1.id).hp).toBeLessThan(500); expect(evokes(f.cb).length).toBe(2);
  });
  it('an "x": two diagonal Lines crossing without sharing a tile both Evoke', () => {
    const f = rig(['mend', 'seek']); const u = f.pc; f.unit(u.id).hp = 300;
    draw(f, u, ['mend', 'seek'], ['5,2', '6,3']); // Line C, going south-east
    draw(f, u, ['mend', 'seek'], ['6,2', '5,3']); // Line D, going south-west across it: every glyph touches the other Line
    expect(wordsAt(f.cb, '5,2')).toEqual(['mend', 'seek']); expect(wordsAt(f.cb, '6,2')).toEqual(['mend', 'seek']);
    evoke(f, u, '5,3', '5,3'); evoke(f, u, '5,2', '5,3'); // both from D's end, at yourself
    expect(evokes(f.cb).length).toBe(2); expect(f.unit(u.id).hp).toBeGreaterThan(300); expect(f.cb.glyphs || []).toEqual([]);
  });
  it('two Lines side by side, one row apart, both Evoke', () => {
    const f = rig(['fire', 'seek', 'spark'], ['9,5', '9,6']); const [a, b] = f.foes;
    draw(f, f.pc, ['fire', 'seek'], ['5,5', '4,5']);
    draw(f, f.pc, ['spark', 'seek'], ['5,6', '4,6']);
    expect(wordsAt(f.cb, '5,5')).toEqual(['fire', 'seek']); expect(wordsAt(f.cb, '5,6')).toEqual(['spark', 'seek']);
    expect(strokesAt(f.cb, 'pc').length).toBe(2);
    evoke(f, f.pc, '4,6', b.pos); f.unit(f.pc.id).pos = '4,5'; evoke(f, f.pc, '4,5', a.pos);
    expect(f.unit(a.id).hp).toBeLessThan(500); expect(f.unit(b.id).hp).toBeLessThan(500);
  });
  it('two Lines ending next to each other: the last glyph beside the other Line\'s end extends its own stroke', () => {
    const f = rig(['fire', 'seek', 'condense']);
    draw(f, f.pc, ['fire', 'condense'], ['2,2', '3,2']);
    draw(f, f.pc, ['seek', 'fire'], ['4,4', '4,3']); // 4,3 touches 3,2 (A's end), diagonally
    expect(wordsAt(f.cb, '2,2')).toEqual(['fire', 'condense']); expect(wordsAt(f.cb, '4,4')).toEqual(['seek', 'fire']);
    const pa = patternAt(f.cb, '3,2', f.pc); expect(pa.valid).toBe(true); expect(pa.stroke!.tiles).toEqual(['2,2', '3,2']);
  });
});

describe('the stroke picker (rules 1.10, Drawing 3.3; item 901)', () => {
  it('two strokes it could extend: the default is the one you drew into last; the pick and "new" ride the draw action', () => {
    for (const [pick, want] of [[undefined, 'mend'], ['fire', 'fire'], ['new', null]] as const) {
      const f = rig(['fire', 'mend', 'seek']);
      draw(f, f.pc, ['fire', 'mend'], ['3,5', '5,5']); // two lone glyphs, two tiles apart
      const sFire = sidAt(f.cb, '3,5')!, sMend = sidAt(f.cb, '5,5')!; expect(sFire).not.toBe(sMend);
      f.unit(f.pc.id).pos = '4,5';
      const pv = withGame(f.g, () => previewDraw(f.cb, f.pc, 'seek'));
      expect(pv.strokes.map((s) => s.id)).toEqual([sFire, sMend, 'new']); expect(pv.defaultStroke).toBe(sMend);
      expect(pv.strokes.map((s) => s.label)).toEqual(['extends FIRE', 'extends MEND', 'new Line']);
      expect(pv.strokes.find((s) => s.isDefault)!.id).toBe(sMend); expect(pv.effect).toBe('extends'); expect(pv.words).toEqual(['mend', 'seek']);
      draw(f, f.pc, ['seek'], ['4,5'], [pick === 'fire' ? sFire : pick]);
      if (want === 'mend') { expect(wordsAt(f.cb, '5,5')).toEqual(['mend', 'seek']); expect(wordsAt(f.cb, '3,5')).toMatch(/One glyph alone/); }
      if (want === 'fire') { expect(wordsAt(f.cb, '3,5')).toEqual(['fire', 'seek']); expect(wordsAt(f.cb, '5,5')).toMatch(/One glyph alone/); }
      if (want === null) { for (const k of ['3,5', '4,5', '5,5']) expect(wordsAt(f.cb, k)).toMatch(/One glyph alone/); expect(strokesAt(f.cb).length).toBe(3); }
    }
  });
  it('a pick the glyph can\'t extend is refused before anything is spent; a refused default suggests a new Line', () => {
    const f = rig(['fire', 'seek', 'arc']);
    draw(f, f.pc, ['fire', 'seek'], ['3,5', '4,5']); const s = sidAt(f.cb, '3,5')!;
    f.unit(f.pc.id).pos = '4,6'; const ap = f.unit(f.pc.id).ap;
    expect(() => draw(f, f.pc, ['arc'], ['4,6'], [s])).toThrow(/can't take this glyph/); expect(f.unit(f.pc.id).ap).toBe(ap);
    expect(() => draw(f, f.pc, ['arc'], ['5,5'])).toThrow(/second Reach word.*Or pick new Line/);
    draw(f, f.pc, ['arc'], ['5,5'], ['new']); // the same tile, a fresh stroke: allowed, and FIRE · SEEK is untouched
    expect(wordsAt(f.cb, '3,5')).toEqual(['fire', 'seek']); expect(wordsAt(f.cb, '5,5')).toMatch(/One glyph alone/);
  });
  it('the preview names the stroke a glyph would make and its joining tiles (the screen\'s line), and the draw fx carries them', () => {
    const f = rig(['fire', 'seek']); draw(f, f.pc, ['fire'], ['3,5']); f.unit(f.pc.id).pos = '4,6';
    const pv = withGame(f.g, () => previewDraw(f.cb, f.pc, 'seek'));
    expect(pv.joins).toEqual(['3,5', '4,6']); expect(pv.strokeId).toBe(sidAt(f.cb, '3,5'));
    draw(f, f.pc, ['seek'], ['4,6']);
    const fx = (f.cb.fx || []).filter((e: any) => e.k === 'draw').pop() as any;
    expect(fx.stroke).toBe(sidAt(f.cb, '3,5')); expect(fx.joins).toEqual(['3,5', '4,6']);
  });
});

describe('co-op and enemies (rules 1.10, Drawing 3.6)', () => {
  it('an ally may extend your stroke deliberately (the picker), and then Evoke the shared Line', () => {
    const f = rig(['fire', 'seek'], ['9,5'], ['8,8']); const [me, ally] = f.pcs;
    draw(f, me, ['fire'], ['3,5']); const mine = sidAt(f.cb, '3,5')!;
    const a = as(f, ally); f.unit(a.id).pos = '4,5';
    const pv = withGame(f.g, () => previewDraw(f.cb, f.unit(a.id), 'seek'));
    expect(pv.defaultStroke).toBe('new'); // never by accident
    const opt = pv.strokes.find((s) => s.id === mine)!; expect(opt.mine).toBe(false); expect(opt.ownerName).toBe(me.name); expect(opt.isDefault).toBe(false);
    draw(f, a, ['seek'], ['4,5'], [mine]);
    expect(wordsAt(f.cb, '3,5')).toEqual(['fire', 'seek']); expect(strokeOf(f.cb, '4,5')!.drawers).toEqual([me.id, a.id]);
    f.unit(a.id).pos = '2,5'; evoke(f, a, '3,5', '9,5'); // from beyond FIRE's end: along, east
    expect(f.unit(f.foe.id).hp).toBeLessThan(500);
  });
  it('an ally drawing beside your stroke\'s end, on along its row, starts its own stroke by default', () => {
    const f = rig(['fire', 'seek', 'spark'], ['9,5'], ['8,8']); const [me, ally] = f.pcs;
    draw(f, me, ['fire', 'seek'], ['3,5', '4,5']);
    const a = as(f, ally); draw(f, a, ['spark'], ['5,5']);
    expect(wordsAt(f.cb, '3,5')).toEqual(['fire', 'seek']); expect(wordsAt(f.cb, '5,5')).toMatch(/One glyph alone/);
    // ...and a second glyph of its own extends its own stroke, not yours.
    draw(f, a, ['seek'], ['6,5']); expect(wordsAt(f.cb, '6,5')).toEqual(['spark', 'seek']); expect(wordsAt(f.cb, '3,5')).toEqual(['fire', 'seek']);
  });
  it('an enemy glyph next to your stroke\'s end never joins it, and yours never joins theirs', () => {
    const f = rig(['fire', 'seek'], ['9,5']); const foe = f.foe;
    draw(f, f.pc, ['fire', 'seek'], ['5,5', '4,5']);
    // Enemies draw through the engine's own action (the AI's path; no player may act for them).
    const e = as(f, foe); e.mg = enemyMagic(e, ['spark', 'seek']); arm(e, ['spark', 'seek']); e.pos = '3,5';
    expect(withGame(f.g, () => drawGlyph(f.cb, f.g.rng, e, 'spark'))).toBeNull(); // right on along your Line's row
    expect(wordsAt(f.cb, '5,5')).toEqual(['fire', 'seek']); expect(wordsAt(f.cb, '3,5')).toMatch(/One glyph alone/);
    const me = as(f, f.pc); f.unit(me.id).pos = '2,5';
    expect(withGame(f.g, () => previewDraw(f.cb, f.unit(me.id), 'seek')).strokes).toEqual([]); // their stroke isn't offered
  });
  it('an enemy caster builds its Line beside a glyph of its own side (under 1.4 that bent group spoiled every Line it could walk)', () => {
    const arch = (id: string) => ARCHETYPES.find((x: any) => x.id === id)!;
    const sheet = (name: string): Sheet => { const a = arch('sigilist'); return { name, portrait: '', origin: 'Central City', kit: 'sigil', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} }; };
    // Its walk east (away from the players) is the only way: the diagonals are walled.
    const map: MapDef = { ...MAPS.yard16, w: 20, h: 20, cover: [], full: [], solid: ['11,4', '11,6'], difficult: [], pcStart: ['2,5'], foeStart: ['10,5'] };
    const cs = [{ c: newCharacter('c0', 'p1', sheet('P1')), pos: '5,5' }, { c: newCharacter('c1', 'p1', sheet('P2')), pos: '5,6' }, { c: newCharacter('c2', 'p1', sheet('P3')), pos: '6,5' }];
    const cb = startCombat('t', map, cs, [{ name: 'Caster', tier: 'soldier', weapon: 'combat_knife', at: refOf('10,5'), sigils: ['fire', 'arc', 'spread'] }], 'easy', { state: 7 }, []);
    cb.objects = []; cb.mana = 15;
    const ps = cb.units.filter((x) => x.side === 'pc'), e = cb.units.find((x) => x.side === 'foe')!;
    for (const p of ps) { p.hp = p.maxHp = 500; p.armour = 0; p.def = 10; p.sv = { body: 0, brain: 0, heart: 0 } as any; }
    e.mg!.flux = 0;
    // A glyph of its own side beside the tiles it will walk (10,6 touches 10,5 and 11,5).
    cb.glyphs = [{ id: 'gl90', word: 'spark', pos: '10,6', by: 'f9', side: 'foe', left: 3, who: 'A friend', v: SIGIL_REV, strokeId: 'sgl90' } as Glyph];
    cb.glyphSeq = 90; cb.turn = cb.order.indexOf(e.id); e.ap = 6;
    const hp = ps.map((p) => p.hp);
    enemyTurn(cb, { state: SEED });
    expect(cb.log.filter((l) => l.startsWith('Caster draws')).length).toBe(3);
    expect(cb.log.filter((l) => l.startsWith('Caster evokes')).length).toBe(1);
    expect(ps.some((p, i) => p.hp < hp[i])).toBe(true);
    expect((cb.glyphs || []).map((g) => g.pos)).toEqual(['10,6']); // its Line is spent; the lone SPARK stays its own
  });
});

describe('scuffing, fading and Evoking keep strokes whole (rules 1.10, Drawing 3.8; item 903)', () => {
  it('scuffing a middle glyph splits the stroke: the part of 2 is a Line with a fresh id, the lone glyph is a glyph and can be extended again', () => {
    const f = rig(['spark', 'condense', 'fire', 'seek'], ['10,5']);
    draw(f, f.pc, ['spark', 'condense', 'fire', 'seek'], ['6,5', '5,5', '4,5', '3,5']);
    const s0 = sidAt(f.cb, '6,5')!; expect(wordsAt(f.cb, '6,5')).toEqual(['spark', 'condense', 'fire', 'seek']);
    f.unit(f.pc.id).pos = '5,5'; f.act({ type: 'combat/scuff', unitId: f.pc.id });
    expect(wordsAt(f.cb, '6,5')).toMatch(/One glyph alone/); expect(wordsAt(f.cb, '4,5')).toEqual(['fire', 'seek']);
    expect(sidAt(f.cb, '6,5')).toBe(s0); expect(sidAt(f.cb, '4,5')).not.toBe(s0); expect(sidAt(f.cb, '4,5')).toBe(sidAt(f.cb, '3,5'));
    draw(f, f.pc, ['seek'], ['7,5']); // the lone SPARK takes a glyph in any direction again
    expect(wordsAt(f.cb, '6,5')).toEqual(['spark', 'seek']);
    f.unit(f.pc.id).pos = '3,5'; evoke(f, f.pc, '3,5', '10,5'); expect(f.unit(f.foe.id).hp).toBeLessThan(500);
  });
  it('a middle glyph that fades first splits the stroke too (strokeRuns reads it, the round tick writes the ids)', () => {
    const f = rig(['fire', 'seek', 'spark']);
    draw(f, f.pc, ['fire', 'seek', 'spark'], ['3,5', '4,5', '5,5']);
    const s0 = sidAt(f.cb, '3,5')!; (f.cb.glyphs || []).find((g) => g.pos === '4,5')!.left = 1;
    magicRoundTick(f.cb);
    expect((f.cb.glyphs || []).map((g) => g.pos)).toEqual(['3,5', '5,5']);
    expect(sidAt(f.cb, '3,5')).toBe(s0); expect(sidAt(f.cb, '5,5')).toBe('s' + (f.cb.glyphs || []).find((g) => g.pos === '5,5')!.id);
    expect(strokeRuns(f.cb.glyphs || []).map((s) => s.tiles)).toEqual([['3,5'], ['5,5']]);
  });
  it('a split nobody tidied (a glyph wiped by a class move) still reads as two strokes, and the far part extends correctly', () => {
    const f = rig(['fire', 'seek', 'spark']);
    draw(f, f.pc, ['spark', 'fire', 'seek'], ['3,5', '4,5', '5,5']);
    f.cb.glyphs = (f.cb.glyphs || []).filter((g) => g.pos !== '4,5'); // removed the way some class code does, no tidy
    expect(strokeRuns(f.cb.glyphs).map((s) => s.tiles)).toEqual([['3,5'], ['5,5']]);
    f.unit(f.pc.id).pos = '6,5';
    const pv = withGame(f.g, () => previewDraw(f.cb, f.pc, 'fire'));
    expect(pv.effect).toBe('extends'); expect(pv.words).toEqual(['seek', 'fire']);
    draw(f, f.pc, ['fire'], ['6,5']);
    expect(wordsAt(f.cb, '5,5')).toEqual(['seek', 'fire']); expect(wordsAt(f.cb, '3,5')).toMatch(/One glyph alone/);
    expect(sidAt(f.cb, '5,5')).toBe(sidAt(f.cb, '6,5')); expect(sidAt(f.cb, '5,5')).not.toBe(sidAt(f.cb, '3,5'));
  });
  it('a Keystone an Evoke spares stays as a stroke of one glyph that the next glyph extends', () => {
    const f = rig(['fire', 'seek'], ['9,5']);
    draw(f, f.pc, ['fire', 'seek'], ['4,5', '3,5']); ((f.cb.glyphs || []).find((g) => g.pos === '4,5') as any).keystone = true;
    evoke(f, f.pc, '3,5', '9,5');
    expect((f.cb.glyphs || []).map((g) => g.pos)).toEqual(['4,5']); expect(wordsAt(f.cb, '4,5')).toMatch(/One glyph alone/);
    draw(f, f.pc, ['seek'], ['5,6']); expect(wordsAt(f.cb, '4,5')).toEqual(['fire', 'seek']);
  });
  it('a Stack (the two-glyph hook): the second glyph joins the stroke already on the tile, in a Line or alone', () => {
    const f = rig(['fire', 'seek', 'condense']); (f.unit(f.pc.id).mg as any).glyphsPerTile = 2;
    draw(f, f.pc, ['fire', 'seek', 'condense'], ['4,5', '3,5', '3,5']);
    expect(sidAt(f.cb, '3,5')).toBe(sidAt(f.cb, '4,5')); expect(wordsAt(f.cb, '4,5')).toEqual(['fire', 'seek', 'condense']);
    const g = rig(['fire', 'condense']); (g.unit(g.pc.id).mg as any).glyphsPerTile = 2;
    draw(g, g.pc, ['fire', 'condense'], ['3,5', '3,5']);
    const p = findPattern(g.cb, '3,5'); expect(typeof p === 'object' && p.shape).toBe('stack');
    expect(withGame(g.g, () => previewDraw(g.cb, g.pc, 'fire')).why).toMatch(/2 glyphs at most/);
  });
});

describe('old saves (rules 1.10, Drawing 3.10; item 904)', () => {
  const old = (id: string, word: string, pos: string, by: string): Glyph => ({ id, word, pos, by, side: 'pc', left: 3, who: 'Old', v: SIGIL_REV } as Glyph);
  it('glyphs with no stroke keep the 1.4 reading (a straight touching group is a Line, a bend is no shape); none is dropped', () => {
    const f = rig(['fire', 'seek'], ['9,5']); const id = f.pc.id;
    f.cb.glyphs = [old('gl1', 'fire', '4,5', id), old('gl2', 'seek', '3,5', id), old('gl3', 'fire', '8,8', 'x'), old('gl4', 'seek', '9,8', 'x'), old('gl5', 'seek', '9,9', 'x')];
    f.cb.glyphSeq = 5; migrateSigil(f.cb); expect(f.cb.glyphs.length).toBe(5);
    expect(wordsAt(f.cb, '4,5')).toEqual(['fire', 'seek']); expect(wordsAt(f.cb, '8,8')).toMatch(/No shape/);
    // A new glyph beside the old Line doesn't join it (nor is it spoiled by it); the old Line still Evokes.
    draw(f, f.pc, ['fire'], ['2,5']); expect(sidAt(f.cb, '2,5')).toBeTruthy(); expect(wordsAt(f.cb, '2,5')).toMatch(/One glyph alone/);
    expect(wordsAt(f.cb, '4,5')).toEqual(['fire', 'seek']);
    f.unit(id).pos = '3,5'; evoke(f, f.pc, '3,5', '9,5'); expect(f.unit(f.foe.id).hp).toBeLessThan(500);
  });
  it('the story\'s stored 1.4 glyphs survive the migration with no stroke (SIGIL_REV unchanged)', () => {
    const s = { glyphs: [old('gl1', 'fire', '4,5', 'u1')], zones: [], sigilV: SIGIL_REV };
    migrateStorySigil(s); expect(s.glyphs.length).toBe(1); expect((s.glyphs[0] as any).strokeId).toBeUndefined();
  });
});

describe('strokes on the area map (g.story.glyphs; rules 1.10)', () => {
  const sheetOf = (name: string, words: string[]): Sheet => { const a = ARCHETYPES.find((x: any) => x.id === 'sigilist')!; return { name, portrait: '', origin: 'Central City', kit: 'sigil', sigils: words, traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} } as Sheet; };
  const start = () => {
    let g: GameState = newGame('ROOM', { id: 'host', name: 'Leon' }, 'strokes');
    g = apply(g, { type: 'char/add', sheet: sheetOf('Ilse', ['fire', 'seek']) }, 'host');
    g = apply(g, { type: 'session/start' }, 'host');
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'Open.' } as any }, 'host');
    return { g, id: Object.keys(g.characters)[0] };
  };
  it('the stroke ids are stored with the story\'s glyphs; the default extends, a "new" pick keeps two touching glyphs apart', () => {
    for (const pick of [undefined, 'new']) {
      let { g, id } = start(); const at = positionsOf(g)[id], [x, y] = at.split(',').map(Number), next = (x + 1) + ',' + y;
      g = apply(g, { type: 'world/act', charId: id, act: 'draw', word: 'fire', tile: at }, 'host');
      g = apply(g, { type: 'world/act', charId: id, act: 'move', to: next, how: 'move' }, 'host');
      g = apply(g, { type: 'world/act', charId: id, act: 'draw', word: 'seek', tile: next, ...(pick ? { stroke: pick } : {}) } as any, 'host');
      const ids = g.story.glyphs!.map((gl) => gl.strokeId);
      expect(ids.every(Boolean)).toBe(true);
      if (pick) expect(ids[0]).not.toBe(ids[1]); else expect(ids[0]).toBe(ids[1]);
    }
  });
});

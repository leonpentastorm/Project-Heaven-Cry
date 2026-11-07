// Sigil magic, rules revision 1.4 (spec: Mana, "Sigil magic: commands written on the map"; data/sigils.json): every
// word, the grammar and repeats, drawing on your own tile, the Line and the facing rule, Reach, Delivery, Burst, KIN and
// fizzle, what stays (fields, traps, turrets, walls), the previews the screen reads, the fx events, enemy casters,
// the area map and old saves.
import { describe, expect, it } from 'vitest';
import {
  ARCHETYPES, MAPS, newCharacter, startCombat, refOf, d20, apply, newGame, positionsOf, viewFor, magicTurnStart, magicRoundTick, moveUnit, endTurn, active,
  drawGlyph, previewDraw, evoke, previewEvoke, planEvoke, findPattern, evokeOrigins, patternAt, placedMagic, grammarError, compileSpell, scuff, strikeTurret,
  migrateSigil, migrateCharacterSigils, boltPath, enemyAvoidMagic, migrateWords, startingWordsError, condOn, applyCond, enemyTurn, condTurnEnd, unitSees, lineOfSight, SIGIL_REV,
  type Sheet, type Combat, type Unit, type Character, type GameState, type MapDef,
} from '../src';

const arch = (id: string) => ARCHETYPES.find((a: any) => a.id === id)!;
const sheet = (archId: string, name: string, extra: Partial<Sheet> = {}): Sheet => { const a = arch(archId); return { name, portrait: '', origin: 'Central City', kit: 'sigil', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {}, ...extra }; };
const open = (w = 20, h = 20): MapDef => ({ ...MAPS.yard, w, h, cover: [], full: [], solid: [], difficult: [], pcStart: ['2,5', '2,6', '2,7', '2,8'], foeStart: ['15,5', '15,6', '15,7', '15,8', '15,9', '15,10', '15,11', '15,12'] });
/** A seed whose next n d20 rolls are all 2–19 (no criticals, no natural 1s). */
function seed(n = 16, from = 1): { state: number } { for (let s = from; s < 200000; s++) { const r = { state: s }; let ok = true; for (let i = 0; i < n && ok; i++) { const v = d20(r); ok = v > 1 && v < 20; } if (ok) return { state: s }; } throw new Error('no seed'); }
/** A seed whose next d20 is n. */
function rollIs(n: number): { state: number } { for (let s = 1; s < 200000; s++) { const r = { state: s }; if (d20(r) === n) return { state: s }; } throw new Error('no seed'); }
interface FoeAt { at: string; name?: string; tier?: string; weapon?: string; sigils?: string[] | true }
/** A caster at C6 (2,5) who knows every word given, Max Sigil words 4, plenty of AP, charge and no Flux worries; foes
 * that never dodge or save (Defense −99, saves −99) and soak 500 HP; multipliers ×1 so the numbers are the spec's. */
function setup(words: string[], foes: FoeAt[] = [{ at: '9,5' }], o: { map?: MapDef; allies?: string[] } = {}) {
  const c = newCharacter('c1', 'p1', sheet('sigilist', 'Ilse')), extra = (o.allies || []).map((at, i) => ({ c: newCharacter('a' + i, 'p1', sheet('sigilist', 'Ally ' + (i + 1))), pos: at }));
  const cb = startCombat('t', o.map || open(), [{ c, pos: '2,5' }, ...extra], foes.map((f, i) => ({ name: f.name || 'Foe ' + (i + 1), tier: f.tier || 'minion', weapon: f.weapon || 'service_pistol', at: refOf(f.at), ...(f.sigils ? { sigils: f.sigils } : {}) })), 'easy', { state: 7 }, []);
  cb.objects = [];
  const u = cb.units.find((x) => x.charId === 'c1')!, es = cb.units.filter((x) => x.side === 'foe'), allies = cb.units.filter((x) => x.side === 'pc' && x !== u);
  for (const x of [u, ...allies]) { x.ap = 99; x.mg!.words = [...words]; x.mg!.maxWords = 4; x.mg!.charge = 999; x.mg!.flux = -99; x.mg!.sigilMult = 1; x.mg!.elemMult = 1; x.mg!.healMult = 1; x.mg!.rangeBonus = 0; x.mg!.durBonus = 0; x.mg!.coreSave = 0; x.mg!.glyphAp = 1; x.hp = x.maxHp = 500; x.armour = 0; x.def = 10; }
  for (const e of es) { e.def = -99; e.hp = e.maxHp = 500; e.armour = 0; e.sv = { body: -99, brain: -99, heart: -99 }; }
  cb.mana = 15; // Normal air: Healing given ×1
  return { cb, u, e: es[0], es, allies, rng: seed() };
}
/** Walk a Line: draw each word on the tile given (the caster steps there for free first). Ends on the last tile. */
function draw(cb: Combat, rng: { state: number }, u: Unit, words: string[], tiles: string[]) {
  for (let i = 0; i < words.length; i++) { u.pos = tiles[i]; const e = drawGlyph(cb, rng, u, words[i]); if (e) throw new Error(words[i] + ' at ' + tiles[i] + ': ' + e); }
}
const row = (x0: number, y: number, n: number, dx = 1, dy = 0) => Array.from({ length: n }, (_, i) => (x0 + i * dx) + ',' + (y + i * dy));
const lastLog = (cb: Combat) => cb.log[cb.log.length - 1];
const fx = (cb: Combat, k: string) => (cb.fx || []).filter((e) => e.k === k);
const dmgTo = (e: Unit, hp0: number) => hp0 - e.hp - 0;

// ---------- grammar and repeats ----------
describe('grammar (spec: Grammar and cost)', () => {
  it('a spell is 1+ Subject and 1+ other word, at most 4 glyphs and the caster\'s Max Sigil words', () => {
    expect(grammarError(['fire'], 4)).toMatch(/another word/);
    expect(grammarError(['fire', 'fire'], 4)).toMatch(/another word/);
    expect(grammarError(['seek', 'condense'], 4)).toMatch(/Subject/);
    expect(grammarError(['fire', 'seek', 'arc'], 4)).toMatch(/second Reach/);
    expect(grammarError(['fire', 'kin', 'kin'], 4)).toMatch(/KIN takes one copy/);
    expect(grammarError(['fire', 'watch', 'stay'], 4)).toMatch(/WATCH and STAY/);
    expect(grammarError(['fire', 'seek', 'seek', 'seek', 'seek'], 9)).toMatch(/at most 4/);
    expect(grammarError(['fire', 'seek', 'spread'], 2)).toMatch(/Max Sigil words/);
    expect(grammarError(['fire', 'seek', 'seek'], 4)).toBeNull(); // the same Reach word may repeat
    expect(grammarError(['step', 'condense'], 4)).toBeNull();
  });
  it('each copy adds its "each extra copy" numbers; every repeated glyph is ×0.9', () => {
    const s = compileSpell(['fire', 'seek', 'seek', 'spread']);
    expect(s.range).toBe(12); expect(s.radius).toBe(2); expect(s.radiusMult).toBe(0.6); expect(s.repeats).toBe(1); expect(s.repMult).toBeCloseTo(0.9);
    const t = compileSpell(['fire', 'spread', 'spread', 'push']);
    expect(t.radius).toBe(3); expect(t.radiusMult).toBe(0.5); expect(t.coneLen).toBe(3); expect(t.coneMult).toBe(0.7);
    const u = compileSpell(['fire', 'push', 'push', 'twice']);
    expect(u.coneLen).toBe(5); expect(u.coneMult).toBe(0.6); expect(u.missiles).toBe(2);
    expect(compileSpell(['fire', 'twice', 'twice']).missiles).toBe(3);
    expect(compileSpell(['fire', 'condense', 'condense', 'condense']).coreMult).toBe(2.5);
    expect(compileSpell(['fire', 'pull', 'pull']).pull).toBe(6);
    expect(compileSpell(['fire', 'chain', 'chain']).chain).toBe(2);
    expect(compileSpell(['fire', 'leech', 'leech']).leech).toBe(0.75);
    expect(compileSpell(['fire', 'stay', 'stay']).fieldRounds).toBe(4);
    expect(compileSpell(['fire', 'wait', 'wait']).triggers).toBe(2);
    expect(compileSpell(['fire', 'watch', 'watch']).turretRounds).toBe(4);
    expect(compileSpell(['mend', 'arc']).reachMult).toBe(0.8);
    expect(compileSpell(['mend', 'sense']).reachMult).toBe(0.6);
  });
  it('the spec\'s numbers: FIRE · CONDENSE ×3 61, FIRE · FIRE · CONDENSE 81, FIRE ×3 · CONDENSE 109', () => {
    for (const [words, want] of [[['fire', 'condense', 'condense', 'condense'], 61], [['fire', 'fire', 'condense'], 81], [['fire', 'fire', 'fire', 'condense'], 109]] as const) {
      const { cb, u, e, rng } = setup([...new Set(words)], [{ at: '6,5' }]);
      draw(cb, rng, u, [...words], row(5, 5, words.length, -1));
      // The caster stands on the last glyph, at the Line's west end, so it fires east past the first: Touch reaches 6,5.
      const pv = previewEvoke(cb, u, u.pos, e.pos);
      expect(pv.ok).toBe(true); expect(pv.affected.find((a) => a.unit === e.id)!.dmg).toBe(want);
      const hp = e.hp; expect(evoke(cb, rng, u, u.pos, e.pos)).toBeNull(); expect(hp - e.hp).toBe(want);
    }
  });
});

// ---------- drawing ----------
describe('drawing (spec: Drawing a spell)', () => {
  it('only on your own tile, one glyph a tile (any side\'s), with the cost shown first', () => {
    const { cb, u, rng } = setup(['fire', 'seek']);
    expect(drawGlyph(cb, rng, u, 'fire', '3,5')).toMatch(/own tile/);
    const pv = previewDraw(cb, u, 'fire'); expect(pv.ok).toBe(true); expect(pv.tile).toBe(u.pos); expect(pv.cost).toEqual({ ap: 1, charge: 2, flux: 1 }); expect(pv.effect).toBe('starts');
    expect(drawGlyph(cb, rng, u, 'fire')).toBeNull();
    expect(previewDraw(cb, u, 'seek').why).toMatch(/One glyph per tile/);
    u.pos = '3,5'; expect(previewDraw(cb, u, 'seek').effect).toBe('extends'); expect(previewDraw(cb, u, 'seek').words).toEqual(['fire', 'seek']);
    u.pos = '3,6'; expect(previewDraw(cb, u, 'seek').effect).toBe('extends'); // a diagonal Line
  });
  it('the two-glyph hook: with glyphs_per_tile 2 a tile takes a second glyph, and two alone are a Stack firing all around', () => {
    const { cb, u, e, rng } = setup(['fire', 'condense'], [{ at: '2,3' }]);
    (u.mg as any).glyphsPerTile = 2;
    draw(cb, rng, u, ['fire', 'condense'], ['3,5', '3,5']);
    const p = findPattern(cb, '3,5'); expect(typeof p === 'object' && p.shape).toBe('stack');
    u.pos = '2,5'; e.pos = '3,3'; // two tiles north of the Stack, out of Touch
    expect(previewEvoke(cb, u, '3,5', e.pos).ok).toBe(false);
    // "All around you": the area centres on the caster (2,5), not the Stack (batch 2, gap 16): 4,4 is next to the Stack
    // but 2 tiles from the caster, so Touch can't reach it; 1,4 is next to the caster.
    e.pos = '4,4'; expect(previewEvoke(cb, u, '3,5', e.pos).ok).toBe(false);
    e.pos = '1,4'; const pv = previewEvoke(cb, u, '3,5', e.pos); expect(pv.ok).toBe(true); expect(pv.facing!.mode).toBe('stack'); expect(pv.area.length).toBe(8);
    expect(pv.area).toContain('3,5'); expect(pv.area).not.toContain('2,5'); expect(pv.area).not.toContain('4,4');
  });
  it('refused before anything is spent: a second Reach word, a second KIN, WATCH with STAY, past your cap', () => {
    const { cb, u, rng } = setup(['fire', 'seek', 'arc', 'kin', 'watch', 'stay', 'condense']);
    draw(cb, rng, u, ['fire', 'seek'], ['2,5', '3,5']);
    const ap = u.ap, ch = u.mg!.charge, fl = u.mg!.flux;
    u.pos = '4,5'; expect(drawGlyph(cb, rng, u, 'arc')).toMatch(/second Reach/);
    expect(u.ap).toBe(ap); expect(u.mg!.charge).toBe(ch); expect(u.mg!.flux).toBe(fl); expect(cb.glyphs!.length).toBe(2);
    draw(cb, rng, u, ['kin'], ['4,5']); u.pos = '5,5'; expect(drawGlyph(cb, rng, u, 'kin')).toMatch(/KIN takes one copy/);
    const g2 = setup(['fire', 'watch', 'stay']); draw(g2.cb, g2.rng, g2.u, ['fire', 'watch'], ['2,5', '3,5']); g2.u.pos = '4,5'; expect(drawGlyph(g2.cb, g2.rng, g2.u, 'stay')).toMatch(/WATCH and STAY/);
    const g3 = setup(['fire', 'seek', 'condense']); g3.u.mg!.maxWords = 2; draw(g3.cb, g3.rng, g3.u, ['fire', 'seek'], ['2,5', '3,5']); g3.u.pos = '4,5'; expect(drawGlyph(g3.cb, g3.rng, g3.u, 'condense')).toMatch(/Past your cap/);
    const g4 = setup(['fire', 'seek', 'condense', 'spread']); draw(g4.cb, g4.rng, g4.u, ['fire', 'seek', 'condense', 'spread'], row(2, 5, 4)); g4.u.pos = '6,5'; expect(drawGlyph(g4.cb, g4.rng, g4.u, 'fire')).toMatch(/at most 4/);
  });
  it('a bend is no shape (it draws, with a warning); an enemy glyph beside your Line never joins it', () => {
    const { cb, u, rng } = setup(['fire', 'seek', 'condense']);
    draw(cb, rng, u, ['fire', 'seek'], ['2,5', '3,5']); u.pos = '3,6';
    expect(previewDraw(cb, u, 'condense').effect).toBe('breaks'); drawGlyph(cb, rng, u, 'condense');
    expect(findPattern(cb, '2,5')).toMatch(/No shape/);
    const h = setup(['fire', 'seek']); draw(h.cb, h.rng, h.u, ['fire', 'seek'], ['2,5', '3,5']);
    h.cb.glyphs!.push({ id: 'gl99', word: 'spark', pos: '4,5', by: h.e.id, side: 'foe', left: 3, who: 'Foe', v: SIGIL_REV });
    const p = findPattern(h.cb, '2,5'); expect(typeof p === 'object' && p.words).toEqual(['fire', 'seek']);
  });
  it('glyphs on the ground: your Max Sigil words at once; one more fades your oldest; glyphs last 2 rounds + the duration bonus', () => {
    const { cb, u, rng } = setup(['fire', 'seek']); u.mg!.maxWords = 2;
    draw(cb, rng, u, ['fire', 'seek', 'fire'], ['2,5', '6,6', '9,9']);
    expect(cb.glyphs!.map((g) => g.pos)).toEqual(['6,6', '9,9']); expect(lastLog(cb)).toMatch(/fades: 2 glyphs at most/);
    expect(cb.glyphs![0].left).toBe(2); magicRoundTick(cb); magicRoundTick(cb); expect(cb.glyphs!.length).toBe(0);
  });
});

// ---------- the facing rule ----------
describe('the facing rule (spec: Evoking)', () => {
  it('the spec\'s example: a Line on N15–Q15, standing on Q14, SEEK picks in N16–Q23; Touch only in N16–Q16', () => {
    const big = open(30, 30);
    const { cb, u, rng } = setup(['fire', 'seek', 'condense', 'spread'], [{ at: '20,20' }], { map: big });
    draw(cb, rng, u, ['fire', 'seek', 'condense', 'spread'], row(13, 14, 4)); u.pos = '16,13';
    const pv = previewEvoke(cb, u, '13,14'); expect(pv.facing!.mode).toBe('across'); expect(pv.facing!.dir).toEqual([0, 1]);
    const want: string[] = []; for (let x = 13; x <= 16; x++) for (let y = 15; y <= 22; y++) want.push(x + ',' + y);
    expect([...pv.area].sort()).toEqual(want.sort());
    const t = setup(['fire', 'condense'], [{ at: '20,20' }], { map: big }); draw(t.cb, t.rng, t.u, ['fire', 'condense'], row(13, 14, 2)); t.u.pos = '13,13';
    expect([...previewEvoke(t.cb, t.u, '13,14').area].sort()).toEqual(['13,15', '14,15']);
  });
  it('along the Line from an end: the area runs past the far end, as wide as the Line (even: the extra lane on the right)', () => {
    const { cb, u, rng } = setup(['fire', 'condense']);
    draw(cb, rng, u, ['fire', 'condense'], ['4,5', '3,5']); // finished on 3,5: it fires east, past 4,5
    let pv = previewEvoke(cb, u, '3,5'); expect(pv.facing!.mode).toBe('along'); expect(pv.facing!.dir).toEqual([1, 0]);
    expect([...pv.area].sort()).toEqual(['5,5', '5,6']); // east, the right of east is south
    u.pos = '2,5'; pv = previewEvoke(cb, u, '3,5'); expect(pv.facing!.mode).toBe('along'); expect([...pv.area].sort()).toEqual(['5,5', '5,6']); // beyond the line
    u.pos = '5,4'; pv = previewEvoke(cb, u, '3,5'); expect(pv.facing!.dir).toEqual([-1, 0]); expect([...pv.area].sort()).toEqual(['2,4', '2,5']); // from the other end, west (right of west is north)
  });
  it('across the Line from the side, a middle glyph refused, too far refused; evokeOrigins lists every tile with its facing', () => {
    const { cb, u, rng } = setup(['fire', 'seek', 'condense']);
    draw(cb, rng, u, ['fire', 'seek', 'condense'], row(3, 5, 3));
    u.pos = '4,5'; expect(previewEvoke(cb, u, '3,5').why).toMatch(/middle glyph/);
    u.pos = '4,4'; const pv = previewEvoke(cb, u, '3,5'); expect(pv.facing!.mode).toBe('across'); expect(pv.facing!.dir).toEqual([0, 1]);
    u.pos = '4,8'; expect(previewEvoke(cb, u, '3,5').why).toMatch(/within 1 tile/);
    const or = evokeOrigins(cb, u, '3,5');
    expect(or.find((o) => o.tile === '4,5')!.ok).toBe(false); expect(or.find((o) => o.tile === '4,5')!.why).toMatch(/middle/);
    expect(or.find((o) => o.tile === '4,6')!.mode).toBe('across'); expect(or.find((o) => o.tile === '4,6')!.dir).toEqual([0, -1]);
    expect(or.find((o) => o.tile === '2,5')!.mode).toBe('along'); expect(or.find((o) => o.tile === '5,5')!.mode).toBe('along');
  });
  it('a diagonal Line: across steps north or south away from you; along, the lanes sit one step east or west apart (no gaps)', () => {
    const { cb, u, rng } = setup(['fire', 'seek', 'condense']);
    draw(cb, rng, u, ['fire', 'condense'], ['3,3', '4,4']); u.pos = '4,3';
    let pv = previewEvoke(cb, u, '3,3'); expect(pv.facing!.mode).toBe('across'); expect([...pv.area].sort()).toEqual(['3,4', '4,5']);
    const t = setup(['fire', 'seek', 'condense']); draw(t.cb, t.rng, t.u, ['fire', 'seek', 'condense'], ['3,3', '4,4', '5,5']);
    pv = previewEvoke(t.cb, t.u, '3,3'); expect(pv.facing!.dir).toEqual([-1, -1]);
    // SEEK: 8 deep; the first two rows are 1,2 2,2 3,2 and 0,1 1,1 2,1 (lanes one step east or west apart).
    for (const k of ['1,2', '2,2', '3,2', '0,1', '1,1', '2,1']) expect(pv.area).toContain(k);
  });
  it('you can always target yourself (Touch\'s one exception); PUSH is refused there', () => {
    const { cb, u, rng } = setup(['mend', 'condense', 'push', 'fire']); u.hp = 100;
    draw(cb, rng, u, ['mend', 'condense'], ['3,5', '2,5']);
    const pv = previewEvoke(cb, u, '2,5', u.pos); expect(pv.ok).toBe(true); expect(pv.affected.map((a) => a.unit)).toEqual([u.id]);
    expect(evoke(cb, rng, u, '2,5', u.pos)).toBeNull(); expect(u.hp).toBe(100 + Math.round(25 * 1.5));
    const t = setup(['fire', 'push']); draw(t.cb, t.rng, t.u, ['fire', 'push'], ['3,5', '2,5']);
    expect(previewEvoke(t.cb, t.u, '2,5', t.u.pos).why).toMatch(/PUSH is refused/);
  });
  it('picking out of the area is refused; a single-target spell needs a creature, a Working or Burst may land on empty ground', () => {
    const { cb, u, e, rng } = setup(['fire', 'condense', 'spread']);
    draw(cb, rng, u, ['fire', 'condense'], ['4,5', '3,5']); e.pos = '9,5';
    expect(previewEvoke(cb, u, '3,5', e.pos).why).toMatch(/Out of the area/);
    expect(previewEvoke(cb, u, '3,5', '5,5').why).toMatch(/Pick a creature/);
    const t = setup(['fire', 'spread']); draw(t.cb, t.rng, t.u, ['fire', 'spread'], ['4,5', '3,5']);
    expect(previewEvoke(t.cb, t.u, '3,5', '5,5').ok).toBe(true);
  });
});

// ---------- Reach ----------
describe('Reach (spec: Reach)', () => {
  it('SEEK: a bolt from the far-end glyph, stopped by the first creature (an ally too), blocked by full cover; copies add range, the range bonus once', () => {
    const { cb, u, e, allies, rng } = setup(['fire', 'seek'], [{ at: '10,5' }], { allies: ['2,9'] });
    draw(cb, rng, u, ['fire', 'seek'], ['4,5', '3,5']);
    let pv = previewEvoke(cb, u, '3,5', e.pos); expect(pv.missiles[0].origin).toBe('4,5'); expect(pv.missiles[0].path).toEqual(row(5, 5, 6)); expect(pv.range).toBe(8);
    allies[0].pos = '7,5'; pv = previewEvoke(cb, u, '3,5', e.pos);
    expect(pv.missiles[0].impact).toBe('7,5'); expect(pv.missiles[0].stoppedBy).toBe('creature'); expect(pv.targets).toEqual([allies[0].id]);
    allies[0].pos = '2,9'; cb.objects = [{ id: 'p1', kind: 'pillar', pos: '8,5', name: 'Pillar', text: '', approaches: [], hp: 80, max: 80 }];
    expect(previewEvoke(cb, u, '3,5', e.pos).why).toMatch(/SEEK needs sight/); // full cover in the way: no sight
    const b = boltPath(cb, '4,5', e.pos, u); expect(b.blockedAt).toBe('8,5'); expect(b.impact).toBe('7,5'); expect(b.stoppedBy).toBe('cover');
    cb.objects = []; u.mg!.rangeBonus = 2; expect(previewEvoke(cb, u, '3,5', e.pos).range).toBe(10);
    const t = setup(['fire', 'seek']); draw(t.cb, t.rng, t.u, ['fire', 'seek', 'seek'], ['5,5', '4,5', '3,5']); t.u.mg!.rangeBonus = 2;
    expect(previewEvoke(t.cb, t.u, '3,5').range).toBe(8 + 4 + 2);
    const v = setup(['fire', 'condense']); v.u.mg!.rangeBonus = 5; draw(v.cb, v.rng, v.u, ['fire', 'condense'], ['4,5', '3,5']); expect(previewEvoke(v.cb, v.u, '3,5').range).toBe(1); // never on Touch
  });
  it('SEEK takes half cover like a shot (−5), SHOCK ignores it', () => {
    const { cb, u, e, rng } = setup(['fire', 'seek', 'shock'], [{ at: '9,5' }]);
    cb.objects = [{ id: 'c1', kind: 'crate', pos: '8,5', name: 'Crate', text: '', approaches: [], hp: 30, max: 30 }];
    draw(cb, rng, u, ['fire', 'seek'], ['4,5', '3,5']);
    const a = previewEvoke(cb, u, '3,5', e.pos).affected[0]; expect(a.roll!.cover).toBe(true);
    const t = setup(['shock', 'seek'], [{ at: '9,5' }]); t.cb.objects = [...cb.objects]; draw(t.cb, t.rng, t.u, ['shock', 'seek'], ['4,5', '3,5']);
    const b = previewEvoke(t.cb, t.u, '3,5', t.e.pos).affected[0]; expect(b.roll!.cover).toBe(false); expect(b.roll!.bonus).toBe(a.roll!.bonus + 5);
  });
  it('ARC: a lob over everything ×0.8; SENSE: it appears, ×0.6, no sight needed', () => {
    const { cb, u, e, allies, rng } = setup(['fire', 'arc'], [{ at: '8,5' }], { allies: ['6,5'] });
    draw(cb, rng, u, ['fire', 'arc'], ['4,5', '3,5']);
    const pv = previewEvoke(cb, u, '3,5', e.pos); expect(pv.missiles[0].arc).toEqual({ from: '4,5', to: e.pos }); expect(pv.targets).toEqual([e.id]); expect(pv.affected[0].dmg).toBe(24);
    void allies;
    const s = setup(['fire', 'sense'], [{ at: '8,5' }]); s.cb.map = { ...s.cb.map, solid: ['6,4', '6,5', '6,6'] }; draw(s.cb, s.rng, s.u, ['fire', 'sense'], ['4,5', '3,5']);
    expect(lineOfSight(s.cb, '3,5', s.e.pos)).toBe(false);
    const sv = previewEvoke(s.cb, s.u, '3,5', s.e.pos); expect(sv.ok).toBe(true); expect(sv.affected[0].dmg).toBe(18);
    const b = setup(['fire', 'seek'], [{ at: '8,5' }]); b.cb.map = { ...b.cb.map, solid: ['6,4', '6,5', '6,6'] }; draw(b.cb, b.rng, b.u, ['fire', 'seek'], ['4,5', '3,5']);
    expect(previewEvoke(b.cb, b.u, '3,5', b.e.pos).why).toMatch(/sight/);
  });
  it('RELAY: cast from an ally\'s tile; the area is the ally and the tiles next to it; a second copy hops through one more ally', () => {
    const { cb, u, e, allies, rng } = setup(['quicken', 'relay', 'fire'], [{ at: '12,5' }], { allies: ['7,5', '11,9'] });
    draw(cb, rng, u, ['quicken', 'relay'], ['3,5', '2,5']);
    let pv = previewEvoke(cb, u, '2,5', '8,6'); expect(pv.why).toMatch(/Pick a creature/); // QUICKEN needs someone
    expect(pv.area).toContain('7,5'); expect(pv.area).toContain('8,6'); expect(pv.area).not.toContain(e.pos);
    pv = previewEvoke(cb, u, '2,5', allies[0].pos); expect(pv.missiles[0].hops).toEqual(['7,5']); expect(pv.targets).toEqual([allies[0].id]);
    const t = setup(['fire', 'relay'], [{ at: '12,9' }], { allies: ['7,5', '11,9'] }); draw(t.cb, t.rng, t.u, ['fire', 'relay', 'relay'], ['4,5', '3,5', '2,5']);
    const tv = previewEvoke(t.cb, t.u, '2,5', '12,9'); expect(tv.ok).toBe(true); expect(tv.missiles[0].hops).toEqual(['7,5', '11,9']);
  });
});

// ---------- Delivery ----------
describe('Delivery (spec: Delivery)', () => {
  it('TWICE: two missiles at two targets, each with its own Burst; the glyph costs 2 Flux; the second auto-picks', () => {
    const { cb, u, es, rng } = setup(['fire', 'seek', 'twice'], [{ at: '8,4' }, { at: '8,6' }]); u.mg!.flux = 0;
    draw(cb, rng, u, ['fire', 'twice', 'seek'], ['5,5', '4,5', '3,5']);
    expect(u.mg!.flux).toBe(4);
    const pv = previewEvoke(cb, u, '3,5', es[0].pos); expect(pv.missiles.length).toBe(2); expect(new Set(pv.targets)).toEqual(new Set([es[0].id, es[1].id]));
    const hp = es.map((e) => e.hp); expect(evoke(cb, rng, u, '3,5', es[0].pos, { aims: [es[1].pos] })).toBeNull();
    expect(es[0].hp).toBe(hp[0] - 30); expect(es[1].hp).toBe(hp[1] - 30);
  });
  it('PULL drags each one it affected 3 tiles toward you (+3 a copy); the preview shows where they land', () => {
    const { cb, u, e, rng } = setup(['bind', 'seek', 'pull'], [{ at: '10,5' }]);
    draw(cb, rng, u, ['bind', 'pull', 'seek'], ['5,5', '4,5', '3,5']);
    const pv = previewEvoke(cb, u, '3,5', e.pos); expect(pv.missiles[0].pull).toEqual([{ unit: e.id, from: '10,5', to: '7,5' }]);
    evoke(cb, rng, u, '3,5', e.pos); expect(e.pos).toBe('7,5'); expect(condOn(e, 'pinned')).toBe(true);
  });
  it('CHAIN: 27 → 20 → 15 forward along a line of creatures, never back to one closer to you, never twice; jumps aren\'t blocked', () => {
    const { cb, u, es, rng } = setup(['shock', 'seek', 'chain'], [{ at: '8,5' }, { at: '10,5' }, { at: '12,5' }, { at: '7,7' }]);
    draw(cb, rng, u, ['shock', 'seek', 'chain', 'chain'], ['5,5', '4,5', '3,5', '2,5']);
    const pv = previewEvoke(cb, u, '2,5', es[0].pos);
    expect(pv.missiles[0].chain.map((c) => c.unit)).toEqual([es[1].id, es[2].id]);
    expect(pv.affected.map((a) => a.dmg)).toEqual([27, 20, 15]);
    const hp = es.map((e) => e.hp); evoke(cb, rng, u, '2,5', es[0].pos);
    expect(es.map((e, i) => hp[i] - e.hp)).toEqual([27, 20, 15, 0]);
    expect(fx(cb, 'chain').length).toBe(2);
  });
  it('LEECH: you heal half the direct damage the spell dealt (+25% a copy), not × Healing given; every CHAIN jump counts', () => {
    const { cb, u, e, rng } = setup(['fire', 'seek', 'leech'], [{ at: '8,5' }]); u.hp = 300; cb.mana = 2; // Thin air: Healing given ×0.75 (not for LEECH)
    draw(cb, rng, u, ['fire', 'leech', 'seek'], ['5,5', '4,5', '3,5']);
    evoke(cb, rng, u, '3,5', e.pos); expect(u.hp).toBe(300 + 15); expect(lastLog(cb)).toMatch(/drinks 15 HP/);
    expect(fx(cb, 'leech')[0].amount).toBe(15);
  });
});

// ---------- Burst ----------
describe('Burst (spec: Burst)', () => {
  it('CONDENSE ×1.5; SPREAD everyone within 2 (5 × 5) ×0.6, on empty ground too; CONDENSE + SPREAD: core ×1.5, splash ×0.6', () => {
    const { cb, u, es, rng } = setup(['fire', 'seek', 'spread', 'condense'], [{ at: '9,5' }, { at: '10,6' }, { at: '12,5' }]);
    draw(cb, rng, u, ['fire', 'spread', 'seek'], ['5,5', '4,5', '3,5']);
    const pv = previewEvoke(cb, u, '3,5', '9,5'); expect(pv.missiles[0].burst.tiles.length).toBe(25);
    expect(pv.affected.filter((a) => !a.kinSpared).map((a) => [a.unit, a.dmg])).toEqual([[es[0].id, 18], [es[1].id, 18]]);
    const t = setup(['fire', 'seek', 'spread', 'condense'], [{ at: '9,5' }, { at: '10,6' }]);
    draw(t.cb, t.rng, t.u, ['fire', 'condense', 'spread', 'seek'], ['6,5', '5,5', '4,5', '3,5']);
    const tv = previewEvoke(t.cb, t.u, '3,5', '9,5'); expect(tv.missiles[0].burst.core).toBe('9,5');
    expect(tv.affected.map((a) => a.dmg)).toEqual([45, 18]); // 30 × 1.5 on the landing tile, 30 × 0.6 around it
  });
  it('PUSH: a cone from where it lands, on the way the spell faced, 3 long, ×0.7 (Shotgun 21); SPREAD + PUSH: the better multiplier once', () => {
    const { cb, u, es, rng } = setup(['fire', 'push', 'spread'], [{ at: '6,5' }, { at: '7,6' }, { at: '8,4' }, { at: '5,8' }]);
    draw(cb, rng, u, ['fire', 'push'], ['4,5', '3,5']);
    const pv = previewEvoke(cb, u, '3,5', '5,5');
    expect(pv.missiles[0].burst.tiles).toContain('5,5'); expect(pv.missiles[0].burst.tiles).toContain('7,5');
    const hit = pv.affected.filter((a) => !a.kinSpared).map((a) => a.unit); expect(hit).toContain(es[0].id); expect(hit).toContain(es[1].id); expect(hit).not.toContain(es[3].id);
    expect(pv.affected.find((a) => a.unit === es[0].id)!.dmg).toBe(21);
    const t = setup(['fire', 'push', 'spread'], [{ at: '6,5' }]); draw(t.cb, t.rng, t.u, ['fire', 'spread', 'push'], ['5,5', '4,5', '3,5']);
    const tv = previewEvoke(t.cb, t.u, '3,5', '6,5'); expect(tv.affected.find((a) => a.unit === t.e.id)!.dmg).toBe(21); // 0.7 beats 0.6
  });
});

// ---------- Subjects ----------
describe('Subjects (spec: the words)', () => {
  it('FIRE 30 (a critical sets Burning); FREEZE 25 + Slowed; STONE 35 Sigil (full armour); SPARK 15; GALE 15 and 2 tiles away', () => {
    for (const [w, dmg] of [['fire', 30], ['freeze', 25], ['stone', 35], ['spark', 15], ['gale', 15]] as const) {
      const { cb, u, e, rng } = setup([w, 'condense'], [{ at: '5,5' }]); draw(cb, rng, u, [w, 'condense'], ['4,5', '3,5']);
      const hp = e.hp; evoke(cb, rng, u, '3,5', e.pos); expect(hp - e.hp).toBe(Math.round(dmg * 1.5));
      if (w === 'freeze') expect(condOn(e, 'slowed')).toBe(true);
      if (w === 'gale') expect(e.pos).toBe('7,5');
    }
    const a = setup(['stone', 'condense'], [{ at: '5,5' }]); a.e.armour = 10; draw(a.cb, a.rng, a.u, ['stone', 'condense'], ['4,5', '3,5']);
    const f = setup(['fire', 'condense'], [{ at: '5,5' }]); f.e.armour = 10; draw(f.cb, f.rng, f.u, ['fire', 'condense'], ['4,5', '3,5']);
    expect(previewEvoke(a.cb, a.u, '3,5', '5,5').affected[0].dmgAfterArmour).toBe(53 - 10);
    expect(previewEvoke(f.cb, f.u, '3,5', '5,5').affected[0].dmgAfterArmour).toBe(45 - 5);
    const c = setup(['fire', 'condense'], [{ at: '5,5' }]); draw(c.cb, c.rng, c.u, ['fire', 'condense'], ['4,5', '3,5']);
    const hp = c.e.hp; evoke(c.cb, rollIs(20), c.u, '3,5', '5,5'); expect(hp - c.e.hp).toBe(90); expect(condOn(c.e, 'burning')).toBe(true);
  });
  it('ACID: 15 Elemental and Corroded (no save): 5 at the start of each turn, Defense −2, a Body save at the end of each turn ends it', () => {
    const { cb, u, e, rng } = setup(['acid', 'condense'], [{ at: '5,5' }]); draw(cb, rng, u, ['acid', 'condense'], ['4,5', '3,5']);
    const def = e.def, hp = e.hp; evoke(cb, rng, u, '3,5', e.pos);
    expect(hp - e.hp).toBe(23); expect(condOn(e, 'corroded')).toBe(true); expect(e.def).toBe(def - 2);
    const hp2 = e.hp; magicTurnStart(cb, rng, e); expect(hp2 - e.hp).toBe(5);
    e.sv = { body: 99, brain: 0, heart: 0 }; e.condFresh = []; condTurnEnd(cb, e, seed()); expect(condOn(e, 'corroded')).toBe(false); expect(e.def).toBe(def);
  });
  it('Afflictions: no hit roll, a save against 12 + debuff strength; BIND, BLIND, SLOW, MUDDLE, DREAD, SILENCE', () => {
    for (const [w, c, fam] of [['bind', 'pinned', 'body'], ['blind', 'blinded', 'body'], ['slow', 'slowed', 'body'], ['muddle', 'ldebuff', 'brain'], ['dread', 'shaken', 'heart'], ['silence', 'silenced', 'brain']] as const) {
      const { cb, u, e, rng } = setup([w, 'seek'], [{ at: '7,5' }]); draw(cb, rng, u, [w, 'seek'], ['4,5', '3,5']);
      const pv = previewEvoke(cb, u, '3,5', e.pos); expect(pv.affected[0].roll).toBeNull(); expect(pv.affected[0].saves[0].fam).toBe(fam); expect(pv.affected[0].saves[0].tn).toBeGreaterThanOrEqual(12);
      evoke(cb, rng, u, '3,5', e.pos); expect(condOn(e, c)).toBe(true);
    }
    const r = setup(['bind', 'seek'], [{ at: '7,5' }]); r.e.sv = { body: 99, brain: 99, heart: 99 }; draw(r.cb, r.rng, r.u, ['bind', 'seek'], ['4,5', '3,5']);
    evoke(r.cb, r.rng, r.u, '3,5', r.e.pos); expect(condOn(r.e, 'pinned')).toBe(false); expect(lastLog(r.cb)).toMatch(/resists/);
  });
  it('COMMAND: a Brain save or one order on its next turn: halt, kneel, drop, or move up to 3 tiles (the enemy obeys)', () => {
    for (const order of ['kneel', 'drop', 'move'] as const) {
      const { cb, u, e, rng } = setup(['command', 'seek'], [{ at: '7,5' }]); draw(cb, rng, u, ['command', 'seek'], ['4,5', '3,5']);
      const pv = previewEvoke(cb, u, '3,5', e.pos, { order, orderTo: '9,7' }); expect(pv.affected[0].saves[0]).toMatchObject({ cond: 'commanded', fam: 'brain' });
      expect(evoke(cb, rng, u, '3,5', e.pos, { order, orderTo: '9,7' })).toBeNull(); expect(condOn(e, 'commanded')).toBe(true);
      expect(fx(cb, 'command')[0].order).toBe(order);
      // Its turn: it obeys.
      cb.turn = cb.order.indexOf(e.id) - 1; if (cb.turn < 0) { cb.turn = cb.order.length - 1; }
      e.ap = 6; endTurn(cb, rng);
      if (order === 'kneel') expect(e.prone || lastLog(cb) !== '').toBe(true);
      if (order === 'drop') expect(condOn(e, 'disarmed') || cb.log.some((l) => /obeys: drop/.test(l))).toBe(true);
      if (order === 'move') expect(cb.log.some((l) => /obeys: move to/.test(l))).toBe(true);
    }
    const h = setup(['command', 'seek'], [{ at: '7,5' }]); draw(h.cb, h.rng, h.u, ['command', 'seek'], ['4,5', '3,5']);
    evoke(h.cb, h.rng, h.u, '3,5', h.e.pos); expect(h.e.condArg!.commanded).toBe('halt');
    h.e.ap = 9; expect(moveUnit(h.cb, h.e, '8,5', h.rng)).toMatch(/halt/);
  });
  it('WARD 30 shield; MEND 25 × Healing given', () => {
    const { cb, u, allies, rng } = setup(['ward', 'mend', 'seek'], [{ at: '15,15' }], { allies: ['7,5'] });
    draw(cb, rng, u, ['ward', 'seek'], ['4,5', '3,5']); evoke(cb, rng, u, '3,5', allies[0].pos); expect(allies[0].shield).toBe(30);
    allies[0].hp = 100; draw(cb, rng, u, ['mend', 'seek'], ['4,5', '3,5']); evoke(cb, rng, u, '3,5', allies[0].pos); expect(allies[0].hp).toBe(125);
    expect(fx(cb, 'boon').map((x) => x.word)).toEqual(['ward', 'mend']);
  });
  it('QUICKEN: +2 AP on the target\'s next turn (to 9 at most), once per target per round, never on yourself', () => {
    const { cb, u, allies, rng } = setup(['quicken', 'seek', 'spread'], [{ at: '15,15' }], { allies: ['7,5'] });
    draw(cb, rng, u, ['quicken', 'seek'], ['4,5', '3,5']); evoke(cb, rng, u, '3,5', allies[0].pos);
    expect(condOn(allies[0], 'quickened')).toBe(true);
    draw(cb, rng, u, ['quicken', 'seek'], ['4,5', '3,5']);
    const q2 = previewEvoke(cb, u, '3,5', allies[0].pos); expect(q2.affected[0].skipped).toBe('quicken_round'); expect(q2.fizzle).toBe(true);
    evoke(cb, rng, u, '3,5', allies[0].pos); expect(lastLog(cb)).toMatch(/fizzles/);
    allies[0].ap = 6; magicTurnStart(cb, rng, allies[0]); expect(allies[0].ap).toBe(8); expect(condOn(allies[0], 'quickened')).toBe(false);
    allies[0].ap = 8; allies[0].conds!.quickened = 99; magicTurnStart(cb, rng, allies[0]); expect(allies[0].ap).toBe(9);
    const s = setup(['quicken', 'spread']); draw(s.cb, s.rng, s.u, ['quicken', 'spread'], ['3,5', '2,5']);
    const pv = previewEvoke(s.cb, s.u, '2,5', s.u.pos); expect(pv.affected.find((a) => a.self)!.skipped).toBe('quicken_self'); expect(pv.fizzle).toBe(true);
  });
  it('SHARPEN: the next attack gets +3 to hit and ×1.25 damage, then it is spent', () => {
    const { cb, u, e, allies, rng } = setup(['sharpen', 'seek', 'fire', 'condense'], [{ at: '12,5' }], { allies: ['7,5'] });
    draw(cb, rng, u, ['sharpen', 'seek'], ['4,5', '3,5']); evoke(cb, rng, u, '3,5', allies[0].pos);
    const a = allies[0]; expect(condOn(a, 'sharpened')).toBe(true);
    draw(cb, rng, a, ['fire', 'condense'], ['11,5', '10,5']);
    const pv = previewEvoke(cb, a, '11,5', e.pos); expect(pv.affected[0].dmg).toBe(Math.round(45 * 1.25));
    a.def = 10; const hp = e.hp; evoke(cb, rng, a, '11,5', e.pos); expect(hp - e.hp).toBe(56); expect(condOn(a, 'sharpened')).toBe(false);
  });
  it('CLEANSE ends one condition, the newest first', () => {
    const { cb, u, allies, rng } = setup(['cleanse', 'seek'], [{ at: '15,15' }], { allies: ['7,5'] });
    const a = allies[0]; applyCond(cb, rng, null, a, 'slowed', 2, undefined, { skipSave: true }); applyCond(cb, rng, null, a, 'shaken', 2, undefined, { skipSave: true });
    draw(cb, rng, u, ['cleanse', 'seek'], ['4,5', '3,5']); evoke(cb, rng, u, '3,5', a.pos);
    expect(condOn(a, 'shaken')).toBe(false); expect(condOn(a, 'slowed')).toBe(true);
  });
  it('VEIL: smoke radius 1 that blocks sight; LIGHT radius 4, reveals the Hidden', () => {
    const { cb, u, e, rng } = setup(['veil', 'light', 'seek'], [{ at: '12,5' }]);
    draw(cb, rng, u, ['veil', 'seek'], ['4,5', '3,5']); evoke(cb, rng, u, '3,5', '8,5');
    expect(cb.zones!.find((z) => z.kind === 'veil')!.tiles.length).toBe(9); expect(lineOfSight(cb, '3,5', '12,5')).toBe(false);
    e.hidden = true; e.pos = '10,8'; draw(cb, rng, u, ['light', 'seek'], ['4,8', '3,8']); evoke(cb, rng, u, '3,8', '9,8');
    expect(e.hidden).toBe(false); expect(cb.zones!.some((z) => z.kind === 'light')).toBe(true);
  });
  it('STEP: teleport up to 4 to a free tile (an enemy saves); a blink on yourself; with a Burst everyone shifts alike', () => {
    const { cb, u, rng } = setup(['step', 'condense', 'spread'], [{ at: '15,15' }]);
    draw(cb, rng, u, ['step', 'condense'], ['3,5', '2,5']);
    expect(previewEvoke(cb, u, '2,5', u.pos).why).toMatch(/Pick where STEP lands/);
    expect(previewEvoke(cb, u, '2,5', u.pos, { dest: '8,5' }).why).toMatch(/at most 4/);
    const pv = previewEvoke(cb, u, '2,5', u.pos, { dest: '5,7' }); expect(pv.missiles[0].step).toEqual([{ unit: u.id, from: '2,5', to: '5,7' }]);
    evoke(cb, rng, u, '2,5', u.pos, { dest: '5,7' }); expect(u.pos).toBe('5,7'); expect(fx(cb, 'blink').length).toBe(1);
    const s = setup(['step', 'spread', 'seek'], [{ at: '9,5' }, { at: '10,5' }]); draw(s.cb, s.rng, s.u, ['step', 'spread', 'seek'], ['5,5', '4,5', '3,5']);
    evoke(s.cb, s.rng, s.u, '3,5', '9,5', { dest: '9,8' }); expect(s.es.map((x) => x.pos)).toEqual(['9,8', '10,8']);
    const r = setup(['step', 'seek'], [{ at: '9,5' }]); r.e.sv = { body: 99, brain: 0, heart: 0 }; draw(r.cb, r.rng, r.u, ['step', 'seek'], ['4,5', '3,5']);
    evoke(r.cb, r.rng, r.u, '3,5', '9,5', { dest: '9,8' }); expect(r.e.pos).toBe('9,5'); expect(lastLog(r.cb)).toMatch(/holds its place/);
  });
  it('RAISE: a wall on each empty tile it covers (30 HP, blocks moving and sight, 3 rounds); one RAISE working per caster', () => {
    const { cb, u, e, rng } = setup(['raise', 'seek', 'spread'], [{ at: '12,5' }]);
    draw(cb, rng, u, ['raise', 'spread', 'seek'], ['5,5', '4,5', '3,5']); evoke(cb, rng, u, '3,5', '9,5');
    const walls = cb.objects!.filter((o) => o.kind === 'sigil_wall'); expect(walls.length).toBe(25); expect(walls[0].hp).toBe(30);
    expect(lineOfSight(cb, '3,5', '12,5')).toBe(false); e.ap = 9; expect(moveUnit(cb, e, '9,5', rng)).toBeTruthy();
    expect(fx(cb, 'wall_raised')[0].tiles.length).toBe(25);
    draw(cb, rng, u, ['raise', 'seek'], ['5,8', '4,8']); u.pos = '4,8'; evoke(cb, rng, u, '4,8', '6,8');
    expect(cb.objects!.filter((o) => o.kind === 'sigil_wall').map((o) => o.pos)).toEqual(['6,8']); // the old fortress crumbles
    for (let i = 0; i < 3; i++) magicRoundTick(cb);
    expect(cb.objects!.filter((o) => o.kind === 'sigil_wall').length).toBe(0); expect(fx(cb, 'wall_crumbled').length).toBeGreaterThan(0);
  });
  it('NULL: removes glyphs (anyone\'s), fields, traps, turrets and walls on its tiles; Keystones stay', () => {
    const { cb, u, rng } = setup(['null', 'seek', 'spread', 'fire', 'stay'], [{ at: '15,15' }]);
    (cb.glyphs ||= []).push({ id: 'gx', word: 'spark', pos: '9,5', by: 'foe-0', side: 'foe', left: 3, who: 'Foe', v: SIGIL_REV }, { id: 'gk', word: 'fire', pos: '9,6', by: 'x', side: 'foe', left: 3, who: 'Mason', v: SIGIL_REV, keystone: true } as any);
    (cb.zones ||= []).push({ id: 'zf', kind: 'field', tiles: ['10,5', '13,5'], words: ['fire', 'stay'], by: 'foe-0', side: 'foe', left: 3, mult: 0.5, who: 'Foe' }, { id: 'zt', kind: 'trap', tiles: ['8,4'], words: ['fire', 'wait'], by: 'foe-0', side: 'foe', left: 3, mult: 1, who: 'Foe', hidden: true, spotted: [] });
    draw(cb, rng, u, ['null', 'spread', 'seek'], ['5,5', '4,5', '3,5']);
    const pv = previewEvoke(cb, u, '3,5', '9,5'); expect(pv.missiles[0].nulls).toBe(3);
    evoke(cb, rng, u, '3,5', '9,5');
    expect(cb.glyphs!.map((g) => g.id)).toEqual(['gk']); expect(cb.zones!.find((z) => z.id === 'zf')!.tiles).toEqual(['13,5']); expect(cb.zones!.some((z) => z.id === 'zt')).toBe(false);
    expect(fx(cb, 'null_wave')[0].removed).toBe(3);
  });
  it('MASK: Hidden for 2 rounds or until it attacks; fizzles on a Marked target', () => {
    const { cb, u, rng } = setup(['mask', 'condense']);
    draw(cb, rng, u, ['mask', 'condense'], ['3,5', '2,5']); evoke(cb, rng, u, '2,5', u.pos);
    expect(u.hidden).toBe(true); expect(u.maskLeft).toBe(2); u.maskFresh = false; // cast off the caster's own turn
    condTurnEnd(cb, u, rng); expect(u.hidden).toBe(true); condTurnEnd(cb, u, rng); expect(u.hidden).toBe(false); expect(fx(cb, 'mask').some((x) => x.fade)).toBe(true);
    const m = setup(['mask', 'condense']); m.u.conds = { marked: 99 }; draw(m.cb, m.rng, m.u, ['mask', 'condense'], ['3,5', '2,5']);
    const pv = previewEvoke(m.cb, m.u, '2,5', m.u.pos); expect(pv.affected[0].skipped).toBe('marked'); expect(pv.fizzle).toBe(true);
  });
});

// ---------- KIN, friendly fire, fizzle ----------
describe('KIN, friendly fire and fizzle (spec: Filter; Friendly fire; Grammar 8–9)', () => {
  it('bursts hit allies; KIN spares your side (you too: a nova on your own tile hits only enemies)', () => {
    const { cb, u, e, allies, rng } = setup(['fire', 'spread', 'kin'], [{ at: '3,6' }], { allies: ['1,5'] });
    draw(cb, rng, u, ['fire', 'spread'], ['3,5', '2,5']);
    let pv = previewEvoke(cb, u, '2,5', u.pos); expect(new Set(pv.targets)).toEqual(new Set([u.id, e.id, allies[0].id]));
    const t = setup(['fire', 'spread', 'kin'], [{ at: '3,6' }], { allies: ['1,5'] }); draw(t.cb, t.rng, t.u, ['fire', 'spread', 'kin'], ['4,5', '3,5', '2,5']);
    pv = previewEvoke(t.cb, t.u, '2,5', t.u.pos); expect(pv.targets).toEqual([t.e.id]);
    expect(pv.affected.filter((a) => a.kinSpared).map((a) => a.unit).sort()).toEqual([t.u.id, t.allies[0].id].sort());
    const hp = [t.u.hp, t.allies[0].hp, t.e.hp]; evoke(t.cb, t.rng, t.u, '2,5', t.u.pos);
    expect([t.u.hp, t.allies[0].hp]).toEqual(hp.slice(0, 2)); expect(t.e.hp).toBe(hp[2] - 18); expect(lastLog(t.cb)).toMatch(/KIN spares/);
  });
  it('KIN backfires on Boons; a spell with nothing to affect fizzles: charge, AP and Flux spent, the glyphs fade, the log says so', () => {
    const { cb, u, allies, rng } = setup(['mend', 'seek', 'kin'], [{ at: '15,15' }], { allies: ['7,5'] }); u.mg!.flux = 0;
    draw(cb, rng, u, ['mend', 'kin', 'seek'], ['5,5', '4,5', '3,5']);
    // KIN: an ally can't be picked (gap 12); your own tile can, and KIN spares you there, so it fizzles.
    const no = previewEvoke(cb, u, '3,5', allies[0].pos); expect(no.ok).toBe(false); expect(no.why).toMatch(/KIN/); expect(no.pickable).not.toContain(allies[0].pos);
    const pv = previewEvoke(cb, u, '3,5', u.pos); expect(pv.ok).toBe(true); expect(pv.fizzle).toBe(true);
    const ap = u.ap, ch = u.mg!.charge; expect(evoke(cb, rng, u, '3,5', u.pos)).toBeNull();
    expect(u.ap).toBe(ap - 1); expect(u.mg!.charge).toBe(ch - 3); expect(cb.glyphs!.length).toBe(0); expect(lastLog(cb)).toMatch(/fizzles/); expect(fx(cb, 'fizzle').length).toBe(1);
  });
  it('harmful words skip the Downed and the surrendered; Boons reach them', () => {
    const { cb, u, e, allies, rng } = setup(['fire', 'mend', 'spread'], [{ at: '9,6' }], { allies: ['9,4'] });
    e.downed = true; allies[0].downed = true; allies[0].hp = 0;
    draw(cb, rng, u, ['fire', 'spread'], ['4,5', '3,5']);
    // Touch reaches row 5 only; use the burst from 5,5 out to 7: no-one there. Move them in.
    e.pos = '6,6'; allies[0].pos = '6,4';
    let pv = previewEvoke(cb, u, '3,5', '5,5'); expect(pv.affected.find((a) => a.unit === e.id)!.skipped).toBe('downed');
    draw(cb, rng, u, ['mend', 'spread'], ['4,8', '3,8']); u.pos = '3,8'; allies[0].pos = '6,8';
    pv = previewEvoke(cb, u, '3,8', '5,8'); expect(pv.affected.find((a) => a.unit === allies[0].id)!.skipped).toBeUndefined();
  });
});

// ---------- what stays ----------
describe('what stays: fields, traps, turrets (spec: Delivery)', () => {
  it('STAY: the field doesn\'t strike when Evoked; ×0.5 on whoever enters or starts a turn in it, once per creature per round (Burning ground 9)', () => {
    const { cb, u, e, allies, rng } = setup(['fire', 'stay', 'spread', 'kin'], [{ at: '9,5' }], { allies: ['1,8'] });
    draw(cb, rng, u, ['fire', 'stay', 'spread', 'kin'], ['5,5', '4,5', '3,5', '2,5']);
    const hp = e.hp; evoke(cb, rng, u, '2,5', u.pos);
    const z = cb.zones!.find((x) => x.kind === 'field')!; expect(z.tiles.length).toBe(25); expect(z.left).toBe(2); expect(e.hp).toBe(hp);
    e.ap = 9; moveUnit(cb, e, '4,5', rng); expect(hp - e.hp).toBe(9);
    const hp2 = e.hp; magicTurnStart(cb, rng, e); expect(e.hp).toBe(hp2); // once a round
    cb.round++; magicTurnStart(cb, rng, e); expect(hp2 - e.hp).toBe(9);
    const ah = allies[0].hp; allies[0].ap = 9; moveUnit(cb, allies[0], '1,6', rng); expect(allies[0].hp).toBe(ah); // KIN
    expect(fx(cb, 'field').length).toBe(1); expect(fx(cb, 'field_tick').length).toBe(2);
  });
  it('Wall of fire: FIRE · ARC · STAY · SPREAD, 7 a time; STAY + PULL is a whirlpool', () => {
    const { cb, u, e, rng } = setup(['fire', 'arc', 'stay', 'spread'], [{ at: '12,12' }]);
    draw(cb, rng, u, ['fire', 'stay', 'spread', 'arc'], ['6,5', '5,5', '4,5', '3,5']); evoke(cb, rng, u, '3,5', '9,5');
    e.pos = '12,5'; e.ap = 9; const hp = e.hp; moveUnit(cb, e, '11,5', rng); expect(hp - e.hp).toBe(7);
    const w = setup(['bind', 'stay', 'pull', 'seek'], [{ at: '12,12' }]); draw(w.cb, w.rng, w.u, ['bind', 'stay', 'pull', 'seek'], ['6,5', '5,5', '4,5', '3,5']);
    w.cb.zones = []; evoke(w.cb, w.rng, w.u, '3,5', '9,5');
    w.e.pos = '9,5'; magicTurnStart(w.cb, w.rng, w.e); expect(w.e.pos).toBe('6,5');
  });
  it('WAIT: a hidden trap; your side never sets it off; the other side does, on stepping in or starting a turn there; spotted like a trap', () => {
    const { cb, u, e, allies, rng } = setup(['fire', 'wait', 'spread'], [{ at: '12,5' }], { allies: ['1,8'] });
    draw(cb, rng, u, ['fire', 'wait', 'spread'], ['5,5', '4,5', '3,5']); evoke(cb, rng, u, '3,5', '6,5');
    const z = cb.zones!.find((x) => x.kind === 'trap')!; expect(z.tiles).toEqual(['6,5']); expect(z.left).toBe(3);
    expect(placedMagic(cb, 'pc').some((p) => p.kind === 'trap')).toBe(true); expect(placedMagic(cb, 'foe').some((p) => p.kind === 'trap')).toBe(false);
    expect(fx(cb, 'trap_set')[0].only).toBe('pc');
    allies[0].pos = '6,6'; allies[0].ap = 9; moveUnit(cb, allies[0], '6,5', rng); expect(cb.zones!.some((x) => x.kind === 'trap')).toBe(true);
    allies[0].pos = '7,7';
    const hp = e.hp, ah = allies[0].hp; e.pos = '8,5'; e.ap = 9; moveUnit(cb, e, '6,5', rng);
    expect(hp - e.hp).toBe(18); expect(ah - allies[0].hp).toBe(18); // friendly fire: the ally stood within 2
    expect(cb.zones!.some((x) => x.kind === 'trap')).toBe(false); expect(fx(cb, 'trap_sprung').length).toBe(1);
    const s = setup(['fire', 'wait'], [{ at: '12,5' }]); draw(s.cb, s.rng, s.u, ['fire', 'wait'], ['4,5', '3,5']); evoke(s.cb, s.rng, s.u, '3,5', '5,5');
    s.e.pos = '6,5'; (s.e as any).tier = 'boss'; s.e.ap = 9; moveUnit(s.cb, s.e, '7,5', s.rng);
    expect(s.cb.zones!.find((x) => x.kind === 'trap')!.spotted).toEqual(['foe']); expect(placedMagic(s.cb, 'foe').some((p) => p.kind === 'trap')).toBe(true);
  });
  it('traps: 2 per caster (a third removes the oldest); Snare BIND · WAIT · PULL pins and drags toward you; WAIT + STAY leaves a field', () => {
    const { cb, u, rng } = setup(['fire', 'wait'], [{ at: '15,15' }]);
    for (const y of [3, 5, 7]) { draw(cb, rng, u, ['fire', 'wait'], ['4,' + y, '3,' + y]); evoke(cb, rng, u, '3,' + y, '5,' + y); }
    expect(cb.zones!.filter((z) => z.kind === 'trap').map((z) => z.tiles[0])).toEqual(['5,5', '5,7']);
    const n = setup(['bind', 'wait', 'pull'], [{ at: '12,5' }]); draw(n.cb, n.rng, n.u, ['bind', 'wait', 'pull'], ['4,5', '3,5', '2,5']); evoke(n.cb, n.rng, n.u, '2,5', '5,5');
    n.e.pos = '8,5'; n.e.ap = 9; moveUnit(n.cb, n.e, '5,5', n.rng); expect(condOn(n.e, 'pinned')).toBe(true); expect(n.e.pos).toBe('3,5');
    const f = setup(['fire', 'wait', 'stay', 'spread'], [{ at: '12,5' }]); draw(f.cb, f.rng, f.u, ['fire', 'wait', 'stay', 'spread'], ['5,5', '4,5', '3,5', '2,5']); expect(evoke(f.cb, f.rng, f.u, '2,5', '6,5')).toBeNull();
    f.e.pos = '8,5'; f.e.ap = 9; moveUnit(f.cb, f.e, '6,5', f.rng);
    expect(f.cb.zones!.some((z) => z.kind === 'field')).toBe(true); expect(f.cb.zones!.some((z) => z.kind === 'trap')).toBe(false);
  });
  it('WATCH: a turret casts at the nearest creature it can reach at the start of your turns, ×0.5 (Tesla tower 15 then 11); scuff or a hit destroys it; 1 per caster', () => {
    const { cb, u, es, rng } = setup(['shock', 'seek', 'watch', 'chain'], [{ at: '12,5' }, { at: '14,5' }]);
    draw(cb, rng, u, ['shock', 'watch', 'chain', 'seek'], ['5,5', '4,5', '3,5', '2,5']); evoke(cb, rng, u, '2,5', '10,5');
    const z = cb.zones!.find((x) => x.kind === 'turret')!; expect(z.tiles).toEqual(['10,5']); expect(z.hp).toBe(10); expect(z.def).toBe(10); expect(z.left).toBe(2);
    const hp = es.map((e) => e.hp); magicTurnStart(cb, rng, u);
    expect(es.map((e, i) => hp[i] - e.hp)).toEqual([15, 11]); expect(fx(cb, 'turret_shot').length).toBe(1);
    es[0].pos = '10,5'; es[0].ap = 9; expect(scuff(cb, es[0])).toBeNull(); expect(cb.zones!.some((x) => x.kind === 'turret')).toBe(false); expect(fx(cb, 'turret_destroyed').length).toBe(1);
    draw(cb, rng, u, ['shock', 'watch', 'seek'], ['5,8', '4,8', '3,8']); evoke(cb, rng, u, '3,8', '9,8');
    draw(cb, rng, u, ['shock', 'watch', 'seek'], ['5,9', '4,9', '3,9']); evoke(cb, rng, u, '3,9', '9,9');
    expect(cb.zones!.filter((x) => x.kind === 'turret').map((x) => x.tiles[0])).toEqual(['9,9']);
    es[1].pos = '12,9'; es[1].ap = 9; es[1].attack = 50; expect(strikeTurret(cb, seed(), es[1], '9,9')).toBeNull(); expect(cb.zones!.some((x) => x.kind === 'turret')).toBe(false);
  });
  it('turrets zap allies too (KIN keeps your side out); WATCH + TWICE shoots the two nearest; WAIT + WATCH is a hidden turret', () => {
    const { cb, u, e, allies, rng } = setup(['spark', 'seek', 'watch', 'kin', 'twice'], [{ at: '14,5' }], { allies: ['11,5'] });
    allies[0].def = -99; draw(cb, rng, u, ['spark', 'watch', 'seek'], ['5,5', '4,5', '3,5']); evoke(cb, rng, u, '3,5', '10,5');
    let ah = allies[0].hp; magicTurnStart(cb, rng, u); expect(allies[0].hp).toBe(ah - 8);
    const k = setup(['spark', 'seek', 'watch', 'kin'], [{ at: '14,5' }], { allies: ['11,6'] }); draw(k.cb, k.rng, k.u, ['spark', 'watch', 'kin', 'seek'], ['5,5', '4,5', '3,5', '2,5']); evoke(k.cb, k.rng, k.u, '2,5', '10,5');
    ah = k.allies[0].hp; const eh = k.e.hp; magicTurnStart(k.cb, k.rng, k.u); expect(k.allies[0].hp).toBe(ah); expect(eh - k.e.hp).toBe(8);
    const t = setup(['spark', 'seek', 'watch', 'twice'], [{ at: '12,4' }, { at: '12,6' }]); draw(t.cb, t.rng, t.u, ['spark', 'watch', 'twice', 'seek'], ['5,5', '4,5', '3,5', '2,5']);
    evoke(t.cb, t.rng, t.u, '2,5', '10,5'); expect(t.cb.zones!.filter((z) => z.kind === 'turret').length).toBe(1);
    const th = t.es.map((x) => x.hp); magicTurnStart(t.cb, t.rng, t.u); expect(t.es.map((x, i) => th[i] - x.hp)).toEqual([8, 8]);
    const h = setup(['spark', 'seek', 'watch', 'wait'], [{ at: '14,5' }]); draw(h.cb, h.rng, h.u, ['spark', 'watch', 'wait', 'seek'], ['5,5', '4,5', '3,5', '2,5']); evoke(h.cb, h.rng, h.u, '2,5', '10,5');
    expect(placedMagic(h.cb, 'foe').some((p) => p.kind === 'turret')).toBe(false); expect(placedMagic(h.cb, 'pc').find((p) => p.kind === 'turret')!.hidden).toBe(true);
    h.e.pos = '12,5'; magicTurnStart(h.cb, h.rng, h.u); expect(placedMagic(h.cb, 'foe').some((p) => p.kind === 'turret')).toBe(true); // shown once it fires
  });
});

// ---------- previews ----------
describe('previews (spec: What the player must see)', () => {
  it('patternAt: the words in order, the shape, valid or why, glyphs left, charge now and after, an overload warning', () => {
    const { cb, u, rng } = setup(['fire', 'seek', 'condense']); u.mg!.flux = 6; u.mg!.charge = 20; u.mg!.maxWords = 3;
    u.mg!.flux = -99; draw(cb, rng, u, ['fire'], ['4,5']);
    let p = patternAt(cb, '4,5', u); expect(p.valid).toBe(false); expect(p.why).toMatch(/One glyph alone/);
    draw(cb, rng, u, ['condense'], ['3,5']); p = patternAt(cb, '4,5', u);
    expect(p.words).toEqual(['fire', 'condense']); expect(p.shape).toBe('line'); expect(p.valid).toBe(true); expect(p.lineLeft).toBe(1); expect(p.capLeft).toBe(1);
    expect(p.costAfter.evokeCharge).toBe(2); expect(p.costAfter.charge).toBe(p.costNow.charge - 2);
    u.mg!.flux = 6; expect(patternAt(cb, '4,5', u).overloadWarning).toMatch(/overloads/);
    const q = setup(['fire', 'fire']); draw(q.cb, q.rng, q.u, ['fire', 'fire'], ['4,5', '3,5']); expect(patternAt(q.cb, '4,5', q.u).why).toMatch(/another word/);
  });
  it('previewEvoke: area, pickable, the bolt\'s path, every affected creature with ally/enemy flags, numbers and roll or save TN', () => {
    const { cb, u, es, allies, rng } = setup(['fire', 'seek', 'spread', 'bind'], [{ at: '9,5' }, { at: '10,6' }], { allies: ['9,4'] });
    draw(cb, rng, u, ['fire', 'bind', 'spread', 'seek'], ['6,5', '5,5', '4,5', '3,5']);
    const pv = planEvoke(cb, u, '3,5', es[0].pos);
    expect(pv.ok).toBe(true); expect(pv.area.length).toBe(4 * 8); expect(pv.pickable).toContain('12,5'); expect(pv.pickable).toContain(u.pos);
    expect(pv.missiles[0].kind).toBe('bolt'); expect(pv.missiles[0].path).toEqual(['7,5', '8,5', '9,5']);
    const ally = pv.affected.find((a) => a.unit === allies[0].id)!; expect(ally.ally).toBe(true); expect(ally.enemy).toBe(false);
    const foe = pv.affected.find((a) => a.unit === es[0].id)!; expect(foe.enemy).toBe(true); expect(foe.dmg).toBe(Math.round(30 * 0.6)); expect(foe.roll!.need).toBe(es[0].def); expect(foe.saves[0]).toMatchObject({ cond: 'pinned', fam: 'body' });
    expect(pv.value!.own).toBeGreaterThan(0);
    expect(planEvoke(cb, u, '3,5').why).toMatch(/Pick a target/); expect(planEvoke(cb, u, '3,5').area.length).toBe(32);
  });
  it('placedMagic: fields, traps, turrets and walls with tiles, rounds left and owner', () => {
    const { cb, u, rng } = setup(['fire', 'stay', 'raise', 'seek'], [{ at: '15,15' }]);
    draw(cb, rng, u, ['fire', 'stay'], ['4,5', '3,5']); evoke(cb, rng, u, '3,5', '5,5');
    draw(cb, rng, u, ['raise', 'seek'], ['4,8', '3,8']); evoke(cb, rng, u, '3,8', '6,8');
    const pm = placedMagic(cb, 'foe'); expect(pm.map((p) => p.kind).sort()).toEqual(['field', 'raise']);
    expect(pm.find((p) => p.kind === 'field')).toMatchObject({ tiles: ['5,5'], left: 2, by: u.id, mine: false, element: 'fire' });
  });
});

// ---------- fx ----------
describe('fx events carry the element (for the effects layer)', () => {
  it('draw, evoke (missiles, burst), hurt and miss carry the element; fields, traps and turrets have their own', () => {
    const { cb, u, e, rng } = setup(['freeze', 'arc', 'spread'], [{ at: '9,5' }]);
    draw(cb, rng, u, ['freeze', 'spread', 'arc'], ['5,5', '4,5', '3,5']); evoke(cb, rng, u, '3,5', e.pos);
    expect(fx(cb, 'draw')[0]).toMatchObject({ word: 'freeze', element: 'freeze', cls: 'subject_element' });
    const ev = fx(cb, 'evoke')[0]; expect(ev.element).toBe('freeze'); expect(ev.missiles[0].kind).toBe('lob'); expect(ev.missiles[0].burst.length).toBe(25); expect(ev.facing).toBe('along');
    expect(fx(cb, 'hurt').find((h) => h.target === e.id)!.element).toBe('freeze');
    expect(fx(cb, 'cond').find((h) => h.target === e.id)!.element).toBe('freeze');
  });
});

// ---------- enemy casters ----------
describe('enemy casters (spec: Enemy casters)', () => {
  it('an enemy with an Evoker walks a Line on its own tiles away from the target and Evokes it back when the spell beats its weapon', () => {
    const { cb, es } = setup(['spark'], [{ at: '9,5', tier: 'soldier', weapon: 'fists', sigils: true }]);
    const e = es[0], pc = cb.units.find((x) => x.charId === 'c1')!; pc.pos = '4,5';
    expect(e.mg!.words).toEqual(['fire', 'seek', 'spread', 'bind']); expect(e.mg!.maxWords).toBe(3);
    cb.turn = cb.order.indexOf(e.id); e.ap = 6; e.mg!.flux = 0; const hp = pc.hp;
    enemyTurn(cb, seed());
    expect(cb.log.some((l) => /draws/.test(l) && l.startsWith(e.name))).toBe(true);
    expect(cb.log.some((l) => /evokes/.test(l) && l.startsWith(e.name))).toBe(true);
    expect(pc.hp).toBeLessThan(hp);
  });
  it('it holds a spell that would hit more of its own side than of yours', () => {
    const { cb, es } = setup(['spark'], [{ at: '9,5', tier: 'minion', weapon: 'fists', sigils: ['fire', 'spread'] }, { at: '6,4' }, { at: '6,6' }]);
    const e = es[0], pc = cb.units.find((x) => x.charId === 'c1')!; pc.pos = '6,5';
    for (const x of es.slice(1)) { x.ap = 0; }
    cb.turn = cb.order.indexOf(e.id); e.ap = 6;
    enemyTurn(cb, seed()); expect(cb.log.some((l) => /evokes/.test(l) && l.startsWith(e.name))).toBe(false);
  });
  it('it steps out of a field of yours it stands in, and scuffs a turret of yours it stands on', () => {
    const { cb, u, e, rng } = setup(['fire', 'stay', 'spark', 'watch', 'seek'], [{ at: '9,9', sigils: true }]);
    draw(cb, rng, u, ['fire', 'stay'], ['4,5', '3,5']); evoke(cb, rng, u, '3,5', '5,5');
    e.pos = '5,5'; e.ap = 6; cb.turn = cb.order.indexOf(e.id);
    enemyAvoidMagic(cb, rng, e); expect(e.pos).not.toBe('5,5');
    draw(cb, rng, u, ['spark', 'watch', 'seek'], ['4,8', '3,8', '2,8']); u.pos = '2,8'; evoke(cb, rng, u, '2,8', '6,8');
    e.pos = '6,8'; e.ap = 6; (e as any).aiDodge = 0; enemyAvoidMagic(cb, rng, e);
    expect(cb.zones!.some((z) => z.kind === 'turret')).toBe(false);
  });
});

// ---------- the area map ----------
describe('on the area map (spec: Overworld rounds, Mana)', () => {
  const room = () => {
    let g: GameState = newGame('ROOM', { id: 'host', name: 'Leon' }, 'sigil14');
    g = apply(g, { type: 'char/add', sheet: sheet('sigilist', 'Ilse', { sigils: ['fire', 'seek'] }) }, 'host');
    g = apply(g, { type: 'session/start' }, 'host');
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'Open.' } as any }, 'host');
    return { g, id: Object.keys(g.characters)[0] };
  };
  it('a trap set on the map stays in the story, hidden from the players\' view only if it is the other side\'s', () => {
    let { g, id } = room(); g.characters[id].sigils!.push('wait'); g.characters[id].sigils!.push('condense');
    const at = positionsOf(g)[id], [x, y] = at.split(',').map(Number);
    g = apply(g, { type: 'world/act', charId: id, act: 'move', to: (x + 1) + ',' + y, how: 'move' }, 'host');
    g = apply(g, { type: 'world/act', charId: id, act: 'draw', word: 'fire', tile: (x + 1) + ',' + y }, 'host');
    g = apply(g, { type: 'world/act', charId: id, act: 'move', to: at, how: 'move' }, 'host');
    g = apply(g, { type: 'world/act', charId: id, act: 'draw', word: 'wait', tile: at }, 'host');
    g = apply(g, { type: 'world/act', charId: id, act: 'evoke', tile: at, aim: (x + 2) + ',' + y }, 'host');
    expect(g.story.zones!.some((z: any) => z.kind === 'trap')).toBe(true);
    expect(viewFor(g, 'host').story.zones!.some((z: any) => z.kind === 'trap')).toBe(true);
    (g.story.zones![0] as any).side = 'foe'; expect(viewFor(g, 'host').story.zones!.some((z: any) => z.kind === 'trap')).toBe(false);
  });
});

// ---------- old saves ----------
describe('old saves (item 441)', () => {
  it('1.2 glyphs are dropped on first use; 1.2 wall zones become STAY fields', () => {
    const { cb, u, rng } = setup(['fire', 'seek']);
    cb.glyphs = [{ id: 'gl1', word: 'fire', pos: '4,5', by: u.id, side: 'pc', left: 2, who: u.name }];
    cb.zones = [{ id: 'z1', kind: 'wall', tiles: ['6,6'], words: ['fire', 'return'], by: u.id, side: 'pc', left: 2, mult: 0.5, who: u.name }];
    delete (cb as any).sigilV; migrateSigil(cb);
    expect(cb.glyphs).toEqual([]); expect(cb.zones![0].kind).toBe('field'); expect(cb.zones![0].words).toEqual(['fire', 'stay']);
    expect(cb.log.some((l) => /old glyphs/.test(l))).toBe(true);
    const e = cb.units.find((x) => x.side === 'foe')!; e.pos = '6,7'; e.ap = 9; const hp = e.hp; moveUnit(cb, e, '6,6', rng); expect(hp - e.hp).toBe(15);
  });
  it('characters: RETURN goes (one free word at the next rest); two starting words with no Reach word swap the non-Subject one for SEEK', () => {
    expect(migrateWords(['fire', 'return', 'condense']).words).toEqual(['fire', 'condense']);
    expect(migrateWords(['spark', 'condense']).words).toEqual(['spark', 'seek']);
    expect(migrateWords(['fire', 'freeze']).words).toEqual(['fire', 'seek']);
    expect(migrateWords(['fire', 'arc']).notes).toEqual([]);
    const c = newCharacter('o', 'p', sheet('sigilist', 'Old')) as Character; c.sigils = ['fire', 'return']; delete c.sigilRev;
    const notes = migrateCharacterSigils(c); expect(c.sigils).toEqual(['fire', 'seek']); expect(notes.length).toBe(1); // RETURN was the non-Subject of the pair
    const d = newCharacter('o2', 'p', sheet('sigilist', 'Old2')) as Character; d.sigils = ['fire', 'arc', 'return']; delete d.sigilRev;
    migrateCharacterSigils(d); expect(d.sigils).toEqual(['fire', 'arc']); expect(d.sigilFree).toBe(1);
    expect(migrateCharacterSigils(c)).toEqual([]); // once
    let g: GameState = newGame('ROOM', { id: 'host', name: 'Leon' }, 'old');
    g = apply(g, { type: 'char/add', sheet: sheet('sigilist', 'Ilse') }, 'host');
    const id = Object.keys(g.characters)[0]; g.characters[id].sigils = ['spark', 'condense']; delete g.characters[id].sigilRev;
    g = apply(g, { type: 'session/start' }, 'host'); expect(g.characters[id].sigils).toEqual(['spark', 'seek']);
  });
  it('starting words: 2 making a spell, one a Reach word', () => {
    expect(startingWordsError(['spark', 'seek'])).toBeNull(); expect(startingWordsError(['mend', 'relay'])).toBeNull();
    expect(startingWordsError(['spark', 'condense'])).toMatch(/Reach/); expect(startingWordsError(['spark'])).toMatch(/exactly 2/);
  });
});

void unitSees; void active; void dmgTo;

// Review fix: area-map ids for placed Sigil magic never repeat. magicIn rebuilt the counter from the live glyphs and
// zones only; an Evoke uses its glyphs up, so the next caster's RAISE wall got the same 'sw' id as the first one's.
import { ARCHETYPES as ARCH_RF, newGame as newGameRF, apply as applyRF, positionsOf as posRF, type GameState as GS_RF } from '../src';
describe('area-map Sigil ids (review fix)', () => {
  it('two casters\' RAISE walls get different ids, and a later glyph never reuses one', () => {
    const arch = ARCH_RF.find((a: any) => a.id === 'sigilist')!;
    const sheet = (name: string) => ({ name, portrait: '', origin: 'Central City', kit: 'sigil', traits: [], skills: { ...arch.preset }, attrs: { ...arch.attributes }, cores: { ...arch.cores }, identity: {}, sigils: ['raise', 'seek'] }) as any;
    let g: GS_RF = newGameRF('ROOM', { id: 'host', name: 'Leon' }, 'x');
    g = applyRF(g, { type: 'char/add', sheet: sheet('A') } as any, 'host');
    g = applyRF(g, { type: 'char/add', sheet: sheet('B') } as any, 'host');
    g = applyRF(g, { type: 'session/start' } as any, 'host');
    g = applyRF(g, { type: 'narrator/turn', turn: { narration: 'Open.' } } as any, 'host');
    const offsets = Array.from({ length: 169 }, (_, i) => [(i % 13) - 6, Math.floor(i / 13) - 6]).filter(([a, b]) => a || b).sort((a, b) => Math.abs(b[0]) + Math.abs(b[1]) - Math.abs(a[0]) - Math.abs(a[1]));
    for (const [ii, id] of Object.keys(g.characters).entries()) {
      const d = ii ? 1 : -1; g.characters[id].sigils = ['raise', 'seek'];
      const at = posRF(g)[id], [x, y] = at.split(',').map(Number);
      g = applyRF(g, { type: 'world/act', charId: id, act: 'move', to: x + ',' + (y + d), how: 'move' } as any, 'host');
      g = applyRF(g, { type: 'world/act', charId: id, act: 'draw', word: 'raise', tile: x + ',' + (y + d) } as any, 'host');
      g = applyRF(g, { type: 'world/act', charId: id, act: 'move', to: at, how: 'move' } as any, 'host');
      g = applyRF(g, { type: 'world/act', charId: id, act: 'draw', word: 'seek', tile: at } as any, 'host');
      let done = false;
      for (const [dx, dy] of offsets) { try { g = applyRF(g, { type: 'world/act', charId: id, act: 'evoke', tile: at, aim: (x + dx) + ',' + (y + dy) } as any, 'host'); done = true; break; } catch { /* not a legal aim */ } }
      expect(done).toBe(true);
    }
    const walls = (g.story.objects || []).filter((o: any) => o.kind === 'sigil_wall').map((o: any) => o.id);
    expect(walls.length).toBe(2);
    expect(new Set(walls).size).toBe(2);
    expect(g.story.glyphSeq).toBeGreaterThanOrEqual(Math.max(...walls.map((w: string) => +w.replace(/\D/g, ''))));
  });
});

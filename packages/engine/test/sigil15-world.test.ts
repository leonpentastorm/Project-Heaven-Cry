// Sigil 1.5, the rest of Part A (rules revision 1.9; docs/design/sigil-1.5-spec.md sections 2.2, 4.2 and 7; spec: Mana,
// Drawing a spell, rule 3.11; The Magic panel and learning, rule 4; items 687-693). Junctions (one glyph in two strokes at
// Brain Power Mastered), sigil marks on the map and their Investigate approach, the Narrator placing marks, the M813
// campaign's marks, and the Proving Ground tools. Every action goes through the reducer (apply).
import { describe, expect, it } from 'vitest';
import {
  d20, previewDraw, findPattern, junctionsFor, patternAt, magicRoundTick, validateCampaign, builtInCampaign, defaultObjects, zoneToMap, refOf, MARK, markTn,
  ARCHETYPES, newGame, apply, positionsOf, storyObjects, type Sheet, type Character,
} from '../src';
import { fightWith, storyWith, withGame } from './helpers/perkfight';

/** A seed whose next n d20 rolls are all 2-19 (no criticals, no natural 1s). */
function calm(n = 40): number { for (let s = 1; s < 2000000; s++) { const r = { state: s }; let ok = true; for (let i = 0; i < n && ok; i++) { const v = d20(r); ok = v > 1 && v < 20; } if (ok) return s; } throw new Error('no seed'); }
/** A seed whose next d20 is a natural 20, then calm ones. */
function crit(): number { for (let s = 1; s < 2000000; s++) { const r = { state: s }; if (d20(r) !== 20) continue; let ok = true; for (let i = 0; i < 10 && ok; i++) { const v = d20(r); ok = v > 1 && v < 20; } if (ok) return s; } throw new Error('no seed'); }
const SEED = calm(), CRIT = crit();
const ALL_PAID = ['brain_power', 'rumination', 'eloquence'].flatMap((s) => [3, 5, 7, 9, 10].map((l) => s + ':' + l));

// ---------------------------------------------------------------------------------------------------------------------
/** A Sigil caster at D6 (3,5) on its turn knowing the words given, foes where given; everyone 500 HP, no armour, Defense
 * and saves −99. Its character's Brain Power is `bp` (10: Junctions). The yard map, cleared. */
function rig(words: string[], foes: string[] = ['14,9'], bp = 10) {
  const f = fightWith([{ archetype: 'sigilist', kit: 'sigil' }], foes.map(() => ({ tier: 'minion' })));
  const cb = f.cb; cb.map = { ...cb.map, cover: [], full: [], solid: [], difficult: [] } as any; cb.objects = []; cb.mana = 15;
  f.pc.pos = '3,5'; f.foes.forEach((e, i) => { e.pos = foes[i]; });
  for (const x of [...f.pcs, ...f.foes]) { x.hp = x.maxHp = 500; x.armour = 0; x.def = -99; x.sv = { body: -99, brain: -99, heart: -99 } as any; x.hidden = false; }
  const c = f.g.characters[f.pc.charId!]; c.sigils = [...words]; c.skills.brain_power = bp;
  (c as any).sigilGrowth = { study: 0, picksUsed: 0, free: 0, paid: [...ALL_PAID], toStudy: [], uses: {} };
  const u = f.turn(f.pc); u.ap = 60;
  Object.assign(u.mg!, { evoker: true, words: [...words], charge: 999, glyphAp: 1, maxWords: 4, flux: -99, sigilMult: 1, elemMult: 1, healMult: 1, rangeBonus: 0, durBonus: 0, coreSave: 0, inflect: [] });
  f.g.rng.state = SEED;
  return f;
}
type F = ReturnType<typeof rig>;
function drawAt(f: F, word: string, tile: string, stroke?: string) { const u = f.unit(f.pc.id); u.pos = tile; u.ap = 60; f.act({ type: 'combat/draw', unitId: u.id, word, tile, ...(stroke !== undefined ? { stroke } : {}) } as any); }
const evoke = (f: F, tile: string, aim: string, extra: Record<string, unknown> = {}) => { f.unit(f.pc.id).ap = 60; f.act({ type: 'combat/evoke', unitId: f.pc.id, tile, aim, ...extra } as any); };
const sid = (f: F, tile: string) => (f.cb.glyphs || []).find((g) => g.pos === tile)?.strokeId;
const glyphAt = (f: F, tile: string) => (f.cb.glyphs || []).find((g) => g.pos === tile);
const wordsOf = (f: F, tile: string, stroke?: string) => { const p = findPattern(f.cb, tile, undefined, stroke); return typeof p === 'string' ? p : p.words; };

describe('Junctions (rules 1.9, Drawing 3.11; items 687-690)', () => {
  it('a crossing: SEEK at a junction of FIRE and SPARK; both Lines Evoke, and the junction fades only after the second', () => {
    const f = rig(['fire', 'spark', 'seek'], ['10,5', '5,9']);
    const [east, south] = f.foes;
    drawAt(f, 'fire', '6,5'); drawAt(f, 'spark', '5,6', 'new'); // two lone glyphs, both next to E6 (5,5)
    const A = sid(f, '6,5')!, B = sid(f, '5,6')!; expect(A).not.toBe(B);
    f.unit(f.pc.id).pos = '5,5';
    const pv = withGame(f.g, () => previewDraw(f.cb, f.unit(f.pc.id), 'seek', '5,5'));
    const opt = pv.strokes.find((s) => s.id === 'junction:' + A + ',' + B)!;
    expect(opt).toMatchObject({ junction: true, ok: true, isDefault: false, words: ['fire', 'seek'], words2: ['spark', 'seek'] });
    expect(opt.label).toBe('junction: extends FIRE and SPARK');
    expect(pv.strokes.some((s) => s.id === 'junction:' + A + ',new')).toBe(true);
    drawAt(f, 'seek', '5,5', 'junction:' + A + ',' + B);
    const j = glyphAt(f, '5,5')!; expect(j.strokeId).toBe(A); expect(j.strokeId2).toBe(B);
    expect((f.cb.glyphs || []).length).toBe(3); // one glyph on the ground for the junction
    expect(wordsOf(f, '6,5')).toEqual(['fire', 'seek']); expect(wordsOf(f, '5,6')).toEqual(['spark', 'seek']);
    expect(f.cb.log.some((l) => /a junction: the Lines read FIRE · SEEK and SPARK · SEEK/.test(l))).toBe(true);
    expect(withGame(f.g, () => patternAt(f.cb, '5,5', f.unit(f.pc.id))).junction?.map((x) => x.id)).toEqual([A, B]);
    // Line A from its end (E6), east past FIRE.
    evoke(f, '6,5', east.pos);
    expect(f.unit(east.id).hp).toBeLessThan(500);
    expect(glyphAt(f, '6,5')).toBeUndefined();
    const left = glyphAt(f, '5,5')!; expect(left).toBeDefined(); expect(left.strokeId).toBe(B); expect(left.strokeId2).toBeUndefined();
    expect(wordsOf(f, '5,6')).toEqual(['spark', 'seek']);
    // Line B, still standing on the junction (its end), south past SPARK; now the junction fades.
    evoke(f, '5,6', south.pos);
    expect(f.unit(south.id).hp).toBeLessThan(500);
    expect(f.cb.glyphs || []).toEqual([]);
    expect(f.cb.log.filter((l) => / evokes /.test(l)).length).toBe(2);
  });
  it('"extends A + a new Line": the junction starts a stroke that is extended from it in another direction; the Evoke may name the stroke on its tile', () => {
    const f = rig(['fire', 'spark', 'seek'], ['10,5', '2,8']);
    drawAt(f, 'fire', '6,5'); const A = sid(f, '6,5')!;
    drawAt(f, 'seek', '5,5', 'junction:' + A + ',new');
    const j = glyphAt(f, '5,5')!; expect(j.strokeId).toBe(A); expect(j.strokeId2).toBeTruthy(); const B = j.strokeId2!;
    drawAt(f, 'spark', '4,6'); // diagonal from the junction: only B (a lone glyph) can take it, and holds my last glyph
    expect(sid(f, '4,6')).toBe(B);
    expect(wordsOf(f, '5,5')).toEqual(['fire', 'seek']); expect(wordsOf(f, '5,5', B)).toEqual(['seek', 'spark']);
    f.unit(f.pc.id).pos = '5,5'; evoke(f, '5,5', '2,8', { stroke: B }); // B from the junction's tile, named: south-west along its diagonal
    expect(f.unit(f.foes[1].id).hp).toBeLessThan(500);
    expect(glyphAt(f, '4,6')).toBeUndefined(); expect(glyphAt(f, '5,5')!.strokeId).toBe(A);
    evoke(f, '6,5', '10,5'); expect(f.cb.glyphs || []).toEqual([]);
  });
  it('a junction is still one glyph: it fades with time like any other (both strokes lose it)', () => {
    const f = rig(['fire', 'spark', 'seek']);
    drawAt(f, 'fire', '6,5'); drawAt(f, 'spark', '5,6', 'new');
    drawAt(f, 'seek', '5,5', 'junction:' + sid(f, '6,5') + ',' + sid(f, '5,6'));
    for (let i = 0; i < 2; i++) magicRoundTick(f.cb);
    expect(f.cb.glyphs || []).toEqual([]);
  });
  it('without Brain Power Mastered the picker offers no junction, and an explicit pick is refused with the reason', () => {
    const f = rig(['fire', 'spark', 'seek'], ['14,9'], 9);
    drawAt(f, 'fire', '6,5'); drawAt(f, 'spark', '5,6', 'new');
    const A = sid(f, '6,5')!, B = sid(f, '5,6')!; f.unit(f.pc.id).pos = '5,5';
    const pv = withGame(f.g, () => previewDraw(f.cb, f.unit(f.pc.id), 'seek', '5,5'));
    expect(pv.strokes.some((s) => s.junction)).toBe(false);
    expect(() => drawAt(f, 'seek', '5,5', 'junction:' + A + ',' + B)).toThrow(/Junctions need Brain Power Mastered \(10\)/);
    expect(glyphAt(f, '5,5')).toBeUndefined();
  });
  it('a junction is refused where it extends nothing, and a bad junction reads the refusals of both strokes', () => {
    const f = rig(['fire', 'spark', 'seek', 'arc']);
    drawAt(f, 'seek', '6,5'); drawAt(f, 'spark', '5,6', 'new');
    const A = sid(f, '6,5')!, B = sid(f, '5,6')!;
    expect(() => drawAt(f, 'fire', '9,9', 'junction:' + A + ',' + B)).toThrow(/A junction extends a stroke/);
    // ARC at the crossing: B (SPARK·ARC) is fine, but A would read SEEK·ARC (two Reach words).
    f.unit(f.pc.id).pos = '5,5';
    const pv = withGame(f.g, () => previewDraw(f.cb, f.unit(f.pc.id), 'arc', '5,5'));
    expect(pv.strokes.find((s) => s.id === 'junction:' + A + ',' + B)).toMatchObject({ ok: false, why: expect.stringMatching(/second Reach word/) });
    expect(() => drawAt(f, 'arc', '5,5', 'junction:' + A + ',' + B)).toThrow(/second Reach word/);
  });
  it('the Proving Ground switch turns Junctions on for a character without the gate', () => {
    let g = newGame('JUNC15', { id: 'h1', name: 'Host' }, 'seed-junc');
    const a = ARCHETYPES.find((x) => x.id === 'sigilist')!;
    g = apply(g, { type: 'char/add', sheet: { name: 'Vel', portrait: '', origin: 'Thousand-Planet frontier', kit: 'sigil', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} } as Sheet }, 'h1');
    g = apply(g, { type: 'sandbox/start' }, 'h1');
    expect(g.sandbox!.junctions).toBeFalsy();
    const id = Object.keys(g.characters)[0], gate = (gg: typeof g) => withGame(gg, () => junctionsFor({} as any, { id: 'pc-' + id, charId: id } as any));
    expect(gate(g)).toMatch(/Brain Power Mastered/);
    g = apply(g, { type: 'sandbox/junctions', on: true } as any, 'h1');
    expect(gate(g)).toBeNull();
    expect(g.sandbox!.junctions).toBe(true); expect(g.story.entries.some((e) => /Junctions on for everyone here/.test(e.text))).toBe(true);
    g = apply(g, { type: 'sandbox/junctions', on: false } as any, 'h1');
    expect(g.sandbox!.junctions).toBe(false);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
/** A Sigil character in a story scene, its growth at nothing (Mastery paid), with a sigil mark on its own tile. */
function marked(word = 'mend', o: { age?: string; damage?: string; skills?: Record<string, number> } = {}) {
  const s = storyWith([{ archetype: 'sigilist', kit: 'sigil' }]); const id = s.chars[0].id;
  const c = s.g.characters[id]; c.sigils = ['spark', 'seek']; Object.assign(c.skills, { analysis: 0, rumination: 0, ...(o.skills || {}) });
  (c as any).sigilGrowth = { study: 0, picksUsed: 0, free: 0, paid: [...ALL_PAID], toStudy: [], uses: {} };
  const at = refOf(positionsOf(s.g)[id]);
  s.act({ type: 'narrator/turn', turn: { narration: 'A plate on the wall.', objects: [{ action: 'place', id: '', kind: 'sigil_mark', at, name: 'Old plate', text: 'A slate plate.', approaches: [], word: word.toUpperCase(), ...(o.age ? { age: o.age } : {}), ...(o.damage ? { damage: o.damage } : {}) }] } } as any);
  const mark = storyObjects(s.g).find((x) => x.kind === 'sigil_mark' && x.pos === positionsOf(s.g)[id])!; // (M813's own marks are elsewhere)
  return { s, id, mark };
}
type M = ReturnType<typeof marked>;
const ch = (m: M): Character => m.s.g.characters[m.id];
/** Try the mark's Investigate (2 AP), roll it on a seed, accept it. */
function investigate(m: M, seed: number) {
  m.s.act({ type: 'poi/try', charId: m.id, objId: m.mark.id, idx: 0 } as any);
  const ck = m.s.g.checks.find((k) => !k.done && k.poi?.objId === m.mark.id)!;
  m.s.g.rng.state = seed; m.s.act({ type: 'check/roll', checkId: ck.id } as any); m.s.act({ type: 'check/accept', checkId: ck.id } as any);
  return m.s.g.checks.find((k) => k.id === ck.id) || ck;
}

describe('sigil marks and Investigate (rules 1.9, The Magic panel, rule 4; items 691-692)', () => {
  it('the Narrator places one with a word: the engine writes its Investigate (Analysis or Rumination, TN by age and damage)', () => {
    const m = marked('mend', { age: 'ancient', damage: 'worn' });
    expect(m.mark).toMatchObject({ kind: 'sigil_mark', word: 'mend', age: 'ancient', damage: 'worn', name: 'Old plate' });
    expect(m.mark.approaches[0]).toMatchObject({ label: MARK.label, skills: ['analysis', 'rumination'], pick: 'best', tn: 20, success: 'study' });
    expect(markTn()).toBe(12); expect(markTn('fresh', 'intact')).toBe(8); expect(markTn('old', 'broken')).toBe(20);
    // A mark with no real word is not placed; an update keeps its Investigate first.
    const n0 = storyObjects(m.s.g).length;
    m.s.act({ type: 'narrator/turn', turn: { narration: 'x', objects: [{ action: 'place', id: '', kind: 'sigil_mark', at: 'B2', name: 'Bad', text: '', approaches: [], word: 'nonsense' }] } } as any);
    expect(storyObjects(m.s.g).length).toBe(n0);
    m.s.act({ type: 'narrator/turn', turn: { narration: 'x', objects: [{ action: 'update', id: m.mark.id, kind: 'sigil_mark', at: '', name: '', text: '', damage: 'intact', approaches: [{ label: 'Pry it off the wall', skills: ['raw_power'], tn: 12, stakes: 'Take it with you.', success: '' }] }] } } as any);
    const o = storyObjects(m.s.g).find((x) => x.id === m.mark.id)!;
    expect(o.approaches.map((a) => a.label)).toEqual([MARK.label, 'Pry it off the wall']); expect(o.approaches[0].tn).toBe(16); // ancient, intact
  });
  it('success copies the word for study (+3, on the known-to-study list); a second try is refused (once per character)', () => {
    const m = marked('mend', { skills: { analysis: 10 } });
    const ck = investigate(m, SEED);
    expect(ck.roll!.ok).toBe(true); expect(ck.roll!.crit).toBe(false); expect(ck.skills).toEqual(['analysis']);
    expect((ch(m) as any).sigilGrowth).toMatchObject({ study: 3, toStudy: ['mend'] }); expect(ch(m).sigils).not.toContain('mend');
    expect(m.s.g.story.entries.some((e) => /copies MEND \(\+3 study; on the known-to-study list\)/.test(e.text))).toBe(true);
    expect(() => m.s.act({ type: 'poi/try', charId: m.id, objId: m.mark.id, idx: 0 } as any)).toThrow(/already tried that/);
  });
  it('Rumination works as well as Analysis (the better of the two rolls)', () => {
    const m = marked('ward', { skills: { rumination: 8, analysis: 1 } });
    const ck = investigate(m, SEED); expect(ck.skills).toEqual(['rumination']);
  });
  it('a critical teaches the word outright when a slot is free (not the scene\'s one new thing)', () => {
    const m = marked('mend', { skills: { analysis: 4 } });
    const ck = investigate(m, CRIT);
    expect(ck.roll!.crit).toBe(true);
    expect(ch(m).sigils).toContain('mend'); expect((ch(m) as any).sigilGrowth.toStudy).toEqual([]); expect((ch(m) as any).sigilGrowth.study).toBe(0);
    expect(ch(m).learnedScene).not.toBe(m.s.g.story.scene.n);
    expect(m.s.g.story.entries.some((e) => /a critical teaches the Sigil word MEND outright/.test(e.text))).toBe(true);
  });
  it('a critical with no slot free copies it like a success, and the log says why', () => {
    const m = marked('mend', { skills: { analysis: 4, brain_power: 0 } });
    ch(m).sigils = ['spark', 'seek', 'fire', 'ward'];
    investigate(m, CRIT);
    expect(ch(m).sigils).not.toContain('mend'); expect((ch(m) as any).sigilGrowth).toMatchObject({ study: 3, toStudy: ['mend'] });
    expect(m.s.g.story.entries.some((e) => /A critical, but .* knows as many words as Brain Power allows/.test(e.text))).toBe(true);
  });
  it('failure: nothing learned, and the try is spent', () => {
    const m = marked('mend', { age: 'ancient', damage: 'broken' });
    const ck = investigate(m, SEED);
    expect(ck.roll!.ok).toBe(false);
    expect((ch(m) as any).sigilGrowth).toMatchObject({ study: 0, toStudy: [] });
    expect(() => m.s.act({ type: 'poi/try', charId: m.id, objId: m.mark.id, idx: 0 } as any)).toThrow(/already tried that/);
  });
  it('a Narrator update keeps the Investigate and its tries, whether it leaves it out or echoes it back (item 692)', () => {
    const m = marked('mend', { age: 'ancient', damage: 'broken' });
    expect(investigate(m, SEED).roll!.ok).toBe(false);
    const upd = (approaches: any[]) => m.s.act({ type: 'narrator/turn', turn: { narration: 'x', objects: [{ action: 'update', id: m.mark.id, kind: 'sigil_mark', at: '', name: '', text: '', approaches }] } } as any);
    upd([{ label: 'Ask the medics', skills: ['empathy'], tn: 12, stakes: 'They may know it.', success: '' }]);
    let o = storyObjects(m.s.g).find((x) => x.id === m.mark.id)!;
    expect(o.approaches.map((a) => a.label)).toEqual([MARK.label, 'Ask the medics']); expect(o.approaches[0].tries.length).toBe(1);
    expect(() => m.s.act({ type: 'poi/try', charId: m.id, objId: m.mark.id, idx: 0 } as any)).toThrow(/already tried that/);
    upd([{ label: 'Investigate the sigil', skills: ['analysis'], tn: 8, stakes: 'x', success: 'study' }, { label: 'Ask the medics', skills: ['empathy'], tn: 12, stakes: 'x', success: '' }]);
    o = storyObjects(m.s.g).find((x) => x.id === m.mark.id)!;
    expect(o.approaches.map((a) => a.label)).toEqual([MARK.label, 'Ask the medics']); expect(o.approaches[0]).toMatchObject({ success: 'study', tn: 20 });
    expect(() => m.s.act({ type: 'poi/try', charId: m.id, objId: m.mark.id, idx: 0 } as any)).toThrow(/already tried that/);
  });
  it('a word you know can\'t be investigated; a word already on the known-to-study list gives no more study', () => {
    const m = marked('spark');
    expect(() => m.s.act({ type: 'poi/try', charId: m.id, objId: m.mark.id, idx: 0 } as any)).toThrow(/knows SPARK already/);
    const m2 = marked('mend', { skills: { analysis: 10 } }); (ch(m2) as any).sigilGrowth.toStudy = ['mend'];
    investigate(m2, SEED); expect((ch(m2) as any).sigilGrowth.study).toBe(0);
    expect(m2.s.g.story.entries.some((e) => /reads MEND again: already on the known-to-study list/.test(e.text))).toBe(true);
  });
});

describe('the Narrator\'s grants keep the rest rule (item 693)', () => {
  it('a second word grant in one scene goes on the known-to-study list', () => {
    const s = storyWith([{ archetype: 'sigilist', kit: 'sigil', skills: { brain_power: 6 } }]); const id = s.chars[0].id;
    s.g.characters[id].sigils = ['spark', 'seek'];
    s.act({ type: 'narrator/turn', turn: { narration: 'A tutor.', magic: [{ charId: id, word: 'mend', reason: 'a tutor' }] } } as any);
    s.act({ type: 'narrator/turn', turn: { narration: 'Another.', magic: [{ charId: id, word: 'ward', reason: 'a plate' }] } } as any);
    expect(s.g.characters[id].sigils).toContain('mend'); expect(s.g.characters[id].sigils).not.toContain('ward');
    expect((s.g.characters[id] as any).sigilGrowth.toStudy).toEqual(['ward']);
  });
});

describe('M813 carries its sigil marks (rules 1.9)', () => {
  it('the campaign validates, and its zones load three marks with their Investigate approaches', () => {
    const c = builtInCampaign('m813')!;
    expect(validateCampaign(c)).toEqual([]);
    const marks = c.zones.flatMap((z) => defaultObjects(zoneToMap(z)).filter((o) => o.kind === 'sigil_mark').map((o) => ({ zone: z.id, o })));
    expect(marks.map((x) => x.zone + ':' + x.o.word)).toEqual(['shield_line:seek', 'outpost:mend', 'outpost_1:ward']);
    for (const { o } of marks) { expect(o.approaches[0]).toMatchObject({ success: 'study', skills: ['analysis', 'rumination'] }); expect(o.approaches[0].tn).toBe(markTn(o.age, o.damage)); }
  });
  it('a campaign mark with no word, or an unknown age, is an error', () => {
    const c = JSON.parse(JSON.stringify(builtInCampaign('m813')));
    c.zones[0].objects.push({ kind: 'sigil_mark', at: 'C3', name: 'Blank' }, { kind: 'sigil_mark', at: 'C4', name: 'Odd', word: 'fire', age: 'prehistoric' });
    const errs = validateCampaign(c);
    expect(errs.some((e) => /Blank" needs a known Sigil word/.test(e))).toBe(true); expect(errs.some((e) => /Odd" has an unknown age/.test(e))).toBe(true);
  });
});

describe('the Proving Ground tools (rules 1.9, spec section 7)', () => {
  const open = () => {
    let g = newGame('MARK15', { id: 'h1', name: 'Host' }, 'seed-mark');
    const a = ARCHETYPES.find((x) => x.id === 'sigilist')!;
    g = apply(g, { type: 'char/add', sheet: { name: 'Vel', portrait: '', origin: 'Thousand-Planet frontier', kit: 'sigil', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} } as Sheet }, 'h1');
    g = apply(g, { type: 'sandbox/start' }, 'h1');
    return { g, id: Object.keys(g.characters)[0] };
  };
  it('places a sigil mark (host only, while gearing up), and Investigate rolls at once there', () => {
    let { g, id } = open();
    const at = refOf(positionsOf(g)[id]);
    expect(() => apply(g, { type: 'sandbox/mark', at, word: 'not_a_word' } as any, 'h1')).toThrow(/No such word/);
    g = apply(g, { type: 'sandbox/mark', at, word: 'mend', age: 'fresh', damage: 'intact' } as any, 'h1');
    const o = storyObjects(g).find((x) => x.kind === 'sigil_mark')!;
    expect(o).toMatchObject({ word: 'mend', age: 'fresh', damage: 'intact' }); expect(o.approaches[0].tn).toBe(8);
    expect(g.story.entries.some((e) => /Sigil mark: MEND \(fresh, intact, TN 8\)/.test(e.text))).toBe(true);
    g = apply(g, { type: 'poi/try', charId: id, objId: o.id, idx: 0 } as any, 'h1');
    const tried = storyObjects(g).find((x) => x.id === o.id)!.approaches[0].tries;
    expect(tried.length).toBe(1);
    const gr = (g.characters[id] as any).sigilGrowth;
    if (tried[0].ok) expect(gr.toStudy.includes('mend') || g.characters[id].sigils!.includes('mend')).toBe(true);
  });
  it('grants study and sets a use count (the earlier tools still answer)', () => {
    let { g, id } = open();
    const before = (g.characters[id] as any).sigilGrowth?.study || 0;
    g = apply(g, { type: 'sandbox/study', charId: id, study: 8 } as any, 'h1');
    expect((g.characters[id] as any).sigilGrowth.study).toBe(before + 8);
    const w = g.characters[id].sigils![0];
    g = apply(g, { type: 'sandbox/word-uses', charId: id, word: w, uses: 12 } as any, 'h1');
    expect((g.characters[id] as any).sigilGrowth.uses[w]).toBe(12);
  });
  it('the switch and the mark are the host\'s', () => {
    let { g } = open();
    g = apply(g, { type: 'player/join', id: 'p2', name: 'Guest' }, 'h1');
    expect(() => apply(g, { type: 'sandbox/junctions', on: true } as any, 'p2')).toThrow(/Only the host/);
    expect(() => apply(g, { type: 'sandbox/mark', at: 'C3', word: 'mend' } as any, 'p2')).toThrow(/Only the host/);
  });
});

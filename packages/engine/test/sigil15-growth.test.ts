// Sigil 1.5, growth (rules revision 1.10; docs/design/sigil-1.5-spec.md sections 2 and 3; spec: The Magic panel and
// learning; items 906-916). Study from Evokes and its thresholds, learning a word of your choice within the cap (banked
// when no slot is free), copying words from enemy glyphs and scuffed traces, Mastery study and the Mastered free word,
// word use counts, and the inflection a Mastered word turns on. Every action goes through the reducer (apply).
import { describe, expect, it } from 'vitest';
import {
  d20, previewEvoke, magicRoundTick, sigilGrowthView, picksEarned, thresholdN, evokeStudy, glyphCost, SIGILS, SIGIL, INFLECTION_STATS, wordsKnownCap,
  ARCHETYPES, newGame, apply, positionsOf, type Sheet, type Unit, type Character, type Glyph,
} from '../src';
import { fightWith, storyWith, withGame } from './helpers/perkfight';

/** A seed whose next n d20 rolls are all 2-19 (no criticals, no natural 1s). */
function calm(n = 40): number { for (let s = 1; s < 2000000; s++) { const r = { state: s }; let ok = true; for (let i = 0; i < n && ok; i++) { const v = d20(r); ok = v > 1 && v < 20; } if (ok) return s; } throw new Error('no seed'); }
/** A seed whose next d20 is a natural 20 (a critical), then calm ones. */
function crit(): number { for (let s = 1; s < 2000000; s++) { const r = { state: s }; if (d20(r) !== 20) continue; let ok = true; for (let i = 0; i < 10 && ok; i++) { const v = d20(r); ok = v > 1 && v < 20; } if (ok) return s; } throw new Error('no seed'); }
const SEED = calm();
const ALL_PAID = ['brain_power', 'rumination', 'eloquence'].flatMap((s) => [3, 5, 7, 9, 10].map((l) => s + ':' + l));

/** A Sigil caster at D6 (3,5) on its turn knowing the words given (as the character's words too), foes where given;
 * everyone 500 HP, no armour, Defense −99, saves −99 (every roll hits). Its growth starts at nothing (Mastery already
 * paid, so only Evokes and copying move it). The yard map, cleared. */
function rig(words: string[], foes: string[] = ['14,9'], allies: string[] = []) {
  const f = fightWith([{ archetype: 'sigilist', kit: 'sigil' }, ...allies.map(() => ({ archetype: 'sigilist', kit: 'sigil' }))], foes.map(() => ({ tier: 'minion' })));
  const cb = f.cb; cb.map = { ...cb.map, cover: [], full: [], solid: [], difficult: [] } as any; cb.objects = []; cb.mana = 15;
  f.pcs.forEach((p, i) => { p.pos = i ? allies[i - 1] : '3,5'; });
  f.foes.forEach((e, i) => { e.pos = foes[i]; });
  for (const x of [...f.pcs, ...f.foes]) { x.hp = x.maxHp = 500; x.armour = 0; x.def = -99; x.sv = { body: -99, brain: -99, heart: -99 } as any; x.hidden = false; }
  for (const p of f.pcs) { const c = f.g.characters[p.charId!]; c.sigils = [...words]; (c as any).sigilGrowth = { study: 0, picksUsed: 0, free: 0, paid: [...ALL_PAID], toStudy: [], uses: {} }; }
  const u = f.turn(f.pc); arm(u, words);
  for (const a of f.pcs.slice(1)) arm(a, words);
  f.g.rng.state = SEED;
  return f;
}
function arm(u: Unit, words: string[]) {
  u.ap = 60; const m = u.mg!;
  Object.assign(m, { evoker: true, words: [...words], charge: 999, glyphAp: 1, maxWords: 4, flux: -99, sigilMult: 1, elemMult: 1, healMult: 1, rangeBonus: 0, durBonus: 0, coreSave: 0, inflect: [] });
}
type F = ReturnType<typeof rig>;
const charOf = (f: F, u: Unit = f.pc): Character => f.g.characters[f.unit(u.id).charId!];
const growth = (f: F, u?: Unit) => (charOf(f, u) as any).sigilGrowth;
function draw(f: F, u: Unit, words: string[], tiles: string[]) {
  words.forEach((w, i) => { f.unit(u.id).pos = tiles[i]; f.unit(u.id).ap = 60; f.act({ type: 'combat/draw', unitId: u.id, word: w, tile: tiles[i] } as any); });
}
const evoke = (f: F, u: Unit, tile: string, aim: string, extra: Record<string, unknown> = {}) => f.act({ type: 'combat/evoke', unitId: u.id, tile, aim, ...extra } as any);
/** Put a glyph on the map, drawn by someone (an enemy's, by default the first foe's). */
function plant(f: F, word: string, pos: string, by: Unit = f.foe): Glyph {
  const g: Glyph = { id: 'g' + (900 + (f.cb.glyphs || []).length), word, pos, by: by.id, side: by.side, left: 3, who: by.name, v: 14, strokeId: 'sx' + pos };
  f.cb.glyphs = [...(f.cb.glyphs || []), g]; return g;
}
/** Make a word Mastered (or nearly) for the first PC: its use count, and the live unit's inflections from it. */
function uses(f: F, word: string, n: number) { growth(f).uses[word] = n; const m = f.unit(f.pc.id).mg!; m.inflect = Object.entries(growth(f).uses).filter(([, v]) => (v as number) >= 30).map(([w]) => w); }

// ---------------------------------------------------------------------------------------------------------------------
describe('study (rules 1.10, item 906)', () => {
  it('the numbers: 1, +1 per glyph past 2, +1 if it struck an enemy', () => {
    expect(evokeStudy(2, false)).toBe(1); expect(evokeStudy(2, true)).toBe(2); expect(evokeStudy(3, false)).toBe(2); expect(evokeStudy(4, true)).toBe(4);
  });
  it('a 2-glyph Evoke that misses earns 1; a 4-glyph Evoke that hits earns 4 (through apply)', () => {
    const f = rig(['fire', 'spark', 'condense', 'seek'], ['10,5']);
    f.unit(f.foe.id).def = 99; // nothing short of a natural 20 hits it
    draw(f, f.pc, ['fire', 'seek'], ['5,5', '4,5']);
    evoke(f, f.pc, '4,5', '10,5');
    expect(f.unit(f.foe.id).hp).toBe(500); expect(growth(f).study).toBe(1);
    f.unit(f.foe.id).def = -99;
    draw(f, f.pc, ['fire', 'spark', 'condense', 'seek'], ['7,5', '6,5', '5,5', '4,5']);
    evoke(f, f.pc, '4,5', '10,5');
    expect(f.unit(f.foe.id).hp).toBeLessThan(500); expect(growth(f).study).toBe(5);
  });
  it('an Evoke that fizzles earns nothing; an enemy\'s Evoke earns its side nothing', () => {
    const f = rig(['fire', 'spread', 'seek'], ['14,9']);
    draw(f, f.pc, ['fire', 'spread', 'seek'], ['6,5', '5,5', '4,5']);
    evoke(f, f.pc, '4,5', '9,5'); // SPREAD on empty ground: nobody there
    expect(f.cb.log.some((l) => /fizzles/.test(l))).toBe(true);
    expect(growth(f).study).toBe(0); expect(growth(f).uses).toEqual({});
  });
  it('study lives on the character: it is still there after the fight and in the next one', () => {
    const f = rig(['spark', 'seek'], ['9,5']);
    draw(f, f.pc, ['spark', 'seek'], ['5,5', '4,5']); evoke(f, f.pc, '4,5', '9,5');
    const id = f.unit(f.pc.id).charId!; expect((f.g.characters[id] as any).sigilGrowth.study).toBe(2);
    expect(f.g.characters[id].sigils).toEqual(['spark', 'seek']);
    expect(JSON.parse(JSON.stringify(f.g)).characters[id].sigilGrowth.uses).toEqual({ spark: 1, seek: 1 });
  });
});

describe('on the area map (rules 1.10)', () => {
  const open = () => {
    let g = newGame('ROOM', { id: 'host', name: 'Leon' }, 'grow-map');
    const a = ARCHETYPES.find((x) => x.id === 'sigilist')!;
    g = apply(g, { type: 'char/add', sheet: { name: 'Ilse', portrait: '', origin: 'Thousand-Planet frontier', kit: 'sigil', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {}, sigils: ['ward', 'seek'] } as Sheet }, 'host');
    g = apply(g, { type: 'session/start' }, 'host');
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'Open.' } as any }, 'host');
    const id = Object.keys(g.characters)[0]; (g.characters[id] as any).sigilGrowth = { study: 0, picksUsed: 0, free: 0, paid: [...ALL_PAID], toStudy: [], uses: {} };
    return { g, id };
  };
  it('an Evoke on the area map counts once (its dry run counts nothing)', () => {
    let { g, id } = open(); const at = positionsOf(g)[id], [x, y] = at.split(',').map(Number), next = (x + 1) + ',' + y;
    g = apply(g, { type: 'world/act', charId: id, act: 'move', to: next, how: 'move' }, 'host');
    g = apply(g, { type: 'world/act', charId: id, act: 'draw', word: 'ward', tile: next }, 'host');
    g = apply(g, { type: 'world/act', charId: id, act: 'move', to: at, how: 'move' }, 'host');
    g = apply(g, { type: 'world/act', charId: id, act: 'draw', word: 'seek', tile: at }, 'host');
    g = apply(g, { type: 'world/act', charId: id, act: 'evoke', tile: at, aim: at }, 'host');
    expect(g.phase).toBe('story'); expect((g.characters[id] as any).sigilGrowth).toMatchObject({ study: 1, uses: { ward: 1, seek: 1 } });
  });
  it('a trace scuffed on the area map stays in the story and can be read there', () => {
    let { g, id } = open(); const at = positionsOf(g)[id];
    g = JSON.parse(JSON.stringify(g)); g.story.glyphs = [{ id: 'g77', word: 'bind', pos: at, by: 'npc-x', side: 'foe', left: 3, who: 'Someone', v: 14, strokeId: 'g77' }];
    g = apply(g, { type: 'world/act', charId: id, act: 'scuff' }, 'host');
    expect(g.story.glyphs).toEqual([]); expect(g.story.traces).toMatchObject([{ word: 'bind', pos: at }]);
    g = apply(g, { type: 'world/act', charId: id, act: 'read', tile: at }, 'host');
    expect((g.characters[id] as any).sigilGrowth).toMatchObject({ study: 2, toStudy: ['bind'] });
    expect(() => apply(g, { type: 'world/act', charId: id, act: 'read', tile: at }, 'host')).toThrow(/copied that already/);
  });
});

describe('thresholds and picks (items 907-909)', () => {
  it('the 1st pick at 6 study, then every 8 more: 6, 14, 22', () => {
    expect([1, 2, 3, 4].map(thresholdN)).toEqual([6, 14, 22, 30]);
    expect([0, 5, 6, 13, 14, 21, 22].map(picksEarned)).toEqual([0, 0, 1, 1, 2, 2, 3]);
  });
  it('crossing 6 in a fight says so; the view shows the bar, the picks and the next threshold', () => {
    const f = rig(['spark', 'seek'], ['9,5']); growth(f).study = 5;
    draw(f, f.pc, ['spark', 'seek'], ['5,5', '4,5']); evoke(f, f.pc, '4,5', '9,5');
    expect(growth(f).study).toBe(7);
    expect(f.cb.log.some((l) => / evokes .*studies the Sigil words \(\+2, an Evoke\): a new word can be learned \(study 7\)/.test(l))).toBe(true);
    const v = sigilGrowthView(charOf(f));
    expect(v).toMatchObject({ study: 7, prev: 6, next: 14, pending: 1, free: 0, known: 2 });
    expect(v.learnable.length).toBe(38); expect(v.words.map((w) => w.word)).toEqual(['spark', 'seek']);
  });
  it('a pick learns a word of your choice within the cap (out of combat); the next waits for the next threshold', () => {
    const s = storyWith([{ archetype: 'sigilist', kit: 'sigil', skills: { brain_power: 2 } }]); const id = s.chars[0].id;
    s.g.characters[id].sigils = ['spark', 'seek']; (s.g.characters[id] as any).sigilGrowth = { study: 14, picksUsed: 0, free: 0, paid: [...ALL_PAID], toStudy: [], uses: {} };
    s.act({ type: 'sigil/learn', charId: id, word: 'FIRE' } as any);
    expect(s.g.characters[id].sigils).toContain('fire'); expect(s.g.story.entries.some((e) => /learns the Sigil word FIRE \(from study\)/.test(e.text))).toBe(true);
    s.act({ type: 'sigil/learn', charId: id, word: 'ward' } as any);
    expect(() => s.act({ type: 'sigil/learn', charId: id, word: 'mend' } as any)).toThrow(/next comes at 22 study \(14 now\)/);
    expect(() => s.act({ type: 'sigil/learn', charId: id, word: 'fire' } as any)).toThrow(/already knows FIRE/);
    expect(s.g.characters[id].sigils).toEqual(['spark', 'seek', 'fire', 'ward']);
  });
  it('with no slot free the pick is banked, and taken once Brain Power rises', () => {
    const s = storyWith([{ archetype: 'sigilist', kit: 'sigil', skills: { brain_power: 0 } }]); const id = s.chars[0].id;
    s.g.characters[id].sigils = ['spark', 'seek', 'fire', 'ward']; (s.g.characters[id] as any).sigilGrowth = { study: 22, picksUsed: 0, free: 0, paid: [...ALL_PAID], toStudy: [], uses: {} };
    expect(wordsKnownCap(s.g.characters[id])).toBe(4);
    expect(() => s.act({ type: 'sigil/learn', charId: id, word: 'mend' } as any)).toThrow(/the pick is banked until a slot frees up/);
    expect(sigilGrowthView(s.g.characters[id]).pending).toBe(3);
    s.g.characters[id].skills.brain_power = 2; // two more slots (cap 6)
    s.act({ type: 'sigil/learn', charId: id, word: 'mend' } as any); s.act({ type: 'sigil/learn', charId: id, word: 'acid' } as any);
    expect(() => s.act({ type: 'sigil/learn', charId: id, word: 'bind' } as any)).toThrow(/banked/);
    expect(sigilGrowthView(s.g.characters[id]).pending).toBe(1);
  });
  it('learning waits for the fight to end', () => {
    const f = rig(['spark', 'seek']); growth(f).study = 6;
    expect(() => f.act({ type: 'sigil/learn', charId: charOf(f).id, word: 'fire' } as any)).toThrow(/after the fight/);
  });
});

describe('copying in a fight (item 910-911)', () => {
  it('Analyzing an enemy also copies the glyphs it has drawn: +2 study and the word on the known-to-study list', () => {
    const f = rig(['spark', 'seek'], ['7,5']); plant(f, 'acid', '6,5'); plant(f, 'acid', '6,6');
    f.act({ type: 'combat/analyze', unitId: f.pc.id, targetId: f.foe.id } as any);
    expect(growth(f).toStudy).toEqual(['acid']); expect(growth(f).study).toBe(4); // +2 for each glyph of a word you don't know (rule 3, item 910)
    expect(f.cb.log.join('\n').split('copies ACID (+2 study; on the known-to-study list)').length - 1).toBe(2);
    expect(sigilGrowthView(charOf(f)).learnable[0]).toBe('acid'); // copied words are listed first
    expect(() => f.act({ type: 'combat/read', unitId: f.pc.id, tile: '6,5' } as any)).toThrow(/copied that already/);
  });
  it('Read a glyph: the Analyze AP, range and sight; a word you know copies nothing; your own side\'s glyph is not read', () => {
    const f = rig(['spark', 'seek'], ['14,9']); plant(f, 'bind', '6,5'); plant(f, 'spark', '6,6'); plant(f, 'mend', '3,7', f.pc);
    const ap = f.unit(f.pc.id).ap;
    f.act({ type: 'combat/read', unitId: f.pc.id, tile: '6,5' } as any);
    expect(f.unit(f.pc.id).ap).toBe(ap - 2); expect(growth(f).toStudy).toEqual(['bind']); expect(growth(f).study).toBe(2);
    expect(() => f.act({ type: 'combat/read', unitId: f.pc.id, tile: '6,6' } as any)).toThrow(/know that word already/);
    expect(() => f.act({ type: 'combat/read', unitId: f.pc.id, tile: '3,7' } as any)).toThrow(/Your side's glyphs/);
    plant(f, 'blind', '15,0');
    expect(() => f.act({ type: 'combat/read', unitId: f.pc.id, tile: '15,0' } as any)).toThrow(/Out of Analyze range/);
  });
  it('a scuffed glyph leaves a trace that can be read once, and fades after 2 rounds', () => {
    const f = rig(['spark', 'seek'], ['14,9']); plant(f, 'dread', '3,5'); plant(f, 'gale', '3,6');
    f.act({ type: 'combat/scuff', unitId: f.pc.id } as any);
    expect((f.cb.glyphs || []).some((g) => g.pos === '3,5')).toBe(false); expect(f.cb.traces).toMatchObject([{ word: 'dread', pos: '3,5', left: 2 }]);
    f.act({ type: 'combat/read', unitId: f.pc.id, tile: '3,5' } as any);
    expect(growth(f).toStudy).toEqual(['dread']); expect(f.cb.log.some((l) => /reads the DREAD trace/.test(l))).toBe(true);
    expect(() => f.act({ type: 'combat/read', unitId: f.pc.id, tile: '3,5' } as any)).toThrow(/copied that already/);
    // a glyph and its trace are one mark: reading the glyph first, then scuffing it, leaves a trace already copied
    f.act({ type: 'combat/read', unitId: f.pc.id, tile: '3,6' } as any); f.unit(f.pc.id).pos = '3,6'; f.unit(f.pc.id).ap = 60;
    f.act({ type: 'combat/scuff', unitId: f.pc.id } as any);
    expect(() => f.act({ type: 'combat/read', unitId: f.pc.id, tile: '3,6' } as any)).toThrow(/copied that already/);
    expect(growth(f).study).toBe(4);
    withGame(f.g, () => { magicRoundTick(f.cb); magicRoundTick(f.cb); });
    expect(f.cb.traces || []).toEqual([]);
  });
  it('a copied word is learnable with the next pick; learning it takes it off the list', () => {
    const f = rig(['spark', 'seek'], ['7,5']); plant(f, 'acid', '6,5'); growth(f).study = 4;
    f.act({ type: 'combat/analyze', unitId: f.pc.id, targetId: f.foe.id } as any);
    const c = charOf(f); expect(sigilGrowthView(c)).toMatchObject({ study: 6, pending: 1, toStudy: ['acid'] });
    f.g.phase = 'story'; // the fight is over: learning is allowed
    f.act({ type: 'sigil/learn', charId: c.id, word: 'acid' } as any);
    expect(charOf(f).sigils).toContain('acid'); expect(growth(f).toStudy).toEqual([]); // the stored list, not the view
  });
  it('a second glyph of a word already copied still pays +2 when read (each glyph copies once per character)', () => {
    const f = rig(['spark', 'seek'], ['14,9']); plant(f, 'bind', '6,5'); plant(f, 'bind', '6,6');
    f.act({ type: 'combat/read', unitId: f.pc.id, tile: '6,5' } as any); expect(growth(f).study).toBe(2);
    f.unit(f.pc.id).ap = 60; f.act({ type: 'combat/read', unitId: f.pc.id, tile: '6,6' } as any);
    expect(growth(f).study).toBe(4); expect(growth(f).toStudy).toEqual(['bind']);
  });
});

describe('Mastery study and the Mastered free word (items 912-913)', () => {
  it('each Mastery level of Brain Power, Rumination or Eloquence pays +5 once; Mastered gives one free word over the cap', () => {
    const s = storyWith([{ archetype: 'sigilist', kit: 'sigil', skills: { brain_power: 2, rumination: 0, eloquence: 0 } }]); const id = s.chars[0].id;
    s.g.characters[id].sigils = ['spark', 'seek', 'fire', 'ward', 'mend', 'acid']; (s.g.characters[id] as any).sigilGrowth = { study: 0, picksUsed: 0, free: 0, paid: [], toStudy: [], uses: {} };
    s.act({ type: 'story/unfocus' } as any);
    expect((s.g.characters[id] as any).sigilGrowth.study).toBe(0);
    s.g.characters[id].skills.rumination = 3; s.act({ type: 'story/unfocus' } as any);
    expect((s.g.characters[id] as any).sigilGrowth.study).toBe(5);
    s.act({ type: 'story/unfocus' } as any); expect((s.g.characters[id] as any).sigilGrowth.study).toBe(5); // once only
    s.g.characters[id].skills.brain_power = 10; s.act({ type: 'story/unfocus' } as any);
    const gr = (s.g.characters[id] as any).sigilGrowth;
    expect(gr.study).toBe(25); expect(gr.free).toBe(1); // 3, 5, 7, 9: +20, and the free word
    expect(s.g.story.entries.some((e) => /has Mastered Brain Power: one free Sigil word, over the cap/.test(e.text))).toBe(true);
    // the cap is 4 + 10 = 14; fill it, then the free word still lands over it
    s.g.characters[id].sigils = SIGILS.slice(0, 14).map((w) => w.id); (s.g.characters[id] as any).sigilGrowth.picksUsed = 9;
    expect(() => s.act({ type: 'sigil/learn', charId: id, word: SIGILS[20].id, free: false } as any)).toThrow(/No word to learn yet|banked/);
    s.act({ type: 'sigil/learn', charId: id, word: SIGILS[20].id } as any);
    expect(s.g.characters[id].sigils.length).toBe(15); expect((s.g.characters[id] as any).sigilGrowth.free).toBe(0);
    expect(() => s.act({ type: 'sigil/learn', charId: id, word: SIGILS[21].id, free: true } as any)).toThrow(/No free word/);
    s.g.characters[id].skills.eloquence = 10; s.act({ type: 'story/unfocus' } as any);
    expect((s.g.characters[id] as any).sigilGrowth.free).toBe(1); // once per skill (item 913)
  });
});

describe('the free word ignores the cap (item 913)', () => {
  it('taken while a slot is open, it does not fill that slot: the picks still fill every ordinary slot', () => {
    const s = storyWith([{ archetype: 'sigilist', kit: 'sigil', skills: { brain_power: 1 } }]); const id = s.chars[0].id, c = () => s.g.characters[id];
    c().sigils = ['spark', 'seek', 'fire', 'ward']; (c() as any).sigilGrowth = { study: 14, picksUsed: 0, free: 1, paid: [...ALL_PAID], toStudy: [], uses: {} };
    expect(wordsKnownCap(c())).toBe(5);
    s.act({ type: 'sigil/learn', charId: id, word: 'mend', free: true } as any);
    expect(wordsKnownCap(c())).toBe(6); // 4 + Brain Power 1, + the free word taken
    s.act({ type: 'sigil/learn', charId: id, word: 'acid' } as any); // the open ordinary slot is still there for a pick
    expect(c().sigils!.length).toBe(6); expect(sigilGrowthView(c())).toMatchObject({ known: 6, cap: 6, pending: 1 }); // cap 5, + 1 free
    expect(() => s.act({ type: 'sigil/learn', charId: id, word: 'bind' } as any)).toThrow(/banked/);
  });
  it('a free word taken at the cap stays over it when Brain Power rises: the new slot is an ordinary one', () => {
    const s = storyWith([{ archetype: 'sigilist', kit: 'sigil', skills: { brain_power: 0 } }]); const id = s.chars[0].id, c = () => s.g.characters[id];
    c().sigils = ['spark', 'seek', 'fire', 'ward']; (c() as any).sigilGrowth = { study: 6, picksUsed: 0, free: 1, paid: [...ALL_PAID], toStudy: [], uses: {} };
    s.act({ type: 'sigil/learn', charId: id, word: 'mend' } as any); // no slot: the free word, over the cap
    expect(c().sigils!.length).toBe(5); expect(sigilGrowthView(c()).pending).toBe(1);
    expect(() => s.act({ type: 'sigil/learn', charId: id, word: 'acid', free: false } as any)).toThrow(/banked/);
    c().skills.brain_power = 1; // one more slot
    s.act({ type: 'sigil/learn', charId: id, word: 'acid', free: false } as any);
    expect(c().sigils!.length).toBe(6);
  });
});

describe('the Narrator\'s word grant (item 914)', () => {
  it('a grant with no slot free goes on the known-to-study list instead', () => {
    const s = storyWith([{ archetype: 'sigilist', kit: 'sigil', skills: { brain_power: 0 } }]); const id = s.chars[0].id;
    s.g.characters[id].sigils = ['spark', 'seek', 'fire', 'ward'];
    s.act({ type: 'narrator/turn', turn: { narration: 'A scribe.', magic: [{ charId: id, word: 'MEND', reason: 'the scribe' }] } } as any);
    expect(s.g.characters[id].sigils).not.toContain('mend'); expect((s.g.characters[id] as any).sigilGrowth.toStudy).toEqual(['mend']);
    expect(s.g.story.entries.some((e) => /knows as many words as Brain Power allows: it goes on the known-to-study list/.test(e.text))).toBe(true);
  });
});

describe('word mastery and inflections (items 915-916)', () => {
  it('every Evoke counts each known word once (repeats once): Practised at 10, Mastered at 30', () => {
    const f = rig(['spark', 'seek', 'condense'], ['10,5']);
    uses(f, 'spark', 9); uses(f, 'seek', 29);
    draw(f, f.pc, ['spark', 'spark', 'seek'], ['6,5', '5,5', '4,5']); evoke(f, f.pc, '4,5', '10,5');
    expect(growth(f).uses).toEqual({ spark: 10, seek: 30 });
    const last = f.cb.log.find((l) => / evokes /.test(l))!;
    expect(last).toMatch(/SPARK is Practised \(10 uses\)/); expect(last).toMatch(/masters SEEK \(30 uses\)\. Its inflection is always on: SEEK has \+1 range\./);
    expect(f.unit(f.pc.id).mg!.inflect).toEqual(['seek']); // on at once, for the rest of the fight
    const v = sigilGrowthView(charOf(f));
    expect(v.words.find((w) => w.word === 'seek')).toMatchObject({ uses: 30, tier: 'mastered', inflection: { text: 'SEEK has +1 range.', unlocked: true } });
    expect(v.words.find((w) => w.word === 'spark')).toMatchObject({ tier: 'practised', inflection: { unlocked: false } });
  });
  it('every one of the 40 words has a provisional inflection the engine runs', () => {
    expect(SIGILS.length).toBe(40);
    for (const w of SIGILS) { const inf = (w as any).inflection; expect(inf?.text, w.id).toBeTruthy(); expect(inf.provisional).toBe(true); for (const e of inf.effects) { expect(e.op).toBe('inflection'); expect(INFLECTION_STATS.has(e.stat), w.id + ' ' + e.stat).toBe(true); } }
    expect(SIGIL.fire.inflection.text).toBe('When FIRE\'s Burning is put out, it keeps burning for 1 more round.'); expect(SIGIL.seek.inflection.text).toBe('SEEK has +1 range.');
    expect(SIGIL.spread.inflection.text).toBe('In a 4-glyph spell, SPREAD reaches 1 tile further.'); expect(SIGIL.ward.inflection.text).toBe('WARD\'s shield is 10% bigger.');
    expect(SIGIL.step.inflection.text).toBe('STEP teleports 1 tile further.'); expect(SIGIL.kin.inflection.text).toMatch(/^KIN also spares Downed and surrendered enemies/);
  });
  it('SEEK: +1 range once Mastered', () => {
    const f = rig(['spark', 'seek'], ['14,9']);
    draw(f, f.pc, ['spark', 'seek'], ['5,5', '4,5']);
    const before = previewEvoke(f.cb, f.unit(f.pc.id), '4,5').range; expect(before).toBe(8);
    uses(f, 'seek', 30);
    expect(previewEvoke(f.cb, f.unit(f.pc.id), '4,5').range).toBe(9);
  });
  it('WARD: the shield is 10% bigger (30 to 33)', () => {
    const f = rig(['ward', 'seek']);
    draw(f, f.pc, ['ward', 'seek'], ['5,5', '4,5']); evoke(f, f.pc, '4,5', '4,5');
    expect(f.unit(f.pc.id).shield).toBe(30);
    uses(f, 'ward', 30); f.unit(f.pc.id).shield = 0;
    draw(f, f.pc, ['ward', 'seek'], ['5,5', '4,5']); evoke(f, f.pc, '4,5', '4,5');
    expect(f.unit(f.pc.id).shield).toBe(33);
  });
  it('STEP: a teleport of 5 tiles is refused until STEP is Mastered (+1 tile)', () => {
    const f = rig(['step', 'seek'], ['8,5']);
    draw(f, f.pc, ['step', 'seek'], ['5,5', '4,5']);
    const pv = previewEvoke(f.cb, f.unit(f.pc.id), '4,5', '8,5', { dest: '13,5' });
    expect(pv.ok).toBe(false); expect(pv.why).toMatch(/STEP moves at most 4 tiles/);
    uses(f, 'step', 30);
    evoke(f, f.pc, '4,5', '8,5', { dest: '13,5' });
    expect(f.unit(f.foe.id).pos).toBe('13,5');
  });
  it('FIRE: its Burning lasts +1 round past being put out', () => {
    const f = rig(['fire', 'seek'], ['7,5'], ['7,6']); const foe = f.foe, ally = f.pcs[1];
    uses(f, 'fire', 30);
    draw(f, f.pc, ['fire', 'seek'], ['5,5', '4,5']); f.g.rng.state = crit();
    evoke(f, f.pc, '4,5', '7,5'); // from the end, east along the Line
    expect(f.cb.log.some((l) => /CRITICAL/.test(l))).toBe(true);
    expect(f.unit(foe.id).conds?.burning).toBe(99); expect(f.unit(foe.id).condArg?.burning).toBe('linger:1');
    const a = f.turn(ally); a.ap = 60;
    f.act({ type: 'combat/extinguish', unitId: a.id, targetId: foe.id } as any);
    expect(f.unit(foe.id).conds?.burning).toBe(1); expect(f.cb.log.some((l) => /smoulders 1 more round \(a Mastered FIRE\)/.test(l))).toBe(true);
    f.unit(a.id).ap = 60; f.act({ type: 'combat/extinguish', unitId: a.id, targetId: foe.id } as any);
    expect(f.unit(foe.id).conds?.burning ?? 0).toBe(0); // the second time it goes out
  });
  it('a charge inflection lowers the draw (NULL 3 to 2); TWICE\'s glyph adds no extra Flux', () => {
    const f = rig(['null', 'twice', 'seek']); const u = f.unit(f.pc.id);
    expect(glyphCost(f.cb, u, 'null').charge).toBe(3); expect(glyphCost(f.cb, u, 'twice').flux).toBe(2);
    uses(f, 'null', 30); uses(f, 'twice', 30);
    expect(glyphCost(f.cb, f.unit(f.pc.id), 'null').charge).toBe(2); expect(glyphCost(f.cb, f.unit(f.pc.id), 'twice').flux).toBe(1);
  });
  it('a Mastered word\'s inflection reaches the field its spell leaves (STAY: +1 round)', () => {
    const f = rig(['spark', 'stay', 'seek'], ['8,5']);
    draw(f, f.pc, ['spark', 'stay', 'seek'], ['6,5', '5,5', '4,5']); evoke(f, f.pc, '4,5', '8,5');
    const z0 = (f.cb.zones || []).find((z) => z.kind === 'field')!; expect(z0.left).toBe(2);
    uses(f, 'stay', 30); f.cb.zones = [];
    draw(f, f.pc, ['spark', 'stay', 'seek'], ['6,5', '5,5', '4,5']); evoke(f, f.pc, '4,5', '8,5');
    const z1 = (f.cb.zones || []).find((z) => z.kind === 'field')!; expect(z1.left).toBe(3); expect((z1 as any).infl).toContain('stay');
  });
  it('the Proving Ground grants study and sets a use count (30 turns the inflection on)', () => {
    let g = newGame('GROW15', { id: 'h1', name: 'Host' }, 'seed-grow');
    const a = ARCHETYPES.find((x) => x.id === 'sigilist')!;
    g = apply(g, { type: 'char/add', sheet: { name: 'Vel', portrait: '', origin: 'Thousand-Planet frontier', kit: 'sigil', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} } as Sheet }, 'h1');
    g = apply(g, { type: 'sandbox/start' }, 'h1');
    const id = Object.keys(g.characters)[0], w = g.characters[id].sigils![0], before = (g.characters[id] as any).sigilGrowth?.study || 0;
    g = apply(g, { type: 'sandbox/study', charId: id, study: 6 } as any, 'h1');
    expect((g.characters[id] as any).sigilGrowth.study).toBe(before + 6);
    g = apply(g, { type: 'sandbox/word-uses', charId: id, word: w, uses: 30 } as any, 'h1');
    expect(sigilGrowthView(g.characters[id]).words.find((x) => x.word === w)).toMatchObject({ uses: 30, tier: 'mastered', inflection: { unlocked: true } });
    expect(() => apply(g, { type: 'sandbox/word-uses', charId: id, word: 'not_a_word', uses: 3 } as any, 'h1')).toThrow(/No such word/);
  });
});

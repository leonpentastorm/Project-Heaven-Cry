// The Sigil view (rules 1.4, spec: Mana, Sigils 9): what the combat grid and the area map show before a glyph is drawn,
// while a Line is built, where to stand, the area, delivery, burst, who is affected, fizzle, and placed magic. Every
// number comes from the engine's preview; these tests check the screen says it.
import { describe, expect, it } from 'vitest';
import { ARCHETYPES, MAPS, newCharacter, startCombat, refOf, d20, drawGlyph, evoke, SIGIL, type Sheet, type Combat, type Unit, type MapDef } from '@engine';
import { drawStrip, wordRows, shortWhy, WORD_ROWS, patternPanel, evokeView, evokeClick, placedView, placedLegend, spellSummary, arrowOf, actionPreviewTiles } from './sigilView';
import { GLYPH_PATHS, glyphSvg } from './glyphs';

const arch = (id: string) => ARCHETYPES.find((a: any) => a.id === id)!;
const sheet = (archId: string, name: string): Sheet => { const a = arch(archId); return { name, portrait: '', origin: 'Central City', kit: 'sigil', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} } as Sheet; };
const open = (w = 20, h = 20): MapDef => ({ ...MAPS.yard, w, h, cover: [], full: [], solid: [], difficult: [], pcStart: ['2,5', '2,6', '2,7', '2,8'], foeStart: ['15,5', '15,6', '15,7', '15,8'] });
function seed(n = 16): { state: number } { for (let s = 1; s < 200000; s++) { const r = { state: s }; let ok = true; for (let i = 0; i < n && ok; i++) { const v = d20(r); ok = v > 1 && v < 20; } if (ok) return { state: s }; } throw new Error('no seed'); }
function setup(words: string[], foes: string[] = ['9,5'], allies: string[] = []) {
  const c = newCharacter('c1', 'p1', sheet('sigilist', 'Ilse')), extra = allies.map((at, i) => ({ c: newCharacter('a' + i, 'p1', sheet('sigilist', 'Ally ' + (i + 1))), pos: at }));
  const cb = startCombat('t', open(), [{ c, pos: '2,5' }, ...extra], foes.map((at, i) => ({ name: 'Foe ' + (i + 1), tier: 'minion', weapon: 'service_pistol', at: refOf(at) })), 'easy', { state: 7 }, []) as Combat;
  cb.objects = [];
  const u = cb.units.find((x) => x.charId === 'c1')!, es = cb.units.filter((x) => x.side === 'foe');
  for (const x of cb.units.filter((y) => y.side === 'pc')) { x.ap = 99; x.mg!.words = [...words]; x.mg!.maxWords = 4; x.mg!.charge = 999; x.mg!.flux = -99; x.mg!.sigilMult = 1; x.mg!.elemMult = 1; x.mg!.healMult = 1; x.mg!.rangeBonus = 0; x.mg!.durBonus = 0; x.mg!.coreSave = 0; x.mg!.glyphAp = 1; x.hp = x.maxHp = 500; x.armour = 0; }
  for (const e of es) { e.def = -99; e.hp = e.maxHp = 500; e.armour = 0; (e as any).sv = { body: -99, brain: -99, heart: -99 }; }
  cb.mana = 15;
  return { cb, u, es, rng: seed() };
}
function walk(cb: Combat, rng: { state: number }, u: Unit, words: string[], tiles: string[]) { for (let i = 0; i < words.length; i++) { u.pos = tiles[i]; const e = drawGlyph(cb, rng, u, words[i]); if (e) throw new Error(e); } }
const knowsNone = () => false;

describe('glyphs', () => {
  it('every 1.4 word has its own glyph path, and each draws as an SVG', () => {
    const ids = Object.keys(SIGIL);
    expect(ids.length).toBe(40);
    for (const id of ids) { expect(GLYPH_PATHS[id], id).toBeTruthy(); expect(glyphSvg(id)).toContain('<path d="' + GLYPH_PATHS[id] + '"'); }
    const paths = ids.map((id) => GLYPH_PATHS[id]); expect(new Set(paths).size).toBe(paths.length); // no two words share a glyph
  });
});

describe('before drawing (spec 9.1)', () => {
  it('each word shows its cost on your tile and whether it starts or extends a Line (rules 1.10: a bend starts a new stroke)', () => {
    const { cb, u, rng } = setup(['fire', 'seek', 'condense', 'kin']);
    let s = drawStrip(cb, u);
    expect(s.tile).toBe('2,5');
    const fire = s.words.find((w) => w.id === 'fire')!;
    expect(fire.ok).toBe(true); expect(fire.effect).toBe('starts'); expect(fire.cost.charge).toBe(2); expect(fire.sub).toBe('2 ch · 1 AP · starts');
    walk(cb, rng, u, ['fire'], ['2,5']);
    s = drawStrip(cb, u);
    expect(s.words.find((w) => w.id === 'seek')!.ok).toBe(false); // one glyph a tile: your own tile is taken
    expect(s.words.find((w) => w.id === 'seek')!.why).toMatch(/One glyph per tile/);
    u.pos = '3,5'; s = drawStrip(cb, u);
    const seek = s.words.find((w) => w.id === 'seek')!;
    expect(seek.effect).toBe('extends'); expect(seek.effectText).toBe('extends the Line: FIRE · SEEK');
    u.pos = '3,6'; walk(cb, rng, u, ['seek'], ['3,5']); u.pos = '3,6';
    expect(drawStrip(cb, u).words.find((w) => w.id === 'condense')!.effect).toBe('starts'); // a bend no longer breaks the Line: it starts a new stroke
  });
});

describe('while building (spec 9.2)', () => {
  it('the Line\'s words in order, its verdict, cap left and charge/AP/Flux now and after', () => {
    const { cb, u, rng } = setup(['fire', 'seek', 'condense']);
    walk(cb, rng, u, ['seek'], ['2,5']);
    let p = patternPanel(cb, '2,5', u, knowsNone)!;
    expect(p.shape).toBe('No shape'); expect(p.verdict).toMatch(/^◆ One glyph alone/);
    walk(cb, rng, u, ['condense'], ['3,5']);
    p = patternPanel(cb, '2,5', u, knowsNone)!;
    expect(p.words.map((w) => w.word)).toEqual(['SEEK', 'CONDENSE']); expect(p.verdict).toMatch(/Needs a Subject/);
    walk(cb, rng, u, ['fire'], ['4,5']);
    p = patternPanel(cb, '3,5', u, knowsNone)!;
    expect(p.valid).toBe(true); expect(p.shape).toBe('Line of 3'); expect(p.verdict).toMatch(/^✓ A spell: FIRE, a bolt, range 8, core ×1.5/);
    expect(p.capLeft).toBe(1); expect(p.lineLeft).toBe(1);
    expect(p.stats.map((s) => s.k)).toEqual(['Charge', 'AP', 'Flux']);
    expect(p.stats[0].after).toMatch(/\(−3\)$/); // 3 glyphs fire for 3 charge
  });
  it('a hostile Line shows unreadable marks unless you know the words', () => {
    const { cb, u, es, rng } = setup(['fire', 'seek']);
    const e = es[0]; e.mg = { ...u.mg!, words: ['shock', 'seek'] } as any; e.pos = '10,10';
    walk(cb, rng, e, ['shock', 'seek'], ['10,10', '11,10']);
    let p = patternPanel(cb, '10,10', u, (w) => u.mg!.words.includes(w))!;
    expect(p.ours).toBe(false); expect(p.words.map((w) => w.word)).toEqual(['?', 'SEEK']); expect(p.verdict).toMatch(/Unreadable/); expect(p.stats).toEqual([]);
    p = patternPanel(cb, '10,10', u, () => true)!;
    expect(p.words.map((w) => w.word)).toEqual(['SHOCK', 'SEEK']);
  });
  it('spell summaries read the compiled numbers', () => {
    expect(spellSummary(['fire', 'fire', 'condense'])).toBe('FIRE, Touch (1 tile, or yourself), core ×1.5, repeats ×0.9');
    expect(spellSummary(['shock', 'seek', 'chain'])).toMatch(/chains 2 times|chains 1 time/);
  });
});

describe('Evoke (spec 9.3–9.8)', () => {
  it('where to stand: each tile with its facing arrow, refused tiles say why', () => {
    const { cb, u, rng } = setup(['fire', 'seek']);
    walk(cb, rng, u, ['fire', 'seek'], ['2,5', '3,5']); u.pos = '2,4';
    let v = evokeView(cb, u, '2,5');
    expect(v.stage).toBe('aim'); // beside the Line: across it, firing away from you (down)
    expect(v.facing).toMatch(/^↓ \(across/);
    u.pos = '1,9'; v = evokeView(cb, u, '2,5');
    expect(v.stage).toBe('stand');
    const end = v.origins.find((o) => o.tile === '4,5')!; expect(end.ok).toBe(true); expect(end.arrow).toBe('←');
    expect(v.origins.find((o) => o.tile === '1,5')!.arrow).toBe('→');
    expect(v.tiles['4,5'].marks.some((m) => m.key === 'from' && m.text === '←')).toBe(true);
    expect(evokeClick(v, cb, u, '4,5', {}).toast).toMatch(/Move onto E6 first: from there it fires ←/);
  });
  it('a middle glyph is refused with its reason', () => {
    const { cb, u, rng } = setup(['fire', 'seek', 'condense']);
    walk(cb, rng, u, ['fire', 'seek', 'condense'], ['2,5', '3,5', '4,5']); u.pos = '3,5';
    const v = evokeView(cb, u, '2,5');
    expect(v.stage).toBe('stand'); expect(v.hint).toMatch(/middle glyph/);
    expect(v.origins.find((o) => o.tile === '3,5')!.ok).toBe(false);
  });
  it('the area is tinted, a hovered bolt shows its path, the target is marked with numbers and a hit chance', () => {
    const { cb, u, es, rng } = setup(['fire', 'seek']);
    walk(cb, rng, u, ['fire', 'seek'], ['2,5', '3,5']); u.pos = '1,5'; // behind the end: along the Line, firing → from its far end
    const e = es[0]; e.pos = '8,5';
    let v = evokeView(cb, u, '2,5', {}, '8,5');
    expect(v.facing).toMatch(/^→ \(along/); expect(v.area.has('8,5')).toBe(true); expect(v.tiles['9,5'].layer).toMatch(/rgba\(79, 200, 223/);
    expect(v.tiles['5,5'].marks.some((m) => m.key === 'path0' && m.text === '→')).toBe(true);
    const row = v.affected.find((a) => a.unit === e.id)!;
    expect(row.tag).toBe('ENEMY'); expect(row.text).toMatch(/^−51 HP · 95% to hit/); // FIRE 30 × the Line multiplier of 2 glyphs, ×1.7 (rules 1.17)
    expect(v.payload).toBeNull();
    const k = evokeClick(v, cb, u, '8,5', {}); expect(k.choice!.aims).toEqual(['8,5']);
    v = evokeView(cb, u, '2,5', k.choice!);
    expect(v.ok).toBe(true); expect(v.payload).toEqual({ tile: '2,5', aim: '8,5' });
    // what the screen promised is what the engine does
    const hp0 = e.hp; expect(evoke(cb, rng, u, '2,5', '8,5')).toBeNull(); expect(hp0 - e.hp).toBe(51);
  });
  it('a bolt stopped by a creature on the way shows the stop; burst tiles and the CONDENSE core', () => {
    const { cb, u, es, rng } = setup(['fire', 'seek', 'spread', 'condense'], ['8,5', '6,5']);
    walk(cb, rng, u, ['fire', 'seek', 'spread'], ['2,5', '3,5', '4,5']); u.pos = '1,5';
    let v = evokeView(cb, u, '2,5', {}, '8,5');
    expect(v.tiles['6,5'].marks.some((m) => m.key === 'block0' && /STOPS/.test(m.text))).toBe(true);
    expect(v.tiles['7,6'].marks.some((m) => m.key === 'mult0' && m.text === '×0.6')).toBe(true);
    void es;
  });
  it('KIN spares are marked apart; a fizzle warns before confirm', () => {
    const { cb, u, rng } = setup(['fire', 'kin'], ['15,15'], ['3,4']);
    walk(cb, rng, u, ['fire', 'kin'], ['2,5', '3,5']); u.pos = '1,5'; // along, firing →; KIN on yourself
    const v = evokeView(cb, u, '2,5', { aims: ['1,5'] });
    expect(v.fizzle).toBe(true); expect(v.fizzleText).toMatch(/^There is nothing this spell can affect, so it will fizzle/);
    expect(v.affected.find((a) => a.unit === u.id)!.tag).toBe('SPARED (KIN)');
  });
  it('TWICE needs one aim per missile, numbered', () => {
    const { cb, u, es, rng } = setup(['fire', 'seek', 'twice'], ['8,5', '8,6']);
    walk(cb, rng, u, ['fire', 'seek', 'twice'], ['2,5', '3,5', '4,5']); u.pos = '1,5';
    let v = evokeView(cb, u, '2,5', { aims: ['8,5'] }, '8,6');
    expect(v.missilesNeeded).toBe(2);
    expect(v.tiles['8,5'].marks.some((m) => m.text === '◎1')).toBe(true);
    expect(v.tiles['8,6'].marks.some((m) => m.text === 'M2')).toBe(true);
    v = evokeView(cb, u, '2,5', { aims: ['8,5', '8,6'] });
    expect(v.ok).toBe(true); expect(v.payload.aims).toEqual(['8,5', '8,6']);
    void es;
  });
  it('CHAIN jumps are numbered with their multipliers', () => {
    const { cb, u, rng } = setup(['shock', 'seek', 'chain'], ['8,5', '10,5', '12,5']);
    walk(cb, rng, u, ['shock', 'seek', 'chain'], ['2,5', '3,5', '4,5']); u.pos = '1,5';
    const v = evokeView(cb, u, '2,5', { aims: ['8,5'] });
    expect(v.tiles['10,5'].marks.find((m) => m.key.startsWith('chain'))!.text).toBe('⚡1 ×0.75');
  });
  it('arrowOf maps directions', () => { expect(arrowOf([1, -1])).toBe('↗'); expect(arrowOf(null)).toBe(''); });
});

describe('placed magic (spec 9.9)', () => {
  it('a field is tinted by its element with rounds left; your trap shows to you, a hidden enemy trap does not', () => {
    const { cb, u, es, rng } = setup(['fire', 'stay', 'wait']);
    walk(cb, rng, u, ['fire', 'stay'], ['2,5', '3,5']); u.pos = '1,5';
    expect(evoke(cb, rng, u, '2,5', '4,5')).toBeNull();
    let p = placedView(cb, 'pc');
    expect(p.rows[0].kind).toBe('field'); expect(p.rows[0].label).toBe('FIRE field'); expect(p.tiles['4,5'].layer).toMatch(/246, 138, 56/);
    expect(p.tiles['4,5'].marks[0].text).toMatch(/^▦\d/);
    expect(placedLegend(p.kinds, true).map((l) => l.key)).toContain('zf');
    // an enemy trap, hidden from you
    cb.zones = [...(cb.zones || []), { id: 'zx', kind: 'trap', tiles: ['12,12'], words: ['fire', 'wait'], by: es[0].id, side: 'foe', left: 3, mult: 1, who: 'Foe 1', hidden: true, spotted: [], triggers: 1 } as any];
    p = placedView(cb, 'pc'); expect(p.tiles['12,12']).toBeUndefined();
    (cb.zones as any).find((z: any) => z.id === 'zx').spotted = ['pc'];
    p = placedView(cb, 'pc'); expect(p.rows.find((r) => r.key === 'zx')!.label).toBe('Spotted trap');
  });
});

describe('the preview gaps of batch 1 (spec 9.7, 9.9; items 480)', () => {
  const L2 = ['3,5', '2,5'], L3 = ['4,5', '3,5', '2,5'];
  it('LEECH: the caster\'s heal shows as a row and on your tile before you Evoke', () => {
    const { cb, u, rng } = setup(['fire', 'seek', 'leech'], ['8,5']); u.hp = 300;
    walk(cb, rng, u, ['fire', 'leech', 'seek'], L3);
    const v = evokeView(cb, u, '2,5', { aims: ['8,5'] });
    expect(v.leech).toMatchObject({ heal: 26, restored: 26 }); // half of FIRE 30 × 1.75 (a Line of 3, rules 1.17) = 53
    const row = v.affected.find((a) => a.key === 'leech')!; expect(row.extra).toBe(true); expect(row.text).toMatch(/LEECH: \+26 HP if every hit lands/);
    expect(v.tiles['2,5'].marks.some((m) => m.text === '+26 HP')).toBe(true);
  });
  it('NULL marks what it would unmake; the other side\'s unspotted trap stays unknown', () => {
    const { cb, u, rng } = setup(['null', 'seek', 'spread'], ['14,14']);
    cb.zones = [{ id: 'zf', kind: 'field', tiles: ['8,5'], words: ['fire', 'stay'], by: 'x', side: 'foe', left: 2, mult: 0.5, who: 'Foe 1' } as any,
      { id: 'zt', kind: 'trap', tiles: ['9,6'], words: ['fire', 'wait'], by: 'x', side: 'foe', left: 3, mult: 1, who: 'Foe 1', hidden: true, spotted: [] } as any];
    walk(cb, rng, u, ['null', 'spread', 'seek'], L3);
    const v = evokeView(cb, u, '2,5', { aims: ['8,5'] });
    expect(v.plan.missiles[0].nulls).toBe(2); // the engine counts both
    expect(v.nulls).toEqual([{ kind: 'field', tiles: ['8,5'], mine: false }]); // the screen shows only what you know of
    expect(v.tiles['8,5'].marks.some((m) => m.text === '⊘ FIELD')).toBe(true); expect((v.tiles['9,6']?.marks || []).some((m) => /TRAP/.test(m.text))).toBe(false);
    expect(v.affected.find((a) => a.key === 'null')!.text).toMatch(/hostile field at/);
  });
  it('LIGHT draws its radius 4 and marks your side\'s Hidden it would reveal', () => {
    const { cb, u, rng } = setup(['light', 'seek'], ['14,14'], ['10,6']); const ally = cb.units.find((x) => x.side === 'pc' && x !== u)!; ally.hidden = true;
    walk(cb, rng, u, ['light', 'seek'], L2);
    const v = evokeView(cb, u, '2,5', { aims: ['8,5'] });
    expect(v.tiles['12,9'].marks.some((m) => m.key === 'lit')).toBe(true); expect(v.tiles['13,5']?.marks.some((m) => m.key === 'lit') || false).toBe(false);
    expect(v.tiles['10,6'].marks.some((m) => m.text === '☀ REVEALED')).toBe(true);
  });
  it('a turret shows its reach and who it would fire at, before the Evoke and once placed', () => {
    const { cb, u, es, rng } = setup(['shock', 'seek', 'watch'], ['10,5', '12,5']);
    walk(cb, rng, u, ['shock', 'watch', 'seek'], L3);
    const v = evokeView(cb, u, '2,5', { aims: ['8,5'] });
    expect(v.tiles['14,5'].marks.some((m) => m.key === 'tp0r')).toBe(true); expect(v.tiles['10,5'].marks.some((m) => m.text === '▲ NEXT')).toBe(true);
    expect(evoke(cb, rng, u, '2,5', '8,5')).toBeNull();
    const p = placedView(cb, 'pc'), row = p.rows.find((r) => r.kind === 'turret')!;
    expect(row.text).toMatch(/reach 8 tiles, would fire at Foe 1 now/); void es;
    expect(p.tiles['12,5'].marks.some((m) => /r$/.test(m.key))).toBe(true); expect(p.tiles['10,5'].marks.some((m) => m.text === '▲ NEXT')).toBe(true);
  });
  it('Boons say what they give: QUICKEN +2 AP, SHARPEN +3 / ×1.25, MASK Hidden 2 rounds', () => {
    const { cb, u, rng } = setup(['quicken', 'sharpen', 'mask', 'relay', 'condense'], ['14,14'], ['7,5']);
    walk(cb, rng, u, ['quicken', 'relay'], L2);
    expect(evokeView(cb, u, '2,5', { aims: ['7,5'] }).affected[0].text).toBe('+2 AP on their next turn (ceiling 9)');
    cb.glyphs = []; walk(cb, rng, u, ['sharpen', 'relay'], L2);
    expect(evokeView(cb, u, '2,5', { aims: ['7,5'] }).affected[0].text).toBe('next attack +3 to hit, ×1.25 damage');
    cb.glyphs = []; walk(cb, rng, u, ['mask', 'condense'], L2);
    expect(evokeView(cb, u, '2,5', { aims: ['2,5'] }).affected[0].text).toBe('Hidden until they attack, or 2 rounds');
  });
  it('COMMAND · move marks the tiles it may send them to; a click outside them is refused', () => {
    const { cb, u, rng } = setup(['command', 'seek'], ['8,5']);
    walk(cb, rng, u, ['command', 'seek'], L2);
    const v = evokeView(cb, u, '2,5', { aims: ['8,5'], order: 'move' });
    expect(v.stage).toBe('order'); expect(v.orderTo.has('8,8')).toBe(true); expect(v.orderTo.has('8,9')).toBe(false);
    expect(v.tiles['8,8'].marks.some((m) => m.key === 'orderto')).toBe(true);
    expect(evokeClick(v, cb, u, '8,9', { aims: ['8,5'], order: 'move' }).toast).toMatch(/at most 3 tiles/);
    expect(evokeClick(v, cb, u, '8,8', { aims: ['8,5'], order: 'move' }).choice!.orderTo).toBe('8,8');
    const r = evokeView(cb, u, '2,5', { aims: ['8,5'], order: 'kneel' }); expect(r.affected[0].text).toMatch(/if it fails: kneels/);
  });
  it('COMMAND · move with a tile picked draws the walk it would take, step by step (spec 9.5; item 481)', () => {
    const { cb, u, rng } = setup(['command', 'seek'], ['8,5']);
    walk(cb, rng, u, ['command', 'seek'], L2);
    const v = evokeView(cb, u, '2,5', { aims: ['8,5'], order: 'move', orderTo: '8,8' });
    expect(v.stage).toBe('ready'); expect(v.orderPath).toEqual(['8,6', '8,7', '8,8']);
    expect(v.tiles['8,6'].marks.some((m) => m.key === 'orderpath' && m.text === '·1')).toBe(true);
    expect(v.tiles['8,8'].marks.some((m) => m.key === 'orderat')).toBe(true);
    expect(v.payload).toMatchObject({ order: 'move', orderTo: '8,8' });
  });
  it('Paint the Field: a holder gets SPREAD / PUSH chips on a spell with no Burst; the pick rides the payload (item 485)', () => {
    const { cb, u, rng } = setup(['spark', 'seek', 'condense'], ['8,5', '9,6']);
    walk(cb, rng, u, ['spark', 'seek'], L2);
    expect(evokeView(cb, u, '2,5', { aims: ['8,5'] }).paints).toEqual([]); // not held
    (u as any).held = { perks: [], traits: [], skills: ['visualization.5'] };
    const v = evokeView(cb, u, '2,5', { aims: ['8,5'] }); expect(v.paints).toEqual(['spread', 'push']);
    const p = evokeView(cb, u, '2,5', { aims: ['8,5'], paint: 'spread' });
    expect(p.paint).toBe('spread'); expect(p.payload).toMatchObject({ paint: 'spread' }); expect(p.affected.filter((a) => !a.extra).length).toBe(2);
    cb.glyphs = []; walk(cb, rng, u, ['spark', 'condense'], L2);
    expect(evokeView(cb, u, '2,5', { aims: ['3,5'] }).paints).toEqual([]); // it has a Burst word
  });
});

describe('class moves that cast paint the grid (item 489 c)', () => {
  it('area tinted, covered tiles framed, each affected creature marked ally or enemy; Sigil moves in Mind cyan', () => {
    const { cb, u, es } = setup(['fire', 'seek'], ['8,5']);
    const t = actionPreviewTiles(cb, { area: ['6,5', '7,5'], tiles: ['8,5', '9,5'], targets: [es[0].id, u.id], sigil: true });
    expect(t['6,5'].layer).toMatch(/79, 200, 223/); expect(t['8,5'].layer).toMatch(/inset 0 0 0 2px #4FC8DF/i);
    expect(t['8,5'].marks.find((m) => m.key === 'pkwho')!.text).toBe('ENEMY'); expect(t['2,5'].marks.find((m) => m.key === 'pkwho')!.text).toBe('ALLY');
    expect(actionPreviewTiles(cb, { tiles: ['8,5'] })['8,5'].layer).not.toMatch(/79, 200, 223/); // not Sigil: neutral
    expect(actionPreviewTiles(cb, null)).toEqual({});
  });
  it('the glyph keyboard\'s rows: the four Subject kinds, then Reach, Delivery, Burst, Filter; every word in exactly one row', () => {
    expect(WORD_ROWS.map((r) => r.label)).toEqual(['Elements', 'Afflictions', 'Boons', 'Workings', 'Reach', 'Delivery', 'Burst', 'Filter']);
    const all = Object.keys(SIGIL), rows = wordRows(all, (w) => w);
    expect(rows.map((r) => r.key)).toEqual(WORD_ROWS.map((r) => r.cls)); // all 40 words: no "Other" row
    expect(rows.flatMap((r) => r.items).sort()).toEqual([...all].sort());
    expect(wordRows(['seek', 'fire', 'nonsense'], (w) => w).map((r) => [r.label, r.items])).toEqual([['Elements', ['fire']], ['Reach', ['seek']], ['Other', ['nonsense']]]);
    expect(wordRows([], (w: string) => w)).toEqual([]);
  });
  it('a refused key\'s short hint', () => {
    expect(shortWhy('One glyph per tile: this tile already holds FIRE.')).toBe('tile taken');
    expect(shortWhy('Needs 1.8 AP.')).toBe('needs 1.8 AP');
    expect(shortWhy('Past your cap: 3 glyphs, and your Max Sigil words is 2.')).toBe('over your cap');
    expect(shortWhy('A second Reach word is refused: one Reach word per spell (SEEK, ARC).')).toBe('one Reach only');
    expect(shortWhy('Silenced: no magic this round.')).toBe('silenced');
    expect(shortWhy('Not your turn.')).toBe('not your turn');
    expect(shortWhy('Something new.')).toBe('can\'t now');
  });
});

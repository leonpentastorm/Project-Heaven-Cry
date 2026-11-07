// Magic, rules 1.2 (spec: Mana): Sigil glyphs and patterns, Evoke, Flux, Outbursts held and released, Strain, the meter.
import { describe, expect, it } from 'vitest';
import {
  ARCHETYPES, MAPS, newCharacter, validateSheet, startCombat, apply, newGame, positionsOf, zoneMap, npcsOf, refOf, keyOf,
  drawGlyph, evoke, findPattern, previewEvoke, scuff, vent, beginOutburst, releaseOutburst, syphon, crystallise, magicTurnStart, moveUnit,
  designCost, manaOf, coresCarried, packOf, type Sheet, type GameState, type Combat,
} from '../src';

const arch = (id: string) => ARCHETYPES.find((a: any) => a.id === id)!;
const sheet = (archId: string, name: string, extra: Partial<Sheet> = {}): Sheet => { const a = arch(archId); return { name, portrait: '', origin: 'Central City', kit: 'medic', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {}, ...extra }; };
const yard = { ...MAPS.yard, cover: [], full: [], solid: [], difficult: [] };
function fight(s: Sheet, foeAt = '6,5', seed = 7) {
  const c = newCharacter('c1', 'p1', s);
  const cb = startCombat('t', yard, [{ c, pos: '2,5' }], [{ name: 'Guard', tier: 'minion', weapon: 'service_pistol', at: refOf(foeAt) }], 'easy', { state: seed }, []);
  const u = cb.units.find((x) => x.side === 'pc')!, e = cb.units.find((x) => x.side === 'foe')!;
  u.ap = 9; e.def = 1; // make hits reliable for the rules under test
  return { c, cb, u, e, rng: { state: seed } };
}

describe('starting magic (spec: The Magic panel)', () => {
  it('a Sigil student starts with SPARK + CONDENSE and a loaded Evoker; a Soul initiate with one Outburst and full MP', () => {
    const s = newCharacter('a', 'p', sheet('sigilist', 'S', { kit: 'sigil' }));
    expect(s.sigils).toEqual(['spark', 'condense']); expect(s.outbursts!.length).toBe(0);
    const w = newCharacter('b', 'p', sheet('stormcaller', 'W', { kit: 'soul' }));
    expect(w.outbursts!.map((d) => d.school)).toEqual(['damage']); expect(w.soulKnown!.schools).toEqual(['damage']);
  });
  it('picked words must make a Stack; an Outburst fits the module slots', () => {
    expect(validateSheet(sheet('sigilist', 'S', { kit: 'sigil', sigils: ['fire', 'freeze'] }))).toMatch(/Stack/);
    expect(validateSheet(sheet('sigilist', 'S', { kit: 'sigil', sigils: ['fire', 'push'] }))).toBeNull();
    expect(validateSheet(sheet('stormcaller', 'W', { kit: 'soul', outburst: { school: 'damage', modules: ['move', 'homing', 'swift', 'rain'] } }))).toMatch(/slot/);
  });
});

describe('Sigils on the map (spec: Sigils)', () => {
  it('a Stack: draw two words beside you, Evoke at an adjacent foe; charge on drawing and more on firing', () => {
    const { cb, u, e, rng } = fight(sheet('sigilist', 'S', { kit: 'sigil' }), '4,5');
    expect(drawGlyph(cb, rng, u, 'spark', '3,5')).toBeNull();
    expect(drawGlyph(cb, rng, u, 'condense', '3,5')).toBeNull();
    expect(u.mg!.charge).toBe(10 - 2); expect(u.mg!.flux).toBe(2);
    const p = findPattern(cb, '3,5', u.pos); expect(typeof p === 'object' && p.shape).toBe('stack');
    expect(previewEvoke(cb, u, '3,5').ok).toBe(false); // a stack needs a tile to land on
    const hp = e.hp; expect(evoke(cb, rng, u, '3,5', e.pos)).toBeNull();
    expect(u.mg!.charge).toBe(8 - 2); expect(cb.glyphs!.length).toBe(0); expect(cb.log.at(-1)).toMatch(/evokes SPARK · CONDENSE/);
    expect(e.hp < hp || /misses/.test(cb.log.at(-1)!)).toBe(true);
  });
  it('a Line fires from its far end; its range grows with its length (2 tiles reach 4)', () => {
    const { cb, u, e, rng } = fight(sheet('sigilist', 'S', { kit: 'sigil', sigils: ['fire', 'condense'] }), '9,5');
    u.mg!.words.push('push');
    drawGlyph(cb, rng, u, 'fire', '3,5'); u.pos = '3,5'; drawGlyph(cb, rng, u, 'condense', '4,5'); u.pos = '2,5';
    let p = findPattern(cb, '3,5', u.pos); expect(typeof p === 'object' && p.shape).toBe('line');
    expect(previewEvoke(cb, u, '3,5').targets).toEqual([]); // the foe at J6 is 5 tiles past the end: out of a 2-tile line's reach
    u.pos = '4,5'; drawGlyph(cb, rng, u, 'push', '5,5'); u.pos = '2,5';
    p = findPattern(cb, '3,5', u.pos); expect(typeof p === 'object' && p.tiles.length).toBe(3);
    expect(previewEvoke(cb, u, '3,5').targets).toEqual([e.id]); // a 3-tile line reaches 8
  });
  it('a Ring of 3 around a centre; STAY makes the wall stand; walking through it burns', () => {
    const { cb, u, e, rng } = fight(sheet('sigilist', 'S', { kit: 'sigil', sigils: ['fire', 'stay'] }), '9,5');
    u.mg!.maxWords = 3; u.mg!.words.push('condense');
    drawGlyph(cb, rng, u, 'fire', '3,4'); drawGlyph(cb, rng, u, 'stay', '3,6'); u.pos = '2,6'; drawGlyph(cb, rng, u, 'condense', '2,5'); u.pos = '1,5';
    expect(drawGlyph(cb, rng, u, 'fire', '9,9')).toMatch(/own tile or one next to you/);
    const p = findPattern(cb, '3,4', '2,5'); expect(typeof p === 'object' && p.shape).toBe('ring');
    u.pos = '2,4'; expect(evoke(cb, rng, u, '3,4')).toBeNull(); expect(cb.zones!.length).toBe(1); expect(cb.glyphs!.length).toBe(3); // the glyphs stay
    e.pos = '3,3'; const hp = e.hp; e.ap = 9; moveUnit(cb, e, '3,5', rng);
    expect(e.hp).toBeLessThan(hp); expect(cb.log.join(' ')).toMatch(/crosses the FIRE wall/);
  });
  it('Flux past 6 overloads the Evoker; Vent dumps Flux into the air; foes scuff glyphs they stand on', () => {
    const { cb, u, rng } = fight(sheet('sigilist', 'S', { kit: 'sigil' }), '9,9');
    u.mg!.flux = 6; u.mg!.charge = 10; const m0 = manaOf(cb), hp = u.hp;
    drawGlyph(cb, rng, u, 'spark', '3,5');
    expect(u.hp).toBeLessThan(hp); expect(u.mg!.flux).toBe(0); expect(manaOf(cb)).toBe(m0 + 7); expect(drawGlyph(cb, rng, u, 'spark', '3,5')).toMatch(/locked/);
    u.mg!.lockRound = -1; u.mg!.flux = 3; expect(vent(cb, u)).toBeNull(); expect(manaOf(cb)).toBe(m0 + 10);
    expect(scuff(cb, u)).toMatch(/No glyphs/); u.pos = '3,5'; expect(scuff(cb, u)).toBeNull(); expect(cb.glyphs!.length).toBe(0);
  });
});

describe('Outbursts (spec: Soul magic)', () => {
  it('held, it grows a stage each turn and strains the heart; released at stage 2 it hits harder', () => {
    const { cb, u, e, rng } = fight(sheet('stormcaller', 'W', { kit: 'soul' }));
    const d = u.mg!.designs[0], cost = designCost(u.mg!, d, manaOf(cb)), mp = u.mg!.mp;
    expect(beginOutburst(cb, rng, u, d.id, undefined, true)).toBeNull();
    expect(u.mg!.mp).toBe(mp - cost); expect(u.mg!.held!.stage).toBe(1); expect(u.mg!.strain).toBe(1);
    magicTurnStart(cb, rng, u); expect(u.mg!.held!.stage).toBe(2); expect(u.mg!.strain).toBe(2);
    u.ap = 9; expect(releaseOutburst(cb, rng, u, e.pos)).toBeNull();
    expect(u.mg!.held).toBeNull(); expect(cb.log.at(-1)).toMatch(/releases .* at stage 2/);
  });
  it('past the Strain limit comes the Mana Short; a burst heart Downs, never kills', () => {
    const { cb, u, rng } = fight(sheet('stormcaller', 'W', { kit: 'soul' }));
    u.mg!.strain = u.mg!.strainLimit; u.mg!.held = { design: u.mg!.designs[0].id, stage: 1, cost: 20 };
    for (let i = 0; i < 40 && !u.downed; i++) { u.hp = u.maxHp; u.mg!.strain = u.mg!.strainLimit; u.mg!.held = { design: u.mg!.designs[0].id, stage: 1, cost: 20 }; magicTurnStart(cb, { state: 1000 + i }, u); }
    expect(cb.log.join(' ')).toMatch(/MANA SHORT|holds the Strain/);
    if (u.downed) expect(u.dead).toBe(false);
  });
  it('Syphon refills MP and thins the air; Crystallise makes a core, written to the pack', () => {
    const { c, cb, u } = fight(sheet('stormcaller', 'W', { kit: 'soul' }));
    u.mg!.mp = 10; const m0 = manaOf(cb);
    expect(syphon(cb, u)).toBeNull(); expect(u.mg!.mp).toBeGreaterThan(10); expect(manaOf(cb)).toBe(m0 - 2);
    cb.mana = 9; expect(crystallise(cb, u)).toMatch(/too thin/); cb.mana = 20;
    expect(crystallise(cb, u)).toBeNull(); expect(manaOf(cb)).toBe(10);
  });
});

describe('magic in the story (spec: Overworld rounds, Mana)', () => {
  const open = () => {
    let g: GameState = newGame('ROOM', { id: 'host', name: 'Leon' }, 'magic');
    g = apply(g, { type: 'char/add', sheet: sheet('sigilist', 'Ilse', { kit: 'sigil', sigils: ['fire', 'condense'] }) }, 'host');
    g = apply(g, { type: 'session/start' }, 'host');
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'Open.' } as any }, 'host');
    return { g, id: Object.keys(g.characters)[0] };
  };
  it('glyphs drawn on the area map stay there between actions and run down with the rounds', () => {
    let { g, id } = open(); const at = positionsOf(g)[id], [x, y] = at.split(',').map(Number), t = (x + 1) + ',' + y;
    g = apply(g, { type: 'world/act', charId: id, act: 'draw', word: 'fire', tile: t }, 'host');
    expect(g.story.glyphs!.map((gl) => gl.word)).toEqual(['fire']); expect(g.characters[id].evoCharge).toBe(8);
    g = apply(g, { type: 'world/act', charId: id, act: 'draw', word: 'condense', tile: t }, 'host');
    expect(new Set(g.story.glyphs!.map((gl) => gl.id)).size).toBe(2); // ids stay unique between actions
    const left = g.story.glyphs![0].left;
    g = apply(g, { type: 'world/act', charId: id, act: 'end' }, 'host');
    expect(g.story.glyphs![0].left).toBe(left - 1);
  });
  it('a spell at a person on the map starts the fight', () => {
    let { g, id } = open(); const at = positionsOf(g)[id], [x, y] = at.split(',').map(Number);
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'A drone.', npcs: [{ action: 'place', name: 'Scavenger drone', side: 'hostile', tier: 'minion', weapon: 'service_pistol', at: refOf((x + 2) + ',' + y) }] } as any }, 'host');
    g = apply(g, { type: 'world/act', charId: id, act: 'draw', word: 'fire', tile: (x + 1) + ',' + y }, 'host');
    g = apply(g, { type: 'world/act', charId: id, act: 'draw', word: 'condense', tile: (x + 1) + ',' + y }, 'host');
    g = apply(g, { type: 'world/act', charId: id, act: 'evoke', tile: (x + 1) + ',' + y, aim: (x + 2) + ',' + y }, 'host');
    expect(g.story.entries.some((e) => /^Combat: Fight at/.test(e.text))).toBe(true); expect(g.combat!.log.join(' ')).toMatch(/evokes FIRE · CONDENSE/);
  });
  it('learning from the squad and designing Outbursts within the limits', () => {
    let g: GameState = newGame('ROOM', { id: 'host', name: 'Leon' }, 'learn');
    g = apply(g, { type: 'char/add', sheet: sheet('sigilist', 'A', { kit: 'sigil', sigils: ['fire', 'push'] }) }, 'host');
    g = apply(g, { type: 'char/add', sheet: sheet('stormcaller', 'B', { kit: 'soul', sigils: ['spark', 'condense'] }) }, 'host');
    const [a, b] = Object.keys(g.characters);
    expect(() => apply(g, { type: 'magic/learn', charId: a, word: 'freeze', from: 'ally' }, 'host')).toThrow(/Nobody in the squad/);
    g = apply(g, { type: 'magic/learn', charId: a, word: 'condense', from: 'ally' }, 'host');
    expect(g.characters[a].sigils).toContain('condense');
    expect(() => apply(g, { type: 'magic/design', charId: b, design: { id: '', name: 'Hush', school: 'status', modules: [] } }, 'host')).toThrow(/haven't learned/);
    expect(() => apply(g, { type: 'magic/design', charId: b, design: { id: '', name: 'Big', school: 'damage', modules: ['move', 'rain'] } }, 'host')).toThrow(/module|know/);
    g = apply(g, { type: 'magic/design', charId: b, design: { id: '', name: 'Spark of Grief', school: 'damage', modules: ['move'] } }, 'host');
    expect(g.characters[b].outbursts!.map((d) => d.name)).toContain('Spark of Grief');
  });
});

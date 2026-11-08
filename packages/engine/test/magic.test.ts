// Magic (spec: Mana): Sigil glyphs and Lines (rules 1.4; the full word set is in sigil14.test.ts), Evoke, Flux, Outbursts held and released, Strain, the meter.
import { describe, expect, it } from 'vitest';
import {
  ARCHETYPES, MAPS, newCharacter, validateSheet, startCombat, apply, newGame, positionsOf, zoneMap, npcsOf, refOf, keyOf,
  drawGlyph, evoke, findPattern, previewEvoke, scuff, vent, beginOutburst, releaseOutburst, addStrain, syphon, crystallise, magicTurnStart, moveUnit,
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

describe('starting magic (spec: The Magic panel, rules 1.4)', () => {
  it('a Sigil student starts with SPARK + SEEK (a spell with a Reach word) and a loaded Evoker; a Soul initiate with one Outburst', () => {
    const s = newCharacter('a', 'p', sheet('sigilist', 'S', { kit: 'sigil' }));
    expect(s.sigils).toEqual(['spark', 'seek']); expect(s.outbursts!.length).toBe(0);
    const w = newCharacter('b', 'p', sheet('stormcaller', 'W', { kit: 'soul' }));
    expect(w.outbursts!.map((d) => d.school)).toEqual(['damage']); expect(w.soulKnown!.schools).toEqual(['damage']);
  });
  it('picked words must make a spell with a Reach word; an Outburst fits the module slots', () => {
    expect(validateSheet(sheet('sigilist', 'S', { kit: 'sigil', sigils: ['fire', 'freeze'] }))).toMatch(/must make a spell/);
    expect(validateSheet(sheet('sigilist', 'S', { kit: 'sigil', sigils: ['fire', 'push'] }))).toMatch(/Reach word/);
    expect(validateSheet(sheet('sigilist', 'S', { kit: 'sigil', sigils: ['fire', 'arc'] }))).toBeNull();
    expect(validateSheet(sheet('sigilist', 'S', { kit: 'sigil', sigils: ['seek', 'arc'] }))).toMatch(/Subject|Reach/);
    expect(validateSheet(sheet('stormcaller', 'W', { kit: 'soul', outburst: { school: 'damage', modules: ['move', 'homing', 'swift', 'burst'] } }))).toMatch(/slot/);
  });
});

describe('Sigils on the map (spec: Sigils, rules 1.4)', () => {
  it('SPARK · SEEK: draw, step, draw on your own tiles; Evoke from the end fires back the way you came; charge on drawing and firing', () => {
    const { cb, u, e, rng } = fight(sheet('sigilist', 'S', { kit: 'sigil' }), '0,5');
    u.pos = '3,5'; expect(drawGlyph(cb, rng, u, 'spark', '3,5')).toBeNull();
    expect(drawGlyph(cb, rng, u, 'seek', '3,5')).toMatch(/One glyph per tile/);
    u.pos = '4,5'; expect(drawGlyph(cb, rng, u, 'seek')).toBeNull();
    expect(u.mg!.charge).toBe(10 - 1 - 2); expect(u.mg!.flux).toBe(2);
    const p = findPattern(cb, '3,5', u.pos); expect(typeof p === 'object' && p.shape).toBe('line');
    const pv = previewEvoke(cb, u, '3,5', e.pos); expect(pv.ok).toBe(true); expect(pv.facing!.mode).toBe('along'); expect(pv.facing!.dir).toEqual([-1, 0]);
    const hp = e.hp; expect(evoke(cb, rng, u, '3,5', e.pos)).toBeNull();
    expect(u.mg!.charge).toBe(7 - 2); expect(cb.glyphs!.length).toBe(0); expect(cb.log.at(-1)).toMatch(/evokes SPARK · SEEK/);
    expect(e.hp < hp || /misses/.test(cb.log.at(-1)!)).toBe(true);
  });
  it('drawing is refused off your own tile; a bend is no shape and can\'t be Evoked', () => {
    const { cb, u, rng } = fight(sheet('sigilist', 'S', { kit: 'sigil', sigils: ['fire', 'seek'] }), '9,5');
    u.mg!.words.push('condense'); u.mg!.maxWords = 4;
    expect(drawGlyph(cb, rng, u, 'fire', '9,9')).toMatch(/own tile/);
    u.pos = '3,5'; drawGlyph(cb, rng, u, 'fire'); u.pos = '4,5'; drawGlyph(cb, rng, u, 'condense'); u.pos = '4,6'; drawGlyph(cb, rng, u, 'seek');
    expect(findPattern(cb, '3,5')).toMatch(/No shape/);
    expect(previewEvoke(cb, u, '3,5', '9,5').ok).toBe(false);
  });
  it('Flux past 6 overloads the Evoker; Vent dumps Flux into the air; scuff wipes your tile', () => {
    const { cb, u, rng } = fight(sheet('sigilist', 'S', { kit: 'sigil' }), '9,9');
    u.mg!.flux = 6; u.mg!.charge = 10; u.hp = u.maxHp = 200; const m0 = manaOf(cb), hp = u.hp;
    drawGlyph(cb, rng, u, 'spark', u.pos);
    expect(u.hp).toBeLessThan(hp); expect(u.mg!.flux).toBe(0); expect(manaOf(cb)).toBe(m0 + 7); u.pos = '3,5'; expect(drawGlyph(cb, rng, u, 'spark')).toMatch(/locked/);
    u.mg!.lockRound = -1; u.mg!.flux = 3; expect(vent(cb, u)).toBeNull(); expect(manaOf(cb)).toBe(m0 + 10);
    expect(scuff(cb, u)).toMatch(/No glyphs/); u.pos = '2,5'; expect(scuff(cb, u)).toBeNull(); expect(cb.glyphs!.length).toBe(0);
  });
});

describe('Outbursts (spec: Soul magic)', () => {
  it('rules 1.5: Begin holds at stage 0; the swell adds a stage at the turn start (Strain −1 then +1); released at stage 1', () => {
    const { cb, u, e, rng } = fight(sheet('stormcaller', 'W', { kit: 'soul' }));
    const d = u.mg!.designs[0], cost = designCost(u.mg!, d, manaOf(cb)), mp = u.mg!.mp;
    expect(beginOutburst(cb, rng, u, d.id, undefined, true)).toBeNull();
    expect(u.mg!.mp).toBe(mp - cost); expect(u.mg!.held!.stage).toBe(0); expect(u.mg!.strain).toBe(1);
    magicTurnStart(cb, rng, u); expect(u.mg!.held!.stage).toBe(1); expect(u.mg!.strain).toBe(1);
    u.ap = 9; expect(releaseOutburst(cb, rng, u, e.pos)).toBeNull();
    expect(u.mg!.held).toBeNull(); expect(cb.log.at(-1)).toMatch(/releases .* at stage 1/);
  });
  it('rules 1.5: 3 over the limit is an automatic Mana Short (no roll): Stunned, the held one goes wild; never dead', () => {
    const { cb, u, rng } = fight(sheet('stormcaller', 'W', { kit: 'soul' }));
    u.mg!.strain = u.mg!.strainLimit + 2; u.mg!.held = { design: u.mg!.designs[0].id, stage: 1, cost: 20 };
    addStrain(cb, rng, u, 1, 'test');
    expect(cb.log.join(' ')).toMatch(/MANA SHORT/); expect(u.mg!.held).toBeNull(); expect(u.conds?.stunned).toBeGreaterThan(0);
    expect(u.mg!.strain).toBe(u.mg!.strainLimit); expect(u.dead).toBe(false);
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
    g = apply(g, { type: 'char/add', sheet: sheet('sigilist', 'Ilse', { kit: 'sigil', sigils: ['fire', 'seek'] }) }, 'host');
    g = apply(g, { type: 'session/start' }, 'host');
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'Open.' } as any }, 'host');
    return { g, id: Object.keys(g.characters)[0] };
  };
  it('glyphs drawn on the area map stay there between actions and run down with the rounds', () => {
    let { g, id } = open(); const at = positionsOf(g)[id];
    g = apply(g, { type: 'world/act', charId: id, act: 'draw', word: 'fire', tile: at }, 'host');
    expect(g.story.glyphs!.map((gl) => gl.word)).toEqual(['fire']); expect(g.characters[id].evoCharge).toBe(8);
    const [x, y] = at.split(',').map(Number), next = (x + 1) + ',' + y;
    g = apply(g, { type: 'world/act', charId: id, act: 'move', to: next, how: 'move' }, 'host');
    g = apply(g, { type: 'world/act', charId: id, act: 'draw', word: 'seek', tile: next }, 'host');
    expect(new Set(g.story.glyphs!.map((gl) => gl.id)).size).toBe(2); // ids stay unique between actions
    const left = g.story.glyphs![0].left;
    g = apply(g, { type: 'world/act', charId: id, act: 'end' }, 'host');
    expect(g.story.glyphs![0].left).toBe(left - 1);
  });
  it('a spell at a person on the map starts the fight', () => {
    let { g, id } = open(); const at = positionsOf(g)[id], [x, y] = at.split(',').map(Number);
    // FIRE at x+1, SEEK at x: standing on SEEK (the last drawn) it fires along, past FIRE, toward the drone.
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'A drone.', npcs: [{ action: 'place', name: 'Scavenger drone', side: 'hostile', tier: 'minion', weapon: 'service_pistol', at: refOf((x + 4) + ',' + y) }] } as any }, 'host');
    g = apply(g, { type: 'world/act', charId: id, act: 'move', to: (x + 1) + ',' + y, how: 'move' }, 'host');
    g = apply(g, { type: 'world/act', charId: id, act: 'draw', word: 'fire', tile: (x + 1) + ',' + y }, 'host');
    g = apply(g, { type: 'world/act', charId: id, act: 'move', to: at, how: 'move' }, 'host');
    g = apply(g, { type: 'world/act', charId: id, act: 'draw', word: 'seek', tile: at }, 'host');
    g = apply(g, { type: 'world/act', charId: id, act: 'evoke', tile: at, aim: (x + 4) + ',' + y }, 'host');
    expect(g.story.entries.some((e) => /^Combat: Fight at/.test(e.text))).toBe(true); expect(g.combat!.log.join(' ')).toMatch(/evokes FIRE · SEEK|evokes SEEK · FIRE/);
  });
  it('learning from the squad and designing Outbursts within the limits', () => {
    let g: GameState = newGame('ROOM', { id: 'host', name: 'Leon' }, 'learn');
    g = apply(g, { type: 'char/add', sheet: sheet('sigilist', 'A', { kit: 'sigil', sigils: ['fire', 'arc'] }) }, 'host');
    g = apply(g, { type: 'char/add', sheet: sheet('stormcaller', 'B', { kit: 'soul', sigils: ['spark', 'seek'] }) }, 'host');
    const [a, b] = Object.keys(g.characters);
    expect(() => apply(g, { type: 'magic/learn', charId: a, word: 'freeze', from: 'ally' }, 'host')).toThrow(/Nobody in the squad/);
    g = apply(g, { type: 'magic/learn', charId: a, word: 'spark', from: 'ally' }, 'host');
    expect(g.characters[a].sigils).toContain('spark');
    expect(() => apply(g, { type: 'magic/design', charId: b, design: { id: '', name: 'Hush', school: 'status', modules: [] } }, 'host')).toThrow(/haven't learned/);
    expect(() => apply(g, { type: 'magic/design', charId: b, design: { id: '', name: 'Big', school: 'damage', modules: ['move', 'rain'] } }, 'host')).toThrow(/module|know/);
    g = apply(g, { type: 'magic/design', charId: b, design: { id: '', name: 'Spark of Grief', school: 'damage', modules: ['move'] } }, 'host');
    expect(g.characters[b].outbursts!.map((d) => d.name)).toContain('Spark of Grief');
  });
});

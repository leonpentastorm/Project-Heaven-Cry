// Sigil rules 1.4 and the perks and traits that read them (src/perks/d.ts; spec: Perks, traits and class moves in play,
// "Sigil, Soul, prayer and music"; docs/design/sigil-1.4-impact.md, Perks and Traits). Every item is shown through the
// reducer (apply: combat/draw, combat/evoke, combat/perk, world/act), on the 1.4 rules: glyphs on your own tile, one a
// tile, a Line of 2-4 read in drawing order, the facing rule.
import { describe, expect, it } from 'vitest';
import { d20, previewDraw, previewPerkAction, positionsOf, npcsOf, zoneMap, standable, storyObjects, refOf, type Combat, type Unit, type GameState } from '../src';
import { fightWith, storyWith, withGame } from './helpers/perkfight';


/** A seed whose next d20 rolls are all 2-19 (no criticals, no natural 1s). */
function calm(n = 12): number { for (let s = 1; s < 500000; s++) { const r = { state: s }; let ok = true; for (let i = 0; i < n && ok; i++) { const v = d20(r); ok = v > 1 && v < 20; } if (ok) return s; } throw new Error('no seed'); }
const logHas = (cb: Combat, re: RegExp) => cb.log.some((l) => re.test(l));
const open = (cb: Combat) => { cb.map = { ...cb.map, cover: [], full: [], solid: [], difficult: [] } as any; cb.objects = []; };
const r1 = (n: number) => Math.round(n * 10) / 10;

/** A Sigil caster at C6 (2,5) on its turn: 9 AP, a deep core, Glyph AP 1, knowing the words given; foes at the tiles
 * given (Defense 1, 500 HP, no armour). Other PCs (allies) stand where `allies` puts them. */
function caster(perks: Record<string, string>, words: string[], foes: string[] = ['12,12'], o: { traits?: string[]; allies?: string[]; soul?: boolean; maxWords?: number } = {}) {
  const specs = [{ archetype: o.soul ? 'stormcaller' : 'sigilist', kit: o.soul ? 'soul' : 'sigil', perks, traits: o.traits || [] }, ...(o.allies || []).map(() => ({}))];
  const f = fightWith(specs as any, foes.map(() => ({})) as any);
  open(f.cb);
  const pcs = f.pcs; pcs[0].pos = '2,5'; (o.allies || []).forEach((at, i) => { pcs[i + 1].pos = at; });
  f.foes.forEach((e, i) => { e.pos = foes[i]; e.def = 1; e.hp = e.maxHp = 500; e.armour = 0; });
  const u = f.turn(f.pc); u.ap = 9; const m = u.mg!;
  m.evoker = true; m.words = [...words]; m.charge = 30; m.glyphAp = 1; m.maxWords = o.maxWords ?? 4; m.flux = 0; m.rangeBonus = 0;
  return f;
}
/** Walk to a tile (free, for the test) and draw a word there through the reducer. */
const draw = (f: any, word: string, tile: string) => { f.pc.pos = tile; return f.act({ type: 'combat/draw', unitId: f.pc.id, word, tile }); };
/** Walk a Line: each word on its tile in order; the caster ends on the last tile (the Line fires back the way it came). */
const line = (f: any, words: string[], tiles: string[]) => words.forEach((w, i) => draw(f, w, tiles[i]));
const mine = (cb: Combat, u: Unit) => (cb.glyphs || []).filter((g) => g.by.split('#')[0] === u.id);

// ---------------------------------------------------------------------------------------------------------------------
// (rules 1.56, Balance 2.0: removed with the old effect; docs/design/move-pool.md) describe('Hold the Stroke under 1.4

// ---------------------------------------------------------------------------------------------------------------------
// (rules 1.56, Balance 2.0: removed with the old effect; docs/design/move-pool.md) describe('Parallel Thought under 1.4

// ---------------------------------------------------------------------------------------------------------------------
describe('Clean Draw under 1.4 (a Sigil of any length = at most 4 glyphs)', () => {
  it('armed: a 4-glyph Line costs no charge and no Flux (TWICE\'s 2 too), and its Evoke no charge; then it is spent', () => {
    const f = caster({ clean_draw: 'mastered' }, ['spark', 'twice', 'seek', 'spread'], ['8,5', '8,7']);
    const ch = f.pc.mg!.charge;
    f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'clean_draw', actionId: 'arm' } as any);
    line(f, ['spark', 'twice', 'spread', 'seek'], ['5,5', '4,5', '3,5', '2,5']);
    expect(f.pc.mg!.charge).toBe(ch); expect(f.pc.mg!.flux).toBe(0);
    f.g.rng.state = calm(); f.act({ type: 'combat/evoke', unitId: f.pc.id, tile: '2,5', aim: '8,5', aims: ['8,7'] } as any);
    expect(f.pc.mg!.charge).toBe(ch); expect(logHas(f.cb, /Clean Draw is spent/)).toBe(true);
    draw(f, 'spark', '2,2'); expect(f.pc.mg!.charge).toBeLessThan(ch); expect(f.pc.mg!.flux).toBeGreaterThan(0);
    expect(() => f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'clean_draw', actionId: 'arm' } as any)).toThrow(/Used/);
  });
  it('a refused draw records nothing (the arm survives it); a Line with one glyph from before the arm pays its charge', () => {
    const f = caster({ clean_draw: 'mastered' }, ['spark', 'seek', 'arc'], ['8,5']);
    draw(f, 'spark', '4,5'); // before arming: not clean
    f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'clean_draw', actionId: 'arm' } as any);
    draw(f, 'seek', '3,5');
    f.pc.pos = '2,5'; expect(() => f.act({ type: 'combat/draw', unitId: f.pc.id, word: 'arc', tile: '2,5' })).toThrow(/Reach/); // a second Reach word
    const ch = f.pc.mg!.charge; f.pc.pos = '3,5'; f.g.rng.state = calm();
    f.act({ type: 'combat/evoke', unitId: f.pc.id, tile: '3,5', aim: '8,5' });
    expect(f.pc.mg!.charge).toBeLessThan(ch); // SPARK wasn't clean: the Evoke pays
    expect(logHas(f.cb, /Clean Draw is spent/)).toBe(true); // ...and it used the clean SEEK: spent
  });
  it('the clean glyphs scuffed before the Evoke: the use is spent', () => {
    const f = caster({ clean_draw: 'mastered' }, ['spark', 'seek'], ['8,5']);
    f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'clean_draw', actionId: 'arm' } as any);
    draw(f, 'spark', '4,5'); f.act({ type: 'combat/scuff', unitId: f.pc.id } as any);
    const ch = f.pc.mg!.charge; draw(f, 'spark', '6,6');
    expect(logHas(f.cb, /clean glyphs are gone/)).toBe(true); expect(f.pc.mg!.charge).toBeLessThan(ch);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('Twin Discipline under 1.4 (the Sigil\'s words set where it reaches and what it covers; same model as Fusion)', () => {
  /** A Soul initiate with an Evoker and a held Damage Outburst; foes at 8,5 and 8,6, an ally at 9,5. */
  const fused = (words: string[], o: { allies?: string[] } = {}) => {
    const f = caster({ twin_discipline: 'ultimate' }, words, ['8,5', '8,6'], { soul: true, allies: o.allies ?? ['9,5'] });
    f.pc.mg!.mp = 500; f.pc.mg!.emanator = true; for (const a of f.pcs.slice(1)) a.def = 1;
    f.act({ type: 'combat/outburst', unitId: f.pc.id, design: f.pc.mg!.designs[0].id, hold: true });
    f.pc.ap = 9; return f;
  };
  it('a SEEK · SPREAD Line carries the held Outburst to everyone its Burst covers (allies too), at ×0.6; its SPARK doesn\'t fire', () => {
    const f = fused(['spark', 'seek', 'spread']);
    line(f, ['spark', 'spread', 'seek'], ['4,5', '3,5', '2,5']);
    const pv = withGame(f.g, () => previewPerkAction({ u: f.pc, cb: f.cb, c: f.g.characters[f.pc.charId!], g: f.g }, 'twin_discipline', { actionId: 'fused', tile: '2,5', choice: '8,5' }));
    expect(pv.ok).toBe(true); expect(pv.lines.join(' ')).toMatch(/3 creature\(s\)/); expect(pv.lines.join(' ')).toMatch(/×0\.6/);
    const hp = f.foes.map((e) => e.hp), ally = f.pcs[1].hp, ch = f.pc.mg!.charge; f.g.rng.state = calm(20);
    f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'twin_discipline', actionId: 'fused', tile: '2,5', choice: '8,5' } as any);
    expect(logHas(f.cb, /fuses .* into SPARK · SPREAD · SEEK \(Twin Discipline/)).toBe(true);
    expect(logHas(f.cb, /SPARK (hits|misses)/)).toBe(false);
    expect(f.foes.every((e, i) => e.hp < hp[i])).toBe(true); expect(f.pcs[1].hp).toBeLessThan(ally); // friendly fire
    expect(f.pc.mg!.held).toBeNull(); expect(f.cb.glyphs!.length).toBe(0); expect(f.pc.mg!.charge).toBeLessThan(ch);
    expect((f.cb.fx || []).some((e: any) => e.k === 'evoke' && e.fused)).toBe(true);
  });
  it('KIN keeps your side out; the multiplier never grows an Outburst (CONDENSE\'s ×1.5 core is ×1)', () => {
    const f = fused(['spark', 'seek', 'spread', 'condense', 'kin']);
    line(f, ['spark', 'kin', 'spread', 'seek'], ['5,5', '4,5', '3,5', '2,5']);
    const ally = f.pcs[1].hp; f.g.rng.state = calm(20);
    f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'twin_discipline', actionId: 'fused', tile: '2,5', choice: '8,5' } as any);
    expect(f.pcs[1].hp).toBe(ally);
    const g = fused(['spark', 'seek', 'spread', 'condense'], { allies: ['1,9'] });
    line(g, ['spark', 'condense', 'spread', 'seek'], ['5,5', '4,5', '3,5', '2,5']);
    const pv = withGame(g.g, () => previewPerkAction({ u: g.pc, cb: g.cb, c: g.g.characters[g.pc.charId!], g: g.g }, 'twin_discipline', { actionId: 'fused', tile: '2,5', choice: '8,5' }));
    expect(pv.lines.join(' ')).toMatch(/Foe 1(?! ×)/); // the core: ×1, not ×1.5
  });
  it('a placed spell (STAY, WAIT, WATCH) can\'t carry an Outburst; without a held Outburst it isn\'t offered', () => {
    const f = fused(['fire', 'stay', 'seek']);
    line(f, ['fire', 'stay', 'seek'], ['4,5', '3,5', '2,5']);
    expect(() => f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'twin_discipline', actionId: 'fused', tile: '2,5', choice: '8,5' } as any)).toThrow(/placed spell/);
    const g = caster({ twin_discipline: 'ultimate' }, ['spark', 'seek'], ['8,5'], { soul: true }); g.pc.mg!.emanator = true;
    line(g, ['spark', 'seek'], ['3,5', '2,5']);
    expect(() => g.act({ type: 'combat/perk', unitId: g.pc.id, id: 'twin_discipline', actionId: 'fused', tile: '2,5', choice: '8,5' } as any)).toThrow(/hold an Outburst/);
  });
});

// Twin Discipline on the area map (spec item 391): the fused cast that finds an NPC token opens the fight with the cast.
const freeAt = (g: GameState, near: string, d: number): string => {
  const [x, y] = near.split(',').map(Number), map = zoneMap(g), taken = new Set([...Object.values(positionsOf(g)), ...npcsOf(g).map((n) => n.pos), ...storyObjects(g).map((o) => o.pos)]);
  for (let i = -d; i <= d; i++) for (let j = -d; j <= d; j++) { if (Math.max(Math.abs(i), Math.abs(j)) !== d) continue; const k = (x + i) + ',' + (y + j); if (standable(map, k) && !taken.has(k)) return k; }
  throw new Error('no free tile');
};
describe('Twin Discipline on the area map under 1.4', () => {
  it('a fused Line whose SEEK finds a token opens the fight with the cast; the hold is spent and the glyphs fade', () => {
    const s = storyWith([{ perks: { twin_discipline: 'ultimate' }, archetype: 'stormcaller', kit: 'soul', attrs: { endurance: 10 } }]); const c = s.chars[0]; // rules 1.95: a bar that lives through the opened fight's first rounds (the fight would be lost before the test reads it)
    const ch = s.g.characters[c.id]; ch.mp = 500;
    ch.weapon = 'evoker_blade'; ch.loaded = 0; // a focus counts only in a hand (item 630): the blade (an Evoker) beside the Emanator
    ch.sigils = ['spark', 'seek']; ch.evoCharge = 10;
    const full = () => { s.g.story.ap = { ...(s.g.story.ap || {}), [c.id]: 9 }; };
    // A straight row of three free tiles from the character: the Line on the first two, the token on the far side.
    const here = positionsOf(s.g)[c.id], [hx, hy] = here.split(',').map(Number), map = zoneMap(s.g);
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const d = dirs.find(([dx, dy]) => [1, 2, 3, 4].every((k) => standable(map, (hx + dx * k) + ',' + (hy + dy * k)) && !npcsOf(s.g).some((n) => n.pos === (hx + dx * k) + ',' + (hy + dy * k))))!;
    const at = (k: number) => (hx + d[0] * k) + ',' + (hy + d[1] * k);
    full(); s.act({ type: 'world/act', charId: c.id, act: 'outburst', design: ch.outbursts![0].id, hold: true } as any);
    // Walk the Line away from the token and back: SPARK at 1 step out, then SEEK at home: it fires out past SPARK.
    s.g.story.positions![c.id] = at(1); full(); s.act({ type: 'world/act', charId: c.id, act: 'draw', word: 'spark', tile: at(1) } as any);
    s.g.story.positions![c.id] = here; full(); s.act({ type: 'world/act', charId: c.id, act: 'draw', word: 'seek', tile: here } as any);
    // Both tokens in one Narrator turn (each Narrator turn is an overworld round: glyphs last 2).
    const far = freeAt(s.g, here, 7);
    s.act({ type: 'narrator/turn', turn: { narration: 'Someone.', npcs: [
      { action: 'place', name: 'Scavenger', side: 'hostile', tier: 'minion', weapon: 'service_pistol', at: refOf(at(4)) },
      { action: 'place', name: 'Watcher', side: 'hostile', tier: 'minion', weapon: 'fists', at: refOf(far) }] } } as any);
    full(); s.g.rng.state = calm(20);
    s.act({ type: 'world/act', charId: c.id, act: 'perk', id: 'twin_discipline', actionId: 'fused', tile: here, choice: at(4) } as any);
    expect(s.g.phase).toBe('combat');
    const cb = s.g.combat!; expect(logHas(cb, /fuses .* \(Twin Discipline/)).toBe(true);
    const u = cb.units.find((x) => x.charId === c.id)!; expect(u.mg!.held).toBeNull();
    expect((cb.glyphs || []).length).toBe(0);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('Sigil Savant under 1.4 ("one Sigil" = one word)', () => {
  it('the Muscle Memory word draws for 0 charge and 1 AP less in a Line; Rigid refuses an unpractised word before anything is spent', () => {
    const f = caster({}, ['spark', 'seek', 'fire'], ['8,5'], { traits: ['sigil_savant'] }); f.pc.mg!.glyphAp = 1.5;
    const c = f.g.characters[f.pc.charId!]; c.state = { ...(c.state || {}), sigil_savant: { word: 'spark', practised: ['seek'] } };
    const ch = f.pc.mg!.charge, ap = f.pc.ap; draw(f, 'spark', '4,5');
    expect(f.pc.mg!.charge).toBe(ch); expect(r1(ap - f.pc.ap)).toBe(0.5);
    const ch2 = f.pc.mg!.charge, ap2 = f.pc.ap; draw(f, 'seek', '3,5');
    expect(f.pc.mg!.charge).toBeLessThan(ch2); expect(r1(ap2 - f.pc.ap)).toBe(1.5);
    const ap3 = f.pc.ap, ch3 = f.pc.mg!.charge; f.pc.pos = '2,2';
    expect(() => f.act({ type: 'combat/draw', unitId: f.pc.id, word: 'fire', tile: '2,2' })).toThrow(/practised/);
    expect(f.pc.ap).toBe(ap3); expect(f.pc.mg!.charge).toBe(ch3);
    const hp = f.foe.hp; f.pc.pos = '3,5'; f.g.rng.state = calm();
    f.act({ type: 'combat/evoke', unitId: f.pc.id, tile: '3,5', aim: '8,5' }); expect(f.foe.hp).toBeLessThan(hp);
  });
});

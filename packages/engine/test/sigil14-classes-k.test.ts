// Lane classes-k under Sigil rules 1.4 (decision 98; docs/design/sigil-1.4-impact.md): the Stroke Gambler, Circuit
// Mage, Glyph Mason and Grand Sigilist moves that touch Sigils, each shown working through the reducer (apply):
// Half-Sigil on your own tile and its two-glyph Stack (the first holder of the two-glyph hook), Stitch on a Stack or a
// Line of half-glyphs and its backlash as Touch on the victim, Fusion delivering an Outburst by the 1.4 area (Reach,
// Burst, KIN), the Keystone cut on your own tile and joining a Line, Survey's 2-tile reach with the facing rule read from
// where you stand, Foundation's 0-AP draws through the ordinary Draw, and the Grand forms of the 17 words new in 1.4.
import { describe, expect, it } from 'vitest';
import { SIGIL, d20, condOn, endTurn, glyphCost, previewEvoke, previewAttack, resolveAttack, applyDamage, moveUnit, objectsOf, emit, type Unit, type Combat, type Character } from '../src';
import { fightWith, withGame, type CharSpec } from './helpers/perkfight';
import { useRevision2Classes, SIG } from './helpers/legacy';
useRevision2Classes(); // Revision 2 classes and advanced classes for this file's handler tests (Class Roster Rev 3)

type F = ReturnType<typeof fightWith>;
function rngFor(...ns: number[]): number { for (let s = 1; s < 2000000; s++) { const r = { state: s }; if (ns.every((n) => d20(r) === n)) return s; } throw new Error('no seed'); }
const seed = (f: { g: any }, ...ns: number[]) => { f.g.rng.state = rngFor(...ns); };
const logHas = (cb: Combat, re: RegExp) => cb.log.some((l) => re.test(l));
const at = (f: F, u: Unit, pos: string) => { f.unit(u.id).pos = pos; return f.unit(u.id); };
const act = (f: F, u: Unit, a: any) => f.act({ unitId: u.id, ...a });
const perk = (f: F, u: Unit, id: string, a: any = {}) => f.act({ type: 'combat/perk', unitId: u.id, id, ...a } as any);
const tough = (u: Unit, def = -40) => { u.hp = u.maxHp = 999; u.def = def; u.armour = 0; u.injResist = 0; (u as any).sv = { body: -99, brain: -99, heart: -99 }; return u; };
const adv = (id: string, extra: CharSpec = {}): CharSpec => ({ advancedClass: id, level: 5, ...extra });
const MIND = { archetype: 'sigilist', kit: 'sigil' } as const;
const charOf = (f: { g: any }, u: Unit): Character => f.g.characters[u.charId!];
/** Give a unit an Evoker (with words) and an Emanator with one damage design. */
function caster(u: Unit, words: string[], extra: any = {}) {
  u.mg = { words, designs: [{ id: 'o1', name: 'Damage Outburst', school: 'damage', modules: ['move'] }], evoker: true, emanator: true, charge: 10, cores: 2, coresMade: 0, flux: 0, mp: 300, mpMax: 300, strain: 0, held: null, cast: false,
    brain: 3, will: 3, sigilMult: 1, soulMult: 1, elemMult: 1, healMult: 1, maxWords: 3, glyphAp: 1, coreSave: 0, rangeBonus: 0, durBonus: 0, soulAp: 2, costSave: 0, soulRange: 0, syphon: 1, strainLimit: 5,
    saves: { body: 0, brain: 0, heart: 0 }, debuff: { body: 0, brain: 0, heart: 0 }, ...extra } as any;
  return u;
}
/** A 1.4 glyph laid straight on the ground (drawing order = the order of these calls). */
const glyph = (f: F, u: Unit, word: string, pos: string, extra: any = {}) => { const cb = f.cb; cb.glyphs = [...(cb.glyphs || []), { id: 'gl' + (cb.glyphSeq = (cb.glyphSeq || 0) + 1), word, pos, by: u.id, side: u.side, left: 3, who: u.name, v: 14, ...extra } as any]; };
const glyphsAt = (f: F, k: string) => (f.cb.glyphs || []).filter((g) => g.pos === k);
const ks = (f: F) => (f.cb.glyphs || []).find((g) => g.id === 'ks-' + f.pc.id);

// ============================================================ Stroke Gambler
describe('Stroke Gambler under 1.4', () => {
  it('Half-Sigil: your own tile only (1 AP, 1 charge, +1 Flux); a second half-glyph stacks there and completes the grammar', () => {
    const f = fightWith([adv('stroke_gambler', MIND)], [{}]);
    const u = f.turn(f.pc); at(f, u, '3,2'); caster(f.unit(u.id), ['fire', 'seek'], { flux: 0 }); const ap = f.unit(u.id).ap, ch = f.unit(u.id).mg!.charge;
    expect(() => perk(f, f.unit(u.id), 'stroke_gambler.half_sigil', { tile: '4,2' })).toThrow(/own tile/);
    perk(f, f.unit(u.id), 'stroke_gambler.half_sigil', { tile: '3,2' });
    perk(f, f.pc, 'stroke_gambler.half_sigil', {}); // no tile: your own
    const gl = glyphsAt(f, '3,2');
    expect(gl.length).toBe(2); expect(gl.every((g: any) => g.half && g.v === 14)).toBe(true);
    expect(new Set(gl.map((g) => g.word))).toEqual(new Set(['fire', 'seek']));
    expect(f.pc.ap).toBe(ap - 2); expect(f.pc.mg!.charge).toBe(ch - 2); expect(f.pc.mg!.flux).toBe(2);
    // a third has no room, and an ordinary glyph never goes on a half-glyph (the hook is for half-glyphs only)
    expect(() => perk(f, f.pc, 'stroke_gambler.half_sigil', {})).toThrow(/2 glyphs at most/);
    const g = fightWith([adv('stroke_gambler', MIND)], [{}]); const v = g.turn(g.pc); at(g, v, '3,2'); caster(g.unit(v.id), ['fire', 'seek']);
    perk(g, g.unit(v.id), 'stroke_gambler.half_sigil', {});
    expect(() => act(g, g.pc, { type: 'combat/draw', word: 'fire', tile: '3,2' })).toThrow(/One glyph per tile/);
  });
  it('Half-Sigil: the random word is never one the draw would refuse (a second Reach word)', () => {
    const f = fightWith([adv('stroke_gambler', MIND)], [{}]);
    const u = f.turn(f.pc); at(f, u, '4,2'); caster(f.unit(u.id), ['arc', 'fire']);
    glyph(f, f.unit(u.id), 'seek', '3,2', { half: true });
    perk(f, f.unit(u.id), 'stroke_gambler.half_sigil', {});
    expect(glyphsAt(f, '4,2').map((g) => g.word)).toEqual(['fire']);
    const g = fightWith([adv('stroke_gambler', MIND)], [{}]); const v = g.turn(g.pc); at(g, v, '4,2'); caster(g.unit(v.id), ['arc']);
    glyph(g, g.unit(v.id), 'seek', '3,2', { half: true });
    expect(() => perk(g, g.unit(v.id), 'stroke_gambler.half_sigil', {})).toThrow(/No word you know fits/);
  });
  it('Stitch on a Stack of half-glyphs: the plain Evoke refuses it; 6-15 holds, 16-20 doubles the damage', () => {
    const run = (n: number) => {
      const f = fightWith([adv('stroke_gambler', MIND)], [{}]);
      const u = f.turn(f.pc); at(f, u, '3,2'); const foe = tough(at(f, f.foe, '9,2')); caster(f.unit(u.id), ['fire', 'seek']);
      glyph(f, f.unit(u.id), 'fire', '3,2', { half: true }); glyph(f, f.unit(u.id), 'seek', '3,2', { half: true });
      expect(withGame(f.g, () => previewEvoke(f.cb, f.unit(u.id), '3,2', '9,2')).why).toMatch(/only fires through Stitch/);
      seed(f, n, 15);
      perk(f, f.unit(u.id), 'stroke_gambler.stitch', { tile: '3,2', targetId: foe.id });
      return { f, dmg: 999 - f.unit(foe.id).hp };
    };
    const mid = run(10), hi = run(18);
    expect(logHas(mid.f.cb, /STITCH d20 10/)).toBe(true); expect(mid.dmg).toBe(30);
    expect(hi.dmg).toBe(60); expect(mid.f.pc.mg!.charge).toBe(8); expect(glyphsAt(mid.f, '3,2').length).toBe(0);
  });
  it('Stitch on a walked Line of half-glyphs fires back the way you came (the facing rule)', () => {
    const f = fightWith([adv('stroke_gambler', MIND)], [{}]);
    const u = f.turn(f.pc); at(f, u, '6,2'); const foe = tough(at(f, f.foe, '2,2')); caster(f.unit(u.id), ['fire', 'seek']);
    glyph(f, f.unit(u.id), 'fire', '5,2', { half: true }); glyph(f, f.unit(u.id), 'seek', '6,2', { half: true });
    expect(() => perk(f, f.unit(u.id), 'stroke_gambler.stitch', { tile: '6,2', choice: '9,2' })).toThrow(/Out of the area/);
    seed(f, 10, 15);
    perk(f, f.unit(u.id), 'stroke_gambler.stitch', { tile: '6,2', targetId: foe.id });
    expect(999 - f.unit(foe.id).hp).toBe(30); expect(logHas(f.cb, /a Line of 2, along/)).toBe(true);
  });
  it('Stitch 1-5 (House Edge off): it lands on you as Touch at full strength; KIN spares no one, SPREAD catches your ally', () => {
    const f = fightWith([adv('stroke_gambler', MIND), {}], [{}]);
    const u = f.turn(f.pc); at(f, u, '3,2'); at(f, f.pcs[1], '3,3'); tough(at(f, f.foe, '9,2')); caster(f.unit(u.id), ['fire', 'spread', 'kin']);
    f.unit(u.id).hp = 200; f.unit(f.pcs[1].id).hp = 200; f.unit(u.id).armour = 0; f.unit(f.pcs[1].id).armour = 0;
    glyph(f, f.unit(u.id), 'fire', '5,2', { half: true }); glyph(f, f.unit(u.id), 'spread', '4,2', { half: true }); glyph(f, f.unit(u.id), 'kin', '3,2', { half: true });
    seed(f, 3);
    perk(f, f.unit(u.id), 'stroke_gambler.stitch', { tile: '3,2', choice: '6,2', mods: ['!class:stroke_gambler.house_edge#reroll'] });
    expect(f.pc.hp).toBe(200 - 18); expect(f.unit(f.pcs[1].id).hp).toBe(200 - 18); // 30 × 0.6, no roll, no KIN
    expect(f.unit(f.foe.id).hp).toBe(999); expect((f.cb.glyphs || []).length).toBe(0); expect(f.pc.mg!.charge).toBe(7);
  });
  it('House Edge: a Stitch of 1-5 is rerolled once a fight (on by default)', () => {
    const f = fightWith([adv('stroke_gambler', MIND)], [{}]);
    const u = f.turn(f.pc); at(f, u, '3,2'); tough(at(f, f.foe, '9,2')); caster(f.unit(u.id), ['fire', 'seek']);
    glyph(f, f.unit(u.id), 'fire', '3,2', { half: true }); glyph(f, f.unit(u.id), 'seek', '3,2', { half: true });
    seed(f, 2, 12, 15);
    perk(f, f.unit(u.id), 'stroke_gambler.stitch', { tile: '3,2', targetId: f.foe.id });
    expect(logHas(f.cb, /House Edge: Tester 1 rerolls the Stitch \(2 → 12\)/)).toBe(true);
    expect(f.unit(f.foe.id).hp).toBe(999 - 30);
  });
  it('Stitch: random words that make no spell fizzle (the strokes fade, no AP, no roll)', () => {
    const f = fightWith([adv('stroke_gambler', MIND)], [{}]);
    const u = f.turn(f.pc); at(f, u, '3,2'); caster(f.unit(u.id), ['seek', 'condense']); const ap = f.unit(u.id).ap;
    glyph(f, f.unit(u.id), 'seek', '3,2', { half: true }); glyph(f, f.unit(u.id), 'condense', '3,2', { half: true });
    perk(f, f.unit(u.id), 'stroke_gambler.stitch', { tile: '3,2' });
    expect(logHas(f.cb, /Stitch fizzles/)).toBe(true); expect((f.cb.glyphs || []).length).toBe(0); expect(f.pc.ap).toBe(ap);
  });
});

// ============================================================ Circuit Mage
describe('Circuit Mage under 1.4: Fusion', () => {
  const fuse = (words: string[], o: { stand?: string; aim?: string; ally?: string; foe2?: string } = {}) => {
    const f = fightWith([adv('circuit_mage'), {}], [{}, {}]); const u = f.turn(f.pc); caster(f.unit(u.id), words); f.unit(u.id).ap = 9;
    const [a, b] = f.foes; tough(at(f, a, o.aim || '9,2')); tough(at(f, b, o.foe2 || '9,8')); at(f, f.pcs[1], o.ally || '0,8'); tough(f.unit(f.pcs[1].id), 0);
    words.forEach((w, i) => glyph(f, f.unit(u.id), w, (2 + i) + ',2'));
    at(f, f.unit(u.id), o.stand || '1,2');
    return f;
  };
  it('a Line of SEEK · CONDENSE carries the Outburst along (×1.5): both costs, +1 Strain, +2 Flux, a fight note', () => {
    const f = fuse(['seek', 'condense']); const mp = f.pc.mg!.mp; seed(f, 15);
    perk(f, f.pc, 'circuit_mage.fusion', { tile: '2,2', choice: 'o1', targetId: f.foes[0].id });
    const hit = 999 - f.unit(f.foes[0].id).hp, m = f.pc.mg!;
    expect(m.mp).toBeLessThan(mp); expect(m.flux).toBe(2); expect(m.strain).toBeGreaterThanOrEqual(2);
    expect(m.charge).toBe(8); expect((f.cb.glyphs || []).length).toBe(0); expect(f.pc.ap).toBe(9 - 3);
    expect((f.cb.notes || []).some((n) => /FUSION seen/.test(n))).toBe(true);
    const g = fuse(['seek', 'kin']); seed(g, 15);
    perk(g, g.pc, 'circuit_mage.fusion', { tile: '2,2', choice: 'o1', targetId: g.foes[0].id });
    const plain = 999 - g.unit(g.foes[0].id).hp;
    expect(plain).toBeGreaterThan(0); expect(Math.abs(hit - plain * 1.5)).toBeLessThanOrEqual(1);
  });
  it('the facing rule sets where it may land: a SEEK Line fired along can\'t reach a target behind you', () => {
    const f = fuse(['seek', 'condense'], { aim: '0,1' });
    expect(() => perk(f, f.pc, 'circuit_mage.fusion', { tile: '2,2', choice: 'o1', targetId: f.foes[0].id })).toThrow(/Out of the area/);
  });
  it('SPREAD hits your ally too (friendly fire); KIN spares your side', () => {
    const run = (words: string[]) => { const f = fuse(words, { aim: '9,2', ally: '9,3', foe2: '10,2' }); seed(f, 15, 15, 15); perk(f, f.pc, 'circuit_mage.fusion', { tile: '2,2', choice: 'o1', targetId: f.foes[0].id }); return f; };
    const ff = run(['seek', 'spread']);
    expect(ff.unit(ff.foes[0].id).hp).toBeLessThan(999); expect(ff.unit(ff.foes[1].id).hp).toBeLessThan(999); expect(ff.unit(ff.pcs[1].id).hp).toBeLessThan(999);
    const k = run(['seek', 'spread', 'kin']);
    expect(k.unit(k.foes[0].id).hp).toBeLessThan(999); expect(k.unit(k.pcs[1].id).hp).toBe(999); expect(logHas(k.cb, /KIN spares Tester 2 from the Fusion/)).toBe(true);
  });
  it('refuses a Subject, a standing word (STAY), a fourth glyph and a middle glyph', () => {
    const s = fuse(['fire', 'seek']);
    expect(() => perk(s, s.pc, 'circuit_mage.fusion', { tile: '2,2', choice: 'o1', targetId: s.foes[0].id })).toThrow(/only Form and Motion/);
    const st = fuse(['seek', 'stay']);
    expect(() => perk(st, st.pc, 'circuit_mage.fusion', { tile: '2,2', choice: 'o1', targetId: st.foes[0].id })).toThrow(/No standing Outbursts/);
    const four = fuse(['seek', 'condense', 'condense', 'kin']); four.pc.mg!.maxWords = 4;
    expect(() => perk(four, four.pc, 'circuit_mage.fusion', { tile: '2,2', choice: 'o1', targetId: four.foes[0].id })).toThrow(/3 glyphs at most/);
    const mid = fuse(['seek', 'condense', 'kin'], { stand: '3,2' });
    expect(() => perk(mid, mid.pc, 'circuit_mage.fusion', { tile: '2,2', choice: 'o1', targetId: mid.foes[0].id })).toThrow(/middle glyph/);
  });
});

// ============================================================ Glyph Mason
describe('Glyph Mason under 1.4', () => {
  it('Keystone: cut on your own tile (2 AP + a core, +1 Flux); never fades, can\'t be scuffed, not counted on the ground', () => {
    const f = fightWith([adv('glyph_mason')], [{}]); const u = f.turn(f.pc); at(f, u, '3,2'); caster(f.unit(u.id), ['fire', 'seek', 'push'], { maxWords: 2 }); const ap = f.unit(u.id).ap;
    expect(() => perk(f, f.unit(u.id), 'glyph_mason.keystone', { tile: '4,2', choice: 'fire' })).toThrow(/own tile/);
    perk(f, f.unit(u.id), 'glyph_mason.keystone', { tile: '3,2', choice: 'fire' });
    expect(f.pc.ap).toBe(ap - 2); expect(f.pc.mg!.cores).toBe(1); expect(f.pc.mg!.flux).toBe(1); expect(ks(f)!.word).toBe('fire');
    expect(() => act(f, f.pc, { type: 'combat/draw', word: 'seek', tile: '3,2' })).toThrow(/One glyph per tile/);
    expect(() => act(f, f.pc, { type: 'combat/scuff' })).toThrow(/Keystone can't be scuffed/);
    // two ordinary glyphs fit beside it (Max Sigil words 2: the Keystone isn't counted); a third fades the oldest, not it
    at(f, f.pc, '6,2'); act(f, f.pc, { type: 'combat/draw', word: 'seek', tile: '6,2' });
    at(f, f.pc, '9,2'); act(f, f.pc, { type: 'combat/draw', word: 'push', tile: '9,2' });
    expect((f.cb.glyphs || []).length).toBe(3);
    f.pc.ap = 6; at(f, f.pc, '12,2'); act(f, f.pc, { type: 'combat/draw', word: 'seek', tile: '12,2' });
    expect(glyphsAt(f, '6,2').length).toBe(0); expect(ks(f)).toBeTruthy();
    for (let i = 0; i < 6; i++) withGame(f.g, () => endTurn(f.cb, f.g.rng));
    expect(ks(f)).toBeTruthy(); expect(ks(f)!.pos).toBe('3,2');
  });
  it('Keystone: a second Reach word in the Line it would join is refused before the core is spent', () => {
    const f = fightWith([adv('glyph_mason')], [{}]); const u = f.turn(f.pc); at(f, u, '4,2'); caster(f.unit(u.id), ['fire', 'seek', 'arc']);
    glyph(f, f.unit(u.id), 'seek', '3,2');
    expect(() => perk(f, f.unit(u.id), 'glyph_mason.keystone', { tile: '4,2', choice: 'arc' })).toThrow(/second Reach word/);
    expect(f.pc.mg!.cores).toBe(2);
  });
  it('Keystone joins a Line, survives the Evoke, and the Line costs 1 charge less (Survey)', () => {
    const f = fightWith([adv('glyph_mason')], [{}]); const u = f.turn(f.pc); at(f, u, '6,2'); const foe = tough(at(f, f.foe, '2,2')); caster(f.unit(u.id), ['fire', 'seek']); f.unit(u.id).ap = 9;
    perk(f, f.unit(u.id), 'glyph_mason.keystone', { choice: 'fire' });
    at(f, f.pc, '7,2'); act(f, f.pc, { type: 'combat/draw', word: 'seek', tile: '7,2' });
    const ch = f.pc.mg!.charge; seed(f, 15);
    act(f, f.pc, { type: 'combat/evoke', tile: '7,2', aim: foe.pos });
    expect(999 - f.unit(foe.id).hp).toBe(30); expect(f.pc.mg!.charge).toBe(ch - 1);
    expect(ks(f)).toBeTruthy(); expect(glyphsAt(f, '7,2').length).toBe(0);
  });
  it('Survey: from 2 tiles beyond an end the Line fires along; from 2 tiles beside it, across; without it, refused', () => {
    const setup = () => {
      const f = fightWith([adv('glyph_mason')], [{}]); const u = f.turn(f.pc); at(f, u, '12,4'); caster(f.unit(u.id), ['fire', 'seek']); f.unit(u.id).ap = 9;
      perk(f, f.unit(u.id), 'glyph_mason.keystone', { choice: 'fire' }); glyph(f, f.pc, 'seek', '13,4');
      return f;
    };
    const a = setup(); const foe = tough(at(a, a.foe, '15,4')); at(a, a.pc, '10,4'); seed(a, 15);
    perk(a, a.pc, 'glyph_mason.survey', { tile: '12,4', targetId: foe.id });
    expect(a.unit(foe.id).hp).toBe(999 - 30); expect(a.pc.pos).toBe('10,4'); expect(logHas(a.cb, /a Line of 2, along/)).toBe(true);
    const b = setup(); const foe2 = tough(at(b, b.foe, '13,9')); at(b, b.pc, '12,2'); seed(b, 15);
    const pv = withGame(b.g, () => previewEvoke(b.cb, b.pc, '12,4', '13,9'));
    expect(pv.ok).toBe(true); expect(pv.facing!.mode).toBe('across'); expect(pv.facing!.dir).toEqual([0, 1]);
    act(b, b.pc, { type: 'combat/evoke', tile: '12,4', aim: foe2.pos }); // the plain Evoke reaches it too (evoke_reach)
    expect(b.unit(foe2.id).hp).toBe(999 - 30);
    const c = fightWith([{}], [{}]); const v = c.turn(c.pc); caster(c.unit(v.id), ['fire', 'seek']); glyph(c, c.unit(v.id), 'fire', '12,4'); glyph(c, c.unit(v.id), 'seek', '13,4'); at(c, c.unit(v.id), '10,4');
    expect(withGame(c.g, () => previewEvoke(c.cb, c.pc, '12,4', '15,4')).why).toMatch(/within 1 tile/);
  });
  it('Foundation: once a scene, this turn\'s ordinary draws within 2 tiles of the Keystone cost 0 AP', () => {
    const f = fightWith([adv('glyph_mason')], [{}]); const u = f.turn(f.pc); at(f, u, '3,2'); caster(f.unit(u.id), ['fire', 'seek', 'push'], { maxWords: 4 });
    perk(f, f.unit(u.id), 'glyph_mason.keystone', { choice: 'fire' });
    perk(f, f.pc, 'glyph_mason.foundation'); const ap = f.pc.ap, ch = f.pc.mg!.charge;
    at(f, f.pc, '4,2'); act(f, f.pc, { type: 'combat/draw', word: 'seek', tile: '4,2' });
    expect(f.pc.ap).toBe(ap); expect(f.pc.mg!.charge).toBe(ch - 2);
    at(f, f.pc, '5,2'); perk(f, f.pc, 'glyph_mason.foundation', { actionId: 'foundation_draw', choice: 'push' });
    expect(f.pc.ap).toBe(ap); expect(glyphsAt(f, '5,2')[0].word).toBe('push');
    at(f, f.pc, '9,2'); expect(withGame(f.g, () => glyphCost(f.cb, f.pc, 'push', true, '9,2')).ap).toBeGreaterThan(0);
    expect(() => perk(f, f.pc, 'glyph_mason.foundation')).toThrow(/Used|Already/);
  });
});

// ============================================================ Grand Sigilist: the 17 words new in 1.4
function grand(word: string, foePos = '6,2', spec: CharSpec = {}) {
  const f = fightWith([adv('grand_sigilist', spec), {}], [{}, {}]); const u = f.turn(f.pc); at(f, u, '3,2'); at(f, f.pcs[1], '4,3');
  const [foe, foe2] = f.foes; at(f, foe, foePos); foe.hp = foe.maxHp = 999; foe.ap = 6; at(f, foe2, '13,9'); foe2.hp = foe2.maxHp = 999;
  caster(f.unit(u.id), [word]); f.unit(u.id).ap = 9;
  perk(f, f.unit(u.id), 'grand_sigilist.enlarge', { tile: '4,2', choice: word });
  return f;
}
describe('Grand Sigilist under 1.4', () => {
  it('every one of the 40 words has a Grand form, and Enlarge plants any of them (RETURN is gone)', () => {
    expect(Object.values(SIGIL).every((w: any) => !!w.grand)).toBe(true); expect(Object.keys(SIGIL).length).toBe(40); expect(SIGIL.return).toBeUndefined();
    const f = grand('kin'); expect((f.cb.zones || []).find((z: any) => z.kind === 'grand')!.words).toEqual(['kin']);
  });
  it('ACID (Etching ground): cover inside loses 15 HP a round and crumbles; enemies inside are easier to hit (+2); no damage to people', () => {
    const f = grand('acid', '5,2'); f.unit(f.foe.id).armour = 0;
    f.cb.objects = [...objectsOf(f.cb), { id: 'c1', kind: 'crate', pos: '5,3', name: 'Crate', hp: 30, max: 30 } as any, { id: 'c2', kind: 'crate', pos: '12,3', name: 'Crate', hp: 30, max: 30 } as any];
    const roundStart = () => withGame(f.g, () => emit(f.cb, 'round_start', { cb: f.cb, round: f.cb.round }));
    roundStart(); expect(objectsOf(f.cb).find((o) => o.id === 'c1')!.hp).toBe(15); expect(objectsOf(f.cb).find((o) => o.id === 'c2')!.hp).toBe(30);
    roundStart(); expect(objectsOf(f.cb).find((o) => o.id === 'c1' && (o.hp ?? 1) > 0)).toBeUndefined(); expect(logHas(f.cb, /Etching ground/)).toBe(true);
    const a = at(f, f.pcs[1], '4,3'); a.ap = 6;
    expect(withGame(f.g, () => previewAttack(f.cb, f.unit(a.id), f.unit(f.foe.id), 'shot')).terms!.some((t) => t.v === 2 && /Etched/.test(t.label))).toBe(true);
    expect(f.turn(f.foe.id).hp).toBe(999);
  });
  it('COMMAND (Parade ground) halts an enemy (Pinned) on a failed Brain save; QUICKEN gives allies (not you) +1 AP; CLEANSE washes a condition off', () => {
    const c = grand('command', '5,2'); seed(c, 2); const t = c.turn(c.foe.id); expect(condOn(t, 'pinned')).toBe(true); expect(t.prone).toBeFalsy();
    const q = grand('quicken'); const base = q.turn(q.pcs[1].id).ap; const p = fightWith([{}, {}], [{}]); expect(base).toBe(p.turn(p.pcs[1].id).ap + 1);
    expect(q.turn(q.pc.id).ap).toBe(p.turn(p.pcs[0].id).ap);
    const k = grand('cleanse'); k.unit(k.pcs[1].id).conds = { slowed: 2 }; expect(condOn(k.turn(k.pcs[1].id), 'slowed')).toBe(false);
  });
  it('MASK (Hall of masks): enemies outside can\'t pick out your side inside from beyond 3 tiles; SENSE (second sight) reveals Hidden enemies within 4 of the staff', () => {
    const m = grand('mask', '12,3'); m.unit(m.foe.id).ap = 6;
    expect(withGame(m.g, () => previewAttack(m.cb, m.unit(m.foe.id), m.unit(m.pcs[1].id), 'shot')).why).toMatch(/Hall of masks/);
    at(m, m.foe, '7,3'); expect(withGame(m.g, () => previewAttack(m.cb, m.unit(m.foe.id), m.unit(m.pcs[1].id), 'shot')).why || '').not.toMatch(/Hall of masks/);
    expect(m.turn(m.pcs[1].id).hidden).toBeFalsy();
    const s = grand('sense', '8,2'); s.unit(s.foe.id).hidden = true; s.turn(s.pcs[1].id); expect(s.unit(s.foe.id).hidden).toBe(false);
  });
  it('LEECH (Bloodwell): a hit on an enemy inside heals the attacker 5, once a round per pair; WATCH (Sentinel) strikes 15 at your turn start and 10 at an enemy leaving', () => {
    const l = grand('leech', '5,2'); const a = l.unit(l.pcs[1].id); a.hp = 50;
    const hit = () => withGame(l.g, () => applyDamage(l.cb, l.unit(l.foe.id), 20, { by: l.unit(a.id), type: 'weapon', shield: true, credit: 'all' }));
    hit(); expect(l.unit(a.id).hp).toBe(55); hit(); expect(l.unit(a.id).hp).toBe(55); expect(logHas(l.cb, /Bloodwell/)).toBe(true);
    const w = grand('watch', '5,2'); w.unit(w.foe.id).armour = 0; w.turn(w.pc.id); expect(w.unit(w.foe.id).hp).toBe(999 - 15); expect(w.unit(w.foes[1].id).hp).toBe(999);
    const foe = w.turn(w.foe.id); w.unit(foe.id).ap = 6; withGame(w.g, () => moveUnit(w.cb, w.unit(foe.id), '8,2', w.g.rng));
    // The walk also passes Tester 2, whose opportunity attack now lands (spec item 561, Class Roster Rev 3): count it too.
    const oa = Number((w.cb.log.join(' ').match(/Tester 2 strikes Foe 1:[^·]*· hit, (\d+) damage/) || [])[1] || 0);
    expect(w.unit(foe.id).hp).toBe(999 - 15 - 10 - oa); expect(logHas(w.cb, /as it leaves · 10 damage/)).toBe(true);
  });
  it('WAIT (Minefield): an enemy walking in stops at the edge and takes 10; STEP (Fold): a move that stays inside costs 1 AP at most', () => {
    const f = grand('wait', '9,2'); const foe = f.turn(f.foe.id); f.unit(foe.id).armour = 0;
    withGame(f.g, () => moveUnit(f.cb, f.unit(foe.id), '5,1', f.g.rng));
    expect(f.unit(foe.id).pos.split(',')[0]).toBe('6'); expect(f.unit(foe.id).hp).toBe(999 - 10); expect(logHas(f.cb, /tripwire/)).toBe(true);
    const walk = (word: string | null) => { const g = word ? grand(word) : fightWith([{}, {}], [{}]); const a = g.turn(g.pcs[1].id); at(g, a, '2,0'); g.unit(a.id).ap = 6; withGame(g.g, () => moveUnit(g.cb, g.unit(a.id), '6,0', g.g.rng)); return 6 - g.unit(a.id).ap; };
    expect(walk('step')).toBe(1); expect(walk(null)).toBeGreaterThan(1);
  });
  it('SHARPEN (Whetstone): +5 to your side\'s shots from inside, +10 to strikes; RAISE (Ramparts): up to 8 walls on the edge ring, gone with the staff', () => {
    const s = grand('sharpen', '9,1'); at(s, s.pcs[1], '4,1').ap = 6; const sp = withGame(s.g, () => previewAttack(s.cb, s.unit(s.pcs[1].id), s.unit(s.foe.id), 'shot'));
    const plain = fightWith([{}, {}], [{}]); at(plain, plain.pcs[1], '4,1').ap = 6; at(plain, plain.foe, '9,1');
    const pp = withGame(plain.g, () => previewAttack(plain.cb, plain.unit(plain.pcs[1].id), plain.unit(plain.foe.id), 'shot'));
    const add = sp.dmg!.total - pp.dmg!.total; expect(add).toBeGreaterThanOrEqual(5); expect(add).toBeLessThan(7); // +5 flat, then the shot's own multipliers
    const r = grand('raise', '12,1'); const walls = objectsOf(r.cb).filter((o: any) => o.grandWall);
    expect(walls.length).toBeGreaterThan(0); expect(walls.length).toBeLessThanOrEqual(8);
    expect(walls.every((o) => Math.max(Math.abs(+o.pos.split(',')[0] - 4), Math.abs(+o.pos.split(',')[1] - 2)) === 2)).toBe(true);
    expect(walls.some((o) => o.pos === r.unit(r.pcs[1].id).pos)).toBe(false);
    r.unit(r.pc.id).ap = 6; perk(r, r.unit(r.pc.id), 'grand_sigilist.enlarge', { actionId: 'pull_staff' });
    expect(objectsOf(r.cb).some((o: any) => o.grandWall)).toBe(false);
  });
  it('NULL (clean ground) wipes the Sigil magic inside (not a Keystone) and refuses any glyph drawn inside', () => {
    const f = fightWith([adv('grand_sigilist'), {}], [{}]); const u = f.turn(f.pc); at(f, u, '3,2'); caster(f.unit(u.id), ['null']); f.unit(u.id).ap = 9;
    glyph(f, f.foe, 'fire', '5,2'); glyph(f, f.foe, 'seek', '5,3'); glyph(f, f.foe, 'fire', '12,2'); glyph(f, f.pcs[1], 'stone', '2,1', { id: 'ks-x', keystone: true });
    perk(f, f.unit(u.id), 'grand_sigilist.enlarge', { tile: '4,2', choice: 'null' });
    expect((f.cb.glyphs || []).map((g) => g.pos).sort()).toEqual(['12,2', '2,1']);
    const a = f.turn(f.pcs[1].id); caster(f.unit(a.id), ['fire']); at(f, f.unit(a.id), '5,2');
    expect(() => act(f, f.unit(a.id), { type: 'combat/draw', word: 'fire', tile: '5,2' })).toThrow(/Clean ground/);
  });
  it('RELAY (Relay net): +1 to hit for each other ally inside with a line to the target', () => {
    const f = grand('relay', '9,2'); const a = at(f, f.pcs[1], '4,3'); a.ap = 6;
    expect(withGame(f.g, () => previewAttack(f.cb, f.unit(a.id), f.unit(f.foe.id), 'shot')).terms!.some((t) => t.v === 1 && /Relay net/.test(t.label))).toBe(true);
  });
  it('CHAIN (Conductor): your side\'s hit on an enemy inside arcs 10 to the nearest other enemy inside, once a round', () => {
    const f = grand('chain', '5,2'); at(f, f.foes[1], '6,3'); f.unit(f.foes[1].id).armour = 0;
    withGame(f.g, () => applyDamage(f.cb, f.unit(f.foe.id), 20, { by: f.unit(f.pcs[1].id), type: 'weapon', shield: true, credit: 'all' }));
    expect(f.unit(f.foes[1].id).hp).toBe(999 - 10); expect(logHas(f.cb, /Conductor/)).toBe(true);
    withGame(f.g, () => applyDamage(f.cb, f.unit(f.foe.id), 20, { by: f.unit(f.pcs[1].id), type: 'weapon', shield: true, credit: 'all' }));
    expect(f.unit(f.foes[1].id).hp).toBe(999 - 10);
  });
  it('KIN (sanctum): allies inside take no damage from your side; an enemy\'s blow still lands', () => {
    const f = grand('kin', '9,2'); const ally = f.unit(f.pcs[1].id); const hp = ally.hp;
    withGame(f.g, () => applyDamage(f.cb, f.unit(ally.id), 20, { by: f.pc, type: 'sigil', shield: true, credit: 'hp' }));
    expect(f.unit(ally.id).hp).toBe(hp); expect(logHas(f.cb, /Sanctum/)).toBe(true);
    withGame(f.g, () => applyDamage(f.cb, f.unit(ally.id), 20, { by: f.foe, type: 'weapon', shield: true, credit: 'all' }));
    expect(f.unit(ally.id).hp).toBe(hp - 20);
  });
  it('ARC (Mortar pit): at your turn start the staff shells the best tile within 6 of it: 15 there, 5 next to it', () => {
    const f = grand('arc', '8,2'); f.unit(f.foe.id).armour = 0; at(f, f.foes[1], '9,2'); f.unit(f.foes[1].id).armour = 0;
    f.turn(f.pc.id);
    const hits = [999 - f.unit(f.foe.id).hp, 999 - f.unit(f.foes[1].id).hp].sort((a, b) => a - b);
    expect(hits).toEqual([5, 15]); expect(logHas(f.cb, /Mortar pit/)).toBe(true);
    const far = grand('arc', '13,2'); at(far, far.foes[1], '14,9'); far.turn(far.pc.id); expect(far.unit(far.foe.id).hp).toBe(999);
  });
  it('SPREAD (Bloom): a spell your side lands inside also hits every enemy inside it missed for 10; TWICE (Echo field): the first spell a round echoes at half', () => {
    const s = grand('spread', '5,2'); at(s, s.foes[1], '5,3'); for (const x of s.foes) s.unit(x.id).armour = 0;
    withGame(s.g, () => emit(s.cb, 'evoked', { u: s.unit(s.pcs[1].id), impact: '5,2', targets: [s.unit(s.foe.id)], dealt: 40, cb: s.cb, rng: s.g.rng }));
    expect(s.unit(s.foes[1].id).hp).toBe(999 - 10); expect(s.unit(s.foe.id).hp).toBe(999);
    const t = grand('twice', '5,2'); t.unit(t.foe.id).armour = 0;
    const ev = () => withGame(t.g, () => emit(t.cb, 'evoked', { u: t.unit(t.pcs[1].id), impact: '5,2', targets: [t.unit(t.foe.id)], dealt: 40, cb: t.cb, rng: t.g.rng }));
    ev(); expect(t.unit(t.foe.id).hp).toBe(999 - 20); ev(); expect(t.unit(t.foe.id).hp).toBe(999 - 20);
  });
  it('a Grand form ends with the fight: after it, nothing of it (zone, VEIL smoke, RAISE ramparts) is left on the story map', () => {
    for (const word of ['veil', 'raise', 'ward']) {
      const f = grand(word, '12,2'); for (const x of f.foes) { const v = f.unit(x.id); v.hp = 0; v.dead = true; }
      expect((f.cb.zones || []).some((z: any) => z.kind === 'grand')).toBe(true);
      try { act(f, f.unit(f.pc.id), { type: 'combat/end-turn' }); } catch { /* the fight may already be over */ }
      const g = f.g as any; expect(g.phase).toBe('story');
      expect((g.story.zones || []).some((z: any) => z.kind === 'grand' || z.grandOf)).toBe(false);
      expect((g.story.objects || []).some((o: any) => o.grandWall)).toBe(false);
    }
  });
  it('the staff still forbids drawing and Evoking; a Grand form needs 3 charge and is once a fight', () => {
    const f = grand('quicken');
    expect(withGame(f.g, () => glyphCost(f.cb, f.pc, 'quicken')).fail).toMatch(/staff is planted/);
    expect(() => perk(f, f.pc, 'grand_sigilist.enlarge', { tile: '4,2', choice: 'quicken' })).toThrow();
    void resolveAttack;
  });
});

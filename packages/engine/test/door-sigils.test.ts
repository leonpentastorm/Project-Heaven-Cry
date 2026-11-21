// Rules 1.100 (the Sigil door, one lane of the total rebalance; docs/design/handoffs/0.34-REBALANCE-DOOR-sigils.md).
// Every expectation reads the data (skills.json's door ladder and the three ladders, sigils.json grammar, calls.json
// Brief) and goes through the reducer (combat/draw, combat/evoke, combat/perk, combat/call) or the fight's load path.
import { describe, it, expect } from 'vitest';
import { fightWith, withGame, type CharSpec } from './helpers/perkfight';
import { SKILL, SIGIL, d20, wordsKnownCap, type Unit } from '../src';
import { fluxMaxOf, FLUX_MAX, lineCash, compileSpell, lineMultFor, LINE_MOST, MAX_GLYPHS } from '../src/magic';
import { doorLadderOf, reachAt } from '../src/door';
import callsJ from '../../../data/calls.json';
import sigilsJ from '../../../data/sigils.json';

const LAD = doorLadderOf('brain_power')!;
const WD = (w: string): number => (SIGIL as any)[w].damage;
const TOP = { brain_power: 10, rumination: 7, eloquence: 4 };
function calm(n = 40): number { for (let s = 1; s < 2000000; s++) { const r = { state: s }; let ok = true; for (let i = 0; i < n && ok; i++) { const v = d20(r); ok = v > 1 && v < 20; } if (ok) return s; } throw new Error('no seed'); }
const SEED = calm();
/** A Sigil caster at 2,5 with these skills, a foe at 9,5 that never dodges or saves (no Margins), every other multiplier x1. */
function rig(skills: Record<string, number>, words: string[], spec: CharSpec = {}) {
  const f = fightWith([{ archetype: 'sigilist', kit: 'sigil', level: 15, attrs: { intelligence: 10 }, ...spec, skills }], [{ tier: 'minion' }]);
  const cb = f.cb; cb.map = { ...cb.map, cover: [], full: [], solid: [], difficult: [] } as any; cb.objects = []; cb.mana = 15;
  f.pc.pos = '2,5'; f.foe.pos = '9,5';
  const e = f.foe; e.hp = e.maxHp = 99999; e.armour = 0; e.def = -99; e.marginsTaken = -99; /* an unmissable fixture takes no Margins (rules 1.96) */ e.sv = { body: -99, brain: -99, heart: -99 } as any;
  const u = f.turn(f.pc); u.ap = 60; Object.assign(u.mg!, { evoker: true, words: [...words], charge: 999, glyphAp: 1, flux: 0, sigilMult: 1, sigilBoon: 1, deal: 1, elemMult: 1, healMult: 1, rangeBonus: 0, durBonus: 0, coreSave: 0 });
  f.g.rng.state = SEED;
  return f;
}
type F = ReturnType<typeof rig>;
/** Draw the Line walking toward 2,5 (its last glyph there) and Evoke it at the foe. */
function cast(f: F, words: string[]): string | null {
  words.forEach((w, i) => { const t = (2 + words.length - 1 - i) + ',5'; f.pc.pos = t; f.act({ type: 'combat/draw', unitId: f.pc.id, word: w, tile: t }); });
  const hp = f.foe.hp; f.act({ type: 'combat/evoke', unitId: f.pc.id, tile: '2,5', aim: '9,5' } as any); (f as any).dealt = hp - f.unit(f.foe.id).hp; return null;
}
const LINES: Record<number, string[]> = { 2: ['stone', 'seek'], 3: ['stone', 'fire', 'seek'], 4: ['stone', 'fire', 'freeze', 'seek'], 5: ['stone', 'fire', 'freeze', 'shock', 'seek'] };

describe('item 8370: a Line\'s length is Brain Power\'s Reach (the family gates of ruling 13)', () => {
  it('Max Sigil words on the fight\'s load path is reachAt of the sheet; the longest Line is the top Reach, one more Overclocked', () => {
    for (const r of LAD.rows) for (const skills of [{ brain_power: r.points }, { brain_power: r.points, ...(r.needs || {}) }]) {
      const f = fightWith([{ archetype: 'sigilist', kit: 'sigil', level: 15, attrs: { intelligence: 10 }, skills }], [{}]);
      expect(f.pc.mg!.maxWords).toBe(reachAt(skills, LAD));
    }
    expect(MAX_GLYPHS).toBe(Math.max(...LAD.rows.map((r) => r.reach || 0)));
    expect(LINE_MOST).toBe(MAX_GLYPHS + (sigilsJ as any).grammar.push_past);
  });
});

describe('item 8371: the Evoke is the door\'s cash-out, Bite x S(n), never less than the plain hit', () => {
  it('a real Line of n glyphs deals its strongest Subject x lineCash(n), through the reducer', () => {
    for (const n of [2, 3, 4, 5]) {
      const words = LINES[n], f = rig(TOP, words); cast(f, words);
      const top = Math.max(...words.filter((w) => WD(w)).map(WD));
      expect((f as any).dealt).toBe(Math.round(top * lineCash(TOP, n)));
      expect(lineCash(TOP, n)).toBeGreaterThanOrEqual(1); // ruling 63: never under the plain hit
    }
    expect(lineCash(TOP, 5) / lineCash(TOP, 2)).toBeGreaterThan(5); // the all-in Line is the door's top (ruling 58)
  });
  it('a Line longer than its caster may write now pays at that length (a stored spell past a new Reach goes off as stored)', () => {
    const f = rig({ brain_power: 4 }, LINES[5]), sp = compileSpell(LINES[5]);
    expect(f.pc.mg!.maxWords).toBe(reachAt({ brain_power: 4 }, LAD));
    expect(lineMultFor(f.pc, sp)).toBeCloseTo(lineCash({ brain_power: 4 }, f.pc.mg!.maxWords), 9);
  });
});

describe('item 8373: words held are the base + Brain Power\'s per-point words', () => {
  it('4 + 3 a point, from the data', () => {
    const f = rig({ brain_power: 6 }, ['stone', 'seek']), c = f.g.characters[f.pc.charId!];
    expect(wordsKnownCap(c)).toBe((sigilsJ as any).grammar.known.base + (SKILL as any).brain_power.per_point.numbers.words * 6 + ((c as any).sigilGrowth?.freeTaken || 0));
  });
});

describe('item 8374: Overclock is the Push at Brain Power 8: once a turn, one past the Reach, and the Evoker overloads', () => {
  const key = Object.entries((SKILL as any).brain_power.unlocks).find(([, x]: any) => (x.effects || []).some((e: any) => e.action === 'overclock'))![0];
  it('held from 8; the Overclocked Line is one past the Reach, pays its length, and overloads the Evoker (the lock, the hurt)', () => {
    expect(Number(key)).toBe(8);
    const skills = { brain_power: 8, rumination: 4 };
    const no = rig({ brain_power: 7, rumination: 4 }, LINES[5]);
    expect(() => no.act({ type: 'combat/perk', unitId: no.pc.id, id: 'skill:brain_power.' + key, actionId: 'overclock' } as any)).toThrow();
    const f = rig(skills, LINES[5]), reach = reachAt(skills, LAD);
    f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'skill:brain_power.' + key, actionId: 'overclock' } as any);
    expect(f.pc.mg!.maxWords).toBe(reach + 1);
    expect(() => f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'skill:brain_power.' + key, actionId: 'overclock' } as any)).toThrow(); // once a turn
    const hp0 = f.pc.hp, words = LINES[reach + 1]; cast(f, words);
    const top = Math.max(...words.filter((w) => WD(w)).map(WD));
    expect((f as any).dealt).toBe(Math.round(top * lineCash(skills, reach + 1)));
    expect(f.unit(f.pc.id).hp).toBeLessThan(hp0); expect(f.unit(f.pc.id).mg!.flux).toBe(0); expect(f.unit(f.pc.id).mg!.lockRound).toBe(f.cb.round);
    expect(f.unit(f.pc.id).mg!.maxWords).toBe(reach);
  });
});

describe('item 8375: Rumination is +1 Flux limit a point; at 10 an Evoke leaves its first glyph', () => {
  it('the Flux limit on the load path is the rule\'s safe_max + feed_flat x Rumination', () => {
    for (const r of [0, 1, 4, 10]) { const f = rig({ brain_power: 1, rumination: r }, ['stone', 'seek']); expect(withGame(f.g, () => fluxMaxOf(f.pc, f.cb))).toBe(FLUX_MAX + (SKILL as any).rumination.per_point.numbers.feed_flat * r); }
  });
  it('Rumination 10: the Line\'s first glyph stays on the ground after the Evoke; Rumination 9 keeps none', () => {
    const left = (rum: number) => { const f = rig({ brain_power: 4, rumination: rum }, LINES[3]); cast(f, LINES[3]); return (f.cb.glyphs || []).filter((g) => g.side === 'pc').map((g) => g.word); };
    expect(left(10)).toEqual([LINES[3][0]]); expect(left(9)).toEqual([]);
  });
});

describe('item 8376: Brief works alone, and from Eloquence 6 a Brief vents your Flux', () => {
  const BRIEF: any = (callsJ as any).items.find((c: any) => c.id === 'call.brief');
  it('on yourself at the step below; the vent from the row\'s step', () => {
    for (const elo of [5, 6]) {
      const f = rig({ brain_power: 1, eloquence: elo }, ['stone', 'seek']); f.pc.mg!.flux = 3;
      f.act({ type: 'combat/call', unitId: f.pc.id, id: 'call.brief', targetId: f.pc.id } as any);
      expect(f.unit(f.pc.id).call?.brief).toBeTruthy();
      const row = [...BRIEF.feeds.steps].reverse().find((x: any) => elo >= x.from);
      expect(f.unit(f.pc.id).mg!.flux).toBe(3 + (row ? row.value : 0));
    }
  });
});

describe('the Sigil door: a test of the test (the cash-out is on in this file)', () => {
  it('a Line of two pays more than one plain hit', () => { const f = rig(TOP, LINES[2]); cast(f, LINES[2]); expect((f as any).dealt).toBeGreaterThan(WD('stone')); });
  it('an enemy\'s Line has no factor', () => { const f = rig(TOP, LINES[2]); expect(lineMultFor(f.foe as Unit, compileSpell(LINES[2]))).toBe(1); });
});

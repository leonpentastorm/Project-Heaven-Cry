// Sigil 1.5 review fixes (rules revision 1.9): every path that takes a glyph off the ground tidies the strokes left
// (item 673), a fused Line keeps its junction in the other stroke (item 689), and a Keystone cut before 1.9 joins the
// strokes. Every draw, feed, fuse and Keystone here goes through the reducer (apply).
import { describe, expect, it } from 'vitest';
import { d20, findPattern, type Unit } from '../src';
import { fightWith } from './helpers/perkfight';
import { useRevision2Classes } from './helpers/legacy';
useRevision2Classes(); // the Glyph Mason (an advanced class) for the Keystone test

function calm(n = 40): number { for (let s = 1; s < 2000000; s++) { const r = { state: s }; let ok = true; for (let i = 0; i < n && ok; i++) { const v = d20(r); ok = v > 1 && v < 20; } if (ok) return s; } throw new Error('no seed'); }
const ALL_PAID = ['brain_power', 'rumination', 'eloquence'].flatMap((s) => [3, 5, 7, 9, 10].map((l) => s + ':' + l));

/** A Soul caster with an Evoker too (Twin Discipline where asked), Brain Power 10 (junctions), the yard cleared. */
function rig(words: string[], perks: Record<string, string> = {}, spec: any = { archetype: 'stormcaller', kit: 'soul' }) {
  const f = fightWith([{ ...spec, perks }], [{ tier: 'minion' }] as any);
  const cb = f.cb; cb.map = { ...cb.map, cover: [], full: [], solid: [], difficult: [] } as any; cb.objects = []; cb.mana = 15;
  f.pc.pos = '3,5'; f.foe.pos = '10,5';
  for (const x of [...f.pcs, ...f.foes]) { x.hp = x.maxHp = 500; x.armour = 0; x.def = -99; x.sv = { body: -99, brain: -99, heart: -99 } as any; x.hidden = false; }
  const c = f.g.characters[f.pc.charId!]; c.sigils = [...words]; c.skills.brain_power = 10;
  (c as any).sigilGrowth = { study: 0, picksUsed: 0, free: 0, paid: [...ALL_PAID], toStudy: [], uses: {} };
  const u = f.turn(f.pc); u.ap = 60;
  Object.assign(u.mg!, { evoker: true, words: [...words], charge: 999, cores: 5, glyphAp: 1, maxWords: 4, flux: -99, sigilMult: 1, elemMult: 1, healMult: 1, rangeBonus: 0, durBonus: 0, coreSave: 0, inflect: [], mp: 500 });
  f.g.rng.state = calm();
  return f;
}
type F = ReturnType<typeof rig>;
const me = (f: F): Unit => f.unit(f.pc.id);
const draw = (f: F, w: string, t: string, stroke?: string) => { const u = me(f); u.pos = t; u.ap = 60; f.act({ type: 'combat/draw', unitId: u.id, word: w, tile: t, ...(stroke ? { stroke } : {}) } as any); };
const at = (f: F, t: string) => (f.cb.glyphs || []).find((g) => g.pos === t);
const words = (f: F, t: string) => { const p = findPattern(f.cb, t); return typeof p === 'string' ? p : p.words; };

describe('feeding a middle glyph splits its stroke (rules 1.9, Drawing 3.8; item 673)', () => {
  it('the two parts take their own ids, so a glyph drawn in the gap extends one part, never all three tiles', () => {
    const f = rig(['fire', 'seek', 'spark', 'condense']);
    draw(f, 'fire', '2,2'); draw(f, 'seek', '3,2'); draw(f, 'spark', '4,2');
    expect(new Set(['2,2', '3,2', '4,2'].map((t) => at(f, t)!.strokeId)).size).toBe(1);
    f.act({ type: 'combat/outburst', unitId: f.pc.id, design: me(f).mg!.designs[0].id, hold: true } as any);
    me(f).pos = '3,2'; me(f).ap = 60; f.act({ type: 'combat/feed', unitId: f.pc.id } as any);
    expect(at(f, '3,2')).toBeUndefined(); expect(at(f, '2,2')!.strokeId).not.toBe(at(f, '4,2')!.strokeId);
    draw(f, 'condense', '3,2');
    expect(words(f, '3,2')).toHaveLength(2); expect(f.cb.log.some((l) => /FIRE · CONDENSE · SPARK/.test(l))).toBe(false);
  });
});

describe('Twin Discipline fuses a Line through a junction (rules 1.9 Junctions; item 689)', () => {
  it('the junction leaves the fused stroke only and stays in its other one, as a plain Evoke leaves it', () => {
    for (const mode of ['evoke', 'fused']) {
      const f = rig(['fire', 'spark', 'seek', 'arc'], { twin_discipline: 'ultimate' });
      draw(f, 'fire', '6,5'); const A = at(f, '6,5')!.strokeId!;
      draw(f, 'seek', '5,5', 'junction:' + A + ',new'); const J = at(f, '5,5')!, B = J.strokeId2!;
      expect(B).toBeTruthy(); draw(f, 'spark', '4,6');
      me(f).pos = '5,5'; me(f).ap = 60;
      if (mode === 'evoke') f.act({ type: 'combat/evoke', unitId: f.pc.id, tile: '6,5', aim: '10,5' } as any);
      else {
        f.act({ type: 'combat/outburst', unitId: f.pc.id, design: me(f).mg!.designs[0].id, hold: true } as any); me(f).ap = 60;
        f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'twin_discipline', actionId: 'fused', tile: '6,5', choice: '10,5' } as any);
        expect(f.cb.log.some((l) => /Twin Discipline/.test(l))).toBe(true);
      }
      expect((f.cb.glyphs || []).map((g) => [g.pos, g.word]).sort()).toEqual([['4,6', 'spark'], ['5,5', 'seek']]);
      expect(at(f, '5,5')!.strokeId).toBe(at(f, '4,6')!.strokeId); expect(at(f, '5,5')!.strokeId2).toBeUndefined();
      expect(words(f, '4,6')).toEqual(['seek', 'spark']);
    }
  });
});

describe('a Keystone cut before rules 1.9 (no stroke) joins the strokes (item 674)', () => {
  it('the next restore gives it a stroke, and a glyph drawn beside it extends it into a Line', () => {
    const f = rig(['fire', 'seek'], {}, { archetype: 'sigilist', kit: 'sigil', advancedClass: 'glyph_mason', level: 5 });
    me(f).pos = '4,5'; f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'class:glyph_mason.keystone', tile: '4,5', choice: 'fire' } as any);
    const ks = at(f, '4,5')! as any; expect(ks.keystone).toBe(true);
    delete ks.strokeId; // as a pre-1.9 save holds it
    me(f).ap = 60; f.act({ type: 'combat/move', unitId: f.pc.id, to: '3,5' } as any); // a step: the moved hook restores it
    expect(at(f, '4,5')!.strokeId).toBeTruthy();
    draw(f, 'seek', '3,5'); expect(at(f, '3,5')!.strokeId).toBe(at(f, '4,5')!.strokeId);
    expect([...(words(f, '4,5') as string[])].sort()).toEqual(['fire', 'seek']); // a Line of the two
  });
});

// The Sigil word cap's refusal (spec: Drawing, rules 1.4 item 2 and 1.10 Drawing 5; rules 1.100 item 8370: Max Sigil
// words is Brain Power's Reach): drawing a glyph that would make a Line longer than your Max Sigil words says how long the
// Line would be, your Max Sigil words at your Brain Power, and which Brain Power point raises it (read from the one
// formula, character.ts maxSigilWords); when no point raises it alone, it says nothing about raising it. Through the
// reducer (combat/draw).
import { describe, expect, it } from 'vitest';
import { maxSigilWords, type Unit, type Character } from '../src';
import { fightWith } from './helpers/perkfight';

type F = ReturnType<typeof fightWith>;
const MIND = { archetype: 'sigilist', kit: 'sigil' } as const;
const step = (k: string) => { const [x, y] = k.split(',').map(Number); return (x + 1) + ',' + y; };
function caster(skills: Record<string, number>) {
  const f = fightWith([{ ...MIND, skills }], [{ at: 'P11' }]);
  const u = f.turn(f.pc);
  Object.assign(u, { ap: 99 }); Object.assign(u.mg!, { words: ['fire', 'seek', 'condense'], charge: 999, flux: -99, glyphAp: 1 });
  return { f, u };
}
const draw = (f: F, u: Unit, word: string, at: string) => { f.unit(u.id).pos = at; f.act({ type: 'combat/draw', unitId: u.id, word, tile: at } as any); };
/** FIRE · SEEK walked in a row from the caster's tile, then CONDENSE on the next tile: the third glyph of the Line. */
function third(f: F, u: Unit): () => void {
  const a = f.unit(u.id).pos, b = step(a), c = step(b);
  draw(f, u, 'fire', a); draw(f, u, 'seek', b);
  return () => draw(f, u, 'condense', c);
}

describe('the word cap refusal says why and how to raise it', () => {
  it('at Max Sigil words 2: the Line would be 3 glyphs, Max Sigil words 2 at Brain Power 1, the Brain Power that makes it 3', () => {
    const { f, u } = caster({ brain_power: 1 });
    const c = f.g.characters[u.charId!] as Character, m = maxSigilWords(c);
    expect(f.unit(u.id).mg!.maxWords).toBe(m);
    let up = 2; while (up <= 10 && maxSigilWords({ ...c, skills: { ...c.skills, brain_power: up } } as Character) <= m) up++; // the formula's own next step
    expect(up).toBeLessThanOrEqual(10);
    const go = third(f, u);
    expect(go).toThrow('Past your cap: this Line would be 3 glyphs, and your Max Sigil words is ' + m + ' at Brain Power 1. Brain Power ' + up + ' raises it to ' + (m + 1) + '. Or pick new Line.');
  });
  it('when no Brain Power point raises it alone, nothing is said about raising it', () => {
    const { f, u } = caster({ brain_power: 10 });
    const go = third(f, u); f.unit(u.id).mg!.maxWords = 2; // something holds the cap at 2 at the top of the ladder
    expect(go).toThrow('Past your cap: this Line would be 3 glyphs, and your Max Sigil words is 2 at Brain Power 10. Or pick new Line.');
  });
});

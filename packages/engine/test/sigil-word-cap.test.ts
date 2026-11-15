// The Sigil word cap's refusal (spec: Drawing, rules 1.4 item 2 and 1.10 Drawing 5): drawing a glyph that would make
// a Line longer than your Max Sigil words says how long the Line would be, your Max Sigil words at your Intelligence,
// and which Intelligence raises it (read from the one formula, character.ts maxSigilWords); at the top of the table it
// says nothing about raising it. Through the reducer (combat/draw).
import { describe, expect, it } from 'vitest';
import { maxSigilWords, attrCapAt, type Unit, type Character } from '../src';
import { fightWith } from './helpers/perkfight';

type F = ReturnType<typeof fightWith>;
const MIND = { archetype: 'sigilist', kit: 'sigil' } as const;
const step = (k: string) => { const [x, y] = k.split(',').map(Number); return (x + 1) + ',' + y; };
function caster(int: number) {
  const f = fightWith([{ ...MIND, attrs: { intelligence: int } }], [{ at: 'P11' }]);
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
  it('at Max Sigil words 2: the Line would be 3 glyphs, Max Sigil words 2 at Intelligence 2, the Intelligence that makes it 3', () => {
    const { f, u } = caster(2);
    const c = f.g.characters[u.charId!] as Character, m = maxSigilWords(c);
    expect(f.unit(u.id).mg!.maxWords).toBe(m);
    let up = 3; while (maxSigilWords({ ...c, attrs: { ...c.attrs, intelligence: up } } as Character) <= m) up++; // the formula's own next step
    const go = third(f, u);
    expect(go).toThrow('Past your cap: this Line would be 3 glyphs, and your Max Sigil words is ' + m + ' at Intelligence 2. Intelligence ' + up + ' raises it to ' + (m + 1) + '. Or pick new Line.');
  });
  it('at the top of the table nothing is said about raising it', () => {
    const top = attrCapAt(Infinity), { f, u } = caster(top);
    const go = third(f, u); f.unit(u.id).mg!.maxWords = 2; // something holds the cap at 2 at the highest Intelligence
    expect(go).toThrow('Past your cap: this Line would be 3 glyphs, and your Max Sigil words is 2 at Intelligence ' + top + '. Or pick new Line.');
  });
});

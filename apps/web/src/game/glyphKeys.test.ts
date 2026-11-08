// The glyph keyboard's arrow keys (glyphKeyNav), on stub elements laid out on a grid: no browser needed.
import { describe, expect, it } from 'vitest';
import { glyphKeyNav } from './glyphKeys';

type Key = { id: string; x: number; y: number; focus: () => void; getBoundingClientRect: () => any; closest: (s: string) => any };
/** A pad of rows; each row a list of lines; each line a list of word ids. Keys are 100 wide, lines 40 apart. */
function pad(rows: string[][][]) {
  const state = { focused: '' }; let y = 0;
  const rowEls = rows.map((lines) => {
    const keys: Key[] = [];
    for (const line of lines) { line.forEach((id, i) => keys.push({ id, x: i * 100, y, focus: () => { state.focused = id; }, getBoundingClientRect: () => ({ left: i * 100, width: 100, top: keys.find((k) => k.id === id)!.y }), closest: () => padEl })); y += 40; }
    y += 20; return { querySelectorAll: () => keys };
  });
  const padEl = { querySelectorAll: () => rowEls };
  const all = rowEls.flatMap((r) => r.querySelectorAll());
  const press = (id: string, key: string) => { let prevented = false; glyphKeyNav({ key, currentTarget: all.find((k) => k.id === id), preventDefault: () => { prevented = true; } }); const f = state.focused; state.focused = ''; return { to: f, prevented }; };
  return { press };
}
// Elements wraps over two lines (fire ice volt | storm), then Reach (seek arc), then Burst (spread).
const P = pad([[['fire', 'ice', 'volt'], ['storm']], [['seek', 'arc']], [['spread']]]);

describe('glyphKeyNav: arrow keys on the glyph keyboard', () => {
  it('Right and Left step through every key across rows, and wrap at both ends', () => {
    expect(P.press('volt', 'ArrowRight').to).toBe('storm'); expect(P.press('storm', 'ArrowRight').to).toBe('seek');
    expect(P.press('spread', 'ArrowRight').to).toBe('fire');
    expect(P.press('seek', 'ArrowLeft').to).toBe('storm'); expect(P.press('fire', 'ArrowLeft').to).toBe('spread');
  });
  it('Home and End jump to the first and last key', () => {
    expect(P.press('arc', 'Home').to).toBe('fire'); expect(P.press('ice', 'End').to).toBe('spread');
  });
  it('Down goes to the nearest key on the next line: inside a wrapped row first, then the next row', () => {
    expect(P.press('volt', 'ArrowDown').to).toBe('storm'); // the wrapped line of Elements
    expect(P.press('storm', 'ArrowDown').to).toBe('seek'); expect(P.press('ice', 'ArrowDown').to).toBe('storm');
    expect(P.press('arc', 'ArrowDown').to).toBe('spread');
  });
  it('Up goes to the nearest key on the line just above: the first line of a wrapped row, or the last line of the row above', () => {
    expect(P.press('storm', 'ArrowUp').to).toBe('fire'); expect(P.press('arc', 'ArrowUp').to).toBe('storm'); // the line just above is storm's
    expect(P.press('spread', 'ArrowUp').to).toBe('seek');
  });
  it('Up on the top line and Down on the last row stay put (and the page doesn\'t scroll)', () => {
    expect(P.press('ice', 'ArrowUp')).toEqual({ to: '', prevented: true }); expect(P.press('spread', 'ArrowDown')).toEqual({ to: '', prevented: true });
  });
  it('other keys are left alone (Enter and Space pick the word as a click)', () => {
    expect(P.press('fire', 'Enter')).toEqual({ to: '', prevented: false }); expect(P.press('fire', 'a')).toEqual({ to: '', prevented: false });
  });
});

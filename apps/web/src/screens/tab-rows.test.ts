// @vitest-environment jsdom
// The two tab rows (the story screen's sheet tabs and the fight panel's action tabs) wrap onto a second line when they
// don't fit: flex-wrap, no sideways scroll, and the arrow keys follow the order on screen.
import { describe, expect, it } from 'vitest';
import { tabNavIndex } from './shared';
import mainTpl from '../templates/main.template.html?raw';
import combatTpl from '../templates/combat.template.html?raw';

/** A tab row laid out by hand (jsdom has no layout): `rows` gives the tabs on each line. */
function row(rows: number[]) {
  const list = document.createElement('div'); list.setAttribute('role', 'tablist');
  const tabs: HTMLElement[] = [];
  rows.forEach((n, r) => { for (let i = 0; i < n; i++) { const b = document.createElement('button'); b.setAttribute('role', 'tab');
    const w = 300 / n; (b as any).getBoundingClientRect = () => ({ top: r * 40, left: i * w, width: w, height: 36, right: (i + 1) * w, bottom: r * 40 + 36 });
    list.appendChild(b); tabs.push(b); } });
  const key = (k: string, i: number) => tabNavIndex({ key: k, currentTarget: tabs[i] }, tabs.length, i);
  return { key, n: tabs.length };
}

describe('tab rows that wrap', () => {
  it('both rows wrap and neither scrolls sideways', () => {
    const sheet = /<div role="tablist" aria-label="Sheet"[^>]*style="([^"]*)"/.exec(mainTpl)![1];
    const acts = /<div role="tablist" aria-label="Actions"[^>]*style="([^"]*)"/.exec(combatTpl)![1];
    for (const st of [sheet, acts]) { expect(st).toMatch(/flex-wrap: wrap/); expect(st).not.toMatch(/overflow-x|nowrap/); }
  });
  it('Left and Right follow the reading order across both lines, wrapping at the ends; Home and End', () => {
    const t = row([5, 4]); // nine tabs: five on the first line, four on the second
    expect(t.key('ArrowRight', 4)).toBe(5); expect(t.key('ArrowLeft', 5)).toBe(4);
    expect(t.key('ArrowRight', 8)).toBe(0); expect(t.key('ArrowLeft', 0)).toBe(8);
    expect(t.key('Home', 6)).toBe(0); expect(t.key('End', 2)).toBe(8);
    expect(t.key('a', 2)).toBe(-1); expect(t.key('Enter', 2)).toBe(-1);
  });
  it('Up and Down move to the nearest tab on the other line; on a single line they do nothing', () => {
    const t = row([5, 4]);
    expect(t.key('ArrowDown', 0)).toBe(5); // first of line one → first of line two
    expect(t.key('ArrowDown', 4)).toBe(8); // last → last
    expect(t.key('ArrowUp', 8)).toBe(4);
    expect(t.key('ArrowUp', 6)).toBe(1 + (Math.abs(300 / 4 * 1.5 - 300 / 5 * 1.5) < Math.abs(300 / 4 * 1.5 - 300 / 5 * 2.5) ? 0 : 1));
    expect(t.key('ArrowUp', 2)).toBe(6); // from the top line, Up wraps to the line below
    const one = row([7]);
    expect(one.key('ArrowDown', 3)).toBe(-1); expect(one.key('ArrowUp', 3)).toBe(-1); expect(one.key('ArrowRight', 6)).toBe(0);
  });
});

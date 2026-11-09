// Echo's row and explainer (UI pass 4): the numbers come from the rules data; the diamonds follow the count.
import { describe, expect, it } from 'vitest';
import { echoView } from './echoView';

describe('Echo on the sheet', () => {
  it('three diamonds, filled for each Echo held, with the count and what it does', () => {
    const v = echoView(1);
    expect(v.count).toBe('1 / 3'); expect(v.short).toBe('reroll a d20');
    expect(v.pips.map((p) => p.full)).toEqual([true, false, false]);
    expect(echoView(9).n).toBe(3); expect(echoView(undefined).n).toBe(0);
  });
  it('the explainer says how to get it, how much to hold and where to spend it, from the rules data', () => {
    const t = JSON.stringify(echoView(2));
    expect(t).toMatch(/1 at the start of every session/);
    expect(t).toMatch(/\+1 when you indulge an Overreach/);
    expect(t).toMatch(/at most 3/);
    expect(t).toMatch(/Spend 1 Echo · throw again/);
    expect(t).toMatch(/1 Echo, 2 if the skill is Mastered/);
    expect(t).toMatch(/in a fight: not yet/);
  });
  it('a gain flares the newest diamond; a spend flares the one emptied', () => {
    expect(echoView(2, 'up').pips.map((p) => p.cls)).toEqual(['', 'phc-echo-gain', '']);
    expect(echoView(1, 'down').pips.map((p) => p.cls)).toEqual(['', 'phc-echo-spend', '']);
  });
});

// The skill road map (rules 1.54 item 4119; ui-screens "Skill texts on the three skill screens"): every skill's rows
// placed on points 1 to 10 by the one helper the three screens share. Reads the data, not sentences.
import { describe, expect, it, vi } from 'vitest';
import { SKILL } from '@engine';
vi.stubGlobal('location', { search: '', hash: '' });
const { D, roadMap, rowPoints, nextLine, headLine } = await import('./shared');

/** Where a row must land, spelled out from its `at` (the spec's table, not the helper's code). */
const want = (at: string): number[] => {
  if (at === 'each') return [];
  if (at === 'every 2') return [2, 4, 6, 8, 10];
  if (at === 'every 3') return [3, 6, 9];
  const m = /^(each from|from|at) (\d+)$/.exec(at); if (!m) throw new Error('unknown at ' + at);
  return [Number(m[2])];
};

describe('the road map of every skill', () => {
  const skills = D.skills as any[];
  it('covers all 27 skills', () => { expect(skills).toHaveLength(27); });
  for (const s of skills) {
    it(s.id + ': ten steps, each row on its points and nowhere else, the mastery steps where its unlocks put them', () => {
      const k = (SKILL as any)[s.id], rows = k.per_point.rows as { at: string; text: string }[], r = roadMap(s.id);
      expect(r.steps.map((t: any) => t.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      rows.forEach((row, j) => {
        expect(rowPoints(row.at), row.at).toEqual(want(row.at));
        for (const t of r.steps) expect(t.lines.some((l: any) => l.key === 'r' + j), s.id + ' row ' + j + ' (' + row.at + ') on ' + t.n).toBe(want(row.at).includes(t.n));
      });
      // `each` (and `each from n`) rows are the head line; nothing else is
      expect(r.head).toHaveLength(rows.filter((x) => x.at === 'each' || x.at.startsWith('each from')).length);
      for (const t of r.steps) {
        const texts = t.lines.map((l: any) => l.text);
        expect(new Set(texts).size, s.id + ' step ' + t.n + ' repeats a line').toBe(texts.length);
        for (const x of texts) expect(x, s.id).not.toMatch(/\{=|undefined|NaN/);
        const u = k.unlocks[t.n], m = u ? Number(u.mastery) || 0 : 0;
        expect(t.step, s.id + ' step ' + t.n).toBe(m >= 1 && m <= 4 ? 'M' + m : m === 5 ? 'mastered' : '');
        if (m >= 1 && m <= 4) expect(t.perks.map((p: any) => p.name)).toEqual(s.ep.perks.map((p: any) => p.name));
        if (m === 5) expect(t.perks.map((p: any) => p.name)).toEqual([s.ep.mastered.name]);
        if (!m) expect(t.perks).toEqual([]);
      }
      // the next point's line is never empty below the top, and is empty past it
      for (let p = 0; p < 10; p++) expect(nextLine(s.id, p).length, s.id + ' next after ' + p).toBeGreaterThan(0);
      expect(nextLine(s.id, 10)).toBe('');
    });
  }
  it('Will Power, the skill that started it: no sentence twice, its gains spread over the points', () => {
    const r = roadMap('will_power'), at = (n: number) => r.steps[n - 1].lines.map((l: any) => l.kind + ':' + l.at);
    expect(headLine('will_power')).toMatch(/^Every point: /);
    expect(at(1)).toEqual([]);
    expect(at(2)).toEqual(['row:every 2', 'row:every 2']);
    expect(at(3)).toEqual(['row:every 3', 'row:from 3', 'unlock:at 3', 'perk:at 3']);
    expect(at(7)).toEqual(['row:from 7', 'perk:at 7']);
    expect(at(10)).toEqual(['row:every 2', 'row:every 2', 'mastered:at 10']);
    const all = r.steps.flatMap((t: any) => t.lines.map((l: any) => t.n + l.text));
    expect(new Set(all).size).toBe(all.length);
  });
});

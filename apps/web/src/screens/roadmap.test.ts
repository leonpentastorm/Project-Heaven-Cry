// The skill road map (rules 1.54 item 4119; ui-screens "Skill texts on the three skill screens"): every skill's rows
// placed on points 1 to 10 by the one helper the three screens share. Reads the data, not sentences.
import { describe, expect, it, vi } from 'vitest';
import { SKILL, ladderCaps } from '@engine';
vi.stubGlobal('location', { search: '', hash: '' });
const { D, roadMap, rowPoints, nextLine, headLine, rowText } = await import('./shared');

/** Where a row must land, spelled out from its `at` (the spec's table, not the helper's code): an `each` row on every
 *  level, an `each from n` row from n on (the per-point gains go on the levels: no EVERY POINT block). */
const want = (at: string): number[] => {
  const all = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  if (at === 'each') return all;
  if (at === 'every 2') return [2, 4, 6, 8, 10];
  if (at === 'every 3') return [3, 6, 9];
  const m = /^(each from|from|at) (\d+)$/.exec(at); if (!m) throw new Error('unknown at ' + at);
  return m[1] === 'each from' ? all.filter((n) => n >= Number(m[2])) : [Number(m[2])];
};
const each = (at: string) => at === 'each' || at.startsWith('each from');

describe('the road map of every skill', () => {
  const skills = D.skills as any[];
  it('covers all 27 skills', () => { expect(skills).toHaveLength(27); });
  for (const s of skills) {
    it(s.id + ': ten steps, each row on its points and nowhere else, the mastery steps where its unlocks put them', () => {
      const k = (SKILL as any)[s.id], rows = k.per_point.rows as { at: string; text: string }[], r = roadMap(s.id);
      expect(r.steps.map((t: any) => t.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      rows.forEach((row, j) => {
        if (k.feed && j === 0) { for (const t of r.steps) expect(t.lines.some((l: any) => /^[er]0$/.test(l.key)), s.id + ': the feed row is the header chip, on no level').toBe(false); return; }
        if (!each(row.at)) expect(rowPoints(row.at), row.at).toEqual(want(row.at));
        const key = (each(row.at) ? 'e' : 'r') + j, cap = ladderCaps(s.id, null)[j]; // a capped row stops on its last point (the engine's)
        for (const t of r.steps) expect(t.lines.some((l: any) => l.key === key), s.id + ' row ' + j + ' (' + row.at + ') on ' + t.n).toBe(want(row.at).includes(t.n) && (cap === undefined || t.n <= cap));
        if (cap) expect(r.steps[cap - 1].lines.find((l: any) => l.key === key)!.text, s.id + ' the last capped level says it is the most').toBe(row.text + ' (max)');
      });
      // `each` (and `each from n`) rows are the head line; nothing else is
      // (a beta's first row is its door line, shown under "Feeds <door>": never in the head)
      expect(r.head).toHaveLength(rows.filter((x, j) => !(k.feed && j === 0) && (x.at === 'each' || x.at.startsWith('each from'))).length);
      if (k.feed) expect(r.feed).toBe(rows[0].text);
      for (const t of r.steps) {
        // the per-point gains first, then the level's own lines (its rows, its Call's step, its unlock or fork, its perk)
        const kinds = t.lines.map((l: any) => l.kind), firstOwn = kinds.findIndex((x: string) => x !== 'each');
        if (firstOwn >= 0) expect(kinds.slice(firstOwn), s.id + ' level ' + t.n + ': per-point gains first').not.toContain('each');
        expect(rowText(t)).toBe(t.lines.map((l: any) => l.text).join(' · '));
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
  it('Will Power, the skill that started it: no sentence twice on a level, its gains spread over the points', () => {
    const r = roadMap('will_power'), at = (n: number) => r.steps[n - 1].lines.map((l: any) => l.kind + ':' + l.at);
    expect(headLine('will_power')).toMatch(/^Every point: /);
    const per = r.head.map(() => 'each:each');
    expect(at(1)).toEqual(per);
    expect(at(2)).toEqual([...per, 'row:every 2', 'row:every 2']);
    expect(at(3)).toEqual([...per, 'row:every 3', 'row:from 3', 'unlock:at 3', 'perk:at 3']);
    expect(at(7)).toEqual([...per, 'row:from 7', 'perk:at 7']);
    expect(at(10)).toEqual([...per, 'row:every 2', 'row:every 2', 'mastered:at 10']);
    // the perk step names the two perks once (level 3); later steps say "Perk", the names in the hover
    expect(r.steps[2].lines.find((l: any) => l.kind === "perk")!.text).toMatch(/^Perk: .+ or .+$/);
    for (const n of [5, 7, 9]) { const l = r.steps[n - 1].lines.find((x: any) => x.kind === 'perk')!; expect(l.text).toBe('Perk'); expect(l.tip).toMatch(/^Perk: .+ or .+, or a Tier II · /); }
  });
  it('capped rows (0.31.11): Pain Threshold elemental resistance to 6, Durability plates held to the pool cap, Faith Hymn wait to its floor', () => {
    const shown = (id: string, re: RegExp) => roadMap(id).steps.filter((t: any) => t.lines.some((l: any) => re.test(l.text))).map((t: any) => t.n);
    expect(shown('pain_threshold', /elemental resistance/)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(roadMap('pain_threshold').steps[5].lines.some((l: any) => /elemental resistance \(max\)$/.test(l.text))).toBe(true);
    const pool = ladderCaps('durability', null), j = Number(Object.keys(pool)[0]);
    expect(shown('durability', /Guard plate held/)).toEqual(Array.from({ length: pool[j] }, (_, i) => i + 1));
    const hw = ladderCaps('faith', null), h = Number(Object.keys(hw)[0]);
    expect(shown('faith', /^Hymns return/)).toEqual(Array.from({ length: hw[h] }, (_, i) => i + 1));
    // a character with a higher Virtue reaches the floor sooner: the page reads the character
    expect(roadMap('faith', { skills: {}, attrs: { virtue: 10 }, perks: [], traits: [] } as any).steps.filter((t: any) => t.lines.some((l: any) => /^Hymns return/.test(l.text))).length).toBeLessThan(hw[h]);
  });
  it('a named unlock shows its name; what it does is in its hover (the card of its name), never on the face twice', () => {
    for (const s of D.skills as any[]) for (const t of roadMap(s.id).steps) for (const l of t.lines) {
      if (l.tip) { expect(l.tip.length, s.id + ' ' + t.n).toBeGreaterThan(l.text.length); }
      if (l.kind === 'unlock' && l.tip) expect(l.tip.startsWith(l.text + ': '), s.id + ' ' + t.n).toBe(true);
    }
  });
});

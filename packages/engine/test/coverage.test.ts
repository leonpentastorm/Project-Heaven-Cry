// Coverage (plan 2.1): every effect of every perk (each tier), trait and class move is run by a generic op, by a
// lane's registered handler, by its item's action, or is explicitly Narrator-ruled. What is left is a gap: the
// Narrator gets the item's text, but the engine runs nothing. This file lists the gaps.
//
// - The ratchet test fails if gaps ever grow past the baseline (lanes only ever shrink it).
// - The strict test fails while any gap is left, listing them all (it runs in every suite since the lanes finished; it was opt-in by PHC_COVERAGE_STRICT).
import { describe, expect, it } from 'vitest';
import { coverageGaps, coverageReport, coverageSummary, allItems } from '../src';

/** Gaps when the runtime landed (lane 0A): 369; 373 after lane 0B's perk_type fixes. Every lane and the hooks-gap pass
 * have closed theirs: the baseline is 0, so a new item or effect nobody runs fails this test. */
const BASELINE = 0;

const listGaps = () => {
  const by: Record<string, string[]> = {};
  for (const r of coverageGaps()) (by[r.key + (r.tier && !['trait', 'mastered', 'achieved', 'ultimate', 'adv'].includes(r.tier) ? ' (' + r.tier + ')' : '')] ||= []).push('#' + r.index + ' ' + r.op);
  return Object.entries(by).map(([k, v]) => k + ': ' + v.join(', ')).join('\n');
};

describe('coverage of perks, traits and class moves', () => {
  it('every item and every effect is classified', () => {
    const items = allItems();
    expect(items.filter((i) => i.kind === 'perk').length).toBeGreaterThanOrEqual(106);
    expect(items.filter((i) => i.kind === 'trait').length).toBe(74);
    expect(items.filter((i) => i.kind === 'class').length).toBeGreaterThanOrEqual(100);
    const rows = coverageReport();
    expect(rows.every((r) => r.owner)).toBe(true);
  });
  it('gaps never grow (ratchet)', () => {
    const n = coverageGaps().length;
    if (n > BASELINE) throw new Error(n + ' gaps (baseline ' + BASELINE + '):\n' + listGaps());
    expect(n).toBeLessThanOrEqual(BASELINE);
    expect(coverageSummary().effects).toBeGreaterThan(600);
  });
  it('no gaps: every effect is engine-run or explicitly Narrator-ruled (the lanes finished; it was opt-in by PHC_COVERAGE_STRICT)', () => {
    const gaps = coverageGaps();
    if (gaps.length) throw new Error(gaps.length + ' effects nobody runs yet:\n' + listGaps());
  });
});

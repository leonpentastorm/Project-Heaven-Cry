// @vitest-environment jsdom
// The art preloader's plan (game/preload.ts; title-screen.md section 8): the title's own art first, the rest in the order
// a player meets it, small sizes before zoom sizes, and the same files the old loading screen fetched.
import { describe, expect, it } from 'vitest';
import ASSETS from './assets.json';
import { preloadPlan, MEET_ORDER } from './preload';
import { TITLE_ART } from '../title/Title';

const A = ASSETS as Record<string, string>;
const plan = preloadPlan(A, TITLE_ART());
const big = (k: string) => k.endsWith('-lg') || k.endsWith('-xl');

describe('preloadPlan', () => {
  it('fetches the title\'s own art first, and only what is in the build', () => {
    expect(plan.first.length).toBeGreaterThan(0);
    expect(plan.first.every((k) => k in A && (k.startsWith('title-') || k.startsWith('wick-')))).toBe(true);
    expect(plan.first.some((k) => k.startsWith('title-'))).toBe(true);
  });
  it('fetches the same set as before: every asset but the painted gear\'s zoom sizes, each once', () => {
    const all = [...plan.first, ...plan.rest];
    const old = Object.keys(A).filter((k) => !(k.startsWith('gear-') && k.endsWith('-lg')));
    expect(new Set(all).size).toBe(all.length);
    expect([...all].sort()).toEqual([...old].sort());
  });
  it('puts every small size before any zoom size, and the small ones in the order a player meets them', () => {
    const firstBig = plan.rest.findIndex(big);
    expect(plan.rest.slice(firstBig).every(big)).toBe(true);
    const rank = (k: string) => { const i = MEET_ORDER.findIndex((g) => g.some((p) => k.startsWith(p))); return i < 0 ? MEET_ORDER.length : i; };
    const ranks = plan.rest.slice(0, firstBig).map(rank);
    expect(ranks.every((r, i) => i === 0 || r >= ranks[i - 1])).toBe(true);
  });
});

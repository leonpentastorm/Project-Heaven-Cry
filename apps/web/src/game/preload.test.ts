// @vitest-environment jsdom
// The preloader's plan (game/preload.ts; title-screen.md section 8; the roadmap's "Preloader: wait for load, only the
// next screen's art"): the title's own art first; after that only the art of the screens a player can reach next, small
// sizes, each file once.
import { describe, expect, it } from 'vitest';
import ASSETS from './assets.json';
import { nextArt, titlePlan, NEXT, SCREEN_ART } from './preload';
import { TITLE_ART } from '../title/Title';
import type { Screen } from './store';

const A = ASSETS as Record<string, string>;
const big = (k: string) => k.endsWith('-lg') || k.endsWith('-xl');
const SCREENS = Object.keys(NEXT) as Screen[];

describe('the preloader', () => {
  it('fetches the title\'s own art first, and only what is in the build', () => {
    const first = titlePlan(A, TITLE_ART());
    expect(first.length).toBeGreaterThan(0);
    expect(first.every((k) => k in A && (k.startsWith('title-') || k.startsWith('wick-')))).toBe(true);
    expect(first.some((k) => k.startsWith('title-'))).toBe(true);
  });
  it('after the title, warms only the next screens\' art: the lobby\'s and creation\'s, never a fight\'s', () => {
    const home = nextArt(A, 'home');
    expect(home.length).toBeGreaterThan(0);
    expect(home.some((k) => k.startsWith('emblem-'))).toBe(true); // the lobby
    expect(home.some((k) => k.startsWith('skill-'))).toBe(true); // creation
    expect(home.some((k) => k.startsWith('kit-') || k.startsWith('survival-backdrop'))).toBe(false); // a fight's kit, the path map
    expect(home.length).toBeLessThan(Object.keys(A).length / 4);
  });
  it('from the play screen, warms the fight\'s kit', () => {
    expect(nextArt(A, 'main').some((k) => k.startsWith('kit-'))).toBe(true);
  });
  it('warms small sizes only, each file once, and skips what was warmed already', () => {
    for (const s of SCREENS) {
      const l = nextArt(A, s);
      expect(l.some(big)).toBe(false);
      expect(new Set(l).size).toBe(l.length);
      expect(nextArt(A, s, new Set(l))).toEqual([]);
    }
  });
  it('names screens that exist, and every screen has its next ones', () => {
    for (const s of SCREENS) { expect(SCREEN_ART[s]).toBeDefined(); for (const n of NEXT[s]) expect(SCREENS).toContain(n); }
  });
});

// @vitest-environment jsdom
// A page left open across a release (0.33 review): once the page has loaded, the preloader warms every screen's code
// chunk and the Proving Ground's, not only the next screens', so changing screen later never asks for a file the new
// release no longer serves.
import { describe, expect, it, vi } from 'vitest';

const asked: string[] = [];
vi.mock('../screenLoad', () => ({
  CHUNK_SCREENS: ['create', 'room', 'main', 'combat', 'levelup', 'ultimate'],
  loadScreen: (s: string) => { asked.push(s); return Promise.resolve(null); },
  loadSandbox: () => { asked.push('sandbox'); return Promise.resolve(null); },
  ROOM_LAYER: { load: () => Promise.resolve(null) },
}));
vi.mock('./store', () => ({ loadEngine: () => Promise.resolve(null) }));

describe('the preloader and a later release', () => {
  it('warms the next screens\' chunks first, then every chunk once, a few seconds after the load event', async () => {
    vi.useFakeTimers();
    const { startPreload, warmNext } = await import('./preload');
    startPreload([]); await vi.advanceTimersByTimeAsync(0);
    warmNext('main');
    expect(asked).toContain('combat'); expect(asked).not.toContain('ultimate'); // the next screens only, at first
    await vi.advanceTimersByTimeAsync(5000);
    for (const s of ['create', 'room', 'main', 'combat', 'levelup', 'ultimate', 'sandbox']) expect(asked).toContain(s);
    const creates = asked.filter((s) => s === 'create').length;
    warmNext('combat'); await vi.advanceTimersByTimeAsync(5000);
    expect(asked.filter((s) => s === 'create').length).toBe(creates); // the whole set is warmed once a page, not on every screen
    vi.useRealTimers();
  });
});

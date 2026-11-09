// @vitest-environment jsdom
// The title theme (titleMusic.ts): leaving the title fades it out; coming back inside the fade brings it back up
// (review fix: the early return for "already playing" left it fading to silence and never ramped it back).
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

class FakeAudio {
  paused = true; volume = 1; loop = false; preload = ''; src: string;
  constructor(src: string) { this.src = src; }
  play() { this.paused = false; return Promise.resolve(); }
  pause() { this.paused = true; }
}
let now = 0, frames: Array<(t: number) => void> = [];
const runFrames = (ms: number) => { const end = now + ms; while (now < end) { now += 16; const f = frames; frames = []; for (const cb of f) cb(now); } };

describe('the title theme', () => {
  beforeEach(() => {
    vi.resetModules(); now = 0; frames = [];
    vi.stubGlobal('Audio', FakeAudio as any);
    vi.stubGlobal('requestAnimationFrame', (cb: (t: number) => void) => { frames.push(cb); return frames.length; });
    vi.stubGlobal('cancelAnimationFrame', () => { frames = []; });
    vi.spyOn(performance, 'now').mockImplementation(() => now);
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it('re-entering the title during its fade-out cancels the fade and brings it back up', async () => {
    const m = await import('./titleMusic'), el = () => (window as any).__phcTitleAudio() as FakeAudio;
    m.playTitleMusic(); await Promise.resolve(); await Promise.resolve();
    runFrames(2100); const full = el().volume; expect(full).toBeGreaterThan(0); expect(el().paused).toBe(false);
    m.stopTitleMusic(1200); runFrames(500); expect(el().volume).toBeLessThan(full);
    // back on the title inside the fade
    m.playTitleMusic(); runFrames(1500);
    expect(el().paused).toBe(false); expect(el().volume).toBeCloseTo(full, 2);
    // and a plain leave still pauses it
    m.stopTitleMusic(1200); runFrames(1300); expect(el().paused).toBe(true);
  });
  it('stopped before the browser allowed it: it does not start silently in the background', async () => {
    const m = await import('./titleMusic'), el = () => (window as any).__phcTitleAudio() as FakeAudio;
    m.playTitleMusic(); m.stopTitleMusic(); await Promise.resolve(); await Promise.resolve();
    expect(el().paused).toBe(true);
  });
});

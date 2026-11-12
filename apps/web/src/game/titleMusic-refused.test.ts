// @vitest-environment jsdom
// The title theme where the browser refuses sound before a gesture (titleMusic.ts; Title.tsx calls playTitleMusic on
// load and again on the first click, key or tap). The refusal itself cannot be made in the browser suites' headless
// Chromium (it counts every page as already used by its user), so the rule is pinned here: a refused start leaves the
// theme silent and throws nothing, and the next call starts it. The wiring to the first key is apps/web/e2e/pg-art.mjs.
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

let allowed = false, plays = 0;
class RefusingAudio {
  paused = true; volume = 1; loop = false; preload = ''; src: string;
  constructor(src: string) { this.src = src; }
  play() { plays++; if (!allowed) return Promise.reject(Object.assign(new Error('play() failed because the user didn\'t interact with the document first.'), { name: 'NotAllowedError' })); this.paused = false; return Promise.resolve(); }
  pause() { this.paused = true; }
}
let now = 0, frames: Array<(t: number) => void> = [];
const runFrames = (ms: number) => { const end = now + ms; while (now < end) { now += 16; const f = frames; frames = []; for (const cb of f) cb(now); } };
const tick = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };

describe('the title theme in a browser that refuses sound before a gesture', () => {
  beforeEach(() => {
    vi.resetModules(); now = 0; frames = []; allowed = false; plays = 0;
    vi.stubGlobal('Audio', RefusingAudio as any);
    vi.stubGlobal('requestAnimationFrame', (cb: (t: number) => void) => { frames.push(cb); return frames.length; });
    vi.stubGlobal('cancelAnimationFrame', () => { frames = []; });
    vi.spyOn(performance, 'now').mockImplementation(() => now);
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it('refused on load: nothing plays, nothing is thrown, and no rejection is left unhandled', async () => {
    const unhandled = vi.fn(); process.on('unhandledRejection', unhandled);
    const m = await import('./titleMusic'), el = () => (window as any).__phcTitleAudio() as RefusingAudio;
    expect(() => m.playTitleMusic()).not.toThrow(); await tick(); runFrames(2500);
    expect(plays).toBe(1); expect(el().paused).toBe(true); expect(el().volume).toBe(0);
    await new Promise((r) => setTimeout(r, 0)); process.off('unhandledRejection', unhandled);
    expect(unhandled).not.toHaveBeenCalled();
  });
  it('the first key (the next call) starts it and brings it up to its volume; a call before that is refused again', async () => {
    const m = await import('./titleMusic'), el = () => (window as any).__phcTitleAudio() as RefusingAudio;
    m.playTitleMusic(); await tick();
    m.playTitleMusic(); await tick(); runFrames(2500); // still no gesture: asked again, refused again
    expect(plays).toBe(2); expect(el().paused).toBe(true);
    allowed = true; // the page has had its key
    m.playTitleMusic(); await tick(); runFrames(2500);
    expect(plays).toBe(3); expect(el().paused).toBe(false); expect(el().volume).toBeGreaterThan(0);
    // and it is one theme, not two: the same element all along
    const one = el(); m.playTitleMusic(); await tick(); expect(el()).toBe(one); expect(plays).toBe(3);
  });
});

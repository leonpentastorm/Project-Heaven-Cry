// @vitest-environment jsdom
// 0.33 lane C: a page that draws no frames shows every animation's end state (frames.ts), and an overlay over a column
// that is mostly off the screen takes the window (viewBox.ts): the five outside playtests of 0.32.0 ran in such a page
// (the sheet's tabs blank, a tab's panel empty, a chooser half in place) and in a stacked window (the reward bar off it).
import { describe, expect, it, vi } from 'vitest';
import { framesStalled, NO_FRAME_MS, NO_FRAMES_CSS, NO_FRAMES_CLASS, nextFrame } from './frames';
import { visibleBox } from './viewBox';
import { pinLogs } from './logPin';

describe('frames.ts: a page that draws no frames', () => {
  it('counts as stalled only after NO_FRAME_MS without a frame (a slow frame is not a stall)', () => {
    expect(framesStalled(1000, 0)).toBe(false);
    expect(framesStalled(NO_FRAME_MS - 1, 0)).toBe(false);
    expect(framesStalled(NO_FRAME_MS, 0)).toBe(true);
    expect(NO_FRAME_MS).toBeGreaterThanOrEqual(1500);
  });
  it('the class turns every animation and transition off (each element shows its end state)', () => {
    expect(NO_FRAMES_CSS).toContain('html.' + NO_FRAMES_CLASS + ' *');
    expect(NO_FRAMES_CSS).toMatch(/animation:none!important/);
    expect(NO_FRAMES_CSS).toMatch(/transition:none!important/);
  });
  it('nextFrame runs its step once, on a frame or on its timer when no frame comes', () => {
    vi.useFakeTimers();
    const raf = globalThis.requestAnimationFrame; (globalThis as any).requestAnimationFrame = () => 1; // a frame that never comes
    let n = 0; nextFrame(() => n++, 100);
    vi.advanceTimersByTime(99); expect(n).toBe(0);
    vi.advanceTimersByTime(2); expect(n).toBe(1);
    vi.advanceTimersByTime(500); expect(n).toBe(1);
    const cancel = nextFrame(() => n++, 100); cancel(); vi.advanceTimersByTime(200); expect(n).toBe(1);
    (globalThis as any).requestAnimationFrame = raf; vi.useRealTimers();
  });
});

describe('viewBox.ts: an overlay over a column', () => {
  it('covers the visible part of the column, clipped to the window', () => {
    Object.assign(window, { innerWidth: 1280, innerHeight: 720 });
    expect(visibleBox({ left: 340, top: 59, right: 980, bottom: 1400 })).toEqual({ left: 340, top: 59, width: 640, height: 661 });
  });
  it('takes the window when the column starts below the fold (a stacked window) or shows too little', () => {
    Object.assign(window, { innerWidth: 800, innerHeight: 720 });
    expect(visibleBox({ left: 0, top: 1275, right: 800, bottom: 2177 })).toEqual({ left: 0, top: 0, width: 800, height: 720 });
    expect(visibleBox({ left: 0, top: 600, right: 800, bottom: 2000 })).toEqual({ left: 0, top: 0, width: 800, height: 720 });
    expect(visibleBox(null)).toEqual({ left: 0, top: 0, width: 800, height: 720 });
  });
});

describe('logPin.ts: a log in the order it happened rests on its newest line', () => {
  it('scrolls a pinned box to its end when it is set up', () => {
    document.body.innerHTML = '<div data-log-pin="" style="height:50px;overflow:auto"><p>one</p><p>two</p></div>';
    const box = document.querySelector('[data-log-pin]') as HTMLElement;
    Object.defineProperty(box, 'scrollHeight', { value: 400, configurable: true });
    pinLogs(document);
    expect(box.scrollTop).toBe(400);
  });
});

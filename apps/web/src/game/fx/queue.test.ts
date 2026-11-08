// @vitest-environment jsdom
// The effects queue (fx/play.ts planQueue): a backlog plays at most a little faster, then skips its oldest effects, and
// a decided fight plays only its last few ("the battle keeps going in super speed after you've died").
import { describe, expect, it } from 'vitest';
import { planQueue, MAX_SPEEDUP, queueFx, clearFx, turnsBusyUntil, TURNS_HOLD_MAX } from './play';

describe('the effects queue', () => {
  it('a short batch plays as it is', () => expect(planQueue([300, 300, 300], 7000)).toEqual({ from: 0, speed: 1 }));
  it('a long backlog speeds up at most a little, and skips its oldest effects past that', () => {
    const beats = Array(40).fill(500); // 20 s of enemy moves
    const p = planQueue(beats, 7000);
    expect(p.speed).toBeGreaterThanOrEqual(1 / MAX_SPEEDUP - 1e-9);
    expect(p.from).toBeGreaterThan(0);
    expect(beats.slice(p.from).reduce((a, b) => a + b, 0) * p.speed).toBeLessThanOrEqual(7000 + 1e-6);
    expect(beats.length - p.from).toBeGreaterThanOrEqual(15); // the newest effects still play
  });
  it('a slightly long batch only speeds up, skipping nothing', () => expect(planQueue([2000, 2000, 2000, 2000], 7000)).toEqual({ from: 0, speed: 7000 / 8000 }));
  it('a decided fight keeps only its last few, at normal speed', () => expect(planQueue(Array(30).fill(400), 7000, 6)).toEqual({ from: 24, speed: 1 }));
  it('never skips the last effect, however long it is', () => expect(planQueue([500, 20000], 1500).from).toBe(1));
  it('other units\' turns hold your input until the last of them has played, never longer than the cap', () => {
    clearFx(); const now = performance.now();
    expect(turnsBusyUntil()).toBeLessThanOrEqual(now + 1);
    queueFx([{ n: 1, k: 'turn', unit: 'f1', side: 'foe', at: '1,1' }, { n: 2, k: 'move', unit: 'f1', path: ['1,1', '2,1', '3,1'] }, { n: 3, k: 'turn', unit: 'p1', side: 'pc', at: '5,5' }] as any, 'cb|t');
    const hold = turnsBusyUntil() - now; expect(hold).toBeGreaterThan(100); expect(hold).toBeLessThanOrEqual(TURNS_HOLD_MAX);
    clearFx(); expect(turnsBusyUntil()).toBeLessThanOrEqual(performance.now() + 1);
    queueFx([{ n: 4, k: 'shot', unit: 'p1', at: '5,5' }] as any, 'cb|t'); // your own shot holds nothing
    expect(turnsBusyUntil()).toBeLessThanOrEqual(performance.now() + 1);
    clearFx();
  });
});

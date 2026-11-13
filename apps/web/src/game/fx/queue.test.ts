// @vitest-environment jsdom
// The effects queue (fx/play.ts planQueue): a backlog plays at most a little faster, then skips its oldest effects, and
// a decided fight plays only its last few ("the battle keeps going in super speed after you've died").
import { describe, expect, it, vi } from 'vitest';
import { planQueue, MAX_SPEEDUP, queueFx, clearFx, turnsBusyUntil, TURNS_HOLD_MAX, FX_EVENT, feltAfterAttack } from './play';
import { faithBeat } from './faith';

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

describe('a fight plays every effect, in order, at full length (Leon, 11 Nov 2026)', () => {
  it('a long enemy phase: 40 hits and three turn banners all play, none early, none skipped; outside a fight a backlog still catches up', () => {
    const run = (stream: string) => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance', 'Date'] });
      clearFx(); const t0 = performance.now(), at = new Map<number, number>();
      const on = (ev: Event) => { const d = (ev as CustomEvent).detail; if (d?.n) at.set(d.n, performance.now() - t0); };
      window.addEventListener(FX_EVENT, on);
      const evs: any[] = []; let n = 0;
      for (const who of ['f1', 'f2', 'f3']) { evs.push({ n: ++n, k: 'turn', unit: who, side: 'foe', at: '1,1' }); for (let i = 0; i < 13; i++) evs.push({ n: ++n, k: 'hurt', target: 'p1', at: '4,5', dmg: 5 }); }
      evs.push({ n: ++n, k: 'turn', unit: 'p1', side: 'pc', at: '4,5' });
      try { queueFx(evs, stream); vi.advanceTimersByTime(120000); } finally { window.removeEventListener(FX_EVENT, on); clearFx(); vi.useRealTimers(); }
      return { at, n };
    };
    const fight = run('cb|long');
    expect(fight.at.size).toBe(fight.n); // every one played
    const times = [...fight.at.entries()].sort((a, b) => a[0] - b[0]).map((x) => x[1]);
    for (let i = 1; i < times.length; i++) expect(times[i]).toBeGreaterThanOrEqual(times[i - 1]); // in order
    expect(times[times.length - 1]).toBeGreaterThan(7000); // the player's turn banner waits for all of it (the old room was 7 s)
    expect(run('st|long').at.size).toBeLessThan(fight.n); // the area map's stream still skips a backlog
  });
});

describe('a Miracle in the queue (Faith 2.2, Leon: "zoom to the map, then the miracle happens")', () => {
  /** Queue a batch with fake clocks; return when (ms after queueing) each event played, by its n, and which never did. */
  function run(evs: any[], opts: { keep?: number } = {}) {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance', 'Date'] });
    clearFx(); const t0 = performance.now(), at = new Map<number, number>();
    const on = (ev: Event) => { const d = (ev as CustomEvent).detail; if (d?.n) at.set(d.n, performance.now() - t0); };
    window.addEventListener(FX_EVENT, on);
    try { queueFx(evs, 'cb|t', opts); vi.advanceTimersByTime(60000); } finally { window.removeEventListener(FX_EVENT, on); clearFx(); vi.useRealTimers(); }
    return at;
  }
  const miracle = (n: number) => ({ n, k: 'miracle', patron: 'nerukhan', id: 'judgement', at: '3,5', unit: 'u', char: 'c', name: 'Judgement', text: 'x', line: 'CHILD.', summary: 'y' });
  const hurts = (from: number, count: number) => Array.from({ length: count }, (_, i) => ({ n: from + i, k: 'hurt', target: 'f' + i, at: '4,5', dmg: 170, killed: true }));
  it('a Miracle followed by 20 hits: none plays before the cut-in lands; the Miracle itself plays at once', () => {
    const land = faithBeat({ k: 'miracle' } as any)!;
    const at = run([miracle(1), ...hurts(2, 20)]);
    expect(at.get(1)).toBe(0);
    for (let n = 2; n <= 21; n++) if (at.has(n)) expect(at.get(n)!, 'hit ' + n).toBeGreaterThanOrEqual(land);
    expect(at.has(21)).toBe(true); // the last of its effects always plays
  });
  it('a long backlog before the Miracle: it still plays (after what came before), and its effects still wait for it', () => {
    const land = faithBeat({ k: 'miracle' } as any)!;
    const at = run([...hurts(1, 40), miracle(100), ...hurts(101, 12)]);
    const m = at.get(100)!; expect(m).toBeGreaterThanOrEqual(0);
    for (const [n, t] of at) if (n < 100) expect(t).toBeLessThanOrEqual(m); else if (n > 100) expect(t, 'hit ' + n).toBeGreaterThanOrEqual(m + land);
    expect([...at.keys()].filter((n) => n > 100).length).toBe(12); // a dozen hits fit in the room after the landing: none skipped
  });
  it('a decided fight (keep): what came before is skipped, the Miracle and its effects play, the effects after the landing', () => {
    const land = faithBeat({ k: 'miracle' } as any)!;
    const at = run([...hurts(1, 10), miracle(50), ...hurts(51, 8)], { keep: 6 });
    expect([...at.keys()].some((n) => n < 50)).toBe(false); expect(at.get(50)).toBe(0);
    expect([...at.keys()].filter((n) => n > 50).length).toBe(8); // not trimmed to the last 6
    for (const [n, t] of at) if (n > 50) expect(t).toBeGreaterThanOrEqual(land);
  });
});

// A feeling felt for the first time inside an attack (fx-sweep, Classes 3.0 close: a Burst's or a Suppress's rattle heard
// a second before its first muzzle flash, because the unlock card's beat sat between the volley and its rolls).
describe('a feeling\'s unlock card inside an attack', () => {
  const ks = (evs: any[]) => evs.map((e) => e.k + (e.k === 'felt' ? '' : ':' + e.n)).join(' ');
  it('is shown after the attack (its rounds and their wounds), never between the rattle and the first round', () => {
    const burst = [{ n: 16, k: 'volley', unit: 'p1' }, { n: 17, k: 'felt', feeling: 'thrill' }, { n: 18, k: 'shot', unit: 'p1' }, { n: 19, k: 'shot', unit: 'p1' }, { n: 20, k: 'hurt', unit: 'f1' }, { n: 21, k: 'spotlight' }] as any[];
    expect(ks(feltAfterAttack(burst))).toBe('volley:16 shot:18 shot:19 hurt:20 felt spotlight:21');
    const suppress = [{ n: 23, k: 'technique', id: 'suppress' }, { n: 24, k: 'volley' }, { n: 25, k: 'felt' }, { n: 26, k: 'shot' }] as any[];
    expect(ks(feltAfterAttack(suppress))).toBe('technique:23 volley:24 shot:26 felt');
    const two = [{ n: 1, k: 'volley' }, { n: 2, k: 'felt', feeling: 'a' }, { n: 3, k: 'felt', feeling: 'b' }, { n: 4, k: 'shot' }, { n: 5, k: 'move' }] as any[];
    expect(feltAfterAttack(two).map((e: any) => e.feeling || e.k)).toEqual(['volley', 'shot', 'a', 'b', 'move']);
  });
  it('anywhere else stays where the engine logged it', () => {
    const own = [{ n: 1, k: 'shot' }, { n: 2, k: 'hurt' }, { n: 3, k: 'felt' }, { n: 4, k: 'move' }] as any[];
    expect(feltAfterAttack(own)).toEqual(own);
    const lone = [{ n: 1, k: 'volley' }, { n: 2, k: 'felt' }, { n: 3, k: 'move' }] as any[];
    expect(feltAfterAttack(lone)).toEqual(lone);
  });
});

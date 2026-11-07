// The game's own fight music player (ost.ts): seamless loop passes and crossfades between tracks, on a fake Web Audio.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OST_FILES, seamAt, ostPlay, ostNow, ostVolume, _ostReset } from './ost';

type Call = [string, ...any[]];
class Param { value = 1; calls: Call[] = []; setValueAtTime(v: number, t: number) { this.calls.push(['set', v, t]); this.value = v; } linearRampToValueAtTime(v: number, t: number) { this.calls.push(['ramp', v, t]); } setValueCurveAtTime(c: Float32Array, t: number, d: number) { this.calls.push(['curve', c[0] < 0.5 ? 'in' : 'out', t, d]); } cancelScheduledValues(t: number) { this.calls.push(['cancel', t]); } }
class Node { connected: any[] = []; connect(x: any) { this.connected.push(x); } disconnect() { this.connected = []; } }
class Gain extends Node { gain = new Param(); }
class Src extends Node { buffer: any = null; starts: [number, number][] = []; stops: number[] = []; onended: null | (() => void) = null; start(w: number, o: number) { this.starts.push([w, o]); } stop(t?: number) { this.stops.push(t ?? -1); } }
let made: { gains: Gain[]; srcs: Src[] };
class FakeCtx { currentTime = 10; state = 'running'; destination = new Node(); createGain() { const g = new Gain(); made.gains.push(g); return g; } createBufferSource() { const s = new Src(); made.srcs.push(s); return s; }
  decodeAudioData(_b: ArrayBuffer, res: (b: any) => void) { res({ duration: 100 }); } resume() { this.state = 'running'; return Promise.resolve(); } suspend() { this.state = 'suspended'; return Promise.resolve(); } }
const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  _ostReset(); made = { gains: [], srcs: [] };
  (globalThis as any).AudioContext = FakeCtx;
  (globalThis as any).fetch = vi.fn(async () => ({ ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(8) }));
});
afterEach(() => { delete (globalThis as any).AudioContext; _ostReset(); });

describe('the fight music loop', () => {
  it('a pass hands over at its loop out, less the seam', () => {
    const f = OST_FILES.gunline;
    expect(seamAt('gunline', 10, 0)).toBeCloseTo(10 + f.loopOut - f.seam);
    expect(seamAt('gunline', 100, f.loopIn)).toBeCloseTo(100 + f.loopOut - f.loopIn - f.seam);
    for (const [id, x] of Object.entries(OST_FILES)) { expect(x.loopOut - x.loopIn).toBeGreaterThan(x.seam * 4); expect(x.src).toMatch(/^\/music\/[a-z-]+\.mp3$/); void id; }
  });
  it('plays from the top, schedules the next pass from loop in with an equal-power seam, and keeps one pass ahead', async () => {
    ostPlay('gunline'); await flush(); await flush();
    expect(ostNow()).toBe('gunline');
    const f = OST_FILES.gunline, [a, b] = made.srcs;
    expect(made.srcs.length).toBe(2);
    expect(a.starts[0]).toEqual([10.05, 0]);
    const seam1 = 10.05 + f.loopOut - f.seam;
    expect(b.starts[0][0]).toBeCloseTo(seam1); expect(b.starts[0][1]).toBe(f.loopIn);
    expect(a.stops[0]).toBeCloseTo(seam1 + f.seam + 0.05);
    // The first pass ends: the third is scheduled at the second's seam.
    a.onended!();
    expect(made.srcs.length).toBe(3);
    expect(made.srcs[2].starts[0][0]).toBeCloseTo(seam1 + f.loopOut - f.loopIn - f.seam);
    // The pass gains: the second fades in over the seam while the first fades out.
    const passGains = made.gains.filter((g) => g.gain.calls.some((c) => c[0] === 'curve'));
    expect(passGains[0].gain.calls).toContainEqual(['curve', 'out', expect.closeTo(seam1, 5), f.seam]);
    expect(passGains[1].gain.calls).toContainEqual(['curve', 'in', expect.closeTo(seam1, 5), f.seam]);
  });
  it('a new track crossfades from the old one; the same track again changes nothing; null fades out', async () => {
    ostPlay('gunline'); await flush(); await flush();
    const n = made.srcs.length;
    ostPlay('gunline'); await flush();
    expect(made.srcs.length).toBe(n);
    ostPlay('heaven_falls', 1200); await flush(); await flush();
    expect(ostNow()).toBe('heaven_falls');
    // Track gains are the ones connected to the master: the old ramps to 0 over 1.2 s, the new up to 1.
    const master = made.gains[0], tracks = made.gains.filter((g) => g.connected.includes(master));
    expect(tracks[0].gain.calls).toContainEqual(['ramp', 0, expect.closeTo(11.2, 5)]);
    expect(tracks[1].gain.calls).toContainEqual(['ramp', 1, expect.closeTo(11.25, 5)]);
    ostPlay(null); expect(ostNow()).toBeNull();
    expect(tracks[1].gain.calls.filter((c) => c[0] === 'ramp').pop()).toEqual(['ramp', 0, expect.closeTo(11.2, 5)]);
  });
  it('a quick hand back revives the track still fading, instead of starting it over', async () => {
    ostPlay('heaven_falls'); await flush(); await flush();
    const n = made.srcs.length;
    ostPlay('last_rounds'); await flush(); await flush();
    const after = made.srcs.length;
    ostPlay('heaven_falls'); await flush(); await flush();
    expect(ostNow()).toBe('heaven_falls');
    expect(made.srcs.length).toBe(after); // no new Heaven Falls passes
    expect(after).toBeGreaterThan(n);
  });
  it('the volume eases the master gain', () => {
    ostPlay('gunline'); ostVolume(0.42, 250);
    expect(made.gains[0].gain.calls).toContainEqual(['ramp', 0.42, expect.closeTo(10.25, 5)]);
  });
});

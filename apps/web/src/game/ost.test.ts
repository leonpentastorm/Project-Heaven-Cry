// The game's own fight music player (ost.ts): seamless loop passes and crossfades between tracks, on a fake Web Audio.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { OST, FIGHT_POOL, type OstId } from '@engine';
import { OST_FILES, seamAt, ostPlay, ostNow, ostVolume, _ostReset } from './ost';
import { CREDITS } from './credits';

type Call = [string, ...any[]];
class Param { value = 1; calls: Call[] = []; setValueAtTime(v: number, t: number) { this.calls.push(['set', v, t]); this.value = v; } linearRampToValueAtTime(v: number, t: number) { this.calls.push(['ramp', v, t]); } setValueCurveAtTime(c: Float32Array, t: number, d: number) { this.calls.push(['curve', c[0] < 0.5 ? 'in' : 'out', t, d]); } cancelScheduledValues(t: number) { this.calls.push(['cancel', t]); } }
class Node { connected: any[] = []; connect(x: any) { this.connected.push(x); } disconnect() { this.connected = []; } }
class Gain extends Node { gain = new Param(); }
class Src extends Node { buffer: any = null; starts: [number, number][] = []; stops: number[] = []; onended: null | (() => void) = null; start(w: number, o: number) { this.starts.push([w, o]); } stop(t?: number) { this.stops.push(t ?? -1); } }
let made: { gains: Gain[]; srcs: Src[]; decodes: number };
class FakeCtx { currentTime = 10; state = 'running'; destination = new Node(); createGain() { const g = new Gain(); made.gains.push(g); return g; } createBufferSource() { const s = new Src(); made.srcs.push(s); return s; }
  decodeAudioData(_b: ArrayBuffer, res: (b: any) => void) { made.decodes++; res({ duration: 100 }); } resume() { this.state = 'running'; return Promise.resolve(); } suspend() { this.state = 'suspended'; return Promise.resolve(); } }
const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  _ostReset(); made = { gains: [], srcs: [], decodes: 0 };
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
  it('Gearing Up stays decoded through a Proving Ground fight, whatever takes over in it; other tracks keep to two', async () => {
    ostPlay('gearing_up'); await flush(); await flush();
    ostPlay('flank_left', 0); await flush(); await flush();
    ostPlay('last_rounds', 0); await flush(); await flush();
    ostPlay('heaven_falls', 0); await flush(); await flush();
    expect(made.decodes).toBe(4);
    await new Promise((r) => setTimeout(r, 200)); // Gearing Up's voice is long gone: coming back is a new voice, not a revive
    const before = made.srcs.length;
    ostPlay('gearing_up'); await flush(); await flush(); // the fight's end: no second decode of the 3-minute file
    expect(made.decodes).toBe(4); expect(made.srcs.length).toBeGreaterThan(before);
    // Outside the Proving Ground (the music stopped in between) nothing is held: the oldest of three goes.
    ostPlay(null, 0); await new Promise((r) => setTimeout(r, 200)); // faded out and gone (no revive)
    ostPlay('gunline'); await flush(); await flush();
    ostPlay('mag_check'); await flush(); await flush();
    ostPlay('danger_close'); await flush(); await flush();
    const n = made.decodes;
    expect(n).toBe(7);
    ostPlay('gearing_up'); await flush(); await flush();
    expect(made.decodes).toBe(n + 1);
  });
  it('the volume eases the master gain', () => {
    ostPlay('gunline'); ostVolume(0.42, 250);
    expect(made.gains[0].gain.calls).toContainEqual(['ramp', 0.42, expect.closeTo(10.25, 5)]);
  });
});

/** An MP3's length in seconds, by walking its frames (MPEG-1 or 2, Layer III; any ID3v2 tag at the head is skipped). */
function mp3Seconds(file: string): number {
  const b = readFileSync(file);
  let i = 0, samples = 0, rate = 0;
  if (b.toString('latin1', 0, 3) === 'ID3') i = 10 + ((b[6] & 0x7f) << 21 | (b[7] & 0x7f) << 14 | (b[8] & 0x7f) << 7 | (b[9] & 0x7f));
  const BR1 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320], BR2 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];
  while (i + 4 <= b.length) {
    if (b[i] !== 0xff || (b[i + 1] & 0xe0) !== 0xe0) { i++; continue; }
    const ver = (b[i + 1] >> 3) & 3, layer = (b[i + 1] >> 1) & 3, br = (b[i + 2] >> 4) & 15, sr = (b[i + 2] >> 2) & 3, pad = (b[i + 2] >> 1) & 1;
    if (ver === 1 || layer !== 1 || br === 0 || br === 15 || sr === 3) { i++; continue; }
    const v1 = ver === 3, hz = [44100, 48000, 32000][sr] / (v1 ? 1 : ver === 2 ? 2 : 4), kbps = (v1 ? BR1 : BR2)[br];
    const len = Math.floor((v1 ? 144 : 72) * kbps * 1000 / hz) + pad;
    rate = hz; samples += v1 ? 1152 : 576; i += len;
  }
  return rate ? samples / rate : 0;
}

describe('the game\'s tracks and their files', () => {
  const PUBLIC = resolve(__dirname, '../../public');
  const ids = Object.keys(OST) as OstId[];
  it('every track the engine can pick has a file and loop points, and nothing else has', () => {
    expect(Object.keys(OST_FILES).sort()).toEqual([...ids].sort());
    expect(ids.length).toBe(12);
    for (const id of [...FIGHT_POOL, 'heaven_falls', 'last_rounds', 'gearing_up'] as OstId[]) expect(OST_FILES[id], id).toBeTruthy();
    // One file a track: no two tracks play the same file.
    expect(new Set(ids.map((id) => OST_FILES[id].src)).size).toBe(ids.length);
  });
  it.each(ids)('%s: the web copy exists, its loop points lie inside it, and it carries no tags or cover art', (id) => {
    const f = OST_FILES[id], file = resolve(PUBLIC, f.src.slice(1));
    expect(f.src).toBe('/music/' + id.replace(/_/g, '-') + '.mp3');
    expect(existsSync(file), f.src).toBe(true);
    const secs = mp3Seconds(file);
    expect(secs).toBeGreaterThan(30);
    // The engine's length (for the credits and the clock) is the file's, to the second.
    expect(Math.abs(OST[id].length! - secs)).toBeLessThan(1.5);
    expect(f.loopIn).toBeGreaterThanOrEqual(0);
    expect(f.loopIn).toBeLessThan(1);
    expect(f.seam).toBeGreaterThanOrEqual(1); expect(f.seam).toBeLessThanOrEqual(2);
    // The loop out is inside the file, and near its end (within 8 s: nothing but the ending is left out).
    expect(f.loopOut).toBeLessThanOrEqual(secs);
    expect(secs - f.loopOut).toBeLessThan(8);
    expect(f.loopOut - f.loopIn).toBeGreaterThan(f.seam * 4);
    // Stream copies: no ID3 tag (so no cover art) at the head, and under 4 MiB (audio/README.md: over that, re-encode).
    const head = readFileSync(file).subarray(0, 3).toString('latin1');
    expect(head).not.toBe('ID3');
    expect(readFileSync(file).length).toBeLessThan(4 * 1024 * 1024);
  });
  it('no master carries the "(ingame)" book-keeping suffix in its tags (audio/README.md)', () => {
    const MASTERS = resolve(__dirname, '../../../../audio/music');
    for (const id of ids) {
      const file = resolve(MASTERS, OST_FILES[id].src.replace('/music/', '').replace('.mp3', '-original.mp3'));
      expect(existsSync(file), file).toBe(true);
      const b = readFileSync(file), tags = Buffer.concat([b.subarray(0, 4096), b.subarray(-256)]); // ID3v2 text frames, ID3v1
      expect(tags.toString('latin1'), id).not.toMatch(/ingame/i);
      expect(tags.toString('utf16le'), id).not.toMatch(/ingame/i);
      expect(tags.subarray(1).toString('utf16le'), id).not.toMatch(/ingame/i);
    }
  });
  it('the Credits page lists every one of the game\'s tracks by its title', () => {
    const music = CREDITS.find((g) => g.group === 'Music')!.items.map((c) => c.what);
    for (const id of ids) expect(music.some((w) => w.startsWith(OST[id].title + ' (')), OST[id].title).toBe(true);
    for (const w of music) expect(w).not.toMatch(/ingame/i);
  });
});

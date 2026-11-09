import { describe, it, expect } from 'vitest';
import { speechLikeness, speechCheck, fingerprint, SPEECH_MIN } from './voiceCheck';
import REF from './voiceReference.json';
import { Q8_READY_B64 } from './voiceCheck.fixture';

const q8 = (() => { const b = Buffer.from(Q8_READY_B64, 'base64'); const i = new Int16Array(b.buffer, b.byteOffset, b.byteLength / 2); return Float32Array.from(i, (x) => x / 32767); })();
// A seeded noise source, so the test is the same every run.
const rnd = (() => { let s = 7; return () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296) * 2 - 1; })();
const envelope = (a: Float32Array, w = 480) => { const e = new Float32Array(a.length); let acc = 0; for (let i = 0; i < a.length; i++) { acc += Math.abs(a[i]) - (i >= w ? Math.abs(a[i - w]) : 0); e[i] = acc / w; } return e; };
const smooth = (a: Float32Array, w: number) => { const o = new Float32Array(a.length); let acc = 0; for (let i = 0; i < a.length; i++) { acc += a[i] - (i >= w ? a[i - w] : 0); o[i] = acc / w; } return o; };

describe('the voice warm-up check: does it sound like speech? (Leon: muffled buzzing on RDNA 4)', () => {
  const env = envelope(q8);
  it('the reference is the fp32 model saying the check line', () => {
    expect((REF as any).text).toBe('Ready.'); expect((REF as any).voice).toBe('af_heart'); expect((REF as any).keep.length).toBeGreaterThan(20);
  });
  it('the real model (q8 on the CPU) passes', () => { expect(speechLikeness(q8)).toBeGreaterThan(SPEECH_MIN); });
  it('noise and buzz that follow the words fail', () => {
    const noise = Float32Array.from(q8, () => rnd());
    const muffled = smooth(noise, 40).map((x, i) => x * env[i] * 5);
    const buzz = Float32Array.from(q8, (_, i) => Math.sign(Math.sin((2 * Math.PI * 110 * i) / 24000)) * env[i] * 3);
    const muffledBuzz = smooth(buzz, 30);
    for (const [name, a] of [['muffled noise', muffled], ['buzz', buzz], ['muffled buzz', muffledBuzz], ['white noise', noise]] as const) expect(speechLikeness(a), name).toBeLessThan(SPEECH_MIN);
  });
  it('silence, a wrong sample rate and a different length fail', () => {
    expect(speechLikeness(new Float32Array(q8.length))).toBeLessThan(SPEECH_MIN);
    expect(speechLikeness(q8, 22050)).toBe(0);
    expect(speechLikeness(q8.slice(0, q8.length / 3))).toBe(0);
  });
  it('a fingerprint of the reference matches itself', () => {
    const fp = fingerprint(q8); expect(speechLikeness(q8, 24000, fp)).toBeCloseTo(1, 5);
  });
  it('a low score says why: the rate, the length or the shape', () => {
    expect(speechCheck(q8, 22050).why).toBe('rate');
    expect(speechCheck(new Float32Array(q8.length * 3)).why).toBe('length');
    expect(speechCheck(new Float32Array(q8.length * 3)).detail).toMatch(/^3\.\d× the expected length$/);
    expect(speechCheck(Float32Array.from(q8, () => rnd())).why).toBe('shape');
    expect(speechCheck(q8).why).toBe(null);
  });
});

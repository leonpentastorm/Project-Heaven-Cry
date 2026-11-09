// Does Kokoro's warm-up sound like speech? (Leon, 9 Nov 2026: on his RDNA 4 GPU Kokoro "plays", but as muffled buzzing.)
// The old check only caught silence and NaN samples; a GPU build whose numbers go wrong still makes loud, finite noise
// that follows the rhythm of the words. Kokoro is deterministic (no sampling), so the warm-up line "Ready." in the
// af_heart voice comes out nearly the same on every device: this compares its spectral shape, frame by frame, with a
// fingerprint made from the fp32 model on the CPU (voiceReference.json, made by tools/voice_reference.mjs).
// Calibration (9 Nov 2026): the real q8 model against the fp32 fingerprint scores 0.94-0.99 on this line; speech-shaped
// muffled noise and buzz score 0.38-0.84. SPEECH_MIN sits between them.
import REF from './voiceReference.json';

export const SPEECH_MIN = 0.88;
export const CHECK_TEXT = 'Ready.';
export const CHECK_VOICE = 'af_heart';
const SR = 24000, WIN = 600, HOP = 300, N = 1024, BANDS = 24;

/** Band edges on the 1024-point spectrum: 24 log-spaced bands from bin 3 to 511. */
const EDGES: number[] = (() => {
  const e: number[] = [];
  for (let i = 0; i <= BANDS; i++) e.push(Math.floor(3 * Math.pow(511 / 3, i / BANDS)));
  return [...new Set(e)];
})();
const HANN = Float64Array.from({ length: WIN }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (WIN - 1)));

/** In-place radix-2 FFT (re, im of length N). */
function fft(re: Float64Array, im: Float64Array) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const ar = re[i + k], ai = im[i + k], br = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci, bi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k] = ar + br; im[i + k] = ai + bi; re[i + k + len / 2] = ar - br; im[i + k + len / 2] = ai - bi;
        const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
      }
    }
  }
}

/** Log band energies per 25 ms frame (12.5 ms hop) of 24 kHz audio, and each frame's loudest band. */
export function bandFrames(a: ArrayLike<number>): { bands: number[][]; peak: number[] } {
  const bands: number[][] = [], peak: number[] = [];
  const re = new Float64Array(N), im = new Float64Array(N);
  for (let s = 0; s + WIN <= a.length; s += HOP) {
    re.fill(0); im.fill(0);
    for (let i = 0; i < WIN; i++) re[i] = (a[s + i] || 0) * HANN[i];
    fft(re, im);
    const row: number[] = [];
    for (let b = 0; b < EDGES.length - 1; b++) {
      let sum = 0; for (let k = EDGES[b]; k < EDGES[b + 1]; k++) sum += re[k] * re[k] + im[k] * im[k];
      row.push(Math.log10(sum / (EDGES[b + 1] - EDGES[b]) + 1e-12));
    }
    bands.push(row); peak.push(Math.max(...row));
  }
  return { bands, peak };
}

/** The fingerprint: the loud frames (within 30 dB of the loudest), each centred on its own mean (shape, not loudness). */
export function fingerprint(a: ArrayLike<number>): { frames: number; keep: number[]; shape: number[][] } {
  const { bands, peak } = bandFrames(a), top = Math.max(...peak);
  const keep = peak.map((p, i) => (p > top - 3 ? i : -1)).filter((i) => i >= 0);
  const shape = keep.map((i) => { const r = bands[i], m = r.reduce((x, y) => x + y, 0) / r.length; return r.map((x) => Math.round((x - m) * 100) / 100); });
  return { frames: bands.length, keep, shape };
}

/** How like the reference the audio is: the correlation of the loud frames' spectral shapes (1 = the same). */
export function speechLikeness(a: ArrayLike<number>, sampleRate = SR, ref: { frames: number; keep: number[]; shape: number[][] } = REF as any): number {
  if (sampleRate !== SR || !a.length) return 0;
  const { bands } = bandFrames(a);
  if (Math.abs(bands.length - ref.frames) > Math.max(4, ref.frames * 0.25)) return 0; // a different length: not this line
  const xs: number[] = [], ys: number[] = [];
  ref.keep.forEach((fi, j) => {
    const r = bands[fi]; if (!r) return;
    const m = r.reduce((x, y) => x + y, 0) / r.length;
    r.forEach((x, b) => { xs.push(x - m); ys.push(ref.shape[j][b]); });
  });
  if (xs.length < 24) return 0;
  const mx = xs.reduce((s, x) => s + x, 0) / xs.length, my = ys.reduce((s, y) => s + y, 0) / ys.length;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < xs.length; i++) { const dx = xs[i] - mx, dy = ys[i] - my; sxy += dx * dy; sxx += dx * dx; syy += dy * dy; }
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0;
}

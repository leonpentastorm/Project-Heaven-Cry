// The game's own music (spec: Music; the engine's musicFor / fightTheme picks the track): the nine songs of the
// ordinary fight's pool (Gunline and the rest), Heaven Falls, Last Rounds, and the Proving Ground's Gearing Up, played
// from the game's files through Web Audio. Each track loops seamlessly: a pass crossfades into
// the next one at its loop points (the files end on Suno's hard cut, so a plain loop would click). Changing track
// crossfades the two (about 1.2 s); stopping fades out. music.tsx drives it and sets the volume (Settings x panel x
// the Narrator's duck). The browser starts sound only after a click: ostResume() on the first gesture.
import type { OstId } from '@engine';

/** Each track's file and loop: a pass runs from loopIn to loopOut, the last `seam` seconds crossfading into the next. */
export const OST_FILES: Record<OstId, { src: string; loopIn: number; loopOut: number; seam: number }> = {
  // 0.4 s of silence at the head; the hit tail starts at 67.7 s.
  gunline: { src: '/music/gunline.mp3', loopIn: 0.4, loopOut: 67.7, seam: 1.2 },
  // The outro falls back to the intro's bell and drone; the cut is at 135.5 s.
  heaven_falls: { src: '/music/heaven-falls.mp3', loopIn: 0.1, loopOut: 135.5, seam: 1.5 },
  // Heartbeat and static at both ends.
  last_rounds: { src: '/music/last-rounds.mp3', loopIn: 0.1, loopOut: 81.0, seam: 1.2 },
  // The eight songs that joined the pool on 11 Nov 2026 (measured from the files: audio/README.md). Where the song has
  // a steady beat at both ends, the pass is a whole number of bars, so the beat carries across the seam.
  // 140 bpm; 124 beats a pass. The file's last bar and its ring-out (from 55.2 s) are left out.
  brass_on_the_floor: { src: '/music/brass-on-the-floor.mp3', loopIn: 0.05, loopOut: 54.24, seam: 1.2 },
  // The intro has no beat to keep: the pass runs to the cut (59.56 s).
  danger_close: { src: '/music/danger-close.mp3', loopIn: 0.05, loopOut: 59.5, seam: 1.2 },
  // 150 bpm; 148 beats a pass. The closing phrase's last bar (to the cut at 61.7 s) is left out.
  flank_left: { src: '/music/flank-left.mp3', loopIn: 0.1, loopOut: 60.5, seam: 1.2 },
  // 200 bpm; 192 beats a pass. The last hits and the tail (from 60.1 s) are left out.
  held_breath: { src: '/music/held-breath.mp3', loopIn: 0.1, loopOut: 58.89, seam: 1.2 },
  // No silence at the head; the tail starts at 60.1 s.
  hold_the_line: { src: '/music/hold-the-line.mp3', loopIn: 0, loopOut: 60.1, seam: 1.2 },
  // Ends on a breakdown and one last hit (66.9 to 68.4 s): the hit's tail fades into the quiet intro, which builds again.
  line_of_four: { src: '/music/line-of-four.mp3', loopIn: 0, loopOut: 69.2, seam: 1.2 },
  // 139.3 bpm; 136 beats a pass. The cut is at 61.0 s.
  mag_check: { src: '/music/mag-check.mp3', loopIn: 0.05, loopOut: 59.84, seam: 1.2 },
  // 145.8 bpm, on the beat. The cut is at 56.8 s (silence after it).
  suppressing_fire: { src: '/music/suppressing-fire.mp3', loopIn: 0, loopOut: 55.4, seam: 1.2 },
  // Gearing Up (the Proving Ground): the pass hands over on the second of the three closing hits (171.73 s), where the
  // intro's own first hit lands, and the file's fade-out (from 175 s) is never reached. A longer seam for a slower song.
  gearing_up: { src: '/music/gearing-up.mp3', loopIn: 0.1, loopOut: 173.68, seam: 2.0 },
};

/** When the pass that starts at `when` (audio clock) from `offset` (seconds into the file) hands over to the next. */
export function seamAt(id: OstId, when: number, offset: number): number {
  const f = OST_FILES[id];
  return when + Math.max(f.seam * 2, f.loopOut - offset) - f.seam;
}

const N = 64;
const curve = (f: (k: number) => number) => { const a = new Float32Array(N); for (let i = 0; i < N; i++) a[i] = f(i / (N - 1)); return a; };
/** Equal-power seam: the sum of the two stays level through the crossfade. */
const IN = curve((k) => Math.sin(k * Math.PI / 2)), OUT = curve((k) => Math.cos(k * Math.PI / 2));

interface Voice { id: OstId; gain: GainNode; srcs: Set<AudioBufferSourceNode>; dying: ReturnType<typeof setTimeout> | null; dead: boolean }
let ctx: AudioContext | null = null, master: GainNode | null = null, none = false;
let cur: Voice | null = null, level = 0;
const fading: Voice[] = [];
const bytes = new Map<OstId, Promise<ArrayBuffer>>();
/** Decoded tracks, most recent last; at most two kept (a decoded track is 25 to 50 MB; Gearing Up about 70). */
const decoded = new Map<OstId, Promise<AudioBuffer>>();

function audio(): AudioContext | null {
  if (!ctx && !none) {
    try {
      const AC = (globalThis as any).AudioContext || (globalThis as any).webkitAudioContext;
      if (!AC) { none = true; return null; }
      ctx = new AC() as AudioContext; master = ctx.createGain(); master.gain.value = level; master.connect(ctx.destination);
    } catch { none = true; ctx = null; }
  }
  return ctx;
}
const fetchBytes = (id: OstId) => {
  let p = bytes.get(id);
  if (!p) { p = fetch(OST_FILES[id].src).then((r) => { if (!r.ok) throw new Error('OST ' + id + ': ' + r.status); return r.arrayBuffer(); }); p.catch(() => bytes.delete(id)); bytes.set(id, p); }
  return p;
};
function load(id: OstId): Promise<AudioBuffer> {
  const c = audio()!;
  let p = decoded.get(id);
  if (p) { decoded.delete(id); decoded.set(id, p); return p; }
  // decodeAudioData detaches the bytes it gets: hand it a copy, so the fetched file can be decoded again later.
  p = fetchBytes(id).then((b) => new Promise<AudioBuffer>((res, rej) => { const q = c.decodeAudioData(b.slice(0), res, rej); if (q && typeof (q as any).then === 'function') (q as Promise<AudioBuffer>).then(res, rej); }));
  p.catch(() => decoded.delete(id));
  decoded.set(id, p);
  while (decoded.size > 2) { const old = [...decoded.keys()].find((k) => k !== id && k !== cur?.id); if (!old) break; decoded.delete(old); }
  return p;
}
/** Fetch a track's file ahead (not decoded), so the fight's music is ready when the fight starts. */
export function ostPreload(id: OstId) { if (typeof fetch === 'function') fetchBytes(id).catch(() => { /* played later, or never */ }); }

/** One pass of the loop: starts at `when` from `offset`, fades out over the seam, and is followed by the next pass. */
function pass(v: Voice, buf: AudioBuffer, when: number, offset: number, fadeIn: boolean) {
  const c = ctx!, f = OST_FILES[v.id], src = c.createBufferSource(), g = c.createGain();
  src.buffer = buf; src.connect(g); g.connect(v.gain);
  const at = seamAt(v.id, when, offset);
  if (fadeIn) g.gain.setValueCurveAtTime(IN, when, f.seam); else g.gain.setValueAtTime(1, when);
  g.gain.setValueCurveAtTime(OUT, at, f.seam);
  src.start(when, offset); src.stop(at + f.seam + 0.05);
  v.srcs.add(src);
  return { src, at };
}
/** Keep one pass ahead: when a pass ends, the one after the next is scheduled. Ended events fire in background tabs. */
function chain(v: Voice, buf: AudioBuffer, p: { src: AudioBufferSourceNode; at: number }) {
  const next = pass(v, buf, p.at, OST_FILES[v.id].loopIn, true);
  p.src.onended = () => { v.srcs.delete(p.src); try { p.src.disconnect(); } catch { /* */ } if (!v.dead) chain(v, buf, next); };
}
function startVoice(id: OstId, fadeMs: number): Voice {
  const c = ctx!, v: Voice = { id, gain: c.createGain(), srcs: new Set(), dying: null, dead: false };
  v.gain.gain.value = 0; v.gain.connect(master!);
  load(id).then((buf) => {
    if (v.dead) return;
    const t = c.currentTime + 0.05;
    v.gain.gain.cancelScheduledValues(t); v.gain.gain.setValueAtTime(0, t); v.gain.gain.linearRampToValueAtTime(1, t + Math.max(0.05, fadeMs / 1000));
    chain(v, buf, pass(v, buf, t, 0, false));
  }).catch(() => { /* a missing file is silence, never a broken game */ });
  return v;
}
function fadeOut(v: Voice, ms: number) {
  if (v.dead || v.dying) return;
  const c = ctx!, t = c.currentTime, g = v.gain.gain;
  g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(0, t + Math.max(0.05, ms / 1000));
  fading.push(v);
  v.dying = setTimeout(() => {
    v.dead = true; v.dying = null; fading.splice(fading.indexOf(v), 1);
    for (const s of v.srcs) { s.onended = null; try { s.stop(); } catch { /* */ } try { s.disconnect(); } catch { /* */ } }
    v.srcs.clear(); try { v.gain.disconnect(); } catch { /* */ }
  }, ms + 120);
}
/** Back from a fade-out still under way (a quick hand back): the same pass carries on, louder again. */
function revive(v: Voice, ms: number) {
  if (v.dying) clearTimeout(v.dying);
  v.dying = null; fading.splice(fading.indexOf(v), 1);
  const t = ctx!.currentTime, g = v.gain.gain;
  g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(1, t + Math.max(0.05, ms / 1000));
}

/** Play a track (crossfading from the one playing), or null to fade out. Playing the same track again does nothing. */
export function ostPlay(id: OstId | null, fadeMs = 1200) {
  if (cur && !cur.dead && cur.id === id) return;
  if (!id && !cur) return;
  if (!audio()) return;
  if (cur) fadeOut(cur, fadeMs);
  if (!id) { cur = null; return; }
  const back = fading.find((v) => v.id === id && !v.dead);
  if (back) { revive(back, fadeMs); cur = back; return; }
  cur = startVoice(id, fadeMs);
}
/** The track playing (or starting), if any. */
export const ostNow = (): OstId | null => cur?.id ?? null;
// For the browser tests (e2e/slate-music.mjs): which OST track this page is playing, if any.
if (typeof window !== 'undefined') (window as any).__phcOst = { now: ostNow };
/** The music's level, 0 to 1 (Settings x panel volume x the Narrator's duck), eased over `ms`. */
export function ostVolume(v: number, ms = 250) {
  level = Math.max(0, Math.min(1, v));
  if (!ctx || !master) return;
  const t = ctx.currentTime, g = master.gain;
  g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(level, t + Math.max(0.02, ms / 1000));
}
/** Pause and resume for this player only (the room's music goes on). */
export function ostPause(paused: boolean) { if (!ctx) return; (paused ? ctx.suspend() : ctx.resume()).catch(() => { /* */ }); }
/** Call from a click or key press: browsers start sound only after one. */
export function ostResume(): Promise<boolean> {
  if (!ctx) return Promise.resolve(false);
  return ctx.resume().then(() => ctx!.state === 'running', () => false);
}
/** Is sound actually running? (false: the browser is still waiting for a click, or the player paused). */
export const ostRunning = () => ctx?.state === 'running';

/** Tests only: forget the audio context and everything playing. */
export function _ostReset() { for (const v of [...fading, ...(cur ? [cur] : [])]) if (v.dying) clearTimeout(v.dying); ctx = null; master = null; none = false; cur = null; fading.length = 0; decoded.clear(); bytes.clear(); level = 0; }

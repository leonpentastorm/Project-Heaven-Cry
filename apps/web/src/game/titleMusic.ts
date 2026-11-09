// The title theme, "Heaven Cry" (spec: docs/design/title-screen.md §7). Plays on the title screen from the moment the
// site loads (Leon, 9 Nov 2026), or from the first click, key or tap where the browser refuses sound before one; loops with fades baked into the file, and fades out when you leave the title. Its own volume in Settings.
import { uiPrefs, onUiPrefs } from './sfx';

const SRC = '/music/heaven-cry.mp3';
let el: HTMLAudioElement | null = null, fade = 0, want = 0;
const vol = () => { const p = uiPrefs(); return p.mute ? 0 : (p.music ?? 70) / 100 * 0.8; };
function ramp(to: number, ms: number, then?: () => void) {
  if (!el) return; cancelAnimationFrame(fade);
  const from = el.volume, t0 = performance.now();
  const step = (t: number) => { if (!el) return; const k = Math.min(1, (t - t0) / ms); el.volume = Math.max(0, Math.min(1, from + (to - from) * k)); if (k < 1) fade = requestAnimationFrame(step); else then?.(); };
  fade = requestAnimationFrame(step);
}
/** Start (or keep) the theme. Safe to call any time: a browser that refuses sound before a gesture just says no, and
 *  the next call (the first click, key or tap) starts it. Calling it while it plays does nothing. */
export function playTitleMusic() {
  want = 1;
  if (!el) { el = new Audio(SRC); el.loop = true; el.preload = 'auto'; el.volume = 0; }
  if (vol() === 0) return; // muted: don't start at all (iOS ignores volume)
  if (!el.paused) return; // already playing (or fading in)
  const a = el; a.play().then(() => { if (want) ramp(vol(), 2000); }).catch(() => { /* not allowed yet; the next gesture retries */ });
}
/** Fade out and pause (leaving the title). */
export function stopTitleMusic(ms = 1200) { want = 0; if (!el || el.paused) return; ramp(0, ms, () => { if (!want) el?.pause(); }); }
// A settings change cancels any fade; silence means paused, since some browsers (iOS) ignore volume.
onUiPrefs(() => { if (!el || !want) return; cancelAnimationFrame(fade); const v = vol(); if (v === 0) el.pause(); else { el.volume = v; if (el.paused) el.play().catch(() => {}); } });
// The e2e (pg-art.mjs) reads the title theme's element.
if (typeof window !== 'undefined') (window as any).__phcTitleAudio = () => el;

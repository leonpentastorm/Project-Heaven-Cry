// The character-creation theme, "Intake": plays while a character is being made, loops softly (fades baked into the
// file), and fades out when you leave creation. Same music volume and mute as the title theme. Browsers only allow
// sound after a gesture; reaching creation always takes a click, and a refused start retries on the next gesture.
import { musicLevel, onUiPrefs } from './sfx';

const SRC = '/music/intake.mp3';
let el: HTMLAudioElement | null = null, fade = 0, want = 0;
const vol = () => musicLevel() * 0.7;
function ramp(to: number, ms: number, then?: () => void) {
  if (!el) return; cancelAnimationFrame(fade);
  const from = el.volume, t0 = performance.now();
  const step = (t: number) => { if (!el) return; const k = Math.min(1, (t - t0) / ms); el.volume = Math.max(0, Math.min(1, from + (to - from) * k)); if (k < 1) fade = requestAnimationFrame(step); else then?.(); };
  fade = requestAnimationFrame(step);
}
export function playCreateMusic() {
  want = 1;
  if (!el) { el = new Audio(SRC); el.loop = true; el.preload = 'auto'; el.volume = 0; }
  if (vol() === 0) return;
  const a = el; a.play().then(() => { if (want) ramp(vol(), 2500); }).catch(() => {});
}
export function stopCreateMusic(ms = 1500) { want = 0; if (!el || el.paused) return; ramp(0, ms, () => { if (!want) el?.pause(); }); }
const retry = () => { if (want && el && el.paused && vol() > 0) playCreateMusic(); };
if (typeof window !== 'undefined') for (const ev of ['pointerup', 'keydown']) window.addEventListener(ev, retry, { capture: true });
onUiPrefs(() => { if (!el || !want) return; cancelAnimationFrame(fade); const v = vol(); if (v === 0) el.pause(); else { el.volume = v; if (el.paused) el.play().catch(() => {}); } });

// UI sounds (spec: docs/design/title-screen.md §7). Small files played through Web Audio so they start instantly and
// overlap cleanly; until a file is chosen (or if it fails to load) each event has a tiny synthesised stand-in.
// Nothing plays before the first key press or click (browsers forbid it anyway). Ducks under the Narrator's voice.
import { voiceState } from './voice';

export type Sfx = 'hover' | 'click' | 'start' | 'back' | 'slide' | 'slide_back' | 'error' | 'toggle' | 'tab' | 'wick_hello' | 'wick_steps';

/** The chosen files (public/sfx/…, CC0; credits in game/sfxCredits.ts). A list plays one at random. Missing means the
 *  synthesised stand-in (Wick's footsteps are synthesised on purpose: tiny metal taps). */
export const SFX_FILES: Partial<Record<Sfx, string | string[]>> = {
  hover: '/sfx/select_001.ogg', click: '/sfx/click_001.ogg', start: '/sfx/confirmation_002.ogg',
  back: '/sfx/back_001.ogg', slide: '/sfx/maximize_004.ogg', slide_back: '/sfx/minimize_004.ogg', error: '/sfx/error_004.ogg',
  toggle: ['/sfx/toggle_001.ogg', '/sfx/toggle_002.ogg'], tab: '/sfx/pluck_001.ogg', wick_hello: '/sfx/wick_hello.ogg',
};
/** The mix: how loud each event sits under the master UI volume. */
const MIX: Partial<Record<Sfx, number>> = { hover: 0.22, click: 0.45, start: 0.6, back: 0.4, slide: 0.35, slide_back: 0.35, error: 0.45, toggle: 0.35, tab: 0.35, wick_hello: 0.5, wick_steps: 0.5 };
const files = (s: Sfx) => { const f = SFX_FILES[s]; return f ? (Array.isArray(f) ? f : [f]) : []; };

// ---------- settings (shared with the title screen's Settings) ----------
const LS = 'phc.ui';
export interface UiPrefs { sfx: number; mute: boolean; reduceMotion: boolean }
let prefs: UiPrefs = (() => { try { return { sfx: 60, mute: false, reduceMotion: false, ...JSON.parse(localStorage.getItem(LS) || '{}') }; } catch { return { sfx: 60, mute: false, reduceMotion: false }; } })();
const subs = new Set<() => void>();
export const uiPrefs = () => prefs;
export const onUiPrefs = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
export function setUiPrefs(p: Partial<UiPrefs>) { prefs = { ...prefs, ...p }; try { localStorage.setItem(LS, JSON.stringify(prefs)); } catch { /* */ } for (const f of subs) f(); }
/** Reduce motion: our toggle, or the system setting. */
export const reducedMotion = () => prefs.reduceMotion || (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches);

// ---------- playback ----------
let ctx: AudioContext | null = null, out: GainNode | null = null, unlocked = false;
const buffers = new Map<string, AudioBuffer | null>();
function audio() {
  if (!ctx) { ctx = new AudioContext(); out = ctx.createGain(); out.connect(ctx.destination); }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}
/** Call from the first user gesture: sound is allowed from then on. */
export function unlockSfx() { unlocked = true; audio(); for (const s of Object.keys(SFX_FILES) as Sfx[]) for (const f of files(s)) load(f); }
if (typeof window !== 'undefined') for (const ev of ['pointerdown', 'keydown']) window.addEventListener(ev, () => { if (!unlocked) unlockSfx(); }, { capture: true, once: true });
async function load(url: string) {
  if (buffers.has(url)) return buffers.get(url) || null;
  buffers.set(url, null);
  try { const b = await audio().decodeAudioData(await (await fetch(url)).arrayBuffer()); buffers.set(url, b); return b; } catch { return null; }
}
const level = () => (prefs.mute ? 0 : prefs.sfx / 100) * (voiceState().speaking ? 0.4 : 1);
let lastHover = 0;

export function sfx(name: Sfx) {
  if (!unlocked || level() <= 0) return;
  if (name === 'hover') { const t = performance.now(); if (t - lastHover < 60) return; lastHover = t; }
  const ac = audio(), g = ac.createGain(); g.gain.value = level() * (MIX[name] ?? 0.4) * 2; g.connect(out!);
  const list = files(name), file = list[Math.floor(Math.random() * list.length)], buf = file ? buffers.get(file) : null;
  if (buf) { const s = ac.createBufferSource(); s.buffer = buf; s.connect(g); s.start(); return; }
  if (file && !buffers.has(file)) load(file);
  synth(ac, g, name);
}

/** Stand-ins: a few oscillator blips, quiet and short. */
function synth(ac: AudioContext, dest: GainNode, name: Sfx) {
  const t = ac.currentTime;
  const tone = (f0: number, f1: number, dur: number, type: OscillatorType = 'sine', vol = 0.18, at = 0) => {
    const o = ac.createOscillator(), e = ac.createGain(); o.type = type;
    o.frequency.setValueAtTime(f0, t + at); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + at + dur);
    e.gain.setValueAtTime(0.0001, t + at); e.gain.exponentialRampToValueAtTime(vol, t + at + 0.006); e.gain.exponentialRampToValueAtTime(0.0001, t + at + dur);
    o.connect(e); e.connect(dest); o.start(t + at); o.stop(t + at + dur + 0.02);
  };
  const noise = (dur: number, f: number, vol = 0.12, at = 0) => {
    const n = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate), d = n.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const s = ac.createBufferSource(), bp = ac.createBiquadFilter(), e = ac.createGain(); s.buffer = n; bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 0.8;
    e.gain.value = vol; s.connect(bp); bp.connect(e); e.connect(dest); s.start(t + at);
  };
  switch (name) {
    case 'hover': tone(1800, 1600, 0.03, 'sine', 0.05); break;
    case 'click': tone(900, 500, 0.06, 'triangle', 0.16); break;
    case 'start': tone(220, 440, 0.18, 'triangle', 0.18); tone(330, 660, 0.25, 'sine', 0.1, 0.06); break;
    case 'back': tone(500, 260, 0.08, 'triangle', 0.12); break;
    case 'slide': case 'slide_back': noise(0.28, 900, 0.07); break;
    case 'error': tone(180, 160, 0.07, 'square', 0.06); tone(180, 150, 0.07, 'square', 0.06, 0.1); break;
    case 'toggle': tone(1200, 1000, 0.04, 'square', 0.05); break;
    case 'tab': noise(0.05, 2400, 0.08); break;
    case 'wick_hello': tone(880, 1320, 0.07, 'square', 0.06); tone(1320, 1760, 0.09, 'square', 0.06, 0.09); tone(1760, 2200, 0.06, 'square', 0.05, 0.2); break;
    case 'wick_steps': for (let i = 0; i < 4; i++) noise(0.025, 3200, 0.05, i * 0.07); break;
  }
}

/** Every button in the game clicks (spec §7); a button can name its own sound with data-sfx, or "none". */
export function installButtonSounds() {
  if (typeof document === 'undefined' || (window as any).__phcSfx) return; (window as any).__phcSfx = true;
  document.addEventListener('click', (e) => {
    const b = (e.target as Element | null)?.closest?.('button, [role="tab"], input[type="checkbox"], select');
    if (!b || (b as HTMLButtonElement).disabled) return;
    const want = b.getAttribute('data-sfx');
    if (want === 'none') return;
    sfx((want as Sfx) || (b.getAttribute('role') === 'tab' ? 'tab' : b.matches('input[type="checkbox"]') ? 'toggle' : /^(‹|close|back|cancel|✕)/i.test((b.textContent || '').trim()) ? 'back' : 'click'));
  }, { capture: true });
}

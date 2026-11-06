// UI sounds (spec: docs/design/title-screen.md §7). Small files played through Web Audio so they start instantly and
// overlap cleanly; until a file is chosen (or if it fails to load) each event has a tiny synthesised stand-in.
// Nothing plays before the first key press or click (browsers forbid it anyway). Ducks under the Narrator's voice.
import { voiceState } from './voice';

export type Sfx = 'hover' | 'click' | 'start' | 'back' | 'slide' | 'slide_back' | 'error' | 'toggle' | 'tab' | 'wick_hello' | 'wick_steps'
  | 'shot' | 'hit' | 'miss' | 'reload' | 'melee' | 'down'
  // Magic (docs/design/magic-presentation.md): Sigils are synthetic and snap; Outbursts are organic and swell.
  | 'draw' | 'evoke' | 'overload' | 'outburst' | 'release' | 'short';

/** The chosen files (public/sfx/…, CC0; credits in game/sfxCredits.ts). A list plays one at random. Missing means the
 *  synthesised stand-in (Wick's footsteps are synthesised on purpose: tiny metal taps). */
export const SFX_FILES: Partial<Record<Sfx, string | string[]>> = {
  hover: '/sfx/select_001.ogg', click: '/sfx/click_001.ogg', start: '/sfx/confirmation_002.ogg',
  back: '/sfx/back_001.ogg', slide: '/sfx/maximize_004.ogg', slide_back: '/sfx/minimize_004.ogg', error: '/sfx/error_004.ogg',
  toggle: ['/sfx/toggle_001.ogg', '/sfx/toggle_002.ogg'], tab: '/sfx/pluck_001.ogg', wick_hello: '/sfx/wick_hello.ogg',
};
/** The mix: how loud each event sits under the master UI volume. */
const MIX: Partial<Record<Sfx, number>> = { draw: 0.35, evoke: 0.45, overload: 0.45, outburst: 0.45, release: 0.5, short: 0.55, shot: 0.5, hit: 0.45, miss: 0.3, reload: 0.4, melee: 0.45, down: 0.5, hover: 0.22, click: 0.45, start: 0.6, back: 0.4, slide: 0.35, slide_back: 0.35, error: 0.45, toggle: 0.35, tab: 0.35, wick_hello: 0.5, wick_steps: 0.5 };
const files = (s: Sfx) => { const f = SFX_FILES[s]; return f ? (Array.isArray(f) ? f : [f]) : []; };

// ---------- settings (shared with the title screen's Settings) ----------
const LS = 'phc.ui';
export interface UiPrefs { sfx: number; music: number; mute: boolean; reduceMotion: boolean }
let prefs: UiPrefs = (() => { try { return { sfx: 60, music: 70, mute: false, reduceMotion: false, ...JSON.parse(localStorage.getItem(LS) || '{}') }; } catch { return { sfx: 60, music: 70, mute: false, reduceMotion: false }; } })();
const subs = new Set<() => void>();
export const uiPrefs = () => prefs;
export const onUiPrefs = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
export function setUiPrefs(p: Partial<UiPrefs>) { prefs = { ...prefs, ...p }; try { localStorage.setItem(LS, JSON.stringify(prefs)); } catch { /* */ } for (const f of subs) f(); }
/** Reduce motion: our toggle, or the system setting. */
export const reducedMotion = () => prefs.reduceMotion || (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches);

// ---------- playback ----------
let ctx: AudioContext | null = null, out: GainNode | null = null, unlocked = false, noAudio = false;
const buffers = new Map<string, AudioBuffer | null>();
/** The audio context, or null where the browser has none (then the game is silent, never broken). */
function audio(): AudioContext | null {
  if (!ctx && !noAudio) {
    try {
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AC) { noAudio = true; return null; }
      ctx = new AC() as AudioContext; out = ctx.createGain();
      // A limiter, so overlapping sounds at full volume never clip.
      const lim = ctx.createDynamicsCompressor(); lim.threshold.value = -3; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.002; lim.release.value = 0.08;
      out.connect(lim); lim.connect(ctx.destination);
    } catch { noAudio = true; ctx = null; return null; }
  }
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}
/** Call from a user gesture: sound is allowed from then on. */
export function unlockSfx() { unlocked = true; if (!audio()) return; for (const s of Object.keys(SFX_FILES) as Sfx[]) for (const f of files(s)) load(f); }
// Touch only grants permission on the finger lifting, so listen to every kind of gesture and resume a suspended context.
if (typeof window !== 'undefined') for (const ev of ['pointerdown', 'pointerup', 'touchend', 'keydown', 'click']) window.addEventListener(ev, () => { if (!unlocked) unlockSfx(); else if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {}); }, { capture: true });
async function load(url: string) {
  if (buffers.has(url)) return buffers.get(url) || null;
  const ac = audio(); if (!ac) return null;
  buffers.set(url, null);
  try { const b = await ac.decodeAudioData(await (await fetch(url)).arrayBuffer()); buffers.set(url, b); return b; } catch { return null; }
}
const level = () => (prefs.mute ? 0 : prefs.sfx / 100) * (voiceState().speaking ? 0.4 : 1);
let lastHover = 0;

export function sfx(name: Sfx) {
  if (!unlocked || level() <= 0) return;
  if (name === 'hover') { const t = performance.now(); if (t - lastHover < 60) return; lastHover = t; }
  try {
    const ac = audio(); if (!ac || !out) return;
    const g = ac.createGain(); g.gain.value = Math.min(1, level() * (MIX[name] ?? 0.4) * 2); g.connect(out);
    const list = files(name), file = list[Math.floor(Math.random() * list.length)], buf = file ? buffers.get(file) : null;
    if (buf) { const s = ac.createBufferSource(); s.buffer = buf; s.connect(g); s.start(); return; }
    if (file && !buffers.has(file)) load(file);
    synth(ac, g, name);
  } catch { /* sound must never break the game */ }
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
  /** A soft swell: slow attack and release (Soul sounds never click in). */
  const swell = (f0: number, f1: number, dur: number, type: OscillatorType = 'sine', vol = 0.15, at = 0) => {
    const o = ac.createOscillator(), e = ac.createGain(); o.type = type;
    o.frequency.setValueAtTime(f0, t + at); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + at + dur);
    e.gain.setValueAtTime(0.0001, t + at); e.gain.linearRampToValueAtTime(vol, t + at + dur * 0.45); e.gain.linearRampToValueAtTime(0.0001, t + at + dur);
    o.connect(e); e.connect(dest); o.start(t + at); o.stop(t + at + dur + 0.02);
  };
  /** A heartbeat: lub-dub, two low thumps. */
  const beat = (at = 0, vol = 0.3) => { tone(70, 42, 0.13, 'sine', vol, at); tone(62, 38, 0.11, 'sine', vol * 0.7, at + 0.17); };
  switch (name) {
    // Sigils: a tone per word that locks with a click.
    case 'draw': tone(660, 660, 0.09, 'triangle', 0.1); tone(990, 990, 0.05, 'square', 0.035, 0.03); tone(2400, 1800, 0.015, 'square', 0.06, 0.1); break;
    case 'evoke': [523, 659, 784].forEach((f, i) => tone(f, f, 0.07, 'square', 0.05, i * 0.055)); tone(1568, 392, 0.16, 'sawtooth', 0.07, 0.17); noise(0.08, 5200, 0.12, 0.17); break;
    case 'overload': for (let i = 0; i < 7; i++) tone(200 + Math.random() * 1800, 80 + Math.random() * 400, 0.03, 'square', 0.06, i * 0.028); noise(0.2, 900, 0.18, 0.05); break;
    // Soul: a held breath and a heartbeat; a release rushes out; a Mana Short drops to silence.
    case 'outburst': swell(196, 294, 0.7, 'sine', 0.12); swell(392, 588, 0.7, 'triangle', 0.04, 0.05); beat(0.08, 0.28); break;
    case 'release': swell(294, 784, 0.45, 'sine', 0.14); noise(0.5, 700, 0.1, 0.02); beat(0, 0.22); break;
    case 'short': tone(58, 28, 0.6, 'sine', 0.4); break;
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
    // Combat stand-ins until real files are chosen (spec: more effects later).
    case 'shot': noise(0.09, 1800, 0.35); tone(140, 50, 0.12, 'sine', 0.3); break;
    case 'hit': tone(120, 60, 0.14, 'sine', 0.3); noise(0.05, 600, 0.15, 0.01); break;
    case 'miss': noise(0.18, 4200, 0.06, 0.02); tone(2400, 900, 0.16, 'sine', 0.03, 0.02); break;
    case 'reload': tone(1400, 1200, 0.03, 'square', 0.07); tone(900, 800, 0.04, 'square', 0.08, 0.18); noise(0.03, 2500, 0.08, 0.2); break;
    case 'melee': noise(0.12, 900, 0.2); tone(90, 50, 0.15, 'sine', 0.25, 0.03); break;
    case 'down': tone(300, 70, 0.5, 'sawtooth', 0.08); break;
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

/** Combat and area-map feedback: each new log line that describes a shot, a hit, a miss or a reload sounds. */
const RE_RELOAD = /\breload|\bloads? (a|the|loose|\d+)\b|speedloader|clears? the jam/;
const RE_SHOT = /\b(fires|shoots|opens fire|aimed shot|burst|full auto)\b/;
const RE_MELEE = /\b(strikes|smashes|punches|slashes|stabs|swings)\b/;
const RE_DOWN = /\b(is downed|goes down|drops to 0|is dead|dies)\b/;
// Magic lines (engine: packages/engine/src/magic.ts). Checked before the guns: a spell's line can mention damage too.
const RE_SHORT = /mana short:/;
const RE_OVERLOAD = /\boverload:/;
const RE_EVOKE = /\bevokes\b/;
const RE_DRAW = /\bdraws [a-z]+ at [a-z]+\d+|\bscuffs out\b|\bvents \d+ flux\b/;
const RE_HOLD = /\bbegins .+ and holds it\b|\blets .+ go\b|outburst grows to stage|\bsyphons \d+ mp\b|\bcrystallises a mana core\b/;
const RE_RELEASE = /\breleases\b|outburst bursts into the air/;
const RE_WALL = /\bcrosses the .+ wall\b/;
const RE_HURT = /\d+ damage|critical/;
const isMagicLine = (t: string) => RE_SHORT.test(t) || RE_OVERLOAD.test(t) || RE_EVOKE.test(t) || RE_DRAW.test(t) || RE_HOLD.test(t) || RE_RELEASE.test(t) || RE_WALL.test(t);
/** Whether a log line makes any sound (so a burst of quiet lines never crowds out the shot). */
export const hasSfx = (text: string) => { const t = text.toLowerCase(); return !/death save/.test(t) && (isMagicLine(t) || RE_RELOAD.test(t) || RE_SHOT.test(t) || RE_MELEE.test(t) || /\bmiss/.test(t) || RE_DOWN.test(t)); };
export function sfxForLine(text: string) {
  const t = text.toLowerCase();
  if (/death save/.test(t)) return; // every turn while Downed: no sound
  if (RE_SHORT.test(t)) return sfx('short');
  if (RE_OVERLOAD.test(t)) { if (RE_DRAW.test(t)) sfx('draw'); setTimeout(() => sfx('overload'), 90); return; }
  if (RE_EVOKE.test(t)) { sfx('evoke'); if (/\bmiss/.test(t) && !RE_HURT.test(t)) setTimeout(() => sfx('miss'), 220); else if (RE_HURT.test(t)) setTimeout(() => sfx('hit'), 220); return; }
  if (RE_DRAW.test(t)) return sfx('draw');
  if (RE_RELEASE.test(t)) { sfx('release'); if (RE_HURT.test(t)) setTimeout(() => sfx('hit'), 260); return; }
  if (RE_HOLD.test(t)) return sfx('outburst');
  if (RE_WALL.test(t)) return sfx('hit');
  if (RE_RELOAD.test(t)) return sfx('reload');
  if (RE_SHOT.test(t)) { sfx('shot'); if (/\bmiss|jams/.test(t)) setTimeout(() => sfx('miss'), 90); else if (/· (critical|hit)\b|\d+ damage|\d+ dmg|−\d+ hp/.test(t)) setTimeout(() => sfx('hit'), 90); return; }
  if (RE_MELEE.test(t)) return sfx('melee');
  if (/\bmiss/.test(t)) return sfx('miss');
  if (RE_DOWN.test(t)) return sfx('down');
}

// UI sounds (spec: docs/design/title-screen.md §7). Small files played through Web Audio so they start instantly and
// overlap cleanly; until a file is chosen (or if it fails to load) each event has a tiny synthesised stand-in.
// Nothing plays before the first key press or click (browsers forbid it anyway). Ducks under the Narrator's voice.
import { voiceState } from './voice';

export type Sfx = 'hover' | 'click' | 'start' | 'back' | 'slide' | 'slide_back' | 'error' | 'toggle' | 'tab' | 'wick_hello' | 'wick_steps'
  | 'shot' | 'hit' | 'miss' | 'reload' | 'melee' | 'down'
  // Magic (docs/design/magic-presentation.md): Sigils are synthetic and snap; Outbursts are organic and swell.
  | 'draw' | 'evoke' | 'overload' | 'outburst' | 'release' | 'short'
  // Combat feel (game/fx/FxLayer.tsx plays these from the engine's presentation events, in sync with the visuals).
  | CombatSfx;
/** Weapons, impacts, reloads, bodies, doors, spells: public/sfx/cb (credits in game/sfxCredits.ts). */
export type CombatSfx = 'gun_pistol' | 'gun_revolver' | 'gun_magnum' | 'gun_smg' | 'gun_rifle' | 'gun_sniper' | 'gun_lever' | 'gun_shotgun' | 'gun_heavy'
  | 'burst_smg' | 'burst_rifle' | 'auto_smg' | 'auto_rifle' | 'auto_heavy'
  | 'reload_pistol' | 'reload_mag' | 'reload_rifle' | 'reload_shells' | 'rack' | 'jam_clear' | 'round_in' | 'mag_in' | 'dry_click'
  | 'hit_flesh' | 'hit_heavy' | 'hit_metal' | 'hit_wood' | 'body_fall' | 'step' | 'swish' | 'whiz' | 'slice' | 'chop'
  | 'explosion' | 'explosion_boom' | 'door_open' | 'door_close' | 'stim'
  | 'sigil_draw' | 'sigil_evoke' | 'sigil_core' | 'sigil_overload' | 'soul_hold' | 'heartbeat' | 'soul_release' | 'crystal' | 'vent';
const CB = (...n: string[]) => n.map((x) => '/sfx/cb/' + x + '.ogg');

/** The chosen files (public/sfx/…, CC0; credits in game/sfxCredits.ts). A list plays one at random. Missing means the
 *  synthesised stand-in (Wick's footsteps are synthesised on purpose: tiny metal taps). */
export const SFX_FILES: Partial<Record<Sfx, string | string[]>> = {
  hover: '/sfx/select_001.ogg', click: '/sfx/click_001.ogg', start: '/sfx/confirmation_002.ogg',
  back: '/sfx/back_001.ogg', slide: '/sfx/maximize_004.ogg', slide_back: '/sfx/minimize_004.ogg', error: '/sfx/error_004.ogg',
  toggle: ['/sfx/toggle_001.ogg', '/sfx/toggle_002.ogg'], tab: '/sfx/pluck_001.ogg', wick_hello: '/sfx/wick_hello.ogg',
  gun_pistol: CB('shot_pistol_1', 'shot_pistol_2', 'shot_pistol_3'), gun_revolver: CB('shot_revolver_1', 'shot_revolver_2'), gun_magnum: CB('shot_magnum'),
  gun_smg: CB('shot_smg'), gun_rifle: CB('shot_rifle_1', 'shot_rifle_2'), gun_sniper: CB('shot_sniper'), gun_lever: CB('shot_lever'),
  gun_shotgun: CB('shot_shotgun_1', 'shot_shotgun_2'), gun_heavy: CB('shot_heavy'),
  burst_smg: CB('burst_smg'), burst_rifle: CB('burst_rifle'), auto_smg: CB('auto_smg'), auto_rifle: CB('auto_rifle'), auto_heavy: CB('auto_heavy'),
  reload_pistol: CB('reload_pistol'), reload_mag: CB('reload_mag', 'reload_mag_2'), reload_rifle: CB('reload_rifle'), reload_shells: CB('reload_shells'),
  rack: CB('rack'), jam_clear: CB('jam_clear'), round_in: CB('round_in'), mag_in: CB('mag_in'), dry_click: CB('dry_click'),
  hit_flesh: CB('hit_flesh_1', 'hit_flesh_2'), hit_heavy: CB('hit_heavy'), hit_metal: CB('hit_metal_1', 'hit_metal_2'), hit_wood: CB('hit_wood'), body_fall: CB('body_fall'),
  step: CB('step_1', 'step_2', 'step_3'), swish: CB('swish_1', 'swish_2'), whiz: CB('whiz'), slice: CB('slice'), chop: CB('chop'),
  explosion: CB('explosion_1', 'explosion_2'), explosion_boom: CB('explosion_boom'), door_open: CB('door_open'), door_close: CB('door_close'), stim: CB('stim_hiss'),
  sigil_draw: CB('sigil_draw'), sigil_evoke: CB('sigil_evoke'), sigil_core: CB('sigil_core'), sigil_overload: CB('sigil_overload'),
  soul_hold: CB('soul_hold'), heartbeat: CB('heartbeat'), soul_release: CB('soul_release'), crystal: CB('crystal'), vent: CB('vent'),
};
/** Combat sounds load when a game is on screen (preloadCombatSfx), not on the title screen's first key press. */
const isCombatFile = (f: string) => f.startsWith('/sfx/cb/');
/** Combat names fall back to the old synthesised stand-ins until their file has loaded. */
const STAND_IN: Partial<Record<CombatSfx, Sfx>> = {
  reload_pistol: 'reload', reload_mag: 'reload', reload_rifle: 'reload', reload_shells: 'reload', rack: 'reload', jam_clear: 'reload', round_in: 'reload', mag_in: 'reload',
  hit_flesh: 'hit', hit_heavy: 'hit', hit_metal: 'hit', hit_wood: 'hit', body_fall: 'down', swish: 'melee', slice: 'melee', chop: 'melee', whiz: 'miss',
  explosion: 'shot', explosion_boom: 'hit', sigil_draw: 'draw', sigil_evoke: 'evoke', sigil_overload: 'overload', soul_hold: 'outburst', soul_release: 'release',
};
/** The mix: how loud each event sits under the master UI volume. */
const MIX: Partial<Record<Sfx, number>> = {
  gun_pistol: 0.5, gun_revolver: 0.55, gun_magnum: 0.6, gun_smg: 0.45, gun_rifle: 0.55, gun_sniper: 0.6, gun_lever: 0.55, gun_shotgun: 0.6, gun_heavy: 0.65,
  burst_smg: 0.5, burst_rifle: 0.55, auto_smg: 0.5, auto_rifle: 0.55, auto_heavy: 0.6,
  reload_pistol: 0.45, reload_mag: 0.45, reload_rifle: 0.45, reload_shells: 0.45, rack: 0.45, jam_clear: 0.5, round_in: 0.35, mag_in: 0.4, dry_click: 0.35,
  hit_flesh: 0.45, hit_heavy: 0.5, hit_metal: 0.35, hit_wood: 0.35, body_fall: 0.5, step: 0.2, swish: 0.4, whiz: 0.25, slice: 0.4, chop: 0.45,
  explosion: 0.65, explosion_boom: 0.6, door_open: 0.4, door_close: 0.4, stim: 0.35,
  sigil_draw: 0.3, sigil_evoke: 0.4, sigil_core: 0.35, sigil_overload: 0.45, soul_hold: 0.35, heartbeat: 0.55, soul_release: 0.5, crystal: 0.35, vent: 0.3, draw: 0.35, evoke: 0.45, overload: 0.45, outburst: 0.45, release: 0.5, short: 0.55, shot: 0.5, hit: 0.45, miss: 0.3, reload: 0.4, melee: 0.45, down: 0.5, hover: 0.22, click: 0.45, start: 0.6, back: 0.4, slide: 0.35, slide_back: 0.35, error: 0.45, toggle: 0.35, tab: 0.35, wick_hello: 0.5, wick_steps: 0.5 };
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
export function unlockSfx() { unlocked = true; if (!audio()) return; for (const s of Object.keys(SFX_FILES) as Sfx[]) for (const f of files(s)) if (!isCombatFile(f) || combatWanted) load(f); }
let combatWanted = false;
/** Fetch the combat sounds (once a game is on screen); before the first gesture they load as sound is unlocked. */
export function preloadCombatSfx() { combatWanted = true; if (!unlocked || !audio()) return; for (const s of Object.keys(SFX_FILES) as Sfx[]) for (const f of files(s)) if (isCombatFile(f)) load(f); }
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

/** Options for one sound: rate (pitch and speed, 1 = as recorded), gain (× its mix), delay in ms (scheduled on the
 *  audio clock), pan (−1 left … 1 right, from where it happens on screen). */
export interface SfxOpts { rate?: number; gain?: number; delay?: number; pan?: number }
export function sfx(name: Sfx, o: SfxOpts = {}) {
  if (!unlocked || level() <= 0) return;
  if (name === 'hover') { const t = performance.now(); if (t - lastHover < 60) return; lastHover = t; }
  try {
    const ac = audio(); if (!ac || !out) return;
    const g = ac.createGain(); g.gain.value = Math.min(1, level() * (MIX[name] ?? 0.4) * 2 * (o.gain ?? 1));
    let dest: AudioNode = out;
    if (o.pan && (ac as any).createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, o.pan)); p.connect(out); dest = p; }
    g.connect(dest);
    const list = files(name), file = list[Math.floor(Math.random() * list.length)], buf = file ? buffers.get(file) : null;
    const at = ac.currentTime + Math.max(0, (o.delay || 0) / 1000);
    if (buf) { const s = ac.createBufferSource(); s.buffer = buf; if (o.rate) s.playbackRate.value = o.rate; s.connect(g); s.start(at); return; }
    if (file && !buffers.has(file)) load(file);
    const stand = (STAND_IN as Record<string, Sfx>)[name] || (name.startsWith('gun_') || name.startsWith('burst_') || name.startsWith('auto_') ? 'shot' : name);
    if (o.delay) setTimeout(() => synth(ac, g, stand), o.delay); else synth(ac, g, stand);
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

// The Narrator's voice (spec: The Narrator's voice). Text to speech in each player's own browser, free: Kokoro, an open
// Apache-2.0 voice model run by kokoro-js (WebGPU where there is one, else WASM), downloaded once and cached; the
// browser's own speech voice stands in while it loads or where it can't run. A new Narrator line is held back until its
// first sentence is ready, then shown as it starts; the rest is made while it plays. Music ducks while it speaks.

export const NARRATOR_VOICES: [string, string][] = [['af_heart', 'Heart (warm, the default)'], ['af_bella', 'Bella (bright)'], ['bf_emma', 'Emma (British)'], ['am_fenrir', 'Fenrir (low)'], ['am_michael', 'Michael (steady)'], ['am_puck', 'Puck (lively)'], ['bm_george', 'George (British)']];
/** Skill voices by core: Body, Mind, Soul. */
export const CORE_VOICE: Record<string, string> = { body: 'am_fenrir', mind: 'bf_emma', soul: 'af_bella' };

const LS = 'phc.voice';
export interface VoicePrefs { auto: boolean; volume: number; voice: string }
let prefs: VoicePrefs = (() => { try { return { auto: true, volume: 90, voice: 'af_heart', ...JSON.parse(localStorage.getItem(LS) || '{}') }; } catch { return { auto: true, volume: 90, voice: 'af_heart' }; } })();
export const voicePrefs = () => prefs;
export function setVoicePrefs(p: Partial<VoicePrefs>) { prefs = { ...prefs, ...p }; try { localStorage.setItem(LS, JSON.stringify(prefs)); } catch { /* */ } if (gain) gain.gain.value = prefs.volume / 100; emit(); }

// ---------- state everyone listens to (the screens, the music) ----------
export interface VoiceState { status: 'idle' | 'loading' | 'ready' | 'failed'; progress: number; speaking: string | null; held: string[] }
let state: VoiceState = { status: 'idle', progress: 0, speaking: null, held: [] };
const subs = new Set<() => void>();
export const voiceState = () => state;
export const onVoice = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
const emit = () => { for (const f of subs) f(); };
const put = (p: Partial<VoiceState>) => { state = { ...state, ...p }; emit(); };

// ---------- the model ----------
let ttsP: Promise<any> | null = null;
export function loadVoice(): Promise<any> {
  if (ttsP) return ttsP;
  put({ status: 'loading', progress: 0 });
  ttsP = (async () => {
    const { KokoroTTS } = await import('kokoro-js');
    const gpu = typeof navigator !== 'undefined' && !!(navigator as any).gpu && !!(await (navigator as any).gpu.requestAdapter().catch(() => null));
    const files: Record<string, number> = {};
    const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', {
      dtype: gpu ? 'fp32' : 'q8', device: gpu ? 'webgpu' : 'wasm',
      progress_callback: (p: any) => { if (p && p.file && typeof p.progress === 'number') { files[p.file] = p.progress; const v = Object.values(files); put({ progress: Math.round(v.reduce((a, b) => a + b, 0) / v.length) }); } },
    });
    put({ status: 'ready', progress: 100 });
    return tts;
  })().catch((e) => { console.warn('Kokoro voice unavailable, using the browser voice', e); put({ status: 'failed' }); return null; });
  return ttsP;
}

// ---------- playback ----------
let ctx: AudioContext | null = null, gain: GainNode | null = null, sources: AudioBufferSourceNode[] = [], run = 0;
const audio = () => {
  if (!ctx) { ctx = new AudioContext(); gain = ctx.createGain(); gain.gain.value = prefs.volume / 100; gain.connect(ctx.destination); }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
};
if (typeof window !== 'undefined') window.addEventListener('pointerdown', () => { if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {}); }, { capture: true });
const cache = new Map<string, AudioBuffer[]>();
/** How long a new line may wait for its first sentence before the browser's voice takes it. */
const FIRST_SENTENCE_MS = 8000;

export function stopVoice() {
  run++; for (const s of sources) { try { s.stop(); } catch { /* */ } } sources = [];
  try { speechSynthesis.cancel(); } catch { /* */ }
  if (state.speaking) put({ speaking: null });
}

/** Hold a new line back until its voice is ready (the screen shows the Narrator gathering their voice). */
export const hold = (id: string) => put({ held: [...state.held, id] });
const release = (id: string) => { if (state.held.includes(id)) put({ held: state.held.filter((x) => x !== id) }); };

/**
 * Speak a line. onReady runs when the first sound is about to play (or, if the voice can't be made in time, when the
 * browser's voice takes over). Plays sentence by sentence; a new line stops the one before.
 */
export async function speak(id: string, text: string, voice = prefs.voice, wait = 15000) {
  stopVoice();
  const my = run, clean = text.replace(/[*_#>]/g, '').replace(/\s+/g, ' ').trim();
  if (!clean) { release(id); return; }
  put({ speaking: id });
  const done = () => { if (run === my) put({ speaking: null }); };
  const cached = cache.get(id + '|' + voice);
  if (cached) { release(id); playBuffers(cached, my, done); return; }
  const tts = await Promise.race([loadVoice(), new Promise((r) => setTimeout(() => r('late'), wait))]);
  if (run !== my) return;
  if (!tts || tts === 'late') { release(id); browserVoice(clean, my, done); return; }
  const ac = audio(), bufs: AudioBuffer[] = [];
  let at = ac.currentTime + 0.05, first = true;
  // A device too slow to make the first sentence in time: show the line and let the browser's voice read it.
  const t0 = performance.now(), slow = setTimeout(() => { if (first && run === my) { console.info('[voice] first sentence too slow; browser voice reads this line'); run++; release(id); const me = run; put({ speaking: id }); browserVoice(clean, me, () => { if (run === me) put({ speaking: null }); }); } }, FIRST_SENTENCE_MS);
  try {
    for await (const chunk of (tts as any).stream(clean, { voice })) {
      if (run !== my) { clearTimeout(slow); return; }
      if (first) { clearTimeout(slow); console.info('[voice] first sentence in ' + Math.round(performance.now() - t0) + ' ms'); }
      const a = chunk.audio, b = ac.createBuffer(1, a.audio.length, a.sampling_rate); b.copyToChannel(a.audio, 0); bufs.push(b);
      if (first) { first = false; release(id); at = Math.max(at, ac.currentTime + 0.05); }
      at = schedule(b, at, my);
    }
    cache.set(id + '|' + voice, bufs); if (cache.size > 40) cache.delete(cache.keys().next().value!);
    const left = Math.max(0, at - ac.currentTime);
    setTimeout(() => { if (run === my) done(); }, left * 1000 + 50);
  } catch (e) { clearTimeout(slow); console.warn('voice failed', e); release(id); if (run === my) browserVoice(clean, my, done); }
}
function schedule(b: AudioBuffer, at: number, my: number): number {
  const ac = audio(); if (run !== my) return at;
  const s = ac.createBufferSource(); s.buffer = b; s.connect(gain!); s.start(at); sources.push(s);
  return at + b.duration + 0.12;
}
function playBuffers(bufs: AudioBuffer[], my: number, done: () => void) {
  const ac = audio(); let at = ac.currentTime + 0.05;
  for (const b of bufs) at = schedule(b, at, my);
  setTimeout(() => { if (run === my) done(); }, (at - ac.currentTime) * 1000 + 50);
}
/** The browser's own voice: instant, free, quality depends on the device. */
function browserVoice(text: string, my: number, done: () => void) {
  try {
    const u = new SpeechSynthesisUtterance(text); u.volume = prefs.volume / 100; u.rate = 1;
    const en = speechSynthesis.getVoices().filter((v) => /^en/i.test(v.lang)); const nat = en.find((v) => /natural|neural|premium/i.test(v.name)) || en[0]; if (nat) u.voice = nat;
    u.onend = () => { if (run === my) done(); }; u.onerror = () => { if (run === my) done(); };
    speechSynthesis.speak(u);
  } catch { done(); }
}

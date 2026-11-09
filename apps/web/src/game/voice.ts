// The Narrator's voice (spec: The Narrator's voice). Text to speech in each player's own browser, free:
//   - Kokoro, an open Apache-2.0 voice model run by kokoro-js, installed once from Settings (about 90 MB, cached by the
//     browser) and run on the GPU through WebGPU, or on the CPU (WASM) when WebGPU really fails;
//   - or a voice the browser already has (speechSynthesis): Edge's "Microsoft … Online (Natural)" voices, Chrome's
//     "Google …" voices. A player can pick one; it is also the fallback, and then the best natural one is chosen.
// A new Narrator line is held back until its first sentence is ready (at most FIRST_SENTENCE_MS), then shown as it
// starts; the rest is made while it plays. With "Wait for Kokoro" (on once Kokoro is installed) a late line shows its
// text and the Kokoro audio follows; the browser voice never takes it. Music ducks while it speaks.
// Everything the player chooses is kept in localStorage 'phc.voice'.

export const NARRATOR_VOICES: [string, string][] = [['af_heart', 'Heart (warm, the default)'], ['af_bella', 'Bella (bright)'], ['bf_emma', 'Emma (British)'], ['am_fenrir', 'Fenrir (low)'], ['am_michael', 'Michael (steady)'], ['am_puck', 'Puck (lively)'], ['bm_george', 'George (British)']];
/** Skill voices by core (Kokoro): Body, Mind, Soul. The player can change each (prefs.skill). */
export const CORE_VOICE: Record<string, string> = { body: 'am_fenrir', mind: 'bf_emma', soul: 'af_bella' };
export const CORES = ['body', 'mind', 'soul'] as const;
export type Core = typeof CORES[number];
/** How long a new line is held back for its first sentence (after that its text shows; see waitForKokoro). */
export const FIRST_SENTENCE_MS = 8000;
/** How long a line waits for a model still loading before the browser voice reads it (when not waiting for Kokoro). */
const LOAD_WAIT_MS = 15000;
export const MODEL_MB = 92; // model_quantized.onnx (q8), plus about 0.5 MB a voice
/** The model file's size by weights (MB, from the model's Hugging Face page), so the bar measures the whole download. */
export const DTYPE_MB: Record<string, number> = { q8: 92.4, fp16: 163.2, fp32: 325.5 };
/** Download progress against the expected size: small files finishing first never read as 100%. */
export function downloadProgress(loaded: number, total: number, dtype: string): { pct: number; loadedMB: number; totalMB: number } {
  const expect = ((DTYPE_MB[dtype] || MODEL_MB) + 0.5) * 1e6, of = Math.max(total, expect);
  return { pct: Math.min(100, Math.floor((loaded / of) * 100)), loadedMB: Math.round(loaded / 1e5) / 10, totalMB: Math.round(of / 1e5) / 10 };
}
export const SAMPLE_LINE = 'The squad holds the line. Tell me what you do next.';

// ---------- voice keys: a Kokoro id ('af_heart') or a browser voice ('browser:<its name>') ----------
export const BROWSER = 'browser:';
export const isBrowserKey = (k: string | null | undefined) => typeof k === 'string' && k.startsWith(BROWSER);
export const browserKey = (name: string) => BROWSER + name;
export const isKokoroKey = (k: string | null | undefined) => !!k && NARRATOR_VOICES.some(([id]) => id === k);

// ---------- what the player chose ----------
export interface VoicePrefs {
  /** Read new Narrator lines aloud. */ auto: boolean;
  /** 0–100. */ volume: number;
  /** Speaking speed, 0.75–1.5 (1 = normal), for Kokoro and the browser voice (Leon, 9 Nov 2026). */ speed: number;
  /** The Narrator: a Kokoro id or a browser key. */ voice: string;
  /** Skill voices by core: a Kokoro id or a browser key each. */ skill: Record<Core, string>;
  /** The player opted in to Kokoro: it downloads (or loads from the cache) on the title screen. */ install: boolean;
  /** Kokoro has been installed in this browser at least once. */ ready: boolean;
  /** "Wait for Kokoro (no browser voice)"; null: the default, on once Kokoro is installed. */ wait: boolean | null;
}
/** The speed slider's range (Settings › VOICE). */
export const SPEED_MIN = 0.75, SPEED_MAX = 1.5;
export const DEFAULT_PREFS: VoicePrefs = { auto: true, volume: 90, speed: 1, voice: 'af_heart', skill: { ...CORE_VOICE } as Record<Core, string>, install: false, ready: false, wait: null };
/** Saved preferences (older saves had only auto, volume and voice), cleaned up. */
export function parsePrefs(raw: string | null | undefined): VoicePrefs {
  let o: any = {};
  try { o = JSON.parse(raw || '{}') || {}; } catch { o = {}; }
  const key = (k: any, d: string) => (typeof k === 'string' && (isKokoroKey(k) || (isBrowserKey(k) && k.length > BROWSER.length)) ? k : d);
  const skill = Object.fromEntries(CORES.map((c) => [c, key(o.skill?.[c], CORE_VOICE[c])])) as Record<Core, string>;
  const vol = Number(o.volume), spd = Number(o.speed);
  return {
    auto: typeof o.auto === 'boolean' ? o.auto : DEFAULT_PREFS.auto, volume: Number.isFinite(vol) ? Math.max(0, Math.min(100, Math.round(vol))) : DEFAULT_PREFS.volume,
    speed: Number.isFinite(spd) && spd > 0 ? Math.max(SPEED_MIN, Math.min(SPEED_MAX, Math.round(spd * 20) / 20)) : DEFAULT_PREFS.speed,
    voice: key(o.voice, DEFAULT_PREFS.voice), skill, install: o.install === true, ready: o.ready === true, wait: typeof o.wait === 'boolean' ? o.wait : null,
  };
}
const LS = 'phc.voice';
let prefs: VoicePrefs = (() => { try { return parsePrefs(localStorage.getItem(LS)); } catch { return { ...DEFAULT_PREFS }; } })();
export const voicePrefs = () => prefs;
export function setVoicePrefs(p: Partial<VoicePrefs>) {
  prefs = { ...prefs, ...p, skill: { ...prefs.skill, ...(p.skill || {}) } };
  try { localStorage.setItem(LS, JSON.stringify(prefs)); } catch { /* */ }
  if (gain) gain.gain.value = prefs.volume / 100; emit();
}
/** "Wait for Kokoro": the player's choice, else on once Kokoro has been installed here. */
export const waitForKokoro = (p: VoicePrefs = prefs) => (p.wait ?? p.ready);
/** The voice for a skill's lines (by its core). */
export const coreVoice = (core: string | null | undefined) => (core && (prefs.skill as any)[core]) || CORE_VOICE[core || ''] || prefs.voice;

// ---------- browser voices: natural first ----------
export interface BVoice { name: string; lang: string; localService?: boolean; default?: boolean; voiceURI?: string }
/** Edge's cloud voices: "Microsoft Aria Online (Natural) - English (United States)". */
export const isEdgeNatural = (v: BVoice) => /^Microsoft .*Online \(Natural\)/i.test(v.name);
/** Chrome's own (network) voices: "Google US English", "Google UK English Female". */
export const isGoogle = (v: BVoice) => /^Google /i.test(v.name);
/** How natural a browser voice sounds (higher first): Edge's natural voices, Chrome's Google voices, other neural ones. */
export function voiceScore(v: BVoice): number {
  // Leon (8 Nov 2026): Edge's en-US-ChristopherNeural is the house browser voice; it leads whenever the browser has it.
  return (isEdgeNatural(v) && /Christopher/i.test(v.name) ? 400 : isEdgeNatural(v) ? 300 : isGoogle(v) ? 200 : /natural|neural|premium|enhanced|siri/i.test(v.name) ? 150 : 0)
    + (/^en-US/i.test(v.lang) ? 20 : /^en-GB/i.test(v.lang) ? 15 : /^en/i.test(v.lang) ? 10 : 0) + (v.localService === false ? 5 : 0) + (v.default ? 1 : 0);
}
/** English voices, natural first (then by name). */
export function rankVoices(list: BVoice[]): BVoice[] {
  return list.filter((v) => /^en/i.test(v.lang)).sort((a, b) => voiceScore(b) - voiceScore(a) || a.name.localeCompare(b.name));
}
/** The groups the voice picker shows. Edge's natural voices get their own group when the browser has them. */
export function voiceGroups(list: BVoice[]): { kokoro: [string, string][]; browser: BVoice[]; edge: BVoice[]; hasEdge: boolean } {
  const ranked = rankVoices(list), edge = ranked.filter(isEdgeNatural);
  return { kokoro: NARRATOR_VOICES, browser: ranked.filter((v) => !isEdgeNatural(v)), edge, hasEdge: edge.length > 0 };
}
/** The best natural browser voice (n-th best, so the skill voices can differ from the Narrator's), or null. */
export function bestVoice(list: BVoice[], nth = 0): BVoice | null {
  const r = rankVoices(list); return r.length ? r[Math.min(nth, r.length - 1)] : null;
}
export const EDGE_NOTE = 'Open the game in Edge to use Microsoft\'s natural voices.';
let bvoices: BVoice[] = [];
const readVoices = () => { try { bvoices = (globalThis.speechSynthesis?.getVoices() || []).map((v) => ({ name: v.name, lang: v.lang, localService: v.localService, default: v.default, voiceURI: v.voiceURI })); } catch { bvoices = []; } };
export const browserVoices = () => bvoices;
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  readVoices(); try { speechSynthesis.addEventListener('voiceschanged', () => { readVoices(); emit(); }); } catch { /* */ }
}
/** A voice key's name for people: "Heart (warm, the default)", or the browser voice's own name. */
export function voiceLabel(key: string): string {
  if (isBrowserKey(key)) return key.slice(BROWSER.length);
  return (NARRATOR_VOICES.find(([id]) => id === key) || [key, key])[1];
}

// ---------- state everyone listens to (the screens, the music, Settings) ----------
export type VoiceStatus = 'idle' | 'loading' | 'installing' | 'ready' | 'failed';
export interface VoiceTest { engine: 'kokoro' | 'browser'; device: string; ms: number; voice: string }
export interface VoiceState {
  /** loading: downloading the model; installing: building it on the device and warming it up. */ status: VoiceStatus;
  /** Percent of the download, and its megabytes. */ progress: number; loadedMB: number; totalMB: number;
  /** Where Kokoro runs once ready ('webgpu' or 'wasm'), and with which weights. */ device: 'webgpu' | 'wasm' | null; dtype: string | null;
  /** The GPU WebGPU found (or why there is none). */ gpu: string;
  /** Why Kokoro is on the CPU though there is WebGPU (a real error), or null. */ fellBack: string | null;
  /** Why Kokoro failed altogether. */ error: string | null;
  speaking: string | null; held: string[];
  /** The last Test voice: engine, device, time to the first audio. */ test: VoiceTest | null;
  /** Before installing: the download for this device (MB) and where it would run. */ planMB: number; planDevice: 'webgpu' | 'wasm' | null;
  /** The warm-up's speech likeness (voiceCheck.ts), and whether the plan was forced from Settings or localStorage. */ likeness?: number | null; forced?: boolean;
}
let state: VoiceState = { status: 'idle', progress: 0, loadedMB: 0, totalMB: 0, device: null, dtype: null, gpu: '', fellBack: null, error: null, speaking: null, held: [], test: null, planMB: 0, planDevice: null };
const subs = new Set<() => void>();
export const voiceState = () => state;
export const onVoice = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
const emit = () => { for (const f of subs) f(); };
const put = (p: Partial<VoiceState>) => { state = { ...state, ...p }; emit(); };

/** The play screen's chip: "Voice: Kokoro · WebGPU", "Kokoro · CPU" ("(WebGPU failed)" after a real error), "Browser voice",
 *  "Loading 42%". */
export function voiceChip(s: VoiceState = state, p: VoicePrefs = prefs): string {
  if (isBrowserKey(p.voice)) return 'Voice: Browser voice';
  if (s.status === 'ready') return 'Voice: Kokoro · ' + (s.device === 'webgpu' ? 'WebGPU' : 'CPU' + (s.fellBack ? ' (WebGPU failed)' : ''));
  if (s.status === 'loading') return 'Voice: Loading ' + s.progress + '%';
  if (s.status === 'installing') return 'Voice: Installing…';
  return 'Voice: Browser voice';
}

// ---------- the model ----------
/** What to try, in order: fp32 on WebGPU when there is an adapter, then q8 on the CPU (WASM).
 *  - Not q8 on the GPU: its MatMulInteger, ConvInteger and DynamicQuantizeLinear have no WebGPU kernel in onnxruntime-web,
 *    so it runs its heavy math on the CPU anyway (measured: slower than q8 on WASM).
 *  - Not fp16 (9 Nov 2026): on Leon's RDNA 4 (shader-f16) Kokoro "played" as muffled buzzing, and fp16 on WebGPU is the
 *    usual cause of that. It can still be forced for a test (localStorage 'phc.voicePlan'); the speech check catches it.
 *  - A GPU whose fp32 warm-up made noise before (remembered per adapter, 'phc.voiceGpuNoise') goes straight to the CPU. */
export function plansFor(gpu: { ok: boolean; f16: boolean; name?: string }, _cached: Set<string> = new Set(), noisy: string | null = gpuNoise()): { device: 'webgpu' | 'wasm'; dtype: 'fp32' | 'fp16' | 'q8' }[] {
  if (!gpu.ok || (noisy && noisy === (gpu.name || ''))) return [{ device: 'wasm', dtype: 'q8' }];
  return [{ device: 'webgpu', dtype: 'fp32' }, { device: 'wasm', dtype: 'q8' }];
}
/** The adapter whose GPU voice made noise (so it isn't tried again), or null. */
export const gpuNoise = (): string | null => { try { return localStorage.getItem('phc.voiceGpuNoise'); } catch { return null; } };
const setGpuNoise = (name: string | null) => { try { if (name == null) localStorage.removeItem('phc.voiceGpuNoise'); else localStorage.setItem('phc.voiceGpuNoise', name); } catch { /* */ } };
/** Is there a WebGPU adapter, and what is it? (Chrome and Edge on Windows: the GPU's D3D12 adapter.) */
export interface Gpu { ok: boolean; why: string; name: string; f16: boolean }
export async function gpuInfo(): Promise<Gpu> {
  const nav: any = typeof navigator !== 'undefined' ? navigator : null;
  if (!nav || !nav.gpu) return { ok: false, why: 'no WebGPU in this browser', name: '', f16: false };
  try {
    const a = await nav.gpu.requestAdapter({ powerPreference: 'high-performance' });
    if (!a) return { ok: false, why: 'WebGPU has no adapter (GPU blocked or no driver)', name: '', f16: false };
    const i = a.info || (a.requestAdapterInfo ? await a.requestAdapterInfo().catch(() => ({})) : {});
    const name = [i.vendor, i.architecture, i.description].filter(Boolean).join(' ').trim() || 'GPU';
    return { ok: true, why: '', name, f16: a.features.has('shader-f16') };
  } catch (e) { return { ok: false, why: 'WebGPU adapter error: ' + ((e as Error).message || e), name: '', f16: false }; }
}
/** Settings, before installing: which device Kokoro would use here and how big the download is (MB). */
export async function probeVoice(): Promise<void> {
  if (state.planMB) return;
  const stub = (globalThis as any).__phcVoiceRuntime;
  const [gpu] = await Promise.all([(stub?.gpuInfo || gpuInfo)() as Promise<Gpu>, detectInstalled()]);
  const plan = (forced() || plansFor(gpu, cachedSet))[0];
  put({ gpu: gpu.ok ? gpu.name + (gpu.f16 ? ' · shader-f16' : '') : gpu.why, planMB: Math.round(DTYPE_MB[plan.dtype] || MODEL_MB), planDevice: plan.device });
}
/** Which Kokoro weights the browser already keeps (transformers.js's Cache API store), from a list of cached URLs. */
export function cachedWeights(urls: string[]): Set<string> {
  const out = new Set<string>();
  for (const u of urls) if (/Kokoro-82M/i.test(u)) { if (/\/model_quantized\.onnx/.test(u)) out.add('q8'); else if (/\/model_fp16\.onnx/.test(u)) out.add('fp16'); else if (/\/model\.onnx/.test(u)) out.add('fp32'); }
  return out;
}
let cachedSet = new Set<string>(), detectP: Promise<boolean> | null = null;
/** Kokoro already in this browser's cache (an install from before, or the old automatic download): counted as
 *  installed, so it loads on the title screen with no new download. */
export function detectInstalled(): Promise<boolean> {
  return (detectP ||= (async () => {
    try {
      if (typeof caches === 'undefined') return false;
      const keys = await (await caches.open('transformers-cache')).keys();
      cachedSet = cachedWeights(keys.map((k) => k.url));
      if (cachedSet.size && !prefs.install) { setVoicePrefs({ install: true, ready: true }); console.info('[voice] Kokoro found in the browser cache (' + [...cachedSet].join(', ') + '): installed'); }
      return cachedSet.size > 0;
    } catch { return false; }
  })());
}
const msg = (e: unknown) => String((e as any)?.message || e || 'unknown error').replace(/\s+/g, ' ').slice(0, 160);
let ttsP: Promise<any> | null = null;
/** Diagnostics (and the e2e): a plan to force, from localStorage 'phc.voicePlan' ({"device":"wasm","dtype":"q8"}). */
const forced = (): any => { try { const v = JSON.parse(localStorage.getItem('phc.voicePlan') || 'null'); return v && v.device && v.dtype ? [v] : null; } catch { return null; } };

/** Start (or join) loading Kokoro. retry: after a failure, try again from the start. */
export function loadVoice(opts: { retry?: boolean } = {}): Promise<any> {
  if (ttsP && !(opts.retry && state.status === 'failed')) return ttsP;
  put({ status: 'loading', progress: 0, loadedMB: 0, totalMB: 0, error: null, fellBack: null });
  const t0 = performance.now();
  ttsP = (async () => {
    // The e2e stands a fake runtime in (window.__phcVoiceRuntime: the same three functions) so CI never downloads the model.
    const stub = (globalThis as any).__phcVoiceRuntime as typeof import('./voiceRuntime') | undefined;
    const [rt] = await Promise.all([stub || import('./voiceRuntime'), detectInstalled()]);
    const gpu: Gpu = await ((stub as any)?.gpuInfo || gpuInfo)();
    put({ gpu: gpu.ok ? gpu.name + (gpu.f16 ? ' · shader-f16' : '') : gpu.why });
    console.info('[voice] WebGPU: ' + (gpu.ok ? 'adapter ' + gpu.name + ', shader-f16 ' + gpu.f16 : gpu.why));
    let gpuErr: string | null = null, last: unknown = null, triedGpu = false;
    const plans = forced() || plansFor(gpu, cachedSet), isForced = !!forced();
    if (!isForced && gpu.ok && gpuNoise() === gpu.name) { triedGpu = true; gpuErr = 'it made noise, not speech, on this GPU before'; }
    for (const plan of plans) {
      try {
        console.info('[voice] Kokoro: loading ' + plan.dtype + ' on ' + plan.device);
        const tts = await rt.load(plan as any, (p) => {
          const d = downloadProgress(p.loaded, p.total, plan.dtype);
          if (state.status === 'loading') put({ progress: d.pct, loadedMB: d.loadedMB, totalMB: d.totalMB });
        });
        put({ status: 'installing', progress: 100 });
        const w = await rt.check(tts, prefs.voice && isKokoroKey(prefs.voice) ? prefs.voice : 'af_heart');
        put({ status: 'ready', device: plan.device as any, dtype: plan.dtype, fellBack: plan.device === 'wasm' && triedGpu ? gpuErr || 'WebGPU failed' : null, likeness: (w as any).likeness ?? null, forced: isForced });
        if (!prefs.ready) setVoicePrefs({ ready: true });
        console.info('[voice] Kokoro ready on ' + (plan.device === 'webgpu' ? 'WebGPU (' + gpu.name + ')' : 'the CPU (WASM)') + ', ' + plan.dtype + ', in ' + Math.round((performance.now() - t0) / 100) / 10 + ' s; warm-up ' + w.ms + ' ms; sounds like speech: ' + ((w as any).likeness != null ? (w as any).likeness.toFixed(2) : '?')
          + (plan.device === 'wasm' && triedGpu ? '; WebGPU failed: ' + gpuErr : ''));
        return tts;
      } catch (e) {
        last = e; if (plan.device === 'webgpu') { triedGpu = true; if (!gpuErr) gpuErr = msg(e); if ((e as any)?.name === 'VoiceNoise' && !isForced) setGpuNoise(gpu.name || ''); }
        console.warn('[voice] Kokoro ' + plan.dtype + ' on ' + plan.device + ' failed: ' + msg(e), e);
      }
    }
    throw last || new Error('no way to run Kokoro here');
  })().catch((e) => { put({ status: 'failed', error: msg(e) }); return null; });
  return ttsP;
}
/** Settings › VOICE "Render on GPU | Render on CPU" (Leon, 9 Nov 2026: a player picks; an NVIDIA laptop runs the GPU
 *  well, his RDNA 4 desktop buzzes). 'cpu' keeps Kokoro on the CPU from now on (localStorage 'phc.voicePlan');
 *  'gpu' (or 'auto') goes back to the GPU first, forgetting a GPU remembered as noisy; the speech check still guards it
 *  and the CPU still takes over if the GPU makes noise. Reloads the voice when it is installed or loaded; before the
 *  install it only changes what the install will download. */
export function setVoiceDevice(which: 'cpu' | 'gpu' | 'auto'): Promise<any> {
  try { if (which === 'cpu') localStorage.setItem('phc.voicePlan', JSON.stringify({ device: 'wasm', dtype: 'q8' })); else localStorage.removeItem('phc.voicePlan'); } catch { /* */ }
  if (which !== 'cpu') setGpuNoise(null);
  put({ forced: which === 'cpu', planMB: 0 });
  if (!prefs.install && state.status === 'idle') return probeVoice();
  stopVoice(); ttsP = null; cache.clear();
  return loadVoice({ retry: true });
}
/** The player's choice in Settings: 'cpu' when the CPU is forced, else 'gpu' (the GPU first, the CPU as the fallback). */
export const voiceRender = (): 'gpu' | 'cpu' => { const f = forced(); return f && f[0].device === 'wasm' ? 'cpu' : 'gpu'; };
/** The Settings button: opt in, remember it, start the download. */
export function installVoice(): Promise<any> { setVoicePrefs({ install: true }); return loadVoice({ retry: true }); }

// ---------- playback ----------
let ctx: AudioContext | null = null, gain: GainNode | null = null, sources: AudioBufferSourceNode[] = [], run = 0;
const audio = () => {
  if (!ctx) { ctx = new AudioContext(); gain = ctx.createGain(); gain.gain.value = prefs.volume / 100; gain.connect(ctx.destination); }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
};
if (typeof window !== 'undefined') window.addEventListener('pointerdown', () => { if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {}); }, { capture: true });
const cache = new Map<string, AudioBuffer[]>();

export function stopVoice() {
  run++; for (const s of sources) { try { s.stop(); } catch { /* */ } } sources = [];
  try { speechSynthesis.cancel(); } catch { /* */ }
  if (state.speaking) put({ speaking: null });
}

/** Hold a new line back until its voice is ready (the screen shows the Narrator gathering their voice). */
export const hold = (id: string) => put({ held: [...state.held, id] });
const release = (id: string) => { if (state.held.includes(id)) put({ held: state.held.filter((x) => x !== id) }); };

/** Kokoro is wanted for this voice: a Kokoro voice, and the player has installed it (or it is loading or ready). */
const kokoroWanted = (voice: string) => !isBrowserKey(voice) && (prefs.install || state.status !== 'idle');

/**
 * Speak a line. Plays sentence by sentence; a new line stops the one before. The line is held (its text hidden while
 * the Narrator "gathers their voice") until the first sound, at most FIRST_SENTENCE_MS.
 * onFirst: called with the time to the first audio (the Test voice readout).
 */
export async function speak(id: string, text: string, voice = prefs.voice, onFirst?: (ms: number, engine: 'kokoro' | 'browser', device: string) => void) {
  stopVoice();
  const my = run, clean = text.replace(/[*_#>]/g, '').replace(/\s+/g, ' ').trim(), t0 = performance.now();
  if (!clean) { release(id); return; }
  put({ speaking: id });
  const done = () => { if (run === my) put({ speaking: null }); };
  const viaBrowser = (who: string) => { release(id); browserVoice(clean, my, done, isBrowserKey(voice) ? voice.slice(BROWSER.length) : null, who, (ms, dev) => onFirst?.(ms, 'browser', dev)); };
  // A browser voice the player picked, or Kokoro not installed: the browser reads it, no download, no waiting.
  if (!kokoroWanted(voice)) return viaBrowser(isBrowserKey(voice) ? 'picked' : 'Kokoro not installed');
  const ckey = id + '|' + voice + '|' + prefs.speed, cached = cache.get(ckey);
  if (cached) { release(id); const ms = playBuffers(cached, my, done); onFirst?.(Math.round(performance.now() - t0 + ms), 'kokoro', deviceWord()); return; }
  const waiting = waitForKokoro();
  // Waiting for Kokoro: the text shows after FIRST_SENTENCE_MS, the audio follows when it's made.
  const showText = waiting ? setTimeout(() => { if (run === my) { console.info('[voice] Kokoro is late: the text shows, its audio follows'); release(id); } }, FIRST_SENTENCE_MS) : null;
  const tts = await (waiting ? loadVoice() : Promise.race([loadVoice(), new Promise((r) => setTimeout(() => r('late'), LOAD_WAIT_MS))]));
  if (run !== my) { if (showText) clearTimeout(showText); return; }
  if (!tts || tts === 'late') { if (showText) clearTimeout(showText); return viaBrowser(tts === 'late' ? 'Kokoro still loading' : 'Kokoro failed'); }
  const ac = audio(), bufs: AudioBuffer[] = [];
  let at = ac.currentTime + 0.05, first = true;
  // Not waiting: a device too slow to make the first sentence in time shows the line and lets the browser voice read it.
  const slow = waiting ? null : setTimeout(() => { if (first && run === my) { console.info('[voice] first sentence too slow; the browser voice reads this line'); run++; const me = run; put({ speaking: id }); release(id); browserVoice(clean, me, () => { if (run === me) put({ speaking: null }); }, null, 'Kokoro too slow'); } }, FIRST_SENTENCE_MS);
  const clear = () => { if (slow) clearTimeout(slow); if (showText) clearTimeout(showText); };
  try {
    for await (const chunk of (tts as any).stream(clean, { voice, speed: prefs.speed })) {
      if (run !== my) { clear(); return; }
      const a = chunk.audio, b = ac.createBuffer(1, a.audio.length, a.sampling_rate); b.copyToChannel(a.audio, 0); bufs.push(b);
      if (first) {
        first = false; clear(); release(id); at = Math.max(at, ac.currentTime + 0.05);
        const ms = Math.round(performance.now() - t0); console.info('[voice] first audio in ' + ms + ' ms (Kokoro · ' + deviceWord() + ')'); onFirst?.(ms, 'kokoro', deviceWord());
      }
      at = schedule(b, at, my);
    }
    cache.set(ckey, bufs); if (cache.size > 40) cache.delete(cache.keys().next().value!);
    const left = Math.max(0, at - ac.currentTime);
    setTimeout(() => { if (run === my) done(); }, left * 1000 + 50);
  } catch (e) { clear(); console.warn('[voice] Kokoro failed on this line', e); release(id); if (run === my) browserVoice(clean, my, done, null, 'Kokoro error'); }
}
const deviceWord = () => (state.device === 'webgpu' ? 'WebGPU' : state.device === 'wasm' ? 'CPU' : '?');
function schedule(b: AudioBuffer, at: number, my: number): number {
  const ac = audio(); if (run !== my) return at;
  const s = ac.createBufferSource(); s.buffer = b; s.connect(gain!); s.start(at); sources.push(s);
  return at + b.duration + 0.12;
}
function playBuffers(bufs: AudioBuffer[], my: number, done: () => void): number {
  const ac = audio(), start = ac.currentTime + 0.05; let at = start;
  for (const b of bufs) at = schedule(b, at, my);
  setTimeout(() => { if (run === my) done(); }, (at - ac.currentTime) * 1000 + 50);
  return (start - ac.currentTime) * 1000;
}
/** The browser's own voice: instant, free. The one the player picked, else the best natural one available. */
function browserVoice(text: string, my: number, done: () => void, name: string | null, why: string, onFirst?: (ms: number, device: string) => void) {
  try {
    const u = new SpeechSynthesisUtterance(text), t0 = performance.now(); u.volume = prefs.volume / 100; u.rate = prefs.speed;
    const all = speechSynthesis.getVoices(), pick = (name && all.find((v) => v.name === name)) || (() => { const b = bestVoice(all); return b ? all.find((v) => v.name === b.name) : null; })();
    if (pick) { try { u.voice = pick; } catch { /* not a SpeechSynthesisVoice: keep the language */ } u.lang = pick.lang; }
    console.info('[voice] browser voice (' + why + '): ' + (pick ? pick.name : 'the default'));
    u.onstart = () => { const ms = Math.round(performance.now() - t0); console.info('[voice] first audio in ' + ms + ' ms (browser voice)'); onFirst?.(ms, pick ? pick.name : 'browser default'); };
    u.onend = () => { if (run === my) done(); }; u.onerror = () => { if (run === my) done(); };
    speechSynthesis.speak(u);
  } catch { done(); }
}

/** Settings' "Test voice": one sample line in the Narrator's voice; the device and the time to the first audio are shown
 *  (and logged). */
export function testVoice(voice = prefs.voice): Promise<VoiceTest> {
  return new Promise((resolve) => {
    put({ test: null });
    speak('test:' + Date.now(), SAMPLE_LINE, voice, (ms, engine, device) => {
      const t: VoiceTest = { engine, device, ms, voice: voiceLabel(voice) };
      console.info('[voice] Test voice: ' + (engine === 'kokoro' ? 'Kokoro · ' + device + ' (' + state.dtype + ')' : 'browser voice · ' + device) + ' · first audio in ' + ms + ' ms');
      put({ test: t }); resolve(t);
    });
  });
}

// Diagnostics in the console (and the e2e): window.__phcVoice.state(), .test(), .load(), .device('cpu' | 'gpu').
if (typeof window !== 'undefined') (window as any).__phcVoice = { state: () => state, prefs: () => prefs, chip: () => voiceChip(), say: (id: string, text: string) => { hold(id); return speak(id, text); }, test: testVoice, load: loadVoice, device: (w: 'cpu' | 'gpu' | 'auto') => setVoiceDevice(w), voices: () => rankVoices(bvoices) };

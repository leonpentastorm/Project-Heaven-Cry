// The Kokoro runtime, loaded on demand by game/voice.ts (so the model code and the 21 MB ONNX binary stay out of the
// first page load and out of the unit tests). Two of the fixes for "Kokoro never plays" live here:
//   - the ONNX runtime binary comes from this site (Vite emits it; the alias is in vite.config.ts), not from the
//     jsDelivr CDN that transformers.js points at by default (blocked by some networks and content blockers);
//   - every model is warmed up and its audio checked (not silent, no NaN) before it is called ready, so a WebGPU
//     build that "loads" but sings garbage is caught and the next plan is tried.
import { KokoroTTS } from 'kokoro-js';
import { env } from '@huggingface/transformers';
import ortWasm from '@ort/ort-wasm-simd-threaded.jsep.wasm?url';

export const MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX';
export interface Plan { device: 'webgpu' | 'wasm'; dtype: 'fp32' | 'fp16' | 'q8' | 'q4' | 'q4f16' }
export interface Progress { loaded: number; total: number }

// The binary from this origin; the JS glue is already in the bundle (no .mjs fetch).
(env.backends.onnx as any).wasm.wasmPaths = { wasm: new URL(ortWasm, location.href).href };
// Cache the model in the browser (the Cache API): downloaded once, then a few seconds to load.
env.useBrowserCache = true;
// The model comes through this site's Worker (/hf/…), not from Hugging Face directly: testers' browsers failed to fetch it
// there (blocked networks, content blockers). Same files, same cache keys by file name.
env.remoteHost = new URL('/hf/', location.href).href;
// kokoro-js fetches its voice files (voices/<id>.bin) from Hugging Face with its own code: send those through /hf/ too.
const HF_KOKORO = /^https:\/\/huggingface\.co\/(onnx-community\/Kokoro-82M-v1\.0-ONNX\/resolve\/.+)$/;
const realFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
  const u = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, m = u.match(HF_KOKORO);
  return realFetch(m ? new URL('/hf/' + m[1], location.href).href : input, init);
}) as typeof fetch;
env.allowLocalModels = false;

/** Load one plan, reporting bytes downloaded across the model's files. */
export async function load(plan: Plan, onProgress: (p: Progress) => void): Promise<KokoroTTS> {
  const files: Record<string, Progress> = {};
  return KokoroTTS.from_pretrained(MODEL_ID, {
    dtype: plan.dtype, device: plan.device,
    progress_callback: (p: any) => {
      if (!p || !p.file) return;
      if (p.status === 'progress' && typeof p.total === 'number') files[p.file] = { loaded: p.loaded || 0, total: p.total };
      else if (p.status === 'done' && files[p.file]) files[p.file] = { ...files[p.file], loaded: files[p.file].total };
      const v = Object.values(files); onProgress({ loaded: v.reduce((a, b) => a + b.loaded, 0), total: v.reduce((a, b) => a + b.total, 0) });
    },
  });
}

/** Warm up (compiles the GPU shaders once) and check the sound is sound: real samples, not silence, no NaN. */
export async function check(tts: KokoroTTS, voice = 'af_heart'): Promise<{ ms: number; seconds: number }> {
  const t0 = performance.now();
  const out: any = await tts.generate('Ready.', { voice: voice as any });
  const a: Float32Array = out.audio, ms = Math.round(performance.now() - t0);
  let peak = 0, bad = 0;
  for (let i = 0; i < a.length; i++) { const x = a[i]; if (!Number.isFinite(x)) bad++; else if (Math.abs(x) > peak) peak = Math.abs(x); }
  if (!a.length) throw new Error('the model made no audio');
  if (bad) throw new Error('the model made broken audio (' + bad + ' NaN samples)');
  if (peak < 1e-3) throw new Error('the model made silence');
  return { ms, seconds: a.length / out.sampling_rate };
}

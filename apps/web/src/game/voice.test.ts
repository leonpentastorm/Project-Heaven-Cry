// The Narrator's voice, picking and ordering: natural browser voices first, Edge detection, saved preferences (old and
// new shapes in phc.voice), the "Wait for Kokoro" default, the WebGPU-first plans, and the download readout.
import { describe, expect, it } from 'vitest';
import {
  rankVoices, voiceGroups, bestVoice, isEdgeNatural, isGoogle, voiceScore, parsePrefs, waitForKokoro, plansFor, cachedWeights, downloadProgress,
  voiceChip, browserKey, isBrowserKey, voiceLabel, DEFAULT_PREFS, CORE_VOICE, type BVoice, type VoiceState,
} from './voice';

const V = (name: string, lang = 'en-US', localService = true): BVoice => ({ name, lang, localService });
const CHROME: BVoice[] = [V('Microsoft David - English (United States)'), V('Google UK English Female', 'en-GB', false), V('Google US English', 'en-US', false), V('Google Deutsch', 'de-DE', false), V('Microsoft Zira - English (United States)')];
const EDGE: BVoice[] = [V('Microsoft David - English (United States)'), V('Microsoft Aria Online (Natural) - English (United States)', 'en-US', false), V('Microsoft Sonia Online (Natural) - English (United Kingdom)', 'en-GB', false), V('Microsoft Zira - English (United States)'), V('Microsoft Katja Online (Natural) - German (Germany)', 'de-DE', false)];

describe('browser voices: natural first', () => {
  it('knows Edge natural and Google voices by name', () => {
    expect(isEdgeNatural(EDGE[1])).toBe(true); expect(isEdgeNatural(EDGE[0])).toBe(false);
    expect(isGoogle(CHROME[2])).toBe(true); expect(isGoogle(CHROME[0])).toBe(false);
    expect(voiceScore(EDGE[1])).toBeGreaterThan(voiceScore(CHROME[2]));
    expect(voiceScore(CHROME[2])).toBeGreaterThan(voiceScore(CHROME[0]));
  });
  it('orders English voices natural first and drops other languages', () => {
    expect(rankVoices(CHROME).map((v) => v.name)).toEqual(['Google US English', 'Google UK English Female', 'Microsoft David - English (United States)', 'Microsoft Zira - English (United States)']);
    expect(rankVoices(EDGE)[0].name).toMatch(/Aria Online \(Natural\)/);
    expect(rankVoices(EDGE).some((v) => /German/.test(v.name))).toBe(false);
  });
  it('the fallback is the best natural voice, not the default', () => {
    const list = [{ ...CHROME[0], default: true }, ...CHROME.slice(1)];
    expect(bestVoice(list)!.name).toBe('Google US English');
    expect(bestVoice(EDGE)!.name).toMatch(/Aria Online/);
    expect(bestVoice(EDGE, 1)!.name).toMatch(/Sonia Online/); // the next best, for a skill voice
    expect(bestVoice([])).toBeNull();
  });
  it('groups: Edge natural voices only when the browser has them (Edge)', () => {
    const e = voiceGroups(EDGE), c = voiceGroups(CHROME);
    expect(e.hasEdge).toBe(true); expect(e.edge.map((v) => v.name.split(' ')[1])).toEqual(['Aria', 'Sonia']);
    expect(e.browser.every((v) => !isEdgeNatural(v))).toBe(true);
    expect(c.hasEdge).toBe(false); expect(c.edge).toEqual([]); expect(c.browser[0].name).toBe('Google US English');
    expect(e.kokoro.length).toBe(7);
  });
});

describe('saved preferences (phc.voice)', () => {
  it('reads an old save (auto, volume, voice) with the new defaults', () => {
    const p = parsePrefs(JSON.stringify({ auto: false, volume: 40, voice: 'bf_emma' }));
    expect(p).toEqual({ ...DEFAULT_PREFS, auto: false, volume: 40, voice: 'bf_emma', skill: { ...CORE_VOICE } });
  });
  it('keeps a browser voice and per-core skill voices, and cleans up nonsense', () => {
    const p = parsePrefs(JSON.stringify({ voice: browserKey('Google US English'), skill: { body: browserKey('Microsoft Aria Online (Natural) - English (United States)'), mind: 'nope', soul: 'af_bella' }, install: true, ready: true, wait: false, volume: 900 }));
    expect(isBrowserKey(p.voice)).toBe(true); expect(voiceLabel(p.voice)).toBe('Google US English');
    expect(p.skill).toEqual({ body: 'browser:Microsoft Aria Online (Natural) - English (United States)', mind: CORE_VOICE.mind, soul: 'af_bella' });
    expect(p.install).toBe(true); expect(p.wait).toBe(false); expect(p.volume).toBe(100);
    expect(parsePrefs('{not json').voice).toBe('af_heart');
    expect(parsePrefs(JSON.stringify({ voice: 'browser:' })).voice).toBe('af_heart');
  });
});

describe('Wait for Kokoro', () => {
  it('is on by default once Kokoro is installed, and the player can turn it either way', () => {
    expect(waitForKokoro({ ...DEFAULT_PREFS })).toBe(false);
    expect(waitForKokoro({ ...DEFAULT_PREFS, ready: true })).toBe(true);
    expect(waitForKokoro({ ...DEFAULT_PREFS, ready: true, wait: false })).toBe(false);
    expect(waitForKokoro({ ...DEFAULT_PREFS, ready: false, wait: true })).toBe(true);
  });
});

describe('the model: WebGPU first, the CPU only on a real error', () => {
  it('WebGPU when there is an adapter (fp32: q8 has no WebGPU kernels), fp16 next with shader-f16, the CPU last', () => {
    expect(plansFor({ ok: true, f16: true })).toEqual([{ device: 'webgpu', dtype: 'fp32' }, { device: 'webgpu', dtype: 'fp16' }, { device: 'wasm', dtype: 'q8' }]);
    expect(plansFor({ ok: true, f16: false })).toEqual([{ device: 'webgpu', dtype: 'fp32' }, { device: 'wasm', dtype: 'q8' }]);
    expect(plansFor({ ok: false, f16: false })).toEqual([{ device: 'wasm', dtype: 'q8' }]);
  });
  it('weights already in the cache go first (no second download)', () => {
    const cached = cachedWeights(['https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/onnx/model.onnx', 'https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/voices/af_heart.bin']);
    expect([...cached]).toEqual(['fp32']);
    expect(plansFor({ ok: true, f16: true }, cached)[0]).toEqual({ device: 'webgpu', dtype: 'fp32' });
    expect(plansFor({ ok: true, f16: true }, new Set(['fp16']))[0]).toEqual({ device: 'webgpu', dtype: 'fp16' });
    expect([...cachedWeights(['https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/onnx/model_quantized.onnx'])]).toEqual(['q8']);
    expect(cachedWeights(['https://example.com/other/model.onnx']).size).toBe(0);
  });
  it('the download bar measures the whole model: a small file done first is not 100%', () => {
    expect(downloadProgress(44, 44, 'q8').pct).toBe(0);
    const half = downloadProgress(46.4e6, 92.4e6, 'q8');
    expect(half.pct).toBe(49); expect(half.loadedMB).toBe(46.4); expect(half.totalMB).toBe(92.9);
    expect(downloadProgress(326e6, 326e6, 'fp32').pct).toBe(100);
  });
});

describe('the play screen chip', () => {
  const S = (p: Partial<VoiceState>): VoiceState => ({ status: 'idle', progress: 0, loadedMB: 0, totalMB: 0, device: null, dtype: null, gpu: '', fellBack: null, error: null, speaking: null, held: [], test: null, planMB: 0, planDevice: null, ...p });
  it('says who reads, in words', () => {
    expect(voiceChip(S({ status: 'ready', device: 'webgpu' }), DEFAULT_PREFS)).toBe('Voice: Kokoro · WebGPU');
    expect(voiceChip(S({ status: 'ready', device: 'wasm' }), DEFAULT_PREFS)).toBe('Voice: Kokoro · CPU');
    expect(voiceChip(S({ status: 'ready', device: 'wasm', fellBack: 'device lost' }), DEFAULT_PREFS)).toBe('Voice: Kokoro · CPU (WebGPU failed)');
    expect(voiceChip(S({ status: 'loading', progress: 42 }), DEFAULT_PREFS)).toBe('Voice: Loading 42%');
    expect(voiceChip(S({ status: 'failed' }), DEFAULT_PREFS)).toBe('Voice: Browser voice');
    expect(voiceChip(S({ status: 'ready', device: 'webgpu' }), { ...DEFAULT_PREFS, voice: browserKey('Google US English') })).toBe('Voice: Browser voice');
  });
});

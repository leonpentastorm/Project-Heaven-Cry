// Makes apps/web/src/game/voiceReference.json: the fingerprint Kokoro's warm-up check compares against (voiceCheck.ts).
// It runs the fp32 Kokoro model on the CPU (onnxruntime-node, downloaded from Hugging Face on first run) for the check
// line in the check voice, and keeps the spectral shape of its loud frames. Run from the repo root:
//   node tools/voice_reference.mjs            (writes the reference)
//   node tools/voice_reference.mjs --report   (also scores q8 on the CPU against it, as a sanity check)
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(new URL('..', import.meta.url).pathname);
const out = mkdtempSync(join(tmpdir(), 'phc-voice-'));
execFileSync(join(root, 'node_modules/.bin/esbuild'), [join(root, 'apps/web/src/game/voiceCheck.ts'), '--bundle', '--format=esm', '--platform=node', '--loader:.json=json', '--outfile=' + join(out, 'voiceCheck.mjs')], { stdio: 'inherit' });
const VC = await import(pathToFileURL(join(out, 'voiceCheck.mjs')).href);
const { KokoroTTS } = await import(pathToFileURL(join(root, 'node_modules/kokoro-js/dist/kokoro.js')).href);

const fp32 = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'fp32', device: 'cpu' });
const ref = await fp32.generate(VC.CHECK_TEXT, { voice: VC.CHECK_VOICE });
if (ref.sampling_rate !== 24000) throw new Error('unexpected sample rate ' + ref.sampling_rate);
const fp = VC.fingerprint(ref.audio);
writeFileSync(join(root, 'apps/web/src/game/voiceReference.json'), JSON.stringify({ text: VC.CHECK_TEXT, voice: VC.CHECK_VOICE, model: 'Kokoro-82M-v1.0 fp32 (CPU)', ...fp }) + '\n');
console.log('reference: ' + fp.frames + ' frames, ' + fp.keep.length + ' loud; self-score ' + VC.speechLikeness(ref.audio, 24000, fp).toFixed(3));
if (process.argv.includes('--report')) {
  const q8 = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'q8', device: 'cpu' });
  const a = await q8.generate(VC.CHECK_TEXT, { voice: VC.CHECK_VOICE });
  writeFileSync(join(out, 'q8.f32'), Buffer.from(a.audio.buffer));
  console.log('q8 on the CPU scores ' + VC.speechLikeness(a.audio, 24000, fp).toFixed(3) + ' (needs ' + VC.SPEECH_MIN + '); its audio: ' + join(out, 'q8.f32'));
}

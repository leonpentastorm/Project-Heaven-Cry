# The Narrator's voice: hand-off (`fix/narrator-voice`)

Branch `fix/narrator-voice`, from `origin/develop` (`cc5c18c`). Pushed to that branch only: not merged, not deployed.

## Why Kokoro fell back to the browser voice

I measured this rather than guessing. Kokoro ran for real in headless Chromium, against the real model from Hugging
Face:
- on the CPU (WASM);
- on WebGPU, through Chromium's software adapter (SwiftShader).

I can't run the 9070 XT from here, so a check list for it follows below.

The cause is not the GPU. Six things together sent almost every line to the browser voice:

1. **A WebGPU machine downloaded 326 MB, not 90.**
   - The old code asked for `fp32` whenever WebGPU had an adapter. That is `onnx/model.onnx`, **325.5 MB**.
   - The "about 90 MB" figure is the CPU file (`model_quantized.onnx`, q8, 92.4 MB).
   - Leon's 9070 XT has an adapter, so it was always the 326 MB download.
2. **The download only started when a session began, and each line gave it 15 s.**
   - `NarratorVoice` started the download when the game left the lobby. The first Narrator line arrives right after.
   - Every line raced `loadVoice()` against 15 s. Until 326 MB had arrived, every line went to the browser voice, and
     on most connections that is minutes.
3. **The first Kokoro line had to compile the GPU shaders.**
   - Nothing warmed the model up, so the first `stream()` on WebGPU paid for shader compilation inside the line.
   - That could miss `FIRST_SENTENCE_MS` (8 s), and the browser voice took that line too.
4. **The ONNX runtime's binary came from jsDelivr.**
   - transformers.js sets `wasmPaths` to `https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/` by
     default, so the 21.6 MB runtime binary (needed for WebGPU and for WASM) was fetched from that CDN.
   - Content blockers, school and corporate networks, and some regions block it. One failed import failed the whole
     load, and the only trace was a `console.warn`.
   - Our build already shipped the same binary, unused. The live Worker serves it correctly: I checked
     `/assets/ort-wasm-simd-threaded.jsep-B0T3yYHD.wasm`, which returns 200, `application/wasm`, 21,596,019 bytes.
5. **The fallback voice was the first English voice found, not the best one.**
   - The code took `en.find(/natural|neural|premium/) || en[0]`. On Chrome that is often a robotic local voice; Chrome's
     "Google …" voices were never preferred.
   - The player had no way to choose.
6. **Nothing on screen said any of this.** The status was a line in the music panel at best.

### The checks the brief asked for

| Check | Finding |
|---|---|
| WebGPU adapter detection | Works. It now asks for a `high-performance` adapter and logs its name and whether it has `shader-f16`. |
| fp32 on WebGPU | **Works**: it loads, and its warm-up audio passes the new check (real samples, no NaN, not silent). It wasn't failing; it was 326 MB plus a cold first run. |
| q8 on WebGPU | Loads, but it is **not really WebGPU**. The q8 file has 148 `MatMulInteger`, 87 `ConvInteger` and 139 `DynamicQuantizeLinear` nodes, and onnxruntime-web 1.22 has no WebGPU kernel for any of them (I checked its operator registry), so they run on the CPU. Measured on the same machine: first audio 19.8 s on "WebGPU q8" against 4.4 s on plain WASM q8. q8 is the CPU's file only. |
| fp16 on WebGPU | Needs `shader-f16`. RDNA 4 should have it in Chrome and Edge on D3D12, but SwiftShader doesn't, so I couldn't test it here. It is tried second (163 MB; see the check list). |
| Model and runtime downloads | Hugging Face redirects the model to `us.aws.cdn.hf.co` (CORS is fine). The runtime binary is now served by this site, and the tests count **0** jsDelivr requests. |
| The 8 s window | Missed for the reasons in points 2 and 3. Install now warms the model up, so the shaders are compiled before the first line. With "Wait for Kokoro" on, the browser voice never takes a line. |

## The fix

- **The ONNX runtime comes from our own site.**
  - `game/voiceRuntime.ts` sets `env.backends.onnx.wasm.wasmPaths = { wasm: <our bundled binary> }`, via a Vite alias,
    `@ort/…wasm?url`. The JS glue is already in our bundle.
  - Result: no CDN. The Worker serves the binary from KV.
- **WebGPU first, the CPU only on a real error.** The plans, in order:

  | When | Plans |
  |---|---|
  | An adapter exists | fp32 on WebGPU (326 MB); then fp16 on WebGPU if the GPU has `shader-f16` (163 MB); then q8 on WASM (92 MB) |
  | No adapter | q8 on WASM (92 MB) |
  | Weights already cached (an earlier download) | Those go first, so nobody downloads twice |

  - Each plan is warmed up and its audio checked before it counts as ready. A plan that throws, or that makes NaN or
    silence, moves on to the next.
  - Every failure is logged as `[voice] Kokoro <dtype> on <device> failed: <reason>`.
  - The CPU fallback says why on screen ("Kokoro on the CPU (WebGPU failed: …)") and in the chip ("Voice: Kokoro ·
    CPU (WebGPU failed)").
- **Installing is visible.** Settings has a VOICE section (`game/voiceSettings.tsx`), and the in-game music panel shows
  the same section in compact form. The states:
  - not installed, with **Install the Narrator's voice (about N MB)**, sized for this device;
  - **Downloading… 42% · 137.0 / 326.0 MB**, with a progress bar;
  - **Installing…**;
  - **Ready · Kokoro on WebGPU (<adapter>)**;
  - **Failed: <reason>**, with **Retry**.

  The bar measures the whole model, so a small file finishing first never reads as 100%.
- **The opt-in is remembered** in `phc.voice` (`install`), and the title screen starts the download or cache load.
  Kokoro no longer downloads by itself at the first session. Anyone whose browser cache already holds the model (the
  old automatic download) is detected and counted as installed.
- **Test voice** speaks one sample line and shows **the device and the time to the first audio**, for example "Kokoro ·
  WebGPU · first audio in 0.06 s". It logs `[voice] Test voice: Kokoro · WebGPU (fp32) · first audio in N ms`.
- **Wait for Kokoro (no browser voice)** is a toggle, on by default once Kokoro has been installed.
  - With it on, a line is held up to 8 s (`FIRST_SENTENCE_MS`, unchanged). After that its text shows and the Kokoro
    audio follows. The browser voice never takes the line.
  - Sentence splitting is unchanged.
- **The play-screen chip** reads "Voice: Kokoro · WebGPU", "Kokoro · CPU", "Browser voice", "Loading 42%" or
  "Installing…". Its tooltip gives the adapter and the weights.
- **Browser voices and Edge voices.** The pickers (Narrator and the three skill voices, Body, Mind and Soul) have three
  groups:
  - **Kokoro**;
  - **Edge natural voices**, only when the browser has Microsoft's "… Online (Natural)" voices;
  - **Browser voices**: English only, natural first ("★"), Chrome's "Google …" voices before the local ones.

  Elsewhere the section says *"Open the game in Edge to use Microsoft's natural voices."*

  Picking a browser voice uses it directly: no download, no waiting. When the browser voice is only the fallback, the
  best natural voice is chosen, not the default.
- **Everything is saved in `phc.voice`.** Old saves (`auto`, `volume`, `voice`) still load. Music ducking and the voice
  volume are unchanged.
- **Credits:** Kokoro's line is kept. Nothing was added for browser voices.

### Files

| File | What |
|---|---|
| `apps/web/src/game/voice.ts` | Voice keys, preferences, ranking, plans, load, speak, wait, test, chip |
| `apps/web/src/game/voiceRuntime.ts` (new) | kokoro-js and transformers env, the same-origin ONNX binary, load with byte progress, warm-up check |
| `apps/web/src/game/voiceSettings.tsx` (new) | The VOICE section |
| `apps/web/src/title/Title.tsx` | Settings shows the VOICE section; the title starts the voice for players who opted in |
| `apps/web/src/game/music.tsx` | The music panel's voice block is the compact VOICE section |
| `apps/web/src/game/narratorVoice.tsx` | Loads Kokoro only for players who installed it |
| `apps/web/src/screens/main.js`, `templates/main.template.html` | The header chip; skill lines use the chosen core voices |
| `apps/web/vite.config.ts` | The `@ort` alias |
| `apps/web/package.json` | `@huggingface/transformers` declared (it was already installed through kokoro-js) |

## What to check on Leon's 9070 XT

1. Use the latest Edge or Chrome. Open `edge://gpu` (or `chrome://gpu`); **WebGPU** should say *Hardware accelerated*.
2. Go to Title › **Settings** › **VOICE**. Before installing, the note should read *"runs on your GPU (WebGPU: amd
   rdna-4 … · shader-f16)"* and the button *"about 326 MB"*. If it says the CPU or "no adapter", WebGPU isn't available
   in that browser: send me that line.
3. Press **Install the Narrator's voice**. You should see:
   - **Downloading… % · MB**;
   - **Installing…**, a few seconds while the GPU compiles its shaders, once;
   - **Ready · Kokoro on WebGPU (amd …)**.
4. Press **▶ Test voice** and send me the readout ("Kokoro · WebGPU · first audio in X s") and the `[voice]` lines from
   the console (F12). They give the adapter, the time to ready, the warm-up in ms and the first audio in ms.
   - Expectation, not measured: a GPU of that class should give its first audio well under a second after warm-up.
   - My only real numbers are from the CPU here (single-threaded WASM): **ready from the cache in 6 s, warm-up 3.4 s,
     first audio 4.36 s**.
5. In a session, the header chip should read **Voice: Kokoro · WebGPU**, and lines should start in Kokoro's voice.
6. **Worth trying, fp16 (half the download).** In the console:
   - Run `localStorage.setItem('phc.voicePlan', JSON.stringify({ device: 'webgpu', dtype: 'fp16' }))`, reload, and use
     Settings › VOICE › Load (or Retry). Then Test voice.
   - If it sounds the same and is as fast, I'll make fp16 the first plan for GPUs with `shader-f16`: 163 MB instead
     of 326.
   - Undo it with `localStorage.removeItem('phc.voicePlan')`.
7. If something fails, Settings shows **Failed: <reason>** and the console has `[voice] Kokoro fp32 on webgpu failed: …`.
   Send those lines.

## Pushback (numbered)

1. **"About 90 MB" is only true without a GPU.** On WebGPU the working weights are fp32, 326 MB, and the button says
   so. If fp16 proves sound on the 9070 XT (check 6), GPUs with `shader-f16` get 163 MB.
2. **The CPU path is single-threaded.** The site isn't cross-origin isolated (no COOP and COEP headers), so the ONNX
   runtime gets one thread.
   - Isolating the site would make CPU Kokoro roughly 3–4× faster.
   - But `require-corp` would break the YouTube embeds. The way through is `COEP: credentialless` plus
     `<iframe credentialless>`.
   - That is a separate change: worth it for CPU-only players, not needed for Leon's GPU.
3. **Kokoro no longer downloads without being asked.** Players hear the best natural browser voice until they press
   Install. Anyone who already had it cached is installed automatically.

## Screenshots (`docs/design/handoffs/narrator-voice-shots/`)

| File | What |
|---|---|
| `voice-settings.png` | Settings › VOICE: Ready on WebGPU, both toggles, the grouped pickers, the skill voices, the Test voice readout |
| `voice-downloading.png` | Downloading… 39% · 130.2 / 326.0 MB, with the bar |
| `voice-failed.png` | Failed: <reason>, with Retry, and which browser voice reads meanwhile |
| `voice-cpu-fallback.png` | Ready · Kokoro on the CPU (WebGPU failed: …), in a browser without Edge voices (the Edge note shows) |
| `voice-chip.png` | The play screen's header: "Voice: Kokoro · WebGPU" |

## Tests

| Check | Result |
|---|---|
| `npx tsc --noEmit` in `apps/web` | 0 errors |
| `npm test -w @phc/web` | 41 files, **302 passed** |
| New unit tests, `src/game/voice.test.ts` (11) | Natural first, Edge and Google detection, Edge group only with Edge voices, the best voice as the fallback, old and new `phc.voice` saves, the Wait default, WebGPU-first plans, cache reuse, the download bar, the chip |
| `npm run build` | Built |
| **`node apps/web/e2e/voice.mjs`** | **35 ok, 0 FAIL**. `speechSynthesis` is mocked with Edge "(Natural)" voices, and the Kokoro runtime is a stand-in, so nothing is downloaded. It covers: the VOICE section and its groups; the order; the best natural fallback; picking a browser voice (saved and used, no download); per-core skill voices; Downloading with MB and %; Failed with its reason, then Retry; Ready on WebGPU; the remembered opt-in; Wait on by default; Test voice with device and time; the title starting the voice; the chip (Loading %, Kokoro · WebGPU, Browser voice); a non-Edge browser (no Edge group, the note); a late line (held, text at 8.0 s, 0 browser utterances, the Kokoro audio after); a real WebGPU error (CPU, said in Settings and the chip) |
| Regression e2e | `playscreen` 10/10, `slate-music` 17/17, `sandbox` 27/27, `tabs` 28/28 |
| Real model, headless Chromium (measuring only, not part of the suite) | WASM q8: ready in 11 s on first download, 6 s from the cache; first audio 4.36 s. SwiftShader WebGPU fp32: 325.5 MB, correct audio. SwiftShader WebGPU q8: correct audio but CPU-bound, as explained above. All with 0 jsDelivr requests. |

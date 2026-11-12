// The Narrator's voice (fix/narrator-voice): Settings' VOICE section, the voice groups (Kokoro, Edge natural voices,
// browser voices), picking a browser voice, the best natural voice as the fallback, installing Kokoro (progress in MB
// and %, Failed + Retry, Installing…, Ready), Test voice (device and time to the first audio), Wait for Kokoro, and the
// play screen's chip. speechSynthesis is mocked (with an Edge "(Natural)" voice) and the Kokoro runtime is a stand-in
// (window.__phcVoiceRuntime), so nothing is downloaded here.
import { chromium, click, BASE, settle } from './lib.mjs';
const browser = await chromium.launch();
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const SHOTS = process.env.SHOTS;

/** Before the app: mocked browser voices, and a Kokoro runtime that "downloads" 92.4 MB in steps (or fails once). */
const init = ({ edge }) => {
  try { sessionStorage.setItem('phc.pressedAnyKey', '1'); localStorage.setItem('phc.tips', '["*"]'); } catch { /* */ }
  const list = [
    ...(edge ? [{ name: 'Microsoft Aria Online (Natural) - English (United States)', lang: 'en-US', localService: false }, { name: 'Microsoft Sonia Online (Natural) - English (United Kingdom)', lang: 'en-GB', localService: false }] : []),
    { name: 'Google US English', lang: 'en-US', localService: false }, { name: 'Google UK English Female', lang: 'en-GB', localService: false },
    { name: 'Microsoft David - English (United States)', lang: 'en-US', localService: true, default: true }, { name: 'Google Deutsch', lang: 'de-DE', localService: false },
  ].map((v) => ({ voiceURI: v.name, default: false, ...v }));
  window.__spoken = [];
  // The utterance too: a real one only takes the browser's own SpeechSynthesisVoice objects.
  window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; this.voice = null; this.lang = ''; this.volume = 1; this.rate = 1; } };
  const synth = window.speechSynthesis;
  synth.getVoices = () => list;
  synth.speak = (u) => { window.__spoken.push({ text: u.text, voice: u.voice ? u.voice.name : null }); setTimeout(() => u.onstart && u.onstart(), 30); setTimeout(() => u.onend && u.onend(), 120); };
  synth.cancel = () => {};
  setTimeout(() => synth.dispatchEvent(new Event('voiceschanged')), 50);
  // The Kokoro stand-in: the same three functions as game/voiceRuntime.ts.
  // __voiceFail: 'all' (every plan fails), 'webgpu' (only the GPU plans: a real WebGPU error), 'noise' (the GPU warms up
  // but makes noise, not speech), or null.
  window.__voiceFail = null; window.__voiceStepMs = 120;
  const audio = () => ({ audio: new Float32Array(4800).fill(0.2), sampling_rate: 24000 });
  window.__phcVoiceRuntime = {
    gpuInfo: async () => ({ ok: true, why: '', name: 'Test GPU', f16: true }),
    load: async (plan, onProgress) => {
      const total = plan.dtype === 'fp32' ? 325.5e6 : plan.dtype === 'fp16' ? 163.2e6 : 92.4e6;
      const fails = window.__voiceFail === 'all' || (window.__voiceFail === 'webgpu' && plan.device === 'webgpu');
      for (let i = 0; i <= 10; i++) { onProgress({ loaded: total * i / 10, total }); await new Promise((r) => setTimeout(r, window.__voiceStepMs)); if (fails && i === 4) throw new Error(plan.device === 'webgpu' ? 'WebGPU device lost' : 'the model download was cut off'); }
      return { device: plan.device, stream: async function* () { await new Promise((r) => setTimeout(r, 60)); yield { audio: audio() }; }, generate: async () => audio() };
    },
    // __voiceFail 'noise': the GPU build warms up but its audio isn't speech (Leon's RDNA 4: muffled buzzing).
    check: async (tts) => { if (window.__voiceFail === 'noise' && tts.device === 'webgpu') { const e = new Error('the model made noise, not speech (likeness 0.41, needs 0.88)'); e.name = 'VoiceNoise'; throw e; } return { ms: 5, seconds: 0.2, likeness: 0.97 }; },
  };
};

// ---------- Settings in Edge-like browser ----------
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await ctx.addInitScript(init, { edge: true });
const p = await ctx.newPage();
const errors = []; p.on('pageerror', (e) => errors.push(e.message));
const logs = []; p.on('console', (m) => { if (/\[voice\]/.test(m.text())) logs.push(m.text()); });
await p.goto(BASE);
await click(p, 'SETTINGS', { exact: true, timeout: 60000 }); await p.getByRole('tab', { name: 'Voice', exact: true }).click(); // the shared settings body (UI pass): Voice tab
const sec = p.locator('[data-phc-voice-settings]');
await sec.waitFor();
ok('Settings has a Voice tab with the voice settings', (await p.getByRole('tab', { name: 'Voice', exact: true }).count()) > 0 && (await sec.count()) === 1);
await p.waitForFunction(() => /about \d+ MB/.test(document.querySelector('[data-voice-install]')?.textContent || ''), null, { timeout: 5000 }).catch(() => {});
ok('Kokoro: not installed, with the Install button sized for this device (' + await sec.locator('[data-voice-install]').textContent() + ')', /not installed/.test(await sec.textContent()) && /Install the Narrator's voice \(about 326 MB\)/.test(await sec.locator('[data-voice-install]').textContent()) && /your GPU \(WebGPU: Test GPU/.test(await sec.textContent()));
// Render by GPU | Render by CPU (Leon, 9 Nov 2026): before the install it changes what the install downloads.
ok('Render by GPU is picked by default', (await sec.locator('[data-voice-render="gpu"]').getAttribute('aria-pressed')) === 'true' && (await sec.locator('[data-voice-render="cpu"]').getAttribute('aria-pressed')) === 'false');
await sec.locator('[data-voice-render="cpu"]').click();
await p.waitForFunction(() => /about 92 MB/.test(document.querySelector('[data-voice-install]')?.textContent || ''), null, { timeout: 5000 }).catch(() => {});
ok('Render by CPU: the install is the CPU one (' + await sec.locator('[data-voice-install]').textContent() + ')', /about 92 MB/.test(await sec.locator('[data-voice-install]').textContent()) && (await sec.locator('[data-voice-render="cpu"]').getAttribute('aria-pressed')) === 'true');
await sec.locator('[data-voice-render="gpu"]').click();
await p.waitForFunction(() => /about 326 MB/.test(document.querySelector('[data-voice-install]')?.textContent || ''), null, { timeout: 5000 }).catch(() => {});
ok('and back to Render by GPU (' + await sec.locator('[data-voice-install]').textContent() + ')', /about 326 MB/.test(await sec.locator('[data-voice-install]').textContent()));
const groups = await sec.locator('[data-voice-select="Narrator voice"] optgroup').evaluateAll((gs) => gs.map((g) => g.label + ':' + g.querySelectorAll('option').length));
ok('the Narrator picker lists Kokoro, Edge natural voices and Browser voices (' + groups.join(', ') + ')', groups.length === 3 && /^Kokoro:7$/.test(groups[0]) && /^Edge natural voices:2$/.test(groups[1]) && /^Browser voices:3$/.test(groups[2]));
const browserOrder = await sec.locator('[data-voice-select="Narrator voice"] optgroup[label="Browser voices"] option').allTextContents();
ok('browser voices natural first, English only (' + browserOrder.join(' | ') + ')', /Google US English/.test(browserOrder[0]) && /Microsoft David/.test(browserOrder.at(-1)) && !browserOrder.some((t) => /Deutsch/.test(t)));
ok('no "open in Edge" note where the Edge voices are', (await sec.locator('[data-voice-edge-note]').count()) === 0);
ok('skill voices: Body, Mind and Soul, each with the same groups', (await sec.locator('[data-voice-select$="skill voice"]').count()) === 3 && (await sec.locator('[data-voice-select="Mind skill voice"] optgroup').count()) === 3);

// Kokoro not installed: the browser voice reads, the best natural one, not the default.
await sec.locator('[data-voice-test]').click();
await sec.locator('[data-voice-test-result]').waitFor({ timeout: 30000 });
let spoken = await p.evaluate(() => window.__spoken.at(-1));
ok('not installed: Test voice uses the best natural browser voice (' + spoken.voice + '), not the default', /Aria Online \(Natural\)/.test(spoken.voice || ''));
ok('and shows it: ' + await sec.locator('[data-voice-test-result]').textContent(), /Browser voice · Microsoft Aria .* · first audio in \d+\.\d\d s/.test(await sec.locator('[data-voice-test-result]').textContent()));

// Pick a browser voice: saved, used, no download.
await sec.locator('[data-voice-select="Narrator voice"]').selectOption('browser:Google US English');
let saved = await p.evaluate(() => JSON.parse(localStorage.getItem('phc.voice')));
ok('picking a browser voice saves it in phc.voice (' + saved.voice + ')', saved.voice === 'browser:Google US English');
await sec.locator('[data-voice-test]').click(); await settle(p, 300);
spoken = await p.evaluate(() => window.__spoken.at(-1));
ok('Test voice speaks with it (' + spoken.voice + ')', spoken.voice === 'Google US English');
ok('nothing was downloaded for it', (await sec.getAttribute('data-voice-status').catch(() => null)) === null && (await sec.locator('[data-voice-status="idle"]').count()) === 1);
await sec.locator('[data-voice-select="Body skill voice"]').selectOption('browser:Microsoft Sonia Online (Natural) - English (United Kingdom)');
saved = await p.evaluate(() => JSON.parse(localStorage.getItem('phc.voice')));
ok('a skill voice is saved per core (Body: ' + saved.skill.body + ')', saved.skill.body === 'browser:Microsoft Sonia Online (Natural) - English (United Kingdom)' && saved.skill.mind === 'bf_emma');
// Voice speed (Leon, 9 Nov 2026): 0.75–1.5×, saved, used by the browser voice (and Kokoro's stream).
await sec.locator('[data-voice-speed]').fill('125');
ok('the speed slider is saved (' + await p.evaluate(() => JSON.parse(localStorage.getItem('phc.voice') || '{}').speed) + '×)', (await p.evaluate(() => JSON.parse(localStorage.getItem('phc.voice') || '{}').speed)) === 1.25 && /1\.25×/.test(await sec.textContent()));

// Install Kokoro: progress, a failure with its reason and Retry, then Installing… and Ready.
await sec.locator('[data-voice-select="Narrator voice"]').selectOption('af_heart');
await p.evaluate(() => { window.__voiceFail = 'all'; window.__voiceStepMs = 150; });
await sec.locator('[data-voice-install]').click();
await sec.locator('[data-voice-status="loading"]').waitFor({ timeout: 30000 });
await settle(p, 350);
const dl = await sec.textContent(), bar = await sec.locator('[role="progressbar"]').getAttribute('aria-valuenow');
ok('downloading: a progress bar with MB and a percentage (' + (dl.match(/Downloading… \d+% · [\d.]+ \/ [\d.]+ MB/) || ['?'])[0] + ', bar ' + bar + ')', /Downloading… \d+% · [\d.]+ \/ 326\.0 MB/.test(dl) && Number(bar) > 0 && Number(bar) < 100);
if (SHOTS) await sec.screenshot({ path: SHOTS + '/voice-downloading.png' });
await sec.locator('[data-voice-status="failed"]').waitFor({ timeout: 30000 });
ok('a failure says why: ' + (await sec.textContent()).match(/Failed: [^.]*/)?.[0], /Failed: the model download was cut off/.test(await sec.textContent()));
ok('the log says which plans failed', logs.some((l) => /Kokoro fp32 on webgpu failed: WebGPU device lost/.test(l)) && logs.some((l) => /Kokoro q8 on wasm failed: the model download was cut off/.test(l)));
if (SHOTS) await sec.screenshot({ path: SHOTS + '/voice-failed.png' });
await p.evaluate(() => { window.__voiceFail = null; window.__voiceStepMs = 60; });
await sec.locator('[data-voice-retry]').click();
await sec.locator('[data-voice-status="ready"]').waitFor({ timeout: 30000 });
ok('Retry: Ready · Kokoro on WebGPU (Test GPU)', /Ready · Kokoro on WebGPU \(Test GPU/.test(await sec.textContent()));
ok('the log says where it runs', logs.some((l) => /Kokoro ready on WebGPU \(Test GPU\), fp32/.test(l)));
saved = await p.evaluate(() => JSON.parse(localStorage.getItem('phc.voice')));
ok('the opt-in is remembered (install ' + saved.install + ', ready ' + saved.ready + ')', saved.install === true && saved.ready === true);
ok('Wait for Kokoro is on by default once installed', (await sec.locator('[data-voice-wait]').getAttribute('aria-pressed')) === 'true');
await sec.locator('[data-voice-test]').click();
await p.waitForFunction(() => /Kokoro/.test(document.querySelector('[data-voice-test-result]')?.textContent || ''), null, { timeout: 30000 });
ok('Test voice: ' + await sec.locator('[data-voice-test-result]').textContent(), /Kokoro · WebGPU · first audio in \d+\.\d\d s/.test(await sec.locator('[data-voice-test-result]').textContent()));
ok('and logs it', logs.some((l) => /Test voice: Kokoro · WebGPU \(fp32\) · first audio in \d+ ms/.test(l)));
if (SHOTS) await p.screenshot({ path: SHOTS + '/voice-settings.png', fullPage: true });
await sec.locator('[data-voice-wait]').click();
saved = await p.evaluate(() => JSON.parse(localStorage.getItem('phc.voice')));
ok('Wait for Kokoro can be turned off (saved: wait ' + saved.wait + ')', saved.wait === false && (await sec.locator('[data-voice-wait]').getAttribute('aria-pressed')) === 'false');
await sec.locator('[data-voice-wait]').click();

// ---------- the play screen's chip ----------
// Opted in: the title starts loading at once (slow here, to catch "Loading N%").
await p.evaluate(() => { window.__voiceStepMs = 400; });
await p.reload(); await p.evaluate(() => { window.__voiceStepMs = 400; });
await p.waitForFunction(() => window.__phcVoice && window.__phcVoice.state().status !== 'idle', null, { timeout: 30000 });
ok('opted in: the title screen starts the voice by itself (' + await p.evaluate(() => window.__phcVoice.state().status) + ')', ['loading', 'installing', 'ready'].includes(await p.evaluate(() => window.__phcVoice.state().status)));
await click(p, 'PROVING GROUND', { timeout: 30000 });
const nm = p.getByPlaceholder('Leon');
await Promise.race([nm.waitFor({ timeout: 8000 }).catch(() => {}), p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 8000 }).catch(() => {})]);
if (await nm.count()) { await nm.fill('Leon'); await click(p, /^Solo ›/); }
const chip = p.locator('[data-phc-voice-chip]');
await chip.waitFor({ timeout: 30000 });
const c1 = await chip.textContent();
ok('the chip while it loads: ' + c1, /^Voice: (Loading \d+%|Installing…|Kokoro · WebGPU)$/.test(c1));
await p.waitForFunction(() => document.querySelector('[data-phc-voice-chip]')?.textContent === 'Voice: Kokoro · WebGPU', null, { timeout: 30000 });
ok('then: Voice: Kokoro · WebGPU', true);
if (SHOTS) { const close = p.getByRole('button', { name: 'Close the tools' }); if (await close.count()) { await close.click(); await settle(p, 400); } await p.locator('header').first().screenshot({ path: SHOTS + '/voice-chip.png' }); }
await p.evaluate(() => { const v = JSON.parse(localStorage.getItem('phc.voice')); v.voice = 'browser:Google US English'; localStorage.setItem('phc.voice', JSON.stringify(v)); });
await p.reload();
await chip.waitFor({ timeout: 30000 });
ok('with a browser voice picked: ' + await chip.textContent(), (await chip.textContent()) === 'Voice: Browser voice');
ok('no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''), !errors.length);
await ctx.close();

// ---------- a browser without Edge's voices ----------
const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await ctx2.addInitScript(init, { edge: false });
const q = await ctx2.newPage();
const logs2 = []; q.on('console', (m) => { if (/\[voice\]/.test(m.text())) logs2.push(m.text()); });
await q.goto(BASE);
await click(q, 'SETTINGS', { exact: true, timeout: 60000 }); await q.getByRole('tab', { name: 'Voice', exact: true }).click(); // the shared settings body (UI pass): Voice tab
const sec2 = q.locator('[data-phc-voice-settings]'); await sec2.waitFor();
const g2 = await sec2.locator('[data-voice-select="Narrator voice"] optgroup').evaluateAll((gs) => gs.map((g) => g.label));
ok('elsewhere: no Edge group (' + g2.join(', ') + ') and the note: "' + await sec2.locator('[data-voice-edge-note]').textContent() + '"', !g2.includes('Edge natural voices') && (await sec2.locator('[data-voice-edge-note]').textContent()) === 'Open the game in Edge to use Microsoft\'s natural voices.');
await sec2.locator('[data-voice-test]').click(); await settle(q, 300);
ok('and the fallback there is Google US English', (await q.evaluate(() => window.__spoken.at(-1).voice)) === 'Google US English');
// Wait for Kokoro: a line held while Kokoro is still loading shows its text after 8 s, the browser voice never takes it,
// and the Kokoro audio follows when the model is ready.
await q.evaluate(() => { localStorage.setItem('phc.voice', JSON.stringify({ ...JSON.parse(localStorage.getItem('phc.voice') || '{}'), install: true, ready: true })); });
await q.reload(); await q.evaluate(() => { window.__voiceStepMs = 1000; window.__spoken = []; });
await q.waitForFunction(() => window.__phcVoice && window.__phcVoice.state().status === 'loading', null, { timeout: 30000 });
const t0 = Date.now();
q.evaluate(() => window.__phcVoice.say('late-1', 'The engine room is dark. Something moves.'));
await settle(q, 1500);
ok('a new line is held while the voice is made (text hidden)', (await q.evaluate(() => window.__phcVoice.state().held)).includes('late-1'));
await q.waitForFunction(() => !window.__phcVoice.state().held.includes('late-1'), null, { timeout: 30000 });
const shownAt = Date.now() - t0, stLate = await q.evaluate(() => window.__phcVoice.state().status);
ok('after about 8 s its text shows though Kokoro is still ' + stLate + ' (' + shownAt + ' ms)', shownAt >= 7500 && shownAt < 10500 && stLate !== 'ready');
await q.waitForFunction(() => window.__phcVoice.state().status === 'ready', null, { timeout: 30000 });
await settle(q, 400);
ok('the browser voice never took it (' + (await q.evaluate(() => window.__spoken.length)) + ' browser utterances)', (await q.evaluate(() => window.__spoken.length)) === 0);
await q.waitForFunction(() => window.__phcVoice.state().speaking === null, null, { timeout: 5000 }).catch(() => {});
ok('and the Kokoro audio followed (' + (logs2.find((l) => /first audio in \d+ ms \(Kokoro/.test(l)) || 'none') + ')', logs2.some((l) => /first audio in \d+ ms \(Kokoro/.test(l)));
// Back to not installed, for the WebGPU failure below.
await q.evaluate(() => { localStorage.setItem('phc.voice', JSON.stringify({ ...JSON.parse(localStorage.getItem('phc.voice') || '{}'), install: false, ready: false })); });
await q.reload();
await click(q, 'SETTINGS', { exact: true, timeout: 60000 }); await q.getByRole('tab', { name: 'Voice', exact: true }).click(); // the shared settings body (UI pass): Voice tab
await sec2.waitFor();

// A real WebGPU error: Kokoro falls back to the CPU and says so (Settings and the chip).
await q.evaluate(() => { window.__voiceFail = 'webgpu'; window.__voiceStepMs = 30; });
await sec2.locator('[data-voice-install]').click();
await sec2.locator('[data-voice-status="ready"]').waitFor({ timeout: 30000 });
ok('WebGPU fails for real: ' + (await sec2.textContent()).match(/Ready · [^.]*\)/)?.[0], /Ready · Kokoro on the CPU \(WebGPU failed: WebGPU device lost\)/.test(await sec2.textContent()));
ok('and the chip says so: ' + await q.evaluate(() => window.__phcVoice.chip()), (await q.evaluate(() => window.__phcVoice.chip())) === 'Voice: Kokoro · CPU (WebGPU failed)');
if (SHOTS) await sec2.screenshot({ path: SHOTS + '/voice-cpu-fallback.png' });

// The GPU makes noise, not speech (9 Nov 2026): the warm-up check catches it, the CPU reads, the GPU is remembered as
// noisy, and Settings offers to try the GPU again; on a GPU that works, "Sounds wrong? Use the CPU" switches.
await q.evaluate(() => { localStorage.removeItem('phc.voiceGpuNoise'); window.__voiceFail = 'noise'; });
await q.evaluate(() => window.__phcVoice.device('gpu'));
await sec2.locator('[data-voice-status="ready"]').waitFor({ timeout: 30000 });
const noiseText = await sec2.textContent();
ok('noise on the GPU: ' + (noiseText.match(/Ready · [^.]*\)/)?.[0] || noiseText.slice(0, 120)), /Ready · Kokoro on the CPU \(WebGPU failed: the model made noise, not speech/.test(noiseText));
ok('the noisy GPU is remembered (' + await q.evaluate(() => localStorage.getItem('phc.voiceGpuNoise')) + ')', (await q.evaluate(() => localStorage.getItem('phc.voiceGpuNoise'))) === 'Test GPU');
ok('after the noise the CPU is ticked and the GPU says it failed (' + await sec2.locator('[data-voice-render="gpu"]').textContent() + ')', (await sec2.locator('[data-voice-render="cpu"]').getAttribute('aria-pressed')) === 'true' && (await sec2.locator('[data-voice-render="gpu"]').getAttribute('aria-pressed')) === 'false' && /failed here/.test(await sec2.locator('[data-voice-render="gpu"]').textContent()) && /Your GPU made noise, not speech, so the CPU reads/.test(await sec2.textContent()));
await q.evaluate(() => { window.__voiceFail = null; });
await sec2.locator('[data-voice-render="gpu"]').click();
await q.waitForFunction(() => /Ready · Kokoro on WebGPU/.test(document.querySelector('[data-phc-voice-settings]')?.textContent || ''), null, { timeout: 10000 }).catch(() => {});
ok('Render by GPU again: back on WebGPU, the check passed (' + ((await sec2.textContent()).match(/Warm-up check[^)]*\)/)?.[0] || '?') + ')', /Ready · Kokoro on WebGPU/.test(await sec2.textContent()) && /sounds like speech \(97%\)/.test(await sec2.textContent()) && (await q.evaluate(() => localStorage.getItem('phc.voiceGpuNoise'))) === null);
ok('back on the GPU, its button is ticked again', (await sec2.locator('[data-voice-render="gpu"]').getAttribute('aria-pressed')) === 'true' && !/failed here/.test(await sec2.locator('[data-voice-render="gpu"]').textContent()));
await sec2.locator('[data-voice-render="cpu"]').click();
await q.waitForFunction(() => /Ready · Kokoro on the CPU/.test(document.querySelector('[data-phc-voice-settings]')?.textContent || ''), null, { timeout: 10000 }).catch(() => {});
ok('Render by CPU switches to the CPU and keeps it (' + await q.evaluate(() => localStorage.getItem('phc.voicePlan')) + ')', /Ready · Kokoro on the CPU/.test(await sec2.textContent()) && /wasm/.test(await q.evaluate(() => localStorage.getItem('phc.voicePlan')) || '') && (await sec2.locator('[data-voice-render="cpu"]').getAttribute('aria-pressed')) === 'true');
if (SHOTS) await sec2.screenshot({ path: SHOTS + '/voice-noise-fallback.png' });
await ctx2.close();
await browser.close();

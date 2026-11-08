// The VOICE section (Settings on the title screen, and the music panel in play): install Kokoro and watch it happen,
// pick the Narrator's and the skill voices (Kokoro, Edge's natural voices, the browser's voices), wait for Kokoro or
// not, and test the voice (the device and the time to the first audio). Buttons and selects only.
import React from 'react';
import {
  voicePrefs, setVoicePrefs, voiceState, onVoice, installVoice, loadVoice, testVoice, voiceGroups, browserVoices, browserKey, isBrowserKey, isKokoroKey,
  waitForKokoro, bestVoice, voiceScore, probeVoice, EDGE_NOTE, MODEL_MB, CORES, CORE_VOICE, type BVoice,
} from './voice';

const C = { text: '#E7EBF3', muted: '#A3AEC2', line: '#2E3A50', panel: '#10151F', ground: '#0D1119', ok: '#6FEA77', bad: '#F65157', white: '#FFFFFF' };
const CORE_NAME: Record<string, string> = { body: 'Body', mind: 'Mind', soul: 'Soul' };

function useVoice() {
  const [, force] = React.useReducer((x: number) => x + 1, 0);
  React.useEffect(() => onVoice(force), []);
  return { s: voiceState(), p: voicePrefs() };
}

/** One voice select: Kokoro, then Edge's natural voices (when the browser has them), then the browser's voices. */
export function VoiceSelect({ value, onChange, label, compact }: { value: string; onChange: (v: string) => void; label: string; compact?: boolean }) {
  const g = voiceGroups(browserVoices());
  const opt = (v: BVoice) => <option key={v.name} value={browserKey(v.name)}>{(voiceScore(v) >= 150 ? '★ ' : '') + v.name + (v.lang ? ' · ' + v.lang : '')}</option>;
  const known = isKokoroKey(value) || [...g.browser, ...g.edge].some((v) => browserKey(v.name) === value);
  return <select aria-label={label} data-voice-select={label} value={value} onChange={(e) => onChange(e.target.value)}
    style={{ minHeight: compact ? 30 : 36, maxWidth: '100%', borderRadius: 6, border: '1px solid ' + C.line, background: C.ground, color: C.text, fontFamily: 'inherit', fontSize: compact ? 12 : 14 }}>
    <optgroup label="Kokoro">{g.kokoro.map(([id, n]) => <option key={id} value={id}>{n}</option>)}</optgroup>
    {g.hasEdge && <optgroup label="Edge natural voices">{g.edge.map(opt)}</optgroup>}
    {g.browser.length > 0 && <optgroup label="Browser voices">{g.browser.map(opt)}</optgroup>}
    {!known && isBrowserKey(value) && <option value={value}>{value.slice(8)} (not on this device)</option>}
  </select>;
}

export function VoiceSettings({ compact = false }: { compact?: boolean }) {
  const { s, p } = useVoice();
  const [testing, setTesting] = React.useState(false);
  React.useEffect(() => { probeVoice(); }, []);
  const fs = compact ? 12 : 14;
  const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: fs };
  const btn = (on = false): React.CSSProperties => ({ minHeight: compact ? 30 : 36, padding: '0 12px', borderRadius: 8, border: '1px solid ' + (on ? C.white : C.line), background: on ? '#1C2536' : 'transparent', color: C.text, fontFamily: 'inherit', fontSize: fs, fontWeight: 600, cursor: 'pointer' });
  const primary: React.CSSProperties = { ...btn(), border: 0, background: C.text, color: '#0A0D13', fontWeight: 700 };
  const note: React.CSSProperties = { fontSize: compact ? 11 : 12, lineHeight: 1.45, color: C.muted };
  const g = voiceGroups(browserVoices()), kokoroPicked = isKokoroKey(p.voice);
  const fallback = bestVoice(browserVoices());
  const where = s.device === 'webgpu' ? 'WebGPU' + (s.gpu ? ' (' + s.gpu + ')' : '') : 'the CPU' + (s.fellBack ? ' (WebGPU failed: ' + s.fellBack + ')' : s.gpu && !/adapter /.test(s.gpu) && s.device === 'wasm' ? ' (' + s.gpu + ')' : '');
  const test = s.test;

  return <div data-phc-voice-settings="" style={{ display: 'flex', flexDirection: 'column', gap: compact ? 8 : 12 }}>
    {/* Kokoro: install, progress, ready, failed */}
    <div role="status" aria-live="polite" data-voice-status={s.status} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: compact ? 8 : 12, borderRadius: 10, background: C.panel, border: '1px solid ' + C.line }}>
      {s.status === 'idle' && !p.install && <>
        <span style={{ fontSize: fs, fontWeight: 700 }}>Kokoro, the Narrator's voice: not installed</span>
        <span style={note}>A natural voice that runs on {s.planDevice === 'webgpu' ? 'your GPU (WebGPU' + (s.gpu ? ': ' + s.gpu : '') + ')' : s.planDevice === 'wasm' ? 'your CPU' + (s.gpu ? ' (' + s.gpu + ')' : '') : 'your GPU or CPU'}, free. About {s.planMB || MODEL_MB} MB, downloaded once and kept by your browser. Until then the browser's voice reads{fallback ? ' (' + fallback.name + ')' : ''}.</span>
        <div style={row}><button type="button" data-voice-install="" style={primary} onClick={() => installVoice()}>Install the Narrator's voice{s.planMB ? ' (about ' + s.planMB + ' MB)' : ''}</button></div>
      </>}
      {s.status === 'idle' && p.install && <>
        <span style={{ fontSize: fs, fontWeight: 700 }}>Kokoro: installed</span>
        <span style={note}>It loads from your browser's cache when a session starts.</span>
        <div style={row}><button type="button" style={btn()} onClick={() => loadVoice()}>Load it now</button></div>
      </>}
      {s.status === 'loading' && <>
        <span style={{ fontSize: fs, fontWeight: 700 }}>Downloading… {s.progress}%{s.totalMB ? ' · ' + s.loadedMB.toFixed(1) + ' / ' + s.totalMB.toFixed(1) + ' MB' : ''}</span>
        <div role="progressbar" aria-label="Kokoro download" aria-valuemin={0} aria-valuemax={100} aria-valuenow={s.progress} style={{ height: 8, borderRadius: 99, background: '#1C2536', overflow: 'hidden' }}>
          <div data-voice-bar="" style={{ width: s.progress + '%', height: '100%', background: C.white, transition: 'width .3s linear' }} />
        </div>
        <span style={note}>Once only: your browser keeps it. The browser's voice reads until it's ready.</span>
      </>}
      {s.status === 'installing' && <>
        <span style={{ fontSize: fs, fontWeight: 700 }}>Installing…</span>
        <span style={note}>Building the voice on {s.gpu && !/WebGPU|no /.test(s.gpu) ? 'your GPU (' + s.gpu + ')' : 'this device'} and warming it up.</span>
      </>}
      {s.status === 'ready' && <>
        <span style={{ fontSize: fs, fontWeight: 700 }}><span style={{ color: C.ok }}>✓ </span>Ready · Kokoro on {where}</span>
        <span style={note}>{s.device === 'webgpu' ? 'Running on your GPU.' : 'Running on the CPU: a little slower to start each line.'}</span>
      </>}
      {s.status === 'failed' && <>
        <span style={{ fontSize: fs, fontWeight: 700 }}><span style={{ color: C.bad }}>✕ </span>Failed: {s.error}</span>
        <span style={note}>The browser's voice reads instead{fallback ? ' (' + fallback.name + ')' : ''}.</span>
        <div style={row}><button type="button" data-voice-retry="" style={btn()} onClick={() => loadVoice({ retry: true })}>Retry</button></div>
      </>}
    </div>

    <div style={row}>
      <button type="button" aria-pressed={p.auto} data-voice-auto="" style={btn(p.auto)} onClick={() => { setVoicePrefs({ auto: !p.auto }); }}>{p.auto ? '✓ ' : ''}Read new lines aloud</button>
      <button type="button" aria-pressed={waitForKokoro(p)} data-voice-wait="" style={btn(waitForKokoro(p))} onClick={() => setVoicePrefs({ wait: !waitForKokoro(p) })}
        title="A line waits for Kokoro instead of the browser voice taking it. If Kokoro is late, the text shows and the voice follows.">{waitForKokoro(p) ? '✓ ' : ''}Wait for Kokoro (no browser voice)</button>
    </div>
    {!compact && <span style={note}>Waiting is on by default once Kokoro is installed. A late line shows its text at once; the voice follows.</span>}

    <div style={row}><span style={{ minWidth: compact ? 0 : 120, color: C.muted }}>Narrator</span><VoiceSelect value={p.voice} onChange={(v) => setVoicePrefs({ voice: v })} label="Narrator voice" compact={compact} /></div>
    {kokoroPicked && p.install === false && s.status === 'idle' && <span style={note}>Kokoro voices need the install above. Until then: {fallback ? fallback.name : 'the browser\'s default voice'}.</span>}
    {isBrowserKey(p.voice) && <span style={note}>A browser voice: nothing to download, no waiting.</span>}
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: compact ? 10 : 11, fontWeight: 700, letterSpacing: '0.14em', color: C.muted }}>SKILL VOICES</span>
      {CORES.map((c) => <div key={c} style={row}><span style={{ minWidth: compact ? 40 : 120, color: C.muted }}>{CORE_NAME[c]}</span>
        <VoiceSelect value={p.skill[c] || CORE_VOICE[c]} onChange={(v) => setVoicePrefs({ skill: { [c]: v } as any })} label={CORE_NAME[c] + ' skill voice'} compact={compact} /></div>)}
    </div>
    {!g.hasEdge && <span data-voice-edge-note="" style={note}>{EDGE_NOTE}</span>}

    <div style={row}>
      <button type="button" data-voice-test="" style={btn()} disabled={testing} onClick={async () => { setTesting(true); try { await testVoice(); } finally { setTesting(false); } }}>{testing ? 'Testing…' : '▶ Test voice'}</button>
      {test && <span data-voice-test-result="" style={{ fontSize: fs }}>{test.engine === 'kokoro' ? 'Kokoro · ' + test.device : 'Browser voice · ' + test.device} · first audio in {(test.ms / 1000).toFixed(2)} s</span>}
    </div>
    <label style={row}>Voice volume <input type="range" min={0} max={100} value={p.volume} onChange={(e) => setVoicePrefs({ volume: Number(e.target.value) })} aria-label="Voice volume" style={{ width: compact ? 100 : 160 }} /> <span style={{ color: C.muted }}>{p.volume}%</span></label>
  </div>;
}

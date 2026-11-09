// Playtest tools (spec: Reporting a problem; The spend meter): a Report button that downloads one file with everything
// needed to reproduce a problem, and the Narrator's spend for the room.
import React from 'react';
import { zipSync, strToU8 } from 'fflate';
import { getState, reportState, reportBefores, toast } from './store';
import { recentLogs, recentExchanges, scrub } from './debug';
import { voiceState, voicePrefs } from './voice';
import { usePresence, presenceCls } from './presence';
import { callEstimate, COST_CEILING_USD, MODELS } from '../narrator/anthropic';
import { isPriced, providerInfo } from '../narrator/providers';
import { GAME_VERSION } from '../version';

// ---------- open from anywhere (the screens' buttons) ----------
let which: 'report' | 'spend' | null = null;
const subs = new Set<() => void>();
const setWhich = (w: typeof which) => { which = w; for (const f of subs) f(); };
export const openReport = () => setWhich('report');
export const openSpend = () => setWhich('spend');

const ink = { panel: '#10151F', raised: '#1C2536', line: '#232D3F', text: '#E7EBF3', muted: '#A3AEC2' };
const btn: React.CSSProperties = { minHeight: 40, padding: '0 14px', borderRadius: 10, border: '1px solid #2E3A50', background: 'transparent', color: ink.text, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer' };
const label: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', color: ink.muted };
const money = (n: number | undefined) => '$' + (n || 0).toFixed(n && n < 0.1 ? 3 : 2);

export function buildReport(what: string, withSave: boolean) {
  const st = getState(), g = reportState();
  const build = (document.querySelector('script[type="module"][src*="assets/index-"]') as HTMLScriptElement | null)?.src.split('/').pop() || 'dev';
  const report = {
    format: 'phc-report', version: 1, at: new Date().toISOString(), what: what.trim(),
    gameVersion: GAME_VERSION, build, url: location.origin + location.pathname, userAgent: navigator.userAgent, viewport: innerWidth + '×' + innerHeight,
    me: st.me, role: st.role, room: st.code, screen: st.screen, connection: st.conn, connNote: st.connNote,
    narrator: { provider: st.narrator.provider, baseUrl: st.narrator.baseUrl, model: st.narrator.model, effort: st.narrator.effort, scripted: st.narrator.scripted, hasKey: !!st.narrator.key },
    voice: { ...voiceState(), prefs: voicePrefs() }, rerollCopies: reportBefores(),
    game: withSave ? g : g && { code: g.code, v: g.v, phase: g.phase, players: g.players, scene: g.story?.scene, await: g.story?.await, work: g.story?.work, narrator: g.narrator, lastLines: g.story?.entries.slice(-12) },
    narratorCalls: recentExchanges(), log: recentLogs(),
  };
  let json = JSON.stringify(report, null, 1);
  // The key never leaves this browser: strip it, and anything shaped like one.
  if (st.narrator.key && st.narrator.key.length > 8) json = json.split(st.narrator.key).join('[removed]');
  return scrub(json);
}

function download(what: string, withSave: boolean) {
  const st = getState(), stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const zip = zipSync({ 'report.json': strToU8(buildReport(what, withSave)) }, { level: 9 });
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([zip as BlobPart], { type: 'application/zip' }));
  a.download = 'phc-report-' + (st.code || 'home') + '-' + stamp + '.zip'; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  toast('Report saved to your downloads. Send the file to Leon with a screenshot if you have one.', true);
}

/** Set by PlaytestTools while a dialog plays its out animation. */
const Closing = React.createContext(false);
function Dialog({ title, children, close }: { title: string; children: React.ReactNode; close: () => void }) {
  const closing = React.useContext(Closing);
  React.useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); }; addEventListener('keydown', k); return () => removeEventListener('keydown', k); }, [close]);
  return (
    <div role="dialog" aria-modal="true" aria-label={title} onClick={(e) => { if (e.target === e.currentTarget) close(); }} className={presenceCls('phc-a-fade', closing)} style={{ position: 'fixed', inset: 0, zIndex: 30, background: 'rgba(5, 7, 11, 0.85)', display: 'grid', placeItems: 'center', padding: 16 }}>
      <div className={presenceCls('phc-a-pop', closing)} style={{ width: 'min(560px, 96vw)', maxHeight: '90vh', overflowY: 'auto', padding: 20, borderRadius: 14, background: ink.panel, border: '1px solid #3B475D', color: ink.text, fontFamily: "'Chakra Petch', sans-serif", display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}><span style={{ fontSize: 18, fontWeight: 700, letterSpacing: '0.1em' }}>{title}</span><button type="button" style={{ ...btn, marginLeft: 'auto', minHeight: 34 }} onClick={close}>Close</button></div>
        {children}
      </div>
    </div>
  );
}

function ReportDialog({ close }: { close: () => void }) {
  const st = getState(), host = st.role === 'host';
  const [what, setWhat] = React.useState(''), [withSave, setWithSave] = React.useState(true);
  const errs = recentLogs().filter((l) => l.level === 'error').length, calls = recentExchanges().length;
  return (
    <Dialog title="REPORT A PROBLEM" close={close}>
      <span style={{ fontSize: 13, color: ink.muted, lineHeight: 1.5 }}>Downloads one file to send to Leon. Nothing is sent from here. Your API key is never in it.</span>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><span style={label}>WHAT HAPPENED?</span>
        <textarea value={what} onChange={(e) => setWhat(e.target.value)} rows={4} placeholder="What you did, what you expected, what happened instead." style={{ padding: 10, borderRadius: 8, border: '1px solid #2E3A50', background: '#0D1119', color: ink.text, fontFamily: 'inherit', fontSize: 14, resize: 'vertical' }} /></label>
      <span style={label}>IN THE FILE</span>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.6, color: '#C9D3E3' }}>
        <li>This browser, screen and connection; the Narrator model (not the key); the voice's state</li>
        <li>{errs} error{errs === 1 ? '' : 's'} and the recent warnings from this browser</li>
        <li>{host ? (calls ? 'The last ' + calls + ' Narrator call' + (calls === 1 ? '' : 's') + ': what was sent and what came back' : 'No Narrator calls yet in this tab') : 'Narrator calls are in the host\'s report (they run in the host\'s browser)'}</li>
        <li><label style={{ cursor: 'pointer' }}><input type="checkbox" checked={withSave} onChange={(e) => setWithSave(e.target.checked)} /> {host ? 'The whole game save (story, memory, characters), so the problem can be replayed' : 'What your screen shows of the game'}</label></li>
      </ul>
      <div style={{ display: 'flex', gap: 8 }}><button type="button" style={{ ...btn, background: ink.text, color: '#0A0D13', border: 0 }} onClick={() => { download(what, withSave); close(); }}>Download report</button></div>
    </Dialog>
  );
}

function SpendDialog({ close }: { close: () => void }) {
  const st = getState(), g = st.game, u = g?.narrator.usage, host = st.role === 'host';
  const model = MODELS.find((m) => m.id === st.narrator.model) || MODELS[0];
  // Dollars only for Anthropic's own models; other services bill their own way, so the meter shows tokens (the host
  // knows the service; a guest's copy of the settings is the default, so a guest sees whatever the host's turns cost).
  const priced = !host || isPriced(st.narrator);
  const full = host ? reportState() : null;
  let est: ReturnType<typeof callEstimate> | null = null; try { if (priced && full && full.phase !== 'lobby') est = callEstimate(full, model.id); } catch { /* */ }
  const tokens = (n: number) => (n >= 1e6 ? (n / 1e6).toFixed(2) + ' M' : n >= 1e3 ? Math.round(n / 1e3) + ' k' : String(n)) + ' tokens';
  const recent = u?.recent || [], peak = Math.max(COST_CEILING_USD, ...recent);
  const cacheShare = u && u.input + u.cacheRead > 0 ? Math.round((u.cacheRead / (u.input + u.cacheRead)) * 100) : 0;
  const row = (k: string, v: string, hint?: string) => <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}><span style={{ ...label, minWidth: 170 }}>{k}</span><span style={{ fontSize: 15, fontWeight: 700 }}>{v}</span>{hint && <span style={{ fontSize: 12, color: ink.muted }}>{hint}</span>}</div>;
  return (
    <Dialog title="NARRATOR SPEND" close={close}>
      <span style={{ fontSize: 13, color: ink.muted, lineHeight: 1.5 }}>What this room's AI Narrator has cost on {host ? 'your' : 'the host\'s'} API key, from the provider's own token counts. Each turn is capped at {money(COST_CEILING_USD)}.</span>
      {!priced && <span style={{ fontSize: 13, color: ink.muted, lineHeight: 1.5 }}>{providerInfo(st.narrator.provider).label} sets its own prices, so this meter counts tokens: check the bill on that service's site.</span>}
      {!priced && !!u?.calls && <>
        {row('INPUT', tokens(u.input), u.calls + ' call' + (u.calls === 1 ? '' : 's'))}
        {row('OUTPUT', tokens(u.output))}
        {!!u.cacheRead && row('READ FROM CACHE', tokens(u.cacheRead))}
      </>}
      {!priced ? (!u || !u.calls ? <span style={{ fontSize: 14 }}>No Narrator turns yet.</span> : null) : !u || !u.calls ? <span style={{ fontSize: 14 }}>No Narrator turns yet.</span> : <>
        {row('THIS ROOM', money(u.costUsd), u.calls + ' call' + (u.calls === 1 ? '' : 's'))}
        {row('AVERAGE CALL', money(u.costUsd / u.calls))}
        {row('LAST CALL', money(u.last))}
        {row('DEAREST CALL', money(u.max), (u.max || 0) > COST_CEILING_USD * 0.8 ? 'near the ceiling' : '')}
        {row('READ FROM CACHE', cacheShare + '%', 'of input; cached input costs 1/' + Math.round(model.input / model.cacheRead) + ' as much on ' + model.label)}
        {!!u.rewrites && row('REWORDINGS', String(u.rewrites), 'in the total, not in the turns')}
        <div aria-label="The last 20 calls" style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 70, padding: '6px 0', borderBottom: '1px solid ' + ink.line, position: 'relative' }}>
          <span style={{ position: 'absolute', left: 0, right: 0, bottom: (COST_CEILING_USD / peak) * 64 + 6, borderTop: '1px dashed #F65157' }} title={'Ceiling ' + money(COST_CEILING_USD)} />
          {recent.map((c, i) => <span key={i} title={money(c)} style={{ flex: 1, maxWidth: 22, height: Math.max(2, (c / peak) * 64), background: c > COST_CEILING_USD * 0.8 ? '#F65157' : '#5C9EFF', borderRadius: 2 }} />)}
        </div>
        <span style={{ fontSize: 11, color: ink.muted }}>The last {recent.length === 1 ? 'call' : recent.length + ' calls'} · dashed line: the {money(COST_CEILING_USD)} ceiling</span>
      </>}
      {est && row('NEXT TURN, ESTIMATED', money(est.warmUsd) + ' – ' + money(est.worstUsd), 'one request, cache warm – cold; lookups add more, up to the ' + money(COST_CEILING_USD) + ' ceiling')}
    </Dialog>
  );
}

export function PlaytestTools() {
  const [, force] = React.useReducer((x: number) => x + 1, 0);
  React.useEffect(() => { subs.add(force); return () => { subs.delete(force); }; }, []);
  const close = React.useCallback(() => setWhich(null), []);
  const { shown, closing } = usePresence(which);
  if (!shown) return null;
  return <Closing.Provider value={closing}>{shown === 'report' ? <ReportDialog close={close} /> : <SpendDialog close={close} />}</Closing.Provider>;
}

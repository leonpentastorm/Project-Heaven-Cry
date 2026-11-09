// The settings cog (UI pass, docs/design/ui-pass-shell.md section 6): one settings body with four tabs, opened from
// the ⚙ in every in-game header (as a dialog) and shown in the title screen's Settings panel (inline), so there is
// one source for every setting.
//   Audio   master, music, combat sounds, interface sounds, the Narrator's voice, mute; test buttons
//   Voice   the Narrator's voice engine and voices (game/voiceSettings.tsx; moved here from the Music panel)
//   Combat  combat speed (game/combatSpeed.ts), cut-ins
//   Display the Music and Memory buttons' opacity and fading, reduce motion, show tips again
import React from 'react';
import { uiPrefs, setUiPrefs, onUiPrefs, sfx, preloadCombatSfx, type UiPrefs, type CutinPref } from './sfx';
import { voicePrefs, setVoicePrefs, onVoice } from './voice';
import { VoiceSettings } from './voiceSettings';
import { getCombatSpeed, setCombatSpeed, COMBAT_SPEED_EVENT, type CombatSpeed } from './combatSpeed';
import { resetTips } from './tips';
import { usePresence, presenceCls } from './presence';

export type SettingsTab = 'audio' | 'voice' | 'combat' | 'display';
export const SETTINGS_TABS: [SettingsTab, string][] = [['audio', 'Audio'], ['voice', 'Voice'], ['combat', 'Combat'], ['display', 'Display']];

// ---------- open from anywhere (the header's ⚙, the Music panel's link) ----------
let open: SettingsTab | null = null;
const subs = new Set<() => void>();
const emit = () => { for (const f of subs) f(); };
export function openSettings(tab: SettingsTab = 'audio') { open = tab; emit(); }
export function closeSettings() { open = null; emit(); }
export const settingsOpen = () => open;

const C = { ground: '#0A0D13', panel: '#10151F', raised: '#1C2536', line: '#232D3F', edge: '#3B475D', text: '#E7EBF3', muted: '#A3AEC2', white: '#FFFFFF', ok: '#6FEA77' };
const lab: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', color: C.muted };
const note: React.CSSProperties = { fontSize: 12, lineHeight: 1.45, color: C.muted };
const btn = (on = false): React.CSSProperties => ({ minHeight: 34, padding: '0 12px', borderRadius: 8, border: '1px solid ' + (on ? C.text : '#2E3A50'), background: on ? C.raised : 'transparent', color: on ? C.white : C.text, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' });

function usePrefs(): UiPrefs {
  const [, force] = React.useReducer((x: number) => x + 1, 0);
  React.useEffect(() => onUiPrefs(force), []);
  return uiPrefs();
}

/** One volume row: a label, what it covers, the slider and its value, and an optional test button. */
function Volume({ name, what, value, max = 100, onChange, test, testLabel, id }: { name: string; what?: string; value: number; max?: number; onChange: (v: number) => void; test?: () => void; testLabel?: string; id: string }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr 48px auto', alignItems: 'center', gap: '4px 12px' }}>
      <label htmlFor={id} style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', color: C.text }}>{name}</label>
      <input id={id} data-phc-vol={id} type="range" min={0} max={max} step={5} value={value} onChange={(e) => onChange(Number(e.target.value))} aria-label={name + ' volume'} style={{ width: '100%', accentColor: C.white }} />
      <span style={{ fontSize: 13, fontWeight: 700, color: C.text, textAlign: 'right' }}>{value}%</span>
      {test ? <button type="button" data-sfx="none" onClick={test} style={{ ...btn(), minHeight: 30, fontSize: 12 }}>▶ {testLabel || 'Test'}</button> : <span />}
      {what && <span style={{ ...note, gridColumn: '2 / 5', marginTop: -2 }}>{what}</span>}
    </div>
  );
}

function AudioTab() {
  const p = usePrefs();
  const [, force] = React.useReducer((x: number) => x + 1, 0);
  React.useEffect(() => onVoice(force), []);
  React.useEffect(() => { preloadCombatSfx(); }, []);
  const v = voicePrefs();
  return <>
    <Volume id="master" name="MASTER" what="Every sound effect and the music." value={p.master} onChange={(x) => setUiPrefs({ master: x })} />
    <Volume id="music" name="MUSIC" what="The room's music, the title and creation themes. The ♪ button's own volume is yours too." value={p.music} onChange={(x) => setUiPrefs({ music: x })} />
    <Volume id="combat" name="COMBAT SOUNDS" max={150} what="Guns, magic, hits, reloads, explosions, steps, doors: everything that happens in the world." value={p.combat} onChange={(x) => setUiPrefs({ combat: x })}
      test={() => sfx('gun_rifle')} testLabel="A shot" />
    <Volume id="ui" name="INTERFACE" what="Buttons, tabs, hovers and chimes." value={p.ui} onChange={(x) => setUiPrefs({ ui: x })} test={() => sfx('start')} testLabel="A click" />
    <Volume id="voice" name="NARRATOR VOICE" what="The voice that reads the Narrator's lines (engine and voices: the Voice tab)." value={v.volume} onChange={(x) => setVoicePrefs({ volume: x })} />
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}><input type="checkbox" checked={p.mute} onChange={(e) => setUiPrefs({ mute: e.target.checked })} /> Mute every sound effect and the music</label>
  </>;
}

function Choice<T extends string>({ label, value, options, onPick, attr }: { label: string; value: T; options: [T, string][]; onPick: (v: T) => void; attr: string }) {
  return (
    <div role="group" aria-label={label} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <span style={{ minWidth: 150, fontSize: 13, fontWeight: 700, letterSpacing: '0.08em' }}>{label.toUpperCase()}</span>
      {options.map(([v, l]) => <button key={v} type="button" {...{ [attr]: v }} aria-pressed={value === v} onClick={() => onPick(v)} style={btn(value === v)}>{value === v ? '● ' : ''}{l}</button>)}
    </div>
  );
}

function CombatTab() {
  const p = usePrefs();
  const [speed, setSpeed] = React.useState<CombatSpeed>(getCombatSpeed);
  React.useEffect(() => { const f = () => setSpeed(getCombatSpeed()); window.addEventListener(COMBAT_SPEED_EVENT, f); return () => window.removeEventListener(COMBAT_SPEED_EVENT, f); }, []);
  return <>
    <Choice label="Combat speed" attr="data-phc-speed" value={speed} options={[['normal', 'Normal'], ['fast', 'Fast']]} onPick={(v) => setCombatSpeed(v)} />
    <span style={note}>Normal: every beat of a fight at its own pace, time to read each pop-up. Fast: animations and pop-ups about 15% quicker. Yours only: it never changes the rules or anyone else's screen.</span>
    {/* Spotlight cut-ins (decision 113): the torn strips for a big moment, and the slowed attack after them. */}
    <Choice<CutinPref> label="Cut-ins" attr="data-phc-cutins" value={p.cutins || 'all'} options={[['all', 'All'], ['scene', 'Once per scene'], ['off', 'Off']]} onPick={(v) => setUiPrefs({ cutins: v })} />
    <span style={note}>The torn-strip close-up for a critical hit, a kill or a Miracle. Once per scene: each character's first big moment in a scene only.</span>
  </>;
}

function DisplayTab() {
  const p = usePrefs();
  const [tips, setTips] = React.useState(false);
  return <>
    <span style={lab}>THE ♪ MUSIC AND ◈ MEMORY BUTTONS</span>
    <Volume id="float" name="OPACITY" what="How solid the floating buttons are at rest. They come up to full when the pointer is near or their panel is open." value={p.float} onChange={(x) => setUiPrefs({ float: Math.max(20, x) })} />
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}><input type="checkbox" data-phc-float-fade="" checked={p.floatFade} onChange={(e) => setUiPrefs({ floatFade: e.target.checked })} /> Fade them when the pointer is away (off: they stay at the opacity above)</label>
    <span style={lab}>COMFORT</span>
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}><input type="checkbox" checked={p.reduceMotion} onChange={(e) => setUiPrefs({ reduceMotion: e.target.checked })} /> Reduce motion (no parallax, no running, plain fades)</label>
    <div><button type="button" onClick={() => { resetTips(); setTips(true); }} style={btn(tips)}>{tips ? 'Tips will show again ✓' : 'Show tips again'}</button></div>
  </>;
}

/** The settings themselves, with their tabs (the cog's dialog and the title's Settings panel). */
export function SettingsBody({ tab: initial = 'audio', compact = false }: { tab?: SettingsTab; compact?: boolean }) {
  const [tab, setTab] = React.useState<SettingsTab>(initial);
  React.useEffect(() => setTab(initial), [initial]);
  const tabBtn = (on: boolean): React.CSSProperties => ({ textAlign: 'left', minHeight: 38, padding: '0 14px', borderRadius: 8, border: 0, borderLeft: '3px solid ' + (on ? C.white : 'transparent'), background: on ? C.raised : 'transparent', color: on ? C.white : C.muted, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, letterSpacing: '0.06em', cursor: 'pointer' });
  return (
    <div data-phc-settings="" style={{ display: 'flex', flexDirection: compact ? 'column' : 'row', gap: compact ? 12 : 20, minHeight: 0 }}>
      <div role="tablist" aria-label="Settings" aria-orientation={compact ? 'horizontal' : 'vertical'} style={{ display: 'flex', flexDirection: compact ? 'row' : 'column', gap: 4, flex: 'none', width: compact ? 'auto' : 140, flexWrap: 'wrap' }}>
        {SETTINGS_TABS.map(([id, label]) => <button key={id} type="button" role="tab" id={'phc-set-' + id} aria-selected={tab === id} aria-controls={'phc-set-panel-' + id} onClick={() => setTab(id)} style={tabBtn(tab === id)}>{label}</button>)}
      </div>
      <div role="tabpanel" id={'phc-set-panel-' + tab} aria-labelledby={'phc-set-' + tab} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {tab === 'audio' && <AudioTab />}
        {tab === 'voice' && <VoiceSettings />}
        {tab === 'combat' && <CombatTab />}
        {tab === 'display' && <DisplayTab />}
      </div>
    </div>
  );
}

/** The cog's dialog: mounted once in App.tsx. */
export function SettingsHost() {
  const [, force] = React.useReducer((x: number) => x + 1, 0);
  React.useEffect(() => { subs.add(force); return () => { subs.delete(force); }; }, []);
  const pres = usePresence(open);
  React.useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('[data-phc-dialog]')) { e.stopPropagation(); closeSettings(); } };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [!!open]);
  if (!pres.shown) return null;
  return (
    <div role="dialog" aria-modal="true" aria-label="Settings" className={presenceCls('phc-a-fade', pres.closing)} onMouseDown={(e) => { if (e.target === e.currentTarget) closeSettings(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(5, 7, 11, 0.78)', display: 'grid', placeItems: 'center', padding: 16, fontFamily: "'Chakra Petch', sans-serif" }}>
      <div className={presenceCls('phc-a-pop', pres.closing)} style={{ width: 'min(800px, 100%)', maxHeight: '90vh', overflowY: 'auto', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 16, padding: '18px 22px 22px', borderRadius: 16, background: C.panel, border: '1px solid ' + C.edge, color: C.text, boxShadow: '0 18px 60px rgba(0,0,0,0.6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span aria-hidden style={{ fontSize: 20 }}>⚙</span>
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: '0.14em' }}>SETTINGS</span>
          <span style={{ ...note, marginLeft: 8 }}>Yours only, kept in this browser.</span>
          <button type="button" onClick={closeSettings} style={{ ...btn(), marginLeft: 'auto' }}>Done</button>
        </div>
        <SettingsBody tab={pres.shown} />
      </div>
    </div>
  );
}

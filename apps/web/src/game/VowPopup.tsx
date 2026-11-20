// The vow pop-up (to-do section F; game/standingVow.ts): a small card over the mode's middle (never a full-screen flow:
// the side panels stay), one block per Faithful character of the viewer: the vows of its patron as buttons, Shield
// asking for the ally it guards, and "Fight unsworn". It opens by itself when a mode is entered and a character has no
// choice yet (the camp), and from the rest's "Your vow" button, where the vow is changed.
import React from 'react';
import { getState, subscribe, act } from './store';
import { vowPopupView, standingVowAction, vowWords, type VowPopupChar } from './standingVow';
import type { Action } from '@engine';
import { vowIconUri } from './faithArt';
import { FAITH_INK } from './faithView';
import { ensureMotionCss } from '../screens/shared';

const ink = { ground: '#0A0D13', panel: '#10151F', raised: '#1C2536', line: '#232D3F', text: '#E7EBF3', muted: '#A3AEC2' };

function CharBlock({ c, onPick }: { c: VowPopupChar; onPick: () => void }) {
  const [shield, setShield] = React.useState<string | null>(null);
  const cur = c.current, curId = cur && !('unsworn' in cur) ? cur.id : null;
  // rules 1.72 item 5705: the real action sets the standing vow on the character (the engine refuses a change away from a rest)
  const pick = (id: string, allyCharId?: string) => { act(standingVowAction(c.charId, { id, ...(allyCharId ? { allyCharId } : {}) }) as Action); setShield(null); onPick(); };
  return (
    <div data-phc-vow-char={c.charId} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span style={{ fontSize: 'var(--fs-sub)', fontWeight: 700, letterSpacing: '0.14em', color: FAITH_INK }}>{c.name.toUpperCase()} · TO {c.patron.toUpperCase()}</span>
      <span data-phc-vow-current="" style={{ fontSize: 'var(--fs-sub)', color: ink.muted }}>{vowWords(c)}</span>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 6 }}>
        {c.vows.map((v) => (
          <button key={v.id} type="button" data-phc-vow={v.id} aria-pressed={curId === v.id || shield === v.id}
            title={(v.fulfilledWhen ? 'Fulfilled when: ' + v.fulfilledWhen + '. ' : '') + 'Broken when: ' + v.brokenWhen}
            onClick={() => (v.needsAlly ? setShield(shield === v.id ? null : v.id) : pick(v.id))}
            style={{ display: 'grid', gridTemplateColumns: '22px minmax(0, 1fr)', gap: '1px 8px', alignItems: 'center', textAlign: 'left', minHeight: 44, padding: '6px 8px', borderRadius: 8, fontFamily: 'inherit', color: ink.text, cursor: 'pointer',
              border: '1px solid ' + (curId === v.id || shield === v.id ? FAITH_INK : '#2E3A50'), background: curId === v.id ? ink.raised : ink.panel }}>
            <img src={vowIconUri(v.id)} alt="" style={{ width: 22, height: 22, gridRow: 'span 2' }} />
            <span style={{ fontSize: 'var(--fs-body)', fontWeight: 700 }}>{v.name}</span>
            <span style={{ fontSize: 'var(--fs-sub)', color: ink.muted, fontFamily: "'Spectral', serif" }}>{v.words}</span>
          </button>
        ))}
      </div>
      {shield ? (
        <div data-phc-vow-allies="" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 'var(--fs-sub)', color: ink.muted }}>Which ally do you shield?</span>
          {c.allies.length ? c.allies.map((a) => <button key={a.charId} type="button" data-phc-vow-ally={a.charId} onClick={() => pick(shield, a.charId)} style={{ minHeight: 34, padding: '0 12px', borderRadius: 8, border: '1px solid ' + FAITH_INK, background: 'transparent', color: ink.text, fontFamily: 'inherit', cursor: 'pointer' }}>{a.name}</button>)
            : <span style={{ fontSize: 'var(--fs-sub)', color: ink.muted }}>No ally in the squad to shield.</span>}
        </div>
      ) : null}
      <button type="button" data-phc-vow-unsworn="" aria-pressed={!!cur && 'unsworn' in cur} onClick={() => { act(standingVowAction(c.charId, { unsworn: true }) as Action); onPick(); }}
        style={{ alignSelf: 'flex-start', minHeight: 34, padding: '0 12px', borderRadius: 8, border: '1px solid ' + ink.line, background: cur && 'unsworn' in cur ? ink.raised : 'transparent', color: ink.text, fontFamily: 'inherit', cursor: 'pointer' }}>Fight unsworn</button>
    </div>
  );
}

/** The pop-up. open: shown; onClose: the player is done (every character has a choice) or closes it. */
export function VowPopup({ onClose, at }: { onClose: () => void; at: 'enter' | 'rest' }) {
  ensureMotionCss();
  const st = React.useSyncExternalStore(subscribe, getState), v = vowPopupView(st.game, st.me.id);
  const [, redraw] = React.useReducer((x: number) => x + 1, 0);
  if (!v.chars.length) return null;
  const done = !vowPopupView(st.game, st.me.id).due;
  return (
    <div className="phc-m-backdrop" data-phc-vow-popup={at} role="dialog" aria-modal="true" aria-label="Swear a vow"
      style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'grid', placeItems: 'center', background: 'rgba(5, 7, 11, 0.62)' }}>
      <div className="phc-m-card" style={{ width: 'min(720px, calc(100vw - 32px))', maxHeight: 'calc(100vh - 64px)', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 14, padding: 18, borderRadius: 14, background: ink.ground, border: '1px solid ' + ink.line, borderTop: '3px solid ' + FAITH_INK, color: ink.text, fontFamily: "'Chakra Petch', sans-serif", boxShadow: '0 18px 48px rgba(0,0,0,.6)' }}>
        <span style={{ fontFamily: "'Spectral', serif", fontSize: 22, fontWeight: 600 }}>{at === 'rest' ? 'Change your vow' : 'Swear a vow'}</span>
        <span style={{ fontSize: 'var(--fs-body)', lineHeight: 1.5, color: '#DCE2EC' }}>Your patron hears it at the start of every fight until you change it at a rest. Kept to a fight's end, it raises your Devotion; broken, your patron says so. Or fight unsworn.</span>
        {v.chars.map((c) => <CharBlock key={c.charId} c={c} onPick={redraw} />)}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" data-phc-vow-done="" onClick={onClose} style={{ minHeight: 40, padding: '0 18px', borderRadius: 10, border: 0, background: done ? ink.text : ink.raised, color: done ? ink.ground : ink.text, fontFamily: 'inherit', fontWeight: 700, cursor: 'pointer' }}>{done ? 'Done' : 'Later'}</button>
        </div>
      </div>
    </div>
  );
}
/** The pop-up as it opens on entering a mode: by itself once per run while a Faithful character has no choice. */
const shownFor = new Set<string>();
export function VowOnEnter({ scope }: { scope: string }) {
  const st = getState(), v = vowPopupView(st.game, st.me.id);
  const [open, setOpen] = React.useState(() => v.due && !shownFor.has(scope));
  if (!open) return null;
  return <VowPopup at="enter" onClose={() => { shownFor.add(scope); setOpen(false); }} />;
}
/** The rest's button (a rest is where the vow changes): the standing vow in words, opening the pop-up. */
export function VowAtRest() {
  const st = React.useSyncExternalStore(subscribe, getState), v = vowPopupView(st.game, st.me.id);
  const [open, setOpen] = React.useState(false);
  if (!v.chars.some((c) => c.canChange)) return null; // rules 1.72 item 5705: the engine says where a vow changes (faithView vowChange)
  return (
    <>
      <button type="button" data-phc-vow-rest="" onClick={() => setOpen(true)} title={v.chars.map(vowWords).join(' · ')}
        style={{ minHeight: 40, padding: '0 14px', borderRadius: 10, border: '1px solid ' + FAITH_INK, background: 'transparent', color: ink.text, fontFamily: 'inherit', fontWeight: 700, cursor: 'pointer' }}>Your vow</button>
      {open ? <VowPopup at="rest" onClose={() => setOpen(false)} /> : null}
    </>
  );
}

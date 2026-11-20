// The room's ping line and the guest's "sending" mark (0.33, ROADMAP "Multiplayer input delay"). Shown only in a room
// with another player in it (solo has no link to wait on). The line reads netStats.ts: the time to the room, and for a
// guest the last action's delay split into its parts; for the host, its own time answering. The mark is drawn where the
// guest pressed, from the click to the host's answer: it decides nothing (the view that comes back is the truth).
import React from 'react';
import type { GameState } from '@engine';
import { subscribeNet, netSummary, pendingNow, type Pending } from './netStats';

/** How long the "sending" mark stays with no answer before it says so (ms). */
export const PENDING_SHOWN_MS = 10_000;
const ms = (n: number | null | undefined) => (n == null ? '–' : n >= 1000 ? (n / 1000).toFixed(2) + ' s' : n + ' ms');
const kb = (n: number) => (n >= 1024 ? Math.round(n / 1024) + ' KB' : n + ' B');

/** The line's words (pure; NetLine.test.ts). */
export function netLineText(role: 'host' | 'guest', s: ReturnType<typeof netSummary>): string {
  const head = 'LINK · room ' + ms(s.ping);
  if (role === 'host') return head + (s.host.answers ? ' · answering a guest ' + ms(s.host.lastMs) + ', ' + kb(s.host.lastBytes) : '');
  if (!s.last) return head;
  const p = s.lastParts!, bits = [p.you != null ? 'you–room ' + ms(p.you) : '', p.hostLink != null ? 'room–host ' + ms(p.hostLink) : '', p.host != null ? 'host ' + ms(p.host) : ''].filter(Boolean);
  return head + ' · last action ' + ms(s.last.total) + (bits.length ? ' (' + bits.join(' · ') + ')' : '') + (s.actions > 1 ? ' · usual ' + ms(s.actMedian) : '');
}

export function NetLine({ game, role }: { game: GameState | null; role: 'host' | 'guest' | null }) {
  const [, poke] = React.useReducer((x: number) => x + 1, 0);
  React.useEffect(() => subscribeNet(poke), []);
  const p: Pending | null = pendingNow();
  // the mark's own clock: one redraw when it has waited too long
  React.useEffect(() => { if (!p) return; const t = setTimeout(poke, PENDING_SHOWN_MS + 50); return () => clearTimeout(t); }, [p?.nonce]);
  if (!role || !game || game.players.length < 2) return null;
  const late = !!p && performance.now() - p.at > PENDING_SHOWN_MS;
  return (
    <>
      <div data-phc-netline="" aria-live="off" style={{ position: 'fixed', left: 8, bottom: 6, zIndex: 58, pointerEvents: 'none', padding: '2px 8px', borderRadius: 6, background: 'rgba(10,13,19,.72)', color: '#A3AEC2', fontSize: 'var(--fs-sub)', letterSpacing: '0.04em', whiteSpace: 'nowrap', maxWidth: 'calc(100vw - 16px)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {netLineText(role, netSummary())}{p && role === 'guest' ? (late ? ' · no answer yet' : ' · sending…') : ''}
      </div>
      {p && role === 'guest' && !late && p.x != null && <div data-phc-sending="" aria-hidden="true" style={{ position: 'fixed', left: p.x - 14, top: p.y! - 14, width: 28, height: 28, zIndex: 66, pointerEvents: 'none' }}>
        <div className="phc-sending-ring" style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid #FFFFFF', opacity: 0.85 }} />
        <span style={{ position: 'absolute', left: 32, top: 4, padding: '1px 6px', borderRadius: 5, background: '#1C2536', border: '1px solid #2E3A50', color: '#E7EBF3', fontSize: 'var(--fs-sub)', fontWeight: 700, letterSpacing: '0.12em', whiteSpace: 'nowrap' }}>SENDING</span>
        <style>{'@keyframes phcSendRing{0%{transform:scale(.6);opacity:.95}100%{transform:scale(1.25);opacity:.25}}.phc-sending-ring{animation:phcSendRing .7s ease-out infinite alternate}@media (prefers-reduced-motion: reduce){.phc-sending-ring{animation:none}}'}</style>
      </div>}
    </>
  );
}

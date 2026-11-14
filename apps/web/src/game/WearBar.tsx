// A carried thing's wear (rules 1.50; Weapons v2, Durability): a thin bar of its durability now against full, its
// numbers, and a mark in words and a glyph when it is close to breaking (Worn: the data's worn share or less) or Broken.
// Drawn wherever a weapon or a shield is listed out of a fight: the repair cards (now → full), the full-screen places'
// "you" panel (hands and pack), the path map's squad panel. Every number and the state are the engine's (wearAt).
import React from 'react';
import { FRAME_INK as I } from './FullScreenFrame';

/** The wear a screen draws (the engine's WearV). */
export interface WearData { now: number; max: number; state: 'sound' | 'worn' | 'broken' }
/** The mark's words for a state (the glyph beside the word: colour is never the only sign). */
export const WEAR_MARK: Record<WearData['state'], string> = { sound: '', worn: '⚠ WORN', broken: '✕ BROKEN' };

/** The bar: `to` draws the restored part (a repair to full); `label` names the thing for a screen reader. */
export function WearBar({ w, to, label, compact }: { w: WearData; to?: number; label?: string; compact?: boolean }) {
  const pct = (n: number) => Math.max(0, Math.min(100, (100 * n) / Math.max(1, w.max)));
  const bad = w.state !== 'sound', ink = bad ? I.hp : I.text;
  return (
    <span data-phc-wear={w.state} data-phc-wear-now={w.now} data-phc-wear-max={w.max} role="img"
      aria-label={(label ? label + ': ' : '') + 'durability ' + w.now + ' of ' + w.max + (bad ? ', ' + w.state : '') + (to != null ? ', repaired to ' + to : '')}
      style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, fontSize: compact ? 11.5 : 12.5 }}>
      <span aria-hidden="true" style={{ position: 'relative', flex: 1, minWidth: compact ? 40 : 60, height: compact ? 5 : 8, borderRadius: 4, background: I.raised, overflow: 'hidden' }}>
        {to != null ? <span style={{ position: 'absolute', inset: 0, width: pct(to) + '%', background: 'rgba(111,234,119,0.35)' }} /> : null}
        <span style={{ position: 'absolute', inset: 0, width: pct(w.now) + '%', background: ink }} />
      </span>
      <span aria-hidden="true" style={{ fontVariantNumeric: 'tabular-nums', color: bad ? I.hp : I.muted, whiteSpace: 'nowrap' }}>
        {w.now}{to != null ? <> <span style={{ color: I.muted }}>→</span> <b style={{ color: I.ok }}>{to}</b></> : ' / ' + w.max}
      </span>
      {bad ? <span data-phc-wear-mark="" aria-hidden="true" style={{ fontSize: compact ? 10.5 : 11, fontWeight: 700, letterSpacing: '0.08em', color: I.hp, whiteSpace: 'nowrap' }}>{WEAR_MARK[w.state]}</span> : null}
    </span>
  );
}

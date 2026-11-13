// A grade step's large card (rules 1.46; survival-spec 8.3 "Upgrade tab"), on the shop's Upgrade tab and the Forge's:
// the weapon or focus with its icon, the step in words ("Fine to Masterwork"), what changes in numbers (the engine's
// gear preview before and after: to hit, a focus's grade on its door's rolls), the price here (and at a Forge), and the
// engine's reason in words when it can't be taken. Its action is 4a's `run/upgrade`, sent as the engine built it.
import React from 'react';
import { act } from './store';
import { gearIconUri } from './gearIcons';
import { openTipOn, tipProps } from './actionTip';
import { FRAME_INK as I } from './FullScreenFrame';

/** What an upgrade card draws: a services-shelf card (the shop) or a place's option card (the Forge), as one shape. */
export interface UpgradeCardData { key: string; title: string; id?: string | null; price: number | null; why: string | null; note?: string; lines: { label: string; before: string; after: string }[]; action: { type: string; [k: string]: unknown } }

export function UpgradeCard({ s, onFocus, choice }: { s: UpgradeCardData; onFocus?: () => void; choice?: boolean }) {
  const icon = s.id ? gearIconUri(s.id, undefined, { large: true }) : '';
  return (
    <article data-phc-service={s.key} data-phc-service-why={s.why ? '' : undefined} tabIndex={0} onMouseEnter={onFocus} onFocus={onFocus} {...tipProps(s.why)}
      style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 236, padding: 18, borderRadius: 16, background: 'linear-gradient(180deg, rgba(28,37,54,0.96), rgba(16,21,31,0.96))', border: '1px solid ' + (s.why ? I.line : '#7A879E'), opacity: s.why ? 0.82 : 1 }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <div style={{ flexShrink: 0, width: 80, height: 80, display: 'grid', placeItems: 'center', borderRadius: 12, background: 'radial-gradient(closest-side, rgba(231,235,243,0.14), rgba(231,235,243,0.02))' }}>
          {icon ? <img src={icon} alt="" width={72} height={72} style={{ objectFit: 'contain' }} /> : <span style={{ fontSize: 26, color: I.muted }}>▲</span>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
          <span style={{ fontFamily: "'Spectral', serif", fontSize: 20, fontWeight: 600, lineHeight: 1.2 }}>{s.title.split(': ')[0]}</span>
          {s.title.includes(': ') ? <span data-phc-step="" style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', color: I.white, textTransform: 'uppercase' }}>{s.title.split(': ').slice(1).join(': ')}</span> : null}
          {s.note ? <span style={{ fontSize: 12.5, color: I.muted, lineHeight: 1.4 }}>{s.note}</span> : null}
        </div>
      </div>
      {s.lines.length ? (
        <div data-phc-upgrade-lines="" style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '4px 10px', fontSize: 13.5, alignItems: 'baseline' }}>
          {s.lines.map((l) => <React.Fragment key={l.label}><span style={{ color: I.muted }}>{l.label.replace(/ \(.*\)$/, '')}</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>{l.before}</span><span aria-hidden="true" style={{ color: I.muted }}>→</span><b style={{ fontVariantNumeric: 'tabular-nums', color: I.ok }}>{l.after} <span style={{ fontSize: 11 }}>▲ better</span></b></React.Fragment>)}
        </div>
      ) : null}
      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
        {s.price != null ? <div style={{ display: 'flex', flexDirection: 'column' }}><span data-phc-price="" style={{ fontSize: 26, fontWeight: 700, color: I.white, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{s.price ? s.price.toLocaleString('en') : 'Free'}</span>{s.price ? <span style={{ fontSize: 11, color: I.muted, letterSpacing: '0.08em' }}>CREDITS</span> : null}</div> : null}
        <button type="button" data-phc-upgrade-go="" data-phc-choice={choice ? s.key : undefined} data-phc-why={choice && s.why ? '' : undefined} aria-disabled={s.why ? 'true' : undefined} onClick={(e) => { if (s.why) openTipOn(e.currentTarget.closest('article')); else act(s.action as any); }}
          style={{ marginLeft: 'auto', minHeight: 42, padding: '0 18px', borderRadius: 10, border: 0, background: s.why ? 'transparent' : I.text, outline: s.why ? '1px solid #3B475D' : 'none', color: s.why ? I.muted : I.ground, fontFamily: 'inherit', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>Upgrade</button>
      </div>
      <span data-phc-status="" style={{ minHeight: 18, fontSize: 13, color: s.why ? I.muted : I.ok }}>{s.why || '✓ You can take this step'}</span>
    </article>
  );
}

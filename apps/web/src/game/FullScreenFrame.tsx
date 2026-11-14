// The frame of a shop and every other safe node (survival-spec 8.3; rules 1.42, 1.46). Rules 1.54 item 11 (Leon, 14 Nov
// 2026: every mode keeps the side panels): it is the play screen's MIDDLE column, never over the side panels. Across
// the top the safe node's backdrop under a dark gradient with the keeper (portrait, name in Spectral, role line in
// Chakra Petch caps, the speech card: a polite live region); then the tabs with the purse right-aligned (its last change
// floating off it); then the shelves. What used to sit around it lives in the side panels now: your hands, worn gear
// and pack in the sheet's GEAR tab, the squad's ready marks and the leaving control in the right panel's squad, the
// visit's log in the run board. Presentation only: every word and number it shows is handed in by the screen that uses
// it (ShopScreen; PlaceScreen, every other safe node: the Forge, a training ground, a shrine, a crossroads, a rest).
import React from 'react';
import { tipProps } from './actionTip';

export const FRAME_INK = { ground: '#0A0D13', panel: '#10151F', raised: '#1C2536', line: '#232D3F', text: '#E7EBF3', muted: '#A3AEC2', ok: '#6FEA77', hp: '#F65157', white: '#FFFFFF' };
const I = FRAME_INK;
/** What the keeper says (docs/design/ui-screens.md, Writing for the player): the engine's line (`base`: a greet, or the
 * shop's line after a purchase), until a tab opens, when the keeper says one of its lines for that tab (`says[tab]`, data
 * survival.json faces); after the next action (`logLen` grows) the engine's line again, or with `after` a line of that kind
 * (a place's `bought`, since a place's own line never changes). The lines turn over in order, so a tab opened twice varies. */
export function useKeeperLine(says: Record<string, string[]>, tab: string, base: string, logLen: number, after?: string): { text: string; key: string } {
  const [st, setSt] = React.useState<{ tab: string; n: number; log: number; text: string | null }>({ tab, n: 0, log: logLen, text: null });
  let next = st;
  if (logLen !== st.log) { const l = after ? says[after] || [] : []; next = { tab, n: st.n + 1, log: logLen, text: l.length ? l[st.n % l.length] : null }; }
  else if (tab !== st.tab) { const l = says[tab] || []; next = { tab, n: st.n + 1, log: logLen, text: l.length ? l[st.n % l.length] : st.text }; }
  if (next !== st) setSt(next);
  return { text: next.text ?? base, key: next.n + ':' + (next.text ?? base) };
}
/** One tab of the frame: its word, and when it can't be opened yet, why (the hover card says it). */
export interface FrameTab { id: string; label: string; disabled?: boolean; why?: string }
export interface FrameProps {
  /** The backdrop's URL ('' draws the ground colour) and the keeper's portrait URL ('' draws the AHOC panel). */
  backdrop: string; portrait: string;
  name: string; role: string; line: string; lineKey: string | number;
  tabs: FrameTab[]; tab: string; onTab: (id: string) => void;
  purse: number; purseLabel?: string;
  /** The host's "Close for everyone" (a shop): shown when given. */
  onClose?: () => void; closeTip?: string;
  children: React.ReactNode;
}
const CSS = [
  '@keyframes phcFrameIn{from{opacity:0}to{opacity:1}}',
  '@keyframes phcKeeperIn{from{opacity:0;transform:translateX(-24px)}to{opacity:1;transform:none}}',
  '@keyframes phcLineIn{from{opacity:0;clip-path:inset(0 100% 0 0)}to{opacity:1;clip-path:inset(0 0 0 0)}}',
  '@keyframes phcFloat{0%{opacity:0;transform:translateY(6px)}15%{opacity:1}100%{opacity:0;transform:translateY(-26px)}}',
  '.phc-frame{animation:phcFrameIn .45s ease-out}.phc-keeper-img{animation:phcKeeperIn .6s cubic-bezier(.2,.8,.2,1)}',
  '.phc-line{animation:phcLineIn 1.1s steps(28,end)}.phc-float{animation:phcFloat 1.8s ease-out forwards}',
  '.phc-frame button:focus-visible,.phc-frame [tabindex]:focus-visible{outline:2px solid #FFFFFF;outline-offset:2px}',
  '@media (prefers-reduced-motion: reduce){.phc-frame,.phc-keeper-img,.phc-line{animation:phcFrameIn .3s ease-out}.phc-float{animation:phcFrameIn .3s ease-out}}',
].join('');

export function FullScreenFrame(p: FrameProps) {
  const prev = React.useRef(p.purse), [float, setFloat] = React.useState<{ n: number; k: number } | null>(null);
  React.useEffect(() => { if (p.purse !== prev.current) { setFloat({ n: p.purse - prev.current, k: Date.now() }); prev.current = p.purse; } }, [p.purse]);
  const tabKey = (e: React.KeyboardEvent, i: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const on = p.tabs.filter((t) => !t.disabled), j = on.findIndex((t) => t.id === p.tabs[i].id), n = on[(j + (e.key === 'ArrowRight' ? 1 : on.length - 1)) % on.length];
    if (n) { p.onTab(n.id); (e.currentTarget.parentElement?.querySelector('[data-phc-tab="' + n.id + '"]') as HTMLElement | null)?.focus(); }
  };
  return (
    <div className="phc-frame" data-phc-place-frame="" style={{ position: 'relative', flex: '1 0 auto', display: 'flex', flexDirection: 'column', background: I.ground, color: I.text, fontFamily: "'Chakra Petch', sans-serif" }}>
      <style>{CSS}</style>
      {/* 1. the keeper, over the place's backdrop */}
      <section aria-label="The keeper" style={{ position: 'relative', display: 'flex', gap: 16, alignItems: 'flex-start', padding: '18px 20px', borderBottom: '1px solid ' + I.line, overflow: 'hidden' }}>
        {p.backdrop ? <img src={p.backdrop} alt="" aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(0.85) brightness(0.75)' }} /> : null}
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(10,13,19,0.55) 0%, rgba(10,13,19,0.86) 40%, rgba(10,13,19,0.94) 100%)' }} />
        <div className="phc-keeper-img" style={{ position: 'relative', width: 104, aspectRatio: '4 / 5', flexShrink: 0, borderRadius: 12, overflow: 'hidden', border: '1px solid #3B475D', background: I.raised, boxShadow: '0 12px 32px rgba(0,0,0,0.55)' }}>
          {p.portrait ? <img data-phc-keeper-portrait="" src={p.portrait} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            : <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: I.muted, fontSize: 11, letterSpacing: '0.18em' }}>AHOC</div>}
        </div>
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0, flex: 1 }}>
          <h1 data-phc-keeper-name="" style={{ margin: 0, fontFamily: "'Spectral', serif", fontWeight: 600, fontSize: 28, lineHeight: 1.1 }}>{p.name}</h1>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.16em', color: I.muted, textTransform: 'uppercase' }}>{p.role}</span>
          <div data-phc-speech="" aria-live="polite" style={{ marginTop: 4, padding: '10px 14px', borderRadius: 12, background: 'rgba(16,21,31,0.92)', border: '1px solid #3B475D' }}>
            <p key={p.lineKey} className="phc-line" style={{ margin: 0, fontFamily: "'Spectral', serif", fontStyle: 'italic', fontSize: 17, lineHeight: 1.45, color: I.text }}>“{p.line}”</p>
          </div>
        </div>
      </section>
      {/* 2. the tabs and the purse */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap', padding: '8px 20px 0', borderBottom: '1px solid ' + I.line }}>
        <div role="tablist" aria-label="Shelves" style={{ display: 'flex', gap: 2, flexWrap: 'wrap', minWidth: 0 }}>
          {p.tabs.map((t, i) => {
            const on = t.id === p.tab;
            return <button key={t.id} type="button" role="tab" aria-selected={on} aria-disabled={t.disabled || undefined} tabIndex={on ? 0 : -1} data-phc-tab={t.id} {...tipProps(t.disabled ? t.why : null)}
              onClick={() => { if (!t.disabled) p.onTab(t.id); }} onKeyDown={(e) => tabKey(e, i)}
              style={{ minHeight: 44, padding: '0 14px', border: 0, borderBottom: '3px solid ' + (on ? I.white : 'transparent'), background: 'transparent', color: t.disabled ? '#5E6A80' : on ? I.white : I.muted, fontFamily: 'inherit', fontSize: 15, fontWeight: 700, letterSpacing: '0.02em', cursor: t.disabled ? 'not-allowed' : 'pointer' }}>{t.label}</button>;
          })}
        </div>
        <div data-phc-purse="" style={{ marginLeft: 'auto', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', paddingBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: I.muted }}>{p.purseLabel || 'CREDITS'}</span>
          <span data-phc-purse-n="" style={{ fontSize: 30, fontWeight: 700, lineHeight: 1, color: I.white, fontVariantNumeric: 'tabular-nums' }}>{p.purse.toLocaleString('en')}</span>
          {float && float.n ? <span key={float.k} className="phc-float" aria-hidden="true" style={{ position: 'absolute', right: 'calc(100% + 14px)', bottom: 10, fontSize: 18, fontWeight: 700, color: float.n > 0 ? I.ok : I.white }}>{float.n > 0 ? '+' + float.n : '−' + Math.abs(float.n)}</span> : null}
        </div>
      </div>
      {/* 3. the shelves */}
      <main role="tabpanel" data-phc-shelves="" aria-label={p.tabs.find((t) => t.id === p.tab)?.label} style={{ padding: '18px 20px 32px' }}>{p.children}</main>
      {p.onClose ? <div style={{ padding: '0 20px 24px' }}><button type="button" data-phc-close="" onClick={p.onClose} {...tipProps(p.closeTip || null)} style={{ minHeight: 40, padding: '0 16px', borderRadius: 10, border: '1px solid #3B475D', background: 'transparent', color: I.text, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Close for everyone</button></div> : null}
    </div>
  );
}

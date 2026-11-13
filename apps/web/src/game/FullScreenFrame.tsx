// The full-screen frame of a shop and a Forge (survival-spec 8.3; rules 1.42): it REPLACES the play screen. The safe
// node's backdrop full-bleed under a dark gradient; the keeper on the left (portrait, name in Spectral, role line in
// Chakra Petch caps, the speech card: a polite live region), the party strip and the leaving buttons at its foot; the
// tabs across the top with the purse right-aligned (its last change floating off it); the shelves in the centre and the
// side panel on the right (each scrolls on its own; nothing is cut to save space); the visit's log along the bottom.
// Presentation only: every word and number it shows is handed in by the screen that uses it (ShopScreen; since rules
// 1.46 PlaceScreen, every other safe node: the Forge, a training ground, a shrine, a crossroads, a rest).
import React from 'react';
import { tipProps } from './actionTip';

export const FRAME_INK = { ground: '#0A0D13', panel: '#10151F', raised: '#1C2536', line: '#232D3F', text: '#E7EBF3', muted: '#A3AEC2', ok: '#6FEA77', hp: '#F65157', white: '#FFFFFF' };
const I = FRAME_INK;
/** One tab of the frame: its word, and when it can't be opened yet, why (the hover card says it). */
export interface FrameTab { id: string; label: string; disabled?: boolean; why?: string }
/** One member of the party strip: name, initials and colour, whether they are ready to leave, and whether it is you. */
export interface FrameMember { id: string; name: string; initials: string; color: string; ready: boolean; online: boolean; mine: boolean }
export interface FrameProps {
  /** The backdrop's URL ('' draws the ground colour) and the keeper's portrait URL ('' draws the AHOC panel). */
  backdrop: string; portrait: string;
  name: string; role: string; line: string; lineKey: string | number;
  tabs: FrameTab[]; tab: string; onTab: (id: string) => void;
  purse: number; purseLabel?: string;
  party: FrameMember[]; ready: boolean; isHost: boolean; waiting: string[];
  onReady: () => void; onClose: () => void; closeTip: string; readyWord: string;
  /** Rules 1.46: a place the party walks on from (not a shop): no "Close for everyone", and the party strip's words
   * (`marks`: [marked, not yet]) say who has marked the next node instead of READY / BROWSING. */
  hideClose?: boolean; marks?: [string, string];
  log: string[]; emptyLog?: string;
  children: React.ReactNode; side: React.ReactNode;
}
const CSS = [
  '@keyframes phcFrameIn{from{opacity:0}to{opacity:1}}',
  '@keyframes phcKeeperIn{from{opacity:0;transform:translateX(-36px)}to{opacity:1;transform:none}}',
  '@keyframes phcLineIn{from{opacity:0;clip-path:inset(0 100% 0 0)}to{opacity:1;clip-path:inset(0 0 0 0)}}',
  '@keyframes phcFloat{0%{opacity:0;transform:translateY(6px)}15%{opacity:1}100%{opacity:0;transform:translateY(-26px)}}',
  '.phc-frame{animation:phcFrameIn .45s ease-out}.phc-keeper-img{animation:phcKeeperIn .6s cubic-bezier(.2,.8,.2,1)}',
  '.phc-line{animation:phcLineIn 1.1s steps(28,end)}.phc-float{animation:phcFloat 1.8s ease-out forwards}',
  '.phc-frame ::-webkit-scrollbar{width:10px}.phc-frame ::-webkit-scrollbar-thumb{background:#2A3447;border-radius:6px}',
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
    <div className="phc-frame" data-phc-fullscreen="" style={{ position: 'fixed', inset: 0, zIndex: 50, background: I.ground, color: I.text, fontFamily: "'Chakra Petch', sans-serif", overflow: 'hidden' }}>
      <style>{CSS}</style>
      {p.backdrop ? <img src={p.backdrop} alt="" aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(0.85) brightness(0.75)' }} /> : null}
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(10,13,19,0.55) 0%, rgba(10,13,19,0.88) 30%, rgba(10,13,19,0.94) 60%, rgba(10,13,19,0.97) 100%)' }} />
      <div style={{ position: 'relative', height: '100%', display: 'grid', gridTemplateColumns: 'minmax(330px, 30%) minmax(0, 1fr) minmax(300px, 25%)', gridTemplateRows: 'auto minmax(0, 1fr) auto' }}>
        {/* 1. the keeper */}
        <section aria-label="The keeper" style={{ gridColumn: 1, gridRow: '1 / 3', display: 'flex', flexDirection: 'column', gap: 14, padding: '28px 28px 18px', minHeight: 0, overflowY: 'auto' }}>
          <div className="phc-keeper-img" style={{ position: 'relative', height: 'clamp(200px, calc(100vh - 470px), 640px)', aspectRatio: '4 / 5', maxWidth: '100%', alignSelf: 'center', borderRadius: 16, overflow: 'hidden', border: '1px solid #3B475D', background: I.raised, boxShadow: '0 18px 50px rgba(0,0,0,0.55)', flexShrink: 0 }}>
            {p.portrait ? <img data-phc-keeper-portrait="" src={p.portrait} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              : <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: I.muted, fontSize: 12, letterSpacing: '0.18em' }}>AHOC</div>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <h1 data-phc-keeper-name="" style={{ margin: 0, fontFamily: "'Spectral', serif", fontWeight: 600, fontSize: 'clamp(28px, 2.4vw, 42px)', lineHeight: 1.1 }}>{p.name}</h1>
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.18em', color: I.muted, textTransform: 'uppercase' }}>{p.role}</span>
          </div>
          <div data-phc-speech="" aria-live="polite" style={{ position: 'relative', padding: '16px 20px', borderRadius: 14, background: 'rgba(16,21,31,0.92)', border: '1px solid #3B475D' }}>
            <span aria-hidden="true" style={{ position: 'absolute', top: -9, left: 34, width: 16, height: 16, transform: 'rotate(45deg)', background: 'rgba(16,21,31,0.92)', borderLeft: '1px solid #3B475D', borderTop: '1px solid #3B475D' }} />
            <p key={p.lineKey} className="phc-line" style={{ margin: 0, fontFamily: "'Spectral', serif", fontStyle: 'italic', fontSize: 'clamp(18px, 1.35vw, 24px)', lineHeight: 1.45, color: I.text }}>“{p.line}”</p>
          </div>
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', color: I.muted }}>THE SQUAD{p.waiting.length ? ' · STILL BROWSING: ' + p.waiting.join(', ').toUpperCase() : ''}</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {p.party.map((m) => (
                <span key={m.id} data-phc-party={m.id} data-phc-ready={m.ready ? '1' : '0'} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 10px 6px 6px', borderRadius: 99, background: I.panel, border: '1px solid ' + (m.ready ? I.white : I.line), opacity: m.online ? 1 : 0.5 }}>
                  <span style={{ display: 'grid', placeItems: 'center', width: 26, height: 26, borderRadius: '50%', fontSize: 10, fontWeight: 700, background: m.color, color: I.ground }}>{m.initials}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{m.name}{m.mine ? ' (you)' : ''}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: m.ready ? I.white : I.muted }}>{m.ready ? (p.marks ? p.marks[0] : '✓ READY') : (p.marks ? p.marks[1] : 'BROWSING')}</span>
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button type="button" data-phc-leave="" onClick={p.onReady} disabled={p.ready} style={{ flex: 1, minHeight: 48, padding: '0 18px', borderRadius: 12, border: 0, background: p.ready ? I.raised : I.text, color: p.ready ? I.muted : I.ground, fontFamily: 'inherit', fontSize: 15, fontWeight: 700, cursor: p.ready ? 'default' : 'pointer' }}>{p.ready ? '✓ ' + p.readyWord : p.readyWord}</button>
              {p.isHost && !p.hideClose ? <button type="button" data-phc-close="" onClick={p.onClose} {...tipProps(p.closeTip)} style={{ minHeight: 48, padding: '0 18px', borderRadius: 12, border: '1px solid #3B475D', background: 'transparent', color: I.text, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Close for everyone</button> : null}
            </div>
          </div>
        </section>
        {/* 2. the tabs and the purse */}
        <div style={{ gridColumn: '2 / 4', gridRow: 1, display: 'flex', alignItems: 'flex-end', gap: 16, padding: '24px 28px 0 8px', borderBottom: '1px solid ' + I.line }}>
          <div role="tablist" aria-label="Shelves" style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {p.tabs.map((t, i) => {
              const on = t.id === p.tab;
              return <button key={t.id} type="button" role="tab" aria-selected={on} aria-disabled={t.disabled || undefined} tabIndex={on ? 0 : -1} data-phc-tab={t.id} {...tipProps(t.disabled ? t.why : null)}
                onClick={() => { if (!t.disabled) p.onTab(t.id); }} onKeyDown={(e) => tabKey(e, i)}
                style={{ minHeight: 48, padding: '0 20px', border: 0, borderBottom: '3px solid ' + (on ? I.white : 'transparent'), background: 'transparent', color: t.disabled ? '#5E6A80' : on ? I.white : I.muted, fontFamily: 'inherit', fontSize: 16, fontWeight: 700, letterSpacing: '0.02em', cursor: t.disabled ? 'not-allowed' : 'pointer' }}>{t.label}{t.disabled ? <span style={{ fontSize: 11, fontWeight: 600, marginLeft: 6, letterSpacing: '0.1em' }}>LATER</span> : null}</button>;
            })}
          </div>
          <div data-phc-purse="" style={{ marginLeft: 'auto', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', paddingBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: I.muted }}>{p.purseLabel || 'CREDITS'}</span>
            <span data-phc-purse-n="" style={{ fontSize: 'clamp(30px, 2.4vw, 44px)', fontWeight: 700, lineHeight: 1, color: I.white, fontVariantNumeric: 'tabular-nums' }}>{p.purse.toLocaleString('en')}</span>
            {float && float.n ? <span key={float.k} className="phc-float" aria-hidden="true" style={{ position: 'absolute', right: 'calc(100% + 14px)', bottom: 10, fontSize: 18, fontWeight: 700, color: float.n > 0 ? I.ok : I.white }}>{float.n > 0 ? '+' + float.n : '−' + Math.abs(float.n)}</span> : null}
          </div>
        </div>
        {/* 3. the shelves */}
        <main role="tabpanel" data-phc-shelves="" aria-label={p.tabs.find((t) => t.id === p.tab)?.label} style={{ gridColumn: 2, gridRow: 2, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', padding: '20px 20px 56px 8px', scrollPaddingBottom: 56, maskImage: 'linear-gradient(180deg, #000 calc(100% - 28px), rgba(0,0,0,0.25) 100%)', WebkitMaskImage: 'linear-gradient(180deg, #000 calc(100% - 28px), rgba(0,0,0,0.25) 100%)' }}>{p.children}</main>
        {/* 4. you */}
        <aside aria-label="You" style={{ gridColumn: 3, gridRow: 2, minHeight: 0, overflowY: 'auto', padding: '20px 28px 28px 12px', borderLeft: '1px solid ' + I.line, background: 'rgba(10,13,19,0.35)' }}>{p.side}</aside>
        {/* 5. the visit's log */}
        <footer data-phc-visit-log="" style={{ gridColumn: '1 / 4', gridRow: 3, display: 'flex', alignItems: 'center', gap: 14, minHeight: 56, padding: '0 28px', borderTop: '1px solid ' + I.line, background: 'rgba(10,13,19,0.92)', overflow: 'hidden', whiteSpace: 'nowrap' }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', color: I.muted, flexShrink: 0 }}>THIS VISIT</span>
          <span style={{ fontSize: 14, color: I.text, overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.log.length ? p.log.join('  ·  ') : (p.emptyLog || 'Nothing bought or sold yet.')}</span>
        </footer>
      </div>
    </div>
  );
}

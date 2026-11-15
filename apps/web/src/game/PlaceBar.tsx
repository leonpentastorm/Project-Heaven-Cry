// THE PLACE HEADER (the visibility standard; Leon, 15 Nov 2026: "the upper part of the shop need to be sticky too, all
// placed should follow this visibility standard"; docs/design/ui-screens.md "The place header stays"). ONE piece, used
// by every run screen that can scroll in the middle column: the camp, a shop, every other safe node (the Forge, a
// training ground, a shrine, a rest, a cache, a crossroads), the rewards after a fight and the stage's end. It stays at
// the top of the middle column's scroll (position: sticky, opaque, a line under it, over the cards) and holds: who or what
// the place is (its name; a keeper's portrait and role), its tabs when it has any, the money that matters there, and the
// button that moves on. Full size at the scroll's top; once the content is scrolled it is compact (the portrait about
// 48 px, the keeper's spoken line hidden). Presentation only: every word, number and action is handed in.
import React from 'react';
import { FRAME_INK as I } from './FullScreenFrame';

/** The element that scrolls the middle column (the centre slot), or null when the page itself scrolls (narrow screens). */
function scrollerOf(el: HTMLElement | null): HTMLElement | null {
  for (let e = el?.parentElement || null; e; e = e.parentElement) { const o = getComputedStyle(e).overflowY; if ((o === 'auto' || o === 'scroll') && e.scrollHeight > e.clientHeight + 1) return e; }
  return null;
}
/** True once the content under the header is scrolled (with a margin both ways, so the header shrinking never flips it
 * back), and only when there is enough to scroll that the shrink can't undo itself. */
function useCompact(ref: React.RefObject<HTMLElement | null>): boolean {
  const [compact, setCompact] = React.useState(false);
  React.useEffect(() => {
    let sc: HTMLElement | null = null, raf = 0;
    const read = () => {
      const top = sc ? sc.scrollTop : window.scrollY, room = sc ? sc.scrollHeight - sc.clientHeight : document.documentElement.scrollHeight - innerHeight;
      setCompact((was) => (was ? top > 8 : top > 120 && room > 320));
    };
    const on = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(read); };
    const bind = () => { const next = scrollerOf(ref.current); if (next !== sc) { (sc || window).removeEventListener('scroll', on); sc = next; (sc || window).addEventListener('scroll', on, { passive: true }); } read(); };
    bind(); const t = setInterval(bind, 1000); // the scroller appears once the content outgrows the column
    return () => { clearInterval(t); cancelAnimationFrame(raf); (sc || window).removeEventListener('scroll', on); };
  }, []);
  return compact;
}

export interface PlaceBarProps {
  /** the place's name (Spectral) */
  name: React.ReactNode;
  /** a line under the name in caps (a keeper's role, a kicker) */
  role?: React.ReactNode;
  /** the keeper's portrait: a URL, '' for the AHOC panel, undefined for none */
  portrait?: string; portraitAlt?: string;
  /** the place's backdrop behind the header (full size only) */
  backdrop?: string;
  /** the keeper's spoken line (a polite live region); hidden while compact */
  line?: { text: string; key: string | number };
  /** the tabs (or steps), under the name */
  tabs?: React.ReactNode;
  /** the money that matters here (credits, the camp's budget) */
  money?: React.ReactNode;
  /** the button that moves on (Leave, Continue, Next, Ready), and anything beside it */
  actions?: React.ReactNode;
  /** a full-width line at the foot (the last refusal) */
  foot?: React.ReactNode;
  /** data marks of the screen that uses it */
  marks?: Record<string, string>;
}
const CSS = '@keyframes phcKeeperIn{from{opacity:0;transform:translateX(-24px)}to{opacity:1;transform:none}}@keyframes phcLineIn{from{opacity:0;clip-path:inset(0 100% 0 0)}to{opacity:1;clip-path:inset(0 0 0 0)}}'
  + '.phc-keeper-img{animation:phcKeeperIn .6s cubic-bezier(.2,.8,.2,1)}.phc-line{animation:phcLineIn 1.1s steps(28,end)}'
  + '.phc-placebar{transition:padding .18s ease}.phc-placebar .phc-pb-portrait{transition:width .18s ease}'
  + '@media (prefers-reduced-motion: reduce){.phc-keeper-img,.phc-line{animation:none}.phc-placebar,.phc-placebar .phc-pb-portrait{transition:none}}';

/** The place header: sticky at the top of the middle column's scroll; compact once scrolled. */
export function PlaceBar(p: PlaceBarProps) {
  const ref = React.useRef<HTMLElement>(null), compact = useCompact(ref);
  return (
    <header ref={ref} className="phc-placebar" data-phc-place-bar="" data-phc-compact={compact ? '1' : '0'} {...(p.marks || {})}
      style={{ position: 'sticky', top: 0, zIndex: 6, display: 'flex', flexDirection: 'column', background: I.ground, borderBottom: '1px solid ' + I.line, boxShadow: '0 6px 14px rgba(0,0,0,0.35)', overflow: 'hidden' }}>
      <style>{CSS}</style>
      {p.backdrop && !compact ? <img src={p.backdrop} alt="" aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(0.85) brightness(0.75)' }} /> : null}
      {/* the shade over the painting: with a keeper, light behind the portrait and dark behind the speech; with none (the
          camp), the painting shows across the bar under an even shade that keeps its text at contrast (a shadow under it) */}
      {p.backdrop && !compact ? <div aria-hidden="true" data-phc-place-shade="" style={{ position: 'absolute', inset: 0, background: p.portrait !== undefined
        ? 'linear-gradient(90deg, rgba(10,13,19,0.55) 0%, rgba(10,13,19,0.86) 40%, rgba(10,13,19,0.94) 100%)'
        : 'linear-gradient(90deg, rgba(10,13,19,0.82) 0%, rgba(10,13,19,0.6) 45%, rgba(10,13,19,0.7) 100%)' }} /> : null}
      <div style={{ position: 'relative', display: 'flex', alignItems: compact ? 'center' : 'flex-start', flexWrap: 'wrap', gap: '10px 18px', padding: compact ? '8px 20px' : '16px 20px 12px', ...(p.backdrop && !compact && p.portrait === undefined ? { textShadow: '0 1px 3px rgba(0,0,0,0.85)' } : {}) }}>
        {p.portrait !== undefined ? (
          <div className="phc-keeper-img phc-pb-portrait" style={{ position: 'relative', width: compact ? 48 : 104, aspectRatio: compact ? '1 / 1' : '4 / 5', flexShrink: 0, borderRadius: compact ? 10 : 12, overflow: 'hidden', border: '1px solid #3B475D', background: I.raised, boxShadow: '0 12px 32px rgba(0,0,0,0.55)' }}>
            {p.portrait ? <img data-phc-keeper-portrait="" src={p.portrait} alt={p.portraitAlt || ''} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 20%', display: 'block' }} />
              : <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: I.muted, fontSize: 13, letterSpacing: '0.18em' }}>AHOC</div>}
          </div>) : null}
        <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 2 : 6, minWidth: 0, flex: '1 1 260px' }}>
          <h1 data-phc-keeper-name="" style={{ margin: 0, fontFamily: "'Spectral', serif", fontWeight: 600, fontSize: compact ? 22 : 28, lineHeight: 1.1, overflowWrap: 'anywhere' }}>{p.name}</h1>
          {p.role ? <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.14em', color: I.muted, textTransform: 'uppercase' }}>{p.role}</span> : null}
          {p.line ? <div data-phc-speech="" aria-live="polite" style={compact ? { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' } : { marginTop: 4, padding: '10px 14px', borderRadius: 12, background: 'rgba(16,21,31,0.92)', border: '1px solid #3B475D' }}>
            <p key={p.line.key} className="phc-line" style={{ margin: 0, fontFamily: "'Spectral', serif", fontStyle: 'italic', fontSize: 17, lineHeight: 1.45, color: I.text }}>“{p.line.text}”</p>
          </div> : null}
        </div>
        {p.money ? <div data-phc-bar-money="" style={{ display: 'flex', alignItems: 'center', gap: '10px 18px', flexWrap: 'wrap', alignSelf: 'center' }}>{p.money}</div> : null}
        {p.actions ? <div data-phc-bar-move="" style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', alignSelf: 'center' }}>{p.actions}</div> : null}
        {p.foot ? <div style={{ flexBasis: '100%' }}>{p.foot}</div> : null}
      </div>
      {p.tabs ? <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap', padding: '0 20px', borderTop: compact ? 0 : '1px solid ' + I.line, background: I.ground }}>{p.tabs}</div> : null}
    </header>
  );
}

/** The money as the house shows it: a small caps label over a large number. */
export function BarNumber({ label, n, muted, mark, numMark, children }: { label: string; n: number | string; muted?: boolean; mark?: Record<string, string>; numMark?: Record<string, string>; children?: React.ReactNode }) {
  return (
    <div {...(mark || {})} style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.14em', color: I.muted }}>{label}</span>
      <span data-phc-bar-n="" {...(numMark || {})} style={{ fontSize: 36, fontWeight: 700, lineHeight: 1, color: muted ? I.muted : I.white, fontVariantNumeric: 'tabular-nums' }}>{typeof n === 'number' ? n.toLocaleString('en') : n}</span>
      {children}
    </div>
  );
}

// The reward panel (rules 1.64; docs/design/ui-screens.md "The reward panel"): after a won fight's field, while the run
// waits on rewards, a panel opens by itself over the MIDDLE column (the left sheet and the right panel stay where they
// are), wherever the middle is scrolled: the fight's name, the viewer's pay (XP and the new total, a level-up waiting,
// credits, the supply pack) and the viewer's own pick (the same cards as the run screen's, rewardCards.tsx). Its two
// sections fold and remember (tabPrefs). Closed early, a large bar pinned to the bottom of the middle reopens it; the
// map's refusals (the engine's words) show on the say line just above it. Every word is data (survival.json
// run.reward_panel); every number is rewardPanelView's.
import React from 'react';
import { createPortal } from 'react-dom';
import { survivalRun } from '@engine';
import { isFolded, setFolded } from './tabPrefs';
import { go } from './store';
import { Offer, Choices } from './rewardCards';
import { type RewardPanelV, payPieces } from './rewardPanelView';

const ink = { ground: '#0A0D13', panel: '#10151F', raised: '#1C2536', line: '#232D3F', text: '#E7EBF3', muted: '#A3AEC2', ok: '#6FEA77', white: '#FFFFFF' };
const kick: React.CSSProperties = { fontSize: 'var(--fs-sub)', fontWeight: 700, letterSpacing: '0.16em', color: ink.muted };
const W = () => survivalRun.reward_panel;

/** The middle column's visible box (the play screen's centre slot), clipped to the window: what the panel covers. */
export function useCentreBox(): { left: number; top: number; width: number; height: number } {
  const read = () => {
    const el = document.querySelector('[data-phc-centre]') as HTMLElement | null, b = el?.getBoundingClientRect();
    if (!b || !b.width) return { left: 0, top: 0, width: innerWidth, height: innerHeight };
    const top = Math.max(0, b.top), bottom = Math.min(innerHeight, b.bottom);
    return { left: b.left, top, width: b.width, height: Math.max(0, bottom - top) };
  };
  const [box, setBox] = React.useState(read);
  React.useLayoutEffect(() => {
    let raf = 0;
    const on = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => setBox((o) => { const n = read(); return o.left === n.left && o.top === n.top && o.width === n.width && o.height === n.height ? o : n; })); };
    // (a screen's entrance slides the middle in: read again when an animation ends, a transform moves no ResizeObserver)
    on(); addEventListener('resize', on); addEventListener('scroll', on, true); addEventListener('animationend', on, true);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(on) : null; const el = document.querySelector('[data-phc-centre]'); if (ro && el) ro.observe(el);
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', on); removeEventListener('scroll', on, true); removeEventListener('animationend', on, true); ro?.disconnect(); };
  }, []);
  return box;
}

/** A section of the panel that folds to its heading and remembers it (the one fold rule, fold.ts / tabPrefs). */
function Fold({ id, title, children }: { id: string; title: React.ReactNode; children: React.ReactNode }) {
  const [, redraw] = React.useReducer((x: number) => x + 1, 0), folded = isFolded(id, false);
  return (
    <section data-phc-reward-fold={id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <button type="button" aria-expanded={folded ? 'false' : 'true'} onClick={() => { setFolded(id, !folded); redraw(); }}
        style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', minHeight: 26, padding: 0, border: 0, background: 'transparent', color: 'inherit', fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer' }}>
        <span aria-hidden="true" style={{ flex: 'none', width: 12, fontSize: 'var(--fs-sub)', color: ink.muted }}>{folded ? '▸' : '▾'}</span>
        {typeof title === 'string' ? <span style={kick}>{title}</span> : title}
      </button>
      {folded ? null : children}
    </section>
  );
}

/** The viewer's pay, one line a character (wording pass, section 9: one heading for one choice): "+35 XP · +100 credits"
 * (the character's name first when the viewer pays more than one), then only what changes what the player does: the
 * supply pack, back on their feet, and a Level up button. The totals ride on data attributes for the suites, unshown. */
function Pay({ p, named }: { p: RewardPanelV['pay'][number]; named: boolean }) {
  const big: React.CSSProperties = { fontSize: 20, fontWeight: 700, fontVariantNumeric: 'tabular-nums' };
  return (
    <div data-phc-reward-pay={p.charId} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px 14px' }}>
      <span data-phc-reward-line="" style={{ display: 'inline-flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '0 8px' }}>
        {named ? <span style={{ fontSize: 'var(--fs-body)', fontWeight: 700 }}>{p.name}</span> : null}
        {payPieces(p).map((x, i) => <React.Fragment key={x.kind}>
          {i ? <span aria-hidden="true" style={{ color: ink.muted }}>·</span> : null}
          <b {...(x.kind === 'xp' ? { 'data-phc-reward-xp': p.xp ?? '' } : x.kind === 'credits' ? { 'data-phc-reward-credits': p.credits ?? '' } : {})} style={{ ...big, color: x.kind === 'none' ? ink.muted : ink.ok }}>{x.text}</b>
        </React.Fragment>)}
        <span hidden data-phc-reward-xp-total={p.xpTotal} /><span hidden data-phc-reward-credits-total={p.creditsTotal} />
      </span>
      {p.supply.length ? <span data-phc-reward-supply="" style={{ fontSize: 'var(--fs-body)', lineHeight: 1.4 }}>{p.supply.join(' · ')}</span> : null}
      {p.back ? <span data-phc-reward-back="" style={{ fontSize: 'var(--fs-body)', color: ink.ok }}>{'✓ '}{W().back}</span> : null}
      {p.levelUp ? <button type="button" data-phc-reward-levelup="" onClick={() => go('levelup', { levelupChar: p.charId } as any)}
        style={{ minHeight: 34, padding: '0 14px', borderRadius: 999, border: '1px solid ' + ink.white, background: 'transparent', color: ink.white, fontFamily: 'inherit', fontSize: 'var(--fs-body)', fontWeight: 700, cursor: 'pointer' }}>{'▲ '}{W().level_up}</button> : null}
    </div>
  );
}

/** The panel itself, over the middle column (a portal to the page, fixed: it is in view however the middle is scrolled). */
export function RewardPanel({ p, onClose }: { p: RewardPanelV; onClose: () => void }) {
  const box = useCentreBox(), pad = 12;
  React.useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; addEventListener('keydown', k); return () => removeEventListener('keydown', k); }, [onClose]);
  return createPortal(
    <div data-phc-reward-veil="" style={{ position: 'fixed', left: box.left, top: box.top, width: box.width, height: box.height, zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: pad, boxSizing: 'border-box', background: 'rgba(5, 7, 11, 0.66)', fontFamily: "'Chakra Petch', sans-serif", color: ink.text }}>
      <div role="dialog" aria-modal="false" aria-label={W().title} data-phc-reward-panel={p.key}
        style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 980, maxHeight: '100%', overflow: 'auto', boxSizing: 'border-box', padding: '12px 16px 14px', borderRadius: 16, background: 'linear-gradient(180deg, #141B28, #0D121B)', border: '1px solid #3B475D', boxShadow: '0 18px 48px rgba(0,0,0,0.6)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* one heading: the fight and how it went ("A Swarm · won in 2 rounds") */}
            <span data-phc-reward-kicker="" style={{ fontFamily: "'Spectral', serif", fontSize: 24, fontWeight: 600, lineHeight: 1.2 }}>
              {p.kicker}{p.title && p.title !== W().title && p.title !== p.kicker ? <span data-phc-reward-title="">{' · ' + p.title.charAt(0).toLowerCase() + p.title.slice(1)}</span> : null}</span>
            {p.still ? <span data-phc-reward-still="" style={{ fontSize: 'var(--fs-body)', color: ink.white }}>{p.still}</span> : null}
          </div>
          <button type="button" data-phc-reward-close="" aria-label={W().close} onClick={onClose}
            style={{ flex: 'none', width: 40, height: 40, borderRadius: 10, border: '1px solid ' + ink.line, background: 'transparent', color: ink.text, fontSize: 20, fontFamily: 'inherit', cursor: 'pointer' }}>{'✕'}</button>
        </div>
        {p.pay.length ? <Fold id="reward:pay" title={W().pay}>{p.pay.map((x) => <Pay key={x.charId} p={x} named={p.pay.length > 1} />)}</Fold> : null}
        {p.offers.length ? <Fold id="reward:pick" title={<span style={{ fontSize: 'var(--fs-body)', fontWeight: 700, color: ink.text }}>{p.offers.every((o) => (o.materials ? 1 : 0) + o.cards.length <= 1) ? W().take_one || W().pick : W().pick}</span>}>{p.offers.map((o) => <Offer key={o.charId} o={o} minH={280} inPanel />)}</Fold> : null}
        {p.kits.length ? <Fold id="reward:kit" title={W().kit}>{p.kits.map((x) => <Choices key={'kit-' + x.charId} x={x} kit />)}</Fold> : null}
      </div>
    </div>, document.body);
}

/** The bottom of the middle column: the say line (the engine's reason a map click was refused) and, when the viewer
 * closed the panel with a pick still to make, the large pinned bar that reopens it. */
export function RewardDock({ say, owed, onOpen }: { say: string | null; owed: boolean; onOpen: () => void }) {
  const box = useCentreBox();
  if (!say && !owed) return null;
  return createPortal(
    <div data-phc-reward-dock="" style={{ position: 'fixed', left: box.left, width: box.width, top: box.top + box.height, transform: 'translateY(-100%)', zIndex: 39, display: 'flex', flexDirection: 'column', gap: 8, padding: 12, boxSizing: 'border-box', pointerEvents: 'none', fontFamily: "'Chakra Petch', sans-serif" }}>
      {say ? <span role="status" data-phc-map-say="" style={{ alignSelf: 'center', maxWidth: '100%', padding: '10px 16px', borderRadius: 10, background: ink.raised, border: '1px solid #3B475D', color: ink.white, fontSize: 15, fontWeight: 600, boxShadow: '0 6px 18px rgba(0,0,0,0.5)' }}>{say}</span> : null}
      {/* rules 1.66 item 5206: the whole bar reopens the panel on the press itself (a mouse button down anywhere on it), so
          a redraw between press and release can't lose it; Enter and Space still click it */}
      {owed ? <button type="button" data-phc-reward-bar="" onPointerDown={(e) => { if (e.button === 0) { e.preventDefault(); onOpen(); } }} onClick={onOpen}
        style={{ pointerEvents: 'auto', width: '100%', minHeight: 56, borderRadius: 12, border: 0, background: ink.text, color: ink.ground, fontFamily: 'inherit', fontSize: 18, fontWeight: 700, letterSpacing: '0.04em', cursor: 'pointer', boxShadow: '0 8px 22px rgba(0,0,0,0.55)' }}>
        {'▲ '}{W().bar}</button> : null}
    </div>, document.body);
}

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
import { Offer, Choices } from './rewardCards';
import type { RewardPanelV } from './rewardPanelView';

const ink = { ground: '#0A0D13', panel: '#10151F', raised: '#1C2536', line: '#232D3F', text: '#E7EBF3', muted: '#A3AEC2', ok: '#6FEA77', white: '#FFFFFF' };
const kick: React.CSSProperties = { fontSize: 13, fontWeight: 700, letterSpacing: '0.16em', color: ink.muted };
const W = () => survivalRun.reward_panel;

/** The middle column's visible box (the play screen's centre slot), clipped to the window: what the panel covers. */
function useCentreBox(): { left: number; top: number; width: number; height: number } {
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
    on(); addEventListener('resize', on); addEventListener('scroll', on, true);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(on) : null; const el = document.querySelector('[data-phc-centre]'); if (ro && el) ro.observe(el);
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', on); removeEventListener('scroll', on, true); ro?.disconnect(); };
  }, []);
  return box;
}

/** A section of the panel that folds to its heading and remembers it (the one fold rule, fold.ts / tabPrefs). */
function Fold({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  const [, redraw] = React.useReducer((x: number) => x + 1, 0), folded = isFolded(id, false);
  return (
    <section data-phc-reward-fold={id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <button type="button" aria-expanded={folded ? 'false' : 'true'} onClick={() => { setFolded(id, !folded); redraw(); }}
        style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', minHeight: 26, padding: 0, border: 0, background: 'transparent', color: 'inherit', fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer' }}>
        <span aria-hidden="true" style={{ flex: 'none', width: 12, fontSize: 11, color: ink.muted }}>{folded ? '▸' : '▾'}</span>
        <span style={kick}>{title}</span>
      </button>
      {folded ? null : children}
    </section>
  );
}

/** The viewer's pay, one card a character: XP (and the total now, a level-up waiting), credits (and the purse now), the
 * supply pack, standing up. Colour with a word: success green for a gain, white for what is still to do. */
function Pay({ p }: { p: RewardPanelV['pay'][number] }) {
  const cell: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 0, minWidth: 96 };
  const big: React.CSSProperties = { fontSize: 22, lineHeight: 1.15, fontVariantNumeric: 'tabular-nums' };
  return (
    <div data-phc-reward-pay={p.charId} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 12px', borderRadius: 12, background: ink.panel, border: '1px solid ' + ink.line }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '6px 22px' }}>
        <span style={{ ...cell, minWidth: 0 }}>
          <span style={{ ...kick, color: ink.text }}>{p.name.toUpperCase()}</span>
          <span style={{ fontSize: 13, color: ink.muted }}>LEVEL {p.level}</span>
        </span>
        <span style={cell}>
          <span style={kick}>{W().xp}</span>
          <span><b data-phc-reward-xp={p.xp ?? ''} style={{ ...big, color: p.xp ? ink.ok : ink.muted }}>{p.xp ? '+' + p.xp : '–'}</b>{' '}
            <span data-phc-reward-xp-total={p.xpTotal} style={{ fontSize: 13, color: ink.muted }}>{W().xp_total.replace('{xp}', String(p.xpTotal))}</span></span>
        </span>
        <span style={cell}>
          <span style={kick}>{W().credits.toUpperCase()}</span>
          <span><b data-phc-reward-credits={p.credits ?? ''} style={{ ...big, color: p.credits ? ink.ok : ink.muted }}>{p.credits ? '+' + p.credits : '–'}</b>{' '}
            <span data-phc-reward-credits-total={p.creditsTotal} style={{ fontSize: 13, color: ink.muted }}>{W().credits_total.replace('{credits}', String(p.creditsTotal))}</span></span>
        </span>
        {p.supply.length ? <span style={{ ...cell, flex: 1, minWidth: 160 }}>
          <span style={kick}>{W().supply.toUpperCase()}</span>
          <span data-phc-reward-supply="" style={{ fontSize: 14, lineHeight: 1.4 }}>{p.supply.join(', ')}</span>
        </span> : null}
      </div>
      {p.back ? <span data-phc-reward-back="" style={{ fontSize: 13, color: ink.ok }}>{'✓ '}{W().back}</span> : null}
      {p.levelUp ? <span data-phc-reward-levelup="" style={{ fontSize: 14, fontWeight: 700, color: ink.white }}>{'▲ '}{W().level_up}</span> : null}
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
            <span data-phc-reward-kicker="" style={kick}>{p.kicker.toUpperCase()}</span>
            <span style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '0 12px' }}>
              <span style={{ fontFamily: "'Spectral', serif", fontSize: 26, fontWeight: 600, lineHeight: 1.15 }}>{W().title}</span>
              {p.title && p.title !== W().title ? <span data-phc-reward-title="" style={{ fontSize: 14, color: ink.muted }}>{p.title}</span> : null}
            </span>
            {p.still ? <span data-phc-reward-still="" style={{ fontSize: 14, color: ink.white }}>{p.still}</span> : null}
          </div>
          <button type="button" data-phc-reward-close="" aria-label={W().close} onClick={onClose}
            style={{ flex: 'none', width: 40, height: 40, borderRadius: 10, border: '1px solid ' + ink.line, background: 'transparent', color: ink.text, fontSize: 20, fontFamily: 'inherit', cursor: 'pointer' }}>{'✕'}</button>
        </div>
        {p.pay.length ? <Fold id="reward:pay" title={W().pay}>{p.pay.map((x) => <Pay key={x.charId} p={x} />)}</Fold> : null}
        {p.offers.length ? <Fold id="reward:pick" title={W().pick}>{p.offers.map((o) => <Offer key={o.charId} o={o} minH={280} />)}</Fold> : null}
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
      {owed ? <button type="button" data-phc-reward-bar="" onClick={onOpen}
        style={{ pointerEvents: 'auto', minHeight: 56, borderRadius: 12, border: 0, background: ink.text, color: ink.ground, fontFamily: 'inherit', fontSize: 18, fontWeight: 700, letterSpacing: '0.04em', cursor: 'pointer', boxShadow: '0 8px 22px rgba(0,0,0,0.55)' }}>
        {'▲ '}{W().bar}</button> : null}
    </div>, document.body);
}

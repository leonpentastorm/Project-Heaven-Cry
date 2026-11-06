// The story column (spec: Overworld rounds, On screen): it scrolls on its own, sticks to the newest line while you're
// at the bottom, and when you've scrolled up a "Latest" button jumps back down (with how many lines arrived meanwhile).
// On narrow screens the column doesn't scroll by itself and the page does: the same rules then apply to the page.
import React from 'react';

const NEAR = 160;
export function StoryScroll({ count, lastId, busy }: { count: number; lastId?: string; busy: boolean }) {
  const [el, setEl] = React.useState<HTMLElement | null>(null);
  const [away, setAway] = React.useState(false);
  const [unseen, setUnseen] = React.useState(0);
  const [box, setBox] = React.useState<{ left: number; width: number; bottom: number } | null>(null);
  const stick = React.useRef(true), seenId = React.useRef(lastId), countRef = React.useRef(count), lastRef = React.useRef(lastId), newCount = React.useRef(0);
  countRef.current = count; lastRef.current = lastId;
  // The story element belongs to the play screen's template: find it after each render.
  React.useEffect(() => { const s = document.querySelector<HTMLElement>('.phc-story'); if (s !== el) setEl(s); });
  const own = React.useCallback(() => !!el && getComputedStyle(el).overflowY !== 'visible', [el]);
  const gap = React.useCallback(() => (own() ? el!.scrollHeight - el!.scrollTop - el!.clientHeight : document.documentElement.scrollHeight - scrollY - innerHeight), [el, own]);
  const toEnd = React.useCallback((smooth: boolean) => { const b: ScrollBehavior = smooth ? 'smooth' : 'auto'; if (own()) el!.scrollTo({ top: el!.scrollHeight, behavior: b }); else scrollTo({ top: document.documentElement.scrollHeight, behavior: b }); }, [el, own]);
  React.useEffect(() => {
    if (!el) return;
    const measure = () => { const r = el.getBoundingClientRect(); setBox({ left: r.left, width: r.width, bottom: Math.min(r.bottom, innerHeight) }); };
    const onScroll = () => { const at = gap() < NEAR; stick.current = at; setAway(!at); if (at) { setUnseen(0); newCount.current = 0; seenId.current = lastRef.current; } else measure(); };
    el.addEventListener('scroll', onScroll, { passive: true }); addEventListener('scroll', onScroll, { passive: true }); addEventListener('resize', measure); measure();
    el.closest('.phc-screen-in')?.addEventListener('animationend', measure, { once: true });
    // On arrival: start at the newest line.
    toEnd(false); stick.current = true;
    // Lines that grow after render (images, the voice revealing text) keep the bottom in view too.
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => { if (stick.current) toEnd(false); measure(); }) : null;
    if (ro) { ro.observe(el); if (el.firstElementChild) ro.observe(el.firstElementChild); }
    return () => { el.removeEventListener('scroll', onScroll); removeEventListener('scroll', onScroll); removeEventListener('resize', measure); ro?.disconnect(); };
  }, [el, gap, toEnd]);
  React.useEffect(() => {
    if (!el || lastId === seenId.current) return;
    if (stick.current) { toEnd(true); seenId.current = lastId; }
    else { newCount.current++; setUnseen(newCount.current); seenId.current = lastId; }
  }, [lastId, busy, el, toEnd]);
  if (!el || !away || !box) return null;
  const jump = () => { toEnd(true); stick.current = true; setAway(false); setUnseen(0); newCount.current = 0; seenId.current = lastRef.current; };
  return (
    <button type="button" onClick={jump} aria-label="Jump to the latest line" style={{ position: 'fixed', left: box.left + box.width / 2, top: box.bottom - 56, transform: 'translateX(-50%)', zIndex: 8,
      minHeight: 38, padding: '0 16px', borderRadius: 999, border: '1px solid #FFFFFF', background: '#10151F', color: '#FFFFFF', fontFamily: "'Chakra Petch', sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', cursor: 'pointer', boxShadow: '0 6px 20px rgba(0,0,0,0.6)' }}>
      ↓ Latest{unseen ? ' · ' + unseen + ' new' : ''}
    </button>
  );
}

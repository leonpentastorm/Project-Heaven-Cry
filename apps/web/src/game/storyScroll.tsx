// The story column (spec: Play screen layout): it scrolls on its own, sticks to the newest line while you're at the
// bottom, and when you've scrolled up a "Latest" button jumps back down (with how many lines arrived meanwhile).
import React from 'react';

const NEAR = 160;
export function StoryScroll({ count, busy }: { count: number; busy: boolean }) {
  const [el, setEl] = React.useState<HTMLElement | null>(null);
  const [away, setAway] = React.useState(false);
  const [unseen, setUnseen] = React.useState(0);
  const [box, setBox] = React.useState<DOMRect | null>(null);
  const stick = React.useRef(true), seen = React.useRef(count);
  // The story element belongs to the play screen's template: find it after each render.
  React.useEffect(() => { const s = document.querySelector<HTMLElement>('.phc-story'); if (s !== el) setEl(s); });
  React.useEffect(() => {
    if (!el) return;
    const measure = () => setBox(el.getBoundingClientRect());
    const onScroll = () => { const at = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR; stick.current = at; setAway(!at); if (at) { setUnseen(0); seen.current = count; } };
    el.addEventListener('scroll', onScroll, { passive: true }); addEventListener('resize', measure); measure();
    // On arrival: start at the newest line.
    el.scrollTop = el.scrollHeight; stick.current = true;
    // Lines that grow after render (images, the voice revealing text) keep the bottom in view too.
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => { if (stick.current) el.scrollTop = el.scrollHeight; measure(); }) : null;
    if (ro) { ro.observe(el); if (el.firstElementChild) ro.observe(el.firstElementChild); }
    return () => { el.removeEventListener('scroll', onScroll); removeEventListener('resize', measure); ro?.disconnect(); };
  }, [el]);
  React.useEffect(() => {
    if (!el) return;
    if (stick.current) { el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }); seen.current = count; }
    else setUnseen(Math.max(0, count - seen.current));
  }, [count, busy, el]);
  if (!el || !away || !box) return null;
  const jump = () => { el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }); stick.current = true; setAway(false); setUnseen(0); seen.current = count; };
  return (
    <button type="button" onClick={jump} aria-label="Jump to the latest line" style={{ position: 'fixed', left: box.left + box.width / 2, top: box.bottom - 56, transform: 'translateX(-50%)', zIndex: 8,
      minHeight: 38, padding: '0 16px', borderRadius: 999, border: '1px solid #FFFFFF', background: '#10151F', color: '#FFFFFF', fontFamily: "'Chakra Petch', sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', cursor: 'pointer', boxShadow: '0 6px 20px rgba(0,0,0,0.6)' }}>
      ↓ Latest{unseen ? ' · ' + unseen + ' new' : ''}
    </button>
  );
}

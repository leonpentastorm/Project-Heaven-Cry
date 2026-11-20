// A log read top to bottom, oldest first, that rests on its newest line (0.33, outside playtest of 0.32.0: the combat
// log said "newest at the bottom" while its lines were written newest first, and an action's lines read backwards to a
// screen reader). The lines are in the order they happened; this keeps the box scrolled to its end while the reader is
// there, and leaves it alone while they have scrolled up into the history. One helper, for any [data-log-pin] box.

const PINNED = new WeakSet<Element>();
/** Within this many px of the end counts as at the end. */
const NEAR_PX = 12;

/** Pin every [data-log-pin] box not pinned yet (cheap to call on every render: a box is set up once). */
export function pinLogs(root: ParentNode | null = typeof document !== 'undefined' ? document : null) {
  if (!root || typeof (root as any).querySelectorAll !== 'function') return;
  root.querySelectorAll('[data-log-pin]').forEach((el) => {
    if (PINNED.has(el)) return;
    PINNED.add(el);
    const box = el as HTMLElement;
    let atEnd = true;
    const toEnd = () => { box.scrollTop = box.scrollHeight; };
    box.addEventListener('scroll', () => { atEnd = box.scrollTop + box.clientHeight >= box.scrollHeight - NEAR_PX; }, { passive: true });
    if (typeof MutationObserver !== 'undefined') new MutationObserver(() => { if (atEnd) toEnd(); }).observe(box, { childList: true, subtree: true, characterData: true });
    toEnd();
  });
}

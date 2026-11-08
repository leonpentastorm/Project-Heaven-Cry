// Keyboard movement for a glyph keyboard: a box marked data-glyph-keyboard holding rows marked data-word-row, each
// with buttons marked data-word (the combat Draw pad, the area map's draw pad, the Proving Ground's word list).

/** Arrow keys on the glyph keyboard: Left/Right step through the keys (across rows, wrapping), Up/Down go to the
 * nearest key in the row above or below, Home/End jump to the first or last key. Focus moves; Enter or Space picks. */
export function glyphKeyNav(e: any): void {
  const me = e && e.currentTarget, pad = me && typeof me.closest === 'function' && me.closest('[data-glyph-keyboard]');
  if (!pad || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) return;
  const rows = [...pad.querySelectorAll('[data-word-row]')].map((r: Element) => [...r.querySelectorAll('button[data-word]')] as HTMLElement[]).filter((r) => r.length);
  const all: HTMLElement[] = rows.flat(), i = all.indexOf(me); if (i < 0) return;
  let to: HTMLElement | null = null;
  if (e.key === 'ArrowRight') to = all[(i + 1) % all.length];
  else if (e.key === 'ArrowLeft') to = all[(i - 1 + all.length) % all.length];
  else if (e.key === 'Home') to = all[0];
  else if (e.key === 'End') to = all[all.length - 1];
  else {
    const ri = rows.findIndex((r) => r.includes(me)), cx = (b: HTMLElement) => { const r = b.getBoundingClientRect(); return r.left + r.width / 2; }, cy = (b: HTMLElement) => b.getBoundingClientRect().top;
    // A row may wrap over two lines: first try the next line inside this row, then the neighbouring row.
    const dir = e.key === 'ArrowDown' ? 1 : -1, y0 = cy(me), x0 = cx(me);
    const lineOf = (list: HTMLElement[]) => list.filter((b) => (dir > 0 ? cy(b) > y0 + 2 : cy(b) < y0 - 2));
    let pool = lineOf(rows[ri]);
    if (!pool.length) { const nr = rows[ri + dir]; if (!nr) return e.preventDefault(); pool = nr; }
    const yT = dir > 0 ? Math.min(...pool.map(cy)) : Math.max(...pool.map(cy)), line = pool.filter((b) => Math.abs(cy(b) - yT) <= 2);
    to = line.reduce((a, b) => (Math.abs(cx(b) - x0) < Math.abs(cx(a) - x0) ? b : a), line[0]);
  }
  e.preventDefault();
  if (to && to.focus) to.focus();
}
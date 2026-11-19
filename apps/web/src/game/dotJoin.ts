// Rules 1.66 item 5209: words joined with " · " (a row's reason and its text, a chip's title and its reason) say each
// thing once: an empty part is dropped, and a part already said (the same words, its full stop aside) is not said again
// ("Jammed: clear it first. · Jammed: clear it first." was a refused row's reason over a text that already was it).
const norm = (s: string) => s.trim().replace(/[.\s]+$/, '').toLowerCase();
export function dotJoin(...parts: (string | null | undefined | false)[]): string {
  const out: string[] = [];
  for (const p of parts) { const t = String(p || '').trim(); if (!t) continue; const n = norm(t); if (out.some((o) => norm(o) === n || norm(o).includes(n))) continue; out.push(t); }
  return out.join(' · ');
}
/** Outside playtest row 14: a second line under a first (the Chosen action box's extra under its text) says only what
 *  the first has not: each " · " part of `extra` already in `said` is dropped ("Needs 2 AP." under "Needs 2 AP."). */
export function unsaid(said: string | null | undefined, extra: string | null | undefined): string {
  const s = norm(String(said || ''));
  return dotJoin(...String(extra || '').split(' · ').filter((p) => { const n = norm(p); return !!n && !s.includes(n); }));
}

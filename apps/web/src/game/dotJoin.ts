// Rules 1.66 item 5209: words joined with " · " (a row's reason and its text, a chip's title and its reason) say each
// thing once: an empty part is dropped, and a part already said (the same words, its full stop aside) is not said again
// ("Jammed: clear it first. · Jammed: clear it first." was a refused row's reason over a text that already was it).
const norm = (s: string) => s.trim().replace(/[.\s]+$/, '').toLowerCase();
export function dotJoin(...parts: (string | null | undefined | false)[]): string {
  const out: string[] = [];
  for (const p of parts) { const t = String(p || '').trim(); if (!t) continue; const n = norm(t); if (out.some((o) => norm(o) === n || norm(o).includes(n))) continue; out.push(t); }
  return out.join(' · ');
}

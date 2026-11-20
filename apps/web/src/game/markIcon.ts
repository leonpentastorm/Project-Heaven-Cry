// The one fallback for an icon slot with no art yet (0.32 fix pass B12): never an empty box. A perk, a move or an
// option without its Wick icon shows its initials in its attribute's ink ("SS" for Still Standing), drawn as a small
// SVG; when art lands the art is used (iconOr). Every icon slot that can lack art reads iconOr.
const SMALL = new Set(['a', 'an', 'the', 'of', 'to', 'and', 'in', 'on', 'it', 'for', 'at', 'by']);
/** The initials of a name: the first letter of its first two words that are not small words ("Close Guard" -> "CG"). */
export function initialsOf(name: string): string {
  const w = String(name || '').replace(/[^\p{L}\p{N}\s'-]/gu, ' ').split(/[\s-]+/).filter(Boolean);
  const big = w.filter((x) => !SMALL.has(x.toLowerCase()));
  return ((big.length ? big : w).slice(0, 2).map((x) => x.charAt(0).toUpperCase()).join('')) || '?';
}
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** The mark: the name's initials in the ink, in a thin square of the same ink, on the panel ground (an SVG data URI). */
export function markIcon(name: string, ink = '#E7EBF3'): string {
  const t = esc(initialsOf(name)), c = esc(ink), size = t.length > 1 ? 26 : 32;
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="3" y="3" width="58" height="58" rx="10" fill="#10151F" stroke="' + c + '" stroke-width="2.5"/>'
    + '<text x="32" y="33" text-anchor="middle" dominant-baseline="central" font-family="Chakra Petch, sans-serif" font-weight="700" font-size="' + size + '" fill="' + c + '">' + t + '</text></svg>';
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
/** The art when there is some, else the name's mark. */
export const iconOr = (src: string | null | undefined, name: string, ink?: string): string => src || markIcon(name, ink);

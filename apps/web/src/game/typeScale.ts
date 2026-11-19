// The menus' type scale, set in ONE place (Leon, 18 Nov 2026: "All text in our menus is TINY"; ATTACK-PLAN-2026-11-19
// "menu text is tiny"): every menu screen (level up, the skill "?" pages, creation, camp, shop, Forge, the sheet's
// tabs, the fight's panels, the hover card) sizes its text by these two CSS variables, never by a typed pixel size
// below them. body: the text a player reads on a card, a row or a hover card; sub: a secondary line (a label, a unit,
// a count). Nothing a player must read is under `sub`. main.tsx puts them on :root at start.
export const FS = { body: 15, sub: 13 } as const;
/** The :root rule that sets them. */
export const TYPE_SCALE_CSS = ':root{--fs-body:' + FS.body + 'px;--fs-sub:' + FS.sub + 'px}';
/** A style's font size in px, reading the two variables as the browser would ('' or an unknown value: NaN). */
export function fontPx(v: string | null | undefined): number {
  const s = String(v || '').trim();
  if (s === 'var(--fs-body)') return FS.body;
  if (s === 'var(--fs-sub)') return FS.sub;
  return parseFloat(s);
}

// 0.31.0, the status strip (Leon, 16 Nov 2026: "i have to scroll down to see i'm hidden, and why is hidden a red
// dangerous effect anyway. We need a separated ui for buffs and debuffs"). Directly under the HP bar, pinned: two groups
// side by side, HELPING (success green) and HURTING (HP red), and the neutral states (white) after them. Each chip is a
// glyph and a short word; the full card (name, what it does, time left) is its hover. Past six in a group the rest fold
// into "+N" (its hover lists them).
// Which group a condition is in is DATA: conditions.json `side` ("helps" | "hurts" | "state"), checked by
// tools/validate.py; this file reads the row through the engine's CONDITION_ROWS and never decides it.

export type Side = 'helps' | 'hurts' | 'state';
/** Colour = meaning (docs/design/colour-system.md), always with a glyph and a word. */
export const SIDE_INK: Record<Side, string> = { helps: '#6FEA77', hurts: '#F65157', state: '#FFFFFF' };
export const SIDE_GLYPH: Record<Side, string> = { helps: '▲', hurts: '▼', state: '◆' };
export const SIDE_HEAD: Record<Side, string> = { helps: 'HELPING', hurts: 'HURTING', state: '' };
/** The most chips a group shows before the rest fold into "+N". */
export const GROUP_CAP = 6;

/** A condition's side, read from its row (any of its names, through condId). A row with no side (never, once the
 *  validator has passed) is a neutral state, never a guess at harm. */
export function sideOf(id: string, rows: any[], condId: (id: string) => string = (x) => x): Side {
  const k = condId(id), r = rows.find((x) => x && (x.id === id || condId(x.id) === k));
  const s = r && r.side;
  return s === 'helps' || s === 'hurts' || s === 'state' ? s : 'state';
}

export interface StatusIn { key: string; side: Side; word: string; tip: string; n?: number | string | null }
export interface StatusChip { key: string; side: Side; glyph: string; word: string; tip: string; count: string; hasCount: boolean; style: string; aria: string }
export interface StatusGroup { side: Side; head: string; hasHead: boolean; chips: StatusChip[]; more: number; hasMore: boolean; moreText: string; moreTip: string; ink: string; headStyle: string; moreStyle: string }

/** The short word a chip shows: the name when it is short (12 letters or fewer), else its first word, at most 9
 *  letters (the full name is in the hover). */
export const shortWord = (name: string): string => {
  const n = String(name || '').replace(/[◉·].*$/, '').trim();
  if (n.length <= 12) return n.toUpperCase();
  const w = n.split(/\s+/)[0] || '';
  return (w.length > 9 ? w.slice(0, 8) + '…' : w).toUpperCase();
};

const chipStyle = (side: Side, small: boolean) => 'display: inline-flex; align-items: center; gap: 3px; flex: none; max-width: 100%; padding: ' + (small ? '0 4px' : '1px 6px')
  + '; border-radius: 999px; border: 1px solid ' + SIDE_INK[side] + '; color: ' + SIDE_INK[side] + '; background: #0A0D13; font-size: ' + (small ? '10px' : '12px')
  + '; font-weight: 700; letter-spacing: 0.06em; line-height: ' + (small ? '14px' : '18px') + '; white-space: nowrap; cursor: help';

/** The strip's groups: HELPING, HURTING, then the neutral states, each capped at GROUP_CAP with "+N". Empty groups are
 *  dropped (an empty strip takes no room). `small`: the token's size. */
export function statusGroups(list: StatusIn[], o: { small?: boolean; cap?: number } = {}): StatusGroup[] {
  const cap = o.cap ?? GROUP_CAP, small = !!o.small;
  return (['helps', 'hurts', 'state'] as Side[]).map((side) => {
    const all = list.filter((x) => x.side === side), shown = all.slice(0, cap), rest = all.slice(cap);
    return { side, head: SIDE_HEAD[side], hasHead: !small && !!SIDE_HEAD[side], ink: SIDE_INK[side],
      headStyle: 'flex: none; font-size: 10px; font-weight: 700; letter-spacing: 0.14em; color: ' + SIDE_INK[side],
      chips: shown.map((x) => { const c = x.n == null || x.n === '' ? '' : String(x.n);
        return { key: x.key, side, glyph: SIDE_GLYPH[side], word: x.word, tip: x.tip, count: c, hasCount: !!c && !small, style: chipStyle(side, small),
          aria: (side === 'state' ? '' : SIDE_HEAD[side].toLowerCase() + ': ') + x.tip }; }),
      more: rest.length, hasMore: rest.length > 0, moreText: '+' + rest.length, moreTip: rest.map((x) => x.tip).join('\n'),
      moreStyle: chipStyle(side, small) };
  }).filter((g) => g.chips.length > 0);
}

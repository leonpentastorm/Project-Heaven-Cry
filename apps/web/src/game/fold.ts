// 0.31.0, the one fold (Leon, 16 Nov 2026: "all boxes of all kind that display info is collapsable and save their
// collapse state"). Every information box of the fight panel (and the level-up screen's fork card) folds to its one-line
// header and opens from it: a button with a chevron, reachable by keyboard (Enter or Space), aria-expanded. The state is
// kept per box id in this browser (game/tabPrefs.ts isFolded / setFolded). Never foldable: the action list, Confirm,
// End turn, the tab row.
import { isFolded, setFolded, clearFold } from './tabPrefs';

export interface FoldV { id: string; open: boolean; folded: boolean; expanded: 'true' | 'false'; chev: string; toggle: () => void; headStyle: string; chevStyle: string }

/** A box's fold. byRule: the box starts folded by a rule (a hand-set state wins); redraw: the screen draws again. */
export function foldVals(id: string, o: { byRule?: boolean; redraw?: () => void } = {}): FoldV {
  const folded = isFolded(id, !!o.byRule);
  return { id, open: !folded, folded, expanded: folded ? 'false' : 'true', chev: folded ? '▸' : '▾',
    toggle: () => { setFolded(id, !folded); if (o.redraw) o.redraw(); },
    headStyle: 'display: flex; align-items: center; gap: 6px; width: 100%; min-height: 22px; padding: 0; border: 0; background: transparent; color: inherit; font-family: inherit; text-align: left; cursor: pointer',
    chevStyle: 'flex: none; width: 12px; font-size: 11px; color: #A3AEC2' };
}

// ---------- the meters' zero rule (U2) ----------
// A meter at 0 for a door with nothing spent or gained this fight starts folded into the "+N" chip at the end of the
// meter row; a click opens it (and a click on an open zero meter folds it back). It opens by itself the first time it
// gains a point: the hand-set state is forgotten then, so the rule (now: open) decides again. A zero meter that carries
// a warning chip (its call to act) is never folded.
export interface MeterIn { key: string; now?: number | null; warn?: string }
/** The meters seen above zero in this fight (by the screen, per fight; never stored). */
export class MeterMemory {
  private fight = ''; private seen = new Set<string>();
  /** Note this render's meters for a fight; returns the keys that gained their first point just now. */
  note(fight: string, rows: MeterIn[]): string[] {
    if (fight !== this.fight) { this.fight = fight; this.seen = new Set(); }
    const fresh: string[] = [];
    for (const r of rows) if ((r.now || 0) > 0 && !this.seen.has(r.key)) { this.seen.add(r.key); fresh.push(r.key); }
    return fresh;
  }
  has(key: string): boolean { return this.seen.has(key); }
}
/** The fold id of a meter. */
export const meterFoldId = (key: string) => 'meter:' + key;
/** Split meters into the open row and the folded ones (the "+N" chip). A meter only folds while it is at 0. */
export function meterFolds<T extends MeterIn>(rows: T[], mem: MeterMemory, fight: string): { open: T[]; folded: T[] } {
  for (const k of mem.note(fight, rows)) clearFold(meterFoldId(k)); // its first point: it opens by itself
  const open: T[] = [], folded: T[] = [];
  for (const r of rows) {
    // a zero meter with a call to act (RELOAD CORE, EMPTY, OUT) never folds: an empty Evoker is the most urgent meter
    const zero = r.now != null && r.now <= 0 && !r.warn;
    if (zero && isFolded(meterFoldId(r.key), !mem.has(r.key))) folded.push(r); else open.push(r);
  }
  return { open, folded };
}
/** A click on a meter: an open zero meter folds back; the "+N" chip opens every folded one. */
export const foldMeter = (key: string, folded: boolean) => setFolded(meterFoldId(key), folded);

// ---------- the action list's room (U5) ----------
/** The action list always shows at least this many rows: the blocks above it scroll or fold first. */
export const LIST_MIN_ROWS = 4;
/** One row of the list (a 34 px button and its 6 px gap) and the room a head line takes (a weapon's name with its
 *  icon, or a group's name, about 36 px), so four rows still show under the head. */
export const LIST_ROW_PX = 40, LIST_HEAD_PX = 40;
/** The list's least height in px (the CSS min-height of the tab panel beside the map). */
export const listMinPx = (rows = LIST_MIN_ROWS, rowPx = LIST_ROW_PX, headPx = LIST_HEAD_PX): number => rows * rowPx + headPx;
/** Short windows (820 px tall or less): a row is 32 px and its 6 px gap, a head line 36 px. */
export const LIST_ROW_SHORT_PX = 38, LIST_HEAD_SHORT_PX = 36;
export const listMinShortPx = (rows = LIST_MIN_ROWS): number => listMinPx(rows, LIST_ROW_SHORT_PX, LIST_HEAD_SHORT_PX);

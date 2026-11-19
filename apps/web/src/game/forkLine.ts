// The forks a character holds at a door, as one line (rules 1.60): kept apart from game/forkView.ts so the meter cards
// (game/resources.ts) read it without the store. The engine's doorForkView is the one source.
import { doorForkView, allPendingDoorPicks } from '@engine';

/** The forks a character holds at a door, as one line of chips' words for a tab header or a meter card: "Forks:
 *  Provoke · Stand Fast", with "1 fork still to do" when a pick is open; '' when it holds none and none is open. */
export function forkChipsLine(c: any, door: string): string {
  const v = c ? doorForkView(c, door) : null; if (!v) return '';
  const held = v.picked.map((p) => p.name), open = v.pending;
  if (!held.length && !open) return '';
  return (held.length ? 'Forks: ' + held.join(' · ') : '') + (open ? (held.length ? ' · ' : '') + open + ' fork' + (open > 1 ? 's' : '') + ' still to do (out of a fight)' : '');
}


/** A door's own choices still open that are no fork step (Figment forms known: the door figment_forms, opened by
 *  Visualization), as one line for the door's fight tab: "Figment form: 2 to choose (out of a fight, on Level up)"; ''
 *  when none is open. The engine's allPendingDoorPicks is the one source; the pick itself is refused in a fight. */
export function doorChoiceLine(c: any, skill: string): string {
  if (!c || !skill) return '';
  const open = allPendingDoorPicks(c).filter((p) => p.skill === skill && !String(p.grant).startsWith('fork:'));
  return open.length ? open.map((p) => p.name + ': ' + p.left + ' to choose').join(' · ') + ' (out of a fight, on Level up)' : '';
}
/** The same choices as the words for an empty pick list on that tab (Picture with no form learned): what is missing and
 *  where it is chosen; '' when none is open. */
export function doorChoiceEmpty(c: any, skill: string): string {
  if (!c || !skill) return '';
  const open = allPendingDoorPicks(c).filter((p) => p.skill === skill && !String(p.grant).startsWith('fork:'));
  return open.length ? 'Nothing learned yet: ' + open.map((p) => p.left + ' ' + p.name + (p.left > 1 ? 's' : '')).join(', ') + ' to choose, out of a fight, on Level up.' : '';
}
